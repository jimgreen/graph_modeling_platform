import { afterEach, describe, expect, test, vi } from "vitest";
import { createAutoAlignCanvasGraphics } from "./appExtracted/appProjectCanvasFactories";

describe("canvas automatic grid alignment", () => {
  const originalWindow = (globalThis as { window?: unknown }).window;

  afterEach(() => {
    if (originalWindow === undefined) {
      delete (globalThis as { window?: unknown }).window;
    } else {
      (globalThis as { window?: unknown }).window = originalWindow;
    }
  });

  test("uses the configured value as grid spacing and reports the grid alignment", () => {
    const prompt = vi.fn(() => "50");
    (globalThis as { window?: unknown }).window = { prompt };
    const nodes = [
      { id: "node-1", kind: "device", position: { x: 112, y: 113 } },
      { id: "node-2", kind: "device", position: { x: 118, y: 119 } }
    ];
    const layoutUnits = nodes.map((node) => ({ id: `node:${node.id}`, nodeIds: [node.id] }));
    const arranged = nodes.map((node, index) => ({
      ...node,
      position: { x: 100 + index * 50, y: 100 }
    }));
    const autoAlignNodeLayoutUnits = vi.fn(() => arranged);
    const commitLayoutNodePositions = vi.fn(() => 2);
    const writeOperationLog = vi.fn();

    createAutoAlignCanvasGraphics({
      AUTO_ALIGN_DEFAULT_THRESHOLD_PX: 50,
      AUTO_ALIGN_MAX_THRESHOLD_PX: 200,
      AUTO_ALIGN_MIN_THRESHOLD_PX: 5,
      activeLayerEdges: [],
      activeLayerGroups: [],
      activeLayerNodes: nodes,
      autoAlignNodeLayoutUnits,
      buildCanvasLayoutUnits: vi.fn(() => layoutUnits),
      clampNumber: (value: number, minimum: number, maximum: number) => Math.max(minimum, Math.min(maximum, value)),
      commitLayoutNodePositions,
      isCanvasNodeMovable: () => true,
      nodes,
      readjustActiveLayerBusEndpointRoutes: vi.fn(() => 0),
      requireEditMode: () => true,
      routedEdges: [],
      writeOperationLog
    } as any)();

    expect(prompt).toHaveBeenCalledWith("请输入自动对齐网格间距（5-200px）", "50");
    expect(autoAlignNodeLayoutUnits).toHaveBeenCalledWith(nodes, layoutUnits, 50);
    expect(commitLayoutNodePositions).toHaveBeenCalledWith(["node-1", "node-2"], arranged, { readjustBusEndpoints: true });
    expect(writeOperationLog).toHaveBeenCalledWith("自动对齐 2 个图元，网格间距 50px");
  });
});
