// @ts-nocheck
import { memo } from "react";
import { areViewSectionPropsEqual } from "./appViewRenderBoundary";

export const AppProjectDialogs = memo(function AppProjectDialogs({ scope }) {
  const __appScope = scope;
  const {
    Download, FileInput, UserCustomizationManagerDialog, WindowCloseButton, cancelGlobalLinePlacement, cancelGlobalLineTransition, closeLibraryPackageDialog, confirmGlobalLinePlacement,
    confirmGlobalLineTransition, confirmLibraryPackageDialog, globalLinePlacementCandidates, globalLinePlacementConflictMessageForId, globalLinePlacementDialog, globalLineRepairCandidate, globalLineTransitionDialog, isBrowseMode,
    libraryPackageDialogMode, libraryPackageDialogOpen, libraryPackageDialogScope, libraryPackageDialogScopeOptions, pendingModelImportConflict, pendingRecordPasteConflict, pendingSchemeImportConflict, pendingUnsavedAction,
    projectName, renderMeasurementConfigDialog, renderMeasurementEditorDialog, resolveDuplicateModelImport, resolveDuplicateSchemeImport, resolveRecordPasteConflict, resolveUnsavedChangeAction, saveCurrentProject,
    savedUndoStackLengthRef, setGlobalLinePlacementDialog, setHasUnsavedChanges, setLibraryPackageDialogMode, setLibraryPackageDialogScope, setUnsavedChangesDialogOpen, undoLastOperation, undoStack,
    unsavedChangesDialogOpen
  } = scope;
  return (<>
{libraryPackageDialogOpen && (
        <div className="image-picker-backdrop library-package-backdrop" onPointerDown={closeLibraryPackageDialog}>
          <section className="library-package-dialog window-close-host" onPointerDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="library-package-title">
            <WindowCloseButton label="关闭库导入导出窗口" onClick={closeLibraryPackageDialog} />
            <div className="image-picker-title">
              <div>
                <h2 id="library-package-title">导入/导出库</h2>
              </div>
            </div>
            <div className="library-package-mode-toggle" role="radiogroup" aria-label="选择导入或导出">
              {[
                ["export", "导出", Download],
                ["import", "导入", FileInput]
              ].map(([mode, label, Icon]) => (
                <label key={mode} className={libraryPackageDialogMode === mode ? "active" : ""}>
                  <input
                    type="radio"
                    name="library-package-mode"
                    value={mode}
                    checked={libraryPackageDialogMode === mode}
                    onChange={() => setLibraryPackageDialogMode?.(mode)}
                  />
                  <Icon size={15}/>
                  <span>{label}</span>
                </label>
              ))}
            </div>
            <div className="library-package-scope-grid" role="radiogroup" aria-label="选择库类型">
              {(libraryPackageDialogScopeOptions ?? []).map((option: any) => (
                <label key={option.scope} className={libraryPackageDialogScope === option.scope ? "active" : ""}>
                  <input
                    type="radio"
                    name="library-package-scope"
                    value={option.scope}
                    checked={libraryPackageDialogScope === option.scope}
                    onChange={() => setLibraryPackageDialogScope?.(option.scope)}
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
            <div className="library-package-dialog-actions">
              <button type="button" onClick={closeLibraryPackageDialog}>取消</button>
              <button
                type="button"
                className="primary"
                disabled={libraryPackageDialogMode === "import" && isBrowseMode}
                onClick={() => void confirmLibraryPackageDialog?.()}
              >
                {libraryPackageDialogMode === "import" ? "导入" : "导出"}
              </button>
            </div>
          </section>
        </div>
      )}
      {globalLinePlacementDialog && (
        <div className="image-picker-backdrop global-line-dialog-backdrop" onPointerDown={cancelGlobalLinePlacement}>
          <section
            className="unsaved-change-dialog global-line-dialog window-close-host"
            onPointerDown={(event) => event.stopPropagation()}
            onKeyDown={(event) => { if (event.key === "Escape") cancelGlobalLinePlacement(); }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="global-line-dialog-title"
          >
            <WindowCloseButton label="取消添加全局线路" onClick={cancelGlobalLinePlacement}/>
            <div className="image-picker-title">
              <div>
                <h2 id="global-line-dialog-title">选择或新建全局线路</h2>
                <p>
                  当前{globalLinePlacementDialog.energyType === "ac" ? "交流" : "直流"}线路连接了跨模型边界设备。
                  本次连接占用全局线路的{globalLinePlacementDialog.boundaryEndpoint === "source" ? "首端" : "末端"}。
                  既有线路的能源类型、首端模型和末端模型必须与本次线路完全一致；复用只做一致性校核，不修改已有全局线路的首末端信息。校核不通过时，请重新选择、新建或取消。
                </p>
              </div>
            </div>
            <div className="global-line-dialog-options">
              <label className={`global-line-dialog-option${globalLinePlacementDialog.mode === "existing" ? " active" : ""}`}>
                <span className="global-line-dialog-option-heading">
                  <input
                    type="radio"
                    name="global-line-placement-mode"
                    checked={globalLinePlacementDialog.mode === "existing"}
                    disabled={globalLinePlacementDialog.loading || globalLinePlacementCandidates.length === 0}
                    onChange={() => setGlobalLinePlacementDialog((current) => current ? {
                      ...current,
                      mode: "existing",
                      error: globalLinePlacementConflictMessageForId?.(current.selectedGlobalLineId) ?? ""
                    } : current)}
                  />
                  选择既有全局线路
                </span>
                <select
                  value={globalLinePlacementDialog.selectedGlobalLineId}
                  disabled={globalLinePlacementDialog.loading || globalLinePlacementDialog.mode !== "existing" || globalLinePlacementCandidates.length === 0}
                  onChange={(event) => setGlobalLinePlacementDialog((current) => current ? {
                    ...current,
                    selectedGlobalLineId: event.target.value,
                    error: globalLinePlacementConflictMessageForId?.(event.target.value) ?? ""
                  } : current)}
                >
                  {globalLinePlacementCandidates.map((record) => (
                    <option key={record.id} value={record.id}>
                      {record.idx} · {record.name} · 出线度 {record.degree}{globalLinePlacementConflictMessageForId?.(record.id) ? " · ⚠ 端点不一致" : ""}
                    </option>
                  ))}
                </select>
                {!globalLinePlacementDialog.loading && globalLinePlacementCandidates.length === 0 && (
                  <small>
                    当前没有能源类型一致的既有线路。
                  </small>
                )}
              </label>
              <label className={`global-line-dialog-option${globalLinePlacementDialog.mode === "new" ? " active" : ""}`}>
                <span className="global-line-dialog-option-heading">
                  <input
                    type="radio"
                    name="global-line-placement-mode"
                    checked={globalLinePlacementDialog.mode === "new"}
                    disabled={globalLinePlacementDialog.loading}
                    onChange={() => setGlobalLinePlacementDialog((current) => current ? { ...current, mode: "new", error: "" } : current)}
                  />
                  新建全局线路
                </span>
                <input
                  type="text"
                  value={globalLinePlacementDialog.name}
                  disabled={globalLinePlacementDialog.loading || globalLinePlacementDialog.mode !== "new"}
                  placeholder="请输入全局唯一的线路名称"
                  onChange={(event) => setGlobalLinePlacementDialog((current) => current ? { ...current, name: event.target.value, error: "" } : current)}
                />
              </label>
            </div>
            {globalLinePlacementDialog.loading && <p className="global-line-dialog-status">正在读取全局线路表…</p>}
            {globalLineRepairCandidate && globalLineRepairCandidate.degree <= 1 && (
              <p className="global-line-dialog-warning">
                告警：所选全局线路出线度为 0 或 1，说明端点配置为空或存在问题。确认添加后，将使用当前模型关联信息重建该全局线路的首末端；保存页面后才写入全局线路表。
              </p>
            )}
            {globalLinePlacementDialog.error && <p className="global-line-dialog-error">{globalLinePlacementDialog.error}</p>}
            <div className="unsaved-change-actions">
              <button type="button" onClick={cancelGlobalLinePlacement} disabled={globalLinePlacementDialog.saving}>取消</button>
              <button
                type="button"
                className="primary"
                onClick={() => void confirmGlobalLinePlacement()}
                disabled={globalLinePlacementDialog.loading || globalLinePlacementDialog.saving}
              >
                {globalLinePlacementDialog.saving ? "保存中…" : "确认添加"}
              </button>
            </div>
          </section>
        </div>
      )}
      {globalLineTransitionDialog && (
        <div className="image-picker-backdrop global-line-dialog-backdrop" onPointerDown={cancelGlobalLineTransition}>
          <section
            className="unsaved-change-dialog global-line-transition-dialog window-close-host"
            onPointerDown={(event) => event.stopPropagation()}
            onKeyDown={(event) => { if (event.key === "Escape") cancelGlobalLineTransition(); }}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="global-line-transition-title"
          >
            <WindowCloseButton label="取消线路维护方式变更" onClick={cancelGlobalLineTransition}/>
            <div className="image-picker-title">
              <div>
                <h2 id="global-line-transition-title">线路维护方式即将变更</h2>
                <p>
                  线路“{globalLineTransitionDialog.originalNode.name}”的端点调整会使其从
                  <strong>{globalLineTransitionDialog.direction === "local-to-global" ? "本图线路" : "全局线路"}</strong>
                  切换为
                  <strong>{globalLineTransitionDialog.direction === "local-to-global" ? "全局线路" : "本图线路"}</strong>。
                </p>
              </div>
            </div>
            <div className="global-line-transition-warning">
              {globalLineTransitionDialog.direction === "local-to-global" ? (
                <p>确认后，将删除该线路的本图独立编号关系，并继续让你从全局线路表中选择出线度小于2的线路，或新建全局线路。</p>
              ) : (
                <p>确认后，将解除该线路的全局引用、把全局出线度减1，并在本图中重新分配独立线路序号。</p>
              )}
              <p>取消操作将完整保留原端点连接、线路编号和维护方式。</p>
            </div>
            <div className="unsaved-change-actions">
              <button type="button" onClick={cancelGlobalLineTransition}>取消，保持原连接</button>
              <button type="button" className="primary" onClick={confirmGlobalLineTransition}>确认并继续</button>
            </div>
          </section>
        </div>
      )}
      <UserCustomizationManagerDialog
        open={Boolean(__appScope.userCustomizationManagerOpen)}
        inventory={__appScope.userCustomizationInventory}
        activeDomain={__appScope.userCustomizationActiveDomain}
        busy={Boolean(__appScope.userCustomizationBusy)}
        status={__appScope.userCustomizationStatus ?? ""}
        pendingImport={__appScope.pendingUserCustomizationImport}
        onClose={__appScope.closeUserCustomizationManager}
        onDomainChange={__appScope.setUserCustomizationActiveDomain}
        onExport={__appScope.exportAllUserCustomizations}
        onChooseImport={__appScope.openUserCustomizationImportFilePicker}
        onImportModeChange={__appScope.changePendingUserCustomizationImportMode}
        onConfirmImport={__appScope.confirmUserCustomizationImport}
        onCancelImport={__appScope.cancelPendingUserCustomizationImport}
        onRestore={__appScope.restoreUserCustomizations}
      />
      {renderMeasurementConfigDialog()}
      {renderMeasurementEditorDialog()}
      {pendingRecordPasteConflict && (<div className="image-picker-backdrop" onPointerDown={() => resolveRecordPasteConflict("cancel")}>
          <section className="unsaved-change-dialog window-close-host" onPointerDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="record-paste-conflict-title">
            <WindowCloseButton label="关闭名称重复提示" onClick={() => resolveRecordPasteConflict("cancel")} />
            <div className="image-picker-title">
              <div>
                <h2 id="record-paste-conflict-title">名称重复</h2>
                <p>
                  当前{pendingRecordPasteConflict.kind === "scheme" ? "模型库" : pendingRecordPasteConflict.kind === "scheme-drag" ? "目标方案" : "方案"}中已存在"{pendingRecordPasteConflict.duplicateName}"。请选择{pendingRecordPasteConflict.kind === "project-drag" || pendingRecordPasteConflict.kind === "scheme-drag" ? "拖拽" : "粘贴"}处理方式。
                </p>
              </div>
            </div>
            <div className="unsaved-change-actions">
              <button type="button" onClick={() => resolveRecordPasteConflict("overwrite")}>覆盖</button>
              <button type="button" onClick={() => resolveRecordPasteConflict("rename")}>新命名</button>
              <button type="button" onClick={() => resolveRecordPasteConflict("cancel")}>{pendingRecordPasteConflict.kind === "project-drag" || pendingRecordPasteConflict.kind === "scheme-drag" ? "取消拖拽" : "取消粘贴"}</button>
            </div>
          </section>
        </div>)}
      {pendingModelImportConflict && (<div className="image-picker-backdrop" onPointerDown={() => resolveDuplicateModelImport("cancel")}>
          <section className="unsaved-change-dialog window-close-host" onPointerDown={(event) => event.stopPropagation()} onKeyDown={(event) => { if (event.key === "Escape") { resolveDuplicateModelImport("cancel"); } }} role="dialog" aria-modal="true" aria-labelledby="model-import-conflict-title">
            <WindowCloseButton label="关闭模型名称重复提示" onClick={() => resolveDuplicateModelImport("cancel")} />
            <div className="image-picker-title">
              <div>
                <h2 id="model-import-conflict-title">模型名称重复</h2>
                <p>
                  当前方案中已存在模型"{pendingModelImportConflict.duplicateProjectName}"。请选择导入处理方式。
                </p>
              </div>
            </div>
            <div className="unsaved-change-actions">
              <button type="button" onClick={() => resolveDuplicateModelImport("overwrite")}>覆盖</button>
              <button type="button" onClick={() => resolveDuplicateModelImport("rename")}>重命名</button>
              <button type="button" onClick={() => resolveDuplicateModelImport("cancel")}>不导入</button>
            </div>
          </section>
        </div>)}
      {pendingSchemeImportConflict && (<div className="image-picker-backdrop" onPointerDown={() => resolveDuplicateSchemeImport("cancel")}>
          <section className="unsaved-change-dialog window-close-host" onPointerDown={(event) => event.stopPropagation()} onKeyDown={(event) => { if (event.key === "Escape") { resolveDuplicateSchemeImport("cancel"); } }} role="dialog" aria-modal="true" aria-labelledby="scheme-import-conflict-title">
            <WindowCloseButton label="关闭方案名称重复提示" onClick={() => resolveDuplicateSchemeImport("cancel")} />
            <div className="image-picker-title">
              <div>
                <h2 id="scheme-import-conflict-title">方案名称重复</h2>
                <p>
                  当前模型库中已存在方案"{pendingSchemeImportConflict.duplicateSchemeName}"。请选择导入处理方式。
                </p>
              </div>
            </div>
            <div className="unsaved-change-actions">
              <button type="button" onClick={() => resolveDuplicateSchemeImport("merge")}>合并覆盖</button>
              <button type="button" onClick={() => resolveDuplicateSchemeImport("rename")}>重新命名</button>
              <button type="button" onClick={() => resolveDuplicateSchemeImport("cancel")}>不导入</button>
            </div>
          </section>
        </div>)}
      {pendingUnsavedAction && (() => {
        const pendingUnsavedActionResolving = Boolean(pendingUnsavedAction.resolving);
        return (<div className="image-picker-backdrop unsaved-change-backdrop" onPointerDown={() => { if (!pendingUnsavedActionResolving) resolveUnsavedChangeAction("cancel"); }}>
          <section className="unsaved-change-dialog window-close-host" onPointerDown={(event) => event.stopPropagation()} onKeyDown={(event) => { if (event.key === "Escape" && !pendingUnsavedActionResolving) { resolveUnsavedChangeAction("cancel"); } }} role="dialog" aria-modal="true" aria-labelledby="unsaved-change-title" aria-busy={pendingUnsavedActionResolving}>
            <WindowCloseButton label="关闭未保存修改提示" onClick={() => { if (!pendingUnsavedActionResolving) resolveUnsavedChangeAction("cancel"); }} />
            <div className="image-picker-title">
              <div>
                <h2 id="unsaved-change-title">当前模型尚未保存</h2>
                <p>当前模型"{projectName}"存在未保存修改。{pendingUnsavedAction.label}之前，请选择如何处理这些修改。</p>
              </div>
            </div>
            <div className="unsaved-change-actions">
              {pendingUnsavedAction.kind !== "export" && (
                <button type="button" disabled={pendingUnsavedActionResolving} onClick={() => resolveUnsavedChangeAction("discard")}>
                  {pendingUnsavedAction.kind === "enter-browse" ? "不保存直接浏览" : "不保存继续切换/关闭"}
                </button>
              )}
              <button type="button" disabled={pendingUnsavedActionResolving} onClick={() => resolveUnsavedChangeAction("save")}>
                {pendingUnsavedActionResolving ? "正在保存..." : pendingUnsavedAction.kind === "enter-browse" ? "保存后浏览" : pendingUnsavedAction.kind === "export" ? "保存后导出" : "保存后切换/关闭"}
              </button>
              <button type="button" disabled={pendingUnsavedActionResolving} onClick={() => resolveUnsavedChangeAction("cancel")}>退出操作</button>
            </div>
            {pendingUnsavedAction.resolutionError && <p className="unsaved-change-error" role="alert">{pendingUnsavedAction.resolutionError}</p>}
            <p className="unsaved-change-note">关闭网页时，浏览器也会在离开前提示当前模型未保存。</p>
          </section>
        </div>);
      })()}
      {unsavedChangesDialogOpen && (<div className="image-picker-backdrop" onPointerDown={() => setUnsavedChangesDialogOpen(false)}>
          <section className="unsaved-changes-dialog window-close-host" style={{ width: "80vw", height: "80vh" }} onPointerDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="unsaved-changes-list-title">
            <WindowCloseButton label="关闭未保存修改列表" onClick={() => setUnsavedChangesDialogOpen(false)} />
            <div className="unsaved-changes-header">
              <h2 id="unsaved-changes-list-title">未保存的修改</h2>
            </div>
            <div className="unsaved-changes-body" style={{ overflow: "auto", flex: 1, minHeight: 0 }}>
              {(() => {
                const baseline = savedUndoStackLengthRef?.current ?? 0;
                const unsavedOps = undoStack.slice(baseline);
                if (unsavedOps.length === 0) {
                  return <p className="unsaved-changes-empty">无未保存修改</p>;
                }
                const groupCounts = new Map<string, number>();
                for (const op of unsavedOps) {
                  const label = op.label || "编辑操作";
                  groupCounts.set(label, (groupCounts.get(label) ?? 0) + 1);
                }
                const groupLabels = Array.from(groupCounts.keys());
                const totalOps = unsavedOps.length;
                return (<>
                  <div className="unsaved-changes-summary">
                    {groupLabels.map((label) => {
                      const count = groupCounts.get(label) ?? 0;
                      const undoGroup = () => {
                        let remaining = count;
                        while (remaining > 0) {
                          undoLastOperation();
                          remaining -= 1;
                        }
                        if (undoStack.length - count <= baseline) {
                          setHasUnsavedChanges(false);
                        }
                      };
                      return (<div key={label} className="unsaved-changes-group">
                          <div className="unsaved-changes-group-header">
                            <span className="unsaved-changes-group-label">{label}</span>
                            <span className="unsaved-changes-group-count">{count} 次操作</span>
                            <button type="button" onClick={undoGroup}>撤回该组</button>
                          </div>
                        </div>);
                    })}
                  </div>
                  <div className="unsaved-changes-operations">
                    <h3>操作明细（共 {totalOps} 项）</h3>
                    {unsavedOps.map((op, index) => {
                      const label = op.label || "编辑操作";
                      const target = op.target || "";
                      const undoOne = () => {
                        undoLastOperation();
                        if (undoStack.length - 1 <= baseline) {
                          setHasUnsavedChanges(false);
                        }
                      };
                      return (<div key={index} className="unsaved-changes-operation">
                          <span className="unsaved-changes-operation-label">{label}</span>
                          {target && <span className="unsaved-changes-operation-target">{target}</span>}
                          <span className="unsaved-changes-operation-index">#{totalOps - index}</span>
                          <button type="button" onClick={undoOne}>撤回</button>
                        </div>);
                    })}
                  </div>
                </>);
              })()}
            </div>
            <div className="unsaved-changes-footer">
              <button type="button" onClick={() => { void saveCurrentProject(); setUnsavedChangesDialogOpen(false); }}>保存</button>
              <button type="button" onClick={() => { const baseline = savedUndoStackLengthRef?.current ?? 0; const count = undoStack.length - baseline; for (let i = 0; i < count; i++) { undoLastOperation(); } setHasUnsavedChanges(false); }}>全部撤回</button>
            </div>
          </section>
        </div>)}
  </>);
}, areViewSectionPropsEqual);
