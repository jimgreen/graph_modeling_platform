/**
 * 本地原生快速另存为与导出文件打开 HTTP 处理器（从 server/server.mjs 拆离）。
 * 零模块级路径常量，所有读写经由依赖注入的 server 原语执行。
 */
import { NativeExportSaveError, isAllowedNativeExportOrigin } from "../nativeExportSave.mjs";

export function createNativeExportHandlers({
  readJsonBody,
  readRawBody,
  sendJson,
  sendError,
  maxSchemeBodyBytes
}) {
  async function handleSelectNativeExportFile(request, response, nativeExportSaveService) {
    if (!isAllowedNativeExportOrigin(request)) {
      sendError(response, 403, "仅允许本机页面调用快速另存为接口。");
      return;
    }
    const payload = await readJsonBody(request, 64 * 1024, "另存为参数过大。");
    const abortController = new AbortController();
    // 客户端断开连接（刷新/关页/取消请求）时主动中止未完成的弹窗子进程，防止孤儿进程堆积
    const handleClientClose = () => {
      if (!response.writableEnded) {
        abortController.abort();
      }
    };
    response.on("close", handleClientClose);
    try {
      const result = await nativeExportSaveService.selectFile(payload, { signal: abortController.signal });
      if (abortController.signal.aborted || response.writableEnded) {
        return;
      }
      if (!result.supported) {
        sendError(response, 501, "当前运行环境不支持本地快速另存为。");
        return;
      }
      sendJson(response, 200, result);
    } catch (error) {
      if (abortController.signal.aborted || response.writableEnded) {
        return;
      }
      const message = error instanceof Error ? error.message : "打开系统另存为窗口失败。";
      sendError(response, 500, message);
    } finally {
      response.off("close", handleClientClose);
    }
  }

  async function handleWriteNativeExportText(url, request, response, nativeExportSaveService) {
    if (!isAllowedNativeExportOrigin(request)) {
      sendError(response, 403, "仅允许本机页面调用快速另存为接口。");
      return;
    }
    const token = String(url.searchParams.get("token") ?? "").trim();
    if (!token) {
      sendError(response, 400, "缺少另存为目标令牌。");
      return;
    }
    const bytes = await readRawBody(request, maxSchemeBodyBytes, "导出文件过大，最大支持 64MB。");
    try {
      const result = await nativeExportSaveService.writeText(token, bytes);
      sendJson(response, 200, { ok: true, ...result });
    } catch (error) {
      if (error instanceof NativeExportSaveError && error.code === "invalid-token") {
        sendError(response, 404, error.message);
        return;
      }
      const message = error instanceof Error ? error.message : "写入导出文件失败。";
      sendError(response, 500, message);
    }
  }

  async function handleWriteNativeExportBundle(url, request, response, nativeExportSaveService) {
    if (!isAllowedNativeExportOrigin(request)) {
      sendError(response, 403, "仅允许本机页面调用快速另存为接口。");
      return;
    }
    const token = String(url.searchParams.get("token") ?? "").trim();
    if (!token) {
      sendError(response, 400, "缺少另存为目标令牌。");
      return;
    }
    const payload = await readJsonBody(request, maxSchemeBodyBytes, "组合导出文件过大，最大支持 64MB。");
    const rawFiles = Array.isArray(payload?.files) ? payload.files : [];
    if (rawFiles.length === 0) {
      sendError(response, 400, "缺少组合导出文件列表。");
      return;
    }
    const entries = rawFiles.map((item) => ({
      ext: String(item?.ext ?? "").trim(),
      data: Buffer.from(String(item?.base64 ?? ""), "base64")
    }));
    try {
      const result = await nativeExportSaveService.writeBundle(token, entries);
      sendJson(response, 200, { ok: true, ...result });
    } catch (error) {
      if (error instanceof NativeExportSaveError && error.code === "invalid-token") {
        sendError(response, 404, error.message);
        return;
      }
      if (error instanceof NativeExportSaveError && error.code === "bad-bundle") {
        sendError(response, 400, error.message);
        return;
      }
      const message = error instanceof Error ? error.message : "写入组合导出文件失败。";
      sendError(response, 500, message);
    }
  }

  // 「查看」导出文件：令牌由 write-text / write-bundle 刚落盘时签发，服务端只认自己写过的路径
  async function handleOpenNativeExportFile(url, request, response, nativeExportSaveService) {
    if (!isAllowedNativeExportOrigin(request)) {
      sendError(response, 403, "仅允许本机页面调用导出文件查看接口。");
      return;
    }
    const token = String(url.searchParams.get("token") ?? "").trim();
    if (!token) {
      sendError(response, 400, "缺少导出文件令牌。");
      return;
    }
    try {
      const result = await nativeExportSaveService.openWrittenFile(token);
      sendJson(response, 200, { ok: true, ...result });
    } catch (error) {
      if (error instanceof NativeExportSaveError && error.code === "invalid-token") {
        sendError(response, 404, error.message);
        return;
      }
      const message = error instanceof Error ? error.message : "打开导出文件失败。";
      sendError(response, 500, message);
    }
  }

  return {
    handleSelectNativeExportFile,
    handleWriteNativeExportText,
    handleWriteNativeExportBundle,
    handleOpenNativeExportFile
  };
}
