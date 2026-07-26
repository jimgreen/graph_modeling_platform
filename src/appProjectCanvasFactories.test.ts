import { describe, expect, test, vi } from "vitest";

import {
  createAutoSpreadCanvasGraphics,
  createCommitLayoutNodePositions,
  createHandlePointerMove,
  createLoadSavedProject
} from "./appExtracted/appProjectCanvasFactories";
import { clampCanvasNoScrollOffset } from "./canvasViewport";

function createLoadScope(overrides: Record<string, unknown> = {}) {
  const noop = vi.fn();
  return {
    CANVAS_INITIAL_LOD_NODE_DETAIL_LIMIT: 500,
    DEFAULT_CANVAS_BACKGROUND: "#ffffff",
    DEFAULT_CANVAS_HEIGHT: 800,
    DEFAULT_CANVAS_WIDTH: 1200,
    DEFAULT_CURRENT_UNIT: "A",
    DEFAULT_MODEL_LAYER_ID: "layer-default",
    DEFAULT_POWER_BASE_VALUE: 100,
    DEFAULT_POWER_UNIT: "MW",
    DEFAULT_VOLTAGE_UNIT: "kV",
    EMPTY_TOPOLOGY: {},
    INITIAL_TOPOLOGY_STATUS: { state: "idle" },
    assignMissingDeviceIndexes: (nodes: unknown[]) => ({ nodes, counters: {} }),
    cachedRoutedEdgesRef: { current: [] },
    canvasFrameRef: { current: null },
    clearNodeDragMoveSchedule: noop,
    clearRefreshRecoveryProject: noop,
    deferredMoveOptimizationCancelRef: { current: null },
    deferredRoutableLineRouteRepairCancelRef: { current: null },
    dragUndoCapturedRef: { current: false },
    draggingRef: { current: null },
    findSchemeForProject: () => undefined,
    fitWholeCanvasViewBox: () => ({ x: 0, y: 0, width: 1200, height: 800 }),
    hideImperativeMultiNodeDragOverlay: noop,
    lastBusTerminalSyncEndpointRevisionRef: { current: 0 },
    libraryTemplateByKind: new Map(),
    lockProjectEdgeTerminals: (project: unknown) => project,
    measurementConfig: { groupDefaults: {}, measurementTypes: [], deviceProfiles: [] },
    normalizeModelGroups: () => [],
    normalizeNodeTerminalsByTemplate: (node: unknown) => node,
    normalizeNodeTerminalsWithTemplate: (node: unknown) => node,
    normalizeProjectLayers: (project: any) => ({ ...project, layers: project.layers ?? [], activeLayerId: project.activeLayerId ?? "layer-default" }),
    normalizeProjectMeasurements: (measurements: unknown) => measurements,
    pendingBusTerminalSyncNodeIdsRef: { current: new Set() },
    pendingRouteEdgeIdsRef: { current: new Set() },
    pendingStoredRouteEdgeIdsRef: { current: new Set() },
    reconcileNodeWithDefinition: (node: unknown) => node,
    reconcileProjectMeasurementsWithConfig: (measurements: unknown) => measurements,
    requestCanvasFrameCenter: noop,
    resetConnectPreviewState: noop,
    resolveConfiguredBackgroundLayerIds: () => [],
    selectSingleProject: noop,
    setActiveLayerId: noop,
    setActiveProjectKey: noop,
    setActiveSchemeKey: noop,
    setAllowAutoExpandCanvas: noop,
    setBackgroundLayerIds: noop,
    setBackgroundProjectId: noop,
    setCanvasBackgroundColor: noop,
    setCanvasBackgroundImage: noop,
    setCanvasBackgroundImageAssetId: noop,
    setCanvasHeight: noop,
    setCanvasPanning: noop,
    setCanvasSelectionScope: noop,
    setCanvasVisibleViewBox: noop,
    setCanvasWidth: noop,
    setConnectSource: noop,
    setCurrentUnit: noop,
    setDeviceIndexCounters: noop,
    setDragging: noop,
    setGraphArrays: noop,
    setGroups: noop,
    setHasUnsavedChanges: noop,
    setInitialCanvasDetailHydrationLimit: noop,
    setInitialCanvasLodActive: noop,
    setLayers: noop,
    setManualPathDrag: noop,
    setMarquee: noop,
    setModifierSelectionPress: noop,
    setPowerBaseValue: noop,
    setPowerUnit: noop,
    setProjectMeasurements: noop,
    setProjectName: noop,
    setRewiring: noop,
    setRouteRenderingReady: noop,
    setSelectedEdgeId: noop,
    setSelectedEdgeIds: noop,
    setSelectedNodeIds: noop,
    setTerminalPress: noop,
    setTopology: noop,
    setTopologyErrors: noop,
    setTopologyStatus: noop,
    setTransformDrag: noop,
    setUndoStack: noop,
    setViewBox: noop,
    setVoltageUnit: noop,
    suppressNextGraphDirtyRef: { current: 0 },
    writeOperationLog: noop,
    ...overrides
  };
}

describe("saved project definition migration", () => {
  test("upgrades known nodes and measurements while preserving orphaned nodes", () => {
    const knownNode = {
      id: "known-node",
      kind: "known-device",
      name: "旧设备",
      position: { x: 10, y: 20 },
      size: { width: 40, height: 40 },
      terminals: [],
      params: {}
    };
    const orphanNode = {
      ...knownNode,
      id: "orphan-node",
      kind: "deleted-custom-device",
      name: "已删除定义的旧设备"
    };
    const migratedNode = { ...knownNode, size: { width: 120, height: 80 } };
    const storedMeasurements = { version: 1 as const, groups: [{ id: "old-measurement" }] };
    const migratedMeasurements = { version: 1 as const, groups: [{ id: "new-measurement" }] };
    const template = { kind: "known-device" };
    const reconcileNodeWithDefinition = vi.fn((node) => node.id === knownNode.id ? migratedNode : node);
    const reconcileProjectMeasurementsWithConfig = vi.fn(() => migratedMeasurements);
    const setGraphArrays = vi.fn();
    const setProjectMeasurements = vi.fn();
    const setHasUnsavedChanges = vi.fn();
    const scope = createLoadScope({
      libraryTemplateByKind: new Map([["known-device", template]]),
      reconcileNodeWithDefinition,
      reconcileProjectMeasurementsWithConfig,
      setGraphArrays,
      setHasUnsavedChanges,
      setProjectMeasurements
    });
    const loadSavedProject = createLoadSavedProject(scope as any);

    loadSavedProject({
      id: "project-1",
      name: "旧模型",
      project: {
        nodes: [knownNode, orphanNode],
        edges: [],
        groups: [],
        measurements: storedMeasurements,
        layers: [],
        activeLayerId: "layer-default"
      }
    } as any, "scheme-1");

    expect(reconcileNodeWithDefinition).toHaveBeenCalledTimes(1);
    expect(reconcileNodeWithDefinition).toHaveBeenCalledWith(knownNode, template);
    expect(setGraphArrays).toHaveBeenCalledWith([migratedNode, orphanNode], []);
    expect(reconcileProjectMeasurementsWithConfig).toHaveBeenCalledWith(
      storedMeasurements,
      [migratedNode, orphanNode],
      scope.measurementConfig
    );
    expect(setProjectMeasurements).toHaveBeenCalledWith(migratedMeasurements);
    expect(setHasUnsavedChanges).toHaveBeenLastCalledWith(true);
  });

  test("marks a loaded project dirty when legacy measurement storage is normalized", () => {
    const storedMeasurements = { version: 1 as const, groups: [{ id: "legacy", nodeId: "node-1", items: [] }] };
    const normalizedMeasurements = {
      version: 1 as const,
      groups: [{ id: "legacy", nodeId: "node-1", visible: true, items: [] }]
    };
    const setHasUnsavedChanges = vi.fn();
    const scope = createLoadScope({
      normalizeProjectMeasurements: vi.fn(() => normalizedMeasurements),
      reconcileProjectMeasurementsWithConfig: vi.fn((measurements) => measurements),
      setHasUnsavedChanges
    });

    createLoadSavedProject(scope as any)({
      id: "project-2",
      name: "旧量测模型",
      project: {
        nodes: [],
        edges: [],
        groups: [],
        measurements: storedMeasurements,
        layers: [],
        activeLayerId: "layer-default"
      }
    } as any, "scheme-1");

    expect(setHasUnsavedChanges).toHaveBeenLastCalledWith(true);
  });
});

describe("canvas panning", () => {
  test("converts drag distance beyond a scroll boundary into a visual canvas offset", () => {
    let scrollLeft = 400;
    let scrollTop = 0;
    const frame = {
      clientHeight: 800,
      clientWidth: 1200,
      scrollHeight: 2400,
      scrollWidth: 2800,
      get scrollLeft() {
        return scrollLeft;
      },
      set scrollLeft(value: number) {
        scrollLeft = Math.min(1600, Math.max(0, value));
      },
      get scrollTop() {
        return scrollTop;
      },
      set scrollTop(value: number) {
        scrollTop = Math.min(1600, Math.max(0, value));
      }
    };
    const applyCanvasPanningVisualOffset = vi.fn();
    const canvasFrameUserScrollRef = { current: false };
    const canvasNoScrollOffsetRef = { current: { x: 0, y: 0 } };
    const pendingCanvasNoScrollOffsetRef = { current: null as { x: number; y: number } | null };
    const skipNextCanvasScrollSyncRef = { current: false };
    const scope = {
      applyCanvasPanningVisualOffset,
      canvasFrameRef: { current: frame },
      canvasFrameUserScrollRef,
      canvasNoScrollOffsetRef,
      clampCanvasNoScrollOffsetPoint: (offset: { x: number; y: number }) => ({
        x: clampCanvasNoScrollOffset(offset.x, 2000, frame.clientWidth, 400, true),
        y: clampCanvasNoScrollOffset(offset.y, 1800, frame.clientHeight, 270, true)
      }),
      panning: null,
      panningRef: {
        current: {
          canvasOffset: { x: 0, y: 0 },
          clientX: 500,
          clientY: 200,
          horizontalScrollMode: true,
          scrollLeft: 400,
          scrollTop: 0,
          verticalScrollMode: true,
          viewBox: { x: 0, y: 0, width: 1200, height: 800 }
        }
      },
      pendingCanvasNoScrollOffsetRef,
      skipNextCanvasScrollSyncRef,
      staticButtonPointerRef: { current: null },
      svgRef: { current: {} }
    };

    createHandlePointerMove(scope as any)({ clientX: 500, clientY: 320 } as any);

    expect(frame.scrollTop).toBe(0);
    expect(pendingCanvasNoScrollOffsetRef.current).toEqual({ x: 0, y: 120 });
    expect(canvasNoScrollOffsetRef.current).toEqual({ x: 0, y: 120 });
    expect(applyCanvasPanningVisualOffset).toHaveBeenCalledWith({ x: 0, y: 120 });
    expect(canvasFrameUserScrollRef.current).toBe(true);
    expect(skipNextCanvasScrollSyncRef.current).toBe(true);

    createHandlePointerMove(scope as any)({ clientX: 500, clientY: 200 } as any);

    expect(pendingCanvasNoScrollOffsetRef.current).toEqual({ x: 0, y: 0 });
    expect(skipNextCanvasScrollSyncRef.current).toBe(false);
  });
});

describe("automatic canvas layout", () => {
  test("keeps the current canvas bounds when a layout commit requests preservation", () => {
    const originalNode = {
      id: "node-1",
      kind: "device",
      position: { x: 100, y: 100 }
    };
    const movedNode = {
      ...originalNode,
      position: { x: 960, y: 760 }
    };
    const canvasBounds = { width: 1000, height: 800 };
    const expandedCanvasBounds = { width: 1200, height: 1000 };
    const applyCanvasBounds = vi.fn();
    const canvasBoundsForAutoExpandedGraphContent = vi.fn(() => expandedCanvasBounds);
    const commitFastMovedGraphPatches = vi.fn();
    const scope = {
      CANVAS_AUTO_EXPAND_PADDING: 40,
      adjustEdgesAfterNodeMove: vi.fn(),
      applyCanvasBounds,
      canvasBounds,
      canvasBoundsForAutoExpandedGraphContent,
      commitFastMovedGraphPatches,
      currentStoredRoutePointsForEdge: vi.fn(),
      edgeListForNodeIds: () => [],
      edges: [],
      finalizeMovedNodeEdgesFast: vi.fn(),
      isRoutableLineDeviceKind: () => false,
      mergeNodeUpdateLists: vi.fn(),
      nodeById: new Map([[originalNode.id, originalNode]]),
      nodes: [originalNode],
      orderedNodeFromList: (items: Array<{ id: string }>, id: string) => items.find((item) => item.id === id),
      pushUndoSnapshot: vi.fn(),
      readjustMovedBusConnectionRoutes: vi.fn(),
      realignRoutableLineDeviceBusEndpointPoints: vi.fn(),
      redrawRoutableLineDeviceRoutes: vi.fn(),
      rejectAutoCanvasExpansionForContent: () => false,
      routableLineIdsConnectedToNodeIds: () => new Set<string>(),
      snapshotEdgePoints: () => ({}),
      undoScopeForGraphPatch: vi.fn()
    };

    const movedCount = createCommitLayoutNodePositions(scope as any)(
      [originalNode.id],
      [movedNode] as any,
      { preserveCanvasBounds: true }
    );

    expect(movedCount).toBe(1);
    expect(canvasBoundsForAutoExpandedGraphContent).not.toHaveBeenCalled();
    expect(applyCanvasBounds).not.toHaveBeenCalled();
    expect(commitFastMovedGraphPatches).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.anything(),
      canvasBounds
    );
  });

  test("automatic spread preserves the existing canvas bounds", () => {
    const nodes = [
      { id: "node-1", kind: "device", position: { x: 100, y: 100 } },
      { id: "node-2", kind: "device", position: { x: 100, y: 100 } }
    ];
    const arranged = [
      nodes[0],
      { ...nodes[1], position: { x: 160, y: 100 } }
    ];
    const layoutUnits = nodes.map((node) => ({ nodeIds: [node.id] }));
    const commitLayoutNodePositions = vi.fn(() => 1);
    const scope = {
      activeLayerEdges: [],
      activeLayerGroups: [],
      activeLayerNodes: nodes,
      autoSpreadNodeLayoutUnits: vi.fn(() => arranged),
      buildCanvasLayoutUnits: vi.fn(() => layoutUnits),
      canvasBounds: { width: 1000, height: 800 },
      commitLayoutNodePositions,
      includeMeasurementGroupBounds: vi.fn(),
      isCanvasNodeMovable: () => true,
      nodes,
      requireEditMode: () => true,
      routedEdges: [],
      writeOperationLog: vi.fn()
    };

    createAutoSpreadCanvasGraphics(scope as any)();

    expect(commitLayoutNodePositions).toHaveBeenCalledWith(
      ["node-1", "node-2"],
      arranged,
      { preserveCanvasBounds: true }
    );
  });

  test("automatic spread independently moves overlapping measurement boxes before arranging devices", () => {
    const nodes = [
      { id: "node-1", kind: "device", position: { x: 100, y: 100 } },
      { id: "node-2", kind: "device", position: { x: 260, y: 100 } },
      { id: "line-1", kind: "line", position: { x: 420, y: 100 } }
    ];
    const measurementGroup = {
      id: "measurement-1",
      nodeId: "node-1",
      visible: true,
      anchor: "bottom",
      offset: { x: 0, y: 20 },
      layout: "vertical",
      items: []
    };
    const projectMeasurements = { version: 1, groups: [measurementGroup] };
    const baseLayoutUnits = nodes.slice(0, 2).map((node, index) => ({
      id: `node:${node.id}`,
      kind: "node",
      nodeIds: [node.id],
      edgeIds: [],
      bounds: { left: 70 + index * 160, right: 130 + index * 160, top: 70, bottom: 130 },
      layoutBounds: { left: 75 + index * 160, right: 125 + index * 160, top: 75, bottom: 125 },
      collisionRects: [{ left: 70 + index * 160, right: 130 + index * 160, top: 70, bottom: 130 }]
    }));
    const finalLayoutUnits = baseLayoutUnits.map((unit) => ({ ...unit }));
    const nodeVisualRects = [
      { left: 68, right: 142, top: 66, bottom: 154 },
      { left: 226, right: 306, top: 68, bottom: 158 },
      { left: 372, right: 468, top: 52, bottom: 166 }
    ];
    const buildCanvasLayoutUnits = vi.fn()
      .mockReturnValueOnce(baseLayoutUnits)
      .mockReturnValueOnce(finalLayoutUnits);
    const autoSpreadMovableRects = vi.fn()
      .mockReturnValueOnce(new Map([[measurementGroup.id, { x: 0, y: 36 }]]))
      .mockReturnValueOnce(new Map([[measurementGroup.id, { x: 18, y: 0 }]]));
    const autoSpreadNodeLayoutUnits = vi.fn(() => nodes);
    const commitLayoutNodePositions = vi.fn(() => 1);
    const pushUndoSnapshot = vi.fn();
    let measurementState = projectMeasurements;
    const setProjectMeasurements = vi.fn((next) => {
      measurementState = typeof next === "function" ? next(measurementState) : next;
    });
    let scheduledReflow: (() => void) | null = null;
    const scheduleIdleWork = vi.fn((callback: () => void) => {
      scheduledReflow = callback;
      return vi.fn();
    });
    const writeOperationLog = vi.fn();
    const scope = {
      activeLayerEdges: [],
      activeLayerGroups: [],
      activeLayerNodes: nodes,
      autoSpreadMovableRects,
      autoSpreadNodeLayoutUnits,
      buildCanvasLayoutUnits,
      calculateNodeVisualBounds: vi.fn((node: { id: string }) =>
        node.id === "node-1" ? nodeVisualRects[0] : node.id === "node-2" ? nodeVisualRects[1] : nodeVisualRects[2]
      ),
      canvasBounds: { width: 1000, height: 800 },
      cachedRoutedEdgesRef: { current: [] },
      commitLayoutNodePositions,
      isCanvasNodeMovable: (kind: string) => kind !== "line",
      latestGraphStoreRef: { current: { nodes } },
      measurementGroupCanvasPosition: (_node: unknown, group: { offset: { x: number; y: number } }) => ({
        x: 100 + group.offset.x * 2,
        y: 68 + group.offset.y * 3
      }),
      measurementGroupRenderMetrics: () => ({ width: 80, height: 32 }),
      measurementGroupsForNode: (_measurements: unknown, nodeId: string) =>
        nodeId === measurementGroup.nodeId ? [measurementGroup] : [],
      measurementOffsetScaleForNode: () => ({ x: 2, y: 3 }),
      nodes,
      projectMeasurements,
      pushUndoSnapshot,
      requireEditMode: () => true,
      routedEdges: [],
      scheduleIdleWork,
      setProjectMeasurements,
      writeOperationLog
    };

    createAutoSpreadCanvasGraphics(scope as any)();

    expect(autoSpreadMovableRects).toHaveBeenCalledWith(
      [{
        id: measurementGroup.id,
        rect: { left: 60, right: 140, top: 112, bottom: 144 }
      }],
      nodeVisualRects,
      { padding: 4, bounds: scope.canvasBounds }
    );
    const finalBuildOptions = buildCanvasLayoutUnits.mock.calls[1][6];
    expect(finalBuildOptions.extraBoundsByNodeId.get("node-1")).toEqual([
      { left: 60, right: 140, top: 148, bottom: 180 }
    ]);
    expect(measurementState).toEqual({
      version: 1,
      groups: [{
        ...measurementGroup,
        anchor: "custom",
        offset: { x: 0, y: 32 }
      }]
    });
    expect(pushUndoSnapshot).not.toHaveBeenCalled();
    expect(autoSpreadNodeLayoutUnits).toHaveBeenCalledWith(
      nodes,
      finalLayoutUnits,
      { padding: 4, bounds: scope.canvasBounds, avoidRects: [nodeVisualRects[2]] }
    );
    expect(commitLayoutNodePositions).toHaveBeenCalledWith(
      ["node-1", "node-2"],
      nodes,
      { preserveCanvasBounds: true }
    );
    expect(writeOperationLog).toHaveBeenCalledWith("自动散开 1 个图元，调整 1 个量测框");
    expect(scheduleIdleWork).toHaveBeenCalledWith(expect.any(Function), 240, 2000);

    (scheduledReflow as (() => void) | null)?.();

    expect(measurementState).toEqual({
      version: 1,
      groups: [{
        ...measurementGroup,
        anchor: "custom",
        offset: { x: 9, y: 32 }
      }]
    });
    expect(pushUndoSnapshot).not.toHaveBeenCalled();
  });
});
