import { describe, expect, test } from "vitest";
import {
  DEVICE_LIBRARY,
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

  test("restores built-in class measurements hidden by historical empty shared overrides", () => {
    const cases = [
      ["ACGenerator", "ac-source", ["activePower", "reactivePower", "voltage", "frequency"]],
      ["ACBranch", "ac-line", ["activePower", "reactivePower", "current"]],
      ["ACTransformer", "ac-transformer", ["activePower", "reactivePower", "voltage", "current"]]
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
      "dev_type",
      "node",
      "pressure_set"
    ]);
    expect(resolved?.measurementDefinitions).toEqual(overrides[classKey].measurementDefinitions);
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
