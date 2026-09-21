// 图元 Symbol 后端导出：kind 归一化契约 + 合成结果不变量 + HTTP 端到端。
//
// 断言口径刻意避开「某个图元的具体几何」——图元库会随用户保存工程重写，
// 钉死坐标/尺寸的断言必然失效。这里只断言**关系与结构不变量**。
import { describe, expect, test, beforeAll, afterAll } from "vitest";
import AdmZip from "adm-zip";
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
    expect(entries.length).toBe(result.fileCount);
    // 条目名必须是安全 basename：不含路径分隔符，也不可能穿越出解压根目录
    for (const entry of entries) {
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
    // ZIP 必须真的能被 adm-zip 读回（顺带验证 CRC/中央目录没写坏）
    expect(zip.getEntries().length).toBeGreaterThan(0);
  });

  test("多状态图元每状态各一份文件，两态正文不同（开/合不能同形）", async () => {
    const result = await renderStandaloneSymbolExportZip({ kinds: ["ac-breaker"] });
    expect(result.error).toBeUndefined();
    expect(result.kind).toBe("zip");
    expect(result.fileCount).toBeGreaterThanOrEqual(2);

    const zip = new AdmZip(result.buffer);
    const texts = zip.getEntries().map((entry) => entry.getData().toString("utf-8"));
    expect(new Set(texts).size).toBe(texts.length);
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
    expect(zip.getEntries().length).toBe(Number(response.headers.get("x-symbol-export-file-count")));
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
