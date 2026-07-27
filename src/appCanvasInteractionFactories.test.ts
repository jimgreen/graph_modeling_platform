import { describe, expect, test, vi } from "vitest";
import {
  createApplyBatchCommonParam,
  createApplyBatchCommonParamPatch
} from "./appExtracted/appCanvasInteractionFactories";
import { createDefaultNode } from "./model";

describe("batch common parameter updates", () => {
  test("stores inherited generator fields that are missing from derived wind nodes", () => {
    const firstWindNode = createDefaultNode("ac-wind-source", { x: 100, y: 100 });
    const secondWindNode = createDefaultNode("ac-wind-source", { x: 240, y: 100 });
    secondWindNode.params.control_type = "PV";
    const patchGraphNodes = vi.fn();
    const canBatchEditParam = vi.fn(() => true);
    const applyBatchCommonParamPatch = createApplyBatchCommonParamPatch({
      NODE_LABEL_FOOTPRINT_PARAM_KEYS: new Set<string>(),
      activeSelectedNodeIds: [firstWindNode.id, secondWindNode.id],
      canBatchEditParam,
      commitNodeFootprintUpdates: vi.fn(),
      edgeListForNodeIds: vi.fn(() => []),
      nodeById: new Map([
        [firstWindNode.id, firstWindNode],
        [secondWindNode.id, secondWindNode]
      ]),
      patchGraphNodes,
      pushUndoSnapshot: vi.fn(),
      requireEditMode: vi.fn(() => true),
      undoScopeForGraphPatch: vi.fn(() => ({})),
      writeOperationLog: vi.fn()
    });
    const applyBatchCommonParam = createApplyBatchCommonParam({
      PARAM_LABELS: { control_type: "控制类型" },
      applyBatchCommonParamPatch,
      canBatchEditParam,
      normalizeNodeLabelDisplayMode: (value: string) => value
    });

    expect(firstWindNode.params).not.toHaveProperty("control_type");

    applyBatchCommonParam("control_type", "PQ");

    expect(patchGraphNodes).toHaveBeenCalledTimes(1);
    expect(patchGraphNodes.mock.calls[0][0]).toHaveLength(2);
    expect(patchGraphNodes.mock.calls[0][0].every((node: typeof firstWindNode) => node.params.control_type === "PQ")).toBe(true);
  });
});
