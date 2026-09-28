// 从 App.tsx 提取的内联工具函数（纯函数，无 React / __appScope 依赖）。

import {
  type Point,
  type SavedSchemeRecord,
  type Edge,
  lockProjectEdgeTerminals,
  normalizeProjectLayers,
  isStaticButtonCapableNode
} from "../model";
import {
  CANVAS_SINGLE_NODE_DRAG_SYNC_EDGE_LIMIT,
  MAX_DEFERRED_MOVE_REPAIR_CANDIDATE_EDGES
} from "./appCoreCanvasUtilities";

// 可选点相等比较
export const sameOptionalPoint = (first?: Point, second?: Point) =>
  (!first && !second) || (Boolean(first && second) && first?.x === second?.x && first?.y === second?.y);

// 连接目标相等比较（ConnectTarget 来自 appCoreCanvasUtilities）
export const sameConnectTarget = (first: any, second: any) =>
  (!first && !second) ||
  Boolean(
    first &&
      second &&
      first.node.id === second.node.id &&
      first.terminalId === second.terminalId &&
      sameOptionalPoint(first.point, second.point)
  );

// 可选点列表相等比较
export const sameOptionalPointList = (first?: Point[], second?: Point[]) =>
  (!first && !second) ||
  (Boolean(first && second) &&
    first?.length === second?.length &&
    first?.every((point, index) => point.x === second?.[index]?.x && point.y === second?.[index]?.y));

// 单节点拖拽结束时是否同步更新边
export const shouldFinalizeMovedNodeEdgesSynchronously = (movedNodeIds: string[], candidateEdges: Edge[]) =>
  movedNodeIds.length > 0 &&
  candidateEdges.length <= CANVAS_SINGLE_NODE_DRAG_SYNC_EDGE_LIMIT &&
  (movedNodeIds.length > 1 || candidateEdges.length === 0);

// 单节点拖拽时是否延迟端子调和
export const shouldDeferSingleNodeTerminalReconciliation = (movedNodeIds: string[], candidateEdges: Edge[]) =>
  movedNodeIds.length === 1 &&
  candidateEdges.length > 0 &&
  candidateEdges.length <= CANVAS_SINGLE_NODE_DRAG_SYNC_EDGE_LIMIT;

// 高扇出移动时是否应补丁路由缓存
export const shouldPatchRouteCacheForHighFanoutMove = (movedNodeIds: string[], candidateEdges: Edge[]) =>
  movedNodeIds.length > 0 && candidateEdges.length > MAX_DEFERRED_MOVE_REPAIR_CANDIDATE_EDGES;

// 文件名安全化
export const safeFilePart = (name: string) => name.trim().replace(/[\\/:*?"<>|]+/g, "_") || "未命名";

/** 落盘用的方案记录树：只保留 version/name/projects/children 四个键。 */
type SerializedSchemeRecord = {
  version: 1;
  name: string;
  projects: Array<{ name: string; project: ReturnType<typeof normalizeProjectLayers> }>;
  children: SerializedSchemeRecord[];
};

/**
 * 递归归一化方案记录树：只保留落盘需要的 4 个键，每层都跑一遍端子锁定 + 图层归一化。
 *
 * 抽出它是为了让 `serializeSchemeRecordForFile` **只 stringify 一次**。
 * 此前它对每个子方案做 `JSON.parse(serializeSchemeRecordForFile(child))` —— 也就是
 * 「序列化再反序列化」当深拷贝用。功能上没错（对任何可 JSON 化的值，
 * `stringify(parse(stringify(x)))` 与 `stringify(x)` 逐字节相同），但代价是
 * **总工作量 O(总大小 × 树深)**：深度 d 的树里，每个子树被它的每个祖先重新序列化一次。
 * 实测（`data/schemes/files/DOT/望道变_6.json` 的 769KB 模型）包 10 层：
 * 148ms → 67ms；纯合成的 511 节点 8 层树：6365ms → 1028ms（6.2x）。
 * 而方案树可以任意深（子方案），保存大方案时那几秒是**真卡 UI**。
 *
 * **白名单语义不能丢**：这里刻意只列 `version/name/projects/children` 四个键，
 * 不展开 scheme 本身 —— 落盘只认这四个，多余字段必须被丢掉（沿用原实现的行为）。
 */
const normalizeSchemeRecordTree = (scheme: SavedSchemeRecord): SerializedSchemeRecord => ({
  version: 1,
  name: scheme.name,
  projects: scheme.projects.map((project) => ({
    name: project.name,
    project: normalizeProjectLayers(lockProjectEdgeTerminals(project.project))
  })),
  children: (scheme.children ?? []).map((child) => normalizeSchemeRecordTree(child))
});

// 方案记录序列化为文件
export const serializeSchemeRecordForFile = (scheme: SavedSchemeRecord): string =>
  JSON.stringify(normalizeSchemeRecordTree(scheme), null, 2);

// 判断值是否为普通对象
export const isObjectRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

// 拓扑告警消息清理前缀
export const topologyWarningDisplayMessage = (message: string) =>
  message.replace(/^(?:图上拓扑失败|拓扑失败)\s*[:：]\s*/, "");

// 静态按钮节点是否启用
export const isStaticButtonEnabledForNode = (node: any) =>
  isStaticButtonCapableNode(node) && node.params.buttonEnabled === "1";

// 库包文件名时间戳
export const timestampForLibraryPackageFilename = () => {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
};
