import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { createDefaultNode } from "./model";
import {
  GLOBAL_LINE_ID_PARAM,
  GLOBAL_LINE_MODEL_PAIR_PARAM,
  applyGlobalLineRecordToNode,
  candidateGlobalLines,
  deriveLocalDeviceIndexCounters,
  expandGlobalBoundaryDeletionNodeIds,
  globalLineBoundaryAdjustmentConflictMessage,
  globalLineEndpointPlacementFailureMessage,
  globalLineExistingPlacementConflictMessage,
  globalLineReferencesForPlacement,
  globalLineSharedParamsFromNode,
  isGlobalLineBoundaryNode,
  previewGlobalLineRecordsForProject,
  shouldManageLineGlobally,
  shouldUseGlobalLineForEndpoints,
  removeGlobalLineIdentityForLocalNode,
  type GlobalLineRecord
} from "./global-lines";

function connectLine(kind: "ac-routable-line" | "dc-routable-line", sourceId: string, targetId: string) {
  const line = createDefaultNode(kind, { x: 100, y: 100 });
  line.params = {
    ...line.params,
    _routableLineSourceNodeId: sourceId,
    _routableLineTargetNodeId: targetId
  };
  return line;
}

function record(overrides: Partial<GlobalLineRecord> = {}): GlobalLineRecord {
  const reference = {
    modelKey: "model:1",
    projectIdx: 1,
    schemePath: ["方案"],
    projectName: "模型一",
    nodeId: "line-a",
    boundaryEndpoint: "target" as const
  };
  return {
    id: "global-line-1",
    idx: 7,
    name: "中心厂站-一号线",
    energyType: "ac",
    params: { rated_capacity: "220", r: "0.1", run_stat: "1" },
    references: [reference],
    endpointSlots: { source: null, target: reference },
    degree: 1,
    createdAt: "2026-08-18T00:00:00.000Z",
    updatedAt: "2026-08-18T00:00:00.000Z",
    ...overrides
  };
}

describe("全局线路适用边界", () => {
  test("十二种模型关联电源/负荷属于跨模型边界设备", () => {
    expect(isGlobalLineBoundaryNode(createDefaultNode("ac-station-source", { x: 0, y: 0 }))).toBe(true);
    expect(isGlobalLineBoundaryNode(createDefaultNode("dc-feeder-load", { x: 0, y: 0 }))).toBe(true);
    expect(isGlobalLineBoundaryNode(createDefaultNode("ac-load", { x: 0, y: 0 }))).toBe(false);
  });

  test("只有厂站馈线台区内接触边界设备的交直流线路才全局维护", () => {
    const stationSource = createDefaultNode("ac-station-source", { x: 0, y: 0 });
    stationSource.params.model_id = "22";
    const bus = createDefaultNode("ac-bus", { x: 300, y: 0 });
    const boundaryLine = connectLine("ac-routable-line", bus.id, stationSource.id);
    const localLoad = createDefaultNode("ac-load", { x: 600, y: 0 });
    const localLine = connectLine("ac-routable-line", bus.id, localLoad.id);

    expect(shouldManageLineGlobally(boundaryLine, [stationSource, bus, localLoad, boundaryLine], "厂站")).toBe(true);
    expect(shouldManageLineGlobally(localLine, [stationSource, bus, localLoad, localLine], "厂站")).toBe(false);
    expect(shouldManageLineGlobally(boundaryLine, [stationSource, bus, boundaryLine], "其他")).toBe(false);
    expect(shouldUseGlobalLineForEndpoints("馈线", boundaryLine.kind, bus, stationSource)).toBe(true);
    expect(shouldUseGlobalLineForEndpoints("馈线", localLine.kind, bus, localLoad)).toBe(false);
  });
});

describe("全局线路数据同步", () => {
  test("页面编辑阶段不再调用会写表的 attach 或 sync-project 接口", () => {
    const hookSource = readFileSync(new URL("./hooks/useGlobalLines.tsx", import.meta.url), "utf8");
    expect(hookSource).not.toContain('apiPath("/global-lines/attach")');
    expect(hookSource).not.toContain('apiPath("/global-lines/sync-project")');
    expect(hookSource).toContain("previewGlobalLineRecordsForProject");
    expect(hookSource).toContain("finalizeSavedGlobalLineProjectNodes");
  });

  test("新建线路按走向把模型关联设备端指向 model_id 模型，另一端指向本地模型", () => {
    const localModel = {
      modelKey: "model:7",
      projectIdx: 7,
      schemePath: ["主方案"],
      projectName: "本地馈线",
      nodeId: "line-new"
    };
    const stationSource = createDefaultNode("ac-station-source", { x: 0, y: 0 });
    stationSource.params.model_id = "22";
    const localLoad = createDefaultNode("ac-load", { x: 500, y: 0 });

    const sourceBoundary = globalLineReferencesForPlacement(localModel, {
      source: { node: stationSource, terminalId: stationSource.terminals[0].id },
      target: { node: localLoad, terminalId: localLoad.terminals[0].id }
    });

    expect(sourceBoundary).toEqual([
      expect.objectContaining({
        modelKey: "model:22",
        projectIdx: 22,
        nodeId: "line-new",
        boundaryEndpoint: "source",
        boundaryNodeId: stationSource.id,
        boundaryTerminalId: stationSource.terminals[0].id
      }),
      expect.objectContaining({
        modelKey: "model:7",
        projectIdx: 7,
        projectName: "本地馈线",
        nodeId: "line-new",
        boundaryEndpoint: "target"
      })
    ]);
    expect(sourceBoundary?.[1]).not.toHaveProperty("boundaryNodeId");

    const districtLoad = createDefaultNode("dc-district-load", { x: 500, y: 0 });
    districtLoad.params.model_id = "33";
    const localSource = createDefaultNode("dc-source", { x: 0, y: 0 });
    const targetBoundary = globalLineReferencesForPlacement({ ...localModel, nodeId: "line-reverse" }, {
      source: { node: localSource, terminalId: localSource.terminals[0].id },
      target: { node: districtLoad, terminalId: districtLoad.terminals[0].id }
    });

    expect(targetBoundary?.map((reference) => [reference.boundaryEndpoint, reference.modelKey])).toEqual([
      ["source", "model:7"],
      ["target", "model:33"]
    ]);
  });

  test("模型关联电源只能位于首端、负荷只能位于末端，且两端不能同时为模型关联设备", () => {
    const stationSource = createDefaultNode("ac-station-source", { x: 0, y: 0 });
    stationSource.params.model_id = "22";
    const feederLoad = createDefaultNode("ac-feeder-load", { x: 500, y: 0 });
    feederLoad.params.model_id = "33";
    const ordinarySource = createDefaultNode("ac-source", { x: 0, y: 200 });
    const ordinaryLoad = createDefaultNode("ac-load", { x: 500, y: 200 });

    expect(globalLineEndpointPlacementFailureMessage(stationSource, ordinaryLoad)).toBe("");
    expect(globalLineEndpointPlacementFailureMessage(ordinarySource, feederLoad)).toBe("");
    expect(globalLineEndpointPlacementFailureMessage(feederLoad, ordinaryLoad)).toContain("只能位于线路末端");
    expect(globalLineEndpointPlacementFailureMessage(ordinarySource, stationSource)).toContain("只能位于线路首端");
    expect(globalLineEndpointPlacementFailureMessage(stationSource, feederLoad)).toContain("两端不能同时");

    expect(globalLineReferencesForPlacement({
      modelKey: "model:7",
      projectIdx: 7,
      schemePath: ["主方案"],
      projectName: "本地馈线",
      nodeId: "invalid-line"
    }, {
      source: { node: stationSource, terminalId: stationSource.terminals[0].id },
      target: { node: feederLoad, terminalId: feederLoad.terminals[0].id }
    })).toEqual([]);
  });

  test("页面新增只形成可撤销草稿，不改动后台持久化基线", () => {
    const stationSource = createDefaultNode("ac-station-source", { x: 0, y: 0 });
    stationSource.params.model_id = "22";
    const localLoad = createDefaultNode("ac-load", { x: 500, y: 0 });
    const draftLine = connectLine("ac-routable-line", stationSource.id, localLoad.id);
    draftLine.name = "待保存线路";
    draftLine.params = {
      ...draftLine.params,
      [GLOBAL_LINE_ID_PARAM]: `draft-global-line:${draftLine.id}`,
      [GLOBAL_LINE_MODEL_PAIR_PARAM]: "1",
      idx: "8",
      rated_capacity: "500"
    };
    const persisted: GlobalLineRecord[] = [];
    const identity = {
      modelKey: "model:7",
      projectIdx: 7,
      schemePath: ["主方案"],
      projectName: "本地馈线",
      nodeId: ""
    };

    const preview = previewGlobalLineRecordsForProject(
      persisted,
      [stationSource, localLoad, draftLine],
      "馈线",
      identity
    );

    expect(persisted).toEqual([]);
    expect(preview).toHaveLength(1);
    expect(preview[0]).toMatchObject({
      id: `draft-global-line:${draftLine.id}`,
      idx: 8,
      name: "待保存线路",
      degree: 2,
      params: expect.objectContaining({ rated_capacity: "500" })
    });
    expect(preview[0]?.endpointSlots?.source).toMatchObject({ modelKey: "model:22" });
    expect(preview[0]?.endpointSlots?.target).toMatchObject({ modelKey: "model:7" });

    expect(previewGlobalLineRecordsForProject(persisted, [stationSource, localLoad], "馈线", identity)).toEqual([]);
  });

  test("已有线路始终使用全局表名称和参数，模型加载时缺少名称也不会使预览排序崩溃", () => {
    const station = createDefaultNode("ac-station-source", { x: 0, y: 0 });
    station.params.model_id = "22";
    const load = createDefaultNode("ac-load", { x: 500, y: 0 });
    const savedLine = connectLine("ac-routable-line", load.id, station.id);
    savedLine.params = {
      ...savedLine.params,
      [GLOBAL_LINE_ID_PARAM]: "global-line-1",
      idx: "7",
      rated_capacity: "500",
      r: "0.25"
    };
    const identity = {
      modelKey: "model:1",
      projectIdx: 1,
      schemePath: ["方案"],
      projectName: "模型一",
      nodeId: ""
    };
    const persisted = [
      record(),
      record({ id: "global-line-2", idx: 7, name: "同序号线路", references: [] })
    ];
    const loadingLine = {
      ...savedLine,
      name: undefined as unknown as string
    };

    const preview = previewGlobalLineRecordsForProject(
      persisted,
      [station, load, loadingLine],
      "厂站",
      identity
    );
    expect(preview.find((item) => item.id === "global-line-1")).toMatchObject({
      name: "中心厂站-一号线",
      params: { rated_capacity: "220", r: "0.1", run_stat: "1" }
    });
    expect(persisted[0]).toMatchObject({
      name: "中心厂站-一号线",
      params: expect.objectContaining({ rated_capacity: "220", r: "0.1" })
    });
  });

  test("页面删除只做可撤销预览：有另一端模型时记录不变，无另一端时暂时隐藏", () => {
    const identity = {
      modelKey: "model:1",
      projectIdx: 1,
      schemePath: ["方案"],
      projectName: "模型一",
      nodeId: ""
    };
    const localReference = {
      modelKey: "model:1",
      projectIdx: 1,
      schemePath: ["方案"],
      projectName: "模型一",
      nodeId: "line-a",
      boundaryEndpoint: "target" as const
    };
    const remoteReference = {
      modelKey: "model:2",
      projectIdx: 2,
      schemePath: ["方案"],
      projectName: "模型二",
      nodeId: "line-b",
      boundaryEndpoint: "source" as const
    };
    const sharedRecord = record({
      references: [remoteReference, localReference],
      endpointSlots: { source: remoteReference, target: localReference },
      terminalSlots: { i: remoteReference, j: localReference },
      degree: 2
    });
    const station = createDefaultNode("ac-station-source", { x: 0, y: 0 });
    station.params.model_id = "22";
    const load = createDefaultNode("ac-load", { x: 500, y: 0 });
    const savedLine = connectLine("ac-routable-line", load.id, station.id);
    savedLine.name = sharedRecord.name;
    savedLine.params = {
      ...savedLine.params,
      [GLOBAL_LINE_ID_PARAM]: sharedRecord.id,
      idx: String(sharedRecord.idx),
      ...sharedRecord.params
    };

    expect(previewGlobalLineRecordsForProject([sharedRecord], [station, load], "厂站", identity))
      .toEqual([sharedRecord]);
    expect(previewGlobalLineRecordsForProject([record()], [], "厂站", identity)).toEqual([]);
    expect(previewGlobalLineRecordsForProject([sharedRecord], [station, load, savedLine], "厂站", identity)[0])
      .toMatchObject({ id: sharedRecord.id, degree: 2 });
  });

  test("共享参数排除路由几何、全局引用和本图拓扑节点", () => {
    const line = connectLine("ac-routable-line", "source", "target");
    line.params = {
      ...line.params,
      [GLOBAL_LINE_ID_PARAM]: "global-line-1",
      idx: "9",
      i_node: "11",
      j_node: "12",
      rated_capacity: "500",
      r: "0.2"
    };

    expect(globalLineSharedParamsFromNode(line)).toMatchObject({ rated_capacity: "500", r: "0.2" });
    expect(globalLineSharedParamsFromNode(line)).not.toHaveProperty("idx");
    expect(globalLineSharedParamsFromNode(line)).not.toHaveProperty("i_node");
    expect(globalLineSharedParamsFromNode(line)).not.toHaveProperty("_routableLineSourceNodeId");
  });

  test("应用全局记录时以表中名称和参数覆盖运行态，同时清除模型中的陈旧全局参数", () => {
    const line = connectLine("ac-routable-line", "source", "target");
    line.name = "旧名称";
    line.params = {
      ...line.params,
      idx: "2",
      i_node: "101",
      j_node: "102",
      rated_capacity: "100",
      stale_global_param: "只存在于旧模型"
    };

    const updated = applyGlobalLineRecordToNode(line, record());

    expect(updated.name).toBe("中心厂站-一号线");
    expect(updated.params.idx).toBe("7");
    expect(updated.params.rated_capacity).toBe("220");
    expect(updated.params.stale_global_param).toBeUndefined();
    expect(updated.params.i_node).toBe("101");
    expect(updated.params.j_node).toBe("102");
    expect(updated.params._routableLineSourceNodeId).toBe("source");
    expect(updated.params[GLOBAL_LINE_ID_PARAM]).toBe("global-line-1");
  });

  test("全局线路切回本图时移除全局身份，并按排除全局线路后的本图记录重新编号", () => {
    const globalLine = connectLine("ac-routable-line", "source", "target");
    globalLine.params = { ...globalLine.params, idx: "1008", [GLOBAL_LINE_ID_PARAM]: "global-1008" };
    const localLine = connectLine("ac-routable-line", "source-2", "target-2");
    localLine.params = { ...localLine.params, idx: "3" };

    const detached = removeGlobalLineIdentityForLocalNode(globalLine);
    const counters = deriveLocalDeviceIndexCounters([globalLine, localLine]);

    expect(detached.params[GLOBAL_LINE_ID_PARAM]).toBeUndefined();
    expect(detached.params[GLOBAL_LINE_MODEL_PAIR_PARAM]).toBeUndefined();
    expect(detached.params.idx).toBeUndefined();
    expect(Math.max(0, ...Object.values(counters))).toBe(3);
  });

  test("既有线路候选包含可补画记录，并仅按当前画布已用的全局线路ID排除重复", () => {
    const sourceReference = {
      modelKey: "model:3",
      schemePath: [],
      projectName: "三",
      nodeId: "source-line",
      boundaryEndpoint: "source" as const
    };
    const records = [
      record({ id: "empty", idx: 6, references: [], endpointSlots: { source: null, target: null }, degree: 0 }),
      record(),
      record({ id: "referenced-current-model", idx: 8, references: [{ modelKey: "model:2", schemePath: [], projectName: "二", nodeId: "x" }] }),
      record({ id: "full", idx: 9, degree: 2 }),
      record({ id: "dc", idx: 10, energyType: "dc" }),
      record({ id: "source-occupied", idx: 11, references: [sourceReference], endpointSlots: { source: sourceReference, target: null } })
    ];

    expect(candidateGlobalLines(records, "ac", "model:2", "source").map((item) => item.id)).toEqual(["empty", "global-line-1", "referenced-current-model"]);
    expect(candidateGlobalLines(records, "ac", "model:2", "target").map((item) => item.id)).toEqual(["empty", "source-occupied"]);
    expect(candidateGlobalLines(
      records,
      "ac",
      "model:2",
      "source",
      undefined,
      new Set(["empty", "referenced-current-model"])
    ).map((item) => item.id)).toEqual(["global-line-1"]);
  });

  test("全局表引用当前模型但当前画布尚未使用该线路时仍允许补画另一端", () => {
    const stationSource = createDefaultNode("ac-station-source", { x: 0, y: 0 });
    stationSource.params.model_id = "6";
    const localLoad = createDefaultNode("ac-load", { x: 500, y: 0 });
    const sourceReference = {
      modelKey: "model:6",
      projectIdx: 6,
      schemePath: ["新建方案222"],
      projectName: "厂站1",
      nodeId: "remote-line",
      boundaryEndpoint: "source" as const
    };
    const targetReference = {
      modelKey: "model:7",
      projectIdx: 7,
      schemePath: ["新建方案222"],
      projectName: "馈线1",
      nodeId: "missing-local-line",
      boundaryEndpoint: "target" as const
    };
    const reciprocalLine = record({
      id: "reciprocal-line",
      idx: 6,
      name: "馈线1",
      references: [sourceReference, targetReference],
      endpointSlots: { source: sourceReference, target: targetReference },
      degree: 2
    });
    const placementNodes = { source: stationSource, target: localLoad };

    expect(candidateGlobalLines(
      [reciprocalLine],
      "ac",
      "model:7",
      "source",
      placementNodes
    ).map((item) => item.id)).toEqual(["reciprocal-line"]);
    expect(candidateGlobalLines(
      [reciprocalLine],
      "ac",
      "model:7",
      "source",
      placementNodes,
      new Set(["reciprocal-line"])
    )).toEqual([]);
  });

  test("模型关联设备复用既有线路时预校核 model_id 与首末端方向", () => {
    const stationSource = createDefaultNode("ac-station-source", { x: 0, y: 0 });
    stationSource.params.model_id = "22";
    const localLoad = createDefaultNode("ac-load", { x: 500, y: 0 });
    const localModel = {
      modelKey: "model:7",
      projectIdx: 7,
      schemePath: ["主方案"],
      projectName: "本地馈线",
      nodeId: ""
    };
    const matchingSource = {
      modelKey: "model:22",
      projectIdx: 22,
      schemePath: ["主方案"],
      projectName: "目标厂站",
      nodeId: "remote-source-line",
      boundaryEndpoint: "source" as const
    };
    const matchingTarget = {
      modelKey: "model:7",
      projectIdx: 7,
      schemePath: ["主方案"],
      projectName: "本地馈线",
      nodeId: "existing-local-line",
      boundaryEndpoint: "target" as const
    };
    const wrongTarget = { ...matchingSource, nodeId: "remote-target-line", boundaryEndpoint: "target" as const };
    const wrongSource = { ...matchingTarget, nodeId: "local-source-line", boundaryEndpoint: "source" as const };
    const wrongModel = { ...matchingSource, modelKey: "model:33", projectIdx: 33, nodeId: "other-source-line" };
    const wrongLocal = { ...matchingTarget, modelKey: "model:9", projectIdx: 9, projectName: "其他馈线", nodeId: "other-local-line" };
    const empty = record({ id: "empty", idx: 6, references: [], endpointSlots: { source: null, target: null }, degree: 0 });
    const repairableSingle = record({
      id: "repairable-single",
      idx: 7,
      references: [wrongTarget],
      endpointSlots: { source: null, target: wrongTarget },
      degree: 1
    });
    const matching = record({ id: "matching", idx: 8, references: [matchingSource, matchingTarget], endpointSlots: { source: matchingSource, target: matchingTarget }, degree: 2 });
    const wrongDirection = record({ id: "wrong-direction", idx: 9, references: [wrongSource, wrongTarget], endpointSlots: { source: wrongSource, target: wrongTarget }, degree: 2 });
    const wrongProject = record({ id: "wrong-project", idx: 10, references: [wrongModel, matchingTarget], endpointSlots: { source: wrongModel, target: matchingTarget }, degree: 2 });
    const wrongLocalProject = record({ id: "wrong-local-project", idx: 11, references: [matchingSource, wrongLocal], endpointSlots: { source: matchingSource, target: wrongLocal }, degree: 2 });

    const candidates = candidateGlobalLines(
      [empty, repairableSingle, matching, wrongDirection, wrongProject, wrongLocalProject],
      "ac",
      "model:7",
      "source",
      { source: stationSource, target: localLoad }
    );
    expect(candidates.map((item) => item.id)).toEqual([
      "empty",
      "repairable-single",
      "matching",
      "wrong-direction",
      "wrong-project",
      "wrong-local-project"
    ]);
    expect(globalLineExistingPlacementConflictMessage(empty, stationSource, localLoad, localModel)).toBe("");
    expect(globalLineExistingPlacementConflictMessage(repairableSingle, stationSource, localLoad, localModel)).toBe("");
    expect(globalLineExistingPlacementConflictMessage(matching, stationSource, localLoad, localModel)).toBe("");
    expect(globalLineExistingPlacementConflictMessage(wrongDirection, stationSource, localLoad, localModel)).toContain("首末端方向不一致");
    expect(globalLineExistingPlacementConflictMessage(wrongProject, stationSource, localLoad, localModel)).toContain("model_id=22");
    expect(globalLineExistingPlacementConflictMessage(wrongProject, stationSource, localLoad, localModel)).toContain("重新选择已有全局线路");
    expect(globalLineExistingPlacementConflictMessage(wrongLocalProject, stationSource, localLoad, localModel)).toContain("与本地模型");

    const reusedLine = connectLine("ac-routable-line", stationSource.id, localLoad.id);
    reusedLine.name = matching.name;
    reusedLine.params = {
      ...reusedLine.params,
      [GLOBAL_LINE_ID_PARAM]: matching.id,
      [GLOBAL_LINE_MODEL_PAIR_PARAM]: "source",
      idx: String(matching.idx)
    };
    const preview = previewGlobalLineRecordsForProject(
      [matching],
      [stationSource, localLoad, reusedLine],
      "馈线",
      localModel
    )[0];
    expect(preview.references).toEqual(matching.references);
    expect(preview.endpointSlots).toEqual(matching.endpointSlots);
    expect(preview.degree).toBe(matching.degree);

    for (const repairable of [empty, repairableSingle]) {
      const repairingLine = connectLine("ac-routable-line", stationSource.id, localLoad.id);
      repairingLine.name = repairable.name;
      repairingLine.params = {
        ...repairingLine.params,
        [GLOBAL_LINE_ID_PARAM]: repairable.id,
        [GLOBAL_LINE_MODEL_PAIR_PARAM]: "source",
        idx: String(repairable.idx)
      };
      const repairedPreview = previewGlobalLineRecordsForProject(
        [repairable],
        [stationSource, localLoad, repairingLine],
        "馈线",
        localModel
      )[0];
      expect(repairedPreview.degree).toBe(2);
      expect(repairedPreview.endpointSlots?.source).toMatchObject({
        projectIdx: 22,
        nodeId: repairingLine.id,
        boundaryNodeId: stationSource.id
      });
      expect(repairedPreview.endpointSlots?.target).toMatchObject({
        projectIdx: 7,
        projectName: "本地馈线",
        nodeId: repairingLine.id
      });
    }
  });

  test("复用出线度为0或1的线路前显示端点将被重建的告警", () => {
    const hookSource = readFileSync(new URL("./hooks/useGlobalLines.tsx", import.meta.url), "utf8");
    const viewSource = readFileSync(new URL("./appExtracted/appProjectDialogs.tsx", import.meta.url), "utf8");
    const stylesSource = readFileSync(new URL("./styles.css", import.meta.url), "utf8");

    expect(viewSource).toContain("出线度为 0 或 1");
    expect(viewSource).toContain("将使用当前模型关联信息重建该全局线路的首末端");
    expect(hookSource).toContain("usedGlobalLineIds");
    expect(stylesSource).toContain(".global-line-dialog-warning");
  });

  test("首末端都已关联时禁止把本端改接到另一个边界设备，删除另一端后才允许调整", () => {
    const sourceReference = {
      modelKey: "model:2",
      schemePath: [],
      projectName: "模型二",
      nodeId: "line-b",
      boundaryEndpoint: "source" as const,
      boundaryNodeId: "station-old",
      boundaryTerminalId: "t1"
    };
    const targetReference = record().references[0];
    const fullRecord = record({
      references: [sourceReference, targetReference],
      endpointSlots: { source: sourceReference, target: targetReference },
      degree: 2
    });
    const adjustedSource = { ...sourceReference, boundaryNodeId: "station-new", boundaryTerminalId: "t2" };

    expect(globalLineBoundaryAdjustmentConflictMessage(fullRecord, sourceReference, adjustedSource))
      .toContain("先删除另一端");
    expect(globalLineBoundaryAdjustmentConflictMessage(fullRecord, sourceReference, sourceReference)).toBe("");
    expect(globalLineBoundaryAdjustmentConflictMessage({ ...fullRecord, references: [sourceReference], endpointSlots: { source: sourceReference, target: null }, degree: 1 }, sourceReference, adjustedSource)).toBe("");
  });
});

describe("边界设备删除级联", () => {
  test("删除边界设备时同时删除直接相连的全部交直流线路，不影响普通设备线路", () => {
    const stationSource = createDefaultNode("ac-station-source", { x: 0, y: 0 });
    const ordinarySource = createDefaultNode("ac-source", { x: 0, y: 200 });
    const load = createDefaultNode("ac-load", { x: 500, y: 0 });
    const connectedAc = connectLine("ac-routable-line", stationSource.id, load.id);
    const connectedDc = connectLine("dc-routable-line", stationSource.id, load.id);
    const untouched = connectLine("ac-routable-line", ordinarySource.id, load.id);

    const deleted = new Set(expandGlobalBoundaryDeletionNodeIds(
      [stationSource, ordinarySource, load, connectedAc, connectedDc, untouched],
      [stationSource.id]
    ));

    expect(deleted).toEqual(new Set([stationSource.id, connectedAc.id, connectedDc.id]));
  });
});
