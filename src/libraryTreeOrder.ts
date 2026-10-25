// 图元库面板树（一级类别库 / 二级类）与模板库面板（模板类型一级）的拖动排序：
// 顺序覆盖状态、localStorage 持久化与排序纯函数。
// 为什么是「顺序覆盖」而不是给图元库数据加序号字段：排序只影响左侧面板的显示顺序，
// 属于本机 UI 偏好（与面板宽度/显隐同类，见 spaceCache.ts 的 KEPT_LOCAL_STORAGE_KEYS），
// 不应写进图元库数据本身 —— 换空间、导入导出、换浏览器都不该带走或污染它。
// 只存被拖动整理过的完整可见清单：未拖动过的项（含之后新增的自定义分类库）天然按
// 原始相对顺序垫底，见 sortByKeyOrder。
// 模板库的二级（模板卡片）是**数据重排**而非显示覆盖：跨类型移动要改模板的 typeName，
// 走模板库自身的持久化（persistTemplateLibraryChange），不进这份本机偏好。

export type LibraryTreeOrderState = {
  /** 一级（类别库）显示顺序；只存被拖动整理过的完整可见清单。 */
  categoryLibraries: string[];
  /** 二级（类）显示顺序：键为归一化类别库名，值为该库下类的 section 名清单。 */
  componentLibraries: Record<string, string[]>;
  /**
   * 模型库方案树：方案同级显示顺序。
   * 键 = 父方案 id（顶层用空串），值为该层级下方案 id 清单。
   * 只影响本地显示顺序，**不写回后端**（方案记录的数据顺序不动）。
   */
  projectSchemes: Record<string, string[]>;
  /** 模型库方案树：模型同级显示顺序。键 = 所属方案 id，值为该方案下模型 id 清单。 */
  projectModels: Record<string, string[]>;
};

export const LIBRARY_TREE_ORDER_STORAGE_KEY = "graph-modeling-platform:library-tree-order";

// 拖拽数据用自定义 MIME 类型而非 text/plain：图元库里的模板按钮本身可拖（放到画布），
// 自定义类型让面板树行的 dragover/drop 精确识别「树排序拖动」，与模板拖动互不串扰。
export const LIBRARY_TREE_DRAG_TYPE_GROUP = "application/x-library-tree-group";
export const LIBRARY_TREE_DRAG_TYPE_COMPONENT_LIBRARY = "application/x-library-tree-class";

export const EMPTY_LIBRARY_TREE_ORDER: LibraryTreeOrderState = {
  categoryLibraries: [],
  componentLibraries: {},
  projectSchemes: {},
  projectModels: {}
};

function normalizeKeyList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return Array.from(new Set(value.filter((item): item is string => typeof item === "string" && item.length > 0)));
}

/** 任意来源（localStorage JSON、拖放 payload）→ 合法顺序状态；畸形输入一律归空，不抛错。 */
export function parseLibraryTreeOrder(raw: unknown): LibraryTreeOrderState {
  const empty = { categoryLibraries: [], componentLibraries: {}, projectSchemes: {}, projectModels: {} };
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return empty;
  }
  const source = raw as {
    categoryLibraries?: unknown;
    componentLibraries?: unknown;
    projectSchemes?: unknown;
    projectModels?: unknown;
  };
  const componentLibraries: Record<string, string[]> = {};
  if (source.componentLibraries && typeof source.componentLibraries === "object" && !Array.isArray(source.componentLibraries)) {
    for (const [group, value] of Object.entries(source.componentLibraries)) {
      if (!group) {
        continue;
      }
      const list = normalizeKeyList(value);
      if (list.length > 0) {
        componentLibraries[group] = list;
      }
    }
  }
  return {
    categoryLibraries: normalizeKeyList(source.categoryLibraries),
    componentLibraries,
    projectSchemes: normalizeOrderBuckets(source.projectSchemes),
    projectModels: normalizeOrderBuckets(source.projectModels)
  };
}

/**
 * 把「桶 → 清单」形态的字段归一成 Record<string, string[]>。
 * 桶名允许空串（模型库顶层方案用空串作父键），但空桶（值为空数组）不保留。
 */
function normalizeOrderBuckets(value: unknown): Record<string, string[]> {
  const buckets: Record<string, string[]> = {};
  if (value && typeof value === "object" && !Array.isArray(value)) {
    for (const [key, list] of Object.entries(value)) {
      const normalized = normalizeKeyList(list);
      if (normalized.length > 0) {
        buckets[key] = normalized;
      }
    }
  }
  return buckets;
}

/** 读持久化的顺序覆盖；未设置 / 存储不可用 / 内容畸形时返回空覆盖（渲染走数据原始顺序）。 */
export function readLibraryTreeOrder(): LibraryTreeOrderState {
  try {
    if (typeof localStorage === "undefined") {
      return EMPTY_LIBRARY_TREE_ORDER;
    }
    const raw = localStorage.getItem(LIBRARY_TREE_ORDER_STORAGE_KEY);
    return raw ? parseLibraryTreeOrder(JSON.parse(raw)) : EMPTY_LIBRARY_TREE_ORDER;
  } catch {
    return EMPTY_LIBRARY_TREE_ORDER;
  }
}

/** 写持久化；失败静默降级 —— 当前会话内排序仍然生效，只是不跨会话保留。 */
export function writeLibraryTreeOrder(state: LibraryTreeOrderState): void {
  try {
    if (typeof localStorage === "undefined") {
      return;
    }
    localStorage.setItem(LIBRARY_TREE_ORDER_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // 隐私模式等存储不可用：忽略。
  }
}

/**
 * 按「顺序覆盖表」稳定排序：在表内的项按表中先后居前，不在表内的项保持原相对顺序垫底。
 * 覆盖表为空（或单项列表）时原样返回同一引用，方便调用方短路。
 */
export function sortByKeyOrder<T>(items: readonly T[], keyOf: (item: T) => string, order: readonly string[]): T[] {
  if (order.length === 0 || items.length <= 1) {
    return items as T[];
  }
  const rankByKey = new Map<string, number>();
  order.forEach((key, index) => {
    if (!rankByKey.has(key)) {
      rankByKey.set(key, index);
    }
  });
  return items
    .map((item, index) => ({ item, index, rank: rankByKey.get(keyOf(item)) }))
    .sort((a, b) => {
      const rankA = a.rank ?? Number.MAX_SAFE_INTEGER;
      const rankB = b.rank ?? Number.MAX_SAFE_INTEGER;
      return rankA !== rankB ? rankA - rankB : a.index - b.index;
    })
    .map((entry) => entry.item);
}

/**
 * 把 dragKey 移到 targetKey 的落点：downward 传 "before" = 插到目标**之前**，
 * "after" = 插到目标**之后**。
 * 与 reorderKeys（按索引推方向）不同：这里方向由**指针位置**明确给出 ——
 * 落点判定不能靠「谁在谁前面」反推，否则拖到目标上方却插到它后面（看起来像互换）。
 * 入参非法或位置无变化时返回 null（调用方无需写状态）。
 */
export function moveKeyToEdge(
  keys: readonly string[],
  dragKey: string,
  targetKey: string,
  edge: "before" | "after"
): string[] | null {
  const from = keys.indexOf(dragKey);
  const to = keys.indexOf(targetKey);
  if (from < 0 || to < 0 || dragKey === targetKey) {
    return null;
  }
  const next = keys.filter((key) => key !== dragKey);
  const targetIndex = next.indexOf(targetKey);
  const insertAt = edge === "before" ? targetIndex : targetIndex + 1;
  next.splice(insertAt, 0, dragKey);
  // 位置没变则无需写状态。
  if (next.length === keys.length && next.every((key, index) => key === keys[index])) {
    return null;
  }
  return next;
}

/**
 * 把 dragKey 移到 targetKey 的落点：向下拖插到目标之后，向上拖插到目标之前
 * —— 与常见列表重排的落点语义一致。入参非法或位置无变化时返回 null（调用方无需写状态）。
 */
export function reorderKeys(keys: readonly string[], dragKey: string, targetKey: string): string[] | null {
  const from = keys.indexOf(dragKey);
  const to = keys.indexOf(targetKey);
  if (from < 0 || to < 0 || from === to) {
    return null;
  }
  const next = keys.filter((key) => key !== dragKey);
  const insertAt = next.indexOf(targetKey) + (from < to ? 1 : 0);
  next.splice(insertAt, 0, dragKey);
  return next;
}
