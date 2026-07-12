import { DOMParser, XMLSerializer } from "@xmldom/xmldom";
import { describe, expect, test } from "vitest";

import { DEFAULT_MODEL_LAYER_ID, DEVICE_LIBRARY, createDefaultNode, createSavedProject, type Edge } from "./model";
import { DEFAULT_MEASUREMENT_CONFIG } from "./measurements";
import { buildSvgDocument } from "./appExtracted/appPersistenceLibraryExport";
import { parseSvgModel, type SvgDomAdapter } from "./svgModelImport";

const dom: SvgDomAdapter = {
  parse(source) {
    const document = new DOMParser({
      onError(level, message) {
        if (level !== "warning") {
          throw new Error(String(message));
        }
      }
    }).parseFromString(source, "image/svg+xml");
    return document as unknown as Document;
  },
  serialize(node) {
    return new XMLSerializer().serializeToString(node as unknown as Parameters<XMLSerializer["serializeToString"]>[0]);
  }
};

const parse = (source: string, name = "普通图") => parseSvgModel(source, {
  name,
  templates: DEVICE_LIBRARY,
  dom,
  yieldToMain: async () => undefined,
  batchSize: 2
});

describe("parseSvgModel generic fallback", () => {
  test("imports an ordinary SVG as exactly one sanitized static-image node", async () => {
    const result = await parse(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="10 20 320 180">
        <script>alert(1)</script>
        <foreignObject><div>unsafe</div></foreignObject>
        <rect x="10" y="20" width="320" height="180" fill="#0ea5e9" onclick="alert(1)"/>
        <image href="javascript:alert(1)" width="10" height="10"/>
      </svg>
    `);

    expect(result.mode).toBe("generic");
    expect(result.project.canvasWidth).toBe(320);
    expect(result.project.canvasHeight).toBe(180);
    expect(result.project.nodes).toHaveLength(1);
    expect(result.project.edges).toEqual([]);
    expect(result.stats).toEqual({ nodes: 0, edges: 0, measurementGroups: 0, staticNodes: 1 });

    const node = result.project.nodes[0];
    expect(node.kind).toBe("static-image");
    expect(node.position).toEqual({ x: 160, y: 90 });
    expect(node.size).toEqual({ width: 320, height: 180 });
    expect(node.params.backgroundImageFit).toBe("stretch");

    const encodedSvg = node.params.backgroundImage.slice(node.params.backgroundImage.indexOf(",") + 1);
    const decoded = decodeURIComponent(encodedSvg);
    expect(decoded).not.toContain("<script");
    expect(decoded).not.toContain("foreignObject");
    expect(decoded).not.toContain("onclick");
    expect(decoded).not.toContain("javascript:");
  });

  test("rejects malformed XML and non-SVG roots", async () => {
    await expect(parse("<svg><g></svg>")).rejects.toThrow(/SVG|XML|解析/u);
    await expect(parse("<html></html>")).rejects.toThrow(/SVG/u);
  });

  test("uses width and height when viewBox is absent", async () => {
    const result = await parse('<svg xmlns="http://www.w3.org/2000/svg" width="640px" height="360px"><circle cx="20" cy="20" r="10"/></svg>');
    expect(result.project.canvasWidth).toBe(640);
    expect(result.project.canvasHeight).toBe(360);
  });

  test("retains relative image references and warns that they may not travel with the SVG", async () => {
    const result = await parse('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 80"><image href="assets/photo.png" width="100" height="80"/></svg>');
    const encodedSvg = result.project.nodes[0].params.backgroundImage.slice(result.project.nodes[0].params.backgroundImage.indexOf(",") + 1);
    expect(decodeURIComponent(encodedSvg)).toContain('href="assets/photo.png"');
    expect(result.warnings.some((warning) => warning.includes("相对图片路径"))).toBe(true);
  });
});

const PLATFORM_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0,0,900,600" active-layer-id="layer-operating">
  <defs id="svg_defs">
    <symbol id="symbol_ACBreaker_ac-breaker_state_0" viewBox="-40 -30 80 60">
      <g transform="rotate(90) scale(-1 1.5)"><path d="M -20 0 L 20 0"/></g>
    </symbol>
    <symbol id="symbol_ACBus_ac-bus_default" viewBox="-100 -10 200 20">
      <g transform="rotate(0) scale(1 1)"><path d="M -100 0 L 100 0"/></g>
    </symbol>
  </defs>
  <g id="root_g">
    <g class="export-layer-definitions" style="display:none">
      <g layer-id="layer-default" name="默认图层" visible="1" active="0"/>
      <g layer-id="layer-operating" name="运行层" visible="0" active="1"/>
    </g>
    <g id="Background_Layer">
      <rect width="100%" height="100%" fill="#f8fafc"/>
      <image class="export-canvas-background-image" href="data:image/png;base64,iVBORw0KGgo=" x="0" y="0" width="900" height="600" preserveAspectRatio="none"/>
    </g>
    <g id="Segment_Layer">
      <path id="edge-1" source-dev-id="ACBreaker-7" target-dev-id="ACNode-3" d="M 240 150 L 350 150 L 350 240"/>
    </g>
    <g id="ACBreaker_Layer" device-type="ACBreaker">
      <use id="ACBreaker-7" layer-id="layer-operating" idx="7" name="开关-7"
        dev-id="ACBreaker-7" dev-kind="ac-breaker" node-1="101" node-2="102"
        voltage-type-1="ac" vbase-1="220" voltage-type-2="ac" vbase-2="220"
        href="#symbol_ACBreaker_ac-breaker_state_0" x="160" y="120" width="80" height="60"/>
    </g>
    <g id="ACBus_Layer" device-type="ACBus">
      <use id="ACNode-3" layer-id="layer-default" idx="3" name="母线-3"
        dev-id="ACNode-3" dev-kind="ac-bus" node="101" voltage-type="ac" vbase="220"
        href="#symbol_ACBus_ac-bus_default" x="300" y="240" width="200" height="20"/>
    </g>
    <g id="Text_Layer">
      <text id="label_ACBreaker-7" layer-id="layer-operating" dev-id="ACBreaker-7"
        x="230" y="205" text-anchor="start" fill="#dc2626" font-family="Microsoft YaHei"
        font-size="21" font-weight="700" font-style="italic" text-decoration="underline">主开关</text>
    </g>
    <g id="Measurement_Layer">
      <g class="mg" layer-id="layer-operating" transform="translate(265 125)" dev="ACBreaker-7" term="t1">
        <rect x="-48" y="-15" width="96" height="30" rx="4" fill="transparent" stroke="#64748b" stroke-width="2" stroke-dasharray="10 6"/>
        <text x="-41" y="0" dominant-baseline="middle" fill="#0f766e" font-family="Arial" font-size="18" font-weight="500" font-style="normal" text-decoration="none">
          <tspan>有功</tspan><tspan id="mv-ACBreaker-7-t1-activePower-0" class="mv" mt="activePower" mf="t1.r" dx="5">--</tspan><tspan dx="5">MW</tspan>
        </text>
      </g>
    </g>
    <g id="Other_Layer"/>
  </g>
</svg>`;

describe("parseSvgModel platform semantics", () => {
  test("restores platform canvas, layers, device transforms, states and terminal metadata", async () => {
    const result = await parse(PLATFORM_SVG, "平台恢复");

    expect(result.mode).toBe("platform");
    expect(result.project).toMatchObject({
      name: "平台恢复",
      canvasWidth: 900,
      canvasHeight: 600,
      canvasBackgroundColor: "#f8fafc",
      canvasBackgroundImage: "data:image/png;base64,iVBORw0KGgo=",
      canvasBackgroundImageFit: "stretch",
      activeLayerId: "layer-operating"
    });
    expect(result.project.layers).toEqual([
      { id: "layer-default", name: "默认图层", visible: true },
      { id: "layer-operating", name: "运行层", visible: false }
    ]);

    const breaker = result.project.nodes.find((node) => node.id === "ACBreaker-7");
    expect(breaker).toMatchObject({
      kind: "ac-breaker",
      name: "开关-7",
      layerId: "layer-operating",
      position: { x: 200, y: 150 },
      size: { width: 80, height: 60 },
      rotation: 90,
      scaleX: -1,
      scaleY: 1.5
    });
    expect(breaker?.params).toMatchObject({ idx: "7", status: "0" });
    expect(breaker?.terminals.map((terminal) => ({
      id: terminal.id,
      nodeNumber: terminal.nodeNumber,
      type: terminal.type,
      vbase: terminal.vbase
    }))).toEqual([
      { id: "t1", nodeNumber: "101", type: "ac", vbase: "220" },
      { id: "t2", nodeNumber: "102", type: "ac", vbase: "220" }
    ]);

    const bus = result.project.nodes.find((node) => node.id === "ACNode-3");
    expect(bus).toMatchObject({
      kind: "ac-bus",
      nodeNumber: "101",
      position: { x: 400, y: 250 },
      size: { width: 200, height: 20 }
    });
    expect(result.stats).toMatchObject({ nodes: 2, edges: 1, measurementGroups: 1, staticNodes: 0 });
  });

  test("restores routed edges, label styles and terminal-owned measurements", async () => {
    const result = await parse(PLATFORM_SVG, "平台恢复");

    expect(result.project.edges).toHaveLength(1);
    expect(result.project.edges[0]).toMatchObject({
      id: "edge-1",
      sourceId: "ACBreaker-7",
      targetId: "ACNode-3",
      routePoints: [{ x: 240, y: 150 }, { x: 350, y: 150 }, { x: 350, y: 240 }]
    });

    const breaker = result.project.nodes.find((node) => node.id === "ACBreaker-7");
    expect(breaker?.params).toMatchObject({
      _labelText: "主开关",
      _labelColor: "#dc2626",
      _labelFontFamily: "Microsoft YaHei",
      _labelFontWeight: "700",
      _labelFontStyle: "italic",
      _labelTextDecoration: "underline",
      _labelTextAnchor: "start"
    });

    expect(result.project.measurements?.groups).toHaveLength(1);
    expect(result.project.measurements?.groups[0]).toMatchObject({
      nodeId: "ACBreaker-7",
      terminalId: "t1",
      backgroundColor: "transparent",
      borderColor: "#64748b",
      borderStyle: "dashed",
      borderWidth: 2,
      items: [{
        id: "measurement-ACBreaker-7-t1-activePower-0",
        measurementTypeId: "activePower",
        sourcePoint: "ACBreaker-7.t1.r",
        labelOverride: "有功",
        unitOverride: "MW"
      }]
    });
    expect(result.stats).toMatchObject({ nodes: 2, edges: 1, measurementGroups: 1, staticNodes: 0 });
  });

  test("preserves unknown devices and unsupported platform content as static SVG nodes", async () => {
    const result = await parse(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300">
        <defs>
          <symbol id="symbol_CustomThing_unknown-device_default" viewBox="-30 -20 60 40">
            <g><polygon points="0,-20 30,20 -30,20" fill="#f59e0b"/></g>
          </symbol>
        </defs>
        <g id="root_g">
          <g class="export-layer-definitions" style="display:none"><g layer-id="layer-default" name="默认图层" visible="1" active="1"/></g>
          <g id="Background_Layer"><rect width="100%" height="100%" fill="#fff"/></g>
          <g id="Segment_Layer"/>
          <g id="Unknown_Layer" device-type="Unknown">
            <use id="CustomThing-4" dev-id="CustomThing-4" dev-kind="unknown-device" layer-id="layer-default"
              href="#symbol_CustomThing_unknown-device_default" x="100" y="80" width="60" height="40"/>
          </g>
          <g id="Text_Layer"/><g id="Measurement_Layer"/>
          <g id="Other_Layer"><path d="M 10 10 C 20 80 80 20 120 90" stroke="#7c3aed" fill="none"/></g>
        </g>
      </svg>
    `, "未知图元");

    expect(result.mode).toBe("platform");
    expect(result.project.nodes).toHaveLength(2);
    expect(result.project.nodes.every((node) => node.kind === "static-image")).toBe(true);
    const decodedImages = result.project.nodes.map((node) =>
      decodeURIComponent(node.params.backgroundImage.slice(node.params.backgroundImage.indexOf(",") + 1))
    );
    expect(decodedImages.some((svg) => svg.includes("polygon"))).toBe(true);
    expect(decodedImages.some((svg) => svg.includes("C 20 80"))).toBe(true);
    expect(result.stats).toEqual({ nodes: 0, edges: 0, measurementGroups: 0, staticNodes: 2 });
    expect(result.warnings.some((warning) => warning.includes("unknown-device"))).toBe(true);
  });
});

describe("parseSvgModel round trip and batching", () => {
  test("preserves exported platform semantics through import and re-export", async () => {
    const breakerBase = createDefaultNode("ac-breaker", { x: 150, y: 150 });
    const breaker = {
      ...breakerBase,
      id: "breaker-internal",
      name: "主开关",
      terminals: breakerBase.terminals.map((terminal, index) => ({ ...terminal, nodeNumber: String(101 + index), vbase: "220" })),
      params: {
        ...breakerBase.params,
        idx: "7",
        status: "0",
        _labelText: "主开关",
        _labelX: "0",
        _labelY: "52",
        _labelColor: "#b91c1c"
      }
    };
    const busBase = createDefaultNode("ac-bus", { x: 360, y: 150 });
    const bus = {
      ...busBase,
      id: "bus-internal",
      name: "母线",
      nodeNumber: "102",
      params: { ...busBase.params, idx: "3" }
    };
    const edges: Edge[] = [{
      id: "internal-edge",
      sourceId: breaker.id,
      targetId: bus.id,
      sourceTerminalId: "t2",
      targetTerminalId: "t1",
      targetPoint: { x: 360, y: 150 },
      routePoints: [{ x: 190, y: 150 }, { x: 360, y: 150 }]
    }];
    const measurements = {
      version: 1 as const,
      groups: [{
        id: "measurement-breaker-internal",
        nodeId: breaker.id,
        visible: true,
        labelVisible: true,
        unitVisible: true,
        backgroundColor: "transparent",
        borderColor: "#64748b",
        borderStyle: "none" as const,
        borderWidth: 0,
        anchor: "custom" as const,
        offset: { x: 0, y: -60 },
        layout: "vertical" as const,
        items: [{
          id: "measurement-breaker-internal-activePower-0",
          measurementTypeId: "activePower",
          sourcePoint: "breaker-internal.activePower",
          labelOverride: "有功",
          unitOverride: "MW"
        }]
      }]
    };
    const exported = buildSvgDocument([breaker, bus], edges, {
      width: 600,
      height: 360,
      backgroundColor: "#f8fafc",
      layers: [{ id: DEFAULT_MODEL_LAYER_ID, name: "默认图层", visible: true }],
      activeLayerId: DEFAULT_MODEL_LAYER_ID,
      deviceTemplates: DEVICE_LIBRARY,
      measurementConfig: DEFAULT_MEASUREMENT_CONFIG,
      measurements
    });

    const imported = await parse(exported, "往返模型");

    expect(imported.mode).toBe("platform");
    expect(imported.stats).toMatchObject({ nodes: 2, edges: 1, measurementGroups: 1 });
    expect(imported.project.canvasWidth).toBe(600);
    expect(imported.project.canvasBackgroundColor).toBe("#f8fafc");
    const importedBreaker = imported.project.nodes.find((node) => node.kind === "ac-breaker");
    const importedBus = imported.project.nodes.find((node) => node.kind === "ac-bus");
    expect(importedBreaker?.terminals.map((terminal) => terminal.nodeNumber)).toEqual(["101", "102"]);
    expect(importedBreaker?.params._labelText).toBe("主开关");
    expect(imported.project.measurements?.groups[0]?.items[0]).toMatchObject({
      measurementTypeId: "activePower",
      sourcePoint: `${importedBreaker?.id}.activePower`
    });
    expect(createSavedProject("往返模型", imported.project).project.edges).toHaveLength(1);

    const reExported = buildSvgDocument(imported.project.nodes, imported.project.edges, {
      width: imported.project.canvasWidth ?? 600,
      height: imported.project.canvasHeight ?? 360,
      backgroundColor: imported.project.canvasBackgroundColor,
      layers: imported.project.layers,
      activeLayerId: imported.project.activeLayerId,
      deviceTemplates: DEVICE_LIBRARY,
      measurementConfig: DEFAULT_MEASUREMENT_CONFIG,
      measurements: imported.project.measurements
    });
    expect(reExported).toContain('dev-kind="ac-breaker"');
    expect(reExported).toContain(`source-dev-id="${importedBreaker?.id}"`);
    expect(reExported).toContain(`target-dev-id="${importedBus?.id}"`);
    expect(reExported).toContain('class="mg"');
    expect(reExported).toContain('mt="activePower"');
  });

  test("yields between batches while importing a large platform SVG", async () => {
    const count = 1000;
    const uses = Array.from({ length: count }, (_, index) => {
      const x = index * 100;
      const item = index + 1;
      return `<use id="ACBreaker-${item}" dev-id="ACBreaker-${item}" dev-kind="ac-breaker" idx="${item}" name="开关-${item}" layer-id="layer-default" node-1="${item}" node-2="${item + 1}" href="#symbol_ACBreaker_ac-breaker_state_1" x="${x}" y="0" width="80" height="60"/>`;
    }).join("");
    const paths = Array.from({ length: count - 1 }, (_, index) => {
      const source = index + 1;
      const target = index + 2;
      const startX = index * 100 + 80;
      const endX = (index + 1) * 100;
      return `<path id="edge-${source}" source-dev-id="ACBreaker-${source}" target-dev-id="ACBreaker-${target}" d="M ${startX} 30 L ${endX} 30"/>`;
    }).join("");
    const source = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${count * 100} 120">
      <defs><symbol id="symbol_ACBreaker_ac-breaker_state_1" viewBox="-40 -30 80 60"><g transform="rotate(0) scale(1 1)"><path d="M -40 0 L 40 0"/></g></symbol></defs>
      <g id="root_g">
        <g class="export-layer-definitions" style="display:none"><g layer-id="layer-default" name="默认图层" visible="1" active="1"/></g>
        <g id="Background_Layer"><rect width="100%" height="100%" fill="#fff"/></g>
        <g id="Segment_Layer">${paths}</g>
        <g id="ACBreaker_Layer" device-type="ACBreaker">${uses}</g>
        <g id="Text_Layer"/><g id="Measurement_Layer"/><g id="Other_Layer"/>
      </g>
    </svg>`;
    let yields = 0;

    const result = await parseSvgModel(source, {
      name: "大型模型",
      templates: DEVICE_LIBRARY,
      dom,
      batchSize: 100,
      yieldToMain: async () => { yields += 1; }
    });

    expect(result.stats.nodes).toBe(1000);
    expect(result.stats.edges).toBe(999);
    expect(yields).toBeGreaterThanOrEqual(10);
  }, 15_000);
});
