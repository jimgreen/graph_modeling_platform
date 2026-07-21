import { describe, expect, test } from "vitest";

import { decodeSvgImageSource, inlineBackendImageRefsInSvgDataUrl, svgImageContentMarkup } from "./svgUtils";

describe("svg image content markup", () => {
  test("uses image fit mode to render stretched images", () => {
    const markup = svgImageContentMarkup("/webgrp/images/background", {
      x: 0,
      y: 0,
      width: 120,
      height: 80,
      imageFit: "stretch",
      className: "canvas-background-image"
    });

    expect(markup).toContain('preserveAspectRatio="none"');
    expect(markup).toContain('class="canvas-background-image"');
  });

  test("uses image fit mode to render tiled images", () => {
    const markup = svgImageContentMarkup("/webgrp/images/tile", {
      x: 4,
      y: 6,
      width: 120,
      height: 80,
      imageFit: "tile",
      className: "node-background-image"
    });

    expect(markup).toContain("<pattern");
    expect(markup).toContain('patternUnits="userSpaceOnUse"');
    expect(markup).toContain('href="/webgrp/images/tile"');
    expect(markup).toContain('<rect x="4" y="6" width="120" height="80" fill="url(#');
    expect(markup).toContain('class="node-background-image"');
  });

  test("renders svg data urls as inline svg so nested images remain visible", () => {
    const source = [
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 10">',
      '<image href="/webgrp/images/nested-symbol" x="1" y="2" width="8" height="6"/>',
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
    expect(markup).toContain('<g clip-path="url(#clip-node)">');
    expect(markup).toContain('class="export-inline-svg-image node-background-image"');
    expect(markup).not.toContain('<svg class="export-inline-svg-image node-background-image" x="-10" y="-5" width="20" height="10" preserveAspectRatio="xMidYMid meet" clip-path=');
    expect(markup).toContain('href="/webgrp/images/nested-symbol"');
    expect(markup).toContain('class="inline-shape"');
    expect(markup).not.toContain('href="data:image/svg+xml');
  });

  test("keeps the full root svg body when inline svg contains nested svg elements", () => {
    const source = [
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 160">',
      '<g transform="translate(20 20)">',
      '<svg x="-12" y="-12" width="24" height="24" viewBox="0 0 24 24">',
      '<rect x="6" y="6" width="12" height="12"/>',
      "</svg>",
      "</g>",
      '<text class="after-nested-svg" x="120" y="140">label after nested svg</text>',
      "</svg>"
    ].join("");
    const href = `data:image/svg+xml;utf8,${encodeURIComponent(source)}`;

    const markup = svgImageContentMarkup(href, {
      x: -75,
      y: -46,
      width: 150,
      height: 92,
      preserveAspectRatio: "xMidYMid slice",
      className: "node-background-image"
    });

    expect(markup).toContain('<svg x="-12" y="-12" width="24" height="24" viewBox="0 0 24 24">');
    expect(markup).toContain('class="after-nested-svg"');
    expect(markup).toContain("label after nested svg");
    expect(markup).toContain("</g><text");
    expect(markup.endsWith("</svg>")).toBe(true);
  });

  test("strips embedded style tags from inline svg images so global selectors cannot leak", () => {
    const source = [
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">',
      "<style>path,line{stroke-width:0!important;stroke:transparent!important}</style>",
      '<path d="M4 12h16" stroke="currentColor" stroke-width="2"/>',
      '<line x1="12" y1="4" x2="12" y2="20" stroke="currentColor" stroke-width="2"/>',
      "</svg>"
    ].join("");
    const href = `data:image/svg+xml;utf8,${encodeURIComponent(source)}`;

    const markup = svgImageContentMarkup(href, {
      x: -12,
      y: -12,
      width: 24,
      height: 24,
      preserveAspectRatio: "xMidYMid meet",
      className: "node-background-image"
    });

    expect(markup).toContain("<svg");
    expect(markup).not.toContain("<style");
    expect(markup).not.toContain("stroke-width:0");
    expect(markup).toContain('<path d="M4 12h16"');
    expect(markup).toContain('<line x1="12" y1="4"');
  });

  test("inlines cached backend image refs inside svg data urls", () => {
    const source = [
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 10">',
      '<image href="/webgrp/images/icon-a?cache=1" x="1" y="2" width="8" height="6"/>',
      '<image xlink:href="/webgrp/images/icon-b" x="11" y="2" width="8" height="6"/>',
      "</svg>"
    ].join("");
    const href = `data:image/svg+xml;utf8,${encodeURIComponent(source)}`;

    const result = inlineBackendImageRefsInSvgDataUrl(href, {
      "icon-a": "data:image/png;base64,aWNvbi1h",
      "icon-b": "/webgrp/images/icon-b"
    });
    const decoded = decodeSvgImageSource(result);

    expect(decoded).toContain('href="data:image/png;base64,aWNvbi1h"');
    expect(decoded).not.toContain("/webgrp/images/icon-a");
    expect(decoded).toContain('xlink:href="/webgrp/images/icon-b"');
  });

  test("prefixes internal ids when the same svg is inlined more than once", () => {
    const source = [
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">',
      '<defs>',
      '<clipPath id="clip-shape"><rect x="2" y="2" width="20" height="20"/></clipPath>',
      '<linearGradient id="fill-gradient"><stop offset="0" stop-color="#fff"/></linearGradient>',
      '<symbol id="symbol-shape"><circle cx="12" cy="12" r="6"/></symbol>',
      "</defs>",
      '<use href="#symbol-shape" fill="url(#fill-gradient)" clip-path="url(#clip-shape)"/>',
      "</svg>"
    ].join("");
    const href = `data:image/svg+xml;utf8,${encodeURIComponent(source)}`;

    const first = svgImageContentMarkup(href, {
      x: -12,
      y: -12,
      width: 24,
      height: 24,
      clipPath: "url(#clip-first)",
      className: "node-background-image"
    });
    const second = svgImageContentMarkup(href, {
      x: -18,
      y: -18,
      width: 36,
      height: 36,
      clipPath: "url(#clip-second)",
      className: "node-background-image"
    });
    const combined = `${first}${second}`;

    const ids = Array.from(combined.matchAll(/\sid="([^"]+)"/gu), (match) => match[1]);
    expect(ids).toHaveLength(6);
    expect(new Set(ids).size).toBe(ids.length);
    expect(combined).not.toContain('id="clip-shape"');
    expect(combined).not.toContain('href="#symbol-shape"');
    expect(combined).not.toContain("url(#fill-gradient)");
    expect(combined).not.toContain("url(#clip-shape)");
    expect(combined).toMatch(/href="#inline-svg-[^"]+-symbol-shape"/u);
    expect(combined).toMatch(/fill="url\(#inline-svg-[^"]+-fill-gradient\)"/u);
    expect(combined).toMatch(/clip-path="url\(#inline-svg-[^"]+-clip-shape\)"/u);
  });

  test("keeps internal ids unique for repeated inline svg without an outer clip path", () => {
    const source = [
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">',
      '<defs><clipPath id="icon-clip"><rect x="0" y="0" width="20" height="20"/></clipPath></defs>',
      '<circle cx="10" cy="10" r="8" clip-path="url(#icon-clip)"/>',
      "</svg>"
    ].join("");
    const href = `data:image/svg+xml;utf8,${encodeURIComponent(source)}`;
    const options = {
      x: -10,
      y: -10,
      width: 20,
      height: 20,
      className: "export-node-image"
    };

    const combined = `${svgImageContentMarkup(href, options)}${svgImageContentMarkup(href, options)}`;
    const ids = Array.from(combined.matchAll(/\sid="([^"]+)"/gu), (match) => match[1]);

    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);
    expect(combined).not.toContain('id="icon-clip"');
    expect(combined).not.toContain('clip-path="url(#icon-clip)"');
  });
});
