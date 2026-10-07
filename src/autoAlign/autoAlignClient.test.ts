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

  /**
   * 超时用**真实**定时器，不引入 vi.useFakeTimers。
   *
   * 为什么不用 fake timers：本文件的桩不会自动回消息（见 makeWorker 注释），要制造挂起必须靠
   * 一个真实到期的定时器来触发超时出口。vi.advanceTimersByTime 是同步的，而 promise 的
   * reject 后要靠 microtask 才能被 `await expect(...).rejects` 观察到；两套时钟叠在一起时，
   * 推进点落在 setTimeout 尚未注册的那一段上，测试会变成「没报错也没断言」的假绿。
   * 真实定时器 + 毫秒级 timeout 是这里唯一可靠的写法。
   *
   * 计时器隔离（避免跨文件通道串扰）：
   * ① 每条用例都**显式**传 timeoutMs（5ms / 0），不碰 60s 默认值 —— 默认值下若有桩漏触发，
   *    用例会挂到 testTimeout 30s，而不是几毫秒内明确地红掉。
   * ② 挂起是真的挂起：makeWorker 的桩从不让 postMessage 自动回消息，所以 5ms 到期必然
   *    只可能走超时出口，不会被「桩自己回了消息」蒙混成绿（变异①删掉整段超时后这组转红，见下）。
   * ③ 不做 beforeEach/afterEach 的全局 useFakeTimers —— 本仓库 `pool: "threads"` + isolate 默认 true，
   *    每个测试文件独立 worker 与模块注册表，fileParallelism 开着时全局计时器替身只影响本文件，
   *    但它会让「真实定时器驱动的挂起」这一前提消失，反而制造上面说的假绿。
   * ④ 用例结束前都显式 await 到期并让 promise 结算，定时器不会留到下一个用例。
   */
  const makeSilentWorker = () => makeWorker();

  test("worker 静默不回消息时按 timeout reject，不会永远 pending", async () => {
    // 桩收了 postMessage 却永不回 onmessage / 不触发 onerror —— 对应 worker 死循环 / OOM。
    // 修复前这个 promise 永不 settle，await 处卡死。
    const worker = makeSilentWorker();
    const promise = runAutoAlignPlanInWorker({} as AutoAlignPlanInput, () => worker as unknown as Worker, 5);
    expect(worker.postMessage, "静默桩仍应收到请求").toHaveBeenCalledTimes(1);
    await expect(promise).rejects.toThrow("自动对齐 Worker 5 毫秒内未返回，已终止");
    // 收尾与既有两出口一致：置空回调 + terminate 一次，不泄漏 worker
    expect(worker.terminate, "超时也应 terminate").toHaveBeenCalledTimes(1);
    expect(worker.onmessage, "超时后应清空 onmessage").toBeNull();
    expect(worker.onerror, "超时后应清空 onerror").toBeNull();
  });

  test("超时先到后迟到的消息不会二次结算，也不会二次 terminate", async () => {
    // settled 守卫对超时出口同样生效：terminate 只该调一次。
    const worker = makeSilentWorker();
    const promise = runAutoAlignPlanInWorker({} as AutoAlignPlanInput, () => worker as unknown as Worker, 5);
    const onmessage = worker.onmessage;
    await expect(promise).rejects.toThrow("自动对齐 Worker 5 毫秒内未返回，已终止");
    expect(worker.terminate).toHaveBeenCalledTimes(1);
    // 外部仍持有旧闭包，迟到消息不应再结算（Promise 已定则忽略，但 terminate 会调第二次）
    onmessage?.({ data: { ok: true, result: {} } } as unknown as MessageEvent);
    expect(worker.terminate).toHaveBeenCalledTimes(1);
  });

  test("先正常回消息时不被超时抢走，且到期的定时器不产生二次结算", async () => {
    // 既有三条出口优先于超时：resolve 在本用例里同步发生（timeoutMs=5，但没等真到 5ms），
    // await 到的必须是 onmessage 的结果，而不是超时错误。
    // ⚠ 优先级**不是**由代码书写顺序保证的（把 setTimeout 的 delay 改成 0 仍全绿，已实测）：
    //   它由事件循环保证 —— setTimeout 回调只能在当前同步执行块走完后才有机会运行，
    //   而 onmessage / onerror / postMessage-catch 三条出口都在同步块内结算。所以
    //   timeoutMs 取 0 或 5 在「谁先结算」上等价（变异④全绿，等价性可证）。
    //   本例的作用是把「超时不得抢在正常结果前面」钉成可读断言，而不是证明时序实现。
    // 附带验 clearTimeout 的可观测部分：定时器到期时 settled 已 true，finish 早退，
    // terminate 不会调第二次。clearTimeout 本身删掉后本例仍绿（见文件末尾的等价性说明）。
    const worker = makeWorker();
    const promise = runAutoAlignPlanInWorker({} as AutoAlignPlanInput, () => worker as unknown as Worker, 5);
    worker.onmessage?.({ data: { ok: true, result: { tag: "fast" } } } as unknown as MessageEvent);
    await expect(promise).resolves.toEqual({ tag: "fast" });
    expect(worker.terminate).toHaveBeenCalledTimes(1);
    // 若定时器仍在，等它到期也不该产生任何二次结算
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(worker.terminate).toHaveBeenCalledTimes(1);
  });

  test("timeoutMs 非正数时不挂定时器（保持旧的无超时语义）", async () => {
    // 0 / 负数 = 调用方显式要「不等」，此时不设定时器，
    // 静默 worker 的 promise 保持 pending —— 用 onerror 主动结算，避免用例挂死。
    const worker = makeSilentWorker();
    const promise = runAutoAlignPlanInWorker({} as AutoAlignPlanInput, () => worker as unknown as Worker, 0);
    let settled = false;
    void promise.then(() => { settled = true; }, () => { settled = true; });
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(settled, "timeoutMs 为 0 时不应触发超时").toBe(false);
    worker.onerror?.({ message: "手动收尾" } as ErrorEvent);
    await expect(promise).rejects.toThrow("手动收尾");
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

  /**
   * 变异测试记录（2026-10-07，tmp/mut.mjs + tmp/mut.json，跑完已还原生产文件）：
   * ① 删掉整段超时注册块 → 本文件 2 条红（静默用例挂到 testTimeout）。真打红。
   * ② 把超时文案换成泛化的「自动对齐 Worker 超时」 → 2 条红。真打红，断言确实落在文案上。
   * ③ 只删 clearTimeout 三行 → **全绿**。这是正确结果，不是坏测试：
   *    clearTimeout 的作用是回收那个已排期的句柄，而它到期时只会跑一次
   *    `finish(() => reject(...))`，此时 `settled` 已为 true，`finish` 在第一行 `if (settled) return`
   *    早退 —— 无 reject、无 terminate、无任何可观测输出。所以在**任何**输入下
   *    「有 clearTimeout」与「无 clearTimeout」的输出完全一致，等价性可证；
   *    保留 clearTimeout 的唯一理由是别在 worker 已收尾后还挂一个活跃句柄。
   *    ⚠ 哪天把 `finish` 的 settled 早退改成别的形态，这条等价性立刻失效，需要重测。
   * ④ setTimeout 的 delay 从 timeoutMs 改成 0 → **全绿**。等价性可证：两条出口的先后由
   *    事件循环决定（setTimeout 回调必须等当前同步块走完），不取决于 delay 是 0 还是 5，
   *    而测试里两条出口都在同步块内触发。
   * ⑤ 删掉 `if (settled) return;` 早退 → 3 条红（超时后再来消息会二次 terminate）。真打红。
   * ⑥ `if (Number.isFinite(timeoutMs) && timeoutMs > 0)` 改成 `if (true)` → 1 条红
   *    （timeoutMs=0 的用例会真的超时）。真打红。
   * ⑦ finish 里删掉 `worker.terminate()` → 9 条红。真打红。
   */
});
