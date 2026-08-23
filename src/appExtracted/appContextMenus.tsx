import { memo, useState, useRef } from "react";

type AppContextMenusProps = {
  scope: Record<string, any>;
};

export const AppContextMenus = memo(function AppContextMenus({ scope }: AppContextMenusProps) {
  const __appScope = scope;
  const {
    AlignCenterHorizontal, ArrowDown, ArrowUp, BoxSelect, ChevronRight, ChevronsDown, ChevronsUp, CircleDot,
    Copy, Download, FileInput, FolderOpen, Grid2X2, Group, Layers, Layers2,
    Pencil, Plus, Route, Save, ScanSearch, Scissors, Trash2, Type,
    Undo2, Ungroup, Zap, ZapOff, activeLayerNodes, activeSelectedNodeIds, addDefaultMeasurementsToNode, addManualBendFromContextMenu,
    addRoutableLineBendFromContextMenu, adjustSelectedDisplayLayer, autoAlignCanvasGraphics, autoSpreadCanvasGraphics, canAddTemplateFromSelection, canGroupSelectedGraphics, canUngroupSelectedGraphics, canvasClipboard,
    contextMeasurementGroup, contextMeasurementNode, contextMenu, contextMenuClassName, contextMenuForEdge, contextMenuForNode, contextMenuForRoutableLine, contextMenuForSelection,
    contextMenuFromElementTree, contextMenuRef, contextMenuStyle, contextMenuTarget, contextSelectionCount, copyProjectRecord, copySchemeRecord, copySelection,
    createBlankProject, createSchemeRecord, customGraphTemplates, cutSelection, deleteGraphTemplate, deleteGraphTemplateType, deleteProjectRecord, deleteSchemeRecord,
    deleteSelection, exportProjectRecordFile, exportSchemeRecord, findSavedSchemeById, groupSelectedGraphics, isEditMode, keepTemplateContextMenuFlyoutOpen, nodes,
    openAddTemplateDialog, openConnectionRedrawDialog, openFilterSelectionDialog, openGroupDeviceDefinitionDialog, openLayerAssignmentDialog, openMeasurementEditorForNode, openModelImportFilePicker, openSchemeImportFilePicker,
    openVoltageBaseClearDialog, openVoltageBaseSetDialog, pasteProjectClipboardRecord, pasteSchemeClipboardRecord, pasteSelection, projectById, projectMenu, recordClipboard,
    removeMeasurementsFromNode, renameProjectRecord, renameSchemeRecord, runContextMenuAction, saveCurrentProject, saveRequired, scheduleGraphTemplateFlyoutClose, schemes,
    selectedEdge, setSelectedNodeLabelDisplayMode, startContextMarqueeSelection, templateMenu, tidyRoutableLineRoute, tidySelectedEdgeRoute, undoLastOperation, undoStack,
    ungroupSelectedGraphics
  } = scope;
  const [submenuHovered, setSubmenuHovered] = useState<string | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSubmenuLeave = () => {
    closeTimerRef.current = setTimeout(() => setSubmenuHovered(null), 150);
  };
  const handleSubmenuEnter = (id: string) => {
    clearTimeout(closeTimerRef.current ?? undefined);
    setSubmenuHovered(id);
  };
  return (<>
{contextMenu && (<div ref={contextMenuRef} className={contextMenuClassName(contextMenu)} data-canvas-context-menu="true" style={contextMenuStyle(contextMenu)}>
          {isEditMode && contextMenuFromElementTree && contextMenuForSelection && contextSelectionCount > 0 && (<button onClick={() => runContextMenuAction(deleteSelection)}>
              <Trash2 size={14}/>
              删除
            </button>)}
          {!contextMenuFromElementTree && (<>
              {isEditMode && contextMenuTarget === "blank" && contextMenu.canvasPoint && (<button onClick={() => runContextMenuAction(startContextMarqueeSelection)}>
                  <BoxSelect size={14}/>
                  框选
                </button>)}
              {isEditMode && contextMenuTarget === "blank" && activeLayerNodes.length > 0 && (<button onClick={() => runContextMenuAction(openFilterSelectionDialog)}>
                  <ScanSearch size={14}/>
                  过滤选择
                </button>)}
              {isEditMode && undoStack.length > 0 && (<button onClick={() => runContextMenuAction(undoLastOperation)}>
                  <Undo2 size={14}/>
                  撤销
                </button>)}
              {contextMenuForSelection && contextSelectionCount > 0 && (<button onClick={() => runContextMenuAction(copySelection)}>
                  <Copy size={14}/>
                  复制
                </button>)}
              {isEditMode && contextMenuForSelection && contextSelectionCount > 0 && (<button onClick={() => runContextMenuAction(cutSelection)}>
                  <Scissors size={14}/>
                  剪切
                </button>)}
              {isEditMode && saveRequired && (<button onClick={() => runContextMenuAction(() => { void saveCurrentProject(); })}>
                  <Save size={14}/>
                  保存
                </button>)}
              {isEditMode && (canvasClipboard.nodes.length > 0 || canvasClipboard.edges.length > 0) && (<button onClick={() => runContextMenuAction(pasteSelection)}>
                  <FileInput size={14}/>
                  粘贴
                </button>)}
              {isEditMode && nodes.length > 0 && (<div className={`context-menu-submenu${submenuHovered === "voltage" ? " submenu-hovered" : ""}`} onMouseEnter={() => handleSubmenuEnter("voltage")} onMouseLeave={handleSubmenuLeave}>
                  <button type="button" className="context-menu-submenu-trigger">
                    <Zap size={14}/>
                    电压基值
                    <ChevronRight size={14}/>
                  </button>
                  <div className="context-menu-submenu-panel">
                    <button onClick={() => runContextMenuAction(openVoltageBaseSetDialog)}>
                      <Zap size={14}/>
                      设置电压基值
                    </button>
                    <button onClick={() => runContextMenuAction(openVoltageBaseClearDialog)}>
                      <ZapOff size={14}/>
                      清空电压基值
                    </button>
                  </div>
                </div>)}
              {isEditMode && contextMenuTarget === "blank" && activeLayerNodes.length > 1 && (<button onClick={() => runContextMenuAction(autoAlignCanvasGraphics)}>
                  <AlignCenterHorizontal size={14}/>
                  自动对齐
                </button>)}
              {isEditMode && contextMenuTarget === "blank" && activeLayerNodes.length > 1 && (<button onClick={() => runContextMenuAction(autoSpreadCanvasGraphics)}>
                  <ScanSearch size={14}/>
                  自动散开
                </button>)}
              {contextMenuForEdge && selectedEdge && (isEditMode ? (<button onClick={() => runContextMenuAction(tidySelectedEdgeRoute)}>
                  <Route size={14}/>
                  整理连接线
                </button>) : null)}
              {contextMenuForEdge && contextMenu.edgeId && (isEditMode ? (<button onClick={() => runContextMenuAction(addManualBendFromContextMenu)}>
                  <Pencil size={14}/>
                  添加拐点
                </button>) : null)}
              {contextMenuForRoutableLine && contextMenu.nodeId && contextMenu.canvasPoint && (isEditMode ? (<>
                  <button onClick={() => runContextMenuAction(() => tidyRoutableLineRoute(contextMenu.nodeId))}>
                    <Route size={14}/>
                    整理连接线
                  </button>
                  <button onClick={() => runContextMenuAction(addRoutableLineBendFromContextMenu)}>
                    <Pencil size={14}/>
                    添加拐点
                  </button>
                </>) : null)}
              {isEditMode && contextMenuTarget === "blank" && (<button onClick={() => runContextMenuAction(openConnectionRedrawDialog)}>
                  <Route size={14}/>
                  连接线重绘
                </button>)}
              {contextMenuForNode && canGroupSelectedGraphics && (isEditMode ? (<button onClick={() => runContextMenuAction(groupSelectedGraphics)}>
                  <Group size={14}/>
                  组合
                </button>) : null)}
              {contextMenuForNode && canUngroupSelectedGraphics && (isEditMode ? (<button onClick={() => runContextMenuAction(ungroupSelectedGraphics)}>
                  <Ungroup size={14}/>
                  解散
                </button>) : null)}
              {contextMenuForNode && canAddTemplateFromSelection && (isEditMode ? (<button onClick={() => runContextMenuAction(openAddTemplateDialog)}>
                  <Grid2X2 size={14}/>
                  添加到模板库
                </button>) : null)}
              {contextMenuForNode && canAddTemplateFromSelection && (isEditMode ? (<button onClick={() => runContextMenuAction(openGroupDeviceDefinitionDialog)}>
                  <Plus size={14}/>
                  定义为元件
                </button>) : null)}
              {isEditMode && contextMeasurementNode && !__appScope.isStaticGraphicNode(contextMeasurementNode) && (<div className={`context-menu-submenu${submenuHovered === "measurement" ? " submenu-hovered" : ""}`} onMouseEnter={() => handleSubmenuEnter("measurement")} onMouseLeave={handleSubmenuLeave}>
                  <button type="button" className="context-menu-submenu-trigger">
                    <CircleDot size={14}/>
                    量测显示
                    <ChevronRight size={14}/>
                  </button>
                  <div className="context-menu-submenu-panel">
                    <button disabled={Boolean(contextMeasurementGroup)} onClick={() => runContextMenuAction(() => addDefaultMeasurementsToNode(contextMeasurementNode))}>
                      <Plus size={14}/>
                      添加量测
                    </button>
                    <button disabled={!contextMeasurementGroup} onClick={() => runContextMenuAction(() => openMeasurementEditorForNode(contextMeasurementNode))}>
                      <Pencil size={14}/>
                      修改量测
                    </button>
                    <button disabled={!contextMeasurementGroup} onClick={() => runContextMenuAction(() => removeMeasurementsFromNode(contextMeasurementNode))}>
                      <Trash2 size={14}/>
                      删除量测
                    </button>
                  </div>
                </div>)}
              {contextMenuForNode && activeSelectedNodeIds.length > 0 && (isEditMode ? (<button onClick={() => runContextMenuAction(openLayerAssignmentDialog)}>
                  <Layers size={14}/>
                  图层修改
                </button>) : null)}
              {contextMenuForNode && activeSelectedNodeIds.length > 0 && (isEditMode ? (<div className={`context-menu-submenu${submenuHovered === "layer" ? " submenu-hovered" : ""}`} onMouseEnter={() => handleSubmenuEnter("layer")} onMouseLeave={handleSubmenuLeave}>
                  <button type="button" className="context-menu-submenu-trigger">
                    <Layers2 size={14}/>
                    显示层级
                    <ChevronRight size={14}/>
                  </button>
                  <div className="context-menu-submenu-panel">
                    <button onClick={() => runContextMenuAction(() => adjustSelectedDisplayLayer("raise"))}>
                      <ArrowUp size={14}/>
                      提升显示层级
                    </button>
                    <button onClick={() => runContextMenuAction(() => adjustSelectedDisplayLayer("lower"))}>
                      <ArrowDown size={14}/>
                      降低显示层级
                    </button>
                    <button onClick={() => runContextMenuAction(() => adjustSelectedDisplayLayer("front"))}>
                      <ChevronsUp size={14}/>
                      顶层显示
                    </button>
                    <button onClick={() => runContextMenuAction(() => adjustSelectedDisplayLayer("back"))}>
                      <ChevronsDown size={14}/>
                      底层显示
                    </button>
                  </div>
                </div>) : null)}
              {contextMenuForNode && activeSelectedNodeIds.length > 0 && (isEditMode ? (<div className={`context-menu-submenu${submenuHovered === "label" ? " submenu-hovered" : ""}`} onMouseEnter={() => handleSubmenuEnter("label")} onMouseLeave={handleSubmenuLeave}>
                  <button type="button" className="context-menu-submenu-trigger">
                    <Type size={14}/>
                    标识显示
                    <ChevronRight size={14}/>
                  </button>
                  <div className="context-menu-submenu-panel">
                    <button onClick={() => runContextMenuAction(() => setSelectedNodeLabelDisplayMode("always"))}>
                      <Type size={14}/>
                      标识始终显示
                    </button>
                    <button onClick={() => runContextMenuAction(() => setSelectedNodeLabelDisplayMode("hidden"))}>
                      <Type size={14}/>
                      标识始终隐藏
                    </button>
                    <button onClick={() => runContextMenuAction(() => setSelectedNodeLabelDisplayMode("follow"))}>
                      <Type size={14}/>
                      标识跟随显示
                    </button>
                  </div>
                </div>) : null)}
              {isEditMode && contextMenuForSelection && contextSelectionCount > 0 && (<button onClick={() => runContextMenuAction(deleteSelection)}>
                  <Trash2 size={14}/>
                  删除
                </button>)}
            </>)}
        </div>)}
      {projectMenu && (<div ref={contextMenuRef} className={contextMenuClassName(projectMenu)} style={contextMenuStyle(projectMenu)}>
          {projectMenu.projectId && (<>
              {isEditMode && (<button onClick={() => runContextMenuAction(() => {
                    const project = projectById.get(projectMenu.projectId ?? "");
                    if (project)
                        deleteProjectRecord(project);
                })}>
                <Trash2 size={14}/>
                模型删除
              </button>)}
              <button onClick={() => runContextMenuAction(() => {
                const project = projectById.get(projectMenu.projectId ?? "");
                if (project)
                    void exportProjectRecordFile(project);
            })}>
                <Download size={14}/>
                模型导出
              </button>
              {isEditMode && (<button onClick={() => runContextMenuAction(() => {
                    const project = projectById.get(projectMenu.projectId ?? "");
                    if (project)
                        renameProjectRecord(project);
                })}>
                <Pencil size={14}/>
                模型重命名
              </button>)}
              <button onClick={() => runContextMenuAction(() => {
                const project = projectById.get(projectMenu.projectId ?? "");
                if (project)
                    copyProjectRecord(project);
            })}>
                <Copy size={14}/>
                模型复制
              </button>
              {recordClipboard?.kind === "project" && projectMenu.projectId && (isEditMode ? (<button onClick={() => runContextMenuAction(() => pasteProjectClipboardRecord(projectMenu.schemeId ?? ""))}>
                  <FileInput size={14}/>
                  模型粘贴
                </button>) : null)}
            </>)}
          {!projectMenu.projectId && projectMenu.schemeId && (<>
              {isEditMode && (<button onClick={() => runContextMenuAction(() => createSchemeRecord(projectMenu.schemeId ?? ""))}>
                <FolderOpen size={14}/>
                方案新增
              </button>)}
              {isEditMode && (<button onClick={() => runContextMenuAction(() => {
                    const scheme = findSavedSchemeById(schemes, projectMenu.schemeId ?? "");
                    if (scheme)
                        deleteSchemeRecord(scheme);
                })}>
                <Trash2 size={14}/>
                方案删除
              </button>)}
              <button onClick={() => runContextMenuAction(() => {
                const scheme = findSavedSchemeById(schemes, projectMenu.schemeId ?? "");
                if (scheme)
                    void exportSchemeRecord(scheme);
            })}>
                <Download size={14}/>
                方案导出
              </button>
              {isEditMode && (<button onClick={() => runContextMenuAction(() => openSchemeImportFilePicker(projectMenu.schemeId ?? ""))}>
                <FileInput size={14}/>
                方案导入
              </button>)}
              {isEditMode && (<button onClick={() => runContextMenuAction(() => {
                    const scheme = findSavedSchemeById(schemes, projectMenu.schemeId ?? "");
                    if (scheme)
                        renameSchemeRecord(scheme);
                })}>
                <Pencil size={14}/>
                方案重命名
              </button>)}
              <button onClick={() => runContextMenuAction(() => {
                const scheme = findSavedSchemeById(schemes, projectMenu.schemeId ?? "");
                if (scheme)
                    copySchemeRecord(scheme);
            })}>
                <Copy size={14}/>
                方案复制
              </button>
              {recordClipboard?.kind === "scheme" && (isEditMode ? (<button onClick={() => runContextMenuAction(() => pasteSchemeClipboardRecord(projectMenu.schemeId ?? ""))}>
                  <FileInput size={14}/>
                  方案粘贴
                </button>) : null)}
              {isEditMode && <div className="context-menu-separator" role="separator" aria-label="方案操作和模型操作分隔"/>}
              {isEditMode && (<button onClick={() => runContextMenuAction(() => createBlankProject(projectMenu.schemeId ?? ""))}>
                <Plus size={14}/>
                模型新建
              </button>)}
              {isEditMode && (<button onClick={() => runContextMenuAction(() => openModelImportFilePicker(projectMenu.schemeId ?? ""))}>
                <FileInput size={14}/>
                模型导入
              </button>)}
              {isEditMode && (<button onClick={() => runContextMenuAction(() => __appScope.openSvgModelImportFilePicker(projectMenu.schemeId ?? ""))}>
                <FileInput size={14}/>
                从 SVG 生成模型
              </button>)}
              {recordClipboard?.kind === "project" && projectMenu.schemeId && (isEditMode ? (<button onClick={() => runContextMenuAction(() => pasteProjectClipboardRecord(projectMenu.schemeId ?? ""))}>
                  <FileInput size={14}/>
                  模型粘贴
                </button>) : null)}
            </>)}
          {!projectMenu.projectId && !projectMenu.schemeId && (<>
              {isEditMode && (<button onClick={() => runContextMenuAction(createSchemeRecord)}>
                <FolderOpen size={14}/>
                方案新增
              </button>)}
              {recordClipboard?.kind === "scheme" && (isEditMode ? (<button onClick={() => runContextMenuAction(pasteSchemeClipboardRecord)}>
                  <FileInput size={14}/>
                  方案粘贴
                </button>) : null)}
              {isEditMode && (<button onClick={() => runContextMenuAction(openSchemeImportFilePicker)}>
                <FileInput size={14}/>
                方案导入
              </button>)}
            </>)}
        </div>)}
      {templateMenu && (() => {
        if ("typeName" in templateMenu) {
          return (
            <div
              ref={contextMenuRef}
              className={contextMenuClassName(templateMenu)}
              style={contextMenuStyle(templateMenu)}
              onMouseEnter={() => keepTemplateContextMenuFlyoutOpen(templateMenu.typeName)}
              onMouseLeave={() => scheduleGraphTemplateFlyoutClose(templateMenu.typeName)}
            >
              {isEditMode && (<button onClick={() => runContextMenuAction(() => deleteGraphTemplateType(templateMenu.typeName))}>
                <Trash2 size={14}/>
                删除类型
              </button>)}
            </div>
          );
        }
        const template = customGraphTemplates.find((item: any) => item.id === templateMenu.templateId);
        return template ? (
          <div
            ref={contextMenuRef}
            className={contextMenuClassName(templateMenu)}
            style={contextMenuStyle(templateMenu)}
            onMouseEnter={() => keepTemplateContextMenuFlyoutOpen(template.typeName)}
            onMouseLeave={() => scheduleGraphTemplateFlyoutClose(template.typeName)}
          >
            {isEditMode && (<button onClick={() => runContextMenuAction(() => deleteGraphTemplate(template))}>
              <Trash2 size={14}/>
              删除
            </button>)}
          </div>
        ) : null;
      })()}
  </>);
});
