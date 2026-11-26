/**
 * 配置保存、图元 Symbol 导出与静态/图标库资源托管 HTTP 处理器（从 server/server.mjs 拆离）。
 * 零模块级路径常量；目录创建均透传 mkdirInSpace 退休守护。
 */
import { stat } from "node:fs/promises";
import { extname, join } from "node:path";
import { apiPath, apiPrefix } from "../config.mjs";
import { contentDispositionAttachment } from "../contentDisposition.mjs";
import { accessControlHeaders, accessControlOriginOnly } from "../cors.mjs";
import { isPathInside } from "../../shared/pathSafety.mjs";
import { writeSymbolExportSchemes } from "../symbolExportSchemes.mjs";

const symbolExportErrorStatus = {
  "invalid-request": 400,
  "template-not-found": 404,
  "empty-symbol": 422
};

const staticAssetMimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".map": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8"
};

function isPathInsideStaticRoot(targetPath, staticRoot) {
  return isPathInside(staticRoot, targetPath);
}

export function createConfigAndStaticHandlers({
  readJsonBody,
  sendJson,
  sendError,
  writeColorConfig,
  writeMeasurementConfig,
  writeDeviceLibraryConfig,
  mkdirInSpace,
  pipeFileToResponse,
  getIconLibraryPublicDir,
  maxColorConfigBodyBytes,
  maxMeasurementConfigBodyBytes,
  maxDeviceLibraryBodyBytes,
  maxSymbolExportSchemesBodyBytes,
  maxSymbolExportBodyBytes
}) {
  async function handleSaveColorConfig(request, response, paths) {
    const payload = await readJsonBody(request, maxColorConfigBodyBytes, "配色配置数据过大，最大支持 1MB。");
    const normalized = await writeColorConfig(payload, { paths });
    sendJson(response, 200, { ok: true, ...normalized });
  }

  async function handleSaveMeasurementConfig(request, response, paths) {
    const payload = await readJsonBody(request, maxMeasurementConfigBodyBytes, "动态量测配置数据过大，最大支持 1MB。");
    const normalized = await writeMeasurementConfig(payload, { paths });
    sendJson(response, 200, { ok: true, ...normalized });
  }

  async function handleSaveDeviceLibrary(request, response, paths) {
    const payload = await readJsonBody(request, maxDeviceLibraryBodyBytes, "图元库数据过大，最大支持 16MB。");
    const normalized = await writeDeviceLibraryConfig(payload, { paths });
    sendJson(response, 200, { ok: true, ...normalized });
  }

  async function handleSaveSymbolExportSchemes(request, response, paths) {
    const payload = await readJsonBody(request, maxSymbolExportSchemesBodyBytes, "导出方案数据过大，最大支持 1MB。");
    const normalized = await writeSymbolExportSchemes(payload, { paths, ensureDirectory: mkdirInSpace });
    sendJson(response, 200, { ok: true, ...normalized });
  }

  async function handleSymbolExport(request, response, paths) {
    const payload = await readJsonBody(request, maxSymbolExportBodyBytes, "导出图元请求过大，最大支持 1MB。");
    const { renderSymbolExportSvg } = await import("../symbolExport.mjs");
    const result = await renderSymbolExportSvg({ kinds: payload?.kinds, paths });
    if (result.error) {
      sendError(response, symbolExportErrorStatus[result.error.code] ?? 400, result.error.message, result.error.code);
      return;
    }
    sendJson(response, 200, {
      ok: true,
      svg: result.svg,
      symbolCount: result.symbolCount,
      exportedKinds: result.exportedKinds,
      skippedKinds: result.skippedKinds,
      missingKinds: result.missingKinds,
      fileName: result.fileName
    });
  }

  async function handleStandaloneSymbolExport(request, response, paths) {
    const payload = await readJsonBody(request, maxSymbolExportBodyBytes, "导出图元请求过大，最大支持 1MB。");
    const { renderStandaloneSymbolExportZip } = await import("../symbolExport.mjs");
    const result = await renderStandaloneSymbolExportZip({ kinds: payload?.kinds, paths });
    if (result.error) {
      sendError(response, symbolExportErrorStatus[result.error.code] ?? 400, result.error.message, result.error.code);
      return;
    }
    const disposition = contentDispositionAttachment(result.fileName);
    const metaHeaders = {
      "content-disposition": disposition,
      "cache-control": "no-store",
      ...accessControlOriginOnly,
      "x-symbol-export-file-count": String(result.fileCount),
      "x-symbol-export-exported-kinds": result.exportedKinds.join(","),
      "x-symbol-export-skipped-kinds": result.skippedKinds.join(","),
      "x-symbol-export-missing-kinds": result.missingKinds.join(",")
    };
    if (result.kind === "svg") {
      const body = Buffer.from(result.svg, "utf-8");
      response.writeHead(200, {
        "content-type": "image/svg+xml; charset=utf-8",
        "content-length": String(body.length),
        ...metaHeaders
      });
      response.end(body);
      return;
    }
    response.writeHead(200, {
      "content-type": "application/zip",
      "content-length": String(result.buffer.length),
      ...metaHeaders
    });
    response.end(result.buffer);
  }

  async function serveStaticAsset(request, response, url, staticRoot) {
    if (!staticRoot) {
      return false;
    }
    const pathname = url.pathname;
    if (pathname === apiPath("/ws") || pathname.startsWith(apiPrefix + "/")) {
      return false;
    }
    const safePathname = pathname === "/" ? "/index.html" : pathname;
    const filePath = join(staticRoot, safePathname);
    if (!isPathInsideStaticRoot(filePath, staticRoot)) {
      sendError(response, 404, "资源不存在。");
      return true;
    }
    try {
      const info = await stat(filePath);
      if (info.isFile()) {
        const ext = extname(filePath).toLowerCase();
        response.writeHead(200, {
          "content-type": staticAssetMimeTypes[ext] ?? "application/octet-stream",
          "cache-control": "public, max-age=0, must-revalidate",
          ...accessControlHeaders
        });
        pipeFileToResponse(filePath, response);
        return true;
      }
    } catch (error) {
      if (error?.code !== "ENOENT") {
        throw error;
      }
    }
    const indexPath = join(staticRoot, "index.html");
    try {
      const info = await stat(indexPath);
      if (info.isFile()) {
        response.writeHead(200, {
          "content-type": "text/html; charset=utf-8",
          "cache-control": "no-cache",
          ...accessControlHeaders
        });
        pipeFileToResponse(indexPath, response);
        return true;
      }
    } catch (error) {
      if (error?.code !== "ENOENT") {
        throw error;
      }
    }
    return false;
  }

  async function serveIconLibraryAsset(request, response, url) {
    const prefix = "/icon-library/";
    if (!url.pathname.startsWith(prefix)) {
      return false;
    }
    const iconLibraryPublicDir = getIconLibraryPublicDir();
    const relativePath = url.pathname.slice(prefix.length);
    const filePath = join(iconLibraryPublicDir, relativePath);
    if (!isPathInsideStaticRoot(filePath, iconLibraryPublicDir)) {
      sendError(response, 404, "资源不存在。");
      return true;
    }
    try {
      const info = await stat(filePath);
      if (info.isFile()) {
        const ext = extname(filePath).toLowerCase();
        response.writeHead(200, {
          "content-type": staticAssetMimeTypes[ext] ?? "application/octet-stream",
          "cache-control": "public, max-age=3600",
          ...accessControlHeaders
        });
        pipeFileToResponse(filePath, response);
        return true;
      }
    } catch (error) {
      if (error?.code !== "ENOENT") {
        throw error;
      }
    }
    return false;
  }

  return {
    handleSaveColorConfig,
    handleSaveMeasurementConfig,
    handleSaveDeviceLibrary,
    handleSaveSymbolExportSchemes,
    handleSymbolExport,
    handleStandaloneSymbolExport,
    serveStaticAsset,
    serveIconLibraryAsset
  };
}
