// inlineBackendImageRefsInSvgDataUrl 的直接单测 —— 此前仅 1 处直呼，
// 而它有 **3 个生产调用点**：SVG 导出路径（src/export/svg.ts:158，Node 原生直载）
// 与两条静态渲染路径（src/staticRenderUtils.ts:246/248）。
//
// 它决定**导出的 SVG 能否自包含**：把 SVG 内部对后端图片的引用
// （`/webgrp/images/<id>`）改写成内联 data URI。做不到时导出的 SVG 里图片是断的，
// 而导出流程**不报错** —— 只有打开文件看图裂了才知道。
import { describe, expect, test } from "vitest";
import { inlineBackendImageRefsInSvgDataUrl as inline } from "./svgUtils";

const PNG = "data:image/png;base64,iVBORw0KGgo=";
const SVG_ASSET = "data:image/svg+xml,<svg/>";
const wrap = (inner: string) => `<svg xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;
const refImage = wrap(`<image href="/webgrp/images/a1"/>`);

/** 输出经 encodeURIComponent 编码，断言内容前必须先解码 */
const decode = (out: string) => decodeURIComponent(out.replace("data:image/svg+xml;utf8,", ""));

describe("核心：只有可内联的 image data URL 才替换引用", () => {
  test("assets 命中且是 image data URL → 改写为内联 data URI", () => {
    const out = inline(refImage, { a1: PNG });
    expect(out.startsWith("data:image/svg+xml;utf8,")).toBe(true);
    const decoded = decode(out);
    expect(decoded).toContain('href="data:image/png;base64,iVBORw0KGgo="');
    expect(decoded).not.toContain("/webgrp/images/a1");
  });

  test("**四种「不可内联」情形一律原样返回**（连字符串都不变）", () => {
    // 未命中 / id 不匹配 / asset 是 http URL / asset 是空串 —— 全部保持原引用。
    // 用严格相等（===）而非 toContain，正是为了钉住「完全不改动」这条契约。
    const cases: Record<string, string>[] = [
      {},
      { other: PNG },
      { a1: "https://x.test/a.png" },
      { a1: "" }
    ];
    for (const assets of cases) {
      expect(inline(refImage, assets), JSON.stringify(assets)).toBe(refImage);
    }
  });

  test("asset 是非图片的 data URI（如 data:text/...）→ 不替换", () => {
    // isImageDataUrl 只认 data:image/ 前缀
    expect(inline(refImage, { a1: "data:text/plain;base64,aGk=" })).toBe(refImage);
  });

  test("可内联与不可内联混合：只改写该改的", () => {
    const svg = wrap(
      `<image href="/webgrp/images/a1"/><image href="/webgrp/images/a2"/><image href="https://x.test/keep.png"/>`
    );
    const decoded = decode(inline(svg, { a1: PNG, a2: "https://x.test/nope.png" }));
    expect(decoded).toContain('href="data:image/png;base64,iVBORw0KGgo="'); // a1 改写
    expect(decoded).toContain('href="/webgrp/images/a2"');                      // a2 保持
    expect(decoded).toContain('href="https://x.test/keep.png"');               // 外部引用保持
  });
});

describe("输入形态的守卫", () => {
  test("空串 / 纯空白 / undefined → 空串", () => {
    for (const v of ["", "   ", undefined]) {
      expect(inline(v as never, { a1: PNG })).toBe("");
    }
  });

  test("非 SVG 输入（裸 PNG data URL）→ 原样返回，不试图当 SVG 解析", () => {
    expect(inline(PNG, { a1: PNG })).toBe(PNG);
  });

  test("未改动时**保留原形态**；输入本身是 data URI 时输出形态变为 `;utf8,`", () => {
    // 这是探针实测到的形态变化：输入 `data:image/svg+xml,<encoded>`，
    // 一旦有改动就重新编码成 `data:image/svg+xml;utf8,<encoded>`（注意不带 charset=）。
    const inDataUri = `data:image/svg+xml,${encodeURIComponent(refImage)}`;
    const out = inline(inDataUri, { a1: PNG });
    expect(out.startsWith("data:image/svg+xml;utf8,")).toBe(true);
    expect(out).not.toContain("charset=");
    expect(decode(out)).toContain('href="data:image/png;base64,iVBORw0KGgo="');

    // 未改动时则**保持输入原形态**（不加 utf8、不重新编码）
    expect(inline(inDataUri, {})).toBe(inDataUri);
  });
});

describe("href 正则的边界（与 svg-images 的嵌套扫描同一套约束）", () => {
  const replaced = (inner: string) => inline(wrap(inner), { a1: PNG }) !== wrap(inner);

  test("替换：双引号 / 单引号 / 换行缩进 / 大写 HREF / xlink: 前缀", () => {
    for (const inner of [
      '<image href="/webgrp/images/a1"/>',
      "<image href='/webgrp/images/a1'/>",
      '<image\n  href="/webgrp/images/a1"/>',
      '<image HREF="/webgrp/images/a1"/>',
      '<image xlink:href="/webgrp/images/a1"/>'
    ]) {
      expect(replaced(inner), inner).toBe(true);
    }
  });

  test("**不替换**：无前导空白（防误匹配属性名一部分）、无引号", () => {
    // \s 前缀要求：imagenhref 不是 href 属性
    expect(replaced('<imagehref="/webgrp/images/a1"/>')).toBe(false);
    expect(replaced('<image href=/webgrp/images/a1/>')).toBe(false);
  });

  test("同一张图被引用多次 → 全部改写", () => {
    const decoded = decode(inline(wrap(`<image href="/webgrp/images/a1"/><image href="/webgrp/images/a1"/>`), { a1: PNG }));
    expect(decoded.match(/data:image\/png/g)).toHaveLength(2);
  });
});

describe("escapeXml 防注入", () => {
  test("asset 值里的双引号被转成 &quot;，无法逃逸出属性", () => {
    // 探针实测：恶意 asset 的 `" onload="` 被转义，输出里不存在未转义的 `" onload=`
    const evil = 'data:image/png;base64,x" onload="alert(1)';
    const decoded = decode(inline(refImage, { a1: evil }));
    expect(decoded).not.toMatch(/" onload=/);
    expect(decoded).toContain("&quot;");
  });
});

describe("嵌套 SVG data URI（体积膨胀面，如实记录）", () => {
  test("asset 本身是 SVG data URI → 内联后形成嵌套（外层 URI 里再套一层）", () => {
    const decoded = decode(inline(refImage, { a1: SVG_ASSET }));
    expect(decoded).toContain("data:image/svg+xml,");
    // asset 的原始尖括号被 escapeXml 转义，不会提前闭合外层 <image>
    expect(decoded).toContain("&lt;svg/&gt;");
  });
});
