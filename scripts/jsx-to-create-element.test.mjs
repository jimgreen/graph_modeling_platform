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
});
