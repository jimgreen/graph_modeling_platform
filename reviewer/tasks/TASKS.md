# TASKS — 夜班任务清单

> 初始化于 2026-09-05 夜班。此前无历史任务。

## 任务列表

### NS-001 — 还原"默认测点"公式与创建时规范公式不一致（P1，仅报告未修改）

- **优先级**: P1（明确行为缺陷，但修复方向需产品决策）
- **来源**: 夜班 Review 最近 5 次提交（9367fc47 引入还原逻辑）
- **问题**: `createUpdateMeasurementItem` 查重拒绝后的"还原默认测点"以及右侧面板【默认】按钮，默认测点公式固定为 `节点ID.端子ID.量测类型ID`；而创建量测项时（`measurementSourcePointForNodeItem`）规范公式为 `associatedField || (role ? "role." : "") + measurementTypeId`。当 profile 项带 `associatedField` 或 `role` 时两者不同。
- **证据**: 可执行复现（临时测试，跑后已删）：item 原测点为规范默认 `node-a.t1.Ua`（associatedField=Ua），编辑成重复测点被拒绝后，被还原为 `node-a.t1.activePower` —— 原绑定被覆盖为一个从未是"默认"的值。代码位置：`src/appExtracted/appGraphMeasurementFactories.tsx:4583`（还原分支）、`:5117-5119`（【默认】按钮）对照 `:4439-4440`、`:4474-4478`（创建时）。
- **风险**: ① 一次被拒绝的重复修改即永久覆盖原默认绑定；② 同组存在两个同量测类型项时（`createMeasurementItemForNode` 的 `?? profileItems[0]` 兜底允许），还原值自身可能与另一项重复，恰好重新制造查重要阻止的重复。
- **状态**: TODO（需人工决策）
- **处理结果**: 未修改。无法证明哪个公式是权威"默认"（按钮 title 文案明确写"节点ID.端子ID.量测类型"，现有行为可能是有意的）；修复需引入 profile 反查，行为变化无法证明 100% 无副作用；该区域是用户近 5 次提交正在迭代的代码。
- **报告文件**: reviewer/suggestions/2026-09-05.md

### NS-002 — 量测编辑弹窗确认不查重测点，与右侧面板/保存校验不一致（P2，仅报告未修改）

- **优先级**: P2
- **来源**: 夜班 Review（13bb555b/c63e8e5c 查重体系补全后的遗留缺口）
- **问题**: `createConfirmMeasurementEditorDialog`（`src/appExtracted/appGraphMeasurementFactories.tsx:4822-4826`）确认时只校验量测**名称**重复（`duplicateMeasurementEditorItemNames`），不校验测点 `sourcePoint` 重复；右侧面板编辑与保存合规校验均已覆盖测点查重。
- **证据**: 代码审查。弹窗内测点不直接可编辑（仅位置移动时按规范公式 `measurementSourcePointForNodeItem` 重算，`:4763`），因此正常流程下弹窗难以新造重复；但历史重复数据或特殊路径可经弹窗确认继续留存。
- **风险**: 低概率引入/保留重复测点，与既有查重策略不一致。
- **状态**: TODO
- **处理结果**: 未修改。属功能补全（新增 UI 校验行为），非确定性 bug 修复，无法证明 100% 无副作用。
- **报告文件**: reviewer/suggestions/2026-09-05.md

### NS-003 — 30 个失败测试为历史遗留（P2，仅报告未修改）

- **优先级**: P2
- **来源**: 夜班全量测试基线
- **问题**: 全量 vitest：30 failed / 2249 passed。涉及 `server/swigger.examples.test.mjs`（10 例，依赖运行环境/数据）、`appGraphMeasurementFactories.test.ts`（4 例）、`appProjectCanvasFactories.test.ts`（4 例）、`svgExport.test.tsx`（3 例）、`appView.test.tsx`（2 例）及 encoding/model/windowCloseCoverage 等散例。
- **证据**: 通过 `git worktree` 在 HEAD~5（最近 5 次量测提交之前）运行同一测试文件，4 个量测失败**同样存在** → 非最近提交引入。典型漂移：padding 空格数期望不符、`setLastCanvasClickTarget is not a function`（scope 缺函数）、`ems-rtdb-backend-restore` 依赖本地 `data/device-library` 内容。
- **风险**: 掩盖回归信号；CI 不可信。
- **状态**: TODO
- **处理结果**: 未修改。修复需判定测试与实现孰对（改测试预期/删测试被规则禁止），或补 scope 函数（行为新增，无法证明无副作用）。
- **报告文件**: reviewer/reports/2026-09-05.md

### NS-004 — `message.config({ top: 50 })` 模块顶层全局副作用（P3，备忘）

- **优先级**: P3
- **来源**: 夜班 Review（51433652 引入）
- **问题**: `src/appExtracted/appGraphMeasurementFactories.tsx:5-6` 在模块 import 时设置全局 antd message 位置，影响全应用所有 message 调用，非仅量测告警。提交信息表明是有意为之（避免与顶部工具栏重叠）。
- **状态**: REJECTED（有意行为，仅备忘；若未来出现其他 message 位置异常可回查此处）
- **报告文件**: reviewer/reports/2026-09-05.md
