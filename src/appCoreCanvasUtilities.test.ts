import { describe, expect, test } from "vitest";
import { paramOptionsForSection } from "./appExtracted/appCoreCanvasUtilities";

describe("converter parameter options", () => {
  test("uses independent canonical options for the AC and DC control fields", () => {
    expect(paramOptionsForSection("ac_control_type", "DCACConverter")).toEqual(["PQ", "PV", "PH", "NONE"]);
    expect(paramOptionsForSection("dc_control_type", "DCACConverter")).toEqual(["P", "V", "I", "NONE"]);
    expect(paramOptionsForSection("control_type", "DCACConverter")).toBeUndefined();
  });

  test("uses independent endpoint controls for ACAC and DCDC converters", () => {
    expect(paramOptionsForSection("i_control_type", "ACACConverter")).toEqual(["PQ", "PV", "PH", "NONE"]);
    expect(paramOptionsForSection("j_control_type", "ACACConverter")).toEqual(["PQ", "PV", "PH", "NONE"]);
    expect(paramOptionsForSection("control_type", "ACACConverter")).toBeUndefined();
    expect(paramOptionsForSection("i_control_type", "DCDCConverter")).toEqual(["P", "V", "I", "NONE"]);
    expect(paramOptionsForSection("j_control_type", "DCDCConverter")).toEqual(["P", "V", "I", "NONE"]);
    expect(paramOptionsForSection("control_type", "DCDCConverter")).toBeUndefined();
  });
});
