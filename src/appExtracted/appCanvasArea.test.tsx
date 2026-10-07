// appCanvasArea 的 transform 坐标解析守卫，外加本文件四个纯导出的基础用例。
//
// 背景：generatedStateIconVisualTransform 从生成态图标 SVG 的
// `<g transform="translate(x, y)">` 里取偏移量，用 GROUP_TRANSFORM_PATTERN 的捕获组
// 直接 `Number(...)` 再减去 240×160 视图盒的原点 120/80。该正则的捕获组是
// `([-+]?[\d.]+)`，能匹配 "." / ".." / "-." / "1.2.3" 这类畸形串，而
// `Number(".") === NaN` —— 于是 x/y 直接产出 NaN，一路传到
// adjustGeneratedStateIconTerminalStub 写成 SVG 属性 `x1="NaN"`（整条 <line> 丢失，
// React 也会发 "Received NaN for the x1 attribute" 警告）。
// 守卫与本文件 readStateIconSvgNumber（:62）同形态：`Number.isFinite(parsed) ? parsed : fallback`，
// fallback 取这条式子里被减去的同一对常量 120/80 —— 合法坐标输出逐字不变。
//
// 为何要走 SSR 而不是直接测该函数：generatedStateIconVisualTransform 不是导出符号，
// 唯一调用点在 MemoizedCanvasArea 的节点渲染闭包深处。要触达它就得渲染整个画布，
// 但夹具只需覆盖 scope 上那 359 个解构键（下面 baseScope 全部给出），无需 DOM
// 环境（renderToStaticMarkup），也无需渲染器。appCanvasRulers / appTopbar 是本文件
// 直接 import 的子组件（不经 scope），与守卫无关，mock 成空壳即可。
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  adjustGeneratedStateIconTerminalStub,
  areCanvasPropsEqual,
  shouldRenderBaseCanvasEdge,
  singleTerminalPointerPreviewGeometry,
  staticDrawingContextMenuFinalPoint
} from "./appCanvasArea";

vi.mock("./appCanvasRulers", () => ({ CanvasRulers: () => null }));
vi.mock("./appTopbar", () => ({ SelectionActionCluster: () => null }));

const { MemoizedCanvasArea } = await import("./appCanvasArea");

// ===========================================================================
// 夹具：一个节点 + 一份让 renderCanvas 走通的最简 scope
// ===========================================================================

/** 节点尺寸与视图盒同尺寸 ⇒ scale 恰好为 1，下面所有期望值都是整数，好核对。 */
const NODE_SIZE = { width: 240, height: 160 };
/** 视图盒原点（生成态图标把图形摆在 240×160 的正中）。 */
const VIEWBOX_ORIGIN = { x: 120, y: 80 };
/** 固定下来的 stub 与渲染点，让 stub.x/stub.y 只随 transform 变。 */
const STUB_FROM = { x: 46, y: 0 };
const RENDER_POINT = { x: -79, y: 0 };

/** 横向端子改 from.x、纵向端子改 from.y —— 两条轴要分别换端子才观察得到。 */
const HORIZONTAL_ANCHOR = { x: 0.5, y: 0.032 };
const VERTICAL_ANCHOR = { x: 0.032, y: 0.5 };

/**
 * 拼一份平台生成的图标 data URL，<g transform> 用传入的串（可以是畸形串）。
 * innerWidth 只为测「内层 svg 宽高非法」那条用例存在：readStateIconSvgNumber 读的是
 * **内层** <svg> 的 width/height，所以不能靠 replace 全局替换第一个 width="240"
 * （那会改到外层 <svg>，而外层宽度压根没被读）。
 */
function stateIconDataUrl(transform: string, innerWidth = 240) {
  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" data-state-icon-drawing="true" width="240" height="160" viewBox="0 0 240 160">`,
    `<g transform="${transform}">`,
    `<svg x="-120" y="-80" width="${innerWidth}" height="160" data-state-icon-preserve-view-box="true" viewBox="0 0 240 160" preserveAspectRatio="xMidYMid meet" overflow="visible">`,
    `<rect class="bus-glyph" x="-40" y="-4" width="80" height="8"/>`,
    `</svg>`,
    `</g>`,
    `</svg>`
  ].join("");
  return `data:image/svg+xml,${svg}`;
}

/** MemoizedCanvasArea 解构的 359 个 scope 键，取让节点渲染闭环所需的最小子集。 */
function baseScope(anchor: { x: number; y: number }, transform: string) {
  const noop = () => undefined;
  const noopComponent = () => null;
  const emptySet = () => new Set<string>();
  const node = {
    id: "node-1",
    name: "N1",
    kind: "device",
    position: { x: 0, y: 0 },
    size: { ...NODE_SIZE },
    rotation: 0,
    scale: { x: 1, y: 1 },
    params: {},
    terminals: [{ id: "t1", label: "T1", type: "signal", anchor }]
  };
  return {
    // —— 渲染用到的节点数据 ——
    nodeById: new Map([[node.id, node]]),
    detailedViewportNodes: [node],
    nodeImage: () => stateIconDataUrl(transform),
    nodeForegroundImage: () => "",
    nodeGeometryTransform: () => "rotate(0)",
    nodeImageContentTransform: () => "translate(0 0)",
    nodeLabelFontSize: () => 12,
    nodeLabelShouldRender: () => false,
    nodeLabelTransform: () => "translate(0 0)",
    nodeUsesUprightStaticSelectionOutline: () => false,
    nodeUprightSelectionOutlineRect: () => null,
    nodeRotateHandleControlPoints: () => ({ stemStart: { x: 0, y: 0 }, stemEnd: { x: 0, y: 0 }, handle: { x: 0, y: 0 } }),
    nodeScaleHandleControlPoint: () => ({ x: 0, y: 0 }),
    nodeUprightRotateHandleControlPoints: () => ({ stemStart: { x: 0, y: 0 }, stemEnd: { x: 0, y: 0 }, handle: { x: 0, y: 0 } }),
    isBusNode: () => false,
    isLineSegmentBusNode: () => false,
    isStaticNode: () => false,
    isRoutableLineDeviceKind: () => false,
    isStaticButtonEnabledForNode: () => false,
    resolveNodeStateVisual: () => null,
    nodeKindAllowsResizeTransform: () => false,
    getNodeScaleX: () => 1,
    getNodeScaleY: () => 1,
    getTerminalDisplayColor: () => "#123456",
    terminalRenderLocalPoint: () => RENDER_POINT,
    terminalStubSegment: () => ({ from: { ...STUB_FROM }, to: { x: 0, y: 0 } }),
    terminalStubStrokeWidth: () => 2,
    svgStrokeDashArray: () => undefined,
    formatSvgNumber: (value: number) => String(value),
    svgImageContentMarkup: () => "",

    // —— 画布外框 ——
    svgRef: { current: null },
    canvasFrameRef: { current: null },
    canvasInteractionRef: { current: true },
    projectListPointerInsideRef: { current: false },
    lastRawCanvasPointerRef: { current: null },
    lastCanvasPointerRef: { current: null },
    lastCanvasClientPointerRef: { current: null },
    canvasSelectionShortcutActiveRef: { current: false },
    draggingRef: { current: null },
    panningRef: { current: null },
    modifierSelectionPressRef: { current: null },
    lastEdgePointerClickRef: { current: null },
    connectDropHintElementRef: { current: null },
    connectPreviewHandleElementRef: { current: null },
    connectPreviewPathElementRef: { current: null },
    connectPreviewPointRef: { current: null },
    imperativeMultiNodeDragOverlayRef: { current: null },
    imperativeNodeDragDropHintRef: { current: null },
    imperativeSingleNodeDragEdgePreviewRef: { current: null },
    imperativeSingleNodeDragNodeOverlayRef: { current: null },
    staticButtonPointerRef: { current: null },
    contextMarqueeSelectionRef: { current: null },
    canvasResizeHotzonesRef: { current: null },
    canvasDisplayWidth: 800,
    canvasDisplayHeight: 600,
    canvasDisplayOffsetX: 0,
    canvasDisplayOffsetY: 0,
    canvasRenderBounds: { width: 2000, height: 1200 },
    canvasScrollSurfaceWidth: 800,
    canvasScrollSurfaceHeight: 600,
    canvasHorizontalScrollbarsActive: false,
    canvasVerticalScrollbarsActive: false,
    canvasBackgroundColor: "",
    canvasBackgroundImageUrl: "",
    canvasBackgroundImageFit: "contain",
    canvasResizeHandles: null,
    canvasResizePreviewRect: null,
    canvasResizeHotzoneStyle: {},

    // —— 交互状态（全部空）——
    connectSource: null,
    terminalPress: null,
    staticDrawing: null,
    libraryPlacement: null,
    contextMarqueeSelection: null,
    activeDropReady: null,
    panning: false,
    multiNodeDragging: false,
    singleNodeDragging: false,
    isEditMode: false,
    isBrowseMode: false,
    isReadonlyCanvasMode: false,
    mode: "select",
    nodeLabelDrag: null,
    nodeLabelRotateDrag: null,
    manualPathDrag: null,
    transformDrag: null,
    rewiring: null,
    routableLinePlacement: null,
    routableLineEndpointDrag: null,
    marquee: null,
    resizeSizeHint: null,
    dragging: null,
    draggingDelta: null,

    // —— 回调 ——
    isGroupTransformDrag: noop,
    hasCanvasSelectionModifier: () => false,
    isRepeatedEdgePointerClick: () => false,
    handleCanvasPointerDownCapture: noop,
    handlePointerMove: noop,
    handleWheel: noop,
    handleDrop: noop,
    handleNodePointerDown: noop,
    handleLodNodePointerDown: noop,
    handleLodNodeContextMenu: noop,
    handleLodNodeDoubleClick: noop,
    handleStaticButtonClick: noop,
    handleEdgePathPointerDown: noop,
    handleRoutableLineNodePathPointerDown: noop,
    handleTerminalPointerDown: noop,
    handleMinimapNavigate: noop,
    startCanvasPanning: noop,
    startCanvasResize: noop,
    startCanvasResizeFromTopOverlay: () => false,
    startCanvasResizeFromLeftOverlay: () => false,
    startCanvasResizeFromRightOverlay: () => false,
    startCanvasResizeFromBottomOverlay: () => false,
    startGroupMoveDrag: noop,
    startGroupTransformDrag: noop,
    startSingleTransformDrag: noop,
    startNodeLabelDrag: noop,
    startNodeLabelRotateDrag: noop,
    startManualPointDrag: noop,
    startManualSegmentDrag: noop,
    startRoutableLineEndpointDrag: noop,
    startRoutableLineFromTerminal: noop,
    startRoutableLinePointDrag: noop,
    startRoutableLineSegmentDrag: noop,
    startModifierSelectionPress: noop,
    finishCanvasPanning: noop,
    finishNodeDrag: noop,
    finishNodeLabelDrag: noop,
    finishNodeLabelRotateDrag: noop,
    finishManualPathDrag: noop,
    finishMarqueeSelection: noop,
    finishMarqueeSelectionFromPoints: noop,
    finishMeasurementDrag: () => false,
    finishModifierSelectionPress: () => false,
    finishRewiring: noop,
    finishRoutableLineEndpointDrag: noop,
    finishRoutableLineToTarget: noop,
    finishTerminalPress: noop,
    finishTransformDrag: noop,
    finishConnectToTarget: noop,
    finishInteractiveStaticDrawing: noop,
    cancelInteractiveStaticDrawing: noop,
    fitWholeCanvasFromBlankDoubleClick: noop,
    selectCanvasGraphics: noop,
    deleteSelection: noop,
    copySelection: noop,
    cutSelection: noop,
    groupSelectedGraphics: noop,
    ungroupSelectedGraphics: noop,
    assignSelectedNodesToModelLayer: noop,
    toggleSelectedNodeLabelDisplay: noop,
    clearLibraryPlacementPreview: noop,
    clearRecordSelection: noop,
    clearStaticButtonFeedback: noop,
    centerSelectedInView: noop,
    fitViewToSelection: noop,
    fitWholeCanvasToFrame: noop,
    zoomViewportAtCenter: noop,
    tidySelectedEdgeRoute: noop,
    shrinkCanvasToFitContent: noop,
    cancelLibraryPlacement: noop,
    cancelModifierSelectionPress: noop,
    setConnectSource: noop,
    setContextMarqueeSelection: noop,
    setContextMenu: noop,
    setMarquee: noop,
    setMinimapVisible: noop,
    setMode: noop,
    setRewiring: noop,
    setRoutableLineEndpointDrag: noop,
    setRoutableLinePlacement: noop,
    queuePendingBlankCanvasDeselect: noop,
    flushPendingBlankCanvasDeselect: noop,
    setStaticButtonFeedback: noop,
    setTerminalPress: noop,
    resetConnectPreviewState: noop,
    resetRoutableLinePreviewState: noop,
    resetViewportZoom: noop,
    applyConnectPreviewState: noop,
    applyRoutableLinePreviewState: noop,
    updateLibraryPlacementPreview: noop,
    updateMouseStatus: noop,
    commitLibraryPlacementAtPoint: noop,
    flushConnectPreviewDom: noop,
    focusCanvasKeyboardShortcutHost: noop,
    consumeGraphicContextMenuHandled: () => false,
    activateInspectorFromCanvas: noop,
    screenToSvgPoint: noop,
    clampPointToCanvas: noop,
    mapPointToMinimap: noop,
    findConnectTargetAtPoint: () => null,
    findConnectionRouteHitAtPoint: () => null,
    findRewireTargetAtPoint: () => null,
    findRoutableLineEndpointTargetAtPoint: () => null,
    getEdgeEndpointPoint: () => null,
    getMovableRouteSegmentIndexes: () => new Set<number>(),
    canConnectTerminals: () => true,
    isCanvasGraphicContextMenuTarget: () => false,
    resolveConnectPreviewPoint: noop,
    resolveRoutableLinePreviewPoint: noop,
    sameOptionalPoint: () => false,
    snapSingleTerminalAnchorToNearestSide: (terminal: any) => terminal.anchor,
    pointsToOrthogonalPath: () => "",
    routableLineDeviceCanvasPoints: () => [],
    routableLineDeviceRenderLocalPoints: () => [],
    appendConnectPreviewManualPoint: () => null,
    appendRoutableLinePreviewManualPoint: () => null,
    appendStaticDrawingPoint: noop,
    insertManualBendFromEdgePath: noop,
    insertManualBendFromPointer: noop,
    deleteManualBendPoint: noop,
    deleteRoutableLineBendPoint: noop,
    scheduleRoutableLinePreviewPoint: noop,
    openAddTemplateDialog: noop,
    openGroupDeviceDefinitionDialog: noop,
    openLayerAssignmentDialog: noop,
    openEdgeContextMenu: noop,
    openGraphicContextMenu: noop,
    openNodeDoubleClickEditor: noop,
    bindCanvasNodeElement: noop,
    jumpToSelectedAssociationNode: noop,
    busEndpointColor: () => "#000",
    scaleHandleCursorClass: () => "",

    // —— 其余渲染工厂（与本守卫无关，全部返回空）——
    renderViewportRoutedEdges: [],
    renderBoundaryBusInternalConnector: noopComponent,
    renderGroupTransformPhotoPreview: noopComponent,
    renderInteractiveStaticDrawingPreview: noopComponent,
    renderLibraryPlacementPreview: noopComponent,
    renderMeasurementGroup: noopComponent,
    buildMeasurementGroupsMarkup: () => "",
    renderMultiNodeDragOverlay: noopComponent,
    renderNodePreviewImageContent: noopComponent,
    renderReadonlyBackgroundPage: noopComponent,
    renderSingleTransformRotateOriginGhost: noopComponent,
    renderTransformRotationTrajectory: noopComponent,

    // —— LOD / 选中 / 图层 / 拖影 ——
    useSimplifiedCanvasNodes: false,
    useSimplifiedCanvasRoutes: false,
    useSimplifiedSelectedCanvasNodes: false,
    canGroupSelectedGraphics: false,
    canUngroupSelectedGraphics: false,
    canAddTemplateFromSelection: false,
    edgeById: new Map(),
    connectionLineStyle: () => ({}),
    initialCanvasDetailedEdgeIdSet: emptySet(),
    detailedSelectedEdgeIdSet: emptySet(),
    selectedRoutableLineManualPathRoute: null,
    selectedRoutedEdge: null,
    terminalPressPreviewEdgeIdSet: emptySet(),
    terminalPressPreviewEdgeRoutes: [],
    connectPreviewDom: { path: "", targetPoint: null },
    connectPreviewColor: "",
    routableLinePreview: { path: "", manualPoints: [] },
    routableLinePlacementColor: "",
    routableLineEndpointDragPreviewRoute: null,
    rewiringPreviewRoute: null,
    manualPathPreviewRoute: null,
    selectedNodeId: null,
    selectedNodeIdSet: emptySet(),
    selectedEdge: null,
    selectedNodeCount: 0,
    selectedTransformGroupUnit: null,
    visibleSelectedGroupLayoutUnits: [],
    selectedViewportActionDisabled: true,
    selectionRectCenter: { x: 0, y: 0 },
    activeLayer: null,
    activeLayerId: "",
    activeLayerEdgeIdSet: emptySet(),
    activeLayerNodeIdSet: emptySet(),
    activeSelectedEdgeSet: emptySet(),
    activeDropHintPoint: null,
    activeDropHintStyle: {},
    lodCanvasNodeChunks: [],
    lodCanvasRouteChunks: [],
    lodSelectedNodeMarkup: "",
    minimapVisible: false,
    minimapNodes: [],
    minimapRoutes: [],
    minimapContentWidth: 2000,
    minimapContentHeight: 1200,
    minimapOffsetX: 0,
    minimapOffsetY: 0,
    minimapScale: 0.1,
    minimapViewportLeft: 0,
    minimapViewportRight: 800,
    minimapViewportTop: 0,
    minimapViewportBottom: 600,
    nodeFloatingToolbar: null,
    edgeFloatingToolbar: null,
    floatingToolbarIconSize: 16,
    floatingToolbarWrapperStyle: () => ({}),
    selectedAssociationJumpNode: null,
    colorDisplayMode: "energy",
    colorPalette: {},
    deviceLabelsVisible: false,
    deviceMeasurementsVisible: false,
    overlappedTerminalKeys: emptySet(),
    visibleMeasurementGroups: [],
    smartAlignmentGuides: [],
    draggingNodeIdSet: emptySet(),
    dragAffectedEdgeIdSet: emptySet(),
    dragGhostEdgeIdSet: emptySet(),
    dragGhostEdgeRoutes: [],
    dragGhostRoutableLineNodeIdSet: emptySet(),
    dragOverlayEdgeIdSet: emptySet(),
    dragPreviewEdgeIdSet: emptySet(),
    dragPreviewEdgeRoutes: [],
    connectTerminalCompatibilityActive: false,
    connectSourceNode: null,
    connectTargetPoint: noop,
    connectTargetSnapPoint: noop,
    routableLineTerminalCompatibilityActive: false,
    routableLineActiveTerminalType: "",
    groupTransformPreviewGroupId: null,
    groupTransformPreviewEdgeIdSet: emptySet(),
    groupTransformPreviewNodeIdSet: emptySet(),
    groupTransformPreviewRoutableLineNodeIdSet: emptySet(),
    staticButtonVisual: null,

    // —— 视口浮层 / 常量 ——
    viewportOverlayStyle: {},
    CANVAS_MINIMAP_WIDTH: 200,
    CANVAS_MINIMAP_HEIGHT: 140,
    DEFAULT_CANVAS_BACKGROUND: "#ffffff",
    TRANSFORM_ROTATE_STEM_START: 24,
    TRANSFORM_ROTATE_STEM_END: 44,
    TRANSFORM_ROTATE_HANDLE_GAP: 26,
    SCALE_HANDLE_CONFIGS: [],
    GROUP_SCALE_HANDLE_CONFIGS: [],
    centerSelectedViewportTitle: "",
    fitSelectedViewportTitle: "",
    routableLineEndpointHandles: [],
    routableLineEndpointDragColor: "",

    // —— 图标组件（全部换空壳）——
    Copy: noopComponent,
    Grid2X2: noopComponent,
    Group: noopComponent,
    Layers: noopComponent,
    Layers2: noopComponent,
    LocateFixed: noopComponent,
    MapIcon: noopComponent,
    Maximize2: noopComponent,
    MemoDeviceGlyph: noopComponent,
    Minus: noopComponent,
    Plus: noopComponent,
    RotateCcw: noopComponent,
    Route: noopComponent,
    ArrowUpRight: noopComponent,
    ScanSearch: noopComponent,
    Scissors: noopComponent,
    Shrink: noopComponent,
    Trash2: noopComponent,
    Type: noopComponent,
    Ungroup: noopComponent,
    SvgMarkupChunk: noopComponent
  } as Record<string, any>;
}

/**
 * 取 <line class="terminal-stub …"> 的起止点。
 * 它是 terminalVisualTransform 的下游产物：横向端子只带出 from.x、纵向端子只带出 from.y，
 * 另一条轴恒为 0 —— 所以测 X 必须用横向端子、测 Y 必须用纵向端子，
 * 否则断言恒绿（stub.x 从来没被 transform 的 y 影响过，反之亦然）。
 */
function terminalStubLine(transform: string, anchor: { x: number; y: number }) {
  const html = renderToStaticMarkup(<MemoizedCanvasArea scope={baseScope(anchor, transform)}/>);
  const match = /<line[^>]*class="terminal-stub[^>]*>/.exec(html);
  if (!match) throw new Error("夹具没渲染出 terminal-stub —— 节点渲染分支没走到");
  const attr = (name: string) => {
    const found = new RegExp(`${name}="([^"]*)"`).exec(match[0]);
    return found ? found[1] : null;
  };
  return { html, x1: attr("x1"), y1: attr("y1"), x2: attr("x2"), y2: attr("y2") };
}

/** 横向端子上的 stub —— from.x 承载了 transform 的 x 偏移。 */
const stubXFor = (transform: string) => terminalStubLine(transform, HORIZONTAL_ANCHOR).x1;
/** 纵向端子上的 stub —— from.y 承载了 transform 的 y 偏移。 */
const stubYFor = (transform: string) => terminalStubLine(transform, VERTICAL_ANCHOR).y1;

// ===========================================================================
// 守卫：transform 坐标解析的有限性
// ===========================================================================

describe("generatedStateIconVisualTransform 的 transform 坐标解析", () => {
  it("夹具确实触达了被守卫的那两行（不是恒绿的死路径）", () => {
    // 三条同时成立才算触达：
    //   ① 图标被认出来了 —— 有 terminal-stub 被渲染出来（抛错即失败）
    //   ② transform 生效了 —— 偏移量确实改写了 stub
    //   ③ 夹具没把它压成常量 —— 同一夹具下换 transform 能拿到不同结果
    //
    // 夹具几何（renderPoint.x=-79、stub.from=(46,0)、scale=1、rotation=0）：
    //   横向端子 basePoint.x = -79 + 46 = -33；visualPoint.x = vt.x + (-33) = (tx-120) - 33
    //     ⇒ from.x = visualPoint.x - (-79) = (tx-120) + 46
    //   纵向端子 basePoint.y = 0；visualPoint.y = (ty-80)
    //     ⇒ from.y = (ty-80) - 0 = (ty-80) *（+1，scaleY=1 时 Math.sign 不翻符号）
    // 两条轴的系数都是 1（节点尺寸恰好等于 240×160 视图盒），故期望值都是整数。
    expect(stubXFor(`translate(140, 80)`)).toBe("66"); // (140-120) + 46
    expect(stubXFor(`translate(160, 80)`)).toBe("86"); // (160-120) + 46
    expect(stubYFor(`translate(120, 100)`)).toBe("20"); // (100-80)
    expect(stubYFor(`translate(120, 120)`)).toBe("40"); // (120-80)
  });

  it("畸形 translate 串不再产出 NaN 坐标（守卫前的对照值是 NaN）", () => {
    // ↓ 本文件的核心断言。守卫形态是 `Number.isFinite(parsed) ? parsed : fallback`，
    //   fallback = 被减去的同一对常量（120/80），于是畸形串等价于
    //   `translate(120, 80)` —— 即「图形仍在视图盒原点」，而不是「偏移量变成 NaN」。
    //   把守卫的 Number.isFinite 换回裸 Number(...) 立刻转红：这些值会变成 "NaN"，
    //   React 还会发 "Received NaN for the x1 attribute" 警告。
    const malformed = [
      `translate(., 80)`, // 单个小数点
      `translate(.., 80)`, // 两个点
      `translate(-., 80)`, // 带符号
      `translate(1.2.3, 80)`, // 多段小数
      `translate(., .)`, // 两轴都畸形
      `translate(+, 80)` // 正号后无数字
    ];
    for (const transform of malformed) {
      expect(stubXFor(transform), `x 轴：${transform}`).toBe(stubXFor(`translate(120, 80)`));
      expect(terminalStubLine(transform, HORIZONTAL_ANCHOR).html, `渲染结果无 NaN：${transform}`).not.toContain("NaN");
    }
    for (const transform of [`translate(120, .)`, `translate(120, ..)`, `translate(120, -.)`, `translate(120, 9.9.9)`]) {
      expect(stubYFor(transform), `y 轴：${transform}`).toBe(stubYFor(`translate(120, 80)`));
      expect(terminalStubLine(transform, VERTICAL_ANCHOR).html, `渲染结果无 NaN：${transform}`).not.toContain("NaN");
    }
  });

  it("合法坐标逐字透传（守卫没有改业务语义）", () => {
    // 期望值不是抄来的，是从夹具常数算出来的：
    //   横向端子 stub.from.x = (tx-120)*系数 + STUB_FROM.x(46)，系数 = 240/240 = 1
    //   纵向端子 stub.from.y = (ty-80)*系数 *（+1，scaleY=1 时 Math.sign 不翻符号），系数 = 160/160 = 1
    // 覆盖小数、省略号写法、负号、逗号/空格两种分隔符、以及可选的 rotate。
    expect(stubXFor(`translate(120, 80)`)).toBe("46"); // 原点 → 无偏移
    expect(stubXFor(`translate(140, 80)`)).toBe("66");
    expect(stubXFor(`translate(100, 80)`)).toBe("26"); // 负偏移
    expect(stubXFor(`translate(120.5, 80)`)).toBe("46.5");
    expect(stubXFor(`translate(140,80)`)).toBe("66"); // 无空格分隔
    expect(stubXFor(`translate(+140, 80)`)).toBe("66"); // 显式正号
    expect(stubXFor(`translate(140, 80.)`)).toBe("66"); // 省略小数点尾数是合法数字
    // rotate 会参与 stub 的旋转重算，故 x1 随之变化 —— 但**偏移量本身**（20）不变。
    // rotate(90) 与 rotate(270) 给出同一个 x1：两者把 stub 转到的方向相同（±y 轴），
    // 说明读到的 rotation 确实是这两个值而非被写死成 0（=66）或 180（=132）。
    expect(stubXFor(`translate(140, 80) rotate(90)`)).toBe("99");
    expect(stubXFor(`translate(140, 80) rotate(270)`)).toBe("99");
    expect(stubXFor(`translate(140, 80) rotate(180)`)).toBe("132");
    // 对照：rotate 缺失时走的是 rotation=0 那条路
    expect(stubXFor(`translate(140, 80)`)).toBe("66");
    expect(stubYFor(`translate(120, 80)`)).toBe("0"); // 原点 → 无偏移
    expect(stubYFor(`translate(120, 100)`)).toBe("20");
    expect(stubYFor(`translate(120, 60)`)).toBe("-20"); // 负偏移
    expect(stubYFor(`translate(120, -80)`)).toBe("-160"); // (0-80)*1
    expect(stubYFor(`translate(120, 80.5)`)).toBe("0.5");
  });

  it("正则根本没匹配的畸形串走的是另一条路（返回 null），与上面不是同一分支", () => {
    // 这两种串连 `([-+]?[\d.]+)` 都凑不齐：捕获组至少要一个字符，`[-+]?` 后面必须有数字或点。
    // 于是 GROUP_TRANSFORM_PATTERN.exec 返回 null ⇒ 走 continue ⇒ 整个函数返回 null ⇒
    // adjustGeneratedStateIconTerminalStub 原样返回 stub。也就是说它们**从来没有**产出过 NaN，
    // 别把它们和上面那组混为一谈（那组是「匹配上了但 Number() 解析不出来」）。
    const unmatched = [`translate(120, -)`, `translate(-, 80)`, `translate( 120, 80)`];
    for (const transform of unmatched) {
      const line = terminalStubLine(transform, HORIZONTAL_ANCHOR);
      expect(line.html, `${transform} 不该产出 NaN`).not.toContain("NaN");
      // terminalVisualTransform = null ⇒ adjustGeneratedStateIconTerminalStub 的
      // `if (!terminalVisualTransform) return stub` 早退 ⇒ 渲染出的是未加工的 stub。
      // 期望值 = renderPoint.x(-79) + stub.from.x(46) = -33… 实际属性 x1 是 stub.from.x 本身。
      // 用「与 translate(120, 80) 那条完全相等」来断言，避免手算这条路径的中间量。
      expect(line.x1, `无 transform 时与 translate(120, 80) 同值：${transform}`)
        .toBe(terminalStubLine(`translate(120, 80)`, HORIZONTAL_ANCHOR).x1);
    }
  });

  it("内层 svg 宽高非法时整组 transform 一并放弃（x/y 守卫不参与）", () => {
    // width/height 走 readStateIconSvgNumber(:62)，非正即 continue —— 早于 x/y 解析。
    // 放在这里是为了钉住两条守卫的先后：不是「宽高兜底了、坐标也兜底了」的混合体。
    const legal = terminalStubLine(`translate(140, 80)`, HORIZONTAL_ANCHOR);
    expect(legal.x1).toBe("66");

    // 零宽（改的是**内层** <svg> 的 width）：readStateIconSvgNumber 拿到 0
    //      ⇒ width <= 0 ⇒ continue ⇒ terminalVisualTransform = null
    //      ⇒ 端子照常渲染，但不再套用视觉变换
    const zeroWidthScope = baseScope(HORIZONTAL_ANCHOR, `translate(140, 80)`);
    zeroWidthScope.nodeImage = () => stateIconDataUrl(`translate(140, 80)`, 0);
    const zeroWidthHtml = renderToStaticMarkup(<MemoizedCanvasArea scope={zeroWidthScope}/>);
    expect(zeroWidthHtml).toContain("terminal-stub");
    expect(zeroWidthHtml).not.toContain("NaN");
    // 偏移量 20 被整组放弃 ⇒ x1 回到「无视觉变换」的值
    const noTransformX1 = terminalStubLine(`translate(120, 80)`, HORIZONTAL_ANCHOR).x1;
    const zeroWidthX1 = /<line[^>]*class="terminal-stub[^>]*>/.exec(zeroWidthHtml)?.[0].match(/x1="([^"]*)"/)?.[1];
    expect(zeroWidthX1).toBe(noTransformX1);
    expect(zeroWidthX1).not.toBe(legal.x1);
  });
});

// ===========================================================================
// 本文件其余四个纯导出的基础用例
// ===========================================================================

describe("adjustGeneratedStateIconTerminalStub", () => {
  const TERMINAL = { anchor: { x: 0.5, y: 0.032 } };
  const STUB = { from: { x: 46, y: 0 }, to: { x: 0, y: 0 } };

  it("没有视觉变换时原样返回同一个 stub", () => {
    // 返回值与入参同一引用：调用点（:1263）不依赖拷贝，直接用返回值渲染 x1/x2。
    expect(adjustGeneratedStateIconTerminalStub(TERMINAL, { x: 0, y: 0 }, STUB, 1, 1, null)).toBe(STUB);
  });

  it("节点缩放为 0 时按 1 处理，而不是产出 NaN / Infinity", () => {
    // ← 承重断言。safeScaleX 的兜底方向是「0 → 1」；若把兜底删掉，
    //   inverseScaleX = 1/0 = Infinity，最终 from.x 被 `* safeScaleX`(= 0) 抹成 0。
    //   所以这里必须断言**真实偏移量**而不是 0 —— 两者的区别正是这条守卫。
    const scaled = adjustGeneratedStateIconTerminalStub(
      TERMINAL,
      { x: 0, y: 0 },
      STUB,
      1,
      1,
      { x: 10, y: 0, scale: 1, rotation: 0 }
    );
    const zeroScaled = adjustGeneratedStateIconTerminalStub(
      TERMINAL,
      { x: 0, y: 0 },
      STUB,
      0,
      0,
      { x: 10, y: 0, scale: 1, rotation: 0 }
    );
    expect(scaled.from.x).toBe(56); // 10 + 46
    expect(zeroScaled.from.x).toBe(56); // 缩放 0 等同于缩放 1
    expect(Number.isFinite(zeroScaled.from.x)).toBe(true);
    expect(zeroScaled.from.y).toBe(0);
  });

  it("视觉变换原点的偏移直接加在 stub 的终点侧（横向轴走 from.x）", () => {
    // 视觉点 = 视觉原点 + stub.from（rotation=0、scale=1 时），from.x = (视觉点.x - 渲染点.x) * 缩放。
    // 视觉原点 x=10、渲染点 x=0 ⇒ from.x = (10 + 46 - 0) * 1 = 56。
    const shifted = adjustGeneratedStateIconTerminalStub(
      { anchor: { x: 0.5, y: 0.032 } },
      { x: 0, y: 0 },
      STUB,
      1,
      1,
      { x: 10, y: 0, scale: 1, rotation: 0 }
    );
    expect(shifted.from).toEqual({ x: 56, y: 0 });
    // 负缩放把这一项整体翻符号：-125 不成立，实际是 (10 + 46 - 0) * (-1) = -56
    const mirrored = adjustGeneratedStateIconTerminalStub(
      { anchor: { x: 0.5, y: 0.032 } },
      { x: 0, y: 0 },
      STUB,
      -1,
      1,
      { x: 10, y: 0, scale: 1, rotation: 0 }
    );
    // 负缩放先进 basePoint（46 / -1 = -46），视觉点.x = 10 + (-46) = -36，
    // 最后再乘一次 -1 翻回来：(0 - 0) 处得到 (10 - 46) * (-1) = 36 —— 与上面 +56 相差 20，
    // 差的正是视觉原点的偏移量。两次负号不是互相抵消，而是都作用在各自的环节上。
    expect(mirrored.from.x).toBe(36);
    expect(mirrored.from.y).toBe(0);
  });

  it("视觉原点 x=0 时 from.x 退化成 stub.from.x（负缩放也不改变）", () => {
    // vt.x=0、rp.x=-79、sx=-1、rot=0、scale=1：
    //   basePoint.x = -79 + 46/(-1) = -125
    //   visualPoint.x = 0 + (-125) = -125
    //   from.x = (-125 - (-79)) * (-1) = 46
    // 视觉原点与渲染点各自进 basePoint 再各减一次，所以这里恰好回到 stub 起点。
    // 钉住这一点是为了防止有人把 basePoint 的 inverseScaleX 当成无用项删掉 ——
    // 一旦删掉，from.x 会变成 125 而非 46。
    const adjusted = adjustGeneratedStateIconTerminalStub(
      { anchor: { x: 0.5, y: 0.032 } },
      { x: -79, y: 0 },
      STUB,
      -1,
      1,
      { x: 0, y: 0, scale: 1, rotation: 0 }
    );
    expect(adjusted.from).toEqual({ x: 46, y: 0 });
  });

  it("纵向锚点走 from.y 那半边（横向 from.x 原样透传）", () => {
    // |anchor.x| < |anchor.y| ⇒ 走 `from.y = (视觉点.y - 渲染点.y) * 缩放`，from.x 不被改写。
    // 只测横向会漏掉这一半 —— 用 from.y 非零的 stub 才观察得到（from.y 恒为 0 时看不出差别）。
    const VERTICAL_STUB = { from: { x: 0, y: 30 }, to: { x: 0, y: 0 } };
    const TERMINAL = { anchor: { x: 0.032, y: 0.5 } };

    const shifted = adjustGeneratedStateIconTerminalStub(
      TERMINAL,
      { x: 0, y: 0 },
      VERTICAL_STUB,
      1,
      1,
      { x: 0, y: 10, scale: 1, rotation: 0 }
    );
    expect(shifted.from).toEqual({ x: 0, y: 40 }); // (10 + 30 - 0) * 1

    // 视觉缩放作用在整条视觉位置上（视觉原点与旋转后的 stub 一起缩放）：
    //   basePoint.y = 0 + 30/1 = 30；visualPoint.y = 10 + 30*2 = 70；from.y = 70 - 0 = 70
    const scaled = adjustGeneratedStateIconTerminalStub(
      TERMINAL,
      { x: 0, y: 0 },
      VERTICAL_STUB,
      1,
      1,
      { x: 0, y: 10, scale: 2, rotation: 0 }
    );
    expect(scaled.from).toEqual({ x: 0, y: 70 });

    // stub.from.y 为 0 时只剩视觉原点：10 + 0*2 = 10（视觉原点不被 scale 乘，这是承重处）
    const noStub = adjustGeneratedStateIconTerminalStub(
      TERMINAL,
      { x: 0, y: 0 },
      { from: { x: 0, y: 0 }, to: { x: 0, y: 0 } },
      1,
      1,
      { x: 0, y: 10, scale: 2, rotation: 0 }
    );
    expect(noStub.from).toEqual({ x: 0, y: 10 });
  });

  it("锚点符号与缩放符号不叠加（Math.sign 只保留方向）", () => {
    // 锚点 y=-0.5 与缩放 sy=-1 给出同一个结果 —— displayedAnchor 用 Math.sign 归一过方向，
    // 所以锚点的负号不会把翻转再翻一次。
    const VERTICAL_STUB = { from: { x: 0, y: 30 }, to: { x: 0, y: 0 } };
    const positiveAnchor = adjustGeneratedStateIconTerminalStub(
      { anchor: { x: 0.032, y: 0.5 } },
      { x: 0, y: 0 },
      VERTICAL_STUB,
      1,
      -1,
      { x: 0, y: 10, scale: 1, rotation: 0 }
    );
    const negativeAnchor = adjustGeneratedStateIconTerminalStub(
      { anchor: { x: 0.032, y: -0.5 } },
      { x: 0, y: 0 },
      VERTICAL_STUB,
      1,
      -1,
      { x: 0, y: 10, scale: 1, rotation: 0 }
    );
    expect(negativeAnchor.from.y).toBe(positiveAnchor.from.y);
    expect(positiveAnchor.from.y).toBe(20);
  });

  it("rotation 上的 NaN 会被下游兜底吸收（生成端 rotation 的 || 0 是冗余的）", () => {
    // 变异记录：把 `rotation: Number(transformMatch[3] ?? 0) || 0` 里的 `|| 0` 删掉，
    // 本文件**全部 23 条用例仍然绿**。原因是唯一的消费点（:131）自己就有
    // `Number(terminalVisualTransform.rotation) || 0` —— NaN 到那里又被归零。
    // 所以生成端的 `|| 0` 不承重，绿是正确结果，不要为它硬凑断言。
    //
    // 下面把这条冗余显式钉住：NaN rotation 与 rotation=0 走下游得到同一个结果。
    const withNanRotation = adjustGeneratedStateIconTerminalStub(
      { anchor: { x: 0.5, y: 0.032 } },
      { x: -79, y: 0 },
      STUB,
      1,
      1,
      { x: 0, y: 0, scale: 1, rotation: Number.NaN }
    );
    const withZeroRotation = adjustGeneratedStateIconTerminalStub(
      { anchor: { x: 0.5, y: 0.032 } },
      { x: -79, y: 0 },
      STUB,
      1,
      1,
      { x: 0, y: 0, scale: 1, rotation: 0 }
    );
    expect(withNanRotation.from).toEqual(withZeroRotation.from);
    // 上游确实能产出 NaN：`rotate(.)` 会被同一个 `([-+]?[\d.]+)` 捕获组吃掉。
    // 若哪天有人把生成端的 `|| 0` 改成 Number.isFinite 守卫，这条断言仍然成立 ——
    // 因为 :131 的兜底会先一步归零，形状没变。
    expect(Number(Number.NaN) || 0).toBe(0);
  });

  it("rotate 会被真正读进去（旋转 90° 与 0° 给出不同的 from.x）", () => {
    // 若 rotation 被写死成 0，下面两条期望值会相同、其中一条转红。
    const rotated = adjustGeneratedStateIconTerminalStub(
      { anchor: { x: 0.5, y: 0.032 } },
      { x: -79, y: 0 },
      STUB,
      1,
      1,
      { x: 0, y: 0, scale: 1, rotation: 90 }
    );
    const upright = adjustGeneratedStateIconTerminalStub(
      { anchor: { x: 0.5, y: 0.032 } },
      { x: -79, y: 0 },
      STUB,
      1,
      1,
      { x: 0, y: 0, scale: 1, rotation: 0 }
    );
    // 旋转 90°：basePoint = (-79+46, 0+0) = (-33, 0)
    //   visualPoint.x = 0 + (-33*cos90 - 0*sin90) = -33 * 6.1e-17 ≈ 0
    //   from.x = (≈0 - (-79)) * 1 = 79（浮点残差来自 cos(90°)，用 toBeCloseTo 吸收）
    expect(rotated.from.x).toBeCloseTo(79);
    // 未旋转：visualPoint.x = 0 + (-33) = -33 ⇒ from.x = (-33 - (-79)) * 1 = 46
    // 注意这里 46 与「不传变换」的 stub 起点同值，但成因不同（旋转把 basePoint 带偏了 46）。
    expect(upright.from.x).toBe(46);
    expect(rotated.from.x).not.toBe(upright.from.x);
  });
});

describe("singleTerminalPointerPreviewGeometry", () => {
  const base = {
    nodePosition: { x: 100, y: 100 },
    nodeRotation: 0,
    nodeScaleX: 1,
    nodeScaleY: 1,
    pointer: { x: 150, y: 75 },
    terminalRenderPoint: { x: 54, y: 0 },
    stubFrom: { x: -20, y: 0 }
  };

  it("无旋转时指针与机身点都落在节点局部坐标", () => {
    expect(singleTerminalPointerPreviewGeometry(base)).toEqual({
      bodyPoint: { x: 34, y: 0 },
      pointerPoint: { x: 50, y: -25 }
    });
  });

  it("缩放为 0 时按 1 处理（除以 0 会得到 Infinity）", () => {
    // ← 承重断言：兜底是「0 → 1」。删掉后 pointerPoint.x = 50/0 = Infinity。
    const zeroed = singleTerminalPointerPreviewGeometry({ ...base, nodeScaleX: 0, nodeScaleY: 0 });
    expect(zeroed).toEqual({
      bodyPoint: { x: 34, y: 0 },
      pointerPoint: { x: 50, y: -25 }
    });
  });

  it("旋转 90° 时指针先反旋转回局部坐标", () => {
    const rotated = singleTerminalPointerPreviewGeometry({ ...base, nodeRotation: 90 });
    // delta = (50, -25)；绕原点反旋转 90° ⇒ (x·cos + y·sin, -x·sin + y·cos) = (-25, -50)
    expect(rotated.pointerPoint.x).toBeCloseTo(-25);
    expect(rotated.pointerPoint.y).toBeCloseTo(-50);
    // bodyPoint 不受节点旋转影响（它只是端子渲染点加 stub 偏移）
    expect(rotated.bodyPoint).toEqual({ x: 34, y: 0 });
  });

  it("非法的 rotation（NaN / 字符串）归 0，而不是把整个几何带成 NaN", () => {
    for (const nodeRotation of [Number.NaN, "abc" as unknown as number]) {
      const geometry = singleTerminalPointerPreviewGeometry({ ...base, nodeRotation });
      expect(Number.isFinite(geometry.pointerPoint.x), String(nodeRotation)).toBe(true);
      expect(Number.isFinite(geometry.pointerPoint.y), String(nodeRotation)).toBe(true);
      expect(geometry.pointerPoint).toEqual({ x: 50, y: -25 });
    }
  });
});

describe("shouldRenderBaseCanvasEdge", () => {
  it("只有「选中边正被最顶层编辑器接管」时才让出底层那条", () => {
    expect(shouldRenderBaseCanvasEdge("edge-1", "edge-1", true)).toBe(false);
    expect(shouldRenderBaseCanvasEdge("edge-1", "edge-1", false)).toBe(true);
    expect(shouldRenderBaseCanvasEdge("edge-1", "edge-2", true)).toBe(true);
    expect(shouldRenderBaseCanvasEdge("edge-1", null, true)).toBe(true);
  });
});

describe("staticDrawingContextMenuFinalPoint", () => {
  it("至少两个确认点时取最后一个（右键结束折线）", () => {
    const first = { x: 100, y: 120 };
    const last = { x: 180, y: 160 };
    expect(staticDrawingContextMenuFinalPoint({ points: [first, last] })).toBe(last);
  });

  it("不足两个确认点返回 null（调用点据此改为取消绘制）", () => {
    expect(staticDrawingContextMenuFinalPoint({ points: [] })).toBeNull();
    expect(staticDrawingContextMenuFinalPoint({ points: [{ x: 100, y: 120 }] })).toBeNull();
  });
});

describe("areCanvasPropsEqual", () => {
  it("scope 同一引用直接判等（tab 切换的快速路径）", () => {
    const scope = { panning: false };
    expect(areCanvasPropsEqual({ scope }, { scope })).toBe(true);
  });

  it("四组比较键各自都能触发重渲染", () => {
    // 每组各取一个代表键：改它必须返回 false，否则画布会停在旧状态。
    const groups = [
      { key: "terminalPress", value: { nodeId: "n1", terminalId: "t1", moved: true } }, // stateKeys
      { key: "canvasRenderBounds", value: { width: 4000, height: 2400 } }, // displayKeys
      { key: "visibleNodes", value: [{ id: "n1" }] }, // dataKeys
      { key: "leftPanelWidth", value: 320 } // overlayKeys
    ];
    for (const { key, value } of groups) {
      expect(areCanvasPropsEqual({ scope: { [key]: null } }, { scope: { [key]: value } }), key).toBe(false);
    }
  });

  it("未被列入比较的键变化不触发重渲染", () => {
    expect(areCanvasPropsEqual({ scope: { isHoverHint: true } }, { scope: { isHoverHint: false } })).toBe(true);
  });

  it("引用相等与值相等都算未变化", () => {
    const edges = [{ id: "edge-1" }];
    expect(areCanvasPropsEqual({ scope: { visibleEdges: edges } }, { scope: { visibleEdges: edges } })).toBe(true);
    expect(areCanvasPropsEqual({ scope: { visibleEdges: [{ id: "edge-1" }] } }, { scope: { visibleEdges: [{ id: "edge-1" }] } })).toBe(false);
  });
});
