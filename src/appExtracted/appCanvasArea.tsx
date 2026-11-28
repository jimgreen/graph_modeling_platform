/**
 * MemoizedCanvasArea - 画布区域 React.memo 组件
 *
 * 通过自定义比较器，在 tab 切换时跳过画布 SVG 协调。
 */
import { memo, useMemo } from "react";
import type React from "react";
import type { CSSProperties } from "react";
import type { ModelNode, Point, RoutedEdge, Terminal } from "../model";
import type { CanvasLayoutUnit } from "../selectionActions";
import type { ScaleHandleConfig } from "./appCoreCanvasUtilities";
import { computeElectricFlowDirections, type ElectricFlowLinePath } from "../export/electric-flow";
import { buildElectricFlowLayerMarkup, buildElectricFlowStyleMarkup } from "../export/electric-flow-markup";
import { CanvasRulers } from "./appCanvasRulers";
import { SelectionActionCluster } from "./appTopbar";
import { CanvasConnectionPaths } from "./canvasLayers/CanvasConnectionPaths";
import { CanvasStaticBackgroundLayer } from "./canvasLayers/CanvasStaticBackgroundLayer";
import { CanvasTransientUnderlayLayer } from "./canvasLayers/CanvasTransientUnderlayLayer";
import { CanvasTransientOverlayLayer } from "./canvasLayers/CanvasTransientOverlayLayer";
import { CanvasFloatingToolbarLayer, CanvasMinimapOverlay } from "./canvasLayers/CanvasHudOverlays";
import {
  areFloatingToolbarPropsEqual,
  areGraphContentPropsEqual,
  areMinimapPropsEqual,
  areStaticBackgroundPropsEqual,
  areTransientOverlayPropsEqual,
  areTransientUnderlayPropsEqual,
  readLatestScope,
  type CanvasGraphContentLayerProps
} from "./canvasLayers/layerComparators";

export {
  CanvasConnectionPaths,
  CanvasStaticBackgroundLayer,
  CanvasTransientUnderlayLayer,
  CanvasTransientOverlayLayer,
  CanvasFloatingToolbarLayer,
  CanvasMinimapOverlay,
  areStaticBackgroundPropsEqual,
  areTransientUnderlayPropsEqual,
  areGraphContentPropsEqual,
  areTransientOverlayPropsEqual,
  areFloatingToolbarPropsEqual,
  areMinimapPropsEqual,
  readLatestScope
};

// 以下形状全部来自 __appScope（Record<string, any>），在此按**实际用到的字段**声明局部别名，
// 免得把每个回调都标成 any。字段集与生产端一致，改动生产端形状时这里会立刻报错。
type SvgMarkupChunkItem = { key: string; markup: string };
type ScaleHandleForNode = ScaleHandleConfig & { node: ModelNode };

/** 流水线关闭时 `filter` 结果的稳定单例：让那一步 useMemo 在关闭态下真正不再产出新数组。 */
const EMPTY_ROUTED_EDGES: RoutedEdge[] = [];

/** Storage bus 设备类型集合 */
const STORAGE_BUS_KINDS = new Set([
  "hydrogen-tank",
  "hydrogen-tank-horizontal",
  "hydrogen-tank-container",
  "thermal-storage-tank"
]);

import {
  adjustGeneratedStateIconTerminalStub,
  generatedStateIconVisualTransform
} from "../svgUtils";

export { adjustGeneratedStateIconTerminalStub };

export function singleTerminalPointerPreviewGeometry({
  nodePosition,
  nodeRotation,
  nodeScaleX,
  nodeScaleY,
  pointer,
  terminalRenderPoint,
  stubFrom
}: {
  nodePosition: { x: number; y: number };
  nodeRotation: number;
  nodeScaleX: number;
  nodeScaleY: number;
  pointer: { x: number; y: number };
  terminalRenderPoint: { x: number; y: number };
  stubFrom: { x: number; y: number };
}) {
  const safeScaleX = nodeScaleX === 0 ? 1 : nodeScaleX;
  const safeScaleY = nodeScaleY === 0 ? 1 : nodeScaleY;
  const radians = ((Number(nodeRotation) || 0) * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const deltaX = pointer.x - nodePosition.x;
  const deltaY = pointer.y - nodePosition.y;
  const unrotatedX = deltaX * cos + deltaY * sin;
  const unrotatedY = -deltaX * sin + deltaY * cos;

  return {
    bodyPoint: {
      x: terminalRenderPoint.x + stubFrom.x / safeScaleX,
      y: terminalRenderPoint.y + stubFrom.y / safeScaleY
    },
    pointerPoint: {
      x: unrotatedX / safeScaleX,
      y: unrotatedY / safeScaleY
    }
  };
}

/**
 * 自定义比较器：深度比较画布相关的所有值。
 * 只有当画布实际使用的值发生变化时，才触发重渲染。
 */
export function areCanvasPropsEqual(prevProps: any, nextProps: any) {
  const prev = prevProps.scope;
  const next = nextProps.scope;

  // 快速路径：如果引用相同，直接返回 true
  if (prev === next) {
    return true;
  }

  // 比较画布状态标志（这些是经常变化的）
  const stateKeys = [
    'panning', 'multiNodeDragging', 'singleNodeDragging', 'dragging', 'connectSource',
    'staticDrawing', 'libraryPlacement', 'contextMarqueeSelection', 'activeDropReady',
    'isEditMode', 'mode', 'activeLayerId', 'staticButtonVisual', 'rewiring', 'routableLinePlacement',
    'routableLineEndpointDrag', 'transformDrag', 'nodeLabelDrag', 'nodeLabelRotateDrag',
    'manualPathDrag', 'terminalPress', 'hasCanvasSelectionModifier', 'isRepeatedEdgePointerClick'
  ];

  for (const key of stateKeys) {
    if (prev[key] !== next[key]) {
      return false;
    }
  }

  // 比较画布显示参数
  const displayKeys = [
    'canvasDisplayWidth', 'canvasDisplayHeight', 'canvasDisplayOffsetX', 'canvasDisplayOffsetY',
    'canvasScrollSurfaceWidth', 'canvasScrollSurfaceHeight',
    'canvasHorizontalScrollbarsActive', 'canvasVerticalScrollbarsActive',
    'canvasRenderBounds'
  ];

  for (const key of displayKeys) {
    if (prev[key] !== next[key]) {
      return false;
    }
  }

  // 比较渲染数据（节点、边等）- 使用浅比较
  const dataKeys = [
    // 打开/关闭模型的瞬间画布要在「有图」与「空状态提示」之间切换；
    // activeProjectKey 不进这组键，关闭模型后画布会停在旧图上不重渲染。
    'activeProjectKey',
    'visibleNodes', 'visibleEdges', 'selectedNodeIdSet', 'selectedEdgeIds',
    'visibleMeasurementGroups',
    'marquee', 'connectPreviewDom', 'routableLinePreview', 'resizeSizeHint',
    'routableLineEndpointDragPreviewRoute', 'rewiringPreviewRoute', 'manualPathPreviewRoute',
    'dragPreviewEdgeRoutes', 'dragGhostEdgeRoutes',
    'useSimplifiedCanvasNodes', 'useSimplifiedCanvasRoutes', 'useSimplifiedSelectedCanvasNodes',
    'lodCanvasNodeChunks', 'lodCanvasRouteChunks', 'lodSelectedNodeMarkup',
    'draggingDelta', 'smartAlignmentGuides', 'connectSource', 'libraryPlacement',
    'canvasBackgroundColor', 'canvasBackgroundImageUrl', 'canvasBackgroundImageFit', 'backgroundPageRender',
    'colorDisplayMode', 'colorPalette', 'deviceLabelsVisible', 'deviceMeasurementsVisible',
    // 主题不进这组键会让切主题后画布不重绘（底色/网格/取色全停在旧模式）
    'themeMode', 'canvasThemeColors',
    // 电流流水线：开关不进这组键就会停在旧值 —— 顶栏切了开关画布不重渲染
    'electricFlowVisible',    // 外观设置（时长/填充/描边）同理：对象引用变化（弹窗确定）必须触发重渲染
    'electricFlowSettings'
  ];

  for (const key of dataKeys) {
    if (prev[key] !== next[key]) {
      return false;
    }
  }

  // 比较工具栏和覆盖层状态
  // 侧面板的显隐与宽度决定悬浮工具条的居中基准（viewportOverlayStyle 随面板变），
  // 不列入比较会出现"面板已隐藏、工具条位置还停在旧居中点"的问题
  const overlayKeys = [
    'nodeFloatingToolbar', 'edgeFloatingToolbar',
    'canvasResizePreviewRect', 'minimapVisible',
    'minimapViewportLeft', 'minimapViewportRight', 'minimapViewportTop', 'minimapViewportBottom',
    // 底部工具栏左侧的「选中操作」组：可用性/选中数/界面定制变化必须让画布重渲染，否则按钮状态停在旧值
    'canGroupSelectedGraphics', 'canUngroupSelectedGraphics', 'canAdjustSelectedDisplayLayer',
    'selectedLayoutUnitCount', 'interfaceCustomization',
    'leftPanelVisible', 'leftPanelWidth', 'rightPanelVisible', 'rightPanelWidth'
  ];

  for (const key of overlayKeys) {
    if (prev[key] !== next[key]) {
      return false;
    }
  }

  return true;
}

export function shouldRenderBaseCanvasEdge(
  edgeId: string,
  selectedEdgeId: string | null,
  selectedEdgeTopmostVisible: boolean
) {
  return !(selectedEdgeTopmostVisible && edgeId === selectedEdgeId);
}

export function staticDrawingContextMenuFinalPoint(drawing: {
  points: Array<{ x: number; y: number }>;
}) {
  return drawing.points.length >= 2 ? drawing.points.at(-1) ?? null : null;
}

/**
 * CanvasGraphContentLayer - 画布主体图元、连线、电流流水线与量测层
 *
 * 与框选框、智能对齐线、小地图视口、面板宽度、浮动工具条及顶层交互覆盖层彻底隔离；
 * 所有节点/连线/端子交互回调均通过 `readLatestScope` 读取当帧最新 `__appScope`，
 * 防止跳过重渲染后触发陈旧闭包。
 */
export const CanvasGraphContentLayer = memo(function CanvasGraphContentLayerInner({
  scope,
  selectedEdgeTopmostVisible,
  electricFlowLayerMarkup,
  electricFlowLineLayerMarkup
}: CanvasGraphContentLayerProps) {
  const {
    isEditMode,
    themeMode,
    canvasThemeColors,
    colorDisplayMode,
    colorPalette,
    deviceLabelsVisible,
    deviceMeasurementsVisible,
    useSimplifiedCanvasNodes,
    useSimplifiedCanvasRoutes,
    useSimplifiedSelectedCanvasNodes,
    lodCanvasRouteChunks,
    lodCanvasNodeChunks,
    lodSelectedNodeMarkup,
    renderViewportRoutedEdges,
    detailedViewportNodes,
    visibleSelectedGroupLayoutUnits,
    visibleMeasurementGroups,
    nodeById,
    edgeById,
    selectedNodeId,
    selectedNodeIdSet,
    selectedNodeCount,
    selectedEdge,
    activeSelectedEdgeSet,
    selectedTransformGroupUnit,
    activeLayerNodeIdSet,
    activeLayerEdgeIdSet,
    initialCanvasDetailedEdgeIdSet,
    detailedSelectedEdgeIdSet,
    dragging,
    draggingDelta,
    singleNodeDragging,
    multiNodeDragging,
    draggingNodeIdSet,
    dragGhostEdgeIdSet,
    dragOverlayEdgeIdSet,
    dragGhostRoutableLineNodeIdSet,
    transformDrag,
    isGroupTransformDrag,
    nodeLabelDrag,
    nodeLabelRotateDrag,
    groupTransformPreviewGroupId,
    groupTransformPreviewNodeIdSet,
    groupTransformPreviewEdgeIdSet,
    groupTransformPreviewRoutableLineNodeIdSet,
    rewiring,
    connectSource,
    connectTerminalCompatibilityActive,
    connectSourceNode,
    routableLineTerminalCompatibilityActive,
    routableLineActiveTerminalType,
    routableLineEndpointDrag,
    terminalPress,
    terminalPressPreviewEdgeIdSet,
    overlappedTerminalKeys,
    staticButtonVisual,
    TRANSFORM_ROTATE_STEM_START,
    TRANSFORM_ROTATE_STEM_END,
    TRANSFORM_ROTATE_HANDLE_GAP,
    SCALE_HANDLE_CONFIGS,
    GROUP_SCALE_HANDLE_CONFIGS,
    MemoDeviceGlyph,
    SvgMarkupChunk,
    bindCanvasNodeElement,
    connectionLineStyle,
    getEdgeEndpointPoint,
    getNodeScaleX,
    getNodeScaleY,
    getTerminalDisplayColor,
    isBusNode,
    isLineSegmentBusNode,
    isStaticNode,
    isRoutableLineDeviceKind,
    isStaticButtonEnabledForNode,
    canConnectTerminals,
    resolveNodeStateVisual,
    nodeImage,
    nodeForegroundImage,
    nodeGeometryTransform,
    nodeImageContentTransform,
    nodeLabelShouldRender,
    nodeLabelText,
    nodeLabelTextAnchor,
    nodeLabelVertical,
    nodeLabelVerticalSegments,
    nodeLabelVerticalTokenY,
    nodeLabelVerticalTokenStyle,
    nodeLabelTextStyle,
    nodeLabelTransform,
    nodeLabelFontSize,
    nodeUsesUprightStaticSelectionOutline,
    nodeUprightSelectionOutlineRect,
    nodeRotateHandleControlPoints,
    nodeScaleHandleControlPoint,
    nodeUprightRotateHandleControlPoints,
    nodeKindAllowsResizeTransform,
    scaleHandleCursorClass,
    selectionRectCenter,
    svgStrokeDashArray,
    svgImageContentMarkup,
    formatSvgNumber,
    terminalRenderLocalPoint,
    terminalStubSegment,
    terminalStubStrokeWidth,
    snapSingleTerminalAnchorToNearestSide,
    pointsToOrthogonalPath,
    routableLineDeviceRenderLocalPoints,
    renderBoundaryBusInternalConnector,
    renderNodePreviewImageContent,
    renderMeasurementGroup,
    buildMeasurementGroupsMarkup,
    renderSingleTransformRotateOriginGhost,
    renderGroupTransformPhotoPreview,
    renderTransformRotationTrajectory,
    findRewireTargetAtPoint
  } = scope;

  return (
    <>
      {lodCanvasRouteChunks.length > 0 && (
        <g className="lod-route-layer">
          {lodCanvasRouteChunks.map((chunk: SvgMarkupChunkItem) => (
            <SvgMarkupChunk key={chunk.key} className="lod-route-layer-chunk" markup={chunk.markup} />
          ))}
        </g>
      )}
      {dragging?.historyCaptured &&
        !multiNodeDragging &&
        dragging.nodeIds.map((nodeId: string) => {
          const node = nodeById.get(nodeId);
          const originalPosition = dragging.originalPositions[nodeId];
          if (!node || !originalPosition) {
            return null;
          }
          const ghostNode = { ...node, position: originalPosition };
          const ghostNodeIsBus = isBusNode(ghostNode);
          return (
            <g
              key={`drag-ghost-${node.id}`}
              className={`node-drag-ghost ${ghostNodeIsBus ? "bus-node" : ""}`}
              transform={`translate(${ghostNode.position.x} ${ghostNode.position.y})`}
            >
              <g transform={nodeGeometryTransform(ghostNode)}>
                <rect
                  x={-ghostNode.size.width / 2}
                  y={-ghostNode.size.height / 2}
                  width={ghostNode.size.width}
                  height={ghostNode.size.height}
                  rx="8"
                  className="node-drag-ghost-box"
                />
                <MemoDeviceGlyph
                  node={ghostNode}
                  mode="geometry"
                  colorDisplayMode={colorDisplayMode}
                  colorPalette={colorPalette}
                  themeMode={themeMode}
                  stateVisual={resolveNodeStateVisual(ghostNode)}
                />
                <MemoDeviceGlyph
                  node={ghostNode}
                  mode="text"
                  colorDisplayMode={colorDisplayMode}
                  colorPalette={colorPalette}
                  themeMode={themeMode}
                  stateVisual={resolveNodeStateVisual(ghostNode)}
                />
              </g>
              {renderNodePreviewImageContent(ghostNode, `drag-ghost-preview-clip-${ghostNode.id}`)}
            </g>
          );
        })}
      {renderViewportRoutedEdges.map((route: RoutedEdge) => {
        const edge = edgeById.get(route.edgeId);
        if (!edge) return null;
        if (!shouldRenderBaseCanvasEdge(edge.id, selectedEdge?.id ?? null, selectedEdgeTopmostVisible)) {
          return null;
        }
        const selected = activeSelectedEdgeSet.has(edge.id);
        if (
          dragGhostEdgeIdSet.has(edge.id) ||
          (multiNodeDragging && dragOverlayEdgeIdSet.has(edge.id)) ||
          groupTransformPreviewEdgeIdSet.has(edge.id) ||
          terminalPressPreviewEdgeIdSet.has(edge.id) ||
          rewiring?.edgeId === edge.id
        ) {
          return null;
        }
        const detailedByInitialHydration = initialCanvasDetailedEdgeIdSet.has(edge.id);
        if (useSimplifiedCanvasRoutes && !selected && !detailedByInitialHydration) {
          return null;
        }
        if (useSimplifiedCanvasRoutes && selected && !detailedSelectedEdgeIdSet.has(edge.id) && !detailedByInitialHydration) {
          return null;
        }
        const sourcePoint = getEdgeEndpointPoint(edge, "source");
        const targetPoint = getEdgeEndpointPoint(edge, "target");
        const sourceNode = nodeById.get(edge.sourceId);
        const targetNode = nodeById.get(edge.targetId);
        const editable = isEditMode && activeLayerEdgeIdSet.has(edge.id);
        const inactiveLayerGraphic = isEditMode && !editable;
        const rewiringSource = rewiring?.edgeId === edge.id && rewiring.endpoint === "source";
        const rewiringTarget = rewiring?.edgeId === edge.id && rewiring.endpoint === "target";
        const rewireTarget =
          rewiring?.edgeId === edge.id ? findRewireTargetAtPoint(rewiring.previewPoint, rewiring) : null;
        const sourceBusDotPoint = rewiringSource
          ? rewireTarget?.node && isBusNode(rewireTarget.node)
            ? rewireTarget.point
            : undefined
          : sourcePoint && sourceNode && isBusNode(sourceNode)
            ? sourcePoint
            : undefined;
        const targetBusDotPoint = rewiringTarget
          ? rewireTarget?.node && isBusNode(rewireTarget.node)
            ? rewireTarget.point
            : undefined
          : targetPoint && targetNode && isBusNode(targetNode)
            ? targetPoint
            : undefined;
        return (
          <g
            key={edge.id}
            className={`connection-group ${selected ? "selected" : ""} ${inactiveLayerGraphic ? "inactive-layer-graphic" : ""}`}
            style={connectionLineStyle(edge.id)}
            data-edge-id={edge.id}
          >
            <CanvasConnectionPaths
              d={route.path}
              onContextMenu={
                editable ? (event) => readLatestScope(scope).openEdgeContextMenu(event, edge.id, route.points) : undefined
              }
              onDoubleClick={
                editable
                  ? (event) => readLatestScope(scope).insertManualBendFromEdgePath(event, edge.id, route.points)
                  : undefined
              }
              onPointerDown={
                editable
                  ? (event) => readLatestScope(scope).handleEdgePathPointerDown(event, edge.id, route.points)
                  : undefined
              }
            />
            {renderBoundaryBusInternalConnector(sourceNode, sourceBusDotPoint, `${edge.id}-source-internal-connector`)}
            {renderBoundaryBusInternalConnector(targetNode, targetBusDotPoint, `${edge.id}-target-internal-connector`)}
            {isEditMode && sourceBusDotPoint && (
              <circle
                className="bus-connection-dot"
                cx={sourceBusDotPoint.x}
                cy={sourceBusDotPoint.y}
                r={7}
                fill={canvasThemeColors.busEndpointDot}
                stroke={canvasThemeColors.busEndpointDotStroke}
                onPointerDown={
                  editable
                    ? (event) => {
                        const latest = readLatestScope(scope);
                        event.stopPropagation();
                        if (event.button !== 0 || !latest.svgRef.current) {
                          return;
                        }
                        latest.selectCanvasGraphics([], [edge.id]);
                        latest.setRewiring({
                          edgeId: edge.id,
                          endpoint: "source",
                          previewPoint: latest.clampPointToCanvas(
                            latest.screenToSvgPoint(latest.svgRef.current, event.clientX, event.clientY)
                          ),
                          pointerId: event.pointerId
                        });
                        event.currentTarget.setPointerCapture(event.pointerId);
                      }
                    : undefined
                }
              />
            )}
            {isEditMode && targetBusDotPoint && (
              <circle
                className="bus-connection-dot"
                cx={targetBusDotPoint.x}
                cy={targetBusDotPoint.y}
                r={7}
                fill={canvasThemeColors.busEndpointDot}
                stroke={canvasThemeColors.busEndpointDotStroke}
                onPointerDown={
                  editable
                    ? (event) => {
                        const latest = readLatestScope(scope);
                        event.stopPropagation();
                        if (event.button !== 0 || !latest.svgRef.current) {
                          return;
                        }
                        latest.selectCanvasGraphics([], [edge.id]);
                        latest.setRewiring({
                          edgeId: edge.id,
                          endpoint: "target",
                          previewPoint: latest.clampPointToCanvas(
                            latest.screenToSvgPoint(latest.svgRef.current, event.clientX, event.clientY)
                          ),
                          pointerId: event.pointerId
                        });
                        event.currentTarget.setPointerCapture(event.pointerId);
                      }
                    : undefined
                }
              />
            )}
            {isEditMode && selected && sourcePoint && (
              <circle
                className="edge-endpoint-handle"
                cx={rewiring?.edgeId === edge.id && rewiring.endpoint === "source" ? rewiring.previewPoint.x : sourcePoint.x}
                cy={rewiring?.edgeId === edge.id && rewiring.endpoint === "source" ? rewiring.previewPoint.y : sourcePoint.y}
                r={8}
                onPointerDown={(event) => {
                  const latest = readLatestScope(scope);
                  event.stopPropagation();
                  if (event.button !== 0 || !latest.svgRef.current) {
                    return;
                  }
                  if (latest.hasCanvasSelectionModifier(event)) {
                    latest.startModifierSelectionPress(event, { kind: "edge", edgeId: edge.id });
                    return;
                  }
                  latest.setRewiring({
                    edgeId: edge.id,
                    endpoint: "source",
                    previewPoint: latest.clampPointToCanvas(
                      latest.screenToSvgPoint(latest.svgRef.current, event.clientX, event.clientY)
                    ),
                    pointerId: event.pointerId
                  });
                  event.currentTarget.setPointerCapture(event.pointerId);
                }}
              />
            )}
            {isEditMode && selected && targetPoint && (
              <circle
                className="edge-endpoint-handle"
                cx={rewiring?.edgeId === edge.id && rewiring.endpoint === "target" ? rewiring.previewPoint.x : targetPoint.x}
                cy={rewiring?.edgeId === edge.id && rewiring.endpoint === "target" ? rewiring.previewPoint.y : targetPoint.y}
                r={8}
                onPointerDown={(event) => {
                  const latest = readLatestScope(scope);
                  event.stopPropagation();
                  if (event.button !== 0 || !latest.svgRef.current) {
                    return;
                  }
                  if (latest.hasCanvasSelectionModifier(event)) {
                    latest.startModifierSelectionPress(event, { kind: "edge", edgeId: edge.id });
                    return;
                  }
                  latest.setRewiring({
                    edgeId: edge.id,
                    endpoint: "target",
                    previewPoint: latest.clampPointToCanvas(
                      latest.screenToSvgPoint(latest.svgRef.current, event.clientX, event.clientY)
                    ),
                    pointerId: event.pointerId
                  });
                  event.currentTarget.setPointerCapture(event.pointerId);
                }}
              />
            )}
          </g>
        );
      })}
      {/* 电流流水线层。
          —— 插入点为什么在这里（层级顺序）
          画布是纯 SVG，靠**文档顺序**决定压盖关系，没有 z-index 可用。上/下三块是：
            上游  lod-route-layer（LOD 精简连线）→ 本段 renderViewportRoutedEdges.map（详细连线）
            本层  electric-flow-layer
            下游  lod-node-layer → detailedViewportNodes.map（设备图元 + 文字标识）
          ① 必须在**两条连线分支之后**：LOD 开启时详细连线整段 return null（见上面 map 里的
             `useSimplifiedCanvasRoutes && !selected`），此时画布上的连线来自更早的
             lod-route-layer。插在它前面，箭头会被连线盖住；插在它与详细连线之间，
             LOD 分支又会丢层。放在详细连线之后，两种分支都在它上游 —— 不会丢、也不会重复
             （两个分支互斥：LOD 分支明确 return null 掉详细连线）。
          ② 必须在**节点之前**：箭头要贴着连线走，压在设备图元上会糊住设备符号；
             文字标识（Text_Layer 语义）最靠后，本层又在其下方，双重保险。
          ③ 组选框/变换手柄在本层之上 —— 它们是交互覆盖物，理应盖住一切。
          开关关闭时本段输出 null，DOM 与开关上线前完全一致。 */}
      {electricFlowLayerMarkup && (
        <SvgMarkupChunk className="electric-flow-layer-host" markup={electricFlowLayerMarkup} />
      )}
      {visibleSelectedGroupLayoutUnits.map((unit: CanvasLayoutUnit) => {
        const transforming = groupTransformPreviewGroupId === unit.id;
        const focused = selectedTransformGroupUnit?.id === unit.id;
        const bounds = unit.bounds;
        const width = Math.max(1, bounds.right - bounds.left);
        const height = Math.max(1, bounds.bottom - bounds.top);
        const center = selectionRectCenter(bounds);
        const handleGapX = 14;
        const handleGapY = 14;
        const rotateStemStart = TRANSFORM_ROTATE_STEM_START;
        const rotateStemEnd = TRANSFORM_ROTATE_STEM_END;
        const rotateHandleGap = TRANSFORM_ROTATE_HANDLE_GAP;
        return (
          <g
            key={`group-selection-${unit.id}`}
            className={`group-selection-overlay ${focused ? "focused" : ""} ${transforming ? "transforming" : ""}`}
          >
            <rect
              className="group-selection-hitbox"
              x={bounds.left}
              y={bounds.top}
              width={width}
              height={height}
              onPointerDown={(event) => readLatestScope(scope).startGroupMoveDrag(event, unit)}
              onContextMenu={(event) => {
                const latest = readLatestScope(scope);
                event.preventDefault();
                event.stopPropagation();
                if (!latest.activeLayer?.visible) {
                  return;
                }
                latest.canvasInteractionRef.current = true;
                latest.projectListPointerInsideRef.current = false;
                let pointer: Point | undefined;
                if (latest.svgRef.current) {
                  pointer = latest.clampPointToCanvas(
                    latest.screenToSvgPoint(latest.svgRef.current, event.clientX, event.clientY)
                  );
                  latest.lastCanvasPointerRef.current = pointer;
                  latest.updateMouseStatus(pointer);
                }
                if (latest.connectSource) {
                  latest.setConnectSource(null);
                  latest.resetConnectPreviewState();
                  latest.setMode("select");
                  return;
                }
                if (latest.routableLinePlacement) {
                  latest.setRoutableLinePlacement(null);
                  latest.resetRoutableLinePreviewState();
                  latest.setMode("select");
                  return;
                }
                latest.openGraphicContextMenu({
                  x: event.clientX,
                  y: event.clientY,
                  target: "group",
                  canvasPoint: pointer
                });
              }}
            />
            <rect className="group-selection-outline" x={bounds.left} y={bounds.top} width={width} height={height} />
            {focused && (
              <g
                className={`transform-handles group-transform-handles ${
                  transformDrag &&
                  isGroupTransformDrag(transformDrag) &&
                  transformDrag.groupId === unit.id.replace(/^group:/, "") &&
                  transformDrag.kind !== "rotate"
                    ? "resizing"
                    : ""
                }`}
              >
                <line
                  x1={center.x}
                  y1={bounds.top - rotateStemStart}
                  x2={center.x}
                  y2={bounds.top - rotateStemEnd}
                />
                <g transform={`translate(${center.x} ${bounds.top - rotateHandleGap})`}>
                  <circle
                    className="rotate-handle"
                    cx="0"
                    cy="0"
                    r="8"
                    onPointerDown={(event) => readLatestScope(scope).startGroupTransformDrag(event, unit, "rotate")}
                  />
                </g>
                {GROUP_SCALE_HANDLE_CONFIGS.map((handle: ScaleHandleConfig) => {
                  const handleCursorClass = scaleHandleCursorClass(handle, 0);
                  const x =
                    handle.xDirection === 0
                      ? center.x
                      : handle.xDirection < 0
                        ? bounds.left - handleGapX
                        : bounds.right + handleGapX;
                  const y =
                    handle.yDirection === 0
                      ? center.y
                      : handle.yDirection < 0
                        ? bounds.top - handleGapY
                        : bounds.bottom + handleGapY;
                  return (
                    <g key={handle.id} transform={`translate(${x} ${y})`}>
                      <rect
                        className={`scale-handle ${handleCursorClass}`}
                        x="-8"
                        y="-8"
                        width="16"
                        height="16"
                        rx="3"
                        onPointerDown={(event) =>
                          readLatestScope(scope).startGroupTransformDrag(event, unit, handle.kind)
                        }
                      />
                    </g>
                  );
                })}
              </g>
            )}
          </g>
        );
      })}
      {lodCanvasNodeChunks.length > 0 && (
        <g
          className="lod-node-layer"
          onPointerDown={(event) => readLatestScope(scope).handleLodNodePointerDown(event)}
          onContextMenu={(event) => readLatestScope(scope).handleLodNodeContextMenu(event)}
          onDoubleClick={(event) => readLatestScope(scope).handleLodNodeDoubleClick(event)}
        >
          {lodCanvasNodeChunks.map((chunk: SvgMarkupChunkItem) => (
            <SvgMarkupChunk key={chunk.key} className="lod-node-layer-chunk" markup={chunk.markup} />
          ))}
        </g>
      )}
      {lodSelectedNodeMarkup && (
        <g className="lod-node-selection-layer" dangerouslySetInnerHTML={{ __html: lodSelectedNodeMarkup }} />
      )}
      {detailedViewportNodes.map((node: ModelNode) => {
        if (groupTransformPreviewNodeIdSet.has(node.id)) {
          return null;
        }
        const selected = selectedNodeIdSet.has(node.id);
        const focused = node.id === selectedNodeId;
        const editable = activeLayerNodeIdSet.has(node.id);
        const inactiveLayerGraphic = isEditMode && !editable;
        const nodeIsBus = isBusNode(node);
        const nodeIsStatic = isStaticNode(node);
        const nodeIsRoutableLineDevice = isRoutableLineDeviceKind(node.kind);
        const nodeStateVisual = resolveNodeStateVisual(node);
        if (
          nodeIsRoutableLineDevice &&
          (dragGhostRoutableLineNodeIdSet.has(node.id) ||
            groupTransformPreviewRoutableLineNodeIdSet.has(node.id) ||
            routableLineEndpointDrag?.nodeId === node.id)
        ) {
          return null;
        }
        const isStorageBus = STORAGE_BUS_KINDS.has(node.kind);
        const isConnectSource = node.id === connectSource?.nodeId;
        const originalDragPosition = dragging?.originalPositions[node.id];
        const renderPosition =
          draggingDelta && originalDragPosition
            ? {
                x: originalDragPosition.x + draggingDelta.x,
                y: originalDragPosition.y + draggingDelta.y
              }
            : node.position;
        const renderSimplifiedNode =
          useSimplifiedCanvasNodes &&
          !nodeIsStatic &&
          (!selected || (useSimplifiedSelectedCanvasNodes && !focused)) &&
          !isConnectSource &&
          !transformDrag &&
          !nodeLabelDrag &&
          !nodeLabelRotateDrag;
        if (renderSimplifiedNode) {
          return null;
        }
        const imageHref = nodeImage(node);
        const foregroundImageHref = nodeForegroundImage(node);
        const nodeUsesStateImage = Boolean(
          nodeStateVisual?.image ||
            nodeStateVisual?.imageAssetId ||
            nodeStateVisual?.backgroundImage ||
            nodeStateVisual?.backgroundImageAssetId
        );
        const nodeBackgroundImageFit = nodeUsesStateImage
          ? nodeStateVisual?.imageFit ?? nodeStateVisual?.backgroundImageFit ?? node.params.backgroundImageFit
          : node.params.backgroundImageFit;
        const uprightStaticSelectionOutline = nodeUsesUprightStaticSelectionOutline(node, imageHref, foregroundImageHref);
        const uprightSelectionOutlineRect = uprightStaticSelectionOutline ? nodeUprightSelectionOutlineRect(node) : null;
        const nodeGeometryTransformValue = nodeGeometryTransform(node);
        const nodeScaleX = getNodeScaleX(node);
        const nodeScaleY = getNodeScaleY(node);
        const terminalVisualTransform = generatedStateIconVisualTransform(imageHref, node.size);
        const inverseScaleX = nodeScaleX === 0 ? 1 : 1 / nodeScaleX;
        const inverseScaleY = nodeScaleY === 0 ? 1 : 1 / nodeScaleY;
        const terminalStubDashArray = svgStrokeDashArray(node.params.strokeStyle);
        const terminalControlTransform = (x: number, y: number) =>
          `translate(${x} ${y}) scale(${inverseScaleX} ${inverseScaleY})`;
        const handleTransform = (x: number, y: number) => `translate(${x} ${y})`;
        const handleGapX = 14;
        const handleGapY = 14;
        const rotateStemStart = TRANSFORM_ROTATE_STEM_START;
        const rotateStemEnd = TRANSFORM_ROTATE_STEM_END;
        const rotateHandleGap = TRANSFORM_ROTATE_HANDLE_GAP;
        const staticSelectionPadding = 24;
        const staticSelectionOutlinePadding =
          nodeIsStatic && !uprightStaticSelectionOutline ? staticSelectionPadding : 0;
        const rotateHandlePoints = uprightStaticSelectionOutline
          ? nodeUprightRotateHandleControlPoints(node, rotateStemStart, rotateStemEnd, rotateHandleGap)
          : nodeRotateHandleControlPoints(
              node,
              rotateStemStart,
              rotateStemEnd,
              rotateHandleGap,
              staticSelectionOutlinePadding
            );
        const scaleHandleConfigsForNode =
          isLineSegmentBusNode(node) || nodeKindAllowsResizeTransform(node.kind)
            ? SCALE_HANDLE_CONFIGS
            : SCALE_HANDLE_CONFIGS.filter((handle: ScaleHandleConfig) => handle.kind === "scale-both");
        const staticButtonEnabled = isStaticButtonEnabledForNode(node);
        const staticButtonState = staticButtonVisual?.nodeId === node.id ? staticButtonVisual.state : "";
        const staticButtonCornerRadius = Math.max(0, Number(node.params.cornerRadius || 8));
        const showStaticSelectionFrame = nodeIsStatic && selected && !uprightStaticSelectionOutline;
        const staticSelectionCornerSize = 12;
        const staticSelectionX = -node.size.width / 2 - staticSelectionPadding;
        const staticSelectionY = -node.size.height / 2 - staticSelectionPadding;
        const staticSelectionWidth = node.size.width + staticSelectionPadding * 2;
        const staticSelectionHeight = node.size.height + staticSelectionPadding * 2;
        const staticSelectionCornerPoints = [
          { x: staticSelectionX, y: staticSelectionY },
          { x: staticSelectionX + staticSelectionWidth - staticSelectionCornerSize, y: staticSelectionY },
          { x: staticSelectionX, y: staticSelectionY + staticSelectionHeight - staticSelectionCornerSize },
          {
            x: staticSelectionX + staticSelectionWidth - staticSelectionCornerSize,
            y: staticSelectionY + staticSelectionHeight - staticSelectionCornerSize
          }
        ];
        const nodeLabelVisible = nodeLabelShouldRender(node, deviceLabelsVisible);
        const nodeLabelContent = nodeLabelVisible ? nodeLabelText(node) : "";
        const nodeLabelIsVertical = nodeLabelVisible && nodeLabelVertical(node);
        const nodeLabelVerticalTokens = nodeLabelIsVertical ? nodeLabelVerticalSegments(nodeLabelContent) : [];
        const nodeLabelFontSizeValue = nodeLabelVisible ? nodeLabelFontSize(node) : 0;
        const routableLineDeviceHitPath = nodeIsRoutableLineDevice
          ? pointsToOrthogonalPath(routableLineDeviceRenderLocalPoints(node))
          : "";
        const terminalDragTerminal =
          terminalPress?.moved &&
          terminalPress.nodeId === node.id &&
          !nodeIsBus &&
          !nodeIsStatic &&
          !nodeIsRoutableLineDevice &&
          node.terminals.length === 1
            ? node.terminals.find((terminal: Terminal) => terminal.id === terminalPress.terminalId)
            : undefined;
        const terminalDragPreview = terminalDragTerminal
          ? (() => {
              const previewAnchor = snapSingleTerminalAnchorToNearestSide(node, terminalPress.currentPoint);
              const previewTerminal = { ...terminalDragTerminal, anchor: previewAnchor };
              const previewRenderPoint = terminalRenderLocalPoint(
                previewTerminal,
                node.size,
                nodeScaleX,
                nodeScaleY,
                node.kind
              );
              const previewStub = adjustGeneratedStateIconTerminalStub(
                previewTerminal,
                previewRenderPoint,
                terminalStubSegment(previewTerminal, nodeScaleX, nodeScaleY, 24, node.kind, node.size),
                nodeScaleX,
                nodeScaleY,
                terminalVisualTransform
              );
              const previewGeometry = singleTerminalPointerPreviewGeometry({
                nodePosition: renderPosition,
                nodeRotation: node.rotation,
                nodeScaleX,
                nodeScaleY,
                pointer: terminalPress.currentPoint,
                terminalRenderPoint: previewRenderPoint,
                stubFrom: previewStub.from
              });
              return {
                terminalId: terminalDragTerminal.id,
                type: terminalDragTerminal.type,
                color: getTerminalDisplayColor(node, terminalDragTerminal, colorDisplayMode, colorPalette, themeMode),
                previewStrokeWidth: terminalStubStrokeWidth(node, previewTerminal),
                ...previewGeometry
              };
            })()
          : null;
        return (
          <g
            key={node.id}
            ref={(element) => bindCanvasNodeElement(node.id, element)}
            className={`diagram-node ${nodeIsBus ? "bus-node" : ""} ${nodeIsRoutableLineDevice ? "routable-line-node" : ""} ${isStorageBus ? "storage-node" : ""} ${uprightStaticSelectionOutline ? "static-upright-selection-node" : ""} ${staticButtonEnabled ? "static-button-enabled" : ""} ${staticButtonState ? `static-button-${staticButtonState}` : ""} ${multiNodeDragging && draggingNodeIdSet.has(node.id) ? "multi-drag-origin" : ""} ${singleNodeDragging && draggingNodeIdSet.has(node.id) ? "single-drag-origin" : ""} ${selected ? "selected" : ""} ${focused ? "focused" : ""} ${isConnectSource ? "connect-source" : ""} ${inactiveLayerGraphic ? "inactive-layer-graphic" : ""}`}
            transform={`translate(${renderPosition.x} ${renderPosition.y})`}
            data-node-id={node.id}
            data-export-device-id={nodeIsStatic ? undefined : node.id}
            data-export-device-idx={nodeIsStatic ? undefined : node.params.idx ?? ""}
            data-export-device-name={nodeIsStatic ? undefined : node.name}
            data-export-device-kind={nodeIsStatic ? undefined : node.kind}
            onPointerDown={
              nodeIsRoutableLineDevice ? undefined : (event) => readLatestScope(scope).handleNodePointerDown(event, node)
            }
            onPointerEnter={() => {
              if (staticButtonEnabled) {
                readLatestScope(scope).setStaticButtonFeedback(node.id, "hover");
              }
            }}
            onPointerLeave={() => {
              if (staticButtonEnabled) {
                const latest = readLatestScope(scope);
                latest.staticButtonPointerRef.current = null;
                latest.clearStaticButtonFeedback(node.id);
              }
            }}
            onPointerUp={() => {
              const latest = readLatestScope(scope);
              if (
                staticButtonEnabled &&
                latest.staticButtonVisual?.nodeId === node.id &&
                latest.staticButtonVisual.state === "pressed"
              ) {
                latest.setStaticButtonFeedback(node.id, "hover");
              }
            }}
            onClick={(event) => readLatestScope(scope).handleStaticButtonClick(event, node)}
            onContextMenu={(event) => {
              const latest = readLatestScope(scope);
              event.preventDefault();
              event.stopPropagation();
              if (!editable) {
                return;
              }
              latest.canvasInteractionRef.current = true;
              latest.projectListPointerInsideRef.current = false;
              let pointer: Point | undefined;
              if (latest.svgRef.current) {
                pointer = latest.clampPointToCanvas(
                  latest.screenToSvgPoint(latest.svgRef.current, event.clientX, event.clientY)
                );
                latest.lastCanvasPointerRef.current = pointer;
                latest.updateMouseStatus(pointer);
              }
              if (latest.routableLinePlacement) {
                latest.setRoutableLinePlacement(null);
                latest.resetRoutableLinePreviewState();
                latest.setMode("select");
                return;
              }
              if (latest.connectSource) {
                latest.setConnectSource(null);
                latest.resetConnectPreviewState();
                latest.setMode("select");
                return;
              }
              if (!latest.selectedNodeIdSet.has(node.id)) {
                latest.selectCanvasGraphics([node.id], []);
              }
              latest.openGraphicContextMenu({
                x: event.clientX,
                y: event.clientY,
                target: "node",
                canvasPoint: pointer,
                nodeId: node.id,
                routePoints: nodeIsRoutableLineDevice ? latest.routableLineDeviceCanvasPoints(node) : undefined
              });
            }}
            onDoubleClick={(event) => {
              event.stopPropagation();
              readLatestScope(scope).openNodeDoubleClickEditor(node);
            }}
          >
            <title>{node.name}</title>
            {imageHref && !nodeIsBus && (
              <clipPath id={`clip-${node.id}`}>
                <rect x={-node.size.width / 2} y={-node.size.height / 2} width={node.size.width} height={node.size.height} rx="8" />
              </clipPath>
            )}
            <g className="node-geometry" transform={nodeGeometryTransformValue}>
              <rect
                x={-node.size.width / 2}
                y={-node.size.height / 2}
                width={node.size.width}
                height={node.size.height}
                rx="8"
                className={`node-hitbox ${nodeIsBus ? "bus-hitbox" : ""} ${nodeIsStatic ? "static-hitbox" : ""}`}
              />
              <MemoDeviceGlyph
                node={node}
                mode="geometry"
                colorDisplayMode={colorDisplayMode}
                colorPalette={colorPalette}
                themeMode={themeMode}
                stateVisual={nodeStateVisual}
              />
              <MemoDeviceGlyph
                node={node}
                mode="text"
                colorDisplayMode={colorDisplayMode}
                colorPalette={colorPalette}
                themeMode={themeMode}
                stateVisual={nodeStateVisual}
              />
              {routableLineDeviceHitPath && (
                <path
                  className="routable-line-device-hitline"
                  d={routableLineDeviceHitPath}
                  onPointerDown={(event) => readLatestScope(scope).handleRoutableLineNodePathPointerDown(event, node)}
                />
              )}
              {staticButtonEnabled && (
                <rect
                  x={-node.size.width / 2}
                  y={-node.size.height / 2}
                  width={node.size.width}
                  height={node.size.height}
                  rx={staticButtonCornerRadius}
                  className="static-button-feedback-surface"
                />
              )}
              {showStaticSelectionFrame && (
                <g className="node-static-selection-frame">
                  <rect
                    x={staticSelectionX}
                    y={staticSelectionY}
                    width={staticSelectionWidth}
                    height={staticSelectionHeight}
                    rx={Math.max(8, staticButtonCornerRadius + staticSelectionPadding)}
                    className="node-static-selection-glow"
                  />
                  {staticSelectionCornerPoints.map((point, index) => (
                    <rect
                      key={`static-selection-corner-${index}`}
                      x={point.x}
                      y={point.y}
                      width={staticSelectionCornerSize}
                      height={staticSelectionCornerSize}
                      rx="3"
                      className="node-static-selection-corner"
                    />
                  ))}
                </g>
              )}
            </g>
            {!nodeIsBus && (imageHref || foregroundImageHref) && (
              <g className="node-upright-content" transform={nodeImageContentTransform(node)}>
                {imageHref && nodeIsStatic && (
                  <SvgMarkupChunk
                    className="node-background-image-markup"
                    markup={svgImageContentMarkup(imageHref, {
                      x: -node.size.width / 2,
                      y: -node.size.height / 2,
                      width: node.size.width,
                      height: node.size.height,
                      imageFit: nodeBackgroundImageFit,
                      clipPath: `url(#clip-${node.id})`,
                      className: "node-background-image"
                    })}
                  />
                )}
                {imageHref && !nodeIsStatic && (
                  <rect
                    x={-node.size.width / 2}
                    y={-node.size.height / 2}
                    width={node.size.width}
                    height={node.size.height}
                    rx="8"
                    className={`node-image-cover ${node.terminals.length > 0 ? "terminal-reserved-area" : ""}`}
                  />
                )}
                {imageHref && !nodeIsStatic && (
                  <SvgMarkupChunk
                    className="node-background-image-markup"
                    markup={svgImageContentMarkup(imageHref, {
                      x: -node.size.width / 2,
                      y: -node.size.height / 2,
                      width: node.size.width,
                      height: node.size.height,
                      imageFit: nodeBackgroundImageFit,
                      clipPath: `url(#clip-${node.id})`,
                      className: "node-background-image"
                    })}
                  />
                )}
                {foregroundImageHref && (
                  <SvgMarkupChunk
                    className="node-foreground-image-markup"
                    markup={svgImageContentMarkup(foregroundImageHref, {
                      x: -node.size.width / 2,
                      y: -node.size.height / 2,
                      width: node.size.width,
                      height: node.size.height,
                      imageFit: node.params.foregroundImageFit,
                      clipPath: `url(#clip-${node.id})`,
                      className: "node-foreground-image"
                    })}
                  />
                )}
              </g>
            )}
            {uprightSelectionOutlineRect && (
              <rect
                className="node-upright-selection-outline"
                x={uprightSelectionOutlineRect.x}
                y={uprightSelectionOutlineRect.y}
                width={uprightSelectionOutlineRect.width}
                height={uprightSelectionOutlineRect.height}
                rx="4"
              />
            )}
            {nodeLabelVisible && (
              <g
                className={`node-device-label ${selected ? "selected" : ""} ${focused ? "focused" : ""} ${nodeLabelIsVertical ? "vertical" : "horizontal"}`}
                data-node-id={node.id}
                data-label-owner="device"
                transform={nodeLabelTransform(node)}
                onPointerDown={isEditMode ? (event) => readLatestScope(scope).startNodeLabelDrag(event, node) : undefined}
              >
                {nodeLabelIsVertical ? (
                  nodeLabelVerticalTokens.map((segment: { text: string; numeric: boolean }, index: number) => (
                    <text
                      key={`${segment.text}-${index}`}
                      className={`node-label-vertical-token ${segment.numeric ? "numeric" : ""}`}
                      x="0"
                      y={nodeLabelVerticalTokenY(index, nodeLabelVerticalTokens.length, node)}
                      dominantBaseline="middle"
                      textAnchor="middle"
                      style={nodeLabelVerticalTokenStyle(node, themeMode, canvasThemeColors.canvasBackground)}
                    >
                      {segment.text}
                    </text>
                  ))
                ) : (
                  <text
                    x="0"
                    y="0"
                    dominantBaseline="middle"
                    textAnchor={nodeLabelTextAnchor(node)}
                    style={nodeLabelTextStyle(node, themeMode, canvasThemeColors.canvasBackground)}
                  >
                    {nodeLabelContent}
                  </text>
                )}
                {isEditMode && selected && focused && selectedNodeCount === 1 && (
                  <g
                    className="node-label-rotate-control"
                    transform={`translate(0 ${formatSvgNumber(-nodeLabelFontSizeValue - 18)})`}
                  >
                    <line x1="0" y1="8" x2="0" y2="0" />
                    <circle
                      cx="0"
                      cy="0"
                      r="6"
                      onPointerDown={(event) => readLatestScope(scope).startNodeLabelRotateDrag(event, node)}
                    >
                      <title>旋转标识</title>
                    </circle>
                  </g>
                )}
              </g>
            )}
            <g className="node-terminal-layer" transform={nodeGeometryTransformValue}>
              {terminalDragPreview && (
                <g
                  className="terminal-drag-overlay"
                  style={{ "--terminal-drag-color": terminalDragPreview.color } as CSSProperties}
                >
                  <line
                    className="terminal-drag-preview-line"
                    style={{ "--terminal-drag-width": terminalDragPreview.previewStrokeWidth } as CSSProperties}
                    x1={terminalDragPreview.bodyPoint.x}
                    y1={terminalDragPreview.bodyPoint.y}
                    x2={terminalDragPreview.pointerPoint.x}
                    y2={terminalDragPreview.pointerPoint.y}
                  />
                  <g
                    className="terminal-drag-current"
                    transform={terminalControlTransform(
                      terminalDragPreview.pointerPoint.x,
                      terminalDragPreview.pointerPoint.y
                    )}
                  >
                    <circle
                      className={`terminal-dot ${terminalDragPreview.type} terminal-drag-preview-dot`}
                      style={{ "--terminal-color": terminalDragPreview.color } as CSSProperties}
                      cx="0"
                      cy="0"
                      r="7"
                    />
                  </g>
                </g>
              )}
              {node.terminals.map((terminal: Terminal) => {
                const hideFixedTerminal = nodeIsBus || nodeIsStatic || isRoutableLineDeviceKind(node.kind);
                const disabled =
                  !hideFixedTerminal &&
                  ((connectTerminalCompatibilityActive &&
                    !canConnectTerminals(connectSourceNode!, connectSource!.terminalId, node, terminal.id)) ||
                    (routableLineTerminalCompatibilityActive &&
                      Boolean(routableLineActiveTerminalType) &&
                      terminal.type !== routableLineActiveTerminalType));
                const isConnectCandidate = connectSource && !disabled && node.id !== connectSource.nodeId;
                const overlapped = isEditMode && overlappedTerminalKeys.has(`${node.id}:${terminal.id}`);
                const displayTerminal = terminal;
                const renderPoint = terminalRenderLocalPoint(
                  displayTerminal,
                  node.size,
                  nodeScaleX,
                  nodeScaleY,
                  node.kind
                );
                const stub = adjustGeneratedStateIconTerminalStub(
                  displayTerminal,
                  renderPoint,
                  terminalStubSegment(displayTerminal, nodeScaleX, nodeScaleY, 24, node.kind, node.size),
                  nodeScaleX,
                  nodeScaleY,
                  terminalVisualTransform
                );
                const terminalDisplayColor = getTerminalDisplayColor(
                  node,
                  terminal,
                  colorDisplayMode,
                  colorPalette,
                  themeMode
                );
                return hideFixedTerminal ? null : (
                  <g
                    key={terminal.id}
                    className={`terminal-control ${terminalDragPreview?.terminalId === terminal.id ? "terminal-drag-active" : ""}`}
                    transform={terminalControlTransform(renderPoint.x, renderPoint.y)}
                  >
                    <line
                      className={`terminal-stub ${terminal.type} ${disabled ? "disabled" : ""}`}
                      strokeDasharray={terminalStubDashArray}
                      style={
                        {
                          "--terminal-stub-color": disabled ? canvasThemeColors.disabledStub : terminalDisplayColor,
                          "--terminal-stub-width": terminalStubStrokeWidth(node, displayTerminal)
                        } as CSSProperties
                      }
                      x1={stub.from.x}
                      y1={stub.from.y}
                      x2={stub.to.x}
                      y2={stub.to.y}
                    />
                    <circle
                      className={`terminal-dot ${terminal.type} ${overlapped ? "overlapped" : ""} ${disabled ? "disabled" : ""} ${isConnectCandidate ? "connect-candidate" : ""}`}
                      style={{ "--terminal-color": terminalDisplayColor } as CSSProperties}
                      cx="0"
                      cy="0"
                      r={overlapped ? 7.2 : 6}
                      onPointerDown={
                        isEditMode
                          ? (event) => readLatestScope(scope).handleTerminalPointerDown(event, node, terminal.id)
                          : undefined
                      }
                    >
                      <title>{`${terminal.label} / ${terminal.type.toUpperCase()}`}</title>
                    </circle>
                  </g>
                );
              })}
            </g>
            {selected &&
              focused &&
              selectedNodeCount === 1 &&
              !nodeIsRoutableLineDevice &&
              (isEditMode ? (
                <g
                  className={`transform-handles ${
                    transformDrag &&
                    !isGroupTransformDrag(transformDrag) &&
                    transformDrag.nodeId === node.id &&
                    transformDrag.kind !== "rotate"
                      ? "resizing"
                      : ""
                  }`}
                >
                  <line
                    x1={rotateHandlePoints.stemStart.x}
                    y1={rotateHandlePoints.stemStart.y}
                    x2={rotateHandlePoints.stemEnd.x}
                    y2={rotateHandlePoints.stemEnd.y}
                  />
                  <g transform={handleTransform(rotateHandlePoints.handle.x, rotateHandlePoints.handle.y)}>
                    <circle
                      className="rotate-handle"
                      cx="0"
                      cy="0"
                      r="8"
                      onPointerDown={(event) => readLatestScope(scope).startSingleTransformDrag(event, node, "rotate")}
                    />
                  </g>
                  {scaleHandleConfigsForNode.map((handle: ScaleHandleForNode) => {
                    const handlePoint = nodeScaleHandleControlPoint(
                      node,
                      handle,
                      handleGapX,
                      handleGapY,
                      uprightStaticSelectionOutline,
                      staticSelectionOutlinePadding
                    );
                    const handleCursorClass = scaleHandleCursorClass(
                      handle,
                      uprightStaticSelectionOutline ? 0 : node.rotation
                    );
                    return (
                      <g key={handle.id} transform={handleTransform(handlePoint.x, handlePoint.y)}>
                        <rect
                          className={`scale-handle ${handleCursorClass}`}
                          x="-8"
                          y="-8"
                          width="16"
                          height="16"
                          rx="3"
                          onPointerDown={(event) =>
                            readLatestScope(scope).startSingleTransformDrag(event, node, handle.kind, handle)
                          }
                        />
                      </g>
                    );
                  })}
                </g>
              ) : null)}
          </g>
        );
      })}
      {/* 线路节点箭头覆盖层：本体（节点层）之上、交互覆盖物之下 —— 箭头在线路上方可见，
          又不会糊住设备符号与选框。开关关闭 / 无线路条目时输出 null，DOM 与之前逐字节一致。 */}
      {electricFlowLineLayerMarkup && (
        <SvgMarkupChunk className="electric-flow-line-layer-host" markup={electricFlowLineLayerMarkup} />
      )}
      {dragging?.historyCaptured && dragging.nodeIds.length > 0 && (
        <g className="drag-origin-measurement-layer" pointerEvents="none">
          {dragging.nodeIds.map((nodeId: string) => {
            const node = nodeById.get(nodeId);
            const originalPosition = dragging.originalPositions[nodeId];
            if (!node || !originalPosition) {
              return null;
            }
            const ghostNode = { ...node, position: originalPosition };
            const ghostMeasurementMarkup = buildMeasurementGroupsMarkup(ghostNode, { absolute: true, className: "drag-origin" });
            return ghostMeasurementMarkup ? (
              <g key={`drag-origin-measurements-${nodeId}`} dangerouslySetInnerHTML={{ __html: ghostMeasurementMarkup }} />
            ) : null;
          })}
        </g>
      )}
      {deviceMeasurementsVisible && visibleMeasurementGroups.length > 0 && (
        <g key="measurement-layer" className="measurement-layer" pointerEvents="auto">
          {visibleMeasurementGroups.map(renderMeasurementGroup)}
        </g>
      )}
      {renderSingleTransformRotateOriginGhost()}
      {renderGroupTransformPhotoPreview()}
      {renderTransformRotationTrajectory()}
    </>
  );
}, areGraphContentPropsEqual);

/**
 * MemoizedCanvasArea - 接收整个 __appScope，内部解构使用。
 */
export const MemoizedCanvasArea = memo(function CanvasAreaInner({ scope }: { scope: Record<string, any> }) {
  // 没有打开任何模型时不画布：网格、标尺、背景页、图元全都不渲染，只留一句提示。
  //
  // 判据用 `activeProjectKey` 而不是 `currentProject`：后者在「未选中方案 / 未选中模型」时
  // 也可能是个带默认值的空项目对象，拿它判断会把空画布当成已打开的模型。
  // 早退放在最前面 —— 后面几百行解构与 handler 都是为「真有一张图」准备的。
  if (!String(scope?.activeProjectKey ?? "")) {
    return (
      <section className="canvas-frame" ref={scope?.canvasFrameRef} tabIndex={-1}>
        <div className="canvas-empty-state">
          <div className="canvas-empty-state-inner">
            <div className="canvas-empty-state-title">请打开要编辑的模型</div>
            <div className="canvas-empty-state-hint">在左侧模型库中双击一个模型，或在「新建」里创建</div>
          </div>
        </div>
      </section>
    );
  }
  // 从 scope 解构画布外框、事件壳、电流流水线计算与底部视口栏所需变量
  // （各渲染层的细粒度字段由独立 memo 子组件各自按需解构）
  const {
    svgRef, canvasFrameRef, canvasInteractionRef, projectListPointerInsideRef,
    lastRawCanvasPointerRef, lastCanvasPointerRef, lastCanvasClientPointerRef,
    canvasSelectionShortcutActiveRef, draggingRef, panningRef, modifierSelectionPressRef,
    lastEdgePointerClickRef, contextMarqueeSelectionRef, canvasResizeHotzonesRef,
    canvasDisplayWidth, canvasDisplayHeight, canvasDisplayOffsetX, canvasDisplayOffsetY,
    canvasRenderBounds, canvasScrollSurfaceWidth, canvasScrollSurfaceHeight,
    canvasHorizontalScrollbarsActive, canvasVerticalScrollbarsActive,
    connectSource, terminalPress, staticDrawing, libraryPlacement, contextMarqueeSelection,
    activeDropReady, panning, multiNodeDragging, singleNodeDragging,
    isEditMode, themeMode,
    // 画布配色：由 App 按 themeMode 解析好的整套画布 token（网格/边框/提示线/选中框/文本/端子等）
    canvasThemeColors,
    manualPathDrag, rewiring, routableLinePlacement, routableLineEndpointDrag,
    hasCanvasSelectionModifier, isRepeatedEdgePointerClick,
    handleCanvasPointerDownCapture, handlePointerMove, handleWheel, handleDrop,
    startCanvasPanning, startCanvasResize, startCanvasResizeFromTopOverlay,
    startCanvasResizeFromLeftOverlay, startCanvasResizeFromRightOverlay,
    startCanvasResizeFromBottomOverlay, startRoutableLineFromTerminal,
    startModifierSelectionPress, finishCanvasPanning, finishNodeDrag,
    finishNodeLabelDrag, finishNodeLabelRotateDrag, finishManualPathDrag,
    finishMarqueeSelection, finishMarqueeSelectionFromPoints, finishMeasurementDrag,
    finishModifierSelectionPress, finishRewiring, finishRoutableLineEndpointDrag,
    finishRoutableLineToTarget, finishTerminalPress, finishTransformDrag,
    finishConnectToTarget, finishInteractiveStaticDrawing, cancelInteractiveStaticDrawing,
    fitWholeCanvasFromBlankDoubleClick,
    selectCanvasGraphics, clearLibraryPlacementPreview, clearRecordSelection,
    centerSelectedInView, fitViewToSelection,
    fitWholeCanvasToFrame, zoomViewportAtCenter, shrinkCanvasToFitContent,
    cancelLibraryPlacement, cancelModifierSelectionPress,
    setConnectSource, setContextMarqueeSelection, setContextMenu,
    setMarquee, setMinimapVisible, setMode, setRewiring,
    setRoutableLineEndpointDrag, setRoutableLinePlacement,
    queuePendingBlankCanvasDeselect, flushPendingBlankCanvasDeselect,
    setTerminalPress,
    resetConnectPreviewState, resetRoutableLinePreviewState, resetViewportZoom,
    applyConnectPreviewState, applyRoutableLinePreviewState,
    updateLibraryPlacementPreview, updateMouseStatus,
    commitLibraryPlacementAtPoint,
    focusCanvasKeyboardShortcutHost, consumeGraphicContextMenuHandled,
    activateInspectorFromCanvas,
    screenToSvgPoint, clampPointToCanvas,
    findConnectTargetAtPoint, findConnectionRouteHitAtPoint,
    findRoutableLineEndpointTargetAtPoint,
    renderViewportRoutedEdges,
    isRoutableLineDeviceKind, isCanvasGraphicContextMenuTarget,
    resolveConnectPreviewPoint, resolveRoutableLinePreviewPoint,
    pointsToOrthogonalPath,
    routableLineDeviceCanvasPoints,
    routableLineDeviceEndpointRefs, inferMissingRoutableLineDeviceEndpointRefs,
    appendConnectPreviewManualPoint, appendRoutableLinePreviewManualPoint,
    appendStaticDrawingPoint, insertManualBendFromPointer,
    scheduleRoutableLinePreviewPoint,
    LocateFixed, MapIcon, Maximize2, Minus, Plus, RotateCcw, ScanSearch, Shrink,
    terminalPressPreviewEdgeIdSet,
    selectedEdge, selectedViewportActionDisabled,
    // 电流流水线：开关 + 外观设置 + 整图模型（方向判定要跑在**全图**上，见 electricFlowLayerMarkup 的注释）
    electricFlowVisible, electricFlowSettings, nodes, edges,
    minimapVisible,
    viewportOverlayStyle, canvasResizePreviewRect, canvasResizeHotzoneStyle,
    draggingDelta, dragAffectedEdgeIdSet,
    dragGhostEdgeIdSet, dragGhostRoutableLineNodeIdSet,
    dragOverlayEdgeIdSet, dragPreviewEdgeIdSet,
    connectTargetPoint, connectTargetSnapPoint,
    groupTransformPreviewEdgeIdSet, groupTransformPreviewNodeIdSet,
    groupTransformPreviewRoutableLineNodeIdSet,
    centerSelectedViewportTitle, fitSelectedViewportTitle
  } = scope;

  const selectedEdgeTopmostVisible = Boolean(
    selectedEdge &&
    !dragGhostEdgeIdSet.has(selectedEdge.id) &&
    !(singleNodeDragging && dragAffectedEdgeIdSet.has(selectedEdge.id)) &&
    !(draggingDelta && dragPreviewEdgeIdSet.has(selectedEdge.id)) &&
    !(multiNodeDragging && dragOverlayEdgeIdSet.has(selectedEdge.id)) &&
    !groupTransformPreviewEdgeIdSet.has(selectedEdge.id) &&
    !terminalPressPreviewEdgeIdSet.has(selectedEdge.id) &&
    rewiring?.edgeId !== selectedEdge.id
  );

  // ==========================================================================
  // 电流流水线（方向箭头层）
  // ==========================================================================
  //
  // 三个 useMemo 分开挂，各自只盯自己那几项输入：
  //   ① styleMarkup  —— 只依赖开关。动画关键帧串每帧重建没意义，且重建会让
  //      <style> 节点被重新 innerHTML 一次，浏览器要重解析一遍 CSS。
  //   ② directions   —— 依赖 [nodes, edges]。方向判定是**全图 BFS**：只看视口内的
  //      节点会让跨屏链路的中继段判不出方向（上游不在视口 ⇒ 整条支路落到 none）。
  //      所以这里必须喂整图模型，视口裁剪留给第三步。
  //   ③ layerMarkup  —— 依赖 [开关, directions, 视口路由边]。视口筛选只在这里做。
  //
  // 开关关闭时三步全部短路成空串：不跑 BFS、不拼标记、不建 <g>，
  // 画布输出与开关这个功能上线前逐字节一致。

  const electricFlowStyleMarkup = useMemo(
    () => (electricFlowVisible ? buildElectricFlowStyleMarkup(electricFlowSettings) : ""),
    [electricFlowSettings, electricFlowVisible]
  );

  // 交流线路（自适应）等线路型节点：本体就是一条"线"，也要参与方向判定并挂箭头。
  // 合成虚拟边（id = 线路节点 id，两端 = 线路端点 ref 指向的设备）参与 BFS；
  // 箭头 path 用线路本体渲染点（routableLineDeviceCanvasPoints）保证与本体逐字节同源。
  // 过渡态抑制判据对齐上面 renderViewportRoutedEdges 的过滤与下方节点渲染循环：
  //   整节点隐藏（组变换预览）或线路本体隐藏（拖拽/端点拖拽/改线预览接管）时不出箭头，
  //   保证「有箭头必有可见线路本体」。
  const electricFlowLineEntries = useMemo(() => {
    const empty: ElectricFlowLinePath[] = [];
    if (!electricFlowVisible) {
      return empty;
    }
    for (const node of nodes ?? []) {
      if (!isRoutableLineDeviceKind(node.kind)) {
        continue;
      }
      if (
        groupTransformPreviewNodeIdSet.has(node.id) ||
        dragGhostRoutableLineNodeIdSet.has(node.id) ||
        groupTransformPreviewRoutableLineNodeIdSet.has(node.id) ||
        routableLineEndpointDrag?.nodeId === node.id
      ) {
        continue;
      }
      const refs = routableLineDeviceEndpointRefs(inferMissingRoutableLineDeviceEndpointRefs(node, nodes ?? []));
      if (!refs.source?.nodeId || !refs.target?.nodeId || refs.source.nodeId === refs.target.nodeId) {
        continue;
      }
      const path = pointsToOrthogonalPath(routableLineDeviceCanvasPoints(node));
      if (!path) {
        continue;
      }
      empty.push({
        edgeId: node.id,
        path,
        sourceId: refs.source.nodeId,
        targetId: refs.target.nodeId,
        sourceTerminalId: refs.source.terminalId,
        targetTerminalId: refs.target.terminalId
      });
    }
    return empty;
  }, [
    dragGhostRoutableLineNodeIdSet, electricFlowVisible, groupTransformPreviewNodeIdSet,
    groupTransformPreviewRoutableLineNodeIdSet, nodes, routableLineEndpointDrag?.nodeId
  ]);

  const electricFlowDirections = useMemo(
    () => (electricFlowVisible ? computeElectricFlowDirections(nodes ?? [], edges ?? [], electricFlowLineEntries) : new Map()),
    [edges, electricFlowLineEntries, electricFlowVisible, nodes]
  );

  // 过渡态抑制：拖拽 / 改线 / 组变换期间，底层连线被隐藏、由别处的预览线接管
  // （见下面 renderViewportRoutedEdges.map 里的同一组判据）。此时路由还是改线**之前**
  // 的那份，箭头会脱离可见连线悬在半空。判据逐条对齐那条 map，保证「有箭头必有连线」。
  const electricFlowRoutedEdges = useMemo(() => {
    if (!electricFlowVisible) {
      return EMPTY_ROUTED_EDGES;
    }
    return renderViewportRoutedEdges.filter((route: RoutedEdge) =>
      !dragGhostEdgeIdSet.has(route.edgeId) &&
      !(multiNodeDragging && dragOverlayEdgeIdSet.has(route.edgeId)) &&
      !groupTransformPreviewEdgeIdSet.has(route.edgeId) &&
      !terminalPressPreviewEdgeIdSet.has(route.edgeId) &&
      rewiring?.edgeId !== route.edgeId
    );
  }, [
    dragGhostEdgeIdSet, dragOverlayEdgeIdSet, electricFlowVisible, groupTransformPreviewEdgeIdSet,
    multiNodeDragging, renderViewportRoutedEdges, rewiring?.edgeId, terminalPressPreviewEdgeIdSet
  ]);

  // 两层箭头：edge 箭头压在连线之上、设备图元之下（主层，与开关上线前一致）；
  // 线路节点（ac-routable-line 等）的本体是**节点**、画在主层之上 ⇒ 它的箭头必须
  // 单独放一层、渲染在节点层之后，否则会被线路本体盖住（SVG 只有文档顺序）。
  const electricFlowLineLayerMarkup = useMemo(
    () => (electricFlowLineEntries.length
      ? buildElectricFlowLayerMarkup(electricFlowLineEntries, electricFlowDirections, electricFlowSettings)
      : ""),
    [electricFlowDirections, electricFlowSettings, electricFlowLineEntries]
  );

  const electricFlowLayerMarkup = useMemo(
    () => (electricFlowVisible
      ? buildElectricFlowLayerMarkup(electricFlowRoutedEdges, electricFlowDirections, electricFlowSettings)
      : ""),
    [electricFlowDirections, electricFlowSettings, electricFlowVisible, electricFlowRoutedEdges]
  );

  // 画布内 CSS 变量：把当前主题的取值挂在根 <svg> 上，样式表里只写 var(...)，
  // 切主题时 CSS 与 SVG 属性两侧一起换，不会出现「属性变了样式没变」的半切换。
  const canvasThemeStyleVars = {
    "--canvas-guide": canvasThemeColors.alignmentGuide,
    "--canvas-selection-stroke": canvasThemeColors.selectionStroke,
    "--canvas-selection-fill": canvasThemeColors.marqueeFill,
    "--canvas-border": canvasThemeColors.canvasBorder,
    "--canvas-text-halo": canvasThemeColors.halo,
    "--canvas-terminal-dot-stroke": canvasThemeColors.terminalDotStroke,
    "--canvas-bus-endpoint-dot": canvasThemeColors.busEndpointDot,
    "--canvas-bus-endpoint-dot-stroke": canvasThemeColors.busEndpointDotStroke,
    "--canvas-connection-stroke": canvasThemeColors.surfaceStroke,
    "--canvas-connection-preview": canvasThemeColors.connectionPreview,
    "--canvas-text-primary": canvasThemeColors.primary,
    "--canvas-text-secondary": canvasThemeColors.secondary,
    "--canvas-text-muted": canvasThemeColors.muted,
    "--canvas-accent": canvasThemeColors.accent,
    "--canvas-surface-fill": canvasThemeColors.surfaceFill,
    "--canvas-background": canvasThemeColors.canvasBackground
  } as CSSProperties;

  return (
    <>
        <section className="canvas-frame" ref={canvasFrameRef} tabIndex={-1} onPointerEnter={focusCanvasKeyboardShortcutHost} onPointerMove={focusCanvasKeyboardShortcutHost} style={{
        overflowX: canvasHorizontalScrollbarsActive ? "auto" : "hidden",
        overflowY: canvasVerticalScrollbarsActive ? "auto" : "hidden"
    }}>
          <div className="canvas-scroll-surface" style={{ width: canvasScrollSurfaceWidth, height: canvasScrollSurfaceHeight }} onPointerDown={(event) => {
        if (event.button !== 0 || event.target !== event.currentTarget || staticDrawing || libraryPlacement || connectSource) {
            return;
        }
        if (isEditMode && startCanvasResizeFromTopOverlay(event)) {
            return;
        }
        if (isEditMode && startCanvasResizeFromLeftOverlay(event)) {
            return;
        }
        if (isEditMode && startCanvasResizeFromRightOverlay(event)) {
            return;
        }
        if (isEditMode && startCanvasResizeFromBottomOverlay(event)) {
            return;
        }
        if (isEditMode && hasCanvasSelectionModifier(event)) {
            startModifierSelectionPress(event);
            return;
        }
        startCanvasPanning(event);
    }} onPointerMove={(event) => {
        if (panningRef.current || modifierSelectionPressRef.current) {
            handlePointerMove(event as unknown as React.PointerEvent<SVGSVGElement>);
        }
    }} onPointerUp={(event) => {
        finishModifierSelectionPress(event.pointerId);
        finishCanvasPanning();
    }} onPointerCancel={() => {
        cancelModifierSelectionPress();
        finishCanvasPanning();
    }} onLostPointerCapture={() => {
        cancelModifierSelectionPress();
        finishCanvasPanning();
    }} onDoubleClick={(event) => {
        if (event.button !== 0 || event.target !== event.currentTarget) {
            return;
        }
        event.preventDefault();
        event.stopPropagation();
        fitWholeCanvasToFrame();
    }}>
            <CanvasRulers scope={scope}/>
            <svg ref={svgRef} className={`diagram-canvas ${connectSource ? "connect-mode" : ""} ${terminalPress?.moved ? "terminal-dragging" : ""} ${staticDrawing ? "static-draw-mode" : ""} ${libraryPlacement ? "library-place-mode" : ""} ${contextMarqueeSelection ? "context-marquee-mode" : ""} ${activeDropReady ? "connect-drop-ready" : ""} ${panning ? "panning" : ""} ${multiNodeDragging ? "multi-node-dragging" : ""} ${singleNodeDragging ? "single-node-dragging" : ""}`} style={{ width: canvasDisplayWidth, height: canvasDisplayHeight, left: canvasDisplayOffsetX, top: canvasDisplayOffsetY, ...canvasThemeStyleVars }} data-theme-mode={themeMode === "dark" ? "dark" : "light"} viewBox={`0 0 ${canvasRenderBounds.width} ${canvasRenderBounds.height}`} onDrop={handleDrop} onDragOver={(event) => event.preventDefault()} onWheel={handleWheel} onDoubleClick={fitWholeCanvasFromBlankDoubleClick} onPointerDownCapture={handleCanvasPointerDownCapture} onPointerMove={handlePointerMove} onPointerEnter={(event) => {
        canvasInteractionRef.current = true;
        projectListPointerInsideRef.current = false;
        const rawPointer = screenToSvgPoint(event.currentTarget, event.clientX, event.clientY);
        const pointer = clampPointToCanvas(rawPointer);
        lastRawCanvasPointerRef.current = rawPointer;
        lastCanvasPointerRef.current = pointer;
        lastCanvasClientPointerRef.current = { x: event.clientX, y: event.clientY };
        updateMouseStatus(pointer);
        if (libraryPlacement) {
            updateLibraryPlacementPreview(pointer);
        }
        if (routableLinePlacement) {
            const previewPoint = resolveRoutableLinePreviewPoint(pointer, event);
            scheduleRoutableLinePreviewPoint(previewPoint);
        }
    }} onPointerUp={(event) => {
        if (finishMeasurementDrag(event.pointerId)) {
            return;
        }
        if (finishModifierSelectionPress(event.pointerId)) {
            return;
        }
        finishRewiring(event);
        finishRoutableLineEndpointDrag();
        finishTerminalPress();
        finishNodeLabelDrag();
        finishNodeLabelRotateDrag();
        finishMarqueeSelection();
        // Alt 语义(移出/不落入容器)取指针抬起瞬间的修饰键状态
        finishNodeDrag(event.altKey);
        finishManualPathDrag();
        finishTransformDrag();
        finishCanvasPanning();
    }} onPointerLeave={() => {
        clearLibraryPlacementPreview();
        lastCanvasClientPointerRef.current = null;
        if (routableLinePlacement) {
            resetRoutableLinePreviewState();
        }
        if (draggingRef.current) {
            canvasInteractionRef.current = true;
            projectListPointerInsideRef.current = false;
            return;
        }
        if (canvasSelectionShortcutActiveRef.current) {
            canvasInteractionRef.current = true;
            projectListPointerInsideRef.current = false;
            return;
        }
        canvasInteractionRef.current = false;
        if (manualPathDrag) {
            return;
        }
        finishNodeLabelDrag();
        finishNodeLabelRotateDrag();
        finishNodeDrag();
        if (panningRef.current) {
            return;
        }
        if (modifierSelectionPressRef.current) {
            return;
        }
        if (contextMarqueeSelectionRef.current) {
            return;
        }
        setTerminalPress(null);
        setRoutableLineEndpointDrag(null);
        finishManualPathDrag();
        finishTransformDrag();
        setMarquee(null);
        setRewiring(null);
    }} onPointerCancel={(event) => {
        finishMeasurementDrag();
        cancelModifierSelectionPress();
        finishNodeLabelDrag();
        finishNodeLabelRotateDrag();
        finishNodeDrag(event.altKey);
        setTerminalPress(null);
        setRoutableLineEndpointDrag(null);
        finishManualPathDrag();
        finishTransformDrag();
        finishCanvasPanning();
        setContextMarqueeSelection(null);
        setMarquee(null);
        setRewiring(null);
    }} onLostPointerCapture={(event) => {
        finishMeasurementDrag();
        cancelModifierSelectionPress();
        finishNodeLabelDrag();
        finishNodeLabelRotateDrag();
        finishNodeDrag(event.altKey);
        setTerminalPress(null);
        setRoutableLineEndpointDrag(null);
        finishManualPathDrag();
        finishTransformDrag();
        finishCanvasPanning();
        setContextMarqueeSelection(null);
    }} onPointerDown={(event) => {
        if (event.button !== 0) {
            return;
        }
        activateInspectorFromCanvas();
        canvasInteractionRef.current = true;
        projectListPointerInsideRef.current = false;
        const rawPointer = screenToSvgPoint(event.currentTarget, event.clientX, event.clientY);
        const pointer = clampPointToCanvas(rawPointer);
        lastRawCanvasPointerRef.current = rawPointer;
        lastCanvasPointerRef.current = pointer;
        lastCanvasClientPointerRef.current = { x: event.clientX, y: event.clientY };
        updateMouseStatus(pointer);
        if (routableLinePlacement) {
            const previewPoint = resolveRoutableLinePreviewPoint(pointer, event);
            const target = findRoutableLineEndpointTargetAtPoint(previewPoint);
            applyRoutableLinePreviewState(previewPoint, target ? connectTargetPoint(target) : null, target);
            if (target) {
                if (routableLinePlacement.source) {
                    finishRoutableLineToTarget(target, routableLinePlacement.manualPoints);
                }
                else {
                    startRoutableLineFromTerminal(target.node, target.terminalId, target.point);
                }
            }
            else if (routableLinePlacement.source) {
                const nextPlacement = appendRoutableLinePreviewManualPoint(previewPoint);
                applyRoutableLinePreviewState(previewPoint, null, null, nextPlacement ?? routableLinePlacement);
            }
            return;
        }
        if (libraryPlacement) {
            commitLibraryPlacementAtPoint(pointer);
            return;
        }
        if (staticDrawing) {
            appendStaticDrawingPoint(pointer, event.detail >= 2);
            return;
        }
        if (connectSource) {
            const previewPoint = resolveConnectPreviewPoint(pointer, event);
            const target = findConnectTargetAtPoint(previewPoint);
            applyConnectPreviewState(previewPoint, Boolean(target), target ? connectTargetSnapPoint(target) : null);
            if (target) {
                finishConnectToTarget(target, previewPoint);
            }
            else {
                const nextConnectSource = appendConnectPreviewManualPoint(previewPoint);
                applyConnectPreviewState(previewPoint, false, null, null, nextConnectSource ?? connectSource);
            }
            return;
        }
        if (contextMarqueeSelectionRef.current) {
            finishMarqueeSelectionFromPoints(contextMarqueeSelectionRef.current.start, pointer);
            setContextMarqueeSelection(null);
            event.preventDefault();
            event.stopPropagation();
            return;
        }
        const routeHit = findConnectionRouteHitAtPoint(pointer);
        if (hasCanvasSelectionModifier(event)) {
            startModifierSelectionPress(event, routeHit ? { kind: "edge", edgeId: routeHit.edgeId } : undefined);
            return;
        }
        if (routeHit) {
            const edgeClick = {
                edgeId: routeHit.edgeId,
                clientX: event.clientX,
                clientY: event.clientY,
                at: Date.now()
            };
            const repeatedClick = isRepeatedEdgePointerClick(lastEdgePointerClickRef.current, edgeClick);
            lastEdgePointerClickRef.current = edgeClick;
            selectCanvasGraphics([], [routeHit.edgeId]);
            setConnectSource(null);
            resetConnectPreviewState();
            setRewiring(null);
            clearRecordSelection();
            if (event.detail >= 2 || repeatedClick) {
                insertManualBendFromPointer(routeHit.edgeId, routeHit.routePoints, pointer);
                lastEdgePointerClickRef.current = null;
            }
            return;
        }
        lastEdgePointerClickRef.current = null;
        // 空白处按下只登记「待清除选中」：接下来很可能是拖动平移画布，
        // 真正的清空推迟到指针抬起且位移未越过阈值时（见 finishCanvasPanning），
        // 否则每平移一次视图就会丢掉已选设备。
        queuePendingBlankCanvasDeselect(event);
        if (event.detail >= 2) {
            flushPendingBlankCanvasDeselect();
            event.preventDefault();
            setMarquee(null);
            fitWholeCanvasToFrame();
            return;
        }
        startCanvasPanning(event);
        return;
    }} onContextMenu={(event) => {
        event.preventDefault();
        if (consumeGraphicContextMenuHandled()) {
            event.stopPropagation();
            return;
        }
        if (isCanvasGraphicContextMenuTarget(event.target)) {
            event.stopPropagation();
            return;
        }
        const rawPointer = screenToSvgPoint(event.currentTarget, event.clientX, event.clientY);
        const pointer = clampPointToCanvas(rawPointer);
        lastRawCanvasPointerRef.current = rawPointer;
        lastCanvasPointerRef.current = pointer;
        lastCanvasClientPointerRef.current = { x: event.clientX, y: event.clientY };
        updateMouseStatus(pointer);
        if (libraryPlacement) {
            cancelLibraryPlacement();
            return;
        }
        if (routableLinePlacement) {
            setRoutableLinePlacement(null);
            resetRoutableLinePreviewState();
            setMode("select");
            return;
        }
        if (staticDrawing) {
            const finalPoint = staticDrawingContextMenuFinalPoint(staticDrawing);
            if (finalPoint) {
                finishInteractiveStaticDrawing(finalPoint);
            }
            else {
                cancelInteractiveStaticDrawing();
            }
            return;
        }
        if (connectSource) {
            setConnectSource(null);
            resetConnectPreviewState();
            setMode("select");
            return;
        }
        const routeHit = findConnectionRouteHitAtPoint(pointer);
        if (routeHit) {
            selectCanvasGraphics([], [routeHit.edgeId]);
            setConnectSource(null);
            resetConnectPreviewState();
            setRewiring(null);
            clearRecordSelection();
            setContextMenu({
                x: event.clientX,
                y: event.clientY,
                target: "edge",
                canvasPoint: pointer,
                edgeId: routeHit.edgeId,
                routePoints: routeHit.routePoints.map((point: Point) => ({ ...point }))
            });
            return;
        }
        setContextMenu({ x: event.clientX, y: event.clientY, target: "blank", canvasPoint: pointer });
    }}>
            <CanvasStaticBackgroundLayer scope={scope} electricFlowStyleMarkup={electricFlowStyleMarkup}/>
            <g className="canvas-content">
              <CanvasTransientUnderlayLayer scope={scope}/>
              <CanvasGraphContentLayer
                scope={scope}
                selectedEdgeTopmostVisible={selectedEdgeTopmostVisible}
                electricFlowLayerMarkup={electricFlowLayerMarkup}
                electricFlowLineLayerMarkup={electricFlowLineLayerMarkup}
              />
            </g>
            <CanvasTransientOverlayLayer scope={scope} selectedEdgeTopmostVisible={selectedEdgeTopmostVisible}/>
            </svg>
            {canvasResizePreviewRect && (<div className="canvas-resize-preview" style={{
            left: canvasResizePreviewRect.left,
            top: canvasResizePreviewRect.top,
            width: canvasResizePreviewRect.width,
            height: canvasResizePreviewRect.height
        }}/>)}
            {isEditMode && (<div ref={canvasResizeHotzonesRef} className="canvas-resize-hotzones" style={canvasResizeHotzoneStyle} aria-hidden="true">
                <div className="canvas-resize-hotzone canvas-resize-hotzone-left" onPointerDown={(event) => startCanvasResize(event, "left")}/>
                <div className="canvas-resize-hotzone canvas-resize-hotzone-top" onPointerDown={(event) => startCanvasResize(event, "top")}/>
                <div className="canvas-resize-hotzone canvas-resize-hotzone-right" onPointerDown={(event) => startCanvasResize(event, "right")}/>
                <div className="canvas-resize-hotzone canvas-resize-hotzone-bottom" onPointerDown={(event) => startCanvasResize(event, "bottom")}/>
                <div className="canvas-resize-hotzone canvas-resize-hotzone-top-left" onPointerDown={(event) => startCanvasResize(event, "top-left")}/>
                <div className="canvas-resize-hotzone canvas-resize-hotzone-top-right" onPointerDown={(event) => startCanvasResize(event, "top-right")}/>
                <div className="canvas-resize-hotzone canvas-resize-hotzone-bottom-left" onPointerDown={(event) => startCanvasResize(event, "bottom-left")}/>
                <div className="canvas-resize-hotzone canvas-resize-hotzone-bottom-right" onPointerDown={(event) => startCanvasResize(event, "corner")}/>
              </div>)}
            <CanvasFloatingToolbarLayer scope={scope}/>
          </div>
        </section>
          <div className="viewport-overlay" style={viewportOverlayStyle} onPointerDown={(event) => event.stopPropagation()} onClick={(event) => event.stopPropagation()}>
          <div className="viewport-controls" role="group" aria-label="画布快捷工具栏">
            <SelectionActionCluster scope={scope}/>
            <span className="viewport-controls-divider" aria-hidden="true"/>
            <button type="button" title="适配视图" aria-label="适配视图" onClick={fitWholeCanvasToFrame}>
              <Maximize2 size={16}/>
            </button>
            <button type="button" title={centerSelectedViewportTitle} aria-label="居中选中" disabled={selectedViewportActionDisabled} onClick={centerSelectedInView}>
              <LocateFixed size={16}/>
            </button>
            <button type="button" title={fitSelectedViewportTitle} aria-label="缩放到选中区域" disabled={selectedViewportActionDisabled} onClick={fitViewToSelection}>
              <ScanSearch size={16}/>
            </button>
            <button type="button" title="放大" aria-label="放大" onClick={() => zoomViewportAtCenter(0.82)}>
              <Plus size={16}/>
            </button>
            <button type="button" title="缩小" aria-label="缩小" onClick={() => zoomViewportAtCenter(1.18)}>
              <Minus size={16}/>
            </button>
            <button type="button" title="重置缩放" aria-label="重置缩放" onClick={resetViewportZoom}>
              <RotateCcw size={16}/>
            </button>
            <button type="button" className={minimapVisible ? "active" : ""} title={minimapVisible ? "隐藏小地图" : "显示小地图"} aria-label={minimapVisible ? "隐藏小地图" : "显示小地图"} onClick={() => setMinimapVisible((current: boolean) => !current)}>
              <MapIcon size={16}/>
            </button>
            <button type="button" title="收紧画布" aria-label="收紧画布" onClick={shrinkCanvasToFitContent}>
              <Shrink size={16}/>
            </button>
          </div>
          <CanvasMinimapOverlay scope={scope}/>
        </div>
    </>
  );
}, areCanvasPropsEqual);
