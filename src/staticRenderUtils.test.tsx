import { describe, expect, test } from "vitest";

import { resolveStateVisualImageHref } from "./staticRenderUtils";
import { decodeSvgImageSource } from "./svgUtils";

describe("state visual image href resolution", () => {
  test("inlines cached backend image refs before terminal and canvas rendering", () => {
    const source = [
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 10">',
      '<image href="/webgrp/images/state-icon" x="1" y="2" width="8" height="6"/>',
      "</svg>"
    ].join("");
    const visual = {
      value: "1",
      name: "运行",
      image: `data:image/svg+xml;utf8,${encodeURIComponent(source)}`
    };

    const href = resolveStateVisualImageHref(visual, {
      "state-icon": "data:image/png;base64,c3RhdGUtaWNvbg=="
    });
    const decoded = decodeSvgImageSource(href);

    expect(decoded).toContain('href="data:image/png;base64,c3RhdGUtaWNvbg=="');
    expect(decoded).not.toContain("/webgrp/images/state-icon");
  });
});
