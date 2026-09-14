// 前端空间客户端：空间 Cookie 读写 + /webgrp/spaces 管理面封装。
// 空间标识只用 Cookie（前端不设 X-Space 头）；请求封装复用 fetchBackendJson。
import { apiPath } from "./config";
import { backendErrorMessage, backendJsonRequest, fetchBackendJson } from "./appExtracted/appCoreCanvasUtilities";

export type Space = {
  id: string;
  name: string;
  pinned?: boolean;
  createdAt: string;
  lastAccessAt?: string;
};

export const SPACE_COOKIE_NAME = "gmp_space";

// 与后端 `safeFilePart`（`shared/pathSafety.mjs` 的 `sanitizeSegment`）同规则：前端无法 import 那个模块
// （它依赖 `node:path`），故此处是刻意的跨边界镜像实现 —— 同本文件 `readSpaceCookie` 对
// `parseSpaceCookie` 的先例。用途：导出文件名与后端**包内顶层目录名**取同一个值，
// 否则「带/斜杠」这类空间名会让另存为窗口拿到非法文件名（落到「打开保存窗口失败」的误导分支）。
const MAX_FILE_PART_LENGTH = 80;
export function sanitizeSpaceFileName(value: string): string {
  const cleaned = String(value ?? "")
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "_")
    .slice(0, MAX_FILE_PART_LENGTH)
    .replace(/^\.+$/, "");
  return cleaned || "空间";
}

// 空间 id 主形态是中文（见 server/spaceId.mjs），故必须 encodeURIComponent：
// 裸中文不是合法 ByteString，fetch 发头时直接抛 TypeError；后端 parseSpaceCookie
// 只 decodeURIComponent 一次，编码与它对称才能还原，否则静默落到 fallback 空间。
// Path=/ 不可省：前端挂在子路径（frontendBase）下时，缺它则子路径页面与 WS 握手都读不到。
export function writeSpaceCookie(id: string): void {
  document.cookie = `${SPACE_COOKIE_NAME}=${encodeURIComponent(id)}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

// 与后端 parseSpaceCookie 同一套解析（取名为 gmp_space 的那段，解码一次）。
// 前端无法 import 后端模块（其依赖 node:fs），故此处是刻意的跨边界镜像实现。
export function readSpaceCookie(): string {
  for (const part of document.cookie.split(";")) {
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

// 启动闸门（main.tsx）为了对齐缓存归属，已经在 `createRoot` **之前**拉过一次
// `/spaces`——那次还在首屏关键路径上。App 挂载时的首次 `refreshSpaces` 再拉一次
// 就是纯重复（两个请求抢同一条连接、拿同一份数据）。
// 故留一个**一次性**种子：只被第一个消费者取走，之后一律真请求 ——
// 那之后的调用都发生在挂载与增删空间之后，留缓存只会带来陈旧。
let seededSpaces: { spaces: Space[]; current: string } | null = null;

export function seedSpaces(payload: { spaces: Space[]; current: string }): void {
  seededSpaces = payload;
}

// current 由后端解析链算出（头 > query > cookie > 回退），前端不自算「我是谁」
export async function fetchSpaces(): Promise<{ spaces: Space[]; current: string }> {
  if (seededSpaces) {
    const payload = seededSpaces;
    seededSpaces = null;
    return payload;
  }
  return fetchBackendJson<{ spaces: Space[]; current: string }>(apiPath("/spaces"), "读取空间列表失败。");
}

export async function createSpace(name: string): Promise<Space> {
  return fetchBackendJson<Space>(apiPath("/spaces"), "新建空间失败。", backendJsonRequest("POST", JSON.stringify({ name })));
}

// 导出当前空间为 ZIP（文件名后端走 content-disposition，命名归上层调用方）。
// **不**走 fetchBackendJson —— 那个封装会 response.json()，二进制体要用 blob()。
export async function exportSpaceArchive(): Promise<Blob> {
  const response = await fetch(apiPath("/spaces/export"));
  if (!response.ok) {
    throw new Error(await backendErrorMessage(response, "导出空间压缩包失败。"));
  }
  return response.blob();
}

// 空间**名**撞车的错误码，与后端 `server/spaceStore.mjs` 的 SPACE_NAME_DUPLICATE 同码
//（跨边界镜像，同本文件 readSpaceCookie 对 parseSpaceCookie 的先例）。
export const SPACE_NAME_DUPLICATE = "SPACE_NAME_DUPLICATE";

/**
 * 空间名已被占用（后端 409）。
 *
 * 带上冲突者的名字与 id，导入侧才能弹「覆盖 / 重命名」询问。
 * 冲突者名字存 `spaceName` 而**不是** `name` —— 后者是 Error 的内置属性（"Error"），盖掉它会毁掉堆栈可读性。
 */
export class SpaceNameConflictError extends Error {
  readonly code = SPACE_NAME_DUPLICATE;
  readonly spaceName: string;
  readonly conflictId: string;
  constructor(message: string, spaceName: string, conflictId: string) {
    super(message);
    this.spaceName = spaceName;
    this.conflictId = conflictId;
  }
}

export type SpaceImportMode = "overwrite" | "rename";

/**
 * 导入空间 ZIP。回执是 sendJson 裸对象（不是 v1 的 {ok,data} 信封），故直接读 payload.space。
 *
 * `mode` 缺省 = 包内名撞车时后端回 409（抛 {@link SpaceNameConflictError}），由上层问过用户再带 mode 重发：
 * - `"overwrite"`：先删同名空间（目录进 trash-spaces/）再建；
 * - `"rename"`：以 `name` 作空间名导入（新名再撞车还是 409，可再问一次）。
 */
export async function importSpaceArchive(
  file: File,
  options: { mode?: SpaceImportMode; name?: string } = {}
): Promise<{ space: Space; spaces: Space[] }> {
  const query = new URLSearchParams();
  if (options.mode) query.set("mode", options.mode);
  if (options.name) query.set("name", options.name);
  const suffix = String(query);
  const response = await fetch(apiPath(`/spaces/import${suffix ? `?${suffix}` : ""}`), {
    method: "POST",
    headers: { "content-type": file.type || "application/zip" },
    body: file
  });
  if (!response.ok) {
    // 409 的冲突信息在正文里，而 backendErrorMessage 会把正文读掉：先克隆一份留给它，
    // 「两种错误形态怎么取 message」仍只由那一个出口负责，不在本文件重写一遍。
    const conflictPayload = response.status === 409
      ? await response.clone().json().catch(() => null)
      : null;
    const message = await backendErrorMessage(response, "导入空间压缩包失败。");
    if (conflictPayload?.error?.code === SPACE_NAME_DUPLICATE) {
      throw new SpaceNameConflictError(
        message,
        String(conflictPayload.name ?? ""),
        String(conflictPayload.conflictId ?? "")
      );
    }
    throw new Error(message);
  }
  const payload = (await response.json().catch(() => null)) as { space?: Space; spaces?: Space[] } | null;
  // 200 但回执缺 space 属协议违约：宁可报错，也不要返回 space=undefined 的半成品给上层
  if (!payload?.space) throw new Error("导入空间压缩包失败：后端回执缺少 space。");
  return { space: payload.space, spaces: payload.spaces ?? [] };
}
