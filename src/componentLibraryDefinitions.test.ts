import { describe, expect, test } from "vitest";
import {
  DEVICE_LIBRARY,
  type DeviceTemplate,
  type DeviceTemplateDefinitionOverride
} from "./model";
import {
  buildComponentLibraryDefaultParameterDefinitions,
  componentLibraryDefinitionOverrideKey,
  resolveEditableComponentLibraryDefinition
} from "./componentLibraryDefinitions";

const baseDefinition = {
  name: "BasePump",
  label: "基础泵",
  categoryLibraryName: "交流设备",
  isDerivedComponentLibrary: false,
  isContainerComponentLibrary: false,
  terminalCount: 1,
  terminalTypes: ["ac"],
  terminalLabels: ["交流端"],
  terminalRoles: ["single-load"],
  terminalAssociations: ["ac-load"]
} as const;

describe("component library editable definitions", () => {
  test("builds mandatory identity, state, dev_type and single-terminal topo fields", () => {
    const rows = buildComponentLibraryDefaultParameterDefinitions("ACRealBs", ["ac"]);

    expect(rows.map((row) => row.enName)).toEqual([
      "idx",
      "name",
      "status",
      "run_stat",
      "dev_type",
      "node"
    ]);
    expect(rows.find((row) => row.enName === "dev_type")?.typicalValue).toBe("ACRealBs");
  });

  test("builds deterministic topo fields for multi-terminal and container classes", () => {
    const ordinaryRows = buildComponentLibraryDefaultParameterDefinitions("TwoPortPump", ["ac", "dc"]);
    expect(ordinaryRows.map((row) => row.enName)).toEqual(expect.arrayContaining(["t1_node", "t2_node"]));
    expect(ordinaryRows.map((row) => row.enName)).not.toContain("node");

    const containerRows = buildComponentLibraryDefaultParameterDefinitions("Plant", ["ac", "dc"], {
      isContainer: true,
      terminalAssociations: ["ac-load", "dc-load"]
    });
    expect(containerRows.map((row) => row.enName)).not.toEqual(expect.arrayContaining(["node", "t1_node", "t2_node"]));
    expect(containerRows.filter((row) => row.enName.startsWith("idx_")).map((row) => row.enName)).toEqual([
      "idx_ac_load_t1",
      "idx_dc_load_t2"
    ]);
  });

  test("exposes the node field for the built-in ACRealBs class", () => {
    const resolved = resolveEditableComponentLibraryDefinition({
      className: "ACRealBs",
      categoryLibraryName: "交流设备",
      templates: DEVICE_LIBRARY,
      overrides: {}
    });

    expect(resolved?.effectiveParameterDefinitions.map((row) => row.enName)).toEqual(
      expect.arrayContaining(["idx", "name", "status", "run_stat", "dev_type", "node"])
    );
  });

  test("exposes the built-in ACGenerator control and setpoint fields", () => {
    const resolved = resolveEditableComponentLibraryDefinition({
      className: "ACGenerator",
      categoryLibraryName: "交流设备",
      templates: DEVICE_LIBRARY,
      overrides: {}
    });

    expect(resolved?.effectiveParameterDefinitions.map((row) => row.enName)).toEqual(
      expect.arrayContaining(["control_type", "p_set", "q_set", "v_set"])
    );
  });

  test("uses a persisted class override as the authoritative editable definition", () => {
    const classKey = componentLibraryDefinitionOverrideKey("BasePump");
    const overrides: Record<string, DeviceTemplateDefinitionOverride> = {
      [classKey]: {
        kind: classKey,
        params: { component_type: "BasePump" },
        parameterDefinitions: [
          { cnName: "自定义压力", enName: "pressure_set", valueType: "float", typicalValue: "1.2" }
        ],
        measurementDefinitions: [
          { measurementTypeId: "pressure", position: "device", associatedField: "pressure_set" }
        ]
      }
    };

    const resolved = resolveEditableComponentLibraryDefinition({
      className: "BasePump",
      categoryLibraryName: "交流设备",
      customComponentLibraries: [baseDefinition as any],
      templates: [],
      overrides
    });

    expect(resolved?.parameterDefinitions.map((row) => row.enName)).toEqual([
      "idx",
      "name",
      "status",
      "run_stat",
      "dev_type",
      "node",
      "pressure_set"
    ]);
    expect(resolved?.measurementDefinitions).toEqual(overrides[classKey].measurementDefinitions);
  });

  test("seeds an unpersisted class from all matching template definitions", () => {
    const templates = [
      {
        kind: "pump-a",
        label: "泵 A",
        categoryLibrary: "交流设备",
        componentClass: "BasePump",
        terminalType: "ac",
        terminalCount: 1,
        terminalTypes: ["ac"],
        terminalLabels: ["交流端"],
        size: { width: 80, height: 48 },
        params: { component_type: "BasePump" },
        parameterDefinitions: [
          { cnName: "有功设定", enName: "p_set", valueType: "float", typicalValue: "0" }
        ],
        measurementDefinitions: [
          { measurementTypeId: "p", position: "device", associatedField: "p_set" }
        ]
      },
      {
        kind: "pump-b",
        label: "泵 B",
        categoryLibrary: "交流设备",
        componentClass: "BasePump",
        terminalType: "ac",
        terminalCount: 1,
        terminalTypes: ["ac"],
        terminalLabels: ["交流端"],
        size: { width: 80, height: 48 },
        params: { component_type: "BasePump" },
        parameterDefinitions: [
          { cnName: "无功设定", enName: "q_set", valueType: "float", typicalValue: "0" }
        ]
      }
    ] as DeviceTemplate[];

    const resolved = resolveEditableComponentLibraryDefinition({
      className: "BasePump",
      categoryLibraryName: "交流设备",
      customComponentLibraries: [baseDefinition as any],
      templates,
      overrides: {}
    });

    expect(resolved?.parameterDefinitions.map((row) => row.enName)).toEqual(expect.arrayContaining([
      "idx",
      "name",
      "run_stat",
      "dev_type",
      "node",
      "p_set",
      "q_set"
    ]));
    expect(resolved?.measurementDefinitions).toEqual([
      { measurementTypeId: "p", position: "device", associatedField: "p_set" }
    ]);
  });

  test("keeps derived definitions incremental while exposing inherited effective fields", () => {
    const baseKey = componentLibraryDefinitionOverrideKey("BasePump");
    const overrides: Record<string, DeviceTemplateDefinitionOverride> = {
      [baseKey]: {
        kind: baseKey,
        params: { component_type: "BasePump" },
        parameterDefinitions: [
          { cnName: "额定功率", enName: "rated_power", valueType: "float", typicalValue: "10" }
        ],
        measurementDefinitions: [
          { measurementTypeId: "p", position: "device", associatedField: "rated_power" }
        ]
      }
    };
    const derivedDefinition = {
      name: "DerivedPump",
      label: "派生泵",
      categoryLibraryName: "交流设备",
      isDerivedComponentLibrary: true,
      derivedFromComponentLibrary: "BasePump"
    } as const;

    const resolved = resolveEditableComponentLibraryDefinition({
      className: "DerivedPump",
      categoryLibraryName: "交流设备",
      customComponentLibraries: [baseDefinition as any, derivedDefinition as any],
      templates: [],
      overrides
    });

    expect(resolved?.metadata.isDerivedComponentLibrary).toBe(true);
    expect(resolved?.parameterDefinitions).toEqual([]);
    expect(resolved?.measurementDefinitions).toEqual([]);
    expect(resolved?.effectiveParameterDefinitions.map((row) => row.enName)).toEqual(expect.arrayContaining([
      "idx",
      "name",
      "run_stat",
      "dev_type",
      "node",
      "rated_power"
    ]));
    expect(resolved?.inheritedParameterDefinitions.map((row) => row.enName)).toContain("rated_power");
    expect(resolved?.effectiveMeasurementDefinitions).toEqual(overrides[baseKey].measurementDefinitions);
  });

  test("drops legacy duplicated base rows from a persisted derived override", () => {
    const baseKey = componentLibraryDefinitionOverrideKey("BasePump");
    const derivedKey = componentLibraryDefinitionOverrideKey("DerivedPump");
    const overrides: Record<string, DeviceTemplateDefinitionOverride> = {
      [baseKey]: {
        kind: baseKey,
        parameterDefinitions: [
          { cnName: "额定功率", enName: "rated_power", valueType: "float", typicalValue: "10" }
        ],
        measurementDefinitions: [
          { measurementTypeId: "p", position: "device", associatedField: "rated_power" }
        ]
      },
      [derivedKey]: {
        kind: derivedKey,
        parameterDefinitions: [
          { cnName: "重复额定功率", enName: "rated_power", valueType: "float", typicalValue: "20" },
          { cnName: "派生修正", enName: "derived_bias", valueType: "float", typicalValue: "0" }
        ],
        measurementDefinitions: [
          { measurementTypeId: "p", position: "device", associatedField: "rated_power" },
          { measurementTypeId: "q", position: "device", associatedField: "derived_bias" }
        ]
      }
    };
    const resolved = resolveEditableComponentLibraryDefinition({
      className: "DerivedPump",
      categoryLibraryName: "交流设备",
      customComponentLibraries: [
        baseDefinition as any,
        {
          name: "DerivedPump",
          label: "派生泵",
          categoryLibraryName: "交流设备",
          isDerivedComponentLibrary: true,
          derivedFromComponentLibrary: "BasePump"
        }
      ],
      templates: [],
      overrides
    });

    expect(resolved?.parameterDefinitions.map((row) => row.enName)).toEqual(["derived_bias"]);
    expect(resolved?.measurementDefinitions).toEqual([
      { measurementTypeId: "q", position: "device", associatedField: "derived_bias" }
    ]);
    expect(resolved?.effectiveParameterDefinitions.find((row) => row.enName === "rated_power")?.typicalValue).toBe("10");
  });
});
