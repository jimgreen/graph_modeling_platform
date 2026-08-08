// @ts-nocheck
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

// 方案记录序列化为文件
export const serializeSchemeRecordForFile = (scheme: SavedSchemeRecord): string =>
  JSON.stringify(
    {
      version: 1,
      name: scheme.name,
      projects: scheme.projects.map((project) => ({
        name: project.name,
        project: normalizeProjectLayers(lockProjectEdgeTerminals(project.project))
      })),
      children: (scheme.children ?? []).map((child): unknown => JSON.parse(serializeSchemeRecordForFile(child)))
    },
    null,
    2
  );

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
