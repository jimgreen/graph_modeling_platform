from __future__ import annotations

import asyncio
import json
import time
from collections import deque
from typing import Any, Literal
from urllib.parse import quote

import uvicorn
from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, PlainTextResponse, Response
from pydantic import BaseModel, Field
from starlette.datastructures import UploadFile

try:
    from websockets.asyncio.client import connect as websocket_connect
except ImportError:  # pragma: no cover - compatibility with older websockets releases
    from websockets import connect as websocket_connect

from .config import Settings
from .log_store import LogStore, summarize
from .webgrp_client import WebgrpClient, WebgrpProxyError, ProxyResult


settings = Settings.from_env()
logs = LogStore()
webgrp = WebgrpClient(settings, logs)
receive_records: deque[dict[str, Any]] = deque(maxlen=5)

app = FastAPI(title="webgrp integration demo", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:4173", "http://localhost:4173", "http://127.0.0.1:5173", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class SendFile(BaseModel):
    kind: Literal["json", "svg", "e", "cim"]
    encoding: Literal["utf-8", "gbk"] = "utf-8"


class SendRequest(BaseModel):
    url: str | None = None
    modelId: int | None = Field(default=None, gt=0)
    schemeId: int | None = Field(default=None, gt=0)
    schemePath: list[str] | None = None
    name: str | None = None
    files: list[SendFile] = Field(min_length=1)
    templateName: str | None = None


def json_response(result: ProxyResult) -> JSONResponse | PlainTextResponse:
    if isinstance(result.payload, (dict, list)):
        return JSONResponse(result.payload, status_code=result.status_code)
    return PlainTextResponse(str(result.payload), status_code=result.status_code, media_type=result.content_type)


def error_response(message: str, status_code: int = 502) -> JSONResponse:
    return JSONResponse({"ok": False, "error": {"code": "demo-proxy-error", "message": message}}, status_code=status_code)


def selector_params(payload: SendRequest) -> dict[str, Any]:
    params: dict[str, Any] = {}
    if payload.modelId is not None:
        params["modelId"] = payload.modelId
    elif payload.schemePath and payload.name:
        params["schemePath"] = json.dumps(payload.schemePath, ensure_ascii=False)
        params["name"] = payload.name
    elif payload.schemeId is not None and payload.name:
        params["schemeId"] = payload.schemeId
        params["name"] = payload.name
    else:
        raise ValueError("请提供 modelId，或 schemePath + name，或 schemeId + name。")
    return params


@app.get("/api/health")
async def health() -> dict[str, Any]:
    return {
        "ok": True,
        "service": "webgrp-integration-demo",
        "webgrp": {"http": settings.http_api_base, "ws": settings.ws_subscription_url, "space": settings.webgrp_space},
    }


@app.get("/api/config")
async def config() -> dict[str, Any]:
    return {
        "ok": True,
        "demo": {"httpBaseUrl": f"http://{settings.demo_host}:{settings.demo_port}", "receiverUrl": settings.demo_receiver_url},
        "webgrp": {
            "frontendUrl": settings.webgrp_frontend_url,
            "httpBaseUrl": settings.webgrp_http_base_url,
            "apiBaseUrl": settings.http_api_base,
            "subscriptionUrl": settings.ws_subscription_url,
            "space": settings.webgrp_space,
        },
        "capabilities": ["embed", "http", "model-send", "model-receive", "websocket-subscription"],
    }


@app.get("/api/logs")
async def list_logs() -> dict[str, Any]:
    return {"ok": True, "data": {"items": logs.list(), "count": len(logs.list())}}


@app.delete("/api/logs")
async def clear_logs() -> dict[str, Any]:
    return {"ok": True, "data": {"cleared": logs.clear()}}


@app.get("/api/webgrp/schemes")
async def schemes(request: Request) -> Response:
    allowed = {"view", "includeProjects", "schemePath", "schemeId"}
    params = {key: value for key, value in request.query_params.items() if key in allowed}
    try:
        return json_response(await webgrp.request("GET", "/v1/schemes", params=params or {"view": "summary"}))
    except WebgrpProxyError as error:
        return error_response(str(error))


@app.get("/api/webgrp/library")
async def library(request: Request) -> Response:
    part = request.query_params.get("part", "all")
    try:
        return json_response(await webgrp.request("GET", "/v1/library", params={"part": part}))
    except WebgrpProxyError as error:
        return error_response(str(error))


@app.get("/api/webgrp/runtime/clients")
async def runtime_clients() -> Response:
    try:
        return json_response(await webgrp.request("GET", "/v1/runtime/clients"))
    except WebgrpProxyError as error:
        return error_response(str(error))


@app.get("/api/webgrp/models/export")
async def model_export(request: Request) -> Response:
    allowed = {
        "scope",
        "modelId",
        "schemeId",
        "schemePath",
        "name",
        "formats",
        "encoding",
        "mergeE",
        "includeAssociatedModels",
        "includeDescendants",
        "colorMode",
        "strict",
        "template",
    }
    params = {key: value for key, value in request.query_params.items() if key in allowed}
    try:
        return json_response(await webgrp.request("GET", "/v1/models/export", params=params))
    except WebgrpProxyError as error:
        return error_response(str(error))


@app.post("/api/webgrp/send")
async def send_model(payload: SendRequest) -> Response:
    try:
        params = selector_params(payload)
    except ValueError as error:
        return error_response(str(error), 400)
    body = {
        "url": payload.url or settings.demo_receiver_url,
        "files": [item.model_dump() for item in payload.files],
        "templateName": payload.templateName or "",
    }
    try:
        return json_response(await webgrp.request("POST", "/v1/schemes/model/send", params=params, body=body))
    except WebgrpProxyError as error:
        return error_response(str(error))


@app.post("/api/receive")
async def receive(request: Request) -> dict[str, Any]:
    started = time.perf_counter()
    raw_content_type = request.headers.get("content-type", "")
    try:
        form = await request.form()
    except Exception:
        form = None

    fields: list[dict[str, Any]] = []
    if form is not None:
        for key, value in form.multi_items():
            if isinstance(value, UploadFile):
                content = await value.read()
                fields.append({
                    "name": key,
                    "kind": "file",
                    "filename": value.filename,
                    "contentType": value.content_type,
                    "bytes": len(content),
                    "previewBase64": __import__("base64").b64encode(content[:24]).decode("ascii"),
                })
            else:
                fields.append({"name": key, "kind": "text", "value": str(value)[:MAX_RECEIVER_TEXT]})
    else:
        raw = await request.body()
        fields.append({"name": "raw", "kind": "bytes", "bytes": len(raw)})

    record = {
        "receivedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "method": request.method,
        "contentType": raw_content_type,
        "totalBytes": int(request.headers.get("content-length", "0") or 0),
        "elapsedMs": round((time.perf_counter() - started) * 1000, 1),
        "fields": fields,
    }
    receive_records.append(record)
    logs.record(channel="http", direction="inbound", label="POST /api/receive", status=200, payload=record)
    return {"ok": True, "data": {"received": record, "kept": len(receive_records)}}


MAX_RECEIVER_TEXT = 2_000


@app.get("/api/receive")
async def latest_receive() -> dict[str, Any]:
    return {"ok": True, "data": {"latest": receive_records[-1] if receive_records else None, "count": len(receive_records)}}


@app.delete("/api/receive")
async def clear_receive() -> dict[str, Any]:
    cleared = len(receive_records)
    receive_records.clear()
    return {"ok": True, "data": {"cleared": cleared}}


async def send_bridge_json(websocket: WebSocket, message: dict[str, Any]) -> None:
    await websocket.send_json(message)
    logs.record(channel="websocket", direction="outbound", label="bridge → browser", payload=message)


@app.websocket("/api/ws")
async def websocket_bridge(websocket: WebSocket) -> None:
    await websocket.accept()
    space = (websocket.query_params.get("space") or settings.webgrp_space).strip() or settings.webgrp_space
    upstream_url = f"{settings.ws_subscription_url}?space={quote(space, safe='')}"
    await send_bridge_json(websocket, {"type": "bridge.ready", "space": space, "upstreamUrl": upstream_url})

    async def browser_to_upstream(upstream: Any) -> None:
        while True:
            raw = await websocket.receive_text()
            try:
                message = json.loads(raw)
            except json.JSONDecodeError:
                message = {"type": "raw", "value": raw}
            logs.record(channel="websocket", direction="inbound", label="browser → bridge", payload=message)
            await upstream.send(json.dumps(message, ensure_ascii=False))

    async def upstream_to_browser(upstream: Any) -> None:
        async for raw in upstream:
            try:
                message = json.loads(raw)
            except (TypeError, json.JSONDecodeError):
                message = {"type": "raw", "value": str(raw)}
            await send_bridge_json(websocket, message)

    try:
        async with websocket_connect(upstream_url, open_timeout=10, max_size=16 * 1024 * 1024) as upstream:
            await send_bridge_json(websocket, {"type": "upstream.connected", "space": space, "url": upstream_url})
            tasks = [
                asyncio.create_task(browser_to_upstream(upstream)),
                asyncio.create_task(upstream_to_browser(upstream)),
            ]
            done, pending = await asyncio.wait(tasks, return_when=asyncio.FIRST_COMPLETED)
            for task in pending:
                task.cancel()
            await asyncio.gather(*pending, return_exceptions=True)
            for task in done:
                error = task.exception()
                if error and not isinstance(error, WebSocketDisconnect):
                    raise error
    except WebSocketDisconnect:
        logs.record(channel="websocket", direction="system", label="browser disconnected", payload={"space": space})
    except Exception as error:
        logs.record(channel="websocket", direction="system", label="bridge error", payload={"space": space, "error": str(error)})
        try:
            await send_bridge_json(websocket, {"type": "bridge.error", "space": space, "error": {"code": "bridge-error", "message": str(error)}})
        except Exception:
            pass
    finally:
        try:
            await websocket.close()
        except Exception:
            pass


if __name__ == "__main__":
    uvicorn.run("app.main:app", host=settings.demo_host, port=settings.demo_port, reload=False)
