// src/model.ts 的 normalizeHydrogenStorageParams：储氢设备的旧名参数迁移 + 存盘定义串规范化。
// 纯函数、不抛异常 —— 判错后果是「储氢罐的额定容量列空着」「存盘的 _customParamDefinitions 与
// 实际字段对不上、界面参数表少一行」，属静默算错一类。
import { describe, expect, test } from "vitest";

import { normalizeHydrogenStorageParams } from "./model";

type Hydrogen = { kind: string; params: Record<string, string> };

const HYDROGEN_KINDS = ["hydrogen-tank", "hydrogen-tank-horizontal", "hydrogen-tank-container"];

const normalize = (kind: string, params: Record<string, string>) =>
  normalizeHydrogenStorageParams<Hydrogen>({ kind, params });

const definitionsOf = (kind: string, stored: string) =>
  JSON.parse(normalize(kind, { _customParamDefinitions: stored }).params._customParamDefinitions) as unknown[];

describe("normalizeHydrogenStorageParams：只有储氢 kind 参与", () => {
  test("非储氢 kind 原样返回**同一 params 引用**（capacity 留着不动）", () => {
    const params = { capacity: "5" };
    const result = normalize("ac-bus", params);
    expect(result.params).toBe(params);
    expect(result.kind).toBe("ac-bus");
    expect(normalize("load", params).params).toEqual({ capacity: "5" });
  });

  test("三个储氢 kind 都参与迁移", () => {
    for (const kind of HYDROGEN_KINDS) {
      expect(normalize(kind, { capacity: "5" }).params, kind).toEqual({ rated_capacity: "5" });
    }
  });

  test("★ 派生 kind 先剥竖排后缀再判（hydrogen-tank-vertical 按储氢罐处理）", () => {
    expect(normalize("hydrogen-tank-vertical", { capacity: "5" }).params).toEqual({ rated_capacity: "5" });
  });
});

describe("normalizeHydrogenStorageParams：capacity → rated_capacity 迁移", () => {
  test("旧名搬到本名，搬完就删", () => {
    const result = normalize("hydrogen-tank", { capacity: "5" });
    expect(result.params.rated_capacity).toBe("5");
    expect(Object.prototype.hasOwnProperty.call(result.params, "capacity")).toBe(false);
  });

  test("★ 本名列已有值时旧名不覆盖（并且照样被删，不留两份）", () => {
    const result = normalize("hydrogen-tank", { capacity: "5", rated_capacity: "9" });
    expect(result.params).toEqual({ rated_capacity: "9" });
  });

  test("★ 本名列是纯空白时按「缺失」处理，用旧名顶上", () => {
    // 判据是 `!String(rated_capacity ?? "").trim()`，不是「键不存在」
    expect(normalize("hydrogen-tank", { capacity: "5", rated_capacity: "   " }).params).toEqual({ rated_capacity: "5" });
  });

  test("★ 本名列是 '0' 算已填，不被旧名覆盖", () => {
    expect(normalize("hydrogen-tank", { capacity: "5", rated_capacity: "0" }).params).toEqual({ rated_capacity: "0" });
  });

  test("旧名给的是空串也照样搬（搬过去是空串，不是补默认值）", () => {
    expect(normalize("hydrogen-tank", { capacity: "" }).params).toEqual({ rated_capacity: "" });
  });

  test("非量测键原样带过（迁移只动 capacity）", () => {
    expect(normalize("hydrogen-tank", { capacity: "5", soc: "0.5", note: "备注" }).params).toEqual({
      soc: "0.5",
      note: "备注",
      rated_capacity: "5"
    });
  });

  test("没有旧名也没有定义串 → 原对象引用（没变就不复制）", () => {
    const params: Record<string, string> = { soc: "0.5" };
    expect(normalize("hydrogen-tank", params).params).toBe(params);
  });

  test("迁移走副本：返回值与 params 都是新对象，入参不被改", () => {
    const input: Hydrogen = { kind: "hydrogen-tank", params: { capacity: "5" } };
    const result = normalizeHydrogenStorageParams(input);
    expect(result).not.toBe(input);
    expect(result.params).not.toBe(input.params);
    expect(input.params).toEqual({ capacity: "5" });
  });
});

describe("normalizeHydrogenStorageParams：_customParamDefinitions 规范化", () => {
  test("★ 旧名定义改名成 rated_capacity，中文名与值类型被强制改写", () => {
    const definitions = definitionsOf("hydrogen-tank", JSON.stringify([
      { enName: "capacity", cnName: "自定义容量", valueType: "string", typicalValue: "9" }
    ]));
    expect(definitions).toEqual([
      {
        enName: "rated_capacity",
        cnName: "额定容量(m3)",
        valueType: "float",
        typicalValue: "9"
      }
    ]);
  });

  test("驼峰 enName 同样被认成本名（ratedCapacity → rated_capacity）", () => {
    expect(definitionsOf("hydrogen-tank", JSON.stringify([{ enName: "ratedCapacity", valueType: "string" }]))).toEqual([
      { enName: "rated_capacity", cnName: "额定容量(m3)", valueType: "float" }
    ]);
  });

  test("★ exportName：指向 capacity 的改名，其余原样保留", () => {
    const renamed = definitionsOf("hydrogen-tank", JSON.stringify([
      { enName: "capacity", exportName: "capacity" }
    ]));
    expect(renamed[0]).toEqual({
      enName: "rated_capacity",
      cnName: "额定容量(m3)",
      valueType: "float",
      exportName: "rated_capacity"
    });
    const kept = definitionsOf("hydrogen-tank", JSON.stringify([
      { enName: "capacity", exportName: "RC" }
    ]));
    expect((kept[0] as { exportName: string }).exportName).toBe("RC");
  });

  test("没写 exportName 时结果里不出现这个键", () => {
    // 只能从序列化字符串上钉：解析回来的对象里若多一个 `exportName: undefined`，
    // JSON.stringify 早已把它丢掉了 —— 那种写法在输出上**不可观测**（见文件末尾记录）。
    const raw = normalize("hydrogen-tank", { _customParamDefinitions: JSON.stringify([{ enName: "capacity" }]) })
      .params._customParamDefinitions;
    expect(raw).not.toContain("exportName");
  });

  test("★ 两条容量定义只留一条，位置取第一条；后出现的是本名时用后者内容顶替前者", () => {
    const definitions = definitionsOf("hydrogen-tank", JSON.stringify([
      { enName: "capacity", typicalValue: "5", exportName: "capacity" },
      { enName: "rated_capacity", typicalValue: "9", exportName: "rc" },
      { enName: "soc" }
    ]));
    expect(definitions).toHaveLength(2);
    // 留在第一条的位置，但内容（典型值/导出名）换成后出现的那条本名定义
    expect(definitions[0]).toEqual({
      enName: "rated_capacity",
      cnName: "额定容量(m3)",
      valueType: "float",
      typicalValue: "9",
      exportName: "rc"
    });
    expect(definitions[1]).toEqual({ enName: "soc" });
  });

  test("本名在前时，后面的旧名定义被直接丢弃（不顶替）", () => {
    const definitions = definitionsOf("hydrogen-tank", JSON.stringify([
      { enName: "rated_capacity", typicalValue: "9" },
      { enName: "capacity", typicalValue: "5" }
    ]));
    expect(definitions).toEqual([
      { enName: "rated_capacity", cnName: "额定容量(m3)", valueType: "float", typicalValue: "9" }
    ]);
  });

  test("非对象的条目原样保留（null / 字符串不参与改名）", () => {
    expect(definitionsOf("hydrogen-tank", JSON.stringify(["x", null, { enName: "capacity" }]))).toEqual([
      "x",
      null,
      { enName: "rated_capacity", cnName: "额定容量(m3)", valueType: "float" }
    ]);
  });

  test("★ 与容量无关的定义原样带过（连 enName 大小写都不动）", () => {
    expect(definitionsOf("hydrogen-tank", JSON.stringify([{ enName: "Soc", valueType: "string" }]))).toEqual([
      { enName: "Soc", valueType: "string" }
    ]);
  });

  test("坏 JSON / 非数组 JSON / 空串都原样保留，且返回原引用", () => {
    const objectJson = JSON.stringify({ rated_capacity: {} });
    for (const stored of ["坏JSON", objectJson, ""]) {
      const params: Record<string, string> = { _customParamDefinitions: stored };
      const result = normalize("hydrogen-tank", params);
      expect(result.params._customParamDefinitions, stored).toBe(stored);
      expect(result.params, stored).toBe(params);
    }
  });

  test("已经是规范结果时保持原字符串与原引用（幂等）", () => {
    const once = normalize("hydrogen-tank", { capacity: "5", _customParamDefinitions: "[]" });
    expect(normalize("hydrogen-tank", once.params).params).toBe(once.params);
  });
});

// ─── 两处「改了也看不出差别」的等价写法（如实记录，不计入覆盖）─────────
//
// 1. `const serialized = JSON.stringify(normalized); return serialized === value ? value : serialized;`
//    里的短路 —— 调用方用 `!==` 比较**字符串**（按值比较），值相等即判不出差别，
//    重新序列化出等值字符串在 JS 里无法与原字符串区分，故这道短路只省一次字符串构造。
// 2. 定义串里 `...(definition.exportName !== undefined ? { exportName: … } : {})` 的 `: {}` 分支 ——
//    改成 `: { exportName: undefined }` 同样不可观测：函数返回的是**序列化字符串**，
//    `JSON.stringify` 会丢掉值为 undefined 的属性，输出逐字节相同。
//
// 上面的用例钉的是可观测结果（迁移后的键值、定义串的键集合、引用复用），不是这两处本身。
