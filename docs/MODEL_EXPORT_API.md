# 模型导出 API

本文汇总当前平台提供的模型导出与模型传输 HTTP API。示例默认服务地址为 `http://127.0.0.1:5174`，默认 API 前缀为 `/webgrp`。

> 实际前缀由 `GRAPH_MODEL_API_PREFIX` 或 `platform.config.json` 配置决定。如果部署时修改了前缀，请替换下文 URL 中的 `/webgrp`。

## 1. 导出边界

平台的模型导出分为五类：

| 分类 | 内容 | 是否需要前端页面在线 |
|---|---|---:|
| 已保存模型 | 读取磁盘中的模型，生成 JSON、SVG、E 文件或 CIM/XML | 否 |
| 方案归档 | 导出指定方案下的模型 ZIP | 否 |
| 空间批量派生归档 | 导出当前空间全部模型的 E/SVG ZIP | 否 |
| 运行时模型 | 导出前端当前打开模型的 SVG/E 文件 | 是 |
| 外发传输 | 生成模型文件并转发到调用方指定的 HTTP(S) 地址 | 否，但会产生对外网络副作用 |

以下接口属于原样空间备份，不属于模型派生导出：

```http
GET /webgrp/spaces/export
```

它原样打包空间中的 JSON、配置、设备库、图片等文件，不在请求时生成 E 文件或 SVG 文件。详见空间管理文档和 [ARCHITECTURE.md](./ARCHITECTURE.md)。

## 2. 通用约定

### 2.1 空间选择

空间级 API 和方案域 API 按以下优先级选择数据空间：

1. `X-Space` 请求头
2. `?space=<spaceId>` 查询参数
3. `gmp_space` Cookie
4. 未指定时回退到首个空间

显式指定了不存在的空间时返回 `400`，不会静默改用其它空间。

示例：

```http
X-Space: default
```

或：

```text
?space=default
```

### 2.2 方案路径 `schemePath`

`schemePath` 是方案路径数组的 JSON 字符串，必须 URL 编码一次。不要手工拼接多个方案名。

JavaScript：

```js
const schemePath = encodeURIComponent(JSON.stringify(["默认方案", "子方案"]));
```

PowerShell：

```powershell
$schemePath = [uri]::EscapeDataString('["默认方案","子方案"]')
```

单层方案 `默认方案` 的编码值为：

```text
%5B%22%E9%BB%98%E8%AE%A4%E6%96%B9%E6%A1%88%22%5D
```

### 2.3 响应类型

- JSON 查询接口：`{ok:true,data:...}` 或 `{ok:false,error:{code,message}}`
- SVG、E 文件、CIM/XML：原始文本/二进制响应，不使用 JSON 信封
- ZIP：`application/zip` 二进制响应，不使用 JSON 信封

### 2.4 预定义 E 模板

支持的预定义模板为：

| 模板 | 允许的模型类型 |
|---|---|
| `国网E格式` | 厂站 |
| `主网实时库` | 厂站 |
| `配网实时库` | 馈线 |
| `台区实时库` | 台区 |

空间批量导出和方案 ZIP 导出指定 `template` 后，只保留该模板对应类型的模型。未指定模板时导出全部模型。微网不会被错误套用到上述预定义模板。

## 3. 已保存模型导出

这些接口读取指定空间中已经落盘的模型，不需要前端页面在线。

### 3.1 导出模型 JSON

#### Endpoint

```http
GET /webgrp/v1/schemes/model/json
```

#### 参数

| 参数 | 必填 | 说明 |
|---|---:|---|
| `schemePath` | 是 | URL 编码后的方案路径数组 |
| `name` | 是 | 模型名称 |
| `space` | 否 | 空间 id；也可以使用 `X-Space` 或 Cookie |

#### 完整示例

```bash
curl.exe -sS "http://127.0.0.1:5174/webgrp/v1/schemes/model/json?space=default&schemePath=%5B%22%E9%BB%98%E8%AE%A4%E6%96%B9%E6%A1%88%22%5D&name=%E7%BA%BF%E8%B7%AF"
```

响应：

```json
{
  "ok": true,
  "data": {
    "project": {
      "version": 1,
      "name": "线路",
      "idx": 12,
      "modelType": "馈线",
      "nodes": [],
      "edges": []
    }
  }
}
```

常见错误：

- `400 bad-request`：缺少或非法 `schemePath`、缺少模型名
- `404 not-found`：模型不存在

### 3.2 导出模型 SVG

#### Endpoint

```http
GET /webgrp/v1/schemes/model/svg
```

#### 参数

| 参数 | 必填 | 默认值 | 说明 |
|---|---:|---|---|
| `schemePath` | 是 | - | URL 编码后的方案路径数组 |
| `name` | 是 | - | 模型名称 |
| `colorMode` | 否 | `energy` | `energy` 或 `voltage` |
| `encoding` | 否 | `utf-8` | `utf-8` 或 `gbk` |

SVG 包含图层、量测和状态图标，并带 XML 编码声明；返回 `image/svg+xml` 原始内容。

#### 完整示例：默认配色

```bash
curl.exe -L "http://127.0.0.1:5174/webgrp/v1/schemes/model/svg?space=default&schemePath=%5B%22%E9%BB%98%E8%AE%A4%E6%96%B9%E6%A1%88%22%5D&name=%E7%BA%BF%E8%B7%AF" -o 线路.svg
```

#### 完整示例：电压配色和 GBK

```bash
curl.exe -L "http://127.0.0.1:5174/webgrp/v1/schemes/model/svg?space=default&schemePath=%5B%22%E9%BB%98%E8%AE%A4%E6%96%B9%E6%A1%88%22%5D&name=%E7%BA%BF%E8%B7%AF&colorMode=voltage&encoding=gbk" -o 线路-gbk.svg
```

成功响应头示例：

```http
HTTP/1.1 200 OK
Content-Type: image/svg+xml; charset=utf-8
Cache-Control: no-store
```

### 3.3 导出模型 E 文件：当前库模板

#### Endpoint

```http
GET /webgrp/v1/schemes/model/e-file
```

#### 参数

| 参数 | 必填 | 默认值 | 说明 |
|---|---:|---|---|
| `schemePath` | 是 | - | URL 编码后的方案路径数组 |
| `name` | 是 | - | 模型名称 |
| `template` | 否 | 当前库配置 | 预定义模板名 |
| `encoding` | 否 | `gbk` | `gbk` 或 `utf-8` |

#### 完整示例：按当前库配置导出

```bash
curl.exe -L "http://127.0.0.1:5174/webgrp/v1/schemes/model/e-file?space=default&schemePath=%5B%22%E9%BB%98%E8%AE%A4%E6%96%B9%E6%A1%88%22%5D&name=%E7%BA%BF%E8%B7%AF" -o 线路.e
```

#### 完整示例：按配网实时库模板导出 UTF-8 E 文件

```bash
curl.exe -L "http://127.0.0.1:5174/webgrp/v1/schemes/model/e-file?space=default&schemePath=%5B%22%E9%BB%98%E8%AE%A4%E6%96%B9%E6%A1%88%22%5D&name=%E7%BA%BF%E8%B7%AF&template=%E9%85%8D%E7%BD%91%E5%AE%9E%E6%97%B6%E5%BA%93&encoding=utf-8" -o 线路-配网.e
```

成功响应为 `text/plain` 附件。默认 E 文件字节使用 GBK 编码。

### 3.4 导出模型 E 文件：自定义模板文本

#### Endpoint

```http
POST /webgrp/v1/schemes/model/e-file
```

#### 参数与请求体

查询参数与 GET 版本相同，但 `template` 可选；请求体必须包含非空 `templateText`。

```json
{
  "templateText": "<ACLoad>\ndev_type=ACLoad\nname=名称\n</ACLoad>",
  "templateName": "自定义模板A"
}
```

`templateText` 用于实际生成；如果同时提供 `templateName`，`templateName` 仅用于模型类型校验和错误提示。

#### 完整示例

```bash
curl.exe -X POST "http://127.0.0.1:5174/webgrp/v1/schemes/model/e-file?space=default&schemePath=%5B%22%E9%BB%98%E8%AE%A4%E6%96%B9%E6%A1%88%22%5D&name=%E7%BA%BF%E8%B7%AF&encoding=gbk" `
  -H "Content-Type: application/json" `
  --data-binary '{"templateText":"<ACLoad>\ndev_type=ACLoad\nname=名称\n</ACLoad>","templateName":"自定义模板A"}' `
  -o 线路-自定义.e
```

### 3.5 导出模型 CIM/XML

#### Endpoint

```http
GET /webgrp/v1/schemes/model/cim-xml
```

#### 参数

| 参数 | 必填 | 说明 |
|---|---:|---|
| `schemePath` | 是 | URL 编码后的方案路径数组 |
| `name` | 是 | 模型名称 |
| `modelId` | 否 | 覆盖生成的 CIM 模型 ID；默认取 `project.idx`，再回退模型名 |
| `strict` | 否 | 传 `1` 时，关键参数缺失返回 `400` |

#### 完整示例

```bash
curl.exe -L "http://127.0.0.1:5174/webgrp/v1/schemes/model/cim-xml?space=default&schemePath=%5B%22%E9%BB%98%E8%AE%A4%E6%96%B9%E6%A1%88%22%5D&name=%E7%BA%BF%E8%B7%AF&modelId=12&strict=1" -o 线路.xml
```

成功响应：`application/xml; charset=utf-8`，并带附件文件名。

## 4. 方案 ZIP 导出

方案 ZIP 会递归处理所选方案及其子方案。每个被纳入的模型通常包含：

```text
模型.json
模型.e
模型.svg
```

E/SVG 在请求时实时生成，派生文件不会写回 `schemes/files`。

### 4.1 内部方案导出接口

```http
GET /webgrp/schemes/export
```

#### 完整示例

```bash
curl.exe -L "http://127.0.0.1:5174/webgrp/schemes/export?space=default&schemePath=%5B%22%E5%9B%9B%E5%B7%9D%22%2C%22%E6%88%90%E9%83%BD%22%2C%22%E9%A6%88%E7%BA%BF%22%5D" -o 馈线方案.zip
```

#### 完整示例：按 E 模板筛选

```bash
curl.exe -L "http://127.0.0.1:5174/webgrp/schemes/export?space=default&schemePath=%5B%22%E5%9B%9B%E5%B7%9D%22%2C%22%E6%88%90%E9%83%BD%22%2C%22%E9%A6%88%E7%BA%BF%22%5D&template=%E9%85%8D%E7%BD%91%E5%AE%9E%E6%97%B6%E5%BA%93" -o 馈线方案-配网.zip
```

### 4.2 v1 方案导出接口

```http
GET /webgrp/v1/schemes/export
```

#### 完整示例

```bash
curl.exe -L "http://127.0.0.1:5174/webgrp/v1/schemes/export?space=default&schemePath=%5B%22%E5%9B%9B%E5%B7%9D%22%2C%22%E6%88%90%E9%83%BD%22%2C%22%E9%A6%88%E7%BA%BF%22%5D&template=%E9%85%8D%E7%BD%91%E5%AE%9E%E6%97%B6%E5%BA%93" -o 馈线方案-v1.zip
```

#### 参数

| 参数 | 必填 | 说明 |
|---|---:|---|
| `schemePath` | 是 | 方案路径数组，URL 编码一次 |
| `template` | 否 | 指定后，只导出模板允许的模型类型 |
| `space` | 否 | 空间 id；也可以使用 `X-Space` |

成功响应：`application/zip`。缺少/非法 `schemePath` 返回 `400`，方案不存在返回 `404`，模型生成失败返回 `500`。

## 5. 空间批量 E/SVG 导出

此接口是模型派生导出，不是原样空间备份。ZIP 直接按方案和子方案目录组织文件。

### 5.1 每个模型独立 E 文件

```http
GET /webgrp/v1/spaces/export-artifacts?eMode=per-model
```

ZIP 示例：

```text
方案A/模型1.e
方案A/模型1.svg
方案A/子方案/模型2.e
方案A/子方案/模型2.svg
```

#### 完整示例

```bash
curl.exe -L "http://127.0.0.1:5174/webgrp/v1/spaces/export-artifacts?space=default&eMode=per-model" -o 默认空间-模型导出.zip
```

### 5.2 合并空间 E 文件

```http
GET /webgrp/v1/spaces/export-artifacts?eMode=merged
```

ZIP 示例：

```text
space.e
方案A/模型1.svg
方案A/子方案/模型2.svg
```

`space.e` 使用多模型 E 导出逻辑，包含模型序号、主网/配网/台区层级和全局线路处理，不是简单拼接多个单模型文本。

#### 完整示例：合并全部模型

```bash
curl.exe -L "http://127.0.0.1:5174/webgrp/v1/spaces/export-artifacts?space=default&eMode=merged" -o 默认空间-space.e.zip
```

### 5.3 按模板筛选空间模型

指定 `template` 后，E 文件和 SVG 使用同一批筛选后的模型：

#### 完整示例：只导出配网模型

```bash
curl.exe -L "http://127.0.0.1:5174/webgrp/v1/spaces/export-artifacts?space=default&eMode=per-model&template=%E9%85%8D%E7%BD%91%E5%AE%9E%E6%97%B6%E5%BA%93" -o 默认空间-配网.zip
```

#### 完整示例：生成只含厂站模型的 `space.e`

```bash
curl.exe -L "http://127.0.0.1:5174/webgrp/v1/spaces/export-artifacts?space=default&eMode=merged&template=%E4%B8%BB%E7%BD%91%E5%AE%9E%E6%97%B6%E5%BA%93" -o 默认空间-主网-space.e.zip
```

参数：

| 参数 | 必填 | 默认值 | 说明 |
|---|---:|---|---|
| `eMode` | 否 | `per-model` | `per-model` 或 `merged` |
| `template` | 否 | 空 | 预定义 E 模板；指定后按模板类型筛选 |
| `space` | 否 | 当前空间 | 空间 id |

非法 `eMode` 或未知模板返回 `400`。空间没有匹配模型时返回成功的空 ZIP。

## 6. 运行时当前模型导出

运行时接口读取前端当前打开的模型，必须有在线前端页面和 WebSocket 客户端。`clientId` 不传时使用最近活跃客户端；多个在线页面时应显式指定。

### 6.1 当前画布 SVG

#### Endpoint

```http
GET /webgrp/v1/runtime/svg
```

#### 完整示例

```bash
curl.exe -L "http://127.0.0.1:5174/webgrp/v1/runtime/svg?clientId=page-token-123" -o 当前画布.svg
```

返回 `image/svg+xml; charset=utf-8` 原始 SVG 文本。

### 6.2 当前模型 E 文件：预定义模板

#### Endpoint

```http
GET /webgrp/v1/runtime/e-file
```

#### 完整示例

```bash
curl.exe -L "http://127.0.0.1:5174/webgrp/v1/runtime/e-file?clientId=page-token-123&template=%E9%85%8D%E7%BD%91%E5%AE%9E%E6%97%B6%E5%BA%93" -o 当前模型-配网.e
```

可选模板：`国网E格式`、`主网实时库`、`配网实时库`、`台区实时库`。

### 6.3 当前模型 E 文件：自定义模板

#### Endpoint

```http
POST /webgrp/v1/runtime/e-file
```

#### 完整示例

```bash
curl.exe -X POST "http://127.0.0.1:5174/webgrp/v1/runtime/e-file?clientId=page-token-123" `
  -H "Content-Type: application/json" `
  --data-binary '{"templateText":"<ACLoad>\ndev_type=ACLoad\nname=名称\n</ACLoad>","templateName":"自定义模板A"}' `
  -o 当前模型-自定义.e
```

该接口只计算导出结果，不修改前端当前模板状态。

运行时错误通常包括：

- `503 no-online-client`：没有在线前端页面
- `503 ws-timeout`：前端在超时时间内未响应
- `404 no-active-model`：当前页面没有打开模型

## 7. 已保存模型外发传输

### 7.1 Endpoint

```http
POST /webgrp/v1/schemes/model/send
```

该接口不是下载接口，而是由后端生成模型文件后，以 `multipart/form-data` 转发到调用方指定的 HTTP(S) 地址。它会产生对外网络副作用，请确认 `body.url`。

### 7.2 定位模型

推荐使用稳定模型序号：

```text
modelId=<project.idx>
```

也可以兼容使用：

```text
schemePath=<encoded>&name=<模型名>
```

当两者同时提供时，优先使用 `modelId`。

### 7.3 文件格式

`body.files` 中每项的 `kind` 支持：

| kind | multipart 字段 | 文件后缀 | MIME |
|---|---|---|---|
| `e` | `e_file` | `.e` | `text/plain` |
| `json` | `json_file` | `.json` | `application/json` |
| `svg` | `svg_file` | `.svg` | `image/svg+xml` |
| `cim` | `cim_file` | `.xml` | `application/xml` |

### 7.4 完整示例：发送 E + JSON 到接收端

```bash
curl.exe -X POST "http://127.0.0.1:5174/webgrp/v1/schemes/model/send?space=default&modelId=12" `
  -H "Content-Type: application/json" `
  --data-binary '{"url":"http://127.0.0.1:5174/webgrp/v1/receive","files":[{"kind":"e","encoding":"gbk"},{"kind":"json","encoding":"utf-8"}],"templateName":"配网实时库"}'
```

### 7.5 完整示例：按方案路径发送 SVG + CIM/XML

```bash
curl.exe -X POST "http://127.0.0.1:5174/webgrp/v1/schemes/model/send?space=default&schemePath=%5B%22%E9%BB%98%E8%AE%A4%E6%96%B9%E6%A1%88%22%5D&name=%E7%BA%BF%E8%B7%AF" `
  -H "Content-Type: application/json" `
  --data-binary '{"url":"https://receiver.example.com/model","files":[{"kind":"svg","encoding":"utf-8"},{"kind":"cim","encoding":"utf-8"}]}'
```

成功响应：

```json
{
  "ok": true,
  "data": {
    "url": "http://127.0.0.1:5174/webgrp/v1/receive",
    "status": 200,
    "elapsedMs": 42,
    "templateName": "配网实时库",
    "files": [
      { "kind": "e", "field": "e_file", "filename": "线路.e", "encoding": "gbk", "bytes": 4096 },
      { "kind": "json", "field": "json_file", "filename": "线路.json", "encoding": "utf-8", "bytes": 8192 }
    ]
  }
}
```

## 8. 联调接收端

开发联调时可以把 `send` 的目标地址设为：

```http
POST /webgrp/v1/receive
```

该端点只在内存中保留最近几次接收记录，不落盘。发送后可以查看：

```bash
curl.exe -sS "http://127.0.0.1:5174/webgrp/v1/receive"
```

它适合验证 multipart 字段名、文件名、编码和字节数，不建议作为生产接收服务。

## 9. MCP 对应能力

如果通过 `/webgrp/mcp` 使用 MCP，而不是直接调用 HTTP API，对应工具如下：

| HTTP 能力 | MCP 工具 |
|---|---|
| 已保存模型 SVG/E/CIM | `gmp_export_model`，`format` 为 `svg`、`e-file` 或 `cim-xml` |
| 方案 ZIP | `gmp_export_scheme_archive` |
| 外发模型 | `gmp_send_model` |
| 当前运行时 SVG | `gmp_get_runtime_svg` |
| 当前运行时 E 文件 | `gmp_get_runtime_e_file` |

MCP 工具会复用同一套 v1 handler。MCP 的二进制结果以 resource/blob 返回，文本导出结果以 text 内容返回；详细 MCP 参数见 [MCP.md](./MCP.md)。

## 10. 错误处理速查

| 状态/错误码 | 含义 | 常见处理 |
|---|---|---|
| `400 bad-request` | 参数缺失、编码错误、模板或模式非法 | 修正请求参数 |
| `404 not-found` | 方案或模型不存在 | 先列方案/模型确认名称 |
| `500 internal` | E/SVG/CIM 生成失败或服务端异常 | 查看后端日志和模型数据 |
| `503 no-online-client` | 运行时接口没有在线前端 | 打开前端页面并保持连接 |
| `503 ws-timeout` | 运行时前端未及时响应 | 重试或检查页面状态 |
| `502` | 外发目标服务器返回非 2xx | 检查外部 URL 和目标服务 |

## 11. 相关实现位置

- v1 方案与模型导出：[server/apiV1Schemes.mjs](../server/apiV1Schemes.mjs)
- E 文件生成：[server/eFileExport.mjs](../server/eFileExport.mjs)
- SVG 生成：[server/svgExport.mjs](../server/svgExport.mjs)
- CIM/XML 生成：[server/cimExport.mjs](../server/cimExport.mjs)
- 方案 ZIP：[server/schemeArchive.mjs](../server/schemeArchive.mjs)
- 空间 E/SVG ZIP：[server/spaceArtifactExport.mjs](../server/spaceArtifactExport.mjs)
- 运行时导出：[server/apiV1Runtime.mjs](../server/apiV1Runtime.mjs)
- 外发传输：[server/sendModel.mjs](../server/sendModel.mjs)
- 在线接口总览：[server/swaggerPage.mjs](../server/swaggerPage.mjs)
