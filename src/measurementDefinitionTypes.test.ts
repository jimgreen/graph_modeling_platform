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

  test("normalizes legacy SOC measurement type and field names", () => {
    expect(normalizeDeviceMeasurementDefinitions([{
      measurementTypeId: "state_of_charge",
      associatedField: "stateOfCharge"
    }])).toEqual([{
      measurementTypeId: "soc",
      associatedField: "soc"
    }]);
  });
});
