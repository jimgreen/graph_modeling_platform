# T18 appCoreCanvasUtilities + routing 测试审查报告

## 概览

| 文件 | 行数 | 说明 |
|------|------|------|
| `appCoreCanvasUtilities.tsx` | 4169 | 画布核心工具 + 常量 + 类型定义（God File） |
| `appCoreCanvasUtilities.test.ts` | 91 | 参数分类 / 标签 / 转换器选项测试 |
| `model-routing.test.ts` | 3325 | 路由渲染、增量缓存、连接验证、设备移动重布线 |
| `model-routing-algorithms.test.ts` | 2447 | 正交路由算法、路径整理、拖拽形状保持 |
| **总计** | **10032** | — |

**发现总数: 13**（P0: 2, P1: 4, P2: 5, P3: 2）

---

## P0 严重

### [P0] @ts-nocheck 禁用 4169 行源文件的 TypeScript 类型检查
- 位置: `appCoreCanvasUtilities.tsx:1`
- 类型: 风格
- 描述: 整个文件使用 `// @ts-nocheck` 跳过类型检查，导致导出的 200+ 函数/常量在编译期完全无类型保护；调用方即使传入错误参数也不会报错。
- 建议: 渐进式移除——先按模块拆出独立 `.ts` 文件并启用严格类型，最终目标是完全消除 `@ts-nocheck`。优先级最高的是纯工具函数（几何计算、常量导出），可独立拆出且风险最低。

### [P0] 共享可变空数组作为常量默认值存在被意外修改的风险
- 位置: `appCoreCanvasUtilities.tsx:2517-2530`
- 类型: bug
- 描述: `EMPTY_ID_LIST: string[] = []`、`EMPTY_EDGE_ID_LIST: string[] = []`、`EMPTY_MODEL_GROUPS: ModelGroup[] = []` 是模块级可变的 `export` 数组。`EMPTY_CANVAS_SELECTION`（L2527）直接引用 `EMPTY_ID_LIST` / `EMPTY_EDGE_ID_LIST`，任何消费方若不慎 `push` 将污染全局所有使用该引用的组件。
- 建议: 使用 `Object.freeze([])` 或改为 `readonly` 元组 `[] as const`；在消费方解构时做浅拷贝 `[...list]`。

---

## P1 重要

### [P1] model-routing.test.ts 缺少 describe 分组，85 个顶级 test() 平铺
- 位置: `model-routing.test.ts:328-3325`
- 类型: 风格
- 描述: 仅有一个 `describe("routing")` 包裹了从 L328 到文件末尾的约 80 个 test，涵盖路由渲染、增量缓存、连接验证、设备移动、总线端子同步、镜像翻转等完全不同的功能领域，阅读与定位极困难。
- 建议: 按功能域拆分为 `describe("saved-path rendering")` / `describe("incremental rendering")` / `describe("connection validation")` / `describe("node movement rebuild")` / `describe("mirror & transform")` 等子组，每组 10-20 个 test。

### [P1] model-routing-algorithms.test.ts 同样缺少 describe 分组，67 个顶级 test() 平铺
- 位置: `model-routing-algorithms.test.ts:299-2447`
- 类型: 风格
- 描述: 只有一个 `describe("routing")` 包裹约 65 个 test，涵盖正交避障、连接提交、总线吸附、路径整理、拖拽形状保持等领域，与 model-routing.test.ts 存在主题重叠但无结构区分。
- 建议: 拆分为 `describe("obstacle avoidance")` / `describe("connection commit")` / `describe("bus endpoint snapping")` / `describe("tidy & drag")` 等逻辑分组。

### [P1] 两个路由测试文件重复 ~100 行 import 块和 ~20 行 helper 函数
- 位置: `model-routing.test.ts:1-243` 与 `model-routing-algorithms.test.ts:1-298`
- 类型: 重复
- 描述: 两份文件的 import 列表几乎完全相同（各约 100 行，涵盖 100+ 符号），且各自定义了功能相同的 `routeBendCountForTest`（L244 vs L238）、`withHiddenDeviceLabel`、`projectPointToBusCenterline`、`createRightTerminalLoad` 等 helper，代码完全一致。
- 建议: 将共享 import + helper 抽取到 `src/__tests__/routingTestHelpers.ts`，两份测试文件统一引用。

### [P1] saveImageAsset 未包裹 try-catch，localStorage 满时抛异常中断调用方
- 位置: `appCoreCanvasUtilities.tsx:4061-4064`
- 类型: 错误处理
- 描述: `saveImageAsset` 直接调用 `window.localStorage.setItem` 而无 try-catch，而同文件中 `writeRefreshRecoveryProject`（L4035）、`readImageAssets`（L4051）等均做了 try-catch 保护。浏览器 localStorage 满（通常 5MB）时会抛 `QuotaExceededError`，导致图片保存操作中断且无反馈。
- 建议: 添加 try-catch 并在失败时返回错误或 log 警告，与同文件其他 storage 操作保持一致。

---

## P2 一般

### [P2] 连接提交流程在测试中大量重复 prepare→validate→render 三步曲，可提取 helper
- 位置: `model-routing-algorithms.test.ts:849-880`（代表 ~15 处相同模式）
- 类型: 重复
- 描述: 约 15 个 test 包含几乎相同的三步序列：`prepareConnectionEdgeForCommit` → `validateConnectionEdgeRoute` → `routeEdgesForRendering`，然后分别断言 `prepared.ok`/`validation.ok`/`route.points`。每个实例的差异仅在于节点坐标和 canvas 尺寸。
- 建议: 提取 `expectCommitAndRoute(nodes, edges, canvasSize)` helper 封装三步 + 基础断言，各 test 只需提供输入数据和特化断言。

### [P2] 测试中大量 magic number 画布尺寸（`{ width: 640, height: 320 }` 等）散落各处
- 位置: 两个路由测试文件全文（约 60+ 处 `{ width: N, height: M }` 字面量）
- 类型: 风格
- 描述: 画布尺寸如 `{ width: 640, height: 320 }`、`{ width: 1400, height: 900 }`、`{ width: 1920, height: 1800 }` 在各 test 中重复出现，含义不直观，且修改时容易遗漏。
- 建议: 在 helper 文件中定义命名常量如 `SMALL_CANVAS = { width: 640, height: 320 }`，提高可读性和可维护性。

### [P2] DEVICE_LIBRARY_DIALOG_CONFIG 四键结构完全重复，可用工厂简化
- 位置: `appCoreCanvasUtilities.tsx:2001-2036`
- 类型: 重复
- 描述: 四个 dialog 配置（definition / custom / measurementConfig / measurementEditor）结构完全一致，仅 defaultWidth / defaultHeight 不同，margin / minWidth / minHeight 均引用同一组常量。
- 建议: 定义 `makeDialogConfig(defaultW, defaultH)` 工厂函数，将 36 行缩减为约 8 行。

### [P2] 存储键常量块（约 30 个）无逻辑分组，纯线性排列
- 位置: `appCoreCanvasUtilities.tsx:2505-2562`
- 类型: 抽象层次
- 描述: `PROJECT_STORAGE_KEY` 到 `RIGHT_PANEL_MODE_STORAGE_KEY` 等约 30 个 storage key 常量逐一 `export const`，没有按功能分组（项目 / 方案 / 图片 / 设备库 / 面板），阅读时难以快速定位。
- 建议: 按功能域分组并添加注释分隔符，或收敛为 `STORAGE_KEYS = { project: "...", scheme: "...", ... } as const` 单对象导出。

### [P2] `normalizeStoredDraftProject` 手动逐字段解构 27 个属性
- 位置: `appCoreCanvasUtilities.tsx:3984-4014`
- 类型: 简化
- 描述: `normalizeStoredDraftProject` 调用时从 `record.project` 手动列出 27 个字段（projectName → edges），每个字段一行。若 `DraftProjectState` 增加新字段，此处极易遗漏。
- 建议: 使用展开运算符 `...record.project` 加白名单过滤，或定义 `DRAFT_PROJECT_FIELDS` 数组驱动映射。

---

## P3 轻微

### [P3] lucide-react 导入 71 个图标，部分未在文件中直接引用
- 位置: `appCoreCanvasUtilities.tsx:11-72`
- 类型: 死代码
- 描述: 导入 71 个 lucide-react 图标（如 `Bell`, `Cable`, `ScanSearch`），作为 God File 可能被其他模块 re-export 使用，但部分图标在当前文件内未直接引用。由于 `@ts-nocheck` 存在，未使用的 import 也不会有 lint 提示。
- 建议: 在移除 `@ts-nocheck` 时一并启用 `no-unused-imports` lint 规则，清理未使用的图标导入以减小 bundle。

### [P3] CANVAS_LOD_NODE_DETAIL_LIMIT 与 CANVAS_INITIAL_LOD_NODE_DETAIL_LIMIT 值完全相同（320）
- 位置: `appCoreCanvasUtilities.tsx:2056-2058`
- 类型: 简化
- 描述: 两个常量名称不同但值完全一致，语义差异不清晰（"当前 LOD 限制" vs "初始 LOD 限制"），增加认知负担。
- 建议: 若确实需要区分，添加注释说明差异原因；若无需区分，合并为单一常量。

---

## 统计

| 优先级 | 数量 |
|--------|------|
| P0 严重 | 2 |
| P1 重要 | 4 |
| P2 一般 | 5 |
| P3 轻微 | 2 |
| **总计** | **13** |
