import { readFileSync } from "node:fs";

import { afterEach, describe, expect, test, vi } from "vitest";

import { boxesIntersect, canBatchEditParam, PARAM_LABELS } from "./appExtracted/appCoreCanvasUtilities";
import { clampNumber } from "./canvasViewport";
import { enumValuesForRow } from "./appExtracted/appPersistenceLibraryExport";
import {
  createCanvasRectToSurfaceCssRect,
  createClampFloatingToolbarPosition,
  createRotateControlAvoidRectFromCanvasPoints,
  createToolbarOverlapArea,
  createAppHookCallback12, createAppHookCallback77, createAppHookCallback82, createAppHookCallback100, createAppHookCallback109, createAppHookCallback120, createJumpToAssociatedModel, createOpenNodeDoubleClickEditor } from "./appExtracted/appToolbarHookFactories";
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

  // fb13:批量面板与单选面板同口径 —— 全选容器时剔除容器专属键
  // (量测字段行 p/q/u/i + is_gateway/bound_device_idx),混选普通设备时不误伤其批量编辑
  const batchRowsFor = (nodes: ReturnType<typeof createDefaultNode>[]) =>
    createAppHookCallback12({
      DEFAULT_MODEL_LAYER_ID: "default",
      DEVICE_LIBRARY,
      PARAM_LABELS,
      activeSelectedNodeIds: nodes.map((node) => node.id),
      applyDeviceTemplateDefinitionOverride,
      canBatchEditParam,
      customDeviceTemplates: [],
      deviceDefinitionOverrideForTemplate,
      deviceDefinitionOverrides: {},
      enumValuesForRow,
      getEParamValue,
      getTemplateParameterDefinitions,
      nodeById: new Map(nodes.map((node) => [node.id, node])),
      parseCustomDefinitions,
      resolveTemplateComponentLibrary,
      templateDerivedComponentLibraryInfo
    })();

  test("多选两容器:量测行与容器专属行不出现在批量面板", () => {
    const first = createDefaultNode("ac-vpp-box", { x: 100, y: 100 });
    const second = createDefaultNode("ac-switch-box", { x: 320, y: 100 });
    // 只用 batch 路径可达的真实键:开关口写 is_gateway、绑设备写 bound_device_id(均在 params 通道,
    // 与 batch 的 `params ∪ 定义 enName` 取值同源);bound_device_idx 是 E 列键,batch 不可达,故不自造
    for (const node of [first, second]) {
      node.params.is_gateway = "1";
      node.params.bound_device_id = "dev-x";
    }

    const keys = batchRowsFor([first, second]).map((row) => row.key);
    for (const key of ["p", "q", "u", "i", "is_gateway", "bound_device_id", "status"]) {
      expect(keys, `批量面板不应出现容器专属行 ${key}`).not.toContain(key);
    }
    // 对照:「设备类型」等容器仍需要的行保留
    expect(keys).toContain("dev_type");
  });

  test("多选普通开关不受影响:status/电流行照旧(容器剔除只认全容器选中)", () => {
    const first = createDefaultNode("ac-switch", { x: 100, y: 100 });
    const second = createDefaultNode("ac-switch", { x: 240, y: 100 });

    const keys = batchRowsFor([first, second]).map((row) => row.key);
    expect(keys).toContain("status");
    expect(keys).toContain("i");
  });

  test("多选普通设备不受影响:量测参数行照旧(回归护栏)", () => {
    const first = createDefaultNode("ac-load", { x: 100, y: 100 });
    const second = createDefaultNode("ac-load", { x: 240, y: 100 });

    const keys = batchRowsFor([first, second]).map((row) => row.key);
    expect(keys).toContain("i");
    expect(keys).toContain("p");
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

// 浮动工具栏的几何助手：位置夹取、重叠面积、画布矩形 → CSS 矩形、旋转控件避让矩形。
// 四个都是 `create*(scope)` 工厂 —— 注入 scope 后是纯几何函数，因此可以在 node 环境直测。
// 32 处变异跑过、29 处转红。三处**源码等价**（写不出能证伪它们的用例，代码不动）：
// ① 位置夹取里「max 再与 min 取大」那道保险 —— clampNumber 本身是 Math.max(min, Math.min(max, v))，
//    min > max 时它已经返回 min；②③ 重叠面积里的 boxesIntersect 提前返回与两个 Math.max(0, …) ——
//    不相交时交集宽高必为负、被 Math.max 夹成 0，与提前返回 0 逐例相同。
// 判错的表现：工具栏被夹到视口外、避让框算小导致
// 旋转控件压在设备上、翻转坐标（缩放为负）时矩形上下颠倒 —— 都是纯观感问题，不报错。
describe("浮动工具栏几何助手（scope 注入的纯函数）", () => {
  const VIEWPORT = { left: 0, top: 0, right: 1000, bottom: 800 };

  const createGeometryScope = (over: Record<string, unknown> = {}) => ({
    clampNumber,
    boxesIntersect,
    floatingToolbarPadding: 8,
    floatingToolbarViewport: VIEWPORT,
    // 画布 → CSS 的映射这里就用「放大 2 倍并整体平移 100」代表，足以验证映射被用对
    canvasPointToSurfaceCss: ({ x, y }: { x: number; y: number }) => ({ x: x * 2 + 100, y: y * 2 + 100 }),
    floatingToolbarScreenScale: 1,
    ...over
  });

  describe("createClampFloatingToolbarPosition", () => {
    const clampOf = (over: Record<string, unknown> = {}) => createClampFloatingToolbarPosition(createGeometryScope(over) as never);

    test("★ 视口内不动，贴边的按 padding 收进来", () => {
      const clamp = clampOf();
      expect(clamp(400, 300, 200, 60)).toEqual({ x: 400, y: 300 });
      // padding 8：左边贴 0 → 收到 8；右边超出 → 收到 1000 - 200 - 8 = 792
      expect(clamp(0, 0, 200, 60)).toEqual({ x: 8, y: 8 });
      expect(clamp(990, 790, 200, 60)).toEqual({ x: 792, y: 732 });
    });

    test("★ 视口比工具栏还小时不会夹出负区间（max 被抬到 min）", () => {
      const clamp = createClampFloatingToolbarPosition(createGeometryScope({
        floatingToolbarViewport: { left: 0, top: 0, right: 50, bottom: 40 }
      }) as never);
      // 工具栏 200×60 放不下：结果应等于 padding 后的左上角，而不是负数
      expect(clamp(0, 0, 200, 60)).toEqual({ x: 8, y: 8 });
    });

    test("视口本身有偏移时按视口算，不是按 0", () => {
      const clamp = createClampFloatingToolbarPosition(createGeometryScope({
        floatingToolbarViewport: { left: 100, top: 200, right: 500, bottom: 400 }
      }) as never);
      expect(clamp(0, 0, 100, 50)).toEqual({ x: 108, y: 208 });
    });
  });

  describe("createToolbarOverlapArea", () => {
    const overlapOf = () => createToolbarOverlapArea(createGeometryScope() as never);
    const box = (left: number, top: number, right: number, bottom: number) => ({ left, top, right, bottom });

    test("★ 不相交时是 0", () => {
      expect(overlapOf()(box(0, 0, 10, 10), box(20, 20, 30, 30))).toBe(0);
      expect(overlapOf()(box(0, 0, 10, 10), box(10, 0, 20, 10))).toBe(0);
    });

    test("★ 相交时是交集面积", () => {
      expect(overlapOf()(box(0, 0, 10, 10), box(5, 5, 20, 20))).toBe(25);
      expect(overlapOf()(box(0, 0, 100, 100), box(10, 10, 20, 20))).toBe(100);
    });

    test("包含关系按交集算（不是被包含者的面积 × 2）", () => {
      expect(overlapOf()(box(0, 0, 100, 100), box(20, 20, 30, 30))).toBe(100);
    });
  });

  describe("createCanvasRectToSurfaceCssRect", () => {
    const toCssRect = (over: Record<string, unknown> = {}) =>
      createCanvasRectToSurfaceCssRect(createGeometryScope(over) as never);

    test("★ 走 scope 的画布 → CSS 映射（放大 2 倍 + 平移 100）", () => {
      expect(toCssRect()({ left: 0, top: 0, right: 10, bottom: 20 })).toEqual({
        left: 100,
        right: 120,
        top: 100,
        bottom: 140
      });
    });

    test("★ padding 向四面各扩一次", () => {
      expect(toCssRect()({ left: 0, top: 0, right: 10, bottom: 20 }, 5)).toEqual({
        left: 95,
        right: 125,
        top: 95,
        bottom: 145
      });
    });

    test("★ 映射把轴翻过来时也能纠正（min / max 各取一次）", () => {
      const flipped = createCanvasRectToSurfaceCssRect(createGeometryScope({
        canvasPointToSurfaceCss: ({ x, y }: { x: number; y: number }) => ({ x: -x, y: -y })
      }) as never);
      expect(flipped({ left: 0, top: 0, right: 10, bottom: 20 })).toEqual({ left: -10, right: 0, top: -20, bottom: 0 });
    });
  });

  describe("createRotateControlAvoidRectFromCanvasPoints", () => {
    const avoidOf = (over: Record<string, unknown> = {}) => {
      const scope = createGeometryScope(over);
      return createRotateControlAvoidRectFromCanvasPoints({
        ...scope,
        canvasRectToSurfaceCssRect: createCanvasRectToSurfaceCssRect(scope as never)
      } as never);
    };

    test("★ 先取点位包围盒（各向留 12），再按缩放补 padding", () => {
      // 画布包围盒 ±12 → (-12,-12)~(22,32)；映射 ×2 + 100 → (76,76)~(144,164)；再向四面各扩 6
      expect(avoidOf()([{ x: 0, y: 0 }, { x: 10, y: 20 }])).toEqual({
        left: 70,
        right: 150,
        top: 70,
        bottom: 170
      });
    });

    test("padding 随屏幕缩放放大，但有 4 的下限", () => {
      const wide = avoidOf({ floatingToolbarScreenScale: 2 })([{ x: 0, y: 0 }]);
      const narrow = avoidOf({ floatingToolbarScreenScale: 0.1 })([{ x: 0, y: 0 }]);
      const width = (rect: { left: number; right: number }) => rect.right - rect.left;
      expect(width(wide)).toBeGreaterThan(width(narrow));
      // 缩放 0.1 → 6*0.1 = 0.6 → 被下限 4 兜住，所以两者仍不等但 narrow 已是 4
      expect(width(narrow) / 2 - 24).toBe(4);
    });

    test("单点也成一个矩形（min / max 同值）", () => {
      expect(avoidOf()([{ x: 0, y: 0 }])).toEqual({ left: 70, right: 130, top: 70, bottom: 130 });
    });
  });
});
