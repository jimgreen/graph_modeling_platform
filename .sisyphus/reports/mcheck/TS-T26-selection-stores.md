# T26 selectionActions + stores 审查报告

## 概览

| 维度 | 数值 |
|------|------|
| 文件数 | 4 |
| 总行数 | 4445 (selectionActions.ts 1601 + selectionActions.test.ts 1248 + graphStore.ts 1227 + routeStore.ts 369) |
| 发现总数 | 15 |
| P0 严重 | 0 |
| P1 重要 | 5 |
| P2 一般 | 6 |
| P3 轻微 | 4 |

---

## P0 严重

无。

---

## P1 重要

### [P1] buildOverlapComponents 对每对 item 做 O(n²) 碰撞检测
- 位置: selectionActions.ts:1389-1416
- 类型: 性能
- 描述: BFS 连通分量构建中，每个出栈元素线性扫描全部 items 调用 `rectCollectionsOverlap`（本身又是 O(r₁×r₂)）。当 auto-spread 选中 200+ 图元时，该函数成为主瓶颈，耗时随 n² 增长。
- 建议: 用 sweep-line 或均匀网格预筛选候选对，将 pair 枚举降到 O(n·k)（k 为平均邻域数），仅在候选对上执行精确 rect 重叠判定。

### [P1] selectGraphicsInRect 全量线性扫描，未利用空间索引
- 位置: selectionActions.ts:111-121
- 类型: 效率
- 描述: 框选操作对全部 nodes 和 routedEdges 做 `.filter` 遍历。`graphStore` 已维护 `GraphNodeSpatialIndex`，但此处完全未使用；大图（数千节点）下每次框选代价 O(N+E)。
- 建议: 将 `nodeSpatialIndex` 传入 `selectGraphicsInRect`（或提供重载），先用 `queryGraphStoreNodeSpatialIndex` 粗筛，再对候选做精确 `rectContainsRect` 校验。

### [P1] nearestNonOverlappingDelta 退化环搜索为三重循环
- 位置: selectionActions.ts:1319-1332
- 类型: 性能
- 描述: 当基于已有坐标的候选值均未找到无重叠位置时，回退到 ring 枚举（maxRing ≈ √placed + 8），每个 ring 内 O(ring²) 候选，每个候选调用 `overlapsAny`（遍历所在桶内全部矩形）。当 placedGrid.rects 达到数百时，该搜索可能执行数万次重叠检测。
- 建议: 限制 maxRing 上限（如 20）；或在 ring 搜索无果时回退到固定偏移（如 "向右下偏移一个尺寸"），避免无限扩大搜索半径。

### [P1] expandSelectionByGroups 定点迭代在每轮重扫全部 groups
- 位置: selectionActions.ts:305-327
- 类型: 效率
- 描述: `while(expanded)` 循环中，每轮对所有 groups 调用 `collectGroupTreeMembers`。若 N 层嵌套组逐步展开，复杂度为 O(groups × depth × memberCount)。深层嵌套组场景下会产生大量重复遍历。
- 建议: 预先计算每个 group 的 transitive member 闭包（或至少缓存已展开的 group），使每个 group 只被完全遍历一次。

### [P1] boundsForNodesAndEdges 使用 spread + Math.min/max 分配临时数组
- 位置: selectionActions.ts:738-756
- 类型: 效率
- 描述: `Math.min(...edgePoints.map(p => p.x))` 先创建完整映射数组再展开到 call stack。当 edgePoints 达数千点时，既浪费内存也可能触发 call stack 限制（V8 约 65k 参数）。`boxes` 同理。
- 建议: 改用单次 `for` 循环维护 left/right/top/bottom 极值，避免中间数组和 spread 调用。

---

## P2 一般

### [P2] EMPTY_CANVAS_CLIPBOARD 为可变共享引用
- 位置: selectionActions.ts:55-59
- 类型: bug
- 描述: 导出的常量对象 `{ nodes: [], edges: [], groups: [] }` 未冻结。若任意消费方意外 `push` 到其数组属性，将污染所有后续引用该常量的位置，产生隐蔽的全局状态 bug。
- 建议: 使用 `Object.freeze` 冻结常量及其子数组，或在返回空剪贴板时始终构造新对象（`{ nodes: [], edges: [], groups: [] }`）。

### [P2] spatialBucketKey 每次查询产生大量字符串分配
- 位置: graphStore.ts:71, routeStore.ts:33
- 类型: 效率
- 描述: `${x}:${y}` 模板字符串在空间索引的构建、查询、更新中被高频调用。每次框选查询可产生数百个临时字符串，增加 GC 压力。
- 建议: 改用数值编码（如 `x * 73856093 ^ y * 19349663` 或 `(x << 16) | (y & 0xFFFF)`，注意坐标范围），以 number 作 Map key 显著减少分配。

### [P2] graphNodeRenderBounds 用对角线长度构造正方形包围盒，过度近似
- 位置: graphStore.ts:82-97
- 类型: 效率
- 描述: `halfDiagonal = Math.hypot(w, h) / 2 + 24` 然后以 position 为中心构造正方形。对于狭长节点（如 200×20），正方形面积远超实际节点面积，导致空间索引桶内包含更多无关节点，降低查询精度。
- 建议: 使用 `labelAwareBounds`（已有的 `calculateNodeVisualBounds`）的实际 left/right/top/bottom，仅在无标签信息时回退到对角线近似。

### [P2] graphStore 修订号计算对 nodes/edges 各迭代 4 次
- 位置: graphStore.ts:539-663
- 类型: 重复
- 描述: `nextElementTreeRevisionForNodes`、`nextRouteGeometryRevisionForNodes`、`nextTopologyRevisionForNodes` 各自独立遍历全部 nodeList，对 edges 同理。每次 `graphStoreSetNodes` / `graphStoreSetEdges` 调用触发 3-4 次完整遍历。
- 建议: 合并为单次遍历，在一个 `for` 循环内同时计算四个修订号是否需要递增。

### [P2] 测试文件大量重复 createDefaultNode 模式，缺乏 fixture 抽象
- 位置: selectionActions.test.ts:520-540, 543-560, 1113-1120 等多处
- 类型: 重复
- 描述: 几乎每个 test case 都重复编写 `createDefaultNode("ac-source", { x: 100, y: 100 })` + group 构建代码，导致测试文件膨胀到 1248 行，且修改节点结构时需要同步改动数十处。
- 建议: 提取 `makeTestNode(kind, position)` 和 `makeTestGroup(members)` 工厂函数，或定义 `TestFixture` 对象在 `beforeEach` 中初始化标准场景。

### [P2] edgeStoredPoints 每次调用都创建新数组
- 位置: selectionActions.ts:724-730
- 类型: 效率
- 描述: `[edge.sourcePoint, ...(edge.manualPoints ?? []), edge.targetPoint].filter(...)` 在 `boundsForNodesAndEdges` 的每条边处理中都会分配数组。在边数较多且 `boundsForNodesAndEdges` 被频繁调用时产生不必要的 GC 压力。
- 建议: 改用迭代器或直接内联极值计算，避免中间数组构造。

---

## P3 轻微

### [P3] rectWidth / rectHeight 以 Math.max(1, ...) 静默修正退化矩形
- 位置: selectionActions.ts:1172-1178
- 类型: 风格
- 描述: 零宽/零高矩形被静默改为最小 1，可能导致 spread/align 的几何计算基于修正后的尺寸而非真实尺寸，产生微妙的布局偏差。调用方无法感知矩形已退化。
- 建议: 在调用方（`balancedGridShape` 等）显式处理退化情况，或添加注释说明此处修正的意图和影响范围。

### [P3] routeContainedInRect 对空 points 返回 false
- 位置: selectionActions.ts:107-109
- 类型: 错误处理
- 描述: `points.length > 0 && points.every(...)` — 空路由（0 点）不被选中，这在语义上可能正确，但未路由的边是否应该被框选取决于业务语义。当前行为是静默忽略，没有文档说明。
- 建议: 添加注释说明空点路由的框选语义，或考虑对未路由边使用源/目标点作为 fallback 选择判定。

### [P3] nextGroupName 线性扫描命名空间
- 位置: selectionActions.ts:347-354
- 类型: 效率
- 描述: `new Set(groups.map(g => g.name))` 构建全量名称集合，然后从 1 递增查找。当组合数较多时，O(G) 的 Set 构建和线性递增查找效率不高。
- 建议: 若组合数量大，可用更高效的命名策略（如 UUID 后缀或基于 ID 的命名），或在组数少时保持现状（实际场景组数通常有限，影响不大）。

### [P3] 测试中使用非空断言 `!` 绕过类型检查
- 位置: selectionActions.test.ts:1063, 1065-1066
- 类型: 风格
- 描述: `delta!.x`、`delta!.y` 使用非空断言，若 `deltas.get("measurement-1")` 返回 undefined，测试将在运行时抛出而非给出有意义的断言失败信息。
- 建议: 先用 `expect(delta).toBeDefined()` 确认存在后，使用 `const { x, y } = delta!` 在单独变量中解构，或使用 `expect(delta?.x).toBe(...)` 链式可选链。
