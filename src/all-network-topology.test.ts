import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

import {
  analyzeAllNetworkTopology,
  analyzeGlobalLinesForAllNetworkTopology,
  collectAllNetworkTopologyModels,
  collectAllNetworkTopologyReferenceModels,
  defaultAllNetworkTopologySelection,
  modelForGlobalLineReference,
  referencedModelsForGlobalLines
} from "./all-network-topology";
import {
  GLOBAL_LINE_ID_PARAM,
  globalLineModelKey,
  globalLineSharedParamsFromNode,
  type GlobalLineEndpoint,
  type GlobalLineRecord,
  type GlobalLineReference
} from "./global-lines";
import {
  DEFAULT_MODEL_LAYER_ID,
  DEVICE_LIBRARY_BY_KIND,
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

  test("全网拓扑左侧提供全局线路入口和独立列表窗口", () => {
    const dialogSource = readFileSync(new URL("./AllNetworkTopologyDialog.tsx", import.meta.url), "utf8");
    const stylesSource = readFileSync(new URL("./styles.css", import.meta.url), "utf8");
    const globalLineButton = dialogSource.indexOf('aria-label="打开全局线路列表"');
    const topologyButton = dialogSource.indexOf('onClick={() => void runTopology()}');

    expect(globalLineButton).toBeGreaterThanOrEqual(0);
    expect(topologyButton).toBeGreaterThan(globalLineButton);
    expect(dialogSource).toContain("loadGlobalLineRecordsForTopology()");
    expect(dialogSource).toContain("globalLineEndpointReference(record, endpoint)");
    expect(dialogSource).toContain("modelForGlobalLineReference(reference, referenceModels)");
    expect(dialogSource).toContain('aria-label="首端所在模型"');
    expect(dialogSource).toContain('aria-label="末端所在模型"');
    expect(dialogSource).toContain("requestUnsavedChangeAction");
    expect(stylesSource).toContain(".all-network-topology-actions");
    expect(stylesSource).toContain(".global-line-list-window-layer");
    expect(stylesSource).toContain(".global-line-list-table");
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

    targetLine.params.r = "9.9";
    const mismatch = analyzeGlobalLinesForAllNetworkTopology([record], [sourceModel, targetModel]);

    expect(mismatch.warnings).toEqual([]);
    expect(mismatch.errors).toEqual([
      expect.objectContaining({
        id: expect.stringContaining("definition-mismatch:target"),
        projectId: targetModel.projectId,
        modelName: targetModel.name,
        deviceName: "跨区交流二线",
        nodeId: targetLine.id,
        message: expect.stringMatching(/模型文件.*全局线路定义不一致.*共享参数.*r/)
      })
    ]);
  });
});

describe("全网拓扑告警分类", () => {
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
