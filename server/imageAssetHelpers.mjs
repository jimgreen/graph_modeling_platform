// 图像资产与名称安全化纯辅助模块
// 从 server/server.mjs 抽离，无模块级路径常量、无文件系统副作用。
import { sanitizeSegment } from "../shared/pathSafety.mjs";
import { apiPath } from "./config.mjs";

export const maxFilePartLength = 80;

export const mimeExt = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/svg+xml": ".svg"
};

export const imageMimeByExtension = {
  ...Object.fromEntries(Object.entries(mimeExt).map(([mimeType, extension]) => [extension, mimeType])),
  ".jpeg": "image/jpeg"
};

export function safeName(name) {
  return String(name || "未命名图片").replace(/[\\/:*?"<>|]+/g, "_").slice(0, maxFilePartLength);
}

export function safeFilePart(name, fallback = "未命名") {
  // sanitizeSegment 额外拒绝 "." / ".." 段，防止 schemePath 数组元素相对路径逃逸（审查 B-P0-1）
  return sanitizeSegment(name, fallback, maxFilePartLength);
}

export function escapeSvgAttribute(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function rootImageFolder() {
  return {
    id: "root",
    name: "默认文件夹",
    createdAt: "1970-01-01T00:00:00.000Z"
  };
}

export function publicAsset(item) {
  return {
    id: item.id,
    name: item.name,
    filename: item.filename,
    folderId: item.folderId || "root",
    mimeType: item.mimeType,
    size: item.size,
    createdAt: item.createdAt,
    url: apiPath(`/images/${item.id}`)
  };
}

export function imageCountsByFolder(manifest) {
  const counts = new Map();
  for (const item of manifest) {
    const folderId = item.folderId || "root";
    counts.set(folderId, (counts.get(folderId) ?? 0) + 1);
  }
  return counts;
}

export function safeImageLibraryId(value) {
  const id = String(value || "").trim();
  return /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u.test(id) ? id : "";
}

export function normalizeImportedImageLibraryFolders(value) {
  const seen = new Set();
  const folders = [];
  for (const folder of Array.isArray(value) ? value : []) {
    const id = safeImageLibraryId(folder?.id) || "root";
    if (id === "builtin-shared-icons" || seen.has(id)) {
      continue;
    }
    seen.add(id);
    folders.push({
      id,
      name: safeName(folder?.name || (id === "root" ? "默认文件夹" : id)),
      createdAt: typeof folder?.createdAt === "string" ? folder.createdAt : new Date().toISOString()
    });
  }
  if (!seen.has("root")) {
    folders.unshift(rootImageFolder());
  }
  return folders;
}

export function normalizeImportedImageLibraryAssets(value, folderIds) {
  const seen = new Set();
  const assets = [];
  for (const asset of Array.isArray(value) ? value : []) {
    const id = safeImageLibraryId(asset?.id);
    if (!id || id.startsWith("builtin-shared-icon-") || seen.has(id) || typeof asset?.dataUrl !== "string") {
      continue;
    }
    seen.add(id);
    const folderId = safeImageLibraryId(asset.folderId);
    assets.push({
      id,
      name: safeName(asset.name || asset.filename || id),
      folderId: folderIds.has(folderId) ? folderId : "root",
      dataUrl: asset.dataUrl,
      createdAt: typeof asset.createdAt === "string" ? asset.createdAt : new Date().toISOString()
    });
  }
  return assets;
}
