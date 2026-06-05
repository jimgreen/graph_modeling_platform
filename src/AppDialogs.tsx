import { Suspense } from "react";
import {
  AlignCenterHorizontal,
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  ChevronsDown,
  ChevronsUp,
  Copy,
  Download,
  FileInput,
  FolderOpen,
  Grid2X2,
  Group,
  Layers,
  Layers2,
  Pencil,
  Plus,
  Route,
  Save,
  ScanSearch,
  Scissors,
  Trash2,
  Type,
  Undo2,
  Ungroup,
  Zap,
  ZapOff
} from "lucide-react";

export type AppDialogsProps = Record<string, any>;

export function AppDialogs(props: AppDialogsProps) {
  const {
    activeImageFolderId,
    activeLayer,
    activeLayerNodes,
    activeSelectedNodeIds,
    addDefinitionDraftRow,
    addManualBendFromContextMenu,
    addVoltageColorRow,
    adjustSelectedDisplayLayer,
    applyExistingImage,
    applyLayerAssignmentDialog,
    attributeLibraries,
    attributeLibraryOptionClass,
    autoAlignCanvasGraphics,
    autoSpreadCanvasGraphics,
    canAddTemplateFromSelection,
    cancelTemplateDialog,
    canGroupSelectedGraphics,
    canUngroupSelectedGraphics,
    canvasClipboard,
    clearSelectedImage,
    colorPaletteDialogOpen,
    colorPaletteDraft,
    colorPaletteTab,
    componentTypeOptionClass,
    confirmAddGraphTemplate,
    confirmConnectionRedrawDialog,
    confirmVoltageBaseClearDialog,
    confirmVoltageBaseSetDialog,
    CONNECTION_REDRAW_SCOPE_LABELS,
    connectionRedrawDialogOpen,
    connectionRedrawEdgeIdsForScope,
    connectionRedrawScope,
    CONTAINER_TERMINAL_ASSOCIATION_OPTIONS,
    contextMenu,
    contextMenuForEdge,
    contextMenuForNode,
    contextMenuForSelection,
    contextMenuStyle,
    contextMenuTarget,
    contextSelectionCount,
    copyProjectRecord,
    copySchemeRecord,
    copySelection,
    createBlankProject,
    createGraphTemplateType,
    createImageFolder,
    createSchemeRecord,
    currentAttributeLibraryComponentTypeOptions,
    currentModelVoltageColorKeys,
    customDeviceDialogOpen,
    customDeviceDraft,
    customDeviceImageInputRef,
    customDevicePreviewImage,
    customDraftDefaultParams,
    customParamId,
    cutSelection,
    DEFAULT_COLOR_PALETTE,
    defaultContainerAssociationForTerminalType,
    definitionAttributeLibraryComponentTypeOptions,
    definitionDraftError,
    definitionDraftRows,
    definitionDraftSection,
    deleteDefinitionDraftRow,
    deleteImageFolder,
    deleteProjectRecord,
    deleteSchemeRecord,
    deleteSelection,
    deleteVoltageColorRow,
    deviceDefinitionDialogOpen,
    deviceDefinitionOverrides,
    ELECTRIC_COLOR_TYPE_LABELS,
    ELECTRIC_COLOR_TYPES,
    ENABLE_REACT_FLOW_PREVIEW,
    ENERGY_COLOR_ROWS,
    expandedDefinitionGroups,
    exportProjectRecordFile,
    exportSchemeRecord,
    findSavedSchemeById,
    generateCustomDeviceImage,
    getContainerTerminalAssociationSourceIndex,
    graphTemplateTypes,
    groupedAttributeLibrary,
    groupedAttributeLibraryByComponentType,
    groupSelectedGraphics,
    hasVoltageBaseTerminalValues,
    imageAssetList,
    imageAssets,
    imageFolders,
    imageInputRef,
    imageTarget,
    isBrowseMode,
    isBuiltInAttributeLibrary,
    isBuiltInComponentType,
    isContainerTerminalAssociationDependent,
    isDoubleContainerTerminalAssociation,
    isEditMode,
    layerAssignmentDialogOpen,
    layerAssignmentTargetId,
    layerAssignmentUnchanged,
    layerDialogOpen,
    layers,
    loadDefinitionTemplateDraft,
    nodes,
    normalizeAttributeLibraryName,
    normalizeContainerTerminalAssociations,
    openAddTemplateDialog,
    openConnectionRedrawDialog,
    openLayerAssignmentDialog,
    openModelImportFilePicker,
    openSchemeImportFilePicker,
    openVoltageBaseClearDialog,
    openVoltageBaseSetDialog,
    PARAM_VALUE_TYPE_OPTIONS,
    pasteProjectClipboardRecord,
    pasteSchemeClipboardRecord,
    pasteSelection,
    pendingModelImportConflict,
    pendingRecordPasteConflict,
    pendingSchemeImportConflict,
    pendingUnsavedAction,
    projectById,
    projectMenu,
    projectName,
    ReactFlowPreview,
    reactFlowPreviewOpen,
    recordClipboard,
    renameImageFolder,
    renameProjectRecord,
    renameSchemeRecord,
    renderCustomComponentManagerTree,
    renderGraphTemplatePreview,
    renderLayerManager,
    resetDeviceDefinitionDraft,
    resetEnergyColors,
    resetVoltageColors,
    resolveDuplicateModelImport,
    resolveDuplicateSchemeImport,
    resolveRecordPasteConflict,
    resolveUnsavedChangeAction,
    runContextMenuAction,
    saveColorPalette,
    saveCurrentProject,
    saveCustomDeviceTemplate,
    saveDeviceDefinitionDraft,
    saveRequired,
    schemes,
    selectableAttributeLibraries,
    selectCustomAttributeLibrary,
    selectCustomComponentType,
    selectedDefinitionBaseTemplate,
    selectedDefinitionTemplate,
    selectedDefinitionTerminalAssociations,
    selectedEdge,
    setActiveImageFolderId,
    setColorPaletteDialogOpen,
    setColorPaletteTab,
    setConnectionRedrawDialogOpen,
    setConnectionRedrawScope,
    setCustomDeviceDialogOpen,
    setCustomDeviceDraft,
    setDefinitionDraftError,
    setDefinitionDraftSection,
    setDeviceDefinitionDialogOpen,
    setImageTarget,
    setLayerAssignmentDialogOpen,
    setLayerAssignmentTargetId,
    setLayerDialogOpen,
    setReactFlowPreviewOpen,
    setSelectedNodeLabelDisplayMode,
    setTemplateDraftName,
    setTemplateDraftType,
    setVoltageBaseClearDialogOpen,
    setVoltageBaseClearScope,
    setVoltageBaseSetDialogOpen,
    setVoltageBaseSetMode,
    setVoltageBaseSetScope,
    setVoltageBaseSetValue,
    setVoltageBaseTerminalValue,
    setVoltageColorVisibility,
    sourceSelectClassName,
    templateDialog,
    templateDraftName,
    templateDraftType,
    TERMINAL_TYPE_OPTIONS,
    tidySelectedEdgeRoute,
    toggleColorDisplayMode,
    toggleDefinitionGroup,
    undoLastOperation,
    undoStack,
    ungroupSelectedGraphics,
    updateCustomDraftTerminalCount,
    updateDefinitionDraftRow,
    updateEnergyColor,
    updateVoltageColorRow,
    visibleEdges,
    visibleNodes,
    visibleVoltageColorRows,
    VOLTAGE_BASE_CLEAR_SCOPE_LABELS,
    VOLTAGE_BASE_CLEAR_SCOPES,
    VOLTAGE_BASE_SET_SCOPE_LABELS,
    VOLTAGE_BASE_SET_SCOPES,
    voltageBaseClearDialogOpen,
    voltageBaseClearResultForScope,
    voltageBaseClearScope,
    voltageBaseSetDialogOpen,
    voltageBaseSetMode,
    voltageBaseSetOptions,
    voltageBaseSetResultForScope,
    voltageBaseSetScope,
    voltageBaseSetTerminalRows,
    voltageBaseSetValue,
    voltageBaseTerminalValues,
    voltageColorVisibility
  } = props;

  return (
    <>
      {contextMenu && (
        <div className="context-menu" data-canvas-context-menu="true" style={contextMenuStyle(contextMenu)}>
          {isEditMode && undoStack.length > 0 && (
            <button onClick={() => runContextMenuAction(undoLastOperation)}>
              <Undo2 size={14} />
              撤销
            </button>
          )}
          {contextMenuForSelection && contextSelectionCount > 0 && (
            <button onClick={() => runContextMenuAction(copySelection)}>
              <Copy size={14} />
              复制
            </button>
          )}
          {isEditMode && contextMenuForSelection && contextSelectionCount > 0 && (
            <button onClick={() => runContextMenuAction(cutSelection)}>
              <Scissors size={14} />
              剪切
            </button>
          )}
          {isEditMode && saveRequired && (
            <button onClick={() => runContextMenuAction(() => saveCurrentProject())}>
              <Save size={14} />
              保存
            </button>
          )}
          {isEditMode && (canvasClipboard.nodes.length > 0 || canvasClipboard.edges.length > 0) && (
            <button onClick={() => runContextMenuAction(pasteSelection)}>
              <FileInput size={14} />
              粘贴
            </button>
          )}
          {isEditMode && nodes.length > 0 && (
            <button onClick={() => runContextMenuAction(openVoltageBaseSetDialog)}>
              <Zap size={14} />
              设置电压基值
            </button>
          )}
          {isEditMode && nodes.length > 0 && (
            <button onClick={() => runContextMenuAction(openVoltageBaseClearDialog)}>
              <ZapOff size={14} />
              清空电压基值
            </button>
          )}
          {isEditMode && contextMenuTarget === "blank" && activeLayerNodes.length > 1 && (
            <button onClick={() => runContextMenuAction(autoAlignCanvasGraphics)}>
              <AlignCenterHorizontal size={14} />
              自动对齐
            </button>
          )}
          {isEditMode && contextMenuTarget === "blank" && activeLayerNodes.length > 1 && (
            <button onClick={() => runContextMenuAction(autoSpreadCanvasGraphics)}>
              <ScanSearch size={14} />
              自动散开
            </button>
          )}
          {contextMenuForEdge && selectedEdge && (
            isEditMode ? (
            <button onClick={() => runContextMenuAction(tidySelectedEdgeRoute)}>
              <Route size={14} />
              整理连接线
            </button>
            ) : null
          )}
          {contextMenuForEdge && contextMenu.edgeId && (
            isEditMode ? (
            <button onClick={() => runContextMenuAction(addManualBendFromContextMenu)}>
              <Pencil size={14} />
              添加拐点
            </button>
            ) : null
          )}
          {isEditMode && contextMenuTarget === "blank" && (
            <button onClick={() => runContextMenuAction(openConnectionRedrawDialog)}>
              <Route size={14} />
              连接线重绘
            </button>
          )}
          {contextMenuForNode && canGroupSelectedGraphics && (
            isEditMode ? (
            <button onClick={() => runContextMenuAction(groupSelectedGraphics)}>
              <Group size={14} />
              组合
            </button>
            ) : null
          )}
          {contextMenuForNode && canUngroupSelectedGraphics && (
            isEditMode ? (
            <button onClick={() => runContextMenuAction(ungroupSelectedGraphics)}>
              <Ungroup size={14} />
              解散
            </button>
            ) : null
          )}
          {contextMenuForNode && canAddTemplateFromSelection && (
            isEditMode ? (
            <button onClick={() => runContextMenuAction(openAddTemplateDialog)}>
              <Grid2X2 size={14} />
              添加到模板库
            </button>
            ) : null
          )}
          {contextMenuForNode && activeSelectedNodeIds.length > 0 && (
            isEditMode ? (
            <button onClick={() => runContextMenuAction(openLayerAssignmentDialog)}>
              <Layers size={14} />
              图层修改
            </button>
            ) : null
          )}
          {contextMenuForNode && activeSelectedNodeIds.length > 0 && (
            isEditMode ? (
            <div className="context-menu-submenu">
              <button type="button" className="context-menu-submenu-trigger">
                <Layers2 size={14} />
                显示层级
                <ChevronRight size={14} />
              </button>
              <div className="context-menu-submenu-panel">
                <button onClick={() => runContextMenuAction(() => adjustSelectedDisplayLayer("raise"))}>
                  <ArrowUp size={14} />
                  提升显示层级
                </button>
                <button onClick={() => runContextMenuAction(() => adjustSelectedDisplayLayer("lower"))}>
                  <ArrowDown size={14} />
                  降低显示层级
                </button>
                <button onClick={() => runContextMenuAction(() => adjustSelectedDisplayLayer("front"))}>
                  <ChevronsUp size={14} />
                  顶层显示
                </button>
                <button onClick={() => runContextMenuAction(() => adjustSelectedDisplayLayer("back"))}>
                  <ChevronsDown size={14} />
                  底层显示
                </button>
              </div>
            </div>
            ) : null
          )}
          {contextMenuForNode && activeSelectedNodeIds.length > 0 && (
            isEditMode ? (
            <div className="context-menu-submenu">
              <button type="button" className="context-menu-submenu-trigger">
                <Type size={14} />
                标识显示
                <ChevronRight size={14} />
              </button>
              <div className="context-menu-submenu-panel">
                <button onClick={() => runContextMenuAction(() => setSelectedNodeLabelDisplayMode("always"))}>
                  <Type size={14} />
                  标识始终显示
                </button>
                <button onClick={() => runContextMenuAction(() => setSelectedNodeLabelDisplayMode("hidden"))}>
                  <Type size={14} />
                  标识始终隐藏
                </button>
                <button onClick={() => runContextMenuAction(() => setSelectedNodeLabelDisplayMode("follow"))}>
                  <Type size={14} />
                  标识跟随显示
                </button>
              </div>
            </div>
            ) : null
          )}
          {isEditMode && contextMenuForSelection && contextSelectionCount > 0 && (
            <button onClick={() => runContextMenuAction(deleteSelection)}>
              <Trash2 size={14} />
              删除
            </button>
          )}
        </div>
      )}
      {projectMenu && (
        <div className="context-menu" style={contextMenuStyle(projectMenu)}>
          {projectMenu.projectId && (
            <>
              {isEditMode && (
              <button
                onClick={() => runContextMenuAction(() => {
                  const project = projectById.get(projectMenu.projectId ?? "");
                  if (project) deleteProjectRecord(project);
                })}
              >
                <Trash2 size={14} />
                模型删除
              </button>
              )}
              <button
                onClick={() => runContextMenuAction(() => {
                  const project = projectById.get(projectMenu.projectId ?? "");
                  if (project) void exportProjectRecordFile(project);
                })}
              >
                <Download size={14} />
                模型导出
              </button>
              {isEditMode && (
              <button
                onClick={() => runContextMenuAction(() => openModelImportFilePicker(projectMenu.schemeId ?? ""))}
              >
                <FileInput size={14} />
                模型导入
              </button>
              )}
              {isEditMode && (
              <button
                onClick={() => runContextMenuAction(() => {
                  const project = projectById.get(projectMenu.projectId ?? "");
                  if (project) renameProjectRecord(project);
                })}
              >
                <Pencil size={14} />
                模型重命名
              </button>
              )}
              <button
                onClick={() => runContextMenuAction(() => {
                  const project = projectById.get(projectMenu.projectId ?? "");
                  if (project) copyProjectRecord(project);
                })}
              >
                <Copy size={14} />
                模型复制
              </button>
              {recordClipboard?.kind === "project" && projectMenu.projectId && (
                isEditMode ? (
                <button onClick={() => runContextMenuAction(() => pasteProjectClipboardRecord(projectMenu.schemeId ?? ""))}>
                  <FileInput size={14} />
                  模型粘贴
                </button>
                ) : null
              )}
            </>
          )}
          {!projectMenu.projectId && projectMenu.schemeId && (
            <>
              {isEditMode && (
              <button onClick={() => runContextMenuAction(() => createSchemeRecord(projectMenu.schemeId ?? ""))}>
                <FolderOpen size={14} />
                方案新增
              </button>
              )}
              {isEditMode && (
              <button
                onClick={() => runContextMenuAction(() => {
                  const scheme = findSavedSchemeById(schemes, projectMenu.schemeId ?? "");
                  if (scheme) deleteSchemeRecord(scheme);
                })}
              >
                <Trash2 size={14} />
                方案删除
              </button>
              )}
              <button
                onClick={() => runContextMenuAction(() => {
                  const scheme = findSavedSchemeById(schemes, projectMenu.schemeId ?? "");
                  if (scheme) void exportSchemeRecord(scheme);
                })}
              >
                <Download size={14} />
                方案导出
              </button>
              {isEditMode && (
              <button onClick={() => runContextMenuAction(() => openSchemeImportFilePicker(projectMenu.schemeId ?? ""))}>
                <FileInput size={14} />
                方案导入
              </button>
              )}
              {isEditMode && (
              <button
                onClick={() => runContextMenuAction(() => {
                  const scheme = findSavedSchemeById(schemes, projectMenu.schemeId ?? "");
                  if (scheme) renameSchemeRecord(scheme);
                })}
              >
                <Pencil size={14} />
                方案重命名
              </button>
              )}
              <button
                onClick={() => runContextMenuAction(() => {
                  const scheme = findSavedSchemeById(schemes, projectMenu.schemeId ?? "");
                  if (scheme) copySchemeRecord(scheme);
                })}
              >
                <Copy size={14} />
                方案复制
              </button>
              {recordClipboard?.kind === "scheme" && (
                isEditMode ? (
                <button onClick={() => runContextMenuAction(() => pasteSchemeClipboardRecord(projectMenu.schemeId ?? ""))}>
                  <FileInput size={14} />
                  方案粘贴
                </button>
                ) : null
              )}
              {isEditMode && <div className="context-menu-separator" role="separator" aria-label="方案操作和模型操作分隔" />}
              {isEditMode && (
              <button onClick={() => runContextMenuAction(() => createBlankProject(projectMenu.schemeId ?? ""))}>
                <Plus size={14} />
                模型新建
              </button>
              )}
              {isEditMode && (
              <button onClick={() => runContextMenuAction(() => openModelImportFilePicker(projectMenu.schemeId ?? ""))}>
                <FileInput size={14} />
                模型导入
              </button>
              )}
              {recordClipboard?.kind === "project" && projectMenu.schemeId && (
                isEditMode ? (
                <button onClick={() => runContextMenuAction(() => pasteProjectClipboardRecord(projectMenu.schemeId ?? ""))}>
                  <FileInput size={14} />
                  模型粘贴
                </button>
                ) : null
              )}
            </>
          )}
          {!projectMenu.projectId && !projectMenu.schemeId && (
            <>
              {isEditMode && (
              <button onClick={() => runContextMenuAction(createSchemeRecord)}>
                <FolderOpen size={14} />
                方案新增
              </button>
              )}
              {recordClipboard?.kind === "scheme" && (
                isEditMode ? (
                <button onClick={() => runContextMenuAction(pasteSchemeClipboardRecord)}>
                  <FileInput size={14} />
                  方案粘贴
                </button>
                ) : null
              )}
              {isEditMode && (
              <button onClick={() => runContextMenuAction(openSchemeImportFilePicker)}>
                <FileInput size={14} />
                方案导入
              </button>
              )}
            </>
          )}
        </div>
      )}
      {pendingRecordPasteConflict && (
        <div className="image-picker-backdrop" onPointerDown={() => resolveRecordPasteConflict("cancel")}>
          <section className="unsaved-change-dialog" onPointerDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="record-paste-conflict-title">
            <div className="image-picker-title">
              <div>
                <h2 id="record-paste-conflict-title">名称重复</h2>
                <p>
                  当前{pendingRecordPasteConflict.kind === "scheme" ? "模型库" : pendingRecordPasteConflict.kind === "scheme-drag" ? "目标方案" : "方案"}中已存在“{pendingRecordPasteConflict.duplicateName}”。请选择{pendingRecordPasteConflict.kind === "project-drag" || pendingRecordPasteConflict.kind === "scheme-drag" ? "拖拽" : "粘贴"}处理方式。
                </p>
              </div>
            </div>
            <div className="unsaved-change-actions">
              <button type="button" onClick={() => resolveRecordPasteConflict("overwrite")}>覆盖</button>
              <button type="button" onClick={() => resolveRecordPasteConflict("rename")}>新命名</button>
              <button type="button" onClick={() => resolveRecordPasteConflict("cancel")}>{pendingRecordPasteConflict.kind === "project-drag" || pendingRecordPasteConflict.kind === "scheme-drag" ? "取消拖拽" : "取消粘贴"}</button>
            </div>
          </section>
        </div>
      )}
      {pendingModelImportConflict && (
        <div className="image-picker-backdrop" onPointerDown={() => resolveDuplicateModelImport("cancel")}>
          <section className="unsaved-change-dialog" onPointerDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="model-import-conflict-title">
            <div className="image-picker-title">
              <div>
                <h2 id="model-import-conflict-title">模型名称重复</h2>
                <p>
                  当前方案中已存在模型“{pendingModelImportConflict.duplicateProjectName}”。请选择导入处理方式。
                </p>
              </div>
            </div>
            <div className="unsaved-change-actions">
              <button type="button" onClick={() => resolveDuplicateModelImport("overwrite")}>覆盖</button>
              <button type="button" onClick={() => resolveDuplicateModelImport("rename")}>重命名</button>
              <button type="button" onClick={() => resolveDuplicateModelImport("cancel")}>不导入</button>
            </div>
          </section>
        </div>
      )}
      {pendingSchemeImportConflict && (
        <div className="image-picker-backdrop" onPointerDown={() => resolveDuplicateSchemeImport("cancel")}>
          <section className="unsaved-change-dialog" onPointerDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="scheme-import-conflict-title">
            <div className="image-picker-title">
              <div>
                <h2 id="scheme-import-conflict-title">方案名称重复</h2>
                <p>
                  当前模型库中已存在方案“{pendingSchemeImportConflict.duplicateSchemeName}”。请选择导入处理方式。
                </p>
              </div>
            </div>
            <div className="unsaved-change-actions">
              <button type="button" onClick={() => resolveDuplicateSchemeImport("merge")}>合并覆盖</button>
              <button type="button" onClick={() => resolveDuplicateSchemeImport("rename")}>重新命名</button>
              <button type="button" onClick={() => resolveDuplicateSchemeImport("cancel")}>不导入</button>
            </div>
          </section>
        </div>
      )}
      {pendingUnsavedAction && (
        <div className="image-picker-backdrop" onPointerDown={() => resolveUnsavedChangeAction("cancel")}>
          <section className="unsaved-change-dialog" onPointerDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="unsaved-change-title">
            <div className="image-picker-title">
              <div>
                <h2 id="unsaved-change-title">当前模型尚未保存</h2>
                <p>当前模型“{projectName}”存在未保存修改。{pendingUnsavedAction.label}之前，请选择如何处理这些修改。</p>
              </div>
            </div>
            <div className="unsaved-change-actions">
              <button type="button" onClick={() => resolveUnsavedChangeAction("discard")}>不保存继续切换/关闭</button>
              <button type="button" onClick={() => resolveUnsavedChangeAction("save")}>保存后切换/关闭</button>
              <button type="button" onClick={() => resolveUnsavedChangeAction("cancel")}>退出操作</button>
            </div>
            <p className="unsaved-change-note">关闭网页时，浏览器也会在离开前提示当前模型未保存。</p>
          </section>
        </div>
      )}
      {voltageBaseSetDialogOpen && (
        <div className="image-picker-backdrop" onPointerDown={() => setVoltageBaseSetDialogOpen(false)}>
          <section className="connection-redraw-dialog voltage-base-set-dialog" onPointerDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="voltage-base-set-title">
            <div className="image-picker-title">
              <div>
                <h2 id="voltage-base-set-title">设置电压基值</h2>
                <p>将指定范围内设备端子和电压相关参数中的 vbase、v_base、v_set 等值设为输入值；多端设备可按端子分别设置。</p>
              </div>
              <button type="button" onClick={() => setVoltageBaseSetDialogOpen(false)}>关闭</button>
            </div>
            <label className="voltage-base-set-value-row">
              <span>设置方式</span>
              <select
                value={voltageBaseSetMode}
                onChange={(event) => setVoltageBaseSetMode(event.target.value as any)}
              >
                <option value="uniform">统一设置</option>
                <option value="terminal" disabled={voltageBaseSetTerminalRows.length === 0}>按端子设置</option>
              </select>
            </label>
            {voltageBaseSetMode === "uniform" ? (
            <label className="voltage-base-set-value-row">
              <span>电压基值</span>
              <input
                type="text"
                value={voltageBaseSetValue}
                onChange={(event) => setVoltageBaseSetValue(event.target.value)}
                list="voltage-base-set-options"
                placeholder="例如 110"
                autoFocus
              />
            </label>
            ) : (
              <div className="voltage-base-terminal-grid" aria-label="按端子设置电压基值">
                <div className="voltage-base-terminal-grid-head">
                  <span>设备</span>
                  <span>端子</span>
                  <span>电压基值</span>
                </div>
                {voltageBaseSetTerminalRows.map((row: any, index: number) => (
                  <label className="voltage-base-terminal-row" key={`${row.nodeId}:${row.terminalId}`}>
                    <span title={row.nodeName}>{row.nodeName}</span>
                    <span title={`${row.terminalLabel} / ${row.terminalType}`}>{row.terminalLabel} / {row.terminalType}</span>
                    <input
                      type="text"
                      value={row.value}
                      onChange={(event) => setVoltageBaseTerminalValue(row.nodeId, row.terminalId, event.target.value)}
                      list="voltage-base-set-options"
                      placeholder="例如 110"
                      autoFocus={index === 0}
                    />
                  </label>
                ))}
              </div>
            )}
            <datalist id="voltage-base-set-options">
              {voltageBaseSetOptions.map((value: any) => (
                <option key={value} value={value} />
              ))}
            </datalist>
            <div className="connection-redraw-options voltage-base-set-options" role="radiogroup" aria-label="设置电压基值范围">
              {VOLTAGE_BASE_SET_SCOPES.map((scope: any) => {
                const result = voltageBaseSetResultForScope(scope);
                const count = result.changedNodeIds.length;
                const disabled = count === 0 || voltageBaseSetValue.trim().length === 0;
                return (
                  <button
                    key={scope}
                    type="button"
                    className={voltageBaseSetScope === scope ? "active" : ""}
                    role="radio"
                    aria-checked={voltageBaseSetScope === scope}
                    onClick={() => setVoltageBaseSetScope(scope)}
                    disabled={disabled}
                  >
                    <span>{VOLTAGE_BASE_SET_SCOPE_LABELS[scope]}</span>
                    <strong>{count}</strong>
                  </button>
                );
              })}
            </div>
            <div className="image-picker-actions connection-redraw-actions">
              <button type="button" onClick={() => setVoltageBaseSetDialogOpen(false)}>取消</button>
              <button
                type="button"
                onClick={confirmVoltageBaseSetDialog}
                disabled={(voltageBaseSetMode === "terminal" ? !hasVoltageBaseTerminalValues(voltageBaseTerminalValues) : voltageBaseSetValue.trim().length === 0) || voltageBaseSetResultForScope(voltageBaseSetScope).changedNodeIds.length === 0}
              >
                确定
              </button>
            </div>
          </section>
        </div>
      )}
      {voltageBaseClearDialogOpen && (
        <div className="image-picker-backdrop" onPointerDown={() => setVoltageBaseClearDialogOpen(false)}>
          <section className="connection-redraw-dialog voltage-base-clear-dialog" onPointerDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="voltage-base-clear-title">
            <div className="image-picker-title">
              <div>
                <h2 id="voltage-base-clear-title">清空电压基值</h2>
                <p>将指定范围内设备端子和电压相关参数中的 vbase、v_base、v_set 等值统一设为 0.0。</p>
              </div>
              <button type="button" onClick={() => setVoltageBaseClearDialogOpen(false)}>关闭</button>
            </div>
            <div className="connection-redraw-options voltage-base-clear-options" role="radiogroup" aria-label="清空电压基值范围">
              {VOLTAGE_BASE_CLEAR_SCOPES.map((scope: any) => {
                const result = voltageBaseClearResultForScope(scope);
                const count = result.changedNodeIds.length;
                const disabled = count === 0;
                return (
                  <button
                    key={scope}
                    type="button"
                    className={voltageBaseClearScope === scope ? "active" : ""}
                    role="radio"
                    aria-checked={voltageBaseClearScope === scope}
                    onClick={() => setVoltageBaseClearScope(scope)}
                    disabled={disabled}
                  >
                    <span>{VOLTAGE_BASE_CLEAR_SCOPE_LABELS[scope]}</span>
                    <strong>{count}</strong>
                  </button>
                );
              })}
            </div>
            <div className="image-picker-actions connection-redraw-actions">
              <button type="button" onClick={() => setVoltageBaseClearDialogOpen(false)}>取消</button>
              <button
                type="button"
                onClick={confirmVoltageBaseClearDialog}
                disabled={voltageBaseClearResultForScope(voltageBaseClearScope).changedNodeIds.length === 0}
              >
                确定
              </button>
            </div>
          </section>
        </div>
      )}
      {connectionRedrawDialogOpen && (
        <div className="image-picker-backdrop" onPointerDown={() => setConnectionRedrawDialogOpen(false)}>
          <section className="connection-redraw-dialog" onPointerDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="connection-redraw-title">
            <div className="image-picker-title">
              <div>
                <h2 id="connection-redraw-title">连接线重绘</h2>
                <p>清除指定连接线的旧路径几何，并按当前端子、母线落点和避障规则重新生成。</p>
              </div>
              <button type="button" onClick={() => setConnectionRedrawDialogOpen(false)}>关闭</button>
            </div>
            <div className="connection-redraw-options" role="radiogroup" aria-label="连接线重绘范围">
              {(["selected", "viewport", "all"] as const).map((scope: any) => {
                const count = connectionRedrawEdgeIdsForScope(scope).length;
                const disabled = count === 0;
                return (
                  <button
                    key={scope}
                    type="button"
                    className={connectionRedrawScope === scope ? "active" : ""}
                    role="radio"
                    aria-checked={connectionRedrawScope === scope}
                    onClick={() => setConnectionRedrawScope(scope)}
                    disabled={disabled}
                  >
                    <span>{CONNECTION_REDRAW_SCOPE_LABELS[scope]}</span>
                    <strong>{count}</strong>
                  </button>
                );
              })}
            </div>
            <div className="image-picker-actions connection-redraw-actions">
              <button type="button" onClick={() => setConnectionRedrawDialogOpen(false)}>取消</button>
              <button
                type="button"
                onClick={confirmConnectionRedrawDialog}
                disabled={connectionRedrawEdgeIdsForScope(connectionRedrawScope).length === 0}
              >
                确定
              </button>
            </div>
          </section>
        </div>
      )}
      {templateDialog && (
        <div className="image-picker-backdrop" onPointerDown={cancelTemplateDialog}>
          <section className="template-dialog" onPointerDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="template-dialog-title">
            <div className="image-picker-title">
              <div>
                <h2 id="template-dialog-title">添加模板</h2>
                <p>将当前选中的图元组合保存到模板库，后续可按原始尺寸拖拽生成。</p>
              </div>
              <button type="button" onClick={cancelTemplateDialog}>关闭</button>
            </div>
            <div className="template-dialog-grid">
              <div className="template-dialog-preview">
                {renderGraphTemplatePreview({
                  id: "template-dialog-preview",
                  typeName: templateDraftType,
                  name: templateDraftName || "新模板",
                  sourceSize: templateDialog.sourceSize,
                  clipboard: templateDialog.clipboard,
                  createdAt: "",
                  updatedAt: ""
                })}
                <small>真实尺寸：{templateDialog.sourceSize.width}×{templateDialog.sourceSize.height}</small>
              </div>
              <div className="template-dialog-fields">
                <label>
                  <span>模板类型</span>
                  <div className="template-type-row">
                    <select value={templateDraftType} onChange={(event) => setTemplateDraftType(event.target.value)}>
                      {graphTemplateTypes.map((typeName: any) => (
                        <option key={typeName} value={typeName}>{typeName}</option>
                      ))}
                    </select>
                    <button type="button" onClick={createGraphTemplateType}>新增模板类型</button>
                  </div>
                </label>
                <label>
                  <span>模板名字</span>
                  <input
                    value={templateDraftName}
                    onChange={(event) => setTemplateDraftName(event.target.value)}
                    placeholder="请输入模板名字"
                    autoFocus
                  />
                </label>
              </div>
            </div>
            <div className="template-dialog-actions">
              <button type="button" onClick={cancelTemplateDialog}>取消</button>
              <button type="button" onClick={confirmAddGraphTemplate}>确认</button>
            </div>
          </section>
        </div>
      )}
      {layerDialogOpen && (
        <div className="image-picker-backdrop" onPointerDown={() => setLayerDialogOpen(false)}>
          <section className="layer-dialog" onPointerDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="layer-dialog-title">
            <div className="image-picker-title">
              <div>
                <h2 id="layer-dialog-title">图层管理</h2>
                <p>管理模型图层的显示、顺序和激活状态。新建或拖入的图元默认进入当前激活图层。</p>
              </div>
              <button type="button" onClick={() => setLayerDialogOpen(false)}>关闭</button>
            </div>
            <div className="layer-dialog-status">
              <span>激活图层</span>
              <strong>{activeLayer?.name ?? "默认图层"}</strong>
            </div>
            {renderLayerManager()}
          </section>
        </div>
      )}
      {layerAssignmentDialogOpen && (
        <div className="image-picker-backdrop" onPointerDown={() => setLayerAssignmentDialogOpen(false)}>
          <section className="layer-assignment-dialog" onPointerDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="layer-assignment-title">
            <div className="image-picker-title">
              <div>
                <h2 id="layer-assignment-title">图层修改</h2>
                <p>当前选中 {activeSelectedNodeIds.length} 个图元。选择目标图层后，确认应用到这些图元。</p>
              </div>
              <button type="button" onClick={() => setLayerAssignmentDialogOpen(false)}>关闭</button>
            </div>
            <label className="layer-assignment-field">
              <span>目标图层</span>
              <select
                value={layerAssignmentTargetId}
                onChange={(event) => setLayerAssignmentTargetId(event.target.value)}
              >
                {layers.map((layer: any) => (
                  <option key={layer.id} value={layer.id}>
                    {layer.visible ? layer.name : `${layer.name}（隐藏）`}
                  </option>
                ))}
              </select>
            </label>
            <p className="layer-assignment-note">如果目标图层处于隐藏状态，应用后这些图元会按图层显示规则从画布上隐藏。</p>
            <div className="image-picker-actions layer-assignment-actions">
              <button type="button" onClick={() => setLayerAssignmentDialogOpen(false)}>取消</button>
              <button
                type="button"
                onClick={applyLayerAssignmentDialog}
                disabled={activeSelectedNodeIds.length === 0 || !layers.some((layer: any) => layer.id === layerAssignmentTargetId) || layerAssignmentUnchanged}
              >
                应用
              </button>
            </div>
          </section>
        </div>
      )}
      {ENABLE_REACT_FLOW_PREVIEW && ReactFlowPreview && reactFlowPreviewOpen && (
        <div className="image-picker-backdrop react-flow-preview-backdrop" onPointerDown={() => setReactFlowPreviewOpen(false)}>
          <section className="react-flow-preview-dialog" onPointerDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="react-flow-preview-title">
            <div className="image-picker-title">
              <div>
                <h2 id="react-flow-preview-title">React Flow 预览</h2>
                <p>开发态验证入口：仅展示当前可见模型，主画布、拓扑、布线和导出逻辑保持不变。</p>
              </div>
              <button type="button" onClick={() => setReactFlowPreviewOpen(false)}>关闭</button>
            </div>
            <div className="react-flow-preview-stage">
              <Suspense fallback={<div className="react-flow-preview-loading">正在加载 React Flow 预览...</div>}>
                <ReactFlowPreview nodes={visibleNodes} edges={visibleEdges} />
              </Suspense>
            </div>
          </section>
        </div>
      )}
      {colorPaletteDialogOpen && (
        <div className="image-picker-backdrop" onPointerDown={() => setColorPaletteDialogOpen(false)}>
          <section className="color-palette-dialog" onPointerDown={(event) => event.stopPropagation()}>
            <div className="image-picker-title">
              <div>
                <h2>配色设置</h2>
                <p>配置能流类型和电压等级颜色，保存后用于图元、端子、联络线和导出图形。</p>
              </div>
              <button onClick={() => setColorPaletteDialogOpen(false)}>关闭</button>
            </div>
            <div className="color-palette-tabs" role="tablist" aria-label="配色方式">
              <button
                className={colorPaletteTab === "energy" ? "active" : ""}
                onClick={() => {
                  setColorPaletteTab("energy");
                  toggleColorDisplayMode("energy");
                }}
                type="button"
              >
                按能流类型
              </button>
              <button
                className={colorPaletteTab === "voltage" ? "active" : ""}
                onClick={() => {
                  setColorPaletteTab("voltage");
                  toggleColorDisplayMode("voltage");
                }}
                type="button"
              >
                按电压等级
              </button>
            </div>
            {colorPaletteTab === "energy" ? (
              <div className="color-palette-table" aria-label="能流类型配色">
                {ENERGY_COLOR_ROWS.map((row: any) => {
                  const color = colorPaletteDraft.energy[row.type] ?? DEFAULT_COLOR_PALETTE.energy[row.type];
                  return (
                    <label className="color-palette-row" key={row.type}>
                      <span>{row.label}</span>
                      <input
                        type="color"
                        value={color.startsWith("#") ? color : DEFAULT_COLOR_PALETTE.energy[row.type]}
                        onChange={(event) => updateEnergyColor(row.type, event.target.value)}
                        aria-label={`${row.label}颜色`}
                      />
                      <input
                        value={color}
                        onChange={(event) => updateEnergyColor(row.type, event.target.value)}
                        aria-label={`${row.label}颜色值`}
                      />
                    </label>
                  );
                })}
              </div>
            ) : (
              <div className="voltage-color-panel">
                <div className="voltage-color-toolbar" role="group" aria-label="电压等级显示范围">
                  <button
                    type="button"
                    className={voltageColorVisibility === "all" ? "active" : ""}
                    onClick={() => setVoltageColorVisibility("all")}
                  >
                    全部电压等级
                  </button>
                  <button
                    type="button"
                    className={voltageColorVisibility === "current" ? "active" : ""}
                    onClick={() => setVoltageColorVisibility("current")}
                  >
                    当前模型电压等级
                  </button>
                  <span>{`当前模型 ${currentModelVoltageColorKeys.size} 项`}</span>
                </div>
                <div className="voltage-color-header">
                  <span>AC/DC</span>
                  <span>电压基值</span>
                  <span>颜色</span>
                  <span>操作</span>
                </div>
                <div className="voltage-color-list">
                  {visibleVoltageColorRows.length > 0 ? (
                    visibleVoltageColorRows.map((row: any) => (
                      <div className="voltage-color-row" key={row.key}>
                        <select
                          value={row.type}
                          onChange={(event) => updateVoltageColorRow(row.key, { type: event.target.value as "ac" | "dc" })}
                          aria-label="AC/DC"
                        >
                          {ELECTRIC_COLOR_TYPES.map((type: any) => (
                            <option key={type} value={type}>{ELECTRIC_COLOR_TYPE_LABELS[type]}</option>
                          ))}
                        </select>
                        <input
                          value={row.voltage}
                          onChange={(event) => updateVoltageColorRow(row.key, { voltage: event.target.value })}
                          aria-label="电压基值"
                        />
                        <div className="color-field">
                          <input
                            type="color"
                            value={row.color.startsWith("#") ? row.color : "#64748b"}
                            onChange={(event) => updateVoltageColorRow(row.key, { color: event.target.value })}
                            aria-label={`${row.type.toUpperCase()} ${row.voltage}颜色`}
                          />
                          <input
                            value={row.color}
                            onChange={(event) => updateVoltageColorRow(row.key, { color: event.target.value })}
                            aria-label={`${row.type.toUpperCase()} ${row.voltage}颜色值`}
                          />
                        </div>
                        <button type="button" onClick={() => deleteVoltageColorRow(row.key)}>删除</button>
                      </div>
                    ))
                  ) : (
                    <div className="voltage-color-empty">当前模型暂无交流/直流电压等级。</div>
                  )}
                </div>
                {voltageColorVisibility === "all" && (
                  <button type="button" className="secondary-action" onClick={addVoltageColorRow}>新增电压等级</button>
                )}
              </div>
            )}
            <div className="image-picker-actions color-palette-actions">
              <button type="button" onClick={colorPaletteTab === "energy" ? resetEnergyColors : resetVoltageColors}>
                {colorPaletteTab === "energy" ? "恢复默认能流配色" : "恢复默认电压配色"}
              </button>
              <button type="button" onClick={saveColorPalette}>保存</button>
            </div>
          </section>
        </div>
      )}
      {deviceDefinitionDialogOpen && (
        <div className="image-picker-backdrop" onPointerDown={() => setDeviceDefinitionDialogOpen(false)}>
          <section className="device-definition-dialog" onPointerDown={(event) => event.stopPropagation()}>
            <div className="image-picker-title">
              <div>
                <h2>修改元件</h2>
                <p>查看内置和自定义元件定义，维护新建图元时使用的设备属性。</p>
              </div>
              <button onClick={() => setDeviceDefinitionDialogOpen(false)}>关闭</button>
            </div>
            <div className="device-definition-layout">
              <aside className="device-definition-list" aria-label="元件定义列表">
                {attributeLibraries.map((group: any) => {
                  const templates = groupedAttributeLibrary[group] ?? [];
                  if (templates.length === 0) {
                    return null;
                  }
                  const expanded = expandedDefinitionGroups.includes(group);
                  return (
                    <section className="device-definition-group" key={group}>
                      <button
                        type="button"
                        className="device-definition-group-toggle"
                        aria-expanded={expanded}
                        onClick={() => toggleDefinitionGroup(group)}
                      >
                        {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        <span>{group}</span>
                        <strong>{templates.length}</strong>
                      </button>
                      {expanded && (
                        <div className="component-definition-type-list" role="group" aria-label={`${group}元件类型列表`}>
                          {(groupedAttributeLibraryByComponentType[group] ?? []).map((typeGroup: any) => (
                            <section className="component-definition-type-group" key={`${group}-${typeGroup.section}`}>
                              <div className="component-definition-type-header">
                                <span>{typeGroup.section}</span>
                                <strong>{typeGroup.templates.length}</strong>
                              </div>
                              <div className="device-definition-items" role="group" aria-label={`${group}/${typeGroup.section}元件列表`}>
                                {typeGroup.templates.map((template: any) => (
                                  <button
                                    type="button"
                                    key={template.kind}
                                    className={`device-definition-item ${selectedDefinitionTemplate?.kind === template.kind ? "active" : ""}`}
                                    onClick={() => loadDefinitionTemplateDraft(template)}
                                  >
                                    <span>{template.label}</span>
                                    <small>{template.kind}</small>
                                  </button>
                                ))}
                              </div>
                            </section>
                          ))}
                        </div>
                      )}
                    </section>
                  );
                })}
              </aside>
              <section className="device-definition-detail">
                {selectedDefinitionTemplate ? (
                  <>
                    <div className="device-definition-summary">
                      <div>
                        <span>元件名称</span>
                        <strong>{selectedDefinitionTemplate.label}</strong>
                      </div>
                      <div>
                        <span>图元类型</span>
                        <strong>{selectedDefinitionTemplate.kind}</strong>
                      </div>
                      <div>
                        <span>属性库</span>
                        <strong>{normalizeAttributeLibraryName(selectedDefinitionTemplate.attributeLibrary)}</strong>
                      </div>
                      <div>
                        <span>来源</span>
                        <strong>{selectedDefinitionTemplate.custom ? "自定义" : "内置"}</strong>
                      </div>
                      <div>
                        <span>端子数量</span>
                        <strong>{selectedDefinitionTemplate.terminalCount}</strong>
                      </div>
                      <div>
                        <span>是否容器</span>
                        <strong>{selectedDefinitionTemplate.isContainer ? "是" : "否"}</strong>
                      </div>
                      <div>
                        <span>能源属性</span>
                        <strong>
                          {(selectedDefinitionTemplate.terminalTypes ?? Array.from({ length: selectedDefinitionTemplate.terminalCount }, () => selectedDefinitionTemplate.terminalType))
                            .map((type: any) => TERMINAL_TYPE_OPTIONS.find((option: any) => option.value === type)?.label ?? type)
                            .join(" / ") || "无端子"}
                        </strong>
                      </div>
                      <div>
                        <span>默认尺寸</span>
                        <strong>{selectedDefinitionTemplate.size.width} x {selectedDefinitionTemplate.size.height}</strong>
                      </div>
                      <div>
                        <span>定义状态</span>
                        <strong>{deviceDefinitionOverrides[selectedDefinitionTemplate.kind]?.updatedAt ? "已自定义" : "默认"}</strong>
                      </div>
                      <div>
                        <span>元件类型</span>
                        <select
                          className={sourceSelectClassName(isBuiltInComponentType(definitionDraftSection))}
                          value={definitionDraftSection}
                          onChange={(event) => {
                            setDefinitionDraftSection(event.target.value);
                            setDefinitionDraftError("");
                          }}
                        >
                          {definitionAttributeLibraryComponentTypeOptions.map((section: any) => (
                            <option
                              key={section}
                              value={section}
                              className={componentTypeOptionClass(section)}
                              title={isBuiltInComponentType(section) ? "系统内置元件类型，无法删除" : "用户自定义元件类型，可以删除"}
                            >
                              {section}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    {selectedDefinitionTemplate.isContainer && selectedDefinitionTerminalAssociations.length > 0 && (
                      <section className="device-definition-associations">
                        <div className="device-definition-section-title">
                          <h3>端子关联信息</h3>
                          <span>{selectedDefinitionTerminalAssociations.length} 个端子</span>
                        </div>
                        <div className="custom-param-table-wrap compact-table-wrap">
                          <table className="custom-param-table">
                            <thead>
                              <tr>
                                <th>端子</th>
                                <th>能源属性</th>
                                <th>关联对象</th>
                                <th>关联字段</th>
                                <th>说明</th>
                              </tr>
                            </thead>
                            <tbody>
                              {selectedDefinitionTerminalAssociations.map((association: any) => (
                                <tr key={`${selectedDefinitionTemplate.kind}-terminal-${association.terminalIndex}`}>
                                  <td>{association.terminalLabel}</td>
                                  <td>{TERMINAL_TYPE_OPTIONS.find((option: any) => option.value === association.terminalType)?.label ?? association.terminalType}</td>
                                  <td>{association.deviceModel ? `${association.roleLabel} / ${association.deviceModel}` : association.roleLabel}</td>
                                  <td><code>{association.relationKey || "-"}</code></td>
                                  <td>
                                    {association.dependent
                                      ? `随端子${association.sourceTerminalIndex + 1}分配到同一个关联设备`
                                      : association.relationName}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </section>
                    )}
                    {definitionDraftError && <p className="custom-device-error">{definitionDraftError}</p>}
                    <div className="custom-param-table-wrap device-definition-table-wrap">
                      <table className="custom-param-table">
                        <thead>
                          <tr>
                            <th>中文名称</th>
                            <th>英文名称</th>
                            <th>取值类型</th>
                            <th>典型取值</th>
                            <th>操作</th>
                          </tr>
                        </thead>
                        <tbody>
                          {definitionDraftRows.map((row: any) => (
                            <tr key={row.id} className={row.readonly ? "readonly-row" : ""}>
                              <td>
                                <input
                                  value={row.cnName}
                                  disabled={row.readonly}
                                  onChange={(event) => updateDefinitionDraftRow(row.id, { cnName: event.target.value })}
                                />
                              </td>
                              <td>
                                <input
                                  value={row.enName}
                                  disabled={row.readonly}
                                  onChange={(event) => updateDefinitionDraftRow(row.id, { enName: event.target.value })}
                                />
                              </td>
                              <td>
                                <select
                                  value={row.valueType}
                                  disabled={row.readonly}
                                  onChange={(event) => updateDefinitionDraftRow(row.id, { valueType: event.target.value as any })}
                                >
                                  {PARAM_VALUE_TYPE_OPTIONS.map((option: any) => (
                                    <option key={option.value} value={option.value}>
                                      {option.label}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td>
                                <input
                                  value={row.typicalValue}
                                  disabled={row.readonly}
                                  onChange={(event) => updateDefinitionDraftRow(row.id, { typicalValue: event.target.value })}
                                />
                              </td>
                              <td>
                                <div className="custom-param-actions">
                                  <button type="button" onClick={() => deleteDefinitionDraftRow(row.id)} disabled={row.readonly}>
                                    删除
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="custom-device-actions">
                      <button type="button" onClick={addDefinitionDraftRow}>新增参数</button>
                      <button type="button" onClick={saveDeviceDefinitionDraft}>保存定义</button>
                      <button type="button" onClick={resetDeviceDefinitionDraft} disabled={!selectedDefinitionBaseTemplate}>
                        恢复默认
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="empty-state compact">
                    <Grid2X2 size={24} />
                    <p>当前属性库暂无元件。</p>
                  </div>
                )}
              </section>
            </div>
          </section>
        </div>
      )}
      {customDeviceDialogOpen && (
        <div className="image-picker-backdrop" onPointerDown={() => setCustomDeviceDialogOpen(false)}>
          <section className="custom-device-dialog" onPointerDown={(event) => event.stopPropagation()}>
            <div className="image-picker-title">
              <div>
                <h2>新建元件</h2>
                <p>定义后会出现在左侧图元库，可拖拽到画布建模。</p>
              </div>
              <button onClick={() => setCustomDeviceDialogOpen(false)}>关闭</button>
            </div>
            {customDeviceDraft.error && <p className="custom-device-error">{customDeviceDraft.error}</p>}
            <div className="custom-device-dialog-layout">
              {renderCustomComponentManagerTree()}
              <div className="custom-device-editor-panel">
            <div className="custom-device-form-grid">
              <label className="custom-attribute-library-field">
                <span>属性库类型</span>
                <div className="custom-attribute-library-select-row single-control">
                  <select
                    className={sourceSelectClassName(isBuiltInAttributeLibrary(customDeviceDraft.attributeLibraryName))}
                    value={customDeviceDraft.attributeLibraryName}
                    onChange={(event) => selectCustomAttributeLibrary(event.target.value)}
                  >
                    {selectableAttributeLibraries.map((group: any) => (
                      <option
                        key={group}
                        value={group}
                        className={attributeLibraryOptionClass(group)}
                        title={isBuiltInAttributeLibrary(group) ? "系统内置属性库，无法删除" : "用户自定义属性库，可以删除"}
                      >
                        {group}
                      </option>
                    ))}
                  </select>
                </div>
              </label>
              <label className="custom-component-type-field">
                <span>元件类型</span>
                <div className="custom-attribute-library-select-row single-control">
                  <select
                    className={sourceSelectClassName(isBuiltInComponentType(customDeviceDraft.componentType))}
                    value={customDeviceDraft.componentType}
                    onChange={(event) => selectCustomComponentType(customDeviceDraft.attributeLibraryName, event.target.value)}
                  >
                    {currentAttributeLibraryComponentTypeOptions.map((section: any) => (
                      <option
                        key={section}
                        value={section}
                        className={componentTypeOptionClass(section)}
                        title={isBuiltInComponentType(section) ? "系统内置元件类型，无法删除" : "用户自定义元件类型，可以删除"}
                      >
                        {section}
                      </option>
                    ))}
                  </select>
                </div>
              </label>
              <label>
                元件名称
                <input
                  value={customDeviceDraft.componentName}
                  placeholder="例如 水电、核电、风电、光伏"
                  onChange={(event) => setCustomDeviceDraft((current: any) => ({ ...current, componentName: event.target.value, error: "" }))}
                />
              </label>
              <label>
                是否容器
                <select
                  value={customDeviceDraft.isContainer ? "1" : "0"}
                  onChange={(event) =>
                    setCustomDeviceDraft((current: any) => ({
                      ...current,
                      isContainer: event.target.value === "1",
                      error: ""
                    }))
                  }
                >
                  <option value="0">否</option>
                  <option value="1">是</option>
                </select>
              </label>
              <label>
                端子数量
                <input
                  type="number"
                  min="0"
                  max="4"
                  value={customDeviceDraft.terminalCount}
                  onChange={(event) => updateCustomDraftTerminalCount(Number(event.target.value))}
                />
              </label>
            </div>
            <div className="custom-device-image-row">
              <span>背景照片</span>
              <button type="button" onClick={() => customDeviceImageInputRef.current?.click()}>选择本地图片</button>
              <button
                type="button"
                onClick={() =>
                  setCustomDeviceDraft((current: any) => ({
                    ...current,
                    backgroundImage: generateCustomDeviceImage(
                      current.componentName.trim() || current.componentType || "Unit",
                      current.terminalTypes.slice(0, current.terminalCount)
                    ),
                    error: ""
                  }))
                }
              >
                程序自动生成
              </button>
              <button type="button" onClick={() => setCustomDeviceDraft((current: any) => ({ ...current, backgroundImage: "", error: "" }))}>清除</button>
              <strong>{customDeviceDraft.backgroundImage ? "已设置" : "未设置"}</strong>
            </div>
            <div className="custom-device-preview">
              <span>背景预览</span>
              <div>
                <img src={customDevicePreviewImage} alt="自定义元件背景图片预览" />
              </div>
              <small>{customDeviceDraft.backgroundImage ? "当前显示本地图片预览" : "当前显示默认样例预览"}</small>
            </div>
            <div className="custom-terminal-grid">
              {Array.from({ length: customDeviceDraft.terminalCount }).map((_, index) => {
                const terminalTypes = customDeviceDraft.terminalTypes.slice(0, customDeviceDraft.terminalCount);
                const terminalAssociations = normalizeContainerTerminalAssociations(
                  terminalTypes,
                  customDeviceDraft.terminalAssociations,
                  customDeviceDraft.terminalCount
                );
                const associationSourceIndex = getContainerTerminalAssociationSourceIndex(terminalAssociations, index);
                const associationDependent = customDeviceDraft.isContainer && isContainerTerminalAssociationDependent(terminalAssociations, index);
                const terminalType = customDeviceDraft.terminalTypes[index] ?? "ac";
                const associationOptions = CONTAINER_TERMINAL_ASSOCIATION_OPTIONS[terminalType];
                return (
                  <label key={index} className={associationDependent ? "custom-terminal-dependent" : ""}>
                    {`端子${index + 1}能源属性`}
                    <select
                      value={terminalType}
                      disabled={associationDependent}
                      onChange={(event) =>
                        setCustomDeviceDraft((current: any) => {
                          const terminalTypes = [...current.terminalTypes];
                          terminalTypes[index] = event.target.value as any;
                          const terminalAssociations = [...current.terminalAssociations];
                          if (current.isContainer) {
                            if (isDoubleContainerTerminalAssociation(terminalAssociations[index]) && index + 1 < current.terminalCount) {
                              terminalAssociations[index + 1] = defaultContainerAssociationForTerminalType(terminalTypes[index + 1] ?? "ac");
                            }
                            terminalAssociations[index] = defaultContainerAssociationForTerminalType(terminalTypes[index]);
                          }
                          return {
                            ...current,
                            terminalTypes,
                            terminalAssociations: normalizeContainerTerminalAssociations(
                              terminalTypes.slice(0, current.terminalCount),
                              terminalAssociations,
                              current.terminalCount
                            ),
                            error: ""
                          };
                        })
                      }
                    >
                      {TERMINAL_TYPE_OPTIONS.map((option: any) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    {customDeviceDraft.isContainer && (
                      <>
                        <span>关联设备</span>
                        <select
                          value={associationDependent ? "" : terminalAssociations[index] || defaultContainerAssociationForTerminalType(terminalType)}
                          disabled={associationDependent}
                          onChange={(event) =>
                            setCustomDeviceDraft((current: any) => {
                              const selectedAssociation = event.target.value as any;
                              if (isDoubleContainerTerminalAssociation(selectedAssociation) && index + 1 >= current.terminalCount) {
                                const message = `端子${index + 1}是最后一个端子，不能设置为双端热源/热荷。`;
                                window.alert(message);
                                return { ...current, error: message };
                              }
                              const terminalTypes = [...current.terminalTypes];
                              const terminalAssociations = [...current.terminalAssociations];
                              const previousAssociation = terminalAssociations[index];
                              terminalAssociations[index] = selectedAssociation;
                              if (isDoubleContainerTerminalAssociation(selectedAssociation) && index + 1 < current.terminalCount) {
                                terminalTypes[index + 1] = terminalTypes[index] ?? "heat";
                                terminalAssociations[index + 1] = "";
                              } else if (isDoubleContainerTerminalAssociation(previousAssociation) && index + 1 < current.terminalCount) {
                                terminalAssociations[index + 1] = defaultContainerAssociationForTerminalType(terminalTypes[index + 1] ?? "ac");
                              }
                              return {
                                ...current,
                                terminalTypes,
                                terminalAssociations: normalizeContainerTerminalAssociations(
                                  terminalTypes.slice(0, current.terminalCount),
                                  terminalAssociations,
                                  current.terminalCount
                                ),
                                error: ""
                              };
                            })
                          }
                        >
                          {associationDependent && <option value="">随上一个端子关联同一个双端元件</option>}
                          {associationOptions.map((option: any) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        {associationDependent && <small>{`随端子${associationSourceIndex + 1}分配到同一个双端元件，关联属性为空。`}</small>}
                      </>
                    )}
                  </label>
                );
              })}
            </div>
            <div className="custom-param-table-wrap">
              <table className="custom-param-table">
                <thead>
                  <tr>
                    <th>中文名称</th>
                    <th>英文名称</th>
                    <th>取值类型</th>
                    <th>典型取值</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {customDraftDefaultParams.map((row: any) => (
                    <tr key={`default-${row.enName}`} className="readonly-row">
                      <td>{row.cnName}</td>
                      <td>{row.enName}</td>
                      <td>{PARAM_VALUE_TYPE_OPTIONS.find((option: any) => option.value === row.valueType)?.label ?? row.valueType}</td>
                      <td>{row.typicalValue}</td>
                      <td>默认</td>
                    </tr>
                  ))}
                  {customDeviceDraft.params.map((row: any, index: number) => (
                    <tr key={row.id}>
                      <td>
                        <input
                          value={row.cnName}
                          onChange={(event) =>
                            setCustomDeviceDraft((current: any) => ({
                              ...current,
                              params: current.params.map((item: any) => (item.id === row.id ? { ...item, cnName: event.target.value } : item)),
                              error: ""
                            }))
                          }
                        />
                      </td>
                      <td>
                        <input
                          value={row.enName}
                          onChange={(event) =>
                            setCustomDeviceDraft((current: any) => ({
                              ...current,
                              params: current.params.map((item: any) => (item.id === row.id ? { ...item, enName: event.target.value } : item)),
                              error: ""
                            }))
                          }
                        />
                      </td>
                      <td>
                        <select
                          value={row.valueType}
                          onChange={(event) =>
                            setCustomDeviceDraft((current: any) => ({
                              ...current,
                              params: current.params.map((item: any) => (item.id === row.id ? { ...item, valueType: event.target.value as any } : item)),
                              error: ""
                            }))
                          }
                        >
                          {PARAM_VALUE_TYPE_OPTIONS.map((option: any) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input
                          value={row.typicalValue}
                          onChange={(event) =>
                            setCustomDeviceDraft((current: any) => ({
                              ...current,
                              params: current.params.map((item: any) => (item.id === row.id ? { ...item, typicalValue: event.target.value } : item)),
                              error: ""
                            }))
                          }
                        />
                      </td>
                      <td>
                        <div className="custom-param-actions">
                          <button
                            type="button"
                            onClick={() =>
                              setCustomDeviceDraft((current: any) => {
                                if (index === 0) return current;
                                const params = [...current.params];
                                [params[index - 1], params[index]] = [params[index], params[index - 1]];
                                return { ...current, params };
                              })
                            }
                            disabled={index === 0}
                          >
                            上移
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setCustomDeviceDraft((current: any) => {
                                if (index >= current.params.length - 1) return current;
                                const params = [...current.params];
                                [params[index + 1], params[index]] = [params[index], params[index + 1]];
                                return { ...current, params };
                              })
                            }
                            disabled={index >= customDeviceDraft.params.length - 1}
                          >
                            下移
                          </button>
                          <button
                            type="button"
                            onClick={() => setCustomDeviceDraft((current: any) => ({ ...current, params: current.params.filter((item: any) => item.id !== row.id) }))}
                          >
                            删除
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="custom-device-actions">
              <button
                type="button"
                onClick={() =>
                  setCustomDeviceDraft((current: any) => ({
                    ...current,
                    params: [
                      ...current.params,
                      { id: customParamId(), cnName: "", enName: "", valueType: "string", typicalValue: "" }
                    ]
                  }))
                }
              >
                新增参数
              </button>
              <button type="button" onClick={saveCustomDeviceTemplate}>保存自定义设备</button>
            </div>
              </div>
            </div>
          </section>
        </div>
      )}
      {imageTarget && (
        <div className="image-picker-backdrop" onPointerDown={() => setImageTarget(null)}>
          <section className="image-picker-dialog" onPointerDown={(event) => event.stopPropagation()}>
            <div className="image-picker-title">
              <div>
                <h2>{imageTarget.kind === "canvas" ? "选择模型背景图片" : imageTarget.kind === "nodeForeground" ? "选择设备前景图片" : "选择设备图片"}</h2>
                <p>本地图片会先上传到后台图片库；请再从后台可用图片列表中选择应用。</p>
              </div>
              <button onClick={() => setImageTarget(null)}>关闭</button>
            </div>
            <div className="image-picker-actions">
              <select value={activeImageFolderId} onChange={(event) => setActiveImageFolderId(event.target.value)}>
                {imageFolders.map((folder: any) => (
                  <option key={folder.id} value={folder.id}>
                    {folder.name}{typeof folder.imageCount === "number" ? ` (${folder.imageCount})` : ""}
                  </option>
                ))}
              </select>
              <button onClick={createImageFolder} disabled={isBrowseMode}>新建文件夹</button>
              <button onClick={renameImageFolder} disabled={isBrowseMode || activeImageFolderId === "root"}>重命名</button>
              <button onClick={deleteImageFolder} disabled={isBrowseMode || activeImageFolderId === "root"}>删除文件夹</button>
              <button onClick={() => imageInputRef.current?.click()} disabled={isBrowseMode}>上传本地图片到后台</button>
              <button onClick={clearSelectedImage} disabled={isBrowseMode}>取消当前图片</button>
            </div>
            <div className="image-asset-list">
              {imageAssetList.length === 0 ? (
                <p className="image-empty">后台暂无图片，请先加载本地图片。</p>
              ) : (
                imageAssetList.map((asset: any, index: number) => (
                  <button key={asset.id} className="image-asset-option" disabled={isBrowseMode} onClick={() => applyExistingImage(asset.id)}>
                    <img src={imageAssets[asset.id] ?? asset.url} alt={asset.name || `后台图片 ${index + 1}`} />
                    <span>{asset.name || `后台图片 ${index + 1}`}</span>
                  </button>
                ))
              )}
            </div>
          </section>
        </div>
      )}
    </>
  );
}
