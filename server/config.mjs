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

export const host = process.env.IMAGE_SERVER_HOST ?? cfg.host ?? "127.0.0.1";
export const frontendPort = Number(process.env.VITE_PORT ?? cfg.ports?.frontend ?? 5173);
export const backendPort = Number(process.env.IMAGE_SERVER_PORT ?? cfg.ports?.backend ?? 5174);
export const apiPrefix = trimTrailingSlash(
  process.env.GRAPH_MODEL_API_PREFIX ?? cfg.apiPrefix ?? "/webgrp"
);

// 转义正则元字符，用于把 apiPrefix 拼进路由正则
export const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// 拼接前缀 + 子路径，如 apiPath("/images") -> "/webgrp/images"
export const apiPath = (subPath) => `${apiPrefix}${subPath}`;

// 构建带前缀的锚定正则。sub 走转义，suffix 保留原始正则语法（如 "/?$" 或 "(?<tab>...)"）
export const apiPattern = (sub, suffix = "") =>
  new RegExp(`^${escapeRegExp(apiPath(sub))}${suffix}`, "u");
