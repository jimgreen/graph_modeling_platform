import { describe, expect, test } from "vitest";

import { svgImageContentMarkup } from "./svgUtils";

describe("svg image content markup", () => {
  test("renders svg data urls as inline svg so nested images remain visible", () => {
    const source = [
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 10">',
      '<image href="/api/images/nested-symbol" x="1" y="2" width="8" height="6"/>',
      '<circle class="inline-shape" cx="15" cy="5" r="3"/>',
      "</svg>"
    ].join("");
    const href = `data:image/svg+xml;utf8,${encodeURIComponent(source)}`;

    const markup = svgImageContentMarkup(href, {
      x: -10,
      y: -5,
      width: 20,
      height: 10,
      preserveAspectRatio: "xMidYMid meet",
      clipPath: "url(#clip-node)",
      className: "node-background-image"
    });

    expect(markup).toContain("<svg");
    expect(markup).toContain('class="export-inline-svg-image node-background-image"');
    expect(markup).toContain('clip-path="url(#clip-node)"');
    expect(markup).toContain('href="/api/images/nested-symbol"');
    expect(markup).toContain('class="inline-shape"');
    expect(markup).not.toContain('href="data:image/svg+xml');
  });
});
