import { describe, expect, test } from "vitest";
import {
  categoryMatchScore,
  categoryRejectsSourceName,
  displayNameForSource,
  duplicateSvgKey,
  findIconFile,
  iconComplexity,
  listAvailableRegularIcons,
  nameTokens,
  normalizeSvg,
  renderPreviewHtml,
  renderReadme,
  sourceAudit,
  tokenMatchesPattern,
} from "./generate-office-fluent-icons.mjs";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

describe("generate-office-fluent-icons 纯函数", () => {
  test("规范化名称并按数字边界拆分 token", () => {
    expect(nameTokens("Data_24x24_Regular")).toEqual(["data", "24", "x", "24", "regular"]);
    expect(displayNameForSource("data_24x24_regular")).toBe("Data 24x24 Regular");
    expect(iconComplexity("data_24x24_regular")).toBe(3);
  });

  test("按连续 token 匹配模式并计算多 token 更高分数", () => {
    const tokens = nameTokens("arrow_sync_circle");
    expect(tokenMatchesPattern(tokens, "sync_circle")).toBe(true);
    expect(tokenMatchesPattern(tokens, "circle_sync")).toBe(false);
    expect(categoryMatchScore("arrow_sync_circle", ["sync_circle", "arrow"])).toBe(10);
    expect(categoryMatchScore("arrow_sync_circle", [])).toBe(0);
  });

  test("拒绝字符串和正则命中的禁用来源名，并处理非法输入", () => {
    expect(categoryRejectsSourceName("arrow_left", [/^arrow_/i])).toBe(true);
    expect(categoryRejectsSourceName("line_horizontal", ["line_horizontal"])).toBe(true);
    expect(categoryRejectsSourceName("network_adapter", [])).toBe(false);
    expect(categoryRejectsSourceName(null, ["anything"])).toBe(false);
    expect(categoryRejectsSourceName("Arrow_Left", [/^arrow_/iy])).toBe(true);
  });

  test("重复 SVG key 忽略可变元数据、ID 和颜色但保留几何结构", () => {
    const first = duplicateSvgKey(
      '<svg color="#123"><title>A</title><desc>D</desc><path id="one" fill="#abc" d="M0 0" /></svg>',
    );
    const second = duplicateSvgKey(
      '<svg color="#456"><title>B</title><desc>E</desc><path id="two" fill="#def" d="M0 0" /></svg>',
    );
    expect(first).toBe(second);
    expect(duplicateSvgKey(" ")).toBe("");
    expect(duplicateSvgKey(null)).toBe("");
  });

  test("normalizeSvg 生成固定尺寸、当前颜色和转义的无障碍元数据", () => {
    const svg = normalizeSvg(
      '<?xml version="1.0"?><svg width="20" height="20"><path d="M0 0" /><path fill="none" d="M1 1" /></svg>',
      { id: "demo-icon", name: "A & B", sourceName: "demo_icon" },
      { label: "分类 <X>" },
      20,
    );
    expect(svg).not.toContain("<?xml");
    expect(svg).toContain('width="24"');
    expect(svg).toContain('height="24"');
    expect(svg).toContain('color="#2563eb"');
    expect(svg).toContain('<path fill="currentColor" d="M0 0" />');
    expect(svg).toContain('fill="none"');
    expect(svg).toContain("A &amp; B");
    expect(svg).toContain("分类 &lt;X&gt; - demo_icon, 20px regular");
  });

  test("异步扫描只选 regular 候选中的最优回退尺寸并排序", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "office-fluent-icons-test-"));
    try {
      await Promise.all([
        writeFile(path.join(root, "zeta_20_regular.svg"), "z"),
        writeFile(path.join(root, "zeta_24_regular.svg"), "z"),
        writeFile(path.join(root, "alpha_28_regular.svg"), "a"),
        writeFile(path.join(root, "ignored_64_regular.svg"), "i"),
        writeFile(path.join(root, "filled_24_filled.svg"), "f"),
        writeFile(path.join(root, "invalid.svg"), "x"),
      ]);
      await expect(listAvailableRegularIcons(root)).resolves.toEqual([
        { sourceName: "alpha", size: 28, filePath: path.join(root, "alpha_28_regular.svg"), fileName: "alpha_28_regular.svg" },
        { sourceName: "zeta", size: 24, filePath: path.join(root, "zeta_24_regular.svg"), fileName: "zeta_24_regular.svg" },
      ]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test("findIconFile 按回退尺寸查找并对缺失来源抛错", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "office-fluent-icons-test-"));
    try {
      await mkdir(root, { recursive: true });
      await writeFile(path.join(root, "demo_28_regular.svg"), "svg");
      expect(findIconFile(root, "demo")).toEqual({
        filePath: path.join(root, "demo_28_regular.svg"),
        size: 28,
      });
      expect(() => findIconFile(root, "missing")).toThrow("Missing Fluent UI icon: missing");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test("license metadata、README 和预览页输出保持可消费结构", () => {
    expect(sourceAudit.license).toBe("MIT");
    expect(sourceAudit.packageSpec).toBe("@fluentui/svg-icons@1.1.330");
    const manifest = {
      label: "Office Fluent 兼容图标库",
      totalIcons: 1,
      categories: [{ id: "documents", label: "文档", description: "desc", icons: [{ id: "save", name: "Save", file: "documents/save.svg", sourceName: "save", license: "MIT", pickedBy: "curated" }] }],
    };
    expect(renderReadme(manifest)).toContain("License: MIT");
    const html = renderPreviewHtml(manifest);
    expect(html).toContain('data-category="documents"');
    expect(html).toContain("save");
    expect(html).toContain("当前显示");
  });
});
