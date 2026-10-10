import { readFile } from "node:fs/promises";
import { afterEach, describe, expect, test, vi } from "vitest";

import {
  backendImageIdFromHref,
  decodeBase64Text,
  decodeSvgImageSource,
  inlineBackendImageRefsInSvgDataUrl,
  inlineSvgRootMarkup,
  isImageDataUrl,
  isPlatformDeviceVisualReplacementImage,
  resolveNodeForegroundImage,
  resolveNodeImage,
  svgImageContentMarkup
} from "./svgUtils";
// app 侧包装（.tsx）：只补「assets 缺省读 localStorage」这一层，算法在 ./svgUtils。
import {
  resolveNodeForegroundImage as appResolveNodeForegroundImage,
  resolveNodeImage as appResolveNodeImage
} from "./appExtracted/appCoreCanvasUtilities";
import type { ModelNode } from "./model";
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

// 下面这一组针对三个 href / data URL 入口的同一句归一：`String(value ?? "").trim()`。
// href 在渲染链路上来自模板 JSON、粘贴、后端图片缓存，带首尾空白是常态；而 value
// 本身可能是 undefined/null。两条断言的鉴别力落在 **trim** 上：
//   · 两个匹配正则都用 `^` / 锚定前缀，去掉 trim 后带空白的合法输入立刻失配 → 转红。
//   · `?? ""` 这一侧不能被独立鉴别：String(null) 得到 "null"，同样匹配不上任何
//     锚定正则 —— 把它改成 String(value) 在本函数的输入空间里全域等价，故只覆盖、
//     不断言（见下方注释）。
describe("图片 href / data URL 入口的归一化", () => {
  test("backendImageIdFromHref 先去首尾空白，再解出百分号编码的 id", () => {
    expect(backendImageIdFromHref(`  ${apiPath("/images/icon%20a")}  `)).toBe("icon a");
    // 无空白 + 带查询串：路径段到 ? 为止，百分号解码后是图片 id
    expect(backendImageIdFromHref(`${apiPath("/images/icon-a")}?cache=1`)).toBe("icon-a");
  });

  test("backendImageIdFromHref 对空值与非图片 href 返回空串", () => {
    // `?? ""` 的右支：渲染链路里 backgroundImage 可能是 undefined，此处不得抛
    expect(backendImageIdFromHref(null as unknown as string)).toBe("");
    expect(backendImageIdFromHref(undefined as unknown as string)).toBe("");
    expect(backendImageIdFromHref("   ")).toBe("");
    expect(backendImageIdFromHref("data:image/png;base64,aWNvbi1h")).toBe("");
    // 前缀不对就不认（少了 apiPath 前缀的裸路径）
    expect(backendImageIdFromHref("/images/icon-a")).toBe("");
  });

  test("isImageDataUrl 忽略首尾空白，只认 data:image/ 前缀", () => {
    expect(isImageDataUrl("  data:image/png;base64,aWNvbi1h  ")).toBe(true);
    expect(isImageDataUrl("data:image/svg+xml;utf8,%3Csvg%2F%3E")).toBe(true);
    // 对照组：前缀不是 data:image/ 的，即使带空白也不认
    expect(isImageDataUrl("  data:text/html,<b>x</b>  ")).toBe(false);
    expect(isImageDataUrl("https://example.com/icon.png")).toBe(false);
    expect(isImageDataUrl(null as unknown as string)).toBe(false);
  });
});

// decodeBase64Text 有两条环境兜底，都只在「宿主缺 API」时才走到，而 Node 测试环境
// 里 atob / TextDecoder 都在 —— 所以必须先把全局桩掉再调用。
// 两条用例都先断言正常路径，否则下面那条期望空串的断言在「函数压根不解码」的错误实现下
// 也会恒绿（setup 把被探测的输入消掉 = 废断言）。
describe("decodeBase64Text 的宿主环境兜底", () => {
  const b64 = (text: string) => Buffer.from(text, "utf8").toString("base64");
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("atob 不是函数时返回空串，不抛", () => {
    expect(decodeBase64Text(b64("<svg/>"))).toBe("<svg/>");
    vi.stubGlobal("atob", undefined);
    // 走到 typeof decoder !== "function" 的早退：返回空串而不是抛 TypeError
    expect(decodeBase64Text(b64("<svg/>"))).toBe("");
  });

  test("缺 TextDecoder 时退回 latin1 原始字节，不做 UTF-8 解码", () => {
    // "中" 的 UTF-8 是 E4 B8 AD；正常路径必须还原成 "中"
    expect(decodeBase64Text(b64("中"))).toBe("中");
    vi.stubGlobal("TextDecoder", undefined);
    // 无 TextDecoder → 直接返回 atob 的 latin1 串，于是多字节 UTF-8 变成乱码
    expect(decodeBase64Text(b64("中"))).toBe("\u00e4\u00b8\u00ad");
    expect(decodeBase64Text(b64("中"))).toHaveLength(3);
    // ASCII 载荷两条路径一致，说明退化只影响多字节
    expect(decodeBase64Text(b64("ok"))).toBe("ok");
  });
});

describe("decodeSvgImageSource 的承载形态与畸形输入", () => {
  test("裸 SVG：去掉首尾空白后原样返回", () => {
    const source = '<svg xmlns="http://www.w3.org/2000/svg"><rect width="1" height="1"/></svg>';
    expect(decodeSvgImageSource(`\n  ${source}  \n`)).toBe(source);
    expect(decodeSvgImageSource(source)).toBe(source);
    // `?? ""` 的右支 + 空串早退：不得抛，也不得返回 "undefined"
    expect(decodeSvgImageSource(null as unknown as string)).toBe("");
    expect(decodeSvgImageSource(undefined as unknown as string)).toBe("");
    expect(decodeSvgImageSource("   ")).toBe("");
  });

  test("svg+xml data URL 缺逗号时返回空串", () => {
    // 元数据与 payload 之间没有分隔符，payload 无从切分
    expect(decodeSvgImageSource("data:image/svg+xml;base64")).toBe("");
    expect(decodeSvgImageSource("data:image/svg+xml")).toBe("");
    // 对照：同一前缀带上逗号就是好的 —— 判据是「有没有逗号」而不是前缀本身
    expect(decodeSvgImageSource("data:image/svg+xml,%3Csvg%2F%3E")).toBe("<svg/>");
  });

  test("URI 编码非法时原样返回未解码的 payload（钉住现状）", () => {
    const href = "data:image/svg+xml;utf8,%3Csvg%3E%ZZ%3C%2Fsvg%3E";
    expect(decodeSvgImageSource(href)).toBe("%3Csvg%3E%ZZ%3C%2Fsvg%3E");
    // 对照：合法编码走 decodeURIComponent 分支，畸形才落 catch
    expect(decodeSvgImageSource(`data:image/svg+xml;utf8,${encodeURIComponent("<svg/>")}`)).toBe("<svg/>");
  });
});

describe("inlineSvgRootMarkup 的 id 作用域与 viewBox 合成", () => {
  const options = { x: -12, y: -12, width: 24, height: 24, className: "node-background-image" };
  const dataUrl = (svg: string) => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

  test("空 id 属性不进作用域集合，原样保留", () => {
    const markup = inlineSvgRootMarkup(
      dataUrl(
        [
          '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">',
          '<defs><clipPath id="clip-a"><rect x="0" y="0" width="24" height="24"/></clipPath></defs>',
          '<rect id="" width="24" height="24" clip-path="url(#clip-a)"/>',
          "</svg>"
        ].join("")
      ),
      options
    );
    // id="" 不是合法引用目标，collectInlineSvgIds 会跳过它，于是重写 id 属性时
    // 命中「不在集合里」那条腿、原样返回 match。若把判据写成恒真，这里会多出一个
    // id="inline-svg-…-" 这种指向根节点的空 id。
    expect(markup).toContain('id=""');
    expect(markup).not.toMatch(/id="inline-svg-[^"]*-"/u);
    // 同时证明作用域化确实发生了 —— 否则上面两条只是因为压根没进作用域分支才成立
    expect(markup).toMatch(/clip-path="url\(#inline-svg-[^"]+-clip-a\)"/u);
  });

  test("无 viewBox 但宽高为正时按根属性宽高合成 viewBox", () => {
    const markup = inlineSvgRootMarkup(
      dataUrl('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="16"><rect/></svg>'),
      options
    );
    expect(markup).toContain('viewBox="0 0 24 16"');
    // 根属性的 width/height 必须被剔除，否则会和外层 svg 元素自己的宽高打架
    // （body 里刻意不放 width，保证这里数到的就是根属性残留）
    expect(markup.match(/width="24"/gu)).toHaveLength(1);
    expect(markup).not.toContain('height="16"');
  });

  test("宽高缺一或为 0 时不合成 viewBox", () => {
    // width=0 走到 width <= 0 那一腿（height 合法），且根属性里本来没有 viewBox
    const zeroWidth = inlineSvgRootMarkup(
      dataUrl('<svg xmlns="http://www.w3.org/2000/svg" width="0" height="16"><rect/></svg>'),
      options
    );
    expect(zeroWidth).not.toContain("viewBox");
    // 缺 height → svgLengthNumber("") 得 0 → 落到 height <= 0 那条腿
    const noHeight = inlineSvgRootMarkup(
      dataUrl('<svg xmlns="http://www.w3.org/2000/svg" width="24"><rect/></svg>'),
      options
    );
    expect(noHeight).not.toContain("viewBox");
    // 作者自己声明了 viewBox：即便没有宽高也不合成（viewBox 属性不被剔除，计数仍是 1）
    const explicit = inlineSvgRootMarkup(
      dataUrl('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 8"><rect/></svg>'),
      options
    );
    expect(explicit).toContain('viewBox="0 0 8 8"');
    expect(explicit.match(/viewBox="/gu)).toHaveLength(1);
  });
});

/* 节点图片回落链：单源在 svgUtils.ts，app 侧与 server 直载侧各走一个入口 */

describe("resolveNodeImage / resolveNodeForegroundImage 单源回落链", () => {
  // 直接调单源（不是经某个聚合入口）—— 否则单源里任何一层归一化都不可观测。
  const nodeWith = (params: Record<string, string>) => ({ params } as ModelNode);

  // 键值覆盖到位图 dataUrl。**刻意含空串键 ""**：`(assetId && assets[assetId])` 的
  // `assetId &&` 短路正是为它准备的 —— 把守卫换成裸 `assets[assetId]` 时，
  // `assetId === ""` 这一行会从「回落到 param」翻成「返回 assets[""]」。
  const ASSETS = { a: "assetA.png", b: "assetB.png", "": "emptyKeyAsset.png" } as Record<string, string>;

  test("assetId 命中优先于 param", () => {
    const node = nodeWith({ backgroundImageAssetId: "a", backgroundImage: "paramBg.png" });
    expect(resolveNodeImage(node, ASSETS)).toBe("assetA.png");

    const fg = nodeWith({ foregroundImageAssetId: "b", foregroundImage: "paramFg.png" });
    expect(resolveNodeForegroundImage(fg, ASSETS)).toBe("assetB.png");
  });

  test("assetId 未命中（键不存在）回落到 param", () => {
    expect(resolveNodeImage(nodeWith({ backgroundImageAssetId: "zz", backgroundImage: "bg.png" }), ASSETS)).toBe("bg.png");
    expect(resolveNodeForegroundImage(nodeWith({ foregroundImageAssetId: "zz", foregroundImage: "fg.png" }), ASSETS)).toBe("fg.png");
  });

  test("assetId 命中但值为空串时仍回落 param —— 空串是 falsy，不是命中", () => {
    const emptyValued = { a: "" } as Record<string, string>;
    expect(resolveNodeImage(nodeWith({ backgroundImageAssetId: "a", backgroundImage: "bg.png" }), emptyValued)).toBe("bg.png");
  });

  test("assetId 缺省时不查表；assetId 为空串时短路不查表", () => {
    // 缺 assetId：`undefined && ...` → undefined，压根不读 assets
    expect(resolveNodeImage(nodeWith({ backgroundImage: "bg.png" }), ASSETS)).toBe("bg.png");
    // assetId === ""：`"" && ...` → "" falsy → 回落。注意 ASSETS 里 "" 键有值，
    // 裸 `assets[assetId]` 会在这里返回 emptyKeyAsset.png 而不是 bg.png。
    expect(resolveNodeImage(nodeWith({ backgroundImageAssetId: "", backgroundImage: "bg.png" }), ASSETS)).toBe("bg.png");
    expect(resolveNodeForegroundImage(nodeWith({ foregroundImageAssetId: "", foregroundImage: "fg.png" }), ASSETS)).toBe("fg.png");
  });

  test("两级都落空时返回空串（不是 undefined）", () => {
    expect(resolveNodeImage(nodeWith({}), ASSETS)).toBe("");
    expect(resolveNodeForegroundImage(nodeWith({}), ASSETS)).toBe("");
    // assetId 指向一张图，但没有 param —— 这一腿仍应返回图，而不是空串
    expect(resolveNodeImage(nodeWith({ backgroundImageAssetId: "a" }), ASSETS)).toBe("assetA.png");
  });

  test("assets 缺省时按空表处理（读 localStorage 的默认值只在浏览器侧补）", () => {
    expect(resolveNodeImage(nodeWith({ backgroundImageAssetId: "a", backgroundImage: "bg.png" }))).toBe("bg.png");
    expect(resolveNodeImage(nodeWith({ backgroundImageAssetId: "a" }))).toBe("");
  });

  // 跨侧一致性：app 侧（.tsx 包装，assets 缺省读 localStorage）与 server 直载侧
  // （src/export/svg.ts 直接 import 单源）走的是**同一个**回落链实现。
  // 这条断言锁的是「不再各写一份」：任一侧回退成内联拷贝、或两条链的某一级次序不同，
  // 就会在这里转红。
  test("app 侧包装与单源逐例一致（同 node + 同 assets → 同字符串）", () => {
    const cases: Record<string, string>[] = [
      { backgroundImageAssetId: "a", backgroundImage: "bg.png" },
      { backgroundImageAssetId: "zz", backgroundImage: "bg.png" },
      { backgroundImageAssetId: "", backgroundImage: "bg.png" },
      { backgroundImageAssetId: "a" },
      { backgroundImageAssetId: "a", backgroundImage: "" },
      { backgroundImage: "bg.png" },
      {}
    ];
    for (const params of cases) {
      expect(appResolveNodeImage(nodeWith(params), ASSETS)).toBe(resolveNodeImage(nodeWith(params), ASSETS));
    }

    const fgCases: Record<string, string>[] = [
      { foregroundImageAssetId: "b", foregroundImage: "fg.png" },
      { foregroundImageAssetId: "zz", foregroundImage: "fg.png" },
      { foregroundImageAssetId: "", foregroundImage: "fg.png" },
      { foregroundImageAssetId: "b" },
      { foregroundImage: "fg.png" },
      {}
    ];
    for (const params of fgCases) {
      expect(appResolveNodeForegroundImage(nodeWith(params), ASSETS)).toBe(
        resolveNodeForegroundImage(nodeWith(params), ASSETS)
      );
    }
  });

  // app 侧包装只在 assets 缺省时读 localStorage；显式传入时不应碰存储。
  // 若哪天包装层被改成无条件 readImageAssets()，这条会因 localStorage 未装而抛。
  test("app 侧包装显式传入 assets 时不读 localStorage", () => {
    const saved = (globalThis as { localStorage?: unknown }).localStorage;
    (globalThis as { localStorage?: unknown }).localStorage = undefined;
    try {
      expect(appResolveNodeImage(nodeWith({ backgroundImageAssetId: "a" }), ASSETS)).toBe("assetA.png");
    } finally {
      (globalThis as { localStorage?: unknown }).localStorage = saved;
    }
  });
});

/* 「单源」这条契约本身：两侧都不得再内联回落链 */

/**
 * 「只有一份实现」这条契约的守卫：两个消费方（server 直载的 `svg.ts` / 浏览器侧
 * `appCoreCanvasUtilities.tsx`）都只该调用 svgUtils 的单源，不该各自内联回落链。
 *
 * 为什么必须是静态守卫：上面那些**行为**断言在本任务之前就已经全绿了 ——
 * 把 svg.ts 改回内联拷贝，它们一条都不会红。契约是「只有一份实现」，
 * 不是「两份实现行为相同」，所以只能读源码验。
 */
const INLINE_ASSET_RESOLVE_DEF = /^\s*(?:export\s+)?function\s+(?:resolveNodeImage|resolveNodeForegroundImage)\s*\(/u;

/**
 * 扫出「自己内联了回落链」的 `resolveNodeImage` / `resolveNodeForegroundImage` 定义，返回行号。
 *
 * 粒度是**函数定义**而不是文件，也不是整行匹配 `assets[assetId]`：
 *   - 文件粒度会把这个函数自己的定义也一起豁免掉，等于没扫；
 *   - 整行粒度会误伤 `resolveProjectImage`（同文件、同样的 `(assetId && assets[assetId])`
 *     形态，但读的 param 不同、也不在本任务范围内）。
 * 判据是「该函数体里出现了回落链本体」——`const assetId` 或 `assets[assetId]`。
 */
const findInlineAssetResolve = (source: string): number[] => {
  const lines = source.split(/\r?\n/u);
  const hits: number[] = [];
  lines.forEach((line, index) => {
    if (!INLINE_ASSET_RESOLVE_DEF.test(line)) {
      return;
    }
    // 顶层函数以「行首 }」收尾；扫到那里为止就是函数体。
    const end = lines.findIndex((candidate, cursor) => cursor > index && candidate === "}");
    const body = lines.slice(index + 1, end === -1 ? undefined : end).join("\n");
    if (/const\s+assetId\b/u.test(body) || body.includes("assets[assetId]")) {
      hits.push(index + 1);
    }
  });
  return hits;
};

describe("resolveNodeImage 回落链只有单源（静态守卫）", () => {
  // 检测逻辑自测：拿「恰好是当初那份内联拷贝」的文本喂进去，证明扫描器会转红。
  // 顺带证明它不是靠匹配本仓库现状蒙对的。
  const INLINE_COPY = [
    "function resolveNodeImage(node: ModelNode, assets: Record<string, string>) {",
    "  const assetId = node.params.backgroundImageAssetId;",
    "  return (assetId && assets[assetId]) || node.params.backgroundImage || \"\";",
    "}"
  ].join("\n");
  const DELEGATING_WRAPPER = [
    "export function resolveNodeImage(node: ModelNode, assets = readImageAssets()) {",
    "  return resolveNodeImageFromAssets(node, assets);",
    "}"
  ].join("\n");

  test("守卫自测：内联拷贝被检出，委托包装与调用侧不被误报", () => {
    expect(findInlineAssetResolve(INLINE_COPY)).toEqual([1]);
    expect(findInlineAssetResolve(DELEGATING_WRAPPER)).toEqual([]);
    // 同文件的 resolveProjectImage 是同形态的**另一条**链，不在本守卫范围内
    expect(
      findInlineAssetResolve(
        [
          "export function resolveProjectImage(project, assets = readImageAssets()) {",
          "  const assetId = project.canvasBackgroundImageAssetId;",
          "  return (assetId && assets[assetId]) || project.canvasBackgroundImage || \"\";",
          "}"
        ].join("\n")
      )
    ).toEqual([]);
    // 调用侧只是传参，不含 assetId 局部变量 —— 不该被判成内联
    expect(findInlineAssetResolve("const href = resolveNodeImage(node, imageAssets);")).toEqual([]);
    expect(findInlineAssetResolve("const href = exportSvgImageHref(resolveNodeForegroundImage(n, assets), map);")).toEqual([]);
  });

  test("两份拷贝（背景 + 前景都在同一文件内联）都算命中", () => {
    expect(findInlineAssetResolve(`${INLINE_COPY}\n${INLINE_COPY.replace("resolveNodeImage", "resolveNodeForegroundImage").replace("backgroundImage", "foregroundImage")}`)).toEqual([1, 5]);
  });

  test("src/export/svg.ts 不再内联回落链", async () => {
    const source = await readFile(new URL("./export/svg.ts", import.meta.url), "utf8");
    expect(findInlineAssetResolve(source)).toEqual([]);
  });

  test("src/appExtracted/appCoreCanvasUtilities.tsx 不再内联回落链", async () => {
    const source = await readFile(new URL("./appExtracted/appCoreCanvasUtilities.tsx", import.meta.url), "utf8");
    expect(findInlineAssetResolve(source)).toEqual([]);
  });
});
