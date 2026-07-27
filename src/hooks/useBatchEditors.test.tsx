import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test, vi } from "vitest";

import { createDefaultNode, DEVICE_LIBRARY, type DeviceKind, type DeviceParameterDefinition, type DeviceTemplate, type ModelNode } from "../model";
import type { BatchCommonParamRow } from "../App";
import { useBatchEditors } from "./useBatchEditors";

function batchParamOptions(
  nodes: ModelNode[],
  row: BatchCommonParamRow,
  libraryTemplateByKind = new Map(DEVICE_LIBRARY.map((template) => [template.kind, template]))
): string[] {
  const firstNode = nodes[0]!;
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
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
    schemes: [],
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
  const html = renderToStaticMarkup(createElement("div", null, editors.renderBatchCommonPropertyPanel()));

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
