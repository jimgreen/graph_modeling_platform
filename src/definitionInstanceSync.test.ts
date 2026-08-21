import { describe, expect, test } from "vitest";
import {
  CUSTOM_PARAM_DEFINITIONS_KEY,
  createDefaultNode,
  DEVICE_LIBRARY,
  resolveEffectiveTemplateParameterDefinitionGroups,
  resolveEffectiveTemplateParameterDefinitions,
  type DeviceParameterDefinition,
  type DeviceTemplate
} from "./model";
import {
  reconcileNodesWithEffectiveTemplateDefinitions,
  reconcileNodeWithDefinition
} from "./definitionInstanceSync";

const oldDefinitions: DeviceParameterDefinition[] = [
  { cnName: "保留字段", enName: "keepField", valueType: "string", typicalValue: "old-default" },
  { cnName: "删除字段", enName: "removedField", valueType: "string", typicalValue: "remove-me" }
];

const nextDefinitions: DeviceParameterDefinition[] = [
  { cnName: "保留字段新名称", enName: "keepField", valueType: "string", typicalValue: "new-default" },
  { cnName: "新增字段", enName: "addedField", valueType: "string", typicalValue: "added-default" }
];

function latestTemplate(): DeviceTemplate {
  return {
    kind: "ac-source",
    label: "交流电源新定义",
    categoryLibrary: "交流设备",
    size: { width: 120, height: 84 },
    params: {
      backgroundImage: "data:image/svg+xml,new-definition",
      backgroundImageFit: "stretch",
      fillColor: "#abcdef"
    },
    terminalType: "ac",
    terminalCount: 2,
    terminalTypes: ["ac", "dc"],
    terminalLabels: ["交流端", "直流端"],
    terminalAnchors: [
      { x: -0.5, y: 0 },
      { x: 0.5, y: 0 }
    ],
    parameterDefinitions: nextDefinitions,
    parameterDefinitionsComplete: true
  };
}

describe("definition instance node reconciliation", () => {
  test("resolves base definitions before derived definitions without duplicate fields", () => {
    const template = DEVICE_LIBRARY.find((candidate) => candidate.kind === "ac-wind-source")!;
    const groups = resolveEffectiveTemplateParameterDefinitionGroups(template, DEVICE_LIBRARY);
    const definitions = resolveEffectiveTemplateParameterDefinitions(template, DEVICE_LIBRARY);
    const definitionNames = definitions.map((definition) => definition.enName);

    expect(groups.baseDefinitions.map((definition) => definition.enName)).toContain("p_max");
    expect(groups.baseDefinitions.map((definition) => definition.enName)).toContain("frequency");
    expect(groups.derivedDefinitions.map((definition) => definition.enName)).toContain("cut_in_wind_speed");
    expect(definitionNames.indexOf("frequency")).toBeLessThan(definitionNames.indexOf("cut_in_wind_speed"));
    expect(definitionNames.filter((name) => name === "v_max")).toHaveLength(1);
  });

  test("materializes missing base and derived defaults without overwriting stored or explicitly empty values", () => {
    const source = createDefaultNode("ac-wind-source", { x: 80, y: 80 });
    const node = {
      ...source,
      params: {
        ...source.params,
        p_max: "23.5",
        q_max: ""
      } as Record<string, string>
    };
    for (const key of ["p_min", "q_min", "frequency", "short_circuit_capacity", "cut_in_wind_speed"]) {
      delete node.params[key];
    }

    const reconciled = reconcileNodesWithEffectiveTemplateDefinitions([node], DEVICE_LIBRARY)[0];

    expect(reconciled.params).toMatchObject({
      p_max: "23.5",
      p_min: "0",
      q_max: "",
      q_min: "0",
      frequency: "50",
      short_circuit_capacity: "500",
      cut_in_wind_speed: "3"
    });
    expect(reconcileNodesWithEffectiveTemplateDefinitions([reconciled], DEVICE_LIBRARY)[0]).toBe(reconciled);
  });

  test("inherits parameter defaults for user-defined derived component libraries", () => {
    const baseTemplate: DeviceTemplate = {
      kind: "custom-base-source",
      label: "自定义基类",
      categoryLibrary: "自定义设备",
      size: { width: 80, height: 60 },
      params: { component_type: "CustomSource" },
      terminalType: "ac",
      terminalCount: 1,
      custom: true,
      parameterDefinitions: [
        { cnName: "基类参数", enName: "base_value", valueType: "float", typicalValue: "1.5" }
      ]
    };
    const derivedTemplate: DeviceTemplate = {
      ...baseTemplate,
      kind: "custom-derived-source",
      label: "自定义派生类",
      params: {
        component_type: "CustomSource",
        derived_from_component_type: "CustomSource",
        derived_component_type: "CustomDerivedSource",
        is_derived_component_library: "1"
      },
      isDerivedComponentLibrary: true,
      derivedFromComponentLibrary: "CustomSource",
      derivedComponentLibrary: "CustomDerivedSource",
      parameterDefinitions: [
        { cnName: "派生参数", enName: "derived_value", valueType: "float", typicalValue: "2.5" }
      ]
    };
    const source = createDefaultNode("ac-source", { x: 0, y: 0 });
    const node = {
      ...source,
      kind: derivedTemplate.kind,
      params: { ...derivedTemplate.params, _customDeviceTemplate: "1" }
    };

    const reconciled = reconcileNodesWithEffectiveTemplateDefinitions(
      [node],
      [baseTemplate, derivedTemplate]
    )[0];

    expect(reconciled.params.base_value).toBe("1.5");
    expect(reconciled.params.derived_value).toBe("2.5");
  });

  test("honors an explicit delete-all marker during derived instance synchronization", () => {
    const baseTemplate = DEVICE_LIBRARY.find((candidate) => candidate.kind === "ac-source")!;
    const derivedTemplate = {
      ...DEVICE_LIBRARY.find((candidate) => candidate.kind === "ac-wind-source")!,
      parameterDefinitions: [],
      parameterDefinitionsIntent: "delete-all" as const,
      parameterDefinitionsComplete: true
    };
    const source = createDefaultNode("ac-wind-source", { x: 0, y: 0 });
    const reconciled = reconcileNodeWithDefinition(
      source,
      derivedTemplate,
      resolveEffectiveTemplateParameterDefinitions(
        DEVICE_LIBRARY.find((candidate) => candidate.kind === "ac-wind-source")!,
        DEVICE_LIBRARY
      ),
      [baseTemplate, derivedTemplate]
    );
    expect(resolveEffectiveTemplateParameterDefinitions(derivedTemplate, [baseTemplate, derivedTemplate])).toEqual([]);
    expect(reconciled.params).not.toHaveProperty("p_max");
    expect(reconciled.params).not.toHaveProperty("cut_in_wind_speed");
  });

  test("materializes stored custom definitions even when the custom template is unavailable", () => {
    const source = createDefaultNode("ac-source", { x: 0, y: 0 });
    const storedDefinitions: DeviceParameterDefinition[] = [
      { cnName: "离线自定义参数", enName: "offline_value", valueType: "float", typicalValue: "7.5" }
    ];
    const node = {
      ...source,
      kind: "removed-custom-template",
      params: {
        [CUSTOM_PARAM_DEFINITIONS_KEY]: JSON.stringify(storedDefinitions)
      }
    };

    const reconciled = reconcileNodesWithEffectiveTemplateDefinitions([node], []);

    expect(reconciled[0].params.offline_value).toBe("7.5");
  });

  test("materializes every built-in business definition without adding definition metadata", () => {
    const metadataKeys = new Set([
      "name",
      "component_type",
      "is_container",
      "allow_resize_transform",
      CUSTOM_PARAM_DEFINITIONS_KEY,
      "_customDeviceTemplate"
    ]);

    for (const template of DEVICE_LIBRARY) {
      const definitions = resolveEffectiveTemplateParameterDefinitions(template, DEVICE_LIBRARY)
        .filter((definition) => !metadataKeys.has(definition.enName));
      if (definitions.length === 0) {
        continue;
      }
      const source = createDefaultNode(template.kind, { x: 0, y: 0 });
      if (source.params._customDeviceTemplate === "1") {
        continue;
      }
      const params = { ...source.params };
      delete params[CUSTOM_PARAM_DEFINITIONS_KEY];
      for (const definition of definitions) {
        delete params[definition.enName];
      }

      const reconciled = reconcileNodesWithEffectiveTemplateDefinitions(
        [{ ...source, params }],
        DEVICE_LIBRARY
      )[0];

      for (const definition of definitions) {
        expect(
          Object.prototype.hasOwnProperty.call(reconciled.params, definition.enName),
          `${template.kind}.${definition.enName}`
        ).toBe(true);
        expect(reconciled.params[definition.enName], `${template.kind}.${definition.enName}`)
          .toBe(definition.typicalValue);
      }
      expect(reconciled.params, template.kind).not.toHaveProperty(CUSTOM_PARAM_DEFINITIONS_KEY);
      expect(
        reconcileNodesWithEffectiveTemplateDefinitions([reconciled], DEVICE_LIBRARY)[0],
        template.kind
      ).toBe(reconciled);
    }
  });
  test("updates definition-owned data while preserving instance-owned data", () => {
    const source = createDefaultNode("ac-source", { x: 320, y: 180 });
    const node = {
      ...source,
      name: "用户命名的电源",
      rotation: 90,
      scaleX: 1.4,
      scaleY: 0.8,
      layerId: "custom-layer",
      params: {
        ...source.params,
        idx: "27",
        keepField: "user-value",
        removedField: "legacy-value",
        backgroundImage: "data:image/svg+xml,old-definition",
        backgroundImageFit: "contain",
        foregroundImage: "data:image/svg+xml,removed-definition",
        fillColor: "#111111",
        [CUSTOM_PARAM_DEFINITIONS_KEY]: JSON.stringify(oldDefinitions)
      },
      terminals: source.terminals.map((terminal) => ({
        ...terminal,
        nodeNumber: "101",
        vbase: "35"
      }))
    };

    const reconciled = reconcileNodeWithDefinition(node, latestTemplate());

    expect(reconciled).not.toBe(node);
    expect(reconciled.name).toBe("用户命名的电源");
    expect(reconciled.position).toEqual({ x: 320, y: 180 });
    expect(reconciled.rotation).toBe(90);
    expect(reconciled.scaleX).toBe(1.4);
    expect(reconciled.scaleY).toBe(0.8);
    expect(reconciled.layerId).toBe("custom-layer");
    expect(reconciled.params.idx).toBe("27");
    expect(reconciled.params.keepField).toBe("user-value");
    expect(reconciled.params.addedField).toBe("added-default");
    expect(reconciled.params).not.toHaveProperty("removedField");
    expect(JSON.parse(reconciled.params[CUSTOM_PARAM_DEFINITIONS_KEY])).toEqual(
      [
        expect.objectContaining({
          enName: "parent",
          valueType: "numberEnum",
          enumValueType: "number",
          readonly: false
        }),
        ...nextDefinitions.map((definition) => ({ ...definition, readonly: false }))
      ]
    );
    expect(reconciled.params.backgroundImage).toBe("data:image/svg+xml,new-definition");
    expect(reconciled.params.backgroundImageFit).toBe("stretch");
    expect(reconciled.params).not.toHaveProperty("foregroundImage");
    expect(reconciled.params.fillColor).toBe("#abcdef");
    expect(reconciled.size).toEqual({ width: 120, height: 84 });
    expect(reconciled.terminals).toHaveLength(2);
    expect(reconciled.terminals[0]).toMatchObject({
      id: "t1",
      type: "ac",
      label: "交流端",
      nodeNumber: "101",
      vbase: "35",
      anchor: { x: -0.5, y: 0 }
    });
    expect(reconciled.terminals[1]).toMatchObject({
      id: "t2",
      type: "dc",
      label: "直流端",
      anchor: { x: 0.5, y: 0 }
    });
  });

  test("preserves saved button behavior while synchronizing definition-owned visuals", () => {
    const template = DEVICE_LIBRARY.find((candidate) => candidate.kind === "static-button")!;
    const source = createDefaultNode("static-button", { x: 120, y: 80 });
    const savedParams = {
      buttonEnabled: "0",
      buttonActionType: "project",
      buttonTargetSchemeId: "scheme:example",
      buttonTargetProjectId: "project:example/target",
      buttonTargetProjectName: "目标模型",
      buttonTargetLayerId: "layer-target",
      buttonTargetLayerName: "目标图层",
      buttonTargetLayerIds: "layer-target,layer-second",
      buttonTargetLayerNames: "目标图层,第二图层",
      buttonCommand: "fitCanvas"
    };
    const node = {
      ...source,
      params: {
        ...source.params,
        ...savedParams,
        fillColor: "#111111"
      }
    };

    const reconciled = reconcileNodeWithDefinition(node, template);

    expect(reconciled.params).toMatchObject(savedParams);
    expect(reconciled.params.fillColor).toBe(template.params.fillColor);
  });

  test("returns the original node when the latest definition makes no change", () => {
    const template = latestTemplate();
    const source = createDefaultNode("ac-source", { x: 40, y: 60 });
    const first = reconcileNodeWithDefinition(source, template);

    expect(reconcileNodeWithDefinition(first, template)).toBe(first);
  });

  test("preserves a saved single-terminal instance anchor while reconciling its definition", () => {
    const source = createDefaultNode("ac-source", { x: 160, y: 120 });
    const node = {
      ...source,
      terminals: source.terminals.map((terminal) => ({
        ...terminal,
        anchor: { x: 0, y: -0.5 }
      }))
    };
    const template: DeviceTemplate = {
      kind: "ac-source",
      label: "交流电源",
      categoryLibrary: "交流设备",
      size: { width: 96, height: 72 },
      params: source.params,
      terminalType: "ac",
      terminalCount: 1,
      terminalTypes: ["ac"],
      terminalLabels: ["交流端"],
      terminalAnchors: [{ x: 0.5, y: 0 }]
    };

    const reconciled = reconcileNodeWithDefinition(node, template);

    expect(reconciled.terminals).toHaveLength(1);
    expect(reconciled.terminals[0]).toMatchObject({
      id: "t1",
      type: "ac",
      label: "交流端",
      anchor: { x: 0, y: -0.5 }
    });
  });

  test("adds newly defined load and converter limits to historical instances while preserving saved values", () => {
    const loadTemplate = DEVICE_LIBRARY.find((template) => template.kind === "ac-load")!;
    const converterTemplate = DEVICE_LIBRARY.find((template) => template.kind === "acdc-converter")!;
    const load = createDefaultNode("ac-load", { x: 100, y: 100 });
    const converter = createDefaultNode("acdc-converter", { x: 260, y: 100 });

    load.params.p_max = "7.5";
    for (const key of ["rated_capacity", "p_min", "q_max", "q_min", "v_max", "v_min"]) {
      delete load.params[key];
    }
    converter.params.ac_p_max = "12.5";
    for (const key of [
      "rated_capacity",
      "ac_p_min",
      "ac_i_max",
      "ac_v_max",
      "ac_v_min",
      "dc_p_max",
      "dc_p_min",
      "dc_i_max",
      "dc_v_max",
      "dc_v_min"
    ]) {
      delete converter.params[key];
    }

    const reconciledLoad = reconcileNodeWithDefinition(load, loadTemplate);
    const reconciledConverter = reconcileNodeWithDefinition(converter, converterTemplate);

    expect(reconciledLoad.params).toMatchObject({
      rated_capacity: "5",
      p_max: "7.5",
      p_min: "0",
      q_max: "1.2",
      q_min: "0",
      v_max: "1.1",
      v_min: "0.9"
    });
    expect(reconciledConverter.params).toMatchObject({
      rated_capacity: "10",
      ac_p_max: "12.5",
      ac_p_min: "-10",
      ac_i_max: "0",
      ac_v_max: "1.1",
      ac_v_min: "0.9",
      dc_p_max: "10",
      dc_p_min: "-10",
      dc_i_max: "0",
      dc_v_max: "1.1",
      dc_v_min: "0.9"
    });
  });
});
