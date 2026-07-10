import { describe, expect, test } from "vitest";
import { resolveInspectorTopologyEntry } from "./appExtracted/appView";
import type { Topology } from "./model";

describe("app view topology inspector", () => {
  test("uses live topology entries instead of stale saved topology entries", () => {
    const staleTopology: Topology = {
      nodes: {
        "selected-line": {
          id: "selected-line",
          degree: 0,
          neighbors: [],
          edgeIds: []
        }
      },
      connectedComponents: []
    };
    const liveTopology: Topology = {
      nodes: {
        "selected-line": {
          id: "selected-line",
          degree: 2,
          neighbors: ["source-bus", "target-bus"],
          edgeIds: ["line:routable-source", "line:routable-target"]
        }
      },
      connectedComponents: [["source-bus", "selected-line", "target-bus"]]
    };

    expect(resolveInspectorTopologyEntry(staleTopology, liveTopology, "selected-line")?.degree).toBe(2);
    expect(resolveInspectorTopologyEntry(staleTopology, liveTopology, "selected-line")?.neighbors).toEqual([
      "source-bus",
      "target-bus"
    ]);
  });
});
