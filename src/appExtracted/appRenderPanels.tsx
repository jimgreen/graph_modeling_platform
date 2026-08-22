// @ts-nocheck
// 从 App.tsx 提取的面板渲染工厂函数。
// 模式：export function createXxx(__appScope) { ...; return () => <JSX />; }

import { createPortal } from "react-dom";
import { Input, Button } from "antd";

// 图层管理面板
export function createRenderLayerManager(__appScope) {
  const {
    layers, activeLayerId, setActiveLayer, isBrowseMode,
    addModelLayer, setAllModelLayersVisibility, toggleModelLayerVisibility,
    commitModelLayerName, moveModelLayer, deleteModelLayer,
    BufferedTextInput
  } = __appScope;
  return () => (
    <div className="layer-manager">
      <div className="layer-manager-toolbar">
        <Button onClick={addModelLayer}>新增图层</Button>
        <Button onClick={() => setAllModelLayersVisibility(true)}>全部显示</Button>
        <Button onClick={() => setAllModelLayersVisibility(false)}>全部隐藏</Button>
      </div>
      <div className="layer-list">
        {layers.map((layer, index) => (
          <div key={layer.id} className={`layer-row ${layer.id === activeLayerId ? "active" : ""}`}>
            <label className="layer-row-control" title={layer.id === activeLayerId ? "激活图层必须显示" : "显示/隐藏图层"}>
              <input
                type="checkbox"
                checked={layer.visible}
                disabled={layer.id === activeLayerId}
                onChange={() => toggleModelLayerVisibility(layer.id)}
              />
              显示
            </label>
            <label className="layer-row-control">
              <input
                type="radio"
                name="active-layer"
                checked={layer.id === activeLayerId}
                onChange={() => setActiveLayer(layer.id)}
              />
              激活
            </label>
            <BufferedTextInput
              className="layer-name-input"
              aria-label={`图层名称：${layer.name}`}
              value={layer.name}
              disabled={isBrowseMode}
              onCommit={(nextValue) => commitModelLayerName(layer.id, nextValue)}
              onKeyDown={(event) => event.stopPropagation()}
            />
            <Button onClick={() => moveModelLayer(layer.id, -1)} disabled={index === 0} title="图层上移">上移</Button>
            <Button onClick={() => moveModelLayer(layer.id, 1)} disabled={index === layers.length - 1} title="图层下移">下移</Button>
            <Button onClick={() => deleteModelLayer(layer.id)} disabled={layers.length <= 1} title="删除图层">删除</Button>
          </div>
        ))}
      </div>
    </div>
  );
}

// 类定义操作按钮
export function createRenderLibraryDefinitionActions(__appScope) {
  const { isBrowseMode, openMeasurementConfigDialog, openDeviceDefinitionDialog } = __appScope;
  return () => (
    <div className="library-definition-actions">
      <button
        type="button"
        className="custom-device-create-button measurement-config-open-button"
        disabled={isBrowseMode}
        onClick={openMeasurementConfigDialog}
      >
        量测定义
      </button>
      <button type="button" className="custom-device-create-button" disabled={isBrowseMode} onClick={openDeviceDefinitionDialog}>
        元件定义
      </button>
    </div>
  );
}

// 图模板按钮
export function createRenderGraphTemplateButton(__appScope) {
  const {
    isEditMode, isBrowseMode, templateLibraryDisplayMode,
    startLibraryGraphTemplatePlacement, cancelLibraryPlacement,
    setContextMenu, setProjectMenu, setTemplateMenu,
    clearLibraryFlyoutCloseTimer, setHoveredGraphTemplateType,
    hideLibraryFlyout, renderGraphTemplatePreview
  } = __appScope;
  return (template) => (
    <button
      key={template.id}
      type="button"
      className="template-library-item"
      draggable={isEditMode}
      disabled={isBrowseMode}
      title={`${template.typeName} / ${template.name} / ${template.sourceSize.width}×${template.sourceSize.height}`}
      onClick={() => startLibraryGraphTemplatePlacement(template)}
      onContextMenu={(event) => {
        event.preventDefault();
        event.stopPropagation();
        cancelLibraryPlacement();
        setContextMenu(null);
        setProjectMenu(null);
        if (templateLibraryDisplayMode === "right") {
          clearLibraryFlyoutCloseTimer();
          setHoveredGraphTemplateType(template.typeName);
        }
        setTemplateMenu({
          x: event.clientX,
          y: event.clientY,
          templateId: template.id
        });
      }}
      onDragStart={(event) => {
        if (!isEditMode) {
          event.preventDefault();
          return;
        }
        cancelLibraryPlacement();
        event.dataTransfer.setData("application/graph-template-id", template.id);
        event.dataTransfer.effectAllowed = "copy";
        if (templateLibraryDisplayMode === "right") {
          hideLibraryFlyout();
        }
      }}
    >
      <span className="template-library-icon">
        {renderGraphTemplatePreview(template)}
      </span>
      <span className="template-library-name">{template.name}</span>
      <small>{template.sourceSize.width}×{template.sourceSize.height}</small>
    </button>
  );
}

// 图模板浮动面板
export function createRenderGraphTemplateFlyout(__appScope) {
  const {
    setLibraryComponentListRef, libraryFlyoutStyle,
    clearLibraryFlyoutCloseTimer, setHoveredGraphTemplateType,
    scheduleGraphTemplateFlyoutClose, renderGraphTemplateButton
  } = __appScope;
  return (flyoutListKey, typeName, templates) => {
    const flyout = (
      <div
        className="library-group flyout-library-group template-library-flyout"
        ref={setLibraryComponentListRef(flyoutListKey)}
        style={libraryFlyoutStyle(flyoutListKey)}
        onMouseEnter={() => {
          clearLibraryFlyoutCloseTimer();
          setHoveredGraphTemplateType(typeName);
        }}
        onMouseLeave={() => scheduleGraphTemplateFlyoutClose(typeName)}
      >
        {templates.map(renderGraphTemplateButton)}
      </div>
    );
    if (typeof document === "undefined") {
      return flyout;
    }
    return createPortal(flyout, document.body);
  };
}

// 项目面板
export function createRenderProjectPanel(__appScope) {
  const {
    Search, X,
    MODEL_TYPES,
    openBlankProjectLibraryContextMenu,
    projectSearchQuery, setProjectSearchQuery,
    projectModelTypeFilter, setProjectModelTypeFilter,
    projectListPointerInsideRef,
    backendSchemesLoadedRef,
    schemes, filteredProjectSchemes, renderProjectSchemeNode
  } = __appScope;
  const toggleModelType = (type: string) => {
    setProjectModelTypeFilter((prev: string[]) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };
  return () => (
    <section className="project-panel" onContextMenu={openBlankProjectLibraryContextMenu}>
      <div className="library-search project-search">
        <Search size={15} aria-hidden="true" />
        <Input
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
      <div className="project-model-type-filter">
        {MODEL_TYPES.map((type) => (
          <button
            key={type}
            type="button"
            className={`project-model-type-btn${projectModelTypeFilter?.includes(type) ? " active" : ""}`}
            onClick={() => toggleModelType(type)}
            title={type}
          >
            {type}
          </button>
        ))}
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
        onContextMenu={openBlankProjectLibraryContextMenu}
      >
        {schemes.length === 0 ? (
          <p className="project-empty">
            {backendSchemesLoadedRef.current ? "暂无方案" : "正在连接模型库，恢复后将自动加载..."}
          </p>
        ) : filteredProjectSchemes.length === 0 ? (
          <p className="project-empty project-search-empty">未找到匹配方案或模型</p>
        ) : (
          filteredProjectSchemes.map((scheme) => renderProjectSchemeNode(scheme))
        )}
      </div>
    </section>
  );
}

// 图元树面板
export function createRenderElementTreePanel(__appScope) {
  const {
    Search, X, Grid2X2, ChevronDown, ChevronRight, LocateFixed,
    BufferedTextInput, clampNumber,
    ELEMENT_TREE_INITIAL_ITEM_LIMIT, ELEMENT_TREE_ITEM_LIMIT_STEP,
    elementTreeSearchQuery, setElementTreeSearchQuery,
    elementTree, filteredElementTree, elementTreeSearchNeedle,
    collapsedElementTreeGroups, collapsedElementTreeDeviceGroups,
    toggleElementTreeGroup, toggleElementTreeDeviceGroup,
    elementTreeItemLimits, setElementTreeItemLimits,
    elementTreeItemWindows, elementTreeItemHeights,
    activeLayerNodeIdSet, activeLayerEdgeIdSet,
    selectedNodeIdSet, activeSelectedEdgeSet,
    elementTreeItemChildren,
    selectCanvasGraphics, clearRecordSelection,
    focusElementTreeItem, jumpToElementTreeItem,
    openElementTreeItemContextMenu,
    elementTreeItemRefs,
    isBrowseMode,
    commitElementTreeNodeIdentity, commitElementTreeContainerChildParam
  } = __appScope;
  return () => (
    <div className="element-tree" role="tree" aria-label="图元树">
      <div className="element-tree-search" role="presentation">
        <Search size={14} aria-hidden="true" />
        <Input
          value={elementTreeSearchQuery}
          onChange={(event) => setElementTreeSearchQuery(event.target.value)}
          placeholder="搜索图元名称"
          aria-label="搜索图元树"
        />
        {elementTreeSearchQuery && (
          <button type="button" aria-label="清空图元树搜索" title="清空" onClick={() => setElementTreeSearchQuery("")}>
            <X size={13} />
          </button>
        )}
      </div>
      {elementTree.length === 0 ? (
        <div className="empty-state compact">
          <Grid2X2 size={24} />
          <p>当前画布暂无图元。</p>
        </div>
      ) : filteredElementTree.length === 0 ? (
        <div className="empty-state compact element-tree-search-empty">
          <Search size={22} />
          <p>未找到匹配图元。</p>
        </div>
      ) : (
        filteredElementTree.map((group) => {
          const expanded = Boolean(elementTreeSearchNeedle) || !collapsedElementTreeGroups.includes(group.typeKey);
          const deviceGroups = group.deviceGroups ?? [];
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
                  <span className="element-tree-bilingual">
                    <span>{group.typeLabel}</span>
                    {group.typeEnglishLabel ? <small>{group.typeEnglishLabel}</small> : null}
                  </span>
                </span>
                <strong>{group.items.length}</strong>
              </button>
              {expanded && (
                <div className="element-tree-items" role="group">
                  {deviceGroups.map((deviceGroup) => {
                    const deviceExpanded = Boolean(elementTreeSearchNeedle) || !collapsedElementTreeDeviceGroups.includes(deviceGroup.deviceKey);
                    const visibleLimit = elementTreeItemLimits[deviceGroup.deviceKey] ?? ELEMENT_TREE_INITIAL_ITEM_LIMIT;
                    const windowState = elementTreeItemWindows[deviceGroup.deviceKey];
                    const totalItems = deviceGroup.items.length;
                    let windowStart = 0;
                    let windowEnd = totalItems;
                    const windowEffective = !elementTreeSearchNeedle && Boolean(windowState);
                    if (windowEffective) {
                      windowStart = clampNumber(totalItems, 0, windowState!.start);
                      windowEnd = Math.min(totalItems, Math.max(windowStart + 1, windowState!.end));
                    }
                    const windowActive = windowEffective && !(windowStart === 0 && windowEnd === totalItems);
                    const visibleItems = elementTreeSearchNeedle
                      ? deviceGroup.items
                      : (windowEffective
                          ? (windowStart === 0 && windowEnd === totalItems
                              ? deviceGroup.items
                              : deviceGroup.items.slice(windowStart, windowEnd))
                          : deviceGroup.items.slice(0, visibleLimit));
                    const hiddenItemCount = windowActive ? 0 : Math.max(0, deviceGroup.items.length - visibleItems.length);
                    const ESTIMATED_ITEM_HEIGHT = elementTreeItemHeights[deviceGroup.deviceKey] ?? 32;
                    const spacerBeforeHeight = windowStart * ESTIMATED_ITEM_HEIGHT;
                    const spacerAfterHeight = Math.max(0, totalItems - windowEnd) * ESTIMATED_ITEM_HEIGHT;
                    return (
                      <section className="element-tree-device-group" key={deviceGroup.deviceKey}>
                        <button
                          type="button"
                          className="element-tree-device-type"
                          role="treeitem"
                          aria-level={2}
                          aria-expanded={deviceExpanded}
                          onClick={() => toggleElementTreeDeviceGroup(deviceGroup.deviceKey)}
                        >
                          <span className="element-tree-type-label">
                            {deviceExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                            <span className="element-tree-bilingual">
                              <span>{deviceGroup.deviceLabel}</span>
                              {deviceGroup.deviceEnglishLabel ? <small>{deviceGroup.deviceEnglishLabel}</small> : null}
                            </span>
                          </span>
                          <strong>{deviceGroup.items.length}</strong>
                        </button>
                        {deviceExpanded && (
                          <div className="element-tree-device-items" role="group" data-device-key={deviceGroup.deviceKey} data-total-items={totalItems}>
                            {spacerBeforeHeight > 0 && (
                              <div className="element-tree-virtual-spacer" aria-hidden="true" style={{ height: spacerBeforeHeight }} />
                            )}
                            {visibleItems.map((item) => {
                              const editable = item.kind === "node" ? activeLayerNodeIdSet.has(item.id) : activeLayerEdgeIdSet.has(item.id);
                              const selected = editable && (item.kind === "node" ? selectedNodeIdSet.has(item.id) : activeSelectedEdgeSet.has(item.id));
                              const itemChildren = elementTreeItemChildren(item);
                              const treeItemKey = `${item.kind}:${item.id}`;
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
                                  aria-level={3}
                                  aria-selected={selected}
                                  className={`element-tree-item ${selected ? "selected" : ""}`}
                                  key={treeItemKey}
                                  ref={(element) => {
                                    elementTreeItemRefs.current[treeItemKey] = element;
                                  }}
                                  title="双击定位并选中图元"
                                  tabIndex={0}
                                  onPointerDown={selectTreeItem}
                                  onClick={selectTreeItem}
                                  onDoubleClick={() => focusElementTreeItem(item, true)}
                                  onContextMenu={(event) => openElementTreeItemContextMenu(event, item)}
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
                                          <BufferedTextInput
                                            value={item.idx ?? ""}
                                            inputMode="numeric"
                                            onClick={(event) => event.stopPropagation()}
                                            onDoubleClick={(event) => event.stopPropagation()}
                                            onKeyDown={(event) => event.stopPropagation()}
                                            disabled={!editable || isBrowseMode}
                                            onCommit={(nextValue) => commitElementTreeNodeIdentity(item.id, "idx", nextValue)}
                                          />
                                        </label>
                                        <label>
                                          <span>name</span>
                                          <BufferedTextInput
                                            value={item.name}
                                            onClick={(event) => event.stopPropagation()}
                                            onDoubleClick={(event) => event.stopPropagation()}
                                            onKeyDown={(event) => event.stopPropagation()}
                                            disabled={!editable || isBrowseMode}
                                            onCommit={(nextValue) => commitElementTreeNodeIdentity(item.id, "name", nextValue)}
                                          />
                                        </label>
                                      </div>
                                    ) : (
                                      <span className="element-tree-bilingual">
                                        <span>{item.name}</span>
                                      </span>
                                    )}
                                  </div>
                                  {itemChildren.length ? (
                                    <div className="element-tree-child-list" role="group" aria-label={`${item.name}关联子设备`}>
                                      {itemChildren.map((child) => {
                                        const childIdxKey = child.relationKeys[0] ?? "";
                                        return (
                                          <div className="element-tree-child-item" key={child.id}>
                                            <span className="element-tree-child-type" title={child.componentLibrary}>
                                              <span>{child.componentLibraryLabel || child.componentLibrary}</span>
                                              {child.componentLibrary ? <small>{child.componentLibrary}</small> : null}
                                            </span>
                                            <label>
                                              <span>idx</span>
                                              <BufferedTextInput
                                                value={child.idx}
                                                inputMode="numeric"
                                                onClick={(event) => event.stopPropagation()}
                                                onDoubleClick={(event) => event.stopPropagation()}
                                                onKeyDown={(event) => event.stopPropagation()}
                                                disabled={!editable || isBrowseMode}
                                                onCommit={(nextValue) => commitElementTreeContainerChildParam(item.id, childIdxKey, nextValue)}
                                              />
                                            </label>
                                            <label className="element-tree-child-name-field">
                                              <span>name</span>
                                              <BufferedTextInput
                                                value={child.name}
                                                onClick={(event) => event.stopPropagation()}
                                                onDoubleClick={(event) => event.stopPropagation()}
                                                onKeyDown={(event) => event.stopPropagation()}
                                                disabled={!editable || isBrowseMode}
                                                onCommit={(nextValue) => commitElementTreeContainerChildParam(item.id, child.nameKey, nextValue)}
                                              />
                                            </label>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  ) : null}
                                  {selected ? (
                                    <button
                                      type="button"
                                      className="element-tree-jump-button"
                                      title="跳转到画布中心并以 100% 显示"
                                      aria-label={`跳转到图元：${item.name}`}
                                      onPointerDown={(event) => event.stopPropagation()}
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        jumpToElementTreeItem(item);
                                      }}
                                      onDoubleClick={(event) => event.stopPropagation()}
                                    >
                                      <LocateFixed size={13} />
                                      <span>跳转</span>
                                    </button>
                                  ) : null}
                                </div>
                              );
                            })}
                            {spacerAfterHeight > 0 && (
                              <div className="element-tree-virtual-spacer" aria-hidden="true" style={{ height: spacerAfterHeight }} />
                            )}
                            {hiddenItemCount > 0 && (
                              <button
                                type="button"
                                className="element-tree-more"
                                onClick={() =>
                                  setElementTreeItemLimits((current) => ({
                                    ...current,
                                    [deviceGroup.deviceKey]: visibleLimit + ELEMENT_TREE_ITEM_LIMIT_STEP
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
                  })}
                </div>
              )}
            </section>
          );
        })
      )}
    </div>
  );
}
