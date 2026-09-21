# mcheck 合并前审查报告

> 审查时间：2026-09-21 ｜ 分支：`main`
> 审查范围：**工作区未提交改动**（`main...HEAD` 为空 —— 当前就在 `main` 上，无分支增量）
> 命令：`git diff HEAD` = 11 个文件 / +1491 −91，另含 1 个未跟踪新文件 `src/autoAlignLineQuality.test.ts`
> 方法：两轴 `/code-review`（Standards / Spec，并行子代理）+ 四维 `/simplify`（Reuse / Simplification / Efficiency / Altitude，并行子代理），汇总去重后自动应用修复。
> 说明：仓库**无** `CODING_STANDARDS.md` / `CONTRIBUTING.md` / eslint / prettier 配置；Standards 轴以 `CLAUDE.md` 为唯一书面约定 + Fowler 代码气味基线。**无** issue tracker、无对应 PRD；Spec 轴以 `.workbuddy/memory/2026-09-21.md`（用户 bug 反馈的原始记录与裁决）+ `MEMORY.md` 为需求依据。

---

## 一、/code-review 结果

### Standards

**书面约定违背（硬，但属既有模式）**
- **「类型定义集中在 `model.ts`，非分散」**（`CLAUDE.md` 约定表）。本次新增 5 个导出类型在 `selectionActions.ts`：`AutoAlignRouteQuality` / `AutoAlignQualityReport` / `AutoAlignQualityContext` / `AutoAlignGridCandidate` / `AutoAlignStoredRouteDrop`。但该文件**早已**导出 `CanvasLayoutUnit` / `SelectionRect` 等，属既有局部惯例 → 判为真实违背但低优先（迁移是独立清理任务）。

**基线气味（判断项，非硬违规）**
- **Duplicated Code** — 6 字段 `AutoAlignQualityReport` 字面量在 **3 处**手写：`createAutoAlignCanvasGraphics` 里的 `autoAlignQualityReport` 与 `callReport`，以及测试的 `createReport()`（测试甚至重新打字而没复用导出类型）。→ **已修**（见下）。
- **Primitive Obsession（弱化为打字变松）** — `routeWithCanvasParams(candidateNodes: any[], candidateEdges: any[])`、`runAutoAlignUnits(currentNodes: any[], unitList: any[])`：`ModelNode[]` / `CanvasLayoutUnit[]` 就在作用域内。仓库容忍工厂边界用 `any`，故判轻微 → **未改**（保持与既有工厂一致）。
- **Complicated Expression** — `qualitySuffix` 四层嵌套三元链。→ **已修**。

**未判为问题**
- 为 `createCleanupStaleConnectionRoutes` 在 `App.tsx` / `appCanvasViewportBatch` / `appRenderBatch` / `appStateBatch` 各加一行 import，属仓库既有 `__appScope` 注册模式，非新引入的 Shotgun Surgery。
- 新增的几何 helper（`countAutoAlignRouteBends` / `autoAlignStoredRouteDrops` / 交叉判定）拆分得当、命名清晰。
- 测试改用 `describe.skipIf(!projectAvailable)` 规避钉死活数据绝对坐标 —— 符合既定目标，无违例。

### Spec

**(a) 缺失 / 部分满足**
- **「每个设备位移 ≤ 48px」是实测值，不是代码保证**。diff 只软化了罚分（`SOFT_AVOID_PENALTY=4000`），没有任何位移上限；网格重排分支（`balancedGridDeltasForComponent`，由 `AUTO_SPREAD_GRID_MIN_DENSITY>=2` 把关）理论上仍可把设备挪很远。该 48px 只在 `多能流.json` 上量过 → 结论：**属文档口径问题**，应把「≤48px」表述为「在该样例上 ≤48px」。
- **「移动 + 清理共用一次撤销」缺少直接测试**。`autoAlignCanvasGraphics.test.ts` 只覆盖了 `movedCount===0`（`skipUndoSnapshot:false`）；`movedCount>0 ⇒ skipUndoSnapshot:true` 这条主线没有直测。逻辑正确，仅覆盖不全。

**(b) 范围外内容（scope creep）**
- `appRightPanel.tsx` + `appRightPanel.test.tsx` 里的**整块「电压等级按端子分行」特性**（`voltageBaseSideKeyForTerminal` / `renderVoltageBaseTerminalRow` / `setVoltageBaseTerminalValuesForScope` / `voltageBaseSettingModeForNode` / `inferESection` / `isThreeWindingTransformer`）与本次两个 bug 无关，两份 memory 也未提及 —— 是同一次工作区改动里夹带的大块未请求特性。**注**：该特性在 `MEMORY.md` 的「右侧面板「模型」页电压等级行」章节有独立记载，应是同批次的另一项既定工作，只是与本次 bug 修复混在同一工作区 diff 中。

**(c) 看起来实现有问题的要求**
- **「拐点/交叉不增加」三阶段并非同一几何基线**。候选判定用内置快速代理 `autoAlignPreviewRoutes`（忽略存档折线、不含 drop），而终检与提交用 `routeEdgesForStoredRendering` + `autoAlignStoredRouteDrops`。所以「候选判定的基线」与「终检的基线」不同口径。因终检是权威（变差即整单放弃），**提交结果仍然安全**；但报给用户的 `frozenUnitCount` / 拐点类数字来自代理，可能与最终实际几何不完全一致 —— 与 memory 中「三方同口径」的措辞有出入。

**其余全部符合**：软/硬障碍拆分、`overlapCount`、罚分推导（√4000≈63px / √(40×4000)≈400px）、`createAutoAlignCanvasGraphics` 里「先 commit 后 cleanup」的顺序、`storedRouteDropIds` 并入 undoScope —— 均正确落地。测试用关系不变式（非绝对坐标）钉住两个 bug，且非空跑。

---

## 二、/simplify 结果

### 已修复（自动应用，全部零行为变更）

| # | 维度 | 文件 | 改动 |
|---|------|------|------|
| 1 | Reuse | `src/selectionActions.ts` | 新增导出工厂 `createAutoAlignQualityReport()`，单一来源收拢 6 字段空白报告。原先手写在 **5 处**（生产 ×2、`autoAlignNodeLayoutUnits` 的逐字段重置 ×1、测试 ×2），现全部改为调用工厂；重置改为 `Object.assign(report, createAutoAlignQualityReport())` |
| 2 | Simplification | `src/appExtracted/appProjectCanvasFactories.tsx` | `qualitySuffix` 四层嵌套三元 → 具名函数 `autoAlignQualitySuffix(report): string` |
| 3 | Simplification | `src/appExtracted/appProjectCanvasFactories.tsx` | `writeOperationLog` 的五路嵌套三元 → 具名函数 `autoAlignOperationLog(options): string`（优先级链改为 if/else） |
| 4 | Simplification | `src/appExtracted/appRightPanel.tsx` | `voltageBaseSideKeyForTerminal` 的三层嵌套三元 → `if/else if/else` |
| 5 | Reuse | `src/selectionActions.test.ts`、`src/autoAlignLineQuality.test.ts` | 两处测试的空白报告字面量 → 复用 `createAutoAlignQualityReport()` |

### 跳过（附原因）

| 发现 | 维度 | 跳过原因 |
|------|------|----------|
| `countAutoAlignRouteBends` 与 `model-routing.ts:8946` 的 `routeBendCount` **逐字重复** | Reuse | 需从 470KB 的 `model-routing.ts` 导出私有函数，并**新建** `selectionActions → model-routing` 的模块依赖边（当前 `selectionActions` 只依赖 `model` / `canvasViewport` / `acContainer`）。为省 19 行引入跨大模块耦合，超出「合并前机械简化」的合理边界 → 留作后续 |
| `autoAlignEdgeWithoutStoredRoute` 与 `model-routing.ts:11487` 的 `edgeWithoutStoredRouteGeometry` 等价 | Reuse | 同上（同一依赖边问题）。注：新函数的「无存档则原样返回」短路对现有调用方无影响，可安全委托 |
| 终检与调用方**重复计算** `autoAlignStoredRouteDrops`（`arranged === working`，参数相同 ⇒ 结果相同），浪费 2 次全量真路由 | Efficiency | 需改 `autoAlignNodeLayoutUnits` 的返回契约（或把 dropIds 挂到 report 上），**中风险**，不适合在合并检查里盲改 |
| 终检修复循环最坏可达 8 次 `measureAuthoritative` ≈ 16 次全量真路由，超出手册记载的「终检 1~2 次」 | Efficiency | 修复循环是**正确性特性**，削减可能放行更差布局 → 只作提示，不改 |
| 候选内循环每轮 `working.map()` + `new Map(...)` + 全量 `new Map(routePointsByEdgeId)` 分配 | Efficiency | 涉及对齐热路径的结构性重写，无性能基准护航 → 不改 |
| `softOverlapCount` 每候选 delta 新建 `Set` | Efficiency | auto-spread 非最热路径，收益有限；改动触及评分内循环 → 不改 |
| 撤回循环里 `before = routeQualityOf(...)` 可提到循环外 | Efficiency | 低风险小收益，但需确认「回退成功后才需重算」的时序；本轮不改以免引入细微时序错误 |
| 自动散开 / `applySelectedNodeLayout` 未接入 `storedRouteDropIds`，同类 stale 折线问题仍潜伏 | Altitude | 是**真问题**（同一移动提交路径的共性），但需各自的回归样例与产品决策（散开本就要挪开设备，重锚可能合理）→ 记为后续 |
| 硬/软障碍拆成两个平行参数 + 两个 `PlacedRectGrid`，抽象有渗漏 | Altitude | 更优抽象是「障碍自带 cost/hardness」单一列表；改动触及 `nearestNonOverlappingDelta` 评分热路径 → 后续 |
| `SOFT_AVOID_PENALTY = 4000` / `AUTO_SPREAD_GRID_MIN_DENSITY = 2` 为单样例标定 | Altitude | 数值本身是合理启发式，但只有一个工程验证过；建议后续用更多样例校准或改「限制网格重排位移」而非密度阈值 |

> **Altitude 结论**：bug 1 的「commit 之后再 cleanup」是**正确层次** —— `preserveConnectionEdgeRouteShape` 的重锚对拖拽/键盘/容器移动是**特性**而非缺陷，auto-align 是唯一「意图简化线路」的调用方，所以在其后清理是对的。快速代理 vs 权威路由器的双参拆分也是正确层次（按**成本**拆，不按正确性拆）。
> **Standards/Middle-Man 检查**：新建的 `autoAlignQualitySuffix` / `autoAlignOperationLog` 是纯格式化，非「只为转发」的中间人，不构成 Middle Man。

---

## 三、验证

| 项目 | 结果 |
|------|------|
| `tsc -p tsconfig.json` | **干净**（TSC_EXIT=0） |
| 受影响 5 个测试套件 | **132 passed / 0 failed** — `selectionActions` 61、`appProjectCanvasFactories` 55、`appRightPanel` 9、`autoAlignLineQuality` 5、`autoAlignCanvasGraphics` 2 |
| 全量 `vitest run src` | **2660 passed / 14 failed**，失败全部为既有无关项：`runtimeWsClient.test.ts` 13（缺 `__QIANKUN_WINDOW__`）+ `iconLibraryIntegrity.test.ts` 1（扫描超时，时好时坏） |
| 新增失败 | **0** |

---

## 四、结论（一行）

**Standards 3 项**（1 硬：类型分散于 `selectionActions.ts`，属既有模式；2 判断项：重复字面量、嵌套三元）｜**Spec 3 项**（1 范围外：混入电压等级端子行特性；1 覆盖缺口：移动+清理共用撤销无直测；1 口径：三阶段基线不一致但终检兜底）｜**/simplify 已修 5 处**（1 个工厂 + 2 个日志格式化函数 + 1 处 if/else 展开 + 2 个测试复用），跳过 10 项（均为跨模块耦合或热路径改动，需独立回归护航）。

> 另：`MCHECK-REPORT.md` 是 2026-08-23 的**全仓 JS/MJS 审查**，与本报告无关，未改动。
