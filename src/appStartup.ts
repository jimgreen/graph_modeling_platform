// 启动闸门：**必须先于渲染**（见 spaceCache.ts 的 reconcileSpaceCacheOwnership 注释）。
// App 的模型/配色/量测状态是渲染期同步从 localStorage 播种的，故清缓存只能放在
// createRoot 之前；挪进 useEffect 就是事后动作，旧空间数据已进 React state。
// 不能用 useEffect 也不能把这段搬到 App 内。
//
// 两条启动路径共用本模块：
// - 独立运行：`main.tsx` 直接调用；
// - qiankun：`qiankunLifecycle.mount()` 在**绑定用户空间之后**调用 —— 顺序反了就会先按
//   旧 Cookie 的空间播种一次，用户一进来看到的是别人的数据。
import { fetchSpaces, readSpaceCookie, seedSpaces, writeSpaceCookie } from "./spaceClient";
import { rememberCacheOwnerSpace, reconcileSpaceCacheOwnership } from "./spaceCache";
import { setBootPhase } from "./startupProgress";
import { readWorkspaceUrl, spaceIdToAdopt } from "./workspaceUrl";

/**
 * 地址栏里写的空间优先于 Cookie：分享出去/存下来的链接必须打开同一个空间。
 *
 * 返回「是否改了 Cookie」—— 改了就必须把 `fetchSpaces()` 那次**作废**：
 * 它是在改 Cookie 之前发出的，后端按旧 Cookie 算出的 `current` 与空间列表都不作数。
 * 消费掉 seed 只是缓存，不消费才会让 App 读到旧空间。
 */
export function adoptUrlSpace(): boolean {
  const target = spaceIdToAdopt(readWorkspaceUrl(), readSpaceCookie());
  if (!target) return false;
  // 写入前不校验 target 是否真实存在：不存在的 id 交给后端解析链静默回退首个空间
  // （与旧书签同一处理），前端不额外自算「我是谁」。
  writeSpaceCookie(target);
  return true;
}

export async function runStartupGate(): Promise<void> {
  const adoptedFromUrl = adoptUrlSpace();
  try {
    setBootPhase("正在获取工作空间列表…");
    const initial = await fetchSpaces();
    // 这次请求已在关键路径上；把它交给 App 挂载时的首次 refreshSpaces，省掉同一条数据的第二次拉取。
    // 但它是在改 Cookie **之前**发出的：地址栏指定了别的空间时，它的 current 已作废，不能播种。
    if (!adoptedFromUrl) {
      seedSpaces(initial);
    }
    // 闸门要按**真实生效**的空间对齐缓存：改了 Cookie 就以后端重新解析的结果为准，
    // 否则会把旧空间的缓存当成新空间的对齐基线。
    const effectiveSpaceId = adoptedFromUrl ? readSpaceCookie() : initial.current;
    try {
      setBootPhase("正在校验工作空间缓存归属…");
      await reconcileSpaceCacheOwnership(effectiveSpaceId);
    } catch {
      // 清缓存失败（IDB 不可用）= 这一次没有空间校验，旧空间的浏览器缓存会照旧参与
      // 「后端读空 → 回写」，即 S2 不设防。**静默的失败比失败本身更坏**，必须让用户看见。
      // 同 spaceSwitch.notifySwitchFailure：不 import globalMessage（node 下 import 即炸），
      // 只能从全局对象取；node 下那个挂载不存在，`?.()` 是运行时必需。
      globalThis.showGlobalMessage?.("本地缓存未清理干净，本次未做空间校验，请刷新重试。");
    }
  } catch {
    // 取不到空间列表（后端未起 / 离线）属常见情形：不阻断启动、也不打扰用户 ——
    // 白屏比「这次不校验」更坏。归属记账未写，下次启动会重试。
  }
}
