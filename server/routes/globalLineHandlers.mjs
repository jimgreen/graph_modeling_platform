/**
 * 全局线路注册表 HTTP 处理器（从 server/server.mjs 拆离）。
 * 零模块级路径常量，所有空间路径经由参数 paths 显式透传。
 */
import { GlobalLineRegistryError } from "../globalLineRegistry.mjs";

export function createGlobalLineHandlers({
  registryFor,
  readJsonBody,
  sendJson,
  sendError,
  maxMeasurementConfigBodyBytes,
  maxSchemeBodyBytes
}) {
  async function handleGlobalLineRegistryOperation(response, operation, successStatus = 200) {
    try {
      const result = await operation();
      sendJson(response, successStatus, result);
    } catch (error) {
      if (error instanceof GlobalLineRegistryError) {
        sendError(response, error.statusCode, error.message);
        return;
      }
      throw error;
    }
  }

  async function handleListGlobalLines(response, paths) {
    await handleGlobalLineRegistryOperation(response, async () => ({
      ok: true,
      records: await registryFor(paths).list()
    }));
  }

  async function handleAttachGlobalLine(request, response, paths) {
    const payload = await readJsonBody(request, maxMeasurementConfigBodyBytes, "全局线路数据过大，最大支持 1MB。");
    await handleGlobalLineRegistryOperation(response, async () => ({
      ok: true,
      record: await registryFor(paths).attach(payload)
    }), 201);
  }

  async function handleDetachGlobalLine(request, response, paths) {
    const payload = await readJsonBody(request, maxMeasurementConfigBodyBytes, "全局线路数据过大，最大支持 1MB。");
    await handleGlobalLineRegistryOperation(response, async () => ({
      ok: true,
      record: await registryFor(paths).detach(payload)
    }));
  }

  async function handleUpdateGlobalLine(request, response, paths) {
    const payload = await readJsonBody(request, maxMeasurementConfigBodyBytes, "全局线路数据过大，最大支持 1MB。");
    await handleGlobalLineRegistryOperation(response, async () => ({
      ok: true,
      record: await registryFor(paths).update(payload)
    }));
  }

  async function handleDeleteEmptyGlobalLine(request, response, paths) {
    const payload = await readJsonBody(request, maxMeasurementConfigBodyBytes, "全局线路数据过大，最大支持 1MB。");
    await handleGlobalLineRegistryOperation(response, async () => ({
      ok: true,
      record: await registryFor(paths).deleteEmpty(payload)
    }));
  }

  async function handleSyncGlobalLineProject(request, response, paths) {
    const payload = await readJsonBody(request, maxSchemeBodyBytes, "模型全局线路数据过大，最大支持 64MB。");
    await handleGlobalLineRegistryOperation(response, async () => ({
      ok: true,
      ...(await registryFor(paths).syncProject(payload))
    }));
  }

  return {
    handleListGlobalLines,
    handleAttachGlobalLine,
    handleDetachGlobalLine,
    handleUpdateGlobalLine,
    handleDeleteEmptyGlobalLine,
    handleSyncGlobalLineProject
  };
}
