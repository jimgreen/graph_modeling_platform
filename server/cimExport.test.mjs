// /webgrp/v1/schemes/model/cim-xml 适配层测试：
// 1) 单元：直载 src/cim/cim-export.ts（Node 原生 TS）验证 buildCimXml 纯函数；
// 2) 集成：GRAPH_MODEL_DATA_DIR 指向 tmpdir 种子数据 → 起真实 server（端口 0）→ 400/404/200/strict 全链路。
import { describe, expect, test, beforeAll, afterAll, vi } from "vitest";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { installDomShim } from "./domShim.mjs";
import { apiPath } from "./config.mjs";
import { encodeSchemePath } from "./schemePath.mjs";

installDomShim();

const cimXmlPath = apiPath("/v1/schemes/model/cim-xml");

// 故障注入：只让「崩溃模型.json」这一个文件的 readFile 抛 EACCES。
//
// 目的：打通 handleV1ModelCimXml 自己的 catch → sendV1Error(response, "internal", …)
// 这条 500 路径。此前本文件只在 HTTP 层走过 400/404/200，catch 分支零覆盖 ——
// 而它一旦失守，后端异常会变成未捕获 rejection（崩进程）或被上层兜成别的 code。
//
// 注入方式沿用 server/projectLookupReadFailure.test.mjs：Windows 上 chmod 不可移植，
// 故按**文件名**精确注入，避免误伤同目录其它模型与 server 自身的读盘。
// 注意 server.mjs 的 readFile 来自 node:fs/promises（不是 node:fs），故 mock 该入口。
const UNREADABLE_MODEL = "崩溃模型";
vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    readFile: async (file, ...rest) => {
      if (String(file).endsWith(`${UNREADABLE_MODEL}.json`)) {
        const error = new Error(`EACCES: permission denied, open '${file}'`);
        error.code = "EACCES";
        throw error;
      }
      return actual.readFile(file, ...rest);
    }
  };
});

// —— 单元：buildCimXml 纯函数 ——
describe("CIM/XML 后端生成", () => {
  test("可直载 src/cim/cim-export.ts", async () => {
    const mod = await import("../src/cim/cim-export.ts");
    expect(typeof mod.buildCimXml).toBe("function");
  });

  test("空模型生成最小 XML 且含 cim 命名空间", async () => {
    const { buildCimXml } = await import("../src/cim/cim-export.ts");
    const xml = buildCimXml([], [], "测试模型", "m1");
    expect(xml).toContain("<cim:");
    expect(xml.startsWith("<?xml")).toBe(true);
  });

  test("母排节点进入 CIM 模型", async () => {
    const { buildCimXml } = await import("../src/cim/cim-export.ts");
    const nodes = [{
      id: "n1",
      kind: "busbar",
      position: { x: 0, y: 0 },
      size: { width: 100, height: 20 },
      params: { name: "母线1", vbase: "10" },
      terminals: []
    }];
    const xml = buildCimXml(nodes, [], "测试模型", "m1");
    expect(xml.length).toBeGreaterThan(100);
  });
});

// —— 集成：真实 server + tmpdir 种子数据 ——
let dataDir;
let server;
let baseUrl;
let createImageServer;

const busbar = (id, name, params) => ({
  id,
  kind: "ac-bus",
  name,
  position: { x: 0, y: 0 },
  size: { width: 100, height: 20 },
  rotation: 0,
  scale: 1,
  terminals: [],
  params: { name, ...params }
});

beforeAll(async () => {
  dataDir = mkdtempSync(join(tmpdir(), "cim-export-"));
  const seed = (scheme, name, project) => {
    const dir = join(dataDir, "schemes", "files", scheme);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, `${name}.json`), JSON.stringify(project), "utf-8");
  };
  seed("测试方案", "完整模型", {
    name: "完整模型",
    nodes: [busbar("bus1", "母线1", { i_vbase: "110" })],
    edges: []
  });
  seed("测试方案", "缺参数模型", {
    name: "缺参数模型",
    nodes: [busbar("bus2", "母线2", {})],
    edges: []
  });
  // 下面三个是 modelId 解析链的样本：三种序号状态各一个。
  // resolveModelId 的回落是 覆盖参数 > project.idx > 模型名，既有模型一个都没覆盖到。
  seed("测试方案", "无序号模型 A B", {
    name: "无序号模型 A B",
    nodes: [busbar("bus3", "母线3", { i_vbase: "110" })],
    edges: []
  });
  seed("测试方案", "带序号模型", {
    name: "带序号模型",
    idx: 777,
    nodes: [busbar("bus4", "母线4", { i_vbase: "110" })],
    edges: []
  });
  seed("测试方案", "零号序号模型", {
    name: "零号序号模型",
    idx: 0,
    nodes: [busbar("bus5", "母线5", { i_vbase: "110" })],
    edges: []
  });
  seed("测试方案", "中文序号模型", {
    name: "中文序号模型",
    idx: "厂站一",
    nodes: [busbar("bus6", "母线6", { i_vbase: "110" })],
    edges: []
  });
  // 空名 + 无 idx ⇒ resolveModelId 最后一级回落 "current"。
  // 文件名是按 URL 的 name 参数找的，所以这里 name 仍要传一个能命中的串，
  // 只是记录里的 name 字段留空（模拟外部系统写进来的残缺模型）。
  seed("测试方案", "空名模型", {
    name: "",
    nodes: [busbar("bus7", "母线7", { i_vbase: "110" })],
    edges: []
  });
  // 故障注入靶子：文件正常存在（stat 命中、精确路径就找到），只在 readFile 抛 EACCES。
  // 这样出错点在「读模型内容」这一步，而不是「找不到模型」——后者是 404 不是 500。
  seed("测试方案", UNREADABLE_MODEL, {
    name: UNREADABLE_MODEL,
    nodes: [busbar("bus8", "母线8", { i_vbase: "110" })],
    edges: []
  });
  seed("测试方案", "纯静态模型", {
    name: "纯静态模型",
    nodes: [{
      id: "s1",
      kind: "static-text",
      name: "标注",
      position: { x: 0, y: 0 },
      size: { width: 10, height: 10 },
      rotation: 0,
      scale: 1,
      terminals: [],
      params: {}
    }],
    edges: []
  });
  process.env.GRAPH_MODEL_DATA_DIR = dataDir;
  ({ createImageServer } = await import("./server.mjs"));
  server = await createImageServer({ port: 0, host: "127.0.0.1" });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

afterAll(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  delete process.env.GRAPH_MODEL_DATA_DIR;
  rmSync(dataDir, { recursive: true, force: true });
});

const schemePath = encodeSchemePath(["测试方案"]);

describe(`${cimXmlPath} 参数校验与错误路径`, () => {
  test("缺 schemePath → 400 bad-request", async () => {
    const res = await fetch(`${baseUrl}${cimXmlPath}?name=${encodeURIComponent("完整模型")}`);
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("bad-request");
  });

  test("缺 name → 400 bad-request", async () => {
    const res = await fetch(`${baseUrl}${cimXmlPath}?schemePath=${schemePath}`);
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("bad-request");
  });

  test("模型不存在 → 404 not-found", async () => {
    const res = await fetch(
      `${baseUrl}${cimXmlPath}?schemePath=${schemePath}&name=${encodeURIComponent("不存在的模型")}`
    );
    expect(res.status).toBe(404);
    expect((await res.json()).error.code).toBe("not-found");
  });

  test("只有 static-* 节点 → 400 无可导出的电力设备", async () => {
    const res = await fetch(
      `${baseUrl}${cimXmlPath}?schemePath=${schemePath}&name=${encodeURIComponent("纯静态模型")}`
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error.message).toContain("电力设备");
  });
});

describe(`${cimXmlPath} 正路径与 strict 语义`, () => {
  test("完整模型导出 XML（attachment + 模型名.xml 文件名）", async () => {
    const res = await fetch(
      `${baseUrl}${cimXmlPath}?schemePath=${schemePath}&name=${encodeURIComponent("完整模型")}`
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/xml");
    // 2026-09-13 起去掉 _CIM16 后缀，与前端落盘名同规则（单源 cimFilename）
    expect(res.headers.get("content-disposition")).toContain(".xml");
    expect(res.headers.get("content-disposition")).not.toContain("_CIM16");
    const text = await res.text();
    expect(text.startsWith("<?xml")).toBe(true);
    expect(text).toContain("<cim:");
    expect(text).toContain("BusbarSection");
  });

  test("modelId 覆盖默认 idx → 输出 SUB_<modelId>", async () => {
    const res = await fetch(
      `${baseUrl}${cimXmlPath}?schemePath=${schemePath}&name=${encodeURIComponent("完整模型")}&modelId=my-model-1`
    );
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain('rdf:ID="SUB_my-model-1"');
  });

  test("strict=1 且参数齐全 → 200", async () => {
    const res = await fetch(
      `${baseUrl}${cimXmlPath}?schemePath=${schemePath}&name=${encodeURIComponent("完整模型")}&strict=1`
    );
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("<cim:");
  });

  test("strict=1 且缺关键参数 → 400 关键参数缺失", async () => {
    const res = await fetch(
      `${baseUrl}${cimXmlPath}?schemePath=${schemePath}&name=${encodeURIComponent("缺参数模型")}&strict=1`
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("bad-request");
    expect(body.error.message).toContain("关键参数缺失");
  });

  test("缺参数模型非 strict → 默认导出 200", async () => {
    const res = await fetch(
      `${baseUrl}${cimXmlPath}?schemePath=${schemePath}&name=${encodeURIComponent("缺参数模型")}`
    );
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("<cim:");
  });
});

// ─── modelId 解析链（resolveModelId）─────────────────────────
//
// modelId 决定 CIM 里每个 rdf:ID 的前缀（既有用例可见形如 `SUB_my-model-1`）。
// 三级回落：query 覆盖 > project.idx > 模型名，最后卫生化成 NCName 安全字符。
// 写错不报错 —— 只是产出的 RDF 标识符不对，而 CIM 消费方靠它做跨系统对齐，
// 对不上就是静默的数据错位。
//
// 既有种子模型全都没有 idx 字段，所以前两级回落从未被走到过。
describe(`${cimXmlPath} modelId 解析链`, () => {
  const fetchXml = async (name, extra = "") => {
    const res = await fetch(
      `${baseUrl}${cimXmlPath}?schemePath=${schemePath}&name=${encodeURIComponent(name)}${extra}`
    );
    expect(res.status).toBe(200);
    return res.text();
  };

  test("无 idx 时回落到模型名，非法字符卫生化成下划线", async () => {
    const xml = await fetchXml("无序号模型 A B");
    // 探针实测：无序号模型 A B ⇒ SUB_______A_B
    // （「无序号模型」5 个 CJK + 1 个空格 + 「A」+ 1 个空格 + 「B」⇒ 7 个下划线 + A_B）
    expect(xml).toContain('rdf:ID="SUB_______A_B"');
  });

  test("有 idx 时用 idx，不回落模型名", async () => {
    const xml = await fetchXml("带序号模型");
    expect(xml).toContain('rdf:ID="SUB_777"');
    expect(xml).not.toContain("SUB_带序号模型");
  });

  test("modelId 查询参数覆盖 project.idx", async () => {
    const overridden = await fetchXml("带序号模型", "&modelId=999");
    expect(overridden).toContain('rdf:ID="SUB_999"');
    expect(overridden).not.toContain("777");
  });

  test("modelId 为纯空白时视为未指定（回落 idx）", async () => {
    const xml = await fetchXml("带序号模型", "&modelId=%20%20");
    expect(xml).toContain('rdf:ID="SUB_777"');
  });

  test("idx 为 0 算有效序号（`!== undefined && !== null` 不拦 0）", async () => {
    // 记录现状而非期望：0 作为模型序号没有实际意义，但代码确实接受它（探针实测 SUB_0）。
    // 若哪天改成拦 0，这条会红 —— 那时该同步更新断言，而不是让守卫失效。
    const xml = await fetchXml("零号序号模型");
    expect(xml).toContain('rdf:ID="SUB_0"');
  });

  test("中文 idx 被卫生化，不产生非法 NCName", async () => {
    const xml = await fetchXml("中文序号模型");
    // 「厂站一」3 个 CJK ⇒ 3 个下划线（探针实测 SUB____）
    expect(xml).toContain('rdf:ID="SUB____"');
    expect(xml).not.toContain("厂站一");
  });

  test("卫生化后仍以合法字符开头（NCName 不能以数字开头的情况也不会出现）", async () => {
    // 正则只保留 A-Za-z0-9_.- ，若 modelId 全是被替换掉的字符，会得到纯下划线串 ——
    // 那仍是合法 NCName（XML NCName 允许下划线开头）。
    const xml = await fetchXml("中文序号模型");
    for (const id of xml.match(/rdf:ID="([^"]+)"/g) || []) {
      const value = id.slice('rdf:ID="'.length, -1);
      expect(value).not.toMatch(/[^A-Za-z0-9_.-]/);
    }
  });

  // 空名 + 无 idx 这条：探针实测产出的仍是 SUB_____（模型名的卫生化结果），
  // **不是** current —— 因为 resolveModelId 的第三级回落用的是 `buildCimForSavedModel`
  // 传进来的 `name`（URL 参数），不是记录里的 project.name。
  // 换句话说 `|| "current"` 那一级经这条路径**不可达**。
  //
  // 保留这条是为了钉住「空名不会产出空标识符」这个真契约：
  // 若哪天把卫生化改成产出空串，这里会红。
  test("空名且无 idx ⇒ 仍产出合法标识符（回落的是 URL name 而非 current）", async () => {
    const xml = await fetchXml("空名模型");
    expect(xml).toMatch(/rdf:ID="SUB_[A-Za-z0-9_.-]+"/);
    // 记录里的 name 是空串，所以 modelId 来自 URL 的 name 参数「空名模型」
    // 探针实测：SUB_____（4 个 CJK + 1 个下划线）
    expect(xml).toContain('rdf:ID="SUB_____"');
  });

  test("`|| current` 那级经本路径不可达（记录实情，不是期望行为）", async () => {
    // resolveModelId 的第三级是 `|| name`，而 name 在 buildCimForSavedModel 里恒为
    // URL 参数（非空，缺 name 早在 400 就拒了）。所以 `|| "current"` 要触发得
    // name 也是空串 —— 但那时请求根本到不了这里。
    //
    // 探针验证：用 name="" 直接调 buildCimForSavedModel（绕过 400 校验），
    // 产出的仍是 SUB____（来自 project.name ?? name 的兜底）而非 current。
    // 即便如此，三级链在真实请求路径上永不落空 ⇒ 绿是正确结果。
    const xml = await fetchXml("空名模型");
    expect(xml).not.toContain('rdf:ID="SUB_current"');
    expect(xml).not.toContain('rdf:ID="SUB_"');
  });
});

// ─── 200 响应头契约（cache-control / CORS / content-disposition）───────────
//
// 此前本文件只断言了 content-type 与 content-disposition 的两个片段，
// writeHead 里另外三项（no-store、CORS 单头、filename* 编码形式）零覆盖。
// 这几项都不是装饰：no-store 决定导出件会不会被中间缓存留存，
// filename* 决定浏览器落盘的文件名是不是乱码。
describe(`${cimXmlPath} 200 响应头`, () => {
  const fetchHeaders = async (name, init) => {
    const res = await fetch(
      `${baseUrl}${cimXmlPath}?schemePath=${schemePath}&name=${encodeURIComponent(name)}`,
      init
    );
    expect(res.status).toBe(200);
    return res.headers;
  };

  test("cache-control 含 no-store（导出件不入任何缓存）", async () => {
    const headers = await fetchHeaders("完整模型");
    expect(headers.get("cache-control")).toContain("no-store");
  });

  test("带 Origin 头请求：allow-origin 是固定值 `*`，不回显请求的 Origin", async () => {
    // 本仓口径与「回显 Origin」不同：cors.mjs 的 accessControlOriginOnly 是**常量** `*`，
    // handler 里 ...accessControlOriginOnly 直接展开，从不读请求头。
    // 故断言按源码真实行为写：回显这条期望不成立，钉住的是「取值与请求 Origin 无关」。
    const headers = await fetchHeaders("完整模型", { headers: { origin: "http://example.com:5173" } });
    expect(headers.get("access-control-allow-origin")).toBe("*");
    expect(headers.get("access-control-allow-origin")).not.toContain("example.com");
  });

  test("不带 Origin 头请求：仍回同一组 CORS 头，且附件端点只带 allow-origin 单头", async () => {
    const withOrigin = await fetchHeaders("完整模型", { headers: { origin: "http://example.com:5173" } });
    const withoutOrigin = await fetchHeaders("完整模型");
    // 取值与上一条完全一致 ⇒ 该头不是按请求回显的。
    // 注意这里必须独立断言 `*`：只断言「两次相等」的话，把该头整个删掉时
    // 两边都是 null 依然相等 —— 那条断言就恒绿了（实测：删掉头展开只红 1 条）。
    expect(withoutOrigin.get("access-control-allow-origin")).toBe("*");
    expect(withoutOrigin.get("access-control-allow-origin"))
      .toBe(withOrigin.get("access-control-allow-origin"));
    // 附件下载端点刻意只带 allow-origin（accessControlOriginOnly）：
    // methods / allow-headers 对 GET 下载无意义，带上反而误导跨源调用方去发预检。
    // 换成全量 accessControlHeaders 会让这一条转红。
    expect(withoutOrigin.get("access-control-allow-methods")).toBeNull();
    expect(withoutOrigin.get("access-control-allow-headers")).toBeNull();
  });

  test("中文模型名走 filename*=UTF-8'' 形式，且解码后还原出中文原名", async () => {
    const headers = await fetchHeaders("完整模型");
    const disposition = headers.get("content-disposition");
    expect(disposition).toContain("attachment;");
    expect(disposition).toContain("filename*=UTF-8''");
    const star = disposition.match(/filename\*=UTF-8''([^;]+)/u)?.[1];
    expect(star).toBeTruthy();
    // 百分号编码：段内只剩可打印 ASCII，不含裸中文。
    // 若哪天改成裸中文直出（`filename*=UTF-8''完整模型.xml`），这条会红 ——
    // 裸非 ASCII 放在 HTTP 头里不合法，Node 侧也可能直接拒发。
    expect(star).not.toMatch(/[^\x21-\x7e]/u);
    expect(star).toContain("%E5%AE%8C"); // 「完」的 UTF-8 百分号编码
    expect(decodeURIComponent(star)).toBe("完整模型.xml");
  });

  test("模型名含空格时 filename* 段把空格编码成 %20（解码后空格还原）", async () => {
    // 空格是「百分号编码真的跑了」的判别输入：cimFilename 保留空格（只替非法字符），
    // 而 encodeURIComponent 把它变 %20。若哪天只对非 ASCII 编码，空格会裸露出来。
    const headers = await fetchHeaders("无序号模型 A B");
    const star = headers.get("content-disposition").match(/filename\*=UTF-8''([^;]+)/u)[1];
    expect(star).toContain("%20A%20B");
    expect(decodeURIComponent(star)).toBe("无序号模型 A B.xml");
  });

  test("filename= 回落项也是百分号编码（记录实情：非 RFC 6266 的裸 ASCII 回落）", async () => {
    const headers = await fetchHeaders("完整模型");
    const disposition = headers.get("content-disposition");
    const plain = disposition.match(/;\s*filename="([^"]*)"/u)?.[1];
    expect(plain).toBeTruthy();
    // 记录实情而非期望：回落项同样走了 encodeURIComponent，于是不认 filename* 的老客户端
    // 会把文件存成 `%E5%AE%8C...xml` 而不是中文名。改这里等于改行为（对外可见的落盘名），
    // 故只钉住现状：两条路径解码后必须一致，且都不是裸非 ASCII。
    expect(plain).not.toMatch(/[^\x21-\x7e]/u);
    const star = disposition.match(/filename\*=UTF-8''([^;]+)/u)[1];
    expect(decodeURIComponent(plain)).toBe(decodeURIComponent(star));
  });
});

// ─── 500 分支：导出过程抛错 → sendV1Error(response, "internal", …) ──────────
//
// handler 的 catch 是本端点唯一的兜底：读盘失败、XML 生成抛错都在这里收口。
// 失守的后果不是「返回体难看」而是未捕获 rejection 崩进程，所以这条必须有守卫。
describe(`${cimXmlPath} 导出抛错的 500 分支`, () => {
  test("注入读盘失败 → 500 且走 internal 信封（不是 200 也不是 404）", async () => {
    const res = await fetch(
      `${baseUrl}${cimXmlPath}?schemePath=${schemePath}&name=${encodeURIComponent(UNREADABLE_MODEL)}`
    );
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.ok).toBe(false);
    // 钉住 sendV1Error 的第三个参数是 "internal"：errorCodeStatus 把它映成 500。
    // 若改成 not-found / bad-request，状态码会变，这条与上面那条一起红。
    expect(body.error.code).toBe("internal");
    // message 透传原始 Error.message，出错点是读模型文件那一步（server.mjs 的
    // readSchemeProjectFile：非 ENOENT 一律上抛，不降级成「模型不存在」）。
    expect(body.error.message).toContain("模型文件读取失败");
  });

  test("500 响应换成 v1 信封头：JSON + no-store，且不带附件下载头", async () => {
    const res = await fetch(
      `${baseUrl}${cimXmlPath}?schemePath=${schemePath}&name=${encodeURIComponent(UNREADABLE_MODEL)}`
    );
    expect(res.status).toBe(500);
    // 走的是 v1Response 的 v1NoStoreJsonHeaders，不是 handler 里那条附件头 ——
    // 两者 content-type 与 content-disposition 的有无都不同，故可区分走的是哪条路。
    expect(res.headers.get("content-type")).toContain("application/json");
    expect(res.headers.get("content-type")).not.toContain("application/xml");
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(res.headers.get("content-disposition")).toBeNull();
    // 错误路径不得漏出半截 XML
    expect(await res.text()).not.toContain("<cim:");
  });
});
