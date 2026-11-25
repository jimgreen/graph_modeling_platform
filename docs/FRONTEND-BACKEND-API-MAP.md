# 前端页面后端 API 调用清单

> 对外实现接口时，优先使用配套的 [前端内部 API 接口契约](./FRONTEND-INTERNAL-API-CONTRACT.md)。本文件保留完整调用链分析；契约文档提供规范化的 URL、Request、Response 示例，并纳入 Chrome DevTools HAR 的实际请求。

> 盘点日期：2026-11-24<br>
> 适用范围：主应用 `src/`、独立接入示例 `examples/webgrp-integration-demo/frontend/src/`。<br>
> 目标：列出当前前端页面实际会发起的 HTTP/HTTPS、WebSocket 和静态资源请求，并标明对应的页面功能与后端处理位置。

## 1. 结论先看

### 1.1 API 前缀和部署方式

- 主应用所有后端 API 通过 `src/config.ts:4-18` 的 `apiPath()` 拼接。
- 默认前缀是 `/webgrp`；Vite 通过 `__API_PREFIX__` 注入，可由 `GRAPH_MODEL_API_PREFIX` 或平台配置覆盖。
- 默认开发代理在 `vite.config.ts:49-60`：把 `/webgrp` 和其 WebSocket 升级请求代理到后端 `5174`。
- 前端部署到子路径时，非 API 静态资源使用 `frontendPath()`；API 前缀不自动附加前端 base。
- 主应用空间请求只依赖 `gmp_space` Cookie，不主动发送 `X-Space`，见 `src/spaceClient.ts:1-3`、`src/spaceClient.ts:36-49`。

### 1.2 主应用网络入口的分类

| 类别 | 作用 | 主应用是否主动调用 |
|---|---|---:|
| 内部空间/方案/图片/配置 API | 页面数据加载、保存、导入、导出和设置同步 | 是 |
| `/webgrp/v1/schemes/model/export` | 已保存模型的 E、SVG、JSON、CIM/XML 导出 | 是，GET |
| `/webgrp/v1/schemes/model/send` | 把已保存模型按格式发送到用户填写的目标 URL | 是，POST |
| `/webgrp/ws` | 页面注册、心跳、运行时态回传、控制指令回传 | 是，WebSocket |
| `/webgrp/v1/runtime/*` | 第三方读取页面运行时态；后端通过 `/webgrp/ws` 向页面发 fetch | 页面不直接发 HTTP；页面被动响应 |
| `/webgrp/v1/control/*` | 第三方控制页面；后端通过 `/webgrp/ws` 向页面发 command | 页面不直接发 HTTP；页面被动响应 |
| `/webgrp/v1/subscriptions/ws` | 模型更新订阅服务 | 主应用不直接连接；示例前端通过 FastAPI 桥接 |
| `/e-templates/*`、`/icon-library/*` | 预定义 E 模板和共享图标库静态资源 | 是，但不属于 `/webgrp` API |

### 1.3 主应用未主动调用的后端接口

服务端存在但主应用页面没有直接请求的接口包括：

- `GET /webgrp/v1/models/export` 批量模型导出；
- `GET /webgrp/v1/spaces/export-artifacts` 空间派生 E/SVG 归档；
- `POST /webgrp/v1/schemes/model/export?format=e-file` 自定义 E 模板正文导出；主应用当前导出按钮使用 GET 入口；
- `GET /webgrp/v1/library` 统一图元库只读入口；
- `GET /webgrp/v1/runtime/clients|model|devices|selection|tabs|tabs/{tab}|screenshot|dom`；
- `GET /webgrp/v1/runtime/export` 运行时 SVG/E 导出；
- `POST /webgrp/v1/topology`；
- `POST /webgrp/v1/control/*` 全部控制台写操作；
- `WS /webgrp/v1/subscriptions/ws` 模型更新订阅；
- `POST /webgrp/platform/data-dir` 数据根迁移；
- `POST /webgrp/mcp` MCP；
- `POST|GET|DELETE /webgrp/v1/receive` 联调接收端；
- `POST /webgrp/global-lines/attach`、`/detach`、`PUT /webgrp/global-lines/record`、`POST /webgrp/global-lines/sync-project`。

其中全局线路的最终登记同步由后端保存模型时完成：`server/server.mjs:4312-4360` 的 `saveSchemeProjectRecordUnlocked()` 调用注册表 `syncProject()`。页面并不直接调用 attach/detach 接口。

## 2. 主应用：空间管理

空间客户端统一封装在 `src/spaceClient.ts`，页面入口主要在 `src/appStartup.ts`、`src/AppStartupRoot.tsx`、`src/appExtracted/appTopbar.tsx`。

| 页面功能 | 请求 | 触发时机/调用点 | 后端落点 |
|---|---|---|---|
| 启动闸门读取空间列表 | `GET /webgrp/spaces` | 独立入口 `main.tsx:11-29` 调 `runStartupGate()`；`appStartup.ts:35-55` 调 `fetchSpaces()` | `server/server.mjs:5907-5918` |
| App 挂载后刷新空间列表 | `GET /webgrp/spaces` | `src/App.tsx:1676-1685` 的 `refreshSpaces()`；`src/App.tsx:1704` 的挂载 effect | 同上；启动闸门留下的一次性 seed 可能被首次消费 |
| 首次创建默认空间 | `POST /webgrp/spaces/initialize`，JSON `{name, owner?}` | 首次启动弹窗 `src/AppStartupRoot.tsx:23-34` | `server/server.mjs:5920-5940` |
| 新建空间并切换 | `POST /webgrp/spaces`，JSON `{name, owner?}` | 顶栏 `createSpaceThenSwitch()`，`src/appExtracted/appTopbar.tsx:324-326` | `server/server.mjs:5942-5970` |
| 重命名当前空间 | `PUT /webgrp/spaces`，JSON `{id,name}` | `renameCurrentSpace()`，`src/appExtracted/appTopbar.tsx:462-479` | `server/server.mjs:5972-5989` |
| 删除当前空间 | `DELETE /webgrp/spaces`，JSON `{id}` | `deleteCurrentSpace()`，`src/appExtracted/appTopbar.tsx:480-511` | `server/server.mjs:5991-6017` |
| 导出当前空间 ZIP | `GET /webgrp/spaces/export`，二进制 ZIP | 顶栏 `exportCurrentSpace()`，`src/appExtracted/appTopbar.tsx:339-375`；底层 `spaceClient.ts:110-119` | `server/server.mjs:6019-6027` |
| 导入空间 ZIP | `POST /webgrp/spaces/import[?mode=overwrite|rename&name=...]`，请求体为 ZIP | 顶栏文件选择后 `importSpaceArchiveFromFile()`，`src/appExtracted/appTopbar.tsx:408-449`；底层 `spaceClient.ts:146-187` | `server/server.mjs:6029-6034` |

空间请求的共同特征：

- 当前空间由后端解析 Cookie 得出，前端不在这些请求上加 `X-Space`。
- 导入重名时，前端根据 409 `SPACE_NAME_DUPLICATE` 弹出覆盖/改名选择，再重发导入。
- 空间导出/导入和方案导出共用 `saveLazyBlobFile()`，本机开发环境可能继续调用原生保存 API，见第 8 节。

## 3. 主应用：方案树和模型持久化

主要封装在 `src/appExtracted/appPersistenceLibraryExport.tsx:328-453`，页面装配和调用分散在 `appToolbarHookFactories.tsx`、`appProjectCanvasFactories.tsx`、`appGraphMeasurementFactories.tsx`、`appDeviceDefinitionFactories.tsx`。

### 3.1 读取

| 页面功能 | 请求 | 调用点 | 后端落点 |
|---|---|---|---|
| 启动加载方案树和模型摘要 | `GET /webgrp/schemes` | `fetchBackendSchemes()`，`appPersistenceLibraryExport.tsx:328-337`；挂载 effect `appToolbarHookFactories.tsx:2699-2839` | `server/server.mjs:6079-6082` |
| 网络恢复后重试方案树 | `GET /webgrp/schemes` | 同一 `createAppHookCallback77()` 注册 `online` 监听并重试 | 同上 |
| 读取完整模型 | `GET /webgrp/schemes/project?schemePath=...&name=...` 或用 `schemeId` | `fetchBackendProjectRecord()`，`appPersistenceLibraryExport.tsx:345-355`；模型打开、背景页、全网拓扑补全模型均调用 | `server/server.mjs:6093-6096` |
| 背景页模型摘要补全 | 同上 | `appToolbarHookFactories.tsx:4612-4645` 的 `createAppHookCallback140()` | 同上 |
| 全网拓扑按需加载完整模型 | 同上 | `AllNetworkTopologyDialog.tsx:190-207` 的 `loadFullModel()` | 同上 |

### 3.2 方案/模型写入与删除

| 页面功能 | 请求 | 前端调用点 | 说明 |
|---|---|---|---|
| 保存当前模型 | `PUT /webgrp/schemes/project` | `saveBackendProjectRecord()`，`appPersistenceLibraryExport.tsx:411-428`；`saveCurrentProject()`、拖拽/复制/移动/粘贴/重命名等最终都会走它 | 请求体含 `schemePath`、可选 `schemeId`、`previousName`、`record` |
| 删除模型 | `DELETE /webgrp/schemes/project` | `deleteBackendProjectRecord()`，`appPersistenceLibraryExport.tsx:430-436`；模型树删除、批量删除、覆盖移动等 | 后端同时 detach 全局线路并归档旧文件 |
| 保存/移动/重命名方案 | `PUT /webgrp/schemes/scheme` | `saveBackendSchemeRecord()`，`appPersistenceLibraryExport.tsx:438-444`；`appProjectCanvasFactories.tsx` 的方案创建、重命名、移动、复制、粘贴 | 请求体含新路径、旧路径、可选 `schemeId` |
| 删除方案 | `DELETE /webgrp/schemes/scheme` | `deleteBackendSchemeRecord()`，`appPersistenceLibraryExport.tsx:446-452`；方案树删除/批量删除 | 方案树变更后的持久化入口 |
| 方案树 ZIP 导出 | `GET /webgrp/schemes/export?schemePath=...` 或 `schemeId=...` | `downloadBackendSchemeArchive()`，`appPersistenceLibraryExport.tsx:357-381`；方案树导出按钮 `appDeviceDefinitionFactories.tsx:3726` 附近 | 二进制 ZIP，派生 E/SVG 在后端按需生成 |
| 方案树 ZIP 导入 | `POST /webgrp/schemes/import?parentPath=...&fileName=...&mode=check|overwrite&targetName=...` | `uploadBackendSchemeArchive()`，`appPersistenceLibraryExport.tsx:383-409`；方案导入对话框 `appDeviceDefinitionFactories.tsx:3326`、`3609` | 409 冲突时前端显示覆盖/重命名决策 |

### 3.3 方案树自动同步行为

- 方案树 state 变化后，`appRenderBatch.tsx:581-585` 注册的 `createAppHookCallback81()` 负责持久化记账；实际写入通过 `saveSchemeTreeToBackend()`、`persistSchemeTreeToBackend()` 等装配函数完成。
- 模型保存会先把前端实时态归一化为后端存储形状，见 `normalizeProjectForBackend()`，并把图片 data URL 转成 `/webgrp/images/{id}` 引用，见 `appPersistenceLibraryExport.tsx:170-220`。
- 方案/模型保存成功后，后端还会触发模型更新订阅服务；这属于服务端副作用，不是前端再发一条订阅请求。

## 4. 主应用：图片、图标和素材库

通用包装在 `src/appExtracted/appCoreCanvasUtilities.tsx:3837-3892`，页面装配在 `appRenderBatch.tsx:588-607`，具体交互主要在 `appDeviceDefinitionFactories.tsx`。

### 4.1 图片文件夹和图片资源

| 页面功能 | 请求 | 前端调用点 |
|---|---|---|
| 读取文件夹列表 | `GET /webgrp/image-folders` | `fetchBackendImageFolders()`；图片选择器首次打开/切文件夹 |
| 新建文件夹 | `POST /webgrp/image-folders`，JSON `{name}` | `createCreateImageFolder()`，`appDeviceDefinitionFactories.tsx:4173-4190` |
| 重命名文件夹 | `PUT /webgrp/image-folders/{folderId}`，JSON `{name}` | `createRenameImageFolder()`，`appDeviceDefinitionFactories.tsx:4195-4217` |
| 删除文件夹 | `DELETE /webgrp/image-folders/{folderId}` | `createDeleteImageFolder()`，`appDeviceDefinitionFactories.tsx:4221-4238` |
| 按文件夹读取图片 | `GET /webgrp/images?folderId=...` | `refreshImagesForFolder()`，`appRenderBatch.tsx:597-607` |
| 读取全部图片 | `GET /webgrp/images` | `fetchAllBackendImages()`；用户定制快照、SVG 导出图片补全、素材包导出 |
| 上传图片 | `POST /webgrp/images`，JSON `{name,dataUrl,folderId}` | 普通图片上传、背景图、前景图、状态图、定义图标、状态图绘制，均复用 `uploadBackendImage()` |
| 删除图片 | `DELETE /webgrp/images/{id}` | 图片右键菜单 `deleteImageAssetFromContextMenu()`，`appRenderBatch.tsx:608-642` |
| 读取图片二进制 | `GET /webgrp/images/{id}` | `fetchBackendImageDataUrl()`，`appPersistenceLibraryExport.tsx:3179-3187`；用于 SVG 自包含导出、用户定制快照、状态图编辑 |

上传失败时，前端可能把 data URL 留在浏览器本地作为降级资源；这不会新增后端请求。

### 4.2 文档图标提取和图标库包导入

| 页面功能 | 请求 | 前端调用点 |
|---|---|---|
| 从 DOCX/PPTX/XLSX/ZIP 等文档提取图片 | `POST /webgrp/icon-library/import` | `createChooseImage()`，`appDeviceDefinitionFactories.tsx:3789-3855`；调用 `importBackendIconLibraryFile()` |
| 导入用户定制图标库包 | `POST /webgrp/image-library/import` | `applyImportedIconLibrary()`，`appRenderBatch.tsx:1300-1305`；调用 `importBackendImageLibraryPayload()` |

### 4.3 图片 URL 只是模型引用，不等于一次 fetch

以下逻辑会把模型中的 data URL 归一为 `/webgrp/images/{id}`：

- 画布背景：`appPersistenceLibraryExport.tsx:181`；
- 节点背景/前景：`appPersistenceLibraryExport.tsx:213-216`；
- SVG 导出图片引用：`src/export/svg-images.ts:45`；
- 状态图绘制和用户定制快照：`src/stateIconDrawing.tsx`、`src/userCustomizations.ts`。

真正读取二进制的是浏览器渲染器或 `fetchBackendImageDataUrl()`，两者都依赖后端图片端点。

## 5. 主应用：配色、图元库、量测和导出方案配置

### 5.1 配色配置

| 功能 | 请求 | 调用点 |
|---|---|---|
| 启动读取配色 | `GET /webgrp/color-config` | `appToolbarHookFactories.tsx:2848-2874` 的 `createAppHookCallback78()` |
| 首次把本地配色写入后端 | `PUT /webgrp/color-config` | 后端不存在配置时由同一启动 effect 调用 |
| 编辑配色后自动保存 | `PUT /webgrp/color-config` | `createAppHookCallback83()`，`appToolbarHookFactories.tsx:3025-3055`，300ms 防抖 |
| 用户定制快照恢复 | `PUT /webgrp/color-config` | `appUserCustomizationFactories.tsx:102-105` |

### 5.2 图元库和模板库

| 功能 | 请求 | 调用点 |
|---|---|---|
| 启动读取图元库 | `GET /webgrp/device-library` | `appToolbarHookFactories.tsx:2878-2925` 的 `createAppHookCallback79()` |
| 首次把本地图元库写入后端 | `PUT /webgrp/device-library` | 后端不存在配置时由同一启动 effect 调用 |
| 图元/模板/定义编辑自动保存 | `PUT /webgrp/device-library` | `createAppHookCallback82()`、`appSelectionDragFactories.tsx:357-395`、自定义设备保存工厂 |
| 后端 schema 迁移回写 | `PUT /webgrp/device-library` | 读取后发现 `needsPersistenceMigration` 时回写归一化载荷 |
| 用户定制快照恢复 | `PUT /webgrp/device-library` | `appUserCustomizationFactories.tsx:102` |

该接口承载的内容包括：自定义图元模板、分类库、组件库、图元定义覆盖、E 文件定义标签/字段顺序、图模板类型和图模板。

### 5.3 动态量测配置

| 功能 | 请求 | 调用点 |
|---|---|---|
| 启动读取量测配置 | `GET /webgrp/measurement-config` | `appToolbarHookFactories.tsx:2932-2955` 的 `createAppHookCallback80()` |
| 首次把本地量测配置写入后端 | `PUT /webgrp/measurement-config` | 后端不存在配置时由同一启动 effect 调用 |
| 量测配置对话框保存 | `PUT /webgrp/measurement-config` | `appGraphMeasurementFactories.tsx:4231-4260`；`appRenderBatch.tsx:1258` |
| 用户定制快照恢复 | `PUT /webgrp/measurement-config` | `appUserCustomizationFactories.tsx:103` |

### 5.4 图元 Symbol 导出方案和导出文件

| 功能 | 请求 | 调用点 |
|---|---|---|
| 读取已保存 Symbol 方案 | `GET /webgrp/symbol-export-schemes` | `appSymbolExportFactories.tsx:199-225` |
| 保存/删除 Symbol 方案 | `PUT /webgrp/symbol-export-schemes` | `appSymbolExportFactories.tsx:228-318`；删除也是写入删除后的完整列表 |
| 合成 Symbol SVG 导出 | `POST /webgrp/symbol-export`，JSON `{kinds}` | `requestBackendSymbolExport()`，`appPersistenceLibraryExport.tsx:577-594`；UI 工厂 `appSymbolExportFactories.tsx:65-130` |
| 独立 SVG/ZIP 导出 | `POST /webgrp/symbol-export-standalone`，JSON `{kinds}` | `requestBackendStandaloneSymbolExport()`，`appPersistenceLibraryExport.tsx:643-672`；UI 工厂 `appSymbolExportFactories.tsx:140-198` |

## 6. 主应用：全局线路和全网拓扑

### 6.1 全局线路列表

| 功能 | 请求 | 调用点 |
|---|---|---|
| 当前模型初始化全局线路状态 | `GET /webgrp/global-lines` | `useGlobalLines()` 的 `loadRecords()`，`src/hooks/useGlobalLines.tsx:174-183`；hook effect 在模型标识变化时执行 |
| 放置/切换全局线路时刷新候选 | `GET /webgrp/global-lines` | `requestGlobalLinePlacement()`、`requestExistingNodeGlobalLinePlacement()` 内再次调用 `loadRecords()` |
| 全网拓扑对话框读取线路表 | `GET /webgrp/global-lines` | `AllNetworkTopologyDialog.tsx:212-221` |
| 删除两端均为空的记录 | `DELETE /webgrp/global-lines/record`，JSON `{id}` | `AllNetworkTopologyDialog.tsx:1015-1050` |

### 6.2 线路保存边界

前端放置/编辑全局线路首先修改当前模型节点，再由模型保存接口持久化：

1. `useGlobalLines()` 负责读取记录、候选计算和节点上的 `_globalLineId` 等参数；
2. `saveBackendProjectRecord()` 发送 `PUT /webgrp/schemes/project`；
3. 后端 `saveSchemeProjectRecordUnlocked()` 调用 `registryFor(paths).syncProject()`，同步全局线路注册表；
4. 页面没有直接调用 `/global-lines/attach`、`/detach`、`PUT /global-lines/record`。

## 7. 主应用：模型导出和模型发送

### 7.1 已保存模型导出

所有格式导出前都会经过 `ensureSavedBeforeExport()`，因为后端读取的是已保存模型，而不是浏览器内存中的实时草稿。

| 页面功能 | 请求 | 前端实现 |
|---|---|---|
| E 文件导出 | `GET /webgrp/v1/schemes/model/export?format=e-file&schemePath=...&name=...&encoding=...&template=...` | `fetchBackendModelEFile()`，`appDeviceDefinitionFactories.tsx:2596-2618` |
| SVG 导出 | `GET /webgrp/v1/schemes/model/export?format=svg&schemePath=...&name=...&colorMode=voltage&encoding=...` | `fetchBackendModelSvgText()`，`appDeviceDefinitionFactories.tsx:2620-2638` |
| JSON 导出 | `GET /webgrp/v1/schemes/model/export?format=json&schemePath=...&name=...` | `fetchBackendModelJsonText()`，`appDeviceDefinitionFactories.tsx:2641-2657` |
| CIM/XML 导出 | `GET /webgrp/v1/schemes/model/export?format=cim-xml&schemePath=...&name=...&modelId=...` | `createCimExport()`，`src/cim/cim-export.ts:111-132`；菜单装配在 `appRenderBatch.tsx:2326-2337` |

后端统一入口在 `server/apiV1ModelExport.mjs:1-86`，GET 按 `format` 分派到 JSON、SVG、E 文件和 CIM/XML 生成器。前端按响应类型读取：E/SVG 读取字节并按请求编码解码，JSON 读取 v1 信封中的 `data.project`，CIM/XML读取文本。

### 7.2 发送模型到外部接收端

- 页面功能：顶栏“发送模型”对话框。
- 请求：`POST /webgrp/v1/schemes/model/send?modelId=...`；模型尚无稳定 `idx` 时回退为 `schemePath + name`。
- 请求体：`{url, files:[{kind,encoding}], templateName?}`。
- 前端调用点：`src/SendModelDialog.tsx:151-171` 组装，`src/SendModelDialog.tsx:241-274` 发送。
- 后端落点：`server/apiV1Schemes.mjs:300-303` 注册，实际转发由 `server/sendModel.mjs` 完成。
- 这是主应用唯一一个会把模型数据主动发送到调用方提供的外部 URL 的页面功能。

## 8. 主应用：本机原生保存和文件查看

普通浏览器下载不经过后端；只有本机开发环境、用户选择原生另存为且 `preferNativeDialog=true` 时，`src/fileIO.ts` 才请求以下接口。

| 功能 | 请求 | 调用点 | 说明 |
|---|---|---|---|
| 打开系统另存为对话框 | `POST /webgrp/exports/native/select-file` | `fileIO.ts:185-218` | 请求文件名、扩展名、初始目录；后端弹 Windows 原生选择器并返回 token |
| 把字节写入选定文件 | `POST /webgrp/exports/native/write-text?token=...` | `fileIO.ts:246-278` | body 是文件字节，content-type 按导出格式设置 |
| 用系统默认程序打开已导出文件 | `POST /webgrp/exports/native/open-file?token=...` | `fileIO.ts:122-143` | 只有后端签发的 token 有效 |

这些接口被 E/SVG/JSON/CIM、方案 ZIP、空间 ZIP、库文件、Symbol 文件等多个导出功能间接复用。原生服务不可用时，前端回退到浏览器下载，不会再请求其它后端 API。

## 9. 主应用：运行时 WebSocket 桥

### 9.1 连接和生命周期

- 连接地址由 `src/runtimeWsClient.ts:132-151` 解析：
  - qiankun 下优先把宿主 `apiBaseUrl` 的 `http(s)` 转成 `ws(s)`；
  - 开发环境直连 `VITE_IMAGE_SERVER_PORT`（默认 5174）；
  - 生产环境同源连接。
- 实际路径是 `WS /webgrp/ws`，连接创建在 `runtimeWsClient.ts:229`。
- `onopen` 发送 `{type:"register", clientId}`；随后每 15 秒发送 ping；断线后 3 秒自动重连。
- `clientId` 是地址栏 `?token=`；没有时由前端生成并写回地址栏，见 `runtimeToken.ts` 和 `runtimeWsClient.ts:31-74`。
- App 在 `src/App.tsx:1925-1984` 创建客户端并绑定 `fetchHandler`、`commandHandler`。

### 9.2 后端向页面请求运行时态，页面回传结果

后端 `/webgrp/v1/runtime/*` 并不被页面用 `fetch()` 直接访问，而是由 `server/apiV1Runtime.mjs` 调 `fetchFromClient()`，通过 `/webgrp/ws` 发 `type:"fetch"` 消息；前端收到后调用 `runtimeSnapshot.ts` 或 `runtimeScreenshot.ts`，再发 `fetch-response`。

| WebSocket resource | 页面返回内容 | 前端处理 |
|---|---|---|
| `runtime.model` | 当前模型名、稳定模型 ID、schemeId、schemePath、更新时间 | `runtimeSnapshot.ts:110-137` |
| `runtime.devices` | 当前模型 nodes/edges | `runtimeSnapshot.ts:139-154` |
| `runtime.selection` | selectedNodeIds 和当前选中节点摘要 | `runtimeSnapshot.ts:156-178` |
| `runtime.tab` | `model/tree/graph` 单 tab 数据 | `runtimeSnapshot.ts:302-352` |
| `runtime.snapshot` | model/devices/selection/三 tab 聚合 | `runtimeSnapshot.ts:354-387` |
| `runtime.svg` | 当前内存模型的自包含 SVG | `runtimeSnapshot.ts:389-431` |
| `runtime.e-file` | 当前内存模型的 E 文件文本，可带模板数据 | `runtimeSnapshot.ts:433-555` |
| `runtime.dom` | 页面 DOM outline 或 HTML | `runtimeSnapshot.ts:557-648`、`runtimeDom.ts` |
| `runtime.screenshot` | SVG 转 PNG 的 base64 | `src/runtimeScreenshot.ts`；App 中单独分派 |

因此，第三方调用 `/webgrp/v1/runtime/*` 时会读取当前浏览器页面的实时状态，但这不是浏览器页面主动调用那些 HTTP URL。

### 9.3 后端向页面发送控制 command

`src/App.tsx:1937-1965` 把 WebSocket `command.name` 分发到 `__appScope`。当前页面支持：

| command | 页面功能 |
|---|---|
| `control.scheme.create` | 新建方案 |
| `control.model.create` | 新建模型 |
| `control.devices.select` | 选择图元 |
| `control.devices.group` | 组合选中图元 |
| `control.template.saveFromSelection` | 从选中组合保存模板 |
| `control.device.property.update` | 修改图元属性 |
| `control.device.add` | 新增图元 |
| `control.device.delete` | 删除图元 |
| `control.save` | 保存当前模型或方案树 |
| `control.e-device-definition.export` | 导出 E 文件定义 |
| `control.e-device-definition.import` | 导入 E 文件定义并返回匹配结果 |
| `control.space.switch` | 切换空间 |
| `control.model.switch` | 切换模型 |
| `topology.check` | 当前内存模型拓扑检查 |
| `topology.repair` | 当前内存模型拓扑修复 |

页面执行后通过同一 WebSocket 发送 `command-response`。这些 command 是后端/MCP 调用页面，不是页面对后端发起的 REST 请求；其中 `control.save` 执行后才会调用第 3 节的方案/模型保存 API。

## 10. 主应用：纯静态资源请求，不应与 API 混淆

### 10.1 预定义 E 模板

- 页面加载预定义模板时直接请求 `GET /e-templates/{templateFile}`，见 `src/appExtracted/appView.tsx:872-895`。
- 文件实际位于 `public/e-templates/`，由 Vite/后端静态托管；服务端模板适配层在 `server/eFileTemplates.mjs`。
- 这不是 `/webgrp` API，也不返回 v1 信封。

### 10.2 共享图标库

- 图标目录：`GET {frontendBase}/icon-library/catalog.json`；`src/iconLibraryCatalog.ts:3`、`332-353`。
- 单个库清单：`GET {frontendBase}/icon-library/{library}/manifest.json`；`src/iconLibraryCatalog.ts:355-374`。
- 图标 SVG：清单中的 `url` 被 `fetch()` 读取或直接作为图片 URL，见 `appDeviceDefinitionFactories.tsx:4031-4075`。
- 图标库加载在 `appRenderBatch.tsx:672-739`，打开图标选择器时按需加载并缓存。
- Vite 对子路径图标库配置了静态代理，见 `vite.config.ts:49-60`。

## 11. 独立接入示例前端

示例目录：`examples/webgrp-integration-demo/frontend/src/`。它不是主应用页面，而是一个 FastAPI 桥接工作台。浏览器先请求示例自己的 `/api/*`，FastAPI 再请求主应用后端 `/webgrp/*`。

### 11.1 示例前端主动请求

| 示例页面/功能 | 浏览器请求 | FastAPI 上游 |
|---|---|---|
| App 启动读取配置 | `GET /api/config` | 读取示例运行配置，不转发到 webgrp；`frontend/src/composables/useDemoApi.ts:23-31` |
| HTTP“方案树” | `GET /api/webgrp/schemes` | `GET /webgrp/v1/schemes?view=summary` |
| HTTP“图元库” | `GET /api/webgrp/library` | `GET /webgrp/v1/library?part=all` |
| HTTP“在线客户端” | `GET /api/webgrp/runtime/clients` | `GET /webgrp/v1/runtime/clients` |
| HTTP“模型导出” | `GET /api/webgrp/models/export?...` | `GET /webgrp/v1/models/export?...` |
| HTTP“发送到接收器” | `POST /api/webgrp/send` | `POST /webgrp/v1/schemes/model/send` |
| 发送后查看接收结果 | `GET /api/receive` | 示例 FastAPI 内存接收器，不是主应用 API |
| 清空接收结果 | `DELETE /api/receive` | 示例 FastAPI 内存接收器 |

调用实现：`frontend/src/composables/useDemoApi.ts:34-64`、`frontend/src/components/HttpExplorer.vue:23-61`。HTTP Explorer 的五个 tab 完整定义在 `HttpExplorer.vue:23-27`。

### 11.2 示例 WebSocket 页面

- 浏览器连接 `WS /api/ws?space=...`，见 `frontend/src/components/WebsocketMonitor.vue:20-32`。
- 浏览器发送 `subscribe` / `unsubscribe` JSON 帧，接收 `subscribed`、`unsubscribed`、`model.updated`、`error` 等原始事件。
- FastAPI `main.py:241-281` 把浏览器 WebSocket 双向桥接到主应用 `WS /webgrp/v1/subscriptions/ws?space=...`。
- 示例桥不自动重连；页面明确要求恢复连接后重新订阅，并通过 HTTP 重新读取快照。

### 11.3 示例嵌入页面和配方页

- `EmbedPanel.vue:194` 的 iframe 直接加载 FastAPI 配置返回的 `webgrp.frontendUrl`。
- qiankun 模式通过 `loadMicroApp()` 挂载主应用，并传入 `apiBaseUrl`、`user`、`project`，见 `EmbedPanel.vue:82-111`；主应用随后按 `qiankunLifecycle.tsx` 的启动链路访问自己的 `/webgrp` API。
- `RecipePanel.vue` 只生成可复制的 iframe、HTTP、WebSocket 和恢复快照代码片段，不主动发请求。

## 12. 后端路由对照表

用于复核本清单的服务端注册位置：

| 后端区域 | 注册/处理文件 |
|---|---|
| 内部空间/图片/方案/配置/全局线路/原生保存 | `server/server.mjs:5907-6163` |
| v1 方案读取、方案 ZIP、发送模型 | `server/apiV1Schemes.mjs`、`server/apiV1ModelExport.mjs` |
| v1 运行时态 | `server/apiV1Runtime.mjs:56-297` |
| v1 图元库只读入口 | `server/apiV1Library.mjs:128-197` |
| v1 控制台写操作 | `server/apiV1Control.mjs:62-438` |
| `/webgrp/ws` 运行时桥 | `server/runtimeWs.mjs:54-62` |
| Swagger/Swigger 接口目录 | `server/swaggerPage.mjs:28-369` |
| 示例 FastAPI API/WS | `examples/webgrp-integration-demo/backend/app/main.py:81-281` |

## 13. 完整性检查

本次盘点采用以下检索并交叉核对：

1. 在 `src/` 和示例前端排查 `fetch(`、`new WebSocket(`、`apiPath(`、`frontendPath(`、`/webgrp/`、`/e-templates/`、图标库加载函数。
2. 追踪所有后端包装函数：`fetchBackend*`、`saveBackend*`、`deleteBackend*`、`uploadBackend*`、`importBackend*`。
3. 对照 `server/server.mjs`、`server/apiV1*.mjs`、`server/runtimeWs.mjs` 和示例 `main.py` 的路由注册。
4. 额外检查了 `axios`、`XMLHttpRequest`、`EventSource`、`navigator.sendBeacon`、`window.open` 等替代请求方式；主应用未发现这些方式用于后端 API 调用。
5. 将“页面主动发 HTTP”“页面主动建立 WS”“后端通过页面 WS 反向取数/发指令”“静态资源请求”分开，避免把后端存在但页面未调用的接口误算为前端功能。

### 最终判定

- 主应用主动调用的接口集中在：空间、方案/模型、图片/图标、配色、图元库、量测、Symbol 导出、全局线路、单模型导出、模型发送、原生文件保存和 `/webgrp/ws`。
- 主应用的运行时态和控制台能力是“后端通过 `/webgrp/ws` 调页面”，不是前端直接 `fetch /webgrp/v1/runtime/*` 或 `/webgrp/v1/control/*`。
- 独立示例前端额外调用 FastAPI `/api/*`，并由 FastAPI 代理/桥接到主应用的 v1 API 和模型更新订阅通道。
