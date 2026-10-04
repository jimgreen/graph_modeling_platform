import { describe, expect, test } from "vitest";
import {
  PARAM_LABELS,
  fitWholeCanvasViewBox,
  isBatchGraphCommonParamKey,
  paramOptionsForSection,
  pointOnBusForSnap,
  findNodeBusSnapTarget,
  findNodeTerminalSnapTarget,
  connectTargetSearchBounds,
  applyNodeTerminalSnap
} from "./appExtracted/appCoreCanvasUtilities";
import { DEVICE_VISUAL_PARAM_KEYS } from "./deviceVisualParams";
import { BUILTIN_VOLTAGE_LEVELS, type ModelNode, type Point } from "./model";
import { getTerminalPoint } from "./model-routing";

// findNodeBusSnapTarget / findNodeTerminalSnapTarget / pointOnBusForSnap 共用的节点夹具
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

  const deviceNode = (id: string, kind: string, x: number, y: number, terminalType: "ac" | "dc" = "ac", terminalId = "d-t1"): ModelNode =>
    ({
      id,
      kind,
      name: id,
      position: { x, y },
      size: { width: 60, height: 40 },
      rotation: 0,
      scale: 1,

      params: {},
      terminals: [terminal(terminalId, terminalType, 1)]
    }) as unknown as ModelNode;


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

  // 下面两条 toBeGreaterThanOrEqual(0) 经变异实测**有鉴别力**，不需要动：
  // x / y 是 (bounds - viewBox) / 2 的居中量，确实会变负 —— 符号翻转（变异①/②）、
  // 以及 scale 算小导致 viewBox 比画布大（变异⑤）都让这两行转红（见文件末尾汇总）。
  // 也不能收紧成 toBeGreaterThan(0)：0 是**合法输出**，画布正好铺满可用区时
  // scale === 1、居中量就是 0（下面「正好铺满」用例就是这么构造的）。
  // 真正缺的是**居中语义**：光有「>= 0」守不住，把 x / y 抹成 0 这四条断言照样全绿
  // （实测变异③/④ 在加下面两行之前是 GREEN）。而「把画布摆在可用区正中」正是 fit 的意义，
  // 所以补上居中量本身的关系式。width / height 取自返回值而非写死数字：
  // 关系式不依赖夹具的具体数值。
  test("viewBox 始终落在画布范围内", () => {
    const viewBox = fitWholeCanvasViewBox(bounds, frame, { left: 308, right: 340 });
    expect(viewBox.x).toBeGreaterThanOrEqual(0);
    expect(viewBox.y).toBeGreaterThanOrEqual(0);
    expect(viewBox.x + viewBox.width).toBeLessThanOrEqual(bounds.width + 1e-6);
    expect(viewBox.y + viewBox.height).toBeLessThanOrEqual(bounds.height + 1e-6);
    expect(viewBox.x).toBeCloseTo((bounds.width - viewBox.width) / 2, 5);
    expect(viewBox.y).toBeCloseTo((bounds.height - viewBox.height) / 2, 5);
  });

  // 夹具：可用区正好等于画布（宽 1000 - 0 - 0 = 1000；高 500 - 16×2 - 4 = 464 = bounds.height）
  // → scale === 1 → viewBox 与画布等大、居中量合法地为 0。
  // 这条用例的价值是**证明 0 是合法输出**，因此上面那两条断言的下界必须是 >= 而不是 >；
  // 它本身不参与那两条断言的判定，所以把 >= 改成 > 时它仍然绿（实测：1 passed）。
  test("画布正好铺满可用区时 viewBox 与画布重合（居中量合法地为 0）", () => {
    const exactBounds = { width: 1000, height: 464 };
    const viewBox = fitWholeCanvasViewBox(exactBounds, { clientWidth: 1000, clientHeight: 500 }, { left: 0, right: 0 });
    expect(viewBox.x).toBe(0);
    expect(viewBox.y).toBe(0);
    expect(viewBox.width).toBe(exactBounds.width);
    expect(viewBox.height).toBe(exactBounds.height);
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

// findNodeBusSnapTarget 与 findNodeTerminalSnapTarget 共用的节点夹具


describe("findNodeBusSnapTarget：母线吸附目标选取", () => {


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


// findNodeTerminalSnapTarget：移动中的节点该吸到哪个**固定端子**上（母线吸附走
// findNodeBusSnapTarget）。内部按 tolerance 大小的空间桶建索引，只查 3×3 邻域 ——
// 桶算错会让「明明很近却吸不上」，且只在点落在桶边界附近时发作，最难查。
// 判错的后果是连线吸不到端子或吸到错的端子，不报错。
});

// 15 处变异跑过、14 处转红。一处**源码等价**：去掉「movedNodeIds 为空直接返回 null」的短路 ——
// 移动集合为空时另一侧循环也匹配不到任何节点，结果同样是 null。写不出能证伪它的用例，代码不动。
//
// 过程中补的真缺口：两侧端子 id 相同 → 「movingTerminalId 取哪一侧的」测不出来（改成设备端子 m-t1、
// 固定端子 f-t1）；另外把「距离相等」的真实口径查清了 —— 同桶看插入顺序、跨桶看桶键顺序，
// 并不是「候选顺序里靠前的那条」。

describe("findNodeTerminalSnapTarget：端子吸附（含空间桶邻域）", () => {
  const deviceAt = (id: string, kind: string, want: Point, terminalType: "ac" | "dc" = "ac", terminalId = "d-t1"): ModelNode => {
    const probe = deviceNode(id, kind, 0, 0, terminalType, terminalId);
    const origin = getTerminalPoint(probe, terminalId);
    return { ...probe, position: { x: want.x - origin.x, y: want.y - origin.y } } as unknown as ModelNode;
  };

  test("★ 没有移动节点时不吸附", () => {
    expect(findNodeTerminalSnapTarget([deviceAt("f1", "ac-breaker", { x: 100, y: 100 })], new Set())).toBeNull();
  });

  test("★ 命中时给出完整的吸附信息（moving / target / delta / kind）", () => {
    // 两侧端子 id 刻意不同：moving 取移动端子自己的、target 取固定端子那一侧的
    const fixed = deviceAt("f1", "ac-breaker", { x: 100, y: 100 }, "ac", "f-t1");
    const moving = deviceAt("m1", "ac-source", { x: 120, y: 100 }, "ac", "m-t1");
    const target = findNodeTerminalSnapTarget([fixed, moving], new Set(["m1"]));
    expect(target).toMatchObject({
      kind: "terminal",
      movingNodeId: "m1",
      movingTerminalId: "m-t1",
      targetNodeId: "f1",
      targetTerminalId: "f-t1",
      point: { x: 100, y: 100 }
    });
    // delta 指向目标端子（往左 20）
    expect(target?.delta).toEqual({ x: -20, y: 0 });
    expect(target?.distance).toBe(20);
  });

  test("★ 端子类型不匹配不吸附（交流端子不吸直流端子）", () => {
    const fixed = deviceAt("f1", "ac-breaker", { x: 100, y: 100 }, "dc");
    const moving = deviceAt("m1", "ac-source", { x: 110, y: 100 }, "ac");
    expect(findNodeTerminalSnapTarget([fixed, moving], new Set(["m1"]))).toBeNull();
  });

  test("★ 超出容差不吸附（容差默认 28）", () => {
    const fixed = deviceAt("f1", "ac-breaker", { x: 100, y: 100 });
    const near = deviceAt("m1", "ac-source", { x: 127, y: 100 });
    const far = deviceAt("m2", "ac-source", { x: 129, y: 100 });
    expect(findNodeTerminalSnapTarget([fixed, near], new Set(["m1"]))).not.toBeNull();
    expect(findNodeTerminalSnapTarget([fixed, far], new Set(["m2"]))).toBeNull();
  });

  test("★ 空间桶邻域覆盖：移动端子在整个容差范围内滑动，每次都要吸得上", () => {
    // 桶大小 = 容差 = 28；点落在桶边界两侧时仍要靠 3×3 邻域找到固定端子
    const fixed = deviceAt("f1", "ac-breaker", { x: 0, y: 0 });
    for (let offset = -28; offset <= 28; offset += 4) {
      const moving = deviceAt(`m${offset}`, "ac-source", { x: offset, y: 0 });
      expect(findNodeTerminalSnapTarget([fixed, moving], new Set([moving.id])), `offset=${offset}`).not.toBeNull();
    }
  });

  test("★ 跨桶要靠 3×3 邻域找得到（点落在相邻桶的各个方向）", () => {
    // 桶大小 28：固定端子在桶 (1,1)，移动端子分别落在 (0,0) / (0,1) / (1,0) —— 都只能靠邻域命中
    const fixed = deviceAt("f1", "ac-breaker", { x: 28, y: 28 });
    for (const [x, y] of [[20, 20], [24, 35], [35, 24]]) {
      const moving = deviceAt(`m${x}_${y}`, "ac-source", { x, y });
      expect(findNodeTerminalSnapTarget([fixed, moving], new Set([moving.id])), `(${x},${y})`).not.toBeNull();
    }
    // 对照：真的超出容差（45 度方向 32px）就不该命中
    const tooFar = deviceAt("m-far", "ac-source", { x: 5, y: 5 });
    expect(findNodeTerminalSnapTarget([fixed, tooFar], new Set(["m-far"]))).toBeNull();
  });

  test("多个候选取最近的", () => {
    const near = deviceAt("f-near", "ac-breaker", { x: 100, y: 100 });
    const far = deviceAt("f-far", "ac-breaker", { x: 60, y: 100 });
    const moving = deviceAt("m1", "ac-source", { x: 120, y: 100 });
    expect(findNodeTerminalSnapTarget([near, far, moving], new Set(["m1"]))?.targetNodeId).toBe("f-near");
  });

  test("★ 距离相等时同桶看插入顺序", () => {
    const moving = deviceAt("m1", "ac-source", { x: 120, y: 100 });
    // 桶大小 = 容差 = 28；两条固定端子距离都是 6，且 x/28 同为 4 → 同一桶
    const nearLeft = deviceAt("f-a", "ac-breaker", { x: 114, y: 100 });
    const nearRight = deviceAt("f-b", "ac-breaker", { x: 126, y: 100 });
    expect(findNodeTerminalSnapTarget([nearLeft, nearRight, moving], new Set(["m1"]))?.targetNodeId).toBe("f-a");
    expect(findNodeTerminalSnapTarget([nearRight, nearLeft, moving], new Set(["m1"]))?.targetNodeId).toBe("f-b");
  });

  test("★ 跨桶平局时按桶键顺序，与候选顺序无关", () => {
    const left = deviceAt("f-left", "ac-breaker", { x: 100, y: 100 });
    const right = deviceAt("f-right", "ac-breaker", { x: 140, y: 100 });
    const moving = deviceAt("m1", "ac-source", { x: 120, y: 100 });
    // 桶键 (3,3) 先于 (5,3) 被遍历，所以无论候选怎么排都是 f-left 先遇到
    expect(findNodeTerminalSnapTarget([left, right, moving], new Set(["m1"]))?.targetNodeId).toBe("f-left");
    expect(findNodeTerminalSnapTarget([right, left, moving], new Set(["m1"]))?.targetNodeId).toBe("f-left");
  });

  test("★ 母线与静态节点不作为固定端子来源（母线归 findNodeBusSnapTarget）", () => {
    const bus = busNode("b1", 100, 100);
    const staticNode = { ...deviceNode("s1", "static-rect", 100, 100), kind: "static-rect" } as unknown as ModelNode;
    const moving = deviceAt("m1", "ac-source", { x: 110, y: 100 });
    expect(findNodeTerminalSnapTarget([bus, staticNode, moving], new Set(["m1"]))).toBeNull();
  });

  test("★ 移动集合内部的端子之间不互吸", () => {
    const a = deviceAt("m1", "ac-source", { x: 100, y: 100 });
    const b = deviceAt("m2", "ac-source", { x: 110, y: 100 });
    expect(findNodeTerminalSnapTarget([a, b], new Set(["m1", "m2"]))).toBeNull();
  });

  test("容差可以传 0（只有完全重合才算）", () => {
    const fixed = deviceAt("f1", "ac-breaker", { x: 100, y: 100 });
    const same = deviceAt("m1", "ac-source", { x: 100, y: 100 });
    const offset = deviceAt("m2", "ac-source", { x: 105, y: 100 });
    expect(findNodeTerminalSnapTarget([fixed, same], new Set(["m1"]), 0)).not.toBeNull();
    expect(findNodeTerminalSnapTarget([fixed, offset], new Set(["m2"]), 0)).toBeNull();
  });
});

// connectTargetSearchBounds：连线拖拽时给空间索引划的查询框。
// 框小了 → 附近的连接目标查不到（吸不上）；框大了 → 每次拖拽都捞一堆无关节点（卡）。
// 框由「最大吸附容差 + 固定余量」决定，两条容差谁大取谁 —— 纯几何，此前零断言。
// 8 个用例、13 处变异逐条跑过、13 处全红：padding 取两条容差较大者再加余量、余量本身、只取某一条容差、
// 四边各自的正负号与对称性、不夹到 0（负坐标也要成立）、小数不取整；施加位移则是叠加 vs 覆盖、
// 方向、x / y 不串、无目标时返回原引用不造副本。

describe("connectTargetSearchBounds：连线吸附的空间查询框", () => {
  test("★ 以给定点为中心、四边等距", () => {
    expect(connectTargetSearchBounds({ x: 100, y: 200 })).toEqual({
      left: 100 - 92,
      right: 100 + 92,
      top: 200 - 92,
      bottom: 200 + 92
    });
  });

  test("★ padding 取两条容差的较大者再加余量（端子 28 > 母线 18 → 28 + 64）", () => {
    const bounds = connectTargetSearchBounds({ x: 0, y: 0 });
    expect(bounds.right).toBe(92);
    expect(bounds.left).toBe(-92);
  });

  test("负坐标点同样成立（不夹到 0）", () => {
    expect(connectTargetSearchBounds({ x: -50, y: -50 })).toEqual({
      left: -142,
      right: 42,
      top: -142,
      bottom: 42
    });
  });

  test("小数点坐标不做取整", () => {
    const bounds = connectTargetSearchBounds({ x: 10.5, y: -0.25 });
    expect(bounds.left).toBeCloseTo(10.5 - 92, 6);
    expect(bounds.bottom).toBeCloseTo(-0.25 + 92, 6);
  });
});

// applyNodeTerminalSnap：把吸附目标算出的位移加到当前拖拽位移上。
// 写错的后果是「吸上了但又跳回去」或「没吸附却动了」，不报错。
describe("applyNodeTerminalSnap：施加吸附位移", () => {
  const delta = { x: 10, y: 20 };

  test("★ 没有吸附目标时原样返回同一个对象（不多造副本）", () => {
    expect(applyNodeTerminalSnap(delta, null)).toBe(delta);
  });

  test("★ 有吸附目标时把吸附位移逐轴相加", () => {
    expect(applyNodeTerminalSnap(delta, { delta: { x: -5, y: 3 } } as never)).toEqual({ x: 5, y: 23 });
  });

  test("入参位移对象不被就地改", () => {
    applyNodeTerminalSnap(delta, { delta: { x: -5, y: 3 } } as never);
    expect(delta).toEqual({ x: 10, y: 20 });
  });

  test("吸附位移为零时也返回新对象（结果相同但引用不同）", () => {
    const result = applyNodeTerminalSnap(delta, { delta: { x: 0, y: 0 } } as never);
    expect(result).toEqual(delta);
    expect(result).not.toBe(delta);
  });
});
