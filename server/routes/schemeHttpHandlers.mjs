/**
 * 方案、模型与空间导入导出 HTTP 处理器（从 server/server.mjs 拆离）。
 * 零模块级路径常量；退休空间防护与异步 ZIP 解压均经注入原语与既有守卫执行。
 */
import { readZipEntriesAsync } from "../asyncZip.mjs";
import { contentDispositionAttachment } from "../contentDisposition.mjs";
import { accessControlHeaders } from "../cors.mjs";
import { PREDEFINED_E_DEVICE_TEMPLATES } from "../eFileTemplates.mjs";
import { normalizeSchemesForStorage } from "../projectStorageNormalization.mjs";
import { buildSpaceArchiveBuffer, readSpaceArchiveName } from "../spaceArchive.mjs";
import { MAX_SPACE_NAME_LENGTH, isAcceptableSpaceName, normalizeSpaceName } from "../spaceId.mjs";
import { SPACE_NAME_DUPLICATE } from "../spaceStore.mjs";

export function createSchemeHttpHandlers({
  readSchemes,
  writeSchemes,
  readSchemeProjectRecord,
  saveSchemeProjectRecord,
  deleteSchemeProjectRecord,
  saveSchemeRecordDirectory,
  deleteSchemeRecordDirectory,
  resolveSchemePathForSelector,
  parseSchemePathParam,
  schemePathOrDefault,
  createSchemeArchiveBuffer,
  importSchemeArchiveBuffer,
  assertZipUncompressedSizeWithinLimit,
  zipRootNameFor,
  extractSpaceZipToDirectory,
  retiredSpaceRoots,
  evictRegistry,
  readJsonBody,
  readRawBody,
  sendJson,
  sendError,
  maxSchemeBodyBytes,
  maxSchemeZipBodyBytes
}) {
  async function snapshotSavedModels(paths) {
    const schemes = await readSchemes({ includeProjects: true, paths });
    const snapshot = new Map();
    const visit = (records, parentPath = []) => {
      for (const scheme of records ?? []) {
        const schemePath = [...parentPath, String(scheme?.name ?? "")];
        for (const record of scheme?.projects ?? []) {
          const project = record?.project && typeof record.project === "object" ? record.project : {};
          const name = String(record?.name ?? project.name ?? "");
          const modelIndex = Number(project.idx);
          const stableModelId = Number.isSafeInteger(modelIndex) && modelIndex > 0 ? modelIndex : null;
          const key = stableModelId ? `idx:${stableModelId}` : `path:${JSON.stringify([...schemePath, name])}`;
          const savedRecord = {
            name,
            updatedAt: String(record?.updatedAt ?? ""),
            project
          };
          snapshot.set(key, {
            modelId: stableModelId,
            schemePath,
            record: savedRecord,
            fingerprint: JSON.stringify([schemePath, savedRecord.updatedAt, project])
          });
        }
        visit(scheme?.children, schemePath);
      }
    };
    visit(schemes);
    return snapshot;
  }

  async function trySnapshotSavedModels(paths) {
    try {
      return await snapshotSavedModels(paths);
    } catch (error) {
      console.warn(`[model-update] 保存前快照读取失败，跳过本次批量通知：${error?.message ?? error}`);
      return null;
    }
  }

  async function publishModelChangesSince(service, spaceId, paths, before) {
    if (!(before instanceof Map)) return;
    try {
      const after = await snapshotSavedModels(paths);
      for (const [key, model] of after) {
        const previous = before.get(key);
        if (!previous || previous.fingerprint !== model.fingerprint) {
          await service.publishModelChanged({ spaceId, schemePath: model.schemePath, record: model.record, paths });
        }
      }
      for (const [key, model] of before) {
        if (!after.has(key) && model.modelId) service.removeModel(spaceId, model.modelId);
      }
    } catch (error) {
      console.warn(`[model-update] 批量模型变更通知失败：${error?.message ?? error}`);
    }
  }

  async function publishSavedModelChange(service, event) {
    try {
      const persistedRecord = await readSchemeProjectRecord({
        paths: event.paths,
        schemePath: event.schemePath,
        name: event.record?.name ?? event.record?.project?.name
      });
      if (!persistedRecord) return;
      await service.publishModelChanged({ ...event, record: persistedRecord });
    } catch (error) {
      console.warn(`[model-update] 模型变更通知失败：${error?.message ?? error}`);
    }
  }

  async function handleSaveSchemes(request, response, paths, spaceId, modelUpdateService) {
    const payload = await readJsonBody(request, maxSchemeBodyBytes, "方案/模型数据过大，最大支持 64MB。");
    const schemes = Array.isArray(payload) ? payload : payload.schemes;
    if (!Array.isArray(schemes)) {
      sendError(response, 400, "缺少方案/模型数据。");
      return;
    }
    const normalized = normalizeSchemesForStorage(schemes);
    const before = await trySnapshotSavedModels(paths);
    const savedSchemes = await writeSchemes(normalized, { paths });
    await publishModelChangesSince(modelUpdateService, spaceId, paths, before);
    sendJson(response, 200, { ok: true, schemes: savedSchemes, savedAt: new Date().toISOString() });
  }

  async function handleReadSchemeProject(url, response, paths) {
    const name = url.searchParams.get("name") || url.searchParams.get("projectName") || "";
    if (!name.trim()) {
      sendError(response, 400, "缺少模型名称。");
      return;
    }
    const schemePath = await resolveSchemePathForSelector({
      schemePath: parseSchemePathParam(url.searchParams.get("schemePath")),
      schemeId: url.searchParams.get("schemeId"),
      paths
    });
    const project = await readSchemeProjectRecord({ schemePath, name, paths });
    if (!project) {
      sendError(response, 404, "模型文件不存在。");
      return;
    }
    sendJson(response, 200, { ok: true, project });
  }

  async function handleSaveSchemeProject(request, response, paths, spaceId, modelUpdateService) {
    const payload = await readJsonBody(request, maxSchemeBodyBytes, "模型数据过大，最大支持 64MB。");
    const record = payload.record ?? {
      name: payload.name || payload.project?.name,
      updatedAt: payload.updatedAt,
      project: payload.project
    };
    if (!record?.project || typeof record.project !== "object") {
      sendError(response, 400, "缺少模型数据。");
      return;
    }
    const savedRecord = await saveSchemeProjectRecord({
      schemePath: payload.schemePath,
      schemeId: payload.schemeId,
      record,
      previousName: payload.previousName,
      paths
    });
    const savedSchemePath = schemePathOrDefault(await resolveSchemePathForSelector({
      schemePath: payload.schemePath,
      schemeId: payload.schemeId,
      paths
    }));
    await publishSavedModelChange(modelUpdateService, {
      spaceId,
      schemePath: savedSchemePath,
      record: savedRecord,
      paths
    });
    sendJson(response, 200, { ok: true, project: savedRecord, savedAt: new Date().toISOString() });
  }

  async function handleDeleteSchemeProject(request, response, paths, spaceId, modelUpdateService) {
    const payload = await readJsonBody(request, maxSchemeBodyBytes, "模型数据过大，最大支持 64MB。");
    if (!payload.name && !payload.projectName) {
      sendError(response, 400, "缺少模型名称。");
      return;
    }
    const schemePath = schemePathOrDefault(await resolveSchemePathForSelector({
      schemePath: payload.schemePath,
      schemeId: payload.schemeId,
      paths
    }));
    const name = payload.name || payload.projectName;
    const existing = await readSchemeProjectRecord({ paths, schemePath, name });
    await deleteSchemeProjectRecord({ schemePath, schemeId: payload.schemeId, name, paths });
    if (existing?.project?.idx) modelUpdateService.removeModel(spaceId, existing.project.idx);
    sendJson(response, 200, { ok: true, savedAt: new Date().toISOString() });
  }

  async function handleSaveSchemeRecord(request, response, paths, spaceId, modelUpdateService) {
    const payload = await readJsonBody(request, maxSchemeBodyBytes, "方案数据过大，最大支持 64MB。");
    if (!Array.isArray(payload.schemePath) || payload.schemePath.length === 0) {
      sendError(response, 400, "缺少方案路径。");
      return;
    }
    const before = modelUpdateService ? await trySnapshotSavedModels(paths) : null;
    const schemeId = await saveSchemeRecordDirectory({
      schemePath: payload.schemePath,
      previousSchemePath: payload.previousSchemePath,
      schemeId: payload.schemeId,
      paths
    });
    if (modelUpdateService) {
      await publishModelChangesSince(modelUpdateService, spaceId, paths, before);
    }
    sendJson(response, 200, { ok: true, schemeId, savedAt: new Date().toISOString() });
  }

  async function handleDeleteSchemeRecord(request, response, paths, spaceId, modelUpdateService) {
    const payload = await readJsonBody(request, maxSchemeBodyBytes, "方案数据过大，最大支持 64MB。");
    if ((payload.schemeId === undefined || payload.schemeId === null) && (!Array.isArray(payload.schemePath) || payload.schemePath.length === 0)) {
      sendError(response, 400, "缺少方案路径。");
      return;
    }
    const before = modelUpdateService ? await trySnapshotSavedModels(paths) : null;
    await deleteSchemeRecordDirectory({
      schemePath: payload.schemePath,
      schemeId: payload.schemeId,
      paths
    });
    if (modelUpdateService) {
      await publishModelChangesSince(modelUpdateService, spaceId, paths, before);
    }
    sendJson(response, 200, { ok: true, savedAt: new Date().toISOString() });
  }

  async function handleExportSchemeArchive(url, response, paths) {
    const schemePath = await resolveSchemePathForSelector({
      schemePath: parseSchemePathParam(url.searchParams.get("schemePath")),
      schemeId: url.searchParams.get("schemeId"),
      paths
    });
    const templateName = (url.searchParams.get("template") ?? "").trim();
    if (templateName && !Object.hasOwn(PREDEFINED_E_DEVICE_TEMPLATES, templateName)) {
      sendError(response, 400, `未知模板：${templateName}。可用模板：${Object.keys(PREDEFINED_E_DEVICE_TEMPLATES).join("、")}`);
      return;
    }
    try {
      const { buffer, filename } = await createSchemeArchiveBuffer({ paths, schemePath, templateName });
      response.writeHead(200, {
        "content-type": "application/zip",
        "content-length": String(buffer.length),
        "content-disposition": contentDispositionAttachment(filename),
        "cache-control": "no-store",
        ...accessControlHeaders
      });
      response.end(buffer);
    } catch (error) {
      const message = error instanceof Error ? error.message : "导出方案压缩包失败。";
      if (message.includes("缺少方案路径")) {
        sendError(response, 400, message);
        return;
      }
      if (message.includes("方案目录不存在")) {
        sendError(response, 404, message);
        return;
      }
      sendError(response, 500, message);
    }
  }

  async function handleImportSchemeArchive(url, request, response, paths, spaceId, modelUpdateService) {
    const parentPath = parseSchemePathParam(url.searchParams.get("parentPath"));
    const parentSchemeId = url.searchParams.get("parentSchemeId");
    const fileName = url.searchParams.get("fileName") || "导入方案.zip";
    const mode = url.searchParams.get("mode") === "overwrite" ? "overwrite" : "check";
    const targetName = url.searchParams.get("targetName") || "";
    const buffer = await readRawBody(request, maxSchemeZipBodyBytes, "方案压缩包过大，最大支持 256MB。");
    if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
      sendError(response, 400, "缺少方案压缩包。");
      return;
    }
    let zip;
    try {
      zip = await readZipEntriesAsync(buffer, { label: "方案压缩包" });
    } catch (error) {
      if (error instanceof Error && /总大小超过/.test(error.message)) {
        sendError(response, 400, error.message);
        return;
      }
      sendError(response, 400, "zip 文件格式不正确。");
      return;
    }
    const before = await trySnapshotSavedModels(paths);
    try {
      const result = await importSchemeArchiveBuffer({ paths, buffer, zip, parentPath, parentSchemeId, fileName, mode, targetName });
      if (result.conflict) {
        sendJson(response, 409, { error: "方案目录已存在。", ...result });
        return;
      }
      const schemes = normalizeSchemesForStorage(await readSchemes({ paths }));
      await publishModelChangesSince(modelUpdateService, spaceId, paths, before);
      sendJson(response, 200, {
        ok: true,
        schemes,
        importedName: result.importedName,
        importedPath: result.importedPath,
        schemeId: result.schemeId,
        savedAt: new Date().toISOString()
      });
    } catch (error) {
      const status = Number.isInteger(error?.statusCode) ? error.statusCode : 400;
      sendError(response, status, error instanceof Error ? error.message : "导入方案压缩包失败。");
    }
  }

  async function handleExportSpaceArchive(response, paths, spaceName, archiveRootName) {
    try {
      const { buffer, filename } = await buildSpaceArchiveBuffer({ paths, spaceName, archiveRootName });
      response.writeHead(200, {
        "content-type": "application/zip",
        "content-length": String(buffer.length),
        "content-disposition": contentDispositionAttachment(filename),
        "cache-control": "no-store",
        ...accessControlHeaders
      });
      response.end(buffer);
    } catch (error) {
      sendError(response, 500, error instanceof Error ? error.message : "导出空间压缩包失败。");
    }
  }

  function spaceNameRejectMessage(normalized) {
    if (!normalized) {
      return "空间名不能为空。";
    }
    if (!isAcceptableSpaceName(normalized)) {
      return `空间名不合法：只能含字母/数字/下划线/短横线，且不超过 ${MAX_SPACE_NAME_LENGTH} 个字符。`;
    }
    return "";
  }

  function sendSpaceNameConflict(response, error) {
    if (error?.code !== SPACE_NAME_DUPLICATE) {
      return false;
    }
    sendJson(response, 409, {
      error: { code: SPACE_NAME_DUPLICATE, message: error.message },
      name: error.spaceName,
      conflictId: error.spaceId
    });
    return true;
  }

  async function handleImportSpaceArchive(request, response, spaceStore, url, modelUpdateHooks = {}) {
    const mode = String(url?.searchParams?.get("mode") ?? "").trim();
    const renameName = normalizeSpaceName(url?.searchParams?.get("name") ?? "");
    if (mode && mode !== "overwrite" && mode !== "rename") {
      sendError(response, 400, `未知的导入方式：${mode}。`, "SPACE_IMPORT_MODE_INVALID");
      return;
    }
    if (mode === "rename" && !isAcceptableSpaceName(renameName)) {
      sendError(response, 400, spaceNameRejectMessage(renameName), "SPACE_NAME_INVALID");
      return;
    }
    const buffer = await readRawBody(request, maxSchemeZipBodyBytes, "空间压缩包过大，最大支持 256MB。");
    if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
      sendError(response, 400, "缺少空间压缩包。");
      return;
    }
    let zip;
    try {
      zip = await readZipEntriesAsync(buffer, { label: "空间压缩包" });
    } catch (error) {
      if (error instanceof Error && /总大小超过/.test(error.message)) {
        sendError(response, 400, error.message);
        return;
      }
      sendError(response, 400, "zip 文件格式不正确。");
      return;
    }
    let space = null;
    let spaceRoot = null;
    let replacedSpaceId = "";
    let previousModelSnapshot = null;
    try {
      assertZipUncompressedSizeWithinLimit(zip, "空间压缩包");
      const entries = zip.getEntries();
      const zipRootName = zipRootNameFor(entries, "导入空间", "空间");
      const metaName = normalizeSpaceName(readSpaceArchiveName(zip, zipRootName));
      const fallbackName = normalizeSpaceName(zipRootName);
      const packedName = isAcceptableSpaceName(metaName)
        ? metaName
        : (isAcceptableSpaceName(fallbackName) ? fallbackName : "导入空间");
      const name = mode === "rename" ? renameName : packedName;
      if (mode === "overwrite") {
        const clash = (await spaceStore.list()).find((item) => normalizeSpaceName(item.name) === name);
        if (clash) {
          replacedSpaceId = clash.id;
          previousModelSnapshot = await modelUpdateHooks.capture?.(spaceStore.resolvePaths(clash.id));
          const clashRoot = spaceStore.resolvePaths(clash.id).root;
          retiredSpaceRoots.add(clashRoot);
          await evictRegistry(clashRoot);
          await spaceStore.remove(clash.id);
        }
      }
      space = await spaceStore.create(name, { onDuplicate: "reject" });
      spaceRoot = spaceStore.resolvePaths(space.id).root;
      retiredSpaceRoots.delete(spaceRoot);
      await extractSpaceZipToDirectory(zip, spaceRoot, zipRootName);
    } catch (error) {
      if (space) {
        await spaceStore.remove(space.id).catch((removeError) => {
          console.warn(`[space-import] 回滚空间「${space.id}」失败：${removeError.message}`);
        });
        if (spaceRoot && !spaceStore.has(space.id)) {
          retiredSpaceRoots.add(spaceRoot);
        }
      }
      if (replacedSpaceId && !spaceStore.has(replacedSpaceId)) {
        modelUpdateHooks.closeSpace?.(replacedSpaceId);
      }
      if (sendSpaceNameConflict(response, error)) return;
      sendError(response, 400, error instanceof Error ? error.message : "导入空间压缩包失败。");
      return;
    }
    if (replacedSpaceId) {
      if (space.id === replacedSpaceId) {
        await modelUpdateHooks.publish?.(
          space.id,
          spaceStore.resolvePaths(space.id),
          previousModelSnapshot
        );
      } else {
        modelUpdateHooks.closeSpace?.(replacedSpaceId);
      }
    }
    const spaces = await spaceStore.list();
    sendJson(response, 200, { ok: true, space, spaces, savedAt: new Date().toISOString() });
  }

  return {
    trySnapshotSavedModels,
    publishModelChangesSince,
    publishSavedModelChange,
    handleSaveSchemes,
    handleReadSchemeProject,
    handleSaveSchemeProject,
    handleDeleteSchemeProject,
    handleSaveSchemeRecord,
    handleDeleteSchemeRecord,
    handleExportSchemeArchive,
    handleImportSchemeArchive,
    handleExportSpaceArchive,
    spaceNameRejectMessage,
    sendSpaceNameConflict,
    handleImportSpaceArchive
  };
}
