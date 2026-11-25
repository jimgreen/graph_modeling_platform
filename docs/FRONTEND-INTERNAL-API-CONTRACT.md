# 前端内部 API 接口契约

> 版本：2026-11-25<br>
> 适用对象：需要实现另一套自有逻辑、但希望兼容当前前端页面的开发者。<br>
> 来源：当前源码和后端路由实现。<br>
> 定位：面向外部开发者的 URL、Request、Response 兼容契约。

## 1. 目标和范围

本文件定义当前前端页面使用的内部 HTTP API 契约，重点覆盖：

- 空间 API；
- 方案/模型 API；
- 图片和图片文件夹 API；
- 配置 API：配色、图元库、量测配置、Symbol 导出方案；
- 补充的全局线路 API；
- 共享图标库静态资源 URL。

实现另一套后端时，应保持以下内容兼容：

1. URL 路径和 HTTP 方法；
2. 查询参数名称、编码方式和请求体字段；
3. 成功响应的 JSON 结构、二进制类型和响应头；
4. 错误 HTTP 状态码和错误 JSON 结构；
5. 空间上下文选择规则；
6. 方案路径、模型 ID、图片 ID 的稳定语义。

本文件不定义 `/webgrp/v1/*` 第三方 API、MCP、运行时态控制 WebSocket 和模型更新订阅协议。需要这些能力时，另见 `docs/FRONTEND-BACKEND-API-MAP.md`、`docs/MCP.md` 和 `docs/WEBGRP-INTEGRATION-GUIDE.md`。

## 2. Base URL 和空间上下文

### 2.1 Base URL

使用以下变量表示部署地址：

```text
BASE_URL = http://127.0.0.1:5174
API_PREFIX = /webgrp
```

规范 URL 形式：

```text
${BASE_URL}${API_PREFIX}/<resource>
```

浏览器代理可以使用 Vite 前端地址，因此同一请求也可以通过下面的代理地址访问：

```text
http://127.0.0.1:5173/webgrp/<resource>
```

外部实现可以直接使用后端端口，也可以通过自己的前端代理转发；路径必须保持 `/webgrp` 前缀兼容。

### 2.2 通用请求头

JSON 请求：

```http
Accept: application/json
Content-Type: application/json; charset=utf-8
```

浏览器主应用的空间上下文使用 Cookie：

```http
Cookie: gmp_space=<encodeURIComponent(spaceId)>
```

空间 ID 可能包含中文，因此 Cookie 值必须先 `encodeURIComponent`。服务端同时兼容以下解析优先级，供非浏览器客户端使用：

```text
X-Space 头 > ?space= 查询参数 > gmp_space Cookie > 第一个可用空间
```

建议自有 API 客户端始终显式传 `X-Space` 或 `?space=`，不要依赖回退空间。

### 2.3 通用响应头

JSON 响应：

```http
Content-Type: application/json; charset=utf-8
Access-Control-Allow-Origin: ...
```

大多数基于 JSON 文件的 GET 接口支持：

```http
Cache-Control: no-cache
ETag: "..."
Content-Encoding: gzip        # 客户端声明支持且响应足够大时可能出现
```

带 `If-None-Match` 且 ETag 未变化时，服务端可返回：

```http
304 Not Modified
```

空间管理、模型读写和部分动态接口使用 `Cache-Control: no-store`，不要对其做长期缓存。

## 3. 通用错误契约

### 3.1 无错误码的旧式错误

```json
{
  "error": "空间名不能为空。"
}
```

### 3.2 带错误码的标准错误

```json
{
  "error": {
    "code": "SPACE_NAME_DUPLICATE",
    "message": "空间名已存在。"
  }
}
```

### 3.3 状态码约定

| HTTP 状态 | 含义 | 实现要求 |
|---:|---|---|
| `200` | 成功 | 返回约定的 JSON 或二进制内容 |
| `201` | 创建成功 | 主要用于上传图片、创建图片文件夹、文档图片导入 |
| `304` | ETag 未变化 | 仅适用于支持缓存校验的 GET |
| `400` | 参数、JSON、路径或数据格式错误 | 返回 `error` 字段 |
| `404` | 空间、方案、模型、文件夹或图片不存在 | 返回 `error` 字段 |
| `409` | 名称冲突、初始化状态冲突、并发冲突 | 返回稳定错误码，客户端可据此重试或提示用户 |
| `500` | 服务端内部错误 | 返回可读错误消息，不暴露堆栈 |

## 4. 接口覆盖范围

以下接口属于当前前端页面的加载、持久化和资源访问路径，均纳入本规范：

| API 请求 | 状态 | 本规范章节 |
|---|---:|---|
| `GET /webgrp/spaces` | 200 | 空间 API |
| `GET /webgrp/schemes` | 200 | 方案 API |
| `GET /webgrp/schemes/project` | 200 | 模型 API |
| `PUT /webgrp/schemes/project` | 200 | 模型 API |
| `GET /webgrp/image-folders` | 200 | 图片 API |
| `GET /webgrp/images?folderId=root` | 200 | 图片 API |
| `GET /webgrp/color-config` | 200 | 配置 API |
| `GET /webgrp/device-library` | 200 | 配置 API |
| `PUT /webgrp/device-library` | 200 | 配置 API |
| `GET /webgrp/measurement-config` | 200 | 配置 API |
| `GET /webgrp/global-lines` | 200 | 附加 API |
| `GET /app/icon-library/catalog.json` | 200 | 静态资源 |
| `GET /app/icon-library/open-source-svg/manifest.json` | 200 | 静态资源 |

部分写接口、上传接口和导入接口只会在用户执行对应操作时出现，但同样属于兼容契约范围。

## 5. 空间 API

### 5.1 获取空间列表

#### URL

```http
GET ${BASE_URL}/webgrp/spaces
```

#### Request

无请求体。浏览器通常携带 `gmp_space` Cookie。

#### Response：已初始化

```json
{
  "spaces": [
    {
      "id": "default",
      "name": "默认空间",
      "pinned": true,
      "createdAt": "2026-09-13T15:31:52.715Z",
      "lastAccessAt": "2026-11-25T03:10:14.132Z"
    }
  ],
  "current": "default"
}
```

#### Response：首次初始化前

```json
{
  "spaces": [],
  "current": "",
  "setupRequired": true
}
```

#### 字段

| 字段 | 类型 | 说明 |
|---|---|---|
| `spaces` | `Space[]` | 当前实例可见空间 |
| `current` | `string` | 后端解析后实际生效的空间 ID |
| `setupRequired` | `boolean` | 仅首次初始化前出现 |
| `Space.owner` | `string?` | qiankun 场景的归属标识，不代表权限 |

### 5.2 首次初始化默认空间

#### URL

```http
POST ${BASE_URL}/webgrp/spaces/initialize
```

#### Request

```json
{
  "name": "默认空间",
  "owner": "integration-demo-user"
}
```

`owner` 可省略。成功创建的空间 ID 固定为 `default`。

#### Response `200`

```json
{
  "id": "default",
  "name": "默认空间",
  "pinned": true,
  "createdAt": "2026-11-25T03:00:00.000Z",
  "owner": "integration-demo-user"
}
```

#### 常见错误

| 状态 | code | 说明 |
|---:|---|---|
| 400 | `SPACE_NAME_INVALID` | 名称为空、非法或超长 |
| 409 | `SPACE_ALREADY_INITIALIZED` | 已完成首次初始化 |

### 5.3 新建普通空间

#### URL

```http
POST ${BASE_URL}/webgrp/spaces
```

#### Request

```json
{
  "name": "实验空间",
  "owner": "integration-demo-user"
}
```

#### Response `200`

```json
{
  "id": "实验空间",
  "name": "实验空间",
  "pinned": false,
  "createdAt": "2026-11-25T03:05:00.000Z",
  "owner": "integration-demo-user"
}
```

#### 常见错误

| 状态 | code | 说明 |
|---:|---|---|
| 400 | `SPACE_NAME_INVALID` | 名称不合法 |
| 409 | `SPACE_NOT_INITIALIZED` | 首次初始化尚未完成 |
| 409 | `SPACE_NAME_DUPLICATE` | 显示名称已存在；响应还会带冲突空间信息 |

### 5.4 重命名空间

#### URL

```http
PUT ${BASE_URL}/webgrp/spaces
```

#### Request

```json
{
  "id": "实验空间",
  "name": "实验空间-新名称"
}
```

#### Response `200`

```json
{
  "ok": true
}
```

#### 约束

- `id` 是空间 ID，不是当前显示名称；
- 重命名不改变空间目录 ID；
- `default` 可以重命名，但不能删除；
- 同名返回 `409 SPACE_NAME_DUPLICATE`。

### 5.5 删除空间

#### URL

```http
DELETE ${BASE_URL}/webgrp/spaces
```

#### Request

```json
{
  "id": "实验空间"
}
```

#### Response `200`

```json
{
  "ok": true
}
```

#### 常见错误

```json
{
  "error": {
    "code": "SPACE_PINNED",
    "message": "default 空间不可删除。"
  }
}
```

### 5.6 导出空间 ZIP

#### URL

```http
GET ${BASE_URL}/webgrp/spaces/export
```

#### Request

无请求体。空间由 Cookie、`X-Space` 或 `?space=` 解析。

#### Response `200`

```http
Content-Type: application/zip
Content-Disposition: attachment; filename*=UTF-8''<space>.zip
Cache-Control: no-store
```

响应体是 ZIP 二进制，不是 JSON。

### 5.7 导入空间 ZIP

#### URL

```http
POST ${BASE_URL}/webgrp/spaces/import
POST ${BASE_URL}/webgrp/spaces/import?mode=overwrite
POST ${BASE_URL}/webgrp/spaces/import?mode=rename&name=<newName>
```

#### Request

请求体是 ZIP 原始字节：

```http
Content-Type: application/zip
```

#### Response `200`

```json
{
  "ok": true,
  "space": {
    "id": "导入空间",
    "name": "导入空间",
    "pinned": false,
    "createdAt": "2026-11-25T03:10:00.000Z"
  },
  "spaces": [],
  "savedAt": "2026-11-25T03:10:00.000Z"
}
```

默认 `mode` 是冲突检查；重名返回 `409 SPACE_NAME_DUPLICATE`，调用方再选择覆盖或改名后重发。

## 6. 方案和模型 API

### 6.1 获取方案树

#### URL

```http
GET ${BASE_URL}/webgrp/schemes
GET ${BASE_URL}/webgrp/schemes?includeProjects=1
```

#### Request

无请求体。

#### Response `200`

```json
{
  "schemes": [
    {
      "name": "DOT",
      "schemeId": 1,
      "updatedAt": "2026-11-24T12:59:06.703Z",
      "projects": [
        {
          "name": "排查模型",
          "updatedAt": "2026-11-25T03:12:07.904Z",
          "project": {
            "version": 1,
            "name": "排查模型",
            "idx": 9,
            "modelType": "厂站",
            "nodes": [],
            "edges": [],
            "__summaryOnly": true,
            "powerUnit": "MW",
            "voltageUnit": "kV",
            "currentUnit": "A",
            "powerBaseValue": 100,
            "deviceIndexCounters": {}
          }
        }
      ],
      "children": []
    }
  ]
}
```

当 `__summaryOnly=true` 时，`nodes` 和 `edges` 只是摘要占位，不能直接作为完整模型写回；先调用 6.2 获取完整模型。

### 6.2 获取完整模型

#### URL：按方案路径

```http
GET ${BASE_URL}/webgrp/schemes/project?schemePath=%5B%22DOT%22%5D&name=%E6%8E%92%E6%9F%A5%E6%A8%A1%E5%9E%8B
```

`schemePath` 的编码规则是：先 `JSON.stringify(string[])`，再只做一次 `encodeURIComponent`。

#### URL：按方案 ID

```http
GET ${BASE_URL}/webgrp/schemes/project?schemeId=1&name=%E6%8E%92%E6%9F%A5%E6%A8%A1%E5%9E%8B
```

#### Response `200`

```json
{
  "ok": true,
  "project": {
    "name": "排查模型",
    "updatedAt": "2026-11-25T03:12:07.904Z",
    "contentHash": "sha256-or-project-hash",
    "project": {
      "version": 1,
      "name": "排查模型",
      "idx": 9,
      "layers": [
        { "id": "layer-default", "name": "默认图层", "visible": true }
      ],
      "activeLayerId": "layer-default",
      "canvasWidth": 1920,
      "canvasHeight": 1024,
      "allowAutoExpandCanvas": true,
      "canvasBackgroundColor": "",
      "canvasBackgroundImage": "",
      "canvasBackgroundImageAssetId": "",
      "canvasBackgroundImageFit": "cover",
      "backgroundProjectId": "",
      "backgroundLayerIds": [],
      "electricFlowVisible": false,
      "electricFlowSettings": {},
      "powerUnit": "MW",
      "voltageUnit": "kV",
      "currentUnit": "A",
      "powerBaseValue": 100,
      "subcontrolarea": "默认区域",
      "modelType": "厂站",
      "substation": "",
      "feeder": "",
      "taiqu": "",
      "deviceIndexCounters": {},
      "groups": [],
      "measurements": { "version": 1, "groups": [] },
      "nodes": [],
      "edges": []
    }
  }
}
```

#### 常见错误

| 状态 | 说明 |
|---:|---|
| 400 | 缺少 `name`、`schemePath`/`schemeId` 无效 |
| 404 | 方案或模型不存在 |

### 6.3 保存模型

#### URL

```http
PUT ${BASE_URL}/webgrp/schemes/project
```

#### Request

```json
{
  "schemePath": ["DOT"],
  "previousName": "排查模型",
  "record": {
    "name": "排查模型",
    "updatedAt": "2026-11-25T03:12:07.904Z",
    "contentHash": "sha256-or-project-hash",
    "project": {
      "version": 1,
      "name": "排查模型",
      "idx": 9,
      "layers": [],
      "activeLayerId": "layer-default",
      "canvasWidth": 1920,
      "canvasHeight": 1024,
      "allowAutoExpandCanvas": true,
      "powerUnit": "MW",
      "voltageUnit": "kV",
      "currentUnit": "A",
      "powerBaseValue": 100,
      "nodes": [],
      "edges": [],
      "groups": [],
      "measurements": { "version": 1, "groups": [] }
    }
  }
}
```

可选字段：

- `schemeId`：方案稳定编号；若同时传 `schemePath`，两者必须指向同一方案；
- `previousName`：模型改名时传旧名称；
- `record.project`：完整模型对象，不能传方案树摘要。

#### Response `200`

```json
{
  "ok": true,
  "project": {
    "name": "排查模型",
    "updatedAt": "2026-11-25T03:12:07.904Z",
    "contentHash": "sha256-or-project-hash",
    "project": {}
  },
  "savedAt": "2026-11-25T03:12:07.990Z"
}
```

保存成功后，后端可能触发模型更新订阅通知；该通知不改变本接口响应。

### 6.4 删除模型

#### URL

```http
DELETE ${BASE_URL}/webgrp/schemes/project
```

#### Request

```json
{
  "schemePath": ["DOT"],
  "name": "排查模型"
}
```

也可以用 `schemeId` 替代 `schemePath`。

#### Response `200`

```json
{
  "ok": true,
  "savedAt": "2026-11-25T03:15:00.000Z"
}
```

### 6.5 保存方案目录

#### URL

```http
PUT ${BASE_URL}/webgrp/schemes/scheme
```

#### Request

```json
{
  "schemePath": ["地区1", "主网"],
  "previousSchemePath": ["地区1", "旧主网"],
  "schemeId": 9
}
```

`previousSchemePath` 仅在移动或重命名方案时需要。

#### Response `200`

```json
{
  "ok": true,
  "schemeId": 9,
  "savedAt": "2026-11-25T03:15:00.000Z"
}
```

### 6.6 删除方案目录

#### URL

```http
DELETE ${BASE_URL}/webgrp/schemes/scheme
```

#### Request

```json
{
  "schemePath": ["地区1", "主网"],
  "schemeId": 9
}
```

至少提供 `schemePath` 或 `schemeId` 之一。

#### Response `200`

```json
{
  "ok": true,
  "savedAt": "2026-11-25T03:15:00.000Z"
}
```

### 6.7 方案 ZIP 导出

#### URL

```http
GET ${BASE_URL}/webgrp/schemes/export?schemePath=%5B%22DOT%22%5D
GET ${BASE_URL}/webgrp/schemes/export?schemeId=1
```

#### Request

无请求体。

#### Response `200`

```http
Content-Type: application/zip
Content-Disposition: attachment; filename*=UTF-8''DOT.zip
Cache-Control: no-store
```

### 6.8 方案 ZIP 导入

#### URL

```http
POST ${BASE_URL}/webgrp/schemes/import?parentPath=%5B%22地区1%22%5D&fileName=demo.zip&mode=check
POST ${BASE_URL}/webgrp/schemes/import?parentPath=%5B%22地区1%22%5D&fileName=demo.zip&mode=overwrite&targetName=新方案
```

#### Request

```http
Content-Type: application/zip
```

请求体是 ZIP 原始字节。

#### Response `200`

```json
{
  "ok": true,
  "schemes": [],
  "importedName": "新方案",
  "importedPath": ["地区1", "新方案"],
  "schemeId": 16,
  "savedAt": "2026-11-25T03:20:00.000Z"
}
```

重名检查返回 `409`，响应中带 `conflict` 信息。

## 7. 图片和图片文件夹 API

### 7.1 数据类型

```json
{
  "ImageFolder": {
    "id": "root",
    "name": "默认文件夹",
    "createdAt": "1970-01-01T00:00:00.000Z",
    "imageCount": 0
  },
  "ImageAsset": {
    "id": "img-example",
    "name": "设备图标.png",
    "filename": "img-example.png",
    "folderId": "root",
    "mimeType": "image/png",
    "size": 1234,
    "createdAt": "2026-11-25T03:25:00.000Z",
    "url": "/webgrp/images/img-example"
  }
}
```

### 7.2 获取图片文件夹

#### URL

```http
GET ${BASE_URL}/webgrp/image-folders
```

#### Request

无请求体。

#### Response `200`

```json
[
  {
    "id": "root",
    "name": "默认文件夹",
    "createdAt": "1970-01-01T00:00:00.000Z",
    "imageCount": 0
  }
]
```

### 7.3 新建图片文件夹

#### URL

```http
POST ${BASE_URL}/webgrp/image-folders
```

#### Request

```json
{
  "name": "设备图标"
}
```

#### Response `201`

```json
{
  "id": "folder-example",
  "name": "设备图标",
  "createdAt": "2026-11-25T03:25:00.000Z"
}
```

同名返回 `409`。

### 7.4 重命名图片文件夹

#### URL

```http
PUT ${BASE_URL}/webgrp/image-folders/{folderId}
```

#### Request

```json
{
  "name": "新名称"
}
```

#### Response `200`

返回更新后的 `ImageFolder` 对象。`root` 文件夹不能重命名。

### 7.5 删除图片文件夹

#### URL

```http
DELETE ${BASE_URL}/webgrp/image-folders/{folderId}
```

#### Request

无请求体。

#### Response `200`

```json
{
  "ok": true
}
```

`root` 文件夹不能删除；文件夹内图片移回默认文件夹。

### 7.6 获取图片清单

#### URL

```http
GET ${BASE_URL}/webgrp/images
GET ${BASE_URL}/webgrp/images?folderId=root
```

#### Request

无请求体。

#### Response `200`

```json
[
  {
    "id": "img-example",
    "name": "设备图标.png",
    "filename": "img-example.png",
    "folderId": "root",
    "mimeType": "image/png",
    "size": 1234,
    "createdAt": "2026-11-25T03:25:00.000Z",
    "url": "/webgrp/images/img-example"
  }
]
```

`folderId` 缺省时返回全部图片；不存在的文件夹 ID 会按后端规则回退到默认文件夹。

### 7.7 上传图片

#### URL

```http
POST ${BASE_URL}/webgrp/images
```

#### Request

```json
{
  "name": "设备图标.png",
  "dataUrl": "data:image/png;base64,iVBORw0KGgo...",
  "folderId": "root"
}
```

#### Response `201`

返回新建的 `ImageAsset` 对象。

约束：图片请求体最大约 16 MB；`dataUrl` 必须是可解析的图片 Data URL。

### 7.8 获取图片二进制

#### URL

```http
GET ${BASE_URL}/webgrp/images/{imageId}
```

#### Request

无请求体。

#### Response `200`

```http
Content-Type: image/png | image/jpeg | image/webp | image/gif | image/svg+xml
```

响应体是图片原始字节，不是 JSON。

### 7.9 删除图片

#### URL

```http
DELETE ${BASE_URL}/webgrp/images/{imageId}
```

#### Request

无请求体。

#### Response `200`

```json
{
  "ok": true
}
```

### 7.10 从文档导入图片素材

#### URL

```http
POST ${BASE_URL}/webgrp/icon-library/import
```

#### Request

```json
{
  "name": "素材.docx",
  "dataUrl": "data:application/zip;base64,UEsDB...",
  "folderId": "root"
}
```

#### Response `201`

```json
{
  "ok": true,
  "assets": [],
  "skippedCount": 0
}
```

支持 DOCX、PPTX、XLSX、VSDX、WPS、DPS 和 ZIP；请求体最大约 128 MB。

### 7.11 导入图片库包

#### URL

```http
POST ${BASE_URL}/webgrp/image-library/import
```

#### Request

```json
{
  "folders": [
    { "id": "root", "name": "默认文件夹" }
  ],
  "assets": [
    {
      "id": "img-example",
      "name": "设备图标.svg",
      "folderId": "root",
      "dataUrl": "data:image/svg+xml;base64,PHN2Zy..."
    }
  ]
}
```

#### Response `200`

```json
{
  "ok": true,
  "importedCount": 1,
  "skippedCount": 0,
  "folders": [],
  "assets": []
}
```

## 8. 配置 API

### 8.1 配色配置

#### URL

```http
GET ${BASE_URL}/webgrp/color-config
PUT ${BASE_URL}/webgrp/color-config
```

#### GET Request

无请求体。

#### GET Response `200`

```json
{
  "exists": true,
  "colorDisplayMode": "voltage",
  "colorPalette": {
    "energy": {
      "ac": "#2563eb",
      "dc": "#0f766e",
      "h2": "#7c3aed",
      "heat": "#dc2626"
    },
    "voltage": {
      "0": "#64748b",
      "10": "#f97316",
      "35": "#a855f7",
      "110": "#ef4444",
      "220": "#b91c1c"
    }
  }
}
```

#### PUT Request

```json
{
  "colorDisplayMode": "energy",
  "colorPalette": {
    "energy": {
      "ac": "#2563eb",
      "dc": "#0f766e",
      "h2": "#7c3aed",
      "heat": "#dc2626"
    },
    "voltage": {}
  }
}
```

#### PUT Response `200`

```json
{
  "ok": true,
  "exists": true,
  "colorDisplayMode": "energy",
  "colorPalette": {}
}
```

### 8.2 图元库配置

#### URL

```http
GET ${BASE_URL}/webgrp/device-library
PUT ${BASE_URL}/webgrp/device-library
```

#### GET Response `200`

```json
{
  "exists": true,
  "schemaVersion": 6,
  "customDeviceTemplates": [],
  "customCategoryLibraries": [],
  "customComponentLibraries": [],
  "customGraphTemplateTypes": [],
  "customGraphTemplates": [],
  "deviceDefinitionOverrides": {},
  "deviceDefinitionSharedKeys": {
    "static-text": "shared:static-text"
  },
  "eDeviceDefinitionLabels": {},
  "eDeviceDefinitionClassExportEnabled": {},
  "eDeviceDefinitionFieldOrder": {},
  "eDeviceDefinitionTemplateFields": {},
  "eDeviceDefinitionTableIds": {}
}
```

`deviceDefinitionSharedKeys` 是 `kind -> shared key` 映射，实际实现应保留未知键，不要只实现固定的少数键。

版本兼容：`schemaVersion` 是迁移版本标记，不应把旧版本读取直接判为错误；实现方应先读取、归一化，再按自身当前版本写回。

#### PUT Request

请求体结构与 GET 返回对象相同。外部实现至少应接受以下字段并原样保留扩展字段：

```json
{
  "schemaVersion": 6,
  "customDeviceTemplates": [],
  "customCategoryLibraries": [],
  "customComponentLibraries": [],
  "customGraphTemplateTypes": [],
  "customGraphTemplates": [],
  "deviceDefinitionOverrides": {},
  "deviceDefinitionSharedKeys": {},
  "eDeviceDefinitionLabels": {},
  "eDeviceDefinitionClassExportEnabled": {},
  "eDeviceDefinitionFieldOrder": {},
  "eDeviceDefinitionTemplateFields": {},
  "eDeviceDefinitionTableIds": {}
}
```

#### PUT Response `200`

```json
{
  "ok": true,
  "schemaVersion": 6,
  "customDeviceTemplates": [],
  "customCategoryLibraries": [],
  "customComponentLibraries": [],
  "customGraphTemplateTypes": [],
  "customGraphTemplates": [],
  "deviceDefinitionOverrides": {},
  "deviceDefinitionSharedKeys": {},
  "eDeviceDefinitionLabels": {},
  "eDeviceDefinitionClassExportEnabled": {},
  "eDeviceDefinitionFieldOrder": {},
  "eDeviceDefinitionTemplateFields": {},
  "eDeviceDefinitionTableIds": {}
}
```

### 8.3 动态量测配置

#### URL

```http
GET ${BASE_URL}/webgrp/measurement-config
PUT ${BASE_URL}/webgrp/measurement-config
```

#### GET Response `200`

```json
{
  "exists": true,
  "groupDefaults": {
    "backgroundColor": "transparent",
    "borderColor": "#64748b",
    "borderStyle": "none",
    "borderWidth": 0
  },
  "measurementTypes": [
    {
      "id": "activePower",
      "key": "activePower",
      "name": "有功功率",
      "shortLabel": "P",
      "defaultUnit": "MW",
      "valueType": "float",
      "defaultDecimals": 2,
      "defaultColor": "#334155",
      "defaultFontFamily": "Arial",
      "defaultFontSize": 12,
      "defaultFontWeight": "400",
      "defaultVisible": true
    }
  ],
  "deviceProfiles": [
    {
      "deviceKind": "ac-load",
      "items": [
        { "measurementTypeId": "activePower" }
      ]
    }
  ]
}
```

#### PUT Request/Response

PUT 请求体是同一配置对象，响应为：

```json
{
  "ok": true,
  "exists": true,
  "groupDefaults": {},
  "measurementTypes": [],
  "deviceProfiles": []
}
```

### 8.4 Symbol 导出方案配置

#### URL

```http
GET ${BASE_URL}/webgrp/symbol-export-schemes
PUT ${BASE_URL}/webgrp/symbol-export-schemes
```

#### GET Response `200`

```json
{
  "schemes": [
    {
      "id": "scheme-id",
      "name": "默认 Symbol",
      "templateKinds": ["ac-load"],
      "filterKeys": [],
      "updatedAt": "2026-11-25T03:30:00.000Z"
    }
  ],
  "exists": true,
  "readError": null
}
```

读取失败时不能把 `readError` 静默当成空方案列表；应保持：

```json
{
  "schemes": [],
  "exists": false,
  "readError": {
    "code": "EACCES",
    "message": "..."
  }
}
```

#### PUT Request

```json
{
  "schemes": [
    {
      "id": "scheme-id",
      "name": "默认 Symbol",
      "templateKinds": ["ac-load"],
      "filterKeys": [],
      "updatedAt": "2026-11-25T03:30:00.000Z"
    }
  ]
}
```

#### PUT Response `200`

```json
{
  "ok": true,
  "schemes": []
}
```

## 9. 附加 API：全局线路

该接口不是空间/方案/图片/配置四类之一，但前端页面会使用，纳入兼容清单。

### 9.1 获取全局线路

#### URL

```http
GET ${BASE_URL}/webgrp/global-lines
```

#### Response `200`

```json
{
  "ok": true,
  "records": [
    {
      "id": "global-line-example",
      "idx": 3,
      "name": "主网-馈线",
      "energyType": "ac",
      "params": {
        "run_stat": "1",
        "vbase": "10",
        "rated_capacity": "100",
        "component_type": "ACBranch"
      },
      "references": [],
      "createdAt": "2026-08-21T17:40:15.549Z",
      "updatedAt": "2026-11-24T07:11:03.809Z",
      "endpointSlots": {},
      "terminalSlots": {},
      "degree": 2
    }
  ]
}
```

实现方应保留 `params`、`references`、`endpointSlots`、`terminalSlots` 中的未知字段，因为前端会直接使用这些结构做跨模型定位和一致性检查。

## 10. 共享图标静态资源

这两个 URL 不是 `/webgrp` API，但前端加载页面时会请求，外部页面实现如果要兼容图标选择器，也必须提供。

### 10.1 图标库目录

```http
GET ${BASE_URL}/app/icon-library/catalog.json
```

Response 顶层字段：

```json
{
  "name": "icon-library",
  "label": "SVG 图标资源总库",
  "generatedAt": "2026-06-23T06:31:13.774Z",
  "totalIcons": 7862,
  "libraries": [
    {
      "id": "open-source-svg",
      "label": "开源 SVG 综合图标库",
      "root": "/icon-library/open-source-svg",
      "totalIcons": 7862,
      "categories": [],
      "sources": []
    }
  ]
}
```

### 10.2 图标库 manifest

```http
GET ${BASE_URL}/app/icon-library/open-source-svg/manifest.json
```

Response 顶层字段：

```json
{
  "name": "open-source-svg",
  "label": "开源 SVG 综合图标库",
  "generatedAt": "2026-06-23T06:31:05.588Z",
  "root": "/icon-library/open-source-svg",
  "sourcePolicy": "...",
  "maxIconsPerSourceCategory": 16,
  "sources": [],
  "categories": [
    {
      "id": "security-compliance",
      "label": "安全合规",
      "description": "...",
      "icons": [
        {
          "id": "icon-id",
          "name": "图标名称",
          "file": "icon.svg",
          "sourceName": "Lucide",
          "sourceFile": "...",
          "sourcePackage": "lucide-static@1.21.0",
          "license": "ISC"
        }
      ]
    }
  ],
  "totalIcons": 7862,
  "mergedCompatibilityLibraries": []
}
```

## 11. 实现兼容性检查清单

### URL 和空间

- [ ] 所有内部接口保留 `/webgrp` 前缀；
- [ ] 支持 `gmp_space` Cookie；
- [ ] 非浏览器客户端支持 `X-Space` 或 `?space=`；
- [ ] `schemePath` 按“JSON 序列化后单次 URL 编码”处理；
- [ ] 路径参数和图片 ID 做 URL 编码。

### Request

- [ ] JSON 请求使用 `Content-Type: application/json`；
- [ ] 图片上传使用 Data URL，不能把裸 Base64 当成 Data URL；
- [ ] ZIP 导入使用原始二进制 body；
- [ ] 模型保存接受完整 `record.project`，不能只接受方案摘要；
- [ ] 图元库配置保留未知扩展字段。

### Response

- [ ] 内部 API 使用裸 JSON，不要强制套 `{ok:true,data}` v1 信封；
- [ ] 写接口通常返回 `{ok:true,...}`；
- [ ] 错误同时兼容 `{error:string}` 和 `{error:{code,message}}`；
- [ ] JSON GET 正确处理 ETag、304 和 gzip；
- [ ] 图片和 ZIP 返回正确的 `Content-Type`；
- [ ] 方案、模型、图片、配置字段保持大小写和嵌套结构不变。

### 兼容验证

建议实现后按以下顺序验证：

1. 先验证空间、方案、图片和配置的 GET 请求；
2. 再验证空间创建、改名、删除、导入导出；
3. 再验证方案/模型保存、删除、ZIP 导入导出；
4. 再验证图片上传、删除、文件夹管理和图片库导入；
5. 最后验证配置写入后的重新读取结果与写入前端结构一致。

## 12. 实现边界

- 本文档描述的是外部可观察的 URL、Request、Response 和错误行为，不要求复刻当前 Node.js 文件布局。
- 浏览器主应用使用 `gmp_space` Cookie；非浏览器客户端建议显式传 `X-Space` 或 `?space=`。
- 接口实现应以源码和后端路由的字段语义为准，允许响应中保留向后兼容的扩展字段。
- 本文档是兼容性契约，不要求自有实现复刻当前 Node.js 文件布局；只要求外部可观察的 URL、Request、Response 和错误行为兼容。
