# T01 model-routing.ts 审查报告

## 概览

| 项目 | 数值 |
|------|------|
| 总行数 | 12 333 |
| 发现总数 | 18 |
| 数据块占比估计 | ~8%（设定值映射表 L4950-5032、电压限制集合 L5034-5050、terminal anchor 查找表） |
| 逻辑代码行 | ~11 300 |
| export 函数 | ~90+ |
| 模块级 WeakMap 缓存 | 5 个 |

---

## P0 严重

### [P0-1] `resolveStraightBusSlideEndpointToPoint` 是死函数，调用者 `resolveStraightBusSlideEndpoint` 连锁失效

- 位置: src/model-routing.ts:8050-8066, 8068-8110
- 类型: bug / 死代码
- 描述: `resolveStraightBusSlideEndpointToPoint` 内部 `void options; return null;`，永远返回 null。`resolveStraightBusSlideEndpoint`（8068）调用它并返回其结果，因此也是恒定 null。但此函数为 `export`，外部调用者可能仍在使用其类型签名，形成"静默无操作"陷阱——用户拖拽 bus 端点时连线不会跟随滑动，却无任何报错。
- 建议: 确认外部是否仍有调用。若无，删除两个函数；若需保留类型签名，添加 `@deprecated` 注释或在函数体开头加 `console.warn` 使问题可见。

### [P0-2] `nearestBusRouteEndpointProjection` 逻辑缺陷：返回的不是最近投影

- 位置: src/model-routing.ts:3004-3022
- 类型: bug
- 描述: 函数名暗示返回"最近投影"，但实际逻辑是：设置 `nearestProjection` 为第一个有效投影后，遍历所有 segment 返回第一个"不等于 currentEndpointPoint"的投影，而非距离最近的。当路由有 10+ segment 时，返回的投影可能不是几何最近的，导致 bus 端点吸附到错误位置。
- 建议: 计算每个投影到 `endpointPoint` 的距离，真正返回 `nearestProjection`（用 `pointDistance` 比较），或在函数名和注释中明确语义为"第一个不同投影"。

### [P0-3] `while(changed)` 循环无安全迭代上限

- 位置: src/model-routing.ts:6594-6621
- 类型: bug
- 描述: `normalizeModelGroups` 中的 `while(changed)` 用于消除循环子组引用和空组。虽然每次迭代理应减少组数量，但在极端数据（如上千个组的嵌套层级）下无硬性退出条件。如果因数据损坏导致 `changed` 无法收敛，将造成 UI 线程阻塞。
- 建议: 添加 `maxIterations = normalized.length + 1` 作为安全阀，超出后 `console.warn` 并 break。

---

## P1 重要

### [P1-1] `prioritizeLaneValues` 中 `distanceToAnchor` 在 sort 比较函数内做 O(a) 线性扫描

- 位置: src/model-routing.ts:9364-9368
- 类型: 性能
- 描述: `distanceToAnchor` 每次调用遍历全部 `roundedAnchors` 求 `Math.min`。该函数在 `.sort()` 比较器中被调用，排序 N 个 lane 值产生 O(N log N) 次比较，总复杂度 O(N * A * log N)。此函数在每次路由候选生成时调用（`buildRouteCandidates`、`expandedCandidateLanes`），拖拽时高频触发。
- 建议: 预计算每个 value 到最近 anchor 的距离，用 Map 或数组缓存，再对缓存值排序。复杂度降为 O(N * A + N log N)。

### [P1-2] `selectCommitSafeRoute` 对每个候选路径重复调用 `filterBlockersForRoutePoints` 4 次

- 位置: src/model-routing.ts:11580-11598
- 类型: 性能
- 描述: 对每个 candidate，依次在 11582（simplify 前）、11591（simplify 后）、11592（avoidedSegments）、11598（scoreBlockers）四次调用 `filterBlockersForRoutePoints` 或 `filterSegmentsForRoutePoints`。每次调用涉及空间网格查询。当 candidates 数量大（典型 50-200）时，产生大量重复空间查询。
- 建议: 将 `filterBlockersForRoutePoints` 的结果在 simplify 前后各缓存一次，scoreBlockers 复用 simplify 后的 blockers 结果。

### [P1-3] `distanceToAnchor` 使用 `Math.min(...array)` spread 可能在大数组时栈溢出

- 位置: src/model-routing.ts:9364-9365
- 类型: 安全 / 效率
- 描述: `Math.min(...roundedAnchors.map(...))` 将映射结果 spread 到 `Math.min` 参数中。虽然当前 `roundedAnchors` 受 `ROUTE_MAX_LANES_PER_AXIS` 限制，但如果该常量被调整或移除，当 anchors 超过 ~100k 时将触发 `RangeError: Maximum call stack size exceeded`。
- 建议: 改用 `reduce` 或 `for` 循环求最小值，不依赖 spread。

### [P1-4] `expandedCandidateLanes` 大量硬编码魔数

- 位置: src/model-routing.ts:9530, 9541-9544
- 类型: 风格 / 可维护性
- 描述: `routeBlockerBox(node, 32)`、边界 lane 偏移 `[32, 64, 96, bounds.width - 96, ...]` 中的 32/64/96 均为裸数字。这些值控制路由搜索空间的边界距离，修改需要理解几何含义。出现 1 处定义、多处使用的情况。
- 建议: 提取为命名常量如 `ROUTE_BOUNDARY_PADDING_SMALL = 32`、`ROUTE_BOUNDARY_PADDING_MEDIUM = 64`、`ROUTE_BOUNDARY_PADDING_LARGE = 96`，集中定义在文件顶部常量区。

### [P1-5] `routeEdgesForStoredRendering` 中 `nonEndpointBlockers` 在循环内重复过滤

- 位置: src/model-routing.ts:10539
- 类型: 效率
- 描述: 对每条 floating edge 的 orthogonal 快速路径检测时，执行 `nodes.filter(n => n.id !== source.id && n.id !== target.id)`，产生 O(N) 数组分配。该过滤在 `directSegmentClearOfNodeBodies`（1031）和 `localOpposedBusRoutableLineRoute`（1032）等多处重复。当 edges 数量大时，每次路由渲染都重新分配该数组。
- 建议: 将 `nonEndpointBlockers` 过滤改为传入 `excludedNodeIds: Set<string>` 参数，在调用处构建一次 Set 后复用。

### [P1-6] `selectFullRouteCandidate` 内 `evaluateRoute` 闭包捕获外部变量，每次调用重建

- 位置: src/model-routing.ts:9743-9790
- 类型: 效率
- 描述: `evaluateRoute` 闭包在 `selectFullRouteCandidate` 每次调用时重新创建，捕获 `blockers`、`avoidedSegments`、`sourceId`、`targetId` 等变量。虽然 JS 引擎可能优化，但该函数在热路径中被调用多次。
- 建议: 将 `evaluateRoute` 提取为顶层函数，参数显式传入，避免闭包分配。

---

## P2 一般

### [P2-1] `nonEndpointBlockers` 过滤逻辑重复出现（至少 6 处）

- 位置: src/model-routing.ts:1032, 823, 881, 10539, 11578, 11591
- 类型: 重复
- 描述: `blockers.filter(b => b.id !== source.id && b.id !== target.id)` 或其变体在文件中至少出现 6 次。逻辑相同但写法微异（有的用 `edge.sourceId`，有的用参数）。
- 建议: 提取为 `excludeEndpointBlockers(blockers, sourceId, targetId): ModelNode[]` 工具函数。

### [P2-2] 模块级 WeakMap 缓存无主动清理机制

- 位置: src/model-routing.ts:7815, 7912, 7941, 9249, 9266
- 类型: 内存
- 描述: 5 个 WeakMap 缓存（`routeBlockerBoxCache`、`routableLineBlockerCanvasPointsCache`、`routableLineLabelBoxCache`、`blockerGridCache`、`segmentGridCache`）以节点/数组引用为 key。虽然 WeakMap 允许 GC 回收 key 引用的对象，但内部嵌套的 `Map<number, ...>` 在节点存活期间持续增长（不同 padding 值产生多个条目）。长时间运行（如用户频繁调整 padding 参数）可能导致内存占用上升。
- 建议: 对内部 Map 限制 padding 条目数（如最多保留 3 个最近使用的 padding），或提供 `clearRoutingCaches()` 函数供外部在适当时机调用。

### [P2-3] `createTerminals` 的 anchor 硬编码列表与 `safeCount` 分支重复

- 位置: src/model-routing.ts:1523-1555
- 类型: 重复 / 简化
- 描述: `safeCount === 1` 和 `safeCount === 2` 分别硬编码了特定 anchor 值，而 `safeCount > 2` 使用统一 anchor 数组的 slice。但 anchor 数组（1537-1546）的前两项与 case 1/2 的值不完全一致（case 1 用 `{x:0.5, y:0}`，数组第 0 项是 `{x:-0.5, y:0}`），存在语义分歧。
- 建议: 统一 anchor 策略，或添加注释说明为何 count=1/2 使用不同 anchor 布局。

### [P2-4] `pointDistance` 与 `Math.hypot` 功能重复

- 位置: src/model-routing.ts:566-568
- 类型: 简化
- 描述: `pointDistance(first, second)` 实现为 `Math.hypot(first.x - second.x, first.y - second.y)`，与直接调用 `Math.hypot` 等价。该函数在文件内被多处调用，但 `Math.hypot` 已在其他地方直接使用（如 2008、2011、2032 行）。
- 建议: 统一使用 `pointDistance` 或内联 `Math.hypot`，不要两种风格并存。

### [P2-5] `routeCorridor` 与 `routeBoundsFromPoints` / `boxFor` 功能高度重叠

- 位置: src/model-routing.ts:8112-8118
- 类型: 重复 / 抽象层次
- 描述: `routeCorridor(a, b, margin)` 返回 `{left, right, top, bottom}`，与 `boxFor`（~7870）和 `routeBoundsFromPoints` 功能相似（都是带 padding 的包围盒）。三者在文件中交替使用。
- 建议: 统一为一个 `expandBox(box, padding)` 或 `corridorForPoints(points, margin)` 函数。

### [P2-6] `validateTopology` 内部重新赋值参数 `nodes`/`edges`

- 位置: src/model-routing.ts:6047-6049
- 类型: 风格
- 描述: `nodes = synchronized.nodes; edges = synchronized.edges;` 重新赋值函数参数。虽然在 JS 中合法，但降低了可读性——后续代码中 `nodes`/`edges` 的含义已变化但变量名不变。
- 建议: 使用 `const effectiveNodes = synchronized.nodes; const effectiveEdges = synchronized.edges;` 或在函数开头解构后使用不同变量名。

### [P2-7] `segmentGridCache` 的失效条件不完整

- 位置: src/model-routing.ts:9266-9276
- 类型: bug
- 描述: `segmentGridCache` 存储 `{ length, padding, grid }`，仅当 `length === segments.length && padding === padding` 时复用。但如果 segments 数组内容改变而长度不变（如端点移动），缓存的 grid 包含过时的 box 数据，导致碰撞检测使用错误空间索引。
- 建议: 添加内容校验（如首尾 segment 的引用或 hash 检查），或在 segments 数组变化时由调用方负责清除缓存。

---

## P3 轻微

### [P3-1] 文件过大，单一模块承担过多职责

- 位置: src/model-routing.ts（全文件）
- 类型: 抽象层次
- 描述: 12 333 行文件包含：路由几何算法、拓扑验证、设备设定值推导、方案合并、图层/组管理、元素树构建、连接规则校验等至少 7 个不同职责。违反单一职责原则，增加理解和修改成本。
- 建议: 按职责拆分为 `routing-geometry.ts`、`topology-validation.ts`、`device-setpoints.ts`、`scheme-merge.ts`、`layer-group.ts`、`connection-rules.ts` 等模块。

### [P3-2] `terminalRefKey` 排序逻辑重复

- 位置: src/model-routing.ts:2160, 3307
- 类型: 重复
- 描述: `[terminalRefKey(a.nodeId, a.terminalId), terminalRefKey(b.nodeId, b.terminalId)].sort()` 在 2160 和 3307 行几乎完全相同。
- 建议: 提取为 `sortedTerminalPairRef(a, b)` 函数。

### [P3-3] 大量 `Object.prototype.hasOwnProperty.call` 可用 `in` 操作符简化

- 位置: src/model-routing.ts:4501-4512（及其他多处）
- 类型: 简化
- 描述: `Object.prototype.hasOwnProperty.call(params, "source_vbase")` 重复出现。由于 `params` 是 `Record<string, string>` 类型（纯对象），使用 `"source_vbase" in params` 或 `Object.hasOwn(params, "source_vbase")`（ES2022）更简洁。
- 建议: 如果不需要防御原型链污染（Record 类型已是纯对象），改用 `Object.hasOwn(params, key)`。

### [P3-4] 部分函数参数过多（>8 个）

- 位置: src/model-routing.ts:8050-8062（`resolveStraightBusSlideEndpointToPoint`，10 个参数的 options 对象）、9723-9734（`selectFullRouteCandidate`，9 个参数）
- 类型: 风格
- 描述: 部分函数参数数量过多，降低可读性和调用安全性（容易传错参数顺序）。
- 建议: 将相关参数组合为具名选项对象（如 `RouteCandidateOptions`）。

---

## 统计

| 优先级 | 数量 |
|--------|------|
| P0 严重 | 3 |
| P1 重要 | 6 |
| P2 一般 | 7 |
| P3 轻微 | 4 |
| **合计** | **18** (20 个具体发现点) |
