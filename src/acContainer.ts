// 交流容器:布局/判定纯函数。无副作用,不依赖 React。
//
// 成员关系存成员节点的平级字段 `containerId`;容器自身 `containerId` 恒空(不允许嵌套)。
// 包围盒一律走 `calculateNodeVisualBounds`(含标签),避免容器把成员标签切掉。
//
// 锚定口径(与平台一致):`node.position` 是节点**中心**,容器真实矩形 = position ± size/2。
// (DeviceGlyph 矩形 x:-w/2、命中框、bodyVisualBoxForNode position±half 三处同源)
// 相对 import 带 .ts 扩展名:本模块被 src/export/svg.ts(Node 直载)间接引用,裸 "./model" Node ESM 解析不了
import { type DeviceKind, type ModelNode, AC_CONTAINER_KINDS, DEVICE_LIBRARY_BY_KIND, calculateNodeVisualBounds, createDefaultNode, isAcContainerKind, isStaticNode, isWireLikeRouteDeviceKind } from "./model.ts";

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
    if (isWireLikeRouteDeviceKind(n.kind)) continue; // 线路豁免(全部线路 kind 单一谓词,只豁免 ac-line 会漏推其它 11 种)
    if (isStaticNode(n)) continue;                   // 静态图元豁免:装饰图元常是整画布尺寸(position = 画布中心),容器矩形必然盖住其中心,推出框外等于搬动装饰
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

/**
 * 拖动整组:拖动集合含容器时把该容器的成员一并纳入(容器在前,成员按 nodes 顺序),
 * 使成员随容器一起平移(相对位置不变),其连线也随拖动进入候选集。
 * 拖动集合里没有容器(或无成员)时**原样返回**(同一引用),调用方无需判空。
 */
export function containerDragGroup(nodes: ModelNode[], draggedIds: string[]): string[] {
  const dragged = new Set(draggedIds);
  const followers = nodes.filter((n) => !dragged.has(n.id) && n.containerId && dragged.has(n.containerId));
  return followers.length === 0 ? draggedIds : [...draggedIds, ...followers.map((n) => n.id)];
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
 * 拖动结束的归属落地(纯函数,供画布拖动提交调用):
 * 判定 → 写/清 containerId → 离开者解绑原关口容器 → 容器重算 + 挤出非成员。
 * 返回**需提交的节点更新**(变更集),调用方并入本次拖动提交,保持单一撤销单元。
 * - `nodes` 必须是**拖动后**的节点(容器与成员均取新位置):判定点 = 节点中心。
 * - `movedIds` 为本次真正拖动的节点(含跟随容器平移的成员);`grabbedIds` 为**用户抓住**的节点,
 *   判定只看抓取集:**跟随者不参与**(否则「拖容器 + Alt」会被判成整组移出),
 *   而「容器与成员同被选中 + Alt 拖成员」时该成员仍要移出(不能因容器同动而豁免)。
 * - 解绑用**原** nodes 判定(containerId 尚未改写),与移出/改归属同一出口。
 */
export function applyDragContainerMembership(args: {
  nodes: ModelNode[];
  movedIds: string[];
  /** 用户真正抓住的节点(拖容器扩组前的集合);缺省 = movedIds。仅用于剔除跟随者 */
  grabbedIds?: string[];
  altKey: boolean;
}): { updates: ModelNode[]; enterContainerId?: string } {
  const { nodes, movedIds, grabbedIds, altKey } = args;
  const grabbed = grabbedIds ? new Set(grabbedIds) : null;
  const judgeIds = grabbed ? movedIds.filter((id) => grabbed.has(id)) : movedIds;
  const { membershipChanges, enterContainerId } = judgeContainerMembership({ nodes, movedIds: judgeIds, altKey });
  const changeById = new Map(membershipChanges.map((c) => [c.nodeId, c]));
  const changed = new Map<string, ModelNode>();
  const unboundById = new Map(
    clearGatewayBindingForLeavingMembers(
      nodes,
      membershipChanges.filter((c) => !c.containerId).map((c) => c.nodeId),
      undefined
    ).map((n) => [n.id, n])
  );
  for (const [id, n] of unboundById) changed.set(id, n);
  const tagged = membershipChanges.length === 0 ? nodes : nodes.map((n) => {
    const change = changeById.get(n.id);
    if (!change) return n;
    const next = { ...n };
    if (change.containerId) next.containerId = change.containerId;
    else delete next.containerId;
    changed.set(n.id, next);
    return next;
  });
  const withUnbind = unboundById.size === 0 ? tagged : tagged.map((n) => unboundById.get(n.id) ?? n);
  for (const upd of containerDecisionNodeUpdates(withUnbind, enforceContainerMembership(withUnbind))) {
    changed.set(upd.id, upd);
  }
  return { updates: [...changed.values()], enterContainerId };
}

/**
 * 新增/移动节点并入图后的归属落地出口(粘贴、模板落点、程序化加图元、SVG 导入共用):
 * 判定(中心落入容器 → 移入)→ 解绑 → 容器重算 + 挤出。返回**完整**节点数组;
 * `movedIds` 为本次新增/移动的节点(判断点 = 节点中心)。
 * 注意:原引用短路只在「图中无容器」时成立 —— 有容器时 enforce 恒产出容器重算更新(即便几何未变),
 * 故本函数不是廉价判空,不要拿返回值引用相等当「无变化」用。
 */
export function commitContainerMembership(nodes: ModelNode[], movedIds: string[]): ModelNode[] {
  if (movedIds.length === 0 || nodes.length === 0) {
    return nodes;
  }
  const { updates } = applyDragContainerMembership({ nodes, movedIds, altKey: false });
  return updates.length === 0 ? nodes : withNodeUpdates(nodes, updates);
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
  // 离开原容器的解绑走同一出口(清空归属 = 移出,改归属 = 换目标):面板路径与右键路径不得分叉
  const unboundById = new Map(
    clearGatewayBindingForLeavingMembers(nodes, [nodeId], containerId).map((n) => [n.id, n])
  );
  const nextNodes = nodes.map((n) => (n.id === nodeId ? moved : (unboundById.get(n.id) ?? n)));
  return { changed: true, updates: [moved, ...containerDecisionNodeUpdates(nextNodes, enforceContainerMembership(nextNodes))] };
}

/** 容器 kind → 中文默认名基(派生自内置库 label,单源;不落库的 kind 兜底为 kind 本身) */
export const CONTAINER_KIND_LABELS: Record<string, string> = Object.fromEntries(
  AC_CONTAINER_KINDS.map((kind) => [kind, DEVICE_LIBRARY_BY_KIND.get(kind)?.label ?? kind])
);

/** 新建容器默认名:「中文名 + 同类型计数 + 1」(如画布已有 2 个虚拟电厂 → 虚拟电厂3) */
export function defaultContainerName(kind: DeviceKind, existing: ModelNode[]): string {
  const label = CONTAINER_KIND_LABELS[kind] ?? kind;
  const count = existing.filter((n) => n.kind === kind).length;
  return `${label}${count + 1}`;
}

/**
 * 新建容器节点(纯函数):位置/尺寸 = 包围成员 + padding(中心锚定),params.idx 由调用方
 * 以 assignPermanentDeviceIndex 同源分配器给出。复用 fitContainerToMembers 保证
 * 与拖动后的容器重算同一条几何口径;无成员时收缩到最小尺寸。
 */
export function buildNewContainer(kind: DeviceKind, name: string, members: ModelNode[], nextIdx: string): ModelNode {
  const base = createDefaultNode(kind, { x: 0, y: 0 });
  const fitted = fitContainerToMembers({ ...base, name }, members);
  return { ...fitted, params: { ...fitted.params, idx: nextIdx } };
}

// ─── 右键菜单:选中口径(菜单可见性与工厂提交共用同一来源) ─────────────────

/** 选中里的普通图元 id(容器自动忽略,不支持嵌套);【添加到容器】用之 */
export function containerMemberIdsFromSelection(nodes: ModelNode[], selectedIds: string[]): string[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  return selectedIds.filter((id) => {
    const n = byId.get(id);
    return Boolean(n) && !isAcContainerNode(n!);
  });
}

/** 选中里已归属某容器的成员 id;【移出容器】用之 */
export function containerAssignedIdsFromSelection(nodes: ModelNode[], selectedIds: string[]): string[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  return selectedIds.filter((id) => Boolean(byId.get(id)?.containerId));
}

/** 把节点更新列表并回节点数组(同 id 覆盖),新增节点则忽略。归属入口提交后取「新图」喂量测归一化时复用 */
export function withNodeUpdates(nodes: ModelNode[], updates: ModelNode[]): ModelNode[] {
  const byId = new Map(updates.map((n) => [n.id, n]));
  return nodes.map((n) => byId.get(n.id) ?? n);
}

/**
 * 成员离开原容器的统一规则:原容器是关口容器且其绑定设备正是该成员 → 解绑 + 关关口。
 * 移出(去无容器)与改归属(去别的容器)共用,防「改归属后原容器留下悬空 bound_device_id」。
 * 判定必须用**原** nodes:成员改归属时 containerId 已被改写,拿新数组判会漏。
 * toContainerId === 原容器 id 表示没离开;绑定的是别的设备、或该设备本就不是本容器成员 → 不误伤。
 * 本函数只写 params;容器量测组的删除由调用方(移出/改归属/Alt 拖出各工厂)随归一化出口收敛。
 */
export function clearGatewayBindingForLeavingMembers(
  nodes: ModelNode[],
  leavingIds: Iterable<string>,
  toContainerId: string | undefined
): ModelNode[] {
  const leaving = new Set(leavingIds);
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const out: ModelNode[] = [];
  for (const c of nodes) {
    if (!isAcContainerNode(c)) continue;
    const bound = String(c.params?.bound_device_id ?? "");
    if (!leaving.has(bound) || toContainerId === c.id) continue;
    if (byId.get(bound)?.containerId !== c.id) continue;
    out.push({ ...c, params: { ...c.params, bound_device_id: "", is_gateway: "0" } });
  }
  return out;
}

/** 全部成员已在目标容器内(且容器已存在)→ 提交无意义,对齐 containerMembershipCommit 的 changed=false 短路 */
export function containerAddIsNoop(nodes: ModelNode[], containerId: string, memberIds: string[]): boolean {
  if (!nodes.some((n) => n.id === containerId)) {
    return false; // 新容器必然有变化
  }
  const byId = new Map(nodes.map((n) => [n.id, n]));
  return memberIds.every((id) => byId.get(id)?.containerId === containerId);
}

/**
 * 添加到容器:成员打 containerId,并整体重算容器几何(容器矩形 + 挤出非成员)。
 * container 不在 nodes 中时插到末尾(新建);返回**完整** nextNodes(含新容器),供 setGraphArrays 提交。
 * 成员已在别的容器 → 视作改归属,用 enforceContainerMembership 一并收缩原容器。
 */
export function applyAddToAcContainer(nodes: ModelNode[], container: ModelNode, memberIds: string[]): ModelNode[] {
  const members = new Set(memberIds.filter((id) => {
    const n = nodes.find((candidate) => candidate.id === id);
    return Boolean(n) && !isAcContainerNode(n!);
  }));
  // 改归属:离开原容器的成员先按统一规则解绑原关口容器(与移出同一出口)
  const unboundById = new Map(
    clearGatewayBindingForLeavingMembers(nodes, members, container.id).map((n) => [n.id, n])
  );
  const withBindings = nodes.map((n) => unboundById.get(n.id) ?? n);
  const base = nodes.some((n) => n.id === container.id)
    ? withBindings.map((n) => (n.id === container.id ? container : n))
    : [...withBindings, container];
  const tagged = base.map((n) =>
    members.has(n.id) && !isAcContainerNode(n) ? { ...n, containerId: container.id } : n
  );
  return withNodeUpdates(tagged, containerDecisionNodeUpdates(tagged, enforceContainerMembership(tagged)));
}

/**
 * 移出容器:清成员 containerId;若某关口容器的绑定设备正是被移出者,一并解绑 + 关关口
 * (容器量测组同步由调用方随归一化出口收敛)。
 * 返回**变更节点**(成员 + 解绑的容器 + 重算后的容器矩形与被挤出的非成员),供 patchGraphNodes 单次提交。
 */
export function applyRemoveFromAcContainer(nodes: ModelNode[], memberIds: string[]): ModelNode[] {
  const leaving = new Set(memberIds.filter((id) => nodes.some((n) => n.id === id && n.containerId)));
  const changed = new Map<string, ModelNode>();
  const cleared = nodes.map((n) => {
    if (!leaving.has(n.id)) return n;
    const moved = { ...n };
    delete moved.containerId;
    changed.set(n.id, moved);
    return moved;
  });
  const unboundById = new Map(
    clearGatewayBindingForLeavingMembers(nodes, leaving, undefined).map((n) => [n.id, n])
  );
  const unbound = cleared.map((n) => {
    const next = unboundById.get(n.id);
    if (!next) return n;
    changed.set(n.id, next);
    return next;
  });
  for (const upd of containerDecisionNodeUpdates(unbound, enforceContainerMembership(unbound))) {
    changed.set(upd.id, upd); // 容器重算覆盖(解绑后的 params 已随容器节点带过来)
  }
  return [...changed.values()];
}
