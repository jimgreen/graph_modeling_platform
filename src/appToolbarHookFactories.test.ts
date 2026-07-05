import { describe, expect, test, vi } from "vitest";

import { createAppHookCallback120 } from "./appExtracted/appToolbarHookFactories";

const dirtyBaseline = (name: string, nodes: unknown[] = []) => ({
  projectName: name,
  layers: [],
  activeLayerId: "default",
  canvasWidth: 100,
  canvasHeight: 100,
  allowAutoExpandCanvas: true,
  canvasBackgroundColor: "#fff",
  canvasBackgroundImage: "",
  canvasBackgroundImageAssetId: "",
  backgroundProjectId: "",
  backgroundLayerIds: [],
  powerUnit: "MW",
  voltageUnit: "kV",
  currentUnit: "A",
  powerBaseValue: 100,
  deviceIndexCounters: {},
  nodes,
  edges: [],
  groups: [],
  measurements: { groups: [] }
});

describe("graph dirty baseline hook", () => {
  test("consumes one internal dirty suppression per baseline update", () => {
    const baselines = [
      dirtyBaseline("initial"),
      dirtyBaseline("IEEE118", [{ id: "loaded" }]),
      dirtyBaseline("IEEE118", [{ id: "normalized" }])
    ];
    const graphDirtyBaselineRef = { current: null as unknown };
    const suppressNextGraphDirtyRef = { current: 2 };
    const setHasUnsavedChanges = vi.fn();
    const callback = createAppHookCallback120({
      currentGraphDirtyBaseline: vi.fn(() => baselines.shift()),
      graphDirtyBaselineChanged: (previous: any, next: any) => previous !== next,
      graphDirtyBaselineRef,
      setHasUnsavedChanges,
      suppressNextGraphDirtyRef
    });

    callback();
    callback();
    callback();

    expect(setHasUnsavedChanges).not.toHaveBeenCalled();
    expect(suppressNextGraphDirtyRef.current).toBe(0);
  });

  test("marks dirty when a baseline update is not internally suppressed", () => {
    const baselines = [
      dirtyBaseline("IEEE118", [{ id: "loaded" }]),
      dirtyBaseline("IEEE118", [{ id: "edited" }])
    ];
    const setHasUnsavedChanges = vi.fn();
    const callback = createAppHookCallback120({
      currentGraphDirtyBaseline: vi.fn(() => baselines.shift()),
      graphDirtyBaselineChanged: (previous: any, next: any) => previous !== next,
      graphDirtyBaselineRef: { current: null },
      setHasUnsavedChanges,
      suppressNextGraphDirtyRef: { current: 0 }
    });

    callback();
    callback();

    expect(setHasUnsavedChanges).toHaveBeenCalledWith(true);
  });
});
