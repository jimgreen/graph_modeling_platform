import { describe, expect, test, vi } from "vitest";
import {
  createLiveScopeProxy,
  ensureStableFactoryStore,
  getOrCreateStableFactory,
  type StableFactoryStore
} from "./stableScopeFactoryCache";

describe("stableScopeFactoryCache", () => {
  test("纯延迟工厂跨多帧只创建一次，返回同一引用且总是读取最新 scope 状态", () => {
    const scopeRef = { current: { count: 1, tag: "v1" } };
    const storeRef: { current: StableFactoryStore | null } = { current: null };
    const factory = vi.fn((scope: Record<string, any>) => () => `${scope.tag}:${scope.count}`);

    const store1 = ensureStableFactoryStore(storeRef, scopeRef);
    const fn1 = getOrCreateStableFactory(store1, "demo", factory);
    expect(fn1()).toBe("v1:1");

    // 模拟后续帧 App 重建了新的 __appScope 对象
    scopeRef.current = { count: 99, tag: "v2" };
    const store2 = ensureStableFactoryStore(storeRef, scopeRef);
    const fn2 = getOrCreateStableFactory(store2, "demo", factory);

    expect(store2).toBe(store1);
    expect(fn2).toBe(fn1);
    expect(factory).toHaveBeenCalledTimes(1);
    expect(fn2()).toBe("v2:99");
  });

  test("liveScopeProxy 支持解构、Object.keys 与属性写入透传", () => {
    const scopeRef = { current: { a: 10, b: 20 } as Record<string, any> };
    const proxy = createLiveScopeProxy(scopeRef);

    const { a, b } = proxy;
    expect([a, b]).toEqual([10, 20]);
    expect("a" in proxy).toBe(true);
    expect(Object.keys(proxy)).toEqual(["a", "b"]);

    proxy.c = 30;
    expect(scopeRef.current.c).toBe(30);
  });
});
