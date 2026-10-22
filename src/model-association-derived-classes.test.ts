import { describe, expect, test } from "vitest";

import {
  DEVICE_LIBRARY_BY_KIND,
  ELEMENT_TREE_COMPONENT_LIBRARY_LABELS,
  ROUTABLE_LINE_SOURCE_NODE_PARAM,
  ROUTABLE_LINE_TARGET_NODE_PARAM,
  buildEDeviceDefinitionFile,
  buildEDeviceRecords,
  createDefaultNode,
  hasDefinedModelAssociationId,
  modelAssociationDeviceAllowedInModelType,
  modelAssociationDeviceModelTypeFailureMessage,
  modelAssociationDevicesModelTypeFailureMessage,
  modelAssociationLineConnectionFailureMessage,
  modelAssociationModelIdLockMessage,
  modelAssociationModelIdLocked,
  modelAssociationModelTypeForKind,
  normalizeDefaultDeviceSize,
  parseEDeviceDefinitionFile,
  resolveEffectiveTemplateParameterDefinitionGroups,
  templateDerivedComponentLibraryInfo,
  // 走 ./model 这个统一入口，而不是直接引 ./model-routing：model.ts 末尾有
  // `export * from "./model-routing.ts"`（src/model.ts:10277），两条路径等价；
  // 但 src/model-routable-line.test.ts 等既有用例一律从 ./model 取，
  // 混用会让「这个符号到底属于哪个模块」无从判断。改模块内部结构时也不必跟着改测试的 import。
  terminalStubSegment
} from "./model";

const modelAssociationDerivedClassCases = [
  { kind: "ac-station-source", label: "交流厂站电源", baseKind: "ac-source", baseClass: "ACGenerator", derivedClass: "ACStationGen", terminalType: "ac", relationKey: "idx_acgenerator", modelType: "厂站" },
  { kind: "ac-feeder-source", label: "交流馈线电源", baseKind: "ac-source", baseClass: "ACGenerator", derivedClass: "ACFeederGen", terminalType: "ac", relationKey: "idx_acgenerator", modelType: "馈线" },
  { kind: "ac-district-source", label: "交流台区电源", baseKind: "ac-source", baseClass: "ACGenerator", derivedClass: "ACDistrictGen", terminalType: "ac", relationKey: "idx_acgenerator", modelType: "台区" },
  { kind: "dc-station-source", label: "直流厂站电源", baseKind: "dc-source", baseClass: "DCGenerator", derivedClass: "DCStationGen", terminalType: "dc", relationKey: "idx_dcgenerator", modelType: "厂站" },
  { kind: "dc-feeder-source", label: "直流馈线电源", baseKind: "dc-source", baseClass: "DCGenerator", derivedClass: "DCFeederGen", terminalType: "dc", relationKey: "idx_dcgenerator", modelType: "馈线" },
  { kind: "dc-district-source", label: "直流台区电源", baseKind: "dc-source", baseClass: "DCGenerator", derivedClass: "DCDistrictGen", terminalType: "dc", relationKey: "idx_dcgenerator", modelType: "台区" },
  { kind: "ac-station-load", label: "交流厂站负荷", baseKind: "ac-load", baseClass: "ACLoad", derivedClass: "ACStationLoad", terminalType: "ac", relationKey: "idx_acload", modelType: "厂站" },
  { kind: "ac-feeder-load", label: "交流馈线负荷", baseKind: "ac-load", baseClass: "ACLoad", derivedClass: "ACFeederLoad", terminalType: "ac", relationKey: "idx_acload", modelType: "馈线" },
  { kind: "ac-district-load", label: "交流台区负载", baseKind: "ac-load", baseClass: "ACLoad", derivedClass: "ACDistrictLoad", terminalType: "ac", relationKey: "idx_acload", modelType: "台区" },
  { kind: "dc-station-load", label: "直流厂站负荷", baseKind: "dc-load", baseClass: "DCLoad", derivedClass: "DCStationLoad", terminalType: "dc", relationKey: "idx_dcload", modelType: "厂站" },
  { kind: "dc-feeder-load", label: "直流馈线负荷", baseKind: "dc-load", baseClass: "DCLoad", derivedClass: "DCFeederLoad", terminalType: "dc", relationKey: "idx_dcload", modelType: "馈线" },
  { kind: "dc-district-load", label: "直流台区负载", baseKind: "dc-load", baseClass: "DCLoad", derivedClass: "DCDistrictLoad", terminalType: "dc", relationKey: "idx_dcload", modelType: "台区" }
] as const;

const modelAssociationVisualParams = {
  fillColor: "#eff6ff",
  strokeColor: "#2563eb",
  textColor: "#111827",
  lineWidth: "2",
  strokeStyle: "solid",
  fontSize: "16",
  fontFamily: "Arial",
  fontWeight: "500",
  fontStyle: "normal",
  textDecoration: "none",
  cornerRadius: "8",
  accentColor: "#60a5fa",
  shadowEnabled: "1",
  padding: "12",
  textAlign: "center",
  verticalAlign: "middle"
} as const;

describe("model association derived power-source and load classes", () => {
  test("rejects station/district cross-level devices and feeder-level devices in feeder models", () => {
    const forbiddenCases = [
      ...["ac-district-source", "dc-district-source", "ac-district-load", "dc-district-load"].map((kind) => ({
        modelType: "厂站",
        kind,
        message: "厂站模型不能包含台区类电源/负荷。"
      })),
      ...["ac-feeder-source", "dc-feeder-source", "ac-feeder-load", "dc-feeder-load"].map((kind) => ({
        modelType: "馈线",
        kind,
        message: "馈线模型不能包含馈线类电源/负荷。"
      })),
      ...["ac-station-source", "dc-station-source", "ac-station-load", "dc-station-load"].map((kind) => ({
        modelType: "台区",
        kind,
        message: "台区模型不能包含厂站类电源/负荷。"
      }))
    ] as const;

    for (const { modelType, kind, message } of forbiddenCases) {
      expect(modelAssociationDeviceAllowedInModelType(modelType, kind), `${modelType}:${kind}`).toBe(false);
      expect(modelAssociationDeviceModelTypeFailureMessage(modelType, kind), `${modelType}:${kind}`).toBe(message);
      expect(modelAssociationDevicesModelTypeFailureMessage(modelType, [
        createDefaultNode("ac-source", { x: 0, y: 0 }),
        createDefaultNode(kind, { x: 100, y: 0 })
      ])).toBe(message);
    }
  });

  test("allows ordinary devices, unspecified model types, and association levels not explicitly forbidden", () => {
    const allowedCases = [
      { modelType: "厂站", kind: "ac-source" },
      { modelType: "厂站", kind: "ac-station-source" },
      { modelType: "厂站", kind: "dc-feeder-load" },
      { modelType: "馈线", kind: "ac-station-load" },
      { modelType: "馈线", kind: "dc-district-source" },
      { modelType: "台区", kind: "dc-load" },
      { modelType: "台区", kind: "ac-district-load" },
      { modelType: "台区", kind: "dc-feeder-source" },
      { modelType: "", kind: "ac-feeder-source" }
    ] as const;

    for (const { modelType, kind } of allowedCases) {
      expect(modelAssociationDeviceAllowedInModelType(modelType, kind), `${modelType}:${kind}`).toBe(true);
      expect(modelAssociationDeviceModelTypeFailureMessage(modelType, kind), `${modelType}:${kind}`).toBe("");
    }
    expect(modelAssociationDevicesModelTypeFailureMessage("厂站", [
      createDefaultNode("ac-source", { x: 0, y: 0 }),
      createDefaultNode("dc-feeder-load", { x: 100, y: 0 })
    ])).toBe("");
  });

  test("defines all 12 classes as non-container derivatives of the requested four base classes", () => {
    for (const expected of modelAssociationDerivedClassCases) {
      const template = DEVICE_LIBRARY_BY_KIND.get(expected.kind);
      const baseTemplate = DEVICE_LIBRARY_BY_KIND.get(expected.baseKind);

      expect(template, expected.kind).toBeDefined();
      expect(baseTemplate, expected.baseKind).toBeDefined();
      expect(template).toMatchObject({
        kind: expected.kind,
        label: expected.label,
        componentClass: expected.derivedClass,
        terminalType: expected.terminalType,
        terminalCount: 1,
        isContainer: false,
        isDerivedComponentLibrary: true,
        derivedFromComponentLibrary: expected.baseClass,
        derivedComponentLibrary: expected.derivedClass,
        derivedComponentLibraryLabel: expected.label
      });
      expect(template?.size).toEqual(normalizeDefaultDeviceSize(expected.kind, { width: 132, height: 52 }));
      // 端子锚点按模型层级统一，而不是按基类模板继承：同一层级的电源与负荷引线方向必须一致。
      // 基类 `ac-load`/`dc-load` 是上边 {0,-0.5}，而 `ac-source`/`dc-source` 缺省（右边 {0.5,0}），
      // 直接继承会让厂站/台区出现「电源引线朝右、负荷引线朝上」的视觉不一致。
      expect(template?.terminalAnchors, expected.kind).toEqual(
        expected.modelType === "馈线" ? [{ x: -0.5, y: 0 }] : [{ x: 0, y: -0.5 }]
      );
      expect(template?.params).toMatchObject({
        ...modelAssociationVisualParams,
        text: expected.label
      });
      expect(template?.params.component_type).toBe(expected.baseClass);
      expect(template?.params).not.toHaveProperty("buttonEnabled");
      expect(template?.params).not.toHaveProperty("buttonActionType");
      expect(template?.params).not.toHaveProperty("buttonTargetProjectId");
      expect(modelAssociationModelTypeForKind(expected.kind)).toBe(expected.modelType);
      expect(templateDerivedComponentLibraryInfo(template!)).toMatchObject({
        componentLibrary: expected.baseClass,
        baseComponentLibrary: expected.baseClass,
        derivedComponentLibrary: expected.derivedClass,
        label: expected.label
      });
      expect(ELEMENT_TREE_COMPONENT_LIBRARY_LABELS[expected.derivedClass]).toBe(expected.label);
    }
  });

  test("keeps source and load glyphs of the same model level pointing the same way", () => {
    // 用户可见行为：同一层级里「电源」和「负荷」的图元外观必须一模一样 —— 图标本身同源
    // (DeviceGlyph 的 station/feeder/district 三族各一套 path)，画布上唯一的差别就是端子引线方向。
    // 引线方向由 terminals[0].anchor 决定(src/model-routing.ts:1978 terminalStubSegment)。
    const pairs = [
      ["ac-station-source", "ac-station-load"],
      ["ac-feeder-source", "ac-feeder-load"],
      ["ac-district-source", "ac-district-load"],
      ["dc-station-source", "dc-station-load"],
      ["dc-feeder-source", "dc-feeder-load"],
      ["dc-district-source", "dc-district-load"]
    ] as const;

    // 画布/导出上真正被看见的是**引线线段**，不是 anchor 数字。落盘节点实测尺寸是 150×60，
    // 这里按该尺寸再比一遍 `terminalStubSegment`，确保「引线长度 + 方向」也逐值相同。
    const savedSize = { width: 150, height: 60 };

    for (const [sourceKind, loadKind] of pairs) {
      const sourceNode = createDefaultNode(sourceKind, { x: 0, y: 0 });
      const loadNode = createDefaultNode(loadKind, { x: 0, y: 0 });
      expect(sourceNode.terminals, `${sourceKind} vs ${loadKind}`).toHaveLength(1);
      expect(loadNode.terminals, `${sourceKind} vs ${loadKind}`).toHaveLength(1);
      expect(sourceNode.terminals[0].anchor, `${sourceKind} vs ${loadKind}`)
        .toEqual(loadNode.terminals[0].anchor);
      expect(
        terminalStubSegment(sourceNode.terminals[0], 1, 1, 24, sourceKind, savedSize),
        `${sourceKind} vs ${loadKind} terminal stub`
      ).toEqual(terminalStubSegment(loadNode.terminals[0], 1, 1, 24, loadKind, savedSize));
    }

    // 具体落点：厂站/台区走「上边」(与负荷基类一致)，馈线沿用「左边」。
    expect(createDefaultNode("ac-station-source", { x: 0, y: 0 }).terminals[0].anchor).toEqual({ x: 0, y: -0.5 });
    expect(createDefaultNode("ac-district-source", { x: 0, y: 0 }).terminals[0].anchor).toEqual({ x: 0, y: -0.5 });
    expect(createDefaultNode("dc-station-source", { x: 0, y: 0 }).terminals[0].anchor).toEqual({ x: 0, y: -0.5 });
    expect(createDefaultNode("ac-feeder-source", { x: 0, y: 0 }).terminals[0].anchor).toEqual({ x: -0.5, y: 0 });
  });

  test("./model 是 ./model-routing 的再导出入口，两条路径拿到同一个函数", async () => {
    // 为什么要钉这条：本仓 22 个 src/*.test.ts 直接 `from "./model-routing"`（测路由模块本身），
    // 而 src/model-routable-line.test.ts 等既有用例从 `./model` 取 terminalStubSegment。
    // 两条路径**都合法**的前提就是 src/model.ts:10277 的 `export * from "./model-routing.ts";`。
    // 一旦这行被删，走 `./model` 的调用方会静默拿不到该符号 —— 这里用同一性断言把它钉住。
    const [modelModule, routingModule] = await Promise.all([import("./model"), import("./model-routing")]);
    expect(modelModule.terminalStubSegment).toBe(routingModule.terminalStubSegment);
  });

  test("adds model_id as the only derived-specific editable exported number enum", () => {
    for (const expected of modelAssociationDerivedClassCases) {
      const template = DEVICE_LIBRARY_BY_KIND.get(expected.kind)!;
      const groups = resolveEffectiveTemplateParameterDefinitionGroups(template);
      const modelId = groups.derivedDefinitions.find((definition) => definition.enName === "model_id");

      expect(groups.baseDefinitions.length, expected.kind).toBeGreaterThan(0);
      expect(groups.derivedDefinitions.map((definition) => definition.enName), expected.kind).toEqual(["model_id"]);
      expect(modelId).toMatchObject({
        cnName: "关联模型",
        enName: "model_id",
        valueType: "integer",
        typicalValue: "",
        readonly: false,
        exportEnabled: true,
        exportName: "model_id"
      });
    }
  });

  test("creates nodes with canonical derived metadata, dev_type, and an empty model_id", () => {
    for (const expected of modelAssociationDerivedClassCases) {
      const node = createDefaultNode(expected.kind, { x: 100, y: 100 });

      expect(node.kind).toBe(expected.kind);
      expect(node.params).toMatchObject({
        component_type: expected.baseClass,
        derived_from_component_type: expected.baseClass,
        derived_component_type: expected.derivedClass,
        derived_component_library_label: expected.label,
        is_derived_component_library: "1",
        dev_type: expected.derivedClass,
        model_id: ""
      });
      expect(node.params).not.toHaveProperty("is_container");
      expect(node.terminals).toHaveLength(1);
      expect(node.terminals[0].type).toBe(expected.terminalType);
    }
  });

  test("treats model_id as defined only when every derived association class has a positive integer reference", () => {
    for (const expected of modelAssociationDerivedClassCases) {
      const node = createDefaultNode(expected.kind, { x: 100, y: 100 });

      for (const invalidValue of ["", "   ", "0", "-1", "1.5", "unknown"]) {
        node.params.model_id = invalidValue;
        expect(hasDefinedModelAssociationId(node), `${expected.kind}:${invalidValue}`).toBe(false);
        expect(modelAssociationLineConnectionFailureMessage(node), expected.kind).toContain("未定义关联模型");
      }

      node.params.model_id = " 12 ";
      expect(hasDefinedModelAssociationId(node), expected.kind).toBe(true);
      expect(modelAssociationLineConnectionFailureMessage(node), expected.kind).toBe("");
    }

    const ordinaryNode = createDefaultNode("ac-source", { x: 100, y: 100 });
    expect(hasDefinedModelAssociationId(ordinaryNode)).toBe(true);
    expect(modelAssociationLineConnectionFailureMessage(ordinaryNode)).toBe("");
  });

  test("locks model_id only while an actual line device references the associated node", () => {
    const node = createDefaultNode("ac-station-source", { x: 100, y: 100 });
    node.params.model_id = "11";
    const line = createDefaultNode("ac-routable-line", { x: 240, y: 100 });
    line.params = {
      ...line.params,
      [ROUTABLE_LINE_SOURCE_NODE_PARAM]: node.id,
      [ROUTABLE_LINE_TARGET_NODE_PARAM]: "ordinary-target"
    };

    expect(modelAssociationModelIdLocked(node, [node])).toBe(false);
    expect(modelAssociationModelIdLocked(node, [node, line])).toBe(true);
    expect(modelAssociationModelIdLockMessage(node)).toContain("已有线路连接");

    node.params.model_id = "";
    expect(modelAssociationModelIdLocked(node, [node, line])).toBe(false);

    node.params.model_id = "11";
    expect(modelAssociationModelIdLocked(node, [node])).toBe(false);
  });

  test("exports each node as a base record plus a model-linked derived record", () => {
    const nodes = modelAssociationDerivedClassCases.map((expected, index) => {
      const node = createDefaultNode(expected.kind, { x: 100 + index * 20, y: 100 });
      node.params.idx = String(101 + index);
      node.params.model_id = String(1001 + index);
      return node;
    });
    const records = buildEDeviceRecords({
      version: 1,
      name: "模型关联派生类导出测试",
      nodes,
      edges: []
    });

    modelAssociationDerivedClassCases.forEach((expected, index) => {
      const node = nodes[index];
      const baseRecord = records.find((record) => record.id === node.id);
      const derivedRecord = records.find((record) => record.section === expected.derivedClass);

      expect(baseRecord?.section, expected.kind).toBe(expected.baseClass);
      expect(baseRecord?.params.dev_type, expected.kind).toBe(expected.derivedClass);
      expect(baseRecord?.columns, expected.kind).not.toContain("model_id");
      expect(derivedRecord?.columns, expected.kind).toEqual([
        "idx",
        expected.relationKey,
        "model_id"
      ]);
      expect(derivedRecord?.params, expected.kind).toMatchObject({
        [expected.relationKey]: node.params.idx,
        model_id: String(1001 + index)
      });
    });
  });

  test("emits derived E definitions with model_id and without duplicated base fields", () => {
    const templates = modelAssociationDerivedClassCases.flatMap((expected) => [
      DEVICE_LIBRARY_BY_KIND.get(expected.baseKind)!,
      DEVICE_LIBRARY_BY_KIND.get(expected.kind)!
    ]);
    const sections = parseEDeviceDefinitionFile(buildEDeviceDefinitionFile(templates).text);

    for (const expected of modelAssociationDerivedClassCases) {
      const derivedSection = sections.find((section) => section.componentLibrary === expected.derivedClass);

      expect(derivedSection).toMatchObject({
        kind: expected.derivedClass,
        label: expected.label,
        componentLibrary: expected.derivedClass,
        derivedFromComponentLibrary: expected.baseClass,
        isDerivedComponentLibrary: true
      });
      expect(derivedSection?.fields.map((field) => field.exportName), expected.kind).toEqual([
        "idx",
        expected.relationKey,
        "model_id"
      ]);
      expect(derivedSection?.fields.find((field) => field.exportName === "model_id")?.cnName).toBe("关联模型");
    }
  });
});
