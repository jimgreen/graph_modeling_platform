// 方案树送后端前的归一：递归处理 children、给每个模型补运行时 id、剥掉前端专用字段。
// 两条容易漏的：① children 不是数组时必须落成空数组（否则下游 .map 崩）；
// ② 顶层与嵌套层走的是同一个递归函数 —— 只测顶层会漏掉深层。
import { describe, expect, test, vi } from "vitest";

import { normalizeSchemesForBackend } from "./appExtracted/appPersistenceLibraryExport";

const project = (name: string, project: any = { nodes: [], edges: [] }) => ({ name, project }) as any;
const scheme = (name: string, projects: any[], children?: any) => ({ id: `id-${name}`, name, projects, children }) as any;

describe("normalizeSchemesForBackend", () => {
  test("方案 id 被剥掉（后端重新分配）", () => {
    const result = normalizeSchemesForBackend([scheme("顶层", [])]);

    expect((result[0] as any).id).not.toBe("id-顶层");
  });

  test("children 是数组时递归归一", () => {
    const result = normalizeSchemesForBackend([scheme("顶层", [], [scheme("子", [])])]);

    expect(result[0].children).toHaveLength(1);
    expect(result[0].children![0].name).toBe("子");
  });

  test("children 缺省时落成空数组", () => {
    const result = normalizeSchemesForBackend([{ id: "s", name: "顶层", projects: [] } as any]);

    expect(result[0].children).toEqual([]);
  });

  test("children 不是数组时同样落成空数组", () => {
    const result = normalizeSchemesForBackend([scheme("顶层", [], "不是数组")]);

    expect(result[0].children).toEqual([]);
  });

  test("深层嵌套也递归处理", () => {
    const deep = scheme("孙", [project("深层模型")]);
    const middle = scheme("子", [], [deep]);
    const result = normalizeSchemesForBackend([scheme("顶层", [], [middle])]);

    expect(result[0].children![0].children![0].projects).toHaveLength(1);
  });

  test("空方案数组返回空数组", () => {
    expect(normalizeSchemesForBackend([])).toEqual([]);
  });

  test("模型名归一后仍保留原名（除非被改名规则命中）", () => {
    const result = normalizeSchemesForBackend([scheme("顶层", [project("母线-1")])]);

    expect(result[0].projects[0].name).toBe("母线-1");
  });
});
