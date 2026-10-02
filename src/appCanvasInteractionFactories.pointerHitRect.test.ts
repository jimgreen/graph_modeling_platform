// 指针命中判定：① 按选择器命中（走 document.elementFromPoint）；
// ② 按矩形命中（走 getBoundingClientRect，可带 padding）。
// 两者都是「边缘算命中」——正好落在边界上算在内。
import { afterEach, describe, expect, test, vi } from "vitest";

import {
  createPointerClientTargetInside,
  createPointerInsideElementRect
} from "./appExtracted/appCanvasInteractionFactories";

const event = (clientX: number, clientY: number) => ({ clientX, clientY }) as any;

/** node 环境没有 Element，用一个带 closest 的类冒充。 */
class FakeElement {
  constructor(private readonly matched: boolean) {}
  closest() {
    return this.matched ? ({ tagName: "HIT" } as any) : null;
  }
}

function stubDocument(target: unknown) {
  const doc: any = { elementFromPoint: vi.fn(() => target) };
  vi.stubGlobal("document", doc);
  (globalThis as any).Element = FakeElement;
  return doc;
}

const rectElement = (rect: { left: number; top: number; right: number; bottom: number }) => ({
  getBoundingClientRect: () => rect
});

describe("createPointerClientTargetInside", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete (globalThis as any).Element;
  });

  test("命中的元素匹配选择器时为真", () => {
    stubDocument(new FakeElement(true));

    expect(createPointerClientTargetInside({})(event(10, 10), ".panel")).toBe(true);
  });

  test("元素存在但不匹配选择器时为假", () => {
    stubDocument(new FakeElement(false));

    expect(createPointerClientTargetInside({})(event(10, 10), ".panel")).toBe(false);
  });

  test("该点没有任何元素时为假", () => {
    stubDocument(null);

    expect(createPointerClientTargetInside({})(event(10, 10), ".panel")).toBe(false);
  });

  test("返回的不是 Element 时为假（不靠 .closest 抛错）", () => {
    stubDocument({ nodeType: 3 });

    expect(createPointerClientTargetInside({})(event(10, 10), ".panel")).toBe(false);
  });

  test("按指针坐标查询元素", () => {
    const doc = stubDocument(new FakeElement(true));

    createPointerClientTargetInside({})(event(33, 44), ".panel");

    expect(doc.elementFromPoint).toHaveBeenCalledWith(33, 44);
  });
});

describe("createPointerInsideElementRect", () => {
  const rect = { left: 10, top: 20, right: 110, bottom: 70 };
  const inside = createPointerInsideElementRect({});

  test("元素为 null 时为假", () => {
    expect(inside(event(50, 50), null)).toBe(false);
  });

  test("矩形内部为真", () => {
    expect(inside(event(50, 40), rectElement(rect) as any)).toBe(true);
  });

  test("正好落在边界上算命中", () => {
    expect(inside(event(10, 20), rectElement(rect) as any)).toBe(true);
    expect(inside(event(110, 70), rectElement(rect) as any)).toBe(true);
  });

  test("刚越出边界即不命中", () => {
    expect(inside(event(9, 40), rectElement(rect) as any)).toBe(false);
    expect(inside(event(111, 40), rectElement(rect) as any)).toBe(false);
    expect(inside(event(50, 19), rectElement(rect) as any)).toBe(false);
    expect(inside(event(50, 71), rectElement(rect) as any)).toBe(false);
  });

  test("padding 向四周外扩命中范围", () => {
    expect(inside(event(115, 40), rectElement(rect) as any)).toBe(false);
    expect(inside(event(115, 40), rectElement(rect) as any, 10)).toBe(true);
  });

  test("padding 为 0 与不传等价", () => {
    expect(inside(event(115, 40), rectElement(rect) as any, 0)).toBe(false);
  });

  test("padding 同时作用于四个方向", () => {
    const element = rectElement(rect);
    const padded = createPointerInsideElementRect({});

    // 左下各越出 5px
    expect(padded(event(5, 75), element as any, 10)).toBe(true);
    // 右上各越出 5px
    expect(padded(event(115, 15), element as any, 10)).toBe(true);
  });
});
