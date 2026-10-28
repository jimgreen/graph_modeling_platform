// MCP 工具层：把 v1 handler 包装成 MCP 工具。
//
// ## 分工
//
//   · **参数翻译**：LLM 友好的入参（数组、枚举）→ v1 的 query / body。
//   · **信封搬运**：v1 的 `{ok:true,data}` / `{ok:false,error:{code,message}}`
//     → MCP 的 `content`（人/LLM 可读）+ `structuredContent`（机器可读）。
//   · **错误可执行化**：错误码 → 「下一步做什么」的建议。
//
// ## 不做（也不该做）
//
//   · 不自己实现方案读取 / 图元库读取 / 导出逻辑 —— 一律调 v1 handler
//     （**一个端点一处实现**：MCP 是 v1 的第二个前端，不是第二份实现）。
//   · 不改 v1 handler 的行为 —— 参数校验、错误码、空间口径全部沿用 v1。
//   · 不自己解析空间 —— 空间由派发层解析后注入（paths / spaceId）。
//
// ## 为什么 schemePath 收「字符串数组」而不是 URL 编码串
//
// v1 的 `schemePath` query 值是 `encodeURIComponent(JSON.stringify(parts))`。
// 让 LLM 手工做百分号编码极易出错（漏编 / 多编 / 把 % 写成本义），
// 而错误信息（400「缺少或非法 schemePath。」）完全指不到真正的原因。
// 故工具层收数组，内部按 v1 的**同一套**编码规则（server/schemePath.mjs）转成
// query 值；传给桥的是**已解码形态**（JSON 数组文本），由桥施加百分号编码。
import { z } from "zod";

import {
  handleV1Schemes,
  handleV1SchemeModels,
  handleV1ModelJson,
  handleV1SchemeExport,
  handleV1ModelSvg
} from "../apiV1Schemes.mjs";
import { handleV1ModelEFile, handleV1ModelEFilePost } from "../eFileExport.mjs";
import { handleV1ModelCimXml } from "../cimExport.mjs";
import { handleV1ModelSend } from "../sendModel.mjs";
import {
  handleV1Library,
  handleV1LibraryCategories,
  handleV1LibraryDevices,
  handleV1LibraryMeasurements,
  handleV1LibraryDeviceDefinitions,
  handleV1LibraryTemplates
} from "../apiV1Library.mjs";
import {
  handleV1RuntimeClients,
  handleV1RuntimeModel,
  handleV1RuntimeDevices,
  handleV1RuntimeSelection,
  handleV1RuntimeTabs,
  handleV1RuntimeTab,
  handleV1RuntimeScreenshot,
  handleV1RuntimeSvg,
  handleV1RuntimeEFile,
  handleV1RuntimeEFilePost,
  handleV1RuntimeDom
} from "../apiV1Runtime.mjs";
import {
  handleControlDeviceAdd,
  handleControlSchemeCreate,
  handleControlModelCreate,
  handleControlDevicesSelect,
  handleControlDevicesGroup,
  handleControlDeviceDelete,
  handleControlDevicePropertyUpdate,
  handleControlSave,
  handleControlTemplateSaveFromSelection,
  handleControlExportEDeviceDefinition,
  handleControlImportEDeviceDefinition,
  handleControlSpaceSwitch,
  handleControlModelSwitch
} from "../apiV1Control.mjs";

import { invokeV1Handler, parseV1Envelope, errorHint } from "./v1Bridge.mjs";
import { resolveClientToken } from "./clientToken.mjs";
import iconv from "iconv-lite";

// ───────────────────────────── 输出信封 ─────────────────────────────

// 所有 JSON 类工具共用一个输出信封形状：{ ok, data?, error? }。
// 形状**实测**过（SDK 的 zod 兼容层会把 v4 classic 的 raw shape 转成 v4-mini
// 的 object，z.unknown().optional() 仍能承载任意 JSON）：
//   · tools/list 输出的 outputSchema = { type:"object", properties:{ ok, data, error },
//     required:["ok"], additionalProperties:false }
//   · 回 { ok:true, data:{...} } / { ok:false, error:{ code, message } } 都能通过校验。
// ⚠ 一旦声明了 outputSchema，**每次都必须回 structuredContent**
//   （SDK 缺 structuredContent 会抛 "Tool X has an output schema but no structured content was provided"）。
const ENVELOPE_OUTPUT_SHAPE = {
  ok: z.boolean().describe("是否成功"),
  data: z.unknown().optional().describe("成功时的数据（结构按工具而定）"),
  error: z
    .object({
      code: z.string().describe("错误码"),
      message: z.string().describe("错误信息")
    })
    .optional()
    .describe("失败时的错误")
};

const READ_ONLY = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };
const WRITE = { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false };
const DESTRUCTIVE = { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false };

// ───────────────────────────── 结果构造 ─────────────────────────────

function successResult(data, text) {
  return {
    content: [{ type: "text", text: text ?? JSON.stringify(data ?? null) }],
    structuredContent: { ok: true, data }
  };
}

function errorResult(code, message) {
  const hint = errorHint(code);
  const suffix = hint ? `\n建议：${hint}` : "";
  return {
    content: [{ type: "text", text: `错误（${code}）：${message}${suffix}` }],
    structuredContent: { ok: false, error: { code, message } },
    isError: true
  };
}

/** 参数层面的错误（还没走到 v1）：与 v1 的错误信封同构，code 固定 bad-request。 */
function badRequest(message) {
  return errorResult("bad-request", message);
}

/**
 * 把 v1 客户端的 `clientId` 改名成 `token`。
 *
 * v1 的契约（`/v1/runtime/clients`）已经发布，字段就叫 `clientId`，不能改；
 * 但 MCP 这一层的用户词汇是 token —— 会话类工具的**入参**已经叫 `token`，
 * 出参若还叫 `clientId`，调用方得自己在脑子里做一次映射，很容易传错。
 * 故只在这一处把出参改名，v1 契约原样保留。
 *
 * 失败结果原样返回：错误信封里没有 clients 字段，改名无意义。
 */
function renameClientsToToken(result) {
  const data = result?.structuredContent?.data;
  const clients = data?.clients;
  if (result?.isError || !Array.isArray(clients)) {
    return result;
  }
  const renamed = clients.map((client) => {
    const { clientId, ...rest } = client ?? {};
    return { token: clientId, ...rest };
  });
  const nextData = { ...data, clients: renamed };
  return {
    ...result,
    // 文本块默认是 JSON.stringify(data)：改名后必须重算，否则内容块与结构化数据不一致
    content: [{ type: "text", text: JSON.stringify(nextData) }],
    structuredContent: { ...result.structuredContent, data: nextData }
  };
}

/**
 * 调用一个 v1 handler 并把结果转成 MCP 结果。
 *
 * v1 的响应有三种形态，MCP 侧分别处理（**不能一律当 JSON 解析** ——
 * SVG / E 文件 / CIM XML 是文本，方案 ZIP / 截图是二进制）：
 *   1. `application/json` → 信封 `{ok:true,data}`；
 *   2. 文本类（text/plain、image/svg+xml、application/xml）→ 正文放 content，
 *      structuredContent.data = { text, filename, mimeType }；
 *   3. 二进制类（application/zip、image/png）→ 放成 image / resource 块。
 *
 * @param {Function} handler v1 handler
 * @param {object} options 传给 invokeV1Handler 的参数
 * @param {object} [opts]
 * @param {object} [opts.ctx] 会话类域的 ctx（runtime / control 必填）
 * @param {boolean} [opts.binary=false] 响应是二进制（ZIP / PNG）时置 true
 * @param {boolean} [opts.asImage=true] 二进制是否用 image 块（PNG 用它；ZIP 用嵌入资源）
 * @param {string} [opts.mimeType] 二进制的 MIME（缺省按响应头的 content-type）
 * @param {string} [opts.summary] 二进制的文字说明
 * @param {string} [opts.text] JSON 结果的文本内容（默认 JSON.stringify(data)）
 */
async function runV1(handler, options, opts = {}) {
  const result = await invokeV1Handler(handler, { ...options, ctx: opts.ctx });
  const envelope = parseV1Envelope(result);
  if (!envelope.ok) {
    return errorResult(envelope.error.code, envelope.error.message);
  }
  const filename = filenameFromContentDisposition(result.headers?.["content-disposition"]);

  if (envelope.isJson) {
    return successResult(envelope.data, opts.text);
  }

  if (opts.binary) {
    const mimeType = opts.mimeType ?? envelope.contentType ?? "application/octet-stream";
    const base64 = envelope.bytes.toString("base64");
    const content = [];
    if (opts.asImage !== false) {
      content.push({ type: "image", data: base64, mimeType });
    } else {
      // 通用二进制：塞成嵌入资源（blob + data URI），客户端可解出来落盘。
      content.push({
        type: "resource",
        resource: {
          uri: `data:${mimeType};base64,${base64}`,
          mimeType,
          blob: base64
        }
      });
    }
    content.push({ type: "text", text: opts.summary ?? `已生成 ${mimeType} 二进制内容（${envelope.bytes.length} 字节）。` });
    // 二进制工具**不声明** outputSchema（字节不是 JSON），故此处不套信封；
    // 只回可核对的元信息，让调用方知道拿到了什么、多大。
    return {
      content,
      structuredContent: {
        filename: filename ?? null,
        bytes: envelope.bytes.length,
        mimeType
      }
    };
  }

  // 文本类（SVG / E 文件 / CIM XML）
  const text = decodeTextBytes(envelope.bytes, envelope.contentType);
  return {
    content: [{ type: "text", text }],
    structuredContent: {
      ok: true,
      data: {
        text,
        filename: filename ?? null,
        mimeType: envelope.contentType || "text/plain"
      }
    }
  };
}

/**
 * 按响应头的 charset 解码正文。
 *
 * E 文件默认是 **GBK**（v1 的 `parseEFileQuery` 里 encoding 缺省即 gbk），
 * 直接 `toString("utf-8")` 会把中文全部解成乱码 —— 而乱码对 LLM 毫无用处。
 * 故按 content-type 里的 charset 走 iconv；charset 缺失或不被支持时回落 UTF-8。
 */
function decodeTextBytes(bytes, contentType) {
  const match = /charset=([\w-]+)/i.exec(String(contentType ?? ""));
  const charset = match ? match[1].toLowerCase() : "";
  if (charset && charset !== "utf-8" && charset !== "utf8" && iconv.encodingExists(charset)) {
    return iconv.decode(bytes, charset);
  }
  return bytes.toString("utf-8");
}

/** 从 content-disposition 头里取文件名（响应头里的值是百分号编码过的）。 */
function filenameFromContentDisposition(value) {
  if (!value) {
    return null;
  }
  const match = /filename\*=UTF-8''([^;]+)/i.exec(value) ?? /filename="([^"]+)"/i.exec(value);
  if (!match) {
    return null;
  }
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

// ───────────────────────────── 入参片段 ─────────────────────────────

const SCHEME_PATH = z
  .array(z.string().min(1))
  .describe('方案路径：自上而下的方案名数组，例如 ["方案A","子方案"]。用 gmp_list_schemes 确认层级。');

const CLIENT_ID = z
  .string()
  .min(1)
  .optional()
  .describe("内部占位：MCP 对外暴露为 token（见 registry 末尾的 withTokenArgument）。");

const MODEL_TYPE = z
  .enum(["微网", "厂站", "馈线", "台区", "其他"])
  .describe("模型类型。");

/**
 * 页面 token（= WS clientId = 地址栏 `?token=`）。
 *
 * 语义见 server/mcp/clientToken.mjs：本空间只有一个在线页面时可不填；
 * 多个在线页面时必须填，否则工具回 token-required 并列出可选 token。
 */
const TOKEN = z
  .string()
  .min(1)
  .max(128)
  .optional()
  .describe(
    "目标页面的 token（就是该页面地址栏里的 ?token= 的值）。本空间只有一个在线页面时可不填；"
    + "有多个在线页面时必须填，否则工具会回 token-required 并列出在线 token。用 gmp_list_runtime_clients 查看在线页面各自的 token。"
  );

// ───────────────────────────── 工具注册表 ─────────────────────────────

/**
 * 构造全部工具定义。
 *
 * @param {object} options
 * @param {string} options.spaceId 当前空间（派发层解析后注入）
 * @param {object} options.paths 当前空间的路径集合
 * @param {object} options.runtimeWs 运行时态 WS 桥（fetchFromClient / sendCommandToClient / listClients）
 * @returns {Array<object>} 工具定义数组
 */
export function createMcpToolRegistry({ spaceId, paths, runtimeWs } = {}) {
  // 会话类 ctx：把空间**焊死**在闭包里。
  // v1 的 createV1RuntimeRoutes / createV1ControlRoutes 也是这么做的（缺空间即抛错），
  // 理由相同：漏传空间会让 runtimeRegistry 的空间校验整段短路（fail-open），
  // 静默退回「全局取活跃者」——多空间下会打到别人的前端会话。
  const sessionCtx = {
    fetchFromClient: (clientId, resource, params) =>
      runtimeWs?.fetchFromClient?.(clientId, resource, params, spaceId),
    sendCommandToClient: (clientId, name, params) =>
      runtimeWs?.sendCommandToClient?.(clientId, name, params, spaceId),
    listClients: () => runtimeWs?.listClients?.() ?? []
  };

  // schemePath → v1 的 query 值（已解码形态：JSON 数组文本）。
  // 由桥（buildBridgeUrl）施加百分号编码，与 encodeSchemePath 同形，不会双重编码。
  const schemePathQuery = (parts) => JSON.stringify(parts);

  // 空间缺失是接线 bug（派发层对 /mcp 恒注入 spaceId）。此处直接拒，
  // 不静默退回默认空间 —— 那会让读工具读到别的空间的数据、写工具改到别的空间。
  const requireSpace = () => {
    if (!spaceId || !paths) {
      return badRequest("缺少空间上下文：MCP 工具必须在指定空间的会话内调用。");
    }
    return null;
  };

  const tools = [];

  // ───────────────── 方案域 ─────────────────

  tools.push({
    name: "gmp_list_schemes",
    title: "列出方案",
    description:
      "列出当前空间的方案树（方案名、更新时间、其下模型摘要）。用 includeProjects=true 可同时带回每个方案的完整模型数据（很大，只在确实需要时用）。",
    inputSchema: {
      includeProjects: z
        .boolean()
        .optional()
        .describe("是否带回方案的完整模型数据。默认 false（只返回摘要）。")
    },
    outputSchema: ENVELOPE_OUTPUT_SHAPE,
    annotations: READ_ONLY,
    handler: async (args) => {
      const spaceError = requireSpace();
      if (spaceError) return spaceError;
      return runV1(handleV1Schemes, {
        method: "GET",
        path: "/v1/schemes",
        query: { includeProjects: args.includeProjects ? "1" : undefined },
        paths,
        spaceId
      });
    }
  });

  tools.push({
    name: "gmp_list_scheme_models",
    title: "列出方案下的模型",
    description: "列出指定方案下的所有模型（模型名与更新时间）。",
    inputSchema: {
      schemePath: SCHEME_PATH
    },
    outputSchema: ENVELOPE_OUTPUT_SHAPE,
    annotations: READ_ONLY,
    handler: async (args) => {
      const spaceError = requireSpace();
      if (spaceError) return spaceError;
      return runV1(handleV1SchemeModels, {
        method: "GET",
        path: "/v1/schemes/models",
        query: { schemePath: schemePathQuery(args.schemePath) },
        paths,
        spaceId
      });
    }
  });

  tools.push({
    name: "gmp_get_model_json",
    title: "读取模型 JSON",
    description: "读取一个已保存模型的完整 JSON（节点、连线、量测等），用于分析模型结构。",
    inputSchema: {
      schemePath: SCHEME_PATH,
      name: z.string().min(1).describe("模型名（该方案下的模型）。")
    },
    outputSchema: ENVELOPE_OUTPUT_SHAPE,
    annotations: READ_ONLY,
    handler: async (args) => {
      const spaceError = requireSpace();
      if (spaceError) return spaceError;
      return runV1(handleV1ModelJson, {
        method: "GET",
        path: "/v1/schemes/model/json",
        query: { schemePath: schemePathQuery(args.schemePath), name: args.name },
        paths,
        spaceId
      });
    }
  });

  // gmp_export_model：三种格式共用 schemePath + name，用 format 分派。
  // 各格式的专属参数在工具层按 format 校验 —— 传了不适用于该 format 的参数要**报错**，
  // 不能静默丢弃（静默丢弃会让调用方以为参数生效了）。
  const EXPORT_FORMAT_PARAMS = {
    svg: new Set(["colorMode", "encoding"]),
    "e-file": new Set(["encoding", "templateName", "templateText"]),
    "cim-xml": new Set(["modelId", "strict"])
  };
  const EXPORT_PARAM_NAMES = ["colorMode", "encoding", "templateName", "templateText", "modelId", "strict"];

  tools.push({
    name: "gmp_export_model",
    title: "导出模型",
    description:
      "把一个已保存模型导出为指定格式。format=svg 出 SVG 文本（colorMode=energy|voltage 选配色，encoding=utf-8|gbk 选编码）；format=e-file 出 E 格式文本（templateName 用预定义模板，templateText 用自定义模板文本，两者都给时以 templateText 为准）；format=cim-xml 出 CIM/XML（modelId 指定 CIM 侧模型标识，strict=true 时缺关键参数即报错）。",
    inputSchema: {
      schemePath: SCHEME_PATH,
      name: z.string().min(1).describe("模型名（该方案下的模型）。"),
      format: z.enum(["svg", "e-file", "cim-xml"]).describe("导出格式。"),
      colorMode: z.enum(["energy", "voltage"]).optional().describe("仅 format=svg：配色模式（默认 energy）。"),
      encoding: z.enum(["utf-8", "gbk"]).optional().describe("仅 format=svg / e-file：字符编码。"),
      templateName: z
        .string()
        .min(1)
        .optional()
        .describe("仅 format=e-file：预定义模板名（国网E格式 / 主网实时库 / 配网实时库 / 台区实时库）。"),
      templateText: z
        .string()
        .min(1)
        .optional()
        .describe("仅 format=e-file：自定义 E 元件定义模板文本（优先于 templateName）。"),
      modelId: z.string().min(1).optional().describe("仅 format=cim-xml：CIM 侧模型标识。"),
      strict: z.boolean().optional().describe("仅 format=cim-xml：严格校验关键参数是否齐全。")
    },
    outputSchema: ENVELOPE_OUTPUT_SHAPE,
    annotations: READ_ONLY,
    handler: async (args) => {
      const spaceError = requireSpace();
      if (spaceError) return spaceError;
      const allowed = EXPORT_FORMAT_PARAMS[args.format];
      if (!allowed) {
        return badRequest("format 仅支持 svg、e-file、cim-xml。");
      }
      for (const key of EXPORT_PARAM_NAMES) {
        if (args[key] !== undefined && !allowed.has(key)) {
          return badRequest(`format=${args.format} 时不接受参数 ${key}。`);
        }
      }
      const query = {
        schemePath: schemePathQuery(args.schemePath),
        name: args.name
      };
      if (args.format === "svg") {
        if (args.colorMode) query.colorMode = args.colorMode;
        if (args.encoding) query.encoding = args.encoding;
        return runV1(handleV1ModelSvg, {
          method: "GET",
          path: "/v1/schemes/model/svg",
          query,
          paths,
          spaceId
        });
      }
      if (args.format === "e-file") {
        if (args.encoding) query.encoding = args.encoding;
        if (args.templateText) {
          // 自定义模板走 POST 端点（v1 的 POST 收 body.templateText）
          return runV1(handleV1ModelEFilePost, {
            method: "POST",
            path: "/v1/schemes/model/e-file",
            query,
            body: { templateText: args.templateText, templateName: args.templateName },
            paths,
            spaceId
          });
        }
        if (args.templateName) query.template = args.templateName;
        return runV1(handleV1ModelEFile, {
          method: "GET",
          path: "/v1/schemes/model/e-file",
          query,
          paths,
          spaceId
        });
      }
      if (args.modelId) query.modelId = args.modelId;
      if (args.strict) query.strict = "1";
      return runV1(handleV1ModelCimXml, {
        method: "GET",
        path: "/v1/schemes/model/cim-xml",
        query,
        paths,
        spaceId
      });
    }
  });

  tools.push({
    name: "gmp_export_scheme_archive",
    title: "导出方案归档",
    description:
      "把整个方案（含其下所有模型）打包成一个 ZIP 并返回（二进制）。用于备份或把方案整体取走。",
    inputSchema: {
      schemePath: SCHEME_PATH
    },
    annotations: READ_ONLY,
    handler: async (args) => {
      const spaceError = requireSpace();
      if (spaceError) return spaceError;
      return runV1(
        handleV1SchemeExport,
        {
          method: "GET",
          path: "/v1/schemes/export",
          query: { schemePath: schemePathQuery(args.schemePath) },
          paths,
          spaceId
        },
        {
          binary: true,
          asImage: false,
          mimeType: "application/zip",
          summary: "已生成方案归档 ZIP（内容见上方 resource 块的 blob，base64 编码）。"
        }
      );
    }
  });

  tools.push({
    name: "gmp_send_model",
    title: "发送模型到外部接收端",
    description:
      "把一个已保存模型按指定格式 POST 到外部 HTTP(S) 接收端（multipart/form-data）。这会向第三方地址发出请求，确认目标地址无误再调用。",
    inputSchema: {
      url: z.string().min(1).describe("接收端地址，必须是 http:// 或 https:// 开头。"),
      files: z
        .array(
          z.object({
            kind: z.enum(["e", "json", "svg", "cim"]).describe("要发送的格式。"),
            encoding: z.enum(["utf-8", "gbk"]).optional().describe("字符编码，默认 utf-8。")
          })
        )
        .min(1)
        .describe("要发送的格式列表，至少一种。"),
      modelId: z
        .string()
        .regex(/^\d+$/)
        .optional()
        .describe("模型 ID（模型稳定序号）。推荐用它指定模型。"),
      schemePath: z.array(z.string().min(1)).optional().describe("方案路径（与 modelId 二选一）。"),
      name: z.string().min(1).optional().describe("模型名（与 modelId 二选一）。"),
      templateName: z
        .string()
        .min(1)
        .optional()
        .describe("E 文件用的预定义模板名（仅对 kind=e 生效）。")
    },
    outputSchema: ENVELOPE_OUTPUT_SHAPE,
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    handler: async (args) => {
      const spaceError = requireSpace();
      if (spaceError) return spaceError;
      if (!args.modelId && !(args.schemePath && args.name)) {
        return badRequest("请用 modelId，或用 schemePath + name 指定要发送的模型。");
      }
      const query = {};
      if (args.modelId) query.modelId = args.modelId;
      if (args.schemePath) query.schemePath = schemePathQuery(args.schemePath);
      if (args.name) query.name = args.name;
      const body = {
        url: args.url,
        files: args.files.map((item) => ({ kind: item.kind, encoding: item.encoding ?? "utf-8" }))
      };
      if (args.templateName) body.templateName = args.templateName;
      return runV1(handleV1ModelSend, {
        method: "POST",
        path: "/v1/schemes/model/send",
        query,
        body,
        paths,
        spaceId
      });
    }
  });

  // ───────────────── 图元库域 ─────────────────

  const LIBRARY_PARTS = {
    all: { path: "/v1/library", handler: handleV1Library },
    categories: { path: "/v1/library/categories", handler: handleV1LibraryCategories },
    devices: { path: "/v1/library/devices", handler: handleV1LibraryDevices },
    measurements: { path: "/v1/library/measurements", handler: handleV1LibraryMeasurements },
    "device-definitions": { path: "/v1/library/device-definitions", handler: handleV1LibraryDeviceDefinitions },
    templates: { path: "/v1/library/templates", handler: handleV1LibraryTemplates }
  };

  tools.push({
    name: "gmp_get_library",
    title: "读取图元库",
    description:
      "读取当前空间的图元库。part=all 一次取全（分类、设备图元、量测定义、元件定义、模板库）；也可用 part 只取其中一块以省上下文：categories（图元分类）、devices（设备图元库）、measurements（量测定义）、device-definitions（元件定义）、templates（模板库）。",
    inputSchema: {
      part: z
        .enum(["all", "categories", "devices", "measurements", "device-definitions", "templates"])
        .optional()
        .describe("取哪一块。默认 all。")
    },
    outputSchema: ENVELOPE_OUTPUT_SHAPE,
    annotations: READ_ONLY,
    handler: async (args) => {
      const spaceError = requireSpace();
      if (spaceError) return spaceError;
      const part = args.part ?? "all";
      const target = LIBRARY_PARTS[part];
      if (!target) {
        return badRequest(`part 仅支持 ${Object.keys(LIBRARY_PARTS).join("、")}。`);
      }
      return runV1(target.handler, {
        method: "GET",
        path: target.path,
        paths,
        spaceId
      });
    }
  });

  // ───────────────── 运行时态域 ─────────────────

  tools.push({
    name: "gmp_list_runtime_clients",
    title: "列出在线前端会话",
    description:
      "列出已连上本后端的前端页面。每条带 token（= 该页面地址栏里的 ?token=，多页面时必须把它传给其它工具）、所属空间、注册与最后活跃时间。运行时态与写操作都需要前端在线，调用前先用它确认有哪些页面、该用哪个 token。",
    inputSchema: {},
    outputSchema: ENVELOPE_OUTPUT_SHAPE,
    annotations: READ_ONLY,
    handler: async () => {
      const spaceError = requireSpace();
      if (spaceError) return spaceError;
      const result = await runV1(
        handleV1RuntimeClients,
        {
          method: "GET",
          path: "/v1/runtime/clients",
          paths,
          spaceId
        },
        { ctx: sessionCtx }
      );
      return renameClientsToToken(result);
    }
  });

  const runtimeTool = (name, title, description, path, handler) => ({
    name,
    title,
    description,
    inputSchema: { clientId: CLIENT_ID },
    outputSchema: ENVELOPE_OUTPUT_SHAPE,
    annotations: READ_ONLY,
    handler: async (args) => {
      const spaceError = requireSpace();
      if (spaceError) return spaceError;
      return runV1(handler, {
        method: "GET",
        path,
        query: { clientId: args.clientId },
        paths,
        spaceId
      }, { ctx: sessionCtx });
    }
  });

  tools.push(
    runtimeTool(
      "gmp_get_runtime_model",
      "读取当前打开的模型",
      "读取前端当前打开的模型信息（模型名、类型、图元数量等）。需要前端页面在线且已打开模型。",
      "/v1/runtime/model",
      handleV1RuntimeModel
    ),
    runtimeTool(
      "gmp_get_runtime_devices",
      "读取当前模型的图元清单",
      "读取前端当前模型中的全部图元（id、类型、位置、参数）。",
      "/v1/runtime/devices",
      handleV1RuntimeDevices
    ),
    runtimeTool(
      "gmp_get_runtime_selection",
      "读取当前选中的图元",
      "读取前端画布上当前选中的图元及其属性。",
      "/v1/runtime/selection",
      handleV1RuntimeSelection
    )
  );

  tools.push({
    name: "gmp_get_runtime_tabs",
    title: "读取前端三面板快照",
    description:
      "读取前端三个面板（模型/方案树/画布）的快照。不填 tab 时一次取三份；填 tab 则只取指定面板（model / tree / graph）。",
    inputSchema: {
      clientId: CLIENT_ID,
      tab: z.enum(["model", "tree", "graph"]).optional().describe("只取指定面板；不填则取三份聚合。")
    },
    outputSchema: ENVELOPE_OUTPUT_SHAPE,
    annotations: READ_ONLY,
    handler: async (args) => {
      const spaceError = requireSpace();
      if (spaceError) return spaceError;
      if (args.tab) {
        // v1 的单 tab 端点靠第三参 pathTab 分派（路由命名捕获组），桥支持透传。
        return runV1(
          handleV1RuntimeTab,
          {
            method: "GET",
            path: "/v1/runtime/tabs",
            query: { clientId: args.clientId },
            paths,
            spaceId,
            pathTab: args.tab
          },
          { ctx: sessionCtx }
        );
      }
      return runV1(
        handleV1RuntimeTabs,
        {
          method: "GET",
          path: "/v1/runtime/tabs",
          query: { clientId: args.clientId },
          paths,
          spaceId
        },
        { ctx: sessionCtx }
      );
    }
  });

  tools.push({
    name: "gmp_capture_runtime_screenshot",
    title: "截取前端画布",
    description:
      "截取前端当前画布的 PNG 画面（返回图片）。可指定宽高缩放。需前端页面在线。",
    inputSchema: {
      clientId: CLIENT_ID,
      width: z.number().int().positive().optional().describe("输出宽度（像素），正整数。"),
      height: z.number().int().positive().optional().describe("输出高度（像素），正整数。")
    },
    annotations: READ_ONLY,
    handler: async (args) => {
      const spaceError = requireSpace();
      if (spaceError) return spaceError;
      return runV1(
        handleV1RuntimeScreenshot,
        {
          method: "GET",
          path: "/v1/runtime/screenshot",
          query: {
            clientId: args.clientId,
            width: args.width === undefined ? undefined : String(args.width),
            height: args.height === undefined ? undefined : String(args.height)
          },
          paths,
          spaceId
        },
        {
          ctx: sessionCtx,
          binary: true,
          asImage: true,
          mimeType: "image/png",
          summary: "已截取前端画布（PNG）。"
        }
      );
    }
  });

  tools.push({
    name: "gmp_get_runtime_svg",
    title: "导出前端当前画布 SVG",
    description: "导出前端当前画布的 SVG 文本（矢量，含图元图形与连线）。需前端页面在线。",
    inputSchema: { clientId: CLIENT_ID },
    outputSchema: ENVELOPE_OUTPUT_SHAPE,
    annotations: READ_ONLY,
    handler: async (args) => {
      const spaceError = requireSpace();
      if (spaceError) return spaceError;
      return runV1(
        handleV1RuntimeSvg,
        {
          method: "GET",
          path: "/v1/runtime/svg",
          query: { clientId: args.clientId },
          paths,
          spaceId
        },
        { ctx: sessionCtx }
      );
    }
  });

  tools.push({
    name: "gmp_get_runtime_e_file",
    title: "导出前端当前模型 E 文件",
    description:
      "导出前端当前打开模型的 E 格式文本。可用 templateName 指定预定义模板（国网E格式 / 主网实时库 / 配网实时库 / 台区实时库），或用 templateText 提供自定义模板文本。需前端页面在线。",
    inputSchema: {
      clientId: CLIENT_ID,
      templateName: z
        .string()
        .min(1)
        .optional()
        .describe("预定义模板名；与 templateText 同时给时以 templateText 为准。"),
      templateText: z.string().min(1).optional().describe("自定义 E 元件定义模板文本。")
    },
    outputSchema: ENVELOPE_OUTPUT_SHAPE,
    annotations: READ_ONLY,
    handler: async (args) => {
      const spaceError = requireSpace();
      if (spaceError) return spaceError;
      if (args.templateText) {
        return runV1(
          handleV1RuntimeEFilePost,
          {
            method: "POST",
            path: "/v1/runtime/e-file",
            query: { clientId: args.clientId },
            body: { templateText: args.templateText, templateName: args.templateName },
            paths,
            spaceId
          },
          { ctx: sessionCtx }
        );
      }
      return runV1(
        handleV1RuntimeEFile,
        {
          method: "GET",
          path: "/v1/runtime/e-file",
          query: { clientId: args.clientId, template: args.templateName },
          paths,
          spaceId
        },
        { ctx: sessionCtx }
      );
    }
  });

  // ───────────────── 控制台写操作域 ─────────────────

  const controlTool = (name, title, description, path, handler, body, annotations = WRITE) => ({
    name,
    title,
    description,
    inputSchema: { clientId: CLIENT_ID, ...body },
    outputSchema: ENVELOPE_OUTPUT_SHAPE,
    annotations,
    handler: async (args) => {
      const spaceError = requireSpace();
      if (spaceError) return spaceError;
      const { clientId, ...payload } = args;
      return runV1(
        handler,
        {
          method: "POST",
          path,
          query: { clientId },
          body: payload,
          paths,
          spaceId
        },
        { ctx: sessionCtx }
      );
    }
  });

  tools.push(
    controlTool(
      "gmp_add_device",
      "新增图元",
      "在前端当前打开的模型里新增一个图元（kind 为图元类型，如 ACLoad）。x/y 为画布坐标，可省略由前端取默认位置。需前端页面在线。",
      "/v1/control/device/add",
      handleControlDeviceAdd,
      {
        kind: z.string().min(1).describe("图元类型（kind），如 ACLoad、ACBus、StaticTextSymbol。"),
        x: z.number().optional().describe("画布 x 坐标。"),
        y: z.number().optional().describe("画布 y 坐标。"),
        attrs: z.record(z.string(), z.unknown()).optional().describe("图元属性（键值对）。")
      }
    ),
    controlTool(
      "gmp_create_scheme",
      "新建方案",
      "在前端新建一个方案（可指定父方案）。需前端页面在线。",
      "/v1/control/scheme/create",
      handleControlSchemeCreate,
      {
        name: z.string().min(1).describe("方案名。"),
        parentSchemeId: z.string().min(1).optional().describe("父方案 ID；不填则建在根下。")
      }
    ),
    controlTool(
      "gmp_create_model",
      "新建模型",
      "在前端新建一个模型（指定模型类型）。需前端页面在线。",
      "/v1/control/model/create",
      handleControlModelCreate,
      {
        name: z.string().min(1).describe("模型名。"),
        modelType: MODEL_TYPE,
        schemeId: z.string().min(1).optional().describe("所属方案 ID。")
      }
    ),
    controlTool(
      "gmp_select_devices",
      "选中图元",
      "改变前端画布上的选中集。mode=set 替换、add 追加、toggle 反选；不填则按替换处理。",
      "/v1/control/devices/select",
      handleControlDevicesSelect,
      {
        ids: z.array(z.string().min(1)).describe("图元 ID 列表。"),
        mode: z.enum(["set", "add", "toggle"]).optional().describe("选择模式。")
      }
    ),
    controlTool(
      "gmp_group_selected_devices",
      "组合选中图元",
      "把前端当前选中的图元组合成一个组合图元（回执给出新组合的 id 与名字）。",
      "/v1/control/devices/group",
      handleControlDevicesGroup,
      {}
    ),
    controlTool(
      "gmp_delete_devices",
      "删除图元",
      "删除前端画布上的图元。不填 ids 时删除当前选中的图元。删除后需另调用 gmp_save_model 才落盘。",
      "/v1/control/device/delete",
      handleControlDeviceDelete,
      {
        ids: z.array(z.string().min(1)).optional().describe("要删除的图元 ID；不填则删除当前选中的。")
      },
      DESTRUCTIVE
    ),
    controlTool(
      "gmp_update_device_property",
      "修改图元属性",
      "修改一个图元的属性。category=graphic 改图形属性、model 改模型属性、measurement 改量测属性；patch 是要覆盖的键值对。",
      "/v1/control/device/property/update",
      handleControlDevicePropertyUpdate,
      {
        id: z.string().min(1).describe("图元 ID。"),
        category: z.enum(["graphic", "model", "measurement"]).describe("属性类别。"),
        patch: z.record(z.string(), z.unknown()).describe("要写入的属性键值对。")
      }
    ),
    controlTool(
      "gmp_save_model",
      "保存到磁盘",
      "把前端当前状态落盘。scope=currentModel 只存当前模型，scope=schemeTree 存整个方案树。",
      "/v1/control/save",
      handleControlSave,
      {
        scope: z.enum(["currentModel", "schemeTree"]).describe("保存范围。")
      }
    ),
    controlTool(
      "gmp_save_template_from_selection",
      "保存模板",
      "把前端当前选中的图元保存为图元模板（供以后复用）。",
      "/v1/control/template/saveFromSelection",
      handleControlTemplateSaveFromSelection,
      {
        name: z.string().min(1).describe("模板名。"),
        componentLibrary: z.string().min(1).describe("元件库名（componentLibrary）。"),
        categoryLibraryName: z.string().min(1).optional().describe("分类库名。")
      }
    ),
    controlTool(
      "gmp_import_device_definition",
      "预览 E 元件定义导入",
      "解析一份 E 文件元件定义文本，返回它与当前图元库的匹配结果（matched / skipped 清单与计数）。**只做匹配预览，不写入任何配置**。",
      "/v1/control/e-device-definition/import",
      handleControlImportEDeviceDefinition,
      {
        text: z.string().min(1).describe("E 文件元件定义文本。")
      },
      READ_ONLY
    )
  );

  // ───────────────── 页面结构 / 切换空间与模型 ─────────────────
  //
  // 这三项与「读数据」「改当前模型的图元」都不同：它们看/改的是**页面本身的状态**
  // （页面长什么样、当前在哪个空间、打开的是哪个模型）。
  //
  // ⚠ 切空间会硬重载页面（前端的 switchToSpace 最后一步是 location.reload()），
  // 故回执语义是「已排期」而非「已完成」—— 工具描述里必须写清，否则调用方会
  // 在重载窗口期收到 no-online-client 而误判成失败。

  tools.push({
    name: "gmp_get_page_dom",
    title: "读取前端页面 DOM 结构",
    description:
      "读取当前前端页面的整体 DOM 结构。默认 format=outline 回元素树（tag/id/class/role/文本，受 maxDepth 与 maxNodes 限制），适合了解页面有哪些区域；format=html 回整页 outerHTML（受 maxChars 截断，体积很大）。纯读，需前端页面在线。",
    inputSchema: {
      clientId: CLIENT_ID,
      format: z
        .enum(["outline", "html"])
        .optional()
        .describe("outline（默认）：元素树；html：整页 outerHTML。"),
      maxDepth: z.number().int().positive().optional().describe("outline 深度上限（默认 6）。"),
      maxNodes: z.number().int().positive().optional().describe("outline 节点数上限（默认 800）。"),
      maxTextLength: z
        .number()
        .int()
        .nonnegative()
        .optional()
        .describe("outline 每节点文本上限（默认 120；0 表示不取文本）。"),
      maxChars: z.number().int().positive().optional().describe("html 字符上限（默认 200000）。")
    },
    outputSchema: ENVELOPE_OUTPUT_SHAPE,
    annotations: READ_ONLY,
    handler: async (args) => {
      const spaceError = requireSpace();
      if (spaceError) return spaceError;
      return runV1(
        handleV1RuntimeDom,
        {
          method: "GET",
          path: "/v1/runtime/dom",
          query: {
            clientId: args.clientId,
            format: args.format,
            maxDepth: args.maxDepth,
            maxNodes: args.maxNodes,
            maxTextLength: args.maxTextLength,
            maxChars: args.maxChars
          },
          paths,
          spaceId
        },
        { ctx: sessionCtx }
      );
    }
  });

  tools.push(
    controlTool(
      "gmp_switch_space",
      "切换工作空间",
      "让前端页面切换到指定工作空间（等同顶栏空间选择器）。**异步生效**：回执 scheduled=true 表示已排期，前端随后清缓存 → 写 Cookie → 硬重载，重载期间 WS 会断开数秒，这段窗口里其它运行时工具会回 no-online-client —— 等 gmp_list_runtime_clients 重新看到会话再继续。要求当前无未保存修改（否则回 bad-request，提示先调用 gmp_save_model）。未知空间会回错误并列出可用空间。",
      "/v1/control/space/switch",
      handleControlSpaceSwitch,
      {
        spaceId: z
          .string()
          .min(1)
          .describe("目标工作空间 id。未知 id 时错误信息会列出可用空间。")
      }
    ),
    controlTool(
      "gmp_switch_model",
      "切换当前打开的模型",
      "让前端打开另一个已保存模型（等同方案树点击）。三种定位方式任选：modelId（后端分配的稳定序号 idx）、modelKey（运行期 key）、schemePath + name（方案名数组 + 模型名）。要求当前无未保存修改（否则回 bad-request，提示先调用 gmp_save_model）。已经是当前模型时回 alreadyOpen=true 且不重复加载。",
      "/v1/control/model/switch",
      handleControlModelSwitch,
      {
        modelId: z
          .number()
          .int()
          .positive()
          .optional()
          .describe("模型稳定序号 idx（跨方案唯一，改名/移动后不变）。首选。"),
        modelKey: z.string().min(1).optional().describe("运行期模型 key（project:…）。"),
        schemePath: SCHEME_PATH.optional().describe("方案路径数组，配合 name 使用。"),
        name: z.string().min(1).optional().describe("模型名，配合 schemePath 使用。")
      }
    )
  );

  // 导出元件定义：v1 走的是 POST（无 body），但语义是纯读（前端只把当前库态导出成文本）。
  tools.push({
    name: "gmp_export_device_definition",
    title: "导出 E 元件定义",
    description:
      "导出当前图元库的 E 文件元件定义文本（filename / text / mime）。纯读操作，不改任何配置。",
    inputSchema: { clientId: CLIENT_ID },
    outputSchema: ENVELOPE_OUTPUT_SHAPE,
    annotations: READ_ONLY,
    handler: async (args) => {
      const spaceError = requireSpace();
      if (spaceError) return spaceError;
      return runV1(
        handleControlExportEDeviceDefinition,
        {
          method: "POST",
          path: "/v1/control/e-device-definition/export",
          query: { clientId: args.clientId },
          body: {},
          paths,
          spaceId
        },
        { ctx: sessionCtx }
      );
    }
  });

  // ───────────────── token → clientId 的统一改造 ─────────────────
  //
  // 所有「要指定操作哪个前端页面」的工具内部写的都是 `clientId`（v1 那边的参数名），
  // 但 MCP 对外暴露的是 `token`（= 页面地址栏 ?token=）。这里在**一处**完成两件事：
  //   1. 把入参 `clientId` 换成 `token`（schema 与解构同步，免得逐个工具手改漏掉）；
  //   2. 调 resolveClientToken 把 token 解析成确定的 clientId，解析不出就**拒绝**
  //      （本空间多个页面且没传 token 时回 token-required，而不是静默挑最近活跃的）。
  //
  // 放在注册表末尾而不是每个 handler 里：26 个会话类工具逐个改必然漏，
  // 而漏掉的那个会退回 v1 的「取最近活跃」——正是要消灭的静默行为。
  const withTokenArgument = (tool) => {
    const schema = tool.inputSchema ?? {};
    if (!Object.hasOwn(schema, "clientId")) {
      return tool;
    }
    const { clientId: _internalClientId, ...rest } = schema;
    return {
      ...tool,
      inputSchema: { token: TOKEN, ...rest },
      handler: async (args = {}) => {
        // 空间缺失先拒：否则候选列表为空，会误报成「没有在线页面」
        const spaceError = requireSpace();
        if (spaceError) {
          return spaceError;
        }
        const { token, ...others } = args;
        const resolved = resolveClientToken(token, {
          spaceId,
          clients: sessionCtx.listClients()
        });
        if (resolved.error) {
          return errorResult(resolved.error.code, resolved.error.message);
        }
        return tool.handler({ ...others, clientId: resolved.clientId });
      }
    };
  };

  return tools.map(withTokenArgument);
}
