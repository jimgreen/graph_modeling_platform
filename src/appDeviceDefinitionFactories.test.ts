import { describe, expect, test, vi } from "vitest";

import {
  createComputeStateIconDrawingSmartAlignmentSnap,
  createFindEditableRouteSegmentIndex,
  createRouteSegmentPointerDistance,
  createSaveCustomDeviceTemplate,
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

describe("manual bend interaction helpers", () => {
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
