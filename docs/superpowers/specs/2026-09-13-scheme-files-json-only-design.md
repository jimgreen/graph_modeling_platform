# 方案模型文件只保留 JSON、派生格式实时生成

日期：2026-09-13
状态：待实现
相关文档：`docs/DESIGN_THIRD_PARTY_API.md`、`docs/WORKFLOW_THIRD_PARTY_API.md`、`docs/superpowers/specs/2026-09-11-backend-export-e-svg-cim-design.md`

> 本文中的行号以 2026-09-13 的代码状态为准，实现后会有漂移，以符号名为准定位。

## 1. 背景与问题

`data/schemes/files/**` 每个模型当前落盘三个文件：`<名称>.json`、`<名称>.e`（GBK）、`<名称>.svg`。

`.json` 是唯一真源，`.e` / `.svg` 是派生快照。它们带来四个问题：

1. **双实现漂移**。`server/server.mjs` 内自带一套简化渲染器（`buildSvgFile`、`buildDeviceParameterFile`），与 `src/export/svg.ts` + `src/model-eexport.ts` 的现役实现并存。当写盘调用方未提供产物时走前者兜底，产出与现役实现不一致的文件。实测：`望道变_6` 的 `.e` 缺 `<basevoltage>` 与 `<ACTransWinding>` 段，`.svg` 回灌后 `edges` 从 185 掉到 0（不输出 `source-dev-id` / `target-dev-id`）。
2. **快照不回溯**。磁盘产物是保存那一刻的代码与配置的产物，平台升级后不刷新，与导出端点口径必然分叉。
3. **静默降级**。前端 `computeSaveArtifacts` 抛错时 `catch` 返回 `{}`，服务端随即回落到简化渲染器，无任何提示。
4. **迁移负担**。跨机迁移需要携带并理解这些派生文件，还得区分哪份是哪个渲染器产的。

## 2. 决策

| # | 决策 | 理由 |
|---|---|---|
| D1 | `data/schemes/files/**` 只保留 `.json`，不再落盘 `.e` / `.svg` | 唯一真源原则；消除双实现漂移的土壤 |
| D2 | 方案 ZIP 导出改为**打包时逐模型实时生成** `json + e + svg` | ZIP 结构对第三方不变，内容反而始终为新口径 |
| D3 | 前端「保存时算好 SVG/E 上传」通道**一并删除** | 磁盘不再存这两种格式，该通道只剩开销；大模型上每次保存省数百毫秒至秒级 |
| D4 | 存量 `.e` / `.svg` **文件与代码都删除**，文件按现有惯例归档进 `data/schemes/trash/`（不 `rm`） | 保持可回滚；与仓库既有删除语义一致 |
| D5 | 背景页缺口本次一并堵上，做法是**只改引用键**（新增 `backgroundProjectIdx`），服务端读被引用模型重建 | 新增一个服务端可定位的小字段即可；不把整份背景模型复制进宿主 json，避免体积翻倍 |

## 3. 非目标

- 不改 `/v1/schemes/model/{json,svg,e-file,cim-xml}` 四个单模型端点的路径、查询参数与错误码（它们已是实时生成）；**唯一例外**是 `/v1/schemes/model/svg` 的输出内容会新增背景页图层，见第 7 节
- 不把 CIM XML 加入 ZIP（现状 ZIP 不含 CIM，保持不变）
- 不动 `data/schemes/model-index.json`（模型 ID 分配上限，必须保留）
- 不重构 `eSectionColumns`（`server.mjs:116`，另有 7 处解析/校验用途）
- 不解决「同一 `data/` 跑多个后端实例时 `allocateStableProjectIndex` 进程内锁失效」这一既有问题

## 4. 目标状态

### 4.1 磁盘不变量

```
data/schemes/files/**            仅 <模型名>.json
data/schemes/model-index.json    保留（ID 上限）
data/schemes/global-lines.json   保留（全局线路注册表）
data/schemes/trash/**            归档区，含被清出的 .e/.svg
```

### 4.2 派生格式的唯一来源

`.e` / `.svg` / CIM XML 只能实时生成，入口有三类，全部落到同一套渲染器（`src/export/svg.ts` 的 `buildSvgDocument` + `src/model-eexport.ts` 的 `buildEFileExport`）：

| 入口 | 路径 |
|---|---|
| 单模型端点 | `/v1/schemes/model/{svg,e-file,cim-xml}` |
| 方案 ZIP | `/webgrp/schemes/export`、`/v1/schemes/export` |
| 界面导出菜单 | 前端调上述端点后保存 |

## 5. 代码删除清单

| # | 对象 | 位置 |
|---|---|---|
| 1 | `buildSvgFile` 函数（约 200 行） | `server/server.mjs:4901-5103` |
| 2 | `buildDeviceParameterFile` 函数 | `server/server.mjs:4175-4225` |
| 3 | 保存时 `options.svg` / `options.eFile` 入参，及两处 `??` 兜底 | `server/server.mjs:5606-5607` |
| 4 | 写盘补缺分支 `if (!svgExists)` / `if (!eExists)`；`expectedFiles` 只登记 `jsonPath` | `server/server.mjs:5652-5658` |
| 5 | `handleSaveSchemeProject` 读取 `payload.svg` / `payload.eFile` | `server/server.mjs:6315-6316` |
| 6 | `PUT /webgrp/schemes/project/artifacts` 端点与 handler | `server/server.mjs`（`handleSaveSchemeProjectArtifacts`） |
| 7 | `computeSaveArtifacts` | `src/appExtracted/appProjectCanvasFactories.tsx:4900-4941` |
| 8 | `saveBackendProjectArtifacts` | `src/appExtracted/appPersistenceLibraryExport.tsx:376-385` |
| 9 | 导出 ZIP 前的逐模型刷新循环 | `src/appExtracted/appDeviceDefinitionFactories.tsx:3748-3783` |
| 10 | 11 个 `buildSvgFile` 测试 | `server/server.test.mjs` |

此外在 `saveSchemeProjectRecord` 内新增一步：写入 `<名称>.json` 前，把同名的 `<名称>.e` / `<名称>.svg`（若存在）归档进 trash。这一步让不变量**逐模型确定性成立**——任何被保存过的模型，磁盘上只剩 `.json`。

`writeSchemeFiles` 的 `expectedFiles` 也一并只登记 `jsonPath`，其既有 `removeStaleSchemeFiles`（`server/server.mjs:5169`）会归档不在清单内的文件。但这条路径只在 `PUT /webgrp/schemes`（`handleSaveSchemes`，`server/server.mjs:6269`，唯一调用 `writeSchemeFiles` 的入口）触发，而**当前前端不调用该端点**，因此只作兜底，不作为主路径。

## 6. 方案 ZIP 实时生成

`createSchemeArchiveBuffer`（`server/server.mjs:5256`）当前实现是 `zip.addLocalFolder(schemeDir)`，改为：

1. 递归遍历方案目录（含全部子方案目录），收集模型文件：扩展名为 `.json` 且文件名（不含扩展名）不等于 `scheme.json`，与既有 `maxStoredProjectIndex` 的扫描判据一致
2. 每个模型实时生成 `.e` 与 `.svg`，连同 `.json` 一起写入 ZIP
3. ZIP 内相对路径与目录结构保持现状（`<方案名>/<子方案>/<模型名>.<ext>`）

`.json` 入包的是磁盘原文（不重新序列化）；`.e` 入包按 GBK 编码，`.svg` 按 UTF-8，与端点默认编码一致。

装配逻辑**复用** `server/svgExport.mjs` 与 `server/eFileExport.mjs` 现有流程（库模板 `buildEffectiveLibraryTemplates`、配色 `readColorConfig`、量测配置 `readMeasurementConfig`、被引用图片 `readReferencedImageExportPathById`），抽出共用的「读盘模型 + 库/配色/图片装配 → 生成三件套」函数，避免出现第三套渲染入口。

**错误处理**：任一模型任一格式生成失败即整体失败，返回 500 并携带模型名与原因，**不静默跳过**、不产出残缺 ZIP。

**性能**：本机 16 个模型实测，最重的 `四川/所有图元`（126 设备 + 121 量测组）渲染在数百毫秒量级；方案级 ZIP 预计 1–3 秒。不做缓存。

## 7. 背景页补齐（D5 落地）

### 7.1 现状缺口

`buildSvgDocument` 的 `backgroundPage` 选项只有前端能提供（`backgroundPageRender` 来自 DOM 运行时状态），服务端 SVG 端点不传，故端点输出**不含背景页图层**（`src/appExtracted/appDeviceDefinitionFactories.tsx:2636` 注释自陈）。

### 7.2 载荷构成分析

`createAppHookCallback141` / `142`（`src/appExtracted/appToolbarHookFactories.tsx:4609`、`4630`）显示 `backgroundPage` 载荷为：

| 字段 | 来源 | 服务端可否获得 |
|---|---|---|
| `project` | 被引用模型自己的 project | 可（该模型 `.json` 在盘上） |
| `nodes` / `edges` | 上述 project 按 `backgroundLayerIds` 过滤 | 可（`filterProjectByVisibleLayers`，`src/model-routing.ts:6945`，纯 TS） |
| `transform` | `backgroundPageCanvasTransform` | 可（`src/export/svg.ts:158`，已被 Node 直载） |
| `backgroundColor` | 背景模型的 `canvasBackgroundColor` | 可 |
| `backgroundImageUrl` | `resolveProjectImage(project, imageAssets)` | 可（图片库 manifest） |

实测 `src/model-routing.ts` 可被 Node 原生直载（`normalizeProjectLayers`、`filterProjectByVisibleLayers` 均可用），与其 import 链全为 `.ts` 相符。

### 7.3 定位键

`backgroundProjectId` 是**前端 id**：磁盘 `.json` 不含 `id` 字段，服务端无 id→文件映射表，故不可用作服务端定位键。

新增 `backgroundProjectIdx?: number`。理由：`idx` 由 `allocateStableProjectIndex` 分配、跨方案唯一、改名或移动方案后不变（`server/server.mjs:5504` 注释明确该设计），且服务端已有 `findSchemeProjectRecordByIndex`（`server/server.mjs:5508`）可直接定位，无需全量建索引。

写入点：`createCurrentProject`（`src/appExtracted/appSelectionDragFactories.tsx:130`）当前已输出 `backgroundProjectId` / `backgroundLayerIds` / `projectIdx`，追加从 `__appScope` 取 `backgroundProjectRecord`，并输出 `...(record?.idx > 0 ? { backgroundProjectIdx: record.idx } : {})`。

### 7.4 服务端重建流程

`server/svgExport.mjs` 在 `renderSavedModelSvg` 内：

1. 若 project 无 `backgroundProjectIdx` → 跳过（视作无背景页，不报错）
2. `findSchemeProjectRecordByIndex({ index: backgroundProjectIdx })` 读被引用模型
3. `normalizeProjectLayers(背景 project)` → 按已落盘的 `backgroundLayerIds` 逐图层置 `visible` → `filterProjectByVisibleLayers`
4. 组 `{ project, backgroundBounds, transform, backgroundColor, backgroundImageUrl }`：
   - `backgroundBounds` = 背景模型的 `canvasWidth` / `canvasHeight`（缺失时回落渲染器默认值），与 `createAppHookCallback141` 一致
   - `transform` = `backgroundPageCanvasTransform(backgroundBounds, { width: 宿主模型 canvasWidth, height: 宿主模型 canvasHeight })`
5. 被引用模型的被引用图片并入 `imageExportPathById`
6. 传入 `buildSvgDocument`

对齐前端的两条守卫：`backgroundProjectIdx` 等于当前模型 idx 时视为自引用 → 跳过；被引用模型已删除 → `findSchemeProjectRecordByIndex` 返回空 → 静默跳过并记一条 warning。

## 8. 契约变更

| 项 | 变更 | 兼容处理 |
|---|---|---|
| `PUT /webgrp/schemes/project` | `svg` / `eFile` 入参不再使用 | **忽略而非报错**，部署窗口内未刷新的旧页面仍可保存 |
| `PUT /webgrp/schemes/project/artifacts` | 端点删除 | 实测该端点不在 swigger 中（`grep project/artifacts server/swaggerPage.mjs` = 0），无文档条目需删；旧页面调用会 404，前后端同包部署可接受 |
| `/webgrp/schemes/export`、`/v1/schemes/export` | 改为实时生成，ZIP 内容不变 | 第三方无感 |
| `/v1/schemes/model/svg` | 输出新增背景页图层（当模型设了 `backgroundProjectIdx`） | 纯增量 |

### 8.1 文档更新

| 文件 | 改动 |
|---|---|
| `docs/DESIGN_THIRD_PARTY_API.md:200`、`337-339` | 「`buildSvgFile` 保留为兜底」「`buildDeviceParameterFile` 保留不动（M3-A）」两条决策作废，改写为已删除 |
| `docs/WORKFLOW_THIRD_PARTY_API.md:10,45` | 同上 |
| `docs/REQUIREMENTS_THIRD_PARTY_API.md:32` | 待删项去掉这两个函数，保留 `eSectionColumns` |
| `docs/superpowers/specs/2026-09-11-backend-export-e-svg-cim-design.md:218` | 兜底策略段改为「已移除」 |
| `CLAUDE.md` | `data/` 行补：`schemes/files/**` 只含 `.json`，派生格式实时生成 |
| `server/CLAUDE.md` | `svgExport.mjs` / `eFileExport.mjs` 条目补「方案 ZIP 复用同一装配」；新增「files 只落 json」约定 |

## 9. 测试守卫

### 9.1 新增

| 文件 | 断言 |
|---|---|
| `server/schemeFilesJsonOnly.test.mjs` | 保存模型后 files 树下只有 `.json`；保存前预置同名 `.e` / `.svg` → 保存后被归档进 trash；trash 内可按原相对路径找回；`PUT /webgrp/schemes/project` 携带旧 `svg` / `eFile` 入参时被忽略且返回 200 |
| `server/schemeArchiveRealtime.test.mjs` | ZIP 条目集为 `json + e + svg`；ZIP 内 `.e` / `.svg` 与对应端点输出**字节一致**；`.json` 与磁盘原文一致；单模型渲染失败 → 500 且错误含模型名 |
| `server/svgExport.test.mjs`（扩展） | 设 `backgroundProjectIdx` → 输出含 `export-background-page-layer`；无该字段 → 不含且不抛错；指向已删模型 → 静默跳过 |

### 9.2 改

- `server/server.test.mjs`：删 11 个 `buildSvgFile` 用例
- `server/nativeLoad.test.mjs`：扩到覆盖 `src/model-routing.ts` 直载（本次新增依赖，防 `.tsx` 混入）
- `src/appExtracted/appExportBackend.test.ts`、`src/appExtracted/appProjectCanvasFactories.test.ts`：断言「保存携带 svg/eFile」的用例改为断言「只发 json」

### 9.3 回归门槛

```
pnpm vitest run
pnpm tsc --noEmit
pnpm audit:names      # 本次改 server/*.mjs 对 src 的 import，按仓库约定必跑
```

## 10. 迁移与回滚

### 10.1 存量清理

三层机制，按确定性排序：

1. **保存时逐模型归档**（主路径，确定性）：`saveSchemeProjectRecord` 写入 `.json` 前把同名 `.e` / `.svg` 归档进 trash。任何被保存过的模型立即满足不变量。
2. **一次性脚本**（清存量）：`scripts/purge-derived-scheme-files.mjs` 扫描 `data/schemes/files`，把非 `.json` 文件移入 `data/schemes/trash/<timestamp>/<原相对路径>`。默认 dry-run 打印清单，`--apply` 才执行。覆盖从未再被保存的历史模型。
3. **写盘兜底**：`writeSchemeFiles` 的 `expectedFiles` 只登记 `jsonPath`，由既有 `removeStaleSchemeFiles` 归档残余。仅在 `PUT /webgrp/schemes` 被调用时触发，当前前端不调用，故不作为依赖。

### 10.2 跨机迁移清单（改后）

```
data/schemes/files/**/*.json
data/schemes/model-index.json
data/schemes/global-lines.json
data/device-library/library.json
data/settings/color-config.json
data/settings/measurement-config.json
data/images/
```

不再需要 `.e` / `.svg`（省 1.3 MB）与 `trash/`（20 MB）。

### 10.3 回滚

- 数据：trash 内按 `<timestamp>/<相对路径>` 结构拷回原位
- 代码：`git revert`

## 11. 风险与未验证假设

| 项 | 说明 | 缓解 |
|---|---|---|
| **背景页重建等价性未实测** | 依据是「同一批纯函数 + 同样的输入（背景模型 json + `backgroundLayerIds`）可复现同一载荷」这一推断；本机 16 个模型**零个**设置背景页，无法用现网数据验证 | 实现时先构造一个设了背景页的测试模型，比对新旧输出（前端 `backgroundPageRender` 驱动 vs 服务端重建）逐项一致后，再删旧路径 |
| ZIP 导出变慢 | 逐模型实时渲染，无缓存 | 实测量级 1–3 秒；若超预期再加进程内 LRU（YAGNI，先不做） |
| 第三方依赖 ZIP 内 `.e` / `.svg` 的具体字节 | 重算口径与历史快照本就不同，此次起统一为新口径 | 写入 `DESIGN_THIRD_PARTY_API.md` 变更记录 |
| 前端多处写盘流程不再产派生文件 | 导入 / 粘贴 / 移动 / 重命名 / 复制 / 回收站恢复 / 量测批量保存 / 控制台 API 共 9 处本就传空 artifacts | 这 9 处在改造前走的是简化渲染器兜底，改造后不产文件；ZIP 与端点都实时生成，功能不受影响 |
| `backgroundProjectIdx` 同步遗漏 | 切换背景模型时需写入 idx | 写入点集中在 `createCurrentProject` 单处；补一条前端测试 |

## 12. 实现顺序

顺序不可颠倒，否则中途会出现「ZIP 里没有 E/SVG」或「保存后派生文件消失但无替代生成」的窗口：

1. **方案 ZIP 改实时生成**（第 6 节）——此时磁盘旧文件仍在，属双轨期，可独立验证 ZIP 内容与端点一致
2. **背景页重建**（第 7 节）+ 前端写入 `backgroundProjectIdx`——先与原路径比对，等价后再继续
3. **删前端 artifacts 通道**（第 5 节第 7–9 项）
4. **删服务端旧入参处理与两个渲染器函数**（第 5 节第 1–6、10 项），同时加保存时逐模型归档
5. **存量清理脚本**（第 10.1 节）并执行 `--apply`

## 13. 验收清单

- [ ] `pnpm vitest run` 全绿，`pnpm tsc --noEmit` 无错，`pnpm audit:names` 无新增
- [ ] 保存模型后 `find data/schemes/files -name '*.e' -o -name '*.svg'` 为空
- [ ] 保存任一模型后，该模型原有的同名 `.e` / `.svg` 出现在 `data/schemes/trash/<timestamp>/` 下
- [ ] `scripts/purge-derived-scheme-files.mjs` dry-run 清单与实际残留一致，`--apply` 后 files 树下所有旧 `.e` / `.svg` 已入 trash
- [ ] `PUT /webgrp/schemes/project` 携带旧 `svg` / `eFile` 入参时返回 200 并正常保存
- [ ] 单模型导出 E / SVG / CIM 三格式与改造前逐字节一致（未设背景页的模型）
- [ ] 设了背景页的模型：端点 SVG 与前端导出 SVG 一致
- [ ] 方案 ZIP 导出含 `json + e + svg`，且 `.e` / `.svg` 与端点输出字节一致
- [ ] 构造渲染失败场景 → ZIP 端点返回 500 且错误信息含模型名
- [ ] 跨机迁移按 10.2 清单拷贝后，方案树、模型、图元库、配色、量测配置全部还原
- [ ] 已删除的 `buildSvgFile` / `buildDeviceParameterFile` 在全仓无残留引用
