// src/model.ts 的 mergeCanonicalParameterDefinitions：把「覆盖」（用户改过的定义）与
// 「标准定义」两份参数定义合成一份 —— 共享图标库里元件定义的合并口径。
// 此前零断言。判错不抛异常：参数表少一列、改过的中文名没生效，
// 或者把 xf_t1 这类容器内部键混进参数表被当成设备参数导出。
//
// 15 处变异跑过，11 处转红。四处没转红的原因写在下面，不算本文件覆盖：
// ① 三处**源码等价** —— 匹配键上的 toLowerCase()、以及「enName 用 canonical 还是 override 的写法」：
//    两边的名字都先过 normalizeDeviceParameterDefinition，已经是下划线小写，lowerCase 是空操作，
//    两个名字也必然相同。
// ② 一处**证伪不了** —— 「结果不与入参共用对象」：上游 normalizeDeviceParameterDefinition 本来就
//    返回 {...definition} 新对象，把合并处那个 {...definition} 去掉也看不出差别（该断言保留，但不
//    当成覆盖证据）。
// 过程中补的真缺口：override 侧的归一（status_set → closed_status_set 才认得出是同一条）、
// exportName 的归一、归一结果为 null 时回落到 canonical、遗留容器键的过滤边界（device_t1 照常追加）。
import { describe, expect, test } from "vitest";

import { mergeCanonicalParameterDefinitions } from "./model";
import type { DeviceParameterDefinition } from "./model";

const def = (enName: string, extra: Partial<DeviceParameterDefinition> = {}): DeviceParameterDefinition =>
  ({
    cnName: enName,
    enName,
    valueType: "string",
    typicalValue: "",
    readonly: false,
    ...extra
  }) as DeviceParameterDefinition;

const namesOf = (definitions: DeviceParameterDefinition[]): string[] => definitions.map((item) => item.enName);
const byName = (definitions: DeviceParameterDefinition[], enName: string) =>
  definitions.find((item) => item.enName === enName);

describe("mergeCanonicalParameterDefinitions：同名合并", () => {
  test("★ override 的字段盖住 canonical（中文名、类型、典型值都算）", () => {
    const merged = mergeCanonicalParameterDefinitions(
      [def("rated_power", { cnName: "额定有功", valueType: "string", typicalValue: "1" })],
      [def("rated_power", { cnName: "有功容量", valueType: "float", typicalValue: "99" })]
    );
    expect(namesOf(merged)).toEqual(["rated_power"]);
    expect(byName(merged, "rated_power")).toMatchObject({ cnName: "有功容量", valueType: "float", typicalValue: "99" });
  });

  test("★ 名字先归一成下划线再比：RATED_POWER 与 rated_power 算同一条", () => {
    const merged = mergeCanonicalParameterDefinitions(
      [def("RATED_POWER", { cnName: "额定有功" })],
      [def("rated_power", { cnName: "有功容量" })]
    );
    expect(namesOf(merged)).toEqual(["rated_power"]);
    expect(byName(merged, "rated_power")?.cnName).toBe("有功容量");
  });

  test("★ 驼峰名与下划线名归一后是同一条（存量数据的 ratedPower 不会被当成新参数追加）", () => {
    const merged = mergeCanonicalParameterDefinitions([def("ratedPower", { typicalValue: "1" })], [def("rated_power", { typicalValue: "2" })]);
    expect(namesOf(merged)).toEqual(["rated_power"]);
    expect(byName(merged, "rated_power")?.typicalValue).toBe("2");
  });

  test("★ readonly 以 canonical 为准（覆盖方改不动只读属性）", () => {
    const merged = mergeCanonicalParameterDefinitions(
      [def("p", { readonly: true })],
      [def("p", { readonly: false, typicalValue: "3" })]
    );
    expect(byName(merged, "p")).toMatchObject({ readonly: true, typicalValue: "3" });
  });

  test("canonical 独有的定义原样保留", () => {
    const canonical = [def("a", { typicalValue: "1" }), def("b")];
    const merged = mergeCanonicalParameterDefinitions(
      [def("a", { typicalValue: "1" }), def("b")],
      [def("b", { typicalValue: "2" })]
    );
    expect(namesOf(merged)).toEqual(["a", "b"]);
    expect(byName(merged, "a")?.typicalValue).toBe("1");
    // 结果是副本，不与入参共用对象
    expect(byName(merged, "a")).not.toBe(canonical[0]);
  });
});

describe("mergeCanonicalParameterDefinitions：只在一侧出现的定义", () => {
  test("★ override 多出来的追加在末尾", () => {
    const merged = mergeCanonicalParameterDefinitions([def("a")], [def("b"), def("c")]);
    expect(namesOf(merged)).toEqual(["a", "b", "c"]);
  });

  test("★ override 那侧也要先归一：status_set 归成 closed_status_set 后才与 canonical 对上", () => {
    const merged = mergeCanonicalParameterDefinitions(
      [def("closed_status_set", { typicalValue: "1" })],
      [def("status_set", { typicalValue: "2" })]
    );
    expect(namesOf(merged)).toEqual(["closed_status_set"]);
    expect(byName(merged, "closed_status_set")?.typicalValue).toBe("2");
  });

  test("exportName 也跟着归一（status_set → closed_status_set）", () => {
    const merged = mergeCanonicalParameterDefinitions([def("a")], [def("b", { exportName: "status_set" })]);
    expect(byName(merged, "b")?.exportName).toBe("closed_status_set");
  });

  test("★ 归一把整条丢掉时（同名的 is_container）回落到 canonical 那份", () => {
    const merged = mergeCanonicalParameterDefinitions([def("is_container", { typicalValue: "1" })], [def("is_container", { typicalValue: "2" })]);
    expect(namesOf(merged)).toEqual(["is_container"]);
    expect(byName(merged, "is_container")?.typicalValue).toBe("1");
  });

  test("canonical 为空时全部追加（仍走那几道过滤）", () => {
    expect(namesOf(mergeCanonicalParameterDefinitions([], [def("a"), def("b")]))).toEqual(["a", "b"]);
  });

  test("★ is_container 不追加（它是容器内部标记，不是设备参数）", () => {
    const merged = mergeCanonicalParameterDefinitions([], [def("is_container"), def("keep")]);
    expect(namesOf(merged)).toEqual(["keep"]);
  });

  test("★ 遗留容器内部键不追加：xf_t1 / ac_unit_t2 / dc_load_t3 / heat2_…_t1 这类", () => {
    const legacy = ["xf_t1", "my_xf_t2", "ac_unit_t1", "dc_load_t3", "ac_transformer_t1", "heat2_unit_t1", "h22_load_t2", "ac2_transformer_t1", "h2_unit_t3", "heat_load_t4"];
    const merged = mergeCanonicalParameterDefinitions([], legacy.map((name) => def(name)));
    expect(namesOf(merged)).toEqual([]);
  });

  test("★ 长得像但其实不是遗留键的照常追加（前缀锚定在结尾）", () => {
    const merged = mergeCanonicalParameterDefinitions([], [def("xf_t1_extra"), def("ac_unit"), def("xf_t1x"), def("device_t1"), def("t1")]);
    expect(namesOf(merged)).toEqual(["xf_t1_extra", "ac_unit", "xf_t1x", "device_t1", "t1"]);
  });

  test("已经在 canonical 里的名字不会因为在 override 里再出现而追加第二份", () => {
    const merged = mergeCanonicalParameterDefinitions([def("a")], [def("A"), def("a")]);
    expect(namesOf(merged)).toEqual(["a"]);
  });
});

describe("mergeCanonicalParameterDefinitions：入参不被改", () => {
  test("两份入参数组与其中的对象都不被就地修改", () => {
    const canonical = [def("a", { typicalValue: "1" })];
    const override = [def("a", { typicalValue: "2" }), def("b")];
    const canonicalSnapshot = JSON.stringify(canonical);
    const overrideSnapshot = JSON.stringify(override);

    const merged = mergeCanonicalParameterDefinitions(canonical, override);

    expect(JSON.stringify(canonical)).toBe(canonicalSnapshot);
    expect(JSON.stringify(override)).toBe(overrideSnapshot);
    expect(merged[0]).not.toBe(canonical[0]);
  });

  test("空输入返回空数组", () => {
    expect(mergeCanonicalParameterDefinitions([], [])).toEqual([]);
  });
});
