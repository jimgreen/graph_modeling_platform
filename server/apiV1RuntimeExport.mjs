// 统一运行时 SVG/E 文件导出入口。
import { apiPattern } from "./config.mjs";
import { sendV1Error } from "./v1Response.mjs";
import { handleV1RuntimeSvg, handleV1RuntimeEFile, handleV1RuntimeEFilePost } from "./apiV1Runtime.mjs";

export async function handleV1RuntimeExport(route, ctx) {
  const format = String(route.url.searchParams.get("format") ?? "").trim();
  if (format !== "svg" && format !== "e-file") {
    sendV1Error(route.response, "bad-request", "format 仅支持 svg 或 e-file。");
    return;
  }
  const method = route.request?.method ?? "GET";
  if (method === "POST" && format !== "e-file") {
    sendV1Error(route.response, "bad-request", "POST 仅支持 format=e-file。");
    return;
  }
  const allowed = format === "svg"
    ? new Set(["format", "clientId"])
    : new Set(["format", "clientId", "template"]);
  if (method === "POST") {
    allowed.delete("template");
  }
  const unexpected = [...route.url.searchParams.keys()].find((key) => !allowed.has(key));
  if (unexpected) {
    sendV1Error(route.response, "bad-request", `format=${format} 不接受参数 ${unexpected}。`);
    return;
  }
  if (format === "svg") return handleV1RuntimeSvg(route, ctx);
  if (method === "POST") return handleV1RuntimeEFilePost(route, ctx);
  return handleV1RuntimeEFile(route, ctx);
}

export const v1RuntimeExportRoutes = [
  { method: "GET", pattern: apiPattern("/v1/runtime/export", "/?$"), handle: handleV1RuntimeExport },
  { method: "POST", pattern: apiPattern("/v1/runtime/export", "/?$"), handle: handleV1RuntimeExport }
];

export function createV1RuntimeExportRoutes(ctx) {
  const wrap = (handler) => ({ spaceId, ...route }) => {
    if (!spaceId) throw new Error("缺少 spaceId：运行时导出必须绑定空间。");
    return handler(route, {
      ...ctx,
      fetchFromClient: (clientId, resource, params) => ctx.fetchFromClient(clientId, resource, params, spaceId)
    });
  };
  return v1RuntimeExportRoutes.map((route) => ({ ...route, handle: wrap(handleV1RuntimeExport) }));
}
