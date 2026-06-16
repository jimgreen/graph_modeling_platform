// 格式化辅助函数

export function normalizeRotationDegrees(value: number) {
  return ((Math.round(value) % 360) + 360) % 360;
}

export const formatStatusNumber = (value: number) => {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
};

export const formatInspectorScaleValue = (value: number) => Number.isFinite(value) ? value.toFixed(3) : "1.000";

export const formatStatusScalePercent = (value: number) => `${formatStatusNumber(value * 100)}%`;

export const formatStatusRotationDegrees = (value: number) => `${formatStatusNumber(normalizeRotationDegrees(value))}°`;
