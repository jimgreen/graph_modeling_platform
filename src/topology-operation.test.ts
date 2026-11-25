import { beforeEach, describe, expect, test } from "vitest";
import { createDefaultNode } from "./model";

function zeroRatedCapacityLoad() {
  const load = createDefaultNode("ac-load", { x: 100, y: 100 });
  const { ratedCapacity: _legacy, ...params } = load.params;
  load.name = "交流负荷";
  load.params = { ...params, rated_capacity: "0", rated_voltage: "10" };
  load.terminals[0].vbase = "10 kV";
  return load;
}

function projectWithLoad(load: ReturnType<typeof zeroRatedCapacityLoad>) {
  return {
    version: 1 as const,
    name: "容量检查模型",
    modelType: "厂站" as const,
    powerUnit: "MW",
    voltageUnit: "kV",
    currentUnit: "A",
    nodes: [load],
    edges: []
  };
}

beforeEach(async () => {
  const { resetRatedCapacityFixSession } = await import("./topology-capacity-fix");
  resetRatedCapacityFixSession();
});

describe("runTopologyOperation", () => {
  test("check previews rated-capacity correction without mutating project or advancing session state", async () => {
    const { pendingRatedCapacityFixCount } = await import("./topology-capacity-fix");
    const { runTopologyOperation } = await import("./topology-operation");
    const load = zeroRatedCapacityLoad();
    const project = projectWithLoad(load);
    const original = structuredClone(project);

    const result = runTopologyOperation(project, {
      mode: "check",
      capacityFixScopeKey: "scheme-a:model-a"
    });

    expect(project).toEqual(original);
    expect(result.corrections).toContainEqual({
      nodeId: load.id,
      paramKey: "rated_capacity",
      value: "5 MW"
    });
    expect(result.nodes[0].params.rated_capacity).toBe("5 MW");
    expect(pendingRatedCapacityFixCount()).toBe(0);
  });

  test("ui mode preserves the existing two-pass rated-capacity correction", async () => {
    const { pendingRatedCapacityFixCount } = await import("./topology-capacity-fix");
    const { runTopologyOperation } = await import("./topology-operation");
    const load = zeroRatedCapacityLoad();
    const project = projectWithLoad(load);
    const options = { mode: "ui" as const, capacityFixScopeKey: "scheme-a:model-a" };

    const first = runTopologyOperation(project, options);
    expect(first.nodes[0].params.rated_capacity).toBe("0");
    expect(pendingRatedCapacityFixCount()).toBe(1);

    const second = runTopologyOperation(project, options);
    expect(second.nodes[0].params.rated_capacity).toBe("5 MW");
    expect(second.corrections).toContainEqual({
      nodeId: load.id,
      paramKey: "rated_capacity",
      value: "5 MW"
    });
    expect(pendingRatedCapacityFixCount()).toBe(0);
  });

  test("repair reports changed topology fields as model modifications", async () => {
    const { runTopologyOperation } = await import("./topology-operation");
    const source = createDefaultNode("ac-source", { x: 100, y: 100 });
    const bus = createDefaultNode("ac-bus", { x: 300, y: 100 });
    source.terminals[0].vbase = "10 kV";
    const project = {
      version: 1 as const,
      name: "已连接模型",
      modelType: "厂站" as const,
      nodes: [source, bus],
      edges: [{ id: "source-bus", sourceId: source.id, targetId: bus.id, sourceTerminalId: "t1", targetTerminalId: "t1" }]
    };
    const original = structuredClone(project.nodes);

    const result = runTopologyOperation(project, { mode: "repair" });

    expect(result.errors).toEqual([]);
    expect(result.nodes).not.toEqual(original);
    expect(result.modified).toBe(true);
  });

  test("repair applies safe parameter corrections while preserving blocking topology errors", async () => {
    const { runTopologyOperation } = await import("./topology-operation");
    const load = zeroRatedCapacityLoad();

    const result = runTopologyOperation(projectWithLoad(load), { mode: "repair" });

    expect(result.status).toBe("failed");
    expect(result.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: "floating-terminal", nodeId: load.id })
    ]));
    expect(result.nodes[0].params.rated_capacity).toBe("5 MW");
    expect(result.corrections).toContainEqual({
      nodeId: load.id,
      paramKey: "rated_capacity",
      value: "5 MW"
    });
    expect(result.topology).toBeUndefined();
  });

  test("端点容器内部成员不进入拓扑结果", async () => {
    const { runTopologyOperation } = await import("./topology-operation");
    const container = createDefaultNode("ac-endpoint-container", { x: 100, y: 100 });
    container.terminals[0].vbase = "10 kV";
    const member = createDefaultNode("ac-load", { x: 120, y: 120 });
    member.containerId = container.id;
    const result = runTopologyOperation({
      modelType: "厂站",
      powerUnit: "MW",
      voltageUnit: "kV",
      currentUnit: "A",
      nodes: [container, member],
      edges: []
    }, { mode: "check" });
    expect(result.errors.some((error) => error.nodeId === member.id)).toBe(false);
    expect(result.topology?.nodes[member.id]).toBeUndefined();
  });
});
