import { Fragment, type ReactNode } from "react";
import { Cable, FileJson, Save } from "lucide-react";
import {
  DEFAULT_MODEL_LAYER_ID,
  STATIC_ROUTE_AVOIDANCE_PARAM,
  getEParamValue,
  getEParameterKeys,
  getNodeScaleX,
  getNodeScaleY,
  isBusNode,
  isStaticBoxLikeNode,
  isStaticNode,
  staticNodeParticipatesInRoutingAvoidance,
  terminalVoltageBaseNumber
} from "./model";
import { type MeasurementGroup } from "./measurements";

export type RightInspectorPanelProps = Record<string, any>;

export function RightInspectorPanel(props: RightInspectorPanelProps) {
  const {
    rightPanelVisible,
    updateAutoPanelVisibility,
    startSidePanelResize,
    renderSidePanelModeControls,
    inspectorSelectedNode,
    currentModelRecord,
    inspectorTab,
    setInspectorTab,
    renderChineseParamHeader,
    selectedSchemeRecord,
    MIN_CANVAS_WIDTH,
    MAX_CANVAS_WIDTH,
    MIN_CANVAS_HEIGHT,
    MAX_CANVAS_HEIGHT,
    canvasSizeDraft,
    isBrowseMode,
    setCanvasSizeDraft,
    handleCanvasSizeBlur,
    handleCanvasSizeKeyDown,
    allowAutoExpandCanvas,
    pushUndoSnapshot,
    setAllowAutoExpandCanvas,
    canvasBackgroundColor,
    DEFAULT_CANVAS_BACKGROUND,
    setCanvasBackgroundColor,
    canvasBackgroundImage,
    setImageTarget,
    setCanvasBackgroundImage,
    setCanvasBackgroundImageAssetId,
    backgroundProjectId,
    setBackgroundProjectId,
    projectById,
    defaultBackgroundLayerIdsForProject,
    setBackgroundLayerIds,
    backgroundProjectOptions,
    backgroundProjectRecord,
    backgroundLayerOptions,
    backgroundLayerIds,
    toggleBackgroundLayer,
    powerUnit,
    setPowerUnit,
    POWER_UNIT_OPTIONS,
    voltageUnit,
    setVoltageUnit,
    VOLTAGE_UNIT_OPTIONS,
    currentUnit,
    setCurrentUnit,
    CURRENT_UNIT_OPTIONS,
    powerBaseValue,
    setPowerBaseValue,
    DEFAULT_POWER_BASE_VALUE,
    graphInfoView,
    setGraphInfoView,
    renderElementTreePanel,
    updateSelectedNode,
    normalizeStaticBoxDimension,
    formatInspectorScaleValue,
    normalizeScale,
    layers,
    nodeLabelDisplayMode,
    updateParam,
    renderColorEditor,
    renderParamEditor,
    normalizeNodeLabelRotation,
    nodeLabelTextAnchor,
    nodeLabelOffset,
    selectedMeasurementGroup,
    addDefaultMeasurementGroupForSelectedNode,
    removeSelectedMeasurementGroup,
    updateMeasurementGroup,
    measurementTypeById,
    platformMeasurementConfig,
    measurementCatalog,
    terminalVbaseFallback,
    updateTerminalVbase,
    renderStaticButtonActionEditor,
    clearSelectedImageForNode,
    terminalColor,
    colorPalette,
    selectedContainerParameterViews,
    selectedContainerParameterView,
    setContainerParamViewId,
    paramOptionsForSection,
    renderParamHeader,
    PARAM_LABELS,
    parseCustomDefinitions,
    READONLY_E_PARAM_KEYS,
    inspectorSelectedEdge,
    nodeById,
    inspectorTopologyErrors,
    startValidationPanelResize,
    visibleTopologyErrors,
    locateTopologyError,
    topologyWarningDisplayMessage,
    TOPOLOGY_WARNING_PAGE_SIZE,
    setTopologyWarningPage,
    normalizedTopologyWarningPage,
    topologyWarningPageCount,
    hiddenTopologyErrorCount,
    topology
  } = props;

  return (
      <aside
        className={`inspector-panel floating-side-panel ${rightPanelVisible ? "visible" : "hidden"}`}
        onPointerEnter={() => updateAutoPanelVisibility("right", "panel-enter")}
        onPointerLeave={() => updateAutoPanelVisibility("right", "panel-leave")}
      >
        <div
          className="side-panel-resize-handle left-edge"
          role="separator"
          aria-orientation="vertical"
          aria-label="调整右侧栏宽度"
          title="拖拽调整右侧栏宽度"
          onPointerDown={(event) => startSidePanelResize(event, "right")}
        />
        <div className="inspector-title">
          <div className="inspector-title-actions">
            {renderSidePanelModeControls("right")}
          </div>
        </div>
        {inspectorSelectedNode || currentModelRecord ? (
          <div className={`form-stack ${inspectorTab === "graph" ? "graph-form-stack" : ""}`}>
            <div className="inspector-tabs">
              <button className={inspectorTab === "model" ? "active" : ""} onClick={() => setInspectorTab("model")} disabled={!currentModelRecord}>
                基础
              </button>
              <button className={inspectorTab === "graph" ? "active" : ""} onClick={() => setInspectorTab("graph")}>
                图元
              </button>
              <button className={inspectorTab === "device" ? "active" : ""} onClick={() => setInspectorTab("device")}>
                设备
              </button>
            </div>
            {inspectorTab === "model" && currentModelRecord ? (
              <table className="param-table">
                <tbody>
                  <tr>
                    {renderChineseParamHeader("name", "模型名称")}
                    <td><input value={currentModelRecord.name} readOnly /></td>
                  </tr>
                  <tr>
                    {renderChineseParamHeader("schemeName")}
                    <td><input value={selectedSchemeRecord?.name ?? "未选择方案"} readOnly /></td>
                  </tr>
                  <tr>
                    {renderChineseParamHeader("updatedAt", "模型更新时间")}
                    <td><input value={new Date(currentModelRecord.updatedAt).toLocaleString()} readOnly /></td>
                  </tr>
                  <tr>
                    {renderChineseParamHeader("canvasWidth")}
                    <td>
                      <input
                        type="number"
                        min={MIN_CANVAS_WIDTH}
                        max={MAX_CANVAS_WIDTH}
                        step="10"
                        value={canvasSizeDraft.width}
                        disabled={isBrowseMode}
                        onChange={(event) => setCanvasSizeDraft((current: any) => ({ ...current, width: event.target.value }))}
                        onBlur={handleCanvasSizeBlur}
                        onKeyDown={handleCanvasSizeKeyDown}
                      />
                    </td>
                  </tr>
                  <tr>
                    {renderChineseParamHeader("canvasHeight")}
                    <td>
                      <input
                        type="number"
                        min={MIN_CANVAS_HEIGHT}
                        max={MAX_CANVAS_HEIGHT}
                        step="10"
                        value={canvasSizeDraft.height}
                        disabled={isBrowseMode}
                        onChange={(event) => setCanvasSizeDraft((current: any) => ({ ...current, height: event.target.value }))}
                        onBlur={handleCanvasSizeBlur}
                        onKeyDown={handleCanvasSizeKeyDown}
                      />
                    </td>
                  </tr>
                  <tr>
                    {renderChineseParamHeader("allowAutoExpandCanvas")}
                    <td>
                      <select
                        value={allowAutoExpandCanvas ? "allow" : "deny"}
                        disabled={isBrowseMode}
                        onChange={(event) => {
                          pushUndoSnapshot();
                          setAllowAutoExpandCanvas(event.target.value === "allow");
                        }}
                      >
                        <option value="allow">允许</option>
                        <option value="deny">不允许</option>
                      </select>
                    </td>
                  </tr>
                  <tr>
                    {renderChineseParamHeader("canvasBackgroundColor")}
                    <td>
                      <div className="color-field with-clear">
                        <input
                          type="color"
                          value={canvasBackgroundColor || DEFAULT_CANVAS_BACKGROUND}
                          disabled={isBrowseMode}
                          onChange={(event) => {
                            pushUndoSnapshot();
                            setCanvasBackgroundColor(event.target.value);
                          }}
                        />
                        <input
                          value={canvasBackgroundColor || DEFAULT_CANVAS_BACKGROUND}
                          disabled={isBrowseMode}
                          onChange={(event) => {
                            pushUndoSnapshot();
                            setCanvasBackgroundColor(event.target.value || DEFAULT_CANVAS_BACKGROUND);
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            pushUndoSnapshot();
                            setCanvasBackgroundColor("");
                          }}
                          disabled={isBrowseMode || !canvasBackgroundColor || canvasBackgroundColor === DEFAULT_CANVAS_BACKGROUND}
                        >
                          删除背景色
                        </button>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    {renderChineseParamHeader("canvasBackgroundImage")}
                    <td>
                      <div className="image-field-actions">
                        <input value={canvasBackgroundImage ? "已设置" : "未设置"} readOnly />
                        <button type="button" disabled={isBrowseMode} onClick={() => setImageTarget({ kind: "canvas" })}>选择</button>
                        <button
                          type="button"
                          onClick={() => {
                            pushUndoSnapshot();
                            setCanvasBackgroundImage("");
                            setCanvasBackgroundImageAssetId("");
                          }}
                          disabled={isBrowseMode || !canvasBackgroundImage}
                        >
                          清除
                        </button>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    {renderChineseParamHeader("backgroundProjectId")}
                    <td>
                      <div className="background-page-field">
                        <select
                          value={backgroundProjectId}
                          disabled={isBrowseMode}
                          onChange={(event) => {
                            pushUndoSnapshot();
                            const nextProjectId = event.target.value;
                            setBackgroundProjectId(nextProjectId);
                            const backgroundProject = projectById.get(nextProjectId);
                            if (backgroundProject) {
                              setBackgroundLayerIds(defaultBackgroundLayerIdsForProject(backgroundProject.project));
                            } else {
                              setBackgroundLayerIds([]);
                            }
                          }}
                        >
                          <option value="">不使用背景页面</option>
                          {backgroundProjectOptions.map(({ project, label }: any) => (
                            <option key={project.id} value={project.id}>
                              {label}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => {
                            pushUndoSnapshot();
                            setBackgroundProjectId("");
                            setBackgroundLayerIds([]);
                          }}
                          disabled={isBrowseMode || !backgroundProjectId}
                        >
                          清空背景页面
                        </button>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    {renderChineseParamHeader("backgroundLayerIds")}
                    <td>
                      {backgroundProjectRecord ? (
                        <div className="background-layer-checklist">
                          {backgroundLayerOptions.map((layer: any) => (
                            <label key={layer.id} className="background-layer-option">
                              <input
                                type="checkbox"
                                checked={backgroundLayerIds.includes(layer.id)}
                                disabled={isBrowseMode}
                                onChange={() => toggleBackgroundLayer(layer.id)}
                              />
                              <span>{layer.name}</span>
                            </label>
                          ))}
                          {backgroundLayerOptions.length === 0 && <span className="muted-inline-text">背景页面没有可配置图层</span>}
                        </div>
                      ) : (
                        <span className="muted-inline-text">未设置背景页面</span>
                      )}
                    </td>
                  </tr>
                  <tr>
                    {renderChineseParamHeader("powerUnit")}
                    <td>
                      <select
                        value={powerUnit}
                        disabled={isBrowseMode}
                        onChange={(event) => {
                          pushUndoSnapshot();
                          setPowerUnit(event.target.value);
                        }}
                      >
                        {POWER_UNIT_OPTIONS.map((unit: any) => (
                          <option key={unit} value={unit}>{unit}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                  <tr>
                    {renderChineseParamHeader("voltageUnit")}
                    <td>
                      <select
                        value={voltageUnit}
                        disabled={isBrowseMode}
                        onChange={(event) => {
                          pushUndoSnapshot();
                          setVoltageUnit(event.target.value);
                        }}
                      >
                        {VOLTAGE_UNIT_OPTIONS.map((unit: any) => (
                          <option key={unit} value={unit}>{unit}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                  <tr>
                    {renderChineseParamHeader("currentUnit")}
                    <td>
                      <select
                        value={currentUnit}
                        disabled={isBrowseMode}
                        onChange={(event) => {
                          pushUndoSnapshot();
                          setCurrentUnit(event.target.value);
                        }}
                      >
                        {CURRENT_UNIT_OPTIONS.map((unit: any) => (
                          <option key={unit} value={unit}>{unit}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                  <tr>
                    {renderChineseParamHeader("powerBaseValue")}
                    <td>
                      <div className="unit-value-field">
                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          value={powerBaseValue}
                          disabled={isBrowseMode}
                          onChange={(event) => {
                            pushUndoSnapshot();
                            const nextValue = Number(event.target.value);
                            setPowerBaseValue(Number.isFinite(nextValue) ? nextValue : DEFAULT_POWER_BASE_VALUE);
                          }}
                        />
                        <span>{powerUnit}</span>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            ) : inspectorTab === "graph" ? (
              <div className="graph-info-panel">
                <div className="graph-info-toolbar" role="tablist" aria-label="图元信息子页面">
                  <button
                    type="button"
                    className={graphInfoView === "selected" ? "active" : ""}
                    onClick={() => setGraphInfoView("selected")}
                    role="tab"
                    aria-selected={graphInfoView === "selected"}
                    disabled={!inspectorSelectedNode}
                  >
                    选中图元
                  </button>
                  <button
                    type="button"
                    className={graphInfoView === "tree" ? "active" : ""}
                    onClick={() => setGraphInfoView("tree")}
                    role="tab"
                    aria-selected={graphInfoView === "tree"}
                  >
                    图元树
                  </button>
                </div>
                {graphInfoView === "tree" ? (
                  renderElementTreePanel()
                ) : inspectorSelectedNode ? (
                  <div className="graph-param-table-wrap">
                  <table className="param-table">
                  <tbody>
                    <tr>
                      {renderChineseParamHeader("graph_x", "X坐标")}
                      <td><input type="number" value={Math.round(inspectorSelectedNode.position.x)} onChange={(event) => updateSelectedNode({ position: { ...inspectorSelectedNode.position, x: Number(event.target.value) } })} /></td>
                    </tr>
                    <tr>
                      {renderChineseParamHeader("graph_y", "Y坐标")}
                      <td><input type="number" value={Math.round(inspectorSelectedNode.position.y)} onChange={(event) => updateSelectedNode({ position: { ...inspectorSelectedNode.position, y: Number(event.target.value) } })} /></td>
                    </tr>
                    {isStaticBoxLikeNode(inspectorSelectedNode) && (
                      <>
                        <tr>
                          {renderChineseParamHeader("staticWidth", "宽度")}
                          <td>
                            <input
                              type="number"
                              min="4"
                              max={MAX_CANVAS_WIDTH}
                              step="1"
                              value={Math.round(inspectorSelectedNode.size.width * 10) / 10}
                              onChange={(event) => {
                                const width = normalizeStaticBoxDimension(Number(event.target.value), inspectorSelectedNode.size.width, MAX_CANVAS_WIDTH);
                                updateSelectedNode({ size: { ...inspectorSelectedNode.size, width: width } });
                              }}
                            />
                          </td>
                        </tr>
                        <tr>
                          {renderChineseParamHeader("staticHeight", "高度")}
                          <td>
                            <input
                              type="number"
                              min="4"
                              max={MAX_CANVAS_HEIGHT}
                              step="1"
                              value={Math.round(inspectorSelectedNode.size.height * 10) / 10}
                              onChange={(event) => {
                                const height = normalizeStaticBoxDimension(Number(event.target.value), inspectorSelectedNode.size.height, MAX_CANVAS_HEIGHT);
                                updateSelectedNode({ size: { ...inspectorSelectedNode.size, height: height } });
                              }}
                            />
                          </td>
                        </tr>
                      </>
                    )}
                    <tr>
                      {renderChineseParamHeader("rotation")}
                      <td><input type="number" value={inspectorSelectedNode.rotation} onChange={(event) => updateSelectedNode({ rotation: Number(event.target.value) })} /></td>
                    </tr>
                    <tr>
                      {renderChineseParamHeader("scaleX")}
                      <td><input type="number" step="0.1" value={formatInspectorScaleValue(getNodeScaleX(inspectorSelectedNode))} onChange={(event) => {
                        const scaleX = normalizeScale(Number(event.target.value), getNodeScaleX(inspectorSelectedNode));
                        const scaleY = getNodeScaleY(inspectorSelectedNode);
                        updateSelectedNode({ scale: Math.max(Math.abs(scaleX), Math.abs(scaleY)), scaleX, scaleY });
                      }} /></td>
                    </tr>
                    <tr>
                      {renderChineseParamHeader("scaleY")}
                      <td><input type="number" step="0.1" value={formatInspectorScaleValue(getNodeScaleY(inspectorSelectedNode))} onChange={(event) => {
                        const scaleY = normalizeScale(Number(event.target.value), getNodeScaleY(inspectorSelectedNode));
                        const scaleX = getNodeScaleX(inspectorSelectedNode);
                        updateSelectedNode({ scale: Math.max(Math.abs(scaleX), Math.abs(scaleY)), scaleX, scaleY });
                      }} /></td>
                    </tr>
                    <tr>
                      {renderChineseParamHeader("layerId", "所属图层")}
                      <td>
                        <select
                          value={inspectorSelectedNode.layerId ?? DEFAULT_MODEL_LAYER_ID}
                          onChange={(event) => updateSelectedNode({ layerId: event.target.value })}
                        >
                          {layers.map((layer: any) => (
                            <option key={layer.id} value={layer.id}>{layer.name}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                    {!isStaticNode(inspectorSelectedNode) && (
                      <>
                        <tr>
                          {renderChineseParamHeader("_labelDisplayMode")}
                          <td>
                            <select
                              value={nodeLabelDisplayMode(inspectorSelectedNode)}
                              onChange={(event) => updateParam("_labelDisplayMode", event.target.value)}
                            >
                              <option value="always">始终显示</option>
                              <option value="hidden">始终隐藏</option>
                              <option value="follow">跟随显示</option>
                            </select>
                          </td>
                        </tr>
                        <tr>
                          {renderChineseParamHeader("_labelText")}
                          <td>
                            <input
                              value={inspectorSelectedNode.params._labelText ?? inspectorSelectedNode.name}
                              onChange={(event) => updateParam("_labelText", event.target.value)}
                            />
                          </td>
                        </tr>
                        <tr>
                          {renderChineseParamHeader("_labelColor")}
                          <td>{renderColorEditor("_labelColor", inspectorSelectedNode.params._labelColor || "#334155", "#334155")}</td>
                        </tr>
                        <tr>
                          {renderChineseParamHeader("_labelFontFamily")}
                          <td>{renderParamEditor("_labelFontFamily", inspectorSelectedNode.params._labelFontFamily || "Arial", false)}</td>
                        </tr>
                        <tr>
                          {renderChineseParamHeader("_labelFontSize")}
                          <td>
                            <input
                              type="number"
                              min="6"
                              max="96"
                              value={inspectorSelectedNode.params._labelFontSize || "12"}
                              onChange={(event) => updateParam("_labelFontSize", event.target.value)}
                            />
                          </td>
                        </tr>
                        <tr>
                          {renderChineseParamHeader("_labelRotation")}
                          <td>
                            <select
                              value={String(normalizeNodeLabelRotation(inspectorSelectedNode.params._labelRotation))}
                              onChange={(event) => updateParam("_labelRotation", String(normalizeNodeLabelRotation(event.target.value)))}
                            >
                              <option value="0">0° 横排</option>
                              <option value="90">90° 纵排</option>
                              <option value="180">180° 横排</option>
                              <option value="270">270° 纵排</option>
                            </select>
                          </td>
                        </tr>
                        <tr>
                          <th>标识样式</th>
                          <td>
                            <div className="device-label-style-actions">
                              <label>
                                <input
                                  type="checkbox"
                                  checked={(inspectorSelectedNode.params._labelFontWeight || "500") !== "400"}
                                  onChange={(event) => updateParam("_labelFontWeight", event.target.checked ? "700" : "400")}
                                />
                                加粗
                              </label>
                              <label>
                                <input
                                  type="checkbox"
                                  checked={(inspectorSelectedNode.params._labelFontStyle || "normal") === "italic"}
                                  onChange={(event) => updateParam("_labelFontStyle", event.target.checked ? "italic" : "normal")}
                                />
                                斜体
                              </label>
                              <label>
                                <input
                                  type="checkbox"
                                  checked={(inspectorSelectedNode.params._labelTextDecoration || "none") === "underline"}
                                  onChange={(event) => updateParam("_labelTextDecoration", event.target.checked ? "underline" : "none")}
                                />
                                下划线
                              </label>
                            </div>
                          </td>
                        </tr>
                        <tr>
                          {renderChineseParamHeader("_labelTextAnchor")}
                          <td>
                            <select
                              value={nodeLabelTextAnchor(inspectorSelectedNode)}
                              onChange={(event) => updateParam("_labelTextAnchor", event.target.value)}
                            >
                              <option value="start">左对齐</option>
                              <option value="middle">居中</option>
                              <option value="end">右对齐</option>
                            </select>
                          </td>
                        </tr>
                        <tr>
                          {renderChineseParamHeader("_labelX")}
                          <td>
                            <input
                              type="number"
                              step="0.1"
                              value={nodeLabelOffset(inspectorSelectedNode).x}
                              onChange={(event) => updateParam("_labelX", event.target.value)}
                            />
                          </td>
                        </tr>
                        <tr>
                          {renderChineseParamHeader("_labelY")}
                          <td>
                            <input
                              type="number"
                              step="0.1"
                              value={nodeLabelOffset(inspectorSelectedNode).y}
                              onChange={(event) => updateParam("_labelY", event.target.value)}
                            />
                          </td>
                        </tr>
                        <tr>
                          <th>动态量测</th>
                          <td>
                            <div className="measurement-sidebar-actions">
                              <button type="button" disabled={isBrowseMode || Boolean(selectedMeasurementGroup)} onClick={addDefaultMeasurementGroupForSelectedNode}>
                                添加默认量测
                              </button>
                              <button type="button" disabled={isBrowseMode || !selectedMeasurementGroup} onClick={removeSelectedMeasurementGroup}>
                                删除量测
                              </button>
                            </div>
                          </td>
                        </tr>
                        {selectedMeasurementGroup && (
                          <>
                            <tr>
                              <th>量测显示</th>
                              <td>
                                <select
                                  value={selectedMeasurementGroup.visible ? "1" : "0"}
                                  disabled={isBrowseMode}
                                  onChange={(event) => updateMeasurementGroup(selectedMeasurementGroup.id, (group: any) => ({ ...group, visible: event.target.value === "1" }))}
                                >
                                  <option value="1">显示</option>
                                  <option value="0">隐藏</option>
                                </select>
                              </td>
                            </tr>
                            <tr>
                              <th>量测布局</th>
                              <td>
                                <select
                                  value={selectedMeasurementGroup.layout}
                                  disabled={isBrowseMode}
                                  onChange={(event) => updateMeasurementGroup(selectedMeasurementGroup.id, (group: any) => ({ ...group, layout: event.target.value as MeasurementGroup["layout"] }))}
                                >
                                  <option value="vertical">竖向</option>
                                  <option value="horizontal">横向</option>
                                  <option value="grid">表格</option>
                                </select>
                              </td>
                            </tr>
                            <tr>
                              <th>量测偏移</th>
                              <td>
                                <div className="measurement-offset-fields">
                                  <input
                                    type="number"
                                    step="1"
                                    value={Math.round(selectedMeasurementGroup.offset.x * 10) / 10}
                                    disabled={isBrowseMode}
                                    onChange={(event) => updateMeasurementGroup(selectedMeasurementGroup.id, (group: any) => ({
                                      ...group,
                                      anchor: "custom",
                                      offset: { ...group.offset, x: Number(event.target.value) }
                                    }))}
                                  />
                                  <input
                                    type="number"
                                    step="1"
                                    value={Math.round(selectedMeasurementGroup.offset.y * 10) / 10}
                                    disabled={isBrowseMode}
                                    onChange={(event) => updateMeasurementGroup(selectedMeasurementGroup.id, (group: any) => ({
                                      ...group,
                                      anchor: "custom",
                                      offset: { ...group.offset, y: Number(event.target.value) }
                                    }))}
                                  />
                                </div>
                              </td>
                            </tr>
                            {selectedMeasurementGroup.items.map((item: any, itemIndex: number) => {
                              const measurementType = measurementTypeById.get(item.measurementTypeId);
                              return (
                                <Fragment key={item.id}>
                                  <tr>
                                    <th>{measurementType?.name ?? `量测${itemIndex + 1}`}</th>
                                    <td>
                                      <select
                                        value={item.measurementTypeId}
                                        disabled={isBrowseMode}
                                        onChange={(event) => updateMeasurementGroup(selectedMeasurementGroup.id, (group: any) => ({
                                          ...group,
                                          items: group.items.map((candidate: any) => candidate.id === item.id ? { ...candidate, measurementTypeId: event.target.value } : candidate)
                                        }))}
                                      >
                                        {platformMeasurementConfig.measurementTypes.map((type: any) => (
                                          <option key={type.id} value={type.id}>{type.name} / {type.shortLabel}</option>
                                        ))}
                                      </select>
                                    </td>
                                  </tr>
                                  <tr>
                                    <th>测点绑定</th>
                                    <td>
                                      <select
                                        value={item.sourcePoint}
                                        disabled={isBrowseMode}
                                        onChange={(event) => updateMeasurementGroup(selectedMeasurementGroup.id, (group: any) => ({
                                          ...group,
                                          items: group.items.map((candidate: any) => candidate.id === item.id ? { ...candidate, sourcePoint: event.target.value } : candidate)
                                        }))}
                                      >
                                        <option value="">未绑定测点</option>
                                        {measurementCatalog.map((point: any) => (
                                          <option key={point.sourcePoint} value={point.sourcePoint}>
                                            {point.name || point.sourcePoint}
                                          </option>
                                        ))}
                                      </select>
                                    </td>
                                  </tr>
                                  <tr>
                                    <th>量测显示名</th>
                                    <td>
                                      <input
                                        value={item.labelOverride ?? ""}
                                        disabled={isBrowseMode}
                                        title="为空时继承量测类型"
                                        onChange={(event) => updateMeasurementGroup(selectedMeasurementGroup.id, (group: any) => ({
                                          ...group,
                                          items: group.items.map((candidate: any) => candidate.id === item.id ? { ...candidate, labelOverride: event.target.value } : candidate)
                                        }))}
                                      />
                                    </td>
                                  </tr>
                                  <tr>
                                    <th>单位/小数</th>
                                    <td>
                                      <div className="measurement-unit-fields">
                                        <input
                                          value={item.unitOverride ?? ""}
                                          disabled={isBrowseMode}
                                          title="为空时继承量测类型单位"
                                          onChange={(event) => updateMeasurementGroup(selectedMeasurementGroup.id, (group: any) => ({
                                            ...group,
                                            items: group.items.map((candidate: any) => candidate.id === item.id ? { ...candidate, unitOverride: event.target.value } : candidate)
                                          }))}
                                        />
                                        <input
                                          type="number"
                                          min="0"
                                          max="12"
                                          value={item.decimalsOverride ?? measurementType?.defaultDecimals ?? 3}
                                          disabled={isBrowseMode}
                                          onChange={(event) => updateMeasurementGroup(selectedMeasurementGroup.id, (group: any) => ({
                                            ...group,
                                            items: group.items.map((candidate: any) => candidate.id === item.id ? { ...candidate, decimalsOverride: Number(event.target.value) } : candidate)
                                          }))}
                                        />
                                      </div>
                                    </td>
                                  </tr>
                                  <tr>
                                    <th>量测样式</th>
                                    <td>
                                      <div className="measurement-style-fields">
                                        <select
                                          value={item.visible === false ? "0" : "1"}
                                          disabled={isBrowseMode}
                                          onChange={(event) => updateMeasurementGroup(selectedMeasurementGroup.id, (group: any) => ({
                                            ...group,
                                            items: group.items.map((candidate: any) => candidate.id === item.id ? { ...candidate, visible: event.target.value === "1" } : candidate)
                                          }))}
                                        >
                                          <option value="1">显示</option>
                                          <option value="0">隐藏</option>
                                        </select>
                                        <input
                                          type="color"
                                          value={item.styleOverride?.color ?? measurementType?.defaultColor ?? "#334155"}
                                          disabled={isBrowseMode}
                                          onChange={(event) => updateMeasurementGroup(selectedMeasurementGroup.id, (group: any) => ({
                                            ...group,
                                            items: group.items.map((candidate: any) => candidate.id === item.id
                                              ? { ...candidate, styleOverride: { ...(candidate.styleOverride ?? {}), color: event.target.value } }
                                              : candidate)
                                          }))}
                                        />
                                      </div>
                                    </td>
                                  </tr>
                                </Fragment>
                              );
                            })}
                          </>
                        )}
                        <tr>
                          {renderChineseParamHeader("terminalCount")}
                          <td>
                            <span
                              className="graph-readonly-value"
                              title={isBusNode(inspectorSelectedNode) ? "母线端子数量由已连接联络线端点数自动生成" : "端子数量由元件定义决定"}
                            >
                              {inspectorSelectedNode.terminals.length}
                            </span>
                          </td>
                        </tr>
                        {inspectorSelectedNode.terminals.map((terminal: any, terminalIndex: number) => (
                          <Fragment key={terminal.id}>
                            <tr>
                              <th title={terminal.id}>{terminal.label}</th>
                              <td>{`${terminal.type.toUpperCase()} / ${terminal.nodeNumber}`}</td>
                            </tr>
                            {(terminal.type === "ac" || terminal.type === "dc") && (
                              <tr>
                                <th title={`${terminal.id}:vbase`}>{`${terminal.label}电压基值`}</th>
                                <td>
                                  <div className="unit-value-field">
                                    <input
                                      inputMode="decimal"
                                      value={terminalVoltageBaseNumber(terminal.vbase ?? terminalVbaseFallback(inspectorSelectedNode, terminalIndex))}
                                      onChange={(event) => updateTerminalVbase(terminal.id, event.target.value)}
                                    />
                                    <span>{voltageUnit}</span>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        ))}
                      </>
                    )}
                    {isStaticNode(inspectorSelectedNode) && (
                      <>
                        <tr>
                          {renderChineseParamHeader(STATIC_ROUTE_AVOIDANCE_PARAM)}
                          <td>
                            <select
                              value={staticNodeParticipatesInRoutingAvoidance(inspectorSelectedNode) ? "1" : "0"}
                              onChange={(event) => updateParam(STATIC_ROUTE_AVOIDANCE_PARAM, event.target.value)}
                            >
                              <option value="1">参与</option>
                              <option value="0">不参与</option>
                            </select>
                          </td>
                        </tr>
                        <tr>
                          {renderChineseParamHeader("text")}
                          <td><textarea rows={4} value={inspectorSelectedNode.params.text || ""} onChange={(event) => updateParam("text", event.target.value)} /></td>
                        </tr>
                        <tr>
                          {renderChineseParamHeader("fontFamily")}
                          <td>{renderParamEditor("fontFamily", inspectorSelectedNode.params.fontFamily || "Arial", false)}</td>
                        </tr>
                        <tr>
                          <th title="fontSize">字体大小（100%）</th>
                          <td><input type="number" min="8" max="160" value={inspectorSelectedNode.params.fontSize || "24"} onChange={(event) => updateParam("fontSize", event.target.value)} /></td>
                        </tr>
                        <tr>
                          <th>文字样式</th>
                          <td>
                            <div className="text-style-actions">
                              <label>
                                <input type="checkbox" checked={(inspectorSelectedNode.params.fontWeight || "400") !== "400"} onChange={(event) => updateParam("fontWeight", event.target.checked ? "700" : "400")} />
                                加粗
                              </label>
                              <label>
                                <input type="checkbox" checked={(inspectorSelectedNode.params.fontStyle || "normal") === "italic"} onChange={(event) => updateParam("fontStyle", event.target.checked ? "italic" : "normal")} />
                                斜体
                              </label>
                              <label>
                                <input type="checkbox" checked={(inspectorSelectedNode.params.textDecoration || "none") === "underline"} onChange={(event) => updateParam("textDecoration", event.target.checked ? "underline" : "none")} />
                                下划线
                              </label>
                            </div>
                          </td>
                        </tr>
                        <tr>
                          {renderChineseParamHeader("fillColor")}
                          <td>{renderColorEditor("fillColor", inspectorSelectedNode.params.fillColor || "transparent", "#ffffff")}</td>
                        </tr>
                        <tr>
                          {renderChineseParamHeader("strokeColor")}
                          <td>{renderColorEditor("strokeColor", inspectorSelectedNode.params.strokeColor || "transparent", "#334155")}</td>
                        </tr>
                        <tr>
                          {renderChineseParamHeader("textColor")}
                          <td>{renderColorEditor("textColor", inspectorSelectedNode.params.textColor || "#111827", "#111827")}</td>
                        </tr>
                        <tr>
                          {renderChineseParamHeader("lineWidth")}
                          <td><input type="number" min="0" max="20" value={inspectorSelectedNode.params.lineWidth || "2"} onChange={(event) => updateParam("lineWidth", event.target.value)} /></td>
                        </tr>
                        <tr>
                          {renderChineseParamHeader("strokeStyle")}
                          <td>{renderParamEditor("strokeStyle", inspectorSelectedNode.params.strokeStyle || "solid", false)}</td>
                        </tr>
                        <tr>
                          {renderChineseParamHeader("cornerRadius")}
                          <td><input type="number" min="0" max="999" value={inspectorSelectedNode.params.cornerRadius || "8"} onChange={(event) => updateParam("cornerRadius", event.target.value)} /></td>
                        </tr>
                        <tr>
                          {renderChineseParamHeader("accentColor")}
                          <td>{renderColorEditor("accentColor", inspectorSelectedNode.params.accentColor || "#2563eb", "#2563eb")}</td>
                        </tr>
                        <tr>
                          {renderChineseParamHeader("shadowEnabled")}
                          <td>{renderParamEditor("shadowEnabled", inspectorSelectedNode.params.shadowEnabled || "0", false)}</td>
                        </tr>
                        <tr>
                          {renderChineseParamHeader("padding")}
                          <td><input type="number" min="0" max="120" value={inspectorSelectedNode.params.padding || "12"} onChange={(event) => updateParam("padding", event.target.value)} /></td>
                        </tr>
                        <tr>
                          {renderChineseParamHeader("textAlign")}
                          <td>{renderParamEditor("textAlign", inspectorSelectedNode.params.textAlign || "center", false)}</td>
                        </tr>
                        <tr>
                          {renderChineseParamHeader("verticalAlign")}
                          <td>{renderParamEditor("verticalAlign", inspectorSelectedNode.params.verticalAlign || "middle", false)}</td>
                        </tr>
                        <tr>
                          {renderChineseParamHeader("markerStart")}
                          <td>{renderParamEditor("markerStart", inspectorSelectedNode.params.markerStart || "none", false)}</td>
                        </tr>
                        <tr>
                          {renderChineseParamHeader("markerEnd")}
                          <td>{renderParamEditor("markerEnd", inspectorSelectedNode.params.markerEnd || "none", false)}</td>
                        </tr>
                        <tr>
                          {renderChineseParamHeader("arrowSize")}
                          <td><input type="number" min="4" max="80" value={inspectorSelectedNode.params.arrowSize || "10"} onChange={(event) => updateParam("arrowSize", event.target.value)} /></td>
                        </tr>
                        <tr>
                          {renderChineseParamHeader("handleColor")}
                          <td>{renderColorEditor("handleColor", inspectorSelectedNode.params.handleColor || "#2563eb", "#2563eb")}</td>
                        </tr>
                        <tr>
                          {renderChineseParamHeader("handleSize")}
                          <td><input type="number" min="3" max="40" value={inspectorSelectedNode.params.handleSize || "8"} onChange={(event) => updateParam("handleSize", event.target.value)} /></td>
                        </tr>
                        {renderStaticButtonActionEditor(inspectorSelectedNode)}
                        <tr>
                          {renderChineseParamHeader("backgroundImage")}
                          <td>
                            <div className="image-field-actions">
                              <input value={inspectorSelectedNode.params.backgroundImage ? "已设置" : "未设置"} readOnly />
                              <button type="button" onClick={() => setImageTarget({ kind: "node", nodeId: inspectorSelectedNode.id })}>选择</button>
                              <button type="button" onClick={() => clearSelectedImageForNode(inspectorSelectedNode.id, "background")} disabled={!inspectorSelectedNode.params.backgroundImage}>清除</button>
                            </div>
                          </td>
                        </tr>
                      </>
                    )}
                    {!isStaticNode(inspectorSelectedNode) && (
                      <>
                        <tr>
                          {renderChineseParamHeader("foregroundColor")}
                          <td>{renderColorEditor("foregroundColor", inspectorSelectedNode.params.foregroundColor || "", terminalColor(inspectorSelectedNode.terminals[0]?.type, colorPalette))}</td>
                        </tr>
                        <tr>
                          {renderChineseParamHeader("foregroundImage")}
                          <td>
                            <div className="image-field-actions">
                              <input value={inspectorSelectedNode.params.foregroundImage ? "已设置" : "未设置"} readOnly />
                              <button type="button" onClick={() => setImageTarget({ kind: "nodeForeground", nodeId: inspectorSelectedNode.id })}>选择</button>
                              <button type="button" onClick={() => clearSelectedImageForNode(inspectorSelectedNode.id, "foreground")} disabled={!inspectorSelectedNode.params.foregroundImage}>清除</button>
                            </div>
                          </td>
                        </tr>
                      </>
                    )}
                    </tbody>
                  </table>
                  </div>
                ) : (
                  <div className="empty-state compact">
                    <FileJson size={24} />
                    <p>当前没有被选中图元。</p>
                  </div>
                )}
              </div>
            ) : inspectorSelectedNode ? (
              <div className="device-param-stack">
                {selectedContainerParameterViews.length > 0 && (
                  <div className="container-param-tabs" role="tablist" aria-label="容器设备参数切换">
                    {selectedContainerParameterViews.map((view: any) => (
                      <button
                        key={view.id}
                        type="button"
                        className={selectedContainerParameterView?.id === view.id ? "active" : ""}
                        onClick={() => setContainerParamViewId(view.id)}
                      >
                        {view.label}
                      </button>
                    ))}
                  </div>
                )}
                {selectedContainerParameterView ? (
                  <table className="param-table">
                    <tbody>
                      {selectedContainerParameterView.rows.map((row: any) => {
                        const options = paramOptionsForSection(row.key, selectedContainerParameterView.componentType);
                        return (
                          <tr key={row.key}>
                            {renderParamHeader(row.key, row.label, PARAM_LABELS[row.key] ?? row.label)}
                            <td>
                              {row.key === "name" && selectedContainerParameterView.kind === "container" ? (
                                <input value={inspectorSelectedNode.name} onChange={(event) => updateSelectedNode({ name: event.target.value })} />
                              ) : row.readonly || !row.paramKey ? (
                                <input value={row.value} readOnly />
                              ) : options ? (
                                <select value={row.value} onChange={(event) => updateParam(row.paramKey!, event.target.value)}>
                                  {options.map((option: any) => (
                                    <option key={option} value={option}>
                                      {option}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <input value={row.value} onChange={(event) => updateParam(row.paramKey!, event.target.value)} />
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <table className="param-table">
                    <tbody>
                      {(() => {
                        const eKeys = getEParameterKeys(inspectorSelectedNode.kind, inspectorSelectedNode.params);
                        const customDefinitions = parseCustomDefinitions(inspectorSelectedNode.params);
                        const customKeys = customDefinitions.map((definition: any) => definition.enName);
                        const customExtraKeys = customKeys.filter((key: string) => !eKeys.includes(key));
                        const keys =
                          eKeys.length > 0
                            ? [...eKeys, ...customExtraKeys]
                            : customKeys.length > 0
                              ? customKeys
                              : Object.keys(inspectorSelectedNode.params).filter((key) => !key.startsWith("_") && key !== "is_container");
                        const readonlyKeys = new Set(customDefinitions.filter((definition: any) => definition.readonly).map((definition: any) => definition.enName));
                        return keys.map((key: string) => {
                          const value = eKeys.length > 0 ? getEParamValue(key, inspectorSelectedNode) : key === "name" ? inspectorSelectedNode.name : inspectorSelectedNode.params[key] ?? "";
                          const definition = customDefinitions.find((item: any) => item.enName === key);
                          return (
                            <tr key={key}>
                              {renderParamHeader(key, key, definition?.cnName ?? PARAM_LABELS[key] ?? key)}
                              <td>
                                {key === "name" ? (
                                  <input value={inspectorSelectedNode.name} onChange={(event) => updateSelectedNode({ name: event.target.value })} />
                                ) : READONLY_E_PARAM_KEYS.has(key) || readonlyKeys.has(key) ? (
                                  <input value={value} readOnly />
                                ) : (
                                  renderParamEditor(key, value, false)
                                )}
                              </td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                )}
              </div>
            ) : (
              <div className="empty-state">
                <FileJson size={28} />
                <p>选择画布设备后，可切换查看图元和设备。</p>
              </div>
            )}
            {inspectorSelectedNode && inspectorTab === "graph" && graphInfoView === "selected" && (
              <div className="topology-card">
                <span>连接度</span>
                <strong>{topology.nodes[inspectorSelectedNode.id]?.degree ?? 0}</strong>
                <small>
                  {(topology.nodes[inspectorSelectedNode.id]?.neighbors ?? [])
                    .map((id: string) => nodeById.get(id)?.name)
                    .filter(Boolean)
                    .join("、") || "暂无相邻元件"}
                </small>
              </div>
            )}
          </div>
        ) : inspectorSelectedEdge ? (
          <div className="form-stack">
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
              <Cable size={28} />
              <p>拖拽线两端的圆形控制点到其他同类型端子，可调整联络线首端或末端。</p>
            </div>
          </div>
        ) : (
          <div className="empty-state">
            <Save size={28} />
            <p>从左侧拖入元件，或使用联络线模式点击两个元件建立拓扑关系。</p>
          </div>
        )}
        {inspectorTopologyErrors.length > 0 && (
          <section className="validation-panel">
            <div
              className="validation-panel-resize-handle"
              role="separator"
              aria-orientation="horizontal"
              title="拖拽调整拓扑告警栏高度"
              onPointerDown={startValidationPanelResize}
            />
            <div className="validation-panel-title">
              <h2>拓扑告警</h2>
              <span>{inspectorTopologyErrors.length} 条</span>
            </div>
            <div className="validation-list">
              {visibleTopologyErrors.map((error: any) => (
                <button key={error.id} onClick={() => locateTopologyError(error)} onDoubleClick={() => locateTopologyError(error)}>
                  <span>{topologyWarningDisplayMessage(error.message)}</span>
                </button>
              ))}
            </div>
            {inspectorTopologyErrors.length > TOPOLOGY_WARNING_PAGE_SIZE && (
              <div className="validation-pagination">
                <button
                  type="button"
                  onClick={() => setTopologyWarningPage((current: number) => Math.max(0, current - 1))}
                  disabled={normalizedTopologyWarningPage === 0}
                >
                  上一页
                </button>
                <span>
                  {normalizedTopologyWarningPage + 1} / {topologyWarningPageCount}
                </span>
                <button
                  type="button"
                  onClick={() => setTopologyWarningPage((current: number) => Math.min(topologyWarningPageCount - 1, current + 1))}
                  disabled={normalizedTopologyWarningPage >= topologyWarningPageCount - 1}
                >
                  下一页
                </button>
              </div>
            )}
            {hiddenTopologyErrorCount > 0 && (
              <p className="validation-more">每页显示 {TOPOLOGY_WARNING_PAGE_SIZE} 条告警，请分页处理或重新拓扑。</p>
            )}
          </section>
        )}
      </aside>
  );
}
