// 交流容器:布局/判定纯函数。无副作用,不依赖 React。
//
// 成员关系存成员节点的平级字段 `containerId`;容器自身 `containerId` 恒空(不允许嵌套)。
// 包围盒一律走 `calculateNodeVisualBounds`(含标签),避免容器把成员标签切掉。
//
// 锚定口径(与平台一致):`node.position` 是节点**中心**,容器真实矩形 = position ± size/2。
// (DeviceGlyph 矩形 x:-w/2、命中框、bodyVisualBoxForNode position±half 三处同源)
// 相对 import 带 .ts 扩展名:本模块被 src/export/svg.ts(Node 直载)间接引用,裸 "./model" Node ESM 解析不了
import { type ModelNode, calculateNodeVisualBounds, isAcContainerKind } from "./model.ts";

/** 容器包围成员时的四周留白 */
export const CONTAINER_PADDING = 24;
/** 容器最小尺寸(无成员或成员过少时收缩到此) */
export const CONTAINER_MIN_SIZE = { width: 180, height: 112 };

export type Rect = { x: number; y: number; width: number; height: number };
export type NodePositionPatch = { nodeId: string; position: { x: number; y: number } };

export function isAcContainerNode(node: ModelNode): boolean {
  return isAcContainerKind(node.kind);
}

/** 容器真实矩形(中心锚定口径的唯一出口):position 是中心,故四边 = position ± size/2 */
function containerRect(c: ModelNode) {
  const x1 = c.position.x - c.size.width / 2, y1 = c.position.y - c.size.height / 2;
  return { x1, y1, x2: x1 + c.size.width, y2: y1 + c.size.height };
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
  const { x1, y1, x2, y2 } = containerRect(c);
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

export type MembershipDecision = {
  /** 位置更新(容器重算 + 挤出) */
  patch: NodePositionPatch[];
  /** 容器节点更新(position/size) */
  containerUpdates: ModelNode[];
  membershipChanges: { nodeId: string; containerId: string | undefined }[];
};

/**
 * 拖动结束归属判定(判定点 = 节点中心 n.position,容器矩形按中心锚定):
 * - 非成员中心落进容器矩形 → 移入(Alt 按下则不移入)
 * - 成员 Alt 拖动 → 移出
 * - 成员非 Alt → 归属不变(容器随后重算跟随,见 enforceContainerMembership)
 * 容器自身不参与判定(不允许嵌套)。enterContainerId 取最后一个移入的目标(单节点拖动即唯一)。
 */
export function judgeContainerMembership(args: {
  nodes: ModelNode[];
  movedIds: string[];
  altKey: boolean;
}): { membershipChanges: MembershipDecision["membershipChanges"]; enterContainerId?: string } {
  const { nodes, movedIds, altKey } = args;
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const containers = nodes.filter(isAcContainerNode);
  const membershipChanges: MembershipDecision["membershipChanges"] = [];
  let enterContainerId: string | undefined;
  for (const id of movedIds) {
    const n = byId.get(id);
    if (!n || isAcContainerNode(n)) continue;
    if (n.containerId) {
      if (altKey) membershipChanges.push({ nodeId: id, containerId: undefined });
      continue;
    }
    if (altKey) continue; // Alt + 非成员 = 明确不移入
    const target = containers.find((c) => {
      const r = containerRect(c);
      return n.position.x >= r.x1 && n.position.x <= r.x2 && n.position.y >= r.y1 && n.position.y <= r.y2;
    });
    if (!target) continue;
    membershipChanges.push({ nodeId: id, containerId: target.id });
    enterContainerId = target.id;
  }
  return { membershipChanges, enterContainerId };
}

/** 面板下拉统一标签:`名称 (idx)`;idx 为空时只用名称 */
function containerOptionLabel(n: ModelNode): string {
  const idx = String(n.params?.idx ?? "").trim();
  const name = String(n.name ?? "");
  return idx ? `${name} (${idx})` : name;
}

/** 「所属容器」下拉:首项 = 无容器,其余为容器节点(label 用 `名称 (idx)`) */
export function containerSelectOptions(nodes: ModelNode[]): { label: string; value: string }[] {
  return [
    { label: "无(当前模板)", value: "" },
    ...nodes.filter(isAcContainerNode).map((c) => ({ label: containerOptionLabel(c), value: c.id })),
  ];
}

/** 「绑定到设备」下拉:候选 = 该容器的成员(容器自身不入候选) */
export function containerMemberOptions(nodes: ModelNode[], containerId: string): { label: string; value: string }[] {
  return nodes
    .filter((n) => n.containerId === containerId && !isAcContainerNode(n))
    .map((n) => ({ label: containerOptionLabel(n), value: n.id }));
}

/**
 * 归属变更后的统一出口:按当前 containerId 重算每个容器的 position/size,
 * 并把它矩形内尚未归属的节点挤出界外(成员位置不变,故 patch 只含被挤出的节点)。
 * ponytail: 容器互相重叠时各容器独立挤出,同一节点可能被两个容器各推一次(后写覆盖);真出现再说。
 */
export function enforceContainerMembership(nodes: ModelNode[]): MembershipDecision {
  const containerUpdates: ModelNode[] = [];
  const patch: NodePositionPatch[] = [];
  for (const c of nodes.filter(isAcContainerNode)) {
    const members = nodes.filter((n) => n.containerId === c.id && n.id !== c.id);
    const fitted = fitContainerToMembers(c, members);
    containerUpdates.push(fitted);
    patch.push(...ejectOutsiders(fitted, nodes));
  }
  return { patch, containerUpdates, membershipChanges: [] };
}

/**
 * 决策 → 可直接提交的节点更新列表:`patch`(被挤出的非成员)与 `containerUpdates`(容器重算)
 * **必须同时应用** —— 只应用 patch 会漏掉容器矩形,只应用 containerUpdates 会留下戳在框里的节点。
 */
export function containerDecisionNodeUpdates(nodes: ModelNode[], decision: MembershipDecision): ModelNode[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const updates = new Map<string, ModelNode>();
  for (const c of decision.containerUpdates) {
    updates.set(c.id, c);
  }
  for (const p of decision.patch) {
    const base = updates.get(p.nodeId) ?? byId.get(p.nodeId);
    if (base) {
      updates.set(p.nodeId, { ...base, position: p.position });
    }
  }
  return [...updates.values()];
}

/**
 * 面板改「所属容器」的纯计算:写入/清除 containerId(节点平级字段,不入 params),
 * 并给出需一并提交的节点更新(容器矩形重算 + 被挤出的非成员)。
 * changed=false 时无需提交(目标缺失或归属未变)。
 */
export function containerMembershipCommit(
  nodes: ModelNode[],
  nodeId: string,
  containerId: string | undefined
): { changed: boolean; updates: ModelNode[] } {
  const target = nodes.find((n) => n.id === nodeId);
  if (!target || (target.containerId ?? "") === (containerId ?? "")) {
    return { changed: false, updates: [] };
  }
  const moved = { ...target };
  if (containerId) {
    moved.containerId = containerId;
  } else {
    delete moved.containerId;
  }
  const nextNodes = nodes.map((n) => (n.id === nodeId ? moved : n));
  return { changed: true, updates: [moved, ...containerDecisionNodeUpdates(nextNodes, enforceContainerMembership(nextNodes))] };
}
