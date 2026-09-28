// stripUnsafeInlineSvgMarkup 的净化守卫 —— 此前零直接覆盖。
//
// 用途链（已核实）：用户导入的 SVG → inlineSvgRootMarkup 调本函数净化 → 内联进画布
// 渲染。净化失效 = **存储型 XSS**：导入一张恶意 SVG 图，脚本在画布里执行。
//
// **实测绕过（已修）**：`<script>alert(1)`（未闭合但有内容）净化后原样漏出。
// 根因是 `[\s\S]*?<\/script\s*>|$` —— `$` 分支只在 `>` 之后一个字符都没有时成立，
// 于是未闭合且有内容的整条匹配失败。而浏览器会把**未终止**的 script 标签照常
// 解析成 script 元素并执行。28 个已知 XSS 向量里它是唯一漏的一个。
//
// 本文件把这 28 个向量全部钉住，其中「未闭合 script」是回归本体。
import { describe, expect, test } from "vitest";
import { stripUnsafeInlineSvgMarkup } from "./svgUtils";

/** 净化后仍视为危险的残留特征 */
const DANGEROUS = /<\s*script|<\s*style|\son[a-z]+\s*=|javascript\s*:|vbscript\s*:|livescript\s*:|mocha\s*:|data\s*:\s*text\/html/iu;

const VECTORS: Array<[string, string]> = [
  // —— 回归本体：未闭合 script ——
  ["未闭合 script（有内容）", "<script>alert(1)"],
  ["未闭合 script（纯标签）", "<script>"],
  ["未闭合 script（多行内容）", "<script>\nalert(1)\n</script"],
  ["未闭合 script 后面还有别的标签", "<script>alert(1)<rect/>"],
  ["未闭合 script 在标签中间", "<g><script>alert(1)</g>"],
  ["未闭合 script 后跟普通文本", "<script>alert(1)tail"],
  // —— 闭合形式 ——
  ["script 标签", "<script>alert(1)</script>"],
  ["script 自闭合", `<script src="//evil"/>`],
  ["script 大写", "<SCRIPT>alert(1)</SCRIPT>"],
  ["script 混合大小写", "<ScRiPt>alert(1)</sCrIpT>"],
  ["两个 script", "<script>a</script><script>b</script>"],
  ["闭合 script 后有内容", "<script>x</script>tail"],
  // —— style ——
  ["style 标签", "<style>body{}</style>"],
  // —— 事件属性 ——
  ["事件属性带双引号", `<a href="#" onclick="alert(1)">x</a>`],
  ["事件属性带单引号", `<a href="#" onmouseover='alert(1)'>x</a>`],
  ["事件属性无引号", `<a href="#" onfocus=alert(1)>x</a>`],
  ["事件属性大写", `<a ONCLICK="alert(1)">x</a>`],
  ["事件属性混合大小写", `<a OnClIcK="alert(1)">x</a>`],
  ["事件属性带空格等号", `<a onclick = "alert(1)">x</a>`],
  ["img onerror 无引号", `<img src=x onerror=alert(1)>`],
  // —— 危险协议 href ——
  ["javascript: href", `<a href="javascript:alert(1)">x</a>`],
  ["javascript: 大小写", `<a href="JaVaScRiPt:alert(1)">x</a>`],
  ["javascript: 前置空白", `<a href="   javascript:alert(1)">x</a>`],
  ["javascript: 实体编码冒号", `<a href="javascript&#58;alert(1)">x</a>`],
  ["javascript: 十进制实体", `<a href="&#106;avascript:alert(1)">x</a>`],
  ["javascript: 十六进制实体", `<a href="&#x6A;avascript:alert(1)">x</a>`],
  ["javascript: 制表符", `<a href="java\tscript:alert(1)">x</a>`],
  ["javascript: 换行", `<a href="java\nscript:alert(1)">x</a>`],
  ["vbscript:", `<a href="vbscript:msgbox(1)">x</a>`],
  ["data:text/html", `<a href="data:text/html;base64,PHNjcmlwdD4=">x</a>`],
  ["xlink:href javascript", `<svg><a xlink:href="javascript:alert(1)">x</a></svg>`],
  // —— 双重编码 / 结构性 ——
  ["双重编码", `<a href="&amp;#106;avascript:alert(1)">x</a>`],
  ["嵌套 script 断裂", `<scr<script>ipt>alert(1)</script>`],
  ["属性注入（引号逃逸）", `<a href="x" title="a&quot; onclick=&quot;alert(1)">x</a>`]
];

describe("stripUnsafeInlineSvgMarkup（SVG 内联净化）", () => {
  for (const [label, input] of VECTORS) {
    test(`${label} 被中和`, () => {
      const out = stripUnsafeInlineSvgMarkup(input);
      expect(
        DANGEROUS.test(out),
        `净化后仍含危险成分：\n  输入: ${JSON.stringify(input)}\n  输出: ${JSON.stringify(out)}`
      ).toBe(false);
    });
  }

  test("回归本体：未闭合且有内容的 script 必须整段消失（曾原样漏出并被执行）", () => {
    // 浏览器把未终止的 script 标签照常解析成 script 元素执行，所以「原样返回」等于没净化
    expect(stripUnsafeInlineSvgMarkup("<script>alert(1)")).not.toContain("script");
    expect(stripUnsafeInlineSvgMarkup("<script>alert(1)")).not.toContain("alert(1)");
    expect(stripUnsafeInlineSvgMarkup("<script>alert(1)")).toBe("");
  });

  test("无害内容原样保留（回归：别把正常图形也洗掉）", () => {
    const safe = `<rect x="1" y="2" width="3" height="4" fill="#abc"/>`;
    expect(stripUnsafeInlineSvgMarkup(safe)).toBe(safe);
  });

  test("危险的属性值被移除但标签骨架保留（不至于整段吞掉）", () => {
    expect(stripUnsafeInlineSvgMarkup(`<a href="javascript:alert(1)">x</a>`)).toBe("<a>x</a>");
    expect(stripUnsafeInlineSvgMarkup(`<a onclick="alert(1)">x</a>`)).toBe("<a>x</a>");
  });

  test("幂等：净化两次结果相同（不因重复处理而变形）", () => {
    for (const [, input] of VECTORS) {
      const once = stripUnsafeInlineSvgMarkup(input);
      expect(stripUnsafeInlineSvgMarkup(once), JSON.stringify(input)).toBe(once);
    }
  });
});
