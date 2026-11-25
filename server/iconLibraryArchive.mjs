// 文档图片归档与 Office XML 矢量图提取模块
// 从 server/server.mjs 抽离，无模块级路径常量、无磁盘写入副作用。
import { basename, extname } from "node:path";
import { createHash } from "node:crypto";
import AdmZip from "adm-zip";
import { formatSvgNumber } from "../shared/formatSvgNumber.mjs";
import {
  escapeSvgAttribute,
  imageMimeByExtension,
  safeFilePart,
  safeName
} from "./imageAssetHelpers.mjs";

export const maxImageBodyBytes = 15 * 1024 * 1024;
// 审查 A1-P0-2：zip bomb 防护——解压前按 entry 未压缩大小累计校验，防 256MB 压缩包解出数 GB 打爆内存
export const MAX_ZIP_UNCOMPRESSED_BYTES = 512 * 1024 * 1024;

export const iconLibraryArchiveExtensions = new Set([
  ".docx",
  ".docm",
  ".pptx",
  ".pptm",
  ".ppsx",
  ".ppsm",
  ".xlsx",
  ".xlsm",
  ".vsdx",
  ".wps",
  ".dps",
  ".zip"
]);

export const maxIconLibraryExtractedAssets = 500;

export function assertZipUncompressedSizeWithinLimit(zip, label = "压缩包") {
  const entries = typeof zip.getEntries === "function" ? zip.getEntries() : [];
  let total = 0;
  for (const entry of entries) {
    total += Number(entry?.header?.size) || 0;
    if (total > MAX_ZIP_UNCOMPRESSED_BYTES) {
      throw new Error(`${label}解压后总大小超过 ${Math.round(MAX_ZIP_UNCOMPRESSED_BYTES / 1024 / 1024)}MB 上限。`);
    }
  }
}

function iconLibraryEntryMimeType(entryName) {
  const extension = extname(entryName).toLowerCase();
  return imageMimeByExtension[extension] || "";
}

function iconLibrarySourceName(fileName) {
  return safeFilePart(String(fileName || "导入文档图片").replace(/\.[^.]+$/u, ""), "导入文档图片");
}

function iconLibraryEntryDisplayName(entryName, sourceName) {
  const fileName = safeName(basename(entryName) || "图片");
  return safeName(`${sourceName}-${fileName}`);
}

function iconLibraryGeneratedSvgDisplayName(sourceName, index) {
  return safeName(`${sourceName}-矢量图标-${String(index).padStart(3, "0")}.svg`);
}

function officeXmlAttributeValue(markup, name) {
  const match = String(markup ?? "").match(new RegExp(`\\b${name}="([^"]*)"`, "iu"));
  return match ? match[1] : "";
}

function officeXmlNumberAttribute(markup, name, fallback = 0) {
  const value = Number(officeXmlAttributeValue(markup, name));
  return Number.isFinite(value) ? value : fallback;
}

function officeXmlPathPoints(markup) {
  return Array.from(String(markup ?? "").matchAll(/<a:pt\b([^>]*)\/?>/giu), (match) => ({
    x: officeXmlNumberAttribute(match[1], "x"),
    y: officeXmlNumberAttribute(match[1], "y")
  }));
}

function officeXmlColorFromMarkup(markup, fallback) {
  const srgbMatch = String(markup ?? "").match(/<a:srgbClr\b[^>]*\bval="([0-9a-f]{6})"/iu);
  if (srgbMatch) {
    return `#${srgbMatch[1].toLowerCase()}`;
  }
  const schemeMatch = String(markup ?? "").match(/<a:schemeClr\b[^>]*\bval="([^"]+)"/iu);
  const schemeColors = {
    bg1: "#ffffff",
    tx1: "#111827",
    bg2: "#f8fafc",
    tx2: "#334155",
    accent1: "#2563eb",
    accent2: "#16a34a",
    accent3: "#f59e0b",
    accent4: "#dc2626",
    accent5: "#7c3aed",
    accent6: "#0891b2"
  };
  return schemeMatch ? schemeColors[schemeMatch[1]] ?? fallback : fallback;
}

function officeXmlFillColor(shapeMarkup) {
  const fillMatch = String(shapeMarkup ?? "").match(/<a:solidFill\b[\s\S]*?<\/a:solidFill>/iu);
  if (fillMatch) {
    return officeXmlColorFromMarkup(fillMatch[0], "#111827");
  }
  return /<a:noFill\b/iu.test(shapeMarkup) ? "none" : "#111827";
}

function officeXmlStrokeColor(shapeMarkup) {
  const lineMatch = String(shapeMarkup ?? "").match(/<a:ln\b[\s\S]*?<\/a:ln>/iu);
  if (!lineMatch || /<a:noFill\b/iu.test(lineMatch[0])) {
    return "none";
  }
  return officeXmlColorFromMarkup(lineMatch[0], "none");
}

function officeXmlPathData(pathBody) {
  const commands = [];
  for (const match of String(pathBody ?? "").matchAll(/<a:(moveTo|lnTo|cubicBezTo|quadBezTo)\b[^>]*>([\s\S]*?)<\/a:\1>|<a:close\b[^>]*\/?>/giu)) {
    if (match[0].startsWith("<a:close")) {
      commands.push("Z");
      continue;
    }
    const command = match[1];
    const points = officeXmlPathPoints(match[2]);
    if (command === "moveTo" && points.length >= 1) {
      commands.push(`M ${formatSvgNumber(points[0].x)} ${formatSvgNumber(points[0].y)}`);
    } else if (command === "lnTo" && points.length >= 1) {
      commands.push(`L ${formatSvgNumber(points[0].x)} ${formatSvgNumber(points[0].y)}`);
    } else if (command === "cubicBezTo" && points.length >= 3) {
      commands.push(`C ${formatSvgNumber(points[0].x)} ${formatSvgNumber(points[0].y)} ${formatSvgNumber(points[1].x)} ${formatSvgNumber(points[1].y)} ${formatSvgNumber(points[2].x)} ${formatSvgNumber(points[2].y)}`);
    } else if (command === "quadBezTo" && points.length >= 2) {
      commands.push(`Q ${formatSvgNumber(points[0].x)} ${formatSvgNumber(points[0].y)} ${formatSvgNumber(points[1].x)} ${formatSvgNumber(points[1].y)}`);
    }
  }
  return commands.join(" ");
}

function officeCustomGeometryToSvg(customGeometryMarkup, shapeMarkup) {
  const pathMarkups = Array.from(String(customGeometryMarkup ?? "").matchAll(/<a:path\b([^>]*)>([\s\S]*?)<\/a:path>/giu));
  const svgPaths = [];
  let viewBoxWidth = 0;
  let viewBoxHeight = 0;
  for (const pathMatch of pathMarkups) {
    const attributes = pathMatch[1] ?? "";
    const body = pathMatch[2] ?? "";
    const pathData = officeXmlPathData(body);
    if (!pathData) {
      continue;
    }
    const width = officeXmlNumberAttribute(attributes, "w");
    const height = officeXmlNumberAttribute(attributes, "h");
    viewBoxWidth = Math.max(viewBoxWidth, width);
    viewBoxHeight = Math.max(viewBoxHeight, height);
    svgPaths.push(pathData);
  }
  if (svgPaths.length === 0) {
    return null;
  }
  if (viewBoxWidth <= 0 || viewBoxHeight <= 0) {
    const points = officeXmlPathPoints(customGeometryMarkup);
    viewBoxWidth = Math.max(1, ...points.map((point) => point.x));
    viewBoxHeight = Math.max(1, ...points.map((point) => point.y));
  }
  const fill = officeXmlFillColor(shapeMarkup);
  const stroke = officeXmlStrokeColor(shapeMarkup);
  const strokeAttribute = stroke === "none" ? "" : ` stroke="${escapeSvgAttribute(stroke)}" stroke-width="${formatSvgNumber(Math.max(1, Math.min(viewBoxWidth, viewBoxHeight) / 80))}" stroke-linejoin="round"`;
  const body = svgPaths
    .map((pathData) => `<path d="${escapeSvgAttribute(pathData)}" fill="${escapeSvgAttribute(fill)}"${strokeAttribute}/>`)
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${formatSvgNumber(viewBoxWidth)} ${formatSvgNumber(viewBoxHeight)}">${body}</svg>`;
}

function officeXmlLooksLikeDocumentDrawing(entryName) {
  const normalizedName = String(entryName ?? "").replace(/\\/g, "/").toLowerCase();
  return (
    normalizedName.endsWith(".xml") &&
    !normalizedName.includes("/_rels/") &&
    /^(ppt|word|xl)\//u.test(normalizedName) &&
    !normalizedName.includes("/theme/")
  );
}

function extractOfficeVectorSvgEntries(zip, sourceName, remainingSlots) {
  const entries = [];
  for (const entry of zip.getEntries()) {
    if (entry.isDirectory || entries.length >= remainingSlots || !officeXmlLooksLikeDocumentDrawing(entry.entryName)) {
      continue;
    }
    const xml = entry.getData().toString("utf-8");
    for (const match of xml.matchAll(/<a:custGeom\b[\s\S]*?<\/a:custGeom>/giu)) {
      if (entries.length >= remainingSlots) {
        break;
      }
      const contextStart = Math.max(0, match.index - 2200);
      const contextEnd = Math.min(xml.length, match.index + match[0].length + 2200);
      const svg = officeCustomGeometryToSvg(match[0], xml.slice(contextStart, contextEnd));
      if (!svg) {
        continue;
      }
      entries.push({
        name: iconLibraryGeneratedSvgDisplayName(sourceName, entries.length + 1),
        mimeType: "image/svg+xml",
        bytes: Buffer.from(svg, "utf-8"),
        entryName: `${entry.entryName}#vector-${entries.length + 1}`
      });
    }
  }
  return entries;
}

export function extractIconLibraryImageEntries(buffer, fileName = "导入文档图片") {
  const sourceName = iconLibrarySourceName(fileName);
  const zip = new AdmZip(buffer);
  assertZipUncompressedSizeWithinLimit(zip, "文档图片压缩包");
  const entries = [];
  const skipped = [];
  const seenHashes = new Set();
  for (const entry of zip.getEntries()) {
    if (entry.isDirectory || entries.length >= maxIconLibraryExtractedAssets) {
      continue;
    }
    const mimeType = iconLibraryEntryMimeType(entry.entryName);
    if (!mimeType) {
      continue;
    }
    const bytes = entry.getData();
    if (bytes.length <= 0 || bytes.length > maxImageBodyBytes) {
      skipped.push(entry.entryName);
      continue;
    }
    const hash = createHash("sha1").update(bytes).digest("hex");
    if (seenHashes.has(hash)) {
      continue;
    }
    seenHashes.add(hash);
    entries.push({
      name: iconLibraryEntryDisplayName(entry.entryName, sourceName),
      mimeType,
      bytes,
      entryName: entry.entryName
    });
  }
  for (const vectorEntry of extractOfficeVectorSvgEntries(zip, sourceName, maxIconLibraryExtractedAssets - entries.length)) {
    if (vectorEntry.bytes.length <= 0 || vectorEntry.bytes.length > maxImageBodyBytes) {
      skipped.push(vectorEntry.entryName);
      continue;
    }
    const hash = createHash("sha1").update(vectorEntry.bytes).digest("hex");
    if (seenHashes.has(hash)) {
      continue;
    }
    seenHashes.add(hash);
    entries.push(vectorEntry);
  }
  return {
    entries,
    skippedCount: skipped.length
  };
}
