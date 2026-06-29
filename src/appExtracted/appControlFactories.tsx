// @ts-nocheck
// swigger 控制台写操作程序化方法工厂。
// 与 UI 写方法隔离：参数显式传入，复用底层 setter，绕过 prompt/alert/draft/editMode。
// 经 WS control 指令调用（App.tsx commandHandler 分发）。
import { createDefaultNode, DEVICE_LIBRARY_BY_KIND, deleteNodesWithConnectedEdges } from "../model";
import { createCanvasGroupFromSelection, removeGraphicsFromGroups } from "../selectionActions";

// 新增图元：kind 限 DeviceKind 枚举，attrs 从 deviceDefinition 取默认（createDefaultNode 内部完成），
// 调用方可 override（position/params 等）。压 undo 栈（C-5），不落盘（D-3）。
export function createProgrammaticAddDevice(__appScope: Record<string, any>) {
  return (kind: string, x?: number, y?: number, attrs?: Record<string, any>) => {
    const { pushUndoSnapshot, setNodes } = __appScope;
    if (!kind || typeof kind !== "string") {
      const e: any = new Error("kind 必填。");
      e.code = "bad-request";
      throw e;
    }
    if (!DEVICE_LIBRARY_BY_KIND.has(kind)) {
      const e: any = new Error(`未知图元类型：${kind}`);
      e.code = "bad-request";
      throw e;
    }
    const position = { x: Number(x) || 0, y: Number(y) || 0 };
    const node = createDefaultNode(kind as any, position);
    // attrs override：浅合并到节点顶层字段（如 name/rotation/scale/layerId/params）
    if (attrs && typeof attrs === "object") {
      for (const key of Object.keys(attrs)) {
        const value = (attrs as any)[key];
        if (key === "params" && node.params && typeof value === "object") {
          (node as any).params = { ...node.params, ...value };
        } else {
          (node as any)[key] = value;
        }
      }
    }
    pushUndoSnapshot();
    setNodes((prev: any[]) => [...prev, node]);
    return { id: node.id };
  };
}

// 新建方案：name 必填，parentSchemeId 指定时校验同级重名。
// 复用 createSavedScheme/insertChildSavedScheme，绕过 prompt/editMode/落盘（落盘由独立 control.save 指令）。
// 经 WS control.scheme.create 指令调用。
export function createProgrammaticCreateScheme(__appScope: Record<string, any>) {
  return (name: string, parentSchemeId?: string) => {
    const { createSavedScheme, hasSameName, insertChildSavedScheme, savedChildSchemeNames, schemePathForScheme, schemes, selectSingleScheme, setSchemes } = __appScope;
    if (!name || typeof name !== "string" || !name.trim()) {
      const e: any = new Error("name 必填。");
      e.code = "bad-request";
      throw e;
    }
    if (parentSchemeId && hasSameName(name, savedChildSchemeNames(schemes, parentSchemeId))) {
      const e: any = new Error("方案名称重复，无法新建方案。");
      e.code = "bad-request";
      throw e;
    }
    const record = createSavedScheme(name);
    const parentPath = parentSchemeId ? schemePathForScheme(parentSchemeId) : [];
    const recordPath = [...parentPath, record.name];
    setSchemes((current: any) => insertChildSavedScheme(current, parentSchemeId || "", record));
    selectSingleScheme(record.id);
    return { id: record.id, name: record.name, path: recordPath };
  };
}

// 新建模型：name 必填，schemeId 缺省取 schemes[0]。复用 createSavedProject/upsertSavedProjectInScheme，
// 绕过 prompt/editMode/落盘（落盘由独立 control.save 指令）。经 WS control.model.create 指令调用。
export function createProgrammaticCreateBlankProject(__appScope: Record<string, any>) {
  return (name: string, schemeId?: string) => {
    const { DEFAULT_CANVAS_WIDTH, DEFAULT_CANVAS_HEIGHT, DEFAULT_CANVAS_BACKGROUND, DEFAULT_POWER_UNIT, DEFAULT_VOLTAGE_UNIT, DEFAULT_CURRENT_UNIT, DEFAULT_POWER_BASE_VALUE, createSavedProject, findSavedSchemeById, hasSameName, requestLoadSavedProject, schemePathForScheme, schemes, selectSingleProject, setSchemes, upsertSavedProjectInScheme } = __appScope;
    if (!name || typeof name !== "string" || !name.trim()) {
      const e: any = new Error("name 必填。");
      e.code = "bad-request";
      throw e;
    }
    const resolvedSchemeId = schemeId ?? schemes[0]?.id;
    const targetScheme = findSavedSchemeById(schemes, resolvedSchemeId) ?? schemes[0];
    if (!targetScheme) {
      const e: any = new Error("无可用方案，请先创建方案");
      e.code = "bad-request";
      throw e;
    }
    if (hasSameName(name, targetScheme.projects.map((project: any) => project.name))) {
      const e: any = new Error("模型名称重复，无法新建模型。");
      e.code = "bad-request";
      throw e;
    }
    const record = createSavedProject(name, {
      version: 1,
      name,
      canvasWidth: DEFAULT_CANVAS_WIDTH,
      canvasHeight: DEFAULT_CANVAS_HEIGHT,
      allowAutoExpandCanvas: true,
      canvasBackgroundColor: DEFAULT_CANVAS_BACKGROUND,
      powerUnit: DEFAULT_POWER_UNIT,
      voltageUnit: DEFAULT_VOLTAGE_UNIT,
      currentUnit: DEFAULT_CURRENT_UNIT,
      powerBaseValue: DEFAULT_POWER_BASE_VALUE,
      deviceIndexCounters: {},
      nodes: [],
      edges: []
    });
    setSchemes((current: any) => upsertSavedProjectInScheme(current, targetScheme.id, record));
    selectSingleProject(targetScheme.id, record.id);
    requestLoadSavedProject(record, targetScheme.id);
    return { id: record.id, name: record.name, schemeId: targetScheme.id };
  };
}

// 选中图元：ids 必填（字符串数组），mode 可选（"set"|"add"|"toggle"，默认 "set"）。
// 复用 setSelectedNodeIds，经 WS control.devices.select 指令调用。
export function createProgrammaticSelectDevices(__appScope: Record<string, any>) {
  return (ids: string[], mode?: "set" | "add" | "toggle") => {
    const { setSelectedNodeIds, selectedNodeIds } = __appScope;
    if (!Array.isArray(ids)) {
      const e: any = new Error("ids 须为字符串数组。");
      e.code = "bad-request";
      throw e;
    }
    const resolvedMode = mode ?? "set";
    let result: string[];
    if (resolvedMode === "set") {
      result = [...ids];
    } else if (resolvedMode === "add") {
      const prev = new Set<string>((selectedNodeIds as string[]) ?? []);
      for (const id of ids) prev.add(id);
      result = [...prev];
    } else if (resolvedMode === "toggle") {
      const prev = new Set<string>((selectedNodeIds as string[]) ?? []);
      for (const id of ids) {
        if (prev.has(id)) prev.delete(id);
        else prev.add(id);
      }
      result = [...prev];
    } else {
      const e: any = new Error(`未知选中模式：${resolvedMode}`);
      e.code = "bad-request";
      throw e;
    }
    setSelectedNodeIds(result);
    return { selectedIds: result };
  };
}

// 组合当前选中图元：无参数，基于 activeSelectedNodeIds/activeSelectedEdgeIds。
// 至少选中 2 项方可组合（否则抛 control-failed）。复用 createCanvasGroupFromSelection，
// 压 undo 栈（C-5），组合后选中扩展到整个组合。经 WS control.devices.group 指令调用。
export function createProgrammaticGroupSelected(__appScope: Record<string, any>) {
  return () => {
    const {
      activeSelectedNodeIds, activeSelectedEdgeIds,
      groups, nodes, edges,
      createCanvasGroupFromSelection, normalizeModelGroups,
      pushUndoSnapshot, setGroups, setCanvasSelectionScope,
      setSelectedNodeIds, setSelectedEdgeId, setSelectedEdgeIds,
      expandSelectionByGroups
    } = __appScope;
    const currentNodes = (activeSelectedNodeIds as string[]) ?? [];
    const currentEdges = (activeSelectedEdgeIds as string[]) ?? [];
    if (currentNodes.length + currentEdges.length < 2) {
      const e: any = new Error("至少选中 2 个图元方可组合。");
      e.code = "control-failed";
      throw e;
    }
    const result = createCanvasGroupFromSelection(
      groups,
      currentNodes,
      currentEdges,
      () => `group-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    );
    if (!result.group) {
      const e: any = new Error("无法组合所选图元。");
      e.code = "control-failed";
      throw e;
    }
    pushUndoSnapshot();
    const nextGroups = normalizeModelGroups(result.groups, nodes, edges);
    setGroups(nextGroups);
    const selection = expandSelectionByGroups(nextGroups, currentNodes, currentEdges);
    setCanvasSelectionScope("group");
    setSelectedNodeIds(selection.nodeIds);
    setSelectedEdgeIds(selection.edgeIds);
    setSelectedEdgeId(selection.edgeIds[0] ?? "");
    return { groupId: result.group.id, name: result.group.name };
  };
}

// 删除图元：ids 缺省取 activeSelectedNodeIds。复用 deleteNodesWithConnectedEdges 删除节点
// 及关联边，清理 groups/measurements/selection，压 undo 栈（C-5）。
// 经 WS control.device.delete 指令调用。
export function createProgrammaticDeleteDevices(__appScope: Record<string, any>) {
  return (ids?: string[]) => {
    const {
      activeSelectedNodeIds, nodes, edges, groups,
      deleteNodesWithConnectedEdges, edgeListForNodeIds, edgeById,
      markRouteEdgesDirty, markStoredRouteEdgesDirty, markBusTerminalSyncDirtyForEdges,
      normalizeModelGroups, normalizeProjectMeasurements, removeGraphicsFromGroups,
      pushUndoSnapshot, setGraphArrays, setEdges, setGroups, setProjectMeasurements,
      setCanvasSelectionScope, setSelectedNodeIds, setSelectedEdgeId, setSelectedEdgeIds
    } = __appScope;
    const targetNodeIds = ids ?? ((activeSelectedNodeIds as string[]) ?? []);
    if (targetNodeIds.length === 0) {
      const e: any = new Error("无可删除图元。");
      e.code = "control-failed";
      throw e;
    }
    const selectedEdgeSet = new Set<string>();
    pushUndoSnapshot();
    const deletedEdges = edgeListForNodeIds(targetNodeIds, selectedEdgeSet);
    markRouteEdgesDirty(deletedEdges.map((edge: any) => edge.id));
    markStoredRouteEdgesDirty(deletedEdges.map((edge: any) => edge.id));
    markBusTerminalSyncDirtyForEdges(deletedEdges);
    const result = deleteNodesWithConnectedEdges(nodes, edges, targetNodeIds);
    const nextEdges = result.edges.filter((edge: any) => !selectedEdgeSet.has(edge.id));
    setGraphArrays(result.nodes, nextEdges);
    setGroups(normalizeModelGroups(removeGraphicsFromGroups(groups, targetNodeIds, selectedEdgeSet), result.nodes, nextEdges));
    setProjectMeasurements((current: any) => normalizeProjectMeasurements(current, result.nodes));
    setCanvasSelectionScope("group");
    setSelectedNodeIds([]);
    setSelectedEdgeId("");
    setSelectedEdgeIds([]);
    return { deletedIds: targetNodeIds };
  };
}

// 修改图元属性：id 必填，category 为 "graphic"|"model"|"measurement"，patch 为要合并的字段。
// graphic/model 类别通过 updateGraphNodeById 合并到节点（params 深合，其他浅合）；
// measurement 类别暂不支持（抛 not-implemented）。压 undo 栈（C-5）。
// 经 WS control.device.property.update 指令调用。
export function createProgrammaticUpdateDeviceProperty(__appScope: Record<string, any>) {
  return (id: string, category: string, patch: Record<string, any>) => {
    const { updateGraphNodeById, pushUndoSnapshot, nodes } = __appScope;
    if (!id || typeof id !== "string") {
      const e: any = new Error("id 必填。");
      e.code = "bad-request";
      throw e;
    }
    if (!patch || typeof patch !== "object") {
      const e: any = new Error("patch 须为对象。");
      e.code = "bad-request";
      throw e;
    }
    const nodeExists = (nodes as any[]).some((n) => n.id === id);
    if (!nodeExists) {
      const e: any = new Error(`图元 ${id} 不存在。`);
      e.code = "not-found";
      throw e;
    }
    if (category === "measurement") {
      const e: any = new Error("量测属性修改暂未实现。");
      e.code = "not-implemented";
      throw e;
    }
    if (category !== "graphic" && category !== "model") {
      const e: any = new Error(`未知属性类别：${category}`);
      e.code = "bad-request";
      throw e;
    }
    pushUndoSnapshot();
    updateGraphNodeById(id, (node: any) => {
      const next = { ...node };
      for (const key of Object.keys(patch)) {
        const value = patch[key];
        if (key === "params" && next.params && typeof value === "object") {
          next.params = { ...next.params, ...value };
        } else {
          next[key] = value;
        }
      }
      return next;
    });
    return { id, category, patched: Object.keys(patch) };
  };
}

// 显式落盘：scope="currentModel" 调 saveCurrentProject，scope="schemeTree" 调 saveSchemeTreeToBackend。
// 不压 undo 栈（C-5）。经 WS control.save 指令调用。
export function createProgrammaticSave(__appScope: Record<string, any>) {
  return (scope: string) => {
    const { saveCurrentProject, saveSchemeTreeToBackend } = __appScope;
    if (scope !== "currentModel" && scope !== "schemeTree") {
      const e: any = new Error(`未知保存范围：${scope}`);
      e.code = "bad-request";
      throw e;
    }
    if (scope === "currentModel") {
      saveCurrentProject();
    } else {
      saveSchemeTreeToBackend();
    }
    return { saved: true, scope };
  };
}

// 从当前选中组合保存为模板：name 必填，componentType 必填，attributeLibraryName 可选。
// 复用现有端子推导+图标生成逻辑（buildCanvasClipboard/groupDeviceExternalTerminals/createGroupDeviceIconSvg），
// 构造 DeviceTemplate 后直接 persistDeviceLibraryChange 落盘。经 WS control.template.saveFromSelection 指令调用。
export function createProgrammaticSaveSelectionAsTemplate(__appScope: Record<string, any>) {
  return (opts: { name: string; componentType: string; attributeLibraryName?: string }) => {
    const {
      MAX_CUSTOM_DEVICE_TERMINALS,
      TERMINAL_TYPE_LIBRARY_LABELS,
      activeLayerGroups, activeSelectedGroupIds,
      buildCanvasClipboard, canAddTemplateFromSelection, canvasClipboardBounds,
      cloneGraphTemplateClipboard, createGroupDeviceIconSvg, customDeviceTemplates,
      defaultComponentTypeForAttributeLibrary, edges, groupDeviceExternalTerminals,
      groupExpandedCanvasSelection, isValidComponentTypeName,
      nextCustomTemplateKind, normalizeAttributeLibraryName, normalizeComponentTypeName,
      normalizeContainerTerminalAssociations, persistDeviceLibraryChange,
      routedEdges, setCustomDeviceTemplates, visibleEdges, visibleNodes,
      createDefaultCustomDeviceTerminalAnchors
    } = __appScope;

    // 校验参数
    const { name, componentType: rawComponentType, attributeLibraryName: rawAttributeLibraryName } = opts;
    if (!name || typeof name !== "string" || !name.trim()) {
      const e: any = new Error("name 必填。");
      e.code = "bad-request";
      throw e;
    }
    const componentType = normalizeComponentTypeName(rawComponentType);
    if (!componentType) {
      const e: any = new Error("componentType 必填。");
      e.code = "bad-request";
      throw e;
    }
    if (!isValidComponentTypeName(componentType)) {
      const e: any = new Error("componentType 须为合法英文名称。");
      e.code = "bad-request";
      throw e;
    }

    // 校验选中状态
    if (!canAddTemplateFromSelection) {
      const e: any = new Error("请先选中一个图元组合。");
      e.code = "control-failed";
      throw e;
    }

    // 构建 clipboard
    const clipboard = buildCanvasClipboard(
      visibleNodes,
      visibleEdges,
      routedEdges,
      groupExpandedCanvasSelection.nodeIds,
      groupExpandedCanvasSelection.edgeIds,
      activeLayerGroups,
      { expandGroups: true }
    );
    const bounds = canvasClipboardBounds(clipboard);
    if (!bounds || (clipboard.nodes.length === 0 && clipboard.edges.length === 0)) {
      const e: any = new Error("当前组合无可定义为元件的图元。");
      e.code = "control-failed";
      throw e;
    }

    // 提取端子
    const terminals = groupDeviceExternalTerminals(clipboard, edges);
    if (terminals.length > MAX_CUSTOM_DEVICE_TERMINALS) {
      const e: any = new Error(`端子数 ${terminals.length} 超过上限 ${MAX_CUSTOM_DEVICE_TERMINALS}。`);
      e.code = "control-failed";
      throw e;
    }

    // 生成图标 + 尺寸
    const iconImage = createGroupDeviceIconSvg(clipboard);
    const size = {
      width: Math.max(1, Math.round(bounds.right - bounds.left)),
      height: Math.max(1, Math.round(bounds.bottom - bounds.top))
    };

    // 构造模板
    const attributeLibraryName = normalizeAttributeLibraryName(rawAttributeLibraryName || "交流设备");
    const terminalTypes = terminals.map((t: any) => t.type);
    const terminalAssociations = normalizeContainerTerminalAssociations(
      terminalTypes,
      terminals.map((t: any) => t.association),
      terminalTypes.length
    );
    const terminalAnchors = createDefaultCustomDeviceTerminalAnchors(
      terminals.length,
      terminals.map((t: any) => t.anchor)
    );
    const terminalLabels = terminals.map(
      (t: any, i: number) => t.label?.trim() || `${TERMINAL_TYPE_LIBRARY_LABELS[terminalTypes[i]] ?? terminalTypes[i]}端${i + 1}`
    );
    const customKind = nextCustomTemplateKind(componentType);
    const template = {
      kind: customKind,
      label: name.trim(),
      attributeLibrary: attributeLibraryName,
      size,
      params: {
        component_type: componentType,
        fillColor: "transparent",
        strokeColor: "transparent",
        lineWidth: "0",
        backgroundImage: iconImage,
        backgroundImageAssetId: "",
        backgroundImageCleared: ""
      },
      terminalType: terminalTypes[0] ?? "ac",
      terminalCount: terminalTypes.length,
      terminalTypes,
      terminalAssociations: terminalTypes.length > 0 ? terminalAssociations : undefined,
      terminalLabels,
      terminalAnchors,
      isContainer: terminalTypes.length > 0,
      allowResizeTransform: true,
      custom: true,
      parameterDefinitions: [],
      stateDefinitions: []
    };
    const nextTemplates = [...customDeviceTemplates, template];
    setCustomDeviceTemplates(nextTemplates);
    persistDeviceLibraryChange({ customDeviceTemplates: nextTemplates }, {
      success: `模板已保存到后台：${name}`,
      failure: `模板保存到本地，后台保存失败：${name}`
    });
    return { templateKind: customKind };
  };
}
