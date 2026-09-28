import { describe, expect, test, vi } from "vitest";
import type { AutoAlignPlanInput, AutoAlignPlanResult } from "./autoAlignPlan";
import { runAutoAlignPlanInWorker } from "./autoAlignClient";

describe("auto-align worker client", () => {
  /** 造一个可控的假 Worker：调用方自己触发 onmessage / onerror。 */
  const makeWorker = () => ({
    onmessage: null as ((event: MessageEvent) => void) | null,
    onerror: null as ((event: ErrorEvent) => void) | null,
    postMessage: vi.fn(),
    terminate: vi.fn()
  });


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

  /**
   * 以下覆盖的是「promise 会不会永远不 settle」与「worker 会不会泄漏」。
   * 两者都是最难察觉的失效：界面直接卡住、或者每次操作漏一个 worker，
   * 都不产生任何报错。这组用例此前只有上面那 1 条 happy path。
   */
  test("Worker 不可用时回落同步执行（不抛错、不建 worker）", async () => {
    // 传 undefined 且环境无 window/Worker（Node 测试环境）→ 走同步回落。
    // 自动对齐必须仍能出结果，否则整个功能在非浏览器环境里直接不可用。
    // input 用真实形状（runAutoAlignPlan 会遍历各数组，空数组也走完整流程）。
    const input = {
      nodes: [],
      activeLayerNodes: [],
      activeLayerEdges: [],
      activeLayerGroups: [],
      edges: [],
      routedEdges: [],
      canvasBounds: { width: 800, height: 600 },
      gridSpacing: 50,
      editModeRouteRenderOptions: { preserveManualRouteDisplay: true }
    } as unknown as AutoAlignPlanInput;
    const result = await runAutoAlignPlanInWorker(input, undefined);
    expect(result).toBeDefined();
    expect(Array.isArray(result.nodeIds)).toBe(true);
    expect(result.layoutUnitCount).toBe(0);
  });

  test("Worker 回 ok:false 时以该 error 消息 reject", async () => {
    const worker = makeWorker();
    const promise = runAutoAlignPlanInWorker({} as AutoAlignPlanInput, () => worker as unknown as Worker);
    worker.onmessage?.({ data: { ok: false, error: "自动对齐 Worker 请求无效" } } as MessageEvent);
    await expect(promise).rejects.toThrow("自动对齐 Worker 请求无效");
    expect(worker.terminate).toHaveBeenCalledTimes(1);
  });

  test("onerror 时 reject 并带原始消息", async () => {
    const worker = makeWorker();
    const promise = runAutoAlignPlanInWorker({} as AutoAlignPlanInput, () => worker as unknown as Worker);
    worker.onerror?.({ message: "boom" } as ErrorEvent);
    await expect(promise).rejects.toThrow("boom");
    expect(worker.terminate).toHaveBeenCalledTimes(1);
  });

  test("onerror 无消息时用兜底文案（不留 undefined 的 Error）", async () => {
    const worker = makeWorker();
    const promise = runAutoAlignPlanInWorker({} as AutoAlignPlanInput, () => worker as unknown as Worker);
    worker.onerror?.({ message: "" } as unknown as ErrorEvent);
    await expect(promise).rejects.toThrow("自动对齐 Worker 执行失败");
  });

  test("postMessage 同步抛错时 reject（否则 promise 永不 settle）", async () => {
    // 结构化克隆失败（input 含不可克隆对象）时 postMessage 会同步 throw。
    // 若不接住，这个 promise 就永远 pending，调用方 await 处直接卡死。
    const worker = makeWorker();
    worker.postMessage.mockImplementation(() => {
      throw new TypeError("could not be cloned");
    });
    const promise = runAutoAlignPlanInWorker({} as AutoAlignPlanInput, () => worker as unknown as Worker);
    await expect(promise).rejects.toThrow("could not be cloned");
    expect(worker.terminate).toHaveBeenCalledTimes(1);
  });

  test("postMessage 抛非 Error 值时也包装成 Error", async () => {
    const worker = makeWorker();
    worker.postMessage.mockImplementation(() => {
      throw "裸字符串";
    });
    const promise = runAutoAlignPlanInWorker({} as AutoAlignPlanInput, () => worker as unknown as Worker);
    await expect(promise).rejects.toBeInstanceOf(Error);
  });

  test("先失败后到达的消息不会二次结算，也不会二次 terminate", async () => {
    // settled 守卫：Worker 出错后又补发一条成功消息时，若无守卫就会
    // 再次 resolve（Promise 已定则忽略，但 terminate 会调第二次 → worker 泄漏）。
    const worker = makeWorker();
    const promise = runAutoAlignPlanInWorker({} as AutoAlignPlanInput, () => worker as unknown as Worker);
    const onmessage = worker.onmessage;

    worker.onerror?.({ message: "first" } as ErrorEvent);
    // 收尾后回调应被置空，迟到的消息无处可来
    expect(worker.onmessage, "收尾后应清空 onmessage").toBeNull();
    expect(worker.onerror, "收尾后应清空 onerror").toBeNull();

    await expect(promise).rejects.toThrow("first");
    expect(worker.terminate).toHaveBeenCalledTimes(1);
    // 迟到的回调即使被外部持有再调用，也不该再触发 terminate
    onmessage?.({ data: { ok: true, result: {} } } as unknown as MessageEvent);
    expect(worker.terminate).toHaveBeenCalledTimes(1);
  });

  test("连续两条成功消息只结算第一次", async () => {
    const worker = makeWorker();
    const promise = runAutoAlignPlanInWorker({} as AutoAlignPlanInput, () => worker as unknown as Worker);
    const onmessage = worker.onmessage;
    onmessage?.({ data: { ok: true, result: { tag: 1 } } } as unknown as MessageEvent);
    onmessage?.({ data: { ok: true, result: { tag: 2 } } } as unknown as MessageEvent);
    await expect(promise).resolves.toEqual({ tag: 1 });
    expect(worker.terminate).toHaveBeenCalledTimes(1);
  });
});
