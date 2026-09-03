// @ts-nocheck
import { memo } from "react";
import { areViewSectionPropsEqual } from "./appViewRenderBoundary";

export const AppDeviceDefinitionDialogs = memo(function AppDeviceDefinitionDialogs({ scope }) {
  const __appScope = scope;
  const {
    ArrowDown, ArrowUp, BufferedTextInput, CONTAINER_TERMINAL_ASSOCIATION_OPTIONS, ChevronDown, ChevronRight, CustomComponentManagerTree, Download,
    EFileEditor, Eye, FileInput, FolderOpen, Fragment, Grid2X2, MAX_CUSTOM_DEVICE_TERMINALS, PARAM_VALUE_TYPE_OPTIONS,
    RotateCcw, Save, Search, TERMINAL_TYPE_OPTIONS, WindowCloseButton, X, addCustomDeviceStateDraftRow, addCustomParameterRow,
    addDefinitionDraftRow, categoryLibraryComponentLibraryKey, closeDeviceDefinitionDialog, collapsedCustomComponentTreeLibraries, collapsedCustomComponentTreeTypes, collapsedDefinitionComponentLibraries, collapsedEDeviceInterfaceTreeNodes, componentLibraryDisplayParts,
    confirmCustomLibraryCreateDialog, copiedCustomComponentTemplate, copyCustomComponentTemplate, copySelectedCustomParameterRows, copySelectedDefinitionParameterRows, createBlankProject, createCustomCategoryLibrary, createCustomComponentLibrary,
    createMeasurementFieldParameterDefinition, createModelDialog, customComponentLibraries, customComponentTreeSearchQuery, customComponentTreeSelection, customDeviceClassDisplay, customDeviceDefinitionIconOnly, customDeviceDefinitionMode, deviceDefinitionRowId,
    customDeviceDialogOpen, customDeviceDialogRef, customDeviceDraft, customDeviceHasUnsavedChanges, customDeviceIconDirty, customDeviceMeasurementTarget, customDeviceMeasurementsDirty, customDeviceParametersDirty,
    customDevicePreviewSourceTemplate, customDeviceSaveMessage, customDeviceSaveToast, customDeviceStatePageId, customDeviceTerminalAnchors, customDeviceUnsavedPrompt, customLibraryCreateDialog, customLibraryCreateDialogBaseComponentLibraryOptions,
    customLibraryCreateDialogCategoryLibraryName, customLibraryCreateDialogClassOptions, customLibraryCreateDialogSelectedClassName, defaultContainerAssociationForTerminalType, definitionDraftError, definitionDraftRows, definitionDraftRowsForDisplay, definitionDraftSection,
    deleteAllDefinitionParameterRows, deleteCustomDeviceStateDraftRow, deleteSelectedCustomDeviceTreeItem, deleteSelectedCustomParameterRows, deleteSelectedDefinitionParameterRows, deviceDefinitionDialogOpen, deviceDefinitionDialogRef, deviceDefinitionKeyForTemplate,
    deviceDefinitionSearchNeedle, deviceDefinitionSearchQuery, deviceDefinitionView, deviceLibraryDialogLayouts, deviceLibraryDialogStyle, discardEDeviceInterfaceClassAndSwitch, discardEDeviceInterfaceDefinitionChanges, displayedCustomComponentTreeLibraries,
    displayedDeviceDefinitionLibraries, displayedMergedCustomDefaultParams, displayedVisibleCustomParams, eDeviceDefinitionClassExportEnabled, eDeviceDefinitionInterfaceDialogOpen, eDeviceDefinitionLabels, eDeviceDefinitionTableIds, eDeviceDefinitionTemplateFields,
    convertEDeviceInterfaceTemplateToCustom, eDeviceInterfaceClassSwitchTarget, eDeviceInterfaceClassSwitchTargetRow, eDeviceInterfaceDefinitionRows, eDeviceInterfaceDefinitionTree, eDeviceInterfaceExitPromptOpen, eDeviceInterfaceGroupInfo, eDeviceInterfaceHasUnsavedChanges, eDeviceInterfaceLoadedTemplateName,
    eDeviceInterfaceReadonlyMode, eDeviceInterfaceSaveAndSwitchRef, eDeviceInterfaceSaveMessage, eDeviceInterfaceSelectedGroupKey, eDeviceTemplateDropdownOpen, eFileEditorDialogOpen, eFileEditorExportOptions, eFileEditorFieldCnNames,
    eFileEditorRecords, editingCustomDeviceKind, expandedDefinitionGroups, expandedImportResultSections, exportCustomComponentTemplateSvg, filteredCustomComponentTreeByComponentLibrary, filteredDeviceDefinitionByComponentLibrary, formatCustomDeviceTerminalAnchorValue,
    getContainerTerminalAssociationSourceIndex, handleTreeCollapseChange, importResultActiveTab, isContainerTerminalAssociationDependent, libraryTemplates, loadDefinitionTemplateDraft, loadPredefinedEDeviceTemplate, measurementConfig, measurementConfigDraft, moveSelectedCustomParameterRows,
    moveSelectedDefinitionParameterRows, moveSelectedEDeviceInterfaceField, normalizeCategoryLibraryName, normalizeComponentLibraryName, normalizeContainerTerminalAssociations, normalizeDefinitionRowEnumFields, openCustomComponentSvgImport, parameterValueTypeLabelForDefinitionRow,
    pasteCustomComponentTemplate, renderDeviceDefinitionMeasurementPanel, renderDeviceDefinitionVisualPanel, renderEnumValuesEditor, renderStateVisualPager, renderTypicalValueEditor, requestCloseCustomDeviceDialog, requestCloseEDeviceInterfaceDefinition,
    requestCustomDeviceDialogView, requestExportEDeviceInterfaceDefinitionFile, requestSaveEDeviceInterfaceDefinition, requestSelectCustomCategoryLibrary, requestSelectCustomComponentLibrary, requestSelectCustomComponentTemplate, requestSelectEDeviceInterfaceComponentLibrary, resetDeviceDefinitionDraft,
    resolveComponentLibraryClassMetadata, resolveCustomDeviceUnsavedPrompt, restoreEDeviceInterfaceOriginalDefinition, revertCustomDeviceDraftAll, revertCustomDeviceDraftCurrentTab, runAfterEDeviceInterfaceInputCommit, saveCustomDeviceDefinitionDialog, saveDeviceDefinitionDraft,
    selectCustomParameterRow, selectDefinitionParameterRow, selectedCustomEditableParameterCount, selectedCustomParameterRowIdSet, selectedCustomParameterRowIds, selectedDefinitionBaseTemplate, selectedDefinitionDerivedBaseTemplate, selectedDefinitionDerivedInfo,
    selectedDefinitionEditableParameterCount, selectedDefinitionParameterRowIdSet, selectedDefinitionParameterRowIds, selectedDefinitionTemplate, selectedDefinitionTerminalAssociations, selectedEDeviceInterfaceFields, selectedEDeviceInterfaceRow, setCollapsedDefinitionComponentLibraries,
    setCreateModelDialog, setCustomComponentTreeSearchQuery, setCustomComponentTreeSelection, setCustomDeviceDraft, setCustomDeviceStatePageId, setCustomLibraryCreateDialog, setDefinitionDraftRows, setDeviceDefinitionSearchQuery, setDeviceDefinitionView,
    setEDeviceDefinitionClassExportEnabled, setEDeviceDefinitionInterfaceDialogOpen, setEDeviceDefinitionLabels, setEDeviceInterfaceClassSwitchTarget, setEDeviceInterfaceExitPromptOpen, setEDeviceInterfaceLoadedTemplateName, setEDeviceInterfaceReadonlyMode, setEDeviceInterfaceSelectedGroupKey,
    setEDeviceTemplateDropdownOpen, setEFileEditorDialogOpen, setExpandedDefinitionGroups, setImportResultActiveTab, setShowImportResultDialog, setTemplateImportResult, showComponentLibraryTerminalTypes, showCustomDeviceInheritanceNote,
    showImportResultDialog, startCustomComponentCreate, startDeviceLibraryDialogDrag, startDeviceLibraryDialogResize, stopDeviceLibraryDialogEvent, templateImportResult, templateResizeTransformValue, toggleDefinitionComponentLibrary,
    toggleDefinitionGroup, toggleEDeviceInterfaceTreeNode, toggleImportResultSection, updateCustomDefaultParamRow, updateCustomDeviceStateDraftRow, updateCustomDeviceTerminalAnchor, updateDefinitionComponentLibraryCommonParamExport, updateDefinitionDraftRow,
    visibleCustomDeviceDialogView
  } = scope;
  return (<>
{deviceDefinitionDialogOpen && (<div className="image-picker-backdrop" onPointerDown={closeDeviceDefinitionDialog}>
          <section ref={deviceDefinitionDialogRef} className={`device-definition-dialog window-close-host${deviceLibraryDialogLayouts.definition ? " floating" : ""}`} style={deviceLibraryDialogStyle("definition")} onPointerDown={stopDeviceLibraryDialogEvent} onPointerUp={stopDeviceLibraryDialogEvent} onPointerCancel={stopDeviceLibraryDialogEvent} onLostPointerCapture={stopDeviceLibraryDialogEvent} onClick={(event) => event.stopPropagation()}>
            <WindowCloseButton label="关闭元件定义窗口" onClick={closeDeviceDefinitionDialog} />
            <div className="image-picker-title">
              <div className="device-library-dialog-title" onPointerDown={(event) => startDeviceLibraryDialogDrag("definition", event)}>
                <h2>修改元件</h2>
                <p>查看内置和自定义元件定义，维护新建图元时使用的设备属性。</p>
              </div>
            </div>
            <div className="device-definition-layout">
              <aside className="device-definition-list" aria-label="元件定义列表">
                <div className="dialog-tree-search">
                  <Search size={14} aria-hidden="true"/>
                  <input value={deviceDefinitionSearchQuery} onChange={(event) => setDeviceDefinitionSearchQuery(event.target.value)} placeholder="搜索类别库/类/元件" aria-label="搜索元件定义"/>
                  {deviceDefinitionSearchQuery && (<button type="button" aria-label="清空元件定义搜索" title="清空" onClick={() => setDeviceDefinitionSearchQuery("")}>
                      <X size={13}/>
                    </button>)}
                </div>
                {(() => {
                  // 切换折叠层全部展开/全部收缩
                  const total = displayedDeviceDefinitionLibraries.length;
                  if (total === 0) return null;
                  const allExpanded = expandedDefinitionGroups.length >= total;
                  return (<button type="button" className="device-definition-toggle-all" aria-label={allExpanded ? "全部收缩" : "全部展开"} title={allExpanded ? "全部收缩" : "全部展开"} onClick={() => {
                    if (allExpanded) {
                      setExpandedDefinitionGroups([]);
                    } else {
                      setExpandedDefinitionGroups([...displayedDeviceDefinitionLibraries]);
                      setCollapsedDefinitionComponentLibraries([]);
                    }
                  }}>
                    {allExpanded ? "全部收缩" : "全部展开"}
                    {allExpanded ? <ChevronDown size={13}/> : <ChevronRight size={13}/>}
                  </button>);
                })()}
                <div className="device-definition-tree-scroll dialog-compact-tree" role="tree">
                  {displayedDeviceDefinitionLibraries.length > 0 ? displayedDeviceDefinitionLibraries.map((group) => {
            const typeGroups = filteredDeviceDefinitionByComponentLibrary[group] ?? [];
            const expanded = deviceDefinitionSearchNeedle ? true : expandedDefinitionGroups.includes(group);
            return (<section className="device-definition-group" key={group}>
                        <button type="button" className="device-definition-group-toggle" role="treeitem" aria-expanded={expanded} onClick={() => toggleDefinitionGroup(group)}>
                          {expanded ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}
                          <span>{group}</span>
                          <strong>{typeGroups.reduce((sum, typeGroup) => sum + typeGroup.templates.length, 0)}</strong>
                        </button>
                        {expanded && (<div className="component-definition-type-list" role="group" aria-label={`${group}类列表`}>
                            {typeGroups.map((typeGroup) => {
                        const typeKey = categoryLibraryComponentLibraryKey(group, typeGroup.section);
                        const typeCollapsed = deviceDefinitionSearchNeedle ? false : collapsedDefinitionComponentLibraries.includes(typeKey);
                        const typeDisplay = componentLibraryDisplayParts(typeGroup.section, customComponentLibraries);
                        return (<section className="component-definition-type-group" key={`${group}-${typeGroup.section}`}>
                                  <button type="button" className={`component-definition-type-header ${typeCollapsed ? "" : "active"}`} role="treeitem" aria-expanded={!typeCollapsed} onClick={() => toggleDefinitionComponentLibrary(group, typeGroup.section)}>
                                    {typeCollapsed ? <ChevronRight size={13}/> : <ChevronDown size={13}/>}
                                    <span className="dialog-tree-bilingual" title={typeDisplay.title}>
                                      <span>{typeDisplay.chinese}</span>
                                      <small>{typeDisplay.english}</small>
                                    </span>
                                    <strong>{typeGroup.templates.length}</strong>
                                  </button>
                                  {!typeCollapsed && <div className="device-definition-items" role="group" aria-label={`${group}/${typeGroup.section}元件列表`}>
                                    {typeGroup.templates.map((template) => (<button type="button" key={template.kind} className={`device-definition-item ${selectedDefinitionTemplate?.kind === template.kind ? "active" : ""}`} role="treeitem" aria-selected={selectedDefinitionTemplate?.kind === template.kind} onClick={() => loadDefinitionTemplateDraft(template)}>
                                        <span className="dialog-tree-bilingual dialog-tree-component-label" title={`${template.label} / ${template.kind}`}>
                                          <span>{template.label}</span>
                                          <small>{template.kind}</small>
                                        </span>
                                      </button>))}
                                  </div>}
                                </section>);
                    })}
                          </div>)}
                      </section>);
        }) : (<div className="dialog-tree-empty">未找到匹配元件</div>)}
                </div>
              </aside>
              <section className="device-definition-detail">
                {selectedDefinitionTemplate ? (<>
                    <div className="device-definition-summary">
                      <div>
                        <span>类别库</span>
                        <strong>{normalizeCategoryLibraryName(selectedDefinitionTemplate.categoryLibrary)}</strong>
                      </div>
                      <div>
                        <span>类</span>
                        <strong title="所属类在创建后不可修改">{definitionDraftSection}</strong>
                      </div>
                      <div>
                        <span>元件名称</span>
                        <strong>{selectedDefinitionTemplate.label}</strong>
                      </div>
                      <div>
                        <span>图元类型</span>
                        <strong>{selectedDefinitionTemplate.kind}</strong>
                      </div>
                      <div>
                        <span>来源</span>
                        <strong>{selectedDefinitionTemplate.custom ? "自定义" : "内置"}</strong>
                      </div>
                      {selectedDefinitionDerivedInfo && (<div>
                          <span>派生主类</span>
                          {selectedDefinitionDerivedBaseTemplate ? (<button type="button" className="device-definition-summary-value derived-base-link" title={`跳转到主类 ${selectedDefinitionDerivedBaseTemplate.label ?? ""}`} onClick={() => loadDefinitionTemplateDraft(selectedDefinitionDerivedBaseTemplate)}>
                              {selectedDefinitionDerivedInfo.baseComponentLibrary}
                            </button>) : (<strong>{selectedDefinitionDerivedInfo.baseComponentLibrary}</strong>)}
                        </div>)}
                      <div>
                        <span>端子数量</span>
                        <strong>{selectedDefinitionTemplate.terminalCount}</strong>
                      </div>
                      <div>
                        <span>是否容器</span>
                        <strong>{selectedDefinitionTemplate.isContainer ? "是" : "否"}</strong>
                      </div>
                      <div>
                        <span>是否允许变形</span>
                        <strong>{templateResizeTransformValue(selectedDefinitionTemplate) === "1" ? "是" : "否"}</strong>
                      </div>
                      <div>
                        <span>能源属性</span>
                        <strong>
                          {(selectedDefinitionTemplate.terminalTypes ?? Array.from({ length: selectedDefinitionTemplate.terminalCount }, () => selectedDefinitionTemplate.terminalType))
                .map((type) => TERMINAL_TYPE_OPTIONS.find((option) => option.value === type)?.label ?? type)
                .join(" / ") || "无端子"}
                        </strong>
                      </div>
                    </div>
                    <div className="device-definition-tabs" role="tablist" aria-label="元件修改内容切换">
                      <button type="button" className={deviceDefinitionView === "visual" ? "active" : ""} onClick={() => setDeviceDefinitionView("visual")}>
                        端子定义
                      </button>
                      <button type="button" className={deviceDefinitionView === "parameters" ? "active" : ""} onClick={() => setDeviceDefinitionView("parameters")}>
                        参数定义
                      </button>
                      <button type="button" className={deviceDefinitionView === "measurements" ? "active" : ""} onClick={() => setDeviceDefinitionView("measurements")}>
                        量测定义
                      </button>
                    </div>
                    {deviceDefinitionView === "visual" ? (renderDeviceDefinitionVisualPanel(selectedDefinitionTemplate)) : deviceDefinitionView === "parameters" ? (<>
                        {selectedDefinitionTemplate.isContainer && selectedDefinitionTerminalAssociations.length > 0 && (<section className="device-definition-associations">
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
                                  {selectedDefinitionTerminalAssociations.map((association) => (<tr key={`${selectedDefinitionTemplate.kind}-terminal-${association.terminalIndex}`}>
                                      <td>{association.terminalLabel}</td>
                                      <td>{TERMINAL_TYPE_OPTIONS.find((option) => option.value === association.terminalType)?.label ?? association.terminalType}</td>
                                      <td>{association.deviceModel ? `${association.roleLabel} / ${association.deviceModel}` : association.roleLabel}</td>
                                      <td><code>{association.relationKey || "-"}</code></td>
                                      <td>
                                        {association.dependent
                            ? `随端子${association.sourceTerminalIndex + 1}分配到同一个关联设备`
                            : association.relationName}
                                      </td>
                                    </tr>))}
                                </tbody>
                              </table>
                            </div>
                          </section>)}
                        {definitionDraftError && <p className="custom-device-error">{definitionDraftError}</p>}
                        <div className="definition-table-toolbar" aria-label="参数定义表格操作">
                          <button type="button" onClick={addDefinitionDraftRow}>新增参数</button>
                          <button
                            type="button"
                            onClick={copySelectedDefinitionParameterRows}
                            disabled={selectedDefinitionParameterRowIds.length === 0}
                          >
                            复制
                          </button>
                          <button
                            type="button"
                            onClick={() => moveSelectedDefinitionParameterRows(-1)}
                            disabled={selectedDefinitionEditableParameterCount === 0}
                          >
                            上移
                          </button>
                          <button
                            type="button"
                            onClick={() => moveSelectedDefinitionParameterRows(1)}
                            disabled={selectedDefinitionEditableParameterCount === 0}
                          >
                            下移
                          </button>
                          <button
                            type="button"
                            onClick={deleteSelectedDefinitionParameterRows}
                            disabled={selectedDefinitionEditableParameterCount === 0}
                          >
                            删除
                          </button>
                          <button
                            type="button"
                            onClick={deleteAllDefinitionParameterRows}
                            disabled={!selectedDefinitionTemplate || selectedDefinitionTemplate.custom || definitionDraftRows.length === 0}
                          >
                            删除全部参数
                          </button>
                          <span>{selectedDefinitionParameterRowIds.length > 0 ? `已选 ${selectedDefinitionParameterRowIds.length} 行` : "点击行选择，Ctrl/Shift 可多选"}</span>
                        </div>
                        <div className="custom-param-table-wrap device-definition-table-wrap">
                          <table className="custom-param-table">
                            <thead>
                              <tr>
                                <th className="definition-table-sequence">序号</th>
                                <th>中文名称</th>
                                <th>英文名称</th>
                                 <th>取值类型</th>
                                 <th>默认值</th>
                                 <th>枚举项</th>
                              </tr>
                            </thead>
                            <tbody>
                              {definitionDraftRowsForDisplay.map((row, rowIndex) => (<tr
                                  key={row.id}
                                  className={`definition-table-row${selectedDefinitionParameterRowIdSet.has(row.id) ? " selected" : ""}${row.readonly ? " readonly-row" : ""}`}
                                  aria-selected={selectedDefinitionParameterRowIdSet.has(row.id)}
                                  onClick={(event) => selectDefinitionParameterRow(row.id, event)}
                                >
                                  <td className="definition-table-sequence">{rowIndex + 1}</td>
                                  <td>
                                    <BufferedTextInput value={row.cnName} disabled={row.readonly} onCommit={(value) => updateDefinitionDraftRow(row.id, { cnName: value })}/>
                                  </td>
                                  <td>
                                    <BufferedTextInput value={row.enName} disabled={row.readonly} onCommit={(value) => updateDefinitionDraftRow(row.id, { enName: value })}/>
                                  </td>
                                  <td>
                                    <select value={row.valueType} disabled={row.readonly} onChange={(event) => {
                        const nextRow = normalizeDefinitionRowEnumFields({
                            ...row,
                            valueType: event.target.value as DeviceParameterValueType
                        });
                        updateDefinitionDraftRow(row.id, {
                            valueType: nextRow.valueType,
                            typicalValue: nextRow.typicalValue,
                            enumOptions: nextRow.enumOptions,
                            enumValues: nextRow.enumValues
                        });
                    }}>
                                      {PARAM_VALUE_TYPE_OPTIONS.map((option) => (<option key={option.value} value={option.value}>
                                          {option.label}
                                        </option>))}
                                    </select>
                                  </td>
                                  <td>
                                    {renderTypicalValueEditor(row, updateDefinitionDraftRow, row.readonly, definitionDraftSection)}
                                  </td>
                                  <td>
                                    {renderEnumValuesEditor(row, updateDefinitionDraftRow, row.readonly)}
                                  </td>
                                </tr>))}
                            </tbody>
                          </table>
                        </div>
                        <div className="custom-device-actions">
                          <button type="button" onClick={saveDeviceDefinitionDraft}>保存定义</button>
                          <button type="button" onClick={resetDeviceDefinitionDraft} disabled={!selectedDefinitionBaseTemplate}>
                            恢复默认
                          </button>
                        </div>
                      </>) : (renderDeviceDefinitionMeasurementPanel({
                deviceKind: normalizeComponentLibraryName(definitionDraftSection) || deviceDefinitionKeyForTemplate(selectedDefinitionTemplate),
                label: selectedDefinitionTemplate.label,
                terminalCount: selectedDefinitionTemplate.terminalCount,
                terminalLabels: selectedDefinitionTemplate.terminalLabels,
                parameterDefinitions: definitionDraftRows,
                positionDefinitions: __appScope.selectedDefinitionMeasurementPositionDefinitions,
                items: Array.isArray(__appScope.definitionMeasurementDraft)
                  ? __appScope.definitionMeasurementDraft
                  : [],
                setItems: __appScope.setDefinitionMeasurementDraft,
                selectedRowIndexes: __appScope.selectedDefinitionMeasurementRowIndexes,
                setSelectedRowIndexes: __appScope.setSelectedDefinitionMeasurementRowIndexes,
                selectionAnchorIndex: __appScope.definitionMeasurementSelectionAnchorRef.current,
                setSelectionAnchorIndex: (index) => {
                  __appScope.definitionMeasurementSelectionAnchorRef.current = index;
                },
                ensureAssociatedField: (position, associatedField, measurementTypeId) => {
                  if (position !== "device") return;
                  const measurementType = (measurementConfigDraft ?? measurementConfig).measurementTypes
                    .find((type) => type.id === measurementTypeId);
                  const definition = createMeasurementFieldParameterDefinition(associatedField, {
                    cnName: measurementType?.name,
                    valueType: measurementType?.valueType === "string" || measurementType?.valueType === "boolean" ? "string" : "float"
                  });
                  if (!definition) return;
                  setDefinitionDraftRows((current) => current.some((row) => row.enName.trim().toLowerCase() === definition.enName.toLowerCase())
                    ? current
                    : [...current, { ...definition, id: deviceDefinitionRowId() }]);
                }
            }))}
                  </>) : (<div className="empty-state compact">
                    <Grid2X2 size={24}/>
                    <p>当前类别库暂无元件。</p>
                  </div>)}
              </section>
            </div>
            <div className="device-library-dialog-resize" role="separator" aria-orientation="horizontal" aria-label="调整修改元件窗口大小" title="拖拽调整窗口大小" onPointerDown={(event) => startDeviceLibraryDialogResize("definition", event)}/>
          </section>
        </div>)}
      {createModelDialog && (<div
          className="custom-library-create-backdrop"
          onPointerDown={() => {
            if (!createModelDialog.saving) setCreateModelDialog(null);
          }}
        >
          <form
            className="custom-library-create-dialog model-create-dialog window-close-host"
            aria-label="新建模型"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => event.stopPropagation()}
            onSubmit={(event) => {
              event.preventDefault();
              void createBlankProject(createModelDialog.schemeId, {
                name: createModelDialog.name,
                modelType: createModelDialog.modelType
              });
            }}
          >
            <WindowCloseButton
              label="关闭新建模型窗口"
              disabled={createModelDialog.saving}
              onClick={() => setCreateModelDialog(null)}
            />
            <div className="custom-library-create-title">
              <h3>新建模型</h3>
            </div>
            {createModelDialog.error && <p className="custom-library-create-error">{createModelDialog.error}</p>}
            <div className="custom-library-create-fields">
              <label>
                <span>模型名称</span>
                <input
                  autoFocus
                  aria-label="模型名称"
                  disabled={createModelDialog.saving}
                  value={createModelDialog.name}
                  onChange={(event) => setCreateModelDialog((current) => current ? {
                    ...current,
                    name: event.target.value,
                    error: ""
                  } : current)}
                />
              </label>
              <label>
                <span>模型类型</span>
                <select
                  aria-label="模型类型"
                  disabled={createModelDialog.saving}
                  value={createModelDialog.modelType}
                  onChange={(event) => setCreateModelDialog((current) => current ? {
                    ...current,
                    modelType: event.target.value,
                    error: ""
                  } : current)}
                >
                  {__appScope.MODEL_TYPES.map((modelType) => (<option key={modelType} value={modelType}>{modelType}</option>))}
                </select>
              </label>
              <p className="model-create-index-note">模型序号 idx 将在确认后由后台全局自动分配，并永久保持不变。</p>
            </div>
            <div className="custom-library-create-actions">
              <button type="button" disabled={createModelDialog.saving} onClick={() => setCreateModelDialog(null)}>取消</button>
              <button type="submit" className="primary" disabled={createModelDialog.saving || !createModelDialog.name.trim()}>
                {createModelDialog.saving ? "正在创建..." : "确认"}
              </button>
            </div>
          </form>
        </div>)}
      {customLibraryCreateDialog && (<div className="custom-library-create-backdrop" onPointerDown={() => setCustomLibraryCreateDialog(null)}>
          <form
            className={`custom-library-create-dialog custom-library-create-dialog-${customLibraryCreateDialog.kind} window-close-host`}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => event.stopPropagation()}
            onSubmit={(event) => {
              event.preventDefault();
              confirmCustomLibraryCreateDialog(customLibraryCreateDialog);
            }}
          >
            <WindowCloseButton label={`关闭${customLibraryCreateDialog.title}`} onClick={() => setCustomLibraryCreateDialog(null)} />
            <div className="custom-library-create-title">
              <h3>{customLibraryCreateDialog.title}</h3>
            </div>
            {customLibraryCreateDialog.error && <p className="custom-library-create-error">{customLibraryCreateDialog.error}</p>}
            <div className="custom-library-create-fields">
              <label>
                <span>{customLibraryCreateDialog.kind === "categoryLibrary" ? "类别中文名称" : customLibraryCreateDialog.kind === "componentLibrary" ? "类中文名称" : "元件中文名称"}</span>
                <input
                  autoFocus
                  value={customLibraryCreateDialog.cnName}
                  onChange={(event) => setCustomLibraryCreateDialog((current) => current ? { ...current, cnName: event.target.value, error: "" } : current)}
                />
              </label>
              <label>
                <span>{customLibraryCreateDialog.kind === "categoryLibrary"
                  ? "类别英文名称"
                  : customLibraryCreateDialog.kind === "componentLibrary" && customLibraryCreateDialog.isDerivedComponentLibrary
                    ? "派生类英文名称"
                    : customLibraryCreateDialog.kind === "componentLibrary" ? "类英文名称" : "元件英文名称"}</span>
                <input
                  value={customLibraryCreateDialog.enName}
                  onChange={(event) => setCustomLibraryCreateDialog((current) => current ? { ...current, enName: event.target.value, error: "" } : current)}
                />
              </label>
              {customLibraryCreateDialog.kind === "componentLibrary" && (<>
                <label>
                  <span>是否派生类</span>
                  <select disabled={Boolean(customLibraryCreateDialog.classCreationMode)} value={customLibraryCreateDialog.isDerivedComponentLibrary ? "1" : "0"} onChange={(event) => {
                    const enabled = event.target.value === "1";
                    const fallbackBase = customLibraryCreateDialogBaseComponentLibraryOptions[0] ?? "";
                    setCustomLibraryCreateDialog((current) => current ? {
                      ...current,
                      isDerivedComponentLibrary: enabled,
                      derivedFromComponentLibrary: enabled
                        ? normalizeComponentLibraryName(current.derivedFromComponentLibrary || fallbackBase)
                        : "",
                      error: ""
                    } : current);
                  }}>
                    <option value="0">否</option>
                    <option value="1">是</option>
                  </select>
                </label>
                {customLibraryCreateDialog.isDerivedComponentLibrary && (<label className="custom-library-create-base-class-field">
                  <span>派生基类</span>
                  <select disabled={Boolean(customLibraryCreateDialog.classCreationMode)} value={customLibraryCreateDialog.derivedFromComponentLibrary ?? ""} onChange={(event) => setCustomLibraryCreateDialog((current) => current ? {
                    ...current,
                    derivedFromComponentLibrary: event.target.value,
                    error: ""
                  } : current)} aria-label="派生基类选择">
                    <option value="">请选择基类</option>
                    {customLibraryCreateDialogBaseComponentLibraryOptions.map((section) => (<option key={section} value={section}>
                      {componentLibraryDisplayParts(section, customComponentLibraries).title}
                    </option>))}
                  </select>
                </label>)}
                {!customLibraryCreateDialog.isDerivedComponentLibrary && (<>
                  <label>
                    <span>是否容器</span>
                    <select value={customLibraryCreateDialog.isContainer ? "1" : "0"} onChange={(event) => setCustomLibraryCreateDialog((current) => current ? {
                      ...current,
                      isContainer: event.target.value === "1",
                      error: ""
                    } : current)}>
                      <option value="0">否</option>
                      <option value="1">是</option>
                    </select>
                  </label>
                  <label>
                    <span>端子数量</span>
                    <input type="number" min="0" max={MAX_CUSTOM_DEVICE_TERMINALS} step="1" value={customLibraryCreateDialog.terminalCount ?? 0} onChange={(event) => setCustomLibraryCreateDialog((current) => current ? {
                      ...current,
                      terminalCount: Math.max(0, Math.min(MAX_CUSTOM_DEVICE_TERMINALS, Math.round(Number(event.target.value) || 0))),
                      error: ""
                    } : current)} />
                  </label>
                  <div className="custom-library-create-terminal-fields">
                  {Array.from({ length: Math.max(0, Number(customLibraryCreateDialog.terminalCount) || 0) }).map((_, index) => {
                    const terminalType = customLibraryCreateDialog.terminalTypes?.[index] ?? "ac";
                    return (<div className="custom-library-create-terminal-row" key={index}>
                      <strong>{`端子 ${index + 1}`}</strong>
                      <label>
                        <span>能源属性</span>
                        <select value={terminalType} onChange={(event) => setCustomLibraryCreateDialog((current) => {
                          if (!current) return current;
                          const terminalTypes = [...(current.terminalTypes ?? [])];
                          const terminalAssociations = [...(current.terminalAssociations ?? [])];
                          terminalTypes[index] = event.target.value;
                          terminalAssociations[index] = defaultContainerAssociationForTerminalType(event.target.value);
                          return { ...current, terminalTypes, terminalAssociations, error: "" };
                        })}>
                          {TERMINAL_TYPE_OPTIONS.map((option) => (<option key={option.value} value={option.value}>{option.label}</option>))}
                        </select>
                      </label>
                      <label>
                        <span>端子名称</span>
                        <input value={customLibraryCreateDialog.terminalLabels?.[index] ?? ""} onChange={(event) => setCustomLibraryCreateDialog((current) => {
                          if (!current) return current;
                          const terminalLabels = [...(current.terminalLabels ?? [])];
                          terminalLabels[index] = event.target.value;
                          return { ...current, terminalLabels, error: "" };
                        })} />
                      </label>
                      {customLibraryCreateDialog.isContainer && (<label>
                        <span>关联设备</span>
                        <select value={customLibraryCreateDialog.terminalAssociations?.[index] ?? defaultContainerAssociationForTerminalType(terminalType)} onChange={(event) => setCustomLibraryCreateDialog((current) => {
                          if (!current) return current;
                          const terminalAssociations = [...(current.terminalAssociations ?? [])];
                          terminalAssociations[index] = event.target.value;
                          return { ...current, terminalAssociations, error: "" };
                        })}>
                          {CONTAINER_TERMINAL_ASSOCIATION_OPTIONS[terminalType].map((option) => (<option key={option.value} value={option.value}>{option.label}</option>))}
                        </select>
                      </label>)}
                    </div>);
                  })}
                  </div>
                </>)}
              </>)}
              {customLibraryCreateDialog.kind === "component" && (<>
                <label className="custom-library-create-class-field">
                  <span>所属类</span>
                  <select disabled={customLibraryCreateDialog.componentClassLocked} value={customLibraryCreateDialogSelectedClassName} onChange={(event) => {
                    const metadata = resolveComponentLibraryClassMetadata(
                      event.target.value,
                      customLibraryCreateDialogCategoryLibraryName,
                      customComponentLibraries,
                      libraryTemplates
                    );
                    if (!metadata) return;
                    setCustomLibraryCreateDialog((current) => current ? {
                      ...current,
                      componentClassName: metadata.className,
                      componentLibrary: metadata.baseComponentLibrary,
                      isDerivedComponentLibrary: metadata.isDerivedComponentLibrary,
                      derivedFromComponentLibrary: metadata.isDerivedComponentLibrary ? metadata.baseComponentLibrary : "",
                      derivedComponentLibrary: metadata.isDerivedComponentLibrary ? metadata.className : "",
                      derivedComponentLibraryLabel: metadata.isDerivedComponentLibrary ? metadata.label : "",
                      error: ""
                    } : current);
                  }}>
                    {customLibraryCreateDialogClassOptions.map((option) => (<option key={option.className} value={option.className}>{option.label}</option>))}
                  </select>
                </label>
                <label>
                  <span>是否允许变形</span>
                  <select value={customLibraryCreateDialog.allowResizeTransform ?? "0"} onChange={(event) => setCustomLibraryCreateDialog((current) => current ? {
                    ...current,
                    allowResizeTransform: event.target.value,
                    error: ""
                  } : current)}>
                    <option value="0">否</option>
                    <option value="1">是</option>
                  </select>
                </label>
              </>)}
            </div>
            <div className="custom-library-create-actions">
              <button type="button" onClick={() => setCustomLibraryCreateDialog(null)}>取消</button>
              <button type="submit" className="primary">确定</button>
            </div>
          </form>
        </div>)}
      {customDeviceDialogOpen && (<div className="image-picker-backdrop" onPointerDown={requestCloseCustomDeviceDialog}>
          <section ref={customDeviceDialogRef} className={`custom-device-dialog window-close-host${deviceLibraryDialogLayouts.custom ? " floating" : ""}`} style={deviceLibraryDialogStyle("custom")} onPointerDown={stopDeviceLibraryDialogEvent} onPointerUp={stopDeviceLibraryDialogEvent} onPointerCancel={stopDeviceLibraryDialogEvent} onLostPointerCapture={stopDeviceLibraryDialogEvent} onClick={(event) => event.stopPropagation()}>
            <WindowCloseButton label="关闭元件定义编辑窗口" onClick={requestCloseCustomDeviceDialog} />
            <div className="image-picker-title">
              <div className="device-library-dialog-title" onPointerDown={(event) => startDeviceLibraryDialogDrag("custom", event)}>
                <h2>元件定义</h2>
              </div>
              {customDeviceSaveToast && <div className="e-device-interface-save-toast"><span className="e-device-interface-save-toast-icon">✓</span>{customDeviceSaveToast}</div>}
              {customDeviceDraft.error && (<div className="custom-device-title-error">
                <span>{customDeviceDraft.error}</span>
                <button type="button" className="custom-device-title-error-close" onClick={() => setCustomDeviceDraft((current: CustomDeviceDraft) => ({ ...current, error: "" }))} title="关闭提示"><X /></button>
              </div>)}
            </div>
            {customDeviceSaveMessage && <p className="custom-device-save-status">{customDeviceSaveMessage}</p>}
            <div className="custom-device-dialog-layout">
              <CustomComponentManagerTree
                libraries={displayedCustomComponentTreeLibraries}
                filteredByComponentLibrary={filteredCustomComponentTreeByComponentLibrary}
                customComponentLibraries={customComponentLibraries}
                initialCollapsedLibraries={collapsedCustomComponentTreeLibraries}
                initialCollapsedTypes={collapsedCustomComponentTreeTypes}
                initialSelection={customComponentTreeSelection}
                searchQuery={customComponentTreeSearchQuery}
                onSelectCategoryLibrary={requestSelectCustomCategoryLibrary}
                onSelectComponent={requestSelectCustomComponentTemplate}
                onSelectComponentLibrary={requestSelectCustomComponentLibrary}
                onCreateCategoryLibrary={createCustomCategoryLibrary}
                onCreateComponentLibrary={createCustomComponentLibrary}
                onCreateComponent={startCustomComponentCreate}
                copiedCustomComponentTemplate={copiedCustomComponentTemplate}
                onCopyComponent={copyCustomComponentTemplate}
                onPasteComponent={pasteCustomComponentTemplate}
                onExportComponentSvg={exportCustomComponentTemplateSvg}
                onImportComponentSvg={openCustomComponentSvgImport}
                onDeleteSelection={deleteSelectedCustomDeviceTreeItem}
                onSearchChange={setCustomComponentTreeSearchQuery}
                onCollapseChange={handleTreeCollapseChange}
                onSelectionChange={setCustomComponentTreeSelection}
                onOpenEDeviceDefinitionInterface={() => setEDeviceDefinitionInterfaceDialogOpen(true)}
              />
              <div className={`custom-device-editor-panel${showComponentLibraryTerminalTypes ? " has-component-library-terminal-types" : ""}`}>
            <div className={`custom-device-form-grid${customDeviceDefinitionIconOnly ? " component-mode" : customComponentTreeSelection?.kind === "componentLibrary" ? " component-library-mode" : ""}`}>
              {!customDeviceDefinitionIconOnly && (
                <label className="custom-category-library-field">
                  <span>类别库</span>
                  <input value={customDeviceDraft.categoryLibraryName} disabled readOnly />
                </label>
              )}
              <label className="custom-component-library-field">
                <span>所属类</span>
                <input value={customDeviceClassDisplay.title} disabled readOnly />
              </label>
              {customDeviceDefinitionIconOnly && (<>
                <label className="custom-device-name-field">
                  元件中文名称
                  <BufferedTextInput value={customDeviceDraft.componentName} placeholder="例如 水电、核电、风电、光伏" onCommit={(value) => setCustomDeviceDraft((current) => ({ ...current, componentName: value, error: "" }))}/>
                </label>
                <label className="custom-device-english-name-field">
                  元件英文名称
                  <BufferedTextInput value={customDeviceDraft.componentKind ?? ""} placeholder="例如 two-port-heat-source" onCommit={(value) => setCustomDeviceDraft((current) => ({ ...current, componentKind: value, error: "" }))}/>
                </label>
                <label className="custom-device-resize-field">
                  是否允许变形
                  <select value={customDeviceDraft.allowResizeTransform} onChange={(event) => setCustomDeviceDraft((current) => ({ ...current, allowResizeTransform: event.target.value, error: "" }))}>
                    <option value="0">否</option>
                    <option value="1">是</option>
                  </select>
                </label>
              </>)}
              <label className="custom-device-derived-field">
                派生关系
                <input value={customDeviceDraft.isDerivedComponentLibrary ? `派生自 ${customDeviceDraft.derivedFromComponentLibrary}` : "非派生类"} disabled readOnly />
              </label>
              <label className="custom-device-terminal-count-field">
                端子数量
                <input value={customDeviceDraft.terminalCount} disabled readOnly />
              </label>
              {!customDeviceDefinitionIconOnly && (
                <label className="custom-device-container-field">
                  是否容器
                  <input value={customDeviceDraft.isContainer ? "是" : "否"} disabled readOnly />
                </label>
              )}
            </div>
            {showComponentLibraryTerminalTypes && (
                <div className="component-library-terminal-types" aria-label="类端子能源属性配置">
                  <strong>端子能源属性</strong>
                  <div>
                    {Array.from({ length: customDeviceDraft.terminalCount }).map((_, index) => {
                      const terminalType = customDeviceDraft.terminalTypes[index] ?? "ac";
                      return (
                        <label key={index}>
                          <span>{`端子${index + 1}`}</span>
                          <select
                            aria-label={`端子${index + 1}能源属性`}
                            value={terminalType}
                            onChange={(event) => {
                              const nextTerminalType = event.target.value;
                              setCustomDeviceDraft((current) => {
                                const terminalTypes = [...current.terminalTypes];
                                terminalTypes[index] = nextTerminalType;
                                return {
                                  ...current,
                                  terminalTypes,
                                  terminalAssociations: normalizeContainerTerminalAssociations(
                                    terminalTypes,
                                    current.terminalAssociations,
                                    current.terminalCount
                                  ),
                                  error: ""
                                };
                              });
                            }}
                          >
                            {TERMINAL_TYPE_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                          </select>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            <div className="device-definition-tabs custom-device-tabs" role="tablist" aria-label="元件定义内容切换">
              {(customDeviceDefinitionIconOnly || customComponentTreeSelection?.kind !== "componentLibrary") && (<button type="button" className={`${visibleCustomDeviceDialogView === "icon" ? "active" : ""}${customDeviceIconDirty ? " dirty" : ""}`} onClick={() => requestCustomDeviceDialogView("icon")} title={customDeviceIconDirty ? "图元定义有未保存修改" : undefined}>
                图元定义{customDeviceIconDirty && <span className="custom-device-tab-dirty">已编辑</span>}
              </button>)}
              {!customDeviceDefinitionIconOnly && (<>
                  <button type="button" className={`${visibleCustomDeviceDialogView === "parameters" ? "active" : ""}${customDeviceParametersDirty ? " dirty" : ""}`} onClick={() => requestCustomDeviceDialogView("parameters")} title={customDeviceParametersDirty ? "参数定义有未保存修改" : undefined}>
                    参数定义{customDeviceParametersDirty && <span className="custom-device-tab-dirty">已编辑</span>}
                  </button>
                  <button type="button" className={`${visibleCustomDeviceDialogView === "measurements" ? "active" : ""}${customDeviceMeasurementsDirty ? " dirty" : ""}`} onClick={() => requestCustomDeviceDialogView("measurements")} title={customDeviceMeasurementsDirty ? "量测定义有未保存修改" : undefined}>
                    量测定义{customDeviceMeasurementsDirty && <span className="custom-device-tab-dirty">已编辑</span>}
                  </button>
                </>)}
              <span className="device-definition-tabs-spacer" />
              <button type="button" className="device-definition-tab-action" onClick={revertCustomDeviceDraftCurrentTab} title="撤销当前分页的修改回到预设定义">
                撤销修改
              </button>
              {customDeviceDefinitionMode === "edit" && !editingCustomDeviceKind && (<button type="button" className="device-definition-tab-action" onClick={revertCustomDeviceDraftAll} title="从源码原始定义还原到初始状态">
                还原
              </button>)}
            </div>
            <div className={`custom-device-tab-panel custom-device-tab-panel-${visibleCustomDeviceDialogView}${showCustomDeviceInheritanceNote ? " has-inheritance-note" : ""}`}>
            {visibleCustomDeviceDialogView === "icon" ? (<>
            {renderStateVisualPager(customDeviceDraft.stateDefinitions, customDeviceStatePageId, setCustomDeviceStatePageId, {
                update: updateCustomDeviceStateDraftRow,
                add: addCustomDeviceStateDraftRow,
                remove: deleteCustomDeviceStateDraftRow,
                drawingScope: "custom",
                terminalGeometryTemplate: customDevicePreviewSourceTemplate
            })}
            {customDeviceDraft.terminalCount > 0 && <div className="custom-terminal-grid" style={{ "--custom-terminal-count": Math.max(1, customDeviceDraft.terminalCount) } as CSSProperties}>
              {Array.from({ length: customDeviceDraft.terminalCount }).map((_, index) => {
                    const terminalTypes = customDeviceDraft.terminalTypes.slice(0, customDeviceDraft.terminalCount);
                    const terminalAssociations = normalizeContainerTerminalAssociations(terminalTypes, customDeviceDraft.terminalAssociations, customDeviceDraft.terminalCount);
                    const associationSourceIndex = getContainerTerminalAssociationSourceIndex(terminalAssociations, index);
                    const associationDependent = customDeviceDraft.isContainer && isContainerTerminalAssociationDependent(terminalAssociations, index);
                    const terminalType = customDeviceDraft.terminalTypes[index] ?? "ac";
                    const associationOptions = CONTAINER_TERMINAL_ASSOCIATION_OPTIONS[terminalType];
                    const terminalAnchor = customDeviceTerminalAnchors[index] ?? { x: 0, y: 0 };
                    return (<label key={index} className={associationDependent ? "custom-terminal-dependent" : ""}>
                    <strong>{`端子${index + 1}`}</strong>
                    <span>端子位置</span>
                    <div className="custom-terminal-anchor-inputs">
                      <span>X</span>
                      <BufferedTextInput type="number" min="-0.5" max="0.5" step="0.01" value={formatCustomDeviceTerminalAnchorValue(terminalAnchor.x)} onCommit={(value) => updateCustomDeviceTerminalAnchor(index, { x: Number(value) })} aria-label={`端子${index + 1} X位置`}/>
                      <span>Y</span>
                      <BufferedTextInput type="number" min="-0.5" max="0.5" step="0.01" value={formatCustomDeviceTerminalAnchorValue(terminalAnchor.y)} onCommit={(value) => updateCustomDeviceTerminalAnchor(index, { y: Number(value) })} aria-label={`端子${index + 1} Y位置`}/>
                    </div>
                    {customDeviceDraft.isContainer && (<>
                        <span>关联设备</span>
                        <select value={associationDependent ? "" : terminalAssociations[index] || defaultContainerAssociationForTerminalType(terminalType)} disabled title="关联设备由所属类定义">
                          {associationDependent && <option value="">随上一个端子关联同一个双端元件</option>}
                          {associationOptions.map((option) => (<option key={option.value} value={option.value}>
                              {option.label}
                            </option>))}
                        </select>
                        {associationDependent && <small>{`随端子${associationSourceIndex + 1}分配到同一个双端元件，关联属性为空。`}</small>}
                      </>)}
                  </label>);
                })}
            </div>}
              </>) : visibleCustomDeviceDialogView === "parameters" ? (<>
                  {showCustomDeviceInheritanceNote && (
                    <p className="device-definition-inheritance-note">
                      已继承基类 {customDeviceDraft.derivedFromComponentLibrary || customDeviceDraft.componentLibrary} 的
                      {` ${__appScope.customDraftInheritedParameterDefinitions?.length ?? 0} `}个参数和
                      {` ${__appScope.customDraftInheritedMeasurementDefinitions?.length ?? 0} `}个量测；下表只定义派生类新增字段，无需重复定义基类字段。
                    </p>
                  )}
            <div className="definition-table-toolbar" aria-label="参数定义表格操作">
              <button type="button" onClick={addCustomParameterRow}>新增参数</button>
              <button type="button" onClick={copySelectedCustomParameterRows} disabled={selectedCustomParameterRowIds.length === 0}>复制</button>
              <button type="button" onClick={() => moveSelectedCustomParameterRows(-1)} disabled={selectedCustomEditableParameterCount === 0}>上移</button>
              <button type="button" onClick={() => moveSelectedCustomParameterRows(1)} disabled={selectedCustomEditableParameterCount === 0}>下移</button>
              <button type="button" onClick={deleteSelectedCustomParameterRows} disabled={selectedCustomEditableParameterCount === 0}>删除</button>
              <span>{selectedCustomParameterRowIds.length > 0 ? `已选 ${selectedCustomParameterRowIds.length} 行` : "点击行选择，Ctrl/Shift 可多选"}</span>
            </div>
            <div className="custom-param-table-wrap">
              <table className="custom-param-table">
                <thead>
                  <tr>
                    <th className="definition-table-sequence">序号</th>
                    <th>中文名称</th>
                    <th>英文名称</th>
                     <th>取值类型</th>
                     <th>默认值</th>
                     <th>枚举项</th>
                  </tr>
                </thead>
                <tbody>
                    {displayedMergedCustomDefaultParams.map((row, rowIndex) => {
                        const defaultRow: CustomParamDraft = { ...row, id: `default-${row.enName}` };
                        const defaultRowDisabled = Boolean(row.readonly);
                        return (<tr
                            key={`default-${row.enName}`}
                            className={`definition-table-row${selectedCustomParameterRowIdSet.has(defaultRow.id) ? " selected" : ""}${defaultRowDisabled ? " readonly-row" : ""}`}
                            aria-selected={selectedCustomParameterRowIdSet.has(defaultRow.id)}
                            onClick={(event) => selectCustomParameterRow(defaultRow.id, event)}
                          >
                            <td className="definition-table-sequence">{rowIndex + 1}</td>
                            <td>{row.cnName}</td>
                            <td>{row.enName}</td>
                             <td>{parameterValueTypeLabelForDefinitionRow(row)}</td>
                             <td>{renderTypicalValueEditor(defaultRow, updateCustomDefaultParamRow, defaultRowDisabled, customDeviceDraft.componentLibrary)}</td>
                             <td>{renderEnumValuesEditor(defaultRow, updateCustomDefaultParamRow, defaultRowDisabled)}</td>
                           </tr>);
                    })}
                    {displayedVisibleCustomParams.map((row, index) => (<tr
                      key={row.id}
                      className={`definition-table-row${selectedCustomParameterRowIdSet.has(row.id) ? " selected" : ""}`}
                      aria-selected={selectedCustomParameterRowIdSet.has(row.id)}
                      onClick={(event) => selectCustomParameterRow(row.id, event)}
                    >
                      <td className="definition-table-sequence">{displayedMergedCustomDefaultParams.length + index + 1}</td>
                      <td>
                        <BufferedTextInput value={row.cnName} onCommit={(value) => setCustomDeviceDraft((current) => ({
                    ...current,
                    params: current.params.map((item) => (item.id === row.id ? { ...item, cnName: value } : item)),
                    error: ""
                }))}/>
                      </td>
                      <td>
                        <BufferedTextInput value={row.enName} onCommit={(value) => setCustomDeviceDraft((current) => ({
                    ...current,
                    params: current.params.map((item) => (item.id === row.id ? { ...item, enName: value } : item)),
                    error: ""
                }))}/>
                      </td>
                      <td>
                        <select value={row.valueType} onChange={(event) => setCustomDeviceDraft((current) => ({
                    ...current,
                    params: current.params.map((item) => item.id === row.id
                        ? normalizeDefinitionRowEnumFields({ ...item, valueType: event.target.value as DeviceParameterValueType })
                        : item),
                    error: ""
                }))}>
                          {PARAM_VALUE_TYPE_OPTIONS.map((option) => (<option key={option.value} value={option.value}>
                              {option.label}
                            </option>))}
                        </select>
                      </td>
                      <td>
                        {renderTypicalValueEditor(
                          row,
                          (rowId, patch) => setCustomDeviceDraft((current) => ({
                            ...current,
                            params: current.params.map((item) => (item.id === rowId ? { ...item, ...patch } : item)),
                            error: ""
                          })),
                          false,
                          customDeviceDraft.componentLibrary
                        )}
                      </td>
                      <td>
                        {renderEnumValuesEditor(row, (rowId, patch) => setCustomDeviceDraft((current) => ({
                          ...current,
                          params: current.params.map((item) => (item.id === rowId ? { ...item, ...patch } : item)),
                          error: ""
                        })))}
                      </td>
                    </tr>))}
                </tbody>
              </table>
            </div>
              </>) : (<>
                {showCustomDeviceInheritanceNote && (
                  <p className="device-definition-inheritance-note">
                    基类 {customDeviceDraft.derivedFromComponentLibrary || customDeviceDraft.componentLibrary} 的量测已自动继承；这里只维护派生类新增量测。
                  </p>
                )}
                {renderDeviceDefinitionMeasurementPanel(customDeviceMeasurementTarget)}
              </>)}
            </div>
              </div>
            </div>
            <footer className="custom-device-dialog-footer">
              <span className={`custom-device-dirty-summary${customDeviceHasUnsavedChanges ? " dirty" : ""}`} aria-live="polite">
                {customDeviceHasUnsavedChanges ? "有未保存修改" : "当前无未保存修改"}
              </span>
              <button type="button" onClick={requestCloseCustomDeviceDialog}>取消</button>
              <button
                type="button"
                className="primary"
                onClick={() => saveCustomDeviceDefinitionDialog({ closeAfterSave: false })}
                disabled={customDeviceDefinitionMode === "edit" && customComponentTreeSelection?.kind === "categoryLibrary"}
                title={customDeviceDefinitionMode === "edit" && customComponentTreeSelection?.kind === "categoryLibrary" ? "请先选择一个类或元件" : undefined}
              >
                {customDeviceDefinitionMode === "edit"
                  ? customComponentTreeSelection?.kind === "componentLibrary" ? "保存类定义" : "保存元件定义"
                  : "保存新建元件"}
              </button>
            </footer>
            <div className="device-library-dialog-resize" role="separator" aria-orientation="horizontal" aria-label="调整新建元件窗口大小" title="拖拽调整窗口大小" onPointerDown={(event) => startDeviceLibraryDialogResize("custom", event)}/>
          </section>
        </div>)}
      {customDeviceUnsavedPrompt && (<div className="image-picker-backdrop" onPointerDown={() => resolveCustomDeviceUnsavedPrompt("cancel")}>
          <section className="unsaved-change-dialog custom-device-unsaved-dialog window-close-host" onPointerDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="custom-device-unsaved-title">
            <WindowCloseButton label="关闭元件定义未保存提示" onClick={() => resolveCustomDeviceUnsavedPrompt("cancel")} />
            <div className="image-picker-title">
              <div>
                <h2 id="custom-device-unsaved-title">元件定义尚未保存</h2>
                <p>
                  当前{customDeviceUnsavedPrompt.section === "icon" ? "图元定义" : customDeviceUnsavedPrompt.section === "parameters" ? "参数定义" : customDeviceUnsavedPrompt.section === "measurements" ? "量测定义" : "元件定义"}存在未保存修改。
                  {customDeviceUnsavedPrompt.actionLabel}之前，请选择如何处理这些修改。
                </p>
              </div>
            </div>
            <div className="unsaved-change-actions">
              <button type="button" onClick={() => resolveCustomDeviceUnsavedPrompt("discard")}>不保存继续</button>
              <button type="button" onClick={() => resolveCustomDeviceUnsavedPrompt("save")}>保存后继续</button>
              <button type="button" onClick={() => resolveCustomDeviceUnsavedPrompt("cancel")}>继续编辑</button>
            </div>
          </section>
        </div>)}
      {eDeviceDefinitionInterfaceDialogOpen && (<div className="image-picker-backdrop" onPointerDown={requestCloseEDeviceInterfaceDefinition}>
          <section className="e-device-interface-dialog window-close-host" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => event.stopPropagation()}>
            <WindowCloseButton label="关闭E文件接口定义" onClick={requestCloseEDeviceInterfaceDefinition} />
            <div className="image-picker-title">
              <div>
                <h2>E文件接口定义</h2>
              </div>
              {eDeviceInterfaceSaveMessage && <div className="e-device-interface-save-toast"><span className="e-device-interface-save-toast-icon">✓</span>{eDeviceInterfaceSaveMessage}</div>}
            </div>
            <div className="e-device-interface-actions">
              {eDeviceInterfaceLoadedTemplateName && (
                <div className="e-device-interface-template-info">
                  <span className="e-device-interface-template-name">{eDeviceInterfaceLoadedTemplateName}</span>
                  {eDeviceInterfaceReadonlyMode && (
                    <button type="button" className="e-device-interface-convert-button" onClick={convertEDeviceInterfaceTemplateToCustom}>
                      转为自定义配置
                    </button>
                  )}
                  {templateImportResult && (
                    <button type="button" className="e-device-interface-convert-button" onClick={() => setShowImportResultDialog(true)}>
                      查看导入结果
                    </button>
                  )}
                </div>
              )}
              <button type="button" onClick={() => setEFileEditorDialogOpen(true)}>
                <Eye size={14} aria-hidden="true" />
                <span>查看/编辑E文件</span>
              </button>
              <button type="button" onClick={requestExportEDeviceInterfaceDefinitionFile}>
                <Download size={14} aria-hidden="true" />
                <span>保存成文件</span>
              </button>
              <label className="e-device-interface-file-button">
                <FileInput size={14} aria-hidden="true" />
                <span>从文件加载</span>
                <input type="file" accept=".e,text/plain" hidden onChange={__appScope.importEDeviceDefinitionFile} />
              </label>
              <div className="e-device-template-dropdown" onMouseEnter={() => setEDeviceTemplateDropdownOpen(true)} onMouseLeave={() => setEDeviceTemplateDropdownOpen(false)}>
                <button type="button" onClick={() => setEDeviceTemplateDropdownOpen(!eDeviceTemplateDropdownOpen)}>
                  <ChevronDown size={14} aria-hidden="true" />
                  <span>加载预定义模板</span>
                </button>
                {eDeviceTemplateDropdownOpen && (
                  <div className="e-device-template-dropdown-menu">
                    <button type="button" onClick={async () => {
                      setEDeviceTemplateDropdownOpen(false);
                      await loadPredefinedEDeviceTemplate("sgcc.e");
                    }}>国网E格式</button>
                    <button type="button" onClick={async () => {
                      setEDeviceTemplateDropdownOpen(false);
                      await loadPredefinedEDeviceTemplate("ems_rtdb.e");
                    }}>主网实时库</button>
                    <button type="button" onClick={async () => {
                      setEDeviceTemplateDropdownOpen(false);
                      await loadPredefinedEDeviceTemplate("dms_rtdb.e");
                    }}>配网实时库</button>
                    <button type="button" onClick={async () => {
                      setEDeviceTemplateDropdownOpen(false);
                      await loadPredefinedEDeviceTemplate("taiqu_rtdb.e");
                    }}>台区实时库</button>
                  </div>
                )}
              </div>
              <button type="button" onClick={() => void restoreEDeviceInterfaceOriginalDefinition()}>
                <RotateCcw size={14} aria-hidden="true" />
                <span>原始定义</span>
              </button>
            </div>
            <div className="e-device-interface-layout">
              <aside className="e-device-interface-class-list" aria-label="设备类树" role="tree">
                {eDeviceInterfaceDefinitionTree.map((category) => {
                  const categoryCollapsed = Boolean(collapsedEDeviceInterfaceTreeNodes[category.key]);
                  return (
                    <div className="e-device-interface-tree-category" key={category.key}>
                      <button
                        type="button"
                        className={`e-device-interface-tree-category-toggle${eDeviceInterfaceSelectedGroupKey === category.key ? " active" : ""}`}
                        role="treeitem"
                        aria-level={1}
                        aria-expanded={!categoryCollapsed}
                        onClick={() => {
                          toggleEDeviceInterfaceTreeNode(category.key);
                          setEDeviceInterfaceSelectedGroupKey(category.key);
                        }}
                      >
                        {categoryCollapsed ? <ChevronRight size={14} aria-hidden="true" /> : <ChevronDown size={14} aria-hidden="true" />}
                        <FolderOpen size={14} aria-hidden="true" />
                        <span>{category.label}</span>
                        <small>{category.classCount} 类</small>
                      </button>
                      {!categoryCollapsed ? (
                        <div className="e-device-interface-tree-category-children" role="group">
                          {category.items.map((item) => {
                            const classRow = item.row;
                            const branchKey = `class:${classRow.componentLibrary}`;
                            const branchCollapsed = Boolean(collapsedEDeviceInterfaceTreeNodes[branchKey]);
                            const active = eDeviceInterfaceSelectedGroupKey === branchKey || (eDeviceInterfaceSelectedGroupKey !== category.key && classRow.componentLibrary === selectedEDeviceInterfaceRow?.componentLibrary);
                            return (
                              <div className="e-device-interface-tree-branch" key={classRow.componentLibrary}>
                                <div className="e-device-interface-tree-node-row">
                                  {item.children.length > 0 ? (
                                    <button
                                      type="button"
                                      className="e-device-interface-tree-toggle"
                                      aria-label={`${branchCollapsed ? "展开" : "收起"}${classRow.label || classRow.componentLibrary}`}
                                      aria-expanded={!branchCollapsed}
                                      onClick={() => toggleEDeviceInterfaceTreeNode(branchKey)}
                                    >
                                      {branchCollapsed ? <ChevronRight size={13} aria-hidden="true" /> : <ChevronDown size={13} aria-hidden="true" />}
                                    </button>
                                  ) : (
                                    <span className="e-device-interface-tree-toggle-spacer" aria-hidden="true" />
                                  )}
                                  <button
                                    type="button"
                                    className={`e-device-interface-class-option${active ? " active" : ""}`}
                                    role="treeitem"
                                    aria-level={2}
                                    aria-selected={active}
                                    aria-expanded={item.children.length > 0 ? !branchCollapsed : undefined}
                                    onClick={() => {
                                      if (item.children.length > 0) {
                                        setEDeviceInterfaceSelectedGroupKey(branchKey);
                                      } else {
                                        setEDeviceInterfaceSelectedGroupKey(null);
                                        requestSelectEDeviceInterfaceComponentLibrary(classRow.componentLibrary);
                                      }
                                    }}
                                  >
                                    <span className="e-device-interface-class-label">{classRow.label || classRow.componentLibrary}</span>
                                    <span className="e-device-interface-class-meta">
                                      <code>{classRow.componentLibrary}</code>
                                      <small>{classRow.fields.length} 参数</small>
                                    </span>
                                  </button>
                                </div>
                                {item.children.length > 0 && !branchCollapsed ? (
                                  <div className="e-device-interface-tree-children" role="group">
                                    {item.children.map((child) => {
                                      const childRow = child.row;
                                      const childActive = eDeviceInterfaceSelectedGroupKey !== branchKey && eDeviceInterfaceSelectedGroupKey !== category.key && childRow.componentLibrary === selectedEDeviceInterfaceRow?.componentLibrary;
                                      return (
                                        <button
                                          type="button"
                                          key={childRow.componentLibrary}
                                          className={`e-device-interface-class-option e-device-interface-tree-derived${childActive ? " active" : ""}`}
                                          role="treeitem"
                                          aria-level={3}
                                          aria-selected={childActive}
                                          onClick={() => {
                                            setEDeviceInterfaceSelectedGroupKey(null);
                                            requestSelectEDeviceInterfaceComponentLibrary(childRow.componentLibrary);
                                          }}
                                        >
                                          <span className="e-device-interface-class-label">{child.templateLabel || childRow.label || childRow.componentLibrary}</span>
                                          <span className="e-device-interface-class-meta">
                                            <code>{childRow.componentLibrary}</code>
                                            <small>{childRow.fields.length} 参数</small>
                                          </span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                ) : null}
                              </div>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
                {eDeviceInterfaceDefinitionRows.length === 0 ? <p className="e-device-interface-empty">暂无可配置设备类</p> : null}
              </aside>
              <div className="e-device-interface-detail">
                {eDeviceInterfaceGroupInfo ? (<>
                  {(() => {
                    const groupRows = eDeviceInterfaceGroupInfo.rows;
                    const isExportOn = (r: any) => {
                      const lib = String(r.componentLibrary ?? "").trim();
                      return Boolean(eDeviceDefinitionClassExportEnabled[lib] ?? r.exportEnabled);
                    };
                    const allOn = groupRows.length > 0 && groupRows.every(isExportOn);
                    const someOn = !allOn && groupRows.some(isExportOn);
                    return (<>
                  <div className="e-device-interface-group-header">
                    <span>子设备类</span>
                    <strong>{eDeviceInterfaceGroupInfo.label}</strong>
                    <small>{groupRows.length} 项</small>
                  </div>
                  <div className="e-device-interface-table-wrap">
                    <table className="custom-param-table e-device-interface-table e-device-interface-group-table">
                      <thead>
                        <tr>
                          <th>设备类</th>
                          <th>标识</th>
                          <th className="e-device-interface-group-export-all">
                            <span>是否导出</span>
                            <input
                              className="custom-param-export-checkbox"
                              type="checkbox"
                              checked={allOn}
                              disabled={eDeviceInterfaceReadonlyMode}
                              ref={(el) => { if (el) el.indeterminate = someOn; }}
                              aria-label="全部选中或取消"
                              onChange={(event) => {
                                const checked = event.target.checked;
                                setEDeviceDefinitionClassExportEnabled((current) => {
                                  const next = { ...current };
                                  for (const r of groupRows) {
                                    const lib = String(r.componentLibrary ?? "").trim();
                                    if (lib) next[lib] = checked;
                                  }
                                  return next;
                                });
                              }}
                            />
                          </th>
                          <th>导出名称</th>
                        </tr>
                      </thead>
                      <tbody>
                        {eDeviceInterfaceGroupInfo.rows.map((groupRow: any) => {
                          const lib = String(groupRow.componentLibrary ?? "").trim();
                          const rowExportEnabled = Boolean(eDeviceDefinitionClassExportEnabled[lib] ?? groupRow.exportEnabled);
                          const rowExportName = eDeviceDefinitionLabels[lib] ?? lib;
                          return (
                            <tr key={lib}>
                              <td className="e-device-interface-param-name">{groupRow.label || lib}</td>
                              <td><code>{lib}</code></td>
                              <td className="custom-param-export-toggle">
                                <input
                                  className="custom-param-export-checkbox"
                                  type="checkbox"
                                  checked={rowExportEnabled}
                                  disabled={eDeviceInterfaceReadonlyMode}
                                  aria-label={`${lib}是否导出`}
                                  onChange={(event) => setEDeviceDefinitionClassExportEnabled((current) => ({
                                    ...current,
                                    [lib]: event.target.checked
                                  }))}
                                />
                              </td>
                              <td>
                                <BufferedTextInput
                                  value={rowExportName}
                                  disabled={eDeviceInterfaceReadonlyMode}
                                  onCommit={(value) => {
                                    const trimmed = value.trim();
                                    setEDeviceDefinitionLabels((prev) => {
                                      const next = { ...prev };
                                      if (!trimmed || trimmed === lib) {
                                        delete next[lib];
                                      } else {
                                        next[lib] = trimmed;
                                      }
                                      return next;
                                    });
                                  }}
                                />
                              </td>
                            </tr>
                          );
                        })}
                        {eDeviceInterfaceGroupInfo.rows.length === 0 ? (<tr>
                          <td colSpan={4}>该分组暂无子设备类</td>
                        </tr>) : null}
                      </tbody>
                    </table>
                  </div>
                  </>);})()}
                </>) : selectedEDeviceInterfaceRow ? (<>
                  <div className="e-device-interface-class-form">
                    <div className="e-device-interface-selected-class">
                      <span>当前设备类</span>
                      <strong>{selectedEDeviceInterfaceRow.label || selectedEDeviceInterfaceRow.componentLibrary}</strong>
                      <code>{selectedEDeviceInterfaceRow.componentLibrary}</code>
                    </div>
                    <label className="e-device-interface-export-switch">
                      <input
                        className="custom-param-export-checkbox"
                        type="checkbox"
                        checked={selectedEDeviceInterfaceRow.exportEnabled}
                        disabled={eDeviceInterfaceReadonlyMode}
                        aria-label={`${selectedEDeviceInterfaceRow.componentLibrary}是否导出`}
                        onChange={(event) => setEDeviceDefinitionClassExportEnabled((current) => ({
                          ...current,
                          [selectedEDeviceInterfaceRow.componentLibrary]: event.target.checked
                        }))}
                      />
                      <span>是否导出</span>
                    </label>
                    <label className="e-device-interface-export-name">
                      <span>导出名称</span>
                      <BufferedTextInput
                        value={selectedEDeviceInterfaceRow.exportName ?? selectedEDeviceInterfaceRow.componentLibrary}
                        disabled={eDeviceInterfaceReadonlyMode}
                        onCommit={(value) => {
                          const trimmed = value.trim();
                          setEDeviceDefinitionLabels((prev) => {
                            const next = { ...prev };
                            if (!trimmed || trimmed === selectedEDeviceInterfaceRow.componentLibrary) {
                              delete next[selectedEDeviceInterfaceRow.componentLibrary];
                            } else {
                              next[selectedEDeviceInterfaceRow.componentLibrary] = trimmed;
                            }
                            return next;
                          });
                        }}
                      />
                    </label>
                  </div>
                  <div className="e-device-interface-table-wrap">
                    <table className="custom-param-table e-device-interface-table">
                      <thead>
                        <tr>
                          <th>顺序</th>
                          <th>参数</th>
                          <th>英文名称</th>
                          <th>是否导出</th>
                          <th>导出名称</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedEDeviceInterfaceFields.map((field, fieldIndex) => (<tr key={`${selectedEDeviceInterfaceRow.componentLibrary}:${field.sourceName}`} className={selectedEDeviceInterfaceRow.exportEnabled ? "" : "disabled"}>
                          <td className="e-device-interface-order-cell">
                            <span className="e-device-interface-order-index" aria-label={`当前顺序${fieldIndex + 1}`}>{fieldIndex + 1}</span>
                            <span className="e-device-interface-order-actions">
                              <button
                                type="button"
                                className="e-device-interface-order-button"
                                aria-label={`上移${field.cnName || field.sourceName}`}
                                title="上移"
                                disabled={eDeviceInterfaceReadonlyMode || fieldIndex === 0}
                                onClick={() => moveSelectedEDeviceInterfaceField(field.sourceName, -1)}
                              >
                                <ArrowUp size={13} aria-hidden="true" />
                              </button>
                              <button
                                type="button"
                                className="e-device-interface-order-button"
                                aria-label={`下移${field.cnName || field.sourceName}`}
                                title="下移"
                                disabled={eDeviceInterfaceReadonlyMode || fieldIndex === selectedEDeviceInterfaceFields.length - 1}
                                onClick={() => moveSelectedEDeviceInterfaceField(field.sourceName, 1)}
                              >
                                <ArrowDown size={13} aria-hidden="true" />
                              </button>
                            </span>
                          </td>
                          <td className="e-device-interface-param-name">{field.cnName || field.sourceName}</td>
                          <td><code>{field.sourceName}</code></td>
                          <td className="custom-param-export-toggle">
                            <input
                              className="custom-param-export-checkbox"
                              type="checkbox"
                              checked={Boolean(field.exportEnabled)}
                              disabled={eDeviceInterfaceReadonlyMode || !selectedEDeviceInterfaceRow.exportEnabled || field.readonly}
                              aria-label={`${field.cnName || field.sourceName}是否导出`}
                              onChange={(event) => updateDefinitionComponentLibraryCommonParamExport(selectedEDeviceInterfaceRow.componentLibrary, field.sourceName, { exportEnabled: event.target.checked, exportName: field.exportName?.trim() || field.sourceName })}
                            />
                          </td>
                          <td>
                            <BufferedTextInput
                              value={field.exportName ?? ""}
                              disabled={eDeviceInterfaceReadonlyMode || !selectedEDeviceInterfaceRow.exportEnabled || !field.exportEnabled || field.readonly}
                              onCommit={(value) => updateDefinitionComponentLibraryCommonParamExport(selectedEDeviceInterfaceRow.componentLibrary, field.sourceName, { exportName: value })}
                            />
                          </td>
                        </tr>))}
                        {selectedEDeviceInterfaceRow.fields.length === 0 ? (<tr>
                          <td colSpan={5}>该设备类暂无可配置参数</td>
                        </tr>) : null}
                      </tbody>
                    </table>
                  </div>
                </>) : (
                  <div className="e-device-interface-empty e-device-interface-empty-detail">暂无可配置设备类</div>
                )}
              </div>
            </div>
            <footer className="e-device-interface-footer">
              <span className={eDeviceInterfaceHasUnsavedChanges ? "dirty" : ""} aria-live="polite">
                {eDeviceInterfaceHasUnsavedChanges ? "有未保存修改" : "当前无未保存修改"}
              </span>
              <div className="e-device-interface-footer-actions">
                <button type="button" onClick={requestCloseEDeviceInterfaceDefinition}>退出</button>
                <button
                  type="button"
                  className="primary"
                  onClick={() => requestSaveEDeviceInterfaceDefinition()}
                >
                  <Save size={14} aria-hidden="true" />
                  保存
                </button>
              </div>
            </footer>
          </section>
        </div>)}
      {eFileEditorDialogOpen && (
        <EFileEditor
          open={eFileEditorDialogOpen}
          onClose={() => setEFileEditorDialogOpen(false)}
          records={eFileEditorRecords}
          fieldCnNames={eFileEditorFieldCnNames}
          tableIds={eDeviceDefinitionTableIds}
          isRealtimeDbTemplate={/实时库$|_rtdb\.e$/i.test(eDeviceInterfaceLoadedTemplateName ?? "")}
          onSave={(editedRecords) => {
            const currentNodes = __appScope.nodes ?? [];
            const setNodes = __appScope.setNodes;
            const pushUndoSnapshot = __appScope.pushUndoSnapshot;
            if (!setNodes) return;
            // 反向映射：exportName(模板列名) -> sourceName(设备参数名)。
            // 模板模式下展示/编辑的是模板规格的 E 文件列名，保存时需写回设备参数名，
            // 否则编辑结果在重新导出时无法被读取，破坏「导出与内网完全一致」。
            const sourceNameByExport = new Map<string, string>(); // key = `${section}\0${exportName}`
            for (const definition of eFileEditorExportOptions.interfaceDefinitions ?? []) {
              const section = String(definition.componentLibrary ?? "").trim();
              if (!section) continue;
              for (const field of definition.fields ?? []) {
                if (field.exportEnabled === false) continue;
                const exportName = String(field.exportName ?? field.sourceName ?? "").trim();
                const sourceName = String(field.sourceName ?? exportName).trim();
                if (exportName && sourceName) sourceNameByExport.set(`${section}\0${exportName}`, sourceName);
              }
            }
            // 运行时生成表（ACNode/ACRealBs 等）的字段定义仅存于 eDeviceDefinitionTemplateFields
            for (const [componentLibrary, templateFields] of Object.entries(eDeviceDefinitionTemplateFields ?? {})) {
              if (!componentLibrary || !Array.isArray(templateFields)) continue;
              for (const field of templateFields) {
                const exportName = String(field.exportName ?? "").trim();
                const sourceName = String(field.sourceName ?? exportName).trim();
                if (exportName && sourceName) sourceNameByExport.set(`${componentLibrary}\0${exportName}`, sourceName);
              }
            }
            // 构建 id -> params 映射（跳过拓扑生成的记录）
            const editedMap = new Map<string, Record<string, string>>();
            for (const record of editedRecords) {
              if (!record.id || record.id.includes(":derived:") || record.id.includes(":winding:") || record.id.includes("-")) {
                // 只处理真实节点 id（格式如 "node-xxx"）
                if (!record.id.startsWith("node-")) continue;
              }
              const section = record.section;
              const params: Record<string, string> = {};
              for (const [exportName, value] of Object.entries(record.params)) {
                if (exportName === "name") {
                  params.name = value;
                  continue;
                }
                const sourceName = sourceNameByExport.get(`${section}\0${exportName}`) ?? exportName;
                params[sourceName] = value;
              }
              editedMap.set(record.id, params);
            }
            if (editedMap.size === 0) return;
            let changed = false;
            const nextNodes = currentNodes.map((node: any) => {
              const edited = editedMap.get(node.id);
              if (!edited) return node;
              changed = true;
              const newName = edited.name ?? node.name;
              const newParams = { ...node.params };
              for (const [key, val] of Object.entries(edited)) {
                if (key === "name") continue;
                newParams[key] = val;
              }
              return { ...node, name: newName, params: newParams };
            });
            if (!changed) return;
            if (pushUndoSnapshot) pushUndoSnapshot();
            setNodes(nextNodes);
          }}
        />
      )}
      {eDeviceInterfaceExitPromptOpen && (<div className="image-picker-backdrop" onPointerDown={() => setEDeviceInterfaceExitPromptOpen(false)}>
          <section className="unsaved-change-dialog e-device-interface-unsaved-dialog window-close-host" onPointerDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="e-device-interface-unsaved-title">
            <WindowCloseButton label="关闭E文件接口未保存提示" onClick={() => setEDeviceInterfaceExitPromptOpen(false)} />
            <div className="image-picker-title">
              <div>
                <h2 id="e-device-interface-unsaved-title">E文件接口定义尚未保存</h2>
                <p>当前接口定义存在未保存修改。退出之前，请选择如何处理这些修改。</p>
              </div>
            </div>
            <div className="unsaved-change-actions">
              <button type="button" onClick={discardEDeviceInterfaceDefinitionChanges}>不保存直接退出</button>
              <button type="button" onClick={() => requestSaveEDeviceInterfaceDefinition({ closeAfterSave: true })}>保存后退出</button>
              <button type="button" onClick={() => setEDeviceInterfaceExitPromptOpen(false)}>继续编辑</button>
            </div>
          </section>
        </div>)}
      {eDeviceInterfaceClassSwitchTarget && (<div className="image-picker-backdrop" onPointerDown={() => setEDeviceInterfaceClassSwitchTarget("")}>
          <section className="unsaved-change-dialog e-device-interface-unsaved-dialog e-device-interface-class-switch-dialog window-close-host" onPointerDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="e-device-interface-class-switch-title">
            <WindowCloseButton label="关闭设备类切换提示" onClick={() => setEDeviceInterfaceClassSwitchTarget("")} />
            <div className="image-picker-title">
              <div>
                <h2 id="e-device-interface-class-switch-title">当前设备类定义尚未保存</h2>
                <p>
                  "{selectedEDeviceInterfaceRow?.label || selectedEDeviceInterfaceRow?.componentLibrary}"存在未保存修改。
                  切换到"{eDeviceInterfaceClassSwitchTargetRow?.label || eDeviceInterfaceClassSwitchTarget}"之前，请选择如何处理这些修改。
                </p>
              </div>
            </div>
            <div className="unsaved-change-actions">
              <button type="button" onClick={discardEDeviceInterfaceClassAndSwitch}>不保存并切换</button>
              <button type="button" onClick={() => runAfterEDeviceInterfaceInputCommit(() => eDeviceInterfaceSaveAndSwitchRef.current())}>保存并切换</button>
              <button type="button" onClick={() => setEDeviceInterfaceClassSwitchTarget("")}>继续编辑</button>
            </div>
          </section>
        </div>)}
      {showImportResultDialog && templateImportResult && (<div className="image-picker-backdrop" onPointerDown={() => setShowImportResultDialog(false)}>
          <section className="template-import-result-dialog window-close-host" onPointerDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
            <WindowCloseButton label="关闭预定义模板导入结果" onClick={() => setShowImportResultDialog(false)} />
            <div className="image-picker-title">
              <div>
                <h2>预定义模板导入结果</h2>
                <p>匹配：{templateImportResult.matched.length} 个，未匹配：{templateImportResult.skipped.length} 个，无需匹配：{(templateImportResult.runtimeGenerated ?? []).length} 个</p>
              </div>
            </div>
            <div className="template-import-result-tabs">
              <button type="button" className={`template-import-result-tab${importResultActiveTab === "matched" ? " active" : ""}`} onClick={() => setImportResultActiveTab("matched")}>
                已匹配 ({templateImportResult.matched.length})
              </button>
              <button type="button" className={`template-import-result-tab${importResultActiveTab === "skipped" ? " active" : ""}`} onClick={() => setImportResultActiveTab("skipped")}>
                未匹配 ({templateImportResult.skipped.length})
              </button>
              <button type="button" className={`template-import-result-tab${importResultActiveTab === "runtimeGenerated" ? " active" : ""}`} onClick={() => setImportResultActiveTab("runtimeGenerated")}>
                无需匹配 ({(templateImportResult.runtimeGenerated ?? []).length})
              </button>
            </div>
            <div className="template-import-result-content">
              {importResultActiveTab === "matched" && (<div className="template-import-result-section">
                {templateImportResult.matched.length > 0 ? (
                  <table className="template-import-result-table">
                    <thead>
                      <tr>
                        <th>模板表名</th>
                        <th>匹配设备</th>
                        <th>模板字段</th>
                        <th>设备属性</th>
                      </tr>
                    </thead>
                    <tbody>
                      {templateImportResult.matched.map((item, idx) => {
                        const fields = item.fields && item.fields.length > 0 ? item.fields : [{ template: "", device: "" }];
                        const sectionKey = `matched:${item.section}`;
                        const expanded = expandedImportResultSections.has(sectionKey);
                        // 设备属性统计：匹配 / 新增 / 拓扑生成
                        let matchedFieldCount = 0;
                        let newlyAddedFieldCount = 0;
                        let topologyGeneratedFieldCount = 0;
                        for (const f of fields) {
                          const deviceValue = f.device ?? "";
                          if (deviceValue.endsWith("（新增）")) {
                            newlyAddedFieldCount += 1;
                          } else if (deviceValue === "（拓扑生成）") {
                            topologyGeneratedFieldCount += 1;
                          } else if (deviceValue) {
                            matchedFieldCount += 1;
                          }
                        }
                        return (
                          <Fragment key={idx}>
                            <tr className="template-import-result-section-row" onClick={() => toggleImportResultSection(sectionKey)}>
                              <td className="template-import-result-cell-section">
                                <span className="template-import-result-expand-icon">
                                  {expanded ? (<ChevronDown size={13}/>) : (<ChevronRight size={13}/>)}
                                </span>
                                {item.section}
                              </td>
                              <td className="template-import-result-cell-device">{item.device}</td>
                              <td className="template-import-result-cell-fields">
                                <span className="template-import-result-cell-empty">{fields.length} 个模板字段</span>
                              </td>
                              <td className="template-import-result-cell-fields">
                                <span className="template-import-result-stat">{matchedFieldCount}个匹配</span>
                                <span className="template-import-result-stat template-import-result-stat-new">{newlyAddedFieldCount}个新增</span>
                                <span className="template-import-result-stat template-import-result-stat-topology">{topologyGeneratedFieldCount}个拓扑生成</span>
                              </td>
                            </tr>
                            {expanded && fields.map((f, fi) => {
                              const deviceValue = f.device ?? "";
                              const isNewlyAdded = deviceValue.endsWith("（新增）");
                              return (
                                <tr key={`${idx}-${fi}`}>
                                  <td colSpan={2} className="template-import-result-cell-fields"/>
                                  <td className="template-import-result-cell-fields">
                                    {f.template ? (<span className="template-import-result-field-tag">{f.template}</span>) : (<span className="template-import-result-cell-empty">-</span>)}
                                  </td>
                                  <td className="template-import-result-cell-fields">
                                    {deviceValue ? (
                                      <span className={`template-import-result-field-tag template-import-result-field-tag-device${isNewlyAdded ? " template-import-result-field-tag-added" : ""}`}>{deviceValue}</span>
                                    ) : (<span className="template-import-result-cell-empty">未匹配</span>)}
                                  </td>
                                </tr>
                              );
                            })}
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <p className="template-import-result-empty">无匹配表/字段</p>
                )}
              </div>)}
              {importResultActiveTab === "skipped" && (<div className="template-import-result-section">
                {templateImportResult.skipped.length > 0 ? (
                  <table className="template-import-result-table">
                    <thead>
                      <tr>
                        <th>模板表名</th>
                        <th>未匹配字段</th>
                      </tr>
                    </thead>
                    <tbody>
                      {templateImportResult.skipped.map((item, idx) => {
                        const fields = item.fields && item.fields.length > 0 ? item.fields : [""];
                        const sectionKey = `skipped:${item.section}`;
                        const expanded = expandedImportResultSections.has(sectionKey);
                        return (
                          <Fragment key={idx}>
                            <tr className="template-import-result-section-row" onClick={() => toggleImportResultSection(sectionKey)}>
                              <td className="template-import-result-cell-section">
                                <span className="template-import-result-expand-icon">
                                  {expanded ? (<ChevronDown size={13}/>) : (<ChevronRight size={13}/>)}
                                </span>
                                {item.section}
                              </td>
                              <td className="template-import-result-cell-fields">
                                <span className="template-import-result-cell-empty">{fields.length} 个未匹配字段，点击展开</span>
                              </td>
                            </tr>
                            {expanded && fields.map((f, fi) => (
                              <tr key={`${idx}-${fi}`} className="template-import-result-row-skipped">
                                <td className="template-import-result-cell-section"/>
                                <td className="template-import-result-cell-fields">
                                  {f ? (<span className="template-import-result-field-tag template-import-result-field-tag-skipped">{f}</span>) : (<span className="template-import-result-cell-empty">-</span>)}
                                </td>
                              </tr>
                            ))}
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <p className="template-import-result-empty">所有表/字段均已匹配</p>
                )}
              </div>)}
              {importResultActiveTab === "runtimeGenerated" && (<div className="template-import-result-section">
                {(templateImportResult.runtimeGenerated ?? []).length > 0 ? (
                  <table className="template-import-result-table">
                    <thead>
                      <tr>
                        <th>模板表名</th>
                        <th>字段</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(templateImportResult.runtimeGenerated ?? []).map((item, idx) => {
                        const fields = item.fields && item.fields.length > 0 ? item.fields : [""];
                        const sectionKey = `runtimeGenerated:${item.section}`;
                        const expanded = expandedImportResultSections.has(sectionKey);
                        return (
                          <Fragment key={idx}>
                            <tr className="template-import-result-section-row" onClick={() => toggleImportResultSection(sectionKey)}>
                              <td className="template-import-result-cell-section">
                                <span className="template-import-result-expand-icon">
                                  {expanded ? (<ChevronDown size={13}/>) : (<ChevronRight size={13}/>)}
                                </span>
                                {item.section}
                              </td>
                              <td className="template-import-result-cell-fields">
                                <span className="template-import-result-cell-empty">{fields.length} 个字段，点击展开</span>
                              </td>
                            </tr>
                            {expanded && fields.map((f, fi) => (
                              <tr key={`${idx}-${fi}`} className="template-import-result-row-runtime">
                                <td className="template-import-result-cell-section"/>
                                <td className="template-import-result-cell-fields">
                                  {f ? (<span className="template-import-result-field-tag template-import-result-field-tag-runtime">{f}</span>) : (<span className="template-import-result-cell-empty">-</span>)}
                                </td>
                              </tr>
                            ))}
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <p className="template-import-result-empty">无运行时生成表</p>
                )}
              </div>)}
            </div>
            <div className="template-import-result-footer">
              <button type="button" onClick={() => setShowImportResultDialog(false)}>关闭</button>
            </div>
          </section>
        </div>)}
  </>);
}, areViewSectionPropsEqual);
