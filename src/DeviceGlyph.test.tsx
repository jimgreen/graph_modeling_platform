import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { DeviceGlyph } from "./DeviceGlyph";
import {
  createDefaultNode,
  CUSTOM_DEVICE_TEMPLATE_KEY,
  serializeStaticDrawPoints,
  STATIC_DRAW_POINTS_PARAM
} from "./model";
import { createStateIconDrawingElement, stateIconDrawingToImage } from "./stateIconDrawing";
import { staticConnectorDrawingPath } from "./staticConnectorCurves";

describe("DeviceGlyph static nodes", () => {
  it("renders every saved landing point for the three interactive curve kinds", () => {
    const points = [
      { x: -90, y: -40 },
      { x: -30, y: 50 },
      { x: 35, y: -20 },
      { x: 95, y: 45 }
    ];
    for (const kind of ["static-bezier-connector", "static-smoothstep-connector", "static-self-loop"] as const) {
      const node = createDefaultNode(kind, { x: 0, y: 0 });
      const curveNode = {
        ...node,
        params: {
          ...node.params,
          [STATIC_DRAW_POINTS_PARAM]: serializeStaticDrawPoints(points)
        }
      };

      const markup = renderToStaticMarkup(<svg><DeviceGlyph node={curveNode} /></svg>);

      expect(markup).toContain(`d="${staticConnectorDrawingPath(kind, points)}"`);
    }
  });

  it("renders static text frame style params when they are configured", () => {
    const node = createDefaultNode("static-text", { x: 0, y: 0 });
    const styledNode = {
      ...node,
      size: { width: 120, height: 56 },
      params: {
        ...node.params,
        fillColor: "#e91616",
        strokeColor: "#176ee8",
        textColor: "#161127",
        lineWidth: "2",
        strokeStyle: "dotted",
        cornerRadius: "8",
        accentColor: "#2563eb"
      }
    };

    const markup = renderToStaticMarkup(<svg><DeviceGlyph node={styledNode} /></svg>);

    expect(markup).toContain('fill="#e91616"');
    expect(markup).toContain('stroke="#176ee8"');
    expect(markup).toContain('stroke-width="2"');
    expect(markup).toContain('stroke-dasharray="2 6"');
    expect(markup).toContain('rx="8"');
    expect(markup).toContain('stroke="#2563eb"');
    expect(markup).toContain('fill="#161127"');
  });

  it("renders static rect text and rounded border style params", () => {
    const node = createDefaultNode("static-rect", { x: 0, y: 0 });
    const styledNode = {
      ...node,
      size: { width: 140, height: 70 },
      params: {
        ...node.params,
        text: "矩形文字",
        fillColor: "#fff4cc",
        strokeColor: "#176ee8",
        textColor: "#161127",
        lineWidth: "3",
        strokeStyle: "dashed",
        cornerRadius: "12",
        accentColor: "#2563eb"
      }
    };

    const markup = renderToStaticMarkup(<svg><DeviceGlyph node={styledNode} /></svg>);

    expect(markup).toContain('fill="#fff4cc"');
    expect(markup).toContain('stroke="#176ee8"');
    expect(markup).toContain('stroke-width="3"');
    expect(markup).toContain('stroke-dasharray="10 6"');
    expect(markup).toContain('rx="12"');
    expect(markup).toContain('stroke="#2563eb"');
    expect(markup).toContain("矩形文字");
  });
});

describe("DeviceGlyph model-association derived devices", () => {
  it("enlarges station feeder and district source/load pictograms without enlarging hierarchy buttons", () => {
    const hierarchyIconScale = (kind: string) => {
      const node = createDefaultNode(kind, { x: 0, y: 0 });
      const markup = renderToStaticMarkup(<svg><DeviceGlyph node={node} mode="geometry" /></svg>);
      const scale = markup.match(/transform="translate\(0 [^)]+\) scale\(([^)]+)\)"/)?.[1];
      return Number(scale);
    };

    const cases = [
      ["ac-station-source", "static-model-interaction-station", 2],
      ["dc-station-load", "static-model-interaction-station", 2],
      ["ac-feeder-source", "static-model-interaction-feeder", 2],
      ["dc-feeder-load", "static-model-interaction-feeder", 2],
      ["ac-district-source", "static-model-interaction-district", 1.84],
      ["dc-district-load", "static-model-interaction-district", 1.84]
    ] as const;
    const buttonScales = new Set<number>();

    for (const [associationKind, buttonKind, visibleScaleMultiplier] of cases) {
      const associationScale = hierarchyIconScale(associationKind);
      const buttonScale = hierarchyIconScale(buttonKind);
      expect(buttonScale).toBeGreaterThan(0);
      expect(associationScale).toBeCloseTo(52 / 48 * visibleScaleMultiplier, 4);
      buttonScales.add(buttonScale);
    }
    expect(buttonScales.size).toBe(1);
  });

  it("keeps feeder association pictograms as a left-to-right branching structure", () => {
    const node = createDefaultNode("ac-feeder-source", { x: 0, y: 0 });
    const markup = renderToStaticMarkup(<svg><DeviceGlyph node={node} mode="geometry" /></svg>);

    expect(markup).toContain('d="M -16 0 H -7 M -7 0 L 4 -11 H 15 M -7 0 H 15 M -7 0 L 4 11 H 15"');
    expect(markup).toContain('cx="-16" cy="0"');
    expect(markup).toContain('cx="15" cy="-11"');
    expect(markup).toContain('cx="15" cy="11"');
  });

  it("renders station feeder and district pictograms without redundant source load or energy badges", () => {
    const cases = [
      ["ac-station-source", "station", "source", "ac", "ACGenerator"],
      ["dc-station-load", "station", "load", "dc", "DCLoad"],
      ["ac-feeder-source", "feeder", "source", "ac", "ACGenerator"],
      ["dc-feeder-load", "feeder", "load", "dc", "DCLoad"],
      ["dc-district-source", "district", "source", "dc", "DCGenerator"],
      ["ac-district-load", "district", "load", "ac", "ACLoad"]
    ] as const;

    for (const [kind, family, role, energyType, componentType] of cases) {
      const node = createDefaultNode(kind, { x: 0, y: 0 });
      const markup = renderToStaticMarkup(<svg><DeviceGlyph node={node} /></svg>);

      expect(markup).toContain("model-hierarchy-glyph");
      expect(markup).toContain(`model-association-glyph-${family}`);
      expect(markup).toContain(`model-hierarchy-glyph-role-${role}`);
      expect(markup).toContain(`model-hierarchy-glyph-energy-${energyType}`);
      expect(markup).toContain(`model-hierarchy-icon-${family}`);
      expect(markup).not.toContain("model-hierarchy-icon-backplate");
      expect(markup).not.toContain("model-hierarchy-energy-badge");
      expect(markup).not.toContain("model-hierarchy-role-badge-source");
      expect(markup).not.toContain("model-hierarchy-role-badge-load");
      expect(markup).not.toContain(`<rect x="${-node.size.width / 2}" y="${-node.size.height / 2}" width="${node.size.width}" height="${node.size.height}"`);
      expect(node.params.component_type).toBe(componentType);
      expect(node.params).not.toHaveProperty("buttonEnabled");
      expect(node.params).not.toHaveProperty("buttonTargetProjectId");
    }
  });

  it("uses the same three pictogram families for station feeder and district model-interaction buttons", () => {
    const cases = [
      ["static-model-interaction-station", "station", "厂站"],
      ["static-model-interaction-feeder", "feeder", "馈线"],
      ["static-model-interaction-district", "district", "台区"]
    ] as const;

    for (const [kind, family, label] of cases) {
      const node = createDefaultNode(kind, { x: 0, y: 0 });
      const geometryMarkup = renderToStaticMarkup(<svg><DeviceGlyph node={node} mode="geometry" /></svg>);
      const textMarkup = renderToStaticMarkup(<svg><DeviceGlyph node={node} mode="text" /></svg>);

      expect(geometryMarkup).toContain("model-interaction-glyph");
      expect(geometryMarkup).toContain(`model-hierarchy-glyph-${family}`);
      expect(geometryMarkup).toContain("model-hierarchy-glyph-role-button");
      expect(geometryMarkup).toContain(`model-hierarchy-icon-${family}`);
      expect(geometryMarkup).toContain("model-hierarchy-icon-backplate");
      expect(geometryMarkup).toContain("model-hierarchy-role-badge-button");
      expect(geometryMarkup).not.toContain(`<rect x="${-node.size.width / 2}" y="${-node.size.height / 2}" width="${node.size.width}" height="${node.size.height}"`);
      expect(textMarkup).toContain(`>${label}</text>`);
    }
  });
});

describe("DeviceGlyph custom devices", () => {
  it("keeps terminal reserved area transparent when a visual image is present", () => {
    const node = createDefaultNode("ac-load", { x: 0, y: 0 });
    const customNode = {
      ...node,
      kind: "custom-transparent-terminal-area" as any,
      size: { width: 240, height: 160 },
      params: {
        ...node.params,
        [CUSTOM_DEVICE_TEMPLATE_KEY]: "1",
        fillColor: "#ffffff",
        backgroundImage: "data:image/svg+xml;charset=utf-8,%3Csvg%3E%3C/svg%3E"
      },
      terminals: [
        { ...node.terminals[0], id: "t1" },
        { ...node.terminals[0], id: "t2" }
      ]
    };

    const markup = renderToStaticMarkup(<svg><DeviceGlyph node={customNode} /></svg>);

    expect(markup).toContain('fill="transparent"');
    expect(markup).not.toContain('fill="#ffffff"');
  });
});

describe("DeviceGlyph persisted definition visuals", () => {
  it("does not draw the built-in glyph underneath a platform drawing replacement", () => {
    const node = createDefaultNode("ac-source", { x: 0, y: 0 });
    const replacement = stateIconDrawingToImage([
      {
        ...createStateIconDrawingElement("circle"),
        x: 120,
        y: 80,
        width: 72,
        height: 72
      }
    ]);
    const customizedNode = {
      ...node,
      params: {
        ...node.params,
        backgroundImage: replacement
      }
    };

    const markup = renderToStaticMarkup(<svg><DeviceGlyph node={customizedNode} /></svg>);

    expect(markup).toBe("<svg></svg>");
  });

  it("keeps the built-in glyph when an ordinary background image is configured", () => {
    const node = createDefaultNode("ac-source", { x: 0, y: 0 });
    const customizedNode = {
      ...node,
      params: {
        ...node.params,
        backgroundImage: "data:image/png;base64,YmFja2dyb3VuZA=="
      }
    };

    const markup = renderToStaticMarkup(<svg><DeviceGlyph node={customizedNode} /></svg>);

    expect(markup).toContain("<circle");
    expect(markup).toContain(">AC</text>");
  });

  it("keeps an explicitly cleared built-in definition blank", () => {
    const node = createDefaultNode("ac-source", { x: 0, y: 0 });
    const clearedNode = {
      ...node,
      params: {
        ...node.params,
        backgroundImageCleared: "1"
      }
    };

    const markup = renderToStaticMarkup(<svg><DeviceGlyph node={clearedNode} /></svg>);

    expect(markup).toBe("<svg></svg>");
  });
});

describe("DeviceGlyph converter terminal ordering", () => {
  it("keeps the first and second terminal markers upright on mirrored and rotated converter glyphs", () => {
    for (const kind of ["dcdc-converter", "acac-converter"] as const) {
      const node = {
        ...createDefaultNode(kind, { x: 0, y: 0 }),
        rotation: 90,
        scaleX: -1,
        scaleY: 1.5
      };
      const markup = renderToStaticMarkup(<svg><DeviceGlyph node={node} /></svg>);

      const markerCounterTransforms = Array.from(markup.matchAll(
        /transform="translate\([^"]+\) (matrix\([^"]+\))"/g
      ));

      expect(markup).toContain('class="converter-terminal-order-markers"');
      expect(markerCounterTransforms).toHaveLength(2);
      expect(markerCounterTransforms.every((match) => match[1] !== "matrix(1 0 0 1 0 0)")).toBe(true);
    }
  });

  it("does not mark the already distinct AC/DC converter glyphs", () => {
    for (const kind of ["acdc-converter", "dcac-converter"] as const) {
      const node = createDefaultNode(kind, { x: 0, y: 0 });
      const markup = renderToStaticMarkup(<svg><DeviceGlyph node={node} /></svg>);

      expect(markup).not.toContain('class="converter-terminal-order-markers"');
    }
  });
});

describe("DeviceGlyph AC compensators", () => {
  it("renders distinct shunt capacitor and reactor symbols connected to the terminal side", () => {
    const capacitor = createDefaultNode("ac-capacitor", { x: 0, y: 0 });
    const reactor = createDefaultNode("ac-reactor", { x: 0, y: 0 });
    const capacitorMarkup = renderToStaticMarkup(<svg><DeviceGlyph node={capacitor} /></svg>);
    const reactorMarkup = renderToStaticMarkup(<svg><DeviceGlyph node={reactor} /></svg>);

    expect(capacitorMarkup).toContain("ac-shunt-compensator-glyph ac-shunt-capacitor");
    expect(capacitorMarkup).toContain("M -14 -8 H 14");
    expect(reactorMarkup).toContain("ac-shunt-compensator-glyph ac-shunt-reactor");
    expect(reactorMarkup).toContain('class="ac-reactor-coil"');
    expect(reactorMarkup).toContain("M 0 -7 H -18");
    expect(reactorMarkup).toContain("C -18 -17 -10 -25 0 -25");
    expect(reactorMarkup).toContain("C 18 3 10 11 0 11");

    const rightTerminalReactor = {
      ...reactor,
      terminals: [{ ...reactor.terminals[0], anchor: { x: 0.5, y: 0 } }]
    };
    const rightMarkup = renderToStaticMarkup(<svg><DeviceGlyph node={rightTerminalReactor} /></svg>);
    expect(rightMarkup).toContain('transform="rotate(90)"');
  });

  it("renders continuous, distinct series capacitor and reactor symbols", () => {
    const capacitorMarkup = renderToStaticMarkup(<svg><DeviceGlyph node={createDefaultNode("ac-series-capacitor", { x: 0, y: 0 })} /></svg>);
    const reactorMarkup = renderToStaticMarkup(<svg><DeviceGlyph node={createDefaultNode("ac-series-reactor", { x: 0, y: 0 })} /></svg>);

    expect(capacitorMarkup).toContain("ac-series-compensator-glyph ac-series-capacitor");
    expect(capacitorMarkup).toContain("M -50 0 H -7");
    expect(reactorMarkup).toContain("ac-series-compensator-glyph ac-series-reactor");
    expect(reactorMarkup).toContain('transform="rotate(-90)"');
    expect(reactorMarkup).toContain('class="ac-reactor-coil"');
    expect(reactorMarkup).toContain("M 0 -50 V -7 M 0 -7 H -18");
  });
});

describe("DeviceGlyph line-segment buses", () => {
  it.each([
    "ac-bus",
    "dc-bus",
    "hydrogen-bus",
    "heat-bus"
  ] as const)("keeps %s visual thickness unchanged when only its length grows", (kind) => {
    const original = {
      ...createDefaultNode(kind, { x: 0, y: 0 }),
      size: { width: 120, height: 36 }
    };
    const lengthened = {
      ...original,
      rotation: 90,
      size: { width: 240, height: 36 }
    };

    const originalMarkup = renderToStaticMarkup(<svg><DeviceGlyph node={original} /></svg>);
    const lengthenedMarkup = renderToStaticMarkup(<svg><DeviceGlyph node={lengthened} /></svg>);

    expect(originalMarkup).toContain('<rect class="bus-glyph" x="-60" y="-6" width="120" height="12"');
    expect(lengthenedMarkup).toContain('<rect class="bus-glyph" x="-120" y="-6" width="240" height="12"');
    expect(originalMarkup).not.toContain('<g transform="scale(');
    expect(lengthenedMarkup).not.toContain('<g transform="scale(');
  });

  it("changes bus visual thickness only when the local thickness dimension changes", () => {
    const node = {
      ...createDefaultNode("ac-bus", { x: 0, y: 0 }),
      size: { width: 240, height: 60 }
    };

    const markup = renderToStaticMarkup(<svg><DeviceGlyph node={node} /></svg>);

    expect(markup).toContain('<rect class="bus-glyph" x="-120" y="-10" width="240" height="20"');
    expect(markup).not.toContain('<g transform="scale(');
  });
});
