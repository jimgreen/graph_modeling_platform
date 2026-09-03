import { readFileSync } from "node:fs";

import { afterEach, describe, expect, test, vi } from "vitest";

import { canBatchEditParam, PARAM_LABELS } from "./appExtracted/appCoreCanvasUtilities";
import { enumValuesForRow } from "./appExtracted/appPersistenceLibraryExport";
import { createAppHookCallback12, createAppHookCallback77, createAppHookCallback82, createAppHookCallback100, createAppHookCallback109, createAppHookCallback120, createJumpToAssociatedModel, createOpenNodeDoubleClickEditor } from "./appExtracted/appToolbarHookFactories";
import {
  applyDeviceTemplateDefinitionOverride,
  createDefaultNode,
  createNodeFromTemplate,
  DEVICE_LIBRARY,
  getEParamValue,
  getTemplateParameterDefinitions,
  modelAssociationModelTypeForKind,
  templateDerivedComponentLibraryInfo,
  type DeviceParameterDefinition,
  type DeviceTemplate
} from "./model";
import {
  deviceDefinitionOverrideForTemplate,
  parseCustomDefinitions,
  resolveTemplateComponentLibrary
} from "./customDeviceUtils";

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

describe("model library backend loading hook", () => {
  const createScope = (fetchBackendSchemes: ReturnType<typeof vi.fn>) => ({
    activeSchemeKey: "",
    backendSchemesLoadTokenRef: { current: 0 },
    backendSchemesLoadedRef: { current: false },
    clearActiveProjectDisplay: vi.fn(),
    fetchBackendSchemes,
    findSavedProjectByActivePointer: vi.fn(() => null),
    flattenSavedSchemes: (schemes: Array<{ id: string }>) => schemes,
    latestActiveProjectPointerRef: { current: null },
    loadSavedProjectRecord: vi.fn(),
    rememberPersistedSchemesPayload: vi.fn(),
    saveRequiredRef: { current: false },
    serializeSchemesForStorage: JSON.stringify,
    setExpandedSchemeIds: vi.fn(),
    setSchemesState: vi.fn(),
    suppressNextBackendSchemeSyncRef: { current: false }
  });

  const flushPromises = async () => {
    await Promise.resolve();
    await Promise.resolve();
  };

  test("retries a failed initial load and restores schemes without a page refresh", async () => {
    vi.useFakeTimers();
    const listeners = new Map<string, EventListener>();
    vi.stubGlobal("window", {
      addEventListener: vi.fn((type: string, listener: EventListener) => listeners.set(type, listener)),
      removeEventListener: vi.fn((type: string) => listeners.delete(type)),
      setTimeout: globalThis.setTimeout,
      clearTimeout: globalThis.clearTimeout
    });
    const backendSchemes = [{ id: "scheme-1", name: "默认方案", projects: [], children: [] }];
    const fetchBackendSchemes = vi.fn()
      .mockRejectedValueOnce(new Error("backend unavailable"))
      .mockResolvedValueOnce(backendSchemes);
    const scope = createScope(fetchBackendSchemes);

    const cleanup = createAppHookCallback77(scope)();
    await flushPromises();

    expect(fetchBackendSchemes).toHaveBeenCalledTimes(1);
    expect(scope.setSchemesState).toHaveBeenCalledTimes(1);
    const preserveCurrentSchemes = scope.setSchemesState.mock.calls[0][0];
    const existingSchemes = [{ id: "existing" }];
    expect(preserveCurrentSchemes(existingSchemes)).toBe(existingSchemes);
    expect(preserveCurrentSchemes([])).toEqual([]);
    expect(scope.backendSchemesLoadedRef.current).toBe(false);

    await vi.runOnlyPendingTimersAsync();
    await flushPromises();

    expect(fetchBackendSchemes).toHaveBeenCalledTimes(2);
    expect(scope.setSchemesState).toHaveBeenCalledWith(backendSchemes);
    expect(scope.backendSchemesLoadedRef.current).toBe(true);
    cleanup?.();
  });

  test("preserves loaded schemes when a later online refresh fails", async () => {
    vi.useFakeTimers();
    const listeners = new Map<string, EventListener>();
    vi.stubGlobal("window", {
      addEventListener: vi.fn((type: string, listener: EventListener) => listeners.set(type, listener)),
      removeEventListener: vi.fn((type: string) => listeners.delete(type)),
      setTimeout: globalThis.setTimeout,
      clearTimeout: globalThis.clearTimeout
    });
    const backendSchemes = [{ id: "scheme-1", name: "默认方案", projects: [], children: [] }];
    const fetchBackendSchemes = vi.fn()
      .mockResolvedValueOnce(backendSchemes)
      .mockRejectedValueOnce(new Error("backend unavailable"));
    const scope = createScope(fetchBackendSchemes);

    const cleanup = createAppHookCallback77(scope)();
    await flushPromises();
    listeners.get("online")?.(new Event("online"));
    await flushPromises();

    expect(fetchBackendSchemes).toHaveBeenCalledTimes(2);
    expect(scope.setSchemesState).toHaveBeenCalledTimes(2);
    expect(scope.setSchemesState).toHaveBeenNthCalledWith(1, backendSchemes);
    const preserveCurrentSchemes = scope.setSchemesState.mock.calls[1][0];
    expect(preserveCurrentSchemes(backendSchemes)).toBe(backendSchemes);
    expect(scope.backendSchemesLoadedRef.current).toBe(false);
    cleanup?.();
  });

  test("accepts an explicitly successful empty model directory", async () => {
    const listeners = new Map<string, EventListener>();
    vi.stubGlobal("window", {
      addEventListener: vi.fn((type: string, listener: EventListener) => listeners.set(type, listener)),
      removeEventListener: vi.fn((type: string) => listeners.delete(type)),
      setTimeout: globalThis.setTimeout,
      clearTimeout: globalThis.clearTimeout
    });
    const scope = createScope(vi.fn().mockResolvedValue([]));

    const cleanup = createAppHookCallback77(scope)();
    await flushPromises();

    expect(scope.setSchemesState).toHaveBeenCalledWith([]);
    expect(scope.clearActiveProjectDisplay).toHaveBeenCalledWith("没有可用方案，画布已清空");
    expect(scope.backendSchemesLoadedRef.current).toBe(true);
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

describe("model association node double-click navigation", () => {
  const associationCases = [
    ["ac-station-source", "厂站"],
    ["dc-station-source", "厂站"],
    ["ac-station-load", "厂站"],
    ["dc-station-load", "厂站"],
    ["ac-feeder-source", "馈线"],
    ["dc-feeder-source", "馈线"],
    ["ac-feeder-load", "馈线"],
    ["dc-feeder-load", "馈线"],
    ["ac-district-source", "台区"],
    ["dc-district-source", "台区"],
    ["ac-district-load", "台区"],
    ["dc-district-load", "台区"]
  ] as const;

  const createBrowseScope = () => {
    const requestLoadSavedProject = vi.fn();
    const writeOperationLog = vi.fn();
    const projects = associationCases.map(([kind, modelType], index) => ({
      id: `project-${index + 1}`,
      name: `${modelType}模型-${index + 1}`,
      project: { idx: index + 1, modelType }
    }));
    const schemes = [{ id: "scheme-1", name: "默认方案", projects, children: [] }];
    return {
      flattenSavedSchemes: (items: typeof schemes) => items,
      isBrowseMode: true,
      isEditMode: false,
      modelAssociationModelTypeForKind,
      requestLoadSavedProject,
      schemes,
      writeOperationLog
    };
  };

  test.each(associationCases)("browse mode double-click on %s opens its %s model_id target", (kind, modelType) => {
    const scope = createBrowseScope();
    const node = createDefaultNode(kind, { x: 100, y: 100 });
    const targetIndex = associationCases.findIndex(([candidateKind]) => candidateKind === kind) + 1;
    node.params.model_id = String(targetIndex);

    createOpenNodeDoubleClickEditor(scope)(node);

    expect(scope.requestLoadSavedProject).toHaveBeenCalledWith(
      expect.objectContaining({ name: `${modelType}模型-${targetIndex}`, project: expect.objectContaining({ modelType }) }),
      "scheme-1"
    );
    expect(scope.writeOperationLog).toHaveBeenCalledWith(expect.stringContaining(`${node.name} → ${modelType}模型-${targetIndex}`));
  });

  test.each(["", "0", "1.5", "invalid"])("warns and does not navigate for invalid model_id %j", (modelId) => {
    const showGlobalMessage = vi.fn();
    vi.stubGlobal("showGlobalMessage", showGlobalMessage);
    const scope = createBrowseScope();
    const node = createDefaultNode("ac-station-source", { x: 100, y: 100 });
    node.params.model_id = modelId;

    createOpenNodeDoubleClickEditor(scope)(node);

    expect(scope.requestLoadSavedProject).not.toHaveBeenCalled();
    expect(showGlobalMessage).toHaveBeenCalledWith(expect.stringMatching(/未定义有效的关联模型/));
  });

  test("warns when model_id exists only under a different model type", () => {
    const showGlobalMessage = vi.fn();
    vi.stubGlobal("showGlobalMessage", showGlobalMessage);
    const scope = createBrowseScope();
    const node = createDefaultNode("ac-station-load", { x: 100, y: 100 });
    node.params.model_id = "5";

    createOpenNodeDoubleClickEditor(scope)(node);

    expect(scope.requestLoadSavedProject).not.toHaveBeenCalled();
    expect(showGlobalMessage).toHaveBeenCalledWith(expect.stringMatching(/未找到厂站模型 idx=5/));
  });

  test("keeps the existing editor behavior for association nodes in edit mode", () => {
    const node = createDefaultNode("dc-feeder-source", { x: 100, y: 100 });
    node.params.model_id = "5";
    const requestLoadSavedProject = vi.fn();
    const setNodeDoubleClickDialog = vi.fn();
    const setNodeDoubleClickDraft = vi.fn();
    const scope = {
      NODE_DOUBLE_CLICK_DIALOG_DEDUPE_MS: 250,
      activeLayerNodeIdSet: new Set([node.id]),
      cloneNodeForDoubleClickDraft: (value: typeof node) => ({ ...value, params: { ...value.params } }),
      doubleClickDialogKindForNode: () => "device",
      flushSync: (callback: () => void) => callback(),
      isBrowseMode: false,
      isEditMode: true,
      nodeDoubleClickCloseSuppressUntilRef: { current: 0 },
      nodeDoubleClickDialog: null,
      nodeDoubleClickOpenGuardRef: { current: null },
      requestLoadSavedProject,
      selectCanvasGraphics: vi.fn(),
      setContextMenu: vi.fn(),
      setImageTarget: vi.fn(),
      setNodeDoubleClickDialog,
      setNodeDoubleClickDraft
    };

    createOpenNodeDoubleClickEditor(scope)(node);

    expect(requestLoadSavedProject).not.toHaveBeenCalled();
    expect(setNodeDoubleClickDraft).toHaveBeenCalledWith(expect.objectContaining({ nodeId: node.id }));
    expect(setNodeDoubleClickDialog).toHaveBeenLastCalledWith({ kind: "device", nodeId: node.id });
  });

  test("does nothing for ordinary nodes in browse mode", () => {
    const scope = createBrowseScope();
    const node = createDefaultNode("ac-source", { x: 100, y: 100 });

    createOpenNodeDoubleClickEditor(scope)(node);

    expect(scope.requestLoadSavedProject).not.toHaveBeenCalled();
    expect(scope.writeOperationLog).not.toHaveBeenCalled();
  });

  test("createJumpToAssociatedModel jumps to the bound model independent of interaction mode", () => {
    const scope = createBrowseScope();
    const node = createDefaultNode("ac-station-load", { x: 100, y: 100 });
    const targetIndex = associationCases.findIndex(([candidateKind]) => candidateKind === "ac-station-load") + 1;
    node.params.model_id = String(targetIndex);

    createJumpToAssociatedModel(scope)(node);

    expect(scope.requestLoadSavedProject).toHaveBeenCalledWith(
      expect.objectContaining({ name: `厂站模型-${targetIndex}`, project: expect.objectContaining({ modelType: "厂站" }) }),
      "scheme-1"
    );
  });
});

describe("global pointer button tracking hook", () => {
  test("keeps the floating toolbar suppressed until every pointer button is released", () => {
    const listeners = new Map<string, EventListener>();
    const addEventListener = vi.fn((type: string, listener: EventListener) => {
      listeners.set(type, listener);
    });
    const removeEventListener = vi.fn();
    vi.stubGlobal("window", { addEventListener, removeEventListener });
    const lastKeyboardShortcutClientPointerRef = { current: null as { x: number; y: number } | null };
    const setPointerButtonsPressed = vi.fn();
    const cleanup = createAppHookCallback109({
      lastKeyboardShortcutClientPointerRef,
      setPointerButtonsPressed
    })();

    listeners.get("pointerdown")?.({ buttons: 1, clientX: 120, clientY: 180 } as PointerEvent);
    expect(lastKeyboardShortcutClientPointerRef.current).toEqual({ x: 120, y: 180 });
    expect(setPointerButtonsPressed).toHaveBeenLastCalledWith(true);
    expect(setPointerButtonsPressed).toHaveBeenCalledTimes(1);

    listeners.get("pointermove")?.({ buttons: 1, clientX: 240, clientY: 300 } as PointerEvent);
    expect(lastKeyboardShortcutClientPointerRef.current).toEqual({ x: 240, y: 300 });
    expect(setPointerButtonsPressed).toHaveBeenLastCalledWith(true);
    expect(setPointerButtonsPressed).toHaveBeenCalledTimes(1);

    listeners.get("pointerup")?.({ buttons: 2 } as PointerEvent);
    expect(setPointerButtonsPressed).toHaveBeenLastCalledWith(true);
    expect(setPointerButtonsPressed).toHaveBeenCalledTimes(1);

    listeners.get("pointerup")?.({ buttons: 0 } as PointerEvent);
    expect(setPointerButtonsPressed).toHaveBeenLastCalledWith(false);
    expect(setPointerButtonsPressed).toHaveBeenCalledTimes(2);

    listeners.get("blur")?.(new Event("blur"));
    expect(lastKeyboardShortcutClientPointerRef.current).toBeNull();
    expect(setPointerButtonsPressed).toHaveBeenLastCalledWith(false);
    expect(setPointerButtonsPressed).toHaveBeenCalledTimes(2);

    cleanup?.();
    for (const type of ["pointermove", "pointerdown", "pointerup", "pointercancel", "blur"]) {
      expect(removeEventListener).toHaveBeenCalledWith(type, expect.any(Function), { capture: true });
    }
  });
});

describe("batch common model parameter hook", () => {
  test("includes inherited AC generator fields for selected wind generators", () => {
    const firstNode = createDefaultNode("ac-wind-source", { x: 100, y: 100 });
    const secondNode = createDefaultNode("ac-wind-source", { x: 240, y: 100 });
    firstNode.params.v_set = "380";
    secondNode.params.v_set = "380";

    const rows = createAppHookCallback12({
      DEFAULT_MODEL_LAYER_ID: "default",
      DEVICE_LIBRARY,
      PARAM_LABELS,
      activeSelectedNodeIds: [firstNode.id, secondNode.id],
      applyDeviceTemplateDefinitionOverride,
      canBatchEditParam,
      customDeviceTemplates: [],
      deviceDefinitionOverrideForTemplate,
      deviceDefinitionOverrides: {},
      enumValuesForRow,
      getEParamValue,
      getTemplateParameterDefinitions,
      nodeById: new Map([
        [firstNode.id, firstNode],
        [secondNode.id, secondNode]
      ]),
      parseCustomDefinitions,
      resolveTemplateComponentLibrary,
      templateDerivedComponentLibraryInfo
    })();

    const keys = rows.map((row) => row.key);
    expect(keys).toEqual(expect.arrayContaining([
      "control_type",
      "p_set",
      "q_set",
      "v_set",
      "alpha",
      "wind_turbine_model"
    ]));
    expect(rows.find((row) => row.key === "control_type")?.value).toBe("PV");
    expect(rows.find((row) => row.key === "v_set")?.value).toBe("380");
  });

  test("lists AC generator base fields before wind generator derived fields", () => {
    const firstNode = createDefaultNode("ac-wind-source", { x: 100, y: 100 });
    const secondNode = createDefaultNode("ac-wind-source", { x: 240, y: 100 });

    const rows = createAppHookCallback12({
      DEFAULT_MODEL_LAYER_ID: "default",
      DEVICE_LIBRARY,
      PARAM_LABELS,
      activeSelectedNodeIds: [firstNode.id, secondNode.id],
      applyDeviceTemplateDefinitionOverride,
      canBatchEditParam,
      customDeviceTemplates: [],
      deviceDefinitionOverrideForTemplate,
      deviceDefinitionOverrides: {},
      enumValuesForRow,
      getEParamValue,
      getTemplateParameterDefinitions,
      nodeById: new Map([
        [firstNode.id, firstNode],
        [secondNode.id, secondNode]
      ]),
      parseCustomDefinitions,
      resolveTemplateComponentLibrary,
      templateDerivedComponentLibraryInfo
    })();

    const expectedOrderedKeys = [
      "rated_capacity",
      "rated_voltage",
      "frequency",
      "short_circuit_capacity",
      "dev_type",
      "control_type",
      "p_set",
      "q_set",
      "v_set",
      "alpha",
      "run_stat",
      "status",
      "source_type",
      "wind_turbine_model",
      "cut_in_wind_speed",
      "rated_wind_speed",
      "cut_out_wind_speed",
      "rotor_diameter",
      "hub_height"
    ];
    const expectedKeySet = new Set(expectedOrderedKeys);

    expect(rows.map((row) => row.key).filter((key) => expectedKeySet.has(key))).toEqual(expectedOrderedKeys);
  });

  test("recomputes inherited fields when device library definitions change", () => {
    const appSource = readFileSync(new URL("./App.tsx", import.meta.url), "utf8")
      + readFileSync(new URL("./appExtracted/appStateBatch.tsx", import.meta.url), "utf8")
      + readFileSync(new URL("./appExtracted/appCanvasViewportBatch.tsx", import.meta.url), "utf8")
      + readFileSync(new URL("./appExtracted/appRenderBatch.tsx", import.meta.url), "utf8");
    const normalizedSource = appSource.replace(/\s+/g, " ");

    expect(normalizedSource).toContain(
      "createAppHookCallback12(__appScope), [activeSelectedNodeIds, customDeviceTemplates, deviceDefinitionOverrides, nodeById]"
    );
  });

  test("keeps each selected device definition for mixed enum common fields", () => {
    const firstTemplate: DeviceTemplate = {
      kind: "custom:dispatch-a",
      label: "调度设备A",
      categoryLibrary: "测试设备",
      size: { width: 100, height: 60 },
      params: { component_type: "DispatchA", dispatch_mode: "AUTO" },
      terminalType: "ac",
      terminalCount: 1,
      custom: true,
      parameterDefinitions: [{
        cnName: "调度模式",
        enName: "dispatch_mode",
        valueType: "stringEnum",
        typicalValue: "AUTO",
        enumValues: ["AUTO", "MANUAL"]
      }]
    };
    const secondTemplate: DeviceTemplate = {
      ...firstTemplate,
      kind: "custom:dispatch-b",
      label: "调度设备B",
      params: { component_type: "DispatchB", dispatch_mode: "REMOTE" },
      parameterDefinitions: [{
        cnName: "调度模式",
        enName: "dispatch_mode",
        valueType: "stringEnum",
        typicalValue: "REMOTE",
        enumValues: ["REMOTE", "LOCAL"]
      }]
    };
    const firstNode = createNodeFromTemplate(firstTemplate, { x: 100, y: 100 });
    const secondNode = createNodeFromTemplate(secondTemplate, { x: 240, y: 100 });

    const rows = createAppHookCallback12({
      DEFAULT_MODEL_LAYER_ID: "default",
      DEVICE_LIBRARY,
      PARAM_LABELS,
      activeSelectedNodeIds: [firstNode.id, secondNode.id],
      applyDeviceTemplateDefinitionOverride,
      canBatchEditParam,
      customDeviceTemplates: [firstTemplate, secondTemplate],
      deviceDefinitionOverrideForTemplate,
      deviceDefinitionOverrides: {},
      enumValuesForRow,
      getEParamValue,
      getTemplateParameterDefinitions,
      nodeById: new Map([
        [firstNode.id, firstNode],
        [secondNode.id, secondNode]
      ]),
      parseCustomDefinitions,
      resolveTemplateComponentLibrary,
      templateDerivedComponentLibraryInfo
    })();

    const row = rows.find((item) => item.key === "dispatch_mode");
    expect(row?.definitions?.map((definition: DeviceParameterDefinition | undefined) => definition && enumValuesForRow(definition))).toEqual([
      ["AUTO", "MANUAL"],
      ["REMOTE", "LOCAL"]
    ]);
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
    const appSource = readFileSync(new URL("./App.tsx", import.meta.url), "utf8")
      + readFileSync(new URL("./appExtracted/appStateBatch.tsx", import.meta.url), "utf8")
      + readFileSync(new URL("./appExtracted/appCanvasViewportBatch.tsx", import.meta.url), "utf8")
      + readFileSync(new URL("./appExtracted/appRenderBatch.tsx", import.meta.url), "utf8");
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
