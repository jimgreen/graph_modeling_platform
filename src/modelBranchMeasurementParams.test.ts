// src/model.ts 的 normalizeBranchMeasurementParams：线路量测字段的旧名迁移 + 缺字段补零。
// 纯函数、不抛异常 —— 判错后果是「线路的量测值全落成 0」「旧名参数没搬过来、界面量测列空着」
// 「存盘的 _customParamDefinitions 与实际字段对不上」，属静默算错一类。
import { describe, expect, test } from "vitest";

import { normalizeBranchMeasurementParams } from "./model";

const AC_FIELDS = ["i_p", "i_q", "i_u", "i_i", "j_p", "j_q", "j_u", "j_i"];
const DC_FIELDS = ["i_p", "i_u", "i_i", "j_p", "j_u", "j_i"];

const zeros = (fields: readonly string[]) => Object.fromEntries(fields.map((field) => [field, "0"]));

describe("normalizeBranchMeasurementParams：契约分派", () => {
  test("交流线路补齐 8 个量测字段（两端 × 有功/无功/电压/电流）", () => {
    expect(normalizeBranchMeasurementParams("ac-line", {})).toEqual(zeros(AC_FIELDS));
    expect(normalizeBranchMeasurementParams("ac-routable-line", {})).toEqual(zeros(AC_FIELDS));
  });

  test("★ 直流线路只有 6 个 —— 没有无功列", () => {
    expect(normalizeBranchMeasurementParams("dc-line", {})).toEqual(zeros(DC_FIELDS));
    expect(normalizeBranchMeasurementParams("dc-routable-line", {})).toEqual(zeros(DC_FIELDS));
  });

  test("★ 派生 kind 先剥掉竖排后缀再判契约（ac-line-vertical 按交流线路处理）", () => {
    expect(normalizeBranchMeasurementParams("ac-line-vertical", {})).toEqual(zeros(AC_FIELDS));
  });

  test("非线路 kind 返回**原对象引用**（不复制、不补零、不删键）", () => {
    const params = { p: "1", q: "2" };
    for (const kind of ["ac-bus", "ac-line-x", "", "load"]) {
      const result = normalizeBranchMeasurementParams(kind, params);
      expect(result, kind).toBe(params);
      expect(result, kind).toEqual({ p: "1", q: "2" });
    }
  });

  test("非量测键原样带过（补零只针对契约字段）", () => {
    expect(normalizeBranchMeasurementParams("ac-line", { name: "线路", vbase: "10.5" }))
      .toEqual({ name: "线路", vbase: "10.5", ...zeros(AC_FIELDS) });
  });
});

describe("normalizeBranchMeasurementParams：旧名迁移", () => {
  test("p / q / u / i 四个旧名搬到首端对应列，搬完就删", () => {
    expect(normalizeBranchMeasurementParams("ac-line", { p: "1", q: "2", u: "3", i: "4" })).toEqual({
      i_p: "1",
      i_q: "2",
      i_u: "3",
      i_i: "4",
      ...zeros(["j_p", "j_q", "j_u", "j_i"])
    });
  });

  test("★ 本名列已有值时旧名不覆盖，但旧名照样删除", () => {
    const result = normalizeBranchMeasurementParams("ac-line", { p: "旧", i_p: "新" });
    expect(result.i_p).toBe("新");
    expect(Object.prototype.hasOwnProperty.call(result, "p")).toBe(false);
  });

  test("★ 本名列是纯空白时按「缺失」处理，用旧名顶上", () => {
    // 判据是 `!String(next[canonical] ?? "").trim()`，不是「键不存在」
    expect(normalizeBranchMeasurementParams("ac-line", { p: "1", i_p: "   " }).i_p).toBe("1");
  });

  test("★ 旧名给的是空串也照样搬（搬过去是空串，不是补零）", () => {
    const result = normalizeBranchMeasurementParams("ac-line", { p: "" });
    expect(result.i_p).toBe("");
    // 键已存在，补零那一步不会再碰它
    expect(normalizeBranchMeasurementParams("ac-line", { i_p: "" }).i_p).toBe("");
  });

  test("★ 直流侧没有无功列：q 旧名被直接丢弃，不落到任何地方", () => {
    const result = normalizeBranchMeasurementParams("dc-line", { q: "5" });
    expect(Object.prototype.hasOwnProperty.call(result, "q")).toBe(false);
    expect(result.i_q).toBeUndefined();
    // ★ 也没落到别的列上 —— 六个字段全是补出来的 0（若把 q 映射到 i_p，这里会是 i_p:"5"）
    expect(result).toEqual(zeros(DC_FIELDS));
    // 其余三个旧名照常搬
    expect(normalizeBranchMeasurementParams("dc-line", { p: "1", u: "2", i: "3" })).toEqual({
      i_p: "1",
      i_u: "2",
      i_i: "3",
      ...zeros(["j_p", "j_u", "j_i"])
    });
  });

  test("末端列没有旧名：已填的 j_* 原样保留", () => {
    expect(normalizeBranchMeasurementParams("ac-line", { j_p: "9" }).j_p).toBe("9");
    // 旧名只映射到首端：j_p 不会被 p 覆盖
    expect(normalizeBranchMeasurementParams("ac-line", { p: "1", j_p: "9" })).toMatchObject({ i_p: "1", j_p: "9" });
  });
});

describe("normalizeBranchMeasurementParams：幂等与引用", () => {
  test("已完整的参数返回**原对象引用**（没变就不复制）", () => {
    const params: Record<string, string> = Object.fromEntries(AC_FIELDS.map((field) => [field, "1"]));
    const result = normalizeBranchMeasurementParams("ac-line", params);
    expect(result).toBe(params);
    // 带一个无关键也不算变化
    const withExtra = { ...params, name: "线路" };
    expect(normalizeBranchMeasurementParams("ac-line", withExtra)).toBe(withExtra);
  });

  test("★ 跑第二遍不再产生新对象（第一次的结果已是规范形）", () => {
    const once = normalizeBranchMeasurementParams("ac-line", { p: "1" });
    const twice = normalizeBranchMeasurementParams("ac-line", once);
    expect(twice).toBe(once);
    expect(twice).toEqual({ i_p: "1", ...zeros(["i_q", "i_u", "i_i", "j_p", "j_q", "j_u", "j_i"]) });
  });

  test("不修改入参（迁移走的是副本）", () => {
    const params = { p: "1" };
    normalizeBranchMeasurementParams("ac-line", params);
    expect(params).toEqual({ p: "1" });
  });
});

describe("normalizeBranchMeasurementParams：_customParamDefinitions 迁移", () => {
  const definitionsOf = (kind: string, stored: string) => {
    const raw = normalizeBranchMeasurementParams(kind, { _customParamDefinitions: stored });
    return JSON.parse(raw._customParamDefinitions) as Array<Record<string, unknown>>;
  };

  test("空数组被展开成契约字段的全量定义（顺序 = 契约顺序）", () => {
    const definitions = definitionsOf("ac-line", "[]");
    expect(definitions.map((definition) => definition.enName)).toEqual(AC_FIELDS);
    // 每个字段的固定属性：浮点、典型值 0、非只读、可导出、导出名同字段名
    for (const definition of definitions) {
      expect(definition.valueType, String(definition.enName)).toBe("float");
      expect(definition.typicalValue, String(definition.enName)).toBe("0");
      expect(definition.readonly, String(definition.enName)).toBe(false);
      expect(definition.exportEnabled, String(definition.enName)).toBe(true);
      expect(definition.exportName, String(definition.enName)).toBe(definition.enName);
    }
    expect(definitionsOf("dc-line", "[]").map((definition) => definition.enName)).toEqual(DC_FIELDS);
  });

  test("★ 旧名 p 的定义被改名成 i_p 并落到首位；值类型强制 float，典型值仍取旧定义的", () => {
    const definitions = definitionsOf("ac-line", JSON.stringify([{ enName: "p", valueType: "string", typicalValue: "9" }]));
    expect(definitions[0].enName).toBe("i_p");
    // 值类型由规范定义强制改写 —— 旧定义里写的 string 不作数
    expect(definitions[0].valueType).toBe("float");
    // 典型值是唯一从旧定义取用的字段
    expect(definitions[0].typicalValue).toBe("9");
    expect(definitions).toHaveLength(AC_FIELDS.length);
  });

  test("定义里的典型值被保留（覆盖默认值 0）", () => {
    const definitions = definitionsOf("ac-line", JSON.stringify([{ enName: "i_p", typicalValue: "  " }]));
    expect(definitions[0].typicalValue).toBe("0");
    const withValue = definitionsOf("ac-line", JSON.stringify([{ enName: "i_p", typicalValue: " 3.5 " }]));
    expect(withValue[0].typicalValue).toBe("3.5");
  });

  test("非契约的自定义定义留在末尾，并补上中文名", () => {
    const definitions = definitionsOf("ac-line", JSON.stringify([{ enName: "自定" }]));
    expect(definitions.map((definition) => definition.enName)).toEqual([...AC_FIELDS, "自定"]);
    expect(definitions.at(-1)?.cnName).toBe("自定义参数（自定）");
  });

  test("★ 解析不了就原样保留（坏 JSON / 非数组都不动它）", () => {
    expect(normalizeBranchMeasurementParams("ac-line", { _customParamDefinitions: "坏JSON" })._customParamDefinitions)
      .toBe("坏JSON");
    const objectJson = JSON.stringify({ i_p: {} });
    expect(normalizeBranchMeasurementParams("ac-line", { _customParamDefinitions: objectJson })._customParamDefinitions)
      .toBe(objectJson);
  });

  test("已经是规范序列化结果时保持原字符串（幂等）", () => {
    const once = normalizeBranchMeasurementParams("ac-line", { _customParamDefinitions: "[]" });
    const twice = normalizeBranchMeasurementParams("ac-line", once);
    expect(twice).toBe(once);
  });

  test("★ 只有定义串需要规范化、其余字段都齐时，仍返回**原对象引用**", () => {
    // 已规范的定义串不触发复制（第二次跑原样返回同一个对象）。
    // 注意：这条**不能**用来证明归一函数里 `serialized === value ? value : serialized`
    // 那道短路 —— JS 字符串按值比较，把短路去掉后调用方的 `storedDefinitions !== next[key]`
    // 判定结果完全一样（已验证：去掉短路后本用例仍全绿）。短路只是省一次字符串构造。
    const once = normalizeBranchMeasurementParams("ac-line", {
      ...Object.fromEntries(AC_FIELDS.map((field) => [field, "1"])),
      _customParamDefinitions: "[]"
    });
    expect(normalizeBranchMeasurementParams("ac-line", once)).toBe(once);
  });

  test("空串定义不是「没给」，原样留着不展开", () => {
    expect(normalizeBranchMeasurementParams("ac-line", { _customParamDefinitions: "" })._customParamDefinitions)
      .toBe("");
  });

  // 已证明 `normalizeBranchMeasurementParams` 里 `storedDefinitions === undefined` 那个
  // 分支**不可达**，不构成覆盖：归一函数只在入参为 undefined 时返回 undefined，而那时
  // `next[_customParamDefinitions]` 本身也是 undefined，外层 `!==` 判据为假、进不到分支。
  // （留着它是因为源文件如此，此处只做记录。）
});
