// @ts-nocheck
import { memo, useEffect, useMemo, useRef, useState } from "react";
import { Tabs } from "antd";
import { areViewSectionPropsEqual } from "./appViewRenderBoundary";
import { VOLTAGE_BASE_SET_CATEGORIES } from "./appCoreCanvasUtilities";
import { buildTopologyConnectivity } from "../model-routing";

const formatVoltageLabel = (v: string) => v === "0.22" ? "220V" : `${v}kV`;

function VoltageBaseSetTable({ activeValue, onSelect }) {
  return (<div className="voltage-base-set-table">
    <div className="voltage-base-set-table-head">
      <span>分类</span><span>电压等级</span><span>说明</span>
    </div>
    {VOLTAGE_BASE_SET_CATEGORIES.map((cat) => (
      <div key={cat.label} className="voltage-base-set-table-row">
        <span className="voltage-base-set-table-cat">{cat.label}</span>
        <span className="voltage-base-set-table-btns">
          {cat.values.map((v) => (
            <button key={v} type="button" className={activeValue === v ? "active" : ""} onClick={() => onSelect(v)}>
              {formatVoltageLabel(v)}
            </button>
          ))}
        </span>
        <span className="voltage-base-set-table-desc">{cat.desc}</span>
      </div>
    ))}
  </div>);
}

export const AppCanvasDialogs = memo(function AppCanvasDialogs({ scope }) {
  const __appScope = scope;
  const {
    BufferedTextInput, CONNECTION_REDRAW_SCOPE_LABELS, DEFAULT_COLOR_PALETTE, DeferredColorInput, ENABLE_REACT_FLOW_PREVIEW, ENERGY_COLOR_ROWS, ReactFlowPreview, Suspense,
    TERMINAL_TYPE_LIBRARY_LABELS, VOLTAGE_BASE_CLEAR_SCOPES, VOLTAGE_BASE_CLEAR_SCOPE_LABELS, VOLTAGE_BASE_SET_SCOPES, VOLTAGE_BASE_SET_SCOPE_LABELS, VoltageLevelDialog, WindowCloseButton, activeSelectedNodeIds, voltageBaseSetCandidateNodes,
    activeVoltageBaseTerminalKey, activeVoltageBaseTerminalRow, applyLayerAssignmentDialog, cancelTemplateDialog, colorPaletteDialogOpen, colorPaletteDraft, colorPaletteTab, componentLibraryOptionsByCategoryLibrary,
    confirmAddGraphTemplate, confirmConnectionRedrawDialog, confirmCreateDeviceFromGroup, confirmFilterSelectionDialog, confirmReplaceDeviceIconFromGroup, confirmVoltageBaseClearDialog, confirmVoltageBaseSetDialog, connectionRedrawDialogOpen,
    connectionRedrawScope, connectionRedrawTargetsForScope, createGraphTemplateType, currentModelVoltageColorKeys, defaultComponentLibraryForCategoryLibrary, deleteVoltageColorRow, filterSelectionDialogOpen, filterSelectionTreeLabel,
    filterSelectionTypeKeys, filterSelectionTypeOptions, filterSelectionTypePartial, filterSelectionTypeSelected, graphTemplateTypes, groupDeviceDefinitionDialog, groupDeviceReplacementTemplates, layerAssignmentDialogOpen,
    layerAssignmentTargetId, layerAssignmentUnchanged, layers, normalizeCategoryLibraryName, patchGraphNodes, reactFlowPreviewOpen, renderGraphTemplatePreview, resetEnergyColors, resetVoltageColors,
    resolveTemplateComponentLibrary, saveColorPalette, selectableCategoryLibraries, setActiveVoltageBaseTerminalKey, setColorPaletteDialogOpen, setColorPaletteTab, setConnectionRedrawDialogOpen, setConnectionRedrawScope,
    setColorPaletteDraft, setFilterSelectionDialogOpen, setFilterSelectionTypeKeys, setGroupDeviceDefinitionDialog, setLayerAssignmentDialogOpen, setLayerAssignmentTargetId, setReactFlowPreviewOpen, setTemplateDraftName, setTemplateDraftType,
    setVoltageBaseClearDialogOpen, setVoltageBaseClearScope, setVoltageBaseSetDialogOpen, setVoltageBaseSetScope, setVoltageBaseSetValue, setVoltageBaseTerminalValue, setVoltageBaseTerminalValuesForScope, setVoltageBaseValuesForScope, setVoltageColorVisibility, setVoltageLevelDialogOpen,
    setVoltageLevelSettings, setVoltageTab, templateDialog, templateDraftName, templateDraftType, toggleColorDisplayMode, toggleFilterSelectionItem, toggleFilterSelectionType,
    updateEnergyColor, updateVoltageColorRow, visibleEdges, visibleNodes, visibleVoltageColorRows, nodes, edges, voltageBaseClearDialogOpen, voltageBaseClearResultForScope, voltageBaseClearScope,
    voltageBaseSetDialogOpen, voltageBaseSetHasUniformTargets, voltageBaseSetMode, voltageBaseSetModeLabel, voltageBaseSetOptions, voltageBaseSetReady, voltageBaseSetResultForScope, voltageBaseSetScope,
    voltageBaseSetScopeDeviceCount, voltageBaseSetTerminalRows, voltageBaseSetValue, voltageBaseTerminalRowKey, voltageColorVisibility, voltageLevelDialogOpen, voltageLevelSettings, voltageTab,
    pushUndoSnapshot, writeOperationLog, undoScopeForGraphPatch
  } = scope;
  const [activeVoltageBaseDeviceTab, setActiveVoltageBaseDeviceTab] = useState("");
  const [perDeviceScope, setPerDeviceScope] = useState({});
  const voltageBaseDeviceInitRef = useRef(false);
  useEffect(() => {
    if (!voltageBaseSetDialogOpen) {
      voltageBaseDeviceInitRef.current = false;
      return;
    }
    if (!voltageBaseDeviceInitRef.current && voltageBaseSetCandidateNodes.length > 0) {
      voltageBaseDeviceInitRef.current = true;
      const first = voltageBaseSetCandidateNodes[0];
      setActiveVoltageBaseDeviceTab(first.id);
      const firstTermRow = voltageBaseSetTerminalRows.find((r) => r.nodeId === first.id);
      if (firstTermRow) setActiveVoltageBaseTerminalKey(voltageBaseTerminalRowKey(firstTermRow));
      const initScopes = {};
      voltageBaseSetCandidateNodes.forEach((n) => { initScopes[n.id] = "island"; });
      setPerDeviceScope(initScopes);
    }
  }, [voltageBaseSetDialogOpen, voltageBaseSetCandidateNodes, voltageBaseSetTerminalRows]);
  return (<>
{voltageBaseSetDialogOpen && (() => {
            const showDeviceTabs = voltageBaseSetCandidateNodes.length > 1;
            const activeDeviceId = showDeviceTabs
              ? (voltageBaseSetCandidateNodes.some((n) => n.id === activeVoltageBaseDeviceTab) ? activeVoltageBaseDeviceTab : voltageBaseSetCandidateNodes[0]?.id ?? "")
              : (voltageBaseSetCandidateNodes[0]?.id ?? "");
            const activeDevice = voltageBaseSetCandidateNodes.find((n) => n.id === activeDeviceId) ?? voltageBaseSetCandidateNodes[0];
            const deviceTerminals = activeDevice?.terminals ?? [];
            const showTerminalSubTabs = deviceTerminals.length > 1 && (voltageBaseSetMode === "terminal" || voltageBaseSetMode === "byDevice");
            const activeTerminalRow = showTerminalSubTabs
              ? voltageBaseSetTerminalRows.find((r) => r.nodeId === activeDeviceId && r.terminalId === activeVoltageBaseTerminalKey.split(":")[1]) ?? voltageBaseSetTerminalRows.find((r) => r.nodeId === activeDeviceId) ?? null
              : activeVoltageBaseTerminalRow;
            const handleDeviceTabChange = (nodeId) => {
              setActiveVoltageBaseDeviceTab(nodeId);
              const firstTermRow = voltageBaseSetTerminalRows.find((r) => r.nodeId === nodeId);
              if (firstTermRow) setActiveVoltageBaseTerminalKey(voltageBaseTerminalRowKey(firstTermRow));
            };
            const handleTerminalSubTabChange = (terminalId) => {
              const key = `${activeDeviceId}:${terminalId}`;
              setActiveVoltageBaseTerminalKey(key);
            };
            const resultCache = {};
            const getDeviceResult = (nodeId) => {
              const deviceScope = perDeviceScope[nodeId] ?? "island";
              if (resultCache[deviceScope]) return resultCache[deviceScope];
              const result = voltageBaseSetResultForScope(deviceScope);
              resultCache[deviceScope] = result;
              return result;
            };
            const getTerminalIslandDeviceCount = (nodeId, terminalId) => {
              const cacheKey = `${nodeId}:${terminalId || "default"}:islandCount`;
              if (resultCache[cacheKey] !== undefined) return resultCache[cacheKey];
              const selectedDevice = voltageBaseSetCandidateNodes.find((n) => n.id === nodeId);
              if (!selectedDevice) { resultCache[cacheKey] = 0; return 0; }
              const effectiveTerminalId = terminalId || selectedDevice.terminals?.[0]?.id ?? "";
              if (!effectiveTerminalId) { resultCache[cacheKey] = 0; return 0; }
              const connectivity = buildTopologyConnectivity(nodes, edges);
              const islandRoot = connectivity.islandRoot(nodeId, effectiveTerminalId);
              if (!islandRoot) { resultCache[cacheKey] = 0; return 0; }
              const islandNodeIds = new Set();
              for (const n of nodes) {
                for (const t of n.terminals ?? []) {
                  if (connectivity.islandRoot(n.id, t.id) === islandRoot) {
                    islandNodeIds.add(n.id);
                    break;
                  }
                }
              }
              resultCache[cacheKey] = islandNodeIds.size;
              return islandNodeIds.size;
            };
            const getDeviceFilteredResult = (nodeId) => {
              const fullResult = getDeviceResult(nodeId);
              return {
                changedNodeIds: fullResult.changedNodeIds.includes(nodeId) ? [nodeId] : [],
                nodeUpdates: fullResult.nodeUpdates.filter((n) => n.id === nodeId),
                targetNodeIds: fullResult.targetNodeIds
              };
            };
            const handleConfirm = () => {
              const allUpdates = [];
              const allChangedIds = new Set();
              for (const device of voltageBaseSetCandidateNodes) {
                const devResult = getDeviceFilteredResult(device.id);
                for (const u of devResult.nodeUpdates) {
                  allUpdates.push(u);
                  allChangedIds.add(u.id);
                }
              }
              if (allUpdates.length === 0) return;
              const merged = new Map();
              allUpdates.forEach((n) => merged.set(n.id, n));
              const nodeUpdates = Array.from(merged.values());
              const changedNodeIds = Array.from(allChangedIds);
              pushUndoSnapshot(true, false, undoScopeForGraphPatch(changedNodeIds, []));
              patchGraphNodes(nodeUpdates);
              writeOperationLog(`设置电压基值：${changedNodeIds.length} 个设备`);
              setVoltageBaseSetDialogOpen(false);
            };
            const anyDeviceHasChanges = voltageBaseSetCandidateNodes.some((d) => getDeviceFilteredResult(d.id).changedNodeIds.length > 0);
            const renderTerminalContent = (device, terminalId, terminalLabel) => {
              const deviceScope = perDeviceScope[device.id] ?? "island";
              const fullResult = getDeviceResult(device.id);
              const islandDeviceCount = getTerminalIslandDeviceCount(device.id, terminalId);
              const deviceTerminalRows = voltageBaseSetTerminalRows.filter((r) => r.nodeId === device.id);
              const hasMultiTerminal = deviceTerminalRows.length > 1 && (voltageBaseSetMode === "terminal" || voltageBaseSetMode === "byDevice");
              const row = voltageBaseSetTerminalRows.find((r) => r.nodeId === device.id && r.terminalId === terminalId);
              return (<div className="voltage-base-device-tab-content">
                {!hasMultiTerminal && (voltageBaseSetMode === "uniform" || voltageBaseSetMode === "byDevice") && voltageBaseSetHasUniformTargets && (
                  <VoltageBaseSetTable activeValue={voltageBaseSetValue} onSelect={setVoltageBaseSetValue} />
                )}
                {!hasMultiTerminal && (voltageBaseSetMode === "terminal" || voltageBaseSetMode === "byDevice") && deviceTerminalRows.length === 1 && deviceTerminalRows[0] && (
                  <VoltageBaseSetTable
                    activeValue={deviceTerminalRows[0].value}
                    onSelect={(v) => setVoltageBaseTerminalValue(device.id, deviceTerminalRows[0].terminalId, v)}
                  />
                )}
                {hasMultiTerminal && row && (
                  <VoltageBaseSetTable
                    activeValue={row.value}
                    onSelect={(v) => setVoltageBaseTerminalValue(device.id, row.terminalId, v)}
                  />
                )}
                <div className="connection-redraw-options voltage-base-set-options" role="radiogroup" aria-label={`${terminalLabel}设置范围`}>
                  <button type="button" className={deviceScope === "selected" ? "active" : ""} role="radio" aria-checked={deviceScope === "selected"} onClick={() => setPerDeviceScope((prev) => ({ ...prev, [device.id]: "selected" }))} disabled={!voltageBaseSetReady()}>
                    <span>选中设备</span>
                    <strong>1</strong>
                  </button>
                  <button type="button" className={deviceScope === "island" ? "active" : ""} role="radio" aria-checked={deviceScope === "island"} onClick={() => setPerDeviceScope((prev) => ({ ...prev, [device.id]: "island" }))} disabled={!voltageBaseSetReady()}>
                    <span>所在拓扑岛</span>
                    <strong>{islandDeviceCount}</strong>
                  </button>
                </div>
              </div>);
            };
            const deviceTabItems = voltageBaseSetCandidateNodes.map((device) => {
              const deviceScope = perDeviceScope[device.id] ?? "island";
              const fullResult = getDeviceResult(device.id);
              const deviceTerminalRows = voltageBaseSetTerminalRows.filter((r) => r.nodeId === device.id);
              const hasMultiTerminal = deviceTerminalRows.length > 1 && (voltageBaseSetMode === "terminal" || voltageBaseSetMode === "byDevice");
              const deviceActiveTerminalKey = hasMultiTerminal
                ? (activeVoltageBaseTerminalKey.split(":")[1] && deviceTerminalRows.some((r) => r.terminalId === activeVoltageBaseTerminalKey.split(":")[1])
                  ? activeVoltageBaseTerminalKey.split(":")[1]
                  : deviceTerminalRows[0]?.terminalId ?? "")
                : "";
              const deviceActiveTerminalRow = deviceActiveTerminalKey
                ? deviceTerminalRows.find((r) => r.terminalId === deviceActiveTerminalKey) ?? deviceTerminalRows[0] ?? null
                : deviceTerminalRows[0] ?? null;
              const handleDeviceTerminalChange = (terminalId) => {
                setActiveVoltageBaseTerminalKey(`${device.id}:${terminalId}`);
              };
              return {
                key: device.id,
                label: device.name || device.id,
                children: hasMultiTerminal ? (
                  <Tabs
                    className="voltage-base-device-terminal-tabs"
                    activeKey={deviceActiveTerminalKey}
                    onChange={handleDeviceTerminalChange}
                    items={deviceTerminalRows.map((r, i) => ({
                      key: r.terminalId,
                      label: r.terminalLabel || `端子${i + 1}`,
                      children: renderTerminalContent(device, r.terminalId, r.terminalLabel || `端子${i + 1}`)
                    }))}
                    size="small"
                    type="card"
                  />
                ) : (
                  renderTerminalContent(
                    device,
                    deviceActiveTerminalRow?.terminalId ?? deviceTerminalRows[0]?.terminalId ?? "",
                    deviceActiveTerminalRow?.terminalLabel ?? deviceTerminalRows[0]?.terminalLabel ?? ""
                  )
                )
              };
            });
            return (<div className="image-picker-backdrop" onPointerDown={() => setVoltageBaseSetDialogOpen(false)}>
              <section className="connection-redraw-dialog voltage-base-set-dialog window-close-host" onPointerDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="voltage-base-set-title">
                <WindowCloseButton label="关闭设置电压基值窗口" onClick={() => setVoltageBaseSetDialogOpen(false)} />
                <div className="image-picker-title">
                  <div>
                    <h2 id="voltage-base-set-title">设置电压基值</h2>
                    <p>将指定范围内设备端子和电压相关参数中的 vbase、v_base、v_set 等值设为输入值；多端设备可按端子分别设置。</p>
                  </div>
                </div>
                <div className="voltage-base-set-mode-line">
                  <span>设置方式：</span>
                  <strong>{voltageBaseSetModeLabel}</strong>
                </div>
                {showDeviceTabs ? (
                  <Tabs
                    className="voltage-base-device-tabs"
                    activeKey={activeDeviceId}
                    onChange={handleDeviceTabChange}
                    items={deviceTabItems}
                    size="small"
                  />
                ) : (() => {
                  const singleDevice = voltageBaseSetCandidateNodes[0];
                  const singleDeviceTerminalRows = voltageBaseSetTerminalRows.filter((r) => r.nodeId === singleDevice.id);
                  const hasMultiTerminal = singleDeviceTerminalRows.length > 1 && (voltageBaseSetMode === "terminal" || voltageBaseSetMode === "byDevice");
                  if (!hasMultiTerminal) {
                    return renderTerminalContent(singleDevice, singleDeviceTerminalRows[0]?.terminalId ?? "", singleDeviceTerminalRows[0]?.terminalLabel ?? "");
                  }
                  return (<Tabs
                    className="voltage-base-device-terminal-tabs"
                    activeKey={activeVoltageBaseTerminalKey.split(":")[1] ?? singleDeviceTerminalRows[0]?.terminalId ?? ""}
                    onChange={(terminalId) => setActiveVoltageBaseTerminalKey(`${singleDevice.id}:${terminalId}`)}
                    items={singleDeviceTerminalRows.map((r, i) => ({
                      key: r.terminalId,
                      label: r.terminalLabel || `端子${i + 1}`,
                      children: renderTerminalContent(singleDevice, r.terminalId, r.terminalLabel || `端子${i + 1}`)
                    }))}
                    size="small"
                    type="card"
                  />);
                })()}
                <div className="image-picker-actions connection-redraw-actions">
                  <button type="button" onClick={() => setVoltageBaseSetDialogOpen(false)}>退出</button>
                  <button type="button" onClick={handleConfirm} disabled={!voltageBaseSetReady() || !anyDeviceHasChanges}>
                    确定
                  </button>
                </div>
              </section>
            </div>);
          })()}
      {voltageBaseClearDialogOpen && (<div className="image-picker-backdrop" onPointerDown={() => setVoltageBaseClearDialogOpen(false)}>
          <section className="connection-redraw-dialog voltage-base-clear-dialog window-close-host" onPointerDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="voltage-base-clear-title">
            <WindowCloseButton label="关闭清空电压基值窗口" onClick={() => setVoltageBaseClearDialogOpen(false)} />
            <div className="image-picker-title">
              <div>
                <h2 id="voltage-base-clear-title">清空电压基值</h2>
                <p>将指定范围内设备端子和电压相关参数中的 vbase、v_base、v_set 等值统一设为 0.0。</p>
              </div>
            </div>
            <div className="connection-redraw-options voltage-base-clear-options" role="radiogroup" aria-label="清空电压基值范围">
              {VOLTAGE_BASE_CLEAR_SCOPES.map((scope) => {
            const result = voltageBaseClearResultForScope(scope);
            const count = result.changedNodeIds.length;
            const disabled = count === 0;
            return (<button key={scope} type="button" className={voltageBaseClearScope === scope ? "active" : ""} role="radio" aria-checked={voltageBaseClearScope === scope} onClick={() => setVoltageBaseClearScope(scope)} disabled={disabled}>
                    <span>{VOLTAGE_BASE_CLEAR_SCOPE_LABELS[scope]}</span>
                    <strong>{count}</strong>
                  </button>);
        })}
            </div>
            <div className="image-picker-actions connection-redraw-actions">
              <button type="button" onClick={() => setVoltageBaseClearDialogOpen(false)}>取消</button>
              <button type="button" onClick={confirmVoltageBaseClearDialog} disabled={voltageBaseClearResultForScope(voltageBaseClearScope).changedNodeIds.length === 0}>
                确定
              </button>
            </div>
          </section>
        </div>)}
      {connectionRedrawDialogOpen && (<div className="image-picker-backdrop" onPointerDown={() => setConnectionRedrawDialogOpen(false)}>
          <section className="connection-redraw-dialog window-close-host" onPointerDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="connection-redraw-title">
            <WindowCloseButton label="关闭连接线重绘窗口" onClick={() => setConnectionRedrawDialogOpen(false)} />
            <div className="image-picker-title">
              <div>
                <h2 id="connection-redraw-title">连接线重绘</h2>
                <p>清除指定连接线的旧路径几何，并按当前端子、母线落点和避障规则重新生成。</p>
              </div>
            </div>
            <div className="connection-redraw-options" role="radiogroup" aria-label="连接线重绘范围">
              {(["selected", "viewport", "all"] as const).map((scope) => {
            const count = connectionRedrawTargetsForScope(scope).total;
            const disabled = count === 0;
            return (<button key={scope} type="button" className={connectionRedrawScope === scope ? "active" : ""} role="radio" aria-checked={connectionRedrawScope === scope} onClick={() => setConnectionRedrawScope(scope)} disabled={disabled}>
                    <span>{CONNECTION_REDRAW_SCOPE_LABELS[scope]}</span>
                    <strong>{count}</strong>
                  </button>);
        })}
            </div>
            <div className="image-picker-actions connection-redraw-actions">
              <button type="button" onClick={() => setConnectionRedrawDialogOpen(false)}>取消</button>
              <button type="button" onClick={confirmConnectionRedrawDialog} disabled={connectionRedrawTargetsForScope(connectionRedrawScope).total === 0}>
                确定
              </button>
            </div>
          </section>
        </div>)}
      {groupDeviceDefinitionDialog && (<div className="image-picker-backdrop" onPointerDown={() => setGroupDeviceDefinitionDialog(null)}>
          <section className="group-device-dialog window-close-host" onPointerDown={(event) => event.stopPropagation()} onKeyDown={(event) => { if (event.key === "Escape") { setGroupDeviceDefinitionDialog(null); } }} role="dialog" aria-modal="true" aria-labelledby="group-device-dialog-title">
            <WindowCloseButton label="关闭定义为元件窗口" onClick={() => setGroupDeviceDefinitionDialog(null)} />
            <div className="image-picker-title">
              <div>
                <h2 id="group-device-dialog-title">定义为元件</h2>
                <p>把当前图元组合生成新元件图标，或替换已有元件的图标。</p>
              </div>
            </div>
            <div className="group-device-dialog-grid">
              <div className="template-dialog-preview group-device-preview">
                <img src={groupDeviceDefinitionDialog.iconImage} alt="图元组合生成的元件图标预览"/>
                <small>组合尺寸：{groupDeviceDefinitionDialog.sourceSize.width}×{groupDeviceDefinitionDialog.sourceSize.height}</small>
              </div>
              <div className="template-dialog-fields group-device-fields">
                <div className="group-device-mode-options" role="radiogroup" aria-label="定义方式">
                  {([
            ["new", "新建元件"],
            ["replace", "修改已有元件图标"]
        ] as const).map(([modeValue, label]) => (<button key={modeValue} type="button" className={groupDeviceDefinitionDialog.mode === modeValue ? "active" : ""} role="radio" aria-checked={groupDeviceDefinitionDialog.mode === modeValue} onClick={() => setGroupDeviceDefinitionDialog((current) => current ? { ...current, mode: modeValue } : current)}>
                      {label}
                    </button>))}
                </div>
                {groupDeviceDefinitionDialog.mode === "new" ? (<>
                    <label>
                      <span>类别库</span>
                      <select value={groupDeviceDefinitionDialog.categoryLibraryName} onChange={(event) => {
                const categoryLibraryName = normalizeCategoryLibraryName(event.target.value);
                setGroupDeviceDefinitionDialog((current) => current ? {
                    ...current,
                    categoryLibraryName,
                    componentLibrary: defaultComponentLibraryForCategoryLibrary(categoryLibraryName)
                } : current);
            }}>
                        {selectableCategoryLibraries.map((group) => (<option key={group} value={group}>{group}</option>))}
                      </select>
                    </label>
                    <label>
                      <span>选择类</span>
                      <select value={groupDeviceDefinitionDialog.componentLibrary} onChange={(event) => setGroupDeviceDefinitionDialog((current) => current ? { ...current, componentLibrary: event.target.value } : current)}>
                        {Array.from(new Set([
                groupDeviceDefinitionDialog.componentLibrary,
                ...(componentLibraryOptionsByCategoryLibrary[groupDeviceDefinitionDialog.categoryLibraryName] ?? [])
            ].filter(Boolean))).map((section) => (<option key={section} value={section}>{section}</option>))}
                      </select>
                    </label>
                  </>) : (<label>
                    <span>已有元件</span>
                    <select value={groupDeviceDefinitionDialog.targetKind} disabled={groupDeviceReplacementTemplates.length === 0} onChange={(event) => setGroupDeviceDefinitionDialog((current) => current ? { ...current, targetKind: event.target.value } : current)}>
                      {groupDeviceReplacementTemplates.length === 0 ? (<option value="">暂无元件</option>) : groupDeviceReplacementTemplates.map((template) => (<option key={template.kind} value={template.kind}>
                          {template.label} / {resolveTemplateComponentLibrary(template)}
                        </option>))}
                    </select>
                  </label>)}
                <div className="group-device-terminal-summary">
                  <strong>对外端子</strong>
                  <span>{groupDeviceDefinitionDialog.terminals.length} 个</span>
                </div>
                <div className="group-device-terminal-list">
                  {groupDeviceDefinitionDialog.terminals.length > 0 ? groupDeviceDefinitionDialog.terminals.map((terminal, index) => (<div key={terminal.id} className="group-device-terminal-row">
                      <span>{index + 1}</span>
                      <strong>{terminal.label}</strong>
                      <em>{TERMINAL_TYPE_LIBRARY_LABELS[terminal.type] ?? terminal.type}</em>
                    </div>)) : (<p>未识别到对外端子，新元件会按 0 端子创建。</p>)}
                </div>
              </div>
            </div>
            <div className="template-dialog-actions">
              <button type="button" onClick={() => setGroupDeviceDefinitionDialog(null)}>取消</button>
              <button type="button" onClick={groupDeviceDefinitionDialog.mode === "new" ? confirmCreateDeviceFromGroup : confirmReplaceDeviceIconFromGroup}>
                确定
              </button>
            </div>
          </section>
        </div>)}
      {templateDialog && (<div className="image-picker-backdrop" onPointerDown={cancelTemplateDialog}>
          <section className="template-dialog window-close-host" onPointerDown={(event) => event.stopPropagation()} onKeyDown={(event) => { if (event.key === "Escape") { cancelTemplateDialog(); } }} role="dialog" aria-modal="true" aria-labelledby="template-dialog-title">
            <WindowCloseButton label="关闭添加模板窗口" onClick={cancelTemplateDialog} />
            <div className="image-picker-title">
              <div>
                <h2 id="template-dialog-title">添加模板</h2>
                <p>将当前选中的图元组合保存到模板库，后续可按原始尺寸拖拽生成。</p>
              </div>
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
                      {graphTemplateTypes.map((typeName) => (<option key={typeName} value={typeName}>{typeName}</option>))}
                    </select>
                    <button type="button" onClick={createGraphTemplateType}>新增模板类型</button>
                  </div>
                </label>
                <label>
                  <span>模板名字</span>
                  <BufferedTextInput value={templateDraftName} onCommit={setTemplateDraftName} placeholder="请输入模板名字" autoFocus/>
                </label>
              </div>
            </div>
            <div className="template-dialog-actions">
              <button type="button" onClick={cancelTemplateDialog}>取消</button>
              <button type="button" onClick={confirmAddGraphTemplate}>确认</button>
            </div>
          </section>
        </div>)}
      {layerAssignmentDialogOpen && (<div className="image-picker-backdrop" onPointerDown={() => setLayerAssignmentDialogOpen(false)}>
          <section className="layer-assignment-dialog window-close-host" onPointerDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="layer-assignment-title">
            <WindowCloseButton label="关闭图层修改窗口" onClick={() => setLayerAssignmentDialogOpen(false)} />
            <div className="image-picker-title">
              <div>
                <h2 id="layer-assignment-title">图层修改</h2>
                <p>当前选中 {activeSelectedNodeIds.length} 个图元。选择目标图层后，确认应用到这些图元。</p>
              </div>
            </div>
            <label className="layer-assignment-field">
              <span>目标图层</span>
              <select value={layerAssignmentTargetId} onChange={(event) => setLayerAssignmentTargetId(event.target.value)}>
                {layers.map((layer) => (<option key={layer.id} value={layer.id}>
                    {layer.visible ? layer.name : `${layer.name}（隐藏）`}
                  </option>))}
              </select>
            </label>
            <p className="layer-assignment-note">如果目标图层处于隐藏状态，应用后这些图元会按图层显示规则从画布上隐藏。</p>
            <div className="image-picker-actions layer-assignment-actions">
              <button type="button" onClick={() => setLayerAssignmentDialogOpen(false)}>取消</button>
              <button type="button" onClick={applyLayerAssignmentDialog} disabled={activeSelectedNodeIds.length === 0 || !layers.some((layer) => layer.id === layerAssignmentTargetId) || layerAssignmentUnchanged}>
                应用
              </button>
            </div>
          </section>
        </div>)}
      {filterSelectionDialogOpen && (<div className="image-picker-backdrop" onPointerDown={() => setFilterSelectionDialogOpen(false)}>
          <section className="filter-selection-dialog window-close-host" onPointerDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="filter-selection-title">
            <WindowCloseButton label="关闭过滤选择窗口" onClick={() => setFilterSelectionDialogOpen(false)} />
            <div className="image-picker-title">
              <div>
                <h2 id="filter-selection-title">过滤选择</h2>
                <p>类列表：{filterSelectionTypeOptions.length} 类，已选择 {filterSelectionTypeKeys.length} 种。</p>
              </div>
            </div>
            <div className="filter-selection-toolbar">
              <button type="button" onClick={() => setFilterSelectionTypeKeys(filterSelectionTypeOptions.flatMap((option) => option.items.map((item) => item.itemKey)))}>全选</button>
              <button type="button" onClick={() => setFilterSelectionTypeKeys([])}>清空</button>
            </div>
            <div className="filter-selection-list" role="group" aria-label="类列表">
              {filterSelectionTypeOptions.map((option) => (<div key={option.typeKey} className="filter-selection-option">
                  <label className="filter-selection-type-row">
                    <input type="checkbox" ref={(input) => {
                if (input) {
                    input.indeterminate = filterSelectionTypePartial(option);
                }
            }} checked={filterSelectionTypeSelected(option)} onChange={() => toggleFilterSelectionType(option.typeKey)}/>
                    <span>
                      <strong>{filterSelectionTreeLabel(option.label, option.typeKey)}</strong>
                    </span>
                    <em>{option.count}</em>
                  </label>
                  <div className="filter-selection-tree" aria-label={`${option.label}类树`}>
                    <div className="filter-selection-tree-children">
                      {option.items.map((item) => (<div key={item.itemKey} className="filter-selection-tree-child" title={filterSelectionTreeLabel(item.label, item.typeKey)}>
                          <label className="filter-selection-kind-row">
                            <input type="checkbox" checked={filterSelectionTypeKeys.includes(item.itemKey)} onChange={() => toggleFilterSelectionItem(item.itemKey)}/>
                            <span>
                              <strong>{filterSelectionTreeLabel(item.label, item.typeKey)}</strong>
                            </span>
                            <em>{item.count}</em>
                          </label>
                        </div>))}
                    </div>
                  </div>
                </div>))}
            </div>
            <div className="template-dialog-actions">
              <button type="button" onClick={() => setFilterSelectionDialogOpen(false)}>取消</button>
              <button type="button" disabled={filterSelectionTypeKeys.length === 0} onClick={confirmFilterSelectionDialog}>确认选择</button>
            </div>
          </section>
        </div>)}
      {ENABLE_REACT_FLOW_PREVIEW && ReactFlowPreview && reactFlowPreviewOpen && (<div className="image-picker-backdrop react-flow-preview-backdrop" onPointerDown={() => setReactFlowPreviewOpen(false)}>
          <section className="react-flow-preview-dialog window-close-host" onPointerDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="react-flow-preview-title">
            <WindowCloseButton label="关闭React Flow预览" onClick={() => setReactFlowPreviewOpen(false)} />
            <div className="image-picker-title">
              <div>
                <h2 id="react-flow-preview-title">React Flow 预览</h2>
                <p>开发态验证入口：仅展示当前可见模型，主画布、拓扑、布线和导出逻辑保持不变。</p>
              </div>
            </div>
            <div className="react-flow-preview-stage">
              <Suspense fallback={<div className="react-flow-preview-loading">正在加载 React Flow 预览...</div>}>
                <ReactFlowPreview nodes={visibleNodes} edges={visibleEdges}/>
              </Suspense>
            </div>
          </section>
        </div>)}
      {colorPaletteDialogOpen && (<div className="image-picker-backdrop" onPointerDown={() => setColorPaletteDialogOpen(false)}>
          <section className="color-palette-dialog window-close-host" onPointerDown={(event) => event.stopPropagation()}>
            <WindowCloseButton label="关闭配色设置" onClick={() => setColorPaletteDialogOpen(false)} />
            <div className="image-picker-title">
              <div>
                <h2>配色设置</h2>
                <p>配置能流类型和电压等级颜色，保存后用于图元、端子、联络线和导出图形。</p>
              </div>
            </div>
            <div className="color-palette-tabs" role="tablist" aria-label="配色方式">
              <button className={colorPaletteTab === "energy" ? "active" : ""} onClick={() => {
            setColorPaletteTab("energy");
            toggleColorDisplayMode("energy");
        }} type="button">
                按能流类型
              </button>
              <button className={colorPaletteTab === "voltage" ? "active" : ""} onClick={() => {
            setColorPaletteTab("voltage");
            toggleColorDisplayMode("voltage");
        }} type="button">
                按电压等级
              </button>
            </div>
            {colorPaletteTab === "energy" ? (<div className="color-palette-table" aria-label="能流类型配色">
                {ENERGY_COLOR_ROWS.map((row) => {
                const color = colorPaletteDraft.energy[row.type] ?? DEFAULT_COLOR_PALETTE.energy[row.type];
                return (<label className="color-palette-row" key={row.type}>
                      <span>{row.label}</span>
                      <DeferredColorInput value={color} fallback={DEFAULT_COLOR_PALETTE.energy[row.type]} onCommit={(value) => updateEnergyColor(row.type, value)} aria-label={`${row.label}颜色`}/>
                      <BufferedTextInput value={color} onCommit={(nextValue) => updateEnergyColor(row.type, nextValue)} aria-label={`${row.label}颜色值`}/>
                    </label>);
            })}
              </div>) : (<div className="voltage-color-panel">
                <div className="voltage-color-toolbar" role="group" aria-label="电压等级显示范围">
                  <button type="button" className={voltageColorVisibility === "all" ? "active" : ""} onClick={() => setVoltageColorVisibility("all")}>
                    全部电压等级
                  </button>
                  <button type="button" className={voltageColorVisibility === "current" ? "active" : ""} onClick={() => setVoltageColorVisibility("current")}>
                    当前模型电压等级
                  </button>
                  <span>{`当前模型 ${currentModelVoltageColorKeys.size} 项`}</span>
                </div>
                {(() => {
                  const filteredRows = visibleVoltageColorRows.filter((row) => row.type === voltageTab);
                  return (
                    <>
                      <div className="voltage-color-tabs" role="tablist" aria-label="电压类型" style={{ display: "flex", gap: 0, marginBottom: 12, borderBottom: "1px solid #e2e8f0" }}>
                        <button type="button" onClick={() => setVoltageTab("ac")} style={{ padding: "8px 16px", border: "none", borderBottom: voltageTab === "ac" ? "2px solid #2563eb" : "2px solid transparent", background: "none", cursor: "pointer", fontWeight: voltageTab === "ac" ? 600 : 400, color: voltageTab === "ac" ? "#2563eb" : "#64748b" }}>交流</button>
                        <button type="button" onClick={() => setVoltageTab("dc")} style={{ padding: "8px 16px", border: "none", borderBottom: voltageTab === "dc" ? "2px solid #2563eb" : "2px solid transparent", background: "none", cursor: "pointer", fontWeight: voltageTab === "dc" ? 600 : 400, color: voltageTab === "dc" ? "#2563eb" : "#64748b" }}>直流</button>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
                        <div className="voltage-color-header" style={{ display: "grid", gridTemplateColumns: "1fr 2fr auto", gap: 12, padding: "6px 12px", borderBottom: "1px solid #e2e8f0", fontWeight: 600, flexShrink: 0 }}>
                          <span>电压基值</span>
                          <span>颜色</span>
                          <span>操作</span>
                        </div>
                        <div className="voltage-color-list" style={{ flex: 1, overflowY: "auto" }}>
                        {filteredRows.length > 0 ? (filteredRows.map((row) => (<div className="voltage-color-row" key={row.key} style={{ display: "grid", gridTemplateColumns: "1fr 2fr auto", gap: 12, padding: "2px 12px", borderBottom: "1px solid #f1f5f9", alignItems: "center" }}>
                              <BufferedTextInput value={row.voltage} onCommit={(nextValue) => updateVoltageColorRow(row.key, { voltage: nextValue })} aria-label="电压基值"/>
                              <div className="color-field" style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                <DeferredColorInput value={row.color} fallback="#64748b" onCommit={(value) => updateVoltageColorRow(row.key, { color: value })} aria-label={`${row.type.toUpperCase()} ${row.voltage}颜色`}/>
                                <BufferedTextInput value={row.color} onCommit={(nextValue) => updateVoltageColorRow(row.key, { color: nextValue })} aria-label={`${row.type.toUpperCase()} ${row.voltage}颜色值`}/>
                              </div>
                              <button type="button" onClick={() => deleteVoltageColorRow(row.key)} style={{ padding: "4px 8px" }}>删除</button>
                            </div>))) : (<div className="voltage-color-empty" style={{ padding: 12, textAlign: "center", color: "#94a3b8" }}>当前模型暂无{voltageTab === "ac" ? "交流" : "直流"}电压等级。</div>)}
                        </div>
                      </div>
                    </>
                  );
                })()}
                {voltageColorVisibility === "all" && (<div style={{ display: "flex", justifyContent: "center", padding: "6px 0" }}><button type="button" className="secondary-action" onClick={() => setVoltageLevelDialogOpen(true)} style={{ padding: "4px 10px", minWidth: "auto" }}>新增电压等级</button></div>)}
              </div>)}
            <div className="image-picker-actions color-palette-actions">
              <button type="button" onClick={colorPaletteTab === "energy" ? resetEnergyColors : resetVoltageColors}>
                {colorPaletteTab === "energy" ? "恢复默认能流配色" : "恢复默认电压配色"}
              </button>
              <button type="button" onClick={saveColorPalette}>保存</button>
            </div>
          </section>
        </div>)}
      {voltageLevelDialogOpen && (
        <VoltageLevelDialog
          open={voltageLevelDialogOpen}
          onClose={() => setVoltageLevelDialogOpen(false)}
          settings={voltageLevelSettings}
          onSave={(next) => {
            setVoltageLevelSettings(next);
            // 更新颜色配置中的电压等级
            const updatedVoltage: Record<string, string> = {};
            next.ac.forEach((row) => { updatedVoltage[`ac:${row.name}`] = colorPaletteDraft.voltage[`ac:${row.name}`] ?? "#64748b"; });
            next.dc.forEach((row) => { updatedVoltage[`dc:${row.name}`] = colorPaletteDraft.voltage[`dc:${row.name}`] ?? "#64748b"; });
            setColorPaletteDraft({ ...colorPaletteDraft, voltage: updatedVoltage });
          }}
        />
      )}
  </>);
}, areViewSectionPropsEqual);
