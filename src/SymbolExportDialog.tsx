// 【导出图元 Symbol】弹窗：从图元树里挑图元 → 导出只含 <style> 与 <defs><symbol> 的 SVG。
//
// 与元件定义弹框同源：树数据来自同一份「类别库 / 类 / 元件」装配结果
// （groupedCategoryLibraryByComponentLibrary + buildCustomComponentClassTree），
// 不另建一套分类口径，否则两棵树会漂移。
//
// 状态全部落在弹窗内部：外部只传 open 与三类回调（方案读写、导出落盘），
// 免得把 8 个 useState 塞回 App 作用域。

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ChevronDown, ChevronRight, Download, Search, Trash2, X } from "lucide-react";
import type { DeviceTemplate } from "./model";
import { WindowCloseButton } from "./WindowCloseButton";
import { normalizeCategoryLibraryName } from "./export/device-definition-shared";
import {
  CustomComponentTreeTemplateThumbnail,
  buildCustomComponentClassTree,
  componentLibraryDisplayParts,
  type CustomComponentClassTreeNode
} from "./appExtracted/appPersistenceLibraryExport";
import {
  DEFAULT_SYMBOL_EXPORT_FILTER_KEYS,
  SYMBOL_EXPORT_FILTERS,
  filterSymbolExportTemplates,
  symbolExportFilterKeysForTemplate,
  type SymbolExportFilterKey,
  type SymbolExportScheme
} from "./symbolExportSvg";

type ComponentLibraryGroup = { section: string; templates: DeviceTemplate[] };

export type CustomComponentLibraryDefinitionLike = {
  name: string;
  label?: string;
  categoryLibraryName?: string;
  derivedFromComponentLibrary?: string;
};

export type SymbolExportSchemeDraft = {
  name: string;
  templateKinds: string[];
  filterKeys: SymbolExportFilterKey[];
};

export type SymbolExportDialogProps = {
  open: boolean;
  onClose: () => void;
  /** 类别库顺序（与元件定义弹框一致） */
  categoryLibraries: readonly string[];
  /** 类别库 → 类 → 图元（未按搜索过滤的原始装配结果） */
  groupedByComponentLibrary: Record<string, ComponentLibraryGroup[]>;
  customComponentLibraries?: readonly CustomComponentLibraryDefinitionLike[];
  schemes: readonly SymbolExportScheme[];
  /** 方案读写过程提示（加载中 / 保存结果 / 失败原因） */
  statusMessage?: string;
  onReloadSchemes?: () => void;
  onSaveScheme: (draft: SymbolExportSchemeDraft) => void | Promise<unknown>;
  onDeleteScheme: (schemeId: string) => void | Promise<unknown>;
  /** 【合并到一个 SVG 中导出】：全部选中图元合成一份 SVG（<defs><symbol> 形式） */
  onExport: (templates: DeviceTemplate[]) => void | Promise<unknown>;
  /** 【独立图元 SVG 导出】：每个图元一份自包含 SVG，多图元打成 zip */
  onExportStandalone?: (templates: DeviceTemplate[]) => void | Promise<unknown>;
};

/** 深度优先收集节点下全部图元（含派生类）。 */
function collectNodeTemplates(node: CustomComponentClassTreeNode, into: DeviceTemplate[]) {
  into.push(...node.templates);
  for (const derived of node.derivedClasses) {
    collectNodeTemplates(derived, into);
  }
}

function uniqueTemplates(templates: readonly DeviceTemplate[]) {
  const seen = new Map<string, DeviceTemplate>();
  for (const template of templates) {
    const kind = String(template?.kind ?? "").trim();
    if (kind && !seen.has(kind)) {
      seen.set(kind, template);
    }
  }
  return [...seen.values()];
}

function normalizeNeedle(value: string) {
  return String(value ?? "").trim().toLowerCase();
}

type CheckState = "all" | "some" | "none";

function checkStateFor(selectedCount: number, total: number): CheckState {
  if (total === 0 || selectedCount === 0) {
    return "none";
  }
  return selectedCount === total ? "all" : "some";
}

/**
 * 「已选图元」清单内容：正方形缩略图（每行 6 个）+ 中文名，缩略图右上角一个移除按钮。
 *
 * 移除 = 从 selectedKinds 里摘掉该 kind：图元树与该清单共用同一份勾选状态，
 * 所以树上的勾选（含类/类别库的层级勾选态）会同步取消，不需要额外通知树。
 *
 * 抽成导出的纯展示组件，便于在没有 jsdom / @testing-library 的仓库里
 * 直接 renderToStaticMarkup 验证清单契约（缩略图、文案、移除按钮可达名）。
 */
export function SymbolExportSelectedList({
  templates,
  onRemove
}: {
  templates: readonly DeviceTemplate[];
  onRemove: (kind: string) => void;
}) {
  if (templates.length === 0) {
    return <div className="dialog-tree-empty">尚未选择图元</div>;
  }
  return (
    <>
      {templates.map((template) => (
        <div className="symbol-export-selected-item" role="listitem" key={template.kind}>
          <span className="symbol-export-selected-thumb" title={template.label}>
            <CustomComponentTreeTemplateThumbnail template={template} />
            <button
              type="button"
              className="symbol-export-selected-remove"
              aria-label={`移除 ${template.label}，并取消图元树中的勾选`}
              title="移除（同时取消图元树勾选）"
              onClick={() => onRemove(template.kind)}
            >
              <X size={11} />
            </button>
          </span>
          <span className="symbol-export-selected-label" title={template.label}>
            {template.label}
          </span>
        </div>
      ))}
    </>
  );
}

/**
 * 图元树缩进（px）。层级模型：类别库(0) → 类(1) → 图元(2) → 派生类的图元(3) …
 *
 * 规则：**同一层级的「标签左沿」必须落在 `TREE_ROW_BASE_INDENT + 层级 × TREE_INDENT_PER_LEVEL`**。
 * - 类别库行 / 类行：[折叠箭头 16][间距 5][勾选框 13][间距 5] → 标签前 39px
 *   （类行按 `深度 + 1` 算层级，因为类别库占了层级 0）；
 * - 图元行没有折叠箭头：[勾选框 13][间距 5] → 只有 18px，故补 `TREE_COMPONENT_INSET`（= 39 - 18 = 21），
 *   使它的勾选框与「同层级的类行」勾选框严格对齐、标签左沿也一致。
 *
 * 旧方案只区分「类行 / 图元行」两种**与层级无关**的固定偏移（6 / 24），既没按层级累加，
 * 又让类行和它所属的类别库行完全同缩进、图元行只比类行多 18px —— 三层挤在 20px 内，
 * 看起来是平的（用户反馈「缩进仍然不明显」，截图里 静态图元 / 静态文本 / 文字 三层同 x）。
 * 现在改成按层级乘算，并把步长从 28 提到 36。
 */
const TREE_INDENT_PER_LEVEL = 36;
const TREE_ROW_BASE_INDENT = 6;
/** 行首到「标签左沿」的距离：折叠箭头 16 + 间距 5 + 勾选框 13 + 间距 5。 */
const TREE_ROW_LABEL_OFFSET = 39;
/** 图元行缺失折叠箭头，需补 16 + 5 才能与同层级类行的勾选框对齐。 */
const TREE_COMPONENT_INSET = TREE_ROW_LABEL_OFFSET - 18;
/** 类别库行排在层级 0（缩进由 `.symbol-export-row` 的 CSS padding 提供，同为 6px）。 */
const TREE_LIBRARY_LEVEL = 0;

/** 某层级下「类行 / 类别库行」的行首内边距。 */
function treeRowIndentForLevel(level: number) {
  return TREE_ROW_BASE_INDENT + level * TREE_INDENT_PER_LEVEL;
}

/** 某层级下「图元行」的行首内边距（补上缺失的折叠箭头，使标签与同层级的类行对齐）。 */
function treeComponentIndentForLevel(level: number) {
  return treeRowIndentForLevel(level) + TREE_COMPONENT_INSET;
}

export function SymbolExportDialog({
  open,
  onClose,
  categoryLibraries,
  groupedByComponentLibrary,
  customComponentLibraries = [],
  schemes,
  statusMessage = "",
  onReloadSchemes,
  onSaveScheme,
  onDeleteScheme,
  onExport,
  onExportStandalone
}: SymbolExportDialogProps) {
  const [selectedKinds, setSelectedKinds] = useState<string[]>([]);
  const [activeFilterKeys, setActiveFilterKeys] = useState<SymbolExportFilterKey[]>(DEFAULT_SYMBOL_EXPORT_FILTER_KEYS);
  const [searchQuery, setSearchQuery] = useState("");
  const [collapsedLibraries, setCollapsedLibraries] = useState<string[]>([]);
  const [collapsedSections, setCollapsedSections] = useState<string[]>([]);
  const [schemeName, setSchemeName] = useState("");
  const [activeSchemeId, setActiveSchemeId] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  // 只在「本次打开」时同步外部方案列表：关闭再打开不保留上次的半成品勾选
  const openedRef = useRef(false);

  useEffect(() => {
    if (!open) {
      openedRef.current = false;
      return;
    }
    if (openedRef.current) {
      return;
    }
    openedRef.current = true;
    onReloadSchemes?.();
  }, [onReloadSchemes, open]);

  const classTreesByLibrary = useMemo(() => {
    const source = groupedByComponentLibrary ?? {};
    const libraries = categoryLibraries.length > 0
      ? categoryLibraries
      : Object.keys(source);
    return libraries.map((library) => ({
      library,
      nodes: buildCustomComponentClassTree(library, source[library] ?? [], customComponentLibraries, "")
    }));
  }, [categoryLibraries, customComponentLibraries, groupedByComponentLibrary]);

  const templatesByLibrary = useMemo(() => {
    const result = new Map<string, DeviceTemplate[]>();
    for (const { library, nodes } of classTreesByLibrary) {
      const collected: DeviceTemplate[] = [];
      for (const node of nodes) {
        collectNodeTemplates(node, collected);
      }
      result.set(library, uniqueTemplates(collected));
    }
    return result;
  }, [classTreesByLibrary]);

  const allTemplates = useMemo(
    () => uniqueTemplates([...templatesByLibrary.values()].flat()),
    [templatesByLibrary]
  );

  const searchNeedle = normalizeNeedle(searchQuery);

  /** 搜索 + 分类过滤：两者是与关系（树里只出现「搜得到且勾了所属分类」的图元）。 */
  const visibleTemplates = useMemo(() => {
    const byFilter = filterSymbolExportTemplates(allTemplates, activeFilterKeys);
    if (!searchNeedle) {
      return byFilter;
    }
    return byFilter.filter((template) => {
      const haystack = [template.kind, template.label, template.englishName]
        .map((value) => normalizeNeedle(String(value ?? "")))
        .join(" ");
      const library = normalizeNeedle(normalizeCategoryLibraryName(template.categoryLibrary));
      return haystack.includes(searchNeedle) || library.includes(searchNeedle);
    });
  }, [activeFilterKeys, allTemplates, searchNeedle]);

  const visibleKindSet = useMemo(
    () => new Set(visibleTemplates.map((template) => template.kind)),
    [visibleTemplates]
  );

  const filterCounts = useMemo(() => {
    const counts = new Map<SymbolExportFilterKey, number>();
    for (const template of allTemplates) {
      for (const key of symbolExportFilterKeysForTemplate(template)) {
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }
    return counts;
  }, [allTemplates]);

  const selectedSet = useMemo(() => new Set(selectedKinds), [selectedKinds]);
  const visibleSelectedCount = useMemo(
    () => visibleTemplates.filter((template) => selectedSet.has(template.kind)).length,
    [selectedSet, visibleTemplates]
  );
  const selectedTemplates = useMemo(
    () => allTemplates.filter((template) => selectedSet.has(template.kind)),
    [allTemplates, selectedSet]
  );

  const applyKinds = useCallback((kinds: readonly string[], select: boolean) => {
    if (kinds.length === 0) {
      return;
    }
    setSelectedKinds((current) => {
      const next = new Set(current);
      for (const kind of kinds) {
        if (select) {
          next.add(kind);
        } else {
          next.delete(kind);
        }
      }
      return [...next];
    });
  }, []);

  const toggleTemplate = useCallback((kind: string) => {
    setSelectedKinds((current) =>
      current.includes(kind) ? current.filter((item) => item !== kind) : [...current, kind]
    );
  }, []);

  const visibleKindsInNode = useCallback((nodes: readonly CustomComponentClassTreeNode[]) => {
    const collected: DeviceTemplate[] = [];
    for (const node of nodes) {
      collectNodeTemplates(node, collected);
    }
    return uniqueTemplates(collected)
      .filter((template) => visibleKindSet.has(template.kind))
      .map((template) => template.kind);
  }, [visibleKindSet]);

  const toggleFilter = useCallback((key: SymbolExportFilterKey) => {
    setActiveFilterKeys((current) => (
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key]
    ));
  }, []);

  const handleAllFilters = useCallback((select: boolean) => {
    setActiveFilterKeys(select ? DEFAULT_SYMBOL_EXPORT_FILTER_KEYS : []);
  }, []);

  const handleLoadScheme = useCallback((scheme: SymbolExportScheme) => {
    setSelectedKinds(scheme.templateKinds);
    // 方案里的 filterKeys 就是保存时的勾选状态（含「空 = 全不勾」），原样还原。
    // 不要再把空回落成全部分类，否则「清空后保存」的方案重新加载时树会突然全亮，
    // 与保存当时看到的不是同一棵树。
    setActiveFilterKeys([...scheme.filterKeys]);
    setActiveSchemeId(scheme.id);
    setSchemeName(scheme.name);
    setStatus(`已加载方案「${scheme.name}」：${scheme.templateKinds.length} 个图元。`);
  }, []);

  const handleSaveScheme = useCallback(async () => {
    const name = schemeName.trim();
    if (!name) {
      setStatus("请先填写方案名称。");
      return;
    }
    setBusy(true);
    setStatus("正在保存方案…");
    try {
      await onSaveScheme({ name, templateKinds: selectedKinds, filterKeys: activeFilterKeys });
    } finally {
      setBusy(false);
    }
  }, [activeFilterKeys, onSaveScheme, schemeName, selectedKinds]);

  const handleDeleteScheme = useCallback(async (scheme: SymbolExportScheme) => {
    setBusy(true);
    try {
      await onDeleteScheme(scheme.id);
      if (activeSchemeId === scheme.id) {
        setActiveSchemeId("");
      }
    } finally {
      setBusy(false);
    }
  }, [activeSchemeId, onDeleteScheme]);

  const handleExport = useCallback(async () => {
    if (selectedTemplates.length === 0) {
      setStatus("请至少选择一个图元。");
      return;
    }
    setBusy(true);
    try {
      await onExport(selectedTemplates);
    } finally {
      setBusy(false);
    }
  }, [onExport, selectedTemplates]);

  const handleExportStandalone = useCallback(async () => {
    if (selectedTemplates.length === 0) {
      setStatus("请至少选择一个图元。");
      return;
    }
    setBusy(true);
    try {
      await onExportStandalone?.(selectedTemplates);
    } finally {
      setBusy(false);
    }
  }, [onExportStandalone, selectedTemplates]);

  if (!open) {
    return null;
  }

  const renderCheckbox = (
    state: CheckState,
    onToggle: () => void,
    label: string,
    className = ""
  ) => (
    <input
      type="checkbox"
      className={`symbol-export-check ${className}`}
      checked={state === "all"}
      aria-checked={state === "some" ? "mixed" : state === "all"}
      aria-label={label}
      data-check-state={state}
      ref={(element) => {
        if (element) {
          element.indeterminate = state === "some";
        }
      }}
      onChange={onToggle}
    />
  );

  const renderSectionNode = (
    library: string,
    node: CustomComponentClassTreeNode,
    depth: number
  ): ReactNode => {
    const sectionKey = `${library}::${node.section}`;
    // 类标识本身是英文（如 ACBreak），树上只显示中文名（componentLibraryDisplayParts 与元件定义弹框同源）。
    const classLabel = componentLibraryDisplayParts(node.section, customComponentLibraries).chinese;
    const nodeKinds = visibleKindsInNode([node]);
    const nodeSelected = nodeKinds.filter((kind) => selectedSet.has(kind)).length;
    const state = checkStateFor(nodeSelected, nodeKinds.length);
    const collapsed = collapsedSections.includes(sectionKey);
    const children = [...(node.derivedClasses ?? [])];
    const hasChildren = children.length > 0;
    // 类别库占层级 0，故类行层级 = 本节点深度 + 1；其图元行再深一级。
    const classLevel = depth + 1;
    return (
      <div className="symbol-export-class-node" key={sectionKey} data-tree-depth={depth}>
        <div
          className={`symbol-export-row type${state === "none" ? "" : " selected"}`}
          style={{ paddingLeft: treeRowIndentForLevel(classLevel) }}
        >
          {hasChildren ? (
            <button
              type="button"
              className="symbol-export-chevron"
              aria-label={`${collapsed ? "展开" : "收缩"} ${classLabel}`}
              onClick={() =>
                setCollapsedSections((current) =>
                  current.includes(sectionKey)
                    ? current.filter((item) => item !== sectionKey)
                    : [...current, sectionKey]
                )
              }
            >
              {collapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
            </button>
          ) : (
            <span className="symbol-export-chevron-placeholder" aria-hidden="true" />
          )}
          {renderCheckbox(state, () => applyKinds(nodeKinds, state !== "all"), `${classLabel} 全选`)}
          <span className="symbol-export-row-label" title={classLabel}>
            {classLabel}
          </span>
          <strong>{nodeKinds.length}</strong>
        </div>
        {!collapsed && (
          <div className="symbol-export-class-body">
            {node.templates
              .filter((template) => visibleKindSet.has(template.kind))
              .map((template) => (
                <label
                  className={`symbol-export-row component${selectedSet.has(template.kind) ? " selected" : ""}`}
                  key={template.kind}
                  style={{ paddingLeft: treeComponentIndentForLevel(classLevel + 1) }}
                  title={template.label}
                >
                  <input
                    type="checkbox"
                    className="symbol-export-check"
                    checked={selectedSet.has(template.kind)}
                    aria-label={template.label}
                    data-check-state={selectedSet.has(template.kind) ? "all" : "none"}
                    onChange={() => toggleTemplate(template.kind)}
                  />
                  <span className="symbol-export-row-label">{template.label}</span>
                </label>
              ))}
            {children.map((child) => renderSectionNode(library, child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const visibleLibraries = classTreesByLibrary.filter(({ library, nodes }) =>
    visibleKindsInNode(nodes).length > 0
  );
  const allVisibleState = checkStateFor(visibleSelectedCount, visibleTemplates.length);

  return (
    <div className="image-picker-backdrop" onPointerDown={onClose}>
      <section
        className="symbol-export-dialog window-close-host"
        aria-label="导出图元 Symbol"
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
      >
        <WindowCloseButton label="关闭导出图元Symbol" onClick={onClose} />
        <header className="symbol-export-title">
          <div>
            <h2>导出图元 Symbol</h2>
            <p>勾选图元后可两种方式导出：【合并到一个 SVG】为 &lt;style&gt; + &lt;defs&gt;&lt;symbol&gt; 定义集，并附正文 &lt;use&gt; 网格预览（每行 6 个，顺序与已选图元一致）；【独立图元 SVG】每个图元一份自包含 SVG（非 symbol 形式），多图元打包为 zip。</p>
          </div>
          <span className="symbol-export-summary">
            已选 <strong>{selectedKinds.length}</strong> / 可见 <strong>{visibleTemplates.length}</strong>
          </span>
        </header>
        <div className="symbol-export-layout">
          <div className="symbol-export-tree-column">
            <div className="symbol-export-tree-toolbar">
              <div className="dialog-tree-search">
                <Search size={14} aria-hidden="true" />
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="搜索类别库/类/图元"
                  aria-label="搜索导出图元"
                />
                {searchQuery && (
                  <button type="button" aria-label="清空导出图元搜索" title="清空" onClick={() => setSearchQuery("")}>
                    <X size={13} />
                  </button>
                )}
              </div>
              <button
                type="button"
                className="symbol-export-tool"
                onClick={() => applyKinds(visibleTemplates.map((template) => template.kind), allVisibleState !== "all")}
              >
                {allVisibleState === "all" ? "取消全选" : "全选"}
              </button>
              <button
                type="button"
                className="symbol-export-tool"
                title="展开/收缩全部类别库与类"
                onClick={() =>
                  collapsedLibraries.length === 0 && collapsedSections.length === 0
                    ? (setCollapsedLibraries(categoryLibraries.slice()),
                       setCollapsedSections(classTreesByLibrary.flatMap(({ library, nodes }) =>
                         nodes.map((node) => `${library}::${node.section}`))))
                    : (setCollapsedLibraries([]), setCollapsedSections([]))
                }
              >
                {collapsedLibraries.length === 0 && collapsedSections.length === 0 ? "全部收缩" : "全部展开"}
              </button>
            </div>
            <div className="symbol-export-tree dialog-compact-tree" role="tree" aria-label="导出图元树">
              {visibleLibraries.length === 0 ? (
                <div className="dialog-tree-empty">未找到匹配图元</div>
              ) : (
                visibleLibraries.map(({ library, nodes }) => {
                  const libraryKinds = visibleKindsInNode(nodes);
                  const librarySelected = libraryKinds.filter((kind) => selectedSet.has(kind)).length;
                  const collapsed = collapsedLibraries.includes(library);
                  return (
                    <section className="symbol-export-library" key={library}>
                      <div
                        className="symbol-export-row library"
                        style={{ paddingLeft: treeRowIndentForLevel(TREE_LIBRARY_LEVEL) }}
                      >
                        <button
                          type="button"
                          className="symbol-export-chevron"
                          aria-label={`${collapsed ? "展开" : "收缩"} ${library}`}
                          onClick={() =>
                            setCollapsedLibraries((current) =>
                              current.includes(library)
                                ? current.filter((item) => item !== library)
                                : [...current, library]
                            )
                          }
                        >
                          {collapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
                        </button>
                        {renderCheckbox(
                          checkStateFor(librarySelected, libraryKinds.length),
                          () => applyKinds(libraryKinds, librarySelected !== libraryKinds.length),
                          `${library} 全选`
                        )}
                        <span className="symbol-export-row-label">{library}</span>
                        <strong>{libraryKinds.length}</strong>
                      </div>
                      {!collapsed && (
                        <div className="symbol-export-library-body">
                          {nodes.map((node) => renderSectionNode(library, node, 0))}
                        </div>
                      )}
                    </section>
                  );
                })
              )}
            </div>
          </div>
          <aside className="symbol-export-side">
            <section className="symbol-export-block">
              <header>
                <strong>预设过滤</strong>
                <div className="symbol-export-block-actions">
                  <button type="button" onClick={() => handleAllFilters(true)}>全选</button>
                  <button type="button" onClick={() => handleAllFilters(false)}>清空</button>
                </div>
              </header>
              <div className="symbol-export-filters">
                {SYMBOL_EXPORT_FILTERS.map((filter) => (
                  <label key={filter.key} className="symbol-export-filter" title={filter.hint}>
                    <input
                      type="checkbox"
                      className="symbol-export-check"
                      checked={activeFilterKeys.includes(filter.key)}
                      aria-label={filter.label}
                      onChange={() => toggleFilter(filter.key)}
                    />
                    <span>{filter.label}</span>
                    <small>{filterCounts.get(filter.key) ?? 0}</small>
                  </label>
                ))}
              </div>
              {/* 图元常同时命中多个分类（竖向图元=本体+vertical），故取消勾选是「硬排除」：
                  它压过其它仍被勾选的分类，否则取消「竖向图元」后竖向变体会残留。 */}
              <p className="symbol-export-filter-note">
                取消勾选即排除该分类：同时属于其它分类的图元也会一并隐藏。
              </p>
            </section>
            <section className="symbol-export-block symbol-export-selected">
              <header>
                <strong>已选图元</strong>
                <span className="symbol-export-selected-count">{selectedTemplates.length}</span>
              </header>
              <div className="symbol-export-selected-list" role="list" aria-label="已选图元清单">
                <SymbolExportSelectedList
                  templates={selectedTemplates}
                  onRemove={(kind) => applyKinds([kind], false)}
                />
              </div>
            </section>
            <section className="symbol-export-block symbol-export-schemes">
              <header>
                <strong>导出方案</strong>
                <div className="symbol-export-block-actions">
                  <button type="button" onClick={() => onReloadSchemes?.()}>刷新</button>
                </div>
              </header>
              <div className="symbol-export-scheme-save">
                <input
                  value={schemeName}
                  onChange={(event) => setSchemeName(event.target.value)}
                  placeholder="方案名称"
                  aria-label="导出方案名称"
                />
                <button type="button" className="primary" disabled={busy} onClick={handleSaveScheme}>
                  保存方案
                </button>
              </div>
              <div className="symbol-export-scheme-list" role="list" aria-label="已保存的导出方案">
                {schemes.length === 0 ? (
                  <div className="dialog-tree-empty">暂无已保存方案</div>
                ) : (
                  schemes.map((scheme) => (
                    <div
                      key={scheme.id}
                      role="listitem"
                      className={`symbol-export-scheme-row${activeSchemeId === scheme.id ? " active" : ""}`}
                    >
                      <button
                        type="button"
                        className="symbol-export-scheme-load"
                        title={`加载「${scheme.name}」（${scheme.templateKinds.length} 个图元）`}
                        onClick={() => handleLoadScheme(scheme)}
                      >
                        <span>{scheme.name}</span>
                        <small>{scheme.templateKinds.length}</small>
                      </button>
                      <button
                        type="button"
                        className="symbol-export-scheme-delete"
                        aria-label={`删除方案 ${scheme.name}`}
                        title="删除方案"
                        onClick={() => handleDeleteScheme(scheme)}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </section>
          </aside>
        </div>
        <footer className="symbol-export-footer">
          <span className="symbol-export-status" role="status">
            {status || statusMessage || "方案保存在后端，可随时加载复用。"}
          </span>
          <button type="button" onClick={onClose}>取消</button>
          <button
            type="button"
            disabled={busy || !onExportStandalone || selectedTemplates.length === 0}
            onClick={handleExportStandalone}
          >
            <Download size={14} aria-hidden="true" />
            独立图元 SVG 导出
          </button>
          <button
            type="button"
            className="primary"
            disabled={busy || selectedTemplates.length === 0}
            onClick={handleExport}
          >
            <Download size={14} aria-hidden="true" />
            合并到一个 SVG 中导出
          </button>
        </footer>
      </section>
    </div>
  );
}
