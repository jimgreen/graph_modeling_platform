// src/model.ts 的 templateTerminalTypes —— 唯一把 DeviceTemplate 变成
// TerminalType[] 的地方（model.ts 内 4 处、model-routing.ts 1 处走它）。
// 全仓函数本体零断言：只有 modelContainerAssociationDescribe.test.ts:22 的一句注释
// 提到它，且那段逻辑的前提正是「本函数保证每个端子都有类型」，也就是说没有测试
// 守着这个前提，模型端子无类型的场景就能一路流到 E 文件导出与路由校验。
//
// 实现只有两行语义：`(terminalTypes ?? []).slice(0, terminalCount)` 截断，
// 再 `while (length < terminalCount) push(terminalType)` 补齐。看上去是纯算术，
// 但它同时承担三件容易被重构悄悄改掉的事，本文件逐条钉住：
//
// ① 截断取的是**前** N 个，不是后 N 个 —— 端子顺序有几何含义（terminalAnchors
//    与 terminalLabels 都按下标对齐），顺序错位不会报错，只会画错接线端子。
// ② 补齐用的是模板级单值 terminalType —— 元件库只配一个端子类型、子模型逐端子
//    覆写只配了前几个时，剩余端子靠这条兜底，兜底失效就是「端子无类型」。
// ③ `.slice()` 拷贝后 push，**从不改入参数组** —— template 来自 DEVICE_LIBRARY
//    与持久化图元库，改它就是跨实例污染，别处的端子类型会跟着变。
//
// ⚠️ 三条反直觉的真实行为（探针实测，不是推测，改实现前先读）：
//  · 负数 terminalCount 不是「空数组」。`slice(0, -1)` 的第二参是**从末尾倒数**，
//    故 -1 等于砍掉最后一个元素；长度 = max(0, len + count)。而补齐的
//    `while (length < count)` 在 count 为负时一次都不进，所以负数只截断不补齐。
//  · terminalCount 为 NaN 与为负数不同：`slice(0, NaN)` 走 ToIntegerOrInfinity(NaN)=0，
//    得到空数组；`0 < NaN` 为 false，不补齐 → []。
//  · terminalCount 为 undefined 时 `slice(0, undefined)` 表示「到末尾」，返回**全部**
//    端子类型，与 NaN 的空数组完全相反。这三条都靠原生 slice 语义，改成显式
//    判空/取整的重构会让它们一起变，所以在此断言固定。
//  · 小数 terminalCount 净效果是 **ceil**：slice 向下取整截断，随后 while 向上补到
//    超过 count，故 2.5 出 3 个、3.9 出 4 个、1.2 出 2 个。
import { describe, expect, test } from "vitest";

import { templateTerminalTypes } from "./model";
import type { DeviceTemplate, TerminalType } from "./model";

const tpl = (extra: Partial<DeviceTemplate> = {}): DeviceTemplate =>
  ({
    kind: "static-point",
    label: "端子类型测试元件",
    categoryLibrary: "test",
    size: { width: 10, height: 10 },
    params: {},
    terminalType: "dc",
    terminalCount: 2,
    ...extra
  }) as DeviceTemplate;

/** 端子类型数组允许混入空串/undefined：模板由 JSON 载入，端子类型可能缺项。 */
const types = (values: unknown[]): TerminalType[] => values as TerminalType[];

describe("templateTerminalTypes 截断", () => {
  test("端子类型恰好等于端子数时原样返回", () => {
    expect(templateTerminalTypes(tpl({ terminalTypes: types(["ac", "dc"]), terminalCount: 2 }))).toEqual(["ac", "dc"]);
  });

  test("端子类型多于端子数时只保留前 N 个，顺序不翻转", () => {
    // 若实现误用 slice(-count) 取末尾 N 个，本断言从 ac,dc 变 h2,dc —— 端子下标
    // 与 terminalAnchors/terminalLabels 按位对齐，错位是静默的画错。
    expect(templateTerminalTypes(tpl({ terminalTypes: types(["ac", "dc", "h2"]), terminalCount: 2 }))).toEqual(["ac", "dc"]);
    expect(templateTerminalTypes(tpl({ terminalTypes: types(["ac", "dc", "h2", "heat"]), terminalCount: 1 }))).toEqual(["ac"]);
  });
});

describe("templateTerminalTypes 补齐", () => {
  test("端子类型少于端子数时用单值端子类型补齐剩余位", () => {
    expect(templateTerminalTypes(tpl({ terminalTypes: types(["ac"]), terminalCount: 3 }))).toEqual(["ac", "dc", "dc"]);
    expect(templateTerminalTypes(tpl({ terminalTypes: types(["ac", "dc", "h2"]), terminalCount: 1 }))).toEqual(["ac"]);
  });

  test("无端子类型来源时整段由单值端子类型兜底", () => {
    // 元件库只配 terminalType、不逐端子覆写时的常见形状，必须给出恰好 terminalCount 个。
    expect(templateTerminalTypes(tpl({ terminalTypes: undefined, terminalCount: 2 }))).toEqual(["dc", "dc"]);
    expect(templateTerminalTypes(tpl({ terminalTypes: [], terminalCount: 3 }))).toEqual(["dc", "dc", "dc"]);
  });

  test("补齐值取自模板的 terminalType，不是硬编码也不是首项", () => {
    // 断言必须钉在「单值随模板变」上：把 push 的实参换成 terminalTypes[0] 会得到
    // ac,ac,ac；换成字面量 dc 则在 terminalType 为 ac 的模板上转红。
    expect(templateTerminalTypes(tpl({ terminalType: "ac", terminalTypes: types(["h2"]), terminalCount: 3 }))).toEqual([
      "h2",
      "ac",
      "ac"
    ]);
  });
});

describe("templateTerminalTypes 空洞与不可变性", () => {
  test("空串与 undefined 不被过滤也不被当作缺口补齐", () => {
    // 空洞占位即已填：长度已等于 terminalCount，补齐循环不该动它们。若改成
    // filter(Boolean) 之类，结果从 3 个塌到 1 个。
    const result = templateTerminalTypes(tpl({ terminalTypes: types(["", undefined, "h2"]), terminalCount: 3 }));
    expect(result).toHaveLength(3);
    expect(result[0]).toBe("");
    expect(result[1]).toBeUndefined();
    expect(result[2]).toBe("h2");
  });

  test("调用后入参数组内容不变", () => {
    // 去掉 .slice() 直接 push 到入参数组时，本断言从 true 转红（入参会多出补齐项）。
    const input = types(["ac", "dc"]);
    const snapshot = [...input];
    templateTerminalTypes(tpl({ terminalTypes: input, terminalCount: 4 }));
    expect(input).toEqual(snapshot);
    expect(input).toHaveLength(2);
  });

  test("返回值是新数组，改它不污染入参数组", () => {
    const input = types(["ac", "dc"]);
    const result = templateTerminalTypes(tpl({ terminalTypes: input, terminalCount: 2 }));
    expect(result).not.toBe(input);
    result.push("h2");
    expect(input).toEqual(["ac", "dc"]);
  });
});

describe("templateTerminalTypes 端子数异常", () => {
  test("端子数为 0 时返回空数组", () => {
    expect(templateTerminalTypes(tpl({ terminalTypes: types(["ac", "dc"]), terminalCount: 0 }))).toEqual([]);
  });

  test("端子数为负数时按从末尾倒数截断，不做补齐", () => {
    // slice(0, -n) 的第二参是从末尾倒数，不是「取不到」。长度 = max(0, len + count)：
    // 3 项配 -1 剩 2 项、-2 剩 1 项、-3 及更负剩 0 项。补齐的 while 在 count 为负时
    // 一次都不进，故这里绝不该出现 terminalType。
    expect(templateTerminalTypes(tpl({ terminalTypes: types(["ac", "dc", "h2"]), terminalCount: -1 }))).toEqual(["ac", "dc"]);
    expect(templateTerminalTypes(tpl({ terminalTypes: types(["ac", "dc", "h2"]), terminalCount: -2 }))).toEqual(["ac"]);
    expect(templateTerminalTypes(tpl({ terminalTypes: types(["ac", "dc", "h2"]), terminalCount: -3 }))).toEqual([]);
    expect(templateTerminalTypes(tpl({ terminalTypes: types(["ac", "dc", "h2"]), terminalCount: -9 }))).toEqual([]);
    // 数组比 |count| 还短时 slice 直接给空，且负数下不补齐 → 空数组。
    expect(templateTerminalTypes(tpl({ terminalTypes: types(["ac"]), terminalCount: -2 }))).toEqual([]);
  });

  test("端子数为 NaN 时返回空数组", () => {
    // slice(0, NaN) 经 ToIntegerOrInfinity(NaN)=0 得空；0 < NaN 为 false，不补齐。
    expect(templateTerminalTypes(tpl({ terminalTypes: types(["ac", "dc", "h2"]), terminalCount: Number.NaN }))).toEqual([]);
  });

  test("端子数缺失为 undefined 时返回全部端子类型，与 NaN 结果相反", () => {
    // slice 的 end 为 undefined 表示「到末尾」，不是 0。这是 NaN 与 undefined 唯一
    // 分歧所在：同一段代码、两个非法输入、两个相反结果，故必须分开钉。
    expect(
      templateTerminalTypes(tpl({ terminalTypes: types(["ac", "dc", "h2"]), terminalCount: undefined as unknown as number }))
    ).toEqual(["ac", "dc", "h2"]);
    expect(
      templateTerminalTypes(tpl({ terminalTypes: types(["ac", "dc", "h2"]), terminalCount: Number.NaN }))
    ).toEqual([]);
  });

  test("端子数为小数时净效果是向上取整", () => {
    // slice 向下取整截断，随后 while 补到超过 count，故 ceil：1.2→2、2.5→3、3.9→4。
    expect(templateTerminalTypes(tpl({ terminalTypes: types(["ac", "dc", "h2"]), terminalCount: 1.2 }))).toEqual([
      "ac",
      "dc"
    ]);
    expect(templateTerminalTypes(tpl({ terminalTypes: types(["ac", "dc", "h2"]), terminalCount: 2.5 }))).toEqual([
      "ac",
      "dc",
      "dc"
    ]);
    expect(templateTerminalTypes(tpl({ terminalTypes: types(["ac", "dc", "h2"]), terminalCount: 3.9 }))).toEqual([
      "ac",
      "dc",
      "h2",
      "dc"
    ]);
  });

  test("端子类型与端子数都缺失时返回空数组", () => {
    // 无任何来源：单值 terminalType 缺失则补齐物是 undefined，而 undefined 端子数
    // 使 while 不进，故整体为空。
    const result = templateTerminalTypes({ kind: "static-point" } as unknown as DeviceTemplate);
    expect(result).toEqual([]);
  });

  test("单值端子类型缺失时补齐为 undefined，不崩", () => {
    expect(templateTerminalTypes(tpl({ terminalTypes: types(["ac"]), terminalCount: 3, terminalType: undefined as unknown as TerminalType }))).toEqual([
      "ac",
      undefined,
      undefined
    ]);
  });
});