/**
 * CanvasHudOverlays - 画布 HTML 悬浮工具条与鸟瞰导航小地图层
 *
 * 将节点/边悬浮工具条与小地图从主 SVG 渲染树中剥离为独立 memo 子组件：
 * - 滚屏/缩放更新小地图视口框时，小地图内部进一步缓存静态路线与节点，仅重绘视口框；
 * - 所有按钮回调均经 `readLatestScope` 实时取当帧函数，避免陈旧闭包。
 */
import { memo, useMemo } from "react";
import type { ModelNode, Point } from "../../model";
import {
  areFloatingToolbarPropsEqual,
  areMinimapPropsEqual,
  readLatestScope,
  type CanvasScopeLayerProps
} from "./layerComparators";

type MinimapRoute = { edgeId: string; points: Point[] };

/** 选中图元 / 选中连接线的悬浮快捷操作工具条层 */
export const CanvasFloatingToolbarLayer = memo(function CanvasFloatingToolbarLayerInner({
  scope
}: CanvasScopeLayerProps) {
  const {
    isEditMode,
    nodeFloatingToolbar,
    edgeFloatingToolbar,
    floatingToolbarWrapperStyle,
    floatingToolbarIconSize,
    canGroupSelectedGraphics,
    canUngroupSelectedGraphics,
    canAddTemplateFromSelection,
    selectedAssociationJumpNode,
    Copy,
    Scissors,
    Trash2,
    Layers,
    Layers2,
    Group,
    Ungroup,
    Grid2X2,
    Plus,
    Type,
    ArrowUpRight,
    Route
  } = scope;

  if (!isEditMode || (!nodeFloatingToolbar && !edgeFloatingToolbar)) {
    return null;
  }

  return (
    <div className="canvas-floating-toolbar-layer">
      {nodeFloatingToolbar && (
        <div
          className="canvas-floating-toolbar-wrapper"
          style={floatingToolbarWrapperStyle(nodeFloatingToolbar)}
        >
          <div
            className="canvas-floating-toolbar node-toolbar"
            role="toolbar"
            aria-label="选中图元快捷操作"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              title="复制"
              aria-label="复制"
              onPointerDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
              }}
              onClick={() => readLatestScope(scope).copySelection()}
            >
              <Copy size={floatingToolbarIconSize} />
            </button>
            <button
              type="button"
              title="剪切"
              aria-label="剪切"
              onPointerDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
              }}
              onClick={() => readLatestScope(scope).cutSelection()}
            >
              <Scissors size={floatingToolbarIconSize} />
            </button>
            <button
              type="button"
              title="删除"
              aria-label="删除"
              onPointerDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
              }}
              onClick={() => readLatestScope(scope).deleteSelection()}
            >
              <Trash2 size={floatingToolbarIconSize} />
            </button>
            <button
              type="button"
              title="图层修改"
              aria-label="图层修改"
              onPointerDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
              }}
              onClick={() => readLatestScope(scope).openLayerAssignmentDialog()}
            >
              <Layers size={floatingToolbarIconSize} />
            </button>
            <button
              type="button"
              title="置于当前图层"
              aria-label="置于当前图层"
              onPointerDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
              }}
              onClick={() => {
                const latest = readLatestScope(scope);
                latest.assignSelectedNodesToModelLayer(latest.activeLayerId);
              }}
            >
              <Layers2 size={floatingToolbarIconSize} />
            </button>
            {canGroupSelectedGraphics && (
              <button
                type="button"
                title="组合"
                aria-label="组合"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                }}
                onClick={() => readLatestScope(scope).groupSelectedGraphics()}
              >
                <Group size={floatingToolbarIconSize} />
              </button>
            )}
            {canUngroupSelectedGraphics && (
              <button
                type="button"
                title="解散"
                aria-label="解散"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                }}
                onClick={() => readLatestScope(scope).ungroupSelectedGraphics()}
              >
                <Ungroup size={floatingToolbarIconSize} />
              </button>
            )}
            {canAddTemplateFromSelection && (
              <button
                type="button"
                title="添加到模板库"
                aria-label="添加到模板库"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                }}
                onClick={() => readLatestScope(scope).openAddTemplateDialog()}
              >
                <Grid2X2 size={floatingToolbarIconSize} />
              </button>
            )}
            {canAddTemplateFromSelection && (
              <button
                type="button"
                title="定义为元件"
                aria-label="定义为元件"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                }}
                onClick={() => readLatestScope(scope).openGroupDeviceDefinitionDialog()}
              >
                <Plus size={floatingToolbarIconSize} />
              </button>
            )}
            <button
              type="button"
              title="标识显示"
              aria-label="标识显示"
              onPointerDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
              }}
              onClick={() => readLatestScope(scope).toggleSelectedNodeLabelDisplay()}
            >
              <Type size={floatingToolbarIconSize} />
            </button>
            {selectedAssociationJumpNode && (
              <button
                type="button"
                title="跳转到绑定模型"
                aria-label="跳转到绑定模型"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                }}
                onClick={() => readLatestScope(scope).jumpToSelectedAssociationNode()}
              >
                <ArrowUpRight size={floatingToolbarIconSize} />
              </button>
            )}
          </div>
        </div>
      )}
      {edgeFloatingToolbar && (
        <div
          className="canvas-floating-toolbar-wrapper"
          style={floatingToolbarWrapperStyle(edgeFloatingToolbar)}
        >
          <div
            className="canvas-floating-toolbar edge-toolbar"
            role="toolbar"
            aria-label="选中连接线快捷操作"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              title="复制连接线"
              aria-label="复制连接线"
              onPointerDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
              }}
              onClick={() => readLatestScope(scope).copySelection()}
            >
              <Copy size={floatingToolbarIconSize} />
            </button>
            <button
              type="button"
              title="整理连接线"
              aria-label="整理连接线"
              onPointerDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
              }}
              onClick={() => readLatestScope(scope).tidySelectedEdgeRoute()}
            >
              <Route size={floatingToolbarIconSize} />
            </button>
            <button
              type="button"
              title="删除连接线"
              aria-label="删除连接线"
              onPointerDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
              }}
              onClick={() => readLatestScope(scope).deleteSelection()}
            >
              <Trash2 size={floatingToolbarIconSize} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}, areFloatingToolbarPropsEqual);

/** 鸟瞰导航小地图层 */
export const CanvasMinimapOverlay = memo(function CanvasMinimapOverlayInner({
  scope
}: CanvasScopeLayerProps) {
  const {
    minimapVisible,
    CANVAS_MINIMAP_WIDTH,
    CANVAS_MINIMAP_HEIGHT,
    minimapOffsetX,
    minimapOffsetY,
    minimapContentWidth,
    minimapContentHeight,
    minimapRoutes,
    minimapNodes,
    minimapScale,
    selectedNodeIdSet,
    minimapViewportLeft,
    minimapViewportTop,
    minimapViewportRight,
    minimapViewportBottom,
    mapPointToMinimap,
    formatSvgNumber,
    getNodeScaleX,
    getNodeScaleY
  } = scope;

  // 滚屏/平移时仅视口框四边坐标变化，静态路线与节点元素缓存复用，避免每帧重算全部小地图元素
  const minimapStaticContent = useMemo(() => {
    if (!minimapVisible) {
      return null;
    }
    return (
      <>
        {minimapRoutes.map((route: MinimapRoute) => (
          <polyline
            key={`minimap-route-${route.edgeId}`}
            className="minimap-route"
            points={route.points
              .map((point: Point) => mapPointToMinimap(point))
              .map((point: Point) => `${formatSvgNumber(point.x)},${formatSvgNumber(point.y)}`)
              .join(" ")}
          />
        ))}
        {minimapNodes.map((node: ModelNode) => {
          const center = mapPointToMinimap(node.position);
          const width = Math.max(1.8, Math.abs(getNodeScaleX(node)) * node.size.width * minimapScale);
          const height = Math.max(1.8, Math.abs(getNodeScaleY(node)) * node.size.height * minimapScale);
          return (
            <rect
              key={`minimap-node-${node.id}`}
              className={`minimap-node ${selectedNodeIdSet.has(node.id) ? "selected" : ""}`}
              x={center.x - width / 2}
              y={center.y - height / 2}
              width={width}
              height={height}
              rx="1"
            />
          );
        })}
      </>
    );
  }, [
    minimapVisible,
    minimapRoutes,
    minimapNodes,
    minimapScale,
    minimapOffsetX,
    minimapOffsetY,
    minimapContentWidth,
    minimapContentHeight,
    selectedNodeIdSet
  ]);

  if (!minimapVisible) {
    return null;
  }

  return (
    <div className="canvas-minimap" aria-label="鸟瞰导航">
      <svg
        viewBox={`0 0 ${CANVAS_MINIMAP_WIDTH} ${CANVAS_MINIMAP_HEIGHT}`}
        onPointerDown={(event) => {
          readLatestScope(scope).handleMinimapNavigate(event);
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (event.buttons & 1) {
            readLatestScope(scope).handleMinimapNavigate(event);
          }
        }}
      >
        <rect
          className="minimap-canvas"
          x={minimapOffsetX}
          y={minimapOffsetY}
          width={minimapContentWidth}
          height={minimapContentHeight}
        />
        {minimapStaticContent}
        <rect
          className="minimap-viewport"
          x={minimapViewportLeft}
          y={minimapViewportTop}
          width={Math.max(4, minimapViewportRight - minimapViewportLeft)}
          height={Math.max(4, minimapViewportBottom - minimapViewportTop)}
        />
      </svg>
    </div>
  );
}, areMinimapPropsEqual);
