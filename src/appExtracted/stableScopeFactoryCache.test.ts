import { describe, expect, test, vi } from "vitest";
import {
  ensureStableFactoryStore,
  getOrCreateStableFactory,
  syncStableLiveScope,
  type StableFactoryStore
} from "./stableScopeFactoryCache";

describe("stableScopeFactoryCache（零 Proxy 普通对象模式）", () => {
  test("纯延迟工厂跨多帧只创建一次，返回同一引用且总是读取最新 scope 状态", () => {
    const storeRef: { current: StableFactoryStore | null } = { current: null };
    const factory = vi.fn((scope: Record<string, unknown>) => () => `${scope.tag}:${scope.count}`);

    const frame1Scope: Record<string, unknown> = { count: 1, tag: "v1" };
    const store1 = ensureStableFactoryStore(storeRef, frame1Scope);
    const fn1 = getOrCreateStableFactory(store1, "demo", factory);
    expect(fn1()).toBe("v1:1");

    // 模拟后续帧 App 重建了新的 __appScope 并写入动态派生属性
    const frame2Scope: Record<string, unknown> = { count: 99, tag: "v2" };
    const store2 = ensureStableFactoryStore(storeRef, frame2Scope);
    frame2Scope.extra = "synced";
    syncStableLiveScope(store2, frame2Scope);
    const fn2 = getOrCreateStableFactory(store2, "demo", factory);

    expect(store2).toBe(store1);
    expect(fn2).toBe(fn1);
    expect(factory).toHaveBeenCalledTimes(1);
    expect(fn2()).toBe("v2:99");
    expect(store2.liveScope.extra).toBe("synced");
  });
});
