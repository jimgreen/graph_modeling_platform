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

  test("名称 token 化对空值输入返回空数组，而不是入参的字面量", () => {
    // 覆盖 `String(value || "")` 的右臂：右臂只在入参为 falsy 时求值，
    // 所以这里必须传 falsy 而非空串以外的自然输入。
    // 删掉 `|| ""` 后 String(null) 变成 "null"，token 变成 ["null"]，断言立即转红。
    expect(nameTokens(null)).toEqual([]);
    expect(nameTokens(undefined)).toEqual([]);
    expect(nameTokens(0)).toEqual([]);
    expect(nameTokens(false)).toEqual([]);
    expect(nameTokens("")).toEqual([]);
    // 对照组：真实字符串仍要正常切分，排除「整体恒返回空数组」的退化夹具。
    expect(nameTokens("cloudy-data-center")).toEqual(["cloudy", "data", "center"]);
  });

  test("空 pattern 不匹配任何名称，避免空模式被当成全命中", () => {
    const tokens = nameTokens("cloudy-data-center");
    // 空串、纯空白、纯分隔符三种写法都会让 patternTokens 变成空数组。
    expect(tokenMatchesPattern(tokens, "")).toBe(false);
    expect(tokenMatchesPattern(tokens, "   ")).toBe(false);
    expect(tokenMatchesPattern(tokens, "---")).toBe(false);
    expect(tokenMatchesPattern(tokens, "__")).toBe(false);
    // 对照组：非空 pattern 对同一批 token 仍要能命中，证明上面不是「一律 false」。
    expect(tokenMatchesPattern(tokens, "cloud")).toBe(true);
    expect(tokenMatchesPattern(tokens, "data center")).toBe(true);
  });

  test("多词 pattern 记 6 分、单词 pattern 记 4 分，未命中记 0 分", () => {
    expect(categoryMatchScore("cloudy-data-center", ["data center"])).toBe(6);
    expect(categoryMatchScore("cloudy-data-center", ["cloud"])).toBe(4);
    expect(categoryMatchScore("cloudy-data-center-backup", ["data center", "backup"])).toBe(10);
    expect(categoryMatchScore("cloudy-data-center", ["rain"])).toBe(0);
  });

  test("空名称不被当作 null/undefined 字面量参与拒绝匹配", () => {
    // 覆盖 `String(name || "")` 的右臂。断言刻意成对：
    // 左半断言 falsy 名称不命中，右半用同样两条正则去匹配真实字符串并要求命中，
    // 以证明右半不是「正则本身失效」，左半的 false 来自归一化而不是来自正则。
    expect(categoryRejectsName(null, [/null/])).toBe(false);
    expect(categoryRejectsName(undefined, [/undefined/])).toBe(false);
    expect(categoryRejectsName(0, [/^0$/])).toBe(false);
    expect(categoryRejectsName(false, [/^false$/])).toBe(false);
    expect(categoryRejectsName("", [/undefined/])).toBe(false);

    expect(categoryRejectsName("null", [/null/])).toBe(true);
    expect(categoryRejectsName("undefined", [/undefined/])).toBe(true);
    expect(categoryRejectsName("0", [/^0$/])).toBe(true);
    expect(categoryRejectsName("false", [/^false$/])).toBe(true);
  });

  test("分类拒绝名单先于分类匹配生效，被拒绝的名称不落到任何分类", () => {
    // 覆盖 classifyIcon 里的 denyPatterns 早退：被拒名称本身含有一个能命中的 pattern，
    // 所以去掉拒绝名单后它们会各自落到一个分类上，断言从 null 变成分类对象。
    expect(classifyIcon("paper-plane")).toBeNull();
    expect(classifyIcon("air-balloon")).toBeNull();
    expect(classifyIcon("ice-cream")).toBeNull();
    expect(classifyIcon("transmission-lte")).toBeNull();
    // 对照组：剥掉拒绝词之后的同源名称必须能命中同一个分类。
    expect(classifyIcon("plane")?.category.id).toBe("transport-facilities");
    expect(classifyIcon("air")?.category.id).toBe("weather-environment");
    expect(classifyIcon("ice")?.category.id).toBe("cooling-heating-energy");
    expect(classifyIcon("transmission")?.category.id).toBe("power-grid-electrical");
  });

  test("分类打分取最高分：后出现的高分替换已有最优，低分不夺走最优", () => {
    // 覆盖 `!best || score > best.score` 的右臂：需要同一个名称同时命中两个分类。
    // power-plant-generator 先以 power=4 落进 power-grid-electrical，
    // 随后 generation-link 以 power+plant+generator=12 夺走最优。
    const better = classifyIcon("power-plant-generator");
    expect(better?.category.id).toBe("generation-link");
    expect(better?.score).toBe(12);

    // 反向对照：power-grid-transformer 里 power-grid-electrical=12 先到，
    // 之后的 generation-link 只有 power=4，比较为假，最优分类保持不变。
    const earlier = classifyIcon("power-grid-transformer");
    expect(earlier?.category.id).toBe("power-grid-electrical");
    expect(earlier?.score).toBe(12);
  });
});
