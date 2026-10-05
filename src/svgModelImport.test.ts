import { DOMParser, XMLSerializer } from "@xmldom/xmldom";
import { describe, expect, test } from "vitest";

import { DEFAULT_MODEL_LAYER_ID, DEVICE_LIBRARY, createDefaultNode, createSavedProject, type Edge, type ModelNode } from "./model";
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
          <tspan>有功</tspan><tspan id="mv-ACBreaker-7-t1-activePower-0" class="mv" mt="activePower" mti="activePower" mf="t1.r" dx="5">--</tspan><tspan dx="5">MW</tspan>
        </text>
      </g>
    </g>
    <g id="Other_Layer"/>
  </g>
</svg>`;

const LEGACY_PLATFORM_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0,0,1200,1900" data-export-active-layer-id="layer-default">
  <defs id="svg_defs">
    <symbol id="symbol_DCBreak_legacy-breaker" viewBox="-75 -48 150 96">
      <g class="export-node-geometry" transform="rotate(0) scale(1 1)"><path d="M -42 0 L 42 0"/></g>
    </symbol>
    <symbol id="symbol_DCRealBs_legacy-bus" viewBox="-75 -18 150 36">
      <g class="export-node-geometry" transform="rotate(90) scale(11.66667 1)"><path d="M -75 0 L 75 0"/></g>
    </symbol>
    <g class="export-layer-definitions" style="display:none">
      <g data-export-layer-def="layer-default" data-export-layer-name="默认图层"
        data-export-layer-visible="1" data-export-layer-active="1"/>
    </g>
  </defs>
  <g id="root_g">
    <g id="Background_Layer"><rect width="100%" height="100%" fill="#f1f5f9"/></g>
    <g id="Segment_Layer">
      <g id="edge_edge-legacy" class="export-edge" data-export-edge-id="edge-legacy"
        data-export-source-layer-id="layer-default" data-export-target-layer-id="layer-default">
        <path d="M 673 170 L 733 170 L 765 170" fill="none" stroke="#0f766e"/>
      </g>
    </g>
    <g id="DCBreak_Layer" data-export-device-type="DCBreak">
      <use id="legacy-breaker" href="#symbol_DCBreak_legacy-breaker" x="519" y="122" width="150" height="96"
        data-export-node-id="legacy-breaker" data-export-layer-id="layer-default" idx="1" name="直流断路器-1"
        data-export-device-id="legacy-breaker" data-export-device-idx="1" data-export-device-name="直流断路器-1"
        data-export-device-kind="dc-breaker"/>
    </g>
    <g id="DCRealBs_Layer" data-export-device-type="DCRealBs">
      <use id="legacy-bus" href="#symbol_DCRealBs_legacy-bus" x="690" y="930" width="150" height="36"
        data-export-node-id="legacy-bus" data-export-layer-id="layer-default" idx="1" name="直流母线（竖向）-1"
        data-export-device-id="legacy-bus" data-export-device-idx="1" data-export-device-name="直流母线（竖向）-1"
        data-export-device-kind="dc-bus-vertical"/>
    </g>
    <g id="Text_Layer"/><g id="Measurement_Layer"/><g id="Other_Layer"/>
  </g>
</svg>`;

// 归属落地:SVG 不携带 containerId,导入按平台几何规则重建(中心落入容器矩形 → 成员),
// 否则导入图里的容器恒为空(拖容器不带成员、E 导出容器表无成员),与画布上的同一张图不一致。
const CONTAINER_PLATFORM_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0,0,900,600" active-layer-id="layer-default">
  <defs id="svg_defs">
    <g class="export-layer-definitions" style="display:none">
      <g layer-id="layer-default" name="默认图层" visible="1" active="1"/>
    </g>
  </defs>
  <g id="root_g">
    <g id="Background_Layer"/>
    <g id="Segment_Layer"/>
    <g id="Container_Layer" device-type="ACVppBox">
      <use id="vpp-1" layer-id="layer-default" name="虚拟电厂1" dev-id="vpp-1"
        dev-kind="ac-vpp-box" href="#symbol" x="300" y="120" width="400" height="300"/>
    </g>
    <g id="ACLoad_Layer" device-type="ACLoad">
      <use id="load-in" layer-id="layer-default" name="框内负荷" dev-id="load-in"
        dev-kind="ac-load" href="#symbol" x="500" y="180" width="40" height="40"/>
      <use id="load-center" layer-id="layer-default" name="画布中心负荷" dev-id="load-center"
        dev-kind="ac-load" href="#symbol" x="430" y="280" width="40" height="40"/>
      <use id="load-out" layer-id="layer-default" name="框外负荷" dev-id="load-out"
        dev-kind="ac-load" href="#symbol" x="80" y="80" width="40" height="40"/>
      <use id="line-in" layer-id="layer-default" name="穿框线路" dev-id="line-in"
        dev-kind="ac-line" href="#symbol" x="500" y="200" width="60" height="20"/>
    </g>
    <g id="Text_Layer"/><g id="Measurement_Layer"/>
    <g id="Other_Layer"><rect x="0" y="0" width="900" height="600" fill="none" stroke="#ccc"/></g>
  </g>
</svg>`;

describe("parseSvgModel 容器归属落地", () => {
  test("导入按几何重建归属:框内设备成为成员、框外不写、导入期几何推断不吞线路", async () => {
    const result = await parse(CONTAINER_PLATFORM_SVG, "容器导入");
    const byId = new Map(result.project.nodes.map((node) => [node.id, node]));
    const container = byId.get("vpp-1")!;
    const inside = byId.get("load-in")!;
    const outside = byId.get("load-out")!;
    const line = byId.get("line-in")!;

    expect(inside.containerId).toBe("vpp-1");
    expect(outside.containerId).toBeUndefined();
    // 线路穿框是常态(挤出侧同样豁免):按几何反推会把容器撑到包住整条线
    expect(line.containerId).toBeUndefined();
    // 画布中心另有一个真成员(load-center):它的存在保证容器重算后的矩形仍盖住画布中心
    expect(byId.get("load-center")!.containerId).toBe("vpp-1");
    // 静态辅助图元(整画布尺寸、position = 画布中心)不参与判定,否则容器会被撑到包住整张画布
    const staticNode = result.project.nodes.find((node) => node.kind === "static-image")!;
    expect(staticNode.containerId).toBeUndefined();
    expect(container.size.width).toBeLessThan(result.project.canvasWidth ?? 0);
    // 也不被挤出:容器矩形盖住它的中心,装饰节点必须原地不动(否则导入会把装饰图元搬走)
    expect(staticNode.position).toEqual({ x: 450, y: 300 });
    // 容器随成员重算:矩形必须包住成员中心
    const rect = {
      x1: container.position.x - container.size.width / 2,
      y1: container.position.y - container.size.height / 2,
      x2: container.position.x + container.size.width / 2,
      y2: container.position.y + container.size.height / 2,
    };
    expect(inside.position.x).toBeGreaterThanOrEqual(rect.x1);
    expect(inside.position.x).toBeLessThanOrEqual(rect.x2);
    expect(inside.position.y).toBeGreaterThanOrEqual(rect.y1);
    expect(inside.position.y).toBeLessThanOrEqual(rect.y2);
  });
});

// 容器几何恒在 size(见 acContainer.foldContainerScaleIntoSize):导出 SVG 的 symbol transform 里
// 带的 scale 必须在导入时折算进 size —— 否则回读出来的容器渲染矩形与 eject/入组所用矩形又是两套
const SCALED_CONTAINER_PLATFORM_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0,0,900,600" active-layer-id="layer-default">
  <defs id="svg_defs">
    <symbol id="symbol_ac-vpp-box_scaled" viewBox="-90 -56 180 112">
      <g class="export-node-geometry" transform="rotate(0) scale(2 2)"><rect x="-90" y="-56" width="180" height="112"/></g>
    </symbol>
    <g class="export-layer-definitions" style="display:none">
      <g layer-id="layer-default" name="默认图层" visible="1" active="1"/>
    </g>
  </defs>
  <g id="root_g">
    <g id="Background_Layer"/>
    <g id="Segment_Layer"/>
    <g id="Container_Layer" device-type="ACVppBox">
      <use id="vpp-scaled" layer-id="layer-default" name="虚拟电厂1" dev-id="vpp-scaled"
        dev-kind="ac-vpp-box" href="#symbol_ac-vpp-box_scaled" x="100" y="100" width="180" height="112"/>
    </g>
    <g id="ACLoad_Layer" device-type="ACLoad">
      <use id="load-scaled" layer-id="layer-default" name="普通负荷" dev-id="load-scaled"
        dev-kind="ac-load" href="#symbol_ac-vpp-box_scaled" x="400" y="100" width="40" height="40"/>
    </g>
    <g id="Text_Layer"/><g id="Measurement_Layer"/><g id="Other_Layer"/>
  </g>
</svg>`;

describe("parseSvgModel 容器 scale 折算", () => {
  test("导入的容器把 symbol 里的 scale 吃进 size;普通设备仍保留 scale", async () => {
    const result = await parse(SCALED_CONTAINER_PLATFORM_SVG, "缩放容器导入");
    const byId = new Map(result.project.nodes.map((node) => [node.id, node]));

    const container = byId.get("vpp-scaled")!;
    expect(container.size).toEqual({ width: 360, height: 224 }); // 180×112 × scale 2,渲染矩形不变
    expect(container.scaleX).toBe(1);
    expect(container.scaleY).toBe(1);

    const device = byId.get("load-scaled")!;
    expect(device.size).toEqual({ width: 40, height: 40 });
    expect(device.scaleX).toBe(2); // 普通设备不受影响
  });
});

describe("parseSvgModel platform semantics", () => {
  test("restores legacy data-export devices and infers geometry-only edge endpoints", async () => {
    const result = await parse(LEGACY_PLATFORM_SVG, "旧版平台恢复");

    expect(result.mode).toBe("platform");
    expect(result.project.layers).toEqual([{ id: "layer-default", name: "默认图层", visible: true }]);
    expect(result.project.activeLayerId).toBe("layer-default");
    expect(result.project.nodes.map((node) => ({ id: node.id, kind: node.kind, name: node.name }))).toEqual([
      { id: "legacy-breaker", kind: "dc-breaker", name: "直流断路器-1" },
      { id: "legacy-bus", kind: "dc-bus-vertical", name: "直流母线（竖向）-1" }
    ]);
    expect(result.project.edges).toEqual([expect.objectContaining({
      id: "edge-legacy",
      sourceId: "legacy-breaker",
      targetId: "legacy-bus",
      sourceTerminalId: "t2",
      targetTerminalId: "t1",
      // 母线实体长 1750（symbol scale 11.66667），两端各 10% 禁绘区 → 端点由 170 收敛到 948-700
      targetPoint: { x: 765, y: 248 },
      routePoints: [{ x: 673, y: 170 }, { x: 733, y: 170 }, { x: 765, y: 170 }]
    })]);
    expect(result.stats).toEqual({ nodes: 2, edges: 1, measurementGroups: 0, staticNodes: 0 });
    expect(result.warnings.some((warning) => warning.includes("旧版平台 SVG"))).toBe(true);
  });

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
    expect(breaker?.params).toMatchObject({ idx: "7", status: "1", closed_status: "0" });
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
      sourcePoint: `${importedBreaker?.id}.p`
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
    expect(reExported).toContain('mt="p" mti="activePower"');
  });

  test("imports legacy measurement metadata that used mt as the type id and mf as the binding field", async () => {
    const legacy = PLATFORM_SVG
      .replace('mt="activePower" mti="activePower" mf="t1.r"', 'mt="activePower" mf="t1.r"');

    const imported = await parse(legacy, "旧量测协议");
    const breaker = imported.project.nodes.find((node) => node.kind === "ac-breaker");

    expect(imported.project.measurements?.groups[0]?.items[0]).toMatchObject({
      measurementTypeId: "activePower",
      sourcePoint: `${breaker?.id}.t1.r`
    });
  });

  test("restores a stable type id when the SVG binding field has a different name", async () => {
    const source = PLATFORM_SVG.replace(
      'mt="activePower" mti="activePower" mf="t1.r"',
      'mt="gas_quantity" mti="gasQuantity"'
    );

    const imported = await parse(source, "量测字段回读");
    const breaker = imported.project.nodes.find((node) => node.kind === "ac-breaker");

    expect(imported.project.measurements?.groups[0]?.items[0]).toMatchObject({
      measurementTypeId: "gasQuantity",
      sourcePoint: `${breaker?.id}.gas_quantity`
    });
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

// ── href 推断 device kind（inferredKindFromHref 此前 0 调用）────────────────
//
// platform 导入里 `kind = declaredKind || inferredKindFromHref(href, templates)`。
// 既有 PLATFORM_SVG 的每个 <use> 都带 dev-kind ⇒ 短路 ⇒ 推断分支从未执行过。
// 这里刻意**不给 dev-kind**，让 kind 只能从 symbol id 反推。

describe("parseSvgModel 由 symbol href 推断 device kind", () => {
  // platform 判据是 `hasRoot && hasLayer && hasMetadata` 三者齐备：
  // root_g + 语义层 id + 任一设备元数据属性。所以即便不给 dev-kind，也得有
  // Segment_Layer 与 source-dev-id，否则整份会被判成 generic（推断分支走不到）。
  const platform = (useAttrs: string, symbolId = "symbol_ACBreaker_ac-breaker_state_0") => `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 600">
      <defs id="svg_defs"><symbol id="${symbolId}" viewBox="-40 -30 80 60"><path d="M -20 0 L 20 0"/></symbol></defs>
      <g id="root_g">
        <g id="Segment_Layer">
          <path id="edge-1" source-dev-id="N1" target-dev-id="N2" d="M 240 150 L 350 150 L 350 240"/>
        </g>
        <g id="ACBreaker_Layer" device-type="ACBreaker">
          <use ${useAttrs}/>
        </g>
      </g>
    </svg>`;

  test("★ 无 dev-kind 时从 `#symbol_..._ac-breaker_...` 推断出 ac-breaker", async () => {
    const result = await parse(
      platform('href="#symbol_ACBreaker_ac-breaker_state_0" x="160" y="120" width="80" height="60"')
    );
    expect(result.mode).toBe("platform");
    const node = result.project.nodes.find((item) => item.kind === "ac-breaker");
    expect(node, "应推断出 ac-breaker 节点").toBeDefined();
  });

  test("symbol id 去掉开头的 # 后再匹配（`${kind}_` 前缀或结尾都算）", async () => {
    const result = await parse(
      platform('href="#_ac-breaker" x="10" y="10" width="80" height="60"', "_ac-breaker")
    );
    expect(result.project.nodes.some((item) => item.kind === "ac-breaker")).toBe(true);
  });

  test("★ 显式 dev-kind 压过 href 推断（两者不一致时以属性为准）", async () => {
    const result = await parse(
      platform('dev-kind="ac-bus" href="#symbol_ACBreaker_ac-breaker_state_0" x="160" y="120" width="80" height="60"')
    );
    expect(result.project.nodes.some((item) => item.kind === "ac-bus")).toBe(true);
    expect(result.project.nodes.some((item) => item.kind === "ac-breaker")).toBe(false);
  });

  test("href 匹配不到任何 kind 时不凭空造 kind（走默认 kind）", async () => {
    const result = await parse(
      platform('href="#symbol_ACBreaker_完全未知类型_0" x="160" y="120" width="80" height="60"')
    );
    // 推断结果为空 ⇒ 不会凭空出现 ac-breaker；节点仍会被导入，只是 kind 不来自 href
    expect(result.project.nodes.some((item) => item.kind === "ac-breaker")).toBe(false);
    expect(result.project.nodes.length).toBeGreaterThan(0);
  });
});

describe("parseSvgModel 输入边界与安全清理", () => {
  test("使用浏览器 DOM adapter，并覆盖无 DOM、无 XMLSerializer 与空输入错误", async () => {
    const globals = globalThis as unknown as Record<string, unknown>;
    const savedParser = globals.DOMParser;
    const savedSerializer = globals.XMLSerializer;
    try {
      delete globals.DOMParser;
      await expect(parseSvgModel("<svg/>", { name: "无解析器", templates: DEVICE_LIBRARY })).rejects.toThrow("不支持 SVG XML 解析");
      globals.DOMParser = DOMParser;
      delete globals.XMLSerializer;
      await expect(parseSvgModel("<svg/>", { name: "无序列化器", templates: DEVICE_LIBRARY })).rejects.toThrow("不支持 SVG XML 序列化");
      globals.XMLSerializer = XMLSerializer;
      const parsed = await parseSvgModel("<svg viewBox=\"0 0 10 10\"><rect width=\"1\" height=\"1\"/></svg>", { name: "浏览器适配器", templates: DEVICE_LIBRARY });
      expect(parsed.mode).toBe("generic");
      class ParserWithError {
        parseFromString() {
          return new DOMParser().parseFromString("<svg><parsererror/></svg>", "image/svg+xml");
        }
      }
      globals.DOMParser = ParserWithError;
      await expect(parseSvgModel("<svg/>", { name: "解析错误", templates: DEVICE_LIBRARY })).rejects.toThrow("SVG XML 解析失败");
      await expect(parseSvgModel("  ", { name: "空", templates: DEVICE_LIBRARY, dom })).rejects.toThrow("SVG 文件为空");
    } finally {
      if (savedParser === undefined) delete globals.DOMParser;
      else globals.DOMParser = savedParser;
      if (savedSerializer === undefined) delete globals.XMLSerializer;
      else globals.XMLSerializer = savedSerializer;
    }
  });

  test("覆盖默认尺寸、畸形 URL、危险 style 与相对图片的清理分支", async () => {
    const result = await parse(`
      <svg xmlns="http://www.w3.org/2000/svg" width="50%" height="bad">
        <style>.x{background:url(javascript:alert(1))}</style>
        <rect style="fill:expression(alert(1))" width="10" height="10"/>
        <image width="10" height="10"/>
        <image href="assets/photo.png" width="10" height="10"/>
        <image href="data:image/png;base64,ok" width="10" height="10"/>
        <animate values="javascript:alert(2)" to="vbscript:bad" from="0" by="#x"/>
      </svg>
    `);
    expect(result.project.canvasWidth).toBe(1200);
    expect(result.project.canvasHeight).toBe(800);
    expect(result.warnings.join(" ")).toContain("默认尺寸");
    expect(result.warnings.join(" ")).toContain("相对图片路径");
    const svg = decodeURIComponent(result.project.nodes[0].params.backgroundImage.slice(result.project.nodes[0].params.backgroundImage.indexOf(",") + 1));
    expect(svg).not.toContain("javascript:");
    expect(svg).not.toContain("vbscript:");
    expect(svg).not.toContain("expression(");
    expect(svg).toContain("data:image/png");
  });

  test("保留坏 data URL，并移除不可解析及过深的嵌套 SVG", async () => {
    const inner = (value: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(value)}`;
    let nested = `<circle cx="1" cy="1" r="1"/>`;
    for (let index = 0; index < 4; index += 1) {
      nested = `<svg xmlns="http://www.w3.org/2000/svg"><image href="${inner(nested)}"/></svg>`;
    }
    const result = await parse(`<svg xmlns="http://www.w3.org/2000/svg"><image href="data:image/svg+xml;base64,###"/><image href="${inner("<svg><g></svg>")}"/><image href="${inner(nested)}"/></svg>`);
    const svg = decodeURIComponent(result.project.nodes[0].params.backgroundImage.slice(result.project.nodes[0].params.backgroundImage.indexOf(",") + 1));
    expect(svg).toContain("base64,###");
    expect(result.warnings.join(" ")).toContain("无法安全解析");
    expect(result.warnings.join(" ")).toContain("层级过深");
  });

  test("DOM adapter 抛出非 Error 时统一包装解析错误", async () => {
    const throwingDom: SvgDomAdapter = {
      parse() { throw "bad XML"; },
      serialize() { return ""; }
    };
    await expect(parseSvgModel("<svg/>", { name: "坏适配器", templates: DEVICE_LIBRARY, dom: throwingDom })).rejects.toThrow("SVG XML 解析失败");
  });
});

describe("parseSvgModel 平台异常内容与静态回退", () => {
  const edgeFixture = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 300">
      <defs>
        <symbol id="symbol_ACBreaker_ac-breaker_state_2" viewBox="-40 -30 80 60"><g transform="rotate(foo) scale(0 2)"><path d="M -20 0 L 20 0"/></g></symbol>
        <symbol id="symbol_ACBus_ac-bus_default" viewBox="-100 -10 200 20"><path d="M -100 0 L 100 0"/></symbol>
        <symbol id="symbol_unknown" viewBox="0 0 20 20"><rect width="20" height="20"/></symbol>
      </defs>
      <g id="root_g">
        <g class="export-layer-definitions">
          <g layer-id="" name="忽略"/><g layer-id="layer-a" name="A" visible="0"/><g layer-id="layer-a" name="重复"/>
        </g>
        <g id="Background_Layer"><rect fill="url(#pat)" style="fill:url(#pat)"/><rect class="export-canvas-background-image" fill="url(#pat)"/></g>
        <g id="Segment_Layer">
          <path id="same" source-dev-id="A" target-dev-id="B" d="M 40 30 L 100 30"/>
          <g class="export-edge" data-export-edge-id="parent-edge" data-export-source-dev-id="A" data-export-target-dev-id="B"><path d="M 40 30 L 100 30"/></g>
          <path id="bad-command" source-dev-id="A" target-dev-id="B" d="M 40 30 C 100 30 120 40 150 40"/>
          <path id="bad-number" source-dev-id="A" target-dev-id="B" d="M 40 30 L nope"/>
          <path id="short" source-dev-id="A" target-dev-id="B" d="M 40 30"/>
          <path id="missing" d="M 10 10 L 20 20"/>
        </g>
        <g id="ACBreaker_Layer" device-type="ACBreaker">
          <use id="A" dev-id="A" dev-kind="ac-breaker" href="#symbol_ACBreaker_ac-breaker_state_2" x="0" y="0" width="80" height="60" layer-id="unknown"/>
          <use id="A" dev-id="A" dev-kind="ac-breaker" href="#symbol_ACBreaker_ac-breaker_state_2" x="0" y="100" width="80" height="60"/>
          <use id="B" dev-id="B" dev-kind="ac-breaker" href="#symbol_ACBreaker_ac-breaker_state_2" x="200" y="0" width="80" height="60"/>
          <use id="orphan" dev-kind="not-real" href="#missing-symbol" x="300" y="100" width="80" height="60"/>
        </g>
        <g id="Unknown_Layer" device-type="Unknown"><use id="u" dev-id="u" dev-kind="not-real" href="#symbol_unknown" x="300" y="0" width="20" height="20"/></g>
        <g id="Text_Layer"><text id="loose" x="20" y="220" style="fill:#123;font-size:20px;font-weight:700;font-style:italic;text-decoration:underline;font-family:serif">自由文字</text><text dev-id="not-there">孤立</text></g>
        <g id="Measurement_Layer"><g class="mg" dev="missing"><text><tspan class="mv" mt="p">x</tspan></text></g></g>
        <g id="Other_Layer"><path id="other" d="M 1 1 L 2 2"/></g>
      </g>
    </svg>`;

  test("无法恢复的设备、连接线、文本和图层均保留为可编辑静态内容", async () => {
    const result = await parse(edgeFixture, "异常平台");
    expect(result.mode).toBe("platform");
    expect(result.project.nodes.some((node) => node.kind === "static-text" && node.name === "自由文字")).toBe(true);
    expect(result.project.nodes.filter((node) => node.kind === "static-image").length).toBeGreaterThanOrEqual(3);
    expect(result.warnings.join(" ")).toContain("无法恢复拓扑");
    expect(result.warnings.join(" ")).toContain("在当前类中不存在");
    expect(result.warnings.join(" ")).toContain("未关联到设备");
    expect(result.warnings.join(" ")).toContain("图层");
    expect(result.project.layers).toEqual(expect.arrayContaining([{ id: "layer-a", name: "A", visible: false }]));
  });

  test("无设备的有效平台 SVG 仍保留为平台结果，非法路径不会制造拓扑", async () => {
    const result = await parse(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><g id="root_g"><g id="Segment_Layer"><path id="e" d="M 1 1 C 2 2 3 3 4 4"/></g><g id="Text_Layer"/><g id="Measurement_Layer"/><g id="Other_Layer"/></g></svg>`, "空平台");
    expect(result.mode).toBe("generic");
    expect(result.project.nodes).toHaveLength(1);
    expect(result.project.edges).toEqual([]);
  });

  test("覆盖背景图片 fit、平铺图案、图层缺省与静态模板缺失错误", async () => {
    const tiled = await parse(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 80" active-layer-id="unknown-layer">
        <defs><pattern id="tile" width="10" height="10"><image href="assets/tile.png"/></pattern></defs>
        <g id="root_g"><g id="Background_Layer"><rect class="export-canvas-background-image" fill="url(#tile)"/></g>
          <g id="Segment_Layer"/><g id="Text_Layer"/><g id="Measurement_Layer"/><g id="Other_Layer"/>
          <g id="ACLoad_Layer" device-type="ACLoad"><use id="load" dev-kind="ac-load" href="#missing" x="10" y="10"/></g>
        </g>
      </svg>`);
    expect(tiled.project.canvasBackgroundImage).toBe("assets/tile.png");
    expect(tiled.project.canvasBackgroundImageFit).toBe("tile");
    expect(tiled.project.activeLayerId).toBe(DEFAULT_MODEL_LAYER_ID);

    const customTemplates = DEVICE_LIBRARY.filter((template) => template.kind !== "static-image" && template.kind !== "static-text");
    const fallbackResult = await parseSvgModel(PLATFORM_SVG, { name: "缺图元库", templates: customTemplates, dom, yieldToMain: async () => undefined });
    expect(fallbackResult.mode).toBe("platform");
    expect(fallbackResult.project.nodes).toHaveLength(2);
  });

  test("量测组覆盖缺端子、空项目与无量测项分支", async () => {
    const source = PLATFORM_SVG
      .replace('<g class="mg" layer-id="layer-operating" transform="translate(265 125)" dev="ACBreaker-7" term="t1">', '<g class="mg" dev="missing" term="t1"><text><tspan class="mv">x</tspan></text></g><g class="mg" dev="ACBreaker-7" term="missing"><text><tspan class="mv" mt="p">x</tspan></text></g><g class="mg" dev="ACBreaker-7" term="t1"><text>no value</text></g><g class="mg" layer-id="layer-operating" transform="translate(265 125)" dev="ACBreaker-7" term="t1">')
      .replace('<tspan id="mv-ACBreaker-7-t1-activePower-0" class="mv" mt="activePower" mti="activePower" mf="t1.r" dx="5">--</tspan>', '<tspan id="mv-ACBreaker-7-t1-activePower-0" class="mv" mr="r" dx="5">--</tspan><tspan class="mv">--</tspan>');
    const result = await parse(source, "量测异常");
    expect(result.warnings.join(" ")).toContain("不存在，已跳过");
    expect(result.warnings.join(" ")).toContain("不存在端子");
    expect(result.project.measurements?.groups).toEqual([]);
  });
});

// ── 现状钉桩：uniqueModelId / elementHref / elementStyleValue ──────────────
//
// 这三个都是模块私有函数（对外只导出 parseSvgModel），所以三条都经由公开入口反推：
//   · id 归一化  → Text_Layer 里 dev-id 匹配不到设备的文本，落成 static-text 节点，节点 id 即 uniqueModelId 的产物；
//   · href 取值  → <use> 的 symbol 定位 + device kind 推断；
//   · style 取值 → static-text 节点的 params（默认值就是 elementStyleValue 返回空串的证据）。

describe("parseSvgModel uniqueModelId 标识归一化现状", () => {
  // platform 判据 = root_g + 语义层 id + 任一设备元数据属性；dev-id="ghost-N" 同时满足后两者，
  // 且 ghost-N 不对应任何设备 ⇒ 文本必然进 unmatchedLabels（id 交给 uniqueModelId，fallback 为 static-text-<序号+1>）。
  const textOnly = (ids: string[]) => `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300">
      <g id="root_g">
        <g id="Text_Layer">
          ${ids.map((id, index) => `<text id="${id}" dev-id="ghost-${index + 1}">文本${index + 1}</text>`).join("")}
        </g>
      </g>
    </svg>`;
  const textIds = async (ids: string[]) => {
    const result = await parse(textOnly(ids), "标识归一化");
    expect(result.mode).toBe("platform");
    return result.project.nodes.filter((node) => node.kind === "static-text").map((node) => node.id);
  };

  test("空格折叠成单个连字符；点号、连字符、冒号原样保留；井号等非法字符折叠", async () => {
    expect(await textIds(["AC Breaker 7", "a.b-c#d", "ID:1-2.3"])).toEqual([
      "AC-Breaker-7",
      "a.b-c-d",
      "ID:1-2.3"
    ]);
  });

  test("开头连续的非法字符与数字被整段砍掉；砍空后落回退 id（不是空串）", async () => {
    // 「开头数字」与「开头非法字符」走的是同一条规则 /^[^A-Za-z_]+/u —— 它砍的是一切非字母非下划线，
    // 所以 "开关 3" 归一化成 "-3" 之后又被整段砍空，最终落 fallback，而不是留下 "3"。
    expect(await textIds(["9lives", "  开关A  ", "开关 3", "   ", "***"])).toEqual([
      "lives",
      "A",
      "static-text-3",
      "static-text-4",
      "static-text-5"
    ]);
  });

  test("归一化后撞名的标识依次追加 _2 后缀，并逐条留下规范化告警", async () => {
    const result = await parse(textOnly(["a b c d", "a-b-c-d", "ab.cd"]), "标识去重");
    expect(result.project.nodes.filter((node) => node.kind === "static-text").map((node) => node.id)).toEqual([
      "a-b-c-d",
      "a-b-c-d_2",
      "ab.cd"
    ]);
    // 只有前两条发生了改写；第三条归一化后与原串相同，不产生告警。
    expect(result.warnings.filter((warning) => warning.includes("已规范化为")).length).toBe(2);
  });
});

describe("parseSvgModel elementHref 属性名匹配现状", () => {
  // xmlns:xlink 必须显式声明：xmldom 对未声明前缀直接抛 NamespaceError（见最后一条断言）。
  const withHref = (useAttrs: string) => `
    <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 900 600">
      <defs id="svg_defs">
        <symbol id="symbol_ACBreaker_ac-breaker_state_0" viewBox="-40 -30 80 60"><g transform="rotate(0) scale(1 1)"><path d="M -20 0 L 20 0"/></g></symbol>
        <symbol id="symbol_ACBus_ac-bus_default" viewBox="-100 -10 200 20"><g transform="rotate(0) scale(1 1)"><path d="M -100 0 L 100 0"/></g></symbol>
      </defs>
      <g id="root_g">
        <g id="Segment_Layer"/>
        <g id="ACBreaker_Layer" device-type="ACBreaker">
          <use dev-id="N1" name="被引用设备" x="160" y="120" width="80" height="60" ${useAttrs}/>
        </g>
      </g>
    </svg>`;
  const kindsOf = async (useAttrs: string) => {
    const result = await parse(withHref(useAttrs), "href 匹配");
    return {
      mode: result.mode,
      kinds: result.project.nodes.filter((node) => node.kind !== "static-image").map((node) => node.kind)
    };
  };

  test("只给 href 时按该值定位 symbol 并推出 device kind", async () => {
    expect(await kindsOf('href="#symbol_ACBreaker_ac-breaker_state_0"')).toEqual({
      mode: "platform",
      kinds: ["ac-breaker"]
    });
  });

  test("只给 xlink:href 时同样能定位（elementHref 的回退分支）", async () => {
    expect(await kindsOf('xlink:href="#symbol_ACBreaker_ac-breaker_state_0"')).toEqual({
      mode: "platform",
      kinds: ["ac-breaker"]
    });
  });

  test("两者都给且值不同时以 href 为准（优先级钉桩）", async () => {
    // href 指向母线 symbol、xlink:href 指向断路器 symbol ⇒ 实际得到的是 ac-bus。
    expect(await kindsOf('href="#symbol_ACBus_ac-bus_default" xlink:href="#symbol_ACBreaker_ac-breaker_state_0"')).toEqual({
      mode: "platform",
      kinds: ["ac-bus"]
    });
  });

  test("缺口：XML 区分大小写，大写的 HREF 不被识别，整份 SVG 退化为 generic", async () => {
    // getAttribute("href") 精确匹配小写 ⇒ HREF 视为无关属性 ⇒ symbol 找不到、kind 推不出 ⇒ 无节点 ⇒ generic 兜底。
    const result = await kindsOf('HREF="#symbol_ACBreaker_ac-breaker_state_0"');
    expect(result.mode).toBe("generic");
    expect(result.kinds).toEqual([]);
  });

  test("缺口：XLink:Href 的大写前缀未声明，解析期就抛命名空间错误", async () => {
    await expect(parse(withHref('XLink:Href="#symbol_ACBreaker_ac-breaker_state_0"'), "前缀大小写"))
      .rejects.toThrow(/SVG XML 解析失败[\s\S]*prefix/iu);
  });
});

describe("parseSvgModel elementStyleValue 取值现状", () => {
  // 静态文本节点的 params 逐个来自 elementStyleValue / numericStyleValue，
  // 默认值（#111827 / Arial / 500 / 16）正是 elementStyleValue 返回空串时才出现的形态。
  const textStyled = (attrChunks: string[]) => `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300">
      <g id="root_g">
        <g id="Text_Layer">
          ${attrChunks.map((chunk, index) => `<text id="t${index + 1}" dev-id="ghost-${index + 1}" ${chunk}>文本${index + 1}</text>`).join("")}
        </g>
      </g>
    </svg>`;
  const styledTexts = async (attrChunks: string[]) => {
    const result = await parse(textStyled(attrChunks), "style 取值");
    expect(result.mode).toBe("platform");
    return result.project.nodes.filter((node) => node.kind === "static-text");
  };

  test("冒号两侧有无空格都能取值，且同名的直接属性优先于 style", async () => {
    const [noSpace, withSpace, beforeColon, aroundName, direct] = await styledTexts([
      'style="fill:red"',
      'style="fill: red"',
      'style="fill :navy"',
      'style=" ; fill:teal"',
      'fill="blue" style="fill:green"'
    ]);
    expect(noSpace.params.textColor).toBe("red");
    expect(withSpace.params.textColor).toBe("red");
    // 分隔符 `;` 之后、属性名前、冒号前的空白都由模式里的 \s* 容忍；
    // 值一侧的空白另由末尾 trim 吸收（所以只砍 \s*:\s* 里的后半段不会变色，这里必须钉住冒号前那一侧）。
    expect(beforeColon.params.textColor).toBe("navy");
    expect(aroundName.params.textColor).toBe("teal");
    // elementStyleValue 先看 getAttribute(property)，所以直接属性赢了 style 里的同名字段。
    expect(direct.params.textColor).toBe("blue");
  });

  test("多属性 style 只取目标属性，且取值在分号处截断", async () => {
    const [node] = await styledTexts([
      'style="stroke:#0f0;fill:blue;font-size:12px;font-family:serif;font-weight:700;font-style:italic;text-decoration:underline"'
    ]);
    expect(node.params).toMatchObject({
      textColor: "blue",
      fontFamily: "serif",
      fontSize: "12",
      fontWeight: "700",
      fontStyle: "italic",
      textDecoration: "underline"
    });
  });

  test("属性名里带正则元字符的邻居属性不会串味，取不到就是取不到", async () => {
    const [dotNeighbour, ownAfterDot, dottedName, prefixNeighbour] = await styledTexts([
      'style="fill.x:1"',              // 点号邻居：fill 后面不是冒号 ⇒ 不匹配
      'style="fill.x:1;fill:green"',   // 点号邻居在前、真正的 fill 在后 ⇒ 取后面的
      'style="fi.ll:red"',             // 被查属性名 fill 在 style 文本里被拆开 ⇒ 不匹配
      'style="fill-rule:evenodd"'      // 以 fill 打头的更长属性名 ⇒ 不匹配
    ]);
    // 四个里三个取不到 fill ⇒ 全部落 staticTextNode 的默认色（= elementStyleValue 返回空串的证据）
    expect([dotNeighbour, dottedName, prefixNeighbour].map((node) => node.params.textColor))
      .toEqual(["#111827", "#111827", "#111827"]);
    expect(ownAfterDot.params.textColor).toBe("green");

    // ⚠ 已知的覆盖死角（别再重查一遍）：stylePropertyPattern 里给「被查属性名」做转义的那一步
    // （property.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")）只有在 property 自身含正则元字符时才承重，
    // 而本模块所有调用点传的都是不含元字符的字面量（fill / stroke / font-* / text-decoration /
    // display / stroke-dasharray），故把那步转义整段删掉，本文件仍全绿（已用变异验证确认为 GREEN）。
    // 这里四条断言钉的是「相邻维度」——被查名按字面匹配、不与邻居属性串味 —— 不是转义本身。
    // 想让转义可测，只能导出该私有函数，那是改公开 API，不在本条范围内。
  });

  test("完全没有 style 时全部取默认值", async () => {
    const [node] = await styledTexts([""]);
    expect(node.params).toMatchObject({
      textColor: "#111827",
      fontFamily: "Arial",
      fontWeight: "500",
      fontStyle: "normal",
      textDecoration: "none",
      fontSize: "16"
    });
  });

  test("同一属性在多个元素上反复取值结果稳定（正则复用不得漂移）", async () => {
    // 守卫：style 取值正则现已按属性名缓存复用。若哪天给 flags 加上 g，
    // lastIndex 会停在上一处匹配之后，第 2~6 个元素将返回空串（落成默认色）⇒ 本条转红。
    const colors = ["#111111", "#222222", "#333333", "#444444", "#555555", "#666666"];
    const nodes = await styledTexts(colors.map((color) => `style="fill:${color}"`));
    expect(nodes.map((node) => node.params.textColor)).toEqual(colors);
  });
});

// ── 未覆盖分支补测 ────────────────────────────────────────────────────────
//
// 目标分支（生产文件行号）：
//   92  elementName 的 `localName || nodeName` 回退
//   138 safeUrl 的空值早退（`!normalized → true`）
//   169 decodeSvgDataUrl 的「不是 data:image/svg+xml 语法」早退
//   176 decodeSvgDataUrl 的 atob 缺失早退
//   223 sanitizeDocument 的 style 元素清理（含 `textContent || ""` 回退）
//   230 sanitizeDocument 的 `attributes.item()` 返回 null 时跳过
//   410 parseGeometryTransform 的 scaleY 兜底链
//   412 parseGeometryTransform 的 rotation 非有限值兜底
//   414 parseGeometryTransform 的 scaleY 为 0 兜底
//   173 `match[2] ?? ""` 的右操作数 —— **不可达**，见下方说明。
//
// 173 为什么不可达：`decodeSvgDataUrl` 的正则是
//   /^data:image\/svg\+xml(?:;charset=[^;,]+)?(?:;(base64|utf8))?,(.*)$/isu
// 第 2 组是 `(.*)` 且带 `s` 标志 —— `.*` 恒可匹配（哪怕空串），所以 `match[2]`
// 只要 match 非 null 就必定是字符串，`?? ""` 的右操作数永远不会被执行。
// 真要它执行只能改生产代码（如改成具名组后手动查表），不在本条范围内。
//
// 下面每条用例的「对照组」都是刻意设计的：断言值不与 fallback 默认值重合，
// 且同一用例里另有一条走**不同代码路径**的输入做旁证 —— 见各条注释。
//
// ── 变异验证实测结果（src/svgModelImport.ts，改坏 → 跑本文件 → 还原）───────
//   M1 line 92  `localName || nodeName` → `localName || ""`   RED (2 failed)
//   M2 line 92  去掉 `.toLowerCase()`                          RED (2 failed)
//   M3 line 412 去掉 rotation 的 isFinite 守卫                  RED (1 failed)
//   M4 line 414 去掉 scaleY 兜底                               RED (1 failed)
//   M5 line 410 去掉 `scale?.[1]` 回退                          RED (1 failed)
//   M6 line 169 去掉 `!match` 早退                             RED (1 failed)
//   M7 line 230 去掉 attributes.item null 的 continue          RED (1 failed)
//   M8 line 223 style 元素清理条件失效                          RED (3 failed)
//   M9 line 138 去掉 safeUrl 的 `!normalized` 早退              GREEN ← **可证等价**，见下
//
// M9 为什么是绿的（**不是**「输入没覆盖」，是全域等价，可以证明）：
//   去掉 `if (!normalized) return true` 之后，空串会继续往下走：
//   `"".startsWith(...)` 对 `#` `/` `./` `../` `http:` `https:` `data:image/` **全部为 false**，
//   而兜底的 `/^[a-z][a-z0-9+.-]*:/iu` 字符类首位必须是一个字母，对空串必然 false
//   ⇒ `!false === true`。也就是说对**任何**能让 `!normalized` 为真的输入（只有空串一种，
//   因为 normalizedUrlForSafety 会把纯空白/控制字符全剥掉），两条路径产出完全相同。
//   所以 138 的早退是「给人看的早退写法」，不承重 —— 断言仍保留，因为它是**行为契约**
//   （空 href 保留、且不误报相对路径），但**不要**指望有测试能让它转红。
//   这与 176（atob 缺失）同形：外层 try/catch 兜住了，两处都不承重。

/** 从 static-image/static-text 节点里解出被清理后的 SVG 源码。 */
const decodedBackgroundSvg = (node: ModelNode) =>
  decodeURIComponent(String(node.params.backgroundImage).slice(String(node.params.backgroundImage).indexOf(",") + 1));

describe("parseSvgModel 属性清理的兜底分支", () => {
  test("空 href 与纯空白 href 视为安全并原样保留，非法 scheme 的 URL 属性仍被移除", async () => {
    // 覆盖 138：`safeUrl` 的 `if (!normalized) return true`。
    // 反例纪律：`href=""` 的清理结果与「该属性根本没被遍历到」同形，
    // 所以同一条 SVG 里并列一个 `javascript:` 的 href —— 它必须消失，
    // 证明属性循环确实在跑，而空 href 的保留不是漏检。
    const result = await parse(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 90">
        <image href="" x="0" y="0" width="10" height="10"/>
        <image href="   " x="0" y="0" width="10" height="10"/>
        <image href="javascript:alert(1)" x="0" y="0" width="10" height="10"/>
      </svg>
    `, "空 href");

    const svg = decodedBackgroundSvg(result.project.nodes[0]);
    expect(svg).toContain('href=""');
    expect(svg).toContain('href="   "');
    expect(svg).not.toContain("javascript:");
    // 空 href 不应被当成「相对图片路径」而告警（normalized 为空 ⇒ relativeResourceUrl 假）
    expect(result.warnings.join(" ")).not.toContain("相对图片路径");
  });

  test("URL 属性只有控制字符时同样走空值早退，不会被当成相对路径告警", async () => {
    // 覆盖 138 的另一条**输入维度**：上一条喂的是纯空格，走的是
    // normalizedUrlForSafety 里 `[\u0000-\u001f\u007f\s]+` 的 \s 那一段；
    // 这一条喂控制字符（&#9; &#10; 被解析器解成真实的 TAB/LF），
    // 走的是字符类里**控制字符区间**那一段。只测空格的话，
    // 把 \u0000-\u001F 这段控制字符区间从字符类里删掉，这条断言不会红。
    //
    // 反例纪律：同一条 SVG 里并列一个真正会被清理的 href（vbscript:），
    // 它必须消失 —— 证明属性循环确实在跑，而控制字符 href 的保留不是漏检。
    // 注意 href 归一化后为空 ⇒ relativeResourceUrl 为假 ⇒ 不产生相对路径告警；
    // 而真正的相对路径（rel/x.png）会告警，两者的告警计数因此可区分。
    const result = await parse(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 90">
        <image href="&#9;&#10;" x="0" y="0" width="10" height="10"/>
        <image href="vbscript:msgbox(1)" x="0" y="0" width="10" height="10"/>
        <image href="rel/x.png" x="0" y="0" width="10" height="10"/>
      </svg>
    `, "控制字符 href");

    expect(result.warnings.join(" ")).not.toContain("vbscript:");
    const svg = decodedBackgroundSvg(result.project.nodes[0]);
    expect(svg).not.toContain("vbscript:");
    // 相对路径告警只由 rel/x.png 触发一次，证明「控制字符 href 未被误判为相对路径」
    expect(result.warnings.join(" ")).toContain("相对图片路径");
    // 清理计数：只有 vbscript 那一项被删（控制字符 href 保留、相对路径 href 保留）
    expect(result.warnings.join(" ")).toContain("已清理 1 项");
  });

  test("不是合法 data:image/svg+xml 语法的引用原样保留，不被当作嵌套 SVG 重写", async () => {
    // 覆盖 169：`decodeSvgDataUrl` 的 `if (!match) return null`。
    // 缺逗号 ⇒ 正则不匹配 ⇒ 返回 null ⇒ sanitizeSvgDataUrl 原样返回入参。
    // 对照组是同前缀但语法合法的嵌套 SVG：它会被解码并重写成 utf-8 形式，
    // 两者并存才能证明上面那条不是「data URL 分支根本没进」。
    const malformed = "data:image/svg+xml;charset=utf-8;base64";
    const nested = '<svg xmlns="http://www.w3.org/2000/svg"><circle r="1"/></svg>';
    const wellFormed = `data:image/svg+xml,${encodeURIComponent(nested)}`;

    const result = await parse(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 90">
        <image href="${malformed}" x="0" y="0" width="10" height="10"/>
        <image href="${wellFormed}" x="0" y="0" width="10" height="10"/>
      </svg>
    `, "畸形 data URL");

    const svg = decodedBackgroundSvg(result.project.nodes[0]);
    expect(svg).toContain(`href="${malformed}"`);
    // 合法嵌套 SVG 被重写（出现 charset=utf-8 且载荷换成 encodeURIComponent 结果）
    expect(svg).toContain("data:image/svg+xml;charset=utf-8,");
    expect(svg).toContain(encodeURIComponent(nested));
  });

  test("环境缺 atob 时 base64 嵌套 SVG 原样保留，且不会被误判为解析失败", async () => {
    // 覆盖 176：`typeof globalThis.atob !== "function"` 的早退。
    //
    // ⚠ 已知的等价变异（变异验证实测 GREEN，不要试图把它变红）：
    //   把这行 if 整段删掉，测试仍全绿。原因是外层 try/catch 兜住了 ——
    //   atob 缺失时调用它抛 TypeError，正好落到 `catch { return null }`，
    //   与守卫返回的 null 完全同值。该守卫是「给人看的早退写法」，不承重。
    //   本条真正钉住的是**可观察行为**：atob 不可用时引用不被重写、不报解析失败。
    //
    // 对照组（有 atob）：同一份 base64 载荷会被解码 → 清理 script → 重写为 utf-8 形式。
    const nested = '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script><circle r="1"/></svg>';
    const base64Href = `data:image/svg+xml;base64,${btoa(nested)}`;
    const source = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 90">
        <image href="${base64Href}" x="0" y="0" width="10" height="10"/>
      </svg>
    `;
    const globals = globalThis as unknown as Record<string, unknown>;
    const savedAtob = globals.atob;
    let withoutAtob = "";
    let withoutAtobWarnings = "";
    try {
      delete globals.atob;
      const degraded = await parse(source, "缺 atob");
      withoutAtob = decodedBackgroundSvg(degraded.project.nodes[0]);
      withoutAtobWarnings = degraded.warnings.join(" ");
    } finally {
      if (savedAtob === undefined) delete globals.atob;
      else globals.atob = savedAtob;
    }

    expect(withoutAtob).toContain(`href="${base64Href}"`);
    expect(withoutAtob).toContain("base64,");
    expect(withoutAtobWarnings).not.toContain("无法安全解析");
    expect(withoutAtobWarnings).not.toContain("层级过深");

    const healthy = await parse(source, "有 atob");
    const withAtob = decodedBackgroundSvg(healthy.project.nodes[0]);
    expect(withAtob).not.toContain("base64,");
    expect(withAtob).toContain("data:image/svg+xml;charset=utf-8,");
    // 解码后走的是正常的嵌套 SVG 清理：script 被剔除
    expect(withAtob).not.toContain("script");
  });

  test("空 style 元素原样保留，含可执行内容的 style 被删除", async () => {
    // 覆盖 223：`name === "style" && EXECUTABLE_STYLE_PATTERN.test(String(element.textContent || ""))`。
    // 三种输入：空 style（走 `textContent || ""` 的右操作数，且不该被删）、
    // 安全 style（同名元素但不该被删）、可执行 style（必须被删）。
    const result = await parse(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 90">
        <style></style>
        <style>.safe{fill:#123456}</style>
        <style>.bad{background:url(javascript:alert(1))}</style>
      </svg>
    `, "style 清理");

    const svg = decodedBackgroundSvg(result.project.nodes[0]);
    expect(svg).toContain(".safe{fill:#123456}");
    expect(svg).not.toContain("javascript:");
    expect(svg).not.toContain(".bad");
    // 三个 style 进来，只剩两个（空 style + 安全 style）
    // ⚠ 空 style 被 XMLSerializer 写成自闭合形式 `<style/>`，分隔符是 `/` 不是空白，
    //   所以这里必须把 `/` 也算进分隔符字符类，否则只数得出 1 个（上一轮就是这么写错的）。
    expect(svg.match(/<style[\s/>]/gu)?.length ?? 0).toBe(2);
  });

  test("attributes.item() 返回 null 的槽位被跳过，其余属性照常清理", async () => {
    // 覆盖 230：`if (!attribute) continue`。
    // NamedNodeMap 按规范允许 item() 返回 null（活列表在遍历中被改写就会这样），
    // 代价是抛 TypeError 会把整份导入打断。同一元素里再放一个非法 href：
    // 若 null 槽位导致循环整体崩掉，则非法 href 不会被清理 ⇒ 两条断言同时转红。
    const nullSlotDom: SvgDomAdapter = {
      parse(source) {
        const document = dom.parse(source);
        const target = document.getElementsByTagName("image")[0] as unknown as Record<string, unknown>;
        const original = target.attributes as { length: number; item: (index: number) => Attr | null };
        const hole = original.length - 1;
        let pending = true;
        // 只把 item() 换掉，NamedNodeMap 的其余方法（getNamedItem / removeAttribute 依赖它）原样代理，
        // 否则 element.removeAttribute 会在本用例里先崩掉，红的原因就不是被测代码了。
        const patched = new Proxy(original, {
          get(target, property) {
            if (property !== "item") {
              const value = Reflect.get(target, property);
              return typeof value === "function" ? value.bind(target) : value;
            }
            return (slot: number) => {
              // 模拟「长度报大一位」的 NamedNodeMap：DOM 规范允许 item() 返回 null。
              // xmldom 只在 index 越界时返回 null，而清理循环的上界就是 length-1，
              // 所以要把末位槽位映射成 null 才逼得出这条分支。
              // 只投放一次：之后交还原对象，免得连累 XMLSerializer 自己的属性遍历。
              if (pending && slot === hole) {
                pending = false;
                return null;
              }
              return target.item(slot);
            };
          }
        });
        Object.defineProperty(target, "attributes", {
          configurable: true,
          get: () => patched
        });
        return document;
      },
      serialize: dom.serialize
    };

    const result = await parseSvgModel(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 90">
        <image href="javascript:alert(1)" x="0" y="0" width="10" height="10"/>
        <rect fill="#abcdef" width="10" height="10"/>
      </svg>
    `, { name: "属性空洞", templates: DEVICE_LIBRARY, dom: nullSlotDom });

    const svg = decodedBackgroundSvg(result.project.nodes[0]);
    // 同一元素上被跳过的只是末位槽位（width），非末位的 href 仍必须被清理
    expect(svg).not.toContain("javascript:");
    // 被跳过的那一个槽位没有参与任何清理，但它作为属性仍然原样存在（跳过 ≠ 删除）
    expect(svg).toContain('width="10"');
    expect(svg).toContain('fill="#abcdef"');
    expect(result.warnings.join(" ")).toContain("已清理 1 项");
  });
});

describe("parseSvgModel 几何兜底分支", () => {
  // parseGeometryTransform：symbol 上的 rotate/scale 数值解析与兜底。
  // 设备必须是非容器的 ac-breaker —— 容器的 scale 会被 normalizeInboundContainerNode
  // 折进 size（见上方 SCALED_CONTAINER_PLATFORM_SVG 那条），那样就看不见 scaleY 本身了。
  const geometry = (transform: string, href: string, id: string) => `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 600">
      <defs id="svg_defs">
        <symbol id="symbol_ACBreaker_ac-breaker_state_0" viewBox="-40 -30 80 60">
          <g transform="${transform}"><path d="M -20 0 L 20 0"/></g>
        </symbol>
      </defs>
      <g id="root_g">
        <g class="export-layer-definitions"><g layer-id="layer-default" name="默认图层" visible="1" active="1"/></g>
        <g id="Segment_Layer"/>
        <g id="ACBreaker_Layer" device-type="ACBreaker">
          <use id="${id}" dev-id="${id}" dev-kind="ac-breaker" layer-id="layer-default"
            href="${href}" x="100" y="100" width="80" height="60"/>
        </g>
        <g id="Text_Layer"/><g id="Measurement_Layer"/><g id="Other_Layer"/>
      </g>
    </svg>`;

  const only = async (transform: string) => {
    const result = await parse(geometry(transform, "#symbol_ACBreaker_ac-breaker_state_0", "dev-1"), `几何 ${transform}`);
    expect(result.mode).toBe("platform");
    expect(result.project.nodes).toHaveLength(1);
    return result.project.nodes[0];
  };

  test("scale 只给一个参数时两轴同值（覆盖 scaleY 取 scaleX 的回退）", async () => {
    // 覆盖 410 的 `scale?.[1]` 回退：`scale(2 0)` 这类输入里第二捕获为 undefined，
    // 兜到第一捕获 2。用 `scale(2)` 而不是 `scale(2 0)`：
    // 后者的 scaleY 最终会被 `scaleY !== 0` 之外的路径干扰，两个分支难分辨。
    const node = await only("scale(2)");
    expect(node.scaleX).toBe(2);
    expect(node.scaleY).toBe(2);
    // 对照：显式双参数时两轴可以不同 ⇒ 上面那条不是「总是同值」
    const both = await only("scale(2 5)");
    expect(both.scaleX).toBe(2);
    expect(both.scaleY).toBe(5);
  });

  test("transform 缺 scale 时两轴都兜到 1（覆盖三段回退链末端）", async () => {
    // 覆盖 410 的 `|| 1`：transform 里只有 rotate、没有 scale 时，
    // `scale?.[2] || scale?.[1] || 1` 三段全落空 ⇒ 1。
    const node = await only("rotate(90)");
    expect(node.rotation).toBe(90);
    expect(node.scaleX).toBe(1);
    expect(node.scaleY).toBe(1);
  });

  test("rotate 参数是非有限数时兜到 0（覆盖 rotation 非有限分支）", async () => {
    // 覆盖 412：`Number.isFinite(rotation) ? rotation : 0` 的 else 侧。
    //
    // ⚠ 上一轮这里写的是 `rotate(foo)`，**它根本走不到 412**，是恒绿废断言：
    //   捕获正则 `rotate\s*\(\s*([-+\d.eE]+)` 的字符类不含 `f`/`o`，
    //   所以 exec 返回 null ⇒ 第 407 行的 `|| 0` 先把值变成 0 ⇒ isFinite 为真。
    //   也就是说 `rotate(foo)` 与「压根没有 rotate」在 412 上完全同形。
    //   能真正进 412 的输入必须**先被正则捕获成合法数字字面量、再由 Number 变成非有限**：
    //     - `rotate(1e999)`  → 捕获 "1e999" → Number = Infinity  → 走 else
    //     - `rotate(.)`      → 捕获 "."     → Number = NaN       → 走 else
    // 两者分别覆盖 isFinite 的两种失败原因，缺一不可。
    //
    // 断言取 Infinity 侧的判别力最强：删掉 isFinite 守卫后 rotation 变成 Infinity，
    // toBe(0) 与 isFinite 两条断言同时转红。
    const infinity = await only("rotate(1e999)");
    expect(infinity.rotation).toBe(0);
    expect(Number.isFinite(infinity.rotation)).toBe(true);
    expect(infinity.rotation).not.toBe(Infinity);

    const nan = await only("rotate(.)");
    expect(nan.rotation).toBe(0);
    expect(Number.isFinite(nan.rotation)).toBe(true);

    // 对照组：合法 rotate 走 412 的 true 侧 ⇒ 守卫两侧都被执行
    const good = await only("rotate(45)");
    expect(good.rotation).toBe(45);
  });

  test("rotate 参数非数字时正则不匹配，等价于没有 rotate（守住 407 行的 || 0）", async () => {
    // 反例纪律的正面记录：上一轮以为 `rotate(foo)` 能覆盖 412，实测它落在 407 的 `|| 0`。
    // 那条路径本身也是真分支（唯一一处 input 走到它），单独钉住并把结论写进文件：
    //   `rotate(foo)` 与「没有 rotate 属性」的 rotation 都是 0，**这不是兜底失效，
    //   而是正则与 Number 两层各自职责不同**：正则管语法，Number+isFinite 管数值。
    const nonNumeric = await only("rotate(foo)");
    expect(nonNumeric.rotation).toBe(0);
    const none = await only("rotate(90)");
    expect(none.rotation).toBe(90);
  });

  test("scaleY 为 0 时兜到 1，scaleX 为 0 时同样兜到 1", async () => {
    // 覆盖 414（scaleY 兜底）与 413 的 scaleX 兜底。
    // 反例纪律：兜底值就是 1，若断言值也取 1 就没鉴别力 ——
    // 所以另取 scaleX = 2（不兜底）作对照，说明 x/y 是各自独立判定的。
    const zeroY = await only("scale(2 0)");
    expect(zeroY.scaleX).toBe(2);
    expect(zeroY.scaleY).toBe(1);

    const zeroX = await only("scale(0 3)");
    expect(zeroX.scaleX).toBe(1);
    expect(zeroX.scaleY).toBe(3);
  });
});

// ── elementName 的 localName → nodeName 回退 ───────────────────────────────
//
// 目标分支：生产第 92 行 `String(element.localName || element.nodeName).toLowerCase()`
// 的**右操作数** `element.nodeName`（以及紧随其后的 `.toLowerCase()`）。
//
// 可达性论证（很重要，否则这条就是恒绿断言）：
//   xmldom 的 Element 把 `localName` 设为**实例上的可写数据属性**，不是原型访问器，
//   所以 `Object.defineProperty(el, "localName", {get: () => undefined})` 能把它打成 falsy，
//   模拟「某个 DOM 实现不提供 localName」的真实情形（生产代码显式写了回退就是在防这个）。
//   为什么打补丁不会先炸掉别处：生产侧只有 `browserDomAdapter` 用 getElementsByTagName，
//   而本文件始终显式传 `dom`，那条路径根本不会走；生产其余遍历一律走 childNodes.item()，
//   XMLSerializer 也只用 nodeName。三者都在探针里实测过。
//
// 断言落在**行为**上：即使 DOM 不给 localName，script / foreignObject / 可执行 style
// 仍然必须被清理掉 —— 名字是靠 nodeName（再 toLowerCase）认出来的。

describe("parseSvgModel elementName 在缺少 localName 时改用 nodeName", () => {
  const withoutLocalNameDom: SvgDomAdapter = {
    parse(source) {
      const document = dom.parse(source);
      // 只打子节点的补丁：documentElement 的 localName 必须留着，
      // 否则 parseSvgDocument 的 `elementName(root) !== "svg"` 会先失败，
      // 红的原因就不是被测的那条回退了。
      const strip = (node: Node) => {
        if (node.nodeType === 1) {
          Object.defineProperty(node, "localName", { configurable: true, get: () => undefined });
        }
        for (let index = 0; index < node.childNodes.length; index += 1) {
          const child = node.childNodes.item(index);
          if (child) {
            strip(child);
          }
        }
      };
      for (let index = 0; index < document.documentElement.childNodes.length; index += 1) {
        const child = document.documentElement.childNodes.item(index);
        if (child) {
          strip(child);
        }
      }
      return document;
    },
    serialize: dom.serialize
  };

  test("DOM 不提供 localName 时，script 与 foreignObject 仍按 nodeName 被剔除", async () => {
    const result = await parseSvgModel(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 90">
        <script>alert(1)</script>
        <foreignObject><div>unsafe</div></foreignObject>
        <rect fill="#abcdef" width="10" height="10"/>
      </svg>
    `, { name: "无 localName", templates: DEVICE_LIBRARY, dom: withoutLocalNameDom, yieldToMain: async () => undefined });

    // 先确认补丁真的生效了：patch 失手的话下面两条断言会变成恒绿
    expect(result.mode).toBe("generic");

    const svg = decodedBackgroundSvg(result.project.nodes[0]);
    expect(svg).not.toContain("script");
    expect(svg).not.toContain("foreignObject");
    // 对照：非危险的兄弟元素必须留下 —— 证明不是「整棵树被清空」
    expect(svg).toContain('fill="#abcdef"');
    // 计数也要对：清掉 2 个危险元素
    expect(result.warnings.join(" ")).toContain("已清理 2 项");
  });

  test("DOM 不提供 localName 时，含可执行内容的 style 元素仍按 nodeName 被剔除", async () => {
    const result = await parseSvgModel(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 90">
        <style>.bad{background:url(javascript:alert(1))}</style>
        <style>.safe{fill:#123456}</style>
      </svg>
    `, { name: "无 localName 的 style", templates: DEVICE_LIBRARY, dom: withoutLocalNameDom, yieldToMain: async () => undefined });

    const svg = decodedBackgroundSvg(result.project.nodes[0]);
    expect(svg).not.toContain(".bad");
    expect(svg).not.toContain("javascript:");
    // 对照：同名的安全 style 留下，且只剩它一个 ⇒ 认名的确是 "style" 这个字符串
    expect(svg).toContain(".safe{fill:#123456}");
    expect(svg.match(/<style[\s/>]/gu)?.length ?? 0).toBe(1);
  });
});
