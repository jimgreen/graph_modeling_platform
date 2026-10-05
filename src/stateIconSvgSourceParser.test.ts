// parseStateIconSvgSource（src/stateIconDrawing.tsx:1317）的直测。
//
// 此前全仓只有 src/stateIconDrawing.test.ts:2868 的一处**注释**提到它，
// 真实函数从未被调用过。它有五条返回 null 的路径（空串 / 无 DOMParser /
// parsererror / 非 svg 根 / 解析抛错）加一条正常路径，全部零覆盖 —— 而
// stateIconSvgElementSource、stateIconSvgVisibleViewBox 等上游都依赖它返回
// null 来表示「这张图不可用」，一旦这些分支回归，坏 SVG 会一路渲染出去而不报错。
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { DOMParser as XmlDomParser, XMLSerializer as XmlSerializer } from "@xmldom/xmldom";
import { parseStateIconSvgSource } from "./stateIconDrawing";

// ## 为什么需要这层 DOMParser 替身
//
// xmldom 0.9.10 缺两样浏览器 API，而这支函数两样都要用：
//   · Document.querySelector —— xmldom 的 Document 只有 getElementsByTagName；
//   · Element.outerHTML    —— 只有 XMLSerializer.serializeToString。
//
// 不补这两样的话，函数第一句 `document.querySelector("parsererror")` 就抛
// TypeError，被它自己的 catch 吞掉后返回 null —— 于是**合法 SVG 也返回 null**，
// 五条 null 路径与正常路径全部塌缩成同一个结果，一条都测不出来。
//
// 替身只补这两个缺口，XML 解析本身仍全部交给 xmldom。与
// src/stateIconDrawing.test.ts:83 的 withXmlDomParser 同一套做法，
// 但放在本文件内独立一份，避免改动那个文件。
const serializer = new XmlSerializer();

/** 记录 parseFromString 被调用的次数，用来区分「提前 return」与「走到 catch」。 */
let parseCalls = 0;

class BrowserShapedDOMParser {
  parseFromString(source: string, mimeType: string) {
    parseCalls += 1;
    const document: any = new XmlDomParser().parseFromString(source, mimeType);
    if (document.documentElement) {
      const elementPrototype = Object.getPrototypeOf(document.documentElement);
      if (!Object.getOwnPropertyDescriptor(elementPrototype, "outerHTML")) {
        Object.defineProperty(elementPrototype, "outerHTML", {
          configurable: true,
          get() {
            return serializer.serializeToString(this);
          }
        });
      }
    }
    // 源码只用 parsererror / svg 两种裸标签选择器，getElementsByTagName 足够。
    document.querySelector = (selector: string) => {
      const elements = document.getElementsByTagName(selector);
      return elements.length > 0 ? elements.item(0) : null;
    };
    return document;
  }
}

const VALID_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="20" viewBox="0 0 10 20">' +
  '<defs><path d="M0 0"/></defs><script>alert(1)</script><g id="a"><rect/></g></svg>';

beforeEach(() => {
  parseCalls = 0;
  (globalThis as any).DOMParser = BrowserShapedDOMParser;
});

afterEach(() => {
  delete (globalThis as any).DOMParser;
});

describe("parseStateIconSvgSource 的 null 路径", () => {
  // ① 空串早退。只断言 toBeNull 是**不够**的：删掉 `!svgSource` 那一行后，
  // parseFromString("") 会抛 ParseError，被 catch 吞掉照样返回 null，断言恒绿。
  // 所以额外断言解析器一次都没被调用 —— 那才是这条早退真正承重的地方。
  test("源串为空或纯空白时直接返回 null，不进入解析", () => {
    expect(parseStateIconSvgSource("")).toBeNull();
    expect(parseStateIconSvgSource("   \n\t ")).toBeNull();
    expect(parseCalls).toBe(0);
  });

  // ② 无 DOMParser。两条对照断言缺一不可：只断言返回 null 的话，
  // 「因为源串是坏的所以 null」也会让测试通过，证明不了是这个全局缺失导致的。
  test("环境缺少 DOMParser 时返回 null，源串本身却是合法的", () => {
    delete (globalThis as any).DOMParser;
    expect(parseStateIconSvgSource(VALID_SVG)).toBeNull();
    // 同一份源串，挂上 DOMParser 后必须解析成功 —— 证明上面的 null 来自全局缺失。
    (globalThis as any).DOMParser = BrowserShapedDOMParser;
    expect(parseStateIconSvgSource(VALID_SVG)).not.toBeNull();
  });

  // ③ 非法 XML。
  //
  // ⚠️ xmldom 与浏览器不同：它**不产出 <parsererror> 元素，而是直接抛
  // ParseError**（已实测 0.9.10）。所以在这套替身下这条路径走的是 catch 分支，
  // 不是 parsererror 分支。parsererror 分支由下面的 ④ 单独覆盖。
  test("XML 语法非法时返回 null：xmldom 抛 ParseError，被函数的兜底 catch 吞掉", () => {
    expect(() => parseStateIconSvgSource("<svg><g></svg>")).not.toThrow();
    expect(parseStateIconSvgSource("<svg><g></svg>")).toBeNull();
  });

  // ④ parsererror 分支。喂一份**本身合法**、只是含 <parsererror/> 元素的 XML，
  // 来替代浏览器「解析失败后生成 parsererror 元素」的行为。
  //
  // 这条是有鉴别力的：若删掉 `document.querySelector("parsererror")` 那道检查，
  // 解析会继续往下走到 svg 查找并返回**非 null**，断言转红。
  test("解析结果中出现 parsererror 元素时返回 null", () => {
    expect(parseStateIconSvgSource("<svg><parsererror/></svg>")).toBeNull();
  });

  // ⑤ 根元素不是 svg。
  //
  // ⚠️ 这条断言**结构上无法转红**，如实记录：删掉 `if (!svg) return null` 后，
  // 下一行 `svg.getAttribute("width")` 会对 null 解引用抛 TypeError，
  // 同样被 catch 吞掉、同样返回 null。要让它变红只能靠源文件行为变更，
  // 而本轮不改源码，故保留断言锁定契约、并在此说明其不可证伪。
  test("合法 XML 但根元素不是 svg 时返回 null", () => {
    expect(parseStateIconSvgSource("<div><span>hi</span></div>")).toBeNull();
    expect(parseStateIconSvgSource("<not-svg/>")).toBeNull();
  });
});

describe("parseStateIconSvgSource 的正常路径", () => {
  test("合法 svg 返回非 null：viewBox 正确解析、body 子节点可枚举", () => {
    const parsed = parseStateIconSvgSource(VALID_SVG);
    expect(parsed).not.toBeNull();
    // viewBox 取自属性本身，不走兜底。
    expect(parsed?.viewBox).toBe("0 0 10 20");
    // body 是 safeChildren 的序列化拼接：script 已被剔除，defs 与 g 都在。
    expect(parsed?.body).toContain("<defs");
    expect(parsed?.body).toContain("<g");
    expect(parsed?.body).not.toContain("script");
    // defs 进 supportMarkup，不进 editableChildren；g 两边都进。
    expect(parsed?.supportMarkup).toContain("<defs");
    expect(parsed?.supportMarkup).not.toContain("<g");
    expect(parsed?.editableChildren.map((child) => child.tagName)).toEqual(["g"]);
  });

  test("缺 viewBox 时按 width/height 兜底，宽高也缺则用 240x160 默认值", () => {
    expect(parseStateIconSvgSource('<svg width="12.5" height="8"><g/></svg>')?.viewBox).toBe("0 0 12.5 8");
    expect(parseStateIconSvgSource("<svg><g/></svg>")?.viewBox).toBe("0 0 240 160");
  });

  test("script 与 foreignObject 被剔除，不进 body 也不进 editableChildren", () => {
    const parsed = parseStateIconSvgSource(
      '<svg viewBox="0 0 4 4"><script>alert(1)</script><foreignObject><div/></foreignObject><rect/></svg>',
    );
    expect(parsed?.body).not.toContain("script");
    expect(parsed?.body).not.toContain("foreignObject");
    expect(parsed?.body).toContain("<rect");
    expect(parsed?.editableChildren.map((child) => child.tagName)).toEqual(["rect"]);
  });
});