import { describe, expect, test } from "vitest";
import {
  categoryMatchScore,
  categoryRejectsName,
  classifyIcon,
  duplicateSvgKey,
  iconComplexity,
  iconFamily,
  isUsableSvg,
  nameTokens,
  normalizeSvg,
  packageLicenseDeclarations,
  packageLicenseMatches,
  semanticIconKey,
  slug,
  tokenMatchesPattern,
} from "./generate-open-source-svg-icons.mjs";

describe("generate-open-source-svg-icons —— 纯函数", () => {
  test("名称规范化和 token 解析保持稳定", () => {
    expect(slug("Save__As 2.svg")).toBe("save-as-2-svg");
    expect(slug("  --Battery-- ")).toBe("battery");
    expect(slug("中文图标")).toBe("");
    expect(nameTokens("USB2_power_station")).toEqual(["usb", "2", "power", "station"]);
    expect(iconComplexity("power-grid_transformer")).toBe(3);
    expect(iconFamily("Battery-filled-24")).toBe("battery");
    expect(iconFamily("24-outline")).toBe("24-outline");
  });

  test("单词、复合词和安全复合 token 的分类匹配规则可用", () => {
    const tokens = nameTokens("cloudy-data-center");
    expect(tokenMatchesPattern(tokens, "cloud")).toBe(true);
    expect(tokenMatchesPattern(tokens, "data center")).toBe(true);
    expect(tokenMatchesPattern(tokens, "battery")).toBe(false);
    expect(categoryMatchScore("save-file", ["save", "file"])).toBe(8);
    expect(categoryMatchScore("unrelated", ["save", "file"])).toBe(0);
  });

  test("分类拒绝规则优先于匹配，分类结果带有命中的分类和分数", () => {
    expect(categoryRejectsName("paper-plane", [/paper[-_ ]?plane/i])).toBe(true);
    expect(categoryRejectsName("paper_plane", ["plane"])).toBe(true);
    expect(categoryRejectsName("battery", [])).toBe(false);

    const result = classifyIcon("busbar");
    expect(result?.category.id).toBe("substation-link");
    expect(result?.score).toBeGreaterThan(0);
    expect(classifyIcon("definitely-not-an-icon-category")).toBeNull();
  });

  test("语义键归一化别名、变体 token，并去重 token", () => {
    expect(semanticIconKey("checkmark-circle-outline")).toBe("check");
    expect(semanticIconKey("add-plus-24-filled")).toBe("plus");
    expect(semanticIconKey("trash-bin-delete")).toBe("delete");
    expect(semanticIconKey("")).toBe("");
  });

  test("SVG 可用性和重复键过滤元数据、颜色与空白差异", () => {
    expect(isUsableSvg('  <svg viewBox="0 0 1 1"></svg>  ')).toBe(true);
    expect(isUsableSvg("undefined")).toBe(false);
    expect(isUsableSvg("<svg>" )).toBe(false);
    expect(isUsableSvg(null)).toBe(false);

    const first = '<svg id="a" color="#fff"><title>One</title><path fill="#123456" d="M0 0" /></svg>';
    const second = '<svg id="b" color="#000" aria-labelledby="b-title"><title>Two</title><path fill="#abcdef" d="M0 0" /></svg>';
    expect(duplicateSvgKey(first)).toBe(duplicateSvgKey(second));
    expect(duplicateSvgKey(first)).not.toBe(duplicateSvgKey('<svg><path d="M1 0" /></svg>'));
    expect(duplicateSvgKey(null)).toBe("");
  });

  test("SVG 规范化补齐可访问性元数据和 currentColor，同时保留显式样式", () => {
    const svg = [
      '<?xml version="1.0"?>',
      '<svg viewBox="0 0 24 24" role="presentation" color="red" aria-labelledby="old">',
      "<title>old title</title><desc>old description</desc>",
      '<path d="M0 0"/><circle stroke="black" cx="1" cy="1" r="1"/>',
      "</svg>",
    ].join("");
    const result = normalizeSvg(svg, {
      id: "lucide-save",
      name: "Save & Export",
      categoryLabel: "通用命令",
      sourceLabel: "Test <Source>",
      sourceName: "save-file",
      license: "MIT",
    });

    expect(result).not.toContain('<?xml');
    expect(result).toContain('<svg viewBox="0 0 24 24" color="#2563eb" role="img" aria-labelledby="lucide-save-title lucide-save-desc">');
    expect(result).toContain('<title id="lucide-save-title">Save &amp; Export</title>');
    expect(result).toContain('<desc id="lucide-save-desc">通用命令 - Test &lt;Source&gt; - save-file - MIT</desc>');
    expect(result).toContain('<path fill="currentColor" d="M0 0"/>');
    expect(result).toContain('<circle stroke="black" cx="1" cy="1" r="1"/>');
    expect(result).not.toContain("old title");
    expect(result).not.toContain("old description");
  });

  test("许可声明收集和匹配支持字符串、对象及正则策略", () => {
    expect(
      packageLicenseDeclarations({
        license: "MIT",
        licenses: ["ISC", { type: "Apache-2.0" }, { name: "ignored" }],
      }),
    ).toEqual(["MIT", "ISC", "Apache-2.0"]);
    expect(packageLicenseDeclarations({ licenses: null })).toEqual([]);

    expect(packageLicenseMatches({ license: "MIT" }, { license: "mit" })).toBe(true);
    expect(packageLicenseMatches({ licenses: [{ type: "Apache-2.0" }] }, { license: "Apache" })).toBe(true);
    expect(
      packageLicenseMatches(
        { license: "MIT OR GPL-3.0" },
        { license: "GPL-3.0", packageLicensePattern: /MIT\s+OR\s+GPL-3\.0/ },
      ),
    ).toBe(true);
    expect(packageLicenseMatches({ license: "ISC" }, { license: "MIT" })).toBe(false);
  });
});
