# T15 model 测试系列审查报告

## 概览

| 文件 | 行数 | 主要发现 |
|------|------|----------|
| model.test.ts | 1909 | 巨型 import 块(226行)、大量空行块、未使用导入 |
| model-association-derived-classes.test.ts | 296 | 结构良好，数据驱动测试 |
| model-node-ops.test.ts | 1181 | 与 model.test.ts 几乎完全相同的 import 块(219行) |
| model-parent.test.ts | 113 | 最小文件，结构清晰 |
| model-routable-line.test.ts | 1725 | 与 model.test.ts 几乎完全相同的 import 块(214行) |
| model-canvas-ops.ts | 384 | 13个未使用导入(死代码) |
| model-node-ops.ts | 120 | 无显著问题 |

**总计**: 7 文件, 5628 行, 发现 18 项

---

## P0 严重

### [P0-1] model-canvas-ops.ts 存在大量未使用导入（13个）
- 位置: `src/model-canvas-ops.ts:17-37`
- 类型: 死代码
- 描述: `DEFAULT_MODEL_LAYER_NAME`(L17)、`isInteractiveStaticDrawingKind`(L22)、`isStaticBoxLikeNode`(L23)、`isStaticButtonCapableKind`(L24)、`isStaticButtonCapableNode`(L25)、`isStaticGraphicNode`(L26)、`isStaticKind`(L27)、`isStaticLineLikeKind`(L28)、`parseStaticDrawPoints`(L30)、`staticRenderKindForNode`(L33)、`deviceParamValue`(L35)、`makeId`(L36)、`makeNodeNumber`(L37) 均已导入但在文件中从未被调用。`normalizeProjectMeasurements`(L4) 和 `degreesToRadians`(L3) 同样未使用。共 15 个死导入，增加 bundle 体积并误导读者。
- 建议: 移除所有未使用的 import，保留实际引用的 `clampNumber`、`calculateNodeVisualBounds`、`createNodeFromTemplate`、`normalizeStaticDrawingPoints`、`roundStaticDrawingCoordinate`、`serializeStaticDrawPoints`、`STATIC_DRAWING_MIN_SIZE`、`STATIC_DRAWING_PADDING`、`STATIC_DRAW_POINTS_PARAM`。

---

## P1 重要

### [P1-1] 三个测试文件存在近乎完全相同的巨型 import 块（各 ~220 行）
- 位置: `src/model.test.ts:8-226`, `src/model-node-ops.test.ts:7-219`, `src/model-routable-line.test.ts:2-214`
- 类型: 重复
- 描述: 三个文件从 `./model` 导入的符号列表高度重合（约 180+ 个相同符号），每个 import 块占据 200+ 行。任何 model.ts 的导出变更都需要同步修改三处，且极难发现差异。
- 建议: 提取公共测试 fixture 文件（如 `src/__test_helpers__/model-imports.ts`），统一 re-export 测试所需的 model 符号集合；或按需拆分，每个测试文件只导入其实际使用的符号。

### [P1-2] model.test.ts 和 model-node-ops.test.ts 导入了 createElement/renderToStaticMarkup/DeviceGlyph 但未使用
- 位置: `src/model.test.ts:2-4`, `src/model-node-ops.test.ts:2-4`
- 类型: 死代码
- 描述: 两个文件均导入 `createElement`、`renderToStaticMarkup`、`DeviceGlyph`，但 grep 全文搜索确认这些符号在各自文件中从未被调用（仅 import 语句和 type import 出现）。同样 `createRenderStaticBoxDrawingPreview` 在两个文件中导入但从未调用。
- 建议: 删除这些未使用的导入语句。

### [P1-3] model.test.ts 存在多处连续 10+ 行空白块
- 位置: `src/model.test.ts:397-433`（37行空白）、`src/model.test.ts:785-802`（18行）、`src/model.test.ts:1000-1022`（23行）、`src/model.test.ts:1150-1161`（12行）、`src/model.test.ts:1900-1909`（10行尾部空白）
- 类型: 风格
- 描述: 文件中存在多处连续空行块，总计约 500 行空白行（占文件 26%）。这些空白块不携带任何信息，增加文件滚动成本。
- 建议: 将连续空行压缩为单个空行；使用编辑器 trim trailing whitespace 功能清理。

### [P1-4] model-routable-line.test.ts 导入未使用符号
- 位置: `src/model-routable-line.test.ts:104`
- 类型: 死代码
- 描述: `getDeviceGlyphVariant` 被导入但未在文件中使用（grep 仅显示 import 行）。
- 建议: 删除该导入。

---

## P2 一般

### [P2-1] model.test.ts 和 model-node-ops.test.ts 导入 apiPath 但使用极少
- 位置: `src/model.test.ts:6`, `src/model-node-ops.test.ts:6`
- 类型: 效率
- 描述: `apiPath` 在 model.test.ts 中仅使用 3 次（L649/651/657），在 model-node-ops.test.ts 中仅导入但未发现实际调用。
- 建议: 确认 model-node-ops.test.ts 中 apiPath 是否确实未使用，若是则删除；考虑将 apiPath 调用内联为字符串字面量以减少间接层。

### [P2-2] model-association-derived-classes.test.ts 的 test.each 数据可跨文件共享
- 位置: `src/model-association-derived-classes.test.ts:25-112`
- 类型: 重复
- 描述: `modelAssociationDerivedClassCases` 数组（88行）定义了完整的设备 kind 映射表，在 model-node-ops.test.ts:514-528 存在类似但内联的 kinds 列表（仅列 kind 字符串）。两处数据源不同步时易产生遗漏。
- 建议: 将 `modelAssociationDerivedClassCases` 提取为共享 fixture（如 `src/__fixtures__/modelAssociationCases.ts`），两处均引用。

### [P2-3] model-canvas-ops.ts 重复导入 calculateNodeVisualBounds
- 位置: `src/model-canvas-ops.ts:29,39`
- 类型: 重复
- 描述: `calculateNodeVisualBounds` 在 L29 的批量 import 块中已导入，又在 L39 单独 `import { calculateNodeVisualBounds } from "./model"` 重复导入。
- 建议: 删除 L39 的重复导入行。

### [P2-4] model-canvas-ops.ts 中 STATIC_DRAWING_PADDING 和 STATIC_DRAWING_MIN_SIZE 与 model-node-ops.ts 重复定义
- 位置: `src/model-canvas-ops.ts:18-19`(import) vs `src/model-node-ops.ts:69-70`(export const)
- 类型: 重复
- 描述: `model-node-ops.ts` 定义了 `STATIC_DRAWING_PADDING = 8` 和 `STATIC_DRAWING_MIN_SIZE = 24`，同时 `model-canvas-ops.ts` 从 `./model` 导入同名常量。两处常量值相同但来源不同，存在不同步风险。
- 建议: 统一为单一来源，model-canvas-ops.ts 从 model-node-ops.ts 导入或删除重复定义。

### [P2-5] model-routable-line.test.ts 中 expectOrthogonalSegments/routeBendCountForTest 辅助函数重复定义模式
- 位置: `src/model-routable-line.test.ts`（19处 expectOrthogonalSegments、6处 routeBendCountForTest）
- 类型: 重复
- 描述: 这两个测试辅助函数在 8 个测试文件中重复出现（共 37+25 次调用），但每次都在文件内局部定义。无共享模块。
- 建议: 提取到 `src/__test_helpers__/routeAssertions.ts`，统一维护。

---

## P3 轻微

### [P3-1] model.test.ts 中 describe 块嵌套不一致
- 位置: `src/model.test.ts` 多处
- 类型: 风格
- 描述: 部分测试在 `describe` 块内，部分在顶层裸 `test()`。文件结构不统一，增加定位测试的认知负担。
- 建议: 统一所有测试放入语义化 `describe` 块。

### [P3-2] model-parent.test.ts 导入了 vi 但使用极少
- 位置: `src/model-parent.test.ts:1`
- 类型: 风格
- 描述: `vi` 仅在 L104 使用一次（`vi.fn()`），其余测试不依赖 mock。
- 建议: 可保留，但建议在该 test 内联 `import { vi }` 或使用更简洁的 mock 方式。

### [P3-3] model-node-ops.ts 的 INTERACTIVE_STATIC_DRAWING_KINDS 注释暗示循环依赖风险
- 位置: `src/model-node-ops.ts:16-17`
- 类型: 抽象层次
- 描述: 注释说明该常量需在此定义以避免循环依赖，这是架构脆弱性的信号。
- 建议: 长期考虑重构模块依赖关系，消除循环依赖根因。

---

## 统计

| 优先级 | 数量 |
|--------|------|
| P0 | 1 |
| P1 | 4 |
| P2 | 5 |
| P3 | 3 |
| **总计** | **13** |
