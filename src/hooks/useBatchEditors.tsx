import type { ReactNode } from "react";
import type { DeviceParameterDefinition, DeviceParameterEnumOption, ModelLayer, ModelNode, SavedSchemeRecord, DeviceTemplate, DeviceStateDefinition } from "../model";
import type { ProjectMeasurementConfig } from "../measurements";
import type { BatchCommonParamRow, BatchCommonMeasurementGroupRow, BatchCommonMeasurementGroupKey, BatchCommonParamPatch } from "../App";

import { DeferredColorInput, BufferedTextInput } from "../components/InputComponents";
import { StaticButtonLayerMultiSelect } from "../components/StaticButtonComponents";

import {
  inferESection,
  isStaticButtonCapableNode,
  flattenSavedSchemes,
  DEFAULT_MODEL_LAYER_ID,
  formatPowerBaseDisplayValue,
  getTemplateStateDefinitions,
  enumSelectOptionsWithCurrentValue,
  invalidEnumOptionLabel,
  modelAssociationModelIdLocked,
  modelAssociationModelIdLockMessage,
  modelAssociationModelTypeForKind,
  normalizeRatioParameterInputValue,
  switchingDeviceUsesClosedStatus,
} from "../model";

import { normalizeNodeLabelDisplayMode } from "../nodeLabelUtils";

import {
  PARAM_LABELS,
  PARAM_OPTIONS,
  PARAM_OPTION_LABELS,
  STATIC_BUTTON_ACTION_LABELS,
  STATIC_BUTTON_COMMAND_LABELS,
  parseStaticButtonTargetLayerValues,
  serializeStaticButtonTargetLayerIds,
  resolveStaticButtonTargetLayers,
  isColorParamKey,
  paramOptionsForSection,
  definitionRowIsEnum,
  enumValuesForRow,
  normalizeEnumOptionsForRow,
  enumValueTypeForDefinitionRow,
  enumDisplayText,
} from "../App";

export interface UseBatchEditorsParams {
  isBrowseMode: boolean;
  activeSelectedNodeIds: string[];
  nodeById: Map<string, ModelNode>;
  selectedNode: ModelNode | undefined;
  inspectorSelectedNode: ModelNode | undefined;
  selectedNodeIdsWithMeasurementGroups: Set<string>;
  batchCommonGraphicParamRows: BatchCommonParamRow[];
  batchCommonModelParamRows: BatchCommonParamRow[];
  batchCommonMeasurementGroupRows: BatchCommonMeasurementGroupRow[];
  batchCommonPropertyRowCount: number;
  layers: ModelLayer[];
  schemes: SavedSchemeRecord[];
  projectMeasurements: ProjectMeasurementConfig;
  nodeDoubleClickDraft: { nodeId: string; node: ModelNode } | null;
  setNodeDoubleClickDraft: (draft: { nodeId: string; node: ModelNode } | null | ((current: { nodeId: string; node: ModelNode } | null) => { nodeId: string; node: ModelNode } | null)) => void;
  updateParam: (key: string, value: string) => void;
  applyBatchCommonParam: (key: string, value: string) => void;
  applyBatchCommonParamPatch: (operationLabel: string, patchForNode: (node: ModelNode) => BatchCommonParamPatch) => void;
  applyBatchCommonMeasurementGroupSetting: (key: BatchCommonMeasurementGroupKey, value: string) => void;
  assignSelectedNodesToModelLayer: (layerId: string) => void;
  updateSelectedNode: (patch: Partial<ModelNode>) => void;
  requireEditMode: (action: string) => boolean;
  libraryTemplateByKind: Map<string, DeviceTemplate>;
}

export interface BatchEditorsResult {
  renderColorEditor: (key: string, value: string, fallback?: string) => ReactNode;
  renderParamEditor: (key: string, value: string, wrapLabel?: boolean, definition?: DeviceParameterDefinition) => ReactNode;
  updateNodeDoubleClickDraftNode: (nodeId: string, updater: (node: ModelNode) => ModelNode) => void;
  updateNodeDoubleClickDraftPatch: (nodeId: string, patch: Partial<ModelNode>) => void;
  updateNodeDoubleClickDraftParam: (nodeId: string, key: string, value: string) => void;
  renderNodeDoubleClickColorEditor: (node: ModelNode, key: string, value: string, fallback?: string) => ReactNode;
  renderNodeDoubleClickParamEditor: (node: ModelNode, key: string, value: string, wrapLabel?: boolean, definition?: DeviceParameterDefinition) => ReactNode;
  renderBatchCommonPropertyPanel: () => ReactNode;
  renderStaticButtonActionEditor: (
    node: ModelNode,
    editorActions?: {
      updateParam: (key: string, value: string) => void;
      updateNode: (patch: Partial<ModelNode>) => void;
    }
  ) => ReactNode;
  renderParamHeader: (key: string, displayName?: string, title?: string) => ReactNode;
  renderChineseParamHeader: (key: string, fallback?: string) => ReactNode;
  definitionMakesValueReadonly: (definition: DeviceParameterDefinition | undefined) => boolean;
}

export function useBatchEditors(params: UseBatchEditorsParams): BatchEditorsResult {
  const {
    isBrowseMode,
    activeSelectedNodeIds,
    nodeById,
    selectedNode,
    inspectorSelectedNode,
    selectedNodeIdsWithMeasurementGroups,
    batchCommonGraphicParamRows,
    batchCommonModelParamRows,
    batchCommonMeasurementGroupRows,
    batchCommonPropertyRowCount,
    layers,
    schemes,
    setNodeDoubleClickDraft,
    updateParam,
    applyBatchCommonParam,
    applyBatchCommonParamPatch,
    applyBatchCommonMeasurementGroupSetting,
    assignSelectedNodesToModelLayer,
    updateSelectedNode,
    libraryTemplateByKind,
  } = params;

  const batchParamOptionNode = (() => {
    const selectedNodes = activeSelectedNodeIds.flatMap((nodeId) => nodeById.get(nodeId) ?? []);
    const firstNode = selectedNodes[0];
    if (!firstNode) {
      return undefined;
    }
    const section = inferESection(firstNode.kind, firstNode.params);
    return selectedNodes.every((node) => inferESection(node.kind, node.params) === section)
      ? firstNode
      : undefined;
  })();

  const statusStatesForNode = (node: ModelNode | undefined): DeviceStateDefinition[] => {
    if (!node) {
      return [];
    }
    const template = libraryTemplateByKind.get(node.kind);
    return template ? getTemplateStateDefinitions(template) : [];
  };

  const statusOptionsForNode = (node: ModelNode | undefined): string[] =>
    statusStatesForNode(node).map((state) => state.value);

  const statusOptionLabelsForNode = (node: ModelNode | undefined): Record<string, string> =>
    Object.fromEntries(statusStatesForNode(node).map((state) => [state.value, state.name || state.value]));

  const visualStateParamKeyForNode = (node: ModelNode | undefined): "status" | "closed_status" => {
    if (!node) {
      return "status";
    }
    const template = libraryTemplateByKind.get(node.kind);
    return switchingDeviceUsesClosedStatus(template?.kind ?? node.kind, template?.params ?? node.params)
      ? "closed_status"
      : "status";
  };

  const renderColorEditor = (key: string, value: string, fallback = "#ffffff"): ReactNode => {
    return (
      <div className="color-field with-none">
        <DeferredColorInput value={value} fallback={fallback} disabled={isBrowseMode} onCommit={(nextValue: string) => updateParam(key, nextValue)} />
        <BufferedTextInput
          value={value === "transparent" ? "无颜色" : value || ""}
          disabled={isBrowseMode}
          onCommit={(nextValue: string) => updateParam(key, nextValue === "无颜色" ? "transparent" : nextValue)}
        />
        <button type="button" disabled={isBrowseMode} onClick={() => updateParam(key, "transparent")}>无颜色</button>
      </div>
    );
  };

  const selectOptionConfig = (options: string[] | undefined, value: string) =>
    enumSelectOptionsWithCurrentValue(options, value);

  const withCurrentOption = (options: string[] | undefined, value: string): string[] | undefined =>
    options;

  const modelAssociationProjectOptionConfig = (key: string, node: ModelNode | undefined): {
    options: string[];
    optionLabels: Record<string, string>;
  } | undefined => {
    const isParentModelOption = key === "parent";
    const targetModelType = key === "model_id" && node ? modelAssociationModelTypeForKind(node.kind) : "";
    if (!isParentModelOption && !targetModelType) {
      return undefined;
    }
    const optionByValue = new Map<string, string>();
    if (isParentModelOption && String(node?.params?._globalLineId ?? "").trim()) {
      optionByValue.set("0", "0 / 全局线路");
    }
    const visitSchemes = (items: readonly SavedSchemeRecord[], parentPath: readonly string[]) => {
      items.forEach((scheme) => {
        const schemePath = [...parentPath, scheme.name];
        scheme.projects.forEach((project) => {
          if (targetModelType && project.project.modelType !== targetModelType) {
            return;
          }
          const numericIndex = Number(project.project.idx);
          if (!Number.isInteger(numericIndex) || numericIndex <= 0) {
            return;
          }
          const value = String(numericIndex);
          const projectDisplayName = [...schemePath, project.name].join(" / ");
          optionByValue.set(value, `${value} / ${projectDisplayName}`);
        });
        visitSchemes(scheme.children ?? [], schemePath);
      });
    };
    visitSchemes(schemes, []);
    const options = Array.from(optionByValue.keys()).sort((left, right) => Number(left) - Number(right));
    return {
      options,
      optionLabels: Object.fromEntries(options.map((option) => [option, optionByValue.get(option) ?? option]))
    };
  };

  const paramOptionsForNode = (key: string, node: ModelNode | undefined, value: string): string[] | undefined => {
    if (key === visualStateParamKeyForNode(node)) {
      const options = statusOptionsForNode(node);
      return withCurrentOption(options.length > 0 ? options : undefined, value);
    }
    return paramOptionsForSection(key, node ? inferESection(node.kind, node.params) : undefined);
  };

  const paramOptionLabelsForNode = (key: string, node: ModelNode | undefined, value: string): Record<string, string> => {
    if (key === visualStateParamKeyForNode(node)) {
      const labels = statusOptionLabelsForNode(node);
      return value && !labels[value] ? { ...labels, [value]: value } : labels;
    }
    return PARAM_OPTION_LABELS[key] ?? {};
  };

  const enumOptionsForDefinition = (definition: DeviceParameterDefinition | undefined, value: string): string[] | undefined => {
    if (!definition || !definitionRowIsEnum(definition)) {
      return undefined;
    }
    const enumValues = enumValuesForRow(definition);
    return withCurrentOption(enumValues.length > 0 ? enumValues : undefined, value);
  };

  const enumOptionLabelsForDefinition = (definition: DeviceParameterDefinition | undefined, value: string): Record<string, string> | undefined => {
    if (!definition || !definitionRowIsEnum(definition)) {
      return undefined;
    }
    const enumOptions = normalizeEnumOptionsForRow(definition);
    const enumValueType = enumValueTypeForDefinitionRow(definition, enumOptions);
    const labels = Object.fromEntries(enumOptions.map((option: DeviceParameterEnumOption) => [option.value, enumDisplayText(option, enumValueType)]));
    return value && !labels[value] ? { ...labels, [value]: value } : labels;
  };

  const paramOptionsForDefinition = (
    key: string,
    node: ModelNode | undefined,
    value: string,
    definition?: DeviceParameterDefinition
  ): string[] | undefined => {
    const modelAssociationOptions = modelAssociationProjectOptionConfig(key, node);
    if (modelAssociationOptions) {
      return modelAssociationOptions.options;
    }
    const definitionOptions = key === visualStateParamKeyForNode(node) ? undefined : enumOptionsForDefinition(definition, value);
    return definitionOptions ?? paramOptionsForNode(key, node, value);
  };

  const paramOptionLabelsForDefinition = (
    key: string,
    node: ModelNode | undefined,
    value: string,
    definition?: DeviceParameterDefinition
  ): Record<string, string> => {
    const modelAssociationOptions = modelAssociationProjectOptionConfig(key, node);
    if (modelAssociationOptions) {
      return modelAssociationOptions.optionLabels;
    }
    const definitionOptions = key === visualStateParamKeyForNode(node) ? undefined : enumOptionsForDefinition(definition, value);
    return definitionOptions ? enumOptionLabelsForDefinition(definition, value) ?? {} : paramOptionLabelsForNode(key, node, value);
  };

  const definitionMakesValueReadonly = (definition: DeviceParameterDefinition | undefined): boolean =>
    Boolean(definition?.readonly && !definitionRowIsEnum(definition));

  const lockedModelAssociationNode = (node: ModelNode | undefined): ModelNode | undefined => {
    if (!node) {
      return undefined;
    }
    const currentNode = nodeById.get(node.id) ?? node;
    return modelAssociationModelIdLocked(currentNode, nodeById.values()) ? currentNode : undefined;
  };

  const unionOptionRows = (optionRows: Array<readonly string[] | undefined>): string[] | undefined => {
    const seen = new Set<string>();
    const options: string[] = [];
    optionRows.forEach((row) => row?.forEach((option) => {
      if (!seen.has(option)) {
        seen.add(option);
        options.push(option);
      }
    }));
    return options.length > 0 ? options : undefined;
  };

  const batchStatusOptions = (key: string, value: string): string[] | undefined => {
    const selectedNodes = activeSelectedNodeIds.flatMap((nodeId) => nodeById.get(nodeId) ?? [])
      .filter((node) => Object.prototype.hasOwnProperty.call(node.params, key));
    return withCurrentOption(
      unionOptionRows(
        selectedNodes.map((node) => statusStatesForNode(node).map((state) => state.value))
      ),
      value
    );
  };

  const batchStatusOptionLabels = (key: string): Record<string, string> => {
    const selectedNodes = activeSelectedNodeIds.flatMap((nodeId) => nodeById.get(nodeId) ?? [])
      .filter((node) => Object.prototype.hasOwnProperty.call(node.params, key));
    const labels: Record<string, string> = {};
    selectedNodes.forEach((node) => {
      Object.entries(statusOptionLabelsForNode(node)).forEach(([value, label]) => {
        labels[value] ??= label;
      });
    });
    return labels;
  };

  const batchParamOptionConfig = (row: BatchCommonParamRow, value: string): {
    options: string[] | undefined;
    optionLabels: Record<string, string>;
  } => {
    const selectedNodes = activeSelectedNodeIds.flatMap((nodeId) => nodeById.get(nodeId) ?? []);
    const selectedNodesWithParam = selectedNodes.filter((node) => Object.prototype.hasOwnProperty.call(node.params, row.key));
    const rowControlsVisualState = selectedNodesWithParam.length > 0 &&
      selectedNodesWithParam.every((node) => visualStateParamKeyForNode(node) === row.key);
    if (rowControlsVisualState) {
      return {
        options: batchStatusOptions(row.key, value),
        optionLabels: batchStatusOptionLabels(row.key)
      };
    }

    if (row.key === "model_id" || row.key === "parent") {
      const configs = selectedNodes.flatMap((node) => modelAssociationProjectOptionConfig(row.key, node) ?? []);
      if (configs.length > 0) {
        return {
          options: unionOptionRows(configs.map((config) => config.options)) ?? [],
          optionLabels: Object.assign({}, ...configs.map((config) => config.optionLabels))
        };
      }
    }

    const specificOptionRows: string[][] = [];
    const specificOptionLabels: Record<string, string> = {};
    selectedNodes.forEach((node, index) => {
      const sectionOptions = paramOptionsForSection(row.key, inferESection(node.kind, node.params));
      // The shared resolver returns the PARAM_OPTIONS entry itself only when it uses the global fallback.
      if (sectionOptions && sectionOptions !== PARAM_OPTIONS[row.key]) {
        specificOptionRows.push(sectionOptions);
        Object.entries(PARAM_OPTION_LABELS[row.key] ?? {}).forEach(([option, label]) => {
          specificOptionLabels[option] ??= label;
        });
        return;
      }

      const definition = row.definitions?.[index];
      const definitionOptions = enumOptionsForDefinition(definition, "");
      if (!definitionOptions) {
        return;
      }
      specificOptionRows.push(definitionOptions);
      Object.entries(enumOptionLabelsForDefinition(definition, "") ?? {}).forEach(([option, label]) => {
        specificOptionLabels[option] ??= label;
      });
    });

    const specificOptions = unionOptionRows(specificOptionRows);
    if (specificOptions) {
      const options = withCurrentOption(specificOptions, value);
      if (value && !specificOptionLabels[value]) {
        specificOptionLabels[value] = value;
      }
      return { options, optionLabels: specificOptionLabels };
    }

    return {
      options: paramOptionsForDefinition(row.key, batchParamOptionNode, value, row.definition),
      optionLabels: paramOptionLabelsForDefinition(row.key, batchParamOptionNode, value, row.definition)
    };
  };

  const renderParamEditor = (key: string, value: string, wrapLabel = true, definition?: DeviceParameterDefinition): ReactNode => {
    const label = PARAM_LABELS[key] ?? key;
    const editorNode = inspectorSelectedNode ?? selectedNode;
    const rawOptions = paramOptionsForDefinition(key, editorNode, value, definition);
    const optionLabels = paramOptionLabelsForDefinition(key, editorNode, value, definition);
    const { options, invalidValue } = selectOptionConfig(rawOptions, value);
    const modelAssociationPrompt = key === "model_id" && Boolean(modelAssociationModelTypeForKind(editorNode?.kind ?? ""));
    const lockedNode = key === "model_id" ? lockedModelAssociationNode(editorNode) : undefined;
    const parentLocked = key === "parent" && Boolean(String(editorNode?.params?._globalLineId ?? "").trim());
    const disabled = isBrowseMode || Boolean(lockedNode) || parentLocked;
    const title = lockedNode
      ? modelAssociationModelIdLockMessage(lockedNode)
      : parentLocked
        ? "全局线路的所属模型固定为 0。"
        : undefined;
    const control: ReactNode = options ? (
      <select value={value} disabled={disabled} title={title} onChange={(event) => updateParam(key, event.target.value)}>
        {options.map((option: string) => (
          <option key={option} value={option} disabled={option === invalidValue && !(modelAssociationPrompt && option === "")}>
            {modelAssociationPrompt && option === "" ? "请选择关联模型" : option === invalidValue ? invalidEnumOptionLabel(option) : optionLabels[option] ?? option}
          </option>
        ))}
      </select>
    ) : (
      <BufferedTextInput value={value} disabled={disabled} title={title} onCommit={(nextValue: string) => updateParam(key, nextValue)} />
    );
    return wrapLabel ? (
      <label key={key}>
        {label}
        {control}
      </label>
    ) : (
      control
    );
  };

  const updateNodeDoubleClickDraftNode = (nodeId: string, updater: (node: ModelNode) => ModelNode) => {
    setNodeDoubleClickDraft((current: { nodeId: string; node: ModelNode } | null) => {
      if (!current || current.nodeId !== nodeId) {
        return current;
      }
      const nextNode = updater(current.node);
      return nextNode === current.node ? current : { ...current, node: nextNode };
    });
  };

  const updateNodeDoubleClickDraftPatch = (nodeId: string, patch: Partial<ModelNode>) => {
    updateNodeDoubleClickDraftNode(nodeId, (node) => ({ ...node, ...patch }));
  };

  const updateNodeDoubleClickDraftParam = (nodeId: string, key: string, value: string) => {
    updateNodeDoubleClickDraftNode(nodeId, (node) => {
      const storedValue = normalizeRatioParameterInputValue(key, value, inferESection(node.kind, node.params));
      if (storedValue === null) {
        return node;
      }
      const currentNode = nodeById.get(nodeId) ?? node;
      if (key === "parent" && String(currentNode.params._globalLineId ?? "").trim()) {
        return node;
      }
      if (
        key === "model_id" &&
        currentNode.params.model_id !== storedValue &&
        modelAssociationModelIdLocked(currentNode, nodeById.values())
      ) {
        return node;
      }
      if (key !== "_labelDisplayMode" && node.params[key] === storedValue) {
        return node;
      }
      if (key === "_labelDisplayMode") {
        const mode = normalizeNodeLabelDisplayMode(storedValue);
        const visible = mode === "hidden" ? "0" : "1";
        if (node.params._labelDisplayMode === mode && node.params._labelVisible === visible) {
          return node;
        }
        return { ...node, params: { ...node.params, _labelDisplayMode: mode, _labelVisible: visible } };
      }
      return { ...node, params: { ...node.params, [key]: storedValue } };
    });
  };

  const renderNodeDoubleClickColorEditor = (node: ModelNode, key: string, value: string, fallback = "#ffffff"): ReactNode => {
    return (
      <div className="color-field with-none">
        <DeferredColorInput value={value} fallback={fallback} disabled={isBrowseMode} onCommit={(nextValue: string) => updateNodeDoubleClickDraftParam(node.id, key, nextValue)} />
        <BufferedTextInput
          value={value === "transparent" ? "无颜色" : value || ""}
          disabled={isBrowseMode}
          onCommit={(nextValue: string) => updateNodeDoubleClickDraftParam(node.id, key, nextValue === "无颜色" ? "transparent" : nextValue)}
        />
        <button type="button" disabled={isBrowseMode} onClick={() => updateNodeDoubleClickDraftParam(node.id, key, "transparent")}>无颜色</button>
      </div>
    );
  };

  const renderNodeDoubleClickParamEditor = (node: ModelNode, key: string, value: string, wrapLabel = true, definition?: DeviceParameterDefinition): ReactNode => {
    const label = PARAM_LABELS[key] ?? key;
    const rawOptions = paramOptionsForDefinition(key, node, value, definition);
    const optionLabels = paramOptionLabelsForDefinition(key, node, value, definition);
    const { options, invalidValue } = selectOptionConfig(rawOptions, value);
    const modelAssociationPrompt = key === "model_id" && Boolean(modelAssociationModelTypeForKind(node.kind));
    const lockedNode = key === "model_id" ? lockedModelAssociationNode(node) : undefined;
    const parentLocked = key === "parent" && Boolean(String(node.params._globalLineId ?? "").trim());
    const disabled = isBrowseMode || Boolean(lockedNode) || parentLocked;
    const title = lockedNode
      ? modelAssociationModelIdLockMessage(lockedNode)
      : parentLocked
        ? "全局线路的所属模型固定为 0。"
        : undefined;
    const control: ReactNode = options ? (
      <select value={value} disabled={disabled} title={title} onChange={(event) => updateNodeDoubleClickDraftParam(node.id, key, event.target.value)}>
        {options.map((option: string) => (
          <option key={option} value={option} disabled={option === invalidValue && !(modelAssociationPrompt && option === "")}>
            {modelAssociationPrompt && option === "" ? "请选择关联模型" : option === invalidValue ? invalidEnumOptionLabel(option) : optionLabels[option] ?? option}
          </option>
        ))}
      </select>
    ) : (
      <BufferedTextInput value={value} disabled={disabled} title={title} onCommit={(nextValue: string) => updateNodeDoubleClickDraftParam(node.id, key, nextValue)} />
    );
    return wrapLabel ? (
      <label key={key}>
        {label}
        {control}
      </label>
    ) : (
      control
    );
  };

  const renderBatchCommonColorParamEditor = (row: BatchCommonParamRow): ReactNode => {
    const value = row.mixed ? "" : row.value;
    return (
      <div className="color-field with-none">
        <DeferredColorInput
          value={value}
          fallback="#334155"
          disabled={isBrowseMode}
          onCommit={(nextValue: string) => applyBatchCommonParam(row.key, nextValue)}
        />
        <BufferedTextInput
          value={value === "transparent" ? "无颜色" : value}
          disabled={isBrowseMode}
          placeholder={row.mixed ? "多个不同值" : undefined}
          onCommit={(nextValue: string) => applyBatchCommonParam(row.key, nextValue === "无颜色" ? "transparent" : nextValue)}
        />
        <button type="button" disabled={isBrowseMode} onClick={() => applyBatchCommonParam(row.key, "transparent")}>无颜色</button>
      </div>
    );
  };

  const batchSavedProjectOptions = () => flattenSavedSchemes(schemes).flatMap((scheme) =>
    scheme.projects.map((project) => ({
      schemeId: scheme.id,
      schemeName: scheme.name,
      project
    }))
  );

  const applyBatchStaticButtonTargetProject = (projectId: string) => {
    const selected = batchSavedProjectOptions().find((item) => item.project.id === projectId);
    applyBatchCommonParamPatch("目标模型", () => ({
      buttonTargetProjectId: selected?.project.id ?? "",
      buttonTargetProjectName: selected?.project.name ?? "",
      buttonTargetSchemeId: selected?.schemeId ?? ""
    }));
  };

  const renderBatchCommonProjectSelect = (row: BatchCommonParamRow): ReactNode => {
    const projectOptions = batchSavedProjectOptions();
    const selectedProjectId = row.mixed
      ? ""
      : row.key === "buttonTargetProjectName"
        ? projectOptions.find((item) => item.project.name === row.value)?.project.id ?? ""
        : row.value;
    return (
      <select value={selectedProjectId} disabled={isBrowseMode} onChange={(event) => applyBatchStaticButtonTargetProject(event.target.value)}>
        <option value="">{row.mixed ? "多个不同值" : "请选择目标模型"}</option>
        {projectOptions.map(({ schemeId, schemeName, project }) => (
          <option key={`${schemeId}:${project.id}`} value={project.id}>
            {schemeName} / {project.name}
          </option>
        ))}
      </select>
    );
  };

  const renderBatchCommonSchemeSelect = (row: BatchCommonParamRow): ReactNode => (
    <select value={row.mixed ? "" : row.value} disabled={isBrowseMode} onChange={(event) => applyBatchCommonParam(row.key, event.target.value)}>
      <option value="">{row.mixed ? "多个不同值" : "请选择目标方案"}</option>
      {flattenSavedSchemes(schemes).map((scheme) => (
        <option key={scheme.id} value={scheme.id}>{scheme.name}</option>
      ))}
    </select>
  );

  const renderBatchCommonModelLayerSelect = (row: BatchCommonParamRow): ReactNode => {
    const currentLayerId = row.mixed ? "" : row.value || DEFAULT_MODEL_LAYER_ID;
    const hasCurrentLayer = !currentLayerId || layers.some((layer) => layer.id === currentLayerId);
    return (
      <select value={currentLayerId} disabled={isBrowseMode} onChange={(event) => assignSelectedNodesToModelLayer(event.target.value)}>
        <option value="">{row.mixed ? "多个不同值" : "请选择所属图层"}</option>
        {!hasCurrentLayer && <option value={currentLayerId}>{currentLayerId}</option>}
        {layers.map((layer) => (
          <option key={layer.id} value={layer.id}>{layer.name}</option>
        ))}
      </select>
    );
  };

  const normalizeBatchTargetLayerIds = (value: string): string[] => {
    const layerById = new Map(layers.map((layer) => [layer.id, layer]));
    const layerByName = new Map(layers.map((layer) => [layer.name.trim(), layer]));
    const layerIds: string[] = [];
    const usedLayerIds = new Set<string>();
    for (const token of parseStaticButtonTargetLayerValues(value)) {
      const layer = layerById.get(token) ?? layerByName.get(token);
      if (!layer || usedLayerIds.has(layer.id)) {
        continue;
      }
      usedLayerIds.add(layer.id);
      layerIds.push(layer.id);
    }
    return layerIds;
  };

  const applyBatchStaticButtonTargetLayers = (targetLayerIds: string[]) => {
    const targetLayerIdSet = new Set(targetLayerIds);
    const selectedLayers = layers.filter((layer) => targetLayerIdSet.has(layer.id));
    applyBatchCommonParamPatch("目标图层", () => ({
      buttonTargetLayerId: selectedLayers[0]?.id ?? "",
      buttonTargetLayerName: selectedLayers[0]?.name ?? "",
      buttonTargetLayerIds: serializeStaticButtonTargetLayerIds(selectedLayers.map((layer) => layer.id)),
      buttonTargetLayerNames: serializeStaticButtonTargetLayerIds(selectedLayers.map((layer) => layer.name))
    }));
  };

  const renderBatchCommonLayerSelect = (row: BatchCommonParamRow): ReactNode => {
    const selectedLayerId = row.mixed ? "" : normalizeBatchTargetLayerIds(row.value)[0] ?? "";
    return (
      <select value={selectedLayerId} disabled={isBrowseMode} onChange={(event) => applyBatchStaticButtonTargetLayers(event.target.value ? [event.target.value] : [])}>
        <option value="">{row.mixed ? "多个不同值" : "请选择目标图层"}</option>
        {layers.map((layer) => (
          <option key={layer.id} value={layer.id}>{layer.name}</option>
        ))}
      </select>
    );
  };

  const renderBatchCommonLayerMultiSelect = (row: BatchCommonParamRow): ReactNode => {
    const selectedLayerIds = row.mixed ? [] : normalizeBatchTargetLayerIds(row.value);
    const selectedLayerIdSet = new Set(selectedLayerIds);
    const selectedLayers = layers.filter((layer) => selectedLayerIdSet.has(layer.id));
    const selectedLayerTitle = selectedLayers.map((layer) => layer.name).join("、");
    const selectedLayerSummary =
      row.mixed
        ? "多个不同值"
        : selectedLayers.length === 0
          ? "请选择目标图层"
          : selectedLayers.length <= 2
            ? selectedLayerTitle
            : `已选 ${selectedLayers.length} 个图层：${selectedLayers.slice(0, 2).map((layer) => layer.name).join("、")}...`;
    return (
      <StaticButtonLayerMultiSelect
        ariaLabel="目标图层"
        className="batch-static-button-layer-dropdown"
        disabled={isBrowseMode}
        layers={layers}
        selectedLayerIds={selectedLayerIds}
        selectedLayerSummary={selectedLayerSummary}
        selectedLayerTitle={selectedLayerTitle}
        onChange={applyBatchStaticButtonTargetLayers}
      />
    );
  };

  const renderBatchCommonParamEditor = (row: BatchCommonParamRow): ReactNode => {
    const value = row.mixed ? "" : formatPowerBaseDisplayValue(row.key, row.value);
    if (isColorParamKey(row.key)) {
      return renderBatchCommonColorParamEditor(row);
    }
    if (row.key === "layerId") {
      return renderBatchCommonModelLayerSelect(row);
    }
    if (row.key === "buttonTargetProjectId" || row.key === "buttonTargetProjectName") {
      return renderBatchCommonProjectSelect(row);
    }
    if (row.key === "buttonTargetSchemeId") {
      return renderBatchCommonSchemeSelect(row);
    }
    if (row.key === "buttonTargetLayerIds" || row.key === "buttonTargetLayerNames") {
      return renderBatchCommonLayerMultiSelect(row);
    }
    if (row.key === "buttonTargetLayerId" || row.key === "buttonTargetLayerName") {
      return renderBatchCommonLayerSelect(row);
    }
    const { options: rawOptions, optionLabels } = batchParamOptionConfig(row, value);
    const { options, invalidValue } = row.mixed
      ? { options: rawOptions, invalidValue: undefined }
      : selectOptionConfig(rawOptions, value);
    const modelAssociationPrompt = row.key === "model_id" && activeSelectedNodeIds.some((nodeId) => modelAssociationModelTypeForKind(nodeById.get(nodeId)?.kind ?? ""));
    const lockedNode = row.key === "model_id"
      ? activeSelectedNodeIds.map((nodeId) => lockedModelAssociationNode(nodeById.get(nodeId))).find(Boolean)
      : undefined;
    const parentLockedNode = row.key === "parent"
      ? activeSelectedNodeIds
        .map((nodeId) => nodeById.get(nodeId))
        .find((node) => Boolean(String(node?.params?._globalLineId ?? "").trim()))
      : undefined;
    const disabled = isBrowseMode || Boolean(lockedNode) || Boolean(parentLockedNode);
    const title = lockedNode
      ? modelAssociationModelIdLockMessage(lockedNode)
      : parentLockedNode
        ? "全局线路的所属模型固定为 0。"
        : undefined;
    if (options) {
      return (
        <select value={value} disabled={disabled} title={title} onChange={(event) => applyBatchCommonParam(row.key, event.target.value)}>
          {row.mixed && <option value="">多个不同值</option>}
          {options.map((option: string) => (
            <option key={option} value={option} disabled={option === invalidValue && !(modelAssociationPrompt && option === "")}>
              {modelAssociationPrompt && option === "" ? "请选择关联模型" : option === invalidValue ? invalidEnumOptionLabel(option) : optionLabels[option] ?? option}
            </option>
          ))}
        </select>
      );
    }
    return (
      <BufferedTextInput
        value={value}
        disabled={disabled}
        title={title}
        placeholder={row.mixed ? "多个不同值" : undefined}
        onCommit={(nextValue: string) => applyBatchCommonParam(row.key, nextValue)}
      />
    );
  };

  const renderBatchCommonColumnGroup = (): ReactNode => (
    <colgroup>
      <col className="batch-common-name-col" />
      <col className="batch-common-value-col" />
    </colgroup>
  );

  const renderBatchCommonParamTable = (
    title: "图形" | "模型",
    rows: BatchCommonParamRow[],
    emptyText: string
  ): ReactNode => (
    <section className="batch-common-table-section" aria-label={`${title}共同属性表`}>
      <div className="batch-common-table-title">
        <strong>{title}</strong>
        <span>{rows.length} 个共同属性</span>
      </div>
      <table className="param-table batch-param-table batch-common-property-table">
        {renderBatchCommonColumnGroup()}
        <tbody>
          {rows.length > 0 ? rows.map((row) => (
            <tr key={row.key}>
              {renderParamHeader(row.key, row.key, row.label)}
              <td>{renderBatchCommonParamEditor(row)}</td>
            </tr>
          )) : (
            <tr className="batch-common-empty-row">
              <td colSpan={2}>{emptyText}</td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  );

  const renderBatchCommonMeasurementGroupColorEditor = (row: BatchCommonMeasurementGroupRow): ReactNode => {
    const value = row.mixed ? "" : row.value;
    const fallback = row.key === "backgroundColor" ? "#ffffff" : "#64748b";
    return (
      <div className="color-field with-none">
        <DeferredColorInput
          value={value}
          fallback={fallback}
          disabled={isBrowseMode}
          aria-label={row.label}
          onCommit={(nextValue: string) => applyBatchCommonMeasurementGroupSetting(row.key, nextValue)}
        />
        <BufferedTextInput
          value={value === "transparent" ? "无颜色" : value}
          disabled={isBrowseMode}
          placeholder={row.mixed ? "多个不同值" : undefined}
          onCommit={(nextValue: string) => applyBatchCommonMeasurementGroupSetting(row.key, nextValue === "无颜色" ? "transparent" : nextValue)}
        />
        <button type="button" disabled={isBrowseMode} onClick={() => applyBatchCommonMeasurementGroupSetting(row.key, "transparent")}>无颜色</button>
      </div>
    );
  };

  const renderBatchCommonMeasurementGroupEditor = (row: BatchCommonMeasurementGroupRow): ReactNode => {
    const value = row.mixed ? "" : row.value;
    if (row.key === "visible" || row.key === "labelVisible" || row.key === "unitVisible") {
      return (
        <select value={value} disabled={isBrowseMode} onChange={(event) => applyBatchCommonMeasurementGroupSetting(row.key, event.target.value)}>
          {row.mixed && <option value="">多个不同值</option>}
          <option value="1">显示</option>
          <option value="0">隐藏</option>
        </select>
      );
    }
    if (row.key === "backgroundVisible") {
      return (
        <select value={value} disabled={isBrowseMode} onChange={(event) => applyBatchCommonMeasurementGroupSetting(row.key, event.target.value)}>
          {row.mixed && <option value="">多个不同值</option>}
          <option value="1">显示</option>
          <option value="0">透明</option>
        </select>
      );
    }
    if (row.key === "layout") {
      return (
        <select value={value} disabled={isBrowseMode} onChange={(event) => applyBatchCommonMeasurementGroupSetting(row.key, event.target.value)}>
          {row.mixed && <option value="">多个不同值</option>}
          <option value="vertical">竖向</option>
          <option value="horizontal">横向</option>
          <option value="grid">两列</option>
        </select>
      );
    }
    if (row.key === "borderStyle") {
      return (
        <select value={value} disabled={isBrowseMode} onChange={(event) => applyBatchCommonMeasurementGroupSetting(row.key, event.target.value)}>
          {row.mixed && <option value="">多个不同值</option>}
          <option value="solid">实线</option>
          <option value="dashed">虚线</option>
          <option value="dotted">点线</option>
          <option value="none">无边框</option>
        </select>
      );
    }
    if (row.key === "backgroundColor" || row.key === "borderColor") {
      return renderBatchCommonMeasurementGroupColorEditor(row);
    }
    return (
      <BufferedTextInput
        type="number"
        min="0"
        max="12"
        step="0.5"
        value={value}
        disabled={isBrowseMode}
        placeholder={row.mixed ? "多个不同值" : undefined}
        onCommit={(nextValue: string) => applyBatchCommonMeasurementGroupSetting(row.key, nextValue)}
      />
    );
  };

  const renderBatchCommonMeasurementGroupTable = (): ReactNode => (
    <section className="batch-common-table-section" aria-label="量测共同属性表">
      <div className="batch-common-table-title">
        <strong>量测</strong>
        <span>{selectedNodeIdsWithMeasurementGroups.size} 个设备，{batchCommonMeasurementGroupRows.length} 个量测属性</span>
      </div>
      <table className="param-table batch-param-table batch-common-property-table selected-node-measurement-table">
        {renderBatchCommonColumnGroup()}
        <tbody>
          {batchCommonMeasurementGroupRows.length > 0 ? batchCommonMeasurementGroupRows.map((row) => (
            <tr key={row.key}>
              {renderParamHeader(row.key, row.key, row.label)}
              <td>{renderBatchCommonMeasurementGroupEditor(row)}</td>
            </tr>
          )) : (
            <tr className="batch-common-empty-row">
              <td colSpan={2}>选中设备没有可批量修改的量测共同属性。</td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  );

  const renderBatchCommonPropertyPanel = (): ReactNode => (
    <section className="batch-param-panel" aria-label="批量修改共同属性">
      <div className="batch-param-summary">
        <strong>批量修改共同属性</strong>
        <span>{activeSelectedNodeIds.length} 个图元，{batchCommonPropertyRowCount} 个共同属性</span>
      </div>
      <div className="batch-common-table-stack">
        {renderBatchCommonParamTable("图形", batchCommonGraphicParamRows, "选中图元没有可批量修改的图形共同属性。")}
        {renderBatchCommonParamTable("模型", batchCommonModelParamRows, "选中图元没有可批量修改的模型共同属性。")}
        {renderBatchCommonMeasurementGroupTable()}
      </div>
    </section>
  );

  const renderStaticButtonActionEditor = (
    node: ModelNode,
    editorActions: {
      updateParam: (key: string, value: string) => void;
      updateNode: (patch: Partial<ModelNode>) => void;
    } = {
      updateParam,
      updateNode: updateSelectedNode
    }
  ): ReactNode => {
    if (!isStaticButtonCapableNode(node)) {
      return null;
    }
    const writeParam = editorActions.updateParam;
    const writeNode = editorActions.updateNode;
    const buttonEnabled = node.params.buttonEnabled === "1";
    const actionType = node.params.buttonActionType || "none";
    const projectOptions = flattenSavedSchemes(schemes).flatMap((scheme) =>
      scheme.projects.map((project) => ({
        schemeId: scheme.id,
        schemeName: scheme.name,
        project
      }))
    );
    const selectedTargetLayers = resolveStaticButtonTargetLayers(node, layers);
    const selectedTargetLayerTitle = selectedTargetLayers.map((layer) => layer.name).join("、");
    const selectedTargetLayerSummary =
      selectedTargetLayers.length === 0
        ? "请选择目标图层"
        : selectedTargetLayers.length <= 2
          ? selectedTargetLayerTitle
          : `已选 ${selectedTargetLayers.length} 个图层：${selectedTargetLayers.slice(0, 2).map((layer) => layer.name).join("、")}...`;
    const writeStaticButtonTargetLayers = (targetLayerIds: string[]) => {
      const targetLayerIdSet = new Set(targetLayerIds);
      const selectedLayers = layers.filter((layer) => targetLayerIdSet.has(layer.id));
      writeNode({
        params: {
          ...node.params,
          buttonTargetLayerId: selectedLayers[0]?.id ?? "",
          buttonTargetLayerName: selectedLayers[0]?.name ?? "",
          buttonTargetLayerIds: serializeStaticButtonTargetLayerIds(selectedLayers.map((layer) => layer.id)),
          buttonTargetLayerNames: serializeStaticButtonTargetLayerIds(selectedLayers.map((layer) => layer.name))
        }
      });
    };
    return (
      <>
        <tr>
          {renderChineseParamHeader("buttonEnabled")}
          <td>
            <select
              value={buttonEnabled ? "1" : "0"}
              disabled={isBrowseMode}
              onChange={(event) => writeParam("buttonEnabled", event.target.value)}
            >
              <option value="1">启用</option>
              <option value="0">禁用</option>
            </select>
          </td>
        </tr>
        {buttonEnabled && (
          <>
            <tr>
              {renderChineseParamHeader("buttonActionType")}
              <td>
                <select value={actionType} disabled={isBrowseMode} onChange={(event) => writeParam("buttonActionType", event.target.value)}>
                  {Object.entries(STATIC_BUTTON_ACTION_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </td>
            </tr>
            {actionType === "project" && (
              <tr>
                {renderChineseParamHeader("buttonTargetProjectId")}
                <td>
                  <select
                    value={node.params.buttonTargetProjectId || ""}
                    disabled={isBrowseMode}
                    onChange={(event) => {
                      const selected = projectOptions.find((item) => item.project.id === event.target.value);
                      writeNode({
                        params: {
                          ...node.params,
                          buttonTargetProjectId: selected?.project.id ?? "",
                          buttonTargetProjectName: selected?.project.name ?? "",
                          buttonTargetSchemeId: selected?.schemeId ?? ""
                        }
                      });
                    }}
                  >
                    <option value="">请选择目标模型</option>
                    {projectOptions.map(({ schemeId, schemeName, project }) => (
                      <option key={`${schemeId}:${project.id}`} value={project.id}>
                        {schemeName} / {project.name}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            )}
            {actionType === "layer" && (
              <tr>
                {renderChineseParamHeader("buttonTargetLayerIds")}
                <td>
                  <StaticButtonLayerMultiSelect
                    ariaLabel="目标图层"
                    disabled={isBrowseMode}
                    layers={layers}
                    selectedLayerIds={selectedTargetLayers.map((layer) => layer.id)}
                    selectedLayerSummary={selectedTargetLayerSummary}
                    selectedLayerTitle={selectedTargetLayerTitle}
                    onChange={writeStaticButtonTargetLayers}
                  />
                </td>
              </tr>
            )}
            {actionType === "command" && (
              <tr>
                {renderChineseParamHeader("buttonCommand")}
                <td>
                  <select value={node.params.buttonCommand || "none"} disabled={isBrowseMode} onChange={(event) => writeParam("buttonCommand", event.target.value)}>
                    {Object.entries(STATIC_BUTTON_COMMAND_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </td>
              </tr>
            )}
          </>
        )}
      </>
    );
  };

  const renderParamHeader = (key: string, displayName = key, title = PARAM_LABELS[key] ?? displayName): ReactNode => {
    const visibleLabel = displayName === key ? title : displayName;
    const englishLabel = key.trim();
    return (
      <th title={englishLabel ? `${visibleLabel} / ${englishLabel}` : visibleLabel}>
        <span className="param-header-bilingual">
          <span>{visibleLabel}</span>
          {englishLabel && englishLabel !== visibleLabel ? <small>{englishLabel}</small> : null}
        </span>
      </th>
    );
  };

  const renderChineseParamHeader = (key: string, fallback = key): ReactNode => (
    renderParamHeader(key, key, PARAM_LABELS[key] ?? fallback)
  );

  return {
    renderColorEditor,
    renderParamEditor,
    updateNodeDoubleClickDraftNode,
    updateNodeDoubleClickDraftPatch,
    updateNodeDoubleClickDraftParam,
    renderNodeDoubleClickColorEditor,
    renderNodeDoubleClickParamEditor,
    renderBatchCommonPropertyPanel,
    renderStaticButtonActionEditor,
    renderParamHeader,
    renderChineseParamHeader,
    definitionMakesValueReadonly,
  };
}
