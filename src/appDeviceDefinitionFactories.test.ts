import { afterEach, describe, expect, test, vi } from "vitest";
import { readFileSync } from "node:fs";

import {
  createSyncExistingNodesWithTemplateDefinitions
} from "./appExtracted/appGraphMeasurementFactories";
import { normalizeCustomComponentLibraries, normalizeDefinitionRowEnumFields } from "./appExtracted/appPersistenceLibraryExport";
import {
  createComputeStateIconDrawingSmartAlignmentSnap,
  createCompleteImportedModelFeedback,
  createFindEditableRouteSegmentIndex,
  createImportSvgModelFile,
  createApplyExistingImage,
  createApplyIconLibraryCatalogIcon,
  createApplyStateIconDrawingDialog,
  createConfirmCustomLibraryCreateDialog,
  createDeleteCustomCategoryLibrary,
  createDeleteCustomComponentLibrary,
  createRenameSelectedCustomDeviceTreeItem,
  applyEDeviceInterfaceFieldOrder,
  applyEDeviceDefinitionSectionsToLibraryState,
  buildEDeviceInterfaceDefinitionRows,
  buildEFileExportOptionsFromLibrary,
  createExportEFile,
  createExportSchemeRecord,
  createExportEDeviceDefinitionFile,
  createRouteSegmentPointerDistance,
  createResolveDuplicateModelImport,
  createSaveBuiltinDeviceDefinitionFromCustomDraft,
  createSaveCustomDeviceDefinitionDialog,
  createSaveCustomDeviceTemplate,
  createSaveDeviceDefinitionDraft,
  createSaveDeviceDefinitionVisualDraft,
  createSelectCustomComponentLibrary,
  createSvgExportReferencedImageHrefById,
  createOpenSvgModelImportFilePicker,
  createOpenStateIconDrawingDialog,
  createStartCustomComponentCreate,
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
import {
  createDefinitionVisualDraft,
  createCustomDeviceDraftFromTemplate,
  customDefaultDefinitions,
  deviceDefinitionKeyForTemplate,
  deviceDefinitionSharedKeyForTemplate,
  deviceDefinitionOverrideForTemplate,
  isDerivedComponentBaseParamName,
  isReservedDeviceDefinitionParamName,
  normalizeContainerTerminalAssociations,
  resolveTemplateComponentLibrary
} from "./customDeviceUtils";
import {
  applyDeviceTemplateDefinitionOverride,
  buildEFileExport,
  buildEDeviceRecords,
  buildEDeviceHeaderParameterRecords,
  orderEDeviceRecordsForExport,
  createDefaultNode,
  DEVICE_LIBRARY,
  getTemplateParameterDefinitions,
  parseEDeviceDefinitionFile,
  Point,
  templateDerivedComponentLibraryInfo
} from "./model";
import { normalizeDeviceLibraryPersistencePayload } from "./appExtracted/appPersistenceLibraryExport";
import { stateIconDrawingToImage } from "./stateIconDrawing";
import { apiPath } from "./config";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("device definition terminal anchors", () => {
  test("uses the canvas single-terminal default when a built-in template has no explicit anchor", () => {
    const template = DEVICE_LIBRARY.find((item) => item.kind === "ac-source");
    expect(template).toBeTruthy();
    expect(template?.terminalAnchors).toBeUndefined();
    if (!template) {
      return;
    }

    expect(createDefinitionVisualDraft(template).terminalAnchors[0]).toEqual({ x: 0.5, y: 0 });
    expect(createCustomDeviceDraftFromTemplate(template).terminalAnchors[0]).toEqual({ x: 0.5, y: 0 });
  });
});

describe("SVG model import factories", () => {
  test("opens the SVG model picker for the right-clicked scheme", () => {
    const click = vi.fn();
    const target = { current: "" };
    const input = { value: "old", click };
    const open = createOpenSvgModelImportFilePicker({
      requireEditMode: vi.fn(() => true),
      svgModelImportInputRef: { current: input },
      modelImportTargetSchemeIdRef: target
    });

    open("scheme-2");

    expect(target.current).toBe("scheme-2");
    expect(input.value).toBe("");
    expect(click).toHaveBeenCalledOnce();
  });

  test("imports SVG into the target scheme and reports semantic statistics", async () => {
    const targetScheme = { id: "scheme-2", name: "目标方案", projects: [] };
    const commitImportedModelRecord = vi.fn();
    const completeImportedModelFeedback = vi.fn();
    const importedProject = { version: 1, name: "一次图", nodes: [], edges: [] };
    const parseSvgModel = vi.fn(async () => ({
      mode: "platform",
      project: importedProject,
      stats: { nodes: 5, edges: 6, measurementGroups: 2, staticNodes: 1 },
      warnings: ["参数使用模板默认值。"]
    }));
    const importFile = createImportSvgModelFile({
      activeSchemeRecord: null,
      selectedSchemeRecord: null,
      schemes: [targetScheme],
      libraryTemplates: [],
      modelImportTargetSchemeIdRef: { current: "scheme-2" },
      requireEditMode: vi.fn(() => true),
      findSavedSchemeById: (_schemes: unknown, id: string) => id === "scheme-2" ? targetScheme : null,
      createSavedScheme: vi.fn(),
      createSavedProject: (name: string, project: unknown) => ({ id: "project-new", name, project }),
      commitImportedModelRecord,
      completeImportedModelFeedback,
      setPendingModelImportConflict: vi.fn(),
      parseSvgModel,
      writeOperationLog: vi.fn(),
      yieldToBrowser: async () => undefined
    });
    const input = { files: [{ name: "一次图.svg", text: async () => "<svg/>" }], value: "chosen" };

    await importFile({ currentTarget: input } as never);

    expect(parseSvgModel).toHaveBeenCalledWith("<svg/>", expect.objectContaining({ name: "一次图", templates: [] }));
    expect(commitImportedModelRecord).toHaveBeenCalledWith(targetScheme, expect.objectContaining({ name: "一次图" }));
    expect(completeImportedModelFeedback).toHaveBeenCalledWith(expect.objectContaining({
      successMessage: expect.stringContaining("设备：5"),
      warnings: ["参数使用模板默认值。"]
    }));
    expect(input.value).toBe("");
  });

  test("stores SVG completion feedback when a duplicate model needs resolution", async () => {
    const targetScheme = {
      id: "scheme-2",
      name: "目标方案",
      projects: [{ id: "project-old", name: "一次图" }]
    };
    const setPendingModelImportConflict = vi.fn();
    const warnings = Array.from({ length: 25 }, (_, index) => `警告 ${index + 1}`);
    const importFile = createImportSvgModelFile({
      activeSchemeRecord: null,
      selectedSchemeRecord: null,
      schemes: [targetScheme],
      libraryTemplates: [],
      modelImportTargetSchemeIdRef: { current: "scheme-2" },
      requireEditMode: vi.fn(() => true),
      findSavedSchemeById: () => targetScheme,
      createSavedScheme: vi.fn(),
      createSavedProject: vi.fn(),
      commitImportedModelRecord: vi.fn(),
      completeImportedModelFeedback: vi.fn(),
      setPendingModelImportConflict,
      parseSvgModel: vi.fn(async () => ({
        mode: "generic",
        project: { version: 1, name: "一次图", nodes: [], edges: [] },
        stats: { nodes: 0, edges: 0, measurementGroups: 0, staticNodes: 1 },
        warnings
      })),
      writeOperationLog: vi.fn(),
      yieldToBrowser: async () => undefined
    });

    await importFile({
      currentTarget: { files: [{ name: "一次图.svg", text: async () => "<svg/>" }], value: "chosen" }
    } as never);

    const conflict = setPendingModelImportConflict.mock.calls[0]?.[0];
    expect(conflict).toMatchObject({
      targetSchemeId: "scheme-2",
      importedName: "一次图",
      duplicateProjectId: "project-old",
      duplicateProjectName: "一次图",
      completionFeedback: { warnings }
    });
    expect(conflict.completionFeedback.successMessage).toContain("普通 SVG 静态图元");
    expect(conflict.completionFeedback.successMessage).toContain("20. 警告 20");
    expect(conflict.completionFeedback.successMessage).not.toContain("警告 21");
  });

  test("writes every SVG warning to the operation log before showing completion", () => {
    const showGlobalMessage = vi.fn();
    vi.stubGlobal("showGlobalMessage", showGlobalMessage);
    const writeOperationLog = vi.fn();
    const complete = createCompleteImportedModelFeedback({ writeOperationLog });

    complete({ successMessage: "导入完成", warnings: ["第一条", "第二条"] });

    expect(writeOperationLog).toHaveBeenNthCalledWith(1, "SVG 导入警告：第一条");
    expect(writeOperationLog).toHaveBeenNthCalledWith(2, "SVG 导入警告：第二条");
    expect(showGlobalMessage).toHaveBeenCalledWith("导入完成");
  });

  test("shows SVG completion feedback after a duplicate import is renamed", () => {
    const targetScheme = { id: "scheme-2", projects: [{ id: "old", name: "一次图" }] };
    const commitImportedModelRecord = vi.fn();
    const completeImportedModelFeedback = vi.fn();
    const setPendingModelImportConflict = vi.fn();
    const conflict = {
      targetSchemeId: "scheme-2",
      importedProject: { version: 1, name: "一次图", nodes: [], edges: [] },
      importedName: "一次图",
      duplicateProjectId: "old",
      duplicateProjectName: "一次图",
      completionFeedback: { successMessage: "SVG 导入完成", warnings: ["提示"] }
    };
    const resolve = createResolveDuplicateModelImport({
      activeSchemeRecord: null,
      selectedSchemeRecord: null,
      schemes: [targetScheme],
      pendingModelImportConflict: conflict,
      requireEditMode: vi.fn(() => true),
      findSavedSchemeById: () => targetScheme,
      createSavedScheme: vi.fn(),
      uniqueRecordName: () => "一次图 (2)",
      promptUniqueRecordName: () => "一次图 (2)",
      createSavedProject: (name: string, project: unknown) => ({ id: "new", name, project }),
      setPendingModelImportConflict,
      commitImportedModelRecord,
      completeImportedModelFeedback
    });

    resolve("rename");

    expect(commitImportedModelRecord).toHaveBeenCalledWith(targetScheme, expect.objectContaining({ name: "一次图 (2)" }));
    expect(completeImportedModelFeedback).toHaveBeenCalledWith(conflict.completionFeedback);
    expect(setPendingModelImportConflict).toHaveBeenCalledWith(null);
  });
});

describe("manual bend interaction helpers", () => {
  test("collects referenced images from the rendered background page for svg export", () => {
    const backendImageIdFromHref = (href: string) => {
      const match = new RegExp(apiPath("/images/([^/?#]+)")).exec(href);
      return match ? decodeURIComponent(match[1]) : "";
    };
    const hrefById = createSvgExportReferencedImageHrefById({
      backendImageIdFromHref,
      canvasBackgroundImage: apiPath("/images/current-canvas-bg"),
      canvasBackgroundImageAssetId: "",
      canvasBackgroundImageUrl: "",
      backgroundPageRender: {
        backgroundImageUrl: apiPath("/images/background-page-bg"),
        nodes: [
          {
            kind: "background-kind",
            params: {
              backgroundImageAssetId: "background-node-bg-asset",
              foregroundImageAssetId: "background-node-fg-asset",
              backgroundImage: apiPath("/images/background-node-bg"),
              foregroundImage: apiPath("/images/background-node-fg"),
              status: "1"
            }
          }
        ]
      },
      imageAssets: {},
      libraryTemplateByKind: new Map([
        ["current-kind", { kind: "current-kind" }],
        ["background-kind", { kind: "background-kind" }]
      ]),
      nodes: [
        {
          kind: "current-kind",
          params: {
            backgroundImage: apiPath("/images/current-node-bg"),
            foregroundImage: "",
            backgroundImageAssetId: "",
            foregroundImageAssetId: ""
          }
        }
      ],
      resolveDeviceStateVisual: (_template: any, node: any) => node.kind === "background-kind"
        ? { image: apiPath("/images/background-state-visual") }
        : { image: apiPath("/images/current-state-visual") },
      resolveStateVisualImageHref: (visual: any) => visual?.image ?? ""
    })();

    expect(hrefById.get("current-canvas-bg")).toBe(apiPath("/images/current-canvas-bg"));
    expect(hrefById.get("current-node-bg")).toBe(apiPath("/images/current-node-bg"));
    expect(hrefById.get("current-state-visual")).toBe(apiPath("/images/current-state-visual"));
    expect(hrefById.get("background-page-bg")).toBe(apiPath("/images/background-page-bg"));
    expect(hrefById.get("background-node-bg-asset")).toBe(apiPath("/images/background-node-bg-asset"));
    expect(hrefById.get("background-node-fg-asset")).toBe(apiPath("/images/background-node-fg-asset"));
    expect(hrefById.get("background-node-bg")).toBe(apiPath("/images/background-node-bg"));
    expect(hrefById.get("background-node-fg")).toBe(apiPath("/images/background-node-fg"));
    expect(hrefById.get("background-state-visual")).toBe(apiPath("/images/background-state-visual"));
  });

  test("collects backend images nested inside svg data urls for standalone svg export", () => {
    const backendImageIdFromHref = (href: string) => {
      const match = new RegExp("^" + apiPath("/images/([^/?#]+)")).exec(href);
      return match ? decodeURIComponent(match[1]) : "";
    };
    const nestedSvg = [
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 160">',
      '<image href="' + apiPath('/images/nested-photo') + '" x="0" y="0" width="240" height="160"/>',
      "</svg>"
    ].join("");
    const hrefById = createSvgExportReferencedImageHrefById({
      backendImageIdFromHref,
      canvasBackgroundImage: "",
      canvasBackgroundImageAssetId: "",
      canvasBackgroundImageUrl: "",
      backgroundPageRender: null,
      imageAssets: {},
      libraryTemplateByKind: new Map(),
      nodes: [
        {
          kind: "static-text",
          params: {
            backgroundImage: `data:image/svg+xml;utf8,${encodeURIComponent(nestedSvg)}`,
            foregroundImage: "",
            backgroundImageAssetId: "",
            foregroundImageAssetId: ""
          }
        }
      ],
      resolveDeviceStateVisual: () => null,
      resolveStateVisualImageHref: () => ""
    })();

    expect(hrefById.get("nested-photo")).toBe(apiPath("/images/nested-photo"));
  });

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
    const projectMeasurements = { version: 1 as const, groups: [] };
    const migratedMeasurements = { version: 1 as const, groups: [{ id: "measurement-node-1" }] } as any;
    const measurementConfig = { groupDefaults: {}, measurementTypes: [], deviceProfiles: [] } as any;
    const reconcileProjectMeasurementsWithConfig = vi.fn(() => migratedMeasurements);
    const setProjectMeasurements = vi.fn();
    const syncExistingNodesWithTemplateDefinitions = createSyncExistingNodesWithTemplateDefinitions({
      createNodeFromTemplate: undefined,
      measurementConfig,
      nodes: [node],
      patchGraphNodes,
      projectMeasurements,
      pushUndoSnapshot,
      reconcileProjectMeasurementsWithConfig,
      reconcileNodeParamsWithTemplateDefinitions: (current: any) => current,
      setProjectMeasurements,
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
    expect(reconcileProjectMeasurementsWithConfig).toHaveBeenCalledWith(
      projectMeasurements,
      [updated],
      measurementConfig,
      measurementConfig
    );
    expect(setProjectMeasurements).toHaveBeenCalledWith(migratedMeasurements);
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
        parameterDefinitions: expect.arrayContaining([
          expect.objectContaining(parameterDefinitions[0])
        ]),
        params: expect.objectContaining({
          component_type: "UserLibrary",
          backgroundImage: "data:image/svg+xml,new",
          backgroundImageAssetId: "new-asset",
          backgroundImageCleared: ""
        }),
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
      expect.arrayContaining([
        expect.objectContaining(parameterDefinitions[0])
      ]),
      expect.any(Function)
    );
    expect(syncExistingNodesWithTemplateDefinitions.mock.calls[0][2]({ kind: "custom-userlibrary" })).toBe(true);
    expect(syncExistingNodesWithTemplateDefinitions.mock.calls[0][2]({ kind: "other" })).toBe(false);
  });

  test("saving a derived definition parameter draft does not overwrite the base component library", () => {
    let nextOverrides: Record<string, any> = {};
    const setDefinitionDraftRows = vi.fn();
    const scope = {
      ALLOW_RESIZE_TRANSFORM_PARAM: "allowResizeTransform",
      definitionDraftRows: [
        {
          id: "row-hydro",
          cnName: "水电机组型号",
          enName: "hydroUnitModel",
          valueType: "string",
          typicalValue: "300 MW混流式机组",
          readonly: false,
          exportEnabled: true,
          exportName: "hydroUnitModel"
        }
      ],
      definitionDraftSection: "ACGenerator",
      deviceDefinitionKeyForTemplate: () => "ACGenerator",
      deviceDefinitionOverrideForTemplate: () => undefined,
      deviceDefinitionRowId: () => "new-row-id",
      getTemplateParameterDefinitions: () => [],
      isReservedDeviceDefinitionParamName: () => false,
      libraryTemplates: [],
      measurementConfig: { measurementTypes: [], deviceProfiles: [] },
      measurementConfigDraft: null,
      measurementConfigDraftRef: { current: null },
      normalizeComponentLibraryName: (value: string) => value.trim(),
      normalizeDefinitionRowEnumFields: (row: any) => row,
      requireEditMode: () => true,
      selectedDefinitionTemplate: {
        kind: "ac-hydro-source",
        label: "交流水力发电机",
        categoryLibrary: "交流设备",
        custom: false,
        size: { width: 92, height: 58 },
        params: {
          sourceType: "水力",
          ratedPower: "300 MW",
          ratedVoltage: "220 kV"
        },
        terminalType: "ac",
        terminalCount: 1
      },
      setDefinitionDraftError: vi.fn(),
      setDefinitionDraftRows,
      setDeviceDefinitionOverrides: (updater: (current: Record<string, any>) => Record<string, any>) => {
        nextOverrides = updater({});
      },
      syncExistingNodesWithTemplateDefinitions: vi.fn(),
      templateAllowsResizeTransform: () => false
    };

    createSaveDeviceDefinitionDraft(scope)();

    const sharedKey = deviceDefinitionSharedKeyForTemplate(scope.selectedDefinitionTemplate as any);
    expect(nextOverrides).toHaveProperty(sharedKey);
    expect(nextOverrides).not.toHaveProperty("ACGenerator");
    expect(nextOverrides[sharedKey]).toMatchObject({
      kind: sharedKey,
      params: {
        component_type: "ACGenerator",
        derived_component_type: "ACHydroGen",
        derived_from_component_type: "ACGenerator",
        derived_component_library_label: "交流水力发电机",
        is_derived_component_library: "1",
        hydroUnitModel: "300 MW混流式机组"
      },
      parameterDefinitions: [
        expect.objectContaining({
          enName: "hydroUnitModel",
          exportName: "hydroUnitModel"
        })
      ]
    });
    expect(setDefinitionDraftRows).toHaveBeenCalledWith([
      expect.objectContaining({ enName: "hydroUnitModel", id: "new-row-id" })
    ]);
  });

  test("rejects an accidental empty built-in parameter table", () => {
    const setDefinitionDraftError = vi.fn();
    const setDeviceDefinitionOverrides = vi.fn();
    const template = DEVICE_LIBRARY.find((item) => item.kind === "ac-source")!;

    createSaveDeviceDefinitionDraft({
      definitionDraftRows: [],
      definitionDeleteAllParametersRequestedRef: { current: false },
      requireEditMode: () => true,
      selectedDefinitionTemplate: template,
      setDefinitionDraftError,
      setDeviceDefinitionOverrides
    })();

    expect(setDefinitionDraftError).toHaveBeenCalledWith(expect.stringContaining("不会保存"));
    expect(setDeviceDefinitionOverrides).not.toHaveBeenCalled();
  });

  test("persists an empty built-in parameter table only after explicit delete-all", () => {
    let nextOverrides: Record<string, any> = {};
    const template = DEVICE_LIBRARY.find((item) => item.kind === "ac-source")!;
    const deleteAllRef = { current: true };
    const setDefinitionDraftError = vi.fn();

    createSaveDeviceDefinitionDraft({
      ALLOW_RESIZE_TRANSFORM_PARAM: "allow_resize_transform",
      definitionDeleteAllParametersRequestedRef: deleteAllRef,
      definitionDraftRows: [],
      definitionDraftSection: "ACGenerator",
      definitionMeasurementDraft: [],
      deviceDefinitionKeyForTemplate: (candidate: any) => candidate.kind,
      deviceDefinitionOverrideForTemplate: (candidate: any, overrides: Record<string, any>) => overrides[candidate.kind],
      deviceDefinitionRowId: () => "row",
      getTemplateParameterDefinitions,
      isReservedDeviceDefinitionParamName: () => false,
      libraryTemplates: DEVICE_LIBRARY,
      measurementConfig: { measurementTypes: [], deviceProfiles: [] },
      measurementConfigDraft: null,
      measurementConfigDraftRef: { current: null },
      normalizeComponentLibraryName: (value: string) => value.trim(),
      normalizeDefinitionRowEnumFields: (row: any) => row,
      requireEditMode: () => true,
      selectedDefinitionTemplate: template,
      setDefinitionDraftError,
      setDefinitionDraftRows: vi.fn(),
      setDefinitionMeasurementDraft: vi.fn(),
      setDeviceDefinitionOverrides: (updater: (current: Record<string, any>) => Record<string, any>) => {
        nextOverrides = updater({});
      },
      syncExistingNodesWithTemplateDefinitions: vi.fn()
    })();

    const sharedKey = deviceDefinitionSharedKeyForTemplate(template);
    expect(nextOverrides[sharedKey]).toMatchObject({
      parameterDefinitions: [],
      parameterDefinitionsIntent: "delete-all"
    });
    expect(deleteAllRef.current).toBe(false);
    expect(setDefinitionDraftError).toHaveBeenLastCalledWith("");
  });

  test("saving a derived definition parameter draft keeps newly added derived fields", () => {
    let nextOverrides: Record<string, any> = {};
    const scope = {
      ALLOW_RESIZE_TRANSFORM_PARAM: "allowResizeTransform",
      createDefinitionDraftRows: () => [
        {
          id: "row-hydro",
          cnName: "水电机组型号",
          enName: "hydroUnitModel",
          valueType: "string",
          typicalValue: "300 MW混流式机组"
        }
      ],
      definitionDraftRows: [
        {
          id: "row-hydro",
          cnName: "水电机组型号",
          enName: "hydroUnitModel",
          valueType: "string",
          typicalValue: "300 MW混流式机组",
          exportEnabled: true,
          exportName: "hydroUnitModel"
        },
        {
          id: "row-owner",
          cnName: "业主单位",
          enName: "ownerName",
          valueType: "string",
          typicalValue: "示例业主",
          exportEnabled: true,
          exportName: "ownerName"
        }
      ],
      definitionDraftSection: "ACGenerator",
      deviceDefinitionKeyForTemplate: () => "ACGenerator",
      deviceDefinitionOverrideForTemplate: () => undefined,
      deviceDefinitionRowId: () => "new-row-id",
      getTemplateParameterDefinitions: () => [],
      isReservedDeviceDefinitionParamName: () => false,
      libraryTemplates: [],
      measurementConfig: { measurementTypes: [], deviceProfiles: [] },
      measurementConfigDraft: null,
      measurementConfigDraftRef: { current: null },
      normalizeComponentLibraryName: (value: string) => value.trim(),
      normalizeDefinitionRowEnumFields: (row: any) => row,
      requireEditMode: () => true,
      selectedDefinitionTemplate: {
        kind: "ac-hydro-source",
        label: "交流水力发电机",
        categoryLibrary: "交流设备",
        custom: false,
        size: { width: 92, height: 58 },
        params: {
          sourceType: "水力",
          ratedPower: "300 MW",
          ratedVoltage: "220 kV"
        },
        terminalType: "ac",
        terminalCount: 1
      },
      setDefinitionDraftError: vi.fn(),
      setDefinitionDraftRows: vi.fn(),
      setDeviceDefinitionOverrides: (updater: (current: Record<string, any>) => Record<string, any>) => {
        nextOverrides = updater({});
      },
      syncExistingNodesWithTemplateDefinitions: vi.fn(),
      templateAllowsResizeTransform: () => false
    };

    createSaveDeviceDefinitionDraft(scope)();

    const sharedKey = deviceDefinitionSharedKeyForTemplate(scope.selectedDefinitionTemplate as any);
    expect(nextOverrides[sharedKey].parameterDefinitions.map((row: any) => row.enName)).toEqual([
      "hydroUnitModel",
      "ownerName"
    ]);
    expect(nextOverrides[sharedKey].params).toMatchObject({
      hydroUnitModel: "300 MW混流式机组",
      ownerName: "示例业主"
    });
  });

  test("rejects an accidental empty built-in parameter table", () => {
    const setDefinitionDraftError = vi.fn();
    const setDeviceDefinitionOverrides = vi.fn();
    const template = DEVICE_LIBRARY.find((item) => item.kind === "ac-source")!;

    createSaveDeviceDefinitionDraft({
      definitionDraftRows: [],
      definitionDeleteAllParametersRequestedRef: { current: false },
      requireEditMode: () => true,
      selectedDefinitionTemplate: template,
      setDefinitionDraftError,
      setDeviceDefinitionOverrides
    })();

    expect(setDefinitionDraftError).toHaveBeenCalledWith(expect.stringContaining("不会保存"));
    expect(setDeviceDefinitionOverrides).not.toHaveBeenCalled();
  });

  test("persists an empty built-in parameter table only after explicit delete-all", () => {
    let nextOverrides: Record<string, any> = {};
    const template = DEVICE_LIBRARY.find((item) => item.kind === "ac-source")!;
    const deleteAllRef = { current: true };
    const setDefinitionDraftError = vi.fn();

    createSaveDeviceDefinitionDraft({
      ALLOW_RESIZE_TRANSFORM_PARAM: "allowResizeTransform",
      definitionDeleteAllParametersRequestedRef: deleteAllRef,
      definitionDraftRows: [],
      definitionDraftSection: "ACGenerator",
      deviceDefinitionKeyForTemplate: (candidate: any) => candidate.kind,
      deviceDefinitionOverrideForTemplate: (candidate: any, overrides: Record<string, any>) => overrides[candidate.kind],
      deviceDefinitionRowId: () => "row",
      getTemplateParameterDefinitions,
      isReservedDeviceDefinitionParamName: () => false,
      libraryTemplates: DEVICE_LIBRARY,
      normalizeComponentLibraryName: (value: string) => value.trim(),
      normalizeDefinitionRowEnumFields: (row: any) => row,
      requireEditMode: () => true,
      selectedDefinitionTemplate: template,
      setDefinitionDraftError,
      setDefinitionDraftRows: vi.fn(),
      setDeviceDefinitionOverrides: (updater: (current: Record<string, any>) => Record<string, any>) => {
        nextOverrides = updater({});
      },
      syncExistingNodesWithTemplateDefinitions: vi.fn()
    })();

    const sharedKey = deviceDefinitionSharedKeyForTemplate(template);
    expect(nextOverrides[sharedKey]).toMatchObject({
      parameterDefinitions: [],
      parameterDefinitionsIntent: "delete-all"
    });
    expect(deleteAllRef.current).toBe(false);
    expect(setDefinitionDraftError).toHaveBeenLastCalledWith("");
  });

  test("rejects derived definition parameters that duplicate base component fields", () => {
    const setDefinitionDraftError = vi.fn();
    const setDeviceDefinitionOverrides = vi.fn();
    const syncExistingNodesWithTemplateDefinitions = vi.fn();
    const scope = {
      ALLOW_RESIZE_TRANSFORM_PARAM: "allowResizeTransform",
      createDefinitionDraftRows: () => [
        {
          id: "row-nuclear",
          cnName: "核电机组型号",
          enName: "nuclearUnitModel",
          valueType: "string",
          typicalValue: "1000 MW压水堆机组"
        }
      ],
      definitionDraftRows: [
        {
          id: "row-p-set",
          cnName: "有功设定",
          enName: "p_set",
          valueType: "float",
          typicalValue: "100"
        },
        {
          id: "row-nuclear",
          cnName: "核电机组型号",
          enName: "nuclearUnitModel",
          valueType: "string",
          typicalValue: "1000 MW压水堆机组"
        }
      ],
      definitionDraftSection: "ACGenerator",
      deviceDefinitionKeyForTemplate: () => "ACGenerator",
      deviceDefinitionOverrideForTemplate: () => undefined,
      deviceDefinitionRowId: () => "new-row-id",
      getTemplateParameterDefinitions: () => [],
      isReservedDeviceDefinitionParamName: () => false,
      libraryTemplates: [],
      measurementConfig: { measurementTypes: [], deviceProfiles: [] },
      measurementConfigDraft: null,
      measurementConfigDraftRef: { current: null },
      normalizeComponentLibraryName: (value: string) => value.trim(),
      normalizeDefinitionRowEnumFields: (row: any) => row,
      requireEditMode: () => true,
      selectedDefinitionTemplate: {
        kind: "ac-nuclear-source",
        label: "交流核能发电机",
        categoryLibrary: "交流设备",
        custom: false,
        size: { width: 92, height: 58 },
        params: {
          sourceType: "核能",
          ratedPower: "1000 MW",
          ratedVoltage: "500 kV"
        },
        terminalType: "ac",
        terminalCount: 1
      },
      setDefinitionDraftError,
      setDefinitionDraftRows: vi.fn(),
      setDeviceDefinitionOverrides,
      syncExistingNodesWithTemplateDefinitions,
      templateAllowsResizeTransform: () => false
    };

    createSaveDeviceDefinitionDraft(scope)();

    expect(setDefinitionDraftError).toHaveBeenCalledWith(expect.stringContaining("p_set"));
    expect(setDefinitionDraftError.mock.calls[0]?.[0]).toContain("基类");
    expect(setDeviceDefinitionOverrides).not.toHaveBeenCalled();
    expect(syncExistingNodesWithTemplateDefinitions).not.toHaveBeenCalled();
  });

  test("applying an existing image to the state icon frame sets a platform background reference", async () => {
    let dialog: any = {
      frame: {
        strokeStyle: "solid",
        strokeWidth: 1,
        strokeColor: "#334155",
        fillColor: "#ffffff"
      },
      elements: [{ id: "shape-1", kind: "rectangle" }],
      selectedElementId: "shape-1",
      selectedElementIds: ["shape-1"]
    };
    const setImageTarget = vi.fn();
    const updateGraphNodeById = vi.fn();
    const scope = {
      createEditableStateIconElementsFromSvgSource: vi.fn(),
      createImportedStateIconElement: vi.fn(),
      imageAssetList: [
        { id: "asset-1", name: "背景图", url: apiPath("/images/asset-1"), mimeType: "image/png" }
      ],
      imageAssets: {
        "asset-1": "data:image/png;base64,cached-preview"
      },
      imageTarget: { kind: "stateIconFrameBackground" },
      libraryTemplateByKind: new Map(),
      pushUndoSnapshot: vi.fn(),
      requireEditMode: () => true,
      setCanvasBackgroundImage: vi.fn(),
      setCanvasBackgroundImageAssetId: vi.fn(),
      setImageTarget,
      setStateIconDrawingDialog: (updater: any) => {
        dialog = typeof updater === "function" ? updater(dialog) : updater;
      },
      startLibraryDevicePlacement: vi.fn(),
      stateIconDrawingHistoryRef: { current: [] },
      svgSourceFromDataUrl: vi.fn(),
      updateGraphNodeById,
      writeOperationLog: vi.fn()
    };

    await createApplyExistingImage(scope)("asset-1");

    expect(dialog.elements).toEqual([{ id: "shape-1", kind: "rectangle" }]);
    expect(dialog.frame).toMatchObject({
      backgroundImage: apiPath("/images/asset-1"),
      backgroundImageAssetId: "asset-1"
    });
    expect(updateGraphNodeById).not.toHaveBeenCalled();
    expect(setImageTarget).toHaveBeenCalledWith(null);
  });

  test("applying an icon library catalog icon can set the canvas background image", async () => {
    const setImageTarget = vi.fn();
    const setCanvasBackgroundImage = vi.fn();
    const setCanvasBackgroundImageAssetId = vi.fn();
    const pushUndoSnapshot = vi.fn();
    const scope = {
      createEditableStateIconElementsFromSvgSource: vi.fn(),
      createImportedStateIconElement: vi.fn(),
      iconLibraryPicker: {
        entries: [
          {
            id: "library-1:maps:pin:maps/pin.svg",
            libraryLabel: "地图图标",
            libraryId: "library-1",
            categoryLabel: "地图",
            categoryId: "maps",
            name: "定位",
            iconId: "pin",
            url: "/icon-library/library-1/maps/pin.svg"
          }
        ]
      },
      imageTarget: { kind: "canvas" },
      libraryTemplateByKind: new Map(),
      pushUndoSnapshot,
      requireEditMode: () => true,
      setCanvasBackgroundImage,
      setCanvasBackgroundImageAssetId,
      setImageTarget,
      setStateIconDrawingDialog: vi.fn(),
      startLibraryDevicePlacement: vi.fn(),
      stateIconDrawingHistoryRef: { current: [] },
      updateGraphNodeById: vi.fn(),
      writeOperationLog: vi.fn()
    };

    await createApplyIconLibraryCatalogIcon(scope)("library-1:maps:pin:maps/pin.svg");

    expect(pushUndoSnapshot).toHaveBeenCalledTimes(1);
    expect(setCanvasBackgroundImageAssetId).toHaveBeenCalledWith("");
    expect(setCanvasBackgroundImage).toHaveBeenCalledWith("/icon-library/library-1/maps/pin.svg");
    expect(setImageTarget).toHaveBeenCalledWith(null);
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
    const previousTemplate = {
      kind: "previous-user-device",
      label: "原有元件",
      componentClass: "UserLibrary",
      categoryLibrary: "用户类别库",
      size: { width: 80, height: 48 },
      params: { component_type: "UserLibrary" },
      terminalType: "ac",
      terminalCount: 0,
      terminalTypes: [],
      terminalLabels: [],
      terminalAnchors: [],
      terminalRoles: [],
      custom: true
    };
    let savedTemplates: any[] = [];
    let savedDefinitionOverrides: Record<string, any> = {};
    const scope = {
      ALLOW_RESIZE_TRANSFORM_PARAM: "allowResizeTransform",
      TERMINAL_TYPE_LIBRARY_LABELS: { ac: "交流" },
      closeCustomDeviceDialog: vi.fn(),
      customComponentLibraries: [{
        name: "UserLibrary",
        categoryLibraryName: "用户类别库",
        terminalCount: 0,
        terminalTypes: [],
        terminalLabels: [],
        terminalRoles: [],
        terminalAssociations: [],
        isContainerComponentLibrary: false,
        allowResizeTransform: false
      }],
      customDefaultDefinitions: () => [],
      get customDeviceDraft() {
        return customDeviceDraft;
      },
      customDeviceGeneratedDefaultImageCandidates: () => [],
      customDeviceImageWithTerminalConnectors: (image: string) => image,
      customDeviceTemplates: [previousTemplate],
      customDeviceTerminalAnchors: [],
      defaultComponentLibraryForCategoryLibrary: () => "UserLibrary",
      editingCustomDeviceKind: "",
      ensureCustomComponentTreeExpanded: vi.fn(),
      generateCustomDeviceImage: () => "data:image/svg+xml,%3Csvg%2F%3E",
      hasOverlappingCustomDeviceTerminalAnchors: () => false,
      isReservedDeviceDefinitionParamName: () => false,
      isValidComponentLibraryName: (name: string) => /^[A-Za-z][A-Za-z0-9_-]*$/.test(name),
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
      setCustomDeviceDefinitionMode: vi.fn(),
      setCustomDeviceDraft: (updater: any) => {
        customDeviceDraft = typeof updater === "function" ? updater(customDeviceDraft) : updater;
      },
      setCustomDeviceDraftCleanBaseline: vi.fn(),
      setCustomDeviceSaveMessage: vi.fn(),
      setCustomDeviceSaveToast: vi.fn(),
      customDeviceSaveToastTimerRef: { current: null },
      setCustomDeviceTemplates: (templates: any[]) => {
        savedTemplates = templates;
      },
      setDeviceDefinitionOverrides: (overrides: Record<string, any>) => {
        savedDefinitionOverrides = overrides;
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
    expect(savedTemplates[0]).toBe(previousTemplate);
    expect(savedTemplates[1]).toMatchObject({
      kind: "UserDevice",
      label: "测试元件",
      categoryLibrary: "用户类别库",
      params: { component_type: "UserLibrary" }
    });
    expect(scope.setCustomComponentTreeSelection).toHaveBeenCalledWith({
      kind: "component",
      categoryLibraryName: "用户类别库",
      section: "UserLibrary",
      templateKind: "UserDevice"
    });
    expect(scope.setCustomDeviceDefinitionMode).toHaveBeenCalledWith("edit");
    expect(scope.setEditingCustomDeviceKind).toHaveBeenCalledWith("UserDevice");
    expect(scope.nextCustomTemplateKind).not.toHaveBeenCalled();
  });

  test("saves a derived custom device inside the base component library without creating a component library", () => {
    let customDeviceDraft = {
      categoryLibraryName: "交流设备",
      componentLibrary: "ACGenerator",
      componentName: "用户风电机组",
      componentKind: "custom-user-wind-generator",
      isDerivedComponentLibrary: true,
      derivedFromComponentLibrary: "ACGenerator",
      derivedComponentLibrary: "UserWindGen",
      derivedComponentLibraryLabel: "",
      backgroundImage: "",
      backgroundImageAssetId: "",
      backgroundImageCleared: "",
      size: { width: 104, height: 64 },
      allowResizeTransform: "1",
      terminalCount: 2,
      terminalTypes: ["dc", "dc"],
      terminalLabels: ["过期端1", "过期端2"],
      terminalAnchors: [{ x: -0.5, y: 0 }],
      terminalRoles: ["single-load", "single-load"],
      terminalAssociations: ["dc-load", "dc-load"],
      isContainer: true,
      params: [
        { id: "base-idx", cnName: "序号", enName: "idx", valueType: "integer", typicalValue: "" },
        { id: "base-status", cnName: "运行状态", enName: "status", valueType: "numberEnum", typicalValue: "1" },
        { id: "base-rated", cnName: "额定功率", enName: "ratedPower", valueType: "string", typicalValue: "50 MW" },
        { id: "derived-capacity", cnName: "装机容量", enName: "installedCapacity", valueType: "string", typicalValue: "120 MW" }
      ],
      stateDefinitions: [],
      error: ""
    };
    let savedTemplates: any[] = [];
    let savedDefinitionOverrides: Record<string, any> = {};
    const setCustomComponentLibraries = vi.fn();
    const customDefaultDefinitions = vi.fn((_terminalTypes: any[], options?: { isDerivedComponentLibrary?: boolean }) =>
      options?.isDerivedComponentLibrary
        ? []
        : [{ cnName: "序号", enName: "idx", valueType: "integer", typicalValue: "", readonly: true }]
    );
    const scope = {
      ALLOW_RESIZE_TRANSFORM_PARAM: "allowResizeTransform",
      TERMINAL_TYPE_LIBRARY_LABELS: { ac: "交流" },
      closeCustomDeviceDialog: vi.fn(),
      customComponentLibraries: [{
        name: "UserWindGen",
        categoryLibraryName: "交流设备",
        label: "用户风电",
        isDerivedComponentLibrary: true,
        derivedFromComponentLibrary: "ACGenerator",
        terminalCount: 1,
        terminalTypes: ["ac"],
      terminalLabels: ["交流发电机端"],
      terminalRoles: ["single-source"],
      terminalAssociations: ["ac-generator"],
      isContainerComponentLibrary: false
      }],
      customDefaultDefinitions,
      get customDeviceDraft() {
        return customDeviceDraft;
      },
      customDeviceGeneratedDefaultImageCandidates: () => [],
      customDeviceImageWithTerminalConnectors: (image: string) => image,
      customDeviceTemplates: [],
      customDeviceTerminalAnchors: [{ x: -0.5, y: 0 }],
      defaultComponentLibraryForCategoryLibrary: () => "ACGenerator",
      editingCustomDeviceKind: "",
      ensureCustomComponentTreeExpanded: vi.fn(),
      generateCustomDeviceImage: () => "data:image/svg+xml,%3Csvg%2F%3E",
      hasOverlappingCustomDeviceTerminalAnchors: () => false,
      isBuiltInComponentLibrary: () => false,
      isReservedDeviceDefinitionParamName: () => false,
      isDerivedComponentBaseParamName: (name: unknown) =>
        ["idx", "name", "status", "run_stat", "node", "ratedPower"].includes(String(name ?? "").trim()),
      isValidComponentLibraryName: (name: string) => /^[A-Za-z][A-Za-z0-9_-]*$/.test(name),
      measurementConfig: { measurementTypes: [], deviceProfiles: [] },
      measurementConfigDraft: undefined,
      measurementConfigDraftRef: undefined,
      nextCustomTemplateKind: vi.fn(() => "custom-user-wind-generator"),
      normalizeCategoryLibraryName: (name: string) => name.trim(),
      normalizeComponentLibraryName: (name: string) => name.trim(),
      normalizeContainerTerminalAssociations: (_terminalTypes: any, values: any[]) => values,
      normalizeCustomComponentLibraries: (value: unknown) => value as any[],
      normalizeDefinitionRowEnumFields: (row: any) => row,
      persistDeviceLibraryChange: vi.fn(),
      requireEditMode: () => true,
      setCustomComponentLibraries,
      setCustomComponentTreeSelection: vi.fn(),
      setCustomDeviceDraft: (updater: any) => {
        customDeviceDraft = typeof updater === "function" ? updater(customDeviceDraft) : updater;
      },
      setCustomDeviceDraftCleanBaseline: vi.fn(),
      setCustomDeviceSaveMessage: vi.fn(),
      setCustomDeviceSaveToast: vi.fn(),
      customDeviceSaveToastTimerRef: { current: null },
      setCustomDeviceTemplates: (templates: any[]) => {
        savedTemplates = templates;
      },
      setDeviceDefinitionOverrides: (overrides: Record<string, any>) => {
        savedDefinitionOverrides = overrides;
      },
      setEditingCustomDeviceKind: vi.fn(),
      setExpandedCategoryLibraries: vi.fn(),
      showGlobalMessage: vi.fn(),
      syncExistingNodesWithTemplateDefinitions: vi.fn(),
      syncInheritedCustomDeviceStateVisuals: (states: any[]) => states,
      validateContainerTerminalAssociations: () => ({ valid: true }),
      validateStateDraftRows: (states: any[]) => ({ states, error: "" }),
      writeOperationLog: vi.fn()
    };

    const saved = createSaveCustomDeviceTemplate(scope)();

    expect(saved).toBe(true);
    expect(customDefaultDefinitions).toHaveBeenCalledWith(["ac"], expect.objectContaining({
      isDerivedComponentLibrary: true
    }));
    expect(savedTemplates[0]).toMatchObject({
      kind: "custom-user-wind-generator",
      label: "用户风电机组",
      componentClass: "UserWindGen",
      categoryLibrary: "交流设备",
      terminalCount: 1,
      terminalTypes: ["ac"],
      terminalLabels: ["交流发电机端"],
      terminalRoles: ["single-source"],
      allowResizeTransform: true,
      isContainer: false,
      isDerivedComponentLibrary: true,
      derivedFromComponentLibrary: "ACGenerator",
      derivedComponentLibrary: "UserWindGen",
      params: {
        component_type: "ACGenerator",
        derived_from_component_type: "ACGenerator",
        derived_component_type: "UserWindGen"
      }
    });
    expect(savedTemplates[0].derivedComponentLibraryLabel).toBe("用户风电");
    expect(savedTemplates[0].params.derived_component_library_label).toBe("用户风电");
    expect(savedTemplates[0].parameterDefinitions).toBeUndefined();
    expect(savedTemplates[0].measurementDefinitions).toBeUndefined();
    const sharedOverride = Object.values(savedDefinitionOverrides).find((override: any) =>
      String(override.kind).startsWith("shared:")
    ) as any;
    expect(sharedOverride.parameterDefinitions.map((row: any) => row.enName)).toEqual(["installedCapacity"]);
    expect(setCustomComponentLibraries).not.toHaveBeenCalled();
    expect(scope.ensureCustomComponentTreeExpanded).toHaveBeenCalledWith("交流设备", "UserWindGen");
    expect(scope.setCustomComponentTreeSelection).toHaveBeenCalledWith({
      kind: "component",
      categoryLibraryName: "交流设备",
      section: "UserWindGen",
      templateKind: "custom-user-wind-generator"
    });
  });

  test("validates blank newly added params in a derived custom device instead of filtering them out", () => {
    let customDeviceDraft = {
      categoryLibraryName: "交流设备",
      componentLibrary: "ACGenerator",
      componentName: "用户风电机组",
      componentKind: "custom-user-wind-generator",
      isDerivedComponentLibrary: true,
      derivedFromComponentLibrary: "ACGenerator",
      derivedComponentLibrary: "UserWindGen",
      derivedComponentLibraryLabel: "用户风电",
      backgroundImage: "",
      backgroundImageAssetId: "",
      backgroundImageCleared: "",
      size: { width: 104, height: 64 },
      allowResizeTransform: "0",
      terminalCount: 1,
      terminalTypes: ["ac"],
      terminalLabels: ["交流发电机端"],
      terminalAnchors: [{ x: -0.5, y: 0 }],
      terminalRoles: ["single-source"],
      terminalAssociations: ["ac-generator"],
      isContainer: false,
      params: [
        { id: "new-blank", cnName: "", enName: "", valueType: "string", typicalValue: "" }
      ],
      stateDefinitions: [],
      error: ""
    };
    let savedTemplates: any[] = [];
    const scope = {
      ALLOW_RESIZE_TRANSFORM_PARAM: "allowResizeTransform",
      TERMINAL_TYPE_LIBRARY_LABELS: { ac: "交流" },
      closeCustomDeviceDialog: vi.fn(),
      customComponentLibraries: [{
        name: "UserWindGen",
        categoryLibraryName: "交流设备",
        label: "用户风电",
        isDerivedComponentLibrary: true,
        derivedFromComponentLibrary: "ACGenerator",
        terminalCount: 1,
        terminalTypes: ["ac"],
        terminalLabels: ["交流发电机端"],
        terminalRoles: ["single-source"],
        terminalAssociations: ["ac-generator"],
        isContainerComponentLibrary: false,
        allowResizeTransform: false
      }],
      customDefaultDefinitions: vi.fn(() => []),
      get customDeviceDraft() {
        return customDeviceDraft;
      },
      customDeviceGeneratedDefaultImageCandidates: () => [],
      customDeviceImageWithTerminalConnectors: (image: string) => image,
      customDeviceTemplates: [],
      customDeviceTerminalAnchors: [{ x: -0.5, y: 0 }],
      defaultComponentLibraryForCategoryLibrary: () => "ACGenerator",
      editingCustomDeviceKind: "",
      ensureCustomComponentTreeExpanded: vi.fn(),
      generateCustomDeviceImage: () => "data:image/svg+xml,%3Csvg%2F%3E",
      hasOverlappingCustomDeviceTerminalAnchors: () => false,
      isBuiltInComponentLibrary: () => false,
      isReservedDeviceDefinitionParamName: () => false,
      isDerivedComponentBaseParamName: (name: unknown) =>
        !String(name ?? "").trim() ||
        ["idx", "name", "status", "run_stat", "node", "ratedPower"].includes(String(name ?? "").trim()),
      isValidComponentLibraryName: (name: string) => /^[A-Za-z][A-Za-z0-9_-]*$/.test(name),
      measurementConfig: { measurementTypes: [], deviceProfiles: [] },
      measurementConfigDraft: undefined,
      measurementConfigDraftRef: undefined,
      nextCustomTemplateKind: vi.fn(() => "custom-user-wind-generator"),
      normalizeCategoryLibraryName: (name: string) => name.trim(),
      normalizeComponentLibraryName: (name: string) => name.trim(),
      normalizeContainerTerminalAssociations: (_terminalTypes: any, values: any[]) => values,
      normalizeCustomComponentLibraries: (value: unknown) => value as any[],
      normalizeDefinitionRowEnumFields: (row: any) => row,
      persistDeviceLibraryChange: vi.fn(),
      requireEditMode: () => true,
      setCustomComponentLibraries: vi.fn(),
      setCustomComponentTreeSelection: vi.fn(),
      setCustomDeviceDraft: (updater: any) => {
        customDeviceDraft = typeof updater === "function" ? updater(customDeviceDraft) : updater;
      },
      setCustomDeviceDraftCleanBaseline: vi.fn(),
      setCustomDeviceSaveMessage: vi.fn(),
      setCustomDeviceSaveToast: vi.fn(),
      customDeviceSaveToastTimerRef: { current: null },
      setCustomDeviceTemplates: (templates: any[]) => {
        savedTemplates = templates;
      },
      setEditingCustomDeviceKind: vi.fn(),
      setExpandedCategoryLibraries: vi.fn(),
      showGlobalMessage: vi.fn(),
      syncExistingNodesWithTemplateDefinitions: vi.fn(),
      syncInheritedCustomDeviceStateVisuals: (states: any[]) => states,
      validateContainerTerminalAssociations: () => ({ valid: true }),
      validateStateDraftRows: (states: any[]) => ({ states, error: "" }),
      writeOperationLog: vi.fn()
    };

    const saved = createSaveCustomDeviceTemplate(scope)();

    expect(saved).toBe(false);
    expect(customDeviceDraft.error).toContain("中文名称不能为空");
    expect(customDeviceDraft.error).toContain("英文名称不能为空");
    expect(savedTemplates).toEqual([]);
  });

  const createBuiltinDeviceDefinitionSaveHarness = ({
    template,
    draftDefinitions,
    existingOverride,
    existingOverrides,
    initialDraft,
    createDraftFromTemplate,
    defaultDefinitionsFactory = () => [],
    normalizeDefinition = (row: any) => row,
    normalizeAssociations = (_terminalTypes: any, values: any[]) => values,
    derivedBasePredicate = () => false,
    reservedPredicate = () => false,
    baseTemplates
  }: {
    template: any;
    draftDefinitions: any[];
    existingOverride?: any;
    existingOverrides?: Record<string, any>;
    initialDraft?: any;
    createDraftFromTemplate?: (item: any) => any;
    defaultDefinitionsFactory?: (...args: any[]) => any[];
    normalizeDefinition?: (row: any) => any;
    normalizeAssociations?: (_terminalTypes: any, values: any[], count: number) => any[];
    derivedBasePredicate?: (fieldName: unknown, baseComponentLibrary?: string) => boolean;
    reservedPredicate?: (fieldName: string) => boolean;
    baseTemplates?: any[];
  }) => {
    let customDeviceDraft = initialDraft ? {
      ...structuredClone(initialDraft),
      size: { width: template.size.width + 8, height: template.size.height + 4 },
      params: draftDefinitions.map((definition, index) => ({ ...definition, id: definition.id ?? `draft-${index}` }))
    } : {
      componentLibrary: template.params?.component_type ?? "ACGenerator",
      componentName: template.label,
      isDerivedComponentLibrary: false,
      derivedFromComponentLibrary: "",
      derivedComponentLibrary: "",
      derivedComponentLibraryLabel: "",
      backgroundImage: "",
      backgroundImageAssetId: "",
      backgroundImageCleared: "",
      backgroundImageFit: "cover",
      size: { width: template.size.width + 8, height: template.size.height + 4 },
      allowResizeTransform: "0",
      terminalCount: template.terminalCount,
      terminalTypes: template.terminalTypes ?? [template.terminalType],
      terminalLabels: template.terminalLabels ?? ["交流端"],
      terminalRoles: template.terminalRoles ?? ["single-source"],
      terminalAssociations: template.terminalAssociations ?? ["ac-generator"],
      isContainer: false,
      params: draftDefinitions.map((definition, index) => ({ ...definition, id: `draft-${index}` })),
      measurementDefinitions: [],
      stateDefinitions: [],
      error: ""
    };
    let savedOverrides: any = {};
    const deviceDefinitionOverrides = existingOverrides ?? (existingOverride
      ? { [template.kind]: existingOverride }
      : {});
    const scope = {
      ALLOW_RESIZE_TRANSFORM_PARAM: "allowResizeTransform",
      TERMINAL_TYPE_LIBRARY_LABELS: { ac: "交流" },
      baseLibraryTemplates: baseTemplates ?? [template],
      closeCustomDeviceDialog: vi.fn(),
      createCustomDeviceDraftFromTemplate: createDraftFromTemplate ?? ((item: any) => ({
        ...customDeviceDraft,
        componentName: item.label,
        size: { ...item.size },
        params: (item.parameterDefinitions ?? []).map((definition: any, index: number) => ({
          ...definition,
          id: `base-${index}`
        }))
      })),
      customDefaultDefinitions: vi.fn(defaultDefinitionsFactory),
      get customDeviceDraft() {
        return customDeviceDraft;
      },
      customDeviceGeneratedDefaultImageCandidates: () => [],
      customDeviceImageWithTerminalConnectors: (image: string) => image,
      customDeviceTerminalAnchors: customDeviceDraft.terminalAnchors ?? template.terminalAnchors ?? [{ x: -0.5, y: 0 }],
      deviceDefinitionOverrides,
      deviceDefinitionOverrideForTemplate: (_template: any, overrides: any) => overrides[_template.kind],
      getTemplateParameterDefinitions: (item: any) => item.parameterDefinitions ?? [],
      hasOverlappingCustomDeviceTerminalAnchors: () => false,
      isDerivedComponentBaseParamName: derivedBasePredicate,
      isReservedDeviceDefinitionParamName: reservedPredicate,
      isValidComponentLibraryName: (name: string) => /^[A-Za-z][A-Za-z0-9_-]*$/.test(name),
      libraryTemplates: [template],
      measurementConfig: {
        measurementTypes: Array.from(new Set(
          (customDeviceDraft.measurementDefinitions ?? []).map((item: any) => item.measurementTypeId)
        )).map((id) => ({ id })),
        deviceProfiles: []
      },
      measurementConfigDraft: undefined,
      measurementConfigDraftRef: undefined,
      normalizeComponentLibraryName: (name: string) => name.trim(),
      normalizeContainerTerminalAssociations: normalizeAssociations,
      normalizeDefinitionRowEnumFields: normalizeDefinition,
      persistDeviceLibraryChange: vi.fn(),
      requireEditMode: () => true,
      setCustomDeviceDraft: (updater: any) => {
        customDeviceDraft = typeof updater === "function" ? updater(customDeviceDraft) : updater;
      },
      setCustomDeviceDraftCleanBaseline: vi.fn(),
      setCustomDeviceSaveMessage: vi.fn(),
      setCustomDeviceSaveToast: vi.fn(),
      customDeviceSaveToastTimerRef: { current: null },
      setDeviceDefinitionOverrides: (next: any) => {
        savedOverrides = next;
      },
      showGlobalMessage: vi.fn(),
      syncExistingNodesWithTemplateDefinitions: vi.fn(),
      syncInheritedCustomDeviceStateVisuals: (states: any[]) => states,
      validateContainerTerminalAssociations: () => ({ valid: true }),
      validateStateDraftRows: (states: any[]) => ({ states, error: "" }),
      writeOperationLog: vi.fn()
    };
    return {
      save: () => createSaveBuiltinDeviceDefinitionFromCustomDraft(scope)(template),
      savedOverride: () => savedOverrides[template.kind],
      savedDefinitionOverride: () => {
        const baseTemplate = (baseTemplates ?? [template]).find((candidate) => candidate.kind === template.kind) ?? template;
        return savedOverrides[deviceDefinitionSharedKeyForTemplate(baseTemplate)];
      },
      savedOverrides: () => savedOverrides,
      draft: () => customDeviceDraft
    };
  };

  test("does not persist unchanged built-in parameter definitions for a visual-only edit", () => {
    const defaultDefinition = {
      cnName: "额定功率",
      enName: "ratedPower",
      valueType: "string",
      typicalValue: "5 MW",
      exportEnabled: true,
      exportName: "rated_power"
    };
    const template = {
      kind: "ac-source",
      label: "交流电源",
      categoryLibrary: "交流设备",
      params: { component_type: "ACGenerator" },
      size: { width: 84, height: 56 },
      terminalType: "ac",
      terminalCount: 1,
      terminalTypes: ["ac"],
      terminalLabels: ["交流端"],
      terminalAnchors: [{ x: -0.5, y: 0 }],
      parameterDefinitions: [defaultDefinition]
    };
    const harness = createBuiltinDeviceDefinitionSaveHarness({
      template,
      draftDefinitions: [defaultDefinition]
    });

    expect(harness.save()).toBe(true);
    expect(harness.savedOverride()).toMatchObject({
      kind: "ac-source",
      size: { width: 92, height: 60 }
    });
    expect(harness.savedOverride()).not.toHaveProperty("parameterDefinitions");
  });

  test("omits inferred AC source defaults when the real built-in draft only changes visually", () => {
    const template = DEVICE_LIBRARY.find((item) => item.kind === "ac-source");
    expect(template).toBeDefined();
    const initialDraft = createCustomDeviceDraftFromTemplate(template!);
    const harness = createBuiltinDeviceDefinitionSaveHarness({
      template: template!,
      draftDefinitions: initialDraft.params,
      initialDraft,
      createDraftFromTemplate: createCustomDeviceDraftFromTemplate,
      defaultDefinitionsFactory: customDefaultDefinitions,
      normalizeDefinition: normalizeDefinitionRowEnumFields,
      normalizeAssociations: normalizeContainerTerminalAssociations,
      derivedBasePredicate: isDerivedComponentBaseParamName,
      reservedPredicate: isReservedDeviceDefinitionParamName
    });

    expect(harness.save()).toBe(true);
    expect(harness.savedOverride()).not.toHaveProperty("parameterDefinitions");
  });

  test("keeps genuine built-in parameter changes when saving a definition", () => {
    const defaultDefinition = {
      cnName: "额定功率",
      enName: "ratedPower",
      valueType: "string",
      typicalValue: "5 MW",
      exportEnabled: true,
      exportName: "rated_power"
    };
    const template = {
      kind: "ac-source",
      label: "交流电源",
      categoryLibrary: "交流设备",
      params: { component_type: "ACGenerator" },
      size: { width: 84, height: 56 },
      terminalType: "ac",
      terminalCount: 1,
      terminalTypes: ["ac"],
      terminalLabels: ["交流端"],
      terminalAnchors: [{ x: -0.5, y: 0 }],
      parameterDefinitions: [defaultDefinition]
    };
    const changedDefinition = { ...defaultDefinition, typicalValue: "8 MW" };
    const harness = createBuiltinDeviceDefinitionSaveHarness({
      template,
      draftDefinitions: [changedDefinition]
    });

    expect(harness.save()).toBe(true);
    expect(harness.savedDefinitionOverride().parameterDefinitions).toEqual([changedDefinition]);
  });

  test("persists reordered built-in parameters in the draft row order", () => {
    const defaultDefinitions = [
      {
        cnName: "首端有功值",
        enName: "i_p",
        valueType: "float",
        typicalValue: "0",
        readonly: false
      },
      {
        cnName: "首端节点",
        enName: "i_node",
        valueType: "integer",
        typicalValue: "",
        readonly: true
      },
      {
        cnName: "末端节点",
        enName: "j_node",
        valueType: "integer",
        typicalValue: "",
        readonly: true
      }
    ];
    const template = {
      kind: "dcdc-converter",
      label: "DCDC变流器",
      categoryLibrary: "直流设备",
      params: { component_type: "DCDCConverter" },
      size: { width: 104, height: 64 },
      terminalType: "dc",
      terminalCount: 2,
      terminalTypes: ["dc", "dc"],
      terminalLabels: ["直流端1", "直流端2"],
      terminalAnchors: [{ x: -0.5, y: 0 }, { x: 0.5, y: 0 }],
      parameterDefinitions: defaultDefinitions
    };
    const reorderedDefinitions = [
      defaultDefinitions[1],
      defaultDefinitions[2],
      defaultDefinitions[0]
    ];
    const harness = createBuiltinDeviceDefinitionSaveHarness({
      template,
      draftDefinitions: reorderedDefinitions,
      defaultDefinitionsFactory: () => defaultDefinitions
    });

    expect(harness.save()).toBe(true);
    expect(harness.savedDefinitionOverride().parameterDefinitions.map((definition: any) => definition.enName)).toEqual([
      "i_node",
      "j_node",
      "i_p"
    ]);
  });

  test("persists built-in measurement definitions from the draft instead of the global profile", () => {
    const parameterDefinitions = [
      { cnName: "首端有功值", enName: "i_p", valueType: "float", typicalValue: "0" },
      { cnName: "首端电压值", enName: "i_v", valueType: "float", typicalValue: "0" },
      { cnName: "首端电流值", enName: "i_i", valueType: "float", typicalValue: "0" }
    ];
    const measurementDefinitions = [
      { measurementTypeId: "activePower", associatedField: "i_p" },
      { measurementTypeId: "voltage", associatedField: "i_v" },
      { measurementTypeId: "current", associatedField: "i_i" }
    ];
    const template = {
      kind: "dcdc-converter",
      label: "DCDC变流器",
      categoryLibrary: "直流设备",
      params: { component_type: "DCDCConverter" },
      size: { width: 104, height: 64 },
      terminalType: "dc",
      terminalCount: 2,
      terminalTypes: ["dc", "dc"],
      terminalLabels: ["直流端1", "直流端2"],
      terminalAnchors: [{ x: -0.5, y: 0 }, { x: 0.5, y: 0 }],
      parameterDefinitions,
      measurementDefinitions
    };
    const initialDraft = createCustomDeviceDraftFromTemplate(template as any);
    const harness = createBuiltinDeviceDefinitionSaveHarness({
      template,
      draftDefinitions: initialDraft.params,
      initialDraft,
      createDraftFromTemplate: createCustomDeviceDraftFromTemplate,
      defaultDefinitionsFactory: () => parameterDefinitions
    });

    expect(harness.save(), harness.draft().error).toBe(true);
    expect(harness.savedDefinitionOverride().measurementDefinitions).toEqual(measurementDefinitions);
  });

  test("round-trips reordered DCDC parameters and shared measurements through persistence reload", () => {
    const horizontal = DEVICE_LIBRARY.find((item) => item.kind === "dcdc-converter")!;
    const vertical = DEVICE_LIBRARY.find((item) => item.kind === "dcdc-converter-vertical")!;
    const sharedKey = deviceDefinitionSharedKeyForTemplate(horizontal);
    const originalDefinitions = getTemplateParameterDefinitions(horizontal);
    const contaminatedDefinitions = originalDefinitions.map((definition) => {
      if (definition.enName === "dev_type") {
        return { ...definition, typicalValue: "dcdc-converter" };
      }
      return definition;
    });
    const measurementDefinitions = [
      { measurementTypeId: "current" },
      { measurementTypeId: "activePower" }
    ];
    const effectiveHorizontal = applyDeviceTemplateDefinitionOverride(horizontal, {
      kind: horizontal.kind,
      parameterDefinitions: contaminatedDefinitions,
      measurementDefinitions
    });
    expect(effectiveHorizontal.params?.dev_type).toBe("dcdc-converter");
    expect(deviceDefinitionSharedKeyForTemplate(effectiveHorizontal)).toBe("shared:DCDCConverter::dcdc-converter");
    const initialDraft = createCustomDeviceDraftFromTemplate(effectiveHorizontal);
    const editedFieldName = initialDraft.params.find((definition) => definition.enName === "i_p")?.enName ?? initialDraft.params[0].enName;
    const editedFieldCnName = `${initialDraft.params.find((definition) => definition.enName === editedFieldName)?.cnName ?? editedFieldName}（已修改）`;
    const editedDraftParameters = initialDraft.params.map((definition) => (
      definition.enName === editedFieldName
        ? { ...definition, cnName: editedFieldCnName }
        : definition
    ));
    const reorderedDefinitions = [
      editedDraftParameters[0],
      editedDraftParameters[1],
      editedDraftParameters[2],
      editedDraftParameters[3],
      editedDraftParameters[5],
      editedDraftParameters[4],
      ...editedDraftParameters.slice(6)
    ];
    const harness = createBuiltinDeviceDefinitionSaveHarness({
      template: effectiveHorizontal,
      draftDefinitions: reorderedDefinitions,
      initialDraft,
      createDraftFromTemplate: createCustomDeviceDraftFromTemplate,
      defaultDefinitionsFactory: (terminalTypes: any, options: any) => customDefaultDefinitions(terminalTypes, options),
      normalizeDefinition: normalizeDefinitionRowEnumFields,
      normalizeAssociations: normalizeContainerTerminalAssociations,
      reservedPredicate: isReservedDeviceDefinitionParamName,
      baseTemplates: DEVICE_LIBRARY,
      existingOverrides: {
        "shared:DCDCConverter::dcdc-converter": {
          kind: "shared:DCDCConverter::dcdc-converter",
          parameterDefinitions: contaminatedDefinitions,
          measurementDefinitions
        }
      }
    });

    expect(harness.save(), harness.draft().error).toBe(true);
    const savedNames = harness.savedDefinitionOverride().parameterDefinitions.map((definition: any) => definition.enName);
    const frontendPayload = normalizeDeviceLibraryPersistencePayload({
      deviceDefinitionOverrides: harness.savedOverrides()
    });
    const refreshedOverrides = normalizeDeviceLibraryPersistencePayload(
      JSON.parse(JSON.stringify(frontendPayload))
    ).deviceDefinitionOverrides;
    const reopen = (template: any) => createCustomDeviceDraftFromTemplate(
      applyDeviceTemplateDefinitionOverride(
        template,
        deviceDefinitionOverrideForTemplate(template, refreshedOverrides, DEVICE_LIBRARY)
      )
    );
    const horizontalDraft = reopen(horizontal);
    const verticalDraft = reopen(vertical);

    expect(savedNames.indexOf(reorderedDefinitions[4].enName)).toBeLessThan(savedNames.indexOf(reorderedDefinitions[5].enName));
    expect(refreshedOverrides[sharedKey].parameterDefinitions.map((definition: { enName: string }) => definition.enName)).toEqual(savedNames);
    expect(horizontalDraft.params.map((definition) => definition.enName)).toEqual(savedNames);
    expect(verticalDraft.params.map((definition) => definition.enName)).toEqual(savedNames);
    expect(horizontalDraft.measurementDefinitions).toEqual(measurementDefinitions);
    expect(verticalDraft.measurementDefinitions).toEqual(measurementDefinitions);
    expect(horizontalDraft.params.find((definition) => definition.enName === editedFieldName)?.cnName).toBe(editedFieldCnName);
    expect(verticalDraft.params.find((definition) => definition.enName === editedFieldName)?.cnName).toBe(editedFieldCnName);
    expect(refreshedOverrides["shared:DCDCConverter::dcdc-converter"]).toBeUndefined();
    expect(refreshedOverrides[horizontal.kind].parameterDefinitions).toBeUndefined();
    expect(refreshedOverrides[horizontal.kind].measurementDefinitions).toBeUndefined();
    expect(refreshedOverrides[vertical.kind]?.parameterDefinitions).toBeUndefined();
    expect(refreshedOverrides[vertical.kind]?.measurementDefinitions).toBeUndefined();
  });

  test("removes legacy copied parameter definitions after they are restored to built-in defaults", () => {
    const defaultDefinition = {
      cnName: "额定功率",
      enName: "ratedPower",
      valueType: "string",
      typicalValue: "5 MW",
      exportEnabled: true,
      exportName: "rated_power"
    };
    const template = {
      kind: "ac-source",
      label: "交流电源",
      categoryLibrary: "交流设备",
      params: { component_type: "ACGenerator" },
      size: { width: 84, height: 56 },
      terminalType: "ac",
      terminalCount: 1,
      terminalTypes: ["ac"],
      terminalLabels: ["交流端"],
      terminalAnchors: [{ x: -0.5, y: 0 }],
      parameterDefinitions: [defaultDefinition]
    };
    const harness = createBuiltinDeviceDefinitionSaveHarness({
      template,
      draftDefinitions: [defaultDefinition],
      existingOverride: {
        kind: "ac-source",
        parameterDefinitions: [defaultDefinition]
      }
    });

    expect(harness.save()).toBe(true);
    expect(harness.savedOverride()).not.toHaveProperty("parameterDefinitions");
  });

  test("saves derived settings when editing a built-in device definition from the custom dialog", () => {
    const template = {
      kind: "ac-diesel-source",
      label: "柴油发电机",
      categoryLibrary: "交流设备",
      params: { component_type: "ACGenerator", ratedPower: "5 MW" },
      size: { width: 92, height: 58 },
      terminalType: "ac",
      terminalCount: 1,
      terminalTypes: ["ac"],
      terminalLabels: ["交流发电机端"],
      terminalAnchors: [{ x: -0.5, y: 0 }],
      parameterDefinitions: []
    };
    let customDeviceDraft = {
      componentLibrary: "ACGenerator",
      componentName: "用户柴油发电机",
      isDerivedComponentLibrary: true,
      derivedFromComponentLibrary: "ACGenerator",
      derivedComponentLibrary: "UserDieselGen",
      derivedComponentLibraryLabel: "",
      backgroundImage: "",
      backgroundImageAssetId: "",
      backgroundImageCleared: "",
      backgroundImageFit: "cover",
      size: { width: 92, height: 58 },
      allowResizeTransform: "0",
      terminalCount: 1,
      terminalTypes: ["ac"],
      terminalLabels: ["交流发电机端"],
      terminalRoles: ["single-source"],
      terminalAssociations: ["ac-generator"],
      isContainer: false,
      params: [],
      stateDefinitions: [],
      error: ""
    };
    let savedOverrides: any = {};
    const persistDeviceLibraryChange = vi.fn();
    const scope = {
      ALLOW_RESIZE_TRANSFORM_PARAM: "allowResizeTransform",
      TERMINAL_TYPE_LIBRARY_LABELS: { ac: "交流" },
      closeCustomDeviceDialog: vi.fn(),
      customDefaultDefinitions: vi.fn(() => []),
      get customDeviceDraft() {
        return customDeviceDraft;
      },
      customDeviceGeneratedDefaultImageCandidates: () => [],
      customDeviceImageWithTerminalConnectors: (image: string) => image,
      customDeviceTerminalAnchors: [{ x: -0.5, y: 0 }],
      deviceDefinitionOverrides: {},
      deviceDefinitionOverrideForTemplate: (_template: any, overrides: any) => overrides[_template.kind],
      getTemplateParameterDefinitions: (item: any) => item.parameterDefinitions ?? [],
      hasOverlappingCustomDeviceTerminalAnchors: () => false,
      isDerivedComponentBaseParamName: () => false,
      isReservedDeviceDefinitionParamName: () => false,
      isValidComponentLibraryName: (name: string) => /^[A-Za-z][A-Za-z0-9_-]*$/.test(name),
      libraryTemplates: [template],
      measurementConfig: { measurementTypes: [], deviceProfiles: [] },
      measurementConfigDraft: undefined,
      measurementConfigDraftRef: undefined,
      normalizeComponentLibraryName: (name: string) => name.trim(),
      normalizeContainerTerminalAssociations: (_terminalTypes: any, values: any[]) => values,
      normalizeDefinitionRowEnumFields: (row: any) => row,
      persistDeviceLibraryChange,
      requireEditMode: () => true,
      setCustomDeviceDraft: (updater: any) => {
        customDeviceDraft = typeof updater === "function" ? updater(customDeviceDraft) : updater;
      },
      setCustomDeviceDraftCleanBaseline: vi.fn(),
      setCustomDeviceSaveMessage: vi.fn(),
      setCustomDeviceSaveToast: vi.fn(),
      customDeviceSaveToastTimerRef: { current: null },
      setDeviceDefinitionOverrides: (next: any) => {
        savedOverrides = next;
      },
      showGlobalMessage: vi.fn(),
      syncExistingNodesWithTemplateDefinitions: vi.fn(),
      syncInheritedCustomDeviceStateVisuals: (states: any[]) => states,
      validateContainerTerminalAssociations: () => ({ valid: true }),
      validateStateDraftRows: (states: any[]) => ({ states, error: "" }),
      writeOperationLog: vi.fn()
    };

    const saved = createSaveBuiltinDeviceDefinitionFromCustomDraft(scope)(template as any);

    expect(saved).toBe(true);
    expect(savedOverrides["ac-diesel-source"]).toMatchObject({
      kind: "ac-diesel-source",
      label: "用户柴油发电机",
      isDerivedComponentLibrary: true,
      derivedFromComponentLibrary: "ACGenerator",
      derivedComponentLibrary: "UserDieselGen"
    });
    expect(savedOverrides[deviceDefinitionSharedKeyForTemplate(template as any)]).toMatchObject({
      params: {
        component_type: "ACGenerator",
        derived_from_component_type: "ACGenerator",
        derived_component_type: "UserDieselGen",
        is_derived_component_library: "1"
      }
    });
    expect(savedOverrides["ac-diesel-source"]).not.toHaveProperty("derivedComponentLibraryLabel");
    expect(savedOverrides["ac-diesel-source"].params).not.toHaveProperty("derived_component_library_label");
    expect(applyDeviceTemplateDefinitionOverride(template as any, savedOverrides["ac-diesel-source"]).label)
      .toBe("用户柴油发电机");
    expect(customDeviceDraft).toMatchObject({
      isDerivedComponentLibrary: true,
      derivedFromComponentLibrary: "ACGenerator",
      derivedComponentLibrary: "UserDieselGen",
      derivedComponentLibraryLabel: ""
    });
    expect(persistDeviceLibraryChange).toHaveBeenCalledWith(
      { deviceDefinitionOverrides: savedOverrides },
      expect.objectContaining({ success: expect.stringContaining("元件定义已保存到后台") })
    );
  });

  test("saves turning off derived settings for default-derived built-in device definitions", () => {
    const template = {
      kind: "ac-wind-source",
      label: "交流风力发电机",
      categoryLibrary: "交流设备",
      params: {
        component_type: "ACGenerator",
        sourceType: "风力",
        ratedPower: "50 MW",
        ratedVoltage: "35 kV"
      },
      size: { width: 92, height: 58 },
      terminalType: "ac",
      terminalCount: 1,
      terminalTypes: ["ac"],
      terminalLabels: ["交流发电机端"],
      terminalAnchors: [{ x: -0.5, y: 0 }],
      parameterDefinitions: []
    };
    let customDeviceDraft = {
      componentLibrary: "ACGenerator",
      componentName: "交流风力发电机",
      isDerivedComponentLibrary: false,
      derivedFromComponentLibrary: "",
      derivedComponentLibrary: "",
      derivedComponentLibraryLabel: "",
      backgroundImage: "",
      backgroundImageAssetId: "",
      backgroundImageCleared: "",
      backgroundImageFit: "cover",
      size: { width: 92, height: 58 },
      allowResizeTransform: "0",
      terminalCount: 1,
      terminalTypes: ["ac"],
      terminalLabels: ["交流发电机端"],
      terminalRoles: ["single-source"],
      terminalAssociations: ["ac-generator"],
      isContainer: false,
      params: [],
      stateDefinitions: [],
      error: ""
    };
    let savedOverrides: any = {};
    const scope = {
      ALLOW_RESIZE_TRANSFORM_PARAM: "allowResizeTransform",
      TERMINAL_TYPE_LIBRARY_LABELS: { ac: "交流" },
      closeCustomDeviceDialog: vi.fn(),
      customDefaultDefinitions: vi.fn(() => []),
      get customDeviceDraft() {
        return customDeviceDraft;
      },
      customDeviceGeneratedDefaultImageCandidates: () => [],
      customDeviceImageWithTerminalConnectors: (image: string) => image,
      customDeviceTerminalAnchors: [{ x: -0.5, y: 0 }],
      deviceDefinitionOverrides: {},
      deviceDefinitionOverrideForTemplate: (_template: any, overrides: any) => overrides[_template.kind],
      getTemplateParameterDefinitions: (item: any) => item.parameterDefinitions ?? [],
      hasOverlappingCustomDeviceTerminalAnchors: () => false,
      isDerivedComponentBaseParamName: () => false,
      isReservedDeviceDefinitionParamName: () => false,
      isValidComponentLibraryName: (name: string) => /^[A-Za-z][A-Za-z0-9_-]*$/.test(name),
      libraryTemplates: [template],
      measurementConfig: { measurementTypes: [], deviceProfiles: [] },
      measurementConfigDraft: undefined,
      measurementConfigDraftRef: undefined,
      normalizeComponentLibraryName: (name: string) => name.trim(),
      normalizeContainerTerminalAssociations: (_terminalTypes: any, values: any[]) => values,
      normalizeDefinitionRowEnumFields: (row: any) => row,
      persistDeviceLibraryChange: vi.fn(),
      requireEditMode: () => true,
      setCustomDeviceDraft: (updater: any) => {
        customDeviceDraft = typeof updater === "function" ? updater(customDeviceDraft) : updater;
      },
      setCustomDeviceDraftCleanBaseline: vi.fn(),
      setCustomDeviceSaveMessage: vi.fn(),
      setCustomDeviceSaveToast: vi.fn(),
      customDeviceSaveToastTimerRef: { current: null },
      setDeviceDefinitionOverrides: (next: any) => {
        savedOverrides = next;
      },
      showGlobalMessage: vi.fn(),
      syncExistingNodesWithTemplateDefinitions: vi.fn(),
      syncInheritedCustomDeviceStateVisuals: (states: any[]) => states,
      validateContainerTerminalAssociations: () => ({ valid: true }),
      validateStateDraftRows: (states: any[]) => ({ states, error: "" }),
      writeOperationLog: vi.fn()
    };

    const saved = createSaveBuiltinDeviceDefinitionFromCustomDraft(scope)(template as any);
    const reopenedTemplate = applyDeviceTemplateDefinitionOverride(template as any, savedOverrides["ac-wind-source"]);

    expect(saved).toBe(true);
    expect(savedOverrides["ac-wind-source"]).toMatchObject({
      kind: "ac-wind-source",
      isDerivedComponentLibrary: false,
      derivedFromComponentLibrary: "",
      derivedComponentLibrary: ""
    });
    expect(savedOverrides["ac-wind-source"]).not.toHaveProperty("derivedComponentLibraryLabel");
    expect(templateDerivedComponentLibraryInfo(reopenedTemplate)).toBeNull();
  });

  test("creating a category library does not create a duplicate component library", () => {
    let customCategoryLibraries: string[] = [];
    let customComponentLibraries: any[] = [];
    let customDeviceDraft = {
      categoryLibraryName: "交流设备",
      componentLibrary: "ACLine",
      componentName: "旧交流线路",
      componentKind: "ac-line",
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
    const persistDeviceLibraryChange = vi.fn();
    const setEditingCustomDeviceKind = vi.fn();
    const setSelectedDefinitionKind = vi.fn();

    const scope = {
      categoryLibraries: ["交流设备", "直流设备"],
      componentLibraryOptions: ["ACLine", "DCLine"],
      get customDeviceDraft() {
        return customDeviceDraft;
      },
      get customLibraryCreateDialog() {
        return customLibraryCreateDialog;
      },
      isValidComponentLibraryName: (name: string) => /^[A-Za-z][A-Za-z0-9_-]*$/.test(name),
      normalizeCategoryLibraryName: (name: string) => name.trim(),
      normalizeComponentLibraryName: (name: string) => name.trim(),
      normalizeCustomCategoryLibraries: (value: unknown) => Array.from(new Set((value as string[]).map((item) => item.trim()).filter(Boolean))),
      normalizeCustomComponentLibraries: (value: unknown) => value as any[],
      persistDeviceLibraryChange,
      requireEditMode: () => true,
      setCustomCategoryLibraries: (updater: any) => {
        customCategoryLibraries = typeof updater === "function" ? updater(customCategoryLibraries) : updater;
      },
      setCustomComponentLibraries: (updater: any) => {
        customComponentLibraries = typeof updater === "function" ? updater(customComponentLibraries) : updater;
      },
      setCustomComponentTreeSelection,
      setCustomDeviceDefinitionMode: vi.fn(),
      setCustomDeviceDialogView: vi.fn(),
      setCustomDeviceDraft: (updater: any) => {
        customDeviceDraft = typeof updater === "function" ? updater(customDeviceDraft) : updater;
      },
      setCustomDeviceDraftCleanBaseline: vi.fn(),
      setCustomDeviceSaveMessage: vi.fn(),
      setCustomDeviceStatePageId: vi.fn(),
      setCustomLibraryCreateDialog: (updater: any) => {
        customLibraryCreateDialog = typeof updater === "function" ? updater(customLibraryCreateDialog) : updater;
      },
      setEditingCustomDeviceKind,
      setSelectedDefinitionKind,
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
      componentName: "",
      componentKind: "",
      error: ""
    });
    expect(setEditingCustomDeviceKind).toHaveBeenCalledWith("");
    expect(setSelectedDefinitionKind).toHaveBeenCalledWith("");
    expect(persistDeviceLibraryChange).toHaveBeenCalledWith(
      { customCategoryLibraries: ["自定义地图按钮"] },
      expect.any(Object)
    );
  });

  test("creating a component library recovers inherited metadata when the base template was historically overridden", () => {
    let customComponentLibraries: any[] = [];
    let customDeviceDraft: any = {
      categoryLibraryName: "交流设备",
      componentLibrary: "ACGenerator",
      componentName: "旧交流风机",
      componentKind: "ac-wind-source",
      error: ""
    };
    let customLibraryCreateDialog: any = {
      kind: "componentLibrary",
      title: "新建元件库",
      cnName: "用户风电类",
      enName: "UserWindGen",
      categoryLibraryName: "交流设备",
      isDerivedComponentLibrary: true,
      derivedFromComponentLibrary: "ACGenerator",
      terminalCount: 2,
      terminalTypes: ["ac", "dc"],
      terminalLabels: ["交流端", "直流端"],
      terminalRoles: ["single-source", "single-load"],
      terminalAssociations: ["ac-generator", "dc-load"],
      isContainer: true,
      allowResizeTransform: "1",
      error: ""
    };
    const setCustomComponentTreeSelection = vi.fn();
    const persistDeviceLibraryChange = vi.fn();
    const setEditingCustomDeviceKind = vi.fn();
    const setSelectedDefinitionKind = vi.fn();
    const scope = {
      DEFAULT_STATE_PAGE_ID: "default",
      cancelPendingCustomComponentTemplateLoad: vi.fn(),
      categoryLibraries: ["交流设备"],
      componentLibraryOptions: ["ACGenerator"],
      createEmptyCustomDeviceDraft: vi.fn(),
      get customComponentLibraries() {
        return customComponentLibraries;
      },
      get customDeviceDraft() {
        return customDeviceDraft;
      },
      customDeviceTemplates: [],
      get customLibraryCreateDialog() {
        return customLibraryCreateDialog;
      },
      defaultComponentLibraryForCategoryLibrary: () => "ACGenerator",
      isValidComponentLibraryName: (name: string) => /^[A-Za-z][A-Za-z0-9_-]*$/.test(name),
      libraryTemplates: [{
        kind: "ac-source",
        label: "被历史覆盖的交流电源",
        componentClass: "CorruptedDerivedClass",
        categoryLibrary: "交流设备",
        size: { width: 104, height: 64 },
        params: { component_type: "ACGenerator" },
        isDerivedComponentLibrary: true,
        derivedFromComponentLibrary: "ACRealBs",
        derivedComponentLibrary: "CorruptedDerivedClass",
        terminalType: "ac",
        terminalCount: 1,
        terminalTypes: ["ac"]
      }, {
        kind: "ac-wind-source",
        label: "交流风力发电机",
        componentClass: "ACWindGen",
        categoryLibrary: "交流设备",
        params: { component_type: "ACGenerator" },
        isDerivedComponentLibrary: true,
        derivedFromComponentLibrary: "ACGenerator",
        derivedComponentLibrary: "ACWindGen",
        terminalType: "ac",
        terminalCount: 1,
        terminalTypes: ["ac"],
        terminalLabels: ["交流发电机端"],
        terminalRoles: ["single-source"],
        terminalAssociations: ["ac-generator"],
        isContainer: false
      }],
      normalizeCategoryLibraryName: (name: string) => name.trim(),
      normalizeComponentLibraryName: (name: string) => name.trim(),
      normalizeCustomCategoryLibraries: (value: unknown) => value as string[],
      normalizeCustomComponentLibraries,
      persistDeviceLibraryChange,
      requireEditMode: () => true,
      setCustomCategoryLibraries: vi.fn(),
      setCustomComponentLibraries: (updater: any) => {
        customComponentLibraries = typeof updater === "function" ? updater(customComponentLibraries) : updater;
      },
      setCustomComponentTreeSelection,
      setCustomDeviceDefinitionMode: vi.fn(),
      setCustomDeviceDialogView: vi.fn(),
      setCustomDeviceDraft: (updater: any) => {
        customDeviceDraft = typeof updater === "function" ? updater(customDeviceDraft) : updater;
      },
      setCustomDeviceDraftCleanBaseline: vi.fn(),
      setCustomDeviceSaveMessage: vi.fn(),
      setCustomDeviceStatePageId: vi.fn(),
      setCustomLibraryCreateDialog: (updater: any) => {
        customLibraryCreateDialog = typeof updater === "function" ? updater(customLibraryCreateDialog) : updater;
      },
      setEditingCustomDeviceKind,
      setExpandedCategoryLibraries: vi.fn(),
      setSelectedDefinitionKind
    };

    const created = createConfirmCustomLibraryCreateDialog(scope)();

    expect(created).toBe(true);
    expect(customComponentLibraries).toEqual([
      expect.objectContaining({
        name: "UserWindGen",
        label: "用户风电类",
        categoryLibraryName: "交流设备",
        isDerivedComponentLibrary: true,
        derivedFromComponentLibrary: "ACGenerator"
      })
    ]);
    expect(customComponentLibraries[0]).not.toHaveProperty("isContainerComponentLibrary");
    expect(customComponentLibraries[0]).not.toHaveProperty("terminalCount");
    expect(customComponentLibraries[0]).not.toHaveProperty("terminalTypes");
    expect(customComponentLibraries[0]).not.toHaveProperty("allowResizeTransform");
    expect(setCustomComponentTreeSelection).toHaveBeenCalledWith({
      kind: "componentLibrary",
      categoryLibraryName: "交流设备",
      section: "UserWindGen"
    });
    expect(customDeviceDraft).toMatchObject({
      componentLibrary: "ACGenerator",
      isDerivedComponentLibrary: true,
      derivedFromComponentLibrary: "ACGenerator",
      derivedComponentLibrary: "UserWindGen",
      derivedComponentLibraryLabel: "用户风电类",
      componentName: "",
      componentKind: "",
      terminalCount: 1,
      terminalTypes: expect.arrayContaining(["ac"]),
      isContainer: false
    });
    expect(customDeviceDraft.allowResizeTransform).toBeUndefined();
    expect(setEditingCustomDeviceKind).toHaveBeenCalledWith("");
    expect(setSelectedDefinitionKind).toHaveBeenCalledWith("");
    expect(persistDeviceLibraryChange).toHaveBeenCalledWith(
      { customComponentLibraries },
      expect.any(Object)
    );
    expect(customLibraryCreateDialog).toBeNull();
  });

  test("creating a component selects an existing derived class and inherits immutable metadata", () => {
    let customDeviceDraft: any = {
      categoryLibraryName: "交流设备",
      componentLibrary: "ACGenerator",
      componentName: "",
      error: ""
    };
    const submittedDialog: any = {
      kind: "component",
      title: "新建元件",
      cnName: "用户风电机组",
      enName: "custom-user-wind-generator",
      categoryLibraryName: "交流设备",
      componentClassName: "UserWindGen",
      componentLibrary: "stale-class-value",
      isDerivedComponentLibrary: false,
      derivedFromComponentLibrary: "",
      derivedComponentLibrary: "",
      derivedComponentLibraryLabel: "stale-label",
      error: ""
    };
    let customLibraryCreateDialog: any = {
      ...submittedDialog,
      componentClassName: "ACGenerator",
      componentLibrary: "ACGenerator"
    };
    const setCustomComponentTreeSelection = vi.fn();
    const setCustomDeviceDefinitionMode = vi.fn();
    const setCustomDeviceDialogView = vi.fn();
    const setCustomDeviceDraftCleanBaseline = vi.fn();
    const setCustomDeviceStatePageId = vi.fn();

    const scope = {
      DEFAULT_STATE_PAGE_ID: "default",
      cancelPendingCustomComponentTemplateLoad: vi.fn(),
      categoryLibraries: ["交流设备"],
      componentLibraryOptions: ["ACGenerator"],
      customComponentLibraries: [{
        name: "UserWindGen",
        categoryLibraryName: "交流设备",
        label: "用户风电",
        isDerivedComponentLibrary: true,
        derivedFromComponentLibrary: "ACGenerator"
      }],
      createEmptyCustomDeviceDraft: (categoryLibraryName = "") => ({
        categoryLibraryName,
        componentLibrary: "",
        componentName: "",
        componentKind: "",
        isDerivedComponentLibrary: false,
        derivedFromComponentLibrary: "",
        derivedComponentLibrary: "",
        derivedComponentLibraryLabel: "",
        isContainer: false,
        error: ""
      }),
      customDeviceTemplates: [],
      defaultComponentLibraryForCategoryLibrary: () => "ACGenerator",
      get customDeviceDraft() {
        return customDeviceDraft;
      },
      get customLibraryCreateDialog() {
        return customLibraryCreateDialog;
      },
      isValidComponentLibraryName: (name: string) => /^[A-Za-z][A-Za-z0-9_-]*$/.test(name),
      libraryTemplates: [{
        kind: "ac-source",
        label: "交流电源",
        componentClass: "ACGenerator",
        categoryLibrary: "交流设备",
        params: { component_type: "ACGenerator" },
        terminalType: "ac",
        terminalCount: 1,
        terminalTypes: ["ac"],
        terminalLabels: ["交流发电机端"],
        terminalRoles: ["single-source"],
        terminalAssociations: ["ac-generator"],
        isContainer: false
      }, {
        kind: "existing-user-wind-generator",
        label: "既有用户风电机组",
        componentClass: "UserWindGen",
        categoryLibrary: "交流设备",
        custom: true,
        params: { component_type: "ACGenerator" },
        isDerivedComponentLibrary: true,
        derivedFromComponentLibrary: "ACGenerator",
        derivedComponentLibrary: "UserWindGen",
        derivedComponentLibraryLabel: "用户风电",
        terminalType: "ac",
        terminalCount: 1,
        terminalTypes: ["ac"]
      }],
      normalizeCategoryLibraryName: (name: string) => name.trim(),
      normalizeComponentLibraryName: (name: unknown) => String(name ?? "").trim(),
      normalizeCustomCategoryLibraries: (value: unknown) => value as string[],
      normalizeCustomComponentLibraries: (value: unknown) => value as any[],
      requireEditMode: () => true,
      setCustomCategoryLibraries: vi.fn(),
      setCustomComponentLibraries: vi.fn(),
      setCustomComponentTreeSelection,
      setCustomDeviceDefinitionMode,
      setCustomDeviceDialogView,
      setCustomDeviceDraft: (updater: any) => {
        customDeviceDraft = typeof updater === "function" ? updater(customDeviceDraft) : updater;
      },
      setCustomDeviceDraftCleanBaseline,
      setCustomDeviceSaveMessage: vi.fn(),
      setCustomDeviceSaveToast: vi.fn(),
      customDeviceSaveToastTimerRef: { current: null },
      setCustomDeviceStatePageId,
      setCustomLibraryCreateDialog: (updater: any) => {
        customLibraryCreateDialog = typeof updater === "function" ? updater(customLibraryCreateDialog) : updater;
      },
      setEditingCustomDeviceKind: vi.fn(),
      setExpandedCategoryLibraries: vi.fn(),
      setSelectedDefinitionKind: vi.fn()
    };

    const created = createConfirmCustomLibraryCreateDialog(scope)(submittedDialog);

    expect(created).toBe(true);
    expect(setCustomDeviceDefinitionMode).toHaveBeenCalledWith("create");
    expect(setCustomDeviceDialogView).toHaveBeenCalledWith("icon");
    expect(setCustomDeviceStatePageId).toHaveBeenCalledWith("default");
    expect(setCustomComponentTreeSelection).toHaveBeenCalledWith({
      kind: "componentLibrary",
      categoryLibraryName: "交流设备",
      section: "UserWindGen"
    });
    expect(customDeviceDraft).toMatchObject({
      categoryLibraryName: "交流设备",
      componentLibrary: "ACGenerator",
      componentName: "用户风电机组",
      componentKind: "custom-user-wind-generator",
      isDerivedComponentLibrary: true,
      derivedFromComponentLibrary: "ACGenerator",
      derivedComponentLibrary: "UserWindGen",
      derivedComponentLibraryLabel: "用户风电",
      terminalCount: 1,
      terminalTypes: expect.arrayContaining(["ac"]),
      isContainer: false,
      error: ""
    });
    expect(setCustomDeviceDraftCleanBaseline).toHaveBeenCalledWith(expect.objectContaining({
      isDerivedComponentLibrary: true,
      derivedComponentLibrary: "UserWindGen",
      derivedComponentLibraryLabel: "用户风电",
      isContainer: false
    }));
    expect(customLibraryCreateDialog).toBeNull();
  });

  test("opening the new component dialog selects the current existing class", () => {
    let customLibraryCreateDialog: any = null;
    const scope = {
      customComponentTreeSelection: {
        kind: "componentLibrary",
        categoryLibraryName: "交流设备",
        section: "ACGenerator"
      },
      libraryTemplateByKind: new Map(),
      libraryTemplates: [{
        kind: "ac-source",
        label: "交流电源",
        categoryLibrary: "交流设备",
        size: { width: 104, height: 64 },
        params: { component_type: "ACGenerator" },
        terminalType: "ac",
        terminalCount: 1,
        terminalTypes: ["ac"],
        terminalLabels: ["交流端"],
        terminalRoles: ["single-source"],
        terminalAssociations: ["ac-generator"]
      }],
      defaultComponentLibraryForCategoryLibrary: () => "ACGenerator",
      nextCustomTemplateKind: (section: string) => `custom-${section}`,
      normalizeCategoryLibraryName: (name: string) => name.trim(),
      requireEditMode: () => true,
      setCustomLibraryCreateDialog: (value: any) => {
        customLibraryCreateDialog = value;
      }
    };

    createStartCustomComponentCreate(scope)();

    expect(customLibraryCreateDialog).toMatchObject({
      kind: "component",
      title: "新建元件",
      categoryLibraryName: "交流设备",
      componentClassName: "ACGenerator",
      componentLibrary: "ACGenerator",
      isDerivedComponentLibrary: false,
      derivedFromComponentLibrary: "",
      derivedComponentLibrary: "",
      derivedComponentLibraryLabel: ""
    });
  });

  test("does not save a stale previously selected component while a component library is selected", () => {
    const previousTemplate = {
      kind: "ac-bus-vertical",
      label: "交流母线-派生",
      custom: false
    };
    const saveBuiltinDeviceDefinitionFromCustomDraft = vi.fn(() => true);
    const saveCustomDeviceTemplate = vi.fn(() => true);
    const showGlobalMessage = vi.fn();

    const saved = createSaveCustomDeviceDefinitionDialog({
      customComponentTreeSelection: {
        kind: "componentLibrary",
        categoryLibraryName: "交流设备",
        section: "CustomDevice3"
      },
      customDeviceDefinitionMode: "edit",
      editingCustomDeviceKind: "",
      saveBuiltinDeviceDefinitionFromCustomDraft,
      saveCustomDeviceTemplate,
      selectedCustomComponentTemplate: undefined,
      selectedDefinitionTemplate: previousTemplate,
      showGlobalMessage
    })();

    expect(saved).toBe(false);
    expect(saveBuiltinDeviceDefinitionFromCustomDraft).not.toHaveBeenCalled();
    expect(saveCustomDeviceTemplate).not.toHaveBeenCalled();
    expect(showGlobalMessage).toHaveBeenCalledWith(expect.stringContaining("没有选中可保存的元件"));
  });

  test("always routes a confirmed new component to the create path despite stale edit selection", () => {
    const saveBuiltinDeviceDefinitionFromCustomDraft = vi.fn(() => true);
    const saveCustomDeviceTemplate = vi.fn(() => true);

    const saved = createSaveCustomDeviceDefinitionDialog({
      customComponentTreeSelection: {
        kind: "componentLibrary",
        categoryLibraryName: "交流设备",
        section: "ACGenerator"
      },
      customDeviceDefinitionMode: "create",
      editingCustomDeviceKind: "ac-wind-source",
      saveBuiltinDeviceDefinitionFromCustomDraft,
      saveCustomDeviceTemplate,
      selectedDefinitionTemplate: { kind: "ac-wind-source", custom: false }
    })();

    expect(saved).toBe(true);
    expect(saveCustomDeviceTemplate).toHaveBeenCalledOnce();
    expect(saveBuiltinDeviceDefinitionFromCustomDraft).not.toHaveBeenCalled();
  });

  test("selecting a base component library clears stale derived-specific draft params", () => {
    let customDeviceDraft: any = {
      categoryLibraryName: "交流设备",
      componentLibrary: "ACThermalGen",
      componentName: "交流火电",
      componentKind: "ac-thermal-source",
      isDerivedComponentLibrary: true,
      derivedFromComponentLibrary: "ACGenerator",
      derivedComponentLibrary: "ACThermalGen",
      derivedComponentLibraryLabel: "交流火电",
      params: [
        { id: "thermal-model", cnName: "火电机组型号", enName: "thermalUnitModel", valueType: "string", typicalValue: "" },
        { id: "heat-rate", cnName: "热耗率", enName: "heatRate", valueType: "string", typicalValue: "" }
      ],
      stateDefinitions: [{ value: "1" }],
      error: ""
    };
    const scope = {
      DEFAULT_STATE_PAGE_ID: "default",
      cancelPendingCustomComponentTemplateLoad: vi.fn(),
      ensureCustomComponentTreeExpanded: vi.fn(),
      createCustomDeviceDraftFromTemplate: (_template: any, section: string) => ({
        componentLibrary: section,
        terminalCount: 1,
        terminalTypes: ["ac"],
        terminalLabels: ["交流发电机端"],
        terminalAnchors: [{ x: -0.5, y: 0 }],
        terminalRoles: ["single-source"],
        terminalAssociations: ["ac-generator"],
        isContainer: false,
        allowResizeTransform: "0",
        size: { width: 84, height: 56 },
        params: [
          { id: "idx", cnName: "序号", enName: "idx", valueType: "integer", typicalValue: "" },
          { id: "p-set", cnName: "有功功率设定", enName: "p_set", valueType: "number", typicalValue: "" },
          { id: "q-set", cnName: "无功功率设定", enName: "q_set", valueType: "number", typicalValue: "" }
        ],
        stateDefinitions: [{ value: "template-state" }]
      }),
      libraryTemplates: [
        { kind: "ac-source", categoryLibrary: "交流设备" },
        { kind: "ac-thermal-source", categoryLibrary: "交流设备", params: { is_derived_component_library: "1" } }
      ],
      normalizeCategoryLibraryName: (name: string) => name.trim(),
      normalizeComponentLibraryName: (name: string) => name.trim(),
      resolveTemplateComponentLibrary: (template: any) => template.kind === "ac-source" || template.kind === "ac-thermal-source" ? "ACGenerator" : "",
      setCustomComponentTreeSelection: vi.fn(),
      setCustomDeviceDefinitionMode: vi.fn(),
      setCustomDeviceDialogView: vi.fn(),
      setCustomDeviceDraft: (updater: any) => {
        customDeviceDraft = typeof updater === "function" ? updater(customDeviceDraft) : updater;
      },
      setCustomDeviceStatePageId: vi.fn(),
      setEditingCustomDeviceKind: vi.fn(),
      setSelectedDefinitionKind: vi.fn()
    };

    createSelectCustomComponentLibrary(scope)("交流设备", "ACGenerator");

    expect(customDeviceDraft).toMatchObject({
      categoryLibraryName: "交流设备",
      componentLibrary: "ACGenerator",
      componentName: "",
      componentKind: "",
      isDerivedComponentLibrary: false,
      derivedFromComponentLibrary: "",
      derivedComponentLibrary: "",
      derivedComponentLibraryLabel: "",
      params: expect.arrayContaining([
        expect.objectContaining({ enName: "p_set" }),
        expect.objectContaining({ enName: "q_set" })
      ]),
      stateDefinitions: [],
      error: ""
    });
    expect(customDeviceDraft.params.map((row: any) => row.enName)).not.toContain("thermalUnitModel");
    expect(customDeviceDraft.params.map((row: any) => row.enName)).not.toContain("heatRate");
    expect(scope.setCustomDeviceDefinitionMode).toHaveBeenCalledWith("edit");
    expect(scope.setEditingCustomDeviceKind).toHaveBeenCalledWith("");
    expect(scope.setSelectedDefinitionKind).toHaveBeenCalledWith("");
  });

  test("class metadata is editable only while creating a class and read-only for concrete components", () => {
    const appViewSource = readFileSync(new URL("./appExtracted/appView.tsx", import.meta.url), "utf8");

    expect(appViewSource).toContain('customLibraryCreateDialog.kind === "componentLibrary"');
    expect(appViewSource).toContain("<span>是否派生类</span>");
    expect(appViewSource).toContain("<span>是否容器</span>");
    expect(appViewSource).toContain("<span>端子数量</span>");
    expect(appViewSource).toContain('className="custom-library-create-class-field"');
    expect(appViewSource).toContain("<span>所属类</span>");
    expect(appViewSource).not.toContain("<span>派生关系</span>");
    expect(appViewSource).toMatch(/disabled\s+readOnly/);
    expect(appViewSource).toContain('className="custom-device-derived-field"');
    expect(appViewSource).toContain('className="custom-device-resize-field"');
    expect(appViewSource).toContain('!customLibraryCreateDialog.isDerivedComponentLibrary');
    expect(appViewSource).toContain('placeholder="输入中文名或英文名过滤"');
    expect(appViewSource).toContain('aria-label="派生基类选择"');
    expect(appViewSource).not.toContain("customLibraryCreateDialogSelectedClassMetadata");
    expect(appViewSource).not.toContain('custom-device-terminal-summary-field');
    expect(appViewSource).toContain('disabled title="能源属性由所属类定义"');
    expect(appViewSource).toContain('disabled title="关联设备由所属类定义"');
    expect(appViewSource).toContain('disabled={customDeviceDefinitionMode === "edit" && customComponentTreeSelection?.kind !== "component"}');
  });

  test("asks for confirmation before deleting an empty category library", async () => {
    const showGlobalConfirm = vi.fn(() => Promise.resolve(false));
    vi.stubGlobal("showGlobalMessage", vi.fn());
    vi.stubGlobal("showGlobalConfirm", showGlobalConfirm);
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

    await createDeleteCustomCategoryLibrary(scope)("用户类别");

    expect(showGlobalConfirm).toHaveBeenCalledWith("确认删除类别库“用户类别”？");
    expect(setCustomCategoryLibraries).not.toHaveBeenCalled();
    expect(customCategoryLibraries).toEqual(["用户类别"]);
  });

  test("asks for confirmation before deleting an empty component library", async () => {
    const showGlobalConfirm = vi.fn(() => Promise.resolve(false));
    vi.stubGlobal("showGlobalMessage", vi.fn());
    vi.stubGlobal("showGlobalConfirm", showGlobalConfirm);
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

    await createDeleteCustomComponentLibrary(scope)("UserLibrary");

    expect(showGlobalConfirm).toHaveBeenCalledWith("确认删除元件库“UserLibrary”？");
    expect(setCustomComponentLibraries).not.toHaveBeenCalled();
    expect(customComponentLibraries).toEqual([
      { name: "UserLibrary", categoryLibraryName: "用户类别", label: "用户元件库" }
    ]);
  });

  test("blocks deleting a base component library while a derived class still references it", async () => {
    const showGlobalConfirm = vi.fn();
    const showGlobalMessage = vi.fn();
    vi.stubGlobal("showGlobalConfirm", showGlobalConfirm);
    vi.stubGlobal("showGlobalMessage", showGlobalMessage);
    const setCustomComponentLibraries = vi.fn();
    const scope = {
      E_SECTION_OPTIONS: ["ACLoad"],
      customComponentLibraries: [
        { name: "UserBase", categoryLibraryName: "用户类别" },
        {
          name: "UserDerived",
          categoryLibraryName: "用户类别",
          isDerivedComponentLibrary: true,
          derivedFromComponentLibrary: "UserBase"
        }
      ],
      customComponentTreeSelection: {
        kind: "componentLibrary",
        categoryLibraryName: "用户类别",
        section: "UserBase"
      },
      customDeviceDraft: { categoryLibraryName: "用户类别", componentLibrary: "UserBase" },
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

    await createDeleteCustomComponentLibrary(scope)("UserBase");

    expect(showGlobalMessage).toHaveBeenCalledWith(
      "元件库“UserBase”仍被派生类 UserDerived 使用，请先删除这些派生类。"
    );
    expect(showGlobalConfirm).not.toHaveBeenCalled();
    expect(setCustomComponentLibraries).not.toHaveBeenCalled();
  });

  test("does not prompt for renaming immutable component-library class metadata", () => {
    const prompt = vi.fn();
    const showGlobalMessage = vi.fn();
    vi.stubGlobal("window", { prompt });
    vi.stubGlobal("showGlobalMessage", showGlobalMessage);
    const scope = {
      customComponentTreeSelection: {
        kind: "componentLibrary",
        categoryLibraryName: "用户类别",
        section: "UserLibrary"
      },
      requireEditMode: () => true
    };

    createRenameSelectedCustomDeviceTreeItem(scope)();

    expect(prompt).not.toHaveBeenCalled();
    expect(showGlobalMessage).toHaveBeenCalledWith(
      "元件库类信息在创建确认后不可修改；如定义错误，请删除该元件库后重新创建。"
    );
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
      customComponentLibraries: [{
        name: "StaticButton",
        categoryLibraryName: "静态图元",
        terminalCount: 0,
        terminalTypes: [],
        terminalLabels: [],
        terminalRoles: [],
        terminalAssociations: [],
        isContainerComponentLibrary: false,
        allowResizeTransform: false
      }],
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
      isValidComponentLibraryName: (name: string) => /^[A-Za-z][A-Za-z0-9_-]*$/.test(name),
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
      setCustomDeviceSaveToast: vi.fn(),
      customDeviceSaveToastTimerRef: { current: null },
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
      strokeStyle: "solid",
      strokeWidth: 0,
      strokeColor: "transparent",
      fillColor: "transparent"
    }));
    expect(dialog.frame).toEqual(savedFrame);
  });

  test("saves a definition frame background when the drawing has no editable elements", async () => {
    let definitionVisualDraft: any = {
      backgroundImage: "",
      backgroundImageAssetId: "",
      backgroundImageCleared: "1",
      terminalCount: 0
    };
    let dialogClosed = false;
    const updateDefinitionStateDraftRow = vi.fn();
    const scope = {
      backendImageIdFromHref: () => "",
      customDeviceDraft: { terminalCount: 0 },
      customDraftTerminalTypes: [],
      definitionVisualDraft,
      definitionVisualTerminalTypes: [],
      fetchBackendImageDataUrl: vi.fn(),
      imageAssetList: [],
      imageAssets: {},
      isDefaultStatePageId: (rowId: string) => rowId === "__default__",
      isImageDataUrl: (href: string) => href.startsWith("data:"),
      setDefinitionVisualDraft: (updater: any) => {
        definitionVisualDraft = typeof updater === "function" ? updater(definitionVisualDraft) : updater;
      },
      setStateIconDrawingDialog: (value: any) => {
        dialogClosed = value === null;
      },
      stateIconDrawingDialog: {
        target: { scope: "definition", rowId: "__default__" },
        elements: [],
        selectedElementId: "",
        selectedElementIds: [],
        frame: {
          strokeStyle: "solid",
          strokeWidth: 2,
          strokeColor: "#334155",
          fillColor: "#fef3c7",
          backgroundImage: apiPath("/images/bg-1"),
          backgroundImageAssetId: "bg-1"
        }
      },
      stateIconDrawingToImage,
      updateCustomDeviceStateDraftRow: vi.fn(),
      updateDefinitionStateDraftRow
    };

    await createApplyStateIconDrawingDialog(scope)();

    const savedSvg = decodeURIComponent(definitionVisualDraft.backgroundImage.split(",")[1] ?? "");
    expect(definitionVisualDraft.backgroundImage).toMatch(/^data:image\/svg\+xml/);
    expect(definitionVisualDraft.backgroundImageAssetId).toBe("");
    expect(definitionVisualDraft.backgroundImageCleared).toBe("");
    expect(savedSvg).toContain('data-state-icon-frame="true"');
    expect(savedSvg).toContain('fill="#fef3c7"');
    expect(savedSvg).toContain('data-state-icon-frame-image="true"');
    expect(savedSvg).toContain('data-state-icon-frame-image-asset-id="bg-1"');
    expect(savedSvg).toContain('href="' + apiPath('/images/bg-1') + '"');
    expect(updateDefinitionStateDraftRow).not.toHaveBeenCalled();
    expect(dialogClosed).toBe(true);
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

  test("validates enabled E export names and rejects duplicates", () => {
    const message = deviceParameterDefinitionsComplianceMessage([
      {
        cnName: "额定功率",
        enName: "ratedPower",
        valueType: "float",
        typicalValue: "10",
        exportEnabled: true,
        exportName: "1rated"
      },
      {
        cnName: "额定电压",
        enName: "ratedVoltage",
        valueType: "float",
        typicalValue: "110",
        exportEnabled: true,
        exportName: "rated_value"
      },
      {
        cnName: "额定电流",
        enName: "ratedCurrent",
        valueType: "float",
        typicalValue: "100",
        exportEnabled: true,
        exportName: "rated_value"
      },
      {
        cnName: "备注",
        enName: "remark",
        valueType: "string",
        typicalValue: "",
        exportEnabled: true,
        exportName: ""
      },
      {
        cnName: "内部字段",
        enName: "internalValue",
        valueType: "string",
        typicalValue: "",
        exportEnabled: false,
        exportName: ""
      }
    ] as any);

    expect(message).toContain("属性第 1 行：导出名称 1rated 只能包含英文字母、数字、下划线和中划线，且必须以英文字母开头。");
    expect(message).toContain("属性第 3 行：导出名称 rated_value 与第 2 行重复。");
    expect(message).toContain("属性第 4 行：启用导出时，导出名称不能为空。");
    expect(message).not.toContain("属性第 5 行");
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

describe("applyEDeviceDefinitionSectionsToLibraryState", () => {
  const buildTemplate = (kind: string, componentType: string, parameterDefinitions: any[], custom = false) => ({
    kind,
    label: componentType,
    categoryLibrary: componentType.startsWith("DC") ? "直流设备" : "交流设备",
    params: { component_type: componentType },
    parameterDefinitions,
    custom
  });

  test("loads class export switches, class names, and parameter export names from an interface file", () => {
    const acTemplate = buildTemplate("ac-load", "ACLoad", [
      { cnName: "有功", enName: "p", valueType: "float", typicalValue: "0", exportEnabled: false },
      { cnName: "无功", enName: "q", valueType: "float", typicalValue: "0", exportEnabled: true, exportName: "q_old" }
    ]);
    const dcTemplate = buildTemplate("custom-dc-load", "DCLoad", [
      { cnName: "功率", enName: "p", valueType: "float", typicalValue: "0", exportEnabled: true, exportName: "p" }
    ], true);

    const result = applyEDeviceDefinitionSectionsToLibraryState({
      sections: [
        {
          kind: "LoadTable",
          label: "交流负荷",
          categoryLibrary: "交流设备",
          componentLibrary: "ACLoad",
          originalComponentLibrary: "ACLoad",
          fields: [
            { exportName: "idx", cnName: "序号" },
            { exportName: "name", cnName: "名称" },
            { exportName: "dev_type", cnName: "设备类型" },
            { exportName: "p_custom", cnName: "有功" }
          ]
        }
      ],
      customDeviceTemplates: [dcTemplate],
      libraryTemplates: [acTemplate, dcTemplate],
      deviceDefinitionOverrides: {},
      eDeviceDefinitionLabels: {},
      eDeviceDefinitionClassExportEnabled: {},
      deviceDefinitionKeyForTemplate: (template: any) => template.params.component_type,
      deviceDefinitionOverrideForTemplate,
      resolveDefinitionComponentLibrary: (template: any) => template.params.component_type
    });

    expect(result.eDeviceDefinitionLabels).toEqual({ ACLoad: "LoadTable" });
    expect(result.eDeviceDefinitionClassExportEnabled).toEqual({ ACLoad: true, DCLoad: false });
    expect(result.deviceDefinitionOverrides["shared:ACLoad"].parameterDefinitions).toEqual(expect.arrayContaining([
      expect.objectContaining({ enName: "p", exportEnabled: true, exportName: "p_custom" }),
      expect.objectContaining({ enName: "q", exportEnabled: false, exportName: "q_old" })
    ]));
    expect(result.deviceDefinitionOverrides["shared:DCLoad"].parameterDefinitions).toEqual(expect.arrayContaining([
      expect.objectContaining({ enName: "p", exportEnabled: false, exportName: "p" })
    ]));
    expect(result.customDeviceTemplates[0].parameterDefinitions).toBeUndefined();
    expect(result.customDeviceTemplates[0].measurementDefinitions).toBeUndefined();
    expect(result.matched).toEqual([
      expect.objectContaining({ section: "LoadTable" })
    ]);
    expect(result.skipped).toEqual([]);
  });

  test("派生元件库模板不污染基类 ACGenerator 的 override（储能属性不进交流电源）", () => {
    const libraryTemplates = DEVICE_LIBRARY.filter((template) =>
      template.kind === "ac-source" || template.kind === "ac-storage"
    );
    const result = applyEDeviceDefinitionSectionsToLibraryState({
      sections: [
        {
          kind: "unit",
          label: "机组",
          categoryLibrary: "交流设备",
          componentLibrary: "ACGenerator",
          fields: [
            { exportName: "idx", cnName: "序号" },
            { exportName: "name", cnName: "名称" }
          ]
        }
      ],
      libraryTemplates,
      deviceDefinitionOverrides: {},
      eDeviceDefinitionLabels: {},
      eDeviceDefinitionClassExportEnabled: {},
      deviceDefinitionKeyForTemplate,
      deviceDefinitionOverrideForTemplate,
      resolveDefinitionComponentLibrary: resolveTemplateComponentLibrary
    });

    const acGeneratorOverride = result.deviceDefinitionOverrides["shared:ACGenerator"];
    expect(acGeneratorOverride).toBeDefined();
    const enNames = (acGeneratorOverride.parameterDefinitions ?? []).map((d: any) => d.enName);
    expect(enNames).not.toContain("storage_technology");
    expect(enNames).not.toContain("battery_rack_count");
  });

  test("加载模板后 fieldOrder 严格按模板字段，导出不追加 dev_type", () => {
    const acSource = DEVICE_LIBRARY.find((t) => t.kind === "ac-source")!;
    const result = applyEDeviceDefinitionSectionsToLibraryState({
      sections: [
        {
          kind: "unit",
          label: "机组",
          categoryLibrary: "交流设备",
          componentLibrary: "ACGenerator",
          fields: [
            { exportName: "idx", cnName: "序号" },
            { exportName: "name", cnName: "名称" },
            { exportName: "type", cnName: "类型" }
          ]
        }
      ],
      libraryTemplates: [acSource],
      deviceDefinitionOverrides: {},
      eDeviceDefinitionLabels: {},
      eDeviceDefinitionClassExportEnabled: {},
      deviceDefinitionKeyForTemplate,
      deviceDefinitionOverrideForTemplate,
      resolveDefinitionComponentLibrary: resolveTemplateComponentLibrary
    });

    expect(result.eDeviceDefinitionFieldOrder.ACGenerator).not.toContain("dev_type");

    const exportOptions = buildEFileExportOptionsFromLibrary({
      libraryTemplates: [acSource],
      eDeviceDefinitionFieldOrder: result.eDeviceDefinitionFieldOrder,
      resolveDefinitionComponentLibrary: resolveTemplateComponentLibrary
    });
    const generator = exportOptions.interfaceDefinitions.find((d: any) => d.componentLibrary === "ACGenerator");
    const fieldNames = (generator?.fields ?? []).map((f: any) => f.sourceName);
    expect(fieldNames).not.toContain("dev_type");
    expect(fieldNames).toEqual(["idx", "name", "type"]);
  });
});

describe("buildEDeviceInterfaceDefinitionRows", () => {
  test("migrates saved max_current field order entries to i_max", () => {
    const ordered = applyEDeviceInterfaceFieldOrder(
      [
        { sourceName: "idx" },
        { sourceName: "i_max" },
        { sourceName: "run_stat" }
      ],
      ["idx", "max_current", "run_stat"]
    );

    expect(ordered.map((field: any) => field.sourceName)).toEqual(["idx", "i_max", "run_stat"]);
  });

  test("uses the interface table default order for exported base generator fields", () => {
    const exportOptions = buildEFileExportOptionsFromLibrary({
      libraryTemplates: DEVICE_LIBRARY.filter((template) => template.kind === "ac-source")
    });
    const rows = exportOptions.interfaceDefinitions;
    const generator = rows.find((row: any) => row.componentLibrary === "ACGenerator");
    const expectedOrder = [
      "idx",
      "name",
      "dev_type",
      "node",
      "control_type",
      "p_set",
      "p_max",
      "p_min",
      "q_set",
      "q_max",
      "q_min",
      "v_set",
      "alpha",
      "run_stat",
      "rated_capacity",
      "rated_voltage",
      "v_max",
      "v_min",
      "regable",
      "p",
      "q",
      "u",
      "f"
    ];

    const actualOrder = generator?.fields
      .filter((field: any) => field.exportEnabled)
      .map((field: any) => field.sourceName);
    expect(actualOrder).toEqual(expectedOrder);

    const generatorNode = createDefaultNode("ac-source", { x: 100, y: 100 });
    const eFile = buildEFileExport({
      version: 1,
      name: "默认接口顺序",
      nodes: [generatorNode],
      edges: []
    }, ["默认方案"], exportOptions).text;
    const exportedHeader = eFile.match(/<ACGenerator>\s*\r?\n@\s*([^\r\n]+)/)?.[1]
      .trim()
      .split(/\s+/u);

    expect(exportedHeader).toEqual(expectedOrder);
  });

  test("shows rated capacity and voltage on base generator interfaces instead of derived interfaces", () => {
    const includedKinds = new Set([
      "ac-source",
      "dc-source",
      "ac-wind-source",
      "dc-wind-source"
    ]);
    const rows = buildEDeviceInterfaceDefinitionRows({
      libraryTemplates: DEVICE_LIBRARY.filter((template) => includedKinds.has(template.kind))
    });

    for (const componentLibrary of ["ACGenerator", "DCGenerator"]) {
      const fieldNames = rows
        .find((row: any) => row.componentLibrary === componentLibrary)
        ?.fields.map((field: any) => field.sourceName);
      expect(fieldNames).toEqual(expect.arrayContaining(["rated_capacity", "rated_voltage"]));
      expect(fieldNames).not.toContain("wind_turbine_model");
      expect(fieldNames).not.toContain("cut_in_wind_speed");
    }

    for (const componentLibrary of ["ACWindGen", "DCWindGen"]) {
      const fieldNames = rows
        .find((row: any) => row.componentLibrary === componentLibrary)
        ?.fields.map((field: any) => field.sourceName);
      expect(fieldNames).toEqual(expect.arrayContaining([
        "idx",
        componentLibrary === "ACWindGen" ? "idx_acgenerator" : "idx_dcgenerator",
        "wind_turbine_model",
        "cut_in_wind_speed"
      ]));
      expect(fieldNames).not.toContain("rated_capacity");
      expect(fieldNames).not.toContain("rated_voltage");
      expect(fieldNames).not.toContain("rated_power");
      expect(fieldNames).not.toContain("unit_rated_power");
    }
  });

  test("does not merge derived-only fields into the base component interface", () => {
    const baseDefinitions = [
      { cnName: "序号", enName: "idx", valueType: "integer", typicalValue: "" },
      { cnName: "名称", enName: "name", valueType: "string", typicalValue: "" },
      { cnName: "节点", enName: "node", valueType: "string", typicalValue: "" },
      { cnName: "工作状态", enName: "run_stat", valueType: "integer", typicalValue: "1" }
    ];
    const rows = buildEDeviceInterfaceDefinitionRows({
      libraryTemplates: [
        {
          kind: "custom-ac-source",
          label: "交流电源",
          categoryLibrary: "交流设备",
          params: { component_type: "ACGenerator" },
          parameterDefinitions: baseDefinitions
        },
        {
          kind: "custom-wind-source",
          label: "交流风电",
          categoryLibrary: "交流设备",
          params: {
            component_type: "ACGenerator",
            derived_from_component_type: "ACGenerator",
            derived_component_type: "ACWindGen",
            derived_component_library_label: "交流风电",
            is_derived_component_library: "1"
          },
          parameterDefinitions: [
            ...baseDefinitions,
            { cnName: "风机型号", enName: "windTurbineModel", valueType: "string", typicalValue: "", exportEnabled: true }
          ]
        },
        {
          kind: "custom-pv-source",
          label: "交流光伏",
          categoryLibrary: "交流设备",
          params: {
            component_type: "ACGenerator",
            derived_from_component_type: "ACGenerator",
            derived_component_type: "ACPVGen",
            derived_component_library_label: "交流光伏",
            is_derived_component_library: "1"
          },
          parameterDefinitions: [
            ...baseDefinitions,
            { cnName: "组件额定功率", enName: "moduleRatedPower", valueType: "number", typicalValue: "", exportEnabled: true }
          ]
        },
        {
          kind: "ac-thermal-source",
          label: "交流火力发电机",
          categoryLibrary: "交流设备",
          isDerivedComponentLibrary: false,
          params: { component_type: "ACGenerator" },
          parameterDefinitions: [
            ...baseDefinitions,
            { cnName: "火电机组型号", enName: "thermalUnitModel", valueType: "string", typicalValue: "", exportEnabled: true },
            { cnName: "燃料类型", enName: "fuelType", valueType: "string", typicalValue: "", exportEnabled: true }
          ]
        }
      ],
      resolveDefinitionComponentLibrary: (template) => String(template.params?.component_type ?? "")
    });

    const baseRow = rows.find((row: any) => row.componentLibrary === "ACGenerator");

    expect(baseRow?.fields.map((field: any) => field.sourceName)).toEqual([
      "idx",
      "name",
      "dev_type",
      "node",
      "run_stat",
      "rated_capacity",
      "rated_voltage",
      "control_type",
      "p_set",
      "p_max",
      "p_min",
      "q_set",
      "q_max",
      "q_min",
      "v_set",
      "v_max",
      "v_min",
      "alpha",
      "regable"
    ]);
    expect(rows.some((row: any) => row.componentLibrary === "ACThermalGen")).toBe(false);
  });

  test("keeps fixed E fields visible in the interface definition table", () => {
    const rows = buildEDeviceInterfaceDefinitionRows({
      libraryTemplates: [
        {
          kind: "hydrogen-source",
          label: "氢源",
          categoryLibrary: "氢能设备",
          params: { component_type: "HydroSource" }
        }
      ],
      resolveDefinitionComponentLibrary: () => "HydroSource"
    });

    expect(rows).toHaveLength(1);
    expect(rows[0].componentLibrary).toBe("HydroSource");
    expect(rows[0].fields.map((field: any) => field.sourceName)).toEqual([
      "idx",
      "name",
      "dev_type",
      "node",
      "rated_capacity",
      "control_type",
      "pressure_set",
      "pressure_max",
      "pressure_min",
      "flow_set",
      "flow_max",
      "flow_min",
      "run_stat"
    ]);
  });

  test("applies a saved complete field order including fixed E fields", () => {
    const rows = buildEDeviceInterfaceDefinitionRows({
      libraryTemplates: [
        {
          kind: "hydrogen-source",
          label: "氢源",
          categoryLibrary: "氢能设备",
          params: { component_type: "HydroSource" }
        }
      ],
      eDeviceDefinitionFieldOrder: {
        HydroSource: ["run_stat", "dev_type", "idx", "node", "name"]
      },
      resolveDefinitionComponentLibrary: () => "HydroSource"
    });

    expect(rows[0].fields.map((field: any) => field.sourceName)).toEqual([
      "run_stat",
      "dev_type",
      "idx",
      "node",
      "name"
    ]);
  });

  test("keeps derived component idx and base relation visible", () => {
    const rows = buildEDeviceInterfaceDefinitionRows({
      libraryTemplates: [
        {
          kind: "custom-wind-source",
          label: "交流风电",
          categoryLibrary: "交流设备",
          params: {
            component_type: "ACGenerator",
            derived_from_component_type: "ACGenerator",
            derived_component_type: "ACWindGen",
            derived_component_library_label: "交流风电",
            is_derived_component_library: "1"
          },
          parameterDefinitions: [
            { cnName: "序号", enName: "idx", valueType: "integer", typicalValue: "" },
            { cnName: "名称", enName: "name", valueType: "string", typicalValue: "" },
            { cnName: "节点", enName: "node", valueType: "string", typicalValue: "" },
            { cnName: "风机型号", enName: "windTurbineModel", valueType: "string", typicalValue: "", exportEnabled: true, exportName: "wind_model" }
          ]
        }
      ],
      resolveDefinitionComponentLibrary: () => "ACGenerator"
    });

    const derivedRow = rows.find((row: any) => row.componentLibrary === "ACWindGen");

    expect(derivedRow?.fields.map((field: any) => field.sourceName)).toEqual([
      "idx",
      "idx_acgenerator",
      "windTurbineModel"
    ]);
    expect(derivedRow?.fields.find((field: any) => field.sourceName === "idx")).toMatchObject({
      exportEnabled: true,
      exportName: "idx",
      readonly: true
    });
  });
});

describe("createExportEFile", () => {
  test("uses warnings returned by E generation without rebuilding export records", async () => {
    const project = { version: 1, name: "当前模型", nodes: [], edges: [] };
    const currentProject = vi.fn(() => project);
    const executionOrder: string[] = [];
    let generatedExportOptions: any;
    const buildEFileExport = vi.fn((_project: any, _schemePath: string[], options: any) => {
      executionOrder.push("generate");
      generatedExportOptions = options;
      return { filename: "当前模型.e", text: "", mime: "text/plain", warnings: [] };
    });
    const getEExportWarnings = vi.fn(() => []);
    const saveLazyTextFile = vi.fn(async ({ loadText }: { loadText: () => Promise<string> | string }) => {
      executionOrder.push("save-picker");
      await loadText();
      return false;
    });
    const exportEFile = createExportEFile({
      activeSchemeKey: "scheme-1",
      buildEFileExport,
      currentProject,
      edges: project.edges,
      ensureSavedBeforeExport: () => true,
      getEExportWarnings,
      nodes: project.nodes,
      projectName: project.name,
      saveLazyTextFile,
      schemePathForScheme: () => ["默认方案"],
      writeOperationLog: vi.fn(),
      libraryTemplates: [{
        kind: "ac-source",
        label: "交流电源",
        categoryLibrary: "交流设备",
        size: { width: 84, height: 56 },
        params: {},
        terminalType: "ac",
        terminalCount: 1
      }],
      PARAM_LABELS: {},
      eDeviceDefinitionLabels: { ACGenerator: "GeneratorTable" },
      eDeviceDefinitionClassExportEnabled: { ACGenerator: true },
      eDeviceDefinitionFieldOrder: { ACGenerator: ["dev_type", "name", "idx"] },
      resolveTemplateComponentLibrary: () => "ACGenerator"
    });

    await exportEFile();

    const exportOptions = expect.objectContaining({
      interfaceDefinitions: expect.arrayContaining([
        expect.objectContaining({
          componentLibrary: "ACGenerator",
          exportEnabled: true,
          exportName: "GeneratorTable",
          fields: expect.arrayContaining([
            expect.objectContaining({ sourceName: "dev_type", exportEnabled: true, exportName: "dev_type" })
          ])
        })
      ])
    });
    expect(getEExportWarnings).not.toHaveBeenCalled();
    expect(executionOrder.slice(0, 2)).toEqual(["save-picker", "generate"]);
    expect(currentProject).not.toHaveBeenCalled();
    expect(buildEFileExport).toHaveBeenCalledWith(
      expect.objectContaining({
        version: 1,
        name: project.name,
        nodes: project.nodes,
        edges: project.edges
      }),
      ["默认方案"],
      exportOptions
    );
    const acGenerator = generatedExportOptions.interfaceDefinitions
      .find((row: any) => row.componentLibrary === "ACGenerator");
    expect(acGenerator.fields.slice(0, 3).map((field: any) => field.sourceName)).toEqual([
      "dev_type",
      "name",
      "idx"
    ]);
  });

  test("uses the configured field order when refreshing E files for a scheme export", async () => {
    let generatedExportOptions: any;
    const project = { version: 1, name: "方案模型", nodes: [], edges: [] };
    const projectRecord = { id: "project-1", name: "方案模型", project };
    const scheme = { id: "scheme-1", name: "方案一", projects: [projectRecord], children: [] };
    const exportScheme = createExportSchemeRecord({
      DEFAULT_CANVAS_BACKGROUND: "#ffffff",
      PARAM_LABELS: {},
      backgroundPageRender: null,
      buildEFileExport: vi.fn((_project: any, _path: string[], options: any) => {
        generatedExportOptions = options;
        return { filename: "方案模型.e", text: "", mime: "text/plain" };
      }),
      buildSvgDocument: vi.fn(() => "<svg/>"),
      colorPalette: {},
      downloadBackendSchemeArchive: vi.fn(async () => false),
      eDeviceDefinitionClassExportEnabled: { ACGenerator: true },
      eDeviceDefinitionFieldOrder: { ACGenerator: ["dev_type", "name", "idx"] },
      eDeviceDefinitionLabels: { ACGenerator: "ACGenerator" },
      fetchBackendProjectRecord: vi.fn(),
      flattenSavedProjects: () => [projectRecord],
      libraryTemplates: [{
        kind: "ac-source",
        label: "交流电源",
        categoryLibrary: "交流设备",
        size: { width: 84, height: 56 },
        params: {},
        terminalType: "ac",
        terminalCount: 1
      }],
      loadSvgImageExportPathById: async () => ({}),
      measurementConfig: undefined,
      resolveTemplateComponentLibrary: () => "ACGenerator",
      safeFilePart: (value: string) => value,
      saveBackendProjectArtifacts: vi.fn(async () => undefined),
      savedProjectRecordIsSummary: () => false,
      schemePathForRecord: () => ["方案一"],
      schemePathForScheme: () => ["方案一"],
      schemes: [scheme],
      writeOperationLog: vi.fn()
    });

    await exportScheme(scheme as any);

    const generatorDefinition = generatedExportOptions.interfaceDefinitions.find(
      (definition: any) => definition.componentLibrary === "ACGenerator"
    );
    expect(generatorDefinition.fields.slice(0, 3).map((field: any) => field.sourceName)).toEqual([
      "dev_type",
      "name",
      "idx"
    ]);
  });
});

describe("createExportEDeviceDefinitionFile", () => {
  const buildTemplate = (kind: string, componentType: string, parameterDefinitions: any[]) => ({
    kind,
    label: "自定义负荷",
    categoryLibrary: "用户库",
    params: { component_type: componentType },
    parameterDefinitions
  });

  test("exports enabled fields from library templates covering both custom and built-in devices", async () => {
    const showGlobalMessage = vi.fn();
    vi.stubGlobal("showGlobalMessage", showGlobalMessage);
    const saveTextFile = vi.fn().mockResolvedValue(true);
    // libraryTemplates 已合并内置 + 自定义元件并应用 deviceDefinitionOverrides
    const libraryTemplates = [
      buildTemplate("custom_load", "custom_load", [
        { cnName: "有功", enName: "p", valueType: "float", typicalValue: "1", exportEnabled: true, exportName: "p_load" }
      ]),
      buildTemplate("ac-two-winding-transformer", "TwoWindingTransformer", [
        { cnName: "电阻", enName: "r", valueType: "float", typicalValue: "0", exportEnabled: true, exportName: "r" }
      ])
    ];

    const exportFn = createExportEDeviceDefinitionFile({
      libraryTemplates,
      saveTextFile,
      writeOperationLog: vi.fn()
    });
    await exportFn();

    expect(saveTextFile).toHaveBeenCalledTimes(1);
    const payload = saveTextFile.mock.calls[0][0];
    expect(payload.text).toContain("p_load");
    expect(payload.text).toContain("r");
    expect(payload.filename).toBe("图元E文件定义.e");
    expect(showGlobalMessage).toHaveBeenCalledWith(expect.stringContaining("导出成功"));
  });

  test("exports params whose export flag is inferred from E section when exportEnabled is undefined", async () => {
    const showGlobalMessage = vi.fn();
    vi.stubGlobal("showGlobalMessage", showGlobalMessage);
    const saveTextFile = vi.fn().mockResolvedValue(true);
    // 非内置 component_type，exportEnabled 为 undefined 时按 E 分区推导为 true（与界面一致）
    const libraryTemplates = [
      buildTemplate("customMyLoad", "MyCustomLoad", [
        { cnName: "有功功率", enName: "p_load", valueType: "float", typicalValue: "0" }
      ])
    ];

    const exportFn = createExportEDeviceDefinitionFile({
      libraryTemplates,
      saveTextFile,
      writeOperationLog: vi.fn()
    });
    await exportFn();

    expect(saveTextFile).toHaveBeenCalledTimes(1);
    expect(saveTextFile.mock.calls[0][0].text).toContain("p_load");
  });

  test("alerts when no field is marked for export", async () => {
    const showGlobalMessage = vi.fn();
    vi.stubGlobal("showGlobalMessage", showGlobalMessage);
    const saveTextFile = vi.fn().mockResolvedValue(true);
    const libraryTemplates = [
      buildTemplate("custom_load", "custom_load", [
        { cnName: "有功", enName: "p", valueType: "float", typicalValue: "1", exportEnabled: false }
      ])
    ];

    const exportFn = createExportEDeviceDefinitionFile({
      libraryTemplates,
      saveTextFile,
      writeOperationLog: vi.fn()
    });
    await exportFn();

    expect(saveTextFile).not.toHaveBeenCalled();
    expect(showGlobalMessage).toHaveBeenCalledWith("没有可导出的元件定义：所有元件均未勾选导出字段。");
  });
});

describe("导出 E 文件与国网 E 格式模板一致性", () => {
  test("加载 sgcc.e 模板后导出的表和字段与模板严格一致（无缺失/新增表或字段）", () => {
    const templateText = readFileSync(new URL("../public/e-templates/sgcc.e", import.meta.url), "utf8");
    const templateSections = parseEDeviceDefinitionFile(templateText);
    const templateTables = new Map<string, Set<string>>();
    for (const section of templateSections) {
      templateTables.set(section.kind, new Set((section.fields ?? []).map((f: any) => f.exportName)));
    }

    const libraryTemplates = DEVICE_LIBRARY;
    const result = applyEDeviceDefinitionSectionsToLibraryState({
      sections: templateSections,
      libraryTemplates,
      deviceDefinitionOverrides: {},
      eDeviceDefinitionLabels: {},
      eDeviceDefinitionClassExportEnabled: {},
      deviceDefinitionKeyForTemplate,
      deviceDefinitionOverrideForTemplate,
      resolveDefinitionComponentLibrary: resolveTemplateComponentLibrary
    });
    const exportOptions = buildEFileExportOptionsFromLibrary({
      libraryTemplates,
      eDeviceDefinitionLabels: result.eDeviceDefinitionLabels,
      eDeviceDefinitionClassExportEnabled: result.eDeviceDefinitionClassExportEnabled,
      eDeviceDefinitionFieldOrder: result.eDeviceDefinitionFieldOrder,
      eDeviceDefinitionTemplateFields: result.eDeviceDefinitionTemplateFields,
      resolveDefinitionComponentLibrary: resolveTemplateComponentLibrary
    });

    const nodes = ([
      "ac-source", "ac-load", "ac-storage", "ac-switch", "ac-line", "ac-transformer"
    ] as const).map((kind, i) => createDefaultNode(kind, { x: (i + 1) * 100, y: 100 }));
    const project = { version: 1 as const, name: "模板一致性测试", nodes, edges: [] };

    const eFileText = buildEFileExport(project, ["默认方案"], exportOptions).text;

    const exportedTables = new Map<string, Set<string>>();
    const sectionPattern = /<([^/][^>]*)>\s*\r?\n@ ([^\r\n]+)/g;
    for (const match of eFileText.matchAll(sectionPattern)) {
      const [, name, header] = match;
      exportedTables.set(name, new Set(header.trim().split(/\s+/)));
    }

    const missingTables = [...templateTables.keys()].filter((t) => !exportedTables.has(t));
    const extraTables = [...exportedTables.keys()].filter((t) => !templateTables.has(t));
    const fieldMismatches: Array<{ table: string; missingFields: string[]; extraFields: string[] }> = [];
    for (const [name, fields] of templateTables) {
      const exportedFields = exportedTables.get(name);
      if (!exportedFields) continue;
      const missingFields = [...fields].filter((f) => !exportedFields.has(f));
      const extraFields = [...exportedFields].filter((f) => !fields.has(f));
      if (missingFields.length || extraFields.length) {
        fieldMismatches.push({ table: name, missingFields, extraFields });
      }
    }

    // 验证所有含 ist 列的表，ist=1（只有一个厂站）
    const istSectionPattern = /<(\w+)[^>]*>\s*\r?\n@ ([^\r\n]+)\r?\n([\s\S]*?)<\/\1>/g;
    let istSectionMatch;
    while ((istSectionMatch = istSectionPattern.exec(eFileText)) !== null) {
      const [, sectionName, header, body] = istSectionMatch;
      const cols = header.trim().split(/\s+/);
      const istColIdx = cols.indexOf("ist");
      if (istColIdx < 0) continue;
      for (const line of body.split("\n")) {
        if (!line.trim().startsWith("#")) continue;
        const values = line.replace(/^#\s*/, "").trim().split(/\s+/);
        expect(values[istColIdx], `${sectionName}.ist`).toBe("1");
      }
    }

    expect(missingTables, `缺失表: ${JSON.stringify(missingTables)}`).toEqual([]);
    expect(extraTables, `新增表: ${JSON.stringify(extraTables)}`).toEqual([]);
    expect(fieldMismatches, `字段不一致: ${JSON.stringify(fieldMismatches)}`).toEqual([]);
  });
});

describe("E 文件查看/编辑弹窗头表补全", () => {
  function parseESectionsForTest(text: string): Record<string, { columns: string[]; rows: Array<Record<string, string>> }> {
    const sections: Record<string, { columns: string[]; rows: Array<Record<string, string>> }> = {};
    const sectionPattern = /<([^/][^>]*)>\s*\r?\n@ ([^\r\n]+)\r?\n([\s\S]*?)<\/\1>/g;
    for (const match of text.matchAll(sectionPattern)) {
      const [, sectionName, header, body] = match;
      const columns = header.trim().split(/\s+/);
      const rows = body.split("\n")
        .filter((line) => line.trim().startsWith("#"))
        .map((line) => {
          const values = line.replace(/^#\s*/, "").trim().split(/\s+/);
          return Object.fromEntries(columns.map((column, index) => [column, values[index] ?? ""]));
        });
      sections[sectionName] = { columns, rows };
    }
    return sections;
  }

  test("头表记录与导出文件逐值一致，且按导出顺序排列", () => {
    const templateText = readFileSync(new URL("../public/e-templates/sgcc.e", import.meta.url), "utf8");
    const templateSections = parseEDeviceDefinitionFile(templateText);
    const libraryTemplates = DEVICE_LIBRARY;
    const result = applyEDeviceDefinitionSectionsToLibraryState({
      sections: templateSections,
      libraryTemplates,
      deviceDefinitionOverrides: {},
      eDeviceDefinitionLabels: {},
      eDeviceDefinitionClassExportEnabled: {},
      deviceDefinitionKeyForTemplate,
      deviceDefinitionOverrideForTemplate,
      resolveDefinitionComponentLibrary: resolveTemplateComponentLibrary
    });
    const exportOptions = buildEFileExportOptionsFromLibrary({
      libraryTemplates,
      eDeviceDefinitionLabels: result.eDeviceDefinitionLabels,
      eDeviceDefinitionClassExportEnabled: result.eDeviceDefinitionClassExportEnabled,
      eDeviceDefinitionFieldOrder: result.eDeviceDefinitionFieldOrder,
      eDeviceDefinitionTemplateFields: result.eDeviceDefinitionTemplateFields,
      resolveDefinitionComponentLibrary: resolveTemplateComponentLibrary
    });

    const nodes = [
      createDefaultNode("ac-source", { x: 100, y: 100 }),
      createDefaultNode("ac-load", { x: 220, y: 100 }),
      createDefaultNode("ac-line", { x: 340, y: 100 }),
      createDefaultNode("ac-transformer", { x: 460, y: 100 })
    ];
    const project: any = {
      version: 1,
      name: "头表补全测试",
      nodes,
      edges: [],
      powerBaseValue: 100,
      subcontrolarea: "测试区域",
      substation: "测试厂站"
    };

    const records = buildEDeviceRecords(project, exportOptions);
    const headerRecords = buildEDeviceHeaderParameterRecords(project, records, exportOptions, ["默认方案"]);

    // 头表齐全：basevalue + basevoltage + subcontrolarea + substation
    const headerSections = headerRecords.map((record) => record.section);
    expect(headerSections[0]).toBe("basevalue");
    expect(headerSections.filter((section) => section === "basevoltage").length).toBeGreaterThanOrEqual(2);
    expect(headerSections).toContain("subcontrolarea");
    expect(headerSections).toContain("substation");

    // 与导出文件逐表逐行逐值一致
    const payload = parseESectionsForTest(buildEFileExport(project, ["默认方案"], exportOptions).text);
    const headerBySection: Record<string, any[]> = {};
    for (const record of headerRecords) {
      (headerBySection[record.section] ??= []).push(record);
    }
    for (const [section, list] of Object.entries(headerBySection)) {
      const exported = payload[section];
      expect(exported, `导出文件应有 ${section} 表`).toBeDefined();
      expect(exported.rows, `${section} 行数应与导出一致`).toHaveLength(list.length);
      list.forEach((record, rowIndex) => {
        for (const [key, value] of Object.entries(record.params)) {
          expect(String(value), `${section} 第${rowIndex + 1}行 ${key} 应与导出一致`).toBe(exported.rows[rowIndex][key]);
        }
      });
    }

    // 编辑器 Tab 顺序 = 头表在前 + 设备表按 E_SECTION_OUTPUT_ORDER（与导出文件一致）
    const ordered = [...headerRecords, ...orderEDeviceRecordsForExport(records)];
    const tabSections = Array.from(new Set(ordered.map((record) => record.section)));
    expect(tabSections[0]).toBe("basevalue");
    expect(tabSections.indexOf("basevalue")).toBeLessThan(tabSections.indexOf("ACNode"));
    expect(tabSections.indexOf("ACNode")).toBeLessThan(tabSections.indexOf("ACBranch"));
    expect(tabSections.indexOf("ACBranch")).toBeLessThan(tabSections.indexOf("ACLoad"));
    expect(tabSections.indexOf("ACLoad")).toBeLessThan(tabSections.indexOf("ACGenerator"));
  });
});
