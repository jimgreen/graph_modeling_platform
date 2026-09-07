# dot 导入途经点正交布线 设计文档

日期：2026-09-08
状态：已确认（brainstorming 定稿）
前置：2026-09-07-dot-station-import-design.md（dot 基础导入已落地）

## 1. 背景与目标

powsybi 导出的厂站 `望道变_6.dot` 含 247 个节点（设备 + `shape=point` 黑点连接点，均带坐标）与约 254 条拓扑边。现有 `src/dotImport.ts` 导入后：黑点被收缩合并、边不带走线点，渲染期兜底布线在密集图上质量差——实测 185 条边中 **177 条穿过非端点设备**。

目标：dot 导入后，线路走线由平台自算并**全部正交、不穿非端点设备**，整体观感接近同源 SVG（`望道变_6.svg`，仅作目测示意，不参与回归）。

## 2. 已确认的决策

| 决策点 | 结论 |
|---|---|
| 走线基准 | 纯 dot 自算（不解析 SVG） |
| 黑点连接点 | 维持收缩不建节点，但其坐标作为所收缩边的**必经途经点**写入边 |
| 验收标准 | 全部边正交 + 不穿非端点设备（集成测试断言）；SVG 不进回归 |
| 方案 | A：导入期确定性途经点布线，写 `edge.routePoints`，渲染层与路由引擎零改动 |

## 3. 架构与数据流

改动范围仅 `src/dotImport.ts`：

```
parseDot（不变）
  → collapseDotGraph（改：link 附带 via 途经点序列）
    → mapDotGraphToModel（改：端子对齐途经方向 + 母线投影端点 + 写 routePoints）
      → 渲染层（零改动）：编辑态 preserveManualRouteDisplay=true 原样展示存点
      → 拖动设备（零改动）：现有增量重布只重布被挡的边
```

### 3.1 collapse 保留途经点

- 每个 device→device link 新增 `via: Point[]`：链上黑点坐标按链序排列。
- 黑点仍不进 `devices`；拓扑、同名多实例消歧、自环/dangling 丢弃语义不变；`via` 随其 link 的存废（dangling 丢弃时一并丢弃）。
- 零长段压缩：相邻重复坐标的去重。

### 3.2 端子分配对齐途经方向

- 现状：`assignTerminal(node, 对端设备中心)` 按最近未占用端子。
- 改为：有 `via` 的边，参考点取**首个途经点**（源侧）/ **末个途经点**（目标侧）；无 `via` 的直连边维持现状。
- 母线侧：`terminalId` 仍留空（母线无端子），但 `sourcePoint/targetPoint` 显式取"相邻途经点向母线中心线的投影"（复用引擎已导出的 `projectPointToBusCenterline`），保证存点首末与渲染端点严格一致。

### 3.3 正交化与存储

- `routePoints = orthogonalize([start, ...via, end])`：补拐角、压共线与零长段。正交化为约十余行的纯函数，在 `dotImport.ts` 内实现（引擎内 `orthogonalizeRouteKeepingCollinear` 未导出，不为此改动引擎文件；语义一致：斜段取前点 x/后点 y 折角，共线与零长段压缩）。
- 途经链相邻点多已轴对齐（graphviz 正交布局产物）；斜段集中在首末腿（设备引脚偏移），拐角少量。
- `edge.routePoints` 存含端点的完整折线（与 `svgModelImport.ts` 同款语义，`appStateBatch.tsx` 编辑态 `preserveManualRouteDisplay: isEditMode` 原样展示）。

## 4. 边界情况

- **黑点与设备同坐标**（实测存在，如 n5 与 SW_92 重合）：零长段压缩；重合设备为本边端点时属正常连接，验收排除端点设备。
- **无 point 的旧 dot**：`via` 为空退化为现状，引擎渲染兜底，完全兼容。
- **电压继承 / 母线宽启发式 / 报告计数**：不受影响（拓扑与 devices 不变）；报告不新增字段（YAGNI）。
- **残留风险**：首末腿补拐角的小折线在极密区域可能擦碰第三方设备边框。以 §5 指标实测为准；个别未达标边留待二阶段局部修复（`repairRouteAroundBlockers`），不阻塞本次交付。

## 5. 测试与验收

- **单测**（最小 dot 构造）：途经点保留与排序、重合点压缩、端子朝向对齐、母线投影端点、正交化输出形状。
- **集成**（`src/__fixtures__/dot/望道变_6.dot`）：
  - 全部边 `routePoints` 存在、首末点与端点一致、**每段严格正交**（dx=0 或 dy=0）；
  - **不穿非端点设备比例 ≥95%**（基线 177/185 穿，即 ≤4%）；
  - 现有 dotImport 测试全部回归通过（边数、报告计数不变）。
- **目测验收**：导入望道变与 SVG 并排对比走线风格（不作为断言）。

## 6. 非目标

- 不改路由引擎（`model-routing.ts`）与渲染管线。
- 不解析 SVG、不逐边复刻其几何。
- 不处理用户后续编辑（拖动/手工布线）的走线质量——沿用现有交互机制。
- 报告（DotImportReport）不新增字段。

## 7. 实施约束

- 按 AGENTS.md：改动符号先跑 gitnexus impact，提交前 detect_changes 校验范围。
- 依赖管理一律 pnpm。
