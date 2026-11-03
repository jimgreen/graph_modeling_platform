import { beforeEach, describe, expect, test, vi } from "vitest";
import { createDefaultNode } from "./model";

function invalidCapacityLoad() {
  const node = createDefaultNode("ac-load", { x: 100, y: 100 });
  node.params.rated_capacity = "0";
  node.params.rated_voltage = "10";
  node.terminals[0].vbase = "10 kV";
  return node;
}

function createScope() {
  const node = invalidCapacityLoad();
  const setNodes = vi.fn();
  const setTopology = vi.fn();
  const setTopologyErrors = vi.fn();
  const setTopologyStatus = vi.fn();
  const pushUndoSnapshot = vi.fn();
  return {
    node,
    setNodes,
    setTopology,
    setTopologyErrors,
    setTopologyStatus,
    pushUndoSnapshot,
    scope: {
      activeProjectKey: "model-a",
      activeSchemeKey: "scheme-a",
      EMPTY_TOPOLOGY: { connectedComponents: [] },
      edges: [],
      modelType: "厂站",
      nodes: [node],
      powerUnit: "MW",
      voltageUnit: "kV",
      currentUnit: "A",
      schemes: [],
      setNodes,
      setTopology,
      setTopologyErrors,
      setTopologyStatus,
      setTopologyWarningPanelClosed: vi.fn(),
      skipNextTopologyStaleRef: { current: false },
      pushUndoSnapshot,
      writeOperationLog: vi.fn()
    }
  };
}

describe("programmatic topology operations", () => {
  beforeEach(async () => {
    const { resetRatedCapacityFixSession } = await import("./topology-capacity-fix");
    resetRatedCapacityFixSession();
  });

  test("check returns correction preview without changing current-page state", async () => {
    const { createProgrammaticTopologyOperation } = await import("./appExtracted/appControlFactories");
    const state = createScope();

    const result = createProgrammaticTopologyOperation(state.scope)("check");

    expect(result.corrections).toContainEqual({
      nodeId: state.node.id,
      paramKey: "rated_capacity",
      value: "5 MW"
    });
    expect(state.setNodes).not.toHaveBeenCalled();
    expect(state.setTopology).not.toHaveBeenCalled();
    expect(state.pushUndoSnapshot).not.toHaveBeenCalled();
  });

  test("failed repair without node corrections does not suppress the next topology stale update", async () => {
    const { createProgrammaticTopologyOperation } = await import("./appExtracted/appControlFactories");
    const state = createScope();
    state.scope.nodes = [];

    const result = createProgrammaticTopologyOperation(state.scope, () => ({
      status: "failed",
      nodes: [],
      errors: [{ id: "floating", type: "floating-terminal", message: "端子悬空", relatedNodeIds: [] }],
      warnings: [],
      corrections: [],
      modified: false
    }))("repair");

    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.corrections).toEqual([]);
    expect(state.scope.skipNextTopologyStaleRef.current).toBe(false);
    expect(state.setNodes).not.toHaveBeenCalled();
  });

  test("repair updates current-page model in memory without saving", async () => {
    const { createProgrammaticTopologyOperation } = await import("./appExtracted/appControlFactories");
    const state = createScope();

    const result = createProgrammaticTopologyOperation(state.scope)("repair");

    expect(result.corrections).toContainEqual({
      nodeId: state.node.id,
      paramKey: "rated_capacity",
      value: "5 MW"
    });
    expect(state.setNodes).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({
        id: state.node.id,
        params: expect.objectContaining({ rated_capacity: "5 MW" })
      })
    ]));
    expect(state.setTopology).toHaveBeenCalledWith(state.scope.EMPTY_TOPOLOGY);
    expect(state.pushUndoSnapshot).toHaveBeenCalledOnce();
    expect(state.scope).not.toHaveProperty("saveCurrentProject");
  });
});
