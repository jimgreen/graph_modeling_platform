import { describe, expect, test } from "vitest";
import {
  PARAM_LABELS,
  fitWholeCanvasViewBox,
  isBatchGraphCommonParamKey,
  paramOptionsForSection,
  pointOnBusForSnap
} from "./appExtracted/appCoreCanvasUtilities";
import { DEVICE_VISUAL_PARAM_KEYS } from "./deviceVisualParams";
import { BUILTIN_VOLTAGE_LEVELS, type ModelNode } from "./model";

// 左右面板是浮动层（styles.css .floating-side-panel），画布区占满工作区，
// 所以适配视图必须扣掉面板宽度，否则画布会被面板压住。
describe("适配视图扣掉两侧面板让位", () => {
  const bounds = { width: 1000, height: 500 };
  const frame = { clientWidth: 1920, clientHeight: 1080 };

  test("可用宽变小时画布显示变小，且保持画布宽高比", () => {
    const noPanels = fitWholeCanvasViewBox(bounds, frame, { left: 20, right: 20 });
    const withPanels = fitWholeCanvasViewBox(bounds, frame, { left: 308, right: 340 });

    // viewBox 覆盖范围更大 → 画布显示更小
    expect(withPanels.width).toBeGreaterThan(noPanels.width);
    expect(withPanels.height).toBeGreaterThan(noPanels.height);
    expect(withPanels.width / withPanels.height).toBeCloseTo(bounds.width / bounds.height, 5);
  });

  test("viewBox 始终落在画布范围内", () => {
    const viewBox = fitWholeCanvasViewBox(bounds, frame, { left: 308, right: 340 });
    expect(viewBox.x).toBeGreaterThanOrEqual(0);
    expect(viewBox.y).toBeGreaterThanOrEqual(0);
    expect(viewBox.x + viewBox.width).toBeLessThanOrEqual(bounds.width + 1e-6);
    expect(viewBox.y + viewBox.height).toBeLessThanOrEqual(bounds.height + 1e-6);
  });
});

describe("graph parameter classification", () => {
  test("keeps every canonical visual field out of the business parameter group", () => {
    for (const key of DEVICE_VISUAL_PARAM_KEYS) {
      expect(isBatchGraphCommonParamKey(key), key).toBe(true);
    }
    expect(isBatchGraphCommonParamKey("buttonTargetLayerId")).toBe(true);
    expect(isBatchGraphCommonParamKey("_labelFontSize")).toBe(true);
    expect(isBatchGraphCommonParamKey("rated_capacity")).toBe(false);
    expect(PARAM_LABELS.lineWidth).toBe("线条宽度");
  });
});

describe("device parameter Chinese labels", () => {
  test("uses meaningful electrical and endpoint labels", () => {
    expect(PARAM_LABELS.control_type).toBe("控制模式");
    expect(PARAM_LABELS.closed_status).toBe("开合状态量测值");
    expect(PARAM_LABELS.closed_status_set).toBe("开合状态设定值");
    expect(PARAM_LABELS.p_set).toBe("有功设定值");
    expect(PARAM_LABELS.i_q_set).toBe("首端无功设定值");
    expect(PARAM_LABELS.j_q_set).toBe("末端无功设定值");
    expect(PARAM_LABELS.i_max).toBe("电流上限");
    expect(PARAM_LABELS.i_min).toBe("电流下限");
    expect(PARAM_LABELS.r).toBe("电阻");
    expect(PARAM_LABELS.x).toBe("电抗");
    expect(PARAM_LABELS.gt).toBe("励磁电导");
    expect(PARAM_LABELS.bt).toBe("励磁电纳");
  });
});

describe("converter parameter options", () => {
  test("uses independent canonical options for the AC and DC control fields", () => {
    expect(paramOptionsForSection("ac_control_type", "DCACConverter")).toEqual(["PQ", "PV", "PH", "NONE"]);
    expect(paramOptionsForSection("dc_control_type", "DCACConverter")).toEqual(["P", "V", "I", "NONE"]);
    expect(paramOptionsForSection("control_type", "DCACConverter")).toBeUndefined();
    expect(PARAM_LABELS.p_dc_set).toBe("直流侧有功设定值");
  });

  test("uses independent endpoint controls for ACAC and DCDC converters", () => {
    expect(paramOptionsForSection("i_control_type", "ACACConverter")).toEqual(["PQ", "PV", "PH", "NONE"]);
    expect(paramOptionsForSection("j_control_type", "ACACConverter")).toEqual(["PQ", "PV", "PH", "NONE"]);
    expect(paramOptionsForSection("control_type", "ACACConverter")).toBeUndefined();
    expect(paramOptionsForSection("i_control_type", "DCDCConverter")).toEqual(["P", "V", "I", "NONE"]);
    expect(paramOptionsForSection("j_control_type", "DCDCConverter")).toEqual(["P", "V", "I", "NONE"]);
    expect(paramOptionsForSection("control_type", "DCDCConverter")).toBeUndefined();
  });

  test("uses P and FLOW only for electric-hydrogen coupling controls", () => {
    for (const section of ["AcE2Hydro", "DcE2Hydro", "Hydro2AcE", "Hydro2DcE"]) {
      expect(paramOptionsForSection("control_type", section), section).toEqual(["P", "FLOW"]);
    }
    expect(PARAM_LABELS.flow_set).toBe("流量设定值");
    expect(PARAM_LABELS.e2h_coeff).toBe("电-气效率(Nm3/kWh)");
    expect(PARAM_LABELS.h2e_coeff).toBe("气-电效率(kWh/Nm3)");
  });

  test("uses FLOW and PRESSURE only for hydrogen sources and loads", () => {
    expect(paramOptionsForSection("control_type", "HydroSource")).toEqual(["FLOW", "PRESSURE"]);
    expect(paramOptionsForSection("control_type", "HydroLoad")).toEqual(["FLOW", "PRESSURE"]);
    expect(PARAM_LABELS.pressure_set).toBe("压力设定值(MPa)");
    expect(PARAM_LABELS.flow_max).toBe("流量上限(Nm3/h)");
    expect(PARAM_LABELS.flow_min).toBe("流量下限(Nm3/h)");
  });

  test("uses PRESSURE and FLOW only for hydrogen storage", () => {
    expect(paramOptionsForSection("control_type", "HydroStorage")).toEqual(["PRESSURE", "FLOW"]);
  });

  test("uses P and T only for electric-heat coupling controls", () => {
    for (const section of ["AcE2Heat", "DcE2Heat", "AcE2Heat2", "DcE2Heat2"]) {
      expect(paramOptionsForSection("control_type", section), section).toEqual(["P", "T"]);
    }
    expect(PARAM_LABELS.supply_temperature).toBe("供水温度");
    expect(PARAM_LABELS.supply_temperature_set).toBe("出口温度设定值");
  });
});

describe("hydrogen tank parameter labels", () => {
  test("includes the requested engineering units", () => {
    expect(PARAM_LABELS.water_volume).toBe("水容积(m3)");
    expect(PARAM_LABELS.pressure_max).toBe("储气压力上限(Mpa)");
    expect(PARAM_LABELS.pressure_min).toBe("储气压力下限(Mpa)");
  });
});

describe("voltage base parameter options", () => {
  test("maps voltage base params (vbase/i_vbase/k_vbase/j_vbase) to builtin voltage levels", () => {
    for (const key of ["vbase", "i_vbase", "k_vbase", "j_vbase"]) {
      expect(paramOptionsForSection(key, "ACGenerator"), key).toEqual(BUILTIN_VOLTAGE_LEVELS);
    }
  });

  test("non-voltage params are unaffected by voltage base handling", () => {
    expect(paramOptionsForSection("control_type")).toEqual(["PV", "PQ", "PH", "P", "V", "I", "Q", "Z", "DCV", "ACV", "ACP", "PQQ"]);
    expect(paramOptionsForSection("i_control_type", "ACACConverter")).toEqual(["PQ", "PV", "PH", "NONE"]);
  });
});

// pointOnBusForSnap：连线时判定「这个点是否吸在母线上」，并给出吸附点。
// 判错的后果是连线吸不到母线、或吸到母线之外 —— 纯交互观感，不报错。
// 之前只有交互层的间接引用，这个函数本身零断言。
// 9 个用例、12 处变异跑过、10 处转红。两处**源码等价**（旋转角取正负、局部 y 取反）：判定用的是
// 「以母线中心为原点的对称矩形」，旋转角换个符号只会把局部坐标取反，|x| / |y| 的量级不变 ——
// 命中与否观察不到差别。旋转方向真正起作用的是后面的 projectPointToBusCenterline，那条另算。
describe("pointOnBusForSnap：母线吸附命中判定", () => {
  const bus = (over: Partial<ModelNode> = {}) =>
    ({
      id: "bus1",
      kind: "ac-bus",
      name: "母线",
      position: { x: 100, y: 100 },
      size: { width: 200, height: 20 },
      rotation: 0,
      scale: 1,
      params: {},
      terminals: [],
      ...over
    }) as unknown as ModelNode;

  test("★ 非母线一律不命中（返回 null）", () => {
    expect(pointOnBusForSnap(bus({ kind: "ac-line" }), { x: 100, y: 100 })).toBeNull();
    expect(pointOnBusForSnap(bus({ kind: "ac-breaker" }), { x: 100, y: 100 })).toBeNull();
  });

  test("★ 母线中心附近命中，并投影到中轴线上", () => {
    const hit = pointOnBusForSnap(bus(), { x: 160, y: 106 });
    expect(hit).not.toBeNull();
    // 投影后 y 回到母线中轴（100）
    expect(hit?.y).toBe(100);
    expect(hit?.x).toBe(160);
  });

  test("★ 容差内算命中、容差外不命中（横向）", () => {
    const node = bus();
    // 母线半宽 100，容差默认 18 → |局部 x| <= 118 命中
    // 可连接半宽 = 半宽 × (1 − 2 × 0.1 禁绘内缩) = 100 × 0.8 = 80；再加容差 18 → 98
    expect(pointOnBusForSnap(node, { x: 100 + 97, y: 100 })).not.toBeNull();
    expect(pointOnBusForSnap(node, { x: 100 + 99, y: 100 })).toBeNull();
  });

  test("★ 纵向用「半高 + 容差」，且半高有 4 的下限", () => {
    const node = bus({ size: { width: 200, height: 2 } });
    // 高 2 → 半高取下限 4，再加容差 18 → |y - 100| <= 22 命中
    expect(pointOnBusForSnap(node, { x: 100, y: 100 + 21 })).not.toBeNull();
    expect(pointOnBusForSnap(node, { x: 100, y: 100 + 23 })).toBeNull();
  });

  test("★ 容差可以传 0（严格落在母线框内才算）", () => {
    const node = bus();
    expect(pointOnBusForSnap(node, { x: 100 + 117, y: 100 }, 0)).toBeNull();
    expect(pointOnBusForSnap(node, { x: 100 + 50, y: 100 }, 0)).not.toBeNull();
  });

  test("★ 母线带旋转时按局部坐标判定（未旋转的点会落到框外）", () => {
    const rotated = bus({ rotation: 90 });
    // 旋转 90° 后，母线的「长边」变成竖直：横向超出即不命中
    expect(pointOnBusForSnap(rotated, { x: 100 + 119, y: 100 }, 0)).toBeNull();
    expect(pointOnBusForSnap(rotated, { x: 100, y: 100 + 50 }, 0)).not.toBeNull();
  });

  test("缩放过的母线按缩放后的尺寸判定", () => {
    const scaled = bus({ scale: 2 });
    // 半宽 100 → 200，容差 18 → 218 内命中
    expect(pointOnBusForSnap(scaled, { x: 100 + 170, y: 100 })).not.toBeNull();
    expect(pointOnBusForSnap(scaled, { x: 100 + 190, y: 100 })).toBeNull();
  });

  test("负缩放按绝对值算（方向不该影响能否吸附）", () => {
    const negative = bus({ scale: -2 });
    expect(pointOnBusForSnap(negative, { x: 100 + 170, y: 100 })).not.toBeNull();
    expect(pointOnBusForSnap(negative, { x: 100 + 190, y: 100 })).toBeNull();
  });
});
