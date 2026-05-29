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

  test("exports automatic storage tank internal connector lines for bus endpoints", () => {
    const source = createDefaultNode("heat-source", { x: 100, y: 120 });
    const tank = createDefaultNode("thermal-storage-tank", { x: 260, y: 120 });
    const edges: Edge[] = [
      {
        id: "heat-edge",
        sourceId: source.id,
        targetId: tank.id,
        sourceTerminalId: "t1",
        targetTerminalId: "t1",
        targetPoint: { x: 197, y: 120 }
      }
    ];

    const svg = buildSvgDocument([source, tank], edges, { width: 420, height: 260 });

    expect(svg).toContain('class="export-boundary-bus-internal-connector"');
    expect(svg).toContain('x1="197" y1="120" x2="207" y2="120"');
    expect(svg).toContain('stroke="#dc2626"');
  });

  test("exports energy buses as square ended rectangles", () => {
    const buses = [
      createDefaultNode("ac-bus", { x: 120, y: 120 }),
      createDefaultNode("dc-bus", { x: 240, y: 120 }),
      createDefaultNode("hydrogen-bus", { x: 360, y: 120 }),
      createDefaultNode("heat-bus", { x: 480, y: 120 })
    ];

    const svg = buildSvgDocument(buses, [], { width: 640, height: 260 });

    expect(svg.match(/<rect class="bus-glyph"/g)?.length).toBe(4);
    expect(svg).not.toContain('<line class="bus-glyph"');
    expect(svg).not.toContain('class="bus-glyph" x1=');
    expect(svg).not.toContain('stroke-linecap="round"');
    expect(svg).not.toContain('rx="');
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

  test("exports terminal stubs with terminal color and scaled device line style", () => {
    const acLine = createDefaultNode("ac-line", { x: 160, y: 120 });
    acLine.scaleX = 2;
    acLine.scaleY = 0.5;
    acLine.params = {
      ...acLine.params,
      foregroundColor: "#123456",
      lineWidth: "4",
      strokeStyle: "dashed"
    };

    const svg = buildSvgDocument([acLine], [], { width: 360, height: 240 });
    const terminalStubLine = svg.split("\n").find((line) => line.includes("export-terminal-stub ac")) ?? "";

    expect(svg).toContain('class="export-terminal-stub ac"');
    expect(svg).toContain('transform="translate(56 0) scale(0.5 2)"');
    expect(svg).toContain('x1="-52" y1="0" x2="0" y2="0" stroke="#2563eb" stroke-width="2" stroke-linecap="round" stroke-dasharray="10 6"');
    expect(terminalStubLine).not.toContain("vector-effect");
    expect(svg).not.toContain('class="export-terminal-stub ac" x1="-48" y1="0" x2="0" y2="0" stroke="#123456"');
  });

  test("exports converter terminals farther away from the device border", () => {
    const converter = createDefaultNode("dcdc-converter", { x: 160, y: 120 });

    const svg = buildSvgDocument([converter], [], { width: 360, height: 240 });

    expect(svg).toContain('class="export-terminal dc" transform="translate(-68 0) scale(1 1)"');
    expect(svg).toContain('class="export-terminal dc" transform="translate(68 0) scale(1 1)"');
    expect(svg).toContain('x1="36" y1="0" x2="0" y2="0" stroke="#0f766e"');
    expect(svg).toContain('x1="-36" y1="0" x2="0" y2="0" stroke="#0f766e"');
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
    expect(svg).toContain('class="export-terminal ac" transform="translate(44.66667 0) scale(-0.6666666666666666 0.5)"');
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
    expect(threeWindingSvg).toContain('class="export-terminal ac" transform="translate(-56 -8) scale(1 1)"');
    expect(threeWindingSvg).toContain('class="export-terminal ac" transform="translate(56 -8) scale(1 1)"');
    expect(threeWindingSvg).toContain('class="export-terminal ac" transform="translate(0 42) scale(1 1)"');
  });

  test("exports distinct AC and DC electrolyzer glyphs", () => {
    const acElectrolyzer = createDefaultNode("ac-electrolyzer", { x: 140, y: 120 });
    const dcElectrolyzer = createDefaultNode("dc-electrolyzer", { x: 300, y: 120 });

    const svg = buildSvgDocument([acElectrolyzer, dcElectrolyzer], [], { width: 460, height: 260 });

    expect(svg).toContain("ac-electrolyzer-glyph");
    expect(svg).toContain("dc-electrolyzer-glyph");
    expect(svg).toContain("ac-wave-marker");
    expect(svg).toContain("dc-battery-marker");
  });

  test("exports distinct AC and DC fuel cell glyphs", () => {
    const acFuelCell = createDefaultNode("ac-fuel-cell", { x: 140, y: 120 });
    const dcFuelCell = createDefaultNode("dc-fuel-cell", { x: 300, y: 120 });

    const svg = buildSvgDocument([acFuelCell, dcFuelCell], [], { width: 460, height: 260 });

    expect(svg).toContain("ac-fuel-cell-glyph");
    expect(svg).toContain("dc-fuel-cell-glyph");
    expect(svg).toContain("fuel-cell-ac-wave-marker");
    expect(svg).toContain("fuel-cell-dc-battery-marker");
  });

  test("exports distinct single and two-port heat source glyphs", () => {
    const singleBoiler = createDefaultNode("heat-boiler", { x: 120, y: 120 });
    const twoPortBoiler = createDefaultNode("two-port-heat-boiler", { x: 260, y: 120 });
    const singleSource = createDefaultNode("heat-source", { x: 120, y: 220 });
    const twoPortSource = createDefaultNode("two-port-heat-source", { x: 260, y: 220 });

    const svg = buildSvgDocument([singleBoiler, twoPortBoiler, singleSource, twoPortSource], [], { width: 420, height: 340 });

    expect(svg).toContain("single-heat-boiler-glyph");
    expect(svg).toContain("two-port-heat-boiler-glyph");
    expect(svg).toContain("single-heat-source-glyph");
    expect(svg).toContain("two-port-heat-source-glyph");
    expect(svg).toContain("two-port-heat-flow-marker");
    expect(svg).toContain("two-port-heat-return-marker");
    expect(svg).toContain('class="two-port-heat-flow-marker" d="M -30 -12 H -18 M -25 -16 L -31 -12 L -25 -8"');
    expect(svg).toContain('class="two-port-heat-return-marker" d="M 18 12 H 30 M 25 8 L 19 12 L 25 16"');
  });

  test("exports distinct two three and four-port heat exchanger glyphs", () => {
    const twoPort = createDefaultNode("heat-exchanger", { x: 120, y: 120 });
    const threePort = createDefaultNode("three-port-heat-exchanger", { x: 260, y: 120 });
    const fourPort = createDefaultNode("four-port-heat-exchanger", { x: 400, y: 120 });

    const svg = buildSvgDocument([twoPort, threePort, fourPort], [], { width: 540, height: 260 });

    expect(svg).toContain("heat-exchanger-two-glyph");
    expect(svg).toContain("heat-exchanger-three-glyph");
    expect(svg).toContain("heat-exchanger-four-glyph");
    expect(svg).toContain("three-port-heat-exchanger-branch");
    expect(svg).toContain("four-port-heat-exchanger-left-branch");
    expect(svg).toContain("four-port-heat-exchanger-right-branch");
    expect(svg).toContain('class="three-port-heat-exchanger-supply-arrow" d="M 31 -15 H 38 M 32 -19 L 38 -15 L 32 -11"');
    expect(svg).toContain('class="three-port-heat-exchanger-return-arrow" d="M 31 15 H 38 M 34 11 L 28 15 L 34 19"');
    expect(svg).toContain('class="four-port-heat-exchanger-left-supply-arrow" d="M -38 -15 H -31 M -37 -19 L -31 -15 L -37 -11"');
    expect(svg).toContain('class="four-port-heat-exchanger-left-return-arrow" d="M -31 15 H -38 M -32 11 L -38 15 L -32 19"');
    expect(svg).toContain('class="four-port-heat-exchanger-right-supply-arrow" d="M 31 -15 H 38 M 32 -19 L 38 -15 L 32 -11"');
    expect(svg).toContain('class="four-port-heat-exchanger-right-return-arrow" d="M 31 15 H 38 M 34 11 L 28 15 L 34 19"');
  });

  test("exports distinct electric heater glyphs by electric type and heat port count", () => {
    const acHeater = createDefaultNode("ac-heater", { x: 120, y: 120 });
    const acTwoPortHeater = createDefaultNode("ac-two-port-heater", { x: 280, y: 120 });
    const dcHeater = createDefaultNode("dc-heater", { x: 120, y: 240 });
    const dcTwoPortHeater = createDefaultNode("dc-two-port-heater", { x: 280, y: 240 });

    const svg = buildSvgDocument([acHeater, acTwoPortHeater, dcHeater, dcTwoPortHeater], [], { width: 440, height: 360 });

    expect(svg).toContain("ac-heat-electric-heater-glyph");
    expect(svg).toContain("ac-two-port-heat-electric-heater-glyph");
    expect(svg).toContain("dc-heat-electric-heater-glyph");
    expect(svg).toContain("dc-two-port-heat-electric-heater-glyph");
    expect(svg).toContain("heater-ac-wave-marker");
    expect(svg).toContain("heater-dc-battery-marker");
    expect(svg).toContain("heater-two-port-heat-marker");
    expect(svg).toContain('class="heater-two-port-supply-marker" d="M 23 -13 H 34 M 29 -17 L 35 -13 L 29 -9"');
    expect(svg).toContain('class="heater-two-port-return-marker" d="M 23 13 H 34 M 29 9 L 23 13 L 29 17"');
  });

  test("exports distinct single and two-port heat load glyphs", () => {
    const singleLoad = createDefaultNode("single-port-heat-load", { x: 140, y: 120 });
    const twoPortLoad = createDefaultNode("two-port-heat-load", { x: 300, y: 120 });

    const svg = buildSvgDocument([singleLoad, twoPortLoad], [], { width: 460, height: 260 });

    expect(svg).toContain("single-heat-load-glyph");
    expect(svg).toContain("two-port-heat-load-glyph");
    expect(svg).toContain("heat-load-single-marker");
    expect(svg).toContain("heat-load-two-port-marker");
    expect(svg).toContain('class="heat-load-two-port-marker" d="M -30 -13 H -17 M -23 -17 L -17 -13 L -23 -9 M 17 13 H 30 M 24 9 L 31 13 L 24 17"');
  });
});
