// 从 App.tsx 提取的面板渲染工厂函数。
// 模式：export function createXxx(__appScope: Record<string, any>) { ...; return () => <JSX />; }

import { createPortal } from "react-dom";
import { Input, Button } from "antd";
import { sortByKeyOrder } from "../libraryTreeOrder";
// 直接 import 图标（不改 appStaticScope 的 lucide 清单 —— 那会点亮 appStaticScope ↔
// customDeviceUtils ↔ App 的既有循环导入，导致 App 渲染中断）。
import { GripVertical } from "lucide-react";
import {
  PROJECT_TREE_DRAG_TYPE_MODEL,
  PROJECT_TREE_DRAG_TYPE_SCHEME,
  PROJECT_TREE_ROOT_END_KEY
} from "./appDeviceDefinitionFactories";
import type React from "react";
import type { GraphTemplate } from "./appCoreCanvasUtilities";
import type {
  ElementTreeChildItem,
  ElementTreeDeviceGroup,
  ElementTreeGroup,
  ElementTreeItem,
  ModelLayer,
  SavedSchemeRecord
} from "../model";

// 图层管理面板
export function createRenderLayerManager(__appScope: Record<string, any>) {
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
        {layers.map((layer: ModelLayer, index: number) => (
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
              onCommit={(nextValue: string) => commitModelLayerName(layer.id, nextValue)}
              onKeyDown={(event: React.KeyboardEvent) => event.stopPropagation()}
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
export function createRenderLibraryDefinitionActions(__appScope: Record<string, any>) {
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
export function createRenderGraphTemplateButton(__appScope: Record<string, any>) {
  const {
    isEditMode, isBrowseMode, templateLibraryDisplayMode,
    startLibraryGraphTemplatePlacement, cancelLibraryPlacement,
    setContextMenu, setProjectMenu, setTemplateMenu,
    clearLibraryFlyoutCloseTimer, setHoveredGraphTemplateType,
    hideLibraryFlyout, renderGraphTemplatePreview
  } = __appScope;
  // 模板卡片把手拖动（面板树内排序/跨类型移动）的处理函数在 useRenderBatch 的**后段**才
  // Object.assign 进 __appScope（本工厂在其之前创建）—— 不能在工厂创建期解构，否则拿到
  // undefined，把手永远拖不动。改为每次渲染时从**当前帧** scope 直读最新装配值
  // （__appScope 每帧重建，闭包捕获的引用会冻结在首帧）。
  const templateTreeDeps = () => {
    const scope = (__appScope.__appScopeRef?.current ?? __appScope) as Record<string, any>;
    return {
      startTemplateTreeDrag: scope.startTemplateTreeDrag,
      endTemplateTreeDrag: scope.endTemplateTreeDrag,
      handleTemplateTreeDragOver: scope.handleTemplateTreeDragOver,
      handleTemplateTreeDrop: scope.handleTemplateTreeDrop,
      handleLibraryTreeDragLeave: scope.handleLibraryTreeDragLeave,
      templateLibraryTreeDragKey: scope.templateLibraryTreeDragKey,
      templateLibraryTreeDropKey: scope.templateLibraryTreeDropKey
    };
  };
  return (template: GraphTemplate) => {
    const {
      startTemplateTreeDrag, endTemplateTreeDrag,
      handleTemplateTreeDragOver, handleTemplateTreeDrop, handleLibraryTreeDragLeave,
      templateLibraryTreeDragKey, templateLibraryTreeDropKey
    } = templateTreeDeps();
    // 拖动排序进行中才可能携带边；dropKey 形如 `template:<类型>::<id>|before/after`。
    const dropLineClass = templateLibraryTreeDropKey === `template:${template.typeName}::${template.id}|before`
      ? " library-tree-drop-line-before"
      : templateLibraryTreeDropKey === `template:${template.typeName}::${template.id}|after`
        ? " library-tree-drop-line-after"
        : "";
    return (
    <button
      key={template.id}
      type="button"
      className={`template-library-item${dropLineClass}`}
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
      onDragOver={(event) => handleTemplateTreeDragOver(event, `template:${template.typeName}::${template.id}`)}
      onDragLeave={handleLibraryTreeDragLeave}
      onDrop={(event) => handleTemplateTreeDrop(event, `template:${template.typeName}::${template.id}`)}
    >
      <span
        className="library-tree-drag-handle template-tree-card-handle"
        title="拖动调整顺序（可跨类型移动）"
        aria-label={`拖动调整模板 ${template.name} 的顺序`}
        draggable
        onDragStart={(event) => startTemplateTreeDrag(event, `template:${template.typeName}::${template.id}`)}
        onDragEnd={endTemplateTreeDrag}
        onClick={(event) => event.stopPropagation()}
      >
        <GripVertical size={11} aria-hidden="true" />
      </span>
      <span className="template-library-icon">
        {renderGraphTemplatePreview(template)}
      </span>
      <span className="template-library-name">{template.name}</span>
      <small>{template.sourceSize.width}×{template.sourceSize.height}</small>
    </button>
    );
  };
}

// 图模板浮动面板
export function createRenderGraphTemplateFlyout(__appScope: Record<string, any>) {
  const {
    setLibraryComponentListRef, libraryFlyoutStyle,
    clearLibraryFlyoutCloseTimer, setHoveredGraphTemplateType,
    scheduleGraphTemplateFlyoutClose, renderGraphTemplateButton
  } = __appScope;
  return (flyoutListKey: string, typeName: string, templates: GraphTemplate[]) => {
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
export function createRenderProjectPanel(__appScope: Record<string, any>) {
  const {
    Search, X,
    MODEL_TYPES,
    openBlankProjectLibraryContextMenu,
    projectSearchQuery, setProjectSearchQuery,
    projectModelTypeFilter, setProjectModelTypeFilter,
    projectListPointerInsideRef,
    backendSchemesLoadedRef,
    schemes, filteredProjectSchemes
  } = __appScope;
  // 顺序覆盖随拖动变化，而本工厂闭包捕获的是**首帧** scope（__appScope 每帧重建）——
  // 故每次渲染都从当前帧 scope 读，否则拖动后的顺序不会反映到 DOM。
  const currentScope = () => (__appScope.__appScopeRef?.current ?? __appScope) as Record<string, any>;
  const currentLibraryTreeOrder = () => currentScope().libraryTreeOrder;
  // 同理：renderProjectSchemeNode 必须在**当前帧**取 —— 首帧闭包里的旧版本不含
  // 拖动排序的 JSX（把手/指示线 class），用它渲染会一直是旧界面。
  const currentRenderProjectSchemeNode = () => currentScope().renderProjectSchemeNode;
  // 列表末尾落点的拖拽处理（跨层级移动到顶层末尾）。
  // 用 React 的事件类型（工厂签名一致）；这里只转发，不做类型收窄。
  const handleProjectTreeDragOver = (event: React.DragEvent<HTMLElement>, dropKey: string) =>
    currentScope().handleProjectTreeDragOver?.(event, dropKey);
  const handleProjectTreeDrop = (event: React.DragEvent<HTMLElement>, dropKey: string) =>
    currentScope().handleProjectTreeDrop?.(event, dropKey);
  const handleLibraryTreeDragLeave = (event: React.DragEvent<HTMLElement>) =>
    currentScope().handleLibraryTreeDragLeave?.(event);
  const projectTreeDropKey = currentScope().projectTreeDropKey ?? "";
  // 末尾落点（拖到列表空白处 = 移到顶层末尾）：插入线画在**最后一个顶层方案**的下边缘，
  // 而不是容器底部（容器很高时线会落到很远的地方，看不出插入位）。
  const rootEndDropKey = projectTreeDropKey === `${PROJECT_TREE_ROOT_END_KEY}|after`;
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
        {MODEL_TYPES.map((type: string) => (
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
        onDragOver={(event) => {
          // 列表空白处 = 末尾落点（移到顶层末尾）。
          // **必须排除行内**：dragover 会从具体行冒泡到容器，容器若无条件接管，
          // 会把行处理器刚算好的插入边覆盖成末尾落点 —— 结果只有最后一行有虚线。
          if ((event.target as HTMLElement)?.closest?.(".scheme-option, .project-option")) {
            return;
          }
          handleProjectTreeDragOver(event, PROJECT_TREE_ROOT_END_KEY);
          event.preventDefault();
        }}
        onDragLeave={handleLibraryTreeDragLeave}
        onDrop={(event) => {
          // 同上：落在行上时交给行自己的 drop 处理。
          if ((event.target as HTMLElement)?.closest?.(".scheme-option, .project-option")) {
            return;
          }
          const sortSchemeId = event.dataTransfer?.getData?.(PROJECT_TREE_DRAG_TYPE_SCHEME);
          if (sortSchemeId) {
            handleProjectTreeDrop(event, PROJECT_TREE_ROOT_END_KEY);
            return;
          }
          const sortModelId = event.dataTransfer?.getData?.(PROJECT_TREE_DRAG_TYPE_MODEL);
          if (sortModelId) {
            handleProjectTreeDrop(event, PROJECT_TREE_ROOT_END_KEY);
          }
        }}
        onContextMenu={openBlankProjectLibraryContextMenu}
      >
        {schemes.length === 0 ? (
          <p className="project-empty">
            {backendSchemesLoadedRef.current ? "暂无方案，右键此处创建方案" : "正在连接模型库，恢复后将自动加载..."}
          </p>
        ) : filteredProjectSchemes.length === 0 ? (
          <p className="project-empty project-search-empty">未找到匹配方案或模型</p>
        ) : (
          (() => {
            const ordered = sortByKeyOrder(
              filteredProjectSchemes,
              (scheme: SavedSchemeRecord) => scheme.id,
              currentLibraryTreeOrder()?.projectSchemes?.[""] ?? []
            );
            const renderNode = currentRenderProjectSchemeNode();
            return ordered.map((scheme: SavedSchemeRecord, index: number) =>
              // 末尾落点：插入线画在最后一个顶层方案的下边缘。
              renderNode(scheme, 0, index === ordered.length - 1 && rootEndDropKey)
            );
          })()
        )}
      </div>
    </section>
  );
}

// 图元树面板
export function createRenderElementTreePanel(__appScope: Record<string, any>) {
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
        filteredElementTree.map((group: ElementTreeGroup) => {
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
                  {deviceGroups.map((deviceGroup: ElementTreeDeviceGroup) => {
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
                            {visibleItems.map((item: ElementTreeItem) => {
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
                                            onClick={(event: React.MouseEvent) => event.stopPropagation()}
                                            onDoubleClick={(event: React.MouseEvent) => event.stopPropagation()}
                                            onKeyDown={(event: React.KeyboardEvent) => event.stopPropagation()}
                                            disabled={!editable || isBrowseMode}
                                            onCommit={(nextValue: string) => commitElementTreeNodeIdentity(item.id, "idx", nextValue)}
                                          />
                                        </label>
                                        <label>
                                          <span>name</span>
                                          <BufferedTextInput
                                            value={item.name}
                                            onClick={(event: React.MouseEvent) => event.stopPropagation()}
                                            onDoubleClick={(event: React.MouseEvent) => event.stopPropagation()}
                                            onKeyDown={(event: React.KeyboardEvent) => event.stopPropagation()}
                                            disabled={!editable || isBrowseMode}
                                            onCommit={(nextValue: string) => commitElementTreeNodeIdentity(item.id, "name", nextValue)}
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
                                      {itemChildren.map((child: ElementTreeChildItem) => {
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
                                                onClick={(event: React.MouseEvent) => event.stopPropagation()}
                                                onDoubleClick={(event: React.MouseEvent) => event.stopPropagation()}
                                                onKeyDown={(event: React.KeyboardEvent) => event.stopPropagation()}
                                                disabled={!editable || isBrowseMode}
                                                onCommit={(nextValue: string) => commitElementTreeContainerChildParam(item.id, childIdxKey, nextValue)}
                                              />
                                            </label>
                                            <label className="element-tree-child-name-field">
                                              <span>name</span>
                                              <BufferedTextInput
                                                value={child.name}
                                                onClick={(event: React.MouseEvent) => event.stopPropagation()}
                                                onDoubleClick={(event: React.MouseEvent) => event.stopPropagation()}
                                                onKeyDown={(event: React.KeyboardEvent) => event.stopPropagation()}
                                                disabled={!editable || isBrowseMode}
                                                onCommit={(nextValue: string) => commitElementTreeContainerChildParam(item.id, child.nameKey, nextValue)}
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
                                      onDoubleClick={(event: React.MouseEvent) => event.stopPropagation()}
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
                                  setElementTreeItemLimits((current: Record<string, number>) => ({
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
