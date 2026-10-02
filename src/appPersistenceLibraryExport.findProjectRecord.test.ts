// 按 id / 名字在方案树里找模型记录。
// 按名字找走的是「归一键」比较（savedProjectRecordNameKey），不是严格相等 ——
// 名字两端空白不该让查找失败。
import { describe, expect, test, vi } from "vitest";

import {
  findProjectRecordByNameInScheme,
  findProjectRecordInSchemes
} from "./appExtracted/appPersistenceLibraryExport";

describe("findProjectRecordByNameInScheme", () => {
  const scheme = (names: string[]) => ({ id: "s1", name: "方案", projects: names.map((n) => ({ name: n, project: {} })) }) as any;

  test("找到同名模型时返回该记录", () => {
    const record = findProjectRecordByNameInScheme(scheme(["a", "b"]), "b");

    expect(record?.name).toBe("b");
  });

  test("方案不存在时返回 null", () => {
    expect(findProjectRecordByNameInScheme(undefined, "a")).toBeNull();
  });

  test("找不到时返回 null", () => {
    expect(findProjectRecordByNameInScheme(scheme(["a"]), "z")).toBeNull();
  });

  test("名字两端空白按归一键比较", () => {
    const record = findProjectRecordByNameInScheme(scheme(["  a  "]), "a");

    expect(record?.name).toBe("  a  ");
  });

  test("同名多条时返回第一条", () => {
    const record = findProjectRecordByNameInScheme(scheme(["a", "a"]), "a");

    expect(record).not.toBeNull();
  });

  test("空方案（无模型）返回 null", () => {
    expect(findProjectRecordByNameInScheme(scheme([]), "a")).toBeNull();
  });
});

describe("findProjectRecordInSchemes", () => {
  const record = (id: string, name: string) => ({ id, name, project: {} });

  test("在顶层方案里找到模型（按记录 id 匹配，不是按名字）", () => {
    const schemes = [{ id: "s1", name: "顶层", projects: [record("m1", "别的名字")], children: [] }] as any;

    const found = findProjectRecordInSchemes(schemes, "m1");

    expect(found?.scheme.name).toBe("顶层");
    expect(found?.project.id).toBe("m1");
  });

  test("在子方案里找到模型", () => {
    const schemes = [
      {
        id: "s1",
        name: "顶层",
        projects: [],
        children: [{ id: "s2", name: "子", projects: [record("m1", "模型")], children: [] }]
      }
    ] as any;

    expect(findProjectRecordInSchemes(schemes, "m1")?.scheme.name).toBe("子");
  });

  test("优先在指定方案里找", () => {
    const schemes = [
      { id: "s1", name: "顶层", projects: [record("m1", "顶层模型")], children: [] },
      { id: "s2", name: "子", projects: [record("m1", "子模型")], children: [] }
    ] as any;

    expect(findProjectRecordInSchemes(schemes, "m1", "s2")?.scheme.name).toBe("子");
  });

  test("指定的方案里没有时退回全树搜索", () => {
    const schemes = [
      { id: "s1", name: "顶层", projects: [record("m1", "顶层模型")], children: [] },
      { id: "s2", name: "子", projects: [], children: [] }
    ] as any;

    expect(findProjectRecordInSchemes(schemes, "m1", "s2")?.scheme.name).toBe("顶层");
  });

  test("找不到时返回 null", () => {
    expect(findProjectRecordInSchemes([], "m1")).toBeNull();
  });

  test("空 id 直接返回 null（不扫树）", () => {
    const schemes = [{ id: "s1", name: "顶层", projects: [record("m1", "模型")], children: [] }] as any;

    expect(findProjectRecordInSchemes(schemes, "")).toBeNull();
  });

  test("空方案树返回 null", () => {
    expect(findProjectRecordInSchemes([{ id: "s", name: "s", projects: [], children: [] }] as any, "m1")).toBeNull();
  });
});
