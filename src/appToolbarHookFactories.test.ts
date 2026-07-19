import { readFileSync } from "node:fs";

import { afterEach, describe, expect, test, vi } from "vitest";

import { createAppHookCallback82, createAppHookCallback100, createAppHookCallback120 } from "./appExtracted/appToolbarHookFactories";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("device library persistence hook", () => {
  test("pauses automatic persistence while the E interface editor is open", () => {
    vi.useFakeTimers();
    vi.stubGlobal("window", {
      setTimeout: globalThis.setTimeout,
      clearTimeout: globalThis.clearTimeout
    });
    const writeLocalDeviceLibraryPersistencePayload = vi.fn();
    const saveBackendDeviceLibraryPayload = vi.fn(() => Promise.resolve());
    const cleanup = createAppHookCallback82({
      backendDeviceLibraryLoadedRef: { current: true },
      customCategoryLibraries: [],
      customComponentLibraries: [],
      customDeviceTemplates: [],
      customGraphTemplateTypes: [],
      customGraphTemplates: [],
      deviceDefinitionOverrides: {},
      eDeviceDefinitionLabels: {},
      eDeviceDefinitionClassExportEnabled: {},
      eDeviceDefinitionInterfaceDialogOpen: true,
      lastPersistedDeviceLibraryPayloadRef: { current: null },
      normalizeDeviceLibraryPersistencePayload: (value: unknown) => value,
      saveBackendDeviceLibraryPayload,
      suppressNextBackendDeviceLibrarySyncRef: { current: false },
      writeLocalDeviceLibraryPersistencePayload
    })();

    vi.advanceTimersByTime(1000);

    expect(writeLocalDeviceLibraryPersistencePayload).not.toHaveBeenCalled();
    expect(saveBackendDeviceLibraryPayload).not.toHaveBeenCalled();
    cleanup?.();
  });
});

describe("side panel resize hook", () => {
  test("listens for captured pointer moves so panel event isolation cannot block resizing", () => {
    const listeners = new Map<string, EventListener>();
    const addEventListener = vi.fn((type: string, listener: EventListener, capture?: boolean) => {
      expect(capture).toBe(true);
      listeners.set(type, listener);
    });
    const removeEventListener = vi.fn();
    vi.stubGlobal("window", {
      innerWidth: 1200,
      addEventListener,
      removeEventListener
    });
    const setRightPanelWidth = vi.fn();
    const setSidePanelResize = vi.fn();
    const cleanup = createAppHookCallback100({
      SIDE_PANEL_MAX_WIDTH: 640,
      SIDE_PANEL_MIN_WIDTH: 240,
      clampPanelDimension: (value: number, min: number, max: number) => Math.min(max, Math.max(min, value)),
      setLeftPanelWidth: vi.fn(),
      setRightPanelWidth,
      setSidePanelResize,
      sidePanelResize: { side: "right", startX: 1000, startWidth: 240 }
    })();

    listeners.get("pointermove")?.({ clientX: 880 } as PointerEvent);
    expect(setRightPanelWidth).toHaveBeenCalledWith(360);

    listeners.get("pointerup")?.(new Event("pointerup"));
    expect(setSidePanelResize).toHaveBeenCalledWith(null);

    cleanup?.();
    expect(removeEventListener).toHaveBeenCalledWith("pointermove", expect.any(Function), true);
    expect(removeEventListener).toHaveBeenCalledWith("pointerup", expect.any(Function), true);
    expect(removeEventListener).toHaveBeenCalledWith("pointercancel", expect.any(Function), true);
  });
});

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

describe("toolbar hook scope ordering", () => {
  test("registers the routable-line endpoint preview helper before hook callback 61 consumes it", () => {
    const appSource = readFileSync(new URL("./App.tsx", import.meta.url), "utf8");
    const registration = appSource.indexOf(
      "const routableLineEndpointPreviewRoutePoints = createRoutableLineEndpointPreviewRoutePoints(__appScope);"
    );
    const consumption = appSource.indexOf(
      "const routableLineEndpointDragPreviewRoute = useMemo(createAppHookCallback61(__appScope)"
    );

    expect(registration).toBeGreaterThanOrEqual(0);
    expect(consumption).toBeGreaterThanOrEqual(0);
    expect(registration).toBeLessThan(consumption);
  });
});
