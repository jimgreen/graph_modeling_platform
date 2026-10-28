// /webgrp/mcp 的 HTTP 入口。
//
// ## 传输形态
//
// **streamable HTTP 无状态模式**：每个 POST 请求新建一个
// `StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true })`
// 与一个 `McpServer`，处理完即结束。
//
// 为什么不建 SSE 长连接：SDK 的 GET 分支会挂一条 text/event-stream 流，
// 而无状态模式下没有会话可关 —— 客户端断开前连接一直占着，进程也退不出来。
// 故 GET / DELETE 直接回 405（带 `Allow: POST`），POST 走一次性 JSON 响应。
//
// ## 安全：Origin 校验
//
// MCP 暴露写操作，而浏览器里的任意网页都能对本机端口发 POST ——
// **发送**不受 CORS 约束（只有读取响应才受）。不校验 Origin 等于让任意网页
// 驱动本平台的建模操作。故复用 `isAllowedNativeExportOrigin`（server/nativeExportSave.mjs）：
// 无 Origin 头放行（命令行客户端、Agent 客户端都没有这个头），
// 有 Origin 必须是本机（127.0.0.1 / localhost / ::1）。
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

import { createMcpServer } from "./mcpServer.mjs";
import { isAllowedNativeExportOrigin } from "../nativeExportSave.mjs";

const JSON_RPC_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store"
};

/** JSON-RPC 错误响应（形状与 SDK 自己的 createJsonErrorResponse 一致）。 */
function sendJsonRpcError(response, status, code, message) {
  response.writeHead(status, JSON_RPC_HEADERS);
  response.end(JSON.stringify({
    jsonrpc: "2.0",
    error: { code, message },
    id: null
  }));
}

/**
 * 处理 /mcp 的 GET / DELETE：回 405（带 Allow: POST）。
 *
 * @param {object} params
 * @param {object} params.response Node ServerResponse
 */
export function handleMcpMethodNotAllowed({ response }) {
  response.writeHead(405, {
    ...JSON_RPC_HEADERS,
    allow: "POST"
  });
  response.end(JSON.stringify({
    jsonrpc: "2.0",
    error: { code: -32000, message: "Method not allowed. 本端点只接受 POST（streamable HTTP 无状态模式）。" },
    id: null
  }));
}

/**
 * 处理 /mcp 的 POST：跑一次 JSON-RPC 往返。
 *
 * @param {object} params
 * @param {object} params.request Node IncomingMessage
 * @param {object} params.response Node ServerResponse
 * @param {string} params.spaceId 当前空间（派发层注入）
 * @param {object} params.paths 当前空间的路径集合（派发层注入）
 * @param {object} params.runtimeWs 运行时态 WS 桥（派发层注入）
 */
export async function handleMcpPost({ request, response, spaceId, paths, runtimeWs }) {
  // Origin 校验：放行无 Origin 的客户端（CLI / Agent），拦下网页发起的跨源请求。
  if (!isAllowedNativeExportOrigin(request)) {
    sendJsonRpcError(response, 403, -32000, "Forbidden: 不接受非本机来源的 MCP 请求。");
    return;
  }

  // 空间缺失是接线 bug：派发层对 /mcp 恒注入 spaceId（/mcp 不在 isSpaceAgnostic 白名单里）。
  // 缺空间时若继续跑，工具会读到默认空间的数据、写操作会打到别人的前端会话。
  if (!spaceId) {
    sendJsonRpcError(response, 503, -32000, "缺少空间上下文：MCP 端点必须由派发层注入空间。");
    return;
  }

  const transport = new StreamableHTTPServerTransport({
    // undefined = 无状态模式（不生成也不校验 session id）
    sessionIdGenerator: undefined,
    // 直接回 JSON，不走 SSE 流
    enableJsonResponse: true
  });
  const server = createMcpServer({ spaceId, paths, runtimeWs });

  try {
    await server.connect(transport);
    await transport.handleRequest(request, response);
  } catch (error) {
    // transport 已把能写的响应写完了（headersSent 为真）时不能再写错误头。
    if (!response.headersSent) {
      sendJsonRpcError(response, 500, -32000, error instanceof Error ? error.message : "MCP 处理失败。");
      return;
    }
    console.error("[mcp] 处理失败:", error);
  } finally {
    // 无状态模式：请求结束即收摊。不 close 的话 McpServer 仍持有 transport 引用。
    await server.close().catch(() => undefined);
  }
}
