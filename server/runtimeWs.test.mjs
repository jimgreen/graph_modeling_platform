import { createServer } from "node:http";
import { describe, expect, test, afterEach, beforeEach } from "vitest";
import { WebSocket } from "ws";
import { createRuntimeRegistry } from "./runtimeRegistry.mjs";
import { attachRuntimeWebSocket } from "./runtimeWs.mjs";

// WS 集成测试：起真实 http server + WS 升级，用真实 ws 客户端连接。
let httpServer;
let runtime;
let baseUrl;
let wsUrl;

async function startRuntimeServer() {
  httpServer = createServer((req, res) => {
    res.writeHead(404);
    res.end();
  });
  const registry = createRuntimeRegistry();
  runtime = attachRuntimeWebSocket(httpServer, registry);
  await new Promise((resolve) => {
    httpServer.listen(0, "127.0.0.1", resolve);
  });
  const port = httpServer.address().port;
  baseUrl = `http://127.0.0.1:${port}`;
  wsUrl = `ws://127.0.0.1:${port}/ws`;
}

function connectClient(clientId) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    const received = [];
    ws.on("open", () => {
      ws.send(JSON.stringify({ type: "register", clientId }));
    });
    ws.on("message", (raw) => {
      const msg = JSON.parse(String(raw));
      received.push(msg);
      if (msg.type === "registered") {
        resolve({ ws, received, clientId });
      }
    });
    ws.on("error", reject);
  });
}

beforeEach(async () => {
  await startRuntimeServer();
});

afterEach(async () => {
  if (runtime?.wss) {
    // 先关所有 WS 连接，释放 server.close 阻塞
    for (const client of runtime.wss.clients) {
      client.terminate();
    }
    runtime.wss.close();
  }
  if (httpServer) {
    await new Promise((resolve) => httpServer.close(resolve));
  }
});

describe("runtimeWs 连接与注册", () => {
  test("客户端连接并发 register，收到 registered", async () => {
    const { received } = await connectClient("c1");
    expect(received.some((m) => m.type === "registered" && m.clientId === "c1")).toBe(true);
    expect(runtime.listClients()).toHaveLength(1);
  });

  test("未带 clientId 的 register 被关闭", async () => {
    const ws = new WebSocket(wsUrl);
    await new Promise((resolve) => ws.on("open", resolve));
    ws.send(JSON.stringify({ type: "register", clientId: "" }));
    const code = await new Promise((resolve) => ws.on("close", (c) => resolve(c)));
    expect(code).toBe(4001);
  });

  test("客户端断开后从注册表移除", async () => {
    const { ws } = await connectClient("c1");
    expect(runtime.listClients()).toHaveLength(1);
    ws.close();
    await new Promise((resolve) => ws.on("close", resolve));
    // 等待 server 端 close 事件处理
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(runtime.listClients()).toHaveLength(0);
  });
});

describe("runtimeWs 心跳", () => {
  test("ping 收到 pong", async () => {
    const { ws, received } = await connectClient("c1");
    ws.send(JSON.stringify({ type: "ping" }));
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(received.some((m) => m.type === "pong")).toBe(true);
    ws.close();
  });
});

describe("runtimeWs fetch 拉取", () => {
  test("server 向客户端 fetch，客户端响应 data 透传", async () => {
    const { ws } = await connectClient("c1");
    // 客户端监听 fetch 并响应
    ws.on("message", (raw) => {
      const msg = JSON.parse(String(raw));
      if (msg.type === "fetch") {
        ws.send(JSON.stringify({ type: "fetch-response", requestId: msg.requestId, ok: true, data: { model: "m1" } }));
      }
    });
    const data = await runtime.fetchFromClient("c1", "runtime.snapshot");
    expect(data).toEqual({ model: "m1" });
    ws.close();
  });

  test("客户端响应 error 透传", async () => {
    const { ws } = await connectClient("c1");
    ws.on("message", (raw) => {
      const msg = JSON.parse(String(raw));
      if (msg.type === "fetch") {
        ws.send(JSON.stringify({ type: "fetch-response", requestId: msg.requestId, ok: false, error: { code: "no-selection", message: "未选中" } }));
      }
    });
    await expect(runtime.fetchFromClient("c1", "runtime.selection")).rejects.toMatchObject({ code: "no-selection" });
    ws.close();
  });

  test("无在线客户端抛 NoOnlineClientError", async () => {
    await expect(runtime.fetchFromClient("nope", "runtime.snapshot")).rejects.toMatchObject({ code: "no-online-client" });
  });

  test("默认客户端选择（不指定 clientId）", async () => {
    const { ws } = await connectClient("c1");
    ws.on("message", (raw) => {
      const msg = JSON.parse(String(raw));
      if (msg.type === "fetch") {
        ws.send(JSON.stringify({ type: "fetch-response", requestId: msg.requestId, ok: true, data: { ok: true } }));
      }
    });
    const data = await runtime.fetchFromClient(undefined, "runtime.snapshot");
    expect(data).toEqual({ ok: true });
    ws.close();
  });

  test("超时无响应 reject", async () => {
    const { ws } = await connectClient("c1");
    // 客户端不响应 fetch
    await expect(runtime.fetchFromClient("c1", "runtime.snapshot")).rejects.toMatchObject({ code: "ws-timeout" });
    ws.close();
  }, 10000);
});

describe("runtimeWs command 指令通道", () => {
  test("server 下发 command，客户端响应 data 透传", async () => {
    const { ws } = await connectClient("c1");
    ws.on("message", (raw) => {
      const msg = JSON.parse(String(raw));
      if (msg.type === "command") {
        expect(msg.name).toBe("control.device.add");
        expect(msg.params).toEqual({ kind: "busbar" });
        ws.send(JSON.stringify({ type: "command-response", requestId: msg.requestId, ok: true, data: { id: "n1" } }));
      }
    });
    const data = await runtime.sendCommandToClient("c1", "control.device.add", { kind: "busbar" });
    expect(data).toEqual({ id: "n1" });
    ws.close();
  });

  test("客户端响应失败透传带 code", async () => {
    const { ws } = await connectClient("c1");
    ws.on("message", (raw) => {
      const msg = JSON.parse(String(raw));
      if (msg.type === "command") {
        ws.send(JSON.stringify({ type: "command-response", requestId: msg.requestId, ok: false, error: { code: "bad-request", message: "kind 必填" } }));
      }
    });
    await expect(runtime.sendCommandToClient("c1", "control.device.add", {})).rejects.toMatchObject({ code: "bad-request", message: "kind 必填" });
    ws.close();
  });

  test("无在线客户端抛 NoOnlineClientError", async () => {
    await expect(runtime.sendCommandToClient("nope", "control.device.add", {})).rejects.toMatchObject({ code: "no-online-client" });
  });

  test("默认客户端选择（不指定 clientId）", async () => {
    const { ws } = await connectClient("c1");
    ws.on("message", (raw) => {
      const msg = JSON.parse(String(raw));
      if (msg.type === "command") {
        ws.send(JSON.stringify({ type: "command-response", requestId: msg.requestId, ok: true, data: { ok: true } }));
      }
    });
    const data = await runtime.sendCommandToClient(undefined, "control.device.add", {});
    expect(data).toEqual({ ok: true });
    ws.close();
  });

  test("超时无响应 reject", async () => {
    const { ws } = await connectClient("c1");
    // 客户端不响应 command
    await expect(runtime.sendCommandToClient("c1", "control.device.add", {})).rejects.toMatchObject({ code: "ws-timeout" });
    ws.close();
  }, 10000);
});

describe("runtimeWs 非 /ws 升级", () => {
  test("/other WS 升级被拒绝", async () => {
    const ws = new WebSocket(`ws://127.0.0.1:${httpServer.address().port}/other`);
    await expect(new Promise((_, reject) => {
      ws.on("error", reject);
    })).rejects.toBeTruthy();
  });
});
