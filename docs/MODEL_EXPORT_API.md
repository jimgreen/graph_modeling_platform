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

所有按方案定位的接口也接受 `schemeId`。它是当前空间内唯一的正整数，可从 `GET /webgrp/v1/schemes` 的方案树读取。重命名或移动方案时编号保持不变；复制或导入会分配新编号。只提供 `schemeId` 即可；同时提供 `schemePath` 与 `schemeId` 时，两者必须指向同一方案。

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

现在推荐使用批量接口读取已保存模型；单模型通过 `scope=model` 定位：

```http
GET /webgrp/v1/models/export?scope=model&modelId=12&formats=json,svg,cim,e
```

返回 `{ok:true,data}`，每个产物以 `contentBase64` 返回，具体参数见下方“批量多范围模型导出”。

旧的 `GET /webgrp/v1/schemes/model/export?format=...` 保留兼容，继续返回原始 SVG/E/CIM 响应或单模型 JSON 信封；新调用不应再依赖它。
兼容 GET 响应会带 `Deprecation: true` 和 `Link: </webgrp/v1/models/export>; rel="successor-version"`，便于调用方迁移。

自定义 E 模板仍使用 POST，请求体必须包含非空 `templateText`：

~~~bash
curl.exe -X POST "http://127.0.0.1:5174/webgrp/v1/schemes/model/export?format=e-file&space=default&schemePath=%5B%22%E9%BB%98%E8%AE%A4%E6%96%B9%E6%A1%88%22%5D&name=%E7%BA%BF%E8%B7%AF&encoding=gbk" ^
  -H "Content-Type: application/json" ^
  --data-binary "{\"templateText\":\"<ACLoad>\\ndev_type=ACLoad\\nname=名称\\n</ACLoad>\",\"templateName\":\"自定义模板A\"}" ^
  -o 线路-自定义.e
~~~

### 3.1 批量多范围模型导出

批量导出接口按空间、方案或模型范围枚举已保存模型，并把多种格式作为 JSON 信封中的 Base64 产物返回：

```http
GET /webgrp/v1/models/export
```

#### 范围与选择器

| 参数 | 说明 |
|---|---|
| `scope=space` | 默认值，导出当前空间全部模型 |
| `scope=scheme` | 需要 `schemePath` 或 `schemeId`；默认包含子方案，可用 `includeDescendants=false` 只取当前方案 |
| `scope=model` | 需要 `modelId`，或 `schemePath/schemeId + name`；两种定位方式不能同时使用 |
| `formats` | `json,svg,cim,e` 的逗号集合，默认全部；重复项去重，固定输出顺序 |
| `encoding` | `utf-8` 或 `gbk`，默认 `utf-8`；外层 JSON 信封始终 UTF-8 |
| `template` | 只影响 E 产物的预定义模板；类型不匹配的模型保留在 `models`，但跳过 E 并写入 warning |
| `mergeE` | `true` 时按 `modelType` 生成独立合并 E，返回顶层 `mergedE` |
| `includeAssociatedModels` | `true` 时递归带上模型 `model_id` 和全局线路关联模型，范围限制在当前空间 |
| `colorMode` | 只影响 SVG：`energy` 或 `voltage` |
| `strict` | 只影响 CIM；启用后沿用单模型 CIM 的关键参数校验 |

示例：

```bash
curl.exe -sS "http://127.0.0.1:5174/webgrp/v1/models/export?scope=model&modelId=12&formats=json,svg,cim,e&encoding=gbk&template=配网实时库&includeAssociatedModels=true"
```

成功响应的 `data` 包含 `selectedModelCount`、`expandedModelCount`、`modelCount`、`models`、`mergedE` 和 `warnings`。每个 `models[].artifacts[]` 以及顶层 `mergedE[]` 都包含：

```json
{
  "format": "json|svg|cim|e",
  "encoding": "utf-8|gbk",
  "mimeType": "application/json|image/svg+xml|application/xml|text/plain",
  "filename": "产物文件名",
  "contentBase64": "..."
}
```

`mergeE=true` 时，每种模型类型对应一个独立的合并 E 文件，带有 `modelType`、`modelIds` 和可选 `template`；逐模型 `artifacts` 不重复放 E。任一模型读取或格式生成失败都会返回错误，不返回部分结果。没有匹配模型时返回 200，模型和合并产物数组为空。

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

也可将 `schemePath` 替换为从方案树读取的 `schemeId`：

```bash
curl.exe -L "http://127.0.0.1:5174/webgrp/schemes/export?space=default&schemeId=12" -o 馈线方案.zip
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

按方案编号导出：

```bash
curl.exe -L "http://127.0.0.1:5174/webgrp/v1/schemes/export?space=default&schemeId=12" -o 馈线方案-v1.zip
```

#### 参数

| 参数 | 必填 | 说明 |
|---|---:|---|
| `schemePath` / `schemeId` | 至少提供一个；可同时提供 | 路径数组（URL 编码一次）或方案编号；同时提供时必须指向同一方案 |
| `template` | 否 | 指定后，只导出模板允许的模型类型 |
| `space` | 否 | 空间 id；也可以使用 `X-Space` |

成功响应：`application/zip`。缺少/非法方案选择器返回 `400`，方案不存在返回 `404`，模型生成失败返回 `500`。

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

运行时统一入口读取前端当前打开的模型，必须有在线前端页面和 WebSocket 客户端。clientId 可选，不传时按当前空间选择最近活跃客户端。

~~~http
GET /webgrp/v1/runtime/export?format=svg|e-file
POST /webgrp/v1/runtime/export?format=e-file
~~~

### 6.1 当前画布 SVG

~~~bash
curl.exe -L "http://127.0.0.1:5174/webgrp/v1/runtime/export?format=svg&clientId=page-token-123" -o 当前画布.svg
~~~

返回 image/svg+xml; charset=utf-8。

### 6.2 当前模型 E 文件

GET 可选预定义模板 template：

~~~bash
curl.exe -L "http://127.0.0.1:5174/webgrp/v1/runtime/export?format=e-file&clientId=page-token-123&template=%E9%85%8D%E7%BD%91%E5%AE%9E%E6%97%B6%E5%BA%93" -o 当前模型-配网.e
~~~

POST 固定使用 format=e-file，body 为 {templateText,templateName?}：

~~~bash
curl.exe -X POST "http://127.0.0.1:5174/webgrp/v1/runtime/export?format=e-file&clientId=page-token-123" ^
  -H "Content-Type: application/json" ^
  --data-binary "{\"templateText\":\"<ACLoad>\\ndev_type=ACLoad\\nname=名称\\n</ACLoad>\",\"templateName\":\"自定义模板A\"}" ^
  -o 当前模型-自定义.e
~~~

该接口只计算导出结果，不修改前端当前模板状态。错误仍保持 503 no-online-client、503 ws-timeout 和 404 no-active-model 等原语义。旧的 /webgrp/v1/runtime/svg、/webgrp/v1/runtime/e-file 路径已删除。

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

也可用方案编号定位：

```text
schemeId=<方案编号>&name=<模型名>
```

`schemeId` 可替代 `schemePath`，两者同时提供时必须指向同一方案。`modelId` 与方案选择器同时提供时仍优先使用 `modelId`。

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

## 8. 模型更新 WebSocket 订阅

订阅服务使用后端现有 HTTP server 和端口，不单独监听新端口。默认连接地址：

```text
ws://<server-host>:5174/webgrp/v1/subscriptions/ws?space=<spaceId>
```

HTTPS 部署使用 `wss://`。空间可通过 URL 的 `space` 参数选择；也沿用 `X-Space`、`gmp_space` Cookie 和默认空间回退规则。显式指定不存在的空间时，WebSocket 握手返回 404。连接会绑定到解析出的空间，订阅帧不能跨空间读取。

原生客户端可不发送 `Origin`。浏览器客户端可从任意有效 HTTP(S) Origin 连接此路径；现有前端运行时通道 `/webgrp/ws` 仍使用原有本机 Origin 限制。订阅接口读取已保存模型，访问边界与现有无鉴权只读 API 一致，不增加新的认证机制。

### 8.1 订阅范围与文件类型

每个连接可创建多条订阅。`scope.type` 支持：

| 范围 | 参数 | 匹配行为 |
|---|---|---|
| `space` | 无 | 当前连接所属空间中的所有已保存模型 |
| `scheme` | `schemePath`：方案名称数组 | 该方案及其所有子方案中的模型 |
| `model` | `modelId`：正整数模型 `idx` | 稳定模型序号匹配 |

创建 `scheme` 或 `model` 订阅时，目标必须已存在。每条订阅的 `files` 至少含一种格式，可多选 `json`、`xml`、`e`。只有 `encoding` 明确等于 `gbk` 时使用 GBK；省略或其他值都使用 UTF-8。

### 8.2 浏览器示例

```js
const url = new URL("ws://127.0.0.1:5174/webgrp/v1/subscriptions/ws");
url.searchParams.set("space", "default");

const socket = new WebSocket(url);
let subscriptionId = "";

socket.addEventListener("open", () => {
  socket.send(JSON.stringify({
    type: "subscribe",
    scope: { type: "scheme", schemePath: ["默认方案"] },
    files: [
      { kind: "json" },
      { kind: "xml" },
      { kind: "e", encoding: "gbk" }
    ]
  }));
});

socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (message.type === "subscribed") {
    subscriptionId = message.data.subscriptionId;
    return;
  }
  if (message.type === "model.updated") {
    for (const file of message.data.files) {
      const bytes = Uint8Array.from(atob(file.contentBase64), (char) => char.charCodeAt(0));
      const text = file.encoding === "gbk"
        ? new TextDecoder("gbk").decode(bytes)
        : new TextDecoder("utf-8").decode(bytes);
      console.log(file.filename, text);
    }
    return;
  }
  if (message.type === "error") {
    console.error(message.error.code, message.error.message);
  }
});

function unsubscribe() {
  if (subscriptionId) {
    socket.send(JSON.stringify({ type: "unsubscribe", subscriptionId }));
  }
}
```

原生 Node.js 客户端可使用 `ws` 包；URL 和 JSON 消息与浏览器示例相同：

```js
import WebSocket from "ws";

const socket = new WebSocket(
  "ws://192.168.1.20:5174/webgrp/v1/subscriptions/ws?space=default"
);
socket.on("open", () => socket.send(JSON.stringify({
  type: "subscribe",
  scope: { type: "model", modelId: 12 },
  files: [{ kind: "json" }, { kind: "e", encoding: "gbk" }]
})));
socket.on("message", (raw) => {
  const message = JSON.parse(raw.toString("utf-8"));
  if (message.type === "model.updated") {
    for (const file of message.data.files) {
      const bytes = Buffer.from(file.contentBase64, "base64");
      console.log(file.filename, bytes.length);
    }
  }
});
```

### 8.3 确认、更新与错误帧

订阅成功后返回：

```json
{
  "type": "subscribed",
  "ok": true,
  "data": {
    "subscriptionId": "sub-uuid",
    "scope": { "type": "model", "modelId": 12 },
    "files": [{ "kind": "json", "encoding": "utf-8" }]
  }
}
```

取消时发送 `{"type":"unsubscribe","subscriptionId":"sub-uuid"}`；成功返回 `type:"unsubscribed"`。一个连接关闭后，该连接的所有订阅立即清理；服务端不排队、不重放离线消息，重连后客户端需要重新订阅。

服务端每 30 秒向连接发送 WebSocket 控制帧 Ping。连续 30 分钟未收到该连接的 Pong 时，服务端会清理该连接的所有订阅并终止连接；正常关闭或 socket error 时也会清理。浏览器和 `ws` 等标准 WebSocket 客户端会自动响应控制帧，客户端无需额外发送应用层心跳消息。

模型更新帧复用 `/webgrp/v1/schemes/model/send` 发往目标的 multipart 文本字段和文件部件结构，但通过 WebSocket JSON + Base64 承载文件。订阅服务不会调用 `/send` 或 `/receive`：

```json
{
  "type": "model.updated",
  "data": {
    "model_id": "12",
    "model_name": "线路",
    "template_name": "",
    "scheme_path": "[\"默认方案\"]",
    "sent_at": "2026-11-21T10:00:00.000Z",
    "files": [{
      "kind": "json",
      "field": "json_file",
      "filename": "线路.json",
      "contentType": "application/json; charset=utf-8",
      "encoding": "utf-8",
      "bytes": 123,
      "contentBase64": "eyJ2ZXJzaW9uIjoxLCJuYW1lIjoi6Lev5b6EIn0="
    }]
  }
}
```

JSON 文件根对象是 ProjectFile，不带 API `{ok,data}` 信封。`xml` 请求生成的文件项使用 `kind:"cim"`、`field:"cim_file"`、`.xml` 文件名；E 文件使用 `kind:"e"`、`field:"e_file"`。`contentBase64` 解码得到原始文件字节；在相同保存版本、格式与编码下，字节与 `/send` 对应文件一致。

成功保存的模型会推送，包括单模型保存、方案树批量写入、方案 ZIP 导入、成功的空间覆盖导入和已保存模型的拓扑修复。空间/方案范围订阅只接收其范围内新增或变化的模型。模型删除不发送删除帧；模型级订阅会被移除，空间删除会关闭该空间的连接。未保存的画布运行时改动不会推送。

当模型保存请求只提供 `schemeId` 而未提供 `schemePath` 时，后端会在保存成功后先将编号解析为当前方案的真实路径，再执行订阅匹配和推送。这样按方案路径创建的订阅不会因为保存请求省略路径而漏收更新；`schemeId` 与 `schemePath` 同时提供时仍必须指向同一方案。

单个订阅的文件生成失败时只收到错误帧，不包含部分文件；其他匹配订阅继续处理。`code` 优先使用导出器返回的错误码，没有错误码时回退为 `export-failed`：

```json
{
  "type": "error",
  "error": {
    "code": "export-failed",
    "message": "模型文件生成失败。",
    "subscriptionId": "sub-uuid"
  }
}
```

## 9. 联调接收端

开发联调时可以把 `send` 的目标地址设为：

```http
POST /webgrp/v1/receive
```

该端点只在内存中保留最近几次接收记录，不落盘。发送后可以查看：

```bash
curl.exe -sS "http://127.0.0.1:5174/webgrp/v1/receive"
```

它适合验证 multipart 字段名、文件名、编码和字节数，不建议作为生产接收服务。

## 10. MCP 对应能力

如果通过 `/webgrp/mcp` 使用 MCP，而不是直接调用 HTTP API，对应工具如下：

| HTTP 能力 | MCP 工具 |
|---|---|
| 已保存模型 SVG/E/CIM | `gmp_export_model`，`format` 为 `svg`、`e-file` 或 `cim-xml` |
| 方案 ZIP | `gmp_export_scheme_archive` |
| 外发模型 | `gmp_send_model` |
| 当前运行时 SVG | `gmp_get_runtime_svg` |
| 当前运行时 E 文件 | `gmp_get_runtime_e_file` |

MCP 工具会复用同一套 v1 handler。MCP 的二进制结果以 resource/blob 返回，文本导出结果以 text 内容返回；详细 MCP 参数见 [MCP.md](./MCP.md)。

## 11. 错误处理速查

| 状态/错误码 | 含义 | 常见处理 |
|---|---|---|
| `400 bad-request` | 参数缺失、编码错误、模板或模式非法 | 修正请求参数 |
| `404 not-found` | 方案或模型不存在 | 先列方案/模型确认名称 |
| `500 internal` | E/SVG/CIM 生成失败或服务端异常 | 查看后端日志和模型数据 |
| `503 no-online-client` | 运行时接口没有在线前端 | 打开前端页面并保持连接 |
| `503 ws-timeout` | 运行时前端未及时响应 | 重试或检查页面状态 |
| `502` | 外发目标服务器返回非 2xx | 检查外部 URL 和目标服务 |

## 12. 相关实现位置

- v1 方案与模型导出：[server/apiV1Schemes.mjs](../server/apiV1Schemes.mjs)
- E 文件生成：[server/eFileExport.mjs](../server/eFileExport.mjs)
- SVG 生成：[server/svgExport.mjs](../server/svgExport.mjs)
- CIM/XML 生成：[server/cimExport.mjs](../server/cimExport.mjs)
- 方案 ZIP：[server/schemeArchive.mjs](../server/schemeArchive.mjs)
- 空间 E/SVG ZIP：[server/spaceArtifactExport.mjs](../server/spaceArtifactExport.mjs)
- 运行时导出：[server/apiV1Runtime.mjs](../server/apiV1Runtime.mjs)
- 外发传输：[server/sendModel.mjs](../server/sendModel.mjs)
- 模型更新推送：[server/modelUpdateService.mjs](../server/modelUpdateService.mjs)、[server/modelUpdateWebSocket.mjs](../server/modelUpdateWebSocket.mjs)、[server/modelUpdatePayload.mjs](../server/modelUpdatePayload.mjs)
- 在线接口总览：[server/swaggerPage.mjs](../server/swaggerPage.mjs)
