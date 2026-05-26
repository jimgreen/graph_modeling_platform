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

  test("exports rotated and mirrored device geometry while text and image layers stay upright", () => {
    const generator = createDefaultNode("ac-source", { x: 160, y: 140 });
    generator.rotation = 90;
    generator.scaleX = -1.5;
    generator.scaleY = 2;

    const svg = buildSvgDocument([generator], [], { width: 360, height: 260 });

    expect(svg).toContain('class="export-node" transform="translate(160 140)"');
    expect(svg).toContain('class="export-node-geometry" transform="rotate(90) scale(-1.5 2)"');
    expect(svg).toContain('class="export-node-upright-content" transform="scale(1.5 2)"');
    expect(svg).toContain('class="export-terminal ac" transform="translate(42 0) scale(-0.6666666666666666 0.5)"');
    expect(svg).toContain('matrix(0 -0.75 -1.33333 0 0 0)');
    expect(svg).toContain(">AC</text>");
  });

  test("exports three-winding transformer with a distinct three-coil glyph", () => {
    const twoWinding = createDefaultNode("ac-transformer", { x: 140, y: 120 });
    const threeWinding = createDefaultNode("ac-three-winding-transformer", { x: 140, y: 120 });

    const twoWindingSvg = buildSvgDocument([twoWinding], [], { width: 320, height: 240 });
    const threeWindingSvg = buildSvgDocument([threeWinding], [], { width: 320, height: 240 });

    expect(twoWindingSvg).not.toContain("three-winding-transformer-glyph");
    expect(threeWindingSvg).toContain("three-winding-transformer-glyph");
    expect(threeWindingSvg.match(/class="transformer-winding"/g)?.length).toBe(3);
    expect(threeWindingSvg).toContain('class="export-terminal ac" transform="translate(-52 -8) scale(1 1)"');
    expect(threeWindingSvg).toContain('class="export-terminal ac" transform="translate(52 -8) scale(1 1)"');
    expect(threeWindingSvg).toContain('class="export-terminal ac" transform="translate(0 38) scale(1 1)"');
  });
});
