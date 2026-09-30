// src/model.ts 里一批此前零断言的纯判定 / 归一化函数。
// 全部不抛异常，判错的后果都是「静默算错」：比率参数当普通文本显示、线缆类设备不被
// 当成可路由、静态图元库名认不出、默认状态值给错 —— 正是崩溃与类型检查都发现不了的一类。
import { describe, expect, test } from "vitest";

import {
  defaultAllowsResizeTransformForKind,
  defaultDeviceStatusValue,
  formatRatioParameterDisplayValue,
  isPercentageRatioParameterName,
  isRoutableLineDeviceKind,
  isStaticComponentLibraryName,
  isStaticGraphicParams,
  isWireLikeRouteDeviceKind,
  normalizeRunStatForE
} from "./model";
import type { DeviceStateDefinition, ModelNode } from "./model";

describe("isPercentageRatioParameterName", () => {
  test("efficiency 及任意前缀派生名（endsWith 后缀判据）", () => {
    expect(isPercentageRatioParameterName("efficiency")).toBe(true);
    expect(isPercentageRatioParameterName("loadEfficiency")).toBe(true);
    expect(isPercentageRatioParameterName("load_efficiency")).toBe(true);
    // 后缀判据是 endsWith，不是 includes
    expect(isPercentageRatioParameterName("myefficiency")).toBe(false);
    expect(isPercentageRatioParameterName("efficiency_rate")).toBe(false);
  });

  test("判定前先做 snake_case 归一：大小写 / 空白 / 驼峰都认", () => {
    expect(isPercentageRatioParameterName("Efficiency")).toBe(true);
    expect(isPercentageRatioParameterName("  Efficiency ")).toBe(true);
    expect(isPercentageRatioParameterName("socLowerLimit")).toBe(true);
    // toSnakeCaseDeviceParamName 的别名表：StateOfCharge → soc，故为真
    expect(isPercentageRatioParameterName("StateOfCharge")).toBe(true);
  });

  test("PERCENTAGE_RATIO_PARAMETER_NAMES 里的四个键", () => {
    expect(isPercentageRatioParameterName("eta")).toBe(true);
    expect(isPercentageRatioParameterName("ETA")).toBe(true);
    expect(isPercentageRatioParameterName("soc")).toBe(true);
    expect(isPercentageRatioParameterName("soc_lower_limit")).toBe(true);
    expect(isPercentageRatioParameterName("soc_upper_limit")).toBe(true);
  });

  test("普通参数与空串为假", () => {
    expect(isPercentageRatioParameterName("power")).toBe(false);
    expect(isPercentageRatioParameterName("eff")).toBe(false);
    expect(isPercentageRatioParameterName("")).toBe(false);
  });
});

describe("formatRatioParameterDisplayValue", () => {
  test("比率值乘 100 加百分号：0.95 → 95%", () => {
    expect(formatRatioParameterDisplayValue("efficiency", "0.95")).toBe("95%");
    expect(formatRatioParameterDisplayValue("eta", "0.5")).toBe("50%");
    expect(formatRatioParameterDisplayValue("soc", "0.8")).toBe("80%");
  });

  test("★ 带 % 后缀与「>1 即百分数」两条换算路径", () => {
    expect(formatRatioParameterDisplayValue("efficiency", "95%")).toBe("95%");
    // 无 % 且 |v| > 1 时按百分数解读：1.5 → 0.015 → 1.5%
    expect(formatRatioParameterDisplayValue("efficiency", "1.5")).toBe("1.5%");
    // |v| <= 1 且无 % 时按小数解读：95 → 0.95 → 95%
    expect(formatRatioParameterDisplayValue("efficiency", "95")).toBe("95%");
  });

  test("非法值与越界值原样透出（不吞、不改成 0）", () => {
    expect(formatRatioParameterDisplayValue("efficiency", "")).toBe("");
    expect(formatRatioParameterDisplayValue("efficiency", "abc")).toBe("abc");
    // 负值越界 → 归一返回 null → 回退原文本
    expect(formatRatioParameterDisplayValue("efficiency", "-0.5")).toBe("-0.5");
  });

  test("非比率参数不加工：只做 trim", () => {
    expect(formatRatioParameterDisplayValue("power", "0.95")).toBe("0.95");
    expect(formatRatioParameterDisplayValue("power", "  0.95  ")).toBe("0.95");
  });

  test("0 与超精度小数经 compactRatioNumber 收口：0 → 0%、1e-13 → 0%", () => {
    expect(formatRatioParameterDisplayValue("efficiency", "0")).toBe("0%");
    // Math.round(1e-13 * 1e12) / 1e12 = 0，故 1e-13 这一档显示成 0%
    expect(formatRatioParameterDisplayValue("efficiency", "0.0000000000001")).toBe("0%");
    // 12 位有效，超出即按四舍五入显示
    expect(formatRatioParameterDisplayValue("efficiency", "  0.333333333333  ")).toBe("33.3333333333%");
    expect(formatRatioParameterDisplayValue("efficiency", "1e-3")).toBe("0.1%");
  });

  test("% 与数字之间的空白被吃掉：'50 %' → 50%", () => {
    expect(formatRatioParameterDisplayValue("efficiency", "50 %")).toBe("50%");
  });
});

describe("isWireLikeRouteDeviceKind", () => {
  test("线缆类六种：既含 routable 也含普通 line 两族", () => {
    for (const kind of ["ac-line", "ac-zero-branch", "dc-line", "dc-zero-branch", "hydrogen-pipeline", "heat-pipeline"]) {
      expect(isWireLikeRouteDeviceKind(kind)).toBe(true);
    }
  });

  test("routable 族同样算「线缆状」", () => {
    for (const kind of ["ac-routable-line", "dc-routable-line", "hydrogen-routable-pipeline"]) {
      expect(isRoutableLineDeviceKind(kind)).toBe(true);
      expect(isWireLikeRouteDeviceKind(kind)).toBe(true);
    }
  });

  test("★ 两族互不包含：普通 ac-line 不是 routable", () => {
    // isCanvasNodeMovable 走的是 isRoutableLineDeviceKind，两者判据不同、结论也不同
    expect(isRoutableLineDeviceKind("ac-line")).toBe(false);
    expect(isWireLikeRouteDeviceKind("ac-line")).toBe(true);
  });

  test("-vertical 派生后缀仍走 baseDeviceKind 回落", () => {
    expect(isWireLikeRouteDeviceKind("ac-line-vertical")).toBe(true);
  });

  test("非线缆设备为假（静态图元不算）", () => {
    expect(isWireLikeRouteDeviceKind("ac-load")).toBe(false);
    expect(isWireLikeRouteDeviceKind("static-polyline")).toBe(false);
    expect(isWireLikeRouteDeviceKind("heater")).toBe(false);
  });
});

describe("defaultAllowsResizeTransformForKind", () => {
  test("bus 子串命中：ac/dc/hydrogen 母线都可缩放旋转", () => {
    expect(defaultAllowsResizeTransformForKind("ac-bus")).toBe(true);
    expect(defaultAllowsResizeTransformForKind("dc-bus")).toBe(true);
    expect(defaultAllowsResizeTransformForKind("hydrogen-bus")).toBe(true);
    // includes("bus") 是子串判据，-vertical 派生后缀不改变结论
    expect(defaultAllowsResizeTransformForKind("ac-bus-vertical")).toBe(true);
  });

  test("储罐四类显式列举", () => {
    expect(defaultAllowsResizeTransformForKind("hydrogen-tank")).toBe(true);
    expect(defaultAllowsResizeTransformForKind("hydrogen-tank-vertical")).toBe(true);
    expect(defaultAllowsResizeTransformForKind("hydrogen-tank-container")).toBe(true);
    expect(defaultAllowsResizeTransformForKind("thermal-storage-tank")).toBe(true);
  });

  test("静态图元可缩放：kind 映射或 custom- 前缀反查都算", () => {
    expect(defaultAllowsResizeTransformForKind("static-rect")).toBe(true);
    // custom-<库名> 形式由 staticComponentLibraryFromCustomKind 反查
    expect(defaultAllowsResizeTransformForKind("custom-StaticButton-1")).toBe(true);
  });

  test("★ 只有 routable 族线路放行：ac-line 为假、ac-routable-line 为真", () => {
    // 判据是 bus 子串 / 静态图元 / isRoutableLineDeviceKind / 储罐白名单四条，
    // 「线缆状」（isWireLikeRouteDeviceKind，含普通 ac-line）**不在**其中
    expect(defaultAllowsResizeTransformForKind("ac-line")).toBe(false);
    expect(defaultAllowsResizeTransformForKind("ac-routable-line")).toBe(true);
  });

  test("普通设备为假", () => {
    expect(defaultAllowsResizeTransformForKind("ac-load")).toBe(false);
    expect(defaultAllowsResizeTransformForKind("breaker")).toBe(false);
  });
});

describe("isStaticComponentLibraryName / isStaticGraphicParams", () => {
  test("库名大小写敏感，只有精确名命中", () => {
    expect(isStaticComponentLibraryName("StaticButton")).toBe(true);
    expect(isStaticComponentLibraryName(" StaticButton ")).toBe(true);
    // 注意：不做大小写折叠
    expect(isStaticComponentLibraryName("staticbutton")).toBe(false);
    expect(isStaticComponentLibraryName("NoSuchLib")).toBe(false);
    expect(isStaticComponentLibraryName("")).toBe(false);
  });

  test("★ params 取值只认三个键：component_type / componentLibrary / componentType", () => {
    expect(isStaticGraphicParams({ component_type: "StaticTextSymbol" })).toBe(true);
    expect(isStaticGraphicParams({ componentLibrary: " StaticButton " })).toBe(true);
    expect(isStaticGraphicParams({ componentType: "StaticTextSymbol" })).toBe(true);
    // 蛇形 component_library 不在取值链里 —— 判据写的是 component_type
    expect(isStaticGraphicParams({ component_library: "StaticButton" })).toBe(false);
    expect(isStaticGraphicParams({ component_type: "Nope" })).toBe(false);
    expect(isStaticGraphicParams({})).toBe(false);
  });

  test("取值链是 || 短路：先命中即算数，component_type 空串会挡住后面的键", () => {
    expect(isStaticGraphicParams({ component_library: "StaticButton", componentLibrary: "StaticTextSymbol" })).toBe(true);
    // component_type 为空串 → falsy → 继续看 componentLibrary
    expect(isStaticGraphicParams({ component_type: "", componentLibrary: "StaticTextSymbol" })).toBe(true);
  });
});

describe("normalizeRunStatForE", () => {
  test("运行侧别名 → '1'（大小写不敏感、首尾空白吃掉）", () => {
    for (const value of ["1", "运行", "投运", "ON", "true", " 运行 "]) {
      expect(normalizeRunStatForE(value)).toBe("1");
    }
  });

  test("停运侧别名 → '0'", () => {
    for (const value of ["0", "停运", "检修", "OFF", "false"]) {
      expect(normalizeRunStatForE(value)).toBe("0");
    }
  });

  test("空输入返回空串（fallback 默认值）", () => {
    expect(normalizeRunStatForE(undefined)).toBe("");
    expect(normalizeRunStatForE("")).toBe("");
    expect(normalizeRunStatForE("  ")).toBe("");
  });

  test("未命中的文本原样返回，不吞不改", () => {
    // 不得当成 "1" 或 "0" —— E 文件里枚举外的值要能让对端看见
    expect(normalizeRunStatForE("投运中")).toBe("投运中");
    expect(normalizeRunStatForE("2")).toBe("2");
    // 已证明 compactRatioNumber 里的 Object.is(-0) 归一不能作为覆盖证据（属源码自身等价）：
    // ① 它的两个调用点都在归一前拒掉负值，-0 到不了；② 即便到达，String(-0) === "0"，
    //    三元两侧输出逐字节相同。删掉该分支后本组仍全绿。
  });
});

describe("defaultDeviceStatusValue", () => {
  const binaryStates: DeviceStateDefinition[] = [
    { value: "1", name: "闭合" },
    { value: "0", name: "打开" }
  ];
  const template = (extra: Record<string, unknown>) => extra as unknown as Pick<ModelNode, "kind" | "params">;

  test("无状态定义的设备返回空串（不给默认开/合）", () => {
    expect(defaultDeviceStatusValue(template({ kind: "ac-load", params: {} }))).toBe("");
    expect(defaultDeviceStatusValue(template({ kind: "ac-container", params: {} }))).toBe("");
  });

  test("开关/断路器/阀门默认给 '1'（无参数时走二元状态首项）", () => {
    expect(defaultDeviceStatusValue(template({ kind: "ac-switch", params: {} }))).toBe("1");
    expect(defaultDeviceStatusValue(template({ kind: "ac-valve", params: {} }))).toBe("1");
  });

  test("★ 开关类读 closed_status 优先于 status", () => {
    expect(defaultDeviceStatusValue(template({ kind: "ac-switch", params: { closed_status: "0", status: "1" } }))).toBe("0");
    // 没有 closed_status 才回落到 status
    expect(defaultDeviceStatusValue(template({ kind: "ac-switch", params: { status: "1" } }))).toBe("1");
    expect(defaultDeviceStatusValue(template({ kind: "ac-breaker", params: { closed_status: "1" } }))).toBe("1");
  });

  test("★ 容器豁免：kind 含 switch 的容器不得被当开关", () => {
    // ac-switch-box 含 "switch" 子串，不豁免就会被注入 closed_status，与「容器无 status 量测」口径分叉
    expect(defaultDeviceStatusValue(template({ kind: "ac-container", params: {} }))).toBe("");
    expect(defaultDeviceStatusValue(template({ kind: "ac-switch-box", params: {} }))).toBe("");
  });

  test("显式状态值按 states 精确值 / 归一值逐级匹配", () => {
    expect(defaultDeviceStatusValue(template({ kind: "ac-load", params: { status: "1" }, stateDefinitions: binaryStates }))).toBe("1");
    // 传的是状态「名」不是值，也能通过归一匹配上
    expect(defaultDeviceStatusValue(template({ kind: "ac-load", params: { status: "闭合" }, stateDefinitions: binaryStates }))).toBe("1");
    expect(defaultDeviceStatusValue(template({ kind: "ac-load", params: { status: "CLOSE" }, stateDefinitions: binaryStates }))).toBe("1");
  });

  test("★ 精确值优先于归一匹配：states 值本身是中文时不折成 1/0", () => {
    // states 值用「运行/停运」时，status="1" 必须原样取回 states 里那枚「运行」，
    // 而不是走归一匹配把它换成别的、或直接返回归一后的 "1"
    const chineseStates: DeviceStateDefinition[] = [
      { value: "运行", name: "运行" },
      { value: "停运", name: "停运" }
    ];
    expect(defaultDeviceStatusValue(template({ kind: "ac-load", params: { status: "1" }, stateDefinitions: chineseStates }))).toBe("运行");
    expect(defaultDeviceStatusValue(template({ kind: "ac-load", params: { status: "停运" }, stateDefinitions: chineseStates }))).toBe("停运");
  });

  test("★ 接地刀闸无显式状态时恒给 0（不是二元首项 1）", () => {
    // 该特判排在 isDefaultBinaryStateDeviceKind 之前：刀闸的「默认」是分闸，
    // 与其他开关设备的默认合闸相反
    expect(defaultDeviceStatusValue(template({ kind: "ac-ground-disconnector", params: {} }))).toBe("0");
    // 显式给了 stateDefinitions 就不走这一段（数组优先，直接返回空串）
    expect(defaultDeviceStatusValue(template({ kind: "ac-ground-disconnector", params: {}, stateDefinitions: binaryStates }))).toBe("");
  });

  test("★ 容器即使带着开关类参数也不按开关读状态值", () => {
    // 豁免在 switchingDeviceUsesClosedStatus：容器不读 closed_status，
    // 且无状态定义时不给默认 —— 两条都返回空串
    expect(defaultDeviceStatusValue(template({ kind: "ac-switch-box", params: { closed_status: "0", status: "1" } }))).toBe("");
    expect(defaultDeviceStatusValue(template({ kind: "ac-container", params: { closed_status: "0", status: "1" } }))).toBe("");
    // 对照：真开关同一组参数读 closed_status
    expect(defaultDeviceStatusValue(template({ kind: "ac-switch", params: { closed_status: "0", status: "1" } }))).toBe("0");
    // 给了 stateDefinitions 才看得出差别（无定义时容器在 isDefaultBinaryStateDeviceKind
    // 那道豁免就返回空数组，两条路径同归 ""）：容器只读 status，不读 closed_status
    expect(defaultDeviceStatusValue(template({ kind: "ac-switch-box", params: { closed_status: "0", status: "1" }, stateDefinitions: binaryStates }))).toBe("1");
    expect(defaultDeviceStatusValue(template({ kind: "ac-switch-box", params: { closed_status: "0" }, stateDefinitions: binaryStates }))).toBe("");
  });

  test("closed_status 的驼峰别名 closedStatus 也在取值链里", () => {
    // 中间键被去掉时这两条会变成读 status / 落空
    expect(defaultDeviceStatusValue(template({ kind: "ac-switch", params: { closedStatus: "0", status: "1" } }))).toBe("0");
    expect(defaultDeviceStatusValue(template({ kind: "ac-breaker", params: { closedStatus: "0" } }))).toBe("0");
  });

  test("显式 stateDefinitions 数组：不给默认、不猜首项", () => {
    expect(defaultDeviceStatusValue(template({ kind: "ac-switch", params: {}, stateDefinitions: binaryStates }))).toBe("");
    expect(defaultDeviceStatusValue(template({ kind: "ac-load", params: {}, stateDefinitions: binaryStates }))).toBe("");
  });

  test("stateDefinitions 为空数组时返回空串", () => {
    expect(defaultDeviceStatusValue(template({ kind: "ac-load", params: { status: "x" }, stateDefinitions: [] }))).toBe("");
  });
});
