import { describe, expect, test } from "vitest";

import {
  DEFAULT_STATE_NAME,
  DEFAULT_STATE_PAGE_ID,
  DEFAULT_STATE_VALUE,
  appendNonDefaultStateDraftRow,
  createEditableStateIconElementsFromSvgSource,
  createImportedStateIconElement,
  createStateIconDrawingElement,
  createStateDraftRow,
  createStateDraftRowFromDefaultVisual,
  createStateIconDrawingElementFromGeneratedGroupMarkup,
  defaultStateDraftRow,
  isDefaultStatePageId,
  nextNonDefaultStateIndex,
  nonDefaultStateDraftRows,
  normalizeStatePageId,
  stateVisualShapeLabel,
  svgSourceFromDataUrl,
  stateIconDrawingPreviewNeedsDirectElementRender,
  stateIconDrawingToImage,
  upsertDefaultStateDraftRow
} from "./stateIconDrawing";
import { DEVICE_LIBRARY } from "./model";
import { APP_STATIC_SCOPE } from "./appExtracted/appStaticScope";
import {
  createAddCustomDeviceStateDraftRow,
  createAddStateIconDrawingElement,
  createAddDefinitionStateDraftRow,
  createStateIconDrawingKeyDown,
  createStateIconDrawingElementFromStaticTemplate,
  createCustomDeviceDefaultStateVisualDraft,
  createSelectCustomComponentTemplate
} from "./appExtracted/appDeviceDefinitionFactories";
import { createCustomDeviceDraftFromTemplate, generateCustomDeviceImage, resolveTemplateComponentType } from "./customDeviceUtils";

describe("default device state draft rows", () => {
  test("uses a synthetic default row when no state definitions exist", () => {
    const row = defaultStateDraftRow([], { image: "default.svg" });

    expect(row.id).toBe(DEFAULT_STATE_PAGE_ID);
    expect(row.value).toBe(DEFAULT_STATE_VALUE);
    expect(row.name).toBe(DEFAULT_STATE_NAME);
    expect(row.image).toBe("default.svg");
  });

  test("keeps the first state definition as the editable default state", () => {
    const first = createStateDraftRow({ value: "1", name: "运行", image: "run.svg" });
    const second = createStateDraftRow({ value: "0", name: "停运" });
    const row = defaultStateDraftRow([first, second], { image: "fallback.svg" });

    expect(row.id).toBe(first.id);
    expect(row.value).toBe("1");
    expect(row.name).toBe("运行");
    expect(row.image).toBe("run.svg");
    expect(nonDefaultStateDraftRows([first, second])).toEqual([second]);
    expect(normalizeStatePageId([first, second], first.id)).toBe(DEFAULT_STATE_PAGE_ID);
  });

  test("inherits the default visual when the first state has no explicit icon", () => {
    const first = createStateDraftRow({ value: "0", name: "默认" });
    const row = defaultStateDraftRow([first], {
      image: "default.svg",
      text: "D",
      strokeColor: "#123456"
    });

    expect(row.value).toBe("0");
    expect(row.name).toBe("默认");
    expect(row.image).toBe("default.svg");
    expect(row.text).toBe("D");
    expect(row.strokeColor).toBe("#123456");
  });

  test("upserts the default row before non-default state pages", () => {
    const second = createStateDraftRow({ value: "1", name: "状态1" });
    const withDefault = appendNonDefaultStateDraftRow([], { image: "default.svg" }, second);
    const updated = upsertDefaultStateDraftRow(withDefault, { image: "fallback.svg" }, { value: "2", name: "默认运行" });

    expect(withDefault).toHaveLength(2);
    expect(withDefault[0].value).toBe(DEFAULT_STATE_VALUE);
    expect(withDefault[0].name).toBe(DEFAULT_STATE_NAME);
    expect(withDefault[0].image).toBe("default.svg");
    expect(withDefault[1]).toBe(second);
    expect(updated[0].id).toBe(withDefault[0].id);
    expect(updated[0].value).toBe("2");
    expect(updated[0].name).toBe("默认运行");
    expect(updated[1]).toBe(second);
  });

  test("numbers new states from state 1 and copies the default state visual", () => {
    const defaultRow = createStateDraftRow({
      value: "0",
      name: "状态0",
      image: "default-state.svg",
      text: "默认",
      strokeColor: "#0f172a"
    });
    const firstIndex = nextNonDefaultStateIndex([defaultRow]);
    const firstState = createStateDraftRowFromDefaultVisual(defaultStateDraftRow([defaultRow]), {
      value: String(firstIndex),
      name: `状态${firstIndex}`
    });
    const secondIndex = nextNonDefaultStateIndex([defaultRow, firstState]);

    expect(firstIndex).toBe(1);
    expect(firstState.value).toBe("1");
    expect(firstState.name).toBe("状态1");
    expect(firstState.image).toBe("default-state.svg");
    expect(firstState.text).toBe("默认");
    expect(firstState.strokeColor).toBe("#0f172a");
    expect(secondIndex).toBe(2);
  });

  test("selecting a state icon drawing tool does not add an element until the canvas is clicked", () => {
    let dialog: any = {
      target: { scope: "definition", rowId: DEFAULT_STATE_PAGE_ID },
      elements: [],
      selectedElementId: "",
      selectedElementIds: []
    };
    const addElement = createAddStateIconDrawingElement({
      createStateIconDrawingElement,
      customDeviceDefaultStateVisualDraft: () => ({}),
      customDeviceDraft: { stateDefinitions: [] },
      defaultStateDraftRow,
      definitionDefaultStateVisualDraft: () => ({}),
      definitionStateDraftRows: [],
      isDefaultStatePageId,
      setStateIconDrawingContextMenu: () => {},
      setStateIconDrawingDialog: (updater: any) => {
        dialog = typeof updater === "function" ? updater(dialog) : updater;
      },
      stateIconDrawingHistoryRef: { current: [] }
    });

    addElement("rectangle" as any);

    expect(dialog.elements).toEqual([]);
    expect(dialog.elementLibraryTab).toBe("basic");
    expect(dialog.pendingElementKind).toBe("rectangle");
    expect(dialog.drawingDraft).toBeUndefined();
  });

  test("selecting a built-in state icon tool clears the pending static template", () => {
    let dialog: any = {
      target: { scope: "definition", rowId: DEFAULT_STATE_PAGE_ID },
      elements: [],
      selectedElementId: "",
      selectedElementIds: [],
      pendingStaticTemplate: { kind: "static-rect", label: "方框" }
    };
    const addElement = createAddStateIconDrawingElement({
      setStateIconDrawingContextMenu: () => {},
      setStateIconDrawingDialog: (updater: any) => {
        dialog = typeof updater === "function" ? updater(dialog) : updater;
      }
    });

    addElement("circle" as any);

    expect(dialog.elements).toEqual([]);
    expect(dialog.elementLibraryTab).toBe("basic");
    expect(dialog.pendingElementKind).toBe("circle");
    expect(dialog.pendingStaticTemplate).toBeUndefined();
    expect(dialog.drawingDraft).toBeUndefined();
  });

  test("pressing Enter commits an in-progress state icon polyline drawing", () => {
    const polyline = createStateIconDrawingElement("polyline" as any);
    let prevented = false;
    let contextMenuCleared = false;
    let dialog: any = {
      target: { scope: "definition", rowId: DEFAULT_STATE_PAGE_ID },
      elements: [],
      selectedElementId: "",
      selectedElementIds: [],
      pendingElementKind: "polyline",
      drawingDraft: {
        kind: "polyline",
        start: { x: 20, y: 24 },
        current: { x: 120, y: 80 },
        points: [
          { x: 20, y: 24 },
          { x: 78, y: 40 }
        ],
        element: polyline
      }
    };
    const handleKeyDown = createStateIconDrawingKeyDown({
      deleteSelectedStateIconDrawingElements: () => {},
      setStateIconDrawingContextMenu: (next: any) => {
        contextMenuCleared = next === null;
      },
      setStateIconDrawingDialog: (updater: any) => {
        dialog = typeof updater === "function" ? updater(dialog) : updater;
      },
      stateIconDrawingClipboardRef: { current: [] },
      stateIconDrawingDialog: dialog,
      stateIconDrawingElementId: () => "copied",
      stateIconDrawingHistoryRef: { current: [] }
    });

    handleKeyDown({
      key: "Enter",
      ctrlKey: false,
      metaKey: false,
      target: null,
      preventDefault: () => {
        prevented = true;
      }
    } as any);

    expect(prevented).toBe(true);
    expect(contextMenuCleared).toBe(true);
    expect(dialog.elements).toHaveLength(1);
    expect(dialog.elements[0].kind).toBe("polyline");
    expect(dialog.elements[0].points).toHaveLength(3);
    expect(dialog.selectedElementId).toBe(polyline.id);
    expect(dialog.selectedElementIds).toEqual([polyline.id]);
    expect(dialog.pendingElementKind).toBeUndefined();
    expect(dialog.drawingDraft).toBeUndefined();
  });

  test("converts model static templates into reusable state icon drawing elements", () => {
    const staticTextTemplate = DEVICE_LIBRARY.find((item) => item.kind === "static-text");
    const staticButtonTemplate = DEVICE_LIBRARY.find((item) => item.kind === "static-button");
    expect(staticTextTemplate).toBeTruthy();
    expect(staticButtonTemplate).toBeTruthy();
    if (!staticTextTemplate || !staticButtonTemplate) {
      return;
    }
    const renderedSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="160" viewBox="0 0 240 160"><rect x="20" y="20" width="200" height="120"/></svg>`;
    const scope = {
      createImportedStateIconElement,
      createStateIconDrawingElement,
      createTemplateDefaultStateIconImage: () => `data:image/svg+xml;utf8,${encodeURIComponent(renderedSvg)}`,
      svgSourceFromDataUrl
    };

    const textElement = createStateIconDrawingElementFromStaticTemplate(scope, staticTextTemplate);
    const buttonElement = createStateIconDrawingElementFromStaticTemplate(scope, staticButtonTemplate);

    expect(textElement.kind).toBe("text");
    expect(textElement.text).toBe("文字");
    expect(textElement.width).toBe(staticTextTemplate.size.width);
    expect(textElement.height).toBe(staticTextTemplate.size.height);
    expect(buttonElement.kind).toBe("imported-svg");
    expect(buttonElement.svgSource).toContain("<rect");
    expect(buttonElement.width).toBe(staticButtonTemplate.size.width);
    expect(buttonElement.height).toBe(staticButtonTemplate.size.height);
  });

  test("uses the selected template glyph instead of the generated placeholder for an edited component default state", () => {
    const template = DEVICE_LIBRARY.find((item) => item.kind === "ac-load");
    expect(template).toBeTruthy();
    if (!template) {
      return;
    }
    const customDeviceDraft = createCustomDeviceDraftFromTemplate(template);
    const terminalTypes = customDeviceDraft.terminalTypes.slice(0, customDeviceDraft.terminalCount);
    const placeholderImage = generateCustomDeviceImage(template.label, terminalTypes);
    const defaultVisual = createCustomDeviceDefaultStateVisualDraft({
      ...APP_STATIC_SCOPE,
      customDeviceDraft,
      customDevicePreviewLabel: template.label,
      customDraftTerminalTypes: terminalTypes,
      selectedCustomComponentTemplate: template,
      selectedDefinitionTemplate: template,
      colorDisplayMode: "energy"
    })();

    expect(defaultVisual.image).toMatch(/^data:image\/svg\+xml/);
    expect(defaultVisual.image).not.toBe(placeholderImage);
  });

  test("selecting a component template immediately replaces the edited device draft", () => {
    const staticTextTemplate = DEVICE_LIBRARY.find((item) => item.kind === "static-text");
    const hydrogenCompressorTemplate = DEVICE_LIBRARY.find((item) => item.kind === "hydrogen-compressor");
    expect(staticTextTemplate).toBeTruthy();
    expect(hydrogenCompressorTemplate).toBeTruthy();
    if (!staticTextTemplate || !hydrogenCompressorTemplate) {
      return;
    }

    let draft = createCustomDeviceDraftFromTemplate(staticTextTemplate);
    let treeSelection: any = { kind: "component", attributeLibraryName: staticTextTemplate.attributeLibrary, section: "StaticTextSymbol", templateKind: staticTextTemplate.kind };
    let selectedDefinitionKind = staticTextTemplate.kind;
    let definitionDraftSection = "StaticTextSymbol";
    let editingCustomDeviceKind = "";
    let customDeviceStatePageId = "old";
    let saveMessage = "old message";
    const expandedRequests: Array<[string, string]> = [];
    const pendingFrames: Array<() => void> = [];
    const previousWindow = (globalThis as any).window;
    (globalThis as any).window = {
      requestAnimationFrame: (callback: () => void) => {
        pendingFrames.push(callback);
        return pendingFrames.length;
      },
      cancelAnimationFrame: () => {}
    };

    try {
      const selectTemplate = createSelectCustomComponentTemplate({
        DEFAULT_STATE_PAGE_ID,
        createCustomDeviceDraftFromTemplate,
        customComponentSelectionFrameRef: { current: null },
        customComponentSelectionRequestRef: { current: 0 },
        customDeviceDefinitionMode: "edit",
        ensureCustomComponentTreeExpanded: (attributeLibraryName: string, section: string) => {
          expandedRequests.push([attributeLibraryName, section]);
        },
        normalizeAttributeLibraryName: (value: string) => value,
        normalizeComponentTypeName: (value: string) => value,
        resolveTemplateComponentType,
        setCustomComponentTreeSelection: (next: any) => {
          treeSelection = next;
        },
        setCustomDeviceDraft: (next: any) => {
          draft = typeof next === "function" ? next(draft) : next;
        },
        setCustomDeviceSaveMessage: (next: string) => {
          saveMessage = next;
        },
        setCustomDeviceStatePageId: (next: any) => {
          customDeviceStatePageId = typeof next === "function" ? next(customDeviceStatePageId) : next;
        },
        setDefinitionDraftSection: (next: string) => {
          definitionDraftSection = next;
        },
        setEditingCustomDeviceKind: (next: any) => {
          editingCustomDeviceKind = typeof next === "function" ? next(editingCustomDeviceKind) : next;
        },
        setSelectedDefinitionKind: (next: any) => {
          selectedDefinitionKind = next;
        },
        startCustomComponentSelectionTransition: (callback: () => void) => callback()
      });

      selectTemplate(hydrogenCompressorTemplate);

      expect(pendingFrames).toHaveLength(0);
      expect(saveMessage).toBe("");
      expect(expandedRequests).toEqual([["氢能设备", "HydroCompressor"]]);
      expect(selectedDefinitionKind).toBe("hydrogen-compressor");
      expect(definitionDraftSection).toBe("HydroCompressor");
      expect(treeSelection).toEqual({
        kind: "component",
        attributeLibraryName: "氢能设备",
        section: "HydroCompressor",
        templateKind: "hydrogen-compressor"
      });
      expect(editingCustomDeviceKind).toBe("");
      expect(customDeviceStatePageId).toBe(DEFAULT_STATE_PAGE_ID);
      expect(draft.componentName).toBe("氢压机");
      expect(draft.componentType).toBe("HydroCompressor");
      expect(draft.terminalCount).toBe(2);
    } finally {
      if (previousWindow === undefined) {
        delete (globalThis as any).window;
      } else {
        (globalThis as any).window = previousWindow;
      }
    }
  });

  test("adds a custom component state from the latest default state icon", () => {
    const staleDefaultRow = createStateDraftRow({ value: "0", name: "状态0", image: "old-default.svg" });
    const latestDefaultRow = createStateDraftRow({ value: "0", name: "状态0", image: "latest-default.svg" });
    let draft: any = {
      stateDefinitions: [latestDefaultRow],
      error: "old error"
    };
    let activePageId = "";
    const addState = createAddCustomDeviceStateDraftRow({
      appendNonDefaultStateDraftRow,
      createStateDraftRowFromDefaultVisual,
      customDeviceDefaultStateVisualDraft: () => ({ image: "fallback-default.svg" }),
      customDeviceDraft: {
        stateDefinitions: [staleDefaultRow]
      },
      defaultStateDraftRow,
      nextNonDefaultStateIndex,
      setCustomDeviceDraft: (updater: any) => {
        draft = updater(draft);
      },
      setCustomDeviceStatePageId: (rowId: string) => {
        activePageId = rowId;
      },
      stateDraftRowId: () => "state-new"
    });

    addState();

    expect(draft.stateDefinitions).toHaveLength(2);
    expect(draft.stateDefinitions[1]).toMatchObject({
      id: "state-new",
      value: "1",
      name: "状态1",
      image: "latest-default.svg"
    });
    expect(draft.error).toBe("");
    expect(activePageId).toBe("state-new");
  });

  test("adds a definition state from the latest default state icon", () => {
    const staleDefaultRow = createStateDraftRow({ value: "0", name: "状态0", image: "old-definition.svg" });
    const latestDefaultRow = createStateDraftRow({ value: "0", name: "状态0", image: "latest-definition.svg" });
    let rows = [latestDefaultRow];
    let activePageId = "";
    let draftError = "old error";
    const addState = createAddDefinitionStateDraftRow({
      appendNonDefaultStateDraftRow,
      createStateDraftRowFromDefaultVisual,
      defaultStateDraftRow,
      definitionDefaultStateVisualDraft: () => ({ image: "fallback-definition.svg" }),
      definitionStateDraftRows: [staleDefaultRow],
      nextNonDefaultStateIndex,
      setDefinitionDraftError: (next: string) => {
        draftError = next;
      },
      setDefinitionStateDraftRows: (updater: any) => {
        rows = updater(rows);
      },
      setDefinitionStatePageId: (rowId: string) => {
        activePageId = rowId;
      },
      stateDraftRowId: () => "definition-state-new"
    });

    addState();

    expect(rows).toHaveLength(2);
    expect(rows[1]).toMatchObject({
      id: "definition-state-new",
      value: "1",
      name: "状态1",
      image: "latest-definition.svg"
    });
    expect(draftError).toBe("");
    expect(activePageId).toBe("definition-state-new");
  });

  test("adds a custom component state from the active default icon drawing", () => {
    const oldDefaultRow = createStateDraftRow({ value: "0", name: "状态0", image: "old-default.svg" });
    let draft: any = {
      stateDefinitions: [oldDefaultRow],
      error: "old error"
    };
    let activePageId = "";
    const addState = createAddCustomDeviceStateDraftRow({
      appendNonDefaultStateDraftRow,
      createStateDraftRowFromDefaultVisual,
      customDeviceDefaultStateVisualDraft: () => ({ image: "fallback-default.svg" }),
      defaultStateDraftRow,
      isDefaultStatePageId,
      nextNonDefaultStateIndex,
      setCustomDeviceDraft: (updater: any) => {
        draft = updater(draft);
      },
      setCustomDeviceStatePageId: (rowId: string) => {
        activePageId = rowId;
      },
      stateDraftRowId: () => "state-from-inline",
      stateIconDrawingDialog: {
        target: { scope: "custom", rowId: DEFAULT_STATE_PAGE_ID }
      },
      stateIconDrawingInlineImage: "inline-default.svg",
      upsertDefaultStateDraftRow
    });

    addState();

    expect(draft.stateDefinitions).toHaveLength(2);
    expect(draft.stateDefinitions[0]).toMatchObject({
      image: "inline-default.svg",
      imageAssetId: "",
      backgroundImage: "",
      backgroundImageAssetId: ""
    });
    expect(draft.stateDefinitions[1]).toMatchObject({
      id: "state-from-inline",
      value: "1",
      name: "状态1",
      image: "inline-default.svg"
    });
    expect(activePageId).toBe("state-from-inline");
  });

  test("adds a definition state from the active default icon drawing", () => {
    const oldDefaultRow = createStateDraftRow({ value: "0", name: "状态0", image: "old-definition.svg" });
    let rows = [oldDefaultRow];
    let activePageId = "";
    const addState = createAddDefinitionStateDraftRow({
      appendNonDefaultStateDraftRow,
      createStateDraftRowFromDefaultVisual,
      defaultStateDraftRow,
      definitionDefaultStateVisualDraft: () => ({ image: "fallback-definition.svg" }),
      isDefaultStatePageId,
      nextNonDefaultStateIndex,
      setDefinitionDraftError: () => {},
      setDefinitionStateDraftRows: (updater: any) => {
        rows = updater(rows);
      },
      setDefinitionStatePageId: (rowId: string) => {
        activePageId = rowId;
      },
      stateDraftRowId: () => "definition-state-from-inline",
      stateIconDrawingDialog: {
        target: { scope: "definition", rowId: DEFAULT_STATE_PAGE_ID }
      },
      stateIconDrawingInlineImage: "inline-definition.svg",
      upsertDefaultStateDraftRow
    });

    addState();

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      image: "inline-definition.svg",
      imageAssetId: "",
      backgroundImage: "",
      backgroundImageAssetId: ""
    });
    expect(rows[1]).toMatchObject({
      id: "definition-state-from-inline",
      value: "1",
      name: "状态1",
      image: "inline-definition.svg"
    });
    expect(activePageId).toBe("definition-state-from-inline");
  });

  test("restores generated imported SVG layers without wrapping the full state canvas", () => {
    const importedElement = {
      ...createImportedStateIconElement(
        "imported-svg",
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="-72 -32 144 64"><rect x="-72" y="-32" width="144" height="64" rx="8" fill="#f8fafc"/><text x="0" y="0">默认图标</text></svg>',
        "默认图标"
      ),
      x: 120,
      y: 80,
      width: 120,
      height: 88,
      rotation: 0
    };
    const imageSource = decodeURIComponent(stateIconDrawingToImage([importedElement]).split(",")[1] ?? "");
    const groupMarkup = imageSource.match(/<g\b[\s\S]*<\/g>/)?.[0] ?? "";

    const restored = createStateIconDrawingElementFromGeneratedGroupMarkup(groupMarkup, "状态0-1");

    expect(restored).toMatchObject({
      kind: "imported-svg",
      x: 120,
      y: 80,
      width: 120,
      height: 88,
      rotation: 0
    });
    expect(restored?.svgSource).toContain('viewBox="-72 -32 144 64"');
    expect(restored?.svgSource).not.toContain('viewBox="0 0 240 160"');
  });

  test("restores a single generated state icon layer without shrinking it", () => {
    const importedElement = {
      ...createImportedStateIconElement(
        "imported-svg",
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="-72 -32 144 64"><rect x="-72" y="-32" width="144" height="64" rx="8" fill="#f8fafc"/><text x="0" y="0">默认图标</text></svg>',
        "默认图标"
      ),
      x: 120,
      y: 80,
      width: 120,
      height: 88,
      rotation: 0
    };
    const imageSource = decodeURIComponent(stateIconDrawingToImage([importedElement]).split(",")[1] ?? "");

    const restored = createEditableStateIconElementsFromSvgSource(imageSource, "状态0");

    expect(restored).toHaveLength(1);
    expect(restored[0]).toMatchObject({
      kind: "imported-svg",
      x: 120,
      y: 80,
      width: 120,
      height: 88,
      rotation: 0
    });
    expect(restored[0].svgSource).toContain('viewBox="-72 -32 144 64"');
    expect(restored[0].svgSource).not.toContain('viewBox="0 0 240 160"');
  });

  test("keeps terminal ownership metadata when saving and restoring generated drawing elements", () => {
    const element = {
      ...createStateIconDrawingElement("circle"),
      id: "terminal-owned-circle",
      x: 120,
      y: 80,
      terminalIndex: 1
    } as any;
    const imageSource = decodeURIComponent(stateIconDrawingToImage([element]).split(",")[1] ?? "");
    const groupMarkup = imageSource.match(/<g\b[\s\S]*<\/g>/)?.[0] ?? "";

    const restored = createStateIconDrawingElementFromGeneratedGroupMarkup(groupMarkup, "端子图案");

    expect(imageSource).toContain('data-terminal-index="1"');
    expect(restored).toMatchObject({
      kind: "circle",
      terminalIndex: 1
    });
  });

  test("keeps terminal ownership metadata when generated layers fall back to imported SVG elements", () => {
    const element = {
      ...createStateIconDrawingElement("line"),
      id: "terminal-owned-line",
      terminalIndex: 0
    } as any;
    const imageSource = decodeURIComponent(stateIconDrawingToImage([element]).split(",")[1] ?? "");

    const restored = createEditableStateIconElementsFromSvgSource(imageSource, "端子线");

    expect(restored).toHaveLength(1);
    expect(restored[0]).toMatchObject({
      kind: "imported-svg",
      terminalIndex: 0
    });
  });

  test("keeps externally imported SVG as one drawing element", () => {
    const imported = createEditableStateIconElementsFromSvgSource(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect x="4" y="4" width="56" height="56"/><circle cx="32" cy="32" r="16"/><text x="32" y="36">A</text></svg>',
      "external.svg",
      { preserveImportedSvg: true }
    );

    expect(imported).toHaveLength(1);
    expect(imported[0]).toMatchObject({
      kind: "imported-svg",
      text: "external.svg"
    });
    expect(imported[0].svgSource).toContain("<rect");
    expect(imported[0].svgSource).toContain("<circle");
    expect(imported[0].svgSource).toContain("<text");
  });

  test("directly renders state icon previews that contain bitmap image layers", () => {
    const line = createStateIconDrawingElement("line");
    const svgLayer = createImportedStateIconElement(
      "imported-svg",
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M4 12h16"/></svg>',
      "line.svg"
    );
    const emptyImage = createImportedStateIconElement("image", "", "empty.png");
    const imageLayer = createImportedStateIconElement("image", "/api/images/icon.png", "icon.png");

    expect(stateIconDrawingPreviewNeedsDirectElementRender([line, svgLayer, emptyImage])).toBe(false);
    expect(stateIconDrawingPreviewNeedsDirectElementRender([line, imageLayer])).toBe(true);
  });

  test("exports configurable endpoint caps for line drawing shapes", () => {
    const elements = (["line", "polyline", "arc", "semicircle"] as const).map((kind, index) => ({
      ...createStateIconDrawingElement(kind),
      id: `cap-${kind}`,
      x: 120,
      y: 30 + index * 34,
      startCap: index % 2 === 0 ? "arrow" as const : "circle" as const,
      endCap: index % 2 === 0 ? "square" as const : "triangle" as const
    }));

    const imageSource = decodeURIComponent(stateIconDrawingToImage(elements).split(",")[1] ?? "");

    expect(imageSource).toContain('id="cap-cap-line-start-arrow"');
    expect(imageSource).toContain('id="cap-cap-line-end-square"');
    expect(imageSource).toContain('id="cap-cap-polyline-start-circle"');
    expect(imageSource).toContain('id="cap-cap-polyline-end-triangle"');
    expect(imageSource).toContain('id="cap-cap-arc-start-arrow"');
    expect(imageSource).toContain('id="cap-cap-arc-end-square"');
    expect(imageSource).toContain('id="cap-cap-semicircle-start-circle"');
    expect(imageSource).toContain('id="cap-cap-semicircle-end-triangle"');
    expect(imageSource).toContain('marker-start="url(#cap-cap-line-start-arrow)"');
    expect(imageSource).toContain('marker-end="url(#cap-cap-semicircle-end-triangle)"');
  });

  test("exports polyline drawing elements with all clicked bend points", () => {
    const element = {
      ...createStateIconDrawingElement("polyline"),
      id: "multi-bend-polyline",
      x: 120,
      y: 80,
      width: 120,
      height: 80,
      points: [
        { x: -0.5, y: -0.5 },
        { x: -0.25, y: 0.25 },
        { x: 0.15, y: -0.15 },
        { x: 0.5, y: 0.5 }
      ]
    } as any;

    const imageSource = decodeURIComponent(stateIconDrawingToImage([element]).split(",")[1] ?? "");

    expect(imageSource).toContain('data-polyline-points="-0.5,-0.5 -0.25,0.25 0.15,-0.15 0.5,0.5"');
    expect(imageSource).toContain('d="M -60 -40 L -30 20 L 18 -12 L 60 40"');
  });

  test("exports fill colors for closed drawing shapes and text boxes", () => {
    const elements = (["circle", "polygon", "ellipse", "text"] as const).map((kind, index) => ({
      ...createStateIconDrawingElement(kind),
      id: `fill-${kind}`,
      x: 60 + index * 36,
      y: 80,
      fillColor: index === 3 ? "#fff4cc" : "#dbeafe",
      strokeColor: "#1d4ed8",
      text: kind === "text" ? "TXT" : kind
    }));

    const imageSource = decodeURIComponent(stateIconDrawingToImage(elements).split(",")[1] ?? "");

    expect(imageSource).toContain('<circle');
    expect(imageSource).toContain('fill="#dbeafe"');
    expect(imageSource).toContain('<ellipse');
    expect(imageSource).toContain('<rect');
    expect(imageSource).toContain('fill="#fff4cc"');
    expect(imageSource).toContain('>TXT</text>');
  });

  test("creates rectangle and square as distinct common drawing shapes", () => {
    const rectangle = createStateIconDrawingElement("rectangle" as any);
    const square = createStateIconDrawingElement("square");
    const imageSource = decodeURIComponent(stateIconDrawingToImage([
      { ...rectangle, id: "common-rectangle", strokeColor: "#1d4ed8", fillColor: "#dbeafe" },
      { ...square, id: "common-square", strokeColor: "#1d4ed8", fillColor: "#fff4cc" }
    ] as any).split(",")[1] ?? "");

    expect(stateVisualShapeLabel("rectangle" as any)).toBe("矩形");
    expect(stateVisualShapeLabel("square")).toBe("正方型");
    expect(rectangle.width).toBeGreaterThan(rectangle.height);
    expect(square.width).toBe(square.height);
    expect(imageSource).toContain('width="96"');
    expect(imageSource).toContain('height="58"');
    expect(imageSource).toContain('width="68"');
    expect(imageSource).toContain('height="68"');
  });
});
