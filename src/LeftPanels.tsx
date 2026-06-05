import { type MutableRefObject, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, ChevronRight, Grid2X2, Search, X } from "lucide-react";
import {
  createNodeFromTemplate,
  type ColorPalette,
  type DeviceTemplate,
  type ElementTreeChildItem,
  type ElementTreeGroup,
  type ElementTreeItem,
  type ModelNode,
  type Point
} from "./model";
import { canvasClipboardBounds, type CanvasClipboard } from "./selectionActions";
import { MemoDeviceGlyph, formatSvgNumber, nodeGeometryTransform } from "./DeviceGlyph";

export type GraphTemplateView = {
  id: string;
  typeName: string;
  name: string;
  sourceSize: { width: number; height: number };
  clipboard: CanvasClipboard;
  createdAt: string;
  updatedAt: string;
};

export type ProjectPanelProps = {
  projectSearchQuery: string;
  setProjectSearchQuery: (value: string) => void;
  projectListPointerInsideRef: MutableRefObject<boolean>;
  isEditMode: boolean;
  setProjectMenu: (menu: { x: number; y: number; schemeId?: string; projectId?: string } | null) => void;
  schemesLength: number;
  filteredProjectSchemes: unknown[];
  renderProjectSchemeNode: (scheme: unknown) => ReactNode;
};

export function ProjectPanel({
  projectSearchQuery,
  setProjectSearchQuery,
  projectListPointerInsideRef,
  isEditMode,
  setProjectMenu,
  schemesLength,
  filteredProjectSchemes,
  renderProjectSchemeNode
}: ProjectPanelProps) {
  return (
    <section className="project-panel">
      <div className="library-search project-search">
        <Search size={15} aria-hidden="true" />
        <input
          value={projectSearchQuery}
          onChange={(event) => setProjectSearchQuery(event.target.value)}
          placeholder="搜索方案/模型"
          aria-label="搜索模型库"
        />
        {projectSearchQuery && (
          <button type="button" aria-label="清空模型库搜索" title="清空" onClick={() => setProjectSearchQuery("")}>
            <X size={14} />
          </button>
        )}
      </div>
      <div
        className="project-list listbox"
        role="listbox"
        aria-label="绘图模型列表"
        onPointerEnter={() => {
          projectListPointerInsideRef.current = true;
        }}
        onPointerLeave={() => {
          projectListPointerInsideRef.current = false;
        }}
        onContextMenu={(event) => {
          const target = event.target as HTMLElement | null;
          if (target?.closest(".scheme-option, .project-option")) {
            return;
          }
          event.preventDefault();
          if (!isEditMode) {
            return;
          }
          setProjectMenu({ x: event.clientX, y: event.clientY });
        }}
      >
        {schemesLength === 0 ? (
          <p className="project-empty">暂无方案</p>
        ) : filteredProjectSchemes.length === 0 ? (
          <p className="project-empty project-search-empty">未找到匹配方案或模型</p>
        ) : (
          filteredProjectSchemes.map((scheme) => renderProjectSchemeNode(scheme))
        )}
      </div>
    </section>
  );
}

export type GraphTemplatePreviewProps = {
  template: GraphTemplateView;
  colorPalette: ColorPalette;
  pointsToPreviewPath: (points: Point[]) => string;
};

export function GraphTemplatePreview({ template, colorPalette, pointsToPreviewPath }: GraphTemplatePreviewProps) {
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
            <MemoDeviceGlyph node={node} miniature colorPalette={colorPalette} />
          </g>
        </g>
      ))}
    </svg>
  );
}

export type TemplateLibraryPanelProps = {
  graphTemplateTypes: string[];
  expandedGraphTemplateTypes: string[];
  hoveredGraphTemplateType: string;
  setHoveredGraphTemplateType: (value: string | ((current: string) => string)) => void;
  setExpandedGraphTemplateTypes: (value: string[] | ((current: string[]) => string[])) => void;
  groupedGraphTemplates: Record<string, GraphTemplateView[]>;
  isEditMode: boolean;
  isBrowseMode: boolean;
  colorPalette: ColorPalette;
  startLibraryGraphTemplatePlacement: (template: GraphTemplateView) => void;
  cancelLibraryPlacement: () => void;
  pointsToPreviewPath: (points: Point[]) => string;
};

export function TemplateLibraryPanel({
  graphTemplateTypes,
  expandedGraphTemplateTypes,
  hoveredGraphTemplateType,
  setHoveredGraphTemplateType,
  setExpandedGraphTemplateTypes,
  groupedGraphTemplates,
  isEditMode,
  isBrowseMode,
  colorPalette,
  startLibraryGraphTemplatePlacement,
  cancelLibraryPlacement,
  pointsToPreviewPath
}: TemplateLibraryPanelProps) {
  return (
    <div className="template-library-panel library-panel-stack">
      <div className="library-scroll">
        {graphTemplateTypes.map((typeName) => {
          const expanded = expandedGraphTemplateTypes.includes(typeName) || hoveredGraphTemplateType === typeName;
          const templates = groupedGraphTemplates[typeName] ?? [];
          return (
            <section
              className="library-group-section"
              key={typeName}
              onMouseEnter={() => setHoveredGraphTemplateType(typeName)}
              onMouseLeave={() => setHoveredGraphTemplateType((current) => current === typeName ? "" : current)}
            >
              <button
                className={`library-group-toggle ${expanded ? "active" : ""}`}
                onClick={() =>
                  setExpandedGraphTemplateTypes((current) =>
                    current.includes(typeName) ? current.filter((item) => item !== typeName) : [...current, typeName]
                  )
                }
              >
                {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                {typeName}
                <strong>{templates.length}</strong>
              </button>
              {expanded && (
                templates.length > 0 ? (
                  <div className="template-library-grid">
                    {templates.map((template) => (
                      <button
                        key={template.id}
                        type="button"
                        className="template-library-item"
                        draggable={isEditMode}
                        disabled={isBrowseMode}
                        title={`${template.typeName} / ${template.name} / ${template.sourceSize.width}x${template.sourceSize.height}`}
                        onClick={() => startLibraryGraphTemplatePlacement(template)}
                        onContextMenu={(event) => {
                          event.preventDefault();
                          cancelLibraryPlacement();
                        }}
                        onDragStart={(event) => {
                          if (!isEditMode) {
                            event.preventDefault();
                            return;
                          }
                          cancelLibraryPlacement();
                          event.dataTransfer.setData("application/graph-template-id", template.id);
                          event.dataTransfer.effectAllowed = "copy";
                        }}
                      >
                        <span className="template-library-icon">
                          <GraphTemplatePreview template={template} colorPalette={colorPalette} pointsToPreviewPath={pointsToPreviewPath} />
                        </span>
                        <span className="template-library-name">{template.name}</span>
                        <small>{template.sourceSize.width}x{template.sourceSize.height}</small>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="template-library-empty">暂无模板</div>
                )
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

export type LibraryTemplateButtonProps = {
  item: DeviceTemplate;
  section: string;
  preview?: ModelNode;
  isEditMode: boolean;
  isBrowseMode: boolean;
  componentLibraryDisplayMode: "expanded" | "right";
  colorPalette: ColorPalette;
  startLibraryDevicePlacement: (template: DeviceTemplate) => void;
  cancelLibraryPlacement: () => void;
  hideLibraryFlyout: () => void;
};

export function LibraryTemplateButton({
  item,
  section,
  preview,
  isEditMode,
  isBrowseMode,
  componentLibraryDisplayMode,
  colorPalette,
  startLibraryDevicePlacement,
  cancelLibraryPlacement,
  hideLibraryFlyout
}: LibraryTemplateButtonProps) {
  const previewNode = preview ?? createNodeFromTemplate(item, { x: 0, y: 0 });
  const previewRotation = ((Math.round(previewNode.rotation) % 360) + 360) % 360;
  const previewViewBox = previewRotation === 90 || previewRotation === 270 ? "-48 -48 96 96" : "-40 -28 80 56";
  return (
    <button
      key={item.kind}
      className="library-item"
      draggable={isEditMode}
      disabled={isBrowseMode}
      title={`${item.label} / ${section}`}
      onClick={() => startLibraryDevicePlacement(item)}
      onContextMenu={(event) => {
        event.preventDefault();
        cancelLibraryPlacement();
      }}
      onDragStart={(event) => {
        if (!isEditMode) {
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
        <g transform={nodeGeometryTransform(previewNode)}>
          <MemoDeviceGlyph node={previewNode} miniature colorPalette={colorPalette} />
        </g>
      </svg>
    </button>
  );
}

export type LibraryPanelProps = {
  librarySearchQuery: string;
  setLibrarySearchQuery: (value: string) => void;
  componentLibraryDisplayMode: "expanded" | "right";
  setComponentLibraryDisplayMode: (value: "expanded" | "right") => void;
  libraryScrollRef: MutableRefObject<HTMLDivElement | null>;
  displayedAttributeLibraries: string[];
  librarySearchNeedle: string;
  collapsedExpandedModeAttributeLibraries: string[];
  expandedAttributeLibraries: string[];
  hoveredAttributeLibrary: string;
  filteredAttributeLibraryByComponentType: Record<string, Array<{ section: string; templates: DeviceTemplate[] }>>;
  collapsedExpandedModeComponentTypes: string[];
  expandedAttributeLibraryComponentTypes: string[];
  hoveredAttributeLibraryComponentType: string;
  colorPalette: ColorPalette;
  isEditMode: boolean;
  isBrowseMode: boolean;
  libraryPreviewByKind: ReadonlyMap<string, ModelNode>;
  renderLibraryDefinitionActions: () => ReactNode;
  toggleAttributeLibrary: (group: string) => void;
  attributeLibraryComponentTypeKey: (group: string, section: string) => string;
  componentTypeDisplayParts: (section: string) => { title: string; chinese: string; english: string };
  libraryComponentListRefKey: (scope: "inline" | "flyout", componentTypeKey: string) => string;
  setLibraryComponentTypeHeaderRef: (key: string) => (element: HTMLButtonElement | null) => void;
  setLibraryComponentListRef: (key: string) => (element: HTMLDivElement | null) => void;
  libraryFlyoutStyle: (key: string) => React.CSSProperties;
  clearLibraryFlyoutCloseTimer: () => void;
  setHoveredAttributeLibrary: (value: string | ((current: string) => string)) => void;
  setHoveredAttributeLibraryComponentType: (value: string | ((current: string) => string)) => void;
  scheduleLibraryFlyoutClose: (group: string, componentTypeKey?: string) => void;
  hideLibraryFlyout: () => void;
  toggleAttributeLibraryComponentType: (group: string, section: string) => void;
  startLibraryDevicePlacement: (template: DeviceTemplate) => void;
  cancelLibraryPlacement: () => void;
};

export function LibraryPanel(props: LibraryPanelProps) {
  const {
    librarySearchQuery,
    setLibrarySearchQuery,
    componentLibraryDisplayMode,
    setComponentLibraryDisplayMode,
    libraryScrollRef,
    displayedAttributeLibraries,
    librarySearchNeedle,
    collapsedExpandedModeAttributeLibraries,
    expandedAttributeLibraries,
    hoveredAttributeLibrary,
    filteredAttributeLibraryByComponentType,
    collapsedExpandedModeComponentTypes,
    expandedAttributeLibraryComponentTypes,
    hoveredAttributeLibraryComponentType,
    colorPalette,
    isEditMode,
    isBrowseMode,
    libraryPreviewByKind,
    renderLibraryDefinitionActions,
    toggleAttributeLibrary,
    attributeLibraryComponentTypeKey,
    componentTypeDisplayParts,
    libraryComponentListRefKey,
    setLibraryComponentTypeHeaderRef,
    setLibraryComponentListRef,
    libraryFlyoutStyle,
    clearLibraryFlyoutCloseTimer,
    setHoveredAttributeLibrary,
    setHoveredAttributeLibraryComponentType,
    scheduleLibraryFlyoutClose,
    hideLibraryFlyout,
    toggleAttributeLibraryComponentType,
    startLibraryDevicePlacement,
    cancelLibraryPlacement
  } = props;

  const renderTemplateButton = (item: DeviceTemplate, section: string) => (
    <LibraryTemplateButton
      key={item.kind}
      item={item}
      section={section}
      preview={libraryPreviewByKind.get(item.kind)}
      isEditMode={isEditMode}
      isBrowseMode={isBrowseMode}
      componentLibraryDisplayMode={componentLibraryDisplayMode}
      colorPalette={colorPalette}
      startLibraryDevicePlacement={startLibraryDevicePlacement}
      cancelLibraryPlacement={cancelLibraryPlacement}
      hideLibraryFlyout={hideLibraryFlyout}
    />
  );

  const renderLibraryFlyout = (flyoutListKey: string, componentTypeKey: string, group: string, typeGroup: { section: string; templates: DeviceTemplate[] }) => {
    const flyout = (
      <div
        className="library-group flyout-library-group"
        ref={setLibraryComponentListRef(flyoutListKey)}
        style={libraryFlyoutStyle(flyoutListKey)}
        onMouseEnter={() => {
          clearLibraryFlyoutCloseTimer();
          setHoveredAttributeLibrary(group);
          setHoveredAttributeLibraryComponentType(componentTypeKey);
        }}
        onMouseLeave={() => scheduleLibraryFlyoutClose(group, componentTypeKey)}
      >
        {typeGroup.templates.map((item) => renderTemplateButton(item, typeGroup.section))}
      </div>
    );
    if (typeof document === "undefined") {
      return flyout;
    }
    return createPortal(flyout, document.body);
  };

  return (
    <div className="library-panel-stack">
      <div className="library-search">
        <Search size={15} aria-hidden="true" />
        <input
          value={librarySearchQuery}
          onChange={(event) => setLibrarySearchQuery(event.target.value)}
          placeholder="搜索图元/类型"
          aria-label="搜索图元库"
        />
        {librarySearchQuery && (
          <button type="button" aria-label="清空图元库搜索" title="清空" onClick={() => setLibrarySearchQuery("")}>
            <X size={14} />
          </button>
        )}
      </div>
      <div className="library-display-mode" role="radiogroup" aria-label="图元库展开方式">
        {([
          ["expanded", "向下展开"],
          ["right", "向右浮动"]
        ] as const).map(([mode, label]) => (
          <label key={mode} className={componentLibraryDisplayMode === mode ? "active" : ""}>
            <input
              type="radio"
              name="component-library-display-mode"
              value={mode}
              checked={componentLibraryDisplayMode === mode}
              onChange={() => setComponentLibraryDisplayMode(mode)}
            />
            <span>{label}</span>
          </label>
        ))}
      </div>
      <div
        className={`library-scroll ${componentLibraryDisplayMode === "right" ? "library-scroll-flyout" : ""}`}
        ref={libraryScrollRef}
        onScroll={() => {
          if (componentLibraryDisplayMode === "right") {
            hideLibraryFlyout();
          }
        }}
      >
        {displayedAttributeLibraries.length > 0 ? displayedAttributeLibraries.map((group) => {
          const libraryExpanded = componentLibraryDisplayMode === "expanded";
          const libraryFlyout = componentLibraryDisplayMode === "right";
          const expanded = librarySearchNeedle ? true : libraryExpanded
            ? !collapsedExpandedModeAttributeLibraries.includes(group)
            : expandedAttributeLibraries.includes(group) || hoveredAttributeLibrary === group;
          const typeGroups = filteredAttributeLibraryByComponentType[group] ?? [];
          return (
            <section
              className="library-group-section"
              key={group}
              onMouseEnter={() => {
                if (!libraryExpanded) {
                  clearLibraryFlyoutCloseTimer();
                  setHoveredAttributeLibrary(group);
                }
              }}
              onMouseLeave={() => {
                if (!libraryExpanded) {
                  if (libraryFlyout) {
                    scheduleLibraryFlyoutClose(group);
                  } else {
                    setHoveredAttributeLibrary((current) => current === group ? "" : current);
                    setHoveredAttributeLibraryComponentType("");
                  }
                }
              }}
            >
              <button
                className={`library-group-toggle ${expanded ? "active" : ""}`}
                onClick={() => toggleAttributeLibrary(group)}
              >
                {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                {group}
              </button>
              {expanded && (
                <div className="attribute-library-component-type-list">
                  {typeGroups.map((typeGroup) => {
                    const componentTypeKey = attributeLibraryComponentTypeKey(group, typeGroup.section);
                    const componentTypeDisplay = componentTypeDisplayParts(typeGroup.section);
                    const componentTypeExpanded = librarySearchNeedle
                      ? true
                      : libraryExpanded
                        ? !collapsedExpandedModeComponentTypes.includes(componentTypeKey)
                        : libraryFlyout ? false : expandedAttributeLibraryComponentTypes.includes(componentTypeKey) || hoveredAttributeLibraryComponentType === componentTypeKey;
                    const componentTypeFlyoutVisible = libraryFlyout && !librarySearchNeedle && hoveredAttributeLibraryComponentType === componentTypeKey;
                    const inlineListKey = libraryComponentListRefKey("inline", componentTypeKey);
                    const flyoutListKey = libraryComponentListRefKey("flyout", componentTypeKey);
                    return (
                      <section
                        className={`attribute-library-component-type-section ${libraryFlyout ? "flyout-mode" : ""}`}
                        key={`${group}-${typeGroup.section}`}
                        onMouseEnter={() => {
                          if (!libraryExpanded) {
                            clearLibraryFlyoutCloseTimer();
                            setHoveredAttributeLibraryComponentType(componentTypeKey);
                          }
                        }}
                        onMouseLeave={() => {
                          if (!libraryExpanded) {
                            if (libraryFlyout) {
                              scheduleLibraryFlyoutClose(group, componentTypeKey);
                            } else {
                              setHoveredAttributeLibraryComponentType((current) => current === componentTypeKey ? "" : current);
                            }
                          }
                        }}
                      >
                        <button
                          type="button"
                          ref={setLibraryComponentTypeHeaderRef(flyoutListKey)}
                          className={`attribute-library-component-type-header ${componentTypeExpanded || componentTypeFlyoutVisible ? "active" : ""}`}
                          aria-expanded={componentTypeExpanded || componentTypeFlyoutVisible}
                          onClick={() => toggleAttributeLibraryComponentType(group, typeGroup.section)}
                        >
                          <span className="component-type-title">
                            {componentTypeExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                            <span className="component-type-name" title={componentTypeDisplay.title}>
                              <span className="component-type-name-cn">{componentTypeDisplay.chinese}</span>
                              <span className="component-type-name-en">{componentTypeDisplay.english}</span>
                            </span>
                          </span>
                          <strong>{typeGroup.templates.length}</strong>
                        </button>
                        {componentTypeExpanded && (
                          <div className="library-group inline-library-group" ref={setLibraryComponentListRef(inlineListKey)}>
                            {typeGroup.templates.map((item) => renderTemplateButton(item, typeGroup.section))}
                          </div>
                        )}
                        {componentTypeFlyoutVisible && renderLibraryFlyout(flyoutListKey, componentTypeKey, group, typeGroup)}
                      </section>
                    );
                  })}
                </div>
              )}
            </section>
          );
        }) : (
          <div className="library-empty">未找到匹配图元</div>
        )}
      </div>
      {renderLibraryDefinitionActions()}
    </div>
  );
}

export type ElementTreePanelProps = {
  elementTree: ElementTreeGroup[];
  collapsedElementTreeGroups: string[];
  elementTreeItemLimits: Record<string, number>;
  initialItemLimit: number;
  activeLayerNodeIdSet: ReadonlySet<string>;
  activeLayerEdgeIdSet: ReadonlySet<string>;
  selectedNodeIdSet: ReadonlySet<string>;
  activeSelectedEdgeSet: ReadonlySet<string>;
  toggleElementTreeGroup: (typeKey: string) => void;
  elementTreeItemChildren: (item: ElementTreeItem) => ElementTreeChildItem[];
  selectCanvasGraphics: (nodeIds: string[], edgeIds: string[]) => void;
  clearRecordSelection: () => void;
  focusElementTreeItem: (item: ElementTreeItem, openDeviceTab?: boolean) => void;
  updateElementTreeNodeIdentity: (nodeId: string, field: "idx" | "name", value: string) => void;
  updateElementTreeContainerChildParam: (nodeId: string, key: string, value: string) => void;
  setElementTreeItemLimits: (value: Record<string, number> | ((current: Record<string, number>) => Record<string, number>)) => void;
};

export function ElementTreePanel({
  elementTree,
  collapsedElementTreeGroups,
  elementTreeItemLimits,
  initialItemLimit,
  activeLayerNodeIdSet,
  activeLayerEdgeIdSet,
  selectedNodeIdSet,
  activeSelectedEdgeSet,
  toggleElementTreeGroup,
  elementTreeItemChildren,
  selectCanvasGraphics,
  clearRecordSelection,
  focusElementTreeItem,
  updateElementTreeNodeIdentity,
  updateElementTreeContainerChildParam,
  setElementTreeItemLimits
}: ElementTreePanelProps) {
  return (
    <div className="element-tree" role="tree" aria-label="图元树">
      {elementTree.length === 0 ? (
        <div className="empty-state compact">
          <Grid2X2 size={24} />
          <p>当前画布暂无图元。</p>
        </div>
      ) : (
        elementTree.map((group) => {
          const expanded = !collapsedElementTreeGroups.includes(group.typeKey);
          const visibleLimit = elementTreeItemLimits[group.typeKey] ?? initialItemLimit;
          const visibleItems = group.items.slice(0, visibleLimit);
          const hiddenItemCount = Math.max(0, group.items.length - visibleItems.length);
          return (
            <section className="element-tree-group" key={group.typeKey}>
              <button
                type="button"
                className="element-tree-type"
                role="treeitem"
                aria-expanded={expanded}
                onClick={() => toggleElementTreeGroup(group.typeKey)}
              >
                <span className="element-tree-type-label">
                  {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  <span>{group.typeLabel}</span>
                </span>
                <strong>{group.items.length}</strong>
              </button>
              {expanded && (
                <div className="element-tree-items" role="group">
                  {visibleItems.map((item) => {
                    const editable = item.kind === "node" ? activeLayerNodeIdSet.has(item.id) : activeLayerEdgeIdSet.has(item.id);
                    const selected = editable && (item.kind === "node" ? selectedNodeIdSet.has(item.id) : activeSelectedEdgeSet.has(item.id));
                    const itemChildren = elementTreeItemChildren(item);
                    const selectTreeItem = () => {
                      if (!editable) {
                        return;
                      }
                      if (item.kind === "node") {
                        selectCanvasGraphics([item.id], []);
                        clearRecordSelection();
                      } else {
                        selectCanvasGraphics([], [item.id]);
                      }
                    };
                    return (
                      <div
                        role="treeitem"
                        aria-level={2}
                        aria-selected={selected}
                        className={`element-tree-item ${selected ? "selected" : ""}`}
                        key={item.id}
                        title="双击定位并选中图元"
                        tabIndex={0}
                        onClick={selectTreeItem}
                        onDoubleClick={() => focusElementTreeItem(item, true)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            focusElementTreeItem(item);
                          }
                        }}
                      >
                        <div className="element-tree-item-main">
                          {item.kind === "node" && item.editableDevice ? (
                            <div className="element-tree-device-fields">
                              <label>
                                <span>idx</span>
                                <input
                                  value={item.idx ?? ""}
                                  inputMode="numeric"
                                  onClick={(event) => event.stopPropagation()}
                                  onDoubleClick={(event) => event.stopPropagation()}
                                  onKeyDown={(event) => event.stopPropagation()}
                                  disabled={!editable}
                                  onChange={(event) => updateElementTreeNodeIdentity(item.id, "idx", event.target.value)}
                                />
                              </label>
                              <label>
                                <span>name</span>
                                <input
                                  value={item.name}
                                  onClick={(event) => event.stopPropagation()}
                                  onDoubleClick={(event) => event.stopPropagation()}
                                  onKeyDown={(event) => event.stopPropagation()}
                                  disabled={!editable}
                                  onChange={(event) => updateElementTreeNodeIdentity(item.id, "name", event.target.value)}
                                />
                              </label>
                            </div>
                          ) : (
                            <span>{item.name}</span>
                          )}
                        </div>
                        {itemChildren.length ? (
                          <div className="element-tree-child-list" role="group" aria-label={`${item.name}关联子设备`}>
                            {itemChildren.map((child) => (
                              <div className="element-tree-child-item" key={child.id}>
                                <span className="element-tree-child-type" title={child.componentType}>
                                  {child.componentType}
                                </span>
                                <label>
                                  <span>idx</span>
                                  <input
                                    value={child.idx}
                                    inputMode="numeric"
                                    onClick={(event) => event.stopPropagation()}
                                    onDoubleClick={(event) => event.stopPropagation()}
                                    onKeyDown={(event) => event.stopPropagation()}
                                    disabled={!editable}
                                    onChange={(event) => updateElementTreeContainerChildParam(item.id, child.relationKeys[0] ?? "", event.target.value)}
                                  />
                                </label>
                                <label className="element-tree-child-name-field">
                                  <span>name</span>
                                  <input
                                    value={child.name}
                                    onClick={(event) => event.stopPropagation()}
                                    onDoubleClick={(event) => event.stopPropagation()}
                                    onKeyDown={(event) => event.stopPropagation()}
                                    disabled={!editable}
                                    onChange={(event) => updateElementTreeContainerChildParam(item.id, child.nameKey, event.target.value)}
                                  />
                                </label>
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                  {hiddenItemCount > 0 && (
                    <button
                      type="button"
                      className="element-tree-more"
                      onClick={() =>
                        setElementTreeItemLimits((current) => ({
                          ...current,
                          [group.typeKey]: visibleLimit + initialItemLimit
                        }))
                      }
                    >
                      显示更多（还有 {hiddenItemCount} 个）
                    </button>
                  )}
                </div>
              )}
            </section>
          );
        })
      )}
    </div>
  );
}
