// 内存守望：周期检查 JS 堆占用，超过阈值逐级释放，兜底保证内存不越过 2GB。
//
// 背景（2026-09-24 CDP 实测，5 分钟 430 轮画布编辑）：
// - 常规编辑路径无显性泄漏：DOM 节点 / 事件监听器每轮 GC 后归零，堆谷值稳定；
// - 但高分配速率会推高 V8 保留堆（任务管理器数字持续走高），且长周期慢泄漏无法静态排除。
// 因此除了修已知隐患（撤销栈上限、空间索引查询标记），还需要一个运行时兜底：
// 堆逼近 2GB 时先释放可再生的内存（撤销历史），最后借助「刷新恢复」机制安全重载页面。
//
// 分级策略：
// - soft  1.20GB：撤销栈裁剪到最近 10 条（快照是全量工程状态，是最大的可再生内存块）；
// - hard  1.60GB：清空撤销栈 + 提示用户保存并刷新；
// - critical 1.85GB：先 persistRefreshRecoveryNow() 落盘恢复快照，再置 skip-beforeunload
//   标志绕过未保存挽留弹窗，硬刷新页面。刷新后由既有恢复机制还原画布数据。
//
// 注意：本模块可能被 node 测试环境加载，**不得顶层 import globalMessage**
// （src/globalMessage.ts 顶层写 window，import 即炸）；与 spaceSwitch.ts 同款，
// 通过 (globalThis as any).showGlobalMessage?.() 可选调用。

import { setSkipBeforeUnload } from "./spaceSwitch";

const BYTES_PER_GB = 1024 * 1024 * 1024;

export const MEMORY_WATCH_SOFT_LIMIT_BYTES = 1.2 * BYTES_PER_GB;
export const MEMORY_WATCH_HARD_LIMIT_BYTES = 1.6 * BYTES_PER_GB;
export const MEMORY_WATCH_CRITICAL_LIMIT_BYTES = 1.85 * BYTES_PER_GB;
export const MEMORY_WATCH_SOFT_TRIM_UNDO_KEEP = 10;
const DEFAULT_INTERVAL_MS = 30_000;

/** 读取当前 JS 堆已用字节；仅 Chrome 系提供 performance.memory，其余环境返回 null（守望静默空转）。 */
export function readJsHeapUsedBytes(): number | null {
  const memory = (performance as unknown as { memory?: { usedJSHeapSize?: number } })?.memory;
  const used = memory?.usedJSHeapSize;
  return typeof used === "number" && Number.isFinite(used) && used > 0 ? used : null;
}

export type MemoryWatchOptions = {
  /** 裁剪撤销历史：参数为保留条数（0 = 全部清空） */
  onTrimUndoHistory?: (keepCount: number) => void;
  /** 持久化刷新恢复快照（critical 自动刷新前调用） */
  persistRecovery?: () => void;
  /** 检查间隔，默认 30s */
  intervalMs?: number;
};

export type MemoryWatchHandle = {
  stop: () => void;
};

/** 单次检查的处置决策：0 无事 / 1 soft / 2 hard / 3 critical。抽纯便于直接单测阈值行为。 */
export function memoryWatchLevelFor(usedBytes: number): 0 | 1 | 2 | 3 {
  if (usedBytes >= MEMORY_WATCH_CRITICAL_LIMIT_BYTES) return 3;
  if (usedBytes >= MEMORY_WATCH_HARD_LIMIT_BYTES) return 2;
  if (usedBytes >= MEMORY_WATCH_SOFT_LIMIT_BYTES) return 1;
  return 0;
}

export function startMemoryWatch(options: MemoryWatchOptions = {}): MemoryWatchHandle {
  const { onTrimUndoHistory, persistRecovery, intervalMs = DEFAULT_INTERVAL_MS } = options;
  let lastLevel: 0 | 1 | 2 | 3 = 0;
  let reloading = false;
  const tick = () => {
    if (reloading) return;
    const used = readJsHeapUsedBytes();
    if (used === null) return;
    const level = memoryWatchLevelFor(used);
    if (level === lastLevel) return;
    if (level === 1) {
      // 静默裁剪：撤销快照是最大的可再生内存块，保留最近 10 条足够回退。
      onTrimUndoHistory?.(MEMORY_WATCH_SOFT_TRIM_UNDO_KEEP);
    } else if (level === 2) {
      onTrimUndoHistory?.(0);
      (globalThis as { showGlobalMessage?: (text: string) => void })?.showGlobalMessage?.(
        "内存占用较高：已释放撤销历史。如继续卡顿，请保存工程并刷新页面。"
      );
    } else if (level === 3) {
      // 逼近 2GB：先落盘恢复快照，再绕过未保存挽留弹窗硬刷新；刷新后画布数据由恢复机制还原。
      reloading = true;
      try {
        persistRecovery?.();
      } catch {
        // 恢复快照失败也继续刷新——内存临界时页面已不可靠，硬刷新是最后防线。
      }
      try {
        setSkipBeforeUnload(true);
      } catch {
        // 标志置失败时 reload 可能弹未保存确认框，用户可手动确认，不影响兜底语义。
      }
      (globalThis as { showGlobalMessage?: (text: string) => void })?.showGlobalMessage?.(
        "内存占用接近上限，即将自动刷新页面释放内存（已保存恢复点）。"
      );
      window.setTimeout(() => window.location.reload(), 400);
      return;
    }
    lastLevel = level;
  };
  // 用 globalThis 而非 window：node 测试环境无 window；本守望在 node 下空转（无 performance.memory）
  const timer = globalThis.setInterval(tick, intervalMs);
  return {
    stop: () => {
      globalThis.clearInterval(timer);
    }
  };
}

/** React effect 适配：从 __appScope 解构依赖并启动守望（与 createAppHookCallback* 同形态）。 */
export function createMemoryWatchCallback(__appScope: Record<string, any>) {
  return () => {
    const handle = startMemoryWatch({
      onTrimUndoHistory: (keepCount) => {
        const setUndoStack = __appScope?.setUndoStack;
        if (typeof setUndoStack !== "function") return;
        setUndoStack((current: unknown[]) => (Array.isArray(current) ? current.slice(-keepCount) : current));
      },
      persistRecovery: () => {
        __appScope?.persistRefreshRecoveryNow?.();
      }
    });
    return () => handle.stop();
  };
}
