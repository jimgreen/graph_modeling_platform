/**
 * 跨渲染帧稳定工厂缓存与零 Proxy 实时 Scope 容器。
 *
 * 实测性能教训（Chromium CDP `Performance.getMetrics` 压测证实）：
 * 使用 ES6 `Proxy` 拦截 `__appScope` 属性读取时，`handlePointerMove` 等高频热路径每次解构 80+ 字段
 * 会退化为 V8 C++ 慢路径（`scriptDuration` 上升 25%–150%）。
 *
 * 零 Proxy 方案：
 * 1. `store.liveScope` 是组件生命周期内唯一复用的**普通 JS 对象**（100% 保持 V8 HiddenClass Inline Cache）；
 * 2. 710 个纯延迟工厂仅首次创建一次，闭包捕获 `store.liveScope`；
 * 3. `appRenderBatch.tsx` 中所有状态与派生值直接同步写入 `store.liveScope`，事件触发时零 Proxy 开销直读最新值。
 */

export interface StableFactoryStore {
  liveScope: Record<string, unknown>;
  handlers: Record<string, unknown>;
}

/**
 * 初始化或获取当前组件实例的稳定工厂存储桶，并将最新一帧的外部 scope 属性原地同步至普通对象 `liveScope`。
 */
export function ensureStableFactoryStore(
  storeRef: { current: StableFactoryStore | null },
  currentScope: Record<string, unknown>
): StableFactoryStore {
  if (!storeRef.current) {
    storeRef.current = {
      liveScope: Object.assign({}, currentScope),
      handlers: Object.create(null) as Record<string, unknown>
    };
  } else {
    Object.assign(storeRef.current.liveScope, currentScope);
  }
  return storeRef.current;
}

/**
 * 将本帧在 `useRenderBatch` 中新增写入 `__appScope` 的属性批量回同步至 `store.liveScope`。
 */
export function syncStableLiveScope(
  store: StableFactoryStore,
  currentScope: Record<string, unknown>
): void {
  Object.assign(store.liveScope, currentScope);
}

/**
 * 获取或创建跨渲染帧稳定的纯延迟工厂产物（闭包捕获零 Proxy 普通对象 `store.liveScope`）。
 */
export function getOrCreateStableFactory<TResult>(
  store: StableFactoryStore,
  key: string,
  factory: (scope: Record<string, unknown>) => TResult
): TResult {
  const existing = store.handlers[key];
  if (existing !== undefined) {
    return existing as TResult;
  }
  const created = factory(store.liveScope);
  store.handlers[key] = created;
  return created;
}
