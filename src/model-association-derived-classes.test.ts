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
  templateDerivedComponentLibraryInfo
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
      expect(template?.terminalAnchors).toEqual(
        expected.modelType === "馈线"
          ? [{ x: -0.5, y: 0 }]
          : baseTemplate?.terminalAnchors
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
