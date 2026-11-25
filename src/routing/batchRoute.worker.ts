/**
 * 批量布线避障重算与批量重绘 Web Worker 入口
 *
 * 将高边数移动后的 `rerouteEdgesAroundMovedNodes` 与全图/局部批量重绘
 * （`redrawConnectionRoutesForEdges` + `redrawRoutableLineDeviceRoutes`）
 * 卸载到常驻复用的后台工作线程，彻底消除大规模拓扑拖拽松手与重绘时的主线程卡顿。
 */
import {
  redrawConnectionRoutesForEdges,
  redrawRoutableLineDeviceRoutes,
  rerouteEdgesAroundMovedNodes
} from "../model-routing";
import type { BatchRouteWorkerRequest, BatchRouteWorkerResponse } from "./routeWorkerClient";

const workerScope = self as unknown as {
  onmessage: ((event: MessageEvent<BatchRouteWorkerRequest>) => void) | null;
  postMessage: (message: BatchRouteWorkerResponse) => void;
};

workerScope.onmessage = (event: MessageEvent<BatchRouteWorkerRequest>) => {
  const message = event.data;
  if (!message) {
    return;
  }

  if (message.type === "reroute-around-moved") {
    const { requestId, input } = message;
    try {
      const edges = rerouteEdgesAroundMovedNodes(
        input.nodes,
        input.edges,
        input.movedNodeIds,
        input.previousRoutes,
        input.bounds,
        input.forceEdgeIds,
        input.searchEdges,
        input.options
      );
      workerScope.postMessage({ type: "reroute-around-moved", requestId, ok: true, edges });
    } catch (error) {
      workerScope.postMessage({
        type: "reroute-around-moved",
        requestId,
        ok: false,
        error: error instanceof Error ? error.message : String(error)
      });
    }
    return;
  }

  if (message.type === "redraw-routes") {
    const { requestId, input } = message;
    try {
      const nextEdges =
        input.targetEdgeIds.length > 0
          ? redrawConnectionRoutesForEdges(input.nodes, input.edges, input.targetEdgeIds, input.bounds)
          : input.edges;
      const changedEdges = [];
      for (let index = 0; index < nextEdges.length; index += 1) {
        if (nextEdges[index] !== input.edges[index]) {
          changedEdges.push(nextEdges[index]);
        }
      }
      const changedLineNodes =
        input.targetLineNodeIds.length > 0
          ? redrawRoutableLineDeviceRoutes(input.nodes, input.targetLineNodeIds, input.bounds)
          : [];
      workerScope.postMessage({
        type: "redraw-routes",
        requestId,
        ok: true,
        changedEdges,
        changedLineNodes
      });
    } catch (error) {
      workerScope.postMessage({
        type: "redraw-routes",
        requestId,
        ok: false,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
};
