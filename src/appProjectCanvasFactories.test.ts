import { describe, expect, test, vi } from "vitest";

import {
  createAutoSpreadCanvasGraphics,
  createCommitLayoutNodePositions,
  createFinishConnectToTarget,
  createFinishRoutableLineEndpointDrag,
  createHandlePointerMove,
  createLoadSavedProject,
  createRequestUnsavedChangeAction,
  createResolveUnsavedChangeAction,
  createRunTopologyCalculation,
  createSaveCurrentProject
} from "./appExtracted/appProjectCanvasFactories";
import { clampCanvasNoScrollOffset } from "./canvasViewport";
import { DEVICE_LIBRARY_BY_KIND, canConnectTerminals, createDefaultNode, getNodeScaleX, getNodeScaleY, getTerminalPoint, isBusNode, isLineSegmentBusNode } from "./model";
import { GLOBAL_LINE_ID_PARAM } from "./global-lines";
import { resizeLineSegmentBusGeometryFromHandleDrag } from "./transformUtils";

describe("跨模型告警定位的未保存修改衔接", () => {
  test("当前模型无未保存修改时，加载目标模型后执行定位回调", async () => {
    const onLoaded = vi.fn();
    const loadSavedProjectRecord = vi.fn().mockResolvedValue(true);
    const request = createRequestUnsavedChangeAction({
      enterBrowseMode: vi.fn(),
      loadSavedProjectRecord,
      saveRequired: false,
      setPendingUnsavedAction: vi.fn()
    });
    const project = {
      id: "station-1",
      name: "中心厂站",
      updatedAt: "2026-08-17T00:00:00.000Z",
      project: { version: 1, name: "中心厂站", nodes: [], edges: [] }
    };

    request({
      kind: "load-project",
      project,
      schemeId: "scheme-1",
      label: "切换并定位",
      onLoaded
    });

    await vi.waitFor(() => expect(onLoaded).toHaveBeenCalledOnce());
    expect(loadSavedProjectRecord).toHaveBeenCalledWith(project, "scheme-1");
  });

  test("用户保存或放弃当前修改后，加载目标模型并执行定位回调", async () => {
    const onLoaded = vi.fn();
    const loadSavedProjectRecord = vi.fn().mockResolvedValue(true);
    const action = {
      kind: "load-project" as const,
      project: {
        id: "feeder-1",
        name: "一号馈线",
        updatedAt: "2026-08-17T00:00:00.000Z",
        project: { version: 1 as const, name: "一号馈线", nodes: [], edges: [] }
      },
      schemeId: "scheme-1",
      label: "切换并定位",
      onLoaded
    };
    const setPendingUnsavedAction = vi.fn();
    const resolve = createResolveUnsavedChangeAction({
      enterBrowseMode: vi.fn(),
      loadSavedProjectRecord,
      pendingUnsavedAction: action,
      saveCurrentProject: vi.fn().mockResolvedValue(true),
      setPendingUnsavedAction
    });

    await resolve("discard");

    expect(loadSavedProjectRecord).toHaveBeenCalledWith(action.project, "scheme-1");
    expect(onLoaded).toHaveBeenCalledOnce();
    expect(setPendingUnsavedAction).toHaveBeenCalledWith(null);
  });
});

describe("线路端点调整的本图/全局维护方式切换", () => {
  function transitionScope(direction: "local-to-global" | "global-to-local") {
    const boundary = createDefaultNode("static-model-interaction-station", { x: 300, y: 0 });
    const ordinaryA = createDefaultNode("ac-source", { x: 0, y: 0 });
    const ordinaryB = createDefaultNode("ac-load", { x: 200, y: 0 });
    const target = direction === "local-to-global" ? boundary : ordinaryB;
    const line = createDefaultNode("ac-routable-line", { x: 100, y: 0 });
    line.params = {
      ...line.params,
      _routableLineSourceNodeId: ordinaryA.id,
      _routableLineTargetNodeId: direction === "global-to-local" ? boundary.id : ordinaryB.id,
      ...(direction === "global-to-local" ? { [GLOBAL_LINE_ID_PARAM]: "global-line-1", idx: "8" } : { idx: "2" })
    };
    const routedLine = {
      ...line,
      params: {
        ...line.params,
        _routableLineTargetNodeId: target.id
      }
    };
    const patchGraphNodes = vi.fn();
    const requestGlobalLineTransition = vi.fn();
    const setRoutableLineEndpointDrag = vi.fn();
    const nodes = [ordinaryA, ordinaryB, boundary, line];
    return {
      line,
      routedLine,
      patchGraphNodes,
      requestGlobalLineTransition,
      setRoutableLineEndpointDrag,
      finish: createFinishRoutableLineEndpointDrag({
        canvasBounds: { width: 1000, height: 800 },
        connectTargetPoint: () => ({ x: 200, y: 0 }),
        modelType: "厂站",
        nodeById: new Map(nodes.map((node) => [node.id, node])),
        nodes,
        patchGraphNodes,
        pushUndoSnapshot: vi.fn(),
        requestGlobalLineTransition,
        routableLineDeviceCanvasPoints: () => [{ x: 0, y: 0 }, { x: 100, y: 0 }],
        routableLineDeviceEndpointRefForNode: (node: any) => ({ nodeId: node.id }),
        routableLineDeviceEndpointRefs: () => ({ source: { nodeId: ordinaryA.id }, target: { nodeId: line.params._routableLineTargetNodeId } }),
        routableLineEndpointDrag: { nodeId: line.id, endpoint: "target", dropTarget: { node: target, terminalId: target.terminals[0]?.id ?? "t1" } },
        setCanvasSelectionScope: vi.fn(),
        setRoutableLineDeviceEndpointsPreservingRoute: () => routedLine,
        setRoutableLineEndpointDrag,
        setSelectedEdgeId: vi.fn(),
        setSelectedEdgeIds: vi.fn(),
        setSelectedNodeIds: vi.fn(),
        writeOperationLog: vi.fn()
      })
    };
  }

  test("本图线路接到边界设备时暂停提交并请求确认切换为全局维护", () => {
    const scope = transitionScope("local-to-global");
    scope.finish();
    expect(scope.requestGlobalLineTransition).toHaveBeenCalledWith(scope.line, scope.routedLine, "local-to-global");
    expect(scope.patchGraphNodes).not.toHaveBeenCalled();
    expect(scope.setRoutableLineEndpointDrag).toHaveBeenCalledWith(null);
  });

  test("全局线路脱离最后一个边界设备时暂停提交并请求确认切换为本图维护", () => {
    const scope = transitionScope("global-to-local");
    scope.finish();
    expect(scope.requestGlobalLineTransition).toHaveBeenCalledWith(scope.line, scope.routedLine, "global-to-local");
    expect(scope.patchGraphNodes).not.toHaveBeenCalled();
    expect(scope.setRoutableLineEndpointDrag).toHaveBeenCalledWith(null);
  });

  test("全局线路首末端都已关联时禁止把当前边界端改接到另一个边界设备并提示先删除另一端", () => {
    const boundaryA = createDefaultNode("static-model-interaction-station", { x: 300, y: 0 });
    const boundaryB = createDefaultNode("static-model-interaction-feeder", { x: 400, y: 0 });
    const ordinary = createDefaultNode("ac-source", { x: 0, y: 0 });
    const line = createDefaultNode("ac-routable-line", { x: 100, y: 0 });
    line.params = {
      ...line.params,
      _routableLineSourceNodeId: ordinary.id,
      _routableLineTargetNodeId: boundaryA.id,
      [GLOBAL_LINE_ID_PARAM]: "global-line-full",
      idx: "18"
    };
    const routedLine = {
      ...line,
      params: { ...line.params, _routableLineTargetNodeId: boundaryB.id }
    };
    const nodes = [ordinary, boundaryA, boundaryB, line];
    const patchGraphNodes = vi.fn();
    const setRoutableLineEndpointDrag = vi.fn();
    const conflictMessage = "该全局线路首末端都已关联，请先删除另一端关联，再调整本端。";
    const globalLineBoundaryAdjustmentConflictMessage = vi.fn(() => conflictMessage);
    const showGlobalMessage = vi.fn();
    (globalThis as any).showGlobalMessage = showGlobalMessage;

    createFinishRoutableLineEndpointDrag({
      canvasBounds: { width: 1000, height: 800 },
      connectTargetPoint: () => ({ x: 400, y: 0 }),
      globalLineBoundaryAdjustmentConflictMessage,
      modelType: "厂站",
      nodeById: new Map(nodes.map((node) => [node.id, node])),
      nodes,
      patchGraphNodes,
      pushUndoSnapshot: vi.fn(),
      requestGlobalLineTransition: vi.fn(),
      routableLineDeviceCanvasPoints: () => [{ x: 0, y: 0 }, { x: 300, y: 0 }],
      routableLineDeviceEndpointRefForNode: (node: any) => ({ nodeId: node.id }),
      routableLineDeviceEndpointRefs: () => ({ source: { nodeId: ordinary.id }, target: { nodeId: boundaryA.id } }),
      routableLineEndpointDrag: { nodeId: line.id, endpoint: "target", dropTarget: { node: boundaryB, terminalId: boundaryB.terminals[0]?.id ?? "t1" } },
      setCanvasSelectionScope: vi.fn(),
      setRoutableLineDeviceEndpointsPreservingRoute: () => routedLine,
      setRoutableLineEndpointDrag,
      setSelectedEdgeId: vi.fn(),
      setSelectedEdgeIds: vi.fn(),
      setSelectedNodeIds: vi.fn(),
      writeOperationLog: vi.fn()
    })();

    expect(globalLineBoundaryAdjustmentConflictMessage).toHaveBeenCalledWith(line, routedLine);
    expect(showGlobalMessage).toHaveBeenCalledWith(conflictMessage);
    expect(patchGraphNodes).not.toHaveBeenCalled();
    expect(setRoutableLineEndpointDrag).toHaveBeenCalledWith(null);
  });
});

describe("普通联络线手势连接全局线路边界", () => {
  function connectionScope(modelType: "厂站" | "其他") {
    const source = createDefaultNode("ac-source", { x: 100, y: 200 });
    const target = createDefaultNode("ac-station-source", { x: 500, y: 200 });
    const manualPoints = [{ x: 260, y: 140 }, { x: 420, y: 140 }];
    const commitNewConnectionEdge = vi.fn(() => true);
    const requestGlobalLinePlacement = vi.fn(() => true);
    const resetConnectPreviewState = vi.fn();
    const setConnectSource = vi.fn();
    const connectSource = {
      nodeId: source.id,
      terminalId: source.terminals[0].id,
      manualPoints
    };
    const finish = createFinishConnectToTarget({
      busAnchorFromPoint: vi.fn(),
      canConnectTerminals,
      commitNewConnectionEdge,
      connectPreviewPointRef: { current: getTerminalPoint(target, target.terminals[0].id) },
      connectSource,
      getTerminalPoint,
      isBusNode,
      libraryTemplateByKind: DEVICE_LIBRARY_BY_KIND,
      modelType,
      requestGlobalLinePlacement,
      resetConnectPreviewState,
      setConnectSource,
      visibleNodeById: new Map([[source.id, source], [target.id, target]]),
      writeOperationLog: vi.fn()
    });
    return {
      source,
      target,
      manualPoints,
      commitNewConnectionEdge,
      requestGlobalLinePlacement,
      resetConnectPreviewState,
      setConnectSource,
      finish
    };
  }

  test("厂站模型中连接厂站电源时改为创建全局交流线路并弹出配置窗口", () => {
    const scope = connectionScope("厂站");
    const target = { node: scope.target, terminalId: scope.target.terminals[0].id };

    expect(scope.finish(target)).toBe(true);
    expect(scope.requestGlobalLinePlacement).toHaveBeenCalledWith(
      DEVICE_LIBRARY_BY_KIND.get("ac-routable-line"),
      expect.objectContaining({ node: scope.source, terminalId: scope.source.terminals[0].id }),
      expect.objectContaining({ node: scope.target, terminalId: scope.target.terminals[0].id }),
      scope.manualPoints
    );
    expect(scope.commitNewConnectionEdge).not.toHaveBeenCalled();
    expect(scope.setConnectSource).toHaveBeenCalledWith(null);
    expect(scope.resetConnectPreviewState).toHaveBeenCalledOnce();
  });

  test("非厂站馈线台区模型仍保留普通联络线行为", () => {
    const scope = connectionScope("其他");
    const target = { node: scope.target, terminalId: scope.target.terminals[0].id };

    expect(scope.finish(target)).toBe(true);
    expect(scope.requestGlobalLinePlacement).not.toHaveBeenCalled();
    expect(scope.commitNewConnectionEdge).toHaveBeenCalledOnce();
  });
});

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
    setProjectIdx: noop,
    setProjectName: noop,
    setRewiring: noop,
    setRouteRenderingReady: noop,
    setSelectedEdgeId: noop,
    setSelectedEdgeIds: noop,
    setSelectedNodeIds: noop,
    setFeeder: noop,
    setModelType: noop,
    setSubcontrolarea: noop,
    setSubstation: noop,
    setTaiqu: noop,
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

describe("save current project E export options", () => {
  test("uses the configured E interface field order when generating saved artifacts", async () => {
    const noop = vi.fn();
    const project = { version: 1, name: "模型一", nodes: [], edges: [] };
    const projectRecord = { id: "project-1", name: "模型一", project };
    const scheme = { id: "scheme-1", name: "方案一", projects: [projectRecord], children: [] };
    let generatedExportOptions: any;
    const saveCurrentProject = createSaveCurrentProject({
      activeProjectKey: "project-1",
      activeSchemeKey: "scheme-1",
      backgroundPageRender: null,
      buildEFileExport: vi.fn((_project: any, _path: string[], options: any) => {
        generatedExportOptions = options;
        return { filename: "模型一.e", text: "", mime: "text/plain" };
      }),
      buildSvgDocument: vi.fn(() => "<svg/>"),
      clearRefreshRecoveryProject: noop,
      colorPalette: {},
      createSavedProject: vi.fn(),
      currentGraphDirtyBaseline: () => "baseline",
      currentProject: () => project,
      DEFAULT_CANVAS_BACKGROUND: "#ffffff",
      deferredMoveOptimizationCancelRef: { current: null },
      deferredRoutableLineRouteRepairCancelRef: { current: null },
      eDeviceDefinitionClassExportEnabled: { ACGenerator: true },
      eDeviceDefinitionFieldOrder: { ACGenerator: ["dev_type", "name", "idx"] },
      eDeviceDefinitionLabels: { ACGenerator: "ACGenerator" },
      findProjectRecordByNameInScheme: vi.fn(),
      findSavedSchemeById: vi.fn(),
      findSchemeForProject: () => scheme,
      getEExportWarnings: vi.fn(() => []),
      graphDirtyBaselineRef: { current: null },
      libraryTemplates: [{
        kind: "ac-source",
        label: "交流电源",
        categoryLibrary: "交流设备",
        size: { width: 84, height: 56 },
        params: {},
        terminalType: "ac",
        terminalCount: 1
      }],
      loadSvgImageExportPathById: async () => ({}),
      measurementConfig: undefined,
      PARAM_LABELS: {},
      projectById: new Map([["project-1", projectRecord]]),
      projectMeasurements: undefined,
      projectName: "模型一",
      rememberPersistedSchemesPayload: noop,
      requireEditMode: () => true,
      resolveTemplateComponentLibrary: () => "ACGenerator",
      saveActiveProjectPointer: noop,
      saveBackendProjectRecord: vi.fn(async () => projectRecord),
      savedSchemePathForId: () => ["方案一"],
      savedUndoStackLengthRef: { current: 0 },
      undoStack: [],
      schemePathForScheme: () => ["方案一"],
      schemes: [scheme],
      selectedSchemeId: "scheme-1",
      serializeSchemesForStorage: () => "{}",
      setActiveProjectKey: noop,
      setActiveSchemeKey: noop,
      setHasUnsavedChanges: noop,
      setProjectName: noop,
      setSchemes: noop,
      suppressNextGraphDirtyRef: { current: 0 },
      upsertSavedProjectInScheme: () => [scheme],
      writeOperationLog: noop
    });

    await expect(saveCurrentProject()).resolves.toBe(true);

    const generatorDefinition = generatedExportOptions.interfaceDefinitions.find(
      (definition: any) => definition.componentLibrary === "ACGenerator"
    );
    expect(generatorDefinition.fields.slice(0, 3).map((field: any) => field.sourceName)).toEqual([
      "dev_type",
      "name",
      "idx"
    ]);
  });
});

describe("saved project definition migration", () => {
  test("keeps the loaded project clean after automatic definition and measurement migration", () => {
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
    expect(setHasUnsavedChanges).toHaveBeenLastCalledWith(false);
  });

  test("keeps the loaded project clean when legacy measurement storage is normalized", () => {
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

    expect(setHasUnsavedChanges).toHaveBeenLastCalledWith(false);
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

describe("line-segment bus pointer resizing", () => {
  test.each([false, true])(
    "commits bus dimensions and position while leaving transform scale unchanged (shift=%s)",
    (shiftKey) => {
    const node = {
      ...createDefaultNode("ac-bus", { x: 100, y: 100 }),
      size: { width: 120, height: 28 },
      scale: 1.25,
      scaleX: 1,
      scaleY: 1
    };
    const graphStore = {
      nodeMap: new Map([[node.id, node]]),
      nodes: [node]
    };
    const patchGraphNodes = vi.fn();
    const setTransformDrag = vi.fn();
    const transformDrag = {
      kind: "scale-x",
      nodeId: node.id,
      originalNode: {
        position: { ...node.position },
        rotation: node.rotation,
        scale: node.scale,
        scaleX: node.scaleX,
        scaleY: node.scaleY
      },
      originalSize: { ...node.size },
      startPoint: { x: 174, y: 100 },
      handleXDirection: 1,
      handleYDirection: 0,
      historyCaptured: false
    };
    const scope = {
      buildRoutableLineEndpointPreviewNodeUpdates: () => [],
      clampPointToCanvas: (point: unknown) => point,
      connectSource: null,
      contextMarqueeSelectionRef: { current: null },
      draggingRef: { current: null },
      getNodeScaleX,
      getNodeScaleY,
      graphStore,
      isBusNode: () => true,
      isGroupTransformDrag: (drag: object) => "groupId" in drag,
      isLineSegmentBusNode,
      lastCanvasClientPointerRef: { current: null },
      lastCanvasPointerRef: { current: null },
      lastRawCanvasPointerRef: { current: null },
      latestGraphStoreRef: { current: graphStore },
      libraryPlacement: null,
      manualPathDrag: null,
      marquee: null,
      modifierSelectionPressRef: { current: null },
      nodeLabelDrag: null,
      nodeLabelRotateDrag: null,
      panning: null,
      panningRef: { current: null },
      patchGraphNodes,
      pushUndoSnapshot: vi.fn(),
      resizeLineSegmentBusGeometryFromHandleDrag,
      rewiring: null,
      routableLineEndpointDrag: null,
      routableLinePlacement: null,
      screenToSvgPoint: (_svg: unknown, x: number, y: number) => ({ x, y }),
      setTransformDrag,
      signedScaleFromRotatedHandleDelta: vi.fn(),
      signedScaleFromUprightHandleDelta: vi.fn(),
      singleTransformBaseNode: (drag: typeof transformDrag, current: typeof node) => ({
        ...current,
        position: { ...drag.originalNode.position },
        rotation: drag.originalNode.rotation,
        scale: drag.originalNode.scale,
        scaleX: drag.originalNode.scaleX,
        scaleY: drag.originalNode.scaleY
      }),
      staticButtonPointerRef: { current: null },
      staticDrawing: null,
      svgRef: { current: {} },
      terminalPress: null,
      transformDrag,
      transformDragChangedRef: { current: false },
      updateMeasurementDrag: () => false,
      updateMouseStatus: vi.fn()
    };

    createHandlePointerMove(scope as any)({
      clientX: 214,
      clientY: 100,
      ctrlKey: false,
      shiftKey
    } as any);

    expect(scope.pushUndoSnapshot).toHaveBeenCalledTimes(1);
    expect(setTransformDrag).toHaveBeenCalledTimes(2);
    expect(patchGraphNodes).toHaveBeenCalledTimes(1);
    const resized = patchGraphNodes.mock.calls[0][0][0];
    expect(resized.position).toEqual({ x: 120, y: 100 });
    expect(resized.size).toEqual({ width: 160, height: 28 });
    expect(resized.scale).toBe(1.25);
    expect(resized.scaleX).toBe(1);
    expect(resized.scaleY).toBe(1);
    }
  );
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

describe("topology calculation operating-limit normalization", () => {
  test("calculates topology before validation and passes page units into limit normalization", () => {
    const calls: string[] = [];
    const sourceNodes = [{ id: "node-1", params: { ac_q_max: "0", ac_q_min: "0" } }];
    const calculatedNodes = [{ id: "node-1", nodeNumber: "1", params: { ac_q_max: "0", ac_q_min: "0" } }];
    const normalizedNodes = [{ id: "node-1", nodeNumber: "1", params: { ac_q_max: "10", ac_q_min: "-10" } }];
    const setNodes = vi.fn();
    const setTopology = vi.fn();
    const setTopologyErrors = vi.fn();
    const setTopologyStatus = vi.fn();
    const showGlobalMessage = vi.fn();
    (globalThis as any).showGlobalMessage = showGlobalMessage;
    const calculateElectricalTopology = vi.fn(() => {
      calls.push("calculate");
      return calculatedNodes;
    });
    const validateTopology = vi.fn(() => {
      calls.push("validate");
      return [];
    });
    const normalizeDeviceOperatingLimitsAfterTopology = vi.fn((
      _nodes: unknown[],
      _options: { skipVoltageNodeIds: Set<string>; sourceNodes: unknown[] }
    ) => {
      calls.push("normalize");
      return { nodes: normalizedNodes, warnings: [], corrections: [] };
    });
    const nextTopology = { connectedComponents: [["node-1"]] };

    createRunTopologyCalculation({
      EMPTY_TOPOLOGY: { connectedComponents: [] },
      buildTopology: vi.fn(() => nextTopology),
      calculateElectricalTopology,
      currentUnit: "A",
      edges: [],
      isBlockingTopologyValidationError: () => false,
      locateTopologyError: vi.fn(),
      nodes: sourceNodes,
      normalizeDeviceOperatingLimitsAfterTopology,
      powerUnit: "kW",
      pushUndoSnapshot: vi.fn(),
      requireEditMode: () => true,
      setNodes,
      setTopology,
      setTopologyErrors,
      setTopologyStatus,
      skipNextTopologyStaleRef: { current: false },
      topologyCalculationMessage: () => "拓扑成功",
      validateTopology,
      validateVoltageSetpointDeviations: vi.fn(() => []),
      voltageUnit: "V",
      writeOperationLog: vi.fn()
    })();

    expect(calls).toEqual(["calculate", "validate", "normalize"]);
    expect(validateTopology).toHaveBeenCalledWith(calculatedNodes, [], {
      includeVoltageSetpointDeviations: false,
      modelType: undefined
    });
    expect(normalizeDeviceOperatingLimitsAfterTopology).toHaveBeenCalledWith(calculatedNodes, {
      powerUnit: "kW",
      voltageUnit: "V",
      currentUnit: "A",
      skipVoltageNodeIds: expect.any(Set),
      sourceNodes
    });
    expect(normalizeDeviceOperatingLimitsAfterTopology.mock.calls[0][1].skipVoltageNodeIds.size).toBe(0);
    expect(setNodes).toHaveBeenCalledWith(normalizedNodes);
    expect(setTopology).toHaveBeenCalledWith(nextTopology);
    expect(setTopologyErrors).toHaveBeenLastCalledWith([]);
    expect(setTopologyStatus).toHaveBeenCalledWith({ state: "success", message: "成功，1 个拓扑岛" });
    expect(showGlobalMessage).toHaveBeenCalledWith("拓扑成功");
  });

  test("skips voltage-dependent correction on invalid base voltage and persists only explicit limit corrections when topology is blocked", () => {
    const originalNode = {
      id: "node-1",
      nodeNumber: "",
      params: { ac_q_max: "0", ac_q_min: "0", untouched: "original" }
    };
    const calculatedNode = {
      id: "node-1",
      nodeNumber: "99",
      params: { ac_q_max: "0", ac_q_min: "0", untouched: "calculated" }
    };
    const normalizedNode = {
      ...calculatedNode,
      params: { ...calculatedNode.params, ac_q_max: "10", ac_q_min: "-10" }
    };
    const blockingError = {
      type: "missing-island-voltage",
      nodeId: "node-1",
      relatedNodeIds: ["node-1"],
      message: "基准电压缺失"
    };
    const normalizeDeviceOperatingLimitsAfterTopology = vi.fn((
      _nodes: unknown[],
      _options: { skipVoltageNodeIds: Set<string>; sourceNodes: unknown[] }
    ) => ({
      nodes: [normalizedNode],
      warnings: [{
        type: "device-limit-invalid",
        nodeId: "node-1",
        relatedNodeIds: ["node-1"],
        message: "无功限值已修正"
      }],
      corrections: [
        { nodeId: "node-1", paramKey: "ac_q_max", value: "10" },
        { nodeId: "node-1", paramKey: "ac_q_min", value: "-10" }
      ]
    }));
    const setNodes = vi.fn();
    const showGlobalMessage = vi.fn();
    (globalThis as any).showGlobalMessage = showGlobalMessage;

    createRunTopologyCalculation({
      EMPTY_TOPOLOGY: { connectedComponents: [] },
      buildTopology: vi.fn(),
      calculateElectricalTopology: vi.fn(() => [calculatedNode]),
      currentUnit: "A",
      edges: [],
      isBlockingTopologyValidationError: (error: { type: string }) => error.type === "missing-island-voltage",
      locateTopologyError: vi.fn(),
      nodes: [originalNode],
      normalizeDeviceOperatingLimitsAfterTopology,
      powerUnit: "MW",
      pushUndoSnapshot: vi.fn(),
      requireEditMode: () => true,
      setNodes,
      setTopology: vi.fn(),
      setTopologyErrors: vi.fn(),
      setTopologyStatus: vi.fn(),
      skipNextTopologyStaleRef: { current: false },
      topologyCalculationMessage: (count: number) => `拓扑失败 ${count}`,
      validateTopology: vi.fn(() => [blockingError]),
      validateVoltageSetpointDeviations: vi.fn(),
      voltageUnit: "kV",
      writeOperationLog: vi.fn()
    })();

    const options = normalizeDeviceOperatingLimitsAfterTopology.mock.calls[0][1];
    expect(options.skipVoltageNodeIds.has("node-1")).toBe(true);
    expect(setNodes).toHaveBeenCalledWith([{
      ...originalNode,
      params: { ...originalNode.params, ac_q_max: "10", ac_q_min: "-10" }
    }]);
    expect(setNodes.mock.calls[0][0][0].nodeNumber).toBe("");
    expect(setNodes.mock.calls[0][0][0].params.untouched).toBe("original");
    expect(showGlobalMessage).toHaveBeenCalledWith("拓扑失败 1");
  });

  test("fails topology when post-topology hydrogen storage validation returns a blocking warning", () => {
    const node = { id: "tank-1", params: { water_volume: "0", pressure_max: "45", pressure_min: "2" } };
    const blockingWarning = {
      type: "hydrogen-storage-parameter-invalid",
      nodeId: node.id,
      relatedNodeIds: [node.id],
      message: "水容积必须为正数"
    };
    const emptyTopology = { connectedComponents: [] };
    const setNodes = vi.fn();
    const setTopology = vi.fn();
    const setTopologyErrors = vi.fn();
    const setTopologyStatus = vi.fn();
    const locateTopologyError = vi.fn();
    const showGlobalMessage = vi.fn();
    (globalThis as any).showGlobalMessage = showGlobalMessage;

    createRunTopologyCalculation({
      EMPTY_TOPOLOGY: emptyTopology,
      buildTopology: vi.fn(),
      calculateElectricalTopology: vi.fn(() => [node]),
      currentUnit: "A",
      edges: [],
      isBlockingTopologyValidationError: (error: { type: string }) => error.type === "hydrogen-storage-parameter-invalid",
      locateTopologyError,
      nodes: [node],
      normalizeDeviceOperatingLimitsAfterTopology: vi.fn(() => ({
        nodes: [node],
        warnings: [blockingWarning],
        corrections: []
      })),
      powerUnit: "MW",
      pushUndoSnapshot: vi.fn(),
      requireEditMode: () => true,
      setNodes,
      setTopology,
      setTopologyErrors,
      setTopologyStatus,
      skipNextTopologyStaleRef: { current: false },
      topologyCalculationMessage: (count: number) => `拓扑失败 ${count}`,
      validateTopology: vi.fn(() => []),
      validateVoltageSetpointDeviations: vi.fn(),
      voltageUnit: "kV",
      writeOperationLog: vi.fn()
    })();

    expect(setTopologyErrors).toHaveBeenCalledWith([blockingWarning]);
    expect(setTopology).toHaveBeenCalledWith(emptyTopology);
    expect(setTopologyStatus).toHaveBeenCalledWith({ state: "failed", message: "失败，1 条阻断错误" });
    expect(locateTopologyError).toHaveBeenCalledWith(blockingWarning);
    expect(showGlobalMessage).toHaveBeenCalledWith("拓扑失败 1");
    expect(setNodes).not.toHaveBeenCalled();
  });
});
