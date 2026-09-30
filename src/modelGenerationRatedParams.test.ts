// src/model.ts 的 normalizeElectricGenerationRatedParams 及其定义串规范化助手。
// 这一族此前零断言。判错后果是「发电机/储能的额定容量列空着」「旧名 rated_power 留在
// params 里与本名并存、导出时取到错的那个」，属静默算错一类。
//
// 29 处变异逐条跑过，27 处转红。2 处 NOT-CAUGHT 经论证为**源码等价**，不算本文件覆盖了它们：
//   1. `return serialized === value ? value : serialized` → `return serialized`：字符串按值比较，
//      两条路径返回值相同，外层那个 `!==` 判据拿到的也一样。
//   2. 归一结果为空时 `delete nextParams[KEY]` 那个 else 分支：助手在「无值 / 非数组 /
//      JSON 解析失败」三种情况下都原样返回入参（本就相等、不进外层 if），归一后的 `serialized`
//      至少是 `"[]"` 这样的真串 —— 该分支实际不可达。
import { describe, expect, test } from "vitest";

import { normalizeElectricGenerationRatedParams } from "./model";
import type { DeviceParameterDefinition, DeviceTemplate, ModelNode } from "./model";

type Device = { kind: string; params: Record<string, string> };

const node = (kind: string, params: Record<string, string> = {}): ModelNode =>
  ({
    id: "n1",
    kind,
    name: "n1",
    nodeNumber: "n1",
    position: { x: 0, y: 0 },
    size: { width: 100, height: 100 },
    rotation: 0,
    scale: 1,
    terminals: [],
    params
  }) as unknown as ModelNode;

const template = (params: Record<string, string>) => ({ params }) as unknown as DeviceTemplate;

const normalize = (kind: string, params: Record<string, string> = {}, tpl?: DeviceTemplate): ModelNode =>
  normalizeElectricGenerationRatedParams(node(kind, params), tpl);

const paramsOf = (result: ModelNode) => result.params as Record<string, string>;
const definitionsOf = (result: ModelNode): DeviceParameterDefinition[] =>
  JSON.parse(paramsOf(result)._customParamDefinitions ?? "null") as DeviceParameterDefinition[];

const DEFS = "_customParamDefinitions";

describe("normalizeElectricGenerationRatedParams：入口", () => {
  test("★ 非发电/储能 kind 原样返回**同一引用**（不复制、不补默认值）", () => {
    for (const kind of ["ac-load", "ac-line", "ac-bus", "heat-source", "dcdc-converter"]) {
      const input = node(kind, { rated_capacity: "5 MW" });
      const result = normalizeElectricGenerationRatedParams(input);
      expect(result, kind).toBe(input);
    }
  });

  test("ACGenerator 与 DCGenerator 都参与归一（ac-source / ac-storage / dc-storage）", () => {
    for (const kind of ["ac-source", "ac-storage", "dc-storage", "dc-source"]) {
      expect(paramsOf(normalize(kind)).rated_capacity, kind).toBe("10 MW");
    }
  });
});

describe("normalizeElectricGenerationRatedParams：额定容量取值优先级", () => {
  test("默认值是 10 MW / 额定电压 0", () => {
    const params = paramsOf(normalize("ac-source"));
    expect(params.rated_capacity).toBe("10 MW");
    expect(params.rated_voltage).toBe("0");
  });

  test("节点本名 > 节点旧名 > 模板本名 > 模板旧名 > 默认", () => {
    expect(paramsOf(normalize("ac-source", { rated_capacity: "1", rated_power: "2" })).rated_capacity).toBe("1");
    expect(paramsOf(normalize("ac-source", { rated_power: "2" })).rated_capacity).toBe("2");
    expect(
      paramsOf(normalize("ac-source", { rated_power: "2" }, template({ rated_capacity: "3", rated_power: "4" })))
        .rated_capacity
    ).toBe("2");
    expect(paramsOf(normalize("ac-source", {}, template({ rated_capacity: "3", rated_power: "4" }))).rated_capacity).toBe("3");
    expect(paramsOf(normalize("ac-source", {}, template({ rated_power: "4" }))).rated_capacity).toBe("4");
  });

  test("★ 节点没写电压时取模板的额定电压（模板只兜底、节点优先）", () => {
    expect(paramsOf(normalize("ac-source", {}, template({ rated_voltage: "110" }))).rated_voltage).toBe("110");
    expect(
      paramsOf(normalize("ac-source", { rated_voltage: "35" }, template({ rated_voltage: "110" }))).rated_voltage
    ).toBe("35");
  });

  test("驼峰 ratedCapacity 读得到（deviceParamValue 兼容驼峰）", () => {
    expect(paramsOf(normalize("ac-source", { ratedCapacity: "30 MW" })).rated_capacity).toBe("30 MW");
  });

  test("★ `'0'` 算已填，不被模板值覆盖", () => {
    const params = paramsOf(normalize("ac-source", { rated_capacity: "0" }, template({ rated_capacity: "7 MW" })));
    expect(params.rated_capacity).toBe("0");
  });
});

describe("normalizeElectricGenerationRatedParams：旧名清理", () => {
  test("★ 旧名键一定被删掉，即便本名列已有值（不留两份）", () => {
    const params = paramsOf(normalize("dc-storage", { rated_power: "1 MW", rated_capacity: "2 MW" }));
    expect(params.rated_capacity).toBe("2 MW");
    expect(Object.prototype.hasOwnProperty.call(params, "rated_power")).toBe(false);
  });

  test("驼峰 / 全大写 / 带连字符的变体都被归一后删掉", () => {
    const params = paramsOf(
      normalize("ac-source", { ratedCapacity: "30 MW", RATED_POWER: "40 MW", "rated-capacity": "50 MW" })
    );
    expect(params.rated_capacity).toBe("30 MW");
    expect(Object.keys(params).filter((key) => key !== "rated_capacity" && key !== "rated_voltage")).toEqual([]);
  });

  test("★ 下划线开头的私有键不参与清理", () => {
    const params = paramsOf(normalize("ac-source", { _customDeviceTemplate: "x", _rated_power: "keep", rated_power: "9 MW" }));
    expect(params._customDeviceTemplate).toBe("x");
    expect(params._rated_power).toBe("keep");
    expect(Object.prototype.hasOwnProperty.call(params, "rated_power")).toBe(false);
  });

  test("入参不被改（迁移走副本）", () => {
    const original = { rated_power: "9 MW" };
    normalizeElectricGenerationRatedParams(node("ac-source", original));
    expect(original).toEqual({ rated_power: "9 MW" });
  });

  test("已规范的节点再跑一次返回**同一引用**（幂等）", () => {
    const once = normalize("ac-source", { rated_power: "9 MW" });
    expect(normalizeElectricGenerationRatedParams(once)).toBe(once);
  });
});

describe("normalizeElectricGenerationRatedParams：_customParamDefinitions 规范化", () => {
  test("额定功率 → 额定容量：中文名 / 英文名 / 导出名一起改", () => {
    const result = normalize("ac-source", {
      [DEFS]: JSON.stringify([{ cnName: "额定功率", enName: "rated_power", exportName: "rated_power" }])
    });
    expect(definitionsOf(result)).toEqual([{ cnName: "额定容量", enName: "rated_capacity", exportName: "rated_capacity" }]);
  });

  test("中文名不是「额定功率」就不动", () => {
    const result = normalize("ac-source", {
      [DEFS]: JSON.stringify([{ cnName: "装机容量", enName: "rated_power" }])
    });
    expect(definitionsOf(result)).toEqual([{ cnName: "装机容量", enName: "rated_capacity" }]);
  });

  test("★ 导出名只在指向 rated_power 时跟着改名，别的导出名原样保留", () => {
    const renamed = normalize("ac-source", {
      [DEFS]: JSON.stringify([{ cnName: "额定功率", enName: "rated_power", exportName: "ratedPower" }])
    });
    expect(definitionsOf(renamed)).toEqual([
      { cnName: "额定容量", enName: "rated_capacity", exportName: "rated_capacity" }
    ]);
    const kept = normalize("ac-source", {
      [DEFS]: JSON.stringify([{ cnName: "额定功率", enName: "rated_power", exportName: "cap_mva" }])
    });
    expect(definitionsOf(kept)).toEqual([{ cnName: "额定容量", enName: "rated_capacity", exportName: "cap_mva" }]);
  });

  test("★ 两条容量定义只留一条，位置取**第一条**（与储氢那族「后出现的本名顶替」相反）", () => {
    const oldFirst = normalize("ac-source", {
      [DEFS]: JSON.stringify([{ cnName: "额定功率", enName: "rated_power" }, { cnName: "额定容量", enName: "rated_capacity" }])
    });
    expect(definitionsOf(oldFirst)).toEqual([{ cnName: "额定容量", enName: "rated_capacity" }]);
    const newFirst = normalize("ac-source", {
      [DEFS]: JSON.stringify([{ cnName: "额定容量", enName: "rated_capacity" }, { cnName: "额定功率", enName: "rated_power" }])
    });
    expect(definitionsOf(newFirst)).toEqual([{ cnName: "额定容量", enName: "rated_capacity" }]);
  });

  test("★ 已有本名定义时，旧名那条整条丢弃（不参与改名、不并入）", () => {
    const result = normalize("ac-source", {
      [DEFS]: JSON.stringify([
        { cnName: "额定功率", enName: "rated_power", exportName: "cap_mva", unit: "MW" },
        { cnName: "额定容量", enName: "rated_capacity", exportName: "rated_capacity", unit: "kVA" }
      ])
    });
    // 留下的必须是本名那条原样（导出名、附加值都不动），不是被改名过的旧名那条
    expect(definitionsOf(result)).toEqual([
      { cnName: "额定容量", enName: "rated_capacity", exportName: "rated_capacity", unit: "kVA" }
    ]);
  });

  test("★ 归一到同一英文名的多条只留**第一条**（rated_voltage 两个变体）", () => {
    const result = normalize("ac-source", {
      [DEFS]: JSON.stringify([
        { cnName: "额定电压", enName: "ratedVoltage" },
        { cnName: "高压侧电压", enName: "rated_voltage" }
      ])
    });
    expect(definitionsOf(result)).toEqual([{ cnName: "额定电压", enName: "rated_voltage" }]);
  });

  test("驼峰本名归一到本名，中文名照留", () => {
    const result = normalize("ac-source", { [DEFS]: JSON.stringify([{ cnName: "额定容量", enName: "ratedCapacity" }]) });
    expect(definitionsOf(result)).toEqual([{ cnName: "额定容量", enName: "rated_capacity" }]);
  });

  test("rated_voltage 变体只归一英文名", () => {
    const result = normalize("ac-source", { [DEFS]: JSON.stringify([{ cnName: "额定电压", enName: "ratedVoltage" }]) });
    expect(definitionsOf(result)).toEqual([{ cnName: "额定电压", enName: "rated_voltage" }]);
  });

  test("★ 非对象条目（null / 字符串）被**丢弃**（不像储氢那族是原样带过）", () => {
    const result = normalize("ac-source", { [DEFS]: JSON.stringify([null, "x", { enName: "rated_voltage" }]) });
    expect(definitionsOf(result)).toEqual([{ enName: "rated_voltage" }]);
  });

  test("坏 JSON / 非数组 JSON / 空串 / 空数组原样保留", () => {
    for (const raw of ["{", '{"a":1}', "", "[]"]) {
      const result = normalize("ac-source", { [DEFS]: raw });
      expect(paramsOf(result)[DEFS], JSON.stringify(raw)).toBe(raw);
    }
  });

  test("定义串改写后，params 里同时补上本名容量与电压", () => {
    const result = normalize("ac-source", {
      [DEFS]: JSON.stringify([{ cnName: "额定功率", enName: "rated_power" }])
    });
    const params = paramsOf(result);
    expect(params.rated_capacity).toBe("10 MW");
    expect(params.rated_voltage).toBe("0");
  });
});
