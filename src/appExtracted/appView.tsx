// @ts-nocheck
import { useCallback, lazy, useEffect, useMemo, useRef, useState } from "react";
import { MemoizedCanvasArea } from "./appCanvasArea";
import { AppLeftPanel } from "./appLeftPanel";
import { AppRightPanel } from "./appRightPanel";
import { AppStatusbar } from "./appStatusbar";
import { AppTopbar } from "./appTopbar";
import { AppResourceDialogs } from "./appResourceDialogs";
import { MemoizedViewSection } from "./appViewRenderBoundary";
import { IMAGE_FIT_MODE_OPTIONS, normalizeImageFitMode } from "../imageFit";
import {
  ICON_LIBRARY_PAGE_SIZE,
  iconLibraryCategoriesForSelection,
  visibleIconLibraryIcons
} from "../iconLibraryCatalog";
import { buildExportDeviceIdMap } from "../svgExportUtils";
import { E_SECTION_COLUMNS, inferESection, resolveEffectiveTemplateParameterDefinitionGroups, templateDerivedComponentLibraryInfo, parseEDeviceDefinitionFile, buildEDeviceRecords, buildEDeviceHeaderParameterRecords, orderEDeviceRecordsForExport, applyEReferenceIdValues, enumSelectOptionsWithCurrentValue, invalidEnumOptionLabel, modelAssociationDevicesModelTypeFailureMessage, DEVICE_LIBRARY, type DeviceTemplate, type DeviceTemplateDefinitionOverride, type EDeviceExport } from "../model";
import { buildEDeviceInterfaceDefinitionRows, orderEDeviceInterfaceFields, applyEDeviceDefinitionSectionsToLibraryState, buildEFileExportOptionsFromLibrary } from "./appDeviceDefinitionFactories";
import { resolveEditableComponentLibraryDefinition } from "../componentLibraryDefinitions";
import type { CustomComponentLibraryDefinition } from "./appCoreCanvasUtilities";
import { decodeAuto } from "../encoding/gbk";
import { UserCustomizationManagerDialog } from "../UserCustomizationManagerDialog";
import { VoltageLevelDialog } from "../VoltageLevelDialog";
import { EFileEditor } from "../EFileEditor";
import { buildUserCustomizationInventory, restoreUserCustomizationItems, type UserCustomizationDomain } from "../userCustomizations";
import { createMeasurementFieldParameterDefinition } from "../measurementDefinitionTypes";
import { moveSelectedTableRows, nextTableRowSelection, uniqueCopiedFieldName } from "../definitionTableSelection";
import { WindowCloseButton } from "../WindowCloseButton";
import { AllNetworkTopologyDialog } from "../AllNetworkTopologyDialog";
import {
  resolveComponentLibraryClassFamilyMetadata,
  resolveComponentLibraryClassMetadata
} from "../componentLibraryMetadata";

const LazyAppContextMenus = lazy(() => import("./appContextMenus")
  .then((module) => ({ default: module.AppContextMenus })));
const LazyAppProjectDialogs = lazy(() => import("./appProjectDialogs")
  .then((module) => ({ default: module.AppProjectDialogs })));
const LazyAppCanvasDialogs = lazy(() => import("./appCanvasDialogs")
  .then((module) => ({ default: module.AppCanvasDialogs })));
const LazyAppDeviceDefinitionDialogs = lazy(() => import("./appDeviceDefinitionDialogs")
  .then((module) => ({ default: module.AppDeviceDefinitionDialogs })));

export type ImagePickerLibraryTab = "image" | "icon";

export function imagePickerAssetIsBuiltinIcon(asset: any) {
  return (
    asset?.createdAt === "builtin" ||
    String(asset?.folderId ?? "") === "builtin-shared-icons" ||
    String(asset?.id ?? "").startsWith("builtin-shared-icon-")
  );
}

export function imagePickerAssetsForLibraryTab(assets: any[] = [], tab: ImagePickerLibraryTab) {
  return (assets ?? []).filter((asset) =>
    tab === "icon" ? imagePickerAssetIsBuiltinIcon(asset) : !imagePickerAssetIsBuiltinIcon(asset)
  );
}

export function imagePickerUsesLibraryTabs(imageTarget: any) {
  return Boolean(imageTarget && imageTarget.kind !== "canvasIcon" && imageTarget.kind !== "stateIconDrawing");
}

export function resolveInspectorTopologyEntry(topology: any, inspectorTopology: any, nodeId: string) {
  return inspectorTopology?.nodes?.[nodeId] ?? topology?.nodes?.[nodeId];
}

export function inspectorTabShowsDevicePanel(inspectorTab: string, hasSelectedNode: boolean) {
  return inspectorTab === "device" && hasSelectedNode;
}

export function voltageBaseSetScopeDeviceCount(
  result: { targetNodeIds?: readonly string[] } | null | undefined
) {
  return result?.targetNodeIds?.length ?? 0;
}

export function resolveDeviceModelPanelParameterKeys(
  eKeys: readonly string[] = [],
  customDefinitions: readonly Record<string, unknown>[] = [],
  fallbackKeys: readonly string[] = [],
  definitionGroups: {
    baseDefinitions?: readonly Record<string, unknown>[];
    derivedDefinitions?: readonly Record<string, unknown>[];
  } = {}
): string[] {
  const baseDefinitions = definitionGroups.baseDefinitions ?? [];
  const derivedDefinitions = definitionGroups.derivedDefinitions ?? [];
  const usesDefinitionGroups = baseDefinitions.length > 0 || derivedDefinitions.length > 0;
  const activeDefinitions = usesDefinitionGroups
    ? [...baseDefinitions, ...derivedDefinitions]
    : customDefinitions;
  const definitionKeys = activeDefinitions
    .map((definition) => String(definition.enName ?? "").trim())
    .filter(Boolean);
  const exportKeyToCustomKey = new Map<string, string>();
  activeDefinitions.forEach((definition) => {
    const customKey = String(definition.enName ?? "").trim();
    const exportKey = String(definition.exportName ?? "").trim();
    if (customKey && exportKey && exportKey !== customKey) {
      exportKeyToCustomKey.set(exportKey, customKey);
    }
  });
  const mergedKeys: string[] = [];
  const appendKey = (key: string) => {
    const normalizedKey = String(key ?? "").trim();
    if (normalizedKey && !mergedKeys.includes(normalizedKey)) {
      mergedKeys.push(normalizedKey);
    }
  };
  if (usesDefinitionGroups) {
    baseDefinitions.forEach((definition) => appendKey(String(definition.enName ?? "")));
    derivedDefinitions.forEach((definition) => appendKey(String(definition.enName ?? "")));
    return mergedKeys;
  }
  eKeys.forEach((key) => appendKey(exportKeyToCustomKey.get(key) ?? key));
  definitionKeys.forEach(appendKey);
  if (eKeys.length > 0) {
    const deviceTypeKey = exportKeyToCustomKey.get("dev_type") ?? "dev_type";
    const existingDeviceTypeIndex = mergedKeys.indexOf(deviceTypeKey);
    if (existingDeviceTypeIndex >= 0) {
      mergedKeys.splice(existingDeviceTypeIndex, 1);
    }
    const nameKey = exportKeyToCustomKey.get("name") ?? "name";
    const nameIndex = mergedKeys.indexOf(nameKey);
    mergedKeys.splice(nameIndex >= 0 ? nameIndex + 1 : 0, 0, deviceTypeKey);
  }
  if (mergedKeys.length > 0) {
    return mergedKeys;
  }
  fallbackKeys.forEach(appendKey);
  return mergedKeys;
}

export function resolveDeviceModelPanelDefinitionGroups(
  selectedTemplate: DeviceTemplate | undefined,
  libraryTemplates: readonly DeviceTemplate[] = DEVICE_LIBRARY,
  customComponentLibraries: readonly CustomComponentLibraryDefinition[] = [],
  deviceDefinitionOverrides: Readonly<Record<string, DeviceTemplateDefinitionOverride>> = {}
) {
  if (!selectedTemplate) {
    return undefined;
  }
  const derivedInfo = templateDerivedComponentLibraryInfo(selectedTemplate);
  const className = String(selectedTemplate.componentClass ?? "").trim() ||
    derivedInfo?.derivedComponentLibrary ||
    inferESection(selectedTemplate.kind, selectedTemplate.params ?? {}) ||
    String(selectedTemplate.kind ?? "").trim();
  const editableClassDefinition = resolveEditableComponentLibraryDefinition({
    className,
    categoryLibraryName: selectedTemplate.categoryLibrary,
    customComponentLibraries,
    templates: libraryTemplates,
    overrides: deviceDefinitionOverrides
  });
  if (editableClassDefinition) {
    return {
      baseDefinitions: editableClassDefinition.effectiveParameterDefinitions,
      derivedDefinitions: []
    };
  }
  return resolveEffectiveTemplateParameterDefinitionGroups(selectedTemplate, libraryTemplates);
}

export function resolveDeviceModelPanelDevType(kind: string, params: Record<string, unknown> = {}): string {
  const derivedInfo = templateDerivedComponentLibraryInfo({ kind, params: params as Record<string, string> });
  return [
    derivedInfo?.derivedComponentLibrary,
    params.derived_component_type,
    inferESection(kind, params as Record<string, string>),
    params.component_type,
    kind
  ].map((value) => String(value ?? "").trim()).find(Boolean) ?? "";
}

export function resolveContainerParameterViewComponentLibrary(
  node: { kind: string; params?: Record<string, string> },
  view?: { kind?: string; componentLibrary?: string } | null
): string {
  const explicitComponentLibrary = String(view?.componentLibrary ?? "").trim();
  if (explicitComponentLibrary) {
    return explicitComponentLibrary;
  }
  return view?.kind === "container" ? inferESection(node.kind, node.params ?? {}) : "";
}

export function buildEDeviceInterfaceDefinitionTree(rows: readonly any[] = [], libraryTemplates: readonly any[] = []) {
  const categories = new Map<string, { key: string; label: string; rows: any[] }>();
  for (const row of rows ?? []) {
    const label = String(row?.categoryLibrary ?? "").trim() || "未分类";
    const key = label.toLowerCase();
    const category = categories.get(key) ?? { key: `category:${key}`, label, rows: [] };
    category.rows.push(row);
    categories.set(key, category);
  }

  // 无模板时回退到原逻辑：用派生类作为子项
  if (!libraryTemplates || libraryTemplates.length === 0) {
    return Array.from(categories.values()).map((category) => {
      const rowByLibrary = new Map(
        category.rows.map((row) => [String(row?.componentLibrary ?? "").trim().toLowerCase(), row])
      );
      const nestedLibraries = new Set<string>();
      const childrenByBaseLibrary = new Map<string, any[]>();
      for (const row of category.rows) {
        const componentLibrary = String(row?.componentLibrary ?? "").trim().toLowerCase();
        const baseComponentLibrary = String(row?.derivedFromComponentLibrary ?? "").trim().toLowerCase();
        if (
          !row?.isDerivedComponentLibrary ||
          !componentLibrary ||
          !baseComponentLibrary ||
          componentLibrary === baseComponentLibrary ||
          !rowByLibrary.has(baseComponentLibrary)
        ) {
          continue;
        }
        nestedLibraries.add(componentLibrary);
        const children = childrenByBaseLibrary.get(baseComponentLibrary) ?? [];
        children.push(row);
        childrenByBaseLibrary.set(baseComponentLibrary, children);
      }
      return {
        key: category.key,
        label: category.label,
        classCount: category.rows.length,
        items: category.rows
          .filter((row) => !nestedLibraries.has(String(row?.componentLibrary ?? "").trim().toLowerCase()))
          .map((row) => ({
            row,
            children: childrenByBaseLibrary.get(String(row?.componentLibrary ?? "").trim().toLowerCase()) ?? []
          }))
      };
    });
  }

  // 有模板时：用模板作为子项（与元件定义树一致）
  const rowByLibrary = new Map<string, any>();
  for (const row of rows ?? []) {
    rowByLibrary.set(String(row?.componentLibrary ?? "").trim().toLowerCase(), row);
  }

  const templatesByComponentLibrary = new Map<string, any[]>();
  for (const template of libraryTemplates ?? []) {
    const derivedInfo = templateDerivedComponentLibraryInfo(template);
    const componentLibrary = derivedInfo?.componentLibrary ?? inferESection(template.kind, template.params ?? {});
    if (!componentLibrary) {
      continue;
    }
    const key = componentLibrary.toLowerCase();
    const list = templatesByComponentLibrary.get(key) ?? [];
    list.push(template);
    templatesByComponentLibrary.set(key, list);
  }

  return Array.from(categories.values()).map((category) => {
    const categoryRows = category.rows.filter((row) => {
      const cl = String(row?.componentLibrary ?? "").trim().toLowerCase();
      return !row?.isDerivedComponentLibrary || !row?.derivedFromComponentLibrary || !rowByLibrary.has(row.derivedFromComponentLibrary.toLowerCase());
    });

    return {
      key: category.key,
      label: category.label,
      classCount: category.rows.length,
      items: categoryRows.map((row) => {
        const cl = String(row?.componentLibrary ?? "").trim().toLowerCase();
        const templates = templatesByComponentLibrary.get(cl) ?? [];
        const children = templates.map((template) => {
          const derivedInfo = templateDerivedComponentLibraryInfo(template);
          const childComponentLibrary = derivedInfo?.derivedComponentLibrary ?? row.componentLibrary;
          const childRow = rowByLibrary.get(String(childComponentLibrary).trim().toLowerCase()) ?? row;
          return {
            row: childRow,
            templateLabel: template.label || template.kind
          };
        }).filter((child, index, arr) => {
          const cl2 = String(child.row?.componentLibrary ?? "").trim().toLowerCase();
          return arr.findIndex((c) => String(c.row?.componentLibrary ?? "").trim().toLowerCase() === cl2) === index;
        });
        // 只有一个子项时提升为二级叶子，不展开
        if (children.length === 1) {
          return { row: children[0].row, children: [] };
        }
        return { row, children };
      })
    };
  });
}

export function resolveEDeviceInterfaceFieldsForDisplay(
  componentLibrary: string,
  fields: readonly any[] = [],
  configuredOrder: readonly string[] = [],
  isDerivedComponentLibrary = false
) {
  return orderEDeviceInterfaceFields(componentLibrary, fields, configuredOrder, isDerivedComponentLibrary);
}

export function moveEDeviceInterfaceFieldOrder(fields: readonly any[] = [], sourceName: string, direction: -1 | 1) {
  const order = (fields ?? []).map((field) => String(field?.sourceName ?? "").trim()).filter(Boolean);
  const currentIndex = order.indexOf(String(sourceName ?? "").trim());
  const targetIndex = currentIndex + direction;
  if (currentIndex < 0 || targetIndex < 0 || targetIndex >= order.length) {
    return order;
  }
  [order[currentIndex], order[targetIndex]] = [order[targetIndex], order[currentIndex]];
  return order;
}

export function eDeviceInterfaceDefinitionSignature(rows: readonly any[] = []) {
  const normalizedRows = (rows ?? []).map((row) => ({
    componentLibrary: String(row?.componentLibrary ?? "").trim(),
    exportEnabled: Boolean(row?.exportEnabled),
    exportName: String(row?.exportName ?? row?.componentLibrary ?? "").trim(),
    fields: (row?.fields ?? [])
      .map((field: any) => ({
        sourceName: String(field?.sourceName ?? "").trim(),
        exportEnabled: Boolean(field?.exportEnabled),
        exportName: String(field?.exportName ?? field?.sourceName ?? "").trim()
      }))
  }));
  normalizedRows.sort((left, right) => left.componentLibrary.localeCompare(right.componentLibrary));
  return JSON.stringify(normalizedRows);
}

export function eDeviceInterfaceClassDefinitionSignature(row: any) {
  if (!row) {
    return "";
  }
  return JSON.stringify({
    componentLibrary: String(row.componentLibrary ?? "").trim(),
    exportEnabled: Boolean(row.exportEnabled),
    exportName: String(row.exportName ?? row.componentLibrary ?? "").trim(),
    fields: (row.fields ?? [])
      .map((field: any) => ({
        sourceName: String(field?.sourceName ?? "").trim(),
        exportEnabled: Boolean(field?.exportEnabled),
        exportName: String(field?.exportName ?? field?.sourceName ?? "").trim()
      }))
  });
}

export function eDeviceInterfaceFieldDefinitionMatches(left: any, right: any) {
  if (!left || !right) {
    return false;
  }
  return (
    String(left.sourceName ?? "").trim() === String(right.sourceName ?? "").trim() &&
    Boolean(left.exportEnabled) === Boolean(right.exportEnabled) &&
    String(left.exportName ?? left.sourceName ?? "").trim() ===
      String(right.exportName ?? right.sourceName ?? "").trim()
  );
}

export function customDeviceDefinitionUsesIconOnly(selection: any, draft: any) {
  return selection?.kind === "component" || Boolean(String(draft?.componentKind ?? "").trim());
}

export function resolveDeviceDefinitionParameterRowsForDisplay<T extends { enName?: unknown }>(
  rows: readonly T[] = [],
  allowedRows?: readonly { enName?: unknown }[] | null,
  options: {
    baseComponentLibrary?: string;
    isDerivedComponentBaseParamName?: (fieldName: unknown, baseComponentLibrary?: string) => boolean;
  } = {}
): T[] {
  if (typeof options.isDerivedComponentBaseParamName === "function") {
    return rows.filter((row) => {
      const enName = String(row.enName ?? "").trim();
      if (!enName) {
        return true;
      }
      return !options.isDerivedComponentBaseParamName?.(enName, options.baseComponentLibrary);
    });
  }
  if (!allowedRows || allowedRows.length === 0) {
    return [...rows];
  }
  const allowedNames = new Set(
    allowedRows.map((row) => String(row.enName ?? "").trim()).filter(Boolean)
  );
  if (allowedNames.size === 0) {
    return [...rows];
  }
  return rows.filter((row) => {
    const enName = String(row.enName ?? "").trim();
    return !enName || allowedNames.has(enName);
  });
}

export function resolveCustomDeviceParameterRowsForDisplay<T extends { enName?: unknown }>(
  defaultRows: readonly T[] = [],
  customRows: readonly T[] = [],
  options: {
    isDerivedComponentLibrary?: boolean;
    baseComponentLibrary?: string;
    isDerivedComponentBaseParamName?: (fieldName: unknown, baseComponentLibrary?: string) => boolean;
  } = {}
): { defaultRows: T[]; customRows: T[] } {
  const isHiddenDerivedBaseRow = (row: T) => {
    const enName = String(row.enName ?? "").trim();
    return Boolean(
      enName &&
        options.isDerivedComponentLibrary &&
        typeof options.isDerivedComponentBaseParamName === "function" &&
        options.isDerivedComponentBaseParamName(enName, options.baseComponentLibrary)
    );
  };
  return {
    defaultRows: defaultRows.filter((row) => !isHiddenDerivedBaseRow(row)),
    customRows: customRows.filter((row) => !isHiddenDerivedBaseRow(row))
  };
}

export function resolveInspectorGraphId(nodes: any[], node: any) {
  return buildExportDeviceIdMap(nodes, new Set<string>()).get(node.id) ?? node.id;
}

// 运行时态 WS 指示灯：open=绿、connecting=黄、closed=灰；收发消息时闪烁一次。
// runtimeWsBlinkSeq 递增 → key 变化 → 重放 blink 动画。
// 悬浮提示「点击复制 clientId」，点击复制当前页面 clientId 到剪贴板。

// 拓扑告警面板内容组件：左侧分类 + 顶部状态Tab + 滚动懒加载列表
const TOPOLOGY_CATEGORIES = [
  { key: "all", label: "全部" },
  { key: "voltage", label: "电压" },
  { key: "capacity", label: "容量" },
  { key: "topology", label: "拓扑" },
  { key: "other", label: "其他" }
] as const;
const TOPOLOGY_LAZY_BATCH = 50;

function TopologyWarningPanelContent(props: {
  allErrors: any[];
  filteredErrors: any[];
  category: string;
  setCategory: (v: any) => void;
  status: string;
  setStatus: (v: any) => void;
  categorize: (type: string) => string;
  isBlocking: (error: any) => boolean;
  displayMessage: (msg: string) => string;
  locateError: (error: any) => void;
}) {
  const { allErrors, filteredErrors, category, setCategory, status, setStatus, categorize, isBlocking, displayMessage, locateError } = props;
  const [renderedCount, setRenderedCount] = useState(TOPOLOGY_LAZY_BATCH);
  const listRef = useRef<HTMLDivElement>(null);

  // 保存每个分类+状态组合的滚动位置
  const scrollPositionsRef = useRef<Map<string, number>>(new Map());
  // 用户是否手动选择了状态Tab（防止自动切换覆盖）
  const explicitStatusRef = useRef(false);

  // 切换分类/状态时重置懒加载计数并恢复滚动位置
  useEffect(() => {
    setRenderedCount(TOPOLOGY_LAZY_BATCH);
    const key = `${category}:${status}`;
    if (listRef.current) {
      listRef.current.scrollTop = scrollPositionsRef.current.get(key) ?? 0;
    }
  }, [category, status]);

  // 合并：分类计数（全量）+ 状态计数（当前分类下），单次遍历
  const { categoryCounts, statusCounts } = useMemo(() => {
    const catCounts: Record<string, number> = { all: allErrors.length, voltage: 0, capacity: 0, topology: 0, other: 0 };
    let curErrors = 0, curWarnings = 0, curTotal = 0;
    for (const error of allErrors) {
      const cat = categorize(error.type);
      catCounts[cat] = (catCounts[cat] || 0) + 1;
      if (category === "all" || cat === category) {
        curTotal++;
        if (isBlocking(error)) curErrors++; else curWarnings++;
      }
    }
    return { categoryCounts: catCounts, statusCounts: { all: curTotal, error: curErrors, warning: curWarnings } };
  }, [allErrors, category, categorize, isBlocking]);

  // 自动切换状态Tab：用户未手动选择时生效
  useEffect(() => {
    if (explicitStatusRef.current) return;
    const target = statusCounts.error > 0 || statusCounts.warning === 0 ? "error" : "warning";
    if (status !== target) setStatus(target);
  }, [statusCounts.error, statusCounts.warning, status, setStatus]);

  // 合并：滚动位置保存 + 懒加载，单个 scroll listener
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const onScroll = () => {
      scrollPositionsRef.current.set(`${category}:${status}`, list.scrollTop);
      if (list.scrollTop + list.clientHeight >= list.scrollHeight - 100) {
        setRenderedCount((c) => c + TOPOLOGY_LAZY_BATCH);
      }
    };
    list.addEventListener("scroll", onScroll, { passive: true });
    return () => list.removeEventListener("scroll", onScroll);
  }, [category, status]);

  const renderedItems = filteredErrors.slice(0, renderedCount);
  const hasMore = renderedCount < filteredErrors.length;

  const handleCategoryChange = (newCategory: string) => {
    explicitStatusRef.current = false;
    setCategory(newCategory);
  };

  const handleStatusChange = (newStatus: string) => {
    explicitStatusRef.current = true;
    setStatus(newStatus);
  };

  return (<>
    <div className="topology-warning-floating-body">
      <nav className="topology-warning-sidebar">
        {TOPOLOGY_CATEGORIES.map((cat) => (
          <button key={cat.key} type="button" className={`topology-warning-category-item${category === cat.key ? " active" : ""}`} onClick={() => handleCategoryChange(cat.key)}>
            <span className="topology-warning-category-label">{cat.label}</span>
            <span className="topology-warning-category-count">{categoryCounts[cat.key] || 0}</span>
          </button>
        ))}
      </nav>
      <div className="topology-warning-content">
        <div className="topology-warning-status-tabs">
          {([["error", "错误"], ["warning", "告警"]] as const).map(([key, label]) => (
            <button key={key} type="button" className={`topology-warning-status-tab${status === key ? " active" : ""}`} onClick={() => handleStatusChange(key)}>
              {label} <span className="topology-warning-tab-count">{statusCounts[key] || 0}</span>
            </button>
          ))}
        </div>
        <div ref={listRef} className="topology-warning-list">
          {renderedItems.length === 0 && <p className="topology-warning-empty">暂无告警</p>}
          {renderedItems.map((error: any, index: number) => {
            const blocking = isBlocking(error);
            return (
              <div key={error.id} className={`topology-warning-item${blocking ? " error" : " warning"}`} onClick={() => locateError(error)}>
                <span className="topology-warning-item-index">{index + 1}</span>
                <button type="button" onClick={(event) => { event.stopPropagation(); locateError(error); }} onDoubleClick={(event) => { event.stopPropagation(); locateError(error); }}>
                  {displayMessage(error.message)}
                </button>
              </div>
            );
          })}
          {hasMore && <div className="topology-warning-sentinel">加载中…</div>}
        </div>
      </div>
    </div>
  </>);
}

export function renderAppView(__appScope: Record<string, any>) {
  const Network = __appScope.Network;
  const { confirmLibraryPackageDialog, closeLibraryPackageDialog, libraryPackageDialogMode, libraryPackageDialogOpen, libraryPackageDialogScope, libraryPackageDialogScopeOptions, openLibraryPackageDialog, requestCloseCustomDeviceDialog, setExpandedDefinitionGroups, setCollapsedDefinitionComponentLibraries, setLibraryPackageDialogMode, setLibraryPackageDialogScope } = __appScope;
  const { subcontrolarea, setSubcontrolarea, modelType, setModelType, substation, setSubstation, feeder, setFeeder, taiqu, setTaiqu } = __appScope;
  const { voltageLevelSettings, setVoltageLevelSettings, voltageLevelDialogOpen, setVoltageLevelDialogOpen } = __appScope;
  const { measurementConfigDialogOpen, closeMeasurementConfigDialog, userCustomizationManagerOpen, setUserCustomizationManagerOpen } = __appScope;
  const { eFileEditorDialogOpen, setEFileEditorDialogOpen } = __appScope;
  const {
    copiedCustomComponentTemplate,
    copyCustomComponentTemplate,
    pasteCustomComponentTemplate,
    exportCustomComponentTemplateSvg,
    openCustomComponentSvgImport,
    customComponentSvgImportInputRef,
    importCustomComponentSvg
  } = __appScope;
  const {
    customDeviceDraftHasUnsavedChanges,
    customDeviceUnsavedPrompt,
    requestCustomDeviceDialogView,
    requestCustomDeviceDraftAction,
    resolveCustomDeviceUnsavedPrompt
  } = __appScope;
  const [voltageTab, setVoltageTab] = useState<"ac" | "dc">("ac");
  const { ALLOW_RESIZE_TRANSFORM_PARAM, AlignCenterHorizontal, AlignCenterVertical, AlignEndHorizontal, AlignEndVertical, AlignHorizontalDistributeCenter, AlignStartHorizontal, AlignStartVertical, AlignVerticalDistributeCenter, ArrowDown, ArrowUp, Bell, Bold, BoxSelect, BufferedTextInput, BufferedTextarea, CANVAS_MINIMAP_HEIGHT, CANVAS_MINIMAP_WIDTH, CONNECTION_REDRAW_SCOPE_LABELS, CONTAINER_TERMINAL_ASSOCIATION_OPTIONS, CURRENT_UNIT_OPTIONS, CUSTOM_DEVICE_TERMINAL_ANCHOR_GUIDE_LABELS, CUSTOM_DEVICE_TERMINAL_ANCHOR_GUIDE_VALUES, CUSTOM_DEVICE_TERMINAL_ANCHOR_PRECISION, Cable, ChevronDown, ChevronRight, ChevronsDown, ChevronsUp, CircleDot, Copy, CustomComponentManagerTree, DEFAULT_CANVAS_BACKGROUND, DEFAULT_COLOR_PALETTE, DEFAULT_DEVICE_LABEL_FONT_SIZE, DEFAULT_MODEL_LAYER_ID, DEFAULT_POWER_BASE_VALUE, DeferredColorInput, Download, ELECTRIC_COLOR_TYPES, ELECTRIC_COLOR_TYPE_LABELS, ENABLE_REACT_FLOW_PREVIEW, ENERGY_COLOR_ROWS, Eye, EyeOff, FileInput, FileJson, FlipHorizontal, FlipVertical, FolderOpen, Fragment, GROUP_SCALE_HANDLE_CONFIGS, Grid2X2, Group, Italic, Layers, Layers2, LocateFixed, MAX_CANVAS_HEIGHT, MAX_CANVAS_WIDTH, MAX_CUSTOM_DEVICE_TERMINALS, MIN_CANVAS_HEIGHT, MIN_CANVAS_WIDTH, MapIcon, Maximize2, MemoDeviceGlyph, Minus, PARAM_LABELS, PARAM_VALUE_TYPE_OPTIONS, POWER_UNIT_OPTIONS, Paintbrush, Palette, Pencil, Plus, READONLY_E_PARAM_KEYS, ReactFlowPreview, RotateCcw, RotateCw, Route, SCALE_HANDLE_CONFIGS, STATIC_ROUTE_AVOIDANCE_PARAM, Save, ScanSearch, Scissors, Settings2, Search, Suspense, SvgMarkupChunk, TERMINAL_TYPE_LIBRARY_LABELS, TERMINAL_TYPE_OPTIONS, TOPOLOGY_WARNING_PAGE_SIZE, TRANSFORM_ROTATE_HANDLE_GAP, TRANSFORM_ROTATE_STEM_END, TRANSFORM_ROTATE_STEM_START, TextStyleToggleButton, Trash2, Type, Underline, Undo2, Ungroup, VOLTAGE_BASE_CLEAR_SCOPES, VOLTAGE_BASE_CLEAR_SCOPE_LABELS, VOLTAGE_BASE_SET_SCOPES, VOLTAGE_BASE_SET_SCOPE_LABELS, VOLTAGE_UNIT_OPTIONS, X, Zap, ZapOff, activateInspectorFromCanvas, activeDropHintPoint, activeDropHintStyle, activeDropReady, activeImageFolderId, activeLayer, activeLayerEdgeIdSet, activeLayerId, activeLayerNodeIdSet, activeLayerNodes, activeModelPathName, activeProjectKey, activeSchemeKey, activeSelectedEdgeSet, activeSelectedNodeIds, activeVoltageBaseTerminalKey, activeVoltageBaseTerminalRow, addCustomDeviceStateDraftRow, addDefaultMeasurementsToNode, addDefinitionDraftRow, addManualBendFromContextMenu, addRoutableLineBendFromContextMenu, addStateIconDrawingElement, addVoltageColorRow, adjustSelectedDisplayLayer, alignSelected, allowAutoExpandCanvas, appShellStyle, appendConnectPreviewManualPoint, appendRoutableLinePreviewManualPoint, appendStaticDrawingPoint, applyConnectPreviewState, applyExistingImage, applyLayerAssignmentDialog, applyRoutableLinePreviewState, applyStateIconDrawingDialog, aside, assignSelectedNodesToModelLayer, categoryLibraryComponentLibraryKey, categoryLibraryOptionClass, autoAlignCanvasGraphics, autoSpreadCanvasGraphics, backgroundLayerIds, backgroundLayerOptions, backgroundProjectId, backgroundProjectOptions, backgroundProjectRecord, batchEditors, bindCanvasNodeElement, busEndpointColor, button, canAddTemplateFromSelection, canAdjustSelectedDisplayLayer, canConnectTerminals, canExportCurrentModel, canGroupSelectedGraphics, canUngroupSelectedGraphics, cancelLibraryPlacement, cancelModifierSelectionPress, cancelTemplateDialog, canvasBackgroundColor, canvasBackgroundImage, canvasBackgroundImageUrl, canvasClipboard, canvasDisplayHeight, canvasDisplayOffsetX, canvasDisplayOffsetY, canvasDisplayWidth, canvasFrameRef, canvasHorizontalScrollbarsActive, canvasInteractionRef, canvasRenderBounds, canvasResizeDrag, canvasResizeHandles, canvasResizeHotzoneStyle, canvasResizeHotzonesRef, canvasResizePreviewRect, canvasScrollSurfaceHeight, canvasScrollSurfaceWidth, canvasSelectionShortcutActiveRef, canvasSizeDraft, canvasVerticalScrollbarsActive, centerSelectedInView, centerSelectedViewportTitle, chooseCustomDeviceBackground, chooseDefinitionTemplateIcon, chooseImage, chooseStateIconDrawingImport, chooseStateVisualImage, circle, clampPointToCanvas, clearLibraryPlacementPreview, clearRecordSelection, clearSelectedImage, clearSelectedImageForNode, clearStaticButtonFeedback, clipPath, closeCustomDeviceDialog, closeDeviceDefinitionDialog, code, collapsedCustomComponentTreeLibraries, collapsedCustomComponentTreeTypes, collapsedDefinitionComponentLibraries, colorDisplayMode, colorPalette, colorPaletteDialogOpen, colorPaletteDraft, colorPaletteTab, commitCanvasSizeDraft, commitLibraryPlacementAtPoint, componentLibraryDisplayParts, componentLibraryOptionClass, componentLibraryOptionsByCategoryLibrary, confirmAddGraphTemplate, confirmConnectionRedrawDialog, confirmCreateDeviceFromGroup, confirmFilterSelectionDialog, confirmReplaceDeviceIconFromGroup, confirmVoltageBaseClearDialog, confirmVoltageBaseSetDialog, connectDropHintElementRef, connectPreviewColor, connectPreviewDom, connectPreviewHandleElementRef, connectPreviewPathElementRef, connectPreviewPointRef, connectSource, connectSourceNode, connectTargetPoint, connectTargetSnapPoint, connectTerminalCompatibilityActive, connectionLineStyle, connectionRedrawDialogOpen, connectionRedrawScope, connectionRedrawTargetsForScope, consumeGraphicContextMenuHandled, contextMarqueeSelection, contextMarqueeSelectionRef, contextMeasurementGroup, contextMeasurementNode, contextMenu, contextMenuClassName, contextMenuForEdge, contextMenuForNode, contextMenuForRoutableLine, contextMenuForSelection, contextMenuFromElementTree, contextMenuRef, contextMenuStyle, contextMenuTarget, contextSelectionCount, copyProjectRecord, copySchemeRecord, copySelection, createBlankProject, createGraphTemplateType, createImageFolder, createSchemeRecord, currentCategoryLibraryComponentLibraryOptions, currentModelRecord, currentModelVoltageColorKeys, currentUnit, currentZoomPercent, customComponentTreeSearchQuery, customComponentTreeSelection, customDefaultStateSelected, customDeviceDefinitionMode, customDeviceDialogOpen, customDeviceDialogRef, customDeviceDialogView, customDeviceDraft, customDeviceImageInputRef, customDeviceMeasurementTarget, customDevicePreviewHeight, customDevicePreviewImage, customDevicePreviewSourceTemplate, customDevicePreviewWidth, customDeviceSaveMessage, customDeviceSaveToast, customDeviceStatePageId, customDeviceTerminalAnchorDragIndex, customDeviceTerminalAnchorValue, customDeviceTerminalAnchors, customDeviceTerminalConnectorSegment, customDraftDefaultParams, customParamId, customStatePreviewText, customStatePreviewVisual, cutSelection, datalist, defaultBackgroundLayerIdsForProject, defaultComponentLibraryForCategoryLibrary, defaultContainerAssociationForTerminalType, definitionCategoryLibraryComponentLibraryOptions, definitionDraftError, definitionDraftRows, definitionDraftSection, definitionDraftSectionEditing, definitionTemplateIconInputRef, defs, deleteCustomDeviceStateDraftRow, deleteDefinitionDraftRow, deleteImageFolder, deleteManualBendPoint, deleteProjectRecord, deleteRoutableLineBendPoint, deleteSchemeRecord, deleteSelectedStateIconDrawingElements, deleteSelection, deleteStateIconDrawingElement, deleteVoltageColorRow, detailedSelectedEdgeIdSet, detailedViewportNodes, deviceDefinitionDialogOpen, deviceDefinitionDialogRef, deviceDefinitionKeyForTemplate, deviceDefinitionSearchNeedle, deviceDefinitionSearchQuery, deviceDefinitionView, deviceLabelsVisible, deviceLibraryDialogDrag, deviceLibraryDialogLayouts, deviceLibraryDialogResize, deviceLibraryDialogStyle, displayedCustomComponentTreeLibraries, displayedDeviceDefinitionLibraries, distributeSelected, div, dragAffectedEdgeIdSet, dragGhostEdgeIdSet, dragGhostEdgeRoutes, dragGhostRoutableLineNodeIdSet, dragOverlayEdgeIdSet, dragPreviewEdgeIdSet, dragPreviewEdgeRoutes, dragStateIconDrawingSelection, draggingDelta, draggingNodeIdSet, draggingRef, edgeById, edgeFloatingToolbar, edges, effectiveLeftPanelTab, editingCustomDeviceKind, em, expandedDefinitionGroups, exportEFile, exportProjectRecordFile, exportSchemeRecord, exportSvg, exportSvgFile, exportJsonFile, filterSelectionDialogOpen, filterSelectionTreeLabel, filterSelectionTypeKeys, filterSelectionTypeOptions, filterSelectionTypePartial, filterSelectionTypeSelected, filteredCustomComponentTreeByComponentLibrary, filteredDeviceDefinitionByComponentLibrary, findConnectTargetAtPoint, findConnectionRouteHitAtPoint, findRewireTargetAtPoint, findRoutableLineEndpointTargetAtPoint, findSavedSchemeById, finishCanvasPanning, finishConnectToTarget, finishInteractiveStaticDrawing, finishManualPathDrag, finishMarqueeSelection, finishMarqueeSelectionFromPoints, finishMeasurementDrag, finishModifierSelectionPress, finishNodeDrag, finishNodeLabelDrag, finishNodeLabelRotateDrag, finishRewiring, finishRoutableLineEndpointDrag, finishRoutableLineToTarget, finishTerminalPress, finishTransformDrag, fitSelectedViewportTitle, fitViewToSelection, fitWholeCanvasFromBlankDoubleClick, fitWholeCanvasToFrame, floatingToolbarIconSize, floatingToolbarWrapperStyle, flushConnectPreviewDom, focusCanvasKeyboardShortcutHost, footer, formatCustomDeviceTerminalAnchorValue, formatDeviceModelParamDisplayValue, formatInspectorScaleValue, formatSvgNumber, g, generateCustomDeviceImage, getContainerTerminalAssociationSourceIndex, getEParamValue, getEParameterKeys, getEdgeEndpointPoint, getMovableRouteSegmentIndexes, getNodeScaleX, getNodeScaleY, getTerminalDisplayColor, graphTemplateTypes, groupDeviceDefinitionDialog, groupDeviceReplacementTemplates, groupSelectedGraphics, groupTransformPreviewEdgeIdSet, groupTransformPreviewGroupId, groupTransformPreviewNodeIdSet, groupTransformPreviewRoutableLineNodeIdSet, h1, h2, h3, handleCanvasPointerDownCapture, handleDrop, handleEdgePathPointerDown, handleLodNodeContextMenu, handleLodNodeDoubleClick, handleLodNodePointerDown, handleMinimapNavigate, handleNodePointerDown, handlePointerMove, handleRoutableLineNodePathPointerDown, handleSidePanelPointerLeave, handleStaticButtonClick, handleTerminalPointerDown, handleTreeCollapseChange, handleWheel, hasBatchCommonPropertyRows, hasCanvasSelectionModifier, header, hiddenTopologyErrorCount, hideAutoPanelsFromWorkspace, image, imageAssetList, imageAssets, imageFolders, imageInputRef, imageTarget, img, imperativeMultiNodeDragOverlayRef, imperativeNodeDragDropHintRef, imperativeSingleNodeDragEdgePreviewRef, imperativeSingleNodeDragNodeOverlayRef, importModelFile, importSchemeFile, initialCanvasDetailedEdgeIdSet, insertManualBendFromEdgePath, insertManualBendFromPointer, inspectorSelectedEdge, inspectorSelectedNode, inspectorTab, inspectorTopologyErrors, isBlockingTopologyValidationError, isBrowseMode, isBuiltInCategoryLibrary, isBuiltInComponentLibrary, isBusNode, isCanvasGraphicContextMenuTarget, isContainerTerminalAssociationDependent, isDoubleContainerTerminalAssociation, isEditMode, isGroupTransformDrag, isReadonlyCanvasMode, isRepeatedEdgePointerClick, isRoutableLineDeviceKind, isStaticBoxLikeNode, isStaticButtonEnabledForNode, isStaticNode, lastCanvasClientPointerRef, lastCanvasPointerRef, lastEdgePointerClickRef, lastRawCanvasPointerRef, layerAssignmentDialogOpen, layerAssignmentTargetId, layerAssignmentUnchanged, layerManagementDropdownRef, layers, leftPanelContent, leftPanelMode, leftPanelRef, leftPanelTab, leftPanelVisible, libraryPlacement, line, loadDefinitionTemplateDraft, locateTopologyError, lodCanvasNodeChunks, lodCanvasRouteChunks, lodSelectedNodeMarkup, main, manualPathDrag, manualPathPreviewRoute, mapPointToMinimap, marquee, minimapContentHeight, minimapContentWidth, minimapNodes, minimapOffsetX, minimapOffsetY, minimapRoutes, minimapScale, minimapViewportBottom, minimapViewportLeft, minimapViewportRight, minimapViewportTop, minimapVisible, mirrorSelectedNodes, mode, modelImportInputRef, modifierSelectionPressRef, mousePositionTextRef, multiNodeDragging, nodeById, nodeDoubleClickDialogDrag, nodeDoubleClickDialogResize, nodeFloatingToolbar, nodeForegroundImage, nodeGeometryTransform, nodeImage, nodeImageContentTransform, nodeKindAllowsResizeTransform, nodeLabelDisplayMode, nodeLabelDrag, nodeLabelFontSize, nodeLabelOffset, nodeLabelRotateDrag, nodeLabelShouldRender, nodeLabelText, nodeLabelTextAnchor, nodeLabelTextStyle, nodeLabelTransform, nodeLabelVertical, nodeLabelVerticalSegments, nodeLabelVerticalTokenStyle, nodeLabelVerticalTokenY, nodeRotateHandleControlPoints, nodeScaleHandleControlPoint, nodeUprightRotateHandleControlPoints, nodeUprightSelectionOutlineRect, nodeUsesUprightStaticSelectionOutline, nodes, normalizeCategoryLibraryName, normalizeComponentLibraryName, normalizeContainerTerminalAssociations, normalizeDefinitionRowEnumFields, normalizeNodeLabelRotation, normalizeScale, normalizeStaticBoxDimension, normalizedTopologyWarningPage, openAddTemplateDialog, openColorPaletteDialog, openConnectionRedrawDialog, openUserCustomizationManager, openEdgeContextMenu, openFilterSelectionDialog, openGraphicContextMenu, openGroupDeviceDefinitionDialog, openLayerAssignmentDialog, openMeasurementEditorForNode, openModelImportFilePicker, openNodeDoubleClickEditor, openSchemeImportFilePicker, openStateIconDrawingDialog, openTopologyWarningPanel, openVoltageBaseClearDialog, openVoltageBaseSetDialog, operationLogRef, operationLogStatusRef, overlappedTerminalKeys, p, panning, panningRef, paramOptionsForSection, parameterValueTypeLabelForDefinitionRow, parseCustomDefinitions, pasteProjectClipboardRecord, pasteSchemeClipboardRecord, pasteSelection, path, pattern, pendingModelImportConflict, pendingRecordPasteConflict, pendingSchemeImportConflict, pendingUnsavedAction, pointsToOrthogonalPath, polyline, powerBaseValue, powerUnit, projectById, projectListPointerInsideRef, projectMenu, projectName, pushUndoSnapshot, reactFlowPreviewOpen, recordClipboard, rect, removeMeasurementsFromNode, renameImageFolder, renameProjectRecord, renameSchemeRecord, renderBoundaryBusInternalConnector, renderDeviceDefinitionMeasurementPanel, renderDeviceDefinitionVisualPanel, renderElementTreePanel, renderEnumValuesEditor, renderGraphTemplatePreview, renderGroupTransformPhotoPreview, renderInteractiveStaticDrawingPreview, renderLayerManager, renderLibraryPlacementPreview, renderMeasurementConfigDialog, renderMeasurementEditorDialog, renderMeasurementGroup, renderMultiNodeDragOverlay, renderNodeDoubleClickDialog, renderNodePreviewImageContent, renderReadonlyBackgroundPage, renderSelectedNodeMeasurementTable, renderSidePanelEdgeTrigger, renderSidePanelModeControls, renderSingleTransformRotateOriginGhost, renderStateVisualPager, renderTransformRotationTrajectory, renderTypicalValueEditor, renderViewportRoutedEdges, resetConnectPreviewState, resetDeviceDefinitionDraft, revertCustomDeviceDraftCurrentTab, revertCustomDeviceDraftAll, resetEnergyColors, resetRoutableLinePreviewState, resetViewportZoom, resetVoltageColors, resizeSizeHint, resolveConnectPreviewPoint, resolveDuplicateModelImport, resolveDuplicateSchemeImport, resolveNodeStateVisual, resolveRecordPasteConflict, resolveRoutableLinePreviewPoint, resolveTemplateComponentLibrary, requestUnsavedChangeAction, resolveUnsavedChangeAction, rewiring, rewiringPreviewRoute, rightPanelMode, rightPanelRef, rightPanelVisible, rotateSelectedLayoutUnits, routableLineActiveTerminalType, routableLineDeviceCanvasPoints, routableLineDeviceRenderLocalPoints, routableLineEndpointDrag, routableLineEndpointDragColor, routableLineEndpointDragPreviewRoute, routableLineEndpointHandles, routableLinePlacement, routableLinePlacementColor, routableLinePreview, routableLineTerminalCompatibilityActive, runContextMenuAction, runTopologyCalculation, sameOptionalPoint, saveColorPalette, saveCurrentProject, saveCustomDeviceDefinitionDialog, saveDeviceDefinitionDraft, saveRequired, scaleHandleCursorClass, scheduleRoutableLinePreviewPoint, schemeImportInputRef, schemes, screenToSvgPoint, select, selectCanvasGraphics, selectCustomCategoryLibrary, selectCustomComponentTemplate, selectCustomComponentLibrary, selectableCategoryLibraries, selectedContainerParameterView, selectedContainerParameterViews, selectedCount, selectedDefinitionBaseTemplate, selectedDefinitionTemplate, selectedDefinitionTerminalAssociations, selectedDeviceInfoView, selectedEdge, selectedLayoutUnitCount, selectedNodeCount, selectedNodeId, selectedNodeIdSet, selectedNodeTransformStatus, selectedRoutableLineManualPathRoute, selectedRoutedEdge, selectedSchemeRecord, selectedTransformGroupUnit, selectedViewportActionDisabled, selectionRectCenter, setActiveImageFolderId, setActiveVoltageBaseTerminalKey, setAllowAutoExpandCanvas, setBackgroundLayerIds, setBackgroundProjectId, setCanvasBackgroundColor, setCanvasBackgroundImage, setCanvasBackgroundImageAssetId, setCanvasSelectionScope, setColorPaletteDialogOpen, setColorPaletteTab, setConnectSource, setConnectionRedrawDialogOpen, setConnectionRedrawScope, setContainerParamViewId, setContextMarqueeSelection, setContextMenu, setCurrentUnit, setCustomComponentTreeSearchQuery, setCustomComponentTreeSelection, setCustomDeviceDialogView, setCustomDeviceDraft, setCustomDeviceStatePageId, setCustomDeviceTerminalAnchorDragIndex, setDefinitionDraftError, setDefinitionDraftSection, setDefinitionDraftSectionEditing, setDeviceDefinitionSearchQuery, setDeviceDefinitionView, setDeviceLabelsVisible, setFilterSelectionDialogOpen, setFilterSelectionTypeKeys, setGroupDeviceDefinitionDialog, setImageTarget, setInspectorTab, setLayerAssignmentDialogOpen, setLayerAssignmentTargetId, setLeftPanelTab, setMarquee, setMinimapVisible, setMode, setPowerBaseValue, setPowerUnit, setReactFlowPreviewOpen, setRewiring, setRoutableLineEndpointDrag, setRoutableLinePlacement, setSelectedDeviceInfoView, setSelectedEdgeId, setSelectedEdgeIds, setSelectedNodeIds, setSelectedNodeLabelDisplayMode, setSelectedProjectId, setSelectedProjectIds, setSelectedSchemeId, setSelectedSchemeIds, setSmartAlignmentEnabled, setStateIconDrawingDialog, setStateIconDrawingImportMode, setStateImageUploadTarget, setStaticButtonFeedback, setTemplateDraftName, setTemplateDraftType, setTerminalPress, setTopologyWarningPage, setTopologyWarningPanelClosed, setVoltageBaseClearDialogOpen, setVoltageBaseClearScope, setVoltageBaseSetDialogOpen, setVoltageBaseSetScope, setVoltageBaseSetValue, setVoltageBaseTerminalValue, setVoltageColorVisibility, setVoltageUnit, sidePanelResize, singleNodeDragging, singleSelectedDeviceForInspector, small, smartAlignmentEnabled, smartAlignmentGuides, sourceSelectClassName, span, startCanvasPanning, startCanvasResize, startCanvasResizeFromBottomOverlay, startCanvasResizeFromLeftOverlay, startCanvasResizeFromRightOverlay, startCanvasResizeFromTopOverlay, startContextMarqueeSelection, startDeviceLibraryDialogDrag, startDeviceLibraryDialogResize, startGroupMoveDrag, startGroupTransformDrag, startManualPointDrag, startManualSegmentDrag, startModifierSelectionPress, startNodeLabelDrag, startNodeLabelRotateDrag, startRoutableLineEndpointDrag, startRoutableLineFromTerminal, startRoutableLinePointDrag, startRoutableLineSegmentDrag, startSidePanelResize, startSingleTransformDrag, startStateIconDrawingDrag, startStatusbarResize, startTopologyWarningPanelDrag, startTopologyWarningPanelResize, stateIconDrawingDialog, stateIconDrawingImportInputRef, stateIconDrawingKeyDown, stateIconDrawingSelection, stateIconDrawingSvgRef, stateIconDrawingToImage, stateVisualImageInputRef, stateVisualShapeLabel, staticButtonPointerRef, staticButtonVisual, staticDrawing, staticNodeParticipatesInRoutingAvoidance, statusbarResize, stopDeviceLibraryDialogEvent, stopSidePanelEventPropagation, stopStateIconDrawingDrag, strong, svgRef, svgStrokeDashArray, switchInspectorTabForCanvasSelection, table, tbody, td, templateDialog, templateDraftName, templateDraftType, templateResizeTransformValue, terminalColor, terminalPressPreviewEdgeIdSet, terminalPressPreviewEdgeRoutes, terminalRenderLocalPoint, terminalStubSegment, terminalStubStrokeWidth, terminalVbaseFallback, terminalVoltageBaseNumber, text, th, thead, tidyRoutableLineRoute, tidySelectedEdgeRoute, title, toggleBackgroundLayer, toggleColorDisplayMode, toggleDefinitionComponentLibrary, toggleDefinitionGroup, toggleFilterSelectionItem, toggleFilterSelectionType, toggleInteractionMode, toggleSelectedNodeLabelDisplay, topology, topologyErrors, topologyStatus, topologyWarningDisplayMessage, topologyWarningPageCount, topologyWarningPanelClosed, topologyWarningCategory, setTopologyWarningCategory, topologyWarningStatus, setTopologyWarningStatus, categorizeTopologyErrorType, topologyFilteredErrors, topologyWarningPanelRef, topologyWarningPanelResize, topologyWarningPanelStyle, topologyWarningPanelVisible, tr, transformDrag, undoLastOperation, undoStack, ungroupSelectedGraphics, updateAutoPanelVisibility, updateCustomDeviceStateDraftRow, updateCustomDeviceTerminalAnchor, updateCustomDeviceTerminalAnchorFromPreview, updateCustomDraftTerminalCount, updateDefinitionDraftRow, updateEnergyColor, updateLibraryPlacementPreview, updateMouseStatus, updateParam, updateSelectedDefinitionResizePermission, updateSelectedNode, updateStateIconDrawingElement, updateTerminalVbase, updateVoltageColorRow, useSimplifiedCanvasNodes, useSimplifiedCanvasRoutes, useSimplifiedSelectedCanvasNodes, viewportOverlayStyle, visibleEdges, visibleMeasurementGroups, visibleNodes, visibleSelectedGroupLayoutUnits, visibleStateIconColor, visibleTopologyErrors, visibleVoltageColorRows, voltageBaseClearDialogOpen, voltageBaseClearResultForScope, voltageBaseClearScope, voltageBaseSetDialogOpen, voltageBaseSetHasUniformTargets, voltageBaseSetMode, voltageBaseSetModeLabel, voltageBaseSetOptions, voltageBaseSetReady, voltageBaseSetResultForScope, voltageBaseSetScope, voltageBaseSetTerminalRows, voltageBaseSetValue, voltageBaseTerminalRowKey, voltageColorVisibility, voltageUnit, warningStatusText, warningStatusTitle, zoomViewportAtCenter } = __appScope;
  const {
    confirmCustomLibraryCreateDialog,
    createCustomCategoryLibrary,
    createCustomComponentLibrary,
    clearLibraryFlyoutCloseTimer,
    customComponentLibraries,
    customGraphTemplates,
    customLibraryCreateDialog,
    deleteGraphTemplate,
    deleteGraphTemplateType,
    deleteSelectedCustomDeviceTreeItem,
    scheduleGraphTemplateFlyoutClose,
    setCustomLibraryCreateDialog,
    setHoveredGraphTemplateType,
    startCustomComponentCreate,
    templateMenu
  } = __appScope;
  const { dragging } = __appScope;
  const {
    customDeviceTemplates,
    deviceDefinitionOverrides,
    eDeviceDefinitionLabels,
    setEDeviceDefinitionLabels,
    eDeviceDefinitionClassExportEnabled,
    setEDeviceDefinitionClassExportEnabled,
    eDeviceDefinitionFieldOrder,
    setEDeviceDefinitionFieldOrder,
    eDeviceDefinitionTableIds,
    setEDeviceDefinitionTableIds,
    eDeviceDefinitionTemplateFields,
    setEDeviceDefinitionTemplateFields,
    eDeviceDefinitionInterfaceDialogOpen,
    setEDeviceDefinitionInterfaceDialogOpen,
    libraryTemplates,
    persistDeviceLibraryChange,
    setCustomDeviceTemplates,
    setDeviceDefinitionOverrides,
    updateDefinitionComponentLibraryCommonParamExport,
    writeOperationLog
  } = __appScope;
  const { globalMessage, setGlobalMessage } = __appScope;
  const { createModelDialog, setCreateModelDialog } = __appScope;
  const { globalLinePlacementDialog, globalLinePlacementCandidates, globalLinePlacementConflictMessageForId, globalLineTransitionDialog, setGlobalLinePlacementDialog, confirmGlobalLinePlacement, cancelGlobalLinePlacement, confirmGlobalLineTransition, cancelGlobalLineTransition } = __appScope;
  const globalLineRepairCandidate = globalLinePlacementDialog?.mode === "existing"
    ? globalLinePlacementCandidates?.find((record: { id: string }) => record.id === globalLinePlacementDialog.selectedGlobalLineId)
    : undefined;
  const { exportCompletionDialog, exportCompletionCountdown, setExportCompletionDialog } = __appScope;
  const { unsavedChangesDialogOpen, setUnsavedChangesDialogOpen, savedUndoStackLengthRef, setHasUnsavedChanges } = __appScope;
  useEffect(() => {
    if (unsavedChangesDialogOpen) {
      const baseline = savedUndoStackLengthRef?.current ?? 0;
      if (undoStack.length <= baseline && saveRequired) {
        setHasUnsavedChanges(false);
      }
    }
  }, [unsavedChangesDialogOpen, undoStack, saveRequired, savedUndoStackLengthRef, setHasUnsavedChanges]);
  const deleteAllDefinitionParameters = () => {
    if (!__appScope.requireEditMode("删除全部参数")) return;
    const template = __appScope.selectedDefinitionTemplate;
    if (!template || template.custom || __appScope.definitionDraftRows.length === 0) return;
    if (!window.confirm(`确认删除“${template.label}”的全部参数定义？`)) return;
    __appScope.definitionDeleteAllParametersRequestedRef.current = true;
    __appScope.setDefinitionDraftRows([]);
    __appScope.setDefinitionDraftError("已标记删除全部参数，点击保存后生效。");
  };
  const eDeviceInterfaceDefinitionRows = buildEDeviceInterfaceDefinitionRows({
    libraryTemplates,
    labels: PARAM_LABELS,
    eDeviceDefinitionLabels,
    eDeviceDefinitionClassExportEnabled,
    eDeviceDefinitionFieldOrder,
    eDeviceDefinitionTemplateFields,
    resolveDefinitionComponentLibrary: resolveTemplateComponentLibrary
  });
  const [selectedEDeviceInterfaceComponentLibrary, setSelectedEDeviceInterfaceComponentLibrary] = useState("");
  const [collapsedEDeviceInterfaceTreeNodes, setCollapsedEDeviceInterfaceTreeNodes] = useState<Record<string, boolean>>({});
  const [eDeviceInterfaceSelectedGroupKey, setEDeviceInterfaceSelectedGroupKey] = useState<string | null>(null);
  const [eDeviceInterfaceDefinitionBaseline, setEDeviceInterfaceDefinitionBaseline] = useState<any>(null);
  const [eDeviceInterfaceSelectedClassBaseline, setEDeviceInterfaceSelectedClassBaseline] = useState<any>(null);
  Object.assign(__appScope, { setEDeviceInterfaceDefinitionBaseline, setEDeviceInterfaceSelectedClassBaseline });
  const [eDeviceInterfaceClassSwitchTarget, setEDeviceInterfaceClassSwitchTarget] = useState("");
  const [eDeviceInterfaceExitPromptOpen, setEDeviceInterfaceExitPromptOpen] = useState(false);
  const [eDeviceInterfaceSaveMessage, setEDeviceInterfaceSaveMessage] = useState("");
  const [eDeviceTemplateDropdownOpen, setEDeviceTemplateDropdownOpen] = useState(false);
  const [templateImportResult, setTemplateImportResult] = useState<{
    matched: Array<{ section: string; device: string; fields: Array<{ template: string; device: string }> }>;
    skipped: Array<{ section: string; reason: string; fields?: string[] }>;
    runtimeGenerated: Array<{ section: string; fields?: string[] }>;
  } | null>(() => {
    try {
      const stored = localStorage.getItem("eDeviceTemplateImportResult");
      return stored ? JSON.parse(stored) : null;
    } catch { return null; }
  });
  const [showImportResultDialog, setShowImportResultDialog] = useState(false);
  const [importResultActiveTab, setImportResultActiveTab] = useState<"matched" | "skipped" | "runtimeGenerated">("matched");
  // 导入结果表格按模板表名折叠，记录已展开的表（key = tab:section）
  const [expandedImportResultSections, setExpandedImportResultSections] = useState<Set<string>>(new Set());
  const toggleImportResultSection = (sectionKey: string) => {
    setExpandedImportResultSections((current) => {
      const next = new Set(current);
      if (next.has(sectionKey)) {
        next.delete(sectionKey);
      } else {
        next.add(sectionKey);
      }
      return next;
    });
  };
  const [eDeviceInterfaceLoadedTemplateName, setEDeviceInterfaceLoadedTemplateName] = useState<string | null>(() => {
    try { return localStorage.getItem("eDeviceInterfaceLoadedTemplateName"); } catch { return null; }
  });
  const [eDeviceInterfaceReadonlyMode, setEDeviceInterfaceReadonlyMode] = useState(() => {
    try { return localStorage.getItem("eDeviceInterfaceReadonlyMode") === "true"; } catch { return false; }
  });
  Object.assign(__appScope, { setEDeviceInterfaceLoadedTemplateName, setEDeviceInterfaceReadonlyMode });
  // 预定义模板对模型类型的限制：国网E格式/主网实时库=主网(厂站)，配网实时库=配网(馈线)，台区实时库=台区；自定义不限
  const TEMPLATE_ALLOWED_MODEL_TYPES: Record<string, string[]> = {
    "国网E格式": ["厂站"],
    "主网实时库": ["厂站"],
    "配网实时库": ["馈线"],
    "台区实时库": ["台区"]
  };
  const MODEL_TYPE_NETWORK_LABEL: Record<string, string> = { "厂站": "主网", "馈线": "配网", "台区": "台区" };
  const modelTypeMismatchMessage = (): string | null => {
    const templateName = eDeviceInterfaceLoadedTemplateName;
    if (!templateName || templateName === "自定义") {
      return null;
    }
    const allowed = TEMPLATE_ALLOWED_MODEL_TYPES[templateName];
    if (!allowed || allowed.includes(modelType)) {
      return null;
    }
    const allowedLabels = allowed.map((t) => MODEL_TYPE_NETWORK_LABEL[t] ?? t).join("、");
    const currentLabel = MODEL_TYPE_NETWORK_LABEL[modelType] ?? modelType;
    return `当前模板「${templateName}」仅支持${allowedLabels}模型，当前模型类型为「${currentLabel}」。请转为自定义配置或切换模型类型后重试。`;
  };
  const requestExportWithSave = (doExport: () => void | Promise<void>) => {
    requestUnsavedChangeAction({
      kind: "export",
      label: "导出",
      onResolved: () => {
        void doExport();
      }
    });
  };
  const requestEncodedExport = (
    doExport: (encoding: "utf-8" | "gbk") => void | Promise<void>,
    encoding: "utf-8" | "gbk",
    validatesEInterface = false
  ) => {
    if (validatesEInterface) {
      const mismatch = modelTypeMismatchMessage();
      if (mismatch) {
        showGlobalMessage(mismatch);
        return;
      }
    }
    requestExportWithSave(() => doExport(encoding));
  };
  Object.assign(__appScope, { requestEncodedExport });
  Object.assign(__appScope, { setTemplateImportResult, setShowImportResultDialog, setImportResultActiveTab });
  // 加载预定义模板前，将用户自定义中的 参数定义/量测定义/E文件接口定义 恢复到默认状态
  // （用户自定义管理对话框左侧的 3 个菜单项），使模板从干净基线应用。
  // 返回恢复后的快照（无自定义项时返回 null），供模板应用直接使用恢复后的值，
  // 避免模板应用仍基于本次渲染闭包中的旧值（否则恢复会被模板结果覆盖）。
  const restoreTemplateBaselineCustomizationDomains = async () => {
    const { captureUserCustomizationSnapshot, persistUserCustomizationSnapshot, applyUserCustomizationSnapshotToState, reconcileOpenModelAfterCustomizationChange, referencedUserAssetIds } = __appScope;
    if (typeof captureUserCustomizationSnapshot !== "function" || typeof persistUserCustomizationSnapshot !== "function") {
      return null;
    }
    try {
      const current = await captureUserCustomizationSnapshot(true);
      const baselineDomains = new Set<UserCustomizationDomain>([
        "parameter-definitions",
        "measurement-definitions",
        "e-interface-definitions"
      ]);
      const inventory = buildUserCustomizationInventory(current, DEVICE_LIBRARY, referencedUserAssetIds ?? new Set());
      const itemKeys = inventory.items
        .filter((item) => baselineDomains.has(item.domain))
        .map((item) => item.key);
      if (itemKeys.length === 0) {
        return null;
      }
      const target = restoreUserCustomizationItems(current, itemKeys);
      // restoreUserCustomizationItems 未清理 eDeviceDefinitionTemplateFields（模板导入生成的字段定义），
      // 这里一并清空，使 E 文件接口定义完整恢复到默认状态
      if (target.deviceLibrary.eDeviceDefinitionTemplateFields) {
        target.deviceLibrary = {
          ...target.deviceLibrary,
          eDeviceDefinitionTemplateFields: {}
        };
      }
      await persistUserCustomizationSnapshot(target, {
        replaceAssets: true,
        protectedAssetIds: referencedUserAssetIds ?? new Set()
      });
      if (typeof applyUserCustomizationSnapshotToState === "function") {
        applyUserCustomizationSnapshotToState(target);
      }
      if (typeof reconcileOpenModelAfterCustomizationChange === "function") {
        reconcileOpenModelAfterCustomizationChange(current, target);
      }
      return target;
    } catch (error) {
      // 恢复基线失败不阻断模板加载，提示用户即可
      showGlobalMessage("恢复参数/量测/E文件接口定义默认状态失败，继续加载模板。");
      return null;
    }
  };
  const loadPredefinedEDeviceTemplate = async (templateFile: string) => {
    try {
      // 切换模板先清空「查看导入结果」旧数据，避免新模板加载期间显示上一模板结果
      setTemplateImportResult(null);
      setShowImportResultDialog(false);
      setImportResultActiveTab("matched");
      try {
        localStorage.removeItem("eDeviceTemplateImportResult");
      } catch { /* ignore */ }
      // 禁用缓存，确保加载到最新模板（含表号属性，用于导出 id 计算）
      const response = await fetch(`/e-templates/${templateFile}`, { cache: "no-store" });
      if (!response.ok) {
        showGlobalMessage(`加载预定义模板失败：${response.statusText}`);
        return;
      }
      // 模板可能为 UTF-8（本平台生成）或 GBK（内网模板），按字节读取并兼容解码
      const buffer = await response.arrayBuffer();
      const text = decodeAuto(new Uint8Array(buffer));
      const sections = parseEDeviceDefinitionFile(text);
      if (sections.length === 0) {
        showGlobalMessage("未在模板中解析到元件定义。");
        return;
      }
      // 加载预定义模板前，先将 参数定义/量测定义/E文件接口定义 恢复到默认状态，
      // 模板应用基于恢复后的基线值（避免本次渲染闭包中的旧自定义覆盖恢复结果）
      const baseline = await restoreTemplateBaselineCustomizationDomains();
      const baselineLibrary = baseline?.deviceLibrary;
      // 先取消所有设备类的导出状态，再导入模板定义
      const clearedClassExportEnabled: Record<string, boolean> = {};
      const clearedLabels: Record<string, string> = {};
      const result = applyEDeviceDefinitionSectionsToLibraryState({
        sections,
        customDeviceTemplates: baselineLibrary?.customDeviceTemplates ?? customDeviceTemplates,
        libraryTemplates,
        deviceDefinitionOverrides: baselineLibrary?.deviceDefinitionOverrides ?? deviceDefinitionOverrides,
        eDeviceDefinitionLabels: clearedLabels,
        eDeviceDefinitionClassExportEnabled: clearedClassExportEnabled,
        eDeviceDefinitionTemplateFields: baselineLibrary?.eDeviceDefinitionTemplateFields ?? {},
        eDeviceDefinitionFieldOrder: baselineLibrary?.eDeviceDefinitionFieldOrder ?? {},
        labels: __appScope.PARAM_LABELS,
        deviceDefinitionKeyForTemplate: __appScope.deviceDefinitionKeyForTemplate,
        deviceDefinitionOverrideForTemplate: __appScope.deviceDefinitionOverrideForTemplate,
        resolveDefinitionComponentLibrary: __appScope.resolveTemplateComponentLibrary ?? ((template: any) => inferESection(template.kind, template.params ?? {}))
      });
      setCustomDeviceTemplates(result.customDeviceTemplates);
      setDeviceDefinitionOverrides(result.deviceDefinitionOverrides);
      setEDeviceDefinitionLabels(result.eDeviceDefinitionLabels);
      setEDeviceDefinitionClassExportEnabled(result.eDeviceDefinitionClassExportEnabled);
      setEDeviceDefinitionTemplateFields(result.eDeviceDefinitionTemplateFields ?? {});
      setEDeviceDefinitionFieldOrder(result.eDeviceDefinitionFieldOrder ?? {});
      setEDeviceDefinitionTableIds(result.eDeviceDefinitionTableIds ?? {});
      persistDeviceLibraryChange({
        customDeviceTemplates: result.customDeviceTemplates,
        deviceDefinitionOverrides: result.deviceDefinitionOverrides,
        eDeviceDefinitionLabels: result.eDeviceDefinitionLabels,
        eDeviceDefinitionClassExportEnabled: result.eDeviceDefinitionClassExportEnabled,
        eDeviceDefinitionTemplateFields: result.eDeviceDefinitionTemplateFields ?? {},
        eDeviceDefinitionFieldOrder: result.eDeviceDefinitionFieldOrder ?? {},
        eDeviceDefinitionTableIds: result.eDeviceDefinitionTableIds ?? {}
      }, {
        success: `预定义模板导入成功：匹配 ${result.matched.length} 个，跳过 ${result.skipped.length} 个，无需匹配 ${(result.runtimeGenerated ?? []).length} 个。`,
        failure: `预定义模板已更新本地，后台保存失败：匹配 ${result.matched.length} 个。`
      });
      __appScope.setEDeviceInterfaceDefinitionBaseline?.(null);
      __appScope.setEDeviceInterfaceSelectedClassBaseline?.(null);
      writeOperationLog(`导入预定义模板：${templateFile}`);
      showGlobalMessage(`预定义模板导入成功：匹配 ${result.matched.length} 个，跳过 ${result.skipped.length} 个${(result.runtimeGenerated ?? []).length > 0 ? `，自动生成 ${result.runtimeGenerated.length} 个` : ""}。`);
      setTemplateImportResult({ matched: result.matched, skipped: result.skipped, runtimeGenerated: result.runtimeGenerated ?? [] });
      try {
        localStorage.setItem("eDeviceTemplateImportResult", JSON.stringify({ matched: result.matched, skipped: result.skipped, runtimeGenerated: result.runtimeGenerated ?? [] }));
      } catch { /* ignore */ }
      // 设置模板名称和只读模式
      const templateNameMap: Record<string, string> = {
        "sgcc.e": "国网E格式",
        "ems_rtdb.e": "主网实时库",
        "dms_rtdb.e": "配网实时库",
        "taiqu_rtdb.e": "台区实时库"
      };
      const templateName = templateNameMap[templateFile] ?? templateFile;
      __appScope.setEDeviceInterfaceLoadedTemplateName?.(templateName);
      __appScope.setEDeviceInterfaceReadonlyMode?.(true);
      try {
        localStorage.setItem("eDeviceInterfaceLoadedTemplateName", templateName);
        localStorage.setItem("eDeviceInterfaceReadonlyMode", "true");
      } catch { /* ignore */ }

      // 量测字段映射：模板字段 -> 量测类型ID
      const MEASUREMENT_FIELD_MAP: Record<string, string> = {
        p: "activePower",
        q: "reactivePower",
        v: "voltage",
        i: "current"
      };
      // 检查已匹配 section 中的量测字段，为缺少量测配置的设备类型添加量测定义，并为画布上的节点添加量测组
      const currentConfig = __appScope.measurementConfig;
      if (currentConfig) {
        const existingProfiles = new Set((currentConfig.deviceProfiles ?? []).map((p) => p.deviceKind));
        const newProfiles: any[] = [];
        const deviceKindsNeedingMeasurements: string[] = [];
        for (const item of result.matched) {
          const measurementFields = item.fields
            .filter((f) => MEASUREMENT_FIELD_MAP[f.template])
            .map((f) => MEASUREMENT_FIELD_MAP[f.template]);
          if (measurementFields.length === 0) {
            continue;
          }
          // 查找该类对应的设备 kind
          const template = (libraryTemplates ?? []).find((t) => {
            const derivedInfo = templateDerivedComponentLibraryInfo(t);
            const cl = derivedInfo?.componentLibrary ?? (resolveTemplateComponentLibrary ? resolveTemplateComponentLibrary(t) : inferESection(t.kind, t.params ?? {}));
            return cl === item.device;
          });
          const deviceKind = template?.kind ?? item.device;
          deviceKindsNeedingMeasurements.push(deviceKind);
          // 检查是否已有量测配置
          if (existingProfiles.has(deviceKind) || existingProfiles.has(item.device)) {
            continue;
          }
          // 创建量测配置
          newProfiles.push({
            deviceKind,
            items: measurementFields.map((id) => ({ measurementTypeId: id }))
          });
          existingProfiles.add(deviceKind);
        }
        if (newProfiles.length > 0) {
          const nextConfig = {
            ...currentConfig,
            deviceProfiles: [...(currentConfig.deviceProfiles ?? []), ...newProfiles]
          };
          __appScope.setMeasurementConfig?.(nextConfig);
        }
        // 为画布上的节点添加量测组
        const canvasNodes = __appScope.nodes as any[];
        const createDefaultMeasurementGroupsForNode = __appScope.createDefaultMeasurementGroupsForNode;
        const upsertMeasurementGroups = __appScope.upsertMeasurementGroups;
        const updateProjectMeasurementsWithUndo = __appScope.updateProjectMeasurementsWithUndo;
        if (canvasNodes && createDefaultMeasurementGroupsForNode && upsertMeasurementGroups && updateProjectMeasurementsWithUndo) {
          const nodesNeedingMeasurements = canvasNodes.filter((node) => {
            const componentLibrary = inferESection(node.kind, node.params);
            return deviceKindsNeedingMeasurements.some((dk) => dk === node.kind || dk === componentLibrary);
          });
          if (nodesNeedingMeasurements.length > 0) {
            const configForGroups = newProfiles.length > 0
              ? { ...currentConfig, deviceProfiles: [...(currentConfig.deviceProfiles ?? []), ...newProfiles] }
              : currentConfig;
            const allNewGroups = nodesNeedingMeasurements.flatMap((node) =>
              createDefaultMeasurementGroupsForNode(node, configForGroups)
            );
            if (allNewGroups.length > 0) {
              updateProjectMeasurementsWithUndo(
                (current) => upsertMeasurementGroups(current, allNewGroups),
                `模板导入：为 ${nodesNeedingMeasurements.length} 个元件添加量测`
              );
            }
          }
        }
      }
      // 模板导入可能为画布节点添加量测组，自动保存模型避免"未保存"提示
      window.setTimeout(() => {
        if (__appScope.hasUnsavedChanges && typeof __appScope.saveCurrentProject === "function") {
          void __appScope.saveCurrentProject();
        }
      }, 0);
    } catch (error) {
      showGlobalMessage(error instanceof Error ? error.message : "加载预定义模板失败。");
    }
  };
  // 撤销 E文件接口定义所有修改：将 E 文件接口定义恢复到原始（默认）状态，
  // 清除类/字段的导出名称、导出启用、字段顺序及模板导入字段等全部自定义，
  // 与「加载预定义模板」前的恢复基线逻辑一致（仅作用于 E 接口定义域）。
  const restoreEDeviceInterfaceOriginalDefinition = async () => {
    const { captureUserCustomizationSnapshot, persistUserCustomizationSnapshot, applyUserCustomizationSnapshotToState, reconcileOpenModelAfterCustomizationChange, referencedUserAssetIds } = __appScope;
    if (typeof captureUserCustomizationSnapshot !== "function" || typeof persistUserCustomizationSnapshot !== "function") {
      showGlobalMessage("恢复E文件接口定义原始状态失败：用户自定义快照能力不可用。");
      return;
    }
    // 先提交当前输入框内容，避免恢复前最后一个字段的修改丢失
    const activeElement = document.activeElement;
    if (activeElement instanceof HTMLElement && activeElement.closest(".e-device-interface-dialog")) {
      activeElement.blur();
    }
    try {
      const current = await captureUserCustomizationSnapshot(true);
      const inventory = buildUserCustomizationInventory(current, DEVICE_LIBRARY, referencedUserAssetIds ?? new Set());
      const itemKeys = inventory.items
        .filter((item) => item.domain === "e-interface-definitions")
        .map((item) => item.key);
      const target = restoreUserCustomizationItems(current, itemKeys);
      await persistUserCustomizationSnapshot(target, {
        replaceAssets: true,
        protectedAssetIds: referencedUserAssetIds ?? new Set()
      });
      if (typeof applyUserCustomizationSnapshotToState === "function") {
        applyUserCustomizationSnapshotToState(target);
      }
      if (typeof reconcileOpenModelAfterCustomizationChange === "function") {
        reconcileOpenModelAfterCustomizationChange(current, target);
      }
      // 模板导入生成的字段定义/表号映射不属于自定义快照，需显式清空
      setEDeviceDefinitionTemplateFields({});
      setEDeviceDefinitionTableIds({});
      // 重置对话框基线，避免关闭时的「放弃」或未保存提示恢复到旧的自定义状态
      __appScope.setEDeviceInterfaceDefinitionBaseline?.(null);
      __appScope.setEDeviceInterfaceSelectedClassBaseline?.(null);
      // 退出模板只读模式并清理导入结果展示
      setEDeviceInterfaceLoadedTemplateName("自定义");
      setEDeviceInterfaceReadonlyMode(false);
      setTemplateImportResult(null);
      setShowImportResultDialog(false);
      try {
        localStorage.setItem("eDeviceInterfaceReadonlyMode", "false");
        localStorage.setItem("eDeviceInterfaceLoadedTemplateName", "自定义");
        localStorage.removeItem("eDeviceTemplateImportResult");
      } catch { /* ignore */ }
      writeOperationLog?.("已恢复E文件接口定义为原始定义");
      showGlobalMessage("已恢复E文件接口定义原始状态。");
    } catch (error) {
      showGlobalMessage(error instanceof Error ? error.message : "恢复E文件接口定义原始状态失败。");
    }
  };
  const eDeviceInterfaceSaveMessageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const eDeviceInterfaceSaveRef = useRef<(options?: { closeAfterSave?: boolean }) => void>(() => undefined);
  const eDeviceInterfaceExportFileRef = useRef<() => void>(() => undefined);
  const eDeviceInterfaceSaveAndSwitchRef = useRef<() => void>(() => undefined);
  const eDeviceInterfaceClassSelectRef = useRef<(componentLibrary: string) => void>(() => undefined);
  const selectedEDeviceInterfaceRow =
    eDeviceInterfaceDefinitionRows.find((row) => row.componentLibrary === selectedEDeviceInterfaceComponentLibrary) ??
    eDeviceInterfaceDefinitionRows[0] ??
    null;
  const selectedEDeviceInterfaceFields = selectedEDeviceInterfaceRow
    ? resolveEDeviceInterfaceFieldsForDisplay(
        selectedEDeviceInterfaceRow.componentLibrary,
        selectedEDeviceInterfaceRow.fields,
        eDeviceDefinitionFieldOrder[selectedEDeviceInterfaceRow.componentLibrary] ?? [],
        selectedEDeviceInterfaceRow.isDerivedComponentLibrary
      )
    : [];
  const eDeviceInterfaceClassSwitchTargetRow =
    eDeviceInterfaceDefinitionRows.find((row) => row.componentLibrary === eDeviceInterfaceClassSwitchTarget) ??
    null;
  const eDeviceInterfaceDefinitionTree = useMemo(() => buildEDeviceInterfaceDefinitionTree(eDeviceInterfaceDefinitionRows, libraryTemplates), [eDeviceInterfaceDefinitionRows, libraryTemplates]);
  const eDeviceInterfaceGroupInfo = (() => {
    if (!eDeviceInterfaceSelectedGroupKey) {
      return null;
    }
    const groupKey = eDeviceInterfaceSelectedGroupKey;
    // 检查是否是 category 节点
    const category = eDeviceInterfaceDefinitionTree.find((c) => c.key === groupKey);
    if (category) {
      return {
        key: groupKey,
        label: category.label,
        rows: category.items.map((item) => item.row)
      };
    }
    // 检查是否是 class 分支节点（有子项的设备类）
    if (groupKey.startsWith("class:")) {
      const componentLibrary = groupKey.slice(6);
      for (const cat of eDeviceInterfaceDefinitionTree) {
        for (const item of cat.items) {
          if (item.row.componentLibrary === componentLibrary) {
            if (item.children.length > 0) {
              return {
                key: groupKey,
                label: item.row.label || item.row.componentLibrary,
                rows: item.children.map((child) => child.row ?? child)
              };
            }
            break;
          }
        }
      }
    }
    return null;
  })();
  const eDeviceInterfaceCurrentSignature = eDeviceInterfaceDefinitionSignature(eDeviceInterfaceDefinitionRows);
  const eDeviceInterfaceHasUnsavedChanges = Boolean(
    eDeviceInterfaceDefinitionBaseline &&
    eDeviceInterfaceDefinitionBaseline.signature !== eDeviceInterfaceCurrentSignature
  );
  const eDeviceInterfaceSelectedClassSignature = eDeviceInterfaceClassDefinitionSignature(selectedEDeviceInterfaceRow);
  const eDeviceInterfaceSelectedClassHasUnsavedChanges = Boolean(
    selectedEDeviceInterfaceRow &&
    eDeviceInterfaceSelectedClassBaseline?.componentLibrary === selectedEDeviceInterfaceRow.componentLibrary &&
    eDeviceInterfaceSelectedClassBaseline.signature !== eDeviceInterfaceSelectedClassSignature
  );
  const captureEDeviceInterfaceClassBaseline = (row: any) => {
    if (!row) {
      return null;
    }
    const componentLibrary = String(row.componentLibrary ?? "").trim();
    const hasLabelOverride = Object.prototype.hasOwnProperty.call(eDeviceDefinitionLabels, componentLibrary);
    const hasClassExportOverride = Object.prototype.hasOwnProperty.call(eDeviceDefinitionClassExportEnabled, componentLibrary);
    const hasFieldOrderOverride = Object.prototype.hasOwnProperty.call(eDeviceDefinitionFieldOrder, componentLibrary);
    const rowSnapshot = {
      componentLibrary,
      exportEnabled: Boolean(row.exportEnabled),
      exportName: String(row.exportName ?? componentLibrary).trim(),
      fields: (row.fields ?? []).map((field: any) => ({
        sourceName: String(field?.sourceName ?? "").trim(),
        exportEnabled: Boolean(field?.exportEnabled),
        exportName: String(field?.exportName ?? field?.sourceName ?? "").trim()
      }))
    };
    return {
      componentLibrary,
      signature: eDeviceInterfaceClassDefinitionSignature(rowSnapshot),
      row: rowSnapshot,
      labelOverride: hasLabelOverride ? eDeviceDefinitionLabels[componentLibrary] : undefined,
      classExportOverride: hasClassExportOverride ? eDeviceDefinitionClassExportEnabled[componentLibrary] : undefined,
      fieldOrderOverride: hasFieldOrderOverride ? [...eDeviceDefinitionFieldOrder[componentLibrary]] : undefined
    };
  };
  const captureEDeviceInterfaceDefinitionSnapshot = () => ({
    signature: eDeviceInterfaceCurrentSignature,
    customDeviceTemplates,
    deviceDefinitionOverrides,
    eDeviceDefinitionLabels,
    eDeviceDefinitionClassExportEnabled,
    eDeviceDefinitionFieldOrder
  });
  const runAfterEDeviceInterfaceInputCommit = (callback: () => void) => {
    const activeElement = document.activeElement;
    if (activeElement instanceof HTMLElement && activeElement.closest(".e-device-interface-dialog")) {
      activeElement.blur();
    }
    window.setTimeout(callback, 0);
  };
  const closeEDeviceInterfaceDefinition = () => {
    setEDeviceInterfaceClassSwitchTarget("");
    setEDeviceInterfaceExitPromptOpen(false);
    setEDeviceDefinitionInterfaceDialogOpen(false);
  };
  const saveEDeviceInterfaceDefinition = (options: { closeAfterSave?: boolean } = {}) => {
    const snapshot = captureEDeviceInterfaceDefinitionSnapshot();
    persistDeviceLibraryChange?.({
      customDeviceTemplates: snapshot.customDeviceTemplates,
      deviceDefinitionOverrides: snapshot.deviceDefinitionOverrides,
      eDeviceDefinitionLabels: snapshot.eDeviceDefinitionLabels,
      eDeviceDefinitionClassExportEnabled: snapshot.eDeviceDefinitionClassExportEnabled,
      eDeviceDefinitionFieldOrder: snapshot.eDeviceDefinitionFieldOrder
    }, {
      failure: "E文件接口定义保存到后台失败"
    });
    setEDeviceInterfaceDefinitionBaseline(snapshot);
    setEDeviceInterfaceSaveMessage("E文件接口定义已保存");
    if (eDeviceInterfaceSaveMessageTimerRef.current) {
      clearTimeout(eDeviceInterfaceSaveMessageTimerRef.current);
    }
    eDeviceInterfaceSaveMessageTimerRef.current = setTimeout(() => {
      setEDeviceInterfaceSaveMessage("");
    }, 3000);
    setEDeviceInterfaceSelectedClassBaseline(captureEDeviceInterfaceClassBaseline(selectedEDeviceInterfaceRow));
    setEDeviceInterfaceExitPromptOpen(false);
    writeOperationLog?.("E文件接口定义已保存");
    if (options.closeAfterSave) {
      setEDeviceDefinitionInterfaceDialogOpen(false);
    }
  };
  eDeviceInterfaceSaveRef.current = saveEDeviceInterfaceDefinition;
  eDeviceInterfaceExportFileRef.current = __appScope.exportEDeviceDefinitionFile ?? (() => undefined);
  const requestSaveEDeviceInterfaceDefinition = (options: { closeAfterSave?: boolean } = {}) => {
    runAfterEDeviceInterfaceInputCommit(() => eDeviceInterfaceSaveRef.current(options));
  };
  const requestExportEDeviceInterfaceDefinitionFile = () => {
    runAfterEDeviceInterfaceInputCommit(() => eDeviceInterfaceExportFileRef.current());
  };
  const selectEDeviceInterfaceComponentLibrary = (componentLibrary: string) => {
    const targetRow = eDeviceInterfaceDefinitionRows.find((row) => row.componentLibrary === componentLibrary);
    if (!targetRow) {
      setEDeviceInterfaceClassSwitchTarget("");
      return;
    }
    setSelectedEDeviceInterfaceComponentLibrary(componentLibrary);
    setEDeviceInterfaceSelectedClassBaseline(captureEDeviceInterfaceClassBaseline(targetRow));
    setEDeviceInterfaceClassSwitchTarget("");
  };
  const restoreEDeviceInterfaceSelectedClass = () => {
    const baseline = eDeviceInterfaceSelectedClassBaseline;
    if (!baseline?.row?.componentLibrary) {
      return;
    }
    const componentLibrary = baseline.row.componentLibrary;
    const currentRow = eDeviceInterfaceDefinitionRows.find((row) => row.componentLibrary === componentLibrary);
    setEDeviceDefinitionLabels((current) => {
      const next = { ...current };
      if (baseline.labelOverride === undefined) {
        delete next[componentLibrary];
      } else {
        next[componentLibrary] = baseline.labelOverride;
      }
      return next;
    });
    setEDeviceDefinitionClassExportEnabled((current) => {
      const next = { ...current };
      if (baseline.classExportOverride === undefined) {
        delete next[componentLibrary];
      } else {
        next[componentLibrary] = baseline.classExportOverride;
      }
      return next;
    });
    setEDeviceDefinitionFieldOrder((current) => {
      const next = { ...current };
      if (baseline.fieldOrderOverride === undefined) {
        delete next[componentLibrary];
      } else {
        next[componentLibrary] = [...baseline.fieldOrderOverride];
      }
      return next;
    });
    for (const field of baseline.row.fields ?? []) {
      const currentField = currentRow?.fields?.find((item: any) => item.sourceName === field.sourceName);
      if (!field.sourceName || eDeviceInterfaceFieldDefinitionMatches(currentField, field)) {
        continue;
      }
      updateDefinitionComponentLibraryCommonParamExport(componentLibrary, field.sourceName, {
        exportEnabled: field.exportEnabled,
        exportName: field.exportName
      });
    }
  };
  const discardEDeviceInterfaceClassAndSwitch = () => {
    const target = eDeviceInterfaceClassSwitchTarget;
    restoreEDeviceInterfaceSelectedClass();
    if (target) {
      selectEDeviceInterfaceComponentLibrary(target);
    }
    writeOperationLog?.("已放弃当前设备类的E文件接口定义修改");
  };
  const saveEDeviceInterfaceClassAndSwitch = () => {
    const target = eDeviceInterfaceClassSwitchTarget;
    saveEDeviceInterfaceDefinition();
    if (target) {
      selectEDeviceInterfaceComponentLibrary(target);
    }
  };
  eDeviceInterfaceSaveAndSwitchRef.current = saveEDeviceInterfaceClassAndSwitch;
  eDeviceInterfaceClassSelectRef.current = (componentLibrary: string) => {
    if (!componentLibrary || componentLibrary === selectedEDeviceInterfaceRow?.componentLibrary) {
      setEDeviceInterfaceClassSwitchTarget("");
      return;
    }
    if (eDeviceInterfaceSelectedClassHasUnsavedChanges) {
      setEDeviceInterfaceClassSwitchTarget(componentLibrary);
      return;
    }
    selectEDeviceInterfaceComponentLibrary(componentLibrary);
  };
  const requestSelectEDeviceInterfaceComponentLibrary = (componentLibrary: string) => {
    runAfterEDeviceInterfaceInputCommit(() => eDeviceInterfaceClassSelectRef.current(componentLibrary));
  };
  const moveSelectedEDeviceInterfaceField = (sourceName: string, direction: -1 | 1) => {
    if (!selectedEDeviceInterfaceRow) {
      return;
    }
    const currentOrder = selectedEDeviceInterfaceFields
      .map((field) => String(field?.sourceName ?? "").trim())
      .filter(Boolean);
    const nextOrder = moveEDeviceInterfaceFieldOrder(selectedEDeviceInterfaceFields, sourceName, direction);
    if (nextOrder.every((fieldName, index) => fieldName === currentOrder[index])) {
      return;
    }
    setEDeviceDefinitionFieldOrder((current) => ({
      ...current,
      [selectedEDeviceInterfaceRow.componentLibrary]: nextOrder
    }));
  };
  const discardEDeviceInterfaceDefinitionChanges = () => {
    const baseline = eDeviceInterfaceDefinitionBaseline;
    if (baseline) {
      setCustomDeviceTemplates(baseline.customDeviceTemplates);
      setDeviceDefinitionOverrides(baseline.deviceDefinitionOverrides);
      setEDeviceDefinitionLabels(baseline.eDeviceDefinitionLabels);
      setEDeviceDefinitionClassExportEnabled(baseline.eDeviceDefinitionClassExportEnabled);
      setEDeviceDefinitionFieldOrder(baseline.eDeviceDefinitionFieldOrder);
      persistDeviceLibraryChange?.({
        customDeviceTemplates: baseline.customDeviceTemplates,
        deviceDefinitionOverrides: baseline.deviceDefinitionOverrides,
        eDeviceDefinitionLabels: baseline.eDeviceDefinitionLabels,
        eDeviceDefinitionClassExportEnabled: baseline.eDeviceDefinitionClassExportEnabled,
        eDeviceDefinitionFieldOrder: baseline.eDeviceDefinitionFieldOrder
      }, {
        failure: "放弃E文件接口定义修改时恢复后台数据失败"
      });
    }
    writeOperationLog?.("已放弃E文件接口定义的未保存修改");
    closeEDeviceInterfaceDefinition();
  };
  const requestCloseEDeviceInterfaceDefinition = () => {
    if (eDeviceInterfaceHasUnsavedChanges) {
      setEDeviceInterfaceExitPromptOpen(true);
      return;
    }
    closeEDeviceInterfaceDefinition();
  };
  useEffect(() => {
    if (eDeviceDefinitionInterfaceDialogOpen) {
      setEDeviceInterfaceDefinitionBaseline((current: any) => current ?? captureEDeviceInterfaceDefinitionSnapshot());
      setEDeviceInterfaceSelectedClassBaseline((current: any) =>
        current?.componentLibrary === selectedEDeviceInterfaceRow?.componentLibrary
          ? current
          : captureEDeviceInterfaceClassBaseline(selectedEDeviceInterfaceRow)
      );
      return;
    }
    setEDeviceInterfaceDefinitionBaseline(null);
    setEDeviceInterfaceSelectedClassBaseline(null);
    setEDeviceInterfaceClassSwitchTarget("");
    setEDeviceInterfaceExitPromptOpen(false);
  }, [eDeviceDefinitionInterfaceDialogOpen]);
  useEffect(() => {
    if (!eDeviceDefinitionInterfaceDialogOpen) {
      return undefined;
    }
    const handleEDeviceInterfaceShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        runAfterEDeviceInterfaceInputCommit(() => {
          if (eDeviceInterfaceClassSwitchTarget) {
            eDeviceInterfaceSaveAndSwitchRef.current();
            return;
          }
          eDeviceInterfaceSaveRef.current({ closeAfterSave: eDeviceInterfaceExitPromptOpen });
        });
      }
    };
    window.addEventListener("keydown", handleEDeviceInterfaceShortcut);
    return () => window.removeEventListener("keydown", handleEDeviceInterfaceShortcut);
  }, [
    eDeviceDefinitionInterfaceDialogOpen,
    eDeviceInterfaceClassSwitchTarget,
    eDeviceInterfaceExitPromptOpen,
    eDeviceInterfaceHasUnsavedChanges,
    eDeviceInterfaceCurrentSignature,
    customDeviceTemplates,
    deviceDefinitionOverrides,
    eDeviceDefinitionLabels,
    eDeviceDefinitionClassExportEnabled,
    eDeviceDefinitionFieldOrder
  ]);
  const toggleEDeviceInterfaceTreeNode = (key: string) => {
    setCollapsedEDeviceInterfaceTreeNodes((current) => ({
      ...current,
      [key]: !current[key]
    }));
  };
  const {
    applyIconLibraryCatalogIcon,
    deleteImageAssetFromContextMenu,
    iconLibraryPicker,
    imageAssetContextMenu,
    imagePickerCategoryFilter,
    imagePickerSearchQuery,
    imagePickerSourceFilter,
    setIconLibraryPicker,
    setImageAssetContextMenu,
    setImagePickerCategoryFilter,
    setImagePickerSearchQuery,
    setImagePickerSourceFilter
  } = __appScope;
  const { customDevicePreviewNode } = __appScope;
  const selectedDefinitionDerivedInfo = selectedDefinitionTemplate
    ? templateDerivedComponentLibraryInfo(selectedDefinitionTemplate)
    : null;
  // 派生类主类模板：用于摘要区展示"派生主类"并支持点击跳转
  const selectedDefinitionDerivedBaseTemplate = selectedDefinitionDerivedInfo
    ? (Object.values(filteredDeviceDefinitionByComponentLibrary as Record<string, any[]>) as any[])
      .flatMap((groups) => groups)
      .flatMap((typeGroup: any) => typeGroup.templates ?? [])
      .find((template: any) => resolveTemplateComponentLibrary(template) === selectedDefinitionDerivedInfo.baseComponentLibrary)
    : null;
  const definitionDraftRowsForDisplay = selectedDefinitionTemplate && selectedDefinitionDerivedInfo && typeof __appScope.createDefinitionDraftRows === "function"
    ? resolveDeviceDefinitionParameterRowsForDisplay(definitionDraftRows, __appScope.createDefinitionDraftRows(selectedDefinitionTemplate), {
        baseComponentLibrary: selectedDefinitionDerivedInfo.baseComponentLibrary,
        isDerivedComponentBaseParamName: __appScope.isDerivedComponentBaseParamName
      })
    : definitionDraftRows;
  const selectedDefinitionParameterRowIds: string[] = __appScope.selectedDefinitionParameterRowIds ?? [];
  const selectedDefinitionParameterRowIdSet = new Set(selectedDefinitionParameterRowIds);
  const definitionParameterRowIds = definitionDraftRowsForDisplay.map((row) => row.id);
  const selectDefinitionParameterRow = (rowId: string, event: any) => {
    const result = nextTableRowSelection(
      selectedDefinitionParameterRowIds,
      rowId,
      definitionParameterRowIds,
      __appScope.definitionParameterSelectionAnchorRef.current,
      event
    );
    __appScope.definitionParameterSelectionAnchorRef.current = result.anchorKey;
    __appScope.setSelectedDefinitionParameterRowIds(result.selectedKeys);
  };
  const copySelectedDefinitionParameterRows = () => {
    if (!__appScope.requireEditMode("修改元件定义")) return;
    const selectedRows = definitionDraftRowsForDisplay.filter((row) => selectedDefinitionParameterRowIdSet.has(row.id));
    if (selectedRows.length === 0) return;
    const existingNames = new Set(definitionDraftRows.map((row) => String(row.enName ?? "").trim().toLowerCase()).filter(Boolean));
    const copies = selectedRows.map((row) => {
      const enName = uniqueCopiedFieldName(row.enName, existingNames);
      return {
        ...row,
        id: __appScope.deviceDefinitionRowId(),
        enName,
        readonly: false,
        exportName: enName,
        enumOptions: row.enumOptions?.map((option) => ({ ...option })),
        enumValues: row.enumValues ? [...row.enumValues] : undefined
      };
    });
    const selectedSourceIds = new Set(selectedRows.map((row) => row.id));
    const lastSourceIndex = definitionDraftRows.reduce(
      (lastIndex, row, index) => selectedSourceIds.has(row.id) ? index : lastIndex,
      -1
    );
    const insertIndex = lastSourceIndex >= 0 ? lastSourceIndex + 1 : definitionDraftRows.length;
    __appScope.setDefinitionDraftRows([
      ...definitionDraftRows.slice(0, insertIndex),
      ...copies,
      ...definitionDraftRows.slice(insertIndex)
    ]);
    const copiedIds = copies.map((row) => row.id);
    __appScope.setSelectedDefinitionParameterRowIds(copiedIds);
    __appScope.definitionParameterSelectionAnchorRef.current = copiedIds[0] ?? null;
    __appScope.setDefinitionDraftError("");
  };
  const moveSelectedDefinitionParameterRows = (direction: -1 | 1) => {
    if (!__appScope.requireEditMode("修改元件定义")) return;
    const movedVisibleRows = moveSelectedTableRows(
      definitionDraftRowsForDisplay,
      selectedDefinitionParameterRowIdSet,
      (row) => row.id,
      direction,
      (row) => !row.readonly
    );
    const visibleIds = new Set(definitionDraftRowsForDisplay.map((row) => row.id));
    const movedQueue = [...movedVisibleRows];
    __appScope.setDefinitionDraftRows(definitionDraftRows.map((row) => visibleIds.has(row.id) ? movedQueue.shift()! : row));
    __appScope.setDefinitionDraftError("");
  };
  const deleteSelectedDefinitionParameterRows = () => {
    if (!__appScope.requireEditMode("修改元件定义")) return;
    if (__appScope.definitionDeleteAllParametersRequestedRef) {
      __appScope.definitionDeleteAllParametersRequestedRef.current = false;
    }
    const editableSelectedIds = new Set(
      definitionDraftRowsForDisplay
        .filter((row) => !row.readonly && selectedDefinitionParameterRowIdSet.has(row.id))
        .map((row) => row.id)
    );
    if (editableSelectedIds.size === 0) return;
    __appScope.setDefinitionDraftRows(definitionDraftRows.filter((row) => !editableSelectedIds.has(row.id)));
    const remainingSelection = selectedDefinitionParameterRowIds.filter((id) => !editableSelectedIds.has(id));
    __appScope.setSelectedDefinitionParameterRowIds(remainingSelection);
    if (!remainingSelection.includes(__appScope.definitionParameterSelectionAnchorRef.current)) {
      __appScope.definitionParameterSelectionAnchorRef.current = remainingSelection[0] ?? null;
    }
    __appScope.setDefinitionDraftError("");
  };
  const deleteAllDefinitionParameterRows = () => {
    if (!__appScope.requireEditMode("删除全部参数")) return;
    if (!selectedDefinitionTemplate || selectedDefinitionTemplate.custom || definitionDraftRows.length === 0) return;
    if (!window.confirm(`确认删除“${selectedDefinitionTemplate.label}”的全部参数定义？`)) return;
    __appScope.definitionDeleteAllParametersRequestedRef.current = true;
    __appScope.setDefinitionDraftRows([]);
    __appScope.setSelectedDefinitionParameterRowIds([]);
    __appScope.definitionParameterSelectionAnchorRef.current = null;
    __appScope.setDefinitionDraftError("已标记删除全部参数，点击保存后生效。");
  };
  const selectedDefinitionEditableParameterCount = definitionDraftRowsForDisplay.filter(
    (row) => !row.readonly && selectedDefinitionParameterRowIdSet.has(row.id)
  ).length;
  const customDefaultParamKeySet = new Set(customDraftDefaultParams.map((item) => item.enName.trim().toLowerCase()));
  const customDefaultParamOverrideMap = new Map(customDeviceDraft.params
    .filter((item) => customDefaultParamKeySet.has(item.enName.trim().toLowerCase()))
    .map((item) => [item.enName.trim().toLowerCase(), item]));
  const mergedCustomDefaultParams = customDraftDefaultParams.map((item) => {
    const override = customDefaultParamOverrideMap.get(item.enName.trim().toLowerCase());
    return override
      ? normalizeDefinitionRowEnumFields({
          ...item,
          valueType: override.valueType,
          typicalValue: override.typicalValue,
          enumOptions: override.enumOptions,
          enumValues: override.enumValues,
          readonly: item.readonly,
          ...(typeof override.exportEnabled === "boolean" ? { exportEnabled: override.exportEnabled } : {}),
          ...(typeof override.exportName === "string" ? { exportName: override.exportName } : {})
        })
      : item;
  });
  const visibleCustomParams = customDeviceDraft.params.filter(
    (item) => !customDefaultParamKeySet.has(item.enName.trim().toLowerCase())
  );
  const displayedCustomParameterRows = resolveCustomDeviceParameterRowsForDisplay(mergedCustomDefaultParams, visibleCustomParams, {
    isDerivedComponentLibrary:
      customComponentTreeSelection?.kind !== "componentLibrary" && customDeviceDraft.isDerivedComponentLibrary,
    baseComponentLibrary: customDeviceDraft.derivedFromComponentLibrary || customDeviceDraft.componentLibrary,
    isDerivedComponentBaseParamName: __appScope.isDerivedComponentBaseParamName
  });
  const displayedMergedCustomDefaultParams = displayedCustomParameterRows.defaultRows;
  const displayedVisibleCustomParams = displayedCustomParameterRows.customRows;
  const displayedCustomParameterRowIds = [
    ...displayedMergedCustomDefaultParams.map((row) => `default-${row.enName}`),
    ...displayedVisibleCustomParams.map((row) => row.id)
  ];
  const selectedCustomParameterRowIds: string[] = (__appScope.selectedCustomParameterRowIds ?? [])
    .filter((id: string) => displayedCustomParameterRowIds.includes(id));
  const selectedCustomParameterRowIdSet = new Set(selectedCustomParameterRowIds);
  const selectCustomParameterRow = (rowId: string, event: any) => {
    const result = nextTableRowSelection(
      selectedCustomParameterRowIds,
      rowId,
      displayedCustomParameterRowIds,
      __appScope.customParameterSelectionAnchorRef.current,
      event
    );
    __appScope.customParameterSelectionAnchorRef.current = result.anchorKey;
    __appScope.setSelectedCustomParameterRowIds(result.selectedKeys);
  };
  const updateCustomDefaultParamRow = (rowId: string, patch: Partial<CustomParamDraft>) => {
    const enName = rowId.replace(/^default-/, "");
    const sourceRow = mergedCustomDefaultParams.find((item) => item.enName === enName)
      ?? customDraftDefaultParams.find((item) => item.enName === enName);
    const exportOnlyPatch = Object.keys(patch).every((key) => key === "exportEnabled" || key === "exportName");
    if (!sourceRow || (sourceRow.readonly && !exportOnlyPatch)) return;
    setCustomDeviceDraft((current) => {
      const key = sourceRow.enName.trim().toLowerCase();
      const existing = current.params.find((item) => item.enName.trim().toLowerCase() === key);
      const nextRow = normalizeDefinitionRowEnumFields({
        ...sourceRow,
        ...(existing ?? {}),
        ...patch,
        id: existing?.id ?? customParamId(),
        cnName: sourceRow.cnName,
        enName: sourceRow.enName,
        readonly: sourceRow.readonly
      });
      return {
        ...current,
        params: existing
          ? current.params.map((item) => item.id === existing.id ? nextRow : item)
          : [...current.params, nextRow],
        error: ""
      };
    });
  };
  const addCustomParameterRow = () => {
    const row = {
      id: customParamId(),
      cnName: "",
      enName: "",
      valueType: "string" as DeviceParameterValueType,
      typicalValue: "",
      exportEnabled: false,
      exportName: ""
    };
    setCustomDeviceDraft((current) => ({ ...current, params: [...current.params, row], error: "" }));
    __appScope.setSelectedCustomParameterRowIds([row.id]);
    __appScope.customParameterSelectionAnchorRef.current = row.id;
  };
  const copySelectedCustomParameterRows = () => {
    const defaultRows = displayedMergedCustomDefaultParams
      .filter((row) => selectedCustomParameterRowIdSet.has(`default-${row.enName}`));
    const customRows = displayedVisibleCustomParams.filter((row) => selectedCustomParameterRowIdSet.has(row.id));
    const sourceRows = [...defaultRows, ...customRows];
    if (sourceRows.length === 0) return;
    const existingNames = new Set([
      ...customDraftDefaultParams.map((row) => row.enName),
      ...customDeviceDraft.params.map((row) => row.enName)
    ].map((name) => String(name ?? "").trim().toLowerCase()).filter(Boolean));
    const copies = sourceRows.map((row) => {
      const enName = uniqueCopiedFieldName(row.enName, existingNames);
      return {
        ...row,
        id: customParamId(),
        enName,
        readonly: false,
        exportName: enName,
        enumOptions: row.enumOptions?.map((option) => ({ ...option })),
        enumValues: row.enumValues ? [...row.enumValues] : undefined
      };
    });
    const selectedCustomIds = new Set(customRows.map((row) => row.id));
    const lastSourceIndex = customDeviceDraft.params.reduce(
      (lastIndex, row, index) => selectedCustomIds.has(row.id) ? index : lastIndex,
      -1
    );
    const insertIndex = lastSourceIndex >= 0 ? lastSourceIndex + 1 : customDeviceDraft.params.length;
    setCustomDeviceDraft((current) => ({
      ...current,
      params: [...current.params.slice(0, insertIndex), ...copies, ...current.params.slice(insertIndex)],
      error: ""
    }));
    const copiedIds = copies.map((row) => row.id);
    __appScope.setSelectedCustomParameterRowIds(copiedIds);
    __appScope.customParameterSelectionAnchorRef.current = copiedIds[0] ?? null;
  };
  const moveSelectedCustomParameterRows = (direction: -1 | 1) => {
    const movedVisibleRows = moveSelectedTableRows(
      displayedVisibleCustomParams,
      selectedCustomParameterRowIdSet,
      (row) => row.id,
      direction
    );
    const visibleIds = new Set(displayedVisibleCustomParams.map((row) => row.id));
    const movedQueue = [...movedVisibleRows];
    setCustomDeviceDraft((current) => ({
      ...current,
      params: current.params.map((row) => visibleIds.has(row.id) ? movedQueue.shift()! : row),
      error: ""
    }));
  };
  const deleteSelectedCustomParameterRows = () => {
    const selectedEditableIds = new Set(displayedVisibleCustomParams
      .filter((row) => selectedCustomParameterRowIdSet.has(row.id))
      .map((row) => row.id));
    if (selectedEditableIds.size === 0) return;
    setCustomDeviceDraft((current) => ({
      ...current,
      params: current.params.filter((row) => !selectedEditableIds.has(row.id)),
      error: ""
    }));
    const remainingSelection = selectedCustomParameterRowIds.filter((id) => !selectedEditableIds.has(id));
    __appScope.setSelectedCustomParameterRowIds(remainingSelection);
    if (!remainingSelection.includes(__appScope.customParameterSelectionAnchorRef.current)) {
      __appScope.customParameterSelectionAnchorRef.current = remainingSelection[0] ?? null;
    }
  };
  const selectedCustomEditableParameterCount = displayedVisibleCustomParams.filter(
    (row) => selectedCustomParameterRowIdSet.has(row.id)
  ).length;
  // 当前分类下所有派生元件库名称集合（小写），用于从主类选项中排除已派生的库
  const currentCategoryDerivedComponentLibraryNameSet = new Set<string>();
  const targetCategory = normalizeCategoryLibraryName(customDeviceDraft.categoryLibraryName || "").toLowerCase();
  for (const item of customComponentLibraries ?? []) {
    if (!item.isDerivedComponentLibrary) continue;
    const categoryLibraryName = normalizeCategoryLibraryName(item.categoryLibraryName ?? "").toLowerCase();
    if (categoryLibraryName !== targetCategory) continue;
    const name = normalizeComponentLibraryName(item.name ?? "").toLowerCase();
    if (name) currentCategoryDerivedComponentLibraryNameSet.add(name);
  }
  for (const template of libraryTemplates ?? []) {
    const info = templateDerivedComponentLibraryInfo(template);
    if (!info) continue;
    const categoryLibraryName = normalizeCategoryLibraryName(info.categoryLibrary || template.categoryLibrary || "").toLowerCase();
    if (categoryLibraryName !== targetCategory) continue;
    currentCategoryDerivedComponentLibraryNameSet.add(normalizeComponentLibraryName(info.derivedComponentLibrary).toLowerCase());
  }
  const customDeviceBaseComponentLibraryOptions = customDeviceDraft.isDerivedComponentLibrary
    ? currentCategoryLibraryComponentLibraryOptions.filter((section) => !currentCategoryDerivedComponentLibraryNameSet.has(normalizeComponentLibraryName(section).toLowerCase()))
    : currentCategoryLibraryComponentLibraryOptions;
  const customLibraryCreateDialogCategoryLibraryName = normalizeCategoryLibraryName(
    customLibraryCreateDialog?.categoryLibraryName || customDeviceDraft.categoryLibraryName || ""
  );
  const selectedComponentLibraryFamilyClassName = normalizeComponentLibraryName(
    customComponentTreeSelection?.kind === "componentLibrary" || customComponentTreeSelection?.kind === "component"
      ? customComponentTreeSelection.section
      : customLibraryCreateDialog?.componentClassName ||
        customDeviceDraft.derivedComponentLibrary ||
        customDeviceDraft.componentLibrary ||
        ""
  );
  const customLibraryCreateDialogFamilyMetadata = resolveComponentLibraryClassFamilyMetadata(
    selectedComponentLibraryFamilyClassName,
    customLibraryCreateDialogCategoryLibraryName,
    customComponentLibraries,
    libraryTemplates
  );
  const customLibraryCreateDialogBaseComponentLibraryOptions = customLibraryCreateDialogFamilyMetadata
    .map((metadata) => metadata.className);
  const customLibraryCreateDialogClassOptions: Array<{
    className: string;
    label: string;
    baseComponentLibrary: string;
    isDerivedComponentLibrary: boolean;
  }> = customLibraryCreateDialogFamilyMetadata.map((metadata) => ({
    className: metadata.className,
    label: componentLibraryDisplayParts(metadata.className, customComponentLibraries).title,
    baseComponentLibrary: metadata.baseComponentLibrary,
    isDerivedComponentLibrary: metadata.isDerivedComponentLibrary
  }));
  const customLibraryCreateDialogSelectedClassName = normalizeComponentLibraryName(
    customLibraryCreateDialog?.componentClassName ||
    customLibraryCreateDialog?.derivedComponentLibrary ||
    customLibraryCreateDialog?.componentLibrary ||
    ""
  );
  const customDeviceClassName = normalizeComponentLibraryName(
    customDeviceDraft.isDerivedComponentLibrary
      ? customDeviceDraft.derivedComponentLibrary
      : customDeviceDraft.componentLibrary
  );
  const customDeviceClassDisplay = componentLibraryDisplayParts(customDeviceClassName, customComponentLibraries);
  const renderCustomDevicePreviewContent = (clipId = "custom-device-preview-clip") => {
    const fallbackPreviewNode = {
      id: "custom-device-preview-fallback",
      kind: "custom-device-preview",
      name: customDeviceDraft.componentName.trim() || customDeviceDraft.componentLibrary || "Unit",
      layerId: DEFAULT_MODEL_LAYER_ID,
      nodeNumber: "",
      acTopologyNode: 0,
      dcTopologyNode: 0,
      position: { x: 0, y: 0 },
      size: { width: customDevicePreviewWidth, height: customDevicePreviewHeight },
      rotation: 0,
      scale: 1,
      scaleX: 1,
      scaleY: 1,
      terminals: [],
      params: {
        fillColor: "transparent",
        strokeColor: "transparent",
        lineWidth: "0",
        backgroundImage: "",
        backgroundImageAssetId: "",
        foregroundImage: "",
        foregroundImageAssetId: ""
      }
    };
    const previewNode = customDevicePreviewNode ?? fallbackPreviewNode;
    const previewFrameNode = {
      ...previewNode,
      size: { width: customDevicePreviewWidth, height: customDevicePreviewHeight }
    };
    const previewStateVisual = customStatePreviewVisual ?? resolveNodeStateVisual(previewFrameNode);
    const previewImageHref = customDevicePreviewImage;
    const previewForegroundHref = customDevicePreviewNode ? nodeForegroundImage(previewFrameNode) : "";
    const previewUsesStateImage = Boolean(
      customStatePreviewVisual?.image ||
      customStatePreviewVisual?.imageAssetId ||
      customStatePreviewVisual?.backgroundImage ||
      customStatePreviewVisual?.backgroundImageAssetId
    );
    const previewImageFit = normalizeImageFitMode(
      previewUsesStateImage
        ? customStatePreviewVisual?.imageFit ?? customStatePreviewVisual?.backgroundImageFit ?? "fixed"
        : customDeviceDraft.backgroundImageFit
    );
    return (
      <>
        <g className="node-geometry" transform={nodeGeometryTransform(previewFrameNode)}>
          <MemoDeviceGlyph node={previewFrameNode} mode="geometry" colorDisplayMode={colorDisplayMode} colorPalette={colorPalette} stateVisual={previewStateVisual}/>
          <MemoDeviceGlyph node={previewFrameNode} mode="text" colorDisplayMode={colorDisplayMode} colorPalette={colorPalette} stateVisual={previewStateVisual}/>
        </g>
        {renderNodePreviewImageContent(previewFrameNode, clipId, {
          imageHref: previewImageHref,
          foregroundImageHref: previewForegroundHref,
          imageFit: previewImageFit
        })}
      </>
    );
  };
  const keepTemplateContextMenuFlyoutOpen = (typeName?: string) => {
    if (!typeName) {
      return;
    }
    clearLibraryFlyoutCloseTimer();
    setHoveredGraphTemplateType(typeName);
  };
  const requestSelectCustomCategoryLibrary = (categoryLibraryName: string, options: { expand?: boolean } = {}) =>
    requestCustomDeviceDraftAction(
      () => selectCustomCategoryLibrary(categoryLibraryName, options),
      {
        kind: "switch-selection",
        actionLabel: `切换到类别库“${categoryLibraryName}”`,
        targetLabel: categoryLibraryName
      }
    );
  const requestSelectCustomComponentLibrary = (
    categoryLibraryName: string,
    sectionName: string,
    options: { expand?: boolean } = {}
  ) => requestCustomDeviceDraftAction(
    () => selectCustomComponentLibrary(categoryLibraryName, sectionName, options),
    {
      kind: "switch-selection",
      actionLabel: `切换到类“${sectionName}”`,
      targetLabel: sectionName
    }
  );
  const requestSelectCustomComponentTemplate = (template: DeviceTemplate, sectionName?: string) =>
    requestCustomDeviceDraftAction(
      () => selectCustomComponentTemplate(template, sectionName),
      {
        kind: "switch-selection",
        actionLabel: `切换到元件“${template.label || template.englishName || template.kind}”`,
        targetLabel: template.label || template.englishName || template.kind
      }
    );
  const customDeviceDefinitionIconOnly = customDeviceDefinitionUsesIconOnly(customComponentTreeSelection, customDeviceDraft);
  const visibleCustomDeviceDialogView = customDeviceDefinitionIconOnly ? "icon" : customDeviceDialogView;
  const customDeviceIconDirty = Boolean(customDeviceDialogOpen && customDeviceDraftHasUnsavedChanges("icon"));
  const customDeviceParametersDirty = Boolean(customDeviceDialogOpen && customDeviceDraftHasUnsavedChanges("parameters"));
  const customDeviceMeasurementsDirty = Boolean(customDeviceDialogOpen && customDeviceDraftHasUnsavedChanges("measurements"));
  const customDeviceHasUnsavedChanges = customDeviceIconDirty || customDeviceParametersDirty || customDeviceMeasurementsDirty;
  const showComponentLibraryTerminalTypes =
    !customDeviceDefinitionIconOnly &&
    customComponentTreeSelection?.kind === "componentLibrary" &&
    !customDeviceDraft.isDerivedComponentLibrary &&
    customDeviceDraft.terminalCount > 0;
  const showCustomDeviceInheritanceNote =
    !customDeviceDefinitionIconOnly &&
    customComponentTreeSelection?.kind === "componentLibrary" &&
    customDeviceDraft.isDerivedComponentLibrary;
  useEffect(() => {
    if (customDeviceDefinitionIconOnly && customDeviceDialogView !== "icon") {
      setCustomDeviceDialogView("icon");
    }
  }, [customDeviceDefinitionIconOnly, customDeviceDialogView, setCustomDeviceDialogView]);
  const imagePickerUsesCatalogSource = imageTarget?.kind === "stateIconDrawing" && imageTarget.sourceMode === "catalogOnly";
  const imagePickerUsesSeparateLibraryTabs = imagePickerUsesLibraryTabs(imageTarget);
  const imagePickerActiveLibraryTab: ImagePickerLibraryTab = imagePickerUsesSeparateLibraryTabs && imagePickerSourceFilter === "icon-library" ? "icon" : "image";
  const imagePickerUsesCatalogTab = imagePickerUsesSeparateLibraryTabs && imagePickerActiveLibraryTab === "icon";
  const imagePickerUsesIconSources = imageTarget?.kind === "canvasIcon" || (imageTarget?.kind === "stateIconDrawing" && !imagePickerUsesCatalogSource);
  const imagePickerLockedSourceMode = imageTarget?.kind === "stateIconDrawing" ? imageTarget.sourceMode ?? "" : "";
  const imagePickerSourceLocked = imagePickerLockedSourceMode === "builtinOnly" || imagePickerLockedSourceMode === "externalOnly" || imagePickerLockedSourceMode === "catalogOnly";
  const imagePickerActiveSourceFilter = imagePickerUsesIconSources
    ? imagePickerLockedSourceMode === "externalOnly"
      ? "external"
      : imagePickerLockedSourceMode === "builtinOnly"
        ? "builtin"
        : imagePickerLockedSourceMode === "catalogOnly"
          ? "catalog"
          : imagePickerSourceFilter === "external" ? "external" : imagePickerSourceFilter === "catalog" ? "catalog" : "builtin"
    : "builtin";
  const imagePickerUsesIconSourcesCatalog = imagePickerUsesIconSources && imagePickerActiveSourceFilter === "catalog";
  Object.assign(__appScope, { imagePickerUsesIconSourcesCatalog });
  const imagePickerRendersCatalogSource = imagePickerUsesCatalogSource || imagePickerUsesCatalogTab || imagePickerUsesIconSourcesCatalog;
  const imagePickerShowsLibraryActions = !imagePickerRendersCatalogSource && (!imagePickerSourceLocked || imagePickerLockedSourceMode === "externalOnly");
  const imagePickerTitle =
    imageTarget?.kind === "canvas"
      ? "选择模型背景图片"
      : imageTarget?.kind === "stateIconFrameBackground"
        ? "选择图案背景图片"
      : imageTarget?.kind === "nodeForeground"
        ? "选择设备前景图片"
        : imageTarget?.kind === "canvasIcon"
          ? "分类图标库"
        : imagePickerUsesCatalogSource
          ? "分类图标"
          : imageTarget?.kind === "stateIconDrawing"
            ? "选择元件图标素材"
            : "选择设备图片";
  const imagePickerHint =
    imageTarget?.kind === "canvasIcon"
      ? "内置 SVG 通过下方列表选择；外部 SVG/PNG 可直接导入，文档图片/图标导入会抽取图片并将可识别矢量图形转成 SVG 素材。"
      : imagePickerUsesSeparateLibraryTabs
        ? "图片(含SVG)从后台图片库读取；图标从分类图标库读取。切换分页后再选择要应用的资源。"
      : imageTarget?.kind === "stateIconDrawing" && imageTarget.sourceMode === "builtinOnly"
        ? "从内置 SVG 分类中选择图标，选择后插入当前元件图标编辑区。"
      : imageTarget?.kind === "stateIconDrawing" && imageTarget.sourceMode === "externalOnly"
          ? "从已导入的外部 SVG/PNG 分类中选择图标，选择后插入当前元件图标编辑区。"
        : imagePickerUsesCatalogSource
          ? "从 icon-library 按图库和分类检索 SVG 图标；清单按需加载并缓存，选择后插入当前元件图标编辑区。"
          : imageTarget?.kind === "stateIconDrawing"
            ? "内置 SVG 通过下方列表选择；外部 SVG/PNG 可直接导入，文档图片/图标导入会抽取图片并将可识别矢量图形转成 SVG 素材。"
        : "本地图片会先上传到后台图片库；请再从后台可用图片列表中选择应用。";
  const imagePickerCanClear = imageTarget && imageTarget.kind !== "canvasIcon" && imageTarget.kind !== "stateIconDrawing";
  // 从当前模型生成 E 文件记录（用于查看/编辑）
  const [eFileEditorRecords, setEFileEditorRecords] = useState<EDeviceExport[]>([]);
  // 与导出共用同一套接口定义选项：当 E 文件接口定义来自文件或预定义模板时，
  // 查看/编辑展示的即为模板规格的 E 文件（表名、字段列、取值与导出完全一致）
  const eFileEditorExportOptions = useMemo(
    () => buildEFileExportOptionsFromLibrary({
      libraryTemplates,
      labels: PARAM_LABELS,
      eDeviceDefinitionLabels,
      eDeviceDefinitionClassExportEnabled,
      eDeviceDefinitionFieldOrder,
      eDeviceDefinitionTableIds,
      eDeviceDefinitionTemplateFields,
      templateName: eDeviceInterfaceLoadedTemplateName,
      resolveDefinitionComponentLibrary: resolveTemplateComponentLibrary
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [libraryTemplates, eDeviceDefinitionLabels, eDeviceDefinitionClassExportEnabled, eDeviceDefinitionFieldOrder, eDeviceDefinitionTableIds, eDeviceDefinitionTemplateFields, eDeviceInterfaceLoadedTemplateName]
  );
  // 类 -> 模板输出表名（如 ACGenerator -> unit、ACNode -> node），供 E 文件编辑器按模板规格展示
  const eFileEditorSectionLabels = useMemo(() => {
    const labelBySection = new Map<string, string>();
    for (const [componentLibrary, label] of Object.entries(eDeviceDefinitionLabels ?? {})) {
      if (label && label !== componentLibrary) {
        labelBySection.set(componentLibrary, label);
      }
    }
    for (const definition of eFileEditorExportOptions.interfaceDefinitions ?? []) {
      const componentLibrary = String(definition.componentLibrary ?? "").trim();
      const outputLabel = String(definition.exportName ?? "").trim()
        || labelBySection.get(componentLibrary)
        || componentLibrary;
      if (componentLibrary && outputLabel) {
        labelBySection.set(componentLibrary, outputLabel);
      }
    }
    return labelBySection;
  }, [eFileEditorExportOptions, eDeviceDefinitionLabels]);
  // E 文件编辑器表头 tooltip 的字段中文名：读取模板文件中的中文注释（cnName）。
  // 来源优先 eDeviceDefinitionTemplateFields（含 aclineend/dclineend 等独立运行时表），
  // 其次 interfaceDefinitions（设备库行字段的 cnName 已被模板注释覆盖）。
  const eFileEditorFieldCnNames = useMemo(() => {
    const cnBySection: Record<string, Record<string, string>> = {};
    const setField = (section: string, exportName: string, cnName: string) => {
      const key = String(section ?? "").trim();
      const col = String(exportName ?? "").trim();
      const label = String(cnName ?? "").trim();
      if (!key || !col || !label || label === col) {
        return;
      }
      (cnBySection[key] ??= {})[col] = label;
    };
    for (const [section, fields] of Object.entries(eFileEditorExportOptions.eDeviceDefinitionTemplateFields ?? {})) {
      for (const field of fields ?? []) {
        setField(section, String(field.exportName ?? "").trim(), String(field.cnName ?? "").trim());
      }
    }
    for (const definition of eFileEditorExportOptions.interfaceDefinitions ?? []) {
      const section = String(definition.componentLibrary ?? "").trim();
      if (!section) continue;
      for (const field of definition.fields ?? []) {
        setField(section, String(field.exportName ?? "").trim(), String(field.cnName ?? "").trim());
      }
    }
    return cnBySection;
  }, [eFileEditorExportOptions]);
  useEffect(() => {
    if (!eFileEditorDialogOpen) return;
    try {
      // 使用完整项目（含 powerBaseValue/subcontrolarea/substation/名称/单位等），保证头表取值与导出一致
      const project = (typeof __appScope.currentProject === "function"
        ? __appScope.currentProject()
        : { nodes: __appScope.nodes ?? [], edges: __appScope.edges ?? [] });
      const schemePath = typeof __appScope.schemePathForScheme === "function"
        ? __appScope.schemePathForScheme(__appScope.activeSchemeKey)
        : ["默认方案"];
      const records = buildEDeviceRecords(project, eFileEditorExportOptions);
      // 头表（basevalue/basevoltage/subcontrolarea/substation 或 Model）为系统表，随项目设置生成，只读展示
      const headerRecords = buildEDeviceHeaderParameterRecords(project, records, eFileEditorExportOptions, schemePath);
      const headerSectionSet = new Set(headerRecords.map((record) => record.section));
      // 按导出顺序排列（头表在前，设备表按 E_SECTION_OUTPUT_ORDER），Tab 顺序与导出的 E 文件一致
      const orderedRecords = [...headerRecords, ...orderEDeviceRecordsForExport(records)];
      // 引用字段（st_id/bv_id 等指向其他表 id）同步为目标表计算 id，与导出文件一致，
      // 使 E 文件编辑器中这些字段悬浮出现「跳转」按钮（按大 id 还原行号跳转）
      applyEReferenceIdValues(project, orderedRecords, eFileEditorExportOptions);
      setEFileEditorRecords(orderedRecords.map((record) => {
        const sectionLabel = eFileEditorSectionLabels.get(record.section);
        const next: EDeviceExport & { sectionLabel?: string; readonly?: boolean } = { ...record };
        if (sectionLabel && sectionLabel !== record.section) {
          // section 保持类内部名（供跳转/保存反向映射），sectionLabel 为模板输出表名（供展示）
          next.sectionLabel = sectionLabel;
        }
        if (headerSectionSet.has(record.section)) {
          next.readonly = true;
        }
        return next;
      }));
    } catch (error) {
      console.error("[EFileEditor] Error generating records:", error);
      setEFileEditorRecords([]);
    }
  }, [eFileEditorDialogOpen, eFileEditorExportOptions, eFileEditorSectionLabels]);
  // ESC 键关闭 E 文件编辑器
  useEffect(() => {
    if (!eFileEditorDialogOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setEFileEditorDialogOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [eFileEditorDialogOpen]);
  // ESC 键关闭图片选择器弹窗（document 级别监听）
  useEffect(() => {
    if (!imageTarget) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setImageAssetContextMenu(null);
        setImagePickerSourceFilter("");
        setImagePickerCategoryFilter("");
        setImagePickerSearchQuery("");
        setImageTarget(null);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [imageTarget]);
  // ESC 键关闭弹窗（document 级别监听）
  useEffect(() => {
    if (!libraryPackageDialogOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeLibraryPackageDialog();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [libraryPackageDialogOpen]);
  useEffect(() => {
    if (!voltageBaseClearDialogOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setVoltageBaseClearDialogOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [voltageBaseClearDialogOpen]);
  useEffect(() => {
    if (!voltageBaseSetDialogOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setVoltageBaseSetDialogOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [voltageBaseSetDialogOpen]);
  useEffect(() => {
    if (!connectionRedrawDialogOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setConnectionRedrawDialogOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [connectionRedrawDialogOpen]);
  useEffect(() => {
    if (!filterSelectionDialogOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFilterSelectionDialogOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [filterSelectionDialogOpen]);
  useEffect(() => {
    if (!customDeviceDialogOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") requestCloseCustomDeviceDialog();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [customDeviceDialogOpen]);
  useEffect(() => {
    if (!customDeviceDialogOpen) return;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!customDeviceDraftHasUnsavedChanges()) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [customDeviceDialogOpen, customDeviceDraft, customDeviceTerminalAnchors]);
  useEffect(() => {
    if (!eDeviceDefinitionInterfaceDialogOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") requestCloseEDeviceInterfaceDefinition();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [eDeviceDefinitionInterfaceDialogOpen]);
  useEffect(() => {
    if (!deviceDefinitionDialogOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeDeviceDefinitionDialog();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [deviceDefinitionDialogOpen]);
  useEffect(() => {
    if (!layerAssignmentDialogOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setLayerAssignmentDialogOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [layerAssignmentDialogOpen]);
  useEffect(() => {
    if (!measurementConfigDialogOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMeasurementConfigDialog();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [measurementConfigDialogOpen]);
  useEffect(() => {
    if (!colorPaletteDialogOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setColorPaletteDialogOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [colorPaletteDialogOpen]);
  useEffect(() => {
    if (!unsavedChangesDialogOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setUnsavedChangesDialogOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [unsavedChangesDialogOpen]);
  useEffect(() => {
    if (!pendingRecordPasteConflict) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") resolveRecordPasteConflict("cancel");
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [pendingRecordPasteConflict]);
  const sourceFilteredImageAssetList = imagePickerUsesIconSources
    ? imagePickerActiveSourceFilter === "catalog"
      ? []
      : (imageAssetList ?? []).filter((asset) => imagePickerActiveSourceFilter === "builtin" ? imagePickerAssetIsBuiltinIcon(asset) : !imagePickerAssetIsBuiltinIcon(asset))
    : imagePickerUsesSeparateLibraryTabs
      ? imagePickerAssetsForLibraryTab(imageAssetList ?? [], imagePickerActiveLibraryTab)
      : (imageAssetList ?? []);
  const imagePickerAssetNoun = imagePickerUsesSeparateLibraryTabs && imagePickerActiveLibraryTab === "image" ? "图片" : "图标";
  const imagePickerFolderNameById = new Map((imageFolders ?? []).map((folder) => [folder.id, folder.name]));
  const imagePickerAssetCategory = (asset: any) => {
    const assetName = String(asset?.name ?? "").trim();
    const separatedParts = assetName.split(/\s+\/\s+/u).map((part) => part.trim()).filter(Boolean);
    if (separatedParts.length > 1) {
      return separatedParts.slice(0, -1).join(" / ");
    }
    const folderName = imagePickerFolderNameById.get(asset?.folderId);
    if (folderName && asset?.folderId !== "root") {
      return folderName;
    }
    return String(asset?.mimeType ?? "").includes("svg") || String(asset?.filename ?? "").toLowerCase().endsWith(".svg")
      ? "SVG图标"
      : "图片素材";
  };
  const imagePickerCategoryOptions = Array.from(new Set(sourceFilteredImageAssetList.map((asset) => imagePickerAssetCategory(asset)))).sort((left, right) =>
    left.localeCompare(right, "zh-Hans-CN")
  );
  const imagePickerActiveCategoryFilter = imagePickerCategoryOptions.includes(imagePickerCategoryFilter) ? imagePickerCategoryFilter : "";
  const normalizedImagePickerSearchQuery = String(imagePickerSearchQuery ?? "").trim().toLowerCase();
  const filteredImageAssetList = sourceFilteredImageAssetList.filter((asset) => {
    const category = imagePickerAssetCategory(asset);
    if (imagePickerActiveCategoryFilter && category !== imagePickerActiveCategoryFilter) {
      return false;
    }
    if (!normalizedImagePickerSearchQuery) {
      return true;
    }
    const folderName = imagePickerFolderNameById.get(asset?.folderId) ?? "";
    const haystack = [
      asset?.name,
      asset?.filename,
      asset?.id,
      asset?.folderId,
      asset?.mimeType,
      category,
      folderName
    ]
      .map((value) => String(value ?? "").toLowerCase())
      .join(" ");
    return haystack.includes(normalizedImagePickerSearchQuery);
  });
  const imagePickerDialogClassName = [
    "image-picker-dialog",
    imagePickerUsesIconSources ? "icon-library" : "",
    imagePickerUsesSeparateLibraryTabs ? "image-library-tabs" : "",
    imagePickerRendersCatalogSource ? "icon-library catalog-icon-library" : "",
    imagePickerUsesIconSources && imagePickerActiveSourceFilter === "external" ? "external-icon-library" : "",
    imagePickerSourceLocked ? "source-locked-icon-library" : ""
  ].filter(Boolean).join(" ");
  const iconLibraryCatalog = iconLibraryPicker?.catalog ?? null;
  const iconLibraryLibraries = iconLibraryCatalog?.libraries ?? [];
  const iconLibrarySelectedLibraryId = iconLibraryPicker?.selectedLibraryId ?? "";
  const iconLibraryCategoryOptions = iconLibraryCategoriesForSelection(iconLibraryCatalog, iconLibrarySelectedLibraryId);
  const iconLibraryVisibleResult = visibleIconLibraryIcons(
    iconLibraryPicker?.entries ?? [],
    {
      libraryId: iconLibrarySelectedLibraryId,
      categoryKey: iconLibraryPicker?.selectedCategoryKey ?? "",
      query: iconLibraryPicker?.searchQuery ?? ""
    },
    iconLibraryPicker?.visibleCount ?? ICON_LIBRARY_PAGE_SIZE
  );
  const iconLibraryRequestedTotal =
    iconLibrarySelectedLibraryId
      ? iconLibraryLibraries.find((library) => library.id === iconLibrarySelectedLibraryId)?.totalIcons
      : iconLibraryCatalog?.totalIcons;
  const iconLibraryLoadedText = `${iconLibraryVisibleResult.total} / ${iconLibraryPicker?.entries?.length ?? 0}${typeof iconLibraryRequestedTotal === "number" ? ` / ${iconLibraryRequestedTotal}` : ""}`;
  const inspectorTopologyEntry = inspectorSelectedNode
    ? resolveInspectorTopologyEntry(topology, __appScope.inspectorTopology, inspectorSelectedNode.id)
    : undefined;
  const inspectorGraphId = inspectorSelectedNode
    ? resolveInspectorGraphId(nodes, inspectorSelectedNode)
    : "";
  Object.assign(__appScope, {
    ALLOW_RESIZE_TRANSFORM_PARAM,
    CURRENT_UNIT_OPTIONS,
    DEFAULT_CANVAS_BACKGROUND,
    DEFAULT_DEVICE_LABEL_FONT_SIZE,
    DEFAULT_MODEL_LAYER_ID,
    DEFAULT_POWER_BASE_VALUE,
    IMAGE_FIT_MODE_OPTIONS,
    MAX_CANVAS_HEIGHT,
    MAX_CANVAS_WIDTH,
    MIN_CANVAS_HEIGHT,
    MIN_CANVAS_WIDTH,
    PARAM_LABELS,
    POWER_UNIT_OPTIONS,
    READONLY_E_PARAM_KEYS,
    STATIC_ROUTE_AVOIDANCE_PARAM,
    VOLTAGE_UNIT_OPTIONS,
    activeSelectedNodeIds,
    allowAutoExpandCanvas,
    backgroundLayerIds,
    backgroundLayerOptions,
    backgroundProjectId,
    backgroundProjectOptions,
    backgroundProjectRecord,
    batchEditors,
    canvasBackgroundColor,
    canvasBackgroundImage,
    canvasSizeDraft,
    clearSelectedImageForNode,
    colorPalette,
    commitCanvasSizeDraft,
    currentModelRecord,
    currentUnit,
    customComponentLibraries,
    defaultBackgroundLayerIdsForProject,
    deviceDefinitionOverrides,
    enumSelectOptionsWithCurrentValue,
    feeder,
    formatDeviceModelParamDisplayValue,
    formatInspectorScaleValue,
    getEParamValue,
    getEParameterKeys,
    getNodeScaleX,
    getNodeScaleY,
    handleSidePanelPointerLeave,
    hasBatchCommonPropertyRows,
    inspectorGraphId,
    inspectorSelectedEdge,
    inspectorSelectedNode,
    inspectorTab,
    inspectorTabShowsDevicePanel,
    inspectorTopologyEntry,
    invalidEnumOptionLabel,
    isBrowseMode,
    isBusNode,
    isStaticBoxLikeNode,
    layers,
    libraryTemplates,
    modelAssociationDevicesModelTypeFailureMessage,
    modelType,
    nodeById,
    nodeKindAllowsResizeTransform,
    nodeLabelDisplayMode,
    nodeLabelOffset,
    nodeLabelTextAnchor,
    nodes,
    normalizeImageFitMode,
    normalizeNodeLabelRotation,
    normalizeScale,
    normalizeStaticBoxDimension,
    paramOptionsForSection,
    parseCustomDefinitions,
    powerBaseValue,
    powerUnit,
    projectById,
    projectName,
    pushUndoSnapshot,
    renderElementTreePanel,
    renderSelectedNodeMeasurementTable,
    renderSidePanelModeControls,
    resolveContainerParameterViewComponentLibrary,
    resolveDeviceModelPanelDefinitionGroups,
    resolveDeviceModelPanelDevType,
    resolveDeviceModelPanelParameterKeys,
    rightPanelRef,
    rightPanelVisible,
    selectedContainerParameterView,
    selectedContainerParameterViews,
    selectedDeviceInfoView,
    selectedSchemeRecord,
    setAllowAutoExpandCanvas,
    setBackgroundLayerIds,
    setBackgroundProjectId,
    setCanvasBackgroundColor,
    setCanvasBackgroundImage,
    setCanvasBackgroundImageAssetId,
    setContainerParamViewId,
    setCurrentUnit,
    setFeeder,
    setImageTarget,
    setInspectorTab,
    setModelType,
    setPowerBaseValue,
    setPowerUnit,
    setSelectedDeviceInfoView,
    setSubcontrolarea,
    setSubstation,
    setTaiqu,
    setVoltageUnit,
    singleSelectedDeviceForInspector,
    startSidePanelResize,
    staticNodeParticipatesInRoutingAvoidance,
    stopSidePanelEventPropagation,
    subcontrolarea,
    substation,
    taiqu,
    terminalColor,
    terminalVbaseFallback,
    terminalVoltageBaseNumber,
    toggleBackgroundLayer,
    updateAutoPanelVisibility,
    updateParam,
    updateSelectedNode,
    updateTerminalVbase,
    voltageUnit
  });
  const contextMenuLayerActive = Boolean(contextMenu || projectMenu || templateMenu);
  const projectDialogLayerActive = Boolean(
    libraryPackageDialogOpen ||
    globalLinePlacementDialog ||
    globalLineTransitionDialog ||
    __appScope.userCustomizationManagerOpen ||
    measurementConfigDialogOpen ||
    __appScope.measurementEditorDialog ||
    pendingRecordPasteConflict ||
    pendingModelImportConflict ||
    pendingSchemeImportConflict ||
    pendingUnsavedAction ||
    unsavedChangesDialogOpen
  );
  const canvasDialogLayerActive = Boolean(
    voltageBaseSetDialogOpen ||
    voltageBaseClearDialogOpen ||
    connectionRedrawDialogOpen ||
    groupDeviceDefinitionDialog ||
    templateDialog ||
    layerAssignmentDialogOpen ||
    filterSelectionDialogOpen ||
    reactFlowPreviewOpen ||
    colorPaletteDialogOpen ||
    voltageLevelDialogOpen
  );
  const deviceDialogLayerActive = Boolean(
    deviceDefinitionDialogOpen ||
    createModelDialog ||
    customLibraryCreateDialog ||
    customDeviceDialogOpen ||
    customDeviceUnsavedPrompt ||
    eDeviceDefinitionInterfaceDialogOpen ||
    eFileEditorDialogOpen ||
    eDeviceInterfaceExitPromptOpen ||
    eDeviceInterfaceClassSwitchTarget ||
    showImportResultDialog
  );
  const resourceDialogLayerActive = Boolean(
    __appScope.nodeDoubleClickDialog ||
    imageTarget ||
    __appScope.globalLineListOpen ||
    __appScope.allNetworkTopologyDialogOpen
  );
  const overlayLayerActive = contextMenuLayerActive || projectDialogLayerActive ||
    canvasDialogLayerActive || deviceDialogLayerActive || resourceDialogLayerActive;
  const overlayLayerRevisionRef = useRef(0);
  if (overlayLayerActive) {
    overlayLayerRevisionRef.current += 1;
  }
  const overlayInputsFor = (active: boolean) => [
    active,
    active ? overlayLayerRevisionRef.current : 0
  ] as const;
  const resourceDialogLayerInputs = overlayInputsFor(resourceDialogLayerActive);
  Object.assign(__appScope, {
    AlignCenterHorizontal, AllNetworkTopologyDialog, ArrowDown, ArrowUp, BoxSelect, BufferedTextInput, CONNECTION_REDRAW_SCOPE_LABELS, CONTAINER_TERMINAL_ASSOCIATION_OPTIONS,
    ChevronDown, ChevronRight, ChevronsDown, ChevronsUp, CircleDot, Copy, CustomComponentManagerTree, DEFAULT_COLOR_PALETTE,
    DeferredColorInput, Download, EFileEditor, ENABLE_REACT_FLOW_PREVIEW, ENERGY_COLOR_ROWS, Eye, FileInput, FolderOpen,
    Fragment, Grid2X2, Group, ICON_LIBRARY_PAGE_SIZE, Layers, Layers2, MAX_CUSTOM_DEVICE_TERMINALS, PARAM_VALUE_TYPE_OPTIONS,
    Pencil, Plus, ReactFlowPreview, RotateCcw, Route, Save, ScanSearch, Scissors,
    Search, Suspense, TERMINAL_TYPE_LIBRARY_LABELS, TERMINAL_TYPE_OPTIONS, Trash2, Type, Undo2, Ungroup,
    UserCustomizationManagerDialog, VOLTAGE_BASE_CLEAR_SCOPES, VOLTAGE_BASE_CLEAR_SCOPE_LABELS, VOLTAGE_BASE_SET_SCOPES, VOLTAGE_BASE_SET_SCOPE_LABELS, VoltageLevelDialog, WindowCloseButton, X,
    Zap, ZapOff, activeImageFolderId, activeLayerNodes, activeSelectedNodeIds, activeVoltageBaseTerminalKey, activeVoltageBaseTerminalRow, addCustomDeviceStateDraftRow,
    addCustomParameterRow, addDefaultMeasurementsToNode, addDefinitionDraftRow, addManualBendFromContextMenu, addRoutableLineBendFromContextMenu, adjustSelectedDisplayLayer, applyExistingImage, applyIconLibraryCatalogIcon,
    applyLayerAssignmentDialog, autoAlignCanvasGraphics, autoSpreadCanvasGraphics, canAddTemplateFromSelection, canGroupSelectedGraphics, canUngroupSelectedGraphics, cancelGlobalLinePlacement, cancelGlobalLineTransition,
    cancelTemplateDialog, canvasClipboard, categoryLibraryComponentLibraryKey, clearSelectedImage, closeDeviceDefinitionDialog, closeLibraryPackageDialog, collapsedCustomComponentTreeLibraries, collapsedCustomComponentTreeTypes,
    collapsedDefinitionComponentLibraries, collapsedEDeviceInterfaceTreeNodes, colorPaletteDialogOpen, colorPaletteDraft, colorPaletteTab, componentLibraryDisplayParts, componentLibraryOptionsByCategoryLibrary, confirmAddGraphTemplate,
    confirmConnectionRedrawDialog, confirmCreateDeviceFromGroup, confirmCustomLibraryCreateDialog, confirmFilterSelectionDialog, confirmGlobalLinePlacement, confirmGlobalLineTransition, confirmLibraryPackageDialog, confirmReplaceDeviceIconFromGroup,
    confirmVoltageBaseClearDialog, confirmVoltageBaseSetDialog, connectionRedrawDialogOpen, connectionRedrawScope, connectionRedrawTargetsForScope, contextMeasurementGroup, contextMeasurementNode, contextMenu,
    contextMenuClassName, contextMenuForEdge, contextMenuForNode, contextMenuForRoutableLine, contextMenuForSelection, contextMenuFromElementTree, contextMenuRef, contextMenuStyle,
    contextMenuTarget, contextSelectionCount, copiedCustomComponentTemplate, copyCustomComponentTemplate, copyProjectRecord, copySchemeRecord, copySelectedCustomParameterRows, copySelectedDefinitionParameterRows,
    copySelection, createBlankProject, createCustomCategoryLibrary, createCustomComponentLibrary, createGraphTemplateType, createImageFolder, createMeasurementFieldParameterDefinition, createModelDialog,
    createSchemeRecord, currentModelVoltageColorKeys, customComponentLibraries, customComponentTreeSearchQuery, customComponentTreeSelection, customDeviceClassDisplay, customDeviceDefinitionIconOnly, customDeviceDefinitionMode,
    customDeviceDialogOpen, customDeviceDialogRef, customDeviceDraft, customDeviceHasUnsavedChanges, customDeviceIconDirty, customDeviceMeasurementTarget, customDeviceMeasurementsDirty, customDeviceParametersDirty,
    customDevicePreviewSourceTemplate, customDeviceSaveMessage, customDeviceSaveToast, customDeviceStatePageId, customDeviceTerminalAnchors, customDeviceUnsavedPrompt, customGraphTemplates, customLibraryCreateDialog,
    customLibraryCreateDialogBaseComponentLibraryOptions, customLibraryCreateDialogCategoryLibraryName, customLibraryCreateDialogClassOptions, customLibraryCreateDialogSelectedClassName, cutSelection, defaultComponentLibraryForCategoryLibrary, defaultContainerAssociationForTerminalType, definitionDraftError,
    definitionDraftRows, definitionDraftRowsForDisplay, definitionDraftSection, deleteAllDefinitionParameterRows, deleteCustomDeviceStateDraftRow, deleteGraphTemplate, deleteGraphTemplateType, deleteImageAssetFromContextMenu,
    deleteImageFolder, deleteProjectRecord, deleteSchemeRecord, deleteSelectedCustomDeviceTreeItem, deleteSelectedCustomParameterRows, deleteSelectedDefinitionParameterRows, deleteSelection, deleteVoltageColorRow,
    deviceDefinitionDialogOpen, deviceDefinitionDialogRef, deviceDefinitionKeyForTemplate, deviceDefinitionSearchNeedle, deviceDefinitionSearchQuery, deviceDefinitionView, deviceLibraryDialogLayouts, deviceLibraryDialogStyle,
    discardEDeviceInterfaceClassAndSwitch, discardEDeviceInterfaceDefinitionChanges, displayedCustomComponentTreeLibraries, displayedDeviceDefinitionLibraries, displayedMergedCustomDefaultParams, displayedVisibleCustomParams, eDeviceDefinitionClassExportEnabled, eDeviceDefinitionInterfaceDialogOpen,
    eDeviceDefinitionLabels, eDeviceDefinitionTableIds, eDeviceDefinitionTemplateFields, eDeviceInterfaceClassSwitchTarget, eDeviceInterfaceClassSwitchTargetRow, eDeviceInterfaceDefinitionRows, eDeviceInterfaceDefinitionTree, eDeviceInterfaceExitPromptOpen,
    eDeviceInterfaceGroupInfo, eDeviceInterfaceHasUnsavedChanges, eDeviceInterfaceLoadedTemplateName, eDeviceInterfaceReadonlyMode, eDeviceInterfaceSaveAndSwitchRef, eDeviceInterfaceSaveMessage, eDeviceInterfaceSelectedGroupKey, eDeviceTemplateDropdownOpen,
    eFileEditorDialogOpen, eFileEditorExportOptions, eFileEditorFieldCnNames, eFileEditorRecords, editingCustomDeviceKind, expandedDefinitionGroups, expandedImportResultSections, exportCustomComponentTemplateSvg,
    exportProjectRecordFile, exportSchemeRecord, filterSelectionDialogOpen, filterSelectionTreeLabel, filterSelectionTypeKeys, filterSelectionTypeOptions, filterSelectionTypePartial, filterSelectionTypeSelected,
    filteredCustomComponentTreeByComponentLibrary, filteredDeviceDefinitionByComponentLibrary, filteredImageAssetList, findSavedSchemeById, formatCustomDeviceTerminalAnchorValue, getContainerTerminalAssociationSourceIndex, globalLinePlacementCandidates, globalLinePlacementConflictMessageForId,
    globalLinePlacementDialog, globalLineRepairCandidate, globalLineTransitionDialog, graphTemplateTypes, groupDeviceDefinitionDialog, groupDeviceReplacementTemplates, groupSelectedGraphics, handleTreeCollapseChange,
    iconLibraryCatalog, iconLibraryCategoryOptions, iconLibraryLibraries, iconLibraryLoadedText, iconLibraryPicker, iconLibrarySelectedLibraryId, iconLibraryVisibleResult, imageAssetContextMenu,
    imageAssetList, imageAssets, imageFolders, imageInputRef, imagePickerActiveCategoryFilter, imagePickerActiveLibraryTab, imagePickerActiveSourceFilter, imagePickerAssetIsBuiltinIcon,
    imagePickerAssetNoun, imagePickerCanClear, imagePickerCategoryOptions, imagePickerDialogClassName, imagePickerHint, imagePickerRendersCatalogSource, imagePickerSearchQuery, imagePickerShowsLibraryActions,
    imagePickerSourceLocked, imagePickerTitle, imagePickerUsesIconSources, imagePickerUsesSeparateLibraryTabs, imageTarget, importResultActiveTab, isBrowseMode, isContainerTerminalAssociationDependent,
    isEditMode, keepTemplateContextMenuFlyoutOpen, layerAssignmentDialogOpen, layerAssignmentTargetId, layerAssignmentUnchanged, layers, libraryPackageDialogMode, libraryPackageDialogOpen,
    libraryPackageDialogScope, libraryPackageDialogScopeOptions, libraryTemplates, loadDefinitionTemplateDraft, loadPredefinedEDeviceTemplate, moveSelectedCustomParameterRows, moveSelectedDefinitionParameterRows, moveSelectedEDeviceInterfaceField,
    nodes, normalizeCategoryLibraryName, normalizeComponentLibraryName, normalizeContainerTerminalAssociations, normalizeDefinitionRowEnumFields, openAddTemplateDialog, openConnectionRedrawDialog, openCustomComponentSvgImport,
    openFilterSelectionDialog, openGroupDeviceDefinitionDialog, openLayerAssignmentDialog, openMeasurementEditorForNode, openModelImportFilePicker, openSchemeImportFilePicker, openVoltageBaseClearDialog, openVoltageBaseSetDialog,
    parameterValueTypeLabelForDefinitionRow, pasteCustomComponentTemplate, pasteProjectClipboardRecord, pasteSchemeClipboardRecord, pasteSelection, pendingModelImportConflict, pendingRecordPasteConflict, pendingSchemeImportConflict,
    pendingUnsavedAction, projectById, projectMenu, projectName, reactFlowPreviewOpen, recordClipboard, removeMeasurementsFromNode, renameImageFolder,
    renameProjectRecord, renameSchemeRecord, renderDeviceDefinitionMeasurementPanel, renderDeviceDefinitionVisualPanel, renderEnumValuesEditor, renderGraphTemplatePreview, renderMeasurementConfigDialog, renderMeasurementEditorDialog,
    renderNodeDoubleClickDialog, renderStateVisualPager, renderTypicalValueEditor, requestCloseCustomDeviceDialog, requestCloseEDeviceInterfaceDefinition, requestCustomDeviceDialogView, requestExportEDeviceInterfaceDefinitionFile, requestSaveEDeviceInterfaceDefinition,
    requestSelectCustomCategoryLibrary, requestSelectCustomComponentLibrary, requestSelectCustomComponentTemplate, requestSelectEDeviceInterfaceComponentLibrary, resetDeviceDefinitionDraft, resetEnergyColors, resetVoltageColors, resolveComponentLibraryClassMetadata,
    resolveCustomDeviceUnsavedPrompt, resolveDuplicateModelImport, resolveDuplicateSchemeImport, resolveRecordPasteConflict, resolveTemplateComponentLibrary, resolveUnsavedChangeAction, restoreEDeviceInterfaceOriginalDefinition, revertCustomDeviceDraftAll,
    revertCustomDeviceDraftCurrentTab, runAfterEDeviceInterfaceInputCommit, runContextMenuAction, saveColorPalette, saveCurrentProject, saveCustomDeviceDefinitionDialog, saveDeviceDefinitionDraft, saveRequired,
    savedUndoStackLengthRef, scheduleGraphTemplateFlyoutClose, schemes, selectCustomParameterRow, selectDefinitionParameterRow, selectableCategoryLibraries, selectedCustomEditableParameterCount, selectedCustomParameterRowIdSet,
    selectedCustomParameterRowIds, selectedDefinitionBaseTemplate, selectedDefinitionDerivedBaseTemplate, selectedDefinitionDerivedInfo, selectedDefinitionEditableParameterCount, selectedDefinitionParameterRowIdSet, selectedDefinitionParameterRowIds, selectedDefinitionTemplate,
    selectedDefinitionTerminalAssociations, selectedEDeviceInterfaceFields, selectedEDeviceInterfaceRow, selectedEdge, setActiveImageFolderId, setActiveVoltageBaseTerminalKey, setCollapsedDefinitionComponentLibraries, setColorPaletteDialogOpen,
    setColorPaletteTab, setConnectionRedrawDialogOpen, setConnectionRedrawScope, setCreateModelDialog, setCustomComponentTreeSearchQuery, setCustomComponentTreeSelection, setCustomDeviceDraft, setCustomDeviceStatePageId,
    setCustomLibraryCreateDialog, setDeviceDefinitionSearchQuery, setDeviceDefinitionView, setEDeviceDefinitionClassExportEnabled, setEDeviceDefinitionInterfaceDialogOpen, setEDeviceDefinitionLabels, setEDeviceInterfaceClassSwitchTarget, setEDeviceInterfaceExitPromptOpen,
    setEDeviceInterfaceLoadedTemplateName, setEDeviceInterfaceReadonlyMode, setEDeviceInterfaceSelectedGroupKey, setEDeviceTemplateDropdownOpen, setEFileEditorDialogOpen, setExpandedDefinitionGroups, setFilterSelectionDialogOpen, setFilterSelectionTypeKeys,
    setGlobalLinePlacementDialog, setGroupDeviceDefinitionDialog, setHasUnsavedChanges, setIconLibraryPicker, setImageAssetContextMenu, setImagePickerCategoryFilter, setImagePickerSearchQuery, setImagePickerSourceFilter,
    setImageTarget, setImportResultActiveTab, setLayerAssignmentDialogOpen, setLayerAssignmentTargetId, setLibraryPackageDialogMode, setLibraryPackageDialogScope, setReactFlowPreviewOpen, setSelectedNodeLabelDisplayMode,
    setShowImportResultDialog, setTemplateDraftName, setTemplateDraftType, setTemplateImportResult, setUnsavedChangesDialogOpen, setVoltageBaseClearDialogOpen, setVoltageBaseClearScope, setVoltageBaseSetDialogOpen,
    setVoltageBaseSetScope, setVoltageBaseSetValue, setVoltageBaseTerminalValue, setVoltageColorVisibility, setVoltageLevelDialogOpen, setVoltageLevelSettings, setVoltageTab, showComponentLibraryTerminalTypes,
    showCustomDeviceInheritanceNote, showImportResultDialog, sourceFilteredImageAssetList, startContextMarqueeSelection, startCustomComponentCreate, startDeviceLibraryDialogDrag, startDeviceLibraryDialogResize, stopDeviceLibraryDialogEvent,
    templateDialog, templateDraftName, templateDraftType, templateImportResult, templateMenu, templateResizeTransformValue, tidyRoutableLineRoute, tidySelectedEdgeRoute,
    toggleColorDisplayMode, toggleDefinitionComponentLibrary, toggleDefinitionGroup, toggleEDeviceInterfaceTreeNode, toggleFilterSelectionItem, toggleFilterSelectionType, toggleImportResultSection, undoLastOperation,
    undoStack, ungroupSelectedGraphics, unsavedChangesDialogOpen, updateCustomDefaultParamRow, updateCustomDeviceStateDraftRow, updateCustomDeviceTerminalAnchor, updateDefinitionComponentLibraryCommonParamExport, updateDefinitionDraftRow,
    updateEnergyColor, updateVoltageColorRow, visibleCustomDeviceDialogView, visibleEdges, visibleNodes, visibleVoltageColorRows, voltageBaseClearDialogOpen, voltageBaseClearResultForScope,
    voltageBaseClearScope, voltageBaseSetDialogOpen, voltageBaseSetHasUniformTargets, voltageBaseSetMode, voltageBaseSetModeLabel, voltageBaseSetOptions, voltageBaseSetReady, voltageBaseSetResultForScope,
    voltageBaseSetScope, voltageBaseSetScopeDeviceCount, voltageBaseSetTerminalRows, voltageBaseSetValue, voltageBaseTerminalRowKey, voltageColorVisibility, voltageLevelDialogOpen, voltageLevelSettings,
    voltageTab
  });

  return (<>
    {globalMessage && <div className={`global-message global-message-${globalMessage.type}`} onClick={() => setGlobalMessage(null)} style={{ cursor: "pointer" }} title="点击关闭"><span className="global-message-icon">{globalMessage.type === "success" ? "✓" : globalMessage.type === "error" ? "✕" : "ℹ"}</span>{globalMessage.text}</div>}
    {exportCompletionDialog && (<div className="image-picker-backdrop export-completion-backdrop" onPointerDown={() => setExportCompletionDialog(null)}>
      <section
        className="unsaved-change-dialog export-completion-dialog window-close-host"
        onPointerDown={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setExportCompletionDialog(null);
          }
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="export-completion-title"
      >
        <WindowCloseButton label="关闭导出结果" onClick={() => setExportCompletionDialog(null)} />
        <div className="image-picker-title">
          <div>
            <h2 id="export-completion-title">{exportCompletionDialog.title}</h2>
            <p className="export-completion-message">{exportCompletionDialog.message}</p>
          </div>
        </div>
        {Array.isArray(exportCompletionDialog.details) && exportCompletionDialog.details.length > 0 && (
          <div className="export-completion-details">
            {exportCompletionDialog.details.map((detail: string, index: number) => <p key={`${index}-${detail}`}>{detail}</p>)}
          </div>
        )}
        <div className="image-picker-actions export-completion-actions">
          <button type="button" autoFocus onClick={() => setExportCompletionDialog(null)}>
            确定（{exportCompletionCountdown} 秒）
          </button>
        </div>
      </section>
    </div>)}
    <div className={`app-shell ${isBrowseMode ? "browse-mode" : "edit-mode"} left-panel-${leftPanelMode} right-panel-${rightPanelMode} ${sidePanelResize ? "side-panel-resizing" : ""} ${statusbarResize ? "statusbar-resizing" : ""} ${topologyWarningPanelResize ? "topology-warning-panel-resizing" : ""} ${nodeDoubleClickDialogDrag || nodeDoubleClickDialogResize ? "node-double-click-dialog-moving" : ""} ${deviceLibraryDialogDrag || deviceLibraryDialogResize ? "device-library-dialog-moving" : ""} ${canvasResizeDrag ? "canvas-resizing" : ""}`} style={appShellStyle}>
      {renderSidePanelEdgeTrigger("left")}
      {renderSidePanelEdgeTrigger("right")}
      <AppLeftPanel
        scope={__appScope}
        inputs={[
          leftPanelVisible,
          leftPanelMode,
          effectiveLeftPanelTab,
          leftPanelTab,
          leftPanelContent,
          isEditMode,
          activeSchemeKey,
          activeProjectKey
        ]}
      />

      <main className="workspace" onPointerEnter={hideAutoPanelsFromWorkspace}>
        <AppTopbar
          scope={__appScope}
          inputs={[
            activeModelPathName,
            activeLayer,
            layers,
            isBrowseMode,
            isEditMode,
            smartAlignmentEnabled,
            topologyErrors,
            topologyWarningPanelClosed,
            __appScope.globalLineListOpen,
            __appScope.allNetworkTopologyDialogOpen,
            eDeviceDefinitionInterfaceDialogOpen,
            colorDisplayMode,
            deviceLabelsVisible,
            saveRequired,
            canGroupSelectedGraphics,
            canUngroupSelectedGraphics,
            canAdjustSelectedDisplayLayer,
            selectedLayoutUnitCount,
            __appScope.runtimeWsStatus,
            __appScope.runtimeWsBlinkSeq,
            __appScope.runtimeWsClientId
          ]}
        />

        <MemoizedCanvasArea scope={__appScope} />
        <MemoizedViewSection
          section="topology-warning"
          inputs={[
            topologyWarningPanelVisible,
            topologyWarningPanelStyle,
            inspectorTopologyErrors,
            visibleTopologyErrors,
            normalizedTopologyWarningPage,
            topologyWarningPageCount,
            hiddenTopologyErrorCount
          ]}
          render={() => topologyWarningPanelVisible ? (<section ref={topologyWarningPanelRef} className="topology-warning-floating-panel" style={topologyWarningPanelStyle} aria-label="拓扑警告信息" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => event.stopPropagation()}>
            <header className="topology-warning-floating-title" onPointerDown={startTopologyWarningPanelDrag}>
              <div>
                <h2>拓扑警告信息</h2>
                <span>{topologyFilteredErrors.length}条</span>
              </div>
              <button type="button" title="关闭拓扑警告信息" aria-label="关闭拓扑警告信息" onPointerDown={(event) => event.stopPropagation()} onClick={() => setTopologyWarningPanelClosed(true)}>
                <X size={14}/>
              </button>
            </header>
            <TopologyWarningPanelContent
              allErrors={inspectorTopologyErrors}
              filteredErrors={topologyFilteredErrors}
              category={topologyWarningCategory}
              setCategory={setTopologyWarningCategory}
              status={topologyWarningStatus}
              setStatus={setTopologyWarningStatus}
              categorize={categorizeTopologyErrorType}
              isBlocking={isBlockingTopologyValidationError}
              displayMessage={topologyWarningDisplayMessage}
              locateError={locateTopologyError}
            />
            <div className="topology-warning-floating-resize" role="separator" aria-orientation="horizontal" title="拖拽调整拓扑警告信息窗口大小" onPointerDown={startTopologyWarningPanelResize}/>
          </section>) : null}
        />
        <AppStatusbar
          scope={__appScope}
          inputs={[
            currentZoomPercent,
            topologyStatus,
            topologyErrors,
            warningStatusText,
            warningStatusTitle,
            operationLogRef.current,
            nodes.length,
            edges.length,
            selectedCount,
            selectedNodeTransformStatus,
            saveRequired,
            mode,
            connectSource,
            staticDrawing
          ]}
        />
      </main>

      <AppRightPanel
        scope={__appScope}
        inputs={[
          rightPanelVisible,
          rightPanelMode,
          inspectorSelectedNode,
          inspectorSelectedEdge,
          currentModelRecord,
          inspectorTab,
          selectedSchemeRecord,
          canvasSizeDraft,
          isBrowseMode,
          allowAutoExpandCanvas,
          canvasBackgroundColor,
          canvasBackgroundImage,
          __appScope.canvasBackgroundImageFit,
          backgroundProjectId,
          backgroundProjectRecord,
          backgroundProjectOptions,
          backgroundLayerIds,
          backgroundLayerOptions,
          powerUnit,
          voltageUnit,
          currentUnit,
          powerBaseValue,
          subcontrolarea,
          modelType,
          substation,
          feeder,
          taiqu,
          projectName,
          nodes,
          __appScope.elementTree,
          __appScope.filteredElementTree,
          __appScope.collapsedElementTreeGroups,
          __appScope.collapsedElementTreeDeviceGroups,
          __appScope.elementTreeItemLimits,
          selectedNodeIdSet,
          activeSelectedEdgeSet,
          selectedDeviceInfoView,
          selectedContainerParameterViews,
          selectedContainerParameterView,
          libraryTemplates,
          customComponentLibraries,
          deviceDefinitionOverrides,
          topology,
          inspectorTopologyEntry,
          inspectorGraphId,
          nodeById,
          singleSelectedDeviceForInspector,
          colorPalette
        ]}
      />
      {contextMenuLayerActive && (<Suspense fallback={null}>
        <LazyAppContextMenus
          scope={__appScope}
          section="context-menus"
          inputs={overlayInputsFor(contextMenuLayerActive)}
        />
      </Suspense>)}
      {projectDialogLayerActive && (<Suspense fallback={null}>
        <LazyAppProjectDialogs
          scope={__appScope}
          section="project-dialogs"
          inputs={overlayInputsFor(projectDialogLayerActive)}
        />
      </Suspense>)}
      {canvasDialogLayerActive && (<Suspense fallback={null}>
        <LazyAppCanvasDialogs
          scope={__appScope}
          section="canvas-dialogs"
          inputs={overlayInputsFor(canvasDialogLayerActive)}
        />
      </Suspense>)}
      {deviceDialogLayerActive && (<Suspense fallback={null}>
        <LazyAppDeviceDefinitionDialogs
          scope={__appScope}
          section="device-definition-dialogs"
          inputs={overlayInputsFor(deviceDialogLayerActive)}
        />
      </Suspense>)}
      <AppResourceDialogs
        scope={__appScope}
        section="resource-dialogs"
        inputs={resourceDialogLayerInputs}
      />
    </div></>);
}
