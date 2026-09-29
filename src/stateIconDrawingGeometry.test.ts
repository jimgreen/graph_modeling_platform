// 状态图标绘制的**几何族**（设备定义编辑器里手绘状态图标）
//   src/appExtracted/appDeviceDefinitionFactories.tsx
//     clampStateIconDrawingPoint              把点夹到 240×160 的画板内
//     expandStateIconDrawingElementIds        选中项 → 展开到整组
//     stateIconDrawingElementBounds           单个元素的包围盒
//     stateIconDrawingSelectionBounds         多个元素的并集包围盒
//     stateIconDrawingPolylineElementFromPoints 折线归一为「中心 + 相对点」
//   src/stateIconDrawing.tsx
//     stateVisualFromDraftRow                 状态草稿行 → 预览用的 visual
//
// 判错的后果：状态图标画到画板外、拖选时选不全同组元素、选中框大小不对、
// 折线渲染位置偏移 —— 都只表现为编辑器里图标「看着不对」，**不报错**。
//
// ★ 其中折线的归一化是渲染链的关键：点被存成相对中心 ∈ [-0.5, 0.5] 的比例，
//   渲染时乘 width/height 再加中心。若归一化错了，图标在**任意缩放下**都错位。
import { describe, expect, test } from "vitest";
import {
  clampStateIconDrawingPoint,
  expandStateIconDrawingElementIds,
  stateIconDrawingElementBounds,
  stateIconDrawingPolylineElementFromPoints,
  stateIconDrawingSelectionBounds
} from "./appExtracted/appDeviceDefinitionFactories";
import { stateVisualFromDraftRow } from "./stateIconDrawing";
import type { Point } from "./model";

const P = (x: number, y: number): Point => ({ x, y });

// 画板尺寸：从 `clampStateIconDrawingPoint` 的夹取范围反推，写成常量便于断言
const BOARD_W = 240;
const BOARD_H = 160;
// 折线归一化后坐标的取值范围（中心 ± 半个尺寸）
const HALF = 0.5;

describe("clampStateIconDrawingPoint：夹到 240 × 160", () => {
  test("板内原样返回", () => {
    expect(clampStateIconDrawingPoint(P(0, 0))).toEqual({ x: 0, y: 0 });
    expect(clampStateIconDrawingPoint(P(120, 80))).toEqual({ x: 120, y: 80 });
    expect(clampStateIconDrawingPoint(P(0.5, 0.5))).toEqual({ x: 0.5, y: 0.5 });
    expect(clampStateIconDrawingPoint(P(239.9, 159.9))).toEqual({ x: 239.9, y: 159.9 });
  });

  test("越界被夹到边界（**不**吸附到整像素）", () => {
    expect(clampStateIconDrawingPoint(P(-1, -1))).toEqual({ x: 0, y: 0 });
    expect(clampStateIconDrawingPoint(P(241, 161))).toEqual({ x: 240, y: 160 });
    // 0.1 越界仍是 0.1 → 夹到 0 但不是「四舍五入」
    expect(clampStateIconDrawingPoint(P(240.1, 159.9))).toEqual({ x: 240, y: 159.9 });
    expect(clampStateIconDrawingPoint(P(-0.0001, 160.0001))).toEqual({ x: 0, y: 160 });
  });

  test("两个轴**独立**夹取", () => {
    expect(clampStateIconDrawingPoint(P(-50, 999))).toEqual({ x: 0, y: 160 });
    expect(clampStateIconDrawingPoint(P(999, -50))).toEqual({ x: 240, y: 0 });
  });

  test("板尺寸是常量，改了就改渲染画板", () => {
    // 夹取上限即画板尺寸 —— 这条把「240×160」从魔法数字变成可执行事实
    expect(clampStateIconDrawingPoint(P(BOARD_W + 1, 0)).x).toBe(BOARD_W);
    expect(clampStateIconDrawingPoint(P(0, BOARD_H + 1)).y).toBe(BOARD_H);
    expect(clampStateIconDrawingPoint(P(BOARD_W, BOARD_H))).toEqual({ x: BOARD_W, y: BOARD_H });
  });

  test("★ `±Infinity` 夹到边界（不是 NaN）", () => {
    expect(clampStateIconDrawingPoint(P(Infinity, Infinity))).toEqual({ x: 240, y: 160 });
    expect(clampStateIconDrawingPoint(P(-Infinity, -Infinity))).toEqual({ x: 0, y: 0 });
    expect(clampStateIconDrawingPoint(P(Infinity, -Infinity))).toEqual({ x: 240, y: 0 });
  });

  test("★ `NaN` 穿透（`Math.max(0, NaN)` = NaN）", () => {
    // `clampNumber` 是 `Math.max(min, Math.min(max, value))`，
    // 而 `Math.min(240, NaN)` = NaN、`Math.max(0, NaN)` = NaN。
    // ⇒ NaN 不被兜住，直接进结果。探针实测（JSON 里显示为 null）。
    expect(Number.isNaN(clampStateIconDrawingPoint(P(NaN, 0)).x)).toBe(true);
    expect(Number.isNaN(clampStateIconDrawingPoint(P(0, NaN)).y)).toBe(true);
    // 前提：JS 的 Math.max/min 对 NaN 的处理
    expect(Math.min(240, NaN)).toBeNaN();
    expect(Math.max(0, NaN)).toBeNaN();
    // ★ 一个轴 NaN **不影响**另一个轴
    const out = clampStateIconDrawingPoint(P(NaN, 80));
    expect(Number.isNaN(out.x)).toBe(true);
    expect(out.y, "★ y 轴正常").toBe(80);
  });

  test("★ 非数字坐标经 `Math.min/max` 隐式强转", () => {
    // `Math.min(240, "5")` = 5（数值强转）→ 数字 5，不是字符串
    expect(clampStateIconDrawingPoint(P("5" as never, "5" as never))).toEqual({ x: 5, y: 5 });
    // `undefined` → NaN → 穿透
    expect(Number.isNaN(clampStateIconDrawingPoint(P(undefined as never, 0)).x)).toBe(true);
  });

  test("★ 返回新对象，不改入参", () => {
    const p = P(-5, 999);
    const out = clampStateIconDrawingPoint(p);
    expect(out).not.toBe(p);
    expect(p, "★ 入参未被夹取").toEqual({ x: -5, y: 999 });
  });
});

describe("★ expandStateIconDrawingElementIds：选一个 → 带上整组", () => {
  const els = [
    { id: "a", groupId: "g1" },
    { id: "b", groupId: "g1" },
    { id: "c", groupId: "g2" },
    { id: "d" },
    { id: "e", groupId: "  " },
    { id: "f", groupId: "g3" },
    { id: "g", groupId: "g3" }
  ];
  const expand = (ids: string[], elements: unknown[] = els) =>
    expandStateIconDrawingElementIds(elements as never[], ids as never[]);

  test("选组内一个 → 整组都在", () => {
    expect(expand(["a"])).toEqual(["a", "b"]);
    expect(expand(["b"])).toEqual(["a", "b"]);
    expect(expand(["a", "b"])).toEqual(["a", "b"]);
  });

  test("跨组选择 → 各自整组", () => {
    expect(expand(["a", "d"])).toEqual(["a", "b", "d"]);
    expect(expand(["c", "a"])).toEqual(["a", "b", "c"]);
  });

  test("★ 未分组的元素只带自己", () => {
    expect(expand(["d"])).toEqual(["d"]);
    // groupId 是纯空白（`trim()` 后为空）→ 视为未分组
    expect(expand(["e"])).toEqual(["e"]);
  });

  test("★ 顺序按 `elements`，不按 `elementIds`", () => {
    // 探针实测：`["b","a"]` → `["a","b"]`。这是「按 elements 过滤」的自然结果。
    expect(expand(["b", "a"])).toEqual(["a", "b"]);
    expect(expand(["d", "a"])).toEqual(["a", "b", "d"]);
  });

  test("空选集 → `[]`（早返回，不遍历）", () => {
    expect(expand([])).toEqual([]);
    // falsy 的 id 被 `filter(Boolean)` 滤掉 → 选集空
    expect(expand(["" as never])).toEqual([]);
    expect(expand([null as never])).toEqual([]);
    expect(expand([undefined as never])).toEqual([]);
  });

  test("重复 id 不产生重复输出", () => {
    expect(expand(["a", "a", "a"])).toEqual(["a", "b"]);
  });

  test("★ 选不存在的 id → `[]`（不是原样返回 id）", () => {
    // 探针实测。因为走的是「遍历 elements 做 filter」，elements 里没有就是空。
    expect(expand(["zz"])).toEqual([]);
    expect(expand(["a", "zz"])).toEqual(["a", "b"]);
  });

  test("★ `elements` 为空 → **原样返回选集**（不校验存在性）", () => {
    // `if (elements.length === 0) return Array.from(selectedSet);`
    // 这是一个**不对称**：elements 非空时校验存在性，为空时校验不了就放行。
    // 探针实测 `([], ["a"])` → `["a"]`。
    expect(expand(["a"], [])).toEqual(["a"]);
    expect(expand(["a", "zz"], [])).toEqual(["a", "zz"]);
    // 仍会去重（走的是 Set）
    expect(expand(["a", "a"], [])).toEqual(["a"]);
    // falsy 仍在早返回之前被滤掉
    expect(expand(["" as never], [])).toEqual([]);
  });

  test("★ `groupId` 两边都 `trim()` 后才比", () => {
    const g = [
      { id: "x", groupId: "  gx  " },
      { id: "y", groupId: "  gx  " },
      { id: "y2", groupId: "gx" }
    ];
    // 选中 x（groupId 带空白）→ 同组三个全在（比较时 trim 过）
    expect(expandStateIconDrawingElementIds(g as never, ["x"] as never[])).toEqual(["x", "y", "y2"]);
    // 选中 y2（groupId 无空白）→ 同样带上全部
    expect(expandStateIconDrawingElementIds(g as never, ["y2"] as never[])).toEqual(["x", "y", "y2"]);
  });

  test("★ `groupId` 的 falsy 形态（0 / \"\" / undefined）→ 视为未分组", () => {
    // 判定是 `String(element.groupId ?? "").trim()` —— 空串为 falsy
    const g = [
      { id: "z", groupId: "" },
      { id: "w", groupId: 0 },
      { id: "u", groupId: undefined },
      { id: "n", groupId: null }
    ];
    for (const id of ["z", "w", "u", "n"]) {
      expect(expandStateIconDrawingElementIds(g as never, [id] as never[]), id).toEqual([id]);
    }
  });

  test("★ 数字 `groupId` 走 `String()` 强转，能成组", () => {
    const g = [
      { id: "p", groupId: 123 },
      { id: "q", groupId: "123" }
    ];
    // `String(123) === "123"` → 同组
    expect(expandStateIconDrawingElementIds(g as never, ["p"] as never[])).toEqual(["p", "q"]);
    expect(expandStateIconDrawingElementIds(g as never, ["q"] as never[])).toEqual(["p", "q"]);
  });

  test("不改入参", () => {
    const before = JSON.stringify(els);
    expand(["a"]);
    expect(JSON.stringify(els)).toBe(before);
  });

  test("返回新数组（不共享）", () => {
    expect(expand(["a"])).not.toBe(expand(["a"]));
    expect(expand(["a"])).toEqual(expand(["a"]));
  });

  test("不依赖调用顺序（无模块级状态）", () => {
    const once = expand(["a"]);
    for (let i = 0; i < 20; i += 1) {
      expect(expand(["a"])).toEqual(once);
    }
  });
});

describe("stateIconDrawingElementBounds：`Math.max(1, Number(w) || 1)`", () => {
  test("正常值：中心 ± 半宽", () => {
    expect(stateIconDrawingElementBounds({ x: 100, y: 50, width: 20, height: 10 })).toEqual({
      left: 90, right: 110, top: 45, bottom: 55,
      centerX: 100, centerY: 50, width: 20, height: 10
    });
  });

  test("★ 尺寸的 `|| 1` 兜底：0 / 负数 / NaN / 缺省 / 小于 1 → 都是 1×1", () => {
    const cases = [
      { x: 0, y: 0, width: 0, height: 0 },
      { x: 0, y: 0, width: -5, height: -5 },
      { x: 0, y: 0, width: NaN, height: NaN },
      { x: 0, y: 0 },
      { x: 0, y: 0, width: null, height: null },
      // ★ 0.4 < 1 但 `Number(0.4) || 1` = 0.4（truthy）→ 再被 `Math.max(1, 0.4)` 抬到 1
      { x: 0, y: 0, width: 0.4, height: 0.4 }
    ];
    for (const element of cases) {
      const b = stateIconDrawingElementBounds(element);
      expect(b.width, JSON.stringify(element)).toBe(1);
      expect(b.height).toBe(1);
      expect(b.left).toBe(element.x - 0.5);
      expect(b.right).toBe(element.x + 0.5);
    }
  });

  test("★ 返回结构恒含 8 个键", () => {
    const b = stateIconDrawingElementBounds({ x: 1, y: 2, width: 3, height: 4 });
    expect(Object.keys(b)).toEqual([
      "left", "right", "top", "bottom", "centerX", "centerY", "width", "height"
    ]);
  });

  test("★ 字符串坐标让 `left/right` 变成**字符串拼接**（不修）", () => {
    // `element.x - width / 2` 里 `width` 是数字 5 → `"10" - 2.5` = 7.5（数值）
    // 但 `element.x + width / 2` 里 `+` 是**字符串拼接** → `"10" + 2.5` = "102.5"
    // 探针实测：`{x:"10", y:"20", width:"5", height:"5"}` → left 7.5 但 right "102.5"。
    // **判定不修**：元素几何来自编辑器里的拖拽结果，恒为 number；
    // 字符串坐标说明上游数据损坏，静默 `Number()` 会掩盖它。
    const b = stateIconDrawingElementBounds({ x: "10", y: "20", width: "5", height: "5" } as never);
    expect(b.left, "★ 减法走数值强转").toBe(7.5);
    expect(b.right, "★ 加法走字符串拼接").toBe("102.5");
    expect(typeof b.right, "★ 类型不一致").toBe("string");
    expect(b.centerX, "★ 中心原样透出（不转）").toBe("10");
  });
});

describe("stateIconDrawingSelectionBounds：并集 + 中心", () => {
  test("空数组 → `null`（不是 0 盒）", () => {
    expect(stateIconDrawingSelectionBounds([])).toBeNull();
  });

  test("两个元素的并集", () => {
    const out = stateIconDrawingSelectionBounds([
      { x: 0, y: 0, width: 10, height: 10 },
      { x: 100, y: 40, width: 20, height: 20 }
    ]);
    expect(out).toEqual({
      left: -5, right: 110, top: -5, bottom: 50, centerX: 52.5, centerY: 22.5
    });
  });

  test("★ 返回结构是 6 个键（**不含** width/height）", () => {
    const out = stateIconDrawingSelectionBounds([{ x: 0, y: 0, width: 10, height: 10 }])!;
    expect(Object.keys(out)).toEqual(["left", "right", "top", "bottom", "centerX", "centerY"]);
    // 要宽高得自己减
    expect(out.right - out.left).toBe(10);
    expect(out.bottom - out.top).toBe(10);
  });

  test("单个元素 = 该元素的盒（中心即元素中心）", () => {
    const out = stateIconDrawingSelectionBounds([{ x: 100, y: 50, width: 20, height: 10 }])!;
    expect(out).toEqual({ left: 90, right: 110, top: 45, bottom: 55, centerX: 100, centerY: 50 });
  });

  test("★ NaN 坐标**只污染对应轴**", () => {
    // `Math.min(NaN, …)` 与 `Math.max(NaN, …)` 都给 NaN
    const out = stateIconDrawingSelectionBounds([{ id: "n", x: NaN, y: 0, width: 10, height: 10 }])!;
    expect(Number.isNaN(out.left), "★ left 被污染").toBe(true);
    expect(Number.isNaN(out.right)).toBe(true);
    expect(Number.isNaN(out.centerX)).toBe(true);
    // y 轴正常
    expect(out.top).toBe(-5);
    expect(out.bottom).toBe(5);
    expect(out.centerY).toBe(0);
    // 前提
    expect(Math.min(NaN, 5)).toBeNaN();
    expect(Math.max(NaN, 5)).toBeNaN();
  });

  test("零尺寸元素也被算进去（兜底成 1×1）", () => {
    const out = stateIconDrawingSelectionBounds([
      { x: 0, y: 0, width: 10, height: 10 },
      { x: 100, y: 0, width: 0, height: 0 }
    ])!;
    expect(out.right, "★ 零尺寸元素的右边界参与并集").toBe(100.5);
  });
});

describe("★ stateIconDrawingPolylineElementFromPoints：归一为「中心 + 相对点」", () => {
  const el = { id: "p", kind: "polyline", strokeColor: "#fff" };

  test("2 点：中心在包围盒中心，相对点 ±0.5", () => {
    const out = stateIconDrawingPolylineElementFromPoints(el, [P(0, 0), P(100, 50)]);
    expect(out).toMatchObject({
      x: 50, y: 25, width: 100, height: 50, rotation: 0
    });
    expect(out.points).toEqual([{ x: -0.5, y: -0.5 }, { x: 0.5, y: 0.5 }]);
  });

  test("★ 相对点恒在 [-0.5, 0.5]（跨各种形状）", () => {
    const cases: Array<[string, Point[]]> = [
      ["斜线", [P(0, 0), P(100, 50)]],
      ["水平", [P(0, 50), P(100, 50)]],
      ["垂直", [P(50, 0), P(50, 100)]],
      ["同点", [P(30, 30), P(30, 30)]],
      ["全同 x", [P(20, 0), P(20, 100)]],
      ["全同 y", [P(0, 20), P(100, 20)]],
      ["反向", [P(100, 50), P(0, 0)]],
      ["含板外", [P(-50, -50), P(300, 200)]]
    ];
    for (const [label, points] of cases) {
      const out = stateIconDrawingPolylineElementFromPoints(el, points);
      for (const p of out.points!) {
        expect(p.x, `${label} x`).toBeGreaterThanOrEqual(-HALF);
        expect(p.x, `${label} x`).toBeLessThanOrEqual(HALF);
        expect(p.y, `${label} y`).toBeGreaterThanOrEqual(-HALF);
        expect(p.y, `${label} y`).toBeLessThanOrEqual(HALF);
      }
    }
  });

  test("★ 先夹取到画板内，再算包围盒", () => {
    // [-50,-50] → [0,0]；[300,200] → [240,160] ⇒ 宽 240 高 160
    const out = stateIconDrawingPolylineElementFromPoints(el, [P(-50, -50), P(300, 200)]);
    expect(out).toMatchObject({ x: 120, y: 80, width: BOARD_W, height: BOARD_H });
    expect(out.points).toEqual([{ x: -0.5, y: -0.5 }, { x: 0.5, y: 0.5 }]);
  });

  test("0 点 → 兜底成板心的 1×1 折线", () => {
    const out = stateIconDrawingPolylineElementFromPoints(el, []);
    expect(out).toMatchObject({ x: 120.5, y: 80.5, width: 1, height: 1, rotation: 0 });
    expect(out.points).toEqual([{ x: -0.5, y: -0.5 }, { x: -0.5, y: -0.5 }]);
    // 兜底点写死是 (120, 80) —— 板心，与 240×160 板一致
    expect(out.x - HALF).toBe(BOARD_W / 2);
    expect(out.y - HALF).toBe(BOARD_H / 2);
  });

  test("★ 1 点 → 复制成两个**相同**的点（宽高兜底 1）", () => {
    const out = stateIconDrawingPolylineElementFromPoints(el, [P(10, 10)]);
    expect(out).toMatchObject({ x: 10.5, y: 10.5, width: 1, height: 1 });
    expect(out.points).toEqual([{ x: -0.5, y: -0.5 }, { x: -0.5, y: -0.5 }]);
    // 点数恒 ≥ 2（渲染器要至少两点才能画线）
    expect(out.points).toHaveLength(2);
  });

  test("0 点与 1 点的兜底**结构相同**，只是位置不同", () => {
    const zero = stateIconDrawingPolylineElementFromPoints(el, []);
    const one = stateIconDrawingPolylineElementFromPoints(el, [P(10, 10)]);
    expect(zero.points).toEqual(one.points);
    expect(zero.width).toBe(one.width);
    expect(zero.x, "★ 只有位置不同").not.toBe(one.x);
  });

  test("★ 退化线（宽或高为 0）被 `Math.max(1, …)` 抬到 1，**中心随之偏移 0.5**", () => {
    // 水平线：top = bottom = 50 → height = max(1, 0) = 1
    //   → center.y = top + height/2 = 50 + 0.5 = **50.5**（不是 50！）
    // 我第一版写「中心仍是 50」，被顶回。抬高的那 1px 落在**下边**，
    // 所以线画在盒内偏上 0.5px —— 视觉上几乎看不出，但断言必须对上。
    const horizontal = stateIconDrawingPolylineElementFromPoints(el, [P(0, 50), P(100, 50)]);
    expect(horizontal.height, "★ 水平线高 0 → 1").toBe(1);
    expect(horizontal.y, "★ 中心是 top + height/2，被抬高 0.5").toBe(50.5);
    expect(horizontal.y - HALF, "★ 盒顶仍是 50").toBe(50);
    // 垂直线同理，x 被抬到 50.5
    const vertical = stateIconDrawingPolylineElementFromPoints(el, [P(50, 0), P(50, 100)]);
    expect(vertical.width).toBe(1);
    expect(vertical.x, "★ 同理偏 0.5").toBe(50.5);
    // 相对点仍能还原（因为偏移与尺寸同步）
    const restored = (horizontal.points as Point[]).map((p) => ({ x: p.x * horizontal.width + horizontal.x, y: p.y * horizontal.height + horizontal.y }));
    expect(restored[0].y, "★ 还原回原坐标 50").toBe(50);
  });

  test("★ `rotation` 被强制为 0（折线不参与旋转）", () => {
    const out = stateIconDrawingPolylineElementFromPoints({ ...el, rotation: 45 }, [P(0, 0), P(10, 10)]);
    expect(out.rotation).toBe(0);
    // 入参被展开进结果（保留 id / kind / strokeColor 等）
    expect(out.id).toBe("p");
    expect(out.kind).toBe("polyline");
    expect(out.strokeColor).toBe("#fff");
  });

  test("★ 不改入参（原 elements 的 points 数组不被覆写）", () => {
    const input = { id: "p", kind: "polyline", points: [{ x: 999, y: 999 }] };
    const snapshot = JSON.stringify(input);
    stateIconDrawingPolylineElementFromPoints(input, [P(0, 0), P(10, 10)]);
    expect(JSON.stringify(input), "★ 入参不变").toBe(snapshot);
  });

  test("★ NaN 只污染**所在轴**（`[NaN,0]` + `[10,10]`）", () => {
    // 探针实测：x 侧全 NaN，而 y 侧完全正常（y = 5、height = 10）。
    // 我第一版以为两轴都 NaN（因为 `Math.min` 播种了 NaN），被顶回 ——
    // 实际是**按轴**独立计算的：x 用 [NaN,10]、y 用 [0,10]。
    // 这与本会话早前记录的 `routeRenderBounds` 的按轴污染是同一形状。
    const out = stateIconDrawingPolylineElementFromPoints(el, [P(NaN, 0), P(10, 10)]);
    expect(Number.isNaN(out.x), "★ 中心 x NaN").toBe(true);
    expect(Number.isNaN(out.width), "★ 宽 NaN（Math.max(1,NaN)=NaN）").toBe(true);
    expect(Number.isNaN(out.points![0].x)).toBe(true);
    // ★ y 轴不受影响
    expect(out.y, "★ y 正常").toBe(5);
    expect(out.height, "★ 高正常").toBe(10);
    expect(out.points![0].y).toBe(-0.5);
    expect(out.points![1].y).toBe(0.5);
    // 前提
    expect(Math.max(1, NaN)).toBeNaN();
    expect(Math.min(NaN, 10)).toBeNaN();
    expect(Math.max(NaN, 10)).toBeNaN();
    // 点数仍是 2 —— 结构完整，只是 x 侧数值全 NaN
    expect(out.points).toHaveLength(2);
  });

  test("同一组点恒得同一结果（无模块级状态）", () => {
    const points = [P(0, 0), P(100, 50)];
    const once = stateIconDrawingPolylineElementFromPoints(el, points);
    for (let i = 0; i < 20; i += 1) {
      expect(stateIconDrawingPolylineElementFromPoints(el, points)).toEqual(once);
    }
  });

  test("★ 归一化的可逆性：`中心 ± 相对点 × 尺寸` 还原出原坐标", () => {
    // 这是渲染链的契约：相对点 × width/height + 中心 必须还原被夹取后的绝对点
    const absolute = [P(10, 20), P(200, 120)];
    const out = stateIconDrawingPolylineElementFromPoints(el, absolute);
    const restored = (out.points as Point[]).map((p: Point) => ({
      x: p.x * out.width + out.x,
      y: p.y * out.height + out.y
    }));
    expect(restored).toEqual(absolute);
  });
});

describe("stateVisualFromDraftRow：只保留 value / name / 少量图字段", () => {
  test("nullish / 空对象 → `null`", () => {
    expect(stateVisualFromDraftRow(undefined)).toBeNull();
    expect(stateVisualFromDraftRow(null)).toBeNull();
    // `{}` → value 归一后为空 → 被丢弃 → 无状态 → null
    expect(stateVisualFromDraftRow({} as never)).toBeNull();
  });

  test("★ 只有 value / name（`id` 被丢弃）", () => {
    const out = stateVisualFromDraftRow({ id: "r1", value: "1", name: "闭合" } as never);
    expect(out).toEqual({ value: "1", name: "闭合" });
    expect(Object.keys(out!), "★ 只有两个键").toEqual(["value", "name"]);
  });

  test("★ value 为空 → `null`（`normalizeDeviceStateValue` 兜底为空）", () => {
    expect(stateVisualFromDraftRow({ id: "", value: "", name: "" } as never)).toBeNull();
    expect(stateVisualFromDraftRow({ value: "   ", name: "x" } as never)).toBeNull();
  });

  test("name 为空时回落成 value", () => {
    expect(stateVisualFromDraftRow({ value: "0", name: "" } as never)).toEqual({ value: "0", name: "0" });
    expect(stateVisualFromDraftRow({ value: "0", name: "   " } as never)).toEqual({ value: "0", name: "0" });
  });

  test("value 走 `String(value ?? \"\").trim()`", () => {
    expect(stateVisualFromDraftRow({ value: 1, name: "闭合" } as never)).toEqual({ value: "1", name: "闭合" });
    expect(stateVisualFromDraftRow({ value: 0, name: "断开" } as never)).toEqual({ value: "0", name: "断开" });
    // ★ 没有布尔→数字的映射：`false` → `"false"`（不是 "0"）
    // 我第一版以为 `false` 归一成 "0"，被顶回。
    expect(stateVisualFromDraftRow({ value: false, name: "x" } as never)!.value).toBe("false");
    // `null` / `undefined` → `""` → 被丢弃 → null
    expect(stateVisualFromDraftRow({ value: null, name: "x" } as never)).toBeNull();
    expect(stateVisualFromDraftRow({ value: undefined, name: "x" } as never)).toBeNull();
    // trim 生效
    expect(stateVisualFromDraftRow({ value: "  1  ", name: "闭合" } as never)!.value).toBe("1");
    // 对象走 String → "[object Object]"（非空 → 保留）
    expect(stateVisualFromDraftRow({ value: { a: 1 }, name: "x" } as never)!.value).toBe("[object Object]");
  });

  test("图相关字段非空时才带上（trim 后）", () => {
    const out = stateVisualFromDraftRow({
      value: "1", name: "闭合",
      icon: "  ico  ", image: " data:img ", text: "  T  ", color: " #f00 ",
      imageAssetId: "", fillColor: "   "
    } as never)!;
    expect(out.value).toBe("1");
    expect(out.icon, "★ trim 后保留").toBe("ico");
    expect(out.image).toBe("data:img");
    expect(out.text).toBe("T");
    expect(out.color).toBe("#f00");
    expect(out, "★ 空串字段不带").not.toHaveProperty("imageAssetId");
    expect(out, "★ 纯空白字段不带").not.toHaveProperty("fillColor");
  });

  test("只取第一行（`const [state] = …`）", () => {
    // 入参是单个 row，不是数组；这里确认它不是「批量」接口
    const out = stateVisualFromDraftRow({ value: "1", name: "a" } as never);
    expect(out).not.toBeInstanceOf(Array);
  });
});
