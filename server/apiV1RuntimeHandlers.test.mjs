// server/apiV1Runtime.mjs 的 handler 直测 —— 此前零直呼。
//
// ## 覆盖的是什么
//
// `apiV1Runtime.test.mjs` 经 `createImageServer` 走 HTTP 覆盖了这些端点，
// 但那要求真的起服务 + 真的连 WS。而 handler 本身是纯函数式的
// （`({request, url, response}, ctx, pathTab)`），构造假 ctx 即可直呼。
//
// ## 这一域与 control 域的差别
//
// control 域全部是「JSON → 校验 → 下发指令」，成功/失败都走信封。
// runtime 域有三条**不走信封**的路径：截图（image/png 二进制）、svg（image/svg+xml）、
// e-file（text/plain + Content-Disposition）。它们的响应头与内容类型是契约的一部分 ——
// 客户端按 content-type 分流，写错了不会报错，只会「下载到一个空文件」。
//
// 注意：`.test.mjs` 必须是纯 JS —— 不要写 `as never` / 类型标注 / 非空断言，
// 那些会触发 RollupError: Parse failure，表现为「Tests: no tests」（看着像通过，实际没跑）。
import { describe, expect, test } from "vitest";
import {
  createV1RuntimeRoutes,
  handleV1RuntimeClients,
  handleV1RuntimeDevices,
  handleV1RuntimeEFile,
  handleV1RuntimeEFilePost,
  handleV1RuntimeModel,
  handleV1RuntimeScreenshot,
  handleV1RuntimeSelection,
  handleV1RuntimeSvg,
  handleV1RuntimeTab,
  handleV1RuntimeTabs
} from "./apiV1Runtime.mjs";
import { FetchTimeoutError, NoOnlineClientError } from "./runtimeRegistry.mjs";
import { PREDEFINED_E_DEVICE_TEMPLATES } from "./eFileTemplates.mjs";
import { fakeCtx, fakeRequest, fakeResponse, fakeUrl, expectNoCall, firstCallName, firstCallParams } from "./handlerTestHarness.mjs";

async function run(handler, { body, search = "", ctx = fakeCtx(), url, pathTab } = {}) {
  const response = fakeResponse();
  await handler(
    { request: fakeRequest({ body }), response, url: url ?? fakeUrl(search) },
    ctx,
    pathTab
  );
  return { response, ctx };
}

function expectBadRequest(response, fragment) {
  const payload = response.json();
  expect(response.statusCode, JSON.stringify(payload)).toBe(400);
  expect(payload?.error?.code).toBe("bad-request");
  if (fragment) {
    expect(payload?.error?.message, JSON.stringify(payload)).toContain(fragment);
  }
}

// ─── 四个透传型端点 ──────────────────────────────────────
//
// model / devices / selection / tabs 四者结构相同：只是把固定 resource 名交给
// fetchFromClient。它们的正确性在于「resource 名与前端 runtimeWsClient 的路由一致」，
// 写错一个字母前端就静默不响应（WS 侧超时 → 503）。

describe("四个透传型端点：resource 名固定", () => {
  const cases = [
    [handleV1RuntimeModel, "runtime.model"],
    [handleV1RuntimeDevices, "runtime.devices"],
    [handleV1RuntimeSelection, "runtime.selection"],
    [handleV1RuntimeTabs, "runtime.snapshot"]
  ];

  for (const [handler, resource] of cases) {
    test(`${resource} 下发的 resource 名正确`, async () => {
      const { response, ctx } = await run(handler, {});
      expect(firstCallName(ctx), resource).toBe(resource);
      expect(response.statusCode).toBe(200);
    });

    test(`${resource} 不传任何 params`, async () => {
      const { ctx } = await run(handler, {});
      expect(firstCallParams(ctx)).toBeUndefined();
    });
  }

  test("成功响应包进 ok 信封且 no-store", async () => {
    const { response } = await run(handleV1RuntimeModel, { ctx: fakeCtx({ result: { modelId: "M1" } }) });
    const payload = response.json();
    expect(payload).toEqual({ ok: true, data: { modelId: "M1" } });
    // 运行时态是实时数据，不能缓存
    expect(response.headers["cache-control"]).toBe("no-store");
  });

  test("query 的 clientId 经 trim 后透传", async () => {
    const withId = await run(handleV1RuntimeModel, { search: "clientId=C1" });
    expect(withId.ctx.calls[0].clientId).toBe("C1");
    const blank = await run(handleV1RuntimeModel, { search: "clientId=%20%20" });
    expect(blank.ctx.calls[0].clientId).toBeNull();
  });
});

// ─── handleV1RuntimeTab ──────────────────────────────────

describe("handleV1RuntimeTab", () => {
  test("三个合法 tab 都接受", async () => {
    for (const tab of ["model", "tree", "graph"]) {
      const { response, ctx } = await run(handleV1RuntimeTab, { search: `tab=${tab}` });
      expect(response.statusCode, tab).toBe(200);
      expect(firstCallName(ctx)).toBe("runtime.tab");
      expect(firstCallParams(ctx), tab).toEqual({ tab });
    }
  });

  test("非法 tab → 400 且不下发", async () => {
    for (const tab of ["Model", "TREE", "snapshot", "", "%20"]) {
      const { response, ctx } = await run(handleV1RuntimeTab, { search: `tab=${tab}` });
      // 空串是合法的（回落 model），其余非法
      if (tab === "" || tab === "%20") {
        expect(response.statusCode, tab).toBe(200);
      } else {
        expectBadRequest(response, "tab 须为");
        expectNoCall(ctx);
      }
    }
  });

  test("tab 缺省时回落 model（不是不传）", async () => {
    const { response, ctx } = await run(handleV1RuntimeTab, {});
    expect(response.statusCode).toBe(200);
    expect(firstCallParams(ctx)).toEqual({ tab: "model" });
  });

  test("空白 tab 也回落 model（trim 后为空）", async () => {
    const { ctx } = await run(handleV1RuntimeTab, { search: "tab=%20%20" });
    expect(firstCallParams(ctx)).toEqual({ tab: "model" });
  });

  test("pathTab（路径命名捕获组）优先于 query.tab", async () => {
    const { ctx } = await run(handleV1RuntimeTab, { search: "tab=model", pathTab: "graph" });
    expect(firstCallParams(ctx)).toEqual({ tab: "graph" });
  });

  test("只有 query 无 pathTab 时用 query 值", async () => {
    const { ctx } = await run(handleV1RuntimeTab, { search: "tab=tree" });
    expect(firstCallParams(ctx)).toEqual({ tab: "tree" });
  });

  test("pathTab 非法时同样 400（路径段也走白名单，不能绕过 query 校验）", async () => {
    const { response, ctx } = await run(handleV1RuntimeTab, { pathTab: "../etc" });
    expectBadRequest(response, "tab 须为");
    expectNoCall(ctx);
  });
});

// ─── handleV1RuntimeScreenshot ───────────────────────────

describe("handleV1RuntimeScreenshot", () => {
  test("不带 width/height 时不传尺寸参数（前端用默认分辨率）", async () => {
    const { response, ctx } = await run(handleV1RuntimeScreenshot, {});
    expect(firstCallParams(ctx)).toEqual({});
    expect(firstCallName(ctx)).toBe("runtime.screenshot");
  });

  test("合法 width/height 转为 number 透传", async () => {
    const { response, ctx } = await run(handleV1RuntimeScreenshot, { search: "width=800&height=600" });
    expect(response.statusCode).toBe(200);
    expect(firstCallParams(ctx)).toEqual({ width: 800, height: 600 });
  });

  test("只给 width 时只透传 width（不是补默认值 0）", async () => {
    const { ctx } = await run(handleV1RuntimeScreenshot, { search: "width=800" });
    expect(firstCallParams(ctx)).toEqual({ width: 800 });
  });

  test("width/height 非正数或非数值 → 400 且不下发", async () => {
    for (const search of ["width=0", "width=-1", "height=0", "height=-100", "width=abc", "height=NaN", "width=Infinity"]) {
      const { response, ctx } = await run(handleV1RuntimeScreenshot, { search });
      expectBadRequest(response, "须为正数");
      expectNoCall(ctx);
    }
  });

  test("响应是 image/png 二进制，body 由 base64 解出", async () => {
    // 1×1 透明 PNG
    const png = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
    const { response } = await run(handleV1RuntimeScreenshot, { ctx: fakeCtx({ result: { base64: png } }) });
    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toBe("image/png");
    // 真的解出了 PNG 魔数，不是把 base64 字符串当字节写出去
    expect(Buffer.isBuffer(response.body)).toBe(true);
    expect(response.body.subarray(0, 4)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  });

  test("base64 缺失时写空 body 而非崩溃（仍回 200 + png 头）", async () => {
    const { response } = await run(handleV1RuntimeScreenshot, { ctx: fakeCtx({ result: {} }) });
    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toBe("image/png");
    expect(response.body.length).toBe(0);
  });

  test("前端报错时映射为对应错误码", async () => {
    const noClient = await run(handleV1RuntimeScreenshot, { ctx: fakeCtx({ error: new NoOnlineClientError() }) });
    expect(noClient.response.statusCode).toBe(503);
    expect(noClient.response.json()?.error?.code).toBe("no-online-client");

    const timeout = await run(handleV1RuntimeScreenshot, { ctx: fakeCtx({ error: new FetchTimeoutError("runtime.screenshot") }) });
    expect(timeout.response.statusCode).toBe(503);
    expect(timeout.response.json()?.error?.code).toBe("ws-timeout");
  });
});

// ─── handleV1RuntimeSvg ──────────────────────────────────

describe("handleV1RuntimeSvg", () => {
  test("成功回 image/svg+xml + UTF-8 charset", async () => {
    const { response } = await run(handleV1RuntimeSvg, { ctx: fakeCtx({ result: "<svg xmlns=\"http://www.w3.org/2000/svg\"/>" }) });
    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toBe("image/svg+xml; charset=utf-8");
    expect(response.text()).toBe("<svg xmlns=\"http://www.w3.org/2000/svg\"/>");
  });

  test("**不走信封**：body 是裸 SVG，不是 {ok:true,data}", async () => {
    // 这条是契约的关键：客户端直接把它当图片用，包一层信封会渲染出空白页
    const { response } = await run(handleV1RuntimeSvg, { ctx: fakeCtx({ result: "<svg/>" }) });
    expect(response.json()).toBeNull();
    expect(response.text()).toBe("<svg/>");
  });

  test("非字符串结果被 String() 归一，不抛错", async () => {
    const { response } = await run(handleV1RuntimeSvg, { ctx: fakeCtx({ result: null }) });
    expect(response.statusCode).toBe(200);
    expect(response.text()).toBe("");
  });

  test("失败时回信封错误（与成功路径形状不同）", async () => {
    const { response } = await run(handleV1RuntimeSvg, { ctx: fakeCtx({ error: new NoOnlineClientError() }) });
    expect(response.json()?.ok).toBe(false);
    expect(response.json()?.error?.code).toBe("no-online-client");
  });
});

// ─── handleV1RuntimeEFile ────────────────────────────────

describe("handleV1RuntimeEFile", () => {
  test("不带 template 时不下发任何 params", async () => {
    const { response, ctx } = await run(handleV1RuntimeEFile, {});
    expect(response.statusCode).toBe(200);
    expect(firstCallParams(ctx)).toBeUndefined();
  });

  test("已知模板名：下发 templateName + base64 的 templateData", async () => {
    const templateName = Object.keys(PREDEFINED_E_DEVICE_TEMPLATES)[0];
    const { response, ctx } = await run(handleV1RuntimeEFile, { search: `template=${encodeURIComponent(templateName)}` });
    expect(response.statusCode).toBe(200);
    const params = firstCallParams(ctx);
    expect(params.templateName).toBe(templateName);
    // templateData 是 base64（前端按 base64 解出原始字节再走 decodeAuto）
    expect(typeof params.templateData).toBe("string");
    expect(Buffer.from(params.templateData, "base64").length).toBeGreaterThan(0);
  });

  test("未知模板名 → 400 且不下发，错误消息列出可用模板", async () => {
    const { response, ctx } = await run(handleV1RuntimeEFile, { search: "template=%E4%B8%8D%E5%AD%98%E5%9C%A8" });
    expectBadRequest(response, "未知模板");
    expectNoCall(ctx);
    for (const name of Object.keys(PREDEFINED_E_DEVICE_TEMPLATES)) {
      expect(response.json()?.error?.message, name).toContain(name);
    }
  });

  test("空白 template 按「无模板」处理（不是未知模板）", async () => {
    const { response, ctx } = await run(handleV1RuntimeEFile, { search: "template=%20%20" });
    expect(response.statusCode).toBe(200);
    expect(firstCallParams(ctx)).toBeUndefined();
  });

  test("Content-Disposition 用 ASCII + RFC5987 双写法（中文文件名两条都要）", async () => {
    const { response } = await run(handleV1RuntimeEFile, { ctx: fakeCtx({ result: { text: "内容", filename: "模型1.e" } }) });
    const disposition = response.headers["content-disposition"];
    expect(disposition).toContain('filename="');
    expect(disposition).toContain("filename*=UTF-8''");
    // 中文名被百分号编码，不会让 header 破坏
    expect(disposition).toContain(encodeURIComponent("模型1.e"));
  });

  test("filename 缺省时用 model.e", async () => {
    const { response } = await run(handleV1RuntimeEFile, { ctx: fakeCtx({ result: { text: "内容" } }) });
    expect(response.headers["content-disposition"]).toContain("model.e");
  });

  test("content-type 是 text/plain + UTF-8（E 文件是 GBK 内容但按文本下发）", async () => {
    const { response } = await run(handleV1RuntimeEFile, { ctx: fakeCtx({ result: { text: "内容", filename: "a.e" } }) });
    expect(response.headers["content-type"]).toBe("text/plain; charset=utf-8");
    expect(response.text()).toBe("内容");
  });
});

// ─── handleV1RuntimeEFilePost ────────────────────────────

describe("handleV1RuntimeEFilePost", () => {
  test("templateText 非空时按 base64 下发", async () => {
    const text = "<ACLoad>…</ACLoad>";
    const { response, ctx } = await run(handleV1RuntimeEFilePost, { body: { templateText: text } });
    expect(response.statusCode).toBe(200);
    const params = firstCallParams(ctx);
    expect(Buffer.from(params.templateData, "base64").toString("utf-8")).toBe(text);
    // templateName 缺省时是 undefined（不是空串）
    expect(params.templateName).toBeUndefined();
  });

  test("templateName 一并给出时被带上", async () => {
    const templateName = Object.keys(PREDEFINED_E_DEVICE_TEMPLATES)[0];
    const { ctx } = await run(handleV1RuntimeEFilePost, {
      body: { templateText: "<ACLoad/>", templateName }
    });
    expect(firstCallParams(ctx).templateName).toBe(templateName);
  });

  test("空白 templateName 被 trim 成空 → 回落 undefined", async () => {
    const { ctx } = await run(handleV1RuntimeEFilePost, {
      body: { templateText: "<ACLoad/>", templateName: "   " }
    });
    expect(firstCallParams(ctx).templateName).toBeUndefined();
  });

  test("templateText 缺失 / 空白 / 非字符串 → 400 且不下发", async () => {
    for (const templateText of [undefined, null, "", "   ", 123, {}]) {
      const { response, ctx } = await run(handleV1RuntimeEFilePost, { body: { templateText } });
      expectBadRequest(response, "templateText");
      expectNoCall(ctx);
    }
  });

  test("空 body 走 templateText 不能为空分支", async () => {
    const { response, ctx } = await run(handleV1RuntimeEFilePost, { body: undefined });
    expectBadRequest(response, "templateText");
    expectNoCall(ctx);
  });

  test("body 非 JSON → 400（SyntaxError 单独映射）且不下发", async () => {
    const { response, ctx } = await run(handleV1RuntimeEFilePost, { body: "{不是JSON" });
    expectBadRequest(response, "JSON");
    expectNoCall(ctx);
  });

  test("base64 是 UTF-8 编码（中文往返无损）", async () => {
    const text = "# 交流负荷\n1号主变压器";
    const { ctx } = await run(handleV1RuntimeEFilePost, { body: { templateText: text } });
    expect(Buffer.from(firstCallParams(ctx).templateData, "base64").toString("utf-8")).toBe(text);
  });
});

// ─── handleV1RuntimeClients ──────────────────────────────

describe("handleV1RuntimeClients", () => {
  const client = (over = {}) => ({
    clientId: "C1",
    workspaceId: "ws-1",
    registeredAt: 1700000000000,
    lastActiveAt: 1700000001000,
    ...over
  });

  test("输出 clientId / workspaceId / role / 两个时间戳", async () => {
    const ctx = fakeCtx();
    ctx.listClients = () => [client()];
    const response = fakeResponse();
    await handleV1RuntimeClients({ response }, ctx);
    const payload = response.json();
    expect(payload.ok).toBe(true);
    expect(payload.data.clients).toHaveLength(1);
    expect(payload.data.clients[0]).toEqual({
      clientId: "C1",
      workspaceId: "ws-1",
      role: "editor",
      registeredAt: "2023-11-14T22:13:20.000Z",
      lastActiveAt: "2023-11-14T22:13:21.000Z"
    });
  });

  test("★ workspaceId 不被白名单重映射丢掉（曾被丢过，导致对外少一个已承诺的键）", async () => {
    const ctx = fakeCtx();
    ctx.listClients = () => [client({ workspaceId: "ws-9" })];
    const response = fakeResponse();
    await handleV1RuntimeClients({ response }, ctx);
    expect(response.json().data.clients[0].workspaceId).toBe("ws-9");
  });

  test("注册表里的其它内部字段不外泄（只输出白名单里的六个键）", async () => {
    const ctx = fakeCtx();
    ctx.listClients = () => [client({ secret: "不应外泄", socket: {}, pending: new Map() })];
    const response = fakeResponse();
    await handleV1RuntimeClients({ response }, ctx);
    expect(Object.keys(response.json().data.clients[0]).sort()).toEqual([
      "clientId",
      "lastActiveAt",
      "registeredAt",
      "role",
      "workspaceId"
    ]);
  });

  test("空列表返回空数组而非 null", async () => {
    const ctx = fakeCtx();
    ctx.listClients = () => [];
    const response = fakeResponse();
    await handleV1RuntimeClients({ response }, ctx);
    expect(response.json().data.clients).toEqual([]);
  });

  test("listClients 抛错 → 500 internal", async () => {
    const ctx = fakeCtx();
    ctx.listClients = () => {
      throw new Error("注册表炸了");
    };
    const response = fakeResponse();
    await handleV1RuntimeClients({ response }, ctx);
    const payload = response.json();
    expect(response.statusCode).toBe(500);
    expect(payload.error.code).toBe("internal");
    expect(payload.error.message).toBe("注册表炸了");
  });
});

// ─── 错误映射 ────────────────────────────────────────────

describe("handleFetchError：三种错误类的映射", () => {
  test("NoOnlineClientError → 503", async () => {
    const { response } = await run(handleV1RuntimeModel, { ctx: fakeCtx({ error: new NoOnlineClientError() }) });
    expect(response.statusCode).toBe(503);
    expect(response.json().error.code).toBe("no-online-client");
  });

  test("FetchTimeoutError → 503 ws-timeout", async () => {
    const { response } = await run(handleV1RuntimeModel, {
      ctx: fakeCtx({ error: new FetchTimeoutError("runtime.model") })
    });
    expect(response.statusCode).toBe(503);
    expect(response.json().error.code).toBe("ws-timeout");
  });

  test("前端透传的 no-active-model → 404（不是 500）", async () => {
    const error = Object.assign(new Error("没有打开的模型。"), { code: "no-active-model" });
    const { response } = await run(handleV1RuntimeModel, { ctx: fakeCtx({ error }) });
    expect(response.statusCode).toBe(404);
    expect(response.json().error.code).toBe("no-active-model");
  });

  test("no-selection → 404（选中类端点的常见错误）", async () => {
    const error = Object.assign(new Error("未选中设备。"), { code: "no-selection" });
    const { response } = await run(handleV1RuntimeSelection, { ctx: fakeCtx({ error }) });
    expect(response.statusCode).toBe(404);
  });

  test("无 code 的错误 → internal", async () => {
    const { response } = await run(handleV1RuntimeModel, { ctx: fakeCtx({ error: new Error("崩了") }) });
    expect(response.statusCode).toBe(500);
    expect(response.json().error.code).toBe("internal");
  });

  test("非 Error 的 reject 值也给出兜底文案", async () => {
    const { response } = await run(handleV1RuntimeModel, { ctx: fakeCtx({ error: "字符串错误" }) });
    expect(response.statusCode).toBe(500);
    expect(response.json().error.message).toBe("运行时态拉取失败。");
  });
});

// ─── createV1RuntimeRoutes ───────────────────────────────

describe("createV1RuntimeRoutes", () => {
  test("路由表覆盖 10 条（含 e-file 的 GET 与 POST 两条）", () => {
    const routes = createV1RuntimeRoutes(fakeCtx());
    expect(routes).toHaveLength(10);
    expect(new Set(routes.map((route) => route.pattern.source)).size).toBe(9);
    // e-file 有 GET + POST 两条，pattern 相同但 method 不同
    const eFile = routes.filter((route) => route.pattern.source.includes("runtime\\/e-file"));
    expect(eFile.map((route) => route.method).sort()).toEqual(["GET", "POST"]);
  });

  test("9 条 GET + 1 条 POST（唯 e-file 有 POST）", () => {
    const routes = createV1RuntimeRoutes(fakeCtx());
    const methods = routes.map((route) => route.method);
    expect(methods.filter((method) => method === "GET")).toHaveLength(9);
    expect(methods.filter((method) => method === "POST")).toHaveLength(1);
  });

  test("缺 spaceId 直接抛错（fail-closed）", () => {
    const routes = createV1RuntimeRoutes(fakeCtx());
    const route = routes.find((item) => item.pattern.test("/webgrp/v1/runtime/model"));
    expect(() => route.handle({ request: fakeRequest({}), response: fakeResponse(), url: fakeUrl() }))
      .toThrow(/spaceId/);
  });

  test("带 spaceId 时把空间透传给 fetchFromClient 的第四参", async () => {
    const calls = [];
    const ctx = {
      fetchFromClient: (clientId, resource, params, spaceId) => {
        calls.push({ clientId, resource, params, spaceId });
        return Promise.resolve({ ok: 1 });
      },
      listClients: () => []
    };
    const routes = createV1RuntimeRoutes(ctx);
    const route = routes.find((item) => item.pattern.test("/webgrp/v1/runtime/model"));
    const response = fakeResponse();
    await route.handle({ spaceId: "ws-1", request: fakeRequest({}), response, url: fakeUrl() });
    expect(response.statusCode).toBe(200);
    expect(calls[0].spaceId).toBe("ws-1");
  });

  test("tabs 路由的命名捕获组把 pathTab 传给第三参", async () => {
    const seen = [];
    const ctx = {
      fetchFromClient: (clientId, resource, params) => {
        seen.push({ resource, params });
        return Promise.resolve({});
      },
      listClients: () => []
    };
    const routes = createV1RuntimeRoutes(ctx);
    const route = routes.find((item) => item.pattern.test("/webgrp/v1/runtime/tabs/graph"));
    expect(route).toBeDefined();
    const response = fakeResponse();
    await route.handle({
      spaceId: "ws-1",
      request: fakeRequest({}),
      response,
      url: fakeUrl(),
      match: { groups: { tab: "graph" } }
    });
    expect(seen[0].params).toEqual({ tab: "graph" });
  });

  test("tabs 路由只匹配三个合法段名（非法段不落到这条路由上）", () => {
    const routes = createV1RuntimeRoutes(fakeCtx());
    // 正则里的斜杠被转义成 \/，故按命名捕获组定位这条路由
    const route = routes.find((item) => item.pattern.source.includes("(?<tab>"));
    expect(route).toBeDefined();
    expect(route.pattern.test("/webgrp/v1/runtime/tabs/graph")).toBe(true);
    expect(route.pattern.test("/webgrp/v1/runtime/tabs/model")).toBe(true);
    expect(route.pattern.test("/webgrp/v1/runtime/tabs/snapshot")).toBe(false);
    // 无段名不匹配：那是上面那条 /runtime/tabs\/?$ 的活
    expect(route.pattern.test("/webgrp/v1/runtime/tabs/")).toBe(false);
  });
});
