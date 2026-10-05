import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import { DeviceGlyph, usesTransformerTerminalSlotPaint, type DeviceGlyphProps } from "./DeviceGlyph";
import { createDefaultNode, DEFAULT_COLOR_PALETTE, type ModelNode } from "./model";

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

// mode 缺省走 full；renderMode 只在需要钉 mode 时显式传。
const renderGlyph = (node: ModelNode, extra: Omit<DeviceGlyphProps, "node"> = {}) =>
  renderToStaticMarkup(createElement("svg", null, createElement(DeviceGlyph, { node, ...extra })));

describe("DeviceGlyph 缩略图基准尺寸", () => {
  // 行 107/108：miniature 走 58×38 常量，否则走 node.size。
  // 断言对象 = 消费 rawW/rawH 的那段 path d（load 图元 bodyHalfWidth = w*2/9），
  // 不是 rawW 本身 —— 改 58 会直接改 d，改 node.size 分支也会改 d。
  test("缩略图按 58×38 常量绘制，普通图元按节点真实尺寸绘制", () => {
    const load = createDefaultNode("ac-load", { x: 0, y: 0 });
    // 预置：58×38 与真实尺寸 150×102 必然算出不同的三角形顶点，
    // 否则这条断言在两种实现下都成立（恒绿）。
    expect(58 * 2 / 9).not.toBe(150 * 2 / 9);

    const miniPath = renderGlyph(load, { miniature: true })
      .match(/d="(M -12[^"]+)"/)?.[1];
    const fullPath = renderGlyph(load)
      .match(/d="(M -22[^"]+)"/)?.[1];

    // 58×38 → 顶点 ±12.888…/±8.444…
    expect(miniPath).toBe(`M ${-58 * 2 / 9} ${-38 * 2 / 9} L ${58 * 2 / 9} ${-38 * 2 / 9} L 0 ${38 * 2 / 9} Z`);
    // 非缩略图 → 顶点用 150×102（glyphContentScale=1.5 后 w=100,h=68 → 100*2/9=22.22…）
    expect(fullPath).toBe(`M ${-100 * 2 / 9} ${-68 * 2 / 9} L ${100 * 2 / 9} ${-68 * 2 / 9} L 0 ${68 * 2 / 9} Z`);
    expect(miniPath).not.toBe(fullPath);
  });

  // 行 107/108 在容器分支同样可达（rect 宽高直接吃 w/h）：
  test("缩略图容器矩形用 58×38，常规模型矩形用节点尺寸 180×112", () => {
    const box = createDefaultNode("ac-vpp-box", { x: 0, y: 0 });
    const fillRect = (markup: string) =>
      markup.match(/<rect x="(-?[\d.]+)" y="(-?[\d.]+)" width="([\d.]+)" height="([\d.]+)" rx="8" class="ac-container-fill"/)
        ?.slice(1);

    const full = fillRect(renderGlyph(box));
    const mini = fillRect(renderGlyph(box, { miniature: true }));

    expect(full?.slice(2)).toEqual(["180", "112"]);
    expect(mini?.slice(2)).toEqual(["58", "38"]);
    expect(mini?.[0]).toBe(String(-58 / 2));
    expect(mini?.[1]).toBe(String(-38 / 2));
  });
});

describe("DeviceGlyph 端子槽取色 terminalPaint", () => {
  // 行 134：terminalRef 返回 undefined 时回落 getTerminalDisplayColor。
  // 断言对象 = 落在 windingColors[i] ?? stroke 之后的 circle stroke 属性。
  test("terminalRef 只给部分端子返回槽引用，其余端子回落到端子显示色", () => {
    const transformer = createDefaultNode("ac-transformer", { x: 0, y: 0 });
    // 预置：默认调色板里 ac 端子色是 #2563eb，与槽引用 var(--tN) 完全不同构型。
    expect(DEFAULT_COLOR_PALETTE.energy.ac).toMatch(/^#[0-9a-f]{6}$/i);

    const markup = renderGlyph(transformer, {
      voltagePaint: {
        nodeRef: "var(--node)",
        // 只给 t1 槽；t2 返回 undefined → 必须走 fallback
        terminalRef: (terminalId: string) => terminalId === "t1" ? "var(--t1)" : undefined
      }
    });

    const strokes = Array.from(markup.matchAll(/<circle cx="(-?[\d.]+)"[^>]*stroke="([^"]*)"/g))
      .map((match) => ({ cx: match[1], stroke: match[2] }));

    expect(strokes.map((entry) => entry.stroke)).toEqual(["var(--t1)", DEFAULT_COLOR_PALETTE.energy.ac]);
    expect(strokes.map((entry) => entry.cx)).toEqual(["-14", "14"]);
  });

  // 行 134：`?? fallback` 一侧。fallback 由 getTerminalDisplayColor(node, t, colorDisplayMode, colorPalette)
  // 决定 —— 换调色板就能换掉 fallback 颜色，从而证明这侧真的读了 fallback 而不是硬编码。
  test("回落的端子色随 colorPalette 改变，硬编码色则不会", () => {
    const transformer = createDefaultNode("ac-transformer", { x: 0, y: 0 });
    const palette = { ...DEFAULT_COLOR_PALETTE, energy: { ...DEFAULT_COLOR_PALETTE.energy, ac: "#123456" } };
    expect(DEFAULT_COLOR_PALETTE.energy.ac).not.toBe("#123456");

    const markup = renderGlyph(transformer, {
      colorPalette: palette,
      voltagePaint: {
        nodeRef: "var(--node)",
        terminalRef: () => undefined
      }
    });

    expect(markup).toContain('stroke="#123456"');
    expect(markup).not.toContain('stroke="#2563eb"');
    expect(markup).not.toContain("var(--t1)");
  });

  // 行 134：`terminal?.id ?? ""` —— 端子缺 id 时回调收到空串而不是 "undefined"。
  // 断言对象 = terminalRef 实际收到的 id 序列（由回调自己收集），
  // 不是渲染结果 —— 若 `?? ""` 被删掉，收到的会是字符串 "undefined"。
  test("端子缺 id 时 terminalRef 收到空串而不是 undefined 字面量", () => {
    const transformer = createDefaultNode("ac-transformer", { x: 0, y: 0 });
    const withoutId = {
      ...transformer,
      terminals: transformer.terminals.map((terminal, index) => (
        index === 0 ? { ...terminal, id: undefined as unknown as string } : terminal
      ))
    };

    const seen: string[] = [];
    renderGlyph(withoutId, {
      voltagePaint: {
        nodeRef: "var(--node)",
        terminalRef: (terminalId: string) => {
          seen.push(terminalId);
          return undefined;
        }
      }
    });

    expect(seen).toEqual(["", "t2"]);
    expect(seen).not.toContain("undefined");
  });
});

describe("DeviceGlyph 状态文字覆盖层", () => {
  // 行 170：fontSize = miniature ? 11 : clampNumber(min(w,h)*0.34, 10, 22)。
  // 断言对象 = <text font-size>。三档分别钉住 11（缩略图）、区间内插值、clamp 上界 22。
  test("状态文字字号：缩略图恒为 11，普通档按短边 0.34 换算并夹在 10~22", () => {
    const load = createDefaultNode("ac-load", { x: 0, y: 0 });
    // value/name 必填但不参与 text 解析（stateVisualText 只读 text ?? icon），
    // 这里刻意用非默认值，避免「恰好等于 fallback」式的恒绿断言。
    const stateVisual = { value: "st-run", name: "运行态", text: "运行" };
    const fontSizeOf = (markup: string) => markup.match(/<text[^>]*font-size="([\d.]+)"/)?.[1];
    const overlay = (node: ModelNode, extra: Omit<DeviceGlyphProps, "node"> = {}) =>
      fontSizeOf(renderGlyph(node, { mode: "text", stateVisual, ...extra }));

    // 缩略图分支：无论如何都 11（与 0.34 无关）
    expect(overlay(load, { miniature: true })).toBe("11");

    // 普通档：短边 60 → 60*0.34 = 20.4，落在 (10,22) 开区间内，clamp 不生效
    const midNode = { ...load, size: { width: 100, height: 60 } };
    expect(overlay(midNode)).toBe(String(60 * 0.34));
    expect(Number(overlay(midNode))).toBeGreaterThan(10);
    expect(Number(overlay(midNode))).toBeLessThan(22);

    // clamp 上界：短边 100 → 34 被压到 22。缩略图下同一节点仍是 11，
    // 证明这两条走的是不同分支而非同一个 fallback。
    const bigNode = { ...load, size: { width: 100, height: 100 } };
    expect(overlay(bigNode)).toBe("22");
    expect(overlay(bigNode, { miniature: true })).toBe("11");

    // clamp 下界：短边 20 → 6.8 被抬到 10
    const flatNode = { ...load, size: { width: 100, height: 20 } };
    expect(overlay(flatNode)).toBe("10");
  });
});

describe("DeviceGlyph 容器标签对齐", () => {
  // 行 200/201/207：align 三态 × verticalAlign 三态 → 标签 x/y 与 textAnchor。
  // 断言对象 = uprightText 输出的 <g transform="translate(x y)"> 与 <text text-anchor>。
  test("容器名称按 textAlign 三态横向、verticalAlign 三态纵向定位，text-anchor 同步", () => {
    const box = createDefaultNode("ac-vpp-box", { x: 0, y: 0 });
    // 容器 180×112；labelPad = min(12, min(180,112)/2-2 = 54) = 12；labelFontSize = 16
    const positioned = (textAlign: string, verticalAlign: string) => {
      const node = { ...box, params: { ...box.params, textAlign, verticalAlign } };
      const markup = renderGlyph(node);
      return {
        translate: markup.match(/<g transform="translate\((-?[\d.]+) (-?[\d.]+)\) matrix/)?.[0],
        anchor: markup.match(/<text[^>]*text-anchor="(\w+)"/)?.[1]
      };
    };

    // 默认态 left/top：x = -90+12 = -78，y = -56+12+8 = -36，anchor start
    expect(positioned("left", "top")).toEqual({
      translate: '<g transform="translate(-78 -36) matrix',
      anchor: "start"
    });
    // right/bottom：x = 90-12 = 78，y = 56-12-8 = 36，anchor end
    expect(positioned("right", "bottom")).toEqual({
      translate: '<g transform="translate(78 36) matrix',
      anchor: "end"
    });
    // 其它取值（center/middle）→ x=y=0，anchor middle
    expect(positioned("center", "middle")).toEqual({
      translate: '<g transform="translate(0 0) matrix',
      anchor: "middle"
    });

    // 三态互不相同：若实现塌成两态（如 center 也当 left），上面第三条会变红
    const anchors = ["left", "right", "center"].map((align) => positioned(align, "top").anchor);
    expect(new Set(anchors).size).toBe(3);
    const verticals = ["top", "bottom", "middle"].map((va) => positioned("left", va).translate);
    expect(new Set(verticals).size).toBe(3);
  });

  // 行 214/216：容器在 mode="text" 只回 label，且不回落到几何分支。
  // 断言对象 = 整个 svg 串：text 模式下必须没有 <rect>/data-container-box。
  test("容器 text 模式只输出名称文本，不画矩形框", () => {
    const box = createDefaultNode("ac-vpp-box", { x: 0, y: 0 });

    const textMode = renderGlyph(box, { mode: "text" });
    expect(textMode).not.toContain("<rect");
    expect(textMode).not.toContain("data-container-box");
    expect(textMode).toContain("虚拟电厂");
    expect(textMode).toContain('text-anchor="start"');

    // 对照：full 模式确实带矩形框 —— 否则 text 模式的 not.toContain 是恒绿
    const fullMode = renderGlyph(box);
    expect(fullMode).toContain("data-container-box");
    expect(fullMode).toContain("<rect");

    // geometry 模式（renderText=false）：有框、无文字标签
    const geometryMode = renderGlyph(box, { mode: "geometry" });
    expect(geometryMode).toContain("data-container-box");
    expect(geometryMode).not.toContain("虚拟电厂");
  });
});
