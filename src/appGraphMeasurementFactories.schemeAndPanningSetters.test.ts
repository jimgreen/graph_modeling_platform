// createSetSchemes / createUpdateSmartAlignmentGuides / createSetCanvasPanning 的契约。
// 三个都是「ref 与 state 同时写」或「按签名去重」的薄封装，本测试锁住去重与双写这两条容易退化的行为。
import { describe, expect, test, vi } from "vitest";

import {
  createSetCanvasPanning,
  createSetSchemes,
  createUpdateSmartAlignmentGuides
} from "./appExtracted/appGraphMeasurementFactories";

describe("createSetSchemes", () => {
  test("值与函数式更新都原样透传给 setSchemesState", () => {
    const setSchemesState = vi.fn();
    const list = [{ id: "s1" }];

    createSetSchemes({ setSchemesState })(list);
    createSetSchemes({ setSchemesState })((current: any) => [...current, { id: "s2" }]);

    expect(setSchemesState).toHaveBeenNthCalledWith(1, list);
    // 函数式更新由 React 自己求值，工厂不插手
    expect(typeof setSchemesState.mock.calls[1][0]).toBe("function");
  });
});

describe("createUpdateSmartAlignmentGuides", () => {
  /** 签名函数只取每条 guide 的 x/y 拼串，与实现里用的一致即可（本测试不锁签名算法本身）。 */
  const signature = (guides: any[]) => JSON.stringify((guides ?? []).map((g) => [g.x, g.y]));

  function scope(current: any[]) {
    const setSmartAlignmentGuides = vi.fn();
    return {
      setSmartAlignmentGuides,
      smartAlignmentGuidesRef: { current },
      smartAlignmentGuideSignature: signature,
      scope: { setSmartAlignmentGuides, smartAlignmentGuidesRef: { current }, smartAlignmentGuideSignature: signature }
    };
  }

  test("签名变化时才写 state 并同步 ref", () => {
    const h = scope([{ x: 1, y: 1 }]);
    const next = [{ x: 2, y: 2 }];

    createUpdateSmartAlignmentGuides(h.scope)(next);

    expect(h.setSmartAlignmentGuides).toHaveBeenCalledWith(next);
    expect(h.scope.smartAlignmentGuidesRef.current).toBe(next);
  });

  test("签名相同则整段短路，ref 保持原引用", () => {
    const current = [{ x: 1, y: 1 }];
    const h = scope(current);

    createUpdateSmartAlignmentGuides(h.scope)([{ x: 1, y: 1 }]);

    expect(h.setSmartAlignmentGuides).not.toHaveBeenCalled();
    expect(h.scope.smartAlignmentGuidesRef.current).toBe(current);
  });
});

describe("createSetCanvasPanning", () => {
  test("panningRef 与 setPanning 同步写入同一个对象", () => {
    const setPanning = vi.fn();
    const panningRef: { current: any } = { current: null };
    const next = { x: 10, y: 20 };

    createSetCanvasPanning({ panningRef, setPanning })(next);

    expect(panningRef.current).toBe(next);
    expect(setPanning).toHaveBeenCalledWith(next);
  });
});
