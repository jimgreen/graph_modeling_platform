// 节点操作相关代码（从 model.ts 提取到独立模块）
import type { DeviceKind, DeviceTemplate, ModelNode, Point } from "./model";
import {
  DEFAULT_MODEL_LAYER_ID,
  DEVICE_LIBRARY_BY_KIND,
  makeId,
  makeNodeNumber,
  normalizeDefaultDeviceSize,
  buildDefaultParams,
} from "./model";
import {
  createTemplateTerminals,
  ensureRoutableLineDevicePathParam,
} from "./model-routing";

// 该常量需要在 model.ts 的 STATIC_LINE_LIKE_KINDS 之前导入，
// 因此从 model-node-ops 定义并 re-export，避免循环依赖中值为 undefined
export const INTERACTIVE_STATIC_DRAWING_KINDS = [
  "static-line",
  "static-polyline",
  "static-straight-connector",
  "static-arrow-connector",
  "static-double-arrow-connector",
  "static-elbow-connector",
  "static-bezier-connector",
  "static-smoothstep-connector",
  "static-self-loop"
] as const satisfies readonly DeviceKind[];

// ===== getTemplate / createDefaultNode / createNodeFromTemplate =====

export function getTemplate(kind: DeviceKind): DeviceTemplate {
  const template = DEVICE_LIBRARY_BY_KIND.get(kind);
  if (!template) {
    throw new Error(`Unknown device kind: ${kind}`);
  }
  return template;
}

export function createDefaultNode(kind: DeviceKind, position: Point): ModelNode {
  const template = getTemplate(kind);
  return createNodeFromTemplate(template, position);
}

export function createNodeFromTemplate(template: DeviceTemplate, position: Point): ModelNode {
  const node: ModelNode = {
    id: makeId(template.kind),
    kind: template.kind,
    name: template.label,
    layerId: DEFAULT_MODEL_LAYER_ID,
    nodeNumber: makeNodeNumber(),
    acTopologyNode: 0,
    dcTopologyNode: 0,
    position,
    size: normalizeDefaultDeviceSize(template.kind, template.size),
    rotation: template.rotation ?? 0,
    scale: 1,
    scaleX: 1,
    scaleY: 1,
    terminals: createTemplateTerminals(template),
    params: buildDefaultParams(template)
  };
  return ensureRoutableLineDevicePathParam(node);
}

// ===== 静态绘制相关 =====

const INTERACTIVE_STATIC_DRAWING_KIND_SET = new Set<DeviceKind>(INTERACTIVE_STATIC_DRAWING_KINDS);
export const STATIC_DRAWING_PADDING = 8;
export const STATIC_DRAWING_MIN_SIZE = 24;

export function roundStaticDrawingCoordinate(value: number) {
  return Math.round(value * 10) / 10;
}

export function normalizeStaticDrawingPoints(points: readonly Point[]): Point[] {
  const normalized: Point[] = [];
  for (const point of points) {
    if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) {
      continue;
    }
    const next = {
      x: roundStaticDrawingCoordinate(point.x),
      y: roundStaticDrawingCoordinate(point.y)
    };
    const previous = normalized.at(-1);
    if (!previous || previous.x !== next.x || previous.y !== next.y) {
      normalized.push(next);
    }
  }
  return normalized;
}

export function isInteractiveStaticDrawingKind(kind: DeviceKind): boolean {
  return INTERACTIVE_STATIC_DRAWING_KIND_SET.has(kind);
}

export function serializeStaticDrawPoints(points: readonly Point[]): string {
  return JSON.stringify(normalizeStaticDrawingPoints(points));
}

export function parseStaticDrawPoints(value?: string): Point[] {
  if (!value) {
    return [];
  }
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return normalizeStaticDrawingPoints(
      parsed.map((item) => ({
        x: Number((item as Point).x),
        y: Number((item as Point).y)
      }))
    );
  } catch {
    return [];
  }
}
