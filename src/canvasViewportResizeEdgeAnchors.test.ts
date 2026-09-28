// canvasResizeEdgeAnchorsStart 的直接单测（此前 10 处生产调用、零测试直呼）。
//
// ## 它决定什么
//
// 画布按边/角拖拽改变尺寸时，**哪一轴的起点需要保持不动**。
// 判错的后果是拖左边框时画面跟着抖、或者拖右上角时整个画布平移 ——
// 纯交互层问题，**不报错、不抛异常**，只是手感坏掉。
//
// ## 探针实测出的规律（全部 8 个 edge × 2 个 axis，无一例外）
//
//   x 轴锚定起点 ⟺ edge 名里含 "left"
//   y 轴锚定起点 ⟺ edge 名里含 "top"
//
// 这条规律正是实现的**意图**（`edge` 是 `CanvasResizeEdge` 联合类型的字面量），
// 所以测试不只钉 16 个具体值，还用规律做一遍全量交叉验证 ——
// 这样将来**新增一个 edge 联合类型成员**时，行为与规律不符会立刻暴露。
import { describe, expect, test } from "vitest";
import { canvasResizeEdgeAnchorsStart, type CanvasResizeEdge } from "./canvasViewport";

/** `CanvasResizeEdge` 联合类型的全部 8 个取值（`canvasViewport.ts:5`）。 */
const ALL_EDGES: readonly CanvasResizeEdge[] = [
  "right", "bottom", "corner", "left", "top", "top-left", "top-right", "bottom-left"
];

describe("完整真值表：8 个 edge × 2 个 axis", () => {
  const expected: Record<CanvasResizeEdge, [boolean, boolean]> = {
    // edge            x      y
    right: [false, false],
    bottom: [false, false],
    corner: [false, false],
    left: [true, false],
    top: [false, true],
    "top-left": [true, true],
    "top-right": [false, true],
    "bottom-left": [true, false]
  };

  for (const edge of ALL_EDGES) {
    const [x, y] = expected[edge];
    test(`${edge.padEnd(12)} → x=${x} y=${y}`, () => {
      expect(canvasResizeEdgeAnchorsStart(edge, "x"), `${edge}.x`).toBe(x);
      expect(canvasResizeEdgeAnchorsStart(edge, "y"), `${edge}.y`).toBe(y);
    });
  }

  test("表已覆盖全部 8 个 edge（防止联合类型新增成员后忘了加进期望表）", () => {
    expect(ALL_EDGES.length).toBe(8);
    expect(Object.keys(expected).sort()).toEqual([...ALL_EDGES].sort());
  });
});

describe("规律交叉验证：x 锚定 ⟺ 含 left，y 锚定 ⟺ 含 top", () => {
  // 这组比逐个钉值更强：它把「实现的意图」写成可执行断言。
  // 新增 edge 成员时，只要命名遵循既有约定就自动正确；不遵循则立刻暴露。
  for (const edge of ALL_EDGES) {
    test(`${edge.padEnd(12)} 符合命名规律`, () => {
      expect(canvasResizeEdgeAnchorsStart(edge, "x"), `${edge} 与 "含 left"`).toBe(edge.includes("left"));
      expect(canvasResizeEdgeAnchorsStart(edge, "y"), `${edge} 与 "含 top"`).toBe(edge.includes("top"));
    });
  }

  test("规律对全部 8 个 edge 同时成立（一条断言覆盖全表）", () => {
    const mismatches = ALL_EDGES.filter(
      (edge) =>
        canvasResizeEdgeAnchorsStart(edge, "x") !== edge.includes("left") ||
        canvasResizeEdgeAnchorsStart(edge, "y") !== edge.includes("top")
    );
    expect(mismatches).toEqual([]);
  });
});

describe("★ corner：两个轴都**不**锚定起点", () => {
  // corner 同时改变两轴，锚定任一轴的起点都不对（会得到互相矛盾的约束），
  // 所以两个都返回 false。这是刻意设计，不是遗漏。
  test("corner 在两个轴上都 false", () => {
    expect(canvasResizeEdgeAnchorsStart("corner", "x")).toBe(false);
    expect(canvasResizeEdgeAnchorsStart("corner", "y")).toBe(false);
  });

  test("corner 不符合「含 left / 含 top」但仍正确 —— 显式记录该例外", () => {
    // 上面的规律测试已覆盖；这里把"例外"单独点出来，避免后人以为 corner 是漏判。
    expect("corner".includes("left")).toBe(false);
    expect("corner".includes("top")).toBe(false);
    expect(canvasResizeEdgeAnchorsStart("corner", "x")).toBe("corner".includes("left"));
  });
});

describe("非合法输入：全部安全落到 false（不抛异常）", () => {
  // 判据用 `===` 精确匹配，非法值自然全 false。这保证外部数据
  // （如从 DOM dataset 读到的 edge 字符串）不会让拖拽逻辑崩掉。
  const bad: string[] = ["", "LEFT", "Left", "top_left", "bottom-right", "middle", "corner-top", "left ", " left"];

  for (const value of bad) {
    test(`${JSON.stringify(value).padEnd(16)} → x=false y=false`, () => {
      expect(canvasResizeEdgeAnchorsStart(value as never, "x"), value).toBe(false);
      expect(canvasResizeEdgeAnchorsStart(value as never, "y"), value).toBe(false);
    });
  }

  test("**大小写与下划线变体都不命中**（edge 名是字面量，不做归一化）", () => {
    // `left` 命中而 `Left` / `LEFT` / `left ` 不命中 —— 这条容易被"顺手"
    // 加一个 toLowerCase()/trim() 而改变行为，故显式钉住。
    expect(canvasResizeEdgeAnchorsStart("left", "x")).toBe(true);
    for (const variant of ["Left", "LEFT", "left ", " left", "top_left"]) {
      expect(canvasResizeEdgeAnchorsStart(variant as never, "x"), variant).toBe(false);
    }
  });
});

describe("非法 axis：走 y 分支（非 x 即 y）", () => {
  // 实现是 `axis === "x" ? ... : ...`，所以任何非 "x" 的值都走 y 分支。
  // 这是三元的固有性质，如实记录 —— 万一日后有人改成白名单判断，此条会转红提醒。
  test("axis=\"z\" 与 axis=undefined 都走 y 分支", () => {
    expect(canvasResizeEdgeAnchorsStart("top", "z" as never)).toBe(true);   // 同 top/y
    expect(canvasResizeEdgeAnchorsStart("top", undefined as never)).toBe(true);
    expect(canvasResizeEdgeAnchorsStart("left", "z" as never)).toBe(false); // 同 left/y
  });
});

describe("返回值恒为布尔（非真值陷阱）", () => {
  test("全部 8×2 组合返回真正的 boolean", () => {
    for (const edge of ALL_EDGES) {
      for (const axis of ["x", "y"] as const) {
        const out = canvasResizeEdgeAnchorsStart(edge, axis);
        expect(typeof out, `${edge}.${axis}`).toBe("boolean");
      }
    }
  });
});
