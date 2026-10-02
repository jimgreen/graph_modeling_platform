// createStoredRouteDirtyIdsForMove：把「实时脏」换算成「已存路由脏」。
// 关键：已被缓存平移覆盖的边不算脏；但如果一条都不剩，仍要留一条种子边，
// 否则下游刷新时没有任何锚点、整批缓存都不会被重算。
import { describe, expect, test } from "vitest";

import { createStoredRouteDirtyIdsForMove } from "./appExtracted/appSelectionDragFactories";

const build = createStoredRouteDirtyIdsForMove({});

describe("createStoredRouteDirtyIdsForMove", () => {
  test("没有缓存平移时原样返回同一个集合", () => {
    const dirty = new Set(["e1"]);

    expect(build(dirty, new Set())).toBe(dirty);
  });

  test("剔除已被缓存平移覆盖的边", () => {
    const result = build(new Set(["e1", "e2"]), new Set(["e1"]));

    expect([...result]).toEqual(["e2"]);
  });

  test("全部被覆盖时留一条种子边", () => {
    const result = build(new Set(["e1"]), new Set(["e1"]));

    expect([...result]).toEqual(["e1"]);
  });

  test("种子边取缓存平移集合的第一个", () => {
    const result = build(new Set(), new Set(["b", "a"]));

    expect([...result]).toEqual(["b"]);
  });

  test("原集合为空且有缓存平移时也留种子边", () => {
    expect([...build(new Set(), new Set(["seed"]))]).toEqual(["seed"]);
  });

  test("两边都空时返回空集合", () => {
    expect(build(new Set(), new Set()).size).toBe(0);
  });

  test("不改动传入的两个集合", () => {
    const dirty = new Set(["e1"]);
    const patched = new Set(["e1"]);

    build(dirty, patched);

    expect([...dirty]).toEqual(["e1"]);
    expect([...patched]).toEqual(["e1"]);
  });
});
