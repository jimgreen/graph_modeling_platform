// API 前缀：由 vite define 注入 __API_PREFIX__（开发/生产构建），测试环境回退默认值。
declare const __API_PREFIX__: string | undefined;

export const API_PREFIX: string =
  (typeof __API_PREFIX__ !== "undefined" ? __API_PREFIX__ : undefined) ?? "/webgrp";

// 前端 base 部署路径：由 vite define 注入 __FRONTEND_BASE__（默认 /）。非 API 请求拼接此前缀。
declare const __FRONTEND_BASE__: string | undefined;

export const FRONTEND_BASE: string =
  (typeof __FRONTEND_BASE__ !== "undefined" ? __FRONTEND_BASE__ : undefined) ?? "/";

// 拼接前端 base + 子路径：frontendPath("/icon-library/x") -> "/app/icon-library/x"（base=/app/）；默认 / 时原样
export const frontendPath = (subPath: string): string =>
  `${FRONTEND_BASE.replace(/\/+$/u, "")}${subPath}`;

// 拼接前缀 + 子路径，如 apiPath("/images") -> "/webgrp/images"
export const apiPath = (subPath: string): string => `${API_PREFIX}${subPath}`;
