// appCanvasViewportBatch 内部 7 个纯几何函数的边界覆盖。
//
// 待测函数全部是 useCanvasViewportBatch(__appScope) 的闭包内部定义 + Object.assign
// 回写，**不是模块导出**。本文件因此走 SSR 装配（renderToStaticMarkup）把 hook 真实
// 跑一遍：hook 本身不返回任何东西，只往 __appScope 上 Object.assign，所以渲染完成后
// 直接从 scope 上取那 7 个函数。装配手法沿用同目录 appCanvasArea.test.tsx ——
// 同样是不装 jsdom（vite.config.ts 的 test.environment 是 "node"）、同样用
// renderToStaticMarkup、同样靠一份最小 baseScope 喂满 hook 顶部那 ~90 个解构键。
//
// SSR 选它还有个硬理由：hook 里所有 DOM 访问（document.querySelector(".element-tree")、
// window.requestAnimationFrame）都在 useEffect 闭包内，SSR 根本不执行 effect，
// 所以不需要 DOM 环境；而 useMemo 的工厂在首渲就会跑，故 baseScope 必须喂到能让
// routeInput / routedRouteState 这些 useMemo 走通为止。
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  CONNECT_TERMINAL_SNAP_TOLERANCE,
  EMPTY_CANVAS_LAYOUT_UNITS,
  buildNodeSpatialIndex,
  isGroupTransformDrag,
  isMultiNodeMoveState,
  pointsToPreviewPath,
  queryNodeSpatialIndex,
  readViewportResultCache,
  sameRenderViewportBounds,
  snapRenderViewportBoundsForQuery,
  terminalColor,
  transformGroupPoint,
  viewportBoundsCacheKey,
  writeViewportResultCache
} from "./appCoreCanvasUtilities";
import { createGraphStore } from "../graphStore";
import {
  getTerminalDisplayColor,
  isCanvasNodeMovable,
  isRoutableLineDeviceKind,
  routeEdgesForCachedStoredRendering,
  routeEdgesForIncrementalRendering,
  routeEdgesForSavedPathRendering,
  routeEdgesForStoredRendering
} from "../model";
import { getNodeScaleX, getNodeScaleY } from "../model-canvas-ops";
import {
  getBusTerminalType,
  getEdgeEndpointPoint,
  getOverlappingTerminalGroups,
  getTerminalBusContactGroups,
  isBusNode,
  preserveConnectionEdgeRouteShape,
  resolveStraightBusSlideEndpoint,
  resolveStraightBusSlideEndpointToPoint,
  routableLineDeviceCanvasPoints,
  routableLineDeviceEndpointRefForNode,
  routableLineDeviceEndpointRefs
} from "../model-routing";
import { createRouteStore, queryRouteSpatialIndex } from "../routeStore";
import { buildCanvasLayoutUnits } from "../selectionActions";
import { useCanvasViewportBatch } from "./appCanvasViewportBatch";

// ===========================================================================
// 夹具
// ===========================================================================

/** 让 canvasBounds / canvasDisplay* 一路推到底都不出 NaN 的一组尺寸。 */
const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 800;
/** hook 顶部解构的 canvasFrameViewportSize，比画布大 ⇒ 不触发滚动条分支。 */
const FRAME_VIEWPORT = { width: 1600, height: 1000 };

/** 造一个最小可用的 ModelNode：只给几何 bounds 计算真正读到的字段。 */
function node(id: string, x: number, y: number, size = 40) {
  return {
    id,
    kind: "static-box",
    name: "",
    position: { x, y },
    // 注意是嵌套的 size，不是顶层 width/height：calculateNodeVisualBounds 走
    // bodyVisualBoxForNode，后者读 node.size.{width,height}。写成顶层字段的话
    // size 是 undefined，bounds 会退化成别的东西，越界断言就失去意义。
    size: { width: size, height: size },
    rotation: 0,
    params: {},
    terminals: []
  } as any;
}

/** 造一条最小可用的 Edge；几何字段按需覆盖（不传就是 undefined）。 */
function edge(id: string, extra: Record<string, any> = {}) {
  return { id, sourceNodeId: "A", targetNodeId: "B", ...extra } as any;
}

/**
 * 视口结果缓存的槽位。readViewportResultCache 会直接读 cache.token / cache.ownerRefs
 * 再决定是否重置，所以不能用 null —— 那会在 cache.token 处炸（实测 appCoreCanvasUtilities:2672）。
 */
function viewportResultCache() {
  return { ownerRefs: [], token: "", values: new Map<string, any>() };
}

/**
 * 把 hook 顶部那 ~90 个解构键补齐成默认值，再叠加调用方给的覆盖。
 *
 * 为什么要这层「补默认值」而不是逐个显式列举：少给一个键就是 `undefined`，
 * 而它在下游的失败点（.map / .find / new Set(x)）与「哪个键缺了」毫无对应关系，
 * 报错会指到完全无关的行（实测缺 layers 报的是 1251 行的 layers.map）。
 * 这里统一兜住「结构型」键（集合/布尔/数字），让报错真正指向「值不合法」。
 */
function fullScope(overrides: Record<string, any> = {}) {
  const NOOP = () => undefined;
  const defaults: Record<string, any> = {
    // ---- 图 / 层 / 选择 ----
    activeLayerEdgeIdSet: new Set<string>(),
    activeLayerEdges: [],
    activeLayerGroups: [],
    activeLayerNodeIdSet: new Set<string>(),
    activeLayerNodes: [],
    activeProjectKey: "project",
    activeSchemeKey: "scheme",
    activeSelectedEdgeIds: [],
    activeSelectedEdgeSet: new Set<string>(),
    activeSelectedNodeIds: [],
    busNodeIdSet: new Set<string>(),
    edgeById: new Map<string, any>(),
    edges: [],
    layers: [],
    nodeById: new Map<string, any>(),
    nodes: [],
    selectedEdge: undefined,
    selectedEdgeId: "",
    selectedNode: undefined,
    selectedNodeCount: 0,
    selectedNodeIdSet: new Set<string>(),
    visibleEdgeIdSet: new Set<string>(),
    visibleEdges: [],
    visibleEdgesByTerminalRef: new Map(),
    visibleNodeById: new Map<string, any>(),
    visibleNodeIdSet: new Set<string>(),
    visibleNodeSpatialIndex: buildNodeSpatialIndex([]),
    visibleNodes: [],

    // ---- 画布几何 ----
    canvasWidth: CANVAS_WIDTH,
    canvasHeight: CANVAS_HEIGHT,
    canvasFrameViewportSize: { ...FRAME_VIEWPORT },
    canvasNoScrollOffset: { x: 0, y: 0 },
    canvasResizeDraft: null,
    canvasResizeDrag: null,
    canvasSelectionScope: "node",
    canvasVisibleViewBox: { x: 0, y: 0, width: CANVAS_WIDTH, height: CANVAS_HEIGHT },
    viewBox: { x: 0, y: 0, width: CANVAS_WIDTH, height: CANVAS_HEIGHT },
    canvasBackgroundImage: undefined,
    canvasBackgroundImageAssetId: undefined,
    pendingCanvasNoScrollOffsetRef: { current: null },
    cachedRouteInputRef: { current: null },
    pendingStoredRouteEdgeIdsRef: { current: new Set<string>() },
    pendingRouteEdgeIdsRef: { current: new Set<string>() },
    cachedRoutedEdgesRef: { current: [] },
    editModeRouteRenderOptions: undefined,

    // createAppHookCallback53（routedRouteState）从 scope 上取这四个路由入口。
    // 它们在 appCanvasViewportBatch 里是「只 import、不回写 scope」的符号 —— 真实
    // 运行时由 App.tsx 统一装配。夹具必须自己补上，否则该 useMemo 首渲就炸。
    routeEdgesForCachedStoredRendering,
    routeEdgesForIncrementalRendering,
    routeEdgesForSavedPathRendering,
    routeEdgesForStoredRendering,

    // ---- 其余「App.tsx 装配、hook 只消费」的 scope 键 ----
    // 这些是 App.tsx 全局装配到 __appScope 上的模型层工具/常量。hook 内部只从
    // scope 上解构它们，自己不 import 也不回写；缺一个，对应的 useMemo 首渲就炸。
    // 统一从各自的真实模块 import，避免手搓替身把被测函数的下游算歪。
    CONNECT_TERMINAL_SNAP_TOLERANCE,
    EMPTY_CANVAS_LAYOUT_UNITS,
    buildCanvasLayoutUnits,
    getBusTerminalType,
    getModelEdgeEndpointPoint: getEdgeEndpointPoint,
    getNodeScaleX,
    getNodeScaleY,
    getOverlappingTerminalGroups,
    getTerminalBusContactGroups,
    getTerminalDisplayColor,
    isBusNode,
    isCanvasNodeMovable,
    isGroupTransformDrag,
    isMultiNodeMoveState,
    isRoutableLineDeviceKind,
    pointsToPreviewPath,
    preserveConnectionEdgeRouteShape,
    queryNodeSpatialIndex,
    queryRouteSpatialIndex,
    readViewportResultCache,
    resolveStraightBusSlideEndpoint,
    resolveStraightBusSlideEndpointToPoint,
    routableLineDeviceCanvasPoints,
    routableLineDeviceEndpointRefForNode,
    routableLineDeviceEndpointRefs,
    sameRenderViewportBounds,
    snapRenderViewportBoundsForQuery,
    terminalColor,
    transformGroupPoint,
    viewportBoundsCacheKey,
    writeViewportResultCache,

    // ---- 拖拽预览工厂：夹具里 dragging 恒为 undefined，三者只在有拖拽时被调，
    //      故给返回空数组的替身即可（换成真实现对本文件 7 个被测函数无影响） ----
    buildLightweightNodeDragPreviewRoutes: () => [],
    buildRoutableLineDragGhostRoutesForNodeIds: () => [],
    cachedConnectionStrokeColor: () => "",
    compactPreviewNodes: () => [],
    singleNodeDragPreviewEdges: () => [],

    // ---- 各类 Ref / 缓存槽位 ----
    __appScopeRef: { current: null },
    backendSchemesLoadTokenRef: { current: 0 },
    backendSchemesLoadedRef: { current: true },
    latestActiveProjectPointerRef: { current: null },
    saveRequiredRef: { current: false },
    suppressNextBackendSchemeSyncRef: { current: false },
    viewportNodesResultCacheRef: { current: viewportResultCache() },
    viewportQueryBoundsCacheRef: { current: viewportResultCache() },
    viewportRoutedEdgesResultCacheRef: { current: viewportResultCache() },
    selectedLayoutUnitsCacheRef: { current: viewportResultCache() },
    dragMovedNodeIdSet: new Set<string>(),

    // ---- 持久化 / 后端回调：SSR 下相关 useMemo 早退，这里只需可调用 ----
    fetchBackendSchemes: NOOP,
    loadSavedProjectRecord: NOOP,
    findSavedProjectByActivePointer: () => undefined,
    flattenSavedSchemes: () => [],
    serializeSchemesForStorage: () => ({}),
    clearActiveProjectDisplay: NOOP,
    rememberPersistedSchemesPayload: NOOP,
    scheduleIdleWork: NOOP,
    setContainerParamViewId: NOOP,
    setExpandedSchemeIds: NOOP,
    setRoutableLineDeviceEndpointsPreservingRoute: NOOP,
    setRouteRenderingReady: NOOP,
    setSchemesState: NOOP,
    setStaticTerminalOverlapReadyKey: NOOP,

    // ---- 引用 ----
    // 用真实的 store 工厂而非手搓字面量：routeStoreSetRoutes 会读 store.routeOrder
    // 与 routes.length 比对，手搓的残缺 store 会在那里炸（实测报 routeStore.ts:297）。
    graphStore: createGraphStore([], [], [], []),
    cachedRouteStoreRef: { current: createRouteStore([]) },
    setCanvasWidth: NOOP,
    setCanvasHeight: NOOP,
    setCanvasSizeDraft: NOOP,
    setViewBox: NOOP,
    setCanvasPanning: NOOP,

    // ---- 图元树 ----
    elementTree: [],
    elementTreeEditDrafts: {},
    elementTreeItemLimits: {},
    elementTreeLayerSignature: "",
    elementTreeSearchQuery: "",
    collapsedElementTreeGroups: [],
    collapsedElementTreeDeviceGroups: [],
    graphTreePanelActive: false,
    setElementTreeItemHeights: NOOP,
    setElementTreeItemWindows: NOOP,

    // ---- 交互态 ----
    connectDropReady: false,
    connectSource: undefined,
    connectionLineStyle: () => "",
    containerParamViewId: "",
    displaySelectedEdgeKey: "",
    displaySelectedNodeKey: "",
    dragging: undefined,
    draggingNodeIdSet: new Set<string>(),
    draggingNodeKey: "",
    editHotInteractionActive: false,
    focusedGroupedNodeMovesGroup: false,
    hasUnsavedChanges: false,
    imageAssets: {},
    imperativeSingleNodeDragActiveRef: { current: false },
    inspectorTopologyErrors: [],
    isEditMode: true,
    isReadonlyCanvasMode: false,
    leftPanelAutoVisible: false,
    leftPanelMode: "hidden",
    rightPanelAutoVisible: false,
    rightPanelMode: "hidden",
    libraryPlacement: undefined,
    libraryTemplateByKind: new Map(),
    manualPathDrag: undefined,
    mode: "select",
    nodeTerminalSnapTargetRef: { current: null },
    rewiring: undefined,
    routableLineEndpointDrag: undefined,
    routableLineNodeIdsByEndpointNodeId: new Map(),
    routableLinePlacement: undefined,
    routableLinePreview: { targetPoint: undefined },
    routeDirtyGenerationRef: { current: 0 },
    routeRenderingReady: true,
    selectedContainerParameterViews: [],
    staticDrawing: undefined,
    staticTerminalOverlapReadyKey: "",
    terminalPress: undefined,
    transformDrag: undefined,

    // ---- 常量（createCanvasBoundsForGraphContent 等工厂从 scope 上读） ----
    colorDisplayMode: "type",
    colorPalette: {},
    MOVE_BOUNDARY_GUARD: 8,
    calculateModelContentSize: () => ({ width: 0, height: 0 }),
    clampCanvasDimension: (value: number) => value
  };
  return { ...defaults, ...overrides } as Record<string, any>;
}

/**
 * 跑一遍 useCanvasViewportBatch，把回写到 __appScope 上的派生值取回来。
 *
 * hook 不返回值，SSR 组件只负责触发它；渲染完成后 scope 就是「装配结果」。
 */
function renderBatchScope(overrides: Record<string, any> = {}) {
  const scope = fullScope(overrides);
  function Probe() {
    useCanvasViewportBatch(scope);
    return null;
  }
  renderToStaticMarkup(createElement(Probe));
  return scope;
}

describe("appCanvasViewportBatch 内部纯几何函数", () => {
  describe("hasCanvasOriginShift", () => {
    it("两个分量都是 0 才算「没有位移」", () => {
      const { hasCanvasOriginShift } = renderBatchScope();
      expect(hasCanvasOriginShift({ x: 0, y: 0 })).toBe(false);
      expect(hasCanvasOriginShift({ x: 1, y: 0 })).toBe(true);
      expect(hasCanvasOriginShift({ x: 0, y: 1 })).toBe(true);
      expect(hasCanvasOriginShift({ x: -1, y: -1 })).toBe(true);
      // 小数非零同样算位移：判定是 `!== 0` 而非 `> 0`，负的小数也算
      expect(hasCanvasOriginShift({ x: 0, y: -0.5 })).toBe(true);
    });

    it("-0 与 0 在 === 语义下相等，故都不算位移（Object.is 会分开，判定式不会）", () => {
      const { hasCanvasOriginShift } = renderBatchScope();
      // 显式钉住这条语义：`-0 !== 0` 为 false，所以 -0 走「无位移」分支。
      // 若判定被改成 Object.is(shift.x, 0) 之类，本条转红。
      expect(-0 !== 0).toBe(false);
      expect(Object.is(-0, 0)).toBe(false);
      expect(hasCanvasOriginShift({ x: -0, y: -0 })).toBe(false);
      expect(hasCanvasOriginShift({ x: -0, y: 1 })).toBe(true);
      expect(hasCanvasOriginShift({ x: -0, y: -0.5 })).toBe(true);
    });
  });

  describe("translatePointBy", () => {
    it("逐分量相加后 Math.round 取整", () => {
      const { translatePointBy } = renderBatchScope();
      // 整数位移：直接得整数
      expect(translatePointBy({ x: 10, y: 20 }, { x: 5, y: -5 })).toEqual({ x: 15, y: 15 });
      // 负坐标：不能因取整而塌成 0
      expect(translatePointBy({ x: -10, y: -20 }, { x: -3, y: -4 })).toEqual({ x: -13, y: -24 });
      // Math.round 的 .5 向上（远离零）：+0.5 → 1
      expect(translatePointBy({ x: 0.4, y: 0.5 }, { x: 0.1, y: 0 })).toEqual({ x: 1, y: 1 });
      // 负半值：Math.round(-0.5) === -0，toEqual 用 Object.is 区分 ±0，故写明确
      expect(Object.is(translatePointBy({ x: -0.5, y: 0 }, { x: 0, y: 0 }).x, -0)).toBe(true);
      expect(translatePointBy({ x: -0.5, y: 0 }, { x: 0, y: 0 }).y).toBe(0);
    });

    it("零位移是恒等映射，但仍走一遍 Math.round（即原值也必须先取整）", () => {
      const { translatePointBy } = renderBatchScope();
      expect(translatePointBy({ x: 3, y: 7 }, { x: 0, y: 0 })).toEqual({ x: 3, y: 7 });
      // 承重断言：shift 为 0 并不代表「原样返回」——小数原值照样被取整。
      // 若实现改成 `hasCanvasOriginShift(shift) ? … : point`，本条转红。
      expect(translatePointBy({ x: 3.4, y: 7.5 }, { x: 0, y: 0 })).toEqual({ x: 3, y: 8 });
    });
  });

  describe("translateOptionalPointBy", () => {
    it("undefined 原样透传，绝不凭空造出 {x,y}", () => {
      const { translateOptionalPointBy } = renderBatchScope();
      const result = translateOptionalPointBy(undefined, { x: 10, y: 20 });
      // ↓ 承重断言：不用 `?? {}` / `?? []` 把 undefined 折叠成空对象再比，
      //   那样即使实现返回了 {x:0,y:0} 也会绿。
      expect(result).toBeUndefined();
      expect(result).not.toBeNull();
      expect(typeof result).toBe("undefined");
      // 目标类型是 Point | undefined，运行时就是「什么都没给」
      expect("result" in Object(translateOptionalPointBy(undefined, { x: 1, y: 1 }))).toBe(false);
    });

    it("给了点就等价于 translatePointBy（同一夹具下逐字段相等）", () => {
      const { translateOptionalPointBy, translatePointBy } = renderBatchScope();
      const point = { x: 4.6, y: -4.6 };
      const shift = { x: 1.4, y: 1.4 };
      const optional = translateOptionalPointBy(point, shift);
      const direct = translatePointBy(point, shift);
      expect(optional).toEqual(direct);
      expect(optional).toEqual({ x: 6, y: -3 });
      // 零位移下同样透传为真点，不是 undefined
      expect(translateOptionalPointBy({ x: 0, y: 0 }, { x: 0, y: 0 })).toEqual({ x: 0, y: 0 });
    });
  });

  describe("edgeRoutesForGeometryBounds", () => {
    it("空数组产出空数组（不是 undefined）", () => {
      const { edgeRoutesForGeometryBounds } = renderBatchScope();
      const result = edgeRoutesForGeometryBounds([]);
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0);
    });

    it("source/target 都缺且无 manualPoints 的边不产出条目", () => {
      const { edgeRoutesForGeometryBounds } = renderBatchScope();
      // ↓ 承重断言：filter(Boolean) 后 points.length === 0 ⇒ flatMap 返回 []，
      //   这条边整条消失。删掉 `points.length > 0` 判断后它会产出一个空 points 条目。
      const result = edgeRoutesForGeometryBounds([edge("bare")]);
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0);

      // manualPoints 显式为 undefined 与「字段不存在」同路径，也不产出
      expect(edgeRoutesForGeometryBounds([edge("explicit-undefined", { manualPoints: undefined })])).toHaveLength(0);

      // 反面对照：只要有一个点就要产出
      const onlyTarget = edgeRoutesForGeometryBounds([edge("t", { targetPoint: { x: 1, y: 2 } })]);
      expect(onlyTarget).toHaveLength(1);
      expect(onlyTarget[0].points).toHaveLength(1);
    });

    it("manualPoints 为 undefined 不抛，顺序恒为 source → manual → target", () => {
      const { edgeRoutesForGeometryBounds } = renderBatchScope();
      // 显式 undefined 走 `?? []` 兜底，绝不能抛
      const noManual = edgeRoutesForGeometryBounds([
        edge("e1", { sourcePoint: { x: 0, y: 0 }, manualPoints: undefined, targetPoint: { x: 9, y: 9 } })
      ]);
      expect(noManual[0].points).toEqual([{ x: 0, y: 0 }, { x: 9, y: 9 }]);

      // 有 manualPoints 时顺序必须是 source → manual… → target，
      // 不是 source → target → manual（map 顺序错位这条就红）
      const withManual = edgeRoutesForGeometryBounds([
        edge("e2", {
          sourcePoint: { x: 1, y: 1 },
          manualPoints: [{ x: 2, y: 2 }, { x: 3, y: 3 }],
          targetPoint: { x: 4, y: 4 }
        })
      ]);
      expect(withManual).toHaveLength(1);
      expect(withManual[0].points).toEqual([
        { x: 1, y: 1 },
        { x: 2, y: 2 },
        { x: 3, y: 3 },
        { x: 4, y: 4 }
      ]);
    });

    it("逐条边独立成项，且中间缺头的边会被跳过两端不补位", () => {
      const { edgeRoutesForGeometryBounds } = renderBatchScope();
      const result = edgeRoutesForGeometryBounds([
        edge("bare"), // 无任何点 → 跳过
        edge("only-source", { sourcePoint: { x: 5, y: 5 } }), // 只有 source
        edge("manual-only", { manualPoints: [{ x: 7, y: 7 }] }), // 只有手动点
        edge("full", { sourcePoint: { x: 0, y: 0 }, targetPoint: { x: 2, y: 2 } })
      ]);
      expect(result).toHaveLength(3);
      expect(result[0].points).toEqual([{ x: 5, y: 5 }]);
      expect(result[1].points).toEqual([{ x: 7, y: 7 }]);
      expect(result[2].points).toEqual([{ x: 0, y: 0 }, { x: 2, y: 2 }]);
      // 产出的是 Pick<RoutedEdge,"points">：只有 points，没有 path/edgeId
      expect(Object.keys(result[0])).toEqual(["points"]);
    });
  });

  describe("minimumCanvasBoundsForContent", () => {
    it("不吃到内容时返回最小画布下限（baseBounds 原样返回）", () => {
      const { minimumCanvasBoundsForContent } = renderBatchScope({
        calculateModelContentSize: () => ({ width: 0, height: 0 })
      });
      expect(minimumCanvasBoundsForContent([], [], [])).toEqual({ width: 640, height: 360 });
    });

    it("内容超出时取 max(最小值, 内容尺寸 + padding)，padding 缺省取 MOVE_BOUNDARY_GUARD", () => {
      // calculateModelContentSize 在真实实现里把 padding 算进去，这里换成常量
      // 替身，把「padding 传了什么值」变成可观测量 —— 否则被测函数传错 padding 也看不出来。
      const seen: number[] = [];
      const contentSize = (_n: any, _e: any, _r: any, padding: number) => {
        seen.push(padding);
        return { width: 900, height: 800 };
      };
      const { minimumCanvasBoundsForContent } = renderBatchScope({ calculateModelContentSize: contentSize });

      // 显式 padding
      expect(minimumCanvasBoundsForContent([], [], [], 50)).toEqual({ width: 900, height: 800 });
      expect(seen.at(-1)).toBe(50);

      // 缺省 padding：默认形参取自 scope 上的 MOVE_BOUNDARY_GUARD（此处夹具给 8）
      minimumCanvasBoundsForContent([], [], []);
      expect(seen.at(-1)).toBe(8);

      // 内容小于最小画布 ⇒ base 的 {640,360} 胜出
      const small = renderBatchScope({
        calculateModelContentSize: () => ({ width: 100, height: 100 })
      });
      expect(small.minimumCanvasBoundsForContent([], [], [])).toEqual({ width: 640, height: 360 });
    });

    it("省略实参时：nodes/edges 取自 scope 解构，routes 取自 hook 中途算出的 routedEdges", () => {
      const contentNodes = [node("N1", 0, 0)];
      const contentEdges = [edge("E1")];
      const scopeRoutedEdges = [{ edgeId: "E1", points: [{ x: 1, y: 1 }] }];
      const calls: any[] = [];
      const scope = renderBatchScope({
        nodes: contentNodes,
        edges: contentEdges,
        routedEdges: scopeRoutedEdges,
        calculateModelContentSize: (n: any, e: any, r: any, padding: number) => {
          calls.push({ n, e, r, padding });
          return { width: 640, height: 360 };
        }
      });
      const { minimumCanvasBoundsForContent } = scope;

      // ↓ 承重断言：三个默认形参的来源各不相同，别混为一谈 ——
      //   contentNodes / contentEdges 取的是 hook **顶部从 scope 解构**出来的
      //   nodes / edges；contentRoutes 取的却是 hook **中途算出的** routedEdges
      //   （routedRouteState.routes），并非 scope 上那个同名字段。
      //   把默认值误写成 `= __appScope.routedEdges` 或 `= []`，本条即转红。
      minimumCanvasBoundsForContent();
      expect(calls).toHaveLength(1);
      expect(calls[0].n).toBe(contentNodes);
      expect(calls[0].e).toBe(contentEdges);
      expect(calls[0].r).toBe(scope.routedEdges);
      expect(calls[0].padding).toBe(8);
      // 反面对照：hook 回写的 routedEdges 与夹具喂进去的那份确实不是同一个对象，
      // 否则上面那条 toBe 会因为「碰巧同源」而失去分辨力。
      expect(scope.routedEdges).not.toBe(scopeRoutedEdges);
      expect(scope.routedEdges).toHaveLength(0);

      // 显式传入 undefined 也走默认值（默认形参对 undefined 生效）
      minimumCanvasBoundsForContent(undefined, undefined, undefined);
      expect(calls).toHaveLength(2);
      expect(calls[1].n).toBe(contentNodes);
      expect(calls[1].e).toBe(contentEdges);
      expect(calls[1].r).toBe(scope.routedEdges);
    });
  });

  describe("graphContentFitsFixedCanvasBounds", () => {
    it("空内容恒为 true（无几何 ⇒ 无从越界）", () => {
      const { graphContentFitsFixedCanvasBounds } = renderBatchScope();
      expect(graphContentFitsFixedCanvasBounds([])).toBe(true);
      expect(graphContentFitsFixedCanvasBounds([], [], [], { width: 10, height: 10 })).toBe(true);
    });

    it("节点落在 bounds 内为 true，越界为 false", () => {
      const bounds = { width: CANVAS_WIDTH, height: CANVAS_HEIGHT };
      const { graphContentFitsFixedCanvasBounds } = renderBatchScope();
      // 40×40 节点的 position 是**中心**不是左上角（bodyVisualBoxForNode 按
      // position ± 半宽算），故 (100,100) 的实际包围盒是 80..120，四边都在界内。
      expect(graphContentFitsFixedCanvasBounds([node("in", 100, 100)], [], [], bounds)).toBe(true);
      // 中心挪到 x=1190 ⇒ 右边界 1210 > 1200 ⇒ 越界
      expect(graphContentFitsFixedCanvasBounds([node("out", 1190, 100)], [], [], bounds)).toBe(false);
      // 负方向同理：中心 x=10 ⇒ 左边界 -10 < 0，margin=0 也判越界
      expect(graphContentFitsFixedCanvasBounds([node("left", 10, 100)], [], [], bounds)).toBe(false);
    });

    it("contentEdges 的 targetPoint 也参与判定（经 edgeRoutesForGeometryBounds）", () => {
      const bounds = { width: CANVAS_WIDTH, height: CANVAS_HEIGHT };
      const { graphContentFitsFixedCanvasBounds } = renderBatchScope();
      const inBoundsNode = [node("in", 100, 100)];
      // 节点装得下，但这条边的 targetPoint 在画布外 ⇒ 整份内容装不下
      expect(
        graphContentFitsFixedCanvasBounds(
          inBoundsNode,
          [edge("far", { targetPoint: { x: 5000, y: 5000 } })],
          [],
          bounds
        )
      ).toBe(false);
      // 同样的点改从 contentRoutes 传入 ⇒ 结论一致（两条入口汇到同一个 routes 数组）
      expect(
        graphContentFitsFixedCanvasBounds(inBoundsNode, [], [{ points: [{ x: 5000, y: 5000 }] }], bounds)
      ).toBe(false);
      // 两个端点都在界内 ⇒ true（证明上两条不是被节点那一项带成 false 的）
      expect(
        graphContentFitsFixedCanvasBounds(
          inBoundsNode,
          [edge("near", { sourcePoint: { x: 120, y: 120 }, targetPoint: { x: 130, y: 130 } })],
          [],
          bounds
        )
      ).toBe(true);
    });

    it("省略 bounds 时默认取 scope 上的 canvasBounds（{canvasWidth, canvasHeight}）", () => {
      const { graphContentFitsFixedCanvasBounds } = renderBatchScope();
      // 夹具画布 1200×800：中心 x=1190 的节点右边界 1210 ⇒ 默认 bounds 下装不下
      expect(graphContentFitsFixedCanvasBounds([node("edge-case", 1190, 100)])).toBe(false);
      // 同一节点显式给一个更大的 bounds ⇒ 装得下（证明差别真来自 bounds 默认值）
      expect(
        graphContentFitsFixedCanvasBounds([node("edge-case", 1190, 100)], [], [], { width: 4000, height: 4000 })
      ).toBe(true);
      // 中心 x=100 的节点在默认 bounds 下装得下 ⇒ 默认值不是「恒 false」
      expect(graphContentFitsFixedCanvasBounds([node("mid", 100, 100)])).toBe(true);
    });
  });

  describe("routeRenderOrder", () => {
    it("按 routedEdgeIndexById 的下标升序", () => {
      const scope = renderBatchScope();
      const order = scope.routeRenderOrder;
      const index = scope.routedEdgeIndexById;
      const first = { edgeId: "FIRST" } as any;
      const second = { edgeId: "SECOND" } as any;

      index.set("FIRST", 3);
      index.set("SECOND", 11);

      // 同一条 route 自比恒为 0（排序器基本契约：自反）
      expect(order(first, first)).toBe(0);
      expect(order(first, second)).toBeLessThan(0);
      expect(order(second, first)).toBeGreaterThan(0);
      expect(order(first, second)).toBe(-8);
      expect([second, first].sort(order).map((r) => r.edgeId)).toEqual(["FIRST", "SECOND"]);
    });

    it("下标缺失的 edgeId 兜底到 MAX_SAFE_INTEGER ⇒ 恒排最后，且不产生 NaN", () => {
      const scope = renderBatchScope();
      const order = scope.routeRenderOrder;
      const index = scope.routedEdgeIndexById;
      const known = { edgeId: "KNOWN" } as any;
      const unknown = { edgeId: "NOT-IN-INDEX" } as any;
      index.set("KNOWN", 0);

      // ↓ 承重断言：兜底是 `?? Number.MAX_SAFE_INTEGER` 而不是直接返回 undefined。
      //   若兜底被删掉，unknown 与任何一条相减都得 NaN —— NaN 比较恒假，
      //   排序结果交给引擎实现去漂，「沉底」这条就守不住了。
      expect(order(unknown, unknown)).toBe(0);
      expect(order(unknown, known)).toBe(Number.MAX_SAFE_INTEGER);
      expect(Number.isNaN(order(unknown, known))).toBe(false);
      expect(order(known, unknown)).toBe(-Number.MAX_SAFE_INTEGER);

      // 两条都不在索引里 ⇒ 同序（都落到同一个兜底值）；ES2019 起 Array#sort 规范
      // 要求稳定 ⇒ 同序项保持输入顺序 known 之后的 [alsoUnknown, unknown] 不变
      const alsoUnknown = { edgeId: "ALSO-NOT-IN-INDEX" } as any;
      expect(order(unknown, alsoUnknown)).toBe(0);
      expect([alsoUnknown, unknown, known].sort(order).map((r) => r.edgeId)).toEqual([
        "KNOWN",
        "ALSO-NOT-IN-INDEX",
        "NOT-IN-INDEX"
      ]);
    });

    it("相等下标视为同序；index 为空时全部同序（不抛）", () => {
      const scope = renderBatchScope();
      const order = scope.routeRenderOrder;
      const index = scope.routedEdgeIndexById;
      const a = { edgeId: "A" } as any;
      const b = { edgeId: "B" } as any;
      const c = { edgeId: "C" } as any;
      index.set("A", 0);
      index.set("B", 0);
      index.set("C", 5);

      expect(order(a, b)).toBe(0);
      expect(order(a, c)).toBeLessThan(0);
      // 稳定的排序器（ES2019 起 Array#sort 规范要求）⇒ 同序项保持输入顺序
      expect([c, b, a].sort(order).map((r) => r.edgeId)).toEqual(["B", "A", "C"]);

      // 空索引：三条全落兜底值 ⇒ 排序不炸、顺序不变
      const empty = renderBatchScope();
      expect(empty.routeRenderOrder(a, b)).toBe(0);
      expect([c, b, a].sort(empty.routeRenderOrder).map((r) => r.edgeId)).toEqual(["C", "B", "A"]);
    });
  });
});
