// 格式化辅助函数

export function normalizeRotationDegrees(value: number) {
  return ((Math.round(value) % 360) + 360) % 360;
}

/** 角度转弧度 */
export const degreesToRadians = (degrees: number) => (degrees * Math.PI) / 180;

/** 安全获取有限数值，无效时返回 fallback */
export function finiteNumber(value: unknown, fallback: number): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

export const formatStatusNumber = (value: number) => {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
};

export const formatInspectorScaleValue = (value: number) => Number.isFinite(value) ? value.toFixed(3) : "1.000";

export const formatStatusScalePercent = (value: number) => `${formatStatusNumber(value * 100)}%`;

export const formatStatusRotationDegrees = (value: number) => `${formatStatusNumber(normalizeRotationDegrees(value))}°`;
