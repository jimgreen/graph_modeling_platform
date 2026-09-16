// 交流容器:布局/判定纯函数。无副作用,不依赖 React。
//
// 成员关系存成员节点的平级字段 `containerId`;容器自身 `containerId` 恒空(不允许嵌套)。
// 包围盒一律走 `calculateNodeVisualBounds`(含标签),避免容器把成员标签切掉。
//
// 锚定口径(与平台一致):`node.position` 是节点**中心**,容器真实矩形 = position ± size/2。
// (DeviceGlyph 矩形 x:-w/2、命中框、bodyVisualBoxForNode position±half 三处同源)
// 相对 import 带 .ts 扩展名:本模块被 src/export/svg.ts(Node 直载)间接引用,裸 "./model" Node ESM 解析不了
import { type DeviceKind, type ModelNode, AC_CONTAINER_KINDS, DEVICE_LIBRARY_BY_KIND, calculateNodeVisualBounds, createDefaultNode, isAcContainerKind, isStaticNode, isWireLikeRouteDeviceKind } from "./model.ts";

/** 容器包围成员时的**内侧**留白:容器矩形 = 成员包围盒 + 该留白(容器贴成员的紧密度) */
export const CONTAINER_PADDING = 24;
/**
 * 容器**外侧**排斥带宽度:未归属设备/节点与容器矩形的间隙 < 该值即让位(挤出 / 拖动排斥 / 落点弹回),
 * 让位后间隙 = 该值。与 CONTAINER_PADDING 语义不同(一个管「容器贴成员多紧」,一个管「容器的势力范围多大」),
 * 仅因历史原因曾共用一值 —— 改一个不得连带改另一个。
 */
export const CONTAINER_CLEARANCE = 50;
/** 容器最小尺寸(无成员或成员过少时收缩到此) */
export const CONTAINER_MIN_SIZE = { width: 180, height: 112 };

export type Rect = { x: number; y: number; width: number; height: number };
export type NodePositionPatch = { nodeId: string; position: { x: number; y: number } };

export function isAcContainerNode(node: ModelNode): boolean {
  return isAcContainerKind(node.kind);
}

/**
 * 图中存活容器 id 集合:归属字段 `containerId` 的**有效性判据**。
 * 悬空值(指向已删除的容器)在删除收尾之外仍可能来自存盘老数据/导入文件,
 * 故**判定(judgeContainerMembership)与挤出(ejectOutsiders)两个消费点必须经此集合**,
 * 不得只判 `n.containerId` 的真值 —— 只判真值会让悬空节点被当成员豁免(挤出失效、入组被短路)。
 * (其余消费点走 `containerId === <某存活容器 id>` 等值比较,悬空值天然不命中,无需经此。)
 */
function liveContainerIds(nodes: ModelNode[]): Set<string> {
  return new Set(nodes.filter(isAcContainerNode).map((n) => n.id));
}

/** 容器真实矩形(中心锚定口径的唯一出口;排斥带与内侧留白都以**此**矩形为基准):position 是中心,故四边 = position ± size/2 */
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

type Bounds4 = { left: number; right: number; top: number; bottom: number };
type Rect4 = { x1: number; y1: number; x2: number; y2: number };

/**
 * 是否需要让位:**视觉包围盒 ↔ 容器真实矩形的间隙 < CONTAINER_CLEARANCE**(等价于「矩形外扩排斥带后与包围盒相交」)。
 * 四方向枚举即全部「间隙 ≥ 排斥带」的情形 —— 任一轴任一方向已让开排斥带即无需挪动。
 * 缺 rotation/scale 的异常节点算得 NaN,一律视为无需挪动(不写出 NaN 位置)。
 * **判定(排斥/挤出)与推出共用此谓词**,同一「越界」必须同一口径。
 */
function withinClearance(b: Bounds4, r: Rect4): boolean {
  if (![b.left, b.right, b.top, b.bottom].every(Number.isFinite)) return false;
  return !(b.right <= r.x1 - CONTAINER_CLEARANCE || b.left >= r.x2 + CONTAINER_CLEARANCE ||
    b.bottom <= r.y1 - CONTAINER_CLEARANCE || b.top >= r.y2 + CONTAINER_CLEARANCE);
}

/**
 * 推出几何(包围盒口径):包围盒与容器真实矩形间隙 < CONTAINER_CLEARANCE 时,沿最近边推到**间隙 = CONTAINER_CLEARANCE**;
 * 间隙足够 → null(不挪)。候选位移取绝对值最小者,相等时按 左→右→上→下 取首选(与旧中心口径同序)。
 * 按包围盒而非中心:让位后**本体不再压框**且标签一并让开(标签参与包围盒)。
 * 返回**中心**新位置(position 是中心)。**拖动排斥(judgeContainerMembership)与挤出(ejectOutsiders)共用此单源**。
 */
function pushBoundsOutOfRect(b: Bounds4, center: { x: number; y: number }, r: Rect4): { x: number; y: number } | null {
  if (!withinClearance(b, r)) return null;
  const dl = b.right - (r.x1 - CONTAINER_CLEARANCE); // 往左推的位移量(正)
  const dr = r.x2 + CONTAINER_CLEARANCE - b.left;
  const du = b.bottom - (r.y1 - CONTAINER_CLEARANCE);
  const dd = r.y2 + CONTAINER_CLEARANCE - b.top;
  const m = Math.min(dl, dr, du, dd);
  if (m === dl) return { x: center.x - dl, y: center.y };
  if (m === dr) return { x: center.x + dr, y: center.y };
  if (m === du) return { x: center.x, y: center.y - du };
  return { x: center.x, y: center.y + dd };
}

/** 中心是否落入容器矩形(含边界)—— **入组**判定(Alt 拖入 / 落点入组)专用;排斥与挤出走包围盒口径(见 withinClearance) */
function pointInRect(r: { x1: number; y1: number; x2: number; y2: number }, p: { x: number; y: number }): boolean {
  return p.x >= r.x1 && p.x <= r.x2 && p.y >= r.y1 && p.y <= r.y2;
}

/**
 * 与容器真实矩形**间隙 < CONTAINER_CLEARANCE** 的非成员(线路 kind、静态图元、其它容器、已归属某容器的节点豁免)
 * 沿最近边推到间隙 = CONTAINER_CLEARANCE。口径是**包围盒间距**而非中心点:设备被覆盖一半才触发、
 * 推出后本体仍压框都是旧中心口径的缺陷(见 pushBoundsOutOfRect)。
 * ponytail: 最小位移单轮让位,复杂穿叠时观感可能不佳;出现实际问题再升级避碰算法。
 */
export function ejectOutsiders(container: ModelNode, nodes: ModelNode[]): NodePositionPatch[] {
  const c = container;
  const rect = containerRect(c);
  const owners = liveContainerIds(nodes);
  const out: NodePositionPatch[] = [];
  for (const n of nodes) {
    if (n.id === c.id) continue;
    if (isAcContainerNode(n)) continue;              // 其它容器豁免
    if (isWireLikeRouteDeviceKind(n.kind)) continue; // 线路豁免(全部线路 kind 单一谓词,只豁免 ac-line 会漏推其它 11 种)
    if (isStaticNode(n)) continue;                   // 静态图元豁免:装饰图元常是整画布尺寸(position = 画布中心),容器矩形必然盖住其中心,推出框外等于搬动装饰
    if (n.containerId && owners.has(n.containerId)) continue; // 已归属**存活**容器(含本容器成员);悬空值不算归属,照常挤出
    const pushed = pushBoundsOutOfRect(calculateNodeVisualBounds(n), n.position, rect);
    if (pushed) out.push({ nodeId: n.id, position: pushed });
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
 * 归属判定(入组判定点 = 节点中心 n.position;容器矩形按中心锚定):
 * - 成员 Alt 拖动 → 移出;成员非 Alt → 归属不变(容器随后重算跟随,见 enforceContainerMembership)
 * - 非成员 Alt + 中心落进容器矩形 → 移入(Alt = 双向归属变更键:拖入 / 拖出;Alt 移入**不受**排斥口径影响)
 * - 非成员非 Alt + 本体与**已有**容器矩形**间隙 < CONTAINER_CLEARANCE**(与 ejectOutsiders 同一包围盒口径,
 *   不再等中心入框)→ **弹出**(推到间隙 = CONTAINER_CLEARANCE,不写归属):拖动三条路径与
 *   非拖动入口(粘贴 / 模板落点 / 图元库放置 / control addDevice / 批量布局)统一传 `repelNonMembers`。
 *   唯一例外:目标容器是本批**新增**的(`addedContainerIds`;整组粘贴 / SVG 导入整模型重建)
 *   → 回退「落点入组」(排斥的语义是「外来设备 vs 已有容器」,同批重建不算外来)
 * - 静态图元不自动入组、也不被弹出(与 ejectOutsiders 的静态豁免同源):装饰图元常是整画布尺寸,
 *   吞成成员会把容器撑到包住整张画布,弹出则等于搬动装饰;已是成员的静态图元仍可 Alt 移出。
 * 容器自身不参与判定(不允许嵌套)。enterContainerId / exitContainerId 取最后一个移入/移出的目标
 * (单节点拖动即唯一),供调用方弹 toast。
 * 归属有效性按 liveContainerIds 判:悬空值(指向已删容器)视为**无归属**,照常参与入组判定。
 */
export function judgeContainerMembership(args: {
  nodes: ModelNode[];
  movedIds: string[];
  altKey: boolean;
  /**
   * 排斥开关:非 Alt + 非成员与**已有**容器矩形间隙 < CONTAINER_CLEARANCE(中心在框内亦然)→ 产出「弹出」patch
   * (容器与容器外设备互相排斥),而不是移入。拖动三条路径(鼠标松手 / 键盘移动)与非拖动入口
   * (commitContainerMembership:粘贴、模板落点、程序化加图元、SVG 导入;批量布局)统一传 true。
   */
  repelNonMembers?: boolean;
  /**
   * 本批**新增**的容器 id(容器与设备同批落地:整组粘贴 / SVG 导入整模型重建):落进它们按「落点入组」,
   * 不排斥 —— 排斥的语义是「外来设备 vs 已有容器」,同批重建不算外来。缺省空 = 全部容器都是已有容器
   * (拖动 / 布局 / 放置的常态)。判定**不能**用 movedIds 代替:多选拖动与布局里容器本身也在移动集内。
   */
  addedContainerIds?: Iterable<string>;
}): {
  membershipChanges: MembershipDecision["membershipChanges"];
  enterContainerId?: string;
  exitContainerId?: string;
  /** 排斥:被弹到「本体与容器矩形间隙 = CONTAINER_CLEARANCE」(沿最近边)的节点;无排斥时为空数组 */
  repelPatches: NodePositionPatch[];
} {
  const { nodes, movedIds, altKey, repelNonMembers = false, addedContainerIds } = args;
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const addedContainerIdSet = new Set(addedContainerIds ?? []);
  const containers = nodes.filter(isAcContainerNode);
  const owners = liveContainerIds(nodes);
  const membershipChanges: MembershipDecision["membershipChanges"] = [];
  const repelPatches: NodePositionPatch[] = [];
  let enterContainerId: string | undefined;
  let exitContainerId: string | undefined;
  for (const id of movedIds) {
    const n = byId.get(id);
    if (!n || isAcContainerNode(n)) continue;
    if (n.containerId && owners.has(n.containerId)) {
      if (altKey) {
        membershipChanges.push({ nodeId: id, containerId: undefined });
        exitContainerId = n.containerId;
      }
      continue;
    }
    // 静态图元不自动入组、也不参与排斥(与 ejectOutsiders 的静态豁免同源,单点在此):装饰图元常是整画布尺寸
    // (position = 画布中心),容器矩形必然盖住其中心,一旦被吞成成员容器会被撑到包住整张画布,弹出则等于搬动装饰。
    // 已是成员的静态图元仍可由上面的 Alt 分支移出 —— 豁免只管「自动入组/排斥」,不管用户显式操作。
    if (isStaticNode(n)) continue;
    // 入组判定点 = 中心落进矩形(Alt 拖入与同批新增容器的落点入组共用)
    const target = containers.find((c) => pointInRect(containerRect(c), n.position));
    if (altKey) {
      if (!target) continue;
      membershipChanges.push({ nodeId: id, containerId: target.id });
      enterContainerId = target.id;
      continue;
    }
    // 排斥只对「本批操作之外的**已有**容器」生效:目标容器是本批**新增**的(容器与设备同批落地:
    // 整组粘贴 / SVG 导入整模型重建)时,设备落进它是同批重建而非「外来设备误落」,排斥会破坏导入保真
    // (容器恒空、成员被弹飞),此时回退「落点入组」。
    // 判定键是**新增**容器而非 movedIds:多选拖动与批量布局里容器本身也在移动集内,按移动集豁免
    // 会让设备落进这些既有容器时不排斥(spec:非 Alt 落入 = 排斥)。
    if (target && (!repelNonMembers || addedContainerIdSet.has(target.id))) {
      membershipChanges.push({ nodeId: id, containerId: target.id });
      enterContainerId = target.id;
      continue;
    }
    // 图中无容器 → 无排斥可言:先短路再算包围盒(包围盒比中心点贵,且异常节点算不出)
    if (!repelNonMembers || containers.length === 0) continue;
    // 排斥:线路穿容器是常态,与 ejectOutsiders 同一豁免谓词(否则拖动一条线路会被整体弹出框外)
    if (isWireLikeRouteDeviceKind(n.kind)) continue;
    // 排斥口径 = 包围盒间距(与 ejectOutsiders 同源):中心在框内,或本体与框的间隙 < CONTAINER_CLEARANCE → 都弹
    const bounds = calculateNodeVisualBounds(n);
    const repelTarget = target ?? containers.find((c) => withinClearance(bounds, containerRect(c)));
    if (!repelTarget) continue;
    const pushed = pushBoundsOutOfRect(bounds, n.position, containerRect(repelTarget));
    if (pushed) repelPatches.push({ nodeId: id, position: pushed });
  }
  return { membershipChanges, enterContainerId, exitContainerId, repelPatches };
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
 * - `nodes` 必须是**拖动后**的节点(容器与成员均取新位置):入组判定点 = 节点中心,排斥/挤出看视觉包围盒。
 * - `movedIds` 为本次真正拖动的节点(含跟随容器平移的成员);`grabbedIds` 为**用户抓住**的节点,
 *   判定只看抓取集:**跟随者不参与**(否则「拖容器 + Alt」会被判成整组移出),
 *   而「容器与成员同被选中 + Alt 拖成员」时该成员仍要移出(不能因容器同动而豁免)。
 * - 解绑用**原** nodes 判定(containerId 尚未改写),与移出/改归属同一出口。
 * - `repelNonMembers` 由拖动路径(鼠标 / 键盘)传 true:非 Alt 拖进来的非成员被弹到与容器矩形间隙 = CONTAINER_CLEARANCE。
 */
export function applyDragContainerMembership(args: {
  nodes: ModelNode[];
  movedIds: string[];
  /** 用户真正抓住的节点(拖容器扩组前的集合);缺省 = movedIds。仅用于剔除跟随者 */
  grabbedIds?: string[];
  altKey: boolean;
  /** 见 judgeContainerMembership:拖动路径传 true(非 Alt 落入容器 → 弹出而非移入) */
  repelNonMembers?: boolean;
  /** 见 judgeContainerMembership:本批新增的容器 id(整组粘贴 / SVG 导入整模型重建);拖动 / 布局不传 */
  addedContainerIds?: Iterable<string>;
}): { updates: ModelNode[]; enterContainerId?: string; exitContainerId?: string } {
  const { nodes, movedIds, grabbedIds, altKey, repelNonMembers, addedContainerIds } = args;
  const grabbed = grabbedIds ? new Set(grabbedIds) : null;
  const judgeIds = grabbed ? movedIds.filter((id) => grabbed.has(id)) : movedIds;
  const { membershipChanges, enterContainerId, exitContainerId, repelPatches } = judgeContainerMembership({
    nodes,
    movedIds: judgeIds,
    altKey,
    repelNonMembers,
    addedContainerIds,
  });
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
  // 排斥先落位、再跑 enforce:反过来的话容器重算会把「刚弹到框外」的节点当框内非成员二次挤出(位移不可预期);
  // 且先落位后 enforce 才能保证最终状态满足「容器矩形内无非成员」不变量
  const repelById = new Map(repelPatches.map((p) => [p.nodeId, p]));
  const placed = repelById.size === 0 ? tagged : tagged.map((n) => {
    const p = repelById.get(n.id);
    if (!p) return n;
    const next = { ...n, position: p.position };
    changed.set(n.id, next);
    return next;
  });
  const withUnbind = unboundById.size === 0 ? placed : placed.map((n) => unboundById.get(n.id) ?? n);
  for (const upd of containerDecisionNodeUpdates(withUnbind, enforceContainerMembership(withUnbind))) {
    changed.set(upd.id, upd);
  }
  return { updates: [...changed.values()], enterContainerId, exitContainerId };
}

/**
 * 新增/移动节点并入图后的归属落地出口(粘贴、模板落点、图元库放置、程序化加图元、SVG 导入共用):
 * 判定 → 解绑 → 容器重算 + 挤出。返回**完整**节点数组。
 * 与拖动同口径传 `repelNonMembers`(落进**已有**容器 → 弹回框外,不写归属);
 * 容器与设备同批新增时判定侧自动回退「落点入组」(整组粘贴 / SVG 导入整模型重建,见 judgeContainerMembership)。
 * `movedIds` 为本次新增/移动的节点(入组看节点中心,排斥看视觉包围盒)。
 * 注意:原引用短路只在「图中无容器」时成立 —— 有容器时 enforce 恒产出容器重算更新(即便几何未变),
 * 故本函数不是廉价判空,不要拿返回值引用相等当「无变化」用。
 */
export function commitContainerMembership(nodes: ModelNode[], movedIds: string[]): ModelNode[] {
  if (movedIds.length === 0 || nodes.length === 0) {
    return nodes;
  }
  // 本批新增的容器 = 本批并入节点里的容器:该出口的语义就是「新增/移动节点并入图」,
  // 故 movedIds 中的容器一律是刚落地的(粘贴 / 模板落点 / SVG 导入整模型重建),落进它们算重建而非外来误落。
  // 拖动 / 布局不走本出口,它们的容器是既有容器 → 无豁免、照常排斥。
  const movedIdSet = new Set(movedIds);
  const addedContainerIds = nodes.filter((node) => movedIdSet.has(node.id) && isAcContainerNode(node)).map((node) => node.id);
  const { updates } = applyDragContainerMembership({
    nodes,
    movedIds,
    altKey: false,
    repelNonMembers: true,
    addedContainerIds
  });
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

/** 新建容器弹窗的类型选项(value/label 与图元库 label 单源,不另拷一份中文名) */
export function containerKindOptions(): { value: DeviceKind; label: string }[] {
  return AC_CONTAINER_KINDS.map((kind) => ({ value: kind, label: CONTAINER_KIND_LABELS[kind] ?? kind }));
}

/**
 * 【添加到容器】名称下拉的候选:该类型的**已有容器**(label 用 `名称 (idx)` 与面板其它下拉同源,
 * value = 容器 id;选中即加入该容器,不新建)。输入清单以外的名字 = 新建该类型容器。
 */
export function containerNameOptions(kind: DeviceKind, nodes: ModelNode[]): { label: string; value: string }[] {
  return nodes
    .filter((n) => n.kind === kind && isAcContainerNode(n))
    .map((c) => ({ label: containerOptionLabel(c), value: c.id }));
}

/** 弹窗草稿:名称下拉的取值决定提交口径 —— `containerId` 非空 = 加入该容器;否则按 `name` 新建 */
export type ContainerDraft = { kind: DeviceKind; name: string; containerId: string };

/**
 * 【添加到容器】弹窗「选类型」的唯一出口(也用作弹窗初值):kind + 名称下拉值**一起**换。
 * 该类型已有容器 → 优先选中第一个(加入它,保留旧弹窗「有容器时默认加到第一个」的行为);
 * 无 → 名称预填该类型默认名(切类型后显示与落库同名,可直接点确定创建)。
 * 名称框是受控的,显示值必须经此出口取得 —— 只改 kind 不改名(或命令式改 DOM)会让
 * 显示停在旧默认名、落库却是新默认名,界面与数据分叉;不清 containerId 则会切类型后仍加入旧类型的容器。
 */
export function containerKindSwitch(kind: DeviceKind, existing: ModelNode[]): ContainerDraft {
  const first = existing.find((n) => n.kind === kind && isAcContainerNode(n));
  return first
    ? { kind, name: String(first.name ?? ""), containerId: String(first.id) }
    : { kind, name: defaultContainerName(kind, existing), containerId: "" };
}

/**
 * 名称下拉「选中某项」的唯一出口:value 命中已有容器 id → 加入该容器(name 同步为该容器名,
 * 便于提交兜底);否则视为用户新输入的名字 → 新建该类型容器。
 */
export function containerNamePick(value: string, kind: DeviceKind, nodes: ModelNode[]): ContainerDraft {
  const hit = nodes.find((n) => n.id === value && isAcContainerNode(n));
  return hit
    ? { kind, name: String(hit.name ?? ""), containerId: String(hit.id) }
    : { kind, name: value, containerId: "" };
}

/**
 * 名称下拉「输入」出口:非空输入即视为新名并清空已选容器 —— 直接点确定也按新名新建,
 * 不必先点下拉里的「新建」项(否则输入会静默丢弃、落库回默认名)。选中已有容器则走 containerNamePick 复位。
 */
export function containerNameSearch(value: string, draft: ContainerDraft): ContainerDraft {
  const name = value.trim();
  return name ? { ...draft, name, containerId: "" } : draft;
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

/**
 * 半程 enforce:只重算容器几何(成员增删后收缩/扩展),**不挤出**非成员。
 * 删除类路径(删节点/剪切/删图层/control)专用 —— 这些路径上「刚散出的成员」就落在容器矩形附近,
 * 全量 enforce 会把它们顺手推出框外,而口径是「成员散出后保留原位」。
 * (拖动/粘贴等路径仍走全量 enforceContainerMembership:那里挤出正是要的效果)
 */
export function refitContainersOnly(nodes: ModelNode[]): ModelNode[] {
  return enforceContainerMembership(nodes).containerUpdates;
}

/**
 * 变换(旋转/缩放)提交后的容器跟随:重算容器几何以重新包住成员的**新**包围盒
 * (旋转/缩放会改视觉包围盒,不重算则容器矩形停在旧几何上,直到下一次任意 enforce 才自愈)。
 * 与删除类路径同走半程口径(只重算容器、**不挤出**非成员):变换是刚体操作,
 * 「把谁的邻居推出框外」不是这次变换的意图,挤出仍只属拖动/粘贴等入口。
 * - `transformedIds` 中的容器自身**跳过** —— 容器矩形来自用户这次变换(缩放容器)的意图,
 *   用成员包围盒覆盖回去等于把用户的缩放撤销掉。
 * - 只产出几何确有变化的容器(逐值比较):交互提交路径不并入空补丁。
 */
export function refitContainersAfterTransform(nodes: ModelNode[], transformedIds: Iterable<string>): ModelNode[] {
  const transformed = new Set(transformedIds);
  const byId = new Map(nodes.map((n) => [n.id, n]));
  return refitContainersOnly(nodes).filter((fitted) => {
    if (transformed.has(fitted.id)) return false;
    const current = byId.get(fitted.id);
    return Boolean(current) &&
      (current!.position.x !== fitted.position.x ||
        current!.position.y !== fitted.position.y ||
        current!.size.width !== fitted.size.width ||
        current!.size.height !== fitted.size.height);
  });
}

// ─── 删除容器收尾:成员归属不悬空 ─────────────────────────────────────────────
// spec「其它交互边界」:删除容器 → 成员 containerId 全清(成员保留),确认框提示「N 个成员将散出」。
// 不清会留下悬空值随保存持久化,并被 liveContainerIds 之外的旧真值判断静默豁免。

/**
 * 删除确认文案:删除集内**有存活成员**的容器逐个列出;无需确认(无成员 / 成员同批删除 / 未删容器)时返回 null。
 * 成员与容器同批删除 → 成员随容器一起删,不存在「散出」,故不计入。
 */
export function containerDeletionWarning(nodes: ModelNode[], deletedIds: Iterable<string>): string | null {
  const deleting = new Set(deletedIds);
  const parts: string[] = [];
  for (const c of nodes) {
    if (!deleting.has(c.id) || !isAcContainerNode(c)) continue;
    const scattered = nodes.filter((n) => n.containerId === c.id && n.id !== c.id && !deleting.has(n.id)).length;
    if (scattered === 0) continue;
    parts.push(`容器「${String(c.name ?? "")}」内有 ${scattered} 个成员`);
  }
  if (parts.length === 0) return null;
  return `${parts.join("；")}，删除后成员将散出（不随容器删除）。确认删除？`;
}

/**
 * 删除收尾:被删容器的成员清空 `containerId`(成员本身保留)。返回**需提交的存活节点更新**,
 * 供调用方并进本次删除提交(单一撤销单元)。删除集不含容器、或成员归属的是存活容器时返回空数组。
 * 注意喂进来的是**删除前**的 nodes —— 删除后容器已不在,无从反推谁曾是它的成员。
 */
export function containerDeletionFinalize(nodes: ModelNode[], deletedIds: Iterable<string>): ModelNode[] {
  const deleting = new Set(deletedIds);
  const deletedContainerIds = new Set(
    nodes.filter((n) => deleting.has(n.id) && isAcContainerNode(n)).map((n) => n.id)
  );
  if (deletedContainerIds.size === 0) return [];
  const out: ModelNode[] = [];
  for (const n of nodes) {
    if (deleting.has(n.id) || !n.containerId || !deletedContainerIds.has(n.containerId)) continue;
    const next = { ...n };
    delete next.containerId;
    out.push(next);
  }
  return out;
}
