// 仅 qiankun 模式：把宿主传入的登录用户绑到「他自己的空间」，并把空间列表收窄到这些空间。
//
// 为什么需要：空间标识只走 Cookie（`gmp_space`），而 qiankun 下子应用与宿主同源、
// 共用同一份 `document.cookie` —— 所有用户若不显式绑定，就一起落到后端解析链的
// fallback 空间（`spaces[0]`），彼此的方案/图片互相可见。
//
// 为什么必须在启动闸门之前调用：闸门用 `fetchSpaces().current`（后端按 Cookie 解析）
// 对齐浏览器缓存归属；Cookie 晚于它写入，App 会先按旧空间播种一次状态与缓存。
//
// 归属怎么记：空间条目上的 `owner`（见 server/spaceStore.mjs 的 normalizeSpaceOwner）。
// 一个用户可以有**多个**空间，进哪一个由下面的绑定规则决定。
//
// 独立性：本模块只被 `qiankunLifecycle.mount()` 与顶栏空间 UI 调用，且所有出口都以
// `currentQiankunUser()` 为空作为「不生效」的判据 —— 独立运行时行为与加此功能前一致。
import { createSpace, fetchSpaces, readSpaceCookie, writeSpaceCookie, type Space } from "./spaceClient";

/**
 * 归属判据，两种命中方式：
 * 1. `owner` 等于用户名（正常路径）；
 * 2. **无主且名字等于用户名** —— 旧版按「空间名 == 用户名」绑定时留下的空间（如 `tsysmart`），
 *    不认领也能继续用，免得升级后老空间变孤儿。
 */
function belongsToUser(space: Pick<Space, "name" | "owner">, user: string): boolean {
  if (space.owner) return space.owner === user;
  return space.name === user;
}

/** 取最近访问的空间：`lastAccessAt` 优先，其次 `createdAt`（都是 ISO 串，按字典序比较即可） */
function mostRecentlyUsed<T extends { createdAt?: string; lastAccessAt?: string }>(
  spaces: readonly T[]
): T | undefined {
  const stamp = (space: T) => space.lastAccessAt ?? space.createdAt ?? "";
  return [...spaces].sort((a, b) => stamp(b).localeCompare(stamp(a)))[0];
}

/**
 * 把当前会话绑到宿主登录用户的空间，并把 `gmp_space` Cookie 指过去。
 *
 * 规则（一个用户可能有多个空间）：
 * 1. Cookie 指的那个**属于自己** → 沿用（尊重上次选择，也支持在自己空间之间来回切）；
 * 2. 否则 → 进自己最近访问过的那个；
 * 3. 第一次来 → 建一个以用户名命名的空间（归属自己），之后可再自建更多。
 *
 * 失败一律吞掉：绑不上就退回后端解析链（与加此功能前完全一致），
 * 不能因为宿主没传用户 / 后端离线而白屏。
 */
export async function bindUserSpaceToSession(user: unknown): Promise<void> {
  const name = String(user ?? "").trim();
  // 宿主没传用户（旧版宿主、未登录、cookie 过期）→ 维持原行为
  if (!name) return;
  try {
    const mine = (await fetchSpaces()).spaces.filter((space) => belongsToUser(space, name));
    const cookieId = readSpaceCookie();
    if (cookieId && mine.some((space) => space.id === cookieId)) return;
    const recent = mostRecentlyUsed(mine);
    if (recent) {
      writeSpaceCookie(recent.id);
      return;
    }
    writeSpaceCookie((await createUserSpace(name)).id);
  } catch (error) {
    console.warn("[qiankun] 用户空间绑定失败，沿用后端解析链的空间", error);
  }
}

// 建自己的空间。撞名（409）说明并发下已被另一个标签页建出来 → 回读一次认领它；
// 名字不合法（400，用户名全是符号）时回读也找不到，原样抛出，由调用方降级。
async function createUserSpace(name: string): Promise<Space> {
  try {
    return await createSpace(name, name);
  } catch (error) {
    const retry = (await fetchSpaces()).spaces.find((space) => belongsToUser(space, name));
    if (retry) return retry;
    throw error;
  }
}

/**
 * qiankun 下宿主注入的当前登录用户；非 qiankun（独立运行）或宿主没传时返回空串。
 *
 * 空串 = 「不锁定空间 UI」：独立运行的顶栏空间管理保持原样，不受本模块影响。
 * 这是本模块**唯一**的 qiankun 判据出口 —— 其余函数都靠它为空来退化成 no-op。
 */
export function currentQiankunUser(): string {
  // 走 globalThis.window 而不是裸 window：本函数在渲染期被顶栏调用，
  // 而 node 测试环境没有 window —— 裸引用会直接 ReferenceError（浏览器里两者同一对象）。
  const scope = globalThis as any;
  if (!scope.window?.__POWERED_BY_QIANKUN__) return "";
  return String(scope.window.__QIANKUN_PROPS__?.user ?? "").trim();
}

/**
 * 把空间列表收窄到「宿主当前登录用户自己的空间」。
 *
 * 非 qiankun 或没传用户时**原样返回**，调用方无需分支。
 * 注意这是**界面维度**的收窄：后端没有鉴权，手工改 Cookie 仍能切到别人的空间 ——
 * 要真隔离得在服务端加鉴权，不在本次范围内。
 */
export function filterSpacesForCurrentUser<T extends { name: string; owner?: string }>(
  spaces: readonly T[] | undefined
): readonly T[] | undefined {
  const user = currentQiankunUser();
  if (!user) return spaces;
  return (Array.isArray(spaces) ? spaces : []).filter((space) => belongsToUser(space, user));
}
