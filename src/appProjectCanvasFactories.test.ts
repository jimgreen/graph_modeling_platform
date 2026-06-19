import { describe, expect, test, vi } from "vitest";

import { createLocateTopologyError } from "./appExtracted/appProjectCanvasFactories";
import type { TopologyValidationError } from "./model";

describe("createLocateTopologyError", () => {
  test("centers the explicit warning node instead of the first related node", () => {
    const targetNode = { id: "target-node", position: { x: 120, y: 240 } };
    const relatedNode = { id: "related-node", position: { x: 800, y: 900 } };
    const nodes = [targetNode, relatedNode];
    const edges = [{ id: "edge-1" }];
    const centerPoint = { x: 140, y: 260 };
    const scope = {
      activateInspectorFromCanvas: vi.fn(),
      activeLayerEdgeIdSet: new Set(["edge-1"]),
      activeLayerNodeIdSet: new Set(["target-node", "related-node"]),
      centerViewOnPoint: vi.fn(),
      centerViewOnPointAtZoom: vi.fn(),
      clearRecordSelection: vi.fn(),
      currentZoomPercent: 40,
      edges,
      getElementFocusPoint: vi.fn((element: { kind: string; id: string }) => (element.kind === "node" && element.id === "target-node" ? centerPoint : null)),
      nodeById: new Map(nodes.map((node) => [node.id, node])),
      nodes,
      setCanvasSelectionScope: vi.fn(),
      setInspectorTab: vi.fn(),
      setSelectedEdgeId: vi.fn(),
      setSelectedEdgeIds: vi.fn(),
      setSelectedNodeIds: vi.fn()
    };
    const error: TopologyValidationError = {
      id: "warning-1",
      type: "duplicate-device-name",
      message: "设备名称重复",
      nodeId: "target-node",
      edgeId: "edge-1",
      relatedNodeIds: ["related-node"]
    };

    createLocateTopologyError(scope)(error);

    expect(scope.getElementFocusPoint).toHaveBeenCalledWith({ kind: "node", id: "target-node" }, nodes, edges);
    expect(scope.centerViewOnPointAtZoom).toHaveBeenCalledWith(centerPoint, 120);
    expect(scope.centerViewOnPoint).not.toHaveBeenCalled();
    expect(scope.setCanvasSelectionScope).toHaveBeenCalledWith("group");
    expect(scope.setSelectedNodeIds).toHaveBeenCalledWith(["target-node"]);
    expect(scope.setSelectedEdgeId).toHaveBeenCalledWith("edge-1");
    expect(scope.setSelectedEdgeIds).toHaveBeenCalledWith(["edge-1"]);
    expect(scope.setInspectorTab).toHaveBeenCalledWith("device");
    expect(scope.clearRecordSelection).toHaveBeenCalled();
  });

  test("falls back to centering the warning edge when there is no node target", () => {
    const nodes: unknown[] = [];
    const edges = [{ id: "edge-1" }];
    const centerPoint = { x: 360, y: 420 };
    const scope = {
      activateInspectorFromCanvas: vi.fn(),
      activeLayerEdgeIdSet: new Set(["edge-1"]),
      activeLayerNodeIdSet: new Set<string>(),
      centerViewOnPoint: vi.fn(),
      centerViewOnPointAtZoom: vi.fn(),
      clearRecordSelection: vi.fn(),
      currentZoomPercent: 180,
      edges,
      getElementFocusPoint: vi.fn((element: { kind: string; id: string }) => (element.kind === "edge" && element.id === "edge-1" ? centerPoint : null)),
      nodeById: new Map(),
      nodes,
      setCanvasSelectionScope: vi.fn(),
      setInspectorTab: vi.fn(),
      setSelectedEdgeId: vi.fn(),
      setSelectedEdgeIds: vi.fn(),
      setSelectedNodeIds: vi.fn()
    };
    const error: TopologyValidationError = {
      id: "warning-2",
      type: "terminal-type-mismatch",
      message: "端子类型不匹配",
      edgeId: "edge-1",
      relatedNodeIds: []
    };

    createLocateTopologyError(scope)(error);

    expect(scope.getElementFocusPoint).toHaveBeenCalledWith({ kind: "edge", id: "edge-1" }, nodes, edges);
    expect(scope.centerViewOnPointAtZoom).toHaveBeenCalledWith(centerPoint, 180);
    expect(scope.centerViewOnPoint).not.toHaveBeenCalled();
    expect(scope.setSelectedNodeIds).toHaveBeenCalledWith([]);
    expect(scope.setSelectedEdgeId).toHaveBeenCalledWith("edge-1");
    expect(scope.setSelectedEdgeIds).toHaveBeenCalledWith(["edge-1"]);
    expect(scope.setInspectorTab).not.toHaveBeenCalled();
    expect(scope.clearRecordSelection).not.toHaveBeenCalled();
  });
});
