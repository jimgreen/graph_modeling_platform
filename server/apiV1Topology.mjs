import { modelAssociationProjectIndexesForSchemes } from "../src/model.ts";
import { runTopologyOperation } from "../src/topology-operation.ts";
import {
  readSchemeProjectRecord,
  readSchemes,
  resolveSchemePathForSelector,
  updateSchemeProjectRecordIfUnchanged
} from "./server.mjs";
import { apiPattern } from "./config.mjs";
import { sendV1Error, sendV1JsonNoStore, sendV1PayloadTooLarge } from "./v1Response.mjs";
import { readJsonBody } from "./readJsonBody.mjs";

const DEFAULT_SERVICES = { readSchemeProjectRecord, readSchemes, resolveSchemePathForSelector, updateSchemeProjectRecordIfUnchanged };

function readClientId(url) {
  return (url.searchParams.get("clientId") ?? "").trim() || null;
}

function parseTarget(payload, url, response) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    sendV1Error(response, "bad-request", "请求体须为 JSON 对象。");
    return null;
  }
  const allowedKeys = payload.target === "saved"
    ? new Set(["action", "target", "schemePath", "schemeId", "name"])
    : new Set(["action", "target"]);
  const unexpectedKey = Object.keys(payload).find((key) => !allowedKeys.has(key));
  if (unexpectedKey) {
    sendV1Error(response, "bad-request", `请求体字段 ${unexpectedKey} 与目标不匹配。`);
    return null;
  }
  if (payload.target === "current") {
    return { target: "current", clientId: readClientId(url) };
  }
  if (payload.target === "saved") {
    if (readClientId(url)) {
      sendV1Error(response, "bad-request", "target=saved 不可同时指定 clientId。");
      return null;
    }
    let schemePath;
    if (payload.schemePath !== undefined) {
      if (!Array.isArray(payload.schemePath) || payload.schemePath.length === 0 ||
        payload.schemePath.some((part) => typeof part !== "string" || !part.trim() || part.trim() === "." || part.trim() === "..")) {
        sendV1Error(response, "bad-request", "target=saved 的 schemePath 须为非空字符串数组。");
        return null;
      }
      schemePath = payload.schemePath.map((part) => part.trim());
    }
    let schemeId;
    if (payload.schemeId !== undefined && payload.schemeId !== null) {
      const numeric = typeof payload.schemeId === "number"
        ? payload.schemeId
        : typeof payload.schemeId === "string" && payload.schemeId.trim()
          ? Number(payload.schemeId.trim())
          : NaN;
      if (!Number.isSafeInteger(numeric) || numeric <= 0) {
        sendV1Error(response, "bad-request", "schemeId 必须是正安全整数。");
        return null;
      }
      schemeId = numeric;
    }
    if (!schemePath && schemeId === undefined) {
      sendV1Error(response, "bad-request", "target=saved 须提供 schemePath 或 schemeId。");
      return null;
    }
    if (typeof payload.name !== "string" || !payload.name.trim()) {
      sendV1Error(response, "bad-request", "target=saved 须提供模型 name。");
      return null;
    }
    return { target: "saved", schemePath, schemeId, name: payload.name.trim() };
  }
  sendV1Error(response, "bad-request", "target 须为 current 或 saved。");
  return null;
}

async function readPayload(request, response) {
  try {
    const payload = await readJsonBody(request);
    if (payload === null) {
      sendV1Error(response, "bad-request", "请求体须为 JSON 对象。");
      return null;
    }
    return payload;
  } catch (error) {
    if (sendV1PayloadTooLarge(response, error)) return null;
    sendV1Error(response, "bad-request", "请求体须为合法 JSON。");
    return null;
  }
}

function errorMessage(error, fallback) {
  return error instanceof Error ? error.message : fallback;
}

function responseData(target, result, { modified = false, saved = false } = {}) {
  return {
    target: target.target,
    status: result.status,
    errors: result.errors,
    warnings: result.warnings,
    topologyIslandCount: result.topologyIslandCount,
    corrections: result.corrections,
    modified,
    saved
  };
}

export function createV1TopologyHandlers(services = DEFAULT_SERVICES) {
  const execute = (mode) => async ({ request, response, url, paths }, ctx, payload) => {
    const target = parseTarget(payload, url, response);
    if (!target) return;

    if (target.target === "current") {
      try {
        const data = await ctx.sendCommandToClient(
          target.clientId,
          mode === "check" ? "topology.check" : "topology.repair",
          {}
        );
        await sendV1JsonNoStore(response, {
          target: "current",
          status: data?.status,
          errors: data?.errors ?? [],
          warnings: data?.warnings ?? [],
          topologyIslandCount: data?.topologyIslandCount,
          corrections: data?.corrections ?? [],
          modified: mode === "repair" && data?.modified === true,
          saved: false
        });
      } catch (error) {
        const code = error?.code ?? "internal";
        sendV1Error(response, code, errorMessage(error, "当前页面拓扑操作失败。"));
      }
      return;
    }

    try {
      target.schemePath = await services.resolveSchemePathForSelector({
        paths,
        schemePath: target.schemePath,
        schemeId: target.schemeId
      });
      const record = await services.readSchemeProjectRecord({ paths, schemePath: target.schemePath, name: target.name });
      if (!record) {
        sendV1Error(response, "not-found", "指定的已保存模型不存在。");
        return;
      }
      const schemes = await services.readSchemes({ paths, includeProjects: true });
      const modelAssociationProjectIndexes = modelAssociationProjectIndexesForSchemes(schemes ?? []);
      const result = runTopologyOperation(record.project, {
        mode,
        capacityFixScopeKey: `${target.schemePath.join("/")}:${record.id ?? target.name}`,
        modelAssociationProjectIndexes
      });
      const modified = mode === "repair" && result.modified === true;
      let saved = false;
      if (modified) {
        const update = await services.updateSchemeProjectRecordIfUnchanged({
          paths,
          schemePath: target.schemePath,
          name: target.name,
          expectedUpdatedAt: record.updatedAt,
          expectedContentHash: record.contentHash,
          record: {
            ...record,
            updatedAt: new Date().toISOString(),
            project: { ...record.project, nodes: result.nodes }
          }
        });
        if (update.conflict) {
          sendV1Error(response, "bad-request", "模型在拓扑修复期间已被修改；请重新检查后再修复。");
          return;
        }
        saved = true;
        if (typeof ctx?.publishModelChanged === "function") {
          try {
            await ctx.publishModelChanged({ schemePath: target.schemePath, record: update.record });
          } catch (error) {
            console.warn(`[model-update] 拓扑修复通知失败：${error?.message ?? error}`);
          }
        }
      }
      await sendV1JsonNoStore(response, responseData(target, result, { modified: mode === "repair" && modified, saved }));
    } catch (error) {
      sendV1Error(response, error?.code ?? "internal", errorMessage(error, "已保存模型拓扑操作失败。"));
    }
  };
  const handle = (mode) => async (route, ctx) => {
    const payload = await readPayload(route.request, route.response);
    if (payload === null) return;
    return execute(mode)(route, ctx, payload);
  };
  const handleUnified = async (route, ctx) => {
    const payload = await readPayload(route.request, route.response);
    if (payload === null) return;
    const action = String(payload.action ?? "").trim();
    if (action !== "check" && action !== "repair") {
      sendV1Error(route.response, "bad-request", "action 须为 check 或 repair。");
      return;
    }
    return execute(action)(route, ctx, payload);
  };
  return {
    handleTopologyCheck: handle("check"),
    handleTopologyRepair: handle("repair"),
    handleV1Topology: handleUnified
  };
}

export const { handleTopologyCheck, handleTopologyRepair, handleV1Topology } = createV1TopologyHandlers();

export function createV1TopologyRoutes(ctx, onModelChanged) {
  const wrap = (handler) => ({ spaceId, ...route }) => {
    if (!spaceId) {
      throw new Error("缺少 spaceId：v1 拓扑操作必须由派发层注入空间。");
    }
    if (!route.paths) {
      throw new Error("缺少 paths：v1 拓扑操作必须使用派发层注入的空间路径。");
    }
    const requestCtx = {
      ...ctx,
      sendCommandToClient: (clientId, name, params) => ctx.sendCommandToClient(clientId, name, params, spaceId),
      ...(typeof onModelChanged === "function" ? {
        publishModelChanged: (event) => onModelChanged({
          ...event,
          spaceId,
          paths: route.paths
        })
      } : {})
    };
    return handler(route, requestCtx);
  };
  return [{
    method: "POST",
    pattern: apiPattern("/v1/topology", "/?$"),
    handle: wrap(handleV1Topology)
  }];
}

export const v1TopologyUnifiedRoutes = [{
  method: "POST",
  pattern: apiPattern("/v1/topology", "/?$"),
  handle: ({ request, response, url, paths }, ctx) => handleV1Topology({ request, response, url, paths }, ctx)
}];
