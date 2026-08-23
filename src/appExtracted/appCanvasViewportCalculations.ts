// 从 App.tsx 提取的视口/浮动工具栏/小地图计算。
// 模式：export function createXxx(__appScope) { ...; return (args) => value; }
// 审查 TS-REPORT：@ts-nocheck 治理——最小文件先行，补显式类型。

type AppScope = Record<string, any>;
type ScopedPoint = { x: number; y: number };
type ScopedToolbar = { x: number; y: number; width: number; height: number; scale?: number };

// 浮动工具栏边界计算
export function createFloatingToolbarBounds(__appScope: AppScope) {
  return (toolbar: ScopedToolbar) => ({
    left: toolbar.x,
    right: toolbar.x + toolbar.width,
    top: toolbar.y,
    bottom: toolbar.y + toolbar.height
  });
}

// 画布坐标转屏幕 CSS 坐标
export function createCanvasPointToSurfaceCss(__appScope: AppScope) {
  const { canvasDisplayOffsetX, canvasDisplayOffsetY, canvasScrollScale } = __appScope;
  return (point: ScopedPoint) => ({
    x: canvasDisplayOffsetX + point.x * canvasScrollScale.x,
    y: canvasDisplayOffsetY + point.y * canvasScrollScale.y
  });
}

// 旋转控制避让矩形（从画布坐标）
export function createRotateControlAvoidRectFromCanvas(__appScope: AppScope) {
  const { rotateControlAvoidRectFromCanvasPoints } = __appScope;
  return (centerX: number, topY: number) =>
    rotateControlAvoidRectFromCanvasPoints([
      { x: centerX, y: topY - 52 },
      { x: centerX, y: topY - 6 }
    ]);
}

// 浮动工具栏样式
export function createFloatingToolbarWrapperStyle(__appScope: AppScope) {
  const { floatingToolbarButtonSize, floatingToolbarScreenScale } = __appScope;
  return (toolbar: ScopedToolbar): Record<string, string> => ({
    left: String(toolbar.x),
    top: String(toolbar.y),
    width: String(toolbar.width),
    height: String(toolbar.height),
    "--canvas-floating-toolbar-button-size": `${floatingToolbarButtonSize}px`,
    "--canvas-floating-toolbar-gap": `${Math.max(2, Math.round(4 * (toolbar.scale ?? 1)))}px`,
    "--canvas-floating-toolbar-padding": `${Math.max(3, Math.round(4 * (toolbar.scale ?? 1)))}px`,
    "--canvas-floating-toolbar-radius": `${Math.max(6, Math.round(8 * (toolbar.scale ?? 1)))}px`
  });
}

// 小地图坐标映射
export function createMapPointToMinimap(__appScope: AppScope) {
  const { minimapOffsetX, minimapOffsetY, minimapScale } = __appScope;
  return (point: ScopedPoint) => ({
    x: minimapOffsetX + point.x * minimapScale,
    y: minimapOffsetY + point.y * minimapScale
  });
}