import { describe, expect, test } from "vitest";
import {
  PARAM_LABELS,
  fitWholeCanvasViewBox,
  isBatchGraphCommonParamKey,
  paramOptionsForSection,
  pointOnBusForSnap,
  findNodeBusSnapTarget
} from "./appExtracted/appCoreCanvasUtilities";
import { DEVICE_VISUAL_PARAM_KEYS } from "./deviceVisualParams";
import { BUILTIN_VOLTAGE_LEVELS, type ModelNode } from "./model";
import { getTerminalPoint } from "./model-routing";

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

// findNodeBusSnapTarget：在候选节点里找出「移动中的节点该吸到哪条母线 / 哪个端子上」。
// 判错的后果是连线吸附到错的母线、或移动时不吸附 —— 纯交互观感，不报错。
// 与 pointOnBusForSnap 的区别：这里还要决定「谁动、谁不动」「多个候选取哪个」。
// 14 处变异跑过、13 处转红。一处**源码等价**：去掉「movedNodeIds 为空直接返回 null」那道短路 ——
// 移动集合为空时两个设备组也匹配不到任何东西，结果同样是 null。写不出能证伪它的用例，代码不动。
//
// 过程中补了三处真缺口：① 设备端子 id 与母线端子 id 相同 → 「目标端子取哪一侧」测不出来；
// ② 只测了框判定没测位移上限（点在母线框内但离中轴线超容差）；③ 多候选只测了「取最近」，没测「相等取靠前」。

describe("findNodeBusSnapTarget：母线吸附目标选取", () => {
  const terminal = (id: string, type: "ac" | "dc", x: number, y = 0) =>
    ({ id, type, label: id, anchor: { x, y }, nodeNumber: "", direction: "out" }) as never;

  const busNode = (id: string, x: number, y: number, type: "ac" | "dc" = "ac") =>
    ({
      id,
      kind: type === "ac" ? "ac-bus" : "dc-bus",
      name: id,
      position: { x, y },
      size: { width: 200, height: 20 },
      rotation: 0,
      scale: 1,
      params: {},
      terminals: [terminal("t1", type, -1), terminal("t2", type, 1)]
    }) as unknown as ModelNode;

  const deviceNode = (id: string, kind: string, x: number, y: number, terminalType: "ac" | "dc" = "ac") =>
    ({
      id,
      kind,
      name: id,
      position: { x, y },
      size: { width: 60, height: 40 },
      rotation: 0,
      scale: 1,
      params: {},
      terminals: [terminal("d-t1", terminalType, 1)]
    }) as unknown as ModelNode;

  test("★ 没有移动节点时不做吸附（返回 null）", () => {
    const bus = busNode("b1", 300, 200);
    const device = deviceNode("d1", "ac-source", 100, 200);
    expect(findNodeBusSnapTarget([bus, device], new Set())).toBeNull();
  });

  test("★ 移动设备吸到固定母线：moving 是设备、target 是母线", () => {
    const bus = busNode("b1", 200, 200);
    const device = deviceNode("d1", "ac-source", 100, 200);
    const target = findNodeBusSnapTarget([bus, device], new Set(["d1"]));
    expect(target).toMatchObject({ kind: "bus", movingNodeId: "d1", targetNodeId: "b1", movingTerminalId: "d-t1" });
  });

  test("★ 移动母线被固定设备吸附：moving 是母线、target 是设备", () => {
    const bus = busNode("b1", 200, 200);
    const device = deviceNode("d1", "ac-source", 100, 200);
    const target = findNodeBusSnapTarget([bus, device], new Set(["b1"]));
    expect(target).toMatchObject({ kind: "bus", movingNodeId: "b1", targetNodeId: "d1" });
  });

  test("★ delta 方向随「谁在动」翻转（用竖向母线才有横向位移）", () => {
    // 横向母线的中心线是水平线，投影只改 y → delta.x 恒为 0；竖向母线才有 x 位移可比。
    // 端子点由真实函数算出（里面含端子外延），母线按它摆，偏移固定 5px。
    const device = deviceNode("d1", "ac-source", 300, 300);
    const anchorPoint = getTerminalPoint(device, "t1");
    const vertical = { ...busNode("b1", anchorPoint.x + 5, anchorPoint.y), rotation: 90 } as unknown as ModelNode;
    const deviceMoved = findNodeBusSnapTarget([vertical, device], new Set(["d1"]));
    const busMoved = findNodeBusSnapTarget([vertical, device], new Set(["b1"]));
    expect(deviceMoved?.distance ?? 0).toBeCloseTo(5, 5);
    // 同一段几何：谁动，delta 就是对方的相反数
    expect(busMoved?.delta.x).toBeCloseTo(-(deviceMoved?.delta.x ?? 0), 5);
    expect(busMoved?.delta.y).toBeCloseTo(-(deviceMoved?.delta.y ?? 0), 5);
  });

  test("★ 端子类型不匹配不吸附（交流设备不吸到直流母线）", () => {
    const dcBus = busNode("b1", 200, 200, "dc");
    const acDevice = deviceNode("d1", "ac-source", 100, 200, "ac");
    expect(findNodeBusSnapTarget([dcBus, acDevice], new Set(["d1"]))).toBeNull();
  });

  test("★ 相距太远不吸附（超出容差）", () => {
    const bus = busNode("b1", 900, 200);
    const device = deviceNode("d1", "ac-source", 100, 200);
    expect(findNodeBusSnapTarget([bus, device], new Set(["d1"]))).toBeNull();
  });

  test("★ 多条母线时取最近的（不是第一条）", () => {
    const near = busNode("b-near", 200, 200);
    const far = busNode("b-far", 260, 200);
    const device = deviceNode("d1", "ac-source", 100, 200);
    const target = findNodeBusSnapTarget([near, far, device], new Set(["d1"]));
    expect(target?.targetNodeId).toBe("b-near");
  });

  test("静态图元不参与吸附（既不当设备也不当母线）", () => {
    const bus = busNode("b1", 200, 200);
    const staticNode = {
      ...deviceNode("s1", "static-rect", 100, 200),
      kind: "static-rect"
    } as unknown as ModelNode;
    expect(findNodeBusSnapTarget([bus, staticNode], new Set(["s1"]))).toBeNull();
  });

  test("★ 移动集合与固定集合之间才配对（都移动 / 都固定都不算）", () => {
    const bus = busNode("b1", 200, 200);
    const device = deviceNode("d1", "ac-source", 100, 200);
    // 两个都在移动集合里 → 没有固定母线可吸
    expect(findNodeBusSnapTarget([bus, device], new Set(["b1", "d1"]))).toBeNull();
  });

  test("★ 母线侧的目标端子是母线自己的第一个端子，与设备端子 id 无关", () => {
    const bus = busNode("b1", 200, 200);
    const device = deviceNode("d1", "ac-source", 100, 200);
    // 设备端子 id 是 d-t1、母线端子是 t1：两个方向给出的目标端子必须来自各自那一侧
    expect(findNodeBusSnapTarget([bus, device], new Set(["d1"]))?.targetTerminalId).toBe("t1");
    expect(findNodeBusSnapTarget([bus, device], new Set(["b1"]))?.targetTerminalId).toBe("d-t1");
  });

  test("★ 距离超容差不吸附（点在母线框内但离中轴线太远）", () => {
    // 框判定按「半高 + 容差」放宽，但位移本身还有一道容差上限：半高 30 的母线里偏 40 就不该吸
    const thick = { ...busNode("b1", 200, 200), size: { width: 200, height: 60 } } as unknown as ModelNode;
    const device = deviceNode("d1", "ac-source", 100, 240);
    expect(findNodeBusSnapTarget([thick, device], new Set(["d1"]))).toBeNull();
  });

  test("★ 距离相等时取候选顺序里靠前的那条（>= 比较）", () => {
    const upper = busNode("b-upper", 200, 190);
    const lower = busNode("b-lower", 200, 210);
    const device = deviceNode("d1", "ac-source", 100, 200);
    // 两条母线与端子的距离都是 10
    expect(findNodeBusSnapTarget([upper, lower, device], new Set(["d1"]))?.targetNodeId).toBe("b-upper");
    expect(findNodeBusSnapTarget([lower, upper, device], new Set(["d1"]))?.targetNodeId).toBe("b-lower");
  });
});
