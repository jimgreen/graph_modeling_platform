/**
 * 批量布线避障重算与批量重绘 Web Worker 客户端
 *
 * 相比每次任务现建现毁 Worker，本客户端采用「惰性常驻复用 + 空闲自动回收」策略：
 * - 正常完成的请求复用同一个热 Worker，消除每次 25–60ms 的 ES Module 线程冷启动延迟；
 * - 连续 30 秒无任务时自动 `terminate()` 释放后台线程内存；
 * - 发生 AbortSignal 取消、超时或 Worker 异常时立即 `terminate()` 销毁脏线程，下次自动拉起新实例；
 * - 浏览器不支持 Worker 或 Node/单测环境自动透明降级为同步微任务执行。
 */
import type { CanvasBounds, Edge, ModelNode, RoutedEdge } from "../model";
import {
  redrawConnectionRoutesForEdges,
  redrawRoutableLineDeviceRoutes,
  rerouteEdgesAroundMovedNodes
} from "../model-routing";

export type BatchRerouteRebuildOptions = Parameters<typeof rerouteEdgesAroundMovedNodes>[7];

export interface BatchRerouteInput {
  nodes: ModelNode[];
  edges: Edge[];
  movedNodeIds: string[];
  previousRoutes: RoutedEdge[];
  bounds?: CanvasBounds;
  forceEdgeIds: string[];
  searchEdges: Edge[];
  options?: BatchRerouteRebuildOptions;
}

export interface BatchRedrawRoutesInput {
  nodes: ModelNode[];
  edges: Edge[];
  targetEdgeIds: string[];
  targetLineNodeIds: string[];
  bounds?: CanvasBounds;
}

export interface BatchRedrawRoutesResult {
  changedEdges: Edge[];
  changedLineNodes: ModelNode[];
}

export type BatchRouteWorkerRequest =
  | {
      type: "reroute-around-moved";
      requestId: number;
      input: BatchRerouteInput;
    }
  | {
      type: "redraw-routes";
      requestId: number;
      input: BatchRedrawRoutesInput;
    };

export type BatchRouteWorkerResponse =
  | { type: "reroute-around-moved"; requestId: number; ok: true; edges: Edge[] }
  | { type: "reroute-around-moved"; requestId: number; ok: false; error: string }
  | {
      type: "redraw-routes";
      requestId: number;
      ok: true;
      changedEdges: Edge[];
      changedLineNodes: ModelNode[];
    }
  | { type: "redraw-routes"; requestId: number; ok: false; error: string };

type WorkerFactory = () => Worker;

/** 触发后台 Worker 卸载的默认边数阈值（低于该值同步算开销极小，直接主线程执行更省序列化） */
export const BATCH_ROUTE_WORKER_EDGE_THRESHOLD = 20;

/** Worker 单次计算兜底超时（毫秒） */
export const BATCH_ROUTE_WORKER_TIMEOUT_MS = 15_000;

/** 常驻复用 Worker 空闲回收时限（毫秒） */
export const BATCH_ROUTE_WORKER_IDLE_MS = 30_000;

let nextRequestId = 1;

// 默认常驻 Worker 槽位（仅在无自定义 workerFactory 时启用，避免影响单测隔离）
let sharedWorker: Worker | null = null;
let sharedWorkerBusy = false;
let sharedWorkerIdleTimer: ReturnType<typeof setTimeout> | undefined;

function clearSharedIdleTimer() {
  if (sharedWorkerIdleTimer !== undefined) {
    clearTimeout(sharedWorkerIdleTimer);
    sharedWorkerIdleTimer = undefined;
  }
}

/** 强制销毁常驻 Worker（用于取消、超时、异常或测试清理） */
export function disposeSharedBatchRouteWorker() {
  clearSharedIdleTimer();
  if (sharedWorker) {
    sharedWorker.onmessage = null;
    sharedWorker.onerror = null;
    sharedWorker.terminate();
    sharedWorker = null;
  }
  sharedWorkerBusy = false;
}

function scheduleSharedWorkerIdleDispose(idleMs: number = BATCH_ROUTE_WORKER_IDLE_MS) {
  clearSharedIdleTimer();
  if (!Number.isFinite(idleMs) || idleMs <= 0) {
    return;
  }
  sharedWorkerIdleTimer = setTimeout(() => {
    if (!sharedWorkerBusy) {
      disposeSharedBatchRouteWorker();
    }
  }, idleMs);
}

function createAbortError(): Error {
  const error = new Error("批量布线重算已取消");
  error.name = "AbortError";
  return error;
}

/**
 * 判断当前是否满足通过 Web Worker 异步卸载批量布线重算的条件。
 */
export function shouldOffloadBatchRerouteToWorker(
  edgeCount: number,
  threshold: number = BATCH_ROUTE_WORKER_EDGE_THRESHOLD
): boolean {
  return (
    edgeCount >= threshold &&
    typeof window !== "undefined" &&
    typeof Worker !== "undefined"
  );
}

function defaultCreateWorker(): Worker {
  return new Worker(new URL("./batchRoute.worker.ts", import.meta.url), {
    type: "module"
  });
}

function dispatchWorkerRequest<TResult>(
  request: BatchRouteWorkerRequest,
  extractResult: (response: BatchRouteWorkerResponse) => TResult | null,
  options: {
    signal?: AbortSignal;
    workerFactory?: WorkerFactory;
    timeoutMs?: number;
    reuseSharedWorker?: boolean;
    idleDisposeMs?: number;
  }
): Promise<TResult> {
  const {
    signal,
    workerFactory,
    timeoutMs = BATCH_ROUTE_WORKER_TIMEOUT_MS,
    reuseSharedWorker = !workerFactory,
    idleDisposeMs = BATCH_ROUTE_WORKER_IDLE_MS
  } = options;

  if (signal?.aborted) {
    return Promise.reject(createAbortError());
  }

  let worker: Worker;
  let usingShared = false;

  if (reuseSharedWorker) {
    clearSharedIdleTimer();
    // 若常驻线程正被前一个未结算任务占用，则本请求起独立临时线程，避免互相踩 onmessage
    if (!sharedWorkerBusy) {
      if (!sharedWorker) {
        sharedWorker = (workerFactory ?? defaultCreateWorker)();
      }
      worker = sharedWorker;
      sharedWorkerBusy = true;
      usingShared = true;
    } else {
      worker = (workerFactory ?? defaultCreateWorker)();
    }
  } else {
    worker = (workerFactory ?? defaultCreateWorker)();
  }

  return new Promise<TResult>((resolve, reject) => {
    let settled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const finish = (shouldTerminate: boolean, callback: () => void) => {
      if (settled) {
        return;
      }
      settled = true;
      if (timer !== undefined) {
        clearTimeout(timer);
        timer = undefined;
      }
      worker.onmessage = null;
      worker.onerror = null;
      signal?.removeEventListener("abort", onAbort);

      if (usingShared) {
        sharedWorkerBusy = false;
        if (shouldTerminate) {
          disposeSharedBatchRouteWorker();
        } else {
          scheduleSharedWorkerIdleDispose(idleDisposeMs);
        }
      } else {
        worker.terminate();
      }
      callback();
    };

    const onAbort = () => finish(true, () => reject(createAbortError()));

    if (Number.isFinite(timeoutMs) && timeoutMs > 0) {
      timer = setTimeout(() => {
        finish(true, () => reject(new Error(`批量布线 Worker ${timeoutMs} 毫秒内未响应，已终止`)));
      }, timeoutMs);
    }

    worker.onmessage = (event: MessageEvent<BatchRouteWorkerResponse>) => {
      const response = event.data;
      if (!response || response.requestId !== request.requestId) {
        return;
      }
      if (!response.ok) {
        finish(false, () => reject(new Error(response.error)));
        return;
      }
      const extracted = extractResult(response);
      if (extracted !== null) {
        finish(false, () => resolve(extracted));
      }
    };

    worker.onerror = (event) => {
      finish(true, () => reject(new Error(event.message || "批量布线 Worker 执行失败")));
    };

    signal?.addEventListener("abort", onAbort, { once: true });
    if (signal?.aborted) {
      onAbort();
      return;
    }

    try {
      worker.postMessage(request);
    } catch (error) {
      finish(true, () => reject(error instanceof Error ? error : new Error(String(error))));
    }
  });
}

/**
 * 在 Web Worker 中执行移动后批量避障重算；非 Worker 环境自动降级为同步微任务执行。
 */
export function runBatchRerouteInWorker(
  input: BatchRerouteInput,
  options: {
    signal?: AbortSignal;
    workerFactory?: WorkerFactory;
    timeoutMs?: number;
    reuseSharedWorker?: boolean;
    idleDisposeMs?: number;
  } = {}
): Promise<Edge[]> {
  const { signal, workerFactory } = options;
  if (signal?.aborted) {
    return Promise.reject(createAbortError());
  }

  const hasWorkerRuntime = Boolean(workerFactory) || (typeof window !== "undefined" && typeof Worker !== "undefined");
  if (!hasWorkerRuntime) {
    return Promise.resolve().then(() => {
      if (signal?.aborted) {
        throw createAbortError();
      }
      return rerouteEdgesAroundMovedNodes(
        input.nodes,
        input.edges,
        input.movedNodeIds,
        input.previousRoutes,
        input.bounds,
        input.forceEdgeIds,
        input.searchEdges,
        input.options
      );
    });
  }

  const requestId = nextRequestId++;
  return dispatchWorkerRequest<Edge[]>(
    { type: "reroute-around-moved", requestId, input },
    (response) => (response.ok && "edges" in response ? response.edges : null),
    options
  );
}

/**
 * 在 Web Worker 中执行批量连接线/自适应线路重绘；非 Worker 环境自动降级为同步微任务执行。
 */
export function runBatchRedrawRoutesInWorker(
  input: BatchRedrawRoutesInput,
  options: {
    signal?: AbortSignal;
    workerFactory?: WorkerFactory;
    timeoutMs?: number;
    reuseSharedWorker?: boolean;
    idleDisposeMs?: number;
  } = {}
): Promise<BatchRedrawRoutesResult> {
  const { signal, workerFactory } = options;
  if (signal?.aborted) {
    return Promise.reject(createAbortError());
  }

  const hasWorkerRuntime = Boolean(workerFactory) || (typeof window !== "undefined" && typeof Worker !== "undefined");
  if (!hasWorkerRuntime) {
    return Promise.resolve().then(() => {
      if (signal?.aborted) {
        throw createAbortError();
      }
      const nextEdges =
        input.targetEdgeIds.length > 0
          ? redrawConnectionRoutesForEdges(input.nodes, input.edges, input.targetEdgeIds, input.bounds)
          : input.edges;
      const changedEdges: Edge[] = [];
      for (let index = 0; index < nextEdges.length; index += 1) {
        if (nextEdges[index] !== input.edges[index]) {
          changedEdges.push(nextEdges[index]);
        }
      }
      const changedLineNodes =
        input.targetLineNodeIds.length > 0
          ? redrawRoutableLineDeviceRoutes(input.nodes, input.targetLineNodeIds, input.bounds)
          : [];
      return { changedEdges, changedLineNodes };
    });
  }

  const requestId = nextRequestId++;
  return dispatchWorkerRequest<BatchRedrawRoutesResult>(
    { type: "redraw-routes", requestId, input },
    (response) =>
      response.ok && "changedEdges" in response
        ? { changedEdges: response.changedEdges, changedLineNodes: response.changedLineNodes }
        : null,
    options
  );
}
