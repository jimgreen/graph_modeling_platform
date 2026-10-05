import { describe, expect, test, beforeEach, afterEach } from "vitest";
import { WebSocket } from "ws";
import { createImageServer } from "./server.mjs";
import { apiPath } from "./config.mjs";
// 只为直调 handleV1RuntimeClients（listClients 由派发层注入，真实 server 下无法让它抛错）。
import { handleV1RuntimeClients } from "./apiV1Runtime.mjs";

// /webgrp/v1/runtime/* 集成测试：起真实 image-server（含 WS 桥接 + runtime 路由），
// 用真实 WS 客户端连入响应 fetch，打 HTTP 请求验证端到端。

let server;
let baseUrl;
let wsUrl;
// 收集所有已打开的 WS：断言失败时用例会跳过 ws.close()，
// 残留连接会让 server.close() 在 afterEach 里挂到 hook timeout，
// 把「干净的断言 RED」污染成「hook timed out 红」。
const openSockets = new Set();

async function startServer() {
  server = await createImageServer({ port: 0, host: "127.0.0.1" });
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}`;
  wsUrl = `ws://127.0.0.1:${port}/webgrp/ws`;
}

beforeEach(async () => {
  await startServer();
});

afterEach(async () => {
  // 先关掉本用例打开的全部 WS：断言失败时用例体会跳过 ws.close()，
  // 残留连接会让 server.close() 挂到 afterEach 的 hook timeout，
  // 把「干净的断言 RED」污染成「hook timed out 红」。
  for (const ws of openSockets) ws.close();
  openSockets.clear();
  // 关 WS 连接避免阻塞 server.close（wss 在 attachRuntimeWebSocket 内部，无外部引用，
  // server.close 后 wss 通过 server "close" 事件清理）
  await new Promise((resolve) => server.close(resolve));
});

// 连接一个会响应 fetch 的客户端。responder(resource,params)=>envelope
function connectResponder(clientId, responder) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    openSockets.add(ws);
    ws.on("close", () => openSockets.delete(ws));
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

describe(apiPath("/v1/runtime/clients"), () => {
  test("无客户端时空列表", async () => {
    const { status, json } = await fetchV1(apiPath("/v1/runtime/clients"));
    expect(status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.data.clients).toEqual([]);
  });

  test("有在线客户端时返回列表", async () => {
    const ws = await connectResponder("c1", () => ({ ok: true, data: {} }));
    const { status, json } = await fetchV1(apiPath("/v1/runtime/clients"));
    expect(status).toBe(200);
    expect(json.data.clients).toHaveLength(1);
    expect(json.data.clients[0].clientId).toBe("c1");
    expect(json.data.clients[0].role).toBe("editor");
    ws.close();
  });
});

describe(apiPath("/v1/runtime/model"), () => {
  test("无在线客户端 → 503 no-online-client", async () => {
    const { status, json } = await fetchV1(apiPath("/v1/runtime/model"));
    expect(status).toBe(503);
    expect(json.ok).toBe(false);
    expect(json.error.code).toBe("no-online-client");
  });

  test("前端透传数据 → 200 no-store 信封", async () => {
    const ws = await connectResponder("c1", () => ({
      ok: true,
      data: { modelName: "M1", modelId: "k1", schemePath: "方案A", updatedAt: "t" }
    }));
    const { status, headers, json } = await fetchV1(apiPath("/v1/runtime/model"));
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
    const { status, json } = await fetchV1(apiPath("/v1/runtime/model"));
    expect(status).toBe(404);
    expect(json.error.code).toBe("no-active-model");
    ws.close();
  });

  test("指定 clientId 路由到该客户端", async () => {
    const ws = await connectResponder("c-target", (resource) => ({
      ok: true, data: { routedTo: resource }
    }));
    const { status, json } = await fetchV1(apiPath("/v1/runtime/devices") + "?clientId=c-target");
    expect(status).toBe(200);
    expect(json.data.routedTo).toBe("runtime.devices");
    ws.close();
  });
});

describe(apiPath("/v1/runtime/tabs/{tab}"), () => {
  test("路径段 tab=model → runtime.tab params.tab=model", async () => {
    const ws = await connectResponder("c1", (resource, params) => ({
      ok: true, data: { resource, tab: params.tab }
    }));
    const { status, json } = await fetchV1(apiPath("/v1/runtime/tabs/tree"));
    expect(status).toBe(200);
    expect(json.data.resource).toBe("runtime.tab");
    expect(json.data.tab).toBe("tree");
    ws.close();
  });

  test("非法路径段不匹配（pattern 限定 model|tree|graph）", async () => {
    // /webgrp/v1/runtime/tabs/xyz 不匹配 tab 路由，也不匹配 tabs 路由 → 404
    const { status } = await fetchV1(apiPath("/v1/runtime/tabs/xyz"));
    expect(status).toBe(404);
  });

  test("聚合 /webgrp/v1/runtime/tabs → runtime.snapshot", async () => {
    const ws = await connectResponder("c1", (resource) => ({
      ok: true, data: { resource }
    }));
    const { status, json } = await fetchV1(apiPath("/v1/runtime/tabs"));
    expect(status).toBe(200);
    expect(json.data.resource).toBe("runtime.snapshot");
    ws.close();
  });
});

describe(apiPath("/v1/runtime/selection"), () => {
  test("前端 no-selection → 404 透传", async () => {
    const ws = await connectResponder("c1", () => ({
      ok: false, error: { code: "no-selection", message: "未选中" }
    }));
    const { status, json } = await fetchV1(apiPath("/v1/runtime/selection"));
    expect(status).toBe(404);
    expect(json.error.code).toBe("no-selection");
    ws.close();
  });
});

describe(apiPath("/v1/runtime/screenshot"), () => {
  test("PNG 二进制透传，content-type image/png", async () => {
    const ws = await connectResponder("c1", () => ({
      ok: true, data: { base64: "iVBORw0KGgo=", width: 10, height: 5, mime: "image/png" }
    }));
    const res = await fetch(`${baseUrl}${apiPath("/v1/runtime/screenshot")}`);
    const buf = Buffer.from(await res.arrayBuffer());
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/png");
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(buf.equals(Buffer.from("iVBORw0KGgo=", "base64"))).toBe(true);
    ws.close();
  });

  test("非法 width → 400 bad-request", async () => {
    const { status, json } = await fetchV1(apiPath("/v1/runtime/screenshot") + "?width=abc");
    expect(status).toBe(400);
    expect(json.error.code).toBe("bad-request");
  });

  test("负 width → 400 bad-request", async () => {
    const { status, json } = await fetchV1(apiPath("/v1/runtime/screenshot") + "?width=-5");
    expect(status).toBe(400);
    expect(json.error.code).toBe("bad-request");
  });

  test("前端 ok=false internal → 500 透传", async () => {
    const ws = await connectResponder("c1", () => ({
      ok: false, error: { code: "internal", message: "SVG DOM 不可用" }
    }));
    const { status, json } = await fetchV1(apiPath("/v1/runtime/screenshot"));
    expect(status).toBe(500);
    expect(json.error.code).toBe("internal");
    ws.close();
  });
});

describe(apiPath("/v1/runtime/svg"), () => {
  test("SVG 文本透传，content-type image/svg+xml", async () => {
    const ws = await connectResponder("c1", () => ({
      ok: true, data: "<svg></svg>"
    }));
    const res = await fetch(`${baseUrl}${apiPath("/v1/runtime/svg")}`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/svg+xml; charset=utf-8");
    expect(await res.text()).toBe("<svg></svg>");
    ws.close();
  });
});

describe(apiPath("/v1/runtime/e-file"), () => {
  test("E 文件文本透传，content-type text/plain + attachment", async () => {
    const ws = await connectResponder("c1", () => ({
      ok: true, data: { filename: "模型.e", text: "<Section>", mime: "text/plain" }
    }));
    const res = await fetch(`${baseUrl}${apiPath("/v1/runtime/e-file")}`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("text/plain; charset=utf-8");
    expect(res.headers.get("content-disposition")).toContain("attachment");
    expect(await res.text()).toBe("<Section>");
    ws.close();
  });

  test("GET ?template= 预定义模板 → 透传 templateName + templateData", async () => {
    let received = null;
    const ws = await connectResponder("c1", (resource, params) => {
      received = params;
      return { ok: true, data: { filename: "model.e", text: "E", mime: "text/plain" } };
    });
    const res = await fetch(`${baseUrl}${apiPath("/v1/runtime/e-file")}?template=${encodeURIComponent("配网实时库")}`);
    expect(res.status).toBe(200);
    expect(received.templateName).toBe("配网实时库");
    expect(typeof received.templateData).toBe("string");
    expect(received.templateData.length).toBeGreaterThan(0);
    ws.close();
  });

  test("GET ?template= 未知模板 → 400", async () => {
    const { status, json } = await fetchV1(`${apiPath("/v1/runtime/e-file")}?template=不存在模板`);
    expect(status).toBe(400);
    expect(json.ok).toBe(false);
    expect(json.error.code).toBe("bad-request");
    expect(json.error.message).toContain("可用模板");
  });

  test("POST templateText → 透传 templateName + templateData", async () => {
    let received = null;
    const ws = await connectResponder("c1", (resource, params) => {
      received = params;
      return { ok: true, data: { filename: "model.e", text: "E", mime: "text/plain" } };
    });
    const res = await fetch(`${baseUrl}${apiPath("/v1/runtime/e-file")}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ templateName: "自定义模板A", templateText: "<ACLoad>\nname=名称\n</ACLoad>" })
    });
    expect(res.status).toBe(200);
    expect(received.templateName).toBe("自定义模板A");
    expect(Buffer.from(received.templateData, "base64").toString("utf8")).toContain("ACLoad");
    ws.close();
  });

  test("POST 空 templateText → 400", async () => {
    const res = await fetch(`${baseUrl}${apiPath("/v1/runtime/e-file")}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ templateText: "  " })
    });
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.error.code).toBe("bad-request");
  });

  test("POST 非法 JSON → 400", async () => {
    const r = await fetch(`${baseUrl}${apiPath("/v1/runtime/e-file")}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{invalid"
    });
    expect(r.status).toBe(400);
    const json = await r.json();
    expect(json.error.code).toBe("bad-request");
  });
});

describe(apiPath("/v1/runtime") + " 超时降级", () => {
  test("前端不响应 → 503 ws-timeout", async () => {
    const ws = await connectResponder("c1", () => new Promise(() => {})); // 永不响应
    const { status, json } = await fetchV1(apiPath("/v1/runtime/model"));
    expect(status).toBe(503);
    expect(json.error.code).toBe("ws-timeout");
    ws.close();
  }, 10000);
});

// ─── screenshot 尺寸参数（变异验证补）──────────────────────────
//
// 既有守卫只测了 width 的两个值（abc / -5）。变异验证下：
//   ① 删掉 width 校验 → 转红（有覆盖）
//   ② 删掉 height 校验 → **不红** —— height 与 width 两段代码逐字同构，
//      但一条断言都没落在它上面
//   ③ 把 <= 0 放宽成 < 0 → 不红 —— 0 这个边界没人测
//
// 0 尤其该测：截图宽高为 0 会一路透传到前端 canvas 绘制，产出空白 PNG，
// 而服务端不报任何错。
describe("/v1/runtime/screenshot 的 width/height 校验", () => {
  const reject = async (query) => {
    const { status, json } = await fetchV1(`${apiPath("/v1/runtime/screenshot")}?${query}`);
    expect(status).toBe(400);
    expect(json.ok).toBe(false);
    expect(json.error.code).toBe("bad-request");
  };

  test("height 非数字 → 400", async () => {
    await reject("height=abc");
  });

  test("height 负数 → 400", async () => {
    await reject("height=-5");
  });

  test("width 为 0 → 400（0 不是合法尺寸）", async () => {
    await reject("width=0");
  });

  test("height 为 0 → 400", async () => {
    await reject("height=0");
  });

  test("width / height 为 Infinity 字面量 → 400", async () => {
    await reject("width=Infinity");
    await reject("height=Infinity");
  });

  test("width / height 为空串 → 400（不是未指定）", async () => {
    await reject("width=");
    await reject("height=");
  });

  test("两个参数都非法时，先报的那个参数决定错误信息", async () => {
    const { status, json } = await fetchV1(`${apiPath("/v1/runtime/screenshot")}?width=abc&height=xyz`);
    expect(status).toBe(400);
    expect(json.error.message).toContain("width");
  });
});

// ─── 未覆盖分支补测（变异验证）────────────────────────────────────────────────
//
// ① apiV1Runtime.mjs:69 —— handleV1RuntimeClients 的 catch。
//    listClients 由派发层（createV1RuntimeRoutes 的 wrap）注入，真实 server 路径下
//    没有任何办法让它抛错，故直接调导出 handler + 假 response
//    （写法照 server/apiV1Schemes.test.mjs 的 directResponse）。
//    `error instanceof Error ? error.message : "后端处理失败。"` 三元两侧各断一条，
//    且两条的期望值互不相同（Error 侧是自定义 message 原文，非 Error 侧是固定文案），
//    所以「删掉 instanceof 判断」只让 ①-a 红、「改掉兜底文案」只让 ①-b 红 —— 没有恒绿的那条。
//
// ② apiV1Runtime.mjs:185 —— handleV1RuntimeEFile(GET) 的 catch。
//    既有 e-file 用例只覆盖了成功路径、?template= 已知/未知模板，
//    从没让 fetchFromClient reject 过 —— 这一整段 catch 未被触达。
//
// ③ apiV1Runtime.mjs:216-221 —— handleV1RuntimeEFilePost 的 catch 落穿。
//    body 合法 JSON（非 SyntaxError）→ 不落 payload-too-large / SyntaxError 两处 return，
//    一直走到 handleFetchError。既有 POST 用例只有「空 templateText 早退」与
//    「非法 JSON」两条，都在 handleFetchError 之前就 return 了。
//    错误码刻意取自定义码而非 no-online-client：自定义码只能来自前端透传，
//    硬编码变异猜不到；no-online-client 是本仓最容易被写死的字面量。
function directResponse() {
  const chunks = [];
  return {
    statusCode: 0,
    headers: {},
    headersSent: false,
    writeHead(status, headers) {
      this.statusCode = status;
      this.headers = headers ?? {};
      this.headersSent = true;
    },
    end(data) {
      if (data !== undefined && data !== null) {
        chunks.push(Buffer.isBuffer(data) ? data : Buffer.from(data));
      }
    },
    body() {
      return Buffer.concat(chunks).toString("utf-8");
    },
    jsonBody() {
      return JSON.parse(this.body());
    }
  };
}

describe("handleV1RuntimeClients 直调：listClients 抛错 → 500 internal", () => {
  test("抛 Error → 500 internal + error.message 原文", () => {
    const res = directResponse();
    handleV1RuntimeClients({ response: res }, {
      listClients: () => {
        throw new Error("注册表快照读取失败：ENOENT /data/clients.json");
      }
    });
    expect(res.statusCode).toBe(500);
    expect(res.jsonBody().ok).toBe(false);
    expect(res.jsonBody().error.code).toBe("internal");
    expect(res.jsonBody().error.message).toBe("注册表快照读取失败：ENOENT /data/clients.json");
  });

  test("抛非 Error → 500 internal + 兜底文案「后端处理失败。」", () => {
    const res = directResponse();
    handleV1RuntimeClients({ response: res }, {
      listClients: () => {
        throw "裸字符串原因";
      }
    });
    expect(res.statusCode).toBe(500);
    expect(res.jsonBody().ok).toBe(false);
    expect(res.jsonBody().error.code).toBe("internal");
    expect(res.jsonBody().error.message).toBe("后端处理失败。");
  });
});

describe(apiPath("/v1/runtime/e-file") + " 错误映射（GET 的 catch）", () => {
  test("GET 无在线客户端 → 503 no-online-client", async () => {
    const { status, json } = await fetchV1(apiPath("/v1/runtime/e-file"));
    expect(status).toBe(503);
    expect(json.ok).toBe(false);
    expect(json.error.code).toBe("no-online-client");
  });

  test("GET 前端自定义错误码 → 500 且原样透传（不断言规范错误码）", async () => {
    const ws = await connectResponder("c1", () => ({
      ok: false,
      error: { code: "e-file-template-unsupported", message: "该模板缺少必填段。" }
    }));
    const { status, json } = await fetchV1(
      apiPath("/v1/runtime/e-file") + "?template=" + encodeURIComponent("配网实时库")
    );
    expect(status).toBe(500);
    expect(json.ok).toBe(false);
    expect(json.error.code).toBe("e-file-template-unsupported");
    expect(json.error.message).toBe("该模板缺少必填段。");
    ws.close();
  });
});

describe(apiPath("/v1/runtime/e-file") + " POST 的 catch 落穿", () => {
  test("合法 JSON + 非空 templateText + 前端自定义错误码 → 500 透传", async () => {
    const ws = await connectResponder("c1", () => ({
      ok: false,
      error: { code: "e-file-template-malformed", message: "模板文本缺少 ACLoad 根节点。" }
    }));
    const res = await fetch(`${baseUrl}${apiPath("/v1/runtime/e-file")}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ templateName: "自定义模板B", templateText: "<ACLoad>\nname=名称\n</ACLoad>" })
    });
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.error.code).toBe("e-file-template-malformed");
    expect(json.error.message).toBe("模板文本缺少 ACLoad 根节点。");
    ws.close();
  });
});
