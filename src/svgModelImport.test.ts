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
