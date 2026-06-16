import { getNodeScaleX, getNodeScaleY, normalizeScaleValue, type ModelNode, type Point } from "./model";

/** 将角度值规范化为 0-360 范围 */
function normalizeRotationDegrees(value: number) {
  return ((Math.round(value) % 360) + 360) % 360;
}

/** 将终端锚点吸附到设备最近的边中点 */
export function snapSingleTerminalAnchorToNearestSide(node: ModelNode, point: Point): Point {
  const radians = (-normalizeRotationDegrees(node.rotation) * Math.PI) / 180;
  const dx = point.x - node.position.x;
  const dy = point.y - node.position.y;
  const local = {
    x: dx * Math.cos(radians) - dy * Math.sin(radians),
    y: dx * Math.sin(radians) + dy * Math.cos(radians)
  };
  const signedWidth = node.size.width * (getNodeScaleX(node) || 1);
  const signedHeight = node.size.height * (getNodeScaleY(node) || 1);
  const candidates: Point[] = [
    { x: 0.5, y: 0 },
    { x: -0.5, y: 0 },
    { x: 0, y: 0.5 },
    { x: 0, y: -0.5 }
  ];
  let best = candidates[0];
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const candidate of candidates) {
    const candidateLocal = {
      x: candidate.x * signedWidth,
      y: candidate.y * signedHeight
    };
    const distance = (local.x - candidateLocal.x) ** 2 + (local.y - candidateLocal.y) ** 2;
    if (distance < bestDistance) {
      best = candidate;
      bestDistance = distance;
    }
  }
  return { ...best };
}

/** 按比例缩放时，将手柄位移投影到对角线方向计算缩放比例 */
export function projectedProportionalScaleFromHandleDelta({
  currentScale,
  width,
  height,
  handleXDirection,
  handleYDirection,
  deltaX,
  deltaY
}: {
  currentScale: number;
  width: number;
  height: number;
  handleXDirection?: -1 | 0 | 1;
  handleYDirection?: -1 | 0 | 1;
  deltaX: number;
  deltaY: number;
}) {
  const safeCurrentScale = Math.abs(normalizeScaleValue(currentScale, 1));
  const projectionVector = {
    x: handleXDirection ? (handleXDirection * Math.max(1, width)) / 2 : 0,
    y: handleYDirection ? (handleYDirection * Math.max(1, height)) / 2 : 0
  };
  const projectionLengthSquared = projectionVector.x ** 2 + projectionVector.y ** 2;
  if (projectionLengthSquared <= 0) {
    return safeCurrentScale;
  }
  const scaleDelta =
    (deltaX * projectionVector.x + deltaY * projectionVector.y) / projectionLengthSquared;
  return normalizeScaleValue(Math.max(0, safeCurrentScale + scaleDelta), safeCurrentScale);
}
