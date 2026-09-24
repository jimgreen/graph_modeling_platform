import { describe, expect, test } from "vitest";
import type { ModelNode } from "../model";
import { runAutoAlignPlan } from "./autoAlignPlan";

const makeNode = (id: string, x: number, y: number): ModelNode => ({
  id,
  kind: "device",
  name: id,
  nodeNumber: id,
  acTopologyNode: 0,
  dcTopologyNode: 0,
  position: { x, y },
  size: { width: 100, height: 60 },
  rotation: 0,
  scale: 1,
  terminals: [],
  params: {}
});

const input = () => ({
  nodes: [makeNode("node-1", 107, 113), makeNode("node-2", 118, 119)],
  activeLayerNodes: [makeNode("node-1", 107, 113), makeNode("node-2", 118, 119)],
  activeLayerEdges: [],
  activeLayerGroups: [],
  edges: [],
  routedEdges: [],
  canvasBounds: { width: 800, height: 600 },
  gridSpacing: 50,
  editModeRouteRenderOptions: { preserveManualRouteDisplay: true }
});

describe("auto-align plan", () => {
  test("returns a serializable result without mutating the input graph", () => {
    const value = input();
    const original = structuredClone(value);
    const result = runAutoAlignPlan(value);

    expect(result.layoutUnitCount).toBe(2);
    expect(result.nodeIds).toEqual(["node-1", "node-2"]);
    expect(result.arranged).toHaveLength(2);
    expect(result.storedRouteDrops).toEqual([]);
    expect(result.qualityReport).toEqual(expect.objectContaining({ degraded: false }));
    expect(() => structuredClone(result)).not.toThrow();
    expect(value).toEqual(original);
  });
});
