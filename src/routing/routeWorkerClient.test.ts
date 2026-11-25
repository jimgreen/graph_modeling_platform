import { afterEach, describe, expect, it, vi } from "vitest";
import {
  BATCH_ROUTE_WORKER_EDGE_THRESHOLD,
  disposeSharedBatchRouteWorker,
  runBatchRedrawRoutesInWorker,
  runBatchRerouteInWorker,
  shouldOffloadBatchRerouteToWorker,
  type BatchRerouteInput
} from "./routeWorkerClient";

function sampleInput(): BatchRerouteInput {
  return {
    nodes: [],
    edges: [],
    movedNodeIds: [],
    previousRoutes: [],
    forceEdgeIds: [],
    searchEdges: []
  };
}

describe("routeWorkerClient 批量布线 Worker 客户端", () => {
  afterEach(() => {
    disposeSharedBatchRouteWorker();
  });

  it("在 Node/无 Worker 环境下自动降级同步执行并返回结果", async () => {
    expect(shouldOffloadBatchRerouteToWorker(BATCH_ROUTE_WORKER_EDGE_THRESHOLD)).toBe(false);
    const result = await runBatchRerouteInWorker(sampleInput());
    expect(result).toEqual([]);

    const redrawResult = await runBatchRedrawRoutesInWorker({
      nodes: [],
      edges: [],
      targetEdgeIds: [],
      targetLineNodeIds: []
    });
    expect(redrawResult).toEqual({ changedEdges: [], changedLineNodes: [] });
  });

  it("支持传入自定义 workerFactory 并校验 requestId 结算与自动 terminate", async () => {
    const terminate = vi.fn();
    const fakeWorker: any = {
      onmessage: null,
      onerror: null,
      terminate,
      postMessage(msg: any) {
        queueMicrotask(() => {
          fakeWorker.onmessage?.({
            data: { type: "reroute-around-moved", requestId: msg.requestId, ok: true, edges: [{ id: "e-ok" }] }
          });
        });
      }
    };

    const edges = await runBatchRerouteInWorker(sampleInput(), {
      workerFactory: () => fakeWorker
    });
    expect(edges).toEqual([{ id: "e-ok" }]);
    expect(terminate).toHaveBeenCalledTimes(1);
  });

  it("常驻复用模式下连续两次请求复用同一个热 Worker，仅创建一次线程", async () => {
    let createdCount = 0;
    const terminate = vi.fn();
    const workerFactory = () => {
      createdCount += 1;
      const fakeWorker: any = {
        onmessage: null,
        onerror: null,
        terminate,
        postMessage(msg: any) {
          queueMicrotask(() => {
            if (msg.type === "redraw-routes") {
              fakeWorker.onmessage?.({
                data: {
                  type: "redraw-routes",
                  requestId: msg.requestId,
                  ok: true,
                  changedEdges: [{ id: "e-redrawn" }],
                  changedLineNodes: []
                }
              });
            } else {
              fakeWorker.onmessage?.({
                data: { type: "reroute-around-moved", requestId: msg.requestId, ok: true, edges: [{ id: "e-1" }] }
              });
            }
          });
        }
      };
      return fakeWorker;
    };

    const first = await runBatchRerouteInWorker(sampleInput(), {
      workerFactory,
      reuseSharedWorker: true,
      idleDisposeMs: 60_000
    });
    const second = await runBatchRedrawRoutesInWorker(
      { nodes: [], edges: [], targetEdgeIds: ["e-redrawn"], targetLineNodeIds: [] },
      { workerFactory, reuseSharedWorker: true, idleDisposeMs: 60_000 }
    );

    expect(first).toEqual([{ id: "e-1" }]);
    expect(second).toEqual({ changedEdges: [{ id: "e-redrawn" }], changedLineNodes: [] });
    expect(createdCount).toBe(1);
    expect(terminate).not.toHaveBeenCalled();

    disposeSharedBatchRouteWorker();
    expect(terminate).toHaveBeenCalledTimes(1);
  });

  it("AbortSignal 触发时立即终止 Worker 并抛出 AbortError", async () => {
    const controller = new AbortController();
    const terminate = vi.fn();
    const fakeWorker: any = {
      onmessage: null,
      onerror: null,
      terminate,
      postMessage() {
        // 永不回复，模拟长计算中被新操作取消
      }
    };

    const pending = runBatchRerouteInWorker(sampleInput(), {
      signal: controller.signal,
      workerFactory: () => fakeWorker,
      timeoutMs: 5_000
    });
    controller.abort();

    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
    expect(terminate).toHaveBeenCalledTimes(1);
  });

  it("Worker 超时未返回时自动终止并报错", async () => {
    const terminate = vi.fn();
    const fakeWorker: any = {
      onmessage: null,
      onerror: null,
      terminate,
      postMessage() {}
    };

    await expect(
      runBatchRerouteInWorker(sampleInput(), {
        workerFactory: () => fakeWorker,
        timeoutMs: 25
      })
    ).rejects.toThrow(/未响应/);
    expect(terminate).toHaveBeenCalledTimes(1);
  });
});
