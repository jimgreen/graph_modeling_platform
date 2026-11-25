export const INTERFACE_CUSTOMIZATION_SCHEMA_VERSION = 1 as const;

export type InterfaceCustomizationItemKind = "button" | "module";

export type InterfaceCustomizationDefinition = {
  id: string;
  kind: InterfaceCustomizationItemKind;
  label: string;
  group: string;
  defaultVisible: boolean;
};

export type InterfaceCustomizationConfig = {
  schemaVersion: typeof INTERFACE_CUSTOMIZATION_SCHEMA_VERSION;
  buttons: Record<string, boolean>;
  modules: Record<string, boolean>;
  savedAt?: string;
};

const buttonDefinitions: InterfaceCustomizationDefinition[] = [
  { id: "topbar.brand", kind: "button", label: "平台品牌与标题", group: "顶栏固定区", defaultVisible: true },
  { id: "topbar.activeModel", kind: "button", label: "当前模型标题", group: "顶栏固定区", defaultVisible: true },
  { id: "topbar.template", kind: "button", label: "当前模板标题", group: "顶栏固定区", defaultVisible: true },
  { id: "topbar.spaceSwitcher", kind: "button", label: "空间选择器", group: "顶栏固定区", defaultVisible: true },
  { id: "topbar.interfaceCustomization", kind: "button", label: "界面定制设置入口", group: "顶栏固定区", defaultVisible: true },
  { id: "topbar.runtimeWs", kind: "button", label: "RT-WS 状态指示灯", group: "顶栏固定区", defaultVisible: true },
  { id: "topbar.spaceExport", kind: "button", label: "导出空间", group: "空间", defaultVisible: true },
  { id: "topbar.spaceImport", kind: "button", label: "导入空间", group: "空间", defaultVisible: true },
  { id: "topbar.spaceRename", kind: "button", label: "重命名空间", group: "空间", defaultVisible: true },
  { id: "topbar.spaceDelete", kind: "button", label: "删除空间", group: "空间", defaultVisible: true },
  { id: "topbar.layerManagement", kind: "button", label: "图层管理", group: "拓扑与图层", defaultVisible: true },
  { id: "topbar.undo", kind: "button", label: "撤销", group: "拓扑与图层", defaultVisible: true },
  { id: "topbar.redo", kind: "button", label: "重做", group: "拓扑与图层", defaultVisible: true },
  { id: "topbar.smartAlignment", kind: "button", label: "对齐标线", group: "拓扑与图层", defaultVisible: true },
  { id: "topbar.topology", kind: "button", label: "图上拓扑", group: "拓扑与图层", defaultVisible: true },
  { id: "topbar.globalLines", kind: "button", label: "全局线路", group: "拓扑与图层", defaultVisible: true },
  { id: "topbar.allNetworkTopology", kind: "button", label: "全网拓扑", group: "拓扑与图层", defaultVisible: true },
  { id: "topbar.topologyWarning", kind: "button", label: "拓扑告警", group: "拓扑与图层", defaultVisible: true },
  { id: "topbar.colorMode", kind: "button", label: "颜色切换", group: "显示与配色", defaultVisible: true },
  { id: "topbar.colorPalette", kind: "button", label: "配色设置", group: "显示与配色", defaultVisible: true },
  { id: "topbar.voltageLevel", kind: "button", label: "电压等级设置", group: "显示与配色", defaultVisible: true },
  { id: "topbar.deviceLabels", kind: "button", label: "设备标识", group: "显示与配色", defaultVisible: true },
  { id: "topbar.deviceMeasurements", kind: "button", label: "设备量测", group: "显示与配色", defaultVisible: true },
  { id: "topbar.electricFlow", kind: "button", label: "电流流水线", group: "显示与配色", defaultVisible: true },
  { id: "topbar.electricFlowSettings", kind: "button", label: "电流流水线设置", group: "显示与配色", defaultVisible: true },
  { id: "topbar.imageLibrary", kind: "button", label: "分类图标库", group: "资源与导出", defaultVisible: true },
  { id: "topbar.userCustomization", kind: "button", label: "用户自定义修改管理", group: "资源与导出", defaultVisible: true },
  { id: "topbar.save", kind: "button", label: "保存", group: "资源与导出", defaultVisible: true },
  { id: "topbar.eInterface", kind: "button", label: "E 文件接口定义", group: "资源与导出", defaultVisible: true },
  { id: "topbar.export", kind: "button", label: "导出文件", group: "资源与导出", defaultVisible: true },
  { id: "topbar.sendModel", kind: "button", label: "发送模型", group: "资源与导出", defaultVisible: true },
  { id: "topbar.tour", kind: "button", label: "新手引导", group: "辅助", defaultVisible: true },
  { id: "topbar.theme", kind: "button", label: "主题切换", group: "辅助", defaultVisible: true },
  { id: "selection.group", kind: "button", label: "组合操作", group: "选中操作", defaultVisible: true },
  { id: "selection.displayLayer", kind: "button", label: "显示层级", group: "选中操作", defaultVisible: true },
  { id: "selection.align", kind: "button", label: "对齐操作", group: "选中操作", defaultVisible: true },
  { id: "selection.rotate", kind: "button", label: "旋转与镜像", group: "选中操作", defaultVisible: true }
];

const moduleDefinitions: InterfaceCustomizationDefinition[] = [
  { id: "module.leftPanel", kind: "module", label: "左侧资源面板", group: "页面模块", defaultVisible: true },
  { id: "module.leftPanel.modeControls", kind: "module", label: "左侧面板模式切换", group: "左侧面板内容", defaultVisible: true },
  { id: "module.leftPanel.modelLibrary", kind: "module", label: "模型库标签与内容", group: "左侧面板内容", defaultVisible: true },
  { id: "module.leftPanel.deviceLibrary", kind: "module", label: "图元库标签与内容", group: "左侧面板内容", defaultVisible: true },
  { id: "module.leftPanel.templateLibrary", kind: "module", label: "模板库标签与内容", group: "左侧面板内容", defaultVisible: true },
  { id: "module.leftPanel.embeddedInspector", kind: "module", label: "窄屏嵌入式属性面板", group: "左侧面板内容", defaultVisible: true },
  { id: "module.leftPanel.schemeId", kind: "module", label: "方案 ID 信息", group: "左侧面板内容", defaultVisible: true },
  { id: "module.leftPanel.modelId", kind: "module", label: "模型 ID 信息", group: "左侧面板内容", defaultVisible: true },
  { id: "module.rightPanel", kind: "module", label: "右侧属性面板", group: "页面模块", defaultVisible: true },
  { id: "module.rightPanel.modeControls", kind: "module", label: "右侧面板模式切换", group: "右侧面板内容", defaultVisible: true },
  { id: "module.rightPanel.baseTab", kind: "module", label: "基础标签与内容", group: "右侧面板内容", defaultVisible: true },
  { id: "module.rightPanel.elementTreeTab", kind: "module", label: "图元树标签与内容", group: "右侧面板内容", defaultVisible: true },
  { id: "module.rightPanel.graphTab", kind: "module", label: "图元标签与内容", group: "右侧面板内容", defaultVisible: true },
  { id: "module.rightPanel.graphGraphics", kind: "module", label: "图形属性子标签", group: "右侧面板内容", defaultVisible: true },
  { id: "module.rightPanel.graphModel", kind: "module", label: "图元模型属性子标签", group: "右侧面板内容", defaultVisible: true },
  { id: "module.rightPanel.graphMeasurement", kind: "module", label: "图元量测属性子标签", group: "右侧面板内容", defaultVisible: true },
  { id: "module.rightPanel.graphBatch", kind: "module", label: "共同属性批量编辑", group: "右侧面板内容", defaultVisible: true },
  { id: "module.rightPanel.baseModelInfo", kind: "module", label: "基础模型信息", group: "右侧面板内容", defaultVisible: true },
  { id: "module.rightPanel.baseCanvasSettings", kind: "module", label: "基础画布设置", group: "右侧面板内容", defaultVisible: true },
  { id: "module.rightPanel.baseBackgroundSettings", kind: "module", label: "基础背景页面设置", group: "右侧面板内容", defaultVisible: true },
  { id: "module.rightPanel.deviceModel", kind: "module", label: "设备模型参数", group: "右侧面板内容", defaultVisible: true },
  { id: "module.rightPanel.deviceMeasurement", kind: "module", label: "设备量测参数", group: "右侧面板内容", defaultVisible: true },
  { id: "module.recentGlyphs", kind: "module", label: "最近使用图元栏", group: "页面模块", defaultVisible: true },
  { id: "module.canvas", kind: "module", label: "建模画布", group: "页面模块", defaultVisible: true },
  { id: "module.selectionActions", kind: "module", label: "画布快捷工具栏", group: "页面模块", defaultVisible: true },
  { id: "module.statusbar", kind: "module", label: "底部状态栏", group: "页面模块", defaultVisible: true },
  { id: "module.topologyWarning", kind: "module", label: "拓扑告警面板", group: "页面模块", defaultVisible: true }
];

export const INTERFACE_CUSTOMIZATION_DEFINITIONS = Object.freeze([
  ...buttonDefinitions,
  ...moduleDefinitions
]);

const BUTTON_DEFINITIONS = Object.freeze([...buttonDefinitions]);
const MODULE_DEFINITIONS = Object.freeze([...moduleDefinitions]);

/** $O(1)$ 定义索引：避免每次渲染调用 isInterfaceCustomizationVisible 时线性遍历 60+ 项 */
const DEFINITION_BY_ID = new Map<string, InterfaceCustomizationDefinition>(
  INTERFACE_CUSTOMIZATION_DEFINITIONS.map((definition) => [definition.id, definition])
);

/** 受保护项：避免用户在弹窗内一键“全部隐藏”时把自己锁死在空白界面外 */
export const PROTECTED_INTERFACE_CUSTOMIZATION_IDS: ReadonlySet<string> = new Set([
  "topbar.interfaceCustomization"
]);

export function isProtectedInterfaceCustomizationId(id: string): boolean {
  return PROTECTED_INTERFACE_CUSTOMIZATION_IDS.has(id);
}

/** 构造「全部隐藏」配置：保留受保护入口可见，防止无法再次打开设置恢复界面。 */
export function buildHideAllInterfaceCustomizationConfig(): InterfaceCustomizationConfig {
  return {
    schemaVersion: INTERFACE_CUSTOMIZATION_SCHEMA_VERSION,
    buttons: Object.fromEntries(
      BUTTON_DEFINITIONS.map((item) => [item.id, isProtectedInterfaceCustomizationId(item.id)])
    ),
    modules: Object.fromEntries(
      MODULE_DEFINITIONS.map((item) => [item.id, isProtectedInterfaceCustomizationId(item.id)])
    )
  };
}

function visibilityMap(kind: InterfaceCustomizationItemKind): Record<string, boolean> {
  const list = kind === "button" ? BUTTON_DEFINITIONS : MODULE_DEFINITIONS;
  return Object.fromEntries(list.map((definition) => [definition.id, definition.defaultVisible]));
}

export function defaultInterfaceCustomizationConfig(): InterfaceCustomizationConfig {
  return {
    schemaVersion: INTERFACE_CUSTOMIZATION_SCHEMA_VERSION,
    buttons: visibilityMap("button"),
    modules: visibilityMap("module")
  };
}

export const DEFAULT_INTERFACE_CUSTOMIZATION_CONFIG = defaultInterfaceCustomizationConfig();

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizedVisibilityMap(value: unknown, kind: InterfaceCustomizationItemKind): Record<string, boolean> {
  const source = isRecord(value) ? value : {};
  const defaults = visibilityMap(kind);
  const list = kind === "button" ? BUTTON_DEFINITIONS : MODULE_DEFINITIONS;
  for (const definition of list) {
    if (!Object.hasOwn(source, definition.id)) continue;
    const visible = source[definition.id];
    if (typeof visible === "boolean") {
      defaults[definition.id] = visible;
    }
  }
  return defaults;
}

export function normalizeInterfaceCustomizationConfig(value: unknown): InterfaceCustomizationConfig {
  const source = isRecord(value) ? value : {};
  return {
    schemaVersion: INTERFACE_CUSTOMIZATION_SCHEMA_VERSION,
    buttons: normalizedVisibilityMap(source.buttons, "button"),
    modules: normalizedVisibilityMap(source.modules, "module"),
    ...(typeof source.savedAt === "string" && source.savedAt.trim() ? { savedAt: source.savedAt } : {})
  };
}

export function isInterfaceCustomizationVisible(
  config: InterfaceCustomizationConfig | null | undefined,
  id: string
): boolean {
  const definition = DEFINITION_BY_ID.get(id);
  if (!definition) return true;
  const source = definition.kind === "button" ? config?.buttons : config?.modules;
  return typeof source?.[id] === "boolean" ? source[id] : definition.defaultVisible;
}

export function interfaceCustomizationDefinitions(kind?: InterfaceCustomizationItemKind) {
  if (kind === "button") return BUTTON_DEFINITIONS;
  if (kind === "module") return MODULE_DEFINITIONS;
  return INTERFACE_CUSTOMIZATION_DEFINITIONS;
}

const DOM_SELECTORS: Record<string, string> = {
  "topbar.brand": "#topbar-brand",
  "topbar.activeModel": "#topbar-active-model",
  "topbar.template": "#topbar-template",
  "topbar.spaceSwitcher": "#topbar-space-switcher",
  "topbar.interfaceCustomization": "#topbar-interface-customization",
  "topbar.runtimeWs": "#topbar-runtime-ws",
  "module.leftPanel": ".library-panel",
  "module.leftPanel.modeControls": "[data-ui-content=\"module.leftPanel.modeControls\"]",
  "module.leftPanel.modelLibrary": "[data-ui-content=\"module.leftPanel.modelLibrary\"]",
  "module.leftPanel.deviceLibrary": "[data-ui-content=\"module.leftPanel.deviceLibrary\"]",
  "module.leftPanel.templateLibrary": "[data-ui-content=\"module.leftPanel.templateLibrary\"]",
  "module.leftPanel.embeddedInspector": "[data-ui-content=\"module.leftPanel.embeddedInspector\"]",
  "module.leftPanel.schemeId": "[data-ui-content=\"module.leftPanel.schemeId\"]",
  "module.leftPanel.modelId": "[data-ui-content=\"module.leftPanel.modelId\"]",
  "module.rightPanel": ".inspector-panel, .embedded-inspector-panel",
  "module.rightPanel.modeControls": "[data-ui-content=\"module.rightPanel.modeControls\"]",
  "module.rightPanel.baseTab": "[data-ui-content=\"module.rightPanel.baseTab\"], [data-ui-content=\"module.rightPanel.baseContent\"]",
  "module.rightPanel.elementTreeTab": "[data-ui-content=\"module.rightPanel.elementTreeTab\"]",
  "module.rightPanel.graphTab": "[data-ui-content=\"module.rightPanel.graphTab\"]",
  "module.rightPanel.graphGraphics": "[data-ui-content=\"module.rightPanel.graphGraphics\"]",
  "module.rightPanel.graphModel": "[data-ui-content=\"module.rightPanel.graphModel\"]",
  "module.rightPanel.graphMeasurement": "[data-ui-content=\"module.rightPanel.graphMeasurement\"]",
  "module.rightPanel.graphBatch": "[data-ui-content=\"module.rightPanel.graphBatch\"]",
  "module.rightPanel.baseModelInfo": "[data-ui-content=\"module.rightPanel.baseModelInfo\"]",
  "module.rightPanel.baseCanvasSettings": "[data-ui-content=\"module.rightPanel.baseCanvasSettings\"]",
  "module.rightPanel.baseBackgroundSettings": "[data-ui-content=\"module.rightPanel.baseBackgroundSettings\"]",
  "module.rightPanel.deviceModel": "[data-ui-content=\"module.rightPanel.deviceModel\"]",
  "module.rightPanel.deviceMeasurement": "[data-ui-content=\"module.rightPanel.deviceMeasurement\"]",
  "module.recentGlyphs": ".recent-glyphs-toolbar",
  "module.canvas": ".canvas-frame",
  "module.selectionActions": ".viewport-controls .action-cluster",
  "module.statusbar": ".bottom-statusbar",
  "module.topologyWarning": ".topology-warning-floating-panel",
  "topbar.spaceExport": ".topbar-space-actions > button:nth-child(1), .topbar-space-actions-compact [aria-label=\"导出空间\"]",
  "topbar.spaceImport": ".topbar-space-actions > button:nth-child(2), .topbar-space-actions-compact [aria-label=\"导入空间\"]",
  "topbar.spaceRename": ".topbar-space-actions > button:nth-child(3), .topbar-space-actions-compact [aria-label=\"重命名空间\"]",
  "topbar.spaceDelete": ".topbar-space-actions > button:nth-child(4), .topbar-space-actions-compact [aria-label=\"删除空间\"]",
  "topbar.layerManagement": "#topbar-layer-management",
  "topbar.undo": "#topbar-undo",
  "topbar.redo": "#topbar-redo",
  "topbar.smartAlignment": "#topbar-smart-alignment, #topbar-compact-smart-alignment",
  "topbar.topology": "#topbar-topology, #topbar-compact-topology",
  "topbar.globalLines": "#topbar-global-lines, #topbar-compact-global-lines",
  "topbar.allNetworkTopology": "#topbar-all-network-topology, #topbar-compact-all-network-topology",
  "topbar.topologyWarning": "#topbar-topology-warning, #topbar-compact-topology-warning",
  "topbar.colorMode": "#topbar-color-mode, #topbar-compact-color-mode",
  "topbar.colorPalette": "#topbar-color-palette, #topbar-compact-color-palette",
  "topbar.voltageLevel": "#topbar-voltage-level, #topbar-compact-voltage-level",
  "topbar.deviceLabels": "#topbar-device-labels, #topbar-compact-device-labels",
  "topbar.deviceMeasurements": "#topbar-device-measurements, #topbar-compact-device-measurements",
  "topbar.electricFlow": "#topbar-electric-flow, #topbar-compact-electric-flow",
  "topbar.electricFlowSettings": "#topbar-electric-flow-settings, #topbar-compact-electric-flow-settings",
  "topbar.imageLibrary": "#topbar-image-library, #topbar-compact-image-library",
  "topbar.userCustomization": "#topbar-user-customization",
  "topbar.save": "#topbar-save",
  "topbar.eInterface": "#topbar-e-interface-definition",
  "topbar.export": "#topbar-export",
  "topbar.sendModel": "#topbar-send-model",
  "topbar.tour": "#topbar-tour",
  "topbar.theme": "#topbar-theme-toggle",
  "selection.group": "#topbar-group",
  "selection.displayLayer": "#topbar-display-layer",
  "selection.align": "#topbar-align",
  "selection.rotate": "#topbar-rotate"
};

export function interfaceCustomizationCss(config: InterfaceCustomizationConfig | null | undefined): string {
  const hidden = INTERFACE_CUSTOMIZATION_DEFINITIONS
    .filter((definition) => !isInterfaceCustomizationVisible(config, definition.id))
    .map((definition) => DOM_SELECTORS[definition.id])
    .filter(Boolean);
  return hidden.length ? `${hidden.join(",")} { display: none !important; }` : "";
}
