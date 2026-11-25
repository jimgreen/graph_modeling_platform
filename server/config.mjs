// 平台配置：端口与接口前缀。优先读环境变量，回退到 platform.config.json，再回退默认值。
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { parseProjectName, selectPlatformConfig } from "./projectConfig.mjs";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const selectedConfig = selectPlatformConfig({
  repoRoot,
  projectName: parseProjectName(),
  explicitConfigPath: process.env.GRAPH_MODEL_CONFIG
});
const configFile = selectedConfig.platformConfigPath;

export const repositoryRoot = repoRoot;
export const platformConfigPath = configFile;
export const projectName = selectedConfig.projectName;
export const projectDirectory = selectedConfig.projectDirectory;
const cfg = selectedConfig.config;

const trimTrailingSlash = (value) => String(value).replace(/\/+$/g, "");

// 规范化为 Vite base 合法值：以 / 开头；非根值补尾斜杠（/app -> /app/）；空或仅 / 返回 /
const normalizeBase = (value) => {
  const v = String(value ?? "/").trim() || "/";
  if (v === "/") return "/";
  const withSlash = v.endsWith("/") ? v : `${v}/`;
  return withSlash.startsWith("/") ? withSlash : `/${withSlash}`;
};

export const host = process.env.IMAGE_SERVER_HOST ?? cfg.host ?? "127.0.0.1";

// 端口归一。默认值只在 fallback 参数里写一处，避免「取值链里一个 ?? 默认 + 参数里
// 再一个 fallback」两个真值源。
//   - null / undefined 视同未设。**不能只靠 Number 的有限性兜底**：Number(null) 得 0，
//     而 0 传给 listen 是「随机端口」—— 比回落默认值更糟：服务确实起来了，但没人
//     知道它在哪。取值链里的 ?? 只能挡住左操作数为 nullish 的情形，挡不住
//     cfg.frontend.port 本身就是 null。
//   - 空串 / 纯空白同理视同未设（Number("") === 0，同一个坑）。
//   - listen 接受的是 1..65535 的整数。NaN / Infinity 非有限（表现为 RangeError）；
//     0 是上面说的「随机端口」；越界（<1 或 >65535）与非整数（如 1.5）会让
//     server.listen **同步**抛 ERR_SOCKET_BAD_PORT，服务直接起不来 —— 四者皆回落。
// 合法数字与数字字符串（如 "3000"）行为不变。
const toPort = (value, fallback) => {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "string" && value.trim() === "") return fallback;
  const port = Number(value);
  return Number.isInteger(port) && port >= 1 && port <= 65535 ? port : fallback;
};

export const frontendPort = toPort(process.env.VITE_PORT ?? cfg.frontend?.port, 5173);
export const backendPort = toPort(process.env.IMAGE_SERVER_PORT ?? cfg.backend?.port, 5174);
export const apiPrefix = trimTrailingSlash(
  process.env.GRAPH_MODEL_API_PREFIX ?? cfg.backend?.prefix ?? "/webgrp"
);

// 前端 base 部署路径（Vite base）：前端应用挂在子路径下时配置，如 /app/。默认 /
export const frontendPrefix = normalizeBase(
  process.env.GRAPH_MODEL_FRONTEND_PREFIX ?? cfg.frontend?.prefix ?? "/"
);

function readEnvDataDir() {
  return typeof process.env.GRAPH_MODEL_DATA_DIR === "string"
    ? process.env.GRAPH_MODEL_DATA_DIR.trim()
    : "";
}
const configDataDir = typeof cfg.dataDir === "string" ? cfg.dataDir.trim() : "";
const dataDirValue = readEnvDataDir() || configDataDir || "./data";
export const configuredDataDir =
  resolve(selectedConfig.dataDirBase, dataDirValue);

// 剥掉前端 base 前缀（非根时）：后端入口把 /app/icon-library/x 还原为 /icon-library/x；
// apiPrefix 开头的 API 请求不以 base 开头，原样返回。
export const stripFrontendBase = (pathname) => {
  if (frontendPrefix === "/") return pathname;
  return pathname.startsWith(frontendPrefix)
    ? pathname.slice(frontendPrefix.length - 1) || "/"
    : pathname;
};

// 转义正则元字符，用于把 apiPrefix 拼进路由正则。
// 实现已单源化到 shared/regexEscape.mjs（此前本文件、src/model.ts、src/svgUtils.ts
// 各有一份相同实现）。此处同时 re-export 与本地 import：config.mjs 自身在用，
// server/server.mjs 也从本模块 import 它 —— 对外 API 不变。
export { escapeRegExp } from "../shared/regexEscape.mjs";
import { escapeRegExp } from "../shared/regexEscape.mjs";

// 拼接前缀 + 子路径，如 apiPath("/images") -> "/webgrp/images"
export const apiPath = (subPath) => `${apiPrefix}${subPath}`;

// 构建带前缀的锚定正则。sub 走转义，suffix 保留原始正则语法（如 "/?$" 或 "(?<tab>...)"）
export const apiPattern = (sub, suffix = "") =>
  new RegExp(`^${escapeRegExp(apiPath(sub))}${suffix}`, "u");
