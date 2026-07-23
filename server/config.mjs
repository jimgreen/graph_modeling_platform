// 平台配置：端口与接口前缀。优先读环境变量，回退到 platform.config.json，再回退默认值。
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const configFile = process.env.GRAPH_MODEL_CONFIG
  ? resolve(process.env.GRAPH_MODEL_CONFIG)
  : resolve(repoRoot, "platform.config.json");

function readConfig() {
  try {
    return JSON.parse(readFileSync(configFile, "utf-8"));
  } catch {
    return {};
  }
}

const cfg = readConfig();

const trimTrailingSlash = (value) => String(value).replace(/\/+$/g, "");

// 规范化为 Vite base 合法值：以 / 开头；非根值补尾斜杠（/app -> /app/）；空或仅 / 返回 /
const normalizeBase = (value) => {
  const v = String(value ?? "/").trim() || "/";
  if (v === "/") return "/";
  const withSlash = v.endsWith("/") ? v : `${v}/`;
  return withSlash.startsWith("/") ? withSlash : `/${withSlash}`;
};

export const host = process.env.IMAGE_SERVER_HOST ?? cfg.host ?? "127.0.0.1";
export const frontendPort = Number(process.env.VITE_PORT ?? cfg.ports?.frontend ?? 5173);
export const backendPort = Number(process.env.IMAGE_SERVER_PORT ?? cfg.ports?.backend ?? 5174);
export const apiPrefix = trimTrailingSlash(
  process.env.GRAPH_MODEL_API_PREFIX ?? cfg.apiPrefix ?? "/webgrp"
);

// 前端 base 部署路径（Vite base）：前端应用挂在子路径下时配置，如 /app/。默认 /
export const frontendPrefix = normalizeBase(
  process.env.GRAPH_MODEL_FRONTEND_PREFIX ?? cfg.frontendPrefix ?? "/"
);

// 剥掉前端 base 前缀（非根时）：后端入口把 /app/icon-library/x 还原为 /icon-library/x；
// apiPrefix 开头的 API 请求不以 base 开头，原样返回。
export const stripFrontendBase = (pathname) => {
  if (frontendPrefix === "/") return pathname;
  return pathname.startsWith(frontendPrefix)
    ? pathname.slice(frontendPrefix.length - 1) || "/"
    : pathname;
};

// 转义正则元字符，用于把 apiPrefix 拼进路由正则
export const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// 拼接前缀 + 子路径，如 apiPath("/images") -> "/webgrp/images"
export const apiPath = (subPath) => `${apiPrefix}${subPath}`;

// 构建带前缀的锚定正则。sub 走转义，suffix 保留原始正则语法（如 "/?$" 或 "(?<tab>...)"）
export const apiPattern = (sub, suffix = "") =>
  new RegExp(`^${escapeRegExp(apiPath(sub))}${suffix}`, "u");
