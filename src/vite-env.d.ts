/// <reference types="vite/client" />

// 全局类型声明的唯一落点：Vite 环境变量 + 挂在 window 上的自建全局成员。
//
// 这里的 `export {}` 只为把本文件变成**外部模块**——脚本文件里 `declare global` 是语法错误
// （TS2669：全局扩写只能直接嵌在外部模块或 ambient module 里）。`declare global` 内部的东西
// 依旧是全局作用域的，且整个文件只有类型、没有运行时代码（不产出任何 JS）。
export {};

declare global {
  /** 全局 message 弹窗，替代 window.alert。实现见 src/globalMessage.ts，本文件只声明类型。 */
  function showGlobalMessage(text: string): void;

  /** 全局 confirm 弹窗，替代 window.confirm。resolve(true) = 用户点「确定」。 */
  function showGlobalConfirm(text: string): Promise<boolean>;

  /** 全局 prompt 弹窗，替代 window.prompt。点「取消」/ 按 Esc resolve(null)。 */
  function showGlobalPrompt(text: string, defaultValue?: string): Promise<string | null>;

  interface Window {
    /**
     * 三个弹窗：与上面的全局函数是**同一批实现**，由 src/globalMessage.ts 在模块加载期
     * 挂到 window 上（该文件末尾三行）。挂载即本文件之外唯一读法 —— 直接访问即可，
     * 不要退回 `(window as any)`。
     *
     * node 测试环境没有挂载，故读取处仍须自己判空（`typeof f === "function"` 或 `?.()`），
     * 这是运行时事实、不是类型问题。
     */
    showGlobalMessage: (text: string) => void;
    showGlobalConfirm: (text: string) => Promise<boolean>;
    showGlobalPrompt: (text: string, defaultValue?: string) => Promise<string | null>;

    /** qiankun 宿主在加载子应用前置 true；独立运行时不存在。src/main.tsx 据此决定是否自行启动。 */
    __POWERED_BY_QIANKUN__?: boolean;
  }

  interface ImportMetaEnv {
    /**
     * dev 模式下 image-server（WS 后端）端口，见 src/runtimeWsClient.ts 的 resolveUrl()。
     * 未配置（.env 里没有这一项）时为 undefined，调用点自己回落 "5174"。
     */
    readonly VITE_IMAGE_SERVER_PORT?: string;
  }
}
