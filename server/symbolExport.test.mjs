// 图元 Symbol 后端导出：kind 归一化契约 + 合成结果不变量 + HTTP 端到端。
//
// 断言口径刻意避开「某个图元的具体几何」——图元库会随用户保存工程重写，
// 钉死坐标/尺寸的断言必然失效。这里只断言**关系与结构不变量**。
import { describe, expect, test, beforeAll, afterAll, vi } from "vitest";
import AdmZip from "adm-zip";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createImageServer } from "./server.mjs";
import { apiPath } from "./config.mjs";
import {
  MAX_SYMBOL_EXPORT_KINDS,
  normalizeSymbolExportKinds,
  renderStandaloneSymbolExportZip,
  renderSymbolExportSvg
} from "./symbolExport.mjs";

describe("normalizeSymbolExportKinds", () => {
  test("去空白、去重、保持入参顺序", () => {
    expect(
      normalizeSymbolExportKinds([" ac-breaker ", "ac-breaker", "", "   ", "ac-bus", null, "ac-bus"])
    ).toEqual(["ac-breaker", "ac-bus"]);
  });

  test("非数组一律归零，不抛错", () => {
    expect(normalizeSymbolExportKinds(undefined)).toEqual([]);
    expect(normalizeSymbolExportKinds(null)).toEqual([]);
    expect(normalizeSymbolExportKinds("ac-breaker")).toEqual([]);
    expect(normalizeSymbolExportKinds({ kinds: ["ac-breaker"] })).toEqual([]);
  });
});

// summarizeKinds 的阈值是默认形参 limit = 5，判据是 kinds.length > limit（严格大于）。
// 故「恰好 5 个」不截断、「6 个」才截断 —— 这两条必须成对存在，少任何一条都钉不住 < 与 <= 的差别。
// 文案里的 N 是**总数**（kinds.length），不是「总数 - 阈值」的差值。
// 驱动方式：未知 kind 全量落进 missingKinds，走 template-not-found 那句 summarizeKinds(missingKinds)。
describe("summarizeKinds 截断文案边界", () => {
  const unknownKinds = (count) => Array.from({ length: count }, (_, index) => `missing-kind-${index}`);

  test("未知 kind 恰好 5 个（等于阈值）不出现截断文案，五个 kind 全部列出", async () => {
    const kinds = unknownKinds(5);
    const result = await renderSymbolExportSvg({ kinds });
    expect(result.error?.code).toBe("template-not-found");
    const message = result.error?.message ?? "";
    // 截断文案形如「a、b 等 6 个」；此处一个都不该出现
    expect(message).not.toContain(" 等 ");
    expect(message).not.toMatch(/等\s*\d+\s*个/u);
    // 反向确认不是「因为没列全所以看起来没截断」：五个 kind 都得在文案里
    for (const kind of kinds) {
      expect(message).toContain(kind);
    }
  });

  test("未知 kind 比阈值多 1 个（6 个）才出现等 N 个文案，且 N 是总数", async () => {
    const result = await renderSymbolExportSvg({ kinds: unknownKinds(6) });
    expect(result.error?.code).toBe("template-not-found");
    const message = result.error?.message ?? "";
    expect(message).toContain(" 等 6 个");
    // N 取 kinds.length（总数）。若误写成 kinds.length - limit，这里会变成「等 1 个」。
    expect(message).not.toContain(" 等 1 个");
    // 恰好多 1 个这条与上面「恰好 5 个不截断」成对：把 > 改成 >= 会让后者红
    expect(message).toContain("missing-kind-4");
  });

  test("未知 kind 远大于阈值（12 个）时 N 仍等于总数", async () => {
    const result = await renderSymbolExportSvg({ kinds: unknownKinds(12) });
    expect(result.error?.code).toBe("template-not-found");
    const message = result.error?.message ?? "";
    expect(message).toContain(" 等 12 个");
    expect(message).not.toContain(" 等 7 个");
    // 前 5 个照常列出（排障要能看到具体是哪些 kind），第 6 个起被折叠
    for (const kind of unknownKinds(5)) {
      expect(message).toContain(kind);
    }
    expect(message).not.toContain("missing-kind-5");
  });

  test("kind 数量为 0 或列表全空白一律按 invalid-request 拒绝，不落到摘要分支", async () => {
    for (const kinds of [[], ["  ", "", null], undefined, null, "ac-breaker"]) {
      const result = await renderSymbolExportSvg({ kinds });
      expect(result.error?.code).toBe("invalid-request");
      expect(result.error?.message).toBe("请至少选择一个要导出的图元。");
      // 空列表进 summarizeKinds 会拼出空串再跟一个「等 0 个」；此处根本不该出现摘要形态
      expect(result.error?.message ?? "").not.toMatch(/等\s*\d+\s*个/u);
    }
  });
});

describe("renderSymbolExportSvg", () => {
  test("空选择与超出上限都按 invalid-request 拒绝", async () => {
    await expect(renderSymbolExportSvg({ kinds: [] })).resolves.toMatchObject({
      error: { code: "invalid-request" }
    });
    const tooMany = Array.from({ length: MAX_SYMBOL_EXPORT_KINDS + 1 }, (_, index) => `k-${index}`);
    const result = await renderSymbolExportSvg({ kinds: tooMany });
    expect(result.error?.code).toBe("invalid-request");
    // 报错要带上实际数量，否则用户不知道超了多少
    expect(result.error?.message).toContain(String(tooMany.length));
  });

  test("未知 kind → template-not-found，并点名具体 kind（排障要点）", async () => {
    const result = await renderSymbolExportSvg({ kinds: ["definitely-not-a-kind"] });
    expect(result.error?.code).toBe("template-not-found");
    expect(result.error?.message).toContain("definitely-not-a-kind");
  });

  test("部分 kind 缺失不中断整次导出，missingKinds 单列（与 skippedKinds 分离）", async () => {
    const result = await renderSymbolExportSvg({ kinds: ["ac-breaker", "nope-kind"] });
    expect(result.error).toBeUndefined();
    expect(result.exportedKinds).toEqual(["ac-breaker"]);
    expect(result.missingKinds).toEqual(["nope-kind"]);
    expect(result.skippedKinds).toEqual([]);
  });

  test("硬约束：defs 下只允许 symbol；顶层除正文 use 网格外无其它元素", async () => {
    const result = await renderSymbolExportSvg({ kinds: ["ac-breaker", "ac-bus"] });
    expect(result.error).toBeUndefined();
    expect(result.symbolCount).toBeGreaterThan(0);

    // defs 下只允许 symbol：把 symbol 块整段剥掉后 defs 内应只剩空白。
    // （不能直接对 defs 正文提标签名——symbol 内部本来就有 g/title/line/path 等嵌套元素。）
    const defsBody = result.svg.slice(
      result.svg.indexOf("<defs>") + "<defs>".length,
      result.svg.lastIndexOf("</defs>")
    );
    expect(defsBody.replace(/<symbol\b[\s\S]*?<\/symbol>/gu, "").trim()).toBe("");

    // 顶层判据：剥掉 symbol / style / 网格层后，除根 svg 与 defs 外壳外不应残留任何元素。
    const shell = result.svg
      .replace(/<symbol\b[\s\S]*?<\/symbol>/gu, "")
      .replace(/<style\b[\s\S]*?<\/style>/gu, "")
      .replace(/<g id="Symbol_Overview_Layer">[\s\S]*?<\/g>/u, "")
      .replace(/<\/?svg\b[^>]*>/gu, "")
      .replace(/<\/?defs>/gu, "")
      .trim();
    expect(shell).toBe("");

    // 正文网格层：每图元一个 use，顺序与请求一致（ac-breaker 在前、ac-bus 在后）。
    const overview = /<g id="Symbol_Overview_Layer">[\s\S]*?<\/g>/u.exec(result.svg)?.[0] ?? "";
    const uses = Array.from(overview.matchAll(/<use\b[^>]*href="#([^"]+)"/gu)).map((match) => match[1]);
    expect(uses).toHaveLength(2);
    expect(uses[0]).toContain("_ac-breaker_state_1"); // 默认状态（合），与原始正文 <use> 同口径
    expect(uses[1]).toContain("ac-bus");
  });

  test("viewBox 全部归一化为 0,0,width,height（不得残留以原点为中心的负偏移）", async () => {
    const result = await renderSymbolExportSvg({ kinds: ["ac-breaker", "ac-bus"] });
    expect(result.svg.match(/viewBox="(?!0,0,)[^"]*"/gu) ?? []).toEqual([]);
    expect(result.svg).toMatch(/viewBox="0,0,[\d.]+,[\d.]+"/u);
  });

  test("多状态图元逐状态各产出一个 symbol，且两态正文不同（开/合不能同形）", async () => {
    const result = await renderSymbolExportSvg({ kinds: ["ac-breaker"] });
    expect(result.error).toBeUndefined();
    expect(result.exportedKinds).toEqual(["ac-breaker"]);

    const symbols = Array.from(result.svg.matchAll(/<symbol\b[\s\S]*?<\/symbol>/gu), (match) => match[0]);
    expect(symbols.length).toBe(result.symbolCount);
    expect(symbols.length).toBeGreaterThanOrEqual(2);
    const ids = symbols.map((markup) => /\bid\s*=\s*"([^"]*)"/u.exec(markup)?.[1]);
    expect(new Set(ids).size).toBe(ids.length);
    expect(symbols[0]).not.toBe(symbols[1]);
  });

  test("fileName 是可直接落盘的 svg 文件名", async () => {
    const result = await renderSymbolExportSvg({ kinds: ["ac-breaker"] });
    expect(result.fileName).toMatch(/^component-symbols-\d{8}-\d{6}\.svg$/u);
  });
});

describe(`HTTP POST ${apiPath("/symbol-export")}`, () => {
  let server;
  let baseUrl;

  beforeAll(async () => {
    server = await createImageServer({ port: 0, host: "127.0.0.1" });
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  });

  afterAll(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  const post = (payload) =>
    fetch(`${baseUrl}${apiPath("/symbol-export")}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });

  test("合法请求返回 200 与 svg 载荷、统计字段", async () => {
    const response = await post({ kinds: ["ac-breaker"] });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.symbolCount).toBeGreaterThanOrEqual(2);
    expect(body.exportedKinds).toEqual(["ac-breaker"]);
    expect(body.svg).toContain("<style");
    expect(body.svg).toContain("<defs>");
    expect(body.fileName).toMatch(/\.svg$/u);
  });

  test("空选择 → 400 invalid-request；未知 kind → 404 template-not-found", async () => {
    const empty = await post({ kinds: [] });
    expect(empty.status).toBe(400);
    expect((await empty.json()).error.code).toBe("invalid-request");

    const missing = await post({ kinds: ["no-such-kind"] });
    expect(missing.status).toBe(404);
    expect((await missing.json()).error.code).toBe("template-not-found");
  });

  test("缺 kinds 字段按空选择处理（不抛 500）", async () => {
    const response = await post({});
    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("invalid-request");
  });
});

describe("renderStandaloneSymbolExportZip（独立图元 SVG）", () => {
  test("空选择与超出上限都按 invalid-request 拒绝", async () => {
    await expect(renderStandaloneSymbolExportZip({ kinds: [] })).resolves.toMatchObject({
      error: { code: "invalid-request" }
    });
    const tooMany = Array.from({ length: MAX_SYMBOL_EXPORT_KINDS + 1 }, (_, index) => `k-${index}`);
    expect((await renderStandaloneSymbolExportZip({ kinds: tooMany })).error?.code).toBe("invalid-request");
  });

  test("未知 kind → template-not-found，并点名具体 kind", async () => {
    const result = await renderStandaloneSymbolExportZip({ kinds: ["definitely-not-a-kind"] });
    expect(result.error?.code).toBe("template-not-found");
    expect(result.error?.message).toContain("definitely-not-a-kind");
  });

  test("单图元回单个 .svg（不套 ZIP），文件里没有 symbol/defs/use", async () => {
    const result = await renderStandaloneSymbolExportZip({ kinds: ["ac-bus"] });
    expect(result.error).toBeUndefined();
    expect(result.kind).toBe("svg");
    expect(result.fileName).toMatch(/\.svg$/u);
    expect(result.fileCount).toBe(1);

    // 「非 symbol 形式」的硬约束：剥掉根 svg 与 title 后，不得再有容器型包装元素。
    expect(result.svg).not.toMatch(/<symbol\b/u);
    expect(result.svg).not.toMatch(/<defs\b/u);
    expect(result.svg).not.toMatch(/<use\b/u);
    expect(result.svg).toMatch(/^<svg\b/u);
    expect(result.svg.trimEnd()).toMatch(/<\/svg>$/u);
    // 尺寸必须是具体值（独立文件要能单独打开，不能是 100%）
    expect(result.svg).toMatch(/\bwidth="[\d.]+"/u);
    expect(result.svg).toMatch(/\bheight="[\d.]+"/u);
    expect(result.svg).toMatch(/viewBox="0,0,[\d.]+,[\d.]+"/u);
  });

  test("多图元回 ZIP，条目名与 fileCount 一致且每个条目都是独立 SVG", async () => {
    const result = await renderStandaloneSymbolExportZip({ kinds: ["ac-bus", "ac-load"] });
    expect(result.error).toBeUndefined();
    expect(result.kind).toBe("zip");
    expect(result.fileName).toMatch(/^component-symbols-\d{8}-\d{6}\.zip$/u);

    const zip = new AdmZip(result.buffer);
    const entries = zip.getEntries();
    const svgEntries = entries.filter((entry) => entry.entryName.endsWith(".svg"));
    expect(svgEntries.length).toBe(result.fileCount);
    // 条目名必须是安全 basename：不含路径分隔符，也不可能穿越出解压根目录
    for (const entry of svgEntries) {
      expect(entry.entryName).not.toContain("/");
      expect(entry.entryName).not.toContain("\\");
      expect(entry.entryName).not.toContain("..");
      expect(entry.entryName).toMatch(/\.svg$/u);
      const text = entry.getData().toString("utf-8");
      expect(text).toMatch(/^<svg\b/u);
      expect(text).not.toMatch(/<symbol\b/u);
      expect(text).not.toMatch(/<defs\b/u);
      expect(text).not.toMatch(/<use\b/u);
    }
    // schema.json：E 表名 ↔ svg ↔ 设备类型 ↔ 中文名 的映射，条目与 svg 一一对应
    const schemaEntry = entries.find((entry) => entry.entryName === "schema.json");
    expect(schemaEntry).toBeDefined();
    const schema = JSON.parse(schemaEntry.getData().toString("utf-8"));
    expect(schema.version).toBe(1);
    expect(schema.symbols).toHaveLength(svgEntries.length);
    for (const symbol of schema.symbols) {
      expect(svgEntries.some((entry) => entry.entryName === symbol.svg)).toBe(true);
      expect(typeof symbol.kind).toBe("string");
      expect(typeof symbol.label).toBe("string");
    }
    // E 表名走 inferESection 同源映射：母线 → ACRealBs，负荷 → ACLoad
    const eTableByKind = Object.fromEntries(schema.symbols.map((symbol) => [symbol.kind, symbol.eTable]));
    expect(eTableByKind["ac-bus"]).toBe("ACRealBs");
    expect(eTableByKind["ac-load"]).toBe("ACLoad");
    // 端子附着几何随独立件一同导出：ac-load 有端子 → 既要有锚点，也要有「锚点 → 本体」引线
    // （图元正文导出时端子被清空，两者都由 symbol 导出层补画；只补锚点即「锚点悬空」回归）
    const loadEntry = svgEntries.find((entry) => entry.entryName === "ac-load.svg");
    expect(loadEntry).toBeDefined();
    const loadText = loadEntry.getData().toString("utf-8");
    expect(loadText).toContain('class="terminal terminal-anchor"');
    expect(loadText).toMatch(/<line x1="[-\d.]+" y1="[-\d.]+" x2="0" y2="0"/u);
    // ZIP 必须真的能被 adm-zip 读回（顺带验证 CRC/中央目录没写坏）
    expect(entries.length).toBeGreaterThan(0);
  });

  test("多状态图元每状态各一份文件，两态正文不同（开/合不能同形）", async () => {
    const result = await renderStandaloneSymbolExportZip({ kinds: ["ac-breaker"] });
    expect(result.error).toBeUndefined();
    expect(result.kind).toBe("zip");
    expect(result.fileCount).toBeGreaterThanOrEqual(2);

    const zip = new AdmZip(result.buffer);
    const svgEntries = zip.getEntries().filter((entry) => entry.entryName.endsWith(".svg"));
    const texts = svgEntries.map((entry) => entry.getData().toString("utf-8"));
    expect(new Set(texts).size).toBe(texts.length);
    // schema.json 覆盖全部状态文件，且每个 svg 名只出现一次
    const schemaEntry = zip.getEntries().find((entry) => entry.entryName === "schema.json");
    expect(schemaEntry).toBeDefined();
    const schema = JSON.parse(schemaEntry.getData().toString("utf-8"));
    expect(schema.symbols).toHaveLength(svgEntries.length);
    expect(new Set(schema.symbols.map((symbol) => symbol.svg)).size).toBe(schema.symbols.length);
  });

  test("与合并导出各自独立：同一次选择不会把 symbol 集合件的包装带进独立文件", async () => {
    const merged = await renderSymbolExportSvg({ kinds: ["ac-breaker"] });
    const standalone = await renderStandaloneSymbolExportZip({ kinds: ["ac-breaker"] });
    expect(merged.svg).toContain("<defs>");
    // 独立件走 ZIP（断路器两态），解出的内容一律不得含 defs/symbol
    const zip = new AdmZip(standalone.buffer);
    for (const entry of zip.getEntries()) {
      const text = entry.getData().toString("utf-8");
      expect(text).not.toContain("<defs>");
      expect(text).not.toContain("<symbol");
    }
  });
});

describe(`HTTP POST ${apiPath("/symbol-export-standalone")}`, () => {
  let server;
  let baseUrl;

  beforeAll(async () => {
    server = await createImageServer({ port: 0, host: "127.0.0.1" });
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  });

  afterAll(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  const post = (payload) =>
    fetch(`${baseUrl}${apiPath("/symbol-export-standalone")}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });

  test("多图元返回 200 + application/zip，元信息走响应头", async () => {
    const response = await post({ kinds: ["ac-bus", "ac-load"] });
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/zip");
    expect(response.headers.get("content-disposition")).toContain("attachment");
    expect(response.headers.get("content-disposition")).toContain(".zip");
    expect(Number(response.headers.get("x-symbol-export-file-count"))).toBeGreaterThan(0);
    expect(response.headers.get("x-symbol-export-exported-kinds")).toContain("ac-bus");

    const buffer = Buffer.from(await response.arrayBuffer());
    // ZIP 魔数 PK\x03\x04
    expect(buffer.subarray(0, 4).toString("binary")).toBe("PK\u0003\u0004");
    const zip = new AdmZip(buffer);
    // fileCount 只统计 svg 图元文件；schema.json 是随包元数据，不计入
    const svgEntries = zip.getEntries().filter((entry) => entry.entryName.endsWith(".svg"));
    expect(svgEntries.length).toBe(Number(response.headers.get("x-symbol-export-file-count")));
    expect(zip.getEntries().some((entry) => entry.entryName === "schema.json")).toBe(true);
  });

  test("单图元返回 200 + svg，而不是 ZIP", async () => {
    const response = await post({ kinds: ["ac-bus"] });
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("image/svg+xml");
    expect(Number(response.headers.get("x-symbol-export-file-count"))).toBe(1);
    const text = await response.text();
    expect(text).toMatch(/^<svg\b/u);
    expect(text).not.toContain("<symbol");
  });

  test("空选择 → 400 invalid-request；未知 kind → 404 template-not-found", async () => {
    const empty = await post({ kinds: [] });
    expect(empty.status).toBe(400);
    expect((await empty.json()).error.code).toBe("invalid-request");

    const missing = await post({ kinds: ["no-such-kind"] });
    expect(missing.status).toBe(404);
    expect((await missing.json()).error.code).toBe("template-not-found");
  });
});

// 两条 empty-symbol 分支（symbolExport.mjs 内 renderSymbolExportSvg / renderStandaloneSymbolExportZip
// 各自的 symbolCount === 0 与 files.length === 0 判据），HTTP 侧统一映射为 422。
//
// 二者都不是「未知 kind」：kind 必须在后端图元库里**查得到**（selected 非空），
// 只是正文构建器一个 symbol / 一份独立 SVG 都产不出来（定义异常兜底）。
// 触发手段 = 自定义静态图元声明 size 0×0：normalizeDefaultDeviceSize 对 static- 前缀
// 图元原样保留模板尺寸，于是产出的 <symbol viewBox> 宽高为 0，
// normalizeSymbolViewBox / symbolGraphicBody 的 parseViewBox 判 width>0 && height>0 拒绝该 symbol。
//
// 隔离：server.mjs 的 defaultPaths 在模块加载期求值（指向仓库 data/），改 env 无效；
// 派发层每请求注入的 paths 一律来自 spaceStore.resolvePaths，故注入自建 store 即完成隔离。
describe("empty-symbol → 422（两条分支各一条）", () => {
  const BROKEN_KIND = "custom-staticbasicshape-zero";
  const BROKEN_KINDS = Array.from({ length: 6 }, (_, index) => `custom-staticbasicshape-zero-${index}`);

  let dataDir;
  let server;
  let baseUrl;
  let store;

  beforeAll(async () => {
    dataDir = mkdtempSync(join(tmpdir(), "symbol-export-empty-"));
    const deviceLibraryDir = join(dataDir, "device-library");
    mkdirSync(deviceLibraryDir, { recursive: true });
    const customDeviceTemplates = [BROKEN_KIND, ...BROKEN_KINDS].map((kind) => ({
      kind,
      label: `零尺寸静态图元 ${kind}`,
      custom: true,
      size: { width: 0, height: 0 },
      params: {}
    }));
    writeFileSync(join(deviceLibraryDir, "library.json"), JSON.stringify({
      schemaVersion: 4,
      customDeviceTemplates,
      deviceDefinitionOverrides: {}
    }), "utf-8");

    const { createSpaceStore } = await import("./spaceStore.mjs");
    store = createSpaceStore(dataDir);
    await store.ensureInitialized();
    server = await createImageServer({ port: 0, host: "127.0.0.1", spaceStore: store });
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  });

  afterAll(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    rmSync(dataDir, { recursive: true, force: true });
  });

  const post = (route, payload) =>
    fetch(`${baseUrl}${apiPath(route)}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });

  test("合并导出分支：库里有模板但产不出任何 symbol → 422 并点名被跳过的 kind", async () => {
    const response = await post("/symbol-export", { kinds: [BROKEN_KIND] });
    expect(response.status).toBe(422);
    expect(response.headers.get("content-type")).toContain("application/json");
    const body = await response.json();
    expect(body.error.code).toBe("empty-symbol");
    // 该分支的文案锚点是「未能生成任何 symbol」；漏在正文里会退化成与独立导出分支无法区分
    expect(body.error.message).toContain("未能生成任何 symbol");
    expect(body.error.message).toContain(BROKEN_KIND);
    // 失败响应不得夹带成功产物字段
    expect(body.ok).toBeUndefined();
    expect(body.svg).toBeUndefined();
    expect(body.symbolCount).toBeUndefined();
  });

  test("独立导出分支：库里有模板但产不出任何独立 SVG → 422，文案与合并导出分支不同", async () => {
    const response = await post("/symbol-export-standalone", { kinds: [BROKEN_KIND] });
    expect(response.status).toBe(422);
    expect(response.headers.get("content-type")).toContain("application/json");
    const body = await response.json();
    expect(body.error.code).toBe("empty-symbol");
    // 该分支的文案锚点是「未能生成任何独立 SVG」，与合并导出分支是两句话
    expect(body.error.message).toContain("未能生成任何独立 SVG");
    expect(body.error.message).not.toContain("未能生成任何 symbol");
    expect(body.error.message).toContain(BROKEN_KIND);
    // 二进制响应的元信息头只在 200 时给；422 不得提前发出来误导前端按成功路径解析
    expect(response.headers.get("content-type")).not.toContain("image/svg+xml");
    expect(response.headers.get("content-type")).not.toContain("application/zip");
    expect(response.headers.get("x-symbol-export-file-count")).toBeNull();
  });

  test("被跳过的 kind 超过阈值时走 summarizeKinds 截断文案（6 个 → 等 6 个）", async () => {
    const response = await post("/symbol-export", { kinds: BROKEN_KINDS });
    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.error.code).toBe("empty-symbol");
    // 走的是 skippedKinds 而非 missingKinds：库里有这些 kind，只是产不出 symbol
    expect(body.error.message).toContain(` 等 ${BROKEN_KINDS.length} 个`);
    expect(body.error.message).not.toContain(" 等 1 个");
  });
});

// ---------------------------------------------------------------------------
// 合成器「零产出但零跳过」分支（L111 与 L154 的 `: ""` 一侧）
// ---------------------------------------------------------------------------
//
// 两条 message 各自带一个三元：
//   L111 `result.skippedKinds.length > 0 ? \`（…）\` : ""`   —— renderSymbolExportSvg
//   L154 `result.skippedKinds.length > 0 ? \`（…）\` : ""`   —— renderStandaloneSymbolExportZip
// 既有 empty-symbol 用例只走到 `> 0` 一侧（跳过 1 个 / 6 个），`: ""` 一侧始终没被覆盖。
//
// 为什么它在真实数据上不可达（不是「没找到输入」，是「不存在这样的输入」）：
//   合成器的跳过口径是**逐 kind 记账**。buildSymbolExportSvg 对每个传入模板只有三条出路：
//     ① kind 为空 → `continue`，**不记账**；
//     ② 正文构建器抛错 → skippedKinds.push(kind)；
//     ③ 正文构建器成功但一个 symbol 都没被接受 → skippedKinds.push(kind)。
//   于是「symbolCount === 0 且 skippedKinds.length === 0」当且仅当**每个**模板都走了 ①。
//   而 ① 要求模板 kind 去空白后为空；可 resolveSelectedTemplates 的 selected 来自
//   `templateByKind.get(kind)`，key 就是请求里那个**非空白**的 kind（normalizeSymbolExportKinds
//   已过滤空白项），故 selected 里每个模板的 kind 必非空白 → ① 永不成立。
//   standalone 侧同构：buildStandaloneSymbolExport 的三条出路与记账方式完全一致。
//
// 结论：这是**生产不可达**的分支。它的价值是「防御性兜底不应产出畸形文案」——
// 一旦合成器记账口径变了（比如改成「跳过时不记 kind」），`: ""` 侧就会给用户吐出一个
// 空括号 `（）`。故用打桩合成器把这条分支点亮，断言文案**恰好没有**空括号。
//
// 打桩方式：vi.doMock("../src/symbolExportSvg.ts") + vi.resetModules() →
// 下面对 symbolExport.mjs 的动态 import 重新求值，其顶层的 `await import("../src/symbolExportSvg.ts")`
// 拿到桩。注意桩必须补齐 symbolExport.mjs 顶层解构的**全部 5 个**导出，缺一个就是 undefined 调用。
const SYNTHESIS_MUTANT_EMPTY_KINDS = {
  // 零 symbol 且零跳过：正是 `: ""` 一侧的输入前提
  buildSymbolExportSvg: () => ({ svg: "", symbolCount: 0, exportedKinds: [], skippedKinds: [] }),
  buildStandaloneSymbolExport: () => ({
    files: [],
    schema: { version: 1, symbols: [] },
    exportedKinds: [],
    skippedKinds: []
  })
};

const EMPTY_KIND_ANCHOR = "所选图元未能生成任何 symbol";
const EMPTY_KIND_ANCHOR_STANDALONE = "所选图元未能生成任何独立 SVG";

async function withSynthesisStubs(stubs, run) {
  vi.resetModules();
  vi.doMock("../src/symbolExportSvg.ts", async (importOriginal) => ({
    ...(await importOriginal()),
    ...stubs
  }));
  try {
    const mod = await import("./symbolExport.mjs");
    return await run(mod);
  } finally {
    // 先撤注册再清注册表，顺序反了会把「桩版」留在模块缓存里（见 svgExport.test.mjs 同款注释）
    vi.doUnmock("../src/symbolExportSvg.ts");
    vi.resetModules();
  }
}

describe("empty-symbol 文案的空括号侧（打桩合成器：零 symbol 且零跳过）", () => {
  test("合并导出：skippedKinds 为空时不得吐出空括号，且成功产物字段一律缺席", async () => {
    const result = await withSynthesisStubs(SYNTHESIS_MUTANT_EMPTY_KINDS, (mod) =>
      mod.renderSymbolExportSvg({ kinds: ["ac-breaker"] })
    );
    expect(result.error?.code).toBe("empty-symbol");
    // 整句锚点齐全——证明走的是 empty-symbol 那条 message，不是别的分支的文案
    expect(result.error?.message).toContain(EMPTY_KIND_ANCHOR);
    // 本条用例的全部判别力都在这里：`> 0` 为假 → 三元取 `: ""` → **没有**括号段。
    // 若把 `> 0` 改成 `>= 0`（或删掉三元），summarizeKinds([]) 会被求值 → 文案多出 `（）`。
    expect(result.error?.message).not.toContain("（）");
    expect(result.error?.message).not.toContain("（" + EMPTY_KIND_ANCHOR);
    // `: ""` 一侧的完整文案逐字节钉住（末尾是 `），请检查图元定义后重试。`，中间无任何插入）
    expect(result.error?.message).toBe(`${EMPTY_KIND_ANCHOR}，请检查图元定义后重试。`);
    // 失败响应不得夹带成功产物字段（svg 尤其重要：桩返回的正是空串）
    expect(result.svg).toBeUndefined();
    expect(result.symbolCount).toBeUndefined();
    expect(result.fileName).toBeUndefined();
  });

  test("独立导出：skippedKinds 为空时同样不得吐出空括号", async () => {
    const result = await withSynthesisStubs(SYNTHESIS_MUTANT_EMPTY_KINDS, (mod) =>
      mod.renderStandaloneSymbolExportZip({ kinds: ["ac-breaker"] })
    );
    expect(result.error?.code).toBe("empty-symbol");
    expect(result.error?.message).toContain(EMPTY_KIND_ANCHOR_STANDALONE);
    expect(result.error?.message).not.toContain("（）");
    expect(result.error?.message).toBe(`${EMPTY_KIND_ANCHOR_STANDALONE}，请检查图元定义后重试。`);
    // 两句文案必须仍可区分（`: ""` 侧若退化成共用文案，这里会红）
    expect(result.error?.message).not.toContain(EMPTY_KIND_ANCHOR);
    expect(result.buffer).toBeUndefined();
    expect(result.fileCount).toBeUndefined();
  });

  test("对照：skippedKinds 非空时同一三元走另一侧（证明上一条不是「永远没有括号」）", async () => {
    // 与上面两条同一条 message、同一处三元，只把 skippedKinds 换成非空。
    // 这一对是 §6.13「两侧各断一条」的写法：若两条用例合成一条（只测一侧），
    // 三元被改成 `>= 0` 时下面的 `toContain("（）")` 与上面的 `not.toContain("（）")` 会同时翻转，
    // 守卫立刻失去鉴别力——所以它们必须成对存在。
    const skipped = ["ghost-kind-a"];
    const result = await withSynthesisStubs({
      buildSymbolExportSvg: () => ({ svg: "", symbolCount: 0, exportedKinds: [], skippedKinds: skipped })
    }, (mod) => mod.renderSymbolExportSvg({ kinds: ["ac-breaker"] }));
    expect(result.error?.code).toBe("empty-symbol");
    // 走的是 `> 0` 一侧：括号里**有** summarizeKinds 的结果（不是空串）
    expect(result.error?.message).toContain(`（${skipped[0]}）`);
    expect(result.error?.message).not.toContain("（）");
    expect(result.error?.message).not.toBe(`${EMPTY_KIND_ANCHOR}，请检查图元定义后重试。`);
  });
});

// ---------------------------------------------------------------------------
// 库装配兜底右臂（L72 `customDeviceTemplates ?? []` / L73 `deviceDefinitionOverrides ?? {}`）
// ---------------------------------------------------------------------------
//
// 与 svgExport.test.mjs 里同款的两条兜底一样，在**集成路径上不可达**：
// readDeviceLibraryConfig 恒返回 normalizeDeviceLibraryConfig 的完整产物，而后者把
// customDeviceTemplates 归一为数组、deviceDefinitionOverrides 归一为对象（探针实测：
// 传 null / 0 / "x" 三种畸形载荷，归一后仍是 isArray=true / typeof==="object"）。
// 「让磁盘 library.json 少写一个键」根本到不了这两条右臂——上游先补上了。
// 故同样打桩：把 readDeviceLibraryConfig 换成返回值可控的桩，直接对新求值出的
// symbolExport.mjs 实例调，观察兜底本身的行为。
//
// 桩用 vi.doMock（局部生效）而非 vi.mock（文件级提升）：本文件顶部两个 describe 已经
// 起了真实 server，vi.mock 会把它依赖的 server.mjs 整个替换掉。
async function renderWithLibraryStub(stub, run) {
  vi.resetModules();
  vi.doMock("./server.mjs", async (importOriginal) => ({
    ...(await importOriginal()),
    readDeviceLibraryConfig: stub
  }));
  try {
    const mod = await import("./symbolExport.mjs");
    return await run(mod);
  } finally {
    vi.doUnmock("./server.mjs");
    vi.resetModules();
  }
}

// 幽灵模板：只可能从 `?? []` 右臂进来 —— 未打桩时库里绝无此 kind（下方用例正面断言了这点）
const GHOST_KIND = "ai67-ghost-from-nullish-fallback";
const ghostTemplate = {
  kind: GHOST_KIND,
  label: "兜底注入的幽灵图元",
  custom: true,
  params: {},
  size: { width: 20, height: 20 }
};

describe("库装配兜底右臂（打桩读盘层：library 两个键缺席）", () => {
  // 桩自检：下面三条用例的判别力全部依赖「readDeviceLibraryConfig 已被换成桩」。
  // 若 doMock 静默失效（桩没接上），L72 那条会因「幽灵 kind 恰好查不到」而恒绿 ——
  // 正是「看起来对」的假证据。故先证明三件事：
  //   ① 未打桩的真实库（指向仓库 data/）里没有 GHOST_KIND；
  //   ② 打桩返回**带**该模板的库时，它立刻被导出 ⇒ 桩确实生效；
  //   ③ 打桩返回**不带**该键的库时，它查不到 ⇒ 判别点确实是「键在不在」，不是别的。
  test("桩自检：真实库无幽灵 kind；打桩喂进去就查得到，不喂就查不到", async () => {
    const before = await renderSymbolExportSvg({ kinds: [GHOST_KIND] });
    expect(before.error?.code).toBe("template-not-found");

    const withGhost = await renderWithLibraryStub(
      async () => ({ exists: true, customDeviceTemplates: [ghostTemplate] }),
      (mod) => mod.renderSymbolExportSvg({ kinds: [GHOST_KIND] })
    );
    expect(withGhost.error).toBeUndefined();
    expect(withGhost.exportedKinds).toEqual([GHOST_KIND]);

    const withoutGhost = await renderWithLibraryStub(async () => ({ exists: true }), (mod) =>
      mod.renderSymbolExportSvg({ kinds: [GHOST_KIND] })
    );
    expect(withoutGhost.error?.code).toBe("template-not-found");
  });

  // L72：`library.customDeviceTemplates ?? []` 的右臂。
  // 关键：`customDeviceTemplates` 这个**键整个缺席**（不是 `[]`）。`[]` 不是 nullish，
  // `??` 直接短路取左值，右臂从未被求值 —— 那正是 §6.13 的恒绿陷阱。
  // 断言落在「该 kind 能否被查到」上：右臂给的是**空数组**，故幽灵 kind 必须查不到；
  // 而内置 kind（ac-breaker）仍要能查到（证明兜底空数组没有把内置库也清掉）。
  test("customDeviceTemplates 键缺席：兜底空数组，内置 kind 仍可导出、幽灵 kind 查不到", async () => {
    const result = await renderWithLibraryStub(async () => ({ exists: true }), (mod) =>
      mod.renderSymbolExportSvg({ kinds: ["ac-breaker"] })
    );
    expect(result.error).toBeUndefined();
    expect(result.exportedKinds).toEqual(["ac-breaker"]);
    // 右上角的具名断言：内置库走了 `?? []` 之后仍然完整（兜底是「补空」不是「清空」）
    expect(result.symbolCount).toBeGreaterThanOrEqual(2);

    const ghost = await renderWithLibraryStub(async () => ({ exists: true }), (mod) =>
      mod.renderSymbolExportSvg({ kinds: [GHOST_KIND] })
    );
    expect(ghost.error?.code).toBe("template-not-found");
    expect(ghost.error?.message).toContain(GHOST_KIND);
  });

  // L73：`library.deviceDefinitionOverrides ?? {}` 的右臂。
  // 同样要「键缺席」而不是空对象。判别点用**多状态图元的 symbol 数**：
  // 覆盖对象缺失 → 断路器保留两条状态定义 → symbolCount 为 2；
  // 若右臂被换成一个带 `stateDefinitions: []` 的对象，断路器的状态定义被清空 → symbolCount 掉到 1。
  // （探针实测：同一模板在两种 overrides 下分别产出 2 与 1。）
  test("deviceDefinitionOverrides 键缺席：兜底空对象，模板自带的状态定义不被清空", async () => {
    const result = await renderWithLibraryStub(async () => ({ exists: true }), (mod) =>
      mod.renderSymbolExportSvg({ kinds: ["ac-breaker"] })
    );
    expect(result.error).toBeUndefined();
    expect(result.exportedKinds).toEqual(["ac-breaker"]);
    // 断路器是本文件多处用例认定的多状态图元：state_1（合）与 state_2（分）各一个 symbol。
    // 兜底空对象 ⇒ 状态定义来自模板本身 ⇒ 两个都在。换成「有覆盖且清空状态定义」即掉到 1。
    expect(result.symbolCount).toBe(2);
    const symbols = Array.from(result.svg.matchAll(/<symbol\b[\s\S]*?<\/symbol>/gu), (m) => m[0]);
    expect(symbols).toHaveLength(2);
    expect(new Set(symbols.map((markup) => /\bid\s*=\s*"([^"]*)"/u.exec(markup)?.[1])).size).toBe(2);

    // 对照：右臂被替换成「带清空状态定义的覆盖」时确实掉到 1 —— 证明上面那两个 2 有鉴别力，
    // 而非「断路器本来就只产一个 symbol」。
    const mutated = await renderWithLibraryStub(
      async () => ({ exists: true, deviceDefinitionOverrides: { "ac-breaker": { stateDefinitions: [] } } }),
      (mod) => mod.renderSymbolExportSvg({ kinds: ["ac-breaker"] })
    );
    expect(mutated.symbolCount).toBe(1);
  });

  // L73 的「`??` 换成 `||`」在**全定义域上等价** —— 与 L72 相反，这里没有判别输入。
  // 可证前提（全定义域论证，§6.20 路线 A）：
  //   `overrides` 这个值下游只被**属性读取**，从不被遍历：
  //     deviceDefinitionOverrideForTemplate：`overrides[sharedKey]` / `overrides[template.kind]` / `overrides[\`class:${…}\`]`
  //     sharedDefinitionSourceForTemplate：`candidateKeys.map((key) => overrides[key])`
  //   没有任何 `Object.entries(overrides)` / `for…in` / 展开 / 真值判断作用在它自己身上。
  //   枚举 JS 全部 falsy-but-non-nullish 取值 {0, -0, "", false, NaN}：每个都被装箱成
  //   包装对象再取属性，一律返回 undefined —— 与 `{}` 取任意键逐字相同（探针实测 symbolCount 同为 2、
  //   symbol id 同为 state_0/state_1）。nullish 那一档 `??` 与 `||` 同取右臂 `{}`；
  //   truthy 那一档两者同取左臂。故两式在全域逐输入相等，**换成 `||` 不改变任何可观测输出**。
  //   与 L72 的差别正在于 L72 的值会被 `[...DEVICE_LIBRARY, ...customDeviceTemplates]` 展开，
  //   展开对非可迭代值抛错 —— 所以只有 L72 有判别输入（0），也只有 L72 的操作符承重。
  // 这条用例把上面那份论证的「每档输出相同」钉成可执行断言（而不是只写在注释里）。
  test("L73 操作符全定义域等价：五档 falsy-but-non-nullish 的覆盖值与空对象逐 symbol id 相同", async () => {
    const symbolIdsFor = async (overridesValue) => {
      const result = await renderWithLibraryStub(
        async () => ({ exists: true, deviceDefinitionOverrides: overridesValue }),
        (mod) => mod.renderSymbolExportSvg({ kinds: ["ac-breaker"] })
      );
      expect(result.error).toBeUndefined();
      return Array.from(result.svg.matchAll(/<symbol\b[^>]*\bid\s*=\s*"([^"]*)"/gu), (match) => match[1]);
    };
    const baseline = await symbolIdsFor({});
    expect(baseline).toHaveLength(2);
    // 逐档相等：NaN 用 toEqual 比（同一数组引用下的 NaN 逐元素相等），不用 Object.is
    for (const value of [0, -0, "", false, Number.NaN]) {
      expect(await symbolIdsFor(value)).toEqual(baseline);
    }
  });

  // §6.18：`??` 与 `||` 唯一的判别输入是「falsy 但非 nullish」。
  // `undefined`（键缺席）那一档两者同侧，恒绿 —— 所以必须显式喂 `0`。
  // `??` 对 0 不短路 → 0 原样进 buildBaseLibraryTemplates 的 `[...DEVICE_LIBRARY, ...0]` → 抛；
  // 换成 `||` 则 0 落进右臂 `[]`、不抛。故这条 rejects 断言正是 `??` 承重的那张收据。
  test("customDeviceTemplates 为 0（falsy 但非 nullish）：`??` 不短路、原样透传并抛 not iterable", async () => {
    const pending = renderWithLibraryStub(
      async () => ({ exists: true, customDeviceTemplates: 0 }),
      (mod) => mod.renderSymbolExportSvg({ kinds: ["ac-breaker"] })
    );
    await expect(pending).rejects.toThrow(/not iterable/);
  });

  // 两个键同时缺席是生产上最可能出现的一档（library.json 全新/空文件）。
  // 这里额外钉住「兜底不抛」：删掉任一 `??` 右臂，buildBaseLibraryTemplates 的
  // `[...DEVICE_LIBRARY, ...customDeviceTemplates]` 就会抛 "not iterable"（探针已实测该 TypeError）。
  test("两个键同时缺席：不抛错、仍能按内置库导出，且自定义 kind 一律查不到", async () => {
    const result = await renderWithLibraryStub(async () => ({}), (mod) =>
      mod.renderSymbolExportSvg({ kinds: ["ac-breaker", GHOST_KIND] })
    );
    expect(result.error).toBeUndefined();
    expect(result.exportedKinds).toEqual(["ac-breaker"]);
    expect(result.missingKinds).toEqual([GHOST_KIND]);
    expect(result.symbolCount).toBeGreaterThanOrEqual(2);

    // 独立导出走同一份前置链，兜底同样承重。用单状态图元（ac-bus）才能落到单文件 svg 那一档；
    // 断路器是两状态，走的是 ZIP 档（见下方断言）—— 别拿它断言 kind === "svg"。
    const standalone = await renderWithLibraryStub(async () => ({}), (mod) =>
      mod.renderStandaloneSymbolExportZip({ kinds: ["ac-bus"] })
    );
    expect(standalone.error).toBeUndefined();
    expect(standalone.kind).toBe("svg");
    expect(standalone.exportedKinds).toEqual(["ac-bus"]);

    const standaloneZip = await renderWithLibraryStub(async () => ({}), (mod) =>
      mod.renderStandaloneSymbolExportZip({ kinds: ["ac-breaker"] })
    );
    expect(standaloneZip.error).toBeUndefined();
    expect(standaloneZip.kind).toBe("zip");
    expect(standaloneZip.fileCount).toBeGreaterThanOrEqual(2);
  });
});
