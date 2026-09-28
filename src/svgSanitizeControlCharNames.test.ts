// `stripUnsafeInlineSvgMarkup` 对「控制字符插在属性名/标签名里」与「多重实体编码」
// 的**当前行为记录** —— 这些是探针实测出的残留项，可利用性**尚未判定**。
//
// ## 为什么单独记一个文件而不是并入 svgSanitizeSmil.test.ts
//
// 这批向量与 SMIL 那一批性质不同：SMIL 是「动画间接改写 href」，而这批是
// **直接的事件处理属性**（`onload="alert(1)"`）与 **script 元素**本身 ——
// 一旦可利用，后果比 SMIL 严重得多。但恰恰因为严重，不能凭推测下结论：
//
// **本项目无法实测判定**。原因是环境缺能力，不是没查：
//   - vitest environment 是 "node"（无 DOM）
//   - parse5 / jsdom / happy-dom / linkedom / cheerio 均**未安装**
//   - Node 内置 `node:html` 不可用
// 而 `inlineSvgRootMarkup` 的输出最终交给**浏览器的 HTML 解析器**（React 的
// dangerouslySetInnerHTML / innerHTML），其对「属性名/标签名里含控制字符」的处理
// 只能在真实浏览器里验证。
//
// ## 当前可确定的输入可达性
//
// 净化器输入**可以是任意字符串、未经 XML 解析**：`appControlFactories.tsx` 的
// `backgroundImage: iconImage` 来自 WS 控制工厂（其模块注释明写「经 WS 指令调用，
// 绕过 UI 对话框」），故外部可注入未经 xmldom 校验的 SVG 文本。
// 即「能否到达净化器」已确证；「到达后是否被浏览器执行」未判定。
//
// ## 本文件的用途
//
// 1. 钉住**当前行为**（净化器不动这些属性名/标签名）—— 日后若有人「顺手加强」
//    或误改，测试会立刻暴露行为漂移。
// 2. 把**待判定状态与判定条件**写清楚，接手者不必重调研。
// 3. 已判定为**不可利用**的那些（双重实体编码）给出理由，从待判定清单里排除。
import { describe, expect, test } from "vitest";
import { stripUnsafeInlineSvgMarkup } from "./svgUtils";

describe("已判定：多重实体编码的 href 不可利用（浏览器只解一次实体）", () => {
  // `&amp;#106;avascript:` → 浏览器解一次实体得 `&#106;avascript:`，**不会**再解第二次，
  // 故最终不是有效的 javascript: URL。同理三重编码。净化器不解码 `&amp;`（它只解
  // 数字实体 `&#106;` / `&#x6a;`），所以这里残留是**正确**的。
  test("双重实体编码的 href 原样保留（不可利用，故不改）", () => {
    const cleaned = stripUnsafeInlineSvgMarkup(
      `<svg xmlns="http://www.w3.org/2000/svg"><a href="&amp;#106;avascript:alert(1)">x</a></svg>`
    );
    expect(cleaned).toContain("&amp;#106;avascript:");
  });

  test("三重实体编码同理", () => {
    const cleaned = stripUnsafeInlineSvgMarkup(
      `<svg xmlns="http://www.w3.org/2000/svg"><a href="&amp;amp;#106;avascript:alert(1)">x</a></svg>`
    );
    expect(cleaned).toContain("&amp;amp;#106;avascript:");
  });
});

describe("已判定：事件属性名的大小写变体已被覆盖", () => {
  test("ONLOAD / OnLoad 都被清除（`i` 标志生效）", () => {
    for (const attr of ["ONLOAD", "OnLoad", "oNlOaD"]) {
      const cleaned = stripUnsafeInlineSvgMarkup(
        `<svg xmlns="http://www.w3.org/2000/svg"><rect width="5" height="5" ${attr}="alert(1)"/></svg>`
      );
      expect(cleaned, attr).not.toContain("alert(1)");
    }
  });

  test("无引号的 on* 事件属性也被清除（含带分号的畸形值）", () => {
    for (const frag of [`<rect onload=alert(1) width="5"/>`, `<rect onload=alert(1);x=1 width="5"/>`]) {
      const cleaned = stripUnsafeInlineSvgMarkup(`<svg xmlns="http://www.w3.org/2000/svg">${frag}</svg>`);
      expect(cleaned, frag).not.toContain("alert(1)");
    }
  });
});

describe("待判定：控制字符插在属性名 / 标签名里（当前不被处理）", () => {
  // 以下每条探针实测均为「净化器输出仍含该属性名 / 标签名」。
  // 可利用性取决于浏览器 HTML 解析器对「属性名/标签名含控制字符」的处理，
  // 本项目无 DOM 环境可实测（详见文件头）。
  const vectors: [string, string, string][] = [
    ["NUL 插在事件属性名", "on\u0000load", `<rect on\u0000load="alert(1)" width="5" height="5"/>`],
    ["换行插在事件属性名", "on\nload", `<rect on\nload="alert(1)" width="5" height="5"/>`],
    ["tab 插在事件属性名", "on\tload", `<rect on\tload="alert(1)" width="5" height="5"/>`],
    ["NUL 插在 href 属性名", "hr\u0000ef", `<a hr\u0000ef="javascript:alert(1)">x</a>`],
    ["NUL 插在 script 标签名", "scr\u0000ipt", `<scr\u0000ipt>alert(1)</scr\u0000ipt>`]
  ];

  for (const [label, nameFragment, frag] of vectors) {
    test(`${label}：净化器当前不处理（钉住行为，可利用性待判定）`, () => {
      const cleaned = stripUnsafeInlineSvgMarkup(`<svg xmlns="http://www.w3.org/2000/svg">${frag}</svg>`);
      // 当前行为：属性名/标签名里的控制字符使 `\s+on[a-z]+` / `<script` 匹配失败，故原样保留
      expect(cleaned, `${label}：若此断言转红，说明净化器行为已变，请同步更新本文件的判定说明`).toContain(nameFragment);
    });
  }

  test("NUL 插在 **href 值**里：当前归一不覆盖 C0（与 SMIL 值属性那条不同）", () => {
    // 对比：SMIL 的 values/to/from/by 规则已把归一扩到 [\u0000-\u001f\u007f\s\u00A0]，
    // 而 href/xlink:href 规则仍只去 [\s\u00A0]（它有 36 条既有向量守卫依赖当前语义）。
    // 两者不一致是**已知**的，此处钉住以便日后统一时不会漏掉。
    const cleaned = stripUnsafeInlineSvgMarkup(
      `<svg xmlns="http://www.w3.org/2000/svg"><a href="java\u0000script:alert(1)">x</a></svg>`
    );
    expect(cleaned).toContain("java\u0000script:");
  });

  test("**判定所需条件已具备的部分**：净化器输入可未经 XML 解析直接到达", () => {
    // appControlFactories.tsx 的 `backgroundImage: iconImage` 来自 WS 控制工厂
    // （模块注释明写「经 WS 指令调用，绕过 UI 对话框」），故外部可注入未经
    // xmldom 校验的 SVG 文本 —— 「能否到达净化器」这一环已确证。
    // 剩下未判定的一环：到达后浏览器 HTML 解析器是否会把这些属性名还原成可执行事件。
    // 本用例只作说明性记录（无断言可下），存在的意义是让接手者知道输入面已确证。
    expect(typeof stripUnsafeInlineSvgMarkup).toBe("function");
  });
});
