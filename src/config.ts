// API 前缀：由 vite define 注入 __API_PREFIX__（开发/生产构建），测试环境回退默认值。
declare const __API_PREFIX__: string | undefined;

export const API_PREFIX: string =
  (typeof __API_PREFIX__ !== "undefined" ? __API_PREFIX__ : undefined) ?? "/webgrp";

// 转义正则元字符
export const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// 拼接前缀 + 子路径，如 apiPath("/images") -> "/webgrp/images"
export const apiPath = (subPath: string): string => `${API_PREFIX}${subPath}`;
