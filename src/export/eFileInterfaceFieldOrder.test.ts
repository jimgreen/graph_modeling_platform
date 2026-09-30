// src/export/e-file.ts 的 orderEDeviceInterfaceFields：E 元件界面字段的排布。
// 此前只有 applyEDeviceInterfaceFieldOrder 的一个别名迁移用例，排布函数本身零断言。
// 判错后果是「E 文件里字段列顺序与界面配置不一致」「parent 排到 dev_type 后面把树层级弄乱」
// 「模板列在界面显示了、导出时却没有」—— 属静默算错一类。
import { describe, expect, test } from "vitest";

import { orderEDeviceInterfaceFields } from "./e-file";

const names = (fields: readonly any[]) => fields.map((field: any) => field?.sourceName);

describe("orderEDeviceInterfaceFields：无模板顺序时按段列排布", () => {
  // ACGenerator 的段列：idx name node rated_capacity rated_voltage control_type p_set
  // p_max p_min q_set q_max q_min v_set v_max v_min alpha regable run_stat（不含 dev_type）
  test("核心字段按段列顺序排在前，自定义字段保持原相对次序落在后面", () => {
    const ordered = orderEDeviceInterfaceFields("ACGenerator", [
      { sourceName: "alpha" },
      { sourceName: "idx" },
      { sourceName: "zzz_custom" },
      { sourceName: "name" },
      { sourceName: "node" }
    ]);
    expect(names(ordered)).toEqual(["idx", "name", "node", "alpha", "zzz_custom"]);
  });

  test("★ 字段名匹配大小写不敏感：'IDX' 仍被认成 idx 排到首位", () => {
    const ordered = orderEDeviceInterfaceFields("ACGenerator", [
      { sourceName: "zz" },
      { sourceName: "IDX" }
    ]);
    expect(names(ordered)).toEqual(["IDX", "zz"]);
  });

  test("★ exportName 也能定位排序位次：sourceName 非核心时按 exportName 参与", () => {
    const ordered = orderEDeviceInterfaceFields("ACGenerator", [
      { sourceName: "rated_capacity" },
      { exportName: "run_stat" },
      { sourceName: "my_custom", exportName: "p_max" }
    ]);
    // p_max 位次早于 run_stat；rated_capacity 不是核心字段（无对应界面列），落最后
    expect(names(ordered)).toEqual(["my_custom", undefined, "rated_capacity"]);
  });

  test("★ 「是核心字段但不在段列里」（如 node1）拿不到位次，排在核心组末尾、非核心组之前", () => {
    // /^node\d*$/ 认它是核心字段，但 ACNode 的段列里没有 node1 → preferredIndex 落 MAX_SAFE_INTEGER。
    // 它仍算核心：非核心的 zz 明明下标更小（0 < 2），照样排在它后面。
    const ordered = orderEDeviceInterfaceFields("ACNode", [
      { sourceName: "zz" },
      { sourceName: "vbase" },
      { sourceName: "node1" }
    ]);
    expect(names(ordered)).toEqual(["vbase", "node1", "zz"]);
  });

  test("未知 componentLibrary 退化成 idx/name：idx 与 name 仍按那两列排位", () => {
    const ordered = orderEDeviceInterfaceFields("NoSuchComponentLibrary", [
      { sourceName: "name" },
      { sourceName: "a" },
      { sourceName: "idx" }
    ]);
    expect(names(ordered)).toEqual(["idx", "name", "a"]);
    // 少一个非核心字段时两者同形（上例里的 b/a），补一个「name」才逼出兜底顺序
    const another = orderEDeviceInterfaceFields("NoSuchComponentLibrary", [
      { sourceName: "b" },
      { sourceName: "a" },
      { sourceName: "idx" }
    ]);
    expect(names(another)).toEqual(["idx", "b", "a"]);
  });

  test("字段里带 parent / dev_type 时按插入位次排（段列没有它们也会被认成核心）", () => {
    // 兜底顺序把 parent / dev_type 插在 name 与 node 之间：idx < name < parent < dev_type < … < alpha
    const ordered = orderEDeviceInterfaceFields("ACGenerator", [
      { sourceName: "dev_type" },
      { sourceName: "parent" },
      { sourceName: "idx" },
      { sourceName: "name" },
      { sourceName: "alpha" },
      { sourceName: "zz" }
    ]);
    expect(names(ordered)).toEqual(["idx", "name", "parent", "dev_type", "alpha", "zz"]);
  });

  test("字段数组含 null 不炸：null 当非核心字段处理，留在原相对位置", () => {
    const ordered = orderEDeviceInterfaceFields("ACGenerator", [
      null,
      { sourceName: "idx" },
      { sourceName: "zz" }
    ]);
    expect(names(ordered)).toEqual(["idx", undefined, "zz"]);
  });

  test("无字段无顺序 → 空数组", () => {
    expect(orderEDeviceInterfaceFields("ACGenerator")).toEqual([]);
    expect(orderEDeviceInterfaceFields("ACGenerator", [], [])).toEqual([]);
  });
});

describe("orderEDeviceInterfaceFields：有模板顺序时严格照模板排", () => {
  test("设备多出的字段被丢弃 —— 模板说了算", () => {
    const ordered = orderEDeviceInterfaceFields(
      "ACGenerator",
      [{ sourceName: "idx" }, { sourceName: "run_stat" }, { sourceName: "extra" }],
      ["idx", "run_stat"]
    );
    expect(names(ordered)).toEqual(["idx", "run_stat"]);
  });

  test("★ 模板里有、设备没有的字段补占位（四件套齐备，界面才显示得出来）", () => {
    const ordered = orderEDeviceInterfaceFields(
      "ACGenerator",
      [{ sourceName: "idx" }, { sourceName: "run_stat" }],
      ["idx", "i_max", "run_stat"]
    );
    expect(ordered[1]).toEqual({
      sourceName: "i_max",
      cnName: "i_max",
      exportEnabled: true,
      exportName: "i_max"
    });
    expect(names(ordered)).toEqual(["idx", "i_max", "run_stat"]);
  });

  test("无字段但有模板顺序 → 全部占位", () => {
    const ordered = orderEDeviceInterfaceFields("ACGenerator", [], ["idx", "name"]);
    expect(names(ordered)).toEqual(["idx", "name"]);
    expect(ordered.every((field: any) => field.exportEnabled === true)).toBe(true);
  });

  test("★ parent 自动插到 dev_type 前面（模板没写 parent 也插）", () => {
    const ordered = orderEDeviceInterfaceFields(
      "ACGenerator",
      [{ sourceName: "idx" }, { sourceName: "dev_type" }],
      ["dev_type", "idx"]
    );
    expect(names(ordered)).toEqual(["parent", "dev_type", "idx"]);
  });

  test("★ 模板里重复出现的 parent 只留一个（且仍紧挨 dev_type 前）", () => {
    const ordered = orderEDeviceInterfaceFields(
      "ACGenerator",
      [{ sourceName: "idx" }, { sourceName: "dev_type" }, { sourceName: "parent" }],
      ["idx", "parent", "dev_type", "parent"]
    );
    expect(names(ordered)).toEqual(["idx", "parent", "dev_type"]);
  });

  test("模板顺序里的旧字段名迁移成现名：max_current → i_max", () => {
    const ordered = orderEDeviceInterfaceFields(
      "ACGenerator",
      [{ sourceName: "i_max" }],
      ["max_current"]
    );
    expect(names(ordered)).toEqual(["i_max"]);
  });
});

describe("orderEDeviceInterfaceFields：派生元件库剔掉 base-only 字段", () => {
  test("字段与模板顺序里的 parent / dev_type 都被剔掉", () => {
    const ordered = orderEDeviceInterfaceFields(
      "ACTransformer",
      [
        { sourceName: "parent" },
        { sourceName: "dev_type" },
        { sourceName: "idx" },
        { sourceName: "r" }
      ],
      ["idx", "parent", "dev_type", "r"],
      true
    );
    expect(names(ordered)).toEqual(["idx", "r"]);
  });

  test("★ 无模板顺序时同样剔除（两条分支都过滤，不是只在有顺序时生效）", () => {
    const ordered = orderEDeviceInterfaceFields(
      "ACTransformer",
      [
        { sourceName: "parent" },
        { sourceName: "dev_type" },
        { sourceName: "idx" },
        { sourceName: "r" }
      ],
      [],
      true
    );
    expect(names(ordered)).toEqual(["idx", "r"]);
  });

  test("字段被剔光时返回空数组", () => {
    expect(
      orderEDeviceInterfaceFields("ACTransformer", [{ sourceName: "parent" }, { sourceName: "dev_type" }], [], true)
    ).toEqual([]);
  });

  test("★ exportName 命中 base-only 字段时同样剔除（不只看 sourceName）", () => {
    const ordered = orderEDeviceInterfaceFields(
      "ACTransformer",
      [
        { sourceName: "r", exportName: "parent" },
        { sourceName: "q", exportName: "dev_type" },
        { sourceName: "idx" }
      ],
      [],
      true
    );
    expect(names(ordered)).toEqual(["idx"]);
  });
});

// ─── 变异验证中三处「删了也不变」的等价写法（如实记录，不计入覆盖）─────────
//
// 1. 排序比较器末尾的 `return first.index - second.index` —— `Array.prototype.sort`
//    自 ES2019 起**保证稳定**，位次相同时返回 0 与返回原下标差完全等价，无法构造区分用例。
// 2. `preferredIndex` 构造时的 `.filter((fieldName) => eDeviceInterfaceDisplayCoreFieldName(fieldName))`
//    —— 被滤掉的正是**非核心列名**，而查表只用 `coreName`（必然是核心名），永不命中被滤掉的键；
//    滤掉非核心项只是把下标整体压缩，排序结果不变（单调重映射）。
// 3. `ensureEDeviceInterfaceParentBeforeDevType` 里过滤已存在的 `parent` —— 多出来的
//    `parent` 条目会被下游 `applyEDeviceInterfaceFieldOrder` 的 complianceKey 去重折叠掉。
//
// 上面的用例覆盖的是**可观测结果**（顺序、占位四件套、剔除行为），不是这三行本身。
