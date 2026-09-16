import { describe, expect, test, vi } from "vitest";
import {
  createApplyBatchCommonParam,
  createBuildGroupTransformNodeUpdates,
  createApplyBatchCommonParamPatch,
  createAppendStaticDrawingPoint,
  createCommitLibraryPlacementAtPoint,
  createConfirmNodeDoubleClickDialog,
  createFindConnectTargetAtPoint,
  createFindRewireTargetAtPoint,
  createFindRoutableLineEndpointTargetAtPoint,
  createFinishInteractiveStaticDrawing,
  createFinishNodeDrag,
  createFinishTransformDrag,
  createMirrorSelectedNodes,
  createPlaceLibraryDeviceAtPoint,
  createRotateSelectedLayoutUnits,
  createStartLibraryDevicePlacement,
  createUpdateSelectedNode,
  createUpdateInteractiveStaticDrawingPreview,
  createUpdateLibraryPlacementPreview,
  createUpdateParam
} from "./appExtracted/appCanvasInteractionFactories";
import { createGraphStore, graphStoreApplyPatch, graphStorePatchGraphFromArrays, overlayGraphStoreNodes } from "./graphStore";
import { normalizeProjectMeasurements } from "./measurements";
import { calculateNodeVisualBounds, setVoltageBaseTerminalValueForTopologySide } from "./model-routing";
import { bestSmartAlignmentAxisSnap, groupTransformGeometry, pointOnBusForSnap, transformGroupPoint } from "./appExtracted/appCoreCanvasUtilities";
import { normalizeRotationDegrees } from "./formatUtils";
import {
  canConnectTerminals,
  createDefaultNode,
  createNodeFromTemplate,
  DEVICE_LIBRARY_BY_KIND,
  getBusTerminalType,
  getTerminalPoint,
  isBusNode,
  isRoutableLineDeviceKind,
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
      nodeById: new Map([[bus.id, bus]]),
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

describe("ordinary link model-association restrictions", () => {
  test("十二种厂站馈线台区电源负荷都不能成为普通连接或重接目标", () => {
    const source = createDefaultNode("ac-load", { x: 80, y: 200 });
    for (const kind of [
      "ac-station-source",
      "ac-feeder-source",
      "ac-district-source",
      "dc-station-source",
      "dc-feeder-source",
      "dc-district-source",
      "ac-station-load",
      "ac-feeder-load",
      "ac-district-load",
      "dc-station-load",
      "dc-feeder-load",
      "dc-district-load"
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
        isPointNearBus: vi.fn(() => false),
        modelType: "厂站",
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

describe("model-association routable-line targets", () => {
  test("线路设备仍可吸附到十二种厂站馈线台区电源负荷端子", () => {
    for (const kind of [
      "ac-station-source",
      "ac-feeder-source",
      "ac-district-source",
      "dc-station-source",
      "dc-feeder-source",
      "dc-district-source",
      "ac-station-load",
      "ac-feeder-load",
      "ac-district-load",
      "dc-station-load",
      "dc-feeder-load",
      "dc-district-load"
    ] as const) {
      const boundaryDevice = createDefaultNode(kind, { x: 300, y: 200 });
      const terminal = boundaryDevice.terminals[0];
      const point = getTerminalPoint(boundaryDevice, terminal.id);
      const findTarget = createFindRoutableLineEndpointTargetAtPoint({
        CONNECT_BUS_SNAP_TOLERANCE: 18,
        CONNECT_TERMINAL_SNAP_TOLERANCE: 28,
        activeLayerNodeIdSet: new Set([boundaryDevice.id]),
        busAnchorFromPoint: projectPointToBusCenterline,
        connectTargetSearchBounds: vi.fn(() => ({ left: 0, right: 800, top: 0, bottom: 500 })),
        getBusTerminalType,
        getTerminalPoint,
        isBusNode,
        isPointNearBus: vi.fn(() => false),
        isRoutableLineDeviceKind,
        nodeById: new Map([[boundaryDevice.id, boundaryDevice]]),
        queryNodeSpatialIndex: vi.fn(() => [boundaryDevice]),
        routableLinePlacement: null,
        routableLineTemplateTerminalType: vi.fn(),
        visibleNodeSpatialIndex: {}
      });

      expect(findTarget(point, { terminalType: terminal.type }), kind).toMatchObject({
        node: { id: boundaryDevice.id },
        terminalId: terminal.id
      });
    }
  });

  test("空间索引节点参数过期时返回 nodeById 中的当前模型关联节点", () => {
    const indexedNode = createDefaultNode("ac-feeder-load", { x: 300, y: 200 });
    expect(indexedNode.params.model_id).toBe("");
    const currentNode = {
      ...indexedNode,
      params: { ...indexedNode.params, model_id: "8" }
    };
    const terminal = currentNode.terminals[0];
    const point = getTerminalPoint(currentNode, terminal.id);
    const findTarget = createFindRoutableLineEndpointTargetAtPoint({
      CONNECT_BUS_SNAP_TOLERANCE: 18,
      CONNECT_TERMINAL_SNAP_TOLERANCE: 28,
      activeLayerNodeIdSet: new Set([currentNode.id]),
      busAnchorFromPoint: projectPointToBusCenterline,
      connectTargetSearchBounds: vi.fn(() => ({ left: 0, right: 800, top: 0, bottom: 500 })),
      getBusTerminalType,
      getTerminalPoint,
      isBusNode,
      isPointNearBus: vi.fn(() => false),
      isRoutableLineDeviceKind,
      nodeById: new Map([[currentNode.id, currentNode]]),
      queryNodeSpatialIndex: vi.fn(() => [indexedNode]),
      routableLinePlacement: null,
      routableLineTemplateTerminalType: vi.fn(),
      visibleNodeSpatialIndex: {}
    });

    const target = findTarget(point, { terminalType: terminal.type });
    expect(target?.node).toBe(currentNode);
    expect(target?.node.params.model_id).toBe("8");
  });
});

describe("batch common parameter updates", () => {
  test("does not change model_id for a model association node that already has a line", () => {
    const node = createDefaultNode("ac-station-source", { x: 100, y: 100 });
    node.params.model_id = "11";
    const line = createDefaultNode("ac-routable-line", { x: 240, y: 100 });
    line.params._routableLineSourceNodeId = node.id;
    const patchGraphNodes = vi.fn();
    const showGlobalMessage = vi.fn();
    vi.stubGlobal("showGlobalMessage", showGlobalMessage);
    const applyBatchCommonParamPatch = createApplyBatchCommonParamPatch({
      NODE_LABEL_FOOTPRINT_PARAM_KEYS: new Set<string>(),
      activeSelectedNodeIds: [node.id],
      canBatchEditParam: vi.fn(() => true),
      commitNodeFootprintUpdates: vi.fn(),
      edgeListForNodeIds: vi.fn(() => []),
      nodeById: new Map([[node.id, node], [line.id, line]]),
      nodes: [node, line],
      normalizeProjectMeasurements,
      setProjectMeasurements: vi.fn(),
      patchGraphNodes,
      pushUndoSnapshot: vi.fn(),
      requireEditMode: vi.fn(() => true),
      undoScopeForGraphPatch: vi.fn(() => ({})),
      writeOperationLog: vi.fn()
    });

    applyBatchCommonParamPatch("关联模型", () => ({ model_id: "12" }), ["model_id"]);

    expect(patchGraphNodes).not.toHaveBeenCalled();
    expect(showGlobalMessage).toHaveBeenCalledWith(expect.stringContaining("已有线路连接"));
  });

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
      nodes: [firstWindNode, secondWindNode],
      normalizeProjectMeasurements,
      setProjectMeasurements: vi.fn(),
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

  test("批量修改开关 status 时逐节点联动 closed_status", () => {
    const sw1 = createDefaultNode("ac-switch", { x: 100, y: 100 });
    const sw2 = createDefaultNode("ac-box-breaker", { x: 240, y: 100 });
    const patchGraphNodes = vi.fn();
    const applyBatchCommonParamPatch = createApplyBatchCommonParamPatch({
      NODE_LABEL_FOOTPRINT_PARAM_KEYS: new Set<string>(),
      activeSelectedNodeIds: [sw1.id, sw2.id],
      canBatchEditParam: vi.fn(() => true),
      commitNodeFootprintUpdates: vi.fn(),
      edgeListForNodeIds: vi.fn(() => []),
      nodeById: new Map([
        [sw1.id, sw1],
        [sw2.id, sw2]
      ]),
      nodes: [sw1, sw2],
      normalizeProjectMeasurements,
      setProjectMeasurements: vi.fn(),
      patchGraphNodes,
      pushUndoSnapshot: vi.fn(),
      requireEditMode: vi.fn(() => true),
      undoScopeForGraphPatch: vi.fn(() => ({})),
      writeOperationLog: vi.fn()
    });
    const applyBatchCommonParam = createApplyBatchCommonParam({
      PARAM_LABELS: { status: "运行状态" },
      applyBatchCommonParamPatch,
      canBatchEditParam: vi.fn(() => true),
      normalizeNodeLabelDisplayMode: (value: string) => value,
      normalizeRatioParameterInputValue
    });

    applyBatchCommonParam("status", "0");

    expect(patchGraphNodes).toHaveBeenCalledTimes(1);
    const patchedNodes = patchGraphNodes.mock.calls[0][0];
    expect(patchedNodes).toHaveLength(2);
    expect(patchedNodes.every((node: typeof sw1) => node.params.status === "0" && node.params.closed_status === "0")).toBe(true);
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
      nodes: [firstStorage, secondStorage],
      normalizeProjectMeasurements,
      setProjectMeasurements: vi.fn(),
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

  // 批量键白名单不排除 is_gateway/bound_device_id(多选容器出现这两个批量行),
  // 两条提交分支(patchGraphNodes / commitNodeFootprintUpdates)都必须喂量测归一化出口
  test("批量写绑定参数 → 容器量测组随归一化收敛", () => {
    const container = createDefaultNode("ac-vpp-box", { x: 0, y: 0 });
    container.params.is_gateway = "1";
    const member = createDefaultNode("ac-load", { x: 0, y: 0 });
    member.containerId = container.id;
    const item = { id: "p", measurementTypeId: "activePower", sourcePoint: "p", name: "有功" };
    let captured: any;
    const applyBatchCommonParamPatch = createApplyBatchCommonParamPatch({
      NODE_LABEL_FOOTPRINT_PARAM_KEYS: new Set<string>(),
      activeSelectedNodeIds: [container.id],
      canBatchEditParam: vi.fn(() => true),
      commitNodeFootprintUpdates: vi.fn(),
      edgeListForNodeIds: vi.fn(() => []),
      nodeById: new Map([[container.id, container], [member.id, member]]),
      nodes: [container, member],
      normalizeProjectMeasurements,
      patchGraphNodes: vi.fn(),
      pushUndoSnapshot: vi.fn(),
      requireEditMode: vi.fn(() => true),
      setProjectMeasurements: (updater: any) => {
        captured = updater({ version: 1, groups: [{ id: `measurement-${member.id}`, nodeId: member.id, items: [item] }] });
      },
      undoScopeForGraphPatch: vi.fn(() => ({})),
      writeOperationLog: vi.fn()
    });

    applyBatchCommonParamPatch("批量绑定", () => ({ bound_device_id: member.id }), ["bound_device_id"]);

    expect(captured.groups.some((g: any) => g.nodeId === container.id)).toBe(true);
  });

  test("批量走 footprint 分支(标签占位参数)同样收敛量测", () => {
    const container = createDefaultNode("ac-vpp-box", { x: 0, y: 0 });
    container.params.is_gateway = "1";
    const member = createDefaultNode("ac-load", { x: 0, y: 0 });
    member.containerId = container.id;
    const item = { id: "p", measurementTypeId: "activePower", sourcePoint: "p", name: "有功" };
    const commitNodeFootprintUpdates = vi.fn();
    let captured: any;
    const applyBatchCommonParamPatch = createApplyBatchCommonParamPatch({
      // bound_device_id 冒充 footprint 键,只为一箭双雕命中该分支(键集内容非本测试关注点)
      NODE_LABEL_FOOTPRINT_PARAM_KEYS: new Set<string>(["bound_device_id"]),
      activeSelectedNodeIds: [container.id],
      canBatchEditParam: vi.fn(() => true),
      commitNodeFootprintUpdates,
      edgeListForNodeIds: vi.fn(() => []),
      nodeById: new Map([[container.id, container], [member.id, member]]),
      nodes: [container, member],
      normalizeProjectMeasurements,
      patchGraphNodes: vi.fn(),
      pushUndoSnapshot: vi.fn(),
      requireEditMode: vi.fn(() => true),
      setProjectMeasurements: (updater: any) => {
        captured = updater({ version: 1, groups: [{ id: `measurement-${member.id}`, nodeId: member.id, items: [item] }] });
      },
      undoScopeForGraphPatch: vi.fn(() => ({})),
      writeOperationLog: vi.fn()
    });

    applyBatchCommonParamPatch("批量绑定", () => ({ bound_device_id: member.id }), ["bound_device_id"]);

    expect(commitNodeFootprintUpdates).toHaveBeenCalled();
    expect(captured.groups.some((g: any) => g.nodeId === container.id)).toBe(true);
  });
});

describe("single device parameter updates", () => {
  test("double-click confirmation restores a locked model_id while preserving other draft changes", () => {
    const node = createDefaultNode("ac-district-load", { x: 100, y: 100 });
    node.params.model_id = "33";
    const line = createDefaultNode("ac-routable-line", { x: 240, y: 100 });
    line.params._routableLineTargetNodeId = node.id;
    const draftNode = {
      ...node,
      params: { ...node.params, model_id: "34", p_set: "8" }
    };
    const patchGraphNodes = vi.fn();
    const showGlobalMessage = vi.fn();
    vi.stubGlobal("showGlobalMessage", showGlobalMessage);

    createConfirmNodeDoubleClickDialog({
      finishNodeDoubleClickDialogPointerOperation: vi.fn(),
      nodeById: new Map([[node.id, node], [line.id, line]]),
      nodeDoubleClickDialog: { nodeId: node.id, kind: "device" },
      nodeDoubleClickDraft: { nodeId: node.id, node: draftNode },
      nodeDoubleClickDraftHasModelChanges: (current: typeof node, draft: typeof node) =>
        current.name !== draft.name || JSON.stringify(current.params) !== JSON.stringify(draft.params),
      patchGraphNodes,
      pushNodeOnlyUndoSnapshot: vi.fn(),
      rememberNodeDoubleClickDialogGuard: vi.fn(),
      setNodeDoubleClickDialog: vi.fn(),
      setNodeDoubleClickDraft: vi.fn()
    })();

    expect(showGlobalMessage).toHaveBeenCalledWith(expect.stringContaining("已有线路连接"));
    expect(patchGraphNodes).toHaveBeenCalledOnce();
    expect(patchGraphNodes.mock.calls[0][0][0].params).toMatchObject({ model_id: "33", p_set: "8" });
  });

  test("locks model_id after a line is connected and unlocks it after the last line is removed", () => {
    const node = createDefaultNode("dc-feeder-source", { x: 100, y: 100 });
    node.params.model_id = "22";
    const line = createDefaultNode("dc-routable-line", { x: 240, y: 100 });
    line.params._routableLineTargetNodeId = node.id;
    const patchGraphNodes = vi.fn();
    const showGlobalMessage = vi.fn();
    vi.stubGlobal("showGlobalMessage", showGlobalMessage);
    const baseScope = {
      NODE_LABEL_FOOTPRINT_PARAM_KEYS: new Set<string>(),
      commitNodeFootprintUpdates: vi.fn(),
      normalizeNodeLabelDisplayMode: (value: string) => value,
      normalizeRatioParameterInputValue,
      patchGraphNodes,
      pushNodeOnlyUndoSnapshot: vi.fn(),
      pushUndoSnapshot: vi.fn(),
      requireEditMode: vi.fn(() => true),
      selectedNodeId: node.id,
      undoScopeForNodeFootprintPatch: vi.fn(() => ({}))
    };

    createUpdateParam({ ...baseScope, nodeById: new Map([[node.id, node], [line.id, line]]) })("model_id", "23");
    expect(patchGraphNodes).not.toHaveBeenCalled();
    expect(showGlobalMessage).toHaveBeenCalledWith(expect.stringContaining("已有线路连接"));

    createUpdateParam({ ...baseScope, nodeById: new Map([[node.id, node]]) })("model_id", "23");
    expect(patchGraphNodes).toHaveBeenCalledOnce();
    expect(patchGraphNodes.mock.calls[0][0][0].params.model_id).toBe("23");
  });

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

  test("开关类写 status 时联动写 closed_status（渲染只认 closed_status）", () => {
    const node = createDefaultNode("ac-switch", { x: 100, y: 100 });
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

    updateParam("status", "0");
    expect(patchGraphNodes).toHaveBeenCalledTimes(1);
    const updated = patchGraphNodes.mock.calls[0][0][0];
    expect(updated.params.status).toBe("0");
    expect(updated.params.closed_status).toBe("0");

    patchGraphNodes.mockClear();
    // 反向联动：写 closed_status 时同写 status
    updateParam("closed_status", "0");
    expect(patchGraphNodes).toHaveBeenCalledTimes(1);
    const updated2 = patchGraphNodes.mock.calls[0][0][0];
    expect(updated2.params.closed_status).toBe("0");
    expect(updated2.params.status).toBe("0");
  });

  test("syncs transformer side-voltage param changes to the matching terminal vbase", () => {
    const node = createDefaultNode("ac-transformer", { x: 100, y: 100 });
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

    updateParam("i_vbase", "750");
    expect(patchGraphNodes).toHaveBeenCalledTimes(1);
    const updated = patchGraphNodes.mock.calls[0][0][0];
    expect(updated.params.i_vbase).toBe("750");
    // 双绕组 i_vbase 对应端子 t1 (index 0)，其 vbase 应同步
    expect(updated.terminals[0].vbase).toBe("750");

    patchGraphNodes.mockClear();
    updateParam("j_vbase", "35");
    expect(patchGraphNodes).toHaveBeenCalledTimes(1);
    const updated2 = patchGraphNodes.mock.calls[0][0][0];
    expect(updated2.params.j_vbase).toBe("35");
    // 双绕组 j_vbase 对应端子 t2 (index 1)，其 vbase 应同步
    expect(updated2.terminals[1].vbase).toBe("35");
  });

  test("syncs vertical transformer side-voltage param changes to terminal vbase", () => {
    const node = createDefaultNode("ac-transformer-vertical", { x: 0, y: 0 });
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

    updateParam("i_vbase", "800");
    expect(patchGraphNodes).toHaveBeenCalledTimes(1);
    const updated = patchGraphNodes.mock.calls[0][0][0];
    expect(updated.params.i_vbase).toBe("800");
    // -vertical 变体：i_vbase 对应端子 t1 (index 0)，vbase 应同步
    expect(updated.terminals[0].vbase).toBe("800");
  });

  test("spreads transformer side-voltage change to the side island only", () => {
    const t = createDefaultNode("ac-transformer", { x: 0, y: 0 });
    const hb = createDefaultNode("ac-bus", { x: 100, y: 0 });
    const lb = createDefaultNode("ac-bus", { x: 200, y: 0 });
    const load = createDefaultNode("ac-load", { x: 150, y: 0 });
    hb.params.vbase = "0";
    lb.params.vbase = "0";
    load.params.vbase = "0";
    const edges = [
      { id: "e1", sourceId: t.id, targetId: hb.id, sourceTerminalId: "t1", targetTerminalId: "t1" },
      { id: "e2", sourceId: t.id, targetId: lb.id, sourceTerminalId: "t2", targetTerminalId: "t2" },
      { id: "e3", sourceId: load.id, targetId: hb.id, sourceTerminalId: "t1", targetTerminalId: "t2" }
    ];
    const nodes = [t, hb, lb, load];
    const patchGraphNodes = vi.fn();
    const updateParam = createUpdateParam({
      NODE_LABEL_FOOTPRINT_PARAM_KEYS: new Set<string>(),
      commitNodeFootprintUpdates: vi.fn(),
      nodeById: new Map(nodes.map((n) => [n.id, n])),
      normalizeNodeLabelDisplayMode: (value: string) => value,
      normalizeRatioParameterInputValue,
      patchGraphNodes,
      pushNodeOnlyUndoSnapshot: vi.fn(),
      pushUndoSnapshot: vi.fn(),
      requireEditMode: vi.fn(() => true),
      selectedNodeId: t.id,
      undoScopeForNodeFootprintPatch: vi.fn(() => ({})),
      nodes,
      edges,
      setVoltageBaseTerminalValueForTopologySide,
      undoScopeForGraphPatch: vi.fn(() => ({}))
    });

    updateParam("i_vbase", "750");

    const updated = patchGraphNodes.mock.calls[0][0] as Array<{ id: string; params: Record<string, string>; terminals: Array<{ id: string; vbase: string }> }>;
    // 仅高压分压侧同步：高压母线 + 其上设备统一为新电压
    expect(updated.some((node) => node.id === hb.id)).toBe(true);
    expect(updated.find((node) => node.id === hb.id)?.params.vbase).toBe("750");
    expect(updated.some((node) => node.id === load.id)).toBe(true);
    expect(updated.find((node) => node.id === load.id)?.params.vbase).toBe("750");
    // 低压侧严禁同步（分压隔离）
    expect(updated.some((node) => node.id === lb.id)).toBe(false);
    // 变压器自身：该侧侧电压 + 端子 vbase 同步
    const updatedTransformer = updated.find((node) => node.id === t.id)!;
    expect(updatedTransformer.params.i_vbase).toBe("750");
    expect(updatedTransformer.terminals[0].vbase).toBe("750");
  });

  // 三绕组的分侧是 i/k/j = 高/中/低，与双绕组的 i/j = 高/低**不是同一张表**。
  // 曾出现过：改中压侧（k_vbase）的值，结果写进了低压侧（j_vbase）—— 因为
  // `voltageBaseParamTerminalIds` 把 j_vbase 一律当成 1 号端子（双绕组的低压侧），
  // 而三绕组的 1 号端子是**中压**侧；k_vbase 那一支当时根本不存在。
  test("spreads three-winding mid-voltage change to the mid side only, never to the low side", () => {
    const t = createDefaultNode("ac-three-winding-transformer", { x: 0, y: 0 });
    const highBus = createDefaultNode("ac-bus", { x: 100, y: 0 });
    const midBus = createDefaultNode("ac-bus", { x: 200, y: 0 });
    const lowBus = createDefaultNode("ac-bus", { x: 300, y: 0 });
    for (const bus of [highBus, midBus, lowBus]) {
      bus.params.vbase = "0";
    }
    const [highId, midId, lowId] = [t.terminals[0].id, t.terminals[1].id, t.terminals[2].id];
    // 母线端子由 synchronizeBusTerminalsWithEdges 按边合成，故这里按既有用例的写法写字面量 id
    const edges = [
      { id: "e1", sourceId: t.id, targetId: highBus.id, sourceTerminalId: highId, targetTerminalId: "t1" },
      { id: "e2", sourceId: t.id, targetId: midBus.id, sourceTerminalId: midId, targetTerminalId: "t1" },
      { id: "e3", sourceId: t.id, targetId: lowBus.id, sourceTerminalId: lowId, targetTerminalId: "t1" }
    ];
    const nodes = [t, highBus, midBus, lowBus];
    const patchGraphNodes = vi.fn();
    const updateParam = createUpdateParam({
      NODE_LABEL_FOOTPRINT_PARAM_KEYS: new Set<string>(),
      commitNodeFootprintUpdates: vi.fn(),
      nodeById: new Map(nodes.map((n) => [n.id, n])),
      normalizeNodeLabelDisplayMode: (value: string) => value,
      normalizeRatioParameterInputValue,
      patchGraphNodes,
      pushNodeOnlyUndoSnapshot: vi.fn(),
      pushUndoSnapshot: vi.fn(),
      requireEditMode: vi.fn(() => true),
      selectedNodeId: t.id,
      undoScopeForNodeFootprintPatch: vi.fn(() => ({})),
      nodes,
      edges,
      setVoltageBaseTerminalValueForTopologySide,
      undoScopeForGraphPatch: vi.fn(() => ({}))
    });

    const lowBefore = t.params.j_vbase;
    updateParam("k_vbase", "110");

    const updated = patchGraphNodes.mock.calls[0][0] as Array<{
      id: string;
      params: Record<string, string>;
      terminals: Array<{ id: string; vbase: string }>;
    }>;
    const updatedTransformer = updated.find((node) => node.id === t.id)!;
    // 低压侧：参数与端子都严禁被动到（这正是不变量「严禁跨分压侧」）
    expect(updatedTransformer.params.j_vbase).toBe(lowBefore);
    expect(updatedTransformer.terminals[2].vbase).not.toBe("110");
    // 中压侧：参数与端子都要改到
    expect(updatedTransformer.params.k_vbase).toBe("110");
    expect(updatedTransformer.terminals[1].vbase).toBe("110");
    // 岛的范围：中压母线被改，高/低压母线不受影响
    expect(updated.find((node) => node.id === midBus.id)?.params.vbase).toBe("110");
    expect(updated.some((node) => node.id === highBus.id)).toBe(false);
    expect(updated.some((node) => node.id === lowBus.id)).toBe(false);
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

  test("rejects forbidden model-association templates before clearing the current selection", () => {
    const originalShowGlobalMessage = (globalThis as any).showGlobalMessage;
    const messages: string[] = [];
    (globalThis as any).showGlobalMessage = (message: string) => messages.push(message);
    const cases = [
      { modelType: "厂站", kind: "ac-district-source", message: "厂站模型不能包含台区类电源/负荷。" },
      { modelType: "馈线", kind: "dc-feeder-load", message: "馈线模型不能包含馈线类电源/负荷。" },
      { modelType: "台区", kind: "ac-station-load", message: "台区模型不能包含厂站类电源/负荷。" }
    ] as const;

    try {
      for (const { modelType, kind, message } of cases) {
        const setSelectedNodeIds = vi.fn();
        const setLibraryPlacement = vi.fn();
        const writeOperationLog = vi.fn();
        const startLibraryDevicePlacement = createStartLibraryDevicePlacement({
          componentLibraryDisplayMode: "expanded",
          hideLibraryFlyout: vi.fn(),
          isRoutableLineDeviceKind,
          modelType,
          requireEditMode: vi.fn(() => true),
          resetConnectPreviewState: vi.fn(),
          resetRoutableLinePreviewState: vi.fn(),
          setCanvasSelectionScope: vi.fn(),
          setConnectSource: vi.fn(),
          setContextMenu: vi.fn(),
          setLibraryPlacement,
          setMode: vi.fn(),
          setRewiring: vi.fn(),
          setRoutableLinePlacement: vi.fn(),
          setSelectedEdgeId: vi.fn(),
          setSelectedEdgeIds: vi.fn(),
          setSelectedNodeIds,
          setStaticDrawing: vi.fn(),
          writeOperationLog
        });

        startLibraryDevicePlacement(DEVICE_LIBRARY_BY_KIND.get(kind)!);

        expect(messages.at(-1), `${modelType}:${kind}`).toBe(message);
        expect(setSelectedNodeIds, `${modelType}:${kind}`).not.toHaveBeenCalled();
        expect(setLibraryPlacement, `${modelType}:${kind}`).not.toHaveBeenCalled();
        expect(writeOperationLog).toHaveBeenCalledWith(`拒绝放置图元：${message}`);
      }
    } finally {
      if (originalShowGlobalMessage === undefined) {
        delete (globalThis as any).showGlobalMessage;
      } else {
        (globalThis as any).showGlobalMessage = originalShowGlobalMessage;
      }
    }
  });

  test("keeps graph data and undo history unchanged when a forbidden template reaches the final drop guard", () => {
    const originalShowGlobalMessage = (globalThis as any).showGlobalMessage;
    const messages: string[] = [];
    (globalThis as any).showGlobalMessage = (message: string) => messages.push(message);
    const setGraphArrays = vi.fn();
    const pushUndoSnapshot = vi.fn();
    const placeLibraryDeviceAtPoint = createPlaceLibraryDeviceAtPoint({
      modelType: "馈线",
      pushUndoSnapshot,
      requireEditMode: vi.fn(() => true),
      setGraphArrays,
      writeOperationLog: vi.fn()
    });

    try {
      placeLibraryDeviceAtPoint(DEVICE_LIBRARY_BY_KIND.get("dc-feeder-source")!, { x: 200, y: 180 });

      expect(messages).toEqual(["馈线模型不能包含馈线类电源/负荷。"]);
      expect(pushUndoSnapshot).not.toHaveBeenCalled();
      expect(setGraphArrays).not.toHaveBeenCalled();
    } finally {
      if (originalShowGlobalMessage === undefined) {
        delete (globalThis as any).showGlobalMessage;
      } else {
        (globalThis as any).showGlobalMessage = originalShowGlobalMessage;
      }
    }
  });

  test("reroutes an existing adaptive line after placing a static blocker across its path", () => {
    const canvasBounds = { width: 1200, height: 800 };
    const template = DEVICE_LIBRARY_BY_KIND.get("static-rect")!;
    const line = {
      ...createDefaultNode("ac-routable-line", { x: 720, y: 360 }),
      id: "placement-obstacle-line"
    };
    const repairedLine = {
      ...line,
      params: { ...line.params, _routableLinePoints: "120,240;430,240;430,180;570,180;570,240;880,240" }
    };
    const rebuildRoutableLineDeviceRouteUpdates = vi.fn(() => [repairedLine]);
    const setGraphArrays = vi.fn();
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
      createNodeFromTemplate,
      deviceIndexCounters: {},
      edges: [],
      hasCanvasOriginShift: vi.fn(() => false),
      isInteractiveStaticDrawingKind: vi.fn(() => false),
      isRoutableLineDeviceKind,
      isStaticBoxLikeTemplate: vi.fn(() => false),
      lastCanvasPointerRef: { current: null },
      lastRawCanvasPointerRef: { current: null },
      leftTopCanvasOriginShiftForContent: vi.fn(() => ({ x: 0, y: 0 })),
      markBusTerminalSyncDirtyForEdges: vi.fn(),
      nodes: [line],
      pushUndoSnapshot: vi.fn(),
      rebuildRoutableLineDeviceRouteUpdates,
      rejectAutoCanvasExpansionForContent: vi.fn(() => false),
      requireEditMode: vi.fn(() => true),
      routeRoutableLineDevice: vi.fn((node) => node),
      setCanvasSelectionScope: vi.fn(),
      setDeviceIndexCounters: vi.fn(),
      setGraphArrays,
      setLibraryPlacement: vi.fn(),
      setMode: vi.fn(),
      setSelectedEdgeId: vi.fn(),
      setSelectedEdgeIds: vi.fn(),
      setSelectedNodeIds: vi.fn(),
      shiftCachedRoutesForCanvasOrigin: vi.fn(),
      startInteractiveStaticDrawing: vi.fn(),
      startLibraryDevicePlacement: vi.fn(),
      translateEdgeBy: vi.fn((edge) => edge),
      translateNodeBy: vi.fn((node) => node),
      translatePointBy: vi.fn((point) => point),
      writeOperationLog: vi.fn()
    });

    placeLibraryDeviceAtPoint(template, { x: 500, y: 240 });

    const placedNode = setGraphArrays.mock.calls[0][0].find((node: any) => node.id !== line.id);
    expect(rebuildRoutableLineDeviceRouteUpdates).toHaveBeenCalledWith(
      [line, placedNode],
      [line.id],
      canvasBounds,
      [line],
      { movedNodeIds: [placedNode.id] }
    );
    expect(setGraphArrays).toHaveBeenCalledWith([repairedLine, placedNode], []);
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
      rebuildRoutableLineDeviceRouteUpdates: vi.fn(() => []),
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

// ─── 归属入口的量测同步:Alt 拖出 / 绑定变更后量测必须走归一化出口 ─────────────
// 归一化出口(normalizeProjectMeasurements)内含容器量测组收敛;入口只改图不喂量测时,
// 关口解绑后容器量测组会残留,绑定建立后容器组又迟迟不出现。
describe("容器归属入口的量测同步", () => {
  const bare = (id: string, kind: string, extra: Record<string, unknown> = {}) => ({
    id, kind, name: id, position: { x: 0, y: 0 }, size: { width: 60, height: 40 },
    rotation: 0, scale: 1, params: {}, terminals: [], ...extra,
  });
  const mirrorItem = { id: "p", measurementTypeId: "activePower", sourcePoint: "p", name: "有功" };
  const measurementsWithMirror = () => ({
    version: 1,
    groups: [
      { id: "measurement-m1", nodeId: "m1", items: [mirrorItem] },
      { id: "measurement-c1", nodeId: "c1", items: [mirrorItem] },
    ],
  });
  const hasGroup = (config: any, nodeId: string) => config.groups.some((g: any) => g.nodeId === nodeId);
  const mergeById = (base: any[], extra: any[]) => {
    const byId = new Map(base.map((node) => [node.id, node]));
    for (const node of extra) byId.set(node.id, node);
    return [...byId.values()];
  };

  test("Alt 拖出绑定设备:关口解绑 → 容器旧镜像保留(fb13 口径),绑定设备组保留", () => {
    const container = bare("c1", "ac-vpp-box", {
      size: { width: 180, height: 112 },
      params: { is_gateway: "1", bound_device_id: "m1" },
    });
    const member = bare("m1", "ac-load", { containerId: "c1" });
    const nodes = [container, member];
    let captured: any;
    createFinishNodeDrag({
      adjustEdgesAfterNodeMove: () => [],
      applyCanvasBounds: () => {},
      applyNodeTerminalSnap: (delta: any) => delta,
      boundedDeltaForMoveGeometry: () => ({ x: 10, y: 0 }),
      buildMovedNodeUpdates: () => [{ ...member, position: { x: 10, y: 0 } }],
      canvasBoundsForMoveDelta: () => ({}),
      canvasInteractionRef: { current: false },
      clearNodeDragMoveSchedule: () => {},
      commitFastMovedGraphPatches: vi.fn(),
      commitSafeDeltaForDraggingState: () => ({ x: 10, y: 0 }),
      dragDraggedEdgeIdSet: () => new Set(),
      dragMovedBusNodeIdSet: () => new Set(),
      dragMovedNodeIdSet: () => ["m1"],
      dragUndoCapturedRef: { current: false },
      draggingRef: { current: { nodeIds: ["m1"], grabbedNodeIds: ["m1"], affectedEdges: [], edgeIds: [], selection: null } },
      ensureDraggingUndoSnapshot: () => {},
      externalMoveCandidateEdges: () => [],
      finalizeMovedNodeEdgesFast: () => [],
      findMultiNodeDragSnapTargetAtDelta: () => null,
      findSingleNodeDragSnapTargetAtDelta: () => null,
      flushPendingNodeDragMove: () => {},
      graphStore: {},
      hideImperativeMultiNodeDragOverlay: () => {},
      hideImperativeSingleNodeDragPreview: () => {},
      internalMoveEdgeIdsForMovedNodes: () => new Set(),
      isMultiNodeMoveState: () => false,
      mergeAdjustedCandidateEdges: (base: any[]) => base,
      mergeNodeUpdateLists: mergeById,
      nextNodesForMovedGraphCommit: (_store: any, updates: any[]) => mergeById(nodes, updates),
      nodeTerminalSnapTargetRef: { current: null },
      nodes,
      normalizeProjectMeasurements,
      projectListPointerInsideRef: { current: false },
      resetMultiNodeDragOverlayTransform: () => {},
      restoreCanvasSelectionSnapshotWithInspector: () => {},
      routePreserveEdgeIdsForMovedNodes: () => new Set(),
      setDragging: () => {},
      setProjectMeasurements: (updater: any) => { captured = updater(measurementsWithMirror()); },
      shouldFinalizeMovedNodeEdgesSynchronously: () => false,
      showGlobalMessage: vi.fn(),
      synchronousEdgeAdjustmentCandidates: () => [],
      translateInternalMoveCandidateEdges: () => [],
      translateWholeMoveCandidateEdges: () => [],
      updateSmartAlignmentGuides: () => {},
      writeOperationLog: vi.fn(),
    } as any)(true);

    // fb13 口径:解绑后旧镜像保留(不再清空),绑定设备组不受影响
    expect(hasGroup(captured, "c1")).toBe(true);
    expect(hasGroup(captured, "m1")).toBe(true);
  });

  test("绑定设备变更:容器量测组随归一化建立(nodeId 换容器)", () => {
    const container = bare("c1", "ac-vpp-box", { params: { is_gateway: "1" } });
    const member = bare("m1", "ac-load", { containerId: "c1" });
    const nodes = [container, member];
    let captured: any;
    createUpdateParam({
      NODE_LABEL_FOOTPRINT_PARAM_KEYS: new Set<string>(),
      commitNodeFootprintUpdates: vi.fn(),
      nodeById: new Map(nodes.map((node) => [node.id, node])),
      nodes,
      normalizeNodeLabelDisplayMode: (value: string) => value,
      normalizeProjectMeasurements,
      normalizeRatioParameterInputValue,
      patchGraphNodes: vi.fn(),
      pushNodeOnlyUndoSnapshot: vi.fn(),
      pushUndoSnapshot: vi.fn(),
      requireEditMode: () => true,
      selectedNodeId: "c1",
      setProjectMeasurements: (updater: any) => { captured = updater({ version: 1, groups: [{ id: "measurement-m1", nodeId: "m1", items: [mirrorItem] }] }); },
      undoScopeForNodeFootprintPatch: () => ({})
    } as any)("bound_device_id", "m1");

    expect(hasGroup(captured, "c1")).toBe(true);
    expect(captured.groups.find((g: any) => g.nodeId === "c1").items.length).toBe(1);
  });

  test("关关口:容器旧镜像保留(fb13 口径,不再随归一化删除)", () => {
    const container = bare("c1", "ac-vpp-box", { params: { is_gateway: "1", bound_device_id: "m1" } });
    const member = bare("m1", "ac-load", { containerId: "c1" });
    const nodes = [container, member];
    let captured: any;
    createUpdateParam({
      NODE_LABEL_FOOTPRINT_PARAM_KEYS: new Set<string>(),
      commitNodeFootprintUpdates: vi.fn(),
      nodeById: new Map(nodes.map((node) => [node.id, node])),
      nodes,
      normalizeNodeLabelDisplayMode: (value: string) => value,
      normalizeProjectMeasurements,
      normalizeRatioParameterInputValue,
      patchGraphNodes: vi.fn(),
      pushNodeOnlyUndoSnapshot: vi.fn(),
      pushUndoSnapshot: vi.fn(),
      requireEditMode: () => true,
      selectedNodeId: "c1",
      setProjectMeasurements: (updater: any) => { captured = updater(measurementsWithMirror()); },
      undoScopeForNodeFootprintPatch: () => ({})
    } as any)("is_gateway", "0");

    // fb13 口径:关关口后旧镜像保留(不再随归一化删除)
    expect(hasGroup(captured, "c1")).toBe(true);
    expect(hasGroup(captured, "m1")).toBe(true);
  });
});

// ─── 变换提交的容器跟随(旋转/缩放后容器立即重算,不必等下一次 enforce) ───────
const bare = (id: string, kind: string, extra: Record<string, unknown> = {}) => ({
  id, kind, name: id, position: { x: 0, y: 0 }, size: { width: 40, height: 30 },
  rotation: 0, scale: 1, params: { _labelVisible: "0" }, terminals: [], ...extra,
}) as any;
const mergeById = (base: any[], extra: any[]) => {
  const byId = new Map(base.map((node) => [node.id, node]));
  for (const node of extra) byId.set(node.id, node);
  return [...byId.values()];
};
/** 断言容器真实矩形(position 为中心)包住成员的视觉包围盒 */
const expectContainerCovers = (container: any, member: any) => {
  const r = {
    x1: container.position.x - container.size.width / 2,
    y1: container.position.y - container.size.height / 2,
    x2: container.position.x + container.size.width / 2,
    y2: container.position.y + container.size.height / 2
  };
  const b = calculateNodeVisualBounds(member);
  expect(b.left).toBeGreaterThanOrEqual(r.x1);
  expect(b.right).toBeLessThanOrEqual(r.x2);
  expect(b.top).toBeGreaterThanOrEqual(r.y1);
  expect(b.bottom).toBeLessThanOrEqual(r.y2);
};
const containerBase = (id = "c1") => bare(id, "ac-vpp-box", { size: { width: 180, height: 112 } });
/**
 * 面板几何行(倍率 / 坐标 / 旋转)提交:走生产同一出口 createUpdateSelectedNode。
 * 同时捕获撤销作用域(第 3 参)与坐标分支交给 commitFastMovedGraphPatches 的节点更新。
 */
const runPanelGeometryWrite = (nodes: any[], targetId: string, patch: any) => {
  const store = createGraphStore(nodes, []);
  let committed = store;
  let undoScope: any;
  let movedUpdates: any[] = [];
  const target = store.nodeMap.get(targetId)!;
  createUpdateSelectedNode({
    CANVAS_AUTO_EXPAND_PADDING: 40,
    adjustEdgesAfterNodeMove: (edges: any[]) => edges,
    applyCanvasBounds: () => {},
    canvasBounds: { width: 2000, height: 2000 },
    canvasBoundsForAutoExpandedGraphContent: () => ({ width: 2000, height: 2000 }),
    clampNodePositionToExpandableBounds: (_node: any, _bounds: any, position: any) => position,
    commitFastMovedGraphPatches: (updates: any[]) => { movedUpdates = updates; },
    currentStoredRoutePointsForEdge: () => ({}),
    edgeListForNodeIds: () => [],
    expandCanvasToFitGraph: () => {},
    finalizeMovedNodeEdgesFast: () => [],
    focusedGroupedNodeMovesGroup: false,
    graphStore: store,
    graphStoreApplyPatch,
    mergeNodeUpdateLists: mergeById,
    nodeById: store.nodeMap,
    nodes: store.nodes,
    overlayGraphStoreNodes,
    patchGraphNodes: vi.fn(),
    pushNodeOnlyUndoSnapshot: vi.fn(),
    pushUndoSnapshot: (_a: any, _b: any, scope: any) => { undoScope = scope; },
    rebuildEdgeUpdatesAfterNodeGeometryChange: () => [],
    rebuildRoutableLineNodeUpdatesForChangedNodes: () => [],
    rejectAutoCanvasExpansionForContent: () => false,
    requireEditMode: () => true,
    selectedNode: target,
    selectedNodeId: targetId,
    setGraphStore: (updater: any) => { committed = updater(store); },
    snapshotEdgePoints: () => ({}),
    undoScopeForGraphPatch: () => ({ kind: "patch-scope" })
  } as any)(patch);
  return { store: committed, undoScope, movedUpdates };
};

describe("变换提交的容器跟随", () => {
  test("单节点缩放成员:容器重算并入同一次 store 提交", () => {
    const container = containerBase();
    const member = bare("m1", "ac-load", { containerId: "c1" });
    // 缩放拖动期间实时预览已把放大后的成员写进 store;收尾提交只做 clamp + 容器跟随
    const scaledMember = { ...member, size: { width: 300, height: 200 } };
    const store = createGraphStore([container, scaledMember], []);
    let committed = store;
    createFinishTransformDrag({
      CANVAS_AUTO_EXPAND_PADDING: 40,
      applyCanvasBounds: () => {},
      canvasBounds: { width: 1000, height: 800 },
      canvasBoundsForAutoExpandedGraphContent: () => ({ width: 1000, height: 800 }),
      clampNodePositionToBounds: (node: any) => node.position,
      graphStore: store,
      graphStoreApplyPatch,
      graphStorePatchGraphFromArrays,
      isGroupTransformDrag: () => false,
      latestGraphStoreRef: { current: store },
      markRouteEdgesDirty: () => {},
      markStoredRouteEdgesDirty: () => {},
      mergeNodeUpdateLists: mergeById,
      nodeById: new Map([[container.id, container], [member.id, member]]),
      overlayGraphStoreNodes,
      rebuildEdgeUpdatesAfterNodeGeometryChange: () => [],
      rebuildRoutableLineNodeUpdatesForChangedNodes: () => [],
      rejectAutoCanvasExpansionForContent: () => false,
      setGraphStore: (updater: any) => { committed = updater(store); },
      setTransformDrag: () => {},
      singleTransformNodeUpdate: () => null,
      transformDrag: { kind: "se", nodeId: "m1", originalNode: { node: member }, startPoint: { x: 0, y: 0 }, previewPoint: { x: 10, y: 10 }, historyCaptured: true },
      transformDragChangedRef: { current: true },
      writeOperationLog: () => {}
    } as any)();

    const nextContainer = committed.nodeMap.get("c1")!;
    expect(nextContainer).not.toBe(container);
    expect(nextContainer.size).toEqual({ width: 300 + 48, height: 200 + 48 });
    expectContainerCovers(nextContainer, scaledMember);
  });

  // 用户实况:手动拖角放大交流容器 → 圈进的未归属设备必须被排斥到框外(此前只重算几何不挤出)
  test("容器拖角放大圈入未归属设备:非成员被推到间隙 50,容器保留手动尺寸", () => {
    const container = containerBase();
    const member = bare("m1", "ac-load", { containerId: "c1" });
    // 拖角 resize 的预览期已把新 size 写进 store(与上一条单节点缩放同型);收尾提交做容器收尾
    const enlarged = { ...container, size: { width: 400, height: 300 } };
    const neighbor = bare("n1", "ac-load", { position: { x: 150, y: 0 } }); // 放大后落进矩形、无归属
    const store = createGraphStore([enlarged, member, neighbor], []);
    let committed = store;
    createFinishTransformDrag({
      CANVAS_AUTO_EXPAND_PADDING: 40,
      applyCanvasBounds: () => {},
      canvasBounds: { width: 1000, height: 800 },
      canvasBoundsForAutoExpandedGraphContent: () => ({ width: 1000, height: 800 }),
      clampNodePositionToBounds: (node: any) => node.position,
      graphStore: store,
      graphStoreApplyPatch,
      graphStorePatchGraphFromArrays,
      isGroupTransformDrag: () => false,
      latestGraphStoreRef: { current: store },
      markRouteEdgesDirty: () => {},
      markStoredRouteEdgesDirty: () => {},
      mergeNodeUpdateLists: mergeById,
      nodeById: new Map([[enlarged.id, enlarged], [member.id, member], [neighbor.id, neighbor]]),
      overlayGraphStoreNodes,
      rebuildEdgeUpdatesAfterNodeGeometryChange: () => [],
      rebuildRoutableLineNodeUpdatesForChangedNodes: () => [],
      rejectAutoCanvasExpansionForContent: () => false,
      setGraphStore: (updater: any) => { committed = updater(store); },
      setTransformDrag: () => {},
      singleTransformNodeUpdate: () => null,
      transformDrag: { kind: "se", nodeId: "c1", startPoint: { x: 90, y: 56 }, previewPoint: { x: 200, y: 150 }, historyCaptured: true },
      transformDragChangedRef: { current: true },
      writeOperationLog: () => {}
    } as any)();

    // 容器:手动尺寸保留(不被成员包围盒打回)
    const nextContainer = committed.nodeMap.get("c1")!;
    expect(nextContainer.size).toEqual({ width: 400, height: 300 });
    // 非成员:推到与容器真实矩形间隙 = 排斥带 50
    const placed = committed.nodeMap.get("n1")!;
    expect(placed).not.toBe(neighbor);
    const r = {
      x1: nextContainer.position.x - nextContainer.size.width / 2,
      y1: nextContainer.position.y - nextContainer.size.height / 2,
      x2: nextContainer.position.x + nextContainer.size.width / 2,
      y2: nextContainer.position.y + nextContainer.size.height / 2
    };
    const b = calculateNodeVisualBounds(placed);
    expect(Math.max(r.x1 - b.right, b.left - r.x2, r.y1 - b.bottom, b.top - r.y2)).toBe(50);
  });

  test("面板倍率写容器:折算进 size(I1),普通设备仍写 scale", () => {
    const container = runPanelGeometryWrite([containerBase()], "c1", { scale: 2, scaleX: 2, scaleY: 2 }).store.nodeMap.get("c1")!;
    expect(container.size).toEqual({ width: 360, height: 224 }); // 容器几何恒在 size
    expect(container.scaleX).toBe(1);
    expect(container.scaleY).toBe(1);

    const device = runPanelGeometryWrite([bare("m9", "ac-load")], "m9", { scale: 2, scaleX: 2, scaleY: 2 }).store.nodeMap.get("m9")!;
    expect(device.size).toEqual({ width: 40, height: 30 });
    expect(device.scaleX).toBe(2);
  });

  // 撤销作用域:容器收尾(uniform refit 挤出 / 其它容器重算)落在选中节点之外,
  // 走 patch 通道这些节点就在撤销计划外(Ctrl+Z 后残留)→ 有容器时让位 undefined(全量对比,三处先例同款)
  test("面板几何提交:图中有容器 → 撤销作用域让位(undefined);无容器 → 保持 patch 通道", () => {
    const withContainer = runPanelGeometryWrite(
      [containerBase(), bare("m1", "ac-load", { containerId: "c1" })],
      "c1",
      { scale: 2, scaleX: 2, scaleY: 2 }
    );
    expect(withContainer.undoScope).toBeUndefined();

    const withoutContainer = runPanelGeometryWrite([bare("m9", "ac-load")], "m9", { scale: 2, scaleX: 2, scaleY: 2 });
    expect(withoutContainer.undoScope).toEqual({ kind: "patch-scope" });
  });

  // 钳制只针对**尺寸类** patch(倍率 / 尺寸):坐标行是「等同拖动容器」待裁决的 followup,
  // 不得被成员包裹钳制静默改写(容器 180×112 时 X 输 500 曾被拉回 70)
  test("面板改坐标(容器):不被成员包裹钳制改写,原样写入", () => {
    const run = runPanelGeometryWrite(
      [containerBase(), bare("m1", "ac-load", { containerId: "c1" })],
      "c1",
      { position: { x: 500, y: 0 } }
    );
    expect(run.movedUpdates[0].position.x).toBe(500);
  });

  // 面板倍率行是容器的尺寸入口(无条件渲染):与拖角 resize 同收尾 ——
  // 放大圈入的未归属设备要排斥,缩小要钳在「完全包裹成员」下限(否则成员被裁出框外)
  test("面板倍率放大容器圈入未归属设备:非成员被推到间隙 50", () => {
    const container = containerBase();
    const member = bare("m1", "ac-load", { containerId: "c1" });
    const neighbor = bare("n1", "ac-load", { position: { x: 150, y: 0 } }); // 放大后落进矩形、无归属
    const committed = runPanelGeometryWrite([container, member, neighbor], "c1", { scale: 2, scaleX: 2, scaleY: 2 }).store;

    const nextContainer = committed.nodeMap.get("c1")!;
    expect(nextContainer.size).toEqual({ width: 360, height: 224 });
    expectContainerCovers(nextContainer, member);
    const placed = committed.nodeMap.get("n1")!;
    expect(placed).not.toBe(neighbor);
    const r = {
      x1: nextContainer.position.x - nextContainer.size.width / 2,
      y1: nextContainer.position.y - nextContainer.size.height / 2,
      x2: nextContainer.position.x + nextContainer.size.width / 2,
      y2: nextContainer.position.y + nextContainer.size.height / 2
    };
    const b = calculateNodeVisualBounds(placed);
    expect(Math.max(r.x1 - b.right, b.left - r.x2, r.y1 - b.bottom, b.top - r.y2)).toBe(50);
  });

  test("面板倍率缩小容器:钳在「完全包裹成员」下限,成员不被裁出", () => {
    const container = bare("c1", "ac-vpp-box", { size: { width: 360, height: 224 } });
    const member = bare("m1", "ac-load", { containerId: "c1", size: { width: 300, height: 200 } });
    const committed = runPanelGeometryWrite([container, member], "c1", { scale: 0.5, scaleX: 0.5, scaleY: 0.5 }).store;

    // 0.5 倍折算得 180×112 < 下限(成员 300×200 + 内侧留白 48) → 钳在下限
    const next = committed.nodeMap.get("c1")!;
    expect(next.size).toEqual({ width: 300 + 48, height: 200 + 48 });
    expectContainerCovers(next, member);
  });

  test("整组缩放:容器几何写 size 且 scale 归一,普通设备仍走 scale", () => {
    const container = containerBase();
    const device = bare("m1", "ac-load");
    const store = createGraphStore([container, device], []);
    const buildUpdates = createBuildGroupTransformNodeUpdates({
      groupTransformGeometry,
      normalizeRotationDegrees,
      transformGroupPoint
    } as any);
    const snapshot = (node: any) => ({
      position: { ...node.position }, rotation: node.rotation,
      scale: node.scale, scaleX: node.scaleX, scaleY: node.scaleY
    });
    const updates = buildUpdates({
      kind: "scale-both",
      groupId: "g1",
      nodeIds: ["c1", "m1"],
      bounds: { left: 0, top: 0, right: 100, bottom: 100 },
      center: { x: 50, y: 50 },
      startPoint: { x: 100, y: 100 },
      originalNodes: { c1: snapshot(container), m1: snapshot(device) },
      originalEdgeRoutes: [],
      proportionalScale: true,
      handleXDirection: 1,
      handleYDirection: 1
    } as any, { x: 150, y: 150 }, store);

    const byId = new Map(updates.map((node) => [node.id, node]));
    // 整组放大 2 倍:容器把 scale 吃进 size(渲染矩形 == size,与 eject 用的矩形同源)
    expect(byId.get("c1")!.size).toEqual({ width: 360, height: 224 });
    expect(byId.get("c1")!.scaleX).toBe(1);
    expect(byId.get("c1")!.scaleY).toBe(1);
    // 普通设备不受影响:尺寸不动,scale 乘上去
    expect(byId.get("m1")!.size).toEqual({ width: 40, height: 30 });
    expect(byId.get("m1")!.scaleX).toBe(2);
  });

  test("整组变换:容器重算并列入变更 id(数组提交只应用变更 id)", () => {
    const container = containerBase();
    const member = bare("m1", "ac-load", { containerId: "c1" });
    const rotatedMember = { ...member, rotation: 45 };
    const store = createGraphStore([container, member], []);
    let committed = store;
    createFinishTransformDrag({
      CANVAS_AUTO_EXPAND_PADDING: 40,
      applyCanvasBounds: () => {},
      buildGroupTransformEdgeUpdates: () => [],
      buildGroupTransformNodeUpdates: () => [rotatedMember],
      canvasBounds: { width: 1000, height: 800 },
      canvasBoundsForAutoExpandedGraphContent: () => ({ width: 1000, height: 800 }),
      clampNodePositionToBounds: (node: any) => node.position,
      graphStore: store,
      graphStoreApplyPatch,
      graphStorePatchGraphFromArrays,
      isGroupTransformDrag: () => true,
      latestGraphStoreRef: { current: store },
      markRouteEdgesDirty: () => {},
      markStoredRouteEdgesDirty: () => {},
      mergeNodeUpdateLists: mergeById,
      nodeById: new Map([[container.id, container], [member.id, member]]),
      overlayEdgeUpdatesForTransform: (edges: any[]) => edges,
      overlayGraphStoreNodes,
      rebuildEdgesAfterNodeGeometryChange: (nodes: any[]) => nodes,
      rebuildRoutableLineNodeUpdatesForChangedNodes: () => [],
      rejectAutoCanvasExpansionForContent: () => false,
      setGraphStore: (updater: any) => { committed = updater(store); },
      setTransformDrag: () => {},
      transformDrag: {
        groupId: "g1",
        kind: "rotate",
        nodeIds: ["m1"],
        originalNodes: { m1: { node: member } },
        originalEdgeRoutes: [],
        previewPoint: { x: 10, y: 10 },
        historyCaptured: true
      },
      transformDragChangedRef: { current: true },
      writeOperationLog: () => {}
    } as any)();

    const nextContainer = committed.nodeMap.get("c1")!;
    expect(nextContainer).not.toBe(container);
    expectContainerCovers(nextContainer, rotatedMember);
  });
});

// ─── 工具栏旋转/镜像的容器跟随(与变换句柄同型:几何变了容器就得跟) ───────────
// 工具栏两条命令改 rotation / position·scaleX 后直接提交;不接容器重算则成员转 90°、
// 镜像翻面后容器矩形停在旧几何(用户可见),直到下一次任意 enforce 才自愈。
describe("工具栏旋转/镜像的容器跟随", () => {
  /** 工具栏两条命令共用的 scope(units / 更新函数由各用例给) */
  const toolbarScope = (args: {
    store: any;
    units: any[];
    nodeUpdates: any[];
    onCommit: (store: any) => void;
  }) => {
    const { store, units, nodeUpdates, onCommit } = args;
    return {
      requireEditMode: () => true,
      selectedLayoutUnits: units,
      pushUndoSnapshot: vi.fn(),
      setSelectedEdgeId: vi.fn(),
      overlayGraphStoreNodes,
      graphStore: store,
      graphStoreApplyPatch,
      rebuildEdgeUpdatesAfterNodeGeometryChange: () => [],
      markRouteEdgesDirty: vi.fn(),
      markStoredRouteEdgesDirty: vi.fn(),
      expandCanvasToFitGraph: vi.fn(),
      setGraphStore: (updater: any) => onCommit(updater(store)),
      writeOperationLog: vi.fn(),
      rotateLayoutUnitNodeUpdates: () => nodeUpdates,
      mirrorLayoutUnitNodeUpdates: () => nodeUpdates,
      buildRotateLayoutUnitEdgeUpdates: () => [],
      buildMirrorLayoutUnitEdgeUpdates: () => []
    } as any;
  };
  const groupUnit = (nodeIds: string[]) => ({ kind: "group", nodeIds, bounds: { left: 0, right: 0, top: 0, bottom: 0 } });

  test("工具栏旋转 90°:成员几何变了 → 容器同批重算", () => {
    const container = containerBase();
    const member = bare("m1", "ac-load", { containerId: "c1" });
    const rotatedMember = { ...member, rotation: 90 };
    const store = createGraphStore([container, member], []);
    let committed = store;

    createRotateSelectedLayoutUnits(toolbarScope({
      store,
      units: [groupUnit(["m1"])],
      nodeUpdates: [rotatedMember],
      onCommit: (next) => { committed = next; }
    }))("right");

    const nextContainer = committed.nodeMap.get("c1")!;
    expect(nextContainer).not.toBe(container);
    expectContainerCovers(nextContainer, rotatedMember);
  });

  test("工具栏镜像:成员挪到轴另一侧 → 容器跟着挪", () => {
    const container = { ...containerBase(), position: { x: 0, y: 0 } };
    const member = bare("m1", "ac-load", { containerId: "c1" });
    const mirroredMember = { ...member, position: { x: 400, y: 0 }, scaleX: -1 };
    const store = createGraphStore([container, member], []);
    let committed = store;

    createMirrorSelectedNodes(toolbarScope({
      store,
      units: [groupUnit(["m1"])],
      nodeUpdates: [mirroredMember],
      onCommit: (next) => { committed = next; }
    }))("horizontal");

    const nextContainer = committed.nodeMap.get("c1")!;
    expect(nextContainer).not.toBe(container);
    expectContainerCovers(nextContainer, mirroredMember);
    // 成员被镜像到 x=400 → 容器中心随包围盒并集右移(不是停在旧位置)
    expect(nextContainer.position.x).toBeGreaterThan(0);
  });

  test("容器自身被旋转:跳过 refit(轴对齐矩形语义),成员不跟转", () => {
    const container = containerBase();
    const member = bare("m1", "ac-load", { containerId: "c1" });
    // 整组旋转里容器不再位于自转中心 → 位置随组转走;成员不在本组,原地不动
    const rotatedContainer = { ...container, position: { x: 300, y: 300 }, rotation: 90 };
    const store = createGraphStore([container, member], []);
    let committed = store;

    createRotateSelectedLayoutUnits(toolbarScope({
      store,
      units: [groupUnit(["c1"])],
      nodeUpdates: [rotatedContainer],
      onCommit: (next) => { committed = next; }
    }))("right");

    const nextContainer = committed.nodeMap.get("c1")!;
    // 容器矩形按用户这次旋转走(不被成员包围盒吸附回原位)
    expect(nextContainer.position).toEqual({ x: 300, y: 300 });
    expect(nextContainer.rotation).toBe(90);
    // 成员不跟转(不在变换集里 = 原对象)
    expect(committed.nodeMap.get("m1")).toBe(member);
  });
});

// ─── fb13:面板「设备类型」行下拉切 kind(容器)────────────────────────────────
// 提交走生产同一出口 createUpdateSelectedNode(非几何 patch 分支):kind 落地 + 单次撤销快照。
// 三容器 kind 同渲染分支/同 180×112/同 ACContainer 段/idx 计数共池(AC_CONTAINER_COUNTER_KEY),
// 故切 kind 不改几何、不重分 idx —— 这里正是把这些不变量钉死。
describe("面板切容器 kind(dev_type 下拉)", () => {
  const runPanelParamWrite = (nodes: any[], targetId: string, patch: any) => {
    const store = createGraphStore(nodes, []);
    const patched: any[] = [];
    const undoLabels: string[] = [];
    const target = store.nodeMap.get(targetId)!;
    createUpdateSelectedNode({
      CANVAS_AUTO_EXPAND_PADDING: 40,
      adjustEdgesAfterNodeMove: (edges: any[]) => edges,
      applyCanvasBounds: () => {},
      canvasBounds: { width: 2000, height: 2000 },
      canvasBoundsForAutoExpandedGraphContent: () => ({ width: 2000, height: 2000 }),
      clampNodePositionToExpandableBounds: (_node: any, _bounds: any, position: any) => position,
      commitFastMovedGraphPatches: () => {},
      currentStoredRoutePointsForEdge: () => ({}),
      edgeListForNodeIds: () => [],
      expandCanvasToFitGraph: () => {},
      finalizeMovedNodeEdgesFast: () => [],
      focusedGroupedNodeMovesGroup: false,
      graphStore: store,
      graphStoreApplyPatch,
      mergeNodeUpdateLists: mergeById,
      nodeById: store.nodeMap,
      nodes: store.nodes,
      overlayGraphStoreNodes,
      patchGraphNodes: (updates: any[]) => patched.push(...updates),
      pushNodeOnlyUndoSnapshot: (_id: string, label: string) => undoLabels.push(label),
      pushUndoSnapshot: vi.fn(),
      rebuildEdgeUpdatesAfterNodeGeometryChange: () => [],
      rebuildRoutableLineNodeUpdatesForChangedNodes: () => [],
      rejectAutoCanvasExpansionForContent: () => false,
      requireEditMode: () => true,
      selectedNode: target,
      selectedNodeId: targetId,
      setGraphStore: () => {},
      snapshotEdgePoints: () => ({}),
      undoScopeForGraphPatch: () => ({ kind: "patch-scope" })
    } as any)(patch);
    return { patched, undoLabels };
  };

  test("虚拟电厂 → 开关箱:kind 落地、尺寸/位置/成员归属不变、只推一次撤销快照", () => {
    const container = containerBase("c1");
    const member = bare("m1", "ac-load", { containerId: "c1" });
    const { patched, undoLabels } = runPanelParamWrite([container, member], "c1", { kind: "ac-switch-box" });

    expect(patched.length).toBe(1);
    expect(patched[0].kind).toBe("ac-switch-box");
    // 几何三 kind 同基准:切 kind 不动尺寸/位置(否则成员会被挤出)
    expect(patched[0].size).toEqual({ width: 180, height: 112 });
    expect(patched[0].position).toEqual(container.position);
    expect(patched[0].containerId).toBeUndefined();
    expect(undoLabels.length).toBe(1);
  });

  test("idx 计数共池:切 kind 不重分已有 idx(池键恒为 ac_container)", () => {
    const container = { ...containerBase("c1"), params: { idx: "7" } };
    const { patched } = runPanelParamWrite([container], "c1", { kind: "ac-distribution-box" });
    expect(patched[0].params.idx).toBe("7");
  });
});
