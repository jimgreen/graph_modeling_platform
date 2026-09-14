# SVG 导出：电压等级着色改由 class 驱动

**日期**：2026-09-14
**状态**：已实施（2026-09-14，16+ 提交）
**影响范围**：`src/export/svg.ts`、`src/DeviceGlyph.ts`、`src/svgExportUtils.ts`、`src/stateIconDrawing.tsx`、`src/svgExport.test.tsx`、`server/svgExport.test.mjs`

---

## 1. 背景与目标

前端导出的 SVG 里，电压等级着色**写死在 `<symbol>` 内部的 `fill`/`stroke` 呈现属性**上；挂在 `<use class="kv***">` 上的电压 class 完全不起作用。下游系统无法通过覆盖 CSS 动态修改电压配色 —— 只能拿到一份颜色被烤死的图。

**目标**：删除 `<symbol>` 内的电压等级着色，让电压配色**全部由 class 决定**，下游改一处 CSS 即可整体换色。

**非目标**：不改类名、不改 energy 配色模式、不改活画布、不改 E/CIM 导出。

---

## 2. 现状与根因

### 2.1 颜色来源链路

```
stateVisual?.strokeColor || stateColor                    (DeviceGlyph.ts:106-107，最高优先)
  ↓ 未命中时
getDeviceStrokeColor (model.ts:7601)
  ← params.foreground_color 优先 (model.ts:7610)
  ← 电压色 voltageLevelColor (model.ts:7512)
       ← params.vbase → deviceParamValue(params,"voltage_level") → rated_voltage → voltage (model.ts:7604-7608)
       ← VOLTAGE_LEVEL_COLORS 硬编码色表 (model.ts:7353-7370)
  ← 氢/热配色 → 端子类型色（兜底）
  ↓
renderSvgElementMarkup 写成 <symbol> 内的字面 fill=/stroke=
```

部分图元另有覆盖层：`node.params.strokeColor` / `accentColor`（`DeviceGlyph.ts:180`、`:212`、`:217`）。

写入点规模（实测穷举）：

| 类别 | 数量 |
|---|---|
| `stroke: stroke`（电压色描边） | 60 行 |
| `fill: stroke`（电压色当填充） | 23 处 |
| 条件填充 `fill: closed ? stroke : "#ffffff"` | 1 处（`DeviceGlyph.ts:1362`） |
| 字面 hex | 8 行 13 处 |

### 2.2 class 为何失效

`svg.ts:503-517` 确实发出了 `.kv220{fill;stroke;stroke-width:1;color}` 规则，也确实把 class 挂到了 `<use>`（`:769-771`、`:781`）与线路 `<path>`（`:575-592`）上。但：

- `.kvN` 规则挂在 `<use>` 上，只能作为**继承值**进入对应 symbol 内容；
- `<symbol>` 内每个图形都带自己的 `fill=`/`stroke=` 呈现属性（元素自身值）→ **继承值永不参与竞争**。

所以 class 完全空转。

> **注意**：symbol 正文里的 class 只有 `bus-glyph` / `transformer-winding` / `model-hierarchy-icon` / `routable-line-device-glyph` 等，**不含任何 kv/dcv 类**。`.kvN` 规则不会「命中」symbol 内元素，它只作用于 `<use>` 自身。

### 2.3 两级缓存都含电压色

symbol 去重有两级，**两级都把电压色算进键**：

| 级别 | 位置 | 键 | 含色来源 |
|---|---|---|---|
| 快路径 | `svg.ts:744-746`（map 在 `:601`） | `symbolBaseId + viewBox + visualInputToken` | `svg.ts:630` `getTerminalDisplayColor`、`:640` `getDeviceStrokeColor` |
| 签名 | `svg.ts:748-750`（map 在 `:600`） | `symbolBaseId + viewBox + 渲染正文` | 正文内的字面颜色 |

实测后果：同种图元每个电压色各生成一份 symbol。

| 样本 | symbol 数 | use 数 | 重复情况 |
|---|---|---|---|
| `标准场站.svg` | 12 | 14 | 母线 ×2、负荷 ×2 |
| `新建模型.svg` | 8 | 7 | 负荷 ×3、开关 ×2、母线 ×2 |

### 2.4 多端子器件

三绕组/两绕组主变的每个绕组、每根端子引线用**各自端子**的电压色（`DeviceGlyph.ts:1278`、`:1296`、`:1306`；引线 `svg.ts:178-183`）。一个 `<use>` 只能提供一个继承色，表达不了同器件多色。

另有跨文件同序不变量：绕组槽号来自 `DeviceGlyph.ts` 的 `terminals.slice(0,N)`，引线槽号来自 `svg.ts:178-183` 的 `node.terminals.map` —— **今天没有任何守卫**。

### 2.5 既有缺陷：两条电压解析链不一致（本次必须先修）

同一个节点的电压被算了两遍，两条链读的字段不同：

| 链路 | 读取来源 | `ac-bus` 默认节点 `{vbase:"0", voltage_level:"10"}` 结果 |
|---|---|---|
| 图元着色 `getDeviceStrokeColor` | `vbase` → **`voltage_level`（snake）** → …（`model.ts:7604-7608`） | `"10"` → **#f97316 橙** |
| 导出 class `nodeExportVoltageDescriptor` | 只读 `params.vbase` / `params.voltageLevel`（**camel，不认 snake**）（`svg.ts:381`、`:414`） | `"0"` → **`class="kv0"` 灰** |

实测产物：`<use class="kv0">` + 正文 `<rect class="bus-glyph" fill="#f97316">`。

**若不先对齐，把文件里任何元素改成 class 驱动都会改变可见颜色**（母线由橙变灰），截图链路（同一个 `buildSvgDocument`）同样。

> **§2.5 对齐的副作用（已测试钉住）**：`nodeVoltageAttributes`（energy 模式同样消费这条对齐后的解析链）对无端子母线 `{vbase:"0", voltage_level:"10"}` 导出的 metadata `vbase` 属性由 `"0"` 修正为 `"10"`。属本设计的既有缺陷修正而非回归，`svgVoltagePaint.test.ts` 已按 energy 模式钉住该行为。

---

## 3. 机制设计（全部经 Chromium 实测）

### 3.1 探针结论

| 机制 | 结论 |
|---|---|
| 文档级 class 选择器命中 `<symbol>` 内部元素 | ✅ |
| `circle:nth-of-type(N)` 命中 `<symbol>` 内部元素 | ✅ |
| 无属性元素继承 `<use class="kvN">` 的 `stroke`/`fill`/`color` | ✅ |
| `.kv1000 circle:nth-of-type(1)`（从 use 的类出发的后代组合器） | ❌ **不命中** |
| `stroke="var(--t1)"`（呈现属性写 `var()`） | ✅ |
| `style="stroke:var(--t1)"`（内联样式写 `var()`） | ✅ |
| `<use style="--t1:var(--c-kv1000)">` 二级间接引用 | ✅ |

关键否定结论：**`<use>` 不是 shadow 内容的祖先**，从 use 上的类出发的关系选择器一律失配；且 CSS 无法读取「元素 class 列表中的第 N 个」。因此「use 挂多个 kv 类 → 依次作用到第 N 个 nth-child」没有对应语法。

**唯一可用的跨 `<use>` 传值通道是 CSS 自定义属性**（可继承）。

### 3.2 采用的机制

**symbol 内按位置写 `var(--tN)`，`<use>` 挂电压类并用 `style` 给槽赋值。**

```svg
<!-- 单电压器件：symbol 内不写任何电压色，靠继承 -->
<symbol id="symbol_ACRealBs_ac-bus_default" viewBox="-75 -18 150 36" overflow="visible">
  <title>交流母线</title>
  <g transform="rotate(0) scale(1 1)">
    <rect class="bus-glyph" x="-75" y="-6" width="150" height="12"
          fill="currentColor" stroke-width="0"/>
  </g>
</symbol>
<use class="kv10" href="#symbol_ACRealBs_ac-bus_default" .../>

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

**不再需要**：nth-child 位置规则、位置类、引线容器改造。

> **适用范围（实施后收窄）**：槽机制（`var(--tN)`）**仅变压器族使用**（`kind.includes("transformer")`，谓词 `usesTransformerTerminalSlotPaint` 单源）。其余器件（开关、负荷、母线等，含双端子器件）内部单色 —— symbol 内走 `currentColor` 继承、`<use>` 不声明槽、引线删属性靠继承。这样非变压器图元的 CSS 变量依赖为零，下游渲染器（如不支持 CSS 变量的旧引擎）只需特殊处理变压器。

### 3.3 样式表：单一 token 派生

```css
/* 器件类：去掉 stroke-width，其余全部由 --c-<类名> 派生 */
.kv1000  { --c-kv1000:#0e7490; stroke:var(--c-kv1000); color:var(--c-kv1000); fill:var(--c-kv1000) }
.dcv220  { --c-dcv220:#b91c1c; stroke:var(--c-dcv220); color:var(--c-dcv220); fill:var(--c-dcv220) }

/* 线路类：形状不变，同样加颜色源 */
.lkv1000 { --c-lkv1000:#0e7490; fill:none; stroke:var(--c-lkv1000); color:var(--c-lkv1000) }
```

改动与理由：

| 改动 | 理由 |
|---|---|
| 去掉 `stroke-width:1` | **真空操作**（像素级实测对照一致）。stroke-width 可继承、就近祖先优先；class 上那个 1 只对完全不声明 stroke-width 的元素起作用，而那些元素的初始值也是 1 |
| `stroke`/`color`/`fill` 改为引用 `--c-<类名>` | 下游只改 `--c-<类名>` 一处即可让描边、母线填充、绕组槽全部跟随；同时直接覆盖 `stroke:` 也仍然有效 |
| `fill` 保留 | 实测全扫 `DEVICE_LIBRARY` 169 个 kind（91 个在电压模式带 kv 类）：**每个 path/circle/rect/ellipse/polygon/text 元素自身或祖先链上都有 fill，0 例外**。故保留 `fill` 不会波及白色本体 |
| 变量名必须带类型前缀 | `--c-kv220` / `--c-dcv220`；否则交流 220 与直流 220 撞名 |

### 3.4 失效模式（实测，无兜底值的后果）

| 情形 | `stroke="var(--tN)"` | `fill="var(--tN)"` |
|---|---|---|
| 正常 | 正确电压色 | 正确电压色 |
| 槽链到不存在的 `--c-kv999` | **静默继承 `<use>` 上的类色**（文档序最后一个匹配类） | 正常 |
| `<use>` 上无任何 kv 类 | **元素不可见**（stroke 初始值是 `none`，不是黑） | **黑色**（fill 初始值黑） |

**失效不报错、不掉黑，而是静默取错色或元素消失。** 因此 §5.4 的槽完整性是硬要求，不能靠「出错会看得见」。

---

## 4. 输出契约

### 4.1 类名（不变）

| 类名 | 语义 | 挂载元素 |
|---|---|---|
| `kv<N>` | 交流器件电压 | `<use>` |
| `dcv<N>` | 直流器件电压 | `<use>` |
| `lkv<N>` | 交流线路电压 | 线路 `<path>`、边界母线内连 `<line>`（该元素同时带 `export-boundary-bus-internal-connector`） |
| `ldcv<N>` | 直流线路电压 | 同上 |

`<N>` 为电压值经 `exportVoltageClassSuffix` 归一化（非字母数字转 `_`），无电压时为 `0`。见 `svg.ts:384-388`。

> **`<use>` 上的类是该器件全部端子电压类的去重集合**，不只是端子 1。见 §5.4。

### 4.2 下游覆盖方式

```css
/* 推荐：只改颜色源，全图该电压等级（描边 + 母线填充 + 变压器第 N 绕组槽）一起变 */
.kv750  { --c-kv750:#ff0000 }
.lkv750 { --c-lkv750:#ff0000 }   /* 线路单独一条，类名不同 */
```

或直接覆盖属性（对自带/可继承该属性的元素生效）：

```css
.kv750  { stroke:#ff0000; color:#ff0000 }
.lkv750 { stroke:#ff0000 }
```

或整体替换导出 SVG 的 `<style>` 块。

### 4.3 下游契约要点

1. **覆盖 CSS 必须位于导出 SVG 内联 `<style>` 之后** —— 同特异性靠源序决胜。
2. **两条独立通道**：`--c-<类名>` 驱动槽与 `currentColor`；`stroke` / `fill` 只作用于自带或可继承该属性的元素。只改 `stroke:` 会「一半变一半不变」（母线体、变压器绕组/引线不变）。
3. **器件类与线路类必须分别覆盖**：`.kvN` 不覆盖 `.lkvN`。
4. **规则形状变更声明**：旧规则的 `fill` / `stroke-width:1` 在实践上是惰性的（从未生效过），故不构成实质破坏；但 `.kvN` 现为 `--c-<类名>` 的定义处，**覆盖须整块替换，不能只覆盖单个属性就指望全部生效**。

### 4.4 槽变量（仅多端子器件）

| 变量 | 含义 | 定义位置 |
|---|---|---|
| `--t<N>` | 第 N 个端子的电压色 | `<use>` 的 `style` 属性 |
| `--c-<类名>` | 该类名的颜色源，如 `--c-kv750` | 电压类规则 |

槽变量只在多端子器件的 `<use>` 上出现，单电压器件不带。

---

## 5. `<symbol>` 内处理规则

### 5.1 按角色分流

| 部件角色 | 改法 | 判定依据 |
|---|---|---|
| 单电压器件的电压**描边** | 删掉 `stroke` 属性，靠 `<use class="kvN">` 继承 | 颜色来自 `getDeviceStrokeColor` 且未被 `foregroundColor` / `params.strokeColor` / `stateVisual` 覆盖 |
| 电压**填充**（见 §5.3） | `fill="currentColor"`（多端子器件用 `var(--t1)`） | 代码里把电压色当 fill 用 |
| 多端子器件的**节点级**部件 | `stroke="var(--t1)"` | 器件有多个端子电压 |
| 多端子器件的**第 N 端子**部件（绕组、引线） | `stroke="var(--t{N})"` | 颜色来自 `getTerminalDisplayColor(node, terminals[i])` |
| routable-line 设备（`DeviceGlyph.ts:174`） | 删属性靠继承 | 正文单色，无引线槽（`svg.ts:171` 直接 return） |

**例外行（必须保持字面，不得改为继承）**：

| 例外 | 位置 | 说明 |
|---|---|---|
| model-hierarchy 图元正文 | `DeviceGlyph.ts:180`、`:212`、`:217` | 正文色取自 `node.params.strokeColor` / `accentColor`，**不是电压色**。实测 `<use class="dcv220">` 的正文是 `<g class="model-hierarchy-icon" stroke="#2563eb">`，该蓝来自 params 默认值。删成继承会把蓝变电压色 → 视觉回归。**同一 symbol 内的引线仍是电压色**，一次二分覆盖不了，必须逐元素判断 |
| **氢/热耦合器件机身身份色** | `svg.ts` `glyphVoltagePaint` 门控 | `getDeviceStrokeColor` 对非母线氢/热 kind（ac/dc-electrolyzer、ac/dc-fuel-cell、ac/dc-heater 等）返回**终端类型色**（h2 紫 / heat 红）而非电压色。门控比较 `getDeviceStrokeColor(voltageColoredNode)` 与该器件电压类对应色（`voltageLevelColor(电压, type)`）：不一致时该器件**机身保持字面身份色**（`nodeRef` 指向身份色），仅电端子引线仍走 class 驱动、非电端子（h2/heat）引线保留字面终端色 |

**判定原则**：颜色**最终来源**是电压色（`getDeviceStrokeColor` 且未被上述覆盖层拦截）→ 走新机制；否则一律保留原样。

### 5.2 固定色清单（保持字面）

| 类别 | 位置 |
|---|---|
| 白色/浅色本体 | `DeviceGlyph.ts:108-133`（`baseFill` 三元链 + `:133` `fill`) |
| 端子白点、开关圆点 | `DeviceGlyph.ts:1318` |
| 其它字面 hex | `DeviceGlyph.ts:633`(×3)、`:656`(×2)、`:734`、`:1298`、`:1328`(×2)、`:1338`(×2) |
| 开合状态色 | `stateVisual.strokeColor` / `fillColor`（`DeviceGlyph.ts:106-107`，优先于电压色） |
| 用户自定义色 | `node.params.strokeColor` / `accentColor` / `foregroundColor` |
| 标签层文字色 | `svgExportUtils.ts:47`、`:60`（取自节点文字色） |
| 背景页框 / 画布底色 | `svg.ts:256`（`#94a3b8`）、`svg.ts:834` |
| 量测层 | 色源为 `measurementConfig`，**不受影响** |

> **状态色优先级（§5.2 落实）**：导出态 `voltagePaint` 的 `stroke = stateVisual?.strokeColor || stateColor || (voltagePaint ? (voltagePaint.nodeRef ?? "currentColor") : deviceStroke)` —— 状态色（stateVisual.strokeColor / color）永远**优先于**电压 class/槽驱动；状态 symbol 的开合色以字面属性存活，不得被 `currentColor` / `var(--tN)` 顶掉（有守卫测试钉住）。

> **修订**：原先「文字色不动」的说法不准确。**标签层**文字色不动；但**图元内部的缩写标记文字**（AC/DC/H2/P）在电压模式下就是电压色，属 §5.3 电压填充，必须改。

### 5.3 电压填充清单（去 fill 后忘改会掉色，共 3 类）

| 位置 | 形态 |
|---|---|
| 母线体（`staticRenderUtils.ts:211`，经 `DeviceGlyph.ts:957` / `:1120` / `:1215` 调 `renderBusGlyphRect(w,h,stroke)`） | `fill: color` = 电压色 |
| 圆点（`DeviceGlyph.ts:1207`、`:1281`） | `fill: stroke` |
| **21 处文本填充**（`DeviceGlyph.ts:768`、`775`、`777`、`836`、`842`、`848`、`856`、`866`、`882`、`892`、`908`、`914`、`920`、`926`、`933`、`939`、`949`、`1063`、`1075`、`1441`、`1447`） | `uprightText(..., { fill: stroke })` |
| 箱式断路器条件填充（`DeviceGlyph.ts:1362`） | `fill: closed ? stroke : "#ffffff"` |

全部改为 `fill="currentColor"`；多端子器件用 `fill="var(--t1)"`。

### 5.4 多端子器件的硬要求

1. **`<use>` 必须挂该器件全部电端子的电压类（去重）**，否则 `var(--c-kvN)` 无从解析。
2. **每个端子电压都必须调用 `addVoltageStyleRule`**，否则 `--c-kvN` 缺失（见 §3.4，会静默取错色）。触发路径：调色板外的历史/非标电压值。
3. **每个端子电压着色部件都必须显式写 `var(--tN)`，不得依赖继承** —— 多端子 `<use>` 同时命中多条类规则，自身 `stroke` 由规则顺序决定，不可依赖。
4. **端子缺失时兜底**：缺槽写成 `--tN:var(--t1)`，**不留空槽**（保留原 `windingColors[i] ?? stroke` 语义）。
5. **槽号顺序**：槽号必须与 `node.terminals` 原始顺序一致，绕组（`DeviceGlyph.ts:1278`/`:1296`/`:1306`）与引线（`svg.ts:178-183`）**两处同序**，需守卫测试。
6. **端子数上限**：`ac-three-winding-transformer-neutral` 有 **4 个 ac 端子**（实测），需要 `--t4`；槽生成不得硬编码为 3。

当前需要处理的多端子图元（全仓 `getTerminalDisplayColor` 在导出链路上仅 3 处 + 引线），**且槽机制（`var(--tN)`）仅变压器族使用**（判定谓词 `usesTransformerTerminalSlotPaint`：`kind.includes("transformer")`，`DeviceGlyph.ts` 导出、`svg.ts` 两处门控引用）——其余器件（开关、负荷、母线等）内部单色，靠 `<use class>` 继承，**不声明槽、不写 `var()`**：

| 图元 | 位置 | 端子数 |
|---|---|---|
| `ac-three-winding-transformer` / `-neutral` | `DeviceGlyph.ts:1268-1284` | 3 / **4** |
| `terminal-transformer-load` | `DeviceGlyph.ts:1286-1300` | 2 |
| `ac-transformer` 系列（`kind.includes("transformer")`） | `DeviceGlyph.ts:1322` | 2 |

---

## 6. 代码改动点

| 位置 | 改动 |
|---|---|
| **`svg.ts:381`、`:414`（`nodeExportVoltageDescriptor`）** | **对齐电压解析链**：与 `getDeviceStrokeColor` 用同一套解析（含 `deviceParamValue(params,"voltage_level")`）。这是 §2.5 的缺陷修复，**必须先做** |
| **`svg.ts:405-417`、`:769-771`、`:781`** | **`<use>` 挂该器件全部电端子的电压类（去重）**，并向 `addVoltageStyleRule` 登记每个端子电压 |
| **`svg.ts:781` + `svgExportUtils.ts:80-82`** | **槽样式必须与 `svgDisplayAttribute` 的 `display:none` 合并进同一个 `style` 属性**；禁止在同一 `<use>` 上输出第二个 `style` |
| `svg.ts:503-517` | 规则形状改为 §3.3 的单一 token 派生形式 |
| `svg.ts:170-190` | `buildSvgDeviceConnectorMarkup`：引线颜色改为「删属性靠继承」（单电压）或 `var(--tN)`（多端子），槽号与绕组同序 |
| `svg.ts:546` / `:562` | 边界母线内连 `<line>`：删字面 `stroke`（class 保留） |
| `svg.ts:575-592` | 边 `<path>`：删字面 `stroke`（class 保留） |
| `svg.ts:603-654` | `cacheableStandardSymbolVisualToken` 剔除电压派生的 `getDeviceStrokeColor`（`:640`）与逐端子 `getTerminalDisplayColor`（`:630`），**保留 `deviceStateVisualToken`**（`:651`）；否则 §7.2 断言 4 的 symbol 去重不成立 |
| `svg.ts:697-701` | 传入导出专用开关（`foregroundColor` 抹空的现有行为保持不变，并在代码注释中点明它是「来源 = 电压色」的隐形前提） |
| `DeviceGlyph.ts:45-52` + `:86` | 类型定义加可选字段 + 解构赋默认值（**两处同改**）。全仓 `DeviceGlyphProps` 仅同文件引用，无第二处 import |
| `DeviceGlyph.ts:106-133` | `stroke` 分流：来源是电压色时按新机制输出 |
| `DeviceGlyph.ts:1278` / `:1296` / `:1306` | 绕组颜色改为 `var(--t{N})` |
| `DeviceGlyph.ts` 其余 23 处 `fill: stroke` + `:1362` | 改为 `currentColor` / `var(--t1)`（行号见 §5.3） |
| `src/stateIconDrawing.tsx:644-693` | 导出图回读路径：拷 `<defs>` + symbol body 但**不拷 `<use>`** → 电压模式导出图导入后单电压图元掉色、多端子 `var(--tN)` 失去赋值来源。需评估修法（见 §8.3） |

**安全约束**：新 prop 默认不传 → `DeviceGlyph` 行为完全不变。已核查：导出链路 `svg.ts:700/701`；JSX 形式 `<MemoDeviceGlyph>` 28 处（`appCanvasArea.tsx` 4、`appCanvasInteractionFactories.tsx` 6、`appGraphMeasurementFactories.tsx` 6、`appDeviceDefinitionRenderers.tsx` 5、`appPersistenceLibraryExport.tsx` 2、`appToolbarHookFactories.tsx` 2、`appView.tsx` 2、`appTopbar.tsx` 1）；`DeviceGlyph.test.tsx` 20 处均为 energy 默认模式。全部不受影响。

---

## 7. 测试与基线

### 7.1 需更新的既有断言

| 位置 | 现状 | 更新方向 |
|---|---|---|
| `src/svgExport.test.tsx:1829` | `.kv10{fill:#ff0000;stroke:#ff0000;stroke-width:1;color:#ff0000}` | 改为新规则形状 |
| `src/svgExport.test.tsx:1830` | `.lkv10{fill:none;stroke:#ff0000;color:#ff0000}` | 改为新形状 |
| `src/svgExport.test.tsx:1831` | `.dcv750{fill:#00aa88;stroke:#00aa88;stroke-width:1;color:#00aa88}` | 同上 |
| `src/svgExport.test.tsx:1832` | `.ldcv750{fill:none;stroke:#00aa88;color:#00aa88}` | 同上 |
| `src/svgExport.test.tsx:1833` | `expect(defs).toContain('stroke="#ff0000"')` —— 断言的正是「symbol 内字面电压色」，**本设计的反面契约** | **反向改写**：断言 symbol 段不含调色板电压色 hex |
| `src/svgExport.test.tsx:1886` | `.kv10{fill:#aa0000;...}` | 改为新形状 |
| `src/svgExport.test.tsx:1912` | 多类场景 | 改为 `class="dcv750 dcv1500"`（`<use>` 挂全部端子类） |

保持不变：`:1834`、`:1835`、`:1838`、`:1839`、`:1879`、`:1882`、`:1884`、`:1885`、`:1907`（`<use>` / `<path>` 上的 kv 类断言）；`server/svgExport.test.mjs:323-325`。

### 7.2 新增断言

1. **symbol 内无电压色**：电压模式下 `<symbol>` 段落内不得出现调色板中的任何电压色 hex。
2. **槽完整性（结构断言，升级版）**：
   - 槽数 = 该器件电端子数（含 4 端子用例）；
   - 每个 `var(--tN)` 都能在样式表中找到对应的 `--c-<类名>` 定义；
   - symbol 内出现的 `N` 集合 ⊆ 该 `<use>` 上定义的 `N` 集合。
3. **白色本体未被波及**：负荷三角 / 开关圆点 / 绕组内芯仍为 `fill="#ffffff"`。
4. **symbol 去重**：同一图元在两个不同电压下只生成一个 symbol（`新建模型` 场景 8 → 4）。
5. **energy 模式不变**：energy 模式输出的 `<symbol>` 内仍有字面颜色，且无 `kv` 类。
6. **解析链一致性（回归 §2.5）**：voltage 模式下默认新建母线的 `<use>` 类色与其 symbol 正文色一致。
7. **槽号同序守卫**：多端子器件的绕组槽号与引线槽号必须同为 `node.terminals` 原始顺序；任一处改用过滤/重排即失败。
8. **隐藏图层 + 槽**：`<use>` 同时带槽样式与 `display:none` 时，`style` 属性只有一处且 `display:none` 保留。
9. **symbol 填充不变量**：symbol 内每个可填色元素自身或祖先链上必须有 fill（§3.3 的依据，防未来新增图元破坏）。

### 7.3 golden 基线

`src/export/fixtures/svg-baseline.ts` 全文无 `colorDisplayMode` → 走默认 `"energy"`（`svg.ts:218`）；`svg-baseline.svg` 中 `kv/dcv/lkv/ldcv` 实测 0 次。

使用方：`src/export/svg.golden.test.ts`（`sha256` 逐字节哈希断言 + `WRITE_SVG_BASELINE=1` 回写）、`src/export/svg.test.ts`（用同名 fixture 的数据，只断言 `bus-glyph` / `<svg>` / `id="edge-1"` 级）。

**结论：无需重生成，但它是 energy 路径的不变性哨兵 —— energy 路径任何字节漂移都会立刻红，属必须守住的义务，不是「不用管」。**

### 7.4 回归

- `pnpm vitest run` 全量
- `pnpm tsc --noEmit`
- `pnpm audit:names`
- **截图链路：已实测通过**（Chromium image 模式 8 个采样点全过：内联 `<style>`、`var()` 写呈现属性、二级 `--tN:var(--c-kvN)`、`currentColor`、`<use>` 继承）。与 `runtimeScreenshot.ts:46-69` 同路径、同引擎（`serializeScreenshot` 调 `buildSvgDocument`）→ **导出对则截图对**。保留一次目视回归即可

---

## 8. 风险与边界

### 8.1 风险（按严重度）

| # | 风险 | 缓解 |
|---|---|---|
| 1 | **class 值 ≠ 可见色**（§2.5 两条解析链不一致）。改 class 驱动即改变导出颜色（母线由橙变灰） | §6 首条：先对齐解析链；§7.2 断言 6 守卫 |
| 2 | **`--c-<类名>` 缺失 → 静默取错色或元素消失**（§3.4） | §5.4 第 2 点 + §7.2 断言 2 |
| 3 | **需要分流的电压色写入点约 83 处**（60 描边 + 23 填充 + 1 条件），改错一处即视觉回归 | **实现方式（见实施计划 Task 1）**：不逐处修改，改为在 `DeviceGlyph` 内**重定义 `stroke` 变量的取值**（导出态下变为 `currentColor` / `var(--t1)`），使既有 83 个写入点自动转为 class 驱动；只需把 4 处「非电压色」消费点（`DeviceGlyph.ts:180`/`:212`/`:217` 的 model-hierarchy 关联色）改用保留原色的 `deviceStroke`。改动面 83 → 约 5 处；断言 3 + 逐图元目视 |
| 4 | `cacheableStandardSymbolVisualToken` 未剔除电压色 → 去重不成立 | §6 该行 + §7.2 断言 4 |
| 5 | `<use>` 上第二个 `style` 顶掉 `display:none` → 隐藏图层显形 | §6 该行 + §7.2 断言 8 |
| 6 | 绕组槽号与引线槽号跨文件不同序 | §7.2 断言 7 |
| 7 | 下游只改 `stroke:` 会「一半变一半不变」 | §4.3 第 2 点 + §4.2 推荐写法 |
| 8 | `stateIconDrawing.tsx:644-693` 回读路径掉色/失槽 | §8.3 |
| 9 | **iOS WKWebView（WebKit）**：use 影子树 + 自定义属性 + 呈现属性写 `var()` 整体未实测 | 若下游含 WKWebView，本次改动落地后先在真机验证；必要时切 `style="stroke:var(--t1)"` 形式 |
| 10 | 呈现属性写 `var()` 的规范保证较弱（Chromium 实测可用） | 备选同上 |

### 8.2 明确不做

- 不改类名（`kv`/`lkv`/`dcv`/`ldcv` 保持）
- 不改 energy 配色模式（保持内联色）
- 不改活画布渲染（新 prop 默认关闭）
- 不改 E 文件 / CIM 导出
- 不引入 nth-child 位置规则、位置类、引线容器改造
- 不支持「用户自定义 strokeColor 也跟着电压走」——用户自定义色优先，保持现状
- 不支持「一个 `<use>` 表达三个颜色」的类顺序语义（CSS 无此能力，已实测证伪）

### 8.3 附带需评估的既有缺陷

| 缺陷 | 位置 | 说明 |
|---|---|---|
| 电压解析链不一致 | `svg.ts:381` / `:414` vs `model.ts:7604-7608` | **本次必须修**，见 §2.5 |
| 导出图回读丢 `<use>` | `src/stateIconDrawing.tsx:644-693` | 拷 `<defs>` + symbol body 但不拷 `<use>`。改造后：单电压图元整块掉色、多端子 `var(--tN)` 失去赋值来源。修法二选一：回读时一并拷 `<use>` 的 class/style，或回读时剥离电压类并回填字面色 |
| 静态图元拿到无人消费的 kv 类 | `svg.ts:418` `nodeVoltageDescriptor` 缺 `isStaticNode` 短路，而 `:431` 有 | 无害（无元素消费），可在本次一并清理 |

---

## 附录：探针文件

机制验证用的一次性 SVG/脚本（Chromium 实测，非仓库产物，位于 job tmp 目录）：

| 文件 | 验证内容 |
|---|---|
| `use-shadow-probe.svg` | class 选择器 / nth-of-type / 继承 / currentColor / CSS 变量能否穿过 use 边界 |
| `descendant-probe.svg` | 从 use 的类出发的后代组合器**不**命中 |
| `slot-var-probe.svg` | 位置槽 + 变量 + nth-child 链路 |
| `var-in-symbol-probe.svg` | `var()` 写进呈现属性 / 内联样式、`--t1:var(--c-kv1000)` 间接引用 |
| `probe-symbol.mjs` / `probe-multiterm.mjs` | 全图元 symbol 正文扫描；多端子端子数实测 |
| `probe-coverage.mjs` | `DEVICE_LIBRARY` 169 个 kind 的 fill 继承链全扫（0 例外） |
| `probe-fill-chain.mjs` | fill 继承链栈式解析 |

---

## 9. 后续追加特性：symbol 内 terminal 锚点（2026-09-14 实施后追加）

**需求**：其他工具用 SVG 时需要确定连接点位置。symbol 内每电端子输出一个锚点元素；默认不显示，CSS 控制显示。

### 9.1 输出形态

```svg
<circle class="terminal-anchor" cx="-79" cy="-11.57895" r="4" display="none"
        terminal-id="t1" terminal-index="1" node-number="1176"/>
```

| 决策 | 内容 |
|---|---|
| 范围 | 仅电端子（ac/dc）；h2/heat 端子不生成 |
| 位置 | `terminalRenderLocalPoint`（= 引线外端 = 连线落点，与引线同函数同坐标系） |
| 身份属性 | `terminal-id` / `terminal-index`（电端子序，与 `<use>` 的 `vbase-N` 同基数）/ `node-number`（拓扑节点号） |
| 默认隐藏 | `display="none"` **呈现属性**（SVG 标准：CSS 规则恒胜呈现属性）→ 下游 `.terminal-anchor{display:inline}` 一行显示；**不进 `<style>` 块** |
| 模式 | energy / voltage 都输出（几何元数据与配色无关） |
| 着色 | 锚点元素不带 fill/stroke —— 显示时默认黑，下游可用 CSS 自定（如 `.terminal-anchor{fill:#e11d48}`） |

### 9.2 实现与守护

- `svg.ts` `renderNodeSymbolBody`：connectorMarkup 后追加 `terminalAnchorMarkup`（插入几何 g 内，随旋转/缩放）
- symbol 去重：锚点在 body 内 → 签名自然覆盖；token 已含各端子 renderPoint
- **golden 基线有意重生成**：energy 输出新增锚点元素属本特性的预期变更，`SVG_BASELINE_HASH` 更新为新哈希（这打破「energy 零漂移」的配色工作约束 —— 该约束只属于电压着色改造本身；锚点是显式追加的输出特性）
- 测试：`src/export/svgTerminalAnchor.test.ts`（锚点数=电端子数、坐标=引线落点、身份属性、display:none、非电端子排除、energy 也生成、双状态 symbol 各含全套、母线单端子）

### 9.3 下游用法

```css
.terminal-anchor { display: inline; fill: #e11d48 }  /* 显示并着色 */
```
