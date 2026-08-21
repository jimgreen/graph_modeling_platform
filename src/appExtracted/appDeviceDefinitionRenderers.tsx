// @ts-nocheck
import React from "react";
import { formatStateIconDrawingNumber, normalizeStateIconDrawingFontSize, normalizeStateIconDrawingStrokeWidth } from "./appDeviceDefinitionFactories";
import { STATE_ICON_DRAWING_MIN_FONT_SIZE, appendDistinctStateIconDrawingPoint, clampStateIconDrawingPoint, clearGeneratedDefinitionVisualDraftImage, cloneStateIconDrawingElements, createDefinitionStateDraftRowsWithDefaultImages, createStateIconDrawingElementFromStaticTemplate, cutStateIconDrawingSelection, expandStateIconDrawingElementIds, finishStateIconDrawingDraft, groupStateIconDrawingSelection, pushStateIconDrawingHistorySnapshot, stateIconDrawingElementBounds, stateIconDrawingElementFromPoints, stateIconDrawingElementIdsInRect, stateIconDrawingFrameDashArray, stateIconDrawingImportedSvgSelectionFrame, stateIconDrawingPolylineElementFromPoints, stateIconDrawingRectFromPoints, stateIconDrawingSelectedIds, stateIconDrawingSelectionBounds, stateIconDrawingTerminalPointSnap, stateIconStaticTemplateParam, ungroupStateIconDrawingSelection } from "./appDeviceDefinitionFactories";
import { IMAGE_FIT_MODE_OPTIONS, imageFitPreserveAspectRatio, normalizeImageFitMode } from "../imageFit";
import { STATE_ICON_DRAFT_FRAME, STATE_ICON_DRAWING_FRAME_WIDTH, STATE_ICON_DRAWING_FRAME_HEIGHT, STATE_ICON_CLOSED_SHAPE_KINDS, STATE_ICON_LINE_SHAPE_KINDS, STATE_ICON_STATIC_TEMPLATE_SECTIONS_COVERED_BY_BASIC_TOOLS, STATE_ICON_STATIC_TEMPLATE_SECTION_ORDER } from "./appDeviceDefinitionEInterface";
import { modelAssociationDeviceModelTypeFailureMessage } from "../model";

import type { DeviceDefinitionStateDraftRow } from "../stateIconDrawing";

export function stateIconDrawingContextMenuPosition(
  clientPoint: { x: number; y: number },
  options: {
    hostRect?: { left: number; top: number; right: number; bottom: number; width: number; height: number } | null;
    hostOffsetWidth?: number;
    hostOffsetHeight?: number;
    hostClientLeft?: number;
    hostClientTop?: number;
    viewportWidth?: number;
    viewportHeight?: number;
    menuWidth?: number;
    menuHeight?: number;
    margin?: number;
  } = {}
) {
  const menuWidth = Math.max(1, options.menuWidth ?? 148);
  const menuHeight = Math.max(1, options.menuHeight ?? 230);
  const margin = Math.max(0, options.margin ?? 6);
  const viewportWidth = Math.max(1, options.viewportWidth ?? Number.POSITIVE_INFINITY);
  const viewportHeight = Math.max(1, options.viewportHeight ?? Number.POSITIVE_INFINITY);
  const hostRect = options.hostRect ?? null;
  const visibleLeft = Math.max(0, hostRect?.left ?? 0) + margin;
  const visibleTop = Math.max(0, hostRect?.top ?? 0) + margin;
  const visibleRight = Math.min(viewportWidth, hostRect?.right ?? viewportWidth) - margin;
  const visibleBottom = Math.min(viewportHeight, hostRect?.bottom ?? viewportHeight) - margin;
  const maxLeft = Math.max(visibleLeft, visibleRight - menuWidth);
  const maxTop = Math.max(visibleTop, visibleBottom - menuHeight);
  const preferredLeft = clientPoint.x + menuWidth <= visibleRight
    ? clientPoint.x
    : clientPoint.x - menuWidth;
  const preferredTop = clientPoint.y + menuHeight <= visibleBottom
    ? clientPoint.y
    : clientPoint.y - menuHeight;
  const clientLeft = Math.min(maxLeft, Math.max(visibleLeft, preferredLeft));
  const clientTop = Math.min(maxTop, Math.max(visibleTop, preferredTop));
  if (!hostRect) {
    return { x: clientLeft, y: clientTop };
  }
  const scaleX = hostRect.width > 0 && Number(options.hostOffsetWidth) > 0
    ? hostRect.width / Number(options.hostOffsetWidth)
    : 1;
  const scaleY = hostRect.height > 0 && Number(options.hostOffsetHeight) > 0
    ? hostRect.height / Number(options.hostOffsetHeight)
    : 1;
  const hostPaddingLeft = hostRect.left + Math.max(0, Number(options.hostClientLeft) || 0) * scaleX;
  const hostPaddingTop = hostRect.top + Math.max(0, Number(options.hostClientTop) || 0) * scaleY;
  return {
    x: (clientLeft - hostPaddingLeft) / scaleX,
    y: (clientTop - hostPaddingTop) / scaleY
  };
}

export function createRenderStateVisualPager(__appScope: Record<string, any>) {
  return (
    rows: DeviceDefinitionStateDraftRow[],
    activeRowId: string,
    setActiveRowId: (rowId: string) => void,
    handlers: {
      update: (rowId: string, patch: Partial<DeviceDefinitionStateDraftRow>) => void;
      add: () => void;
      remove: (rowId: string) => void;
      reset?: () => void;
      resetLabel?: string;
      saveStateVisuals?: () => void;
      saveStateVisualsLabel?: string;
      drawingScope?: "definition" | "custom";
      definitionTemplate?: any;
      terminalGeometryTemplate?: any;
      hideDefaultPage?: boolean;
    }
  ) => {
  const { BufferedTextInput, COMPONENT_LIBRARY_LABELS, CUSTOM_DEVICE_TERMINAL_ANCHOR_GUIDE_VALUES, CUSTOM_DEVICE_TERMINAL_ANCHOR_PRECISION, DEFAULT_STATE_PAGE_ID, DEVICE_LIBRARY, DeferredColorInput, FONT_FAMILY_OPTIONS, FONT_FAMILY_OPTION_LABELS, MemoDeviceGlyph, STATE_ICON_LINE_CAP_OPTIONS, TERMINAL_TYPE_LIBRARY_LABELS, activeStateDraftRow, addStateIconDrawingElement, appendNonDefaultStateDraftRow, button, circle, colorPalette, createNodeFromTemplate, createStateDraftRowFromDefaultVisual, createStateIconDrawingElement, customDeviceDefaultStateVisualDraft, customDeviceDraft, customDeviceTerminalAnchorDragIndex, customDeviceTerminalAnchorValue, customDeviceTerminalAnchors, customDraftTerminalTypes, defaultStateDraftRow, definitionDefaultStateVisualDraft, definitionTerminalAnchorDragIndex, definitionVisualDraft, definitionVisualTerminalAnchors, definitionVisualTerminalTypes, deleteSelectedStateIconDrawingElements, deleteStateIconDrawingElement, div, dragStateIconDrawingSelection, formatSvgNumber, g, getNodeScaleX, getNodeScaleY, image, imageAssets, isDefaultStatePageId, label, line, nextNonDefaultStateIndex, nodeGeometryTransform, nonDefaultStateDraftRows, projectCustomDeviceTerminalAnchorToBoundary, rect, resolveTemplateComponentLibrary, selectedDefinitionTemplate, setCustomDeviceDraft, setCustomDeviceTerminalAnchorDragIndex, setDefinitionStateDraftRows, setDefinitionTerminalAnchorDragIndex, setImagePickerCategoryFilter, setImagePickerSearchQuery, setImagePickerSourceFilter, setImageTarget, setStateIconDrawingContextMenu, setStateIconDrawingDialog, setStateIconDrawingImageVisibleFrames, setStateIconDrawingSvgVisibleFrames, small, span, stateDraftRowId, stateIconDrawingClipboardRef, stateIconDrawingContextMenu, stateIconDrawingDialog, stateIconDrawingDragDeltaRef, stateIconDrawingDragRef, stateIconDrawingElementId, stateIconDrawingElementPreviewImage, stateIconDrawingElementPreviewNode, stateIconDrawingFrameRect, stateIconDrawingHistoryRef, stateIconDrawingImageVisibleFrames, stateIconDrawingKeyDown, stateIconDrawingPointer, stateIconDrawingPreviewNeedsDirectElementRender, stateIconDrawingSelection, stateIconDrawingSvgRef, stateIconDrawingSvgVisibleFrames, stateIconDrawingToImage, stateVisualShapeLabel, startStateIconDrawingDrag, stopStateIconDrawingDrag, strong, terminalColor, terminalRenderLocalPoint, terminalStubSegment, terminalStubStrokeWidth, text, updateCustomDeviceTerminalAnchor, updateDefinitionTerminalAnchor, updateStateIconDrawingElement, visibleStateIconColor } = __appScope;
    const hideDefaultPage = handlers.hideDefaultPage === true;
    const displayRows = hideDefaultPage ? rows : nonDefaultStateDraftRows(rows);
    const defaultVisual = handlers.drawingScope === "definition"
      ? definitionDefaultStateVisualDraft()
      : customDeviceDefaultStateVisualDraft();
    const defaultRow = hideDefaultPage ? null : defaultStateDraftRow(rows, defaultVisual);
    const effectiveActiveRowId = hideDefaultPage && isDefaultStatePageId(activeRowId) ? displayRows[0]?.id ?? activeRowId : activeRowId;
    const isDefaultStatePage = !hideDefaultPage && isDefaultStatePageId(effectiveActiveRowId);
    const activeRow = activeStateDraftRow(displayRows, effectiveActiveRowId);
    const activeDrawingTarget = handlers.drawingScope && (activeRow || isDefaultStatePage)
      ? { scope: handlers.drawingScope, rowId: isDefaultStatePage ? DEFAULT_STATE_PAGE_ID : activeRow.id }
      : null;
    const drawingReady =
      activeDrawingTarget &&
      stateIconDrawingDialog?.target.scope === activeDrawingTarget.scope &&
      stateIconDrawingDialog.target.rowId === activeDrawingTarget.rowId;
    const renderStateIconDrawingImportIcon = (mode: "svg" | "image") => (
      <svg className="state-icon-tool-icon" viewBox="0 0 24 24" aria-hidden="true">
        {mode === "svg" ? (
          <>
            <path d="M7 3h7l4 4v14H7z" />
            <path d="M14 3v5h5" />
            <path d="M10 16l-2-2 2-2" />
            <path d="M14 12l2 2-2 2" />
          </>
        ) : (
          <>
            <rect x="4" y="5" width="16" height="14" rx="2" />
            <circle cx="9" cy="10" r="1.6" />
            <path d="M6.5 17l4.2-4.2 3 3 1.9-1.9 2.9 3.1" />
          </>
        )}
      </svg>
    );
    const renderStateIconDrawingToolIcon = (kind: StateVisualShapeKind) => {
      switch (kind) {
        case "switch-open":
          return (
            <svg className="state-icon-tool-icon" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="5" cy="16" r="1.7" />
              <circle cx="19" cy="16" r="1.7" />
              <path d="M6.8 16h4.8" />
              <path d="M12.4 14.4l5.1-4.2" />
            </svg>
          );
        case "switch-closed":
          return (
            <svg className="state-icon-tool-icon" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="5" cy="16" r="1.7" />
              <circle cx="19" cy="16" r="1.7" />
              <path d="M6.8 16h10.4" />
            </svg>
          );
        case "valve-open":
          return (
            <svg className="state-icon-tool-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 8l6 4-6 4z" />
              <path d="M19 8l-6 4 6 4z" />
              <path d="M12 7v10" />
            </svg>
          );
        case "valve-closed":
          return (
            <svg className="state-icon-tool-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 8l6 4-6 4z" />
              <path d="M19 8l-6 4 6 4z" />
              <path d="M8 6l8 12" />
            </svg>
          );
        case "line":
          return (
            <svg className="state-icon-tool-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 18L19 6" />
            </svg>
          );
        case "polyline":
          return (
            <svg className="state-icon-tool-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 17L11 7L20 17" />
            </svg>
          );
        case "point":
          return (
            <svg className="state-icon-tool-icon" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="4" />
            </svg>
          );
        case "triangle":
          return (
            <svg className="state-icon-tool-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 5l8 14H4z" />
            </svg>
          );
        case "rectangle":
          return (
            <svg className="state-icon-tool-icon" viewBox="0 0 24 24" aria-hidden="true">
              <rect x="4.5" y="7" width="15" height="10" rx="1.5" />
            </svg>
          );
        case "square":
          return (
            <svg className="state-icon-tool-icon" viewBox="0 0 24 24" aria-hidden="true">
              <rect x="6" y="6" width="12" height="12" rx="1.5" />
            </svg>
          );
        case "hexagon":
          return (
            <svg className="state-icon-tool-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M8 5h8l4 7-4 7H8l-4-7z" />
            </svg>
          );
        case "polygon":
          return (
            <svg className="state-icon-tool-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M7 5h8l4 5-2 8-8 1-4-6z" />
            </svg>
          );
        case "circle":
          return (
            <svg className="state-icon-tool-icon" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="7" />
            </svg>
          );
        case "semicircle":
          return (
            <svg className="state-icon-tool-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 15a7 7 0 0 1 14 0z" />
              <path d="M5 15h14" />
            </svg>
          );
        case "ellipse":
          return (
            <svg className="state-icon-tool-icon" viewBox="0 0 24 24" aria-hidden="true">
              <ellipse cx="12" cy="12" rx="8" ry="5" />
            </svg>
          );
        case "arc":
          return (
            <svg className="state-icon-tool-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 16a7 7 0 0 1 12 0" />
            </svg>
          );
        case "text":
          return (
            <svg className="state-icon-tool-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6h12" />
              <path d="M12 6v12" />
              <path d="M9 18h6" />
            </svg>
          );
        default:
          return null;
      }
    };
    const stateIconBasicToolKinds = [
      "switch-open",
      "switch-closed",
      "valve-open",
      "valve-closed",
      "line",
      "polyline",
      "point",
      "triangle",
      "rectangle",
      "square",
      "hexagon",
      "polygon",
      "circle",
      "semicircle",
      "ellipse",
      "arc",
      "text"
    ] as StateVisualShapeKind[];
    const staticTemplateGroups = (() => {
      const groups = new Map<string, any[]>();
      for (const template of DEVICE_LIBRARY ?? []) {
        if (template.categoryLibrary !== "静态图元" && !String(template.kind ?? "").startsWith("static-")) {
          continue;
        }
        const section = resolveTemplateComponentLibrary ? resolveTemplateComponentLibrary(template) : stateIconStaticTemplateParam(template, "component_type", "StaticBasicShape");
        if (STATE_ICON_STATIC_TEMPLATE_SECTIONS_COVERED_BY_BASIC_TOOLS.has(section)) {
          continue;
        }
        groups.set(section, [...(groups.get(section) ?? []), template]);
      }
      return Array.from(groups.entries())
        .sort(([left], [right]) => {
          const leftIndex = STATE_ICON_STATIC_TEMPLATE_SECTION_ORDER.indexOf(left);
          const rightIndex = STATE_ICON_STATIC_TEMPLATE_SECTION_ORDER.indexOf(right);
          const normalizedLeft = leftIndex >= 0 ? leftIndex : STATE_ICON_STATIC_TEMPLATE_SECTION_ORDER.length;
          const normalizedRight = rightIndex >= 0 ? rightIndex : STATE_ICON_STATIC_TEMPLATE_SECTION_ORDER.length;
          return normalizedLeft - normalizedRight || left.localeCompare(right);
        })
        .map(([section, templates]) => ({
          section,
          label: COMPONENT_LIBRARY_LABELS?.[section] ?? section,
          templates
        }));
    })();
    const renderStaticTemplateToolIcon = (template: any) => {
      if (!createNodeFromTemplate || !MemoDeviceGlyph || !nodeGeometryTransform) {
        return renderStateIconDrawingToolIcon("rectangle");
      }
      const preview = createNodeFromTemplate(template, { x: 0, y: 0 });
      const width = Math.max(72, Number(preview?.size?.width) || 72);
      const height = Math.max(48, Number(preview?.size?.height) || 48);
      const padding = 18;
      return (
        <svg
          className="state-icon-static-template-icon"
          viewBox={`${formatSvgNumber(-width / 2 - padding)} ${formatSvgNumber(-height / 2 - padding)} ${formatSvgNumber(width + padding * 2)} ${formatSvgNumber(height + padding * 2)}`}
          aria-hidden="true"
        >
          <g transform={nodeGeometryTransform(preview)}>
            <MemoDeviceGlyph node={preview} colorPalette={colorPalette} stateVisual={null} />
          </g>
        </svg>
      );
    };
    const addStateIconStaticTemplate = (template: any) => {
      if (!drawingReady) {
        return;
      }
      setStateIconDrawingContextMenu(null);
      setStateIconDrawingDialog((current) => current ? {
        ...current,
        elementLibraryTab: "static",
        pendingElementKind: undefined,
        pendingStaticTemplate: template,
        drawingDraft: undefined,
        selectedElementId: "",
        selectedElementIds: []
      } : current);
    };
    const setStateIconElementLibraryTab = (tab: "basic" | "static") => {
      if (!drawingReady) {
        return;
      }
      setStateIconDrawingContextMenu(null);
      setStateIconDrawingDialog((current) => current ? {
        ...current,
        elementLibraryTab: tab,
        pendingElementKind: tab === "basic" ? current.pendingElementKind : undefined,
        pendingStaticTemplate: tab === "static" ? current.pendingStaticTemplate : undefined,
        drawingDraft: undefined
      } : current);
    };
    const renderStateIconDrawingLibrary = () => {
      if (!activeDrawingTarget) {
        return null;
      }
      const activeElementLibraryTab = stateIconDrawingDialog?.elementLibraryTab ?? (stateIconDrawingDialog?.pendingStaticTemplate ? "static" : "basic");
      return (
        <div className="state-icon-drawing-library" aria-label="添加图案">
          <span>添加图案</span>
          <div className="state-icon-drawing-import-actions">
            <button
              type="button"
              disabled={!drawingReady}
              onClick={() => {
                if (!drawingReady) {
                  return;
                }
                setImagePickerSourceFilter("builtin");
                setImagePickerCategoryFilter("");
                setImagePickerSearchQuery("");
                setImageTarget({ kind: "stateIconDrawing", sourceMode: "builtinOnly" });
              }}
              className="state-icon-import-button state-icon-import-text-button"
              aria-label="内置图标"
              title="内置图标"
            >
              内置图标
            </button>
            <button
              type="button"
              disabled={!drawingReady}
              onClick={() => {
                if (!drawingReady) {
                  return;
                }
                setImagePickerSourceFilter("");
                setImagePickerCategoryFilter("");
                setImagePickerSearchQuery("");
                setImageTarget({ kind: "stateIconDrawing", sourceMode: "catalogOnly" });
              }}
              className="state-icon-import-button state-icon-import-text-button"
              aria-label="分类图标"
              title="分类图标"
            >
              分类图标
            </button>
            <button
              type="button"
              disabled={!drawingReady}
              onClick={() => {
                if (!drawingReady) {
                  return;
                }
                setImagePickerSourceFilter("external");
                setImagePickerCategoryFilter("");
                setImagePickerSearchQuery("");
                setImageTarget({ kind: "stateIconDrawing", sourceMode: "externalOnly" });
              }}
              className="state-icon-import-button state-icon-import-text-button"
              aria-label="外部图标"
              title="外部图标"
            >
              外部图标
            </button>
          </div>
          <div className="state-icon-library-tabs" role="tablist" aria-label="图案来源切换">
            <button
              type="button"
              className={`state-icon-library-tab ${activeElementLibraryTab === "basic" ? "active" : ""}`}
              disabled={!drawingReady}
              role="tab"
              aria-selected={activeElementLibraryTab === "basic"}
              onClick={() => setStateIconElementLibraryTab("basic")}
            >
              基础元素
            </button>
            <button
              type="button"
              className={`state-icon-library-tab ${activeElementLibraryTab === "static" ? "active" : ""}`}
              disabled={!drawingReady}
              role="tab"
              aria-selected={activeElementLibraryTab === "static"}
              onClick={() => setStateIconElementLibraryTab("static")}
            >
              静态图元库
            </button>
          </div>
          <div className="state-icon-library-panel">
            {activeElementLibraryTab === "basic" ? (
              <div className="state-icon-basic-tool-actions" role="tabpanel" aria-label="基础元素">
                {stateIconBasicToolKinds.map((kind) => (
                  <button
                    key={kind}
                    type="button"
                    className={`state-icon-tool-button ${stateIconDrawingDialog?.pendingElementKind === kind ? "active" : ""}`}
                    disabled={!drawingReady}
                    aria-label={stateVisualShapeLabel(kind)}
                    title={stateVisualShapeLabel(kind)}
                    onClick={() => addStateIconDrawingElement(kind)}
                  >
                    {renderStateIconDrawingToolIcon(kind)}
                  </button>
                ))}
              </div>
            ) : (
              <div className="state-icon-static-template-library" role="tabpanel" aria-label="静态图元库">
                <div className="state-icon-static-template-groups">
                  {staticTemplateGroups.map((group) => (
                    <div key={group.section} className="state-icon-static-template-group">
                      <span>{group.label}</span>
                      <div>
                        {group.templates.map((template) => (
                          <button
                            key={template.kind}
                            type="button"
                            className={`state-icon-static-template-button ${stateIconDrawingDialog?.pendingStaticTemplate?.kind === template.kind ? "active" : ""}`}
                            disabled={!drawingReady}
                            aria-label={template.label}
                            title={`${template.label} / ${group.label}`}
                            onClick={() => addStateIconStaticTemplate(template)}
                          >
                            {renderStaticTemplateToolIcon(template)}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      );
    };
    const selectedStateRow = isDefaultStatePage ? defaultRow : activeRow;
    const selectedStateRowId = isDefaultStatePage ? DEFAULT_STATE_PAGE_ID : activeRow?.id ?? "";
    const stateIconDrawingTerminalDraft = handlers.drawingScope === "definition" ? definitionVisualDraft : customDeviceDraft;
    const stateIconDrawingTerminalTypes = handlers.drawingScope === "definition" ? definitionVisualTerminalTypes : customDraftTerminalTypes;
    const stateIconDrawingTerminalLabels = Array.isArray(stateIconDrawingTerminalDraft?.terminalLabels)
      ? stateIconDrawingTerminalDraft.terminalLabels
      : [];
    const stateIconDrawingTerminalCount = Math.max(
      0,
      Number(stateIconDrawingTerminalDraft?.terminalCount) || (Array.isArray(stateIconDrawingTerminalTypes) ? stateIconDrawingTerminalTypes.length : 0) || 0
    );
    const stateIconDrawingTerminalOptions = Array.from({ length: stateIconDrawingTerminalCount }, (_, index) => {
      const type = (Array.isArray(stateIconDrawingTerminalTypes) ? stateIconDrawingTerminalTypes[index] : "") || stateIconDrawingTerminalDraft?.terminalType || "ac";
      const typeLabel = TERMINAL_TYPE_LIBRARY_LABELS?.[type] ?? type;
      const customLabel = String(stateIconDrawingTerminalLabels[index] ?? "").trim();
      return {
        index,
        type,
        label: customLabel || `${typeLabel}端${index + 1}`,
        color: terminalColor ? terminalColor(type, colorPalette) : "#2563eb"
      };
    });
    const stateIconTerminalFrame = {
      x: STATE_ICON_DRAWING_FRAME_WIDTH / 8,
      y: STATE_ICON_DRAWING_FRAME_HEIGHT / 8,
      width: STATE_ICON_DRAWING_FRAME_WIDTH * 3 / 4,
      height: STATE_ICON_DRAWING_FRAME_HEIGHT * 3 / 4,
      centerX: STATE_ICON_DRAWING_FRAME_WIDTH / 2,
      centerY: STATE_ICON_DRAWING_FRAME_HEIGHT / 2,
      marginX: STATE_ICON_DRAWING_FRAME_WIDTH / 8,
      marginY: STATE_ICON_DRAWING_FRAME_HEIGHT / 8
    };
    const stateIconHasTerminals = Boolean(handlers.drawingScope && stateIconDrawingTerminalCount > 0);
    const stateIconTerminalAnchors = handlers.drawingScope === "definition" ? definitionVisualTerminalAnchors : customDeviceTerminalAnchors;
    const stateIconTerminalDragIndex = handlers.drawingScope === "definition" ? definitionTerminalAnchorDragIndex : customDeviceTerminalAnchorDragIndex;
    const setStateIconTerminalDragIndex = handlers.drawingScope === "definition" ? setDefinitionTerminalAnchorDragIndex : setCustomDeviceTerminalAnchorDragIndex;
    const updateStateIconTerminalAnchor = handlers.drawingScope === "definition" ? updateDefinitionTerminalAnchor : updateCustomDeviceTerminalAnchor;
    const stateIconGeometryTemplate = handlers.terminalGeometryTemplate
      ?? handlers.definitionTemplate
      ?? (handlers.drawingScope === "definition" ? selectedDefinitionTemplate : null);
    const stateIconUsesCanvasTerminalGeometry = Boolean(
      handlers.drawingScope &&
      stateIconGeometryTemplate &&
      !stateIconGeometryTemplate.custom &&
      stateIconDrawingTerminalDraft &&
      createNodeFromTemplate &&
      terminalRenderLocalPoint &&
      terminalStubSegment
    );
    const stateIconCanvasTerminalNode = stateIconUsesCanvasTerminalGeometry
      ? createNodeFromTemplate({
          ...stateIconGeometryTemplate,
          size: stateIconDrawingTerminalDraft.size,
          terminalCount: stateIconDrawingTerminalCount,
          terminalTypes: stateIconDrawingTerminalTypes,
          terminalLabels: stateIconDrawingTerminalLabels,
          terminalAnchors: stateIconTerminalAnchors
        }, { x: 0, y: 0 })
      : null;
    const stateIconCanvasTerminalContent = (() => {
      if (!stateIconCanvasTerminalNode) {
        return null;
      }
      const size = stateIconCanvasTerminalNode.size ?? { width: 104, height: 64 };
      const radians = ((Number(stateIconCanvasTerminalNode.rotation) || 0) * Math.PI) / 180;
      const cos = Math.cos(radians);
      const sin = Math.sin(radians);
      const rawWidth = Math.max(1, Number(size.width) * Math.abs(getNodeScaleX ? getNodeScaleX(stateIconCanvasTerminalNode) : 1));
      const rawHeight = Math.max(1, Number(size.height) * Math.abs(getNodeScaleY ? getNodeScaleY(stateIconCanvasTerminalNode) : 1));
      const rotatedWidth = Math.abs(rawWidth * cos) + Math.abs(rawHeight * sin);
      const rotatedHeight = Math.abs(rawWidth * sin) + Math.abs(rawHeight * cos);
      const viewBoxWidth = Math.max(1, rotatedWidth + 24);
      const viewBoxHeight = Math.max(1, rotatedHeight + 24);
      const scale = Math.min(stateIconTerminalFrame.width / viewBoxWidth, stateIconTerminalFrame.height / viewBoxHeight);
      return {
        node: stateIconCanvasTerminalNode,
        scale: Number.isFinite(scale) && scale > 0 ? scale : 1,
        centerX: stateIconTerminalFrame.centerX,
        centerY: stateIconTerminalFrame.centerY
      };
    })();
    const stateIconTerminalAnchorType = (index: number) =>
      (Array.isArray(stateIconDrawingTerminalTypes) ? stateIconDrawingTerminalTypes[index] : "") || stateIconDrawingTerminalDraft?.terminalType || "ac";
    const stateIconDisplayedBoundaryAnchor = (anchor: Point) => {
      const sourceAnchor = projectCustomDeviceTerminalAnchorToBoundary(anchor);
      const node = stateIconCanvasTerminalContent?.node;
      if (!node) {
        return sourceAnchor;
      }
      const scaleSignX = Math.sign(getNodeScaleX ? getNodeScaleX(node) : 1) || 1;
      const scaleSignY = Math.sign(getNodeScaleY ? getNodeScaleY(node) : 1) || 1;
      const radians = ((Number(node.rotation) || 0) * Math.PI) / 180;
      const cos = Math.cos(radians);
      const sin = Math.sin(radians);
      return projectCustomDeviceTerminalAnchorToBoundary({
        x: sourceAnchor.x * scaleSignX * cos - sourceAnchor.y * scaleSignY * sin,
        y: sourceAnchor.x * scaleSignX * sin + sourceAnchor.y * scaleSignY * cos
      });
    };
    const stateIconSourceBoundaryAnchorFromDisplayed = (anchor: Point) => {
      const displayedAnchor = projectCustomDeviceTerminalAnchorToBoundary(anchor);
      const node = stateIconCanvasTerminalContent?.node;
      if (!node) {
        return displayedAnchor;
      }
      const scaleSignX = Math.sign(getNodeScaleX ? getNodeScaleX(node) : 1) || 1;
      const scaleSignY = Math.sign(getNodeScaleY ? getNodeScaleY(node) : 1) || 1;
      const radians = ((Number(node.rotation) || 0) * Math.PI) / 180;
      const cos = Math.cos(radians);
      const sin = Math.sin(radians);
      return projectCustomDeviceTerminalAnchorToBoundary({
        x: (displayedAnchor.x * cos + displayedAnchor.y * sin) * scaleSignX,
        y: (-displayedAnchor.x * sin + displayedAnchor.y * cos) * scaleSignY
      });
    };
    const stateIconCanvasTerminalVisualElement = (() => {
      const elements = [
        ...(Array.isArray(stateIconDrawingDialog?.elements) ? stateIconDrawingDialog.elements : []),
        stateIconDrawingDialog?.drawingDraft?.element
      ].filter(Boolean);
      const dragOverrides = stateIconDrawingDragDeltaRef?.current?.overrides;
      const withOverrides = elements.map((element: any) => {
        const override = dragOverrides?.[element.id];
        return override ? { ...element, ...override } : element;
      });
      const selectedIds = new Set(
        stateIconDrawingDialog?.selectedElementIds?.length > 0
          ? stateIconDrawingDialog.selectedElementIds
          : [stateIconDrawingDialog?.selectedElementId].filter(Boolean)
      );
      const isGeneratedTemplateElement = (element: any) => {
        const kind = String(element?.kind ?? "");
        if (kind !== "imported-svg" && kind !== "image") {
          return false;
        }
        const source = String(element?.svgSource || element?.imageHref || "");
        return source.includes("data-state-icon-preserve-view-box");
      };
      return withOverrides.find((element: any) => selectedIds.has(element.id) && isGeneratedTemplateElement(element))
        ?? withOverrides.find(isGeneratedTemplateElement)
        ?? null;
    })();
    const stateIconMapCanvasTerminalPoint = (renderPoint: Point, controlPoint: Point): Point | null => {
      const content = stateIconCanvasTerminalContent;
      const node = content?.node;
      if (!content || !node) {
        return null;
      }
      const scaleX = getNodeScaleX ? getNodeScaleX(node) : 1;
      const scaleY = getNodeScaleY ? getNodeScaleY(node) : 1;
      const radians = ((Number(node.rotation) || 0) * Math.PI) / 180;
      const cos = Math.cos(radians);
      const sin = Math.sin(radians);
      const local = {
        x: renderPoint.x * scaleX + controlPoint.x,
        y: renderPoint.y * scaleY + controlPoint.y
      };
      const visualElement = stateIconCanvasTerminalVisualElement;
      if (visualElement) {
        const elementWidth = Math.max(1, Number(visualElement.width) || 1);
        const elementHeight = Math.max(1, Number(visualElement.height) || 1);
        const nodeWidth = Math.max(1, Number(node.size?.width) || 1);
        const nodeHeight = Math.max(1, Number(node.size?.height) || 1);
        const elementScale = Math.min(elementWidth / nodeWidth, elementHeight / nodeHeight);
        const elementRadians = ((Number(visualElement.rotation) || 0) * Math.PI) / 180;
        const elementCos = Math.cos(elementRadians);
        const elementSin = Math.sin(elementRadians);
        const elementLocal = {
          x: (local.x * cos - local.y * sin) * elementScale,
          y: (local.x * sin + local.y * cos) * elementScale
        };
        return {
          x: Number(visualElement.x || 0) + elementLocal.x * elementCos - elementLocal.y * elementSin,
          y: Number(visualElement.y || 0) + elementLocal.x * elementSin + elementLocal.y * elementCos
        };
      }
      return {
        x: content.centerX + (local.x * cos - local.y * sin) * content.scale,
        y: content.centerY + (local.x * sin + local.y * cos) * content.scale
      };
    };
    const stateIconCanvasTerminalConnectorSegment = (index?: number) => {
      if (
        typeof index !== "number" ||
        !stateIconCanvasTerminalContent ||
        !terminalRenderLocalPoint ||
        !terminalStubSegment
      ) {
        return null;
      }
      const node = stateIconCanvasTerminalContent.node;
      const terminal = Array.isArray(node.terminals) ? node.terminals[index] : null;
      if (!terminal) {
        return null;
      }
      const scaleX = getNodeScaleX ? getNodeScaleX(node) : 1;
      const scaleY = getNodeScaleY ? getNodeScaleY(node) : 1;
      const renderPoint = terminalRenderLocalPoint(terminal, node.size, scaleX, scaleY, node.kind);
      const stub = terminalStubSegment(terminal, scaleX, scaleY, 24, node.kind, node.size);
      const from = stateIconMapCanvasTerminalPoint(renderPoint, stub.from);
      return from ? { from } : null;
    };
    const stateIconFrameTerminalConnectorSegment = (anchor: Point) => {
      const boundaryAnchor = stateIconDisplayedBoundaryAnchor(anchor);
      const framePoint = {
        x: stateIconTerminalFrame.centerX + boundaryAnchor.x * stateIconTerminalFrame.width,
        y: stateIconTerminalFrame.centerY + boundaryAnchor.y * stateIconTerminalFrame.height
      };
      const bodyReachX = stateIconTerminalFrame.marginX * 2.6;
      const bodyReachY = stateIconTerminalFrame.marginY * 2.6;
      const horizontal = Math.abs(boundaryAnchor.x) >= Math.abs(boundaryAnchor.y);
      return {
        from: horizontal
          ? { x: framePoint.x - Math.sign(boundaryAnchor.x || 1) * bodyReachX, y: framePoint.y }
          : { x: framePoint.x, y: framePoint.y - Math.sign(boundaryAnchor.y || 1) * bodyReachY },
        to: horizontal
          ? { x: framePoint.x + (boundaryAnchor.x < 0 ? -stateIconTerminalFrame.marginX : stateIconTerminalFrame.marginX), y: framePoint.y }
          : { x: framePoint.x, y: framePoint.y + (boundaryAnchor.y < 0 ? -stateIconTerminalFrame.marginY : stateIconTerminalFrame.marginY) }
      };
    };
    const stateIconTerminalConnectorSegment = (anchor: Point, index?: number) => {
      const frameSegment = stateIconFrameTerminalConnectorSegment(anchor);
      const canvasSegment = stateIconCanvasTerminalConnectorSegment(index);
      if (canvasSegment) {
        const displayedAnchor = stateIconDisplayedBoundaryAnchor(anchor);
        const horizontal = Math.abs(displayedAnchor.x) >= Math.abs(displayedAnchor.y);
        return {
          from: horizontal
            ? { x: canvasSegment.from.x, y: frameSegment.to.y }
            : { x: frameSegment.to.x, y: canvasSegment.from.y },
          to: frameSegment.to
        };
      }
      return frameSegment;
    };
    const renderStateIconTerminalDynamicGuideLayer = (anchors: Point[]) => {
      const activeIndex = typeof stateIconTerminalDragIndex === "number" ? stateIconTerminalDragIndex : -1;
      const activeAnchor = anchors[activeIndex];
      if (!activeAnchor) {
        return null;
      }
      const activeSegment = stateIconTerminalConnectorSegment(activeAnchor, activeIndex);
      const activeDisplayedAnchor = stateIconDisplayedBoundaryAnchor(activeAnchor);
      const lines: Array<{
        id: string;
        orientation: "vertical" | "horizontal";
        position: number;
        start: number;
        end: number;
        variant: "active" | "match" | "snap";
      }> = [];
      const seen = new Set<string>();
      const addLine = (
        orientation: "vertical" | "horizontal",
        position: number,
        variant: "active" | "match" | "snap",
        start: number,
        end: number
      ) => {
        if (!Number.isFinite(position)) {
          return;
        }
        const roundedPosition = Number(formatSvgNumber(position));
        const key = `${orientation}:${roundedPosition}`;
        if (seen.has(key)) {
          return;
        }
        seen.add(key);
        lines.push({
          id: `${orientation}-${variant}-${roundedPosition}`,
          orientation,
          position: roundedPosition,
          start,
          end,
          variant
        });
      };
      addLine("vertical", activeSegment.to.x, "active", 0, STATE_ICON_DRAWING_FRAME_HEIGHT);
      addLine("horizontal", activeSegment.to.y, "active", 0, STATE_ICON_DRAWING_FRAME_WIDTH);
      const anchorMatchTolerance = 2;
      anchors.forEach((anchor, index) => {
        if (index === activeIndex) {
          return;
        }
        const segment = stateIconTerminalConnectorSegment(anchor, index);
        if (Math.abs(segment.to.x - activeSegment.to.x) <= anchorMatchTolerance) {
          addLine("vertical", segment.to.x, "match", 0, STATE_ICON_DRAWING_FRAME_HEIGHT);
        }
        if (Math.abs(segment.to.y - activeSegment.to.y) <= anchorMatchTolerance) {
          addLine("horizontal", segment.to.y, "match", 0, STATE_ICON_DRAWING_FRAME_WIDTH);
        }
      });
      const guideValues = Array.isArray(CUSTOM_DEVICE_TERMINAL_ANCHOR_GUIDE_VALUES)
        ? CUSTOM_DEVICE_TERMINAL_ANCHOR_GUIDE_VALUES
        : [];
      const guideTolerance = 1 / Math.max(1, Number(CUSTOM_DEVICE_TERMINAL_ANCHOR_PRECISION) || 1);
      const activeGuideX = customDeviceTerminalAnchorValue(activeDisplayedAnchor.x);
      const activeGuideY = customDeviceTerminalAnchorValue(activeDisplayedAnchor.y);
      guideValues.forEach((guideValue) => {
        if (Math.abs(activeGuideX - guideValue) <= guideTolerance) {
          addLine("vertical", stateIconTerminalFrame.centerX + guideValue * stateIconTerminalFrame.width, "snap", 0, STATE_ICON_DRAWING_FRAME_HEIGHT);
        }
        if (Math.abs(activeGuideY - guideValue) <= guideTolerance) {
          addLine("horizontal", stateIconTerminalFrame.centerY + guideValue * stateIconTerminalFrame.height, "snap", 0, STATE_ICON_DRAWING_FRAME_WIDTH);
        }
      });
      return (
        <g className="state-icon-terminal-dynamic-guide-layer" aria-hidden="true">
          {lines.map((guide) => (
            <line
              key={`state-icon-terminal-dynamic-guide-${guide.id}`}
              className={[
                "custom-device-terminal-guide",
                "state-icon-terminal-anchor-guide",
                `state-icon-terminal-anchor-guide-${guide.orientation}`,
                `state-icon-terminal-anchor-guide-${guide.variant}`,
                guide.variant === "active" ? "active" : ""
              ].filter(Boolean).join(" ")}
              x1={guide.orientation === "vertical" ? guide.position : guide.start}
              y1={guide.orientation === "vertical" ? guide.start : guide.position}
              x2={guide.orientation === "vertical" ? guide.position : guide.end}
              y2={guide.orientation === "vertical" ? guide.end : guide.position}
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </g>
      );
    };
    const updateStateIconTerminalAnchorFromDrawing = (index: number, event: PointerEvent<SVGSVGElement>) => {
      if (!updateStateIconTerminalAnchor || !projectCustomDeviceTerminalAnchorToBoundary) {
        return;
      }
      const point = stateIconDrawingPointer(event);
      const snappedPoint = stateIconDrawingTerminalPointSnap(__appScope, clampStateIconDrawingPoint(point), {
        excludeTerminalIndex: index
      });
      const nextAnchor = projectCustomDeviceTerminalAnchorToBoundary({
        x: (snappedPoint.point.x - stateIconTerminalFrame.centerX) / stateIconTerminalFrame.width,
        y: (snappedPoint.point.y - stateIconTerminalFrame.centerY) / stateIconTerminalFrame.height
      });
      updateStateIconTerminalAnchor(index, stateIconSourceBoundaryAnchorFromDisplayed(nextAnchor));
      setStateIconDrawingDialog((current) => current ? { ...current, smartAlignmentGuides: snappedPoint.guides } : current);
    };
    const finishStateIconTerminalDrag = (event: PointerEvent<SVGSVGElement>) => {
      if (stateIconTerminalDragIndex === null || stateIconTerminalDragIndex === undefined) {
        return false;
      }
      if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      setStateIconTerminalDragIndex?.(null);
      setStateIconDrawingDialog((current) => current ? { ...current, smartAlignmentGuides: [] } : current);
      return true;
    };
    const renderStateIconOuterFrameLayer = () => (
      <g className="state-icon-outer-frame-layer">
        <rect
          x="0.75"
          y="0.75"
          width="238.5"
          height="158.5"
          rx="6"
          className="state-icon-drawing-icon-frame state-icon-drawing-outer-frame"
          fill="none"
          stroke="#2563eb"
          strokeWidth={1.5}
          strokeDasharray="6 4"
          vectorEffect="non-scaling-stroke"
        />
      </g>
    );
    const renderStateIconTerminalBaseLayer = () => {
      if (!stateIconHasTerminals) {
        return null;
      }
      const anchors = Array.isArray(stateIconTerminalAnchors) ? stateIconTerminalAnchors.slice(0, stateIconDrawingTerminalCount) : [];
      if (anchors.length === 0) {
        return null;
      }
      if (stateIconCanvasTerminalContent) {
        return (
          <g className="state-icon-terminal-base-layer state-icon-terminal-canvas-geometry-layer">
            <rect
              x={stateIconTerminalFrame.x}
              y={stateIconTerminalFrame.y}
              width={stateIconTerminalFrame.width}
              height={stateIconTerminalFrame.height}
              rx="6"
              className="state-icon-drawing-icon-frame state-icon-drawing-inner-frame"
              fill="none"
              stroke="#f97316"
              strokeWidth={1.5}
              strokeDasharray="5 3"
              vectorEffect="non-scaling-stroke"
            />
            {renderStateIconTerminalDynamicGuideLayer(anchors)}
            <g className="state-icon-terminal-connector-layer">
              {anchors.map((anchor, index) => {
                const segment = stateIconTerminalConnectorSegment(anchor, index);
                const terminalType = stateIconTerminalAnchorType(index);
                return (
                  <line
                    key={`state-icon-terminal-canvas-connector-${index}`}
                    className="custom-device-terminal-connector state-icon-terminal-connector"
                    x1={segment.from.x}
                    y1={segment.from.y}
                    x2={segment.to.x}
                    y2={segment.to.y}
                    stroke={terminalColor(terminalType, colorPalette)}
                    strokeWidth={2}
                    strokeLinecap="round"
                    vectorEffect="non-scaling-stroke"
                    style={{ "--terminal-color": terminalColor(terminalType, colorPalette) } as CSSProperties}
                  />
                );
              })}
            </g>
            <g className="state-icon-terminal-anchor-layer">
              {anchors.map((anchor, index) => {
                const segment = stateIconTerminalConnectorSegment(anchor, index);
                const terminalType = stateIconTerminalAnchorType(index);
                const dragging = stateIconTerminalDragIndex === index;
                return (
                  <g
                    key={`state-icon-terminal-canvas-anchor-${index}`}
                    className={`custom-device-terminal-anchor state-icon-terminal-anchor ${dragging ? "dragging" : ""}`}
                    transform={`translate(${formatSvgNumber(segment.to.x)} ${formatSvgNumber(segment.to.y)})`}
                    style={{ "--terminal-color": terminalColor(terminalType, colorPalette) } as CSSProperties}
                  >
                    <circle
                      r="7"
                      onPointerDown={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        const svg = event.currentTarget.ownerSVGElement;
                        if (!svg) {
                          return;
                        }
                        setStateIconTerminalDragIndex?.(index);
                        svg.setPointerCapture?.(event.pointerId);
                        updateStateIconTerminalAnchorFromDrawing(index, event as unknown as PointerEvent<SVGSVGElement>);
                      }}
                    >
                      <title>{`拖动调整端子${index + 1}位置`}</title>
                    </circle>
                    <text x="0" y="0">{index + 1}</text>
                  </g>
                );
              })}
            </g>
          </g>
        );
      }
      return (
        <g className="state-icon-terminal-base-layer">
          <rect
            x={stateIconTerminalFrame.x}
            y={stateIconTerminalFrame.y}
            width={stateIconTerminalFrame.width}
            height={stateIconTerminalFrame.height}
            rx="6"
            className="state-icon-drawing-icon-frame state-icon-drawing-inner-frame"
            fill="none"
            stroke="#f97316"
            strokeWidth={1.5}
            strokeDasharray="5 3"
            vectorEffect="non-scaling-stroke"
          />
          {renderStateIconTerminalDynamicGuideLayer(anchors)}
          <g className="state-icon-terminal-connector-layer">
            {anchors.map((anchor, index) => {
              const terminalType = stateIconTerminalAnchorType(index);
              const segment = stateIconTerminalConnectorSegment(anchor);
              return (
                <line
                  key={`state-icon-terminal-anchor-connector-${index}`}
                  className="custom-device-terminal-connector state-icon-terminal-connector"
                  x1={segment.from.x}
                  y1={segment.from.y}
                  x2={segment.to.x}
                  y2={segment.to.y}
                  stroke={terminalColor(terminalType, colorPalette)}
                  strokeWidth={2}
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                  style={{ "--terminal-color": terminalColor(terminalType, colorPalette) } as CSSProperties}
                />
              );
            })}
          </g>
          <g className="state-icon-terminal-anchor-layer">
            {anchors.map((anchor, index) => {
              const terminalType = stateIconTerminalAnchorType(index);
              const segment = stateIconTerminalConnectorSegment(anchor);
              const dragging = stateIconTerminalDragIndex === index;
              return (
                <g
                  key={`state-icon-terminal-anchor-${index}`}
                  className={`custom-device-terminal-anchor state-icon-terminal-anchor ${dragging ? "dragging" : ""}`}
                  transform={`translate(${formatSvgNumber(segment.to.x)} ${formatSvgNumber(segment.to.y)})`}
                  style={{ "--terminal-color": terminalColor(terminalType, colorPalette) } as CSSProperties}
                >
                  <circle
                    r="7"
                    onPointerDown={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      const svg = event.currentTarget.ownerSVGElement;
                      if (!svg) {
                        return;
                      }
                      setStateIconTerminalDragIndex?.(index);
                      svg.setPointerCapture?.(event.pointerId);
                      updateStateIconTerminalAnchorFromDrawing(index, event as unknown as PointerEvent<SVGSVGElement>);
                    }}
                  >
                    <title>{`拖动调整端子${index + 1}位置`}</title>
                  </circle>
                  <text x="0" y="0">{index + 1}</text>
                </g>
              );
            })}
          </g>
        </g>
      );
    };
    const stateIconImageVisibleFrameKey = (element: any) =>
      `${element.id}:${element.imageHref ?? ""}:${element.imageFit ?? "cover"}:${element.imageScale ?? 1}:${element.cropX ?? 0}:${element.cropY ?? 0}`;
    const updateStateIconImageVisibleFrame = (element: any, event: any) => {
      if (element?.kind !== "image" || !setStateIconDrawingImageVisibleFrames) {
        return;
      }
      const imageHref = String(element.imageHref ?? "");
      if (!imageHref) {
        return;
      }
      const key = stateIconImageVisibleFrameKey(element);
      const sourceImage = new Image();
      sourceImage.crossOrigin = "anonymous";
      sourceImage.onload = () => {
        const sourceWidth = sourceImage.naturalWidth || sourceImage.width;
        const sourceHeight = sourceImage.naturalHeight || sourceImage.height;
        if (!sourceWidth || !sourceHeight) {
          return;
        }
        const canvas = document.createElement("canvas");
        canvas.width = sourceWidth;
        canvas.height = sourceHeight;
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context) {
          return;
        }
        context.drawImage(sourceImage, 0, 0, sourceWidth, sourceHeight);
        const pixels = context.getImageData(0, 0, sourceWidth, sourceHeight).data;
        let left = sourceWidth;
        let right = -1;
        let top = sourceHeight;
        let bottom = -1;
        for (let y = 0; y < sourceHeight; y += 1) {
          for (let x = 0; x < sourceWidth; x += 1) {
            const alpha = pixels[(y * sourceWidth + x) * 4 + 3];
            if (alpha <= 8) {
              continue;
            }
            left = Math.min(left, x);
            right = Math.max(right, x);
            top = Math.min(top, y);
            bottom = Math.max(bottom, y);
          }
        }
        if (right < left || bottom < top) {
          return;
        }
        const elementWidth = Math.max(1, Number(element.width) || 1);
        const elementHeight = Math.max(1, Number(element.height) || 1);
        const renderWidth = elementWidth * Math.max(0.05, Number(element.imageScale) || 1);
        const renderHeight = elementHeight * Math.max(0.05, Number(element.imageScale) || 1);
        const imageScale = Math.max(renderWidth / sourceWidth, renderHeight / sourceHeight);
        const drawnWidth = sourceWidth * imageScale;
        const drawnHeight = sourceHeight * imageScale;
        const imageX = -elementWidth / 2 + (Number(element.cropX) || 0) + (renderWidth - drawnWidth) / 2;
        const imageY = -elementHeight / 2 + (Number(element.cropY) || 0) + (renderHeight - drawnHeight) / 2;
        const frame = {
          x: Math.max(-elementWidth / 2, imageX + left * imageScale),
          y: Math.max(-elementHeight / 2, imageY + top * imageScale),
          width: Math.min(elementWidth / 2, imageX + (right + 1) * imageScale) - Math.max(-elementWidth / 2, imageX + left * imageScale),
          height: Math.min(elementHeight / 2, imageY + (bottom + 1) * imageScale) - Math.max(-elementHeight / 2, imageY + top * imageScale),
          basisWidth: elementWidth,
          basisHeight: elementHeight
        };
        if (frame.width <= 0 || frame.height <= 0) {
          return;
        }
        setStateIconDrawingImageVisibleFrames((current: Record<string, any>) => {
          const previous = current[key];
          if (
            previous &&
            Math.abs(previous.x - frame.x) < 0.1 &&
            Math.abs(previous.y - frame.y) < 0.1 &&
            Math.abs(previous.width - frame.width) < 0.1 &&
            Math.abs(previous.height - frame.height) < 0.1 &&
            Math.abs((previous.basisWidth ?? elementWidth) - frame.basisWidth) < 0.1 &&
            Math.abs((previous.basisHeight ?? elementHeight) - frame.basisHeight) < 0.1
          ) {
            return current;
          }
          return { ...current, [key]: frame };
        });
      };
      sourceImage.src = event?.currentTarget?.href?.baseVal || imageHref;
    };
    const stateIconDrawingImageSelectionFrame = (element: any) => {
      if (element?.kind !== "image") {
        return null;
      }
      const frame = stateIconDrawingImageVisibleFrames?.[stateIconImageVisibleFrameKey(element)];
      if (!frame || frame.width <= 0 || frame.height <= 0) {
        return null;
      }
      const basisWidth = Math.max(1, Number(frame.basisWidth) || Number(element.width) || 1);
      const basisHeight = Math.max(1, Number(frame.basisHeight) || Number(element.height) || 1);
      const scaleX = Math.max(1, Number(element.width) || 1) / basisWidth;
      const scaleY = Math.max(1, Number(element.height) || 1) / basisHeight;
      const scaledFrame = {
        x: frame.x * scaleX,
        y: frame.y * scaleY,
        width: frame.width * scaleX,
        height: frame.height * scaleY
      };
      return {
        ...scaledFrame,
        halfWidth: scaledFrame.x + scaledFrame.width,
        halfHeight: scaledFrame.y + scaledFrame.height
      };
    };
    const stateIconSvgVisibleFrameKey = (element: any) =>
      `${element.id}:${element.svgSource ?? ""}:${element.strokeWidth}:${element.strokeColor ?? ""}:${element.strokeStyle ?? ""}`;
    const updateStateIconSvgVisibleFrame = (element: any, event: any) => {
      if (element?.kind !== "imported-svg" || !setStateIconDrawingSvgVisibleFrames) {
        return;
      }
      const measurement = stateIconDrawingElementPreviewImage(element);
      if (!measurement?.href) {
        return;
      }
      const key = stateIconSvgVisibleFrameKey(element);
      const sourceImage = new Image();
      sourceImage.onload = () => {
        const sourceWidth = sourceImage.naturalWidth || sourceImage.width;
        const sourceHeight = sourceImage.naturalHeight || sourceImage.height;
        if (!sourceWidth || !sourceHeight) {
          return;
        }
        const canvas = document.createElement("canvas");
        canvas.width = sourceWidth;
        canvas.height = sourceHeight;
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context) {
          return;
        }
        context.drawImage(sourceImage, 0, 0, sourceWidth, sourceHeight);
        const pixels = context.getImageData(0, 0, sourceWidth, sourceHeight).data;
        let left = sourceWidth;
        let right = -1;
        let top = sourceHeight;
        let bottom = -1;
        for (let y = 0; y < sourceHeight; y += 1) {
          for (let x = 0; x < sourceWidth; x += 1) {
            const alpha = pixels[(y * sourceWidth + x) * 4 + 3];
            if (alpha <= 8) {
              continue;
            }
            left = Math.min(left, x);
            right = Math.max(right, x);
            top = Math.min(top, y);
            bottom = Math.max(bottom, y);
          }
        }
        if (right < left || bottom < top) {
          return;
        }
        const elementWidth = Math.max(1, Number(element.width) || 1);
        const elementHeight = Math.max(1, Number(element.height) || 1);
        const paddingX = (-measurement.x) - elementWidth / 2;
        const paddingY = (-measurement.y) - elementHeight / 2;
        const scaleX = measurement.width / sourceWidth;
        const scaleY = measurement.height / sourceHeight;
        const frame = {
          x: left * scaleX - paddingX - elementWidth / 2,
          y: top * scaleY - paddingY - elementHeight / 2,
          width: (right - left + 1) * scaleX,
          height: (bottom - top + 1) * scaleY,
          basisWidth: elementWidth,
          basisHeight: elementHeight
        };
        if (frame.width <= 0 || frame.height <= 0) {
          return;
        }
        setStateIconDrawingSvgVisibleFrames((current: Record<string, any>) => {
          const previous = current[key];
          if (
            previous &&
            Math.abs(previous.x - frame.x) < 0.1 &&
            Math.abs(previous.y - frame.y) < 0.1 &&
            Math.abs(previous.width - frame.width) < 0.1 &&
            Math.abs(previous.height - frame.height) < 0.1 &&
            Math.abs((previous.basisWidth ?? elementWidth) - frame.basisWidth) < 0.1 &&
            Math.abs((previous.basisHeight ?? elementHeight) - frame.basisHeight) < 0.1
          ) {
            return current;
          }
          return { ...current, [key]: frame };
        });
      };
      sourceImage.src = event?.currentTarget?.href?.baseVal || measurement.href;
    };
    const stateIconDrawingSvgSelectionFrame = (element: any) => {
      if (element?.kind !== "imported-svg") {
        return null;
      }
      const frame = stateIconDrawingSvgVisibleFrames?.[stateIconSvgVisibleFrameKey(element)];
      if (!frame || frame.width <= 0 || frame.height <= 0) {
        return null;
      }
      const basisWidth = Math.max(1, Number(frame.basisWidth) || Number(element.width) || 1);
      const basisHeight = Math.max(1, Number(frame.basisHeight) || Number(element.height) || 1);
      const scaleX = Math.max(1, Number(element.width) || 1) / basisWidth;
      const scaleY = Math.max(1, Number(element.height) || 1) / basisHeight;
      const scaledFrame = {
        x: frame.x * scaleX,
        y: frame.y * scaleY,
        width: frame.width * scaleX,
        height: frame.height * scaleY
      };
      return {
        ...scaledFrame,
        halfWidth: scaledFrame.x + scaledFrame.width,
        halfHeight: scaledFrame.y + scaledFrame.height
      };
    };
    const stateIconDrawingTerminalPatch = (value: string) => {
      if (value === "") {
        return { terminalIndex: undefined };
      }
      const terminalIndex = Number.parseInt(value, 10);
      if (!Number.isInteger(terminalIndex) || terminalIndex < 0) {
        return { terminalIndex: undefined };
      }
      const option = stateIconDrawingTerminalOptions.find((item) => item.index === terminalIndex);
      const color = option?.color || "";
      return color
        ? { terminalIndex, strokeColor: color, textColor: color }
        : { terminalIndex };
    };
    const stateIconDrawingRowForDialog = (dialog: any) => {
      if (isDefaultStatePageId(dialog.target.rowId)) {
        return dialog.target.scope === "definition"
          ? defaultStateDraftRow(definitionStateDraftRows, definitionDefaultStateVisualDraft())
          : defaultStateDraftRow(customDeviceDraft.stateDefinitions, customDeviceDefaultStateVisualDraft());
      }
      return dialog.target.scope === "definition"
        ? definitionStateDraftRows.find((item) => item.id === dialog.target.rowId)
        : customDeviceDraft.stateDefinitions.find((item) => item.id === dialog.target.rowId);
    };
    const cancelStateIconDrawingCanvasDraft = () => {
      const active = Boolean(stateIconDrawingDialog?.pendingElementKind || stateIconDrawingDialog?.pendingStaticTemplate || stateIconDrawingDialog?.drawingDraft);
      if (!active) {
        return false;
      }
      setStateIconDrawingContextMenu(null);
      setStateIconDrawingDialog((current) => current ? {
        ...current,
        pendingElementKind: undefined,
        pendingStaticTemplate: undefined,
        drawingDraft: undefined,
        smartAlignmentGuides: []
      } : current);
      return true;
    };
    const handleStateIconDrawingCanvasPointerDown = (event: PointerEvent<SVGSVGElement>) => {
      if (event.button !== 0 || !stateIconDrawingDialog?.target) {
        return false;
      }
      const active = Boolean(stateIconDrawingDialog.pendingElementKind || stateIconDrawingDialog.pendingStaticTemplate || stateIconDrawingDialog.drawingDraft);
      if (!active) {
        return false;
      }
      (event.currentTarget.closest(".state-icon-drawing-inline") as HTMLElement | null)?.focus();
      const point = stateIconDrawingPointer(event);
      const snappedPoint = stateIconDrawingTerminalPointSnap(__appScope, clampStateIconDrawingPoint(point));
      setStateIconDrawingContextMenu(null);
      setStateIconDrawingDialog((current) => {
        if (!current) {
          return current;
        }
        if (current.drawingDraft) {
          if (current.drawingDraft.kind === "polyline") {
            const committedPoint = snappedPoint.point;
            const draftPoints = current.drawingDraft.points?.length
              ? current.drawingDraft.points
              : [current.drawingDraft.start];
            const nextPoints = appendDistinctStateIconDrawingPoint(draftPoints, committedPoint);
            const nextElement = stateIconDrawingPolylineElementFromPoints(current.drawingDraft.element, nextPoints);
            if (event.detail < 2) {
              return {
                ...current,
                drawingDraft: {
                  ...current.drawingDraft,
                  points: nextPoints,
                  current: committedPoint,
                  element: nextElement
                },
                smartAlignmentGuides: snappedPoint.guides
              };
            }
            if (nextPoints.length < 2) {
              return current;
            }
            return finishStateIconDrawingDraft({
              ...current,
              drawingDraft: {
                ...current.drawingDraft,
                points: nextPoints,
                current: committedPoint,
                element: nextElement
              },
              smartAlignmentGuides: snappedPoint.guides
            }, stateIconDrawingHistoryRef);
          }
          const element = stateIconDrawingElementFromPoints(current.drawingDraft.element, current.drawingDraft.start, snappedPoint.point);
          pushStateIconDrawingHistorySnapshot(stateIconDrawingHistoryRef, current.elements);
          return {
            ...current,
            elements: [...current.elements, element],
            selectedElementId: element.id,
            selectedElementIds: [element.id],
            pendingElementKind: undefined,
            pendingStaticTemplate: undefined,
            drawingDraft: undefined,
            smartAlignmentGuides: []
          };
        }
        if (!current.pendingElementKind && !current.pendingStaticTemplate) {
          return current;
        }
        const row = stateIconDrawingRowForDialog(current);
        const baseElement = current.pendingStaticTemplate
          ? createStateIconDrawingElementFromStaticTemplate(__appScope, current.pendingStaticTemplate, row)
          : createStateIconDrawingElement(current.pendingElementKind, row);
        const startPoint = snappedPoint.point;
        const element = baseElement.kind === "polyline"
          ? stateIconDrawingPolylineElementFromPoints(baseElement, [startPoint])
          : stateIconDrawingElementFromPoints(baseElement, startPoint, startPoint);
        return {
          ...current,
          selectedElementId: "",
          selectedElementIds: [],
          drawingDraft: {
            kind: baseElement.kind,
            start: startPoint,
            current: startPoint,
            points: baseElement.kind === "polyline" ? [startPoint] : undefined,
            element
          },
          smartAlignmentGuides: snappedPoint.guides
        };
      });
      return true;
    };
    const updateStateIconDrawingCanvasDraft = (event: PointerEvent<SVGSVGElement>) => {
      if (!stateIconDrawingDialog?.drawingDraft) {
        return false;
      }
      const point = stateIconDrawingPointer(event);
      setStateIconDrawingDialog((current) => {
        if (!current?.drawingDraft) {
          return current;
        }
        const currentPoint = stateIconDrawingTerminalPointSnap(__appScope, clampStateIconDrawingPoint(point));
        if (current.drawingDraft.kind === "polyline") {
          const draftPoints = current.drawingDraft.points?.length
            ? current.drawingDraft.points
            : [current.drawingDraft.start];
          const previewPoints = appendDistinctStateIconDrawingPoint(draftPoints, currentPoint.point);
          return {
            ...current,
            drawingDraft: {
              ...current.drawingDraft,
              current: currentPoint.point,
              element: stateIconDrawingPolylineElementFromPoints(current.drawingDraft.element, previewPoints)
            },
            smartAlignmentGuides: currentPoint.guides
          };
        }
        return {
          ...current,
          drawingDraft: {
            ...current.drawingDraft,
            current: currentPoint.point,
            element: stateIconDrawingElementFromPoints(current.drawingDraft.element, current.drawingDraft.start, currentPoint.point)
          },
          smartAlignmentGuides: currentPoint.guides
        };
      });
      return true;
    };
    const updateStateIconDrawingMarquee = (event: PointerEvent<SVGSVGElement>) => {
      if (!stateIconDrawingDialog?.marquee) {
        return false;
      }
      const point = clampStateIconDrawingPoint(stateIconDrawingPointer(event));
      setStateIconDrawingDialog((current) => current?.marquee ? {
        ...current,
        marquee: {
          ...current.marquee,
          current: point
        }
      } : current);
      return true;
    };
    const finishStateIconDrawingMarquee = (event: PointerEvent<SVGSVGElement>) => {
      if (!stateIconDrawingDialog?.marquee) {
        return false;
      }
      const point = clampStateIconDrawingPoint(stateIconDrawingPointer(event));
      setStateIconDrawingDialog((current) => {
        if (!current?.marquee) {
          return current;
        }
        const rect = stateIconDrawingRectFromPoints(current.marquee.start, point);
        const selectedByRect = expandStateIconDrawingElementIds(
          current.elements,
          stateIconDrawingElementIdsInRect(current.elements, rect)
        );
        const currentSelection = stateIconDrawingSelectedIds(current);
        const selectedElementIds = current.marquee.append
          ? Array.from(new Set([...currentSelection, ...selectedByRect]))
          : selectedByRect;
        return {
          ...current,
          selectedElementId: selectedElementIds[selectedElementIds.length - 1] ?? "",
          selectedElementIds,
          marquee: undefined
        };
      });
      event.currentTarget.releasePointerCapture?.(event.pointerId);
      return true;
    };
    const cancelStateIconDrawingMarquee = (event: PointerEvent<SVGSVGElement>) => {
      if (!stateIconDrawingDialog?.marquee) {
        return false;
      }
      setStateIconDrawingDialog((current) => current?.marquee ? { ...current, marquee: undefined } : current);
      event.currentTarget.releasePointerCapture?.(event.pointerId);
      return true;
    };
    const setStateIconFramePatch = (patch: Record<string, any>) => {
      setStateIconDrawingDialog((current) =>
        current
          ? {
              ...current,
              frame: {
                ...STATE_ICON_DRAFT_FRAME,
                ...(current.frame ?? {}),
                ...patch
              }
            }
          : current
      );
    };
    const copySelectedStateIconElements = () => {
      if (!stateIconDrawingDialog) {
        return;
      }
      const selectedSet = new Set(stateIconDrawingSelectedIds(stateIconDrawingDialog));
      stateIconDrawingClipboardRef.current = stateIconDrawingDialog.elements
        .filter((element) => selectedSet.has(element.id))
        .map((element) => ({
          ...element,
          ...(Array.isArray(element.points) ? { points: element.points.map((point) => ({ ...point })) } : {})
        }));
      setStateIconDrawingContextMenu(null);
    };
    const cutSelectedStateIconElements = () => {
      setStateIconDrawingDialog((current) => cutStateIconDrawingSelection(current, stateIconDrawingClipboardRef, stateIconDrawingHistoryRef));
      setStateIconDrawingContextMenu(null);
    };
    const groupSelectedStateIconElements = () => {
      setStateIconDrawingDialog((current) => groupStateIconDrawingSelection(current, stateIconDrawingHistoryRef));
      setStateIconDrawingContextMenu(null);
    };
    const ungroupSelectedStateIconElements = () => {
      setStateIconDrawingDialog((current) => ungroupStateIconDrawingSelection(current, stateIconDrawingHistoryRef));
      setStateIconDrawingContextMenu(null);
    };
    const pasteStateIconElements = (point?: Point) => {
      setStateIconDrawingDialog((current) => {
        const clipboard = stateIconDrawingClipboardRef.current ?? [];
        if (!current || clipboard.length === 0) {
          return current;
        }
        pushStateIconDrawingHistorySnapshot(stateIconDrawingHistoryRef, current.elements);
        const sourceBounds = stateIconDrawingSelectionBounds(clipboard);
        const offset = point && sourceBounds
          ? { x: point.x - sourceBounds.centerX, y: point.y - sourceBounds.centerY }
          : { x: 12, y: 12 };
        const pasted = cloneStateIconDrawingElements(clipboard, stateIconDrawingElementId, offset);
        return {
          ...current,
          elements: [...current.elements, ...pasted],
          selectedElementId: pasted[pasted.length - 1]?.id ?? "",
          selectedElementIds: pasted.map((element) => element.id)
        };
      });
      setStateIconDrawingContextMenu(null);
    };
    const updateSelectedStateIconElements = (updater: (element: StateIconDrawingElement, selected: StateIconDrawingElement[]) => StateIconDrawingElement) => {
      setStateIconDrawingDialog((current) => {
        if (!current) {
          return current;
        }
        const selectedIds = stateIconDrawingSelectedIds(current);
        if (selectedIds.length === 0) {
          return current;
        }
        const selectedSet = new Set(selectedIds);
        const selected = current.elements.filter((element) => selectedSet.has(element.id));
        pushStateIconDrawingHistorySnapshot(stateIconDrawingHistoryRef, current.elements);
        return {
          ...current,
          elements: current.elements.map((element) => selectedSet.has(element.id) ? updater(element, selected) : element)
        };
      });
      setStateIconDrawingContextMenu(null);
    };
    const reorderSelectedStateIconElements = (mode: "front" | "back" | "forward" | "backward") => {
      setStateIconDrawingDialog((current) => {
        if (!current) {
          return current;
        }
        const selectedIds = stateIconDrawingSelectedIds(current);
        if (selectedIds.length === 0) {
          return current;
        }
        const selectedSet = new Set(selectedIds);
        const selected = current.elements.filter((element) => selectedSet.has(element.id));
        const rest = current.elements.filter((element) => !selectedSet.has(element.id));
        pushStateIconDrawingHistorySnapshot(stateIconDrawingHistoryRef, current.elements);
        if (mode === "front") {
          return { ...current, elements: [...rest, ...selected] };
        }
        if (mode === "back") {
          return { ...current, elements: [...selected, ...rest] };
        }
        const next = [...current.elements];
        if (mode === "forward") {
          for (let index = next.length - 2; index >= 0; index -= 1) {
            if (selectedSet.has(next[index].id) && !selectedSet.has(next[index + 1].id)) {
              [next[index], next[index + 1]] = [next[index + 1], next[index]];
            }
          }
        } else {
          for (let index = 1; index < next.length; index += 1) {
            if (selectedSet.has(next[index].id) && !selectedSet.has(next[index - 1].id)) {
              [next[index], next[index - 1]] = [next[index - 1], next[index]];
            }
          }
        }
        return { ...current, elements: next };
      });
      setStateIconDrawingContextMenu(null);
    };
    const alignSelectedStateIconElements = (mode: "left" | "center" | "right" | "top" | "middle" | "bottom" | "same-width" | "same-height" | "same-size") => {
      updateSelectedStateIconElements((element, selected) => {
        const bounds = stateIconDrawingSelectionBounds(selected);
        const reference = selected[0];
        if (!bounds || !reference) {
          return element;
        }
        const itemBounds = stateIconDrawingElementBounds(element);
        if (mode === "left") return { ...element, x: bounds.left + itemBounds.width / 2 };
        if (mode === "center") return { ...element, x: bounds.centerX };
        if (mode === "right") return { ...element, x: bounds.right - itemBounds.width / 2 };
        if (mode === "top") return { ...element, y: bounds.top + itemBounds.height / 2 };
        if (mode === "middle") return { ...element, y: bounds.centerY };
        if (mode === "bottom") return { ...element, y: bounds.bottom - itemBounds.height / 2 };
        if (mode === "same-width") return { ...element, width: reference.width };
        if (mode === "same-height") return { ...element, height: reference.height };
        return { ...element, width: reference.width, height: reference.height };
      });
    };
    const distributeSelectedStateIconElements = (axis: "x" | "y") => {
      setStateIconDrawingDialog((current) => {
        if (!current) {
          return current;
        }
        const selectedIds = stateIconDrawingSelectedIds(current);
        if (selectedIds.length < 3) {
          return current;
        }
        const selectedSet = new Set(selectedIds);
        const selected = current.elements.filter((element) => selectedSet.has(element.id)).sort((a, b) => axis === "x" ? a.x - b.x : a.y - b.y);
        const first = selected[0];
        const last = selected[selected.length - 1];
        const step = ((axis === "x" ? last.x - first.x : last.y - first.y) || 0) / Math.max(1, selected.length - 1);
        const nextById = new Map(selected.map((element, index) => [
          element.id,
          axis === "x" ? { ...element, x: first.x + step * index } : { ...element, y: first.y + step * index }
        ]));
        pushStateIconDrawingHistorySnapshot(stateIconDrawingHistoryRef, current.elements);
        return {
          ...current,
          elements: current.elements.map((element) => nextById.get(element.id) ?? element)
        };
      });
      setStateIconDrawingContextMenu(null);
    };
    const mirrorSelectedStateIconElements = (axis: "x" | "y") => {
      updateSelectedStateIconElements((element, selected) => {
        const bounds = stateIconDrawingSelectionBounds(selected);
        if (!bounds) {
          return element;
        }
        return axis === "x"
          ? { ...element, x: bounds.centerX - (element.x - bounds.centerX), rotation: -element.rotation }
          : { ...element, y: bounds.centerY - (element.y - bounds.centerY), rotation: -element.rotation };
      });
    };
    const duplicateStateIconStatePage = (rowId: string) => {
      const source = isDefaultStatePageId(rowId)
        ? defaultRow
        : rows.find((row) => row.id === rowId) ?? null;
      if (!source) {
        return;
      }
      const nextIndex = nextNonDefaultStateIndex(rows);
      const nextRow = {
        ...createStateDraftRowFromDefaultVisual(source, {
          value: String(nextIndex),
          name: `状态${nextIndex}`
        }),
        id: stateDraftRowId()
      };
      if (handlers.drawingScope === "definition") {
        setDefinitionStateDraftRows((current) => appendNonDefaultStateDraftRow(current, defaultVisual, nextRow));
      } else {
        setCustomDeviceDraft((current) => ({
          ...current,
          stateDefinitions: appendNonDefaultStateDraftRow(current.stateDefinitions, defaultVisual, nextRow),
          error: ""
        }));
      }
      setActiveRowId(nextRow.id);
      setStateIconDrawingContextMenu(null);
    };
    const renderStateIconTabs = () => (
      <div className="device-state-tabs state-icon-drawing-state-tabs" role="tablist" aria-label="状态分页">
        {!hideDefaultPage && (
          <button
            type="button"
            role="tab"
            aria-selected={isDefaultStatePage}
            className={isDefaultStatePage ? "active" : ""}
            onClick={() => setActiveRowId(DEFAULT_STATE_PAGE_ID)}
            onContextMenu={(event) => {
              event.preventDefault();
              setStateIconDrawingContextMenu({ x: event.clientX, y: event.clientY, kind: "state", rowId: DEFAULT_STATE_PAGE_ID });
            }}
          >
            默认状态
          </button>
        )}
        {displayRows.map((row, index) => {
          const active = activeRow?.id === row.id;
          return (
            <button
              key={row.id}
              type="button"
              role="tab"
              aria-selected={active}
              className={active ? "active" : ""}
              onClick={() => setActiveRowId(row.id)}
              onContextMenu={(event) => {
                event.preventDefault();
                openStateIconDrawingContextMenu(event, { kind: "state", rowId: row.id });
              }}
            >
              {row.name.trim() || `状态${index + 1}`}
            </button>
          );
        })}
        <button type="button" className="device-state-add-tab state-icon-small-icon-button" onClick={handlers.add} aria-label="新增状态" title="新增状态">+</button>
      </div>
    );
    const renderStateIconDrawingContextMenu = () => {
      if (!stateIconDrawingContextMenu || !drawingReady) {
        return null;
      }
      const selectedCount = stateIconDrawingSelectedIds(stateIconDrawingDialog).length;
      const selectedElements = stateIconDrawingDialog.elements.filter((element) => stateIconDrawingSelectedIds(stateIconDrawingDialog).includes(element.id));
      const selectedGroupIds = new Set(selectedElements.map((element) => String(element.groupId ?? "").trim()).filter(Boolean));
      const selectedIsSingleGroup = selectedGroupIds.size === 1 && selectedElements.length > 1 && selectedElements.every((element) => String(element.groupId ?? "").trim());
      const canGroup = selectedCount >= 2 && !selectedIsSingleGroup;
      const canUngroup = selectedGroupIds.size > 0;
      const clipboardReady = (stateIconDrawingClipboardRef.current ?? []).length > 0;
      const rowIsDefault = stateIconDrawingContextMenu.kind === "state" && isDefaultStatePageId(stateIconDrawingContextMenu.rowId ?? "");
      const menuButton = (label: string, onClick: () => void, disabled = false) => (
        <button type="button" disabled={disabled} onClick={onClick}>{label}</button>
      );
      const menuSubmenu = (label: string, children: React.ReactNode, disabled = false) => (
        <div className={`state-icon-context-submenu ${disabled ? "disabled" : ""}`}>
          <button type="button" className="state-icon-context-submenu-trigger" disabled={disabled} aria-haspopup="menu" aria-expanded="false">
            <span>{label}</span>
            <span className="state-icon-context-submenu-arrow" aria-hidden="true">&gt;</span>
          </button>
          {!disabled && (
            <div className="state-icon-context-submenu-panel" role="menu">
              {children}
            </div>
          )}
        </div>
      );
      return (
        <div
          className="state-icon-context-menu"
          style={{ left: stateIconDrawingContextMenu.x, top: stateIconDrawingContextMenu.y }}
          onPointerDown={(event) => event.stopPropagation()}
          onContextMenu={(event) => event.preventDefault()}
        >
          {stateIconDrawingContextMenu.kind === "state" ? (
            <>
              {menuButton("复制到新状态", () => duplicateStateIconStatePage(stateIconDrawingContextMenu.rowId ?? selectedStateRowId))}
              {menuButton("删除状态", () => {
                const rowId = stateIconDrawingContextMenu.rowId ?? "";
                if (!isDefaultStatePageId(rowId)) {
                  handlers.remove(rowId);
                  setStateIconDrawingContextMenu(null);
                }
              }, rowIsDefault)}
            </>
          ) : (
            <>
              {menuButton("复制", copySelectedStateIconElements, selectedCount === 0)}
              {menuButton("剪切", cutSelectedStateIconElements, selectedCount === 0)}
              {menuButton("粘贴", () => pasteStateIconElements(stateIconDrawingContextMenu.pastePoint), !clipboardReady)}
              {menuButton("删除", deleteSelectedStateIconDrawingElements, selectedCount === 0)}
              {menuButton("组合（Ctrl+G）", groupSelectedStateIconElements, !canGroup)}
              {menuButton("解除组合（Ctrl+Shift+G）", ungroupSelectedStateIconElements, !canUngroup)}
              {menuSubmenu("层级操作", (
                <>
                  {menuButton("置顶", () => reorderSelectedStateIconElements("front"))}
                  {menuButton("上移", () => reorderSelectedStateIconElements("forward"))}
                  {menuButton("下移", () => reorderSelectedStateIconElements("backward"))}
                  {menuButton("置底", () => reorderSelectedStateIconElements("back"))}
                </>
              ), selectedCount === 0)}
              {menuSubmenu("对齐操作", (
                <>
                  {menuButton("左对齐", () => alignSelectedStateIconElements("left"))}
                  {menuButton("水平居中", () => alignSelectedStateIconElements("center"))}
                  {menuButton("右对齐", () => alignSelectedStateIconElements("right"))}
                  {menuButton("上对齐", () => alignSelectedStateIconElements("top"))}
                  {menuButton("垂直居中", () => alignSelectedStateIconElements("middle"))}
                  {menuButton("下对齐", () => alignSelectedStateIconElements("bottom"))}
                </>
              ), selectedCount < 2 || selectedIsSingleGroup)}
              {menuSubmenu("排列操作", (
                <>
                  {menuButton("水平等距", () => distributeSelectedStateIconElements("x"), selectedCount < 3)}
                  {menuButton("垂直等距", () => distributeSelectedStateIconElements("y"), selectedCount < 3)}
                  {menuButton("同宽", () => alignSelectedStateIconElements("same-width"))}
                  {menuButton("同高", () => alignSelectedStateIconElements("same-height"))}
                  {menuButton("同宽高", () => alignSelectedStateIconElements("same-size"))}
                </>
              ), selectedCount < 2 || selectedIsSingleGroup)}
              {menuSubmenu("镜像操作", (
                <>
                  {menuButton("水平镜像", () => mirrorSelectedStateIconElements("x"))}
                  {menuButton("垂直镜像", () => mirrorSelectedStateIconElements("y"))}
                </>
              ), selectedCount === 0)}
            </>
          )}
        </div>
      );
    };
    const openStateIconDrawingContextMenu = (
      event: { clientX: number; clientY: number; currentTarget: EventTarget },
      menu: Omit<StateIconDrawingContextMenuState, "x" | "y">
    ) => {
      const target = event.currentTarget as Element | null;
      const host = target?.closest?.(".custom-device-dialog") as HTMLElement | null;
      const hostStyle = host ? getComputedStyle(host) : null;
      const hostCreatesFixedContainingBlock = Boolean(host && hostStyle && (
        hostStyle.transform !== "none" ||
        hostStyle.filter !== "none" ||
        hostStyle.perspective !== "none" ||
        hostStyle.contain.includes("paint")
      ));
      const hostRect = hostCreatesFixedContainingBlock ? host!.getBoundingClientRect() : null;
      const point = stateIconDrawingContextMenuPosition(
        { x: event.clientX, y: event.clientY },
        {
          hostRect,
          hostOffsetWidth: host?.offsetWidth,
          hostOffsetHeight: host?.offsetHeight,
          hostClientLeft: host?.clientLeft,
          hostClientTop: host?.clientTop,
          viewportWidth: document.documentElement.clientWidth,
          viewportHeight: document.documentElement.clientHeight,
          menuHeight: menu.kind === "state" ? 76 : 310
        }
      );
      setStateIconDrawingContextMenu({ ...point, ...menu });
    };
    const renderStateIconDrawingInline = () => {
      if (!activeDrawingTarget) {
        return null;
      }
      if (!drawingReady) {
        return (
          <div className="state-icon-drawing-inline pending" aria-label="图案编辑区">
            <span>图案编辑区准备中</span>
          </div>
        );
      }
      const selectedIds = stateIconDrawingSelectedIds(stateIconDrawingDialog);
      const sidePanelTab = stateIconDrawingDialog.sidePanelTab === "selected" ? "selected" : "global";
      const frame = { ...STATE_ICON_DRAFT_FRAME, ...(stateIconDrawingDialog.frame ?? {}) };
      const frameBackgroundImageAssetId = String(frame.backgroundImageAssetId ?? "").trim();
      const frameBackgroundImage = String(
        (frameBackgroundImageAssetId && imageAssets?.[frameBackgroundImageAssetId]) ||
        frame.backgroundImage ||
        ""
      ).trim();
      const frameBackgroundImageFit = normalizeImageFitMode(frame.backgroundImageFit);
      const frameBackgroundClipId = "state-icon-drawing-frame-background-clip";
      const frameBackgroundPatternId = "state-icon-drawing-frame-background-pattern";
      const frameDashArray = stateIconDrawingFrameDashArray(frame);
      const frameRect = stateIconDrawingFrameRect
        ? stateIconDrawingFrameRect(stateIconHasTerminals)
        : stateIconHasTerminals
          ? { x: 30, y: 20, width: 180, height: 120, rx: 8 }
          : { x: 0, y: 0, width: 240, height: 160, rx: 10 };
      const rawPreviewElements = stateIconDrawingDialog.drawingDraft
        ? [...stateIconDrawingDialog.elements, stateIconDrawingDialog.drawingDraft.element]
        : stateIconDrawingDialog.elements;
      const dragOverrides = stateIconDrawingDragDeltaRef?.current?.overrides;
      const previewElements = dragOverrides
        ? rawPreviewElements.map((element) => {
            const ovr = dragOverrides[element.id];
            return ovr ? { ...element, ...ovr } : element;
          })
        : rawPreviewElements;
      const selectedPreviewElements = previewElements.filter((element) => selectedIds.includes(element.id));
      const stateIconDrawingGroupSelectionBounds = selectedPreviewElements.length > 1
        ? stateIconDrawingSelectionBounds(selectedPreviewElements)
        : null;
      const directPreviewElements = stateIconDrawingPreviewNeedsDirectElementRender(previewElements);
      const stateIconDrawingSmartGuides = stateIconDrawingDragDeltaRef?.current?.guides ?? stateIconDrawingDialog.smartAlignmentGuides ?? [];
      const stateIconDrawingMarqueeRect = stateIconDrawingDialog.marquee
        ? stateIconDrawingRectFromPoints(stateIconDrawingDialog.marquee.start, stateIconDrawingDialog.marquee.current)
        : null;
      return (
        <div
          className={`state-icon-drawing-inline ${stateIconDrawingDialog.pendingElementKind || stateIconDrawingDialog.pendingStaticTemplate ? "tool-active" : ""} ${stateIconDrawingDialog.drawingDraft ? "drawing-active" : ""}`}
          onKeyDown={stateIconDrawingKeyDown}
          tabIndex={-1}
          aria-label="图案编辑区"
          onPointerDown={() => setStateIconDrawingContextMenu(null)}
        >
          <div className="state-icon-drawing-layout">
            <div className="state-icon-drawing-main">
              {renderStateIconTabs()}
              <div className="state-icon-drawing-canvas">
                <svg
                  ref={stateIconDrawingSvgRef}
                  viewBox="0 0 240 160"
                  role="img"
                  aria-label="图案绘制预览"
                  onPointerDownCapture={(event) => {
                    if (handleStateIconDrawingCanvasPointerDown(event)) {
                      event.preventDefault();
                      event.stopPropagation();
                    }
                  }}
                  onPointerMove={(event) => {
                    if (stateIconTerminalDragIndex !== null && stateIconTerminalDragIndex !== undefined) {
                      updateStateIconTerminalAnchorFromDrawing(stateIconTerminalDragIndex, event);
                      event.preventDefault();
                      return;
                    }
                    if (updateStateIconDrawingCanvasDraft(event)) {
                      event.preventDefault();
                      return;
                    }
                    if (updateStateIconDrawingMarquee(event)) {
                      event.preventDefault();
                      return;
                    }
                    dragStateIconDrawingSelection(event);
                  }}
                  onDoubleClick={(event) => {
                    if (!stateIconDrawingDialog.drawingDraft) {
                      return;
                    }
                    event.preventDefault();
                    event.stopPropagation();
                    setStateIconDrawingContextMenu(null);
                    setStateIconDrawingDialog((current) => finishStateIconDrawingDraft(current, stateIconDrawingHistoryRef));
                  }}
                  onPointerUp={(event) => {
                    if (finishStateIconTerminalDrag(event)) {
                      event.preventDefault();
                      return;
                    }
                    if (!stateIconDrawingDialog.drawingDraft) {
                      if (finishStateIconDrawingMarquee(event)) {
                        event.preventDefault();
                        return;
                      }
                      stopStateIconDrawingDrag(event);
                    }
                  }}
                  onPointerCancel={(event) => {
                    if (finishStateIconTerminalDrag(event)) {
                      event.preventDefault();
                      return;
                    }
                    if (!stateIconDrawingDialog.drawingDraft) {
                      if (cancelStateIconDrawingMarquee(event)) {
                        event.preventDefault();
                        return;
                      }
                      stopStateIconDrawingDrag(event);
                    }
                  }}
                  onContextMenuCapture={(event) => {
                    if (stateIconDrawingDialog.pendingElementKind || stateIconDrawingDialog.pendingStaticTemplate || stateIconDrawingDialog.drawingDraft) {
                      event.preventDefault();
                      event.stopPropagation();
                      cancelStateIconDrawingCanvasDraft();
                    }
                  }}
                  onContextMenu={(event) => {
                    event.preventDefault();
                    if (cancelStateIconDrawingCanvasDraft()) {
                      event.stopPropagation();
                      return;
                    }
                    const point = stateIconDrawingPointer(event);
                    openStateIconDrawingContextMenu(event, { kind: "canvas", pastePoint: point });
                  }}
                  onPointerDown={(event) => {
                    if (stateIconDrawingDialog.pendingElementKind || stateIconDrawingDialog.pendingStaticTemplate || stateIconDrawingDialog.drawingDraft) {
                      return;
                    }
                    if (event.button !== 0) {
                      return;
                    }
                    (event.currentTarget.closest(".state-icon-drawing-inline") as HTMLElement | null)?.focus();
                    const point = clampStateIconDrawingPoint(stateIconDrawingPointer(event));
                    const append = event.shiftKey || event.ctrlKey || event.metaKey;
                    setStateIconDrawingDialog((current) => current ? {
                      ...current,
                      marquee: {
                        start: point,
                        current: point,
                        append
                      }
                    } : current);
                    event.currentTarget.setPointerCapture?.(event.pointerId);
                  }}
                >
                  <rect
                    x={formatSvgNumber(frameRect.x)}
                    y={formatSvgNumber(frameRect.y)}
                    width={formatSvgNumber(frameRect.width)}
                    height={formatSvgNumber(frameRect.height)}
                    rx={formatSvgNumber(frameRect.rx)}
                    className="state-icon-drawing-canvas-bg"
                    fill={frame.fillColor}
                  />
                  {frameBackgroundImage && (
                    <>
                      <defs>
                        <clipPath id={frameBackgroundClipId}>
                          <rect
                            x={formatSvgNumber(frameRect.x)}
                            y={formatSvgNumber(frameRect.y)}
                            width={formatSvgNumber(frameRect.width)}
                            height={formatSvgNumber(frameRect.height)}
                            rx={formatSvgNumber(frameRect.rx)}
                          />
                        </clipPath>
                        {frameBackgroundImageFit === "tile" && (
                          <pattern id={frameBackgroundPatternId} x={formatSvgNumber(frameRect.x)} y={formatSvgNumber(frameRect.y)} width={Math.min(frameRect.width, 96)} height={Math.min(frameRect.height, 96)} patternUnits="userSpaceOnUse">
                            <image href={frameBackgroundImage} x="0" y="0" width={Math.min(frameRect.width, 96)} height={Math.min(frameRect.height, 96)} preserveAspectRatio={imageFitPreserveAspectRatio("fixed")} />
                          </pattern>
                        )}
                      </defs>
                      {frameBackgroundImageFit === "tile" ? (
                        <rect
                          x={formatSvgNumber(frameRect.x)}
                          y={formatSvgNumber(frameRect.y)}
                          width={formatSvgNumber(frameRect.width)}
                          height={formatSvgNumber(frameRect.height)}
                          fill={`url(#${frameBackgroundPatternId})`}
                          clipPath={`url(#${frameBackgroundClipId})`}
                          pointerEvents="none"
                        />
                      ) : (
                        <image
                          href={frameBackgroundImage}
                          x={formatSvgNumber(frameRect.x)}
                          y={formatSvgNumber(frameRect.y)}
                          width={formatSvgNumber(frameRect.width)}
                          height={formatSvgNumber(frameRect.height)}
                          preserveAspectRatio={imageFitPreserveAspectRatio(frameBackgroundImageFit)}
                          clipPath={`url(#${frameBackgroundClipId})`}
                          pointerEvents="none"
                        />
                      )}
                    </>
                  )}
                  {renderStateIconOuterFrameLayer()}
                  {renderStateIconTerminalBaseLayer()}
                  <rect
                    x={formatSvgNumber(frameRect.x)}
                    y={formatSvgNumber(frameRect.y)}
                    width={formatSvgNumber(frameRect.width)}
                    height={formatSvgNumber(frameRect.height)}
                    rx={formatSvgNumber(frameRect.rx)}
                    className="state-icon-drawing-operation-frame"
                    fill="none"
                    stroke={frame.strokeColor}
                    strokeWidth={Math.max(0, Number(frame.strokeWidth) || 0)}
                    strokeDasharray={frameDashArray}
                    vectorEffect="non-scaling-stroke"
                    pointerEvents="none"
                  />
                  {directPreviewElements ? previewElements.map((element, index) => (
                    <g
                      key={`preview-${element.id}-${index}`}
                      className="state-icon-drawing-direct-preview"
                      transform={`translate(${formatSvgNumber(element.x)} ${formatSvgNumber(element.y)}) rotate(${formatSvgNumber(element.rotation)})`}
                    >
                      {stateIconDrawingElementPreviewNode(element, { onImageLoad: stateIconDrawingDragRef?.current ? undefined : updateStateIconImageVisibleFrame })}
                    </g>
                  )) : (
                    <image
                      href={stateIconDrawingToImage(previewElements)}
                      x="0"
                      y="0"
                      width="240"
                      height="160"
                      preserveAspectRatio="xMidYMid meet"
                      className="state-icon-drawing-composite-preview"
                    />
                  )}
                  {previewElements.map((element) => {
                    if (element.kind !== "imported-svg") {
                      return null;
                    }
                    const measurement = stateIconDrawingElementPreviewImage(element);
                    return (
                      <image
                        key={`svg-measure-${element.id}`}
                        href={measurement.href}
                        x="-10000"
                        y="-10000"
                        width="1"
                        height="1"
                        opacity="0"
                        pointerEvents="none"
                        aria-hidden="true"
                        onLoad={(event) => updateStateIconSvgVisibleFrame(element, event)}
                      />
                    );
                  })}
                  {stateIconDrawingSmartGuides.map((guide) => (
                    <line
                      key={guide.id}
                      className={`smart-alignment-guide smart-alignment-guide-${guide.orientation} state-icon-drawing-smart-guide`}
                      x1={guide.orientation === "vertical" ? guide.position : guide.start}
                      y1={guide.orientation === "vertical" ? guide.start : guide.position}
                      x2={guide.orientation === "vertical" ? guide.position : guide.end}
                      y2={guide.orientation === "vertical" ? guide.end : guide.position}
                      vectorEffect="non-scaling-stroke"
                    />
                  ))}
                  {stateIconDrawingMarqueeRect && (
                    <rect
                      className="marquee-box state-icon-drawing-marquee"
                      x={stateIconDrawingMarqueeRect.left}
                      y={stateIconDrawingMarqueeRect.top}
                      width={stateIconDrawingMarqueeRect.right - stateIconDrawingMarqueeRect.left}
                      height={stateIconDrawingMarqueeRect.bottom - stateIconDrawingMarqueeRect.top}
                      vectorEffect="non-scaling-stroke"
                    />
                  )}
                  {stateIconDrawingDialog.elements.map((element) => {
                    const dragOverride = stateIconDrawingDragDeltaRef?.current?.overrides?.[element.id];
                    if (dragOverride) {
                      element = { ...element, ...dragOverride };
                    }
                    const selected = selectedIds.includes(element.id);
                    const halfWidth = Math.max(1, element.width) / 2;
                    const halfHeight = Math.max(1, element.height) / 2;
                    const selectionFrame = stateIconDrawingImageSelectionFrame(element) ?? stateIconDrawingSvgSelectionFrame(element) ?? stateIconDrawingImportedSvgSelectionFrame(element) ?? {
                      x: -halfWidth,
                      y: -halfHeight,
                      width: Math.max(1, element.width),
                      height: Math.max(1, element.height),
                      halfWidth,
                      halfHeight
                    };
                    const hitboxFrame = element.kind === "image" || element.kind === "imported-svg"
                      ? selectionFrame
                      : {
                          x: -halfWidth,
                          y: -halfHeight,
                          width: Math.max(1, element.width),
                          height: Math.max(1, element.height)
                        };
                    return (
                      <g
                        key={element.id}
                        className={`state-icon-drawing-element ${selected ? "selected" : ""}`}
                        transform={`translate(${formatSvgNumber(element.x)} ${formatSvgNumber(element.y)}) rotate(${formatSvgNumber(element.rotation)})`}
                        onPointerDown={(event) => startStateIconDrawingDrag(event, element.id, "move")}
                        onDoubleClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          if (element.groupId) {
                            return;
                          }
                          const aspect = element.width / element.height;
                          const frameAspect = frameRect.width / frameRect.height;
                          let newWidth: number;
                          let newHeight: number;
                          if (aspect > frameAspect) {
                            newWidth = frameRect.width;
                            newHeight = frameRect.width / aspect;
                          } else {
                            newHeight = frameRect.height;
                            newWidth = frameRect.height * aspect;
                          }
                          updateStateIconDrawingElement(element.id, {
                            width: newWidth,
                            height: newHeight,
                            x: frameRect.x + frameRect.width / 2,
                            y: frameRect.y + frameRect.height / 2
                          });
                        }}
                        onContextMenu={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          if (!stateIconDrawingSelectedIds(stateIconDrawingDialog).includes(element.id)) {
                            stateIconDrawingSelection(element.id, false);
                          }
                          openStateIconDrawingContextMenu(event, { kind: "element", elementId: element.id });
                        }}
                      >
                        <rect x={formatSvgNumber(hitboxFrame.x)} y={formatSvgNumber(hitboxFrame.y)} width={formatSvgNumber(hitboxFrame.width)} height={formatSvgNumber(hitboxFrame.height)} className="state-icon-drawing-hitbox" />
                        {selected && (
                          <>
                            <rect x={formatSvgNumber(selectionFrame.x)} y={formatSvgNumber(selectionFrame.y)} width={formatSvgNumber(selectionFrame.width)} height={formatSvgNumber(selectionFrame.height)} className="state-icon-drawing-selection-box" />
                            {selectedIds.length === 1 && (
                              <>
                            <circle cx={formatSvgNumber(selectionFrame.halfWidth)} cy={formatSvgNumber(selectionFrame.halfHeight)} r="5" className="state-icon-drawing-resize-handle" onPointerDown={(event) => startStateIconDrawingDrag(event, element.id, "resize")} />
                            <circle cx="0" cy={formatSvgNumber(-selectionFrame.halfHeight)} r="5" className="state-icon-drawing-resize-handle state-icon-drawing-resize-handle-top" onPointerDown={(event) => startStateIconDrawingDrag(event, element.id, "resize-top", { x: 0, y: -selectionFrame.halfHeight })} />
                            <circle cx="0" cy={formatSvgNumber(selectionFrame.halfHeight)} r="5" className="state-icon-drawing-resize-handle state-icon-drawing-resize-handle-bottom" onPointerDown={(event) => startStateIconDrawingDrag(event, element.id, "resize-bottom", { x: 0, y: selectionFrame.halfHeight })} />
                            <circle cx={formatSvgNumber(-selectionFrame.halfWidth)} cy="0" r="5" className="state-icon-drawing-resize-handle state-icon-drawing-resize-handle-left" onPointerDown={(event) => startStateIconDrawingDrag(event, element.id, "resize-left", { x: -selectionFrame.halfWidth, y: 0 })} />
                            <circle cx={formatSvgNumber(selectionFrame.halfWidth)} cy="0" r="5" className="state-icon-drawing-resize-handle state-icon-drawing-resize-handle-right" onPointerDown={(event) => startStateIconDrawingDrag(event, element.id, "resize-right", { x: selectionFrame.halfWidth, y: 0 })} />
                            <line x1="0" y1={formatSvgNumber(-selectionFrame.halfHeight)} x2="0" y2={formatSvgNumber(-selectionFrame.halfHeight - 16)} className="state-icon-drawing-rotate-stem" />
                            <circle cx="0" cy={formatSvgNumber(-selectionFrame.halfHeight - 20)} r="5" className="state-icon-drawing-rotate-handle" onPointerDown={(event) => startStateIconDrawingDrag(event, element.id, "rotate")} />
                              </>
                            )}
                          </>
                        )}
                      </g>
                    );
                  })}
                  {stateIconDrawingGroupSelectionBounds && (
                    <g className="state-icon-drawing-group-selection" data-selection-unit="group">
                      <rect
                        x={formatSvgNumber(stateIconDrawingGroupSelectionBounds.left)}
                        y={formatSvgNumber(stateIconDrawingGroupSelectionBounds.top)}
                        width={formatSvgNumber(stateIconDrawingGroupSelectionBounds.width)}
                        height={formatSvgNumber(stateIconDrawingGroupSelectionBounds.height)}
                        className="state-icon-drawing-selection-box state-icon-drawing-group-selection-box"
                      />
                      <circle
                        cx={formatSvgNumber(stateIconDrawingGroupSelectionBounds.right)}
                        cy={formatSvgNumber(stateIconDrawingGroupSelectionBounds.bottom)}
                        r="5"
                        className="state-icon-drawing-resize-handle"
                        onPointerDown={(event) => startStateIconDrawingDrag(event, selectedIds[selectedIds.length - 1], "resize")}
                      />
                      <line
                        x1={formatSvgNumber(stateIconDrawingGroupSelectionBounds.centerX)}
                        y1={formatSvgNumber(stateIconDrawingGroupSelectionBounds.top)}
                        x2={formatSvgNumber(stateIconDrawingGroupSelectionBounds.centerX)}
                        y2={formatSvgNumber(stateIconDrawingGroupSelectionBounds.top - 16)}
                        className="state-icon-drawing-rotate-stem"
                      />
                      <circle
                        cx={formatSvgNumber(stateIconDrawingGroupSelectionBounds.centerX)}
                        cy={formatSvgNumber(stateIconDrawingGroupSelectionBounds.top - 20)}
                        r="5"
                        className="state-icon-drawing-rotate-handle"
                        onPointerDown={(event) => startStateIconDrawingDrag(event, selectedIds[selectedIds.length - 1], "rotate")}
                      />
                    </g>
                  )}
                </svg>
              </div>
            </div>
            <div className="state-icon-drawing-side">
              <div className="state-icon-drawing-side-tabs" role="tablist" aria-label="图案属性页面">
                <button
                  type="button"
                  role="tab"
                  aria-selected={sidePanelTab === "global"}
                  className={sidePanelTab === "global" ? "active" : ""}
                  onClick={() => setStateIconDrawingDialog((current) => current ? { ...current, sidePanelTab: "global" } : current)}
                >
                  全局信息
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={sidePanelTab === "selected"}
                  className={sidePanelTab === "selected" ? "active" : ""}
                  onClick={() => setStateIconDrawingDialog((current) => current ? { ...current, sidePanelTab: "selected" } : current)}
                >
                  选中图元
                </button>
              </div>
              {sidePanelTab === "global" && (
                <div className="state-icon-drawing-state-info state-icon-drawing-tab-panel" role="tabpanel">
                  <strong>全局信息</strong>
                  <table className="state-icon-drawing-property-table">
                    <tbody>
                      {!isDefaultStatePage && selectedStateRow && (
                        <>
                          <tr>
                            <th>状态值</th>
                            <td><BufferedTextInput value={selectedStateRow.value} onCommit={(value) => handlers.update(selectedStateRowId, { value })} /></td>
                          </tr>
                          <tr>
                            <th>状态名称</th>
                            <td><BufferedTextInput value={selectedStateRow.name} onCommit={(value) => handlers.update(selectedStateRowId, { name: value })} /></td>
                          </tr>
                          <tr>
                            <th>图片显示方式</th>
                            <td>
                              <select
                                value={normalizeImageFitMode(selectedStateRow.imageFit ?? selectedStateRow.backgroundImageFit)}
                                onChange={(event) => handlers.update(selectedStateRowId, {
                                  imageFit: event.target.value,
                                  backgroundImageFit: event.target.value
                                })}
                              >
                                {IMAGE_FIT_MODE_OPTIONS.map((option) => (
                                  <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                              </select>
                            </td>
                          </tr>
                        </>
                      )}
                      <tr>
                        <th>边框线型</th>
                        <td>
                          <select value={frame.strokeStyle} onChange={(event) => setStateIconFramePatch({ strokeStyle: event.target.value })}>
                            <option value="solid">实线</option>
                            <option value="dashed">虚线</option>
                            <option value="dotted">点线</option>
                          </select>
                        </td>
                      </tr>
                      <tr>
                        <th>边框线宽</th>
                        <td>
                          <BufferedTextInput
                            type="number"
                            min="0"
                            step={1}
                            inputMode="numeric"
                            value={normalizeStateIconDrawingStrokeWidth(frame.strokeWidth)}
                            onKeyDown={(event) => {
                              if ([".", "-", "+", "e", "E"].includes(event.key)) {
                                event.preventDefault();
                              }
                            }}
                            onCommit={(nextValue) => setStateIconFramePatch({ strokeWidth: normalizeStateIconDrawingStrokeWidth(nextValue, frame.strokeWidth) })}
                          />
                        </td>
                      </tr>
                      <tr>
                        <th>边框线色</th>
                        <td>
                          <div className="state-icon-drawing-color-field">
                            <DeferredColorInput value={frame.strokeColor} fallback="#94a3b8" onCommit={(value) => setStateIconFramePatch({ strokeColor: value })} />
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <th>背景</th>
                        <td>
                          <div className="state-icon-drawing-color-field">
                            <DeferredColorInput value={frame.fillColor} fallback="#ffffff" onCommit={(value) => setStateIconFramePatch({ fillColor: value })} />
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <th>背景图</th>
                        <td>
                          <div className="state-icon-drawing-background-image-field">
                            <button
                              type="button"
                              onClick={() => {
                                setImagePickerSourceFilter("");
                                setImagePickerCategoryFilter("");
                                setImagePickerSearchQuery("");
                                setImageTarget({ kind: "stateIconFrameBackground" });
                              }}
                            >
                              选择
                            </button>
                            <button type="button" disabled={!frameBackgroundImage} onClick={() => setStateIconFramePatch({ backgroundImage: "", backgroundImageAssetId: "", backgroundImageFit: "cover" })}>清空</button>
                            <span>{frameBackgroundImageAssetId ? "后台已设置" : frameBackgroundImage ? "已设置" : "未设置"}</span>
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <th>显示方式</th>
                        <td>
                          <select value={normalizeImageFitMode(frame.backgroundImageFit)} onChange={(event) => setStateIconFramePatch({ backgroundImageFit: event.target.value })}>
                            {IMAGE_FIT_MODE_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
              {sidePanelTab === "selected" && (
                <div className="state-icon-drawing-properties state-icon-drawing-tab-panel" role="tabpanel">
                {(() => {
                  const selectedElementIds = stateIconDrawingSelectedIds(stateIconDrawingDialog);
                  const selectedElements = stateIconDrawingDialog.elements.filter((element) => selectedElementIds.includes(element.id));
                  const selectedGroupId = String(selectedElements[0]?.groupId ?? "").trim();
                  const selectedIsGroup = selectedElements.length > 1 && Boolean(selectedGroupId) && selectedElements.every((element) => element.groupId === selectedGroupId);
                  if (selectedIsGroup) {
                    return (
                      <div className="state-icon-drawing-group-properties">
                        <div className="state-icon-drawing-property-title">
                          <strong>组合</strong>
                          <span>{selectedElements.length} 个元素</span>
                        </div>
                        <p>当前元素已作为一个组合整体选中。移动、缩放、旋转、删除、复制和粘贴都会作用于整个组合。</p>
                        <button type="button" onClick={ungroupSelectedStateIconElements}>解除组合</button>
                      </div>
                    );
                  }
                  if (selectedElements.length > 1) {
                    return (
                      <div className="state-icon-drawing-group-properties">
                        <div className="state-icon-drawing-property-title">
                          <strong>多选图元</strong>
                          <span>{selectedElements.length} 个元素</span>
                        </div>
                        <p>可将当前选择组合为一个整体操作单元。</p>
                        <button type="button" onClick={groupSelectedStateIconElements}>组合</button>
                      </div>
                    );
                  }
                  const selected = stateIconDrawingDialog.elements.find((element) => element.id === stateIconDrawingDialog.selectedElementId) ?? null;
                  if (!selected) {
                    return <p>选择一个图案后调整属性。</p>;
                  }
                  const visibleStrokeColor = visibleStateIconColor("#2563eb", selected.strokeColor);
                  const visibleTextColor = visibleStateIconColor("#111827", selected.textColor, selected.strokeColor);
                  const isLineShape = STATE_ICON_LINE_SHAPE_KINDS.has(selected.kind);
                  const isClosedShape = STATE_ICON_CLOSED_SHAPE_KINDS.has(selected.kind) || selected.kind === "imported-svg";
                  const fontFamilyValue = selected.fontFamily ?? "Arial, Microsoft YaHei";
                  const baseFontFamilyOptions = Array.isArray(FONT_FAMILY_OPTIONS)
                    ? FONT_FAMILY_OPTIONS
                    : ["Arial", "Microsoft YaHei", "SimSun", "KaiTi", "SimHei"];
                  const fontFamilyOptions = Array.from(new Set([
                    "Arial, Microsoft YaHei",
                    ...baseFontFamilyOptions,
                    fontFamilyValue
                  ].filter(Boolean)));
                  const fontFamilyOptionLabels = {
                    "Arial, Microsoft YaHei": "Arial / 微软雅黑",
                    ...(FONT_FAMILY_OPTION_LABELS ?? {})
                  };
                  return (
                    <>
                      <div className="state-icon-drawing-property-title">
                        <strong>{stateVisualShapeLabel(selected.kind)}</strong>
                        <span>{stateIconDrawingSelectedIds(stateIconDrawingDialog).length > 1 ? `${stateIconDrawingSelectedIds(stateIconDrawingDialog).length} 个元素` : "选中元素"}</span>
                      </div>
                      <table className="state-icon-drawing-property-table">
                        <tbody>
                        <tr>
                          <th>X</th>
                          <td><BufferedTextInput type="number" step="0.01" value={formatStateIconDrawingNumber(selected.x)} onCommit={(nextValue) => updateStateIconDrawingElement(selected.id, { x: Number(nextValue) || 0 })} /></td>
                        </tr>
                        <tr>
                          <th>Y</th>
                          <td><BufferedTextInput type="number" step="0.01" value={formatStateIconDrawingNumber(selected.y)} onCommit={(nextValue) => updateStateIconDrawingElement(selected.id, { y: Number(nextValue) || 0 })} /></td>
                        </tr>
                        <tr>
                          <th>宽</th>
                          <td><BufferedTextInput type="number" min="1" step="0.01" value={formatStateIconDrawingNumber(selected.width, 1)} onCommit={(nextValue) => updateStateIconDrawingElement(selected.id, { width: Math.max(1, Number(nextValue) || 1) })} /></td>
                        </tr>
                        <tr>
                          <th>高</th>
                          <td><BufferedTextInput type="number" min="1" step="0.01" value={formatStateIconDrawingNumber(selected.height, 1)} onCommit={(nextValue) => updateStateIconDrawingElement(selected.id, { height: Math.max(1, Number(nextValue) || 1) })} /></td>
                        </tr>
                        <tr>
                          <th>角度</th>
                          <td><BufferedTextInput type="number" step="0.01" value={formatStateIconDrawingNumber(selected.rotation)} onCommit={(nextValue) => updateStateIconDrawingElement(selected.id, { rotation: Number(nextValue) || 0 })} /></td>
                        </tr>
                        <tr>
                          <th>粗细</th>
                          <td>
                            <BufferedTextInput
                              type="number"
                              min="0"
                              step={1}
                              inputMode="numeric"
                              value={normalizeStateIconDrawingStrokeWidth(selected.strokeWidth)}
                              onKeyDown={(event) => {
                                if ([".", "-", "+", "e", "E"].includes(event.key)) {
                                  event.preventDefault();
                                }
                              }}
                              onCommit={(nextValue) => updateStateIconDrawingElement(selected.id, { strokeWidth: normalizeStateIconDrawingStrokeWidth(nextValue, selected.strokeWidth) })}
                            />
                          </td>
                        </tr>
                        <tr>
                          <th>线型</th>
                          <td>
                            <select value={selected.strokeStyle ?? "solid"} onChange={(event) => updateStateIconDrawingElement(selected.id, { strokeStyle: event.target.value })}>
                              <option value="solid">实线</option>
                              <option value="dashed">虚线</option>
                              <option value="dotted">点线</option>
                            </select>
                          </td>
                        </tr>
                        <tr>
                          <th>所属端子</th>
                          <td>
                            <select
                              value={Number.isInteger(selected.terminalIndex) && selected.terminalIndex >= 0 ? String(selected.terminalIndex) : ""}
                              onChange={(event) => updateStateIconDrawingElement(selected.id, stateIconDrawingTerminalPatch(event.target.value))}
                            >
                              <option value="">无</option>
                              {stateIconDrawingTerminalOptions.map((option) => (
                                <option key={option.index} value={option.index}>
                                  {option.index + 1}. {option.label}
                                </option>
                              ))}
                            </select>
                          </td>
                        </tr>
                        <tr>
                          <th>线色</th>
                          <td>
                            <div className="state-icon-drawing-color-field">
                              <DeferredColorInput value={visibleStrokeColor} fallback="#2563eb" onCommit={(value) => updateStateIconDrawingElement(selected.id, { strokeColor: value })} />
                            </div>
                          </td>
                        </tr>
                        {isLineShape && (
                          <>
                            <tr>
                              <th>起点端型</th>
                              <td>
                                <select value={selected.startCap ?? "none"} onChange={(event) => updateStateIconDrawingElement(selected.id, { startCap: event.target.value })}>
                                  {STATE_ICON_LINE_CAP_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                                </select>
                              </td>
                            </tr>
                            <tr>
                              <th>终点端型</th>
                              <td>
                                <select value={selected.endCap ?? "none"} onChange={(event) => updateStateIconDrawingElement(selected.id, { endCap: event.target.value })}>
                                  {STATE_ICON_LINE_CAP_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                                </select>
                              </td>
                            </tr>
                          </>
                        )}
                        {isClosedShape && (
                          <tr>
                            <th>填充</th>
                            <td>
                              <div className="state-icon-drawing-color-field">
                                <DeferredColorInput value={selected.fillColor} fallback="#ffffff" onCommit={(value) => updateStateIconDrawingElement(selected.id, { fillColor: value })} />
                              </div>
                            </td>
                          </tr>
                        )}
                        {selected.kind === "text" && (
                          <>
                            <tr>
                              <th>文字</th>
                              <td><BufferedTextInput value={selected.text} onCommit={(nextValue) => updateStateIconDrawingElement(selected.id, { text: nextValue })} /></td>
                            </tr>
                            <tr>
                              <th>文本颜色</th>
                              <td>
                                <div className="state-icon-drawing-color-field">
                                  <DeferredColorInput value={visibleTextColor} fallback="#111827" onCommit={(value) => updateStateIconDrawingElement(selected.id, { textColor: value })} />
                                </div>
                              </td>
                            </tr>
                            <tr>
                              <th>字体</th>
                              <td>
                                <select value={fontFamilyValue} onChange={(event) => updateStateIconDrawingElement(selected.id, { fontFamily: event.target.value })}>
                                  {fontFamilyOptions.map((fontFamily) => (
                                    <option key={fontFamily} value={fontFamily} style={{ fontFamily }}>
                                      {fontFamilyOptionLabels[fontFamily] ?? fontFamily}
                                    </option>
                                  ))}
                                </select>
                              </td>
                            </tr>
                            <tr>
                              <th>字号</th>
                              <td>
                                <BufferedTextInput
                                  type="number"
                                  min={STATE_ICON_DRAWING_MIN_FONT_SIZE}
                                  step={1}
                                  inputMode="numeric"
                                  value={normalizeStateIconDrawingFontSize(selected.fontSize ?? selected.height)}
                                  onKeyDown={(event) => {
                                    if ([".", "-", "+", "e", "E"].includes(event.key)) {
                                      event.preventDefault();
                                    }
                                  }}
                                  onCommit={(nextValue) => updateStateIconDrawingElement(selected.id, {
                                    fontSize: normalizeStateIconDrawingFontSize(nextValue, selected.fontSize ?? selected.height)
                                  })}
                                />
                              </td>
                            </tr>
                            <tr>
                              <th>字重</th>
                              <td>
                                <select value={String(selected.fontWeight ?? "800")} onChange={(event) => updateStateIconDrawingElement(selected.id, { fontWeight: event.target.value })}>
                                  <option value="400">常规</option>
                                  <option value="700">加粗</option>
                                  <option value="800">特粗</option>
                                </select>
                              </td>
                            </tr>
                            <tr>
                              <th>字型</th>
                              <td>
                                <select value={selected.fontStyle ?? "normal"} onChange={(event) => updateStateIconDrawingElement(selected.id, { fontStyle: event.target.value })}>
                                  <option value="normal">常规</option>
                                  <option value="italic">斜体</option>
                                </select>
                              </td>
                            </tr>
                          </>
                        )}
                        {selected.kind === "image" && (
                          <>
                            <tr>
                              <th>图片显示方式</th>
                              <td>
                                <select value={normalizeImageFitMode(selected.imageFit)} onChange={(event) => updateStateIconDrawingElement(selected.id, { imageFit: event.target.value })}>
                                  {IMAGE_FIT_MODE_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                  ))}
                                </select>
                              </td>
                            </tr>
                            <tr>
                              <th>图片缩放</th>
                              <td><BufferedTextInput type="number" min="0.05" step="0.01" value={formatStateIconDrawingNumber(selected.imageScale ?? 1, 1)} onCommit={(nextValue) => updateStateIconDrawingElement(selected.id, { imageScale: Math.max(0.05, Number(nextValue) || 0.05) })} /></td>
                            </tr>
                            <tr>
                              <th>裁剪X</th>
                              <td><BufferedTextInput type="number" step="0.01" value={formatStateIconDrawingNumber(selected.cropX ?? 0)} onCommit={(nextValue) => updateStateIconDrawingElement(selected.id, { cropX: Number(nextValue) || 0 })} /></td>
                            </tr>
                            <tr>
                              <th>裁剪Y</th>
                              <td><BufferedTextInput type="number" step="0.01" value={formatStateIconDrawingNumber(selected.cropY ?? 0)} onCommit={(nextValue) => updateStateIconDrawingElement(selected.id, { cropY: Number(nextValue) || 0 })} /></td>
                            </tr>
                          </>
                        )}
                        </tbody>
                      </table>
                    </>
                  );
                })()}
              </div>
              )}
            </div>
          </div>
        </div>
      );
    };
    return (
      <section className={`device-state-pager ${hideDefaultPage ? "hide-default-state" : ""}`} aria-label="状态分页">
        {renderStateIconDrawingLibrary()}
        {isDefaultStatePage || activeRow ? (
          <>
            {renderStateIconDrawingInline()}
            <div className="custom-device-actions device-state-actions">
              {handlers.saveStateVisuals && <button type="button" onClick={handlers.saveStateVisuals}>{handlers.saveStateVisualsLabel ?? "保存状态样式"}</button>}
              {handlers.reset && <button type="button" onClick={handlers.reset}>{handlers.resetLabel ?? "恢复状态页"}</button>}
            </div>
            {renderStateIconDrawingContextMenu()}
          </>
        ) : (
          <div className="device-state-empty">
            <span>暂无状态分页</span>
            <button type="button" onClick={handlers.add}>新增状态</button>
          </div>
        )}
      </section>
    );
  };
}

export function createRenderDeviceDefinitionVisualPanel(__appScope: Record<string, any>) {
  return (template: DeviceTemplate) => {
  const { BufferedTextInput, CUSTOM_DEVICE_TERMINAL_ANCHOR_GUIDE_LABELS, CUSTOM_DEVICE_TERMINAL_ANCHOR_GUIDE_VALUES, CUSTOM_DEVICE_TERMINAL_ANCHOR_PRECISION, DEFAULT_STATE_PAGE_ID, Fragment, MemoDeviceGlyph, SvgMarkupChunk, TERMINAL_TYPE_LIBRARY_LABELS, addDefinitionStateDraftRow, button, circle, colorDisplayMode, colorPalette, createDefinitionStateDraftRows, createDefinitionVisualDraft, createNodeFromTemplate, customDeviceTerminalAnchorValue, definitionDraftError, definitionStateDraftRows, definitionStatePageId, definitionStatePreviewVisual, definitionTemplateIconInputRef, definitionTerminalAnchorDragIndex, definitionTerminalConnectorSegment, definitionVisualDraft, definitionVisualPreviewHeight, definitionVisualPreviewImage, definitionVisualPreviewWidth, definitionVisualTerminalAnchors, definitionVisualTerminalTypes, deleteDefinitionStateDraftRow, div, formatCustomDeviceTerminalAnchorValue, formatSvgNumber, g, image, isBusNode, isDefaultStatePageId, isStaticNode, label, line, nodeForegroundImage, nodeGeometryTransform, nodeImageContentTransform, openStateIconDrawingDialog, p, rect, renderStateVisualPager, resolveNodeStateVisual, saveDeviceDefinitionStateVisualDraft, saveDeviceDefinitionVisualDraft, section, setDefinitionDraftError, setDefinitionStateDraftRows, setDefinitionStatePageId, setDefinitionTerminalAnchorDragIndex, setDefinitionVisualDraft, setStateImageUploadTarget, small, span, stateVisualImageInputRef, strong, svgImageContentMarkup, terminalColor, text, title, updateDefinitionStateDraftRow, updateDefinitionTerminalAnchor, updateDefinitionTerminalAnchorFromPreview } = __appScope;
    if (!definitionVisualDraft) {
      return null;
    }
    const visualTemplate: DeviceTemplate = {
      ...template,
      size: definitionVisualDraft.size,
      params: {
        ...template.params,
        ...(definitionStatePreviewVisual?.value !== undefined && definitionStatePreviewVisual.value !== "" ? { status: definitionStatePreviewVisual.value } : {}),
        backgroundImage: "",
        backgroundImageAssetId: ""
      },
      terminalType: definitionVisualTerminalTypes[0] ?? template.terminalType,
      terminalCount: definitionVisualDraft.terminalCount,
      terminalTypes: definitionVisualTerminalTypes,
      terminalLabels: definitionVisualDraft.terminalLabels.slice(0, definitionVisualDraft.terminalCount),
      terminalAnchors: definitionVisualTerminalAnchors,
      stateDefinitions: definitionStateDraftRows
    };
    const previewNode = createNodeFromTemplate(visualTemplate, { x: 0, y: 0 });
    const previewFrameNode = {
      ...previewNode,
      size: { width: definitionVisualPreviewWidth, height: definitionVisualPreviewHeight }
    };
    const definitionDefaultStateSelected = isDefaultStatePageId(definitionStatePageId);
    const renderDefinitionVisualPreviewContent = (clipId: string) => {
      const previewStateVisual = definitionStatePreviewVisual ?? resolveNodeStateVisual(previewFrameNode);
      const previewImageHref = definitionVisualPreviewImage;
      const previewForegroundHref = nodeForegroundImage(previewFrameNode);
      const previewIsBus = isBusNode(previewFrameNode);
      const previewIsStatic = isStaticNode(previewFrameNode);
      const previewUsesStateImage = Boolean(
        definitionStatePreviewVisual?.image ||
        definitionStatePreviewVisual?.imageAssetId ||
        definitionStatePreviewVisual?.backgroundImage ||
        definitionStatePreviewVisual?.backgroundImageAssetId
      );
      const previewImageFit = normalizeImageFitMode(
        previewUsesStateImage
          ? (previewStateVisual?.imageFit ?? previewStateVisual?.backgroundImageFit ?? "fixed")
          : definitionVisualDraft.backgroundImageFit
      );
      return (
        <>
          {!previewIsBus && (previewImageHref || previewForegroundHref) && (
            <clipPath id={clipId}>
              <rect
                x={-previewFrameNode.size.width / 2}
                y={-previewFrameNode.size.height / 2}
                width={previewFrameNode.size.width}
                height={previewFrameNode.size.height}
                rx="8"
              />
            </clipPath>
          )}
          <g className="node-geometry" transform={nodeGeometryTransform(previewFrameNode)}>
            <MemoDeviceGlyph node={previewFrameNode} mode="geometry" colorDisplayMode={colorDisplayMode} colorPalette={colorPalette} stateVisual={previewStateVisual} />
            <MemoDeviceGlyph node={previewFrameNode} mode="text" colorDisplayMode={colorDisplayMode} colorPalette={colorPalette} stateVisual={previewStateVisual} />
          </g>
          {!previewIsBus && (previewImageHref || previewForegroundHref) && (
            <g className="node-upright-content" transform={nodeImageContentTransform(previewFrameNode)}>
              {previewImageHref && previewIsStatic && (
                <SvgMarkupChunk
                  className="node-background-image-markup"
                  markup={svgImageContentMarkup(previewImageHref, {
                    x: -previewFrameNode.size.width / 2,
                    y: -previewFrameNode.size.height / 2,
                    width: previewFrameNode.size.width,
                    height: previewFrameNode.size.height,
                    imageFit: previewImageFit,
                    clipPath: `url(#${clipId})`,
                    className: "node-background-image"
                  })}
                />
              )}
              {previewImageHref && !previewIsStatic && (
                <rect
                  x={-previewFrameNode.size.width / 2}
                  y={-previewFrameNode.size.height / 2}
                  width={previewFrameNode.size.width}
                  height={previewFrameNode.size.height}
                  rx="8"
                  className={`node-image-cover ${previewFrameNode.terminals.length > 0 ? "terminal-reserved-area" : ""}`}
                />
              )}
              {previewImageHref && !previewIsStatic && (
                <SvgMarkupChunk
                  className="node-background-image-markup"
                  markup={svgImageContentMarkup(previewImageHref, {
                    x: -previewFrameNode.size.width / 2,
                    y: -previewFrameNode.size.height / 2,
                    width: previewFrameNode.size.width,
                    height: previewFrameNode.size.height,
                    imageFit: previewImageFit,
                    clipPath: `url(#${clipId})`,
                    className: "node-background-image"
                  })}
                />
              )}
              {previewForegroundHref && (
                <SvgMarkupChunk
                  className="node-foreground-image-markup"
                  markup={svgImageContentMarkup(previewForegroundHref, {
                    x: -previewFrameNode.size.width / 2,
                    y: -previewFrameNode.size.height / 2,
                    width: previewFrameNode.size.width,
                    height: previewFrameNode.size.height,
                    imageFit: previewImageFit,
                    clipPath: `url(#${clipId})`,
                    className: "node-foreground-image"
                  })}
                />
              )}
            </g>
          )}
        </>
      );
    };
    return (
      <section className="device-definition-visual-panel">
        {definitionVisualDraft.error && <p className="custom-device-error">{definitionVisualDraft.error}</p>}
        {definitionDraftError && <p className="custom-device-error">{definitionDraftError}</p>}
        {renderStateVisualPager(definitionStateDraftRows, definitionStatePageId, setDefinitionStatePageId, {
          update: updateDefinitionStateDraftRow,
          add: addDefinitionStateDraftRow,
          remove: deleteDefinitionStateDraftRow,
          saveStateVisuals: saveDeviceDefinitionStateVisualDraft,
          saveStateVisualsLabel: "保存状态样式",
          drawingScope: "definition",
          definitionTemplate: template,
          reset: () => {
            const stateRows = createDefinitionStateDraftRowsWithDefaultImages(__appScope, template);
            setDefinitionStateDraftRows(stateRows);
            setDefinitionStatePageId(DEFAULT_STATE_PAGE_ID);
            setDefinitionDraftError("");
          },
          resetLabel: "恢复状态分页"
        })}
        {definitionDefaultStateSelected && (
          <div className="device-definition-default-toolbar">
            <div className="custom-device-image-row device-definition-image-row">
              <span>SVG/图片图标</span>
              <button type="button" onClick={() => definitionTemplateIconInputRef.current?.click()}>上传到后台</button>
              <button
                type="button"
                onClick={() =>
                  setDefinitionVisualDraft((current) =>
                    current
                      ? {
                          ...current,
                          backgroundImage: "",
                          backgroundImageAssetId: "",
                          backgroundImageFit: "cover",
                          error: ""
                        }
                      : current
                  )
                }
              >
                清除
              </button>
              <strong>{definitionVisualDraft.backgroundImageAssetId ? "后台已保存" : definitionVisualDraft.backgroundImage ? "已设置" : "默认图形"}</strong>
            </div>
            <div className="custom-device-image-row device-definition-image-row">
              <span>图标显示方式</span>
              <select value={normalizeImageFitMode(definitionVisualDraft.backgroundImageFit)} onChange={(event) =>
                setDefinitionVisualDraft((current) => current ? { ...current, backgroundImageFit: event.target.value, error: "" } : current)
              }>
                {IMAGE_FIT_MODE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <div className="device-definition-size-grid">
              <label>
                宽度
                <BufferedTextInput
                  type="number"
                  min="1"
                  value={definitionVisualDraft.size.width}
                  onCommit={(value) =>
                    setDefinitionVisualDraft((current) =>
                      current
                        ? {
                            ...current,
                            size: { ...current.size, width: Math.max(1, Math.round(Number(value) || current.size.width)) },
                            error: ""
                          }
                        : current
                    )
                  }
                />
              </label>
              <label>
                高度
                <BufferedTextInput
                  type="number"
                  min="1"
                  value={definitionVisualDraft.size.height}
                  onCommit={(value) =>
                    setDefinitionVisualDraft((current) =>
                      current
                        ? {
                            ...current,
                            size: { ...current.size, height: Math.max(1, Math.round(Number(value) || current.size.height)) },
                            error: ""
                          }
                        : current
                    )
                  }
                />
              </label>
              <span>端子拖放到元件四周边框。</span>
            </div>
            <div className="custom-device-actions device-definition-visual-actions">
              <button type="button" onClick={saveDeviceDefinitionVisualDraft}>保存图标和端子</button>
              <button
                type="button"
                onClick={() => {
                  const stateRows = createDefinitionStateDraftRowsWithDefaultImages(__appScope, template);
                  setDefinitionVisualDraft(clearGeneratedDefinitionVisualDraftImage(template, createDefinitionVisualDraft(template)));
                  setDefinitionStateDraftRows(stateRows);
                  setDefinitionStatePageId(DEFAULT_STATE_PAGE_ID);
                  setDefinitionDraftError("");
                }}
              >
                恢复当前元件状态
              </button>
            </div>
          </div>
        )}
        {definitionVisualDraft.terminalCount > 0 && <div className="custom-terminal-grid device-definition-terminal-grid">
          {Array.from({ length: definitionVisualDraft.terminalCount }).map((_, index) => {
            const terminalType = definitionVisualDraft.terminalTypes[index] ?? template.terminalType;
            const terminalAnchor = definitionVisualTerminalAnchors[index] ?? { x: 0, y: 0 };
            return (
              <label key={index}>
                {`端子${index + 1}`}
                <strong>{TERMINAL_TYPE_LIBRARY_LABELS[terminalType] ?? terminalType}</strong>
                <span>端子位置</span>
                <div className="custom-terminal-anchor-inputs">
                  <span>X</span>
                  <BufferedTextInput
                    type="number"
                    min="-0.5"
                    max="0.5"
                    step="0.01"
                    value={formatCustomDeviceTerminalAnchorValue(terminalAnchor.x)}
                    onCommit={(value) => updateDefinitionTerminalAnchor(index, { x: Number(value) })}
                    aria-label={`修改元件端子${index + 1} X位置`}
                  />
                  <span>Y</span>
                  <BufferedTextInput
                    type="number"
                    min="-0.5"
                    max="0.5"
                    step="0.01"
                    value={formatCustomDeviceTerminalAnchorValue(terminalAnchor.y)}
                    onCommit={(value) => updateDefinitionTerminalAnchor(index, { y: Number(value) })}
                    aria-label={`修改元件端子${index + 1} Y位置`}
                  />
                </div>
              </label>
            );
          })}
        </div>}
      </section>
    );
  };
}

export function createRenderGraphTemplatePreview(__appScope: Record<string, any>) {
  return (template: GraphTemplate) => {
  const { MemoDeviceGlyph, canvasClipboardBounds, colorPalette, g, nodeGeometryTransform, path, pointsToPreviewPath, rect, resolveNodeStateVisual, svg } = __appScope;
    const bounds = canvasClipboardBounds(template.clipboard);
    if (!bounds) {
      return (
        <svg viewBox="0 0 80 56" aria-hidden="true" className="template-preview-svg">
          <rect x="8" y="10" width="64" height="36" rx="6" fill="#f8fafc" stroke="#cbd5e1" />
        </svg>
      );
    }
    const padding = 8;
    const width = Math.max(1, bounds.right - bounds.left + padding * 2);
    const height = Math.max(1, bounds.bottom - bounds.top + padding * 2);
    return (
      <svg
        viewBox={`${bounds.left - padding} ${bounds.top - padding} ${width} ${height}`}
        aria-hidden="true"
        className="template-preview-svg"
      >
        {template.clipboard.edges.map((item) => (
          <path
            key={item.edge.id}
            d={pointsToPreviewPath(item.routePoints)}
            fill="none"
            stroke="#64748b"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
        {template.clipboard.nodes.map((node) => (
          <g key={node.id} transform={`translate(${node.position.x} ${node.position.y})`}>
            <g transform={nodeGeometryTransform(node)}>
              <MemoDeviceGlyph node={node} miniature colorPalette={colorPalette} stateVisual={resolveNodeStateVisual(node)} />
            </g>
          </g>
        ))}
      </svg>
    );
  };
}

export function createRenderLibraryTemplateButton(__appScope: Record<string, any>) {
  return (item: DeviceTemplate, section: string) => {
  const { MemoDeviceGlyph, SvgMarkupChunk, button, cancelLibraryPlacement, clipPath, colorPalette, componentLibraryDisplayMode, createNodeFromTemplate, defs, formatSvgNumber, g, hideLibraryFlyout, image, isBrowseMode, isBusNode, isEditMode, libraryPreviewByKind, modelType, nodeForegroundImage, nodeGeometryTransform, nodeImage, nodeImageContentTransform, rect, resolveNodeStateVisual, startLibraryDevicePlacement, svg, svgImageContentMarkup } = __appScope;
    const modelTypeFailureMessage = modelAssociationDeviceModelTypeFailureMessage(modelType, item.kind);
    const preview = libraryPreviewByKind.get(item.kind) ?? createNodeFromTemplate(item, { x: 0, y: 0 });
    const libraryPreviewImageHref = nodeImage(preview);
    const libraryPreviewForegroundHref = nodeForegroundImage(preview);
    const libraryPreviewHasImage = !isBusNode(preview) && Boolean(libraryPreviewImageHref || libraryPreviewForegroundHref);
    const previewRotation = ((Math.round(preview.rotation) % 360) + 360) % 360;
    const fallbackPreviewViewBox = previewRotation === 90 || previewRotation === 270 ? "-48 -48 96 96" : "-40 -28 80 56";
    const imagePreviewWidth = Math.max(80, preview.size.width + 16);
    const imagePreviewHeight = Math.max(56, preview.size.height + 16);
    const previewViewBox = libraryPreviewHasImage
      ? `${formatSvgNumber(-imagePreviewWidth / 2)} ${formatSvgNumber(-imagePreviewHeight / 2)} ${formatSvgNumber(imagePreviewWidth)} ${formatSvgNumber(imagePreviewHeight)}`
      : fallbackPreviewViewBox;
    const libraryPreviewClipId = `library-preview-clip-${item.kind.replace(/[^A-Za-z0-9_-]/g, "-")}`;
    return (
      <button
        key={item.kind}
        className="library-item"
        draggable={isEditMode && !modelTypeFailureMessage}
        disabled={isBrowseMode || Boolean(modelTypeFailureMessage)}
        title={`${item.label} / ${section}${modelTypeFailureMessage ? `（${modelTypeFailureMessage}）` : ""}`}
        onClick={() => startLibraryDevicePlacement(item)}
        onContextMenu={(event) => {
          event.preventDefault();
          cancelLibraryPlacement();
        }}
        onDragStart={(event) => {
          if (!isEditMode || modelTypeFailureMessage) {
            event.preventDefault();
            return;
          }
          cancelLibraryPlacement();
          event.dataTransfer.setData("application/device-kind", item.kind);
          if (componentLibraryDisplayMode === "right") {
            hideLibraryFlyout();
          }
        }}
      >
        <svg viewBox={previewViewBox} aria-hidden="true">
          {libraryPreviewHasImage && (
            <defs>
              <clipPath id={libraryPreviewClipId}>
                <rect
                  x={-preview.size.width / 2}
                  y={-preview.size.height / 2}
                  width={preview.size.width}
                  height={preview.size.height}
                  rx="8"
                />
              </clipPath>
            </defs>
          )}
          {!libraryPreviewHasImage && (
            <g transform={nodeGeometryTransform(preview)}>
              <MemoDeviceGlyph node={preview} miniature colorPalette={colorPalette} stateVisual={resolveNodeStateVisual(preview)} />
            </g>
          )}
          {libraryPreviewHasImage && (
            <g className="library-preview-image-wrap" transform={nodeImageContentTransform(preview)}>
              {libraryPreviewImageHref && (
                <SvgMarkupChunk
                  className="library-preview-image-markup"
                  markup={svgImageContentMarkup(libraryPreviewImageHref, {
                    x: -preview.size.width / 2,
                    y: -preview.size.height / 2,
                    width: preview.size.width,
                    height: preview.size.height,
                    preserveAspectRatio: "xMidYMid meet",
                    clipPath: `url(#${libraryPreviewClipId})`,
                    className: "library-preview-image"
                  })}
                />
              )}
              {libraryPreviewForegroundHref && (
                <SvgMarkupChunk
                  className="library-preview-image-markup"
                  markup={svgImageContentMarkup(libraryPreviewForegroundHref, {
                    x: -preview.size.width / 2,
                    y: -preview.size.height / 2,
                    width: preview.size.width,
                    height: preview.size.height,
                    preserveAspectRatio: "xMidYMid meet",
                    clipPath: `url(#${libraryPreviewClipId})`,
                    className: "library-preview-image library-preview-foreground-image"
                  })}
                />
              )}
            </g>
          )}
        </svg>
      </button>
    );
  };
}

export function createRenderLibraryFlyout(__appScope: Record<string, any>) {
  return (flyoutListKey: string, componentLibraryKey: string, group: CategoryLibrary, typeGroup: CategoryLibraryComponentLibraryGroup) => {
  const { clearLibraryFlyoutCloseTimer, createPortal, div, libraryFlyoutStyle, renderLibraryTemplateButton, scheduleLibraryFlyoutClose, setHoveredCategoryLibrary, setHoveredCategoryLibraryComponentLibrary, setLibraryComponentListRef } = __appScope;
    const flyout = (
      <div
        className="library-group flyout-library-group"
        ref={setLibraryComponentListRef(flyoutListKey)}
        style={libraryFlyoutStyle(flyoutListKey)}
        onMouseEnter={() => {
          clearLibraryFlyoutCloseTimer();
          setHoveredCategoryLibrary(group);
          setHoveredCategoryLibraryComponentLibrary(componentLibraryKey);
        }}
        onMouseLeave={() => scheduleLibraryFlyoutClose(group, componentLibraryKey)}
      >
        {typeGroup.templates.map((item) => renderLibraryTemplateButton(item, typeGroup.section))}
      </div>
    );
    if (typeof document === "undefined") {
      return flyout;
    }
    return createPortal(flyout, document.body);
  };
}

export function createLodNodeFromEvent(__appScope: Record<string, any>) {
  return (event: PointerEvent<SVGGElement> | MouseEvent<SVGGElement>) => {
  const { nodeById } = __appScope;
    const target = event.target instanceof Element
      ? event.target.closest(".lod-node[data-node-id]")
      : null;
    const nodeId = target?.getAttribute("data-node-id") ?? "";
    return nodeId ? nodeById.get(nodeId) : undefined;
  };
}

export function createLodTerminalIdFromEvent(__appScope: Record<string, any>) {
  return (event: PointerEvent<SVGGElement> | MouseEvent<SVGGElement>) => {
    const target = event.target instanceof Element
      ? event.target.closest("[data-terminal-id]")
      : null;
    return target?.closest(".lod-node[data-node-id]") ? target.getAttribute("data-terminal-id") ?? "" : "";
  };
}

export function createHandleLodNodePointerDown(__appScope: Record<string, any>) {
  return (event: PointerEvent<SVGGElement>) => {
  const { handleNodePointerDown, handleRoutableLineNodePointerDown, handleTerminalPointerDown, isRoutableLineDeviceKind, lodNodeFromEvent, lodTerminalIdFromEvent } = __appScope;
    const node = lodNodeFromEvent(event);
    if (node) {
      const terminalId = lodTerminalIdFromEvent(event);
      if (event.button === 0 && terminalId) {
        handleTerminalPointerDown(event as unknown as PointerEvent<SVGCircleElement>, node, terminalId);
        return;
      }
      if (isRoutableLineDeviceKind(node.kind)) {
        handleRoutableLineNodePointerDown(event, node);
        return;
      }
      handleNodePointerDown(event, node);
    }
  };
}

export function createHandleLodNodeContextMenu(__appScope: Record<string, any>) {
  return (event: MouseEvent<SVGGElement>) => {
  const { activeLayerNodeIdSet, canvasInteractionRef, clampPointToCanvas, connectSource, isRoutableLineDeviceKind, lastCanvasPointerRef, lodNodeFromEvent, openGraphicContextMenu, projectListPointerInsideRef, resetConnectPreviewState, resetRoutableLinePreviewState, routableLineDeviceCanvasPoints, routableLinePlacement, screenToSvgPoint, selectCanvasGraphics, selectedNodeIdSet, setConnectSource, setMode, setRoutableLinePlacement, svgRef, updateMouseStatus } = __appScope;
    const node = lodNodeFromEvent(event);
    if (!node) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    if (!activeLayerNodeIdSet.has(node.id)) {
      return;
    }
    canvasInteractionRef.current = true;
    projectListPointerInsideRef.current = false;
    let pointer: Point | undefined;
    if (svgRef.current) {
      pointer = clampPointToCanvas(screenToSvgPoint(svgRef.current, event.clientX, event.clientY));
      lastCanvasPointerRef.current = pointer;
      updateMouseStatus(pointer);
    }
    if (connectSource) {
      setConnectSource(null);
      resetConnectPreviewState();
      setMode("select");
      return;
    }
    if (routableLinePlacement) {
      setRoutableLinePlacement(null);
      resetRoutableLinePreviewState();
      setMode("select");
      return;
    }
    if (!selectedNodeIdSet.has(node.id)) {
      selectCanvasGraphics([node.id], []);
    }
    openGraphicContextMenu({
      x: event.clientX,
      y: event.clientY,
      target: "node",
      canvasPoint: pointer,
      nodeId: node.id,
      routePoints: isRoutableLineDeviceKind(node.kind) ? routableLineDeviceCanvasPoints(node) : undefined
    });
  };
}
