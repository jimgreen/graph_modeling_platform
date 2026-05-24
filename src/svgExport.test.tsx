import { describe, expect, test } from "vitest";
import { buildSvgDocument } from "./App";
import { createDefaultNode } from "./model";

describe("SVG export", () => {
  test("exports the actual device glyph markup for built-in devices", () => {
    const generator = createDefaultNode("ac-source", { x: 120, y: 120 });
    const breaker = createDefaultNode("ac-breaker", { x: 260, y: 120 });

    const svg = buildSvgDocument([generator, breaker], [], { width: 500, height: 300 });

    expect(svg).toContain(">G<");
    expect(svg).toContain("<circle");
    expect(svg).toContain("<rect");
    expect(svg).toContain("<path");
    expect(svg).toContain("export-terminal-stub ac");
    expect(svg).toContain("export-terminal-dot ac");
  });

  test("exports bus-connected tank devices as tank glyphs instead of plain bus lines", () => {
    const hydrogenTank = createDefaultNode("hydrogen-tank", { x: 180, y: 120 });
    const thermalTank = createDefaultNode("thermal-storage-tank", { x: 320, y: 120 });

    const svg = buildSvgDocument([hydrogenTank, thermalTank], [], { width: 500, height: 300 });

    expect(svg).toContain(">H2<");
    expect(svg).toContain("C -42 -29");
    expect(svg).toContain("M -10 -1 C -4 4 -4 9 -10 14");
  });
});
