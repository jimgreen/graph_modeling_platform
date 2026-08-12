import { describe, expect, test } from "vitest";
import { PARAM_LABELS, paramOptionsForSection } from "./appExtracted/appCoreCanvasUtilities";

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
