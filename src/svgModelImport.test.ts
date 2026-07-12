import { DOMParser, XMLSerializer } from "@xmldom/xmldom";
import { describe, expect, test } from "vitest";

import { DEVICE_LIBRARY } from "./model";
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
    </g>
    <g id="Segment_Layer"/>
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
    <g id="Text_Layer"/>
    <g id="Measurement_Layer"/>
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
    expect(result.stats).toMatchObject({ nodes: 2, edges: 0, measurementGroups: 0, staticNodes: 0 });
  });
});
