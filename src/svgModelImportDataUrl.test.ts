// svgModelImport 的「嵌套 SVG 图片」链路直测 —— decodeSvgDataUrl / sanitizeSvgDataUrl
// 此前 0 调用（整个文件 298/1355 行未覆盖）。
//
// ## 覆盖的是什么
//
// 导入的 SVG 里若带 `<image xlink:href="data:image/svg+xml,...">`，这层内嵌 SVG 会被
// 解码 → 递归消毒（剥 script/foreignObject/on* 属性/javascript:）→ 重新编码回原处。
// 三种编码形态各有分支：base64（走 atob）、带 charset 的 utf8、裸形态。
// 两条失败分支各有独立文案：解码失败原样保留、解析失败/层级过深移除该 href。
//
// ## 断言对象是「整份导入结果」
//
// generic 模式下 static-image 节点的 `params.backgroundImage` 就是**整份导入 SVG**
// 的重新编码（内层 href 已在其中被消毒），不是内层图片本身。所以这里统一断言
// 「解码后的整份文档」。
//
// ## 为什么重要
//
// 这是「导入外部 SVG」这条信任边界上唯一的**递归**消毒点。绕过它意味着
// 内层 SVG 里的脚本可以藏在 data URL 里。
//
// ## 依赖
//
// 复用仓库既有做法：用 `@xmldom/xmldom` 充当 node 环境下的 DOM（既有
// svgModelImport.test.ts / svgModelImportSmil.test.ts 同款），无需引入 jsdom。
import { DOMParser, XMLSerializer } from "@xmldom/xmldom";
import { describe, expect, test } from "vitest";

import { DEVICE_LIBRARY } from "./model";
import { parseSvgModel, svgDataUrl, type SvgDomAdapter } from "./svgModelImport";

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
    return new XMLSerializer().serializeToString(
      node as unknown as Parameters<XMLSerializer["serializeToString"]>[0]
    );
  }
};

const parse = (source: string) =>
  parseSvgModel(source, { name: "嵌套图片模型", templates: DEVICE_LIBRARY, dom, yieldToMain: async () => undefined });

/** 把一个 href 包进 <image> 作为整份待导入模型。 */
function importWithInnerHref(innerHref: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 40 40">
    <image xlink:href="${innerHref}" width="40" height="40"/>
    <rect x="0" y="0" width="40" height="40" fill="#eee"/>
  </svg>`;
}

type ParseResult = Awaited<ReturnType<typeof parse>>;

/** 取 static-image 节点的 backgroundImage（= 整份导入 SVG 的重新编码）。 */
function backgroundImageOf(result: ParseResult): string {
  const node = result.project.nodes.find((item) => item.kind === "static-image");
  return String(node?.params?.backgroundImage ?? "");
}

/** 解码 backgroundImage 载荷，得到消毒后的整份 SVG 文本。 */
function importedSvgOf(result: ParseResult): string {
  const dataUrl = backgroundImageOf(result);
  const comma = dataUrl.indexOf(",");
  return comma < 0 ? "" : decodeURIComponent(dataUrl.slice(comma + 1));
}

/**
 * 取出消毒后文档里 <image> 的 href（仍是 data URL 形态，内层不会被展开）。
 * 实测：递归消毒只**重写载荷**，不把内层 SVG 内联进外层。
 */
function innerHrefOf(result: ParseResult): string {
  return /xlink:href="([^"]*)"/u.exec(importedSvgOf(result))?.[1] ?? "";
}

/** 把 href（data URL）解成内层 SVG 文本；非 data URL 或解码失败时返回 ""。 */
function innerSvgOfHref(href: string): string {
  const comma = href.indexOf(",");
  if (!href.startsWith("data:image/svg+xml") || comma < 0) return "";
  const meta = href.slice(0, comma).toLowerCase();
  const payload = href.slice(comma + 1);
  try {
    return meta.includes("base64") ? atob(payload) : decodeURIComponent(payload);
  } catch {
    return "";
  }
}

const warningsOf = (result: ParseResult) => result.warnings.join("\n");

const unsafeInner = `<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script><circle cx="5" cy="5" r="4" onclick="alert(2)"/></svg>`;
const safeInner = `<svg xmlns="http://www.w3.org/2000/svg"><circle cx="5" cy="5" r="4"/></svg>`;
const utf8Href = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
const base64Href = (svg: string) => `data:image/svg+xml;base64,${Buffer.from(svg, "utf-8").toString("base64")}`;
const bareHref = (svg: string) => `data:image/svg+xml,${encodeURIComponent(svg)}`;

describe("内层 SVG 图片 —— 三种编码形态都能解码并消毒", () => {
  test("★ base64 形态：内层 script 与 on* 属性被剥掉，图形保留", async () => {
    const result = await parse(importWithInnerHref(base64Href(unsafeInner)));
    const inner = innerSvgOfHref(innerHrefOf(result));
    expect(inner).toContain("<circle");
    expect(inner).not.toContain("<script");
    expect(inner).not.toContain("onclick");
  });

  test("utf8 + charset 形态与 base64 形态得到同一份结果", async () => {
    const [base64Result, utf8Result] = await Promise.all([
      parse(importWithInnerHref(base64Href(unsafeInner))),
      parse(importWithInnerHref(utf8Href(unsafeInner)))
    ]);
    expect(innerSvgOfHref(innerHrefOf(utf8Result))).toBe(innerSvgOfHref(innerHrefOf(base64Result)));
  });

  test("裸形态（无 charset、无 base64）同样能解并消毒", async () => {
    const inner = innerSvgOfHref(innerHrefOf(await parse(importWithInnerHref(bareHref(unsafeInner)))));
    expect(inner).toContain("<circle");
    expect(inner).not.toContain("<script");
  });

  test("★ 输出统一重编码成 charset=utf-8 形态（base64 不再保留）", async () => {
    const result = await parse(importWithInnerHref(base64Href(safeInner)));
    // 外层 backgroundImage 与内层 href 都用这一形态
    expect(backgroundImageOf(result)).toMatch(/^data:image\/svg\+xml;charset=utf-8,/u);
    expect(innerHrefOf(result)).toMatch(/^data:image\/svg\+xml;charset=utf-8,/u);
  });

  test("内层是干净 SVG 时不做多余剥离（图形原样留下、href 不被摘）", async () => {
    const result = await parse(importWithInnerHref(utf8Href(safeInner)));
    expect(innerSvgOfHref(innerHrefOf(result))).toContain("<circle");
    expect(warningsOf(result)).not.toContain("已移除");
  });
});

describe("内层 SVG 图片 —— 三条非数据分支", () => {
  test("★ base64 载荷坏掉 → href 原样保留，不静默丢图也不报错", async () => {
    // 「###」不是合法 base64，atob 抛错 ⇒ decodeSvgDataUrl 返回 null ⇒ sanitizeSvgDataUrl
    // 直接返回原值。于是坏引用**留在文档里**（不是被移除），也不产生移除类告警。
    const result = await parse(importWithInnerHref("data:image/svg+xml;base64,###"));
    expect(innerHrefOf(result)).toBe("data:image/svg+xml;base64,###");
    expect(warningsOf(result)).not.toContain("已移除该图片引用");
  });

  test("非 SVG data URL（png）不参与这条链路，href 原样留下", async () => {
    const result = await parse(importWithInnerHref("data:image/png;base64,iVBORw0KGgo="));
    expect(innerHrefOf(result)).toBe("data:image/png;base64,iVBORw0KGgo=");
  });

  test("★ 内层 XML 解析失败 → 移除该 href 并给出「无法安全解析」告警", async () => {
    // 载荷本身是合法 data URL，但内层不是合法 SVG ⇒ parse 抛 ⇒ href 被摘掉。
    const result = await parse(importWithInnerHref(utf8Href("<svg><g></svg>")));
    expect(warningsOf(result)).toContain("无法安全解析");
    const imported = importedSvgOf(result);
    expect(imported).toContain("<image");
    expect(innerHrefOf(result)).toBe("");
  });

  test("★ 嵌套超过 3 层 → 移除该 href 并给出「层级过深」告警", async () => {
    // decode 后每层再递归 sanitizeDocument，depth 到 3 即止。
    let inner = `<circle cx="1" cy="1" r="1"/>`;
    for (let level = 0; level < 4; level += 1) {
      inner = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><image xlink:href="${utf8Href(inner)}" width="8" height="8"/></svg>`;
    }
    const result = await parse(importWithInnerHref(utf8Href(inner)));
    expect(warningsOf(result)).toContain("层级过深");
  });
});

/** charset 之后跟 base64：正则在 charset 段**之后**才吃 encoding 段（顺序不可换）。 */
const charsetThenBase64Href = (svg: string) =>
  `data:image/svg+xml;charset=utf-8;base64,${Buffer.from(svg, "utf-8").toString("base64")}`;

/** 显式 ;utf8 段（段名不是 base64）：解码仍走 decodeURIComponent 裸分支。 */
const utf8SegmentHref = (svg: string) => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

describe("内层 SVG 图片 —— data URL 形态矩阵（解析层现状钉桩）", () => {
  test("★ 有 charset 段但无 encoding 段：走裸解码分支，与无 charset / 显式 utf8 段结果逐字相同", async () => {
    // 三个输入形态，输出必须完全一致：
    //   data:image/svg+xml,xxx                    无 charset
    //   data:image/svg+xml;charset=utf-8,xxx     有 charset 无 encoding
    //   data:image/svg+xml;utf8,xxx              有 encoding 段名 utf8
    // charset 段被接受但**不改变**解码路径，三者 payload 都走 decodeURIComponent。
    const [bare, charset, utf8] = await Promise.all([
      parse(importWithInnerHref(bareHref(unsafeInner))),
      parse(importWithInnerHref(utf8Href(unsafeInner))),
      parse(importWithInnerHref(utf8SegmentHref(unsafeInner)))
    ]);
    const bareInner = innerSvgOfHref(innerHrefOf(bare));
    expect(bareInner).toContain("<circle");
    expect([innerSvgOfHref(innerHrefOf(charset)), innerSvgOfHref(innerHrefOf(utf8))]).toEqual([bareInner, bareInner]);
    // 输入形态不被保留：三个输出统一重编码成规范小写 charset 形态
    expect(innerHrefOf(charset)).toMatch(/^data:image\/svg\+xml;charset=utf-8,/u);
    expect(innerHrefOf(utf8)).toMatch(/^data:image\/svg\+xml;charset=utf-8,/u);
  });

  test("charset 的值不参与解码：声明 gbk 的载荷仍按 UTF-8 百分号解出原字符", async () => {
    // 正则的 charset 段只做形态匹配（[^;,]+），解出来的字符一律是 UTF-8。
    const svg = `<svg xmlns="http://www.w3.org/2000/svg"><text>あ</text></svg>`;
    const result = await parse(importWithInnerHref(`data:image/svg+xml;charset=gbk,${encodeURIComponent(svg)}`));
    expect(innerSvgOfHref(innerHrefOf(result))).toContain("あ");
  });

  test("★ base64 段放在 charset 之后：先吃 charset 段再吃 base64 段，仍按 base64 解码并消毒", async () => {
    const result = await parse(importWithInnerHref(charsetThenBase64Href(unsafeInner)));
    const inner = innerSvgOfHref(innerHrefOf(result));
    expect(inner).toContain("<circle");
    expect(inner).not.toContain("<script");
    expect(inner).not.toContain("onclick");
    // 载荷确实是 base64：若误走裸解码分支，base64 串不是合法 XML ⇒ href 会被摘空
    expect(innerHrefOf(result)).toMatch(/^data:image\/svg\+xml;charset=utf-8,/u);
    expect(warningsOf(result)).not.toContain("无法安全解析");
  });

  test("★ 空载荷：三种空 data URL 都解出空串而非 null，随后内层 XML 解析失败 → 摘 href 并告警", async () => {
    // data:image/svg+xml, ／ data:image/svg+xml;base64, ／ data:image/svg+xml;charset=utf-8,
    // payload 都是空串：atob("") / decodeURIComponent("") 都成功 ⇒ decode 返回 "" 而非 null
    // ⇒ 继续往下走 ⇒ 根节点不是 svg ⇒ 失败点在 XML 解析，不是解码。
    for (const href of ["data:image/svg+xml,", "data:image/svg+xml;base64,", "data:image/svg+xml;charset=utf-8,"]) {
      const result = await parse(importWithInnerHref(href));
      expect(innerHrefOf(result)).toBe("");
      expect(importedSvgOf(result)).toContain("<image");
      expect(warningsOf(result)).toContain("无法安全解析");
      expect(warningsOf(result)).not.toContain("层级过深");
    }
  });

  test("bare data:, 不是 svg MIME：压根不进 data URL 分支，被 safeUrl 判不安全直接摘掉", async () => {
    // 正则只认 data:image/svg+xml ⇒ decodeSvgDataUrl 返回 null；但 safeUrl 对
    // 带 scheme 且非 data:image/ 的值一律判不安全 ⇒ href 在更上一层就被摘掉。
    // 失败点因此是「清理」类告警，而不是 data URL 分支的「无法安全解析」。
    const result = await parse(importWithInnerHref("data:,"));
    expect(innerHrefOf(result)).toBe("");
    expect(importedSvgOf(result)).toContain("<image");
    expect(warningsOf(result)).toContain("已清理");
    expect(warningsOf(result)).not.toContain("无法安全解析");
    expect(warningsOf(result)).not.toContain("已移除该图片引用");
  });

  test("MIME 大小写不同仍被识别：匹配大小写不敏感，输出统一重编码为小写规范形态", async () => {
    for (const href of [
      `DATA:IMAGE/SVG+XML;CHARSET=UTF-8,${encodeURIComponent(unsafeInner)}`,
      `data:IMAGE/SVG+XML;charset=utf-8,${encodeURIComponent(unsafeInner)}`
    ]) {
      const result = await parse(importWithInnerHref(href));
      const inner = innerSvgOfHref(innerHrefOf(result));
      expect(inner).toContain("<circle");
      expect(inner).not.toContain("<script");
      expect(inner).not.toContain("onclick");
      // 输入的大小写不被保留（svgDataUrl 恒产出小写形态）
      expect(innerHrefOf(result)).toMatch(/^data:image\/svg\+xml;charset=utf-8,/u);
    }
  });

  test("非 data URI 的普通 https URL：不进这条链路，href 原样保留且不产生告警", async () => {
    const href = "https://example.com/a.svg";
    const result = await parse(importWithInnerHref(href));
    expect(innerHrefOf(result)).toBe(href);
    expect(warningsOf(result)).not.toContain("无法安全解析");
    expect(warningsOf(result)).not.toContain("已移除该图片引用");
  });

  test("非法载荷两种坏法都被解码层的 try 包住：href 原样保留，不报移除告警", async () => {
    // base64 坏（atob 抛 InvalidCharacterError）与百分号坏（decodeURIComponent 抛 URIError）
    // 两条都在解码层的 try 里 ⇒ 返回 null ⇒ 原样保留。
    // 若去掉那个 try，失败点会后移到内层 XML 解析，出现「无法安全解析」告警 ⇒ 本条会红。
    for (const href of [
      "data:image/svg+xml;base64,###",
      "data:image/svg+xml;charset=utf-8;base64,###",
      "data:image/svg+xml,%zz"
    ]) {
      const result = await parse(importWithInnerHref(href));
      expect(innerHrefOf(result)).toBe(href);
      expect(warningsOf(result)).not.toContain("无法安全解析");
      expect(warningsOf(result)).not.toContain("已移除该图片引用");
    }
  });
});

// ---------------------------------------------------------------------------
// svgDataUrl 前缀收敛（单源契约）
//
// 收敛前 src/sharedIconImport.ts 与 src/sharedIconLibrary.ts 各有一份 svgDataUrl，
// 前缀分别是 `;charset=utf-8,` 与 `;utf8,` —— 同一份 SVG 经两条路径得到两种形态。
// 现在 sharedIconLibrary 复用本文件导出的 svgDataUrl，前缀恒为 `;charset=utf-8,`。
//
// 为什么前缀钉桩放在本文件：src/sharedIconLibrary.ts 的 svgDataUrl 曾经是模块私有、
// 无导出，无法从外部喂进任意字符串，只能靠「内置资产实测 URL」间接观察。
// 收敛后本文件导出 svgDataUrl，于是前缀与载荷都能直接断言 —— 前缀不再是间接推论。
// ---------------------------------------------------------------------------

describe("svgDataUrl 前缀单源", () => {
  test("★ 前缀恒为 ;charset=utf-8,，不再产出裸 ;utf8, 形态", () => {
    // 断言整个串而不只是 startsWith：前缀若退回 `;utf8,`，
    // 长度与内容都会变，两种写法都在下面这条里被咬住。
    expect(svgDataUrl("<svg/>")).toBe("data:image/svg+xml;charset=utf-8,%3Csvg%2F%3E");
    expect(svgDataUrl("<svg/>")).toMatch(/^data:image\/svg\+xml;charset=utf-8,/u);
    // 反向钉桩：收敛前的第二种形态必须不再出现
    expect(svgDataUrl("<svg/>")).not.toContain(";utf8,");
    expect(svgDataUrl("")).toBe("data:image/svg+xml;charset=utf-8,");
  });

  test("★ 空串不特殊处理：仍产出合法 data URL（无内容但形态正确）", () => {
    // 与 stateIconDrawing 的 svgSourceToDataUrl 相反（那边空串返回 ""），
    // 这边调用点都传已序列化的文档，不存在空输入。钉住差异，避免后人「顺手对齐」时
    // 把 sharedIconLibrary 的图标 URL 变成空串 —— 那会让 212 个内置资产全是空图。
    const url = svgDataUrl("");
    expect(url).toBe("data:image/svg+xml;charset=utf-8,");
    expect(url.startsWith("data:image/svg+xml;charset=utf-8,")).toBe(true);
  });

  test("★ 前缀与载荷无关：任何输入都只换载荷、不换前缀", () => {
    // 载荷维度：ASCII / 中文 / emoji / 尖括号 / 空串。
    // 前缀是模板串的常量部分，只有它被改成别的形态时下面这条才会红。
    for (const payload of ["", "<svg/>", "厂站模型", "🚀⛽", '"><script>', "a b/c#d"]) {
      expect(svgDataUrl(payload).slice(0, "data:image/svg+xml;charset=utf-8,".length)).toBe("data:image/svg+xml;charset=utf-8,");
    }
  });

  test("★ 中文与 emoji 经 data URL 往返后逐字不变", async () => {
    // encodeURIComponent 对中文按 UTF-8 百分号编码，对 emoji 按代理对编码；
    // decodeURIComponent 必须原样还原，否则浏览器渲染出的图标标题会变成乱码。
    // 这条同时钉住前缀 —— 往返链路的起点必须是本文件导出的这一个函数。
    const tricky = "厂站/线路 · 🚀⛽ · <b>&amp;</b> · \"引号\"";
    const url = svgDataUrl(`<svg xmlns="http://www.w3.org/2000/svg"><title>${tricky}</title></svg>`);
    const comma = url.indexOf(",");
    expect(url.slice(0, comma)).toBe("data:image/svg+xml;charset=utf-8");
    expect(decodeURIComponent(url.slice(comma + 1))).toBe(`<svg xmlns="http://www.w3.org/2000/svg"><title>${tricky}</title></svg>`);
    // 载荷里不得残留裸尖括号/双引号（否则会截断外层 SVG 的属性）
    expect(url.slice(comma + 1)).not.toMatch(/[<>"#]/u);
  });

  test("★ 往返链路整体：带中文与 emoji 的内层 SVG 经导入链路后内容不变", async () => {
    // 走完整链路而不只是直接调 svgDataUrl：前缀单源后，导入产出的内层 href
    // 与 svgDataUrl 的输出必须是同一种形态，且中文/emoji 经过
    // 「解码 → DOM 解析 → 消毒 → 重新序列化 → 重新编码」五步后仍逐字相同。
    const tricky = "厂站模型 🚀⛽";
    const inner = `<svg xmlns="http://www.w3.org/2000/svg"><title>${tricky}</title><circle cx="5" cy="5" r="4"/></svg>`;
    const result = await parse(importWithInnerHref(utf8Href(inner)));
    const href = innerHrefOf(result);
    // 前缀与 svgDataUrl 的产出逐字一致（不是「也以 data:image/svg+xml 开头」这种弱断言）
    expect(href.slice(0, href.indexOf(","))).toBe("data:image/svg+xml;charset=utf-8");
    const roundTripped = innerSvgOfHref(href);
    expect(roundTripped).toContain(`<title>${tricky}</title>`);
    expect(roundTripped).toContain("<circle");
  });
});