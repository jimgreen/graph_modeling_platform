// src/stateIconDrawing.tsx 的「SVG → React 节点」这一层：
//   stateIconSvgReactAttributes   属性名映射 + style 解析 + 描边/填充覆盖
//   stateIconSvgNodeChildren      文本 / 元素 / 危险标签的取舍
//   stateIconSvgNodeToReact       标签 → React 元素
//
// 这是**用户自带 SVG 图标**进画布前的净化口：on* 事件属性、script / foreignObject / style
// 子元素都在这里被丢掉。此前这一层零断言。判错的后果是图标画错（属性名没映射上、
// kebab-case 直接透给 React 被忽略），或者 —— 更糟 —— 恶意图标带的事件属性被渲染出来。
//
// 本文件同时是那处安全修复的守卫：事件属性原先只挡小写 `on` 前缀，而 SVG 以 XML 解析、
// 属性名保留原样，`onClick` / `ONCLICK` 会原样进 React 并被当成真事件处理器挂上。
// 改成 `name.toLowerCase().startsWith("on")` 后由「大小写变体也丢」那条用例钉住。
//
// 测试不引 jsdom（仓库默认 environment 是 node，装 jsdom 属于新增依赖）：这三个函数只读
// element 的 tagName / attributes / childNodes，Node.TEXT_NODE 是全局常量，全部用假元素喂。
// 真正需要 DOMParser 的 stateIconSvgSourceToReactNodes 不在本文件覆盖范围内。
//
// 50 处变异逐条跑过、全部转红。过程中补了三处真缺口：defs / clipPath / symbol / marker /
// 渐变 / svg / g 这些容器原先只断言「标签本身在」，没断言子节点真渲染出来，少一层 children
// 照样全绿。另有一处无效变异是我自己写坏的（改完仍走原链），不算覆盖。
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { stateIconSvgNodeChildren, stateIconSvgNodeToReact, stateIconSvgReactAttributes } from "./stateIconDrawing";

type FakeAttribute = { name: string; value: string };
type FakeNode = { nodeType: number; textContent?: string; tagName?: string; attributes?: FakeAttribute[]; childNodes?: FakeNode[] };

const TEXT_NODE = 3;
const ELEMENT_NODE = 1;
const COMMENT_NODE = 8;

/** 假元素：只提供这三个函数真正读到的字段。 */
const el = (tagName: string, attributes: Record<string, string> = {}, childNodes: FakeNode[] = []): FakeNode => ({
  nodeType: ELEMENT_NODE,
  tagName,
  attributes: Object.entries(attributes).map(([name, value]) => ({ name, value })),
  childNodes
});

const text = (textContent: string): FakeNode => ({ nodeType: TEXT_NODE, textContent });
const comment = (textContent: string): FakeNode => ({ nodeType: COMMENT_NODE, textContent });

const attrsOf = (node: FakeNode, override?: unknown): Record<string, unknown> =>
  stateIconSvgReactAttributes(node as never, override as never);

const markup = (node: ReactNode): string => renderToStaticMarkup(createElement("div", null, node));

const OVERRIDE_BASE = { stroke: "#ff0000", strokeWidth: 0, dashArray: "", fill: "#00ff00" };

// React 服务端渲染器会对子节点做 `instanceof Node` 判断，所以这个桩必须是**构造函数**，
// 光给个普通对象会在 renderToStaticMarkup 里炸（"Right-hand side of 'instanceof' is not callable"）。
class NodeStub {}
Object.assign(NodeStub, { TEXT_NODE, ELEMENT_NODE, COMMENT_NODE });

beforeAll(() => {
  (globalThis as { Node?: unknown }).Node = NodeStub;
});
afterAll(() => {
  delete (globalThis as { Node?: unknown }).Node;
});

describe("stateIconSvgReactAttributes：属性映射", () => {
  test("★ on* 事件属性一律丢掉（净化口的核心）", () => {
    const props = attrsOf(el("path", { onclick: "alert(1)", onload: "x", onMouseOver: "y", "on-any": "z", d: "M0 0" }));
    expect(Object.keys(props)).toEqual(["d"]);
  });

  test("★ 名字以 on 开头的大小写变体也丢（不区分大小写地按前缀判）", () => {
    expect(Object.keys(attrsOf(el("path", { ONCLICK: "x", OnLoad: "y" })))).toEqual([]);
  });

  test("★ style 属性解析成对象，不是字符串", () => {
    expect(attrsOf(el("path", { style: "fill:red;stroke-width:2" }))).toEqual({ style: { fill: "red", strokeWidth: "2" } });
  });

  test("★ kebab-case 属性名映射成 React 的 camelCase", () => {
    const props = attrsOf(el("path", {
      "class": "a",
      "clip-path": "url(#c)",
      "fill-rule": "evenodd",
      "stroke-width": "2",
      "stroke-linecap": "round",
      "stroke-linejoin": "bevel",
      "stroke-dasharray": "4 2",
      "text-anchor": "middle",
      "dominant-baseline": "central",
      "font-family": "Arial",
      "font-size": "12",
      "font-weight": "500",
      "font-style": "italic",
      "text-decoration": "underline",
      "vector-effect": "non-scaling-stroke",
      "pointer-events": "none",
      "stop-color": "#fff",
      "stop-opacity": "0.5",
      "fill-opacity": "0.3",
      "stroke-opacity": "0.4",
      "marker-start": "url(#m)",
      "marker-end": "url(#m)",
      "marker-mid": "url(#m)",
      "marker-width": "3",
      "marker-height": "3",
      "marker-units": "strokeWidth",
      refx: "0.5",
      refy: "0.5"
    }));
    expect(props).toEqual({
      className: "a",
      clipPath: "url(#c)",
      fillRule: "evenodd",
      strokeWidth: "2",
      strokeLinecap: "round",
      strokeLinejoin: "bevel",
      strokeDasharray: "4 2",
      textAnchor: "middle",
      dominantBaseline: "central",
      fontFamily: "Arial",
      fontSize: "12",
      fontWeight: "500",
      fontStyle: "italic",
      textDecoration: "underline",
      vectorEffect: "non-scaling-stroke",
      pointerEvents: "none",
      stopColor: "#fff",
      stopOpacity: "0.5",
      fillOpacity: "0.3",
      strokeOpacity: "0.4",
      markerStart: "url(#m)",
      markerEnd: "url(#m)",
      markerMid: "url(#m)",
      markerWidth: "3",
      markerHeight: "3",
      markerUnits: "strokeWidth",
      refX: "0.5",
      refY: "0.5"
    });
  });

  test("没有映射表的自定义属性按原名透传（data-* 之类）", () => {
    expect(attrsOf(el("path", { "data-x": "1", "aria-label": "刀闸" }))).toEqual({ "data-x": "1", "aria-label": "刀闸" });
  });
});

describe("stateIconSvgReactAttributes：描边 / 填充覆盖", () => {
  test("★ 描边被编辑过才覆盖（edited 标记为真，或线宽 > 0）", () => {
    const edited = attrsOf(el("path", { stroke: "#123456" }), { ...OVERRIDE_BASE, strokeColorEdited: true });
    expect(edited.stroke).toBe("#ff0000");
    // 一个 edited 标记都没有 → 原属性原样保留，覆盖值一概不生效
    const notEdited = attrsOf(el("path", { stroke: "#123456" }), OVERRIDE_BASE);
    expect(notEdited.stroke).toBe("#123456");
    expect(Object.prototype.hasOwnProperty.call(notEdited, "style")).toBe(false);
  });

  test("线宽 > 0 也算覆盖，并顺带钉上 non-scaling-stroke", () => {
    const props = attrsOf(el("path", {}), { ...OVERRIDE_BASE, strokeWidth: 2.5 });
    expect(props.strokeWidth).toBe("2.5");
    expect(props.vectorEffect).toBe("non-scaling-stroke");
    expect(props.stroke).toBe("#ff0000");
  });

  test("★ 覆盖时把 style 里同名的旧值删掉（style 与属性不能打架）", () => {
    const props = attrsOf(el("path", { style: "stroke:#000;stroke-width:9;stroke-dasharray:1 1;fill:#eee" }), {
      ...OVERRIDE_BASE,
      strokeWidth: 3,
      strokeStyleEdited: true,
      fillColorEdited: true
    }) as { style: Record<string, string>; stroke: string; fill: string; strokeDasharray: string };
    expect(props.style).toEqual({});
    expect(props.stroke).toBe("#ff0000");
    expect(props.fill).toBe("#00ff00");
    expect(props.strokeDasharray).toBe("none");
  });

  test("线型没编辑时保留 dashArray，为空则写 none", () => {
    expect(attrsOf(el("line", {}), { ...OVERRIDE_BASE, strokeStyleEdited: true }).strokeDasharray).toBe("none");
    expect(attrsOf(el("line", {}), { ...OVERRIDE_BASE, strokeStyleEdited: true, dashArray: "6 3" }).strokeDasharray).toBe("6 3");
  });

  test("★ 只给了覆盖值但一个 edited 标记都没有 → 原样返回，不动属性", () => {
    expect(attrsOf(el("path", { d: "M0 0", stroke: "#123456" }), OVERRIDE_BASE)).toEqual({ d: "M0 0", stroke: "#123456" });
  });

  test("★ 不接受覆盖的标签（g / defs）原样返回", () => {
    expect(attrsOf(el("g", { stroke: "#123456" }), { ...OVERRIDE_BASE, strokeColorEdited: true })).toEqual({ stroke: "#123456" });
    expect(attrsOf(el("defs", {}), { ...OVERRIDE_BASE, strokeWidth: 3 })).toEqual({});
  });

  test("负线宽被夹到 0（要带 strokeWidthEdited 才算「编辑过」）", () => {
    expect(attrsOf(el("path", {}), { ...OVERRIDE_BASE, strokeWidth: -4, strokeWidthEdited: true }).strokeWidth).toBe("0");
  });
});

describe("stateIconSvgNodeChildren：子节点取舍", () => {
  test("★ 文本节点保留非空、丢纯空白", () => {
    expect(stateIconSvgNodeChildren(el("text", {}, [text("闭合"), text("   \n "), text("打开")]) as never, "k")).toEqual(["闭合", "打开"]);
  });

  test("★ script / foreignObject / style 子元素整条丢掉", () => {
    const children = stateIconSvgNodeChildren(
      el("g", {}, [el("script", {}), el("foreignObject", {}), el("style", {}), el("path", {})]) as never,
      "k"
    );
    expect(children).toHaveLength(1);
    expect(markup(children[0])).toContain("<path");
  });

  test("注释等非元素非文本节点丢掉", () => {
    expect(stateIconSvgNodeChildren(el("g", {}, [comment("注释"), el("path", {})]) as never, "k")).toHaveLength(1);
  });

  test("key 按下标递增（svg-node-0 / svg-node-1 …）", () => {
    const keys = stateIconSvgNodeChildren(el("g", {}, [el("path", {}), el("circle", {}), el("rect", {})]) as never, "svg-node")
      .map((child) => (child as { key?: string }).key);
    expect(keys).toEqual(["svg-node-0", "svg-node-1", "svg-node-2"]);
  });
});

describe("stateIconSvgNodeToReact：标签 → React 元素", () => {
  test("★ 常见图形标签各自映射到同名元素", () => {
    for (const tag of ["g", "path", "circle", "rect", "ellipse", "line", "polyline", "polygon", "use", "image", "stop"]) {
      expect(markup(stateIconSvgNodeToReact(el(tag) as never, `k-${tag}`)), tag).toContain(`<${tag}`);
    }
  });

  test("容器标签带上 children（text / tspan / defs / symbol / marker / clipPath / 渐变）", () => {
    expect(markup(stateIconSvgNodeToReact(el("text", {}, [text("闭合")]) as never, "k"))).toContain("<text>闭合</text>");
    expect(markup(stateIconSvgNodeToReact(el("tspan", {}, [text("x")]) as never, "k"))).toContain("<tspan>x</tspan>");
    // defs 里的渐变、clipPath 里的子节点都要真的渲染出来（少了就是渐变失效、图标全黑）
    expect(markup(stateIconSvgNodeToReact(el("defs", {}, [el("linearGradient", { id: "g1" })]) as never, "k")))
      .toContain('<defs><linearGradient id="g1"></linearGradient></defs>');
    expect(markup(stateIconSvgNodeToReact(el("clipPath", { id: "c1" }, [el("path", { d: "M0 0" })]) as never, "k")))
      .toContain('<clipPath id="c1"><path d="M0 0">');
    // symbol / marker / 两种渐变 / svg / g 都是容器，少一层 children 就是图标内容整片消失
    for (const [tag, child] of [["symbol", el("path", { d: "M0 0" })], ["marker", el("path", { d: "M0 0" })],
      ["linearGradient", el("stop", { offset: "0" })], ["radialGradient", el("stop", { offset: "1" })],
      ["svg", el("g", {})], ["g", el("circle", { r: "1" })]] as Array<[string, FakeNode]>) {
      const rendered = markup(stateIconSvgNodeToReact(el(tag, {}, [child]) as never, "k"));
      expect(rendered, tag).toContain(`<${tag}`);
      // 子节点标签只可能来自 children —— 容器把 children 丢了这条就会红
      expect(rendered, `${tag} 的子节点 ${child.tagName}`).toContain(`<${child.tagName}`);
    }
    expect(markup(stateIconSvgNodeToReact(el("svg", {}, [el("g", {})]) as never, "k"))).toContain("<svg");
  });

  test("★ 不认识的标签退化成 g（不丢内容）", () => {
    const rendered = markup(stateIconSvgNodeToReact(el("feGaussianBlur", { stdDeviation: "2" }) as never, "k"));
    expect(rendered).toContain("<g");
    expect(rendered).toContain("stdDeviation");
  });

  test("事件属性不会出现在渲染结果里", () => {
    expect(markup(stateIconSvgNodeToReact(el("path", { onclick: "alert(1)", d: "M0 0" }) as never, "k"))).not.toContain("onclick");
  });

  test("无子节点的叶子标签渲染成空元素（属性齐全）", () => {
    expect(markup(stateIconSvgNodeToReact(el("path", { d: "M0 0" }) as never, "k"))).toBe('<div><path d="M0 0"></path></div>');
  });
});
