# 全项目 TS/TSX 代码审查总报告

> 审查日期：2026-08-23～24 ｜ 审查范围：全部 192 个 .ts/.tsx 文件（约 8.1MB / 45,000+ 行）
> 方法：按主题/体量分 34 组，每组独立深审产出分段报告（`.sisyphus/reports/mcheck/TS-T*.md`），本报告为合并总览。
> 关联文档：《MCHECK-REPORT.md》（js/mjs 部分，155→164 项）保留有效；两份总报告共同构成全仓库审查结论。
> 说明：只审查未修改代码。stateIconDrawing.test.ts（125KB）与个别 lib 测试为结构级抽查，已在对应分段报告中标注。

---

## 一、总览统计

| 组 | 覆盖内容 | 体量 | P0 | P1 | P2 | P3 | 小计 |
|----|---------|------|----|----|----|----|------|
| T01 | model-routing.ts | 460KB | 3 | 6 | 7 | 4 | 20 |
| T02 | appDeviceDefinitionFactories.tsx | 407KB | 1 | 5 | 8 | 5 | 19 |
| T03 | model.ts | 367KB | 2 | 6 | 4 | 3 | 15 |
| T04 | appRenderBatch.tsx | 308KB | 3 | 5 | 6 | 4 | 18 |
| T05 | appProjectCanvasFactories + test | 346KB | 2 | 4 | 7 | 5 | 18 |
| T06 | appDeviceDefinitionFactories.test | 247KB | 3 | 6 | 7 | 22 | 38 |
| T07 | appPersistenceLibraryExport + test | 324KB | 2 | 5 | 7 | 4 | 18 |
| T08 | appGraphMeasurementFactories + test | 289KB | 2 | 7 | 8 | 5 | 22 |
| T09 | appSelectionDragFactories + test | 249KB | 2 | 5 | 7 | 5 | 19 |
| T10 | appCanvasInteractionFactories + test | 258KB | 2 | 6 | 7 | 4 | 19 |
| T11 | appToolbarHookFactories + test | 234KB | 2 | 5 | 6 | 6 | 19 |
| T12 | model-device-library.test | 199KB | 0 | 1 | 2 | 4 | 7 |
| T13 | model-eexport.ts + test | 329KB | 2 | 5 | 5 | 3 | 15 |
| T14 | model-topology.test | 172KB | 1 | 5 | 7 | 5 | 18 |
| T15 | model 测试系列 + node-ops/canvas-ops | 217KB | 1 | 4 | 5 | 3 | 13 |
| T16 | App.tsx | 144KB | 3 | 4 | 5 | 3 | 15 |
| T17 | appView 系列 | 214KB | 2 | 8 | 7 | 4 | 21 |
| T18 | appCoreCanvasUtilities + routing 测试 | 355KB | 2 | 4 | 5 | 2 | 13 |
| T19 | stateIconDrawing.tsx（test 待补） | 116KB | 0 | 0 | 2 | 4 | 6 |
| T20 | appCanvasViewportBatch + canvasArea | 232KB | 2 | 6 | 5 | 4 | 17 |
| T21 | Renderers + Dialogs | 267KB | 3 | 6 | 7 | 5 | 21 |
| T22 | EInterface + customDeviceUtils | 151KB | 2 | 5 | 7 | 5 | 19 |
| T23 | all-network-topology 三件套 | 146KB | 1 | 6 | 9 | 4 | 20 |
| T24 | measurements 系列 | 130KB | 0 | 5 | 10 | 6 | 21 |
| T25a/b | svg 系列（export/import/utils） | 214KB | 2 | 7 | 10 | 8 | 27 |
| T26 | selectionActions + stores | 162KB | 0 | 5 | 6 | 4 | 15 |
| T27 | DeviceGlyph + static 渲染 + EFileEditor | 141KB | 0 | 5 | 10 | 6 | 21 |
| T28 | 面板对话框 A 批 | 154KB | 0 | 2 | 2 | 2 | 6 |
| T29 | 面板对话框 B 批 | 158KB | 1 | 7 | 6 | 6 | 20 |
| T30 | scripts 基准 + 根配置 + 小组件 | ~90KB | 0 | 0 | 1 | 6 | 7 |
| T31 | 图标库 + 用户定制 | 134KB | 0 | 4 | 7 | 5 | 16 |
| T32 | runtime 系列客户端 | ~110KB | 0 | 0 | 1 | 5 | 6 |
| T33 | lib(IndexedDB) + hooks | ~240KB | 0 | 0 | 2 | 4 | 6 |
| **合计** | **192 文件** | **8.1MB** | **46** | **149** | **195** | **165** | **555** |

> 注：T06 的 P3 计 22 项多为同类重复模式的分别计数，实际去重后全局总数约 530 项量级。

---

## 二、横向重大发现（TS 特有，最高优先关注）

### 🔴 [架构-P0] 整个 UI 层 @ts-nocheck——约 3.5MB 代码零类型检查
- 位置：src/App.tsx + src/appExtracted/ 全部 32 个文件 + src/VoltageLevelDialog.tsx（grep 实证 32 处，见各分段报告首行）
- 性质：从巨型 App.tsx 机械提取模块时保留 `// @ts-nocheck` 的迁移策略产物（appExtracted/AGENTS.md 有记载）。后果：
  - scope 解构的 80~130 个属性/文件全部无编译期校验，拼错即运行时 undefined；
  - MemoizedViewSection 手工 inputs 依赖数组漏项 → 静默 stale UI（T28-P1）；
  - 本报告大量 React 类发现的根因都与此相关。
- 建议（分四步）：① 用现有解构清单机械生成每文件显式 Props 接口；② 打开 nocheck 逐文件修编译错误（可按 T01-T33 报告中已知问题优先）；③ 以 selector 订阅替换手工 inputs；④ CI 加 `tsc --noEmit` 门禁防回潮。

### 🔴 [架构-P0] __appScope God Object
- 位置：src/App.tsx（T16 报告：443 次 Object.assign、200+ useState、150+ useRef、15 功能域）；下游 appExtracted 各组件经 scope 解构消费
- 建议：按功能域拆 store（zustand 或 context 切片），配合上面 nocheck 治理同步推进。

### 🟠 [结构-P1] 巨型文件文化
- Top：model-routing.ts 460KB / appDeviceDefinitionFactories.tsx 407KB / model.ts 367KB / appRenderBatch.tsx 308KB……20 个文件 >126KB。T03/A1 报告均给出了职责聚类与提取顺序。

### 🟠 [共性-P1] ID 生成第 4+ 处 Date.now+Math.random
- 新增：src/runtimeWsClient.ts:20（localStorage 持久化使碰撞影响持久）。与 js/mjs 报告的 A1/C 处合并整改：统一 crypto.randomUUID 工具。

### 🟠 [共性-P2] escapeXml 缺单引号转义——三处独立实现同缺陷
- svgUtils.ts:42-48（T25b）、scripts 四个图标生成器（F 组）、generate-docer-compatible-icons.mjs:2726（E 组）、globalMessage.ts escapeHtmlToBr 同型不全（T30）。统一共享转义工具。

### 🟡 [共性-P3] "#2563eb" 魔法色值前后端散布
- stateIconDrawing.tsx 10+ 处（T19）+ scripts 三文件（F 组）。提 DEFAULT_SHAPE_STROKE_COLOR 共享常量。

---

## 三、TS 修复优先级路线图（Top 12）

| # | 问题 | 位置 | 来源 |
|---|------|------|------|
| 1 | @ts-nocheck ×32 治理计划启动（先建 Props 接口） | appExtracted 全目录 | 横向 |
| 2 | App.tsx WS effect 空依赖 + dispatch 静默失败 | App.tsx（T16-P0） | T16 |
| 3 | model-routing 几何热点 O(n²) 与 NaN 传播（3 项 P0） | model-routing.ts | T01 |
| 4 | appRenderBatch 大列表渲染 P0 ×3（key/内联闭包/字符串构建） | appRenderBatch.tsx | T04 |
| 5 | model.ts TOCTOU 型变更竞态（2 项 P0） | model.ts | T03 |
| 6 | Renderers/Dialogs 表格渲染 P0 ×3 | appDeviceDefinition{Renderers,Dialogs} | T21 |
| 7 | svgModelImport sanitize 缺口（entity 编码 scheme 等 2 项 P0） | svgUtils/svgModelImport | T25b |
| 8 | persistence 导出数据丢失风险（部分写/无错误处理） | appPersistenceLibraryExport | T07 |
| 9 | canvasInteraction 指针事件泄漏（P0 ×2） | appCanvasInteractionFactories | T10 |
| 10 | EInterface 解析静默降级（P0 ×2） | appDeviceDefinitionEInterface | T22 |
| 11 | eexport 定宽列对齐 bug（P0 ×2） | model-eexport.ts | T13 |
| 12 | all-network 拓扑环检测缺陷 | all-network-topology.ts | T23 |

其余 P1（149 项）按分段报告执行；P2/P3 随上述重构顺带消化。

---

## 四、正面评价（审查中确认的优秀实践）

1. **基准脚本方法论**（T30/scripts×6）：warmup+中位数+防 JIT sink+行为 hash 校验，工程级严谨。
2. **lib/IndexedDB 层**（T33）：幂等 upgrade、Blob 分离存储、双写迁移+回滚设计完整。
3. **runtime 系列客户端**（T32）：WS 重连/心跳/关闭清理无泄漏；screenshot 的 Blob URL finally revoke。
4. **测试基本盘**（T06/T12/T14 等）：语义化断言、失败消息带上下文、同步纯函数为主无 flaky 温床。
5. **小工具层**（T30/T32/T33）：纯函数、防御性归一化（Set 校验+fallback）、无障碍属性完备。

---

## 五、分段报告索引

34 份分段报告位于 `.sisyphus/reports/mcheck/`，命名 `TS-T<NN>-<slug>.md`：
T01-model-routing / T02-app-device-def-factories / T03-model / T04-app-render-batch / T05-app-project-canvas / T06-app-device-def-test / T07-persistence-export / T08-graph-measurement / T09-selection-drag / T10-canvas-interaction / T11-toolbar-hooks / T12-model-device-lib-test / T13-model-eexport / T14-model-topology-test / T15-model-tests / T16-app / T17-appview / T18-corecanvas-routing-tests / T19-state-icon-drawing(⚠test 待补) / T20-viewport-canvasarea / T21-renderers-dialogs / T22-einterface-customdevice / T23-all-network / T24-measurements / T25a-svg-export / T25b-svg-import-utils / T26-selection-stores / T27-deviceglyph-static / T28-panels-dialogs-a / T29-panels-dialogs-b / T30-misc-scripts-config / T31-iconlib-customization / T32-runtime-series / T33-lib-hooks

---
*TS 审查完成：192/192 文件覆盖，555 项发现（P0:46 / P1:149 / P2:195 / P3:165）。未修改任何源码。*
*待补：stateIconDrawing.test.ts 深审；js/mjs + ts 两份总报告建议后续合并为单一 REPO-AUDIT 总览。*
