<!-- Parent: ../CLAUDE.md -->
<!-- Generated: 2026-10-23 -->

# 架构与功能索引

本文件是**查阅型**资料：功能清单、符号映射、架构风格。开工前不需要通读，按关键词跳转即可。
**执行型**约束（改动分档、检索规则、测试要求、命令）在 `../AGENTS.md` 与 `../CLAUDE.md`。

## 概述

React 19 + Vite 7 + TypeScript 的前端图形建模平台，支持电力/氢能/热力系统的拓扑建模和 E 格式导出。后端 Node.js（.mjs ESM）提供图像/方案/配置数据服务，并经 WebSocket 桥接前端运行时态供第三方 `/api/v1` 只读 API 消费。

## 功能清单

### 画布与图形

- 拓扑画布：节点/边/连接/选择/拖拽/缩放/视口
- 图层管理：显隐、排序、锁定
- 背景页：多页背景渲染、页切换
- 对齐工具：节点对齐分布
- 小地图/浮动工具栏
- 画布 LOD（细节层次）与视口批处理
- 键盘快捷键、侧栏显隐
- ReactFlow 预览适配器（reactFlowAdapter + ReactFlowPreview）
- 端子锚点交互（terminalAnchor）
- 设备图元渲染（DeviceGlyph）与状态图标绘制（stateIconDrawing）
- 连线分段母线调整策略（lineSegmentBusResizePolicy）

### 设备与图元库

- 设备类型定义（DeviceKind）：内置 + 自定义元件
- 图元分类树、设备库、量测库、模板库
- 自定义元件编辑器：参数表、枚举值、中英文表头
- 自定义元件模板、图元模板
- 派生设备类（风电/光伏/储能等）动态库名
- 设备定义覆盖（override）机制与定义-实例同步（definitionInstanceSync）
- 图元库面板树拖动排序：一二级菜单行首把手拖拽重排，顺序为本机 UI 偏好（libraryTreeOrder）
- 模型库方案树拖动排序：**只有行首把手可拖**（行本体 draggable=false）；把手拖动 = 同层重排（顺序为本机偏好 libraryTreeOrder.projectSchemes / projectModels，不写回后端）；跨层级移动落库 —— 目标行上半区=成为其子方案、下半区=成为其后继兄弟、列表空白=移到顶层末尾（虚线/浅蓝底指示）
- 方案移动带插入位（moveSavedSchemeToPosition）：支持移到根层与插到指定兄弟之前，供面板跨层级拖动用
- 组件库定义与元数据（componentLibraryDefinitions / componentLibraryMetadata）
- 共享图标库管理：图标库目录、完整性审计（iconLibraryCatalog / iconLibraryIntegrity / sharedIconLibrary）
- 最近使用图元快选（顶栏）

### 方案与模型

- 方案树：多级方案/子方案层级
- 模型 CRUD：创建/重命名/删除/复制
- 方案导入/导出 ZIP
- 模型保存/加载（project JSON）
- 方案路径编码（encodeURIComponent + JSON.stringify）
- SVG 模型导入（svgModelImport）
- 模型节点操作与画布操作（model-node-ops / model-canvas-ops）
- 模型路由算法：拓扑布线/路径规划（model-routing，470KB）

### 量测

- 图形量测工厂
- 量测配置：groupDefaults / measurementTypes / deviceProfiles
- 量测默认值功能
- 量测行内编辑（measurementInlineEditing）
- 量测测点查重：跨量测组测点唯一性校验，重复拒绝并提示
- 量测测点【默认】按钮恢复默认测点

### 拓扑与电气

- 全网拓扑导出：多厂站拓扑 E 文件导出，模板类型策略（all-network-topology / eDeviceTemplateTypePolicy）
- 电压等级继承传播（voltageInheritance）
- 电压等级设置对话框（VoltageLevelDialog）
- 全局线路管理：跨模型线路注册与同步（global-lines / globalLineRegistry）

### 颜色与样式

- 颜色配置：colorDisplayMode / colorPalette
- 设备配色、背景色、边框样式
- 思源黑体（Source Han Sans CN）字体引入

### 导出与持久化

- 自包含 SVG 导出（前后端共用 `src/export/svg.ts` 的 buildSvgDocument，内联样式，被引用图片内联为 data URL；界面导出走 `/api/v1/schemes/model/svg`）
- 画布截图：SVG → PNG base64
- E 格式导出：电力系统 E 文件
- CIM/XML (IEC 61970 CIM16) 导出：单文件整合，AC 设备 + 拓扑端子连接 + 量测；`src/cim/` 独立模块（IR 中间表示 → RDF/XML 序列化），顶栏导出菜单入口
- E 文件编辑器（EFileEditor）
- 原生导出保存（nativeExportSave）
- DMS/EMS 实时数据库导出规则（dms-rtdb-export-rules / ems-rtdb-export-rules）
- RDF ID 导出
- GBK 字符编码支持（encoding/gbk + gbkTable）
- 当前模板标签：顶栏导出按钮旁显示模板来源状态

### 运行时态桥接

- WS 客户端（runtimeWsClient）：clientId 注册、ping 心跳、fetch/command 响应
- 运行时态序列化（runtimeSnapshot）：model/devices/selection/tab/snapshot/svg
- 前端 RT-WS 指示灯，点击复制 clientId

### 第三方 API（/api/v1）

- 只读域：schemes / library / runtime
- 信封响应：{ok:true,data} / {ok:false,error:{code,message}}
- v1 方案域：方案树、层级树、模型列表、导出 ZIP、模型 JSON/SVG/E 文件/CIM XML（界面导出按钮均先保存再走后端）
- v1 图元库域：分类树、设备、量测、设备定义、模板
- v1 运行时态：clients/model/devices/selection/tabs/screenshot/svg/e-file
- 全局线路 API（globalLineApi / globalLineRegistry）

### 控制台写操作（v1 control）

- 11 端点：device/scheme/model/select/group/delete/update/save/template/e-device-definition
- 经 WS 下发 command 到前端 __appScope 程序化方法
- 前端回 command-response

### 空间隔离（多工作空间）

- 一个部署内多套互相隔离的数据空间：`data/` 是 default 空间根，其余在 `data/workspaces/<id>/`
- 空间标识解析链：`X-Space` 头 > `?space=` > `Cookie: gmp_space` > 回退 `spaces[0]`
- 不变量（**改后端前先读 `server/CLAUDE.md` 的 Common Patterns**）：不得新增模块级路径常量（一律 `options.paths ?? defaultPaths` 显式透传）；一切建目录调用均经退休守护（`mkdirInSpace` / `writeTextIfChanged`）
- 空间导入/导出：顶栏空间下拉右侧四按钮（导出 / 导入 / 改名 / 删除，均作用于**当前空间**）；`GET /webgrp/spaces/export` 把当前空间原样打包成 ZIP（只遍历 `spacePathsFor` 枚举的子目录，default 空间的根是数据根、**不得**按根递归），`POST /webgrp/spaces/import` 一律新建空间、不落在当前空间，失败回滚不落半成品；改名走 `PUT /webgrp/spaces`（只改显示名、不重载页面），删除走 `DELETE /webgrp/spaces`（确认后目录进 `trash-spaces/`、删完切到剩余空间）
- 空间**名**唯一：新建 / 改名 / 导入撞上已有名字一律 409 `SPACE_NAME_DUPLICATE`（正文带冲突者 `name` / `conflictId`），**不再**静默加 `-2` 后缀；导入撞车时前端弹询问框（确定=覆盖该空间、取消=改用其他名字导入，改名框再取消=放弃），带 `?mode=overwrite` 或 `?mode=rename&name=` 重发
- 空间 **id 与 name 会分叉**：目录名恒为 id（`data/workspaces/<id>/`），创建时由名字 slug 而来、此后**永不改**；改名只改 `spaces.json` 里的 name。认目录只能靠 id —— 底部状态栏「空间ID <id>」常驻显示并支持点击复制，顶栏选择器显示的是 name
- 前端半边**已落地**：`src/spaceClient.ts`（Cookie + `/webgrp/spaces` 封装 + ZIP 导入导出）、`src/spaceCache.ts`（浏览器侧空间缓存单源清单 + 清理 + 启动闸门）、`src/spaceSwitch.ts`（切换时序与 beforeunload 跳过）、顶栏空间选择器与导入/导出按钮
- 空间标识**只用 Cookie**（前端不设 `X-Space` 头、请求不带 `?space=`）；`current` 取后端解析链的结果，前端不读 Cookie 自算

### 图片资源

- 图片上传/下载
- 图片文件夹管理：新建/重命名/删除
- 图片库配置

### 接口文档

- /swigger 自包含 HTML：接口元数据 + highlight.js + 可折叠 JSON 树 + 复制按钮
- Try-it 在线测试

### 用户自定义

- 用户定制管理器对话框（UserCustomizationManagerDialog）
- 自定义元件表单、参数表
- 批量属性编辑器（useBatchEditors Hook）
- 用户定制管理（userCustomizations）

### 全局消息

- 全局消息提示系统（globalMessage），替代 alert/confirm
- Toast 自动消失 + 手动关闭

## 代码映射

| 符号 | 类型 | 位置 | 职责 |
|------|------|------|------|
| App | 组件 | src/App.tsx | 主应用组件，装配 __appScope |
| renderAppView | 函数 | src/appExtracted/appView.tsx | 渲染整体视图 |
| DeviceKind | 类型 | src/model.ts | 设备类型枚举 |
| createImageServer | 函数 | server/server.mjs | 后端服务创建（含 WS 挂载） |
| attachRuntimeWebSocket | 函数 | server/runtimeWs.mjs | /ws 升级 + 客户端注册表 |
| createRuntimeWsClient | 函数 | src/runtimeWsClient.ts | 前端 WS 客户端 |
| buildSvgDocument | 函数 | src/export/svg.ts | 自包含 SVG 导出（前端经 appPersistenceLibraryExport 转出；后端适配层 Node 原生直载） |
| createProgrammaticAddDevice | 函数 | src/appExtracted/appControlFactories.tsx | 控制台写操作工厂（9 方法） |
| renderSwaggerHtml | 函数 | server/swaggerPage.mjs | /swigger 页面 HTML |

## 独特风格

| 风格 | 说明 |
|------|------|
| __appScope 装配 | App.tsx 每帧重建 `__appScope` 对象并 `Object.assign` 当前状态；空依赖 useEffect 需经 `__appScopeRef` 读最新引用 |
| 双服务器架构 | 开发时同时运行 Vite (5173) + Image Server (5174)；前端 WS dev 期直连 5174 |
| 运行时态桥接 | 第三方 `/api/v1/runtime/*` 经 WS 向前端 fetch 运行时态（model/devices/selection/screenshot/svg/e-file） |
| WS 双向指令通道 | 第三方 `/api/v1/control/*` 写操作经 WS 下发 command 到前端 `__appScope` 程序化方法，前端回 command-response |
| E 格式导出 | 支持电力系统 E 格式数据导出 |
| /swigger 自包含 | 接口文档页内嵌元数据 + highlight.js + 可折叠 JSON 树，无外部 JS 依赖（除 CDN） |
