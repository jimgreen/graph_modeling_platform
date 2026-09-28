// 导入路径（svgModelImport.ts）SMIL 值属性防线的守卫。
//
// 与渲染侧 `src/svgSanitizeSmil.test.ts` **成对**：那个钉渲染侧
// `stripUnsafeInlineSvgMarkup`，本文件钉导入侧 `sanitizeDocument`。
//
// 为什么要两侧都拦（防御纵深）：
// 渲染侧已能拦住 SMIL 改写 href 的向量，但恶意 SVG 若带着
// `values="javascript:..."` 落进项目文件，仍会被导出链路或其它消费方读到 ——
// 渲染侧净化只发生在「内联渲染」那一刻，**不是数据层的准入**。故导入时即应拦下。
//
// 两侧规则刻意**同构**：都对 values/to/from/by 无条件套用同一套 scheme 判定
// （导入侧 safeUrl / 渲染侧 href 规则），误伤面同样极小 —— 正常动画的值
// （`0;1;2`、`#fff`、色值、`url(#id)`）都不带 scheme，会被放行。
import { describe, expect, test } from "vitest";
import { DOMParser, XMLSerializer } from "@xmldom/xmldom";
import { parseSvgModel, type SvgDomAdapter } from "./svgModelImport";
import { DEVICE_LIBRARY } from "./model";

const dom: SvgDomAdapter = {
  parse(source) {
    const document = new DOMParser({
      onError(level, message) {
        if (level !== "warning") throw new Error(String(message));
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
  parseSvgModel(source, {
    name: "探针图",
    templates: DEVICE_LIBRARY,
    dom,
    yieldToMain: async () => undefined,
    batchSize: 4
  });

const wrap = (inner: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 100 100">${inner}</svg>`;

/** 结果里所有字符串形态（含序列化后的 SVG 标记）拼起来 */
const allStrings = (v: unknown, acc: string[] = []): string[] => {
  if (typeof v === "string") acc.push(v);
  else if (Array.isArray(v)) v.forEach((x) => allStrings(x, acc));
  else if (v && typeof v === "object") {
    Object.values(v as Record<string, unknown>).forEach((x) => allStrings(x, acc));
  }
  return acc;
};

const markupOf = async (inner: string) => allStrings(await parse(wrap(inner))).join("\n");

describe("导入侧：SMIL 值属性里的危险 scheme 被拦下", () => {
  const vectors: [string, string][] = [
    ["animate values", `<animate attributeName="href" values="javascript:alert(1)" dur="1s"/>`],
    ["animate to", `<animate attributeName="href" to="javascript:alert(1)" dur="1s"/>`],
    ["set to", `<set attributeName="href" to="javascript:alert(1)"/>`],
    ["animate xlink:href", `<animate attributeName="xlink:href" values="javascript:alert(1)" dur="1s"/>`],
    ["begin=click", `<animate attributeName="href" begin="click" values="javascript:alert(1)" dur="1s"/>`],
    ["大小写混写", `<animate attributeName="href" values="JaVaScRiPt:alert(1)" dur="1s"/>`],
    ["vbscript", `<animate attributeName="href" values="vbscript:msgbox(1)" dur="1s"/>`],
    ["data:text/html", `<animate attributeName="href" values="data:text/html,x" dur="1s"/>`],
    ["file scheme", `<animate attributeName="href" values="file:///c:/x.exe" dur="1s"/>`],
    ["from 属性", `<animate attributeName="href" from="#a" to="javascript:alert(1)" dur="1s"/>`]
  ];

  for (const [label, anim] of vectors) {
    test(`${label}：导入结果里不再有 javascript:/vbscript:`, async () => {
      const markup = await markupOf(`<a href="#safe"><rect width="5" height="5"/></a>${anim}`);
      expect(markup, markup.slice(0, 200)).not.toMatch(/(?:java|vb)script:/i);
      expect(markup).not.toContain("alert(1)");
      expect(markup).not.toContain("msgbox(1)");
    });
  }

  test("清理计数进入 warnings（用户能看到发生了清理）", async () => {
    const result = await parse(
      wrap(`<a href="#safe"><rect width="5" height="5"/></a><animate attributeName="href" values="javascript:alert(1)" dur="1s"/>`)
    );
    expect(result.warnings.join(" ")).toContain("已清理");
  });
});

describe("导入侧：正常 SMIL 动画不被误伤", () => {
  const animates: [string, string][] = [
    ["数值插值", `<animate attributeName="fill" values="red;blue;green" dur="2s" repeatCount="indefinite"/>`],
    ["单值 to", `<animate attributeName="opacity" to="0.5" dur="1s"/>`],
    ["transform 插值", `<animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="2s"/>`],
    ["颜色 from/to", `<animate attributeName="fill" from="#fff" to="#000" dur="1s"/>`],
    ["安全 http href", `<animate attributeName="href" values="https://x.test/a.png" dur="1s"/>`],
    ["锚点 href", `<animate attributeName="href" values="#other" dur="1s"/>`],
    ["url(#id) 引用", `<animate attributeName="fill" values="url(#grad)" dur="1s"/>`],
    ["path d 动画", `<animate attributeName="d" values="M0 0 L10 10;M0 0 L20 20" dur="1s"/>`],
    ["data:image 值", `<animate attributeName="fill" values="data:image/png;base64,iVBOR" dur="1s"/>`]
  ];

  for (const [label, anim] of animates) {
    test(`${label}：值属性原样保留（不被清理）`, async () => {
      const result = await parse(wrap(`<a href="#safe"><rect width="5" height="5"/></a>${anim}`));
      // 未触发清理 = warnings 里没有「已清理」
      expect(result.warnings.join(" "), result.warnings.join(" ")).not.toContain("已清理");
    });
  }

  test("正常动画的值内容未被篡改", async () => {
    const markup = await markupOf(
      `<rect width="5" height="5"><animate attributeName="fill" values="red;blue;green" dur="2s"/></rect>`
    );
    // 编码后仍应能还原出原值（可能被百分号编码，故用解码后的串比对）
    const decoded = decodeURIComponent(markup);
    expect(decoded).toContain('values="red;blue;green"');
  });
});

describe("导入侧：既有防线不受影响", () => {
  test("直接 href=javascript: 仍被拦（未因本次改动回退）", async () => {
    const markup = await markupOf(`<a href="javascript:alert(1)"><rect width="5" height="5"/></a>`);
    expect(markup).not.toContain("javascript:");
  });

  test("危险元素仍被移除（script / iframe / object / embed）", async () => {
    for (const el of ["script", "iframe", "object", "embed"]) {
      const markup = await markupOf(`<${el}>PAYLOAD</${el}><rect width="5" height="5"/>`);
      expect(markup, el).not.toContain("PAYLOAD");
    }
  });

  test("on* 事件属性仍被移除", async () => {
    for (const attr of ["onclick", "onload", "onerror"]) {
      const markup = await markupOf(`<rect width="5" height="5" ${attr}="PAYLOAD"/>`);
      expect(markup, attr).not.toContain("PAYLOAD");
    }
  });

  test("`<foreignObject>` 元素本身保留、其中的 srcdoc 被清（既有设计）", async () => {
    // 与渲染侧一致：不能整个剥掉 foreignObject（项目自身 stateIconDrawing 会生成它），
    // 只剥危险属性。
    const markup = await markupOf(
      `<foreignObject><iframe xmlns="http://www.w3.org/1999/xhtml" srcdoc="&lt;script&gt;alert(1)&lt;/script&gt;"></iframe></foreignObject><rect width="5" height="5"/>`
    );
    expect(markup).not.toContain("srcdoc");
    expect(markup).not.toContain("alert(1)");
  });
});
