// Worker 侧的消息处理，此前零测试。
//
// client 侧（autoAlignClient.test.ts）已经把「promise 会不会不 settle」「worker
// 会不会泄漏」测得很细，但 worker 端那个 onmessage 处理器一次都没被执行过。
// 它坏掉时的表现是静默的：autoAlignClient 那边会一直等一个永远不来的响应，
// 界面表现为「点了自动对齐没反应、也不报错」—— 只有这里抛错才会变成 reject。
//
// 契约：任何情况下都要回一条消息，且只有两种形状 ——
//   { ok: true,  result }  /  { ok: false, error: string }
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const emptyInput = () => ({
  nodes: [],
  activeLayerNodes: [],
  activeLayerEdges: [],
  activeLayerGroups: [],
  edges: [],
  routedEdges: [],
  canvasBounds: { width: 800, height: 600 },
  gridSpacing: 50,
  editModeRouteRenderOptions: { preserveManualRouteDisplay: true }
});

type Handler = (event: { data?: unknown }) => void;
let postMessage: ReturnType<typeof vi.fn>;
let handler: Handler;

beforeEach(async () => {
  vi.resetModules();
  postMessage = vi.fn();
  // worker 模块在 import 时就把 onmessage 挂到 globalThis 上（浏览器里那是
  // DedicatedWorkerGlobalScope），所以桩必须在 import 之前就位。
  (globalThis as { postMessage?: unknown }).postMessage = postMessage;
  await import("./autoAlign.worker");
  handler = (globalThis as unknown as { onmessage: Handler }).onmessage;
});

afterEach(() => {
  delete (globalThis as { postMessage?: unknown }).postMessage;
  delete (globalThis as unknown as { onmessage?: unknown }).onmessage;
  vi.resetModules();
  vi.doUnmock("./autoAlignPlan");
});

describe("worker onmessage", () => {
  test("挂上了处理器（import 即注册，不等谁来订阅）", () => {
    expect(typeof handler).toBe("function");
  });

  test("type=run：回 ok:true 与 runAutoAlignPlan 的结果", () => {
    handler({ data: { type: "run", input: emptyInput() } });

    expect(postMessage).toHaveBeenCalledTimes(1);
    const response = postMessage.mock.calls[0][0];
    expect(response.ok).toBe(true);
    expect(response.result).toMatchObject({ nodeIds: [], layoutUnitCount: 0, arranged: [], storedRouteDrops: [] });
  });

  test("type 不是 run：回 ok:false 且不碰 runAutoAlignPlan", () => {
    handler({ data: { type: "stop", input: emptyInput() } });

    expect(postMessage).toHaveBeenCalledWith({ ok: false, error: "自动对齐 Worker 请求无效" });
  });

  test("data 整个缺失：同样按无效请求处理，不抛到外面", () => {
    handler({ data: undefined });
    handler({});

    expect(postMessage).toHaveBeenCalledTimes(2);
    expect(postMessage).toHaveBeenLastCalledWith({ ok: false, error: "自动对齐 Worker 请求无效" });
  });

  test("runAutoAlignPlan 抛错：回 ok:false 并带上原始 message", async () => {
    vi.resetModules();
    vi.doMock("./autoAlignPlan", () => ({
      runAutoAlignPlan: () => {
        throw new Error("布局单元计算失败");
      }
    }));
    postMessage = vi.fn();
    (globalThis as { postMessage?: unknown }).postMessage = postMessage;
    await import("./autoAlign.worker");
    handler = (globalThis as unknown as { onmessage: Handler }).onmessage;

    handler({ data: { type: "run", input: emptyInput() } });

    expect(postMessage).toHaveBeenCalledWith({ ok: false, error: "布局单元计算失败" });
  });

  test("抛的不是 Error（裸字符串）时也回字符串化后的文案，不回 undefined", async () => {
    vi.resetModules();
    vi.doMock("./autoAlignPlan", () => ({
      runAutoAlignPlan: () => {
        throw "裸字符串";
      }
    }));
    postMessage = vi.fn();
    (globalThis as { postMessage?: unknown }).postMessage = postMessage;
    await import("./autoAlign.worker");
    handler = (globalThis as unknown as { onmessage: Handler }).onmessage;

    handler({ data: { type: "run", input: emptyInput() } });

    const response = postMessage.mock.calls[0][0];
    expect(response.ok).toBe(false);
    expect(typeof response.error).toBe("string");
    expect(response.error).toBe("裸字符串");
  });

  test("连续多条请求逐条回响应，不因上一条失败而吞掉下一条", () => {
    handler({ data: { type: "run", input: emptyInput() } });
    handler({ data: { type: "nope" } });
    handler({ data: { type: "run", input: emptyInput() } });

    expect(postMessage).toHaveBeenCalledTimes(3);
    expect(postMessage.mock.calls.map((call) => call[0].ok)).toEqual([true, false, true]);
  });
});
