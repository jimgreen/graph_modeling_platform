// 页面 token ↔ 地址栏参数。
//
// ## 为什么需要它
//
// 前端与后端的运行时态/写操作全走一条 WS（`/webgrp/ws`）。后端要「把指令发给哪一个页面」，
// 靠的是 WS 注册时带的 clientId。此前 clientId 存在 **localStorage** 里 —— 同一浏览器
// 开两个标签页会拿到**同一个 id**，注册表按 id 去重、后注册的顶掉前一个（见
// `server/runtimeRegistry.mjs` 的 register 注释，那里记录了一次实测缺陷）。
// 于是「多页面在线」时调用方**无法指定**要操作哪一个，MCP 只能退回「最近活跃的那个」。
//
// 解法：把 token 放进**地址栏**。每个页面一行 `?token=xxx`，用户能看见、能复制、
// 能把它交给 MCP；它同时就是 WS 注册用的 clientId，于是「地址栏里的 token」
// 与「后端注册表里的条目」一一对应。
//
// ## 为什么放 query 而不是 hash
//
// 本应用已经用 hash 存「空间 / 模型」（`src/workspaceUrl.ts` 的 `#space=…&model=…`），
// 切空间/切模型时 hash 被整体重写。token 若也放 hash，就得在每次 `syncWorkspaceUrl`
// 时小心保留它，任一处漏写就让页面丢失身份。query 与 hash 互不干扰，天然活过
// `location.reload()`（切空间正是靠 reload 生效）。
//
// ## 为什么是纯函数
//
// 本模块不碰 `window` / `document`：调用方（`runtimeWsClient.ts`）自己取
// `location.href`、自己调 `history.replaceState`。于是 node 单测可以直接喂 URL 字符串，
// 不需要 jsdom。

/** 地址栏里承载 token 的 query 参数名。MCP 工具的 `token` 参数就是它的值。 */
export const TOKEN_QUERY_KEY = "token";

/**
 * token 允许的字符集。
 *
 * 取 RFC 3986 的 unreserved（`A-Za-z0-9-._~`）而不是任意字符串：token 会进地址栏、
 * 会被用户手抄进 MCP 配置，出现空格 / 引号 / `&` / `#` 时复制链路极易被截断或转义错。
 * 长度上限 128 只是防御（真实值形如 `page-3f8a1c9d2b4e`，17 字符）。
 */
const TOKEN_PATTERN = /^[A-Za-z0-9._~-]{1,128}$/u;

/** token 是否合法（不合法时调用方应视作「没有 token」，而不是带着脏值去注册）。 */
export function isValidToken(value: unknown): boolean {
  return typeof value === "string" && TOKEN_PATTERN.test(value);
}

/**
 * 从地址栏 URL 里读 token。读不到或非法返回空串。
 *
 * @param href 完整 URL（浏览器里传 `window.location.href`）
 */
export function readTokenFromUrl(href: string): string {
  if (!href) {
    return "";
  }
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return "";
  }
  const raw = (url.searchParams.get(TOKEN_QUERY_KEY) ?? "").trim();
  return isValidToken(raw) ? raw : "";
}

/**
 * 把 token 写进 URL 的 query（保留 path / 其它 query / hash）。
 *
 * 已经一致时返回**原串**（而不是重新序列化的结果）：调用方可以据此判断
 * 「无需 replaceState」，避免每次挂载都往历史里塞一条无变化的记录。
 *
 * @param href 当前完整 URL
 * @param token 合法 token；非法时原样返回 href
 */
export function withTokenInUrl(href: string, token: string): string {
  if (!isValidToken(token)) {
    return href;
  }
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return href;
  }
  if ((url.searchParams.get(TOKEN_QUERY_KEY) ?? "") === token) {
    return href;
  }
  url.searchParams.set(TOKEN_QUERY_KEY, token);
  return url.toString();
}

/** 造一个页面 token：`page-` + 12 位十六进制（48 bit，几十个标签页内碰撞概率可忽略）。 */
export function createPageToken(randomId: (prefix?: string) => string): string {
  const raw = String(randomId("") ?? "").replace(/-/gu, "");
  // randomId 在极端环境下的兜底分支可能给出非十六进制字符，故先过滤再截断
  const hex = raw.replace(/[^0-9a-f]/giu, "").slice(0, 12);
  // 过滤后仍为空（crypto 完全不可用且兜底也异常）→ 退回时间戳，保证不影响启动
  return `page-${hex || Date.now().toString(16)}`;
}
