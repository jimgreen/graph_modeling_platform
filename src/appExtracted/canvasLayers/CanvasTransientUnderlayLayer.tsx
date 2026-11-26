/**
 * CanvasTransientUnderlayLayer - 画布内容组顶部的高频瞬态底层
 *
 * 承载框选框、图库放置预览、静态绘制预览、智能对齐参考线与拖拽残影连线。
 * 保持在 `<g className="canvas-content">` 最前部，使高频更新不波及静态底图与主体图元层。
 */
import { memo, type CSSProperties } from "react";
import type { SmartAlignmentGuide } from "../appCoreCanvasUtilities";
import {
  areTransientUnderlayPropsEqual,
  type CanvasScopeLayerProps
} from "./layerComparators";

type EdgePreviewRoute = { edgeId: string; path: string; color?: string };

export const CanvasTransientUnderlayLayer = memo(function CanvasTransientUnderlayLayerInner({
  scope
}: CanvasScopeLayerProps) {
  const {
    marquee,
    imperativeMarqueeRectRef,
    renderLibraryPlacementPreview,
    renderInteractiveStaticDrawingPreview,
    smartAlignmentGuides,
    dragGhostEdgeRoutes,
    connectionLineStyle
  } = scope;

  return (
    <>
      <rect
        ref={imperativeMarqueeRectRef}
        className="marquee-box"
        x={marquee ? Math.min(marquee.start.x, marquee.current.x) : 0}
        y={marquee ? Math.min(marquee.start.y, marquee.current.y) : 0}
        width={marquee ? Math.abs(marquee.current.x - marquee.start.x) : 0}
        height={marquee ? Math.abs(marquee.current.y - marquee.start.y) : 0}
        style={{ display: marquee ? undefined : "none" }}
      />
      {renderLibraryPlacementPreview()}
      {renderInteractiveStaticDrawingPreview()}
      {smartAlignmentGuides.map((guide: SmartAlignmentGuide) => (
        <line
          key={guide.id}
          className={`smart-alignment-guide smart-alignment-guide-${guide.orientation}`}
          x1={guide.orientation === "vertical" ? guide.position : guide.start}
          y1={guide.orientation === "vertical" ? guide.start : guide.position}
          x2={guide.orientation === "vertical" ? guide.position : guide.end}
          y2={guide.orientation === "vertical" ? guide.end : guide.position}
          vectorEffect="non-scaling-stroke"
        />
      ))}
      {dragGhostEdgeRoutes.map((route: EdgePreviewRoute) => (
        <path
          key={`drag-ghost-edge-${route.edgeId}`}
          d={route.path}
          className="connection-line drag-ghost"
          style={
            route.color
              ? ({ "--connection-color": route.color } as CSSProperties)
              : connectionLineStyle(route.edgeId)
          }
        />
      ))}
    </>
  );
}, areTransientUnderlayPropsEqual);
