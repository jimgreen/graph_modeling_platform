// src/model-eexport.ts 的 eSectionColumns：一个 E 段里所有记录合起来有哪些列。
// 它是「导出」与「E 文件编辑器窗口」共用的列集单源 —— 记录自带 columns 时按它来，
// 没有就按段的默认列，再没有就退回该记录自己的参数键。
// 此前这个函数只有间接覆盖，判错的后果正是那个老问题：导出文件同表有列有行，编辑器窗口却是一片空表。
//
// 11 处变异跑过，10 处转红。一处**源码等价**：`seen.add(key)` 与 `columns.push(key)` 调换顺序 ——
// 两者对同一批 key 一起执行，顺序无所谓，写不出能证伪它的变异。
// 过程中补的真缺口：段没有默认列时 `columns: []` 也不退回参数键（空数组就是「这一段没列」），
// 以及「一条记录都没有时也给出该段默认列」这条回落。
import { describe, expect, test } from "vitest";

import { E_SECTION_COLUMNS, eSectionColumns, type EDeviceExport } from "./model-eexport";

const record = (over: Partial<EDeviceExport> = {}): EDeviceExport => ({
  id: "r1",
  kind: "ac-breaker",
  section: "ACSwitch",
  params: {},
  ...over
});

describe("eSectionColumns：记录自带列时的并集", () => {
  test("★ 多条记录的列取并集，顺序按记录顺序、列内顺序", () => {
    const columns = eSectionColumns("ACSwitch", [
      record({ columns: ["idx", "name"] }),
      record({ columns: ["name", "i_node"] })
    ]);
    expect(columns).toEqual(["idx", "name", "i_node"]);
  });

  test("★ 下划线开头的列被跳过（内部键不进表头）", () => {
    const columns = eSectionColumns("ACSwitch", [record({ columns: ["idx", "_internal", "name"] })]);
    expect(columns).toEqual(["idx", "name"]);
  });

  test("★ 空字符串列名被跳过", () => {
    expect(eSectionColumns("ACSwitch", [record({ columns: ["", "idx", ""] })])).toEqual(["idx"]);
  });

  test("★ 列全被过滤掉（只有下划线键）时回落到段的默认列", () => {
    expect(eSectionColumns("ACSwitch", [record({ columns: ["_x", ""] })])).toEqual(E_SECTION_COLUMNS.ACSwitch);
  });
});

describe("eSectionColumns：记录没有列时的三级回落", () => {
  test("★ 记录无 columns（undefined）→ 用该段的默认列", () => {
    const columns = eSectionColumns("ACSwitch", [record({ columns: undefined })]);
    expect(columns).toEqual(E_SECTION_COLUMNS.ACSwitch);
  });

  test("★ 段也不在默认列表里 → 退回该记录自己的参数键", () => {
    const columns = eSectionColumns("MyCustomSection", [record({ section: "MyCustomSection", params: { p: "1", q: "2" } })]);
    expect(columns).toEqual(["p", "q"]);
  });

  test("★ 段未知、记录也没有参数 → 空数组", () => {
    expect(eSectionColumns("MyCustomSection", [record({ section: "MyCustomSection" })])).toEqual([]);
  });

  test("★ columns 是空数组 ≠ 没给（空数组照旧算「有列」，于是整段回落到默认列）", () => {
    // 这条是编辑器空表的成因：功能段记录只给 columns: []，窗口就渲染不出列
    expect(eSectionColumns("ACSwitch", [record({ columns: [] })])).toEqual(E_SECTION_COLUMNS.ACSwitch);
  });

  test("★ 段没有默认列时，columns: [] 也不会退回参数键（空数组就是「这一段没列」）", () => {
    const columns = eSectionColumns("MyCustomSection", [record({ section: "MyCustomSection", columns: [], params: { p: "1" } })]);
    expect(columns).toEqual([]);
  });

  test("一条有列一条没有：有列那条说了算，没列那条按默认列补进来", () => {
    const columns = eSectionColumns("ACSwitch", [record({ columns: ["only_this"] }), record({ columns: undefined })]);
    expect(columns[0]).toBe("only_this");
    expect(columns).toEqual(expect.arrayContaining(E_SECTION_COLUMNS.ACSwitch));
  });

  test("★ 一条记录都没有时也给出该段的默认列（编辑器空表区仍要有表头）", () => {
    expect(eSectionColumns("ACSwitch", [])).toEqual(E_SECTION_COLUMNS.ACSwitch);
  });
});

describe("eSectionColumns：与默认列表的关系", () => {
  test("★ 段数量有百来个（列集单源覆盖全部 E 段）", () => {
    expect(Object.keys(E_SECTION_COLUMNS).length).toBeGreaterThanOrEqual(70);
  });

  test("★ 默认列里没有下划线开头的列名（否则默认列自己就会被过滤掉）", () => {
    const offending = Object.entries(E_SECTION_COLUMNS)
      .flatMap(([section, columns]) => columns.filter((name) => !name || name.startsWith("_")).map((name) => `${section}.${name}`))
      .slice(0, 10);
    expect(offending).toEqual([]);
  });

  test("容器表四个能流段共用同一份列（改一处四处一起变）", () => {
    expect(E_SECTION_COLUMNS.ACContainer).toEqual(E_SECTION_COLUMNS.DCContainer);
    expect(E_SECTION_COLUMNS.HydroContainer).toEqual(E_SECTION_COLUMNS.ACContainer);
    expect(E_SECTION_COLUMNS.HeatContainer).toEqual(E_SECTION_COLUMNS.ACContainer);
  });
});
