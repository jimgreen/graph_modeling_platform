// 保存方案归一化 → normalizeProjectForBackend 这条接缝，畸形节点也得走得过去。
//
// 上一处守卫（savedSchemeNormalize.test.ts）只验到 normalizeSavedProjectIndexes 自己不抛；
// 但它产出的记录还要再经 normalizeProjectForBackend 才发给后端，那一段会读
// node.params.backgroundImageAssetId 与 node.terminals.map(...)，节点缺 params 时照样炸。
// 实测正是这样漏的：nodes 里放一个「有 kind 无 params」的节点，
// 抛在 normalizeLegacyGasQuantityDeviceParams 的 hasOwnProperty 上。
//
// 补齐形状的规则与后端 normalizeProjectForStorage 一致（server/CLAUDE.md「模型存储边界」）：
// 同一份文件在两侧各过一道边界归一，规则必须相同。
import { describe, expect, test } from "vitest";
import { normalizeSavedProjectIndexes } from "./appExtracted/appCoreCanvasUtilities";
import { normalizeProjectForBackend } from "./appExtracted/appPersistenceLibraryExport";

/** 走完整条接缝：归一化保存记录 → 再归一化项目（真正发给后端的那一步）。 */
const throughSeam = (nodes: unknown, edges: unknown = []) => {
  const record = normalizeSavedProjectIndexes({
    name: "模型一",
    updatedAt: "2024-01-01T00:00:00.000Z",
    project: { version: 1, name: "模型一", idx: 1, nodes, edges }
  } as never);
  return normalizeProjectForBackend(record.project as never);
};

// 完整形状的端子：normalizeNodeTerminalsByTemplate 会按模板重算端子集合，
// 只给 id/type 的残缺端子会被它按模板补全或丢弃，测「原样带过」要用完整形态。
const fullTerminal = () => ({ id: "t1", label: "1", type: "ac", anchor: { x: 0.5, y: 0.5 }, nodeNumber: "1", vbase: "10" });

const MALFORMED_NODES: [string, unknown][] = [
  ["空对象节点", [{}]],
  ["只有 id", [{ id: "n1" }]],
  ["有 kind 无 params", [{ id: "n1", kind: "ac-bus" }]],
  ["params 为 null", [{ id: "n1", kind: "ac-bus", params: null }]],
  ["params 为字符串", [{ id: "n1", kind: "ac-bus", params: "abc" }]],
  ["terminals 非数组", [{ id: "n1", kind: "ac-bus", params: {}, terminals: "x" }]],
  ["terminal 缺 anchor", [{ id: "n1", kind: "ac-bus", params: {}, terminals: [{ id: "t1" }] }]],
  ["节点无 kind", [{ id: "n1", params: {}, terminals: [] }]],
  ["混合：正常 + 畸形", [{ id: "ok", kind: "ac-bus", params: {}, terminals: [] }, null, { id: "bad" }]]
];

describe("节点形状在接缝处补齐", () => {
  for (const [label, nodes] of MALFORMED_NODES) {
    test(label, () => {
      expect(() => throughSeam(nodes), label).not.toThrow();
    });
  }

  test("每个留存的节点都拿到 kind 字符串、params 对象、terminals 数组", () => {
    const result = throughSeam([{ id: "n1" }, null]);
    for (const node of result.nodes) {
      expect(typeof node.kind, "kind 必须是字符串").toBe("string");
      expect(typeof node.params, "params 必须是对象").toBe("object");
      expect(Array.isArray(node.terminals), "terminals 必须是数组").toBe(true);
    }
  });

  test("edges 非数组也归成空数组", () => {
    expect(throughSeam([], "abc").edges).toEqual([]);
  });
});

describe("正常节点不被改变", () => {
  test("字段原样带过接缝", () => {
    const node = {
      id: "n1",
      kind: "ac-bus",
      name: "母线",
      params: { vbase: "10" },
      terminals: [fullTerminal()]
    };
    const result = throughSeam([node]);
    expect(result.nodes[0]).toMatchObject({ id: "n1", kind: "ac-bus", name: "母线" });
    expect(result.nodes[0].params.vbase).toBe("10");
    // 端子**不**断言身份：normalizeNodeTerminalsByTemplate 会按模板重算端子集合，
    // 母线的端子由 kind 推导而非原样保留（探针实测：给完整端子也会被换成模板算出的那份）。
    // 那属于「按模板归一」的既有语义，本文件只管畸形输入不炸与形状补齐。
    expect(Array.isArray(result.nodes[0].terminals)).toBe(true);
  });
});