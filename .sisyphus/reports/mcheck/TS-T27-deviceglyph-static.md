# T27 DeviceGlyph + static 渲染审查报告

## 概览

| 维度 | 数值 |
|------|------|
| 文件数 | 6 |
| 总行数 | 3 265 |
| 发现总数 | 21 |
| P0 严重 | 0 |
| P1 重要 | 5 |
| P2 一般 | 10 |
| P3 轻微 | 6 |
| 数据块占比估计 | DeviceGlyph.tsx 中 SVG path 硬编码数据约占 55%–60%（~1 100 行纯 SVG 路径/坐标常量） |

### 文件清单

| 文件 | 行数 | 大小 |
|------|------|------|
| `src/DeviceGlyph.tsx` | 1 998 | ~90 KB |
| `src/DeviceGlyph.test.tsx` | 349 | ~14 KB |
| `src/staticRenderUtils.tsx` | 292 | ~12 KB |
| `src/staticRenderUtils.test.tsx` | 28 | ~1 KB |
| `src/staticConnectorCurves.ts` | 118 | ~4 KB |
| `src/EFileEditor.tsx` | 480 | ~20 KB |

---

## P0 严重

无。

---

## P1 重要

### [P1-1] DeviceGlyph 巨型 if-chain 应数据驱动化

- 位置: `src/DeviceGlyph.tsx:800–1998`（约 1 200 行）
- 类型: 抽象层次
- 描述: `DeviceGlyphComponent` 主体是数十个 `if (glyphVariant === "xxx")` 顺序分支，每个分支结构高度雷同（检查 mode → 计算尺寸 → 返回 `<g>` + SVG 元素）。新增/修改图元需深入千行代码，认知负担极高且易引入回归。
- 建议: 建立 `Record<GlyphVariant, (ctx: GlyphRenderContext) => ReactNode>` 注册表，将每个图元的渲染逻辑抽为独立函数或文件（如 `glyphs/acShuntCapacitor.tsx`），主函数只做 dispatch。

### [P1-2] DeviceGlyph 大列表渲染无 useMemo/useCallback 优化

- 位置: `src/DeviceGlyph.tsx:1–1998`（全文件）
- 类型: 性能
- 描述: 组件虽然 `memo` 包裹，但内部每次渲染都重新执行 `estimateSvgTextWidth`、`pointsToOrthogonalPath`、`routableLineDeviceRenderLocalPoints` 等开销函数以及大量三角函数/坐标计算。当画布渲染数百个 device glyph 时，任何父级 state 变更都会触发全部 glyph 重算。
- 建议: 对纯派生量（text width、path 坐标、counter-transform matrix）使用 `useMemo`；将纯计算函数移至组件外部或通过 `useCallback` 稳定引用。

### [P1-3] EFileEditor handleDoubleClickCell 剪贴板 fallback 代码重复

- 位置: `src/EFileEditor.tsx:188–206`
- 类型: 重复
- 描述: `navigator.clipboard.writeText` 的 `.catch` 分支（L188-196）与 `else` 分支（L199-206）是几乎完全相同的 textarea 创建 → `execCommand("copy")` → 清理逻辑，违反 DRY。
- 建议: 提取 `fallbackCopy(text: string): boolean` 工具函数，两处统一调用。

### [P1-4] EFileEditor 表格渲染无子组件拆分，全表内联 JSX

- 位置: `src/EFileEditor.tsx:378–475`
- 类型: 抽象层次 / 性能
- 描述: 整个 `<table>` 包括 `<thead>` tooltip、列宽 resizer、`<tbody>` 每行的编辑/查看双模式、引用跳转按钮等全部内联在 `EFileEditor` 的 return 中。任何 state 变化（tooltip、copiedCell、colWidths）都会导致全表 diff。
- 建议: 将 `EFileHeader`、`EFileRow`、`EFileCell` 抽为独立 `memo` 组件，以 `recordId`/`col` 为 key，减少不必要的 re-render。

### [P1-5] EFileEditor editedRecords 派生状态反模式

- 位置: `src/EFileEditor.tsx:115,144–146`
- 类型: bug
- 描述: `useState(records)` 初始化后通过 `useEffect` 同步外部 `records` prop 变化。这是 React 官方文档明确标注的 anti-pattern（"Deriving State from Props"），在 `records` 和 `editedRecords` 之间可能产生一帧延迟和不一致，尤其在 `records` 频繁更新时。
- 建议: 使用 `useRef` 记录上一次 `records` 引用，在 render 阶段同步比较并重置 `editedRecords`；或引入 `key` 属性强制重建组件。

---

## P2 一般

### [P2-1] DeviceGlyph 大量 magic number 散布于 SVG 路径

- 位置: `src/DeviceGlyph.tsx:1000–1900`（散布全文件 SVG path `d` 属性）
- 类型: 风格
- 描述: SVG 路径中出现数十个裸数字如 `0.58`、`0.18`、`2.8`、`2.4`、`-8`、`14`、`-7`、`-18`、`-25` 等，无语义命名。修改某个图元尺寸时难以理解数字含义，也容易导致不同图元之间风格不一致。
- 建议: 将通用尺寸常量（如 `GLYPH_STROKE_WIDTH = 2.8`、`TERMINAL_GAP = 8`）提取到文件顶部常量区或独立的 `glyphConstants.ts`。

### [P2-2] DeviceGlyph `mode === "text"` 检查重复数十次

- 位置: `src/DeviceGlyph.tsx`（几乎每个 glyphVariant 分支开头）
- 类型: 重复
- 描述: 绝大多数 `if (glyphVariant === "xxx")` 分支的第一行都是 `if (mode === "text") return null;`，重复约 30+ 次。
- 建议: 在主 dispatch 函数顶部加一次 `if (mode === "text") return renderTextOnly(node);` 统一处理，各分支不再关心 mode。

### [P2-3] DeviceGlyph node.kind.includes() 与 glyphVariant 检测方式不一致

- 位置: `src/DeviceGlyph.tsx:1535,1548,1561`
- 类型: 风格
- 描述: 大部分图元通过 `glyphVariant` 精确匹配，但 `wind-source`、`pv-source`、`diesel-source` 使用 `node.kind.includes("...")`。`includes` 可能匹配到非预期的 kind（如 `"my-wind-source-custom"`），与其他分支的判定逻辑不一致。
- 建议: 统一使用 `glyphVariant` 匹配，或在 `baseDeviceKind` / `getDeviceGlyphVariant` 中处理 kind → variant 映射。

### [P2-4] DeviceGlyph deviceVisualReplacesGlyph 字符串转数字比较脆弱

- 位置: `src/DeviceGlyph.tsx:74–77`
- 类型: 错误处理
- 描述: `String(stateVisual?.imageCleared ?? "").trim() === "1"` 将可能的 number/undefined 先转 String 再 trim 再与 `"1"` 比较。params 中值均为字符串，但 `stateVisual.imageCleared` 类型不明确，这种写法容易在类型变化时静默失败。
- 建议: 明确 `imageCleared` 类型后使用 `Number(...) === 1` 或 `=== "1"` 直接比较，并添加类型守卫。

### [P2-5] staticRenderUtils nodeCounterTransformMatrix 每次渲染重算三角函数

- 位置: `src/staticRenderUtils.tsx:14–28`
- 类型: 性能
- 描述: `Math.cos`/`Math.sin` 在每次调用 `uprightText` 时重新计算。对于旋转角度不变的 node，这是冗余开销。在大画布场景下每个 glyph 可能调用多次 `uprightText`。
- 建议: 在 `DeviceGlyph` 层面用 `useMemo` 缓存 counter-transform matrix，以 `node.rotation`、`scaleX`、`scaleY` 为依赖。

### [P2-6] staticRenderUtils resolveStateVisualImageHref 无缓存

- 位置: `src/staticRenderUtils.tsx`（`resolveStateVisualImageHref` 函数）
- 类型: 性能
- 描述: 该函数每次调用都执行 `inlineBackendImageRefsInSvgDataUrl`，对可能很大的 SVG data URL 做字符串替换。在 state icon 频繁重绘的场景下（如状态切换动画），这是性能隐患。
- 建议: 在调用侧使用 `useMemo` 缓存结果，或以 `visual.image` + cache map key 做简易 memo。

### [P2-7] EFileEditor handleJumpToReference BigInt 内联计算

- 位置: `src/EFileEditor.tsx:228–229,457–458`
- 类型: 简化
- 描述: `BigInt(String(targetValue ?? "").trim()) - (BigInt(String(tableId).trim()) << 48n)` 在 L228-229 和 L457-458 两处重复出现，且可读性差。
- 建议: 提取 `extractRowFromRtdbId(value: string, tableId: string): number` 工具函数。

### [P2-8] EFileEditor showProtectedToast / getFieldCnName 未 useCallback

- 位置: `src/EFileEditor.tsx:283–295`
- 类型: 性能
- 描述: `getFieldCnName` 和 `showProtectedToast` 定义为普通函数，每次 render 重新创建。它们作为 props 传递给子元素或在事件 handler 中引用，导致不必要的子组件 re-render。
- 建议: 使用 `useCallback` 包裹，或将不依赖闭包变量的 `getFieldCnName` 移至组件外部。

### [P2-9] EFileEditor handleResizeStart document 事件监听未处理 unmount 清理

- 位置: `src/EFileEditor.tsx:175–176`
- 类型: 内存
- 描述: `pointermove`/`pointerup` 事件监听器挂载到 `document`，仅在 `pointerup` 时移除。如果组件在拖拽过程中 unmount（如用户切换 tab），监听器将泄漏。
- 建议: 增加 `useEffect` cleanup，在 unmount 时调用 `handleUp()` 清理残留监听器。

### [P2-10] DeviceGlyph shunt/series capacitor+reactor 近似重复

- 位置: `src/DeviceGlyph.tsx:1009–1044,1046–1080`
- 类型: 重复
- 描述: `ac-shunt-capacitor`/`ac-shunt-reactor` 与 `ac-series-capacitor`/`ac-series-reactor` 两组分支结构高度相似（同为先判 mode → 计算 extent/位置 → 按 capacitor vs reactor 分叉渲染），仅 SVG 路径不同。
- 建议: 合并为一个 `renderCompensator(type, orientation)` 函数，路径数据作为参数传入。

---

## P3 轻微

### [P3-1] DeviceGlyph.test.tsx 设备图元变体测试覆盖不足

- 位置: `src/DeviceGlyph.test.tsx:1–349`
- 类型: 效率
- 描述: 测试仅覆盖 static connector、static text/rect frame style params 和 state icon 绘制。数十个设备图元变体（ac-shunt-capacitor、heat-pump、wind-source、pv-source、diesel-source 等）均无渲染回归测试。
- 建议: 增加参数化测试，对每个 `glyphVariant` 至少验证其 `renderToStaticMarkup` 输出包含预期的关键 SVG 元素。

### [P3-2] staticRenderUtils.test.tsx 仅一个测试用例

- 位置: `src/staticRenderUtils.test.tsx:1–28`
- 类型: 效率
- 描述: 仅测试 `resolveStateVisualImageHref` 的 backend image ref 内联。`uprightText`、`staticShapeText`、`renderBusGlyphRect` 等导出函数均无测试。
- 建议: 补充关键渲染工具函数的单元测试。

### [P3-3] staticConnectorCurves.ts 代码整洁

- 位置: `src/staticConnectorCurves.ts:1–118`
- 类型: 风格
- 描述: 文件结构清晰，`EXPLICIT_FINISH_KINDS` 使用 Set 做 O(1) 查找，`svgNumber` 精度处理合理。无明显问题。
- 建议: 无需改动。

### [P3-4] EFileEditor protectedToastTimer 无 unmount 清理

- 位置: `src/EFileEditor.tsx:122,294`
- 类型: 内存
- 描述: `protectedToastTimer` ref 持有的 `setTimeout` ID 在组件 unmount 时未清除，可能导致 setState on unmounted component 警告。
- 建议: 添加 `useEffect(() => () => { if (protectedToastTimer.current) clearTimeout(protectedToastTimer.current); }, [])`。

### [P3-5] EFileEditor REFERENCE_FIELD_MAP 与 model-eexport 部分信息重复

- 位置: `src/EFileEditor.tsx:38–79`
- 类型: 重复
- 描述: `REFERENCE_FIELD_MAP` 中部分字段（如 `st_id`、`bv_id` 等实时库引用）的映射目标与 `E_REFERENCE_FIELD_TABLE_IDS` 存在信息重叠。维护两份映射容易出现不一致。
- 建议: 考虑统一为单一数据源，`REFERENCE_FIELD_MAP` 仅保留非实时库的旧字段映射。

### [P3-6] DeviceGlyph.tsx 文件体量过大

- 位置: `src/DeviceGlyph.tsx`（1 998 行 / ~90 KB）
- 类型: 效率
- 描述: 单文件承载了全部设备图元渲染逻辑，包含 SVG 路径数据表、坐标计算、文本渲染等职责。IDE 加载、code review、merge conflict 成本均很高。
- 建议: 按图元族（电力设备 / 热力设备 / 新能源 / 静态图形 / 层级模型）拆分为独立文件，主文件仅保留 dispatch 逻辑和公共类型定义。
