import { describe, expect, test } from "vitest";
import { convertJsxToCreateElement } from "./jsx-to-create-element.mjs";

describe("jsx-to-create-element", () => {
  test("自闭合元素带 props", () => {
    const out = convertJsxToCreateElement('const a = <rect x="1" fill="red" />;\n', "t.tsx");
    expect(out).toContain('createElement("rect", { x: "1", fill: "red" })');
  });

  test("嵌套子元素", () => {
    const out = convertJsxToCreateElement("const a = <g><rect /></g>;\n", "t.tsx");
    expect(out).toContain('createElement("g", null, createElement("rect", null))');
  });

  test("片段转为 Fragment", () => {
    const out = convertJsxToCreateElement("const a = <><rect /><rect /></>;\n", "t.tsx");
    expect(out).toContain("createElement(Fragment, null,");
  });

  test("表达式属性与文本子节点", () => {
    const out = convertJsxToCreateElement('const a = <text x={n}>{label}</text>;\n', "t.tsx");
    expect(out).toContain('createElement("text", { x: n }, label)');
  });

  test("保留类型标注与注释", () => {
    const src = "// 保留注释\nfunction f(node: ModelNode): number { return 1; }\nconst a = <rect />;\n";
    const out = convertJsxToCreateElement(src, "t.tsx");
    expect(out).toContain("// 保留注释");
    expect(out).toContain("function f(node: ModelNode): number { return 1; }");
  });

  test("data-* 属性名需引号包裹", () => {
    const out = convertJsxToCreateElement('const a = <g data-model-hierarchy-family="station" />;\n', "t.tsx");
    expect(out).toContain('createElement("g", { "data-model-hierarchy-family": "station" })');
  });

  // ── 以下用例覆盖 outermostJsxWithin / renderExpr / 标签名 / 属性名各分支 ──

  test("表达式内的嵌套 JSX 会被递归替换（map 回调）", () => {
    const out = convertJsxToCreateElement(
      "const a = <g>{items.map((i) => <rect key={i} />)}</g>;\n",
      "t.tsx",
    );
    expect(out).toContain('createElement("g", null, items.map((i) => createElement("rect", { key: i })))');
    expect(out).not.toContain("<rect");
  });

  test("同一表达式内多个并列 JSX 按逆序替换而不互相破坏", () => {
    const out = convertJsxToCreateElement("const a = <g>{c ? <rect /> : <circle />}</g>;\n", "t.tsx");
    expect(out).toContain(
      'createElement("g", null, c ? createElement("rect", null) : createElement("circle", null))',
    );
  });

  test("表达式本身是含子元素的 JSX 时只替换最外层", () => {
    const out = convertJsxToCreateElement("const a = <div>{<g><rect /></g>}</div>;\n", "t.tsx");
    expect(out).toContain('createElement("div", null, createElement("g", null, createElement("rect", null)))');
    expect(out).not.toContain("<rect");
  });

  test("大写开头的组件标识符不加引号", () => {
    const out = convertJsxToCreateElement("const a = <Rect />;\n", "t.tsx");
    expect(out).toContain("createElement(Rect, null)");
    expect(out).not.toContain('createElement("Rect"');
  });

  test("属性访问标签保留原始源码文本", () => {
    expect(convertJsxToCreateElement("const a = <Foo.Bar />;\n", "t.tsx")).toContain(
      "createElement(Foo.Bar, null)",
    );
    expect(convertJsxToCreateElement("const a = <ns.Foo.Bar x={1} />;\n", "t.tsx")).toContain(
      "createElement(ns.Foo.Bar, { x: 1 })",
    );
  });

  test("命名空间属性抛错", () => {
    expect(() => convertJsxToCreateElement('const a = <use a:href="#a" />;\n', "t.tsx")).toThrow(
      /命名空间属性/,
    );
  });

  test("展开属性并入对象字面量", () => {
    expect(convertJsxToCreateElement("const a = <g {...rest} />;\n", "t.tsx")).toContain(
      'createElement("g", { ...rest })',
    );
    expect(convertJsxToCreateElement("const a = <g {...rest} x={1} />;\n", "t.tsx")).toContain(
      'createElement("g", { ...rest, x: 1 })',
    );
  });

  test("无初始化值的布尔属性输出 true", () => {
    expect(convertJsxToCreateElement("const a = <input disabled />;\n", "t.tsx")).toContain(
      'createElement("input", { disabled: true })',
    );
  });

  test("空表达式容器的属性值退化为 true", () => {
    expect(convertJsxToCreateElement("const a = <g x={} />;\n", "t.tsx")).toContain(
      'createElement("g", { x: true })',
    );
  });

  // TSX 解析器对 `b=<c />` 做错误恢复，把 initializer 解析成 JsxSelfClosingElement，
  // 于是走 renderProps 最后的 else 兜底（renderExpr(attr.initializer)）。
  test("initializer 非字符串非表达式（解析器错误恢复）时走 renderExpr 兜底", () => {
    expect(convertJsxToCreateElement("const a = <g b=<c /> />;\n", "t.tsx")).toContain(
      'createElement("g", { b: createElement("c", null) })',
    );
    expect(convertJsxToCreateElement("const a = <g b=<c /> d={1} />;\n", "t.tsx")).toContain(
      'createElement("g", { b: createElement("c", null), d: 1 })',
    );
  });
});
