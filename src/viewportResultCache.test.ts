// 视口渲染结果缓存（LRU + token/owner 双重失效）。
//
// 缓存键是「视口四边 + 一次计算的 owner 列表 + 一个 token」。写错的后果分两种：
// 该失效时没失效 → 视口平移后复用旧批处理结果，节点不重绘；不该失效时失效 →
// 每帧重算，大画布直接掉帧。LRU 上限错了则是内存缓慢增长。
import { describe, expect, test } from "vitest";
import {
  resetViewportResultCache,
  viewportBoundsCacheKey,
  viewportResultCacheOwnersEqual,
  readViewportResultCache,
  writeViewportResultCache,
  VIEWPORT_RESULT_CACHE_LIMIT,
  type ViewportResultCache,
  type RenderViewportBounds
} from "./appExtracted/appCoreCanvasUtilities";

const newCache = <T>(): ViewportResultCache<T> => ({ ownerRefs: [], token: "", values: new Map() });

const bounds = (left: number, right: number, top: number, bottom: number): RenderViewportBounds =>
  ({ left, right, top, bottom });

describe("viewportBoundsCacheKey", () => {
  test("四边拼成稳定键", () => {
    expect(viewportBoundsCacheKey(bounds(0, 100, 10, 200))).toBe("0:100:10:200");
  });

  test("★ 键不做任何归一：亚像素差异算不同视口", () => {
    // 与 sameCanvasViewBox 的取整口径刻意不同 —— 缓存要精确命中，不容忍近似
    expect(viewportBoundsCacheKey(bounds(0.4, 100, 10, 200))).not.toBe(viewportBoundsCacheKey(bounds(0.6, 100, 10, 200)));
  });
});

describe("viewportResultCacheOwnersEqual：按引用逐项比", () => {
  const a = {};
  const b = {};

  test("长度不同 → 不等", () => {
    expect(viewportResultCacheOwnersEqual([a], [a, b])).toBe(false);
  });

  test("★ 顺序不同 → 不等（owner 列表是有序的，不是集合）", () => {
    expect(viewportResultCacheOwnersEqual([a, b], [b, a])).toBe(false);
  });

  test("逐项引用相同 → 等；结构相同但不同引用 → 不等", () => {
    expect(viewportResultCacheOwnersEqual([a, b], [a, b])).toBe(true);
    expect(viewportResultCacheOwnersEqual([{}], [{}])).toBe(false);
  });

  test("两个空列表相等", () => {
    expect(viewportResultCacheOwnersEqual([], [])).toBe(true);
  });
});

describe("readViewportResultCache：token 与 owner 双重失效", () => {
  test("token 与 owner 都相同时命中", () => {
    const cache = newCache<string>();
    const owner = {};
    resetViewportResultCache(cache, [owner], "t1");
    writeViewportResultCache(cache, "k", "v");
    expect(readViewportResultCache(cache, [owner], "t1", "k")).toBe("v");
  });

  test("★ token 用普通相等比较：空串与空串相等，裸缓存按有效处理", () => {
    // 新建缓存的 token / ownerRefs 都是空值，于是「读自己刚写的东西」会命中，
    // 而不是被判为一次全新计算。调用方靠第一次读到 null 来建立基线，
    // 所以这里如实记录：想强制失效必须换 token 或换 owner 引用。
    const cache = newCache<string>();
    writeViewportResultCache(cache, "k", "v");
    expect(readViewportResultCache(cache, [], "", "k")).toBe("v");
  });

  test("★ token 变化 → 清空整份缓存（不返回旧值）", () => {
    const cache = newCache<string>();
    const owner = {};
    writeViewportResultCache(cache, "k", "v");
    readViewportResultCache(cache, [owner], "t1", "k");
    // 手工把 token 对齐后再读，确认缓存确实存住了
    resetViewportResultCache(cache, [owner], "t1");
    writeViewportResultCache(cache, "k", "v");
    expect(readViewportResultCache(cache, [owner], "t1", "k")).toBe("v");
    expect(readViewportResultCache(cache, [owner], "t2", "k")).toBeNull();
  });

  test("★ owner 引用变化 → 同样整份失效", () => {
    const cache = newCache<string>();
    const owner = {};
    writeViewportResultCache(cache, "k", "v");
    resetViewportResultCache(cache, [owner], "t1");
    writeViewportResultCache(cache, "k", "v");
    expect(readViewportResultCache(cache, [owner], "t1", "k")).toBe("v");
    expect(readViewportResultCache(cache, [{}], "t1", "k")).toBeNull();
  });

  test("未命中返回 null（不是 undefined，便于 `?? fallback`）", () => {
    const cache = newCache<string>();
    expect(readViewportResultCache(cache, [], "t", "missing")).toBeNull();
  });
});

describe("writeViewportResultCache：LRU 淘汰", () => {
  test("★ 超出上限时淘汰最旧的，且保留插入顺序", () => {
    const cache = newCache<number>();
    for (const key of ["a", "b", "c"]) {
      writeViewportResultCache(cache, key, 1, 3);
    }
    writeViewportResultCache(cache, "d", 1, 3); // 挤掉 a
    expect([...cache.values.keys()]).toEqual(["b", "c", "d"]);
  });

  test("★ 重复写同一个 key 会把它挪到最新（不是原地保留旧位次）", () => {
    const cache = newCache<number>();
    writeViewportResultCache(cache, "a", 1, 2);
    writeViewportResultCache(cache, "b", 2, 2);
    writeViewportResultCache(cache, "a", 3, 2); // a 变成最新
    writeViewportResultCache(cache, "c", 4, 2); // 淘汰 b（最旧）
    expect([...cache.values.keys()]).toEqual(["a", "c"]);
    expect(cache.values.get("a")).toBe(3);
  });

  test("默认上限是 24 条", () => {
    expect(VIEWPORT_RESULT_CACHE_LIMIT).toBe(24);
    const cache = newCache<number>();
    for (let index = 0; index < 26; index += 1) {
      writeViewportResultCache(cache, `k${index}`, index);
    }
    expect(cache.values.size).toBe(24);
    expect(cache.values.has("k0")).toBe(false);
    expect(cache.values.has("k25")).toBe(true);
  });

  test("limit 传 0 时不写入任何值（不抛错）", () => {
    const cache = newCache<number>();
    writeViewportResultCache(cache, "k", 1, 0);
    expect(cache.values.size).toBe(0);
  });
});

describe("resetViewportResultCache", () => {
  test("清空 values 并换上新 owner 与 token", () => {
    const cache = newCache<number>();
    writeViewportResultCache(cache, "k", 1);
    const owner = {};
    resetViewportResultCache(cache, [owner], "t2");
    expect(cache.values.size).toBe(0);
    expect(cache.token).toBe("t2");
    expect(cache.ownerRefs).toEqual([owner]);
  });
});