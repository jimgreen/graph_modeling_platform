import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { buildSvgDocument } from "./svg";
import { SVG_BASELINE_EDGES, SVG_BASELINE_FIXTURE, SVG_BASELINE_NODES } from "./fixtures/svg-baseline";

export function hashSvg(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

// 去 JSX 重构前的基线哈希：Task 11-12 重写 DeviceGlyph/staticRenderUtils 后输出必须逐字节一致。
export const SVG_BASELINE_HASH = "0746af735d3a368e08f1487e9f59566e60ab336cbf7b829b902a84715f5cdae6";

describe("SVG 导出基线", () => {
  test("输出哈希与基线一致", () => {
    const svg = buildSvgDocument(SVG_BASELINE_NODES as any, SVG_BASELINE_EDGES as any, SVG_BASELINE_FIXTURE as any);
    // 防空洞 golden：输出必须非平凡（长度 + 母排 glyph + 根 svg + 至少一条线路 path），否则哈希断言没有保护作用。
    expect(svg.length).toBeGreaterThan(2000);
    expect(svg).toContain("<svg");
    expect(svg).toContain("bus-glyph");
    expect(svg).toContain('id="edge-1"');
    expect(hashSvg(svg)).toBe(SVG_BASELINE_HASH);
  });

  test("导出可读基线文件", () => {
    if (process.env.WRITE_SVG_BASELINE !== "1") return;
    const svg = buildSvgDocument(SVG_BASELINE_NODES as any, SVG_BASELINE_EDGES as any, SVG_BASELINE_FIXTURE as any);
    writeFileSync(new URL("./fixtures/svg-baseline.svg", import.meta.url), svg, "utf8");
  });
});
