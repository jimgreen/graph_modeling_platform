// 保存方案归一化对畸形结构必须放行，不能抛。
//
// normalizeSavedProjectIndexes 是保存方案进入应用前的必经之路，三条来源都走它：
// 后端 GET /schemes 的 payload、浏览器缓存（localStorage / IndexedDB）里恢复出来的记录、
// 图元库导入包里的 schemes 字段（appDeviceDefinitionFactories 的导入处理器）。
// 它此前把 `project.project.nodes.map(...)` 与 `normalizeLegacyPowerSystemLabel(project.name)`
// 裸放着，一条畸形记录就能让整个归一化抛掉——用户看到的是「应用起不来 / 导入一个文件就白屏」。
//
// 同文件里紧挨着的两个函数都做了判：normalizeSavedSchemeIndexes 判 projects/children 是不是数组，
// normalizeStoredDraftProject 直接 `if (!Array.isArray(nodes) || !Array.isArray(edges)) return null`。
// 缺的只是这一处。
import { describe, expect, test } from "vitest";
import { normalizeSavedProjectIndexes, normalizeSavedSchemeIndexes } from "./appExtracted/appCoreCanvasUtilities";

const projectRecord = (over: Record<string, unknown> = {}) => ({
  name: "模型一",
  updatedAt: "2024-01-01T00:00:00.000Z",
  project: { version: 1, name: "模型一", idx: 1, nodes: [], edges: [] },
  ...over
});

const schemeRecord = (projects: unknown[]) => ({
  name: "方案A",
  updatedAt: "2024-01-01T00:00:00.000Z",
  projects,
  children: []
});

const MALFORMED: [string, unknown][] = [
  ["project.nodes 非数组", projectRecord({ project: { version: 1, name: "x", nodes: "abc", edges: [] } })],
  ["project 整体缺失", projectRecord({ project: undefined })],
  ["project 为 null", projectRecord({ project: null })],
  ["project 为字符串", projectRecord({ project: "abc" })],
  ["project 为数组", projectRecord({ project: [] })],
  ["project.nodes 含 null", projectRecord({ project: { version: 1, name: "x", nodes: [null], edges: [] } })],
  ["顶层 name 缺失", projectRecord({ name: undefined })]
];

describe("normalizeSavedProjectIndexes：畸形记录放行而不是抛", () => {
  for (const [label, input] of MALFORMED) {
    test(label, () => {
      expect(() => normalizeSavedProjectIndexes(input as never), label).not.toThrow();
    });
  }

  test("缺 project 时归出一个结构完整的空 project", () => {
    const result = normalizeSavedProjectIndexes(projectRecord({ project: undefined }) as never);
    expect(Array.isArray(result.project.nodes)).toBe(true);
    expect(Array.isArray(result.project.edges)).toBe(true);
  });

  test("nodes 里的非对象项被滤掉，不进渲染层", () => {
    const result = normalizeSavedProjectIndexes(
      projectRecord({ project: { version: 1, name: "x", nodes: [null, "ac-bus", 42], edges: [] } }) as never
    );
    expect(result.project.nodes).toEqual([]);
  });
});

describe("normalizeSavedSchemeIndexes：经方案层进入同样放行", () => {
  for (const [label, input] of MALFORMED) {
    test(label, () => {
      expect(() => normalizeSavedSchemeIndexes(schemeRecord([input]) as never), label).not.toThrow();
    });
  }

  test("projects 非数组时归成空数组", () => {
    expect(normalizeSavedSchemeIndexes({ name: "方案A", projects: "abc", children: null } as never).projects).toEqual([]);
  });
});

describe("正常路径不被改变", () => {
  test("节点与名称原样保留", () => {
    const node = { id: "n1", kind: "ac-bus", name: "母线", params: { vbase: "10" }, terminals: [] };
    const result = normalizeSavedProjectIndexes(
      projectRecord({ project: { version: 1, name: "模型一", nodes: [node], edges: [] } }) as never
    );
    expect(result.project.nodes).toHaveLength(1);
    expect(result.project.nodes[0]).toMatchObject({ id: "n1", kind: "ac-bus", name: "母线" });
    expect(result.name).toBe("模型一");
  });

  test("历史名照旧改写（这条守卫是本函数存在的理由）", () => {
    const result = normalizeSavedProjectIndexes(
      projectRecord({
        name: "电力系统模型",
        project: { version: 1, name: "电力系统模型", nodes: [], edges: [] }
      }) as never
    );
    expect(result.name).toBe("电力能源系统模型");
    expect(result.project.name).toBe("电力能源系统模型");
  });
});