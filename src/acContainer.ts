// 交流容器:布局/判定纯函数。无副作用,不依赖 React。
//
// 成员关系存成员节点的平级字段 `containerId`;容器自身 `containerId` 恒空(不允许嵌套)。
// 包围盒一律走 `calculateNodeVisualBounds`(含标签),避免容器把成员标签切掉。
//
// 锚定口径(与平台一致):`node.position` 是节点**中心**,容器真实矩形 = position ± size/2。
// (DeviceGlyph 矩形 x:-w/2、命中框、bodyVisualBoxForNode position±half 三处同源)
import { type ModelNode, calculateNodeVisualBounds, isAcContainerKind } from "./model";

/** 容器包围成员时的四周留白 */
export const CONTAINER_PADDING = 24;
/** 容器最小尺寸(无成员或成员过少时收缩到此) */
export const CONTAINER_MIN_SIZE = { width: 180, height: 112 };

export type Rect = { x: number; y: number; width: number; height: number };
export type NodePositionPatch = { nodeId: string; position: { x: number; y: number } };

export function isAcContainerNode(node: ModelNode): boolean {
  return isAcContainerKind(node.kind);
}

/** 成员视觉包围盒并集 + padding;无成员返回 null */
export function containerBoundsForMembers(members: ModelNode[]): Rect | null {
  if (members.length === 0) return null;
  let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
  for (const n of members) {
    const b = calculateNodeVisualBounds(n);
    x1 = Math.min(x1, b.left); y1 = Math.min(y1, b.top);
    x2 = Math.max(x2, b.right); y2 = Math.max(y2, b.bottom);
  }
  return {
    x: x1 - CONTAINER_PADDING, y: y1 - CONTAINER_PADDING,
    width: x2 - x1 + CONTAINER_PADDING * 2, height: y2 - y1 + CONTAINER_PADDING * 2,
  };
}

/** 容器重算为包围成员;成员为空时收缩回最小尺寸(中心不变) */
export function fitContainerToMembers(container: ModelNode, members: ModelNode[]): ModelNode {
  const r = containerBoundsForMembers(members);
  if (!r) {
    return { ...container, size: { ...CONTAINER_MIN_SIZE } };
  }
  // 矩形左上角 + 尺寸 → 中心锚定(position 是中心);钳制最小值后仍以同一左上角取中心
  const w = Math.max(r.width, CONTAINER_MIN_SIZE.width);
  const h = Math.max(r.height, CONTAINER_MIN_SIZE.height);
  return {
    ...container,
    position: { x: r.x + w / 2, y: r.y + h / 2 },
    size: { width: w, height: h },
  };
}

/**
 * 容器真实矩形内的非成员(线路 kind、其它容器、已归属某容器的节点豁免)
 * 沿最近边法向推到界外 + padding。
 * ponytail: 最小位移单轮让位,复杂穿叠时观感可能不佳;出现实际问题再升级避碰算法。
 */
export function ejectOutsiders(container: ModelNode, nodes: ModelNode[]): NodePositionPatch[] {
  const c = container;
  const x1 = c.position.x - c.size.width / 2, y1 = c.position.y - c.size.height / 2;
  const x2 = x1 + c.size.width, y2 = y1 + c.size.height;
  const out: NodePositionPatch[] = [];
  for (const n of nodes) {
    if (n.id === c.id) continue;
    if (isAcContainerNode(n)) continue;              // 其它容器豁免
    if (n.kind === "ac-line") continue;              // 线路豁免
    if (n.containerId) continue;                     // 已归属某容器(含本容器成员)
    const p = n.position;                            // 节点中心
    if (p.x < x1 || p.x > x2 || p.y < y1 || p.y > y2) continue; // 中心在外
    const dl = p.x - x1, dr = x2 - p.x, dt = p.y - y1, db = y2 - p.y;
    const m = Math.min(dl, dr, dt, db);
    let px = p.x, py = p.y;
    if (m === dl) px = x1 - CONTAINER_PADDING;
    else if (m === dr) px = x2 + CONTAINER_PADDING;
    else if (m === dt) py = y1 - CONTAINER_PADDING;
    else py = y2 + CONTAINER_PADDING;
    out.push({ nodeId: n.id, position: { x: px, y: py } });
  }
  return out;
}

/** 排序:容器恒前(=先绘制=底层);其余返回 0 保持原序(V8 sort 稳定) */
export function containerFirstComparator(a: ModelNode, b: ModelNode): number {
  const ca = isAcContainerNode(a) ? 0 : 1;
  const cb = isAcContainerNode(b) ? 0 : 1;
  return ca - cb;
}
