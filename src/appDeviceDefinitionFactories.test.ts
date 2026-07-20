import { afterEach, describe, expect, test, vi } from "vitest";
import { readFileSync } from "node:fs";

import {
  createSyncExistingNodesWithTemplateDefinitions
} from "./appExtracted/appGraphMeasurementFactories";
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
  applyEDeviceDefinitionSectionsToLibraryState,
  buildEDeviceInterfaceDefinitionRows,
  createExportEDeviceDefinitionFile,
  createRouteSegmentPointerDistance,
  createResolveDuplicateModelImport,
  createSaveBuiltinDeviceDefinitionFromCustomDraft,
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
import { applyDeviceTemplateDefinitionOverride, Point, templateDerivedComponentLibraryInfo } from "./model";
import { stateIconDrawingToImage } from "./stateIconDrawing";

afterEach(() => {
  vi.unstubAllGlobals();
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
    const alert = vi.fn();
    vi.stubGlobal("window", { alert });
    const writeOperationLog = vi.fn();
    const complete = createCompleteImportedModelFeedback({ writeOperationLog });

    complete({ successMessage: "导入完成", warnings: ["第一条", "第二条"] });

    expect(writeOperationLog).toHaveBeenNthCalledWith(1, "SVG 导入警告：第一条");
    expect(writeOperationLog).toHaveBeenNthCalledWith(2, "SVG 导入警告：第二条");
    expect(alert).toHaveBeenCalledWith("导入完成");
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
      const match = /\/api\/images\/([^/?#]+)/.exec(href);
      return match ? decodeURIComponent(match[1]) : "";
    };
    const hrefById = createSvgExportReferencedImageHrefById({
      backendImageIdFromHref,
      canvasBackgroundImage: "/api/images/current-canvas-bg",
      canvasBackgroundImageAssetId: "",
      canvasBackgroundImageUrl: "",
      backgroundPageRender: {
        backgroundImageUrl: "/api/images/background-page-bg",
        nodes: [
          {
            kind: "background-kind",
            params: {
              backgroundImageAssetId: "background-node-bg-asset",
              foregroundImageAssetId: "background-node-fg-asset",
              backgroundImage: "/api/images/background-node-bg",
              foregroundImage: "/api/images/background-node-fg",
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
            backgroundImage: "/api/images/current-node-bg",
            foregroundImage: "",
            backgroundImageAssetId: "",
            foregroundImageAssetId: ""
          }
        }
      ],
      resolveDeviceStateVisual: (_template: any, node: any) => node.kind === "background-kind"
        ? { image: "/api/images/background-state-visual" }
        : { image: "/api/images/current-state-visual" },
      resolveStateVisualImageHref: (visual: any) => visual?.image ?? ""
    })();

    expect(hrefById.get("current-canvas-bg")).toBe("/api/images/current-canvas-bg");
    expect(hrefById.get("current-node-bg")).toBe("/api/images/current-node-bg");
    expect(hrefById.get("current-state-visual")).toBe("/api/images/current-state-visual");
    expect(hrefById.get("background-page-bg")).toBe("/api/images/background-page-bg");
    expect(hrefById.get("background-node-bg-asset")).toBe("/api/images/background-node-bg-asset");
    expect(hrefById.get("background-node-fg-asset")).toBe("/api/images/background-node-fg-asset");
    expect(hrefById.get("background-node-bg")).toBe("/api/images/background-node-bg");
    expect(hrefById.get("background-node-fg")).toBe("/api/images/background-node-fg");
    expect(hrefById.get("background-state-visual")).toBe("/api/images/background-state-visual");
  });

  test("collects backend images nested inside svg data urls for standalone svg export", () => {
    const backendImageIdFromHref = (href: string) => {
      const match = /^\/api\/images\/([^/?#]+)/.exec(href);
      return match ? decodeURIComponent(match[1]) : "";
    };
    const nestedSvg = [
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 160">',
      '<image href="/api/images/nested-photo" x="0" y="0" width="240" height="160"/>',
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

    expect(hrefById.get("nested-photo")).toBe("/api/images/nested-photo");
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
        parameterDefinitions,
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
      parameterDefinitions,
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

    expect(nextOverrides).toHaveProperty("ac-hydro-source");
    expect(nextOverrides).not.toHaveProperty("ACGenerator");
    expect(nextOverrides["ac-hydro-source"]).toMatchObject({
      kind: "ac-hydro-source",
      params: {
        component_type: "ACGenerator",
        derived_component_type: "ACHydroGen",
        derived_from_component_type: "ACGenerator",
        derived_component_library_label: "交流水电",
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

    expect(nextOverrides["ac-hydro-source"].parameterDefinitions.map((row: any) => row.enName)).toEqual([
      "hydroUnitModel",
      "ownerName"
    ]);
    expect(nextOverrides["ac-hydro-source"].params).toMatchObject({
      hydroUnitModel: "300 MW混流式机组",
      ownerName: "示例业主"
    });
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
        { id: "asset-1", name: "背景图", url: "/api/images/asset-1", mimeType: "image/png" }
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
      backgroundImage: "/api/images/asset-1",
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
      allowResizeTransform: "0",
      terminalCount: 1,
      terminalTypes: ["ac"],
      terminalLabels: ["交流发电机端"],
      terminalAnchors: [{ x: -0.5, y: 0 }],
      terminalRoles: ["single-source"],
      terminalAssociations: ["ac-generator"],
      isContainer: false,
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
      customComponentLibraries: [],
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
      isValidComponentLibraryName: (name: string) => /^[A-Za-z][A-Za-z0-9_]*$/.test(name),
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

    expect(saved).toBe(true);
    expect(customDefaultDefinitions).toHaveBeenCalledWith(["ac"], expect.objectContaining({
      isDerivedComponentLibrary: true
    }));
    expect(savedTemplates[0]).toMatchObject({
      kind: "custom-user-wind-generator",
      label: "用户风电机组",
      categoryLibrary: "交流设备",
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
    expect(savedTemplates[0]).not.toHaveProperty("derivedComponentLibraryLabel");
    expect(savedTemplates[0].params).not.toHaveProperty("derived_component_library_label");
    expect(savedTemplates[0].parameterDefinitions.map((row: any) => row.enName)).toEqual(["installedCapacity"]);
    expect(setCustomComponentLibraries).not.toHaveBeenCalled();
    expect(scope.ensureCustomComponentTreeExpanded).toHaveBeenCalledWith("交流设备", "ACGenerator");
    expect(scope.setCustomComponentTreeSelection).toHaveBeenCalledWith({
      kind: "component",
      categoryLibraryName: "交流设备",
      section: "ACGenerator",
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
      customComponentLibraries: [],
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
      isValidComponentLibraryName: (name: string) => /^[A-Za-z][A-Za-z0-9_]*$/.test(name),
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
      componentName: "柴油发电机",
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
      isValidComponentLibraryName: (name: string) => /^[A-Za-z][A-Za-z0-9_]*$/.test(name),
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
      isDerivedComponentLibrary: true,
      derivedFromComponentLibrary: "ACGenerator",
      derivedComponentLibrary: "UserDieselGen",
      params: {
        component_type: "ACGenerator",
        derived_from_component_type: "ACGenerator",
        derived_component_type: "UserDieselGen",
        is_derived_component_library: "1"
      }
    });
    expect(savedOverrides["ac-diesel-source"]).not.toHaveProperty("derivedComponentLibraryLabel");
    expect(savedOverrides["ac-diesel-source"].params).not.toHaveProperty("derived_component_library_label");
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
      isValidComponentLibraryName: (name: string) => /^[A-Za-z][A-Za-z0-9_]*$/.test(name),
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

  test("creating a component from the dialog initializes derived-class metadata", () => {
    let customDeviceDraft: any = {
      categoryLibraryName: "交流设备",
      componentLibrary: "ACGenerator",
      componentName: "",
      error: ""
    };
    let customLibraryCreateDialog: any = {
      kind: "component",
      title: "新建元件",
      cnName: "用户风电机组",
      enName: "custom-user-wind-generator",
      categoryLibraryName: "交流设备",
      componentLibrary: "ACGenerator",
      isDerivedComponentLibrary: true,
      derivedFromComponentLibrary: "ACGenerator",
      derivedComponentLibrary: "UserWindGen",
      derivedComponentLibraryLabel: "",
      error: ""
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
      isValidComponentLibraryName: (name: string) => /^[A-Za-z][A-Za-z0-9_]*$/.test(name),
      libraryTemplates: [],
      normalizeCategoryLibraryName: (name: string) => name.trim(),
      normalizeComponentLibraryName: (name: string) => name.trim(),
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
      setCustomDeviceStatePageId,
      setCustomLibraryCreateDialog: (updater: any) => {
        customLibraryCreateDialog = typeof updater === "function" ? updater(customLibraryCreateDialog) : updater;
      },
      setEditingCustomDeviceKind: vi.fn(),
      setExpandedCategoryLibraries: vi.fn(),
      setSelectedDefinitionKind: vi.fn()
    };

    const created = createConfirmCustomLibraryCreateDialog(scope)();

    expect(created).toBe(true);
    expect(setCustomDeviceDefinitionMode).toHaveBeenCalledWith("create");
    expect(setCustomDeviceDialogView).toHaveBeenCalledWith("icon");
    expect(setCustomDeviceStatePageId).toHaveBeenCalledWith("default");
    expect(setCustomComponentTreeSelection).toHaveBeenCalledWith({
      kind: "componentLibrary",
      categoryLibraryName: "交流设备",
      section: "ACGenerator"
    });
    expect(customDeviceDraft).toMatchObject({
      categoryLibraryName: "交流设备",
      componentLibrary: "ACGenerator",
      componentName: "用户风电机组",
      componentKind: "custom-user-wind-generator",
      isDerivedComponentLibrary: true,
      derivedFromComponentLibrary: "ACGenerator",
      derivedComponentLibrary: "UserWindGen",
      derivedComponentLibraryLabel: "",
      isContainer: false,
      error: ""
    });
    expect(setCustomDeviceDraftCleanBaseline).toHaveBeenCalledWith(expect.objectContaining({
      isDerivedComponentLibrary: true,
      derivedComponentLibrary: "UserWindGen",
      isContainer: false
    }));
    expect(customLibraryCreateDialog).toBeNull();
  });

  test("opening the new component dialog carries derived-class creation defaults", () => {
    let customLibraryCreateDialog: any = null;
    const scope = {
      customComponentTreeSelection: {
        kind: "componentLibrary",
        categoryLibraryName: "交流设备",
        section: "ACGenerator"
      },
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
      componentLibrary: "ACGenerator",
      isDerivedComponentLibrary: false,
      derivedFromComponentLibrary: "ACGenerator",
      derivedComponentLibrary: "",
      derivedComponentLibraryLabel: ""
    });
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
      setCustomDeviceDialogView: vi.fn(),
      setCustomDeviceDraft: (updater: any) => {
        customDeviceDraft = typeof updater === "function" ? updater(customDeviceDraft) : updater;
      },
      setCustomDeviceStatePageId: vi.fn(),
      setEditingCustomDeviceKind: vi.fn()
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
  });

  test("custom-device form exposes only the derived-class english name separately from the container flag", () => {
    const appViewSource = readFileSync(new URL("./appExtracted/appView.tsx", import.meta.url), "utf8");

    expect(appViewSource).toContain("custom-library-create-derived-field");
    expect(appViewSource).toContain("custom-device-derived-field");
    expect(appViewSource).not.toContain("custom-device-derived-cn-field");
    expect(appViewSource).toContain("custom-device-derived-en-field");
    expect(appViewSource).not.toContain("disabled={customDeviceDraft.isDerivedComponentLibrary}");
    expect(appViewSource).not.toContain("customDeviceDraft.isDerivedComponentLibrary || customDeviceDraft.isContainer");
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
          backgroundImage: "/api/images/bg-1",
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
    expect(savedSvg).toContain('href="/api/images/bg-1"');
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
        exportName: "rated-power"
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

    expect(message).toContain("属性第 1 行：导出名称 rated-power 只能包含英文字母、数字和下划线，且必须以英文字母开头。");
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
      deviceDefinitionOverrideForTemplate: (_template: any, overrides: any) => overrides[_template.params.component_type],
      resolveDefinitionComponentLibrary: (template: any) => template.params.component_type
    });

    expect(result.eDeviceDefinitionLabels).toEqual({ ACLoad: "LoadTable" });
    expect(result.eDeviceDefinitionClassExportEnabled).toEqual({ ACLoad: true, DCLoad: false });
    expect(result.deviceDefinitionOverrides.ACLoad.parameterDefinitions).toEqual(expect.arrayContaining([
      expect.objectContaining({ enName: "p", exportEnabled: true, exportName: "p_custom" }),
      expect.objectContaining({ enName: "q", exportEnabled: false, exportName: "q_old" })
    ]));
    expect(result.customDeviceTemplates[0].parameterDefinitions).toEqual(expect.arrayContaining([
      expect.objectContaining({ enName: "p", exportEnabled: false, exportName: "p" })
    ]));
    expect(result.matched).toEqual(["ACLoad"]);
    expect(result.skipped).toEqual(["DCLoad"]);
  });
});

describe("buildEDeviceInterfaceDefinitionRows", () => {
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
      "control_type",
      "p_set",
      "q_set",
      "v_set",
      "alpha"
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
      "run_stat"
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

describe("createExportEDeviceDefinitionFile", () => {
  const buildTemplate = (kind: string, componentType: string, parameterDefinitions: any[]) => ({
    kind,
    label: "自定义负荷",
    categoryLibrary: "用户库",
    params: { component_type: componentType },
    parameterDefinitions
  });

  test("exports enabled fields from library templates covering both custom and built-in devices", async () => {
    const alert = vi.fn();
    vi.stubGlobal("window", { alert });
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
    expect(alert).toHaveBeenCalledWith(expect.stringContaining("导出成功"));
  });

  test("exports params whose export flag is inferred from E section when exportEnabled is undefined", async () => {
    const alert = vi.fn();
    vi.stubGlobal("window", { alert });
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
    const alert = vi.fn();
    vi.stubGlobal("window", { alert });
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
    expect(alert).toHaveBeenCalledWith("没有可导出的元件定义：所有元件均未勾选导出字段。");
  });
});
