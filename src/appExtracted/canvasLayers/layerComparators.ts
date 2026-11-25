/**
 * 画布分层渲染比较器与最新作用域读取工具
 *
 * 为 `MemoizedCanvasArea` 内部的各个 React.memo 分层提供细粒度 props 比较函数，
 * 将高频瞬态交互（框选、对齐线、连线预览、小地图视口、侧栏拖拽、浮动工具条等）
 * 与重负载主体图元/底图渲染彻底隔离。
 */

export interface CanvasScopeLayerProps {
  scope: Record<string, any>;
}

export interface CanvasStaticBackgroundLayerProps extends CanvasScopeLayerProps {
  electricFlowStyleMarkup: string;
}

export interface CanvasGraphContentLayerProps extends CanvasScopeLayerProps {
  selectedEdgeTopmostVisible: boolean;
  electricFlowLayerMarkup: string;
  electricFlowLineLayerMarkup: string;
}

export interface CanvasTransientOverlayLayerProps extends CanvasScopeLayerProps {
  selectedEdgeTopmostVisible: boolean;
}

/**
 * 读取最新一帧的 __appScope。
 *
 * 当某个 memo 分层跳过重渲染后，其内部 DOM 仍挂载上一帧的事件处理闭包；
 * 交互事件触发时经 `__appScopeRef.current` 取当帧最新回调与状态，彻底避免陈旧闭包。
 * 在无 `__appScopeRef` 的测试夹具中自动回退到当前传入的 `scope`。
 */
export function readLatestScope(scope: Record<string, any>): Record<string, any> {
  return (scope?.__appScopeRef?.current as Record<string, any> | undefined) ?? scope;
}

function areScopeKeysEqual(
  prev: Record<string, any>,
  next: Record<string, any>,
  keys: readonly string[]
): boolean {
  for (const key of keys) {
    if (prev[key] !== next[key]) {
      return false;
    }
  }
  return true;
}

/** 静态底图/网格/只读背景页层依赖键 */
const STATIC_BACKGROUND_KEYS = [
  "canvasThemeColors",
  "canvasRenderBounds",
  "themeMode",
  "canvasBackgroundColor",
  "canvasBackgroundImageUrl",
  "canvasBackgroundImageFit",
  "backgroundPageRender",
  "colorDisplayMode",
  "colorPalette",
  "deviceLabelsVisible",
  "deviceMeasurementsVisible"
] as const;

/**
 * 静态底图层比较器：框选、拖拽、滚屏、浮动工具条、选区变化时返回 true 跳过重渲染。
 */
export function areStaticBackgroundPropsEqual(
  prevProps: CanvasStaticBackgroundLayerProps,
  nextProps: CanvasStaticBackgroundLayerProps
): boolean {
  if (prevProps.electricFlowStyleMarkup !== nextProps.electricFlowStyleMarkup) {
    return false;
  }
  if (prevProps.scope === nextProps.scope) {
    return true;
  }
  return areScopeKeysEqual(prevProps.scope, nextProps.scope, STATIC_BACKGROUND_KEYS);
}

/** `<g className="canvas-content">` 顶部瞬态底层依赖键 */
const TRANSIENT_UNDERLAY_KEYS = [
  "marquee",
  "libraryPlacement",
  "staticDrawing",
  "smartAlignmentGuides",
  "dragGhostEdgeRoutes",
  "themeMode",
  "canvasThemeColors",
  "colorDisplayMode",
  "colorPalette",
  "edges",
  "edgeById"
] as const;

/**
 * 瞬态底层比较器：仅在框选框、图库放置预览、静态绘制预览、对齐辅助线或拖影边变化时重渲染。
 */
export function areTransientUnderlayPropsEqual(
  prevProps: CanvasScopeLayerProps,
  nextProps: CanvasScopeLayerProps
): boolean {
  if (prevProps.scope === nextProps.scope) {
    return true;
  }
  return areScopeKeysEqual(prevProps.scope, nextProps.scope, TRANSIENT_UNDERLAY_KEYS);
}

/** 主体图元与连线层依赖键（彻底隔离 marquee、对齐线、预览路径、小地图视口、面板宽度与浮动工具条） */
const GRAPH_CONTENT_KEYS = [
  // LOD 与简化渲染
  "lodCanvasRouteChunks",
  "lodCanvasNodeChunks",
  "lodSelectedNodeMarkup",
  "useSimplifiedCanvasNodes",
  "useSimplifiedCanvasRoutes",
  "useSimplifiedSelectedCanvasNodes",
  "initialCanvasDetailedEdgeIdSet",
  "detailedSelectedEdgeIdSet",
  // 模型与视口集合
  "nodes",
  "edges",
  "nodeById",
  "edgeById",
  "visibleNodes",
  "visibleEdges",
  "detailedViewportNodes",
  "renderViewportRoutedEdges",
  "visibleMeasurementGroups",
  // 选中、编辑态与图层
  "isEditMode",
  "mode",
  "activeLayer",
  "activeLayerId",
  "activeLayerNodeIdSet",
  "activeLayerEdgeIdSet",
  "selectedNodeId",
  "selectedNodeIdSet",
  "selectedNodeCount",
  "selectedEdge",
  "selectedEdgeIds",
  "activeSelectedEdgeSet",
  "selectedTransformGroupUnit",
  "visibleSelectedGroupLayoutUnits",
  // 视觉主题与显示开关
  "themeMode",
  "canvasThemeColors",
  "colorDisplayMode",
  "colorPalette",
  "deviceLabelsVisible",
  "deviceMeasurementsVisible",
  // 直接改变主体节点/边自身 DOM 的交互状态
  "dragging",
  "draggingDelta",
  "singleNodeDragging",
  "multiNodeDragging",
  "draggingNodeIdSet",
  "dragAffectedEdgeIdSet",
  "dragGhostEdgeIdSet",
  "dragOverlayEdgeIdSet",
  "dragGhostRoutableLineNodeIdSet",
  "transformDrag",
  "nodeLabelDrag",
  "nodeLabelRotateDrag",
  "groupTransformPreviewGroupId",
  "groupTransformPreviewNodeIdSet",
  "groupTransformPreviewEdgeIdSet",
  "groupTransformPreviewRoutableLineNodeIdSet",
  "connectTerminalCompatibilityActive",
  "connectSourceNode",
  "routableLineTerminalCompatibilityActive",
  "routableLineActiveTerminalType",
  "terminalPress",
  "terminalPressPreviewEdgeIdSet",
  "overlappedTerminalKeys",
  "staticButtonVisual"
] as const;

/**
 * 主体图元与连线层比较器。
 *
 * 对 `rewiring`、`routableLineEndpointDrag`、`connectSource` 做字段级投影，
 * 避免鼠标移动刷新 `previewPoint` / `manualPoints` 时穿透引发全量节点重渲染。
 */
export function areGraphContentPropsEqual(
  prevProps: CanvasGraphContentLayerProps,
  nextProps: CanvasGraphContentLayerProps
): boolean {
  if (
    prevProps.selectedEdgeTopmostVisible !== nextProps.selectedEdgeTopmostVisible ||
    prevProps.electricFlowLayerMarkup !== nextProps.electricFlowLayerMarkup ||
    prevProps.electricFlowLineLayerMarkup !== nextProps.electricFlowLineLayerMarkup
  ) {
    return false;
  }
  const prev = prevProps.scope;
  const next = nextProps.scope;
  if (prev === next) {
    return true;
  }
  if (!areScopeKeysEqual(prev, next, GRAPH_CONTENT_KEYS)) {
    return false;
  }
  // 改线/端点拖拽/连线期间，主体层只依赖目标 ID（用于隐藏原线或高亮起点），不依赖实时坐标
  if ((prev.rewiring?.edgeId ?? null) !== (next.rewiring?.edgeId ?? null)) {
    return false;
  }
  if ((prev.routableLineEndpointDrag?.nodeId ?? null) !== (next.routableLineEndpointDrag?.nodeId ?? null)) {
    return false;
  }
  if (
    (prev.connectSource?.nodeId ?? null) !== (next.connectSource?.nodeId ?? null) ||
    (prev.connectSource?.terminalId ?? null) !== (next.connectSource?.terminalId ?? null)
  ) {
    return false;
  }
  return true;
}

/** SVG 顶层交互覆盖层依赖键 */
const TRANSIENT_OVERLAY_KEYS = [
  "isEditMode",
  "multiNodeDragging",
  "singleNodeDragging",
  "dragging",
  "draggingDelta",
  "dragPreviewEdgeRoutes",
  "terminalPressPreviewEdgeRoutes",
  "rewiringPreviewRoute",
  "rewiring",
  "connectSource",
  "connectPreviewDom",
  "connectPreviewColor",
  "routableLinePlacement",
  "routableLinePreview",
  "routableLinePlacementColor",
  "routableLineEndpointDragPreviewRoute",
  "routableLineEndpointDrag",
  "routableLineEndpointDragColor",
  "activeDropHintPoint",
  "activeDropHintStyle",
  "selectedRoutableLineManualPathRoute",
  "dragGhostRoutableLineNodeIdSet",
  "routableLineEndpointHandles",
  "selectedRoutedEdge",
  "selectedEdge",
  "manualPathPreviewRoute",
  "manualPathDrag",
  "resizeSizeHint",
  "canvasResizeHandles",
  "nodeById",
  "edgeById",
  "themeMode",
  "canvasThemeColors",
  "colorDisplayMode",
  "colorPalette"
] as const;

/**
 * SVG 顶层交互覆盖层比较器。
 */
export function areTransientOverlayPropsEqual(
  prevProps: CanvasTransientOverlayLayerProps,
  nextProps: CanvasTransientOverlayLayerProps
): boolean {
  if (prevProps.selectedEdgeTopmostVisible !== nextProps.selectedEdgeTopmostVisible) {
    return false;
  }
  if (prevProps.scope === nextProps.scope) {
    return true;
  }
  return areScopeKeysEqual(prevProps.scope, nextProps.scope, TRANSIENT_OVERLAY_KEYS);
}

/** 节点/边浮动工具条依赖键 */
const FLOATING_TOOLBAR_KEYS = [
  "isEditMode",
  "nodeFloatingToolbar",
  "edgeFloatingToolbar",
  "floatingToolbarIconSize",
  "activeLayerId",
  "canGroupSelectedGraphics",
  "canUngroupSelectedGraphics",
  "canAddTemplateFromSelection",
  "selectedAssociationJumpNode"
] as const;

/**
 * 节点/边悬浮工具条层比较器。
 */
export function areFloatingToolbarPropsEqual(
  prevProps: CanvasScopeLayerProps,
  nextProps: CanvasScopeLayerProps
): boolean {
  if (prevProps.scope === nextProps.scope) {
    return true;
  }
  return areScopeKeysEqual(prevProps.scope, nextProps.scope, FLOATING_TOOLBAR_KEYS);
}

/** 鸟瞰小地图层依赖键 */
const MINIMAP_KEYS = [
  "minimapVisible",
  "minimapNodes",
  "minimapRoutes",
  "selectedNodeIdSet",
  "minimapContentWidth",
  "minimapContentHeight",
  "minimapOffsetX",
  "minimapOffsetY",
  "minimapScale",
  "minimapViewportLeft",
  "minimapViewportRight",
  "minimapViewportTop",
  "minimapViewportBottom",
  "CANVAS_MINIMAP_WIDTH",
  "CANVAS_MINIMAP_HEIGHT"
] as const;

/**
 * 鸟瞰小地图比较器：仅在小地图可见性、图元/路线或视口矩形变化时重渲染。
 */
export function areMinimapPropsEqual(
  prevProps: CanvasScopeLayerProps,
  nextProps: CanvasScopeLayerProps
): boolean {
  if (prevProps.scope === nextProps.scope) {
    return true;
  }
  return areScopeKeysEqual(prevProps.scope, nextProps.scope, MINIMAP_KEYS);
}
