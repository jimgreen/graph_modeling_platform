import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

import {
  analyzeAllNetworkTopology,
  collectAllNetworkTopologyModels,
  collectAllNetworkTopologyReferenceModels,
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
