// 空间注册表 + 路径工厂 + 越界断言。
// default 空间直接复用数据根：既有 data/ 原地不动（9 个后端测试与 3 处测试
// 直读仓库 data/ 的扁平布局，搬迁会让它们静默失效）。
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, rename, writeFile } from "node:fs/promises";
import { join, resolve, sep } from "node:path";
import { spaceIdFromName, isValidSpaceId, isReservedSpaceId, normalizeSpaceName } from "./spaceId.mjs";

const SCHEMA_VERSION = 1;
const DEFAULT_SPACE_ID = "default";
const SPACES_DIR_NAME = "workspaces";
const TRASH_DIR_NAME = "trash-spaces";

// 空间**名**唯一性（id 唯一性是另一回事，空间名是用户认空间的凭据）。
// 比较按归一化后的名字**精确匹配**（不做大小写折叠）：能被用户分辨的名字就该是两个空间。
// 带上冲突者的 id，调用方（HTTP 层）才能在 409 里告诉前端「撞的是哪一个」。
export const SPACE_NAME_DUPLICATE = "SPACE_NAME_DUPLICATE";

export function duplicateSpaceNameError(name, id) {
  const error = new Error(`空间名「${name}」已存在。`);
  error.code = SPACE_NAME_DUPLICATE;
  error.spaceName = name;
  error.spaceId = id;
  return error;
}

// 空间**归属**（= qiankun 宿主传进来的登录用户名）。
// **它不是权限**：后端没有鉴权，归属只用于前端把空间列表收窄到「自己的那些」，
// 故只做 trim 与长度上限，不做唯一性/合法性校验（用户名不归空间系统管）。
// 老数据没有这个字段 = 无主空间（历史空间、default），照样可读可写。
export const MAX_SPACE_OWNER_LENGTH = 64;

export function normalizeSpaceOwner(value) {
  return String(value ?? "").trim().slice(0, MAX_SPACE_OWNER_LENGTH);
}

const findByName = (spaces, name) => spaces.find((space) => normalizeSpaceName(space.name) === name) ?? null;

// 越界双保险：必须特判 default —— 它的根是 dataRoot，不在 workspacesRoot 之下。
export function assertInSpace(id, root, dataRoot) {
  const resolved = resolve(root);
  if (id === DEFAULT_SPACE_ID) {
    if (resolved !== resolve(dataRoot)) {
      throw new Error("default 空间的根必须等于数据根。");
    }
    return;
  }
  const base = resolve(dataRoot, SPACES_DIR_NAME);
  if (resolved !== base && !resolved.startsWith(base + sep)) {
    throw new Error(`空间「${id}」路径越界：${resolved}`);
  }
}

// 某一空间的全部路径（纯字符串拼接，无 IO）
export function spacePathsFor(dataRoot, id) {
  const root = id === DEFAULT_SPACE_ID
    ? resolve(dataRoot)
    : join(resolve(dataRoot), SPACES_DIR_NAME, id);
  const images = join(root, "images");
  const settings = join(root, "settings");
  const deviceLibraryDir = join(root, "device-library");
  const schemes = join(root, "schemes");
  return {
    root,
    images,
    icons: join(root, "icons"),
    schemes,
    schemeFiles: join(schemes, "files"),
    schemeTrash: join(schemes, "trash"),
    settings,
    colorConfig: join(settings, "color-config.json"),
    measurementConfig: join(settings, "measurement-config.json"),
    deviceLibraryDir,
    deviceLibrary: join(deviceLibraryDir, "library.json"),
    manifest: join(images, "manifest.json"),
    imageFolders: join(images, "folders.json")
  };
}

export function createSpaceStore(dataRoot) {
  const resolvedRoot = resolve(dataRoot);
  const spacesFile = join(resolvedRoot, "spaces.json");
  const workspacesRoot = join(resolvedRoot, SPACES_DIR_NAME);

  let state = null;              // { schemaVersion, spaces: Space[] }
  let modelLock = Promise.resolve();   // 注册表读-改-写串行化

  const locked = (task) => {
    const run = modelLock.then(task, task);
    modelLock = run.then(() => undefined, () => undefined);
    return run;
  };

  async function writeState(next) {
    await mkdir(resolvedRoot, { recursive: true });
    // 同进程可能存在第二个 store 实例（服务端注入场景），只用 pid 会撞 tmp 文件
    const tmp = `${spacesFile}.${process.pid}.${randomUUID()}.tmp`;
    await writeFile(tmp, JSON.stringify(next, null, 2), "utf-8");
    await rename(tmp, spacesFile);
    state = next;
  }

  function normalizeSpace(raw) {
    const id = String(raw?.id ?? "");
    const owner = normalizeSpaceOwner(raw?.owner);
    return {
      id,
      name: String(raw?.name ?? id),
      pinned: id === DEFAULT_SPACE_ID,
      createdAt: raw?.createdAt ?? new Date().toISOString(),
      // 空归属不落字段：否则「无主」会以空串形态散进注册表，判据要写成两个
      ...(owner ? { owner } : {}),
      ...(raw?.lastAccessAt ? { lastAccessAt: String(raw.lastAccessAt) } : {})
    };
  }

  // 扫描 workspaces/ 补登记手工放入的目录；非法名跳过并告警。
  async function scanWorkspaces(known) {
    let entries = [];
    try {
      entries = await readdir(workspacesRoot, { withFileTypes: true });
    } catch {
      return known;
    }
    const result = [...known];
    const taken = new Set(result.map((s) => s.id.toLowerCase()));
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const id = entry.name;
      if (taken.has(id.toLowerCase())) continue;
      // 与生成路径同一套校验：否则手工放入的 con / 超长名 / 非法字符目录会变成合法空间
      if (!isValidSpaceId(id) || isReservedSpaceId(id)) {
        console.warn(`[空间] 跳过非法空间目录：${id}`);
        continue;
      }
      taken.add(id.toLowerCase());
      result.push(normalizeSpace({ id, name: id }));
    }
    return result;
  }

  async function load() {
    if (state) return state;
    let parsed = null;
    try {
      parsed = JSON.parse(await readFile(spacesFile, "utf-8"));
    } catch {
      parsed = null;
    }
    const rawSpaces = Array.isArray(parsed?.spaces) ? parsed.spaces : [];
    const normalized = rawSpaces
      .map(normalizeSpace)
      .filter((space) => isValidSpaceId(space.id) && !isReservedSpaceId(space.id));
    if (!normalized.some((space) => space.id === DEFAULT_SPACE_ID)) {
      normalized.unshift(normalizeSpace({ id: DEFAULT_SPACE_ID, name: "默认空间" }));
    }
    state = { schemaVersion: SCHEMA_VERSION, spaces: await scanWorkspaces(normalized) };
    return state;
  }

  async function ensureSkeleton(id) {
    const paths = spacePathsFor(resolvedRoot, id);
    // default 空间目录已存在，不新建（避免在数据根下多出空目录）
    if (id !== DEFAULT_SPACE_ID) {
      await mkdir(paths.root, { recursive: true });
    }
    return paths;
  }

  return {
    async ensureInitialized() {
      // 走 locked：否则与并发的 create 交错时，写回的是 load 时的旧快照，会回滚刚建的空间
      return locked(async () => {
        await writeState(await load());
      });
    },

    async list() {
      return (await load()).spaces.map((space) => ({ ...space }));
    },

    firstId() {
      const spaces = state?.spaces ?? [];
      return spaces[0]?.id ?? DEFAULT_SPACE_ID;
    },

    has(id) {
      return (state?.spaces ?? []).some((space) => space.id === id);
    },

    resolvePaths(id) {
      const exists = state ? state.spaces.some((s) => s.id === id) : id === DEFAULT_SPACE_ID;
      if (!exists) {
        throw new Error(`未知空间：${id}`);
      }
      const paths = spacePathsFor(resolvedRoot, id);
      assertInSpace(id, paths.root, resolvedRoot);
      return paths;
    },

    /**
     * 建空间。`onDuplicate` 只管**显示名**撞车，id 去重（spaceIdFromName 加 -2/-3 后缀）永远生效，
     * 两者不是一回事：不同名可以 slug 成同一个 id（"a/b" 与 "a b"）。
     * - `"allow"`（默认）：照旧建 —— 非 HTTP 调用方（测试、脚本）沿用旧语义。
     * - `"reject"`：抛 SPACE_NAME_DUPLICATE，由调用方转 409。
     * 检查与建在**同一把锁内**：分两次调用时，两个并发同名创建会双双通过校验，各建一个同名空间。
     * `owner` 是归属（见 normalizeSpaceOwner），缺省 = 无主空间。
     */
    async create(name, { onDuplicate = "allow", owner } = {}) {
      return locked(async () => {
        const current = await load();
        const trimmed = normalizeSpaceName(name);
        const clash = findByName(current.spaces, trimmed);
        if (clash && onDuplicate === "reject") {
          throw duplicateSpaceNameError(trimmed, clash.id);
        }
        const id = spaceIdFromName(trimmed, current.spaces.map((s) => s.id));
        const space = normalizeSpace({ id, name: trimmed || id, owner });
        const next = { ...current, spaces: [...current.spaces, space] };
        await ensureSkeleton(id);
        await writeState(next);
        return { ...space };
      });
    },

    async rename(id, name) {
      return locked(async () => {
        const current = await load();
        const index = current.spaces.findIndex((space) => space.id === id);
        if (index < 0) throw new Error(`未知空间：${id}`);
        const trimmed = normalizeSpaceName(name);
        if (!trimmed) throw new Error("空间名不能为空。");
        // 改名撞上别人（不含自己 —— 原样改回原名是合法 no-op）→ 与新建同一条唯一性规则
        const clash = findByName(current.spaces.filter((space) => space.id !== id), trimmed);
        if (clash) throw duplicateSpaceNameError(trimmed, clash.id);
        const spaces = current.spaces.slice();
        // 只改 name，绝不 rename 目录：搬迁用户数据失败一次就是数据事故
        spaces[index] = { ...spaces[index], name: trimmed };
        await writeState({ ...current, spaces });
      });
    },

    async remove(id) {
      return locked(async () => {
        const current = await load();
        if (id === DEFAULT_SPACE_ID) {
          throw new Error("default 空间为 pinned，且是最后一个空间，不可删除。");
        }
        const index = current.spaces.findIndex((space) => space.id === id);
        if (index < 0) throw new Error(`未知空间：${id}`);
        const paths = spacePathsFor(resolvedRoot, id);
        assertInSpace(id, paths.root, resolvedRoot);
        if (existsSync(paths.root)) {
          const stamp = new Date().toISOString().replace(/[:.]/g, "-");
          const trash = join(resolvedRoot, TRASH_DIR_NAME, stamp, id);
          await mkdir(join(resolvedRoot, TRASH_DIR_NAME, stamp), { recursive: true });
          await rename(paths.root, trash);
        }
        const spaces = current.spaces.filter((space) => space.id !== id);
        await writeState({ ...current, spaces });
      });
    },

    async touchLastAccess(id) {
      return locked(async () => {
        const current = await load();
        const index = current.spaces.findIndex((space) => space.id === id);
        if (index < 0) return;
        const spaces = current.spaces.slice();
        spaces[index] = { ...spaces[index], lastAccessAt: new Date().toISOString() };
        await writeState({ ...current, spaces });
      });
    }
  };
}

export const SPACE_COOKIE_NAME = "gmp_space";
export const SPACE_FALLBACK_HEADER = "X-Space-Fallback";

export function parseSpaceCookie(cookieHeader) {
  for (const part of String(cookieHeader ?? "").split(";")) {
    const index = part.indexOf("=");
    if (index < 0) continue;
    if (part.slice(0, index).trim() !== SPACE_COOKIE_NAME) continue;
    const raw = part.slice(index + 1).trim();
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  }
  return "";
}

// 解析优先级：X-Space 头 > ?space= > Cookie > 回退 spaces[0]。
// 显式来源（头/query）未知时置 unknown，由调用方返回 400 —— 脚本显式写错空间
// 却静默落到别处会污染错的空间，是最难查的一类 bug。
// 隐式来源（cookie）未知时静默回退：旧书签、清过 cookie 的浏览器不该白屏。
export function resolveSpaceFromRequest(request, url, store) {
  // 头值须为 ByteString（浏览器/undici 都拒绝非 ASCII 头值），故非 ASCII id
  // 必须由调用方 percent-encode；这里与 cookie 分支对称地解码一次。
  // 裸 ASCII 值（如 zhangsan）解码后恒等，向后兼容。
  // ?space= 不在此解码：URLSearchParams.get 已解码，再解一次会把 %25 类值解坏。
  let header = String(request?.headers?.["x-space"] ?? "").trim();
  try {
    header = decodeURIComponent(header);
  } catch {
    // 非法百分号序列：按原值使用，交由下方未知空间分支处理
  }
  const query = String(url?.searchParams?.get("space") ?? "").trim();
  const cookie = parseSpaceCookie(request?.headers?.cookie);

  for (const [value, source] of [[header, "header"], [query, "query"]]) {
    if (!value) continue;
    if (store.has(value)) return { id: value, source, explicit: true, unknown: false };
    // unknownValue 供调用方在 400 响应里说清是哪个 id 被拒
    return { id: store.firstId(), source, explicit: true, unknown: true, unknownValue: value };
  }
  if (cookie && store.has(cookie)) {
    return { id: cookie, source: "cookie", explicit: false, unknown: false };
  }
  return { id: store.firstId(), source: "fallback", explicit: false, unknown: false };
}

// v1 数据域（schemes / library）路由包装：paths 必须由派发层（server.mjs 的 ...spaceCtx）
// 按空间注入。缺 paths 时 handler 内的 `options.paths ?? defaultPaths` 会静默读默认空间
// 的数据 —— 与会话域「缺 spaceId 静默取全局活跃者」同类，故一并显式拒绝。
export function withSpacePaths(handler) {
  return (route) => {
    if (!route?.paths) {
      // 接线 bug：派发层对这两个域的 v1 路由恒注入 paths，缺失即说明有人绕过了它。
      throw new Error("缺少 paths：v1 数据域 handler 必须由派发层注入空间路径。");
    }
    return handler(route);
  };
}
