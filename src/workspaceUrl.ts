// 地址栏 ↔ 当前工作空间 / 当前模型 的双向同步。
//
// 链路：切换空间或模型 → 把标识写进地址栏；打开（含刷新 / 分享 / 浏览器前进后退）
// 一个带标识的地址 → 先切空间（此时会硬重载），重载后再按标识打开模型。
//
// 标识放 **hash**（`#space=…&model=…&scheme=…`）而不是 query：
// - 空间标识本来就是中文 id（`server/spaceId.mjs`），URLSearchParams 会自动百分号编码，
//   `decodeURIComponent` 一次即可还原，与 `spaceClient.readSpaceCookie` 同一套对称处理；
// - hash 不会发给后端，静态托管 / SPA fallback / 前端 base 前缀都不受影响；
// - 切换空间本身是 `location.reload()`（见 src/spaceSwitch.ts），hash 在重载后天然保留。
//
// 本模块是纯模块（不 import React / DOM 以外的东西），node 测试环境用桩对象调用，
// 故所有 DOM 访问都经 `options` 注入或 `globalThis` 判空，绝不在模块顶层碰 document。

/**
 * 地址栏里的标识。三个字段都可缺省 —— 缺省即「地址栏不约束这一项」。
 *
 * 字段语义（**这里曾经踩过坑，别把 id 和 key 混回去**）：
 * - `modelId` / `schemeId` 是**给人看、能贴进聊天框的身份**，不是 `__appScope` 里的 key。
 *   模型取后端分配的稳定序号 `project.idx`（`allocateStableProjectIndex`，
 *   `server/server.mjs:3835`：跨方案唯一、改名或移动方案后不变），纯数字，无中文；
 *   方案取层级路径逐段 slug（`schemePathSlugPrefixes`），也用不到中文。
 * - `modelKey` / `schemeKey` 是运行期的 `activeProjectKey` / `activeSchemeKey`，
 *   形如 `project:<编码后的方案路径>/<编码后的模型名>`（`src/model-routing.ts:7486`
 *   `savedRuntimePathKey`）—— **整串是中文名的百分号编码**。它们只在进程内有效、
 *   每次加载都由 `hydrateSavedSchemeRuntimeIds` 重算，**不适合进地址栏**，故单独放字段。
 */
export type WorkspaceUrlState = {
  spaceId: string;
  /** 地址栏展示用：模型稳定序号 `project.idx`（十进制正整数），无中文 */
  modelId: string;
  /** 地址栏展示用：方案路径 slug，无中文 */
  schemeId: string;
  /** 进程内用：`activeProjectKey`，用于在方案树里精确定位 */
  modelKey: string;
  /** 进程内用：`activeSchemeKey` */
  schemeKey: string;
};

/** hash 里用的短键：短、可读、不与未来可能的其他 hash 字段冲突。 */
const URL_KEYS = { spaceId: "space", modelId: "model", schemeId: "scheme", modelKey: "mk", schemeKey: "sk" } as const;

/**
 * 一个路径段最多保留多少个字符。中文按 4 个字符计（slug 后的体积就是 `encodeURIComponent` 的长度），
 * 8 个字符 ≈ 一个 4 字中文名 —— 地址栏够用，又不至于把整条方案路径塞进来。
 */
const SLUG_MAX_CHARS = 8;

/**
 * 层级 slug：中文字符本身不进地址栏，只留「前缀 + 序号」。
 *
 * 为什么不是直接把中文转成拼音：全仓没有拼音表，引一个几千行的依赖只为地址栏可读性不划算。
 * 用稳定序号的好处是同层内唯一（同名兄弟本来就在 `normalizeSavedSchemeRecordNames` 里加了后缀，
 * 必然分到不同序号），坏处是丢掉可读性 —— 但这已经满足「不要用中文」这条硬要求。
 *
 * @param names 从根到当前层的显示名数组
 */
export function schemePathSlugPrefixes(names: readonly string[]): string[] {
  const used: string[] = [];
  const slots: string[] = [];
  return names.map((raw, index) => {
    const name = String(raw ?? "");
    // 同级重名不可能出现（上面那层归一会加后缀），这里仍按出现次数兜底，避免极端手工数据撞车
    let occurrence = 0;
    for (let i = 0; i < index; i += 1) {
      if (String(names[i] ?? "") === name) occurrence += 1;
    }
    void used;
    // 纯 ASCII 且够短：保留原文，地址栏还能读懂「DOT」这种方案名
    const ascii = /^[A-Za-z0-9._-]+$/u.test(name);
    const slug = ascii && name.length <= SLUG_MAX_CHARS ? name : `s${index + 1}${occurrence ? `-${occurrence}` : ""}`;
    slots.push(slug);
    return slug;
  });
}

/** slug 串 → 还原不了名字，只用于「一个地址栏里的方案标识长什么样」的合法性检查。 */
const SCHEME_SLUG_PATTERN = /^[A-Za-z0-9._-]+$/u;

export function isSchemeSlug(value: string): boolean {
  return SCHEME_SLUG_PATTERN.test(String(value ?? ""));
}

/** 模型稳定序号：十进制正整数。0 / 负数 / 非数字都算「地址栏没写」。 */
export function isModelIndex(value: string): boolean {
  const n = Number(String(value ?? ""));
  return Number.isSafeInteger(n) && n > 0;
}

/** 一次 `readWorkspaceUrl` 的结果。`present` 用来区分「地址栏没写」与「写了空串」。 */
export type ParsedWorkspaceUrl = {
  spaceId: string;
  /** 地址栏展示值（模型 idx / 方案 slug） */
  modelId: string;
  schemeId: string;
  /** 进程内 key（`mk` / `sk` 参数），可能为空 */
  modelKey: string;
  schemeKey: string;
  hasSpace: boolean;
  hasModel: boolean;
  hasScheme: boolean;
  /**
   * 旧格式兼容：`model` / `scheme` 里写的是 `project:…` / `scheme:…` 这种运行期 key。
   * 这种地址是加 idx 之前发出去的，仍在别人的聊天记录/书签里，必须继续认。
   */
  legacyModelKey: boolean;
  legacySchemeKey: boolean;
};

// ---- hash 编解码 ----

function normalizeHash(hash: string): string {
  return String(hash ?? "").replace(/^#+/u, "");
}

/**
 * 解析 hash 段。非法百分号序列**不抛错**：地址栏是用户可编辑的外部输入，
 * 一处 `%E4` 打挂启动是最坏结果，与 spaceClient 的 `readSpaceCookie` 同一取舍。
 */
function decodePart(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/**
 * 解析 hash。只认 `#space=x&model=y&scheme=z&mk=…&sk=…` 这种键值对写法；
 * 不认识 `#/router/path` 这类路径式 hash（没有 `=` 的段一律跳过，解析结果为空）。
 *
 * `model` / `scheme` 现在是 idx / slug；但它们**曾经**是 `project:…` / `scheme:…` 运行期 key。
 * 旧值一旦被读到就直接挪进 `modelKey` / `schemeKey`，让上层走「按 key 定位」的老路径。
 */
export function parseWorkspaceHash(hash: string): ParsedWorkspaceUrl {
  const result: ParsedWorkspaceUrl = {
    spaceId: "",
    modelId: "",
    schemeId: "",
    modelKey: "",
    schemeKey: "",
    hasSpace: false,
    hasModel: false,
    hasScheme: false,
    legacyModelKey: false,
    legacySchemeKey: false
  };
  const raw = normalizeHash(hash);
  if (!raw) return result;
  for (const part of raw.split("&")) {
    const index = part.indexOf("=");
    if (index < 0) continue;
    const key = decodePart(part.slice(0, index).trim());
    const value = decodePart(part.slice(index + 1).trim());
    if (key === URL_KEYS.spaceId) {
      result.spaceId = value;
      result.hasSpace = true;
    } else if (key === URL_KEYS.modelId) {
      // 旧格式：`model=project:…`（内含中文名）。识别出来后不当作 idx 使用。
      if (/^project:/u.test(value)) {
        result.modelKey = value;
        result.legacyModelKey = true;
        result.hasModel = true;
      } else {
        result.modelId = value;
        result.hasModel = true;
      }
    } else if (key === URL_KEYS.schemeId) {
      if (/^scheme:/u.test(value)) {
        result.schemeKey = value;
        result.legacySchemeKey = true;
        result.hasScheme = true;
      } else {
        result.schemeId = value;
        result.hasScheme = true;
      }
    } else if (key === URL_KEYS.modelKey) {
      result.modelKey = value;
      // `mk` 单独出现也算「地址栏指定了模型」
      result.hasModel = true;
    } else if (key === URL_KEYS.schemeKey) {
      result.schemeKey = value;
      result.hasScheme = true;
    }
  }
  return result;
}

/**
 * 组装 hash（含前导 `#`）。空字段直接省略 —— 地址栏不留下 `model=` 这种噪声。
 *
 * **只写 idx / slug**：`modelKey` / `schemeKey` 是运行期 key、含中文名，绝不进地址栏。
 * 因此正常情况下产生的地址永远不含中文；读入旧地址后才可能带中文，那是兼容层的事。
 */
export function buildWorkspaceHash(state: Partial<WorkspaceUrlState>): string {
  const parts: string[] = [];
  const spaceId = String(state.spaceId ?? "");
  const modelId = String(state.modelId ?? "");
  const schemeId = String(state.schemeId ?? "");
  if (spaceId) parts.push(`${URL_KEYS.spaceId}=${encodeURIComponent(spaceId)}`);
  if (modelId) parts.push(`${URL_KEYS.modelId}=${encodeURIComponent(modelId)}`);
  if (schemeId) parts.push(`${URL_KEYS.schemeId}=${encodeURIComponent(schemeId)}`);
  return parts.length > 0 ? `#${parts.join("&")}` : "";
}

// ---- DOM 侧读写 ----

function defaultLocation(): { hash: string; pathname: string; search: string } | null {
  const scope = globalThis as any;
  const location = scope?.window?.location ?? scope?.location;
  if (!location || typeof location !== "object") return null;
  return location;
}

/** 读地址栏。node 环境（无 location）返回全空结果 —— 调用方按「地址栏不约束」处理。 */
export function readWorkspaceUrl(): ParsedWorkspaceUrl {
  const location = defaultLocation();
  return parseWorkspaceHash(location ? String(location.hash ?? "") : "");
}

// 页面打开那一刻地址栏要求什么 —— **模块求值时就定格**，之后永不改变。
//
// 为什么要单独存一份，而不是每次 `readWorkspaceUrl()` 现读：本页一旦跑起来，App.tsx 那条
// 「应用状态 → 地址栏」的 effect 就会把 hash 改写成「当前这个模型」。所有"要不要按地址栏
// 行事"的判断都必须以**用户当初打开的地址**为准，读现值的判断会读到被自己改写过的结果，
// 于是把用户的意图判成「没要求」（实测：贴 `model=13` 进来，fetch 回来时读到的是 `model=9`）。
const INITIAL_WORKSPACE_URL_INTENT: ParsedWorkspaceUrl = readWorkspaceUrl();

/** 用户当初打开本页时地址栏里的内容（不是当前 hash）。 */
export function readInitialWorkspaceUrlIntent(): ParsedWorkspaceUrl {
  return INITIAL_WORKSPACE_URL_INTENT;
}

/**
 * 打开地址时**切空间**用：当前 Cookie 指向的空间与地址栏不一致时，返回地址栏的空间 id。
 *
 * 只在地址栏显式写了 `space` 且与 `cookieSpaceId` 不同时才返回 —— 相同就是同一个空间，
 * 再走一遍 `switchToSpace`（清缓存 + 硬重载）纯属多余且会丢画布状态。
 */
export function spaceIdToAdopt(url: ParsedWorkspaceUrl, cookieSpaceId: string): string {
  if (!url.hasSpace || !url.spaceId) return "";
  return url.spaceId === String(cookieSpaceId ?? "") ? "" : url.spaceId;
}

// ---- idx / slug ↔ 运行期 key ----
//
// 这一层的两个函数都**不 import 方案树模块**：`src/workspaceUrl.ts` 要能被 node 测试直接
// 加载、也要能被最早期启动代码引用，故只吃「方案树 + 谓词」，树怎么遍历由调用方注入。

/** 方案树里的一层。只需要三个字段，故用最小结构约束，不 import `SavedSchemeRecord`。 */
export type SchemeTreeLike = { name?: string; children?: readonly any[]; projects?: readonly any[] };

/**
 * 从方案树里量出「当前模型所属方案」的层级路径（根 → 叶），用于算 slug。
 *
 * 命中不了（模型在别人的方案里 / 树还没到）时返回空数组 —— 调用方据此**不写 `scheme`**，
 * 而不是写一个错的。
 */
export function schemePathForModelKey(
  schemes: readonly SchemeTreeLike[] | null | undefined,
  modelKey: string
): string[] {
  const key = String(modelKey ?? "");
  if (!schemes || !key) return [];
  const walk = (records: readonly SchemeTreeLike[], prefix: string[]): string[] | null => {
    for (const record of records ?? []) {
      const path = [...prefix, String(record?.name ?? "")];
      for (const project of record?.projects ?? []) {
        if (String((project as any)?.id ?? "") === key) return path;
      }
      const found = walk((record?.children ?? []) as readonly SchemeTreeLike[], path);
      if (found) return found;
    }
    return null;
  };
  return walk(schemes, []) ?? [];
}

/** 当前模型 → 地址栏里的 `scheme=<slug>`。拿不到路径就返回空串（地址栏不写 scheme）。 */
export function schemeSlugForModelKey(
  schemes: readonly SchemeTreeLike[] | null | undefined,
  modelKey: string
): string {
  const path = schemePathForModelKey(schemes, modelKey);
  if (path.length === 0) return "";
  return schemePathSlugPrefixes(path).join("/");
}

/**
 * 在方案树里按「模型稳定序号 idx」找模型记录。
 *
 * 与按 key 找的区别：idx 跨方案唯一且改名后不变，故**不需要**先知道方案。
 * 返回 `{ record, scheme }`，`scheme` 供 `requestLoadSavedProject` 用。
 */
export function findSavedProjectByIndex(
  schemes: readonly SchemeTreeLike[] | null | undefined,
  index: number
): { record: any; scheme: any } | null {
  if (!Number.isSafeInteger(index) || index <= 0) return null;
  const walk = (records: readonly SchemeTreeLike[]): { record: any; scheme: any } | null => {
    for (const record of records ?? []) {
      for (const project of record?.projects ?? []) {
        if (Number((project as any)?.project?.idx ?? (project as any)?.idx) === index) {
          return { record: project, scheme: record };
        }
      }
      const found = walk((record?.children ?? []) as readonly SchemeTreeLike[]);
      if (found) return found;
    }
    return null;
  };
  return walk(schemes ?? []);
}

/**
 * 在方案树里按「方案 slug」找那一层方案。slug 由 `schemePathSlugPrefixes` 生成，
 * 故这里逐层重算前缀再比较 —— `a/b` 会匹配第 2 层、且它的前缀链也必须是 `a`。
 */
export function findSchemeBySlug(
  schemes: readonly SchemeTreeLike[] | null | undefined,
  slug: string
): any | null {
  const wanted = String(slug ?? "").split("/").filter(Boolean);
  if (wanted.length === 0) return null;
  const walk = (records: readonly SchemeTreeLike[], names: string[]): any | null => {
    const prefixes = schemePathSlugPrefixes(names);
    for (const record of records ?? []) {
      const pathNames = [...names, String(record?.name ?? "")];
      const pathSlugs = schemePathSlugPrefixes(pathNames);
      // 前缀链必须完全对上，否则「不同层碰巧同 slug」会误命中
      if (pathSlugs.length === wanted.length && pathSlugs.every((s, i) => s === wanted[i])) {
        return record;
      }
      void prefixes;
      const found = walk((record?.children ?? []) as readonly SchemeTreeLike[], pathNames);
      if (found) return found;
    }
    return null;
  };
  return walk(schemes ?? [], []);
}

/**
 * 把一个「地址栏要求、但没打开成功」的模型诉求记进 sessionStorage，刷新后可重试一次。
 * 没有 sessionStorage（node / 隐私模式）时静默跳过。
 */
export const PENDING_URL_MODEL_STORAGE_KEY = "power-system-url-model";
export const PENDING_URL_MODEL_RETRY_LIMIT = 1;

type PendingUrlModel = { modelId: string; schemeId: string; modelKey: string; schemeKey: string; attempts: number };

function sessionStore(): Storage | null {
  const scope = globalThis as any;
  try {
    return scope?.sessionStorage ?? scope?.window?.sessionStorage ?? null;
  } catch {
    // 部分浏览器在「所有 Cookie 被禁」时访问 sessionStorage 会抛 SecurityError
    return null;
  }
}

export function readPendingUrlModel(): PendingUrlModel | null {
  const store = sessionStore();
  if (!store) return null;
  try {
    const raw = store.getItem(PENDING_URL_MODEL_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const modelId = String(parsed?.modelId ?? "");
    const modelKey = String(parsed?.modelKey ?? "");
    // 老记录只有 modelKey（旧格式把 key 塞在 modelId 里），两种都算有诉求
    if (!modelId && !modelKey) return null;
    return {
      modelId,
      schemeId: String(parsed?.schemeId ?? ""),
      modelKey,
      schemeKey: String(parsed?.schemeKey ?? ""),
      attempts: Number(parsed?.attempts) || 0
    };
  } catch {
    return null;
  }
}

export function writePendingUrlModel(
  modelId: string,
  schemeId: string,
  attempts: number,
  modelKey = "",
  schemeKey = ""
): void {
  const store = sessionStore();
  if (!store) return;
  try {
    store.setItem(PENDING_URL_MODEL_STORAGE_KEY, JSON.stringify({ modelId, schemeId, modelKey, schemeKey, attempts }));
  } catch {
    // 配额满：重试机会丢一次，不阻断启动
  }
}

export function clearPendingUrlModel(): void {
  const store = sessionStore();
  if (!store) return;
  try {
    store.removeItem(PENDING_URL_MODEL_STORAGE_KEY);
  } catch {
    // 同上，纯缓存，失败无副作用
  }
}

/**
 * 把当前空间/模型写进地址栏（`replaceState`，不产生历史记录、不触发重载）。
 *
 * 用 replaceState 而不是 pushState：每点一次模型就压一条历史，用户点「后退」会
 * 在模型之间来回跳 —— 那不是他理解的「后退」。切空间才是一次真正的导航。
 * 返回是否真的改了地址栏，供测试断言与调用方判断要不要通知用户。
 */
export function syncWorkspaceUrl(
  state: Partial<WorkspaceUrlState>,
  options?: { location?: Location | null; history?: History | null }
): boolean {
  const scope = globalThis as any;
  const location = options?.location ?? scope?.window?.location ?? scope?.location ?? null;
  const history = options?.history ?? scope?.window?.history ?? scope?.history ?? null;
  if (!location || !history || typeof history.replaceState !== "function") return false;
  const nextHash = buildWorkspaceHash(state);
  if (`#${normalizeHash(String(location.hash ?? ""))}` === nextHash || (!location.hash && !nextHash)) {
    return false;
  }
  try {
    history.replaceState(null, "", `${location.pathname ?? ""}${location.search ?? ""}${nextHash}`);
    return true;
  } catch {
    // 跨源 iframe / file:// 下 replaceState 会抛 SecurityError：地址栏同步是增强项，
    // 失败绝不能打断建模主流程，静默放弃即可。
    return false;
  }
}
