import { describe, expect, test } from "vitest";
import { createAppHookCallback57 } from "./appToolbarHookFactories";
import { readViewportResultCache, writeViewportResultCache, viewportBoundsCacheKey } from "./appCoreCanvasUtilities";

// ── 以下为「视口定位 / 静态按钮动作」6 个工厂的测试 ────────────────────────────
// 设计原则：工厂只做一层转发，所以断言必须落在**转发出去的实参**或**下游真实实现的结果**上，
// 断「不抛错」是废断言。凡是 scope 里被工厂读到的字段，一律接真实实现（clampNumber /
// selectionRectCenter / createFitViewToBounds / clampViewBoxDimensionsForZoom /
// isStaticButtonEnabledForNode / boxesIntersect），只对 DOM 相关的量（clientWidth、
// getBoundingClientRect）用替身 —— 这样「期望值」是能手算出来的常数，不是回读替身自己。
import { afterEach, vi } from "vitest";
import {
  createCenterSelectedInView,
  createClampFloatingToolbarPosition,
  createExecuteStaticButtonAction,
  createFitViewToSelection,
  createHandleMinimapNavigate,
  createHandleStaticButtonClick,
  createJumpToAssociatedModel,
  createOpenNodeDoubleClickEditor,
  createPlaceFloatingToolbar,
  createToolbarOverlapArea
} from "./appToolbarHookFactories";
import { boxesIntersect, FIT_SELECTION_MAX_ZOOM_PERCENT, selectionRectCenter } from "./appCoreCanvasUtilities";
import { createFitViewToBounds } from "./appProjectCanvasFactories";
import { isStaticButtonEnabledForNode } from "./appInlineUtilityFunctions";
import { clampNumber } from "../canvasViewport";
import { clampViewBoxDimensionsForZoom } from "../model-canvas-ops";

// 画布视口节点序 = 画布绘制序（appRenderBatch 按数组序渲染）。
// 容器沉底：容器必须排在 nodeIndexById 更小的普通设备之前。
const node = (id: string, kind: string) => ({
  id, kind, name: id, position: { x: 0, y: 0 }, size: { width: 40, height: 30 },
  rotation: 0, scale: 1, params: {}, terminals: [],
} as any);

// 最小 __appScope 桩：只补齐 callback57 实际读取的字段（缓存/空间索引用真实实现）
const makeScope = (nodes: ReturnType<typeof node>[]) => {
  const visibleNodeById = new Map(nodes.map((n) => [n.id, n]));
  const indexById = new Map(nodes.map((n, index) => [n.id, index]));
  return {
    connectSource: null,
    displaySelectedEdgeKey: "",
    displaySelectedNodeKey: "",
    draggingNodeIdSet: new Set<string>(),
    selectedNodeIdSet: new Set<string>(),
    edgeById: new Map(),
    visibleNodeById,
    visibleNodeIdSet: new Set(nodes.map((n) => n.id)),
    visibleNodeSpatialIndex: {},
    routedEdgeStore: {},
    viewportRoutedEdges: [],
    effectiveViewportQueryBounds: { left: -1000, right: 1000, top: -1000, bottom: 1000 },
    queryNodeSpatialIndex: () => nodes,
    graphStore: { nodeIndexById: indexById },
    viewportNodesResultCacheRef: { current: { ownerRefs: [], token: "", values: new Map() } },
    viewportBoundsCacheKey,
    readViewportResultCache,
    writeViewportResultCache,
  } as any;
};

describe("appToolbarHookFactories callback57 视口节点序", () => {
  test("容器沉底:容器排在 nodeIndexById 更小的设备之前,其余保持索引序", () => {
    const nodes = [node("a", "ac-load"), node("box", "ac-vpp-box"), node("b", "ac-load")];
    const viewportNodes = createAppHookCallback57(makeScope(nodes))();
    expect(viewportNodes.map((n: any) => n.id)).toEqual(["box", "a", "b"]);
  });

  test("无容器时仍按 nodeIndexById 原序", () => {
    const nodes = [node("b", "ac-load"), node("a", "ac-load")];
    const viewportNodes = createAppHookCallback57(makeScope(nodes))();
    expect(viewportNodes.map((n: any) => n.id)).toEqual(["b", "a"]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 1 & 2. createCenterSelectedInView —— 把选择包围盒中心挪到视口中心
// 守卫的关键是那个 `if (!selectedCanvasBounds) return`：空选择时**一个视口调用都不能发生**，
// 而不是「居中到 (0,0)」。centerViewBoxOnPoint 是 spy，计数 0 才是判别点。
// ─────────────────────────────────────────────────────────────────────────────
describe("createCenterSelectedInView", () => {
  const makeScope = (over: Record<string, any> = {}) => ({
    centerViewBoxOnPoint: vi.fn(),
    selectionRectCenter,
    selectedCanvasBounds: null,
    ...over
  });

  test("空选择时不动视口：居中函数调用次数为 0", () => {
    const scope = makeScope({ selectedCanvasBounds: null });

    createCenterSelectedInView(scope)();

    // 若把 `!selectedCanvasBounds` 早退删掉，这里会变成 1 次调用（且参数为 NaN）→ 转红。
    expect(scope.centerViewBoxOnPoint).toHaveBeenCalledTimes(0);
  });

  test("有选择时把包围盒中心移到视口中心", () => {
    // 左 10/右 30 → x=20；上 400/下 600 → y=500。故意让 x≠y、且两轴取值范围不同，
    // 这样「拿 left+right 当 y」或「不除 2」都会转红。
    const scope = makeScope({ selectedCanvasBounds: { left: 10, right: 30, top: 400, bottom: 600 } });

    createCenterSelectedInView(scope)();

    expect(scope.centerViewBoxOnPoint).toHaveBeenCalledTimes(1);
    expect(scope.centerViewBoxOnPoint).toHaveBeenCalledWith({ x: 20, y: 500 });
  });

  test("包围盒为单点（零宽高）时中心就是该点本身", () => {
    const scope = makeScope({ selectedCanvasBounds: { left: -12.5, right: -12.5, top: 7, bottom: 7 } });

    createCenterSelectedInView(scope)();

    expect(scope.centerViewBoxOnPoint).toHaveBeenCalledWith({ x: -12.5, y: 7 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. createFitViewToSelection —— 固定 padding 80，缩放上限转交 scope 常量
// 接的是**真实** createFitViewToBounds + 真实 clampViewBoxDimensionsForZoom，
// 只把两个依赖 DOM 的量替掉：canvasFrameRef.current 置 null（走 viewBox 尺寸回退）、
// clampViewBoxToCanvas 取恒等。期望值全部手算：
//   bounds {100,300,40,160} + padding 80 → targetWidth=360, targetHeight=280
//   视口宽高比 = viewBox 900/600 = 1.5；360/280≈1.29 < 1.5 → fitSize = {420, 280}
// ─────────────────────────────────────────────────────────────────────────────
describe("createFitViewToSelection", () => {
  const BOUNDS = { left: 100, right: 300, top: 40, bottom: 160 };

  const makeScope = (over: Record<string, any> = {}) => {
    const scope: Record<string, any> = {
      FIT_SELECTION_MAX_ZOOM_PERCENT,
      selectedCanvasBounds: null,
      canvasBounds: { left: 0, top: 0, width: 1200, height: 800 },
      canvasFrameRef: { current: null },
      viewBox: { x: 0, y: 0, width: 900, height: 600 },
      clampViewBoxToCanvas: (viewBox: any) => viewBox,
      clampViewBoxDimensionsForZoom,
      resetViewportZoom: vi.fn(),
      setViewBoxAtViewportCenter: vi.fn(),
      ...over
    };
    // 只有调用方没自带替身时才接真实实现（转交实参那条用例要自带 spy）。
    if (!over.fitViewToBounds) {
      scope.fitViewToBounds = createFitViewToBounds(scope);
    }
    return scope;
  };

  test("空选择：走重置缩放分支，不改 viewBox", () => {
    const scope = makeScope();

    createFitViewToSelection(scope)();

    expect(scope.resetViewportZoom).toHaveBeenCalledTimes(1);
    expect(scope.setViewBoxAtViewportCenter).toHaveBeenCalledTimes(0);
  });

  test("有选择：把包围盒原样转交，padding 写死 80，上限取 scope 常量", () => {
    // 常量当前就是 100，钉死：日后有人改它，这里会提醒同步改断言。
    expect(FIT_SELECTION_MAX_ZOOM_PERCENT).toBe(100);
    const fitViewToBounds = vi.fn();
    const scope = makeScope({ selectedCanvasBounds: BOUNDS, fitViewToBounds });

    createFitViewToSelection(scope)();

    expect(fitViewToBounds).toHaveBeenCalledTimes(1);
    expect(fitViewToBounds).toHaveBeenCalledWith(BOUNDS, 80, FIT_SELECTION_MAX_ZOOM_PERCENT);
    expect(scope.resetViewportZoom).toHaveBeenCalledTimes(0);
  });

  test("有选择：viewBox 以包围盒中心为中心，尺寸被 100% 上限顶到画布尺寸", () => {
    const scope = makeScope({ selectedCanvasBounds: BOUNDS });

    createFitViewToSelection(scope)();

    // 中心 (200,100)，clamp 后 size = 画布 1200×800 → 左上角 (200-600, 100-400)
    expect(scope.setViewBoxAtViewportCenter).toHaveBeenCalledWith(
      { x: -400, y: -300, width: 1200, height: 800 },
      { x: 200, y: 100 }
    );
    expect(scope.setViewBoxAtViewportCenter.mock.calls[0][0].width).toBe(scope.canvasBounds.width);
  });

  // ⚠ 判别力说明（重要，见回报）：zoom 因子在两条分支上**相同**。
  // FIT_SELECTION_MAX_ZOOM_PERCENT=100 使 clampViewBoxDimensionsForZoom 的
  // minRatio=maxRatio=100/100=1，于是无论选择多大，viewBox 恒等于画布尺寸 → zoom 恒 100%；
  // 空选择那侧 resetViewportZoom() 同样是 100%。所以「适应选择」永远无法放大。
  // 真正有判别力的是：走哪条分支、以及中心坐标。本用例把这点钉成显式断言。
  test("空选择与有选择的 zoom 因子都落在 100%：判别力在分支与中心，不在缩放", () => {
    const empty = makeScope();
    createFitViewToSelection(empty)();

    const filled = makeScope({ selectedCanvasBounds: BOUNDS });
    createFitViewToSelection(filled)();

    // 有选择：zoom = 画布宽 / viewBox 宽 = 1200/1200
    const zoomWithSelection = filled.canvasBounds.width / filled.setViewBoxAtViewportCenter.mock.calls[0][0].width;
    expect(zoomWithSelection).toBe(1);
    // 空选择：没有 setViewBoxAtViewportCenter 调用，缩放由 resetViewportZoom 复位
    expect(empty.setViewBoxAtViewportCenter).toHaveBeenCalledTimes(0);

    // 把上限调高，缩放因子才会真正变化 —— 证明 100 这个常量就是唯一的封顶点
    const zoomed = makeScope({ selectedCanvasBounds: BOUNDS, FIT_SELECTION_MAX_ZOOM_PERCENT: 400 });
    createFitViewToSelection(zoomed)();
    const zoomWithoutCap = zoomed.canvasBounds.width / zoomed.setViewBoxAtViewportCenter.mock.calls[0][0].width;
    expect(zoomed.setViewBoxAtViewportCenter.mock.calls[0][0]).toMatchObject({ width: 420, height: 280 });
    expect(zoomWithoutCap).not.toBe(zoomWithSelection);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. createHandleMinimapNavigate —— 小地图点击坐标 → 画布坐标
// 换算式：canvas = (client - rect.left - offsetX) / scale，再夹进 [0, canvasWidth]。
// 夹取用例刻意取**明显为负**的输入（-180 → 0）；取恰好等于 0 的输入会与夹取下界
// 无法区分（clampNumber(0,0,w) === 0），那样的用例在删掉 clamp 后仍然恒绿。
// ─────────────────────────────────────────────────────────────────────────────
describe("createHandleMinimapNavigate", () => {
  const makeScope = (over: Record<string, any> = {}) => ({
    canvasWidth: 2000,
    canvasHeight: 1200,
    minimapOffsetX: 10,
    minimapOffsetY: 20,
    minimapScale: 0.5,
    clampNumber,
    centerViewBoxOnPoint: vi.fn(),
    ...over
  });

  const makeEvent = (clientX: number, clientY: number) => ({
    clientX,
    clientY,
    currentTarget: { getBoundingClientRect: () => ({ left: 100, top: 50 }) },
    preventDefault: vi.fn(),
    stopPropagation: vi.fn()
  });

  test("点击坐标按偏移与缩放换算成画布坐标后居中", () => {
    const scope = makeScope();
    const event = makeEvent(260, 240);

    createHandleMinimapNavigate(scope)(event as any);

    // x = (260-100-10)/0.5 = 300；y = (240-50-20)/0.5 = 340
    expect(scope.centerViewBoxOnPoint).toHaveBeenCalledTimes(1);
    expect(scope.centerViewBoxOnPoint).toHaveBeenCalledWith({ x: 300, y: 340 });
    expect(event.preventDefault).toHaveBeenCalledTimes(1);
    expect(event.stopPropagation).toHaveBeenCalledTimes(1);
  });

  test("换算结果越出画布时被夹到画布边界（左上 0,0）", () => {
    const scope = makeScope();

    createHandleMinimapNavigate(scope)(makeEvent(20, 0) as any);

    // x = (20-100-10)/0.5 = -180 → 0；y = (0-50-20)/0.5 = -140 → 0
    expect(scope.centerViewBoxOnPoint).toHaveBeenCalledWith({ x: 0, y: 0 });
  });

  test("换算结果越出画布时被夹到画布边界（右下 canvasWidth,canvasHeight）", () => {
    const scope = makeScope();

    createHandleMinimapNavigate(scope)(makeEvent(1200, 900) as any);

    // x = (1200-100-10)/0.5 = 2180 → 2000；y = (900-50-20)/0.5 = 1660 → 1200
    expect(scope.centerViewBoxOnPoint).toHaveBeenCalledWith({ x: 2000, y: 1200 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. createPlaceFloatingToolbar —— 越界锚点被夹回视口内
// 接真实 createClampFloatingToolbarPosition 与 createToolbarOverlapArea。
// 视口 800×600、padding 8、工具条 120×40 ⇒ x∈[8,672]、y∈[8,552]。
// ─────────────────────────────────────────────────────────────────────────────
describe("createPlaceFloatingToolbar", () => {
  const makeScope = (over: Record<string, any> = {}) => {
    const scope: Record<string, any> = {
      clampNumber,
      boxesIntersect,
      floatingToolbarPadding: 8,
      floatingToolbarViewport: { left: 0, top: 0, right: 800, bottom: 600 },
      floatingToolbarScreenScale: 1.25,
      ...over
    };
    scope.clampFloatingToolbarPosition = createClampFloatingToolbarPosition(scope);
    scope.toolbarOverlapArea = createToolbarOverlapArea(scope);
    return scope;
  };

  test("锚点越过视口右下方时夹到内边缘", () => {
    const scope = makeScope();

    expect(createPlaceFloatingToolbar(scope)([{ x: 900, y: 700 }], 120, 40)).toEqual({
      x: 672,
      y: 552,
      width: 120,
      height: 40,
      scale: 1.25
    });
  });

  test("锚点越过视口左上方时夹到 padding 边缘", () => {
    const scope = makeScope();

    expect(createPlaceFloatingToolbar(scope)([{ x: -50, y: -20 }], 120, 40)).toEqual({
      x: 8,
      y: 8,
      width: 120,
      height: 40,
      scale: 1.25
    });
  });

  test("工具条比视口还宽时仍被夹到 padding 边缘，不会翻到视口另一侧", () => {
    const scope = makeScope();

    // maxX = max(8, 800-900-8) = 8 ⇒ x 落在 8 而不是 -108；y=300 本就在 [8,552] 内，不动。
    expect(createPlaceFloatingToolbar(scope)([{ x: 500, y: 300 }], 900, 40)).toMatchObject({ x: 8, y: 300 });
    // 等价变异记录：createClampFloatingToolbarPosition 里那句 `Math.max(minX, maxX)`
    // **删掉也测不出来** —— maxX 变成 -108 时 clampNumber(500, 8, -108)
    // = max(8, min(-108, 500)) = max(8, -108) = 8，与 maxX=8 时逐字相同。
    // 根因是 clampNumber 自身已带 Math.max(min, …) 下界，那句守卫只是防御性重复。
    // 只有换掉夹取器实现才会让两者分叉，故本用例覆盖不到它，也不假装覆盖。
  });

  test("多候选时按与避让矩形的重叠面积择优，而非按下标", () => {
    const scope = makeScope();
    const candidates = [{ x: 700, y: 300 }, { x: 200, y: 300 }];
    // 避让区只压住候选 0 夹取后的矩形 {672,792,300,340}
    const avoidOnFirst = [{ left: 640, right: 800, top: 280, bottom: 360 }];
    // 避让区只压住候选 1 的矩形 {200,320,300,340}
    const avoidOnSecond = [{ left: 160, right: 260, top: 280, bottom: 360 }];

    // 压住候选 0 → 选候选 1（x=200）
    expect(createPlaceFloatingToolbar(scope)(candidates, 120, 40, avoidOnFirst)).toMatchObject({ x: 200, y: 300 });
    // 压住候选 1 → 选候选 0，且它被夹到 672
    expect(createPlaceFloatingToolbar(scope)(candidates, 120, 40, avoidOnSecond)).toMatchObject({ x: 672, y: 300 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6 & 7. 静态按钮：未知/未启用的按钮不得触发任何动作
// ⚠ 这两个工厂**不看按钮 id**，id 只是透传参数；真正的闸门是
// isStaticButtonEnabledForNode（node 侧）与 node.params.buttonActionType（动作侧）。
// 所以「未知按钮」在本文件里必须落成这两个闸门之一，用 scope 里计数为 0 的 spy 钉住。
// ─────────────────────────────────────────────────────────────────────────────
const buttonNode = (id: string, params: Record<string, any>, kind = "static-text") => ({
  id,
  kind,
  name: id,
  position: { x: 0, y: 0 },
  size: { width: 40, height: 30 },
  rotation: 0,
  scale: 1,
  params,
  terminals: []
}) as any;

const makeClickScope = (over: Record<string, any> = {}) => ({
  isBrowseMode: true,
  isStaticButtonEnabledForNode,
  executeStaticButtonAction: vi.fn(),
  setStaticButtonFeedback: vi.fn(),
  setStaticButtonVisual: vi.fn(),
  clearStaticButtonFeedback: vi.fn(),
  staticButtonPointerRef: { current: null as any },
  staticButtonFeedbackTimeoutRef: { current: null as any },
  ...over
});

const makeClickEvent = (clientX = 10, clientY = 10) => ({
  clientX,
  clientY,
  preventDefault: vi.fn(),
  stopPropagation: vi.fn()
});

describe("createHandleStaticButtonClick", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("未启用按钮的未知 id：不抛错且一个动作都没触发，按下快照原样留着", () => {
    vi.stubGlobal("window", { setTimeout: vi.fn(() => 77) });
    const snapshot = { nodeId: "btn-unknown-42", clientX: 10, clientY: 10, moved: false };
    const scope = makeClickScope({ staticButtonPointerRef: { current: snapshot } });
    const node = buttonNode("btn-unknown-42", {});

    expect(isStaticButtonEnabledForNode(node)).toBe(false);
    expect(() => createHandleStaticButtonClick(scope)(makeClickEvent() as any, node)).not.toThrow();
    expect(scope.executeStaticButtonAction).toHaveBeenCalledTimes(0);
    expect(scope.setStaticButtonFeedback).toHaveBeenCalledTimes(0);
    expect(scope.setStaticButtonVisual).toHaveBeenCalledTimes(0);
    expect(scope.staticButtonFeedbackTimeoutRef.current).toBe(null);
    // 早退发生在 `staticButtonPointerRef.current = null` 之前 ⇒ 快照没被消费。
    // 若把早退挪到清空之后，这条就转红。
    expect(scope.staticButtonPointerRef.current).toEqual(snapshot);
  });

  test("已启用且位移在 4px 内的点击：点亮反馈并只调用一次底层动作", () => {
    vi.stubGlobal("window", { setTimeout: vi.fn(() => 77) });
    const scope = makeClickScope({
      staticButtonPointerRef: { current: { nodeId: "btn-1", clientX: 10, clientY: 10, moved: false } }
    });
    const node = buttonNode("btn-1", { buttonEnabled: "1", buttonActionType: "command", buttonCommand: "run" });
    const event = makeClickEvent(11, 12);

    createHandleStaticButtonClick(scope)(event as any, node);

    // 与上一条互为反向证明：0 计数不是因为 spy 断了，而是这里真的能到 1。
    expect(scope.executeStaticButtonAction).toHaveBeenCalledTimes(1);
    expect(scope.executeStaticButtonAction).toHaveBeenCalledWith(node);
    expect(scope.setStaticButtonFeedback).toHaveBeenCalledWith("btn-1", "clicked");
    expect(scope.staticButtonFeedbackTimeoutRef.current).toBe(77);
    expect(event.preventDefault).toHaveBeenCalledTimes(1);
    expect(event.stopPropagation).toHaveBeenCalledTimes(1);
  });

  test("按下后拖动超过 4px：视为取消，清反馈但不执行动作", () => {
    vi.stubGlobal("window", { setTimeout: vi.fn(() => 77) });
    const scope = makeClickScope({
      staticButtonPointerRef: { current: { nodeId: "btn-1", clientX: 10, clientY: 10, moved: false } }
    });
    const node = buttonNode("btn-1", { buttonEnabled: "1", buttonActionType: "command", buttonCommand: "run" });
    const event = makeClickEvent(30, 10);

    createHandleStaticButtonClick(scope)(event as any, node);

    expect(scope.executeStaticButtonAction).toHaveBeenCalledTimes(0);
    expect(scope.clearStaticButtonFeedback).toHaveBeenCalledWith("btn-1");
    expect(scope.setStaticButtonFeedback).toHaveBeenCalledTimes(0);
    expect(scope.staticButtonFeedbackTimeoutRef.current).toBe(null);
    // 快照已被消费（这次走到了清空那一行）
    expect(scope.staticButtonPointerRef.current).toBe(null);
    expect(event.preventDefault).toHaveBeenCalledTimes(0);
  });

  test("按下快照指向别的按钮：视为取消，不执行动作", () => {
    vi.stubGlobal("window", { setTimeout: vi.fn(() => 77) });
    const scope = makeClickScope({
      staticButtonPointerRef: { current: { nodeId: "btn-other", clientX: 10, clientY: 10, moved: false } }
    });
    const node = buttonNode("btn-1", { buttonEnabled: "1", buttonActionType: "command", buttonCommand: "run" });

    createHandleStaticButtonClick(scope)(makeClickEvent() as any, node);

    expect(scope.executeStaticButtonAction).toHaveBeenCalledTimes(0);
    expect(scope.clearStaticButtonFeedback).toHaveBeenCalledWith("btn-1");
  });
});

describe("createExecuteStaticButtonAction", () => {
  const makeScope = (over: Record<string, any> = {}) => ({
    STATIC_BUTTON_COMMAND_LABELS: { run: "运行仿真" },
    executeStaticButtonCommand: vi.fn(() => true),
    isStaticButtonEnabledForNode,
    layers: [
      { id: "L1", name: "一次层", visible: false },
      { id: "L2", name: "二次层", visible: true }
    ],
    requestLoadSavedProject: vi.fn(),
    resolveStaticButtonTargetLayers: vi.fn(() => []),
    resolveStaticButtonTargetProject: vi.fn(() => null),
    setActiveLayerId: vi.fn(),
    setLayers: vi.fn(),
    writeOperationLog: vi.fn(),
    ...over
  });

  test("command 动作：调底层命令执行并按中文标签写日志", () => {
    const scope = makeScope();
    const node = buttonNode("btn-1", { buttonEnabled: "1", buttonActionType: "command", buttonCommand: "run" });

    createExecuteStaticButtonAction(scope)(node);

    expect(scope.executeStaticButtonCommand).toHaveBeenCalledTimes(1);
    expect(scope.executeStaticButtonCommand).toHaveBeenCalledWith("run");
    expect(scope.writeOperationLog).toHaveBeenCalledWith("按钮执行命令：运行仿真");
    expect(scope.requestLoadSavedProject).toHaveBeenCalledTimes(0);
    expect(scope.setLayers).toHaveBeenCalledTimes(0);
  });

  test("layer 动作：切到首个目标层并按目标层集合改可见性", () => {
    const scope = makeScope({ resolveStaticButtonTargetLayers: vi.fn(() => [{ id: "L2", name: "二次层" }]) });
    const node = buttonNode("btn-1", { buttonEnabled: "1", buttonActionType: "layer" });

    createExecuteStaticButtonAction(scope)(node);

    expect(scope.resolveStaticButtonTargetLayers).toHaveBeenCalledWith(node, scope.layers);
    expect(scope.setActiveLayerId).toHaveBeenCalledWith("L2");
    expect(scope.setLayers).toHaveBeenCalledTimes(1);
    // 调用方传进来的 updater 必须真的把可见性改成「只有目标层可见」
    const updater = scope.setLayers.mock.calls[0][0];
    expect(updater(scope.layers)).toEqual([
      { id: "L1", name: "一次层", visible: false },
      { id: "L2", name: "二次层", visible: true }
    ]);
    expect(scope.writeOperationLog).toHaveBeenCalledWith("按钮切换图层：二次层");
  });

  test("未知动作类型：既不执行命令也不切层，且不写日志", () => {
    const scope = makeScope();
    const node = buttonNode("btn-42", { buttonEnabled: "1", buttonActionType: "quantum_toggle" });

    createExecuteStaticButtonAction(scope)(node);

    expect(scope.executeStaticButtonCommand).toHaveBeenCalledTimes(0);
    expect(scope.setActiveLayerId).toHaveBeenCalledTimes(0);
    expect(scope.setLayers).toHaveBeenCalledTimes(0);
    expect(scope.requestLoadSavedProject).toHaveBeenCalledTimes(0);
    expect(scope.resolveStaticButtonTargetLayers).toHaveBeenCalledTimes(0);
    expect(scope.resolveStaticButtonTargetProject).toHaveBeenCalledTimes(0);
    expect(scope.writeOperationLog).toHaveBeenCalledTimes(0);
  });

  test("未配置动作类型（缺 buttonActionType）：按 none 处理，动作与日志均为 0", () => {
    const scope = makeScope();
    const node = buttonNode("btn-42", { buttonEnabled: "1" });

    createExecuteStaticButtonAction(scope)(node);

    expect(scope.executeStaticButtonCommand).toHaveBeenCalledTimes(0);
    expect(scope.writeOperationLog).toHaveBeenCalledTimes(0);
  });

  test("未启用的未知按钮：全部动作与日志计数为 0", () => {
    const scope = makeScope();
    const node = buttonNode("btn-unknown-42", { buttonActionType: "command", buttonCommand: "run" });

    createExecuteStaticButtonAction(scope)(node);

    expect(scope.executeStaticButtonCommand).toHaveBeenCalledTimes(0);
    expect(scope.writeOperationLog).toHaveBeenCalledTimes(0);
  });

  test("命令执行失败：提示但不写操作日志", () => {
    // showGlobalMessage 在本工厂里是**裸全局引用**（没从 scope 解构，也没有
    // `= globalThis.showGlobalMessage` 兜底，与同文件 43/83 行的写法不一致），
    // 所以只能靠 stubGlobal 观测 —— 见回报。
    const showGlobalMessage = vi.fn();
    vi.stubGlobal("showGlobalMessage", showGlobalMessage);
    const scope = makeScope({ executeStaticButtonCommand: vi.fn(() => false) });
    const node = buttonNode("btn-1", { buttonEnabled: "1", buttonActionType: "command", buttonCommand: "nope" });

    createExecuteStaticButtonAction(scope)(node);

    expect(scope.executeStaticButtonCommand).toHaveBeenCalledWith("nope");
    expect(scope.writeOperationLog).toHaveBeenCalledTimes(0);
    expect(showGlobalMessage).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
  });

  test("project 动作：按目标项目切模型并写日志", () => {
    const target = { project: { name: "主变接线" }, scheme: { id: "S7" } };
    const scope = makeScope({ resolveStaticButtonTargetProject: vi.fn(() => target) });
    const node = buttonNode("btn-1", { buttonEnabled: "1", buttonActionType: "project" });

    createExecuteStaticButtonAction(scope)(node);

    expect(scope.resolveStaticButtonTargetProject).toHaveBeenCalledWith(node);
    expect(scope.requestLoadSavedProject).toHaveBeenCalledWith(target.project, "S7");
    expect(scope.writeOperationLog).toHaveBeenCalledWith("按钮切换模型：主变接线");
    expect(scope.executeStaticButtonCommand).toHaveBeenCalledTimes(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. createJumpToAssociatedModel —— 关联图元跳模型的守卫（L48 / L61 / L65）
// 目标行形态：`node.params?.model_id ?? ""`（L48）、`targets.length === 0`（L61）、
// `targets.length > 1`（L65）。工厂只是转发依赖，所以断言全部落在
// **showGlobalMessage 的实参**与**requestLoadSavedProject 的调用计数**上 ——
// 断「不抛错」是废断言。
//
// 判别输入的取法（照 §6.13 / §6.18b 的规矩来，而不是机械套表）：
// - L48 的 `??` 右臂：兜底值是 `""`，且要求**左操作数 nullish**。
//   喂 `model_id: ""` 无效（`??` 对 `""` 不短路，右臂从未求值）；
//   喂 `model_id: 0` 也无效（`String(0)` = `"0"`，非 nullish）。
//   唯一的判别输入是「**params 键整体不存在**」→ `node.params?.model_id` 为 undefined。
//   变异用形态 2（换右臂值）：`?? ""` → `?? "7"`，结果从「提示未定义」变成
//   「按 idx=7 去查模型」——两条消息文本不同，指名了确切契约。
// - L65 的 `> 1`：必须造**两个**匹配项（两个 scheme 各带一个 idx 相同、modelType 相同的项目）。
//   只造一个时 `> 1` 与 `>= 1` 都成立 —— 那样的用例断不了条件本身。
//
// ⚠ L48 的形态 1（直接删掉 `?? ""`）判 GREEN，**不是夹具没覆盖**，而是可证等价
//   （§6.20 路线 B 实测，勿重查）。机制：右臂只在左操作数 nullish 时求值，
//   而 nullish 全域只有 undefined / null 两个值 ——
//     原式 `String("")` = `""` → `Number("")` = 0
//     删后 `String(undefined)` = `"undefined"` → `Number` = NaN；`String(null)` = `"null"` → NaN
//   三个值在 L50 `!rawModelId || !Number.isInteger(modelIndex) || modelIndex <= 0`
//   这道守卫上走的是**同一个出口**（提示未定义 + return）；`rawModelId` / `modelIndex`
//   均为函数局部量，除此之外没有可观测出口，故两版逐输入输出相同。
//   叠加验证：把 L50 缩成只剩 `modelIndex <= 0`（单独做这一条 = GREEN），
//   再叠加删 `?? ""` ⇒ 转红
//   `expected '未找到dc-model模型 idx=NaN；…' to contain '未定义有效的关联模型（model_id）'`，
//   即被删掉的右臂确实参与了 `Number(...)` 的入参，只是那个差异被守卫的下游归一化抹平了。
// ─────────────────────────────────────────────────────────────────────────────
describe("createJumpToAssociatedModel", () => {
  const makeScope = (over: Record<string, any> = {}) => ({
    flattenSavedSchemes: (schemes: any) => schemes,
    modelAssociationModelTypeForKind: vi.fn(() => "dc-model"),
    requestLoadSavedProject: vi.fn(),
    schemes: [] as any[],
    showGlobalMessage: vi.fn(),
    writeOperationLog: vi.fn(),
    ...over
  });

  // 一个 idx=3、modelType 匹配的方案记录（flatMap 的元素是 { scheme, project }）
  const schemeWithProject = (id: string, idx: number, name: string, modelType = "dc-model") => ({
    id,
    projects: [{ project: { idx, modelType }, name }]
  });

  const jumpNode = (params?: Record<string, any>) => ({
    id: "n1",
    kind: "ac-load",
    name: "耦合电容器",
    ...(params === undefined ? {} : { params })
  });

  test("L48 params 键整体不存在：提示「未定义有效的关联模型」，一个方案都不加载", () => {
    // 关键：node 上**没有** params 键（不是 params:{}，也不是 model_id:""）
    const scope = makeScope({ schemes: [schemeWithProject("S1", 3, "直流模型")] });

    createJumpToAssociatedModel(scope)(jumpNode() as any);

    expect(scope.showGlobalMessage).toHaveBeenCalledTimes(1);
    expect(scope.showGlobalMessage.mock.calls[0][0]).toContain("未定义有效的关联模型（model_id）");
    // 兜底值是 ""，所以 rawModelId 为空 ⇒ 一步都走不到查找那段
    expect(scope.requestLoadSavedProject).toHaveBeenCalledTimes(0);
    expect(scope.writeOperationLog).toHaveBeenCalledTimes(0);
  });

  test("L48 有 model_id：不被兜底吞掉，按 trim 后的 idx 命中唯一方案并加载", () => {
    // 两侧对照：左臂成立时消息文本**完全不同**，证明上一条不是被同一个守卫拦下的
    const scope = makeScope({ schemes: [schemeWithProject("S1", 3, "直流模型")] });

    createJumpToAssociatedModel(scope)(jumpNode({ model_id: " 3 " }) as any);

    expect(scope.showGlobalMessage).toHaveBeenCalledTimes(0);
    expect(scope.requestLoadSavedProject).toHaveBeenCalledTimes(1);
    expect(scope.requestLoadSavedProject.mock.calls[0][1]).toBe("S1");
    expect(scope.writeOperationLog).toHaveBeenCalledTimes(1);
    // params 有空格 ⇒ String(...).trim() 真被用到（去掉 trim 会按 idx=" 3 " 查不到）
    expect(scope.requestLoadSavedProject.mock.calls[0][0].project.modelType).toBe("dc-model");
  });

  test("L65 两个模型命中同一 idx：提示「找到多个」并拒绝加载", () => {
    const schemes = [schemeWithProject("S1", 3, "直流模型甲"), schemeWithProject("S2", 3, "直流模型乙")];
    const scope = makeScope({ schemes });

    createJumpToAssociatedModel(scope)(jumpNode({ model_id: "3" }) as any);

    expect(scope.showGlobalMessage).toHaveBeenCalledTimes(1);
    expect(scope.showGlobalMessage.mock.calls[0][0]).toContain("找到多个dc-model模型 idx=3");
    expect(scope.requestLoadSavedProject).toHaveBeenCalledTimes(0);
    expect(scope.writeOperationLog).toHaveBeenCalledTimes(0);
  });

  test("L65 唯一命中：加载第一个方案（与上一条构成 >1 的两侧对照）", () => {
    const schemes = [schemeWithProject("S1", 3, "直流模型甲"), schemeWithProject("S2", 9, "别的模型")];
    const scope = makeScope({ schemes });

    createJumpToAssociatedModel(scope)(jumpNode({ model_id: "3" }) as any);

    expect(scope.showGlobalMessage).toHaveBeenCalledTimes(0);
    expect(scope.requestLoadSavedProject).toHaveBeenCalledTimes(1);
    expect(scope.requestLoadSavedProject.mock.calls[0][1]).toBe("S1");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 9. createOpenNodeDoubleClickEditor —— 双击编辑器的四道早退闸门
// （L88 非编辑/非活动层、L94 关闭抑制期、L118 image 早退）
// 这三条都在 `export` 出来的工厂返回的闭包里，全部依赖经 `__appScope` 注入，
// **不需要挂载组件、不需要 React 元素树**，因此断言直接落在
// setNodeDoubleClickDialog / setImageTarget / setNodeDoubleClickDraft 的实参与
// nodeDoubleClickOpenGuardRef.current 这个守卫写入上。
//
// 判别输入：
// - L88 的 `!isEditMode || !activeLayerNodeIdSet.has(node.id)` 两个操作数**各断一条**。
//   只断一个的话，把 `||` 换成 `&&` 后另一个操作数仍为真 ⇒ 恒绿。
// - L94 的抑制期：ref 填 Number.MAX_SAFE_INTEGER（performance.now() 远小于它），
//   对照侧填 0。喂「等于 now」无效 —— `<` 与 `<=` 在那种输入上无法区分。
// - L118 的 editorKind === "image"：断言**两次 setImageTarget 调用的完整实参序列**
//   （先 L115 的 null，再 L119 的 {kind:"node"}）。只断「被调用过一次」的话，
//   非 image 分支也满足 ⇒ 恒绿。
//
// ⚠ L98/L104 的「`===` 翻成 `!==`」是**劣质 RED**（§6.14）：`&&` 右侧会因此被求值，
//   而 `nodeDoubleClickOpenGuardRef.current` / `nodeDoubleClickDialog` 在多数用例里是 null
//   ⇒ 报 `TypeError: Cannot read properties of null (reading 'time'/'nodeId')`，
//   判别力低（任何字段缺失都产出同一个 TypeError）。这两条改用形态 2（把右操作数
//   换成哨兵 `""`），拿到的是指名契约的 AssertionError。勿改回形态 3。
// ─────────────────────────────────────────────────────────────────────────────
describe("createOpenNodeDoubleClickEditor", () => {
  const makeScope = (over: Record<string, any> = {}) => {
    const scope: Record<string, any> = {
      NODE_DOUBLE_CLICK_DIALOG_DEDUPE_MS: 300,
      activeLayerNodeIdSet: new Set(["n1"]),
      cloneNodeForDoubleClickDraft: (node: any) => ({ ...node }),
      doubleClickDialogKindForNode: vi.fn(() => "text"),
      flattenSavedSchemes: (schemes: any) => schemes,
      flushSync: (fn: () => void) => fn(),
      isBrowseMode: false,
      isEditMode: true,
      modelAssociationModelTypeForKind: vi.fn(() => ""),
      nodeDoubleClickCloseSuppressUntilRef: { current: 0 },
      nodeDoubleClickDialog: null,
      nodeDoubleClickOpenGuardRef: { current: null },
      requestLoadSavedProject: vi.fn(),
      schemes: [],
      selectCanvasGraphics: vi.fn(),
      setContextMenu: vi.fn(),
      setImageTarget: vi.fn(),
      setNodeDoubleClickDialog: vi.fn(),
      setNodeDoubleClickDraft: vi.fn(),
      showGlobalMessage: vi.fn(),
      writeOperationLog: vi.fn(),
      ...over
    };
    return scope;
  };

  const editNode = { id: "n1", kind: "static-text", name: "文字按钮" };

  test("L88 非编辑模式：连闸门后的选择动作都不发生", () => {
    const scope = makeScope({ isEditMode: false });

    createOpenNodeDoubleClickEditor(scope)(editNode as any);

    expect(scope.selectCanvasGraphics).toHaveBeenCalledTimes(0);
    expect(scope.setNodeDoubleClickDialog).toHaveBeenCalledTimes(0);
    // 守卫 ref 没被写 ⇒ 后续的双击仍然可以打开弹窗
    expect(scope.nodeDoubleClickOpenGuardRef.current).toBe(null);
  });

  test("L88 编辑模式但图元不在活动层集合里：同样早退", () => {
    const scope = makeScope({ activeLayerNodeIdSet: new Set(["other"]) });

    createOpenNodeDoubleClickEditor(scope)(editNode as any);

    expect(scope.selectCanvasGraphics).toHaveBeenCalledTimes(0);
    expect(scope.setNodeDoubleClickDialog).toHaveBeenCalledTimes(0);
    expect(scope.nodeDoubleClickOpenGuardRef.current).toBe(null);
  });

  test("L94 关闭抑制期未过：不打开弹窗，也不消费这次双击", () => {
    // performance.now() 是「进程启动以来的毫秒」，恒远小于 MAX_SAFE_INTEGER
    const scope = makeScope({ nodeDoubleClickCloseSuppressUntilRef: { current: Number.MAX_SAFE_INTEGER } });

    createOpenNodeDoubleClickEditor(scope)(editNode as any);

    expect(scope.setNodeDoubleClickDialog).toHaveBeenCalledTimes(0);
    expect(scope.setNodeDoubleClickDraft).toHaveBeenCalledTimes(0);
    expect(scope.selectCanvasGraphics).toHaveBeenCalledTimes(0);
    // 抑制期早退发生在守卫 ref 写入之前 ⇒ 这次双击不占去重槽
    expect(scope.nodeDoubleClickOpenGuardRef.current).toBe(null);
  });

  test("L94 抑制期已过：正常打开 text 弹窗（与上一条构成 now < ref 的两侧对照）", () => {
    const scope = makeScope({ nodeDoubleClickCloseSuppressUntilRef: { current: 0 } });

    createOpenNodeDoubleClickEditor(scope)(editNode as any);

    expect(scope.setNodeDoubleClickDialog).toHaveBeenCalledTimes(2);
    expect(scope.setNodeDoubleClickDialog.mock.calls).toEqual([
      [null],
      [{ kind: "text", nodeId: "n1" }]
    ]);
    expect(scope.nodeDoubleClickOpenGuardRef.current).toEqual({ key: "n1:text", time: expect.any(Number) });
  });

  test("L118 editorKind 为 image：只设 imageTarget，不开弹窗也不建草稿", () => {
    const scope = makeScope({ doubleClickDialogKindForNode: vi.fn(() => "image") });

    createOpenNodeDoubleClickEditor(scope)(editNode as any);

    // 断言**完整调用序列**：L115 的 null 之后必须是 L119 的 { kind:"node", nodeId }
    expect(scope.setImageTarget.mock.calls).toEqual([[null], [{ kind: "node", nodeId: "n1" }]]);
    expect(scope.setNodeDoubleClickDialog.mock.calls).toEqual([[null]]);
    // image 分支在 L120 自带 return ⇒ 草稿只被 L117 清成 null，从未被写入
    expect(scope.setNodeDoubleClickDraft.mock.calls).toEqual([[null]]);
    expect(scope.selectCanvasGraphics).toHaveBeenCalledWith(["n1"], []);
    // image 分支自带 return ⇒ 不会掉到 L127 的「当前图元没有双击定义」
    expect(scope.showGlobalMessage).toHaveBeenCalledTimes(0);
  });

  test("L118 非 image：setImageTarget 只有 L115 的那一次 null（两侧对照）", () => {
    const scope = makeScope();

    createOpenNodeDoubleClickEditor(scope)(editNode as any);

    expect(scope.setImageTarget.mock.calls).toEqual([[null]]);
    expect(scope.setNodeDoubleClickDialog.mock.calls).toEqual([
      [null],
      [{ kind: "text", nodeId: "n1" }]
    ]);
  });

  test("未定义双击类型的图元：走末尾提示，两处 setter 都不写对象", () => {
    const scope = makeScope({ doubleClickDialogKindForNode: vi.fn(() => "none") });

    createOpenNodeDoubleClickEditor(scope)(editNode as any);

    expect(scope.showGlobalMessage).toHaveBeenCalledWith("当前图元没有双击定义。");
    expect(scope.setNodeDoubleClickDialog.mock.calls).toEqual([[null]]);
    expect(scope.setNodeDoubleClickDraft.mock.calls).toEqual([[null]]);
    // 守卫 ref 已写入 ⇒ 紧接着的重复双击会被去重闸门吃掉
    expect(scope.nodeDoubleClickOpenGuardRef.current).toEqual({ key: "n1:none", time: expect.any(Number) });
  });

  test("L104/L106 同 kind 同 nodeId 的弹窗已经开着：只补记去重 ref，不重开", () => {
    // 两侧都在 true 才进入该 if：kind 相等 ∧ nodeId 相等。
    // 少造一个条件的话，另一侧根本走不到 —— 这里两边都造。
    const scope = makeScope({ nodeDoubleClickDialog: { kind: "text", nodeId: "n1" } });

    createOpenNodeDoubleClickEditor(scope)(editNode as any);

    expect(scope.selectCanvasGraphics).toHaveBeenCalledTimes(0);
    expect(scope.setImageTarget).toHaveBeenCalledTimes(0);
    expect(scope.setNodeDoubleClickDialog).toHaveBeenCalledTimes(0);
    expect(scope.setNodeDoubleClickDraft).toHaveBeenCalledTimes(0);
    // L107 仍写去重 ref —— 这是本分支与 L88/L94 早退唯一的可观测差别
    expect(scope.nodeDoubleClickOpenGuardRef.current).toEqual({ key: "n1:text", time: expect.any(Number) });
  });

  test("L104/L106 kind 相同但 nodeId 不同（换了个图元）：照常重开弹窗", () => {
    const scope = makeScope({ nodeDoubleClickDialog: { kind: "text", nodeId: "n2" } });

    createOpenNodeDoubleClickEditor(scope)(editNode as any);

    expect(scope.setNodeDoubleClickDialog.mock.calls).toEqual([
      [null],
      [{ kind: "text", nodeId: "n1" }]
    ]);
  });

  test("L98/L100 去重窗口内的同一次双击：原样保留 ref 的旧时间戳，不开弹窗", () => {
    // guardKey = `${node.id}:${editorKind}` = "n1:text"；时间差取 0ms，必 < DEDUPE_MS(300)。
    // 断言的是 **ref 没被覆写**（旧 time 逐字保留）—— 若去重闸门被删，time 会被换成新的 now。
    const openedAt = performance.now();
    const scope = makeScope({ nodeDoubleClickOpenGuardRef: { current: { key: "n1:text", time: openedAt } } });

    createOpenNodeDoubleClickEditor(scope)(editNode as any);

    expect(scope.nodeDoubleClickOpenGuardRef.current).toEqual({ key: "n1:text", time: openedAt });
    expect(scope.selectCanvasGraphics).toHaveBeenCalledTimes(0);
    expect(scope.setNodeDoubleClickDialog).toHaveBeenCalledTimes(0);
    expect(scope.setNodeDoubleClickDraft).toHaveBeenCalledTimes(0);
  });

  test("L98/L100 key 不同（同一图元换了编辑器类型）：不算重复，正常开弹窗", () => {
    const openedAt = performance.now();
    const scope = makeScope({ nodeDoubleClickOpenGuardRef: { current: { key: "n1:image", time: openedAt } } });

    createOpenNodeDoubleClickEditor(scope)(editNode as any);

    expect(scope.setNodeDoubleClickDialog.mock.calls).toEqual([
      [null],
      [{ kind: "text", nodeId: "n1" }]
    ]);
    // ref 已被换成新的 key
    expect(scope.nodeDoubleClickOpenGuardRef.current!.key).toBe("n1:text");
  });

  test("L92 没有 performance 全局时改用 Date.now()：去重 ref 里记的是墙上时钟", () => {
    // node 环境下 performance 恒存在，所以这条只能靠 stubGlobal 打掉。
    // 断言落在 ref 上记录的 time：Date.now() ≈ 1.7e12，performance.now() 是进程启动以来的小值，
    // 两者差 6 个数量级 —— 若左臂被跳过，断言立刻转红。
    const scope = makeScope();
    vi.stubGlobal("performance", undefined);
    try {
      createOpenNodeDoubleClickEditor(scope)(editNode as any);
    } finally {
      vi.unstubAllGlobals();
    }
    expect(scope.nodeDoubleClickOpenGuardRef.current!.time).toBeGreaterThan(1_000_000_000_000);
    expect(scope.setNodeDoubleClickDialog.mock.calls).toEqual([
      [null],
      [{ kind: "text", nodeId: "n1" }]
    ]);
  });

  test("L92 performance 存在时走 performance.now()：与上一条构成时间源两侧对照", () => {
    const scope = makeScope();

    createOpenNodeDoubleClickEditor(scope)(editNode as any);

    expect(scope.nodeDoubleClickOpenGuardRef.current!.time).toBeLessThan(1_000_000_000_000);
  });
});
