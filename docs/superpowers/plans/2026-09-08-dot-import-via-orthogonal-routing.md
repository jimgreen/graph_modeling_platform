# dot 导入设备朝向与正交布线实现计划

> **For agentic workers:** 每任务按 TDD：先写测试（断言按各任务断言表）、跑失败、实现、跑绿、提交。建议 superpowers:subagent-driven-development 或 superpowers:executing-plans 逐任务执行。Steps 用 checkbox 跟踪。

**Goal:** 在已落地的 dot 基础导入（parseDot → classify → collapse → mapDotGraphToModel）之上，新增设备朝向（旋转）与锚点到锚点正交布线（≤2 拐点），使导入后走线全部正交、每边拐点 ≤2、不穿第三方设备为软目标（拐点预算内尽力避让）。

**Architecture:** 改动集中在 `src/dotImport.ts` 的 map 阶段（collapse 阶段语义不变）。朝向参考（相邻收缩节点方位）从原始图直接提取，仅用于设备 `rotation` 判定，**不作为 routePoints 途经点**。复用引擎已导出 `getTerminalPoint`（旋转感知端子世界点）与 `projectPointToBusCenterline`（母线投影）；新增本地纯函数 `orthogonalRouteWithinCorners` 做锚点到锚点正交布线。

**Tech Stack:** TypeScript + Vitest。复用 model-routing 的 getTerminalPoint、projectPointToBusCenterline（均为已导出）。

**Spec:** `docs/superpowers/specs/2026-09-08-dot-import-via-orthogonal-routing-design.md`

## Global Constraints

| # | 约束 |
|---|---|
| G1 | ES Modules；测试与源文件同目录；单文件测试命令 `pnpm vitest run src/dotImport.test.ts` |
| G2 | 不改 model.ts / model-routing.ts / svgModelImport.ts；dotImport.ts 只 import 类型与既有导出函数（getTerminalPoint、projectPointToBusCenterline） |
| G3 | 每任务 TDD 五步 + 独立 commit |
| G4 | 旋转角度数值以 `getTerminalPoint` 的旋转语义为准（反解锚点朝向）；断言若与实跑不符，以实跑为准修正（同 G8 风格） |
| G5 | 拐点 ≤2 与每段正交为硬约束；不穿第三方设备为软规避（拐点预算内尽力，超预算接受交叉） |

---

### Task 1: 朝向参考提取 + 设备旋转（rotation）

**Files（表格）**

| 操作 | 路径 |
|---|---|
| Modify | src/dotImport.ts（map 段前追加朝向参考提取；实例化后写 rotation） |
| Modify | src/dotImport.test.ts（追加 describe 块） |

**Interfaces:**
- Produces（新增导出）: `deviceAdjacentReferencePoints(graph: DotGraph): Map<string, Point[]>` — 设备 label → 相邻收缩节点（point 黑点 / 绕组端子 box）坐标列表
- Consumes: DotGraph、classifyDotNode/buildClassifyContext（判 role）
- 类型沿用：Point（model）、DotNode/DotGraph（Task 已有）

**Steps:**

1. 写失败测试（断言表 B1）。
2. 跑失败（deviceAdjacentReferencePoints / rotation 未实现）。
3. 实现要点：
   - 参考点提取：对每条 `graph.edges`，若一端 role=device、另一端 role∈{collapse, winding-terminal}，把后者坐标 push 进该 device 的参考点列表（键=device label）。
   - 方位判定：`dx = ref.x - device.x`、`dy = ref.y - device.y`；`|dx| >= |dy|` → 水平（dx<0 左 / dx>0 右），否则垂直（dy<0 上 / dy>0 下）。
   - 旋转映射：2 端子设备（默认锚点 (-0.5,0)/(0.5,0)）——水平 → rotation=0，垂直 → rotation=90。1 端子设备（默认锚点 (0.5,0)）——右 0 / 下 90 / 左 180 / 上 270。反解 `getTerminalPoint` 验证锚点朝向与参考方位一致。
   - 聚合：对侧双参考点（上+下 / 左+右）→ 唯一旋转；邻侧（上+右）或多参考点歧义 → 以首个参考点方位为准；无参考点（直连设备）→ rotation 保持 0。
   - map 中：实例化设备（createDefaultNode）之后、端子分配之前写 `node.rotation`。
4. 跑绿。
5. Commit 消息：`feat(dotImport): 设备朝向（旋转）——据相邻收缩节点方位`

**断言表 B1（朝向参考 + 旋转）**

| 输入（mini 构造） | 期望 |
|---|---|
| 垂直串：母线(上)→point→开关→point→断路器(下) | 开关 rotation=90，断路器 rotation=90 |
| 水平串：A→point→B（左右相邻） | A、B rotation=0 |
| 单 point 在设备上方（1 端子 ac-load） | load rotation=270（锚点朝上） |
| 单 point 在设备右侧 | rotation=0 |
| 设备直连设备（无 point） | rotation=0（退化） |
| deviceAdjacentReferencePoints（mini 图） | 键=设备 label，值为相邻 point 坐标列表 |

**Commit:** feat(dotImport): 设备朝向（旋转）

---

### Task 2: 端子分配对齐黑点方位 + 母线投影端点

**Files（表格）**

| 操作 | 路径 |
|---|---|
| Modify | src/dotImport.ts（重写 assignTerminal 段） |
| Modify | src/dotImport.test.ts（追加 describe 块） |

**Interfaces:**
- Consumes: getTerminalPoint、projectPointToBusCenterline（model-routing，已导出）；Task 1 的参考点与 rotation
- Produces: 无新导出；改 map 内边构造——端子按参考方位分配，端点用 getTerminalPoint / projectPointToBusCenterline 计算

**Steps:**

1. 写失败测试（断言表 B2）。
2. 跑失败。
3. 实现要点：
   - 参考点选择：对每条 link，源侧/目标侧各自取该设备「相邻收缩节点」为参考（无则退化为对端设备中心）。
   - 端子分配：在未占用端子中，选「旋转后锚点世界点（getTerminalPoint）与参考点方位最一致（同轴且同向）」者；不再按最近未占用端子。
   - 母线侧：`terminalId` 留空；`sourcePoint/targetPoint` = `projectPointToBusCenterline(bus, 相邻参考点)`。
   - 设备侧：`sourcePoint/targetPoint` = `getTerminalPoint(node, 分配端子)`，保证与渲染端点严格一致。
4. 跑绿。
5. Commit 消息：`feat(dotImport): 端子分配对齐黑点方位 + 母线投影端点`

**断言表 B2（端子/端点）**

| 输入 | 期望 |
|---|---|
| 垂直串 母线→开关（point 在开关上方） | 开关被分配朝上端子；母线侧 terminalId 留空 |
| 母线侧端点 | sourcePoint/targetPoint 落在母线中心线（y 与母线中心一致，经 projectPointToBusCenterline） |
| 设备侧端点 | 等于 getTerminalPoint(node, 分配端子)，且朝向相邻 point 方位 |

**Commit:** feat(dotImport): 端子分配对齐方位

---

### Task 3: 锚点到锚点正交布线（≤2 拐点）+ 交叉回退 + routePoints

**Files（表格）**

| 操作 | 路径 |
|---|---|
| Modify | src/dotImport.ts（追加正交布线纯函数 + 边构造写 routePoints） |
| Modify | src/dotImport.test.ts（追加 describe 块） |

**Interfaces:**
- Produces（新增导出）: `orthogonalRouteWithinCorners(start: Point, end: Point, blockers: ModelNode[], excludedIds: string[], maxCorners = 2): Point[]`
- Consumes: Point、ModelNode（model）；start/end 来自 Task 2 端点；blockers = 全设备 nodes

**Steps:**

1. 写失败测试（断言表 B3）。
2. 跑失败。
3. 实现要点：
   - 候选枚举：直连（start/end 同轴，0 拐）→ L 形两条（1 拐，经 (end.x, start.y) 与 (start.x, end.y)）→ Z 形若干（2 拐，两条 lane 折角）。
   - 穿设备判定：折线段与第三方设备包围盒相交（排除端点设备 id，excludedIds）。可复用引擎已导出 `routeIntersectsSpecificNodes`，或本地线段-包围盒相交判定。
   - 评分排序：①不穿第三方设备优先 ②拐点少优先 ③路径短优先；全部候选都穿 → 取拐点少/路径短者（接受交叉）。
   - 每段严格正交：直连/L/Z 候选天然满足（dx=0 或 dy=0）。
   - map 中：每条 link 算 start/end → orthogonalRouteWithinCorners → 写 `edge.routePoints`（含端点完整折线）。
4. 跑绿。
5. Commit 消息：`feat(dotImport): 锚点到锚点正交布线（≤2 拐点）+ 交叉回退`

**断言表 B3（正交布线）**

| 输入 | 期望 routePoints |
|---|---|
| start/end 同 x 或同 y | 直连 2 点（0 拐） |
| start/end 异轴、无阻挡 | L 形 3 点（1 拐） |
| L 形穿第三方设备、Z 形可避让 | 选 Z 形（2 拐），每段正交 |
| ≤2 拐内全穿 | 接受交叉，取拐点少/短者；每段正交 |

**Commit:** feat(dotImport): 锚点到锚点正交布线

---

### Task 4: 集成测试（fixture 全链路）+ 全量回归

**Files（表格）**

| 操作 | 路径 |
|---|---|
| Modify | src/dotImport.test.ts（追加集成 describe 块） |

**Interfaces:**
- Consumes: importDotFile（已有）、fixture（Task 已有）

**Steps:**

1. 写集成测试（断言表 B4）。
2. 跑 `pnpm vitest run src/dotImport.test.ts` 全绿。
3. 全量回归：`pnpm vitest run` 全套 + `pnpm tsc --noEmit`。
4. Commit 消息：`test(dotImport): 朝向+正交布线 fixture 集成测试`

**断言表 B4（fixture 集成）**

| 断言点 | 期望 |
|---|---|
| 全部边 routePoints 存在、首末点与 sourcePoint/targetPoint 一致 | 100% |
| 每段严格正交（dx=0 或 dy=0） | 100% 硬断言，无例外 |
| 每边拐点 ≤2 | 100% 硬断言，无例外 |
| 设备 rotation 已写入 | 存在 rotation≠0 的设备（朝向生效） |
| 旋转后端子锚点与相邻收缩节点方位一致 | 抽查若干设备成立 |
| 穿第三方设备边数 | 统计并打印（软指标，不设硬门槛） |
| 现有 dotImport 测试（边数 185 / 报告计数）回归 | 全绿 |
| pnpm tsc --noEmit | 无错误 |

**Commit:** test(dotImport): 朝向+正交布线集成测试

---

## 自审清单（执行完成后）

| # | 检查项 |
|---|---|
| S1 | spec §3 全落地：朝向参考提取、旋转、端子对齐、母线投影、≤2 拐点布线、交叉回退、routePoints |
| S2 | spec §4 边界：黑点同坐标（方位零向量不参与）、邻侧歧义（首参考点为准）、变压器本体朝向、无 point 退化、拐点 vs 交叉取舍 |
| S3 | G4 旋转角度以 getTerminalPoint 实跑为准修正断言 |
| S4 | 全量 vitest + tsc 绿；四个任务独立 commit；不改 model.ts / model-routing.ts / svgModelImport.ts |
| S5 | SVG 导入管线未受影响（svgModelImport 相关测试仍绿） |
