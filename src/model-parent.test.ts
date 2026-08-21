import { describe, expect, test, vi } from "vitest";

import {
  createSetGraphArrays,
  createPatchGraphNodes,
  createSetNodes
} from "./appExtracted/appGraphMeasurementFactories";
import { createAppHookCallback2 } from "./appExtracted/appToolbarHookFactories";
import {
  createDefaultNode,
  validateNodeEnumParameters,
  withNodeParentModelId,
  withNodesParentModelId
} from "./model";

describe("device parent model id", () => {
  test("uses the current model idx for devices and zero for global lines", () => {
    const device = createDefaultNode("ac-load", { x: 100, y: 100 });
    const globalLine = {
      ...createDefaultNode("ac-routable-line", { x: 200, y: 100 }),
      params: {
        ...createDefaultNode("ac-routable-line", { x: 200, y: 100 }).params,
        _globalLineId: "global-line-1"
      }
    };

    const normalizedDevice = withNodeParentModelId(device, 19);
    const normalizedGlobalLine = withNodeParentModelId(globalLine, 19);

    expect(normalizedDevice.params.parent).toBe("19");
    expect(normalizedGlobalLine.params.parent).toBe("0");
    expect(withNodeParentModelId(normalizedDevice, 19)).toBe(normalizedDevice);
    expect(withNodesParentModelId([normalizedDevice, normalizedGlobalLine], 19)).toEqual([
      normalizedDevice,
      normalizedGlobalLine
    ]);
  });

  test("preserves an explicitly selected valid parent model idx", () => {
    const device = createDefaultNode("ac-load", { x: 100, y: 100 });
    device.params.parent = "44";

    expect(withNodeParentModelId(device, 19)).toBe(device);
    expect(withNodeParentModelId(device, 19).params.parent).toBe("44");
  });

  test("does not apply static enum validation to the dynamically populated parent catalog", () => {
    const device = createDefaultNode("ac-load", { x: 100, y: 100 });

    expect(validateNodeEnumParameters(device).filter((issue) => issue.paramKey === "parent")).toEqual([]);
  });

  test("normalizes nodes added through graph setters with the live model idx", () => {
    let graphStore = { nodes: [], edges: [] } as any;
    const scope = {
      projectIdx: 23,
      graphStoreSetNodes: (_current: any, nodes: any[]) => ({ ..._current, nodes }),
      graphStoreSetGraph: (_current: any, nodes: any[], edges: any[]) => ({ ..._current, nodes, edges }),
      setGraphStore: (update: (current: any) => any) => {
        graphStore = update(graphStore);
      }
    };
    const firstNode = createDefaultNode("ac-load", { x: 100, y: 100 });
    createSetNodes(scope as any)([firstNode]);
    expect(graphStore.nodes[0].params.parent).toBe("23");

    scope.projectIdx = 24;
    const secondNode = createDefaultNode("dc-load", { x: 200, y: 100 });
    createSetGraphArrays(scope as any)([secondNode], [], 31);
    expect(graphStore.nodes[0].params.parent).toBe("31");
  });

  test("updates parent when an existing line switches between local and global maintenance", () => {
    const localLine = withNodeParentModelId(createDefaultNode("ac-routable-line", { x: 100, y: 100 }), 23);
    let graphStore = { nodes: [localLine], edges: [] } as any;
    const scope = {
      projectIdx: 23,
      graphStorePatchNodes: (current: any, updates: any[]) => {
        const updateById = new Map(updates.map((node) => [node.id, node]));
        return { ...current, nodes: current.nodes.map((node: any) => updateById.get(node.id) ?? node) };
      },
      setGraphStore: (update: (current: any) => any) => {
        graphStore = update(graphStore);
      }
    };
    const globalLine = {
      ...localLine,
      params: { ...localLine.params, _globalLineId: "global-line-1" }
    };
    createPatchGraphNodes(scope as any)([globalLine]);
    expect(graphStore.nodes[0].params.parent).toBe("0");

    const restoredLocalLine = {
      ...graphStore.nodes[0],
      params: { ...graphStore.nodes[0].params }
    };
    delete restoredLocalLine.params._globalLineId;
    createPatchGraphNodes(scope as any)([restoredLocalLine]);
    expect(graphStore.nodes[0].params.parent).toBe("23");
  });

  test("applies the recovered model idx before creating the initial graph store", () => {
    const node = createDefaultNode("ac-source", { x: 100, y: 100 });
    const assignMissingDeviceIndexes = vi.fn(() => ({ nodes: [node], counters: {} }));
    const result = createAppHookCallback2({
      assignMissingDeviceIndexes,
      initialDraft: { idx: 37, deviceIndexCounters: {} },
      initialLayeredProject: { nodes: [node] }
    })();

    expect(result.nodes[0].params.parent).toBe("37");
  });
});
