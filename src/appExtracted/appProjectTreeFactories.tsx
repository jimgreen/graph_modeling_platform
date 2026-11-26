/**
 * 方案树/模型树拖拽排序、模型类型图标及节点渲染工厂模块。
 * 从 appDeviceDefinitionFactories.tsx 拆分，保持严格 TypeScript 类型检查。
 * 注意：GripVertical 图标直接在本模块导入，避免写入 appStaticScope 引发循环依赖。
 */

import type { ProjectTreeScope } from "./appScopeTypes";
import type { CSSProperties, DragEvent, MouseEvent, ReactNode } from "react";
import { MODEL_TYPE_META, type SavedProjectRecord, type SavedSchemeRecord } from "../model";
import { moveKeyToEdge, sortByKeyOrder, writeLibraryTreeOrder } from "../libraryTreeOrder";
import { GripVertical } from "lucide-react";

export function createStartProjectRecordDrag(__appScope: ProjectTreeScope) {
  return (event: DragEvent<HTMLDivElement>, projectId: string) => {
  const { projectRecordDragActiveRef } = __appScope;
    projectRecordDragActiveRef.current = true;
    event.dataTransfer.setData("application/project-id", projectId);
    event.dataTransfer.effectAllowed = "move";
  };
}

export function createFinishProjectRecordDrag(__appScope: ProjectTreeScope) {
  return () => {
  const { projectRecordDragActiveRef } = __appScope;
    projectRecordDragActiveRef.current = false;
  };
}

export function createStartSchemeRecordDrag(__appScope: ProjectTreeScope) {
  return (event: DragEvent<HTMLDivElement>, schemeId: string) => {
  const { schemeRecordDragActiveRef } = __appScope;
    schemeRecordDragActiveRef.current = true;
    event.dataTransfer.setData("application/scheme-id", schemeId);
    event.dataTransfer.effectAllowed = "move";
  };
}

export function createFinishSchemeRecordDrag(__appScope: ProjectTreeScope) {
  return () => {
  const { schemeRecordDragActiveRef } = __appScope;
    schemeRecordDragActiveRef.current = false;
  };
}

export function projectModelTypeIconName(modelType: unknown) {
  const t = typeof modelType === "string" ? modelType.trim() : "";
  return (MODEL_TYPE_META as Record<string, { color: string; icon: string }>)[t]?.icon ?? MODEL_TYPE_META["其他"].icon;
}

// ── 模型库方案树拖动排序（方案行 / 模型行）────────────────────────────────────
// 与图元库、模板库同口径：
//   · 行首把手拖动 = **唯一可拖入口**（行本体 draggable=false —— 祖先可拖会把把手的拖动顶掉）：
//     同层重排 = 顺序覆盖（只存本机偏好 libraryTreeOrder.projectSchemes / projectModels，
//     **不写回后端**）；跨层级移动 = 数据变更（改归属，落库）。
//   · 插入位提示同样是目标行上/下边缘的一条虚线直线（before / after）；
//     跨层级落在目标行上半区 = 成为其子方案（inside，浅蓝底提示）。
// 键设计：方案桶按「父方案 id」分桶（顶层用空串），模型桶按「所属方案 id」分桶。

export const PROJECT_TREE_DRAG_TYPE_SCHEME = "application/x-project-tree-scheme";

export const PROJECT_TREE_DRAG_TYPE_MODEL = "application/x-project-tree-model";

/** 方案列表的**末尾落点**（拖到列表空白处）= 移到顶层末尾。 */
export const PROJECT_TREE_ROOT_END_KEY = "__project-tree-root-end__";

function projectTreeDragDebug(label: string, payload: Record<string, unknown> = {}) {
  if (import.meta.env.DEV && typeof window !== "undefined") {
    const diagnosticWindow = window as typeof window & {
      __projectTreeDragLogs?: Array<{ at: number; label: string; payload: Record<string, unknown> }>;
    };
    const logs = diagnosticWindow.__projectTreeDragLogs ?? [];
    logs.push({ at: Date.now(), label, payload });
    diagnosticWindow.__projectTreeDragLogs = logs.slice(-100);
    console.info(`[project-tree-drag] ${label}`, payload);
  }
}

/**
 * 方案树拖拽键的逻辑层级。
 * 方案记录使用 `scheme:`，模型记录的运行期 id 使用 `project:`；`model:` 只保留作
 * 旧测试/旧调用方的兼容形态。后续落点计算统一使用逻辑层级，不能直接比较原始前缀。
 */
export function projectTreeDragLayer(key: string): "scheme" | "model" | "" {
  const normalizedKey = String(key ?? "");
  const prefix = normalizedKey.split(":")[0];
  if (prefix === "scheme") {
    return "scheme";
  }
  if (prefix === "project" || prefix === "model") {
    return "model";
  }
  // schemeId 统一后，方案运行时兼容键是数字字符串；模型键仍带 project:/model: 前缀。
  if (/^\d+$/u.test(normalizedKey)) {
    return "scheme";
  }
  return "";
}

/** 方案所在层级（父方案 id；顶层为空串）。 */
export function projectTreeParentKey(schemes: readonly any[], schemeId: string): string {
  const walk = (list: readonly any[], parentId: string): string | null => {
    for (const scheme of list) {
      if (scheme.id === schemeId) {
        return parentId;
      }
      const found = walk(scheme.children ?? [], scheme.id);
      if (found !== null) {
        return found;
      }
    }
    return null;
  };
  return walk(schemes ?? [], "") ?? "";
}

/** 某父方案下的方案 id 清单。 */
export function projectTreeSiblingIds(schemes: readonly any[], parentKey: string): string[] {
  if (parentKey === "") {
    return (schemes ?? []).map((scheme: any) => scheme.id);
  }
  const walk = (list: readonly any[]): any[] | null => {
    for (const scheme of list) {
      if (scheme.id === parentKey) {
        return scheme.children ?? [];
      }
      const found = walk(scheme.children ?? []);
      if (found) {
        return found;
      }
    }
    return null;
  };
  return (walk(schemes ?? []) ?? []).map((scheme: any) => scheme.id);
}

/** 某方案下的模型 id 清单。 */
export function projectTreeModelIds(schemes: readonly any[], schemeId: string): string[] {
  const walk = (list: readonly any[]): any[] | null => {
    for (const scheme of list) {
      if (scheme.id === schemeId) {
        return scheme.projects ?? [];
      }
      const found = walk(scheme.children ?? []);
      if (found) {
        return found;
      }
    }
    return null;
  };
  return (walk(schemes ?? []) ?? []).map((project: any) => project.id);
}

/**
 * 同级清单的**完整显示顺序** = 数据原始顺序 + 本机覆盖表重排。
 * 渲染（sortByKeyOrder）与落点结算（reorderKeys）必须用同一份清单 ——
 * 若结算用数据顺序、渲染用覆盖顺序，两套顺序一旦分叉，拖动就会「插错位置」
 * （表现为两项互换，而不是插入到虚线处）。
 */
export function projectTreeDisplayIds(
  ids: readonly string[],
  order: readonly string[]
): string[] {
  const rankById = new Map<string, number>();
  order.forEach((id, index) => {
    if (!rankById.has(id)) {
      rankById.set(id, index);
    }
  });
  return ids
    .map((id, index) => ({ id, index, rank: rankById.get(id) }))
    .sort((a, b) => {
      const rankA = a.rank ?? Number.MAX_SAFE_INTEGER;
      const rankB = b.rank ?? Number.MAX_SAFE_INTEGER;
      return rankA !== rankB ? rankA - rankB : a.index - b.index;
    })
    .map((entry) => entry.id);
}

/** 模型所属方案 id（模型桶键）；找不到返回空串。 */
export function projectTreeModelOwnerKey(schemes: readonly any[], modelId: string): string {
  const walk = (list: readonly any[]): string => {
    for (const scheme of list) {
      if ((scheme.projects ?? []).some((project: any) => project.id === modelId)) {
        return scheme.id;
      }
      const found = walk(scheme.children ?? []);
      if (found) {
        return found;
      }
    }
    return "";
  };
  return walk(schemes ?? []);
}

function projectTreeLayer(schemes: readonly any[], key: string): "scheme" | "model" | "" {
  const legacyPrefix = key.split(":", 1)[0];
  if (legacyPrefix === "scheme" || legacyPrefix === "model") {
    return legacyPrefix;
  }
  const walk = (list: readonly any[]): "scheme" | "model" | "" => {
    for (const scheme of list ?? []) {
      if (String(scheme?.schemeId ?? scheme?.id ?? "") === String(key)) {
        return "scheme";
      }
      if ((scheme?.projects ?? []).some((project: any) => String(project?.id ?? "") === String(key))) {
        return "model";
      }
      const nested = walk(scheme?.children ?? []);
      if (nested) {
        return nested;
      }
    }
    return "";
  };
  return walk(schemes ?? []);
}

/** 判断目标方案是否位于拖动方案的子树内，供 Tree 拖放循环保护使用。 */
export function projectTreeSchemeContainsId(
  schemes: readonly any[],
  ancestorId: string,
  targetId: string
): boolean {
  const normalizedAncestorId = String(ancestorId ?? "");
  const normalizedTargetId = String(targetId ?? "");
  if (!normalizedAncestorId || !normalizedTargetId) {
    return false;
  }
  if (normalizedAncestorId === normalizedTargetId) {
    return true;
  }
  const find = (list: readonly any[]): any | null => {
    for (const scheme of list ?? []) {
      if (String(scheme?.id ?? scheme?.schemeId ?? "") === normalizedAncestorId) {
        return scheme;
      }
      const nested = find(scheme?.children ?? []);
      if (nested) {
        return nested;
      }
    }
    return null;
  };
  const ancestor = find(schemes ?? []);
  if (!ancestor) {
    return false;
  }
  const contains = (list: readonly any[]): boolean =>
    (list ?? []).some((scheme) =>
      String(scheme?.id ?? scheme?.schemeId ?? "") === normalizedTargetId
      || contains(scheme?.children ?? [])
    );
  return contains(ancestor.children ?? []);
}

export function createStartProjectTreeSortDrag(__appScope: ProjectTreeScope) {
  return (event: DragEvent<HTMLSpanElement>, dragKey: string) => {
    const { projectTreeDragKeyRef, projectTreeDragSuppressClickRef, schemes, setProjectTreeDragKey } = __appScope;
    // 方案 id 带 "scheme:"，模型运行期 id 带 "project:"（兼容旧 "model:"），
    // 这里**不能再加前缀** —— 否则会出现 "scheme:scheme:xxx" 这样的双前缀，
    // 落点判定与顺序覆盖都对不上（拖动看起来毫无反应）。
    const layer = projectTreeLayer(schemes ?? [], dragKey);
    if (!layer) {
      projectTreeDragDebug("dragstart:ignored-layer", { dragKey });
      return;
    }
    clearProjectTreeDragExpandTimer(__appScope);
    // 方案行/模型行**本体**也是 draggable（既有跨方案移动通道）。当拖动从把手发起时，
    // 必须阻止本体通道接管，否则两条通道同时启动、dataTransfer 互相覆盖。
    const target = event.target as HTMLElement | null;
    if (!target?.closest?.(".project-tree-drag-handle")) {
      projectTreeDragDebug("dragstart:ignored-target", { dragKey, targetClass: target?.className ?? "" });
      return;
    }
    if (projectTreeDragSuppressClickRef) {
      projectTreeDragSuppressClickRef.current = true;
    }
    event.stopPropagation();
    event.dataTransfer.setData(layer === "model" ? PROJECT_TREE_DRAG_TYPE_MODEL : PROJECT_TREE_DRAG_TYPE_SCHEME, dragKey);
    event.dataTransfer.effectAllowed = "move";
    if (projectTreeDragKeyRef) {
      projectTreeDragKeyRef.current = dragKey;
    }
    setProjectTreeDragKey(dragKey);
    projectTreeDragDebug("dragstart:accepted", {
      dragKey,
      layer,
      types: Array.from(event.dataTransfer.types ?? [])
    });
  };
}

export function createEndProjectTreeSortDrag(__appScope: ProjectTreeScope) {
  return () => {
    const { projectTreeDragKeyRef, projectTreeDragSuppressClickRef, setProjectTreeDragKey, setProjectTreeDropKey } = __appScope;
    clearProjectTreeDragExpandTimer(__appScope);
    if (projectTreeDragKeyRef) {
      projectTreeDragKeyRef.current = "";
    }
    setProjectTreeDragKey("");
    setProjectTreeDropKey("");
    // 浏览器可能在 dragend 后补发一次 click；给它一个事件循环机会消费抑制标记，
    // 没有 click 时自动清理，避免影响下一次正常单击。
    if (projectTreeDragSuppressClickRef) {
      window.setTimeout(() => {
        projectTreeDragSuppressClickRef.current = false;
      }, 0);
    }
  };
}

const PROJECT_TREE_DRAG_EXPAND_DELAY_MS = 1000;

export function clearProjectTreeDragExpandTimer(scope: Record<string, any>) {
  const timerRef = scope.projectTreeDragExpandTimerRef;
  const pending = timerRef?.current;
  if (!pending) {
    return;
  }
  globalThis.clearTimeout(pending.timerId);
  timerRef.current = null;
}

export function scheduleProjectTreeDragExpand(scope: Record<string, any>, schemeId: string) {
  const timerRef = scope.projectTreeDragExpandTimerRef;
  if (!timerRef) {
    return;
  }
  if (timerRef.current?.schemeId === schemeId) {
    return;
  }
  clearProjectTreeDragExpandTimer(scope);
  const timerId = globalThis.setTimeout(() => {
    const latestScope = (scope.__appScopeRef?.current ?? scope) as Record<string, any>;
    const latestTimerRef = latestScope.projectTreeDragExpandTimerRef;
    if (!latestTimerRef?.current || latestTimerRef.current.schemeId !== schemeId) {
      return;
    }
    latestTimerRef.current = null;
    latestScope.setExpandedSchemeIds?.((current: string[]) =>
      current.includes(schemeId) ? current : [...current, schemeId]
    );
  }, PROJECT_TREE_DRAG_EXPAND_DELAY_MS);
  timerRef.current = { schemeId, timerId };
}

/**
 * 拖动离开某个方案/模型行（或整个列表）时清掉落点键 ——
 * 否则插入线会残留在上一次的位置上。
 * 与图元库的 handleLibraryTreeDragLeave 同款，但清的是模型库自己的状态。
 */
export function createHandleProjectTreeDragLeave(__appScope: ProjectTreeScope) {
  return (event: DragEvent<HTMLElement>) => {
    const scope = (__appScope.__appScopeRef?.current ?? __appScope) as Record<string, any>;
    const { setProjectTreeDropKey } = scope;
    if (!(event.currentTarget as Node).contains(event.relatedTarget as Node | null)) {
      clearProjectTreeDragExpandTimer(scope);
      setProjectTreeDropKey("");
    }
  };
}

export function createHandleProjectTreeDragOver(__appScope: ProjectTreeScope) {
  // **__appScope 每帧重建**（App.tsx:661），工厂闭包捕获的引用会冻结在首帧 ——
  // 拖动键/顺序表必须从 __appScopeRef.current（当前帧的 scope）读，否则永远是首帧快照。
  return (event: DragEvent<HTMLElement>, dropKey: string, forcedEdge?: "inside" | "before" | "after") => {
    const scope = (__appScope.__appScopeRef?.current ?? __appScope) as Record<string, any>;
    const { projectTreeDragKey, setProjectTreeDropKey, schemes, expandedSchemeIds } = scope;
    if (!projectTreeDragKey) {
      projectTreeDragDebug("dragover:ignored-no-drag-key", { dropKey });
      clearProjectTreeDragExpandTimer(scope);
      return;
    }
    const dragLayer = projectTreeLayer(schemes ?? [], projectTreeDragKey);
    const dropLayer = projectTreeLayer(schemes ?? [], dropKey);
    projectTreeDragDebug("dragover:received", {
      dragKey: projectTreeDragKey,
      dropKey,
      dragLayer,
      dropLayer,
      forcedEdge,
      targetClass: (event.target as HTMLElement | null)?.className ?? "",
      currentTargetClass: (event.currentTarget as HTMLElement | null)?.className ?? "",
      types: Array.from(event.dataTransfer?.types ?? [])
    });
    // 末尾落点（拖到列表空白处）= 移到顶层末尾，只有一条边（after）。
    // 必须在「层一致」检查**之前**判定 —— 末尾落点的键不是 scheme:/model: 前缀。
    if (dropKey === PROJECT_TREE_ROOT_END_KEY) {
      projectTreeDragDebug("dragover:root-end", { dragKey: projectTreeDragKey });
      clearProjectTreeDragExpandTimer(scope);
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      const dropStateKey = `${dropKey}|after`;
      setProjectTreeDropKey((current: string) => current === dropStateKey ? current : dropStateKey);
      return;
    }
    // 方案↔方案、模型↔模型、模型→方案行（移动到该方案下）都允许；方案→模型行不允许。
    const isModelIntoScheme = dragLayer === "model" && dropLayer === "scheme";
    if (dragLayer !== dropLayer && !isModelIntoScheme) {
      projectTreeDragDebug("dragover:rejected-layer-pair", { dragLayer, dropLayer, dragKey: projectTreeDragKey, dropKey });
      clearProjectTreeDragExpandTimer(scope);
      return;
    }

    if (isModelIntoScheme && !(expandedSchemeIds ?? []).includes(dropKey)) {
      scheduleProjectTreeDragExpand(scope, dropKey);
    } else {
      clearProjectTreeDragExpandTimer(scope);
    }
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    // 落点分三种（与图元库/模板库同款提示）：
    //   inside = 指针在目标行**上半区** → 成为目标的**子方案**（跨层级移动，落库）
    //   before/after = 指针在目标行下半区的上下四分位 → 插到目标之前/之后（同层重排，本机偏好）
    // 覆盖表里已有顺序时按覆盖表的先后算边；没有则按指针位置兜底。
    const edge = forcedEdge ?? projectTreeInsertEdge(scope, event, projectTreeDragKey, dropKey);
    const dropStateKey = `${dropKey}|${edge}`;
    projectTreeDragDebug("dragover:accepted", { dragKey: projectTreeDragKey, dropKey, edge, dropStateKey });
    setProjectTreeDropKey((current: string) => current === dropStateKey ? current : dropStateKey);
  };
}

/**
 * 插入位判定（**以指针位置为准**，所见即所得）：
 *   · 同层（父子相同）：
 *       上半区 → "before"（插到目标**之前**）；下半区 → "after"（插到目标**之后**）。
 *   · 跨层（父子不同）：
 *       上半区 → "inside"（成为目标的**子方案**）；下半区 → "after"（成为目标的**后继兄弟**）。
 *   落点判定**不能**用「覆盖表里的相对先后」—— 那是结算用的顺序，不是用户指针的位置。
 *   早前用覆盖表判边会导致：把已在目标前面的项拖到目标上方（想插到它前面），
 *   却被判成 after（插到它后面），看起来就像两项互换。
 */
function projectTreeInsertEdge(
  scope: Record<string, any>,
  event: DragEvent<HTMLElement>,
  dragKey: string,
  dropKey: string
): "inside" | "before" | "after" {
  const { schemes } = scope;
  const dragLayer = projectTreeLayer(schemes ?? [], dragKey);
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
  const ratio = rect.height > 0 ? (event.clientY - rect.top) / rect.height : 0.5;
  const sameLevel = dragLayer === "scheme"
    ? projectTreeParentKey(schemes ?? [], dragKey) === projectTreeParentKey(schemes ?? [], dropKey)
    : projectTreeModelOwnerKey(schemes ?? [], dragKey) === projectTreeModelOwnerKey(schemes ?? [], dropKey);
  // 上半区：同层 → 插到目标之前；跨层 → 成为目标的子方案。
  if (ratio < 0.5) {
    return sameLevel ? "before" : "inside";
  }
  // 下半区：同层/跨层都是「插到目标之后」（跨层 = 成为目标的后继兄弟）。
  return "after";
}

export function createHandleProjectTreeDrop(__appScope: ProjectTreeScope) {
  return (
    event: DragEvent<HTMLElement>,
    dropKey: string,
    dropOptions: { dragKey?: string; edge?: "inside" | "before" | "after" } = {}
  ) => {
    // 同上：从当前帧 scope 读状态（__appScope 每帧重建，闭包捕获会冻结）。
    const scope = (__appScope.__appScopeRef?.current ?? __appScope) as Record<string, any>;
    const {
      projectTreeDragKey, projectTreeDragKeyRef, setProjectTreeDragKey, setProjectTreeDropKey, setLibraryTreeOrder,
      libraryTreeOrder, schemes, moveSchemeRecordToScheme, moveSchemeRecordToPosition, moveProjectRecordToScheme
    } = scope;
    clearProjectTreeDragExpandTimer(scope);
    projectTreeDragDebug("drop:received", {
      dragKey: projectTreeDragKey,
      dropKey,
      stateKey: scope.projectTreeDropKey ?? "",
      types: Array.from(event.dataTransfer?.types ?? []),
      schemeId: typeof (event.currentTarget as { getAttribute?: unknown } | null)?.getAttribute === "function"
        ? (event.currentTarget as { getAttribute: (name: string) => string | null }).getAttribute("aria-label")
        : ""
    });
    event.preventDefault();
    event.stopPropagation();
    const dragKey = dropOptions.dragKey ?? projectTreeDragKey;
    // 落点边（inside = 成为目标的子方案；before/after = 同层插入位）。
    const stateKey = scope.projectTreeDropKey ?? "";
    const edge = dropOptions.edge ?? (stateKey.endsWith("|inside") ? "inside" : stateKey.endsWith("|after") ? "after" : "before");
    if (projectTreeDragKeyRef) {
      projectTreeDragKeyRef.current = "";
    }
    setProjectTreeDragKey("");
    setProjectTreeDropKey("");
    if (!dragKey) {
      projectTreeDragDebug("drop:ignored-no-drag-key", { dropKey });
      return;
    }
    const dragLayer = projectTreeLayer(schemes ?? [], dragKey);
    const dropLayer = projectTreeLayer(schemes ?? [], dropKey);
    // 末尾落点（拖到列表空白处）= 移到顶层末尾。
    if (dropKey === PROJECT_TREE_ROOT_END_KEY) {
      projectTreeDragDebug("drop:root-end", { dragKey, dragLayer });
      if (dragLayer === "scheme" && typeof moveSchemeRecordToPosition === "function") {
        moveSchemeRecordToPosition(dragKey, "", "");
      } else if (dragLayer === "model" && typeof moveProjectRecordToScheme === "function") {
        // 模型 → 顶层：顶层没有方案可挂，放到第一个顶层方案下。
        const firstRootScheme = (schemes ?? [])[0];
        if (firstRootScheme) {
          moveProjectRecordToScheme(dragKey, firstRootScheme.id);
        }
      }
      return;
    }
    // 模型 → 方案行 = 移动到该方案下（跨层级，允许）；方案 → 模型行 = 不允许。
    const isModelIntoScheme = dragLayer === "model" && dropLayer === "scheme";
    if (dragLayer !== dropLayer && !isModelIntoScheme) {
      projectTreeDragDebug("drop:rejected-layer-pair", { dragKey, dropKey, dragLayer, dropLayer });
      return;
    }
    const currentOrder = libraryTreeOrder ?? {
      categoryLibraries: [],
      componentLibraries: {},
      templateTypes: [],
      templates: {},
      projectSchemes: {},
      projectModels: {}
    };
    // ── 跨层级落点（数据变更，落库）──────────────────────────────────────────────
    //  · inside = 成为目标行的**子方案**
    //  · after  = 成为目标的**后继兄弟**（落到目标所在父级）
    const dragParentKey = dragLayer === "scheme"
      ? projectTreeParentKey(schemes ?? [], dragKey)
      : projectTreeModelOwnerKey(schemes ?? [], dragKey);
    const dropParentKey = dropLayer === "scheme"
      ? projectTreeParentKey(schemes ?? [], dropKey)
      : projectTreeModelOwnerKey(schemes ?? [], dropKey);
    const isCrossLevel = dragParentKey !== dropParentKey;
    // Tree 的 inside 落点表示「成为目标方案的子方案」。
    // 顶层方案的父级都为空串，不能用 isCrossLevel 判断这一种合法的层级变化。
    if (dragLayer === "scheme" && dropLayer === "scheme" && edge === "inside") {
      if (dragKey === dropKey
        || projectTreeSchemeContainsId(schemes ?? [], dragKey, dropKey)
        || dropKey.startsWith(`${dragKey}/`)) {
        projectTreeDragDebug("drop:move-scheme-inside-skipped-cycle", { dragKey, dropKey });
        return;
      }
      projectTreeDragDebug("drop:move-scheme-inside", { dragKey, dropKey, sourceParentKey: dragParentKey, targetParentKey: dropParentKey });
      if (typeof moveSchemeRecordToScheme === "function") {
        moveSchemeRecordToScheme(dragKey, dropKey);
      }
      return;
    }
    if (isCrossLevel) {
      if (dragLayer === "scheme") {
        // inside = 成为目标行的子方案；after = 成为目标的后继兄弟（落到目标父级、排在目标之后）。
        if (edge === "inside") {
          if (typeof moveSchemeRecordToScheme === "function") {
            moveSchemeRecordToScheme(dragKey, dropKey);
          }
          return;
        }
        if (typeof moveSchemeRecordToPosition === "function") {
          // 插到目标**之后** → 目标是其父级里的第 N 项，插到第 N+1 项之前；
          // 目标是最后一项时传空 → 追加到该父级末尾。
          const insertBeforeId = projectTreeNextSiblingId(
            schemes ?? [],
            dropParentKey,
            dropKey,
            currentOrder.projectSchemes[dropParentKey] ?? []
          );
          moveSchemeRecordToPosition(dragKey, dropParentKey, insertBeforeId);
        }
        return;
      }
      if (typeof moveProjectRecordToScheme === "function") {
        // 模型 → 方案行：inside = 落进该方案；after = 落到目标模型所在方案。
        const targetSchemeId = dropLayer === "scheme"
          ? edge === "inside"
            ? dropKey
            : projectTreeModelIds(schemes ?? [], dropKey).length === 0
              ? dropKey
              : dropParentKey
          : dropParentKey;
        projectTreeDragDebug("drop:move-project", {
          projectId: dragKey,
          targetSchemeId,
          edge,
          sourceSchemeId: dragParentKey,
          dropParentKey,
          dropKey
        });
        if (targetSchemeId) {
          moveProjectRecordToScheme(dragKey, targetSchemeId);
        } else {
          projectTreeDragDebug("drop:move-project-skipped-no-target", { projectId: dragKey, dropKey, edge });
        }
      }
      return;
    }
    if (dragLayer === "scheme") {
      // 方案 id 本身带 "scheme:" 前缀 —— 整串就是清单里的键，**不能再 slice**。
      const dragId = dragKey;
      const dropId = dropKey;
      const parentKey = projectTreeParentKey(schemes ?? [], dragId);
      // 结算必须用**完整显示顺序**（数据顺序 + 覆盖表），与渲染口径一致 ——
      // 否则会按数据顺序插入、按显示顺序渲染，看起来变成「两项互换」而非插入。
      const siblings = projectTreeDisplayIds(
        projectTreeSiblingIds(schemes ?? [], parentKey),
        currentOrder.projectSchemes[parentKey] ?? []
      );
      // 方向由**指针位置**给出（before = 插到目标之前），不靠索引反推。
      const next = moveKeyToEdge(siblings, dragId, dropId, edge === "after" ? "after" : "before");
      if (!next) {
        return;
      }
      const nextOrder = { ...currentOrder, projectSchemes: { ...currentOrder.projectSchemes, [parentKey]: next } };
      writeLibraryTreeOrder(nextOrder);
      setLibraryTreeOrder(nextOrder);
      return;
    }
    if (dragLayer === "model") {
      // 模型 id 同样带 "model:" 前缀 —— 整串即清单键。
      const dragId = dragKey;
      const dropId = dropKey;
      const owner = projectTreeModelOwnerKey(schemes ?? [], dragId);
      const siblings = projectTreeDisplayIds(
        projectTreeModelIds(schemes ?? [], owner),
        currentOrder.projectModels[owner] ?? []
      );
      const next = moveKeyToEdge(siblings, dragId, dropId, edge === "after" ? "after" : "before");
      if (!next) {
        return;
      }
      const nextOrder = { ...currentOrder, projectModels: { ...currentOrder.projectModels, [owner]: next } };
      writeLibraryTreeOrder(nextOrder);
      setLibraryTreeOrder(nextOrder);
    }
  };
}

/**
 * 旧路径键兼容：数字 schemeId 没有父级编码，无法从编号反推路径父级。
 * 新代码应通过方案树查找 `projectTreeParentKey`。
 */
export function projectTreeParentIdOf(schemeId: string): string {
  const index = schemeId.lastIndexOf("/");
  return index < 0 ? "" : schemeId.slice(0, index);
}

/**
 * 目标在其父级清单里的**下一个兄弟 id**（用于「插到目标之后」）。
 * 目标已是最后一项 → 返回空串（追加到该父级末尾）。
 * 用**完整显示顺序**（数据顺序 + 覆盖表）算，与渲染/结算口径一致。
 */
export function projectTreeNextSiblingId(
  schemes: readonly any[],
  parentKey: string,
  schemeId: string,
  order: readonly string[] = []
): string {
  const siblings = projectTreeDisplayIds(projectTreeSiblingIds(schemes, parentKey), order);
  const index = siblings.indexOf(schemeId);
  if (index < 0) {
    return "";
  }
  return siblings[index + 1] ?? "";
}

export function createRenderProjectSchemeNode(__appScope: ProjectTreeScope) {
  return (scheme: SavedSchemeRecord, depth = 0, showRootEndLine = false): ReactNode => {
  // __appScope 每帧重建，本工厂闭包捕获的是首帧 scope —— 拖动态（projectTreeDropKey）与
  // 顺序覆盖（libraryTreeOrder）必须从当前帧 scope 读，否则指示线与新顺序不会反映到 DOM。
  const scope = (__appScope.__appScopeRef?.current ?? __appScope) as Record<string, any>;
  const { Cable, ChevronDown, ChevronRight, Factory, FileJson, FolderOpen, HousePlug, Network, activeProjectKey, div, endProjectTreeSortDrag, expandedSchemeIds, handleProjectTreeDragLeave, handleProjectTreeDragOver, handleProjectTreeDrop, isEditMode, libraryTreeOrder, loadingModel, p, projectModelTypeFilter, projectSearchNeedle, projectTreeDropKey, renderProjectSchemeNode, requestLoadSavedProject, selectSingleProject, selectSingleScheme, selectedProjectId, selectedProjectIds, selectedSchemeId, selectedSchemeIds, setInspectorTab, setProjectMenu, span, startProjectTreeSortDrag, toggleProjectSelection, toggleSchemeExpanded, toggleSchemeSelection } = scope;
    const isFiltering = Boolean(projectSearchNeedle || (projectModelTypeFilter && projectModelTypeFilter.length > 0));
    const isExpanded = isFiltering ? true : expandedSchemeIds.includes(scheme.id);
    // 同层顺序覆盖：方案按父层级分桶，模型按所属方案分桶；未拖动过的项保持原相对顺序垫底。
    const children = sortByKeyOrder(
      scheme.children ?? [],
      (child: SavedSchemeRecord) => child.id,
      libraryTreeOrder?.projectSchemes?.[scheme.id] ?? []
    );
    const orderedProjects = sortByKeyOrder(
      scheme.projects ?? [],
      (project: SavedProjectRecord) => project.id,
      libraryTreeOrder?.projectModels?.[scheme.id] ?? []
    );
    const countModels = (s: SavedSchemeRecord): number => s.projects.length + (s.children ?? []).reduce((sum: number, c: SavedSchemeRecord) => sum + countModels(c), 0);
    const modelCount = countModels(scheme);
    const displaySchemeId = scheme.schemeId;
    const schemeIdTooltip = typeof displaySchemeId === "number" && Number.isSafeInteger(displaySchemeId) && displaySchemeId > 0
      ? `方案 ID：${displaySchemeId}`
      : "方案 ID：未分配";
    const hasContent = scheme.projects.length > 0 || children.length > 0;
    const schemeIndentStyle = { "--scheme-depth": depth } as CSSProperties;
    const projectIndentStyle = { "--scheme-depth": depth + 1 } as CSSProperties;
    // 方案/模型 id 本身已带 "scheme:" / "model:" 前缀 —— 拖动键直接用 id，不再叠加前缀。
    const schemeDropKey = scheme.id;
    const schemeDropLineClass = projectTreeDropKey === `${schemeDropKey}|before`
      ? " library-tree-drop-line-before"
      : projectTreeDropKey === `${schemeDropKey}|after`
        ? " library-tree-drop-line-after"
        : projectTreeDropKey === `${schemeDropKey}|inside`
          ? " library-tree-drop-inside"
          : showRootEndLine
            // 列表末尾落点（拖到空白处 = 移到顶层末尾）：线画在本行下边缘。
            ? " library-tree-drop-line-after"
            : "";
    return (
      <div
        className={`scheme-group ${depth > 0 ? "nested" : ""}`}
        key={scheme.id}
        style={schemeIndentStyle}
      >
        <div
          role="option"
          aria-label={`方案：${scheme.name}`}
          title={schemeIdTooltip}
          aria-selected={selectedSchemeIds.includes(scheme.id) || selectedSchemeId === scheme.id}
          aria-expanded={isExpanded}
          tabIndex={0}
          // 行本体**不可拖** —— 只有行首把手能发起拖动（拖动排序 + 跨层级移动都走把手）。
          // 行本体若也 draggable，浏览器会从祖先发起拖拽，把手的拖动根本起不来。
          draggable={false}
          className={`scheme-option ${selectedSchemeIds.includes(scheme.id) || selectedSchemeId === scheme.id ? "selected" : ""}${schemeDropLineClass}`}
          style={schemeIndentStyle}
          onClick={(event) => {
            if (event.ctrlKey || event.metaKey || event.shiftKey) {
              toggleSchemeSelection(scheme.id);
            } else {
              selectSingleScheme(scheme.id);
            }
            toggleSchemeExpanded(scheme.id);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " " || event.key === "Spacebar") {
              event.preventDefault();
              if (event.ctrlKey || event.metaKey || event.shiftKey) {
                toggleSchemeSelection(scheme.id);
              } else {
                selectSingleScheme(scheme.id);
              }
              toggleSchemeExpanded(scheme.id);
            }
          }}
          onDragOver={(event) => {
            // 排序通道（把手拖动）：算出插入边并画指示线；本体拖动（跨方案移动）只放行。
            // 阻止冒泡 —— 列表容器的 dragover（末尾落点）不能覆盖行内算好的插入边。
            event.stopPropagation();
            handleProjectTreeDragOver(event, schemeDropKey);
            event.preventDefault();
          }}
          onDragLeave={handleProjectTreeDragLeave}
          onDrop={(event) => {
            event.preventDefault();
            event.stopPropagation();
            if (!isEditMode) {
              return;
            }
            // 只有把手能发起拖动（行本体不可拖），所以这里只处理排序通道。
            // 跨层级移动也在把手通道里完成（落在目标行上半区 = 成为其子方案）。
            const sortSchemeId = event.dataTransfer.getData(PROJECT_TREE_DRAG_TYPE_SCHEME);
            const sortModelId = event.dataTransfer.getData(PROJECT_TREE_DRAG_TYPE_MODEL);
            projectTreeDragDebug("scheme-row:drop-mime", {
              dropKey: schemeDropKey,
              sortSchemeId,
              sortModelId,
              types: Array.from(event.dataTransfer.types ?? [])
            });
            if (sortSchemeId || sortModelId) {
              // dropKey = **目标行**的键（拖动源由 libraryTreeDragKey 读出）。
              handleProjectTreeDrop(event, schemeDropKey);
            }
          }}
          onContextMenu={(event) => {
            event.preventDefault();
            event.stopPropagation();
            if (!selectedSchemeIds.includes(scheme.id)) {
              selectSingleScheme(scheme.id);
            }
            setProjectMenu({ x: event.clientX, y: event.clientY, schemeId: scheme.id });
          }}
        >
          <span
            className="library-tree-drag-handle project-tree-drag-handle"
            title="拖动调整顺序"
            aria-label={`拖动调整方案 ${scheme.name} 的顺序`}
            draggable={isEditMode}
            onDragStart={(event) => startProjectTreeSortDrag(event, scheme.id)}
            onDragEnd={endProjectTreeSortDrag}
            onClick={(event) => event.stopPropagation()}
          >
            <GripVertical size={12} aria-hidden="true" />
          </span>
          {isExpanded ? <ChevronDown className="scheme-toggle-icon" size={14} /> : <ChevronRight className="scheme-toggle-icon" size={14} />}
          <FolderOpen className="scheme-folder-icon" size={15} />
          <span className="project-tree-name">{scheme.name}</span>
          <span className="scheme-model-count">{modelCount}</span>
        </div>
        {isExpanded && (
          <div className="scheme-projects">
            {!hasContent && !isFiltering ? (
              <p
                className={`project-empty${projectTreeDropKey === `${schemeDropKey}|inside` ? " library-tree-drop-inside" : ""}`}
                style={projectIndentStyle}
                onDragOver={(event) => {
                  event.stopPropagation();
                  handleProjectTreeDragOver(event, schemeDropKey, "inside");
                  event.preventDefault();
                }}
                onDragLeave={handleProjectTreeDragLeave}
                onDrop={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  if (!isEditMode) {
                    return;
                  }
                  if (event.dataTransfer.getData(PROJECT_TREE_DRAG_TYPE_MODEL)) {
                    handleProjectTreeDrop(event, schemeDropKey);
                  }
                }}
              >
                暂无模型或子方案
              </p>
            ) : (
              <>
                {orderedProjects.map((project) => {
                  const isProjectSelected = selectedProjectIds.includes(project.id) || project.id === selectedProjectId;
                  const loadingProgress = loadingModel?.projectId === project.id ? loadingModel.progress : null;
                  const rawProjectModelType = String(project.project?.modelType ?? "");
                  const projectModelType = ["微网", "厂站", "馈线", "台区"].includes(rawProjectModelType)
                    ? rawProjectModelType
                    : "其他";
                  const ProjectModelTypeIcon = ({
                    Cable,
                    Factory,
                    FileJson,
                    HousePlug,
                    Network
                  } as Record<string, any>)[projectModelTypeIconName(projectModelType)] ?? FileJson;
                  const modelDropKey = project.id;
                  const modelDropLineClass = projectTreeDropKey === `${modelDropKey}|before`
                    ? " library-tree-drop-line-before"
                    : projectTreeDropKey === `${modelDropKey}|after`
                      ? " library-tree-drop-line-after"
                      : projectTreeDropKey === `${modelDropKey}|inside`
                        ? " library-tree-drop-inside"
                        : "";
                  return (
                    <div
                      role="option"
                      aria-label={`模型：${project.name}`}
                      aria-selected={isProjectSelected}
                      aria-busy={loadingProgress !== null ? "true" : undefined}
                      tabIndex={0}
                      // 行本体**不可拖** —— 只有行首把手能发起拖动（拖动排序 + 跨方案移动都走把手）。
                      draggable={false}
                      className={`project-option ${isProjectSelected ? "selected" : ""} ${project.id === activeProjectKey ? "active" : ""}${modelDropLineClass}`}
                      style={projectIndentStyle}
                      key={project.id}
                      onDragOver={(event) => {
                        // 阻止冒泡 —— 列表容器的 dragover（末尾落点）不能覆盖行内插入边。
                        event.stopPropagation();
                        handleProjectTreeDragOver(event, modelDropKey);
                        event.preventDefault();
                      }}
                      onDragLeave={handleProjectTreeDragLeave}
                      onDrop={(event) => {
                        // 只有把手能发起拖动（行本体不可拖），所以这里只处理排序通道。
                        event.preventDefault();
                        event.stopPropagation();
                        if (!isEditMode) {
                          return;
                        }
                        const sortModelId = event.dataTransfer.getData(PROJECT_TREE_DRAG_TYPE_MODEL);
                        if (sortModelId) {
                          // dropKey = **目标行**的键（拖动源由 libraryTreeDragKey 读出）。
                          handleProjectTreeDrop(event, modelDropKey);
                        }
                      }}
                      onClick={(event) => {
                        const currentScope = (__appScope.__appScopeRef?.current ?? __appScope) as Record<string, any>;
                        if (currentScope.projectTreeDragSuppressClickRef?.current) {
                          currentScope.projectTreeDragSuppressClickRef.current = false;
                          return;
                        }
                        if (event.ctrlKey || event.metaKey || event.shiftKey) {
                          toggleProjectSelection(scheme.id, project.id);
                        } else {
                          selectSingleProject(scheme.id, project.id);
                          requestLoadSavedProject(project, scheme.id);
                        }
                        setInspectorTab("model");
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          requestLoadSavedProject(project, scheme.id);
                        } else if (event.key === " " || event.key === "Spacebar") {
                          event.preventDefault();
                          if (event.ctrlKey || event.metaKey || event.shiftKey) {
                            toggleProjectSelection(scheme.id, project.id);
                          } else {
                            selectSingleProject(scheme.id, project.id);
                          }
                        }
                      }}
                      onContextMenu={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        if (!selectedProjectIds.includes(project.id)) {
                          selectSingleProject(scheme.id, project.id);
                        }
                        setProjectMenu({ x: event.clientX, y: event.clientY, schemeId: scheme.id, projectId: project.id });
                      }}
                    >
                      <span
                        className="library-tree-drag-handle project-tree-drag-handle"
                        title="拖动调整顺序"
                        aria-label={`拖动调整模型 ${project.name} 的顺序`}
                        draggable={isEditMode}
                        onDragStart={(event) => startProjectTreeSortDrag(event, project.id)}
                        onDragEnd={endProjectTreeSortDrag}
                        onClick={(event) => event.stopPropagation()}
                      >
                        <GripVertical size={12} aria-hidden="true" />
                      </span>
                      <ProjectModelTypeIcon
                        aria-label={`${projectModelType}模型`}
                        className="project-item-icon"
                        data-model-type={projectModelType}
                        role="img"
                        size={14}
                      />
                      <span className="project-tree-name">{project.name}</span>
                      <span className="project-model-type-tag" style={{ background: (MODEL_TYPE_META as Record<string, { color: string; icon: string }>)[projectModelType]?.color ?? "#94a3b8" }}>{projectModelType}</span>
                      {loadingProgress !== null && (
                        <progress
                          className="project-option-loading-progress"
                          aria-label={`正在加载模型：${project.name}`}
                          max={100}
                          value={loadingProgress}
                        />
                      )}
                    </div>
                  );
                })}
                {children.map((child) => renderProjectSchemeNode(child, depth + 1))}              </>
            )}
          </div>
        )}
      </div>
    );
  };
}

export function createOpenBlankProjectLibraryContextMenu(__appScope: ProjectTreeScope) {
  return (event: MouseEvent<HTMLElement>) => {
  const { setProjectMenu } = __appScope;
    const target = event.target as HTMLElement | null;
    if (target?.closest(".scheme-option, .project-option, .project-tree-antd .ant-tree-treenode, .library-search")) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    setProjectMenu({ x: event.clientX, y: event.clientY });
  };
}
