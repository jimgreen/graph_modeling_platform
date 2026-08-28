import { describe, expect, test } from "vitest";
import {
  PARAM_LABELS,
  isBatchGraphCommonParamKey,
  paramOptionsForSection
} from "./appExtracted/appCoreCanvasUtilities";
import { DEVICE_VISUAL_PARAM_KEYS } from "./deviceVisualParams";
import { BUILTIN_VOLTAGE_LEVELS } from "./model";

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
