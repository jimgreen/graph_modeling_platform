import { describe, expect, test, beforeEach, afterEach } from "vitest";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SOURCE_SCRIPT = fileURLToPath(new URL("./audit-icon-library-quality.mjs", import.meta.url));

let caseDir;
let scriptPath;
let libraryDir;

beforeEach(() => {
  caseDir = mkdtempSync(path.join(tmpdir(), "audit-icon-library-quality-"));
  const scriptDir = path.join(caseDir, "scripts");
  mkdirSync(scriptDir, { recursive: true });
  scriptPath = path.join(scriptDir, "audit-icon-library-quality.mjs");
  copyFileSync(SOURCE_SCRIPT, scriptPath);
  libraryDir = path.join(caseDir, "public", "icon-library", "open-source-svg");
});

afterEach(() => {
  rmSync(caseDir, { recursive: true, force: true });
});

function seedLibrary(categories) {
  mkdirSync(libraryDir, { recursive: true });
  writeFileSync(path.join(libraryDir, "manifest.json"), JSON.stringify({ categories }), "utf8");
  for (const category of categories) {
    for (const icon of category.icons || []) {
      writeFileSync(
        path.join(libraryDir, icon.file),
        icon.svg || '<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0h1v1H0z"/></svg>',
        "utf8"
      );
    }
  }
}

function run() {
  const result = spawnSync(process.execPath, [scriptPath], { encoding: "utf8" });
  return {
    status: result.status,
    stdout: result.stdout || "",
    stderr: result.stderr || "",
  };
}

function parseSummary(stdout) {
  return JSON.parse(stdout);
}

describe("audit-icon-library-quality CLI", () => {
  test("空图标库退出码为 0，并输出完整的空汇总结构", () => {
    seedLibrary([]);

    const result = run();
    const summary = parseSummary(result.stdout);

    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
    expect(summary).toEqual({
      skippedLibraries: [],
      libraries: {
        "open-source-svg": {
          totalIcons: 0,
          categories: 0,
          sources: {},
        },
      },
      wrongDomainViolations: [],
      duplicateStructures: [],
    });
  });

  test("合法图标库统计图标、分类和来源，且没有违规项", () => {
    seedLibrary([
      {
        id: "safe-category",
        icons: [
          {
            id: "safe-icon",
            source: "test-source",
            sourceName: "substation-transformer",
            file: "safe.svg",
          },
        ],
      },
    ]);

    const result = run();
    const summary = parseSummary(result.stdout);

    expect(result.status).toBe(0);
    expect(summary.skippedLibraries).toEqual([]);
    expect(summary.libraries["open-source-svg"]).toEqual({
      totalIcons: 1,
      categories: 1,
      sources: { "test-source": 1 },
    });
    expect(summary.wrongDomainViolations).toEqual([]);
    expect(summary.duplicateStructures).toEqual([]);
  });

  test("违规图标使退出码非 0，并列出错误领域与重复结构", () => {
    const duplicateSvg = '<svg><path d="M0 0h1v1H0z"/></svg>';
    seedLibrary([
      {
        id: "power-grid-electrical",
        icons: [
          {
            id: "wrong-icon",
            source: "test-source",
            sourceName: "Nintendo Switch",
            file: "wrong.svg",
            svg: duplicateSvg,
          },
          {
            id: "duplicate-icon",
            source: "test-source",
            sourceName: "substation-transformer",
            file: "duplicate.svg",
            svg: duplicateSvg,
          },
        ],
      },
    ]);

    const result = run();
    const summary = parseSummary(result.stdout);

    expect(result.status).not.toBe(0);
    expect(summary.wrongDomainViolations).toEqual([
      expect.objectContaining({
        libraryId: "open-source-svg",
        categoryId: "power-grid-electrical",
        iconId: "wrong-icon",
        sourceName: "Nintendo Switch",
      }),
    ]);
    expect(summary.duplicateStructures).toEqual([
      {
        scope: "category",
        libraryId: "open-source-svg",
        categoryId: "power-grid-electrical",
        icons: ["wrong-icon", "duplicate-icon"],
      },
      {
        scope: "global",
        icons: [
          "open-source-svg/power-grid-electrical/wrong-icon",
          "open-source-svg/power-grid-electrical/duplicate-icon",
        ],
      },
    ]);
  });

  test("目标图标库目录不存在时退出码为 1，并在 stderr 指出缺失路径", () => {
    const result = run();
    const summary = parseSummary(result.stdout);
    const expectedManifestHint = path.join(
      caseDir,
      "public",
      "icon-library",
      "<id>",
      "manifest.json"
    );

    expect(result.status).toBe(1);
    expect(summary.skippedLibraries).toEqual(["open-source-svg"]);
    expect(summary.libraries).toEqual({});
    expect(result.stderr).toContain("跳过 1 个缺失的图标库");
    expect(result.stderr).toContain(expectedManifestHint);
  });

  test("输出中的总图标数与实际 fixture 条目数一致", () => {
    seedLibrary([
      {
        id: "first",
        icons: [
          { id: "one", source: "source-a", sourceName: "one", file: "one.svg" },
          { id: "two", source: "source-a", sourceName: "two", file: "two.svg" },
        ],
      },
      {
        id: "second",
        icons: [{ id: "three", source: "source-b", sourceName: "three", file: "three.svg" }],
      },
    ]);

    const summary = parseSummary(run().stdout);
    const library = summary.libraries["open-source-svg"];

    expect(library.totalIcons).toBe(3);
    expect(library.categories).toBe(2);
    expect(library.sources).toEqual({ "source-a": 2, "source-b": 1 });
  });

  test("来源字段和 sourceName 的回退顺序均被统计", () => {
    const iconSvg = (index) => `<svg><path d="M${index} 0h1v1H${index}z"/></svg>`;
    seedLibrary([
      {
        id: "fallbacks",
        icons: [
          { id: "source", source: "source-a", file: "source.svg", svg: iconSvg(1) },
          { id: "source-id", sourceId: "source-b", file: "source-id.svg", svg: iconSvg(2) },
          { id: "picked-by", pickedBy: "source-c", file: "picked-by.svg", svg: iconSvg(3) },
          { id: "id-name", source: "source-d", file: "id-name.svg", svg: iconSvg(4) },
          { name: "name-name", source: "source-e", file: "name-name.svg", svg: iconSvg(5) },
          { source: "source-f", file: "empty-name.svg", svg: iconSvg(6) },
          { source: "", sourceId: "source-g", id: "source-id-after-empty", file: "empty-source-id.svg", svg: iconSvg(7) },
          { source: "", sourceId: "", pickedBy: "source-h", id: "picked-by-after-empty", file: "empty-picked-by.svg", svg: iconSvg(8) },
          { id: "unknown-source", file: "unknown.svg", svg: iconSvg(9) },
        ],
      },
      { id: "no-icons" },
    ]);

    const result = run();
    const summary = parseSummary(result.stdout);

    expect(result.status).toBe(0);
    expect(summary.libraries["open-source-svg"]).toEqual({
      totalIcons: 9,
      categories: 2,
      sources: {
        "source-a": 1,
        "source-b": 1,
        "source-c": 1,
        "source-d": 1,
        "source-e": 1,
        "source-f": 1,
        "source-g": 1,
        "source-h": 1,
        unknown: 1,
      },
    });
    expect(summary.wrongDomainViolations).toEqual([]);
    expect(summary.duplicateStructures).toEqual([]);
  });

  test("缺失 SVG 文件仍计入图标但不参与重复结构审计", () => {
    seedLibrary([
      {
        id: "missing-file",
        icons: [
          { id: "missing", source: "test-source", file: "missing.svg", svg: "<svg><path d=\"M1 0h1v1H1z\"/></svg>" },
          { id: "present", source: "test-source", file: "present.svg", svg: "<svg><path d=\"M1 0h1v1H1z\"/></svg>" },
        ],
      },
    ]);
    rmSync(path.join(libraryDir, "missing.svg"));

    const result = run();
    const summary = parseSummary(result.stdout);

    expect(result.status).toBe(0);
    expect(summary.libraries["open-source-svg"]).toEqual({
      totalIcons: 2,
      categories: 1,
      sources: { "test-source": 2 },
    });
    expect(summary.duplicateStructures).toEqual([]);
  });

  test("规范化展示属性后跨分类相同结构只报告全局重复", () => {
    const firstSvg =
      '<?xml version="1.0"?><svg color="#fff"><title>First</title><desc>First description</desc>' +
      '<text id="first-text">First label</text><path id="first-path" aria-labelledby="first-label" ' +
      'fill="#123456" d="M0 0h1v1H0z"/></svg>';
    const secondSvg =
      '<svg color="#000"><title>Second</title><desc>Second description</desc>' +
      '<text id="second-text">Second label</text><path id="second-path" aria-labelledby="second-label" ' +
      'fill="#abcdef" d="M0 0h1v1H0z"/></svg>';
    seedLibrary([
      {
        id: "first-category",
        icons: [{ id: "first-icon", source: "source", file: "first.svg", svg: firstSvg }],
      },
      {
        id: "second-category",
        icons: [{ id: "second-icon", source: "source", file: "second.svg", svg: secondSvg }],
      },
    ]);

    const result = run();
    const summary = parseSummary(result.stdout);

    expect(result.status).toBe(1);
    expect(summary.duplicateStructures).toEqual([
      {
        scope: "global",
        icons: [
          "open-source-svg/first-category/first-icon",
          "open-source-svg/second-category/second-icon",
        ],
      },
    ]);
    expect(summary.wrongDomainViolations).toEqual([]);
  });

  test("空文件、超大文件、非 SVG 扩展名、嵌套路径和中文名称按普通文件处理", () => {
    mkdirSync(path.join(libraryDir, "nested"), { recursive: true });
    seedLibrary([
      {
        id: "file-boundaries",
        icons: [
          { id: "empty-file", source: "edge", file: "empty.svg", svg: "placeholder" },
          { id: "large-file", source: "edge", file: "large.svg", svg: `<svg>${"x".repeat(1024 * 1024)}</svg>` },
          { id: "text-extension", source: "edge", file: "nested/icon.txt", svg: '<svg><path d="M2 0h1v1H2z"/></svg>' },
          { id: "中文图标", source: "edge", file: "nested/中文图标.svg", svg: '<svg><path d="M3 0h1v1H3z"/></svg>' },
        ],
      },
    ]);
    writeFileSync(path.join(libraryDir, "empty.svg"), "", "utf8");

    const result = run();
    const summary = parseSummary(result.stdout);

    expect(result.status).toBe(0);
    expect(summary.libraries["open-source-svg"]).toEqual({
      totalIcons: 4,
      categories: 1,
      sources: { edge: 4 },
    });
    expect(summary.wrongDomainViolations).toEqual([]);
    expect(summary.duplicateStructures).toEqual([]);
  });

  test("合法图标与多类领域违规混合时按稳定顺序聚合每条规则", () => {
    seedLibrary([
      {
        id: "power-grid-electrical",
        icons: [
          {
            id: "auto-transmission",
            source: "mixed",
            sourceName: "auto-transmission",
            file: "auto-transmission.svg",
            svg: '<svg><path d="M4 0h1v1H4z"/></svg>',
          },
          {
            id: "legal-power-icon",
            source: "mixed",
            sourceName: "substation-transformer",
            file: "legal-power.svg",
            svg: '<svg><path d="M5 0h1v1H5z"/></svg>',
          },
        ],
      },
      {
        id: "thermal-heating",
        icons: [
          {
            id: "devops",
            source: "mixed",
            sourceName: "devops",
            file: "devops.svg",
            svg: '<svg><path d="M6 0h1v1H6z"/></svg>',
          },
        ],
      },
      {
        id: "substation-link",
        icons: [
          {
            id: "airplane-settings",
            source: "mixed",
            sourceName: "airplane-settings",
            file: "airplane-settings.svg",
            svg: '<svg><path d="M7 0h1v1H7z"/></svg>',
          },
        ],
      },
    ]);

    const result = run();
    const summary = parseSummary(result.stdout);

    expect(result.status).toBe(1);
    expect(summary.wrongDomainViolations.map(({ categoryId, iconId, sourceName, rule }) => ({
      categoryId,
      iconId,
      sourceName,
      rule,
    }))).toEqual([
      {
        categoryId: "power-grid-electrical",
        iconId: "auto-transmission",
        sourceName: "auto-transmission",
        rule: "/auto[-_ ]?transmission/i",
      },
      {
        categoryId: "thermal-heating",
        iconId: "devops",
        sourceName: "devops",
        rule: "/devops/i",
      },
      {
        categoryId: "substation-link",
        iconId: "airplane-settings",
        sourceName: "airplane-settings",
        rule: "/airplane[-_ ]?settings/i",
      },
      {
        categoryId: "substation-link",
        iconId: "airplane-settings",
        sourceName: "airplane-settings",
        rule: "/settings/i",
      },
    ]);
    expect(summary.duplicateStructures).toEqual([]);
  });
});
