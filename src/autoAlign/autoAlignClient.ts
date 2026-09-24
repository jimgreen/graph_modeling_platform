import { runAutoAlignPlan, type AutoAlignPlanInput, type AutoAlignPlanResult } from "./autoAlignPlan";

type WorkerResponse =
  | { ok: true; result: AutoAlignPlanResult }
  | { ok: false; error: string };

type WorkerFactory = () => Worker;

export function runAutoAlignPlanInWorker(
  input: AutoAlignPlanInput,
  workerFactory?: WorkerFactory
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
    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      worker.onmessage = null;
      worker.onerror = null;
      worker.terminate();
      callback();
    };
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
