import { describe, expect, test, beforeEach, afterEach } from "vitest";
import { WebSocket } from "ws";
import { createImageServer } from "./image-server.mjs";

// /api/v1/runtime/* 集成测试：起真实 image-server（含 WS 桥接 + runtime 路由），
// 用真实 WS 客户端连入响应 fetch，打 HTTP 请求验证端到端。

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
  // 关 WS 连接避免阻塞 server.close（wss 在 attachRuntimeWebSocket 内部，无外部引用，
  // server.close 后 wss 通过 server "close" 事件清理）
  await new Promise((resolve) => server.close(resolve));
});

// 连接一个会响应 fetch 的客户端。responder(resource,params)=>envelope
function connectResponder(clientId, responder) {
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
      if (msg.type === "fetch") {
        Promise.resolve()
          .then(() => responder(msg.resource, msg.params ?? {}))
          .then((envelope) => {
            ws.send(JSON.stringify({
              type: "fetch-response",
              requestId: msg.requestId,
              ok: envelope.ok,
              data: envelope.ok ? envelope.data : undefined,
              error: envelope.ok ? undefined : envelope.error
            }));
          })
          .catch(() => {
            ws.send(JSON.stringify({
              type: "fetch-response",
              requestId: msg.requestId,
              ok: false,
              error: { code: "fetch-failed", message: "测试 responder 异常。" }
            }));
          });
      }
    });
    ws.on("error", reject);
  });
}

async function fetchV1(pathname) {
  const res = await fetch(`${baseUrl}${pathname}`);
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    // 非 JSON（PNG/SVG/text）
  }
  return { status: res.status, headers: res.headers, text, json };
}

describe("/api/v1/runtime/clients", () => {
  test("无客户端时空列表", async () => {
    const { status, json } = await fetchV1("/api/v1/runtime/clients");
    expect(status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.data.clients).toEqual([]);
  });

  test("有在线客户端时返回列表", async () => {
    const ws = await connectResponder("c1", () => ({ ok: true, data: {} }));
    const { status, json } = await fetchV1("/api/v1/runtime/clients");
    expect(status).toBe(200);
    expect(json.data.clients).toHaveLength(1);
    expect(json.data.clients[0].clientId).toBe("c1");
    expect(json.data.clients[0].role).toBe("editor");
    ws.close();
  });
});

describe("/api/v1/runtime/model", () => {
  test("无在线客户端 → 503 no-online-client", async () => {
    const { status, json } = await fetchV1("/api/v1/runtime/model");
    expect(status).toBe(503);
    expect(json.ok).toBe(false);
    expect(json.error.code).toBe("no-online-client");
  });

  test("前端透传数据 → 200 no-store 信封", async () => {
    const ws = await connectResponder("c1", () => ({
      ok: true,
      data: { modelName: "M1", modelId: "k1", schemePath: "方案A", updatedAt: "t" }
    }));
    const { status, headers, json } = await fetchV1("/api/v1/runtime/model");
    expect(status).toBe(200);
    expect(headers.get("cache-control")).toBe("no-store");
    expect(json.ok).toBe(true);
    expect(json.data.modelName).toBe("M1");
    ws.close();
  });

  test("前端 ok=false no-active-model → 404 透传", async () => {
    const ws = await connectResponder("c1", () => ({
      ok: false, error: { code: "no-active-model", message: "无活动模型" }
    }));
    const { status, json } = await fetchV1("/api/v1/runtime/model");
    expect(status).toBe(404);
    expect(json.error.code).toBe("no-active-model");
    ws.close();
  });

  test("指定 clientId 路由到该客户端", async () => {
    const ws = await connectResponder("c-target", (resource) => ({
      ok: true, data: { routedTo: resource }
    }));
    const { status, json } = await fetchV1("/api/v1/runtime/devices?clientId=c-target");
    expect(status).toBe(200);
    expect(json.data.routedTo).toBe("runtime.devices");
    ws.close();
  });
});

describe("/api/v1/runtime/tabs/{tab}", () => {
  test("路径段 tab=model → runtime.tab params.tab=model", async () => {
    const ws = await connectResponder("c1", (resource, params) => ({
      ok: true, data: { resource, tab: params.tab }
    }));
    const { status, json } = await fetchV1("/api/v1/runtime/tabs/tree");
    expect(status).toBe(200);
    expect(json.data.resource).toBe("runtime.tab");
    expect(json.data.tab).toBe("tree");
    ws.close();
  });

  test("非法路径段不匹配（pattern 限定 model|tree|graph）", async () => {
    // /api/v1/runtime/tabs/xyz 不匹配 tab 路由，也不匹配 tabs 路由 → 404
    const { status } = await fetchV1("/api/v1/runtime/tabs/xyz");
    expect(status).toBe(404);
  });

  test("聚合 /api/v1/runtime/tabs → runtime.snapshot", async () => {
    const ws = await connectResponder("c1", (resource) => ({
      ok: true, data: { resource }
    }));
    const { status, json } = await fetchV1("/api/v1/runtime/tabs");
    expect(status).toBe(200);
    expect(json.data.resource).toBe("runtime.snapshot");
    ws.close();
  });
});

describe("/api/v1/runtime/selection", () => {
  test("前端 no-selection → 404 透传", async () => {
    const ws = await connectResponder("c1", () => ({
      ok: false, error: { code: "no-selection", message: "未选中" }
    }));
    const { status, json } = await fetchV1("/api/v1/runtime/selection");
    expect(status).toBe(404);
    expect(json.error.code).toBe("no-selection");
    ws.close();
  });
});

describe("/api/v1/runtime/screenshot", () => {
  test("PNG 二进制透传，content-type image/png", async () => {
    const ws = await connectResponder("c1", () => ({
      ok: true, data: { base64: "iVBORw0KGgo=", width: 10, height: 5, mime: "image/png" }
    }));
    const res = await fetch(`${baseUrl}/api/v1/runtime/screenshot`);
    const buf = Buffer.from(await res.arrayBuffer());
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/png");
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(buf.equals(Buffer.from("iVBORw0KGgo=", "base64"))).toBe(true);
    ws.close();
  });

  test("非法 width → 400 bad-request", async () => {
    const { status, json } = await fetchV1("/api/v1/runtime/screenshot?width=abc");
    expect(status).toBe(400);
    expect(json.error.code).toBe("bad-request");
  });

  test("负 width → 400 bad-request", async () => {
    const { status, json } = await fetchV1("/api/v1/runtime/screenshot?width=-5");
    expect(status).toBe(400);
    expect(json.error.code).toBe("bad-request");
  });

  test("前端 ok=false internal → 500 透传", async () => {
    const ws = await connectResponder("c1", () => ({
      ok: false, error: { code: "internal", message: "SVG DOM 不可用" }
    }));
    const { status, json } = await fetchV1("/api/v1/runtime/screenshot");
    expect(status).toBe(500);
    expect(json.error.code).toBe("internal");
    ws.close();
  });
});

describe("/api/v1/runtime/svg", () => {
  test("SVG 文本透传，content-type image/svg+xml", async () => {
    const ws = await connectResponder("c1", () => ({
      ok: true, data: "<svg></svg>"
    }));
    const res = await fetch(`${baseUrl}/api/v1/runtime/svg`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/svg+xml; charset=utf-8");
    expect(await res.text()).toBe("<svg></svg>");
    ws.close();
  });
});

describe("/api/v1/runtime/e-file", () => {
  test("E 文件文本透传，content-type text/plain + attachment", async () => {
    const ws = await connectResponder("c1", () => ({
      ok: true, data: { filename: "模型.e", text: "<Section>", mime: "text/plain" }
    }));
    const res = await fetch(`${baseUrl}/api/v1/runtime/e-file`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("text/plain; charset=utf-8");
    expect(res.headers.get("content-disposition")).toContain("attachment");
    expect(await res.text()).toBe("<Section>");
    ws.close();
  });
});

describe("/api/v1/runtime 超时降级", () => {
  test("前端不响应 → 503 ws-timeout", async () => {
    const ws = await connectResponder("c1", () => new Promise(() => {})); // 永不响应
    const { status, json } = await fetchV1("/api/v1/runtime/model");
    expect(status).toBe(503);
    expect(json.error.code).toBe("ws-timeout");
    ws.close();
  }, 10000);
});
