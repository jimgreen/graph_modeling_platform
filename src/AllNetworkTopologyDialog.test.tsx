// src/AllNetworkTopologyDialog.tsx 的专属行为守卫。
//
// 该文件 1436 行，此前零专属测试（all-network-topology.test.ts 只借用过
// loadFullModel 的「陈旧记录强制回源」一条）。本文件只钉 `loadFullModel`
// 里两处容易静默失效的分支：
//   1. idx 三元（L201-203）：`Number.isSafeInteger(Number(idx)) && Number(idx) > 0`
//      —— `project.idx = 0` 是唯一能让两个条件**同时为真又整体为假**的合法输入；
//         喂正数会让三元永远取左臂，喂缺失键则走的是可选链那条路（不同分支）。
//   2. name 兜底（L207）：`loadedRecord?.name || model.name`
//      —— 用 `""` 而不是缺失键：缺失键两条臂（`||` / `??`）产出相同，
//         而 `""` 是 falsy 但非 nullish，是唯一能区分两者的输入（§6.18）。
import { describe, expect, test, vi } from "vitest";

import { loadFullModel } from "./AllNetworkTopologyDialog";

const BASE_MODEL = {
  projectId: "p1",
  schemeId: "s1",
  schemePath: ["spaceA", "schemeX"],
  name: "M-原始",
  idx: 7,
  modelType: "",
  record: {
    id: "p1",
    name: "M-原始",
    project: { idx: 7, nodes: [] }
  }
} as any;

function scopeWithRecord(record: unknown) {
  const fetchBackendProjectRecord = vi.fn().mockResolvedValue(record);
  const scope = {
    // 强制走回源分支：让 L195 的早退条件不成立。
    forceBackendReload: true,
    savedProjectRecordIsSummary: vi.fn(() => true),
    fetchBackendProjectRecord
  };
  return { scope, fetchBackendProjectRecord };
}

describe("loadFullModel：后端 idx 的三元判定", () => {
  test("后端 idx 为 0 时保留本地 idx（> 0 为假，走右臂）", async () => {
    const { scope, fetchBackendProjectRecord } = scopeWithRecord({
      id: "p1",
      name: "M-原始",
      project: { idx: 0, nodes: [] }
    });

    const reloaded = await loadFullModel(scope, BASE_MODEL);

    expect(fetchBackendProjectRecord).toHaveBeenCalledWith(BASE_MODEL.schemePath, BASE_MODEL.name);
    // 7 是本地 idx；右臂产出 7，左臂会产出 0 —— 两者不等，所以这条能区分。
    expect(reloaded.idx).toBe(7);
    expect(reloaded.idx).not.toBe(0);
  });

  test("对照：后端 idx 为正整数串时取后端值，走左臂", async () => {
    const { scope } = scopeWithRecord({
      id: "p1",
      name: "M-原始",
      project: { idx: "9", nodes: [] }
    });

    const reloaded = await loadFullModel(scope, BASE_MODEL);

    expect(reloaded.idx).toBe(9);
  });

  test("project 键整个不存在时可选链取 undefined，保留本地 idx", async () => {
    const { scope } = scopeWithRecord({ id: "p1", name: "M-原始" });

    const reloaded = await loadFullModel(scope, BASE_MODEL);

    expect(reloaded.idx).toBe(7);
  });
});

describe("loadFullModel：record.name 的兜底", () => {
  test("后端 name 为空串时保留本地 name（falsy 但非 nullish，|| 右臂）", async () => {
    const { scope } = scopeWithRecord({
      id: "p1",
      name: "",
      project: { idx: 7, nodes: [] }
    });

    const reloaded = await loadFullModel(scope, BASE_MODEL);

    expect(reloaded.record.name).toBe("M-原始");
  });

  test("对照：后端 name 为非空串时取后端值", async () => {
    const { scope } = scopeWithRecord({
      id: "p1",
      name: "M-后端",
      project: { idx: 7, nodes: [] }
    });

    const reloaded = await loadFullModel(scope, BASE_MODEL);

    expect(reloaded.record.name).toBe("M-后端");
  });

  test("name 键不存在时保留本地 name", async () => {
    const { scope } = scopeWithRecord({ id: "p1", project: { idx: 7, nodes: [] } });

    const reloaded = await loadFullModel(scope, BASE_MODEL);

    expect(reloaded.record.name).toBe("M-原始");
  });
});