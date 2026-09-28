// 内联 SVG 的 **id 作用域隔离**守卫（collectInlineSvgIds / inlineSvgScopedIdPrefix /
// scopeInlineSvgIdReferences 三个私有函数的唯一直接覆盖，经 inlineSvgRootMarkup 间接调用）。
//
// ## 为什么这件事必须钉住
//
// 多个内联 SVG 并置在同一张画布上时，若两个 SVG 都有 `id="grad"`，浏览器会把它们
// 解析成**同一个**元素 —— 于是 A 图的渐变会被 B 图的同名定义抢走，表现为
// **串色 / 渐变错乱**。这类 bug 静默、无报错、且只在特定图元组合下出现，
// 极难从代码上看出问题，故必须用测试固定住「定义与引用两侧都被改写、且改得一致」。
//
// 三个私有函数的分工（读代码即可，改动时注意连带影响）：
//   collectInlineSvgIds            —— 收集 markup 里出现的 id
//   inlineSvgScopedIdPrefix        —— 按 href + 几何 + clipPath 算出隔离前缀
//   scopeInlineSvgIdReferences     —— 给 id 定义与 url()/# 引用**两侧**加前缀
import { describe, expect, test } from "vitest";
import { inlineSvgRootMarkup } from "./svgUtils";

const base = { x: 0, y: 0, width: 100, height: 60, className: "node-background-image" };
const inline = (svg: string, over: { clipPath?: string } = {}) =>
  inlineSvgRootMarkup(`data:image/svg+xml,${encodeURIComponent(svg)}`, { ...base, ...over });

/** 抽出输出里的 id 定义与 url() 引用，用于断言「两侧一致」 */
const idsOf = (out: string) => Array.from(out.matchAll(/\bid\s*=\s*(["'])([^"']*)\1/g)).map((m) => m[2]);
// 引用侧要能容纳 id 里的 `)`（如 `url(#a(b))`），故不能用 `[^'")\s]*` 截断
const urlRefsOf = (out: string) =>
  Array.from(out.matchAll(/url\(\s*(['"]?)#(.+?)\1\s*\)/g)).map((m) => m[2]);
const hrefRefsOf = (out: string) =>
  Array.from(out.matchAll(/\s(?:xlink:)?href\s*=\s*(["'])#([^"']*)\1/g)).map((m) => m[2]);

describe("id 与引用两侧都被改写且一致（串色的核心防线）", () => {
  const quotes: [string, string][] = [
    ["双引号", `<linearGradient id="q1"/><rect fill="url(#q1)"/>`],
    ["单引号", `<linearGradient id='q1'/><rect fill='url(#q1)'/>`],
    ["id 单引号 + 引用双引号", `<linearGradient id='q1'/><rect fill="url(#q1)"/>`],
    ["id 双引号 + 引用单引号", `<linearGradient id="q1"/><rect fill='url(#q1)'/>`]
  ];

  for (const [label, body] of quotes) {
    test(`${label}：定义与引用带同一前缀`, () => {
      const out = inline(`<svg xmlns="http://www.w3.org/2000/svg">${body}</svg>`);
      const ids = idsOf(out);
      const refs = urlRefsOf(out);
      expect(ids, label).toHaveLength(1);
      expect(refs, label).toHaveLength(1);
      expect(refs[0], label).toBe(ids[0]);
      // 前缀形态：inline-svg-<hash>-q1
      expect(ids[0], label).toMatch(/^inline-svg-[a-z0-9]+-q1$/);
    });
  }

  test("**保留原引号风格**（单引号不被改成双引号）", () => {
    const out = inline(`<svg xmlns="http://www.w3.org/2000/svg"><linearGradient id='k1'/><rect fill='url(#k1)'/></svg>`);
    expect(out).toMatch(/id='inline-svg-[a-z0-9]+-k1'/);
    expect(out).toMatch(/fill='url\(#inline-svg-[a-z0-9]+-k1\)'/);
  });

  test("多个 id 各自独立加前缀，互不串", () => {
    const out = inline(
      `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">` +
        `<defs><linearGradient id="gA"/><clipPath id="cB"/><path id="pC" d="M0 0"/></defs>` +
        `<rect fill="url(#gA)" clip-path="url(#cB)"/><use href="#pC"/>` +
        `</svg>`
    );
    const ids = idsOf(out);
    expect(ids).toHaveLength(3);
    for (const id of ids) expect(id).toMatch(/^inline-svg-[a-z0-9]+-/);
    // 三种引用形态（url + href + xlink:href）都指向已改名的定义
    const refs = [...urlRefsOf(out), ...hrefRefsOf(out)];
    expect(refs).toHaveLength(3);
    for (const ref of refs) expect(ids, `引用 ${ref} 未匹配任何定义`).toContain(ref);
    // 三个前缀互不相同
    expect(new Set(ids).size).toBe(3);
  });
});

describe("长 id 优先（防短 id 抢匹配）", () => {
  test("`a` 与 `ab` 共存时 `url(#ab)` 匹配到 `ab` 而非 `a`", () => {
    // idAlternation 按长度降序排列（scopeInlineSvgIdReferences 里显式 sort），
    // 若不排序，`#ab` 会先被 `#a` 命中并改写出悬空引用。
    const out = inline(
      `<svg xmlns="http://www.w3.org/2000/svg"><linearGradient id="a"/><linearGradient id="ab"/><rect fill="url(#ab)"/></svg>`
    );
    const ids = idsOf(out);
    const refs = urlRefsOf(out);
    expect(refs[0]).toBe(ids[1]); // refs[0] 应等于 "ab" 那个（第二个）定义
    expect(ids[1]).toMatch(/-ab$/);
    expect(ids[0]).toMatch(/-a$/);
  });
});

describe("未定义的引用不动（不制造悬空引用）", () => {
  test("`url(#missing)` 原样保留", () => {
    const out = inline(`<svg xmlns="http://www.w3.org/2000/svg"><rect fill="url(#missing)"/></svg>`);
    expect(urlRefsOf(out)).toEqual(["missing"]);
    expect(idsOf(out)).toEqual([]);
  });

  test("`href=\"#nope\"` 原样保留", () => {
    const out = inline(
      `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">` +
        `<path id="p1" d="M0 0"/><use href="#nope"/></svg>`
    );
    expect(hrefRefsOf(out)).toContain("nope");
  });
});

describe("无 id 的 SVG 完全不加前缀", () => {
  test("输出与输入的引用形态不变", () => {
    const out = inline(`<svg xmlns="http://www.w3.org/2000/svg"><rect width="5" height="5"/></svg>`);
    expect(idsOf(out)).toEqual([]);
    expect(out).toContain("<rect");
    // 注意不能断言 `not.toContain("inline-svg-")` —— 输出**必然**含
    // `class="export-inline-svg-image ..."`，那不是 id 前缀。故只断言无 id 属性。
  });
});

describe("前缀的可复现性（重渲染不能换 id，否则渐变会断）", () => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg"><linearGradient id="w"/></svg>`;

  test("**有显式 clipPath 时，同一节点两次调用得到相同前缀**", () => {
    // clipPath 相同 ⇒ seed 相同 ⇒ 前缀相同。这保证节点重渲染后
    // 「定义 id」与「引用 id」仍然指向同一个元素（若每次都换，渐变引用就断了）。
    const opts = { ...base, clipPath: "url(#clip-node-42)" };
    const a = inlineSvgRootMarkup(`data:image/svg+xml,${encodeURIComponent(svg)}`, opts);
    const b = inlineSvgRootMarkup(`data:image/svg+xml,${encodeURIComponent(svg)}`, opts);
    expect(a).toBe(b);
  });

  test("**无 clipPath 时用自增计数器 ⇒ 跨调用前缀不同**（隔离不同节点）", () => {
    // 这是「隔离」的另一面：两个都叫 id="z" 的内联 SVG 必须拿到不同前缀，
    // 否则并置时会互相串色。
    const a = idsOf(inline(svg))[0];
    const b = idsOf(inline(svg))[0];
    expect(a).not.toBe(b);
    expect(a).toMatch(/^inline-svg-/);
    expect(b).toMatch(/^inline-svg-/);
  });

  test("不同 clipPath ⇒ 不同前缀（不同节点互不干扰）", () => {
    const a = idsOf(inline(svg, { clipPath: "url(#clip-node-1)" }))[0];
    const b = idsOf(inline(svg, { clipPath: "url(#clip-node-2)" }))[0];
    expect(a).not.toBe(b);
  });
});

describe("id 含正则元字符时正确转义（escapeRegExp 生效）", () => {
  test("`a.b` / `a+b` / `a|b` / `a$1` 这类 id 不会破坏 idAlternation 正则", () => {
    for (const raw of ["a.b", "a+b", "a|b", "a$1", "a[b]"]) {
      const out = inline(
        `<svg xmlns="http://www.w3.org/2000/svg"><linearGradient id="${raw}"/><rect fill="url(#${raw})"/></svg>`
      );
      const ids = idsOf(out);
      const refs = urlRefsOf(out);
      expect(ids, raw).toHaveLength(1);
      expect(refs, raw).toHaveLength(1);
      expect(refs[0], raw).toBe(ids[0]);
      expect(ids[0], raw).toMatch(new RegExp(`^inline-svg-[a-z0-9]+-${raw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`));
    }
  });

  test("id 含 `)` 时必须用**带引号**的 url 引用（否则 CSS 语法本身歧义）", () => {
    // `url(#a(b))` 在 CSS 语法里是**歧义**的 —— 解析器无法区分「id 里的 )」与
    // 「url 函数的收尾 )」。这不是实现缺陷，而是该形态本就该加引号。
    // 故本用例只验带引号形态（真实图标库里的正确写法）。
    const out = inline(
      `<svg xmlns="http://www.w3.org/2000/svg"><linearGradient id="a(b)"/><rect fill='url("#a(b)")'/></svg>`
    );
    const ids = idsOf(out);
    const refs = urlRefsOf(out);
    expect(ids).toHaveLength(1);
    expect(refs).toHaveLength(1);
    expect(refs[0]).toBe(ids[0]);
    expect(ids[0]).toMatch(/^inline-svg-[a-z0-9]+-a\(b\)$/);
  });
});
