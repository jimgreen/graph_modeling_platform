// 从 App.tsx 提取的面板渲染工厂函数。
// 模式：export function createXxx(__appScope: Record<string, any>) { ...; return () => <JSX />; }

import { createPortal } from "react-dom";
import { Input, Button, Tree } from "antd";
import { Cable, ChevronDown, ChevronRight, Factory, FileJson, FolderOpen, HousePlug, Network } from "lucide-react";
import { sortByKeyOrder } from "../libraryTreeOrder";
import {
  PROJECT_TREE_DRAG_TYPE_MODEL,
  PROJECT_TREE_DRAG_TYPE_SCHEME,
  PROJECT_TREE_ROOT_END_KEY,
  clearProjectTreeDragExpandTimer,
  projectTreeDragLayer,
  projectTreeSchemeContainsId,
  scheduleProjectTreeDragExpand,
  projectModelTypeIconName
} from "./appDeviceDefinitionFactories";
import type React from "react";
import type { GraphTemplate } from "./appCoreCanvasUtilities";
import type {
  ElementTreeChildItem,
  ElementTreeDeviceGroup,
  ElementTreeGroup,
  ElementTreeItem,
  ModelLayer,
  SavedProjectRecord,
  SavedSchemeRecord
} from "../model";
import { MODEL_TYPE_META } from "../model";

// 图层管理面板
export function createRenderLayerManager(__appScope: Record<string, any>) {
  const {
    layers, activeLayerId, setActiveLayer,
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
  const { openMeasurementConfigDialog, openDeviceDefinitionDialog } = __appScope;
  return () => (
    <div className="library-definition-actions">
      <button
        type="button"
        className="custom-device-create-button measurement-config-open-button"

        onClick={openMeasurementConfigDialog}
      >
        量测定义
      </button>
      <button type="button" className="custom-device-create-button"  onClick={openDeviceDefinitionDialog}>
        元件定义
      </button>
    </div>
  );
}

// 图模板按钮
export function createRenderGraphTemplateButton(__appScope: Record<string, any>) {
  const {
    isEditMode, templateLibraryDisplayMode,
    startLibraryGraphTemplatePlacement, cancelLibraryPlacement,
    setContextMenu, setProjectMenu, setTemplateMenu,
    clearLibraryFlyoutCloseTimer, setHoveredGraphTemplateType,
    hideLibraryFlyout, renderGraphTemplatePreview
  } = __appScope;
  return (template: GraphTemplate) => (
    <button
      key={template.id}
      type="button"
      className="template-library-item"
      draggable={isEditMode}

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
  const currentScope = () => (__appScope.__appScopeRef?.current ?? __appScope) as Record<string, any>;
  const toggleModelType = (type: string) => {
    setProjectModelTypeFilter((prev: string[]) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const modelCountForScheme = (scheme: SavedSchemeRecord): number =>
    (scheme.projects ?? []).length + (scheme.children ?? []).reduce((sum, child) => sum + modelCountForScheme(child), 0);

  const buildProjectTreeData = (scope: Record<string, any>): any[] => {
    const order = scope.libraryTreeOrder ?? {};
    const build = (list: SavedSchemeRecord[], parentKey: string): any[] => {
      const orderedSchemes = sortByKeyOrder(
        list ?? [],
        (scheme: SavedSchemeRecord) => scheme.id,
        order.projectSchemes?.[parentKey] ?? []
      );
      return orderedSchemes.map((scheme) => {
        const orderedProjects = sortByKeyOrder(
          scheme.projects ?? [],
          (project: SavedProjectRecord) => project.id,
          order.projectModels?.[scheme.id] ?? []
        );
        const projectNodes = orderedProjects.map((project) => ({
          key: project.id,
          kind: "model",
          schemeId: scheme.id,
          project,
          isLeaf: true,
          title: project.name
        }));
        return {
          key: scheme.id,
          kind: "scheme",
          scheme,
          isLeaf: false,
          title: scheme.name,
          children: [...projectNodes, ...build(scheme.children ?? [], scheme.id)]
        };
      });
    };
    return build(scope.filteredProjectSchemes ?? scope.schemes ?? [], "");
  };

  const treeNodeKeys = (nodes: readonly any[], kind: string, result: string[] = []): string[] => {
    for (const node of nodes) {
      if (node.kind === kind) {
        result.push(String(node.key));
      }
      if (Array.isArray(node.children)) {
        treeNodeKeys(node.children, kind, result);
      }
    }
    return result;
  };

  const dataTransferDragKey = (event: { dataTransfer?: DataTransfer | null } | null | undefined): string => {
    const dataTransfer = event?.dataTransfer;
    if (!dataTransfer) {
      return "";
    }
    return dataTransfer.getData(PROJECT_TREE_DRAG_TYPE_MODEL) || dataTransfer.getData(PROJECT_TREE_DRAG_TYPE_SCHEME) || "";
  };

  const clearTreeDragExpand = () => {
    clearProjectTreeDragExpandTimer(currentScope());
  };

  const debugProjectTreeDrag = (label: string, payload: Record<string, unknown>) => {
    if (import.meta.env.DEV && typeof window !== "undefined") {
      const diagnosticWindow = window as typeof window & {
        __projectTreeDragLogs?: Array<{ at: number; label: string; payload: Record<string, unknown> }>;
      };
      const logs = diagnosticWindow.__projectTreeDragLogs ?? [];
      logs.push({ at: Date.now(), label: `tree:${label}`, payload });
      diagnosticWindow.__projectTreeDragLogs = logs.slice(-100);
      console.info(`[project-tree-drag] tree:${label} ${JSON.stringify(payload)}`);
    }
  };

  const handleRootDragOver = (event: React.DragEvent<HTMLElement>) => {
    if ((event.target as HTMLElement)?.closest?.(".ant-tree-treenode")) {
      return;
    }
    const dragKey = currentScope().projectTreeDragKey || dataTransferDragKey(event.nativeEvent);
    if (!dragKey) {
      return;
    }
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = "move";
    }
  };

  const handleRootDrop = (event: React.DragEvent<HTMLElement>) => {
    if ((event.target as HTMLElement)?.closest?.(".ant-tree-treenode")) {
      return;
    }
    const dragKey = currentScope().projectTreeDragKey || dataTransferDragKey(event.nativeEvent);
    if (!dragKey) {
      return;
    }
    event.preventDefault();
    currentScope().handleProjectTreeDrop?.(event, PROJECT_TREE_ROOT_END_KEY, { dragKey, edge: "after" });
  };

  const renderProjectTreeTitle = (nodeData: any, expandedKeys: readonly string[], isFiltering: boolean) => {
    const scope = currentScope();
    if (nodeData.kind === "scheme") {
      const scheme = nodeData.scheme as SavedSchemeRecord;
      const selected = Boolean(scope.selectedSchemeIds?.includes(nodeData.key) || scope.selectedSchemeId === nodeData.key);
      const isEmpty = (scheme.projects ?? []).length === 0 && (scheme.children ?? []).length === 0;
      const displaySchemeId = scheme.schemeId;
      const schemeIdTooltip = typeof displaySchemeId === "number" && Number.isSafeInteger(displaySchemeId) && displaySchemeId > 0
        ? `方案 ID：${displaySchemeId}`
        : "方案 ID：未分配";
      return (
        <span
          className={`project-tree-node-title project-tree-node-title-scheme${selected ? " selected" : ""}`}
          aria-label={`方案：${scheme.name}`}
          title={schemeIdTooltip}
        >
          <FolderOpen className="scheme-folder-icon" size={15} aria-hidden="true" />
          <span className="project-tree-name">{scheme.name}</span>
          <span className="scheme-model-count">{modelCountForScheme(scheme)}</span>
          {isEmpty && expandedKeys.includes(nodeData.key) && !isFiltering ? (
            <span className="project-tree-empty-hint">暂无模型或子方案</span>
          ) : null}
        </span>
      );
    }

    const project = nodeData.project as SavedProjectRecord;
    const rawProjectModelType = project.project?.modelType;
    const projectModelType = typeof rawProjectModelType === "string" && ["微网", "厂站", "馈线", "台区"].includes(rawProjectModelType)
      ? rawProjectModelType
      : "其他";
    const projectModelTypeIcons: Record<string, typeof FileJson> = {
      Cable,
      Factory,
      FileJson,
      HousePlug,
      Network
    };
    const ProjectModelTypeIcon = projectModelTypeIcons[projectModelTypeIconName(projectModelType)] ?? FileJson;
    const selected = Boolean(scope.selectedProjectIds?.includes(nodeData.key) || scope.selectedProjectId === nodeData.key);
    const active = project.id === scope.activeProjectKey;
    const displayProjectId = project.project?.idx;
    const projectIdTooltip = typeof displayProjectId === "number" && Number.isSafeInteger(displayProjectId) && displayProjectId > 0
      ? `模型 ID：${displayProjectId}`
      : "模型 ID：未分配";
    return (
      <span
        className={`project-tree-node-title project-tree-node-title-model${selected ? " selected" : ""}${active ? " active" : ""}`}
        aria-label={`模型：${project.name}`}
        title={projectIdTooltip}
      >
        <ProjectModelTypeIcon
          aria-hidden="true"
          className="project-item-icon"
          data-model-type={projectModelType}
          size={14}
        />
        <span className="project-tree-name">{project.name}</span>
        <span className="project-model-type-tag" style={{ background: MODEL_TYPE_META[projectModelType]?.color ?? "#94a3b8" }}>
          {projectModelType}
        </span>
      </span>
    );
  };

  const renderProjectTree = () => {
    const scope = currentScope();
    const treeData = buildProjectTreeData(scope);
    const schemeKeys = treeNodeKeys(treeData, "scheme");
    const isFiltering = Boolean(scope.projectSearchNeedle || (scope.projectModelTypeFilter?.length ?? 0) > 0);
    const expandedKeys = isFiltering
      ? schemeKeys
      : (scope.expandedSchemeIds ?? []).filter((key: string) => schemeKeys.includes(key));
    const selectedKeys = [
      ...(scope.selectedSchemeIds ?? []),
      ...(scope.selectedProjectIds ?? [])
    ];

    const handleTreeDragStart = (info: any) => {
      const dragKey = String(info.node?.key ?? "");
      const layer = projectTreeDragLayer(dragKey);
      const event = info.event as DragEvent | undefined;
      if (!scope.isEditMode || !layer || !dragKey) {
        event?.preventDefault?.();
        return;
      }
      if (scope.projectTreeDragSuppressClickRef) {
        scope.projectTreeDragSuppressClickRef.current = true;
      }
      event?.dataTransfer?.setData(layer === "model" ? PROJECT_TREE_DRAG_TYPE_MODEL : PROJECT_TREE_DRAG_TYPE_SCHEME, dragKey);
      if (event?.dataTransfer) {
        event.dataTransfer.effectAllowed = "move";
      }
      if (scope.projectTreeDragKeyRef) {
        scope.projectTreeDragKeyRef.current = dragKey;
      }
      scope.setProjectTreeDragKey?.(dragKey);
      debugProjectTreeDrag("start", { dragKey, layer });
    };

    const handleTreeDragEnter = (info: any) => {
      const latestScope = currentScope();
      const dragKey = latestScope.projectTreeDragKeyRef?.current || latestScope.projectTreeDragKey || dataTransferDragKey(info.event);
      const dropKey = String(info.node?.key ?? "");
      const isModelIntoScheme = projectTreeDragLayer(dragKey) === "model" && projectTreeDragLayer(dropKey) === "scheme";
      if (isModelIntoScheme && !expandedKeys.includes(dropKey)) {
        scheduleProjectTreeDragExpand(latestScope, dropKey);
      } else {
        clearProjectTreeDragExpandTimer(latestScope);
      }
    };

    const handleTreeDragLeave = () => {
      clearTreeDragExpand();
      currentScope().setProjectTreeDropKey?.("");
    };

    const allowTreeDrop = ({ dropNode, dropPosition }: any) => {
      const latestScope = currentScope();
      const dragKey = latestScope.projectTreeDragKeyRef?.current || latestScope.projectTreeDragKey;
      const dragLayer = projectTreeDragLayer(dragKey);
      const dropKey = String(dropNode?.key ?? "");
      const dropLayer = projectTreeDragLayer(dropKey);
      if (!latestScope.isEditMode || !dragLayer || !dropLayer) {
        debugProjectTreeDrag("allow-rejected", { dragKey, dropKey, dragLayer, dropLayer, dropPosition });
        return false;
      }
      if (dragLayer === "scheme" && dropLayer === "model") {
        debugProjectTreeDrag("allow-rejected", { dragKey, dropKey, dragLayer, dropLayer, dropPosition });
        return false;
      }
      if (dragLayer === "scheme" && (
        dropKey === dragKey
        || projectTreeSchemeContainsId(latestScope.schemes ?? [], dragKey, dropKey)
        || dropKey.startsWith(`${dragKey}/`)
      )) {
        debugProjectTreeDrag("allow-rejected", { dragKey, dropKey, dragLayer, dropLayer, dropPosition, reason: "cycle" });
        return false;
      }
      if (dragLayer === "model" && dragKey === dropKey) {
        debugProjectTreeDrag("allow-rejected", { dragKey, dropKey, dragLayer, dropLayer, dropPosition, reason: "self" });
        return false;
      }
      if (dropLayer === "model" && Number(dropPosition) === 0) {
        debugProjectTreeDrag("allow-rejected", { dragKey, dropKey, dragLayer, dropLayer, dropPosition, reason: "model-inside" });
        return false;
      }
      debugProjectTreeDrag("allow", { dragKey, dropKey, dragLayer, dropLayer, dropPosition });
      return true;
    };

    const handleTreeDrop = (info: any) => {
      const latestScope = currentScope();
      const dragKey = String(info.dragNode?.key ?? latestScope.projectTreeDragKey ?? "");
      const dropKey = String(info.node?.key ?? "");
      if (!dragKey || !dropKey) {
        debugProjectTreeDrag("drop-ignored", { dragKey, dropKey });
        return;
      }
      const edge = info.dropToGap ? (Number(info.dropPosition) < 0 ? "before" : "after") : "inside";
      debugProjectTreeDrag("drop", {
        dragKey,
        dropKey,
        dropPosition: info.dropPosition,
        dropToGap: Boolean(info.dropToGap),
        edge
      });
      latestScope.handleProjectTreeDrop?.(info.event as any, dropKey, { dragKey, edge });
    };

    const handleTreeSelect = (keys: React.Key[], info: any) => {
      const node = info.node as any;
      const key = String(node.key);
      const multi = Boolean(info.nativeEvent?.ctrlKey || info.nativeEvent?.metaKey || info.nativeEvent?.shiftKey);
      if (node.kind === "scheme") {
        if (multi) {
          scope.toggleSchemeSelection?.(key);
        } else {
          scope.selectSingleScheme?.(key);
        }
        scope.toggleSchemeExpanded?.(key);
        return;
      }
      const schemeId = String(node.schemeId ?? "");
      if (multi) {
        scope.toggleProjectSelection?.(schemeId, key);
      } else {
        scope.selectSingleProject?.(schemeId, key);
        scope.requestLoadSavedProject?.(node.project, schemeId);
      }
      scope.setInspectorTab?.("model");
    };

    const handleTreeRightClick = ({ event, node }: any) => {
      event.preventDefault();
      event.stopPropagation();
      const key = String(node.key);
      if (node.kind === "scheme") {
        if (!scope.selectedSchemeIds?.includes(key)) {
          scope.selectSingleScheme?.(key);
        }
        scope.setProjectMenu?.({ x: event.clientX, y: event.clientY, schemeId: key });
      } else {
        const schemeId = String(node.schemeId ?? "");
        if (!scope.selectedProjectIds?.includes(key)) {
          scope.selectSingleProject?.(schemeId, key);
        }
        scope.setProjectMenu?.({ x: event.clientX, y: event.clientY, schemeId, projectId: key });
      }
    };

    return (
      <Tree
        className="project-tree-antd"
        aria-label="绘图模型列表"
        blockNode
        showLine={{ showLeafIcon: false }}
        treeData={treeData}
        selectedKeys={selectedKeys}
        expandedKeys={expandedKeys}
        autoExpandParent={false}
        multiple
        selectable
        draggable={scope.isEditMode}
        allowDrop={allowTreeDrop}
        switcherIcon={({ expanded, isLeaf }: any) => isLeaf ? null : expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        titleRender={(nodeData: any) => renderProjectTreeTitle(nodeData, expandedKeys, isFiltering)}
        onExpand={(nextKeys: React.Key[]) => {
          if (!isFiltering) {
            scope.setExpandedSchemeIds?.((nextKeys as string[]).filter((key) => schemeKeys.includes(key)));
          }
        }}
        onSelect={handleTreeSelect}
        onRightClick={handleTreeRightClick}
        onDragStart={handleTreeDragStart}
        onDragEnter={handleTreeDragEnter}
        onDragLeave={handleTreeDragLeave}
        onDragEnd={() => {
          clearTreeDragExpand();
          scope.endProjectTreeSortDrag?.();
        }}
        onDrop={handleTreeDrop}
      />
    );
  };

  return () => {
    const scope = currentScope();
    const currentSchemes = scope.schemes ?? schemes ?? [];
    const currentFilteredSchemes = scope.filteredProjectSchemes ?? filteredProjectSchemes ?? currentSchemes;
    const currentProjectSearchQuery = scope.projectSearchQuery ?? projectSearchQuery ?? "";
    const currentProjectModelTypeFilter = scope.projectModelTypeFilter ?? projectModelTypeFilter ?? [];
    const currentBackendSchemesLoadedRef = scope.backendSchemesLoadedRef ?? backendSchemesLoadedRef;
    return (
      <section className="project-panel" onContextMenu={openBlankProjectLibraryContextMenu}>
      <div className="library-search project-search">
        <Search size={15} aria-hidden="true" />
        <Input
          value={currentProjectSearchQuery}
          onChange={(event) => setProjectSearchQuery(event.target.value)}
          placeholder="搜索方案/模型"
          aria-label="搜索模型库"
        />
        {currentProjectSearchQuery && (
          <button type="button" aria-label="清空模型库搜索" title="清空" onClick={() => setProjectSearchQuery("")}>
            <X size={14} />
          </button>
        )}
      </div>
      <div className="project-model-type-filter">
        {MODEL_TYPES.map((type: string) => {
          const modelTypeColor = MODEL_TYPE_META[type as keyof typeof MODEL_TYPE_META]?.color ?? "#94a3b8";
          return (
            <button
              key={type}
              type="button"
              className={`project-model-type-btn${currentProjectModelTypeFilter?.includes(type) ? " active" : ""}`}
              data-model-type={type}
              aria-label={`按模型类型筛选：${type}`}
              onClick={() => toggleModelType(type)}
              style={{ "--model-type-color": modelTypeColor } as React.CSSProperties}
              title={type}
            >
              {type}
            </button>
          );
        })}
      </div>
      <div
        className="project-list listbox"
        role="tree"
        onPointerEnter={() => {
          projectListPointerInsideRef.current = true;
        }}
        onPointerLeave={() => {
          projectListPointerInsideRef.current = false;
        }}
        onDragOver={handleRootDragOver}
        onDrop={handleRootDrop}
        onContextMenu={openBlankProjectLibraryContextMenu}
      >
        {currentSchemes.length === 0 ? (
          <p className="project-empty">
            {currentBackendSchemesLoadedRef?.current ? "暂无方案，右键此处创建方案" : "正在连接模型库，恢复后将自动加载..."}
          </p>
        ) : currentFilteredSchemes.length === 0 ? (
          <p className="project-empty project-search-empty">未找到匹配方案或模型</p>
        ) : (
          renderProjectTree()
        )}
      </div>
    </section>
    );
  };
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
                                            disabled={!editable}
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
                                            disabled={!editable}
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
                                                disabled={!editable}
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
                                                disabled={!editable}
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
