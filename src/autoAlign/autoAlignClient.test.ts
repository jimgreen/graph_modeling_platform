import { describe, expect, test, vi } from "vitest";
import type { AutoAlignPlanInput, AutoAlignPlanResult } from "./autoAlignPlan";
import { runAutoAlignPlanInWorker } from "./autoAlignClient";

describe("auto-align worker client", () => {
  test("posts a plan request and resolves the worker result", async () => {
    const input = {} as AutoAlignPlanInput;
    const result = {
      arranged: [],
      nodeIds: [],
      layoutUnitCount: 0,
      storedRouteDrops: [],
      qualityReport: {
        verifiedCandidateCount: 0,
        bendRejectedCount: 0,
        crossingRejectedCount: 0,
        frozenUnitCount: 0,
        degraded: false,
        revertedByVerification: false
      }
    } satisfies AutoAlignPlanResult;
    const worker: {
      onmessage: ((event: MessageEvent) => void) | null;
      onerror: ((event: ErrorEvent) => void) | null;
      postMessage: ReturnType<typeof vi.fn>;
      terminate: ReturnType<typeof vi.fn>;
    } = {
      onmessage: null,
      onerror: null,
      postMessage: vi.fn(),
      terminate: vi.fn()
    };
    const promise = runAutoAlignPlanInWorker(input, () => worker as unknown as Worker);
    expect(worker.postMessage).toHaveBeenCalledWith({ type: "run", input });

    worker.onmessage?.({ data: { ok: true, result } } as MessageEvent);
    await expect(promise).resolves.toEqual(result);
    expect(worker.terminate).toHaveBeenCalledTimes(1);
  });
});
