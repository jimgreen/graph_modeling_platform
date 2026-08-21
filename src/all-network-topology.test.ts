import { readFileSync } from "node:fs";
import { describe, expect, test, vi } from "vitest";

import { loadFullModel } from "./AllNetworkTopologyDialog";

import {
  analyzeAllNetworkTopology,
  analyzeGlobalLineConsistency,
  analyzeGlobalLinesForAllNetworkTopology,
  collectAllNetworkTopologyModels,
  collectAllNetworkTopologyReferenceModels,
  defaultAllNetworkTopologySelection,
  modelForGlobalLineReference,
  referencedModelsForGlobalLines
} from "./all-network-topology";
import {
  GLOBAL_LINE_ID_PARAM,
  GLOBAL_LINE_MODEL_PAIR_PARAM,
  globalLineModelKey,
  globalLineSharedParamsFromNode,
  type GlobalLineEndpoint,
  type GlobalLineRecord,
  type GlobalLineReference
} from "./global-lines";
import {
  DEFAULT_MODEL_LAYER_ID,
  DEVICE_LIBRARY_BY_KIND,
  ROUTABLE_LINE_SOURCE_NODE_PARAM,
  ROUTABLE_LINE_SOURCE_TERMINAL_PARAM,
  createDefaultNode,
  createRoutableLineDeviceFromEndpoints,
  getTerminalPoint,
  type Edge,
  type ModelNode,
  type ModelType,
  type SavedProjectRecord,
  type SavedSchemeRecord
} from "./model";

function projectRecord(
  id: string,
  name: string,
  idx: number,
  modelType: ModelType,
  nodes: ModelNode[] = [],
  edges: Edge[] = []
): SavedProjectRecord {
  return {
    id,
    name,
    updatedAt: "2026-08-17T00:00:00.000Z",
    project: {
      version: 1,
      name,
      idx,
      modelType,
      nodes,
      edges
    }
  };
}

function connectAcLine(
  name: string,
  source: { node: ModelNode; terminalId: string },
  target: { node: ModelNode; terminalId: string }
) {
  const line = createRoutableLineDeviceFromEndpoints(
    DEVICE_LIBRARY_BY_KIND.get("ac-routable-line")!,
    getTerminalPoint(source.node, source.terminalId),
    getTerminalPoint(target.node, target.terminalId),
    DEFAULT_MODEL_LAYER_ID,
    {
      source: { nodeId: source.node.id, terminalId: source.terminalId },
      target: { nodeId: target.node.id, terminalId: target.terminalId }
    }
  );
  line.name = name;
  line.terminals = line.terminals.map((terminal) => ({ ...terminal, vbase: "10" }));
  return line;
}

function globalLineReference(
  model: {
    idx: number;
    schemePath: string[];
    name: string;
  },
  nodeId: string,
  boundaryEndpoint: GlobalLineEndpoint,
  boundaryNodeId: string,
  boundaryTerminalId: string
): GlobalLineReference {
  return {
    modelKey: globalLineModelKey(model.idx, model.schemePath, model.name),
    projectIdx: model.idx,
    schemePath: [...model.schemePath],
    projectName: model.name,
    nodeId,
    terminalSlot: boundaryEndpoint === "source" ? "i" : "j",
    boundaryEndpoint,
    boundaryNodeId,
    boundaryTerminalId
  };
}

function globalLineRecord(
  id: string,
  idx: number,
  name: string,
  line: ModelNode,
  source: GlobalLineReference | null,
  target: GlobalLineReference | null
): GlobalLineRecord {
  return {
    id,
    idx,
    name,
    energyType: "ac",
    params: globalLineSharedParamsFromNode(line),
    references: [source, target].filter(Boolean) as GlobalLineReference[],
    endpointSlots: { source, target },
    terminalSlots: { i: source, j: target },
    degree: Number(Boolean(source)) + Number(Boolean(target)),
    createdAt: "2026-08-18T00:00:00.000Z",
    updatedAt: "2026-08-18T00:00:00.000Z"
  };
}

function completeGlobalLineConsistencyFixture(id = "global-line-consistency-1") {
  const sourceBoundary = createDefaultNode("static-model-interaction-station", { x: 100, y: 100 });
  const sourceLoad = createDefaultNode("ac-load", { x: 420, y: 100 });
  const targetSource = createDefaultNode("ac-source", { x: 100, y: 260 });
  const targetBoundary = createDefaultNode("static-model-interaction-feeder", { x: 420, y: 260 });
  const sourceLine = connectAcLine(
    "跨模型一致性线路",
    { node: sourceBoundary, terminalId: "t1" },
    { node: sourceLoad, terminalId: sourceLoad.terminals[0].id }
  );
  const targetLine = connectAcLine(
    "跨模型一致性线路",
    { node: targetSource, terminalId: targetSource.terminals[0].id },
    { node: targetBoundary, terminalId: "t1" }
  );
  for (const line of [sourceLine, targetLine]) {
    line.params.idx = "71";
    line.params[GLOBAL_LINE_ID_PARAM] = id;
  }
  sourceLine.params[GLOBAL_LINE_MODEL_PAIR_PARAM] = "target";
  targetLine.params[GLOBAL_LINE_MODEL_PAIR_PARAM] = "source";
  const sourceModel = {
    projectId: "consistency-station",
    schemeId: "scheme-root",
    schemePath: ["主方案"],
    name: "一致性源厂站",
    idx: 71,
    modelType: "厂站" as const,
    record: projectRecord(
      "consistency-station",
      "一致性源厂站",
      71,
      "厂站",
      [sourceBoundary, sourceLoad, sourceLine]
    )
  };
  const targetModel = {
    projectId: "consistency-feeder",
    schemeId: "scheme-root",
    schemePath: ["主方案"],
    name: "一致性目标馈线",
    idx: 72,
    modelType: "馈线" as const,
    record: projectRecord(
      "consistency-feeder",
      "一致性目标馈线",
      72,
      "馈线",
      [targetSource, targetBoundary, targetLine]
    )
  };
  const sourceReference = globalLineReference(
    sourceModel,
    sourceLine.id,
    "source",
    sourceBoundary.id,
    "t1"
  );
  const targetReference = globalLineReference(
    targetModel,
    targetLine.id,
    "target",
    targetBoundary.id,
    "t1"
  );
  const record = globalLineRecord(
    id,
    71,
    sourceLine.name,
    sourceLine,
    sourceReference,
    targetReference
  );
  return { record, sourceLine, targetLine, sourceModel, targetModel };
}

describe("全网拓扑模型选择", () => {
  test("只展示厂站、馈线和台区，并按模型 idx 排序且默认全选", () => {
    const schemes: SavedSchemeRecord[] = [{
      id: "scheme-root",
      name: "主方案",
      updatedAt: "2026-08-17T00:00:00.000Z",
      projects: [
        projectRecord("district-1", "一号台区", 9, "台区"),
        projectRecord("other-1", "说明模型", 2, "其他"),
        projectRecord("station-1", "中心厂站", 1, "厂站")
      ],
      children: [{
        id: "scheme-child",
        name: "馈线组",
        updatedAt: "2026-08-17T00:00:00.000Z",
        projects: [
          projectRecord("microgrid-1", "园区微网", 3, "微网"),
          projectRecord("feeder-1", "十千伏一线", 5, "馈线")
        ]
      }]
    }];

    const models = collectAllNetworkTopologyModels(schemes);
    const referenceModels = collectAllNetworkTopologyReferenceModels(schemes);

    expect(models.map((model) => [model.projectId, model.modelType, model.idx, model.schemePath])).toEqual([
      ["station-1", "厂站", 1, ["主方案"]],
      ["feeder-1", "馈线", 5, ["主方案", "馈线组"]],
      ["district-1", "台区", 9, ["主方案"]]
    ]);
    expect(defaultAllNetworkTopologySelection(models)).toEqual([
      "station-1",
      "feeder-1",
      "district-1"
    ]);
    expect(referenceModels.map((model) => [model.projectId, model.modelType])).toEqual([
      ["station-1", "厂站"],
      ["other-1", "其他"],
      ["microgrid-1", "微网"],
      ["feeder-1", "馈线"],
      ["district-1", "台区"]
    ]);
  });

  test("模型选择区使用可折叠的类型与模型两级树", () => {
    const dialogSource = readFileSync(new URL("./AllNetworkTopologyDialog.tsx", import.meta.url), "utf8");
    const stylesSource = readFileSync(new URL("./styles.css", import.meta.url), "utf8");

    expect(dialogSource).toContain('role="tree"');
    expect(dialogSource).toContain('aria-level={1}');
    expect(dialogSource).toContain('aria-expanded={expanded}');
    expect(dialogSource).toContain('role="group"');
    expect(dialogSource).toContain('aria-level={2}');
    expect(dialogSource).toContain("toggleModelType(type)");
    expect(stylesSource).toContain(".all-network-topology-tree-children");
    expect(stylesSource).toContain(".all-network-topology-tree-model::before");
  });

  test("全局线路端点引用可以解析到对应模型", () => {
    const station = projectRecord("station-1", "中心厂站", 1, "厂站");
    const feeder = projectRecord("feeder-1", "十千伏一线", 5, "馈线");
    const models = collectAllNetworkTopologyReferenceModels([{
      id: "scheme-root",
      name: "主方案",
      updatedAt: "2026-08-17T00:00:00.000Z",
      projects: [station, feeder]
    }]);

    expect(modelForGlobalLineReference({
      modelKey: globalLineModelKey(5, ["主方案"], "十千伏一线"),
      projectIdx: 5,
      schemePath: ["主方案"],
      projectName: "十千伏一线",
      nodeId: "line-feeder"
    }, models)?.projectId).toBe("feeder-1");
    expect(modelForGlobalLineReference(null, models)).toBeUndefined();
    expect(modelForGlobalLineReference({
      modelKey: "model:999",
      projectIdx: 999,
      schemePath: ["主方案"],
      projectName: "不存在模型",
      nodeId: "missing-line"
    }, models)).toBeUndefined();
  });

  test("顶栏在全网拓扑左侧提供仅图标的全局线路入口和独立列表窗口", () => {
    const dialogSource = readFileSync(new URL("./AllNetworkTopologyDialog.tsx", import.meta.url), "utf8");
    const viewSource = readFileSync(new URL("./appExtracted/appView.tsx", import.meta.url), "utf8");
    const stylesSource = readFileSync(new URL("./styles.css", import.meta.url), "utf8");
    const globalLineButton = viewSource.indexOf('aria-label="全局线路"');
    const topologyButton = viewSource.indexOf('aria-label="全网拓扑"');

    expect(globalLineButton).toBeGreaterThanOrEqual(0);
    expect(topologyButton).toBeGreaterThan(globalLineButton);
    expect(viewSource).toMatch(/aria-label="全局线路"[^>]*>\s*<Cable size=\{16\}\/>\s*<\/button>/);
    expect(dialogSource).not.toContain('aria-label="打开全局线路列表"');
    expect(dialogSource).toContain("const globalLineListOpen = Boolean(scope.globalLineListOpen)");
    expect(dialogSource).toContain("loadGlobalLineRecordsForTopology()");
    expect(dialogSource).toContain("globalLineEndpointReference(record, endpoint)");
    expect(dialogSource).toContain("modelForGlobalLineReference(reference, referenceModels)");
    expect(dialogSource).toContain('aria-label="首端所在模型"');
    expect(dialogSource).toContain('aria-label="末端所在模型"');
    expect(dialogSource).toContain("const canDelete = !sourceReference && !targetReference");
    expect(dialogSource).toContain("onDeleteEmptyRecord(record)");
    expect(dialogSource).toContain("删除这条两端均为空的全局线路");
    expect(dialogSource).toContain("requestUnsavedChangeAction");
    expect(stylesSource).toContain(".all-network-topology-actions");
    expect(stylesSource).toContain(".global-line-list-window-layer");
    expect(stylesSource).toContain(".global-line-list-table");
    expect(stylesSource).toContain(".global-line-list-delete");
  });

  test("全局线路列表窗口支持标题栏拖动和八方向缩放", () => {
    const dialogSource = readFileSync(new URL("./AllNetworkTopologyDialog.tsx", import.meta.url), "utf8");
    const stylesSource = readFileSync(new URL("./styles.css", import.meta.url), "utf8");

    expect(dialogSource).toContain("defaultGlobalLineListWindowFrame");
    expect(dialogSource).toContain("clampGlobalLineListWindowFrame");
    expect(dialogSource).toContain("handleGlobalLineWindowDragPointerDown");
    expect(dialogSource).toContain("handleGlobalLineWindowResizePointerDown");
    expect(dialogSource).toMatch(/GLOBAL_LINE_WINDOW_RESIZE_DIRECTIONS\s*=\s*\["n",\s*"ne",\s*"e",\s*"se",\s*"s",\s*"sw",\s*"w",\s*"nw"\]/);
    expect(dialogSource).toContain('className={`global-line-list-resize-handle ${direction}`}');
    expect(stylesSource).toMatch(/\.global-line-list-header\s*\{[\s\S]*?cursor:\s*move[\s\S]*?touch-action:\s*none/);
    expect(stylesSource).toContain(".global-line-list-resize-handle");
    expect(stylesSource).toContain(".global-line-list-resize-handle.se");
    expect(stylesSource).toContain("cursor: nwse-resize");
  });

  test("全网拓扑窗口常驻且非阻塞并支持拖动和缩放", () => {
    const dialogSource = readFileSync(new URL("./AllNetworkTopologyDialog.tsx", import.meta.url), "utf8");
    const viewSource = readFileSync(new URL("./appExtracted/appView.tsx", import.meta.url), "utf8");
    const stylesSource = readFileSync(new URL("./styles.css", import.meta.url), "utf8");

    expect(dialogSource).not.toMatch(/if \(!open\) \{\s*return null;\s*\}/);
    expect(dialogSource).not.toContain("latestScope.setAllNetworkTopologyDialogOpen?.(false)");
    expect(dialogSource).not.toContain('aria-modal="true"');
    expect(dialogSource).toContain("all-network-topology-window-layer");
    expect(dialogSource).toContain("handleWindowDragPointerDown");
    expect(dialogSource).toContain("handleWindowResizePointerDown");
    expect(dialogSource).toContain("all-network-topology-resize-handle");
    expect(viewSource).toContain("setAllNetworkTopologyDialogOpen((current: boolean) => !current)");
    expect(viewSource).toContain('className="image-picker-backdrop unsaved-change-backdrop"');
    expect(stylesSource).toMatch(/\.all-network-topology-window-layer\s*\{[\s\S]*?pointer-events:\s*none/);
    expect(stylesSource).toMatch(/\.image-picker-backdrop\.unsaved-change-backdrop\s*\{[\s\S]*?z-index:\s*14000/);
    expect(stylesSource).toContain(".all-network-topology-resize-handle");
    expect(dialogSource).toContain("completedRun.result.errors.length > 0");
  });

  test("全网拓扑在模型拓扑完成后最后执行全局线路注册表检查", () => {
    const dialogSource = readFileSync(new URL("./AllNetworkTopologyDialog.tsx", import.meta.url), "utf8");
    const runStart = dialogSource.indexOf("const runTopology = async () =>");
    const modelTopologyCheck = dialogSource.indexOf("analyzeAllNetworkTopology(loadedModels", runStart);
    const globalLineCheck = dialogSource.indexOf("analyzeGlobalLinesForAllNetworkTopology", runStart);
    const resultMerge = dialogSource.indexOf("const nextResult =", runStart);

    expect(runStart).toBeGreaterThanOrEqual(0);
    expect(modelTopologyCheck).toBeGreaterThan(runStart);
    expect(globalLineCheck).toBeGreaterThan(modelTopologyCheck);
    expect(resultMerge).toBeGreaterThan(globalLineCheck);
  });
});

describe("全网拓扑全局线路预检查", () => {
  test("某一端为空和端点对应模型文件不存在均进入警告分页", () => {
    const templateLine = createDefaultNode("ac-routable-line", { x: 200, y: 100 });
    templateLine.name = "跨区交流一线";
    templateLine.params.idx = "21";
    templateLine.params[GLOBAL_LINE_ID_PARAM] = "global-line-21";
    const missingModel = {
      idx: 12,
      schemePath: ["主方案"],
      name: "不存在的馈线"
    };
    const sourceReference = globalLineReference(
      missingModel,
      "missing-line-node",
      "source",
      "missing-boundary-node",
      "t1"
    );
    const record = globalLineRecord(
      "global-line-21",
      21,
      templateLine.name,
      templateLine,
      sourceReference,
      null
    );

    const result = analyzeGlobalLinesForAllNetworkTopology([record], []);

    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: expect.stringContaining("missing-endpoint:target"),
        deviceName: "跨区交流一线",
        message: expect.stringMatching(/末端.*为空/)
      }),
      expect.objectContaining({
        id: expect.stringContaining("missing-model:source"),
        modelName: "不存在的馈线",
        deviceName: "跨区交流一线",
        message: expect.stringMatching(/首端.*模型文件.*不存在/)
      })
    ]));
  });

  test("模型文件存在但线路定义与全局线路定义不一致时进入错误分页", () => {
    const sourceBoundary = createDefaultNode("static-model-interaction-station", { x: 100, y: 100 });
    const sourceLoad = createDefaultNode("ac-load", { x: 420, y: 100 });
    const targetSource = createDefaultNode("ac-source", { x: 100, y: 260 });
    const targetBoundary = createDefaultNode("static-model-interaction-feeder", { x: 420, y: 260 });
    const sourceLine = connectAcLine(
      "跨区交流二线",
      { node: sourceBoundary, terminalId: "t1" },
      { node: sourceLoad, terminalId: sourceLoad.terminals[0].id }
    );
    const targetLine = connectAcLine(
      "跨区交流二线",
      { node: targetSource, terminalId: targetSource.terminals[0].id },
      { node: targetBoundary, terminalId: "t1" }
    );
    const sourceModel = {
      projectId: "station-global-source",
      schemeId: "scheme-root",
      schemePath: ["主方案"],
      name: "全局线路源厂站",
      idx: 31,
      modelType: "厂站" as const,
      record: projectRecord(
        "station-global-source",
        "全局线路源厂站",
        31,
        "厂站",
        [sourceBoundary, sourceLoad, sourceLine]
      )
    };
    const targetModel = {
      projectId: "feeder-global-target",
      schemeId: "scheme-root",
      schemePath: ["主方案"],
      name: "全局线路目标馈线",
      idx: 32,
      modelType: "馈线" as const,
      record: projectRecord(
        "feeder-global-target",
        "全局线路目标馈线",
        32,
        "馈线",
        [targetSource, targetBoundary, targetLine]
      )
    };
    for (const line of [sourceLine, targetLine]) {
      line.params.idx = "22";
      line.params[GLOBAL_LINE_ID_PARAM] = "global-line-22";
    }
    const sourceReference = globalLineReference(
      sourceModel,
      sourceLine.id,
      "source",
      sourceBoundary.id,
      "t1"
    );
    const targetReference = globalLineReference(
      targetModel,
      targetLine.id,
      "target",
      targetBoundary.id,
      "t1"
    );
    const record = globalLineRecord(
      "global-line-22",
      22,
      "跨区交流二线",
      sourceLine,
      sourceReference,
      targetReference
    );

    expect(referencedModelsForGlobalLines([record], [sourceModel, targetModel])).toEqual([
      sourceModel,
      targetModel
    ]);
    expect(analyzeGlobalLinesForAllNetworkTopology([record], [sourceModel, targetModel])).toEqual({
      errors: [],
      warnings: []
    });

    targetLine.name = "模型文件中的旧显示名";
    targetLine.params.r = "9.9";
    targetLine.params.stale_global_param = "旧模型残留";

    // 名称和全局业务参数的唯一来源是全局线路表；模型中的残留值不再属于
    // 一致性校验范围，加载时会被注册表运行态投影覆盖。
    expect(analyzeGlobalLinesForAllNetworkTopology([record], [sourceModel, targetModel])).toEqual({
      errors: [],
      warnings: []
    });
  });
});

describe("全局线路双向一致性校验", () => {
  test("全局线路表与首末端模型完全一致时不报警", () => {
    const { record, sourceModel, targetModel } = completeGlobalLineConsistencyFixture();

    expect(analyzeGlobalLineConsistency([record], [sourceModel, targetModel])).toEqual({
      errors: [],
      warnings: []
    });
  });

  test("两个模型内线路节点ID不同但全局线路ID与端点模型ID一致时不报警", () => {
    const { record, sourceLine, targetLine, sourceModel, targetModel } = completeGlobalLineConsistencyFixture(
      "same-model-endpoints-different-line-node-ids"
    );
    const targetReference = {
      ...record.endpointSlots!.target!,
      // 注册表可以保留首次创建页面的线路节点 ID；跨模型一致性不能依赖这个本地 ID。
      nodeId: sourceLine.id
    };
    const registryOwnedNodeIds = {
      ...record,
      references: record.references.map((reference) => (
        reference.boundaryEndpoint === "target" ? targetReference : reference
      )),
      endpointSlots: {
        source: record.endpointSlots!.source!,
        target: targetReference
      },
      terminalSlots: {
        i: record.endpointSlots!.source!,
        j: targetReference
      }
    };

    expect(targetLine.id).not.toBe(sourceLine.id);
    expect(analyzeGlobalLineConsistency([registryOwnedNodeIds], [sourceModel, targetModel])).toEqual({
      errors: [],
      warnings: []
    });
  });

  test("全局线路名称和参数只属于全局表，身份ID与设备idx一致时模型残留值不报警", () => {
    const { record, sourceModel, targetModel } = completeGlobalLineConsistencyFixture(
      "mutable-global-line-name"
    );
    const renamedRecord = {
      ...record,
      name: `${record.name}-new`,
      params: { ...record.params, r: "8.8", table_only_param: "全局表" }
    };

    expect(sourceModel.record.project.nodes.some((node) => node.name === record.name)).toBe(true);
    expect(analyzeGlobalLineConsistency([renamedRecord], [sourceModel, targetModel])).toEqual({
      errors: [],
      warnings: []
    });

    const sourceLine = sourceModel.record.project.nodes.find((node) => (
      node.params[GLOBAL_LINE_ID_PARAM] === record.id
    ));
    expect(sourceLine).toBeDefined();
    sourceLine!.params.idx = String(record.idx + 1);
    expect(analyzeGlobalLineConsistency([renamedRecord], [sourceModel, targetModel]).errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: expect.stringContaining("definition-mismatch:source"),
          message: expect.stringMatching(/idx不一致/)
        })
      ])
    );
  });

  test("一致性校验可强制绕过完整但陈旧的内存模型并读取后端最新文件", async () => {
    const { sourceModel } = completeGlobalLineConsistencyFixture("force-fresh-consistency-model");
    const staleRecord = sourceModel.record;
    const freshRecord = {
      ...staleRecord,
      project: {
        ...staleRecord.project,
        nodes: staleRecord.project.nodes.map((node) => ({ ...node, name: `${node.name}-fresh` }))
      }
    };
    const fetchBackendProjectRecord = vi.fn().mockResolvedValue(freshRecord);
    const scope = {
      savedProjectRecordIsSummary: vi.fn(() => false),
      fetchBackendProjectRecord
    };

    await expect(loadFullModel(scope, sourceModel)).resolves.toBe(sourceModel);
    expect(fetchBackendProjectRecord).not.toHaveBeenCalled();

    const reloaded = await loadFullModel(scope, sourceModel, true);
    expect(fetchBackendProjectRecord).toHaveBeenCalledWith(sourceModel.schemePath, sourceModel.name);
    expect(reloaded.record.project.nodes[0].name).toBe(freshRecord.project.nodes[0].name);
    expect(reloaded.record).not.toBe(staleRecord);
  });

  test("线路端点连接模型关联图元时按其model_id校验全局线路端点模型", () => {
    const { record, sourceLine, sourceModel, targetModel } = completeGlobalLineConsistencyFixture(
      "endpoint-model-id-mismatch"
    );
    const wrongAssociation = createDefaultNode("ac-station-source", { x: 100, y: 100 });
    wrongAssociation.params.model_id = "999";
    sourceModel.record.project.nodes.push(wrongAssociation);
    sourceLine.params[ROUTABLE_LINE_SOURCE_NODE_PARAM] = wrongAssociation.id;
    sourceLine.params[ROUTABLE_LINE_SOURCE_TERMINAL_PARAM] = wrongAssociation.terminals[0].id;

    const result = analyzeGlobalLineConsistency([record], [sourceModel, targetModel]);

    expect(result.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: expect.stringContaining("definition-mismatch:source"),
        message: expect.stringMatching(/端点所在模型ID不一致.*model_id=999.*model_id=71/)
      })
    ]));
  });

  test("模型中定义了全局线路但全局线路表没有对应记录时可定位模型线路", () => {
    const { sourceLine, sourceModel } = completeGlobalLineConsistencyFixture("missing-record");

    const result = analyzeGlobalLineConsistency([], [sourceModel]);

    expect(result.errors).toEqual([
      expect.objectContaining({
        id: expect.stringContaining("missing-record"),
        projectId: sourceModel.projectId,
        nodeId: sourceLine.id,
        message: expect.stringMatching(/模型.*定义.*全局线路.*全局线路表中不存在/)
      })
    ]);
  });

  test("模型线路未被全局线路表任一端引用时报警", () => {
    const { record, sourceLine, sourceModel, targetModel } = completeGlobalLineConsistencyFixture("unreferenced-model");
    const unreferencedLine = {
      ...sourceLine,
      id: "unreferenced-model-line",
      params: { ...sourceLine.params }
    };
    const unreferencedModel = {
      projectId: "unreferenced-district",
      schemeId: "scheme-root",
      schemePath: ["主方案"],
      name: "未登记台区",
      idx: 73,
      modelType: "台区" as const,
      record: projectRecord(
        "unreferenced-district",
        "未登记台区",
        73,
        "台区",
        [unreferencedLine]
      )
    };

    const result = analyzeGlobalLineConsistency(
      [record],
      [sourceModel, targetModel, unreferencedModel]
    );

    expect(result.errors).toEqual([
      expect.objectContaining({
        id: expect.stringContaining("model-unreferenced"),
        projectId: unreferencedModel.projectId,
        nodeId: unreferencedLine.id,
        message: expect.stringMatching(/未作为首端或末端引用/)
      })
    ]);
  });

  test("另一端为空或另一端模型不存在时报警仍可双击定位本端线路", () => {
    const { record, sourceLine, sourceModel } = completeGlobalLineConsistencyFixture("missing-opposite");
    const missingEndpointRecord = {
      ...record,
      references: [record.endpointSlots!.source!],
      endpointSlots: { source: record.endpointSlots!.source!, target: null },
      terminalSlots: { i: record.endpointSlots!.source!, j: null },
      degree: 1
    };
    const missingEndpoint = analyzeGlobalLineConsistency([missingEndpointRecord], [sourceModel]);

    expect(missingEndpoint.warnings).toEqual([
      expect.objectContaining({
        id: expect.stringContaining("missing-endpoint:target"),
        projectId: sourceModel.projectId,
        nodeId: sourceLine.id,
        message: expect.stringMatching(/末端为空/)
      })
    ]);

    const missingModelRecord = {
      ...record,
      references: [
        record.endpointSlots!.source!,
        {
          ...record.endpointSlots!.target!,
          modelKey: "model:9999",
          projectIdx: 9999,
          projectName: "不存在的另一端模型"
        }
      ],
      endpointSlots: {
        source: record.endpointSlots!.source!,
        target: {
          ...record.endpointSlots!.target!,
          modelKey: "model:9999",
          projectIdx: 9999,
          projectName: "不存在的另一端模型"
        }
      }
    };
    const missingModel = analyzeGlobalLineConsistency([missingModelRecord], [sourceModel]);

    expect(missingModel.warnings).toEqual([
      expect.objectContaining({
        id: expect.stringContaining("missing-model:target"),
        projectId: sourceModel.projectId,
        nodeId: sourceLine.id,
        message: expect.stringMatching(/另一端.*模型.*不存在/)
      })
    ]);
  });

  test("另一端模型缺少同一全局线路时只保留一条可定位本端的根因报警", () => {
    const { record, sourceLine, sourceModel, targetModel } = completeGlobalLineConsistencyFixture("missing-opposite-line");
    const targetWithoutLine = {
      ...targetModel,
      record: {
        ...targetModel.record,
        project: {
          ...targetModel.record.project,
          nodes: targetModel.record.project.nodes.filter((node) => node.id !== record.endpointSlots!.target!.nodeId)
        }
      }
    };

    const result = analyzeGlobalLineConsistency([record], [sourceModel, targetWithoutLine]);

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toEqual(expect.objectContaining({
      id: expect.stringContaining("other-model-missing-line:target"),
      projectId: sourceModel.projectId,
      nodeId: sourceLine.id,
      message: expect.stringMatching(/另一端模型.*缺少.*全局线路/)
    }));
  });

  test("模型声明的首末端角色与全局线路表不一致时报警", () => {
    const { record, sourceLine, sourceModel, targetModel } = completeGlobalLineConsistencyFixture("wrong-direction");
    sourceLine.params[GLOBAL_LINE_MODEL_PAIR_PARAM] = "source";

    const result = analyzeGlobalLineConsistency([record], [sourceModel, targetModel]);

    expect(result.errors).toEqual([
      expect.objectContaining({
        id: expect.stringContaining("model-direction-mismatch"),
        projectId: sourceModel.projectId,
        nodeId: sourceLine.id,
        message: expect.stringMatching(/首末端角色.*全局线路表.*不一致/)
      })
    ]);
  });

  test("全局线路窗口提供校验按钮、报警列表与双击定位入口", () => {
    const dialogSource = readFileSync(new URL("./AllNetworkTopologyDialog.tsx", import.meta.url), "utf8");
    const stylesSource = readFileSync(new URL("./styles.css", import.meta.url), "utf8");

    expect(dialogSource).toContain("analyzeGlobalLineConsistency");
    expect(dialogSource).toContain("一致性校验");
    expect(dialogSource).toContain("一致性报警");
    expect(dialogSource).toContain("runGlobalLineConsistency");
    expect(dialogSource).toContain("onDoubleClick={() => onLocateAlert(alert)}");
    expect(dialogSource).toContain("双击定位");
    expect(stylesSource).toContain(".global-line-consistency-tabs");
    expect(stylesSource).toContain(".global-line-consistency-severity");
  });

  test("切换当前模型页面或隐藏后重开时保留一致性报警，仅显式刷新时清空旧结果", () => {
    const dialogSource = readFileSync(new URL("./AllNetworkTopologyDialog.tsx", import.meta.url), "utf8");
    const modelSignatureEffectStart = dialogSource.indexOf("setSelectedProjectIds(new Set(defaultAllNetworkTopologySelection(models)))");
    const modelSignatureEffectEnd = dialogSource.indexOf("}, [modelSignature]);", modelSignatureEffectStart);
    const modelSignatureEffect = dialogSource.slice(modelSignatureEffectStart, modelSignatureEffectEnd);
    const globalLineRecordsEffectStart = dialogSource.indexOf("const currentRecords = Array.isArray(scope.globalLineRecords)");
    const globalLineRecordsEffectEnd = dialogSource.indexOf("}, [globalLineListOpen, scope.globalLineRecords]);", globalLineRecordsEffectStart);
    const globalLineRecordsEffect = dialogSource.slice(globalLineRecordsEffectStart, globalLineRecordsEffectEnd);
    const refreshStart = dialogSource.indexOf("const refreshGlobalLineList = async (clearConsistency: boolean) =>");
    const refreshEnd = dialogSource.indexOf("useEffect(() =>", refreshStart);
    const refreshBlock = dialogSource.slice(refreshStart, refreshEnd);
    const reopenEffectEnd = dialogSource.indexOf("}, [globalLineListOpen]);", refreshEnd);
    const reopenEffect = dialogSource.slice(refreshEnd, reopenEffectEnd);

    expect(modelSignatureEffect).not.toContain("setGlobalLineConsistencyResult(null)");
    expect(modelSignatureEffect).not.toContain("setGlobalLineConsistencyModels([])");
    expect(globalLineRecordsEffect).not.toContain("setGlobalLineConsistencyResult(null)");
    expect(globalLineRecordsEffect).not.toContain("setGlobalLineConsistencyModels([])");
    expect(refreshBlock).toContain("if (clearConsistency)");
    expect(refreshBlock).toContain("setGlobalLineConsistencyResult(null)");
    expect(refreshBlock).toContain("setGlobalLineConsistencyModels([])");
    expect(reopenEffect).toContain("refreshGlobalLineList(false)");
    expect(dialogSource).toContain("onRefresh={() => void refreshGlobalLineList(true)}");
  });
});

describe("全网拓扑模型层级唯一归属", () => {
  test("同一馈线出现在不同厂站或同一台区出现在不同馈线时进入错误分页", () => {
    const feederAssociationByModelId = createDefaultNode("ac-feeder-source", { x: 100, y: 100 });
    feederAssociationByModelId.name = "一号馈线电源";
    feederAssociationByModelId.params.model_id = "12";
    const feederAssociationByProjectId = createDefaultNode("static-model-interaction-feeder", { x: 200, y: 100 });
    feederAssociationByProjectId.name = "一号馈线按钮";
    feederAssociationByProjectId.params.buttonTargetProjectId = "feeder-1";
    feederAssociationByProjectId.params.buttonTargetProjectName = "十千伏一线";

    const districtAssociationByModelId = createDefaultNode("ac-district-load", { x: 100, y: 200 });
    districtAssociationByModelId.name = "一号台区负荷";
    districtAssociationByModelId.params.model_id = "23";
    const districtAssociationByName = createDefaultNode("static-model-interaction-district", { x: 200, y: 200 });
    districtAssociationByName.name = "一号台区按钮";
    districtAssociationByName.params.buttonTargetProjectName = "一号台区";

    const stationA = {
      projectId: "station-a",
      schemeId: "scheme-root",
      schemePath: ["主方案"],
      name: "中心厂站",
      idx: 1,
      modelType: "厂站" as const,
      record: projectRecord("station-a", "中心厂站", 1, "厂站", [feederAssociationByModelId])
    };
    const stationB = {
      projectId: "station-b",
      schemeId: "scheme-root",
      schemePath: ["主方案"],
      name: "备用厂站",
      idx: 2,
      modelType: "厂站" as const,
      record: projectRecord("station-b", "备用厂站", 2, "厂站", [feederAssociationByProjectId])
    };
    const feederA = {
      projectId: "feeder-1",
      schemeId: "scheme-root",
      schemePath: ["主方案"],
      name: "十千伏一线",
      idx: 12,
      modelType: "馈线" as const,
      record: projectRecord("feeder-1", "十千伏一线", 12, "馈线", [districtAssociationByModelId])
    };
    const feederB = {
      projectId: "feeder-2",
      schemeId: "scheme-root",
      schemePath: ["主方案"],
      name: "十千伏二线",
      idx: 13,
      modelType: "馈线" as const,
      record: projectRecord("feeder-2", "十千伏二线", 13, "馈线", [districtAssociationByName])
    };
    const district = {
      projectId: "district-1",
      schemeId: "scheme-root",
      schemePath: ["主方案"],
      name: "一号台区",
      idx: 23,
      modelType: "台区" as const,
      record: projectRecord("district-1", "一号台区", 23, "台区")
    };

    const result = analyzeAllNetworkTopology(
      [stationA, stationB, feederA, feederB, district],
      [stationA, stationB, feederA, feederB, district]
    );
    const conflicts = result.errors.filter((alert) => alert.id.includes("duplicate-hierarchy-parent"));

    expect(conflicts).toHaveLength(4);
    expect(conflicts.filter((alert) => alert.message.includes("馈线模型“十千伏一线”"))).toEqual([
      expect.objectContaining({
        projectId: stationA.projectId,
        modelName: stationA.name,
        nodeId: feederAssociationByModelId.id,
        message: expect.stringMatching(/中心厂站.*备用厂站.*只能归属一个厂站/)
      }),
      expect.objectContaining({
        projectId: stationB.projectId,
        modelName: stationB.name,
        nodeId: feederAssociationByProjectId.id,
        message: expect.stringMatching(/中心厂站.*备用厂站.*只能归属一个厂站/)
      })
    ]);
    expect(conflicts.filter((alert) => alert.message.includes("台区模型“一号台区”"))).toEqual([
      expect.objectContaining({
        projectId: feederA.projectId,
        modelName: feederA.name,
        nodeId: districtAssociationByModelId.id,
        message: expect.stringMatching(/十千伏一线.*十千伏二线.*只能归属一个馈线/)
      }),
      expect.objectContaining({
        projectId: feederB.projectId,
        modelName: feederB.name,
        nodeId: districtAssociationByName.id,
        message: expect.stringMatching(/十千伏一线.*十千伏二线.*只能归属一个馈线/)
      })
    ]);
    expect(result.warnings.some((alert) => alert.id.includes("duplicate-hierarchy-parent"))).toBe(false);
  });

  test("同一子模型在同一个父模型图中出现多次不判为跨模型重复归属", () => {
    const firstAssociation = createDefaultNode("ac-feeder-source", { x: 100, y: 100 });
    firstAssociation.params.model_id = "12";
    const secondAssociation = createDefaultNode("dc-feeder-load", { x: 200, y: 100 });
    secondAssociation.params.model_id = "12";
    const station = {
      projectId: "station-only",
      schemeId: "scheme-root",
      schemePath: ["主方案"],
      name: "唯一厂站",
      idx: 1,
      modelType: "厂站" as const,
      record: projectRecord("station-only", "唯一厂站", 1, "厂站", [firstAssociation, secondAssociation])
    };
    const feeder = {
      projectId: "feeder-1",
      schemeId: "scheme-root",
      schemePath: ["主方案"],
      name: "十千伏一线",
      idx: 12,
      modelType: "馈线" as const,
      record: projectRecord("feeder-1", "十千伏一线", 12, "馈线")
    };

    const result = analyzeAllNetworkTopology([station, feeder], [station, feeder]);

    expect(result.errors.some((alert) => alert.id.includes("duplicate-hierarchy-parent"))).toBe(false);
    expect(result.warnings.some((alert) => alert.id.includes("duplicate-hierarchy-parent"))).toBe(false);
  });
});

describe("全网拓扑告警分类", () => {
  test("模型关联图元按全部可用模型的同类型 idx 通过枚举校验", () => {
    const feederLoad = createDefaultNode("ac-feeder-load", { x: 100, y: 100 });
    feederLoad.name = "交流馈线负荷-1";
    feederLoad.params.model_id = "7";
    const station = {
      projectId: "station-1",
      schemeId: "scheme-root",
      schemePath: ["主方案"],
      name: "中心厂站",
      idx: 1,
      modelType: "厂站" as const,
      record: projectRecord("station-1", "中心厂站", 1, "厂站", [feederLoad])
    };
    const feeder = {
      projectId: "feeder-7",
      schemeId: "scheme-root",
      schemePath: ["主方案"],
      name: "馈线一",
      idx: 7,
      modelType: "馈线" as const,
      record: projectRecord("feeder-7", "馈线一", 7, "馈线")
    };

    const valid = analyzeAllNetworkTopology([station], [station, feeder]);
    expect(valid.errors).not.toEqual(expect.arrayContaining([
      expect.objectContaining({
        nodeId: feederLoad.id,
        topologyError: expect.objectContaining({ type: "device-enum-invalid" })
      })
    ]));

    feederLoad.params.model_id = "99";
    const invalid = analyzeAllNetworkTopology([station], [station, feeder]);
    expect(invalid.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({
        nodeId: feederLoad.id,
        message: expect.stringContaining("允许值为：7"),
        topologyError: expect.objectContaining({ type: "device-enum-invalid" })
      })
    ]));
  });

  test("把单模型拓扑检查结果放入错误分页并带上模型名和设备名", () => {
    const acSource = createDefaultNode("ac-source", { x: 100, y: 100 });
    const dcLoad = createDefaultNode("dc-load", { x: 300, y: 100 });
    acSource.name = "交流电源";
    dcLoad.name = "直流负荷";
    acSource.terminals[0].vbase = "10";
    dcLoad.terminals[0].vbase = "0.75";
    const invalidEdge: Edge = {
      id: "edge-type-mismatch",
      sourceId: acSource.id,
      targetId: dcLoad.id,
      sourceTerminalId: acSource.terminals[0].id,
      targetTerminalId: dcLoad.terminals[0].id
    };
    const model = {
      projectId: "station-invalid",
      schemeId: "scheme-root",
      schemePath: ["主方案"],
      name: "异常厂站",
      idx: 4,
      modelType: "厂站" as const,
      record: projectRecord("station-invalid", "异常厂站", 4, "厂站", [acSource, dcLoad], [invalidEdge])
    };

    const result = analyzeAllNetworkTopology([model], [model]);

    expect(result.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({
        modelName: "异常厂站",
        message: expect.stringContaining("端子类型不一致")
      })
    ]));
    expect(result.errors.every((alert) => Boolean(alert.deviceName))).toBe(true);
    expect(result.warnings).toEqual([]);
  });

  test("全网拓扑接受额定容量和最大电流均为正数的线路参数", () => {
    const source = createDefaultNode("ac-source", { x: 100, y: 100 });
    const load = createDefaultNode("ac-load", { x: 440, y: 100 });
    source.terminals[0].vbase = "10";
    load.terminals[0].vbase = "10";
    const line = connectAcLine(
      "交流线路（自适应）-1",
      { node: source, terminalId: source.terminals[0].id },
      { node: load, terminalId: load.terminals[0].id }
    );
    line.params = {
      ...line.params,
      rated_capacity: "220",
      i_max: "199"
    };
    const model = {
      projectId: "station-current-limit",
      schemeId: "scheme-root",
      schemePath: ["主方案"],
      name: "线路限值厂站",
      idx: 6,
      modelType: "厂站" as const,
      record: projectRecord("station-current-limit", "线路限值厂站", 6, "厂站", [source, load, line])
    };

    const result = analyzeAllNetworkTopology([model], [model]);

    expect(result.errors.some((alert) => (
      alert.nodeId === line.id && alert.message.includes("额定容量/基准电压/1.732")
    ))).toBe(false);
    expect(result.errors.some((alert) => alert.message.includes("i_max=199"))).toBe(false);
  });

  test("线路关联模型未参与本轮拓扑时给出警告，目标模型被选中后警告消失", () => {
    const stationButton = createDefaultNode("static-model-interaction-station", { x: 120, y: 160 });
    stationButton.name = "中心厂站入口";
    stationButton.params.buttonTargetProjectId = "station-1";
    stationButton.params.buttonTargetProjectName = "中心厂站";
    stationButton.terminals = stationButton.terminals.map((terminal) => ({
      ...terminal,
      vbase: terminal.type === "ac" ? "10" : "0.75"
    }));
    const load = createDefaultNode("ac-load", { x: 440, y: 160 });
    load.name = "末端负荷";
    load.terminals[0].vbase = "10";
    const line = connectAcLine(
      "十千伏联络线",
      { node: stationButton, terminalId: "t1" },
      { node: load, terminalId: load.terminals[0].id }
    );

    const feeder = {
      projectId: "feeder-1",
      schemeId: "scheme-root",
      schemePath: ["主方案"],
      name: "十千伏一线",
      idx: 5,
      modelType: "馈线" as const,
      record: projectRecord("feeder-1", "十千伏一线", 5, "馈线", [stationButton, load, line])
    };
    const station = {
      projectId: "station-1",
      schemeId: "scheme-root",
      schemePath: ["主方案"],
      name: "中心厂站",
      idx: 1,
      modelType: "厂站" as const,
      record: projectRecord("station-1", "中心厂站", 1, "厂站")
    };

    const partial = analyzeAllNetworkTopology([feeder], [station, feeder]);
    expect(partial.warnings.filter((alert) => alert.id.includes("missing-related-model"))).toEqual([
      expect.objectContaining({
        modelName: "十千伏一线",
        deviceName: "十千伏联络线",
        message: expect.stringMatching(/首端.*中心厂站.*未参与本轮全网拓扑/)
      })
    ]);
    expect(partial.errors.some((alert) => alert.id.includes("missing-related-model"))).toBe(false);

    const complete = analyzeAllNetworkTopology([station, feeder], [station, feeder]);
    expect(complete.errors.some((alert) => alert.id.includes("missing-related-model"))).toBe(false);
    expect(complete.warnings.some((alert) => alert.id.includes("missing-related-model"))).toBe(false);
  });

  test("线路端子连接的厂站馈线台区模型未定义或不存在时给出明确警告", () => {
    const districtButton = createDefaultNode("static-model-interaction-district", { x: 120, y: 160 });
    districtButton.name = "台区边界";
    districtButton.terminals = districtButton.terminals.map((terminal) => ({
      ...terminal,
      vbase: terminal.type === "ac" ? "10" : "0.75"
    }));
    const load = createDefaultNode("ac-load", { x: 440, y: 160 });
    load.name = "线路负荷";
    load.terminals[0].vbase = "10";
    const line = connectAcLine(
      "十千伏二线",
      { node: districtButton, terminalId: "t1" },
      { node: load, terminalId: load.terminals[0].id }
    );
    const feeder = {
      projectId: "feeder-2",
      schemeId: "scheme-root",
      schemePath: ["主方案"],
      name: "十千伏二线模型",
      idx: 6,
      modelType: "馈线" as const,
      record: projectRecord("feeder-2", "十千伏二线模型", 6, "馈线", [districtButton, load, line])
    };
    const district = {
      projectId: "district-1",
      schemeId: "scheme-root",
      schemePath: ["主方案"],
      name: "一号台区",
      idx: 7,
      modelType: "台区" as const,
      record: projectRecord("district-1", "一号台区", 7, "台区")
    };

    districtButton.params.buttonTargetProjectName = "一号台区";
    const undefinedTarget = analyzeAllNetworkTopology([feeder, district], [feeder, district]);
    expect(undefinedTarget.warnings.filter((alert) => alert.id.includes("missing-related-model"))).toEqual([
      expect.objectContaining({
        modelName: "十千伏二线模型",
        deviceName: "十千伏二线",
        message: expect.stringMatching(/首端.*台区.*buttonTargetProjectId.*未定义/)
      })
    ]);
    expect(undefinedTarget.errors.some((alert) => alert.id.includes("missing-related-model"))).toBe(false);

    districtButton.params.buttonTargetProjectId = "district-missing";
    districtButton.params.buttonTargetProjectName = "不存在的台区";
    const missingTarget = analyzeAllNetworkTopology([feeder, district], [feeder, district]);
    expect(missingTarget.warnings.filter((alert) => alert.id.includes("missing-related-model"))).toEqual([
      expect.objectContaining({
        modelName: "十千伏二线模型",
        deviceName: "十千伏二线",
        message: expect.stringMatching(/首端.*不存在的台区.*district-missing.*不存在/)
      })
    ]);
    expect(missingTarget.errors.some((alert) => alert.id.includes("missing-related-model"))).toBe(false);

    districtButton.params.buttonTargetProjectId = feeder.projectId;
    districtButton.params.buttonTargetProjectName = feeder.name;
    const selfTarget = analyzeAllNetworkTopology([feeder, district], [feeder, district]);
    expect(selfTarget.warnings.filter((alert) => alert.id.includes("missing-related-model"))).toEqual([
      expect.objectContaining({
        modelName: "十千伏二线模型",
        deviceName: "十千伏二线",
        message: expect.stringMatching(/首端.*buttonTargetProjectId.*feeder-2.*当前模型.*相同/)
      })
    ]);
    expect(selfTarget.errors.some((alert) => alert.id.includes("missing-related-model"))).toBe(false);
  });

  test("线路连接的微网模型按钮目标问题进入警告而不是错误", () => {
    const microgridButton = createDefaultNode("static-model-interaction-microgrid", { x: 120, y: 160 });
    microgridButton.name = "微网边界";
    microgridButton.terminals = microgridButton.terminals.map((terminal) => ({
      ...terminal,
      vbase: terminal.type === "ac" ? "10" : "0.75"
    }));
    const source = createDefaultNode("ac-source", { x: 440, y: 160 });
    source.name = "交流电源";
    source.terminals[0].vbase = "10";
    const line = connectAcLine(
      "微网联络线",
      { node: microgridButton, terminalId: "t1" },
      { node: source, terminalId: source.terminals[0].id }
    );
    const station = {
      projectId: "station-with-microgrid-boundary",
      schemeId: "scheme-root",
      schemePath: ["主方案"],
      name: "含微网边界的厂站",
      idx: 8,
      modelType: "厂站" as const,
      record: projectRecord(
        "station-with-microgrid-boundary",
        "含微网边界的厂站",
        8,
        "厂站",
        [microgridButton, source, line]
      )
    };

    const result = analyzeAllNetworkTopology([station], [station]);

    expect(result.warnings.filter((alert) => alert.id.includes("missing-related-model"))).toEqual([
      expect.objectContaining({
        modelName: "含微网边界的厂站",
        deviceName: "微网联络线",
        message: expect.stringMatching(/首端.*微网.*buttonTargetProjectId.*未定义/)
      })
    ]);
    expect(result.errors.some((alert) => alert.id.includes("missing-related-model"))).toBe(false);

    const targetMicrogrid = {
      projectId: "microgrid-target",
      schemeId: "scheme-root",
      schemePath: ["主方案"],
      name: "目标微网",
      idx: 9,
      modelType: "微网" as const,
      record: projectRecord("microgrid-target", "目标微网", 9, "微网")
    };
    microgridButton.params.buttonTargetProjectId = targetMicrogrid.projectId;
    microgridButton.params.buttonTargetProjectName = targetMicrogrid.name;
    const validTarget = analyzeAllNetworkTopology([station], [station, targetMicrogrid]);
    expect(validTarget.warnings.some((alert) => alert.id.includes("missing-related-model"))).toBe(false);

    microgridButton.params.buttonTargetProjectId = "missing-microgrid";
    const missingTarget = analyzeAllNetworkTopology([station], [station, targetMicrogrid]);
    expect(missingTarget.warnings.filter((alert) => alert.id.includes("missing-related-model"))).toEqual([
      expect.objectContaining({
        message: expect.stringMatching(/微网.*missing-microgrid.*不存在/)
      })
    ]);

    microgridButton.params.buttonTargetProjectId = station.projectId;
    const selfTarget = analyzeAllNetworkTopology([station], [station, targetMicrogrid]);
    expect(selfTarget.warnings.filter((alert) => alert.id.includes("missing-related-model"))).toEqual([
      expect.objectContaining({
        message: expect.stringMatching(/微网.*buttonTargetProjectId.*station-with-microgrid-boundary.*当前模型.*相同/)
      })
    ]);
  });
});
