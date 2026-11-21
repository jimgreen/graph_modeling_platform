import { runAutoAlignPlan, type AutoAlignPlanInput, type AutoAlignPlanResult, type AutoAlignProgress } from "./autoAlignPlan";

type WorkerRequest = {
  type: "run";
  input: AutoAlignPlanInput;
};

type WorkerResponse =
  | { type: "progress"; progress: AutoAlignProgress }
  | { ok: true; result: AutoAlignPlanResult }
  | { ok: false; error: string };

const workerScope = globalThis as unknown as {
  onmessage: ((event: MessageEvent<WorkerRequest>) => void) | null;
  postMessage: (message: WorkerResponse) => void;
};

workerScope.onmessage = (event) => {
  try {
    if (event.data?.type !== "run") {
      throw new Error("自动对齐 Worker 请求无效");
    }
    const result = runAutoAlignPlan(event.data.input, {
      onProgress: (progress) => workerScope.postMessage({ type: "progress", progress })
    });
    workerScope.postMessage({ ok: true, result });
  } catch (error) {
    workerScope.postMessage({ ok: false, error: error instanceof Error ? error.message : String(error) });
  }
};

export {};
