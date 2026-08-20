import { describe, expect, test } from "vitest";
import { createDefaultNode } from "./model";
import {
  GLOBAL_LINE_ID_PARAM,
  applyGlobalLineRecordToNode,
  candidateGlobalLines,
  deriveLocalDeviceIndexCounters,
  expandGlobalBoundaryDeletionNodeIds,
  globalLineBoundaryAdjustmentConflictMessage,
  globalLineSharedParamsFromNode,
  isGlobalLineBoundaryNode,
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
  test("模型按钮和十二种模型关联电源/负荷都属于跨模型边界设备", () => {
    expect(isGlobalLineBoundaryNode(createDefaultNode("static-model-interaction-station", { x: 0, y: 0 }))).toBe(true);
    expect(isGlobalLineBoundaryNode(createDefaultNode("static-model-interaction-feeder", { x: 0, y: 0 }))).toBe(true);
    expect(isGlobalLineBoundaryNode(createDefaultNode("static-model-interaction-district", { x: 0, y: 0 }))).toBe(true);
    expect(isGlobalLineBoundaryNode(createDefaultNode("ac-station-source", { x: 0, y: 0 }))).toBe(true);
    expect(isGlobalLineBoundaryNode(createDefaultNode("dc-feeder-load", { x: 0, y: 0 }))).toBe(true);
    expect(isGlobalLineBoundaryNode(createDefaultNode("ac-load", { x: 0, y: 0 }))).toBe(false);
  });

  test("只有厂站馈线台区内接触边界设备的交直流线路才全局维护", () => {
    const button = createDefaultNode("static-model-interaction-station", { x: 0, y: 0 });
    const bus = createDefaultNode("ac-bus", { x: 300, y: 0 });
    const boundaryLine = connectLine("ac-routable-line", bus.id, button.id);
    const localLoad = createDefaultNode("ac-load", { x: 600, y: 0 });
    const localLine = connectLine("ac-routable-line", bus.id, localLoad.id);

    expect(shouldManageLineGlobally(boundaryLine, [button, bus, localLoad, boundaryLine], "厂站")).toBe(true);
    expect(shouldManageLineGlobally(localLine, [button, bus, localLoad, localLine], "厂站")).toBe(false);
    expect(shouldManageLineGlobally(boundaryLine, [button, bus, boundaryLine], "其他")).toBe(false);
    expect(shouldUseGlobalLineForEndpoints("馈线", boundaryLine.kind, bus, button)).toBe(true);
    expect(shouldUseGlobalLineForEndpoints("馈线", localLine.kind, bus, localLoad)).toBe(false);
  });
});

describe("全局线路数据同步", () => {
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

  test("应用全局记录时统一名称序号和共享参数，同时保留本图路由与拓扑字段", () => {
    const line = connectLine("ac-routable-line", "source", "target");
    line.name = "旧名称";
    line.params = { ...line.params, idx: "2", i_node: "101", j_node: "102", rated_capacity: "100" };

    const updated = applyGlobalLineRecordToNode(line, record());

    expect(updated.name).toBe("中心厂站-一号线");
    expect(updated.params.idx).toBe("7");
    expect(updated.params.rated_capacity).toBe("220");
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
    expect(detached.params.idx).toBeUndefined();
    expect(Math.max(0, ...Object.values(counters))).toBe(3);
  });

  test("既有线路候选包含出线度为0或方向互补的出线度为1记录，并排除已满或本模型已用记录", () => {
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
      record({ id: "same-model", idx: 8, references: [{ modelKey: "model:2", schemePath: [], projectName: "二", nodeId: "x" }] }),
      record({ id: "full", idx: 9, degree: 2 }),
      record({ id: "dc", idx: 10, energyType: "dc" }),
      record({ id: "source-occupied", idx: 11, references: [sourceReference], endpointSlots: { source: sourceReference, target: null } })
    ];

    expect(candidateGlobalLines(records, "ac", "model:2", "source").map((item) => item.id)).toEqual(["empty", "global-line-1"]);
    expect(candidateGlobalLines(records, "ac", "model:2", "target").map((item) => item.id)).toEqual(["empty", "source-occupied"]);
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
