// 平台配置：端口与接口前缀。优先读环境变量，回退到 platform.config.json，再回退默认值。
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const configFile = process.env.GRAPH_MODEL_CONFIG
  ? resolve(process.env.GRAPH_MODEL_CONFIG)
  : resolve(repoRoot, "platform.config.json");

function readConfig() {
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(configFile, "utf-8"));
  } catch {
    // 文件不存在 / 读失败 / JSON 语法错误：与「写了个非对象的 JSON」同属降级，静默用默认配置
    return {};
  }
  // 合法 JSON 但不是配置对象（字面 null / 数组 / 字符串 / 数字）时，JSON.parse **不抛错**，
  // 于是 cfg.host 会在**模块求值期**抛 TypeError —— 任何 import 本模块的东西（server、
  // vite.config、几十个测试）都直接起不来。归一成 {} 让后续取值拿到 undefined 再走默认值。
  // 数组一并排除：JSON 数组解析不出 host/frontend/backend 属性，取值与 {} 完全一致，
  // 排除它只为让「这里期望的是一个配置对象」这件事在代码里读得出来。
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) return {};
  return parsed;
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

// 端口归一。默认值只在 fallback 参数里写一处，避免「取值链里一个 ?? 默认 + 参数里
// 再一个 fallback」两个真值源。
//   - null / undefined 视同未设。**不能只靠 Number 的有限性兜底**：Number(null) 得 0，
//     而 0 传给 listen 是「随机端口」—— 比回落默认值更糟：服务确实起来了，但没人
//     知道它在哪。取值链里的 ?? 只能挡住左操作数为 nullish 的情形，挡不住
//     cfg.frontend.port 本身就是 null。
//   - 空串 / 纯空白同理视同未设（Number("") === 0，同一个坑）。
//   - Number("abc") 得 NaN，而 NaN 会一路传到 server.listen / vite server.port ——
//     表现为 RangeError。故非有限数（NaN 与 Infinity 都算）一律回落到既定默认值。
// 合法数字与数字字符串（如 "3000"）行为不变。
const toPort = (value, fallback) => {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "string" && value.trim() === "") return fallback;
  const port = Number(value);
  return Number.isFinite(port) ? port : fallback;
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
