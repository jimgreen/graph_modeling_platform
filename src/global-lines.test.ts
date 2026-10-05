import { afterEach, describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createDefaultNode } from "./model";
import { useGlobalLines } from "./hooks/useGlobalLines";
import {
  GLOBAL_LINE_ID_PARAM,
  GLOBAL_LINE_MODEL_PAIR_PARAM,
  applyGlobalLineRecordToNode,
  applyGlobalLineRecordsToNodes,
  candidateGlobalLines,
  deriveLocalDeviceIndexCounters,
  expandGlobalBoundaryDeletionNodeIds,
  globalLineBoundaryAdjustmentConflictMessage,
  globalLineEndpointPlacementFailureMessage,
  globalLineKindForEnergy,
  globalLineModelAssociationPlacementForEndpoints,
  globalLineSourcePlacementFailureMessage,
  globalLineTargetPlacementFailureMessage,
  globalLineExistingPlacementConflictMessage,
  globalLineReferencesForPlacement,
  globalLineSharedParamsFromNode,
  isGlobalLineBoundaryNode,
  lineTouchesGlobalBoundary,
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

// 下面几组此前零直接覆盖：它们是「跨模型线路能否落地」那条链上的判据，
// 判错不抛异常，只是线路被静默判成普通本地线（或反过来污染别的模型）。
describe("端点放置失败文案（按端点角色分流）", () => {
  const withModelId = (kind: Parameters<typeof createDefaultNode>[0], modelId?: string) => {
    const node = createDefaultNode(kind, { x: 0, y: 0 });
    node.name = "边界设备";
    if (modelId !== undefined) node.params.model_id = modelId;
    return node;
  };

  test("负荷只能作末端：放首端时报错，作末端时放行", () => {
    expect(globalLineSourcePlacementFailureMessage(withModelId("ac-station-load"))).toBe(
      "“边界设备”属于厂站/馈线/台区负荷，只能位于线路末端。"
    );
    expect(globalLineSourcePlacementFailureMessage(withModelId("ac-station-source"))).toBe("");
  });

  test("电源只能作首端：放末端时报错，作首端时放行", () => {
    expect(globalLineTargetPlacementFailureMessage(withModelId("ac-station-source"))).toBe(
      "“边界设备”属于厂站/馈线/台区电源，只能位于线路首端。"
    );
    expect(globalLineTargetPlacementFailureMessage(withModelId("ac-station-load"))).toBe("");
  });

  test("名字缺失 / 全空格时用兜底称谓（不产生空引号）", () => {
    const anonymous = withModelId("ac-station-load");
    anonymous.name = "   ";
    expect(globalLineSourcePlacementFailureMessage(anonymous)).toBe("“该模型关联负荷”属于厂站/馈线/台区负荷，只能位于线路末端。");
    const unnamed = withModelId("ac-station-source");
    delete (unnamed as { name?: string }).name;
    expect(globalLineTargetPlacementFailureMessage(unnamed)).toBe("“该模型关联电源”属于厂站/馈线/台区电源，只能位于线路首端。");
  });

  test("非模型关联设备两道判据都放行", () => {
    expect(globalLineSourcePlacementFailureMessage(createDefaultNode("ac-transformer", { x: 0, y: 0 }))).toBe("");
    expect(globalLineTargetPlacementFailureMessage(createDefaultNode("ac-transformer", { x: 0, y: 0 }))).toBe("");
  });
});

describe("globalLineModelAssociationPlacementForEndpoints", () => {
  const local = () => createDefaultNode("ac-load", { x: 0, y: 0 });
  const associated = (kind: Parameters<typeof createDefaultNode>[0], modelId: string) => {
    const node = createDefaultNode(kind, { x: 0, y: 0 });
    node.params.model_id = modelId;
    return node;
  };

  test("首端是关联电源时返回 source 端与 modelKey", () => {
    expect(globalLineModelAssociationPlacementForEndpoints(associated("ac-station-source", "3"), local())).toEqual({
      endpoint: "source",
      projectIdx: 3,
      modelKey: "model:3"
    });
  });

  test("末端是关联负荷时返回 target 端（端点取自关联端本身，不取线路另一侧）", () => {
    expect(globalLineModelAssociationPlacementForEndpoints(local(), associated("ac-station-load", "2"))).toEqual({
      endpoint: "target",
      projectIdx: 2,
      modelKey: "model:2"
    });
  });

  test("两端都是关联设备时判为非法（返回 null，由上层给「不能同时」文案）", () => {
    expect(globalLineModelAssociationPlacementForEndpoints(
      associated("ac-station-source", "1"),
      associated("ac-station-load", "2")
    )).toBeNull();
  });

  test("无关联端点时返回 null", () => {
    expect(globalLineModelAssociationPlacementForEndpoints(local(), local())).toBeNull();
  });

  test("是关联设备但 model_id 缺失 / 非正整数时同样返回 null", () => {
    // 0 是「后端还没分配编号」，不是「模型 0」
    expect(globalLineModelAssociationPlacementForEndpoints(associated("ac-station-source", "0"), local())).toBeNull();
    expect(globalLineModelAssociationPlacementForEndpoints(createDefaultNode("ac-station-source", { x: 0, y: 0 }), local())).toBeNull();
    expect(globalLineModelAssociationPlacementForEndpoints(associated("ac-station-source", "abc"), local())).toBeNull();
  });
});

describe("lineTouchesGlobalBoundary", () => {
  const nodeById = (...nodes: ReturnType<typeof createDefaultNode>[]) =>
    new Map(nodes.map((node) => [node.id, node]));

  test("任一端点接到模型关联设备即为跨边界", () => {
    const stationSource = createDefaultNode("ac-station-source", { x: 0, y: 0 });
    const load = createDefaultNode("ac-load", { x: 500, y: 0 });
    const line = connectLine("ac-routable-line", stationSource.id, load.id);
    expect(lineTouchesGlobalBoundary(line, nodeById(stationSource, load, line))).toBe(true);

    const reversed = connectLine("ac-routable-line", load.id, stationSource.id);
    expect(lineTouchesGlobalBoundary(reversed, nodeById(stationSource, load, reversed))).toBe(true);
  });

  test("两端都是本地设备时不算跨边界", () => {
    const a = createDefaultNode("ac-source", { x: 0, y: 0 });
    const b = createDefaultNode("ac-load", { x: 500, y: 0 });
    const line = connectLine("ac-routable-line", a.id, b.id);
    expect(lineTouchesGlobalBoundary(line, nodeById(a, b, line))).toBe(false);
  });

  test("线路自身不是交直流线路时直接判否（哪怕端点是边界设备）", () => {
    const stationSource = createDefaultNode("ac-station-source", { x: 0, y: 0 });
    const transformer = createDefaultNode("ac-transformer", { x: 0, y: 0 });
    transformer.params = {
      ...transformer.params,
      _routableLineSourceNodeId: stationSource.id,
      _routableLineTargetNodeId: stationSource.id
    };
    expect(lineTouchesGlobalBoundary(transformer, nodeById(stationSource, transformer))).toBe(false);
  });

  test("端点 id 在图里查不到时判否（悬空引用不误判成跨边界）", () => {
    const load = createDefaultNode("ac-load", { x: 500, y: 0 });
    const line = connectLine("ac-routable-line", "missing-node", load.id);
    expect(lineTouchesGlobalBoundary(line, nodeById(load, line))).toBe(false);
  });
});

describe("applyGlobalLineRecordsToNodes", () => {
  const lineNode = (extraParams: Record<string, string> = {}) => {
    const line = createDefaultNode("ac-routable-line", { x: 0, y: 0 });
    line.params = { ...line.params, ...extraParams };
    return line;
  };

  test("按 _globalLineId 命中：合入记录参数、覆盖 idx、落记录名", () => {
    const line = lineNode({ [GLOBAL_LINE_ID_PARAM]: "global-line-1", _custom: "keep", stray: "drop" });
    const [next] = applyGlobalLineRecordsToNodes([line], [record()]);
    expect(next.name).toBe("中心厂站-一号线");
    expect(next.params.rated_capacity).toBe("220");
    expect(next.params.idx).toBe("7");
    expect(next.params[GLOBAL_LINE_ID_PARAM]).toBe("global-line-1");
  });

  test("本地键（下划线前缀与 idx）留下，其余本地键被记录参数挤掉", () => {
    const line = lineNode({ [GLOBAL_LINE_ID_PARAM]: "global-line-1", _custom: "keep", stray: "drop" });
    const [next] = applyGlobalLineRecordsToNodes([line], [record()]);
    expect(next.params._custom).toBe("keep");
    expect(next.params.stray).toBeUndefined();
  });

  test("未传 modelKey 时不按引用回填 —— 只有命中 id 的节点才被改", () => {
    const line = lineNode();
    const referenced = record({ references: [{ ...record().references[0], modelKey: "model:9", nodeId: line.id }] });
    const nodes = [line];
    expect(applyGlobalLineRecordsToNodes(nodes, [referenced])).toBe(nodes);
    const [next] = applyGlobalLineRecordsToNodes(nodes, [referenced], "model:9");
    expect(next.params.rated_capacity).toBe("220");
  });

  test("没有任何节点被改时返回同一个数组引用（省一次无谓重渲染）", () => {
    const line = lineNode();
    const nodes = [line];
    expect(applyGlobalLineRecordsToNodes(nodes, [])).toBe(nodes);
    expect(applyGlobalLineRecordsToNodes(nodes, [record()])).toBe(nodes);
  });

  test("能量类型与记录不符的节点不动（交流记录不会覆盖直流线路）", () => {
    const dcLine = createDefaultNode("dc-routable-line", { x: 0, y: 0 });
    dcLine.params = { ...dcLine.params, [GLOBAL_LINE_ID_PARAM]: "global-line-1" };
    const nodes = [dcLine];
    expect(applyGlobalLineRecordsToNodes(nodes, [record({ energyType: "ac" })])).toBe(nodes);
  });
});

// 本组补的是 global-lines.ts 里此前零覆盖的分支。判据一律按「断言必须落在变异真正
// 改变的那个对象上」选：每条都在注释里写明「若这一行被改坏，哪一条断言会转红」。
describe("补齐此前零覆盖的分支", () => {
  const LOCAL = {
    modelKey: "model:1",
    projectIdx: 1,
    schemePath: ["方案"],
    projectName: "模型一",
    nodeId: ""
  };

  test("oppositeGlobalLineEndpoint 反向端：关联负荷落在末端时，报文说首端反了", () => {
    // placement.endpoint = "target"（关联负荷在末端）⇒ oppositeGlobalLineEndpoint 走 "source" 一侧。
    // 载荷行：placement 的 source 槽里坐着 model_id=2（关联电源）⇒ 命中「首末端方向不一致」。
    const feederLoad = createDefaultNode("ac-feeder-load", { x: 500, y: 0 });
    feederLoad.params.model_id = "2";
    const localBus = createDefaultNode("ac-bus", { x: 0, y: 500 });
    const remoteSource = {
      modelKey: "model:2",
      projectIdx: 2,
      schemePath: ["方案"],
      projectName: "目标厂站",
      nodeId: "remote-line",
      boundaryEndpoint: "source" as const
    };
    const localTarget = {
      modelKey: "model:7",
      projectIdx: 7,
      schemePath: ["主方案"],
      projectName: "本地馈线",
      nodeId: "local-line",
      boundaryEndpoint: "target" as const
    };
    const swappedDirection = record({
      id: "gl-swapped",
      idx: 20,
      references: [remoteSource, localTarget],
      endpointSlots: { source: remoteSource, target: localTarget },
      degree: 2
    });
    const localModel = { modelKey: "model:7", projectIdx: 7, projectName: "本地馈线" };

    const fromTarget = globalLineExistingPlacementConflictMessage(
      swappedDirection,
      localBus,
      feederLoad,
      localModel
    );

    // 双侧断言：两个方向各断一次。少了对照组，下面那句「位于首端」可能只是
    // 「端点标签压根不参与拼装」的恒真 —— 事实上 L86 的三向文案本就会写出另一侧。
    expect(fromTarget).toContain("model_id=2 位于首端");
    expect(fromTarget).toContain("要求位于末端");

    // 对照组（双侧断言的另一半）：镜像形状 —— source 槽坐着本模型（不匹配 model_id=2），
    // target 槽坐着 model:2。此时 placement.endpoint = "source" ⇒ opposite 走 "target" 一侧。
    // 少了它，上面的「位于首端」可能只是「首端两个字恰好写死在文案里」的恒真。
    const localSourceRef = {
      modelKey: "model:7",
      projectIdx: 7,
      schemePath: ["主方案"],
      projectName: "本地馈线",
      nodeId: "local-line",
      boundaryEndpoint: "source" as const
    };
    const remoteTargetRef = {
      modelKey: "model:2",
      projectIdx: 2,
      schemePath: ["方案"],
      projectName: "目标厂站",
      nodeId: "remote-line",
      boundaryEndpoint: "target" as const
    };
    const stationSource = createDefaultNode("ac-station-source", { x: 500, y: 0 });
    stationSource.params.model_id = "2";
    const fromSource = globalLineExistingPlacementConflictMessage(
      record({
        id: "gl-swapped-2",
        idx: 21,
        references: [localSourceRef, remoteTargetRef],
        endpointSlots: { source: localSourceRef, target: remoteTargetRef },
        degree: 2
      }),
      stationSource,
      createDefaultNode("ac-load", { x: 900, y: 0 }),
      localModel
    );
    expect(fromSource).toContain("model_id=2 位于末端");
    expect(fromSource).toContain("要求位于首端");
  });

  test("负荷端文案在名字整个缺失时用 ?? 侧的兜底称谓", () => {
    // 载荷行 93：`String(node.name ?? "该模型关联负荷").trim() || "该模型关联负荷"`。
    // 这里专门喂 name === undefined —— 走 ?? 的右操作数，与既有「全空格」用例走的
    // || 那一侧是**两条不同的分支**（coverage 上前者计数为 0）。
    const load = createDefaultNode("ac-station-load", { x: 0, y: 0 });
    delete (load as { name?: string }).name;

    expect(globalLineSourcePlacementFailureMessage(load))
      .toBe("“该模型关联负荷”属于厂站/馈线/台区负荷，只能位于线路末端。");

    // 承重：?? 那一侧的兜底**文本**若被写成别的（本条专用变异），
    // 上面这句立刻红；而既有「全空格」用例（走 || 侧）不受影响。
    // 记一笔等价性：把 93 行的 ?? 换成 || 在全域等价 ——
    // name 为 nullish 时两者都给同一个字面量，非 nullish 时 ?? 根本不起作用，
    // 所以本条能分辨的是「兜底文本写错」，不是「?? 还是 ||」。
  });

  test("电源端文案在名字是纯空白时用 || 侧的兜底称谓", () => {
    // 载荷行 101：既有测试只喂了 name 缺失（?? 侧，计数 1），
    // 没喂 name = "   "（|| 侧，计数 0）。两条分支都要走。
    const source = createDefaultNode("ac-station-source", { x: 0, y: 0 });
    source.name = "   ";

    expect(globalLineTargetPlacementFailureMessage(source))
      .toBe("“该模型关联电源”属于厂站/馈线/台区电源，只能位于线路首端。");

    // 承重：删掉 101 行的 .trim() ⇒ "   " 非空 ⇒ 不再落兜底 ⇒ 这条转红。
    // 对照：name 缺失的既有用例删掉 .trim() 仍绿（?? 侧本就非空），
    // 所以这条是覆盖 .trim() 的唯一一条。
  });

  test("引用没有 projectIdx 时不写出该键：老式 path: 模型键靠 modelKey 识别", () => {
    // 载荷行 186：`...(reference.projectIdx ? { projectIdx } : {})` 的假侧。
    // 本图的 localReference 走老式 path: 键、没有 projectIdx ⇒ 这一支。
    const stationSource = createDefaultNode("ac-station-source", { x: 0, y: 0 });
    stationSource.params.model_id = "22";
    const localLoad = createDefaultNode("ac-load", { x: 500, y: 0 });
    const legacyLocal = {
      modelKey: "path:主方案/本地馈线",
      schemePath: ["主方案"],
      projectName: "本地馈线",
      nodeId: "legacy-line"
    };

    const references = globalLineReferencesForPlacement(legacyLocal, {
      source: { node: stationSource, terminalId: "" },
      target: { node: localLoad, terminalId: "" }
    });

    const localSide = references?.[1];
    expect(localSide?.modelKey).toBe("path:主方案/本地馈线");
    // 断言「键不存在」而不是「值为 undefined」：变异把三元条件写成恒真时，
    // projectIdx 会以 undefined 的形式**存在**，Object.hasOwn 仍为 true ⇒ 转红。
    expect(Object.hasOwn(localSide ?? {}, "projectIdx")).toBe(false);
    // 对照组：关联侧确实带 projectIdx，证明上一条不是「压根没写这个键」。
    expect(references?.[0]?.projectIdx).toBe(22);
  });

  test("两端都不是模型关联设备时不产出任何引用（此前只覆盖了「两端都关联」的早退）", () => {
    // 载荷行 211：`if (!endpointEntries.some(...)) return [];` 的真侧。
    // 既有测试的两处 [] 都来自 205 行的「两端不能同时关联」早退，走不到 211。
    const localModel = {
      modelKey: "model:7",
      projectIdx: 7,
      schemePath: ["主方案"],
      projectName: "本地馈线",
      nodeId: "pure-local"
    };

    expect(globalLineReferencesForPlacement(localModel, {
      source: { node: createDefaultNode("ac-bus", { x: 0, y: 0 }), terminalId: "" },
      target: { node: createDefaultNode("ac-load", { x: 500, y: 0 }), terminalId: "" }
    })).toEqual([]);

    // 承重：删掉 211 行的 some 判据 ⇒ 会继续产出两条本地引用 ⇒ 上面的 [] 转红。
    // 反向对照：加一条关联端进去，产出非空 —— 证明 [] 不是「这函数恒返回空」。
    const stationSource = createDefaultNode("ac-station-source", { x: 0, y: 0 });
    stationSource.params.model_id = "22";
    expect(globalLineReferencesForPlacement(localModel, {
      source: { node: stationSource, terminalId: "" },
      target: { node: createDefaultNode("ac-load", { x: 500, y: 0 }), terminalId: "" }
    })).toHaveLength(2);
  });

  test("移除全局身份：三个键都没有时原样返回同一个节点对象", () => {
    // 载荷行 280：三个 && 操作数一个都没被量过 —— 既有用例只喂「三键俱全」的节点。
    const plain = connectLine("ac-routable-line", "s2", "t2");

    // 身份断言：返回的是**同一个对象引用**，不是等价副本。
    // 删掉 280 行整段早退 ⇒ 返回新对象 ⇒ toBe 转红（toEqual 不会红，所以不用它）。
    expect(removeGlobalLineIdentityForLocalNode(plain)).toBe(plain);

    // 短路的另一半：只带 pair 键 ⇒ 第二个操作数为真 ⇒ 落到第三个操作数（idx）；
    // 只带 idx ⇒ 第三个操作数为真。三种形状都覆盖，&& 链才不是「只测过短路的第一段」。
    const pairOnly = connectLine("ac-routable-line", "s3", "t3");
    pairOnly.params = { ...pairOnly.params, [GLOBAL_LINE_MODEL_PAIR_PARAM]: "target" };
    const pairDetached = removeGlobalLineIdentityForLocalNode(pairOnly);
    expect(pairDetached).not.toBe(pairOnly);
    expect(pairDetached.params[GLOBAL_LINE_MODEL_PAIR_PARAM]).toBeUndefined();

    const idxOnly = connectLine("ac-routable-line", "s4", "t4");
    idxOnly.params = { ...idxOnly.params, idx: "77" };
    const idxDetached = removeGlobalLineIdentityForLocalNode(idxOnly);
    expect(idxDetached).not.toBe(idxOnly);
    expect(idxDetached.params.idx).toBeUndefined();

    // 反向对照：全局 id 键在 ⇒ 不能走早退（否则下面这条恒绿，short-circuit 无鉴别力）。
    const idKeyed = connectLine("ac-routable-line", "s5", "t5");
    idKeyed.params = { ...idKeyed.params, [GLOBAL_LINE_ID_PARAM]: "global-77" };
    expect(removeGlobalLineIdentityForLocalNode(idKeyed).params[GLOBAL_LINE_ID_PARAM]).toBeUndefined();
  });

  test("应用记录时若节点已是记录的样子就返回同一个对象（省一次无谓重渲染）", () => {
    // 载荷行 304：`name 相同 && 参数深相等 ⇒ 返回 node` 此前从未为真。
    const original = connectLine("ac-routable-line", "s", "t");
    const first = applyGlobalLineRecordToNode(original, record());

    // 前置条件自证：第一次**确实**改了对象，否则下面 toBe 可能只是「函数恒返回入参」。
    expect(first).not.toBe(original);
    expect(first.name).toBe(record().name);
    const second = applyGlobalLineRecordToNode(first, record());

    // 承重：删掉 304 行第二个操作数（参数深比较）⇒ 首次调用就早退 ⇒ first 仍是原节点，
    // 它的 rated_capacity 停在模型里的 "0"，上面 name 断言与本条 toBe 同时转红。
    expect(first.params.rated_capacity).toBe("220");
    expect(second).toBe(first);

    // 反向对照：名字已经是记录名、但**参数**仍旧 ⇒ 必须返回新对象。
    // 少了它，上面那句 `first.params.rated_capacity === "220"` 就可能是「首次调用压根没比对参数」
    // 的恒真 —— 而删掉深比较恰好能让那句话保持绿。
    const staleParams = connectLine("ac-routable-line", "s", "t");
    staleParams.name = record().name;
    staleParams.params = { ...staleParams.params, rated_capacity: "999" };
    const refreshed = applyGlobalLineRecordToNode(staleParams, record());
    expect(refreshed).not.toBe(staleParams);
    expect(refreshed.params.rated_capacity).toBe("220");
  });

  test("边界引用的归属模型经同节点的物理引用改判，删除本图线路时远端引用一并隐去", () => {
    // 载荷行 341：boundaryNodeId 存在时，归属 modelKey 要改从「同 nodeId 且无
    // boundaryNodeId 的物理引用」取。此前所有 fixture 的引用都没有 boundaryNodeId，
    // 这一支从未被量过。
    const stationSource = createDefaultNode("ac-station-source", { x: 0, y: 0 });
    stationSource.params.model_id = "22";
    // 末端刻意悬空 ⇒ globalLinePlacementEndpointsForNode 返回 null ⇒ 第二轮循环在
    // 498 行 continue，结果**纯粹**来自 450 行按归属过滤那一步，把 341 的效果单独暴露出来。
    const localLine = connectLine("ac-routable-line", stationSource.id, "missing-target");
    localLine.id = "line-a";
    localLine.name = "待补端";
    localLine.params = { ...localLine.params, [GLOBAL_LINE_ID_PARAM]: "gl-owner" };

    const boundaryReference = {
      modelKey: "model:2",
      projectIdx: 2,
      schemePath: ["方案"],
      projectName: "模型二",
      nodeId: "line-a",
      boundaryEndpoint: "source" as const,
      boundaryNodeId: "station-remote",
      boundaryTerminalId: "t1"
    };
    const physicalReference = {
      modelKey: "model:1",
      projectIdx: 1,
      schemePath: ["方案"],
      projectName: "模型一",
      nodeId: "line-a",
      boundaryEndpoint: "target" as const
    };

    const withPhysicalSibling = previewGlobalLineRecordsForProject(
      [record({
        id: "gl-owner",
        idx: 22,
        references: [boundaryReference, physicalReference],
        endpointSlots: { source: boundaryReference, target: physicalReference },
        degree: 2
      })],
      [stationSource, localLine],
      "厂站",
      LOCAL
    );
    // 改判后 boundaryReference 的归属是 model:1 = 本模型 ⇒ 与物理引用一起被滤掉。
    expect(withPhysicalSibling).toHaveLength(1);
    expect(withPhysicalSibling[0].references).toEqual([]);
    expect(withPhysicalSibling[0].degree).toBe(0);

    // 对照组（双侧断言的另一半）：同样带 boundaryNodeId，但没有同节点物理引用 ⇒
    // 归属回落成 reference 自身的 modelKey = model:2 ≠ 本模型 ⇒ 引用被保留。
    // 少了它，上面那个 [] 可能只是「带 boundaryNodeId 就一律删掉」的恒真。
    const orphanBoundary = previewGlobalLineRecordsForProject(
      [record({
        id: "gl-owner",
        idx: 22,
        references: [{ ...boundaryReference, nodeId: "line-a" }],
        endpointSlots: { source: boundaryReference, target: null },
        degree: 1
      })],
      [stationSource, localLine],
      "厂站",
      LOCAL
    );
    expect(orphanBoundary[0].references).toHaveLength(1);
    expect(orphanBoundary[0].references[0].boundaryEndpoint).toBe("source");
  });

  test("合入引用时同 modelKey + nodeId 的旧引用被就地替换，不追加", () => {
    // 载荷行 374：`modelKey 相同 && nodeId 相同` 的真侧 + 376 行的 >= 0 分支。
    const stationSource = createDefaultNode("ac-station-source", { x: 0, y: 0 });
    stationSource.params.model_id = "22";
    const localLoad = createDefaultNode("ac-load", { x: 500, y: 0 });

    const otherModelReference = {
      modelKey: "model:9",
      projectIdx: 9,
      schemePath: ["方案"],
      projectName: "模型九",
      nodeId: "line-x"
    };
    const staleLocalReference = {
      modelKey: "model:1",
      projectIdx: 1,
      schemePath: ["方案"],
      projectName: "模型一",
      nodeId: "line-x",
      boundaryEndpoint: "source" as const,
      boundaryNodeId: "station-old"
    };

    const merged = previewGlobalLineRecordsForProject(
      [record({
        id: "gl-merge",
        idx: 21,
        references: [otherModelReference, staleLocalReference],
        endpointSlots: { source: staleLocalReference, target: null },
        degree: 2
      })],
      [stationSource, localLoad, { ...connectLine("ac-routable-line", stationSource.id, localLoad.id) }],
      "厂站",
      LOCAL
    );
    // 先取基线：确认这套装配本身能命中「就地替换」，否则下面是在断言恒真。
    expect(merged[0].references).toHaveLength(2);

    // 真正要断的是 nodeId 与线路节点一致的那条路径。
    const liveLine = connectLine("ac-routable-line", stationSource.id, localLoad.id);
    liveLine.id = "line-x";
    liveLine.name = record().name;
    liveLine.params = { ...liveLine.params, [GLOBAL_LINE_ID_PARAM]: "gl-merge", idx: "21" };

    const replaced = previewGlobalLineRecordsForProject(
      [record({
        id: "gl-merge",
        idx: 21,
        references: [otherModelReference, staleLocalReference],
        endpointSlots: { source: staleLocalReference, target: null },
        degree: 2
      })],
      [stationSource, localLoad, liveLine],
      "厂站",
      LOCAL
    )[0];

    // 承重：把 374 行的 && 改成 || ⇒ 第 0 条（model:9 vs model:1）因 nodeId 相同而被判中
    // ⇒ 换掉的是 index 0 ⇒ 下面 references[0].modelKey 立刻从 model:9 变 model:1。
    expect(replaced.references).toHaveLength(2);
    expect(replaced.references[0].modelKey).toBe("model:9");
    // 就地替换 ⇒ 顺序不变（异模型那条仍在 index 0），且 source 槽拿到的是新端点。
    expect(replaced.references[1].modelKey).toBe("model:1");
    expect(replaced.endpointSlots?.source?.boundaryNodeId).toBe(stationSource.id);
  });
});

describe("globalLineKindForEnergy", () => {
  test("能量类型映射回可路由线路 kind", () => {
    expect(globalLineKindForEnergy("ac")).toBe("ac-routable-line");
    expect(globalLineKindForEnergy("dc")).toBe("dc-routable-line");
  });
});

// ─── useGlobalLines 的 SSR 行为探针 ───
//
// 此前本文件对 useGlobalLines 只有两处 readFileSync + toContain 的**源码文本**断言
// （见上面「全局线路数据同步」的两条）。文本断言能钉住「没有调某个会写表的接口」，
// 但对**返回值**零覆盖：派生记录的数量、id、idx、出度、首末端的 modelKey 全部只被 e2e
// 顺带观察到，改坏了不会有任何一条单测转红。
//
// 本组用 renderToStaticMarkup 驱动一个探针组件把 hook 的派生值渲染成 HTML 再断言。
// 选它而不是手写 hook harness 的理由：useGlobalLines 是纯 hook（无模块级状态），
// 而 renderToStaticMarkup 在 node 环境下就能跑完 useState / useMemo / useRef / Object.assign
// 这一整条**渲染期**求值链，且 **useEffect 不执行** —— 于是「派生值不依赖 fetch」这条契约
// 直接成为探针的前提，不需要先把 fetch 桩好才拿得到值。
// 前例：src/acContainerModel.test.ts（同一 .ts 文件内用 createElement，非 .tsx）。

// globalThis 上本组唯一会碰的键是 fetch（只在 loadRecords 这条异步路径上）。
// 逐键快照 / 还原，理由与做法照 commit 0007e864：vi.unstubAllGlobals 只认得本文件
// 通过 vi.stubGlobal 登记过的键，直接 delete 的键它还原不回来，会漏给后跑的文件。
const GLOBAL_KEYS = ["fetch"] as const;
type GlobalKey = (typeof GLOBAL_KEYS)[number];
function snapshotGlobalKeys(): Array<[GlobalKey, unknown]> {
  const target = globalThis as unknown as Record<string, unknown>;
  return GLOBAL_KEYS.map((key) => [key, target[key]]);
}
function restoreGlobalKeys(snapshot: Array<[GlobalKey, unknown]>): void {
  const target = globalThis as unknown as Record<string, unknown>;
  for (const [key, value] of snapshot) {
    if (value === undefined) delete target[key];
    else target[key] = value;
  }
}
const globalKeysBaseline = snapshotGlobalKeys();

function stubFetch(handler: (url: string) => unknown) {
  (globalThis as unknown as Record<string, unknown>).fetch = (url: string) =>
    Promise.resolve(handler(String(url)));
}

/** 一个模型关联电源（跨模型边界设备），model_id 决定它归属哪个模型。 */
function boundaryStation(modelId: string, name = "厂站电源") {
  const node = createDefaultNode("ac-station-source", { x: 0, y: 0 });
  node.params.model_id = modelId;
  node.name = name;
  return node;
}

/** useGlobalLines 需要的最小 scope 形态（App.tsx 里 __appScope 的一个切片）。 */
function globalLineScope(overrides: Record<string, any> = {}): Record<string, any> {
  return {
    projectIdx: 7,
    projectName: "本地馈线",
    modelType: "厂站",
    savedSchemePathForId: () => ["主方案"],
    ...overrides
  };
}

/** 已挂上全局身份、按走向指向 model_id 模型的页面草稿线路。 */
function draftGlobalLine(sourceId: string, targetId: string, name = "跨厂站线路") {
  const line = connectLine("ac-routable-line", sourceId, targetId);
  line.name = name;
  line.params = {
    ...line.params,
    [GLOBAL_LINE_ID_PARAM]: "global-line-1",
    [GLOBAL_LINE_MODEL_PAIR_PARAM]: "1",
    idx: "8"
  };
  return line;
}

type GlobalLinesProbeProps = { scope: Record<string, any> };

/**
 * 把 hook 的派生记录渲染成 <li>，属性即断言面。
 * 用 createElement 而非 JSX —— 本文件是 .ts。
 */
function GlobalLinesProbe({ scope }: GlobalLinesProbeProps) {
  const derived = useGlobalLines(scope);
  return createElement(
    "ul",
    { "data-record-count": String(derived.records.length) },
    ...derived.records.map((record) => createElement("li", {
      key: record.id,
      "data-global-line-id": record.id,
      "data-idx": String(record.idx),
      "data-name": record.name,
      "data-energy-type": record.energyType,
      "data-degree": String(record.degree),
      "data-source-model": record.endpointSlots?.source?.modelKey ?? "",
      "data-target-model": record.endpointSlots?.target?.modelKey ?? ""
    }))
  );
}

function renderGlobalLines(scope: Record<string, any>) {
  return renderToStaticMarkup(createElement(GlobalLinesProbe, { scope }));
}

function lineElements(html: string) {
  return html.match(/<li /g)?.length ?? 0;
}

describe("useGlobalLines SSR 派生值", () => {
  afterEach(() => {
    restoreGlobalKeys(globalKeysBaseline);
  });

  test("页面草稿线路派生出一条记录，首末端分别指向 model_id 模型与本图", () => {
    const station = boundaryStation("22");
    const load = createDefaultNode("ac-load", { x: 500, y: 0 });
    const line = draftGlobalLine(station.id, load.id, "厂站一号线");
    const scope = globalLineScope({ nodes: [station, load, line] });

    const html = renderGlobalLines(scope);

    expect(lineElements(html)).toBe(1);
    expect(html).toContain('data-record-count="1"');
    expect(html).toContain('data-global-line-id="global-line-1"');
    expect(html).toContain('data-idx="8"');
    expect(html).toContain('data-energy-type="ac"');
    // 走向两端各占一个引用 ⇒ 出度 2，且两端 modelKey 不同（这正是「跨模型」的判据）
    expect(html).toContain('data-degree="2"');
    expect(html).toContain('data-source-model="model:22"');
    expect(html).toContain('data-target-model="model:7"');
    expect(html).toContain("厂站一号线");
  });

  test("没有跨边界线路时渲染出零条记录，且模型类型不在管辖范围时同样为零", () => {
    const station = boundaryStation("22");
    const load = createDefaultNode("ac-load", { x: 500, y: 0 });

    // 图里只有边界电源与一个本地负荷，没有任何跨边界线路
    const empty = renderGlobalLines(globalLineScope({ nodes: [station, load] }));
    expect(lineElements(empty)).toBe(0);
    expect(empty).toContain('data-record-count="0"');

    // 反向：线路确实跨边界，但当前模型类型不归全局线路管辖 ⇒ 派生记录仍为空
    const unmanaged = renderGlobalLines(globalLineScope({
      modelType: "配电",
      nodes: [station, load, draftGlobalLine(station.id, load.id)]
    }));
    expect(lineElements(unmanaged)).toBe(0);
    expect(unmanaged).toContain('data-record-count="0"');
  });

  // 下面两条钉的是 hook 里 modelReferenceFromScope 的那两处 as any：
  //   nodeById.get(sourceNodeId) ?? { kind: "" as any, params: {} }
  //   nodeById.get(targetNodeId) ?? { kind: "" as any, params: {} }
  // 它们**不是**全局挂载、也不是取 DOM —— as any 只是给内联哨兵节点（kind 为空串）
  // 绕过 Pick<ModelNode, "kind" | "params"> 的类型检查。运行时的真实语义只有一个：
  // 端点 id 在图里查不到时，用哨兵节点去问 isGlobalLineBoundaryNode，得到 false（空串 kind
  // 在 modelAssociationModelTypeForKind 的查表里必然落空），于是 boundaryEndpoint 判否。
  // 暴露面选 globalLineBoundaryAdjustmentConflictMessage —— 它内部对原始/调整后两个节点
  // 各调一次 modelReferenceFromScope，是这条链上唯一能从 scope 上取到的入口
  // （requestExistingNodeGlobalLinePlacement 虽然在 hook 里定义了，但没被 Object.assign
  // 到 scope、也没进返回值，是死代码，从外部调不到）。

  /**
   * 只造参数、不入图 —— modelReferenceFromScope 只读传入节点的 params，
   * nodeById 则从 scope.nodes 里取，所以「引用形状」与「派生记录的 degree」可以分开调。
   */
  function referenceOf(base: ReturnType<typeof createDefaultNode>, sourceId: string, targetId: string, targetTerminal = "") {
    return {
      ...base,
      params: {
        ...base.params,
        [GLOBAL_LINE_ID_PARAM]: "global-line-1",
        _routableLineSourceNodeId: sourceId,
        _routableLineTargetNodeId: targetId,
        _routableLineTargetTerminalId: targetTerminal
      }
    };
  }

  test("哨兵节点判否而不抛错：首端 id 悬空时求值回落到末端，边界端不变故不报冲突", () => {
    const station = boundaryStation("22");
    const stationB = boundaryStation("33", "另一厂站电源");
    const load = createDefaultNode("ac-load", { x: 500, y: 0 });
    // 图里的线路只有一侧边界（草稿形态），派生记录 degree 才是 2 —— 冲突判据要求 degree >= 2
    const line = draftGlobalLine(station.id, load.id);
    const scope = globalLineScope({ nodes: [station, stationB, load, line] });
    renderGlobalLines(scope);
    expect(scope.globalLineRecords[0]).toMatchObject({ id: "global-line-1", degree: 2 });

    // 原始态：首端是本地负荷（判否）⇒ 边界端 = target，boundaryNodeId = stationB，端子 = t1
    const current = referenceOf(line, load.id, stationB.id, "t1");
    expect(scope.globalLineBoundaryAdjustmentConflictMessage(current, current)).toBe("");

    // 调整后：首端 id 悬空 ⇒ nodeById.get 返回 undefined ⇒ 落到哨兵节点 ⇒ 判否
    // ⇒ 求值继续走末端分支，拿到的仍是 target/stationB/t1，与原始态完全一致 ⇒ 不报冲突。
    // 这条承重：哨兵若被误判成边界端，端点会变成 source、boundaryNodeId 变 missing-station，
    // 本条立刻转红。
    const danglingSource = referenceOf(line, "missing-station", stationB.id, "t1");
    expect(scope.globalLineBoundaryAdjustmentConflictMessage(current, danglingSource)).toBe("");

    // 对照组：首端换成**真实存在**的边界电源 ⇒ 端点与端点 id 都变了 ⇒ 必须报冲突。
    // 没有它，上面的空串可能只是「判据压根没触发」的恒真。
    const realBoundarySource = referenceOf(line, station.id, stationB.id, "t1");
    expect(scope.globalLineBoundaryAdjustmentConflictMessage(current, realBoundarySource))
      .toContain("先删除另一端");
  });

  test("两端 id 都悬空时两处哨兵都判否，boundaryEndpoint 退化为 undefined", () => {
    const station = boundaryStation("22");
    const stationB = boundaryStation("33", "另一厂站电源");
    const load = createDefaultNode("ac-load", { x: 500, y: 0 });
    const line = draftGlobalLine(station.id, load.id);
    const scope = globalLineScope({ nodes: [station, stationB, load, line] });
    renderGlobalLines(scope);

    const current = referenceOf(line, load.id, stationB.id, "t1");

    // 两端都悬空 ⇒ 首端哨兵判否、末端哨兵也判否 ⇒ boundaryEndpoint 为 undefined，
    // 冲突判据在 !nextReference?.boundaryEndpoint 处早退，返回空串。
    const bothMissing = referenceOf(line, "missing-source", "missing-target");
    expect(scope.globalLineBoundaryAdjustmentConflictMessage(current, bothMissing)).toBe("");

    // 双侧断言的另一半：末端悬空但首端是**真实**边界设备 ⇒ 仍能拿到 source 边界端 ⇒ 报冲突。
    // 期望值与上面那条不同（冲突文案 vs 空串），两条合起来才排除了「哨兵恒判否 ⇒ 一律空串」
    // 与「冲突判据根本没跑」这两种让本组恒绿的可能。
    const sourceOnly = referenceOf(line, station.id, "missing-target");
    expect(scope.globalLineBoundaryAdjustmentConflictMessage(current, sourceOnly))
      .toContain("先删除另一端");
  });

  test("同一个 scope 上数据变化后重新渲染，派生记录跟着变而非静态快照", () => {
    const station = boundaryStation("22");
    const load = createDefaultNode("ac-load", { x: 500, y: 0 });
    const line = draftGlobalLine(station.id, load.id, "厂站一号线");
    const scope = globalLineScope({ nodes: [station, load, line] });

    const before = renderGlobalLines(scope);
    expect(lineElements(before)).toBe(1);
    expect(before).toContain('data-name="厂站一号线"');

    // 就地改同一个 scope 的 nodes（不改 scope 引用），派生值必须重新求值
    const dcStation = createDefaultNode("dc-district-load", { x: 800, y: 0 });
    dcStation.params.model_id = "44";
    const secondLine = connectLine("dc-routable-line", station.id, dcStation.id);
    secondLine.name = "直流支线";
    secondLine.params = {
      ...secondLine.params,
      [GLOBAL_LINE_ID_PARAM]: "global-line-2",
      [GLOBAL_LINE_MODEL_PAIR_PARAM]: "1",
      idx: "9"
    };
    scope.nodes = [station, load, line, dcStation, secondLine];

    const after = renderGlobalLines(scope);
    expect(lineElements(after)).toBe(2);
    expect(after).toContain('data-record-count="2"');
    expect(after).toContain('data-global-line-id="global-line-2"');
    expect(after).toContain('data-name="直流支线"');
    expect(after).toContain('data-energy-type="dc"');
    // 旧记录仍在（派生是叠加而非替换）
    expect(after).toContain('data-global-line-id="global-line-1"');

    // 撤掉线路节点后重新渲染归零 —— 证明前一次的两条来自这批数据，不是模块级快照
    scope.nodes = [station, load, dcStation];
    expect(lineElements(renderGlobalLines(scope))).toBe(0);
  });

  test("SSR 渲染期不读全局 fetch：删掉 fetch 后渲染照常成功并给出派生值", () => {
    const station = boundaryStation("22");
    const load = createDefaultNode("ac-load", { x: 500, y: 0 });
    const line = draftGlobalLine(station.id, load.id);
    const scope = globalLineScope({ nodes: [station, load, line] });

    // fetch 缺失时，渲染期依旧不抛错、派生值依旧拿得到（渲染期不发请求）。
    // 这条同时钉住「派生链上没有 globalThis.fetch 依赖」—— 它若被挪到渲染期求值，
    // 下面这一行就会 ReferenceError。
    const target = globalThis as unknown as Record<string, unknown>;
    delete target.fetch;
    expect(target.fetch).toBeUndefined();
    const html = renderGlobalLines(scope);
    expect(lineElements(html)).toBe(1);
    expect(html).toContain('data-global-line-id="global-line-1"');
    // Object.assign 挂到 scope 上的派生值同样可用
    expect(scope.globalLineRecords).toHaveLength(1);
    expect(scope.globalLineRecords[0]).toMatchObject({ id: "global-line-1", degree: 2 });
    expect(scope.globalLinePlacementDialog).toBeNull();
    expect(scope.globalLineTransitionDialog).toBeNull();
  });

  test("fetch 缺失时显式加载按现状抛出，不被静默吞掉", async () => {
    const station = boundaryStation("22");
    const load = createDefaultNode("ac-load", { x: 500, y: 0 });
    const line = draftGlobalLine(station.id, load.id);
    const scope = globalLineScope({ nodes: [station, load, line] });
    renderGlobalLines(scope);

    const target = globalThis as unknown as Record<string, unknown>;
    delete target.fetch;
    // loadRecords 里的 fetch 是自由变量，缺失时抛 ReferenceError；
    // loadGlobalLineRecords 自己不 catch，错误冒到调用方。
    // 钉的是现状：hook 渲染期不碰它，只有显式调用加载入口才会踩到。
    await expect(scope.loadGlobalLineRecords()).rejects.toThrow(ReferenceError);
  });

  test("fetch 返回的持久化记录不进 SSR 派生值（useEffect 在 SSR 下不执行）", async () => {
    const seen: string[] = [];
    stubFetch((url) => {
      seen.push(url);
      return { ok: true, json: () => Promise.resolve({ ok: true, records: [record()] }) };
    });
    const station = boundaryStation("22");
    const load = createDefaultNode("ac-load", { x: 500, y: 0 });
    const line = draftGlobalLine(station.id, load.id);
    const scope = globalLineScope({ nodes: [station, load, line] });

    const html = renderGlobalLines(scope);
    await new Promise((resolve) => setTimeout(resolve, 0));

    // 渲染 + 一个宏任务之后，fetch 一次都没被调过
    expect(seen).toEqual([]);
    expect(lineElements(html)).toBe(1);

    // 显式调用加载入口才会发请求，且带上 API 前缀
    stubFetch((url) => {
      seen.push(url);
      return { ok: true, json: () => Promise.resolve({ ok: true, records: [] }) };
    });
    await scope.loadGlobalLineRecords();
    expect(seen).toEqual(["/webgrp/global-lines"]);
  });
});
