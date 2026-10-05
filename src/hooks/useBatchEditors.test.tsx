import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { describe, expect, test, vi } from "vitest";

import { createDefaultNode, DEVICE_LIBRARY, getTemplateParameterDefinitions, getTemplateStateDefinitions, type DeviceKind, type DeviceParameterDefinition, type DeviceTemplate, type ModelNode, type SavedSchemeRecord } from "../model";
import type { BatchCommonMeasurementGroupRow, BatchCommonParamRow } from "../App";
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
    ["ac-station-source", "11", "11 / 方案一 / 厂站模型甲"],
    ["dc-feeder-load", "22", "22 / 方案一 / 馈线模型乙"],
    ["ac-district-load", "33", "33 / 方案一 / 台区模型丙"]
  ] as const)("filters %s model_id options by model type", (kind, expectedValue, expectedLabel) => {
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

    expect(definition).toMatchObject({ valueType: "integer" });
    expect(html).toContain('class="inline-property-value"');
    expect(html).toContain("请选择关联模型");
    expect(html).toContain(`data-inline-option-values="|${expectedValue}"`);
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

    expect(html).toContain('class="inline-property-value read-only"');
    expect(html).toContain("已有线路连接");
  });

  test("shows the complete nested scheme path so same-name models remain distinguishable", () => {
    const nestedSchemes = [{
      id: "root-plan",
      name: "多级方案",
      updatedAt: "2026-08-22T00:00:00.000Z",
      projects: [],
      children: [{
        id: "north-region",
        name: "北区",
        updatedAt: "2026-08-22T00:00:00.000Z",
        projects: [{
          id: "station-51",
          name: "同名厂站",
          updatedAt: "2026-08-22T00:00:00.000Z",
          project: { version: 1, name: "同名厂站", idx: 51, modelType: "厂站", nodes: [], edges: [] }
        }],
        children: []
      }, {
        id: "south-region",
        name: "南区",
        updatedAt: "2026-08-22T00:00:00.000Z",
        projects: [],
        children: [{
          id: "south-subregion",
          name: "片区二",
          updatedAt: "2026-08-22T00:00:00.000Z",
          projects: [{
            id: "station-52",
            name: "同名厂站",
            updatedAt: "2026-08-22T00:00:00.000Z",
            project: { version: 1, name: "同名厂站", idx: 52, modelType: "厂站", nodes: [], edges: [] }
          }],
          children: []
        }]
      }]
    }] as SavedSchemeRecord[];
    const node = createDefaultNode("ac-station-source", { x: 100, y: 100 });
    const template = DEVICE_LIBRARY.find((item) => item.kind === node.kind)!;
    const definition = template.parameterDefinitions?.find((item) => item.enName === "model_id");
    const html = batchParamHtml([node], {
      key: "model_id",
      label: "关联模型",
      value: "",
      mixed: false,
      definition
    }, undefined, nestedSchemes);

    expect(html).toContain("data-inline-option-values=\"|51|52\"");
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
    expect(html).toContain("data-inline-option-values=\"11|22|33|44\"");
    expect(html).toContain("22 / 方案一 / 馈线模型乙");
  });

  test("shows the complete nested scheme path for parent options", () => {
    const nestedSchemes = [{
      id: "root-plan",
      name: "多级方案",
      updatedAt: "2026-08-22T00:00:00.000Z",
      projects: [],
      children: [{
        id: "north-region",
        name: "北区",
        updatedAt: "2026-08-22T00:00:00.000Z",
        projects: [{
          id: "station-51",
          name: "同名厂站",
          updatedAt: "2026-08-22T00:00:00.000Z",
          project: { version: 1, name: "同名厂站", idx: 51, modelType: "厂站", nodes: [], edges: [] }
        }],
        children: []
      }, {
        id: "south-region",
        name: "南区",
        updatedAt: "2026-08-22T00:00:00.000Z",
        projects: [],
        children: [{
          id: "south-subregion",
          name: "片区二",
          updatedAt: "2026-08-22T00:00:00.000Z",
          projects: [{
            id: "station-52",
            name: "同名厂站",
            updatedAt: "2026-08-22T00:00:00.000Z",
            project: { version: 1, name: "同名厂站", idx: 52, modelType: "厂站", nodes: [], edges: [] }
          }],
          children: []
        }]
      }]
    }] as SavedSchemeRecord[];
    const node = createDefaultNode("ac-load", { x: 100, y: 100 });
    const template = DEVICE_LIBRARY.find((item) => item.kind === node.kind)!;
    const definition = getTemplateParameterDefinitions(template).find((item) => item.enName === "parent");
    const html = batchParamHtml([node], {
      key: "parent",
      label: "所属模型",
      value: "52",
      mixed: false,
      definition
    }, undefined, nestedSchemes);

    expect(html).toContain("data-inline-option-values=\"51|52\"");
    expect(html).toContain("52 / 多级方案 / 南区 / 片区二 / 同名厂站");
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

    expect(html).toContain('class="inline-property-value read-only" title="全局线路的所属模型固定为 0。"');
    expect(html).toContain("0 / 全局线路");
  });
});

function batchParamOptions(
  nodes: ModelNode[],
  row: BatchCommonParamRow,
  libraryTemplateByKind = new Map(DEVICE_LIBRARY.map((template) => [template.kind, template]))
): string[] {
  const html = batchParamHtml(nodes, row, libraryTemplateByKind);
  const match = html.match(/data-inline-option-values="([^"]*)"/);
  return match ? match[1].split("|") : [];
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

    expect(html).toContain("非法历史值：BAD");
    expect(html).toContain('data-inline-option-values="BAD|P|FLOW"');
  });

  test("limits AC generators to PV PQ and PH", () => {
    expect(batchControlTypeOptions(["ac-wind-source", "ac-wind-source"], ["PV", "PV"])).toEqual(["PV", "PQ", "PH"]);
  });

  test("limits DC generators to P V I and NONE", () => {
    expect(batchControlTypeOptions(["dc-storage", "dc-storage"], ["V", "V"])).toEqual(["P", "V", "I", "NONE"]);
  });

  test("unions only the selected AC and DC generator control types", () => {
    expect(batchControlTypeOptions(["ac-wind-source", "dc-storage"], ["PV", "V"])).toEqual([
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
    } as BatchCommonParamRow)).toEqual(["AUTO", "MANUAL", "REMOTE", "LOCAL"]);
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
    }, libraryTemplateByKind)).toEqual(["RUN", "STOP", "CHARGE", "DISCHARGE"]);
  });

  test("uses closed_status rather than status for switch visual-state choices", () => {
    const switchNode = createDefaultNode("ac-switch", { x: 100, y: 100 });
    switchNode.params.status = "1";
    switchNode.params.closed_status = "2";
    const libraryTemplateByKind = new Map<DeviceKind, DeviceTemplate>(
      DEVICE_LIBRARY.map((template) => [template.kind, template])
    );
    libraryTemplateByKind.set("ac-switch", {
      ...libraryTemplateByKind.get("ac-switch")!,
      stateDefinitions: [
        { value: "0", name: "打开" },
        { value: "1", name: "闭合" },
        { value: "2", name: "检修" }
      ]
    });

    expect(batchParamOptions([switchNode], {
      key: "closed_status",
      label: "开合状态量测值",
      value: "2",
      mixed: false,
      definition: undefined
    }, libraryTemplateByKind)).toEqual(["0", "1", "2"]);

    expect(batchParamOptions([switchNode], {
      key: "status",
      label: "状态",
      value: "1",
      mixed: false,
      definition: undefined
    }, libraryTemplateByKind)).toEqual(["1", "0"]);
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
    expect(html).toContain('>50</button>');

    editors.updateNodeDoubleClickDraftParam(node.id, "soc", "99%");
    const committedDraft = nextDraft as { nodeId: string; node: ModelNode } | null;
    expect(committedDraft?.node.params.soc).toBe("0.99");
  });
});

function batchMeasurementHtml(node: ModelNode, rows: BatchCommonMeasurementGroupRow[]): string {
  const editors = useBatchEditors({
    isBrowseMode: false,
    activeSelectedNodeIds: [node.id],
    nodeById: new Map([[node.id, node]]),
    selectedNode: node,
    inspectorSelectedNode: node,
    selectedNodeIdsWithMeasurementGroups: new Set([node.id]),
    batchCommonGraphicParamRows: [],
    batchCommonModelParamRows: [],
    batchCommonMeasurementGroupRows: rows,
    batchCommonPropertyRowCount: rows.length,
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
    libraryTemplateByKind: new Map(DEVICE_LIBRARY.map((template) => [template.kind, template]))
  });
  return renderToStaticMarkup(createElement("div", null, editors.renderBatchCommonPropertyPanel()));
}

function templateLibrary(overrides: Record<string, Partial<DeviceTemplate>> = {}): Map<string, DeviceTemplate> {
  return new Map<string, DeviceTemplate>(DEVICE_LIBRARY.map((template) => [
    template.kind,
    { ...template, ...overrides[template.kind] }
  ]));
}

// 行内编辑器在值为空串时渲染 U+00A0（源码里是 `shownValue || "\u00a0"`）。
// 用 fromCharCode 写出来，免得在测试源码里埋一个看不见的不间断空格。
const NBSP_BUTTON = `>${String.fromCharCode(160)}</button>`;

describe("batch numeric display fallback", () => {
  test("keeps the raw digit string for a measurement value whose Number() overflows to Infinity", () => {
    const node = createDefaultNode("ac-load", { x: 100, y: 100 });
    const overflow = "9".repeat(400);

    // 前提：这条输入同时满足「匹配行内数字正则」与「Number() 溢出」。
    // 真正证明它落在那条缝上的，是下面 2.50 → 2.5 的对照：普通小数在两侧行为一致，
    // 只有溢出会分叉 —— 所以这里刻意不复刻 INLINE_NUMERIC_PATTERN。
    expect(Number(overflow)).toBe(Infinity);

    const html = batchMeasurementHtml(node, [{ key: "borderWidth", label: "线宽", value: overflow, mixed: false }]);

    expect(html).toContain(`>${overflow}</button>`);
    expect(html).not.toContain("Infinity");
    expect(batchMeasurementHtml(node, [{ key: "borderWidth", label: "线宽", value: "2.50", mixed: false }]))
      .toContain(">2.5</button>");
  });

  test("renders a missing measurement value as blank rather than the text undefined", () => {
    const node = createDefaultNode("ac-load", { x: 100, y: 100 });
    const html = batchMeasurementHtml(node, [
      { key: "borderWidth", label: "线宽", value: undefined as unknown as string, mixed: false }
    ]);

    expect(html).toContain(NBSP_BUTTON);
    expect(html).not.toContain("undefined");
  });

  test("小数格式化只有一个实现：Hook 直接用共享纯函数，不留本地副本", () => {
    // 守卫接线形态。变更风险：共享函数被改名/搬家时这里先红，而不是等到渲染出的
    // displayValue 悄悄多出几位小数才发现。
    const source = readFileSync(new URL("./useBatchEditors.tsx", import.meta.url), "utf8");
    expect(source).toMatch(/import \{ formatNumericAtMostThreeDecimals \} from "\.\.\/appExtracted\/appInlineUtilityFunctions";/);
    expect(source).toContain("formatNumericAtMostThreeDecimals(withoutUnit)");
    // 本地副本不得残留：正则与 toFixed(3) 都只应存在于共享函数里
    expect(source).not.toContain("INLINE_NUMERIC_PATTERN");
    expect(source).not.toContain("toFixed(3)");
    // 展示路径上共两个调用点（参数行 + 量测组行），防止「只改一个入口」的分叉
    expect(source.match(/formatNumericAtMostThreeDecimals\(/g)?.length).toBe(2);
  });
});

describe("batch param display fallback", () => {
  test("renders a missing batch param value as blank rather than the text undefined", () => {
    const node = createDefaultNode("ac-load", { x: 100, y: 100 });
    const html = batchParamHtml([node], {
      key: "custom_note",
      label: "备注",
      value: undefined as unknown as string,
      mixed: false,
      definition: undefined
    });

    expect(html).toContain(NBSP_BUTTON);
    expect(html).not.toContain("undefined");
  });
});

describe("status choices when the selected node or its template is unavailable", () => {
  const statusRow: BatchCommonParamRow = { key: "status", label: "运行状态", value: "RUN", mixed: false, definition: undefined };

  test("offers no status choices when the selected node id is missing from the node map", () => {
    const node = createDefaultNode("ac-load", { x: 100, y: 100 });
    node.params.status = "RUN";
    const library = templateLibrary({
      "ac-load": { stateDefinitions: [{ value: "RUN", name: "运行" }, { value: "STOP", name: "停运" }] }
    });

    // 对照：nodeById 里有该节点时，选项来自模板状态定义。
    expect(batchParamOptions([node], statusRow, library)).toEqual(["RUN", "STOP"]);

    // activeSelectedNodeIds 指向的 id 不在 nodeById 里 → 没有可解析的节点，
    // 也就不存在 batchParamOptionNode 与状态枚举来源。
    const html = batchParamHtml([node], statusRow, library, [], []);

    expect(html).not.toContain("data-inline-option-values");
    expect(html).toContain(">RUN</button>");
  });

  test("offers no status choices when the node kind is missing from the template library", () => {
    const node = createDefaultNode("ac-load", { x: 100, y: 100 });
    node.params.status = "RUN";
    const library = templateLibrary({
      "ac-load": { stateDefinitions: [{ value: "RUN", name: "运行" }, { value: "STOP", name: "停运" }] }
    });

    expect(batchParamOptions([node], statusRow, library)).toEqual(["RUN", "STOP"]);
    // 模板库没有 ac-load 这一行 → 查不到状态定义，只能退回空枚举。
    expect(batchParamOptions([node], statusRow, new Map<string, DeviceTemplate>())).toEqual([]);
  });

  test("falls back to the node params when the template library has no entry for its kind", () => {
    const node = createDefaultNode("ac-load", { x: 100, y: 100 });
    node.params.status = "RUN";
    // 节点自身带着开关元件参数，而 ac-load 的模板参数里没有 → 两边判定不同。
    node.params.derived_component_type = "ACSwitch";
    const library = templateLibrary({
      "ac-load": { stateDefinitions: [{ value: "RUN", name: "运行" }, { value: "STOP", name: "停运" }] }
    });

    // 有模板：按模板 kind/params 判定为非开关 → 状态行走模板状态枚举。
    expect(batchParamOptions([node], statusRow, library)).toEqual(["RUN", "STOP"]);
    // 无模板：只能回落到 node.params（判定为开关 → 该行不是视觉状态键），
    // 于是退回 PARAM_OPTIONS["status"] 的 ["1","0"]，并把非法当前值 RUN 顶到最前。
    expect(batchParamOptions([node], statusRow, new Map<string, DeviceTemplate>())).toEqual(["RUN", "1", "0"]);
  });

  test("falls back to the node kind when the template library has no entry for its kind", () => {
    const node = createDefaultNode("ac-switch", { x: 100, y: 100 });
    node.params.status = "RUN";

    // ac-switch 的 kind 本身含 switch：模板缺失时若不回落到 node.kind，
    // 该行会被误判成视觉状态键，从而拿到空枚举（[]）而不是 status 的 ["1","0"]。
    expect(batchParamOptions([node], statusRow, new Map<string, DeviceTemplate>())).toEqual(["RUN", "1", "0"]);
  });
});

describe("saved project option index guard", () => {
  test("skips saved projects whose idx is not a positive integer", () => {
    const project = (id: string, name: string, idx: number) => ({
      id,
      name,
      updatedAt: "2026-08-18T00:00:00.000Z",
      project: { version: 1, name, idx, modelType: "厂站", nodes: [], edges: [] }
    });
    const schemes = [{
      id: "scheme-1",
      name: "方案一",
      updatedAt: "2026-08-18T00:00:00.000Z",
      projects: [
        project("zero", "零号模型", 0),
        project("fraction", "小数模型", 3.5),
        project("nan", "非数模型", Number.NaN),
        project("valid", "正常模型", 22)
      ],
      children: []
    }] as SavedSchemeRecord[];
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
    }, undefined, schemes);

    // 0（非正整数）、3.5（非整数）、NaN（非整数）三种越界取值都必须被滤掉，只剩 22。
    expect(html).toContain('data-inline-option-values="22"');
    expect(html).not.toContain("零号模型");
    expect(html).not.toContain("小数模型");
    expect(html).not.toContain("非数模型");
  });
});

describe("state name invariant", () => {
  // ⚠ 记录一个不可达分支：statusOptionLabelsForNode 里的 `state.name || state.value`
  // 兜底取不到 —— 它的唯一数据源 getTemplateStateDefinitions 两条出口都已经把 name 填满：
  //   ① normalizeDeviceStateDefinitions：`name: String(source.name ?? stateValue).trim() || stateValue`
  //   ② DEFAULT_BINARY_DEVICE_STATE_DEFINITIONS：两条硬编码状态都带中文名
  // 因此「模板里写 name: ""」也会在 normalize 那一步被补成状态值本身。
  // 下面这条断言守的是这个不变式：若哪天出现空名状态，说明该去复核这处兜底，
  // 而不是补一条恒绿的断言去假装覆盖它。
  test("every library template yields state definitions with a non-empty name", () => {
    const withEmptyName = DEVICE_LIBRARY
      .map((template) => ({ kind: template.kind, empty: getTemplateStateDefinitions(template).filter((state) => !state.name.trim()).map((state) => state.value) }))
      .filter((entry) => entry.empty.length > 0);

    expect(withEmptyName).toEqual([]);
  });
});
