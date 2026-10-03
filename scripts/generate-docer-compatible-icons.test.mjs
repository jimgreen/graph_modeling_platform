import { describe, expect, test } from "vitest";
import {
  cleanReusableSvgInnerContent,
  compactDocerHas,
  compactDocerLabel,
  formatSvgNumber,
  gCircle,
  gLine,
  gPath,
  gRect,
  gText,
  parseSvgViewBox,
  renderSvg,
  wrapReusableSvg,
} from "./generate-docer-compatible-icons.mjs";

describe("generate-docer-compatible-icons 纯函数", () => {
  test("按图标条目长度选择紧凑标签，并支持大小写不敏感关键词匹配", () => {
    expect(compactDocerLabel(["wind", "风力发电机", "wind", "turbine", "风机"])).toBe("风机");
    expect(compactDocerLabel(["bus", "母线"])).toBe("母线");
    expect(compactDocerLabel(["bus", "母线"])).toHaveLength(2);
    expect(compactDocerHas(["solar", "PV panel"], "pv")).toBe(true);
    expect(compactDocerHas(["solar", "PV panel"], "WIND")).toBe(false);
  });

  test("组装基础 SVG 图元时保留坐标和属性", () => {
    expect(gPath("M0 0h1")).toContain('<path d="M0 0h1"');
    expect(gLine(1, 2, 3, 4)).toContain('<path d="M1 2L3 4"');
    expect(gRect(4, 5, 6, 7, 2)).toContain('x="4" y="5" width="6" height="7" rx="2"');
    expect(gCircle(8, 9, 3)).toContain('cx="8" cy="9" r="3"');
    expect(gText("A&B", 10, 11, 12)).toContain(">A&amp;B</text>");
  });

  test("解析有效 viewBox，缺失或非法尺寸时回退到宽高", () => {
    expect(parseSvgViewBox('viewBox="1, 2, 80, 40"')).toEqual({
      x: 1,
      y: 2,
      width: 80,
      height: 40,
    });
    expect(parseSvgViewBox('width="120" height="32"')).toEqual({
      x: 0,
      y: 0,
      width: 120,
      height: 32,
    });
    expect(parseSvgViewBox('viewBox="0 0 0 10" width="90" height="0"')).toEqual({
      x: 0,
      y: 0,
      width: 90,
      height: 64,
    });
    expect(parseSvgViewBox("width=\"invalid\" height=\"invalid\"")).toEqual({
      x: 0,
      y: 0,
      width: 64,
      height: 64,
    });
  });

  test("格式化 SVG 数字时按四位小数舍入并去除多余零", () => {
    expect(formatSvgNumber(1.23456)).toBe("1.2346");
    expect(formatSvgNumber(2)).toBe("2");
    expect(formatSvgNumber(-0.00004)).toBe("0");
  });

  test("清理复用 SVG 的无障碍元数据和固定颜色", () => {
    const cleaned = cleanReusableSvgInnerContent(`
      <title>remove</title>
      <desc>remove</desc>
      <path color="#123" aria-labelledby="title" role="img" fill="#abc" stroke="#def" d="M0 0" />
      <path fill="none" stroke="currentColor" />
      <path fill="transparent" stroke="transparent" />
    `);

    expect(cleaned).not.toContain("<title");
    expect(cleaned).not.toContain("<desc");
    expect(cleaned).not.toContain("aria-labelledby");
    expect(cleaned).not.toContain("role=");
    expect(cleaned).toContain('fill="currentColor"');
    expect(cleaned).toContain('stroke="currentColor"');
    expect(cleaned).toContain('fill="none"');
    expect(cleaned).toContain('fill="transparent"');
  });

  test("渲染普通图标并转义标题、描述和正文", () => {
    const svg = renderSvg(
      { id: "demo", name: "A&B", color: "#123456", tags: ["x", "y"], body: "  <path d=\"M0 0\" />  " },
      { id: "category", label: "分类", description: "" },
    );

    expect(svg).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(svg).toContain('viewBox="0 0 64 64"');
    expect(svg).toContain("<title id=\"demo-title\">A&amp;B</title>");
    expect(svg).toContain("分类 - x, y");
    expect(svg).toContain('<path d="M0 0" />');
  });

  test("复用 SVG 时按尺寸居中缩放、清理内容并生成稳定输出", () => {
    const source = '<svg viewBox="10 20 100 50"><title>old</title><path fill="#abc" d="M0 0" /></svg>';
    const icon = { id: "demo", name: "图标 &", color: "#123456" };
    const category = { id: "category", label: "分类" };

    const first = wrapReusableSvg(source, icon, category, "Source <x>");
    const second = wrapReusableSvg(source, icon, category, "Source <x>");

    expect(first).toBe(second);
    expect(first).toContain('transform="translate(3.2 10.4) scale(0.48)"');
    expect(first).toContain("<title id=\"demo-title\">图标 &amp;</title>");
    expect(first).toContain("分类 - 复用 Source &lt;x&gt;");
    expect(first).not.toContain("<title>old</title>");
    expect(first).toContain('fill="currentColor"');
    expect(first).toContain('M46 46h14v14H46z');
  });

  test("源 SVG 缺少根元素时拒绝复用", () => {
    expect(() => wrapReusableSvg("<path />", { id: "demo", name: "图标", color: "#000" }, { id: "category", label: "分类" }, "source"))
      .toThrow("Invalid reusable SVG for category/demo");
  });
});
