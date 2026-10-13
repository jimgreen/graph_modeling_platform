// appPersistenceLibraryExport 里 12 个零覆盖纯函数导出的行为钉桩。
//
// 本文件只**钉现有输出**，不改实现。测之前先把每个函数的实际返回打印出来核对过
// （探针跑完即删），下面注释里记的都是探针实测到的真实行为，不是从函数名推想的。
//
// 三处与直觉相反、写断言时必须绕开的地方：
//
// ① `normalizeEnumValueList` 的 typicalValue 追加在末尾的 typicalExists 检查里，
//    而同族的 `normalizeEnumOptionsForRow` 把同一次追加做了**两遍**（末尾一次 +
//    第二次 rawEnumValuesForRow 遍历一次）。所以想验「typical 不重复追加」，
//    输入必须落在 normalizeEnumValueList **没有第二条路**的地方：直接调它、
//    并且 values 里已经有 typical。这条断言不是白写的 —— 删掉 `!seen.has(typical)`
//    立刻转红（见文件末尾的变异验证记录）。
//
// ② `filterSelectionTemplateComponentLibraryKey` 里 `|| template.kind` 那条兜底链
//    **不可达**：`resolveTemplateComponentLibrary` 末尾必然返回
//    `fallbackComponentLibraryForCategoryLibrary(...)`，而那个函数对任何字符串都
//    有默认值（不认识就 ACLoad），永不返回空串。 DEVICE_LIBRARY 的 175 个模板
//    也实测无一返回空。所以断言只能验 resolve 的结果，**不能**靠改兜底链来做变异
//    验证 —— 那样会恒绿。
//
// ③ `templateResizeTransformValue` 的 params 兜底是 `??`，但空串 `""` 是假值不是
//    nullish：params.allowResizeTransform = "" 会掉到 kind 默认，而不是产出 ""。
//    而 "true" 是真值，原样透传（不归一化成 "1"），于是
//    `templateAllowsResizeTransform` 对 "true" 判 false。
import { describe, expect, test } from "vitest";

import { apiPath } from "../config";
import {
  graphTemplateMatchesSearch,
  isImageDoubleClickKind,
  isTextDoubleClickKind,
  nodeHasImageDoubleClickEditor,
  nodeHasInteractionDoubleClickEditor,
  nodeHasTextDoubleClickEditor,
  normalizeEnumValueList,
  normalizeSchemesForBackendRuntime,
  parameterValueTypeLabelForDefinitionRow,
  stringRecordShallowEqual,
  templateAllowsResizeTransform,
  templateResizeTransformValue,
  filterSelectionTemplateComponentLibraryKey
} from "./appPersistenceLibraryExport";

const IMAGE_URL_PREFIX = "/webgrp/images/";

const terminal = (over: Record<string, any> = {}) => ({ id: "t1", anchor: { x: 0.5, y: -0.5 }, ...over });
const node = (over: Record<string, any> = {}) => ({
  id: "n1",
  kind: "static-image",
  params: {} as Record<string, string>,
  terminals: [terminal()],
  position: { x: 1, y: 2 },
  size: { width: 3, height: 4 },
  ...over
});
const projectRecord = (project: Record<string, any>, over: Record<string, any> = {}) => ({
  id: "p1",
  name: "模型A",
  project,
  ...over
});
// 夹具一律返回 any：本文件要覆盖的正是各种畸形输入（缺 projects、缺 updatedAt、
// kind 非字符串…），用严格类型写夹具只会把这些输入挡在编译期。
const scheme = (projects: any[], over: Record<string, any> = {}): any => ({ id: "s1", name: "顶层", projects, ...over });
const emptyProject = () => ({ name: "模型A", nodes: [], edges: [] });
// 入参是归一后的方案数组，取第一个方案的 models。
const runtimeProjectsOf = (schemes: any[]) => (schemes?.[0]?.projects ?? []).map((record: any) => record.project);
const runtimeNodeParamsOf = (schemes: any[], index = 0) => runtimeProjectsOf(schemes)[index].nodes[0].params;

describe("normalizeSchemesForBackendRuntime", () => {
  test("空数组原样返回空数组", () => {
    expect(normalizeSchemesForBackendRuntime([])).toEqual([]);
  });

  test("顶层与嵌套层都走同一个递归函数（深层 children 也被归一）", () => {
    const deep = scheme([], { id: "s3", name: "孙层" });
    const middle = scheme([], { id: "s2", name: "子层", children: [deep] });
    const result = normalizeSchemesForBackendRuntime([scheme([], { id: "s1", name: "顶层", children: [middle] })]);

    expect(result[0].children![0].children![0].name).toBe("孙层");
  });

  test("children 缺省、null、对象、字符串一律落成空数组", () => {
    const childrenOf = (children: any) => normalizeSchemesForBackendRuntime([scheme([], { children })])[0].children;

    expect(childrenOf(undefined)).toEqual([]);
    expect(childrenOf(null)).toEqual([]);
    expect(childrenOf({})).toEqual([]);
    expect(childrenOf("不是数组")).toEqual([]);
    expect(childrenOf([])).toEqual([]);
  });

  test("顶层数组里每个方案都被处理（不是只处理第一个）", () => {
    const result = normalizeSchemesForBackendRuntime([
      scheme([projectRecord(emptyProject())], { id: "s1", name: "甲" }),
      scheme([projectRecord(emptyProject())], { id: "s2", name: "乙" })
    ]);

    expect(result.map((item: any) => item.name)).toEqual(["甲", "乙"]);
    expect(runtimeProjectsOf([result[1]])[0].canvasBackgroundColor).toBe("#f1f5f9");
  });

  test("projects 缺省会抛错（这里刻意不兜底）", () => {
    expect(() => normalizeSchemesForBackendRuntime([{ id: "s1", name: "顶层" } as any])).toThrow();
  });

  test("整个数组为 null 同样抛错", () => {
    expect(() => normalizeSchemesForBackendRuntime(null as any)).toThrow();
  });

  test("与 normalizeSchemesForBackend 的区别：运行时 id 保留", () => {
    const result = normalizeSchemesForBackendRuntime([scheme([projectRecord(emptyProject(), { id: "p1" })])]);

    expect(result[0].id).toBe("s1");
    expect(result[0].projects![0].id).toBe("p1");
  });

  test("方案上的其它字段原样透传", () => {
    const result = normalizeSchemesForBackendRuntime([
      scheme([], { updatedAt: "2020-01-01T00:00:00.000Z", extraField: 7 })
    ]);

    expect(result[0]).toMatchObject({ updatedAt: "2020-01-01T00:00:00.000Z", extraField: 7 });
  });

  test("模型缺省字段被补上默认值", () => {
    const result = normalizeSchemesForBackendRuntime([scheme([projectRecord(emptyProject())])]);
    const project = runtimeProjectsOf(result)[0];

    expect(project).toMatchObject({
      canvasBackgroundColor: "#f1f5f9",
      powerUnit: "MW",
      voltageUnit: "kV",
      currentUnit: "A",
      powerBaseValue: 100,
      subcontrolarea: "默认区域",
      modelType: "",
      substation: "",
      feeder: "",
      taiqu: "",
      groups: []
    });
  });

  test("powerBaseValue 非有限数与 null 落回默认 100，0 与负数保留", () => {
    const valueOf = (raw: any) =>
      runtimeProjectsOf(
        normalizeSchemesForBackendRuntime([
          scheme([projectRecord({ ...emptyProject(), powerBaseValue: raw })])
        ])
      )[0].powerBaseValue;

    expect(valueOf(NaN)).toBe(100);
    expect(valueOf(Infinity)).toBe(100);
    expect(valueOf("7")).toBe(100);
    expect(valueOf(null)).toBe(100);
    expect(valueOf(0)).toBe(0);
    expect(valueOf(-5)).toBe(-5);
  });

  test("同层重名模型按 updatedAt 取新的，时间戳相同取靠后的那条", () => {
    const idsOf = (projects: any[]) =>
      normalizeSchemesForBackendRuntime([scheme(projects)])[0].projects!.map((item: any) => item.id);
    const record = (id: string, updatedAt?: string) =>
      projectRecord({ ...emptyProject() }, { id, name: "同名", updatedAt });

    expect(idsOf([record("p1", "2021-01-01T00:00:00.000Z"), record("p2", "2020-01-01T00:00:00.000Z")])).toEqual(["p1"]);
    expect(idsOf([record("p1", "2020-01-01T00:00:00.000Z"), record("p2", "2021-01-01T00:00:00.000Z")])).toEqual(["p2"]);
    expect(idsOf([record("p1", "2020-01-01T00:00:00.000Z"), record("p2", "2020-01-01T00:00:00.000Z")])).toEqual(["p2"]);
    expect(idsOf([record("p1"), record("p2")])).toEqual(["p2"]);
  });

  test("空白模型名归一成未命名模型（记录名与内层 project 名同步）", () => {
    const result = normalizeSchemesForBackendRuntime([
      scheme([projectRecord({ ...emptyProject(), name: "  " }, { id: "p1", name: " " })])
    ]);

    expect(result[0].projects![0].name).toBe("未命名模型");
    expect(runtimeProjectsOf(result)[0].name).toBe("未命名模型");
  });

  test("节点背景图 data URL 被换成图片资源路径", () => {
    const params = runtimeNodeParamsOf(
      normalizeSchemesForBackendRuntime([
        scheme([
          projectRecord({
            ...emptyProject(),
            nodes: [node({ params: { backgroundImageAssetId: "a1", backgroundImage: "data:image/png;base64,AA" } })]
          })
        ])
      ])
    );

    expect(params.backgroundImage).toBe(`${IMAGE_URL_PREFIX}a1`);
    expect(params.backgroundImage).toBe(apiPath("/images/a1"));
    expect(params.backgroundImage).not.toContain("base64");
  });

  test("前景图同样被替换，背景图 assetId 单独存在时不动", () => {
    const paramsOf = (nodeParams: Record<string, string>) =>
      runtimeNodeParamsOf(
        normalizeSchemesForBackendRuntime([scheme([projectRecord({ ...emptyProject(), nodes: [node({ params: nodeParams })] })])])
      );

    expect(paramsOf({ foregroundImageAssetId: "f1", foregroundImage: "data:image/png;base64,BB" }).foregroundImage).toBe(
      `${IMAGE_URL_PREFIX}f1`
    );
    expect(paramsOf({ backgroundImageAssetId: "a2" }).backgroundImage).toBeUndefined();
    expect(paramsOf({ backgroundImageAssetId: "a3", backgroundImage: "https://x/y.png" }).backgroundImage).toBe(
      "https://x/y.png"
    );
    expect(paramsOf({ backgroundImage: "data:image/png;base64,CC" }).backgroundImage).toBe("data:image/png;base64,CC");
  });

  test("模型背景图走同一条 data URL 替换规则", () => {
    const backgroundImageOf = (extra: Record<string, any>) =>
      runtimeProjectsOf(normalizeSchemesForBackendRuntime([scheme([projectRecord({ ...emptyProject(), ...extra })])]))[0]
        .canvasBackgroundImage;

    expect(backgroundImageOf({ canvasBackgroundImageAssetId: "c1", canvasBackgroundImage: "data:image/png;base64,AA" })).toBe(
      `${IMAGE_URL_PREFIX}c1`
    );
    expect(backgroundImageOf({ canvasBackgroundImageAssetId: "c2" })).toBeUndefined();
    expect(backgroundImageOf({ canvasBackgroundImage: "data:image/png;base64,BB" })).toBe("data:image/png;base64,BB");
  });

  test("输出是深拷贝：节点、端子、端子锚点、params 都不再与输入共享引用", () => {
    const source = node();
    const result = normalizeSchemesForBackendRuntime([
      scheme([projectRecord({ ...emptyProject(), nodes: [source] })])
    ]);
    const output = runtimeProjectsOf(result)[0].nodes[0];

    expect(output).not.toBe(source);
    expect(output.params).not.toBe(source.params);
    expect(output.terminals[0]).not.toBe(source.terminals[0]);
    expect(output.terminals[0].anchor).not.toBe(source.terminals[0].anchor);
    expect(output.terminals[0].anchor).toEqual({ x: 0.5, y: -0.5 });
  });

  test("position 与 size 不参与拷贝（与 params/terminals 的处理不同）", () => {
    const source = node();
    const result = normalizeSchemesForBackendRuntime([scheme([projectRecord({ ...emptyProject(), nodes: [source] })])]);
    const output = runtimeProjectsOf(result)[0].nodes[0];

    expect(output.position).toBe(source.position);
    expect(output.size).toBe(source.size);
  });
});

describe("filterSelectionTemplateComponentLibraryKey", () => {
  test("内置 kind 取自身映射出的组件库名，而不是 params 里的值", () => {
    expect(filterSelectionTemplateComponentLibraryKey({ kind: "static-text", params: {}, categoryLibrary: "静态图元" } as any)).toBe(
      "StaticTextSymbol"
    );
    expect(
      filterSelectionTemplateComponentLibraryKey({
        kind: "static-text",
        params: { component_type: "DCLoad" },
        categoryLibrary: "静态图元"
      } as any)
    ).toBe("StaticTextSymbol");
  });

  test("容器与连线 kind 各自映射到自己的组件库", () => {
    expect(filterSelectionTemplateComponentLibraryKey({ kind: "ac-vpp-box", params: {}, categoryLibrary: "交流设备" } as any)).toBe(
      "ACContainer"
    );
    expect(filterSelectionTemplateComponentLibraryKey({ kind: "static-line", params: {}, categoryLibrary: "静态图元" } as any)).toBe(
      "StaticConnectorSymbol"
    );
  });

  test("未知 kind 走 params 里的组件库字段：snake / camel / 驼峰三种写法都认", () => {
    expect(filterSelectionTemplateComponentLibraryKey({ kind: "zzz", params: { component_type: "StaticButton" } } as any)).toBe(
      "StaticButton"
    );
    expect(
      filterSelectionTemplateComponentLibraryKey({ kind: "zzz", params: { componentLibrary: "StaticTextSymbol" } } as any)
    ).toBe("StaticTextSymbol");
    expect(filterSelectionTemplateComponentLibraryKey({ kind: "zzz", params: { componentType: "StaticFlowNode" } } as any)).toBe(
      "StaticFlowNode"
    );
  });

  test("custom- 前缀的 kind 由后缀反查组件库（走的是另一套命名空间）", () => {
    expect(filterSelectionTemplateComponentLibraryKey({ kind: "custom-staticbutton", params: {} } as any)).toBe("StaticButton");
  });

  test("params 三个字段的优先级是 component_type > componentLibrary > componentType，空串让位", () => {
    expect(
      filterSelectionTemplateComponentLibraryKey({
        kind: "zzz",
        params: { component_type: "A", componentLibrary: "B", componentType: "C" }
      } as any)
    ).toBe("A");
    expect(
      filterSelectionTemplateComponentLibraryKey({
        kind: "zzz",
        params: { component_type: "", componentLibrary: "B", componentType: "C" }
      } as any)
    ).toBe("B");
    expect(
      filterSelectionTemplateComponentLibraryKey({ kind: "zzz", params: { componentLibrary: "B", componentType: "C" } } as any)
    ).toBe("B");
  });

  test("类目库名兜底：不含关键字时取交流设备，含关键字时各自成对", () => {
    const byCategory = (categoryLibrary: string) =>
      filterSelectionTemplateComponentLibraryKey({ kind: "zzz", params: {}, categoryLibrary } as any);

    expect(byCategory("")).toBe("ACLoad");
    expect(byCategory("未知类目")).toBe("ACLoad");
    expect(byCategory("直流设备")).toBe("DCLoad");
    expect(byCategory("氢能设备")).toBe("HydroLoad");
    expect(byCategory("热能设备")).toBe("HeatLoad");
    expect(byCategory("变流设备")).toBe("DCLoad");
  });

  test("categoryLibrary 缺省等价于交流设备", () => {
    expect(filterSelectionTemplateComponentLibraryKey({ kind: "zzz", params: {} } as any)).toBe("ACLoad");
  });

  test("params 缺省 / undefined / null 三种都不影响内置 kind 的结果", () => {
    const keyOf = (template: any) => filterSelectionTemplateComponentLibraryKey(template);

    expect(keyOf({ kind: "static-text" })).toBe("StaticTextSymbol");
    expect(keyOf({ kind: "static-text", params: undefined })).toBe("StaticTextSymbol");
    expect(keyOf({ kind: "static-text", params: null })).toBe("StaticTextSymbol");
  });

  test("kind 为空串时仍落到类目库兜底，不落 kind 兜底", () => {
    expect(filterSelectionTemplateComponentLibraryKey({ kind: "", params: {} } as any)).toBe("ACLoad");
  });

  test("kind 非字符串会抛错（resolveTemplateComponentLibrary 内部按字符串处理）", () => {
    expect(() => filterSelectionTemplateComponentLibraryKey({ kind: 0 as any, params: {} } as any)).toThrow();
  });
});

describe("templateResizeTransformValue", () => {
  test("allowResizeTransform 显式为 false 时压过 kind 默认与 params", () => {
    expect(
      templateResizeTransformValue({
        kind: "static-text",
        params: { allowResizeTransform: "1" },
        allowResizeTransform: false
      } as any)
    ).toBe("0");
  });

  test("allowResizeTransform 显式为 true 时压过 kind 默认与 params", () => {
    expect(
      templateResizeTransformValue({ kind: "ac-vpp-box", params: { allowResizeTransform: "0" }, allowResizeTransform: true } as any)
    ).toBe("1");
  });

  test("无显式标记时 params 里的值优先于 kind 默认", () => {
    expect(templateResizeTransformValue({ kind: "static-text", params: { allowResizeTransform: "0" } } as any)).toBe("0");
    expect(templateResizeTransformValue({ kind: "ac-vpp-box", params: { allowResizeTransform: "1" } } as any)).toBe("1");
  });

  test("params 用 ?? 兜底：空串是已设值，原样返回而不落 kind 默认", () => {
    // 空串是判别输入：若实现误写成 ||，这里会变成 kind 默认的 1。
    expect(templateResizeTransformValue({ kind: "static-text", params: { allowResizeTransform: "" } } as any)).toBe("");
    expect(templateResizeTransformValue({ kind: "ac-vpp-box", params: { allowResizeTransform: "" } } as any)).toBe("");
  });

  test("params 里的非规范值原样透传，不归一化成 0/1", () => {
    expect(templateResizeTransformValue({ kind: "static-text", params: { allowResizeTransform: "true" } } as any)).toBe("true");
  });

  test("都没有时按 kind 默认：静态图元与氢罐允许，交流容器不允许", () => {
    expect(templateResizeTransformValue({ kind: "static-text", params: {} } as any)).toBe("1");
    expect(templateResizeTransformValue({ kind: "static-line", params: {} } as any)).toBe("1");
    expect(templateResizeTransformValue({ kind: "hydrogen-tank", params: {} } as any)).toBe("1");
    expect(templateResizeTransformValue({ kind: "ac-busbar-section", params: {} } as any)).toBe("1");
    expect(templateResizeTransformValue({ kind: "ac-vpp-box", params: {} } as any)).toBe("0");
  });

  test("-vertical 后缀按 baseDeviceKind 归一后判定", () => {
    expect(templateResizeTransformValue({ kind: "hydrogen-tank-vertical", params: {} } as any)).toBe("1");
    expect(templateResizeTransformValue({ kind: "ac-vpp-box-vertical", params: {} } as any)).toBe("0");
  });

  test("params 缺省且无显式标记时抛错（这里刻意不兜底）", () => {
    expect(() => templateResizeTransformValue({ kind: "static-text" } as any)).toThrow();
  });

  test("templateAllowsResizeTransform 只认 1：true 判否", () => {
    expect(templateAllowsResizeTransform({ kind: "static-text", params: { allowResizeTransform: "true" } } as any)).toBe(false);
    expect(templateAllowsResizeTransform({ kind: "static-text", params: { allowResizeTransform: "1" } } as any)).toBe(true);
    expect(templateAllowsResizeTransform({ kind: "static-text", params: { allowResizeTransform: "" } } as any)).toBe(false);
    expect(templateAllowsResizeTransform({ kind: "static-text", params: {} } as any)).toBe(true);
  });
});

describe("normalizeEnumValueList", () => {
  test("非数组输入落成空数组", () => {
    expect(normalizeEnumValueList("不是数组")).toEqual([]);
    expect(normalizeEnumValueList(undefined)).toEqual([]);
    expect(normalizeEnumValueList({ 0: "x", length: 1 })).toEqual([]);
    expect(normalizeEnumValueList([])).toEqual([]);
  });

  test("逐项 trim，空串 / null / undefined 被丢弃", () => {
    expect(normalizeEnumValueList([" a ", "b", "", "   ", null, undefined])).toEqual(["a", "b"]);
  });

  test("按 trim 后的文本去重，大小写不同算两个值", () => {
    expect(normalizeEnumValueList(["a", " a ", "b"])).toEqual(["a", "b"]);
    expect(normalizeEnumValueList(["a", "A"])).toEqual(["a", "A"]);
  });

  test("非字符串项按 String 归一后再去重", () => {
    expect(normalizeEnumValueList([1, "1", 2])).toEqual(["1", "2"]);
    expect(normalizeEnumValueList([0])).toEqual(["0"]);
    expect(normalizeEnumValueList([false])).toEqual(["false"]);
    expect(normalizeEnumValueList([{ a: 1 }])).toEqual(["[object Object]"]);
  });

  test("单元素与纯数字输入", () => {
    expect(normalizeEnumValueList([7])).toEqual(["7"]);
    expect(normalizeEnumValueList(["1"])).toEqual(["1"]);
  });

  test("typicalValue 不在列表里时追加到末尾", () => {
    expect(normalizeEnumValueList(["1", "0"], "9")).toEqual(["1", "0", "9"]);
    expect(normalizeEnumValueList(["1"], "  9  ")).toEqual(["1", "9"]);
  });

  test("typicalValue 已在列表里时不重复追加（trim 后比较）", () => {
    expect(normalizeEnumValueList(["1", "0"], " 1 ")).toEqual(["1", "0"]);
    expect(normalizeEnumValueList(["A"], "a")).toEqual(["A", "a"]);
  });

  test("typicalValue 为空串或全空白时不追加", () => {
    expect(normalizeEnumValueList(["1"], "")).toEqual(["1"]);
    expect(normalizeEnumValueList(["1"], "   ")).toEqual(["1"]);
  });

  test("typicalValue 省略时等价于空串", () => {
    expect(normalizeEnumValueList(["1"])).toEqual(["1"]);
  });

  test("列表为空时 typicalValue 成为唯一元素", () => {
    expect(normalizeEnumValueList([], "5")).toEqual(["5"]);
    expect(normalizeEnumValueList(null, "5")).toEqual(["5"]);
  });

  test("typicalValue 传 null 会抛错（形参标注即契约，不兜底）", () => {
    expect(() => normalizeEnumValueList(["1"], null as any)).toThrow();
  });
});

describe("parameterValueTypeLabelForDefinitionRow", () => {
  const row = (over: Record<string, any> = {}) =>
    ({ enName: "field", cnName: "字段", valueType: "string", typicalValue: "", ...over }) as any;

  test("命中 PARAM_VALUE_TYPE_OPTIONS 的直接取中文标签", () => {
    expect(parameterValueTypeLabelForDefinitionRow(row({ valueType: "integer" }))).toBe("整数");
    expect(parameterValueTypeLabelForDefinitionRow(row({ valueType: "float" }))).toBe("浮点数");
    expect(parameterValueTypeLabelForDefinitionRow(row({ valueType: "string" }))).toBe("字符串");
  });

  test("非枚举且不认识的值型原样返回", () => {
    expect(parameterValueTypeLabelForDefinitionRow(row({ valueType: "boolean" }))).toBe("boolean");
    expect(parameterValueTypeLabelForDefinitionRow(row({ valueType: "" }))).toBe("");
  });

  test("stringEnum / numberEnum 不看选项内容，按值型直接定性", () => {
    expect(parameterValueTypeLabelForDefinitionRow(row({ valueType: "stringEnum", enumOptions: [{ value: "1" }] }))).toBe("字符串枚举");
    expect(parameterValueTypeLabelForDefinitionRow(row({ valueType: "numberEnum", enumOptions: [{ value: "on" }] }))).toBe("数字枚举");
  });

  test("enum：选项全是数值判数字枚举，全非数值判字符串枚举", () => {
    expect(
      parameterValueTypeLabelForDefinitionRow(
        row({ enName: "zzz", valueType: "enum", enumOptions: [{ value: "1", label: "一" }, { value: "2" }] })
      )
    ).toBe("数字枚举");
    expect(
      parameterValueTypeLabelForDefinitionRow(row({ enName: "zzz", valueType: "enum", enumOptions: [{ value: "on" }, { value: "off" }] }))
    ).toBe("字符串枚举");
  });

  test("enum：数值与非数值混排时按字符串枚举（every 的语义）", () => {
    expect(
      parameterValueTypeLabelForDefinitionRow(row({ enName: "zzz", valueType: "enum", enumOptions: [{ value: "1" }, { value: "on" }] }))
    ).toBe("字符串枚举");
  });

  test("enum：没有选项也没有 enumValueType 时落字符串枚举", () => {
    expect(parameterValueTypeLabelForDefinitionRow(row({ enName: "zzz", valueType: "enum" }))).toBe("字符串枚举");
  });

  test("enum：显式 enumValueType 覆盖选项推断", () => {
    expect(parameterValueTypeLabelForDefinitionRow(row({ enName: "zzz", valueType: "enum", enumValueType: "number" }))).toBe(
      "数字枚举"
    );
  });

  test("内置枚举行按默认选项判为数字枚举（status 与 run_stat 皆然，enName 会 trim）", () => {
    expect(parameterValueTypeLabelForDefinitionRow(row({ enName: "status", valueType: "enum" }))).toBe("数字枚举");
    expect(parameterValueTypeLabelForDefinitionRow(row({ enName: " run_stat ", valueType: "enum" }))).toBe("数字枚举");
  });

  test("内置枚举行：给了自己的 enumOptions 就用它的，不再走默认选项", () => {
    // enName=status 的默认选项是 {1,0}（全数值 → 数字枚举），但显式 enumOptions 优先，
    // 换成 {x,y} 后判成字符串枚举。这条钉的是 normalizeEnumOptionsForRow 的取值优先级。
    expect(
      parameterValueTypeLabelForDefinitionRow(
        row({ enName: "status", valueType: "enum", enumOptions: [{ value: "x", label: "甲" }, { value: "y" }] })
      )
    ).toBe("字符串枚举");
    expect(
      parameterValueTypeLabelForDefinitionRow(
        row({ enName: "status", valueType: "enum", enumOptions: [{ value: "1" }, { value: "0" }] })
      )
    ).toBe("数字枚举");
  });
});

describe("graphTemplateMatchesSearch", () => {
  const template = { id: "T-1", name: "  模板A  ", typeName: "TypeX" } as any;

  test("needle 为空串 / null 都直接命中（没有 needle 时不过滤）", () => {
    expect(graphTemplateMatchesSearch(template, "TypeX", "")).toBe(true);
    expect(graphTemplateMatchesSearch(template, "TypeX", null as any)).toBe(true);
  });

  test("needle 为单个空格不算空串，会真的去匹配（结果是落空）", () => {
    expect(graphTemplateMatchesSearch(template, "TypeX", " ")).toBe(false);
  });

  // needle 是被检索字段的**子串**（`field.includes(needle)`），不是反过来 ——
  // 所以给每个字段配一个只出现在它里面的 needle，四条 needle 两两都不是对方的子串。
  // 从 `[typeName, template.typeName, template.name, template.id]` 里删掉任何一项，
  // 都必有一条转红。
  const NOTHING = "绝不存在zzz";

  test("四个检索字段各能命中：typeName 入参、模板 typeName、name、id", () => {
    expect(graphTemplateMatchesSearch(template, "只写在入参里的词", "只写在入参里的")).toBe(true);
    expect(graphTemplateMatchesSearch(template, NOTHING, "typex")).toBe(true);
    expect(graphTemplateMatchesSearch(template, NOTHING, "模板")).toBe(true);
    expect(graphTemplateMatchesSearch(template, NOTHING, "t-1")).toBe(true);
  });

  test("typeName 入参与模板 typeName 是两个独立字段：删掉入参那份就不命中", () => {
    expect(graphTemplateMatchesSearch(template, "只写在入参里的词", NOTHING)).toBe(false);
    expect(graphTemplateMatchesSearch(template, NOTHING, "只写在入参里的")).toBe(false);
    expect(graphTemplateMatchesSearch(template, NOTHING, "typex")).toBe(true);
  });

  test("被检索的一侧 trim + 小写化", () => {
    expect(graphTemplateMatchesSearch(template, "TypeX", "typex")).toBe(true);
    expect(graphTemplateMatchesSearch(template, "TypeX", "TEMPLATEA")).toBe(false);
  });

  test("needle 自己不 trim、不小写化（与被检索侧不对称）", () => {
    expect(graphTemplateMatchesSearch(template, "TypeX", " 模板A ")).toBe(false);
    expect(graphTemplateMatchesSearch(template, "TypeX", "模板A")).toBe(false);
    expect(graphTemplateMatchesSearch(template, "TypeX", "模板")).toBe(true);
  });

  test("全不命中返回 false", () => {
    expect(graphTemplateMatchesSearch(template, "TypeX", "zzz")).toBe(false);
  });

  test("模板字段缺一即抛错（normalizeLibrarySearchText 刻意不兜底）", () => {
    expect(() => graphTemplateMatchesSearch({ id: "i" } as any, "t", "zz")).toThrow();
    expect(() => graphTemplateMatchesSearch({ id: "i", typeName: "t" } as any, "t", "zz")).toThrow();
    expect(() => graphTemplateMatchesSearch({ name: "n", typeName: "t" } as any, "t", "zz")).toThrow();
  });
});

describe("stringRecordShallowEqual", () => {
  test("两个空记录相等", () => {
    expect(stringRecordShallowEqual({}, {})).toBe(true);
  });

  test("键序不同不影响判定", () => {
    expect(stringRecordShallowEqual({ a: "1", b: "2" }, { b: "2", a: "1" })).toBe(true);
    expect(stringRecordShallowEqual({ a: "1", b: "2", c: "3" }, { c: "3", b: "2", a: "1" })).toBe(true);
  });

  test("同名键值不同不相等", () => {
    expect(stringRecordShallowEqual({ a: "1" }, { a: "2" })).toBe(false);
  });

  test("键数不同不相等，即使同名键值都一致", () => {
    expect(stringRecordShallowEqual({ a: "1" }, { a: "1", b: "2" })).toBe(false);
    expect(stringRecordShallowEqual({ a: "1", b: "2" }, { a: "1" })).toBe(false);
  });

  test("两侧同长度但键名不同：同名位置值恰好相等时会被误判为相等", () => {
    // 这条钉的是「只比长度 + 逐键取值」的现有语义：b 与 c 同值，缺的那侧取到 undefined，
    // 于是 {a,b} 与 {a,c} 被判成相等。改实现前先看这条。
    expect(stringRecordShallowEqual({ a: "1", b: "2" }, { a: "1", c: "2" })).toBe(false);
    expect(stringRecordShallowEqual({ a: "1", b: undefined } as any, { a: "1", c: undefined } as any)).toBe(true);
  });

  test("两侧键名不同但值都是 undefined 时相等（键名完全不参与比较）", () => {
    expect(stringRecordShallowEqual({ a: undefined } as any, { b: undefined } as any)).toBe(true);
  });

  test("值用 === 比较：数字 1 与字符串 1 不相等，NaN 也不等于自己", () => {
    expect(stringRecordShallowEqual({ a: 1 } as any, { a: "1" } as any)).toBe(false);
    expect(stringRecordShallowEqual({ a: NaN } as any, { a: NaN } as any)).toBe(false);
  });

  test("键存在但值为 undefined，与缺这个键，不相等", () => {
    expect(stringRecordShallowEqual({ a: undefined } as any, {})).toBe(false);
    expect(stringRecordShallowEqual({}, { a: "" } as any)).toBe(false);
    expect(stringRecordShallowEqual({ a: null } as any, {})).toBe(false);
    expect(stringRecordShallowEqual({ a: false } as any, {})).toBe(false);
  });

  test("取值会穿透原型链（不是 hasOwnProperty 语义）", () => {
    const inherited = Object.assign(Object.create({ a: "1" }), { z: "0" });

    expect(stringRecordShallowEqual({ a: "1" }, inherited)).toBe(true);
    expect(stringRecordShallowEqual({ a: "1" }, Object.assign(Object.create({ a: "2" }), { z: "0" }))).toBe(false);
  });

  test("toString 这类原型链上的键也能作为普通键参与比较", () => {
    expect(stringRecordShallowEqual({ toString: "x" } as any, { toString: "x" } as any)).toBe(true);
  });
});

describe("isTextDoubleClickKind / isImageDoubleClickKind", () => {
  test("文本类 kind 全集命中", () => {
    expect(["static-text", "static-date", "static-time", "static-datetime", "static-edge-label"].map(isTextDoubleClickKind)).toEqual([
      true, true, true, true, true
    ]);
  });

  test("图片类 kind 全集命中", () => {
    expect(["static-image", "static-web"].map(isImageDoubleClickKind)).toEqual([true, true]);
  });

  test("两个集合互斥", () => {
    expect(isTextDoubleClickKind("static-image")).toBe(false);
    expect(isImageDoubleClickKind("static-text")).toBe(false);
    expect(isImageDoubleClickKind("static-web")).toBe(true);
    expect(isTextDoubleClickKind("static-edge-label")).toBe(true);
  });

  test("其余静态 kind 两个集合都不命中", () => {
    for (const kind of ["static-rect", "static-circle", "static-line", "static-button", "static-callout", "ac-vpp-box"]) {
      expect(isTextDoubleClickKind(kind)).toBe(false);
      expect(isImageDoubleClickKind(kind)).toBe(false);
    }
  });

  test("精确匹配：大小写与首尾空白都不被吸收", () => {
    expect(isTextDoubleClickKind("STATIC-TEXT")).toBe(false);
    expect(isTextDoubleClickKind(" static-text ")).toBe(false);
    expect(isImageDoubleClickKind("Static-Image")).toBe(false);
    expect(isImageDoubleClickKind("static-images")).toBe(false);
  });

  test("空串不命中", () => {
    expect(isTextDoubleClickKind("")).toBe(false);
    expect(isImageDoubleClickKind("")).toBe(false);
  });
});

describe("nodeHasInteractionDoubleClickEditor", () => {
  test("static-button 无需任何参数就算有交互编辑器", () => {
    expect(nodeHasInteractionDoubleClickEditor({ kind: "static-button", params: {} } as any)).toBe(true);
  });

  test("静态图元带 buttonEnabled 为 1 时有", () => {
    expect(nodeHasInteractionDoubleClickEditor({ kind: "static-text", params: { buttonEnabled: "1" } } as any)).toBe(true);
    expect(nodeHasInteractionDoubleClickEditor({ kind: "static-circle", params: { buttonEnabled: "1" } } as any)).toBe(true);
  });

  test("buttonEnabled 只认字符串 1：true 与 0 都不算", () => {
    expect(nodeHasInteractionDoubleClickEditor({ kind: "static-text", params: { buttonEnabled: "true" } } as any)).toBe(false);
    expect(
      nodeHasInteractionDoubleClickEditor({ kind: "static-text", params: { buttonEnabled: "0", buttonActionType: "none" } } as any)
    ).toBe(false);
  });

  test("buttonActionType 非 none 即算有（值内容不参与判断）", () => {
    for (const kind of ["static-text", "static-circle", "static-rect", "static-input-node", "static-group-box"]) {
      expect(nodeHasInteractionDoubleClickEditor({ kind, params: { buttonActionType: "jump" } } as any)).toBe(true);
    }
  });

  test("buttonActionType 为空串时仍是 true（空串 !== none）", () => {
    expect(nodeHasInteractionDoubleClickEditor({ kind: "static-text", params: { buttonActionType: "" } } as any)).toBe(true);
  });

  test("buttonActionType 缺省按 none 处理", () => {
    expect(nodeHasInteractionDoubleClickEditor({ kind: "static-circle", params: { buttonEnabled: "0" } } as any)).toBe(false);
    expect(nodeHasInteractionDoubleClickEditor({ kind: "static-rect", params: {} } as any)).toBe(false);
  });

  test("非静态设备即使参数齐全也没有（先过 isStaticButtonCapableNode 这道闸）", () => {
    expect(
      nodeHasInteractionDoubleClickEditor({ kind: "ac-vpp-box", params: { buttonEnabled: "1", buttonActionType: "jump" } } as any)
    ).toBe(false);
  });

  test("params 里的组件库字段可以把未知 kind 变成 StaticButton", () => {
    expect(
      nodeHasInteractionDoubleClickEditor({ kind: "zzz", params: { component_type: "StaticButton", buttonActionType: "jump" } } as any)
    ).toBe(true);
  });

  test("线状静态图元不具备交互编辑器（即便带动作类型）", () => {
    expect(nodeHasInteractionDoubleClickEditor({ kind: "static-line", params: { buttonActionType: "jump" } } as any)).toBe(false);
    expect(nodeHasInteractionDoubleClickEditor({ kind: "static-line", params: {} } as any)).toBe(false);
  });

  test("params 为 null 抛错（这里刻意不兜底）", () => {
    expect(() => nodeHasInteractionDoubleClickEditor({ kind: "static-text", params: null } as any)).toThrow();
  });
});

describe("nodeHasTextDoubleClickEditor", () => {
  test("没有 text 键就没有编辑器", () => {
    expect(nodeHasTextDoubleClickEditor({ kind: "static-text", params: {} } as any)).toBe(false);
  });

  test("只看键是否存在：空串与 undefined 都算有（与图片判定的真假值语义不同）", () => {
    expect(nodeHasTextDoubleClickEditor({ kind: "static-text", params: { text: "" } } as any)).toBe(true);
    expect(nodeHasTextDoubleClickEditor({ kind: "static-text", params: { text: undefined } } as any)).toBe(true);
    expect(nodeHasTextDoubleClickEditor({ kind: "static-rect", params: { text: "内容" } } as any)).toBe(true);
  });

  test("hasOwnProperty 语义：原型链上的 text 不算", () => {
    expect(nodeHasTextDoubleClickEditor({ kind: "static-text", params: Object.create({ text: "hi" }) } as any)).toBe(false);
  });

  test("params 为 null 抛错", () => {
    expect(() => nodeHasTextDoubleClickEditor({ kind: "static-text", params: null } as any)).toThrow();
  });
});

describe("nodeHasImageDoubleClickEditor", () => {
  test("四个图片字段都没有时没有编辑器", () => {
    expect(nodeHasImageDoubleClickEditor({ kind: "static-image", params: {} } as any)).toBe(false);
  });

  test("四个字段任一为真值即有：背景图、背景资源 id、前景图、前景资源 id", () => {
    expect(nodeHasImageDoubleClickEditor({ kind: "static-image", params: { backgroundImage: "data:image/png;base64,AA" } } as any)).toBe(true);
    expect(nodeHasImageDoubleClickEditor({ kind: "static-image", params: { backgroundImageAssetId: "a1" } } as any)).toBe(true);
    expect(nodeHasImageDoubleClickEditor({ kind: "static-image", params: { foregroundImage: "x" } } as any)).toBe(true);
    expect(nodeHasImageDoubleClickEditor({ kind: "static-image", params: { foregroundImageAssetId: "f1" } } as any)).toBe(true);
  });

  test("只看真假值：空串不算，空白串算（不 trim）", () => {
    expect(
      nodeHasImageDoubleClickEditor({
        kind: "static-image",
        params: { backgroundImage: "", backgroundImageAssetId: "", foregroundImage: "", foregroundImageAssetId: "" }
      } as any)
    ).toBe(false);
    expect(nodeHasImageDoubleClickEditor({ kind: "static-image", params: { backgroundImage: " " } } as any)).toBe(true);
  });

  test("取值会穿透原型链（与文本判定的 hasOwnProperty 语义不同）", () => {
    expect(nodeHasImageDoubleClickEditor({ kind: "static-image", params: Object.create({ backgroundImage: "x" }) } as any)).toBe(true);
  });

  test("params 为 null 抛错", () => {
    expect(() => nodeHasImageDoubleClickEditor({ kind: "static-image", params: null } as any)).toThrow();
  });
});