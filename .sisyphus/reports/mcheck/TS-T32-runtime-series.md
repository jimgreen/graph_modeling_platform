# T32 运行时系列审查报告

## 概览
- 文件数：8（runtimeWsClient.ts/.test、runtimeSnapshot.ts/.test、runtimeScreenshot.ts/.test、fileIO.ts/.test）
- 总行数约 1100 ｜ 发现总数：6（P0:0 / P1:0 / P2:1 / P3:5）
- 总体评价：质量优秀的模块群。WS 客户端重连/心跳/关闭清理完整（close 置空 onclose 防重连竞态）；snapshot 序列化有 safeStr/safeNum/safeBool + wrap 错误包裹 + V1 信封类型；screenshot 的 Blob URL 在 finally 中 revoke、DPR 处理正确；fileIO 的 File System Access API 手写类型声明规范。

## P0 严重

（无）

## P1 重要

（无）

## P2 一般

### [P2] runtimeWsClient 三处 as any / any 绕过类型系统
- 位置: src/runtimeWsClient.ts:66 (`import.meta.env as any`)、:139 (`(error as any)?.code`)、:160 (`let message: any`)
- 类型: 风格 / 类型安全
- 描述: JSON.parse 结果直接标注 any 后透传给 handleFetch/handleCommand，消息形状完全无编译期约束；env 与 error.code 同样绕过。三处均为存量（非本次新增），但该文件是前后端协议边界——恰恰是最需要类型守护的位置。
- 建议: 定义 `type WsServerMessage = { type: "fetch"; requestId: string; resource: string; params?: Record<string, unknown> } | { type: "command"; ... } | ...` 联合类型，parse 后用类型守卫收窄；env 用 `import.meta.env` 的 ImportMetaEnv 声明扩展；error code 用 `(error as { code?: string })?.code`。

## P3 轻微

### [P3] clientId 生成用 Date.now + Math.random
- 位置: src/runtimeWsClient.ts:20
- 类型: 风格
- 描述: 项目内第 4 处同型实现（另见 A1 server.mjs:5606/6028、C runtimeWs.mjs:23）。localStorage 持久化后碰撞影响更持久。
- 建议: 统一改 crypto.randomUUID()（浏览器全支持），并纳入"ID 生成统一工具"横向整改。

### [P3] runtimeSnapshot 全程 Record<string, any> 边界
- 位置: src/runtimeSnapshot.ts:39,84,105,132 等
- 类型: 抽象层次
- 描述: __appScope 无类型定义导致整个序列化层以 any 边界工作。safeStr/safeNum 兜底使运行时安全，但字段拼写错误（如 activeModelName → activeModalName）无法在编译期发现。
- 建议: 定义最小 AppScopeShape 接口（仅声明实际读取的 ~10 个字段），入参改为此类型，内部仍可宽松。

### [P3] serializeDevices 原样透传 nodes/edges 数组
- 位置: src/runtimeSnapshot.ts:141-142
- 类型: 效率
- 描述: 与其他 resource 的精简投影不同，devices 直接返回 appScope.nodes/edges 引用。若画布节点携带大体积 params/backgroundImage dataUrl，经 WS JSON 序列化会放大传输体积。
- 建议: 确认下游消费者需要的字段集；若仅需 id/kind/position 则做投影（与 SerializedNode 一致），或注明"全量传输是有意选择"。

### [P3] fileIO downloadBlob 未处理 anchor 点击兼容性
- 位置: src/fileIO.ts:23-30
- 类型: 风格
- 描述: 直接 link.click() 不 append 到 DOM。现代浏览器均支持，但部分旧 Webview 需要 document.body.appendChild + remove。
- 建议: 若目标环境含旧 WebView 再补；否则保持现状并注释。

### [P3] runtimeSnapshot TabData 联合可用可辨识联合强化
- 位置: src/runtimeSnapshot.ts:193-200
- 类型: 风格
- 描述: tab/rows/tree/deviceParams 用可选字段组合表达三种形态，消费方需自行判断组合有效性。
- 建议: 改为 `{ tab: "model"; rows: ParamRow[] } | { tab: "tree"; tree: ... } | { tab: "graph"; subView... }` 可辨识联合。

---
统计：P0:0 | P1:0 | P2:1 | P3:5 = 6 项
