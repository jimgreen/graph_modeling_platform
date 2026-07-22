import { describe, expect, test } from "vitest";

import {
  DEFAULT_STATE_ICON_DRAWING_FRAME,
  DEFAULT_STATE_NAME,
  DEFAULT_STATE_PAGE_ID,
  DEFAULT_STATE_VALUE,
  activeStateDraftRow,
  appendNonDefaultStateDraftRow,
  createEditableStateIconElementsFromSvgSource,
  createImportedStateIconElement,
  createStateIconDrawingElement,
  createStateIconDrawingInitialElements,
  createStateDraftRow,
  createStateDraftRowFromDefaultVisual,
  createStateIconDrawingElementFromGeneratedGroupMarkup,
  defaultStateDraftRow,
  isDefaultStatePageId,
  nextNonDefaultStateIndex,
  nonDefaultStateDraftRows,
  normalizeStatePageId,
  normalizeStateDraftRows,
  stateVisualShapeLabel,
  stateIconSvgElementSource,
  stateIconSvgReactAttributes,
  svgSourceFromDataUrl,
  stateIconDrawingPreviewNeedsDirectElementRender,
  stateIconDrawingDraftSourceImage,
  stateIconDrawingInitialFrame,
  stateIconDrawingInlineCanPersistDraft,
  stateIconDrawingInlineNeedsDraftReload,
  stateIconDrawingToPersistedImage,
  stateIconDrawingToImage,
  upsertDefaultStateDraftRow,
  visibleStateIconColor
} from "./stateIconDrawing";
import {
  DEVICE_LIBRARY,
  createNodeFromTemplate,
  getNodeScaleX,
  getNodeScaleY,
  terminalRenderLocalPoint,
  terminalStubSegment,
  terminalStubStrokeWidth
} from "./model";
import { APP_STATIC_SCOPE } from "./appExtracted/appStaticScope";
import { apiPath } from "./config";
import {
  createAddCustomDeviceStateDraftRow,
  createAddStateIconDrawingElement,
  createAddDefinitionStateDraftRow,
  createStateIconDrawingKeyDown,
  createStateIconDrawingElementFromStaticTemplate,
  createCustomDeviceDefaultStateVisualDraft,
  createDefinitionDefaultStateVisualDraft,
  createLoadDefinitionTemplateDraft,
  createRenderStateVisualPager,
  createRenderDeviceDefinitionVisualPanel,
  createSelectCustomComponentTemplate
} from "./appExtracted/appDeviceDefinitionFactories";
import { createCustomDeviceDraftFromTemplate, customDeviceImageWithTerminalConnectors, generateCustomDeviceImage, projectCustomDeviceTerminalAnchorToBoundary, resolveTemplateComponentLibrary } from "./customDeviceUtils";

describe("default device state draft rows", () => {
  test("uses a transparent borderless frame when no definition frame is configured", () => {
    expect(DEFAULT_STATE_ICON_DRAWING_FRAME).toMatchObject({
      strokeStyle: "solid",
      strokeWidth: 0,
      strokeColor: "transparent",
      fillColor: "transparent"
    });
    expect(stateIconDrawingToPersistedImage([], {
      frame: DEFAULT_STATE_ICON_DRAWING_FRAME
    })).toBe("");
  });

  test("resolves the source image used to initialize state icon drawing", () => {
    const assetHref = "data:image/svg+xml;utf8,%3Csvg%20viewBox%3D%220%200%2010%2010%22%2F%3E";
    const directHref = "data:image/svg+xml;utf8,%3Csvg%20viewBox%3D%220%200%2020%2020%22%2F%3E";
    const row = createStateDraftRow({
      value: "0",
      name: "打开",
      image: directHref,
      imageAssetId: "state-asset"
    });

    expect(stateIconDrawingDraftSourceImage(row, { "state-asset": assetHref })).toBe(assetHref);
    expect(stateIconDrawingDraftSourceImage({ ...row, imageCleared: "1" }, { "state-asset": assetHref })).toBe("");
  });

  test("reloads inline state icon drawing only for external draft image changes", () => {
    const unchanged = {
      targetMatches: true,
      keyMatches: true,
      initialImage: "serialized-old-drawing",
      inlineImage: "serialized-old-drawing",
      initialSourceImage: "old-row-image.svg",
      draftSourceImage: "old-row-image.svg"
    };

    expect(stateIconDrawingInlineNeedsDraftReload(unchanged)).toBe(false);
    expect(stateIconDrawingInlineNeedsDraftReload({
      ...unchanged,
      draftSourceImage: "regenerated-model-glyph.svg"
    })).toBe(true);
    expect(stateIconDrawingInlineNeedsDraftReload({
      ...unchanged,
      inlineImage: "user-edited-drawing.svg",
      draftSourceImage: "regenerated-model-glyph.svg"
    })).toBe(false);
    expect(stateIconDrawingInlineNeedsDraftReload({
      ...unchanged,
      targetMatches: false
    })).toBe(true);
  });

  test("does not persist stale inline drawing when the target key has changed", () => {
    expect(stateIconDrawingInlineCanPersistDraft({
      targetMatches: true,
      keyMatches: false,
      initialImage: "old-template-image.svg",
      inlineImage: "old-template-image.svg"
    })).toBe(false);

    expect(stateIconDrawingInlineCanPersistDraft({
      targetMatches: false,
      keyMatches: true,
      initialImage: "old-template-image.svg",
      inlineImage: "edited-image.svg"
    })).toBe(false);

    expect(stateIconDrawingInlineCanPersistDraft({
      targetMatches: true,
      keyMatches: true,
      initialImage: "old-template-image.svg",
      inlineImage: "edited-image.svg"
    })).toBe(true);

    expect(stateIconDrawingInlineCanPersistDraft({
      targetMatches: true,
      keyMatches: true,
      initialImage: "old-template-image.svg",
      inlineImage: "old-template-image.svg"
    })).toBe(false);
  });

  test("serializes frame-only drawing backgrounds for inline persistence", () => {
    const image = stateIconDrawingToPersistedImage([], {
      frame: {
        strokeStyle: "solid",
        strokeWidth: 2,
        strokeColor: "#334155",
        fillColor: "#fef3c7",
        backgroundImage: apiPath("/images/bg-1"),
        backgroundImageAssetId: "bg-1",
        backgroundImageFit: "stretch"
      },
      frameHasTerminals: false
    });
    const imageSource = decodeURIComponent(image.split(",")[1] ?? "");

    expect(image).toMatch(/^data:image\/svg\+xml/);
    expect(imageSource).toContain('data-state-icon-drawing="true"');
    expect(imageSource).toContain('data-state-icon-frame="true"');
    expect(imageSource).toContain('fill="#fef3c7"');
    expect(imageSource).toContain('data-state-icon-frame-image="true"');
    expect(imageSource).toContain('data-state-icon-frame-image-asset-id="bg-1"');
    expect(imageSource).toContain('data-state-icon-frame-image-fit="stretch"');
    expect(imageSource).toContain('href="' + apiPath('/images/bg-1') + '"');
    expect(imageSource).toContain('preserveAspectRatio="none"');
  });

  test("does not reopen a frame-only drawing background as an editable element", () => {
    const image = stateIconDrawingToPersistedImage([], {
      frame: {
        strokeStyle: "solid",
        strokeWidth: 2,
        strokeColor: "#334155",
        fillColor: "#fef3c7",
        backgroundImage: apiPath("/images/bg-1"),
        backgroundImageAssetId: "bg-1",
        backgroundImageFit: "stretch"
      },
      frameHasTerminals: false
    });
    const row = createStateDraftRow({
      value: "0",
      name: "背景测试",
      image
    });

    expect(createStateIconDrawingInitialElements(row, {})).toEqual([]);
    expect(stateIconDrawingInitialFrame(row, {}, {
      strokeStyle: "dashed",
      strokeWidth: 1.2,
      strokeColor: "#94a3b8",
      fillColor: "#ffffff"
    })).toMatchObject({
      strokeStyle: "solid",
      strokeWidth: 2,
      strokeColor: "#334155",
      fillColor: "#fef3c7",
      backgroundImage: apiPath("/images/bg-1"),
      backgroundImageAssetId: "bg-1",
      backgroundImageFit: "stretch"
    });
  });

  test("serializes drawing image element fit modes", () => {
    const element = {
      ...createImportedStateIconElement("image", apiPath("/images/photo"), "图片"),
      imageFit: "tile",
      width: 80,
      height: 48
    };

    const image = stateIconDrawingToPersistedImage([element]);
    const imageSource = decodeURIComponent(image.split(",")[1] ?? "");

    expect(imageSource).toContain('data-state-icon-image-fit="tile"');
    expect(imageSource).toContain("<pattern");
    expect(imageSource).toContain('href="' + apiPath('/images/photo') + '"');
  });

  test("does not serialize an empty drawing with only the default frame", () => {
    expect(stateIconDrawingToPersistedImage([], {
      frame: DEFAULT_STATE_ICON_DRAWING_FRAME
    })).toBe("");
  });

  const findElementByText = (node: any, text: string): any => {
    if (!node || typeof node !== "object") {
      return null;
    }
    if (node.type === "button" && node.props?.children === text) {
      return node;
    }
    const children = node.props?.children;
    const childList = Array.isArray(children) ? children : [children];
    for (const child of childList) {
      const found = findElementByText(child, text);
      if (found) {
        return found;
      }
    }
    return null;
  };

  const findElementsByClassName = (node: any, className: string): any[] => {
    if (!node || typeof node !== "object") {
      return [];
    }
    const ownClassName = typeof node.props?.className === "string" ? node.props.className : "";
    const ownMatches = ownClassName.split(/\s+/).includes(className) ? [node] : [];
    const children = node.props?.children;
    const childList = Array.isArray(children) ? children : [children];
    return ownMatches.concat(childList.flatMap((child) => findElementsByClassName(child, className)));
  };

  const findElementsByType = (node: any, type: string): any[] => {
    if (!node || typeof node !== "object") {
      return [];
    }
    const ownMatches = node.type === type ? [node] : [];
    const children = node.props?.children;
    const childList = Array.isArray(children) ? children : [children];
    return ownMatches.concat(childList.flatMap((child) => findElementsByType(child, type)));
  };

  const nodeTextContent = (node: any): string => {
    if (node === null || node === undefined || typeof node === "boolean") {
      return "";
    }
    if (typeof node === "string" || typeof node === "number") {
      return String(node);
    }
    if (Array.isArray(node)) {
      return node.map(nodeTextContent).join("");
    }
    if (typeof node === "object") {
      return nodeTextContent(node.props?.children);
    }
    return "";
  };

  const pointFromTranslate = (transform: string) => {
    const match = /translate\(([-\d.]+)[ ,]+([-\d.]+)\)/.exec(transform);
    expect(match).toBeTruthy();
    return {
      x: Number(match?.[1] ?? 0),
      y: Number(match?.[2] ?? 0)
    };
  };

  const decodeSvgDataUrl = (value: string) => {
    const payload = value.includes(",") ? value.slice(value.indexOf(",") + 1) : value;
    return decodeURIComponent(payload);
  };

  test("uses a synthetic default row when no state definitions exist", () => {
    const row = defaultStateDraftRow([], { image: "default.svg" });

    expect(row.id).toBe(DEFAULT_STATE_PAGE_ID);
    expect(row.value).toBe(DEFAULT_STATE_VALUE);
    expect(row.name).toBe(DEFAULT_STATE_NAME);
    expect(row.image).toBe("default.svg");
  });

  test("keeps the default visual separate from state value 0", () => {
    const first = createStateDraftRow({ value: "1", name: "运行", image: "run.svg" });
    const second = createStateDraftRow({ value: "0", name: "停运" });
    const row = defaultStateDraftRow([first, second], { image: "fallback.svg" });

    expect(row.id).toBe(DEFAULT_STATE_PAGE_ID);
    expect(row.value).toBe(DEFAULT_STATE_VALUE);
    expect(row.name).toBe(DEFAULT_STATE_NAME);
    expect(row.image).toBe("fallback.svg");
    expect(nonDefaultStateDraftRows([first, second])).toEqual([first, second]);
    expect(normalizeStatePageId([first, second], first.id)).toBe(first.id);
  });

  test("uses default visual instead of inheriting from the first state page", () => {
    const first = createStateDraftRow({ value: "0", name: "默认" });
    const row = defaultStateDraftRow([first], {
      image: "default.svg",
      text: "D",
      strokeColor: "#123456"
    });

    expect(row.id).toBe(DEFAULT_STATE_PAGE_ID);
    expect(row.value).toBe(DEFAULT_STATE_VALUE);
    expect(row.name).toBe(DEFAULT_STATE_NAME);
    expect(row.image).toBe("default.svg");
    expect(row.text).toBe("D");
    expect(row.strokeColor).toBe("#123456");
  });

  test("preserves explicit cleared state visuals", () => {
    const row = createStateDraftRow({ value: "0", name: "清空", imageCleared: "1" });

    expect(row.imageCleared).toBe("1");
    expect(normalizeStateDraftRows([row])[0]?.imageCleared).toBe("1");
  });

  test("does not create fallback drawing elements for explicitly cleared visuals", () => {
    const row = createStateDraftRow({ value: "0", name: "清空", imageCleared: "1" });

    expect(createStateIconDrawingInitialElements(row, {})).toEqual([]);
  });

  test("restores saved drawing frame settings from the serialized svg image", () => {
    const sourceRow = createStateDraftRow({
      value: "0",
      name: "源",
      icon: "矩形",
      text: "矩形",
      fillColor: "#dbeafe",
      strokeColor: "#2563eb"
    });
    const image = stateIconDrawingToImage([
      createStateIconDrawingElement("rectangle", sourceRow)
    ], {
      frame: {
        strokeStyle: "dotted",
        strokeWidth: 3,
        strokeColor: "#123456",
        fillColor: "#abcdef"
      },
      frameHasTerminals: true
    });
    const row = createStateDraftRow({ value: "0", name: "带边框", image });

    expect(stateIconDrawingInitialFrame(row, {}, {
      strokeStyle: "dashed",
      strokeWidth: 1,
      strokeColor: "#94a3b8",
      fillColor: "#ffffff"
    })).toEqual({
      strokeStyle: "dotted",
      strokeWidth: 3,
      strokeColor: "#123456",
      fillColor: "#abcdef"
    });
  });

  test("persists and restores drawing frame background image without editable elements", () => {
    const sourceRow = createStateDraftRow({
      value: "0",
      name: "源",
      fillColor: "#dbeafe",
      strokeColor: "#2563eb"
    });
    const frameBackgroundImage = "data:image/png;base64,frame-bg";
    const image = stateIconDrawingToImage([
      createStateIconDrawingElement("rectangle", sourceRow)
    ], {
      frame: {
        strokeStyle: "solid",
        strokeWidth: 2,
        strokeColor: "#334155",
        fillColor: "#f8fafc",
        backgroundImage: frameBackgroundImage
      } as any,
      frameHasTerminals: true
    });
    const imageSource = decodeURIComponent(image.split(",")[1] ?? "");
    const row = createStateDraftRow({ value: "0", name: "带背景图", image });

    expect(imageSource).toContain('data-state-icon-frame-image="true"');
    expect(imageSource).toContain(`href="${frameBackgroundImage}"`);
    expect(stateIconDrawingInitialFrame(row, {}, {
      strokeStyle: "dashed",
      strokeWidth: 1,
      strokeColor: "#94a3b8",
      fillColor: "#ffffff"
    } as any)).toMatchObject({
      strokeStyle: "solid",
      strokeWidth: 2,
      strokeColor: "#334155",
      fillColor: "#f8fafc",
      backgroundImage: frameBackgroundImage
    });
    expect(createEditableStateIconElementsFromSvgSource(svgSourceFromDataUrl(image), "带背景图")).toHaveLength(1);
  });

  test("persists drawing frame background image as a backend asset reference", () => {
    const sourceRow = createStateDraftRow({
      value: "0",
      name: "源",
      fillColor: "#dbeafe",
      strokeColor: "#2563eb"
    });
    const image = stateIconDrawingToImage([
      createStateIconDrawingElement("rectangle", sourceRow)
    ], {
      frame: {
        strokeStyle: "solid",
        strokeWidth: 2,
        strokeColor: "#334155",
        fillColor: "#f8fafc",
        backgroundImage: apiPath("/images/frame-bg"),
        backgroundImageAssetId: "frame-bg"
      } as any,
      frameHasTerminals: true,
      resolveImageHref: () => "data:image/png;base64,should-not-inline"
    });
    const imageSource = decodeURIComponent(image.split(",")[1] ?? "");
    const row = createStateDraftRow({ value: "0", name: "后台背景图", image });

    expect(imageSource).toContain('data-state-icon-frame-image="true"');
    expect(imageSource).toContain('data-state-icon-frame-image-asset-id="frame-bg"');
    expect(imageSource).toContain('href="' + apiPath('/images/frame-bg') + '"');
    expect(imageSource).not.toContain("should-not-inline");
    expect(stateIconDrawingInitialFrame(row, { "frame-bg": apiPath("/images/frame-bg") }, {
      strokeStyle: "dashed",
      strokeWidth: 1,
      strokeColor: "#94a3b8",
      fillColor: "#ffffff"
    } as any)).toMatchObject({
      backgroundImage: apiPath("/images/frame-bg"),
      backgroundImageAssetId: "frame-bg"
    });
    expect(createEditableStateIconElementsFromSvgSource(svgSourceFromDataUrl(image), "后台背景图")).toHaveLength(1);
  });

  test("persists custom device terminal connector lines inside svg images", () => {
    const image = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="160" viewBox="0 0 240 160"><style>line{stroke-width:0 !important}</style><rect width="240" height="160"/></svg>'
    );
    const withConnectors = customDeviceImageWithTerminalConnectors(
      image,
      ["ac", "dc"],
      [
        { x: -0.5, y: 0 },
        { x: 0.5, y: 0 }
      ]
    );
    const source = svgSourceFromDataUrl(withConnectors);

    expect(source).toContain('data-custom-device-persisted-terminal-connectors="true"');
    expect(source).toContain('x1="0" y1="80" x2="108" y2="80"');
    expect(source).toContain('x1="240" y1="80" x2="132" y2="80"');
    expect(source).toContain("stroke-width:2 !important");
    expect(source).not.toContain("<circle");
  });

  test("does not duplicate persisted terminal connector lines when saving repeatedly", () => {
    const image = generateCustomDeviceImage("Unit", ["ac"]);
    const first = customDeviceImageWithTerminalConnectors(image, ["ac"], [{ x: 0, y: -0.5 }]);
    const second = customDeviceImageWithTerminalConnectors(first, ["ac"], [{ x: 0, y: 0.5 }]);
    const source = svgSourceFromDataUrl(second);

    expect(source.match(/data-custom-device-persisted-terminal-connectors="true"/g)).toHaveLength(1);
    expect(source).not.toContain('x1="120" y1="0" x2="120" y2="20"');
    expect(source).toContain('x1="120" y1="160" x2="120" y2="88"');
  });

  test("removes obsolete persisted terminal anchor circles when rewriting the definition image", () => {
    const source = '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="160" viewBox="0 0 240 160"><g data-custom-device-persisted-terminals="true"><line x1="0" y1="80" x2="30" y2="80"/><circle cx="0" cy="80" r="7"/></g></svg>';
    const image = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(source);
    const rewritten = svgSourceFromDataUrl(customDeviceImageWithTerminalConnectors(image, ["ac"], [{ x: 0.5, y: 0 }]));

    expect(rewritten).not.toContain('data-custom-device-persisted-terminals="true"');
    expect(rewritten).not.toContain("<circle");
    expect(rewritten).toContain('data-custom-device-persisted-terminal-connectors="true"');
    expect(rewritten).toContain('x1="240" y1="80" x2="132" y2="80"');
  });

  test("wraps non-svg custom device images so terminal connector lines are saved with the definition", () => {
    const withConnectors = customDeviceImageWithTerminalConnectors(
      apiPath("/images/background-asset"),
      ["ac"],
      [{ x: -0.5, y: 0.25 }]
    );
    const source = svgSourceFromDataUrl(withConnectors);

    expect(source).toContain('<image href="' + apiPath('/images/background-asset') + '"');
    expect(source).toContain('data-custom-device-persisted-terminal-connectors="true"');
    expect(source).toContain('x1="0" y1="110" x2="108" y2="110"');
    expect(source).not.toContain("<circle");
  });

  test("does not store the default visual inside real state pages", () => {
    const second = createStateDraftRow({ value: "1", name: "状态1" });
    const withDefault = appendNonDefaultStateDraftRow([], { image: "default.svg" }, second);
    const updated = upsertDefaultStateDraftRow(withDefault, { image: "fallback.svg" }, { value: "2", name: "默认运行" });

    expect(withDefault).toHaveLength(1);
    expect(withDefault[0]).toBe(second);
    expect(updated).toEqual(withDefault);
  });

  test("numbers new states from state 1 and copies the default state visual", () => {
    const stateZero = createStateDraftRow({
      value: "0",
      name: "状态0",
      image: "state-zero.svg",
      text: "状态0",
      strokeColor: "#0f172a"
    });
    const firstIndex = nextNonDefaultStateIndex([stateZero]);
    const firstState = createStateDraftRowFromDefaultVisual(defaultStateDraftRow([stateZero], {
      image: "default-state.svg",
      text: "默认",
      strokeColor: "#334155"
    }), {
      value: String(firstIndex),
      name: `状态${firstIndex}`
    });
    const secondIndex = nextNonDefaultStateIndex([stateZero, firstState]);

    expect(firstIndex).toBe(1);
    expect(firstState.value).toBe("1");
    expect(firstState.name).toBe("状态1");
    expect(firstState.image).toBe("default-state.svg");
    expect(firstState.text).toBe("默认");
    expect(firstState.strokeColor).toBe("#334155");
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

  test("hides text properties for selected non-text drawing elements", () => {
    const row = createStateDraftRow({ value: "0", name: "状态0" });
    const rectangle = {
      ...createStateIconDrawingElement("rectangle"),
      id: "selected-rectangle"
    };
    const renderPager = createRenderStateVisualPager({
      DEFAULT_STATE_PAGE_ID,
      DEVICE_LIBRARY: [],
      BufferedTextInput: "input",
      DeferredColorInput: "input",
      FONT_FAMILY_OPTIONS: [],
      FONT_FAMILY_OPTION_LABELS: {},
      STATE_ICON_LINE_CAP_OPTIONS: [],
      TERMINAL_TYPE_LIBRARY_LABELS: {},
      activeStateDraftRow,
      addStateIconDrawingElement: () => undefined,
      appendNonDefaultStateDraftRow,
      colorPalette: {},
      createNodeFromTemplate,
      createStateDraftRowFromDefaultVisual,
      createStateIconDrawingElement,
      customDeviceDefaultStateVisualDraft: () => ({}),
      customDeviceDraft: { stateDefinitions: [row], terminalCount: 0 },
      customDeviceTerminalAnchorDragIndex: null,
      customDeviceTerminalAnchorValue: (value: number) => value,
      customDeviceTerminalAnchors: [],
      customDraftTerminalTypes: [],
      defaultStateDraftRow,
      definitionDefaultStateVisualDraft: () => ({}),
      definitionTerminalAnchorDragIndex: null,
      definitionVisualDraft: { terminalCount: 0 },
      definitionVisualTerminalAnchors: [],
      definitionVisualTerminalTypes: [],
      deleteSelectedStateIconDrawingElements: () => undefined,
      deleteStateIconDrawingElement: () => undefined,
      dragStateIconDrawingSelection: () => undefined,
      formatSvgNumber: (value: number) => String(Math.round(value * 1000) / 1000),
      getNodeScaleX,
      getNodeScaleY,
      isDefaultStatePageId,
      nextNonDefaultStateIndex,
      nonDefaultStateDraftRows,
      projectCustomDeviceTerminalAnchorToBoundary,
      resolveTemplateComponentLibrary,
      selectedDefinitionTemplate: null,
      setCustomDeviceDraft: () => undefined,
      setCustomDeviceTerminalAnchorDragIndex: () => undefined,
      setDefinitionStateDraftRows: () => undefined,
      setDefinitionTerminalAnchorDragIndex: () => undefined,
      setImagePickerCategoryFilter: () => undefined,
      setImagePickerSearchQuery: () => undefined,
      setImagePickerSourceFilter: () => undefined,
      setImageTarget: () => undefined,
      setStateIconDrawingContextMenu: () => undefined,
      setStateIconDrawingDialog: () => undefined,
      setStateIconDrawingImageVisibleFrames: () => undefined,
      setStateIconDrawingSvgVisibleFrames: () => undefined,
      stateDraftRowId: () => "state-copy",
      stateIconDrawingClipboardRef: { current: [] },
      stateIconDrawingContextMenu: null,
      stateIconDrawingDialog: {
        target: { scope: "definition", rowId: row.id },
        elements: [rectangle],
        selectedElementId: rectangle.id,
        selectedElementIds: [rectangle.id],
        sidePanelTab: "selected"
      },
      stateIconDrawingElementPreviewImage: () => ({ href: "", x: 0, y: 0, width: 1, height: 1 }),
      stateIconDrawingElementPreviewNode: () => null,
      stateIconDrawingFrameRect: (hasTerminals: boolean) =>
        hasTerminals ? { x: 30, y: 20, width: 180, height: 120, rx: 8 } : { x: 0, y: 0, width: 240, height: 160, rx: 10 },
      stateIconDrawingHistoryRef: { current: [] },
      stateIconDrawingImageVisibleFrames: {},
      stateIconDrawingKeyDown: () => undefined,
      stateIconDrawingPointer: () => ({ x: 0, y: 0 }),
      stateIconDrawingPreviewNeedsDirectElementRender: () => false,
      stateIconDrawingSelection: () => undefined,
      stateIconDrawingSvgRef: { current: null },
      stateIconDrawingSvgVisibleFrames: {},
      stateIconDrawingToImage: () => "",
      stateVisualShapeLabel: (kind: string) => kind,
      startStateIconDrawingDrag: () => undefined,
      stopStateIconDrawingDrag: () => undefined,
      terminalColor: () => "#2563eb",
      terminalRenderLocalPoint,
      terminalStubSegment,
      terminalStubStrokeWidth,
      updateCustomDeviceTerminalAnchor: () => undefined,
      updateDefinitionTerminalAnchor: () => undefined,
      updateStateIconDrawingElement: () => undefined,
      visibleStateIconColor
    });

    const tree = renderPager([row], row.id, () => undefined, {
      update: () => undefined,
      add: () => undefined,
      remove: () => undefined,
      drawingScope: "definition"
    } as any);
    const labels = findElementsByType(tree, "th").map(nodeTextContent);

    expect(labels).toContain("线色");
    expect(labels).not.toContain("文本颜色");
    expect(labels).not.toContain("文字");
  });

  test("can inline backend image references when composing a state icon image", () => {
    const imageElement = createImportedStateIconElement("image", apiPath("/images/icon-a"), "后台图标");

    const image = stateIconDrawingToImage([imageElement], {
      resolveImageHref: (href) => href === apiPath("/images/icon-a") ? "data:image/png;base64,aWNvbg==" : href
    });
    const svgSource = svgSourceFromDataUrl(image);

    expect(svgSource).toContain('href="data:image/png;base64,aWNvbg=="');
    expect(svgSource).not.toContain('href="' + apiPath('/images/icon-a') + '"');
  });

  test("draws frame background and border inside the inner area when terminals exist", () => {
    const element = createStateIconDrawingElement("triangle" as any);
    const image = stateIconDrawingToImage([element], {
      frameHasTerminals: true,
      frame: {
        strokeStyle: "dashed",
        strokeWidth: 2,
        strokeColor: "#2563eb",
        fillColor: "#c0392b"
      }
    });
    const svgSource = svgSourceFromDataUrl(image);

    expect(svgSource).toContain('data-state-icon-frame="true"');
    expect(svgSource).toContain('x="30"');
    expect(svgSource).toContain('y="20"');
    expect(svgSource).toContain('width="180"');
    expect(svgSource).toContain('height="120"');
    expect(svgSource).toContain('fill="#c0392b"');
    expect(svgSource).toContain('stroke="#2563eb"');
  });

  test("draws frame background and border on the outer area when no terminals exist", () => {
    const element = createStateIconDrawingElement("triangle" as any);
    const image = stateIconDrawingToImage([element], {
      frameHasTerminals: false,
      frame: {
        strokeStyle: "solid",
        strokeWidth: 1,
        strokeColor: "#111827",
        fillColor: "#ffffff"
      }
    });
    const svgSource = svgSourceFromDataUrl(image);

    expect(svgSource).toContain('data-state-icon-frame="true"');
    expect(svgSource).toContain('x="0"');
    expect(svgSource).toContain('y="0"');
    expect(svgSource).toContain('width="240"');
    expect(svgSource).toContain('height="160"');
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

  test("converts static templates with the real app scope renderer", () => {
    const staticButtonTemplate = DEVICE_LIBRARY.find((item) => item.kind === "static-button");
    expect(staticButtonTemplate).toBeTruthy();
    if (!staticButtonTemplate) {
      return;
    }

    const buttonElement = createStateIconDrawingElementFromStaticTemplate(APP_STATIC_SCOPE, staticButtonTemplate);

    expect(buttonElement.kind).toBe("imported-svg");
    expect(buttonElement.svgSource).toContain("<svg");
    expect(buttonElement.width).toBe(staticButtonTemplate.size.width);
    expect(buttonElement.height).toBe(staticButtonTemplate.size.height);
  });

  test("keeps static template imported SVG size after saving and reopening", () => {
    const staticButtonTemplate = DEVICE_LIBRARY.find((item) => item.kind === "static-button");
    expect(staticButtonTemplate).toBeTruthy();
    if (!staticButtonTemplate) {
      return;
    }
    const element = {
      ...createStateIconDrawingElementFromStaticTemplate(APP_STATIC_SCOPE, staticButtonTemplate),
      x: 72,
      y: 64
    };
    const imageSource = decodeURIComponent(stateIconDrawingToImage([element]).split(",")[1] ?? "");

    const restored = createEditableStateIconElementsFromSvgSource(imageSource, "静态按钮");

    expect(restored).toHaveLength(1);
    expect(restored[0]).toMatchObject({
      kind: "imported-svg",
      x: 72,
      y: 64,
      width: element.width,
      height: element.height
    });
    expect(restored[0].width).toBe(staticButtonTemplate.size.width);
    expect(restored[0].height).toBe(staticButtonTemplate.size.height);
  });

  test("keeps resized static note size after saving and reopening", () => {
    const staticNoteTemplate = DEVICE_LIBRARY.find((item) => item.kind === "static-note");
    expect(staticNoteTemplate).toBeTruthy();
    if (!staticNoteTemplate) {
      return;
    }
    const element = {
      ...createStateIconDrawingElementFromStaticTemplate(APP_STATIC_SCOPE, staticNoteTemplate),
      x: 82,
      y: 70,
      width: 68,
      height: 44
    };
    const imageSource = decodeURIComponent(stateIconDrawingToImage([element]).split(",")[1] ?? "");

    const restored = createEditableStateIconElementsFromSvgSource(imageSource, "便签");

    expect(restored).toHaveLength(1);
    expect(restored[0]).toMatchObject({
      kind: "imported-svg",
      x: 82,
      y: 70,
      width: 68,
      height: 44
    });
  });

  test("does not restore persisted terminal connector layer as an editable static element", () => {
    const staticNoteTemplate = DEVICE_LIBRARY.find((item) => item.kind === "static-note");
    expect(staticNoteTemplate).toBeTruthy();
    if (!staticNoteTemplate) {
      return;
    }
    const element = {
      ...createStateIconDrawingElementFromStaticTemplate(APP_STATIC_SCOPE, staticNoteTemplate),
      x: 82,
      y: 70,
      width: 68,
      height: 44
    };
    const savedImage = stateIconDrawingToImage([element], { frameHasTerminals: true });
    const withConnectors = customDeviceImageWithTerminalConnectors(savedImage, ["ac"], [{ x: -0.5, y: 0 }]);
    const restored = createEditableStateIconElementsFromSvgSource(svgSourceFromDataUrl(withConnectors), "便签");

    expect(restored).toHaveLength(1);
    expect(restored[0]).toMatchObject({
      kind: "imported-svg",
      x: 82,
      y: 70,
      width: 68,
      height: 44
    });
  });

  test("restores generated static note defaults at the template size when reopened", () => {
    const staticNoteTemplate = DEVICE_LIBRARY.find((item) => item.kind === "static-note");
    expect(staticNoteTemplate).toBeTruthy();
    if (!staticNoteTemplate) {
      return;
    }
    const defaultVisual = createDefinitionDefaultStateVisualDraft({
      ...APP_STATIC_SCOPE,
      definitionVisualDraft: {
        backgroundImage: "",
        backgroundImageAssetId: "",
        backgroundImageCleared: "",
        size: { ...staticNoteTemplate.size },
        terminalCount: 1,
        terminalTypes: ["ac"],
        terminalLabels: ["交流端1"],
        terminalAnchors: [{ x: -0.5, y: 0 }]
      },
      selectedDefinitionTemplate: staticNoteTemplate
    })();
    const row = createStateDraftRow({
      value: DEFAULT_STATE_VALUE,
      name: DEFAULT_STATE_NAME,
      image: defaultVisual.image ?? "",
      imageAssetId: defaultVisual.imageAssetId ?? "",
      imageCleared: defaultVisual.imageCleared ?? ""
    });

    const restored = createStateIconDrawingInitialElements(row, {});

    expect(restored).toHaveLength(1);
    expect(restored[0]).toMatchObject({
      kind: "imported-svg",
      x: 120,
      y: 80,
      width: staticNoteTemplate.size.width,
      height: staticNoteTemplate.size.height
    });
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

  test("loads built-in binary state pages with status-specific default state images", () => {
    const template = DEVICE_LIBRARY.find((item) => item.kind === "ac-breaker");
    expect(template).toBeTruthy();
    if (!template) {
      return;
    }
    let stateRows: any[] = [];
    const loadDefinitionTemplateDraft = createLoadDefinitionTemplateDraft({
      DEFAULT_STATE_PAGE_ID,
      DeviceGlyph: ({ node, stateVisual }: any) => `<path data-status="${node.params.status}" data-state="${stateVisual?.value ?? ""}"/>`,
      categoryLibraryComponentLibraryKey: (group: string, componentLibrary: string) => `${group}:${componentLibrary}`,
      colorDisplayMode: "energy",
      colorPalette: {},
      createDefinitionDraftRows: () => [],
      createDefinitionStateDraftRows: () => [
        createStateDraftRow({ value: "0", name: "打开/开断" }),
        createStateDraftRow({ value: "1", name: "闭合" })
      ],
      createDefinitionVisualDraft: () => ({}),
      createNodeFromTemplate: (sourceTemplate: any) => ({
        kind: sourceTemplate.kind,
        size: sourceTemplate.size,
        rotation: sourceTemplate.rotation ?? 0,
        params: sourceTemplate.params
      }),
      escapeXml: (value: string) => value,
      formatSvgNumber: (value: number) => String(value),
      nodeGeometryTransform: () => "",
      normalizeCategoryLibraryName: (value: string) => value,
      renderSvgElementMarkup: (markup: string) => markup,
      resolveTemplateComponentLibrary: () => "ACBreak",
      setCollapsedDefinitionComponentLibraries: (updater: any) => {
        updater([]);
      },
      setDefinitionDraftError: () => undefined,
      setDefinitionDraftRows: () => undefined,
      setDefinitionDraftSection: () => undefined,
      setDefinitionStateDraftRows: (rows: any[]) => {
        stateRows = rows;
      },
      setDefinitionStatePageId: () => undefined,
      setDefinitionTerminalAnchorDragIndex: () => undefined,
      setDefinitionVisualDraft: () => undefined,
      setExpandedDefinitionGroups: (updater: any) => {
        updater([]);
      },
      setSelectedDefinitionKind: () => undefined
    });

    loadDefinitionTemplateDraft(template);

    expect(stateRows).toHaveLength(2);
    expect(stateRows[0].value).toBe("0");
    expect(stateRows[0].image).toMatch(/^data:image\/svg\+xml/);
    expect(decodeSvgDataUrl(stateRows[0].image)).toContain('data-status="0"');
    expect(decodeSvgDataUrl(stateRows[0].image)).toContain('data-state="0"');
    expect(stateRows[1].value).toBe("1");
    expect(stateRows[1].image).toMatch(/^data:image\/svg\+xml/);
    expect(decodeSvgDataUrl(stateRows[1].image)).toContain('data-status="1"');
    expect(decodeSvgDataUrl(stateRows[1].image)).toContain('data-state="1"');
  });

  test("loads built-in binary state pages with model-glyph images for each status", () => {
    const template = DEVICE_LIBRARY.find((item) => item.kind === "ac-breaker");
    expect(template).toBeTruthy();
    if (!template) {
      return;
    }
    let stateRows: any[] = [];
    const loadDefinitionTemplateDraft = createLoadDefinitionTemplateDraft({
      DEFAULT_STATE_PAGE_ID,
      DeviceGlyph: ({ node, stateVisual }: any) => `<path data-status="${node.params.status}" data-state="${stateVisual?.value ?? ""}"/>`,
      categoryLibraryComponentLibraryKey: (group: string, componentLibrary: string) => `${group}:${componentLibrary}`,
      colorDisplayMode: "energy",
      colorPalette: {},
      createDefinitionDraftRows: () => [],
      createDefinitionStateDraftRows: () => [
        createStateDraftRow({ value: "0", name: "打开/开断" }),
        createStateDraftRow({ value: "1", name: "闭合" })
      ],
      createDefinitionVisualDraft: () => ({
        size: { ...template.size },
        terminalCount: template.terminalCount,
        terminalTypes: [],
        terminalLabels: [],
        terminalAnchors: template.terminalAnchors ?? [],
        backgroundImage: "",
        backgroundImageAssetId: "",
        backgroundImageCleared: "",
        error: ""
      }),
      createNodeFromTemplate: (sourceTemplate: any) => ({
        kind: sourceTemplate.kind,
        size: sourceTemplate.size,
        rotation: sourceTemplate.rotation ?? 0,
        params: sourceTemplate.params
      }),
      escapeXml: (value: string) => value,
      formatSvgNumber: (value: number) => String(value),
      nodeGeometryTransform: () => "",
      normalizeCategoryLibraryName: (value: string) => value,
      renderSvgElementMarkup: (markup: string) => markup,
      resolveTemplateComponentLibrary: () => "ACBreak",
      setCollapsedDefinitionComponentLibraries: (updater: any) => {
        updater([]);
      },
      setDefinitionDraftError: () => undefined,
      setDefinitionDraftRows: () => undefined,
      setDefinitionDraftSection: () => undefined,
      setDefinitionStateDraftRows: (rows: any[]) => {
        stateRows = rows;
      },
      setDefinitionStatePageId: () => undefined,
      setDefinitionTerminalAnchorDragIndex: () => undefined,
      setDefinitionVisualDraft: () => undefined,
      setExpandedDefinitionGroups: (updater: any) => {
        updater([]);
      },
      setSelectedDefinitionKind: () => undefined
    });

    loadDefinitionTemplateDraft(template);

    expect(stateRows).toHaveLength(2);
    expect(stateRows[0].value).toBe("0");
    expect(stateRows[0].image).toMatch(/^data:image\/svg\+xml/);
    expect(decodeSvgDataUrl(stateRows[0].image)).toContain('data-status="0"');
    expect(decodeSvgDataUrl(stateRows[0].image)).toContain('data-state="0"');
    expect(stateRows[1].value).toBe("1");
    expect(stateRows[1].image).toMatch(/^data:image\/svg\+xml/);
    expect(decodeSvgDataUrl(stateRows[1].image)).toContain('data-status="1"');
    expect(decodeSvgDataUrl(stateRows[1].image)).toContain('data-state="1"');
  });

  test("loads built-in breaker state pages with the model canvas open and closed glyph paths", () => {
    const template = DEVICE_LIBRARY.find((item) => item.kind === "ac-breaker");
    expect(template).toBeTruthy();
    if (!template) {
      return;
    }
    let stateRows: any[] = [];
    const loadDefinitionTemplateDraft = createLoadDefinitionTemplateDraft({
      ...APP_STATIC_SCOPE,
      setCollapsedDefinitionComponentLibraries: (updater: any) => {
        updater([]);
      },
      setDefinitionDraftError: () => undefined,
      setDefinitionDraftRows: () => undefined,
      setDefinitionDraftSection: () => undefined,
      setDefinitionStateDraftRows: (rows: any[]) => {
        stateRows = rows;
      },
      setDefinitionStatePageId: () => undefined,
      setDefinitionTerminalAnchorDragIndex: () => undefined,
      setDefinitionVisualDraft: () => undefined,
      setExpandedDefinitionGroups: (updater: any) => {
        updater([]);
      },
      setSelectedDefinitionKind: () => undefined
    });

    loadDefinitionTemplateDraft(template);

    const openSvg = decodeSvgDataUrl(stateRows.find((row) => row.value === "0")?.image ?? "");
    const closedSvg = decodeSvgDataUrl(stateRows.find((row) => row.value === "1")?.image ?? "");
    expect(openSvg).toContain('d="M -8 8 L 8 -8"');
    expect(openSvg).not.toContain('d="M -10 0 H 10"');
    expect(closedSvg).toContain('d="M -10 0 H 10"');
    expect(closedSvg).not.toContain('d="M -8 8 L 8 -8"');
  });

  test("loads built-in switch, disconnector, and breaker state pages with distinct status glyphs", () => {
    const binaryKinds = [
      "ac-switch",
      "dc-switch",
      "ac-ground-disconnector",
      "ac-ground-disconnector-vertical",
      "ac-breaker",
      "ac-box-breaker",
      "dc-breaker"
    ];

    for (const kind of binaryKinds) {
      const template = DEVICE_LIBRARY.find((item) => item.kind === kind);
      expect(template).toBeTruthy();
      if (!template) {
        continue;
      }
      let stateRows: any[] = [];
      const loadDefinitionTemplateDraft = createLoadDefinitionTemplateDraft({
        ...APP_STATIC_SCOPE,
        setCollapsedDefinitionComponentLibraries: (updater: any) => {
          updater([]);
        },
        setDefinitionDraftError: () => undefined,
        setDefinitionDraftRows: () => undefined,
        setDefinitionDraftSection: () => undefined,
        setDefinitionStateDraftRows: (rows: any[]) => {
          stateRows = rows;
        },
        setDefinitionStatePageId: () => undefined,
        setDefinitionTerminalAnchorDragIndex: () => undefined,
        setDefinitionVisualDraft: () => undefined,
        setExpandedDefinitionGroups: (updater: any) => {
          updater([]);
        },
        setSelectedDefinitionKind: () => undefined
      });

      loadDefinitionTemplateDraft(template);

      const openSvg = decodeSvgDataUrl(stateRows.find((row) => row.value === "0")?.image ?? "");
      const closedSvg = decodeSvgDataUrl(stateRows.find((row) => row.value === "1")?.image ?? "");
      expect(openSvg).toMatch(/^<svg\b/);
      expect(closedSvg).toMatch(/^<svg\b/);
      expect(openSvg).not.toBe(closedSvg);
    }
  });

  test("refreshes stale generated fallback drawings on built-in breaker state pages", () => {
    const template = DEVICE_LIBRARY.find((item) => item.kind === "ac-breaker");
    expect(template).toBeTruthy();
    if (!template) {
      return;
    }
    const staleFallbackImage = stateIconDrawingToImage([
      createStateIconDrawingElement("line"),
      createStateIconDrawingElement("text")
    ]);
    let stateRows: any[] = [];
    const loadDefinitionTemplateDraft = createLoadDefinitionTemplateDraft({
      ...APP_STATIC_SCOPE,
      imageAssets: {
        staleFallback: staleFallbackImage
      },
      createDefinitionStateDraftRows: () => [
        createStateDraftRow({ value: "0", name: "打开/开断", image: staleFallbackImage }),
        createStateDraftRow({ value: "1", name: "闭合", imageAssetId: "staleFallback" })
      ],
      setCollapsedDefinitionComponentLibraries: (updater: any) => {
        updater([]);
      },
      setDefinitionDraftError: () => undefined,
      setDefinitionDraftRows: () => undefined,
      setDefinitionDraftSection: () => undefined,
      setDefinitionStateDraftRows: (rows: any[]) => {
        stateRows = rows;
      },
      setDefinitionStatePageId: () => undefined,
      setDefinitionTerminalAnchorDragIndex: () => undefined,
      setDefinitionVisualDraft: () => undefined,
      setExpandedDefinitionGroups: (updater: any) => {
        updater([]);
      },
      setSelectedDefinitionKind: () => undefined
    });

    loadDefinitionTemplateDraft(template);

    const openSvg = decodeSvgDataUrl(stateRows.find((row) => row.value === "0")?.image ?? "");
    const closedSvg = decodeSvgDataUrl(stateRows.find((row) => row.value === "1")?.image ?? "");
    expect(openSvg).toContain('d="M -8 8 L 8 -8"');
    expect(openSvg).not.toContain('M -64 0 H 64');
    expect(closedSvg).toContain('d="M -10 0 H 10"');
    expect(closedSvg).not.toContain('M -64 0 H 64');
  });

  test("removes generated default device SVG images from built-in binary state pages", () => {
    const template = DEVICE_LIBRARY.find((item) => item.kind === "ac-breaker");
    expect(template).toBeTruthy();
    if (!template) {
      return;
    }
    let stateRows: any[] = [];
    const generatedImage = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="160"><g data-state-icon-layer-width="180" data-state-icon-layer-height="120"></g></svg>'
    )}`;
    const loadDefinitionTemplateDraft = createLoadDefinitionTemplateDraft({
      DEFAULT_STATE_PAGE_ID,
      categoryLibraryComponentLibraryKey: (group: string, componentLibrary: string) => `${group}:${componentLibrary}`,
      createDefinitionDraftRows: () => [],
      createDefinitionStateDraftRows: () => [
        createStateDraftRow({ value: "0", name: "打开/开断", image: generatedImage }),
        createStateDraftRow({ value: "1", name: "闭合" })
      ],
      createDefinitionVisualDraft: () => ({}),
      normalizeCategoryLibraryName: (value: string) => value,
      resolveTemplateComponentLibrary: () => "ACBreak",
      setCollapsedDefinitionComponentLibraries: (updater: any) => {
        updater([]);
      },
      setDefinitionDraftError: () => undefined,
      setDefinitionDraftRows: () => undefined,
      setDefinitionDraftSection: () => undefined,
      setDefinitionStateDraftRows: (rows: any[]) => {
        stateRows = rows;
      },
      setDefinitionStatePageId: () => undefined,
      setDefinitionTerminalAnchorDragIndex: () => undefined,
      setDefinitionVisualDraft: () => undefined,
      setExpandedDefinitionGroups: (updater: any) => {
        updater([]);
      },
      setSelectedDefinitionKind: () => undefined
    });

    loadDefinitionTemplateDraft(template);

    expect(stateRows[0].image).toBe("");
    expect(stateRows[0].imageAssetId).toBe("");
    expect(stateRows[1].image).toBe("");
  });

  test("removes generated terminal connector background images from built-in definition drafts", () => {
    const template = DEVICE_LIBRARY.find((item) => item.kind === "two-port-heat-load-vertical");
    expect(template).toBeTruthy();
    if (!template) {
      return;
    }
    const generatedImage = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="160"><g data-custom-device-persisted-terminal-connectors="true"><line x1="0" y1="80" x2="30" y2="80"/></g></svg>'
    )}`;
    let visualDraft: any = null;
    const loadDefinitionTemplateDraft = createLoadDefinitionTemplateDraft({
      DEFAULT_STATE_PAGE_ID,
      categoryLibraryComponentLibraryKey: (group: string, componentLibrary: string) => `${group}:${componentLibrary}`,
      createDefinitionDraftRows: () => [],
      createDefinitionStateDraftRows: () => [],
      createDefinitionVisualDraft: () => ({
        backgroundImage: generatedImage,
        backgroundImageAssetId: "stale",
        backgroundImageCleared: "",
        size: { ...template.size },
        terminalCount: template.terminalCount,
        terminalTypes: template.terminalTypes ?? [],
        terminalLabels: template.terminalLabels ?? [],
        terminalAnchors: template.terminalAnchors ?? [],
        error: ""
      }),
      normalizeCategoryLibraryName: (value: string) => value,
      resolveTemplateComponentLibrary: () => "HeatLoad2",
      setCollapsedDefinitionComponentLibraries: (updater: any) => {
        updater([]);
      },
      setDefinitionDraftError: () => undefined,
      setDefinitionDraftRows: () => undefined,
      setDefinitionDraftSection: () => undefined,
      setDefinitionStateDraftRows: () => undefined,
      setDefinitionStatePageId: () => undefined,
      setDefinitionTerminalAnchorDragIndex: () => undefined,
      setDefinitionVisualDraft: (draft: any) => {
        visualDraft = draft;
      },
      setExpandedDefinitionGroups: (updater: any) => {
        updater([]);
      },
      setSelectedDefinitionKind: () => undefined
    });

    loadDefinitionTemplateDraft(template);

    expect(visualDraft.backgroundImage).toBe("");
    expect(visualDraft.backgroundImageAssetId).toBe("");
    expect(visualDraft.backgroundImageCleared).toBe("");
  });

  test("ignores generated terminal connector background images for built-in default visuals", () => {
    const template = DEVICE_LIBRARY.find((item) => item.kind === "two-port-heat-load-vertical");
    expect(template).toBeTruthy();
    if (!template) {
      return;
    }
    const generatedImage = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="160"><g data-custom-device-persisted-terminal-connectors="true"><line x1="0" y1="80" x2="30" y2="80"/></g></svg>'
    )}`;
    const defaultVisual = createDefinitionDefaultStateVisualDraft({
      definitionVisualDraft: {
        backgroundImage: generatedImage,
        backgroundImageAssetId: "",
        backgroundImageCleared: "",
        size: { ...template.size },
        terminalCount: template.terminalCount,
        terminalTypes: template.terminalTypes ?? [],
        terminalLabels: template.terminalLabels ?? [],
        terminalAnchors: template.terminalAnchors ?? []
      },
      selectedDefinitionTemplate: {
        ...template,
        params: {
          ...template.params,
          backgroundImage: generatedImage
        }
      }
    })();

    expect(defaultVisual.image).not.toBe(generatedImage);
    expect(defaultVisual.imageAssetId).toBe("");
  });

  test("restoring a built-in definition visual keeps generated terminal connector images cleared", () => {
    const template = DEVICE_LIBRARY.find((item) => item.kind === "two-port-heat-load-vertical");
    expect(template).toBeTruthy();
    if (!template) {
      return;
    }
    const generatedImage = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="160"><g data-custom-device-persisted-terminal-connectors="true"><line x1="0" y1="80" x2="30" y2="80"/></g></svg>'
    )}`;
    let restoredDraft: any = null;
    let restoredRows: any[] = [];
    let restoredPageId = "";
    let restoredError = "old";
    const renderPanel = createRenderDeviceDefinitionVisualPanel({
      DEFAULT_STATE_PAGE_ID,
      BufferedTextInput: "input",
      TERMINAL_TYPE_LIBRARY_LABELS: {},
      createDefinitionStateDraftRows: () => [
        createStateDraftRow({ value: "0", name: "打开", image: generatedImage }),
        createStateDraftRow({ value: "1", name: "闭合" })
      ],
      createDefinitionVisualDraft: () => ({
        backgroundImage: generatedImage,
        backgroundImageAssetId: "stale",
        backgroundImageCleared: "",
        size: { ...template.size },
        terminalCount: 0,
        terminalTypes: [],
        terminalLabels: [],
        terminalAnchors: [],
        error: ""
      }),
      createNodeFromTemplate: (sourceTemplate: any) => ({
        ...sourceTemplate,
        params: sourceTemplate.params ?? {},
        terminals: [],
        rotation: sourceTemplate.rotation ?? 0
      }),
      definitionDraftError: "",
      definitionStateDraftRows: [],
      definitionStatePageId: DEFAULT_STATE_PAGE_ID,
      definitionStatePreviewVisual: null,
      definitionTemplateIconInputRef: { current: null },
      definitionVisualDraft: {
        backgroundImage: "",
        backgroundImageAssetId: "",
        backgroundImageCleared: "",
        size: { ...template.size },
        terminalCount: 0,
        terminalTypes: [],
        terminalLabels: [],
        terminalAnchors: [],
        error: ""
      },
      definitionVisualPreviewHeight: template.size.height,
      definitionVisualPreviewImage: "",
      definitionVisualPreviewWidth: template.size.width,
      definitionVisualTerminalAnchors: [],
      definitionVisualTerminalTypes: [],
      isDefaultStatePageId,
      renderStateVisualPager: () => null,
      setDefinitionDraftError: (value: string) => {
        restoredError = value;
      },
      setDefinitionStateDraftRows: (rows: any[]) => {
        restoredRows = rows;
      },
      setDefinitionStatePageId: (pageId: string) => {
        restoredPageId = pageId;
      },
      setDefinitionVisualDraft: (draft: any) => {
        restoredDraft = draft;
      }
    });

    const panel = renderPanel(template);
    const restoreButton = findElementByText(panel, "恢复当前元件状态");
    expect(restoreButton).toBeTruthy();

    restoreButton.props.onClick();

    expect(restoredDraft.backgroundImage).toBe("");
    expect(restoredDraft.backgroundImageAssetId).toBe("");
    expect(restoredDraft.backgroundImageCleared).toBe("");
    expect(restoredRows).toHaveLength(2);
    expect(restoredRows[0].image).toBe("");
    expect(restoredPageId).toBe(DEFAULT_STATE_PAGE_ID);
    expect(restoredError).toBe("");
  });

  test("renders built-in vertical template terminals on the editor outer frame", () => {
    const template = DEVICE_LIBRARY.find((item) => item.kind === "two-port-heat-load-vertical");
    expect(template).toBeTruthy();
    if (!template) {
      return;
    }
    const draft = createCustomDeviceDraftFromTemplate(template);
    const renderPager = createRenderStateVisualPager({
      DEFAULT_STATE_PAGE_ID,
      DEVICE_LIBRARY: [],
      BufferedTextInput: "input",
      DeferredColorInput: "input",
      FONT_FAMILY_OPTIONS: [],
      FONT_FAMILY_OPTION_LABELS: {},
      STATE_ICON_LINE_CAP_OPTIONS: [],
      TERMINAL_TYPE_LIBRARY_LABELS: {},
      activeStateDraftRow,
      addStateIconDrawingElement: () => undefined,
      appendNonDefaultStateDraftRow,
      colorPalette: {},
      createNodeFromTemplate,
      createStateDraftRowFromDefaultVisual,
      createStateIconDrawingElement,
      customDeviceDefaultStateVisualDraft: () => ({}),
      customDeviceDraft: draft,
      customDeviceTerminalAnchorDragIndex: null,
      customDeviceTerminalAnchorValue: (value: number) => value,
      customDeviceTerminalAnchors: draft.terminalAnchors,
      customDraftTerminalTypes: draft.terminalTypes,
      defaultStateDraftRow,
      definitionDefaultStateVisualDraft: () => ({}),
      definitionTerminalAnchorDragIndex: null,
      definitionVisualDraft: null,
      definitionVisualTerminalAnchors: [],
      definitionVisualTerminalTypes: [],
      deleteSelectedStateIconDrawingElements: () => undefined,
      deleteStateIconDrawingElement: () => undefined,
      dragStateIconDrawingSelection: () => undefined,
      formatSvgNumber: (value: number) => String(Math.round(value * 1000) / 1000),
      getNodeScaleX,
      getNodeScaleY,
      isDefaultStatePageId,
      nextNonDefaultStateIndex,
      nonDefaultStateDraftRows,
      projectCustomDeviceTerminalAnchorToBoundary,
      resolveTemplateComponentLibrary,
      selectedDefinitionTemplate: null,
      setCustomDeviceDraft: () => undefined,
      setCustomDeviceTerminalAnchorDragIndex: () => undefined,
      setDefinitionStateDraftRows: () => undefined,
      setDefinitionTerminalAnchorDragIndex: () => undefined,
      setImagePickerCategoryFilter: () => undefined,
      setImagePickerSearchQuery: () => undefined,
      setImagePickerSourceFilter: () => undefined,
      setImageTarget: () => undefined,
      setStateIconDrawingContextMenu: () => undefined,
      setStateIconDrawingDialog: () => undefined,
      setStateIconDrawingImageVisibleFrames: () => undefined,
      setStateIconDrawingSvgVisibleFrames: () => undefined,
      stateDraftRowId: () => "state-copy",
      stateIconDrawingClipboardRef: { current: [] },
      stateIconDrawingContextMenu: null,
      stateIconDrawingDialog: {
        target: { scope: "custom", rowId: DEFAULT_STATE_PAGE_ID },
        elements: [],
        selectedElementId: "",
        selectedElementIds: []
      },
      stateIconDrawingElementPreviewImage: () => null,
      stateIconDrawingElementPreviewNode: () => null,
      stateIconDrawingFrameRect: (hasTerminals: boolean) =>
        hasTerminals ? { x: 30, y: 20, width: 180, height: 120, rx: 8 } : { x: 0, y: 0, width: 240, height: 160, rx: 10 },
      stateIconDrawingHistoryRef: { current: [] },
      stateIconDrawingImageVisibleFrames: {},
      stateIconDrawingKeyDown: () => undefined,
      stateIconDrawingPointer: () => ({ x: 0, y: 0 }),
      stateIconDrawingPreviewNeedsDirectElementRender: () => false,
      stateIconDrawingSvgRef: { current: null },
      stateIconDrawingSvgVisibleFrames: {},
      stateIconDrawingToImage: () => "",
      stateVisualShapeLabel: (kind: string) => kind,
      startStateIconDrawingDrag: () => undefined,
      stopStateIconDrawingDrag: () => undefined,
      terminalColor: () => "#2563eb",
      terminalRenderLocalPoint,
      terminalStubSegment,
      terminalStubStrokeWidth,
      updateCustomDeviceTerminalAnchor: () => undefined,
      updateDefinitionTerminalAnchor: () => undefined,
      updateStateIconDrawingElement: () => undefined,
      visibleStateIconColor: () => "#2563eb"
    });

    const tree = renderPager(draft.stateDefinitions, DEFAULT_STATE_PAGE_ID, () => undefined, {
      update: () => undefined,
      add: () => undefined,
      remove: () => undefined,
      drawingScope: "custom",
      terminalGeometryTemplate: template
    } as any);

    const geometryLayers = findElementsByClassName(tree, "state-icon-terminal-canvas-geometry-layer");
    expect(geometryLayers).toHaveLength(1);
    const anchorPoints = findElementsByClassName(geometryLayers[0], "state-icon-terminal-anchor").map((node) =>
      pointFromTranslate(String(node.props?.transform ?? ""))
    );
    expect(anchorPoints).toHaveLength(2);
    expect(Math.abs(anchorPoints[0].x - anchorPoints[1].x)).toBeLessThan(1);
    expect(Math.abs(anchorPoints[0].x - 120)).toBeLessThan(1);
    expect(Math.abs(anchorPoints[1].x - 120)).toBeLessThan(1);
    expect(Math.min(...anchorPoints.map((point) => point.y))).toBeCloseTo(0, 5);
    expect(Math.max(...anchorPoints.map((point) => point.y))).toBeCloseTo(160, 5);
  });

  test("renders dynamic terminal anchor guides from the dragged outer anchor", () => {
    const template = DEVICE_LIBRARY.find((item) => item.kind === "two-port-heat-load-vertical");
    expect(template).toBeTruthy();
    if (!template) {
      return;
    }
    const draft = createCustomDeviceDraftFromTemplate(template);
    const renderPager = createRenderStateVisualPager({
      DEFAULT_STATE_PAGE_ID,
      DEVICE_LIBRARY: [],
      BufferedTextInput: "input",
      DeferredColorInput: "input",
      FONT_FAMILY_OPTIONS: [],
      FONT_FAMILY_OPTION_LABELS: {},
      STATE_ICON_LINE_CAP_OPTIONS: [],
      TERMINAL_TYPE_LIBRARY_LABELS: {},
      activeStateDraftRow,
      addStateIconDrawingElement: () => undefined,
      appendNonDefaultStateDraftRow,
      colorPalette: {},
      createNodeFromTemplate,
      createStateDraftRowFromDefaultVisual,
      createStateIconDrawingElement,
      customDeviceDefaultStateVisualDraft: () => ({}),
      customDeviceDraft: draft,
      customDeviceTerminalAnchorDragIndex: 0,
      customDeviceTerminalAnchorValue: (value: number) => value,
      customDeviceTerminalAnchors: draft.terminalAnchors,
      customDraftTerminalTypes: draft.terminalTypes,
      defaultStateDraftRow,
      definitionDefaultStateVisualDraft: () => ({}),
      definitionTerminalAnchorDragIndex: null,
      definitionVisualDraft: null,
      definitionVisualTerminalAnchors: [],
      definitionVisualTerminalTypes: [],
      deleteSelectedStateIconDrawingElements: () => undefined,
      deleteStateIconDrawingElement: () => undefined,
      dragStateIconDrawingSelection: () => undefined,
      formatSvgNumber: (value: number) => String(Math.round(value * 1000) / 1000),
      getNodeScaleX,
      getNodeScaleY,
      isDefaultStatePageId,
      nextNonDefaultStateIndex,
      nonDefaultStateDraftRows,
      projectCustomDeviceTerminalAnchorToBoundary,
      resolveTemplateComponentLibrary,
      selectedDefinitionTemplate: null,
      setCustomDeviceDraft: () => undefined,
      setCustomDeviceTerminalAnchorDragIndex: () => undefined,
      setDefinitionStateDraftRows: () => undefined,
      setDefinitionTerminalAnchorDragIndex: () => undefined,
      setImagePickerCategoryFilter: () => undefined,
      setImagePickerSearchQuery: () => undefined,
      setImagePickerSourceFilter: () => undefined,
      setImageTarget: () => undefined,
      setStateIconDrawingContextMenu: () => undefined,
      setStateIconDrawingDialog: () => undefined,
      setStateIconDrawingImageVisibleFrames: () => undefined,
      setStateIconDrawingSvgVisibleFrames: () => undefined,
      stateDraftRowId: () => "state-copy",
      stateIconDrawingClipboardRef: { current: [] },
      stateIconDrawingContextMenu: null,
      stateIconDrawingDialog: {
        target: { scope: "custom", rowId: DEFAULT_STATE_PAGE_ID },
        elements: [],
        selectedElementId: "",
        selectedElementIds: []
      },
      stateIconDrawingElementPreviewImage: () => null,
      stateIconDrawingElementPreviewNode: () => null,
      stateIconDrawingFrameRect: (hasTerminals: boolean) =>
        hasTerminals ? { x: 30, y: 20, width: 180, height: 120, rx: 8 } : { x: 0, y: 0, width: 240, height: 160, rx: 10 },
      stateIconDrawingHistoryRef: { current: [] },
      stateIconDrawingImageVisibleFrames: {},
      stateIconDrawingKeyDown: () => undefined,
      stateIconDrawingPointer: () => ({ x: 0, y: 0 }),
      stateIconDrawingPreviewNeedsDirectElementRender: () => false,
      stateIconDrawingSvgRef: { current: null },
      stateIconDrawingSvgVisibleFrames: {},
      stateIconDrawingToImage: () => "",
      stateVisualShapeLabel: (kind: string) => kind,
      startStateIconDrawingDrag: () => undefined,
      stopStateIconDrawingDrag: () => undefined,
      terminalColor: () => "#2563eb",
      terminalRenderLocalPoint,
      terminalStubSegment,
      terminalStubStrokeWidth,
      updateCustomDeviceTerminalAnchor: () => undefined,
      updateDefinitionTerminalAnchor: () => undefined,
      updateStateIconDrawingElement: () => undefined,
      visibleStateIconColor: () => "#2563eb"
    });

    const tree = renderPager(draft.stateDefinitions, DEFAULT_STATE_PAGE_ID, () => undefined, {
      update: () => undefined,
      add: () => undefined,
      remove: () => undefined,
      drawingScope: "custom",
      terminalGeometryTemplate: template
    } as any);

    const geometryLayers = findElementsByClassName(tree, "state-icon-terminal-canvas-geometry-layer");
    expect(geometryLayers).toHaveLength(1);
    const guideLayers = findElementsByClassName(geometryLayers[0], "state-icon-terminal-dynamic-guide-layer");
    expect(guideLayers).toHaveLength(1);

    const activeVerticalGuides = findElementsByClassName(guideLayers[0], "state-icon-terminal-anchor-guide-vertical");
    const activeHorizontalGuides = findElementsByClassName(guideLayers[0], "state-icon-terminal-anchor-guide-horizontal");
    expect(activeVerticalGuides.length).toBeGreaterThanOrEqual(1);
    expect(activeHorizontalGuides.length).toBeGreaterThanOrEqual(1);
    expect(Number(activeVerticalGuides[0].props.x1)).toBeCloseTo(120, 5);
    expect(Number(activeVerticalGuides[0].props.x2)).toBeCloseTo(120, 5);
    expect(Number(activeHorizontalGuides[0].props.y1)).toBeCloseTo(0, 5);
    expect(Number(activeHorizontalGuides[0].props.y2)).toBeCloseTo(0, 5);
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
    let treeSelection: any = { kind: "component", categoryLibraryName: staticTextTemplate.categoryLibrary, section: "StaticTextSymbol", templateKind: staticTextTemplate.kind };
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
        ensureCustomComponentTreeExpanded: (categoryLibraryName: string, section: string) => {
          expandedRequests.push([categoryLibraryName, section]);
        },
        normalizeCategoryLibraryName: (value: string) => value,
        normalizeComponentLibraryName: (value: string) => value,
        resolveTemplateComponentLibrary,
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
        categoryLibraryName: "氢能设备",
        section: "HydroCompressor",
        templateKind: "hydrogen-compressor"
      });
      expect(editingCustomDeviceKind).toBe("");
      expect(customDeviceStatePageId).toBe(DEFAULT_STATE_PAGE_ID);
      expect(draft.componentName).toBe("氢压机");
      expect(draft.componentLibrary).toBe("HydroCompressor");
      expect(draft.terminalCount).toBe(2);
    } finally {
      if (previousWindow === undefined) {
        delete (globalThis as any).window;
      } else {
        (globalThis as any).window = previousWindow;
      }
    }
  });

  test("selecting a built-in breaker component loads model glyphs for state 0 and state 1", () => {
    const template = DEVICE_LIBRARY.find((item) => item.kind === "ac-breaker");
    expect(template).toBeTruthy();
    if (!template) {
      return;
    }

    let draft: any = null;
    const selectTemplate = createSelectCustomComponentTemplate({
      ...APP_STATIC_SCOPE,
      DEFAULT_STATE_PAGE_ID,
      createCustomDeviceDraftFromTemplate,
      customComponentSelectionFrameRef: { current: null },
      customComponentSelectionRequestRef: { current: 0 },
      customDeviceDefinitionMode: "edit",
      ensureCustomComponentTreeExpanded: () => undefined,
      imageAssets: {},
      normalizeCategoryLibraryName: (value: string) => value,
      normalizeComponentLibraryName: (value: string) => value,
      resolveTemplateComponentLibrary,
      setCustomComponentTreeSelection: () => undefined,
      setCustomDeviceDraft: (next: any) => {
        draft = typeof next === "function" ? next(draft) : next;
      },
      setCustomDeviceDraftCleanBaseline: () => undefined,
      setCustomDeviceSaveMessage: () => undefined,
      setCustomDeviceStatePageId: () => undefined,
      setDefinitionDraftSection: () => undefined,
      setEditingCustomDeviceKind: () => undefined,
      setSelectedDefinitionKind: () => undefined
    });

    selectTemplate(template);

    const openSvg = decodeSvgDataUrl(draft.stateDefinitions.find((row: any) => row.value === "0")?.image ?? "");
    const closedSvg = decodeSvgDataUrl(draft.stateDefinitions.find((row: any) => row.value === "1")?.image ?? "");
    expect(openSvg).toContain('d="M -8 8 L 8 -8"');
    expect(openSvg).not.toContain('M -64 0 H 64');
    expect(closedSvg).toContain('d="M -10 0 H 10"');
    expect(closedSvg).not.toContain('M -64 0 H 64');
  });

  test("adds a custom component state from the latest default state icon", () => {
    const staleStateRow = createStateDraftRow({ value: "0", name: "状态0", image: "old-state.svg" });
    const latestStateRow = createStateDraftRow({ value: "0", name: "状态0", image: "latest-state.svg" });
    let draft: any = {
      stateDefinitions: [latestStateRow],
      error: "old error"
    };
    let activePageId = "";
    const addState = createAddCustomDeviceStateDraftRow({
      appendNonDefaultStateDraftRow,
      createStateDraftRowFromDefaultVisual,
      customDeviceDefaultStateVisualDraft: () => ({ image: "latest-default.svg" }),
      customDeviceDraft: {
        stateDefinitions: [staleStateRow]
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
    const staleStateRow = createStateDraftRow({ value: "0", name: "状态0", image: "old-state.svg" });
    const latestStateRow = createStateDraftRow({ value: "0", name: "状态0", image: "latest-state.svg" });
    let rows = [latestStateRow];
    let activePageId = "";
    let draftError = "old error";
    const addState = createAddDefinitionStateDraftRow({
      appendNonDefaultStateDraftRow,
      createStateDraftRowFromDefaultVisual,
      defaultStateDraftRow,
      definitionDefaultStateVisualDraft: () => ({ image: "latest-definition.svg" }),
      definitionStateDraftRows: [staleStateRow],
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
    const oldStateRow = createStateDraftRow({ value: "0", name: "状态0", image: "old-state.svg" });
    let draft: any = {
      stateDefinitions: [oldStateRow],
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
      image: "old-state.svg"
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
    const oldStateRow = createStateDraftRow({ value: "0", name: "状态0", image: "old-state.svg" });
    let rows = [oldStateRow];
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
      image: "old-state.svg"
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

  test("restores generated default device SVG layers at the explicit inner content size", () => {
    const generatedSource = '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="160" viewBox="0 0 240 160"><g transform="translate(120 80)"><svg x="-90" y="-60" width="180" height="120" viewBox="-68 -45 136 90" preserveAspectRatio="xMidYMid meet"><g><path d="M -40 0 H 40" stroke="#dc2626" stroke-width="4" fill="none"/></g></svg></g></svg>';

    const restored = createEditableStateIconElementsFromSvgSource(generatedSource, "双端热荷");

    expect(restored).toHaveLength(1);
    expect(restored[0]).toMatchObject({
      kind: "imported-svg",
      x: 120,
      y: 80,
      width: 180,
      height: 120
    });
    expect(restored[0].svgSource).toContain('viewBox="-68 -45 136 90"');
  });

  test("marks generated three-winding transformer SVGs to preserve the model viewport", () => {
    const template = DEVICE_LIBRARY.find((item) => item.kind === "ac-three-winding-transformer");
    expect(template).toBeTruthy();
    if (!template) {
      return;
    }
    const defaultVisual = createDefinitionDefaultStateVisualDraft({
      ...APP_STATIC_SCOPE,
      definitionVisualDraft: {
        backgroundImage: "",
        backgroundImageAssetId: "",
        backgroundImageCleared: "",
        size: { ...template.size },
        terminalCount: template.terminalCount,
        terminalTypes: template.terminalTypes ?? [],
        terminalLabels: template.terminalLabels ?? [],
        terminalAnchors: template.terminalAnchors ?? []
      },
      selectedDefinitionTemplate: template
    })();
    const imageSource = decodeURIComponent(String(defaultVisual.image ?? "").split(",")[1] ?? "");

    expect(imageSource).toContain('data-state-icon-preserve-view-box="true"');
    expect(imageSource).toContain('viewBox="-75 -55 150 110"');
  });

  test("generates built-in source SVGs with the same viewport as the canvas glyph", () => {
    const template = DEVICE_LIBRARY.find((item) => item.kind === "ac-pv-source");
    expect(template).toBeTruthy();
    if (!template) {
      return;
    }
    const defaultVisual = createDefinitionDefaultStateVisualDraft({
      ...APP_STATIC_SCOPE,
      definitionVisualDraft: {
        backgroundImage: "",
        backgroundImageAssetId: "",
        backgroundImageCleared: "",
        size: { ...template.size },
        terminalCount: template.terminalCount,
        terminalTypes: template.terminalTypes ?? [],
        terminalLabels: template.terminalLabels ?? [],
        terminalAnchors: template.terminalAnchors ?? []
      },
      selectedDefinitionTemplate: template
    })();
    const imageSource = decodeURIComponent(String(defaultVisual.image ?? "").split(",")[1] ?? "");

    expect(imageSource).toContain('data-state-icon-preserve-view-box="true"');
    expect(imageSource).toContain('viewBox="-75 -47 150 94"');
    expect(imageSource).not.toContain('viewBox="-87 -59 174 118"');
  });

  test("keeps generated viewBox preservation when sanitizing and resaving SVG layers", () => {
    const source = '<svg xmlns="http://www.w3.org/2000/svg" data-state-icon-preserve-view-box="true" viewBox="-68 -45 136 90"><g><path d="M -40 0 H 40" stroke="#dc2626" stroke-width="4" fill="none"/></g></svg>';
    const originalDOMParser = (globalThis as any).DOMParser;
    (globalThis as any).DOMParser = class {
      parseFromString() {
        const child = {
          tagName: "g",
          outerHTML: '<g><path d="M -40 0 H 40" stroke="#dc2626" stroke-width="4" fill="none"/></g>'
        };
        const svg = {
          children: [child],
          getAttribute: (name: string) => name === "viewBox" ? "-68 -45 136 90" : null
        };
        return {
          querySelector: (selector: string) => selector === "svg" ? svg : null
        };
      }
    };

    try {
      expect(stateIconSvgElementSource(source)).toContain('data-state-icon-preserve-view-box="true"');
    } finally {
      (globalThis as any).DOMParser = originalDOMParser;
    }

    const element = createImportedStateIconElement("imported-svg", source, "三绕组主变");
    const savedSource = decodeURIComponent(stateIconDrawingToImage([element]).split(",")[1] ?? "");

    expect(savedSource).toContain('data-state-icon-preserve-view-box="true"');
    expect(savedSource).toContain('viewBox="-68 -45 136 90"');
  });

  test("does not mark ordinary imported SVGs as preserving their declared viewBox", () => {
    const element = createImportedStateIconElement(
      "imported-svg",
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 80"><rect x="20" y="10" width="40" height="40"/></svg>',
      "普通导入图标"
    );
    const savedSource = decodeURIComponent(stateIconDrawingToImage([element]).split(",")[1] ?? "");

    expect(savedSource).not.toContain("data-state-icon-preserve-view-box");
  });

  test("does not restore generated frame markup as an editable drawing element", () => {
    const element = {
      ...createStateIconDrawingElement("circle"),
      id: "circle-with-frame",
      x: 120,
      y: 80
    };
    const imageSource = decodeURIComponent(stateIconDrawingToImage([element], {
      frameHasTerminals: true,
      frame: {
        strokeStyle: "dashed",
        strokeWidth: 1,
        strokeColor: "#64748b",
        fillColor: "transparent"
      }
    }).split(",")[1] ?? "");

    const restored = createEditableStateIconElementsFromSvgSource(imageSource, "状态0");

    expect(imageSource).toContain('data-state-icon-frame="true"');
    expect(restored).toHaveLength(1);
    expect(restored[0]).toMatchObject({ kind: "circle" });
  });

  test("restores generated rectangle drawing elements after saving and reopening", () => {
    const rectangle = {
      ...createStateIconDrawingElement("rectangle"),
      id: "saved-rectangle",
      x: 118,
      y: 112,
      width: 132,
      height: 32,
      strokeWidth: 5,
      strokeColor: "#4361ee",
      fillColor: "transparent"
    };
    const imageSource = decodeURIComponent(stateIconDrawingToImage([rectangle], {
      frameHasTerminals: true,
      frame: {
        strokeStyle: "dashed",
        strokeWidth: 1,
        strokeColor: "#64748b",
        fillColor: "transparent"
      }
    }).split(",")[1] ?? "");

    const restored = createEditableStateIconElementsFromSvgSource(imageSource, "状态0");

    expect(restored).toHaveLength(1);
    expect(restored[0]).toMatchObject({
      kind: "rectangle",
      x: 118,
      y: 112,
      width: 132,
      height: 32,
      strokeWidth: 5,
      strokeColor: "#4361ee",
      fillColor: "transparent"
    });
  });

  test("applies edited stroke attributes to imported SVG layers", () => {
    const importedElement = {
      ...createImportedStateIconElement(
        "imported-svg",
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 80"><rect x="20" y="10" width="40" height="40" stroke="#000000" stroke-width="12" fill="none"/></svg>',
        "方框"
      ),
      id: "styled-imported-svg",
      strokeColor: "#ef4444",
      strokeWidth: 3,
      strokeStyle: "dashed" as const
    };

    const imageSource = decodeURIComponent(stateIconDrawingToImage([importedElement]).split(",")[1] ?? "");

    expect(imageSource).toContain("stroke:#ef4444 !important");
    expect(imageSource).toContain("stroke-width:3 !important");
    expect(imageSource).toContain("stroke-dasharray:9 5.4 !important");
  });

  test("applies edited stroke color to imported SVG layers without forcing stroke width", () => {
    const importedElement = {
      ...createImportedStateIconElement(
        "imported-svg",
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 80"><path d="M 10 10 H 90" stroke="#000000" stroke-width="4" fill="none"/></svg>',
        "线段"
      ),
      strokeColor: "#ef4444",
      strokeColorEdited: true
    };

    const imageSource = decodeURIComponent(stateIconDrawingToImage([importedElement]).split(",")[1] ?? "");

    expect(imageSource).toContain("stroke:#ef4444 !important");
    expect(imageSource).toContain('stroke-width="4"');
    expect(imageSource).not.toContain("stroke-width:0 !important");
  });

  test("applies edited stroke color after restored imported SVG style overrides", () => {
    const importedElement = {
      ...createImportedStateIconElement(
        "imported-svg",
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 80"><style>path,line,polyline,polygon,rect,circle,ellipse{stroke:#000000 !important;stroke-width:4 !important;}</style><path d="M 10 10 H 90" stroke="#000000" stroke-width="4" fill="none"/></svg>',
        "线段"
      ),
      strokeColor: "#ef4444",
      strokeColorEdited: true
    };

    const imageSource = decodeURIComponent(stateIconDrawingToImage([importedElement]).split(",")[1] ?? "");

    expect(imageSource.indexOf("stroke:#ef4444 !important")).toBeGreaterThan(imageSource.indexOf("stroke:#000000 !important"));
  });

  test("preserves imported SVG stroke widths when no edited stroke width is set", () => {
    const importedElement = createImportedStateIconElement(
      "imported-svg",
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 80"><path d="M 10 10 H 90" stroke="#000000" stroke-width="4" fill="none"/></svg>',
      "线段"
    );

    const imageSource = decodeURIComponent(stateIconDrawingToImage([importedElement]).split(",")[1] ?? "");

    expect(importedElement.strokeWidth).toBe(0);
    expect(imageSource).toContain('stroke-width="4"');
    expect(imageSource).not.toContain("stroke-width:0 !important");
  });

  test("strips generated zero-width SVG style overrides from restored imported layers", () => {
    const importedElement = createImportedStateIconElement(
      "imported-svg",
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="-33 -33 66 54"><style>path,line,polyline,polygon,rect,circle,ellipse{stroke:#2563eb !important;stroke-width:0 !important;stroke-dasharray:none !important;vector-effect:non-scaling-stroke !important;}</style><g fill="#ffffff" stroke="#2563eb" stroke-width="2.2"><path d="M -22 -12 H 22 V 14 H -22 Z"/></g></svg>',
      "交流开关"
    );

    const imageSource = decodeURIComponent(stateIconDrawingToImage([importedElement]).split(",")[1] ?? "");

    expect(importedElement.svgSource).not.toContain("stroke-width:0 !important");
    expect(imageSource).toContain('stroke-width="2.2"');
    expect(imageSource).not.toContain("stroke-width:0 !important");
  });

  test("preserves imported SVG stroke widths in direct preview rendering when no edited stroke width is set", () => {
    const pathElement = {
      tagName: "path",
      attributes: [
        { name: "d", value: "M 10 10 H 90" },
        { name: "stroke", value: "#000000" },
        { name: "stroke-width", value: "4" },
        { name: "fill", value: "none" }
      ]
    } as any;

    const props = stateIconSvgReactAttributes(pathElement, {
      stroke: "#2563eb",
      strokeWidth: 0,
      dashArray: ""
    } as any);

    expect(props.stroke).toBe("#000000");
    expect(props.strokeWidth).toBe("4");
    expect(props.fill).toBe("none");
    expect(props.vectorEffect).toBeUndefined();
  });

  test("maps pointer-events attributes for imported SVG direct preview rendering", () => {
    const pathElement = {
      tagName: "path",
      attributes: [
        { name: "d", value: "M 10 10 H 90" },
        { name: "pointer-events", value: "none" }
      ]
    } as any;

    const props = stateIconSvgReactAttributes(pathElement);

    expect(props.pointerEvents).toBe("none");
    expect(props["pointer-events"]).toBeUndefined();
  });

  test("maps pointer-events attributes on imported SVG groups and lines", () => {
    const groupElement = {
      tagName: "g",
      attributes: [
        { name: "pointer-events", value: "none" }
      ]
    } as any;
    const lineElement = {
      tagName: "line",
      attributes: [
        { name: "x1", value: "0" },
        { name: "y1", value: "0" },
        { name: "x2", value: "10" },
        { name: "y2", value: "10" },
        { name: "pointer-events", value: "none" }
      ]
    } as any;
    const groupProps = stateIconSvgReactAttributes(groupElement);
    const lineProps = stateIconSvgReactAttributes(lineElement);

    expect(groupProps.pointerEvents).toBe("none");
    expect(groupProps["pointer-events"]).toBeUndefined();
    expect(lineProps.pointerEvents).toBe("none");
    expect(lineProps["pointer-events"]).toBeUndefined();
  });

  test("applies edited stroke color in direct preview rendering while preserving imported SVG stroke width", () => {
    const pathElement = {
      tagName: "path",
      attributes: [
        { name: "d", value: "M 10 10 H 90" },
        { name: "stroke", value: "#000000" },
        { name: "stroke-width", value: "4" },
        { name: "fill", value: "none" }
      ]
    } as any;

    const props = stateIconSvgReactAttributes(pathElement, {
      stroke: "#ef4444",
      strokeWidth: 0,
      dashArray: "",
      strokeColorEdited: true
    } as any);

    expect(props.stroke).toBe("#ef4444");
    expect(props.strokeWidth).toBe("4");
    expect(props.fill).toBe("none");
    expect(props.vectorEffect).toBeUndefined();
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

  test("directly renders state icon previews that contain imported SVG or bitmap image layers", () => {
    const line = createStateIconDrawingElement("line");
    const svgLayer = createImportedStateIconElement(
      "imported-svg",
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M4 12h16"/></svg>',
      "line.svg"
    );
    const emptyImage = createImportedStateIconElement("image", "", "empty.png");
    const imageLayer = createImportedStateIconElement("image", apiPath("/images/icon.png"), "icon.png");

    expect(stateIconDrawingPreviewNeedsDirectElementRender([line, emptyImage])).toBe(false);
    expect(stateIconDrawingPreviewNeedsDirectElementRender([line, svgLayer, emptyImage])).toBe(true);
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
