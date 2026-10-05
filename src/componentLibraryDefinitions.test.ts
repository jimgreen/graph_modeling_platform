import { describe, expect, test } from "vitest";
import {
  createDefaultNode,
  DEVICE_LIBRARY,
  getTemplateParameterDefinitions,
  templateDerivedComponentLibraryInfo,
  type DeviceTemplate,
  type DeviceTemplateDefinitionOverride
} from "./model";
import {
  buildComponentLibraryDefaultParameterDefinitions,
  componentLibraryDefinitionOverrideKey,
  mergeComponentLibraryMeasurementProfiles,
  reconcileProjectMeasurementsForRuntimeConfigChange,
  resolveComponentLibraryMeasurementProfiles,
  resolveEditableComponentLibraryDefinition
} from "./componentLibraryDefinitions";
import { deviceDefinitionSharedKeyForTemplate } from "./customDeviceUtils";
import {
  createDefaultMeasurementGroupsForNode,
  normalizeMeasurementConfig
} from "./measurements";

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

const canonicalEndpointClasses = [
  ["ACBranch", "交流设备"],
  ["DCBranch", "直流设备"],
  ["ACZeroBranch", "交流设备"],
  ["DCZeroBranch", "直流设备"],
  ["ACSwitch", "交流设备"],
  ["DCSwitch", "直流设备"],
  ["ACBreak", "交流设备"],
  ["DCBreak", "直流设备"],
  ["ACTransformer", "交流设备"],
  ["DCDCConverter", "直流设备"],
  ["DCACConverter", "直流设备"],
  ["ACACConverter", "交流设备"],
  ["ACSeriCompensator", "交流设备"]
] as const;

describe("component library editable definitions", () => {
  test("builds mandatory identity, state, parent, dev_type and single-terminal topo fields", () => {
    const rows = buildComponentLibraryDefaultParameterDefinitions("ACRealBs", ["ac"]);

    expect(rows.map((row) => row.enName)).toEqual([
      "idx",
      "name",
      "status",
      "run_stat",
      "parent",
      "dev_type",
      "node"
    ]);
    expect(rows.find((row) => row.enName === "parent")).toMatchObject({
      cnName: "所属模型",
      valueType: "numberEnum",
      typicalValue: "",
      enumValueType: "number",
      readonly: false,
      exportEnabled: true,
      exportName: "parent"
    });
    expect(rows.find((row) => row.enName === "dev_type")?.typicalValue).toBe("ACRealBs");
    expect(rows.find((row) => row.enName === "dev_type")?.readonly).toBe(false);
  });

  test("builds deterministic topo fields for multi-terminal and container classes", () => {
    const ordinaryRows = buildComponentLibraryDefaultParameterDefinitions("TwoPortPump", ["ac", "dc"]);
    expect(ordinaryRows.map((row) => row.enName)).toEqual(expect.arrayContaining(["t1_node", "t2_node"]));
    expect(ordinaryRows.map((row) => row.enName)).not.toContain("node");

    const threeTerminalRows = buildComponentLibraryDefaultParameterDefinitions("ThreePortDevice", ["ac", "ac", "ac"]);
    expect(threeTerminalRows.map((row) => row.enName)).toEqual(
      expect.arrayContaining(["t1_node", "t2_node", "t3_node"])
    );

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

  test("uses only i_node and j_node for canonical two-terminal E device endpoint fields", () => {
    for (const [className] of canonicalEndpointClasses) {
      const rows = buildComponentLibraryDefaultParameterDefinitions(
        className,
        className.startsWith("DC") ? ["dc", "dc"] : ["ac", "ac"]
      );
      const nodeFields = rows
        .map((row) => row.enName)
        .filter((name) => name.endsWith("_node"));

      expect(nodeFields, className).toEqual(["i_node", "j_node"]);
    }
  });

  test("uses i_node, k_node, and j_node for the high, medium, and low three-winding transformer sides", () => {
    const rows = buildComponentLibraryDefaultParameterDefinitions("ACTransfomer3", ["ac", "ac", "ac"]);
    const nodeFields = rows
      .filter((row) => row.enName.endsWith("_node"))
      .map((row) => [row.cnName, row.enName]);

    expect(nodeFields).toEqual([
      ["高压侧节点号", "i_node"],
      ["中压侧节点号", "k_node"],
      ["低压侧节点号", "j_node"]
    ]);
  });

  test("removes historical t1_node and t2_node definitions from persisted canonical endpoint classes", () => {
    const legacyTopologyDefinitions = [
      { cnName: "端子1节点号", enName: "t1_node", valueType: "integer", typicalValue: "", readonly: true },
      { cnName: "端子2节点号", enName: "t2_node", valueType: "integer", typicalValue: "", readonly: true }
    ] as const;

    for (const [className, categoryLibraryName] of canonicalEndpointClasses) {
      const overrideKey = componentLibraryDefinitionOverrideKey(className);
      const resolved = resolveEditableComponentLibraryDefinition({
        className,
        categoryLibraryName,
        templates: DEVICE_LIBRARY,
        overrides: {
          [overrideKey]: {
            kind: overrideKey,
            parameterDefinitions: legacyTopologyDefinitions.map((definition) => ({ ...definition }))
          }
        }
      });
      const names = resolved?.effectiveParameterDefinitions.map((definition) => definition.enName) ?? [];

      expect(names, className).toEqual(expect.arrayContaining(["i_node", "j_node"]));
      expect(names, className).not.toEqual(expect.arrayContaining(["t1_node", "t2_node"]));
    }
  });

  test("removes historical t1_node, t2_node, and t3_node definitions from persisted three-winding transformers", () => {
    const overrideKey = componentLibraryDefinitionOverrideKey("ACTransfomer3");
    const resolved = resolveEditableComponentLibraryDefinition({
      className: "ACTransfomer3",
      categoryLibraryName: "交流设备",
      templates: DEVICE_LIBRARY,
      overrides: {
        [overrideKey]: {
          kind: overrideKey,
          parameterDefinitions: [
            { cnName: "高压侧节点号", enName: "t1_node", valueType: "integer", typicalValue: "", readonly: true },
            { cnName: "中压侧节点号", enName: "t2_node", valueType: "integer", typicalValue: "", readonly: true },
            { cnName: "低压侧节点号", enName: "t3_node", valueType: "integer", typicalValue: "", readonly: true }
          ]
        }
      }
    });
    const nodeFields = resolved?.effectiveParameterDefinitions
      .filter((definition) => definition.enName.endsWith("_node"))
      .map((definition) => definition.enName);

    expect(nodeFields).toEqual(["i_node", "k_node", "j_node"]);
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

  test.each([
    ["ACRealBs", "交流设备", "ac-bus", "0"],
    ["DCRealBs", "直流设备", "dc-bus", "0"],
    ["ACLoad", "交流设备", "ac-load", "0"],
    ["DCLoad", "直流设备", "dc-load", "0"],
    ["ACBranch", "交流设备", "ac-line", "0"],
    ["DCBranch", "直流设备", "dc-line", "0"],
    ["ACZeroBranch", "交流设备", "ac-zero-branch", "0"],
    ["DCZeroBranch", "直流设备", "dc-zero-branch", "0"],
    ["ACSwitch", "交流设备", "ac-switch", "0"],
    ["DCSwitch", "直流设备", "dc-switch", "0"],
    ["ACBreak", "交流设备", "ac-breaker", "0"],
    ["DCBreak", "直流设备", "dc-breaker", "0"]
  ] as const)("adds rated voltage to the %s base device class", (className, categoryLibraryName, kind, typicalValue) => {
    const resolved = resolveEditableComponentLibraryDefinition({
      className,
      categoryLibraryName,
      templates: DEVICE_LIBRARY,
      overrides: {}
    });
    const definition = resolved?.effectiveParameterDefinitions.find((row) => row.enName === "rated_voltage");
    const node = createDefaultNode(kind, { x: 100, y: 100 });

    expect(definition).toMatchObject({
      enName: "rated_voltage",
      valueType: "float",
      typicalValue,
      readonly: false
    });
    expect(node.params.rated_voltage).toBe(typicalValue);
  });

  test("uses zero as the initial rated voltage for every built-in device that defines the field", () => {
    const templatesWithRatedVoltage = DEVICE_LIBRARY.filter((template) => (
      Object.prototype.hasOwnProperty.call(template.params, "rated_voltage")
    ));

    expect(templatesWithRatedVoltage.length).toBeGreaterThan(0);
    for (const template of templatesWithRatedVoltage) {
      const definition = getTemplateParameterDefinitions(template)
        .find((candidate) => candidate.enName === "rated_voltage");
      const node = createDefaultNode(template.kind, { x: 100, y: 100 });

      expect(template.params.rated_voltage, template.kind).toBe("0");
      expect(node.params.rated_voltage, template.kind).toBe("0");
      if (definition) {
        expect(definition.typicalValue, template.kind).toBe("0");
      }
    }
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

  test("keeps every built-in derived class definition incremental without parent or dev_type", () => {
    const derivedClasses = new Map<string, { className: string; categoryLibraryName: string }>();
    for (const template of DEVICE_LIBRARY) {
      const derivedInfo = templateDerivedComponentLibraryInfo(template);
      if (!derivedInfo) continue;
      const className = derivedInfo.derivedComponentLibrary;
      const categoryLibraryName = template.categoryLibrary;
      derivedClasses.set(`${categoryLibraryName}:${className}`, { className, categoryLibraryName });
    }

    expect(derivedClasses.size).toBeGreaterThan(0);
    for (const { className, categoryLibraryName } of derivedClasses.values()) {
      const resolved = resolveEditableComponentLibraryDefinition({
        className,
        categoryLibraryName,
        templates: DEVICE_LIBRARY,
        overrides: {}
      });
      const ownKeys = resolved?.parameterDefinitions.map((row) => row.enName.trim().toLowerCase()) ?? [];
      const inheritedKeys = new Set(
        resolved?.inheritedParameterDefinitions.map((row) => row.enName.trim().toLowerCase()) ?? []
      );

      expect(resolved?.metadata.isDerivedComponentLibrary, className).toBe(true);
      expect(ownKeys, className).not.toContain("parent");
      expect(ownKeys, className).not.toContain("dev_type");
      expect(ownKeys.filter((key) => inheritedKeys.has(key)), className).toEqual([]);
    }
  });

  test("does not let a custom diesel glyph copy hide the built-in derived-class relationship", () => {
    const customDieselCopy = {
      kind: "custom-ACDieselGen",
      label: "交流柴油发电机-副本",
      componentClass: "ACDieselGen",
      categoryLibrary: "交流设备",
      terminalType: "ac",
      terminalCount: 1,
      terminalTypes: ["ac"],
      terminalLabels: ["交流发电机端"],
      size: { width: 150, height: 94 },
      params: {},
      custom: true
    } as DeviceTemplate;
    const overrideKey = componentLibraryDefinitionOverrideKey("ACDieselGen");
    const resolved = resolveEditableComponentLibraryDefinition({
      className: "ACDieselGen",
      categoryLibraryName: "交流设备",
      templates: [...DEVICE_LIBRARY, customDieselCopy],
      overrides: {
        [overrideKey]: {
          kind: overrideKey,
          parameterDefinitions: [
            { cnName: "所属模型", enName: "parent", valueType: "integer", typicalValue: "" },
            { cnName: "设备类型", enName: "dev_type", valueType: "string", typicalValue: "ACDieselGen" },
            { cnName: "额定容量", enName: "rated_capacity", valueType: "float", typicalValue: "5" },
            { cnName: "柴油机组型号", enName: "dieselUnitModel", valueType: "string", typicalValue: "DG-2500" }
          ]
        }
      }
    });
    const ownKeys = resolved?.parameterDefinitions.map((row) => row.enName) ?? [];

    expect(resolved?.metadata).toMatchObject({
      isDerivedComponentLibrary: true,
      baseComponentLibrary: "ACGenerator"
    });
    expect(ownKeys).toContain("dieselUnitModel");
    expect(ownKeys).not.toEqual(expect.arrayContaining(["parent", "dev_type", "rated_capacity"]));
  });

  test("restores built-in class measurements hidden by historical empty shared overrides", () => {
    const cases = [
      ["ACGenerator", "ac-source", ["activePower", "reactivePower", "voltage", "frequency"]],
      ["ACBranch", "ac-line", [
        "activePower", "reactivePower", "voltage", "current",
        "activePower", "reactivePower", "voltage", "current"
      ]],
      ["ACTransformer", "ac-transformer", [
        "activePower", "reactivePower", "voltage", "current",
        "activePower", "reactivePower", "voltage", "current", "tapPosition"
      ]]
    ] as const;

    for (const [className, kind, expectedMeasurementTypes] of cases) {
      const template = DEVICE_LIBRARY.find((candidate) => candidate.kind === kind)!;
      const sharedKey = deviceDefinitionSharedKeyForTemplate(template);
      const resolved = resolveEditableComponentLibraryDefinition({
        className,
        categoryLibraryName: "交流设备",
        templates: DEVICE_LIBRARY,
        overrides: {
          [sharedKey]: {
            kind: sharedKey,
            measurementDefinitions: [],
            updatedAt: "2026-08-14T17:14:43.814Z"
          }
        }
      });

      expect(resolved?.measurementDefinitions.map((row) => row.measurementTypeId), className)
        .toEqual(expectedMeasurementTypes);
    }
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
      "parent",
      "dev_type",
      "node",
      "pressure_set"
    ]);
    expect(resolved?.measurementDefinitions).toEqual(overrides[classKey].measurementDefinitions);
  });

  test("restores an editable class-name dev_type default for persisted base and derived classes", () => {
    const baseKey = componentLibraryDefinitionOverrideKey("BasePump");
    const derivedKey = componentLibraryDefinitionOverrideKey("DerivedPump");
    const derivedDefinition = {
      name: "DerivedPump",
      label: "派生泵",
      categoryLibraryName: "交流设备",
      isDerivedComponentLibrary: true,
      derivedFromComponentLibrary: "BasePump"
    } as const;
    const overrides: Record<string, DeviceTemplateDefinitionOverride> = {
      [baseKey]: {
        kind: baseKey,
        parameterDefinitions: [
          { cnName: "设备类型", enName: "dev_type", valueType: "string", typicalValue: "", readonly: true }
        ]
      },
      [derivedKey]: {
        kind: derivedKey,
        parameterDefinitions: []
      }
    };

    const baseResolved = resolveEditableComponentLibraryDefinition({
      className: "BasePump",
      categoryLibraryName: "交流设备",
      customComponentLibraries: [baseDefinition as any, derivedDefinition as any],
      templates: [],
      overrides
    });
    const derivedResolved = resolveEditableComponentLibraryDefinition({
      className: "DerivedPump",
      categoryLibraryName: "交流设备",
      customComponentLibraries: [baseDefinition as any, derivedDefinition as any],
      templates: [],
      overrides
    });

    expect(baseResolved?.effectiveParameterDefinitions.find((row) => row.enName === "dev_type")).toMatchObject({
      typicalValue: "BasePump",
      readonly: false
    });
    expect(derivedResolved?.parameterDefinitions.map((row) => row.enName)).not.toContain("dev_type");
    expect(derivedResolved?.effectiveParameterDefinitions.find((row) => row.enName === "dev_type")).toMatchObject({
      typicalValue: "DerivedPump",
      readonly: false
    });
  });

  test("preserves an explicit non-empty persisted dev_type default", () => {
    const classKey = componentLibraryDefinitionOverrideKey("BasePump");
    const resolved = resolveEditableComponentLibraryDefinition({
      className: "BasePump",
      categoryLibraryName: "交流设备",
      customComponentLibraries: [baseDefinition as any],
      templates: [],
      overrides: {
        [classKey]: {
          kind: classKey,
          parameterDefinitions: [
            { cnName: "设备类型", enName: "dev_type", valueType: "string", typicalValue: "UserEditableType", readonly: false }
          ]
        }
      }
    });

    expect(resolved?.effectiveParameterDefinitions.find((row) => row.enName === "dev_type")).toMatchObject({
      typicalValue: "UserEditableType",
      readonly: false
    });
  });

  test("applies base-class terminal energy overrides and inherits them into derived classes", () => {
    const baseKey = componentLibraryDefinitionOverrideKey("BasePump");
    const derivedKey = componentLibraryDefinitionOverrideKey("DerivedPump");
    const derivedDefinition = {
      name: "DerivedPump",
      label: "派生泵",
      categoryLibraryName: "交流设备",
      isDerivedComponentLibrary: true,
      derivedFromComponentLibrary: "BasePump"
    } as const;
    const overrides: Record<string, DeviceTemplateDefinitionOverride> = {
      [baseKey]: {
        kind: baseKey,
        terminalType: "dc",
        terminalCount: 1,
        terminalTypes: ["dc"],
        terminalLabels: ["直流端"]
      },
      [derivedKey]: {
        kind: derivedKey,
        terminalType: "h2",
        terminalCount: 1,
        terminalTypes: ["h2"]
      }
    };

    const baseResolved = resolveEditableComponentLibraryDefinition({
      className: "BasePump",
      categoryLibraryName: "交流设备",
      customComponentLibraries: [baseDefinition as any, derivedDefinition as any],
      templates: [],
      overrides
    });
    const derivedResolved = resolveEditableComponentLibraryDefinition({
      className: "DerivedPump",
      categoryLibraryName: "交流设备",
      customComponentLibraries: [baseDefinition as any, derivedDefinition as any],
      templates: [],
      overrides
    });

    expect(baseResolved?.metadata.terminalTypes).toEqual(["dc"]);
    expect(baseResolved?.metadata.terminalLabels).toEqual(["直流端"]);
    expect(derivedResolved?.metadata.terminalTypes).toEqual(["dc"]);
    expect(derivedResolved?.metadata.terminalLabels).toEqual(["直流端"]);
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

  test("materializes persisted class measurements for existing custom component nodes", () => {
    const classKey = componentLibraryDefinitionOverrideKey("CustomDevice4");
    const componentDefinition = {
      ...baseDefinition,
      name: "CustomDevice4",
      label: "CCC",
      terminalCount: 2,
      terminalTypes: ["ac", "ac"],
      terminalLabels: ["", ""],
      terminalRoles: ["single-load", "single-load"],
      terminalAssociations: ["ac-load", "ac-load"]
    } as const;
    const componentTemplate = {
      kind: "custom-CustomDevice4",
      label: "ABC",
      componentClass: "CustomDevice4",
      categoryLibrary: "交流设备",
      terminalType: "ac",
      terminalCount: 2,
      terminalTypes: ["ac", "ac"],
      terminalLabels: ["", ""],
      size: { width: 104, height: 64 },
      params: { component_type: "CustomDevice4" },
      custom: true
    } as DeviceTemplate;
    const overrides: Record<string, DeviceTemplateDefinitionOverride> = {
      [classKey]: {
        kind: classKey,
        measurementDefinitions: [{
          measurementTypeId: "activePower",
          name: "有功功率",
          position: "device",
          associatedField: "t1_node",
          defaultVisible: true
        }]
      }
    };
    const classProfiles = resolveComponentLibraryMeasurementProfiles({
      customComponentLibraries: [componentDefinition as any],
      templates: [componentTemplate],
      overrides
    });
    const runtimeConfig = mergeComponentLibraryMeasurementProfiles(
      normalizeMeasurementConfig({ deviceProfiles: [] }),
      classProfiles
    );
    const node = {
      id: "custom-device-4-node",
      kind: "custom-CustomDevice4",
      name: "ABC-9",
      position: { x: 100, y: 80 },
      size: { width: 104, height: 64 },
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      params: { component_type: "CustomDevice4" },
      terminals: [
        { id: "t1", type: "ac", anchor: { x: -0.5, y: 0 } },
        { id: "t2", type: "ac", anchor: { x: 0.5, y: 0 } }
      ]
    } as any;

    expect(classProfiles).toEqual([{
      deviceKind: "CustomDevice4",
      items: [expect.objectContaining({
        measurementTypeId: "activePower",
        associatedField: "t1_node"
      })]
    }]);
    const [group] = createDefaultMeasurementGroupsForNode(node, runtimeConfig);
    expect(group?.items).toEqual([
      expect.objectContaining({
        measurementTypeId: "activePower",
        labelOverride: "有功功率",
        sourcePoint: "custom-device-4-node.t1_node"
      })
    ]);
  });

  test("reconciles a restored model once when class profiles arrive after it", () => {
    const previousConfig = normalizeMeasurementConfig({ deviceProfiles: [] });
    const nextConfig = normalizeMeasurementConfig({
      deviceProfiles: [{
        deviceKind: "CustomDevice4",
        items: [{
          measurementTypeId: "activePower",
          name: "有功功率",
          position: "device",
          associatedField: "t1_node",
          defaultVisible: true
        }]
      }]
    });
    const node = {
      id: "custom-CustomDevice4-zuxm51x",
      kind: "custom-CustomDevice4",
      name: "ABC-9",
      position: { x: 1024, y: 642 },
      size: { width: 150, height: 92 },
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      params: { component_type: "CustomDevice4" },
      terminals: [
        { id: "t1", type: "ac", anchor: { x: -0.5, y: 0 } },
        { id: "t2", type: "ac", anchor: { x: 0.5, y: 0 } }
      ]
    } as any;
    const restoredMeasurements = { version: 1 as const, groups: [] };

    const reconciled = reconcileProjectMeasurementsForRuntimeConfigChange({
      measurements: restoredMeasurements,
      nodes: [node],
      previousConfig,
      nextConfig
    });

    expect(reconciled.groups).toEqual([expect.objectContaining({
      nodeId: node.id,
      items: [expect.objectContaining({
        measurementTypeId: "activePower",
        labelOverride: "有功功率",
        sourcePoint: `${node.id}.t1_node`
      })]
    })]);
    expect(reconcileProjectMeasurementsForRuntimeConfigChange({
      measurements: reconciled,
      nodes: [node],
      previousConfig: nextConfig,
      nextConfig
    })).toBe(reconciled);
  });

  test("materializes inherited measurements once for derived classes", () => {
    const baseKey = componentLibraryDefinitionOverrideKey("CustomDevice4");
    const derivedDefinition = {
      name: "CustomDevice5",
      label: "派生 CCC",
      categoryLibraryName: "交流设备",
      isDerivedComponentLibrary: true,
      derivedFromComponentLibrary: "CustomDevice4"
    } as const;
    const classProfiles = resolveComponentLibraryMeasurementProfiles({
      customComponentLibraries: [
        { ...baseDefinition, name: "CustomDevice4" } as any,
        derivedDefinition as any
      ],
      templates: [],
      overrides: {
        [baseKey]: {
          kind: baseKey,
          measurementDefinitions: [{
            measurementTypeId: "activePower",
            position: "device",
            associatedField: "t1_node"
          }]
        }
      }
    });

    expect(classProfiles.find((profile) => profile.deviceKind === "CustomDevice5")?.items).toEqual([{
      measurementTypeId: "activePower",
      position: "device",
      associatedField: "t1_node"
    }]);
  });
});

describe("component library recursion guard and definition key collision merge", () => {
  const recursionCategory = "交流设备";

  // 环与链的夹具都放在同一类别下，让 definitionKey 归一后的 recursionKey 稳定为
  // 类别键 + :: + 类名键，与源码里 `${definitionKey(category)}::${definitionKey(class)}` 一致。
  const chainRootDefinition = {
    name: "ChainRoot",
    label: "链根",
    categoryLibraryName: recursionCategory,
    isDerivedComponentLibrary: false,
    isContainerComponentLibrary: false,
    terminalCount: 1,
    terminalTypes: ["ac"],
    terminalLabels: ["交流端"],
    terminalRoles: ["single-load"],
    terminalAssociations: ["ac-load"]
  } as const;
  const chainMiddleDefinition = {
    name: "ChainMiddle",
    label: "链中",
    categoryLibraryName: recursionCategory,
    isDerivedComponentLibrary: true,
    derivedFromComponentLibrary: "ChainRoot"
  } as const;
  const chainLeafDefinition = {
    name: "ChainLeaf",
    label: "链叶",
    categoryLibraryName: recursionCategory,
    isDerivedComponentLibrary: true,
    derivedFromComponentLibrary: "ChainMiddle"
  } as const;
  const ringSelfDefinition = {
    name: "RingSelf",
    label: "自环",
    categoryLibraryName: recursionCategory,
    isDerivedComponentLibrary: true,
    derivedFromComponentLibrary: "RingSelf"
  } as const;
  const ringLeftDefinition = {
    name: "RingLeft",
    label: "环左",
    categoryLibraryName: recursionCategory,
    isDerivedComponentLibrary: true,
    derivedFromComponentLibrary: "RingRight"
  } as const;
  const ringRightDefinition = {
    name: "RingRight",
    label: "环右",
    categoryLibraryName: recursionCategory,
    isDerivedComponentLibrary: true,
    derivedFromComponentLibrary: "RingLeft"
  } as const;
  const mergeRootDefinition = {
    name: "MergeRoot",
    label: "合并根",
    categoryLibraryName: recursionCategory,
    isDerivedComponentLibrary: false,
    isContainerComponentLibrary: false,
    terminalCount: 1,
    terminalTypes: ["ac"],
    terminalLabels: ["交流端"],
    terminalRoles: ["single-load"],
    terminalAssociations: ["ac-load"]
  } as const;
  const mergeDerivedDefinition = {
    name: "MergeDerived",
    label: "合并派生",
    categoryLibraryName: recursionCategory,
    isDerivedComponentLibrary: true,
    derivedFromComponentLibrary: "MergeRoot"
  } as const;

  // as const 会把端子数组冻成 readonly，与 CustomComponentLibraryDefinition 要求的可变数组不兼容；
  // 这里沿用本文件既有的 as any 写法，只把夹具的形状交给被测函数，不参与类型检查。
  const chainLibraries = [chainRootDefinition, chainMiddleDefinition, chainLeafDefinition] as any;

  test("派生类把基类指向自己时立刻返回 null 而不栈溢出", () => {
    const startedAt = performance.now();
    const resolved = resolveEditableComponentLibraryDefinition({
      className: "RingSelf",
      categoryLibraryName: recursionCategory,
      customComponentLibraries: [ringSelfDefinition],
      templates: [],
      overrides: {}
    });
    const elapsedMs = performance.now() - startedAt;

    expect(resolved).toBeNull();
    // 这个上限不是性能基准，只是把「守卫被摘掉后的无限递归」变成一条红断言：
    // 真发生递归时要么直接抛栈溢出，要么远超 5s 挂住 worker。
    expect(elapsedMs).toBeLessThan(5_000);
  }, 5_000);

  test("互相派生的双向环两端都立刻返回 null", () => {
    const ringLibraries = [ringLeftDefinition, ringRightDefinition];
    const startedAt = performance.now();

    const fromLeft = resolveEditableComponentLibraryDefinition({
      className: "RingLeft",
      categoryLibraryName: recursionCategory,
      customComponentLibraries: ringLibraries,
      templates: [],
      overrides: {}
    });
    const fromRight = resolveEditableComponentLibraryDefinition({
      className: "RingRight",
      categoryLibraryName: recursionCategory,
      customComponentLibraries: ringLibraries,
      templates: [],
      overrides: {}
    });
    const elapsedMs = performance.now() - startedAt;

    expect(fromLeft).toBeNull();
    expect(fromRight).toBeNull();
    expect(elapsedMs).toBeLessThan(5_000);
  }, 5_000);

  test("环输入之后正常输入与环输入自身都能重复解析且结果稳定", () => {
    const ringOptions = {
      className: "RingLeft",
      categoryLibraryName: recursionCategory,
      customComponentLibraries: [ringLeftDefinition, ringRightDefinition],
      templates: [],
      overrides: {}
    };
    const leafOptions = {
      className: "ChainLeaf",
      categoryLibraryName: recursionCategory,
      customComponentLibraries: chainLibraries,
      templates: [],
      overrides: {}
    };

    expect(resolveEditableComponentLibraryDefinition(ringOptions)).toBeNull();

    const firstLeaf = resolveEditableComponentLibraryDefinition(leafOptions);
    expect(firstLeaf?.metadata.className).toBe("ChainLeaf");

    // resolving 是每次调用新建的集合：同一输入再解析一次必须与首次完全一致。
    // 若有人把它上提到模块级（或把 finally 里的 delete 摘掉），第二次会直接命中
    // 环守卫返回 null，这条断言就会变红。
    expect(resolveEditableComponentLibraryDefinition(leafOptions)).toEqual(firstLeaf);
    // 环输入重复调用依旧稳定为 null，不会因为前一次调用留下的状态而变形。
    expect(resolveEditableComponentLibraryDefinition(ringOptions)).toBeNull();
  });

  test("无环的三级派生链把根类与中间类的行一并折进叶类的有效定义", () => {
    const rootKey = componentLibraryDefinitionOverrideKey("ChainRoot");
    const middleKey = componentLibraryDefinitionOverrideKey("ChainMiddle");
    const leafKey = componentLibraryDefinitionOverrideKey("ChainLeaf");
    const overrides: Record<string, DeviceTemplateDefinitionOverride> = {
      [rootKey]: {
        kind: rootKey,
        parameterDefinitions: [
          { cnName: "根类专有", enName: "root_only", valueType: "float", typicalValue: "1" }
        ]
      },
      [middleKey]: {
        kind: middleKey,
        parameterDefinitions: [
          { cnName: "中间类专有", enName: "middle_only", valueType: "float", typicalValue: "2" }
        ]
      },
      [leafKey]: {
        kind: leafKey,
        parameterDefinitions: [
          { cnName: "叶类专有", enName: "leaf_only", valueType: "float", typicalValue: "3" }
        ]
      }
    };

    const leaf = resolveEditableComponentLibraryDefinition({
      className: "ChainLeaf",
      categoryLibraryName: recursionCategory,
      customComponentLibraries: chainLibraries,
      templates: [],
      overrides
    });

    expect(leaf?.metadata).toMatchObject({
      className: "ChainLeaf",
      isDerivedComponentLibrary: true,
      baseComponentLibrary: "ChainMiddle",
      // 端子信息一路从 ChainRoot 继承下来，跨两级仍然到达叶类
      terminalCount: 1,
      terminalTypes: ["ac"],
      terminalLabels: ["交流端"]
    });
    expect(leaf?.parameterDefinitions.map((row) => row.enName)).toEqual(["leaf_only"]);
    expect(leaf?.inheritedParameterDefinitions.map((row) => row.enName)).toEqual(expect.arrayContaining([
      "idx",
      "name",
      "run_stat",
      "dev_type",
      "node",
      "root_only",
      "middle_only"
    ]));
    expect(leaf?.inheritedParameterDefinitions.map((row) => row.enName)).not.toContain("leaf_only");
    expect(leaf?.effectiveParameterDefinitions.map((row) => row.enName)).toEqual(expect.arrayContaining([
      "root_only",
      "middle_only",
      "leaf_only"
    ]));
  });

  test("归一后撞键的两行合并成一行且名字字段取先写者、值字段取后写者", () => {
    // 用派生类当被测对象：派生类的 defaults 恒为 []，于是 mergeParameterDefinitions
    // 拿到的是空的 defaults，撞键逻辑被单独隔离出来，不受生成默认行干扰。
    const derivedKey = componentLibraryDefinitionOverrideKey("MergeDerived");
    const resolved = resolveEditableComponentLibraryDefinition({
      className: "MergeDerived",
      categoryLibraryName: recursionCategory,
      customComponentLibraries: [mergeRootDefinition, mergeDerivedDefinition] as any,
      templates: [],
      overrides: {
        [derivedKey]: {
          kind: derivedKey,
          parameterDefinitions: [
            {
              cnName: "额定功率",
              enName: "rated_power",
              valueType: "float",
              typicalValue: "10",
              readonly: false
            },
            {
              cnName: "被覆盖的额定功率",
              enName: "  RATED_power ",
              valueType: "string",
              typicalValue: "20",
              readonly: true
            }
          ]
        }
      }
    });

    // 只有一行：第二行的 key 归一后与第一行相同，走 rowIndexByKey 命中已有下标而不是 push
    expect(resolved?.parameterDefinitions).toHaveLength(1);
    const merged = resolved?.parameterDefinitions[0];
    // 先写者保住身份字段（合并时显式回填 generated 的 cnName / enName / readonly）
    expect(merged).toMatchObject({
      cnName: "额定功率",
      enName: "rated_power",
      readonly: false
    });
    // 后写者覆盖值字段
    expect(merged).toMatchObject({
      valueType: "string",
      typicalValue: "20"
    });
  });

  test("撞上生成默认行时保留默认行的名字字段而让持久化值字段胜出", () => {
    const baseKey = componentLibraryDefinitionOverrideKey("MergeRoot");
    const overrides: Record<string, DeviceTemplateDefinitionOverride> = {
      [baseKey]: {
        kind: baseKey,
        parameterDefinitions: [
          {
            cnName: "自定义设备类型",
            enName: "DEV_TYPE",
            valueType: "string",
            typicalValue: "MyType",
            readonly: true
          },
          {
            cnName: "自定义父级",
            enName: " Parent ",
            valueType: "stringEnum",
            typicalValue: "3",
            readonly: true
          }
        ]
      }
    };
    const resolved = resolveEditableComponentLibraryDefinition({
      className: "MergeRoot",
      categoryLibraryName: recursionCategory,
      customComponentLibraries: [mergeRootDefinition] as any,
      templates: [],
      overrides
    });

    const rows = resolved?.parameterDefinitions ?? [];
    // 单端类默认生成 7 行；两行撞上已有键，不会追加新行
    expect(rows.map((row) => row.enName)).toEqual([
      "idx",
      "name",
      "status",
      "run_stat",
      "parent",
      "dev_type",
      "node"
    ]);

    const devType = rows.find((row) => row.enName === "dev_type");
    // cnName 与 enName 由默认行保住（大小写/空白不同的覆盖名被丢弃）
    expect(devType).toMatchObject({ cnName: "设备类型", enName: "dev_type", typicalValue: "MyType" });

    const parent = rows.find((row) => row.enName === "parent");
    // 值字段由覆盖行胜出（默认的 numberEnum 被改成 stringEnum、typicalValue 被填上），
    // 覆盖行没写的字段（enumValueType / exportEnabled / exportName）仍取默认行；
    // 但 enumOptions / enumValues 被覆盖行的缺省值抹掉。
    expect(parent).toMatchObject({
      cnName: "所属模型",
      enName: "parent",
      valueType: "stringEnum",
      typicalValue: "3",
      enumValueType: "number",
      exportEnabled: true,
      exportName: "parent"
    });
    expect(parent?.enumOptions).toBeUndefined();
    expect(parent?.enumValues).toBeUndefined();
  });

  test("仅大小写与首尾空白不同的 name 归一到同一个键且空名整行丢弃", () => {
    const derivedKey = componentLibraryDefinitionOverrideKey("MergeDerived");
    const resolved = resolveEditableComponentLibraryDefinition({
      className: "MergeDerived",
      categoryLibraryName: recursionCategory,
      customComponentLibraries: [mergeRootDefinition, mergeDerivedDefinition] as any,
      templates: [],
      overrides: {
        [derivedKey]: {
          kind: derivedKey,
          parameterDefinitions: [
            { cnName: "额定功率", enName: "rated_power", valueType: "float", typicalValue: "10", readonly: false },
            { cnName: "大写同键", enName: "RATED_POWER", valueType: "integer", typicalValue: "20", readonly: true },
            { cnName: "带空白同键", enName: "\tRated_Power\n", valueType: "string", typicalValue: "30", readonly: true },
            { cnName: "纯空白名", enName: "   ", valueType: "float", typicalValue: "40" },
            { cnName: "空名", enName: "", valueType: "float", typicalValue: "50" }
          ]
        }
      }
    });

    const rows = resolved?.parameterDefinitions ?? [];
    // 三行同键归一为一行；两行空名因为 key 为空被 if (!key) continue 直接丢弃
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      enName: "rated_power",
      cnName: "额定功率",
      valueType: "string",
      typicalValue: "30"
    });
    expect(rows.map((row) => row.enName.trim().toLowerCase())).toEqual(["rated_power"]);
  });

  test("空类名、纯空白类名、缺省类名与未知类名一律返回 null", () => {
    const options = {
      categoryLibraryName: recursionCategory,
      customComponentLibraries: [chainRootDefinition] as any,
      templates: [],
      overrides: {}
    };

    expect(resolveEditableComponentLibraryDefinition({ ...options, className: "" })).toBeNull();
    expect(resolveEditableComponentLibraryDefinition({ ...options, className: "   " })).toBeNull();
    expect(resolveEditableComponentLibraryDefinition(options as any)).toBeNull();
    expect(resolveEditableComponentLibraryDefinition({ ...options, className: "NoSuchClass" })).toBeNull();
    expect(resolveEditableComponentLibraryDefinition({} as any)).toBeNull();
  });

  test("类名首尾空白在入口被裁掉且不影响与派生链无关的其它入参", () => {
    const padded = resolveEditableComponentLibraryDefinition({
      className: "  ChainRoot  ",
      categoryLibraryName: `  ${recursionCategory}  `,
      customComponentLibraries: chainLibraries,
      templates: [],
      overrides: {}
    });
    const plain = resolveEditableComponentLibraryDefinition({
      className: "ChainRoot",
      categoryLibraryName: recursionCategory,
      customComponentLibraries: chainLibraries,
      templates: [],
      overrides: {}
    });

    expect(padded).toEqual(plain);
    expect(padded?.metadata.className).toBe("ChainRoot");
  });
});

describe("component library 缺省入参与缺省字段的边界分支", () => {
  const branchCategory = "交流设备";
  const branchRootDefinition = {
    name: "BranchRoot",
    label: "支路根",
    categoryLibraryName: branchCategory,
    isDerivedComponentLibrary: false,
    isContainerComponentLibrary: false,
    terminalCount: 1,
    terminalTypes: ["ac"],
    terminalLabels: ["交流端"],
    terminalRoles: ["single-load"],
    terminalAssociations: ["ac-load"]
  } as const;
  const branchDerivedDefinition = {
    name: "BranchDerived",
    label: "支路派生",
    categoryLibraryName: branchCategory,
    isDerivedComponentLibrary: true,
    derivedFromComponentLibrary: "BranchRoot"
  } as const;
  const branchLibraries = [branchRootDefinition, branchDerivedDefinition] as any;

  const branchTemplate = (
    kind: string,
    measurementDefinitions: NonNullable<DeviceTemplate["measurementDefinitions"]>
  ) => ({
    kind,
    label: kind,
    componentClass: "BranchRoot",
    categoryLibrary: branchCategory,
    terminalType: "ac",
    terminalCount: 1,
    terminalTypes: ["ac"],
    terminalLabels: ["交流端"],
    size: { width: 80, height: 48 },
    params: { component_type: "BranchRoot" },
    measurementDefinitions
  }) as DeviceTemplate;

  test("override key 对缺省类名与纯空白类名返回空串而不是字符串 undefined", () => {
    // 断言值刻意不用最常见的真类名：这里要断的是「归一之后落成空串」，
    // 硬编码成某个类名的变异会立刻被抓到。
    expect(componentLibraryDefinitionOverrideKey(undefined as unknown as string)).toBe("");
    expect(componentLibraryDefinitionOverrideKey(null as unknown as string)).toBe("");
    expect(componentLibraryDefinitionOverrideKey("")).toBe("");
    expect(componentLibraryDefinitionOverrideKey("   ")).toBe("");
    // 反向对照：非空类名仍按「去首尾空白 + class: 前缀」产出，供上面几条有鉴别力。
    expect(componentLibraryDefinitionOverrideKey("  BranchRoot  ")).toBe("class:BranchRoot");
  });

  test("dev_type 典型值在类名缺省时落成空串而不是 undefined 文本", () => {
    // 直接调被测函数的原始形态：生产里的入口（resolveEditableComponentLibraryDefinition）
    // 早就把 className 归一成非空串，聚合入口永远看不到这里的 `?? ""`。
    const rows = buildComponentLibraryDefaultParameterDefinitions(
      undefined as unknown as string,
      ["ac"]
    );

    expect(rows.find((row) => row.enName === "dev_type")).toMatchObject({
      cnName: "设备类型",
      typicalValue: "",
      readonly: false
    });
    // 缺省类名不得被当成任一规范支路/三绕组类，否则端子字段会被重命名。
    expect(rows.map((row) => row.enName)).toEqual(expect.arrayContaining(["node"]));
    expect(rows.map((row) => row.enName)).not.toEqual(expect.arrayContaining(["i_node", "j_node", "k_node"]));
  });

  test("持久化行缺 enName 时按空键整行丢弃而不是落成字符串 undefined 键", () => {
    const derivedKey = componentLibraryDefinitionOverrideKey("BranchDerived");
    // enName 缺失的持久化行是真实脏数据形态（definitionKey 收到 nullish）。
    const overrides = {
      [derivedKey]: {
        kind: derivedKey,
        parameterDefinitions: [
          { cnName: "额定功率", enName: "rated_power", valueType: "float", typicalValue: "10" },
          { cnName: "缺英文名", enName: undefined, valueType: "float", typicalValue: "20" }
        ]
      }
    } as unknown as Record<string, DeviceTemplateDefinitionOverride>;

    const resolved = resolveEditableComponentLibraryDefinition({
      className: "BranchDerived",
      categoryLibraryName: branchCategory,
      customComponentLibraries: branchLibraries,
      templates: [],
      overrides
    });

    expect(resolved?.parameterDefinitions.map((row) => row.enName)).toEqual(["rated_power"]);
    expect(resolved?.parameterDefinitions).toHaveLength(1);
  });

  test("模板量测行缺 associatedField 与显式空串算同一条并被去重", () => {
    const templates = [
      branchTemplate("branch-a", [{ measurementTypeId: "p", position: "device", associatedField: "" }]),
      branchTemplate("branch-b", [{ measurementTypeId: "p", position: "device" }])
    ];

    const resolved = resolveEditableComponentLibraryDefinition({
      className: "BranchRoot",
      categoryLibraryName: branchCategory,
      customComponentLibraries: [branchRootDefinition] as any,
      templates,
      overrides: {}
    });

    // 去重键把「字段缺省」与「字段为空串」写成同一个 JSON 串。
    // 若去掉 associatedField 的空串兜底，JSON.stringify 会直接丢掉该键，
    // 两条量测行就不再相等，这里会得到两行。
    expect(resolved?.measurementDefinitions).toEqual([
      { measurementTypeId: "p", position: "device", associatedField: "" }
    ]);
  });

  test("派生类自带的空串 associatedField 量测行与继承的缺省行按同一条丢弃", () => {
    const rootKey = componentLibraryDefinitionOverrideKey("BranchRoot");
    const derivedKey = componentLibraryDefinitionOverrideKey("BranchDerived");
    const overrides = {
      [rootKey]: {
        kind: rootKey,
        measurementDefinitions: [{ measurementTypeId: "p", position: "device" }]
      },
      [derivedKey]: {
        kind: derivedKey,
        measurementDefinitions: [{ measurementTypeId: "p", position: "device", associatedField: "" }]
      }
    } as Record<string, DeviceTemplateDefinitionOverride>;

    const derived = resolveEditableComponentLibraryDefinition({
      className: "BranchDerived",
      categoryLibraryName: branchCategory,
      customComponentLibraries: branchLibraries,
      templates: [],
      overrides
    });

    expect(derived?.measurementDefinitions).toEqual([]);
    expect(derived?.inheritedMeasurementDefinitions).toHaveLength(1);
    expect(derived?.effectiveMeasurementDefinitions).toHaveLength(1);
  });

  test("量测档案解析缺省 customComponentLibraries 时返回空数组", () => {
    expect(resolveComponentLibraryMeasurementProfiles({})).toEqual([]);
    expect(resolveComponentLibraryMeasurementProfiles({ overrides: {} })).toEqual([]);
    // 非 class: 前缀的 override 不该凭空造出候选类
    expect(resolveComponentLibraryMeasurementProfiles({
      overrides: {
        "branch-a": {
          kind: "branch-a",
          measurementDefinitions: [{ measurementTypeId: "p", position: "device" }]
        }
      }
    })).toEqual([]);
    // 反向对照：显式给出类定义时才产出档案（证明上面三条不是因为守卫恒空）
    expect(resolveComponentLibraryMeasurementProfiles({
      customComponentLibraries: [branchRootDefinition] as any,
      overrides: {
        [componentLibraryDefinitionOverrideKey("BranchRoot")]: {
          kind: componentLibraryDefinitionOverrideKey("BranchRoot"),
          measurementDefinitions: [{ measurementTypeId: "activePower", position: "device", associatedField: "t1_node" }]
        }
      }
    })).toEqual([{
      deviceKind: "BranchRoot",
      items: [{ measurementTypeId: "activePower", position: "device", associatedField: "t1_node" }]
    }]);
  });

  test("量测档案解析缺省 templates 时按类定义产出档案", () => {
    const resolved = resolveComponentLibraryMeasurementProfiles({
      customComponentLibraries: [branchRootDefinition] as any
    });

    expect(resolved).toEqual([{ deviceKind: "BranchRoot", items: [] }]);
  });
});
