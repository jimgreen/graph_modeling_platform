import { afterEach, describe, expect, test, vi } from "vitest";
import { buildSvgDocument } from "./App";
import { createExportEFile, createExportSvg } from "./appExtracted/appDeviceDefinitionFactories";
import { createDefaultNode, createNodeFromTemplate, DEFAULT_COLOR_PALETTE, DEVICE_LIBRARY, getTerminalPoint, type DeviceKind, type DeviceTemplate, type Edge } from "./model";
import type { ProjectMeasurementConfig } from "./measurements";

describe("SVG export", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const svgSectionBetween = (svg: string, start: string, end: string) => {
    const startIndex = svg.indexOf(start);
    const endIndex = svg.indexOf(end);
    if (startIndex < 0 || endIndex < 0 || endIndex <= startIndex) {
      return "";
    }
    return svg.slice(startIndex, endIndex);
  };

  const svgDefsSection = (svg: string) => svg.match(/<defs[^>]*>[\s\S]*?<\/defs>/)?.[0] ?? "";
  const svgUseTags = (svg: string) => Array.from(svg.matchAll(/<use\b[^>]*>/g), (match) => match[0]);
  const svgDeviceUseTag = (svg: string, id: string) =>
    svg.match(new RegExp(`<use id="${id}"(?=\\s|/?>)[^>]*>`))?.[0] ?? "";
  const svgEdgeGroupTag = (svg: string, id: string) =>
    svg.match(new RegExp(`<path id="[^"]+" class="export-edge[^"]*" edge-id="${id}"[^>]*>`))?.[0] ?? "";

  test("downloads SVG exports in voltage color mode", async () => {
    const buildDocument = vi.fn((_nodes: unknown, _edges: unknown, _options: unknown) => "<svg/>");
    const saveTextFile = vi.fn(async () => true);
    const alert = vi.fn();
    const writeOperationLog = vi.fn();
    vi.stubGlobal("window", { alert });
    const exportSvg = createExportSvg({
      DEFAULT_CANVAS_BACKGROUND: "#ffffff",
      activeLayerId: "default-layer",
      backgroundPageRender: null,
      buildSvgDocument: buildDocument,
      canvasBackgroundColor: "#ffffff",
      canvasBackgroundImageUrl: "",
      canvasBounds: { width: 320, height: 180 },
      colorDisplayMode: "energy",
      colorPalette: DEFAULT_COLOR_PALETTE,
      edges: [],
      ensureSavedBeforeExport: () => true,
      layers: [],
      libraryTemplates: DEVICE_LIBRARY,
      loadSvgImageExportPathById: async () => ({}),
      measurementConfig: undefined,
      nodes: [],
      projectMeasurements: { groups: [] },
      projectName: "voltage-export",
      safeFilePart: (value: string) => value,
      saveTextFile,
      writeOperationLog
    });

    await exportSvg();

    expect(buildDocument).toHaveBeenCalledOnce();
    expect(buildDocument.mock.calls[0]?.[2]).toMatchObject({ colorDisplayMode: "voltage" });
    expect(saveTextFile).toHaveBeenCalledOnce();
    expect(writeOperationLog).toHaveBeenCalledWith("导出图形文件：voltage-export.svg");
    expect(alert).toHaveBeenCalledWith("SVG 文件导出成功：voltage-export.svg");
  });

  test("does not report SVG export success when saving is cancelled", async () => {
    const alert = vi.fn();
    const writeOperationLog = vi.fn();
    vi.stubGlobal("window", { alert });
    const exportSvg = createExportSvg({
      DEFAULT_CANVAS_BACKGROUND: "#ffffff",
      activeLayerId: "default-layer",
      backgroundPageRender: null,
      buildSvgDocument: vi.fn(() => "<svg/>"),
      canvasBackgroundColor: "#ffffff",
      canvasBackgroundImageUrl: "",
      canvasBounds: { width: 320, height: 180 },
      colorPalette: DEFAULT_COLOR_PALETTE,
      edges: [],
      ensureSavedBeforeExport: () => true,
      layers: [],
      libraryTemplates: DEVICE_LIBRARY,
      loadSvgImageExportPathById: async () => ({}),
      measurementConfig: undefined,
      nodes: [],
      projectMeasurements: { groups: [] },
      projectName: "cancelled-export",
      safeFilePart: (value: string) => value,
      saveTextFile: vi.fn(async () => false),
      writeOperationLog
    });

    await exportSvg();

    expect(writeOperationLog).not.toHaveBeenCalled();
    expect(alert).not.toHaveBeenCalled();
  });

  test("reports successful E file export after saving completes", async () => {
    const alert = vi.fn();
    const writeOperationLog = vi.fn();
    const buildEFileExport = vi.fn(() => ({ filename: "模型.e", text: "<Model/>", mime: "text/plain" }));
    vi.stubGlobal("window", { alert });
    const exportEFile = createExportEFile({
      activeSchemeKey: "scheme-1",
      buildEFileExport,
      currentProject: () => ({ version: 1, name: "模型", nodes: [], edges: [] }),
      ensureSavedBeforeExport: () => true,
      getEExportWarnings: () => [],
      saveTextFile: vi.fn(async () => true),
      schemePathForScheme: () => ["主方案", "子方案"],
      writeOperationLog
    });

    await exportEFile();

    expect(writeOperationLog).toHaveBeenCalledWith("导出模型文件：模型.e");
    expect(alert).toHaveBeenCalledWith("E 文件导出成功：模型.e");
    expect(buildEFileExport).toHaveBeenCalledWith(expect.anything(), ["主方案", "子方案"]);
  });

  test("does not report E file export success when saving is cancelled", async () => {
    const alert = vi.fn();
    const writeOperationLog = vi.fn();
    vi.stubGlobal("window", { alert });
    const exportEFile = createExportEFile({
      buildEFileExport: () => ({ filename: "模型.e", text: "<PowerBase/>", mime: "text/plain" }),
      currentProject: () => ({ version: 1, name: "模型", nodes: [], edges: [] }),
      ensureSavedBeforeExport: () => true,
      getEExportWarnings: () => [],
      saveTextFile: vi.fn(async () => false),
      writeOperationLog
    });

    await exportEFile();

    expect(writeOperationLog).not.toHaveBeenCalled();
    expect(alert).not.toHaveBeenCalled();
  });

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

  test("embeds backend images referenced inside svg data url backgrounds", () => {
    const nestedSvg = [
      '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="160" viewBox="0 0 240 160">',
      '<image href="/api/images/nested-photo" x="0" y="0" width="240" height="160"/>',
      "</svg>"
    ].join("");
    const node = {
      ...createDefaultNode("static-text", { x: 120, y: 90 }),
      id: "nested-image-node"
    };
    node.params = {
      ...node.params,
      text: "文字",
      backgroundImage: `data:image/svg+xml;utf8,${encodeURIComponent(nestedSvg)}`
    };

    const svg = buildSvgDocument([node], [], {
      width: 320,
      height: 180,
      imageExportPathById: {
        "nested-photo": "data:image/png;base64,bmVzdGVkLXBob3Rv"
      }
    });

    expect(svg).toContain('href="data:image/png;base64,bmVzdGVkLXBob3Rv"');
    expect(svg).not.toContain('/api/images/nested-photo');
  });

  test("uses the node default image when its current status has no matching state definition", () => {
    const fallbackStateSvg = [
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 40">',
      '<text x="60" y="20">文字</text>',
      "</svg>"
    ].join("");
    const nestedImageSvg = [
      '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="160" viewBox="0 0 240 160">',
      '<image href="/api/images/current-photo" x="0" y="0" width="240" height="160"/>',
      "</svg>"
    ].join("");
    const template: DeviceTemplate = {
      ...DEVICE_LIBRARY.find((item) => item.kind === "static-text")!,
      kind: "custom-static-image-state" as DeviceKind,
      label: "状态图片",
      custom: true,
      params: { component_type: "StaticTextSymbol" },
      stateDefinitions: [
        {
          value: "0",
          name: "状态0",
          image: `data:image/svg+xml;utf8,${encodeURIComponent(fallbackStateSvg)}`
        }
      ]
    };
    const node = {
      ...createNodeFromTemplate(template, { x: 120, y: 90 }),
      id: "current-image-node"
    };
    node.params = {
      ...node.params,
      status: "1",
      text: "文字",
      backgroundImage: `data:image/svg+xml;utf8,${encodeURIComponent(nestedImageSvg)}`
    };

    const svg = buildSvgDocument([node], [], {
      width: 320,
      height: 180,
      deviceTemplates: [template],
      imageExportPathById: {
        "current-photo": "data:image/png;base64,Y3VycmVudC1waG90bw=="
      }
    });
    const useTag = svgDeviceUseTag(svg, "custom-static-image-state-1");

    expect(svg).toContain('id="symbol_StaticTextSymbol_custom-static-image-state_state_0"');
    expect(svg).toContain('id="symbol_StaticTextSymbol_custom-static-image-state_default"');
    expect(useTag).toContain('href="#symbol_StaticTextSymbol_custom-static-image-state_default"');
    expect(svg).toContain('href="data:image/png;base64,Y3VycmVudC1waG90bw=="');
    expect(svg).not.toContain('/api/images/current-photo');
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

  test("exports canvas and node image fit modes", () => {
    const node = {
      ...createDefaultNode("static-image", { x: 120, y: 90 }),
      id: "fit-node"
    };
    node.params = {
      ...node.params,
      backgroundImage: "node-bg.png",
      backgroundImageFit: "tile",
      foregroundImage: "node-fg.png",
      foregroundImageFit: "stretch"
    };

    const svg = buildSvgDocument([node], [], {
      width: 320,
      height: 180,
      backgroundColor: "#ffffff",
      backgroundImage: "canvas-bg.png",
      backgroundImageFit: "stretch"
    } as any);

    expect(svg).toContain('class="export-canvas-background-image"');
    expect(svg).toContain('preserveAspectRatio="none"');
    expect(svg).toContain("<pattern");
    expect(svg).toContain('class="node-background-image"');
    expect(svg).toContain('href="node-fg.png"');
  });

  test("exports the rendered background page under the current model graphics", () => {
    const backgroundBus = {
      ...createDefaultNode("ac-bus", { x: 160, y: 120 }),
      id: "background-bus",
      name: "背景母线"
    };
    backgroundBus.params = {
      ...backgroundBus.params,
      idx: "BG-1",
      _labelText: "背景母线"
    };
    const currentText = {
      ...createDefaultNode("static-text", { x: 160, y: 120 }),
      id: "current-title",
      name: "当前页面"
    };
    currentText.params = {
      ...currentText.params,
      text: "当前页面"
    };

    const svg = buildSvgDocument([currentText], [], {
      width: 320,
      height: 240,
      backgroundPage: {
        nodes: [backgroundBus],
        edges: [],
        backgroundBounds: { width: 640, height: 480 },
        backgroundColor: "#e2e8f0",
        transform: "translate(0 0) scale(0.5)"
      }
    } as any);

    const backgroundIndex = svg.indexOf('class="export-background-page-layer"');
    const currentNodeIndex = svg.indexOf('id="static-text-1"');

    expect(backgroundIndex).toBeGreaterThan(-1);
    expect(currentNodeIndex).toBeGreaterThan(backgroundIndex);
    expect(svg).toContain('class="export-background-page-frame"');
    expect(svg).toContain('fill="#e2e8f0"');
    const backgroundSymbolId = svg.match(/id="(export_bg_symbol_[^"]+_ac-bus_default)"/)?.[1] ?? "";
    expect(backgroundSymbolId).toBeTruthy();
    expect(svg).toContain(`href="#${backgroundSymbolId}"`);
    expect(svg).toContain('id="export_bg_background-bus"');
    expect(svg).toContain("背景母线");
    expect(svg).toContain("当前页面");
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

  test("deduplicates state symbols and exports all state definitions with state ids", () => {
    const openSwitch = createDefaultNode("ac-switch", { x: 120, y: 120 });
    openSwitch.id = "switch-open";
    openSwitch.params = { ...openSwitch.params, status: "0" };
    const closedSwitch = createDefaultNode("ac-switch", { x: 280, y: 120 });
    closedSwitch.id = "switch-closed";
    closedSwitch.params = { ...closedSwitch.params, status: "1" };

    const svg = buildSvgDocument([openSwitch, closedSwitch], [], { width: 420, height: 260 });
    const defs = svgDefsSection(svg);
    const useTags = svgUseTags(svg);

    expect(defs).toContain('<symbol id="symbol_ACSwitch_ac-switch_state_0"');
    expect(defs).toContain('<symbol id="symbol_ACSwitch_ac-switch_state_1"');
    expect(defs).not.toContain("switch-open");
    expect(defs).not.toContain("switch-closed");
    expect(defs.match(/<symbol id="symbol_ACSwitch_ac-switch_state_/g)).toHaveLength(2);
    expect(useTags).toHaveLength(2);
    expect(useTags[0]).toContain('href="#symbol_ACSwitch_ac-switch_state_0"');
    expect(useTags[1]).toContain('href="#symbol_ACSwitch_ac-switch_state_1"');
    for (const useTag of useTags) {
      expect(useTag).not.toContain("xlink:href");
      expect(useTag).not.toContain("data-export-node-id");
      expect(useTag).not.toContain("data-export-layer-id");
      expect(useTag).not.toContain("node-id=");
    }
    expect(useTags[0]).toContain('id="switch-open"');
    expect(useTags[0]).not.toContain('class=');
    expect(useTags[0]).toContain('layer-id="layer-default"');
    expect(useTags[0]).toContain('dev-id="switch-open"');
    expect(useTags[1]).toContain('id="switch-closed"');
    expect(useTags[1]).not.toContain('class=');
    expect(useTags[1]).toContain('layer-id="layer-default"');
    expect(useTags[1]).toContain('dev-id="switch-closed"');
    expect(svg).not.toContain('<g id="switch-open" class="export-device"');
    expect(svg).not.toContain('<g id="switch-closed" class="export-device"');
  });

  test("normalizes device ids from the export type and permanent index", () => {
    const first = { ...createDefaultNode("ac-box-breaker", { x: 120, y: 120 }), id: "ac-box-breaker-aakyra2" };
    first.params = { ...first.params, idx: "1", _labelText: "盒型开关-1" };
    const second = { ...createDefaultNode("ac-box-breaker", { x: 280, y: 120 }), id: "node-1783339759502-u3qq" };
    second.params = { ...second.params, idx: "2", _labelText: "盒型开关-2" };
    const third = { ...createDefaultNode("ac-box-breaker", { x: 440, y: 120 }), id: "node-1783657543903-bm6" };
    third.params = { ...third.params, idx: "3", _labelText: "盒型开关-3" };
    const edges: Edge[] = [
      {
        id: "switch-edge",
        sourceId: first.id,
        targetId: second.id,
        sourceTerminalId: "t2",
        targetTerminalId: "t1"
      }
    ];

    const svg = buildSvgDocument([first, second, third], edges, { width: 600, height: 260 });

    for (const [index, node] of [first, second, third].entries()) {
      const exportId = `ACBreak-${index + 1}`;
      const useTag = svgDeviceUseTag(svg, exportId);
      expect(useTag).toContain(`id="${exportId}"`);
      expect(useTag).toContain(`dev-id="${exportId}"`);
      expect(useTag).toContain(`idx="${index + 1}"`);
      expect(useTag).toContain('dev-kind="ac-box-breaker"');
      expect(svg).not.toContain(`dev-id="${node.id}"`);
    }
    expect(svg).toContain('source-dev-id="ACBreak-1"');
    expect(svg).toContain('target-dev-id="ACBreak-2"');
    expect(svg).toContain('<text id="label_ACBreak-1"');
    expect(svg).not.toContain('id="label_node-1783339759502-u3qq"');
  });

  test("exports static graphics with stable semantic ids", () => {
    const first = { ...createDefaultNode("static-circle", { x: 120, y: 120 }), id: "node-static-b" };
    const second = { ...createDefaultNode("static-circle", { x: 280, y: 120 }), id: "node-static-a" };
    const customButton = {
      ...createDefaultNode("static-button", { x: 440, y: 120 }),
      id: "node-custom-static",
      kind: "custom-StaticButton-2" as DeviceKind,
      params: {
        ...createDefaultNode("static-button", { x: 0, y: 0 }).params,
        component_type: "StaticButton"
      }
    };

    const svg = buildSvgDocument([first, customButton, second], [], { width: 600, height: 260 });

    expect(svg).toContain('id="static-circle-1"');
    expect(svg).toContain('id="static-circle-2"');
    expect(svg).toContain('id="custom-StaticButton-2-1"');
    expect(svg).not.toContain('id="node-static-a"');
    expect(svg).not.toContain('id="node-static-b"');
    expect(svg).not.toContain('id="node-custom-static"');
  });

  test("exports topology node attributes on device uses without visible anchors", () => {
    const template: DeviceTemplate = {
      ...DEVICE_LIBRARY.find((item) => item.kind === "ac-switch")!,
      kind: "custom-export-connection-attrs" as DeviceKind,
      label: "导出端子连接属性",
      custom: true,
      size: { width: 160, height: 120 },
      terminalCount: 2,
      terminalTypes: ["ac", "ac"],
      terminalAnchors: [{ x: -0.5, y: 0 }, { x: 0.5, y: 0 }],
      params: { component_type: "ACSwitch" }
    };
    const source = {
      ...createDefaultNode("ac-source", { x: 60, y: 120 }),
      id: "source-node"
    };
    source.terminals[0].nodeNumber = "N_SOURCE";
    const node = {
      ...createNodeFromTemplate(template, { x: 140, y: 120 }),
      id: "custom-terminal-connection-node"
    };
    node.terminals[0].nodeNumber = "N_CUSTOM_IN";
    node.terminals[1].nodeNumber = "N_CUSTOM_OUT";
    const load = {
      ...createDefaultNode("ac-load", { x: 240, y: 120 }),
      id: "load-node"
    };
    load.terminals[0].nodeNumber = "N_LOAD";
    const edges: Edge[] = [
      { id: "source-device", sourceId: source.id, targetId: node.id, sourceTerminalId: "t1", targetTerminalId: "t1" },
      { id: "device-load", sourceId: node.id, targetId: load.id, sourceTerminalId: "t2", targetTerminalId: "t1" }
    ];

    const svg = buildSvgDocument([source, node, load], edges, { width: 320, height: 240, deviceTemplates: [template] });
    const sourceTag = svgDeviceUseTag(svg, source.id);
    const deviceTag = svgDeviceUseTag(svg, node.id);
    const loadTag = svgDeviceUseTag(svg, load.id);

    expect(sourceTag).toContain('node="N_SOURCE"');
    expect(sourceTag).not.toContain("node-id=");
    expect(sourceTag).not.toContain("node-1=");
    expect(sourceTag).not.toContain("node_1=");
    expect(deviceTag).toContain('node-1="N_CUSTOM_IN"');
    expect(deviceTag).toContain('node-2="N_CUSTOM_OUT"');
    expect(deviceTag).not.toContain("node_1=");
    expect(deviceTag).not.toContain("node_2=");
    expect(deviceTag).not.toContain(' node="');
    expect(deviceTag).not.toContain("node-id=");
    expect(deviceTag).not.toContain("inode=");
    expect(deviceTag).not.toContain("znode=");
    expect(loadTag).toContain('node="N_LOAD"');
    expect(loadTag).not.toContain("node-id=");
    expect(svg).not.toContain("export-node-terminals");
    expect(svg).not.toContain('class="export-terminal');
    expect(svg).not.toContain("data-terminal-id");
  });

  test("exports terminal connector strokes in device symbols without anchor dots", () => {
    const breaker = {
      ...createDefaultNode("ac-box-breaker-vertical", { x: 180, y: 160 }),
      id: "vertical-breaker"
    };
    const bus = {
      ...createDefaultNode("ac-bus", { x: 180, y: 70 }),
      id: "bus-node"
    };
    const edges: Edge[] = [
      { id: "breaker-bus", sourceId: breaker.id, targetId: bus.id, sourceTerminalId: "t1", targetTerminalId: "t1" }
    ];

    const svg = buildSvgDocument([breaker, bus], edges, { width: 360, height: 240 });

    expect(svg).not.toContain("export-device-connector");
    expect(svg).not.toContain("export-device-connector-layer");
    expect(svg).not.toContain("export-node-geometry");
    expect(svg).not.toContain("export-node-upright-content");
    expect(svg).toContain('<line x1=');
    expect(svg).not.toContain("export-terminal-stub");
    expect(svg).not.toContain("export-terminal-dot");
    expect(svg).not.toContain('class="export-terminal');
    expect(svg).not.toContain("data-terminal-id");
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
    expect(svg).toContain('<symbol id="symbol_ACGenerator_ac-source_default"');
    const defs = svgDefsSection(svg);
    expect(defs).toContain('<symbol id="symbol_ACGenerator_ac-source_default"');
    expect(defs).not.toContain("export-layer-definitions");
    expect(defs).not.toContain("data-export-layer-def");
    expect(svg).toContain('class="export-layer-definitions"');
    expect(svg.indexOf('class="export-layer-definitions"')).toBeGreaterThan(svg.indexOf('<g id="root_g">'));
    expect(svg).toContain(`viewBox="${-generator.size.width / 2} ${-generator.size.height / 2} ${generator.size.width} ${generator.size.height}" overflow="visible"`);
    expect(svg).toContain(`<use id="source-1" layer-id="layer-default"`);
    expect(svg).toContain(`dev-id="source-1"`);
    expect(svg).toContain(`dev-kind="ac-source"`);
    const generatorUseTag = svgDeviceUseTag(svg, "source-1");
    expect(generatorUseTag).not.toContain("transform=");
    expect(generatorUseTag).toContain(`href="#symbol_ACGenerator_ac-source_default" x="${generator.position.x - generator.size.width / 2}" y="${generator.position.y - generator.size.height / 2}" width="${generator.size.width}" height="${generator.size.height}"`);
    expect(svg).not.toContain(`<g id="source-1" class="export-device"`);
    expect(svg).not.toContain('data-export-node-id="source-1"');
    expect(svg).toContain('dev-id="source-1"');
    expect(svg).toContain('dev-kind="ac-source"');
    expect(svg).toContain('source-dev-id="source-1"');
    expect(svg).toContain('target-dev-id="load-1"');
    expect(svgEdgeGroupTag(svg, "edge-1")).toContain('edge-id="edge-1"');
    expect(svg).not.toMatch(/<g\b[^>]*class="export-edge"/);
    expect(svg).not.toContain('class="export-edge-path');
    expect(svgDeviceUseTag(svg, "source-1")).not.toContain("node-id=");
    expect(svg).not.toContain("data-export-device-id");
    expect(svg).not.toContain("data-export-device-idx");
    expect(svg).not.toContain("data-export-device-name");
    expect(svg).not.toContain("data-export-device-kind");
    expect(svgUseTags(svg).every((useTag) => !useTag.includes("xlink:href"))).toBe(true);
    expect(svg.indexOf('<g id="Segment_Layer">')).toBeGreaterThan(svg.indexOf('<g id="root_g">'));

    expect(svg.indexOf('<g id="ACGenerator_Layer"')).toBeGreaterThan(svg.indexOf('<g id="root_g">'));
    expect(svg.indexOf('<g id="Other_Layer">')).toBeGreaterThan(svg.indexOf('<g id="ACGenerator_Layer"'));

    const ids = Array.from(svg.matchAll(/\sid="([^"]+)"/g), (match) => match[1]);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("exports each device as a direct use without an extra device group", () => {
    const source = { ...createDefaultNode("ac-source", { x: 120, y: 140 }), id: "source-device" };
    const breaker = { ...createDefaultNode("ac-breaker", { x: 280, y: 140 }), id: "breaker-device" };

    const svg = buildSvgDocument([source, breaker], [], { width: 420, height: 260 });
    const sourceUseStart = svg.indexOf('<use id="source-device"');
    const breakerUseStart = svg.indexOf('<use id="breaker-device"');
    const sourceUseTag = svg.slice(sourceUseStart, svg.indexOf("/>", sourceUseStart) + 2);

    expect(sourceUseStart).toBeGreaterThan(-1);
    expect(breakerUseStart).toBeGreaterThan(sourceUseStart);
    expect(sourceUseTag).not.toContain("node-id=");
    expect(sourceUseTag).toContain('layer-id="layer-default"');
    expect(sourceUseTag).toContain('dev-id="source-device"');
    expect(sourceUseTag).toContain('href="#symbol_ACGenerator_ac-source_default"');
    expect(sourceUseTag).toContain('x="45" y="90"');
    expect(sourceUseTag).not.toContain("transform=");
    expect(sourceUseTag).not.toContain('class=');
    expect(svg).not.toContain('<g id="source-device" class="export-device"');
    expect(svg).not.toContain('<g id="breaker-device" class="export-device"');
    expect(svg).not.toContain("export-node-terminal-layer");
    expect(svg).not.toContain("export-node-terminals");
    expect(svg).not.toContain("export-terminal");
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
    expect(svg).not.toContain("export-terminal-stub");
    expect(svg).not.toContain("export-terminal-dot");
  });

  test("exports routable line-like device glyphs as thick saved paths", () => {
    const line = createDefaultNode("ac-routable-line", { x: 180, y: 120 });

    const svg = buildSvgDocument([line], [], { width: 360, height: 240 });
    const lineUseTag = svgDeviceUseTag(svg, line.id);

    expect(svg).toContain("routable-line-device-glyph");
    expect(svg).toContain('stroke-width="4"');
    expect(lineUseTag).toContain(`x="${line.position.x - line.size.width / 2}" y="${line.position.y - line.size.height / 2}"`);
    expect(lineUseTag).not.toContain("transform=");
  });

  test("exports a large saved-route model without rerouting every connection", () => {
    const nodes = Array.from({ length: 100 }, (_, index) => {
      const node = createDefaultNode("two-port-heat-boiler-vertical", {
        x: 100 + (index % 20) * 220,
        y: 100 + Math.floor(index / 20) * 260
      });
      node.id = `large-export-node-${index + 1}`;
      return node;
    });
    const edges: Edge[] = nodes.slice(0, -1).map((source, index) => {
      const target = nodes[index + 1];
      const start = getTerminalPoint(source, "t2");
      const end = getTerminalPoint(target, "t1");
      const midX = (start.x + end.x) / 2;
      const manualPoints = [{ x: midX, y: start.y }, { x: midX, y: end.y }];
      return {
        id: `large-export-edge-${index + 1}`,
        sourceId: source.id,
        targetId: target.id,
        sourceTerminalId: "t2",
        targetTerminalId: "t1",
        manualPoints,
        routePoints: [start, ...manualPoints, end]
      };
    });

    const startedAt = performance.now();
    const svg = buildSvgDocument(nodes, edges, {
      width: 4600,
      height: 1500,
      colorDisplayMode: "voltage"
    });
    const durationMs = performance.now() - startedAt;

    expect(svg.match(/class="export-edge/g)).toHaveLength(edges.length);
    expect(durationMs).toBeLessThan(2000);
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
    expect(svg).toMatch(/class="export-boundary-bus-internal-connector" edge-id="heat-edge"[^>]* x1="[\d.-]+" y1="120" x2="[\d.-]+" y2="120"/);
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
          groupStyleOverride: { color: "#2563eb", fontSize: 18 },
          items: [
            {
              id: "m-active",
              name: "P主",
              measurementTypeId: "activePower",
              sourcePoint: "load-export.activePower",
              visible: true,
              unitOverride: "kW",
              styleOverride: { color: "#dc2626" }
            }
          ]
        }
      ]
    };

    const svg = buildSvgDocument([load], [], { width: 320, height: 220, measurements });
    const deviceTag = svgDeviceUseTag(svg, load.id);

    expect(svg).toContain('dev-id="load-export"');
    expect(svg).toContain('idx="LOAD-1"');
    expect(svg).toContain('name="负荷A"');
    expect(deviceTag).toContain('dev-id="load-export"');
    expect(deviceTag).toContain('idx="LOAD-1"');
    expect(deviceTag).toContain('name="负荷A"');
    expect(deviceTag).not.toContain("dev-idx=");
    expect(deviceTag).not.toContain("dev-name=");
    expect(svg).toContain('<text id="label_load-export" layer-id="layer-default"');
    expect(svg).not.toContain('node-id="load-export"');
    expect(svg).not.toContain('class="export-node-label');
    const labelText = svg.match(/<text id="label_load-export"[^>]*>/)?.[0] ?? "";
    expect(labelText).toContain('x="150" y="164"');
    expect(labelText).not.toContain("transform=");
    expect(svg).toContain(">LOAD-1</text>");
    expect(svg).not.toContain('class="export-measurement-layer"');
    expect(svg).not.toContain('id="measurement_group-1"');
    expect(svg).toContain('class="mg" layer-id="layer-default" transform="translate(180 70)"');
    expect(svg).toContain('dev="load-export"');
    expect(svg).toContain('mf="load-export.activePower"');
    expect(svg).toContain('class="mv"');
    expect(svg).not.toContain('mn="P主"');
    expect(svg).not.toContain('mu="kW"');
    expect(svg).not.toContain('class="ml"');
    expect(svg).not.toContain('class="mu"');
    expect(svg).not.toContain('class="mg-bg"');
    expect(svg).not.toContain('动态量测</title>');
    expect(svg).not.toContain('m-text=');
    expect(svg).not.toContain('mv="1"');
    expect(svg).toContain('mt="activePower"');
    expect(svg).not.toContain('measure_type="activePower"');
    const measurementRow = svg.match(/<text\b[^>]*><tspan>P<\/tspan><tspan id="mv-load-export-m-active"[\s\S]*?<\/text>/)?.[0] ?? "";
    const valueText = measurementRow.match(/<tspan id="mv-load-export-m-active" class="mv"[^>]*>--<\/tspan>/)?.[0] ?? "";
    const unitText = measurementRow.match(/<tspan dx="[^"]+">kW<\/tspan>/)?.[0] ?? "";
    expect(measurementRow).toContain('<tspan>P</tspan>');
    expect(valueText).toContain('mid="m-active"');
    expect(valueText).toContain('mt="activePower"');
    expect(valueText).toContain('mf="load-export.activePower"');
    expect(measurementRow).toContain('fill="#dc2626"');
    expect(measurementRow).toContain('font-size="18"');
    expect(valueText).not.toContain('mn=');
    expect(valueText).not.toContain('mu=');
    expect(valueText).not.toContain('mg=');
    expect(valueText).not.toContain('term=');
    expect(valueText).not.toContain('dev="load-export"');
    expect(valueText).not.toContain('dev-id="load-export"');
    expect(valueText).not.toContain('idx="LOAD-1"');
    expect(valueText).not.toContain('name="负荷A"');
    expect(valueText).not.toContain('conn-dev="load-export"');
    expect(valueText).not.toContain("dev-idx=");
    expect(valueText).not.toContain("dev-name=");
    expect(unitText).toContain('dx="');
    expect(unitText).not.toContain(' x="');
    expect(svg).not.toContain('id="ml1"');
    expect(svg).not.toContain('id="mu1"');
    expect(svg).not.toContain("data-export-measurement-");
    expect(svg).not.toContain("data-export-device-id");
    expect(svg).not.toContain("data-export-device-idx");
    expect(svg).not.toContain("data-export-device-name");
    expect(svg).not.toContain("data-export-device-kind");
    expect(svg).not.toContain("export-measurement-label");
    expect(svg).not.toContain("export-measurement-value");
    expect(svg).not.toContain("export-measurement-unit");
    expect(svg).not.toContain("conn-dev=");
    expect(svg).not.toContain("dev-idx=");
    expect(svg).not.toContain("dev-name=");
    expect(svg).toContain(">P</tspan>");
    expect(svg).toContain(">kW</tspan>");
    expect(svg).not.toContain(">P -- kW</text>");
  });

  test("keys exported measurement metadata by the stable device id", () => {
    const load = { ...createDefaultNode("ac-load", { x: 140, y: 100 }), id: "ac-load-ja8lfjt", name: "交流负荷-2" };
    load.params = { ...load.params, idx: "2" };
    const measurements: ProjectMeasurementConfig = {
      version: 1,
      groups: [{
        id: `measurement-${load.id}`,
        nodeId: load.id,
        visible: true,
        anchor: "custom",
        offset: { x: 40, y: -30 },
        layout: "vertical",
        items: [{
          id: `measurement-${load.id}-reactivePower-1`,
          measurementTypeId: "reactivePower",
          sourcePoint: `${load.id}.reactivePower`,
          visible: true
        }]
      }]
    };

    const svg = buildSvgDocument([load], [], { width: 320, height: 220, measurements });
    const measurementLayer = svgSectionBetween(svg, '<g id="Measurement_Layer">', '<g id="Other_Layer">');

    expect(svgDeviceUseTag(svg, "ACLoad-2")).toContain('id="ACLoad-2"');
    expect(measurementLayer).toContain('mg="measurement-ACLoad-2"');
    expect(measurementLayer).toContain('dev="ACLoad-2"');
    expect(measurementLayer).toContain('id="mv-ACLoad-2-reactivePower-1"');
    expect(measurementLayer).toContain('mid="measurement-ACLoad-2-reactivePower-1"');
    expect(measurementLayer).toContain('mf="ACLoad-2.reactivePower"');
    expect(measurementLayer).not.toContain(load.id);
  });

  test("keeps device labels in Text_Layer and measurements in Measurement_Layer instead of defs", () => {
    const load = { ...createDefaultNode("ac-load", { x: 140, y: 100 }), id: "layered-text-load", name: "负荷A" };
    load.params = {
      ...load.params,
      idx: "LOAD-1",
      _labelText: "LOAD-1",
      _labelX: "10",
      _labelY: "64"
    };
    const measurements: ProjectMeasurementConfig = {
      version: 1,
      groups: [
        {
          id: "group-layered",
          nodeId: load.id,
          visible: true,
          labelVisible: true,
          unitVisible: true,
          anchor: "custom",
          offset: { x: 40, y: -30 },
          layout: "vertical",
          items: [
            {
              id: "m-layered",
              name: "P主",
              measurementTypeId: "activePower",
              sourcePoint: "layered-text-load.activePower",
              visible: true,
              unitOverride: "kW"
            }
          ]
        }
      ]
    };

    const svg = buildSvgDocument([load], [], { width: 320, height: 220, measurements });
    const defs = svgDefsSection(svg);
    const textLayer = svgSectionBetween(svg, '<g id="Text_Layer">', '<g id="Measurement_Layer">');
    const measurementLayer = svgSectionBetween(svg, '<g id="Measurement_Layer">', '<g id="Other_Layer">');

    expect(defs).not.toContain("export-node-label");
    expect(defs).not.toContain("LOAD-1");
    expect(defs).not.toContain("export-measurement-group");
    expect(defs).not.toContain("P主");
    expect(textLayer).not.toContain('class="export-node-label-layer"');
    expect(textLayer).not.toContain('<g id="label_layered-text-load"');
    expect(textLayer).not.toContain('<g class="export-node-label');
    expect(textLayer).toContain('<text id="label_layered-text-load" layer-id="layer-default"');
    expect(textLayer).toContain('layer-id="layer-default"');
    expect(textLayer).not.toContain('node-id="layered-text-load"');
    expect(textLayer).toContain('dev-id="layered-text-load"');
    expect(textLayer).toContain('idx="LOAD-1"');
    expect(textLayer).toContain('name="负荷A"');
    expect(textLayer).not.toContain("dev-idx=");
    expect(textLayer).not.toContain("dev-name=");
    expect(textLayer).toContain('x="150" y="164"');
    expect(textLayer).not.toContain('transform="translate(');
    expect(textLayer).toContain(">LOAD-1</text>");
    expect(measurementLayer).toContain('class="mg"');
    expect(measurementLayer).not.toContain('class="export-measurement-layer"');
    expect(measurementLayer).not.toContain('id="measurement_group-layered"');
    expect(measurementLayer).toContain('class="mg" layer-id="layer-default"');
    expect(measurementLayer).toContain('mf="layered-text-load.activePower"');
    expect(measurementLayer).not.toContain('mn="P主"');
    expect(measurementLayer).not.toContain('mv="1"');
    expect(measurementLayer).not.toContain('class="ml"');
    expect(measurementLayer).not.toContain('class="mu"');
    expect(measurementLayer).not.toContain('class="mg-bg"');
    expect(measurementLayer).not.toContain("data-export-measurement-");
  });

  test("exports measurement groups without explicit box styles as transparent and borderless", () => {
    const load = { ...createDefaultNode("ac-load", { x: 140, y: 100 }), id: "default-style-load" };
    const measurements: ProjectMeasurementConfig = {
      version: 1,
      groups: [{
        id: "default-style-group",
        nodeId: load.id,
        visible: true,
        anchor: "bottom",
        offset: { x: 0, y: 70 },
        layout: "vertical",
        items: [{
          id: "default-style-item",
          measurementTypeId: "activePower",
          sourcePoint: `${load.id}.activePower`,
          visible: true
        }]
      }]
    };

    const svg = buildSvgDocument([load], [], { width: 320, height: 240, measurements });
    const measurementLayer = svgSectionBetween(svg, '<g id="Measurement_Layer">', '<g id="Other_Layer">');

    expect(measurementLayer).toMatch(/<rect\b[^>]*fill="transparent"[^>]*stroke-width="0"/);
  });

  test("exports vertical device label tokens with absolute x and y coordinates", () => {
    const load = { ...createDefaultNode("ac-load", { x: 140, y: 100 }), id: "vertical-label-load" };
    load.params = {
      ...load.params,
      _labelText: "A1",
      _labelX: "10",
      _labelY: "64",
      _labelRotation: "90"
    };

    const svg = buildSvgDocument([load], [], { width: 320, height: 220 });
    const textLayer = svgSectionBetween(svg, '<g id="Text_Layer">', '<g id="Measurement_Layer">');
    const labelTokens = Array.from(
      textLayer.matchAll(/<text id="label_vertical-label-load_\d+"[^>]*>/g),
      (match) => match[0]
    );

    expect(labelTokens).toHaveLength(2);
    expect(labelTokens[0]).toContain('x="150" y="155.6"');
    expect(labelTokens[1]).toContain('x="150" y="172.4"');
    expect(labelTokens.every((token) => !token.includes("transform="))).toBe(true);
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

    expect(svg).toContain('active-layer-id="layer-a"');
    expect(svg).toContain('<g layer-id="layer-b" name="二次系统" visible="0" active="0"/>');
    expect(svg).not.toContain('data-export-node-id="load-b"');
    expect(svg).toContain('layer-id="layer-b"');
    expect(svg).toContain('edge-id="cross-layer-edge"');
    expect(svg).toContain('source-layer-id="layer-a"');
    expect(svg).toContain('target-layer-id="layer-b"');
    expect(svg).toContain('action="layer"');
    expect(svg).toContain('target-layer-id="layer-b"');
    expect(svg).not.toContain("data-export-");
    expect(svg).toContain("function exportSvgApplyLayerVisibility");
    expect(svg).toContain("function exportSvgActivateLayer");
    expect(svg).toContain("addEventListener(\"click\"");
    expect(svg.indexOf("<script")).toBeGreaterThan(svg.indexOf('action="layer"'));
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
    buses[0].id = "ac-bus-node-export";
    buses[0].nodeNumber = "N_BUS_1";

    const svg = buildSvgDocument(buses, [], { width: 640, height: 260 });

    expect(svg.match(/<rect class="bus-glyph"/g)?.length).toBe(4);
    expect(svg).not.toContain('<line class="bus-glyph"');
    expect(svg).not.toContain('class="bus-glyph" x1=');
    expect(svg).not.toContain('stroke-linecap="round"');
    expect(svg).not.toContain('rx="');
    expect(svgDeviceUseTag(svg, "ac-bus-node-export")).toContain('node="N_BUS_1"');
    expect(svgDeviceUseTag(svg, "ac-bus-node-export")).not.toContain("node-id=");
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

  test("exports voltage colors as reusable css classes", () => {
    const acSource = createDefaultNode("ac-source", { x: 120, y: 120 });
    const acLoad = createDefaultNode("ac-load", { x: 260, y: 120 });
    const acBus = createDefaultNode("ac-bus", { x: 380, y: 120 });
    const dcSource = createDefaultNode("dc-source", { x: 120, y: 220 });
    const dcLoad = createDefaultNode("dc-load", { x: 260, y: 220 });
    const dcBus = createDefaultNode("dc-bus", { x: 380, y: 220 });
    acSource.id = "ac-source-10";
    acLoad.id = "ac-load-10";
    acBus.id = "ac-bus-10";
    dcSource.id = "dc-source-750";
    dcLoad.id = "dc-load-750";
    dcBus.id = "dc-bus-750";
    acSource.terminals[0].vbase = "10";
    acLoad.terminals[0].vbase = "10";
    acBus.params.voltageLevel = "10 kV";
    dcSource.terminals[0].vbase = "750";
    dcLoad.terminals[0].vbase = "750";
    dcBus.params.voltageLevel = "750 V";
    const edges: Edge[] = [
      { id: "ac-10-edge", sourceId: acSource.id, targetId: acLoad.id, sourceTerminalId: "t1", targetTerminalId: "t1" },
      { id: "dc-750-edge", sourceId: dcSource.id, targetId: dcLoad.id, sourceTerminalId: "t1", targetTerminalId: "t1" }
    ];
    const colorPalette = {
      ...DEFAULT_COLOR_PALETTE,
      voltage: {
        ...DEFAULT_COLOR_PALETTE.voltage,
        "ac:10": "#ff0000",
        "dc:750": "#00aa88"
      }
    };

    const svg = buildSvgDocument([acSource, acLoad, acBus, dcSource, dcLoad, dcBus], edges, {
      width: 500,
      height: 320,
      colorDisplayMode: "voltage",
      colorPalette
    });
    const defs = svgDefsSection(svg);

    expect(defs).toContain('<style type="text/css"><![CDATA[');
    expect(defs).toContain("symbol{overflow:visible}");
    expect(defs).toContain(".kv10{fill:#ff0000;stroke:#ff0000;stroke-width:1;color:#ff0000}");
    expect(defs).toContain(".lkv10{fill:none;stroke:#ff0000;color:#ff0000}");
    expect(defs).toContain(".dcv750{fill:#00aa88;stroke:#00aa88;stroke-width:1;color:#00aa88}");
    expect(defs).toContain(".ldcv750{fill:none;stroke:#00aa88;color:#00aa88}");
    expect(defs).toContain('stroke="currentColor"');
    expect(svg).toContain('id="ac-source-10" class="kv10"');
    expect(svg).toContain('id="ac-bus-10" class="kv10"');
    expect(svg).toContain('id="dc-source-750" class="dcv750"');
    expect(svg).toContain('id="dc-bus-750" class="dcv750"');
    expect(svg).toContain('class="export-edge lkv10"');
    expect(svg).toContain('class="export-edge ldcv750"');
    for (const nodeId of ["ac-source-10", "ac-bus-10", "dc-source-750", "dc-bus-750"]) {
      expect(svgDeviceUseTag(svg, nodeId)).not.toContain("vbase");
      expect(svgDeviceUseTag(svg, nodeId)).not.toContain("voltage-type");
    }
    for (const edgeId of ["ac-10-edge", "dc-750-edge"]) {
      expect(svgEdgeGroupTag(svg, edgeId)).not.toContain("vbase");
      expect(svgEdgeGroupTag(svg, edgeId)).not.toContain("voltage-type");
    }
  });

  test("keeps per-terminal voltage metadata only for mixed-voltage devices in voltage color mode", () => {
    const uniformBreaker = createDefaultNode("ac-box-breaker", { x: 120, y: 120 });
    uniformBreaker.id = "uniform-breaker";
    uniformBreaker.terminals[0].vbase = "110";
    uniformBreaker.terminals[1].vbase = "110";
    const mixedConverter = createDefaultNode("dcdc-converter", { x: 280, y: 120 });
    mixedConverter.id = "mixed-converter";
    mixedConverter.terminals[0].vbase = "750";
    mixedConverter.terminals[1].vbase = "1500";

    const svg = buildSvgDocument([uniformBreaker, mixedConverter], [], {
      width: 420,
      height: 240,
      colorDisplayMode: "voltage"
    });
    const uniformTag = svgDeviceUseTag(svg, uniformBreaker.id);
    const mixedTag = svgDeviceUseTag(svg, mixedConverter.id);

    expect(uniformTag).toContain('class="kv110"');
    expect(uniformTag).not.toContain("vbase-");
    expect(uniformTag).not.toContain("voltage-type-");
    expect(mixedTag).toContain('class="dcv750"');
    expect(mixedTag).toContain('vbase-1="750"');
    expect(mixedTag).toContain('voltage-type-1="dc"');
    expect(mixedTag).toContain('vbase-2="1500"');
    expect(mixedTag).toContain('voltage-type-2="dc"');
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

  test("does not export terminal anchors when device geometry is scaled", () => {
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

    expect(svg).toContain('<g transform="rotate(0) scale(2 0.5)"');
    expect(svg).not.toContain("export-node-geometry");
    expect(svg).not.toContain("export-node-upright-content");
    expect(svg).not.toContain("export-terminal");
    expect(svg).not.toContain("data-terminal-id");
  });

  test("exports converter connection endpoints as attributes instead of visible terminals", () => {
    const source = createDefaultNode("dc-source", { x: 60, y: 120 });
    source.id = "dc-source-node";
    const converter = createDefaultNode("dcdc-converter", { x: 160, y: 120 });
    converter.id = "converter-node";
    converter.terminals[0].nodeNumber = "N_CONVERTER_IN";
    converter.terminals[1].nodeNumber = "N_CONVERTER_OUT";
    converter.terminals[0].vbase = "750";
    converter.terminals[1].vbase = "1500";
    const load = createDefaultNode("dc-load", { x: 260, y: 120 });
    load.id = "dc-load-node";
    const edges: Edge[] = [
      { id: "source-converter", sourceId: source.id, targetId: converter.id, sourceTerminalId: "t1", targetTerminalId: "t1" },
      { id: "converter-load", sourceId: converter.id, targetId: load.id, sourceTerminalId: "t2", targetTerminalId: "t1" }
    ];

    const svg = buildSvgDocument([source, converter, load], edges, { width: 360, height: 240 });
    const converterTag = svgDeviceUseTag(svg, converter.id);

    expect(converterTag).toContain('node-1="N_CONVERTER_IN"');
    expect(converterTag).toContain('node-2="N_CONVERTER_OUT"');
    expect(converterTag).not.toContain("node_1=");
    expect(converterTag).not.toContain("node_2=");
    expect(converterTag).not.toContain("node-id=");
    expect(converterTag).not.toContain("inode=");
    expect(converterTag).not.toContain("znode=");
    expect(converterTag).toContain('vbase-1="750"');
    expect(converterTag).toContain('voltage-type-1="dc"');
    expect(converterTag).toContain('vbase-2="1500"');
    expect(converterTag).toContain('voltage-type-2="dc"');
    expect(svg).not.toContain("export-terminal");
  });

  test("exports rotated and mirrored device geometry while image and terminal layers follow transforms", () => {
    const generator = createDefaultNode("ac-source", { x: 160, y: 140 });
    generator.rotation = 90;
    generator.scaleX = -1.5;
    generator.scaleY = 2;

    const svg = buildSvgDocument([generator], [], { width: 360, height: 260 });

    // 功能验证：确保旋转和镜像设备的几何变换正确应用
    expect(svg).toContain('<g transform="rotate(90) scale(-1.5 2)"');
    expect(svg).not.toContain("export-node-geometry");
    expect(svg).not.toContain("export-node-upright-content");
    expect(svg).toContain(">AC</text>");
  });

  test("exports three-winding transformer with a distinct three-coil glyph", () => {
    const twoWinding = createDefaultNode("ac-transformer", { x: 140, y: 120 });
    const threeWinding = createDefaultNode("ac-three-winding-transformer", { x: 140, y: 120 });

    const twoWindingSvg = buildSvgDocument([twoWinding], [], { width: 320, height: 240 });
    const threeWindingSvg = buildSvgDocument([threeWinding], [], { width: 320, height: 240 });

    // 功能验证：三绕组变压器有3个线圈和3个端子
    expect(twoWindingSvg).not.toContain("three-winding-transformer-glyph");
    expect(threeWindingSvg).toContain("three-winding-transformer-glyph");
    expect(threeWindingSvg.match(/class="transformer-winding"/g)?.length).toBe(3);
    expect(threeWindingSvg).not.toContain("export-terminal");
  });

  test("exports neutral-point three-winding transformer with four visible terminals", () => {
    const transformer = createDefaultNode("ac-three-winding-transformer-neutral", { x: 160, y: 140 });

    const svg = buildSvgDocument([transformer], [], { width: 360, height: 280 });

    // 功能验证：中性点三绕组变压器有3个线圈和4个端子
    expect(svg).toContain("three-winding-transformer-neutral-glyph");
    expect(svg.match(/class="transformer-winding"/g)?.length).toBe(3);
    expect(svg).not.toContain("export-terminal");
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
