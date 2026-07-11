// runtimeSnapshot.ts — 前端运行时态序列化模块
// 从 __appScope 读取状态，按 resource 序列化为可 JSON 化的 v1 信封结构
// 供 WS 客户端 fetchHandler 调用

/** 可用 runtime resource 类型 */
export type RuntimeSnapshotResource =
  | "runtime.snapshot"
  | "runtime.tab"
  | "runtime.selection"
  | "runtime.model"
  | "runtime.devices"
  | "runtime.e-file"
  | "runtime.svg";

/** v1 信封：成功 */
export type V1Ok<T> = { ok: true; data: T };
/** v1 信封：失败 */
export type V1Err = { ok: false; error: { code: string; message: string } };
/** v1 信封联合 */
export type V1Result<T> = V1Ok<T> | V1Err;

// ---- 辅助 ----

/** 安全取字符串，undefined/null → 空串 */
const safeStr = (v: unknown): string =>
  typeof v === "string" ? v : "";

/** 安全取数字 */
const safeNum = (v: unknown, fallback = 0): number =>
  typeof v === "number" && Number.isFinite(v) ? v : fallback;

/** 安全取布尔 */
const safeBool = (v: unknown, fallback = false): boolean =>
  typeof v === "boolean" ? v : fallback;

/** 无活动模型判定 */
const noActiveModel = (appScope: Record<string, any>): boolean =>
  !appScope.activeProjectKey;

/** 返回 no-active-model 错误 */
const errNoActive = (): V1Err => ({
  ok: false,
  error: { code: "no-active-model", message: "无活动模型" }
});

/** 返回 bad-request 错误 */
const errBadRequest = (msg: string): V1Err => ({
  ok: false,
  error: { code: "bad-request", message: msg }
});

/** 返回 internal 错误 */
const errInternal = (e: unknown): V1Err => ({
  ok: false,
  error: { code: "internal", message: e instanceof Error ? e.message : String(e) }
});

/** 用 try-catch 包裹，异常→internal */
const wrap = <T>(fn: () => V1Result<T>): V1Result<T> => {
  try {
    return fn();
  } catch (e) {
    return errInternal(e);
  }
};

// ---- 节点序列化（只取基本字段，保证可 JSON 化）----

/** 选中节点可 JSON 化的精简结构 */
export type SerializedNode = {
  id: string;
  kind: string;
  name: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  rotation: number;
  scale: number;
  scaleX: number;
  scaleY: number;
};

const serializeNode = (node: any): SerializedNode => ({
  id: safeStr(node?.id),
  kind: safeStr(node?.kind),
  name: safeStr(node?.name),
  position: {
    x: safeNum(node?.position?.x),
    y: safeNum(node?.position?.y)
  },
  size: {
    width: safeNum(node?.size?.width),
    height: safeNum(node?.size?.height)
  },
  rotation: safeNum(node?.rotation),
  scale: safeNum(node?.scale, 1),
  scaleX: safeNum(node?.scaleX, 1),
  scaleY: safeNum(node?.scaleY, 1)
});

// ---- 各 resource 序列化函数 ----

/** runtime.model → 模型元信息 */
export function serializeModel(appScope: Record<string, any>): V1Result<{
  clientId?: string;
  schemePath: string;
  modelName: string;
  modelId: string;
  updatedAt: string;
}> {
  return wrap(() => {
    if (noActiveModel(appScope)) return errNoActive();
    const mr = appScope.currentModelRecord;
    const schemeRec = appScope.activeSchemeRecord;
    // schemePath 优先从 currentActiveProjectPointer 取
    const pointer = appScope.currentActiveProjectPointer;
    const schemePath = pointer?.schemePath ?? schemeRec?.name ?? "";
    return {
      ok: true,
      data: {
        modelName: safeStr(appScope.activeModelName),
        modelId: safeStr(appScope.activeProjectKey),
        updatedAt: safeStr(mr?.updatedAt),
        schemePath
      }
    };
  });
}

/** runtime.devices → 节点+边列表 */
export function serializeDevices(appScope: Record<string, any>): V1Result<{
  nodes: any[];
  edges: any[];
}> {
  return wrap(() => {
    if (noActiveModel(appScope)) return errNoActive();
    return {
      ok: true,
      data: {
        nodes: appScope.nodes ?? [],
        edges: appScope.edges ?? []
      }
    };
  });
}

/** runtime.selection → 当前选中 */
export function serializeSelection(appScope: Record<string, any>): V1Result<{
  selectedNodeIds: string[];
  selectedNode: SerializedNode | null;
}> {
  return wrap(() => {
    if (noActiveModel(appScope)) return errNoActive();
    const ids: string[] = Array.isArray(appScope.selectedNodeIds)
      ? appScope.selectedNodeIds
      : [];
    const node = appScope.inspectorSelectedNode;
    return {
      ok: true,
      data: {
        selectedNodeIds: ids,
        selectedNode: node ? serializeNode(node) : null
      }
    };
  });
}

/** 属性表行 */
export type ParamRow = {
  label: string;
  value: string;
  key: string;
  editable: boolean;
};

/** tree 节点 */
export type TreeNode = {
  id: string;
  name: string;
  kind: string;
  children?: TreeNode[];
};

/** device 参数段 */
export type DeviceParamSection = {
  section: string;
  columns: { key: string; label: string }[];
  rows: Record<string, string>[];
};

/** tab 数据 */
export type TabData = {
  tab: "model" | "tree" | "graph";
  title: string;
  rows?: ParamRow[];
  tree?: { nodes: TreeNode[] };
  subView?: "graph" | "device";
  deviceParams?: DeviceParamSection[];
};

// ---- model tab 行构建 ----

const buildModelRows = (appScope: Record<string, any>): ParamRow[] => {
  const mr = appScope.currentModelRecord;
  const schemeRec = appScope.activeSchemeRecord;
  const cb = appScope.canvasBounds ?? {};
  return [
    { label: "模型名称", value: safeStr(mr?.name || appScope.activeModelName), key: "name", editable: false },
    { label: "所属方案", value: safeStr(schemeRec?.name ?? ""), key: "scheme", editable: false },
    { label: "更新时间", value: safeStr(mr?.updatedAt), key: "updatedAt", editable: false },
    { label: "画布宽度", value: String(safeNum(cb.width)), key: "canvasWidth", editable: false },
    { label: "画布高度", value: String(safeNum(cb.height)), key: "canvasHeight", editable: false },
    { label: "背景色", value: safeStr(appScope.canvasBackgroundColor), key: "canvasBackgroundColor", editable: false },
    { label: "自动扩展", value: safeBool(appScope.allowAutoExpandCanvas) ? "是" : "否", key: "allowAutoExpandCanvas", editable: false },
    { label: "功率单位", value: safeStr(appScope.powerUnit), key: "powerUnit", editable: false },
    { label: "电压单位", value: safeStr(appScope.voltageUnit), key: "voltageUnit", editable: false },
    { label: "电流单位", value: safeStr(appScope.currentUnit), key: "currentUnit", editable: false },
    { label: "功率基值", value: String(safeNum(appScope.powerBaseValue)), key: "powerBaseValue", editable: false }
  ];
};

// ---- tree tab：从 nodes + groups 构建简化树 ----

const buildTreeNodes = (appScope: Record<string, any>): TreeNode[] => {
  const nodes: any[] = appScope.nodes ?? [];
  const groups: any[] = appScope.groups ?? [];
  // 按 layer 分组
  const byLayer = new Map<string, TreeNode>();
  for (const n of nodes) {
    const layerId: string = n.layerId ?? "";
    if (!byLayer.has(layerId)) {
      byLayer.set(layerId, { id: `layer:${layerId}`, name: `图层 ${layerId.slice(0, 8)}`, kind: "layer", children: [] });
    }
    byLayer.get(layerId)!.children!.push({
      id: safeStr(n.id),
      name: safeStr(n.name),
      kind: safeStr(n.kind)
    });
  }
  // groups 作为独立组
  for (const g of groups) {
    const gNode: TreeNode = {
      id: safeStr(g.id),
      name: safeStr(g.name),
      kind: "group",
      children: (g.nodeIds ?? []).map((nid: string) => {
        const n = (appScope.nodeById?.get?.(nid)) ?? (Array.isArray(appScope.nodes) ? appScope.nodes.find((x: any) => x.id === nid) : null);
        return { id: nid, name: safeStr(n?.name), kind: safeStr(n?.kind) };
      })
    };
    byLayer.set(`group:${g.id}`, gNode);
  }
  return Array.from(byLayer.values());
};

// ---- graph tab：选中图元属性表 ----

const buildGraphRows = (appScope: Record<string, any>): ParamRow[] => {
  const node = appScope.inspectorSelectedNode;
  if (!node) return [];
  return [
    { label: "名称", value: safeStr(node.name), key: "name", editable: false },
    { label: "类型", value: safeStr(node.kind), key: "kind", editable: false },
    { label: "X 坐标", value: String(safeNum(node.position?.x)), key: "x", editable: false },
    { label: "Y 坐标", value: String(safeNum(node.position?.y)), key: "y", editable: false },
    { label: "宽度", value: String(safeNum(node.size?.width)), key: "width", editable: false },
    { label: "高度", value: String(safeNum(node.size?.height)), key: "height", editable: false },
    { label: "旋转", value: `${safeNum(node.rotation)}°`, key: "rotation", editable: false },
    { label: "缩放", value: String(safeNum(node.scale, 1)), key: "scale", editable: false },
    { label: "X 缩放", value: String(safeNum(node.scaleX, 1)), key: "scaleX", editable: false },
    { label: "Y 缩放", value: String(safeNum(node.scaleY, 1)), key: "scaleY", editable: false }
  ];
};

const buildDeviceParams = (appScope: Record<string, any>): DeviceParamSection[] => {
  const views: any[] = appScope.selectedContainerParameterViews ?? [];
  return views.map((view: any) => ({
    section: safeStr(view.label ?? view.id ?? ""),
    columns: (view.columns ?? []).map((col: any) => ({
      key: safeStr(col.key ?? ""),
      label: safeStr(col.label ?? col.key ?? "")
    })),
    rows: (view.rows ?? []).map((row: any) => {
      const record: Record<string, string> = {};
      for (const key of Object.keys(row)) {
        record[key] = String(row[key] ?? "");
      }
      return record;
    })
  }));
};

/** runtime.tab → 指定 tab 的完整数据 */
export function serializeTab(
  appScope: Record<string, any>,
  tab: string
): V1Result<TabData> {
  try {
    if (noActiveModel(appScope)) return errNoActive();
    if (tab === "model") {
      return {
        ok: true,
        data: {
          tab: "model",
          title: safeStr(appScope.activeModelName),
          rows: buildModelRows(appScope)
        }
      } as V1Result<TabData>;
    }
    if (tab === "tree") {
      return {
        ok: true,
        data: {
          tab: "tree",
          title: "图元树",
          tree: { nodes: buildTreeNodes(appScope) }
        }
      } as V1Result<TabData>;
    }
    if (tab === "graph") {
      const node = appScope.inspectorSelectedNode;
      const insTab = appScope.inspectorTab;
      const subView: "graph" | "device" = insTab === "device" ? "device" : "graph";
      const rows = buildGraphRows(appScope);
      const deviceParams = subView === "device" && appScope.singleSelectedDeviceForInspector
        ? buildDeviceParams(appScope)
        : undefined;
      return {
        ok: true,
        data: {
          tab: "graph",
          title: node ? safeStr(node.name) : "未选中",
          rows,
          subView,
          ...(deviceParams ? { deviceParams } : {})
        }
      } as V1Result<TabData>;
    }
    return errBadRequest(`未知 tab: ${tab}`);
  } catch (e) {
    return errInternal(e);
  }
}

/** runtime.snapshot → 三 tab 聚合 + model + devices + selection */
export function serializeSnapshot(appScope: Record<string, any>): V1Result<{
  model: any;
  devices: any;
  selection: any;
  tabs: {
    model: TabData;
    tree: TabData;
    graph: TabData;
  };
}> {
  return wrap(() => {
    if (noActiveModel(appScope)) return errNoActive();
    const modelResult = serializeModel(appScope);
    const devicesResult = serializeDevices(appScope);
    const selectionResult = serializeSelection(appScope);
    const modelTab = serializeTab(appScope, "model");
    const treeTab = serializeTab(appScope, "tree");
    const graphTab = serializeTab(appScope, "graph");
    return {
      ok: true,
      data: {
        model: modelResult.ok ? modelResult.data : null,
        devices: devicesResult.ok ? devicesResult.data : null,
        selection: selectionResult.ok ? selectionResult.data : null,
        tabs: {
          model: modelTab.ok ? modelTab.data : ({} as TabData),
          tree: treeTab.ok ? treeTab.data : ({} as TabData),
          graph: graphTab.ok ? graphTab.data : ({} as TabData)
        }
      }
    };
  });
}

/** runtime.svg → SVG 字符串（优先 buildSvgDocument 自包含输出，回退 svgRef 序列化） */
export function serializeSvg(appScope: Record<string, any>): V1Result<string> {
  return wrap(() => {
    if (noActiveModel(appScope)) return errNoActive();
    // 优先 buildSvgDocument：与「导出 SVG」按钮一致，内联样式、自包含、不依赖外部 CSS。
    // svgRef 序列化会带 class 名但丢失外部样式表，独立查看时样式全失。
    const buildSvgDoc = appScope.buildSvgDocument;
    const nodes = appScope.nodes ?? [];
    const edges = appScope.edges ?? [];
    const cb = appScope.canvasBounds ?? {};
    if (typeof buildSvgDoc === "function") {
      const svgStr = buildSvgDoc(nodes, edges, {
        width: cb.width ?? 800,
        height: cb.height ?? 600,
        backgroundColor: appScope.canvasBackgroundColor,
        backgroundImage: appScope.canvasBackgroundImageUrl,
        colorDisplayMode: appScope.colorDisplayMode,
        colorPalette: appScope.colorPalette,
        deviceTemplates: appScope.libraryTemplates,
        layers: appScope.layers,
        activeLayerId: appScope.activeLayerId,
        backgroundPage: appScope.backgroundPageRender,
        measurements: appScope.projectMeasurements,
        measurementConfig: appScope.measurementConfig
      });
      return { ok: true, data: String(svgStr) };
    }
    // 回退：svgRef 序列化（移除背景元素，避免黑底）
    const svgRef = appScope.svgRef;
    if (svgRef?.current && typeof XMLSerializer !== "undefined") {
      const clone = svgRef.current.cloneNode(true) as SVGSVGElement;
      clone.querySelectorAll("[data-canvas-background]").forEach((el) => el.remove());
      const svgStr = new XMLSerializer().serializeToString(clone);
      if (svgStr) return { ok: true, data: svgStr };
    }
    return { ok: false, error: { code: "internal", message: "无法序列化 SVG" } };
  });
}

/** runtime.e-file → E 文件文本 */
export function serializeEFile(appScope: Record<string, any>): V1Result<{
  filename: string;
  text: string;
  mime: string;
}> {
  return wrap(() => {
    if (noActiveModel(appScope)) return errNoActive();
    const currentProject = appScope.currentProject;
    const buildEFile = appScope.buildEFileExport;
    if (typeof currentProject !== "function") {
      return { ok: false, error: { code: "internal", message: "currentProject 不可用" } };
    }
    if (typeof buildEFile !== "function") {
      return { ok: false, error: { code: "internal", message: "buildEFileExport 不可用" } };
    }
    const project = currentProject();
    const schemePath = typeof appScope.schemePathForScheme === "function"
      ? appScope.schemePathForScheme(appScope.activeSchemeKey)
      : [];
    const file = buildEFile(
      project,
      Array.isArray(schemePath) && schemePath.length > 0 ? schemePath : ["默认方案"]
    );
    return {
      ok: true,
      data: {
        filename: safeStr(file.filename),
        text: safeStr(file.text),
        mime: safeStr(file.mime)
      }
    };
  });
}

// ---- 工厂：createRuntimeSnapshotHandler ----

/**
 * 创建 runtime snapshot fetch handler
 * @param appScope __appScope 对象（Record<string, any>）
 * @returns (resource, params) => Promise<V1Result>
 */
export function createRuntimeSnapshotHandler(appScope: Record<string, any>) {
  return async (
    resource: RuntimeSnapshotResource,
    params?: Record<string, any>
  ): Promise<V1Result<any>> => {
    try {
      switch (resource) {
        case "runtime.snapshot":
          return serializeSnapshot(appScope);
        case "runtime.tab":
          return serializeTab(appScope, params?.tab ?? "model");
        case "runtime.selection":
          return serializeSelection(appScope);
        case "runtime.model":
          return serializeModel(appScope);
        case "runtime.devices":
          return serializeDevices(appScope);
        case "runtime.e-file":
          return serializeEFile(appScope);
        case "runtime.svg":
          return serializeSvg(appScope);
        default:
          return errBadRequest(`未知 resource: ${resource}`);
      }
    } catch (e) {
      return errInternal(e);
    }
  };
}
