import { describe, expect, test } from "vitest";
import { buildSvgDocument } from "./App";
import { createDefaultNode, type Edge } from "./model";

describe("SVG export", () => {
  test("exports the actual device glyph markup for built-in devices", () => {
    const generator = createDefaultNode("ac-source", { x: 120, y: 120 });
    const dcGenerator = createDefaultNode("dc-source", { x: 190, y: 120 });
    const converter = createDefaultNode("acdc-converter", { x: 260, y: 120 });
    const breaker = createDefaultNode("ac-breaker", { x: 260, y: 120 });

    const svg = buildSvgDocument([generator, dcGenerator, converter, breaker], [], { width: 500, height: 300 });

    expect(svg).not.toContain(">G<");
    expect(svg).not.toContain(">AC/DC<");
    expect(svg).not.toContain(">DC/DC<");
    expect(svg).not.toContain(">AC/AC<");
    expect(svg).toContain(">AC<");
    expect(svg).toContain(">DC<");
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

  test("exports connection line colors by terminal energy type", () => {
    const acSource = createDefaultNode("ac-source", { x: 120, y: 120 });
    const acLoad = createDefaultNode("ac-load", { x: 240, y: 120 });
    const dcSource = createDefaultNode("dc-source", { x: 120, y: 220 });
    const dcLoad = createDefaultNode("dc-load", { x: 240, y: 220 });
    const edges: Edge[] = [
      { id: "ac-edge", sourceId: acSource.id, targetId: acLoad.id, sourceTerminalId: "t1", targetTerminalId: "t1" },
      { id: "dc-edge", sourceId: dcSource.id, targetId: dcLoad.id, sourceTerminalId: "t1", targetTerminalId: "t1" }
    ];

    const svg = buildSvgDocument([acSource, acLoad, dcSource, dcLoad], edges, { width: 500, height: 300 });

    expect(svg).toContain('stroke="#2563eb"');
    expect(svg).toContain('stroke="#0f766e"');
  });
});
