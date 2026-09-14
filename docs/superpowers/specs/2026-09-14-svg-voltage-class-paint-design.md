# SVG 导出：电压等级着色改由 class 驱动

**日期**：2026-09-14
**状态**：设计已确认，待实施
**影响范围**：`src/export/svg.ts`、`src/DeviceGlyph.ts`、`src/svgExport.test.tsx`、`server/svgExport.test.mjs`

---

## 1. 背景与目标

前端导出的 SVG 里，电压等级着色**写死在 `<symbol>` 内部的 `fill`/`stroke` 呈现属性**上；挂在 `<use class="kv***">` 上的电压 class 完全不起作用。这导致下游系统无法通过覆盖 CSS class 动态修改电压等级配色 —— 他们只能拿到一份颜色被烤死的图。

**目标**：删除 `<symbol>` 内的电压等级着色，让电压配色**全部由 class 决定**，下游改一处 CSS 即可整体换色。

**非目标**：不改类名、不改 energy 配色模式、不改活画布、不改 E/CIM 导出。

---

## 2. 现状根因

### 2.1 颜色来源链路

```
DeviceGlyph (src/DeviceGlyph.ts:107)
  → getDeviceStrokeColor / getTerminalDisplayColor (src/model.ts:7601 / 7542)
  → voltageLevelColor (src/model.ts:7512)
  → VOLTAGE_LEVEL_COLORS 硬编码色表 (src/model.ts:7353-7370)
  → renderSvgElementMarkup 写成 <symbol> 内的字面 fill=/stroke=
```

### 2.2 class 为何失效

`svg.ts:503-517` 确实发出了 `.kv220{fill;stroke;stroke-width:1;color}` 这类规则，也确实把 class 挂到了 `<use>`（`svg.ts:769-771`、`:781`）和线路 `<path>`（`:575-592`）上。但：

- `<use class="kv220">` 上的 CSS 只能**继承**给它内部未声明颜色的元素；
- `<symbol>` 内每个图形都带自己的 `fill=`/`stroke=` 呈现属性（元素自身值），**继承值永远不参与竞争**。

所以 class 完全空转。

### 2.3 连带问题：symbol 按电压重复

symbol 去重签名 = `symbolBaseId + viewBox + 渲染正文`（`svg.ts:749-757`）。正文含电压色 → 同种图元的每个电压色各生成一份 symbol。

实测样本：

| 样本 | symbol 数 | use 数 | 重复情况 |
|---|---|---|---|
| `新建模型.svg` | 8 | 7 | 负荷 ×3、开关 ×2、母线 ×2 |
| `标准场站.svg` | 12 | 14 | 母线 ×2、负荷 ×2 |

### 2.4 难点：多端子器件

三绕组/两绕组主变的每个绕组、每根端子引线用的是**各自端子**的电压色（`DeviceGlyph.ts:1278`、`:1296`、`:1306` 的 `getTerminalDisplayColor`；引线见 `svg.ts:183`）。一个 `<use>` 只能提供一个继承色，表达不了同器件三色。

---

## 3. 机制设计（全部经 Chromium 实测）

### 3.1 探针结论

| 机制 | 结论 |
|---|---|
| 文档级 class 选择器命中 `<symbol>` 内部元素 | ✅ 命中 |
| `circle:nth-of-type(N)` 命中 `<symbol>` 内部元素 | ✅ 命中 |
| 无属性元素继承 `<use class="kvN">` 的 `stroke`/`fill`/`color` | ✅ 继承 |
| `.kv1000 circle:nth-of-type(1)`（从 use 的类出发的后代组合器） | ❌ **不命中** |
| `stroke="var(--t1)"`（呈现属性写 `var()`） | ✅ 生效 |
| `style="stroke:var(--t1)"`（内联样式写 `var()`） | ✅ 生效 |
| `<use style="--t1:var(--c1000)">` 间接引用 | ✅ 解析 |
| `--c1000` 由 `<use>` 上的 `.kv1000` 类提供 | ✅ 解析 |

关键否定结论：**`<use>` 不是 shadow 内容的祖先**，任何从 use 上的类出发的关系选择器都失配；且 CSS 无法读取「元素 class 列表中的第 N 个」。因此「use 挂多个 kv 类 → 依次作用到第 N 个 nth-child」没有对应的 CSS 语法。

**唯一可用的跨 `<use>` 传值通道是 CSS 自定义属性**（可继承）。

### 3.2 采用的机制

**symbol 内按位置写 `var(--tN)`，`<use>` 上挂电压类并用 `style` 把槽接到电压色源。**

```svg
<!-- 单电压器件：symbol 内不写任何颜色，靠继承 -->
<symbol id="symbol_ACRealBs_ac-bus_default" viewBox="-75 -18 150 36" overflow="visible">
  <title>交流母线</title>
  <g transform="rotate(0) scale(1 1)">
    <rect class="bus-glyph" x="-75" y="-6" width="150" height="12"
          fill="currentColor" stroke-width="0"/>
  </g>
</symbol>
<use class="kv1000" href="#symbol_ACRealBs_ac-bus_default" .../>

<!-- 多端子器件：symbol 内按位置消费槽变量 -->
<symbol id="symbol_ACTransfomer3_ac-three-winding-transformer_default" viewBox="-75 -55 150 110" overflow="visible">
  <title>三绕组主变</title>
  <g class="three-winding-transformer-glyph" fill="#ffffff" stroke-width="2.5"
     stroke-linecap="round" stroke-linejoin="round">
    <circle class="transformer-winding" cx="-16" cy="-8" r="15" stroke="var(--t1)"/>
    <circle class="transformer-winding" cx="16"  cy="-8" r="15" stroke="var(--t2)"/>
    <circle class="transformer-winding" cx="0"   cy="14" r="15" stroke="var(--t3)"/>
    <path d="M -39 -8 H -31 M 31 -8 H 39 M 0 29 V 39" fill="none" stroke="var(--t1)"/>
  </g>
  <!-- 端子引线同样按位置用 var(--tN) -->
</symbol>
<use class="kv1000 kv750 kv500"
     style="--t1:var(--c-kv1000);--t2:var(--c-kv750);--t3:var(--c-kv500)"
     href="#symbol_ACTransfomer3_ac-three-winding-transformer_default" .../>
```

**不再需要**：nth-child 位置规则、位置类、CSS 位置规则段、引线容器改造、图元结构守卫测试。

### 3.3 样式表

```css
/* 器件类：去掉 fill 与 stroke-width，新增 --c-<类名> 颜色源 */
.kv1000  { stroke:#0e7490; color:#0e7490; --c-kv1000:#0e7490 }
.dcv220  { stroke:#b91c1c; color:#b91c1c; --c-dcv220:#b91c1c }

/* 线路类：形状不变，仅新增颜色源（下游按类覆盖时用） */
.lkv1000 { fill:none; stroke:#0e7490; color:#0e7490 }
```

相对现状的改动：

| 改动 | 原因 |
|---|---|
| `.kvN` / `.dcvN` 去掉 `fill` | 该规则会命中 `<symbol>` 内带该类的元素；保留 fill 会把白色本体（负荷三角、开关圆点、绕组内芯）填成电压色 |
| `.kvN` / `.dcvN` 去掉 `stroke-width:1` | 无意义的副作用属性；无属性元素本来继承的默认值就是 1，去掉不改变现状 |
| 新增 `--c-<类名>` | 给多端子器件的槽提供颜色源，使下游仍只需覆盖电压类一处 |

**变量命名必须带类型前缀**（`--c-kv220` / `--c-dcv220`），否则交流 220 与直流 220 会撞到同一个变量名。

---

## 4. 输出契约

### 4.1 类名（不变）

| 类名 | 语义 | 挂载位置 |
|---|---|---|
| `kv<N>` | 交流器件电压 | `<use>`、多端子器件的节点级部件 |
| `dcv<N>` | 直流器件电压 | 同上 |
| `lkv<N>` | 交流线路电压 | 线路 `<path>`、边界母线内连 `<line>` |
| `ldcv<N>` | 直流线路电压 | 同上 |

`<N>` 为电压值经 `exportVoltageClassSuffix` 归一化（非字母数字转 `_`），无电压时为 `0`。见 `svg.ts:384-388`。

### 4.2 下游覆盖方式

```css
/* 一处改，全图该电压等级（含变压器第 N 绕组、母线填充）一起变 */
.kv750 { stroke:#ff0000; color:#ff0000; --c-kv750:#ff0000 }
```

或整体替换导出 SVG 的 `<style>` 块。

### 4.3 槽变量（仅多端子器件）

| 变量 | 含义 | 定义位置 |
|---|---|---|
| `--t<N>` | 第 N 个端子的电压色 | `<use>` 的 `style` |
| `--c-<类名>` | 该类名的颜色源，如 `--c-kv750` | 电压类规则 |

槽变量只在多端子器件的 `<use>` 上出现，单电压器件不带。

---

## 5. `<symbol>` 内处理规则

### 5.1 按角色分流

| 部件角色 | 改法 | 判定依据 |
|---|---|---|
| 单电压器件的电压**描边** | 删掉颜色属性，靠 `<use class="kvN">` 继承 | 颜色来自 `getDeviceStrokeColor` |
| 电压**填充**（母线体等） | `fill="currentColor"` | 代码里把电压色当 fill 用（如 `fill: stroke`） |
| 多端子器件的**节点级**部件 | `stroke="var(--t1)"` | 颜色来自 `getDeviceStrokeColor` 且器件有多个端子电压 |
| 多端子器件的**第 N 端子**部件（绕组、引线） | `stroke="var(--t{N})"` | 颜色来自 `getTerminalDisplayColor(node, terminal_i)` |

### 5.2 固定色一律不动

| 类别 | 位置 |
|---|---|
| 白色/浅色本体 | `DeviceGlyph.ts:108-133` 的 `baseFill` 系列 |
| `fill="none"` | 开关、线路类图元的组属性 |
| 端子白点、开关圆点 | `DeviceGlyph.ts:1318` 等 |
| 开合状态色 | `stateVisual.strokeColor` / `stateVisual.fillColor` |
| 用户自定义色 | `node.params.strokeColor` / `accentColor` / `foregroundColor` |
| 文字色 | 标签、状态文字 |

判定原则：**颜色来源是 `getDeviceStrokeColor` / `getTerminalDisplayColor` → 电压色，走新机制；其余一律保留原样。**

### 5.3 多端子器件的强制要求

多端子器件的 `<use>` 上挂了多个电压类，它在样式表中同时命中多条规则，自身 `stroke` 取值由规则顺序决定（不可依赖）。因此：

> **多端子器件的每一个电压着色部件都必须显式写 `var(--tN)`，不得依赖继承。**

当前需要处理的多端子图元仅 3 个：

| 图元 | 位置 | 端子数 |
|---|---|---|
| `ac-three-winding-transformer` / `-neutral` | `DeviceGlyph.ts:1268-1284` | 3 |
| `terminal-transformer-load` | `DeviceGlyph.ts:1286-1300` | 2 |
| `ac-transformer` 系列（`kind.includes("transformer")`） | `DeviceGlyph.ts:1302-1310` | 2 |

外加端子引线 `buildSvgDeviceConnectorMarkup`（`svg.ts:170-190`）。

---

## 6. 代码改动点

| 文件 / 位置 | 改动 |
|---|---|
| `src/export/svg.ts:503-517` | 规则形状：`.kvN`/`.dcvN` 去掉 `fill`、`stroke-width`，新增 `--c-<类名>`；`.lkvN`/`.ldcvN` 形状不变，新增 `--c-<类名>` |
| `src/export/svg.ts:170-190` | `buildSvgDeviceConnectorMarkup`：引线颜色改为「删属性靠继承」（单电压）或 `var(--tN)`（多端子） |
| `src/export/svg.ts:546` / `:562` | 边界母线内连 `<line>`：删电压色 `stroke` |
| `src/export/svg.ts:575-592` | 边 `<path>`：删电压色 `stroke`（class 保留） |
| `src/export/svg.ts:697-701` | 传入导出专用开关（见下） |
| `src/export/svg.ts:781` | 多端子器件的 `<use>` 追加槽赋值 `style="--tN:var(--c-<类名>)"` |
| `src/DeviceGlyph.ts:86` | 新增可选 prop（如 `voltagePaint`），携带「是否启用 + 端子→槽名映射」 |
| `src/DeviceGlyph.ts:106-133` | `stroke` 分流：来源是电压色时，按新机制输出（删属性 / `currentColor` / `var(--tN)`） |
| `src/DeviceGlyph.ts:1278` / `:1296` / `:1306` | 绕组颜色改为 `var(--t{N})` |
| `src/DeviceGlyph.ts` 其余 `fill: stroke` 等填充点 | 改为 `currentColor` |

**安全约束**：新 prop 默认不传 → `DeviceGlyph` 行为完全不变。活画布的全部调用点（`appDeviceDefinitionFactories.tsx:1467`、`appSelectionDragFactories.tsx:936/3899`、`appToolbarHookFactories.tsx:4430`）不受影响。

---

## 7. 测试与基线

### 7.1 需更新的既有断言

| 位置 | 现状 | 更新方向 |
|---|---|---|
| `src/svgExport.test.tsx:1829` | 断言 `.kv10{fill:...;stroke:...;stroke-width:1;color:...}` 全串 | 改为新规则形状 |
| `src/svgExport.test.tsx:1830` | 断言 `.lkv10{fill:none;stroke:...;color:...}` | 改为新形状 |
| `src/svgExport.test.tsx:1886` | 同上（自定义调色板） | 同上 |
| `src/svgExport.test.tsx:1834/1835/1879/1882/1884/1885/1907` | 断言 `<use>` 上的 kv 类 | **保持不变**（类名契约未变） |
| `server/svgExport.test.mjs:323-325` | 断言含 `kv10`、energy 模式不含 | **保持不变** |

### 7.2 新增断言

1. **symbol 内无电压色**：电压模式下，`<symbol>` 段落内不得出现调色板中的任何电压色 hex。
2. **slot 传递**：多端子器件的 `<use>` 带 `style="--t1:var(--c…)"`，其 symbol 内对应部件带 `var(--t1)`。
3. **白色本体未被波及**：负荷三角 / 开关圆点 / 绕组内芯仍为 `fill="#ffffff"`。
4. **symbol 去重**：同一图元在两个不同电压下只生成一个 symbol（`新建模型` 场景：8 → 4）。
5. **energy 模式不变**：energy 模式输出的 `<symbol>` 内仍有字面颜色，且无 `kv` 类。

### 7.3 golden 基线

`src/export/fixtures/svg-baseline.svg` 是 **energy 模式**（实测零 `kv` 类）→ **不受本次改动影响**，无需重新生成。

### 7.4 回归

- `pnpm vitest run` 全量
- `pnpm tsc --noEmit`
- `pnpm audit:names`（本次改动涉及 `src/export/svg.ts` 与 `src/DeviceGlyph.ts`，防 ReferenceError 类缺陷）
- 截图链路：`runtimeScreenshot` 把 SVG 当图片栅格化，需确认内联 `<style>` + 继承 + `var()` 在 image 模式下仍生效

---

## 8. 风险与边界

### 8.1 风险

| 风险 | 影响 | 缓解 |
|---|---|---|
| `DeviceGlyph` 30+ 处颜色调用点逐处分流，改错一处即视觉回归 | 高 | 每处按「来源是否 `getDeviceStrokeColor`/`getTerminalDisplayColor`」二分；补断言 3（白色本体）与逐图元快照 |
| 呈现属性写 `var()` 在 Chromium 实测可用，但规范保证较弱 | 中 | 若下游存在 Firefox/Safari，改用 `style="stroke:var(--t1)"`（同样实测通过，一行切换） |
| 多端子器件漏写 `var(--tN)` 的部件会拿到 use 上不确定的继承色 | 中 | 断言 2 覆盖全部多端子图元；code review 逐图元核对 |
| 截图/栅格化路径行为差异 | 中 | 归入回归项 7.4 单独验证 |

### 8.2 明确不做

- 不改类名（`kv`/`lkv`/`dcv`/`ldcv` 保持）
- 不改 energy 配色模式（保持内联色）
- 不改活画布渲染（新 prop 默认关闭）
- 不改 E 文件 / CIM 导出
- 不引入 nth-child 位置规则、位置类、图元结构守卫
- 不支持「用户自定义 strokeColor 也跟着电压走」——用户自定义色优先，保持现状

---

## 附录：探针文件

机制验证用的一次性 SVG 探针（Chromium 实测，非仓库产物）：

| 文件 | 验证内容 |
|---|---|
| `use-shadow-probe.svg` | class 选择器 / nth-of-type / 继承 / currentColor / CSS 变量能否穿过 use 边界 |
| `descendant-probe.svg` | 从 use 的类出发的后代组合器**不**命中 |
| `slot-var-probe.svg` | 位置槽 + 变量 + nth-child 链路 |
| `var-in-symbol-probe.svg` | `var()` 写进呈现属性 / 内联样式、`--t1:var(--c1000)` 间接引用 |
