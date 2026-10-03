import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import { DeviceGlyph, usesTransformerTerminalSlotPaint } from "./DeviceGlyph";
import { createDefaultNode, type ModelNode } from "./model";

const transformerFamilyKinds = [
  "ac-terminal-transformer-load",
  "ac-transformer",
  "ac-two-winding-transformer",
  "ac-three-winding-transformer",
  "ac-three-winding-transformer-neutral",
  "dc-transformer"
];

const renderWithTerminalSlots = (node: ModelNode) =>
  renderToStaticMarkup(
    createElement(
      "svg",
      null,
      createElement(DeviceGlyph, {
        node,
        mode: "geometry",
        voltagePaint: {
          nodeRef: "var(--t1)",
          terminalRef: (terminalId: string) => terminalId === "t1" ? "var(--t1)" : terminalId === "t2" ? "var(--t2)" : undefined
        }
      })
    )
  );

describe("usesTransformerTerminalSlotPaint", () => {
  test("所有变压器族 kind 都启用端子槽着色", () => {
    for (const kind of transformerFamilyKinds) {
      expect(usesTransformerTerminalSlotPaint(kind), kind).toBe(true);
    }
  });

  test("非变压器、未知和空 kind 不启用端子槽着色", () => {
    for (const kind of ["ac-switch", "ac-load", "unknown-device", ""]) {
      expect(usesTransformerTerminalSlotPaint(kind), kind || "空 kind").toBe(false);
    }
  });

  test("DeviceGlyph 变压器分支按端子输出槽标记，普通双端子图元不消费第二槽", () => {
    const transformer = createDefaultNode("ac-transformer", { x: 0, y: 0 });
    const switchNode = createDefaultNode("ac-switch", { x: 0, y: 0 });

    expect(usesTransformerTerminalSlotPaint(transformer.kind)).toBe(true);
    const transformerSvg = renderWithTerminalSlots(transformer);
    expect(transformerSvg).toContain('stroke="var(--t1)"');
    expect(transformerSvg).toContain('stroke="var(--t2)"');

    expect(usesTransformerTerminalSlotPaint(switchNode.kind)).toBe(false);
    const switchSvg = renderWithTerminalSlots(switchNode);
    expect(switchSvg).toContain('stroke="var(--t1)"');
    expect(switchSvg).not.toContain("var(--t2)");
  });
});
