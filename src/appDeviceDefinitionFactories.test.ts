import { afterEach, describe, expect, test, vi } from "vitest";

import {
  createSyncExistingNodesWithTemplateDefinitions
} from "./appExtracted/appGraphMeasurementFactories";
import {
  createComputeStateIconDrawingSmartAlignmentSnap,
  createFindEditableRouteSegmentIndex,
  createConfirmCustomLibraryCreateDialog,
  createDeleteCustomCategoryLibrary,
  createDeleteCustomComponentLibrary,
  createRouteSegmentPointerDistance,
  createSaveCustomDeviceTemplate,
  createSaveDeviceDefinitionVisualDraft,
  createOpenStateIconDrawingDialog,
  createStateIconDrawingKeyDown,
  createStartStateIconDrawingDrag,
  deviceParameterDefinitionsComplianceMessage,
  formatStateIconDrawingNumber,
  imageLibraryFileMatchesImportKind,
  imageLibraryImportKindForInput,
  normalizeStateIconDrawingFontSize,
  normalizeStateIconDrawingStrokeWidth,
  stateIconDrawingElementIdsInRect
} from "./appExtracted/appDeviceDefinitionFactories";
import { createSetEdgeManualPoints } from "./appExtracted/appProjectCanvasFactories";
import { Point } from "./model";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("manual bend interaction helpers", () => {
  test("syncs existing canvas nodes when a matching template visual definition changes", () => {
    const node: any = {
      id: "node-1",
      kind: "custom-userlibrary",
      name: "画布按钮",
      nodeNumber: "7",
      acTopologyNode: 0,
      dcTopologyNode: 0,
      position: { x: 100, y: 120 },
      x: 100,
      y: 120,
      size: { width: 104, height: 64 },
      rotation: 0,
      scale: 1,
      terminals: [],
      params: {
        component_type: "UserLibrary",
        name: "实例名称",
        status: "1",
        backgroundImage: "data:image/svg+xml,old",
        backgroundImageAssetId: "old-asset",
        fillColor: "#ffffff",
        strokeColor: "#111827",
        lineWidth: "1",
        text: "旧文字"
      }
    };
    const patchGraphNodes = vi.fn();
    const pushUndoSnapshot = vi.fn();
    const syncExistingNodesWithTemplateDefinitions = createSyncExistingNodesWithTemplateDefinitions({
      createNodeFromTemplate: undefined,
      nodes: [node],
      patchGraphNodes,
      pushUndoSnapshot,
      reconcileNodeParamsWithTemplateDefinitions: (current: any) => current,
      undoScopeForGraphPatch: (nodeIds: string[]) => ({ nodeIds })
    });

    const changedCount = syncExistingNodesWithTemplateDefinitions(
      {
        parameterDefinitions: [],
        params: {
          component_type: "UserLibrary",
          backgroundImage: "data:image/svg+xml,new",
          backgroundImageAssetId: "new-asset",
          backgroundImageCleared: "",
          fillColor: "#e0f2fe",
          strokeColor: "#0284c7",
          lineWidth: "3",
          text: "新文字"
        },
        size: { width: 180, height: 88 },
        stateDefinitions: [
          { value: "1", name: "合", backgroundImage: "data:image/svg+xml,state-new" }
        ]
      } as any,
      [],
      (candidate: any) => candidate.kind === "custom-userlibrary"
    );

    expect(changedCount).toBe(1);
    expect(pushUndoSnapshot).toHaveBeenCalledWith(true, false, { nodeIds: ["node-1"] });
    expect(patchGraphNodes).toHaveBeenCalledTimes(1);
    const updated = patchGraphNodes.mock.calls[0][0][0];
    expect(updated.size).toEqual({ width: 180, height: 88 });
    expect(updated.params).toMatchObject({
      component_type: "UserLibrary",
      name: "实例名称",
      status: "1",
      backgroundImage: "data:image/svg+xml,new",
      backgroundImageAssetId: "new-asset",
      fillColor: "#e0f2fe",
      strokeColor: "#0284c7",
      lineWidth: "3",
      text: "新文字"
    });
    expect(updated.params).not.toHaveProperty("_stateDefinitions");
  });

  test("saving a definition visual draft syncs matching canvas nodes with the new visual definition", () => {
    const syncExistingNodesWithTemplateDefinitions = vi.fn();
    const parameterDefinitions = [
      { cnName: "名称", enName: "name", valueType: "string", typicalValue: "" }
    ];
    const stateDefinitions = [
      { value: "1", name: "合", backgroundImage: "data:image/svg+xml,state-new" }
    ];
    const scope = {
      DEFAULT_STATE_PAGE_ID: "__default__",
      TERMINAL_TYPE_LIBRARY_LABELS: { ac: "交流" },
      activeStateDraftRow: () => ({ id: "state-1", value: "1" }),
      createStateDraftRow: (definition: any) => ({ id: `state-${definition.value}`, ...definition }),
      definitionStateDraftRows: stateDefinitions,
      definitionStatePageId: "state-1",
      definitionVisualDraft: {
        backgroundImage: "data:image/svg+xml,new",
        backgroundImageAssetId: "new-asset",
        backgroundImageCleared: "",
        size: { width: 180, height: 88 },
        terminalCount: 2,
        terminalTypes: ["ac", "ac"],
        terminalLabels: ["左", "右"]
      },
      definitionVisualTerminalAnchors: [
        { x: -0.5, y: 0 },
        { x: 0.5, y: 0 }
      ],
      deviceDefinitionOverrideForTemplate: () => undefined,
      getTemplateParameterDefinitions: () => parameterDefinitions,
      hasOverlappingCustomDeviceTerminalAnchors: () => false,
      requireEditMode: () => true,
      selectedDefinitionTemplate: {
        kind: "custom-userlibrary",
        label: "用户元件",
        custom: false,
        size: { width: 104, height: 64 },
        params: { component_type: "UserLibrary" },
        terminalType: "ac",
        terminalCount: 0,
        parameterDefinitions
      },
      setCustomDeviceTemplates: vi.fn(),
      setDefinitionDraftError: vi.fn(),
      setDefinitionStateDraftRows: vi.fn(),
      setDefinitionStatePageId: vi.fn(),
      setDefinitionTerminalAnchorDragIndex: vi.fn(),
      setDefinitionVisualDraft: vi.fn(),
      setDeviceDefinitionOverrides: vi.fn(),
      syncExistingNodesWithTemplateDefinitions,
      templateAllowsResizeTransform: () => true,
      validateStateDraftRows: () => ({ states: stateDefinitions, error: "" }),
      writeOperationLog: vi.fn()
    };

    createSaveDeviceDefinitionVisualDraft(scope)();

    expect(syncExistingNodesWithTemplateDefinitions).toHaveBeenCalledTimes(1);
    expect(syncExistingNodesWithTemplateDefinitions).toHaveBeenCalledWith(
      expect.objectContaining({
        parameterDefinitions,
        params: {
          component_type: "UserLibrary",
          backgroundImage: "data:image/svg+xml,new",
          backgroundImageAssetId: "new-asset",
          backgroundImageCleared: ""
        },
        size: { width: 180, height: 88 },
        terminalType: "ac",
        terminalCount: 2,
        terminalTypes: ["ac", "ac"],
        terminalLabels: ["左", "右"],
        terminalAnchors: [
          { x: -0.5, y: 0 },
          { x: 0.5, y: 0 }
        ],
        stateDefinitions
      }),
      parameterDefinitions,
      expect.any(Function)
    );
    expect(syncExistingNodesWithTemplateDefinitions.mock.calls[0][2]({ kind: "custom-userlibrary" })).toBe(true);
    expect(syncExistingNodesWithTemplateDefinitions.mock.calls[0][2]({ kind: "other" })).toBe(false);
  });

  test("saves a newly created custom device with the requested English name", () => {
    let customDeviceDraft = {
      categoryLibraryName: "用户类别库",
      componentLibrary: "UserLibrary",
      componentName: "测试元件",
      componentKind: "UserDevice",
      backgroundImage: "",
      backgroundImageAssetId: "",
      backgroundImageCleared: "",
      size: { width: 104, height: 64 },
      allowResizeTransform: "0",
      terminalCount: 0,
      terminalTypes: [],
      terminalLabels: [],
      terminalAnchors: [],
      terminalRoles: [],
      terminalAssociations: [],
      isContainer: false,
      params: [],
      stateDefinitions: [],
      error: ""
    };
    let savedTemplates: any[] = [];
    const scope = {
      ALLOW_RESIZE_TRANSFORM_PARAM: "allowResizeTransform",
      TERMINAL_TYPE_LIBRARY_LABELS: { ac: "交流" },
      closeCustomDeviceDialog: vi.fn(),
      customDefaultDefinitions: () => [],
      get customDeviceDraft() {
        return customDeviceDraft;
      },
      customDeviceGeneratedDefaultImageCandidates: () => [],
      customDeviceImageWithTerminalConnectors: (image: string) => image,
      customDeviceTemplates: [],
      customDeviceTerminalAnchors: [],
      defaultComponentLibraryForCategoryLibrary: () => "UserLibrary",
      editingCustomDeviceKind: "",
      ensureCustomComponentTreeExpanded: vi.fn(),
      generateCustomDeviceImage: () => "data:image/svg+xml,%3Csvg%2F%3E",
      hasOverlappingCustomDeviceTerminalAnchors: () => false,
      isReservedDeviceDefinitionParamName: () => false,
      isValidComponentLibraryName: (name: string) => /^[A-Za-z][A-Za-z0-9_]*$/.test(name),
      measurementConfig: { measurementTypes: [], deviceProfiles: [] },
      measurementConfigDraft: undefined,
      measurementConfigDraftRef: undefined,
      nextCustomTemplateKind: vi.fn(() => "custom-userlibrary"),
      normalizeCategoryLibraryName: (name: string) => name.trim(),
      normalizeComponentLibraryName: (name: string) => name.trim(),
      normalizeContainerTerminalAssociations: () => [],
      normalizeDefinitionRowEnumFields: (rows: any) => rows,
      persistDeviceLibraryChange: vi.fn(),
      requireEditMode: () => true,
      setCustomComponentTreeSelection: vi.fn(),
      setCustomDeviceDraft: (updater: any) => {
        customDeviceDraft = typeof updater === "function" ? updater(customDeviceDraft) : updater;
      },
      setCustomDeviceDraftCleanBaseline: vi.fn(),
      setCustomDeviceSaveMessage: vi.fn(),
      setCustomDeviceTemplates: (templates: any[]) => {
        savedTemplates = templates;
      },
      setEditingCustomDeviceKind: vi.fn(),
      setExpandedCategoryLibraries: vi.fn(),
      syncExistingNodesWithTemplateDefinitions: vi.fn(),
      syncInheritedCustomDeviceStateVisuals: (states: any[]) => states,
      validateContainerTerminalAssociations: () => ({ valid: true }),
      validateStateDraftRows: (states: any[]) => ({ states, error: "" }),
      writeOperationLog: vi.fn()
    };

    const saved = createSaveCustomDeviceTemplate(scope)();

    expect(saved).toBe(true);
    expect(savedTemplates[0]).toMatchObject({
      kind: "UserDevice",
      label: "测试元件",
      categoryLibrary: "用户类别库",
      params: { component_type: "UserLibrary" }
    });
    expect(scope.nextCustomTemplateKind).not.toHaveBeenCalled();
  });

  test("creating a category library does not create a duplicate component library", () => {
    let customCategoryLibraries: string[] = [];
    let customComponentLibraries: any[] = [];
    let customDeviceDraft = {
      categoryLibraryName: "交流设备",
      componentLibrary: "ACLine",
      componentName: "",
      error: ""
    };
    let customLibraryCreateDialog: any = {
      kind: "categoryLibrary",
      title: "新建类别",
      cnName: "自定义地图按钮",
      enName: "CustomDeviceMaple",
      categoryLibraryName: "",
      componentLibrary: "",
      error: ""
    };
    const setCustomComponentTreeSelection = vi.fn();

    const scope = {
      categoryLibraries: ["交流设备", "直流设备"],
      componentLibraryOptions: ["ACLine", "DCLine"],
      get customDeviceDraft() {
        return customDeviceDraft;
      },
      get customLibraryCreateDialog() {
        return customLibraryCreateDialog;
      },
      isValidComponentLibraryName: (name: string) => /^[A-Za-z][A-Za-z0-9_]*$/.test(name),
      normalizeCategoryLibraryName: (name: string) => name.trim(),
      normalizeComponentLibraryName: (name: string) => name.trim(),
      normalizeCustomCategoryLibraries: (value: unknown) => Array.from(new Set((value as string[]).map((item) => item.trim()).filter(Boolean))),
      normalizeCustomComponentLibraries: (value: unknown) => value as any[],
      requireEditMode: () => true,
      setCustomCategoryLibraries: (updater: any) => {
        customCategoryLibraries = typeof updater === "function" ? updater(customCategoryLibraries) : updater;
      },
      setCustomComponentLibraries: (updater: any) => {
        customComponentLibraries = typeof updater === "function" ? updater(customComponentLibraries) : updater;
      },
      setCustomComponentTreeSelection,
      setCustomDeviceDraft: (updater: any) => {
        customDeviceDraft = typeof updater === "function" ? updater(customDeviceDraft) : updater;
      },
      setCustomLibraryCreateDialog: (updater: any) => {
        customLibraryCreateDialog = typeof updater === "function" ? updater(customLibraryCreateDialog) : updater;
      },
      setExpandedCategoryLibraries: vi.fn()
    };

    const created = createConfirmCustomLibraryCreateDialog(scope)();

    expect(created).toBe(true);
    expect(customCategoryLibraries).toEqual(["自定义地图按钮"]);
    expect(customComponentLibraries).toEqual([]);
    expect(setCustomComponentTreeSelection).toHaveBeenCalledWith({
      kind: "categoryLibrary",
      categoryLibraryName: "自定义地图按钮"
    });
    expect(customDeviceDraft).toMatchObject({
      categoryLibraryName: "自定义地图按钮",
      componentLibrary: "",
      error: ""
    });
  });

  test("asks for confirmation before deleting an empty category library", () => {
    const confirm = vi.fn(() => false);
    vi.stubGlobal("window", { confirm, alert: vi.fn() });
    let customCategoryLibraries = ["用户类别"];
    const setCustomCategoryLibraries = vi.fn((updater: any) => {
      customCategoryLibraries = typeof updater === "function" ? updater(customCategoryLibraries) : updater;
    });
    const scope = {
      PROTECTED_CATEGORY_LIBRARIES: new Set(["交流设备", "直流设备"]),
      customComponentLibraries: [],
      customDeviceDraft: {
        categoryLibraryName: "用户类别",
        componentLibrary: "UserLibrary"
      },
      customDeviceTemplates: [],
      defaultComponentLibraryForCategoryLibrary: () => "ACLoad",
      isBuiltInComponentLibrary: () => false,
      normalizeCategoryLibraryName: (name: string) => name.trim(),
      requireEditMode: () => true,
      resolveTemplateComponentLibrary: (template: any) => template.params?.component_type ?? "",
      setCollapsedCustomComponentTreeLibraries: vi.fn(),
      setCollapsedCustomComponentTreeTypes: vi.fn(),
      setCustomCategoryLibraries,
      setCustomComponentLibraries: vi.fn(),
      setCustomComponentTreeSelection: vi.fn(),
      setCustomDeviceDraft: vi.fn(),
      setCustomDeviceTemplates: vi.fn(),
      setDefinitionDraftSection: vi.fn(),
      setDeviceDefinitionOverrides: vi.fn(),
      setEditingCustomDeviceKind: vi.fn(),
      setExpandedCategoryLibraries: vi.fn(),
      setExpandedDefinitionGroups: vi.fn(),
      setSelectedDefinitionKind: vi.fn()
    };

    createDeleteCustomCategoryLibrary(scope)("用户类别");

    expect(confirm).toHaveBeenCalledWith("确认删除类别库“用户类别”？");
    expect(setCustomCategoryLibraries).not.toHaveBeenCalled();
    expect(customCategoryLibraries).toEqual(["用户类别"]);
  });

  test("asks for confirmation before deleting an empty component library", () => {
    const confirm = vi.fn(() => false);
    vi.stubGlobal("window", { confirm, alert: vi.fn() });
    let customComponentLibraries = [
      { name: "UserLibrary", categoryLibraryName: "用户类别", label: "用户元件库" }
    ];
    const setCustomComponentLibraries = vi.fn((updater: any) => {
      customComponentLibraries = typeof updater === "function" ? updater(customComponentLibraries) : updater;
    });
    const scope = {
      E_SECTION_OPTIONS: ["ACLoad"],
      customComponentTreeSelection: {
        kind: "componentLibrary",
        categoryLibraryName: "用户类别",
        section: "UserLibrary"
      },
      customDeviceDraft: {
        categoryLibraryName: "用户类别",
        componentLibrary: "UserLibrary"
      },
      defaultComponentLibraryForCategoryLibrary: () => "ACLoad",
      libraryTemplates: [],
      normalizeCategoryLibraryName: (name: string) => name.trim(),
      normalizeComponentLibraryName: (name: string) => name.trim(),
      requireEditMode: () => true,
      resolveTemplateComponentLibrary: (template: any) => template.params?.component_type ?? "",
      setCollapsedCustomComponentTreeTypes: vi.fn(),
      setCustomComponentLibraries,
      setCustomComponentTreeSelection: vi.fn(),
      setCustomDeviceDraft: vi.fn(),
      setCustomDeviceTemplates: vi.fn(),
      setDefinitionDraftSection: vi.fn(),
      setDeviceDefinitionOverrides: vi.fn(),
      setEditingCustomDeviceKind: vi.fn(),
      setSelectedDefinitionKind: vi.fn()
    };

    createDeleteCustomComponentLibrary(scope)("UserLibrary");

    expect(confirm).toHaveBeenCalledWith("确认删除元件库“UserLibrary”？");
    expect(setCustomComponentLibraries).not.toHaveBeenCalled();
    expect(customComponentLibraries).toEqual([
      { name: "UserLibrary", categoryLibraryName: "用户类别", label: "用户元件库" }
    ]);
  });

  test("saves the active inline default icon drawing as the custom device background", () => {
    let customDeviceDraft = {
      categoryLibraryName: "静态图元",
      componentLibrary: "StaticButton",
      componentName: "按钮",
      componentKind: "custom-StaticButton-2",
      backgroundImage: "data:image/svg+xml,old",
      backgroundImageAssetId: "",
      backgroundImageCleared: "",
      size: { width: 104, height: 64 },
      allowResizeTransform: "0",
      terminalCount: 0,
      terminalTypes: [],
      terminalLabels: [],
      terminalAnchors: [],
      terminalRoles: [],
      terminalAssociations: [],
      isContainer: false,
      params: [],
      stateDefinitions: [],
      error: ""
    };
    let savedTemplates: any[] = [];
    let persistedPayload: any = null;
    const inlineImage = "data:image/svg+xml,inline-frame-background-border";
    const scope = {
      ALLOW_RESIZE_TRANSFORM_PARAM: "allowResizeTransform",
      DEFAULT_STATE_PAGE_ID: "__default__",
      TERMINAL_TYPE_LIBRARY_LABELS: { ac: "交流" },
      closeCustomDeviceDialog: vi.fn(),
      customDefaultDefinitions: () => [],
      get customDeviceDraft() {
        return customDeviceDraft;
      },
      customDeviceGeneratedDefaultImageCandidates: () => [],
      customDeviceImageWithTerminalConnectors: (image: string) => image,
      customDeviceTemplates: [],
      customDeviceTerminalAnchors: [],
      defaultComponentLibraryForCategoryLibrary: () => "StaticButton",
      editingCustomDeviceKind: "",
      ensureCustomComponentTreeExpanded: vi.fn(),
      generateCustomDeviceImage: () => "data:image/svg+xml,generated",
      hasOverlappingCustomDeviceTerminalAnchors: () => false,
      isDefaultStatePageId: (rowId: string) => rowId === "__default__",
      isReservedDeviceDefinitionParamName: () => false,
      isValidComponentLibraryName: (name: string) => /^[A-Za-z][A-Za-z0-9_]*$/.test(name),
      measurementConfig: { measurementTypes: [], deviceProfiles: [] },
      measurementConfigDraft: undefined,
      measurementConfigDraftRef: undefined,
      nextCustomTemplateKind: vi.fn(() => "custom-StaticButton-2"),
      normalizeCategoryLibraryName: (name: string) => name.trim(),
      normalizeComponentLibraryName: (name: string) => name.trim(),
      normalizeContainerTerminalAssociations: () => [],
      normalizeDefinitionRowEnumFields: (rows: any) => rows,
      persistDeviceLibraryChange: vi.fn((payload: any) => {
        persistedPayload = payload;
      }),
      requireEditMode: () => true,
      setCustomComponentTreeSelection: vi.fn(),
      setCustomDeviceDraft: (updater: any) => {
        customDeviceDraft = typeof updater === "function" ? updater(customDeviceDraft) : updater;
      },
      setCustomDeviceDraftCleanBaseline: vi.fn(),
      setCustomDeviceSaveMessage: vi.fn(),
      setCustomDeviceTemplates: (templates: any[]) => {
        savedTemplates = templates;
      },
      setEditingCustomDeviceKind: vi.fn(),
      setExpandedCategoryLibraries: vi.fn(),
      stateIconDrawingInlineImage: inlineImage,
      stateIconDrawingInlineTarget: { scope: "custom", rowId: "__default__" },
      syncExistingNodesWithTemplateDefinitions: vi.fn(),
      syncInheritedCustomDeviceStateVisuals: (states: any[]) => states,
      validateContainerTerminalAssociations: () => ({ valid: true }),
      validateStateDraftRows: (states: any[]) => ({ states, error: "" }),
      writeOperationLog: vi.fn()
    };

    const saved = createSaveCustomDeviceTemplate(scope)();

    expect(saved).toBe(true);
    expect(savedTemplates[0].params.backgroundImage).toBe(inlineImage);
    expect(persistedPayload.customDeviceTemplates[0].params.backgroundImage).toBe(inlineImage);
    expect(customDeviceDraft.backgroundImage).toBe(inlineImage);
  });

  test("opens state icon drawing with the saved frame settings", () => {
    const row = {
      id: "state-1",
      value: "1",
      name: "运行",
      image: "data:image/svg+xml,frame",
      imageAssetId: "",
      imageCleared: ""
    };
    let dialog: any = null;
    const savedFrame = {
      strokeStyle: "dotted",
      strokeWidth: 4,
      strokeColor: "#123456",
      fillColor: "#abcdef"
    };
    const stateIconDrawingInitialFrame = vi.fn(() => savedFrame);
    const scope = {
      createStateIconDrawingInitialElements: vi.fn(() => [{ id: "element-1" }]),
      customDeviceDraft: { stateDefinitions: [] },
      definitionStateDraftRows: [row],
      imageAssets: {},
      setStateIconDrawingContextMenu: vi.fn(),
      setStateIconDrawingDialog: (value: any) => {
        dialog = value;
      },
      stateIconDrawingHistoryRef: { current: [{ id: "old" }] },
      stateIconDrawingInitialFrame
    };

    createOpenStateIconDrawingDialog(scope)({ scope: "definition", rowId: "state-1" });

    expect(stateIconDrawingInitialFrame).toHaveBeenCalledWith(row, {}, expect.objectContaining({
      strokeStyle: "dashed",
      strokeColor: "#94a3b8"
    }));
    expect(dialog.frame).toEqual(savedFrame);
  });

  test("validates parameter definition names and default value types", () => {
    const message = deviceParameterDefinitionsComplianceMessage([
      { cnName: "额定功率", enName: "ratedPower", valueType: "integer", typicalValue: "12.5" },
      { cnName: "额定功率2", enName: "ratedPower", valueType: "float", typicalValue: "abc" },
      { cnName: "", enName: "", valueType: "string", typicalValue: "" },
      {
        cnName: "状态",
        enName: "status",
        valueType: "numberEnum",
        typicalValue: "运行",
        enumOptions: [{ value: "1", label: "运行" }]
      }
    ] as any);

    expect(message).toContain("属性第 1 行：默认值必须是整数。");
    expect(message).toContain("属性第 2 行：英文名称 ratedPower 与第 1 行重复。");
    expect(message).toContain("属性第 2 行：默认值必须是数字。");
    expect(message).toContain("属性第 3 行：中文名称不能为空。");
    expect(message).toContain("属性第 3 行：英文名称不能为空。");
    expect(message).toContain("属性第 4 行：默认值必须是数字枚举值。");
  });

  test("separates external image imports from document image and icon imports", () => {
    expect(imageLibraryImportKindForInput({ dataset: { imageImportKind: "image" } } as any)).toBe("image");
    expect(imageLibraryImportKindForInput({ dataset: { imageImportKind: "archive" } } as any)).toBe("archive");
    expect(imageLibraryImportKindForInput({ dataset: {} } as any)).toBe("mixed");

    expect(imageLibraryFileMatchesImportKind("switch.svg", "image")).toBe(true);
    expect(imageLibraryFileMatchesImportKind("diagram.png", "image")).toBe(true);
    expect(imageLibraryFileMatchesImportKind("icons.pptx", "image")).toBe(false);
    expect(imageLibraryFileMatchesImportKind("icons.pptx", "archive")).toBe(true);
    expect(imageLibraryFileMatchesImportKind("icons.pptm", "archive")).toBe(true);
    expect(imageLibraryFileMatchesImportKind("icons.docm", "archive")).toBe(true);
    expect(imageLibraryFileMatchesImportKind("icons.xlsx", "archive")).toBe(true);
    expect(imageLibraryFileMatchesImportKind("icons.zip", "archive")).toBe(true);
    expect(imageLibraryFileMatchesImportKind("diagram.png", "archive")).toBe(false);
    expect(imageLibraryFileMatchesImportKind("diagram.png", "mixed")).toBe(true);
    expect(imageLibraryFileMatchesImportKind("icons.pptx", "mixed")).toBe(true);
  });

  test("computes state icon drawing smart alignment guides for moved elements", () => {
    const moving = {
      id: "moving",
      x: 48,
      y: 40,
      width: 20,
      height: 12
    };
    const anchor = {
      id: "anchor",
      x: 120,
      y: 80,
      width: 40,
      height: 20
    };
    const computeSnap = createComputeStateIconDrawingSmartAlignmentSnap({
      smartAlignmentEnabled: true
    });

    const result = computeSnap({
      elements: [moving, anchor],
      selectedIds: ["moving"],
      startElements: [moving],
      delta: { x: 71, y: 39 },
      threshold: 3
    });

    expect(result.delta).toEqual({ x: 72, y: 40 });
    expect(result.guides).toHaveLength(2);
    expect(result.guides.map((guide) => guide.orientation).sort()).toEqual(["horizontal", "vertical"]);
    expect(result.guides.find((guide) => guide.orientation === "vertical")?.position).toBe(120);
    expect(result.guides.find((guide) => guide.orientation === "horizontal")?.position).toBe(80);
  });

  test("computes state icon drawing smart alignment guides from frame ratio lines", () => {
    const moving = {
      id: "moving",
      x: 48,
      y: 40,
      width: 20,
      height: 12
    };
    const computeSnap = createComputeStateIconDrawingSmartAlignmentSnap({
      smartAlignmentEnabled: true
    });
    const xTargets = [60, 80, 120, 160, 180];
    const yTargets = [40, 160 / 3, 80, 320 / 3, 120];

    for (const targetX of xTargets) {
      const result = computeSnap({
        elements: [moving],
        selectedIds: ["moving"],
        startElements: [moving],
        delta: { x: targetX - moving.x - 1, y: 0 },
        threshold: 3
      });

      expect(result.delta.x).toBeCloseTo(targetX - moving.x);
      expect(result.guides.find((guide) => guide.orientation === "vertical")?.position).toBeCloseTo(targetX);
    }

    for (const targetY of yTargets) {
      const result = computeSnap({
        elements: [moving],
        selectedIds: ["moving"],
        startElements: [moving],
        delta: { x: 0, y: targetY - moving.y - 1 },
        threshold: 3
      });

      expect(result.delta.y).toBeCloseTo(targetY - moving.y);
      expect(result.guides.find((guide) => guide.orientation === "horizontal")?.position).toBeCloseTo(targetY);
    }
  });

  test("computes state icon drawing smart alignment guides from terminal anchors", () => {
    const moving = {
      id: "moving",
      x: 62,
      y: 42,
      width: 20,
      height: 12
    };
    const computeSnap = createComputeStateIconDrawingSmartAlignmentSnap({
      smartAlignmentEnabled: true,
      stateIconDrawingDialog: {
        target: { scope: "definition", rowId: "default" }
      },
      definitionVisualDraft: {
        terminalCount: 2,
        terminalTypes: ["ac", "ac"]
      },
      definitionVisualTerminalAnchors: [
        { x: -0.5, y: -0.1 },
        { x: -0.1, y: -0.5 }
      ],
      projectCustomDeviceTerminalAnchorToBoundary: (anchor: Point) => anchor
    });

    const result = computeSnap({
      elements: [moving],
      selectedIds: ["moving"],
      startElements: [moving],
      delta: { x: 39, y: 25 },
      threshold: 3
    });

    expect(result.delta).toEqual({ x: 40, y: 26 });
    expect(result.guides).toHaveLength(2);
    expect(result.guides.find((guide) => guide.orientation === "vertical")?.position).toBe(102);
    expect(result.guides.find((guide) => guide.orientation === "horizontal")?.position).toBe(68);
  });

  test("selects state icon drawing elements intersecting a marquee rectangle", () => {
    const elements = [
      { id: "inside", x: 40, y: 40, width: 20, height: 20 },
      { id: "edge", x: 70, y: 50, width: 20, height: 20 },
      { id: "outside", x: 130, y: 120, width: 18, height: 18 }
    ];

    expect(stateIconDrawingElementIdsInRect(elements, {
      left: 20,
      right: 80,
      top: 25,
      bottom: 65
    })).toEqual(["inside", "edge"]);
  });

  test("does not change state icon drawing selection on right pointer down", () => {
    let prevented = false;
    let stopped = false;
    const dialog = {
      elements: [{ id: "target", x: 40, y: 40, width: 20, height: 20 }],
      selectedElementId: "existing",
      selectedElementIds: ["existing"]
    };
    const dragRef = { current: null as any };
    const startDrag = createStartStateIconDrawingDrag({
      setStateIconDrawingContextMenu: () => {},
      setStateIconDrawingDialog: (updater: any) => {
        const next = typeof updater === "function" ? updater(dialog) : updater;
        Object.assign(dialog, next);
      },
      stateIconDrawingDragRef: dragRef,
      stateIconDrawingHistoryRef: { current: [] },
      stateIconDrawingPointer: () => ({ x: 40, y: 40 })
    });

    startDrag({
      button: 2,
      shiftKey: false,
      ctrlKey: false,
      metaKey: false,
      preventDefault: () => {
        prevented = true;
      },
      stopPropagation: () => {
        stopped = true;
      },
      currentTarget: {
        closest: () => ({ focus: () => {} }),
        setPointerCapture: () => {}
      }
    } as any, "target", "move");

    expect(prevented).toBe(false);
    expect(stopped).toBe(false);
    expect(dialog.selectedElementIds).toEqual(["existing"]);
    expect(dragRef.current).toBeNull();
  });

  test("cuts selected state icon drawing elements with Ctrl+X", () => {
    let prevented = false;
    let dialog: any = {
      elements: [
        { id: "keep", x: 20, y: 20, width: 10, height: 10 },
        { id: "cut", x: 60, y: 40, width: 20, height: 16 }
      ],
      selectedElementId: "cut",
      selectedElementIds: ["cut"]
    };
    let contextMenuCleared = false;
    const historyRef = { current: [] as any[] };
    const clipboardRef = { current: [] as any[] };
    const keyDown = createStateIconDrawingKeyDown({
      deleteSelectedStateIconDrawingElements: vi.fn(),
      setStateIconDrawingContextMenu: (value: any) => {
        contextMenuCleared = value === null;
      },
      setStateIconDrawingDialog: (updater: any) => {
        dialog = typeof updater === "function" ? updater(dialog) : updater;
      },
      stateIconDrawingClipboardRef: clipboardRef,
      stateIconDrawingDialog: dialog,
      stateIconDrawingElementId: () => "new-id",
      stateIconDrawingHistoryRef: historyRef
    });

    keyDown({
      key: "x",
      ctrlKey: true,
      metaKey: false,
      target: null,
      preventDefault: () => {
        prevented = true;
      }
    } as any);

    expect(prevented).toBe(true);
    expect(contextMenuCleared).toBe(true);
    expect(clipboardRef.current).toEqual([{ id: "cut", x: 60, y: 40, width: 20, height: 16 }]);
    expect(historyRef.current).toEqual([[
      { id: "keep", x: 20, y: 20, width: 10, height: 10 },
      { id: "cut", x: 60, y: 40, width: 20, height: 16 }
    ]]);
    expect(dialog.elements).toEqual([{ id: "keep", x: 20, y: 20, width: 10, height: 10 }]);
    expect(dialog.selectedElementId).toBe("");
    expect(dialog.selectedElementIds).toEqual([]);
  });

  test("normalizes state icon drawing font size to a positive integer", () => {
    expect(normalizeStateIconDrawingFontSize("32")).toBe(32);
    expect(normalizeStateIconDrawingFontSize("32.9")).toBe(32);
    expect(normalizeStateIconDrawingFontSize("0", 14)).toBe(8);
    expect(normalizeStateIconDrawingFontSize("-4", 14)).toBe(8);
    expect(normalizeStateIconDrawingFontSize("", 18.7)).toBe(18);
  });

  test("formats state icon drawing geometry values and integer stroke widths", () => {
    expect(formatStateIconDrawingNumber(59.73719)).toBe("59.74");
    expect(formatStateIconDrawingNumber("91.86669")).toBe("91.87");
    expect(formatStateIconDrawingNumber("", 0)).toBe("0.00");
    expect(normalizeStateIconDrawingStrokeWidth(1.2)).toBe(1);
    expect(normalizeStateIconDrawingStrokeWidth("1.8")).toBe(2);
    expect(normalizeStateIconDrawingStrokeWidth("-3")).toBe(0);
  });

  test("finds endpoint-adjacent route segments when adding a manual bend", () => {
    const findEditableRouteSegmentIndex = createFindEditableRouteSegmentIndex({
      routeSegmentPointerDistance: createRouteSegmentPointerDistance({}),
      sameOptionalPoint: (first?: Point, second?: Point) =>
        Boolean(first && second && first.x === second.x && first.y === second.y)
    });
    const routePoints: Point[] = [
      { x: 40, y: 80 },
      { x: 120, y: 80 },
      { x: 120, y: 160 },
      { x: 260, y: 160 },
      { x: 260, y: 80 },
      { x: 340, y: 80 }
    ];

    expect(findEditableRouteSegmentIndex(routePoints, { x: 60, y: 80 })).toBe(0);
    expect(findEditableRouteSegmentIndex(routePoints, { x: 320, y: 80 })).toBe(4);
  });

  test("stores the full edited route when committing connection manual points", () => {
    const patchGraphEdges = vi.fn();
    const edge = {
      id: "edge-1",
      sourceId: "source",
      targetId: "target",
      manualPoints: [{ x: 120, y: 120 }],
      routePoints: [
        { x: 40, y: 80 },
        { x: 120, y: 80 },
        { x: 120, y: 120 },
        { x: 260, y: 120 },
        { x: 260, y: 80 },
        { x: 340, y: 80 }
      ]
    };
    const editedRoutePoints: Point[] = [
      { x: 40, y: 80 },
      { x: 64, y: 80 },
      { x: 64, y: 48 },
      { x: 96, y: 48 },
      { x: 120, y: 80 },
      { x: 120, y: 120 },
      { x: 260, y: 120 },
      { x: 260, y: 80 },
      { x: 340, y: 80 }
    ];
    const setEdgeManualPoints = createSetEdgeManualPoints({
      edgeById: new Map([[edge.id, edge]]),
      markRouteEdgesDirty: vi.fn(),
      markStoredRouteEdgesDirty: vi.fn(),
      patchGraphEdges,
      requireEditMode: () => true,
      sameOptionalPointList: (first?: Point[], second?: Point[]) =>
        JSON.stringify(first ?? []) === JSON.stringify(second ?? [])
    });

    setEdgeManualPoints(edge.id, [{ x: 120, y: 120 }], editedRoutePoints);

    expect(patchGraphEdges).toHaveBeenCalledWith([
      {
        ...edge,
        manualPoints: [{ x: 120, y: 120 }],
        routePoints: editedRoutePoints
      }
    ]);
  });
});
