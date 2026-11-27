/** 方案画布交互、视口导航与量测面板渲染主工厂模块（重导出已拆分子域）。 */

import type { ProjectCanvasScope } from "./appScopeTypes";
import { Select, Input, Button, InputNumber } from "antd";
import { canvasFitCenterOffsetX, clampNumber } from "../canvasViewport";
import { canvasFitSideInsetsFromDom } from "./appCoreCanvasUtilities";
import { DEFAULT_MEASUREMENT_CONFIG, defaultMeasurementDisplayFormat } from "../measurements";
import { WindowCloseButton } from "../WindowCloseButton";
import { promptText } from "../globalDialogs";
import { moveSelectedTableRows, nextTableRowSelection } from "../definitionTableSelection";
import { modelAssociationProjectIndexesForSchemes } from "../model";
import { containerGatewayUnbindNotice, finalizeContainerAfterNodeDeletion } from "../acContainer";
import { modelTrace } from "../modelTrace";
import { runTopologyOperation } from "../topology-operation";
import { isFrontendExportMode, sendFrontendExportArtifacts } from "../frontendExport";
import type {
  Edge,
  ElementTreeItem,
  ModelLayer,
  ModelNode,
  Point,
  ProjectFile,
  SavedProjectRecord,
  SavedSchemeRecord,
  TopologyValidationError,
} from "../model";
import type { DeviceMeasurementProfileItem, MeasurementGroup, ProjectMeasurementConfig } from "../measurements";
import type { ContextMenuState, DeviceDefinitionMeasurementPanelTarget, EdgeEndpoint, WheelZoomAnchor } from "./appCoreCanvasUtilities";
import type { CanvasViewBox } from "../canvasViewport";
import type { SelectionRect } from "../selectionActions";
import type { GeometryBounds } from "../model-canvas-ops";
import type { MouseEvent as ReactMouseEvent } from "react";

export * from "./appProjectRecordFactories";
export * from "./appCanvasLayoutFactories";

export function createMoveModelLayer(__appScope: ProjectCanvasScope) {
  return (layerId: string, direction: -1 | 1) => {
  const { layers, pushUndoSnapshot, setLayers } = __appScope;
    const index = layers.findIndex((layer: ModelLayer) => layer.id === layerId);
    const targetIndex = index + direction;
    if (index < 0 || targetIndex < 0 || targetIndex >= layers.length) {
      return;
    }
    pushUndoSnapshot();
    setLayers((current: ModelLayer[]) => {
      const next = [...current];
      const [layer] = next.splice(index, 1);
      next.splice(targetIndex, 0, layer);
      return next;
    });
  };
}

export function createDeleteModelLayer(__appScope: ProjectCanvasScope) {
  return async (layerId: string) => {
  const { DEFAULT_MODEL_LAYER_ID, deleteNodesWithConnectedEdges, normalizeModelGroups, normalizeProjectMeasurements, pushUndoSnapshot, removeGraphicsFromGroups, resetConnectPreviewState, setActiveLayerId, setConnectSource, setContextMenu, setGraphArrays, setGroups, setLayers, setProjectMeasurements, setRewiring, setSelectedEdgeId, setSelectedEdgeIds, setSelectedNodeIds, writeOperationLog } = __appScope;
    const initialLayers = __appScope.layers;
    if (initialLayers.length <= 1) {
      showGlobalMessage("至少需要保留一个图层。");
      return;
    }
    const layer = initialLayers.find((item: ModelLayer) => item.id === layerId);
    if (!layer) {
      return;
    }
    const initialNodeIdsInLayer = __appScope.nodes
      .filter((node: ModelNode) => (node.layerId ?? DEFAULT_MODEL_LAYER_ID) === layerId)
      .map((node: ModelNode) => node.id);
    if (initialNodeIdsInLayer.length > 0 && !await showGlobalConfirm(`删除图层“${layer.name}”？该图层内共有 ${initialNodeIdsInLayer.length} 个图元，继续删除将同时删除这些图元及相关联络线。是否继续？`)) {
      return;
    }
    // await 恢复后经 __appScopeRef 读取最新图状态快照，避免确认弹窗停留期间的状态变更被旧闭包覆盖
    const latest = (__appScope.__appScopeRef?.current as ProjectCanvasScope | undefined) ?? __appScope;
    if (latest.layers.length <= 1 || !latest.layers.some((item: ModelLayer) => item.id === layerId)) {
      return;
    }
    const nodeIdsInLayer = latest.nodes
      .filter((node: ModelNode) => (node.layerId ?? DEFAULT_MODEL_LAYER_ID) === layerId)
      .map((node: ModelNode) => node.id);
    pushUndoSnapshot();
    const result = deleteNodesWithConnectedEdges(latest.nodes, latest.edges, nodeIdsInLayer);
    const remainingLayers = latest.layers.filter((item: ModelLayer) => item.id !== layerId);
    const nextActiveLayerId = latest.activeLayerId === layerId
      ? remainingLayers.find((item: ModelLayer) => item.visible)?.id ?? remainingLayers[0]?.id ?? DEFAULT_MODEL_LAYER_ID
      : latest.activeLayerId;
    const nextLayers = remainingLayers.map((item: ModelLayer) => item.id === nextActiveLayerId ? { ...item, visible: true } : item);
    const remainingEdgeIds = new Set(result.edges.map((edge: Edge) => edge.id));
    const removedEdgeIds = latest.edges.filter((edge: Edge) => !remainingEdgeIds.has(edge.id)).map((edge: Edge) => edge.id);
    // 删除收尾:容器在本图层而成员在别图层时归属会悬空 / 绑定设备被删要解绑 → 与删除/剪切同源(见 helper)
    const nextNodes = finalizeContainerAfterNodeDeletion(latest.nodes, result.nodes, nodeIdsInLayer);
    const unbindNotice = containerGatewayUnbindNotice(latest.nodes, nodeIdsInLayer);
    setGraphArrays(nextNodes, result.edges);
    setGroups(normalizeModelGroups(removeGraphicsFromGroups(latest.groups, nodeIdsInLayer, removedEdgeIds), nextNodes, result.edges));
    setProjectMeasurements((current: ProjectMeasurementConfig) => normalizeProjectMeasurements(current, nextNodes));
    setLayers(nextLayers);
    setActiveLayerId(nextActiveLayerId);
    setSelectedNodeIds([]);
    setSelectedEdgeId("");
    setSelectedEdgeIds([]);
    setConnectSource(null);
    resetConnectPreviewState();
    setRewiring(null);
    setContextMenu(null);
    writeOperationLog(`删除图层：${layer.name}，删除 ${nodeIdsInLayer.length} 个图元`);
    if (unbindNotice) {
      showGlobalMessage(unbindNotice);
    }
  };
}

const DEVICE_DEFINITION_MEASUREMENT_PROFILE_ALIASES: Record<string, readonly string[]> = {
  ACTransformer: ["ac-transformer"],
  ACGenerator: ["ac-source"],
  DCGenerator: ["dc-source"],
  ACLoad: ["ac-load"],
  DCLoad: ["dc-load"],
  HydroStorage: ["hydrogen-tank"]
};

export function createRenderDeviceDefinitionMeasurementPanel(__appScope: ProjectCanvasScope) {
  return (target: DeviceDefinitionMeasurementPanelTarget) => {
  const { BufferedTextInput, PARAM_LABELS, button, div, editableMeasurementTypeById, footer, measurementConfig, measurementConfigDraft, measurementConfigSaveStatus, section, select, span, table, tbody, td, th, thead, tr } = __appScope;
    const draftConfig = measurementConfigDraft ?? measurementConfig;
    const selectedKind = target.deviceKind;
    const selectedProfileItems = Array.isArray(target.items) ? [...target.items] : [];
    const selectedRowIndexes = (target.selectedRowIndexes ?? []).filter(
      (index) => index >= 0 && index < selectedProfileItems.length
    );
    const selectedRowIndexSet = new Set(selectedRowIndexes);
    const selectRow = (index: number, event: any) => {
      const orderedIndexes = selectedProfileItems.map((_, itemIndex) => itemIndex);
      const result = nextTableRowSelection(
        selectedRowIndexes,
        index,
        orderedIndexes,
        target.selectionAnchorIndex,
        event
      );
      target.setSelectedRowIndexes?.(result.selectedKeys);
      target.setSelectionAnchorIndex?.(result.anchorKey);
    };
    const updateItem = (index: number, patch: Partial<DeviceMeasurementProfileItem>) => {
      target.setItems(selectedProfileItems.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
    };
    const copySelectedItems = () => {
      if (selectedRowIndexes.length === 0) return;
      const copies = selectedRowIndexes.map((index) => ({ ...selectedProfileItems[index] }));
      const insertIndex = Math.max(...selectedRowIndexes) + 1;
      const items = [
        ...selectedProfileItems.slice(0, insertIndex),
        ...copies,
        ...selectedProfileItems.slice(insertIndex)
      ];
      target.setItems(items);
      const copiedIndexes = copies.map((_, index) => insertIndex + index);
      target.setSelectedRowIndexes?.(copiedIndexes);
      target.setSelectionAnchorIndex?.(copiedIndexes[0] ?? null);
    };
    const moveSelectedItems = (direction: -1 | 1) => {
      const selectedItems = new Set(selectedRowIndexes.map((index) => selectedProfileItems[index]));
      if (selectedItems.size === 0) return;
      const items = moveSelectedTableRows(
        selectedProfileItems,
        selectedItems,
        (item) => item,
        direction
      );
      const nextSelectedIndexes = items.flatMap((item, index) => selectedItems.has(item) ? [index] : []);
      target.setItems(items);
      target.setSelectedRowIndexes?.(nextSelectedIndexes);
      target.setSelectionAnchorIndex?.(nextSelectedIndexes[0] ?? null);
    };
    const deleteSelectedItems = () => {
      if (selectedRowIndexes.length === 0) return;
      target.setItems(selectedProfileItems.filter((_, index) => !selectedRowIndexSet.has(index)));
      target.setSelectedRowIndexes?.([]);
      target.setSelectionAnchorIndex?.(null);
    };
    const measurementProfilePositionDefinitions = target.positionDefinitions?.length
      ? [...target.positionDefinitions]
      : [{
          value: "device",
          label: "设备本体",
          parameterDefinitions: target.parameterDefinitions ?? []
        }];
    const measurementProfilePositionOptions = measurementProfilePositionDefinitions.map(({ value, label }) => ({ value, label }));
    const positionDefinitionByValue = new Map(
      measurementProfilePositionDefinitions.map((definition) => [definition.value, definition])
    );
    const ensureAssociatedField = (
      position: string,
      associatedField: string | undefined,
      measurementTypeId: string
    ) => {
      const field = String(associatedField ?? "").trim();
      if (!field) return;
      const existingDefinitions = positionDefinitionByValue.get(position)?.parameterDefinitions ?? [];
      if (existingDefinitions.some((definition) => String(definition.enName ?? "").trim().toLowerCase() === field.toLowerCase())) {
        return;
      }
      target.ensureAssociatedField?.(position, field, measurementTypeId);
    };
    const associatedFieldOptionsForPosition = (position: string) => {
      const seen = new Set<string>();
      return (positionDefinitionByValue.get(position)?.parameterDefinitions ?? []).flatMap((definition) => {
        const value = String(definition?.enName ?? "").trim();
        if (!value || seen.has(value.toLowerCase())) {
          return [];
        }
        seen.add(value.toLowerCase());
        const label = String(definition?.cnName ?? "").trim();
        const resolvedLabel = !label || label === value ? (PARAM_LABELS?.[value] ?? value) : label;
        return [{
          value,
          label: resolvedLabel !== value ? `${resolvedLabel} (${value})` : value
        }];
      });
    };
    const measurementProfilePositionValue = (item: DeviceMeasurementProfileItem) => item.position ?? "device";
    const measurementConfigStatusText =
      measurementConfigSaveStatus === "saving"
        ? "正在保存..."
        : measurementConfigSaveStatus === "saved"
          ? "已保存到本地和后台。"
          : measurementConfigSaveStatus === "error"
            ? "后台保存失败，请检查后台服务。"
            : "量测定义会随右下角保存元件定义一并生效。";
    return (
      <section className="device-definition-measurement-panel measurement-config-panel measurement-profile-panel">
        <div className="measurement-profile-toolbar">
          <Button
            htmlType="button"
            disabled={draftConfig.measurementTypes.length === 0 || !selectedKind}
            onClick={() => {
              const type = draftConfig.measurementTypes[0];
              if (!type) return;
              const associatedField = type.key || type.id;
              target.setItems([...selectedProfileItems, {
                measurementTypeId: type.id,
                name: type.name,
                position: "device",
                associatedField,
                defaultVisible: type.defaultVisible
              }]);
              const addedIndex = selectedProfileItems.length;
              target.setSelectedRowIndexes?.([addedIndex]);
              target.setSelectionAnchorIndex?.(addedIndex);
              ensureAssociatedField("device", associatedField, type.id);
            }}
          >
            添加量测
          </Button>
          <Button disabled={selectedRowIndexes.length === 0} onClick={copySelectedItems}>复制</Button>
          <Button disabled={selectedRowIndexes.length === 0} onClick={() => moveSelectedItems(-1)}>上移</Button>
          <Button disabled={selectedRowIndexes.length === 0} onClick={() => moveSelectedItems(1)}>下移</Button>
          <Button disabled={selectedRowIndexes.length === 0} onClick={deleteSelectedItems}>删除</Button>
          <span>{selectedRowIndexes.length > 0 ? `已选 ${selectedRowIndexes.length} 行` : "点击行选择，Ctrl/Shift 可多选"}</span>
          <span>类 {selectedKind || "未设置"} / 参考图元 {target.label}</span>
        </div>
        <div className="measurement-table-wrap">
          <table className="measurement-table measurement-profile-table">
            <thead>
              <tr>
                <th>序号</th>
                <th>量测名称</th>
                <th>显示格式</th>
                <th>量测类型</th>
                <th>量测位置</th>
                <th>关联字段</th>
                <th>默认显示</th>
                <th>默认值</th>
              </tr>
            </thead>
            <tbody>
              {selectedProfileItems.length > 0 ? selectedProfileItems.map((item, itemIndex) => {
                const currentType = editableMeasurementTypeById.get(item.measurementTypeId) ?? draftConfig.measurementTypes[0];
                const itemPosition = measurementProfilePositionValue(item);
                const associatedFieldOptions = associatedFieldOptionsForPosition(itemPosition);
                return (
                  <tr
                    key={`${selectedKind}-${item.measurementTypeId}-${item.position ?? "legacy"}-${item.role ?? "item"}-${itemIndex}`}
                    className={`definition-table-row${selectedRowIndexSet.has(itemIndex) ? " selected" : ""}`}
                    aria-selected={selectedRowIndexSet.has(itemIndex)}
                    onClick={(event) => selectRow(itemIndex, event)}
                  >
                    <td className="definition-table-sequence">{itemIndex + 1}</td>
                    <td>
                      <BufferedTextInput
                        value={item.name ?? item.labelOverride ?? ""}

                        placeholder={currentType?.name ?? "量测名称"}
                        onCommit={(nextValue: string) => updateItem(itemIndex, {
                          name: nextValue,
                          labelOverride: undefined
                        })}
                      />
                    </td>
                    <td>
                      <BufferedTextInput
                        value={item.formatOverride ?? ""}

                        placeholder={defaultMeasurementDisplayFormat(currentType?.valueType, currentType?.defaultDecimals)}
                        onCommit={(nextValue: string) => updateItem(itemIndex, {
                          formatOverride: nextValue.trim() || undefined
                        })}
                      />
                    </td>
                    <td>
                      <Select
                        value={item.measurementTypeId}

                        onChange={(nextTypeId) => {
                          const nextType = editableMeasurementTypeById.get(nextTypeId);
                          const previousType = editableMeasurementTypeById.get(item.measurementTypeId);
                          const currentAssociatedField = String(item.associatedField ?? "").trim();
                          const replaceAssociatedField = !currentAssociatedField ||
                            currentAssociatedField === previousType?.key ||
                            currentAssociatedField === previousType?.id;
                          const nextAssociatedField = replaceAssociatedField
                            ? nextType?.key || nextTypeId
                            : currentAssociatedField;
                          updateItem(itemIndex, {
                            measurementTypeId: nextTypeId,
                            name: item.name || nextType?.name || item.name,
                            associatedField: nextAssociatedField || undefined
                          });
                          ensureAssociatedField(itemPosition, nextAssociatedField, nextTypeId);
                        }}
                        options={[
                          ...(!editableMeasurementTypeById.has(item.measurementTypeId) ? [{ value: item.measurementTypeId, label: item.measurementTypeId }] : []),
                          ...draftConfig.measurementTypes.map((type: any) => ({ value: type.id, label: type.name }))
                        ]}
                      />
                    </td>
                    <td>
                      <Select
                        value={itemPosition}

                        onChange={(nextPosition) => {
                          const currentAssociatedField = String(item.associatedField ?? "").trim();
                          updateItem(itemIndex, {
                            position: nextPosition
                          });
                          ensureAssociatedField(nextPosition, currentAssociatedField, item.measurementTypeId);
                        }}
                        options={measurementProfilePositionOptions.map((option) => ({ value: option.value, label: option.label }))}
                      />
                    </td>
                    <td>
                      <Select
                        value={item.associatedField ?? ""}

                        title={item.associatedField && !associatedFieldOptions.some((option) => option.value === item.associatedField)
                          ? "当前关联字段不在元件属性名称列表中"
                          : "关联到元件属性名称"}
                        onChange={(nextValue) => {
                          const nextAssociatedField = nextValue || undefined;
                          updateItem(itemIndex, { associatedField: nextAssociatedField });
                          ensureAssociatedField(itemPosition, nextAssociatedField, item.measurementTypeId);
                        }}
                        options={[
                          { value: "", label: "未关联（使用量测类型ID）" },
                          ...(item.associatedField && !associatedFieldOptions.some((option) => option.value === item.associatedField) ? [{ value: item.associatedField, label: `${item.associatedField}（未在属性中）` }] : []),
                          ...associatedFieldOptions.map((option) => ({ value: option.value, label: option.label }))
                        ]}
                      />
                    </td>
                    <td>
                      <Select
                        value={item.defaultVisible === undefined ? "type" : item.defaultVisible ? "1" : "0"}

                        onChange={(value) => updateItem(itemIndex, {
                          defaultVisible: value === "type" ? undefined : value === "1"
                        })}
                        options={[{ value: "type", label: "跟随类型" }, { value: "1", label: "显示" }, { value: "0", label: "隐藏" }]}
                      />
                    </td>
                    <td>
                      <InputNumber size="small"
                        step={0.01}
                        value={item.defaultValue ?? 0}

                        placeholder="0"
                        onChange={(nextValue) => updateItem(itemIndex, {
                          defaultValue: nextValue === null ? 0 : Number(nextValue)
                        })}
                      />
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={8}>当前类还没有默认量测模板。</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <footer className="measurement-config-actions device-definition-measurement-actions">
          <span className={`measurement-config-status ${measurementConfigSaveStatus === "error" ? "error" : ""}`}>
            {measurementConfigStatusText}
          </span>
        </footer>
      </section>
    );
  };
}

export function createRenderMeasurementConfigDialog(__appScope: ProjectCanvasScope) {
  return () => {
  const { BufferedTextInput, DeferredColorInput, Download, FileInput, Save, addMeasurementType, button, closeMeasurementConfigDialog, deleteMeasurementType, deviceLibraryDialogLayouts, deviceLibraryDialogStyle, div, exportLibraryPackage, flushMeasurementConfigDialogDraftInputs, footer, h2, header, input, measurementConfig, measurementConfigDialogOpen, measurementConfigDialogRef, measurementConfigDraft, measurementConfigSaveStatus, openLibraryPackageImportFilePicker, option, p, saveMeasurementConfigDialog, section, select, span, startDeviceLibraryDialogDrag, startDeviceLibraryDialogResize, stopDeviceLibraryDialogEvent, table, tbody, td, th, thead, tr, updateMeasurementConfig, updateMeasurementType } = __appScope;
    if (!measurementConfigDialogOpen) {
      return null;
    }
    const draftConfig = measurementConfigDraft ?? measurementConfig;
    const groupDefaults = draftConfig.groupDefaults ?? DEFAULT_MEASUREMENT_CONFIG.groupDefaults;
    const updateGroupDefaults = (patch: Record<string, unknown>) => updateMeasurementConfig((current: any) => ({
      ...current,
      groupDefaults: {
        ...(current.groupDefaults ?? DEFAULT_MEASUREMENT_CONFIG.groupDefaults),
        ...patch
      }
    }));
    const measurementConfigStatusText =
      measurementConfigSaveStatus === "saving"
        ? "正在保存..."
        : measurementConfigSaveStatus === "saved"
          ? "已保存到本地和后台。"
          : measurementConfigSaveStatus === "error"
            ? "后台保存失败，请检查后台服务。"
            : "未点击保存前，本次修改只保留在当前窗口。";
    return (
      <div className="image-picker-backdrop measurement-config-backdrop" onPointerDown={closeMeasurementConfigDialog}>
        <section
          ref={measurementConfigDialogRef}
          className={`measurement-config-dialog window-close-host${deviceLibraryDialogLayouts.measurementConfig ? " floating" : ""}`}
          style={deviceLibraryDialogStyle("measurementConfig")}
          onPointerDown={stopDeviceLibraryDialogEvent}
          onPointerUp={stopDeviceLibraryDialogEvent}
          onPointerCancel={stopDeviceLibraryDialogEvent}
          onLostPointerCapture={stopDeviceLibraryDialogEvent}
          role="dialog"
          aria-modal="true"
          aria-labelledby="measurement-config-title"
        >
          <WindowCloseButton label="关闭动态量测配置" onClick={closeMeasurementConfigDialog} />
          <header>
            <div className="device-library-dialog-title" onPointerDown={(event) => startDeviceLibraryDialogDrag("measurementConfig", event)}>
              <h2 id="measurement-config-title">动态量测配置</h2>
              <p>配置全平台统一的量测类型、单位、小数位和默认显示样式。</p>
            </div>
          </header>
            <div className="measurement-config-panel">
              <section className="measurement-group-defaults" aria-labelledby="measurement-group-defaults-title">
                <div className="measurement-group-defaults-heading">
                  <strong id="measurement-group-defaults-title">新增量测框默认样式</strong>
                  <span>仅应用于保存配置后新建的量测框，已有量测框保持不变。</span>
                </div>
                <div className="measurement-group-defaults-grid">
                  <label>
                    <span>默认背景色</span>
                    <DeferredColorInput
                      value={groupDefaults.backgroundColor}
                      fallback="transparent"
                      onCommit={(value: string) => updateGroupDefaults({ backgroundColor: value })}
                    />
                  </label>
                  <label>
                    <span>默认边框色</span>
                    <DeferredColorInput
                      value={groupDefaults.borderColor}
                      fallback="#64748b"
                      onCommit={(value: string) => updateGroupDefaults({ borderColor: value })}
                    />
                  </label>
                  <label>
                    <span>默认边框宽度</span>
                    <InputNumber size="small"
                      min={0}
                      max={12}
                      step={1}
                      value={groupDefaults.borderWidth}
                      onChange={(nextValue) => updateGroupDefaults({ borderWidth: Number(nextValue) })}
                    />
                  </label>
                  <label>
                    <span>默认边框类型</span>
                    <Select
                      value={groupDefaults.borderStyle}
                      onChange={(value) => updateGroupDefaults({ borderStyle: value })}
                      options={[{ value: "none", label: "无边框" }, { value: "solid", label: "实线" }, { value: "dashed", label: "虚线" }, { value: "dotted", label: "点线" }]}
                    />
                  </label>
                </div>
              </section>
              <div className="measurement-config-toolbar">
                <Button onClick={addMeasurementType}>新增量测类型</Button>
              </div>
            <div className="measurement-table-wrap">
              <table className="measurement-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>名称</th>
                    <th>标签</th>
                    <th>单位</th>
                    <th>小数</th>
                    <th>默认值</th>
                    <th>字号</th>
                    <th>颜色</th>
                    <th>默认显示</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {draftConfig.measurementTypes.map((type: any) => (
                    <tr key={type.id}>
                      <td><Input value={type.id} readOnly title="量测类型ID用于保存绑定关系，不能直接修改" /></td>
                      <td><BufferedTextInput value={type.name} onCommit={(nextValue: string) => updateMeasurementType(type.id, { name: nextValue })} /></td>
                      <td><BufferedTextInput value={type.shortLabel} onCommit={(nextValue: string) => updateMeasurementType(type.id, { shortLabel: nextValue })} /></td>
                      <td><BufferedTextInput value={type.defaultUnit} onCommit={(nextValue: string) => updateMeasurementType(type.id, { defaultUnit: nextValue })} /></td>
                      <td>
                        <InputNumber size="small"
                          min={0}
                          max={8}
                          value={type.defaultDecimals}
                          onChange={(nextValue) => updateMeasurementType(type.id, { defaultDecimals: Number(nextValue) })}
                        />
                      </td>
                      <td>
                        <InputNumber size="small"
                          step={0.01}
                          precision={type.defaultDecimals}
                          value={type.defaultValue}
                          onChange={(nextValue) => updateMeasurementType(type.id, { defaultValue: Number(nextValue) })}
                        />
                      </td>
                      <td>
                        <InputNumber size="small"
                          min={6}
                          max={96}
                          value={type.defaultFontSize}
                          onChange={(nextValue) => updateMeasurementType(type.id, { defaultFontSize: Number(nextValue) })}
                        />
                      </td>
                      <td>
                        <DeferredColorInput value={type.defaultColor} fallback="#334155" onCommit={(value: string) => updateMeasurementType(type.id, { defaultColor: value })} />
                      </td>
                      <td>
                        <Select
                          value={type.defaultVisible ? "1" : "0"}
                          onChange={(value) => updateMeasurementType(type.id, { defaultVisible: value === "1" })}
                          options={[{ value: "1", label: "显示" }, { value: "0", label: "隐藏" }]}
                        />
                      </td>
                      <td><Button onClick={() => deleteMeasurementType(type.id)}>删除</Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <footer className="measurement-config-actions">
            <span className={`measurement-config-status ${measurementConfigSaveStatus === "error" ? "error" : ""}`}>
              {measurementConfigStatusText}
            </span>
            <Button onClick={closeMeasurementConfigDialog}>取消</Button>
            <Button
              htmlType="button"
              className="primary"
              disabled={measurementConfigSaveStatus === "saving"}
              onPointerDown={flushMeasurementConfigDialogDraftInputs}
              onClick={() => void saveMeasurementConfigDialog()}
            >
              <Save size={14} />
              保存
            </Button>
          </footer>
          <div
            className="device-library-dialog-resize"
            role="separator"
            aria-orientation="horizontal"
            aria-label="调整动态量测配置窗口大小"
            title="拖拽调整窗口大小"
            onPointerDown={(event) => startDeviceLibraryDialogResize("measurementConfig", event)}
          />
        </section>
      </div>
    );
  };
}

export function createRenderMeasurementEditorDialog(__appScope: ProjectCanvasScope) {
  return () => {
  const { BufferedTextInput, DeferredColorInput, addMeasurementEditorDraftItem, button, confirmMeasurementEditorDialog, deviceLibraryDialogLayouts, deviceLibraryDialogStyle, div, h2, header, label, measurementConfig, measurementEditorColumnWidths, measurementEditorDialog, measurementEditorDialogRef, measurementEditorItemName, measurementGroupBackgroundColor, measurementTypeById, measurementTypeOptionsForMeasurementGroup, moveMeasurementEditorDraftItem, nodeById, option, p, removeMeasurementEditorDraftItem, section, select, setMeasurementEditorDialog, span, startDeviceLibraryDialogDrag, startMeasurementEditorTableColumnResize, stopDeviceLibraryDialogEvent, table, tbody, td, th, thead, tr, updateMeasurementEditorDraftItem, updateMeasurementEditorDraftItemPosition, updateMeasurementEditorGroupSettings } = __appScope;
    if (!measurementEditorDialog) {
      return null;
    }
    const node = nodeById.get(measurementEditorDialog.nodeId);
    if (!node) {
      return null;
    }
    const draft = measurementEditorDialog.drafts[0];
    if (!draft) {
      return null;
    }
    const measurementEditorPositionLabel = (group: MeasurementGroup) => {
      const terminal = group.terminalId ? node.terminals.find((item: ModelNode["terminals"][number]) => item.id === group.terminalId) : undefined;
      return terminal?.label || (group.terminalId ? group.terminalId : "设备层");
    };
    const measurementEditorRows = measurementEditorDialog.drafts.flatMap((group: MeasurementGroup) =>
      group.items.map((item: MeasurementGroup["items"][number], itemIndex: number) => ({ group, groupId: group.id, item, itemIndex }))
    );
    const measurementEditorColumns = [
      { key: "index", label: "序号", width: 72 },
      { key: "actions", label: "操作", width: 136 },
      { key: "name", label: "量测名称", width: 128 },
      { key: "position", label: "量测位置", width: 118 },
      { key: "type", label: "量测类型", width: 128 },
      { key: "visible", label: "显示", width: 80 },
      { key: "sourcePoint", label: "测点", width: 170 },
      { key: "label", label: "标签", width: 92 },
      { key: "format", label: "显示格式", width: 108 },
      { key: "unit", label: "单位", width: 92 },
      { key: "decimals", label: "小数位", width: 88 },
      { key: "defaultValue", label: "默认值", width: 88 },
      { key: "color", label: "颜色", width: 88 },
      { key: "fontSize", label: "字号", width: 84 }
    ];
    const measurementEditorColumnWidth = (column: { key: string; width: number }) =>
      measurementEditorColumnWidths[column.key] ?? column.width;
    const measurementEditorTableWidth = measurementEditorColumns.reduce(
      (total, column) => total + measurementEditorColumnWidth(column),
      0
    );
    const draftBackgroundHidden = measurementGroupBackgroundColor(draft) === "transparent";
    const draftBorderHidden = (draft.borderStyle ?? "none") === "none";
    return (
      <div className="image-picker-backdrop measurement-editor-backdrop" onPointerDown={() => setMeasurementEditorDialog(null)}>
        <section
          ref={measurementEditorDialogRef}
          className={`measurement-editor-dialog window-close-host${deviceLibraryDialogLayouts.measurementEditor ? " floating" : ""}`}
          style={deviceLibraryDialogStyle("measurementEditor")}
          onPointerDown={stopDeviceLibraryDialogEvent}
          onPointerUp={stopDeviceLibraryDialogEvent}
          onPointerCancel={stopDeviceLibraryDialogEvent}
          onLostPointerCapture={stopDeviceLibraryDialogEvent}
          onClick={(event) => event.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="measurement-editor-title"
        >
          <WindowCloseButton label="关闭量测显示定义" onClick={() => setMeasurementEditorDialog(null)} />
          <header>
            <div className="measurement-editor-dialog-title" onPointerDown={(event) => startDeviceLibraryDialogDrag("measurementEditor", event)}>
              <h2 id="measurement-editor-title">修改量测显示定义</h2>
              <p>{node.name}：共 {measurementEditorRows.length} 项量测，可在同一窗口中修改显示状态、布局、样式、量测名称、位置和测点。</p>
            </div>
          </header>
          <div className="measurement-editor-summary">
            <label>
              <span>量测组显示</span>
              <Select
                value={draft.visible ? "1" : "0"}

                onChange={(value) => updateMeasurementEditorGroupSettings((group: any) => ({ ...group, visible: value === "1" }))}
                options={[{ value: "1", label: "显示" }, { value: "0", label: "隐藏" }]}
              />
            </label>
            <label>
              <span>布局</span>
              <Select
                value={draft.layout}

                onChange={(value) => updateMeasurementEditorGroupSettings((group: any) => ({ ...group, layout: value as MeasurementGroup["layout"] }))}
                options={[{ value: "vertical", label: "竖向" }, { value: "horizontal", label: "横向" }, { value: "grid", label: "两列" }]}
              />
            </label>
            <label>
              <span>标签显示</span>
              <Select
                aria-label="量测标签显示"
                value={draft.labelVisible === false ? "0" : "1"}

                onChange={(value) => updateMeasurementEditorGroupSettings((group: any) => ({ ...group, labelVisible: value === "1" }))}
                options={[{ value: "1", label: "显示" }, { value: "0", label: "隐藏" }]}
              />
            </label>
            <label>
              <span>单位显示</span>
              <Select
                aria-label="量测单位显示"
                value={draft.unitVisible === false ? "0" : "1"}

                onChange={(value) => updateMeasurementEditorGroupSettings((group: any) => ({ ...group, unitVisible: value === "1" }))}
                options={[{ value: "1", label: "显示" }, { value: "0", label: "隐藏" }]}
              />
            </label>
            <label>
              <span>字体颜色</span>
              <DeferredColorInput
                value={draft.groupStyleOverride?.color ?? "#334155"}
                fallback="#334155"

                aria-label="量测组字体颜色"
                onCommit={(value: string) => updateMeasurementEditorGroupSettings((group: any) => ({
                  ...group,
                  groupStyleOverride: { ...(group.groupStyleOverride ?? {}), color: value }
                }))}
              />
            </label>
            <label>
              <span>字体大小</span>
              <InputNumber size="small"
                min={6}
                max={96}
                value={draft.groupStyleOverride?.fontSize ?? 14}

                aria-label="量测组字体大小"
                onChange={(nextValue) => updateMeasurementEditorGroupSettings((group: any) => ({
                  ...group,
                  groupStyleOverride: {
                    ...(group.groupStyleOverride ?? {}),
                    fontSize: clampNumber(Number(nextValue), 6, 96)
                  }
                }))}
              />
            </label>
            <label>
              <span>背景显示</span>
              <Select
                value={draftBackgroundHidden ? "0" : "1"}

                onChange={(value) => updateMeasurementEditorGroupSettings((group: any) => ({
                  ...group,
                  backgroundColor: value === "1"
                    ? group.backgroundColor === "transparent" ? "#ffffff" : group.backgroundColor ?? "#ffffff"
                    : "transparent"
                }))}
                options={[{ value: "1", label: "显示" }, { value: "0", label: "透明" }]}
              />
            </label>
            <label>
              <span>背景颜色</span>
              <DeferredColorInput
                value={draft.backgroundColor ?? ""}
                fallback="#ffffff"
                disabled={draftBackgroundHidden}
                onCommit={(value: string) => updateMeasurementEditorGroupSettings((group: any) => ({ ...group, backgroundColor: value }))}
              />
            </label>
            <label>
              <span>边框样式</span>
              <Select
                value={draft.borderStyle ?? "none"}

                onChange={(borderStyle) => {
                  const bs = borderStyle as MeasurementGroup["borderStyle"];
                  updateMeasurementEditorGroupSettings((group: any) => ({
                    ...group,
                    borderStyle: bs,
                    borderWidth: bs === "none" ? 0 : Math.max(1, group.borderWidth ?? 0)
                  }));
                }}
                options={[{ value: "solid", label: "实线" }, { value: "dashed", label: "虚线" }, { value: "dotted", label: "点线" }, { value: "none", label: "无边框" }]}
              />
            </label>
            <label>
              <span>边框颜色</span>
              <DeferredColorInput
                value={draft.borderColor ?? ""}
                fallback="#64748b"
                disabled={draftBorderHidden}
                onCommit={(value: string) => updateMeasurementEditorGroupSettings((group: any) => ({ ...group, borderColor: value }))}
              />
            </label>
            <label>
              <span>边框宽度</span>
              <InputNumber size="small"
                min={0}
                max={12}
                step={0.5}
                value={draft.borderWidth ?? 0}
                disabled={draftBorderHidden}
                onChange={(nextValue) => updateMeasurementEditorGroupSettings((group: any) => ({
                  ...group,
                  borderWidth: clampNumber(Number(nextValue), 0, 12)
                }))}
              />
            </label>
          </div>
          <div className="measurement-editor-toolbar">
            <Button
              htmlType="button"
              disabled={measurementConfig.measurementTypes.length === 0}
              onClick={() => addMeasurementEditorDraftItem(node)}
            >
              添加一行量测
            </Button>
          </div>
          <div className="measurement-editor-table-wrap">
            <table className="measurement-editor-table" style={{ width: `${measurementEditorTableWidth}px` }}>
              <colgroup>
                {measurementEditorColumns.map((column) => (
                  <col key={column.key} style={{ width: `${measurementEditorColumnWidth(column)}px` }} />
                ))}
              </colgroup>
              <thead>
                <tr>
                  {measurementEditorColumns.map((column) => (
                    <th key={column.key} style={{ width: `${measurementEditorColumnWidth(column)}px` }}>
                      <span className="measurement-editor-column-title">{column.label}</span>
                      <span
                        className="measurement-editor-column-resize"
                        role="separator"
                        aria-orientation="vertical"
                        aria-label={`调整${column.label}列宽`}
                        title="拖拽调整列宽"
                        onPointerDown={(event) => startMeasurementEditorTableColumnResize(column.key, column.width, event)}
                      />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {measurementEditorRows.length > 0 ? measurementEditorRows.map((row: { group: MeasurementGroup; groupId: string; item: MeasurementGroup["items"][number]; itemIndex: number }, rowIndex: number) => {
                  const { group, item, itemIndex } = row;
                  const type = measurementTypeById.get(item.measurementTypeId) ?? measurementConfig.measurementTypes[0];
                  const measurementTypeOptions = measurementTypeOptionsForMeasurementGroup(node, group);
                  const itemColor = item.styleOverride?.color ?? group.groupStyleOverride?.color ?? type?.defaultColor ?? "#334155";
                  const itemFontSize = item.styleOverride?.fontSize ?? group.groupStyleOverride?.fontSize ?? type?.defaultFontSize ?? 14;
                  return (
                    <tr key={item.id}>
                      <td>{rowIndex + 1}</td>
                      <td>
                        <div className="measurement-editor-row-actions">
                          <Button
                            htmlType="button"
                            disabled={itemIndex === 0}
                            onClick={() => moveMeasurementEditorDraftItem(row.groupId, item.id, -1)}
                          >
                            上移
                          </Button>
                          <Button
                            htmlType="button"
                            disabled={itemIndex === group.items.length - 1}
                            onClick={() => moveMeasurementEditorDraftItem(row.groupId, item.id, 1)}
                          >
                            下移
                          </Button>
                          <Button
                            htmlType="button"

                            onClick={() => removeMeasurementEditorDraftItem(row.groupId, item.id)}
                          >
                            删除
                          </Button>
                        </div>
                      </td>
                      <td>
                        <BufferedTextInput
                          value={measurementEditorItemName(item)}

                          aria-label="量测名称"
                          onCommit={(nextValue: string) => updateMeasurementEditorDraftItem(row.groupId, item.id, (current: any) => ({
                            ...current,
                            name: nextValue
                          }))}
                        />
                      </td>
                      <td>
                        <Select
                          value={group.terminalId ?? ""}

                          aria-label="量测位置"
                          title={measurementEditorPositionLabel(group)}
                          onChange={(value) => updateMeasurementEditorDraftItemPosition(node, row.groupId, item.id, value)}
                          options={[
                            { value: "", label: "设备层" },
                            ...node.terminals.map((terminal: ModelNode["terminals"][number], terminalIndex: number) => ({ value: terminal.id, label: terminal.label || `端子${terminalIndex + 1}` }))
                          ]}
                        />
                      </td>
                      <td>
                        <Select
                          value={item.measurementTypeId}

                          onChange={(nextTypeId) => {
                            updateMeasurementEditorDraftItem(row.groupId, item.id, (current: any) => ({
                              ...current,
                              measurementTypeId: nextTypeId,
                              sourcePoint: current.sourcePoint || `${node.id}.${nextTypeId}`
                            }));
                          }}
                          options={[
                            ...(!measurementTypeOptions.some((candidate: any) => candidate.id === item.measurementTypeId) ? [{ value: item.measurementTypeId, label: item.measurementTypeId }] : []),
                            ...measurementTypeOptions.map((candidate: any) => ({ value: candidate.id, label: candidate.name }))
                          ]}
                        />
                      </td>
                      <td>
                        <Select
                          value={item.visible === false ? "0" : "1"}

                          onChange={(value) => updateMeasurementEditorDraftItem(row.groupId, item.id, (current: any) => ({
                            ...current,
                            visible: value === "1"
                          }))}
                          options={[{ value: "1", label: "显示" }, { value: "0", label: "隐藏" }]}
                        />
                      </td>
                      <td>
                        <BufferedTextInput
                          value={item.sourcePoint}

                          onCommit={(nextValue: string) => updateMeasurementEditorDraftItem(row.groupId, item.id, (current: any) => ({
                            ...current,
                            sourcePoint: nextValue
                          }))}
                        />
                      </td>
                      <td>
                        <BufferedTextInput
                          value={item.labelOverride ?? ""}

                          placeholder={type?.shortLabel ?? "标签"}
                          onCommit={(nextValue: string) => updateMeasurementEditorDraftItem(row.groupId, item.id, (current: any) => ({
                            ...current,
                            labelOverride: nextValue
                          }))}
                        />
                      </td>
                      <td>
                        <BufferedTextInput
                          value={item.formatOverride ?? ""}

                          placeholder={defaultMeasurementDisplayFormat(type?.valueType, type?.defaultDecimals)}
                          onCommit={(nextValue: string) => updateMeasurementEditorDraftItem(row.groupId, item.id, (current: any) => ({
                            ...current,
                            formatOverride: nextValue.trim() || undefined
                          }))}
                        />
                      </td>
                      <td>
                        <BufferedTextInput
                          value={item.unitOverride ?? ""}

                          placeholder={type?.defaultUnit ?? "单位"}
                          onCommit={(nextValue: string) => updateMeasurementEditorDraftItem(row.groupId, item.id, (current: any) => ({
                            ...current,
                            unitOverride: nextValue
                          }))}
                        />
                      </td>
                      <td>
                        <InputNumber size="small"
                          min={0}
                          max={8}
                          value={item.decimalsOverride ?? ""}

                          placeholder={String(type?.defaultDecimals ?? 3)}
                          onChange={(nextValue) => updateMeasurementEditorDraftItem(row.groupId, item.id, (current: any) => ({
                            ...current,
                            decimalsOverride: nextValue === null ? undefined : Number(nextValue)
                          }))}
                        />
                      </td>
                      <td>
                        <InputNumber size="small"
                          step={0.01}
                          value={item.defaultValue ?? 0}

                          placeholder="0"
                          onChange={(nextValue) => updateMeasurementEditorDraftItem(row.groupId, item.id, (current: any) => ({
                            ...current,
                            defaultValue: nextValue === null ? 0 : Number(nextValue)
                          }))}
                        />
                      </td>
                      <td>
                        <DeferredColorInput
                          value={itemColor}

                          onCommit={(value: string) => updateMeasurementEditorDraftItem(row.groupId, item.id, (current: any) => ({
                            ...current,
                            styleOverride: { ...(current.styleOverride ?? {}), color: value }
                          }))}
                        />
                      </td>
                      <td>
                        <InputNumber size="small"
                          min={6}
                          max={96}
                          value={itemFontSize}

                          onChange={(nextValue) => updateMeasurementEditorDraftItem(row.groupId, item.id, (current: any) => ({
                            ...current,
                            styleOverride: { ...(current.styleOverride ?? {}), fontSize: Number(nextValue) }
                          }))}
                        />
                      </td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan={12}>当前设备没有量测项。</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="template-dialog-actions">
            <Button
              htmlType="button"
              disabled={measurementEditorDialog.drafts.every((group: MeasurementGroup) => group.items.length === 0)}
              onClick={confirmMeasurementEditorDialog}
            >
              保存
            </Button>
            <Button onClick={() => setMeasurementEditorDialog(null)}>取消</Button>
          </div>
        </section>
      </div>
    );
  };
}

export function createSaveCurrentProject(__appScope: ProjectCanvasScope) {
  return async (targetId?: string) => {
  const { clearRefreshRecoveryProject, createSavedProject, currentGraphDirtyBaseline, currentModelSelectionRef, currentProject, deferredMoveOptimizationCancelRef, deferredRoutableLineRouteRepairCancelRef, finalizeSavedGlobalLineProjectNodes, findProjectRecordByNameInScheme, findSavedSchemeById, findSchemeForProject, graphDirtyBaselineRef, projectById, rememberPersistedSchemesPayload, saveActiveProjectPointer, saveBackendProjectRecord, savedSchemePathForId, savedUndoStackLengthRef, selectedSchemeId, serializeSchemesForStorage, setActiveProjectKey, setActiveSchemeKey, setHasUnsavedChanges, setProjectName, setSchemes, suppressNextGraphDirtyRef, undoStack, upsertSavedProjectInScheme, writeOperationLog } = __appScope;
    const latestScope = () => (__appScope.__appScopeRef?.current as ProjectCanvasScope | undefined) ?? __appScope;
    const sendFrontendExportsAfterSave = async (savedProject: ProjectFile) => {
      const scopeSnapshot = latestScope();
      if (!isFrontendExportMode(scopeSnapshot)) {
        return;
      }
      try {
        await sendFrontendExportArtifacts(scopeSnapshot, savedProject);
        writeOperationLog("前端模式导出已发送：CIM/XML、E 文件、SVG");
      } catch (error) {
        const message = error instanceof Error ? error.message : "前端模式导出发送失败。";
        showGlobalMessage(`模型已保存，但${message}`);
        writeOperationLog(`前端模式导出发送失败：${message}`);
      }
    };
    const initial = latestScope();
    const initialActiveProjectKey = initial.activeProjectKey;
    const initialActiveSchemeKey = initial.activeSchemeKey;
    const initialProjectName = initial.projectName;
    const initialSchemes = initial.schemes;
    const currentSelection = currentModelSelectionRef?.current;
    const currentProjectKey = currentSelection?.projectKey || initialActiveProjectKey;
    const currentSchemeKey = currentSelection?.schemeKey || initialActiveSchemeKey;
    modelTrace("save-start", {
      requestedTargetId: targetId ?? "",
      currentProjectKey,
      currentSchemeKey,
      activeProjectKey: initialActiveProjectKey,
      activeSchemeKey: initialActiveSchemeKey,
      projectName: initialProjectName,
      loading: currentSelection?.loading ?? false,
      nodeCount: __appScope.nodes?.length ?? 0,
      initialPointer: __appScope.latestActiveProjectPointerRef?.current
    });
    if (currentSelection?.loading) {
      writeOperationLog("模型正在切换，加载完成后再保存。");
      return false;
    }
    if (targetId === undefined) {
      targetId = currentProjectKey;
    }
    const existingTargetProject = targetId ? projectById.get(targetId) : undefined;
    if ((!targetId || !existingTargetProject) && initialSchemes.length === 0) {
      showGlobalMessage("没有可保存的方案和模型，请先新建方案或导入方案。");
      writeOperationLog("方案为空、模型为空，无法保存");
      return false;
    }
    deferredMoveOptimizationCancelRef.current?.();
    deferredMoveOptimizationCancelRef.current = null;
    deferredRoutableLineRouteRepairCancelRef.current?.();
    deferredRoutableLineRouteRepairCancelRef.current = null;
    const finalizeSavedGlobalLines = async (savedRecord: SavedProjectRecord): Promise<ModelNode[]> => {
      const currentNodes = currentGraphDirtyBaseline().nodes as ModelNode[];
      if (typeof finalizeSavedGlobalLineProjectNodes !== "function") return currentNodes;
      try {
        const finalizedNodes = await finalizeSavedGlobalLineProjectNodes(savedRecord.project.nodes ?? []);
        return Array.isArray(finalizedNodes) ? finalizedNodes : currentNodes;
      } catch (error) {
        writeOperationLog(error instanceof Error ? `模型已保存，但刷新全局线路页面状态失败：${error.message}` : "模型已保存，但刷新全局线路页面状态失败。");
        return currentNodes;
      }
    };
    if (targetId && existingTargetProject) {
      const existing = existingTargetProject;
      const record: SavedProjectRecord = {
        ...existing,
        name: initialProjectName,
        project: currentProject(),
        updatedAt: new Date().toISOString()
      };
      const ownerScheme = findSchemeForProject(targetId);
      const ownerSchemePath = ownerScheme ? savedSchemePathForId(initialSchemes, ownerScheme.id) ?? [ownerScheme.name] : [];
      if (!ownerScheme || ownerSchemePath.length === 0) {
        showGlobalMessage("当前模型没有所属方案路径，无法保存到后台目录。");
        writeOperationLog(`保存模型到后台失败：${record.name}`);
        return false;
      }
      let savedRecord: SavedProjectRecord;
      try {
        savedRecord = await saveBackendProjectRecord(ownerSchemePath, record, existing.name);
      } catch (error) {
        const message = error instanceof Error ? error.message : `保存模型到后台失败：${record.name}`;
        showGlobalMessage(message);
        writeOperationLog(`保存模型到后台失败：${record.name}`);
        return false;
      }
      const savedGraphNodes = await finalizeSavedGlobalLines(savedRecord);
      const latestAfterSave = latestScope();
      const nextSchemes = upsertSavedProjectInScheme(latestAfterSave.schemes, ownerScheme.id, savedRecord);
      setSchemes(nextSchemes);
      rememberPersistedSchemesPayload(serializeSchemesForStorage(nextSchemes));
      if (currentModelSelectionRef) {
        currentModelSelectionRef.current = { projectKey: targetId, schemeKey: currentSchemeKey || ownerScheme.id || selectedSchemeId, loading: false };
      }
      setActiveProjectKey(targetId);
      if (savedRecord.name !== latestAfterSave.projectName) {
        suppressNextGraphDirtyRef.current += 1;
        setProjectName(savedRecord.name);
      }
      graphDirtyBaselineRef.current = { ...currentGraphDirtyBaseline(), nodes: savedGraphNodes };
      savedUndoStackLengthRef.current = undoStack.length;
      if (__appScope.savedMutationRevisionRef && __appScope.currentMutationRevisionRef) {
        __appScope.savedMutationRevisionRef.current = __appScope.currentMutationRevisionRef.current;
      }
      setHasUnsavedChanges(false);
      saveActiveProjectPointer(targetId, currentSchemeKey || ownerScheme.id || selectedSchemeId, nextSchemes);
      clearRefreshRecoveryProject();
      writeOperationLog(`保存模型：${savedRecord.name}`);
      await sendFrontendExportsAfterSave(savedRecord.project);
      modelTrace("save-complete", { branch: "existing", targetId, savedName: savedRecord.name, activeProjectKey: targetId, nodeCount: record.project?.nodes?.length ?? 0 });
      return true;
    }
    const targetSchemeId = initialActiveSchemeKey || selectedSchemeId || initialSchemes[0]?.id || "";
    const fallbackSchemes = initialSchemes;
    const resolvedSchemeId = findSavedSchemeById(fallbackSchemes, targetSchemeId) ? targetSchemeId : fallbackSchemes[0]?.id ?? "";
    if (!resolvedSchemeId) {
      showGlobalMessage("没有可保存的方案和模型，请先新建方案或导入方案。");
      writeOperationLog("方案为空、模型为空，无法保存");
      return false;
    }
    const targetScheme = findSavedSchemeById(fallbackSchemes, resolvedSchemeId);
    const recoveredRecord = findProjectRecordByNameInScheme(targetScheme, initialProjectName);
    const projectSnapshot = currentProject();
    const createdRecord = createSavedProject(initialProjectName, projectSnapshot);
    const record: SavedProjectRecord = recoveredRecord
      ? {
          ...recoveredRecord,
          name: initialProjectName,
          project: projectSnapshot,
          updatedAt: new Date().toISOString()
        }
      : createdRecord;
    const targetSchemePath = savedSchemePathForId(fallbackSchemes, resolvedSchemeId) ?? [targetScheme?.name ?? "默认方案"];
    let savedRecord: SavedProjectRecord;
    try {
      savedRecord = await saveBackendProjectRecord(targetSchemePath, record, recoveredRecord?.name);
    } catch (error) {
      const message = error instanceof Error ? error.message : `保存模型到后台失败：${record.name}`;
      showGlobalMessage(message);
      writeOperationLog(`保存模型到后台失败：${record.name}`);
      return false;
    }
    const savedGraphNodes = await finalizeSavedGlobalLines(savedRecord);
    const latestAfterFallbackSave = latestScope();
    const nextSchemes = upsertSavedProjectInScheme(latestAfterFallbackSave.schemes, resolvedSchemeId, savedRecord);
    setSchemes(nextSchemes);
    rememberPersistedSchemesPayload(serializeSchemesForStorage(nextSchemes));
    if (currentModelSelectionRef) {
      currentModelSelectionRef.current = { projectKey: savedRecord.id, schemeKey: resolvedSchemeId, loading: false };
    }
    setActiveProjectKey(savedRecord.id);
    setActiveSchemeKey(resolvedSchemeId);
    graphDirtyBaselineRef.current = { ...currentGraphDirtyBaseline(), nodes: savedGraphNodes };
    savedUndoStackLengthRef.current = undoStack.length;
    if (__appScope.savedMutationRevisionRef && __appScope.currentMutationRevisionRef) {
      __appScope.savedMutationRevisionRef.current = __appScope.currentMutationRevisionRef.current;
    }
    setHasUnsavedChanges(false);
    saveActiveProjectPointer(savedRecord.id, resolvedSchemeId, nextSchemes);
    clearRefreshRecoveryProject();
    writeOperationLog(`保存模型：${savedRecord.name}`);
    await sendFrontendExportsAfterSave(savedRecord.project);
    modelTrace("save-complete", { branch: "fallback", targetId: savedRecord.id, savedName: savedRecord.name, activeProjectKey: savedRecord.id, nodeCount: record.project?.nodes?.length ?? 0 });
    return true;
  };
}

export function createRenameProjectRecord(__appScope: ProjectCanvasScope) {
  return async (project: SavedProjectRecord) => {
  const { findSchemeForProject, handleBackendSchemeMutationFailure, hasSameName, renameSavedProject, saveBackendProjectRecord, schemePathForScheme, setProjectName, setSchemes, upsertSavedProjectInScheme } = __appScope;
    const latestScope = () => (__appScope.__appScopeRef?.current as ProjectCanvasScope | undefined) ?? __appScope;
    const nextName = await promptText("请输入新的模型名称", project.name);
    if (!nextName) {
      return;
    }
    const name = nextName.trim();
    const ownerScheme = findSchemeForProject(project.id);
    if (!name) {
      showGlobalMessage("模型名称不能为空。");
      return;
    }
    if (ownerScheme && hasSameName(name, ownerScheme.projects.filter((item: SavedProjectRecord) => item.id !== project.id).map((item: SavedProjectRecord) => item.name))) {
      showGlobalMessage("模型名称重复，无法修改。");
      return;
    }
    if (ownerScheme) {
      const renamedProjects = renameSavedProject(ownerScheme.projects, project.id, nextName);
      const renamedProject = renamedProjects.find((item: SavedProjectRecord) => item.id === project.id);
      if (renamedProject) {
        setSchemes((current: SavedSchemeRecord[]) => upsertSavedProjectInScheme(current, ownerScheme.id, renamedProject));
        const ownerPath = schemePathForScheme(ownerScheme.id);
        if (ownerPath.length > 0) {
          void saveBackendProjectRecord(ownerPath, renamedProject, project.name)
            .catch((error: unknown) => handleBackendSchemeMutationFailure(`重命名模型同步后台：${renamedProject.name}`, error));
        }
      }
    }
    if (latestScope().activeProjectKey === project.id) {
      setProjectName(nextName.trim() || "未命名模型");
    }
  };
}

export function createDuplicateProjectRecord(__appScope: ProjectCanvasScope) {
  return (project: SavedProjectRecord) => {
  const { cloneProjectRecordWithName, findSchemeForProject, handleBackendSchemeMutationFailure, promptUniqueRecordName, saveBackendProjectRecord, schemePathForScheme, setSchemes, uniqueRecordName, upsertSavedProjectInScheme } = __appScope;
    const ownerScheme = findSchemeForProject(project.id);
    const existingNames = ownerScheme?.projects.map((item: SavedProjectRecord) => item.name) ?? [];
    const defaultName = uniqueRecordName(`${project.name} 副本`, existingNames, "未命名模型");
    const name = promptUniqueRecordName(
      "请输入新模型名称",
      defaultName,
      existingNames,
      "模型名称不能为空。",
      "模型名称重复，无法复制。"
    );
    if (!name) {
      return;
    }
    if (ownerScheme) {
      const clonedProject = cloneProjectRecordWithName(project, name);
      setSchemes((current: SavedSchemeRecord[]) => upsertSavedProjectInScheme(current, ownerScheme.id, clonedProject));
      const ownerPath = schemePathForScheme(ownerScheme.id);
      if (ownerPath.length > 0) {
        void saveBackendProjectRecord(ownerPath, clonedProject)
          .then((saved: SavedProjectRecord) => setSchemes((current: SavedSchemeRecord[]) => upsertSavedProjectInScheme(current, ownerScheme.id, saved)))
          .catch((error: unknown) => handleBackendSchemeMutationFailure(`复制模型同步后台：${clonedProject.name}`, error));
      }
    }
  };
}

export function createDuplicateSelectedProjectRecords(__appScope: ProjectCanvasScope) {
  return () => {
  const { cloneProjectRecord, duplicateProjectRecord, flattenSavedSchemes, handleBackendSchemeMutationFailure, projectById, saveBackendProjectRecord, schemePathForRecord, schemes, selectedProjectId, selectedProjectIds, setSchemes, upsertSavedProject, upsertSavedProjectInScheme } = __appScope;
    if (selectedProjectIds.length <= 1) {
      const project = projectById.get(selectedProjectIds[0] ?? selectedProjectId);
      if (project) {
        duplicateProjectRecord(project);
      }
      return;
    }
    const selected = new Set(selectedProjectIds);
    const backendSaves: Array<{ schemeId: string; schemePath: string[]; project: SavedProjectRecord }> = [];
    let nextSchemes = schemes;
    for (const scheme of flattenSavedSchemes(schemes)) {
      const selectedProjects = scheme.projects.filter((project: SavedProjectRecord) => selected.has(project.id));
      if (selectedProjects.length === 0) {
        continue;
      }
      let nextProjects = scheme.projects;
      const schemePath = schemePathForRecord(scheme);
      for (const project of selectedProjects) {
        const clonedProject = cloneProjectRecord(project, "副本", nextProjects.map((item: SavedProjectRecord) => item.name));
        nextProjects = upsertSavedProject(nextProjects, clonedProject);
        backendSaves.push({ schemeId: scheme.id, schemePath, project: clonedProject });
      }
      nextSchemes = nextProjects.reduce((updatedSchemes: SavedSchemeRecord[], project: SavedProjectRecord) => upsertSavedProjectInScheme(updatedSchemes, scheme.id, project), nextSchemes);
    }
    setSchemes(nextSchemes);
    for (const item of backendSaves) {
      void saveBackendProjectRecord(item.schemePath, item.project)
        .then((saved: SavedProjectRecord) => setSchemes((current: SavedSchemeRecord[]) => upsertSavedProjectInScheme(current, item.schemeId, saved)))
        .catch((error: unknown) => handleBackendSchemeMutationFailure(`批量复制模型同步后台：${item.project.name}`, error));
    }
  };
}

export function createDuplicateSelectedSchemeRecords(__appScope: ProjectCanvasScope) {
  return () => {
  const { cloneSchemeRecord, duplicateSchemeRecord, findSavedSchemeById, findSavedSchemeParentById, insertChildSavedScheme, persistSchemeTreeToBackend, savedSchemePathForId, savedSchemeSiblingNames, schemes, selectedSchemeId, selectedSchemeIds, setSchemes } = __appScope;
    if (selectedSchemeIds.length <= 1) {
      const scheme = findSavedSchemeById(schemes, selectedSchemeIds[0] ?? selectedSchemeId);
      if (scheme) {
        duplicateSchemeRecord(scheme);
      }
      return;
    }
    const backendSaves: Array<{ scheme: SavedSchemeRecord; parentPath: string[] }> = [];
    let nextSchemes = schemes;
    for (const schemeId of selectedSchemeIds) {
      const scheme = findSavedSchemeById(nextSchemes, schemeId);
      if (!scheme) {
        continue;
      }
      const parentSchemeId = findSavedSchemeParentById(nextSchemes, scheme.id)?.id ?? "";
      const siblingNames = savedSchemeSiblingNames(nextSchemes, scheme.id);
      const clonedScheme = cloneSchemeRecord(scheme, siblingNames);
      const parentPath = parentSchemeId ? savedSchemePathForId(nextSchemes, parentSchemeId) ?? [] : [];
      nextSchemes = insertChildSavedScheme(nextSchemes, parentSchemeId, clonedScheme);
      backendSaves.push({ scheme: clonedScheme, parentPath });
    }
    setSchemes(nextSchemes);
    for (const item of backendSaves) {
      persistSchemeTreeToBackend(item.scheme, item.parentPath, `批量复制方案：${item.scheme.name}`);
    }
  };
}

export function createDeleteProjectRecord(__appScope: ProjectCanvasScope) {
  return async (project: SavedProjectRecord) => {
  const { clearActiveProjectDisplay, clearRecordSelection, deleteBackendProjectRecord, deleteSavedProjectsFromSchemes, handleBackendSchemeMutationFailure, loadSavedProjectRecord, nextSavedProjectAfterProjectDeletion, schemePathForProject, setSchemes } = __appScope;
    const latestScope = () => (__appScope.__appScopeRef?.current as ProjectCanvasScope | undefined) ?? __appScope;
    const initialDeletingActive = project.id === latestScope().activeProjectKey;
    const confirmationMessage = initialDeletingActive
      ? `当前加载模型“${project.name}”将被删除。删除后会自动切换到同方案的相邻模型；若没有相邻模型，将清空画布。是否继续？`
      : `删除模型“${project.name}”？`;
    if (!await showGlobalConfirm(confirmationMessage)) {
      return;
    }
    const latest = latestScope();
    const deletingActiveProject = project.id === latest.activeProjectKey;
    const fallbackSelection = deletingActiveProject
      ? nextSavedProjectAfterProjectDeletion(latest.schemes, project.id)
      : null;
    const ownerPath = schemePathForProject(project.id);
    setSchemes((current: SavedSchemeRecord[]) => deleteSavedProjectsFromSchemes(current, new Set([project.id])));
    if (ownerPath.length > 0) {
      void deleteBackendProjectRecord(ownerPath, project.name)
        .catch((error: unknown) => handleBackendSchemeMutationFailure(`删除后台模型：${project.name}`, error));
    }
    if (deletingActiveProject) {
      if (fallbackSelection) {
        void loadSavedProjectRecord(fallbackSelection.project, fallbackSelection.scheme.id);
      } else {
        showGlobalMessage("当前方案已无模型，画布已清空。");
        clearActiveProjectDisplay("删除当前模型后已清空画布");
      }
      return;
    }
    if (latest.selectedProjectId === project.id) {
      clearRecordSelection();
    }
  };
}

export function createCreateBlankProject(__appScope: ProjectCanvasScope) {
  return async (preferredSchemeId?: string, draft?: { name: string; modelType: string }) => {
  const { DEFAULT_CANVAS_BACKGROUND, DEFAULT_CANVAS_HEIGHT, DEFAULT_CANVAS_WIDTH, DEFAULT_CURRENT_UNIT, DEFAULT_POWER_BASE_VALUE, DEFAULT_POWER_UNIT, DEFAULT_VOLTAGE_UNIT, MODEL_TYPES, activeSchemeKey, createSavedProject, findSavedSchemeById, hasSameName, requestLoadSavedProject, saveBackendProjectRecord, schemePathForScheme, schemes, selectSingleProject, selectedSchemeId, setCreateModelDialog, setSchemes, upsertSavedProjectInScheme, writeOperationLog } = __appScope;
    if (preferredSchemeId === undefined) {
      preferredSchemeId = selectedSchemeId || activeSchemeKey || schemes[0]?.id || "";
    }
    const targetScheme = findSavedSchemeById(schemes, preferredSchemeId) ?? schemes[0];
    const targetSchemeId = targetScheme?.id ?? preferredSchemeId;
    if (!draft) {
      if (!targetScheme) {
        showGlobalMessage("无可用方案，请先创建方案。");
        return;
      }
      setCreateModelDialog({
        schemeId: targetSchemeId,
        name: "新建模型",
        modelType: "厂站",
        saving: false,
        error: ""
      });
      return;
    }
    const name = String(draft.name ?? "").trim();
    const modelType = String(draft.modelType ?? "").trim();
    if (!name) {
      setCreateModelDialog((current: { schemeId: string; name: string; modelType: string; saving: boolean; error: string } | null) => current ? { ...current, error: "模型名称不能为空。" } : current);
      return;
    }
    if (!MODEL_TYPES.includes(modelType)) {
      setCreateModelDialog((current: { schemeId: string; name: string; modelType: string; saving: boolean; error: string } | null) => current ? { ...current, error: "请选择有效的模型类型。" } : current);
      return;
    }
    if (targetScheme && hasSameName(name, targetScheme.projects.map((project: SavedProjectRecord) => project.name))) {
      setCreateModelDialog((current: { schemeId: string; name: string; modelType: string; saving: boolean; error: string } | null) => current ? { ...current, error: "模型名称重复，无法新建模型。" } : current);
      return;
    }
    const targetSchemePath = schemePathForScheme(targetSchemeId || schemes[0]?.id || "");
    if (!targetScheme || targetSchemePath.length === 0) {
      setCreateModelDialog((current: { schemeId: string; name: string; modelType: string; saving: boolean; error: string } | null) => current ? { ...current, error: "无法确定模型所属方案路径。" } : current);
      return;
    }
    const record = createSavedProject(name, {
      version: 1,
      name,
      modelType,
      canvasWidth: DEFAULT_CANVAS_WIDTH,
      canvasHeight: DEFAULT_CANVAS_HEIGHT,
      allowAutoExpandCanvas: true,
      canvasBackgroundColor: DEFAULT_CANVAS_BACKGROUND,
      powerUnit: DEFAULT_POWER_UNIT,
      voltageUnit: DEFAULT_VOLTAGE_UNIT,
      currentUnit: DEFAULT_CURRENT_UNIT,
      powerBaseValue: DEFAULT_POWER_BASE_VALUE,
      subcontrolarea: "默认区域",
      deviceIndexCounters: {},
      nodes: [],
      edges: []
    });
    setCreateModelDialog((current: { schemeId: string; name: string; modelType: string; saving: boolean; error: string } | null) => current ? { ...current, saving: true, error: "" } : current);
    try {
      const savedRecord = await saveBackendProjectRecord(targetSchemePath, record);
      setSchemes((current: SavedSchemeRecord[]) => upsertSavedProjectInScheme(current, targetSchemeId, savedRecord));
      selectSingleProject(targetSchemeId, savedRecord.id);
      requestLoadSavedProject(savedRecord, targetSchemeId);
      setCreateModelDialog(null);
      writeOperationLog(`新建${modelType}模型：${savedRecord.name}（idx=${savedRecord.project.idx}）`);
      return savedRecord;
    } catch (error) {
      const message = error instanceof Error ? error.message : "新建模型保存失败。";
      setCreateModelDialog((current: { schemeId: string; name: string; modelType: string; saving: boolean; error: string } | null) => current ? { ...current, saving: false, error: message } : current);
      return;
    }
  };
}

export function createLocateTopologyError(__appScope: ProjectCanvasScope) {
  return (error: TopologyValidationError) => {
    const { activateInspectorFromCanvas, activeLayerEdgeIdSet, activeLayerNodeIdSet, centerViewOnPoint, centerViewOnPointAtZoom, clearRecordSelection, currentZoomPercent, edges, getElementFocusPoint, nodeById, nodes, setCanvasSelectionScope, setInspectorTab, setSelectedEdgeId, setSelectedEdgeIds, setSelectedNodeIds } = __appScope;
    activateInspectorFromCanvas();
    const firstNodeId = error.nodeId ?? error.relatedNodeIds[0];
    const node = firstNodeId ? nodeById.get(firstNodeId) : undefined;
    const editableNode = Boolean(firstNodeId && activeLayerNodeIdSet.has(firstNodeId));
    const editableEdge = Boolean(error.edgeId && activeLayerEdgeIdSet.has(error.edgeId));
    setCanvasSelectionScope("group");
    setSelectedNodeIds(editableNode && firstNodeId ? [firstNodeId] : []);
    setSelectedEdgeId(editableEdge && error.edgeId ? error.edgeId : "");
    setSelectedEdgeIds(editableEdge && error.edgeId ? [error.edgeId] : []);
    const point = node
      ? getElementFocusPoint({ kind: "node", id: node.id }, nodes, edges)
      : error.edgeId
        ? getElementFocusPoint({ kind: "edge", id: error.edgeId }, nodes, edges)
        : null;
    if (point) {
      const focusZoomPercent = Math.max(Number(currentZoomPercent) || 0, 120);
      if (centerViewOnPointAtZoom) {
        centerViewOnPointAtZoom(point, focusZoomPercent);
      } else {
        centerViewOnPoint(point);
      }
    }
    if (node) {
      setInspectorTab("device");
      clearRecordSelection();
    }
  };
}

export function createRunTopologyCalculation(
  __appScope: ProjectCanvasScope,
  topologyOperation?: typeof runTopologyOperation
) {
  const calculate = topologyOperation ?? __appScope.topologyOperation ?? runTopologyOperation;
  return () => {
    const {
      activeProjectKey, activeSchemeKey, currentUnit, edges, locateTopologyError,
      modelType, nodes, powerUnit, pushUndoSnapshot, schemes,
      setNodes, setTopology, setTopologyErrors, setTopologyStatus, setTopologyWarningPanelClosed,
      skipNextTopologyStaleRef, topologyCalculationMessage, voltageUnit, writeOperationLog,
      EMPTY_TOPOLOGY
    } = __appScope;
    setTopologyWarningPanelClosed(false);
    const result = calculate({
      nodes,
      edges,
      modelType,
      powerUnit,
      voltageUnit,
      currentUnit
    }, {
      mode: "ui",
      capacityFixScopeKey: `${activeSchemeKey ?? ""}:${activeProjectKey ?? ""}`,
      modelAssociationProjectIndexes: modelAssociationProjectIndexesForSchemes(schemes ?? [])
    });
    const displayedErrors = [...result.errors, ...result.warnings];
    setTopologyErrors(displayedErrors);
    if (result.errors.length === 0) {
      pushUndoSnapshot(true, false, undefined, "拓扑计算");
      skipNextTopologyStaleRef.current = true;
      setNodes(result.nodes);
      setTopology(result.topology ?? EMPTY_TOPOLOGY);
      if (displayedErrors.length === 0) {
        setTopologyStatus({ state: "success", message: `成功，${result.topologyIslandCount ?? 0} 个拓扑岛` });
        writeOperationLog(`图上拓扑成功，${result.topologyIslandCount ?? 0} 个拓扑岛`);
        showGlobalMessage(topologyCalculationMessage(0));
      } else {
        setTopologyStatus({ state: "failed", message: `完成，${displayedErrors.length} 条告警` });
        writeOperationLog(`图上拓扑完成，${displayedErrors.length} 条告警`);
        locateTopologyError(displayedErrors[0]);
        showGlobalMessage(`图上拓扑完成：发现 ${displayedErrors.length} 条告警，已定位到第一条告警。`);
      }
      return result;
    }

    if (result.corrections.length > 0) {
      pushUndoSnapshot(true, false, undefined, "自动修正设备限值");
      skipNextTopologyStaleRef.current = true;
      setNodes(result.nodes);
    }
    setTopology(EMPTY_TOPOLOGY);
    setTopologyStatus({ state: "failed", message: `失败，${result.errors.length} 条阻断错误` });
    writeOperationLog(`图上拓扑失败，${result.errors.length} 条阻断错误`);
    locateTopologyError(result.errors[0]);
    showGlobalMessage(topologyCalculationMessage(result.errors.length));
    return result;
  };
}

export function createGetEdgeEndpointPoint(__appScope: ProjectCanvasScope) {
  return (edge: Edge, endpoint: EdgeEndpoint): Point | null => {
  const { getModelEdgeEndpointPoint, nodeById } = __appScope;
    const node = nodeById.get(endpoint === "source" ? edge.sourceId : edge.targetId);
    const terminalId = endpoint === "source" ? edge.sourceTerminalId : edge.targetTerminalId;
    const endpointPoint = endpoint === "source" ? edge.sourcePoint : edge.targetPoint;
    if (!node) {
      return endpointPoint ?? null;
    }
    return getModelEdgeEndpointPoint(node, endpointPoint, terminalId);
  };
}

export function createCenterViewOnPoint(__appScope: ProjectCanvasScope) {
  return (point: Point) => {
  const { canvasVisibleViewBoxRef, clampViewBoxToCanvas, setViewBoxAtViewportCenter, viewBox, viewBoxRef } = __appScope;
    const visible = canvasVisibleViewBoxRef.current;
    const current = viewBoxRef.current;
    setViewBoxAtViewportCenter(clampViewBoxToCanvas({
      x: point.x - (visible.width > 0 ? visible.width : viewBox.width) / 2,
      y: point.y - (visible.height > 0 ? visible.height : viewBox.height) / 2,
      width: current.width,
      height: current.height
    }), point);
  };
}

export function createViewportCenterAnchorForPoint(__appScope: ProjectCanvasScope) {
  return (point: Point): WheelZoomAnchor | null => {
  const { canvasBoundsRef, canvasFrameRef, clampPointToBounds } = __appScope;
    const frame = canvasFrameRef.current;
    if (!frame) {
      return null;
    }
    const frameRect = frame.getBoundingClientRect();
    if (frameRect.width <= 0 || frameRect.height <= 0) {
      return null;
    }
    return {
      point: clampPointToBounds(point, canvasBoundsRef.current),
      cursorOffsetX: frameRect.width / 2,
      cursorOffsetY: frameRect.height / 2
    };
  };
}

export function createSetViewBoxAtViewportCenter(__appScope: ProjectCanvasScope) {
  return (nextViewBox: CanvasViewBox, point: Point) => {
  const { pendingWheelZoomAnchorRef, sameCanvasViewBox, scheduleCanvasVisibleViewBoxUpdate, setViewBox, syncCanvasFrameScrollToWheelAnchor, viewBoxRef, viewportCenterAnchorForPoint } = __appScope;
    const anchor = viewportCenterAnchorForPoint(point);
    if (!anchor) {
      setViewBox(nextViewBox);
      return;
    }
    if (sameCanvasViewBox(viewBoxRef.current, nextViewBox)) {
      syncCanvasFrameScrollToWheelAnchor(anchor);
      scheduleCanvasVisibleViewBoxUpdate();
      return;
    }
    pendingWheelZoomAnchorRef.current = anchor;
    setViewBox(nextViewBox);
  };
}

export function createCenterViewBoxOnPoint(__appScope: ProjectCanvasScope) {
  return (point: Point) => {
  const { canvasVisibleViewBoxRef, clampViewBoxToCanvas, setViewBoxAtViewportCenter, viewBoxRef } = __appScope;
    const current = viewBoxRef.current;
    const visible = canvasVisibleViewBoxRef.current;
    setViewBoxAtViewportCenter(clampViewBoxToCanvas({
      x: point.x - (visible.width > 0 ? visible.width : current.width) / 2,
      y: point.y - (visible.height > 0 ? visible.height : current.height) / 2,
      width: current.width,
      height: current.height
    }), point);
  };
}

export function createCenterViewOnPointAtZoom(__appScope: ProjectCanvasScope) {
  return (point: Point, zoomPercent = 100) => {
  const { canvasBoundsRef, clampViewBoxDimensionsForZoom, height, normalizeViewBoxToCanvas, setViewBoxAtViewportCenter, width } = __appScope;
    const bounds = canvasBoundsRef.current;
    const { width: nextWidth, height: nextHeight } = clampViewBoxDimensionsForZoom(
      { width: bounds.width, height: bounds.height },
      bounds,
      zoomPercent,
      zoomPercent
    );
    setViewBoxAtViewportCenter(normalizeViewBoxToCanvas({
      x: point.x - nextWidth / 2,
      y: point.y - nextHeight / 2,
      width: nextWidth,
      height: nextHeight
    }, bounds), point);
  };
}

export function createZoomViewportAtCenter(__appScope: ProjectCanvasScope) {
  return (zoomFactor: number) => {
  const { canvasBoundsRef, canvasFrameRef, clampViewBoxDimensionsForZoom, height, normalizeViewBoxToCanvas, pendingWheelZoomAnchorRef, setViewBox, wheelZoomAnchorFromClient, width } = __appScope;
    const frame = canvasFrameRef.current;
    if (!frame) {
      setViewBox((current: CanvasViewBox) => {
        const bounds = canvasBoundsRef.current;
        const { width: nextWidth, height: nextHeight } = clampViewBoxDimensionsForZoom(
          { width: current.width * zoomFactor, height: current.height * zoomFactor },
          bounds
        );
        const center = {
          x: current.x + current.width / 2,
          y: current.y + current.height / 2
        };
        return normalizeViewBoxToCanvas({
          x: center.x - nextWidth / 2,
          y: center.y - nextHeight / 2,
          width: nextWidth,
          height: nextHeight
        }, bounds);
      });
      return;
    }
    const frameRect = frame.getBoundingClientRect();
    const anchor = wheelZoomAnchorFromClient(
      frameRect.left + frameRect.width / 2,
      frameRect.top + frameRect.height / 2
    );
    if (!anchor) {
      return;
    }
    pendingWheelZoomAnchorRef.current = anchor;
    setViewBox((current: CanvasViewBox) => {
      const bounds = canvasBoundsRef.current;
      const { width: nextWidth, height: nextHeight } = clampViewBoxDimensionsForZoom(
        { width: current.width * zoomFactor, height: current.height * zoomFactor },
        bounds
      );
      const nextScaleX = bounds.width / Math.max(1, nextWidth);
      const nextScaleY = bounds.height / Math.max(1, nextHeight);
      return normalizeViewBoxToCanvas({
        x: anchor.point.x - anchor.cursorOffsetX / nextScaleX,
        y: anchor.point.y - anchor.cursorOffsetY / nextScaleY,
        width: nextWidth,
        height: nextHeight
      }, bounds);
    });
  };
}

export function createResetViewportZoom(__appScope: ProjectCanvasScope) {
  return () => {
  const { canvasBoundsRef, canvasFrameRef, clampViewBoxDimensionsForZoom, height, normalizeViewBoxToCanvas, pendingWheelZoomAnchorRef, setViewBox, wheelZoomAnchorFromClient, width } = __appScope;
    const frame = canvasFrameRef.current;
    if (!frame) {
      setViewBox((current: CanvasViewBox) => {
        const bounds = canvasBoundsRef.current;
        const { width: nextWidth, height: nextHeight } = clampViewBoxDimensionsForZoom(
          { width: bounds.width, height: bounds.height },
          bounds,
          100,
          100
        );
        const center = {
          x: current.x + current.width / 2,
          y: current.y + current.height / 2
        };
        return normalizeViewBoxToCanvas({
          x: center.x - nextWidth / 2,
          y: center.y - nextHeight / 2,
          width: nextWidth,
          height: nextHeight
        }, bounds);
      });
      return;
    }
    const frameRect = frame.getBoundingClientRect();
    const anchor = wheelZoomAnchorFromClient(
      frameRect.left + frameRect.width / 2,
      frameRect.top + frameRect.height / 2
    );
    if (!anchor) {
      return;
    }
    pendingWheelZoomAnchorRef.current = anchor;
    setViewBox(() => {
      const bounds = canvasBoundsRef.current;
      const { width: nextWidth, height: nextHeight } = clampViewBoxDimensionsForZoom(
        { width: bounds.width, height: bounds.height },
        bounds,
        100,
        100
      );
      const nextScaleX = bounds.width / Math.max(1, nextWidth);
      const nextScaleY = bounds.height / Math.max(1, nextHeight);
      return normalizeViewBoxToCanvas({
        x: anchor.point.x - anchor.cursorOffsetX / nextScaleX,
        y: anchor.point.y - anchor.cursorOffsetY / nextScaleY,
        width: nextWidth,
        height: nextHeight
      }, bounds);
    });
  };
}

export function createFitWholeCanvasToFrame(__appScope: ProjectCanvasScope) {
  return () => {
  const { canvasBounds, canvasFrameRef, canvasFullViewBox, centerCanvasFrameScrollPosition, fitWholeCanvasViewBox, scheduleCanvasVisibleViewBoxUpdate, setCanvasNoScrollOffset, setCanvasVisibleViewBox, setViewBox, skipNextCanvasScrollSyncRef } = __appScope;
    // 可用区 = 画布区去掉两侧可见面板的让位（面板宽 + 20px）；左右面板宽度通常不同，
    // 画布要居中于可用区而非画布区正中，否则宽的一侧仍会压住画布
    const insets = canvasFitSideInsetsFromDom();
    const nextViewBox = fitWholeCanvasViewBox(canvasBounds, canvasFrameRef.current, insets);
    skipNextCanvasScrollSyncRef.current = true;
    setViewBox(nextViewBox);
    setCanvasNoScrollOffset({ x: canvasFitCenterOffsetX(insets), y: 0 });
    setCanvasVisibleViewBox(canvasFullViewBox);
    window.requestAnimationFrame(() => {
      const frame = canvasFrameRef.current;
      if (!frame) {
        return;
      }
      centerCanvasFrameScrollPosition(frame);
      scheduleCanvasVisibleViewBoxUpdate();
    });
  };
}

export function createFitWholeCanvasFromBlankDoubleClick(__appScope: ProjectCanvasScope) {
  return (event: ReactMouseEvent<SVGSVGElement>) => {
  const { clampPointToCanvas, connectSource, findConnectionRouteHitAtPoint, fitWholeCanvasToFrame, routableLinePlacement, screenToSvgPoint, setMarquee, staticDrawing, svgRef } = __appScope;
    if (event.button !== 0 || staticDrawing || connectSource || routableLinePlacement) {
      return;
    }
    const target = event.target as Element | null;
    if (target?.closest(".diagram-node, .connection-group, .edge-endpoint-handle, .manual-segment-handle, .transform-handles, .group-selection-overlay, .canvas-resize-handles")) {
      return;
    }
    if (svgRef.current) {
      const pointer = clampPointToCanvas(screenToSvgPoint(svgRef.current, event.clientX, event.clientY));
      if (findConnectionRouteHitAtPoint(pointer)) {
        return;
      }
    }
    event.preventDefault();
    event.stopPropagation();
    setMarquee(null);
    fitWholeCanvasToFrame();
  };
}

export function createFitViewToBounds(__appScope: ProjectCanvasScope) {
  return (bounds: GeometryBounds | SelectionRect | null, padding = 96, maxZoomPercent = 2000) => {
  const { canvasBounds, canvasFrameRef, clampViewBoxDimensionsForZoom, clampViewBoxToCanvas, resetViewportZoom, setViewBoxAtViewportCenter, viewBox } = __appScope;
    if (!bounds) {
      resetViewportZoom();
      return;
    }
    const targetWidth = Math.max(80, bounds.right - bounds.left + padding * 2);
    const targetHeight = Math.max(80, bounds.bottom - bounds.top + padding * 2);
    const viewportAspect = canvasFrameRef.current?.clientWidth && canvasFrameRef.current.clientHeight
      ? canvasFrameRef.current.clientWidth / canvasFrameRef.current.clientHeight
      : viewBox.width > 0 && viewBox.height > 0
        ? viewBox.width / viewBox.height
      : canvasBounds.width / Math.max(1, canvasBounds.height);
    const fitSize = targetWidth / targetHeight > viewportAspect
      ? { width: targetWidth, height: targetWidth / viewportAspect }
      : { width: targetHeight * viewportAspect, height: targetHeight };
    const size = clampViewBoxDimensionsForZoom(fitSize, canvasBounds, 5, maxZoomPercent);
    const center = {
      x: (bounds.left + bounds.right) / 2,
      y: (bounds.top + bounds.bottom) / 2
    };
    setViewBoxAtViewportCenter(clampViewBoxToCanvas({
      x: center.x - size.width / 2,
      y: center.y - size.height / 2,
      width: size.width,
      height: size.height
    }), center);
  };
}

export function createFitViewToContent(__appScope: ProjectCanvasScope) {
  return () => {
  const { calculateModelGeometryBounds, fitViewToBounds, routedEdges, visibleNodes } = __appScope;
    fitViewToBounds(calculateModelGeometryBounds(visibleNodes, routedEdges, 0), 120);
  };
}

export function createFocusElementTreeItem(__appScope: ProjectCanvasScope) {
  return (item: ElementTreeItem, openDeviceTab = false) => {
  const { activeLayerEdgeIdSet, activeLayerNodeIdSet, centerViewOnPoint, clearRecordSelection, edges, getElementFocusPoint, nodes, resetConnectPreviewState, selectCanvasGraphics, setConnectSource, setContextMenu, setInspectorTab, setRewiring } = __appScope;
    if (item.kind === "node") {
      selectCanvasGraphics(activeLayerNodeIdSet.has(item.id) ? [item.id] : [], []);
    } else {
      const editableEdge = activeLayerEdgeIdSet.has(item.id);
      selectCanvasGraphics([], editableEdge ? [item.id] : []);
    }
    setConnectSource(null);
    resetConnectPreviewState();
    setRewiring(null);
    setContextMenu(null);
    clearRecordSelection();
    if (openDeviceTab && (item.kind === "node" ? activeLayerNodeIdSet.has(item.id) : activeLayerEdgeIdSet.has(item.id))) {
      setInspectorTab("device");
    }
    const point = getElementFocusPoint(item, nodes, edges);
    if (point) {
      centerViewOnPoint(point);
    }
  };
}

export function createJumpToElementTreeItem(__appScope: ProjectCanvasScope) {
  return (item: ElementTreeItem) => {
  const { centerViewOnPointAtZoom, edges, getElementFocusPoint, nodes } = __appScope;
    const point = getElementFocusPoint(item, nodes, edges);
    if (point) {
      centerViewOnPointAtZoom(point, 100);
    }
  };
}

export function createOpenElementTreeItemContextMenu(__appScope: ProjectCanvasScope) {
  return (event: ReactMouseEvent<HTMLDivElement>, item: ElementTreeItem) => {
  const { activeLayerEdgeIdSet, activeLayerNodeIdSet, canvasInteractionRef, clearRecordSelection, isEditMode, projectListPointerInsideRef, resetConnectPreviewState, resetRoutableLinePreviewState, selectCanvasGraphics, setConnectSource, setContextMenu, setMode, setProjectMenu, setRewiring, setRoutableLinePlacement } = __appScope;
    event.preventDefault();
    event.stopPropagation();
    const editable = item.kind === "node" ? activeLayerNodeIdSet.has(item.id) : activeLayerEdgeIdSet.has(item.id);
    if (!isEditMode || !editable) {
      return;
    }
    canvasInteractionRef.current = true;
    projectListPointerInsideRef.current = false;
    if (item.kind === "node") {
      selectCanvasGraphics([item.id], []);
    } else {
      selectCanvasGraphics([], [item.id]);
    }
    clearRecordSelection();
    setConnectSource(null);
    resetConnectPreviewState();
    setRewiring(null);
    setRoutableLinePlacement(null);
    resetRoutableLinePreviewState();
    setMode("select");
    setProjectMenu(null);
    const nextContextMenu: NonNullable<ContextMenuState> = {
      x: event.clientX,
      y: event.clientY,
      target: item.kind,
      source: "element-tree"
    };
    if (item.kind === "node") {
      nextContextMenu.nodeId = item.id;
    } else {
      nextContextMenu.edgeId = item.id;
    }
    setContextMenu(nextContextMenu);
  };
}

export function createSetEdgeManualPoints(__appScope: ProjectCanvasScope) {
  return (edgeId: string, manualPoints: Point[], routePoints?: Point[]) => {
  const { edgeById, markRouteEdgesDirty, markStoredRouteEdgesDirty, patchGraphEdges, sameOptionalPointList } = __appScope;
    const normalizedManualPoints = manualPoints.map((point) => ({ x: Math.round(point.x), y: Math.round(point.y) }));
    const normalizedRoutePoints = routePoints?.map((point) => ({ x: Math.round(point.x), y: Math.round(point.y) }));
    const edge = edgeById.get(edgeId);
    if (
      !edge ||
      (
        sameOptionalPointList(edge.manualPoints, normalizedManualPoints) &&
        (!normalizedRoutePoints || sameOptionalPointList(edge.routePoints, normalizedRoutePoints))
      )
    ) {
      return;
    }
    markRouteEdgesDirty([edgeId]);
    markStoredRouteEdgesDirty([edgeId]);
    const nextEdge = { ...edge, manualPoints: normalizedManualPoints };
    if (normalizedRoutePoints) {
      nextEdge.routePoints = normalizedRoutePoints;
    } else {
      delete nextEdge.routePoints;
    }
    patchGraphEdges([nextEdge]);
  };
}

export function createRouteManualPoints(__appScope: ProjectCanvasScope) {
  return (routePoints: Point[]) => {
    const manualPoints = routePoints.length > 4 ? routePoints.slice(2, -2) : routePoints.slice(1, -1);
    return manualPoints.map((point) => ({ ...point }));
  };
}

export function createFinishManualPathDrag(__appScope: ProjectCanvasScope) {
  return () => {
  const { canvasBounds, isRoutableLineDeviceKind, manualPathDrag, nodeById, patchGraphNodes, routeManualPoints, setEdgeManualPoints, setManualPathDrag, setRoutableLineDeviceCanvasPoints, writeOperationLog } = __appScope;
    if (!manualPathDrag) {
      return;
    }
    if (manualPathDrag.historyCaptured && manualPathDrag.previewRoutePoints?.length) {
      if (manualPathDrag.nodeId) {
        const lineNode = nodeById.get(manualPathDrag.nodeId);
        if (lineNode && isRoutableLineDeviceKind(lineNode.kind)) {
          // 松手提交：预览期间不纠正（拖拽发涩），这里一次性套端点走向强制。
          const nextNode = setRoutableLineDeviceCanvasPoints(lineNode, manualPathDrag.previewRoutePoints, {
            nodeById,
            bounds: canvasBounds
          });
          if (nextNode !== lineNode) {
            patchGraphNodes([nextNode]);
            writeOperationLog(`调整可变线路路径：${nextNode.name}`);
          }
        }
      } else if (manualPathDrag.edgeId) {
        setEdgeManualPoints(manualPathDrag.edgeId, routeManualPoints(manualPathDrag.previewRoutePoints), manualPathDrag.previewRoutePoints);
      }
    }
    setManualPathDrag(null);
  };
}

export function createTidySelectedEdgeRoute(__appScope: ProjectCanvasScope) {
  return () => {
  const { canvasBounds, edges, markRouteEdgesDirty, markStoredRouteEdgesDirty, nodes, patchGraphEdges, pushUndoSnapshot, redrawConnectionRoutesForEdges, selectedEdge, undoScopeForGraphPatch, writeOperationLog } = __appScope;
    if (!selectedEdge) {
      return;
    }
    const nextEdges = redrawConnectionRoutesForEdges(nodes, edges, [selectedEdge.id], canvasBounds);
    const changedEdge = nextEdges.find((edge: Edge, index: number) => edge.id === selectedEdge.id && edge !== edges[index]);
    if (!changedEdge) {
      return;
    }
    pushUndoSnapshot(true, false, undoScopeForGraphPatch([], [changedEdge.id]));
    markRouteEdgesDirty([changedEdge.id]);
    markStoredRouteEdgesDirty([changedEdge.id]);
    patchGraphEdges([changedEdge]);
    writeOperationLog(`整理连接线：${changedEdge.id}`);
  };
}

export function createTidyRoutableLineRoute(__appScope: ProjectCanvasScope) {
  return (nodeId?: string) => {
  const { activeLayerNodeIdSet, canvasBounds, isRoutableLineDeviceKind, nodeById, nodes, patchGraphNodes, pushUndoSnapshot, redrawRoutableLineDeviceRoutes, undoScopeForGraphPatch, writeOperationLog } = __appScope;
    if (!nodeId) {
      return;
    }
    const lineNode = nodeById.get(nodeId);
    if (!lineNode || !activeLayerNodeIdSet.has(nodeId) || !isRoutableLineDeviceKind(lineNode.kind)) {
      return;
    }
    const changedLineNodes = redrawRoutableLineDeviceRoutes(nodes, [nodeId], canvasBounds);
    if (changedLineNodes.length === 0) {
      return;
    }
    pushUndoSnapshot(true, false, undoScopeForGraphPatch(changedLineNodes.map((node: ModelNode) => node.id), []));
    patchGraphNodes(changedLineNodes);
    writeOperationLog(`整理连接线：${lineNode.name}`);
  };
}
