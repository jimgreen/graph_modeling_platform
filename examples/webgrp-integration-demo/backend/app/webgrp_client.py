from __future__ import annotations

import json
import time
from dataclasses import dataclass
from typing import Any

import httpx

from .config import Settings
from .log_store import LogStore, summarize


class WebgrpProxyError(RuntimeError):
    """Raised when the demo backend cannot reach webgrp."""


@dataclass(frozen=True)
class ProxyResult:
    status_code: int
    payload: Any
    content_type: str


class WebgrpClient:
    def __init__(self, settings: Settings, logs: LogStore) -> None:
        self.settings = settings
        self.logs = logs

    def url_for(self, path: str) -> str:
        return f"{self.settings.http_api_base}/{path.lstrip('/')}"

    def subscription_url(self, space: str | None = None) -> str:
        selected_space = (space or self.settings.webgrp_space).strip() or self.settings.webgrp_space
        separator = "&" if "?" in self.settings.ws_subscription_url else "?"
        from urllib.parse import quote

        return f"{self.settings.ws_subscription_url}{separator}space={quote(selected_space, safe='')}"

    async def request(self, method: str, path: str, *, params: dict[str, Any] | None = None, body: Any = None) -> ProxyResult:
        query = dict(params or {})
        url = self.url_for(path)
        started = time.perf_counter()
        try:
            async with httpx.AsyncClient(timeout=httpx.Timeout(25.0, connect=5.0), trust_env=False) as client:
                response = await client.request(
                    method,
                    url,
                    params=query,
                    json=body,
                    headers={"X-Space": self.settings.webgrp_space},
                )
        except httpx.HTTPError as error:
            self.logs.record(
                channel="http",
                direction="outbound",
                label=f"{method.upper()} {path}",
                payload={"url": url, "params": query, "body": body, "error": str(error)},
            )
            raise WebgrpProxyError(f"无法连接 webgrp：{error}") from error

        elapsed_ms = round((time.perf_counter() - started) * 1000, 1)
        try:
            payload = response.json()
        except (ValueError, json.JSONDecodeError):
            payload = response.text

        self.logs.record(
            channel="http",
            direction="outbound",
            label=f"{method.upper()} {path}",
            status=response.status_code,
            payload={
                "request": {"url": str(response.request.url), "body": summarize(body)},
                "response": summarize(payload),
                "elapsedMs": elapsed_ms,
            },
        )
        return ProxyResult(response.status_code, payload, response.headers.get("content-type", "application/json"))
