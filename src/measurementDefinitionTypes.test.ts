import { describe, expect, test } from "vitest";
import { createMeasurementFieldParameterDefinition, normalizeDeviceMeasurementDefinitions } from "./measurementDefinitionTypes";

describe("measurement field parameter definitions", () => {
  test("materializes run_stat as the canonical numeric enum", () => {
    expect(createMeasurementFieldParameterDefinition("run_stat")).toEqual({
      cnName: "工作状态",
      enName: "run_stat",
      valueType: "numberEnum",
      typicalValue: "1",
      enumValues: ["1", "0"],
      enumValueType: "number",
      enumOptions: [
        { value: "1", label: "运行" },
        { value: "0", label: "停运" }
      ],
      readonly: false,
      exportEnabled: true
    });
  });

  test("materializes closed_status as the canonical switch-state numeric enum", () => {
    expect(createMeasurementFieldParameterDefinition("closed_status")).toEqual({
      cnName: "开合状态量测值",
      enName: "closed_status",
      valueType: "numberEnum",
      typicalValue: "1",
      enumValues: ["1", "0"],
      enumValueType: "number",
      enumOptions: [
        { value: "1", label: "闭合" },
        { value: "0", label: "打开/开断" }
      ],
      readonly: false,
      exportEnabled: true
    });
  });

  test("normalizes legacy SOC measurement type and field names", () => {
    expect(normalizeDeviceMeasurementDefinitions([{
      measurementTypeId: "state_of_charge",
      associatedField: "stateOfCharge"
    }])).toEqual([{
      measurementTypeId: "soc",
      associatedField: "soc"
    }]);
  });

  test("treats an empty decimalsOverride as unset but keeps an explicit zero", () => {
    // 空串曾被 Number("") = 0 固化成 0，压过下游 profileItem?.decimalsOverride ?? 3
    expect(normalizeDeviceMeasurementDefinitions([{
      measurementTypeId: "activePower",
      decimalsOverride: "" as unknown as number
    }])).toEqual([{ measurementTypeId: "activePower" }]);
    expect(normalizeDeviceMeasurementDefinitions([{
      measurementTypeId: "activePower",
      decimalsOverride: 0
    }])).toEqual([{ measurementTypeId: "activePower", decimalsOverride: 0 }]);
  });

  test("preserves explicitly empty measurement names and units", () => {
    expect(normalizeDeviceMeasurementDefinitions([{
      measurementTypeId: "activePower",
      name: "",
      labelOverride: "",
      unitOverride: ""
    }])).toEqual([{
      measurementTypeId: "activePower",
      name: "",
      labelOverride: "",
      unitOverride: ""
    }]);
  });

  test("returns null instead of inventing a definition for a blank field", () => {
    // L99：`normalizedAssociatedField` 归一化失败（空串 / 纯空白 / null / 缺字段）时必须返回 null。
    // 若删掉这道早退，代码会拿 undefined 当 key 去查元数据表，吐出一个 cnName/enName 全是
    // undefined 的对象 —— 所以断的是返回值本身，不是某个字段值。
    expect(createMeasurementFieldParameterDefinition("")).toBeNull();
    expect(createMeasurementFieldParameterDefinition("   ")).toBeNull();
    expect(createMeasurementFieldParameterDefinition(null)).toBeNull();
    expect(createMeasurementFieldParameterDefinition(undefined)).toBeNull();
  });

  test("falls back to the caller-supplied string value type and its empty typical value", () => {
    // 两个默认值必须相反，否则断言没有鉴别力：
    // fallback.valueType 不是 "string" 时默认 "float"（typicalValue "0"），只有 === "string"
    // 才翻成 ""。只断 float 那一侧覆盖不到别名分支，因为 float 恰好就是默认值。
    expect(createMeasurementFieldParameterDefinition("my_probe", { valueType: "string" })).toEqual({
      cnName: "my_probe",
      enName: "my_probe",
      valueType: "string",
      typicalValue: "",
      readonly: false,
      exportEnabled: true
    });
    // 非 "string" 的 fallback 一律落回 float：numberEnum 不能借 fallback 混进来。
    expect(createMeasurementFieldParameterDefinition("my_probe", { cnName: "探针量", valueType: "numberEnum" })).toEqual({
      cnName: "探针量",
      enName: "my_probe",
      valueType: "float",
      typicalValue: "0",
      readonly: false,
      exportEnabled: true
    });
    // 未知字段无元数据时：cnName 回落成字段名，typicalValue 回落成 "0"。
    expect(createMeasurementFieldParameterDefinition("my_probe")).toEqual({
      cnName: "my_probe",
      enName: "my_probe",
      valueType: "float",
      typicalValue: "0",
      readonly: false,
      exportEnabled: true
    });
  });

  test("prefers built-in metadata over the caller fallback", () => {
    // status 的元数据自带 valueType "string"，fallback 说 float 也不能改写它。
    expect(createMeasurementFieldParameterDefinition("status", { valueType: "float" })).toEqual({
      cnName: "状态",
      enName: "status",
      valueType: "string",
      typicalValue: "",
      readonly: false,
      exportEnabled: true
    });
    expect(createMeasurementFieldParameterDefinition("u")).toEqual({
      cnName: "电压值",
      enName: "u",
      valueType: "float",
      typicalValue: "0",
      readonly: false,
      exportEnabled: true
    });
  });

  test("treats a blank fallback cn name as unset so the field name wins", () => {
    // L129："" 与 "   " 归一化后都是空串，必须继续回落成 undefined；
    // 否则 cnName 会是空串而不是字段名本身（`|| undefined` 被删掉即暴露）。
    expect(createMeasurementFieldParameterDefinition("my_probe", { cnName: "   " })).toEqual({
      cnName: "my_probe",
      enName: "my_probe",
      valueType: "float",
      typicalValue: "0",
      readonly: false,
      exportEnabled: true
    });
    // falsy 与 nullish 不是一回事：0 不该被当成「没传」，而是走 String() 变成 "0"。
    expect(createMeasurementFieldParameterDefinition("my_probe", { cnName: 0 })).toEqual({
      cnName: "0",
      enName: "my_probe",
      valueType: "float",
      typicalValue: "0",
      readonly: false,
      exportEnabled: true
    });
  });

  test("normalizes legacy gas quantity field names and leaves case variants alone", () => {
    // L135：大小写两个别名都要归一；正则是大小写敏感的，"GasQuantity" 必须原样留下，
    // 否则这条断言与「直接 return field」的兜底就等价、毫无鉴别力。
    expect(normalizeDeviceMeasurementDefinitions([
      { measurementTypeId: "gasVolume", associatedField: "gasQuantity" },
      { measurementTypeId: "gasVolume", associatedField: "gasquantity" },
      { measurementTypeId: "gasVolume", associatedField: "  gasQuantity  " }
    ])).toEqual([
      { measurementTypeId: "gasVolume", associatedField: "gas_quantity" },
      { measurementTypeId: "gasVolume", associatedField: "gas_quantity" },
      { measurementTypeId: "gasVolume", associatedField: "gas_quantity" }
    ]);
    expect(normalizeDeviceMeasurementDefinitions([
      { measurementTypeId: "gasVolume", associatedField: "GasQuantity" },
      { measurementTypeId: "gasVolume", associatedField: "gasQuantity2" }
    ])).toEqual([
      { measurementTypeId: "gasVolume", associatedField: "GasQuantity" },
      { measurementTypeId: "gasVolume", associatedField: "gasQuantity2" }
    ]);
  });

  test("drops definitions whose measurement type id is empty or blank", () => {
    // L142 + L155 的 !measurementTypeId：这两条断言**故意不传** validMeasurementTypeIds ——
    // 集合存在时第二个析取项会把条目照样挡掉，!measurementTypeId 就变成被遮蔽的冗余写法；
    // 集合为 undefined 时它才是唯一能把条目挡在外的条件，删掉就会留下一条 measurementTypeId
    // 为 undefined 的定义。
    //
    // 记一笔：L142 那道守卫（normalizedMeasurementTypeId 里的 !measurementTypeId）
    // **无法独立观测**，因为 normalizedOptionalString 要么返回非空串、要么返回 undefined，
    // 永不返回 ""，所以 `!x` 恒等于 `x === undefined`；而放行后 L143 的正则会把 undefined
    // 强制转成字符串 "undefined"，不匹配 → 返回的还是同一个 undefined。故把它改成
    // `return measurementTypeId` 全域等价（已实测 GREEN）。别再花一轮去「修」它。
    expect(normalizeDeviceMeasurementDefinitions([{ measurementTypeId: "" }])).toEqual([]);
    expect(normalizeDeviceMeasurementDefinitions([{ measurementTypeId: "   " }])).toEqual([]);
    expect(normalizeDeviceMeasurementDefinitions([{ measurementTypeId: null }])).toEqual([]);
    expect(normalizeDeviceMeasurementDefinitions([{}])).toEqual([]);
    expect(normalizeDeviceMeasurementDefinitions([
      { measurementTypeId: "   " },
      { measurementTypeId: "u" }
    ])).toEqual([{ measurementTypeId: "u" }]);
  });

  test("filters normalized measurement type ids against the allowed set", () => {
    // 集合里查的是**归一化后**的 id：state_of_charge 不在集合里，soc 在。
    // 若改成拿原始 source.measurementTypeId 去查，这条会红。
    expect(normalizeDeviceMeasurementDefinitions([
      { measurementTypeId: "state_of_charge" },
      { measurementTypeId: "u" },
      { measurementTypeId: "temperature" }
    ], new Set(["soc", "u"]))).toEqual([
      { measurementTypeId: "soc" },
      { measurementTypeId: "u" }
    ]);
    // 合法条目必须活下来，否则「全被过滤掉」也能骗过上面的断言。
    expect(normalizeDeviceMeasurementDefinitions([
      { measurementTypeId: "stateOfCharge", name: "荷电" }
    ], new Set(["soc"]))).toEqual([
      { measurementTypeId: "soc", name: "荷电" }
    ]);
  });

  test("drops non-object entries from the incoming list", () => {
    // L152：!raw 挡 null/undefined，typeof 挡字符串/数字/布尔。null 条目被丢掉后
    // 剩下的必须原样保留，条目数对不上就会红。
    expect(normalizeDeviceMeasurementDefinitions([
      null,
      undefined,
      "u",
      42,
      true,
      { measurementTypeId: "u" }
    ])).toEqual([{ measurementTypeId: "u" }]);
    // 空数组本身是 object，会走进后面的 measurementTypeId 校验并在那里被丢掉。
    expect(normalizeDeviceMeasurementDefinitions([[], { measurementTypeId: "f" }]))
      .toEqual([{ measurementTypeId: "f" }]);
  });

  test("ignores a missing, non-object or fully emptied styleOverride", () => {
    // L156：styleOverride 不是对象时不能被展开；L159 构造出的对象为空时也不能挂上去。
    expect(normalizeDeviceMeasurementDefinitions([{ measurementTypeId: "u", styleOverride: null }]))
      .toEqual([{ measurementTypeId: "u" }]);
    expect(normalizeDeviceMeasurementDefinitions([{ measurementTypeId: "u", styleOverride: "#ff0000" }]))
      .toEqual([{ measurementTypeId: "u" }]);
    // 六个字段逐一被判为「未设置」→ 构造结果为空对象 → 被丢弃。
    expect(normalizeDeviceMeasurementDefinitions([{
      measurementTypeId: "u",
      styleOverride: {
        color: "   ",
        fontFamily: "",
        fontSize: "abc",
        fontWeight: "600",
        fontStyle: "oblique",
        textDecoration: "line-through"
      }
    }])).toEqual([{ measurementTypeId: "u" }]);
  });

  test("keeps a trimmed and whitelisted styleOverride", () => {
    // L159：字符串字段要 trim，数值字段走 Number()，三组枚举字段走白名单。
    // 全部用非典型值：#ff8800 / 12 / "700" / "underline" 都不是重构时会顺手写死的字面量。
    expect(normalizeDeviceMeasurementDefinitions([{
      measurementTypeId: "u",
      styleOverride: {
        color: " #ff8800 ",
        fontFamily: " SimSun ",
        fontSize: "12",
        fontWeight: "700",
        fontStyle: "italic",
        textDecoration: "underline"
      }
    }])).toEqual([{
      measurementTypeId: "u",
      styleOverride: {
        color: "#ff8800",
        fontFamily: "SimSun",
        fontSize: 12,
        fontWeight: "700",
        fontStyle: "italic",
        textDecoration: "underline"
      }
    }]);
    // 数值字符串与 0 都要过 Number 门；负数/超界在 decimals 那边 clamp，这里不管。
    expect(normalizeDeviceMeasurementDefinitions([{
      measurementTypeId: "u",
      styleOverride: { fontSize: "0", fontWeight: "400", textDecoration: "none" }
    }])).toEqual([{
      measurementTypeId: "u",
      styleOverride: { fontSize: 0, fontWeight: "400", textDecoration: "none" }
    }]);
  });
});
