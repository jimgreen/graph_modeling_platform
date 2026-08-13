import { describe, expect, test } from "vitest";
import {
  CUSTOM_PARAM_DEFINITIONS_KEY,
  createDefaultNode,
  DEVICE_LIBRARY,
  type DeviceParameterDefinition,
  type DeviceTemplate
} from "./model";
import { reconcileNodeWithDefinition } from "./definitionInstanceSync";

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
    parameterDefinitions: nextDefinitions
  };
}

describe("definition instance node reconciliation", () => {
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
      nextDefinitions.map((definition) => ({ ...definition, readonly: false }))
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
