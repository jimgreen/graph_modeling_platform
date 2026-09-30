import { describe, expect, test } from "vitest";

import { applyDeviceTemplateDefinitionOverride, buildContainerDeviceParameterViews, DEVICE_LIBRARY, resolveEffectiveTemplateParameterDefinitions } from "./model";
import {
  constrainPointToOrthogonalAxis,
  createDefinitionDraftRows,
  createCustomDeviceDraftFromTemplate,
  customDefaultDefinitions,
  customDeviceTerminalAnchorKey,
  deviceDefinitionOverrideForTemplate,
  deviceDefinitionKeyForTemplate,
  deviceDefinitionSharedKeyForTemplate,
  deviceTemplatesShareParameterDefinitions,
  isConcreteDeviceDefinitionParamName,
  migrateSharedDeviceDefinitionOverrideForTemplateChange,
  normalizeCustomDeviceTerminalAnchorCoordinate,
  normalizeDeviceDefinitionOwnership,
  normalizeSharedDeviceDefinitionOverrides,
  primaryOrthogonalAxis,
  removeDeviceTemplateDefinitionOverrides,
  resolveTemplateComponentLibrary,
  templateDerivedComponentLibraryInfo
} from "./customDeviceUtils";
import {
  DEVICE_DEFINITION_VISUAL_PARAM_KEYS,
  DEVICE_INSTANCE_GRAPH_PARAM_KEYS
} from "./deviceVisualParams";

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
  test("uses the shared visual ownership registry without capturing instance transforms", () => {
    for (const key of DEVICE_DEFINITION_VISUAL_PARAM_KEYS) {
      expect(isConcreteDeviceDefinitionParamName(key), key).toBe(true);
    }
    for (const key of DEVICE_INSTANCE_GRAPH_PARAM_KEYS) {
      expect(isConcreteDeviceDefinitionParamName(key), key).toBe(false);
    }
    expect(isConcreteDeviceDefinitionParamName("buttonTargetLayerId")).toBe(true);
    expect(isConcreteDeviceDefinitionParamName("rated_capacity")).toBe(false);
  });

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

  test.each([
    ["ac-source", "ACGenerator"],
    ["dc-source", "DCGenerator"]
  ] as const)("keeps built-in %s in its canonical class after a polluted shared override", (kind, expectedClass) => {
    const template = DEVICE_LIBRARY.find((item) => item.kind === kind)!;
    const sharedKey = deviceDefinitionSharedKeyForTemplate(template);
    const effectiveTemplate = applyDeviceTemplateDefinitionOverride(
      template,
      deviceDefinitionOverrideForTemplate(template, {
        [sharedKey]: {
          kind: sharedKey,
          params: {
            component_type: "ACRealBs",
            derived_from_component_type: "ACRealBs",
            derived_component_type: "WrongDerivedBus",
            derived_component_library_label: "错误派生母线",
            is_derived_component_library: "1",
            rated_capacity: "10"
          }
        }
      }, DEVICE_LIBRARY)
    );

    expect(templateDerivedComponentLibraryInfo(effectiveTemplate)).toBeNull();
    expect(resolveTemplateComponentLibrary(effectiveTemplate)).toBe(expectedClass);
    expect(deviceDefinitionKeyForTemplate(effectiveTemplate)).toBe(expectedClass);
    expect(effectiveTemplate.params.rated_capacity).toBe("10");
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

  test("applies a base-class terminal energy override to base and derived concrete templates", () => {
    const base = DEVICE_LIBRARY.find((item) => item.kind === "ac-source")!;
    const derived = DEVICE_LIBRARY.find((item) => item.kind === "ac-wind-source")!;
    const overrides = {
      "class:ACGenerator": {
        kind: "class:ACGenerator",
        terminalType: "dc",
        terminalCount: 1,
        terminalTypes: ["dc"],
        terminalLabels: ["直流端"]
      }
    } as any;

    const effectiveBase = applyDeviceTemplateDefinitionOverride(
      base,
      deviceDefinitionOverrideForTemplate(base, overrides, DEVICE_LIBRARY)
    );
    const effectiveDerived = applyDeviceTemplateDefinitionOverride(
      derived,
      deviceDefinitionOverrideForTemplate(derived, overrides, DEVICE_LIBRARY)
    );

    expect(effectiveBase.terminalTypes).toEqual(["dc"]);
    expect(effectiveBase.terminalLabels).toEqual(["直流端"]);
    expect(effectiveDerived.terminalTypes).toEqual(["dc"]);
    expect(effectiveDerived.terminalLabels).toEqual(["直流端"]);
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
    expect(normalized[horizontal.kind].params?.i_p).toBeUndefined();
    expect(normalized[vertical.kind].params?.p).toBeUndefined();
  });

  test("migrates legacy custom business definitions to the owning class and leaves concrete graphics visual-only", () => {
    const parameterDefinitions = [
      { cnName: "工作状态", enName: "run_stat", valueType: "numberEnum" as const, typicalValue: "1" },
      { cnName: "有功值", enName: "p", valueType: "float" as const, typicalValue: "2" }
    ];
    const measurementDefinitions = [
      { measurementTypeId: "activePower", associatedField: "p", defaultVisible: true }
    ];
    const horizontal = {
      kind: "custom-demo-source",
      label: "自定义电源",
      categoryLibrary: "交流设备",
      size: { width: 104, height: 64 },
      params: {
        component_type: "DemoSource",
        run_stat: "1",
        p: "2",
        backgroundImage: "horizontal.svg"
      },
      terminalType: "ac" as const,
      terminalCount: 1,
      terminalAnchors: [{ x: 0.5, y: 0 }],
      custom: true,
      parameterDefinitions,
      measurementDefinitions
    };
    const vertical = {
      ...horizontal,
      kind: "custom-demo-source-vertical",
      size: { width: 64, height: 104 },
      params: {
        ...horizontal.params,
        backgroundImage: "vertical.svg"
      },
      terminalAnchors: [{ x: 0, y: 0.5 }]
    };

    const normalized = normalizeDeviceDefinitionOwnership([horizontal, vertical], {});
    const sharedKey = deviceDefinitionSharedKeyForTemplate(horizontal);

    expect(normalized.deviceDefinitionSharedKeys).toMatchObject({
      [horizontal.kind]: sharedKey,
      [vertical.kind]: sharedKey
    });
    expect(normalized.deviceDefinitionOverrides[sharedKey]).toMatchObject({
      kind: sharedKey,
      params: { component_type: "DemoSource", run_stat: "1", p: "2" },
      parameterDefinitions,
      measurementDefinitions
    });
    for (const template of normalized.customDeviceTemplates) {
      expect(template.parameterDefinitions).toBeUndefined();
      expect(template.measurementDefinitions).toBeUndefined();
      expect(template.params.run_stat).toBeUndefined();
      expect(template.params.p).toBeUndefined();
      expect(template.params.backgroundImage).toMatch(/^(?:horizontal|vertical)\.svg$/u);
    }
    const resolvedHorizontal = applyDeviceTemplateDefinitionOverride(
      normalized.customDeviceTemplates[0],
      deviceDefinitionOverrideForTemplate(
        normalized.customDeviceTemplates[0],
        normalized.deviceDefinitionOverrides,
        normalized.customDeviceTemplates
      )
    );
    const resolvedVertical = applyDeviceTemplateDefinitionOverride(
      normalized.customDeviceTemplates[1],
      deviceDefinitionOverrideForTemplate(
        normalized.customDeviceTemplates[1],
        normalized.deviceDefinitionOverrides,
        normalized.customDeviceTemplates
      )
    );
    expect(resolvedHorizontal.parameterDefinitions?.map((row) => row.enName)).toEqual(["run_stat", "p"]);
    expect(resolvedVertical.parameterDefinitions?.map((row) => row.enName)).toEqual(["run_stat", "p"]);
    expect(resolvedHorizontal.measurementDefinitions).toEqual(measurementDefinitions);
    expect(resolvedVertical.measurementDefinitions).toEqual(measurementDefinitions);
    expect(resolvedHorizontal.params.backgroundImage).toBe("horizontal.svg");
    expect(resolvedVertical.params.backgroundImage).toBe("vertical.svg");
  });

  test("moves a legacy concrete business default into an existing shared class definition", () => {
    const template = {
      kind: "custom-shared-default",
      label: "共享默认值设备",
      categoryLibrary: "交流设备",
      size: { width: 104, height: 64 },
      params: {
        component_type: "SharedDefaultDevice",
        p_set: "12",
        backgroundImage: "shared-default.svg"
      },
      terminalType: "ac" as const,
      terminalCount: 1,
      custom: true
    };
    const sharedKey = deviceDefinitionSharedKeyForTemplate(template);
    const normalized = normalizeDeviceDefinitionOwnership([template], {
      [sharedKey]: {
        kind: sharedKey,
        params: { component_type: "SharedDefaultDevice" },
        parameterDefinitions: [{
          cnName: "有功设定值",
          enName: "p_set",
          valueType: "float",
          typicalValue: "0"
        }]
      }
    });

    expect(normalized.customDeviceTemplates[0].params.p_set).toBeUndefined();
    expect(normalized.customDeviceTemplates[0].params.backgroundImage).toBe("shared-default.svg");
    expect(normalized.deviceDefinitionOverrides[sharedKey]).toMatchObject({
      kind: sharedKey,
      params: {
        component_type: "SharedDefaultDevice",
        p_set: "12"
      },
      parameterDefinitions: [{ enName: "p_set" }]
    });
  });

  test("creates the shared class when a legacy concrete graphic only contains a business default", () => {
    const template = {
      kind: "custom-shared-default-only",
      label: "仅默认值设备",
      categoryLibrary: "交流设备",
      size: { width: 104, height: 64 },
      params: {
        component_type: "SharedDefaultOnlyDevice",
        p_set: "24",
        backgroundImage: "shared-default-only.svg"
      },
      terminalType: "ac" as const,
      terminalCount: 1,
      custom: true
    };
    const sharedKey = deviceDefinitionSharedKeyForTemplate(template);
    const normalized = normalizeDeviceDefinitionOwnership([template], {});

    expect(normalized.customDeviceTemplates[0].params.p_set).toBeUndefined();
    expect(normalized.deviceDefinitionOverrides[sharedKey]).toMatchObject({
      kind: sharedKey,
      params: {
        component_type: "SharedDefaultOnlyDevice",
        p_set: "24"
      }
    });
  });

  test("moves a definition-free built-in concrete default into its shared class", () => {
    const template = DEVICE_LIBRARY.find((item) => item.kind === "ac-source")!;
    const sharedKey = deviceDefinitionSharedKeyForTemplate(template);
    const normalized = normalizeSharedDeviceDefinitionOverrides({
      [template.kind]: {
        kind: template.kind,
        params: {
          backgroundImage: "legacy-source.svg",
          p_set: "36"
        }
      }
    }, DEVICE_LIBRARY);

    expect(normalized[template.kind].params?.p_set).toBeUndefined();
    expect(normalized[template.kind].params?.backgroundImage).toBe("legacy-source.svg");
    expect(normalized[sharedKey]).toMatchObject({
      kind: sharedKey,
      params: { p_set: "36" }
    });
    expect(deviceDefinitionOverrideForTemplate(template, normalized, DEVICE_LIBRARY)?.params?.p_set).toBe("36");
  });

  test("keeps derived custom classes isolated while sharing directional variants", () => {
    const base = {
      kind: "custom-source",
      label: "自定义电源",
      categoryLibrary: "交流设备",
      size: { width: 104, height: 64 },
      params: { component_type: "CustomSource", base_only: "1" },
      terminalType: "ac" as const,
      terminalCount: 1,
      custom: true,
      parameterDefinitions: [
        { cnName: "基类字段", enName: "base_only", valueType: "float" as const, typicalValue: "1" }
      ]
    };
    const derived = {
      ...base,
      kind: "custom-wind-source",
      label: "自定义风电",
      params: {
        component_type: "CustomSource",
        derived_from_component_type: "CustomSource",
        derived_component_type: "CustomWindSource",
        is_derived_component_library: "1",
        derived_only: "2"
      },
      isDerivedComponentLibrary: true,
      derivedFromComponentLibrary: "CustomSource",
      derivedComponentLibrary: "CustomWindSource",
      parameterDefinitions: [
        { cnName: "派生字段", enName: "derived_only", valueType: "float" as const, typicalValue: "2" }
      ]
    };
    const derivedVertical = { ...derived, kind: "custom-wind-source-vertical" };

    const normalized = normalizeDeviceDefinitionOwnership([base, derived, derivedVertical], {});
    const baseKey = normalized.deviceDefinitionSharedKeys[base.kind];
    const derivedKey = normalized.deviceDefinitionSharedKeys[derived.kind];

    expect(baseKey).not.toBe(derivedKey);
    expect(normalized.deviceDefinitionSharedKeys[derivedVertical.kind]).toBe(derivedKey);
    expect(normalized.deviceDefinitionOverrides[baseKey].parameterDefinitions?.map((row) => row.enName)).toEqual(["base_only"]);
    expect(normalized.deviceDefinitionOverrides[derivedKey].parameterDefinitions?.map((row) => row.enName)).toEqual(["derived_only"]);
  });

  test("keeps an existing shared table ahead of stale concrete tables regardless of timestamps", () => {
    const template = DEVICE_LIBRARY.find((item) => item.kind === "dcdc-converter")!;
    const sharedKey = deviceDefinitionSharedKeyForTemplate(template);
    const normalized = normalizeSharedDeviceDefinitionOverrides({
      [sharedKey]: {
        kind: sharedKey,
        params: { i_p: "10" },
        parameterDefinitions: [{ cnName: "共享有功", enName: "i_p", valueType: "float", typicalValue: "10" }],
        measurementDefinitions: [{ measurementTypeId: "activePower", associatedField: "i_p" }],
        updatedAt: "2026-08-13T00:00:00.000Z"
      },
      [template.kind]: {
        kind: template.kind,
        params: { i_p: "99", backgroundImage: "stale.svg" },
        parameterDefinitions: [{ cnName: "旧有功", enName: "i_p", valueType: "float", typicalValue: "99" }],
        measurementDefinitions: [{ measurementTypeId: "current", associatedField: "i_i" }],
        updatedAt: "2026-08-14T00:00:00.000Z"
      }
    }, DEVICE_LIBRARY);

    expect(normalized[sharedKey]).toMatchObject({
      params: { i_p: "10" },
      parameterDefinitions: [{ cnName: "共享有功" }],
      measurementDefinitions: [{ measurementTypeId: "activePower" }]
    });
    expect(normalized[template.kind].params).toEqual({ backgroundImage: "stale.svg" });
  });

  test("preserves an explicit shared delete-all table", () => {
    const template = DEVICE_LIBRARY.find((item) => item.kind === "dcdc-converter")!;
    const sharedKey = deviceDefinitionSharedKeyForTemplate(template);
    const normalized = normalizeSharedDeviceDefinitionOverrides({
      [sharedKey]: {
        kind: sharedKey,
        parameterDefinitions: [],
        parameterDefinitionsIntent: "delete-all"
      },
      [template.kind]: {
        kind: template.kind,
        parameterDefinitions: [{ cnName: "旧有功", enName: "i_p", valueType: "float", typicalValue: "99" }]
      }
    }, DEVICE_LIBRARY);

    expect(normalized[sharedKey]).toMatchObject({
      parameterDefinitions: [],
      parameterDefinitionsIntent: "delete-all"
    });
  });

  test("moves a custom class definition when its component library is renamed", () => {
    const previous = {
      kind: "custom-demo",
      label: "示例",
      categoryLibrary: "交流设备",
      size: { width: 80, height: 48 },
      params: { component_type: "OldClass", backgroundImage: "demo.svg" },
      terminalType: "ac" as const,
      terminalCount: 1,
      custom: true
    };
    const nextTemplate = { ...previous, params: { ...previous.params, component_type: "NewClass" } };
    const previousKey = deviceDefinitionSharedKeyForTemplate(previous);
    const nextKey = deviceDefinitionSharedKeyForTemplate(nextTemplate);
    const normalized = migrateSharedDeviceDefinitionOverrideForTemplateChange({
      [previousKey]: {
        kind: previousKey,
        params: { component_type: "OldClass", p: "1" },
        parameterDefinitions: [{ cnName: "有功", enName: "p", valueType: "float", typicalValue: "1" }]
      }
    }, previous, nextTemplate, [nextTemplate]);

    expect(normalized[previousKey]).toBeUndefined();
    expect(normalized[nextKey]).toMatchObject({
      kind: nextKey,
      params: { component_type: "NewClass", p: "1" },
      parameterDefinitions: [{ enName: "p" }]
    });
  });

  test("keeps a shared class after every concrete graphic is removed", () => {
    const horizontal = {
      kind: "custom-demo",
      label: "示例",
      categoryLibrary: "交流设备",
      size: { width: 80, height: 48 },
      params: { component_type: "DemoClass" },
      terminalType: "ac" as const,
      terminalCount: 1,
      custom: true
    };
    const vertical = { ...horizontal, kind: "custom-demo-vertical" };
    const sharedKey = deviceDefinitionSharedKeyForTemplate(horizontal);
    const overrides = {
      [sharedKey]: {
        kind: sharedKey,
        params: { p: "1" },
        parameterDefinitions: [{ cnName: "有功", enName: "p", valueType: "float" as const, typicalValue: "1" }],
        measurementDefinitions: [{ measurementTypeId: "activePower", associatedField: "p" }]
      }
    };

    const oneRemoved = removeDeviceTemplateDefinitionOverrides(overrides, [horizontal], [vertical]);
    expect(oneRemoved[sharedKey]).toBeDefined();
    const allRemoved = removeDeviceTemplateDefinitionOverrides(oneRemoved, [vertical], []);
    expect(allRemoved[sharedKey]).toMatchObject({
      kind: sharedKey,
      params: { p: "1" },
      parameterDefinitions: overrides[sharedKey].parameterDefinitions,
      measurementDefinitions: overrides[sharedKey].measurementDefinitions
    });
  });

  test("keeps every built-in business definition available after an accidental empty shared override", () => {
    for (const template of DEVICE_LIBRARY) {
      const builtIn = resolveEffectiveTemplateParameterDefinitions(template, DEVICE_LIBRARY);
      if (builtIn.length === 0) continue;
      const sharedKey = deviceDefinitionSharedKeyForTemplate(template);
      const resolved = applyDeviceTemplateDefinitionOverride(template, deviceDefinitionOverrideForTemplate(template, {
        [sharedKey]: { kind: sharedKey, parameterDefinitions: [] }
      }, DEVICE_LIBRARY));
      expect(resolveEffectiveTemplateParameterDefinitions(resolved, DEVICE_LIBRARY).length, template.kind).toBeGreaterThan(0);
    }
  });

  test.each([
    ["ac-electrolyzer", ["control_type", "e2h_coeff"]],
    ["dc-electrolyzer", ["control_type", "e2h_coeff"]],
    ["ac-fuel-cell", ["control_type", "h2e_coeff"]],
    ["dc-fuel-cell", ["control_type", "h2e_coeff"]],
    ["ac-heater", ["control_type", "e2h_coeff"]],
    ["dc-heater", ["control_type", "e2h_coeff"]],
    ["ac-two-port-heater", ["control_type", "e2h_coeff"]],
    ["dc-two-port-heater", ["control_type", "e2h_coeff"]]
  ] as const)("ignores a corrupt empty shared parameter table for %s", (kind, requiredFields) => {
    const template = DEVICE_LIBRARY.find((item) => item.kind === kind)!;
    const sharedKey = deviceDefinitionSharedKeyForTemplate(template);
    const override = deviceDefinitionOverrideForTemplate(template, {
      [sharedKey]: {
        kind: sharedKey,
        parameterDefinitions: [],
        measurementDefinitions: [{ measurementTypeId: "activePower", associatedField: "p" }],
        updatedAt: "2026-08-13T00:00:00.000Z"
      },
      [kind]: {
        kind,
        params: { backgroundImage: "custom.svg" },
        updatedAt: "2026-08-13T00:00:00.000Z"
      }
    });
    const appliedTemplate = applyDeviceTemplateDefinitionOverride(template, override);
    const node = {
      kind,
      name: template.label,
      terminals: (template.terminalTypes ?? []).map((type, index) => ({
        id: `t${index + 1}`,
        label: template.terminalLabels?.[index] ?? `t${index + 1}`,
        type,
        anchor: { x: 0, y: 0 }
      })),
      params: { ...appliedTemplate.params, is_container: "1" }
    } as any;
    const bodyFields = buildContainerDeviceParameterViews(node, appliedTemplate)[0].rows.map((row) => row.key);

    expect(override?.parameterDefinitions?.map((definition) => definition.enName)).toEqual(
      expect.arrayContaining([...requiredFields])
    );
    expect(override?.measurementDefinitions).toHaveLength(1);
    expect(override?.params?.backgroundImage).toBe("custom.svg");
    expect(bodyFields).toEqual(expect.arrayContaining([...requiredFields]));
    expect(bodyFields).not.toEqual(expect.arrayContaining([
      "backgroundImage",
      "backgroundImageAssetId",
      "backgroundImageFit",
      "backgroundImageCleared"
    ]));
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

  test("keeps an explicit delete-all marker while dropping stale markers on non-empty tables", () => {
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

  test("defaults editable dev_type to the owning base or derived class name", () => {
    const template = DEVICE_LIBRARY.find((item) => item.kind === "ac-load");
    const draft = createCustomDeviceDraftFromTemplate(template!);
    const devTypeRow = draft.params.find((row) => row.enName === "dev_type");

    expect(devTypeRow).toBeDefined();
    expect(devTypeRow).toMatchObject({ typicalValue: "ACLoad", readonly: false });

    expect(draft.componentKind).toBe(template?.kind);
    const verticalTemplate = DEVICE_LIBRARY.find((item) => item.kind === "ac-breaker-vertical");
    const verticalDraft = createCustomDeviceDraftFromTemplate(verticalTemplate!);
    const verticalDevTypeRow = verticalDraft.params.find((row) => row.enName === "dev_type");
    expect(verticalDevTypeRow).toMatchObject({ typicalValue: "ACBreak", readonly: false });

    const derivedTemplate = DEVICE_LIBRARY.find((item) => item.kind === "ac-wind-source");
    const derivedDraft = createCustomDeviceDraftFromTemplate(derivedTemplate!);
    const derivedDevTypeRow = derivedDraft.params.find((row) => row.enName === "dev_type");
    expect(derivedDevTypeRow).toMatchObject({ typicalValue: "ACWindGen", readonly: false });
  });

  test("keeps an explicitly saved non-empty dev_type editable default", () => {
    const template = DEVICE_LIBRARY.find((item) => item.kind === "ac-load")!;
    const applied = applyDeviceTemplateDefinitionOverride(template, {
      kind: template.kind,
      parameterDefinitions: [
        { cnName: "设备类型", enName: "dev_type", valueType: "string", typicalValue: "UserEditableType", readonly: false }
      ]
    });
    const devTypeRow = createCustomDeviceDraftFromTemplate(applied).params.find((row) => row.enName === "dev_type");

    expect(devTypeRow).toMatchObject({ typicalValue: "UserEditableType", readonly: false });
  });

  test("round-trips editable component Chinese and English display names through an override", () => {
    const template = DEVICE_LIBRARY.find((item) => item.kind === "ac-load")!;
    const applied = applyDeviceTemplateDefinitionOverride(template, {
      kind: template.kind,
      label: "用户交流负荷",
      englishName: "user-ac-load"
    });
    const draft = createCustomDeviceDraftFromTemplate(applied);

    expect(draft.componentName).toBe("用户交流负荷");
    expect(draft.componentKind).toBe("user-ac-load");
  });

  test("copies effective shared measurement definitions into an isolated edit draft", () => {
    const template = DEVICE_LIBRARY.find((item) => item.kind === "dcdc-converter")!;
    const measurementDefinitions = [
      { measurementTypeId: "activePower", associatedField: "i_p" },
      { measurementTypeId: "voltage", associatedField: "i_v" },
      { measurementTypeId: "current", associatedField: "i_i" }
    ];
    const applied = applyDeviceTemplateDefinitionOverride(template, {
      kind: template.kind,
      measurementDefinitions
    });

    const draft = createCustomDeviceDraftFromTemplate(applied);

    expect(draft.measurementDefinitions).toEqual(measurementDefinitions);
    expect(draft.measurementDefinitions).not.toBe(applied.measurementDefinitions);
    draft.measurementDefinitions[0].associatedField = "changed";
    expect(applied.measurementDefinitions?.[0].associatedField).toBe("i_p");
  });

  test("keeps every built-in measurement definition in its edit draft", () => {
    for (const template of DEVICE_LIBRARY) {
      if (template.custom || !template.measurementDefinitions?.length) continue;

      const draft = createCustomDeviceDraftFromTemplate(template);

      expect(draft.measurementDefinitions, template.kind).toEqual(template.measurementDefinitions);
      expect(draft.measurementDefinitions, template.kind).not.toBe(template.measurementDefinitions);
    }
  });

  test("restores every built-in measurement table hidden by an unmarked empty shared override", () => {
    for (const template of DEVICE_LIBRARY) {
      if (template.custom || !template.measurementDefinitions?.length) continue;

      const sharedKey = deviceDefinitionSharedKeyForTemplate(template);
      const normalized = normalizeSharedDeviceDefinitionOverrides({
        [sharedKey]: {
          kind: sharedKey,
          measurementDefinitions: [],
          updatedAt: "2026-08-14T17:14:43.814Z"
        }
      }, DEVICE_LIBRARY);
      const applied = applyDeviceTemplateDefinitionOverride(
        template,
        deviceDefinitionOverrideForTemplate(template, normalized)
      );

      expect(applied.measurementDefinitions, template.kind).toEqual(template.measurementDefinitions);
      expect(normalized[sharedKey].measurementDefinitions, template.kind).toBeUndefined();
      expect(normalized[sharedKey].measurementDefinitionsIntent, template.kind).toBeUndefined();
    }
  });

  test("keeps explicit measurement delete-all while dropping stale markers on non-empty tables", () => {
    const template = DEVICE_LIBRARY.find((item) => item.kind === "ac-source")!;
    const sharedKey = deviceDefinitionSharedKeyForTemplate(template);
    const explicitlyEmpty = normalizeSharedDeviceDefinitionOverrides({
      [sharedKey]: {
        kind: sharedKey,
        measurementDefinitions: [],
        measurementDefinitionsIntent: "delete-all"
      }
    }, DEVICE_LIBRARY);
    const explicitTemplate = applyDeviceTemplateDefinitionOverride(
      template,
      deviceDefinitionOverrideForTemplate(template, explicitlyEmpty)
    );
    expect(explicitTemplate.measurementDefinitions).toEqual([]);
    expect(explicitTemplate.measurementDefinitionsIntent).toBe("delete-all");

    const nonEmpty = normalizeSharedDeviceDefinitionOverrides({
      [sharedKey]: {
        kind: sharedKey,
        measurementDefinitions: [{ measurementTypeId: "voltage", associatedField: "v" }],
        measurementDefinitionsIntent: "delete-all"
      }
    }, DEVICE_LIBRARY);
    expect(nonEmpty[sharedKey].measurementDefinitionsIntent).toBeUndefined();
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
      "hub_height",
      "parent",
      "dev_type"
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
      "generator_efficiency",
      "parent",
      "dev_type"
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

      expect(rows.map((row) => row.enName)).toEqual(["idx", "name", "parent", "status", "run_stat"]);
    }
  );

  test("keeps generated terminal defaults when existing node definitions are incomplete", () => {
    const rows = customDefaultDefinitions(["ac", "ac"], {
      existingDefinitions: [{ enName: "i_node" }]
    } as any);

    expect(rows.map((row) => row.enName)).toEqual([
      "idx",
      "name",
      "parent",
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
    expect(draft.params.map((row) => row.enName)).toEqual(["installedCapacity", "parent", "dev_type"]);
    expect(draft.params[0]).toMatchObject({
      cnName: "装机容量",
      exportEnabled: true,
      exportName: "installed_capacity"
    });
    expect(draft.params[1]).toMatchObject({
      enName: "parent",
      valueType: "numberEnum",
      enumValueType: "number",
      readonly: false,
      exportEnabled: true,
      exportName: "parent"
    });
    // parent/dev_type 例外：派生类属性列表保留主类的所属模型和设备类型字段
    expect(draft.params[2]).toMatchObject({
      enName: "dev_type",
      exportEnabled: true,
      exportName: "dev_type"
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

// 端子锚点是「归一化到 [-0.5, 0.5] 的元件局部坐标」。归一与取键两件事的判据都是浮点，
// 没有它们兜底的话，用户在编辑器里拖出的 0.1234000000001 与 0.1234 会算成两个端子，
// 表现为「端子重叠校验不生效 / 端子被存成两份」。故精度与取整规则都要钉住。
describe("normalizeCustomDeviceTerminalAnchorCoordinate", () => {
  test("保留三位小数（精度常量是 1000）", () => {
    expect(normalizeCustomDeviceTerminalAnchorCoordinate(0.1234)).toBe(0.123);
    expect(normalizeCustomDeviceTerminalAnchorCoordinate(-0.1234)).toBe(-0.123);
    // 第四位被舍掉，不进位
    expect(normalizeCustomDeviceTerminalAnchorCoordinate(0.12349)).toBe(0.123);
  });

  test("第五位按 Math.round 取整，半值向 +∞（负数侧不对称）", () => {
    expect(normalizeCustomDeviceTerminalAnchorCoordinate(0.1235)).toBe(0.124);
    // Math.round 是「半值向 +∞」而非「远离零」：-123.5 → -123，即 -0.1235 落在 -0.123。
    // 钉住这条不对称是有原因的：customDeviceTerminalAnchorKey 用的是同一个归一化，
    // 改取整方式会把已存的两枚不同锚点算成同一个键，端子重叠校验随之误报。
    expect(normalizeCustomDeviceTerminalAnchorCoordinate(-0.1235)).toBe(-0.123);
    expect(normalizeCustomDeviceTerminalAnchorCoordinate(-0.1236)).toBe(-0.124);
  });

  test("夹到 [-0.5, 0.5]：锚点必须落在元件边界上", () => {
    // 越界锚点会让端子引线从元件内部穿出去
    expect(normalizeCustomDeviceTerminalAnchorCoordinate(0.6)).toBe(0.5);
    expect(normalizeCustomDeviceTerminalAnchorCoordinate(-0.6)).toBe(-0.5);
    expect(normalizeCustomDeviceTerminalAnchorCoordinate(99)).toBe(0.5);
    expect(normalizeCustomDeviceTerminalAnchorCoordinate(0.5)).toBe(0.5);
    expect(normalizeCustomDeviceTerminalAnchorCoordinate(-0.5)).toBe(-0.5);
  });

  test("非有限数与非数值一律当 0（元件正中）", () => {
    for (const value of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      expect(normalizeCustomDeviceTerminalAnchorCoordinate(value)).toBe(0);
    }
    // 字符串不是有限数（Number.isFinite 不做转换）→ 0
    expect(normalizeCustomDeviceTerminalAnchorCoordinate("0.3" as unknown as number)).toBe(0);
    expect(normalizeCustomDeviceTerminalAnchorCoordinate(0)).toBe(0);
  });
});

describe("customDeviceTerminalAnchorKey", () => {
  test("按归一后的坐标拼键", () => {
    expect(customDeviceTerminalAnchorKey({ x: 0.5, y: 0 })).toBe("0.5:0");
    expect(customDeviceTerminalAnchorKey({ x: -0.5, y: 0.25 })).toBe("-0.5:0.25");
  });

  test("浮点尾差被归一吃掉：这两个键相同", () => {
    // 这正是取键存在的理由 —— 相等性判在浮点上不成立
    expect(customDeviceTerminalAnchorKey({ x: 0.1234000000001, y: 0 })).toBe(
      customDeviceTerminalAnchorKey({ x: 0.1234, y: 0 })
    );
    expect(customDeviceTerminalAnchorKey({ x: 0.1 + 0.2, y: 0 })).toBe(
      customDeviceTerminalAnchorKey({ x: 0.3, y: 0 })
    );
  });

  test("越界坐标先夹再拼键", () => {
    expect(customDeviceTerminalAnchorKey({ x: 0.9, y: -0.9 })).toBe("0.5:-0.5");
  });

  test("不同位置给出不同键", () => {
    expect(customDeviceTerminalAnchorKey({ x: 0.5, y: 0 })).not.toBe(
      customDeviceTerminalAnchorKey({ x: 0, y: 0.5 })
    );
  });
});

// 正交轴判定是 Shift 约束连线的核心：判错的表现是「按了 Shift 反而拐弯」。
// 平手（|dx| === |dy|）判给 x 是刻意的 —— 斜 45° 时保持水平更符合「先定一个主方向」的直觉。
describe("primaryOrthogonalAxis", () => {
  const start = { x: 0, y: 0 };

  test("横向位移为主 → x", () => {
    expect(primaryOrthogonalAxis(start, { x: 10, y: 0 })).toBe("x");
    expect(primaryOrthogonalAxis(start, { x: 10, y: 3 })).toBe("x");
  });

  test("纵向位移为主 → y", () => {
    expect(primaryOrthogonalAxis(start, { x: 0, y: 10 })).toBe("y");
    expect(primaryOrthogonalAxis(start, { x: 3, y: 10 })).toBe("y");
  });

  test("平手判给 x（|dx| === |dy|）", () => {
    expect(primaryOrthogonalAxis(start, { x: 10, y: 10 })).toBe("x");
    expect(primaryOrthogonalAxis(start, { x: -10, y: 10 })).toBe("x");
    // 零位移也是平手
    expect(primaryOrthogonalAxis(start, start)).toBe("x");
  });

  test("按位移差的绝对值算，与方向无关", () => {
    const from = { x: 100, y: 100 };
    expect(primaryOrthogonalAxis(from, { x: 90, y: 100 })).toBe("x");
    expect(primaryOrthogonalAxis(from, { x: 100, y: 90 })).toBe("y");
  });
});

describe("constrainPointToOrthogonalAxis", () => {
  const start = { x: 4, y: 7 };

  test("约束到 x 轴：保留目标 x，纵坐标回到起点", () => {
    expect(constrainPointToOrthogonalAxis(start, { x: 20, y: 30 }, "x")).toEqual({ x: 20, y: 7 });
  });

  test("约束到 y 轴：保留目标 y，横坐标回到起点", () => {
    expect(constrainPointToOrthogonalAxis(start, { x: 20, y: 30 }, "y")).toEqual({ x: 4, y: 30 });
  });

  test("不传轴时按 primaryOrthogonalAxis 的判定", () => {
    // 起点 (4,7)：dx 大于 dy → 约束到 x
    expect(constrainPointToOrthogonalAxis(start, { x: 30, y: 20 })).toEqual({ x: 30, y: 7 });
    // dy 大于 dx → 约束到 y
    expect(constrainPointToOrthogonalAxis(start, { x: 20, y: 30 })).toEqual({ x: 4, y: 30 });
    // 纯水平位移 → x（结果与不约束相同）
    expect(constrainPointToOrthogonalAxis(start, { x: 30, y: 7 })).toEqual({ x: 30, y: 7 });
  });

  test("显式传的轴优先于自动判定", () => {
    // 自动判定会选 y；调用方（轴锁定）显式给 x 时必须听 x 的
    expect(constrainPointToOrthogonalAxis(start, { x: 20, y: 30 }, "x")).toEqual({ x: 20, y: 7 });
    expect(constrainPointToOrthogonalAxis(start, { x: 30, y: 20 }, "y")).toEqual({ x: 4, y: 20 });
  });

  test("起点坐标原样搬过去，不做任何取整或归一", () => {
    // 归一是端子锚点的事；这里动的是画布像素坐标，取整会把线端吸到整数格上
    expect(constrainPointToOrthogonalAxis({ x: 4.37, y: 7.62 }, { x: 20.11, y: 30.29 }, "x")).toEqual({
      x: 20.11,
      y: 7.62
    });
  });

  test("已经在轴上时是恒等映射", () => {
    const point = { x: 20, y: 7 };
    expect(constrainPointToOrthogonalAxis(start, point, "x")).toEqual(point);
  });
});
