# MCP 与 `/swigger` 使用指南

> 本指南按“照着做就能完成”的方式编写。MCP 适合让 AI 助手查看、诊断和操作页面；`/swigger` 适合人手动试接口；v1 HTTP 接口适合其它程序读取或接收模型。

## 先分清三种入口

| 入口 | 用来做什么 | 需要平台页面在线吗 |
|---|---|---|
| MCP | 让 AI 助手读取页面、检查模型、执行画布操作 | 读取已保存模型通常不需要；读取或操作当前页面需要 |
| `/swigger` | 在浏览器里看接口说明、填参数、点按钮试运行 | 查看和导出已保存模型不需要；操作当前页面需要 |
| v1 HTTP API | 供其它程序读取模型文件，或把模型发送到接收系统 | 读取已保存模型通常不需要；当前页面接口需要 |

默认地址如下。若部署时改过端口或接口前缀，请使用部署配置中的实际值。

- 平台前端：`http://127.0.0.1:5173`
- `/swigger`：`http://127.0.0.1:5174/swigger`
- MCP：`http://127.0.0.1:5174/webgrp/mcp`
- v1 API 前缀：`/webgrp/v1`

> 页面保持打开，才可让 MCP 或 HTTP API 读取、操作当前画布。关闭页面后，已保存模型的读取与导出仍可用。

## 用 MCP 调试当前页面

### 1. 连接 MCP

在 MCP 客户端中添加服务器地址：

```json
{
  "mcpServers": {
    "graph-modeling-platform": {
      "type": "http",
      "url": "http://127.0.0.1:5174/webgrp/mcp"
    }
  }
}
```

保存设置后，按 MCP 客户端要求重新连接或重启客户端。连上后，可直接用日常语言让助手查看页面、检查模型或执行操作，不必记工具名称。

### 2. 先确认目标页面

1. 在浏览器打开平台，并切到要调试的工作空间和模型。
2. 让助手读取“当前打开的模型信息”，确认模型名称；再让助手列出模型里的图元与连线。
3. 若同一空间开着多个平台页面，点击目标页面顶栏的 `RT-WS` 指示灯复制页面编号；助手要求指定页面时，把编号发给助手。只有一个页面时通常不用指定。

要检查页面区域或文字，可让助手查看页面结构；要确认画布外观，可让助手截取当前画布。直接描述目标即可，无需记住工具名称。

### 3. 检查并修复当前模型

让助手“检查当前模型的拓扑”。助手会执行检查，不会保存模型。若同一空间有多个平台页面，按提示提供目标页面编号。结果会列出错误、提醒、可自动应用的参数修正及连通拓扑岛数量。

确认要应用自动修正后，让助手执行修复。当前页面修复只改浏览器内存，不会保存到磁盘。需要保留结果时，让助手保存当前模型。

注意：自动修复只应用平台已有的安全参数修正规则，不会替你补连线或重建图形结构。修复后仍有错误时，结果会继续列出错误。

### 4. 理解检查结果

- 请求成功不代表模型通过校验。请查看返回结果中的状态。
- “成功”表示没有错误或提醒；“未通过”表示仍有问题，请阅读错误与提醒说明。
- “已修改”表示模型数据发生改变；即使没有列出参数修正，也可能重新计算了拓扑字段。
- 当前页面修复不会自动保存到磁盘。

## 用 `/swigger` 手动试接口

1. 浏览器打开 `http://127.0.0.1:5174/swigger`。
2. 找到对应接口卡片，选择示例，或在输入框填写参数。
3. 确认参数后点“发送请求”。页面会显示状态码和返回内容。
4. 若操作当前页面，先在另一个浏览器标签页保持平台在线。

`schemePath` 表示方案的层级路径，填写 JSON 字符串数组。例如顶层方案写 `["默认方案"]`，子方案写 `["默认方案","1-1"]`。在 `/swigger` 中优先选择接口自带示例；直接调用 API 时要对参数做 URL 编码。不要把已经编码过的值再交给 `/swigger` 编码。

### 模型校验与自动修复

统一接口：POST /webgrp/v1/topology，请求体 action=check|repair。

检查已保存模型时：

~~~json
{
  "action": "check",
  "target": "saved",
  "schemePath": ["默认方案"],
  "name": "模型名"
}
~~~

检查当前页面时：

~~~json
{
  "action": "check",
  "target": "current"
}
~~~

修复已保存模型时只把 action 改为 repair：

~~~json
{
  "action": "repair",
  "target": "saved",
  "schemePath": ["默认方案"],
  "name": "模型名"
}
~~~

target=current 只修改页面内存；target=saved 有修正时直接写盘。检查已保存模型时，首次读取可能初始化该工作空间的全局线路登记表并迁移旧数据。操作已保存模型前建议先导出备份。旧的 /webgrp/v1/topology/check 与 /webgrp/v1/topology/repair 路径已删除。

### 导出已保存模型

已保存模型的新统一读取接口：`GET /webgrp/v1/models/export`。它按空间、方案或模型范围返回 JSON/SVG/CIM/E 的 Base64 产物；单模型通过 `scope=model` 和 `modelId` 或 `schemePath/name` 定位。旧的 `GET /webgrp/v1/schemes/model/export?format=...` 暂保留兼容，但不再作为新调用入口。

自定义 E 模板仍使用 `POST /webgrp/v1/schemes/model/export?format=e-file`，JSON body 含 `templateText`，可选 `templateName`。不适用的参数返回 400。

### 多范围批量模型导出

需要一次读取多个模型时使用：

```http
GET /webgrp/v1/models/export
```

`scope` 支持 `space`、`scheme`、`model`。`scope=scheme` 默认包含子方案；`scope=model` 可用 `modelId`，或用 `schemeId/schemePath + name` 定位。`formats` 支持逗号分隔的 `json,svg,cim,e`，默认全部；`encoding` 支持 `utf-8` 和 `gbk`。

所有产物都放在 `{ok:true,data}` 信封中，以 `contentBase64` 返回，调用方按 artifact 的 `encoding` 解码。E 文件可用 `template` 指定预定义模板；`mergeE=true` 按 `modelType` 在顶层 `mergedE` 返回独立合并产物，逐模型 `artifacts` 不重复放 E。`includeAssociatedModels=true` 会在当前空间内递归带上 `model_id` 和全局线路关联模型，并通过 `expandedByAssociation` 标记扩展项。

示例：

```bash
curl -sS "http://127.0.0.1:5174/webgrp/v1/models/export?scope=scheme&schemePath=%5B%22默认方案%22%5D&formats=json,svg,cim,e&encoding=utf-8&mergeE=true&includeAssociatedModels=true"
```

返回数据含 `selectedModelCount`、`expandedModelCount`、`modelCount`、`models`、`mergedE` 和 `warnings`。任一模型读取或产物生成失败，整个请求返回错误，不返回部分结果。

### 运行时导出

统一接口：GET /webgrp/v1/runtime/export?format=svg|e-file；自定义 E 模板使用 POST /webgrp/v1/runtime/export?format=e-file。接口要求前端页面在线，仍保留 no-online-client、ws-timeout、no-active-model 等错误。

在 /swigger 中选择 v1 方案域、v1 运行时态或 v1 拓扑操作下的统一入口示例即可验证请求。

## 把模型交给其它系统

有两种方式：接收系统主动读取，或由平台主动发送。

### 方式一：接收系统读取接口

接收系统可按需调用以下接口：

- 已保存模型导出：`GET /webgrp/v1/models/export?scope=model&modelId=...&formats=json,svg,cim,e`
- 自定义 E 模板：`POST /webgrp/v1/schemes/model/export?format=e-file`

每个接口都要提供 `schemeId` 或 `schemePath` 以及模型名 `name`。推荐先用方案列表接口读取当前空间的数字 `schemeId`；如果模型会改名或移动，路径选择器应先查询最新路径。两种选择器同时提供时必须指向同一方案。跨工作空间调用时，使用 `X-Space` 请求头或 `?space=<空间ID>` 指定空间；不指定时，服务按现有空间选择规则处理请求。

### 方式二：平台主动发送文件

接口：`POST /webgrp/v1/schemes/model/send`

请求示例：

```http
POST /webgrp/v1/schemes/model/send?modelId=123
Content-Type: application/json
```

```json
{
  "url": "https://receiver.example.com/import",
  "files": [
    { "kind": "json", "encoding": "utf-8" },
    { "kind": "svg", "encoding": "utf-8" },
    { "kind": "e", "encoding": "gbk" }
  ],
  "templateName": "国网E格式"
}
```

把 `url` 换成接收系统提供的地址；把 `modelId` 换成模型稳定 ID。也可用 `schemeId` 或 `schemePath` 加 `name` 指定模型；两种方案选择器同时提供时必须一致。`files` 可选择 `json`、`svg`、`e`、`cim`，可一次发送多种格式。`templateName` 只作用于 E 文件。

平台会向目标地址发送 `multipart/form-data`。接收端会收到这些字段：

| 字段名 | 内容 |
|---|---|
| `model_id` | 稳定模型 ID |
| `model_name` | 模型名称 |
| `scheme_path` | 方案路径 JSON 字符串 |
| `template_name` | 使用的 E 文件模板；未指定时为空 |
| `sent_at` | 发送时间 |
| `json_file` | JSON 文件 |
| `svg_file` | SVG 文件 |
| `e_file` | E 文件 |
| `cim_file` | CIM/XML 文件 |

成功响应会返回目标地址、HTTP 状态码、耗时和文件清单。目标系统需提供可接收 POST 的 HTTP 或 HTTPS 接口，并按上述字段名读取文件。

**发送前核对目标地址与工作空间。** 此接口会把所选模型内容发送到 `url` 指定的系统；发送后无法由平台撤回。只向获准的接收系统发送，不要把真实模型发到陌生地址。

### 先用本机接收端试通

`/swigger` 的“发送模型”示例可把接收地址设为：

```text
http://127.0.0.1:5174/webgrp/v1/receive
```

发送后调用 `GET /webgrp/v1/receive` 查看字段名、文件名、大小和内容预览。此接收端只用于本机联调：数据保存在服务进程内存中，最多保留最近 5 次，重启服务后清空；它不需要登录，也不应作为生产接收系统使用。

## 常见问题

| 现象 | 原因 | 处理方法 |
|---|---|---|
| MCP 返回 `no-online-client` | 平台页面未打开或 WS 未连接 | 打开平台，确认页面保持打开后重试 |
| MCP 返回 `token-required` | 当前空间有多个页面在线 | 按助手提示，点击目标页面顶栏的 `RT-WS` 指示灯复制页面编号并提供 |
| 返回 `no-active-model` | 页面没有打开模型 | 在平台中打开模型后重试 |
| 返回 `not-found` | 方案路径或模型名不匹配 | 先用方案列表接口确认实际名称 |
| `ok: true` 但 `status: "failed"` | 请求成功，但模型仍有拓扑问题 | 阅读 `errors` 和 `warnings`；自动修复不会猜测如何补结构 |
| 接口返回乱码 | 文本编码与接收方预期不一致 | 按接收系统要求指定 `encoding`；E 文件默认 GBK |

## 安全提醒

- `/swigger` 的拓扑接口有可选的 `clientId` 查询参数。多页面时填入目标页面编号，明确指定要检查或修复的页面；只对“当前页面”操作生效。
- MCP 与 HTTP API 都可能读取或修改模型；不要把服务端口直接暴露到公网。
- MCP 进行已保存模型修复时会直接写盘；外部发送接口会把数据发往指定地址。操作前先确认模型、空间和接收方。
- `POST /webgrp/v1/schemes/model/send` 允许调用方指定 HTTP(S) 目标地址。只允许可信客户端访问该服务，并按部署环境限制网络访问。
- 联调接收端 `/webgrp/v1/receive` 不鉴权、只存内存，不能用于生产数据接收。
