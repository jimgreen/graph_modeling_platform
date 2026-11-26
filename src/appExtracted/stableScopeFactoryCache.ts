/**
 * 跨渲染帧稳定工厂缓存与实时 Scope 代理层。
 *
 * 问题背景：
 * `appRenderBatch.tsx` 在每次 React 渲染期间会重复执行 700+ 次 `createXxx(__appScope)` 工厂调用，
 * 其中 97% 属于「纯延迟解构工厂」（仅在事件/回调触发时读取 `__appScope`）。每帧重建造成大量闭包分配与 GC 抖动，
 * 并导致传给 `React.memo` 子组件的回调 props 引用反复变化。
 *
 * 解决机制：
 * 1. 通过 `createLiveScopeProxy(scopeRef)` 构造唯一透明代理，所有属性读取实时落到 `scopeRef.current`；
 * 2. 纯延迟工厂在组件生命周期内仅实例化一次并存入 `cache` 字典，后续渲染直接 O(1) 复用同一引用，零陈旧闭包。
 */

export interface LiveScopeRef<T extends object = Record<string, unknown>> {
  current: T;
}

export interface StableFactoryStore {
  proxy: Record<string, unknown>;
  handlers: Record<string, unknown>;
}

/**
 * 创建始终指向 `scopeRef.current` 的透明代理对象。
 * 支持解构（`const { a, b } = proxy`）、`in` 判定、`Object.keys` 与属性写入透传。
 */
export function createLiveScopeProxy<T extends object>(scopeRef: LiveScopeRef<T>): T {
  return new Proxy({} as T, {
    get(_target, prop) {
      return Reflect.get(scopeRef.current, prop);
    },
    set(_target, prop, value) {
      return Reflect.set(scopeRef.current, prop, value);
    },
    has(_target, prop) {
      return Reflect.has(scopeRef.current, prop);
    },
    ownKeys() {
      return Reflect.ownKeys(scopeRef.current);
    },
    getOwnPropertyDescriptor(_target, prop) {
      const desc = Reflect.getOwnPropertyDescriptor(scopeRef.current, prop);
      if (desc) {
        return { ...desc, configurable: true };
      }
      return undefined;
    }
  });
}

/**
 * 初始化或获取当前组件实例的稳定工厂存储桶。
 */
export function ensureStableFactoryStore(
  storeRef: { current: StableFactoryStore | null },
  scopeRef: LiveScopeRef
): StableFactoryStore {
  if (!storeRef.current) {
    storeRef.current = {
      proxy: createLiveScopeProxy(scopeRef),
      handlers: Object.create(null) as Record<string, unknown>
    };
  }
  return storeRef.current;
}

/**
 * 获取或创建跨渲染帧稳定的纯延迟工厂产物。
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
  const created = factory(store.proxy);
  store.handlers[key] = created;
  return created;
}
