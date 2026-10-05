import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";
import AdmZip from "adm-zip";

// 半个模块替身：只把 apiV1Schemes.mjs 真正消费的那 3 个函数换成可编程的 vi.fn，
// 其余导出（关键是 createImageServer）原样透传给真实实现 —— 所以文件上方那批
// 「起真 server 打真 HTTP」的集成用例完全不受影响。
// 反例提醒：早先版本想用 `vi.mock("./server.mjs", () => ({ ...3 个桩 }))` 整体替换，
// 那会把 createImageServer 变成 vi.fn()，`server.address()` 返回 undefined → 整文件崩。
vi.mock("./server.mjs", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    readSchemes: vi.fn(actual.readSchemes),
    createSchemeArchiveBuffer: vi.fn(actual.createSchemeArchiveBuffer),
    readSchemeProjectRecord: vi.fn(actual.readSchemeProjectRecord)
  };
});

import { createImageServer, readSchemes, createSchemeArchiveBuffer, readSchemeProjectRecord } from "./server.mjs";
import {
  handleV1Schemes,
  handleV1SchemesHierarchy,
  handleV1SchemeModels,
  handleV1SchemeExport,
  handleV1ModelJson
} from "./apiV1Schemes.mjs";
import { encodeSchemePath } from "./schemePath.mjs";
import { apiPath } from "./config.mjs";

// 真实实现引用（绕过 mock）：本文件末尾的直调用例在 afterEach 里把三个 vi.fn
// 复位成真实实现，避免一个用例的 mockImplementation 泄漏给后面的用例。
const actualServer = await vi.importActual("./server.mjs");

// 集成测试：起真实 server（临时端口 + tmpdir 数据目录），打真实 /webgrp/v1 请求。
// 问题：createImageServer 用模块级 schemeDataDir（repo data/），无法注入 tmpdir。
// 解法：用环境变量? 不支持。改为直接调 handler 函数 + mock req/res 测纯逻辑层，
//      或用 repo 真实 data 目录（若有 IEEE 数据）。
// 务实：测 handler 纯逻辑（parseSchemePathParam/encodeSchemePath + handler 信封格式），
//      完整 HTTP 集成用 repo data 目录只读验证 schemes 接口可响应。

let server;
let baseUrl;

beforeEach(async () => {
  server = await createImageServer({ port: 0, host: "127.0.0.1" });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

afterEach(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
});

async function fetchV1(pathname) {
  const res = await fetch(`${baseUrl}${pathname}`);
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    // 非 JSON（如 ZIP/SVG）
  }
  return { status: res.status, headers: res.headers, text, json };
}

const sampleProject = {
  version: 1,
  name: "测试模型",
  powerUnit: "MW",
  voltageUnit: "kV",
  currentUnit: "A",
  powerBaseValue: 100,
  nodes: [
    {
      id: "bus-1",
      kind: "ac-bus",
      name: "母线1",
      position: { x: 0, y: 0 },
      size: { width: 120, height: 16 },
      params: {},
      terminals: [{ id: "t1", type: "ac", anchor: { x: 0.5, y: 0.5 } }]
    }
  ],
  edges: []
};

describe(apiPath("/v1/schemes") + " 方案列表", () => {
  test("200 返回信封 {ok:true,data:{schemes}}", async () => {
    const { status, json } = await fetchV1(apiPath("/v1/schemes"));
    expect(status).toBe(200);
    expect(json.ok).toBe(true);
    expect(Array.isArray(json.data.schemes)).toBe(true);
  });

  test("includeProjects=1 时含 projects", async () => {
    const { status, json } = await fetchV1(apiPath("/v1/schemes") + "?includeProjects=1");
    expect(status).toBe(200);
    expect(json.ok).toBe(true);
  });
});

describe(apiPath("/v1/schemes/hierarchy") + " 层级树", () => {
  test("200 返回 {ok:true,data:{nodes}}", async () => {
    const { status, json } = await fetchV1(apiPath("/v1/schemes/hierarchy"));
    expect(status).toBe(200);
    expect(json.ok).toBe(true);
    expect(Array.isArray(json.data.nodes)).toBe(true);
  });
});

describe(apiPath("/v1/schemes/models") + " 模型列表", () => {
  test("缺少 schemePath 返 400（模型列表：无任何查询参数，error.code=bad-request）", async () => {
    const { status, json } = await fetchV1(apiPath("/v1/schemes/models"));
    expect(status).toBe(400);
    expect(json.ok).toBe(false);
    expect(json.error.code).toBe("bad-request");
  });

  test("非法 schemePath（非 JSON）返 400", async () => {
    const { status } = await fetchV1(apiPath("/v1/schemes/models") + "?schemePath=not-json");
    expect(status).toBe(400);
  });

  test("不存在的方案返 404（模型列表：查模型清单，error.code=not-found）", async () => {
    const sp = encodeSchemePath(["不存在的方案xyz"]);
    const { status, json } = await fetchV1(apiPath(`/v1/schemes/models?schemePath=${sp}`));
    expect(status).toBe(404);
    expect(json.error.code).toBe("not-found");
  });
});

describe(apiPath("/v1/schemes/export") + " 方案导出", () => {
  test("缺少 schemePath 返 400（方案导出 ZIP：无任何查询参数）", async () => {
    const { status } = await fetchV1(apiPath("/v1/schemes/export"));
    expect(status).toBe(400);
  });

  test("不存在的方案返 404（方案导出 ZIP：导出整包时方案不存在）", async () => {
    const sp = encodeSchemePath(["不存在的方案xyz"]);
    const { status } = await fetchV1(apiPath(`/v1/schemes/export?schemePath=${sp}`));
    expect(status).toBe(404);
  });
});

describe(apiPath("/v1/schemes/model/json") + " 模型 JSON", () => {
  test("缺少 schemePath 返 400（模型 JSON：已给 name 但缺 schemePath）", async () => {
    const { status } = await fetchV1(apiPath("/v1/schemes/model/json") + "?name=x");
    expect(status).toBe(400);
  });

  test("缺少 name 返 400（模型 JSON：已给 schemePath 但缺 name）", async () => {
    const sp = encodeSchemePath(["方案"]);
    const { status } = await fetchV1(apiPath(`/v1/schemes/model/json?schemePath=${sp}`));
    expect(status).toBe(400);
  });

  test("不存在模型返 404（模型 JSON：schemePath 存在但 name 不存在）", async () => {
    const sp = encodeSchemePath(["方案xyz"]);
    const { status } = await fetchV1(apiPath(`/v1/schemes/model/json?schemePath=${sp}&name=不存在`));
    expect(status).toBe(404);
  });
});

describe(apiPath("/v1/schemes/model/svg") + " 模型 SVG", () => {
  test("缺少 schemePath 返 400（模型 SVG：已给 name 但缺 schemePath）", async () => {
    const { status } = await fetchV1(apiPath("/v1/schemes/model/svg") + "?name=x");
    expect(status).toBe(400);
  });

  test("缺少 name 返 400（模型 SVG：已给 schemePath 但缺 name）", async () => {
    const sp = encodeSchemePath(["方案"]);
    const { status } = await fetchV1(apiPath(`/v1/schemes/model/svg?schemePath=${sp}`));
    expect(status).toBe(400);
  });

  test("不存在模型返 404（模型 SVG：schemePath 存在但 name 不存在）", async () => {
    const sp = encodeSchemePath(["方案xyz"]);
    const { status } = await fetchV1(apiPath(`/v1/schemes/model/svg?schemePath=${sp}&name=不存在`));
    expect(status).toBe(404);
  });
});

describe("schemePath 编解码", () => {
  // 解析函数的入参是 **URL 层已解码的值**（`url.searchParams.get()` 的结果），
  // 所以这里必须先 decodeURIComponent 一次，否则测的不是生产链路。
  test("encode/decode 往返一致", async () => {
    const { encodeSchemePath, parseSchemePathParam } = await import("./schemePath.mjs");
    const parts = ["方案A", "子方案B"];
    const encoded = encodeSchemePath(parts);
    const decoded = parseSchemePathParam(decodeURIComponent(encoded));
    expect(decoded).toEqual(parts);
  });

  test("中文方案名编解码", async () => {
    const { encodeSchemePath, parseSchemePathParam } = await import("./schemePath.mjs");
    const parts = ["IEEE标准算例"];
    const encoded = encodeSchemePath(parts);
    expect(encoded).not.toContain("[");
    const decoded = parseSchemePathParam(decodeURIComponent(encoded));
    expect(decoded).toEqual(parts);
  });

  test("★ 经真实 URL（URLSearchParams）解析，方案名含 % 时原样保留", async () => {
    const { encodeSchemePath, parseSchemePathParam } = await import("./schemePath.mjs");
    const parts = ["50%41厂", "子方案"];
    const url = new URL(`http://127.0.0.1/x?schemePath=${encodeSchemePath(parts)}`);
    // 这一行就是生产写法（apiV1Schemes.mjs / cimExport.mjs / eFileExport.mjs / sendModel.mjs）
    const decoded = parseSchemePathParam(url.searchParams.get("schemePath"));
    expect(decoded).toEqual(parts);
  });
});

// 正路径测试需注入 tmpdir 数据目录，createImageServer 暂不支持 dataRoot 参数。
// 错误路径 + 信封格式 + 编解码已覆盖。正路径在 T12 E2E（真实数据）覆盖。

// ────────────────────────────────────────────────────────────────────────────
// 直调 handler 层：覆盖 apiV1Schemes.mjs 里 HTTP 集成路径够不到的分支
//
// 为什么不用 fetch 打真服务器：readSchemeDirectory 的**返回形状**恒为
// `{name, updatedAt, projects, children}`（两个字段必存在），所以
// 26/27/36/49/91 那五处 `?? []` 在真实磁盘数据下**永远走不到**；
// 62/72/93/118/152 的 catch 分支也要求上游抛错。
// 这两条都必须让 handler 直接吃「与 readSchemeDirectory 不同」的载荷，
// 故本组用例直接调导出 handler + mock req/res（不 mock 任何被测模块）。
// ────────────────────────────────────────────────────────────────────────────

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

function directUrl(search) {
  return new URL(`http://127.0.0.1${apiPath("/v1/schemes")}?${search}`);
}

const V1_JSON_HEADERS = { headers: {} };

describe("handleV1Schemes / handleV1SchemesHierarchy 直调：catch 里的非 Error 兜底", () => {
  afterEach(() => {
    readSchemes.mockReset();
    readSchemes.mockImplementation(actualServer.readSchemes);
  });

  // 62 行（handleV1Schemes 的 catch）
  test("handleV1Schemes：readSchemes 抛非 Error → 500 internal + 默认文案「后端处理失败。」", async () => {
    readSchemes.mockRejectedValue("裸字符串原因");
    const res = directResponse();
    await handleV1Schemes({ url: directUrl(""), request: V1_JSON_HEADERS, response: res });
    expect(res.statusCode).toBe(500);
    expect(res.jsonBody()).toEqual({ ok: false, error: { code: "internal", message: "后端处理失败。" } });
  });

  test("handleV1Schemes：readSchemes 抛普通 Error → message 取 error.message（对照）", async () => {
    readSchemes.mockRejectedValue(new Error("方案目录读取失败：EACCES"));
    const res = directResponse();
    await handleV1Schemes({ url: directUrl(""), request: V1_JSON_HEADERS, response: res });
    expect(res.statusCode).toBe(500);
    expect(res.jsonBody().error.message).toBe("方案目录读取失败：EACCES");
  });

  // 72 行（handleV1SchemesHierarchy 的 catch）—— 该 handler 在集成层从未出错，
  // 所以这一整块 catch 之前零覆盖；这里两条把三元两侧都钉住。
  test("handleV1SchemesHierarchy：readSchemes 抛非 Error → 500 internal + 默认文案「后端处理失败。」", async () => {
    readSchemes.mockRejectedValue("裸字符串原因");
    const res = directResponse();
    await handleV1SchemesHierarchy({ url: directUrl(""), request: V1_JSON_HEADERS, response: res });
    expect(res.statusCode).toBe(500);
    expect(res.jsonBody()).toEqual({ ok: false, error: { code: "internal", message: "后端处理失败。" } });
  });

  test("handleV1SchemesHierarchy：readSchemes 抛普通 Error → message 取 error.message（对照）", async () => {
    readSchemes.mockRejectedValue(new Error("读目录失败：EBUSY"));
    const res = directResponse();
    await handleV1SchemesHierarchy({ url: directUrl(""), request: V1_JSON_HEADERS, response: res });
    expect(res.statusCode).toBe(500);
    expect(res.jsonBody().error.message).toBe("读目录失败：EBUSY");
  });
});

describe("handleV1Schemes 直调：缺 projects/children 时的 ?? [] 兜底", () => {
  afterEach(() => {
    readSchemes.mockReset();
    readSchemes.mockImplementation(actualServer.readSchemes);
  });

  // 26 行 `(scheme.projects ?? [])` 与 27 行 `schemeTreeSummary(scheme.children ?? [])`
  test("方案缺 projects 键 → 摘要 projects 为空数组；缺 children 键 → children 为空数组", async () => {
    // ★ 两个键都**不存在**（不是空数组）：只有这样才会走到 `?? []` 的右值。
    // 若误写成 `projects: []`，`?? []` 短路取左值，同样的断言照样绿 —— 那就白测了。
    readSchemes.mockResolvedValue([{ name: "无子字段方案", updatedAt: "t0" }]);
    const res = directResponse();
    await handleV1Schemes({ url: directUrl(""), request: V1_JSON_HEADERS, response: res });
    expect(res.statusCode).toBe(200);
    expect(res.jsonBody().data.schemes).toEqual([
      { name: "无子字段方案", updatedAt: "t0", projects: [], children: [] }
    ]);
  });

  test("对照：projects/children 存在时摘要只保留 name/updatedAt（丢掉 project 全文）", async () => {
    readSchemes.mockResolvedValue([
      { name: "有子字段方案", updatedAt: "t0", projects: [{ name: "m", updatedAt: "t1", project: { nodes: [1] } }], children: [] }
    ]);
    const res = directResponse();
    await handleV1Schemes({ url: directUrl(""), request: V1_JSON_HEADERS, response: res });
    expect(res.jsonBody().data.schemes[0]).toEqual({
      name: "有子字段方案",
      updatedAt: "t0",
      projects: [{ name: "m", updatedAt: "t1" }],
      children: []
    });
  });
});

describe("handleV1SchemesHierarchy 直调：缺 children 键时的 ?? [] 兜底", () => {
  afterEach(() => {
    readSchemes.mockReset();
    readSchemes.mockImplementation(actualServer.readSchemes);
  });

  // 36 行 `schemeHierarchy(scheme.children ?? [])`，且**递归层**也缺 children：
  // 只缺顶层的话，内层循环空数组不构成判别力。
  test("父子两级都缺 children 键 → 两级 children 均为空数组，且不带 projects 字段", async () => {
    readSchemes.mockResolvedValue([
      { name: "父", updatedAt: "p0", children: [{ name: "子", updatedAt: "c0" }] }
    ]);
    const res = directResponse();
    await handleV1SchemesHierarchy({ url: directUrl(""), request: V1_JSON_HEADERS, response: res });
    expect(res.statusCode).toBe(200);
    expect(res.jsonBody().data.nodes).toEqual([
      { name: "父", updatedAt: "p0", children: [{ name: "子", updatedAt: "c0", children: [] }] }
    ]);
    expect(Object.keys(res.jsonBody().data.nodes[0])).not.toContain("projects");
  });
});

describe("handleV1SchemeModels 直调：49 行 children 兜底 + 91 行 projects 兜底 + catch", () => {
  afterEach(() => {
    readSchemes.mockReset();
    readSchemes.mockImplementation(actualServer.readSchemes);
  });

  // 49 行 `current = found.children ?? []`：只有当「首段命中」后**还要继续找第二段**
  // 且首段叶子没有 children 键时，这个兜底才承重 —— 去掉它，`current.find` 会在
  // undefined 上抛 TypeError，404 变成 500。
  test("首段是叶子且无 children 键 + 两段路径 → 404 而非 500（children ?? [] 承重）", async () => {
    readSchemes.mockResolvedValue([{ name: "叶子", updatedAt: "t0" }]);
    const res = directResponse();
    await handleV1SchemeModels({
      url: directUrl(`schemePath=${encodeSchemePath(["叶子", "子"])}`),
      request: V1_JSON_HEADERS,
      response: res
    });
    expect(res.statusCode).toBe(404);
    expect(res.jsonBody()).toEqual({ ok: false, error: { code: "not-found", message: "方案不存在。" } });
  });

  test("单段路径命中无 children 键的方案 → 200（对照：兜底不改变命中结果）", async () => {
    readSchemes.mockResolvedValue([{ name: "叶子", updatedAt: "t0" }]);
    const res = directResponse();
    await handleV1SchemeModels({
      url: directUrl(`schemePath=${encodeSchemePath(["叶子"])}`),
      request: V1_JSON_HEADERS,
      response: res
    });
    expect(res.statusCode).toBe(200);
  });

  // 91 行 `(scheme.projects ?? [])`
  test("命中的方案缺 projects 键 → models 为空数组", async () => {
    readSchemes.mockResolvedValue([{ name: "方案A", updatedAt: "t0", children: [] }]);
    const res = directResponse();
    await handleV1SchemeModels({
      url: directUrl(`schemePath=${encodeSchemePath(["方案A"])}`),
      request: V1_JSON_HEADERS,
      response: res
    });
    expect(res.statusCode).toBe(200);
    expect(res.jsonBody().data.models).toEqual([]);
  });

  // 93 行 catch
  test("readSchemes 抛普通 Error → 500 internal 且 message 取 error.message", async () => {
    readSchemes.mockRejectedValue(new Error("读盘炸了"));
    const res = directResponse();
    await handleV1SchemeModels({
      url: directUrl(`schemePath=${encodeSchemePath(["方案A"])}`),
      request: V1_JSON_HEADERS,
      response: res
    });
    expect(res.statusCode).toBe(500);
    expect(res.jsonBody()).toEqual({ ok: false, error: { code: "internal", message: "读盘炸了" } });
  });

  test("readSchemes 抛非 Error → 500 internal 且落默认文案「后端处理失败。」", async () => {
    // ★ 抛字符串而非 Error：只断 500/code 恒绿（两条路径都是 500 internal），
    // 真正判别力在 message —— 这里必须是默认文案，而不是 String(原因)。
    readSchemes.mockRejectedValue("裸字符串原因");
    const res = directResponse();
    await handleV1SchemeModels({
      url: directUrl(`schemePath=${encodeSchemePath(["方案A"])}`),
      request: V1_JSON_HEADERS,
      response: res
    });
    expect(res.statusCode).toBe(500);
    expect(res.jsonBody().error.message).toBe("后端处理失败。");
  });
});

describe("handleV1ModelJson 直调：152 行 catch", () => {
  afterEach(() => {
    readSchemeProjectRecord.mockReset();
    readSchemeProjectRecord.mockImplementation(actualServer.readSchemeProjectRecord);
  });

  test("readSchemeProjectRecord 抛普通 Error → 500 internal 且 message 取 error.message", async () => {
    readSchemeProjectRecord.mockRejectedValue(new Error("模型文件读取失败"));
    const res = directResponse();
    await handleV1ModelJson({
      url: directUrl(`schemePath=${encodeSchemePath(["方案A"])}&name=m1`),
      request: V1_JSON_HEADERS,
      response: res
    });
    expect(res.statusCode).toBe(500);
    expect(res.jsonBody()).toEqual({ ok: false, error: { code: "internal", message: "模型文件读取失败" } });
  });

  test("readSchemeProjectRecord 抛非 Error → 500 internal 且落默认文案「后端处理失败。」", async () => {
    readSchemeProjectRecord.mockRejectedValue({ weird: true });
    const res = directResponse();
    await handleV1ModelJson({
      url: directUrl(`schemePath=${encodeSchemePath(["方案A"])}&name=m1`),
      request: V1_JSON_HEADERS,
      response: res
    });
    expect(res.statusCode).toBe(500);
    expect(res.jsonBody().error.message).toBe("后端处理失败。");
  });
});

describe("handleV1SchemeExport 直调：118 行非 Error 兜底", () => {
  afterEach(() => {
    createSchemeArchiveBuffer.mockReset();
    createSchemeArchiveBuffer.mockImplementation(actualServer.createSchemeArchiveBuffer);
  });

  // 118 行 `error instanceof Error ? error.message : "导出方案失败。"`
  // 附带结论：同 catch 里 119 行的 `message.includes("缺少方案路径")` 在**本 handler 上不可达**。
  // 100-104 行已先 `requireSchemePath(parts)` 拦掉空数组/非数组；能走到 108 行时 parts 必是非空数组，
  // 而 createSchemeArchiveBuffer 内部只有两种抛法：schemePath.length===0 → 「缺少方案路径。」，
  // 非数组 → 「必须是方案路径数组…」。两者都被上游守卫排除，所以那句 includes 恒为 false。
  // （handlers.test.mjs 里那条「抛缺少路径返 400」是靠 mock 绕过守卫才走到的，不构成可达性证据。）
  test("createSchemeArchiveBuffer 抛非 Error → 500 internal 且 message 为「导出方案失败。」", async () => {
    createSchemeArchiveBuffer.mockRejectedValue("裸字符串原因");
    const res = directResponse();
    await handleV1SchemeExport({ url: directUrl(`schemePath=${encodeSchemePath(["方案A"])}`), response: res });
    expect(res.statusCode).toBe(500);
    expect(res.jsonBody()).toEqual({ ok: false, error: { code: "internal", message: "导出方案失败。" } });
  });

  test("createSchemeArchiveBuffer 抛普通 Error → 500 internal 且 message 取 error.message（对照）", async () => {
    createSchemeArchiveBuffer.mockRejectedValue(new Error("模型“m1”E 文件生成失败"));
    const res = directResponse();
    await handleV1SchemeExport({ url: directUrl(`schemePath=${encodeSchemePath(["方案A"])}`), response: res });
    expect(res.statusCode).toBe(500);
    expect(res.jsonBody().error.message).toBe("模型“m1”E 文件生成失败");
  });
});
