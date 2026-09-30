// src/model.ts 的 resolveNodeEnumParameterBindings：把一个节点的枚举类参数列成绑定表
// （哪个键、哪张定义表、当前值多少），供批量参数编辑器与存量值校验使用。
// 此前零断言。判错不抛异常：枚举列在下拉里对不上，或者存量旧值（中文 / 定PQ）不被修正。
//
// 只覆盖**节点自身定义**这一半。容器那一半（is_container = "1" 时按关联设备视图再补一批绑定）
// 本文件**没覆盖**：它要先让 describeContainerTerminalAssociations 产出带 relationKey 的关联、
// 再由 associatedDeviceRows 按该 E 段的列清单造行，夹具成本高且一旦上游口径变动就整片飘。
// 放弃原因记在这里，不假装覆盖到了。
//
// 9 处变异跑过、7 处转红。两处**源码等价**（本文件只覆盖非容器那半，写不出能证伪它们的用例）：
// 「非容器时不提前 return」与「容器那半整个删掉」—— 对非容器节点，buildContainerDeviceParameterViews
// 本来就返回空数组，进不进去结果一样。
//
// 两条来源：
//   1) 节点自身的参数定义（经 resolveNodeParameterDefinitions）里 valueType 是枚举的那些；
//   2) 容器节点额外按「关联设备视图」再补一批 —— 每个关联端子对应一张 E 段表（ACLoad /
//      HydroSource…），段决定用哪套枚举定义。这批只在 is_container = "1" 时才有。
import { describe, expect, test } from "vitest";

import { resolveNodeEnumParameterBindings, type DeviceParameterDefinition, type DeviceTemplate, type ModelNode } from "./model";

type Params = Record<string, string>;

const def = (enName: string, extra: Partial<DeviceParameterDefinition> = {}): DeviceParameterDefinition =>
  ({
    cnName: enName,
    enName,
    valueType: "string",
    typicalValue: "",
    readonly: false,
    ...extra
  }) as DeviceParameterDefinition;

const node = (kind: string, params: Params = {}, terminals: Array<{ id: string; type: string; label: string }> = []): ModelNode =>
  ({
    id: "n1",
    kind,
    name: "n1",
    nodeNumber: "n1",
    position: { x: 0, y: 0 },
    size: { width: 100, height: 100 },
    rotation: 0,
    scale: 1,
    terminals,
    params
  }) as unknown as ModelNode;

const tpl = (kind: string, definitions: DeviceParameterDefinition[], over: Partial<DeviceTemplate> = {}): DeviceTemplate =>
  ({
    kind,
    label: kind,
    params: {},
    size: { width: 100, height: 100 },
    parameterDefinitions: definitions,
    ...over
  }) as unknown as DeviceTemplate;

const keysOf = (bindings: ReturnType<typeof resolveNodeEnumParameterBindings>): string[] =>
  bindings.map((binding) => binding.paramKey);

describe("resolveNodeEnumParameterBindings：节点自身的枚举定义", () => {
  const template = tpl("my-device", [
    def("rated_power", { valueType: "float" }),
    def("run_stat", { valueType: "stringEnum", typicalValue: "1", enumValues: ["1", "0"] }),
    def("mode", { valueType: "stringEnum", typicalValue: "A", enumValues: ["A", "B"] })
  ]);

  test("★ 只出枚举类定义，非枚举的（rated_power）被过滤掉", () => {
    // parent（所属模型）是定义解析层补的枚举定义，也在绑定表里
    expect(keysOf(resolveNodeEnumParameterBindings(node("my-device", { run_stat: "1", mode: "A" }, []), template))).toEqual(["parent", "run_stat", "mode"]);
  });

  test("★ 每条绑定带上 paramKey / definition / section / 当前值", () => {
    const bindings = resolveNodeEnumParameterBindings(node("my-device", { run_stat: "1", mode: "A" }, []), template);
    const runStat = bindings.find((binding) => binding.paramKey === "run_stat");
    expect(runStat).toMatchObject({ paramKey: "run_stat" });
    expect(runStat?.definition.enumValues).toEqual(["1", "0"]);
    expect(typeof runStat?.section, "section").toBe("string");
  });

  test("★ 值一律字符串化并去空白；参数表里没有的键给空串", () => {
    const bindings = resolveNodeEnumParameterBindings(node("my-device", { run_stat: " 0 ", mode: "A" }, []), template);
    expect(bindings.find((binding) => binding.paramKey === "run_stat")?.value).toBe("0");
    const withoutRunStat = resolveNodeEnumParameterBindings(node("my-device", { mode: "A" }, []), template);
    expect(withoutRunStat.find((binding) => binding.paramKey === "run_stat")?.value).toBe("");
  });

  test("只有非枚举定义时，只剩补出来的 parent 一条", () => {
    const keys = keysOf(resolveNodeEnumParameterBindings(node("my-device", {}, []), tpl("my-device", [def("rated_power")])));
    expect(keys).toEqual(["parent"]);
  });

  test("★ section 取自 kind 所属的 E 段，枚举定义也按那张段归一", () => {
    const generator = resolveNodeEnumParameterBindings(
      node("ac-source", { control_type: "定PQ" }, []),
      tpl("ac-source", [def("control_type", { valueType: "stringEnum", typicalValue: "定PQ" })])
    );
    const control = generator.find((binding) => binding.paramKey === "control_type");
    expect(control?.section).toBe("ACGenerator");
    expect(control?.definition.enumValues).toEqual(["PV", "PQ", "PH"]);
  });
});
