import { describe, expect, test } from "vitest";

import { decodeSvgImageSource, inlineBackendImageRefsInSvgDataUrl, isPlatformDeviceVisualReplacementImage, svgImageContentMarkup } from "./svgUtils";
import { apiPath } from "./config";

describe("svg image content markup", () => {
  test("uses image fit mode to render stretched images", () => {
    const markup = svgImageContentMarkup(apiPath("/images/background"), {
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
    const markup = svgImageContentMarkup(apiPath("/images/tile"), {
      x: 4,
      y: 6,
      width: 120,
      height: 80,
      imageFit: "tile",
      className: "node-background-image"
    });

    expect(markup).toContain("<pattern");
    expect(markup).toContain('patternUnits="userSpaceOnUse"');
    expect(markup).toContain('href="' + apiPath('/images/tile') + '"');
    expect(markup).toContain('<rect x="4" y="6" width="120" height="80" fill="url(#');
    expect(markup).toContain('class="node-background-image"');
  });

  test("renders svg data urls as inline svg so nested images remain visible", () => {
    const source = [
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 10">',
      '<image href="' + apiPath('/images/nested-symbol') + '" x="1" y="2" width="8" height="6"/>',
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
    expect(markup).toContain('href="' + apiPath('/images/nested-symbol') + '"');
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
      '<image href="' + apiPath('/images/icon-a?cache=1') + '" x="1" y="2" width="8" height="6"/>',
      '<image xlink:href="' + apiPath('/images/icon-b') + '" x="11" y="2" width="8" height="6"/>',
      "</svg>"
    ].join("");
    const href = `data:image/svg+xml;utf8,${encodeURIComponent(source)}`;

    const result = inlineBackendImageRefsInSvgDataUrl(href, {
      "icon-a": "data:image/png;base64,aWNvbi1h",
      "icon-b": apiPath("/images/icon-b")
    });
    const decoded = decodeSvgImageSource(result);

    expect(decoded).toContain('href="data:image/png;base64,aWNvbi1h"');
    expect(decoded).not.toContain(apiPath("/images/icon-a"));
    expect(decoded).toContain('xlink:href="' + apiPath('/images/icon-b') + '"');
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

// isPlatformDeviceVisualReplacementImage 判的是「这张图是平台自己生成的覆盖层，
// 不是用户元件图」。DeviceGlyph.deviceVisualReplacesGlyph 拿它的结果决定**整个图元
// 画不画**（为真则返回 null）—— 判错的两种后果都不报错：判正 → 设备在画布上凭空消失，
// 判负 → 内置图元压在用户图上。所以四族标记各自都要钉住。
describe("isPlatformDeviceVisualReplacementImage", () => {
  const raw = (attrs: string) => `<svg xmlns="http://www.w3.org/2000/svg"><g ${attrs}><rect/></g></svg>`;
  const dataUrl = (svg: string) => `data:image/svg+xml,${encodeURIComponent(svg)}`;
  const base64Url = (svg: string) =>
    `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`;

  test("状态图标绘制标记", () => {
    expect(isPlatformDeviceVisualReplacementImage(raw('data-state-icon-drawing="true"'))).toBe(true);
  });

  test("状态图标框标记", () => {
    expect(isPlatformDeviceVisualReplacementImage(raw("data-state-icon-frame='true'"))).toBe(true);
  });

  test("状态图标图层尺寸标记（width 与 height 各一族）", () => {
    expect(isPlatformDeviceVisualReplacementImage(raw('data-state-icon-layer-width="12"'))).toBe(true);
    expect(isPlatformDeviceVisualReplacementImage(raw('data-state-icon-layer-height="12"'))).toBe(true);
    // 这两条只看「有没有这个属性」，不看值：值非法也照样判正
    expect(isPlatformDeviceVisualReplacementImage(raw('data-state-icon-layer-width="0"'))).toBe(true);
  });

  test("自定义元件端子引线分组标记", () => {
    expect(
      isPlatformDeviceVisualReplacementImage(raw('data-custom-device-persisted-terminal-connectors="true"'))
    ).toBe(true);
  });

  test("属性名与属性值大小写不敏感", () => {
    expect(isPlatformDeviceVisualReplacementImage(raw('DATA-STATE-ICON-DRAWING="TRUE"'))).toBe(true);
    expect(isPlatformDeviceVisualReplacementImage(raw('data-state-icon-drawing="True"'))).toBe(true);
  });

  test("等号两侧的空白不影响命中", () => {
    expect(isPlatformDeviceVisualReplacementImage(raw('data-state-icon-drawing  =  "true"'))).toBe(true);
  });

  test("值必须是带引号的 true：裸 true 不认（钉住现状）", () => {
    // 平台自己的生成器一律写引号（见 customDeviceUtils.ts 的常量），所以带引号是契约；
    // 这里是记录「不写引号就判负」，不是鼓励这样写
    expect(isPlatformDeviceVisualReplacementImage(raw("data-state-icon-drawing=true"))).toBe(false);
  });

  test("值为 false / truex / 空串都不算覆盖层", () => {
    expect(isPlatformDeviceVisualReplacementImage(raw('data-state-icon-drawing="false"'))).toBe(false);
    expect(isPlatformDeviceVisualReplacementImage(raw('data-state-icon-drawing="truex"'))).toBe(false);
    expect(isPlatformDeviceVisualReplacementImage(raw('data-state-icon-drawing=""'))).toBe(false);
  });

  test("必须落在属性名边界上：前缀粘连的属性不算", () => {
    // \b 锚定：xdata-... 里的 data- 不是独立单词
    expect(isPlatformDeviceVisualReplacementImage(raw('xdata-state-icon-drawing="true"'))).toBe(false);
    expect(isPlatformDeviceVisualReplacementImage(raw('data-state-icon-drawing-extra="true"'))).toBe(false);
  });

  test("普通用户图元 SVG 判负", () => {
    // 判负是常态：绝大多数 backgroundImage 都是用户图，判正就会让设备消失
    expect(isPlatformDeviceVisualReplacementImage(raw('data-foo="bar"'))).toBe(false);
    expect(isPlatformDeviceVisualReplacementImage('<svg xmlns="http://www.w3.org/2000/svg"><rect/></svg>')).toBe(
      false
    );
  });

  test("非 SVG 的 data URL 判负（位图不是覆盖层）", () => {
    expect(isPlatformDeviceVisualReplacementImage("data:image/png;base64,iVBORw0KGgo=")).toBe(false);
    expect(isPlatformDeviceVisualReplacementImage("data:image/jpeg;base64,/9j/4AAQ")).toBe(false);
  });

  test("三种承载形态都认：裸 SVG、URI 编码 data URL、base64 data URL", () => {
    const marked = raw('data-state-icon-drawing="true"');
    expect(isPlatformDeviceVisualReplacementImage(marked)).toBe(true);
    expect(isPlatformDeviceVisualReplacementImage(dataUrl(marked))).toBe(true);
    expect(isPlatformDeviceVisualReplacementImage(base64Url(marked))).toBe(true);
  });

  test("承载形态解码后没有标记时判负", () => {
    // 防止「只要是 data URL 就判正」这种过宽实现
    const plain = raw('data-foo="bar"');
    expect(isPlatformDeviceVisualReplacementImage(dataUrl(plain))).toBe(false);
    expect(isPlatformDeviceVisualReplacementImage(base64Url(plain))).toBe(false);
  });

  test("空值与非字符串输入判负，不抛", () => {
    for (const value of ["", "   ", null, undefined, 0, false, {}, []]) {
      expect(isPlatformDeviceVisualReplacementImage(value as unknown), JSON.stringify(value ?? null)).toBe(false);
    }
  });

  test("标记只认 persisted-terminal-connectors 一族（钉住现状）", () => {
    // 事实记录：export/device-template-icon.ts 的剥离正则覆盖三个名字
    // （persisted-terminals / persisted-terminal-connectors / terminal-connectors），
    // 而本谓词只认第二个。实测全仓只有 persisted-terminal-connectors 会被生成
    // （customDeviceUtils.ts），所以另两个名字进不到这里 —— 不是缺陷，是范围。
    expect(isPlatformDeviceVisualReplacementImage(raw('data-custom-device-persisted-terminals="true"'))).toBe(false);
    expect(isPlatformDeviceVisualReplacementImage(raw('data-custom-device-terminal-connectors="true"'))).toBe(false);
  });
});
