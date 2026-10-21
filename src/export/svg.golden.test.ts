import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { buildSvgDocument } from "./svg";
import { SVG_BASELINE_EDGES, SVG_BASELINE_FIXTURE, SVG_BASELINE_NODES } from "./fixtures/svg-baseline";

export function hashSvg(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

// 去 JSX 重构前的基线哈希：Task 11-12 重写 DeviceGlyph/staticRenderUtils 后输出必须逐字节一致。
// 2026-09-21 变更：terminal 锚点 class 升级为 "terminal terminal-anchor"（锚点实现抽取为
// buildSymbolTerminalAnchorMarkup，与图元 Symbol 导出共用；单类 .terminal-anchor 选择器仍命中）。
// 2026-10-21 变更：图元填充两种主题下一律透明（用户要求：除盒型开关外设备填充全透明），
// 基线里 bus-glyph 的 fill="#eef2ff" 与 electric-load-glyph 的 fill="#ffffff" 都变成 "transparent"，
// 逐字节 diff 只有这两处，其余不变。
export const SVG_BASELINE_HASH = "2dae99733f916499590e6ac4df8dcc3da34be9893434e906499ff908d340e0a9";

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
