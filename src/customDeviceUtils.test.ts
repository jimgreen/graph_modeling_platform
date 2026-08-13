import { describe, expect, test } from "vitest";

import { applyDeviceTemplateDefinitionOverride, DEVICE_LIBRARY, resolveEffectiveTemplateParameterDefinitions } from "./model";
import {
  createDefinitionDraftRows,
  createCustomDeviceDraftFromTemplate,
  customDefaultDefinitions,
  deviceDefinitionOverrideForTemplate,
  deviceDefinitionKeyForTemplate,
  deviceDefinitionSharedKeyForTemplate,
  deviceTemplatesShareParameterDefinitions,
  normalizeSharedDeviceDefinitionOverrides,
  resolveTemplateComponentLibrary,
  templateDerivedComponentLibraryInfo
} from "./customDeviceUtils";

const generationCases = [
  ["ac-wind-source", "交流设备", "ACGenerator", "ACWindGen"],
  ["dc-wind-source", "直流设备", "DCGenerator", "DCWindGen"],
  ["ac-pv-source", "交流设备", "ACGenerator", "ACPVGen"],
  ["dc-pv-source", "直流设备", "DCGenerator", "DCPVGen"],
  ["ac-thermal-source", "交流设备", "ACGenerator", "ACThermalGen"],
  ["dc-thermal-source", "直流设备", "DCGenerator", "DCThermalGen"],
  ["ac-diesel-source", "交流设备", "ACGenerator", "ACDieselGen"],
  ["dc-diesel-source", "直流设备", "DCGenerator", "DCDieselGen"],
  ["ac-hydro-source", "交流设备", "ACGenerator", "ACHydroGen"],
  ["dc-hydro-source", "直流设备", "DCGenerator", "DCHydroGen"],
  ["ac-nuclear-source", "交流设备", "ACGenerator", "ACNuclearGen"],
  ["dc-nuclear-source", "直流设备", "DCGenerator", "DCNuclearGen"],
  ["ac-storage", "交流设备", "ACGenerator", "ACStorageGen"],
  ["dc-storage", "直流设备", "DCGenerator", "DCStorageGen"]
] as const;

describe("electric generation device library classification", () => {
  test.each(generationCases)(
    "keeps %s in the base component library while exposing its derived class",
    (kind, categoryLibrary, componentLibrary, derivedComponentLibrary) => {
      const template = DEVICE_LIBRARY.find((item) => item.kind === kind);

      expect(template).toBeDefined();
      expect(template?.categoryLibrary).toBe(categoryLibrary);
      expect(resolveTemplateComponentLibrary(template!)).toBe(componentLibrary);
      expect(deviceDefinitionKeyForTemplate(template!)).toBe(componentLibrary);
      expect(templateDerivedComponentLibraryInfo(template!)).toMatchObject({
        componentLibrary,
        derivedComponentLibrary,
        baseComponentLibrary: componentLibrary
      });
    }
  );

  test("keeps ordinary source definition keys on the generator component libraries", () => {
    const acSource = DEVICE_LIBRARY.find((item) => item.kind === "ac-source");
    const dcSource = DEVICE_LIBRARY.find((item) => item.kind === "dc-source");

    expect(resolveTemplateComponentLibrary(acSource!)).toBe("ACGenerator");
    expect(deviceDefinitionKeyForTemplate(acSource!)).toBe("ACGenerator");
    expect(resolveTemplateComponentLibrary(dcSource!)).toBe("DCGenerator");
    expect(deviceDefinitionKeyForTemplate(dcSource!)).toBe("DCGenerator");
  });

  test("does not apply a base-class override to a derived generation template", () => {
    const template = DEVICE_LIBRARY.find((item) => item.kind === "ac-wind-source")!;
    const overrides = {
      ACGenerator: {
        kind: "ACGenerator",
        isDerivedComponentLibrary: false,
        derivedFromComponentLibrary: "",
        derivedComponentLibrary: "",
        derivedComponentLibraryLabel: "",
        parameterDefinitions: [
          { cnName: "序号", enName: "idx", valueType: "integer", typicalValue: "", readonly: true }
        ]
      }
    } as any;

    const override = deviceDefinitionOverrideForTemplate(template, overrides);
    const appliedTemplate = applyDeviceTemplateDefinitionOverride(template, override);

    expect(override).toBeUndefined();
    expect(templateDerivedComponentLibraryInfo(appliedTemplate)).toMatchObject({
      componentLibrary: "ACGenerator",
      derivedComponentLibrary: "ACWindGen"
    });
    expect(createCustomDeviceDraftFromTemplate(appliedTemplate).params.map((row) => row.enName)).toContain("wind_turbine_model");
  });

  test("keeps base and derived parameter-definition identities separate while sharing generated directions", () => {
    const base = DEVICE_LIBRARY.find((item) => item.kind === "ac-source")!;
    const derived = DEVICE_LIBRARY.find((item) => item.kind === "ac-wind-source")!;
    const derivedVertical = { ...derived, kind: "ac-wind-source-vertical" } as typeof derived;

    expect(deviceTemplatesShareParameterDefinitions(base, derived)).toBe(false);
    expect(deviceTemplatesShareParameterDefinitions(derived, derivedVertical)).toBe(true);
    expect(deviceDefinitionSharedKeyForTemplate(base)).not.toBe(deviceDefinitionSharedKeyForTemplate(derived));
    expect(deviceDefinitionSharedKeyForTemplate(derived)).toBe(deviceDefinitionSharedKeyForTemplate(derivedVertical));
  });

  test("normalizes base and derived definition tables independently", () => {
    const base = DEVICE_LIBRARY.find((item) => item.kind === "ac-source")!;
    const derived = DEVICE_LIBRARY.find((item) => item.kind === "ac-wind-source")!;
    const baseDefinitions = [
      { cnName: "基类字段", enName: "base_only", valueType: "float" as const, typicalValue: "1" }
    ];
    const derivedDefinitions = [
      { cnName: "派生字段", enName: "derived_only", valueType: "float" as const, typicalValue: "2" }
    ];
    const normalized = normalizeSharedDeviceDefinitionOverrides({
      [base.kind]: {
        kind: base.kind,
        parameterDefinitions: baseDefinitions,
        updatedAt: "2026-08-13T00:00:00.000Z"
      },
      [derived.kind]: {
        kind: derived.kind,
        parameterDefinitions: derivedDefinitions,
        updatedAt: "2026-08-13T00:01:00.000Z"
      }
    }, DEVICE_LIBRARY);

    expect(deviceDefinitionOverrideForTemplate(base, normalized)?.parameterDefinitions).toEqual(baseDefinitions);
    expect(deviceDefinitionOverrideForTemplate(derived, normalized)?.parameterDefinitions).toEqual(derivedDefinitions);
  });

  test("does not merge distinct device classes that only share an E section", () => {
    const capacitor = DEVICE_LIBRARY.find((item) => item.kind === "ac-capacitor")!;
    const reactor = DEVICE_LIBRARY.find((item) => item.kind === "ac-reactor")!;

    expect(resolveTemplateComponentLibrary(capacitor)).toBe("ACCompensator");
    expect(resolveTemplateComponentLibrary(reactor)).toBe("ACCompensator");
    expect(deviceTemplatesShareParameterDefinitions(capacitor, reactor)).toBe(false);
  });

  test("migrates the newest split DCDC definitions to one shared table and preserves variant visuals", () => {
    const horizontal = DEVICE_LIBRARY.find((item) => item.kind === "dcdc-converter")!;
    const vertical = DEVICE_LIBRARY.find((item) => item.kind === "dcdc-converter-vertical")!;
    const horizontalDefinitions = [
      { cnName: "首端有功", enName: "i_p", valueType: "float" as const, typicalValue: "0" }
    ];
    const verticalDefinitions = [
      { cnName: "旧有功", enName: "p", valueType: "float" as const, typicalValue: "0" }
    ];
    const normalized = normalizeSharedDeviceDefinitionOverrides({
      [horizontal.kind]: {
        kind: horizontal.kind,
        params: { backgroundImage: "horizontal.svg", i_p: "0" },
        size: { width: 150, height: 88 },
        parameterDefinitions: horizontalDefinitions,
        measurementDefinitions: [{ measurementTypeId: "activePower", associatedField: "i_p" }],
        updatedAt: "2026-08-12T16:49:15.722Z"
      },
      [vertical.kind]: {
        kind: vertical.kind,
        params: { backgroundImage: "vertical.svg", p: "0" },
        size: { width: 88, height: 150 },
        parameterDefinitions: verticalDefinitions,
        measurementDefinitions: [{ measurementTypeId: "activePower", associatedField: "p" }],
        updatedAt: "2026-08-12T16:48:53.901Z"
      }
    }, DEVICE_LIBRARY);
    const horizontalOverride = deviceDefinitionOverrideForTemplate(horizontal, normalized)!;
    const verticalOverride = deviceDefinitionOverrideForTemplate(vertical, normalized)!;

    expect(horizontalOverride.parameterDefinitions).toEqual(horizontalDefinitions);
    expect(verticalOverride.parameterDefinitions).toEqual(horizontalDefinitions);
    expect(horizontalOverride.measurementDefinitions).toEqual([
      { measurementTypeId: "activePower", associatedField: "i_p" }
    ]);
    expect(verticalOverride.measurementDefinitions).toEqual(horizontalOverride.measurementDefinitions);
    expect(horizontalOverride.params?.backgroundImage).toBe("horizontal.svg");
    expect(verticalOverride.params?.backgroundImage).toBe("vertical.svg");
    expect(horizontalOverride.size).toEqual({ width: 150, height: 88 });
    expect(verticalOverride.size).toEqual({ width: 88, height: 150 });
    expect(normalized[horizontal.kind].parameterDefinitions).toBeUndefined();
    expect(normalized[vertical.kind].measurementDefinitions).toBeUndefined();
  });

  test("defaults dev_type to the current component english name", () => {
    const template = DEVICE_LIBRARY.find((item) => item.kind === "ac-load");
    const draft = createCustomDeviceDraftFromTemplate(template!);
    const devTypeRow = draft.params.find((row) => row.enName === "dev_type");

    expect(devTypeRow).toBeDefined();
    expect(devTypeRow?.typicalValue).toBe(template?.kind);
  });

  test("keeps every built-in business definition effective after an unmarked empty shared override", () => {
    for (const template of DEVICE_LIBRARY) {
      const declaredDefinitions = resolveEffectiveTemplateParameterDefinitions(template, DEVICE_LIBRARY);
      if (template.custom || declaredDefinitions.length === 0) continue;

      const sharedKey = deviceDefinitionSharedKeyForTemplate(template);
      const normalized = normalizeSharedDeviceDefinitionOverrides({
        [sharedKey]: {
          kind: sharedKey,
          parameterDefinitions: [],
          updatedAt: "2026-08-13T00:00:00.000Z"
        }
      }, DEVICE_LIBRARY);
      const applied = applyDeviceTemplateDefinitionOverride(
        template,
        deviceDefinitionOverrideForTemplate(template, normalized)
      );
      const effectiveNames = new Set(
        resolveEffectiveTemplateParameterDefinitions(applied, DEVICE_LIBRARY).map((definition) => definition.enName)
      );

      for (const definition of declaredDefinitions) {
        expect(effectiveNames.has(definition.enName), `${template.kind}.${definition.enName}`).toBe(true);
      }
    }
  });

  test("keeps explicit delete-all while dropping stale markers on non-empty tables", () => {
    const template = DEVICE_LIBRARY.find((item) => item.kind === "ac-wind-source")!;
    const sharedKey = deviceDefinitionSharedKeyForTemplate(template);
    const explicitlyEmpty = normalizeSharedDeviceDefinitionOverrides({
      [sharedKey]: {
        kind: sharedKey,
        parameterDefinitions: [],
        parameterDefinitionsIntent: "delete-all"
      }
    }, DEVICE_LIBRARY);
    const explicitTemplate = applyDeviceTemplateDefinitionOverride(
      template,
      deviceDefinitionOverrideForTemplate(template, explicitlyEmpty)
    );
    expect(resolveEffectiveTemplateParameterDefinitions(explicitTemplate, DEVICE_LIBRARY)).toEqual([]);

    const nonEmpty = normalizeSharedDeviceDefinitionOverrides({
      [sharedKey]: {
        kind: sharedKey,
        parameterDefinitions: [{ cnName: "风机型号", enName: "wind_turbine_model", valueType: "string", typicalValue: "" }],
        parameterDefinitionsIntent: "delete-all"
      }
    }, DEVICE_LIBRARY);
    expect(nonEmpty[sharedKey].parameterDefinitionsIntent).toBeUndefined();
  });

  test("shows only derived-specific parameters when editing a derived generation device", () => {
    const template = DEVICE_LIBRARY.find((item) => item.kind === "ac-wind-source");
    const draft = createCustomDeviceDraftFromTemplate(template!);
    const fieldNames = draft.params.map((row) => row.enName);

    expect(draft.isDerivedComponentLibrary).toBe(true);
    expect(fieldNames).toEqual([
      "wind_turbine_model",
      "cut_in_wind_speed",
      "rated_wind_speed",
      "cut_out_wind_speed",
      "rotor_diameter",
      "hub_height"
    ]);
    expect(fieldNames).not.toEqual(expect.arrayContaining([
      "idx",
      "name",
      "status",
      "run_stat",
      "source_type",
      "rated_power",
      "rated_voltage",
      "node",
      "control_type",
      "p_set"
    ]));
    expect(fieldNames).not.toContain("unit_rated_power");
    expect(draft.params.every((row) => row.exportEnabled === true)).toBe(true);
    expect(draft.params.map((row) => row.exportName)).toEqual(fieldNames);
  });

  test("keeps the device definition parameter table limited to derived-specific parameters", () => {
    const template = DEVICE_LIBRARY.find((item) => item.kind === "ac-hydro-source");
    const rows = createDefinitionDraftRows(template!);
    const fieldNames = rows.map((row) => row.enName);

    expect(fieldNames).toEqual([
      "hydro_unit_model",
      "turbine_type",
      "design_head",
      "design_flow",
      "rated_speed",
      "generator_efficiency"
    ]);
    expect(fieldNames).not.toEqual(expect.arrayContaining([
      "idx",
      "name",
      "dev_type",
      "status",
      "run_stat",
      "source_type",
      "rated_power",
      "rated_voltage",
      "node",
      "control_type",
      "p_set"
    ]));
  });

  test("does not inject base default rows into derived component parameter tables", () => {
    const rows = customDefaultDefinitions(["ac"], { isDerivedComponentLibrary: true } as any);

    expect(rows).toEqual([]);
  });

  test.each([
    [["ac", "ac"], ["i_node", "j_node"]],
    [["dc", "dc"], ["i_node", "j_node"]],
    [["ac", "dc"], ["ac_node", "dc_node"]],
    [["heat", "heat", "heat"], ["node1", "node2", "node3"]]
  ] as const)(
    "does not inject terminal defaults for %j when existing node definitions already cover every terminal",
    (terminalTypes, existingNodeNames) => {
      const rows = customDefaultDefinitions([...terminalTypes], {
        existingDefinitions: existingNodeNames.map((enName) => ({ enName }))
      } as any);

      expect(rows.map((row) => row.enName)).toEqual(["idx", "name", "status", "run_stat"]);
    }
  );

  test("keeps generated terminal defaults when existing node definitions are incomplete", () => {
    const rows = customDefaultDefinitions(["ac", "ac"], {
      existingDefinitions: [{ enName: "i_node" }]
    } as any);

    expect(rows.map((row) => row.enName)).toEqual([
      "idx",
      "name",
      "status",
      "run_stat",
      "t1_node",
      "t2_node"
    ]);
  });

  test("restores custom derived component library metadata into the editable draft", () => {
    const template = {
      kind: "custom-user-wind",
      label: "用户风电机组",
      categoryLibrary: "交流设备",
      size: { width: 96, height: 64 },
      params: {
        component_type: "UserWindGen",
        derived_from_component_type: "ACGenerator",
        derived_component_library_label: "用户风电"
      },
      terminalType: "ac",
      terminalCount: 1,
      terminalTypes: ["ac"],
      isContainer: false,
      isDerivedComponentLibrary: true,
      derivedFromComponentLibrary: "ACGenerator",
      derivedComponentLibraryLabel: "用户风电",
      parameterDefinitions: [
        { cnName: "序号", enName: "idx", valueType: "integer", typicalValue: "", readonly: true },
        { cnName: "名称", enName: "name", valueType: "string", typicalValue: "", readonly: true },
        { cnName: "有功设定", enName: "p_set", valueType: "float", typicalValue: "0", exportEnabled: true, exportName: "p_set" },
        { cnName: "装机容量", enName: "installedCapacity", valueType: "float", typicalValue: "120", exportEnabled: true, exportName: "installed_capacity" }
      ],
      custom: true
    } as any;

    expect(resolveTemplateComponentLibrary(template)).toBe("ACGenerator");
    expect(templateDerivedComponentLibraryInfo(template)).toMatchObject({
      componentLibrary: "ACGenerator",
      derivedComponentLibrary: "UserWindGen",
      label: "用户风电",
      categoryLibrary: "交流设备",
      baseComponentLibrary: "ACGenerator",
      isContainer: false
    });

    const draft = createCustomDeviceDraftFromTemplate(template);
    expect(draft.isDerivedComponentLibrary).toBe(true);
    expect(draft.componentLibrary).toBe("ACGenerator");
    expect(draft.derivedFromComponentLibrary).toBe("ACGenerator");
    expect(draft.derivedComponentLibrary).toBe("UserWindGen");
    expect(draft.derivedComponentLibraryLabel).toBe("用户风电");
    expect(draft.isContainer).toBe(false);
    expect(draft.params.map((row) => row.enName)).toEqual(["installedCapacity"]);
    expect(draft.params[0]).toMatchObject({
      cnName: "装机容量",
      exportEnabled: true,
      exportName: "installed_capacity"
    });
  });

  test("infers legacy derived metadata when the explicit derived flag is missing", () => {
    const template = {
      kind: "custom-legacy-wind",
      label: "旧版风电机组",
      categoryLibrary: "交流设备",
      size: { width: 96, height: 64 },
      params: {
        component_type: "UserWindGen",
        derived_from_component_type: "ACGenerator",
        derived_component_library_label: "用户风电"
      },
      terminalType: "ac",
      terminalCount: 1,
      terminalTypes: ["ac"],
      isContainer: true,
      custom: true
    } as any;

    expect(resolveTemplateComponentLibrary(template)).toBe("ACGenerator");
    expect(templateDerivedComponentLibraryInfo(template)).toMatchObject({
      componentLibrary: "ACGenerator",
      derivedComponentLibrary: "UserWindGen",
      label: "用户风电",
      baseComponentLibrary: "ACGenerator"
    });
  });
});
