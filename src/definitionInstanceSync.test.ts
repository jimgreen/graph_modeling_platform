import { describe, expect, test } from "vitest";
import {
  CUSTOM_DEVICE_TEMPLATE_KEY,
  CUSTOM_PARAM_DEFINITIONS_KEY,
  createDefaultNode,
  DEVICE_LIBRARY,
  resolveEffectiveTemplateParameterDefinitionGroups,
  resolveEffectiveTemplateParameterDefinitions,
  type DeviceParameterDefinition,
  type DeviceTemplate,
  type ModelNode,
  type TerminalType
} from "./model";
import {
  reconcileNodesWithEffectiveTemplateDefinitions,
  reconcileNodeWithDefinition,
  reconcileNodeWithEffectiveTemplateDefinition
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

  test("交流容器实例的尺寸是用户几何,定义同步不得打回模板默认值", () => {
    const template = DEVICE_LIBRARY.find((candidate) => candidate.kind === "ac-vpp-box")!;
    const resized = {
      ...createDefaultNode("ac-vpp-box", { x: 300, y: 200 }),
      size: { width: 400, height: 300 }
    };

    const reconciled = reconcileNodeWithDefinition(resized, template);

    expect(reconciled.size).toEqual({ width: 400, height: 300 });

    // 容器是唯一例外:普通设备的尺寸仍由定义同步
    const loadTemplate = DEVICE_LIBRARY.find((candidate) => candidate.kind === "ac-load")!;
    const load = createDefaultNode("ac-load", { x: 0, y: 0 });
    expect(reconcileNodeWithDefinition(load, { ...loadTemplate, size: { width: 111, height: 77 } }).size)
      .toEqual({ width: 111, height: 77 });
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

// reconcileNodeWithEffectiveTemplateDefinition 是「按生效定义同步单个实例」的唯一入口。
// 它与 reconcileNodeWithDefinition 的唯一区别是 keepStoredDefinitions 这道分叉：
// 内置元件只补默认值（materialize），自定义元件才回写参数表快照。前者错了不会报错，
// 只会让用户手工加在实例上的参数被静默清掉。
describe("reconcileNodeWithEffectiveTemplateDefinition 的内置/自定义分叉", () => {
  const customTemplate: DeviceTemplate = {
    kind: "custom-fork-probe",
    label: "自定义分叉探针",
    categoryLibrary: "自定义设备",
    size: { width: 80, height: 60 },
    params: { component_type: "CustomForkProbe" },
    terminalType: "ac",
    terminalCount: 1,
    custom: true,
    parameterDefinitions: [
      { cnName: "基类参数", enName: "base_value", valueType: "float", typicalValue: "1.5" }
    ]
  };
  const probeNode = (params: Record<string, string>) => ({
    ...createDefaultNode("ac-load", { x: 0, y: 0 }),
    kind: "custom-fork-probe",
    params: { component_type: "CustomForkProbe", ...params }
  });
  // 同一个模板，去掉 custom 标记 —— 用来单独检验两个存量信号
  const asBuiltIn = { ...customTemplate, custom: false } as DeviceTemplate;

  test("内置元件只补缺失默认值，不回写参数表快照（materialize 分支）", () => {
    const reconciled = reconcileNodeWithEffectiveTemplateDefinition(probeNode({}), asBuiltIn, [asBuiltIn]);
    expect(reconciled.params.base_value).toBe("1.5");
    expect(reconciled.params).not.toHaveProperty(CUSTOM_PARAM_DEFINITIONS_KEY);
  });

  test("模板带 custom 标记时回写参数表快照（reconcile 分支）", () => {
    const reconciled = reconcileNodeWithEffectiveTemplateDefinition(probeNode({}), customTemplate, [customTemplate]);
    const stored = JSON.parse(reconciled.params[CUSTOM_PARAM_DEFINITIONS_KEY]);
    expect(stored.map((definition: DeviceParameterDefinition) => definition.enName))
      .toEqual(expect.arrayContaining(["base_value"]));
  });

  test("实例带 _customDeviceTemplate=1 时同样走自定义分支（模板没打 custom 标记也算）", () => {
    // 这条最容易在重构时被漏：模板侧的标记会随「转为内置」丢，实例侧的这个标记不会
    const reconciled = reconcileNodeWithEffectiveTemplateDefinition(
      probeNode({ [CUSTOM_DEVICE_TEMPLATE_KEY]: "1" }),
      asBuiltIn,
      [asBuiltIn]
    );
    expect(reconciled.params).toHaveProperty(CUSTOM_PARAM_DEFINITIONS_KEY);
  });

  test("实例已带参数表快照时走自定义分支，且快照不被就地改写", () => {
    const first = reconcileNodeWithEffectiveTemplateDefinition(probeNode({}), customTemplate, [customTemplate]);
    const snapshot = first.params[CUSTOM_PARAM_DEFINITIONS_KEY];
    const second = reconcileNodeWithEffectiveTemplateDefinition(first, customTemplate, [customTemplate]);
    expect(second).toBe(first);
    expect(second.params[CUSTOM_PARAM_DEFINITIONS_KEY]).toBe(snapshot);
  });

  test("三个信号里任意一个单独出现都足以走自定义分支", () => {
    // 上一条是先 reconcile 一次才带上快照的；这里补一条「进来时就只带快照」的：
    // 模板没打 custom 标记、实例也没打模板标记，全靠 params 里存着的那份定义快照
    const onlySnapshot = reconcileNodeWithEffectiveTemplateDefinition(
      probeNode({ [CUSTOM_PARAM_DEFINITIONS_KEY]: "[]" }),
      asBuiltIn,
      [asBuiltIn]
    );
    expect(onlySnapshot.params[CUSTOM_PARAM_DEFINITIONS_KEY]).not.toBe("[]");
  });

  test("内置分支不物化定义元键（name 是节点字段，不是可写进 params 的参数）", () => {
    // 全部内置模板的生效定义里都有一条 enName="name"。少了这层过滤，
    // 加载项目就会给每个设备实例凭空塞一个 params.name，和节点自身的 name 打架。
    // 注意必须先删掉两个自定义信号，否则 createDefaultNode 自带的
    // _customParamDefinitions 会把实例送进自定义分支，这条就测不到 materialize 了。
    const loadTemplate = DEVICE_LIBRARY.find((template) => template.kind === "ac-load")!;
    const source = createDefaultNode("ac-load", { x: 0, y: 0 });
    const params = { ...source.params };
    delete params.name;
    delete params.p_min;
    delete params[CUSTOM_PARAM_DEFINITIONS_KEY];
    delete params[CUSTOM_DEVICE_TEMPLATE_KEY];

    const reconciled = reconcileNodeWithEffectiveTemplateDefinition(
      { ...source, params },
      loadTemplate,
      DEVICE_LIBRARY
    );

    expect(reconciled.params).not.toHaveProperty("name");
    // 同一次同步里普通定义照常补上，说明不是「整体没补」而是精确跳过了元键
    expect(reconciled.params.p_min).toBe("0");
  });
});

// syncDefinitionTerminals 的口径：端子数按定义重排，但端子号与电压是**实例自己的**。
// 这里错的表现是加载项目后电压全被清零、或端子号跟设备对不上，且全程无异常。
describe("reconcileNodeWithEffectiveTemplateDefinition 的端子同步", () => {
  const template = (over: Partial<DeviceTemplate>): DeviceTemplate => ({
    kind: "ac-source",
    label: "交流电源",
    categoryLibrary: "交流设备",
    size: { width: 96, height: 72 },
    params: {},
    terminalType: "ac",
    terminalCount: 2,
    ...over
  });
  const nodeWithTerminals = (terminals: ModelNode["terminals"]) => ({
    ...createDefaultNode("ac-source", { x: 0, y: 0 }),
    terminals
  });
  const t = (id: string, type: TerminalType, over: Record<string, unknown> = {}) =>
    ({ id, label: "", type, anchor: { x: 0, y: 0 }, nodeNumber: "N1", vbase: "35", ...over }) as unknown as ModelNode["terminals"][number];

  test("端子数增加时按定义补齐，已有端子的 nodeNumber 与 vbase 保留", () => {
    const node = nodeWithTerminals([t("t1", "ac", { nodeNumber: "N101", vbase: "10.5" })]);
    const reconciled = reconcileNodeWithEffectiveTemplateDefinition(node, template({ terminalCount: 3 }));
    expect(reconciled.terminals.map((item) => item.id)).toEqual(["t1", "t2", "t3"]);
    expect(reconciled.terminals[0]).toMatchObject({ nodeNumber: "N101", vbase: "10.5" });
    // 新增的端子没有可继承的对象，拿到 makeNodeNumber 新发的号（全局自增，不能钉死具体值）
    expect(reconciled.terminals[1].nodeNumber).toBeTruthy();
    expect(reconciled.terminals[1].nodeNumber).not.toBe("N101");
  });

  test("端子类型变了则 vbase 归零（电压是按端型定义的，不能跨型继承）", () => {
    const node = nodeWithTerminals([t("t1", "ac", { vbase: "10.5" }), t("t2", "ac", { vbase: "0.4" })]);
    const reconciled = reconcileNodeWithEffectiveTemplateDefinition(
      node,
      template({ terminalCount: 2, terminalTypes: ["dc", "dc"] })
    );
    expect(reconciled.terminals[0].vbase).toBe("0");
    expect(reconciled.terminals[1].vbase).toBe("0");
  });

  test("terminalCount 减小时多出来的端子直接丢弃", () => {
    const node = nodeWithTerminals([t("t1", "ac"), t("t2", "ac"), t("t3", "ac")]);
    const reconciled = reconcileNodeWithEffectiveTemplateDefinition(node, template({ terminalCount: 1 }));
    expect(reconciled.terminals).toHaveLength(1);
  });

  test("terminalCount 夹在 [0, 8]，不会因为定义写了 12 就生成 12 个端子", () => {
    const node = nodeWithTerminals([]);
    const reconciled = reconcileNodeWithEffectiveTemplateDefinition(node, template({ terminalCount: 12 }));
    expect(reconciled.terminals).toHaveLength(8);
    expect(reconcileNodeWithEffectiveTemplateDefinition(node, template({ terminalCount: -3 })).terminals).toHaveLength(0);
  });

  // 变异验证补记：`syncDefinitionTerminals` 里 `Math.max(0, Math.min(8, …))` 那个夹取，
  // 去掉任一半仍然全绿 —— `createTerminals` 自己就把 count 夹在 [0, 8]，且 count 只被
  // 用于 defaultTerminalAnchor（count≠1 时两半结果相同）与长度比较。属等价变异，
  // 别把它当成「夹取有覆盖」的证据。

  test("terminalCount 非有限（缺失/NaN）时端子原样不动", () => {
    const node = nodeWithTerminals([t("t1", "ac", { nodeNumber: "N777" })]);
    const reconciled = reconcileNodeWithEffectiveTemplateDefinition(
      node,
      template({ terminalCount: Number.NaN as never })
    );
    expect(reconciled.terminals[0].nodeNumber).toBe("N777");
  });

  test("端型四级兜底：terminalType → terminalTypes[0] → 实例首端子 → 兜底 ac", () => {
    const node = nodeWithTerminals([t("t1", "heat")]);
    const onlyTerminalTypes = reconcileNodeWithEffectiveTemplateDefinition(
      node,
      template({ terminalCount: 1, terminalType: undefined as never, terminalTypes: ["h2"] })
    );
    expect(onlyTerminalTypes.terminals[0].type).toBe("h2");

    const fromInstance = reconcileNodeWithEffectiveTemplateDefinition(
      node,
      template({ terminalCount: 1, terminalType: undefined as never, terminalTypes: undefined })
    );
    expect(fromInstance.terminals[0].type).toBe("heat");

    const fallbackAc = reconcileNodeWithEffectiveTemplateDefinition(
      nodeWithTerminals([]),
      template({ terminalCount: 1, terminalType: undefined as never, terminalTypes: undefined })
    );
    expect(fallbackAc.terminals[0].type).toBe("ac");
  });

  test("端子标签优先用定义里的 terminalLabels，缺失时按端型生成", () => {
    const node = nodeWithTerminals([]);
    const withLabels = reconcileNodeWithEffectiveTemplateDefinition(
      node,
      template({ terminalCount: 2, terminalLabels: ["交流端", "直流端"] })
    );
    expect(withLabels.terminals.map((item) => item.label)).toEqual(["交流端", "直流端"]);

    const generated = reconcileNodeWithEffectiveTemplateDefinition(
      node,
      template({ terminalCount: 1, terminalTypes: ["dc"], terminalLabels: undefined })
    );
    expect(generated.terminals[0].label).toContain("直流");
  });
});

// ============================================================================
// reconcileNodesWithEffectiveTemplateDefinitions 的 kind 落空分支。
//
// 该分支的判据是「本次传入的 templates 里查不到这个 kind」，**不是**「这个 kind
// 全库都没有」。查不到时会退回按节点自带的 storedDefinitions 重算参数表：
//   · 存不出任何定义 → 直接原样返回该节点（早退）；
//   · 存得出定义     → 拿存出来的定义当新定义表重算，于是**存表里已经没有的
//                      旧参数会被回收（从 params 里删掉）**。
// 零覆盖的正是这条链：早退那一步此前没有任何用例走进去，而回收那一步此前只有
// 「补默认值」的用例（补出来的），从没验过「被删掉的」。
// ============================================================================

// 回收用的存表：p_set 在 DCAC 段会被 normalizeDcacControlParameterDefinitions
// 直接丢弃（该函数对 p_set/i_set/v_set 等返回 null），于是它就成了「存表里有、
// 生效定义表里没有」的孤儿参数 —— 正是回收分支的靶子。
const orphanSnapshot: DeviceParameterDefinition[] = [
  { cnName: "有功设定", enName: "p_set", valueType: "float", typicalValue: "3" },
  { cnName: "保留字段", enName: "keep_me", valueType: "float", typicalValue: "3" }
];

// 关键：组件库参数走 component_type，让 inferESection 判成 DCACConverter ——
// 未知 kind 本身推不出段，但段是由 params 推的，所以照样能触发那条归一化。
const orphanNode = (params: Record<string, string>): ModelNode => ({
  ...createDefaultNode("ac-load", { x: 0, y: 0 }),
  kind: "totally-unknown-kind",
  params: {
    component_type: "DCACConverter",
    // 用户把 keep_me 改成了 9（≠ typicalValue 3）。断言它保持 9 而不是被回写成 3，
    // 才能区分「回收孤儿」与「把整表重置成默认值」两种截然不同的错法。
    keep_me: "9",
    ...params
  }
});

describe("reconcileNodesWithEffectiveTemplateDefinitions 的 kind 落空分支", () => {
  test("未知 kind 带存表时，存表里已不存在的孤儿参数被回收删除（快照同步收窄）", () => {
    const node = orphanNode({
      p_set: "5",
      [CUSTOM_PARAM_DEFINITIONS_KEY]: JSON.stringify(orphanSnapshot)
    });
    const input = [node];

    const reconciled = reconcileNodesWithEffectiveTemplateDefinitions(input, [])[0];

    // ① 回收本体：p_set 被**删除**，不是被置空。用 hasOwnProperty 断言，
    //    只断言 params.p_set === undefined 的话，「键还在、值没了」也会绿。
    expect(Object.prototype.hasOwnProperty.call(reconciled.params, "p_set")).toBe(false);
    expect(reconciled.params).not.toHaveProperty("p_set");

    // ② 对照：仍在生效定义表里的字段，用户改过的值原样保留（没被 typicalValue 覆盖）。
    expect(reconciled.params.keep_me).toBe("9");

    // ③ 存表本身也同步收窄 —— 注意是**改写**不是整体删除：
    //    reconcileNodeParamsWithTemplateDefinitions 只在 nextDefinitions 为空时
    //    才 delete 这个键；这里存表非空，所以字段保留、内容去掉了 p_set。
    expect(reconciled.params).toHaveProperty(CUSTOM_PARAM_DEFINITIONS_KEY);
    expect(
      JSON.parse(reconciled.params[CUSTOM_PARAM_DEFINITIONS_KEY]).map(
        (definition: DeviceParameterDefinition) => definition.enName
      )
    ).toEqual(["keep_me"]);

    // ④ 入参节点没被就地改写（copy-on-write）。
    expect(node.params.p_set).toBe("5");
    expect(node.params[CUSTOM_PARAM_DEFINITIONS_KEY]).toBe(JSON.stringify(orphanSnapshot));
  });

  test("未知 kind 不带存表时原样保留：既不改 params 也不换节点引用", () => {
    const node: ModelNode = {
      ...createDefaultNode("ac-load", { x: 0, y: 0 }),
      kind: "totally-unknown-kind",
      params: { stray: "1" }
    };
    const input = [node];

    const reconciled = reconcileNodesWithEffectiveTemplateDefinitions(input, [])[0];

    // toBe（引用相等）而非 toEqual：这条断言的全部意义就是「没重建」。
    // 只断言 toEqual 的话，即使每次都 new 一个新对象也照样绿。
    expect(reconciled).toBe(node);
    expect(reconciled.params.stray).toBe("1");
    expect(reconciled.params).not.toHaveProperty(CUSTOM_PARAM_DEFINITIONS_KEY);
  });

  test("存表解析后为空数组时同样走早退，快照不被清掉", () => {
    // 与上一条的区别：这里 _customParamDefinitions 键**存在**但内容是空表。
    // 覆盖的是 storedDefinitions.length === 0 这一步，而不是「键不存在」那条路 ——
    // 后者 JSON.parse 失败与前者解析出空数组，落到同一个早退，但是不同输入。
    const node: ModelNode = {
      ...createDefaultNode("ac-load", { x: 0, y: 0 }),
      kind: "totally-unknown-kind",
      params: { [CUSTOM_PARAM_DEFINITIONS_KEY]: "[]", stray: "1" }
    };
    const input = [node];

    const reconciled = reconcileNodesWithEffectiveTemplateDefinitions(input, [])[0];

    expect(reconciled).toBe(node);
    // 早退意味着连空快照都不动；若改成无条件重算，这里会被删掉。
    expect(reconciled.params[CUSTOM_PARAM_DEFINITIONS_KEY]).toBe("[]");
  });

  test("判据是本次 templates 查不到，不是全库查不到：内置 kind 传空模板表仍走存表重算", () => {
    // 这一条容易被误读成「未知 kind = 全库没有」。实际上 resolveNodeParameterDefinitions
    // 内部会退回 DEVICE_LIBRARY 兜底，所以传空 templates 时，一个内置 kind 依然能
    // 解析出生效定义，走的是**重算**而不是早退。写错这条就会把早退的适用范围记反。
    const loadTemplate = DEVICE_LIBRARY.find((candidate) => candidate.kind === "ac-load")!;
    const source = createDefaultNode("ac-load", { x: 0, y: 0 });
    const params = { ...source.params };
    for (const key of ["p_min", "q_min", "rated_capacity"]) {
      delete params[key];
    }
    const node: ModelNode = { ...source, params };

    const reconciled = reconcileNodesWithEffectiveTemplateDefinitions([node], [])[0];

    // 不是早退（引用没换），但三个缺失默认值被补上了。
    expect(reconciled).not.toBe(node);
    expect(reconciled.params.p_min).toBe("0");
    expect(reconciled.params.q_min).toBe("0");
    expect(reconciled.params.rated_capacity).toBe(
      String(resolveEffectiveTemplateParameterDefinitions(loadTemplate, DEVICE_LIBRARY)
        .find((definition) => definition.enName === "rated_capacity")?.typicalValue)
    );
  });

  test("changed 为假时返回入参数组本身，不复制", () => {
    // 先跑一遍拿到「已收敛」的节点，第二次才是真正的「全都不需要变更」场景。
    // 若节点其实还需变更，这两条会同时红，所以它顺带也证明了第一次确实收敛了。
    const source = createDefaultNode("ac-load", { x: 0, y: 0 });
    const settled = reconcileNodesWithEffectiveTemplateDefinitions([source], DEVICE_LIBRARY)[0];
    const stableOrphan: ModelNode = {
      ...createDefaultNode("ac-load", { x: 1, y: 1 }),
      kind: "totally-unknown-kind",
      params: { stray: "1" }
    };
    const input: ModelNode[] = [settled, stableOrphan];

    const reconciled = reconcileNodesWithEffectiveTemplateDefinitions(input, DEVICE_LIBRARY);

    // toBe：核心断言。toEqual 在这里恒绿，证明不了「没有无谓复制」。
    expect(reconciled).toBe(input);
    expect(reconciled[0]).toBe(settled);
    expect(reconciled[1]).toBe(stableOrphan);
  });

  test("changed 为真时返回新数组，且入参数组与入参节点都没被就地改写", () => {
    const node = orphanNode({
      p_set: "5",
      [CUSTOM_PARAM_DEFINITIONS_KEY]: JSON.stringify(orphanSnapshot)
    });
    const input = [node];
    const inputParamsSnapshot = { ...node.params };

    const reconciled = reconcileNodesWithEffectiveTemplateDefinitions(input, []);

    expect(reconciled).not.toBe(input);
    expect(reconciled[0]).not.toBe(node);
    expect(reconciled).toHaveLength(1);
    // 入参数组内容与入参节点都没被动过（输入那侧仍是孤儿参数齐全的原样）。
    expect(input).toHaveLength(1);
    expect(input[0]).toBe(node);
    expect(node.params).toEqual(inputParamsSnapshot);
    expect(input[0].params.p_set).toBe("5");
    // 输出侧才是回收后的结果 —— 确认上一条不是「压根没跑」。
    expect(reconciled[0].params).not.toHaveProperty("p_set");
  });

  test("空数组、单节点、重复 id：逐位置处理，不按 id 去重", () => {
    // 空数组
    const empty: ModelNode[] = [];
    expect(reconcileNodesWithEffectiveTemplateDefinitions(empty, DEVICE_LIBRARY)).toBe(empty);

    // 单节点（需要变更）
    const single = orphanNode({
      p_set: "5",
      [CUSTOM_PARAM_DEFINITIONS_KEY]: JSON.stringify(orphanSnapshot)
    });
    const singleOut = reconcileNodesWithEffectiveTemplateDefinitions([single], []);
    expect(singleOut).toHaveLength(1);
    expect(singleOut[0].params).not.toHaveProperty("p_set");

    // 重复 id：实现是 nodes.map，纯位置驱动，从不按 id 建索引。
    // 两个节点共用一个 id，一个要被回收、一个不带存表走早退 ——
    // 若实现偷偷按 id 去重或建 Map，第二个节点就会被第一个的结果顶掉。
    const sharedId = single.id;
    const dirty = orphanNode({
      p_set: "5",
      [CUSTOM_PARAM_DEFINITIONS_KEY]: JSON.stringify(orphanSnapshot)
    });
    dirty.id = sharedId;
    const clean: ModelNode = {
      ...createDefaultNode("ac-load", { x: 2, y: 2 }),
      id: sharedId,
      kind: "another-unknown-kind",
      params: { stray: "1" }
    };
    const dupInput: ModelNode[] = [dirty, clean];

    const dupOut = reconcileNodesWithEffectiveTemplateDefinitions(dupInput, []);

    expect(dupOut).toHaveLength(2);
    expect(dupOut).not.toBe(dupInput);
    // 位置 0 走回收，位置 1 走早退 —— 两者互不干扰。
    expect(dupOut[0].params).not.toHaveProperty("p_set");
    expect(dupOut[1]).toBe(clean);
    expect(dupOut[0].id).toBe(dupOut[1].id);
  });

  test("单数版与复数版对同一个已知 kind 的产出完全一致", () => {
    // 复数版在查到模板时就是拿同一个模板调单数版，所以两者语义应当等价。
    // 差别只在复数版多一条「查不到模板」的分支 —— 那是单数版签名（必须传模板）
    // 根本无法表达的，不构成不一致。
    const cases: Array<{ kind: string; drop: string[] }> = [
      { kind: "ac-load", drop: ["p_min", "q_min", "rated_capacity"] },
      { kind: "static-button", drop: ["fillColor"] }
    ];

    for (const { kind, drop } of cases) {
      const template = DEVICE_LIBRARY.find((candidate) => candidate.kind === kind)!;
      const source = createDefaultNode(kind as never, { x: 11, y: 13 });
      const params = { ...source.params };
      for (const key of drop) {
        delete params[key];
      }
      const node: ModelNode = { ...source, params };

      const plural = reconcileNodesWithEffectiveTemplateDefinitions([node], DEVICE_LIBRARY)[0];
      const singular = reconcileNodeWithEffectiveTemplateDefinition(node, template, DEVICE_LIBRARY);

      expect(plural, kind).toEqual(singular);
      // 两者都不是空转：确实补上了缺的那个字段。
      for (const key of drop) {
        expect(Object.prototype.hasOwnProperty.call(plural.params, key), `${kind}.${key}`).toBe(true);
      }
    }
  });
});
