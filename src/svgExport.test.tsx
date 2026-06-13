import { describe, expect, test } from "vitest";
import { buildSvgDocument } from "./App";
import { createDefaultNode, createNodeFromTemplate, DEVICE_LIBRARY, type DeviceKind, type DeviceTemplate, type Edge } from "./model";
import type { ProjectMeasurementConfig } from "./measurements";

describe("SVG export", () => {
  test("escapes custom canvas background image href", () => {
    const svg = buildSvgDocument([], [], {
      width: 320,
      height: 180,
      backgroundColor: "#ffffff",
      backgroundImage: 'data/images/bg?id=1&name=a"b'
    });

    expect(svg).toContain('href="data/images/bg?id=1&amp;name=a&quot;b"');
    expect(svg).not.toContain('href="data/images/bg?id=1&name=a"b"');
  });

  test("exports backend image hrefs as embedded base64 data urls while keeping svg images inline", () => {
    const node = {
      ...createDefaultNode("static-image", { x: 120, y: 90 }),
      id: "image-node"
    };
    node.params = {
      ...node.params,
      backgroundImage: "/api/images/node-bg",
      foregroundImage: "/api/images/node-fg"
    };
    const svg = buildSvgDocument([node], [], {
      width: 320,
      height: 180,
      backgroundColor: "#ffffff",
      backgroundImage: "/api/images/canvas-bg",
      imageExportPathById: {
        "canvas-bg": "data:image/png;base64,Y2FudmFzLWJn",
        "node-bg": "data:image/jpeg;base64,bm9kZS1iZw==",
        "node-fg": "data:image/svg+xml;utf8,%3Csvg%20viewBox%3D%220%200%2010%2010%22%3E%3Cpath%20class%3D%22inline-fg-shape%22%20d%3D%22M0%200H10V10H0Z%22%2F%3E%3C%2Fsvg%3E"
      }
    });

    expect(svg).toContain('href="data:image/png;base64,Y2FudmFzLWJn"');
    expect(svg).toContain('href="data:image/jpeg;base64,bm9kZS1iZw=="');
    expect(svg).toContain('class="export-inline-svg-image node-foreground-image"');
    expect(svg).toContain('class="inline-fg-shape"');
    expect(svg).not.toContain('href="data:image/svg+xml');
    expect(svg).not.toContain("http://127.0.0.1:5173");
    expect(svg).not.toContain('href="/api/images/');
    expect(svg).not.toContain('href="data/images/');
  });

  test("keeps svg node background images as svg markup in exported svg", () => {
    const node = {
      ...createDefaultNode("static-image", { x: 120, y: 90 }),
      id: "svg-background-node"
    };
    node.params = {
      ...node.params,
      backgroundImage: "/api/images/vector-bg"
    };
    const svg = buildSvgDocument([node], [], {
      width: 320,
      height: 180,
      backgroundColor: "#ffffff",
      imageExportPathById: {
        "vector-bg": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAxNiI+PGcgY2xhc3M9InZlY3Rvci1kZXZpY2UtYmciPjxwYXRoIGQ9Ik0xIDFIMjNWMTVIMVoiLz48L2c+PC9zdmc+"
      }
    });

    expect(svg).toContain('class="export-inline-svg-image node-background-image"');
    expect(svg).toContain('class="vector-device-bg"');
    expect(svg).toContain('viewBox="0 0 24 16"');
    expect(svg).not.toContain('href="data:image/svg+xml');
  });

  test("keeps backend image api hrefs when embedded image data is unavailable", () => {
    const svg = buildSvgDocument([], [], {
      width: 320,
      height: 180,
      backgroundColor: "#ffffff",
      backgroundImage: "/api/images/missing-bg?id=1"
    });

    expect(svg).toContain('href="/api/images/missing-bg?id=1"');
    expect(svg).not.toContain('href="data/images/');
  });

  test("exports custom multi-state visual overrides from template definitions", () => {
    const template: DeviceTemplate = {
      ...DEVICE_LIBRARY.find((item) => item.kind === "ac-switch")!,
      kind: "custom-export-state-switch" as DeviceKind,
      label: "导出多状态开关",
      custom: true,
      params: { component_type: "ACSwitch" },
      stateDefinitions: [
        { value: "0", name: "打开", text: "OFF", color: "#ef4444" },
        { value: "1", name: "闭合", text: "ON", color: "#22c55e" },
        { value: "2", name: "检修", text: "M", color: "#f59e0b", image: "maint.svg" }
      ]
    };
    const node = {
      ...createNodeFromTemplate(template, { x: 140, y: 120 }),
      id: "custom-state-node"
    };
    node.params.status = "2";

    const svg = buildSvgDocument([node], [], { width: 300, height: 240, deviceTemplates: [template] });

    expect(svg).toContain("#f59e0b");
    expect(svg).toContain(">M<");
    expect(svg).toContain('href="maint.svg"');
  });

  test("exports template-compatible root, defs, typed layers and unique ids", () => {
    const generator = { ...createDefaultNode("ac-source", { x: 120, y: 140 }), id: "source-1" };
    const load = { ...createDefaultNode("ac-load", { x: 280, y: 140 }), id: "load-1" };
    const edges: Edge[] = [
      { id: "edge-1", sourceId: generator.id, targetId: load.id, sourceTerminalId: "t1", targetTerminalId: "t1" }
    ];

    const svg = buildSvgDocument([generator, load], edges, { width: 420, height: 260 });

    expect(svg).toContain('<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" preserveAspectRatio="xMidYMid meet" height="100%" width="100%" viewBox="0,0,420,260"');
    expect(svg.indexOf("<defs")).toBeGreaterThan(svg.indexOf("<svg"));
    expect(svg.indexOf("<defs")).toBeLessThan(svg.indexOf('<g id="root_g">'));
    expect(svg).toContain('<g id="root_g">');
    expect(svg).toContain('<g id="Segment_Layer">');
    expect(svg).toContain('<g id="ACGenerator_Layer"');
    expect(svg).toContain('<g id="ACLoad_Layer"');
    expect(svg).toContain('<g id="Measurement_Layer">');
    expect(svg).toContain('<g id="Other_Layer">');
    expect(svg).toContain('<symbol id="symbol_ACGenerator_source-1"');
    expect(svg).toContain(`viewBox="${-generator.size.width / 2} ${-generator.size.height / 2} ${generator.size.width} ${generator.size.height}" overflow="visible"`);
    expect(svg).toContain(`<use id="source-1" class="export-node" href="#symbol_ACGenerator_source-1" xlink:href="#symbol_ACGenerator_source-1" x="${generator.position.x - generator.size.width / 2}" y="${generator.position.y - generator.size.height / 2}" width="${generator.size.width}" height="${generator.size.height}"`);
    expect(svg).toContain('data-export-node-id="source-1"');
    expect(svg.indexOf('<g id="Segment_Layer">')).toBeGreaterThan(svg.indexOf('<g id="root_g">'));

    expect(svg.indexOf('<g id="ACGenerator_Layer"')).toBeGreaterThan(svg.indexOf('<g id="root_g">'));
    expect(svg.indexOf('<g id="Other_Layer">')).toBeGreaterThan(svg.indexOf('<g id="ACGenerator_Layer"'));

    const ids = Array.from(svg.matchAll(/\sid="([^"]+)"/g), (match) => match[1]);
    expect(new Set(ids).size).toBe(ids.length);
  });

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

  test("exports routable line-like device glyphs as thick saved paths", () => {
    const line = createDefaultNode("ac-routable-line", { x: 180, y: 120 });

    const svg = buildSvgDocument([line], [], { width: 360, height: 240 });

    expect(svg).toContain("routable-line-device-glyph");
    expect(svg).toContain('stroke-width="4"');
  });

  test("exports bus-connected tank devices as tank glyphs instead of plain bus lines", () => {
    const hydrogenTank = createDefaultNode("hydrogen-tank", { x: 180, y: 120 });
    const horizontalHydrogenTank = createDefaultNode("hydrogen-tank-horizontal", { x: 320, y: 120 });
    const containerHydrogenTank = createDefaultNode("hydrogen-tank-container", { x: 460, y: 120 });
    const thermalTank = createDefaultNode("thermal-storage-tank", { x: 620, y: 120 });

    const svg = buildSvgDocument([hydrogenTank, horizontalHydrogenTank, containerHydrogenTank, thermalTank], [], { width: 760, height: 300 });

    expect(svg).toContain(">H2<");
    expect(svg).toContain('transform="scale(1.5)"');
    expect(svg).toContain("C -33.333333333333336 -23.333333333333332");
    expect(svg).toContain('rx="18"');
    expect(svg).toContain("M -42 -23.333333333333332 V 23.333333333333332");
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
    expect(svg).toMatch(/class="export-boundary-bus-internal-connector" x1="[\d.-]+" y1="120" x2="[\d.-]+" y2="120"/);
    expect(svg).toContain('stroke="#dc2626"');
  });

  test("exports device labels and dynamic measurements with positioned refresh metadata", () => {
    const load = { ...createDefaultNode("ac-load", { x: 140, y: 100 }), id: "load-export", name: "负荷A" };
    load.params = {
      ...load.params,
      idx: "LOAD-1",
      _labelText: "LOAD-1",
      _labelX: "10",
      _labelY: "64",
      _labelColor: "#111111",
      _labelFontSize: "14"
    };
    const measurements: ProjectMeasurementConfig = {
      version: 1,
      groups: [
        {
          id: "group-1",
          nodeId: load.id,
          visible: true,
          labelVisible: true,
          unitVisible: true,
          backgroundColor: "#ffffff",
          borderColor: "#94a3b8",
          borderWidth: 1,
          borderStyle: "solid",
          anchor: "custom",
          offset: { x: 40, y: -30 },
          layout: "vertical",
          items: [
            {
              id: "m-active",
              name: "P主",
              measurementTypeId: "activePower",
              sourcePoint: "load-export.activePower",
              visible: true,
              unitOverride: "kW"
            }
          ]
        }
      ]
    };

    const svg = buildSvgDocument([load], [], { width: 320, height: 220, measurements });

    expect(svg).toContain('data-export-device-id="load-export"');
    expect(svg).toContain('data-export-device-idx="LOAD-1"');
    expect(svg).toContain('idx="LOAD-1"');
    expect(svg).toContain('name="负荷A"');
    expect(svg).toContain('class="export-node-label horizontal" transform="translate(10 64)"');
    expect(svg).toContain(">LOAD-1</text>");
    expect(svg).toContain('class="export-measurement-group measurement-group" conn-dev="load-export" transform="translate(180 70)"');
    expect(svg).toContain('data-export-measurement-name="P主"');
    expect(svg).toContain('data-export-measurement-source-point="load-export.activePower"');
    expect(svg).toContain('data-export-measurement-unit="kW"');
    expect(svg).toContain('class="export-measurement-label measurement-label"');
    expect(svg).toContain('class="export-measurement-value measurement-value"');
    expect(svg).toContain('class="export-measurement-unit measurement-unit"');
    expect(svg).toContain('data-export-measurement-text-role="label"');
    expect(svg).toContain('data-export-measurement-text-role="value"');
    expect(svg).toContain('data-export-measurement-text-role="unit"');
    expect(svg).toContain('data-export-measurement-value="1"');
    expect(svg).toContain('measure_type="activePower"');
    const valueText = svg.match(/<text id="measurement_m-active_value" class="export-measurement-value measurement-value"[^>]*>--<\/text>/)?.[0] ?? "";
    expect(valueText).toContain('data-export-device-id="load-export"');
    expect(valueText).toContain('data-export-device-idx="LOAD-1"');
    expect(valueText).toContain('data-export-device-name="负荷A"');
    expect(valueText).toContain('data-export-measurement-type-id="activePower"');
    expect(valueText).toContain('data-export-measurement-name="P主"');
    expect(svg).toContain(">P</text>");
    expect(svg).toContain(">kW</text>");
    expect(svg).not.toContain(">P -- kW</text>");
  });

  test("exports static layer buttons with standalone SVG layer switching logic", () => {
    const layerA = { id: "layer-a", name: "一次系统", visible: true };
    const layerB = { id: "layer-b", name: "二次系统", visible: false };
    const source = { ...createDefaultNode("ac-source", { x: 120, y: 120 }), id: "source-a", layerId: layerA.id };
    const load = { ...createDefaultNode("ac-load", { x: 280, y: 120 }), id: "load-b", layerId: layerB.id };
    const layerButton = {
      ...createDefaultNode("static-button", { x: 120, y: 220 }),
      id: "button-b",
      layerId: layerA.id,
      params: {
        ...createDefaultNode("static-button", { x: 0, y: 0 }).params,
        text: "显示二次",
        buttonEnabled: "1",
        buttonActionType: "layer",
        buttonTargetLayerId: layerB.id,
        buttonTargetLayerName: layerB.name
      }
    };
    const edges: Edge[] = [
      { id: "cross-layer-edge", sourceId: source.id, targetId: load.id, sourceTerminalId: "t1", targetTerminalId: "t1" }
    ];

    const svg = buildSvgDocument([source, load, layerButton], edges, {
      width: 420,
      height: 280,
      layers: [layerA, layerB],
      activeLayerId: layerA.id
    });

    expect(svg).toContain('data-export-layer-def="layer-b"');
    expect(svg).toContain('data-export-layer-visible="0"');
    expect(svg).toContain('data-export-node-id="load-b"');
    expect(svg).toContain('data-export-layer-id="layer-b"');
    expect(svg).toContain('data-export-edge-id="cross-layer-edge"');
    expect(svg).toContain('data-export-source-layer-id="layer-a"');
    expect(svg).toContain('data-export-target-layer-id="layer-b"');
    expect(svg).toContain('data-export-button-action="layer"');
    expect(svg).toContain('data-export-button-target-layer-id="layer-b"');
    expect(svg).toContain("function exportSvgApplyLayerVisibility");
    expect(svg).toContain("function exportSvgActivateLayer");
    expect(svg).toContain("addEventListener(\"click\"");
    expect(svg.indexOf("<script")).toBeGreaterThan(svg.indexOf('data-export-button-action="layer"'));
  });

  test("keeps static group-box header line clear of the title text", () => {
    const group = createDefaultNode("static-group-box", { x: 180, y: 140 });
    group.size = { width: 220, height: 120 };
    group.params = {
      ...group.params,
      text: "分组",
      fontSize: "16",
      padding: "12"
    };

    const svg = buildSvgDocument([group], [], { width: 360, height: 260 });
    const headerRule = svg.match(/class="static-group-box-header-rule" d="M ([\d.-]+) ([\d.-]+) H ([\d.-]+)"/);

    expect(headerRule).not.toBeNull();
    expect(Number(headerRule?.[1])).toBeGreaterThan(-70);
    expect(svg).not.toContain('d="M -98 -36 H 98"');
  });

  test("keeps intentionally empty static symbol text empty instead of falling back to defaults", () => {
    const toolbarNode = createDefaultNode("static-toolbar-node", { x: 160, y: 120 });
    toolbarNode.name = "默认工具条节点";
    toolbarNode.params = { ...toolbarNode.params, text: "" };
    const button = createDefaultNode("static-button", { x: 160, y: 220 });
    button.name = "默认按钮节点";
    button.params = { ...button.params, text: "" };

    const svg = buildSvgDocument([toolbarNode, button], [], { width: 360, height: 320 });

    expect(svg).not.toMatch(/<tspan[^>]*>默认工具条节点<\/tspan>/);
    expect(svg).not.toMatch(/<tspan[^>]*>工具条节点<\/tspan>/);
    expect(svg).not.toMatch(/<text[^>]*>默认按钮节点<\/text>/);
    expect(svg).not.toMatch(/<text[^>]*>按钮<\/text>/);
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

  test("exports AC and DC electric loads with smaller vertical bodies", () => {
    const acLoad = createDefaultNode("ac-load", { x: 160, y: 120 });
    const dcLoad = createDefaultNode("dc-load", { x: 320, y: 120 });
    const svg = buildSvgDocument([acLoad, dcLoad], [], { width: 480, height: 260 });
    const glyphScale = Math.max(1, Math.max(acLoad.size.width, acLoad.size.height) / 100);
    const designWidth = acLoad.size.width / glyphScale;
    const designHeight = acLoad.size.height / glyphScale;
    const bodyHalfWidth = designWidth * 2 / 9;
    const bodyHalfHeight = designHeight * 2 / 9;
    const bodyPath = `M ${-bodyHalfWidth} ${-bodyHalfHeight} L ${bodyHalfWidth} ${-bodyHalfHeight} L 0 ${bodyHalfHeight} Z`;

    expect(acLoad.size).toEqual({ width: 150, height: 102 });
    expect(dcLoad.size).toEqual(acLoad.size);
    expect(svg.match(/class="electric-load-glyph"/g)?.length).toBe(2);
    expect(svg.match(new RegExp(`d="${bodyPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`, "g"))?.length).toBe(2);
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
    expect(svg).toContain('scale(0.5 2)"');
    expect(terminalStubLine).toContain('stroke="#2563eb"');
    expect(terminalStubLine).toContain('stroke-width="2"');
    expect(terminalStubLine).toContain('stroke-dasharray="10 6"');
    expect(terminalStubLine).not.toContain("vector-effect");
    expect(svg).not.toContain('class="export-terminal-stub ac" x1="-48" y1="0" x2="0" y2="0" stroke="#123456"');
  });

  test("exports converter terminals farther away from the device border", () => {
    const converter = createDefaultNode("dcdc-converter", { x: 160, y: 120 });

    const svg = buildSvgDocument([converter], [], { width: 360, height: 240 });

    expect(svg.match(/class="export-terminal dc"/g)?.length).toBe(2);
    expect(svg).toMatch(/class="export-terminal dc" transform="translate\(-[\d.]+ 0\) scale\(1 1\)"/);
    expect(svg).toMatch(/class="export-terminal dc" transform="translate\([\d.]+ 0\) scale\(1 1\)"/);
    expect(svg).toContain('stroke="#0f766e"');
  });

  test("exports rotated and mirrored device geometry while image and terminal layers follow transforms", () => {
    const generator = createDefaultNode("ac-source", { x: 160, y: 140 });
    generator.rotation = 90;
    generator.scaleX = -1.5;
    generator.scaleY = 2;

    const svg = buildSvgDocument([generator], [], { width: 360, height: 260 });

    expect(svg).toMatch(new RegExp(`<use id="[^"]+" class="export-node"[^>]*href="#symbol_ACGenerator_[^"]+"[^>]*x="${generator.position.x - generator.size.width / 2}" y="${generator.position.y - generator.size.height / 2}" width="${generator.size.width}" height="${generator.size.height}"`));
    expect(svg).toContain('class="export-node-geometry" transform="rotate(90) scale(-1.5 2)"');
    expect(svg).toContain('class="export-node-upright-content" transform="rotate(90) scale(-1.5 2)"');
    expect(svg).toMatch(/class="export-terminal ac" transform="translate\([\d.]+ 0\) scale\(-0\.6666666666666666 0\.5\)"/);
    expect(svg).toContain('matrix(0 -0.86603 -1.1547 0 0 0)');
    expect(svg).not.toContain('matrix(0 -0.75 -1.33333 0 0 0)');
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
    expect(threeWindingSvg.match(/class="export-terminal ac"/g)?.length).toBe(3);
    expect(threeWindingSvg).toMatch(/class="export-terminal ac" transform="translate\(-[\d.]+ -[\d.]+\) scale\(1 1\)"/);
    expect(threeWindingSvg).toMatch(/class="export-terminal ac" transform="translate\([\d.]+ -[\d.]+\) scale\(1 1\)"/);
    expect(threeWindingSvg).toMatch(/class="export-terminal ac" transform="translate\(0 [\d.]+\) scale\(1 1\)"/);
  });

  test("exports neutral-point three-winding transformer with four visible terminals", () => {
    const transformer = createDefaultNode("ac-three-winding-transformer-neutral", { x: 160, y: 140 });

    const svg = buildSvgDocument([transformer], [], { width: 360, height: 280 });

    expect(svg).toContain("three-winding-transformer-neutral-glyph");
    expect(svg.match(/class="transformer-winding"/g)?.length).toBe(3);
    expect(svg.match(/class="export-terminal ac"/g)?.length).toBe(4);
    expect(svg).toMatch(/class="export-terminal ac" transform="translate\(-[\d.]+ -[\d.]+\) scale\(1 1\)"/);
    expect(svg).toMatch(/class="export-terminal ac" transform="translate\([\d.]+ -[\d.]+\) scale\(1 1\)"/);
    expect(svg).toMatch(/class="export-terminal ac" transform="translate\(0 [\d.]+\) scale\(1 1\)"/);
    expect(svg).toMatch(/class="export-terminal ac" transform="translate\(0 -[\d.]+\) scale\(1 1\)"/);
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
    expect(svg).toContain('class="three-port-heat-exchanger-supply-arrow"');
    expect(svg).toContain('class="three-port-heat-exchanger-return-arrow"');
    expect(svg).toContain('class="four-port-heat-exchanger-left-supply-arrow"');
    expect(svg).toContain('class="four-port-heat-exchanger-left-return-arrow"');
    expect(svg).toContain('class="four-port-heat-exchanger-right-supply-arrow"');
    expect(svg).toContain('class="four-port-heat-exchanger-right-return-arrow"');
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
    expect(svg).toContain('class="heater-two-port-supply-marker"');
    expect(svg).toContain('class="heater-two-port-return-marker"');
  });

  test("exports distinct single and two-port heat load glyphs", () => {
    const singleLoad = createDefaultNode("single-port-heat-load", { x: 140, y: 120 });
    const twoPortLoad = createDefaultNode("two-port-heat-load", { x: 300, y: 120 });

    const svg = buildSvgDocument([singleLoad, twoPortLoad], [], { width: 460, height: 260 });

    expect(svg).toContain("single-heat-load-glyph");
    expect(svg).toContain("two-port-heat-load-glyph");
    expect(svg).toContain("heat-load-single-marker");
    expect(svg).toContain("heat-load-two-port-marker");
    expect(svg).toContain('d="M -22.22222222222222 -15.11111111111111 L 22.22222222222222 -15.11111111111111 L 0 15.11111111111111 Z"');
    expect(svg).toContain('width="53.333333333333336" height="32"');
    expect(svg).toContain('d="M -9 -4 H 9 M -7 2 H 7 M -5 8 H 5"');
    expect(svg).toContain('class="heat-load-single-marker" d="M 20 -18 V -6 M 15 -11 L 20 -6 L 25 -11"');
    expect(svg).toContain('class="heat-load-two-port-marker" d="M -30 -13 H -17 M -23 -17 L -17 -13 L -23 -9 M 17 13 H 30 M 24 9 L 31 13 L 24 17"');
  });

  test("exports hydrogen load body at two thirds of the previous main structure size", () => {
    const load = createDefaultNode("hydrogen-load", { x: 140, y: 120 });

    const svg = buildSvgDocument([load], [], { width: 300, height: 220 });

    expect(svg).toContain('d="M -22.22222222222222 -15.11111111111111 L 22.22222222222222 -15.11111111111111 L 0 15.11111111111111 Z"');
  });
});
