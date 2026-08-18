import { describe, expect, test, vi } from "vitest";
import {
  createApplyBatchCommonParam,
  createApplyBatchCommonParamPatch,
  createAppendStaticDrawingPoint,
  createCommitLibraryPlacementAtPoint,
  createFindConnectTargetAtPoint,
  createFindRewireTargetAtPoint,
  createFindRoutableLineEndpointTargetAtPoint,
  createFinishInteractiveStaticDrawing,
  createPlaceLibraryDeviceAtPoint,
  createStartLibraryDevicePlacement,
  createUpdateInteractiveStaticDrawingPreview,
  createUpdateLibraryPlacementPreview,
  createUpdateParam
} from "./appExtracted/appCanvasInteractionFactories";
import { bestSmartAlignmentAxisSnap, pointOnBusForSnap } from "./appExtracted/appCoreCanvasUtilities";
import {
  canConnectTerminals,
  createDefaultNode,
  createNodeFromTemplate,
  createRoutableLineDeviceFromEndpoints,
  DEFAULT_MODEL_LAYER_ID,
  DEVICE_LIBRARY_BY_KIND,
  getBusTerminalType,
  getTerminalPoint,
  isBusNode,
  isModelInteractionNode,
  modelInteractionTerminalConnectionLocalPointsByNodeId,
  normalizeRatioParameterInputValue,
  projectPointToBusCenterline,
  projectPointToModelInteractionBoundary,
  projectPointToModelInteractionBoundaryIfInRange,
  routableLineDeviceEndpointRefForNode
} from "./model";

const createCustomZeroTerminalNode = (componentLibrary: string, terminalType: "ac" | "dc" | "h2" | "heat" = "ac") =>
  createNodeFromTemplate({
    kind: `custom-${componentLibrary}`,
    label: `自定义-${componentLibrary}`,
    categoryLibrary: "交流设备",
    size: { width: 150, height: 36 },
    params: { component_type: componentLibrary },
    terminalType,
    terminalCount: 0,
    custom: true
  }, { x: 300, y: 200 });

describe("custom bus connection targets", () => {
  test("uses the ACRealBs component library for connect, rewire, and routable-line body targets", () => {
    const source = createDefaultNode("ac-load", { x: 80, y: 200 });
    const bus = createCustomZeroTerminalNode("ACRealBs");
    const point = { x: bus.position.x + 25, y: bus.position.y - bus.size.height / 4 };
    const boundaryPoint = projectPointToBusCenterline(bus, point);
    const commonScope = {
      CONNECT_BUS_SNAP_TOLERANCE: 18,
      CONNECT_TERMINAL_SNAP_TOLERANCE: 28,
      busAnchorFromPoint: projectPointToBusCenterline,
      connectTargetSearchBounds: vi.fn(() => ({ left: 0, right: 600, top: 0, bottom: 400 })),
      getBusTerminalType,
      getTerminalPoint,
      isBusNode,
      isModelInteractionNode,
      isPointNearBus: (node: typeof bus, targetPoint: typeof point, tolerance: number) =>
        Boolean(pointOnBusForSnap(node, targetPoint, tolerance)),
      isRoutableLineDeviceKind: vi.fn(() => false),
      modelInteractionTerminalConnectionLocalPointsByNodeId,
      nodeById: new Map([[bus.id, bus]]),
      projectPointToModelInteractionBoundaryIfInRange,
      queryNodeSpatialIndex: vi.fn(() => [bus]),
      visibleNodeSpatialIndex: {}
    };
    const connectTarget = createFindConnectTargetAtPoint({
      ...commonScope,
      activeLayerNodeIdSet: new Set([source.id, bus.id]),
      canConnectTerminals,
      connectSource: { nodeId: source.id, terminalId: source.terminals[0].id },
      visibleNodeById: new Map([[source.id, source], [bus.id, bus]])
    })(point);
    expect(connectTarget).toMatchObject({
      node: { id: bus.id },
      terminalId: "t1",
      point: boundaryPoint
    });

    const edge = {
      id: "rewire-edge",
      sourceId: source.id,
      sourceTerminalId: source.terminals[0].id,
      targetId: "old-target",
      targetTerminalId: "t1"
    };
    const rewireTarget = createFindRewireTargetAtPoint({
      ...commonScope,
      activeLayerEdgeIdSet: new Set([edge.id]),
      canConnectTerminals,
      edgeById: new Map([[edge.id, edge]]),
      visibleNodeById: new Map([[source.id, source], [bus.id, bus]])
    })(point, { edgeId: edge.id, endpoint: "target" } as any);
    expect(rewireTarget).toMatchObject({ node: { id: bus.id }, terminalId: "t1", point: boundaryPoint });

    const routableLineTarget = createFindRoutableLineEndpointTargetAtPoint({
      ...commonScope,
      activeLayerNodeIdSet: new Set([bus.id]),
      routableLinePlacement: null,
      routableLineTemplateTerminalType: vi.fn()
    })(point, { terminalType: "ac" });
    expect(routableLineTarget).toMatchObject({ node: { id: bus.id }, terminalId: "t1", point: boundaryPoint });
  });

  test("does not make an ordinary zero-terminal custom device body-connectable", () => {
    const source = createDefaultNode("ac-load", { x: 80, y: 200 });
    const ordinaryDevice = createCustomZeroTerminalNode("ACGenerator");
    const findTarget = createFindConnectTargetAtPoint({
      CONNECT_BUS_SNAP_TOLERANCE: 18,
      CONNECT_TERMINAL_SNAP_TOLERANCE: 28,
      activeLayerNodeIdSet: new Set([source.id, ordinaryDevice.id]),
      busAnchorFromPoint: projectPointToBusCenterline,
      canConnectTerminals,
      connectSource: { nodeId: source.id, terminalId: source.terminals[0].id },
      connectTargetSearchBounds: vi.fn(() => ({ left: 0, right: 600, top: 0, bottom: 400 })),
      getTerminalPoint,
      isBusNode,
      isModelInteractionNode,
      isPointNearBus: vi.fn(() => true),
      queryNodeSpatialIndex: vi.fn(() => [ordinaryDevice]),
      visibleNodeById: new Map([[source.id, source], [ordinaryDevice.id, ordinaryDevice]]),
      visibleNodeSpatialIndex: {}
    });

    expect(isBusNode(ordinaryDevice)).toBe(false);
    expect(findTarget(ordinaryDevice.position)).toBeNull();
  });
});

describe("ordinary link model-interaction restrictions", () => {
  test("厂站模型中把厂站按钮作为普通连线手势转全局线路的吸附目标", () => {
    const source = createDefaultNode("ac-load", { x: 80, y: 200 });
    const button = createDefaultNode("static-model-interaction-station", { x: 300, y: 200 });
    const point = projectPointToModelInteractionBoundary(button, {
      x: button.position.x + button.size.width / 2,
      y: button.position.y + 8
    });
    const nodeById = new Map([source, button].map((node) => [node.id, node]));
    const connectTarget = createFindConnectTargetAtPoint({
      CONNECT_BUS_SNAP_TOLERANCE: 18,
      CONNECT_TERMINAL_SNAP_TOLERANCE: 28,
      activeLayerNodeIdSet: new Set([source.id, button.id]),
      busAnchorFromPoint: projectPointToBusCenterline,
      canConnectTerminals,
      connectSource: { nodeId: source.id, terminalId: source.terminals[0].id },
      connectTargetSearchBounds: vi.fn(() => ({ left: 0, right: 600, top: 0, bottom: 400 })),
      getTerminalPoint,
      isBusNode,
      isModelInteractionNode,
      isPointNearBus: vi.fn(() => false),
      modelInteractionTerminalConnectionLocalPointsByNodeId,
      modelType: "厂站",
      nodeById,
      projectPointToModelInteractionBoundaryIfInRange,
      queryNodeSpatialIndex: vi.fn(() => [button]),
      visibleNodeById: nodeById,
      visibleNodeSpatialIndex: {}
    })(point);

    expect(connectTarget).toMatchObject({
      node: { id: button.id },
      terminalId: button.terminals[0].id,
      point
    });
  });

  test("非厂站馈线台区模型不把模型交互按钮作为普通联络线目标", () => {
    const source = createDefaultNode("ac-load", { x: 80, y: 200 });
    for (const kind of [
      "static-model-interaction-microgrid",
      "static-model-interaction-station",
      "static-model-interaction-feeder",
      "static-model-interaction-district",
      "static-model-interaction-other"
    ] as const) {
      const button = createDefaultNode(kind, { x: 300, y: 200 });
      const point = getTerminalPoint(button, button.terminals[0].id);
      const commonScope = {
        CONNECT_BUS_SNAP_TOLERANCE: 18,
        CONNECT_TERMINAL_SNAP_TOLERANCE: 28,
        busAnchorFromPoint: projectPointToBusCenterline,
        canConnectTerminals,
        connectTargetSearchBounds: vi.fn(() => ({ left: 0, right: 600, top: 0, bottom: 400 })),
        getTerminalPoint,
        isBusNode,
        isModelInteractionNode,
        isPointNearBus: vi.fn(() => false),
        modelType: "其他",
        queryNodeSpatialIndex: vi.fn(() => [button]),
        visibleNodeSpatialIndex: {}
      };

      const connectTarget = createFindConnectTargetAtPoint({
        ...commonScope,
        activeLayerNodeIdSet: new Set([source.id, button.id]),
        connectSource: { nodeId: source.id, terminalId: source.terminals[0].id },
        visibleNodeById: new Map([[source.id, source], [button.id, button]])
      })(point);
      expect(connectTarget, kind).toBeNull();

      const edge = {
        id: `${kind}-edge`,
        sourceId: source.id,
        sourceTerminalId: source.terminals[0].id,
        targetId: "old-target",
        targetTerminalId: "t1"
      };
      const rewireTarget = createFindRewireTargetAtPoint({
        ...commonScope,
        activeLayerEdgeIdSet: new Set([edge.id]),
        edgeById: new Map([[edge.id, edge]]),
        visibleNodeById: new Map([[source.id, source], [button.id, button]])
      })(point, { edgeId: edge.id, endpoint: "target" } as any);
      expect(rewireTarget, kind).toBeNull();
    }
  });
});

describe("model interaction routable-line targets", () => {
  test("snaps anywhere on the button boundary and allocates an unused terminal of the matching type", () => {
    const station = createDefaultNode("static-model-interaction-station", { x: 300, y: 200 });
    const load = createDefaultNode("ac-load", { x: 560, y: 200 });
    const firstConnectionPoint = projectPointToModelInteractionBoundary(station, {
      x: station.position.x - station.size.width,
      y: station.position.y - 8
    });
    const line = createRoutableLineDeviceFromEndpoints(
      DEVICE_LIBRARY_BY_KIND.get("ac-routable-line")!,
      firstConnectionPoint,
      getTerminalPoint(load, load.terminals[0].id),
      DEFAULT_MODEL_LAYER_ID,
      {
        source: routableLineDeviceEndpointRefForNode(station, station.terminals[0].id, firstConnectionPoint),
        target: routableLineDeviceEndpointRefForNode(load, load.terminals[0].id)
      }
    );
    const nodeById = new Map([station, load, line].map((node) => [node.id, node]));
    const pointer = {
      x: station.position.x + station.size.width / 2,
      y: station.position.y + 11
    };
    const expectedBoundaryPoint = projectPointToModelInteractionBoundary(station, pointer);
    const findTarget = createFindRoutableLineEndpointTargetAtPoint({
      CONNECT_BUS_SNAP_TOLERANCE: 18,
      CONNECT_TERMINAL_SNAP_TOLERANCE: 28,
      activeLayerNodeIdSet: new Set([station.id, load.id, line.id]),
      busAnchorFromPoint: projectPointToBusCenterline,
      connectTargetSearchBounds: vi.fn(() => ({ left: 0, right: 800, top: 0, bottom: 500 })),
      getBusTerminalType,
      getTerminalPoint,
      isBusNode,
      isModelInteractionNode,
      isPointNearBus: vi.fn(() => false),
      isRoutableLineDeviceKind: (kind: string) => kind === "ac-routable-line" || kind === "dc-routable-line",
      modelInteractionTerminalConnectionLocalPointsByNodeId,
      nodeById,
      projectPointToModelInteractionBoundaryIfInRange,
      queryNodeSpatialIndex: vi.fn(() => [station]),
      routableLinePlacement: null,
      routableLineTemplateTerminalType: vi.fn(),
      visibleNodeSpatialIndex: {}
    });

    expect(findTarget(pointer, { terminalType: "ac" })).toMatchObject({
      node: { id: station.id },
      terminalId: "t2",
      point: expectedBoundaryPoint
    });
    expect(findTarget(pointer, { terminalType: "dc" })).toMatchObject({
      node: { id: station.id },
      terminalId: "t5",
      point: expectedBoundaryPoint
    });
    expect(findTarget(pointer, {
      terminalType: "ac",
      excludedNodeId: line.id,
      excludedEndpoint: "source"
    })).toMatchObject({ terminalId: "t1", point: expectedBoundaryPoint });
  });
});

describe("batch common parameter updates", () => {
  test("stores inherited generator fields that are missing from derived wind nodes", () => {
    const firstWindNode = createDefaultNode("ac-wind-source", { x: 100, y: 100 });
    const secondWindNode = createDefaultNode("ac-wind-source", { x: 240, y: 100 });
    secondWindNode.params.control_type = "PV";
    const patchGraphNodes = vi.fn();
    const canBatchEditParam = vi.fn(() => true);
    const applyBatchCommonParamPatch = createApplyBatchCommonParamPatch({
      NODE_LABEL_FOOTPRINT_PARAM_KEYS: new Set<string>(),
      activeSelectedNodeIds: [firstWindNode.id, secondWindNode.id],
      canBatchEditParam,
      commitNodeFootprintUpdates: vi.fn(),
      edgeListForNodeIds: vi.fn(() => []),
      nodeById: new Map([
        [firstWindNode.id, firstWindNode],
        [secondWindNode.id, secondWindNode]
      ]),
      patchGraphNodes,
      pushUndoSnapshot: vi.fn(),
      requireEditMode: vi.fn(() => true),
      undoScopeForGraphPatch: vi.fn(() => ({})),
      writeOperationLog: vi.fn()
    });
    const applyBatchCommonParam = createApplyBatchCommonParam({
      PARAM_LABELS: { control_type: "控制类型" },
      applyBatchCommonParamPatch,
      canBatchEditParam,
      normalizeNodeLabelDisplayMode: (value: string) => value,
      normalizeRatioParameterInputValue
    });

    expect(firstWindNode.params).not.toHaveProperty("control_type");

    applyBatchCommonParam("control_type", "PQ");

    expect(patchGraphNodes).toHaveBeenCalledTimes(1);
    expect(patchGraphNodes.mock.calls[0][0]).toHaveLength(2);
    expect(patchGraphNodes.mock.calls[0][0].every((node: typeof firstWindNode) => node.params.control_type === "PQ")).toBe(true);
  });

  test("stores percentage-form SOC batch input as decimal ratios", () => {
    const firstStorage = createDefaultNode("ac-storage", { x: 100, y: 100 });
    const secondStorage = createDefaultNode("ac-storage", { x: 240, y: 100 });
    const patchGraphNodes = vi.fn();
    const canBatchEditParam = vi.fn(() => true);
    const applyBatchCommonParamPatch = createApplyBatchCommonParamPatch({
      NODE_LABEL_FOOTPRINT_PARAM_KEYS: new Set<string>(),
      activeSelectedNodeIds: [firstStorage.id, secondStorage.id],
      canBatchEditParam,
      commitNodeFootprintUpdates: vi.fn(),
      edgeListForNodeIds: vi.fn(() => []),
      nodeById: new Map([
        [firstStorage.id, firstStorage],
        [secondStorage.id, secondStorage]
      ]),
      patchGraphNodes,
      pushUndoSnapshot: vi.fn(),
      requireEditMode: vi.fn(() => true),
      undoScopeForGraphPatch: vi.fn(() => ({})),
      writeOperationLog: vi.fn()
    });
    const applyBatchCommonParam = createApplyBatchCommonParam({
      PARAM_LABELS: { soc: "SOC" },
      applyBatchCommonParamPatch,
      canBatchEditParam,
      normalizeNodeLabelDisplayMode: (value: string) => value,
      normalizeRatioParameterInputValue
    });

    applyBatchCommonParam("soc", "99%");

    expect(patchGraphNodes).toHaveBeenCalledTimes(1);
    expect(patchGraphNodes.mock.calls[0][0].every((node: typeof firstStorage) => node.params.soc === "0.99")).toBe(true);
  });

  test("validates electric heat coefficients against every selected E section", () => {
    const acHeater = createDefaultNode("ac-heater", { x: 100, y: 100 });
    const dcTwoPortHeater = createDefaultNode("dc-two-port-heater", { x: 240, y: 100 });
    const applyBatchCommonParamPatch = vi.fn();
    const applyBatchCommonParam = createApplyBatchCommonParam({
      PARAM_LABELS: { e2h_coeff: "电转热效率" },
      applyBatchCommonParamPatch,
      canBatchEditParam: vi.fn(() => true),
      inferESection: (kind: string) => kind === "ac-heater" ? "AcE2Heat" : "DcE2Heat2",
      nodeById: new Map([
        [acHeater.id, acHeater],
        [dcTwoPortHeater.id, dcTwoPortHeater]
      ]),
      normalizeNodeLabelDisplayMode: (value: string) => value,
      normalizeRatioParameterInputValue,
      selectedNodeIds: new Set([acHeater.id, dcTwoPortHeater.id])
    });

    applyBatchCommonParam("e2h_coeff", "2.5");

    expect(applyBatchCommonParamPatch).toHaveBeenCalledTimes(1);
    expect(applyBatchCommonParamPatch.mock.calls[0][1]()).toEqual({ e2h_coeff: "2.5" });

    applyBatchCommonParam("e2h_coeff", "0.2");

    expect(applyBatchCommonParamPatch).toHaveBeenCalledTimes(1);
  });
});

describe("single device parameter updates", () => {
  test("stores percentage-form efficiency input as a decimal ratio", () => {
    const node = createDefaultNode("ac-storage", { x: 100, y: 100 });
    const patchGraphNodes = vi.fn();
    const updateParam = createUpdateParam({
      NODE_LABEL_FOOTPRINT_PARAM_KEYS: new Set<string>(),
      commitNodeFootprintUpdates: vi.fn(),
      nodeById: new Map([[node.id, node]]),
      normalizeNodeLabelDisplayMode: (value: string) => value,
      normalizeRatioParameterInputValue,
      patchGraphNodes,
      pushNodeOnlyUndoSnapshot: vi.fn(),
      pushUndoSnapshot: vi.fn(),
      requireEditMode: vi.fn(() => true),
      selectedNodeId: node.id,
      undoScopeForNodeFootprintPatch: vi.fn(() => ({}))
    });

    updateParam("charge_discharge_efficiency", "99");

    expect(patchGraphNodes).toHaveBeenCalledTimes(1);
    expect(patchGraphNodes.mock.calls[0][0][0].params.charge_discharge_efficiency).toBe("0.99");
  });

  test("rejects out-of-range ratio input", () => {
    const node = createDefaultNode("ac-storage", { x: 100, y: 100 });
    const patchGraphNodes = vi.fn();
    const updateParam = createUpdateParam({
      NODE_LABEL_FOOTPRINT_PARAM_KEYS: new Set<string>(),
      commitNodeFootprintUpdates: vi.fn(),
      nodeById: new Map([[node.id, node]]),
      normalizeNodeLabelDisplayMode: (value: string) => value,
      normalizeRatioParameterInputValue,
      patchGraphNodes,
      pushNodeOnlyUndoSnapshot: vi.fn(),
      pushUndoSnapshot: vi.fn(),
      requireEditMode: vi.fn(() => true),
      selectedNodeId: node.id,
      undoScopeForNodeFootprintPatch: vi.fn(() => ({}))
    });

    updateParam("soc", "120%");

    expect(patchGraphNodes).not.toHaveBeenCalled();
  });
});

describe("smart alignment during drawing", () => {
  const referenceNode = {
    id: "reference-node",
    position: { x: 200, y: 300 },
    size: { width: 40, height: 40 },
    terminals: []
  } as any;

  const createSmartAlignmentScope = (updateSmartAlignmentGuides = vi.fn()) => ({
    SMART_ALIGNMENT_SNAP_SCREEN_TOLERANCE: 12,
    bestSmartAlignmentAxisSnap,
    canvasScrollScaleRef: { current: { x: 1, y: 1 } },
    canvasVisibleViewBoxRef: { current: { x: 0, y: 0, width: 1000, height: 800 } },
    clampPointToCanvas: (point: any) => point,
    createNodeFromTemplate: vi.fn((template: any, position: any) => ({
      id: `preview-${template.kind}`,
      kind: template.kind,
      position,
      size: template.size ?? { width: 40, height: 40 },
      terminals: []
    })),
    emptySmartAlignmentAnchorMap: () => ({ x: [], y: [] }),
    isEditMode: true,
    isInteractiveStaticDrawingKind: vi.fn((kind: string) => kind === "static-line"),
    isStaticBoxLikeTemplate: vi.fn(() => false),
    nodeHasUprightBoundsContent: vi.fn(() => false),
    nodeSmartAlignmentBounds: (node: any, position: any) => ({
      left: position.x - node.size.width / 2,
      right: position.x + node.size.width / 2,
      top: position.y - node.size.height / 2,
      bottom: position.y + node.size.height / 2
    }),
    nodeTerminalOutflowSmartAlignmentAnchors: () => ({ x: [], y: [] }),
    queryNodeSpatialIndex: vi.fn(() => [referenceNode]),
    smartAlignmentEnabled: true,
    updateSmartAlignmentGuides,
    viewBoxRef: { current: { x: 0, y: 0, width: 1000, height: 800 } },
    visibleNodeSpatialIndex: {}
  });

  test("uses the same snapped point for a static drawing preview and its committed endpoint", () => {
    const updateSmartAlignmentGuides = vi.fn();
    const staticDrawing = {
      kind: "static-line",
      template: { kind: "static-line", label: "直线" },
      points: [{ x: 80, y: 100 }],
      previewPoint: { x: 80, y: 100 }
    } as any;
    let previewState = staticDrawing;
    const commonScope = createSmartAlignmentScope(updateSmartAlignmentGuides);
    const updatePreview = createUpdateInteractiveStaticDrawingPreview({
      ...commonScope,
      sameOptionalPoint: (left: any, right: any) => left?.x === right?.x && left?.y === right?.y,
      setStaticDrawing: (updater: any) => {
        previewState = updater(previewState);
      }
    });

    updatePreview({ x: 198, y: 303 });

    expect(previewState.previewPoint).toEqual({ x: 200, y: 300 });
    expect(updateSmartAlignmentGuides).toHaveBeenLastCalledWith([
      expect.objectContaining({ orientation: "vertical", position: 200 }),
      expect.objectContaining({ orientation: "horizontal", position: 300 })
    ]);

    const finishInteractiveStaticDrawing = vi.fn();
    const appendPoint = createAppendStaticDrawingPoint({
      ...commonScope,
      appendDistinctStaticDrawingPoint: (points: any[], point: any) => [...points, point],
      finishInteractiveStaticDrawing,
      interactiveStaticDrawingNeedsExplicitFinish: vi.fn(() => false),
      setStaticDrawing: vi.fn(),
      staticDrawing
    });

    appendPoint({ x: 198, y: 303 });

    expect(finishInteractiveStaticDrawing).toHaveBeenCalledWith({ x: 200, y: 300 });
  });

  test("commits a library drawing at its snapped preview point and clears the guides", () => {
    const updateSmartAlignmentGuides = vi.fn();
    const template = { kind: "static-line", label: "直线", size: { width: 40, height: 40 } } as any;
    const libraryPlacement = { kind: "device", template, previewPoint: null } as any;
    let previewState = libraryPlacement;
    const commonScope = createSmartAlignmentScope(updateSmartAlignmentGuides);
    const updatePreview = createUpdateLibraryPlacementPreview({
      ...commonScope,
      libraryPlacement,
      sameOptionalPoint: (left: any, right: any) => left?.x === right?.x && left?.y === right?.y,
      setLibraryPlacement: (updater: any) => {
        previewState = updater(previewState);
      }
    });

    updatePreview({ x: 198, y: 303 });

    expect(previewState.previewPoint).toEqual({ x: 200, y: 300 });

    const placeLibraryDeviceAtPoint = vi.fn();
    const commitPlacement = createCommitLibraryPlacementAtPoint({
      ...commonScope,
      dropGraphTemplate: vi.fn(),
      libraryPlacement,
      placeLibraryDeviceAtPoint,
      requireEditMode: vi.fn(() => true),
      setLibraryPlacement: vi.fn()
    });

    commitPlacement({ x: 198, y: 303 });

    expect(placeLibraryDeviceAtPoint).toHaveBeenCalledWith(template, { x: 200, y: 300 });
    expect(updateSmartAlignmentGuides).toHaveBeenLastCalledWith([]);
  });

  test("aligns an ordinary placement preview by its node bounds", () => {
    const updateSmartAlignmentGuides = vi.fn();
    const template = { kind: "static-edge-label", label: "边标签", size: { width: 40, height: 40 } } as any;
    const libraryPlacement = { kind: "device", template, previewPoint: null } as any;
    let previewState = libraryPlacement;
    const updatePreview = createUpdateLibraryPlacementPreview({
      ...createSmartAlignmentScope(updateSmartAlignmentGuides),
      libraryPlacement,
      sameOptionalPoint: (left: any, right: any) => left?.x === right?.x && left?.y === right?.y,
      setLibraryPlacement: (updater: any) => {
        previewState = updater(previewState);
      }
    });

    updatePreview({ x: 159, y: 303 });

    expect(previewState.previewPoint).toEqual({ x: 160, y: 300 });
    expect(updateSmartAlignmentGuides).toHaveBeenLastCalledWith([
      expect.objectContaining({ orientation: "vertical", position: 180 }),
      expect.objectContaining({ orientation: "horizontal", position: 300 })
    ]);
  });

  test("keeps raw drawing coordinates when smart alignment is disabled", () => {
    const updateSmartAlignmentGuides = vi.fn();
    const staticDrawing = {
      kind: "static-line",
      template: { kind: "static-line", label: "直线" },
      points: [{ x: 80, y: 100 }],
      previewPoint: { x: 80, y: 100 }
    } as any;
    let previewState = staticDrawing;
    const updatePreview = createUpdateInteractiveStaticDrawingPreview({
      ...createSmartAlignmentScope(updateSmartAlignmentGuides),
      smartAlignmentEnabled: false,
      sameOptionalPoint: (left: any, right: any) => left?.x === right?.x && left?.y === right?.y,
      setStaticDrawing: (updater: any) => {
        previewState = updater(previewState);
      }
    });

    updatePreview({ x: 198, y: 303 });

    expect(previewState.previewPoint).toEqual({ x: 198, y: 303 });
    expect(updateSmartAlignmentGuides).toHaveBeenLastCalledWith([]);
  });
});

describe("library device placement selection", () => {
  test("clears the existing canvas selection when entering pending drawing mode", () => {
    const setCanvasSelectionScope = vi.fn();
    const setSelectedNodeIds = vi.fn();
    const setSelectedEdgeId = vi.fn();
    const setSelectedEdgeIds = vi.fn();
    const setLibraryPlacement = vi.fn();
    const setMode = vi.fn();
    const template = {
      kind: "ac-load",
      label: "交流负荷"
    } as any;
    const startLibraryDevicePlacement = createStartLibraryDevicePlacement({
      componentLibraryDisplayMode: "expanded",
      hideLibraryFlyout: vi.fn(),
      isRoutableLineDeviceKind: vi.fn(() => false),
      requireEditMode: vi.fn(() => true),
      resetConnectPreviewState: vi.fn(),
      resetRoutableLinePreviewState: vi.fn(),
      setCanvasSelectionScope,
      setConnectSource: vi.fn(),
      setContextMenu: vi.fn(),
      setLibraryPlacement,
      setMode,
      setRewiring: vi.fn(),
      setRoutableLinePlacement: vi.fn(),
      setSelectedEdgeId,
      setSelectedEdgeIds,
      setSelectedNodeIds,
      setStaticDrawing: vi.fn(),
      writeOperationLog: vi.fn()
    });

    startLibraryDevicePlacement(template);

    expect(setCanvasSelectionScope).toHaveBeenCalledWith("group");
    expect(setSelectedNodeIds).toHaveBeenCalledWith([]);
    expect(setSelectedEdgeId).toHaveBeenCalledWith("");
    expect(setSelectedEdgeIds).toHaveBeenCalledWith([]);
    expect(setLibraryPlacement).toHaveBeenCalledWith({ kind: "device", template, previewPoint: null });
    expect(setMode).toHaveBeenCalledWith("select");
  });
});

describe("single-use static drawing tools", () => {
  test("does not restore an ordinary connector tool after placing one node", () => {
    const template = {
      kind: "custom-static-connector",
      label: "自定义连接图元",
      size: { width: 104, height: 86 },
      params: { component_type: "StaticConnectorSymbol" },
      terminalType: "ac",
      terminalCount: 0
    } as any;
    const startLibraryDevicePlacement = vi.fn();
    const canvasBounds = { width: 1200, height: 800 };
    const createdNode = {
      id: "custom-static-connector-1",
      kind: template.kind,
      name: template.label,
      position: { x: 200, y: 180 },
      size: { ...template.size },
      params: {},
      terminals: []
    };
    const placeLibraryDeviceAtPoint = createPlaceLibraryDeviceAtPoint({
      CANVAS_AUTO_EXPAND_PADDING: 40,
      activateInspectorFromCanvas: vi.fn(),
      activeLayerId: "layer-default",
      applyCanvasBounds: vi.fn(),
      assignPermanentDeviceIndex: vi.fn((node) => ({ node, counters: {} })),
      canvasBounds,
      canvasBoundsForAutoExpandedGraphContent: vi.fn(() => canvasBounds),
      canvasBoundsWithOriginShift: vi.fn((bounds) => bounds),
      clampNodePositionToBounds: vi.fn((_node, _bounds, point) => point),
      clampPointToBounds: vi.fn((point) => point),
      createNodeFromTemplate: vi.fn((_template, position) => ({ ...createdNode, position })),
      deviceIndexCounters: {},
      edges: [],
      hasCanvasOriginShift: vi.fn(() => false),
      isInteractiveStaticDrawingKind: vi.fn(() => false),
      isRoutableLineDeviceKind: vi.fn(() => false),
      isStaticBoxLikeTemplate: vi.fn(() => false),
      lastCanvasPointerRef: { current: null },
      lastRawCanvasPointerRef: { current: null },
      leftTopCanvasOriginShiftForContent: vi.fn(() => ({ x: 0, y: 0 })),
      markBusTerminalSyncDirtyForEdges: vi.fn(),
      nodes: [],
      pushUndoSnapshot: vi.fn(),
      rejectAutoCanvasExpansionForContent: vi.fn(() => false),
      requireEditMode: vi.fn(() => true),
      routeRoutableLineDevice: vi.fn((node) => node),
      setCanvasSelectionScope: vi.fn(),
      setDeviceIndexCounters: vi.fn(),
      setGraphArrays: vi.fn(),
      setLibraryPlacement: vi.fn(),
      setMode: vi.fn(),
      setSelectedEdgeId: vi.fn(),
      setSelectedEdgeIds: vi.fn(),
      setSelectedNodeIds: vi.fn(),
      shiftCachedRoutesForCanvasOrigin: vi.fn(),
      startInteractiveStaticDrawing: vi.fn(),
      startLibraryDevicePlacement,
      translateEdgeBy: vi.fn((edge) => edge),
      translateNodeBy: vi.fn((node) => node),
      translatePointBy: vi.fn((point) => point),
      writeOperationLog: vi.fn()
    });

    placeLibraryDeviceAtPoint(template, { x: 200, y: 180 });

    expect(startLibraryDevicePlacement).not.toHaveBeenCalled();
  });

  test("exits an interactive connector tool after a normal finish", () => {
    const template = {
      kind: "static-line",
      label: "直线",
      params: { component_type: "StaticConnectorSymbol" }
    } as any;
    const startLibraryDevicePlacement = vi.fn();
    const setMode = vi.fn();
    const points = [{ x: 100, y: 120 }, { x: 240, y: 180 }];
    const finishInteractiveStaticDrawing = createFinishInteractiveStaticDrawing({
      activateInspectorFromCanvas: vi.fn(),
      activeLayerId: "layer-default",
      appendDistinctStaticDrawingPoint: (current: any[], point: any) =>
        current.at(-1)?.x === point.x && current.at(-1)?.y === point.y ? current : [...current, point],
      clampPointToCanvas: (point: any) => point,
      createInteractiveStaticDrawingNode: vi.fn(() => ({ id: "static-line-1", name: "直线" })),
      createStaticBoxNodeFromDrawing: vi.fn(),
      edges: [],
      isStaticBoxLikeTemplate: vi.fn(() => false),
      nodes: [],
      pushUndoSnapshot: vi.fn(),
      requireEditMode: vi.fn(() => true),
      setCanvasSelectionScope: vi.fn(),
      setGraphArrays: vi.fn(),
      setMode,
      setSelectedEdgeId: vi.fn(),
      setSelectedEdgeIds: vi.fn(),
      setSelectedNodeIds: vi.fn(),
      setStaticDrawing: vi.fn(),
      startLibraryDevicePlacement,
      staticDrawing: { kind: template.kind, template, points, previewPoint: points.at(-1) },
      staticDrawingPreviewPoints: () => points,
      updateSmartAlignmentGuides: vi.fn(),
      writeOperationLog: vi.fn()
    });

    finishInteractiveStaticDrawing(points.at(-1));

    expect(startLibraryDevicePlacement).not.toHaveBeenCalled();
    expect(setMode).toHaveBeenCalledWith("select");
  });

  test("exits the tool when a right click finishes drawing", () => {
    const template = { kind: "static-polyline", label: "折线" } as any;
    const startLibraryDevicePlacement = vi.fn();
    const setMode = vi.fn();
    const points = [{ x: 100, y: 120 }, { x: 180, y: 160 }];
    const finishInteractiveStaticDrawing = createFinishInteractiveStaticDrawing({
      activateInspectorFromCanvas: vi.fn(),
      activeLayerId: "layer-default",
      appendDistinctStaticDrawingPoint: (current: any[]) => current,
      clampPointToCanvas: (point: any) => point,
      createInteractiveStaticDrawingNode: vi.fn(() => ({ id: "static-polyline-1", name: "折线" })),
      createStaticBoxNodeFromDrawing: vi.fn(),
      edges: [],
      isStaticBoxLikeTemplate: vi.fn(() => false),
      nodes: [],
      pushUndoSnapshot: vi.fn(),
      requireEditMode: vi.fn(() => true),
      setCanvasSelectionScope: vi.fn(),
      setGraphArrays: vi.fn(),
      setMode,
      setSelectedEdgeId: vi.fn(),
      setSelectedEdgeIds: vi.fn(),
      setSelectedNodeIds: vi.fn(),
      setStaticDrawing: vi.fn(),
      startLibraryDevicePlacement,
      staticDrawing: { kind: template.kind, template, points, previewPoint: { x: 260, y: 220 } },
      staticDrawingPreviewPoints: () => points,
      updateSmartAlignmentGuides: vi.fn(),
      writeOperationLog: vi.fn()
    });

    finishInteractiveStaticDrawing(points.at(-1));

    expect(startLibraryDevicePlacement).not.toHaveBeenCalled();
    expect(setMode).toHaveBeenCalledWith("select");
  });
});
