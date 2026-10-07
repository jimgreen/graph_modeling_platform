import { runAutoAlignPlan, type AutoAlignPlanInput, type AutoAlignPlanResult } from "./autoAlignPlan";

type WorkerResponse =
  | { ok: true; result: AutoAlignPlanResult }
  | { ok: false; error: string };

type WorkerFactory = () => Worker;

/**
 * worker 静默挂起（死循环 / OOM / 消息丢失）时，onmessage / onerror 都不会到达，
 * 没有超时这个 promise 就永远 pending，调用方的 await 处直接卡死。
 * 取值偏大：正常的大图自动对齐也可能跑十几秒，这是「兜底」不是「预期耗时上限」。
 */
export const AUTO_ALIGN_WORKER_TIMEOUT_MS = 60_000;

export function runAutoAlignPlanInWorker(
  input: AutoAlignPlanInput,
  workerFactory?: WorkerFactory,
  timeoutMs: number = AUTO_ALIGN_WORKER_TIMEOUT_MS
): Promise<AutoAlignPlanResult> {
  const createWorker = workerFactory ?? (typeof window === "undefined" || typeof Worker === "undefined" ? undefined : () => new Worker(
    new URL("./autoAlign.worker.ts", import.meta.url),
    { type: "module" }
  ));
  if (!createWorker) {
    return Promise.resolve().then(() => runAutoAlignPlan(input));
  }

  const worker = createWorker();
  return new Promise<AutoAlignPlanResult>((resolve, reject) => {
    let settled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      // 两条路径（resolve / reject）都走这里，必须无条件清掉定时器，
      // 否则到期回调会在 worker 早已收尾后再跑一次 reject（无副作用，但仍是无主的活跃句柄）。
      if (timer !== undefined) {
        clearTimeout(timer);
        timer = undefined;
      }
      worker.onmessage = null;
      worker.onerror = null;
      worker.terminate();
      callback();
    };
    if (Number.isFinite(timeoutMs) && timeoutMs > 0) {
      // 超时排在 finally 同名机制之外：它是**第二条**出口，先挂上，
      // 再让 onmessage / onerror / postMessage 同步抛错照旧抢在它之前结算。
      timer = setTimeout(() => {
        finish(() => reject(new Error(`自动对齐 Worker ${timeoutMs} 毫秒内未返回，已终止`)));
      }, timeoutMs);
    }
    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const response = event.data;
      if (response.ok) {
        finish(() => resolve(response.result));
      } else {
        finish(() => reject(new Error(response.error)));
      }
    };
    worker.onerror = (event) => {
      finish(() => reject(new Error(event.message || "自动对齐 Worker 执行失败")));
    };
    try {
      worker.postMessage({ type: "run", input });
    } catch (error) {
      finish(() => reject(error instanceof Error ? error : new Error(String(error))));
    }
  });
}
