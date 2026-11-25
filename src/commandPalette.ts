/**
 * 全局快捷命令面板（Ctrl+K）数据聚合与检索匹配引擎
 *
 * 纯逻辑模块，与 UI 组件解耦，便于单元测试与后续扩展：
 * - 命令（command）：高频建模、视图、主题与导出操作
 * - 画布图元（node）：在当前模型中按名称 / ID / idx / 类型秒级定位并居中选中
 * - 方案模型（model）：在已保存方案树中快速切换模型
 * - 图元模板（template）：从图元库快速激活放置模式
 */
import type { ModelNode } from "./model";

export type CommandPaletteCategory = "all" | "command" | "node" | "model" | "template";

export interface CommandPaletteItem {
  id: string;
  category: Exclude<CommandPaletteCategory, "all">;
  title: string;
  subtitle?: string;
  shortcut?: string;
  keywords: string;
  disabled?: boolean;
  execute: (scope: Record<string, any>) => void;
}

export interface ShortcutHelpEntry {
  keys: string[];
  label: string;
}

export interface ShortcutHelpGroup {
  id: string;
  title: string;
  items: ShortcutHelpEntry[];
}

/** 结构化快捷键速查表（均对应平台真实生效快捷键） */
export const KEYBOARD_SHORTCUT_GROUPS: readonly ShortcutHelpGroup[] = [
  {
    id: "global",
    title: "全局与文件",
    items: [
      { keys: ["Ctrl", "K"], label: "打开命令 / 图元 / 模型速查面板" },
      { keys: ["?"], label: "打开快捷键速查表（或 Ctrl + /）" },
      { keys: ["Ctrl", "S"], label: "保存当前模型" },
      { keys: ["Ctrl", "Z"], label: "撤销上一步操作" },
      { keys: ["Ctrl", "Y"], label: "重做（或 Ctrl + Shift + Z）" }
    ]
  },
  {
    id: "selection",
    title: "选区与编辑",
    items: [
      { keys: ["Ctrl", "A"], label: "全选当前图层图元" },
      { keys: ["Ctrl", "C"], label: "复制选中图元 / 方案记录" },
      { keys: ["Ctrl", "X"], label: "剪切选中图元" },
      { keys: ["Ctrl", "V"], label: "粘贴" },
      { keys: ["Delete"], label: "删除选中图元 / 连线" },
      { keys: ["↑", "↓", "←", "→"], label: "微调选中图元位置" }
    ]
  },
  {
    id: "canvas",
    title: "画布与连线",
    items: [
      { keys: ["Esc"], label: "取消当前连线 / 放置 / 静态绘制" },
      { keys: ["Enter"], label: "完成当前折线 / 静态图形绘制" },
      { keys: ["Ctrl"], label: "连线拖动时锁定水平 / 垂直轴向" },
      { keys: ["双击空白"], label: "适配整张画布到视口" },
      { keys: ["滚轮"], label: "以光标为中心缩放画布" },
      { keys: ["拖拽空白"], label: "平移画布视口" }
    ]
  }
];

interface FlattenedSchemeModel {
  schemeId: string;
  schemePathLabel: string;
  project: any;
}

function collectSchemeModels(schemes: readonly any[] | undefined, parentPath: string[] = []): FlattenedSchemeModel[] {
  if (!Array.isArray(schemes) || schemes.length === 0) {
    return [];
  }
  const collected: FlattenedSchemeModel[] = [];
  for (const scheme of schemes) {
    if (!scheme || typeof scheme !== "object") {
      continue;
    }
    const schemeName = String(scheme.name ?? "未命名方案");
    const nextPath = [...parentPath, schemeName];
    const pathLabel = nextPath.join(" / ");
    const projects = Array.isArray(scheme.projects) ? scheme.projects : [];
    for (const project of projects) {
      if (!project || typeof project !== "object") {
        continue;
      }
      collected.push({
        schemeId: String(scheme.id ?? ""),
        schemePathLabel: pathLabel,
        project
      });
    }
    if (Array.isArray(scheme.children) && scheme.children.length > 0) {
      collected.push(...collectSchemeModels(scheme.children, nextPath));
    }
  }
  return collected;
}

function resolveLatestScope(scope: Record<string, any>): Record<string, any> {
  return (scope?.__appScopeRef?.current as Record<string, any> | undefined) ?? scope;
}

/**
 * 基于当前 __appScope 聚合命令面板可选条目。
 */
export function buildCommandPaletteItems(scope: Record<string, any>): CommandPaletteItem[] {
  const latest = resolveLatestScope(scope);
  const hasActiveModel = Boolean(latest.hasActiveModel ?? latest.activeProjectKey);
  const canUndo = hasActiveModel && Array.isArray(latest.undoStack) && latest.undoStack.length > 0;
  const canRedo = hasActiveModel && Array.isArray(latest.redoStack) && latest.redoStack.length > 0;
  const themeLabel = latest.themeMode === "dark" ? "浅色" : "深色";
  const minimapLabel = latest.minimapVisible ? "隐藏小地图" : "显示小地图";
  const flowLabel = latest.electricFlowVisible ? "关闭电流流水线" : "开启电流流水线";
  const alignGuideLabel = latest.smartAlignmentEnabled ? "关闭智能对齐标线" : "开启智能对齐标线";

  const commands: CommandPaletteItem[] = [
    {
      id: "cmd:save",
      category: "command",
      title: "保存当前模型",
      subtitle: "将当前模型写入方案存储",
      shortcut: "Ctrl+S",
      keywords: "save baocun 保存 模型",
      disabled: !hasActiveModel,
      execute: (s) => {
        void resolveLatestScope(s).saveCurrentProject?.();
      }
    },
    {
      id: "cmd:undo",
      category: "command",
      title: "撤销上一步",
      shortcut: "Ctrl+Z",
      keywords: "undo chexiao 撤销 回退",
      disabled: !canUndo,
      execute: (s) => {
        resolveLatestScope(s).undoLastOperation?.();
      }
    },
    {
      id: "cmd:redo",
      category: "command",
      title: "重做",
      shortcut: "Ctrl+Y",
      keywords: "redo chongzuo 重做 恢复",
      disabled: !canRedo,
      execute: (s) => {
        resolveLatestScope(s).redoLastOperation?.();
      }
    },
    {
      id: "cmd:fit-canvas",
      category: "command",
      title: "适配整张画布到视口",
      keywords: "fit zoom view shipei 适配 视图 缩放",
      disabled: !hasActiveModel,
      execute: (s) => {
        resolveLatestScope(s).fitWholeCanvasToFrame?.();
      }
    },
    {
      id: "cmd:reset-zoom",
      category: "command",
      title: "重置画布缩放（100%）",
      keywords: "zoom reset 100 chongzhi 重置 缩放",
      disabled: !hasActiveModel,
      execute: (s) => {
        resolveLatestScope(s).resetViewportZoom?.();
      }
    },
    {
      id: "cmd:center-selected",
      category: "command",
      title: "居中显示当前选中图元",
      keywords: "center focus select juzhong 居中 定位",
      disabled: !hasActiveModel || Boolean(latest.selectedViewportActionDisabled),
      execute: (s) => {
        resolveLatestScope(s).centerSelectedInView?.();
      }
    },
    {
      id: "cmd:shrink-canvas",
      category: "command",
      title: "收紧画布边界以贴合图元",
      keywords: "shrink canvas boundary shoujin 收紧 画布",
      disabled: !hasActiveModel,
      execute: (s) => {
        resolveLatestScope(s).shrinkCanvasToFitContent?.();
      }
    },
    {
      id: "cmd:auto-align",
      category: "command",
      title: "自动网格对齐画布图元",
      keywords: "auto align grid duiqi 自动 对齐 排版",
      disabled: !hasActiveModel,
      execute: (s) => {
        void resolveLatestScope(s).autoAlignCanvasGraphics?.();
      }
    },
    {
      id: "cmd:toggle-theme",
      category: "command",
      title: `切换为${themeLabel}主题`,
      keywords: "theme dark light zhuti 主题 暗黑 明亮 深色 浅色",
      execute: (s) => {
        resolveLatestScope(s).toggleThemeMode?.();
      }
    },
    {
      id: "cmd:toggle-minimap",
      category: "command",
      title: minimapLabel,
      keywords: "minimap bird eye xiaoditu 小地图 鸟瞰",
      disabled: !hasActiveModel,
      execute: (s) => {
        resolveLatestScope(s).setMinimapVisible?.((cur: boolean) => !cur);
      }
    },
    {
      id: "cmd:toggle-electric-flow",
      category: "command",
      title: flowLabel,
      keywords: "electric flow arrow dianliu 电流 流水线 方向",
      disabled: !hasActiveModel,
      execute: (s) => {
        resolveLatestScope(s).setElectricFlowVisible?.((cur: boolean) => !cur);
      }
    },
    {
      id: "cmd:toggle-smart-alignment",
      category: "command",
      title: alignGuideLabel,
      keywords: "smart alignment guide biaoxian 标线 对齐 参考线",
      disabled: !hasActiveModel,
      execute: (s) => {
        resolveLatestScope(s).setSmartAlignmentEnabled?.((cur: boolean) => !cur);
      }
    },
    {
      id: "cmd:export-svg",
      category: "command",
      title: "导出当前模型为 SVG",
      keywords: "export svg daochu 导出 矢量图",
      disabled: !hasActiveModel,
      execute: (s) => {
        const cur = resolveLatestScope(s);
        (cur.exportSvgFile ?? cur.exportSvg)?.();
      }
    },
    {
      id: "cmd:export-efile",
      category: "command",
      title: "导出当前模型为 E 格式文件",
      keywords: "export efile e-file daochu 导出 E文件",
      disabled: !hasActiveModel,
      execute: (s) => {
        resolveLatestScope(s).exportEFile?.();
      }
    },
    {
      id: "cmd:export-json",
      category: "command",
      title: "导出当前模型为 JSON",
      keywords: "export json daochu 导出",
      disabled: !hasActiveModel,
      execute: (s) => {
        resolveLatestScope(s).exportJsonFile?.();
      }
    },
    {
      id: "cmd:interface-customization",
      category: "command",
      title: "打开界面元素定制",
      keywords: "interface customization jiemian 界面 定制 隐藏",
      execute: (s) => {
        resolveLatestScope(s).setInterfaceCustomizationDialogOpen?.(true);
      }
    },
    {
      id: "cmd:color-palette",
      category: "command",
      title: "打开电压等级配色配置",
      keywords: "color palette peise 配色 电压 颜色",
      execute: (s) => {
        resolveLatestScope(s).openColorPaletteDialog?.();
      }
    },
    {
      id: "cmd:topology-warning",
      category: "command",
      title: "查看拓扑检查与警告面板",
      keywords: "topology warning error tuopu 拓扑 检查 警告",
      disabled: !hasActiveModel,
      execute: (s) => {
        resolveLatestScope(s).openTopologyWarningPanel?.();
      }
    }
  ];

  // 当前画布节点定位条目
  const nodeItems: CommandPaletteItem[] = [];
  if (hasActiveModel && Array.isArray(latest.nodes)) {
    for (const node of latest.nodes as ModelNode[]) {
      if (!node || typeof node !== "object" || !node.id) {
        continue;
      }
      const name = String(node.name || node.id);
      const kind = String(node.kind || "");
      const idx = node.params?.idx != null && node.params.idx !== "" ? `#${node.params.idx}` : "";
      const subtitle = [kind, idx, node.id !== name ? node.id : ""].filter(Boolean).join(" · ");
      nodeItems.push({
        id: `node:${node.id}`,
        category: "node",
        title: name,
        subtitle,
        keywords: `${name} ${kind} ${node.id} ${idx}`,
        execute: (s) => {
          const cur = resolveLatestScope(s);
          cur.selectCanvasGraphics?.([node.id], [], { scope: "direct" });
          if (node.position && typeof cur.centerViewOnPointAtZoom === "function") {
            cur.centerViewOnPointAtZoom(node.position, 100);
          } else {
            cur.centerSelectedInView?.();
          }
        }
      });
    }
  }

  // 方案树中的模型快速切换条目
  const modelItems: CommandPaletteItem[] = [];
  for (const entry of collectSchemeModels(latest.schemes)) {
    const projectName = String(entry.project.name || entry.project.id || "未命名模型");
    const projectId = String(entry.project.id || projectName);
    const isCurrent = Boolean(latest.activeProjectKey && latest.selectedProjectId === projectId);
    modelItems.push({
      id: `model:${entry.schemeId}:${projectId}`,
      category: "model",
      title: projectName,
      subtitle: isCurrent ? `${entry.schemePathLabel} · 当前打开` : entry.schemePathLabel,
      keywords: `${projectName} ${entry.schemePathLabel} ${projectId} 模型 方案`,
      execute: (s) => {
        const cur = resolveLatestScope(s);
        if (typeof cur.requestLoadSavedProject === "function") {
          cur.requestLoadSavedProject(entry.project, entry.schemeId);
        } else if (typeof cur.loadSavedProjectRecord === "function") {
          cur.loadSavedProjectRecord(entry.project, entry.schemeId);
        }
      }
    });
  }

  // 图元库模板快速进入放置模式
  const templateItems: CommandPaletteItem[] = [];
  if (hasActiveModel && Array.isArray(latest.libraryTemplates)) {
    for (const template of latest.libraryTemplates) {
      if (!template || typeof template !== "object" || !template.kind) {
        continue;
      }
      const label = String(template.name || template.label || template.kind);
      const kind = String(template.kind);
      const categoryName = String(template.category || template.group || "");
      templateItems.push({
        id: `template:${kind}`,
        category: "template",
        title: label,
        subtitle: [categoryName, kind].filter(Boolean).join(" · "),
        keywords: `${label} ${kind} ${categoryName} 放置 图元 模板`,
        execute: (s) => {
          const cur = resolveLatestScope(s);
          if (typeof cur.startLibraryPlacement === "function") {
            cur.startLibraryPlacement(kind);
          } else if (typeof cur.setLibraryPlacement === "function") {
            cur.setLibraryPlacement({ kind, previewPoint: cur.lastCanvasPointerRef?.current ?? null });
            cur.setMode?.("select");
          }
        }
      });
    }
  }

  return [...commands, ...nodeItems, ...modelItems, ...templateItems];
}

/**
 * 对条目按分类和关键词进行打分排序。
 * 优先级：标题精确前缀 > 标题包含 > 副标题/关键词包含 > 顺序字符子序列匹配。
 */
export function filterCommandPaletteItems(
  items: readonly CommandPaletteItem[],
  query: string,
  category: CommandPaletteCategory = "all",
  limit = 60
): CommandPaletteItem[] {
  const scoped = category === "all" ? items : items.filter((item) => item.category === category);
  const trimmed = String(query ?? "").trim().toLowerCase();
  if (!trimmed) {
    // 无查询词时：先展示常用命令与少量模型，避免成千上万节点刷屏
    if (category === "all") {
      const commands = scoped.filter((item) => item.category === "command");
      const models = scoped.filter((item) => item.category === "model").slice(0, 12);
      const nodes = scoped.filter((item) => item.category === "node").slice(0, 12);
      return [...commands, ...models, ...nodes].slice(0, limit);
    }
    return scoped.slice(0, limit);
  }

  const tokens = trimmed.split(/\s+/).filter(Boolean);
  const scored: Array<{ item: CommandPaletteItem; score: number }> = [];

  for (const item of scoped) {
    const titleLower = item.title.toLowerCase();
    const subtitleLower = (item.subtitle ?? "").toLowerCase();
    const haystack = `${titleLower} ${subtitleLower} ${item.keywords.toLowerCase()}`;

    let totalScore = 0;
    let matchedAll = true;
    for (const token of tokens) {
      if (titleLower === token) {
        totalScore += 120;
      } else if (titleLower.startsWith(token)) {
        totalScore += 80;
      } else if (titleLower.includes(token)) {
        totalScore += 50;
      } else if (subtitleLower.includes(token)) {
        totalScore += 30;
      } else if (haystack.includes(token)) {
        totalScore += 20;
      } else if (isSubsequence(token, titleLower)) {
        totalScore += 10;
      } else {
        matchedAll = false;
        break;
      }
    }

    if (matchedAll) {
      // 可用项优先于禁用项
      if (item.disabled) {
        totalScore -= 40;
      }
      scored.push({ item, score: totalScore });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((entry) => entry.item);
}

function isSubsequence(needle: string, haystack: string): boolean {
  let i = 0;
  for (let j = 0; j < haystack.length && i < needle.length; j += 1) {
    if (haystack[j] === needle[i]) {
      i += 1;
    }
  }
  return i === needle.length;
}
