import {
  getNodeScaleX,
  getNodeScaleY,
  normalizeScaleValue,
  type ModelNode,
  type Point
} from "./model";
import { normalizeRotationDegrees } from "./formatUtils";

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

/**
 * Resize a line-segment bus as geometry rather than as a transform.
 * The dragged side follows the pointer while the opposite side remains fixed;
 * existing scale values are preserved so resizing does not become bus scaling.
 */
export function resizeLineSegmentBusGeometryFromHandleDrag({
  node,
  startPoint,
  point,
  handleXDirection = 0,
  handleYDirection = 0,
  resizeX,
  resizeY,
  minDimension = 8
}: {
  node: ModelNode;
  startPoint: Point;
  point: Point;
  handleXDirection?: -1 | 0 | 1;
  handleYDirection?: -1 | 0 | 1;
  resizeX: boolean;
  resizeY: boolean;
  minDimension?: number;
}): ModelNode {
  const inverseRadians = (-normalizeRotationDegrees(node.rotation) * Math.PI) / 180;
  const pointerDelta = {
    x: point.x - startPoint.x,
    y: point.y - startPoint.y
  };
  const localDelta = {
    x: pointerDelta.x * Math.cos(inverseRadians) - pointerDelta.y * Math.sin(inverseRadians),
    y: pointerDelta.x * Math.sin(inverseRadians) + pointerDelta.y * Math.cos(inverseRadians)
  };
  const safeScaleX = Math.abs(getNodeScaleX(node)) || 1;
  const safeScaleY = Math.abs(getNodeScaleY(node)) || 1;
  const xDirection = handleXDirection || 1;
  const yDirection = handleYDirection || 1;
  const nextWidth = resizeX
    ? Math.max(minDimension, node.size.width + (localDelta.x * xDirection) / safeScaleX)
    : node.size.width;
  const nextHeight = resizeY
    ? Math.max(minDimension, node.size.height + (localDelta.y * yDirection) / safeScaleY)
    : node.size.height;
  const localCenterShift = {
    x: resizeX ? ((nextWidth - node.size.width) * safeScaleX * xDirection) / 2 : 0,
    y: resizeY ? ((nextHeight - node.size.height) * safeScaleY * yDirection) / 2 : 0
  };
  const rotationRadians = (normalizeRotationDegrees(node.rotation) * Math.PI) / 180;
  const canvasCenterShift = {
    x: localCenterShift.x * Math.cos(rotationRadians) - localCenterShift.y * Math.sin(rotationRadians),
    y: localCenterShift.x * Math.sin(rotationRadians) + localCenterShift.y * Math.cos(rotationRadians)
  };

  return {
    ...node,
    position: {
      x: node.position.x + canvasCenterShift.x,
      y: node.position.y + canvasCenterShift.y
    },
    size: {
      width: nextWidth,
      height: nextHeight
    }
  };
}
