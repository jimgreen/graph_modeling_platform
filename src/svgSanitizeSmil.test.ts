// stripUnsafeInlineSvgMarkup 的 **SMIL 动画改写 URL** 防线守卫。
//
// 背景（真实可利用的存储型 XSS，本轮修复）：
//   `<animate attributeName="href" values="javascript:alert(1)" dur="1s"/>`
// 能把 href **动画改写**成 javascript:。修复前该向量穿透**两道防线**：
//   ① 导入侧 sanitizeDocument —— DANGEROUS_ELEMENT_NAMES 不含 animate、
//      URL_ATTRIBUTE_NAMES 只含 href/xlink:href/src/action/formaction/poster（不含 values）
//   ② 渲染侧本文件的 href/xlink:href 规则 —— 它只查「属性本身就是 URL」的情况
// 而图元节点在画布上走 svgImageContentMarkup(..., { className }) → inlineSvgRootMarkup，
// 把 SVG **内联进 DOM**（appCanvasArea.tsx 的 node-background-image 渲染）——
// 内联 SVG 的 SMIL 动画是会运行的，故可利用。
//
// 本文件钉住修复后的行为，并确保**正常动画不受影响**（误伤面是这次改动的关键风险）。
import { describe, expect, test } from "vitest";
import { stripUnsafeInlineSvgMarkup, svgImageContentMarkup, decodeSvgImageSource } from "./svgUtils";

/** 走图元节点在画布上的实际渲染路径（传 className → 内联进 DOM） */
const renderAsInlineNode = (svg: string) =>
  decodeSvgImageSource(
    svgImageContentMarkup(`data:image/svg+xml,${encodeURIComponent(svg)}`, {
      x: 0,
      y: 0,
      width: 100,
      height: 60,
      className: "node-background-image"
    })
  );

const anchor = `<a href="#safe"><rect width="5" height="5"/></a>`;

describe("SMIL 改写 href → 危险 scheme 被清除（本次修复）", () => {
  const vectors: [string, string][] = [
    ["animate values=", `<animate attributeName="href" values="javascript:alert(1)" dur="1s"/>`],
    ["animate to=", `<animate attributeName="href" to="javascript:alert(1)" dur="1s"/>`],
    ["set to=", `<set attributeName="href" to="javascript:alert(1)"/>`],
    ["animate xlink:href", `<animate attributeName="xlink:href" values="javascript:alert(1)" dur="1s"/>`],
    ["begin=click 触发", `<animate attributeName="href" begin="click" values="javascript:alert(1)" dur="1s"/>`],
    ["大小写混写 scheme", `<animate attributeName="href" values="JaVaScRiPt:alert(1)" dur="1s"/>`],
    ["vbscript:", `<animate attributeName="href" values="vbscript:msgbox(1)" dur="1s"/>`],
    ["data:text/html", `<animate attributeName="href" values="data:text/html,x" dur="1s"/>`],
    ["实体编码冒号", `<animate attributeName="href" values="javascript&#58;alert(1)" dur="1s"/>`],
    ["from 属性", `<animate attributeName="href" from="#a" to="javascript:alert(1)" dur="1s"/>`],
    ["by 属性", `<animate attributeName="href" by="javascript:alert(1)" dur="1s"/>`]
  ];

  for (const [label, anim] of vectors) {
    test(`${label}：净化器与内联渲染路径都不放行 javascript:`, () => {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg">${anchor}${anim}</svg>`;
      // 直接调净化器
      const cleaned = stripUnsafeInlineSvgMarkup(svg);
      expect(cleaned, "净化器输出").not.toMatch(/(?:java|vb)script:/i);
      expect(cleaned, "净化器输出").not.toContain("alert(1)");
      expect(cleaned, "净化器输出").not.toContain("msgbox(1)");
      // 走完整渲染路径（内联进 DOM）
      const rendered = renderAsInlineNode(svg);
      expect(rendered, "内联渲染输出").not.toMatch(/(?:java|vb)script:/i);
      expect(rendered, "内联渲染输出").not.toContain("alert(1)");
    });
  }

  test("**动画元素本身保留**（只删危险属性，最小影响）", () => {
    const cleaned = stripUnsafeInlineSvgMarkup(
      `<svg xmlns="http://www.w3.org/2000/svg">${anchor}<animate attributeName="href" values="javascript:alert(1)" dur="1s"/></svg>`
    );
    // 元素与无害属性（attributeName/dur）留下，只少了 values
    expect(cleaned).toContain("<animate");
    expect(cleaned).toContain('attributeName="href"');
    expect(cleaned).toContain('dur="1s"');
    expect(cleaned).not.toContain("values=");
  });
});

describe("正常 SMIL 动画不受影响（误伤面守卫）", () => {
  const animates: [string, string][] = [
    ["数值插值 fill", `<animate attributeName="fill" values="red;blue;green" dur="2s" repeatCount="indefinite"/>`],
    ["单值 to", `<animate attributeName="opacity" to="0.5" dur="1s"/>`],
    ["transform 插值", `<animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="2s"/>`],
    ["颜色 from/to", `<animate attributeName="fill" from="#fff" to="#000" dur="1s"/>`],
    ["href 指向安全 http", `<animate attributeName="href" values="https://x.test/a.png" dur="1s"/>`],
    ["href 指向锚点", `<animate attributeName="href" values="#other" dur="1s"/>`],
    ["url(#id) 引用", `<animate attributeName="fill" values="url(#grad)" dur="1s"/>`],
    ["path d 动画", `<animate attributeName="d" values="M0 0 L10 10;M0 0 L20 20" dur="1s"/>`]
  ];

  for (const [label, anim] of animates) {
    test(`${label}：值属性原样保留`, () => {
      const cleaned = stripUnsafeInlineSvgMarkup(
        `<svg xmlns="http://www.w3.org/2000/svg">${anchor}${anim}</svg>`
      );
      expect(cleaned).toContain("<animate");
      // to / values / from 任一存在都应保留
      expect(cleaned).toMatch(/\s(?:to|values|from)\s*=/);
    });
  }

  test("数值插值的完整内容未被篡改", () => {
    const cleaned = stripUnsafeInlineSvgMarkup(
      `<svg xmlns="http://www.w3.org/2000/svg"><rect width="5" height="5"><animate attributeName="fill" values="red;blue;green" dur="2s"/></rect></svg>`
    );
    expect(cleaned).toContain('values="red;blue;green"');
  });
});

describe("与既有 href 防线的一致性（两组规则同构）", () => {
  test("直接 href=javascript: 仍被既有规则清除（未因本次改动回退）", () => {
    const cleaned = stripUnsafeInlineSvgMarkup(
      `<svg xmlns="http://www.w3.org/2000/svg"><a href="javascript:alert(1)"><rect width="5" height="5"/></a></svg>`
    );
    expect(cleaned).not.toContain("javascript:");
    expect(cleaned).not.toContain("alert(1)");
  });

  test("CSS url(javascript:) 仍**保留** —— 已知且有意接受的边界（如实记录）", () => {
    // svgUtils.ts 内注释明写：CSS 里的 url(javascript:) 现代浏览器已不执行，
    // 故这不是 XSS，但属同一处（CSS url() 判定）一并如实记录，避免后人误以为已覆盖。
    const cleaned = stripUnsafeInlineSvgMarkup(
      `<svg xmlns="http://www.w3.org/2000/svg"><rect width="5" height="5" style="fill:url(javascript:alert(1))"/></svg>`
    );
    expect(cleaned).toContain("url(javascript:");
  });

  test("script / style / on* 等既有防线不受影响", () => {
    const cleaned = stripUnsafeInlineSvgMarkup(
      `<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script><style>*{fill:red}</style><rect width="5" height="5" onclick="alert(2)"/></svg>`
    );
    expect(cleaned).not.toContain("<script");
    expect(cleaned).not.toContain("<style");
    expect(cleaned).not.toContain("onclick");
  });

  test("`<foreignObject>` **元素保留、只剥 srcdoc** —— 与既有设计一致（如实记录）", () => {
    // 不能整个剥掉 foreignObject：项目自己的 stateIconDrawing.tsx 会生成它，
    // 真实图标库里也有（carbon-workflow-automation.svg）—— 见 svgSanitize.test.ts 的说明。
    // 故只剥 srcdoc 属性。**这与本次 SMIL 修复的设计原则完全一致**：
    // 只删危险属性、不删元素，避免误伤项目自身与真实图标库产出的合法 foreignObject。
    const cleaned = stripUnsafeInlineSvgMarkup(
      `<svg xmlns="http://www.w3.org/2000/svg"><foreignObject><iframe xmlns="http://www.w3.org/1999/xhtml" srcdoc="&lt;script&gt;alert(1)&lt;/script&gt;"></iframe></foreignObject><rect width="5" height="5"/></svg>`
    );
    expect(cleaned, "foreignObject 元素本身保留").toContain("<foreignObject");
    expect(cleaned, "iframe 元素保留").toContain("<iframe");
    // 危险的是 srcdoc 的值，不是元素
    expect(cleaned).not.toContain("srcdoc");
    expect(cleaned).not.toContain("alert(1)");
  });
});
