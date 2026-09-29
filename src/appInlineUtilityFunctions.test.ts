// appInlineUtilityFunctions 里此前零直呼的四个纯函数。
//
// 都是拖拽/连线的判定与展示层小逻辑，改错不报错 —— 只是「边没跟着动」
// 「提示前缀没去掉」「连接目标被误判为变了」这类只表现为一处不顺手的现象。
import { describe, expect, it } from "vitest";
import {
  sameConnectTarget,
  shouldDeferSingleNodeTerminalReconciliation,
  shouldPatchRouteCacheForHighFanoutMove,
  topologyWarningDisplayMessage
} from "./appExtracted/appInlineUtilityFunctions";
import {
  CANVAS_SINGLE_NODE_DRAG_SYNC_EDGE_LIMIT,
  MAX_DEFERRED_MOVE_REPAIR_CANDIDATE_EDGES
} from "./appExtracted/appCoreCanvasUtilities";
import type { Edge, ModelNode } from "./model";

function makeNode(id: string): ModelNode {
  return {
    id,
    kind: "breaker" as ModelNode["kind"],
    name: id,
    nodeNumber: "",
    acTopologyNode: 0,
    dcTopologyNode: 0,
    position: { x: 0, y: 0 },
    size: { width: 80, height: 40 },
    rotation: 0,
    scale: 1,
    terminals: [],
    params: {}
  };
}

function edges(count: number): Edge[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `e${index}`,
    sourceId: "a",
    targetId: "b"
  }));
}

// ─── sameConnectTarget ─────────────────────────────────────

describe("appInlineUtilityFunctions / sameConnectTarget", () => {
  const node = makeNode("n1");
  const target = (overrides: Record<string, unknown> = {}) => ({
    node,
    terminalId: "t1",
    point: { x: 1, y: 2 },
    ...overrides
  });

  it("两端都空 ⇒ 相等（尚未选择连接目标是常态）", () => {
    expect(sameConnectTarget(undefined, undefined)).toBe(true);
    expect(sameConnectTarget(null, null)).toBe(true);
  });

  it("只有一端有 ⇒ 不等", () => {
    expect(sameConnectTarget(target(), undefined)).toBe(false);
    expect(sameConnectTarget(undefined, target())).toBe(false);
    expect(sameConnectTarget(target(), null)).toBe(false);
  });

  it("完全相同 ⇒ 相等", () => {
    expect(sameConnectTarget(target(), target())).toBe(true);
  });

  it("node id 不同 ⇒ 不等", () => {
    expect(sameConnectTarget(target(), target({ node: makeNode("n2") }))).toBe(false);
  });

  it("terminalId 不同 ⇒ 不等（含 undefined vs 有值）", () => {
    expect(sameConnectTarget(target(), target({ terminalId: "t2" }))).toBe(false);
    expect(sameConnectTarget(target({ terminalId: undefined }), target({ terminalId: "t1" }))).toBe(false);
  });

  it("point 不同 ⇒ 不等", () => {
    expect(sameConnectTarget(target(), target({ point: { x: 9, y: 2 } }))).toBe(false);
    expect(sameConnectTarget(target(), target({ point: { x: 1, y: 9 } }))).toBe(false);
  });

  it("point 一端缺省 ⇒ 不等（除非两端都缺省）", () => {
    expect(sameConnectTarget(target({ point: undefined }), target())).toBe(false);
    expect(sameConnectTarget(target({ point: undefined }), target({ point: undefined }))).toBe(true);
  });
});

// ─── shouldDeferSingleNodeTerminalReconciliation ───────────

describe("appInlineUtilityFunctions / shouldDeferSingleNodeTerminalReconciliation", () => {
  const limit = CANVAS_SINGLE_NODE_DRAG_SYNC_EDGE_LIMIT;

  it("单节点 + 有边 + 未超限 ⇒ 延迟（走 idle 批量调和）", () => {
    expect(shouldDeferSingleNodeTerminalReconciliation(["a"], edges(1))).toBe(true);
    expect(shouldDeferSingleNodeTerminalReconciliation(["a"], edges(limit))).toBe(true);
  });

  it("零节点 ⇒ 不同步", () => {
    expect(shouldDeferSingleNodeTerminalReconciliation([], edges(1))).toBe(false);
  });

  it("多节点 ⇒ 不同步（这条只针对单节点拖拽）", () => {
    expect(shouldDeferSingleNodeTerminalReconciliation(["a", "b"], edges(1))).toBe(false);
  });

  it("无候选边 ⇒ 不同步（没东西可延迟）", () => {
    expect(shouldDeferSingleNodeTerminalReconciliation(["a"], [])).toBe(false);
  });

  it("超限 ⇒ 不同步（边太多，等不起 idle）", () => {
    expect(shouldDeferSingleNodeTerminalReconciliation(["a"], edges(limit + 1))).toBe(false);
  });

  it("限值是 12：恰好 12 延迟、13 不延迟", () => {
    expect(limit).toBe(12);
    expect(shouldDeferSingleNodeTerminalReconciliation(["a"], edges(12))).toBe(true);
    expect(shouldDeferSingleNodeTerminalReconciliation(["a"], edges(13))).toBe(false);
  });

  it("与 shouldFinalizeMovedNodeEdgesSynchronously 的分工：多节点走那边", () => {
    // 多节点 + 少量边：延迟端子调和为 false，但同步收尾为 true
    expect(shouldDeferSingleNodeTerminalReconciliation(["a", "b"], edges(1))).toBe(false);
  });
});

// ─── shouldPatchRouteCacheForHighFanoutMove ───────────────

describe("appInlineUtilityFunctions / shouldPatchRouteCacheForHighFanoutMove", () => {
  const limit = MAX_DEFERRED_MOVE_REPAIR_CANDIDATE_EDGES;

  it("零节点 ⇒ 不补丁（没动任何东西）", () => {
    expect(shouldPatchRouteCacheForHighFanoutMove([], edges(200))).toBe(false);
  });

  it("超过阈值 ⇒ 补丁（扇出太大，缓存里的路径已全失效）", () => {
    expect(shouldPatchRouteCacheForHighFanoutMove(["a"], edges(limit + 1))).toBe(true);
  });

  it("恰好等于阈值 ⇒ 不补丁（判定是 > 不是 >=）", () => {
    expect(shouldPatchRouteCacheForHighFanoutMove(["a"], edges(limit))).toBe(false);
  });

  it("零候选边 ⇒ 不补丁", () => {
    expect(shouldPatchRouteCacheForHighFanoutMove(["a"], [])).toBe(false);
  });

  it("限值是 96", () => {
    expect(limit).toBe(96);
  });
});

// ─── topologyWarningDisplayMessage ────────────────────────

describe("appInlineUtilityFunctions / topologyWarningDisplayMessage", () => {
  it("去掉中文前缀（半角冒号）", () => {
    expect(topologyWarningDisplayMessage("图上拓扑失败: 设备 A 未连接")).toBe("设备 A 未连接");
    expect(topologyWarningDisplayMessage("拓扑失败: 设备 A 未连接")).toBe("设备 A 未连接");
  });

  it("去掉中文前缀（全角冒号）", () => {
    expect(topologyWarningDisplayMessage("图上拓扑失败：设备 A 未连接")).toBe("设备 A 未连接");
    expect(topologyWarningDisplayMessage("拓扑失败：设备 A 未连接")).toBe("设备 A 未连接");
  });

  it("冒号后多个空白全部吃掉", () => {
    expect(topologyWarningDisplayMessage("拓扑失败:   设备 A")).toBe("设备 A");
    expect(topologyWarningDisplayMessage("拓扑失败:\n\t设备 A")).toBe("设备 A");
  });

  it("无前缀时原样返回", () => {
    expect(topologyWarningDisplayMessage("设备 A 未连接")).toBe("设备 A 未连接");
    expect(topologyWarningDisplayMessage("")).toBe("");
  });

  it("只剥一次：消息里第二个同款前缀保留", () => {
    expect(topologyWarningDisplayMessage("拓扑失败: 拓扑失败: 设备 A")).toBe("拓扑失败: 设备 A");
  });

  it("前缀不在开头时不剥（锚定 ^）", () => {
    expect(topologyWarningDisplayMessage("严重: 拓扑失败: 设备 A")).toBe("严重: 拓扑失败: 设备 A");
  });

  it("冒号**前**的空白也吃掉（拓扑失败 : 设备 A）", () => {
    // 正则是 `(?:图上拓扑失败|拓扑失败)\s*[:：]\s*` —— 前导 \s* 也在内。
    // 只测冒号后的空白会漏掉这一半。
    expect(topologyWarningDisplayMessage("拓扑失败 : 设备 A")).toBe("设备 A");
    expect(topologyWarningDisplayMessage("图上拓扑失败	：设备 A")).toBe("设备 A");
  });

  it("前缀缺冒号时不剥", () => {
    expect(topologyWarningDisplayMessage("拓扑失败 设备 A")).toBe("拓扑失败 设备 A");
  });
});
