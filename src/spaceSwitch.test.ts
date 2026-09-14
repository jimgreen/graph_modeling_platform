import { readFileSync } from "node:fs";

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

// 时序断言靠桩记录：清缓存与写 cookie 都换成记录器，才能断言**顺序**而不只是「都发生了」。
const clearMock = vi.hoisted(() => vi.fn());
const writeCookieMock = vi.hoisted(() => vi.fn());
const rememberOwnerMock = vi.hoisted(() => vi.fn());

vi.mock("./spaceCache", () => ({
  clearSpaceScopedBrowserCaches: clearMock,
  rememberCacheOwnerSpace: rememberOwnerMock
}));
// 只桩写 cookie；位置参数断言用得到，其余导出与本模块无关。
vi.mock("./spaceClient", () => ({ writeSpaceCookie: writeCookieMock }));

import { isSkipBeforeUnload, setSkipBeforeUnload, shouldPromptBeforeUnload, switchToSpace } from "./spaceSwitch";

let reload: ReturnType<typeof vi.fn>;
let notify: ReturnType<typeof vi.fn>;
let originalLocation: unknown;
let originalShowGlobalMessage: unknown;

beforeEach(() => {
  setSkipBeforeUnload(false);
  clearMock.mockReset();
  writeCookieMock.mockReset();
  rememberOwnerMock.mockReset();
  clearMock.mockResolvedValue(undefined);
  originalLocation = (globalThis as any).location;
  originalShowGlobalMessage = (globalThis as any).showGlobalMessage;
  reload = vi.fn();
  // node 测试环境无 location / showGlobalMessage：手搓桩。
  (globalThis as any).location = { reload };
  notify = vi.fn();
  (globalThis as any).showGlobalMessage = notify;
});

afterEach(() => {
  (globalThis as any).location = originalLocation;
  (globalThis as any).showGlobalMessage = originalShowGlobalMessage;
});

describe("switchToSpace 的时序", () => {
  test("清缓存 → 写 cookie → 置跳过标志 → reload（按序）", async () => {
    const seq: string[] = [];
    let skipAtCookieWrite: boolean | undefined;
    let skipAtReload: boolean | undefined;
    // 清缓存桩**先让出一次微任务再记录**：否则「调用但没 await」也会得到相同顺序 ——
    // push 发生在调用当刻（同步），不 await 同样排在写 cookie 之前，这条断言就没有判别力。
    clearMock.mockImplementation(async () => {
      await Promise.resolve();
      seq.push("clear");
    });
    writeCookieMock.mockImplementation((id: string) => {
      seq.push(`cookie:${id}`);
      skipAtCookieWrite = isSkipBeforeUnload();
    });
    // 记账落进 seq：它必须发生在**清完之后**（清之前记账等于把「已对齐」写在没清干净的
    // 缓存上），且要带上目标空间 id（否则重载后的闸门会误判归属、再白清一次）。
    rememberOwnerMock.mockImplementation((id: string) => {
      seq.push(`owner:${id}`);
    });
    reload.mockImplementation(() => {
      seq.push("reload");
      skipAtReload = isSkipBeforeUnload();
    });

    await switchToSpace("张三");

    expect(seq).toEqual(["clear", "cookie:张三", "owner:张三", "reload"]);
    // 置标志本身不留痕（同模块内直接调用），用两处探针把它夹在写 cookie 与 reload 之间：
    // 写 cookie 时还没置 -> 它不在清缓存/写 cookie 之前；reload 时已置 -> 它在 reload 之前。
    expect(skipAtCookieWrite).toBe(false);
    expect(skipAtReload).toBe(true);
  });

  test("清缓存失败时中止切换：不写 cookie、不 reload、提示用户重试", async () => {
    clearMock.mockRejectedValue(new Error("IndexedDB 不可用"));

    await switchToSpace("张三");

    expect(writeCookieMock).not.toHaveBeenCalled();
    expect(reload).not.toHaveBeenCalled();
    // 记账同样不能写：清都没清干净就把归属改写成新空间，等于把「已对齐」这个错误前提固化，
    // 重载后的闸门会照此放行，S2 就此打开
    expect(rememberOwnerMock).not.toHaveBeenCalled();
    expect(notify).toHaveBeenCalledTimes(1);
    // 失败原因要带给用户，否则「切不了」不可诊断
    expect(String(notify.mock.calls[0][0])).toContain("IndexedDB 不可用");
    // 中止路径也不该留下跳过标志（否则下次真正的 beforeunload 会被误跳过）
    expect(isSkipBeforeUnload()).toBe(false);
  });
});

describe("beforeunload 跳过标志", () => {
  const prompting = { saveRequired: true, isViteFullReload: false, isDev: false };

  test("无标志时按未保存状态挽留，置标志后不挽留", () => {
    expect(shouldPromptBeforeUnload(prompting)).toBe(true);

    setSkipBeforeUnload(true);
    expect(shouldPromptBeforeUnload(prompting)).toBe(false);

    setSkipBeforeUnload(false);
    expect(shouldPromptBeforeUnload(prompting)).toBe(true);
  });

  test("无未保存修改 / Vite 整页重载 / 开发模式都不挽留", () => {
    expect(shouldPromptBeforeUnload({ ...prompting, saveRequired: false })).toBe(false);
    expect(shouldPromptBeforeUnload({ ...prompting, isViteFullReload: true })).toBe(false);
    expect(shouldPromptBeforeUnload({ ...prompting, isDev: true })).toBe(false);
  });

  // **源码级断言**（不是行为断言）：handler 依赖 import.meta.env.DEV，而 vitest 下 DEV 恒真，
  // 判定永远短路 —— 在 node 环境里造不出「DEV 为假」的真实调用，行为验不了。
  // 它证明的只有一件事：handler 用的是 shouldPromptBeforeUnload，而不是退回老的内联条件
  // （退回去 = 跳过标志失效，切空间重载会被浏览器拦一次「离开本站？」）。
  test("beforeunload handler 的判定接上了 shouldPromptBeforeUnload（源码级）", () => {
    const source = readFileSync(new URL("./appExtracted/appToolbarHookFactories.tsx", import.meta.url), "utf8");

    expect(source).toContain(
      "if (!shouldPromptBeforeUnload({ saveRequired, isViteFullReload, isDev: import.meta.env.DEV }))"
    );
  });
});
