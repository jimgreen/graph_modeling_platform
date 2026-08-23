# 交接文档 — 代码审查与修复后续任务（2026-08-24）

> 供明日继续执行。当前分支：`22`（已合并 @ts-nocheck 治理前两批）。
> 相关报告：`MCHECK-REPORT.md`（js/mjs）、`TS-REPORT.md`（ts/tsx）、`.sisyphus/reports/mcheck/`（44 份分段报告）。

---

## 一、已完成（勿重复）

| 阶段 | 内容 | Commit |
|------|------|--------|
| 审查 | 全仓库 240 文件：js/mjs 164 项 + ts/tsx 555 项 | `4391b364` |
| 横向共性 | 4 共享模块（shared/xmlEscape、randomId、pathSafety、atomicWrite，含 .d.mts）+ 8 安全修复 | `3a045fa6` |
| P0 冲刺 | 五批共 29 项修复 + 7 项误报澄清 | `efed3ad4`~`9d2d9bab` |
| @ts-nocheck | 前两批 7 个文件（appCanvasViewportCalculations/appStatusbar/appInlineUtilityFunctions/appStaticScope/appLeftPanel/appTopbar/appContextMenus）| `d84989ca` + `6cb124ce` |

已验证：tsc 无新增错误（仅存量 `src/measurements.ts:413` 一个，用户工作区改动引入，勿动）。

---

## 二、剩余任务（按优先级）

### A. @ts-nocheck 治理：剩余 25 个文件

**总流程（每文件）：**
1. 删除首行 `// @ts-nocheck`
2. `npx tsc --noEmit -p tsconfig.json` 看该文件报错
3. 逐条修：补参数类型（`__appScope: Record<string, any>`、局部类型）、修隐式 any
4. tsc 无该文件错误 → 跑相关 vitest 测试
5. 提交（按批次，建议 3-5 文件/批）

**分批建议：**

| 批次 | 文件 | 规模 | 预估复杂度 |
|------|------|------|-----------|
| 第三批 | VoltageLevelDialog.tsx、appControlFactories.tsx、appUserCustomizationFactories.tsx、appResourceDialogs.tsx、appRenderPanels.tsx、appProjectDialogs.tsx | 8-25KB | 低-中 |
| 第四批 | appCanvasDialogs.tsx、appStateBatch.tsx、appDeviceDefinitionEInterface.ts、appCoreCanvasUtilities.tsx、appCanvasViewportBatch.tsx、appCanvasArea.tsx | 25-138KB | 中-高 |
| 第五批起 | App.tsx、appRenderBatch、appProjectCanvasFactories、appPersistenceLibraryExport、appGraphMeasurementFactories、appSelectionDragFactories、appCanvasInteractionFactories、appToolbarHookFactories、appDeviceDefinitionRenderers/Dialogs/Factories、appView（13 个巨型）| 138KB+ | 高，建议每个单独提交 |

**注意**：
- `appDeviceDefinitionFactories.tsx` 是**用户 M 文件**（有未提交改动）——移除 @ts-nocheck 前先确认与用户改动不冲突，或跳过留最后
- 巨型文件（appProjectCanvasFactories 5775 行、appDeviceDefinitionFactories 9024 行）建议在新会话独立处理
- 部分文件移除后可能零报错（scope 已类型化如 appStatusbar），直接通过

**已发现的坑**：
- `memo(Comp, areViewSectionPropsEqual)` 类比较器错配（appContextMenus 先例）——比较器期望类型与实际 props 不符时，改 props 类型或去掉比较器
- `clearTimeout(ref.current)` 报 TS2769 → 加 `?? undefined`
- `(current) => !current` 隐式 any → 补 `(current: boolean)`
- /g 正则提升模块级后必须 `lastIndex = 0` 重置（appCanvasArea 先例）

### B. 剩余 bug 修复（中等优先级）

| 项 | 位置 | 说明 |
|----|------|------|
| T21-P0-2 完整版 | appDeviceDefinitionRenderers.tsx:1001 | Image 像素扫描已补 onerror，可进一步用 useRef 追踪实例做组件级清理 |
| T06-P0-1 | appDeviceDefinitionFactories.test.ts:353 | 89 个测试错归 describe 需按主题拆 6-8 组（量大，低风险纯测试重组）|
| T01-P0-2 真·最近投影 | model-routing.ts:2987 | 需产品确认行为变更，注释已加警示，勿擅自改 |

### C. 收尾事项

| 项 | 说明 |
|----|------|
| stateIconDrawing.test.ts 补审 | 125KB，审查时仅结构抽查，报告已标注 |
| 存量测试失败 | appView.test.tsx / appProjectCanvasFactories 等——根因是**用户未提交的 model.ts 改动**（`INTERACTIVE_STATIC_DRAWING_KINDS is not iterable`、`setTopologyWarningPanelClosed is not a function`）。等用户提交 model.ts 后验证 |
| 合并 P2/P3 | 按两份总报告执行，随重构消化 |

---

## 三、关键上下文（明日必读）

### 用户工作区未提交改动（**勿动、勿提交**）
```
M src/globalMessage.ts    M src/main.tsx    M src/model.ts    M src/styles.css
M src/appExtracted/appDeviceDefinitionFactories.tsx
M AGENTS.md / CLAUDE.md   ← gitnexus analyze 自动更新，可随下次提交带上
```
> model.ts 含用户新增 `MODEL_TYPE_META` 常量 + 我的 makeId 修复（已 hunk 分离提交，用户版已恢复）。

### 共享工具模块（已入 22 分支）
```
shared/xmlEscape.mjs (+.d.mts)    escapeXmlFull 五实体转义
shared/randomId.mjs   (+.d.mts)   UUIDv4 ID 生成（前端/后端通用）
shared/pathSafety.mjs (+.d.mts)   isPathInside / safeJoin / sanitizeSegment（Node only）
shared/atomicWrite.mjs(+.d.mts)   atomicWriteFile / atomicWriteFileSync
```

### 验证命令
```powershell
npx tsc --noEmit -p tsconfig.json          # 全量类型检查（忽略 measurements.ts 存量 1 错）
npx vitest run <file>                        # 定向测试
npx vitest run src/appToolbarHookFactories.test.ts   # UI 面板回归
npx gitnexus analyze                          # 提交后刷新索引（embeddings=0 无需 --embeddings）
```

### 提交规范
- 用 `-F .git-commit-msg.tmp` 文件方式传中文 commit message（PowerShell 双引号内 `--` 会被误解析）
- 只 add 自己改的文件；用户 M 文件一律排除（先 `git status` 核对）
- 修改用户 M 文件时用「备份 → checkout HEAD → 重放 → 提交 → 恢复」hunk 分离法（model.ts 先例）

### 审查结论要点
- P0 中约 20% 为误报/有意设计（bus 虚拟端子、5/3 字体度量、策略性 no-op、分层渲染）——修复前先看注释/测试确认领域约定
- 最大结构性债务：@ts-nocheck ×32 文件（现剩 25）+ __appScope God Object + 巨型文件文化

---

## 四、明日开工步骤

1. `git status` 确认分支 22 + 用户工作区未提交改动仍在
2. 从 **A 第三批**（VoltageLevelDialog 等 6 个中型文件）开始 @ts-nocheck 治理
3. 每批 tsc + vitest 验证后提交
4. 中途如遇模型限额：主线程自审小文件、子代理审大文件（配额恢复后串行）

*生成：2026-08-24 ｜ 会话内 9 个 commit 已入 22 分支*