/**
 * 主题取色适配层。
 *
 * 把 model.ts 里的取色 API 包一层：调用点多传一个 `themeMode` 就能拿到当前主题该用的颜色。
 * `themeMode` 缺省为浅色，因此所有旧调用点行为不变。
 */
import {
  DEFAULT_COLOR_PALETTE,
  getConnectionStrokeColor as getConnectionStrokeColorBase,
  getDeviceStrokeColor as getDeviceStrokeColorBase,
  getTerminalDisplayColor as getTerminalDisplayColorBase,
  type ColorDisplayMode,
  type ColorPalette,
  type ColorThemeMode
} from "./model";
import {
  canvasThemeColorsFor,
  themeCanvasBackground,
  type CanvasThemeColors,
  type CanvasThemeMode
} from "./canvasTheme";

export type { ColorThemeMode };

/** 把任意输入归一成配色主题（只有 dark 是深色）。 */
export function themeModeOf(value: unknown): ColorThemeMode {
  return value === "dark" ? "dark" : "light";
}

/** 当前主题下的画布配色表（底色、网格、文本、辅助元素）。 */
export function themedCanvasColors(themeMode: unknown): CanvasThemeColors {
  return canvasThemeColorsFor(themeModeOf(themeMode) as CanvasThemeMode);
}

/** 当前主题下的画布底色（浅色纯白 / 深色纯黑）。 */
export function themedCanvasBackground(themeMode: unknown): string {
  return themeCanvasBackground(themeModeOf(themeMode) as CanvasThemeMode);
}

/** 端子显示色（能流 / 电压等级两模式）。 */
export function themedTerminalDisplayColor(
  node: never,
  terminal: never,
  mode: ColorDisplayMode,
  palette: ColorPalette = DEFAULT_COLOR_PALETTE,
  themeMode: unknown = "light"
): string {
  return getTerminalDisplayColorBase(node, terminal, mode, palette, themeModeOf(themeMode) as never);
}

/** 连线描边色。 */
export function themedConnectionStrokeColor(
  edge: never,
  nodeById: never,
  mode: ColorDisplayMode,
  palette: ColorPalette = DEFAULT_COLOR_PALETTE,
  themeMode: unknown = "light"
): string {
  return getConnectionStrokeColorBase(edge, nodeById, mode, palette, themeModeOf(themeMode) as never);
}

/** 图元描边色。 */
export function themedDeviceStrokeColor(
  node: never,
  mode: ColorDisplayMode,
  palette: ColorPalette = DEFAULT_COLOR_PALETTE,
  themeMode: unknown = "light"
): string {
  return getDeviceStrokeColorBase(node, mode, palette, themeModeOf(themeMode) as never);
}

/**
 * 量测文本颜色。
 *
 * 量测的 `display.color` 是**保存进模型的数据**（默认 `#334155` 深灰），按浅色画布设计。
 * 深色画布上它几乎不可见，而它又不像图元填充那样能被主题层“视为未设置”——
 * 用户可能真的手动设过颜色。所以这里只替换**默认/近黑**的那批值：
 * 深色下把「按浅底选的深色字」整体抬到浅色字，用户显式设过的彩色（红/绿/蓝等）原样保留。
 */
const MEASUREMENT_DEFAULT_TEXT_DARK = "#e2e8f0";

/** 判断一个颜色是否“按浅色画布选的深色文本”（低亮度 + 低饱和度）。 */
function isDarkInkColor(color: string): boolean {
  const value = String(color ?? "").trim();
  const match = value.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!match) {
    return false;
  }
  const hex = match[1].length === 3
    ? match[1].split("").map((ch) => ch + ch).join("")
    : match[1];
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  // 亮度（BT.601 近似）：低于 0.45 才算“深”。
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  if (luminance >= 0.45) {
    return false;
  }
  // 饱和度：饱和的彩色（红/绿/蓝）是用户**有意**选的，黑底上依然醒目，不能改；
  // 只有接近灰的深色才是“按白底配的墨色”，黑底上会消失。
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const saturation = max === 0 ? 0 : (max - min) / max;
  return saturation < 0.55;
}

export function themedMeasurementTextColor(color: string, themeMode: unknown = "light"): string {
  if (themeModeOf(themeMode) !== "dark") {
    return color;
  }
  return isDarkInkColor(color) ? MEASUREMENT_DEFAULT_TEXT_DARK : color;
}
