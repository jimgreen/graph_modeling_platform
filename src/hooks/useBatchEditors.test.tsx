import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { describe, expect, test, vi } from "vitest";

import { createDefaultNode, DEVICE_LIBRARY, getTemplateParameterDefinitions, type DeviceKind, type DeviceParameterDefinition, type DeviceTemplate, type ModelNode, type SavedSchemeRecord } from "../model";
import type { BatchCommonParamRow } from "../App";
import { useBatchEditors } from "./useBatchEditors";

describe("batch common measurement scope wiring", () => {
  test("publishes measurement rows before the render batch consumes them", () => {
    const source = readFileSync(new URL("../appExtracted/appStateBatch.tsx", import.meta.url), "utf8");
    const declarationIndex = source.indexOf("const batchCommonMeasurementGroupRows = useMemo");
    const publishIndex = source.indexOf("Object.assign(__appScope, { batchCommonMeasurementGroupRows });");

    expect(declarationIndex).toBeGreaterThan(-1);
    expect(publishIndex).toBeGreaterThan(declarationIndex);
  });
});

function batchParamHtml(
  nodes: ModelNode[],
  row: BatchCommonParamRow,
  libraryTemplateByKind = new Map(DEVICE_LIBRARY.map((template) => [template.kind, template])),
  schemes: SavedSchemeRecord[] = [],
  graphNodes: ModelNode[] = nodes
): string {
  const firstNode = nodes[0]!;
  const nodeById = new Map(graphNodes.map((node) => [node.id, node]));
  const editors = useBatchEditors({
    isBrowseMode: false,
    activeSelectedNodeIds: nodes.map((node) => node.id),
    nodeById,
    selectedNode: firstNode,
    inspectorSelectedNode: firstNode,
    selectedNodeIdsWithMeasurementGroups: new Set(),
    batchCommonGraphicParamRows: [],
    batchCommonModelParamRows: [row],
    batchCommonMeasurementGroupRows: [],
    batchCommonPropertyRowCount: 1,
    layers: [],
    schemes,
    projectMeasurements: { version: 1, groups: [] },
    nodeDoubleClickDraft: null,
    setNodeDoubleClickDraft: vi.fn(),
    updateParam: vi.fn(),
    applyBatchCommonParam: vi.fn(),
    applyBatchCommonParamPatch: vi.fn(),
    applyBatchCommonMeasurementGroupSetting: vi.fn(),
    assignSelectedNodesToModelLayer: vi.fn(),
    updateSelectedNode: vi.fn(),
    requireEditMode: () => true,
    libraryTemplateByKind
  });
  return renderToStaticMarkup(createElement("div", null, editors.renderBatchCommonPropertyPanel()));
}

const modelAssociationSchemes = [{
  id: "scheme-1",
  name: "方案一",
  updatedAt: "2026-08-18T00:00:00.000Z",
  projects: [
    { id: "station-11", name: "厂站模型甲", updatedAt: "2026-08-18T00:00:00.000Z", project: { version: 1, name: "厂站模型甲", idx: 11, modelType: "厂站", nodes: [], edges: [] } },
    { id: "feeder-22", name: "馈线模型乙", updatedAt: "2026-08-18T00:00:00.000Z", project: { version: 1, name: "馈线模型乙", idx: 22, modelType: "馈线", nodes: [], edges: [] } },
    { id: "district-33", name: "台区模型丙", updatedAt: "2026-08-18T00:00:00.000Z", project: { version: 1, name: "台区模型丙", idx: 33, modelType: "台区", nodes: [], edges: [] } },
    { id: "other-44", name: "其他模型丁", updatedAt: "2026-08-18T00:00:00.000Z", project: { version: 1, name: "其他模型丁", idx: 44, modelType: "其他", nodes: [], edges: [] } }
  ],
  children: []
}] as SavedSchemeRecord[];

describe("model association model_id editors", () => {
  test.each([
    ["ac-station-source", "11", "11 / 厂站模型甲"],
    ["dc-feeder-load", "22", "22 / 馈线模型乙"],
    ["ac-district-load", "33", "33 / 台区模型丙"]
  ] as const)("filters %s model_id number enum by model type", (kind, expectedValue, expectedLabel) => {
    const node = createDefaultNode(kind, { x: 100, y: 100 });
    const template = DEVICE_LIBRARY.find((item) => item.kind === kind)!;
    const definition = template.parameterDefinitions?.find((item) => item.enName === "model_id");
    const html = batchParamHtml([node], {
      key: "model_id",
      label: "关联模型",
      value: "",
      mixed: false,
      definition
    }, undefined, modelAssociationSchemes);

    expect(definition).toMatchObject({ valueType: "numberEnum", enumValueType: "number" });
    expect(html).toContain('<option value="" selected="">请选择关联模型</option>');
    expect(html).toContain(`<option value="${expectedValue}">${expectedLabel}</option>`);
    expect(html).not.toContain("其他模型丁");
    for (const unexpectedValue of ["11", "22", "33"].filter((value) => value !== expectedValue)) {
      expect(html).not.toContain(`<option value="${unexpectedValue}">`);
    }
  });

  test("disables model_id editors while any selected association node has a line connection", () => {
    const node = createDefaultNode("ac-station-source", { x: 100, y: 100 });
    node.params.model_id = "11";
    const line = createDefaultNode("ac-routable-line", { x: 240, y: 100 });
    line.params._routableLineSourceNodeId = node.id;
    const template = DEVICE_LIBRARY.find((item) => item.kind === node.kind)!;
    const definition = template.parameterDefinitions?.find((item) => item.enName === "model_id");
    const html = batchParamHtml([node], {
      key: "model_id",
      label: "关联模型",
      value: "11",
      mixed: false,
      definition
    }, undefined, modelAssociationSchemes, [node, line]);

    expect(html).toContain("disabled=\"\"");
    expect(html).toContain("已有线路连接");
  });
});

describe("device parent model editors", () => {
  test("uses a numeric enum containing every model idx and name", () => {
    const node = createDefaultNode("ac-load", { x: 100, y: 100 });
    node.params.parent = "22";
    const template = DEVICE_LIBRARY.find((item) => item.kind === node.kind)!;
    const definition = getTemplateParameterDefinitions(template).find((item) => item.enName === "parent");
    const html = batchParamHtml([node], {
      key: "parent",
      label: "所属模型",
      value: "22",
      mixed: false,
      definition
    }, undefined, modelAssociationSchemes);

    expect(definition).toMatchObject({
      valueType: "numberEnum",
      enumValueType: "number",
      readonly: false
    });
    expect(html).toContain('<option value="11">11 / 厂站模型甲</option>');
    expect(html).toContain('<option value="22" selected="">22 / 馈线模型乙</option>');
    expect(html).toContain('<option value="33">33 / 台区模型丙</option>');
    expect(html).toContain('<option value="44">44 / 其他模型丁</option>');
  });

  test("keeps global line parent at zero and disables its editor", () => {
    const node = createDefaultNode("ac-routable-line", { x: 100, y: 100 });
    node.params.parent = "0";
    node.params._globalLineId = "global-line-1";
    const template = DEVICE_LIBRARY.find((item) => item.kind === node.kind)!;
    const definition = getTemplateParameterDefinitions(template).find((item) => item.enName === "parent");
    const html = batchParamHtml([node], {
      key: "parent",
      label: "所属模型",
      value: "0",
      mixed: false,
      definition
    }, undefined, modelAssociationSchemes);

    expect(html).toContain('<select disabled="" title="全局线路的所属模型固定为 0。">');
    expect(html).toContain('<option value="0" selected="">0 / 全局线路</option>');
  });
});

function batchParamOptions(
  nodes: ModelNode[],
  row: BatchCommonParamRow,
  libraryTemplateByKind = new Map(DEVICE_LIBRARY.map((template) => [template.kind, template]))
): string[] {
  const html = batchParamHtml(nodes, row, libraryTemplateByKind);
  return Array.from(html.matchAll(/<option value="([^"]*)"/g), (match) => match[1]);
}

function batchControlTypeOptions(kinds: DeviceKind[], values: string[]): string[] {
  const nodes = kinds.map((kind, index) => {
    const node = createDefaultNode(kind, { x: 100 + index * 140, y: 100 });
    node.params.control_type = values[index] ?? values[0] ?? "";
    return node;
  });
  return batchParamOptions(nodes, {
    key: "control_type",
    label: "控制类型",
    value: values[0] ?? "",
    mixed: values.some((value) => value !== values[0]),
    definition: undefined
  });
}

describe("batch common generator control types", () => {
  test("shows an invalid current enum value explicitly instead of disguising it as the first option", () => {
    const node = createDefaultNode("ac-electrolyzer", { x: 100, y: 100 });
    node.params.control_type = "BAD";
    const html = batchParamHtml([node], {
      key: "control_type",
      label: "控制类型",
      value: "BAD",
      mixed: false,
      definition: undefined
    });

    expect(html).toMatch(/<option value="BAD" disabled="" selected="">非法历史值：BAD<\/option>/u);
    expect(html).toContain('<option value="P">定电功率</option>');
    expect(html).toContain('<option value="FLOW">定气流量</option>');
  });

  test("limits AC generators to PV PQ and PH", () => {
    expect(batchControlTypeOptions(["ac-wind-source", "ac-wind-source"], ["PV", "PV"])).toEqual(["PV", "PQ", "PH"]);
  });

  test("limits DC generators to P V I and NONE", () => {
    expect(batchControlTypeOptions(["dc-storage", "dc-storage"], ["V", "V"])).toEqual(["P", "V", "I", "NONE"]);
  });

  test("unions only the selected AC and DC generator control types", () => {
    expect(batchControlTypeOptions(["ac-wind-source", "dc-storage"], ["PV", "V"])).toEqual([
      "",
      "PV",
      "PQ",
      "PH",
      "P",
      "V",
      "I",
      "NONE"
    ]);
  });

  test("unions enum definitions from every selected device type", () => {
    const firstNode = createDefaultNode("ac-load", { x: 100, y: 100 });
    const secondNode = createDefaultNode("dc-load", { x: 240, y: 100 });
    firstNode.params.dispatch_mode = "AUTO";
    secondNode.params.dispatch_mode = "REMOTE";
    const definitions: DeviceParameterDefinition[] = [
      {
        cnName: "调度模式",
        enName: "dispatch_mode",
        valueType: "stringEnum",
        typicalValue: "AUTO",
        enumValues: ["AUTO", "MANUAL"]
      },
      {
        cnName: "调度模式",
        enName: "dispatch_mode",
        valueType: "stringEnum",
        typicalValue: "REMOTE",
        enumValues: ["REMOTE", "LOCAL"]
      }
    ];

    expect(batchParamOptions([firstNode, secondNode], {
      key: "dispatch_mode",
      label: "调度模式",
      value: "AUTO",
      mixed: true,
      definition: undefined,
      definitions
    } as BatchCommonParamRow)).toEqual(["", "AUTO", "MANUAL", "REMOTE", "LOCAL"]);
  });

  test("unions status enums from every selected device type", () => {
    const firstNode = createDefaultNode("ac-load", { x: 100, y: 100 });
    const secondNode = createDefaultNode("dc-load", { x: 240, y: 100 });
    firstNode.params.status = "RUN";
    secondNode.params.status = "CHARGE";
    const libraryTemplateByKind = new Map<DeviceKind, DeviceTemplate>(
      DEVICE_LIBRARY.map((template) => [template.kind, template])
    );
    libraryTemplateByKind.set("ac-load", {
      ...libraryTemplateByKind.get("ac-load")!,
      stateDefinitions: [
        { value: "RUN", name: "运行" },
        { value: "STOP", name: "停运" }
      ]
    });
    libraryTemplateByKind.set("dc-load", {
      ...libraryTemplateByKind.get("dc-load")!,
      stateDefinitions: [
        { value: "CHARGE", name: "充电" },
        { value: "DISCHARGE", name: "放电" }
      ]
    });

    expect(batchParamOptions([firstNode, secondNode], {
      key: "status",
      label: "运行状态",
      value: "RUN",
      mixed: true,
      definition: undefined
    }, libraryTemplateByKind)).toEqual(["", "RUN", "STOP", "CHARGE", "DISCHARGE"]);
  });
});

describe("ratio parameter editors", () => {
  test("displays batch SOC as a percentage and stores double-click edits as decimals", () => {
    const node = createDefaultNode("ac-storage", { x: 100, y: 100 });
    let nextDraft: { nodeId: string; node: ModelNode } | null = null;
    const setNodeDoubleClickDraft = vi.fn((updater) => {
      const current = { nodeId: node.id, node };
      nextDraft = typeof updater === "function" ? updater(current) : updater;
    });
    const editors = useBatchEditors({
      isBrowseMode: false,
      activeSelectedNodeIds: [node.id],
      nodeById: new Map([[node.id, node]]),
      selectedNode: node,
      inspectorSelectedNode: node,
      selectedNodeIdsWithMeasurementGroups: new Set(),
      batchCommonGraphicParamRows: [],
      batchCommonModelParamRows: [{
        key: "soc",
        label: "SOC",
        value: "0.5",
        mixed: false,
        definition: undefined
      }],
      batchCommonMeasurementGroupRows: [],
      batchCommonPropertyRowCount: 1,
      layers: [],
      schemes: [],
      projectMeasurements: { version: 1, groups: [] },
      nodeDoubleClickDraft: { nodeId: node.id, node },
      setNodeDoubleClickDraft,
      updateParam: vi.fn(),
      applyBatchCommonParam: vi.fn(),
      applyBatchCommonParamPatch: vi.fn(),
      applyBatchCommonMeasurementGroupSetting: vi.fn(),
      assignSelectedNodesToModelLayer: vi.fn(),
      updateSelectedNode: vi.fn(),
      requireEditMode: () => true,
      libraryTemplateByKind: new Map(DEVICE_LIBRARY.map((template) => [template.kind, template]))
    });

    const html = renderToStaticMarkup(createElement("div", null, editors.renderBatchCommonPropertyPanel()));
    expect(html).toContain('value="50%"');

    editors.updateNodeDoubleClickDraftParam(node.id, "soc", "99%");
    const committedDraft = nextDraft as { nodeId: string; node: ModelNode } | null;
    expect(committedDraft?.node.params.soc).toBe("0.99");
  });
});
