import { useMemo, type CSSProperties, type ReactNode } from "react";
import { ChevronDown, ChevronRight, FileJson, FolderOpen } from "lucide-react";
import {
  ElementTreePanel,
  GraphTemplatePreview,
  LibraryPanel,
  ProjectPanel,
  TemplateLibraryPanel,
  type GraphTemplateView
} from "./LeftPanels";
import { type SavedSchemeRecord } from "./model";

export type LeftPanelRenderersProps = Record<string, any>;

export function useLeftPanelRenderers(props: LeftPanelRenderersProps) {
  const {
    ELEMENT_TREE_ITEM_LIMIT_STEP,
    activeLayerEdgeIdSet,
    activeLayerNodeIdSet,
    activeProjectKey,
    activeSelectedEdgeSet,
    attributeLibraries,
    attributeLibraryComponentTypeKey,
    cancelLibraryPlacement,
    clearLibraryFlyoutCloseTimer,
    clearRecordSelection,
    collapsedCustomComponentTreeLibraries,
    collapsedCustomComponentTreeTypes,
    collapsedElementTreeGroups,
    collapsedExpandedModeAttributeLibraries,
    collapsedExpandedModeComponentTypes,
    colorPalette,
    componentLibraryDisplayMode,
    componentTypeDisplayParts,
    createCustomAttributeLibrary,
    createCustomComponentType,
    createEmptyCustomDeviceDraft,
    customComponentTreeSelection,
    customComponentTreeTypeKey,
    deleteSelectedCustomDeviceTreeItem,
    displayedAttributeLibraries,
    elementTree,
    elementTreeItemChildren,
    elementTreeItemLimits,
    expandedAttributeLibraries,
    expandedAttributeLibraryComponentTypes,
    expandedGraphTemplateTypes,
    expandedSchemeIds,
    filteredAttributeLibraryByComponentType,
    filteredProjectSchemes,
    finishProjectRecordDrag,
    finishSchemeRecordDrag,
    focusElementTreeItem,
    graphTemplateTypes,
    groupedAttributeLibraryByComponentType,
    groupedGraphTemplates,
    hideLibraryFlyout,
    hoveredAttributeLibrary,
    hoveredAttributeLibraryComponentType,
    hoveredGraphTemplateType,
    isBrowseMode,
    isEditMode,
    leftPanelTab,
    libraryComponentListRefKey,
    libraryFlyoutPositions,
    libraryFlyoutStyle,
    libraryPreviewByKind,
    libraryScrollRef,
    librarySearchNeedle,
    librarySearchQuery,
    moveProjectRecordToScheme,
    moveSchemeRecordToScheme,
    normalizeAttributeLibraryName,
    openDeviceDefinitionDialog,
    pointsToPreviewPath,
    projectListPointerInsideRef,
    projectSearchNeedle,
    projectSearchQuery,
    renameSelectedCustomDeviceTreeItem,
    requestLoadSavedProject,
    requireEditMode,
    scheduleLibraryFlyoutClose,
    schemes,
    selectCanvasGraphics,
    selectCustomAttributeLibrary,
    selectCustomComponentTemplate,
    selectCustomComponentType,
    selectSingleProject,
    selectSingleScheme,
    selectedNodeIdSet,
    selectedProjectId,
    selectedProjectIds,
    selectedSchemeId,
    selectedSchemeIds,
    setComponentLibraryDisplayMode,
    setCustomDeviceDialogOpen,
    setCustomDeviceDraft,
    setElementTreeItemLimits,
    setExpandedGraphTemplateTypes,
    setHoveredAttributeLibrary,
    setHoveredAttributeLibraryComponentType,
    setHoveredGraphTemplateType,
    setInspectorTab,
    setLibraryComponentListRef,
    setLibraryComponentTypeHeaderRef,
    setLibrarySearchQuery,
    setProjectMenu,
    setProjectSearchQuery,
    startCustomComponentCreate,
    startLibraryDevicePlacement,
    startLibraryGraphTemplatePlacement,
    startProjectRecordDrag,
    startSchemeRecordDrag,
    toggleAttributeLibrary,
    toggleAttributeLibraryComponentType,
    toggleCustomComponentTreeLibrary,
    toggleCustomComponentTreeType,
    toggleElementTreeGroup,
    toggleProjectSelection,
    toggleSchemeExpanded,
    toggleSchemeSelection,
    updateElementTreeContainerChildParam,
    updateElementTreeNodeIdentity
  } = props;

  const renderProjectSchemeNode = (scheme: SavedSchemeRecord, depth = 0): ReactNode => {
    const isExpanded = projectSearchNeedle ? true : expandedSchemeIds.includes(scheme.id);
    const children = scheme.children ?? [];
    const hasContent = scheme.projects.length > 0 || children.length > 0;
    const schemeIndentStyle = { "--scheme-depth": depth } as CSSProperties;
    const projectIndentStyle = { "--scheme-depth": depth + 1 } as CSSProperties;
    return (
      <div
        className={`scheme-group ${depth > 0 ? "nested" : ""}`}
        key={scheme.id}
      >
        <div
          role="option"
          aria-label={`方案：${scheme.name}`}
          aria-selected={selectedSchemeIds.includes(scheme.id) || selectedSchemeId === scheme.id}
          aria-expanded={isExpanded}
          tabIndex={0}
          draggable={isEditMode}
          className={`scheme-option ${selectedSchemeIds.includes(scheme.id) || selectedSchemeId === scheme.id ? "selected" : ""}`}
          style={schemeIndentStyle}
          onClick={(event) => {
            if (event.ctrlKey || event.metaKey || event.shiftKey) {
              toggleSchemeSelection(scheme.id);
            } else {
              selectSingleScheme(scheme.id);
            }
            toggleSchemeExpanded(scheme.id);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " " || event.key === "Spacebar") {
              event.preventDefault();
              if (event.ctrlKey || event.metaKey || event.shiftKey) {
                toggleSchemeSelection(scheme.id);
              } else {
                selectSingleScheme(scheme.id);
              }
              toggleSchemeExpanded(scheme.id);
            }
          }}
          onDragOver={(event) => event.preventDefault()}
          onDragStart={(event) => {
            if (!isEditMode) {
              event.preventDefault();
              return;
            }
            startSchemeRecordDrag(event, scheme.id);
          }}
          onDragEnd={finishSchemeRecordDrag}
          onDrop={(event) => {
            event.preventDefault();
            event.stopPropagation();
            if (!isEditMode) {
              return;
            }
            finishProjectRecordDrag();
            finishSchemeRecordDrag();
            const schemeId = event.dataTransfer.getData("application/scheme-id");
            if (schemeId) {
              moveSchemeRecordToScheme(schemeId, scheme.id);
              return;
            }
            const projectId = event.dataTransfer.getData("application/project-id");
            if (projectId) {
              moveProjectRecordToScheme(projectId, scheme.id);
            }
          }}
          onContextMenu={(event) => {
            event.preventDefault();
            event.stopPropagation();
            if (!selectedSchemeIds.includes(scheme.id)) {
              selectSingleScheme(scheme.id);
            }
            setProjectMenu({ x: event.clientX, y: event.clientY, schemeId: scheme.id });
          }}
        >
          {isExpanded ? <ChevronDown className="scheme-toggle-icon" size={14} /> : <ChevronRight className="scheme-toggle-icon" size={14} />}
          <FolderOpen className="scheme-folder-icon" size={15} />
          <span className="project-tree-name">{scheme.name}</span>
        </div>
        {isExpanded && (
          <div className="scheme-projects">
            {!hasContent ? (
              <p className="project-empty" style={projectIndentStyle}>暂无模型或子方案</p>
            ) : (
              <>
                {scheme.projects.map((project) => {
                  const isProjectSelected = selectedProjectIds.includes(project.id) || project.id === selectedProjectId;
                  return (
                    <div
                      role="option"
                      aria-label={`模型：${project.name}`}
                      aria-selected={isProjectSelected}
                      tabIndex={0}
                      draggable={isEditMode}
                      className={`project-option ${isProjectSelected ? "selected" : ""} ${project.id === activeProjectKey ? "active" : ""}`}
                      style={projectIndentStyle}
                      key={project.id}
                      onClick={(event) => {
                        if (event.ctrlKey || event.metaKey || event.shiftKey) {
                          toggleProjectSelection(scheme.id, project.id);
                        } else {
                          selectSingleProject(scheme.id, project.id);
                        }
                        setInspectorTab("model");
                      }}
                      onDoubleClick={() => requestLoadSavedProject(project, scheme.id)}
                      onDragStart={(event) => {
                        if (!isEditMode) {
                          event.preventDefault();
                          return;
                        }
                        startProjectRecordDrag(event, project.id);
                      }}
                      onDragEnd={finishProjectRecordDrag}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          requestLoadSavedProject(project, scheme.id);
                        } else if (event.key === " " || event.key === "Spacebar") {
                          event.preventDefault();
                          if (event.ctrlKey || event.metaKey || event.shiftKey) {
                            toggleProjectSelection(scheme.id, project.id);
                          } else {
                            selectSingleProject(scheme.id, project.id);
                          }
                        }
                      }}
                      onContextMenu={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        if (!selectedProjectIds.includes(project.id)) {
                          selectSingleProject(scheme.id, project.id);
                        }
                        setProjectMenu({ x: event.clientX, y: event.clientY, schemeId: scheme.id, projectId: project.id });
                      }}
                    >
                      <FileJson className="project-item-icon" size={14} />
                      <span className="project-tree-name">{project.name}</span>
                    </div>
                  );
                })}
                {children.map((child) => renderProjectSchemeNode(child, depth + 1))}
              </>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderProjectPanel = () => (
    <ProjectPanel
      projectSearchQuery={projectSearchQuery}
      setProjectSearchQuery={setProjectSearchQuery}
      projectListPointerInsideRef={projectListPointerInsideRef}
      isEditMode={isEditMode}
      setProjectMenu={setProjectMenu}
      schemesLength={schemes.length}
      filteredProjectSchemes={filteredProjectSchemes}
      renderProjectSchemeNode={(scheme) => renderProjectSchemeNode(scheme as SavedSchemeRecord)}
    />
  );

  const renderCustomComponentManagerTree = () => (
    <aside className="custom-component-manager-panel" aria-label="属性库元件类型元件管理">
      <div className="custom-component-manager-title">
        <strong>元件结构</strong>
        <span>属性库 / 元件类型 / 元件</span>
      </div>
      <div className="custom-component-manager-actions">
        <button type="button" onClick={createCustomAttributeLibrary}>新建属性库</button>
        <button type="button" onClick={createCustomComponentType}>新建元件类型</button>
        <button type="button" onClick={startCustomComponentCreate}>新建元件</button>
        <button type="button" onClick={renameSelectedCustomDeviceTreeItem}>重命名</button>
        <button type="button" onClick={deleteSelectedCustomDeviceTreeItem}>删除</button>
      </div>
      <div className="custom-component-manager-tree" role="tree">
        {attributeLibraries.map((group: string) => {
          const typeGroups = groupedAttributeLibraryByComponentType[group] ?? [];
          const librarySelected = customComponentTreeSelection.kind === "attributeLibrary" && customComponentTreeSelection.attributeLibraryName === group;
          const libraryCollapsed = collapsedCustomComponentTreeLibraries.some((item: string) => normalizeAttributeLibraryName(item) === group);
          return (
            <section className="custom-component-tree-library" key={group}>
              <button
                type="button"
                className={`custom-component-tree-row library ${librarySelected ? "active" : ""}`}
                role="treeitem"
                aria-selected={librarySelected}
                aria-expanded={!libraryCollapsed}
                onClick={() => {
                  selectCustomAttributeLibrary(group, { expand: false });
                  toggleCustomComponentTreeLibrary(group);
                }}
              >
                {libraryCollapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
                <span>{group}</span>
                <strong>{typeGroups.reduce((sum: number, typeGroup: any) => sum + typeGroup.templates.length, 0)}</strong>
              </button>
              {!libraryCollapsed && <div className="custom-component-tree-type-list" role="group">
                {typeGroups.map((typeGroup: any) => {
                  const typeKey = customComponentTreeTypeKey(group, typeGroup.section);
                  const typeCollapsed = collapsedCustomComponentTreeTypes.includes(typeKey);
                  const typeSelected =
                    customComponentTreeSelection.kind === "componentType" &&
                    customComponentTreeSelection.attributeLibraryName === group &&
                    customComponentTreeSelection.section === typeGroup.section;
                  return (
                    <section className="custom-component-tree-type" key={`${group}-${typeGroup.section}`}>
                      <button
                        type="button"
                        className={`custom-component-tree-row type ${typeSelected ? "active" : ""}`}
                        role="treeitem"
                        aria-selected={typeSelected}
                        aria-expanded={!typeCollapsed}
                        onClick={() => {
                          selectCustomComponentType(group, typeGroup.section, { expand: false });
                          toggleCustomComponentTreeType(group, typeGroup.section);
                        }}
                      >
                        {typeCollapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
                        <span>{typeGroup.section}</span>
                        <strong>{typeGroup.templates.length}</strong>
                      </button>
                      {!typeCollapsed && <div className="custom-component-tree-components" role="group" aria-label={`${group}/${typeGroup.section}元件列表`}>
                        {typeGroup.templates.map((template: any) => {
                          const componentSelected =
                            customComponentTreeSelection.kind === "component" &&
                            customComponentTreeSelection.templateKind === template.kind;
                          return (
                            <button
                              type="button"
                              key={template.kind}
                              className={`custom-component-tree-row component ${componentSelected ? "active" : ""}`}
                              role="treeitem"
                              aria-selected={componentSelected}
                              title={`${template.label} / ${typeGroup.section} / ${template.custom ? "自定义" : "系统内置"}`}
                              onClick={() => selectCustomComponentTemplate(template, typeGroup.section)}
                            >
                              <span>{template.label}</span>
                              <small>{template.custom ? "自定义" : "内置"}</small>
                            </button>
                          );
                        })}
                      </div>}
                    </section>
                  );
                })}
              </div>}
            </section>
          );
        })}
      </div>
    </aside>
  );

  const renderLibraryDefinitionActions = () => (
    <div className="library-definition-actions">
      <button
        type="button"
        className="custom-device-create-button"
        disabled={isBrowseMode}
        onClick={() => {
          if (!requireEditMode("新建元件")) {
            return;
          }
          setCustomDeviceDraft(createEmptyCustomDeviceDraft("交流设备"));
          setCustomDeviceDialogOpen(true);
        }}
      >
        新建元件
      </button>
      <button type="button" className="custom-device-create-button" disabled={isBrowseMode} onClick={openDeviceDefinitionDialog}>
        修改元件
      </button>
    </div>
  );

  const renderGraphTemplatePreview = (template: GraphTemplateView) => (
    <GraphTemplatePreview
      template={template}
      colorPalette={colorPalette}
      pointsToPreviewPath={pointsToPreviewPath}
    />
  );

  const renderTemplateLibraryPanel = () => (
    <TemplateLibraryPanel
      graphTemplateTypes={graphTemplateTypes}
      expandedGraphTemplateTypes={expandedGraphTemplateTypes}
      hoveredGraphTemplateType={hoveredGraphTemplateType}
      setHoveredGraphTemplateType={setHoveredGraphTemplateType}
      setExpandedGraphTemplateTypes={setExpandedGraphTemplateTypes}
      groupedGraphTemplates={groupedGraphTemplates}
      isEditMode={isEditMode}
      isBrowseMode={isBrowseMode}
      colorPalette={colorPalette}
      startLibraryGraphTemplatePlacement={startLibraryGraphTemplatePlacement}
      cancelLibraryPlacement={cancelLibraryPlacement}
      pointsToPreviewPath={pointsToPreviewPath}
    />
  );

  const renderLibraryPanel = () => (
    <LibraryPanel
      librarySearchQuery={librarySearchQuery}
      setLibrarySearchQuery={setLibrarySearchQuery}
      componentLibraryDisplayMode={componentLibraryDisplayMode}
      setComponentLibraryDisplayMode={setComponentLibraryDisplayMode}
      libraryScrollRef={libraryScrollRef}
      displayedAttributeLibraries={displayedAttributeLibraries}
      librarySearchNeedle={librarySearchNeedle}
      collapsedExpandedModeAttributeLibraries={collapsedExpandedModeAttributeLibraries}
      expandedAttributeLibraries={expandedAttributeLibraries}
      hoveredAttributeLibrary={hoveredAttributeLibrary}
      filteredAttributeLibraryByComponentType={filteredAttributeLibraryByComponentType}
      collapsedExpandedModeComponentTypes={collapsedExpandedModeComponentTypes}
      expandedAttributeLibraryComponentTypes={expandedAttributeLibraryComponentTypes}
      hoveredAttributeLibraryComponentType={hoveredAttributeLibraryComponentType}
      colorPalette={colorPalette}
      isEditMode={isEditMode}
      isBrowseMode={isBrowseMode}
      libraryPreviewByKind={libraryPreviewByKind}
      renderLibraryDefinitionActions={renderLibraryDefinitionActions}
      toggleAttributeLibrary={toggleAttributeLibrary}
      attributeLibraryComponentTypeKey={attributeLibraryComponentTypeKey}
      componentTypeDisplayParts={componentTypeDisplayParts}
      libraryComponentListRefKey={libraryComponentListRefKey}
      setLibraryComponentTypeHeaderRef={setLibraryComponentTypeHeaderRef}
      setLibraryComponentListRef={setLibraryComponentListRef}
      libraryFlyoutStyle={libraryFlyoutStyle}
      clearLibraryFlyoutCloseTimer={clearLibraryFlyoutCloseTimer}
      setHoveredAttributeLibrary={setHoveredAttributeLibrary}
      setHoveredAttributeLibraryComponentType={setHoveredAttributeLibraryComponentType}
      scheduleLibraryFlyoutClose={scheduleLibraryFlyoutClose}
      hideLibraryFlyout={hideLibraryFlyout}
      toggleAttributeLibraryComponentType={toggleAttributeLibraryComponentType}
      startLibraryDevicePlacement={startLibraryDevicePlacement}
      cancelLibraryPlacement={cancelLibraryPlacement}
    />
  );

  const renderElementTreePanel = () => (
    <ElementTreePanel
      elementTree={elementTree}
      collapsedElementTreeGroups={collapsedElementTreeGroups}
      elementTreeItemLimits={elementTreeItemLimits}
      initialItemLimit={ELEMENT_TREE_ITEM_LIMIT_STEP}
      activeLayerNodeIdSet={activeLayerNodeIdSet}
      activeLayerEdgeIdSet={activeLayerEdgeIdSet}
      selectedNodeIdSet={selectedNodeIdSet}
      activeSelectedEdgeSet={activeSelectedEdgeSet}
      toggleElementTreeGroup={toggleElementTreeGroup}
      elementTreeItemChildren={elementTreeItemChildren}
      selectCanvasGraphics={selectCanvasGraphics}
      clearRecordSelection={clearRecordSelection}
      focusElementTreeItem={focusElementTreeItem}
      updateElementTreeNodeIdentity={updateElementTreeNodeIdentity}
      updateElementTreeContainerChildParam={updateElementTreeContainerChildParam}
      setElementTreeItemLimits={setElementTreeItemLimits}
    />
  );

  const libraryPanelContent = useMemo(
    () => renderLibraryPanel(),
    [
      colorPalette,
      componentLibraryDisplayMode,
      collapsedExpandedModeAttributeLibraries,
      collapsedExpandedModeComponentTypes,
      displayedAttributeLibraries,
      expandedAttributeLibraries,
      expandedAttributeLibraryComponentTypes,
      filteredAttributeLibraryByComponentType,
      hoveredAttributeLibrary,
      hoveredAttributeLibraryComponentType,
      isBrowseMode,
      isEditMode,
      libraryFlyoutPositions,
      libraryPreviewByKind,
      librarySearchNeedle,
      librarySearchQuery
    ]
  );
  const templateLibraryPanelContent = useMemo(
    () => renderTemplateLibraryPanel(),
    [colorPalette, expandedGraphTemplateTypes, graphTemplateTypes, groupedGraphTemplates, hoveredGraphTemplateType, isBrowseMode, isEditMode]
  );
  const effectiveLeftPanelTab = isBrowseMode ? "projects" : leftPanelTab;
  const leftPanelContent = effectiveLeftPanelTab === "projects"
    ? renderProjectPanel()
    : effectiveLeftPanelTab === "templates"
      ? templateLibraryPanelContent
      : libraryPanelContent;
  return {
    effectiveLeftPanelTab,
    leftPanelContent,
    renderCustomComponentManagerTree,
    renderElementTreePanel,
    renderGraphTemplatePreview
  };
}
