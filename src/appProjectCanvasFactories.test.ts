import { describe, expect, test, vi } from "vitest";

import { createLoadSavedProject } from "./appExtracted/appProjectCanvasFactories";

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
