/**
 * Phase 6 命令式高频视觉预览控制器：
 * 1. `applyImperativeMarqueeRect`：直接更新常驻 SVG `<rect className="marquee-box" />` 的几何属性，
 *    使高频 500Hz 框选拖拽全程 0 次 React 重渲染，松手时由 `marqueeCurrentRef` 一次结算；
 * 2. `applyGpuWheelZoomPreview` / `clearGpuWheelZoomPreview`：连续滚轮缩放期间直接向画布 SVG
 *    施加纯 GPU 合成变换 `transform: scale(...)`（零 SVG 宽高重排、零 React 重渲染），停手 120ms 后
 *    一次性清空变换并提交精确 `viewBox`。
 */
import type { Point } from "../model";

export type ImperativeMarqueeState = { start: Point; current: Point } | null;

/**
 * 命令式更新框选矩形 SVG 元素属性与显隐态。
 */
export function applyImperativeMarqueeRect(
  rectEl: SVGRectElement | null | undefined,
  marquee: ImperativeMarqueeState
): void {
  if (!rectEl) return;
  if (!marquee) {
    rectEl.style.display = "none";
    rectEl.setAttribute("width", "0");
    rectEl.setAttribute("height", "0");
    return;
  }
  const x = Math.min(marquee.start.x, marquee.current.x);
  const y = Math.min(marquee.start.y, marquee.current.y);
  const width = Math.abs(marquee.current.x - marquee.start.x);
  const height = Math.abs(marquee.current.y - marquee.start.y);
  rectEl.setAttribute("x", String(x));
  rectEl.setAttribute("y", String(y));
  rectEl.setAttribute("width", String(width));
  rectEl.setAttribute("height", String(height));
  rectEl.style.display = "";
}

export interface GpuWheelZoomPreviewParams {
  /** 画布世界坐标锚点 */
  anchorPoint: Point;
  /** 当前画布世界尺寸 */
  canvasBounds: { width: number; height: number };
  /** 视觉缩放倍率（>1 放大，<1 缩小），即 currentViewBox.width / targetViewBox.width */
  visualScale: number;
}

/**
 * 对画布 SVG 施加纯 GPU 合成缩放预览（以光标对应的 SVG 局部比例点为缩放原点）。
 */
export function applyGpuWheelZoomPreview(
  svgEl: SVGSVGElement | null | undefined,
  params: GpuWheelZoomPreviewParams
): void {
  if (!svgEl) return;
  const { anchorPoint, canvasBounds, visualScale } = params;
  if (!Number.isFinite(visualScale) || visualScale <= 0) return;
  const originPctX = canvasBounds.width > 0 ? (anchorPoint.x / canvasBounds.width) * 100 : 50;
  const originPctY = canvasBounds.height > 0 ? (anchorPoint.y / canvasBounds.height) * 100 : 50;
  svgEl.style.transformOrigin = `${originPctX.toFixed(4)}% ${originPctY.toFixed(4)}%`;
  svgEl.style.transform = `scale(${visualScale})`;
}

/**
 * 清除画布 SVG 上的 GPU 缩放预览样式，还原高清矢量渲染态。
 */
export function clearGpuWheelZoomPreview(svgEl: SVGSVGElement | null | undefined): void {
  if (!svgEl) return;
  if (svgEl.style.transform) svgEl.style.transform = "";
  if (svgEl.style.transformOrigin) svgEl.style.transformOrigin = "";
}
