// MCP server 装配：把工具注册表挂到一个 McpServer 上。
//
// ## 为什么每个请求都新建一个 McpServer
//
// 传输用**无状态**模式（`sessionIdGenerator: undefined`）：SDK 在无状态下
// 复用同一个 transport 会抛 "Stateless transport cannot be reused across
// requests. Create a new transport per request."（服务端 webStandardStreamableHttp.js:176）。
// 既然 transport 每请求新建，挂在它上面的 McpServer 也必须每请求新建 ——
// 否则第二个请求的 transport 连接到**上一个** McpServer 的 protocol 上，
// 请求会打到已经关闭的连接上。
//
// 代价是每请求重建 29 个工具（实测注册耗时约 5ms），相对于一次模型往返可忽略。
//
// ## 空间上下文从哪来
//
// 空间**不由 MCP 层解析**。派发层（server/server.mjs）照常按
// `X-Space` 头 > `?space=` > Cookie > 首个空间 解析后把 `paths` / `spaceId`
// 注入路由 handler —— MCP 与 v1 走的是同一套空间隔离，一个空间都不会漏。
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { createMcpToolRegistry } from "./tools.mjs";

const SERVER_INFO = {
  name: "graph-modeling-platform",
  version: "0.1.0"
};

const SERVER_INSTRUCTIONS = [
  "电力能源系统图上建模平台的 MCP 服务。",
  "",
  "读操作：列方案、读模型 JSON、导出 SVG/E 文件/CIM XML、取图元库、取前端运行时态、读页面 DOM 结构。",
  "写操作：改前端当前打开的模型（新增/删除图元、改属性、组合、保存、存模板）；切换工作空间；切换当前打开的模型。",
  "",
  "三条硬约束：",
  "1. 写操作与运行时态读取**需要前端页面在线**（浏览器打开本平台并保持页面不关）。",
  "   没有在线会话时先调 gmp_list_runtime_clients 确认。",
  "2. 写操作只改**前端内存中的当前状态**，不自动落盘 —— 改完要另调 gmp_save_model 才写盘。",
  "3. gmp_switch_space 是**异步生效**的：它让前端重载页面以切换空间，重载期间 WS 断开数秒，",
  "   回执 scheduled=true 只表示已排期。等 gmp_list_runtime_clients 重新看到会话后再继续调用其它工具。",
  "   gmp_switch_space / gmp_switch_model 都要求当前无未保存修改，否则先调 gmp_save_model。",
  "",
  "方案路径 schemePath 是**字符串数组**（如 [\"方案A\",\"子方案\"]），不是 URL 编码串。",
  "先用 gmp_list_schemes 看层级，再用 gmp_list_scheme_models 看某方案下的模型名（gmp_switch_model 可直接用这两个值）。"
].join("\n");

/**
 * 构造一个已注册全部工具的 McpServer。
 *
 * @param {object} options
 * @param {string} options.spaceId 当前空间 ID（派发层注入）
 * @param {object} options.paths 当前空间的路径集合（派发层注入）
 * @param {object} options.runtimeWs 运行时态 WS 桥（fetchFromClient / sendCommandToClient / listClients）
 * @returns {McpServer}
 */
export function createMcpServer({ spaceId, paths, runtimeWs } = {}) {
  const server = new McpServer(SERVER_INFO, {
    instructions: SERVER_INSTRUCTIONS
  });

  const tools = createMcpToolRegistry({ spaceId, paths, runtimeWs });
  for (const tool of tools) {
    server.registerTool(
      tool.name,
      {
        title: tool.title,
        description: tool.description,
        inputSchema: tool.inputSchema,
        // 二进制工具不声明 outputSchema（字节不是 JSON）；声明了就必须每次回 structuredContent。
        ...(tool.outputSchema ? { outputSchema: tool.outputSchema } : {}),
        annotations: tool.annotations
      },
      async (args) => tool.handler(args ?? {})
    );
  }

  return server;
}
