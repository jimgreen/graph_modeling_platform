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
