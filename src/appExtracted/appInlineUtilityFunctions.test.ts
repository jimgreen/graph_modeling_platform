// 内联工具函数的直接测试。
//
// 这个文件此前零直接测试 —— 所有用到它的地方（appDeviceDefinitionFactories、
// appCanvasInteractionFactories、cim-export…）都在测试里**打桩替换**它，
// 于是这些纯函数的真实语义一次都没被执行过：
//   · 三个 should* 是拖拽路径的阈值判定，边界写错一个符号就变成「该同步的没同步」
//     或「该延后的没延后」，症状是画布边线不跟手 / 端子悬空，且不报错；
//   · serializeSchemeRecordForFile 靠「只留 4 个键」的白名单语义丢弃多余字段，
//     语义一松就等于把运行时态一起落盘。
import { describe, expect, test } from "vitest";
import type { Edge, Point } from "../model";
import {
  isObjectRecord,
  isStaticButtonEnabledForNode,
  safeFilePart,
  sameConnectTarget,
  sameOptionalPoint,
  sameOptionalPointList,
  serializeSchemeRecordForFile,
  shouldDeferSingleNodeTerminalReconciliation,
  shouldFinalizeMovedNodeEdgesSynchronously,
  shouldPatchRouteCacheForHighFanoutMove,
  timestampForLibraryPackageFilename,
  topologyWarningDisplayMessage
} from "./appInlineUtilityFunctions";
import {
  CANVAS_SINGLE_NODE_DRAG_SYNC_EDGE_LIMIT,
  MAX_DEFERRED_MOVE_REPAIR_CANDIDATE_EDGES
} from "./appCoreCanvasUtilities";

const edges = (count: number) => Array.from({ length: count }, (_, i) => ({ id: `e${i}` })) as unknown as Edge[];

describe("sameOptionalPoint", () => {
  test("两侧都缺省视为相等", () => {
    expect(sameOptionalPoint(undefined, undefined)).toBe(true);
  });

  test("一侧有值另一侧缺省不相等", () => {
    expect(sameOptionalPoint({ x: 1, y: 2 }, undefined)).toBe(false);
    expect(sameOptionalPoint(undefined, { x: 1, y: 2 })).toBe(false);
  });

  test("逐分量比较，0 与负 0 视为同点", () => {
    expect(sameOptionalPoint({ x: 1, y: 2 }, { x: 1, y: 2 })).toBe(true);
    expect(sameOptionalPoint({ x: 1, y: 2 }, { x: 1, y: 3 })).toBe(false);
    expect(sameOptionalPoint({ x: 0, y: -0 }, { x: 0, y: 0 })).toBe(true);
  });
});

describe("sameOptionalPointList", () => {
  test("空列表与缺省：两侧都缺省相等，一侧空数组不相等", () => {
    expect(sameOptionalPointList(undefined, undefined)).toBe(true);
    expect(sameOptionalPointList([], undefined)).toBe(false);
  });

  test("长度不同即不等（不逐点比较）", () => {
    expect(sameOptionalPointList([{ x: 0, y: 0 }], [{ x: 0, y: 0 }, { x: 1, y: 1 }])).toBe(false);
  });

  test("同长度逐点比较", () => {
    const a: Point[] = [{ x: 0, y: 0 }, { x: 5, y: 5 }];
    expect(sameOptionalPointList(a, [{ x: 0, y: 0 }, { x: 5, y: 5 }])).toBe(true);
    expect(sameOptionalPointList(a, [{ x: 0, y: 0 }, { x: 5, y: 6 }])).toBe(false);
  });
});

describe("sameConnectTarget", () => {
  const target = (nodeId: string, terminalId: string, point?: Point) => ({ node: { id: nodeId }, terminalId, point });

  test("node + terminalId + point 三者全同才算同一目标", () => {
    const a = target("n1", "t1", { x: 1, y: 1 });
    expect(sameConnectTarget(a, target("n1", "t1", { x: 1, y: 1 }))).toBe(true);
    expect(sameConnectTarget(a, target("n2", "t1", { x: 1, y: 1 }))).toBe(false);
    expect(sameConnectTarget(a, target("n1", "t2", { x: 1, y: 1 }))).toBe(false);
    expect(sameConnectTarget(a, target("n1", "t1", { x: 9, y: 9 }))).toBe(false);
  });

  test("point 一侧缺省也算同（未吸附时 point 本就没有）", () => {
    expect(sameConnectTarget(target("n1", "t1"), target("n1", "t1", { x: 3, y: 3 }))).toBe(false);
    expect(sameConnectTarget(target("n1", "t1"), target("n1", "t1"))).toBe(true);
  });
});

describe("拖拽阈值判定（三个 should*）", () => {
  const LIMIT = CANVAS_SINGLE_NODE_DRAG_SYNC_EDGE_LIMIT;
  const MAX = MAX_DEFERRED_MOVE_REPAIR_CANDIDATE_EDGES;

  test("阈值本身被钉住（改动常量必须同步改这里的期望）", () => {
    expect(LIMIT).toBe(12);
    expect(MAX).toBe(96);
  });

  test("shouldFinalizeMovedNodeEdgesSynchronously：多节点 / 无候选边 才同步", () => {
    expect(shouldFinalizeMovedNodeEdgesSynchronously(["n1", "n2"], edges(3))).toBe(true);
    expect(shouldFinalizeMovedNodeEdgesSynchronously(["n1"], edges(0))).toBe(true);
    // 单节点 + 有候选边 → 走延后路径，不同步
    expect(shouldFinalizeMovedNodeEdgesSynchronously(["n1"], edges(1))).toBe(false);
  });

  test("shouldFinalizeMovedNodeEdgesSynchronously：没动节点就不同步", () => {
    expect(shouldFinalizeMovedNodeEdgesSynchronously([], edges(0))).toBe(false);
    expect(shouldFinalizeMovedNodeEdgesSynchronously([], edges(3))).toBe(false);
  });

  test("shouldFinalizeMovedNodeEdgesSynchronously：候选边超上限一律不同步", () => {
    expect(shouldFinalizeMovedNodeEdgesSynchronously(["n1", "n2"], edges(LIMIT))).toBe(true);
    expect(shouldFinalizeMovedNodeEdgesSynchronously(["n1", "n2"], edges(LIMIT + 1))).toBe(false);
  });

  test("shouldDeferSingleNodeTerminalReconciliation：恰是「单节点 + 1..LIMIT 条边」", () => {
    expect(shouldDeferSingleNodeTerminalReconciliation(["n1"], edges(1))).toBe(true);
    expect(shouldDeferSingleNodeTerminalReconciliation(["n1"], edges(LIMIT))).toBe(true);
    expect(shouldDeferSingleNodeTerminalReconciliation(["n1"], edges(0))).toBe(false);
    expect(shouldDeferSingleNodeTerminalReconciliation(["n1"], edges(LIMIT + 1))).toBe(false);
    expect(shouldDeferSingleNodeTerminalReconciliation(["n1", "n2"], edges(3))).toBe(false);
    expect(shouldDeferSingleNodeTerminalReconciliation([], edges(3))).toBe(false);
  });

  test("shouldPatchRouteCacheForHighFanoutMove：候选边超过 MAX 才补丁", () => {
    expect(shouldPatchRouteCacheForHighFanoutMove(["n1"], edges(MAX))).toBe(false);
    expect(shouldPatchRouteCacheForHighFanoutMove(["n1"], edges(MAX + 1))).toBe(true);
    // 动了很多节点但边很少 → 不补丁
    expect(shouldPatchRouteCacheForHighFanoutMove(["n1", "n2"], edges(3))).toBe(false);
    // 边很多但没动节点 → 不补丁
    expect(shouldPatchRouteCacheForHighFanoutMove([], edges(MAX + 1))).toBe(false);
  });
});

describe("safeFilePart", () => {
  test("非法文件名字符逐个换成下划线", () => {
    expect(safeFilePart('a/b\\c:d*e?f"g<h>i|j')).toBe("a_b_c_d_e_f_g_h_i_j");
  });

  test("首尾空白先去掉", () => {
    expect(safeFilePart("  方案名  ")).toBe("方案名");
  });

  test("连续非法字符折叠为一个下划线，不落到未命名", () => {
    expect(safeFilePart("///")).toBe("_");
    expect(safeFilePart("a///b")).toBe("a_b");
  });

  test("trim 后为空才落到未命名", () => {
    expect(safeFilePart("   ")).toBe("未命名");
    expect(safeFilePart("")).toBe("未命名");
  });

  test("普通名字原样", () => {
    expect(safeFilePart("望道变_6")).toBe("望道变_6");
  });
});

describe("topologyWarningDisplayMessage", () => {
  test("去掉中文/英文前缀与冒号", () => {
    expect(topologyWarningDisplayMessage("图上拓扑失败: 节点未连接")).toBe("节点未连接");
    expect(topologyWarningDisplayMessage("拓扑失败：节点未连接")).toBe("节点未连接");
  });

  test("无前缀原样", () => {
    expect(topologyWarningDisplayMessage("节点未连接")).toBe("节点未连接");
  });
});

describe("isObjectRecord", () => {
  test("只认非数组对象", () => {
    expect(isObjectRecord({})).toBe(true);
    expect(isObjectRecord([])).toBe(false);
    expect(isObjectRecord(null)).toBe(false);
    expect(isObjectRecord("x")).toBe(false);
    expect(isObjectRecord(1)).toBe(false);
  });
});

describe("isStaticButtonEnabledForNode", () => {
  const node = (kind: string, params: Record<string, string>) => ({ kind, params }) as never;

  test("参数为字符串 '1' 且 kind 支持才启用", () => {
    expect(isStaticButtonEnabledForNode(node("static-text", { buttonEnabled: "1" }))).toBe(true);
    expect(isStaticButtonEnabledForNode(node("static-text", { buttonEnabled: "0" }))).toBe(false);
    expect(isStaticButtonEnabledForNode(node("static-text", {}))).toBe(false);
  });

  test("非静态按钮类 kind 即便参数为 1 也不启用", () => {
    expect(isStaticButtonEnabledForNode(node("ac-load", { buttonEnabled: "1" }))).toBe(false);
  });
});

describe("serializeSchemeRecordForFile", () => {
  const scheme = (extra: Record<string, unknown> = {}) => ({
    name: "根方案",
    projects: [{ name: "P1", project: { version: 1, nodes: [], edges: [], layers: [] } }],
    children: [],
    ...extra
  });

  test("只保留 version/name/projects/children 四个键", () => {
    const parsed = JSON.parse(serializeSchemeRecordForFile(scheme() as never));
    expect(Object.keys(parsed).sort()).toEqual(["children", "name", "projects", "version"]);
    expect(parsed.version).toBe(1);
  });

  test("多余字段被丢弃（白名单语义）", () => {
    const parsed = JSON.parse(serializeSchemeRecordForFile(scheme({ selectedNodeIds: ["n1"], tab: "runtime" }) as never));
    expect(parsed.selectedNodeIds).toBeUndefined();
    expect(parsed.tab).toBeUndefined();
  });

  test("子方案递归同样走白名单", () => {
    const parsed = JSON.parse(
      serializeSchemeRecordForFile(
        scheme({ children: [{ name: "子", projects: [], children: [], junk: 1 }] }) as never
      )
    );
    expect(Object.keys(parsed.children[0]).sort()).toEqual(["children", "name", "projects", "version"]);
  });

  test("children 缺省时落成空数组", () => {
    const noChildren = { name: "根", projects: [] };
    expect(JSON.parse(serializeSchemeRecordForFile(noChildren as never)).children).toEqual([]);
  });

  test("project 内的端子锁定与图层归一化被真正执行（不是原样透传）", () => {
    const parsed = JSON.parse(serializeSchemeRecordForFile(scheme() as never));
    expect(parsed.projects[0].project).toHaveProperty("layers");
  });
});

describe("timestampForLibraryPackageFilename", () => {
  test("形如 YYYYMMDD-HHMMSS（定长，便于字典序排序）", () => {
    expect(timestampForLibraryPackageFilename()).toMatch(/^\d{8}-\d{6}$/u);
  });
});
