// @ts-nocheck
import { MemoizedViewSection } from "./appViewRenderBoundary";
import { InlineEditableValue } from "../components/InputComponents";
import { BUILTIN_VOLTAGE_LEVELS, formatPowerBaseDisplayValue } from "../model";
import { firstNonZeroVoltageBase } from "../model-eexport";
import { getTerminalVoltageLevel } from "../model-routing";
import { VOLTAGE_BASE_PARAM_KEYS } from "./appCoreCanvasUtilities";

// 参数字段 → 单位后缀映射
const PARAM_UNIT_SUFFIX: Record<string, string> = {
  rated_voltage: "kV",
  i_vbase: "kV",
  j_vbase: "kV",
  k_vbase: "kV",
  vbase: "kV",
  rated_capacity: "MW",
  i_rated_capacity: "MW",
  k_rated_capacity: "MW",
  j_rated_capacity: "MW",
  high_rated_capacity: "MW",
  medium_rated_capacity: "MW",
  low_rated_capacity: "MW",
  activePower: "MW",
  reactivePower: "Mvar",
  ratedPower: "MW",
  i_max: "A",
  i_i_max: "A",
  k_i_max: "A",
  j_i_max: "A",
  high_i_max: "A",
  medium_i_max: "A",
  low_i_max: "A",
  water_volume: "m³",
  pressure_max: "MPa",
  pressure_min: "MPa",
  pressure_set: "MPa",
  flow_max: "Nm³/h",
  flow_min: "Nm³/h",
  flow_set: "Nm³/h",
  cut_in_wind_speed: "m/s",
  rated_wind_speed: "m/s",
  cut_out_wind_speed: "m/s"
};

function getParamUnitSuffix(key: string): string | null {
  return PARAM_UNIT_SUFFIX[key] ?? null;
}

const PLAIN_NUMERIC_VALUE_PATTERN = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/;
const NUMERIC_SUFFIX_VALUE_PATTERN = /^([+-]?(?:\d+(?:\.\d*)?|\.\d+))([%°])$/;

function formatAtMostThreeDecimals(value: string): string {
  const text = String(value ?? "").trim();
  const suffixMatch = text.match(NUMERIC_SUFFIX_VALUE_PATTERN);
  if (suffixMatch) {
    const numericValue = Number(suffixMatch[1]);
    return Number.isFinite(numericValue)
      ? `${numericValue.toFixed(3).replace(/\.?(0+)$/, "")}${suffixMatch[2]}`
      : text;
  }
  if (!PLAIN_NUMERIC_VALUE_PATTERN.test(text)) {
    return text;
  }
  const numericValue = Number(text);
  return Number.isFinite(numericValue)
    ? numericValue.toFixed(3).replace(/\.?(0+)$/, "")
    : text;
}

function stripParamUnit(value: string, key: string): string {
  const unit = getParamUnitSuffix(key);
  const escapedUnit = unit ? unit.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") : "";
  const suffixPattern = escapedUnit ? `(?:${escapedUnit}|[%°])` : "(?:[%°])";
  return value.replace(new RegExp(`\\s*${suffixPattern}$`), "").trim();
}

function formatInspectorDisplayValue(key: string, value: string | number): string {
  const normalized = formatPowerBaseDisplayValue(key, String(value ?? ""));
  return formatAtMostThreeDecimals(stripParamUnit(normalized, key));
}

// 电压等级下拉选项：内置电压等级 + 当前值（若不在内置列表则追加，避免下拉空白）
function voltageBaseSelectOptions(currentValue: string): string[] {
  return BUILTIN_VOLTAGE_LEVELS.includes(currentValue)
    ? BUILTIN_VOLTAGE_LEVELS
    : [currentValue, ...BUILTIN_VOLTAGE_LEVELS];
}

type AppRightPanelProps = {
  scope: Record<string, any>;
  inputs: readonly unknown[];
};

export function AppRightPanel({ scope, inputs }: AppRightPanelProps) {
  return (
    <MemoizedViewSection
      section="right-panel"
      inputs={inputs}
      render={() => <AppRightPanelContent scope={scope} />}
    />
  );
}

function AppRightPanelContent({ scope }: { scope: Record<string, any> }) {
  const __appScope = scope;
  const {
    ALLOW_RESIZE_TRANSFORM_PARAM,
    Bold,
    BufferedTextInput,
    BufferedTextarea,
    Cable,
    CURRENT_UNIT_OPTIONS,
    DEFAULT_CANVAS_BACKGROUND,
    DEFAULT_DEVICE_LABEL_FONT_SIZE,
    DEFAULT_MODEL_LAYER_ID,
    DEFAULT_POWER_BASE_VALUE,
    DeferredColorInput,
    FileJson,
    Fragment,
    IMAGE_FIT_MODE_OPTIONS,
    MAX_CANVAS_HEIGHT,
    MAX_CANVAS_WIDTH,
    MIN_CANVAS_HEIGHT,
    MIN_CANVAS_WIDTH,
    PARAM_LABELS,
    POWER_UNIT_OPTIONS,
    READONLY_E_PARAM_KEYS,
    Save,
    STATIC_ROUTE_AVOIDANCE_PARAM,
    TextStyleToggleButton,
    Trash2,
    Underline,
    VOLTAGE_UNIT_OPTIONS,
    activeSelectedNodeIds,
    allowAutoExpandCanvas,
    backgroundLayerIds,
    backgroundLayerOptions,
    backgroundProjectId,
    backgroundProjectOptions,
    backgroundProjectRecord,
    batchEditors,
    canvasBackgroundColor,
    canvasBackgroundImage,
    canvasSizeDraft,
    clearSelectedImageForNode,
    colorPalette,
    commitCanvasSizeDraft,
    currentModelRecord,
    currentUnit,
    customComponentLibraries,
    defaultBackgroundLayerIdsForProject,
    deviceDefinitionOverrides,
    enumSelectOptionsWithCurrentValue,
    feeder,
    formatDeviceModelParamDisplayValue,
    formatInspectorScaleValue,
    getEParamValue,
    getEParameterKeys,
    getNodeScaleX,
    getNodeScaleY,
    handleSidePanelPointerLeave,
    hasBatchCommonPropertyRows,
    inspectorGraphId,
    inspectorSelectedEdge,
    inspectorSelectedNode,
    inspectorTab,
    inspectorTabShowsDevicePanel,
    inspectorTopologyEntry,
    invalidEnumOptionLabel,
    Italic,
    isBrowseMode,
    isBusNode,
    isStaticBoxLikeNode,
    layers,
    libraryTemplates,
    modelAssociationDevicesModelTypeFailureMessage,
    modelType,
    nodeById,
    nodeKindAllowsResizeTransform,
    nodeLabelDisplayMode,
    nodeLabelOffset,
    nodeLabelTextAnchor,
    nodes,
    normalizeImageFitMode,
    normalizeNodeLabelRotation,
    normalizeScale,
    normalizeStaticBoxDimension,
    paramOptionsForSection,
    parseCustomDefinitions,
    powerBaseValue,
    powerUnit,
    projectById,
    projectName,
    pushUndoSnapshot,
    renderElementTreePanel,
    renderSelectedNodeMeasurementTable,
    renderSidePanelModeControls,
    resolveContainerParameterViewComponentLibrary,
    resolveDeviceModelPanelDefinitionGroups,
    resolveDeviceModelPanelDevType,
    resolveDeviceModelPanelParameterKeys,
    rightPanelRef,
    rightPanelVisible,
    selectedContainerParameterView,
    selectedContainerParameterViews,
    selectedDeviceInfoView,
    selectedSchemeRecord,
    setAllowAutoExpandCanvas,
    setBackgroundLayerIds,
    setBackgroundProjectId,
    setCanvasBackgroundColor,
    setCanvasBackgroundImage,
    setCanvasBackgroundImageAssetId,
    setContainerParamViewId,
    setCurrentUnit,
    setFeeder,
    setImageTarget,
    setInspectorTab,
    setModelType,
    setPowerBaseValue,
    setPowerUnit,
    setSelectedDeviceInfoView,
    setSubcontrolarea,
    setSubstation,
    setTaiqu,
    setVoltageUnit,
    singleSelectedDeviceForInspector,
    startSidePanelResize,
    staticNodeParticipatesInRoutingAvoidance,
    stopSidePanelEventPropagation,
    subcontrolarea,
    substation,
    taiqu,
    terminalColor,
    terminalVoltageBaseNumber,
    toggleBackgroundLayer,
    updateAutoPanelVisibility,
    updateParam,
    updateSelectedNode,
    undoScopeForGraphPatch,
    voltageUnit,
    edges,
    setVoltageBaseValuesForScope,
    patchGraphNodes
  } = scope;

  // Compare inspector values with the persisted model record. The live graph
  // changes on every edit, so the dirty-render baseline is intentionally not
  // used here; the saved record remains stable until the next save.
  const savedNodeById = new Map(
    (Array.isArray(currentModelRecord?.project?.nodes) ? currentModelRecord.project.nodes : [])
      .map((node) => [node.id, node])
  );
  const comparableParamValue = (node: any, key: string, definition?: any): string => {
    if (!node) {
      return "";
    }
    if (key === "name") {
      return String(node.name ?? "");
    }
    if (key === "dev_type") {
      return String(resolveDeviceModelPanelDevType(node.kind, node.params) ?? "");
    }
    const params = node.params ?? {};
    const hasOwnValue = Object.prototype.hasOwnProperty.call(params, key);
    const eKeys = getEParameterKeys(node.kind, params);
    const resolved = eKeys.length > 0 ? getEParamValue(key, node) : params[key] ?? "";
    return !hasOwnValue && resolved === "" ? String(definition?.typicalValue ?? "") : String(resolved ?? "");
  };
  const parameterValuesEqual = (left: unknown, right: unknown): boolean => {
    const leftText = String(left ?? "").trim();
    const rightText = String(right ?? "").trim();
    if (leftText === rightText) {
      return true;
    }
    const numericPattern = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/;
    if (numericPattern.test(leftText) && numericPattern.test(rightText)) {
      const leftNumber = Number(leftText);
      const rightNumber = Number(rightText);
      return Number.isFinite(leftNumber) && Number.isFinite(rightNumber) && leftNumber === rightNumber;
    }
    return false;
  };
  const isInspectorParamModified = (key: string, currentValue: unknown, definition?: any, node = inspectorSelectedNode): boolean => {
    const savedNode = node ? savedNodeById.get(node.id) : undefined;
    return Boolean(savedNode) && !parameterValuesEqual(currentValue, comparableParamValue(savedNode, key, definition));
  };

  // 电压等级下拉行：仅电气设备（含 ac/dc 端子）显示；写入按设备电压设置模式（uniform→params.vbase，terminal→侧电压）
  // 是否渲染由调用处决定（若设备已有 vbase/i_vbase/k_vbase/j_vbase 参数则不重复添加）
  const renderVoltageBaseRow = () => {
    const node = inspectorSelectedNode;
    const isElectricNode = node
      ? (node.terminals?.some((terminal) => terminal.type === "ac" || terminal.type === "dc") || isBusNode(node))
      : false;
    if (!node || !isElectricNode) {
      return null;
    }
    const electricalTerminal = node.terminals.find((terminal) => terminal.type === "ac" || terminal.type === "dc");
    const electricalTerminalId = electricalTerminal?.id;
    const explicitVbase = terminalVoltageBaseNumber(node.params?.vbase);
    const fallbackVoltage = firstNonZeroVoltageBase([
      node.params?.voltage_level,
      node.params?.rated_voltage,
      node.params?.voltage
    ]);
    const currentValue = explicitVbase && explicitVbase !== "0"
      ? explicitVbase
      : (fallbackVoltage || (electricalTerminalId ? getTerminalVoltageLevel(node, electricalTerminalId) : ""));
    const normalizedCurrent = terminalVoltageBaseNumber(currentValue) || "0";
    const options = voltageBaseSelectOptions(normalizedCurrent);
    return (
      <tr>
        {batchEditors.renderChineseParamHeader("vbase", "电压等级")}
        <td>
          <InlineEditableValue
            value={normalizedCurrent}
            displayValue={formatAtMostThreeDecimals(normalizedCurrent)}
            modified={isInspectorParamModified("vbase", normalizedCurrent)}
            disabled={isBrowseMode}
            options={options.map((level) => ({ value: level, label: level }))}
            onCommit={(nextValue) => {
                if (nextValue === normalizedCurrent) {
                  return;
                }
                // 电压等级扩散以拓扑岛为范围：整岛统一为新值
                const result = setVoltageBaseValuesForScope(nodes, edges, [node.id], "island", nextValue);
                if (result.changedNodeIds.length === 0) {
                  return;
                }
                pushUndoSnapshot(true, false, undoScopeForGraphPatch(result.changedNodeIds, []));
                patchGraphNodes(result.nodeUpdates);
              }}
          />
        </td>
      </tr>
    );
  };

  return (
<aside ref={rightPanelRef} className={`inspector-panel floating-side-panel ${rightPanelVisible ? "visible" : "hidden"}`} onPointerDown={stopSidePanelEventPropagation} onPointerMoveCapture={stopSidePanelEventPropagation} onPointerMove={stopSidePanelEventPropagation} onPointerEnter={() => updateAutoPanelVisibility("right", "panel-enter")} onPointerLeave={(event) => handleSidePanelPointerLeave("right", event)} onMouseMoveCapture={stopSidePanelEventPropagation} onMouseMove={stopSidePanelEventPropagation} onClick={stopSidePanelEventPropagation} onDoubleClick={stopSidePanelEventPropagation} onContextMenu={stopSidePanelEventPropagation} onKeyDown={stopSidePanelEventPropagation} onKeyUp={stopSidePanelEventPropagation}>
        <div className="side-panel-resize-handle left-edge" role="separator" aria-orientation="vertical" aria-label="调整右侧栏宽度" title="拖拽调整右侧栏宽度" onPointerDown={(event) => startSidePanelResize(event, "right")}/>
        <div className="inspector-title">
          <div className="inspector-title-actions">
            {renderSidePanelModeControls("right")}
          </div>
        </div>
        {inspectorSelectedNode || currentModelRecord ? (<div className={`form-stack ${inspectorTab === "tree" ? "graph-form-stack" : ""}`}>
            <div className="inspector-tabs">
              <button className={inspectorTab === "model" ? "active" : ""} onClick={() => setInspectorTab("model")} disabled={!currentModelRecord}>
                基础
              </button>
              <button className={inspectorTab === "tree" ? "active" : ""} onClick={() => setInspectorTab("tree")}>
                图元树
              </button>
              <button className={inspectorTab === "graph" || inspectorTab === "device" ? "active" : ""} onClick={() => setInspectorTab("graph")}>
                图元
              </button>
            </div>
            {currentModelRecord ? <div hidden={inspectorTab !== "model"}><table className="param-table">
                <tbody>
                  <tr>
                    {batchEditors.renderChineseParamHeader("name", "模型名称")}
                    <td><span className="inline-property-value read-only">{currentModelRecord.name}</span></td>
                  </tr>
                  <tr>
                    {batchEditors.renderChineseParamHeader("schemeName")}
                    <td><span className="inline-property-value read-only">{selectedSchemeRecord?.name ?? "未选择方案"}</span></td>
                  </tr>
                  <tr>
                    {batchEditors.renderChineseParamHeader("updatedAt", "模型更新时间")}
                    <td><span className="inline-property-value read-only">{new Date(currentModelRecord.updatedAt).toLocaleString()}</span></td>
                  </tr>
                  <tr>
                    {batchEditors.renderChineseParamHeader("canvasWidth")}
                    <td>
                      <InlineEditableValue type="number" min={MIN_CANVAS_WIDTH} max={MAX_CANVAS_WIDTH} step="10" value={canvasSizeDraft.width} displayValue={formatAtMostThreeDecimals(String(canvasSizeDraft.width))} disabled={isBrowseMode} onCommit={(nextValue) => commitCanvasSizeDraft({ ...canvasSizeDraft, width: nextValue })}/>
                    </td>
                  </tr>
                  <tr>
                    {batchEditors.renderChineseParamHeader("canvasHeight")}
                    <td>
                      <InlineEditableValue type="number" min={MIN_CANVAS_HEIGHT} max={MAX_CANVAS_HEIGHT} step="10" value={canvasSizeDraft.height} displayValue={formatAtMostThreeDecimals(String(canvasSizeDraft.height))} disabled={isBrowseMode} onCommit={(nextValue) => commitCanvasSizeDraft({ ...canvasSizeDraft, height: nextValue })}/>
                    </td>
                  </tr>
                  <tr>
                    {batchEditors.renderChineseParamHeader("allowAutoExpandCanvas")}
                    <td>
                      <InlineEditableValue
                        value={allowAutoExpandCanvas ? "allow" : "deny"}
                        displayValue={allowAutoExpandCanvas ? "允许" : "不允许"}
                        disabled={isBrowseMode}
                        options={[{ value: "allow", label: "允许" }, { value: "deny", label: "不允许" }]}
                        onCommit={(value) => {
                pushUndoSnapshot();
                setAllowAutoExpandCanvas(value === "allow");
            }}
                      />
                    </td>
                  </tr>
                  <tr>
                    {batchEditors.renderChineseParamHeader("canvasBackgroundColor")}
                    <td>
                      <div className="color-field with-clear">
                        <DeferredColorInput value={canvasBackgroundColor || DEFAULT_CANVAS_BACKGROUND} fallback={DEFAULT_CANVAS_BACKGROUND} disabled={isBrowseMode} onCommit={(value) => {
                pushUndoSnapshot();
                setCanvasBackgroundColor(value);
            }}/>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    {batchEditors.renderChineseParamHeader("canvasBackgroundImage")}
                    <td>
                      <div className="image-field-actions">
                        <span className="inline-property-value read-only">{canvasBackgroundImage ? "已设置" : "未设置"}</span>
                        <button type="button" disabled={isBrowseMode} onClick={() => setImageTarget({ kind: "canvas" })}>选择</button>
                        <button type="button" onClick={() => {
                pushUndoSnapshot();
                setCanvasBackgroundImage("");
                setCanvasBackgroundImageAssetId("");
                __appScope.setCanvasBackgroundImageFit?.("cover");
            }} disabled={isBrowseMode || !canvasBackgroundImage}>
                          清除
                        </button>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    {batchEditors.renderChineseParamHeader("canvasBackgroundImageFit")}
                    <td>
                      <InlineEditableValue
                        value={normalizeImageFitMode(__appScope.canvasBackgroundImageFit)}
                        displayValue={IMAGE_FIT_MODE_OPTIONS.find((option) => option.value === normalizeImageFitMode(__appScope.canvasBackgroundImageFit))?.label ?? normalizeImageFitMode(__appScope.canvasBackgroundImageFit)}
                        disabled={isBrowseMode}
                        options={IMAGE_FIT_MODE_OPTIONS.map((option) => ({ value: option.value, label: option.label }))}
                        onCommit={(value) => {
                pushUndoSnapshot();
                __appScope.setCanvasBackgroundImageFit?.(value);
            }}
                      />
                    </td>
                  </tr>
                  <tr>
                    {batchEditors.renderChineseParamHeader("backgroundProjectId")}
                    <td>
                      <div className="background-page-field">
                        <InlineEditableValue
                          value={backgroundProjectId}
                          displayValue={backgroundProjectOptions.find(({ project }) => project.id === backgroundProjectId)?.label ?? "不使用背景页面"}
                          disabled={isBrowseMode}
                          options={[
                            { value: "", label: "不使用背景页面" },
                            ...backgroundProjectOptions.map(({ project, label }) => ({ value: project.id, label }))
                          ]}
                        onCommit={(nextProjectId) => {
                pushUndoSnapshot();
                setBackgroundProjectId(nextProjectId);
                const backgroundProject = projectById.get(nextProjectId);
                if (backgroundProject) {
                    setBackgroundLayerIds(defaultBackgroundLayerIdsForProject(backgroundProject.project));
                }
                else {
                    setBackgroundLayerIds([]);
                }
            }}
                        />
                        <button type="button" title="清空背景页面" onClick={() => {
                pushUndoSnapshot();
                setBackgroundProjectId("");
                setBackgroundLayerIds([]);
            }} disabled={isBrowseMode || !backgroundProjectId} className="background-page-clear-btn">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    {batchEditors.renderChineseParamHeader("backgroundLayerIds")}
                    <td>
                      {backgroundProjectRecord ? (<div className="background-layer-checklist">
                          {backgroundLayerOptions.map((layer) => (<label key={layer.id} className="background-layer-option">
                              <input type="checkbox" checked={backgroundLayerIds.includes(layer.id)} disabled={isBrowseMode} onChange={() => toggleBackgroundLayer(layer.id)}/>
                              <span>{layer.name}</span>
                            </label>))}
                          {backgroundLayerOptions.length === 0 && <span className="muted-inline-text">背景页面没有可配置图层</span>}
                        </div>) : (<span className="muted-inline-text">未设置背景页面</span>)}
                    </td>
                  </tr>
                  <tr>
                    {batchEditors.renderChineseParamHeader("powerUnit")}
                    <td>
                      <InlineEditableValue
                        value={powerUnit}
                        displayValue={powerUnit}
                        disabled={isBrowseMode}
                        options={POWER_UNIT_OPTIONS.map((unit) => ({ value: unit, label: unit }))}
                        onCommit={(value) => {
                pushUndoSnapshot();
                setPowerUnit(value);
            }}
                      />
                    </td>
                  </tr>
                  <tr>
                    {batchEditors.renderChineseParamHeader("voltageUnit")}
                    <td>
                      <InlineEditableValue
                        value={voltageUnit}
                        displayValue={voltageUnit}
                        disabled={isBrowseMode}
                        options={VOLTAGE_UNIT_OPTIONS.map((unit) => ({ value: unit, label: unit }))}
                        onCommit={(value) => {
                pushUndoSnapshot();
                setVoltageUnit(value);
            }}
                      />
                    </td>
                  </tr>
                  <tr>
                    {batchEditors.renderChineseParamHeader("currentUnit")}
                    <td>
                      <InlineEditableValue
                        value={currentUnit}
                        displayValue={currentUnit}
                        disabled={isBrowseMode}
                        options={CURRENT_UNIT_OPTIONS.map((unit) => ({ value: unit, label: unit }))}
                        onCommit={(value) => {
                pushUndoSnapshot();
                setCurrentUnit(value);
            }}
                      />
                    </td>
                  </tr>
                  <tr>
                    {batchEditors.renderChineseParamHeader("powerBaseValue")}
                    <td>
                        <InlineEditableValue
                          type="number"
                          min="0"
                          step="0.1"
                          value={powerBaseValue}
                          displayValue={formatAtMostThreeDecimals(String(powerBaseValue))}
                          disabled={isBrowseMode}
                          onCommit={(nextValue) => {
                pushUndoSnapshot();
                const numericValue = Number(nextValue);
                setPowerBaseValue(Number.isFinite(numericValue) ? numericValue : DEFAULT_POWER_BASE_VALUE);
            }}
                        />
                    </td>
                  </tr>
                  <tr>
                    {batchEditors.renderChineseParamHeader("subcontrolarea")}
                    <td>
                      <InlineEditableValue type="text" value={subcontrolarea} displayValue={subcontrolarea} disabled={isBrowseMode} onCommit={(nextValue) => {
                pushUndoSnapshot();
                setSubcontrolarea(nextValue);
            }}/>
                    </td>
                  </tr>
                  <tr>
                    {batchEditors.renderChineseParamHeader("modelType")}
                    <td>
                      <InlineEditableValue
                        value={modelType}
                        displayValue={modelType || "请选择"}
                        disabled={isBrowseMode}
                        options={[
                          { value: "", label: "请选择" },
                          { value: "厂站", label: "厂站" },
                          { value: "馈线", label: "馈线" },
                          { value: "台区", label: "台区" }
                        ]}
                        onCommit={(nextType) => {
                const modelTypeFailureMessage = modelAssociationDevicesModelTypeFailureMessage(nextType, nodes);
                if (modelTypeFailureMessage) {
                  showGlobalMessage(modelTypeFailureMessage);
                  return;
                }
                pushUndoSnapshot();
                setModelType(nextType);
                if (nextType === "厂站") {
                  setSubstation(projectName);
                } else if (nextType === "馈线") {
                  setSubstation("默认厂站");
                  setFeeder(projectName);
                } else if (nextType === "台区") {
                  setSubstation("默认厂站");
                  setFeeder("默认馈线");
                  setTaiqu(projectName);
                }
            }}
                      />
                    </td>
                  </tr>
                  {(modelType === "厂站" || modelType === "馈线" || modelType === "台区") && (<tr>
                    {batchEditors.renderChineseParamHeader("substation")}
                    <td>
                      <InlineEditableValue type="text" value={substation} displayValue={substation} disabled={isBrowseMode} onCommit={(nextValue) => {
                pushUndoSnapshot();
                setSubstation(nextValue);
            }}/>
                    </td>
                  </tr>)}
                  {(modelType === "馈线" || modelType === "台区") && (<tr>
                    {batchEditors.renderChineseParamHeader("feeder")}
                    <td>
                      <InlineEditableValue type="text" value={feeder} displayValue={feeder} disabled={isBrowseMode} onCommit={(nextValue) => {
                pushUndoSnapshot();
                setFeeder(nextValue);
            }}/>
                    </td>
                  </tr>)}
                  {modelType === "台区" && (<tr>
                    {batchEditors.renderChineseParamHeader("taiqu", "台区")}
                    <td>
                      <InlineEditableValue type="text" value={taiqu} displayValue={taiqu} disabled={isBrowseMode} onCommit={(nextValue) => {
                pushUndoSnapshot();
                setTaiqu(nextValue);
            }}/>
                    </td>
                  </tr>)}
                </tbody>
              </table></div> : null}{inspectorTab === "tree" ? (renderElementTreePanel()) : inspectorTab === "graph" ? ((() => {
            const multiNodeGraphSelection = activeSelectedNodeIds.length > 1;
            const selectedNodeAllowsIndependentScale = inspectorSelectedNode
                ? nodeKindAllowsResizeTransform(inspectorSelectedNode.kind)
                : true;
            return (<div className="graph-info-panel">
                <div className="graph-info-toolbar" role="tablist" aria-label="图元属性分类">
                  <button type="button" className={multiNodeGraphSelection ? "" : "active"} onClick={() => setInspectorTab("graph")} role="tab" aria-selected={!multiNodeGraphSelection} disabled={multiNodeGraphSelection || !inspectorSelectedNode}>
                    图形
                  </button>
                  <button type="button" className="" onClick={() => {
                    setInspectorTab("device");
                    setSelectedDeviceInfoView("model");
                }} role="tab" aria-selected={false} disabled={multiNodeGraphSelection || !inspectorSelectedNode || __appScope.isStaticGraphicNode(inspectorSelectedNode)}>
                    模型
                  </button>
                  <button type="button" className="" onClick={() => {
                    setInspectorTab("device");
                    setSelectedDeviceInfoView("measurement");
                }} role="tab" aria-selected={false} disabled={multiNodeGraphSelection || !inspectorSelectedNode || __appScope.isStaticGraphicNode(inspectorSelectedNode)}>
                    量测
                  </button>
                  {multiNodeGraphSelection && (<button type="button" className="active" role="tab" aria-selected={true}>
                      共同属性
                    </button>)}
                </div>
                {multiNodeGraphSelection ? (<div className="batch-common-scroll-area">
                    {hasBatchCommonPropertyRows ? batchEditors.renderBatchCommonPropertyPanel() : (<div className="empty-state compact">
                        <FileJson size={24}/>
                        <p>当前选中的图元没有可批量修改的共同属性。</p>
                      </div>)}
                  </div>) : inspectorSelectedNode ? (<div className="graph-param-table-wrap">
                  <table className="param-table">
                  <tbody>
                    <tr>
                      {batchEditors.renderChineseParamHeader("graph_id", "ID")}
                      <td>
                        <span
                          className="id-copy-cell"
                          title="点击复制 ID"
                          onClick={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            navigator.clipboard.writeText(inspectorGraphId).then(() => {
                              const toast = document.createElement("span");
                              toast.className = "id-copy-toast";
                              toast.textContent = "已复制";
                              toast.style.position = "fixed";
                              toast.style.left = (rect.left + rect.width / 2) + "px";
                              toast.style.top = (rect.top + rect.height / 2) + "px";
                              document.body.appendChild(toast);
                              setTimeout(() => toast.remove(), 1000);
                            });
                          }}
                        >{inspectorGraphId}</span>
                      </td>
                    </tr>
                    <tr>
                      {batchEditors.renderChineseParamHeader("graph_x", "X坐标")}
                      <td><InlineEditableValue type="number" value={Math.round(inspectorSelectedNode.position.x)} displayValue={formatAtMostThreeDecimals(String(Math.round(inspectorSelectedNode.position.x)))} disabled={isBrowseMode} onCommit={(nextValue) => updateSelectedNode({ position: { ...inspectorSelectedNode.position, x: Number(nextValue) } })}/></td>
                    </tr>
                    <tr>
                      {batchEditors.renderChineseParamHeader("graph_y", "Y坐标")}
                      <td><InlineEditableValue type="number" value={Math.round(inspectorSelectedNode.position.y)} displayValue={formatAtMostThreeDecimals(String(Math.round(inspectorSelectedNode.position.y)))} disabled={isBrowseMode} onCommit={(nextValue) => updateSelectedNode({ position: { ...inspectorSelectedNode.position, y: Number(nextValue) } })}/></td>
                    </tr>
                    {isStaticBoxLikeNode(inspectorSelectedNode) && (<>
                        <tr>
                          {batchEditors.renderChineseParamHeader("staticWidth", "宽度")}
                          <td>
                            <InlineEditableValue type="number" min="4" max={MAX_CANVAS_WIDTH} step="1" value={Math.round(inspectorSelectedNode.size.width * 10) / 10} displayValue={formatAtMostThreeDecimals(String(Math.round(inspectorSelectedNode.size.width * 10) / 10))} disabled={isBrowseMode} onCommit={(nextValue) => {
                            const width = normalizeStaticBoxDimension(Number(nextValue), inspectorSelectedNode.size.width, MAX_CANVAS_WIDTH);
                            updateSelectedNode({ size: { ...inspectorSelectedNode.size, width: width } });
                        }}/>
                          </td>
                        </tr>
                        <tr>
                          {batchEditors.renderChineseParamHeader("staticHeight", "高度")}
                          <td>
                            <InlineEditableValue type="number" min="4" max={MAX_CANVAS_HEIGHT} step="1" value={Math.round(inspectorSelectedNode.size.height * 10) / 10} displayValue={formatAtMostThreeDecimals(String(Math.round(inspectorSelectedNode.size.height * 10) / 10))} disabled={isBrowseMode} onCommit={(nextValue) => {
                            const height = normalizeStaticBoxDimension(Number(nextValue), inspectorSelectedNode.size.height, MAX_CANVAS_HEIGHT);
                            updateSelectedNode({ size: { ...inspectorSelectedNode.size, height: height } });
                        }}/>
                          </td>
                        </tr>
                      </>)}
                    <tr>
                      {batchEditors.renderChineseParamHeader("rotation")}
                      <td><InlineEditableValue type="number" value={inspectorSelectedNode.rotation} displayValue={formatAtMostThreeDecimals(String(inspectorSelectedNode.rotation))} disabled={isBrowseMode} onCommit={(nextValue) => updateSelectedNode({ rotation: Number(nextValue) })}/></td>
                    </tr>
                    <tr>
                      {batchEditors.renderChineseParamHeader("scaleX")}
                      <td><InlineEditableValue type="number" step="0.1" value={formatInspectorScaleValue(getNodeScaleX(inspectorSelectedNode))} displayValue={formatAtMostThreeDecimals(formatInspectorScaleValue(getNodeScaleX(inspectorSelectedNode)))} disabled={isBrowseMode} onCommit={(nextValue) => {
                        const scaleX = normalizeScale(Number(nextValue), getNodeScaleX(inspectorSelectedNode));
                        const nextScaleY = selectedNodeAllowsIndependentScale
                            ? getNodeScaleY(inspectorSelectedNode)
                            : scaleX;
                        updateSelectedNode({ scale: Math.max(Math.abs(scaleX), Math.abs(nextScaleY)), scaleX, scaleY: nextScaleY });
                    }}/></td>
                    </tr>
                    <tr>
                      {batchEditors.renderChineseParamHeader("scaleY")}
                      <td><InlineEditableValue type="number" step="0.1" value={selectedNodeAllowsIndependentScale ? formatInspectorScaleValue(getNodeScaleY(inspectorSelectedNode)) : formatInspectorScaleValue(getNodeScaleX(inspectorSelectedNode))} displayValue={formatAtMostThreeDecimals(selectedNodeAllowsIndependentScale ? formatInspectorScaleValue(getNodeScaleY(inspectorSelectedNode)) : formatInspectorScaleValue(getNodeScaleX(inspectorSelectedNode)))} disabled={!selectedNodeAllowsIndependentScale} title={!selectedNodeAllowsIndependentScale ? "当前图元不允许变形，纵向倍率跟随横向倍率" : undefined} onCommit={(nextValue) => {
                        const scaleY = normalizeScale(Number(nextValue), getNodeScaleY(inspectorSelectedNode));
                        const scaleX = getNodeScaleX(inspectorSelectedNode);
                        updateSelectedNode({ scale: Math.max(Math.abs(scaleX), Math.abs(scaleY)), scaleX, scaleY });
                    }}/></td>
                    </tr>
                    <tr>
                      {batchEditors.renderChineseParamHeader("layerId", "所属图层")}
                      <td>
                        <InlineEditableValue
                          value={inspectorSelectedNode.layerId ?? DEFAULT_MODEL_LAYER_ID}
                          disabled={isBrowseMode}
                          options={layers.map((layer) => ({ value: layer.id, label: layer.name }))}
                          displayValue={layers.find((layer) => layer.id === (inspectorSelectedNode.layerId ?? DEFAULT_MODEL_LAYER_ID))?.name ?? inspectorSelectedNode.layerId ?? DEFAULT_MODEL_LAYER_ID}
                          onCommit={(value) => updateSelectedNode({ layerId: value })}
                        />
                      </td>
                    </tr>
                    {!__appScope.isStaticGraphicNode(inspectorSelectedNode) && (<>
                        <tr>
                          {batchEditors.renderChineseParamHeader("_labelDisplayMode")}
                          <td>
                            <InlineEditableValue
                              value={nodeLabelDisplayMode(inspectorSelectedNode)}
                              disabled={isBrowseMode}
                              displayValue={{ always: "始终显示", hidden: "始终隐藏", follow: "跟随显示" }[nodeLabelDisplayMode(inspectorSelectedNode)] ?? nodeLabelDisplayMode(inspectorSelectedNode)}
                              options={[
                                { value: "always", label: "始终显示" },
                                { value: "hidden", label: "始终隐藏" },
                                { value: "follow", label: "跟随显示" }
                              ]}
                              onCommit={(value) => updateParam("_labelDisplayMode", value)}
                            />
                          </td>
                        </tr>
                        <tr>
                          {batchEditors.renderChineseParamHeader("_labelText")}
                          <td>
                            <InlineEditableValue value={inspectorSelectedNode.params._labelText ?? inspectorSelectedNode.name} displayValue={inspectorSelectedNode.params._labelText ?? inspectorSelectedNode.name} disabled={isBrowseMode} onCommit={(nextValue) => updateParam("_labelText", nextValue)}/>
                          </td>
                        </tr>
                        <tr>
                          {batchEditors.renderChineseParamHeader("_labelColor")}
                          <td>{batchEditors.renderColorEditor("_labelColor", inspectorSelectedNode.params._labelColor || "#334155", "#334155")}</td>
                        </tr>
                        <tr>
                          {batchEditors.renderChineseParamHeader("_labelFontFamily")}
                          <td>{batchEditors.renderParamEditor("_labelFontFamily", inspectorSelectedNode.params._labelFontFamily || "Arial", false)}</td>
                        </tr>
                        <tr>
                          {batchEditors.renderChineseParamHeader("_labelFontSize")}
                          <td>
                            <InlineEditableValue type="number" min="6" max="96" value={inspectorSelectedNode.params._labelFontSize || String(DEFAULT_DEVICE_LABEL_FONT_SIZE)} displayValue={formatAtMostThreeDecimals(inspectorSelectedNode.params._labelFontSize || String(DEFAULT_DEVICE_LABEL_FONT_SIZE))} disabled={isBrowseMode} onCommit={(nextValue) => updateParam("_labelFontSize", nextValue)}/>
                          </td>
                        </tr>
                        <tr>
                          {batchEditors.renderChineseParamHeader("_labelRotation")}
                          <td>
                            <InlineEditableValue
                              value={String(normalizeNodeLabelRotation(inspectorSelectedNode.params._labelRotation))}
                              disabled={isBrowseMode}
                              displayValue={`${normalizeNodeLabelRotation(inspectorSelectedNode.params._labelRotation)} ${[0, 180].includes(normalizeNodeLabelRotation(inspectorSelectedNode.params._labelRotation)) ? "横排" : "纵排"}`}
                              options={[
                                { value: "0", label: "0° 横排" },
                                { value: "90", label: "90° 纵排" },
                                { value: "180", label: "180° 横排" },
                                { value: "270", label: "270° 纵排" }
                              ]}
                              onCommit={(value) => updateParam("_labelRotation", String(normalizeNodeLabelRotation(value)))}
                            />
                          </td>
                        </tr>
                        <tr>
                          <th>标识样式</th>
                          <td>
                            <div className="device-label-style-actions">
                              <TextStyleToggleButton active={(inspectorSelectedNode.params._labelFontWeight || "500") !== "400"} label="标识加粗" onClick={() => updateParam("_labelFontWeight", (inspectorSelectedNode.params._labelFontWeight || "500") !== "400" ? "400" : "700")}>
                                <Bold aria-hidden="true"/>
                              </TextStyleToggleButton>
                              <TextStyleToggleButton active={(inspectorSelectedNode.params._labelFontStyle || "normal") === "italic"} label="标识斜体" onClick={() => updateParam("_labelFontStyle", (inspectorSelectedNode.params._labelFontStyle || "normal") === "italic" ? "normal" : "italic")}>
                                <Italic aria-hidden="true"/>
                              </TextStyleToggleButton>
                              <TextStyleToggleButton active={(inspectorSelectedNode.params._labelTextDecoration || "none") === "underline"} label="标识下划线" onClick={() => updateParam("_labelTextDecoration", (inspectorSelectedNode.params._labelTextDecoration || "none") === "underline" ? "none" : "underline")}>
                                <Underline aria-hidden="true"/>
                              </TextStyleToggleButton>
                            </div>
                          </td>
                        </tr>
                        <tr>
                          {batchEditors.renderChineseParamHeader("_labelTextAnchor")}
                          <td>
                            <InlineEditableValue
                              value={nodeLabelTextAnchor(inspectorSelectedNode)}
                              disabled={isBrowseMode}
                              displayValue={{ start: "左对齐", middle: "居中", end: "右对齐" }[nodeLabelTextAnchor(inspectorSelectedNode)] ?? nodeLabelTextAnchor(inspectorSelectedNode)}
                              options={[
                                { value: "start", label: "左对齐" },
                                { value: "middle", label: "居中" },
                                { value: "end", label: "右对齐" }
                              ]}
                              onCommit={(value) => updateParam("_labelTextAnchor", value)}
                            />
                          </td>
                        </tr>
                        <tr>
                          {batchEditors.renderChineseParamHeader("_labelX")}
                          <td>
                            <InlineEditableValue type="number" step="0.1" value={nodeLabelOffset(inspectorSelectedNode).x} displayValue={formatAtMostThreeDecimals(String(nodeLabelOffset(inspectorSelectedNode).x))} disabled={isBrowseMode} onCommit={(nextValue) => updateParam("_labelX", nextValue)}/>
                          </td>
                        </tr>
                        <tr>
                          {batchEditors.renderChineseParamHeader("_labelY")}
                          <td>
                            <InlineEditableValue type="number" step="0.1" value={nodeLabelOffset(inspectorSelectedNode).y} displayValue={formatAtMostThreeDecimals(String(nodeLabelOffset(inspectorSelectedNode).y))} disabled={isBrowseMode} onCommit={(nextValue) => updateParam("_labelY", nextValue)}/>
                          </td>
                        </tr>
                        <tr>
                          {batchEditors.renderChineseParamHeader("terminalCount")}
                          <td>
                            <span className="graph-readonly-value" title={isBusNode(inspectorSelectedNode) ? "母线端子数量由已连接联络线端点数自动生成" : "端子数量由元件定义决定"}>
                              {inspectorSelectedNode.terminals.length}
                            </span>
                          </td>
                        </tr>
                      </>)}
                    {__appScope.isStaticGraphicNode(inspectorSelectedNode) && (<>
                        <tr>
                          {batchEditors.renderChineseParamHeader(STATIC_ROUTE_AVOIDANCE_PARAM)}
                          <td>
                            <InlineEditableValue
                              value={staticNodeParticipatesInRoutingAvoidance(inspectorSelectedNode) ? "1" : "0"}
                              disabled={isBrowseMode}
                              displayValue={staticNodeParticipatesInRoutingAvoidance(inspectorSelectedNode) ? "参与" : "不参与"}
                              options={[
                                { value: "1", label: "参与" },
                                { value: "0", label: "不参与" }
                              ]}
                              onCommit={(value) => updateParam(STATIC_ROUTE_AVOIDANCE_PARAM, value)}
                            />
                          </td>
                        </tr>
                        <tr>
                          {batchEditors.renderChineseParamHeader("text")}
                          <td><InlineEditableValue multiline rows={4} value={inspectorSelectedNode.params.text || ""} displayValue={inspectorSelectedNode.params.text || ""} disabled={isBrowseMode} onCommit={(nextValue) => updateParam("text", nextValue)}/></td>
                        </tr>
                        <tr>
                          {batchEditors.renderChineseParamHeader("fontFamily")}
                          <td>{batchEditors.renderParamEditor("fontFamily", inspectorSelectedNode.params.fontFamily || "Arial", false)}</td>
                        </tr>
                        <tr>
                          <th title="fontSize">字体大小（100%）</th>
                          <td><InlineEditableValue type="number" min="8" max="160" value={inspectorSelectedNode.params.fontSize || "24"} displayValue={formatAtMostThreeDecimals(inspectorSelectedNode.params.fontSize || "24")} disabled={isBrowseMode} onCommit={(nextValue) => updateParam("fontSize", nextValue)}/></td>
                        </tr>
                        <tr>
                          <th>文字样式</th>
                          <td>
                            <div className="text-style-actions">
                              <TextStyleToggleButton active={(inspectorSelectedNode.params.fontWeight || "400") !== "400"} label="加粗" onClick={() => updateParam("fontWeight", (inspectorSelectedNode.params.fontWeight || "400") !== "400" ? "400" : "700")}>
                                <Bold aria-hidden="true"/>
                              </TextStyleToggleButton>
                              <TextStyleToggleButton active={(inspectorSelectedNode.params.fontStyle || "normal") === "italic"} label="斜体" onClick={() => updateParam("fontStyle", (inspectorSelectedNode.params.fontStyle || "normal") === "italic" ? "normal" : "italic")}>
                                <Italic aria-hidden="true"/>
                              </TextStyleToggleButton>
                              <TextStyleToggleButton active={(inspectorSelectedNode.params.textDecoration || "none") === "underline"} label="下划线" onClick={() => updateParam("textDecoration", (inspectorSelectedNode.params.textDecoration || "none") === "underline" ? "none" : "underline")}>
                                <Underline aria-hidden="true"/>
                              </TextStyleToggleButton>
                            </div>
                          </td>
                        </tr>
                        <tr>
                          {batchEditors.renderChineseParamHeader("fillColor")}
                          <td>{batchEditors.renderColorEditor("fillColor", inspectorSelectedNode.params.fillColor || "transparent", "#ffffff")}</td>
                        </tr>
                        <tr>
                          {batchEditors.renderChineseParamHeader("strokeColor")}
                          <td>{batchEditors.renderColorEditor("strokeColor", inspectorSelectedNode.params.strokeColor || "transparent", "#334155")}</td>
                        </tr>
                        <tr>
                          {batchEditors.renderChineseParamHeader("textColor")}
                          <td>{batchEditors.renderColorEditor("textColor", inspectorSelectedNode.params.textColor || "#111827", "#111827")}</td>
                        </tr>
                        <tr>
                          {batchEditors.renderChineseParamHeader("lineWidth")}
                          <td><InlineEditableValue type="number" min="0" max="20" value={inspectorSelectedNode.params.lineWidth || "2"} displayValue={formatAtMostThreeDecimals(inspectorSelectedNode.params.lineWidth || "2")} disabled={isBrowseMode} onCommit={(nextValue) => updateParam("lineWidth", nextValue)}/></td>
                        </tr>
                        <tr>
                          {batchEditors.renderChineseParamHeader("strokeStyle")}
                          <td>{batchEditors.renderParamEditor("strokeStyle", inspectorSelectedNode.params.strokeStyle || "solid", false)}</td>
                        </tr>
                        <tr>
                          {batchEditors.renderChineseParamHeader("cornerRadius")}
                          <td><InlineEditableValue type="number" min="0" max="999" value={inspectorSelectedNode.params.cornerRadius || "8"} displayValue={formatAtMostThreeDecimals(inspectorSelectedNode.params.cornerRadius || "8")} disabled={isBrowseMode} onCommit={(nextValue) => updateParam("cornerRadius", nextValue)}/></td>
                        </tr>
                        <tr>
                          {batchEditors.renderChineseParamHeader("accentColor")}
                          <td>{batchEditors.renderColorEditor("accentColor", inspectorSelectedNode.params.accentColor || "#2563eb", "#2563eb")}</td>
                        </tr>
                        <tr>
                          {batchEditors.renderChineseParamHeader("shadowEnabled")}
                          <td>{batchEditors.renderParamEditor("shadowEnabled", inspectorSelectedNode.params.shadowEnabled || "0", false)}</td>
                        </tr>
                        <tr>
                          {batchEditors.renderChineseParamHeader("padding")}
                          <td><InlineEditableValue type="number" min="0" max="120" value={inspectorSelectedNode.params.padding || "12"} displayValue={formatAtMostThreeDecimals(inspectorSelectedNode.params.padding || "12")} disabled={isBrowseMode} onCommit={(nextValue) => updateParam("padding", nextValue)}/></td>
                        </tr>
                        <tr>
                          {batchEditors.renderChineseParamHeader("textAlign")}
                          <td>{batchEditors.renderParamEditor("textAlign", inspectorSelectedNode.params.textAlign || "center", false)}</td>
                        </tr>
                        <tr>
                          {batchEditors.renderChineseParamHeader("verticalAlign")}
                          <td>{batchEditors.renderParamEditor("verticalAlign", inspectorSelectedNode.params.verticalAlign || "middle", false)}</td>
                        </tr>
                        <tr>
                          {batchEditors.renderChineseParamHeader("markerStart")}
                          <td>{batchEditors.renderParamEditor("markerStart", inspectorSelectedNode.params.markerStart || "none", false)}</td>
                        </tr>
                        <tr>
                          {batchEditors.renderChineseParamHeader("markerEnd")}
                          <td>{batchEditors.renderParamEditor("markerEnd", inspectorSelectedNode.params.markerEnd || "none", false)}</td>
                        </tr>
                        <tr>
                          {batchEditors.renderChineseParamHeader("arrowSize")}
                          <td><InlineEditableValue type="number" min="4" max="80" value={inspectorSelectedNode.params.arrowSize || "10"} displayValue={formatAtMostThreeDecimals(inspectorSelectedNode.params.arrowSize || "10")} disabled={isBrowseMode} onCommit={(nextValue) => updateParam("arrowSize", nextValue)}/></td>
                        </tr>
                        <tr>
                          {batchEditors.renderChineseParamHeader("handleColor")}
                          <td>{batchEditors.renderColorEditor("handleColor", inspectorSelectedNode.params.handleColor || "#2563eb", "#2563eb")}</td>
                        </tr>
                        <tr>
                          {batchEditors.renderChineseParamHeader("handleSize")}
                          <td><InlineEditableValue type="number" min="3" max="40" value={inspectorSelectedNode.params.handleSize || "8"} displayValue={formatAtMostThreeDecimals(inspectorSelectedNode.params.handleSize || "8")} disabled={isBrowseMode} onCommit={(nextValue) => updateParam("handleSize", nextValue)}/></td>
                        </tr>
                        {batchEditors.renderStaticButtonActionEditor(inspectorSelectedNode)}
                        <tr>
                          {batchEditors.renderChineseParamHeader("backgroundImage")}
                          <td>
                            <div className="image-field-actions">
                            <span className="inline-property-value read-only">{inspectorSelectedNode.params.backgroundImage ? "已设置" : "未设置"}</span>
                              <button type="button" onClick={() => setImageTarget({ kind: "node", nodeId: inspectorSelectedNode.id })}>选择</button>
                              <button type="button" onClick={() => clearSelectedImageForNode(inspectorSelectedNode.id, "background")} disabled={!inspectorSelectedNode.params.backgroundImage}>清除</button>
                            </div>
                          </td>
                        </tr>
                        <tr>
                          {batchEditors.renderChineseParamHeader("backgroundImageFit")}
                          <td>
                            <InlineEditableValue
                              value={normalizeImageFitMode(inspectorSelectedNode.params.backgroundImageFit)}
                              disabled={isBrowseMode}
                              displayValue={IMAGE_FIT_MODE_OPTIONS.find((option) => option.value === normalizeImageFitMode(inspectorSelectedNode.params.backgroundImageFit))?.label ?? normalizeImageFitMode(inspectorSelectedNode.params.backgroundImageFit)}
                              options={IMAGE_FIT_MODE_OPTIONS.map((option) => ({ value: option.value, label: option.label }))}
                              onCommit={(value) => updateParam("backgroundImageFit", value)}
                            />
                          </td>
                        </tr>
                      </>)}
                    {!__appScope.isStaticGraphicNode(inspectorSelectedNode) && (<>
                        <tr>
                          {batchEditors.renderChineseParamHeader("foregroundColor")}
                          <td>{batchEditors.renderColorEditor("foregroundColor", inspectorSelectedNode.params.foregroundColor || "", terminalColor(inspectorSelectedNode.terminals[0]?.type, colorPalette))}</td>
                        </tr>
                        <tr>
                          {batchEditors.renderChineseParamHeader("foregroundImage")}
                          <td>
                            <div className="image-field-actions">
                            <span className="inline-property-value read-only">{inspectorSelectedNode.params.foregroundImage ? "已设置" : "未设置"}</span>
                              <button type="button" onClick={() => setImageTarget({ kind: "nodeForeground", nodeId: inspectorSelectedNode.id })}>选择</button>
                              <button type="button" onClick={() => clearSelectedImageForNode(inspectorSelectedNode.id, "foreground")} disabled={!inspectorSelectedNode.params.foregroundImage}>清除</button>
                            </div>
                          </td>
                        </tr>
                        <tr>
                          {batchEditors.renderChineseParamHeader("foregroundImageFit")}
                          <td>
                            <InlineEditableValue
                              value={normalizeImageFitMode(inspectorSelectedNode.params.foregroundImageFit)}
                              disabled={isBrowseMode}
                              displayValue={IMAGE_FIT_MODE_OPTIONS.find((option) => option.value === normalizeImageFitMode(inspectorSelectedNode.params.foregroundImageFit))?.label ?? normalizeImageFitMode(inspectorSelectedNode.params.foregroundImageFit)}
                              options={IMAGE_FIT_MODE_OPTIONS.map((option) => ({ value: option.value, label: option.label }))}
                              onCommit={(value) => updateParam("foregroundImageFit", value)}
                            />
                          </td>
                        </tr>
                      </>)}
                    </tbody>
                  </table>
                  </div>) : (<div className="empty-state compact">
                    <FileJson size={24}/>
                    <p>当前没有被选中图元。</p>
                  </div>)}
              </div>);
        })()) : inspectorTabShowsDevicePanel(inspectorTab, Boolean(inspectorSelectedNode)) ? (<div className="device-param-stack">
                {!__appScope.isStaticGraphicNode(inspectorSelectedNode) && (<div className="device-info-tabs" role="tablist" aria-label="图元属性分类">
                    <button type="button" className="" onClick={() => setInspectorTab("graph")} role="tab" aria-selected={false}>
                      图形
                    </button>
                    <button type="button" className={selectedDeviceInfoView === "model" ? "active" : ""} onClick={() => setSelectedDeviceInfoView("model")} role="tab" aria-selected={selectedDeviceInfoView === "model"}>
                      模型
                    </button>
                    <button type="button" className={selectedDeviceInfoView === "measurement" ? "active" : ""} onClick={() => setSelectedDeviceInfoView("measurement")} role="tab" aria-selected={selectedDeviceInfoView === "measurement"}>
                      量测
                    </button>
                  </div>)}
                {selectedDeviceInfoView === "measurement" && !__appScope.isStaticGraphicNode(inspectorSelectedNode) ? (renderSelectedNodeMeasurementTable(inspectorSelectedNode)) : (<>
                    {selectedContainerParameterViews.length > 0 && (<div className="container-param-tabs" role="tablist" aria-label="容器设备参数切换">
                        {selectedContainerParameterViews.map((view) => (<button key={view.id} type="button" className={selectedContainerParameterView?.id === view.id ? "active" : ""} onClick={() => setContainerParamViewId(view.id)}>
                            {view.label}
                          </button>))}
                      </div>)}
                    {selectedContainerParameterView ? (<table className="param-table">
                        <tbody>
                          {selectedContainerParameterView.rows.map((row) => {
                        const componentLibrary = resolveContainerParameterViewComponentLibrary(
                          inspectorSelectedNode,
                          selectedContainerParameterView
                        );
                        const rawValue = String(row.value ?? "");
                        const displayValue = formatInspectorDisplayValue(row.key, rawValue);
                        const optionConfig = enumSelectOptionsWithCurrentValue(paramOptionsForSection(row.key, componentLibrary), rawValue);
                        const options = optionConfig.options;
                        const hasVoltageParam = selectedContainerParameterView.rows.some((candidate) => VOLTAGE_BASE_PARAM_KEYS.has(candidate.key));
                        const rowModified = row.key === "name"
                          ? isInspectorParamModified("name", inspectorSelectedNode.name)
                          : row.paramKey
                            ? isInspectorParamModified(row.paramKey, rawValue, row.definition)
                            : false;
                        const rowElement = row.key === "name" && selectedContainerParameterView.kind === "container" ? (<td><InlineEditableValue value={inspectorSelectedNode.name} displayValue={inspectorSelectedNode.name} modified={rowModified} disabled={isBrowseMode} onCommit={(nextValue) => updateSelectedNode({ name: nextValue })}/></td>) : row.readonly || !row.paramKey ? (<td><span className={`inline-property-value read-only${rowModified ? " modified" : ""}`} data-modified={rowModified ? "true" : undefined}>{displayValue || "\u00a0"}</span></td>) : options ? (<td><InlineEditableValue value={rawValue} displayValue={options.find((option) => option === rawValue) ?? displayValue} options={options.map((option) => ({ value: option, label: option === optionConfig.invalidValue ? invalidEnumOptionLabel(option) : option, disabled: option === optionConfig.invalidValue }))} modified={rowModified} disabled={isBrowseMode} onCommit={(value) => updateParam(row.paramKey!, value)}/></td>) : (<td><InlineEditableValue value={rawValue} displayValue={displayValue} modified={rowModified} disabled={isBrowseMode} onCommit={(nextValue) => updateParam(row.paramKey!, nextValue)}/></td>);
                        const rowFragment = (<tr key={row.key}>{batchEditors.renderParamHeader(row.key, row.label, PARAM_LABELS[row.key] ?? row.label)}{rowElement}</tr>);
                        if (row.key === "name" && !hasVoltageParam) {
                          return <Fragment key={row.key}>{rowFragment}{renderVoltageBaseRow()}</Fragment>;
                        }
                        return rowFragment;
                    })}
                        </tbody>
                      </table>) : (<table className="param-table">
                        <tbody>
                          {(() => {
                        const eKeys = getEParameterKeys(inspectorSelectedNode.kind, inspectorSelectedNode.params);
                        const customDefinitions = parseCustomDefinitions(inspectorSelectedNode.params);
                        const selectedTemplate = libraryTemplates.find((template) => template.kind === inspectorSelectedNode.kind);
                        const definitionGroups = resolveDeviceModelPanelDefinitionGroups(
                          selectedTemplate,
                          libraryTemplates,
                          customComponentLibraries,
                          deviceDefinitionOverrides
                        );
                        const panelDefinitions = definitionGroups
                          ? [...definitionGroups.baseDefinitions, ...definitionGroups.derivedDefinitions]
                          : customDefinitions;
                        const keys = resolveDeviceModelPanelParameterKeys(
                            eKeys,
                            customDefinitions,
                            Object.keys(inspectorSelectedNode.params).filter((key) => !key.startsWith("_") && key !== "is_container" && key !== ALLOW_RESIZE_TRANSFORM_PARAM),
                            definitionGroups
                        );
                        return keys.map((key) => {
                            const definition = panelDefinitions.find((item) => item.enName === key);
                            const resolvedValue = key === "name"
                              ? inspectorSelectedNode.name
                              : key === "dev_type"
                                ? resolveDeviceModelPanelDevType(inspectorSelectedNode.kind, inspectorSelectedNode.params)
                                : eKeys.length > 0
                                  ? getEParamValue(key, inspectorSelectedNode)
                                  : inspectorSelectedNode.params[key] ?? "";
                            const value = key !== "name" && key !== "dev_type" &&
                              !Object.prototype.hasOwnProperty.call(inspectorSelectedNode.params, key) &&
                              resolvedValue === ""
                                ? definition?.typicalValue ?? ""
                                : resolvedValue;
                            const rawValue = String(value ?? "");
                            const displayValue = formatInspectorDisplayValue(key, rawValue);
                            const readonly = READONLY_E_PARAM_KEYS.has(key) || batchEditors.definitionMakesValueReadonly(definition);
                            const modified = isInspectorParamModified(key, rawValue, definition);
                            const inputElement = key === "name" ? (<InlineEditableValue value={inspectorSelectedNode.name} displayValue={inspectorSelectedNode.name} modified={modified} disabled={isBrowseMode} onCommit={(nextValue) => updateSelectedNode({ name: nextValue })}/>) : readonly ? (<span className={`inline-property-value read-only${modified ? " modified" : ""}`} data-modified={modified ? "true" : undefined}>{displayValue || "\u00a0"}</span>) : batchEditors.renderParamEditor(key, rawValue, false, definition, undefined, modified);
                            const hasVoltageParam = keys.some((candidate) => VOLTAGE_BASE_PARAM_KEYS.has(candidate));
                            const rowFragment = (<tr key={key}>
                                  {batchEditors.renderParamHeader(key, key, definition?.cnName === key ? PARAM_LABELS[key] ?? key : (definition?.cnName ?? PARAM_LABELS[key] ?? key))}
                                  <td>
                                    {inputElement}
                                  </td>
                                </tr>);
                            if (key === "name" && !hasVoltageParam) {
                              return <Fragment key={key}>{rowFragment}{renderVoltageBaseRow()}</Fragment>;
                            }
                            return rowFragment;
                        });
                    })()}
                        </tbody>
                      </table>)}
                  </>)}
              </div>) : inspectorTab === "device" ? (<div className="empty-state">
                <FileJson size={28}/>
                <p>选择画布设备后，可切换查看图形、模型和量测。</p>
              </div>) : null}
            {singleSelectedDeviceForInspector && inspectorSelectedNode && inspectorTab === "graph" && (<div className="topology-card">
                <span>连接度</span>
                <strong>{inspectorTopologyEntry?.degree ?? 0}</strong>
                <small>
                  {(inspectorTopologyEntry?.neighbors ?? [])
                .map((id) => nodeById.get(id)?.name)
                .filter(Boolean)
                .join("、") || "暂无相邻元件"}
                </small>
              </div>)}
          </div>) : inspectorSelectedEdge ? (<div className="form-stack">
            <div className="topology-card">
              <span>联络线</span>
              <strong>{inspectorSelectedEdge.id}</strong>
              <small>
                {(nodeById.get(inspectorSelectedEdge.sourceId)?.name ?? "未知设备") +
            " -> " +
            (nodeById.get(inspectorSelectedEdge.targetId)?.name ?? "未知设备")}
              </small>
            </div>
            <div className="empty-state">
              <Cable size={28}/>
              <p>拖拽线两端的圆形控制点到其他同类型端子，可调整联络线首端或末端。</p>
            </div>
          </div>) : (<div className="empty-state">
            <Save size={28}/>
            <p>从左侧拖入元件，或使用联络线模式点击两个元件建立拓扑关系。</p>
          </div>)}
      </aside>
  );
}
