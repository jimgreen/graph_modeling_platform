// 统一已保存模型导出入口。
// format 分派到现有 JSON/SVG/E/CIM handler，避免复制各格式的生成、编码和错误语义。
import { apiPattern } from "./config.mjs";
import { sendV1Error } from "./v1Response.mjs";
import { withSpacePaths } from "./spaceStore.mjs";
import { handleV1ModelJson, handleV1ModelSvg } from "./apiV1Schemes.mjs";
import { handleV1ModelEFile, handleV1ModelEFilePost } from "./eFileExport.mjs";
import { handleV1ModelCimXml } from "./cimExport.mjs";

const FORMATS = new Set(["json", "svg", "e-file", "cim-xml"]);
const ALLOWED_GET = {
  json: new Set(["format", "schemeId", "schemePath", "name"]),
  svg: new Set(["format", "schemeId", "schemePath", "name", "colorMode", "encoding"]),
  "e-file": new Set(["format", "schemeId", "schemePath", "name", "template", "encoding"]),
  "cim-xml": new Set(["format", "schemeId", "schemePath", "name", "modelId", "strict"])
};
const ALLOWED_POST = new Set(["format", "schemeId", "schemePath", "name", "encoding"]);

function queryKeys(url) {
  return new Set(url.searchParams.keys());
}

function validateFormat(url, response, method) {
  const format = String(url.searchParams.get("format") ?? "").trim();
  if (!FORMATS.has(format)) {
    sendV1Error(response, "bad-request", "format 仅支持 json、svg、e-file 或 cim-xml。");
    return null;
  }
  if (method === "POST" && format !== "e-file") {
    sendV1Error(response, "bad-request", "POST 仅支持 format=e-file。");
    return null;
  }
  const allowed = method === "POST" ? ALLOWED_POST : ALLOWED_GET[format];
  const unexpected = [...queryKeys(url)].find((key) => !allowed.has(key));
  if (unexpected) {
    sendV1Error(response, "bad-request", `format=${format} 不接受参数 ${unexpected}。`);
    return null;
  }
  return format;
}

export async function handleV1ModelExport(route, ctx) {
  const { request, response, url } = route;
  const format = validateFormat(url, response, request?.method ?? "GET");
  if (!format) return;
  if (format === "json") return handleV1ModelJson(route);
  if (format === "svg") return handleV1ModelSvg(route);
  if (format === "cim-xml") return handleV1ModelCimXml(route);
  if ((request?.method ?? "GET") === "POST") return handleV1ModelEFilePost(route);
  return handleV1ModelEFile(route);
}

export const v1ModelExportRoutes = [
  {
    method: "GET",
    pattern: apiPattern("/v1/schemes/model/export", "/?$"),
    handle: withSpacePaths(handleV1ModelExport)
  },
  {
    method: "POST",
    pattern: apiPattern("/v1/schemes/model/export", "/?$"),
    handle: withSpacePaths(handleV1ModelExport)
  }
];
