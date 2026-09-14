// 空间切换时序编排：**清浏览器缓存 → 写空间 Cookie → 置跳过 beforeunload 标志 → 硬重载**。
//
// 顺序不可换（阶段一 spec §6.2）：先写 Cookie 再清缓存，清的就是**新**空间名下的浏览器数据 ——
// 而此刻缓存里装的还是旧空间的东西，把它当新空间的清掉等于没清，之后「后端读空 → 回写本地缓存」
// 还会把旧空间数据静默持久化到新空间。故 `clearSpaceScopedBrowserCaches()` 必须先跑。
//
// 清不干净就不切：见 spaceCache.ts 的调用契约（IDB 错误向上抛，本模块负责中止并告知用户）。

import { writeSpaceCookie } from "./spaceClient";
import { clearSpaceScopedBrowserCaches, rememberCacheOwnerSpace } from "./spaceCache";

// 与 appDeviceDefinitionFactories 的 skipSaveCheck 同形态（模块级 let + 一对读写函数），
// 但**刻意不复用后者**：`getSkipSaveCheck()` 被导出流程消费
// （appDeviceDefinitionFactories.tsx:2306 `if (getSkipSaveCheck() || __appScope.canExportCurrentModel)`），
// 共用会让「切空间」与「导出」互相干扰 —— 切空间置了标志，导出就会跳过保存检查。
let skipBeforeUnloadFlag = false;

export function setSkipBeforeUnload(value: boolean): void {
  skipBeforeUnloadFlag = value;
}

export function isSkipBeforeUnload(): boolean {
  return skipBeforeUnloadFlag;
}

/**
 * beforeunload 是否需要挽留用户。
 *
 * 抽成纯函数是为了能在 node 测试环境断言「置标志后不再挽留」——handler 本体要真实
 * beforeunload 事件与 React 渲染，测试环境两样都没有，行为只能落在这一层验。
 */
export function shouldPromptBeforeUnload(options: {
  saveRequired: boolean;
  isViteFullReload: boolean;
  isDev: boolean;
}): boolean {
  return Boolean(options.saveRequired) && !options.isViteFullReload && !options.isDev && !skipBeforeUnloadFlag;
}

// 失败提示走 window 上的 showGlobalMessage（src/globalMessage.ts 挂的，main.tsx 已 import）。
// **不 import 那个模块**：它在模块顶层写 window，node 测试环境无 window，import 即炸；
// 而本模块要能在 node 下被测。
function notifySwitchFailure(text: string): void {
  (globalThis as any).showGlobalMessage?.(text);
}

/**
 * 切换到目标空间。失败（缓存没清干净）时**中止**：不写 Cookie、不 reload，并提示用户重试。
 *
 * 返回 Promise 只为让调用方/测试能等到落定（重载前的最后一步是同步的）；调用点无需 await。
 */
export async function switchToSpace(id: string): Promise<void> {
  try {
    await clearSpaceScopedBrowserCaches();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    notifySwitchFailure(`切换空间失败：本地缓存未清理干净，已取消切换。请重试。\n${message}`);
    return;
  }
  writeSpaceCookie(id);
  // 紧随其后的 reload 会跑启动闸门（spaceCache.ts 的 reconcileSpaceCacheOwnership）。
  // 若此刻不记账，闸门会看到「记账=旧空间、current=新空间」而**再清一次** —— 那不是
  // 注释里说的「空操作」：它要 `initDeviceLibraryDB()` 开连接 + 一个 readwrite 事务 +
  // 4 个 `store.clear()`，且全在 `createRoot` **之前**、每次切换必发生。
  // 更坏的一种：若那次 reload 的 `fetchSpaces()` 恰好失败（闸门拿不到 current 也就不记
  // 账），记账会一直停在旧空间 —— 用户在新空间攒下的草稿会在下一次成功启动的「对齐」
  // 里被清掉，正是 spaceCache.ts 声明要避免的那件事。
  rememberCacheOwnerSpace(id);
  setSkipBeforeUnload(true);
  location.reload();
}
