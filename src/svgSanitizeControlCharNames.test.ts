// `stripUnsafeInlineSvgMarkup` 对「控制字符插在属性名/标签名里」与「多重实体编码」
// 的**当前行为记录** —— 探针实测这些向量在净化器输出里残留。
//
// ## 结论：全部**不可利用**（已在真实浏览器里实测，见下）
//
// 这批向量与 SMIL 那一批性质不同：SMIL 是「动画间接改写 href」，而这批是
// **直接的事件处理属性**（`onload="alert(1)"`）与 **script 元素**本身 ——
// 一旦可利用后果严重得多，所以**不能凭推测下结论**。
//
// 项目内无 DOM 环境（vitest environment 是 "node"；parse5 / jsdom / happy-dom /
// linkedom / cheerio 均未安装；Node 内置 `node:html` 不可用），故用**真实浏览器**
// 实测（`browser.evaluate` + `innerHTML` + `getAttribute`），结果如下：
//
// | 输入                                   | 浏览器解析后的实际形态                 | 可执行 |
// |----------------------------------------|----------------------------------------|--------|
// | `<rect on<NUL>load=...>`               | 属性名变成 `on<U+FFFD>load`             | 否     |
// | `<rect on\nload=...>` / `on\tload=...` | 被拆成**两个独立属性** `["on","load"]`  | 否     |
// | `<scr<NUL>ipt>alert(1)</scr<NUL>ipt>`  | 标签名 `SCR<U+FFFD>IPT`（非 script）    | 否     |
// | `<a href="java<NUL>script:...">`       | 值变成 `java<U+FFFD>script:`            | 否     |
// | `<a href="&amp;#106;avascript:...">`   | 值变成字面 `&#106;avascript:`           | 否     |
//
// 三条机理：
// ① 浏览器 HTML tokenizer 把 tag/attribute name 与 attribute value 里的 NUL 转成
//    **U+FFFD**（实测码点 65533）—— 既不还原成 `onload`，也拼不出 `javascript:`；
// ② 换行/tab 在属性名状态下被当作**属性名分隔符**，于是拆成两个属性而非一个；
// ③ 属性值里的实体**只解一次**：`&amp;#106;` → `&#106;` 即止，不会再解成 `j`
//    （实测 getAttribute("href") 返回码点 38/35/49/48/54/59…，即字面 `&#106;`）。
//
// **故不改实现**：净化器当前行为正确，加固只会引入无收益的复杂度。
// 本文件的作用是把上述实测结论与证据**固定在案**，免得后人重复调研，
// 或误以为「探针说残留 = 有漏洞」而做无依据的加固。
//
// ## 输入可达性（这一环也已确证）
//
// 净化器输入**可以是任意字符串、未经 XML 解析**：`appControlFactories.tsx` 的
// `backgroundImage: iconImage` 来自 WS 控制工厂（其模块注释明写「经 WS 指令调用，
// 绕过 UI 对话框」），故外部可注入未经 xmldom 校验的 SVG 文本。
// 也就是说「能否到达净化器」不是问题 —— 问题只在到达后是否被浏览器执行，
// 而这一点已由上面的实测回答为「否」。
import { describe, expect, test } from "vitest";
import { stripUnsafeInlineSvgMarkup } from "./svgUtils";

describe("已实测判定：多重实体编码的 href 不可利用（浏览器只解一次实体）", () => {
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

describe("已实测判定：事件属性名的大小写变体与畸形引号已被覆盖", () => {
  test("ONLOAD / OnLoad / oNlOaD 都被清除（`i` 标志生效）", () => {
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

describe("已实测判定：控制字符插在属性名 / 标签名里不可利用（故不改实现）", () => {
  // 下列每条探针实测均为「净化器输出仍含该属性名 / 标签名」，但**浏览器实测证明
  // 它们不会被还原成可执行形态**（见文件头表格与机理说明）。此处钉住当前行为。
  const NUL = "\u0000";
  const vectors: [string, string, string][] = [
    ["NUL 插在事件属性名 → 浏览器转成 on<U+FFFD>load", `on${NUL}load`, `<rect on${NUL}load="alert(1)" width="5" height="5"/>`],
    ["换行插在事件属性名 → 浏览器拆成 on/load 两个属性", "on\nload", `<rect on\nload="alert(1)" width="5" height="5"/>`],
    ["tab 插在事件属性名 → 浏览器拆成 on/load 两个属性", "on\tload", `<rect on\tload="alert(1)" width="5" height="5"/>`],
    ["NUL 插在 href 属性名 → 浏览器转成 hr<U+FFFD>ef", `hr${NUL}ef`, `<a hr${NUL}ef="javascript:alert(1)">x</a>`],
    ["NUL 插在 script 标签名 → 浏览器转成 SCR<U+FFFD>IPT", `scr${NUL}ipt`, `<scr${NUL}ipt>alert(1)</scr${NUL}ipt>`]
  ];

  for (const [label, nameFragment, frag] of vectors) {
    test(`${label}：净化器不处理（已实测不可利用）`, () => {
      const cleaned = stripUnsafeInlineSvgMarkup(`<svg xmlns="http://www.w3.org/2000/svg">${frag}</svg>`);
      // 若此断言转红，说明净化器行为已变 —— 请在真实浏览器里**重新实测可利用性**
      // （不要凭探针的「残留」就判定有漏洞；本文件头即为此写了证据与机理）。
      expect(cleaned, label).toContain(nameFragment);
    });
  }

  test("NUL 插在 **href 值**里：当前归一不覆盖 C0（与 SMIL 值属性那条不一致）", () => {
    // 对比：SMIL 的 values/to/from/by 规则已把归一扩到 C0+空白+NBSP，
    // 而 href/xlink:href 规则仍只去 [\s ]（它有 36 条既有向量守卫依赖当前语义）。
    // 两者不一致是**已知**的，此处钉住以便日后统一时不会漏掉。
    // 浏览器实测：`java<NUL>script:` 的属性值变成 `java<U+FFFD>script:`（码点 65533），
    // 拼不出有效 scheme，故不构成漏洞。
    const NUL = "\u0000";
    const cleaned = stripUnsafeInlineSvgMarkup(
      `<svg xmlns="http://www.w3.org/2000/svg"><a href="java${NUL}script:alert(1)">x</a></svg>`
    );
    expect(cleaned).toContain(`java${NUL}script:`);
  });
});
