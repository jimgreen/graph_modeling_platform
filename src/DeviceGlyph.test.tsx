import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { DeviceGlyph } from "./DeviceGlyph";
import { createDefaultNode } from "./model";

describe("DeviceGlyph static nodes", () => {
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
