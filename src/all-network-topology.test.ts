import { describe, expect, test } from "vitest";

import {
  analyzeAllNetworkTopology,
  collectAllNetworkTopologyModels,
  defaultAllNetworkTopologySelection
} from "./all-network-topology";
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
    expect(partial.warnings).toEqual([
      expect.objectContaining({
        modelName: "十千伏一线",
        deviceName: "十千伏联络线",
        message: expect.stringContaining("中心厂站")
      })
    ]);

    const complete = analyzeAllNetworkTopology([station, feeder], [station, feeder]);
    expect(complete.warnings).toEqual([]);
  });
});
