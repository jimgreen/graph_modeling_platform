// 连线颜色缓存：nodeById 引用或 token 变化就整表失效；同一条边对象复用命中缓存。
// 「边对象被替换但 id 不变」必须重算，否则颜色会停在旧值上。
import { describe, expect, test, vi } from "vitest";

import {
  createCachedConnectionStrokeColor,
  createConnectionLineStyle
} from "./appExtracted/appGraphMeasurementFactories";

const edge = (id: string) => ({ id, sourceId: "a", targetId: "b" });

function createScope() {
  const nodeById = new Map([["a", { id: "a" }]]);
  const getConnectionStrokeColor = vi.fn((e: any) => `#${e.id}`);
  const scope: Record<string, any> = {
    nodeById,
    colorDisplayMode: "voltage",
    colorPalette: {},
    connectionStrokeColorCacheToken: 1,
    connectionStrokeColorCacheRef: { current: { nodeById: null, token: null, colors: new Map() } },
    getConnectionStrokeColor
  };
  scope.cachedConnectionStrokeColor = createCachedConnectionStrokeColor(scope);
  return { scope, getConnectionStrokeColor };
}

describe("createCachedConnectionStrokeColor", () => {
  test("首次计算并写入缓存", () => {
    const { scope, getConnectionStrokeColor } = createScope();
    const e = edge("e1");

    expect(scope.cachedConnectionStrokeColor(e)).toBe("#e1");
    expect(getConnectionStrokeColor).toHaveBeenCalledTimes(1);
  });

  test("同一个边对象重复查询命中缓存，不再调底层计算", () => {
    const { scope, getConnectionStrokeColor } = createScope();
    const e = edge("e1");

    scope.cachedConnectionStrokeColor(e);
    scope.cachedConnectionStrokeColor(e);

    expect(getConnectionStrokeColor).toHaveBeenCalledTimes(1);
  });

  test("同 id 但换了边对象 → 视为失效并重算", () => {
    const { scope, getConnectionStrokeColor } = createScope();

    scope.cachedConnectionStrokeColor(edge("e1"));
    scope.cachedConnectionStrokeColor(edge("e1"));

    expect(getConnectionStrokeColor).toHaveBeenCalledTimes(2);
  });

  test("nodeById 引用变化 → 整表清空", () => {
    const { scope, getConnectionStrokeColor } = createScope();
    const e = edge("e1");
    scope.cachedConnectionStrokeColor(e);

    scope.nodeById = new Map([["a", { id: "a", v: 2 }]]);
    scope.cachedConnectionStrokeColor(e);

    expect(getConnectionStrokeColor).toHaveBeenCalledTimes(2);
    expect(scope.connectionStrokeColorCacheRef.current.colors.size).toBe(1);
  });

  test("cache token 变化 → 整表清空", () => {
    const { scope, getConnectionStrokeColor } = createScope();
    const e = edge("e1");
    scope.cachedConnectionStrokeColor(e);

    scope.connectionStrokeColorCacheToken = 2;
    scope.cachedConnectionStrokeColor(e);

    expect(getConnectionStrokeColor).toHaveBeenCalledTimes(2);
  });
});

describe("createConnectionLineStyle", () => {
  test("边存在时返回 CSS 变量对象", () => {
    const { scope } = createScope();
    const e = edge("e1");
    const style = createConnectionLineStyle({
      edgeById: new Map([["e1", e]]),
      cachedConnectionStrokeColor: scope.cachedConnectionStrokeColor
    })("e1");

    expect(style).toEqual({ "--connection-color": "#e1" });
  });

  test("边不存在时返回 undefined 而不是空对象", () => {
    const { scope } = createScope();

    expect(
      createConnectionLineStyle({ edgeById: new Map(), cachedConnectionStrokeColor: scope.cachedConnectionStrokeColor })("缺失")
    ).toBeUndefined();
  });
});
