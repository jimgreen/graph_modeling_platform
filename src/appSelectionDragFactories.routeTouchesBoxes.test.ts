// createRouteTouchesExpandedBoxes：路径折线是否扫到给定的若干矩形（用于避免连线穿过不该穿的对象）。
// 两个前提守卫最容易被去掉：点少于 2 个（没有线段）、框为空（没东西可撞）。
import { describe, expect, test, vi } from "vitest";

import { createRouteTouchesExpandedBoxes } from "./appExtracted/appSelectionDragFactories";

const pt = (x: number, y: number) => ({ x, y });
const box = (left: number, top: number, right: number, bottom: number) => ({ left, top, right, bottom });

/** 相交判定（含边界接触）。 */
const boxesOverlap = (a: any, b: any) => !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom);

describe("createRouteTouchesExpandedBoxes", () => {
  const touches = createRouteTouchesExpandedBoxes({ boxesOverlap });

  test("点少于 2 个时为假", () => {
    expect(touches([], [box(0, 0, 10, 10)])).toBe(false);
    expect(touches([pt(5, 5)], [box(0, 0, 10, 10)])).toBe(false);
  });

  test("没有框时为假", () => {
    expect(touches([pt(0, 0), pt(10, 10)], [])).toBe(false);
  });

  test("线段穿过框时为真", () => {
    expect(touches([pt(0, 5), pt(20, 5)], [box(8, 0, 12, 10)])).toBe(true);
  });

  test("线段绕开框时为假", () => {
    expect(touches([pt(0, 50), pt(20, 50)], [box(8, 0, 12, 10)])).toBe(false);
  });

  test("多段折线里任一段碰到即为真", () => {
    expect(touches([pt(0, 0), pt(50, 0), pt(50, 50)], [box(45, 45, 55, 55)])).toBe(true);
  });

  test("只看相邻两点构成的线段，不跨段连线", () => {
    // 首尾连线会穿过框，但没有任何一段真的穿过
    expect(touches([pt(0, 0), pt(100, 0), pt(100, 100)], [box(45, 20, 55, 80)])).toBe(false);
  });

  test("反向线段（x 递减）同样能判", () => {
    expect(touches([pt(20, 5), pt(0, 5)], [box(8, 0, 12, 10)])).toBe(true);
  });

  test("多个框里任一命中即为真", () => {
    expect(touches([pt(0, 5), pt(20, 5)], [box(100, 100, 110, 110), box(8, 0, 12, 10)])).toBe(true);
  });

  test("起点本身落在框里也算（第一段从框内出发）", () => {
    expect(touches([pt(5, 5), pt(50, 50)], [box(0, 0, 10, 10)])).toBe(true);
  });

  test("全部点重合时只看退化线段", () => {
    expect(touches([pt(5, 5), pt(5, 5)], [box(0, 0, 10, 10)])).toBe(true);
    expect(touches([pt(5, 5), pt(5, 5)], [box(20, 20, 30, 30)])).toBe(false);
  });
});
