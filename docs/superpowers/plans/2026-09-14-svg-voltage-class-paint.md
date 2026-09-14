# SVG 电压着色 class 化 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让导出的 SVG 里电压等级配色全部由 CSS class 驱动，下游改一处 CSS 即可整体换色。

**Architecture:** symbol 内不再写字面电压色 —— 单电压器件靠 `<use class="kvN">` 继承，多端子器件按位置消费 CSS 变量槽 `var(--tN)`，槽的值由 `<use>` 上的电压类 + `style` 属性提供。实现上通过**重定义 DeviceGlyph 的 `stroke` 变量为 `currentColor` / `var(--t1)`** 一次性覆盖全部 83 个电压色写入点，只对少数「非电压色」消费点做例外处理。

**Tech Stack:** TypeScript / React 19 / Vitest；SVG 输出由 `src/export/svg.ts` 的 `buildSvgDocument` 生成，`server/*.mjs` 以 Node 原生直载该模块。

## Global Constraints

- 设计依据：`docs/superpowers/specs/2026-09-14-svg-voltage-class-paint-design.md`（已过两轮专业审查）
- 类名契约**不变**：`kv<N>` / `dcv<N>`（器件）、`lkv<N>` / `ldcv<N>`（线路）
- CSS 变量命名必须带类型前缀：`--c-kv220` / `--c-dcv220`（否则交流 220 与直流 220 撞名）
- `src/export/**` 是 Node 直载模块：**不得是 `.tsx`、不得含 JSX**；相对 import 必须带 `.ts` 扩展名
- 测试与源文件同目录：`*.test.ts` / `*.test.tsx` / `*.test.mjs`
- energy 模式下任何字节漂移都会让 `src/export/svg.golden.test.ts` 的 sha256 守卫变红 —— **energy 路径必须零改动**
- 活画布调用点不得受影响：新 prop 默认为空时 `DeviceGlyph` 行为必须逐字节不变
- 每个 Task 结束提交一次

---

### Task 0: 对齐母线电压解析链（前置）

**为什么必须先做：** `getDeviceStrokeColor`（`src/model.ts:7604-7609`）用 `vbase → voltage_level(snake) → rated_voltage → voltage` 解析母线电压，而 `nodeExportVoltageDescriptor`（`src/export/svg.ts:412-415`）只读 `params.vbase / params.voltageLevel`（camel）。默认 `ac-bus` 节点 `{vbase:"0", voltage_level:"10"}` 因此出现 `<use class="kv0">`（灰）+ 正文 `fill="#f97316"`（橙）的矛盾。不对齐就做 class 化，母线会由橙变灰。

**Files:**
- Modify: `src/export/svg.ts:405-417`（`nodeExportVoltageDescriptor`）、import 区
- Test: `src/export/svgVoltagePaint.test.ts`（新建）

**Interfaces:**
- Consumes: `deviceParamValue(params: Record<string,string>, key: string): string | undefined`（`src/model.ts:5261`，已导出）
- Produces: `nodeExportVoltageDescriptor` 返回的 `voltage` 与 `getDeviceStrokeColor` 同源，供后续所有 Task 使用

- [ ] **Step 1: 写失败测试**

新建 `src/export/svgVoltagePaint.test.ts`：

```ts
import { describe, expect, it } from "vitest";
import { buildSvgDocument } from "./svg.ts";
import { createBusNode } from "../testNodeFactories"; // 若不存在，见 Step 3 的兜底写法

// 默认新建母线：vbase 为 "0"，电压写在 snake_case 的 voltage_level 上
const busNode = () => ({
  id: "ac-bus-1",
  kind: "ac-bus",
  name: "交流母线-1",
  position: { x: 100, y: 100 },
  size: { width: 150, height: 36 },
  rotation: 0,
  scaleX: 1,
  scaleY: 1,
  layerId: "layer-default",
  terminals: [],
  params: { vbase: "0", voltage_level: "10" }
} as never);

describe("母线电压解析链对齐", () => {
  it("默认母线的 use 类与其正文色同源（不应出现 kv0）", () => {
    const svg = buildSvgDocument([busNode()], [], {
      width: 800,
      height: 600,
      colorDisplayMode: "voltage"
    });
    expect(svg).toContain('class="kv10"');
    expect(svg).not.toContain('class="kv0"');
  });
});
```

- [ ] **Step 2: 运行确认失败**

Run: `pnpm vitest run src/export/svgVoltagePaint.test.ts`
Expected: FAIL —— 输出里是 `class="kv0"`（断言 `toContain('class="kv10"')` 失败）

- [ ] **Step 3: 对齐解析链**

若 Step 1 里的 `createBusNode` import 不存在，删掉该行与 import，只用上面内联的 `busNode()`。

在 `src/export/svg.ts` 的 model 导入里加入 `deviceParamValue`（该文件已从 `../model.ts` 导入多个符号，追加即可）。

把 `src/export/svg.ts:412-415` 改为：

```ts
    const voltage = terminal ? terminalExportVoltage(node, terminal) : firstNonZeroExportVoltageValue([
      node.params.vbase,
      deviceParamValue(node.params, "voltage_level"),
      deviceParamValue(node.params, "rated_voltage"),
      node.params.voltage
    ]) || "0";
```

（与 `src/model.ts:7604-7609` 的取值列表逐项一致）

- [ ] **Step 4: 运行确认通过**

Run: `pnpm vitest run src/export/svgVoltagePaint.test.ts`
Expected: PASS

- [ ] **Step 5: 全量回归，确认没有其它测试依赖旧行为**

Run: `pnpm vitest run`
Expected: 全绿。若 `src/svgExport.test.tsx` 里有断言 `kv0` 的用例失败，把该断言更新为新电压值（这是本次修复的预期结果），并在提交信息里说明。

- [ ] **Step 6: 提交**

```bash
git add src/export/svg.ts src/export/svgVoltagePaint.test.ts
git commit -m "fix(svg): 对齐母线电压解析链，use 类与正文色同源

nodeExportVoltageDescriptor 原先只读 camelCase 的 voltageLevel，
与 getDeviceStrokeColor 读取的 snake_case voltage_level 不一致，
导致默认母线出现 class=kv0(灰) 而正文是 #f97316(橙)。"
```

---

### Task 1: DeviceGlyph 支持导出态电压着色

**做法：** 不逐处改 83 个写入点，而是**重定义 `stroke` 变量的取值** —— 导出态下它变成 `currentColor`（单电压器件）或 `var(--t1)`（多端子器件节点级部件），于是既有的 `stroke={stroke}` 与 `fill: stroke` 自动变成 class 驱动。只把少数「非电压色」消费点改用保留原始颜色的 `deviceStroke`。

**Files:**
- Modify: `src/DeviceGlyph.ts:44-52`（`DeviceGlyphProps`）、`:86`（解构）、`:106-107`（stroke 定义）、`:180-217`（model-hierarchy 例外）、`:1278`、`:1296`、`:1306`（端子色）
- Test: `src/DeviceGlyph.voltagePaint.test.tsx`（新建）

**Interfaces:**
- Consumes: 无（Task 0 不提供运行时依赖）
- Produces:
  ```ts
  export type DeviceGlyphVoltagePaint = {
    /** 节点级电压色引用；不传时用 "currentColor"。多端子器件传 "var(--t1)" */
    nodeRef?: string;
    /** 端子级电压色引用；返回 undefined 表示回落到 nodeRef */
    terminalRef?: (terminalId: string) => string | undefined;
  };
  ```
  `DeviceGlyphProps` 新增可选字段 `voltagePaint?: DeviceGlyphVoltagePaint | null`

- [ ] **Step 1: 写失败测试**

新建 `src/DeviceGlyph.voltagePaint.test.tsx`：

```tsx
import { describe, expect, it } from "vitest";
import { DeviceGlyph } from "./DeviceGlyph.ts";
import { renderSvgElementMarkup } from "./svgUtils.ts";

const busNode = (vbase: string) => ({
  id: "ac-bus-1",
  kind: "ac-bus",
  name: "母线",
  position: { x: 0, y: 0 },
  size: { width: 150, height: 36 },
  rotation: 0,
  scaleX: 1,
  scaleY: 1,
  layerId: "layer-default",
  terminals: [],
  params: { vbase }
} as never);

// renderSvgElementMarkup 正是 src/export/svg.ts:700 的取值路径，用它保证测的是导出态
const glyphHtml = (voltagePaint: unknown) =>
  renderSvgElementMarkup(
    DeviceGlyph({
      node: busNode("220") as never,
      mode: "geometry",
      colorDisplayMode: "voltage",
      voltagePaint: voltagePaint as never
    })
  );

describe("DeviceGlyph 导出态电压着色", () => {
  it("不传 voltagePaint 时行为不变（活画布路径）", () => {
    const html = glyphHtml(undefined);
    expect(html).toContain("#b91c1c"); // 220 的字面电压色
    expect(html).not.toContain("currentColor");
  });

  it("传 voltagePaint 时电压色改为 currentColor", () => {
    const html = glyphHtml({});
    expect(html).toContain("currentColor");
    expect(html).not.toContain("#b91c1c");
  });

  it("nodeRef 可指定 var(--t1)", () => {
    const html = glyphHtml({ nodeRef: "var(--t1)" });
    expect(html).toContain("var(--t1)");
  });
});
```

- [ ] **Step 2: 运行确认失败**

Run: `pnpm vitest run src/DeviceGlyph.voltagePaint.test.tsx`
Expected: FAIL —— `expect(html).toContain("currentColor")` 失败（当前输出是字面色）

- [ ] **Step 3: 加类型与 prop**

`src/DeviceGlyph.ts:44-52` 改为：

```ts
export type DeviceGlyphMode = "full" | "geometry" | "text";
export type DeviceGlyphVoltagePaint = {
  /** 节点级电压色引用；不传时用 "currentColor"。多端子器件传 "var(--t1)" */
  nodeRef?: string;
  /** 端子级电压色引用；返回 undefined 表示回落到 nodeRef */
  terminalRef?: (terminalId: string) => string | undefined;
};
export type DeviceGlyphProps = {
  node: ModelNode;
  miniature?: boolean;
  mode?: DeviceGlyphMode;
  colorDisplayMode?: ColorDisplayMode;
  colorPalette?: ColorPalette;
  stateVisual?: DeviceStateVisual | null;
  /** 导出态专用：非空时电压色改为 class 驱动（currentColor / var(--tN)）。活画布不传 */
  voltagePaint?: DeviceGlyphVoltagePaint | null;
};
```

`:86` 的解构追加 `, voltagePaint = null`。

- [ ] **Step 4: 重定义 stroke 变量**

`src/DeviceGlyph.ts:106-107` 改为：

```ts
  const stateColor = stateVisual?.color?.trim();
  const deviceStroke = stateVisual?.strokeColor || stateColor || getDeviceStrokeColor(node, colorDisplayMode, colorPalette);
  // 导出态：电压着色改为 class 驱动。nodeRef 缺省为 currentColor —— 它取元素自身的 color，
  // 由 <use class="kvN"> 上的 .kvN{color:...} 继承而来；多端子器件由调用方传 var(--t1)。
  const stroke = voltagePaint ? (voltagePaint.nodeRef ?? "currentColor") : deviceStroke;
```

此改动一次性覆盖以下写入点（无需逐个修改）：

- 60 处 `stroke: stroke`
- 23 处 `fill: stroke`（母线体、圆点、21 处 `uprightText` 缩写标记）
- 1 处条件填充 `DeviceGlyph.ts:1362` `fill: closed ? stroke : "#ffffff"`

- [ ] **Step 5: 例外点改用 deviceStroke**

model-hierarchy 分支的关联色不是电压色（实测 `<use class="dcv220">` 的正文是 `<g class="model-hierarchy-icon" stroke="#2563eb">`，该蓝来自 `params.strokeColor` 默认值）。把 `:180`、`:212`、`:217` 三处里回落到 `stroke` 的部分改为 `deviceStroke`：

```ts
      const associationStroke = node.params.strokeColor || deviceStroke;
      const associationAccent = node.params.accentColor || associationStroke;
```

以及 `:202` 里 `stroke: associationStroke` 保持不变（它引用的是已改过的局部变量）。**注意**：同一 symbol 内的端子引线仍是电压色，故本分支只改关联色，不改其它。

- [ ] **Step 6: 端子色改用槽引用**

`:1278`、`:1296`、`:1306` 三处的 `getTerminalDisplayColor(node, t, colorDisplayMode, colorPalette)` 改为经统一 helper：

在 `DeviceGlyph.ts` 内 `stroke` 定义之后加入：

```ts
  // 导出态：端子级电压色由调用方按端子 id 返回槽引用（如 "var(--t2)"）
  const terminalPaint = (terminal: { id?: string }, fallback: string) =>
    voltagePaint?.terminalRef?.(String(terminal?.id ?? "")) ?? fallback;
```

然后把三处 `windingColors` 改为（以三绕组为例，`:1278`）：

```ts
    const windingColors = node.terminals.slice(0, 3).map((t) =>
      terminalPaint(t, getTerminalDisplayColor(node, t, colorDisplayMode, colorPalette))
    );
```

`:1296` 与 `:1306` 同法（分别 `slice(0, 2)`）。原 `?? stroke` 的兜底语义由 `terminalPaint` 的第二参保留。

> 端子缺失时的兜底（`--tN:var(--t1)`）由 Task 2 在 `<use>` 侧保证，此处不处理。

- [ ] **Step 7: 运行确认通过**

Run: `pnpm vitest run src/DeviceGlyph.voltagePaint.test.tsx src/DeviceGlyph.test.tsx`
Expected: PASS（后者 20 处 energy 默认模式断言不受影响）

- [ ] **Step 8: 提交**

```bash
git add src/DeviceGlyph.ts src/DeviceGlyph.voltagePaint.test.tsx
git commit -m "feat(DeviceGlyph): 新增导出态 voltagePaint，电压色改 class 驱动

导出态下 stroke 变量重定义为 currentColor / var(--tN)，
一次覆盖 60 处描边 + 23 处 fill:stroke + 1 处条件填充；
model-hierarchy 关联色非电压色，改用 deviceStroke 保持原样。"
```

---

### Task 2: `<use>` 挂全部端子电压类 + 槽赋值

**Files:**
- Modify: `src/export/svg.ts:503-517`（样式表加 `--c-<类名>` 与 `color`）、`:518-529`（`glyphColorPalette` 保留）、`:768-771`、`:781`（`<use>` 输出）、`:405-417`（登记全部端子电压）
- Modify: `src/svgExportUtils.ts:80-82`（`svgDisplayAttribute` 支持追加声明）
- Test: `src/export/svgVoltagePaint.test.ts`

**Interfaces:**
- Consumes: `DeviceGlyphVoltagePaint`（Task 1）
- Produces:
  - `svgDisplayAttribute(visible: boolean, extraDeclarations?: string): string` —— 追加声明合并进**同一个** `style` 属性
  - `exportVoltageColorVar(className: string): string` → `"--c-" + className`
  - `<use>` 上出现 `class="kv1000 kv750 kv500"` 与 `style="--t1:var(--c-kv1000);--t2:var(--c-kv750);--t3:var(--c-kv500)"`

- [ ] **Step 1: 写失败测试**

在 `src/export/svgVoltagePaint.test.ts` 追加：

```ts
import { buildSvgDocument as build } from "./svg.ts";

const threeWindingTransformer = () => ({
  id: "ACTransfomer3-1",
  kind: "ac-three-winding-transformer",
  name: "三绕组主变-1",
  position: { x: 400, y: 100 },
  size: { width: 150, height: 110 },
  rotation: 0,
  scaleX: 1,
  scaleY: 1,
  layerId: "layer-default",
  terminals: [
    { id: "t1", label: "", type: "ac", anchor: { x: -0.5, y: -0.1 }, nodeNumber: "1", vbase: "1000" },
    { id: "t2", label: "", type: "ac", anchor: { x: 0.5, y: -0.1 }, nodeNumber: "2", vbase: "750" },
    { id: "t3", label: "", type: "ac", anchor: { x: 0, y: 0.5 }, nodeNumber: "3", vbase: "500" }
  ],
  params: { i_vbase: "1000", j_vbase: "750", k_vbase: "500" }
} as never);

describe("多端子器件的 use 类与槽", () => {
  const svg = build([threeWindingTransformer()], [], {
    width: 800, height: 600, colorDisplayMode: "voltage"
  });

  it("use 挂全部端子电压类", () => {
    expect(svg).toMatch(/class="kv1000 kv750 kv500"/);
  });

  it("use 上有按端子顺序的槽赋值", () => {
    expect(svg).toContain("--t1:var(--c-kv1000)");
    expect(svg).toContain("--t2:var(--c-kv750)");
    expect(svg).toContain("--t3:var(--c-kv500)");
  });

  it("symbol 内按位置消费槽", () => {
    const symbolSection = svg.slice(svg.indexOf("<defs"), svg.indexOf("</defs>"));
    expect(symbolSection).toContain('stroke="var(--t1)"');
    expect(symbolSection).toContain('stroke="var(--t2)"');
    expect(symbolSection).toContain('stroke="var(--t3)"');
  });

  it("symbol 内不出现电压色字面值", () => {
    const symbolSection = svg.slice(svg.indexOf("<defs"), svg.indexOf("</defs>"));
    for (const hex of ["#0e7490", "#0891b2", "#dc2626", "#b91c1c"]) {
      expect(symbolSection).not.toContain(hex);
    }
  });
});
```

- [ ] **Step 2: 运行确认失败**

Run: `pnpm vitest run src/export/svgVoltagePaint.test.ts`
Expected: FAIL —— `class="kv1000 kv750 kv500"` 不存在（当前只有 `class="kv1000"`）

- [ ] **Step 3: 样式表加颜色源**

`src/export/svg.ts:508-513` 的循环体改为：

```ts
      .forEach(({ type, voltage, color }) => {
        const deviceClass = exportVoltageDeviceClass(type, voltage);
        const lineClass = exportVoltageLineClass(type, voltage);
        rules.push(`.${deviceClass}{${exportVoltageColorVar(deviceClass)}:${color};stroke:var(${exportVoltageColorVar(deviceClass)});color:var(${exportVoltageColorVar(deviceClass)});fill:var(${exportVoltageColorVar(deviceClass)})}`);
        rules.push(`.${lineClass}{${exportVoltageColorVar(lineClass)}:${color};fill:none;stroke:var(${exportVoltageColorVar(lineClass)});color:var(${exportVoltageColorVar(lineClass)})}`);
      });
```

在 `exportVoltageLineClass`（`svg.ts:387-388`）之后新增：

```ts
  const exportVoltageColorVar = (className: string) => `--c-${className}`;
```

> 保留 `fill:var(...)`：实测全扫 169 个 kind，每个可填色元素自身或祖先链都有 fill，0 例外，故不会波及白色本体；保留它让下游覆盖 `fill:` 也能生效。

- [ ] **Step 4: 登记全部端子电压**

`nodeVoltageDescriptor`（`svg.ts:418-429`）当前只在节点级登记一次。改为在该函数内把**该器件全部电端子**的电压都登记进 `voltageStyleRules`：

```ts
  const nodeVoltageDescriptor = (node: ModelNode) => {
    if (colorDisplayMode !== "voltage") {
      return null;
    }
    // 多端子器件：每个端子电压都要有 --c-<类名> 定义，否则 var(--tN) 会静默解析失败
    node.terminals
      .filter((terminal) => isExportElectricTerminalType(terminal.type))
      .forEach((terminal) => addVoltageStyleRule(terminal.type, terminalExportVoltage(node, terminal)));
    const descriptor = nodeExportVoltageDescriptor(node);
    if (!descriptor) {
      return null;
    }
    const { type, voltage } = descriptor;
    addVoltageStyleRule(type, voltage);
    return descriptor;
  };
```

- [ ] **Step 5: `<use>` 挂全部端子类**

在 `svg.ts:768-771` 附近，把单一 `nodeVoltageClass` 换成去重后的全端子类集合。新增 helper（放在 `nodeVoltageDescriptor` 之后）：

```ts
  const nodeVoltageClasses = (node: ModelNode) => {
    if (colorDisplayMode !== "voltage") {
      return "";
    }
    const classes = node.terminals
      .filter((terminal) => isExportElectricTerminalType(terminal.type))
      .map((terminal) => exportVoltageDeviceClass(terminal.type, terminalExportVoltage(node, terminal)));
    if (classes.length === 0) {
      const descriptor = nodeExportVoltageDescriptor(node);
      return descriptor ? exportVoltageDeviceClass(descriptor.type, descriptor.voltage) : "";
    }
    return Array.from(new Set(classes)).join(" ");
  };
  const nodeVoltageSlotDeclarations = (node: ModelNode) => {
    if (colorDisplayMode !== "voltage") {
      return "";
    }
    const electricTerminals = node.terminals.filter((terminal) => isExportElectricTerminalType(terminal.type));
    if (electricTerminals.length <= 1) {
      return "";
    }
    const primaryClass = exportVoltageDeviceClass(electricTerminals[0].type, terminalExportVoltage(node, electricTerminals[0]));
    return electricTerminals
      .map((terminal, index) => {
        const className = exportVoltageDeviceClass(terminal.type, terminalExportVoltage(node, terminal));
        // 槽链失效时会静默取错色或元素消失，故宁可链到端子 1 也不留空槽
        const source = registeredVoltageClasses.has(className) ? className : primaryClass;
        return `--t${index + 1}:var(${exportVoltageColorVar(source)})`;
      })
      .join(";");
  };
```

为支撑上面的成员判断，在 `svg.ts:390` 的 `voltageStyleRules` 旁新增集合，并在 `addVoltageStyleRule` 内登记：

```ts
  const voltageStyleRules = new Map<string, { type: "ac" | "dc"; voltage: string; color: string }>();
  const registeredVoltageClasses = new Set<string>();
  const addVoltageStyleRule = (type: "ac" | "dc", voltage: string, color = voltageLevelColor(voltage, type, colorPalette)) => {
    const normalizedVoltage = exportVoltageValue(voltage);
    voltageStyleRules.set(`${type}:${normalizedVoltage}`, { type, voltage: normalizedVoltage, color: exportVoltageCssColor(color) });
    registeredVoltageClasses.add(exportVoltageDeviceClass(type, normalizedVoltage));
  };
```

把 `:769-771` 改为：

```ts
      const nodeVoltageClass = nodeVoltageClasses(node);
      const nodeSlotStyle = nodeVoltageSlotDeclarations(node);
      const nodeClassName = [exportButtonClass, nodeVoltageClass].filter(Boolean).join(" ");
      const nodeClassAttribute = nodeClassName ? ` class="${escapeXml(nodeClassName)}"` : "";
```

- [ ] **Step 6: `svgDisplayAttribute` 支持追加声明**

`src/svgExportUtils.ts:80-82` 改为：

```ts
export function svgDisplayAttribute(visible: boolean, extraDeclarations = "") {
  const declarations = [visible ? "" : "display:none", extraDeclarations].filter(Boolean).join(";");
  return declarations ? ` style="${declarations}"` : "";
}
```

> 这是本任务最容易踩的坑：`<use>` 上已经可能带 `style="display:none"`，直接再输出一个 `style=` 会顶掉隐藏属性。

- [ ] **Step 7: `<use>` 输出合并 style 并传 voltagePaint**

`svg.ts:781` 的 `svgDisplayAttribute(layerVisible(layerId))` 改为 `svgDisplayAttribute(layerVisible(layerId), nodeSlotStyle)`。

`svg.ts:697-701` 构造 `voltageColoredNode` 后，为多端子器件准备槽引用，并把 `voltagePaint` 传给两次 `DeviceGlyph` 调用：

```ts
        const glyphVoltagePaint = colorDisplayMode === "voltage" && nodeExportVoltageDescriptor(symbolNode)
          ? {
              nodeRef: symbolNode.terminals.filter((terminal) => isExportElectricTerminalType(terminal.type)).length > 1
                ? "var(--t1)"
                : undefined,
              terminalRef: (terminalId: string) => {
                const index = symbolNode.terminals.findIndex((terminal) => terminal.id === terminalId);
                return index >= 0 ? `var(--t${index + 1})` : undefined;
              }
            }
          : null;
```

并在 `DeviceGlyph({ node: voltageColoredNode, mode: "geometry", colorDisplayMode, colorPalette: glyphColorPalette, stateVisual })` 与对应的 `mode: "text"` 调用里都加 `voltagePaint: glyphVoltagePaint`。

- [ ] **Step 8: 运行确认通过**

Run: `pnpm vitest run src/export/svgVoltagePaint.test.ts`
Expected: PASS

- [ ] **Step 9: 提交**

```bash
git add src/export/svg.ts src/svgExportUtils.ts src/export/svgVoltagePaint.test.ts
git commit -m "feat(svg): use 挂全部端子电压类并按端子赋值槽变量

- 样式表改为单一 token 派生 --c-<类名>
- nodeVoltageDescriptor 登记全部端子电压，避免 --c-kvN 缺失
- svgDisplayAttribute 支持追加声明，槽与 display:none 合并进同一 style
- DeviceGlyph 传入 voltagePaint（节点级 var(--t1)、端子级 var(--tN)）"
```

---

### Task 3: 端子引线走槽

**Files:**
- Modify: `src/export/svg.ts:170-190`（`buildSvgDeviceConnectorMarkup`）、调用点 `:702`
- Test: `src/export/svgVoltagePaint.test.ts`

**Interfaces:**
- Consumes: `DeviceGlyphVoltagePaint` 的 `terminalRef` 语义（Task 1/2）
- Produces: 引线 `stroke` 在导出态改为 `inherit`（单电压删属性）或 `var(--tN)`（多端子）

- [ ] **Step 1: 写失败测试**

```ts
  it("端子引线按端子走槽（多端子）或删字面色（单电压）", () => {
    const symbolSection = svg.slice(svg.indexOf("<defs"), svg.indexOf("</defs>"));
    // 三绕组主变的引线共 3 根，依次链到 --t1/--t2/--t3
    expect(symbolSection.match(/stroke="var\(--t[123]\)"/g)?.length).toBeGreaterThanOrEqual(3);
  });
```

- [ ] **Step 2: 运行确认失败**

Run: `pnpm vitest run src/export/svgVoltagePaint.test.ts`
Expected: FAIL —— 引线仍是字面 hex

- [ ] **Step 3: 改造引线生成**

`src/export/svg.ts:170-190` 加一个可选参数并改颜色输出：

```ts
export function buildSvgDeviceConnectorMarkup(
  node: ModelNode,
  colorDisplayMode: ColorDisplayMode = "energy",
  colorPalette: ColorPalette = DEFAULT_COLOR_PALETTE,
  voltagePaint: { terminalRef?: (terminalId: string) => string | undefined } | null = null
) {
```

函数体内 `const terminalColor = getTerminalDisplayColor(node, terminal, colorDisplayMode, colorPalette);` 之后追加：

```ts
      const paintRef = voltagePaint?.terminalRef?.(String(terminal.id ?? ""));
      const strokeAttribute = paintRef
        ? ` stroke="${escapeXml(paintRef)}"`
        : voltagePaint
          ? "" // 导出态单电压器件：删属性，靠 <use class> 继承
          : ` stroke="${escapeXml(terminalColor)}"`;
```

并把 `<line ... stroke="${escapeXml(terminalColor)}" ...>` 里的该段换成 `${strokeAttribute}`。

- [ ] **Step 4: 调用点传入**

`src/export/svg.ts:702` 改为：

```ts
        const connectorMarkup = buildSvgDeviceConnectorMarkup(voltageColoredNode, colorDisplayMode, colorPalette, glyphVoltagePaint);
```

（`glyphVoltagePaint` 定义在 Task 2 Step 7，在同一作用域内，需确保它在此之前定义）

- [ ] **Step 5: 运行确认通过**

Run: `pnpm vitest run src/export/svgVoltagePaint.test.ts`
Expected: PASS

- [ ] **Step 6: 提交**

```bash
git add src/export/svg.ts src/export/svgVoltagePaint.test.ts
git commit -m "feat(svg): 端子引线走槽变量"
```

---

### Task 4: 线路与边界母线内连删字面色

**Files:**
- Modify: `src/export/svg.ts:546-563`（`buildBoundaryBusInternalConnectorMarkup`）、`:567`、`:592`
- Test: `src/export/svgVoltagePaint.test.ts`

- [ ] **Step 1: 写失败测试**

用仓库现成的 baseline 夹具（含真实 nodes + edges），在电压模式下跑：

```ts
import { SVG_BASELINE_EDGES, SVG_BASELINE_NODES } from "./fixtures/svg-baseline";

it("电压模式下线路 path 与边界母线内连都不写字面 stroke", () => {
  const out = build(SVG_BASELINE_NODES as never, SVG_BASELINE_EDGES as never, {
    width: 800, height: 600, colorDisplayMode: "voltage"
  });
  const edgeTags = Array.from(out.matchAll(/<path id="edge-[^"]*"[^>]*>/g)).map((m) => m[0]);
  expect(edgeTags.length).toBeGreaterThan(0);
  for (const tag of edgeTags) {
    expect(tag).toMatch(/class="lkv|class="ldcv/);
    expect(tag).not.toMatch(/stroke="#[0-9a-f]{3,8}"/i);
  }
});
```

- [ ] **Step 2: 运行确认失败**

Run: `pnpm vitest run src/export/svgVoltagePaint.test.ts`
Expected: FAIL（`<path>` 上仍有 `stroke="#..."`）

- [ ] **Step 3: 改造**

`:567` 之后加：

```ts
      const edgeVoltageStroke = colorDisplayMode === "voltage" && edgeVoltageDescriptor(edge) ? "" : ` stroke="${escapeXml(stroke)}"`;
```

`:592` 的 `<path ... stroke="${escapeXml(stroke)}" ...>` 换成 `${edgeVoltageStroke}`（保留 `fill="none"`、`stroke-width`、`stroke-linecap`、`stroke-linejoin`）。

`:546` 的函数签名加参数 `suppressStroke = false`，`:562` 的 `<line ... stroke="${escapeXml(stroke)}" ...>` 改为 `${suppressStroke ? "" : ` stroke="${escapeXml(stroke)}"`}`；调用点 `:586`/`:587` 传入 `colorDisplayMode === "voltage" && Boolean(edgeVoltage)`。

- [ ] **Step 4: 运行确认通过**

Run: `pnpm vitest run src/export/svgVoltagePaint.test.ts`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add src/export/svg.ts src/export/svgVoltagePaint.test.ts
git commit -m "feat(svg): 线路与边界母线内连删字面电压色，改由 lkvN 类驱动"
```

---

### Task 5: 缓存 token 剔除电压色

**Files:**
- Modify: `src/export/svg.ts:603-654`（`cacheableStandardSymbolVisualToken`）
- Test: `src/export/svgVoltagePaint.test.ts`

- [ ] **Step 1: 写失败测试**

```ts
  it("同种图元跨电压合并为一个 symbol", () => {
    const two = build([busNode(), { ...busNode(), id: "ac-bus-2", position: { x: 400, y: 100 } } as never], [], {
      width: 800, height: 600, colorDisplayMode: "voltage"
    });
    // 两个不同电压的母线只应有一个 symbol
    expect(two.match(/<symbol id="/g)?.length).toBe(1);
  });

  it("端子引线槽不参与 symbol 去重（同 kind 不同电压仍合并）", () => {
    const two = build([
      threeWindingTransformer(),
      { ...threeWindingTransformer(), id: "ACTransfomer3-2", position: { x: 700, y: 100 } } as never
    ], [], { width: 1200, height: 600, colorDisplayMode: "voltage" });
    expect(two.match(/<symbol id="/g)?.length).toBe(1);
  });
```

- [ ] **Step 2: 运行确认失败**

Run: `pnpm vitest run src/export/svgVoltagePaint.test.ts`
Expected: FAIL —— symbol 数为 2（当前正文含电压色，签名不同）

- [ ] **Step 3: 改造**

`svg.ts:630` 的 `getTerminalDisplayColor(symbolNode, terminal, colorDisplayMode, colorPalette)` 与 `:640` 的 `getDeviceStrokeColor(symbolNode, colorDisplayMode, colorPalette)` 在电压模式下改为空串：

```ts
      colorDisplayMode === "voltage" ? "" : getTerminalDisplayColor(symbolNode, terminal, colorDisplayMode, colorPalette)
```

```ts
      colorDisplayMode === "voltage" ? "" : getDeviceStrokeColor(symbolNode, colorDisplayMode, colorPalette),
```

**保留** `:651` 的 `deviceStateVisualToken(stateVisual)`（开合状态仍按状态建 symbol）、`:622` 的 `terminal.vbase`（不影响正确性，仅影响快路径命中率）。

- [ ] **Step 4: 运行确认通过**

Run: `pnpm vitest run src/export/svgVoltagePaint.test.ts`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add src/export/svg.ts src/export/svgVoltagePaint.test.ts
git commit -m "perf(svg): 同种图元跨电压共用 symbol

cacheableStandardSymbolVisualToken 在电压模式下剔除
getDeviceStrokeColor / getTerminalDisplayColor，保留状态视觉 token。"
```

---

### Task 6: 槽完整性结构断言

**Files:**
- Test: `src/export/svgVoltagePaint.test.ts`

- [ ] **Step 1: 写断言**

```ts
describe("槽完整性", () => {
  it("槽数等于电端子数（含 4 端子主变）", () => {
    const neutral = {
      ...threeWindingTransformer(),
      id: "ACTransfomer3-4",
      kind: "ac-three-winding-transformer-neutral",
      terminals: [
        ...(threeWindingTransformer() as never as { terminals: unknown[] }).terminals,
        { id: "t4", label: "", type: "ac", anchor: { x: 0, y: -0.5 }, nodeNumber: "4", vbase: "500" }
      ]
    } as never;
    const out = build([neutral], [], { width: 800, height: 600, colorDisplayMode: "voltage" });
    const styleMatch = out.match(/<use[^>]*style="([^"]*)"/);
    expect(styleMatch?.[1] ?? "").toContain("--t4:");
  });

  it("每个 var(--tN) 都有对应的 --c-<类名> 定义", () => {
    const declared = new Set(Array.from(svg.matchAll(/--c-([A-Za-z0-9_-]+):/g)).map((m) => m[1]));
    const used = Array.from(svg.matchAll(/var\(--c-([A-Za-z0-9_-]+)\)/g)).map((m) => m[1]);
    for (const name of used) {
      expect(declared.has(name)).toBe(true);
    }
  });

  it("symbol 内用到的槽号 ⊆ use 上定义的槽号", () => {
    const useSlots = new Set(Array.from(svg.matchAll(/--t(\d+):/g)).map((m) => m[1]));
    const symbolSection = svg.slice(svg.indexOf("<defs"), svg.indexOf("</defs>"));
    const symbolSlots = Array.from(symbolSection.matchAll(/var\(--t(\d+)\)/g)).map((m) => m[1]);
    for (const slot of symbolSlots) {
      expect(useSlots.has(slot)).toBe(true);
    }
  });

  it("槽样式与 display:none 合并在同一个 style 属性", () => {
    const useTags = Array.from(svg.matchAll(/<use\b[^>]*>/g)).map((m) => m[0]);
    for (const tag of useTags) {
      expect((tag.match(/ style="/g) ?? []).length).toBeLessThanOrEqual(1);
    }
  });
});
```

- [ ] **Step 2: 运行**

Run: `pnpm vitest run src/export/svgVoltagePaint.test.ts`
Expected: PASS。若第一条失败，说明 `nodeVoltageSlotDeclarations` 的端子数上限仍硬编码为 3 —— 修掉它。

- [ ] **Step 3: 提交**

```bash
git add src/export/svgVoltagePaint.test.ts src/export/svg.ts
git commit -m "test(svg): 槽完整性结构断言（槽数/颜色源/槽号包含/style 合并）"
```

---

### Task 7: 导出图回读路径不丢色

**Files:**
- Modify: `src/stateIconDrawing.tsx:644-693`
- Test: `src/stateIconDrawing.test.tsx`（若不存在则新建）

- [ ] **Step 1: 写失败测试**

```ts
import { buildSvgDocument } from "./export/svg.ts";
import { SVG_BASELINE_EDGES, SVG_BASELINE_NODES } from "./export/fixtures/svg-baseline";

it("回读电压模式导出图时，symbol 正文有宿主提供 class 与槽", async () => {
  const exported = buildSvgDocument(SVG_BASELINE_NODES as never, SVG_BASELINE_EDGES as never, {
    width: 800, height: 600, colorDisplayMode: "voltage"
  });
  const normalized = await normalizeStateIconSvgSource(exported); // 用该文件内实际导出的入口函数名
  expect(normalized).toContain("<g class=");          // 宿主元素承载 use 上的类
  expect(normalized).not.toMatch(/<g\b[^>]*style="[^"]*display\s*:\s*none/); // 不得拷入 display:none
});
```

> 入口函数名以 `src/stateIconDrawing.tsx` 里实际导出的调用路径为准（`stateIconSvgPlatformExportFallback` 是内部函数，从同文件已导出的入口驱动它）。

- [ ] **Step 2: 运行确认失败**

Run: `pnpm vitest run src/stateIconDrawing.test.tsx`
Expected: FAIL —— 产出里只有 `<defs>` + symbol 正文，没有承载 class/style 的宿主

- [ ] **Step 3: 用 `<g>` 承载 use 上的类与槽**

问题根源：`src/stateIconDrawing.tsx:687` 只输出 `${defs}${symbolBody}`，丢掉了 `<use>` 这个宿主 —— symbol 正文里的 `currentColor` 与 `var(--tN)` 全部失去来源。`defs` 里已含 `<style>`，所以只要补一个承载宿主即可。

把 `:675-687` 改为：

```ts
  const sourceTerminalCount = readSvgMarkupAttribute(useMarkup, STATE_ICON_PLATFORM_EXPORT_TERMINAL_COUNT_ATTRIBUTE);
  const parsedTerminalCount = Number.parseInt(sourceTerminalCount, 10);
  const hasSourceTerminals = sourceTerminalCount === "" || !Number.isFinite(parsedTerminalCount)
    ? true
    : parsedTerminalCount > 0;
  const frame = stateIconDrawingFrameRect(hasSourceTerminals);
  const defs = Array.from(source.matchAll(/<defs\b[\s\S]*?<\/defs>/giu))
    .map((match) => match[0])
    .join("");
  // 补回 <use> 这个宿主：symbol 正文用 currentColor / var(--tN) 取色，缺了宿主就会掉色。
  // 只拷 --tN 槽声明，不拷 display:none —— 回读产物是独立根文档，隐藏不该带过去。
  const useClassName = escapeXml(readSvgMarkupAttribute(useMarkup, "class"));
  const useSlotDeclarations = escapeXml(
    readSvgMarkupAttribute(useMarkup, "style")
      .split(";")
      .map((declaration) => declaration.trim())
      .filter((declaration) => declaration.startsWith("--t"))
      .join(";")
  );
  const useHostAttributeMarkup = [
    useClassName ? ` class="${useClassName}"` : "",
    useSlotDeclarations ? ` style="${useSlotDeclarations}"` : ""
  ].join("");
  const sourceTerminalCountMarkup = sourceTerminalCount === ""
    ? ""
    : ` ${STATE_ICON_PLATFORM_EXPORT_TERMINAL_COUNT_ATTRIBUTE}="${escapeXml(sourceTerminalCount)}"`;
  const normalizedSource = `<svg xmlns="http://www.w3.org/2000/svg" data-state-icon-platform-device="true" data-state-icon-source-dev-kind="${escapeXml(declaredDeviceKind)}"${sourceTerminalCountMarkup} viewBox="${escapeXml(symbolViewBox)}" preserveAspectRatio="xMidYMid meet">${defs}<g${useHostAttributeMarkup}>${symbolBody}</g></svg>`;
```

- [ ] **Step 4: 运行确认通过**

Run: `pnpm vitest run src/stateIconDrawing.test.tsx`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add src/stateIconDrawing.tsx src/stateIconDrawing.test.tsx
git commit -m "fix(stateIcon): 回读电压模式导出图时回填字面电压色"
```

---

### Task 8: 更新既有断言 + 全量回归

**Files:**
- Modify: `src/svgExport.test.tsx:1829-1833`、`:1886`、`:1912`
- Test: 全量

- [ ] **Step 1: 更新规则形状断言**

`:1829`、`:1830`、`:1831`、`:1832`、`:1886` 五处断言旧规则串，改为断言新的 token 派生形状（例如 `expect(defs).toContain("--c-kv10:#ff0000")`）。

- [ ] **Step 2: 反向改写 :1833**

`expect(defs).toContain('stroke="#ff0000"')` 断言的正是「symbol 内字面电压色」——本设计的反面契约。改为：

```ts
    // 电压模式下 symbol 内不得出现调色板电压色
    const symbolSection = svg.slice(svg.indexOf("<defs"), svg.indexOf("</defs>"));
    expect(symbolSection).not.toContain('stroke="#ff0000"');
```

- [ ] **Step 3: 更新 :1912 多类断言**

改为断言 `<use>` 上出现全部端子类（如 `class="dcv750 dcv1500"`），具体以该用例构造的节点端子电压为准。

- [ ] **Step 4: 全量回归**

Run: `pnpm vitest run`
Expected: 全绿

- [ ] **Step 5: 类型与审计**

Run: `pnpm tsc --noEmit && pnpm audit:names`
Expected: 无错误

- [ ] **Step 6: 确认 energy 路径零漂移**

Run: `pnpm vitest run src/export/svg.golden.test.ts`
Expected: PASS（sha256 未变）。若变红，说明改动污染了 energy 路径，**必须回退定位，不得回写基线**。

- [ ] **Step 7: 目视回归**

Run: `pnpm dev`，在界面里用电压配色模式导出一份含母线/开关/负荷/三绕组主变的 SVG，浏览器打开，确认：
1. 颜色与改动前一致（尤其母线不得由橙变灰）
2. 在导出文件末尾追加 `<style>.kv750{--c-kv750:#ff0000}.lkv750{--c-lkv750:#ff0000}</style>`，刷新后 750 相关图元整体变红

- [ ] **Step 8: 提交**

```bash
git add src/svgExport.test.tsx
git commit -m "test(svg): 更新电压规则形状断言并反向固化 symbol 无字面色契约"
```

---

## 自检

**Spec 覆盖：**

| Spec 章节 | 对应 Task |
|---|---|
| §2.5 / §6 首条 解析链对齐 | Task 0 |
| §3.3 样式表单 token 派生 | Task 2 Step 3 |
| §5.1 分流（含 model-hierarchy 例外、routable-line） | Task 1 Step 4-5 |
| §5.3 电压填充清单 | Task 1 Step 4（由变量重定义一次覆盖） |
| §5.4 多端子硬要求 1-4 | Task 2 Step 4-7、Task 6 |
| §5.4 第 5-6 点（槽号同序 / 4 端子） | Task 6 |
| §4.3 下游客约要点 | Task 8 Step 7 目视验证 |
| §6 缓存 token | Task 5 |
| §6 `<use>` style 合并 | Task 2 Step 6-7 |
| §6 引线 / 边 / 内连 | Task 3、Task 4 |
| §8.3 回读路径 | Task 7 |
| §8.3 静态图元多余 kv 类 | 不处理（无害，spec 已标注可选） |
| §7.1 断言更新 | Task 8 |
| §7.2 新增断言 1-9 | Task 2/4/5/6、Task 8 |

**与 spec 的偏差（有意）：** spec §8.1 风险 3 写「83 处需逐处分流」；本计划用「重定义 `stroke` 变量 + 4 处例外点」达到同一结果，改动面从 83 处降到约 5 处。已在 Task 1 说明。

**未覆盖：** §8.1 风险 9（iOS WKWebView 未实测）属实施后可验证项，不构成任务；若目标环境含 WKWebView，在 Task 8 Step 7 之后追加真机验证。
