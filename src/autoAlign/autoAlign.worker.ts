import { runAutoAlignPlan, type AutoAlignPlanInput, type AutoAlignPlanResult } from "./autoAlignPlan";

type WorkerRequest = {
  type: "run";
  input: AutoAlignPlanInput;
};

type WorkerResponse =
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
    workerScope.postMessage({ ok: true, result: runAutoAlignPlan(event.data.input) });
  } catch (error) {
    workerScope.postMessage({ ok: false, error: error instanceof Error ? error.message : String(error) });
  }
};

export {};
