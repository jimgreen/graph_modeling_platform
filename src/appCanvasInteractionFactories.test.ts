import { describe, expect, test, vi } from "vitest";
import {
  createApplyBatchCommonParam,
  createApplyBatchCommonParamPatch,
  createFindConnectTargetAtPoint,
  createFindRewireTargetAtPoint,
  createFindRoutableLineEndpointTargetAtPoint,
  createUpdateParam
} from "./appExtracted/appCanvasInteractionFactories";
import { pointOnBusForSnap } from "./appExtracted/appCoreCanvasUtilities";
import {
  canConnectTerminals,
  createDefaultNode,
  createNodeFromTemplate,
  getBusTerminalType,
  getTerminalPoint,
  isBusNode,
  normalizeRatioParameterInputValue,
  projectPointToBusCenterline
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
      isPointNearBus: (node: typeof bus, targetPoint: typeof point, tolerance: number) =>
        Boolean(pointOnBusForSnap(node, targetPoint, tolerance)),
      isRoutableLineDeviceKind: vi.fn(() => false),
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
      isPointNearBus: vi.fn(() => true),
      queryNodeSpatialIndex: vi.fn(() => [ordinaryDevice]),
      visibleNodeById: new Map([[source.id, source], [ordinaryDevice.id, ordinaryDevice]]),
      visibleNodeSpatialIndex: {}
    });

    expect(isBusNode(ordinaryDevice)).toBe(false);
    expect(findTarget(ordinaryDevice.position)).toBeNull();
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
