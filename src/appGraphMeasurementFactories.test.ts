import { readFileSync } from "node:fs";
import { describe, expect, test, vi } from "vitest";

import { createBeginMeasurementDrag } from "./appExtracted/appGraphMeasurementFactories";
import { createSetImperativeSingleNodeDragOrigin } from "./appExtracted/appSelectionDragFactories";
import { createRenderMeasurementGroup } from "./appExtracted/appToolbarHookFactories";

describe("measurement canvas interactions", () => {
  test("selects the owning device when pressing a measurement group", () => {
    const selectCanvasGraphics = vi.fn();
    const setMeasurementDrag = vi.fn();
    const setPointerCapture = vi.fn();
    const beginMeasurementDrag = createBeginMeasurementDrag({
      isBrowseMode: false,
      screenToSvgPoint: vi.fn(() => ({ x: 120, y: 80 })),
      selectCanvasGraphics,
      setMeasurementDrag,
      svgRef: { current: {} }
    });

    beginMeasurementDrag(
      {
        button: 0,
        clientX: 12,
        clientY: 34,
        currentTarget: { setPointerCapture },
        pointerId: 7,
        preventDefault: vi.fn(),
        stopPropagation: vi.fn()
      } as any,
      {
        id: "measurement-group-1",
        nodeId: "node-42",
        offset: { x: 8, y: -4 }
      } as any
    );

    expect(selectCanvasGraphics).toHaveBeenCalledWith(["node-42"], [], { scope: "direct" });
    expect(setMeasurementDrag).toHaveBeenCalledWith({
      groupId: "measurement-group-1",
      historyCaptured: false,
      pointerId: 7,
      startOffset: { x: 8, y: -4 },
      startPoint: { x: 120, y: 80 }
    });
    expect(setPointerCapture).toHaveBeenCalledWith(7);
  });

  test("renders dragged origin measurement groups as non-interactive ghosts", () => {
    const styles = readFileSync(new URL("./styles.css", import.meta.url), "utf8");
    const originRule = styles.match(/\.measurement-group\.drag-origin\s*\{[\s\S]*?\}/u)?.[0] ?? "";
    const originBoxRule = styles.match(/\.measurement-group\.drag-origin\s+\.measurement-group-bg\s*\{[\s\S]*?\}/u)?.[0] ?? "";
    const originTextRule = styles.match(/\.measurement-group\.drag-origin\s+\.measurement-item\s*\{[\s\S]*?\}/u)?.[0] ?? "";

    expect(originRule).toContain("pointer-events: none");
    expect(originRule).toContain("mix-blend-mode: multiply");
    expect(originBoxRule).toContain("filter: none");
    expect(originBoxRule).toContain("stroke-dasharray");
    expect(originTextRule).toContain("opacity");
  });

  const createMeasurementGroupRenderer = (overrides: Record<string, any> = {}) =>
    createRenderMeasurementGroup({
      beginMeasurementDrag: vi.fn(),
      dragging: { historyCaptured: true },
      draggingNodeIdSet: new Set(["node-42"]),
      formatSvgNumber: (value: number) => String(value),
      measurementGroupBackgroundColor: () => "#ffffff",
      measurementGroupBorderColor: () => "#64748b",
      measurementGroupBorderDashArray: () => undefined,
      measurementGroupBorderWidth: () => 1,
      measurementGroupCanvasPosition: () => ({ x: 100, y: 60 }),
      measurementGroupRenderMetrics: () => ({
        columnWidth: 64,
        columns: 1,
        height: 32,
        lineHeight: 16,
        rows: [],
        width: 80
      }),
      selectedMeasurementGroup: null,
      visibleNodeById: new Map([
        [
          "node-42",
          {
            id: "node-42",
            kind: "ac-load",
            name: "负荷-1",
            params: {}
          }
        ]
      ]),
      ...overrides
    });
  const draggedMeasurementGroup = {
    id: "measurement-group-1",
    nodeId: "node-42",
    visible: true
  } as any;

  test("hides the normal measurement layer for a single dragged node", () => {
    const renderMeasurementGroup = createMeasurementGroupRenderer({ singleNodeDragging: true });

    expect(renderMeasurementGroup(draggedMeasurementGroup)).toBeNull();
  });

  test("hides the normal measurement layer for every dragged node", () => {
    const renderMeasurementGroup = createMeasurementGroupRenderer({ singleNodeDragging: false });

    expect(renderMeasurementGroup(draggedMeasurementGroup)).toBeNull();
  });

  test("keeps the normal measurement layer before a drag ghost is available", () => {
    const renderMeasurementGroup = createMeasurementGroupRenderer({
      dragging: { historyCaptured: false },
      singleNodeDragging: false
    });

    expect(renderMeasurementGroup(draggedMeasurementGroup)).not.toBeNull();
  });

  test("renders measurement markup inside the single node origin ghost", () => {
    const canvasSource = readFileSync(new URL("./appExtracted/appCanvasArea.tsx", import.meta.url), "utf8");

    expect(canvasSource).toContain("drag-origin-measurement-layer");
    expect(canvasSource).toContain('buildMeasurementGroupsMarkup(ghostNode, { absolute: true, className: "drag-origin" })');
  });

  test("marks measurement groups through the imperative single-node drag origin path", () => {
    const nodeClassList = { add: vi.fn(), remove: vi.fn() };
    const measurementClassList = { add: vi.fn(), remove: vi.fn() };
    const svg = {
      classList: { toggle: vi.fn() },
      querySelectorAll: vi.fn((selector: string) =>
        selector.includes('data-export-device-id="node-42"') ? [{ classList: measurementClassList }] : []
      )
    };
    const setImperativeSingleNodeDragOrigin = createSetImperativeSingleNodeDragOrigin({
      canvasNodeElementRefs: { current: new Map([["node-42", { classList: nodeClassList }]]) },
      clearImperativeSingleNodeDragOriginLines: vi.fn(),
      cssSelectorEscape: (value: string) => value,
      imperativeSingleNodeDragOriginNodeIdRef: { current: null },
      svgRef: { current: svg }
    });

    setImperativeSingleNodeDragOrigin("node-42");

    expect(nodeClassList.add).toHaveBeenCalledWith("single-drag-origin");
    expect(measurementClassList.add).toHaveBeenCalledWith("drag-origin");
    expect(svg.querySelectorAll).toHaveBeenCalledWith('.measurement-group[data-export-device-id="node-42"]');
  });

  test("clears measurement group origin ghosts when the imperative single-node drag origin is cleared", () => {
    const nodeClassList = { add: vi.fn(), remove: vi.fn() };
    const measurementClassList = { add: vi.fn(), remove: vi.fn() };
    const clearImperativeSingleNodeDragOriginLines = vi.fn();
    const svg = {
      classList: { toggle: vi.fn() },
      querySelectorAll: vi.fn((selector: string) =>
        selector.includes('data-export-device-id="node-42"') ? [{ classList: measurementClassList }] : []
      )
    };
    const setImperativeSingleNodeDragOrigin = createSetImperativeSingleNodeDragOrigin({
      canvasNodeElementRefs: { current: new Map([["node-42", { classList: nodeClassList }]]) },
      clearImperativeSingleNodeDragOriginLines,
      cssSelectorEscape: (value: string) => value,
      imperativeSingleNodeDragOriginNodeIdRef: { current: "node-42" },
      svgRef: { current: svg }
    });

    setImperativeSingleNodeDragOrigin(null);

    expect(nodeClassList.remove).toHaveBeenCalledWith("single-drag-origin");
    expect(measurementClassList.remove).toHaveBeenCalledWith("drag-origin");
    expect(clearImperativeSingleNodeDragOriginLines).toHaveBeenCalled();
  });
});
