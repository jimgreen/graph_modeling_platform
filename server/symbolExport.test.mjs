// 图元 Symbol 后端导出：kind 归一化契约 + 合成结果不变量 + HTTP 端到端。
//
// 断言口径刻意避开「某个图元的具体几何」——图元库会随用户保存工程重写，
// 钉死坐标/尺寸的断言必然失效。这里只断言**关系与结构不变量**。
import { describe, expect, test, beforeAll, afterAll } from "vitest";
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
