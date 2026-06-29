import { describe, expect, test, beforeEach, afterEach } from "vitest";
import { WebSocket } from "ws";
import { createImageServer } from "./image-server.mjs";

// /api/v1/control/* 集成测试：起真实 image-server（含 WS 双向指令通道 + control 路由），
// 用真实 WS 客户端连入响应 command，打 HTTP POST 验证端到端。

let server;
let baseUrl;
let wsUrl;

async function startServer() {
  server = await createImageServer({ port: 0, host: "127.0.0.1" });
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}`;
  wsUrl = `ws://127.0.0.1:${port}/ws`;
}

beforeEach(async () => {
  await startServer();
});

afterEach(async () => {
  await new Promise((resolve) => server.close(resolve));
});

// 连接一个会响应 command 的客户端。responder(name,params)=>{ok,data}|{ok:false,error}
function connectCommandResponder(clientId, responder) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    ws.on("open", () => {
      ws.send(JSON.stringify({ type: "register", clientId }));
    });
    ws.on("message", (raw) => {
      const msg = JSON.parse(String(raw));
      if (msg.type === "registered") {
        resolve(ws);
        return;
      }
      if (msg.type === "command") {
        Promise.resolve()
          .then(() => responder(msg.name, msg.params ?? {}))
          .then((envelope) => {
            ws.send(JSON.stringify({
              type: "command-response",
              requestId: msg.requestId,
              ok: envelope.ok,
              data: envelope.ok ? envelope.data : undefined,
              error: envelope.ok ? undefined : envelope.error
            }));
          })
          .catch(() => {
            ws.send(JSON.stringify({
              type: "command-response",
              requestId: msg.requestId,
              ok: false,
              error: { code: "control-failed", message: "测试 responder 异常。" }
            }));
          });
      }
    });
    ws.on("error", reject);
  });
}

async function postV1(pathname, body) {
  const res = await fetch(`${baseUrl}${pathname}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    // 非 JSON
  }
  return { status: res.status, json };
}

describe("/api/v1/control/device/add", () => {
  test("成功新增 → 200 {ok:true,data:{id}}", async () => {
    const ws = await connectCommandResponder("c1", (name, params) => {
      expect(name).toBe("control.device.add");
      expect(params).toMatchObject({ kind: "busbar", x: 100, y: 200 });
      return { ok: true, data: { id: "n1" } };
    });
    const { status, json } = await postV1("/api/v1/control/device/add", { kind: "busbar", x: 100, y: 200 });
    expect(status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.data).toEqual({ id: "n1" });
    ws.close();
  });

  test("attrs 透传到指令参数", async () => {
    const ws = await connectCommandResponder("c1", (_name, params) => {
      expect(params.attrs).toEqual({ name: "自定义", rotation: 45 });
      return { ok: true, data: { id: "n2" } };
    });
    const { status, json } = await postV1("/api/v1/control/device/add", {
      kind: "busbar",
      attrs: { name: "自定义", rotation: 45 }
    });
    expect(status).toBe(200);
    expect(json.data.id).toBe("n2");
    ws.close();
  });

  test("缺 kind → 400 bad-request（不下发指令）", async () => {
    const { status, json } = await postV1("/api/v1/control/device/add", { x: 100 });
    expect(status).toBe(400);
    expect(json.ok).toBe(false);
    expect(json.error.code).toBe("bad-request");
  });

  test("非法 JSON body → 400 bad-request", async () => {
    const res = await fetch(`${baseUrl}/api/v1/control/device/add`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{not json"
    });
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.error.code).toBe("bad-request");
  });

  test("无在线客户端 → 503 no-online-client", async () => {
    const { status, json } = await postV1("/api/v1/control/device/add", { kind: "busbar" });
    expect(status).toBe(503);
    expect(json.error.code).toBe("no-online-client");
  });

  test("前端返失败 → 透传 error code", async () => {
    const ws = await connectCommandResponder("c1", () => ({
      ok: false,
      error: { code: "bad-request", message: "未知图元类型：foo" }
    }));
    const { status, json } = await postV1("/api/v1/control/device/add", { kind: "foo" });
    expect(status).toBe(400);
    expect(json.ok).toBe(false);
    expect(json.error.code).toBe("bad-request");
    expect(json.error.message).toBe("未知图元类型：foo");
    ws.close();
  });

  test("前端不响应 → 503 ws-timeout", async () => {
    // 连接但不响应 command
    const ws = await connectCommandResponder("c1", () => new Promise(() => {}));
    const { status, json } = await postV1("/api/v1/control/device/add", { kind: "busbar" });
    expect(status).toBe(503);
    expect(json.error.code).toBe("ws-timeout");
    ws.close();
  }, 10000);
});
