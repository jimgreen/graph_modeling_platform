import { useSyncExternalStore } from "react";

export type RuntimeWsConnectionStatus = "connecting" | "open" | "closed";

export type RuntimeWsIndicatorSnapshot = {
  status: RuntimeWsConnectionStatus;
  blinkSeq: number;
  clientId: string;
};

const INITIAL_SNAPSHOT: RuntimeWsIndicatorSnapshot = {
  status: "connecting",
  blinkSeq: 0,
  clientId: ""
};

let currentSnapshot: RuntimeWsIndicatorSnapshot = { ...INITIAL_SNAPSHOT };
const listeners = new Set<() => void>();

function emitChange() {
  for (const listener of listeners) {
    listener();
  }
}

/** 读取当前运行时态 WS 指示灯快照（供 useSyncExternalStore 与非 React 代码读取）。 */
export function getRuntimeWsIndicatorSnapshot(): RuntimeWsIndicatorSnapshot {
  return currentSnapshot;
}

/** 订阅运行时态 WS 指示灯状态变化。 */
export function subscribeRuntimeWsIndicator(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** 更新运行时态 WS 连接状态（状态未变时不触发订阅者重渲染）。 */
export function updateRuntimeWsStatus(status: RuntimeWsConnectionStatus): void {
  if (currentSnapshot.status === status) return;
  currentSnapshot = { ...currentSnapshot, status };
  emitChange();
}

/** 递增运行时态 WS 活动闪烁序号（仅触发指示灯组件局部重渲染，不牵连 App 根组件）。 */
export function bumpRuntimeWsBlinkSeq(): void {
  currentSnapshot = { ...currentSnapshot, blinkSeq: currentSnapshot.blinkSeq + 1 };
  emitChange();
}

/** 更新运行时态 WS 页面 token（clientId）。 */
export function updateRuntimeWsClientId(clientId: string): void {
  const normalized = String(clientId ?? "");
  if (currentSnapshot.clientId === normalized) return;
  currentSnapshot = { ...currentSnapshot, clientId: normalized };
  emitChange();
}

/** 重置指示灯状态（供组件卸载或单元测试清理使用）。 */
export function resetRuntimeWsIndicatorStore(): void {
  currentSnapshot = { ...INITIAL_SNAPSHOT };
  emitChange();
}

/** 订阅运行时态 WS 指示灯状态的 React Hook。 */
export function useRuntimeWsIndicatorSnapshot(): RuntimeWsIndicatorSnapshot {
  return useSyncExternalStore(
    subscribeRuntimeWsIndicator,
    getRuntimeWsIndicatorSnapshot,
    getRuntimeWsIndicatorSnapshot
  );
}
