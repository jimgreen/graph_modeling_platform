# 后端 E 文件 / SVG / CIM-XML 导出设计（已保存模型）

- 日期：2026-09-11
- 状态：设计定稿（brainstorming 会话）
- 范围：E 文件、SVG、CIM/XML 的后端化导出；新增「已保存模型」端点；前端导出按钮改用后端

## 1. 背景与目标

现状四个问题：

1. `/webgrp/v1/runtime/e-file`（含 `?template=` 与 POST 模板文本）**经 WS 让前端计算**，第三方拿 E 文件必须先有前端在线。
2. `/webgrp/v1/schemes/model/svg` 用 server 自写的 `buildSvgFile`（`server.mjs:4890`，203 行简化版），与前端 `buildSvgDocument`（`appPersistenceLibraryExport.tsx:4765`）是**两套实现**，存在漂移。
3. 已保存模型**没有 E 文件端点**（`docs/DESIGN_THIRD_PARTY_API.md` §8.3 决策 B 明确不提供）。
4. CIM/XML 导出只存在于前端顶栏（`appTopbar.tsx:203`），swigger **无任何端点**；其纯函数 `buildCimXml` 已就绪但未后端化。

目标：**E / SVG / CIM 导出逻辑单一真源 = 前端 TS 源码**；后端直接运行同一份源码；`/swigger` API 与前端导出按钮都走后端；E 文件默认 GBK。

## 2. 非目标（YAGNI）

- 不做「已保存模型截图 PNG」端点（需光栅化，无法脱离前端）。
- 不改 `control/*`（11 个）与其余 `runtime/*`（`model` / `devices` / `selection` / `tabs` / `screenshot`）端点——它们语义上就是「当前打开的编辑器状态」。
- 不改 E / SVG / CIM 的生成算法与内容。
- 不引入构建产物（不打包）。
- 不做 CIM 的多模型批量导出。

## 3. 关键决策

| 编号 | 决策 | 说明 |
|------|------|------|
| D1 | 单一真源 = 前端 TS 源码，后端用 **Node 原生 TypeScript** 运行 | Node v24.19 默认 type stripping；实测 `src/model-eexport.ts` 闭包 14 文件、0 `.tsx`、0 enum/namespace |
| D2 | **零构建产物** | 不打包、不生成 `server/generated/*` |
| D3 | E 与 SVG 全部去 JSX | `.tsx` 改 `.ts` + `createElement`，使 Node 能直接加载 |
| D4 | API 请求只传模板，其余后端读盘 | 已核验：模型 JSON、`device-library.json`（含 5 个 `eDeviceDefinition*` override map）、`measurement-config.json`、global lines 后端均有磁盘副本 |
| D5 | 前端导出 = **先保存再导出** | 避免上传整个内存 project；API 与前端请求体一致 |
| D6 | `/v1/schemes/model/svg` 改用共享 `buildSvgDocument` | **输出会变**（含图层/测量/状态图标/背景图），对已有第三方调用方是行为变更，接受 |
| D7 | E 输出默认 GBK，可选 `encoding=utf-8` | SVG 同为默认 GBK、可选 `encoding=utf-8`（实施中扩展：为与前端落盘文件逐字节一致，SVG 也接受 `encoding`）；CIM 固定 UTF-8 |
| D8 | `/v1/runtime/e-file` **保留不动** | 仍经 WS 拉前端；前端 handler 改用同一共享模块，真源不变 |
| D9 | CIM 直接复用现有 `src/cim/` 纯模块，**不做抽离、不去 JSX** | 实测闭包 18 文件、0 `.tsx`；`buildCimXml` 本就是纯函数 |
| D10 | CIM `modelId` 默认取 `project.idx ?? name`（NCName 卫生化），可用 query `modelId` 覆盖 | 前端原本用 `activeProjectKey`，后端无此概念；提供覆盖口子保证可对齐 |
| D11 | CIM 缺关键参数不阻断导出，`?strict=1` 时返回 400 + 缺失清单 | 对齐前端「非阻断确认」语义；API 无交互，故默认继续 |

## 4. 架构

```
src/model-eexport.ts ────────────┐
src/export/e-file.ts    （新）   ├─► server/eFileExport.mjs ──► GET/POST /v1/schemes/model/e-file
src/eDeviceTemplateTypePolicy.ts ┘         │
                                           └─► 前端 exportEFile（保存 → POST → 下载）

src/export/svg.ts （新，含 buildSvgDocument）──────┐
src/svgExportUtils.ts                              ├─► server/svgExport.mjs ──► GET /v1/schemes/model/svg
src/DeviceGlyph.ts / staticRenderUtils.ts /        │
src/stateIconDrawing.tsx（未去 JSX，不在本次范围）  └─► 前端 exportSvgFile（保存 → 请求后端 → 下载）

src/cim/cim-export.ts （已纯，直接用）─┐
src/cim/cim-builder.ts               ├─► server/cimExport.mjs ──► GET /v1/schemes/model/cim-xml
src/cim/cim-serializer.ts            ┘         │
src/cim/cim-namespaces.ts                      └─► 前端 exportCimFile（保存 → GET → 下载）
```

`server/eFileExport.mjs` / `server/svgExport.mjs` / `server/cimExport.mjs` 是**适配层**：注入 `globalThis.localStorage` 桩 → 读磁盘 → 调共享纯函数 → 编码/响应。

## 5. 模块拆解

### 5.0 共用模块的落位约定

新抽出的 E / SVG 导出模块放 **`src/export/`**（`e-file.ts`、`svg.ts`），**不放 `shared/`**。

理由：这两者与 `src/model.ts`（9651 行）及其 14 文件闭包强耦合，而 `model.ts` 搬不走；放进 `shared/` 会形成 `shared → src` 的反向依赖。仓库既有约定 `shared/` 只放**零依赖的纯 `.mjs` + 手写 `.d.mts`**（`randomId` / `pathSafety` / `atomicWrite` / `xmlEscape` / `deviceParameterChineseNames`），两端直接加载、不需构建。新的导出模块不满足该定位。

`src/cim/` 已是同款自包含纯模块（且早于本方案），**保持原位**，不再为它套一层 `src/export/cim.ts` facade —— server 直接 `import "../src/cim/cim-export.ts"`。

**统一规则：凡后端要加载的纯模块，一律放 `src/export/`**（原文件保留 `export *` re-export 兼容）。据此，除 `e-file.ts` / `svg.ts` 外还需抽出第三个模块 `src/export/device-definition-shared.ts`（见 §5.1.1）。

`server/` 引用 `src/` 属新增的跨目录引用，但路径无障碍：`server.mjs` 已有 `repoRoot = resolve(__dirname, "..")`，且 `server/*.mjs` 早已反向引用 `../shared/*.mjs`。

### 5.1 `src/export/e-file.ts`（新，纯模块）

从 `src/appExtracted/appDeviceDefinitionEInterface.ts`（53KB，`@ts-nocheck`）迁出 E 相关纯函数：

- `buildEFileExportOptionsFromLibrary`（原 EInterface:513）
- `applyEDeviceDefinitionSectionsToLibraryState`（原 EInterface:709）
- 及其私有依赖：`buildEDeviceInterfaceDefinitionRows`、`orderEDeviceInterfaceFields`、`RUNTIME_GENERATED_STANDALONE_SECTIONS`、`E_DEVICE_INTERFACE_FIXED_FIELD_NAMES`、`eDeviceInterfaceSectionByComponentLibrary`、`eDeviceInterfacePatchesForRow` 等

约束：迁出后的**运行时闭包内不得有 `.tsx`**。已确认 `appDeviceDefinitionEInterface.ts` 里 5 个 TSX 根 import（`stateIconSvgVisibleViewBox`、`decodeSvgImageSource`、`buildMeasurementProfilePositionDefinitions`、`measurementProfileItemsComplianceMessage`、`clampNumber`）**从未被使用**，可直接删除；`resolveDefinitionComponentLibrary` 是入参，无需 import。

`appDeviceDefinitionEInterface.ts` 保留 `export * from "../export/e-file"` 兼容既有引用。

#### 5.1.1 `src/export/device-definition-shared.ts`（新，纯模块）

**实测发现**：§5.1 的 31 个声明引用 `../customDeviceUtils` 的 `deviceDefinitionSharedKeyForTemplate` 与 `normalizeSharedDeviceDefinitionOverrides`，而 `customDeviceUtils.ts` 的运行时闭包是 **85 文件 / 31 `.tsx`**（它 import 了 `../stateIconDrawing`、`../App` 等）——不抽离就会把 React 重新拖进后端闭包。

因此把这 15 个声明抽成独立纯模块：

`BUILT_IN_DEVICE_TEMPLATE_BY_KIND`、`SHARED_DEFINITION_METADATA_PARAM_NAMES`、`concreteDeviceDefinitionParams`、`deviceDefinitionKeyForTemplate`、`deviceDefinitionSharedIdentityForTemplate`、`deviceDefinitionSharedKeyForTemplate`、`fallbackComponentLibraryForCategoryLibrary`、`isConcreteDeviceDefinitionParamName`、`latestDefinitionSource`、`normalizeSharedDeviceDefinitionOverrides`、`overrideTimestamp`、`preferredDefinitionSource`、`resolveTemplateComponentLibrary`、`sharedDefinitionParams`、`visualOnlyOverride`

外部依赖仅 `cloneDeviceMeasurementDefinitions`（来自 `src/measurementDefinitionTypes.ts`，纯 `.ts`）——**0 `.tsx`**。`customDeviceUtils.ts` 保留 re-export。

### 5.2 `src/export/svg.ts`（新，纯模块）

从 `src/appExtracted/appPersistenceLibraryExport.tsx`（5440 行）迁出：

- `buildSvgDocument`（4765–5440，约 675 行）
- 其私有 helper（`renderNodeSymbolBody`、`nestedSvgDocumentRoot`、`prefixNestedSvgDocumentIds`、`buildSvgDeviceConnectorMarkup`、`resolveStateVisualImageHref`、`normalizeModelLayers`、`orderNodesByModelLayer` 等）

**图片资源注入**：`buildSvgDocument` 现直接调 `readImageAssets()`（`appCoreCanvasUtilities.tsx:4076`，读 `window.localStorage`），并用 `resolveNodeImage` / `resolveNodeForegroundImage` / `resolveProjectImage`（同文件 4090–4105，纯函数）。处理：

- `readImageAssets` → `CanvasRenderOptions.imageAssets`（默认仍取 `readImageAssets()`），server 侧传 `{}`；图片经 `imageExportPathById` 解析为后端 URL
- 三个 `resolve*Image` 辅助（`(node, assets) => string`）**一并迁入本纯模块**，避免 `src/export/svg.ts` 再 import `appCoreCanvasUtilities.tsx`

因此 `src/export/svg.ts` 的运行时闭包**不得包含 `appCoreCanvasUtilities.tsx`**。

`appPersistenceLibraryExport.tsx` 保留 re-export 兼容。

### 5.3 `src/cim/`（已存在，零改动）

`src/cim/` 5 个 `.ts`（`cim-export` / `cim-builder` / `cim-serializer` / `cim-namespaces` / `cim-types`）已是独立纯模块：

- 运行时闭包 18 文件、**0 `.tsx`**、无 `import.meta.env`
- 唯一 DOM 命中是 `model.ts` 的 `localStorage`（同一 shim）
- 入口 `buildCimXml(nodes, edges, projectName, modelId, measurementGroups, measurementTypes)` 已是纯函数，直接复用

后端只需 `server/cimExport.mjs` 适配层。

### 5.4 去 JSX 清单（`.tsx` → `.ts` + `createElement`）

| 文件 | 行数 | JSX-ish 行 | 备注 |
|------|------|-----------|------|
| `src/DeviceGlyph.tsx` | 2003 | 466 | 画布实时渲染器，风险最高 |
| `src/staticRenderUtils.tsx` | 292 | 14 | |

**共 2 个文件、约 480 行 JSX。**

`src/stateIconDrawing.tsx`（52 行 JSX）**不在范围内**：实测 `buildSvgDocument`（4765–5440）对 `stateIcon*` 引用数为 0；`appPersistenceLibraryExport.tsx:539` 那行 `from "../stateIconDrawing"` 是全文件 React 组件的 import，其中 `stateIconDrawingElementId` / `visibleStateIconColor` / `createStateVisualShapeImage` 等**均为未使用导入**。`DeviceGlyph.tsx` 的 import 也不含 `stateIconDrawing`。

转换后 `src/export/svg.ts` 的运行时闭包需保持 0 `.tsx`（实测：`DeviceGlyph` 闭包 19 文件仅自身为 tsx；`staticRenderUtils` 18 文件仅自身）。

转换要点：属性名保持原样（React 对 SVG 属性已是别名透传）、`children`、`<>` 片段用 `Fragment`、条件/`map` 原样、`dangerouslySetInnerHTML` 保留。`MemoDeviceGlyph = memo(DeviceGlyph)` 保留。**转换必须保留既有类型标注与注释**（用 `scripts/jsx-to-create-element.mjs` 按节点范围改写，而非 `ts.transpileModule` 整文件 emit —— 后者会抹掉类型）。

### 5.5 模块解析与 tsconfig

Node 原生 ESM 要求相对 import 带扩展名。改动范围 = 上述纯模块的运行时闭包（约 18–30 个 `.ts` 文件），把 `from "./model"` 改为 `from "./model.ts"`。闭包外文件不受影响（它们仍用无扩展名 import，由 Vite/TS 解析）。

E 与 CIM 共享同一 `model.ts` 闭包，`.ts` 扩展名改动**一次覆盖三者**。

`tsconfig.json` 增加：

```jsonc
"allowImportingTsExtensions": true,   // 已在 noEmit 下，合法
"erasableSyntaxOnly": true            // TS 5.9.3 支持；禁 enum/namespace 等不可剥离语法
```

### 5.6 运行期 shim

| shim | 位置 | 原因 |
|------|------|------|
| `globalThis.localStorage` | 三个 `server/*Export.mjs` 适配层模块顶层 | `src/model.ts:7406/7422` 的 `readVoltageLevelSettings` 读 localStorage；`readImageAssets` 同理（server 侧改注入后不再触发） |
| `import.meta.env` | 预期无需（未实测，实施时验证） | E 闭包实测 0 命中；SVG 侧命中点在 `appCoreCanvasUtilities.tsx:10`，抽离后应移出闭包；CIM 闭包实测 0 命中。若仍有漏网，适配层在 import 前注入 `globalThis.__VITE_ENV__` 或改由 `process.env.NODE_ENV` 派生 |

## 6. API 设计

### 6.1 E 文件

| 方法 | 路径 | 参数 | 说明 |
|------|------|------|------|
| GET | `/webgrp/v1/schemes/model/e-file` | `schemePath`、`name`、`template?`、`encoding?` | `template` ∈ 4 预定义名；不传 = 用后端已存 override map。`encoding` 默认 `gbk` |
| POST | `/webgrp/v1/schemes/model/e-file` | 同上 query + body `{templateText, templateName?}` | `templateText` = 任意模板定义文本 |

- 响应：`text/plain; charset=gbk`（或 `utf-8`）+ `Content-Disposition: attachment` + `cache-control: no-store`
- 预定义模板映射 `public/e-templates/*.e` 从 `apiV1Runtime.mjs` 抽到 `server/eFileTemplates.mjs`，runtime 与 schemes 共用

### 6.2 SVG

| 方法 | 路径 | 参数 |
|------|------|------|
| GET | `/webgrp/v1/schemes/model/svg` | `schemePath`、`name`（现有端点，实现改换） |

- 响应：`image/svg+xml; charset=utf-8`
- 已知限制：`backgroundPage`（前端 `backgroundPageRender` 运行时产物）后端不传，`buildSvgDocument` 的 `buildBackgroundPageExportMarkup()` 返回空 → **服务端 SVG 不含背景页图层**。写入文档。

### 6.3 CIM/XML

| 方法 | 路径 | 参数 | 说明 |
|------|------|------|------|
| GET | `/webgrp/v1/schemes/model/cim-xml` | `schemePath`、`name`、`modelId?`、`strict?` | `modelId` 覆盖默认（`project.idx ?? name` 卫生化）；`strict=1` 时缺关键参数返回 400 |

- 响应：`application/xml; charset=utf-8` + `Content-Disposition: attachment`（文件名 `<模型名>_<yyyyMMdd_HHmmss>_CIM16.xml`）
- 数据来源：`project.nodes/edges/name/idx/measurements.groups` + `measurement-config.json` 的 `measurementTypes`
- 无电力设备（过滤 `static-*` 后为空）→ 400 `bad-request`（对齐前端「无可导出的电力设备」提示）
- 缺关键参数 → 默认仍 200 导出；`?strict=1` → 400 + 缺失清单

### 6.4 错误码

| 状态 | 场景 |
|------|------|
| 400 | 缺 `schemePath`/`name`；未知模板名；`templateText` 为空；`encoding` 非法；模型类型与模板不匹配（`eDeviceTemplateSingleTypeMismatchMessage`）；模板文本解析不到元件定义；CIM 无电力设备；CIM `strict=1` 且缺关键参数 |
| 404 | 方案或模型不存在 |
| 500 | 内部错误 |

复用 `sendV1Error`。

## 7. 前端改动

`exportEFile` / `exportSvgFile` / `exportCimFile` / 顶栏「导出 E、JSON 和 SVG」bundle：

1. 走现有保存流程落盘（`saveBackendProjectRecord` / `saveBackendProjectArtifacts`）
2. 请求后端端点（全部 `GET`：`/e-file?template=`、`/svg`、`/json`、`/cim-xml`），参数只带 schemePath/name/template/encoding
   （`POST /e-file` 仅用于自定义模板文本 `{templateText}`，前端导出按钮不走该分支）
3. 以 `arraybuffer` 接收 → 触发下载（GBK 字节原样落盘）

E 编码选择器保留，默认 GBK 不变。CIM 原前端「缺参确认弹窗」由 `?strict=1` 或后端 200 语义替代：前端保持 `strict` 默认关闭，仍可在本地预检后提示。

## 8. 影响面与风险

| 风险 | 等级 | 缓解 |
|------|------|------|
| 去 JSX 改动画布实时渲染核心（`DeviceGlyph` 466 行） | **高** | 逐图元视觉对照：转换前后渲染同一模型，截图逐设备比对；现有 `svgExport.test.tsx` / 画布相关测试全量回归 |
| SVG 端点输出变化影响已有第三方调用方 | 中 | 在 `docs/DESIGN_THIRD_PARTY_API.md` 记录变更；老 `buildSvgFile` 仅保留作落盘 `.svg` 兜底 |
| Node 原生 TS 对闭包有 `.tsx`/enum 漏网 | 中 | `erasableSyntaxOnly` + 启动冒烟测试（`server/*.test.mjs` 直接 import `.ts` 跑通） |
| 前端「先保存再导出」改变用户预期（隐式落盘） | 低 | 导出前给全局提示；导出失败时明确报错不回滚 |
| CIM `modelId` 与前端 `activeProjectKey` 不一致 | 低 | D10 提供 query 覆盖；文档写明默认规则 |
| 服务端 SVG 不含背景页 | 低 | 文档记录 |

## 9. 测试

| 层 | 文件 | 断言 |
|----|------|------|
| 纯函数 | `src/export/e-file.test.ts`、`src/export/svg.test.ts` | 模板 override 构建、去 JSX 后 `buildSvgDocument` 输出含预期 `<rect class="bus-glyph">` |
| Node 通路 | `server/eFileExport.test.mjs`、`server/svgExport.test.mjs`、`server/cimExport.test.mjs` | 直接 import `.ts` 源码生成内容；E 断言 GBK 字节（`iconv.decode` 回环）；CIM 断言 XML 根元素与 `identifiedObject` 数量 |
| 端点 | `server/apiV1Schemes.test.mjs` | E/SVG/CIM 各 200 / 400 / 404 |
| 文档 | `server/swigger.examples.test.mjs` | 三个新端点示例可跑通 |
| 前端 | `src/runtimeSnapshot.test.ts`、`src/svgExport.test.tsx` | 导出改走后端的调用路径 |

## 10. 附录 A：swigger 端点依赖前端审计

| 分组 | 端点数 | 依赖前端 | 判定 |
|------|--------|---------|------|
| 图片资源 | 7 | ❌ | server ✅ |
| 方案（内部） | 8 | ❌ | server ✅ |
| 配置 | 6 | ❌ | server ✅ |
| v1 方案域 | 6 | ❌ | server ✅（`model/svg` 走本方案换实现，新增 `model/cim-xml`） |
| v1 图元库域 | 6 | ❌ | server 直读 `device-library.json` ✅ |
| v1 运行时态 | 10 | 8 个 ✅ | `model/devices/selection/tabs/screenshot/svg/e-file` —— 语义即「当前编辑器状态」，**必须依赖前端**；`clients` 为 server 直返 |
| 控制台 | 11 | ✅ | 对打开画布的写命令，**必须依赖前端** |

**结论**：不存在「不针对当前模型却依赖前端」的端点。缺口只在「已保存模型缺少对应只读导出」——JSON ✅ 已有、**E 文件**（本方案补）、**SVG**（已有但实现分裂，本方案统一）、**CIM/XML**（本方案新增）、截图 PNG ❌（不做）。

## 11. 附录 B：Node 原生 TS 实测证据

环境：Node v24.19.0 / TypeScript 5.9.3 / Windows。

| 探测 | 结果 |
|------|------|
| `node x.ts` 直接运行 | ✅ |
| `src/model-eexport.ts` 运行时闭包 | 14 文件，0 `.tsx`，0 enum/namespace，0 `import.meta.env` |
| `src/cim/cim-export.ts` 运行时闭包 | 18 文件，0 `.tsx`，0 `import.meta.env`，DOM 命中仅 `model.ts` |
| Node 内跑 `buildEFileExport` | ✅ 输出 `探针模型.e`，含 `<Model>` / `<basevoltage>` 段 |
| Node 内跑 `DeviceGlyph` + `renderSvgElementMarkup` | ✅ `<rect class="bus-glyph" x="-50" ...>` |
| `DeviceGlyph` / `staticRenderUtils` 是否用 hooks | ❌ 无（纯 render 函数） |
| 直接 import `appPersistenceLibraryExport.tsx` | ❌ 撞 `appStaticScope.ts` 的 Vite 专属 barrel（`import * as` + `Object.assign` 循环初始化）→ SVG 必须抽离 |

## 12. 后续项

- 若将来愿意引入打包（Vite lib / esbuild），可回退第 5.4 节的去 JSX 改动，降低画布渲染回归风险。
- 已保存模型截图 PNG：如需，只能在前端在线时由 `runtime/screenshot` 提供。
- CIM 多模型批量导出：本方案不做，后续如需另立项。
