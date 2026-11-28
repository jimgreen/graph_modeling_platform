/**
 * CanvasStaticBackgroundLayer - 画布静态底图、网格与只读背景页层
 *
 * 该层只随画布边界、主题配色、背景图/背景页或流水线样式开关变化而重渲染，
 * 彻底隔离框选、拖拽、滚屏与悬浮覆盖层的高频重绘。
 */
import { memo } from "react";
import { themeCanvasFill } from "../../canvasTheme";
import {
  areStaticBackgroundPropsEqual,
  type CanvasStaticBackgroundLayerProps
} from "./layerComparators";

export const CanvasStaticBackgroundLayer = memo(function CanvasStaticBackgroundLayerInner({
  scope,
  electricFlowStyleMarkup
}: CanvasStaticBackgroundLayerProps) {
  const {
    SvgMarkupChunk,
    canvasThemeColors,
    canvasRenderBounds,
    themeMode,
    customTheme,
    canvasBackgroundColor,
    canvasBackgroundImageUrl,
    canvasBackgroundImageFit,
    svgImageContentMarkup,
    renderReadonlyBackgroundPage
  } = scope;

  return (
    <>
      {/* 流水线动画样式：与导出 SVG 共用 buildElectricFlowStyleMarkup 的同一份串。
          SVG <style> 是文档级作用域，放在根 <svg> 里一次即可（后续开关只改这一次注入）。
          串里的 <![CDATA[ ]]> 在**行内 SVG**（HTML 文档里的 foreign content）里由
          解析器的 CDATA 分支消费，内容原样成为文本节点 —— 与 XML 解析路径等价。 */}
      {electricFlowStyleMarkup && (
        <SvgMarkupChunk className="electric-flow-style" markup={electricFlowStyleMarkup} />
      )}
      <defs>
        <pattern id="small-grid" width="5" height="5" patternUnits="userSpaceOnUse">
          <path d="M 5 0 L 0 0 0 5" fill="none" stroke={canvasThemeColors.gridMinor} strokeWidth="0.45" />
        </pattern>
        <pattern id="large-grid" width="25" height="25" patternUnits="userSpaceOnUse">
          <rect width="25" height="25" fill="url(#small-grid)" />
          <path d="M 25 0 L 0 0 0 25" fill="none" stroke={canvasThemeColors.gridMajor} strokeWidth="0.8" />
        </pattern>
      </defs>
      {/* 画布底色：显式设置的近白色底在深色主题下必须让位给纯黑，否则切主题画布不变色 */}
      <rect
        data-canvas-background
        data-theme-background={canvasThemeColors.canvasBackground}
        width={canvasRenderBounds.width}
        height={canvasRenderBounds.height}
        fill={themeCanvasFill(themeMode, canvasBackgroundColor, customTheme?.background) || canvasThemeColors.canvasBackground}
      />
      {canvasBackgroundImageUrl && (
        <SvgMarkupChunk
          className="canvas-background-image-markup"
          markup={svgImageContentMarkup(canvasBackgroundImageUrl, {
            x: 0,
            y: 0,
            width: canvasRenderBounds.width,
            height: canvasRenderBounds.height,
            imageFit: canvasBackgroundImageFit,
            className: "canvas-background-image",
            extraAttributes: ' data-canvas-background="true" pointer-events="none"'
          })}
        />
      )}
      <rect width={canvasRenderBounds.width} height={canvasRenderBounds.height} fill="url(#large-grid)" />
      <rect
        className="canvas-boundary"
        data-theme-border={canvasThemeColors.canvasBorder}
        x="0"
        y="0"
        width={canvasRenderBounds.width}
        height={canvasRenderBounds.height}
      />
      {renderReadonlyBackgroundPage()}
    </>
  );
}, areStaticBackgroundPropsEqual);
