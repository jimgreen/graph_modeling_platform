/**
 * 将内联 SVG 字符串编码为标准 UTF-8 data URL。
 * 独立为极小无副作用纯模块，避免首屏共享图标库连带静态拉入重型 `svgModelImport` 解析器。
 */
export function svgDataUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
