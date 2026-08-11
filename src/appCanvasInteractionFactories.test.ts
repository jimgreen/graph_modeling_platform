import { describe, expect, test, vi } from "vitest";
import {
  createApplyBatchCommonParam,
  createApplyBatchCommonParamPatch,
  createUpdateParam
} from "./appExtracted/appCanvasInteractionFactories";
import { createDefaultNode, normalizeRatioParameterInputValue } from "./model";

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
      normalizeNodeLabelDisplayMode: (value: string) => value,
      normalizeRatioParameterInputValue
    });

    expect(firstWindNode.params).not.toHaveProperty("control_type");

    applyBatchCommonParam("control_type", "PQ");

    expect(patchGraphNodes).toHaveBeenCalledTimes(1);
    expect(patchGraphNodes.mock.calls[0][0]).toHaveLength(2);
    expect(patchGraphNodes.mock.calls[0][0].every((node: typeof firstWindNode) => node.params.control_type === "PQ")).toBe(true);
  });

  test("stores percentage-form SOC batch input as decimal ratios", () => {
    const firstStorage = createDefaultNode("ac-storage", { x: 100, y: 100 });
    const secondStorage = createDefaultNode("ac-storage", { x: 240, y: 100 });
    const patchGraphNodes = vi.fn();
    const canBatchEditParam = vi.fn(() => true);
    const applyBatchCommonParamPatch = createApplyBatchCommonParamPatch({
      NODE_LABEL_FOOTPRINT_PARAM_KEYS: new Set<string>(),
      activeSelectedNodeIds: [firstStorage.id, secondStorage.id],
      canBatchEditParam,
      commitNodeFootprintUpdates: vi.fn(),
      edgeListForNodeIds: vi.fn(() => []),
      nodeById: new Map([
        [firstStorage.id, firstStorage],
        [secondStorage.id, secondStorage]
      ]),
      patchGraphNodes,
      pushUndoSnapshot: vi.fn(),
      requireEditMode: vi.fn(() => true),
      undoScopeForGraphPatch: vi.fn(() => ({})),
      writeOperationLog: vi.fn()
    });
    const applyBatchCommonParam = createApplyBatchCommonParam({
      PARAM_LABELS: { state_of_charge: "荷电状态" },
      applyBatchCommonParamPatch,
      canBatchEditParam,
      normalizeNodeLabelDisplayMode: (value: string) => value,
      normalizeRatioParameterInputValue
    });

    applyBatchCommonParam("state_of_charge", "99%");

    expect(patchGraphNodes).toHaveBeenCalledTimes(1);
    expect(patchGraphNodes.mock.calls[0][0].every((node: typeof firstStorage) => node.params.state_of_charge === "0.99")).toBe(true);
  });

  test("validates electric heat coefficients against every selected E section", () => {
    const acHeater = createDefaultNode("ac-heater", { x: 100, y: 100 });
    const dcTwoPortHeater = createDefaultNode("dc-two-port-heater", { x: 240, y: 100 });
    const applyBatchCommonParamPatch = vi.fn();
    const applyBatchCommonParam = createApplyBatchCommonParam({
      PARAM_LABELS: { e2h_coeff: "电转热效率" },
      applyBatchCommonParamPatch,
      canBatchEditParam: vi.fn(() => true),
      inferESection: (kind: string) => kind === "ac-heater" ? "AcE2Heat" : "DcE2Heat2",
      nodeById: new Map([
        [acHeater.id, acHeater],
        [dcTwoPortHeater.id, dcTwoPortHeater]
      ]),
      normalizeNodeLabelDisplayMode: (value: string) => value,
      normalizeRatioParameterInputValue,
      selectedNodeIds: new Set([acHeater.id, dcTwoPortHeater.id])
    });

    applyBatchCommonParam("e2h_coeff", "2.5");

    expect(applyBatchCommonParamPatch).toHaveBeenCalledTimes(1);
    expect(applyBatchCommonParamPatch.mock.calls[0][1]()).toEqual({ e2h_coeff: "2.5" });

    applyBatchCommonParam("e2h_coeff", "0.2");

    expect(applyBatchCommonParamPatch).toHaveBeenCalledTimes(1);
  });
});

describe("single device parameter updates", () => {
  test("stores percentage-form efficiency input as a decimal ratio", () => {
    const node = createDefaultNode("ac-storage", { x: 100, y: 100 });
    const patchGraphNodes = vi.fn();
    const updateParam = createUpdateParam({
      NODE_LABEL_FOOTPRINT_PARAM_KEYS: new Set<string>(),
      commitNodeFootprintUpdates: vi.fn(),
      nodeById: new Map([[node.id, node]]),
      normalizeNodeLabelDisplayMode: (value: string) => value,
      normalizeRatioParameterInputValue,
      patchGraphNodes,
      pushNodeOnlyUndoSnapshot: vi.fn(),
      pushUndoSnapshot: vi.fn(),
      requireEditMode: vi.fn(() => true),
      selectedNodeId: node.id,
      undoScopeForNodeFootprintPatch: vi.fn(() => ({}))
    });

    updateParam("charge_discharge_efficiency", "99");

    expect(patchGraphNodes).toHaveBeenCalledTimes(1);
    expect(patchGraphNodes.mock.calls[0][0][0].params.charge_discharge_efficiency).toBe("0.99");
  });

  test("rejects out-of-range ratio input", () => {
    const node = createDefaultNode("ac-storage", { x: 100, y: 100 });
    const patchGraphNodes = vi.fn();
    const updateParam = createUpdateParam({
      NODE_LABEL_FOOTPRINT_PARAM_KEYS: new Set<string>(),
      commitNodeFootprintUpdates: vi.fn(),
      nodeById: new Map([[node.id, node]]),
      normalizeNodeLabelDisplayMode: (value: string) => value,
      normalizeRatioParameterInputValue,
      patchGraphNodes,
      pushNodeOnlyUndoSnapshot: vi.fn(),
      pushUndoSnapshot: vi.fn(),
      requireEditMode: vi.fn(() => true),
      selectedNodeId: node.id,
      undoScopeForNodeFootprintPatch: vi.fn(() => ({}))
    });

    updateParam("state_of_charge", "120%");

    expect(patchGraphNodes).not.toHaveBeenCalled();
  });
});
