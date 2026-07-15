import { describe, expect, test } from "vitest";

import { DEVICE_LIBRARY } from "./model";
import {
  createDefinitionDraftRows,
  createCustomDeviceDraftFromTemplate,
  customDefaultDefinitions,
  deviceDefinitionKeyForTemplate,
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
  ["ac-hydro-source", "交流设备", "ACGenerator", "ACHydroGen"],
  ["dc-hydro-source", "直流设备", "DCGenerator", "DCHydroGen"],
  ["ac-nuclear-source", "交流设备", "ACGenerator", "ACNuclearGen"],
  ["dc-nuclear-source", "直流设备", "DCGenerator", "DCNuclearGen"]
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

  test("shows only derived-specific parameters when editing a derived generation device", () => {
    const template = DEVICE_LIBRARY.find((item) => item.kind === "ac-wind-source");
    const draft = createCustomDeviceDraftFromTemplate(template!);
    const fieldNames = draft.params.map((row) => row.enName);

    expect(draft.isDerivedComponentLibrary).toBe(true);
    expect(fieldNames).toEqual([
      "windTurbineModel",
      "windTurbineCount",
      "unitRatedPower",
      "cutInWindSpeed",
      "ratedWindSpeed",
      "cutOutWindSpeed",
      "rotorDiameter",
      "hubHeight"
    ]);
    expect(fieldNames).not.toEqual(expect.arrayContaining([
      "idx",
      "name",
      "status",
      "run_stat",
      "sourceType",
      "ratedPower",
      "ratedVoltage",
      "node",
      "control_type",
      "p_set"
    ]));
    expect(draft.params.every((row) => row.exportEnabled === true)).toBe(true);
    expect(draft.params.map((row) => row.exportName)).toEqual(fieldNames);
  });

  test("keeps the device definition parameter table limited to derived-specific parameters", () => {
    const template = DEVICE_LIBRARY.find((item) => item.kind === "ac-hydro-source");
    const rows = createDefinitionDraftRows(template!);
    const fieldNames = rows.map((row) => row.enName);

    expect(fieldNames).toEqual([
      "hydroUnitModel",
      "turbineType",
      "turbineCount",
      "unitRatedPower",
      "designHead",
      "designFlow",
      "ratedSpeed",
      "generatorEfficiency"
    ]);
    expect(fieldNames).not.toEqual(expect.arrayContaining([
      "idx",
      "name",
      "dev_type",
      "status",
      "run_stat",
      "sourceType",
      "ratedPower",
      "ratedVoltage",
      "node",
      "control_type",
      "p_set"
    ]));
  });

  test("does not inject base default rows into derived component parameter tables", () => {
    const rows = customDefaultDefinitions(["ac"], { isDerivedComponentLibrary: true } as any);

    expect(rows).toEqual([]);
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
