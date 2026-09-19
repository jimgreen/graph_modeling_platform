import { beforeEach, describe, expect, test, vi } from "vitest";

import {
  createApplySelectedNodeLayout,
  createAutoAlignCanvasGraphics,
  createAutoSpreadCanvasGraphics,
  createCommitRoutableLineDevice,
  createCommitLayoutNodePositions,
  createFinishConnectToTarget,
  createFinishRoutableLineToTarget,
  createFinishRoutableLineEndpointDrag,
  createHandlePointerMove,
  createLoadSavedProject,
  createRequestUnsavedChangeAction,
  createResolveUnsavedChangeAction,
  createRunTopologyCalculation,
  createSaveCurrentProject,
  createStartRoutableLineFromTerminal
} from "./appExtracted/appProjectCanvasFactories";
import { createMergeNodeUpdateLists } from "./appExtracted/appSelectionDragFactories";
import { reconcileNodeWithDefinition as reconcileNodeWithDefinitionReal } from "./definitionInstanceSync";
import { clampCanvasNoScrollOffset } from "./canvasViewport";
import { DEVICE_LIBRARY, DEVICE_LIBRARY_BY_KIND, calculateNodeVisualBounds, canConnectTerminals, createDefaultNode, getNodeScaleX, getNodeScaleY, getTerminalPoint, isBusNode, isCanvasNodeMovable, isLineSegmentBusNode, isRoutableLineDeviceKind, type ModelNode } from "./model";
import {
  createRoutableLineDeviceFromEndpoints,
  routeRoutableLineDevice,
  routableLineDeviceCanvasPoints,
  routableLineDeviceEndpointRefForNode,
  setRoutableLineDeviceCanvasPoints
} from "./model-routing";
import { GLOBAL_LINE_ID_PARAM } from "./global-lines";
import { resizeLineSegmentBusGeometryFromHandleDrag } from "./transformUtils";
import {
  AUTO_ALIGN_DEFAULT_THRESHOLD_PX,
  AUTO_ALIGN_MAX_THRESHOLD_PX,
  AUTO_ALIGN_MIN_THRESHOLD_PX,
  alignNodeLayoutUnits,
  autoAlignNodeLayoutUnits,
  autoSpreadNodeLayoutUnits,
  buildCanvasLayoutUnits
} from "./selectionActions";

// 切空间要落到真模块（清缓存 + 写 cookie + reload），此处只关心它在**何时**被调用，
// 故整模块替换；其余导出原样透传，避免影响本文件其他用例的依赖树。
const switchToSpaceMock = vi.hoisted(() => vi.fn());
vi.mock("./spaceSwitch", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./spaceSwitch")>()),
  switchToSpace: switchToSpaceMock
}));

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

  test("保存仍在进行或失败时，未保存提示显示明确状态并保留待切换操作", async () => {
    let finishSave: ((saved: boolean) => void) | undefined;
    const savePromise = new Promise<boolean>((resolve) => {
      finishSave = resolve;
    });
    const action = {
      kind: "load-project" as const,
      project: {
        id: "feeder-2",
        name: "二号馈线",
        updatedAt: "2026-08-21T00:00:00.000Z",
        project: { version: 1 as const, name: "二号馈线", nodes: [], edges: [] }
      },
      schemeId: "scheme-1",
      label: "切换到二号馈线"
    };
    const loadSavedProjectRecord = vi.fn();
    const setPendingUnsavedAction = vi.fn();
    const resolve = createResolveUnsavedChangeAction({
      enterBrowseMode: vi.fn(),
      loadSavedProjectRecord,
      pendingUnsavedAction: action,
      saveCurrentProject: vi.fn(() => savePromise),
      setPendingUnsavedAction
    });

    const resolution = resolve("save");

    expect(setPendingUnsavedAction).toHaveBeenCalledWith({
      ...action,
      resolving: true,
      resolutionError: ""
    });
    expect(loadSavedProjectRecord).not.toHaveBeenCalled();

    finishSave?.(false);
    await resolution;

    expect(setPendingUnsavedAction).toHaveBeenLastCalledWith({
      ...action,
      resolving: false,
      resolutionError: "保存未完成，请根据页面顶部提示处理后重试。"
    });
    expect(loadSavedProjectRecord).not.toHaveBeenCalled();
  });

  test("放弃修改进入浏览态时，撤回保存基线后的操作并清除未保存状态", async () => {
    const enterBrowseMode = vi.fn();
    const setHasUnsavedChanges = vi.fn();
    const setPendingUnsavedAction = vi.fn();
    const undoLastOperation = vi.fn();
    const resolve = createResolveUnsavedChangeAction({
      enterBrowseMode,
      loadSavedProjectRecord: vi.fn(),
      pendingUnsavedAction: {
        kind: "enter-browse",
        label: "切换到浏览模式"
      },
      saveCurrentProject: vi.fn().mockResolvedValue(true),
      savedUndoStackLengthRef: { current: 2 },
      setHasUnsavedChanges,
      setPendingUnsavedAction,
      undoLastOperation,
      undoStack: [{}, {}, {}, {}, {}]
    });

    await resolve("discard");

    expect(undoLastOperation).toHaveBeenCalledTimes(3);
    expect(setHasUnsavedChanges).toHaveBeenCalledWith(false);
    expect(enterBrowseMode).toHaveBeenCalledOnce();
    expect(setPendingUnsavedAction).toHaveBeenCalledWith(null);
  });
});

describe("切空间的未保存修改衔接", () => {
  const action = { kind: "switch-space" as const, spaceId: "张三", label: "切换到空间“张三”" };

  const createRequest = (saveRequired: boolean) => {
    const setPendingUnsavedAction = vi.fn();
    const request = createRequestUnsavedChangeAction({
      enterBrowseMode: vi.fn(),
      loadSavedProjectRecord: vi.fn(),
      saveRequired,
      setPendingUnsavedAction
    });
    return { request, setPendingUnsavedAction };
  };

  const createResolve = (pendingAction: typeof action, saveCurrentProject = vi.fn()) => {
    const setPendingUnsavedAction = vi.fn();
    const resolve = createResolveUnsavedChangeAction({
      enterBrowseMode: vi.fn(),
      loadSavedProjectRecord: vi.fn(),
      pendingUnsavedAction: pendingAction,
      saveCurrentProject,
      setPendingUnsavedAction
    });
    return { resolve, setPendingUnsavedAction };
  };

  beforeEach(() => {
    switchToSpaceMock.mockReset();
  });

  test("有未保存修改时只登记待确认操作，不直接切换", () => {
    const { request, setPendingUnsavedAction } = createRequest(true);

    request(action);

    expect(setPendingUnsavedAction).toHaveBeenCalledWith(action);
    expect(switchToSpaceMock).not.toHaveBeenCalled();
  });

  test("无未保存修改时直接切换，不进待确认状态", () => {
    const { request, setPendingUnsavedAction } = createRequest(false);

    request(action);

    expect(switchToSpaceMock).toHaveBeenCalledWith("张三");
    expect(setPendingUnsavedAction).not.toHaveBeenCalled();
  });

  test("确认保存后先落盘、成功后才切换", async () => {
    const order: string[] = [];
    // 保存桩**先让出一次微任务再记录**：否则「没 await 就切」也会得到相同顺序，
    // 这条断言就失去判别力（保存是同步 push 时，不 await 也排在切换之前）。
    const saveCurrentProject = vi.fn(async () => {
      await Promise.resolve();
      order.push("save");
      return true;
    });
    switchToSpaceMock.mockImplementation(() => {
      order.push("switch");
    });
    const { resolve } = createResolve(action, saveCurrentProject);

    await resolve("save");

    expect(order).toEqual(["save", "switch"]);
    expect(switchToSpaceMock).toHaveBeenCalledWith("张三");
  });

  test("保存失败时不切换", async () => {
    const saveCurrentProject = vi.fn().mockResolvedValue(false);
    const { resolve } = createResolve(action, saveCurrentProject);

    await resolve("save");

    expect(switchToSpaceMock).not.toHaveBeenCalled();
  });

  test("放弃修改时直接切换，不触发保存", async () => {
    const saveCurrentProject = vi.fn().mockResolvedValue(true);
    const { resolve } = createResolve(action, saveCurrentProject);

    await resolve("discard");

    expect(switchToSpaceMock).toHaveBeenCalledWith("张三");
    expect(saveCurrentProject).not.toHaveBeenCalled();
  });

  test("取消时只清空待确认操作，不发生任何切换", async () => {
    const { resolve, setPendingUnsavedAction } = createResolve(action);

    await resolve("cancel");

    expect(switchToSpaceMock).not.toHaveBeenCalled();
    expect(setPendingUnsavedAction).toHaveBeenCalledWith(null);
  });
});

describe("保存模型后的全局线路正式身份回填", () => {
  test("后台保存成功后刷新全局线路，再以正式节点建立未修改基线", async () => {
    const draftNode = createDefaultNode("ac-routable-line", { x: 100, y: 100 });
    draftNode.params._globalLineId = `draft-global-line:${draftNode.id}`;
    const savedNode = {
      ...draftNode,
      params: { ...draftNode.params, _globalLineId: "global-line-saved", idx: "12" }
    };
    const project = { version: 1 as const, name: "本地馈线", modelType: "馈线" as const, nodes: [draftNode], edges: [] };
    const savedProject = { ...project, nodes: [savedNode] };
    const record = { id: "project-1", name: "本地馈线", updatedAt: "2026-08-20T00:00:00.000Z", project };
    const savedRecord = { ...record, project: savedProject };
    const scheme = { id: "scheme-1", name: "主方案", updatedAt: record.updatedAt, projects: [record], children: [] };
    const finalizedNodes = [savedNode];
    const finalizeSavedGlobalLineProjectNodes = vi.fn().mockResolvedValue(finalizedNodes);
    const graphDirtyBaselineRef = { current: null as any };
    const save = createSaveCurrentProject({
      activeProjectKey: record.id,
      activeSchemeKey: scheme.id,
      backgroundPageRender: null,
      clearRefreshRecoveryProject: vi.fn(),
      colorPalette: {},
      currentGraphDirtyBaseline: () => ({ nodes: [draftNode] }),
      currentProject: () => project,
      deferredMoveOptimizationCancelRef: { current: null },
      deferredRoutableLineRouteRepairCancelRef: { current: null },
      finalizeSavedGlobalLineProjectNodes,
      findSchemeForProject: () => scheme,
      graphDirtyBaselineRef,
      projectById: new Map([[record.id, record]]),
      projectMeasurements: { version: 1, groups: [] },
      projectName: record.name,
      rememberPersistedSchemesPayload: vi.fn(),
      requireEditMode: () => true,
      saveActiveProjectPointer: vi.fn(),
      saveBackendProjectRecord: vi.fn().mockResolvedValue(savedRecord),
      savedSchemePathForId: () => [scheme.name],
      savedUndoStackLengthRef: { current: 0 },
      schemes: [scheme],
      selectedSchemeId: scheme.id,
      serializeSchemesForStorage: (value: unknown) => value,
      setActiveProjectKey: vi.fn(),
      setHasUnsavedChanges: vi.fn(),
      setProjectName: vi.fn(),
      setSchemes: vi.fn(),
      suppressNextGraphDirtyRef: { current: 0 },
      undoStack: [],
      upsertSavedProjectInScheme: (value: unknown) => value,
      writeOperationLog: vi.fn()
    });

    await expect(save()).resolves.toBe(true);
    expect(finalizeSavedGlobalLineProjectNodes).toHaveBeenCalledWith([savedNode]);
    expect(graphDirtyBaselineRef.current?.nodes).toBe(finalizedNodes);
  });
});

describe("线路端点调整的本图/全局维护方式切换", () => {
  function transitionScope(direction: "local-to-global" | "global-to-local") {
    const boundary = createDefaultNode("ac-station-load", { x: 300, y: 0 });
    boundary.params.model_id = "22";
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
    const boundaryA = createDefaultNode("ac-station-load", { x: 300, y: 0 });
    boundaryA.params.model_id = "22";
    const boundaryB = createDefaultNode("ac-feeder-load", { x: 400, y: 0 });
    boundaryB.params.model_id = "23";
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

describe("模型关联设备的线路连接前置条件", () => {
  test("model_id 未定义时拒绝作为线路起点并给出未定义提示", () => {
    const node = createDefaultNode("ac-station-source", { x: 100, y: 100 });
    const showGlobalMessage = vi.fn();
    vi.stubGlobal("showGlobalMessage", showGlobalMessage);
    const setRoutableLinePlacement = vi.fn();
    const start = createStartRoutableLineFromTerminal({
      activeLayerNodeIdSet: new Set([node.id]),
      applyRoutableLinePreviewState: vi.fn(),
      connectTargetPoint: vi.fn(),
      connectTargetTerminalType: () => "ac",
      routableLinePlacement: { template: createDefaultNode("ac-routable-line", { x: 0, y: 0 }) },
      routableLineTemplateTerminalType: () => "ac",
      setCanvasSelectionScope: vi.fn(),
      setContextMenu: vi.fn(),
      setMode: vi.fn(),
      setRoutableLinePlacement,
      setSelectedEdgeId: vi.fn(),
      setSelectedEdgeIds: vi.fn(),
      setSelectedNodeIds: vi.fn(),
      writeOperationLog: vi.fn()
    });

    expect(start(node, node.terminals[0].id)).toBe(false);
    expect(setRoutableLinePlacement).not.toHaveBeenCalled();
    expect(showGlobalMessage).toHaveBeenCalledWith(expect.stringContaining("未定义关联模型"));

    node.params.model_id = "11";
    expect(start(node, node.terminals[0].id)).toBe(true);
    expect(setRoutableLinePlacement).toHaveBeenCalledOnce();
  });

  test("模型关联负荷即使已定义 model_id 也不能作为线路起点", () => {
    const node = createDefaultNode("ac-feeder-load", { x: 100, y: 100 });
    node.params.model_id = "22";
    const showGlobalMessage = vi.fn();
    vi.stubGlobal("showGlobalMessage", showGlobalMessage);
    const setRoutableLinePlacement = vi.fn();
    const start = createStartRoutableLineFromTerminal({
      activeLayerNodeIdSet: new Set([node.id]),
      applyRoutableLinePreviewState: vi.fn(),
      connectTargetPoint: vi.fn(),
      connectTargetTerminalType: () => "ac",
      routableLinePlacement: { template: createDefaultNode("ac-routable-line", { x: 0, y: 0 }) },
      routableLineTemplateTerminalType: () => "ac",
      setCanvasSelectionScope: vi.fn(),
      setContextMenu: vi.fn(),
      setMode: vi.fn(),
      setRoutableLinePlacement,
      setSelectedEdgeId: vi.fn(),
      setSelectedEdgeIds: vi.fn(),
      setSelectedNodeIds: vi.fn(),
      writeOperationLog: vi.fn()
    });

    expect(start(node, node.terminals[0].id)).toBe(false);
    expect(setRoutableLinePlacement).not.toHaveBeenCalled();
    expect(showGlobalMessage).toHaveBeenCalledWith(expect.stringContaining("只能位于线路末端"));
  });

  test("model_id 未定义时拒绝作为线路终点，且最终提交入口仍会防御性拒绝", async () => {
    const sourceNode = createDefaultNode("ac-source", { x: 100, y: 100 });
    const targetNode = createDefaultNode("ac-feeder-load", { x: 400, y: 100 });
    const template = DEVICE_LIBRARY_BY_KIND.get("ac-routable-line")!;
    const commitRoutableLineDevice = vi.fn();
    const requestGlobalLinePlacement = vi.fn();
    const showGlobalMessage = vi.fn();
    vi.stubGlobal("showGlobalMessage", showGlobalMessage);
    const placement = {
      template,
      source: { node: sourceNode, terminalId: sourceNode.terminals[0].id }
    };
    const finish = createFinishRoutableLineToTarget({
      commitRoutableLineDevice,
      connectTargetTerminalType: () => "ac",
      modelType: "馈线",
      requestGlobalLinePlacement,
      routableLinePlacement: placement,
      routableLineTemplateTerminalType: () => "ac",
      writeOperationLog: vi.fn()
    });
    const target = { node: targetNode, terminalId: targetNode.terminals[0].id };

    await expect(finish(target)).resolves.toBe(false);
    expect(commitRoutableLineDevice).not.toHaveBeenCalled();
    expect(showGlobalMessage).toHaveBeenCalledWith(expect.stringContaining("未定义关联模型"));

    showGlobalMessage.mockClear();
    const defensiveCommit = createCommitRoutableLineDevice({ nodes: [], writeOperationLog: vi.fn() });
    await expect(defensiveCommit(template, placement.source, target)).resolves.toBe(false);
    expect(showGlobalMessage).toHaveBeenCalledWith(expect.stringContaining("未定义关联模型"));

    targetNode.params.model_id = "22";
    commitRoutableLineDevice.mockResolvedValue(true);
    await expect(finish(target)).resolves.toBe(true);
    expect(requestGlobalLinePlacement).toHaveBeenCalledOnce();
  });

  test("模型关联电源不能作为末端，两端也不能同时为模型关联设备，最终提交入口仍会拒绝", async () => {
    const ordinarySource = createDefaultNode("ac-source", { x: 100, y: 100 });
    const stationSource = createDefaultNode("ac-station-source", { x: 400, y: 100 });
    stationSource.params.model_id = "22";
    const feederLoad = createDefaultNode("ac-feeder-load", { x: 600, y: 100 });
    feederLoad.params.model_id = "33";
    const template = DEVICE_LIBRARY_BY_KIND.get("ac-routable-line")!;
    const requestGlobalLinePlacement = vi.fn();
    const showGlobalMessage = vi.fn();
    vi.stubGlobal("showGlobalMessage", showGlobalMessage);

    const finish = createFinishRoutableLineToTarget({
      commitRoutableLineDevice: vi.fn(),
      connectTargetTerminalType: () => "ac",
      modelType: "馈线",
      requestGlobalLinePlacement,
      routableLinePlacement: {
        template,
        source: { node: ordinarySource, terminalId: ordinarySource.terminals[0].id }
      },
      routableLineTemplateTerminalType: () => "ac",
      writeOperationLog: vi.fn()
    });
    await expect(finish({ node: stationSource, terminalId: stationSource.terminals[0].id })).resolves.toBe(false);
    expect(showGlobalMessage).toHaveBeenCalledWith(expect.stringContaining("只能位于线路首端"));
    expect(requestGlobalLinePlacement).not.toHaveBeenCalled();

    showGlobalMessage.mockClear();
    const finishBoth = createFinishRoutableLineToTarget({
      commitRoutableLineDevice: vi.fn(),
      connectTargetTerminalType: () => "ac",
      modelType: "馈线",
      requestGlobalLinePlacement,
      routableLinePlacement: {
        template,
        source: { node: stationSource, terminalId: stationSource.terminals[0].id }
      },
      routableLineTemplateTerminalType: () => "ac",
      writeOperationLog: vi.fn()
    });
    await expect(finishBoth({ node: feederLoad, terminalId: feederLoad.terminals[0].id })).resolves.toBe(false);
    expect(showGlobalMessage).toHaveBeenCalledWith(expect.stringContaining("两端不能同时"));

    showGlobalMessage.mockClear();
    const defensiveCommit = createCommitRoutableLineDevice({ nodes: [], writeOperationLog: vi.fn() });
    await expect(defensiveCommit(
      template,
      { node: ordinarySource, terminalId: ordinarySource.terminals[0].id },
      { node: stationSource, terminalId: stationSource.terminals[0].id }
    )).resolves.toBe(false);
    expect(showGlobalMessage).toHaveBeenCalledWith(expect.stringContaining("只能位于线路首端"));
  });

  test("线路端点重接到 model_id 未定义的模型关联设备时保留原连接", () => {
    const source = createDefaultNode("ac-source", { x: 0, y: 0 });
    const target = createDefaultNode("ac-district-load", { x: 300, y: 0 });
    const line = createDefaultNode("ac-routable-line", { x: 100, y: 0 });
    const nodes = [source, target, line];
    const patchGraphNodes = vi.fn();
    const setRoutableLineEndpointDrag = vi.fn();
    const showGlobalMessage = vi.fn();
    vi.stubGlobal("showGlobalMessage", showGlobalMessage);

    createFinishRoutableLineEndpointDrag({
      nodeById: new Map(nodes.map((node) => [node.id, node])),
      nodes,
      patchGraphNodes,
      routableLineEndpointDrag: {
        nodeId: line.id,
        endpoint: "target",
        dropTarget: { node: target, terminalId: target.terminals[0].id }
      },
      setRoutableLineEndpointDrag,
      writeOperationLog: vi.fn()
    })();

    expect(patchGraphNodes).not.toHaveBeenCalled();
    expect(setRoutableLineEndpointDrag).toHaveBeenCalledWith(null);
    expect(showGlobalMessage).toHaveBeenCalledWith(expect.stringContaining("未定义关联模型"));
  });

  function modelAssociationEndpointRewireScope(
    endpoint: "source" | "target",
    currentSource: ReturnType<typeof createDefaultNode>,
    currentTarget: ReturnType<typeof createDefaultNode>,
    dropTarget: ReturnType<typeof createDefaultNode>
  ) {
    const line = createDefaultNode("ac-routable-line", { x: 100, y: 0 });
    line.params = {
      ...line.params,
      _routableLineSourceNodeId: currentSource.id,
      _routableLineTargetNodeId: currentTarget.id
    };
    const routedLine = {
      ...line,
      params: {
        ...line.params,
        ...(endpoint === "source"
          ? { _routableLineSourceNodeId: dropTarget.id }
          : { _routableLineTargetNodeId: dropTarget.id })
      }
    };
    const nodes = [currentSource, currentTarget, dropTarget, line];
    const patchGraphNodes = vi.fn();
    const requestGlobalLineTransition = vi.fn();
    const setRoutableLineEndpointDrag = vi.fn();
    const showGlobalMessage = vi.fn();
    vi.stubGlobal("showGlobalMessage", showGlobalMessage);

    return {
      patchGraphNodes,
      requestGlobalLineTransition,
      setRoutableLineEndpointDrag,
      showGlobalMessage,
      finish: createFinishRoutableLineEndpointDrag({
        canvasBounds: { width: 1000, height: 800 },
        connectTargetPoint: () => ({ x: 500, y: 0 }),
        modelType: "馈线",
        nodeById: new Map(nodes.map((node) => [node.id, node])),
        nodes,
        patchGraphNodes,
        pushUndoSnapshot: vi.fn(),
        requestGlobalLineTransition,
        routableLineDeviceCanvasPoints: () => [{ x: 0, y: 0 }, { x: 300, y: 0 }],
        routableLineDeviceEndpointRefForNode: (node: any) => ({ nodeId: node.id }),
        routableLineDeviceEndpointRefs: () => ({
          source: { nodeId: currentSource.id },
          target: { nodeId: currentTarget.id }
        }),
        routableLineEndpointDrag: {
          nodeId: line.id,
          endpoint,
          dropTarget: { node: dropTarget, terminalId: dropTarget.terminals[0].id }
        },
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

  test("线路首端重接到模型关联负荷时保留原连接", () => {
    const ordinarySource = createDefaultNode("ac-source", { x: 0, y: 0 });
    const ordinaryTarget = createDefaultNode("ac-load", { x: 300, y: 0 });
    const associationLoad = createDefaultNode("ac-district-load", { x: 500, y: 0 });
    associationLoad.params.model_id = "31";
    const scope = modelAssociationEndpointRewireScope("source", ordinarySource, ordinaryTarget, associationLoad);

    scope.finish();

    expect(scope.showGlobalMessage).toHaveBeenCalledWith(expect.stringContaining("只能位于线路末端"));
    expect(scope.patchGraphNodes).not.toHaveBeenCalled();
    expect(scope.requestGlobalLineTransition).not.toHaveBeenCalled();
    expect(scope.setRoutableLineEndpointDrag).toHaveBeenCalledWith(null);
  });

  test("线路末端重接到模型关联电源时保留原连接", () => {
    const ordinarySource = createDefaultNode("ac-source", { x: 0, y: 0 });
    const ordinaryTarget = createDefaultNode("ac-load", { x: 300, y: 0 });
    const associationSource = createDefaultNode("ac-feeder-source", { x: 500, y: 0 });
    associationSource.params.model_id = "32";
    const scope = modelAssociationEndpointRewireScope("target", ordinarySource, ordinaryTarget, associationSource);

    scope.finish();

    expect(scope.showGlobalMessage).toHaveBeenCalledWith(expect.stringContaining("只能位于线路首端"));
    expect(scope.patchGraphNodes).not.toHaveBeenCalled();
    expect(scope.requestGlobalLineTransition).not.toHaveBeenCalled();
    expect(scope.setRoutableLineEndpointDrag).toHaveBeenCalledWith(null);
  });

  test("端点重接后两端均为模型关联设备时保留原连接", () => {
    const associationSource = createDefaultNode("ac-station-source", { x: 0, y: 0 });
    associationSource.params.model_id = "33";
    const ordinaryTarget = createDefaultNode("ac-load", { x: 300, y: 0 });
    const associationLoad = createDefaultNode("ac-district-load", { x: 500, y: 0 });
    associationLoad.params.model_id = "34";
    const scope = modelAssociationEndpointRewireScope("target", associationSource, ordinaryTarget, associationLoad);

    scope.finish();

    expect(scope.showGlobalMessage).toHaveBeenCalledWith(expect.stringContaining("两端不能同时"));
    expect(scope.patchGraphNodes).not.toHaveBeenCalled();
    expect(scope.requestGlobalLineTransition).not.toHaveBeenCalled();
    expect(scope.setRoutableLineEndpointDrag).toHaveBeenCalledWith(null);
  });
});

describe("普通连接线手势和全局线路边界", () => {
  function connectionScope(modelType: "厂站" | "其他", targetKind: "ac-station-source" | "ac-load" = "ac-station-source") {
    const source = createDefaultNode("ac-source", { x: 100, y: 200 });
    const target = createDefaultNode(targetKind, { x: 500, y: 200 });
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

  test("厂站模型中普通连接线不能连接厂站电源，也不能转换为线路设备", () => {
    const scope = connectionScope("厂站");
    const target = { node: scope.target, terminalId: scope.target.terminals[0].id };

    expect(scope.finish(target)).toBe(false);
    expect(scope.requestGlobalLinePlacement).not.toHaveBeenCalled();
    expect(scope.commitNewConnectionEdge).not.toHaveBeenCalled();
  });

  test("普通设备之间仍保留普通连接线行为", () => {
    const scope = connectionScope("其他", "ac-load");
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
    rebuildRoutableLineDeviceRouteUpdates: vi.fn(() => []),
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
    isLineSegmentBusNode,
    isRoutableLineDeviceKind,
    writeOperationLog: noop,
    ...overrides
  };
}

describe("保存模型不再上传 SVG/E 产物", () => {
  test("保存只发 json：不计算产物，也不给保存请求带第 4 个产物实参", async () => {
    const noop = vi.fn();
    const project = { version: 1, name: "模型一", nodes: [], edges: [] };
    const projectRecord = { id: "project-1", name: "模型一", project };
    const scheme = { id: "scheme-1", name: "方案一", projects: [projectRecord], children: [] };
    const buildSvgDocument = vi.fn(() => "<svg/>");
    const buildEFileExport = vi.fn(() => ({ filename: "模型一.e", text: "", mime: "text/plain" }));
    const saveBackendProjectRecord = vi.fn(async () => projectRecord);
    const saveCurrentProject = createSaveCurrentProject({
      activeProjectKey: "project-1",
      activeSchemeKey: "scheme-1",
      clearRefreshRecoveryProject: noop,
      currentGraphDirtyBaseline: () => "baseline",
      currentProject: () => project,
      deferredMoveOptimizationCancelRef: { current: null },
      deferredRoutableLineRouteRepairCancelRef: { current: null },
      findSchemeForProject: () => scheme,
      graphDirtyBaselineRef: { current: null },
      projectById: new Map([["project-1", projectRecord]]),
      projectName: "模型一",
      rememberPersistedSchemesPayload: noop,
      requireEditMode: () => true,
      saveActiveProjectPointer: noop,
      saveBackendProjectRecord,
      savedSchemePathForId: () => ["方案一"],
      savedUndoStackLengthRef: { current: 0 },
      schemes: [scheme],
      selectedSchemeId: "scheme-1",
      serializeSchemesForStorage: () => "{}",
      setActiveProjectKey: noop,
      setHasUnsavedChanges: noop,
      setProjectName: noop,
      setSchemes: noop,
      suppressNextGraphDirtyRef: { current: 0 },
      undoStack: [],
      upsertSavedProjectInScheme: () => [scheme],
      writeOperationLog: noop,
      // 仍提供本地渲染依赖：保存若回潮去计算产物，会被下面两条断言拦下
      buildSvgDocument,
      buildEFileExport
    });

    await expect(saveCurrentProject()).resolves.toBe(true);

    expect(buildSvgDocument).not.toHaveBeenCalled();
    expect(buildEFileExport).not.toHaveBeenCalled();
    expect(saveBackendProjectRecord).toHaveBeenCalledWith(["方案一"], expect.anything(), "模型一");
    // 保存请求不得再携带第 4 个产物参数（svg/eFile）
    expect(saveBackendProjectRecord.mock.calls[0]).toHaveLength(3);
  });
});

describe("saved project definition migration", () => {
  test.each(["ac-bus", "dc-bus"])(
    "preserves a saved stretched %s instance while reconciling its template on load",
    (kind) => {
      const storedBus = {
        ...createDefaultNode(kind as "ac-bus" | "dc-bus", { x: 640, y: 320 }),
        size: { width: 740, height: 28 }
      };
      const template = DEVICE_LIBRARY_BY_KIND.get(kind)!;
      const reconciledBus = {
        ...storedBus,
        size: { ...template.size },
        params: { ...storedBus.params, definitionSynced: "1" }
      };
      const setGraphArrays = vi.fn();
      const scope = createLoadScope({
        libraryTemplateByKind: new Map([[kind, template]]),
        reconcileNodeWithDefinition: vi.fn(() => reconciledBus),
        setGraphArrays
      });

      createLoadSavedProject(scope as any)({
        id: `project-${kind}`,
        name: `${kind} 拉伸持久化`,
        project: {
          idx: 17,
          nodes: [storedBus],
          edges: [],
          groups: [],
          layers: [],
          activeLayerId: "layer-default",
          canvasWidth: 1200,
          canvasHeight: 800
        }
      } as any, "scheme-1");

      expect(setGraphArrays).toHaveBeenCalledWith([
        expect.objectContaining({
          id: storedBus.id,
          size: storedBus.size,
          params: expect.objectContaining({ definitionSynced: "1" })
        })
      ], [], 17);
    }
  );

  test("preserves a resized ac container across a save-load round trip", () => {
    // 用户拖角改过尺寸的容器(+ 一个成员)经保存序列化 → 加载路径后,尺寸必须原样保留
    const container = JSON.parse(JSON.stringify({
      ...createDefaultNode("ac-vpp-box", { x: 500, y: 400 }),
      id: "saved-container",
      size: { width: 400, height: 300 }
    }));
    const member = JSON.parse(JSON.stringify({
      ...createDefaultNode("ac-load", { x: 500, y: 400 }),
      id: "saved-member",
      containerId: "saved-container"
    }));
    const setGraphArrays = vi.fn();
    const scope = createLoadScope({
      libraryTemplateByKind: new Map([
        ["ac-vpp-box", DEVICE_LIBRARY_BY_KIND.get("ac-vpp-box")!],
        ["ac-load", DEVICE_LIBRARY_BY_KIND.get("ac-load")!]
      ]),
      reconcileNodeWithDefinition: reconcileNodeWithDefinitionReal,
      setGraphArrays
    });

    createLoadSavedProject(scope as any)({
      id: "project-ac-container",
      name: "含容器的模型",
      project: {
        idx: 3,
        nodes: [container, member],
        edges: [],
        groups: [],
        layers: [],
        activeLayerId: "layer-default",
        canvasWidth: 1200,
        canvasHeight: 800
      }
    } as any, "scheme-1");

    const [loadedNodes] = setGraphArrays.mock.calls[0];
    expect(loadedNodes[0].size).toEqual({ width: 400, height: 300 });
    expect(loadedNodes[1]).toMatchObject({ id: "saved-member", containerId: "saved-container" });
  });

  test("存量容器遗留 scale 折算进 size(渲染矩形不变、scale 归 1)", () => {
    // 改造前拖角写的是 scale:用户自己之前拖大的容器存盘后带 scale=2、size 仍是初始值。
    // 加载即归一,否则用户重测同一模型还会撞上「所见 ≠ eject 所用矩形」的老毛病。
    const container = JSON.parse(JSON.stringify({
      ...createDefaultNode("ac-vpp-box", { x: 500, y: 400 }),
      id: "legacy-scaled-container",
      // 用户拖角调过的尺寸(≠ 模板 180×112):折算后必须留在 1000×800,既不打回模板也不被 scale 再乘一次
      size: { width: 500, height: 400 },
      scale: 2, scaleX: 2, scaleY: 2
    }));
    const setGraphArrays = vi.fn();
    const scope = createLoadScope({
      libraryTemplateByKind: new Map([["ac-vpp-box", DEVICE_LIBRARY_BY_KIND.get("ac-vpp-box")!]]),
      reconcileNodeWithDefinition: reconcileNodeWithDefinitionReal,
      setGraphArrays
    });

    createLoadSavedProject(scope as any)({
      id: "project-legacy-scale-container",
      name: "遗留缩放容器",
      project: {
        idx: 5,
        nodes: [container],
        edges: [],
        groups: [],
        layers: [],
        activeLayerId: "layer-default",
        canvasWidth: 1200,
        canvasHeight: 800
      }
    } as any, "scheme-1");

    const [loadedNodes] = setGraphArrays.mock.calls[0];
    expect(loadedNodes[0].size).toEqual({ width: 1000, height: 800 }); // 渲染矩形不变,不跳变
    expect(loadedNodes[0].size).not.toEqual({ width: 180, height: 112 }); // 也不被打回模板尺寸
    expect(loadedNodes[0].scale).toBe(1);
    expect(loadedNodes[0].scaleX).toBe(1);
    expect(loadedNodes[0].scaleY).toBe(1);
  });

  test("repairs an unsafe stored adaptive-line path while loading a model", () => {
    const blocker = {
      ...createDefaultNode("static-rect", { x: 500, y: 240 }),
      id: "loaded-route-blocker"
    };
    const line = {
      ...createDefaultNode("ac-routable-line", { x: 760, y: 360 }),
      id: "loaded-unsafe-route"
    };
    const repairedLine = {
      ...line,
      params: { ...line.params, _routableLinePoints: "120,240;430,240;430,180;570,180;570,240;880,240" }
    };
    const rebuildRoutableLineDeviceRouteUpdates = vi.fn(() => [repairedLine]);
    const setGraphArrays = vi.fn();
    const scope = createLoadScope({
      rebuildRoutableLineDeviceRouteUpdates,
      setGraphArrays
    });

    createLoadSavedProject(scope as any)({
      id: "project-with-unsafe-route",
      name: "含穿越线路的模型",
      project: {
        nodes: [blocker, line],
        edges: [],
        groups: [],
        layers: [],
        activeLayerId: "layer-default",
        canvasWidth: 1200,
        canvasHeight: 800
      }
    } as any, "scheme-1");

    expect(rebuildRoutableLineDeviceRouteUpdates).toHaveBeenCalledWith(
      [blocker, line],
      [line.id],
      { width: 1200, height: 800 }
    );
    expect(setGraphArrays).toHaveBeenCalledWith([blocker, repairedLine], [], 0);
  });

  test("hydrates a large model without synchronously rebuilding every stored adaptive-line path", () => {
    const blocker = {
      ...createDefaultNode("static-rect", { x: 500, y: 240 }),
      id: "large-model-route-blocker"
    };
    const line = {
      ...createDefaultNode("ac-routable-line", { x: 760, y: 360 }),
      id: "large-model-stored-route"
    };
    const ordinaryNode = {
      ...createDefaultNode("ac-load", { x: 920, y: 360 }),
      id: "large-model-ordinary-node"
    };
    const rebuildRoutableLineDeviceRouteUpdates = vi.fn(() => [{
      ...line,
      params: { ...line.params, _routableLinePoints: "unexpected-rebuild" }
    }]);
    const setGraphArrays = vi.fn();
    const scope = createLoadScope({
      CANVAS_INITIAL_LOD_NODE_DETAIL_LIMIT: 2,
      rebuildRoutableLineDeviceRouteUpdates,
      setGraphArrays
    });

    createLoadSavedProject(scope as any)({
      id: "large-project-with-saved-routes",
      name: "大型已保存模型",
      project: {
        nodes: [blocker, line, ordinaryNode],
        edges: [],
        groups: [],
        layers: [],
        activeLayerId: "layer-default",
        canvasWidth: 1200,
        canvasHeight: 800
      }
    } as any, "scheme-1");

    expect(rebuildRoutableLineDeviceRouteUpdates).not.toHaveBeenCalled();
    expect(setGraphArrays).toHaveBeenCalledWith([blocker, line, ordinaryNode], [], 0);
  });

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
    expect(setGraphArrays).toHaveBeenCalledWith([migratedNode, orphanNode], [], 0);
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

// 容器拖角 = 改几何(size)而不是 transform(scale):渲染矩形 = size × |scale|,
// 写 scale 会让「看到的容器」与 eject/入组用的 size 矩形分叉(fb10 用户实况:
// 拖大后设备只挤开一半仍压在框里、拖小后成员戳出)。下限 = 成员包围盒 + padding。
describe("container pointer resizing", () => {
  const containerNode = (extra: Record<string, unknown> = {}) => ({
    ...createDefaultNode("ac-vpp-box", { x: 100, y: 100 }),
    size: { width: 180, height: 112 },
    ...extra
  });
  const memberNode = (containerId: string, size: { width: number; height: number }) => ({
    id: "m1", kind: "ac-load", name: "m1", position: { x: 100, y: 100 }, size,
    rotation: 0, scale: 1, params: { _labelVisible: "0" }, terminals: [], containerId
  });
  const runCornerDrag = (
    container: any,
    member: any,
    drag: Record<string, unknown>,
    pointer: { x: number; y: number },
    extraScope: Record<string, unknown> = {}
  ) => {
    const graphStore = { nodeMap: new Map([[container.id, container]]), nodes: [container, member].filter(Boolean) };
    const patchGraphNodes = vi.fn();
    const transformDrag = {
      kind: "scale-both",
      nodeId: container.id,
      originalNode: {
        position: { ...container.position }, rotation: container.rotation,
        scale: container.scale, scaleX: container.scaleX, scaleY: container.scaleY
      },
      originalSize: { ...container.size },
      startPoint: { x: 190, y: 156 },
      handleXDirection: 1,
      handleYDirection: 1,
      historyCaptured: false,
      ...drag
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
      isGroupTransformDrag: (candidate: object) => "groupId" in candidate,
      isLineSegmentBusNode: () => false,
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
      setTransformDrag: vi.fn(),
      signedScaleFromRotatedHandleDelta: vi.fn(),
      signedScaleFromUprightHandleDelta: vi.fn(),
      singleTransformBaseNode: (activeDrag: any, current: any) => ({
        ...current,
        position: { ...activeDrag.originalNode.position },
        rotation: activeDrag.originalNode.rotation,
        scale: activeDrag.originalNode.scale,
        scaleX: activeDrag.originalNode.scaleX,
        scaleY: activeDrag.originalNode.scaleY
      }),
      staticButtonPointerRef: { current: null },
      staticDrawing: null,
      svgRef: { current: {} },
      terminalPress: null,
      transformDrag,
      transformDragChangedRef: { current: false },
      updateMeasurementDrag: () => false,
      updateMouseStatus: vi.fn(),
      ...extraScope
    };
    createHandlePointerMove(scope as any)({ clientX: pointer.x, clientY: pointer.y, ctrlKey: false, shiftKey: false } as any);
    return patchGraphNodes.mock.calls[0]?.[0]?.[0];
  };

  test("缩小:size 被夹在成员包围盒 + padding,且仍完全包住成员", () => {
    const container = containerNode();
    const member = memberNode(container.id, { width: 300, height: 200 });
    const resized = runCornerDrag(container, member, {}, { x: 150, y: 130 });

    expect(resized.size).toEqual({ width: 300 + 48, height: 200 + 48 });
    // 尺寸夹到下限后矩形整体平移回完全包住成员裸包围盒(成员 300×200 居中于 (100,100) → 左上角贴成员)
    expect(resized.position).toEqual({ x: 124, y: 124 });
    const r = {
      x1: resized.position.x - resized.size.width / 2, y1: resized.position.y - resized.size.height / 2,
      x2: resized.position.x + resized.size.width / 2, y2: resized.position.y + resized.size.height / 2
    };
    const b = calculateNodeVisualBounds(member as any);
    expect(b.left).toBeGreaterThanOrEqual(r.x1);
    expect(b.right).toBeLessThanOrEqual(r.x2);
    expect(b.top).toBeGreaterThanOrEqual(r.y1);
    expect(b.bottom).toBeLessThanOrEqual(r.y2);
  });

  test("放大:不受下限约束,尺寸跟手(容器几何只写 size,scale 恒 1)", () => {
    const container = containerNode();
    const member = memberNode(container.id, { width: 40, height: 30 }); // 下限 = CONTAINER_MIN_SIZE
    const resized = runCornerDrag(container, member, {}, { x: 230, y: 190 });

    expect(resized.size).toEqual({ width: 220, height: 146 });
    expect(resized.scale).toBe(1);
    expect(resized.scaleX).toBe(1);
    expect(resized.scaleY).toBe(1);
  });

  test("遗留 scale 被吃进 size:起始尺寸按渲染尺寸折算,拖完 scale 归一 1", () => {
    const container = containerNode({ scale: 2, scaleX: 2, scaleY: 2 });
    const member = memberNode(container.id, { width: 40, height: 30 });
    const resized = runCornerDrag(container, member, {}, { x: 230, y: 190 });

    expect(resized.size).toEqual({ width: 360 + 40, height: 224 + 34 });
    expect(resized.scaleX).toBe(1);
    expect(resized.scaleY).toBe(1);
  });

  test("拖大后再拖对边:边跟手(平移钳制不吃内侧留白,不反向缩对边)", () => {
    const container0 = containerNode({ size: { width: 248, height: 168 } }); // 已贴合成员(200×120 + 24)
    const member = memberNode(container0.id, { width: 200, height: 120 });
    // ① 东边拖大 80
    const grown = runCornerDrag(container0, member, {
      kind: "scale-x", startPoint: { x: 224, y: 100 }, handleXDirection: 1, handleYDirection: 0
    }, { x: 304, y: 100 });
    expect(grown.size).toEqual({ width: 328, height: 168 });
    const eastEdge = grown.position.x + grown.size.width / 2;

    // ② 西边向右 20:左边界跟手右移,东边界不动(padding 钳制会让左边界回弹、东边界反向缩 20)
    const shrunk = runCornerDrag(grown, member, {
      kind: "scale-x", startPoint: { x: -24, y: 100 }, handleXDirection: -1, handleYDirection: 0
    }, { x: -4, y: 100 });
    expect(shrunk.size.width).toBe(308);
    expect(shrunk.position.x).toBe(150);
    expect(shrunk.position.x + shrunk.size.width / 2).toBe(eastEdge);
    expect(shrunk.position.x - shrunk.size.width / 2).toBe(-4);

    // ③ 继续往右拖:左边界停在成员左沿(不裁成员),不再回弹
    const squeezed = runCornerDrag(grown, member, {
      kind: "scale-x", startPoint: { x: -24, y: 100 }, handleXDirection: -1, handleYDirection: 0
    }, { x: 300, y: 100 });
    expect(squeezed.size.width).toBe(248);
    expect(squeezed.position.x - squeezed.size.width / 2).toBe(0);
    const b = calculateNodeVisualBounds(member as any);
    expect(b.left).toBeGreaterThanOrEqual(squeezed.position.x - squeezed.size.width / 2);
    expect(b.right).toBeLessThanOrEqual(squeezed.position.x + squeezed.size.width / 2);
  });

  test("普通设备拖角行为不变:仍走 scale,size 不动", () => {
    const device = { ...createDefaultNode("ac-load", { x: 100, y: 100 }), size: { width: 180, height: 112 } };
    const resized = runCornerDrag(device, null as any, {}, { x: 230, y: 190 }, {
      proportionalSignedScaleFromHandleDelta: () => ({ scale: 1.5, scaleX: 1.5, scaleY: 1.5 })
    });

    expect(resized.size).toEqual({ width: 180, height: 112 });
    expect(resized.scaleX).toBe(1.5);
    expect(resized.scaleY).toBe(1.5);
  });
});

describe("automatic canvas layout", () => {
  // 布局把设备摆进已有容器矩形 → 与拖动同一出口 = 排斥弹回(容器与容器外设备互相排斥);
  // 弹出落位与容器重算必须在同一次提交里,否则撤销会漏掉布局集之外的容器几何
  test("布局移入已有容器:弹回框外 + 容器重算并入本次提交,撤销退化全量", () => {
    const container = {
      id: "c1", kind: "ac-vpp-box", name: "c1", position: { x: 0, y: 0 }, size: { width: 200, height: 200 },
      rotation: 0, scale: 1, params: { _labelVisible: "0" }, terminals: []
    };
    const device = {
      id: "m1", kind: "ac-load", name: "m1", position: { x: 600, y: 600 }, size: { width: 40, height: 30 },
      rotation: 0, scale: 1, params: { _labelVisible: "0" }, terminals: []
    };
    const arranged = [container, { ...device, position: { x: 50, y: 50 } }];
    const canvasBounds = { width: 1000, height: 800 };
    const commitFastMovedGraphPatches = vi.fn();
    const pushUndoSnapshot = vi.fn();
    const scope = {
      CANVAS_AUTO_EXPAND_PADDING: 40,
      adjustEdgesAfterNodeMove: vi.fn(),
      applyCanvasBounds: vi.fn(),
      canvasBounds,
      canvasBoundsForAutoExpandedGraphContent: () => canvasBounds,
      commitFastMovedGraphPatches,
      currentStoredRoutePointsForEdge: vi.fn(),
      edgeListForNodeIds: () => [],
      edges: [],
      finalizeMovedNodeEdgesFast: vi.fn(),
      isRoutableLineDeviceKind: () => false,
      mergeNodeUpdateLists: createMergeNodeUpdateLists({}),
      nodeById: new Map([[container.id, container], [device.id, device]]),
      nodes: [container, device],
      orderedNodeFromList: (items: Array<{ id: string }>, id: string) => items.find((item) => item.id === id),
      pushUndoSnapshot,
      readjustMovedBusConnectionRoutes: vi.fn(),
      realignRoutableLineDeviceBusEndpointPoints: vi.fn(),
      redrawRoutableLineDeviceRoutes: vi.fn(),
      rejectAutoCanvasExpansionForContent: () => false,
      routableLineIdsConnectedToNodeIds: () => new Set<string>(),
      snapshotEdgePoints: () => ({}),
      undoScopeForGraphPatch: () => ({ nodeIds: ["m1"], edgeIds: [] })
    };

    const movedCount = createCommitLayoutNodePositions(scope as any)(["m1"], arranged as any, { preserveCanvasBounds: true });

    expect(movedCount).toBe(1);
    const committedUpdates = commitFastMovedGraphPatches.mock.calls[0][0];
    const placedDevice = committedUpdates.find((node: any) => node.id === "m1");
    const nextContainer = committedUpdates.find((node: any) => node.id === "c1");
    expect(placedDevice.containerId).toBeUndefined();
    // 容器无成员 → 收缩回最小尺寸;设备被弹到最终矩形之外
    expect(nextContainer.size).toEqual({ width: 180, height: 112 });
    const inside =
      Math.abs(placedDevice.position.x - nextContainer.position.x) <= nextContainer.size.width / 2 &&
      Math.abs(placedDevice.position.y - nextContainer.position.y) <= nextContainer.size.height / 2;
    expect(inside).toBe(false);
    // 容器几何 / 挤出都在布局集之外:作用域必须让位给全量对比(Task 8 拖动同一口径)
    expect(pushUndoSnapshot).toHaveBeenCalledWith(true, false, undefined);
  });

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
      activeProjectKey: "feeder-7",
      activeSchemeKey: "scheme-1",
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
      schemes: [{
        id: "scheme-1",
        name: "主方案",
        updatedAt: "2026-08-21T00:00:00.000Z",
        projects: [{
          id: "feeder-7",
          name: "馈线一",
          updatedAt: "2026-08-21T00:00:00.000Z",
          project: { version: 1, name: "馈线一", idx: 7, modelType: "馈线", nodes: [], edges: [] }
        }],
        children: []
      }],
      setNodes,
      setTopology,
      setTopologyErrors,
      setTopologyStatus,
      setTopologyWarningPanelClosed: vi.fn(),
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
      modelType: undefined,
      modelAssociationProjectIndexes: {
        "厂站": [],
        "馈线": ["7"],
        "台区": []
      }
    });
    expect(normalizeDeviceOperatingLimitsAfterTopology).toHaveBeenCalledWith(calculatedNodes, {
      powerUnit: "kW",
      voltageUnit: "V",
      currentUnit: "A",
      skipVoltageNodeIds: expect.any(Set),
      sourceNodes,
      capacityFixScopeKey: "scheme-1:feeder-7"
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
      setTopologyWarningPanelClosed: vi.fn(),
      skipNextTopologyStaleRef: { current: false },
      topologyCalculationMessage: (count: number) => `拓扑失败 ${count}`,
      validateTopology: vi.fn(() => [blockingError]),
      validateVoltageSetpointDeviations: vi.fn(() => []),
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

  test("keeps rated-voltage deviation as a blocking error when another topology error already exists", () => {
    const node = { id: "source-1", params: { rated_voltage: "14" } };
    const missingVoltageError = {
      type: "missing-island-voltage",
      nodeId: "other-1",
      relatedNodeIds: ["other-1"],
      message: "另一拓扑岛缺少电压基值"
    };
    const ratedVoltageError = {
      type: "rated-voltage-deviation",
      nodeId: node.id,
      relatedNodeIds: [node.id],
      message: "额定电压 14 与对应节点电压基值 10 偏差超过 30%"
    };
    const ordinarySetpointWarning = {
      type: "voltage-setpoint-deviation",
      nodeId: node.id,
      relatedNodeIds: [node.id],
      message: "普通电压设定值偏差"
    };
    const emptyTopology = { connectedComponents: [] };
    const setTopologyErrors = vi.fn();
    const setTopology = vi.fn();
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
      isBlockingTopologyValidationError: (error: { type: string }) => (
        error.type === "missing-island-voltage" || error.type === "rated-voltage-deviation"
      ),
      locateTopologyError,
      nodes: [node],
      normalizeDeviceOperatingLimitsAfterTopology: vi.fn(() => ({
        nodes: [node],
        warnings: [],
        corrections: []
      })),
      powerUnit: "MW",
      pushUndoSnapshot: vi.fn(),
      requireEditMode: () => true,
      setNodes: vi.fn(),
      setTopology,
      setTopologyErrors,
      setTopologyStatus,
      setTopologyWarningPanelClosed: vi.fn(),
      skipNextTopologyStaleRef: { current: false },
      topologyCalculationMessage: (count: number) => `拓扑失败 ${count}`,
      validateTopology: vi.fn(() => [missingVoltageError]),
      validateVoltageSetpointDeviations: vi.fn(() => [ratedVoltageError, ordinarySetpointWarning]),
      voltageUnit: "kV",
      writeOperationLog: vi.fn()
    })();

    expect(setTopologyErrors).toHaveBeenCalledWith([missingVoltageError, ratedVoltageError]);
    expect(setTopology).toHaveBeenCalledWith(emptyTopology);
    expect(setTopologyStatus).toHaveBeenCalledWith({ state: "failed", message: "失败，2 条阻断错误" });
    expect(locateTopologyError).toHaveBeenCalledWith(missingVoltageError);
    expect(showGlobalMessage).toHaveBeenCalledWith("拓扑失败 2");
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
      setTopologyWarningPanelClosed: vi.fn(),
      skipNextTopologyStaleRef: { current: false },
      topologyCalculationMessage: (count: number) => `拓扑失败 ${count}`,
      validateTopology: vi.fn(() => []),
      validateVoltageSetpointDeviations: vi.fn(() => []),
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

test("加载模型时把分叉的分侧电压参数对齐到端子 vbase（存量数据修复）", () => {
  const three = createDefaultNode("ac-three-winding-transformer", { x: 0, y: 0 });
  // 旧缺陷留下的分叉：分侧参数被误写成中压值 220，而 3 号端子（低压）仍是 110
  const drifted = {
    ...three,
    params: { ...three.params, j_vbase: "220" },
    terminals: three.terminals.map((terminal, index) => (index === 2 ? { ...terminal, vbase: "110" } : terminal))
  };
  const setGraphArrays = vi.fn();
  // 空 Map（而非缺省）让模板分支原样放行，专测「加载时做了分侧对齐」这一步
  const scope = createLoadScope({ libraryTemplateByKind: new Map(), setGraphArrays });

  createLoadSavedProject(scope as any)({
    id: "project-drifted",
    name: "分叉模型",
    project: {
      nodes: [drifted],
      edges: [],
      groups: [],
      layers: [],
      activeLayerId: "layer-default",
      canvasWidth: 1200,
      canvasHeight: 800
    }
  } as any, "scheme-1");

  const loadedNodes = setGraphArrays.mock.calls[0][0] as Array<{
    params: Record<string, string>;
    terminals: Array<{ vbase: string }>;
  }>;
  // 端子为准：参数跟着端子收敛，此后右侧面板与【设置电压基值】读数一致
  expect(loadedNodes[0].params.j_vbase).toBe("110");
  expect(loadedNodes[0].terminals[2].vbase).toBe("110");
});

test("加载模型时按容器豁免口径回填设备型线路的存量绕行路径", () => {
  const inner = createDefaultNode("ac-switch", { x: 300, y: 200 });
  const outer = createDefaultNode("ac-load", { x: 950, y: 200 });
  const box: ModelNode = { ...createDefaultNode("ac-vpp-box", { x: 300, y: 200 }), size: { width: 500, height: 300 } };
  const innerInBox: ModelNode = { ...inner, containerId: box.id };
  const template = DEVICE_LIBRARY.find((item) => item.kind === "ac-routable-line")!;
  const start = getTerminalPoint(innerInBox, "t1");
  const end = getTerminalPoint(outer, "t1");
  const line = createRoutableLineDeviceFromEndpoints(template, start, end, "layer-a", {
    source: routableLineDeviceEndpointRefForNode(innerInBox, "t1"),
    target: routableLineDeviceEndpointRefForNode(outer, "t1")
  });
  // 存量绕行路径(容器当障碍物时代的产物)
  const detour = setRoutableLineDeviceCanvasPoints(line, [start, { x: start.x, y: 30 }, { x: end.x, y: 30 }, end]);
  const setGraphArrays = vi.fn();
  const scope = createLoadScope({ libraryTemplateByKind: new Map(), setGraphArrays });

  createLoadSavedProject(scope as any)({
    id: "project-container-line",
    name: "线路回填模型",
    project: {
      nodes: [innerInBox, outer, box, detour],
      edges: [],
      groups: [],
      layers: [],
      activeLayerId: "layer-default",
      canvasWidth: 1200,
      canvasHeight: 800
    }
  } as any, "scheme-1");

  const loadedNodes = setGraphArrays.mock.calls[0][0] as ModelNode[];
  const loadedLine = loadedNodes.find((node) => node.id === detour.id)!;
  const exemptDesign = routableLineDeviceCanvasPoints(routeRoutableLineDevice(detour, [innerInBox, outer, box, detour] as ModelNode[], { width: 1200, height: 800 }));

  expect(routableLineDeviceCanvasPoints(loadedLine)).toEqual(exemptDesign);
  expect(routableLineDeviceCanvasPoints(loadedLine)).not.toEqual(routableLineDeviceCanvasPoints(detour));
  // 端点不连容器内设备的线路设备不属回填对象:原对象原样进图(引用不变)
  const plainLine = setRoutableLineDeviceCanvasPoints(
    createRoutableLineDeviceFromEndpoints(template, start, end, "layer-a", {
      source: routableLineDeviceEndpointRefForNode(inner, "t1"),
      target: routableLineDeviceEndpointRefForNode(outer, "t1")
    }),
    [start, { x: start.x, y: 30 }, { x: end.x, y: 30 }, end]
  );
  const plainScope = createLoadScope({ libraryTemplateByKind: new Map(), setGraphArrays: vi.fn() });
  createLoadSavedProject(plainScope as any)({
    id: "project-plain-line",
    name: "无容器模型",
    project: { nodes: [inner, outer, box, plainLine], edges: [], groups: [], layers: [], activeLayerId: "layer-default", canvasWidth: 1200, canvasHeight: 800 }
  } as any, "scheme-1");
  expect((plainScope.setGraphArrays as any).mock.calls[0][0].find((node: ModelNode) => node.id === plainLine.id)).toBe(plainLine);
});

// ─── 容器整体参与布局(用户裁决) ──────────────────────────────────────────
// 对齐/分布:选中容器 → 容器 + 全部成员按整组参与(相对位置不变);仅选中成员 → 仅成员参与,容器由 enforce 跟随。
// 自动对齐/散开:两阶段 —— 先对容器内成员自布局,再把容器作为整体参与全层布局。
describe("容器整体参与布局", () => {
  const container = (x: number, y: number) => ({
    id: "c1", kind: "ac-vpp-box", name: "c1", position: { x, y }, size: { width: 200, height: 200 },
    rotation: 0, scale: 1, params: { _labelVisible: "0" }, terminals: []
  });
  const device = (id: string, x: number, y: number, containerId?: string) => ({
    id, kind: "ac-load", name: id, position: { x, y }, size: { width: 40, height: 30 },
    rotation: 0, scale: 1, params: { _labelVisible: "0" }, terminals: [],
    ...(containerId ? { containerId } : {})
  });
  const dxOf = (nodes: any[], arranged: any[], id: string) => {
    const byId = new Map<string, any>(arranged.map((node: any) => [node.id, node]));
    return byId.get(id)!.position.x - nodes.find((node) => node.id === id)!.position.x;
  };

  test("对齐选中容器:容器与成员合并成一个整组单元参与(成员不被落下、相对位置不变)", () => {
    const nodes = [container(525, 400), device("m1", 500, 400, "c1"), device("m2", 600, 400, "c1"), device("o1", 1500, 400)];
    const selectedLayoutUnits = buildCanvasLayoutUnits([], nodes as any, ["c1", "o1"], [], [], []);
    const seenUnits: any[][] = [];
    const commits: any[] = [];
    const scope = {
      commitLayoutNodePositions: (ids: string[], arranged: any[]) => {
        commits.push({ ids, arranged });
        return ids.length;
      },
      nodes,
      selectedLayoutUnits
    };

    createApplySelectedNodeLayout(scope as any)(2, (currentNodes: any[], units: any[]) => {
      seenUnits.push(units);
      return alignNodeLayoutUnits(currentNodes, units, "right");
    });

    expect(seenUnits[0].map((unit) => unit.id).sort()).toEqual(["container:c1", "node:o1"]);
    expect([...seenUnits[0].find((unit) => unit.id === "container:c1").nodeIds].sort()).toEqual(["c1", "m1", "m2"]);
    expect([...commits[0].ids].sort()).toEqual(["c1", "m1", "m2", "o1"]);
    // 整组平移:容器与成员位移完全一致
    expect(dxOf(nodes, commits[0].arranged, "m1")).toBe(dxOf(nodes, commits[0].arranged, "c1"));
    expect(dxOf(nodes, commits[0].arranged, "m2")).toBe(dxOf(nodes, commits[0].arranged, "c1"));
    expect(dxOf(nodes, commits[0].arranged, "c1")).not.toBe(0);
  });

  test("仅选中成员:容器不进布局单元(随后由 enforce 跟随),成员各自参与", () => {
    const nodes = [container(525, 400), device("m1", 500, 400, "c1"), device("m2", 600, 400, "c1")];
    const selectedLayoutUnits = buildCanvasLayoutUnits([], nodes as any, ["m1", "m2"], [], [], []);
    const seenUnits: any[][] = [];
    const commits: any[] = [];
    const scope = {
      commitLayoutNodePositions: (ids: string[], arranged: any[]) => {
        commits.push({ ids, arranged });
        return ids.length;
      },
      nodes,
      selectedLayoutUnits
    };

    createApplySelectedNodeLayout(scope as any)(2, (currentNodes: any[], units: any[]) => {
      seenUnits.push(units);
      return alignNodeLayoutUnits(currentNodes, units, "right");
    });

    expect(seenUnits[0].map((unit) => unit.id).sort()).toEqual(["node:m1", "node:m2"]);
    expect([...commits[0].ids].sort()).toEqual(["m1", "m2"]);
  });

  test("自动对齐两阶段:容器内成员先自对齐,容器再作为整体参与(整组平移)", () => {
    vi.stubGlobal("window", { prompt: () => "50" });
    try {
      const nodes = [container(525, 400), device("m1", 500, 400, "c1"), device("m2", 600, 400, "c1"), device("o1", 1500, 400)];
      const commits: any[] = [];
      const scope = {
        AUTO_ALIGN_DEFAULT_THRESHOLD_PX,
        AUTO_ALIGN_MAX_THRESHOLD_PX,
        AUTO_ALIGN_MIN_THRESHOLD_PX,
        activeLayerEdges: [],
        activeLayerGroups: [],
        activeLayerNodes: nodes,
        autoAlignNodeLayoutUnits,
        buildCanvasLayoutUnits,
        commitLayoutNodePositions: (ids: string[], arranged: any[]) => {
          commits.push({ ids, arranged });
          return ids.length;
        },
        isCanvasNodeMovable,
        nodes,
        readjustActiveLayerBusEndpointRoutes: () => 0,
        requireEditMode: () => true,
        routedEdges: [],
        writeOperationLog: vi.fn()
      };

      createAutoAlignCanvasGraphics(scope as any)();

      expect([...commits[0].ids].sort()).toEqual(["c1", "m1", "m2", "o1"]);
      const byId = new Map<string, any>(commits[0].arranged.map((node: any) => [node.id, node]));
      // 成员已在网格上(阶段 1 无位移),容器不在网格 → 位移全部来自阶段 2 的整组平移
      expect(dxOf(nodes, commits[0].arranged, "c1")).not.toBe(0);
      expect(dxOf(nodes, commits[0].arranged, "m1")).toBe(dxOf(nodes, commits[0].arranged, "c1"));
      expect(dxOf(nodes, commits[0].arranged, "m2")).toBe(dxOf(nodes, commits[0].arranged, "c1"));
      expect(byId.get("m1")!.position.x - byId.get("c1")!.position.x).toBe(-25);
      expect(byId.get("m2")!.position.x - byId.get("c1")!.position.x).toBe(75);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  // 容器与上方设备重叠:该设备 bounds.top 更小、先落位不动,容器整组被推开 → 才能观察到整组平移
  test("自动散开两阶段:容器作为整体参与(成员随容器平移,不在容器外落单)", () => {
    const nodes = [
      container(525, 400),
      device("m1", 500, 400, "c1"),
      device("m2", 600, 400, "c1"),
      device("o1", 540, 290),
      device("o2", 550, 300)
    ];
    const commits: any[] = [];
    const scope = {
      activeLayerEdges: [],
      activeLayerGroups: [],
      activeLayerNodes: nodes,
      autoSpreadNodeLayoutUnits,
      buildCanvasLayoutUnits,
      calculateNodeVisualBounds,
      canvasBounds: { width: 2000, height: 1200 },
      commitLayoutNodePositions: (ids: string[], arranged: any[]) => {
        commits.push({ ids, arranged });
        return ids.length;
      },
      isCanvasNodeMovable,
      nodes,
      requireEditMode: () => true,
      routedEdges: [],
      writeOperationLog: vi.fn()
    };

    createAutoSpreadCanvasGraphics(scope as any)();

    const byId = new Map<string, any>(commits[0].arranged.map((node: any) => [node.id, node]));
    expect([...commits[0].ids].sort()).toEqual(["c1", "m1", "m2", "o1", "o2"]);
    expect(dxOf(nodes, commits[0].arranged, "m1")).toBe(dxOf(nodes, commits[0].arranged, "c1"));
    expect(dxOf(nodes, commits[0].arranged, "m2")).toBe(dxOf(nodes, commits[0].arranged, "c1"));
    // 容器整组平移:成员相对容器的位置不变
    expect(byId.get("m1")!.position.x - byId.get("c1")!.position.x).toBe(-25);
    expect(byId.get("m2")!.position.x - byId.get("c1")!.position.x).toBe(75);
  });
});
