// src/model-eexport.ts：E 文件的**列名映射**
//   E_SECTION_COLUMNS                 76 个段 → 各自允许的列名清单
//   LEGACY_E_DEFINITION_COLUMN_ALIASES（私有） 参数英文名 → 旧 E 文件列名
//   legacyEColumnForDefinition        唯一的映射出口
//   isUnsupportedDcacControlField（私有）
//   toSnakeCaseDeviceParamName（私有）
//
// 这个函数决定**导出的 E 文件里参数写到哪一列**。判错的后果有两种：
//   · 映射到错误的列 → 参数被写到别的设备类型的字段上，下游解析器读出错的物理量
//   · 映射失败（返回 ""）→ 参数**被静默丢弃**，导出文件里这一列不存在
// 两者都**不报错**。
import { describe, expect, test } from "vitest";
import { E_SECTION_COLUMNS, legacyEColumnForDefinition } from "./model-eexport";

const col = (section: string, enName: string) => legacyEColumnForDefinition(section, enName);
const has = (section: string, name: string) => E_SECTION_COLUMNS[section]?.includes(name) ?? false;

describe("E_SECTION_COLUMNS：76 段的清单形状", () => {
  test("段数与键序（前 8 段固定）", () => {
    // 段顺序会进 E 文件的段表序列化，键序变了就是存量 diff 噪声。
    expect(Object.keys(E_SECTION_COLUMNS).length).toBe(76);
    expect(Object.keys(E_SECTION_COLUMNS).slice(0, 8)).toEqual([
      "Station", "Feeder", "District",
      "StaticTextSymbol", "StaticMediaSymbol", "StaticBasicShape", "StaticFlowNode", "StaticButton"
    ]);
  });

  test("★ 8 个**空列段**（静态图元类，全部靠自定义列）", () => {
    const empty = Object.entries(E_SECTION_COLUMNS).filter(([, v]) => v.length === 0).map(([k]) => k);
    expect(empty).toEqual([
      "StaticTextSymbol", "StaticMediaSymbol", "StaticBasicShape", "StaticFlowNode",
      "StaticButton", "StaticContainerSymbol", "StaticConnectorSymbol", "StaticAnnotationSymbol"
    ]);
    // 空列段里**任何** enName 都映射不到列
    for (const section of empty) {
      for (const enName of ["idx", "name", "i_node", "j_node", "i_r", "rated_voltage"]) {
        expect(col(section, enName), `${section}/${enName}`).toBe("");
      }
    }
  });

  test("★ 每个段的列清单里**不含重复项**", () => {
    for (const [section, columns] of Object.entries(E_SECTION_COLUMNS)) {
      expect(new Set(columns).size, `${section} 有重复列`).toBe(columns.length);
    }
  });

  test("四个能流段共用一份容器列常量（但不是同一引用）", () => {
    // `ACContainer` / `DCContainer` / `HydroContainer` / `HeatContainer` 用
    // `[...CONTAINER_TABLE_COLUMNS]` 展开 —— 展开保证不是共享数组，
    // 调用方改一份不影响其它三份。
    const containers = ["ACContainer", "DCContainer", "HydroContainer", "HeatContainer"];
    const base = E_SECTION_COLUMNS.ACContainer;
    for (const section of containers) {
      expect(E_SECTION_COLUMNS[section], section).toEqual(base);
    }
    expect(E_SECTION_COLUMNS.DCContainer, "★ 不是同一引用").not.toBe(E_SECTION_COLUMNS.ACContainer);
    // 成员关系段同理
    const devs = ["ACContainerDev", "DCContainerDev", "HydroContainerDev", "HeatContainerDev"];
    expect(E_SECTION_COLUMNS.DCContainerDev).toEqual(E_SECTION_COLUMNS.ACContainerDev);
    expect(E_SECTION_COLUMNS.DCContainerDev).not.toBe(E_SECTION_COLUMNS.ACContainerDev);
    expect(base.length, "容器表有列").toBeGreaterThan(0);
  });

  test("列最多的段：三绕组 31 列 / ACAC 29 / DCAC 28", () => {
    expect(E_SECTION_COLUMNS.ACTransfomer3.length).toBe(31);
    expect(E_SECTION_COLUMNS.ACACConverter.length).toBe(29);
    expect(E_SECTION_COLUMNS.DCACConverter.length).toBe(28);
    expect(E_SECTION_COLUMNS.DCDCConverter.length).toBe(23);
    expect(E_SECTION_COLUMNS.ACLoad.length).toBe(22);
  });
});

describe("未知段与空 enName → 空串", () => {
  test("未知段（大小写敏感）", () => {
    for (const section of ["nope", "", "acbus", "acrealbs", "ACREALBS", " ACRealBs"]) {
      expect(col(section, "idx"), JSON.stringify(section)).toBe("");
    }
  });

  test("★ 段名走**原型链** → 抛 TypeError（返回类型标注 string）", () => {
    // `E_SECTION_COLUMNS[section]` 走原型链：
    //   `__proto__` → `Object.prototype`（truthy object）
    //   `toString` / `constructor` / `hasOwnProperty` / `valueOf` → 函数（truthy）
    // 于是 `if (!columns) return \"\"` **不生效**，继续走到
    // `columns.includes(...)` —— 在非数组上抛 `TypeError`。
    //
    // **判定不修**：`section` 来自 `inferESection(kind, params)`，是段名的封闭
    // 枚举，不是外部输入；抛错正说明调用方违背契约。静默兜成 `[]` 会掩盖
    // 「段名对不上」这个真问题（那意味着整个段配错了）。
    for (const section of ["__proto__", "toString", "constructor", "hasOwnProperty", "valueOf"]) {
      expect(() => col(section, "idx"), section).toThrow(TypeError);
      expect(() => col(section, "r1"), section).toThrow(TypeError);
    }
    // 前置：这些键确实取到 truthy 值
    expect((E_SECTION_COLUMNS as Record<string, unknown>).__proto__).toBeTruthy();
    expect(typeof (E_SECTION_COLUMNS as Record<string, unknown>).toString).toBe("function");
    // 对照：正常未知段（真 undefined）走早返回，不抛
    expect(col("nope", "idx")).toBe("");
  });

  test("空 enName → 空串（`columns.includes(\"\")` 必假）", () => {
    for (const section of ["ACBranch", "Station", "ACTransfomer3"]) {
      expect(col(section, ""), section).toBe("");
    }
  });

  test("★ 返回值恒为 string，从不返回 undefined", () => {
    // 返回类型标注 `string`，靠 `E_SECTION_COLUMNS[section]` 的 undefined 检查
    // 与末尾的 `alias && … ? alias : \"\"` 两处兜住。
    for (const [section, enName] of [
      ["ACBranch", "zzz"], ["nope", "zzz"], ["ACBranch", ""], ["ACBranch", "toString"],
      ["Station", "i_max"], ["ACTransfomer3", "r4"]
    ] as const) {
      const value = col(section, enName);
      expect(typeof value, `${section}/${enName}`).toBe("string");
      expect(value, `${section}/${enName}`).toBe("");
    }
  });
});

describe("直接命中 → 原样返回（区分大小写）", () => {
  test("清单内的列名原样返回", () => {
    expect(col("ACRealBs", "rated_voltage")).toBe("rated_voltage");
    expect(col("ACRealBs", "run_stat")).toBe("run_stat");
    expect(col("Station", "name")).toBe("name");
    expect(col("Feeder", "parent")).toBe("parent");
    expect(col("ACBranch", "rated_capacity")).toBe("rated_capacity");
  });

  test("★ 大小写不同 → 不命中", () => {
    expect(col("ACRealBs", "rated_Voltage")).toBe("");
    expect(col("ACRealBs", "Rated_Voltage")).toBe("");
    expect(col("Station", "Name")).toBe("");
    expect(col("ACBranch", "R")).toBe("");
  });

  test("★ 空白不被 trim（`\" rated_voltage\"` 不命中）", () => {
    // `legacyEColumnForDefinition` 自己不 trim；调用方
    // `resolveDeviceParameterDefinitionExportSettings` 才 `String(… ?? "").trim()`。
    expect(col("ACRealBs", " rated_voltage")).toBe("");
    expect(col("ACRealBs", "rated_voltage ")).toBe("");
    expect(col("ACRealBs", "\trun_stat")).toBe("");
  });
});

describe("线路段的 t1/t2/t3_node → i/j/k_node", () => {
  test("两绕组：t1→i_node、t2→j_node、t3→空", () => {
    for (const section of ["ACBranch", "DCBranch"]) {
      expect(col(section, "t1_node"), `${section} t1`).toBe("i_node");
      expect(col(section, "t2_node"), `${section} t2`).toBe("j_node");
      expect(col(section, "t3_node"), `${section} t3`).toBe("");
    }
    // 前置条件：两绕组段有 i/j 但没有 k
    expect(has("ACBranch", "i_node")).toBe(true);
    expect(has("ACBranch", "j_node")).toBe(true);
    expect(has("ACBranch", "k_node"), "★ 两绕组无 k_node").toBe(false);
  });

  test("★ 三绕组：t1→i、t2→k、t3→j（k 插在中间）", () => {
    // `t2_node` 优先走 `ACTransfomer3 && columns.includes(\"k_node\")`。
    expect(has("ACTransfomer3", "k_node")).toBe(true);
    expect(col("ACTransfomer3", "t1_node")).toBe("i_node");
    expect(col("ACTransfomer3", "t2_node")).toBe("k_node");
    expect(col("ACTransfomer3", "t3_node")).toBe("j_node");
  });

  test("非三绕组段的 t2_node 走不到 k 分支", () => {
    // ★ 注意段名：真实清单里**没有** `ACTransfomer2`，两绕组变压器的段名是
    //   `ACTransformer`（两绕组整段）与 `ACTransWinding`（绕组）。
    //   我第一版写成 `ACTransfomer2`，被测试当场顶回（未知段 → 一律 ""）。
    expect(E_SECTION_COLUMNS.ACTransfomer2, "★ 该段不存在").toBeUndefined();
    expect("ACTransfomer2" in E_SECTION_COLUMNS).toBe(false);
    for (const section of ["ACBranch", "DCBranch", "ACTransformer", "ACTransWinding"]) {
      expect(has(section, "k_node"), `${section} 无 k_node`).toBe(false);
      expect(col(section, "t2_node"), section).toBe("j_node");
    }
  });

  test("★ 等价变异 ⑥：`t2_node` 的 `k` 分支去掉段名限定是**不可观测**的", () => {
    // 变异：`if (section === \"ACTransfomer3\" && columns.includes(\"k_node\"))`
    // 改 `if (columns.includes(\"k_node\"))`。
    //   —— 「去掉段名限定」只对**非三绕组但含 `k_node`** 的段有影响。
    //      探针实测：**只有 `ACTransfomer3` 含 `k_node`**（76 段里唯一）。
    //   ⇒ 对任意输入，两种写法给出同一结果。全绿是**正确**的。
    //
    //   ⚠ 什么会让它失效：新增第二个含 `k_node` 的段（如两绕组变压器的绕组段
    //      若加第三侧），那时非三绕组段的 `t2_node` 会被错映射到 `k_node`。
    //   下面这条断言把「只有三绕组有 k_node」变成可执行的。
    const withK = Object.keys(E_SECTION_COLUMNS).filter((s) => has(s, "k_node"));
    expect(withK, "★ 76 段里只有三绕组含 k_node").toEqual(["ACTransfomer3"]);
    const bothKJ = Object.keys(E_SECTION_COLUMNS).filter((s) => has(s, "k_node") && has(s, "j_node"));
    expect(bothKJ).toEqual(["ACTransfomer3"]);
    // 有 k_node 但**没有** j_node 的段也不存在 —— 否则去掉限定后 t2_node 会变
    expect(Object.keys(E_SECTION_COLUMNS).filter((s) => has(s, "k_node") && !has(s, "j_node"))).toEqual([]);
  });

  test("★ `node` 列的回落：`t1_node` 在 16 个「单端」段落 `node`", () => {
    // 探针实测：有 `node` 但无 `i_node` 的段共 16 个，t1_node 全部落 `"node"`。
    // 我第一版以为「没有这种段」，被顶回 —— 这正是这条规则存在的原因。
    const withNode = Object.keys(E_SECTION_COLUMNS).filter((s) => has(s, "node") && !has(s, "i_node"));
    expect(withNode).toEqual([
      "ACRealBs", "DCRealBs", "ACLoad", "DCLoad", "ACGenerator", "DCGenerator",
      "ACCompensator", "GroundDisconnector", "HydroSource", "HydroLoad", "HydroBus",
      "HydroStorage", "HeatSource", "HeatLoad", "HeatBus", "HeatStorage"
    ]);
    for (const section of withNode) {
      expect(col(section, "t1_node"), section).toBe("node");
      // 单端段没有第二端，t2_node / t3_node 落空串
      expect(col(section, "t2_node"), `${section} t2`).toBe("");
      expect(col(section, "t3_node"), `${section} t3`).toBe("");
    }
    // 线路类段有 i_node，所以 t1_node 走第一分支而不是回落
    for (const section of ["ACBranch", "DCBranch"]) {
      expect(col(section, "t1_node")).toBe("i_node");
    }
  });
});

describe("★ 三绕组的两种侧边写法：编号式（r1）与侧边式（highResistancePu）", () => {
  test("编号式：1→i、2→k、3→j（六个参数各自）", () => {
    const fields = ["r", "x", "gt", "bt", "tap", "shift"] as const;
    for (const field of fields) {
      expect(col("ACTransfomer3", `${field}1`), `${field}1`).toBe(`i_${field}`);
      expect(col("ACTransfomer3", `${field}2`), `${field}2`).toBe(`k_${field}`);
      expect(col("ACTransfomer3", `${field}3`), `${field}3`).toBe(`j_${field}`);
    }
  });

  test("★ 编号越界（0 / 4..9）→ 空串（`sideCode` 得 undefined，列名 `undefined_*` 被清单挡下）", () => {
    // 变异 ⑩ 把正则 `[123]` 放宽成 `[0-9]`，首轮全绿。查清原因：
    // 越界编号算出的列名是 `undefined_r` 之类，**清单里没有** → 被末尾的
    // `columns.includes` 挡下 → 仍返回 `""`。这不是覆盖不足，是**结构上
    // 不可辨识** —— 正则放宽的可见后果全被清单校验吃掉。
    // 下面把 0..9 全测一遍，让「放宽正则」变成可执行的断言。
    const sides = ["i", "k", "j"];
    for (const field of ["r", "x", "gt", "bt", "tap", "shift"]) {
      for (const digit of [1, 2, 3]) {
        expect(col("ACTransfomer3", `${field}${digit}`), `${field}${digit}`).toBe(
          `${sides[digit - 1]}_${field}`
        );
      }
      for (const digit of [0, 4, 5, 6, 7, 8, 9]) {
        expect(col("ACTransfomer3", `${field}${digit}`), `越界 ${field}${digit}`).toBe("");
      }
    }
    // 前置：清单里只有 1/2/3 三套列，没有 `undefined_*` 之类
    for (const f of ["r", "x", "gt", "bt", "tap", "shift"]) {
      expect(has("ACTransfomer3", `i_${f}`), `i_${f}`).toBe(true);
      expect(has("ACTransfomer3", `k_${f}`), `k_${f}`).toBe(true);
      expect(has("ACTransfomer3", `j_${f}`), `j_${f}`).toBe(true);
      expect(has("ACTransfomer3", `undefined_${f}`), "★ 无 undefined_ 列").toBe(false);
      expect(has("ACTransfomer3", `i_${f}4`), "无 i_xxx4 列").toBe(false);
    }
  });

  test("侧边式驼峰：high/medium/low → i/k/j（六个参数）", () => {
    const table: Array<[string, string]> = [
      ["highResistancePu", "i_r"],
      ["mediumResistancePu", "k_r"],
      ["lowResistancePu", "j_r"],
      ["highReactancePu", "i_x"],
      ["mediumReactancePu", "k_x"],
      ["lowReactancePu", "j_x"],
      ["highMagnetizingConductancePu", "i_gt"],
      ["mediumMagnetizingConductancePu", "k_gt"],
      ["lowMagnetizingConductancePu", "j_gt"],
      ["highMagnetizingSusceptancePu", "i_bt"],
      ["mediumMagnetizingSusceptancePu", "k_bt"],
      ["lowMagnetizingSusceptancePu", "j_bt"],
      ["highTapRatio", "i_tap"],
      ["mediumTapRatio", "k_tap"],
      ["lowTapRatio", "j_tap"],
      ["highShift", "i_shift"],
      ["mediumShift", "k_shift"],
      ["lowShift", "j_shift"]
    ];
    for (const [input, expected] of table) {
      expect(col("ACTransfomer3", input), input).toBe(expected);
    }
  });

  test("侧边式下划线：与驼峰**同结果**", () => {
    const pairs: Array<[string, string]> = [
      ["high_resistance_pu", "highResistancePu"],
      ["medium_resistance_pu", "mediumResistancePu"],
      ["low_resistance_pu", "lowResistancePu"],
      ["high_reactance_pu", "highReactancePu"],
      ["low_tap_ratio", "lowTapRatio"],
      ["medium_shift", "mediumShift"]
    ];
    for (const [snake, camel] of pairs) {
      expect(col("ACTransfomer3", snake), snake).toBe(col("ACTransfomer3", camel));
      expect(col("ACTransfomer3", snake), snake).not.toBe("");
    }
  });

  test("★ 侧边式的参数名**必须精确**（`ShiftPu` 这种拼错得空串）", () => {
    expect(col("ACTransfomer3", "lowShiftPu"), "多了 Pu").toBe("");
    expect(col("ACTransfomer3", "highUnknown")).toBe("");
    expect(col("ACTransfomer3", "highResistancPu"), "少一个 e").toBe("");
    expect(col("ACTransfomer3", "midsShift"), "侧边名只有 high/medium/low").toBe("");
  });

  test("★ 侧边式只对**三绕组**生效", () => {
    // 段名是 `ACTransformer`（两绕组整段）与 `ACTransWinding`（绕组）——
    // 真实清单里没有 `ACTransfomer2`，用它会被当成未知段而全返回 ""。
    for (const section of ["ACTransformer", "ACTransWinding", "ACBranch", "DCBranch", "ACRealBs"]) {
      expect(col(section, "highResistancePu"), section).toBe("");
      expect(col(section, "r1"), section).toBe("");
    }
    expect(col("ACTransfomer3", "highResistancePu")).toBe("i_r");
    expect(col("ACTransfomer3", "r1")).toBe("i_r");
  });

  test("★ 等价变异 ⑨：去掉 `section === \"ACTransfomer3\"` 限定是**不可观测**的", () => {
    // 变异：`if (section === \"ACTransfomer3\")` 改 `if (true)`。
    //   —— 去掉限定后，**任何**含 `i_r`/`k_r`/`j_r` 之一的段都会吃这条规则。
    //      探针实测：76 段里**只有 `ACTransfomer3`** 含这三列。
    //      而规则算出的列名必带 `i_`/`k_`/`j_` 前缀，其他段不含 → 清单挡下。
    //   ⇒ 对任意输入结果相同。全绿是**正确**的。
    //
    //   ⚠ 什么会让它失效：另一个段若也含 `i_r`（例如把三绕组参数表复用到
    //      别的段），那时非三绕组段的 `r1` 会开始被映射。
    //   下面这几条把「只有三绕组有三侧列」变成可执行的。
    for (const column of ["i_r", "k_r", "j_r", "i_x", "k_x", "j_x", "i_shift", "k_shift", "j_shift"]) {
      const sections = Object.keys(E_SECTION_COLUMNS).filter((s) => has(s, column));
      expect(sections, `${column} 只在三绕组`).toEqual(["ACTransfomer3"]);
    }
    // ★ 规则算出的列名一律带三侧前缀（`i_`/`k_`/`j_`），没有无前缀形态。
    //   4 个段确实含**裸** `r`/`x`/`gt`/`bt`/`tap`/`shift`（两绕组形态），
    //   但它们走的是第一级 `columns.includes(\"r\")` **直接命中**，与侧边式规则无关 ——
    //   侧边式规则的输入形如 `highResistancePu`，输出必是 `i_r` 之类。
    //   而只有三绕组含 `i_r`，所以去掉段名限定对其它段不可观测。
    const withBareR = Object.keys(E_SECTION_COLUMNS).filter((s) => has(s, "r"));
    expect(withBareR, "★ 含裸 r 的 4 段").toEqual(["ACBranch", "DCBranch", "ACTransformer", "ACTransWinding"]);
    for (const section of withBareR) {
      expect(col(section, "r"), `${section} 直接命中`).toBe("r");
      expect(col(section, "highResistancePu"), `${section} 侧边式仍空`).toBe("");
      expect(col(section, "r1"), `${section} 无侧边形态`).toBe("");
    }
    // 两绕组变压两段的裸列集合（探针实测）
    expect(E_SECTION_COLUMNS.ACTransformer).toEqual([
      "idx", "name", "i_node", "j_node", "rated_capacity", "i_i_max", "j_i_max",
      "r", "x", "gt", "bt", "tap", "tap_set", "shift", "run_stat"
    ]);
    expect(E_SECTION_COLUMNS.ACTransWinding).toEqual([
      "idx", "name", "i_node", "j_node", "r", "x", "gt", "bt", "tap", "shift", "run_stat"
    ]);
    // 变流器三段含 `r1`/`r2`（**直接命中**，不是侧边式）
    const withR1 = Object.keys(E_SECTION_COLUMNS).filter((s) => has(s, "r1"));
    expect(withR1).toEqual(["DCDCConverter", "DCACConverter", "ACACConverter"]);
    for (const section of withR1) {
      expect(col(section, "r1"), `${section} 直接命中`).toBe("r1");
      expect(col(section, "highResistancePu"), `${section} 侧边式仍空`).toBe("");
    }
  });

  test("编号式与侧边式**混用**也各自成立", () => {
    expect(col("ACTransfomer3", "r1")).toBe("i_r");
    expect(col("ACTransfomer3", "highResistancePu")).toBe("i_r");
    expect(col("ACTransfomer3", "r2")).toBe("k_r");
    expect(col("ACTransfomer3", "mediumResistancePu")).toBe("k_r");
  });
});

describe("变流器控制类型列：control_type 被**刻意拒绝**", () => {
  // ★ 只有 `ACACConverter` / `DCDCConverter` 两段走 source/target → i/j 映射。
  //   `DCACConverter`（交直流耦合变流器）是**第三种形态**：它的清单里是
  //   `ac_control_type` / `dc_control_type`，**直接命中**第一级，不走任何映射。
  const sideBySide = ["ACACConverter", "DCDCConverter"];

  for (const section of sideBySide) {
    test(`${section}：i/j 两侧映射`, () => {
      expect(col(section, "i_control_type")).toBe("i_control_type");
      expect(col(section, "j_control_type")).toBe("j_control_type");
      expect(col(section, "source_control_type")).toBe("i_control_type");
      expect(col(section, "target_control_type")).toBe("j_control_type");
      // 驼峰形态走**另一条**规则（`enName === \"sourceControlType\"`）
      expect(col(section, "sourceControlType")).toBe("i_control_type");
      expect(col(section, "targetControlType")).toBe("j_control_type");
    });

    test(`${section}：source/target 有**多条**通往 i/j 的路`, () => {
      // 变异 ③④ 摘掉的是 `toSnakeCaseDeviceParamName` 那条分支里的
      // `source_control_type` / `target_control_type` 子句。首轮全绿 ——
      // 因为后面还有两条独立规则兜住了同一输入。
      //
      // 路 A（被变异摘掉的）：`normalizedName === \"i_control_type\" || === \"source_control_type\"`
      // 路 B：`enName === \"sourceControlType\" || enName === \"source_control_type\"`
      // 路 C（直接命中）：`i_control_type` / `j_control_type` 本身在清单里
      //
      // 下面把三条路的可达输入分开钉。三条对**同一输入**给同一结论，
      // 这正是摘掉任一条也不改变输出的原因（不是覆盖不足）。
      const toI = ["i_control_type", "source_control_type", "sourceControlType"];
      const toJ = ["j_control_type", "target_control_type", "targetControlType"];
      for (const enName of toI) {
        expect(col(section, enName), `→ i_control_type 的 ${enName}`).toBe("i_control_type");
      }
      for (const enName of toJ) {
        expect(col(section, enName), `→ j_control_type 的 ${enName}`).toBe("j_control_type");
      }
      // 前提：路 C 成立（清单里确有这两列）
      expect(has(section, "i_control_type"), "路 C 前提").toBe(true);
      expect(has(section, "j_control_type"), "路 C 前提").toBe(true);
      // 路 B 的两个输入给同一结论
      expect(col(section, "source_control_type")).toBe(col(section, "sourceControlType"));
      expect(col(section, "target_control_type")).toBe(col(section, "targetControlType"));
    });
  }

  test("★ 大写下划线形态也命中（`toSnakeCaseDeviceParamName` 先归一）", () => {
    // 探针实测：`SOURCE_CONTROL_TYPE` → toSnake → `source_control_type` → `i_control_type`。
    // 我第一版只测了小写下划线，漏了大写形态。
    for (const section of ["ACACConverter", "DCDCConverter"]) {
      expect(col(section, "SOURCE_CONTROL_TYPE"), section).toBe("i_control_type");
      expect(col(section, "TARGET_CONTROL_TYPE"), section).toBe("j_control_type");
      expect(col(section, "I_CONTROL_TYPE"), section).toBe("i_control_type");
      expect(col(section, "J_CONTROL_TYPE"), section).toBe("j_control_type");
    }
  });

  test("★ `control_type` 恒映射失败（被 `return \"\"` 挡掉）", () => {
    for (const section of sideBySide) {
      expect(col(section, "control_type"), section).toBe("");
      expect(col(section, "controlType"), section).toBe("");
      // 前置：这两段的清单里**没有** control_type 列，所以第一级也不命中
      expect(has(section, "control_type"), `${section} 清单无 control_type`).toBe(false);
    }
  });

  test("★ `DCACConverter` 的 ac/dc_control_type 走**直接命中**（不是被挡）", () => {
    // 我第一版以为这两个名字被 `isUnsupportedDcacControlField` 挡掉，
    // 被顶回 —— 那是**别的段**的行为（见下一条）。DCACConverter 的清单里
    // 真有这两列，所以第一级 `columns.includes(enName)` 就返回了。
    expect(has("DCACConverter", "ac_control_type")).toBe(true);
    expect(has("DCACConverter", "dc_control_type")).toBe(true);
    expect(col("DCACConverter", "ac_control_type")).toBe("ac_control_type");
    expect(col("DCACConverter", "dc_control_type")).toBe("dc_control_type");
    // 它**没有** i/j/source/target 映射
    for (const enName of ["i_control_type", "j_control_type", "source_control_type", "target_control_type"]) {
      expect(col("DCACConverter", enName), enName).toBe("");
    }
    expect(col("DCACConverter", "control_type"), "清单无此列且无映射").toBe("");
  });

  test("`ac_control_type` / `dc_control_type` 在**清单里没有**的段 → 被 `isUnsupportedDcacControlField` 挡掉", () => {
    // 该判定的条件是「段是变流器段 + 归一化名是 ac/dc_control_type + 原名与归一名不同」。
    // 对 `ACACConverter` / `DCDCConverter`：清单无这两列 → return ""。
    for (const section of sideBySide) {
      expect(col(section, "ac_control_type"), section).toBe("");
      expect(col(section, "dc_control_type"), section).toBe("");
      // 大写形式：`rawName !== normalizedName` 成立 → 同样被挡
      expect(col(section, "AC_CONTROL_TYPE"), section).toBe("");
      expect(col(section, "Ac_Control_Type"), section).toBe("");
      // 驼峰形式：toSnakeCase 归一后仍是 ac_control_type，也被挡
      expect(col(section, "acControlType"), section).toBe("");
      expect(col(section, "ACControlType"), section).toBe("");
      expect(col(section, "dcControlType"), section).toBe("");
    }
  });

  test("★ 等价变异 ⑫：`isUnsupportedDcacControlField` 这道关口当前**不可观测**", () => {
    // 变异：把 `if (isUnsupportedDcacControlField(section, enName)) return \"\";`
    // 改 `if (false) return \"\";`。首轮全绿。查清原因 —— 双重的：
    //   ① 变流器两段的清单里**没有** `ac/dc_control_type` 列，
    //      所以 `columns.includes` 第一级就不命中；
    //   ② 这两个名字在 `LEGACY_E_DEFINITION_COLUMN_ALIASES` 里**也没有**条目，
    //      所以末尾 `alias && … ? alias : \"\"` 同样落空串。
    //   ⇒ 两道后面的关卡各自都会给出 `""`，摘掉中间这道不改变输出。
    //
    //   ⚠ 什么会让它失效：给 `LEGACY_E_DEFINITION_COLUMN_ALIASES` 加一条
    //      `acControlType: "ac_control_type"`，或给变流器段加该列 ——
    //      那时这道关口才开始起作用（它挡的是「段与列不匹配」的历史遗留映射）。
    // 下面把这三条前提都写成断言。
    for (const section of sideBySide) {
      expect(has(section, "ac_control_type"), `前提① ${section} 无该列`).toBe(false);
      expect(has(section, "dc_control_type"), `前提① ${section} 无该列`).toBe(false);
      expect(has(section, "acControlType"), `前提① ${section} 无驼峰列`).toBe(false);
    }
    // 前提②：别名表无这些键（用「除它以外全部映射失败」反证不可行，
    // 直接断言结果为空即可 —— 若将来加了别名，这条会先转红）
    expect(col("ACACConverter", "acControlType")).toBe("");
    expect(col("DCDCConverter", "acControlType")).toBe("");
    // 前提③：唯一的含该列的段是 DCACConverter，而它**不**走这道关口
    //   （该判定要求段是 ACACConverter / DCDCConverter 之一）
    expect(Object.keys(E_SECTION_COLUMNS).filter((s) => has(s, "ac_control_type"))).toEqual(["DCACConverter"]);
  });

  test("非变流器段没有 i/j/source/target 映射", () => {
    for (const section of ["ACTransformer", "ACBranch", "Station", "ACLoad"]) {
      for (const enName of ["i_control_type", "source_control_type", "sourceControlType"]) {
        expect(col(section, enName), `${section}/${enName}`).toBe("");
      }
    }
  });
});

describe("★ `LEGACY_E_DEFINITION_COLUMN_ALIASES`：别名映射后仍要过清单校验", () => {
  test("三绕组的 maxCurrent 别名族（4 个写法 × 3 个侧边）", () => {
    const table: Array<[string, string]> = [
      ["highMaxCurrent", "i_i_max"], ["high_max_current", "i_i_max"],
      ["highIMax", "i_i_max"], ["high_i_max", "i_i_max"],
      ["mediumMaxCurrent", "k_i_max"], ["medium_max_current", "k_i_max"],
      ["mediumIMax", "k_i_max"], ["medium_i_max", "k_i_max"],
      ["lowMaxCurrent", "j_i_max"], ["low_max_current", "j_i_max"],
      ["lowIMax", "j_i_max"], ["low_i_max", "j_i_max"]
    ];
    for (const [input, expected] of table) {
      expect(col("ACTransfomer3", input), input).toBe(expected);
    }
    for (const c of ["i_i_max", "k_i_max", "j_i_max"]) {
      expect(has("ACTransfomer3", c), c).toBe(true);
    }
  });

  test("裸 `maxCurrent` 别名族（只在线路/开关/断路器段命中）", () => {
    // `maxCurrent` / `max_current` / `iMax` → `i_max`。
    // 含 `i_max` 的段共 7 个 —— 都是两端设备。线路段实测如下。
    const sectionsWithIMax = Object.keys(E_SECTION_COLUMNS).filter((s) => has(s, "i_max"));
    expect(sectionsWithIMax).toEqual([
      "ACBranch", "DCBranch", "ACSwitch", "DCSwitch", "ACBreak", "DCBreak", "GroundDisconnector"
    ]);
    for (const section of sectionsWithIMax) {
      for (const input of ["maxCurrent", "max_current", "iMax"]) {
        expect(col(section, input), `${section}/${input}`).toBe("i_max");
      }
    }
    // 不含 `i_max` 的段一律落空串
    for (const section of ["Station", "ACRealBs", "ACLoad", "ACGenerator", "ACTransformer", "DCDCConverter"]) {
      expect(col(section, "maxCurrent"), section).toBe("");
    }
  });

  test("ratedCapacity 别名族", () => {
    const table: Array<[string, string]> = [
      ["highRatedCapacity", "i_rated_capacity"],
      ["high_rated_capacity", "i_rated_capacity"],
      ["mediumRatedCapacity", "k_rated_capacity"],
      ["medium_rated_capacity", "k_rated_capacity"],
      ["lowRatedCapacity", "j_rated_capacity"],
      ["low_rated_capacity", "j_rated_capacity"]
    ];
    for (const [input, expected] of table) {
      expect(col("ACTransfomer3", input), input).toBe(expected);
    }
  });

  test("`ratedPower` → `rated_capacity`（18 个段含该列）", () => {
    const sections = Object.keys(E_SECTION_COLUMNS).filter((s) => has(s, "rated_capacity"));
    expect(sections.length).toBe(18);
    for (const section of sections) {
      for (const input of ["ratedPower", "rated_power"]) {
        expect(col(section, input), `${section}/${input}`).toBe("rated_capacity");
      }
    }
    // 不含该列的段落空串
    for (const section of ["Station", "ACRealBs", "ACNode", "ACCompensator"]) {
      expect(col(section, "ratedPower"), section).toBe("");
    }
    // ★ 没有任何段含 `rated_power` 列 —— 所以别名必须映射到 rated_capacity，
    //   否则这一族参数会被静默丢弃。
    expect(Object.keys(E_SECTION_COLUMNS).filter((s) => has(s, "rated_power")).length).toBe(0);
  });

  test("★ 同一别名在**缺该列的段**上得空串（清单校验拦下）", () => {
    // `maxCurrent` → `i_max`；Station / ACRealBs 的清单里没有 i_max。
    expect(has("ACRealBs", "i_max"), "前置：ACRealBs 无 i_max").toBe(false);
    expect(col("ACRealBs", "maxCurrent")).toBe("");
    expect(col("Station", "maxCurrent")).toBe("");
    // ★ 三绕组**也没有**裸 `i_max`（只有 i_i_max / k_i_max / j_i_max）——
    //   所以 `maxCurrent` 在三绕组上落空串，而带侧边前缀的版本命中。
    expect(has("ACTransfomer3", "i_max"), "★ 三绕组无裸 i_max").toBe(false);
    expect(col("ACTransfomer3", "maxCurrent"), "★ 别名映射到清单外 → 空串").toBe("");
    expect(col("ACTransfomer3", "iMax"), "★ 同上").toBe("");
    expect(col("ACTransfomer3", "highMaxCurrent"), "★ 带侧边前缀 → 清单内").toBe("i_i_max");
  });

  test("★ 原型链键被**清单校验挡住**，返回 `\"\"` 而不是函数", () => {
    // `LEGACY_E_DEFINITION_COLUMN_ALIASES[\"toString\"]` 走原型链取到函数，
    // 但末尾是 `alias && columns.includes(alias) ? alias : \"\"` ——
    // `columns.includes(函数)` 必假，所以安全地返回空串。
    // ★ 与 `normalizeControlTypeForE` 那处不同：那里的函数**逃出去了**（返回类型标注
    //   string 但实际是函数），这里被挡住了。两条差别就在这个 `&&` 上。
    for (const enName of ["toString", "constructor", "__proto__", "hasOwnProperty", "valueOf"]) {
      const value = col("ACBranch", enName);
      expect(typeof value, enName).toBe("string");
      expect(value, enName).toBe("");
    }
    // 对照：正常别名是字符串
    expect(typeof col("ACBranch", "maxCurrent")).toBe("string");
  });

  test("未登记的 enName → 空串", () => {
    for (const enName of ["zzz", "someRandomParam", "i_", "i__max"]) {
      expect(col("ACBranch", enName), enName).toBe("");
    }
  });
});

test("★ 等价变异 ①：未知段兜成空数组（`?? []`）不改变输出", () => {
  // 变异：`const columns = E_SECTION_COLUMNS[section];` 改 `?? []`。
  //   —— 未知段时 `columns` 是 `undefined`，原来的 `if (!columns) return ""`
  //      立刻早返回；改成 `?? []` 后 `columns` 变成 `[]`（truthy），
  //      早返回不生效，但后续所有 `columns.includes(...)` 在空数组上**必假**，
  //      末尾的 `alias && columns.includes(alias) ? alias : ""` 也必落空串。
  //   ⇒ 对未知段输出恒为 `""`，两种写法相同。全绿是**正确**的。
  //   ⚠ 什么会让它失效：若某条规则改成「数组非空才处理」或用到 `columns.length`，
  //      空数组与 undefined 就会有差别。
  //   注意「原型链段名」不在此列 —— 见上面那条原型链用例：`__proto__` 查表得
  //   `Object.prototype`（truthy），`.includes` 直接抛 TypeError，两种写法都抛。
  for (const section of ["nope", "", "acbus", "acrealbs", "ACREALBS", " ACRealBs"]) {
    expect(col(section, "idx"), JSON.stringify(section)).toBe("");
    expect(col(section, "r1"), JSON.stringify(section)).toBe("");
    expect(col(section, "highResistancePu"), JSON.stringify(section)).toBe("");
    expect(col(section, "maxCurrent"), JSON.stringify(section)).toBe("");
  }
});

describe("映射链的顺序：先直接命中，再依次试各组规则", () => {
  test("直接命中**优先于**别名映射", () => {
    // 若某段的清单里真有 `control_type`，第一级 `columns.includes` 就会返回它，
    // 不会走到后面 `return \"\"` 的拒绝分支。
    // 变流器两段都**没有**该列，所以拒绝分支生效。
    for (const section of ["ACACConverter", "DCDCConverter"]) {
      expect(has(section, "control_type"), `${section} 无 control_type 列`).toBe(false);
      expect(has(section, "i_control_type"), `${section} 有 i_control_type`).toBe(true);
    }
    // `DCACConverter` 是反证：它的 ac/dc_control_type **在清单里**，
    // 所以走第一级直接返回，根本到不了任何映射规则。
    expect(has("DCACConverter", "ac_control_type")).toBe(true);
    expect(col("DCACConverter", "ac_control_type")).toBe("ac_control_type");
  });

  test("含 `control_type` 列的段有 13 个（全是电源/水电/耦合类）", () => {
    const sections = Object.keys(E_SECTION_COLUMNS).filter((s) => has(s, "control_type"));
    expect(sections).toEqual([
      "ACGenerator", "DCGenerator", "HydroSource", "HydroLoad", "HydroStorage",
      "AcE2Hydro", "DcE2Hydro", "Hydro2AcE", "Hydro2DcE",
      "AcE2Heat", "DcE2Heat", "AcE2Heat2", "DcE2Heat2"
    ]);
    // 这些段的 `control_type` 是**直接命中**（第一级），不是别名映射
    for (const section of sections) {
      expect(col(section, "control_type"), section).toBe("control_type");
    }
  });

  test("三绕组的 `t2_node` 先试 k 再试 j（顺序写在源码里）", () => {
    // 若两段都有 k_node 与 j_node，k 胜出。用 ACTransfomer3 实测。
    expect(has("ACTransfomer3", "k_node") && has("ACTransfomer3", "j_node")).toBe(true);
    expect(col("ACTransfomer3", "t2_node")).toBe("k_node");
  });

  test("三绕组的编号式规则先于侧边式（两者不冲突但顺序固定）", () => {
    // `r1` 只匹配编号式正则；`highResistancePu` 只匹配侧边式正则。互不重叠，
    // 但源码里编号式在前 —— 钉住当前行为即可。
    expect(col("ACTransfomer3", "r1")).toBe("i_r");
    expect(col("ACTransfomer3", "highResistancePu")).toBe("i_r");
    expect(col("ACTransfomer3", "r1ResistancePu"), "混合形态不命中任一正则").toBe("");
  });

  test("全链路幂等：同一输入恒得同一列名", () => {
    const probes: Array<[string, string]> = [
      ["ACTransfomer3", "r1"], ["ACTransfomer3", "highResistancePu"],
      ["ACBranch", "t2_node"], ["ACACConverter", "source_control_type"],
      ["ACBranch", "maxCurrent"], ["ACTransfomer3", "maxCurrent"]
    ];
    for (const [section, enName] of probes) {
      const once = col(section, enName);
      for (let i = 0; i < 20; i += 1) {
        expect(col(section, enName), `${section}/${enName}`).toBe(once);
      }
    }
  });

  test("不改入参（形参都是 string）", () => {
    const section = "ACTransfomer3";
    const enName = "r1";
    col(section, enName);
    expect(section).toBe("ACTransfomer3");
    expect(enName).toBe("r1");
  });

  test("不改 `E_SECTION_COLUMNS`（只读 includes）", () => {
    const snapshot = JSON.stringify(E_SECTION_COLUMNS);
    for (const section of Object.keys(E_SECTION_COLUMNS)) {
      col(section, "i_max");
      col(section, "r1");
      col(section, "highResistancePu");
    }
    expect(JSON.stringify(E_SECTION_COLUMNS)).toBe(snapshot);
  });
});
