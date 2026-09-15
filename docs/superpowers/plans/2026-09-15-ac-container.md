# 交流容器(AC Container)实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新增「交流容器」图元类(虚拟电厂/开关箱/配变箱),支持设备归属容器、容器矩形自动包围与挤出、右键添加/移出、拖拽移入/Alt 移出、容器沉底渲染,并在 E 文件导出中输出容器段与关口拓扑变换。

**Architecture:** 容器 = 特殊图元节点(方案 A)。容器自身是 `ModelNode`;成员关系存成员节点平级字段 `containerId`(容器节点 id)。布局/判定/排序全部收进新纯函数模块 `src/acContainer.ts`。E 导出走统一新段 `ACContainer`;关口容器在导出期做图变换(合成端子 + 替换绑定设备上游),画布连线不动。

**Tech Stack:** React 19 + TypeScript + Vite 7;测试 Vitest(与源文件同目录 `*.test.ts`);antd 弹窗/下拉;后端 Node `.mjs`(本计划不改后端)。

**Spec:** `docs/superpowers/specs/2026-09-15-ac-container-design.md`(commit `15ef4c79`)

## Global Constraints

- 内部存容器**节点 id**,不存 idx;面板与 E 导出展示时解析 idx/名称
- 容器**不进** `STATIC_COMPONENT_LIBRARY_BY_KIND`(`model.ts:790`),不写 `component_type: StaticContainerSymbol`
- 容器段 key 用 ASCII `ACContainer`;模板态静默过滤(不逐节点告警),不写预定义模板
- 容器节点 `containerId` 恒空(不嵌套);线路 kind 可归属容器,但挤出时豁免
- 容器填充 `pointer-events:none`,仅描边命中带与名称可点
- 排序单源:`containerFirstComparator` 同时供画布与导出 SVG
- 中文注释;短变量名;不新增模块级路径常量;不 import `.tsx`(Node 直载约束仅影响 `src/export/`、`src/cim/`,本计划容器逻辑不涉)
- 每任务结束跑 `pnpm vitest run <改动测试文件>` 并提交

## 事实基线(实现前必读,均已核实)

| 事实 | 位置 |
|------|------|
| 分组框模板(视觉样板) | `src/model.ts:3450-3458` |
| static 家族映射表 | `src/model.ts:790`(STATIC_COMPONENT_LIBRARY_BY_KIND) |
| 设备库装配 | `src/model.ts:3320` BASE_DEVICE_LIBRARY → `:6012-6025` |
| ModelNode 结构 | `src/model.ts:468-487` |
| 右键菜单注册 | `src/appExtracted/appContextMenus.tsx:121-128`(组合/解散样板) |
| 菜单处理工厂装配 | `src/appExtracted/appRenderBatch.tsx:1397-1398` |
| 包围盒纯逻辑 | `src/selectionActions.ts:732` boundsForNodesAndEdges |
| 属性行区 | `src/appExtracted/appRightPanel.tsx:1062-1112`;特殊行先例 `:1107-1109` |
| 动态下拉先例 | `src/hooks/useBatchEditors.tsx:260-272`(paramOptionsForDefinition) |
| 拖拽提交点 | `src/appExtracted/appCanvasInteractionFactories.tsx:1224-1355`(createFinishNodeDrag) |
| 画布渲染序 | `src/appExtracted/appCanvasArea.tsx:1012`(LOD)/`:1016`(detailed) |
| 画布排序 hook | `src/appExtracted/appToolbarHookFactories.tsx:2060-2064`(callback57 比较器) |
| 导出 SVG 分层 | `src/export/svg.ts:275`(orderNodesByModelLayer)/`:317-324`(分层)/`:958-982`(输出序) |
| E 段列定义 | `src/model-eexport.ts:33-50`(E_SECTION_COLUMNS) |
| inferESection | `src/model-eexport.ts:336-344`(static 分支先于 E_KIND_SECTION_MAP) |
| 模板态过滤 | `src/model-eexport.ts:2010-2017`;告警 `:2040-2074` |
| 拓扑节点表构建 | `src/model-eexport.ts:1542-1564`(仅带 nodeNumber 端子驱动,:1552 跳过 static) |
| 导出入口 | `src/model-eexport.ts:1830-1834`(buildEDeviceRecords) |
| 拓扑计算 | `src/model-routing.ts:4702`(calculateElectricalTopology) |
| 量测组存储 | `src/measurements.ts:322-343`(ProjectMeasurementConfig.groups 按 nodeId) |
| 剪贴板构建 | `src/selectionActions.ts:582-591`(buildCanvasClipboard 整节点 spread) |
| 键盘移动提交 | `src/appExtracted/appCanvasInteractionFactories.tsx`(createFinishKeyboardMove) |
| 程序化加图元 | `src/appExtracted/appControlFactories.tsx`(createProgrammaticAddDevice) |
| SVG 导入 | `src/svgModelImport.ts` |
| CIM | 无需改动(`src/cim/cim-builder.ts:50-96` 按电压 0 跳过) |

---

### Task 1: 数据模型 — 3 个 DeviceKind、模板注册、containerId 字段

**Files:**
- Modify: `src/model.ts`(DeviceKind 联合 `:32-250`;BASE_DEVICE_LIBRARY `:3320` 静态图元段后;ModelNode `:468-487`)
- Test: `src/acContainerModel.test.ts`(新建,只放本任务断言;后续任务追加)

**Interfaces:**
- Produces:
  - `type DeviceKind` 新增 `"ac-vpp-box" | "ac-switch-box" | "ac-distribution-box"`
  - `ModelNode.containerId?: string`
  - `const AC_CONTAINER_KINDS: readonly DeviceKind[]`(导出,供后续任务)
  - `function isAcContainerKind(kind: string): boolean`(导出)

- [ ] **Step 1: 读样板**

读 `src/model.ts:3450-3458`(static-group-box 模板)、`:790-793`(static 家族映射)、`:32-250`(DeviceKind 联合尾部)、`:468-487`(ModelNode)、`:6012-6025`(库装配管道)。确认模板对象字段名与 DeviceKind 书写风格。

- [ ] **Step 2: 写失败测试**

```ts
// src/acContainerModel.test.ts
import { describe, test, expect } from "vitest";
import {
  DEVICE_LIBRARY_BY_KIND,
  AC_CONTAINER_KINDS,
  isAcContainerKind,
} from "./model";

describe("交流容器数据模型", () => {
  test("3 个容器 kind 已注册且分类为交流容器", () => {
    expect(AC_CONTAINER_KINDS).toEqual([
      "ac-vpp-box",
      "ac-switch-box",
      "ac-distribution-box",
    ]);
    for (const kind of AC_CONTAINER_KINDS) {
      const tpl = DEVICE_LIBRARY_BY_KIND.get(kind);
      expect(tpl, `${kind} 未注册`).toBeTruthy();
      expect(tpl!.categoryLibrary).toBe("交流容器");
    }
  });

  test("容器不进 static 家族(不写 component_type)", () => {
    for (const kind of AC_CONTAINER_KINDS) {
      const tpl = DEVICE_LIBRARY_BY_KIND.get(kind)!;
      const params = (tpl as any).defaults?.params ?? (tpl as any).defaultParams ?? {};
      expect(params.component_type).toBeUndefined();
      expect(isAcContainerKind(kind)).toBe(true);
    }
    expect(isAcContainerKind("static-group-box")).toBe(false);
  });
});
```

- [ ] **Step 3: 运行确认失败**

Run: `pnpm vitest run src/acContainerModel.test.ts`
Expected: FAIL — `AC_CONTAINER_KINDS` 未导出 / import 报错

- [ ] **Step 4: 实现**

1. `DeviceKind` 联合尾部加 3 项(kind 字符串即上表)。
2. `ModelNode` 加 `containerId?: string;`(与 `layerId?` 相邻,注释「所属交流容器节点 id;空 = 无容器」)。
3. `BASE_DEVICE_LIBRARY` 中静态图元段之后、`ac-source` 段(`:3685`)之前,加 3 条模板。照抄 `:3450-3458` 分组框模板结构,逐项改:

```ts
{
  kind: "ac-vpp-box",
  label: "虚拟电厂",
  categoryLibrary: "交流容器",
  defaultSize: { width: 180, height: 112 },
  defaults: {
    params: {
      fillColor: "transparent",
      strokeColor: "#64748b",
      cornerRadius: "8",
      strokeStyle: "dashed",
      textAlign: "left",
      verticalAlign: "top",
    },
  },
},
// ac-switch-box → "开关箱";ac-distribution-box → "配变箱",其余同上
```

字段名以 `:3450-3458` 实际结构为准(如 `defaultSize`/`defaults` 命名不同则照抄真实名)。**不要**加 `component_type`。

4. 文件尾导出:

```ts
export const AC_CONTAINER_KINDS = [
  "ac-vpp-box",
  "ac-switch-box",
  "ac-distribution-box",
] as const satisfies readonly DeviceKind[];

export function isAcContainerKind(kind: string): boolean {
  return (AC_CONTAINER_KINDS as readonly string[]).includes(kind);
}
```

- [ ] **Step 5: 运行确认通过**

Run: `pnpm vitest run src/acContainerModel.test.ts`
Expected: PASS(2 tests)

- [ ] **Step 6: 回归 + 提交**

Run: `pnpm vitest run src/model.test.ts`
Expected: PASS(若无该文件则跳过)

```bash
git add src/model.ts src/acContainerModel.test.ts
git commit -m "feat(container): 交流容器 3 图元注册与 containerId 字段"
```

---

### Task 2: 容器图元绘制与命中策略

**Files:**
- Modify: `src/DeviceGlyph.ts`(绘制分支;参考 static-group-box `:417-433`)
- Test: `src/acContainerModel.test.ts`(追加)

**Interfaces:**
- Consumes: Task 1 `isAcContainerKind`
- Produces: 容器渲染输出带 `data-container-box="1"` 与两个 class:`ac-container-fill`(pointer-events:none)、`ac-container-stroke-hit`(透明加宽命中带)

- [ ] **Step 1: 读样板**

读 `src/DeviceGlyph.ts:417-433`(static-group-box 分支:矩形 + header-rule path)与 `:235/:258`(transparent 填充写法)。

- [ ] **Step 2: 写失败测试(渲染输出断言)**

```ts
// src/acContainerModel.test.ts 追加
import { renderDeviceGlyphToStaticMarkup } from "./DeviceGlyph"; // 以实际导出名为准,先读文件确认

describe("容器图元绘制", () => {
  test("容器输出 pointer-events:none 填充与加宽命中带", () => {
    const html = renderDeviceGlyphToStaticMarkup({
      kind: "ac-vpp-box",
      size: { width: 180, height: 112 },
      params: { strokeColor: "#64748b", cornerRadius: "8", strokeStyle: "dashed" },
      name: "虚拟电厂1",
    } as any);
    expect(html).toContain("ac-container-fill");
    expect(html).toContain("pointer-events:none");
    expect(html).toContain("ac-container-stroke-hit");
    expect(html).toContain("虚拟电厂1");
  });
});
```

若 DeviceGlyph 无静态 markup 导出,改为断言其纯函数分支返回的节点属性(读文件后按实际 API 调整,保持三条断言不变:填充不可命中、命中带存在、名称可见)。

- [ ] **Step 3: 运行确认失败**

Run: `pnpm vitest run src/acContainerModel.test.ts`
Expected: FAIL — 断言不满足 / 导出不存在

- [ ] **Step 4: 实现**

在 DeviceGlyph 中加 `isAcContainerKind(kind)` 分支:

```tsx
// 容器:透明填充不参与命中,描边 + 加宽透明命中带 + 左上名称
<g data-container-box="1">
  <rect className="ac-container-fill" x={0} y={0} width={w} height={h}
        rx={corner} fill="transparent" style={{ pointerEvents: "none" }} />
  <rect className="ac-container-stroke-hit" x={0} y={0} width={w} height={h}
        rx={corner} fill="none" stroke="transparent" strokeWidth={8} />
  <rect x={0} y={0} width={w} height={h} rx={corner} fill="none"
        stroke={strokeColor} strokeDasharray="6 4" style={{ pointerEvents: "none" }} />
  <text x={8} y={18} style={{ pointerEvents: "none" }}>{name}</text>
</g>
```

- [ ] **Step 5: 运行确认通过**

Run: `pnpm vitest run src/acContainerModel.test.ts`
Expected: PASS

- [ ] **Step 6: 提交**

```bash
git add src/DeviceGlyph.ts src/acContainerModel.test.ts
git commit -m "feat(container): 容器图元绘制与命中策略(填充穿透/描边命中带)"
```

---

### Task 3: acContainer.ts 布局纯函数

> **执行修正(2026-09-15,Task 3 审查裁决):** 平台 node.position 是**中心**(DeviceGlyph/命中框/bodyVisualBoxForNode 三处实证)。本任务及后续所有算式按中心锚定:`fitContainerToMembers` 的 position = 矩形左上角 + w/2,h/2;`ejectOutsiders` 容器真实矩形 = position±size/2、判定点 = n.position、推出量 = 边界 ± CONTAINER_PADDING。`containerBoundsForMembers` 返回**左上角锚定** Rect,不得直接当 position 用。以 `src/acContainer.ts` 实现为准。

**Files:**
- Create: `src/acContainer.ts`
- Test: `src/acContainer.test.ts`

**Interfaces:**
- Consumes: `ModelNode`、`isAcContainerKind`(Task 1)、`calculateNodeVisualBounds`(`src/selectionActions.ts:732` 同源函数)
- Produces(后续任务全部依赖这些精确签名):

```ts
export const CONTAINER_PADDING = 24;
export const CONTAINER_MIN_SIZE = { width: 180, height: 112 };
export type Rect = { x: number; y: number; width: number; height: number };
export type NodePositionPatch = { nodeId: string; position: { x: number; y: number } };
export function isAcContainerNode(node: ModelNode): boolean;
export function containerBoundsForMembers(members: ModelNode[]): Rect | null;
export function fitContainerToMembers(container: ModelNode, members: ModelNode[]): ModelNode;
export function ejectOutsiders(container: ModelNode, nodes: ModelNode[]): NodePositionPatch[];
export function containerFirstComparator(a: ModelNode, b: ModelNode): number;
```

- [ ] **Step 1: 读样板**

读 `src/selectionActions.ts:732`(boundsForNodesAndEdges 如何调 calculateNodeVisualBounds)、`:19`(padSelectionRect)、ModelNode 的 position/size 字段名(`src/model.ts:468-487`)。

- [ ] **Step 2: 写失败测试**

```ts
// src/acContainer.test.ts
import { describe, test, expect } from "vitest";
import {
  CONTAINER_PADDING, containerBoundsForMembers, fitContainerToMembers,
  ejectOutsiders, containerFirstComparator, isAcContainerNode,
} from "./acContainer";

const node = (id: string, kind: string, x: number, y: number, w = 40, h = 30) => ({
  id, kind, name: id, position: { x, y }, size: { width: w, height: h },
  params: {}, terminals: [],
} as any);

describe("acContainer 布局", () => {
  test("包围盒 = 成员并集 + padding", () => {
    const r = containerBoundsForMembers([node("a", "ac-load", 0, 0), node("b", "ac-load", 100, 50)])!;
    expect(r.x).toBe(-CONTAINER_PADDING);
    expect(r.y).toBe(-CONTAINER_PADDING);
    expect(r.width).toBe(100 + 40 + CONTAINER_PADDING * 2);
    expect(r.height).toBe(50 + 30 + CONTAINER_PADDING * 2);
  });

  test("无成员返回 null", () => {
    expect(containerBoundsForMembers([])).toBeNull();
  });

  test("fitContainerToMembers 更新容器 position/size", () => {
    const c = node("c1", "ac-vpp-box", 999, 999, 180, 112);
    const out = fitContainerToMembers(c, [node("a", "ac-load", 10, 20)]);
    expect(out.position).toEqual({ x: 10 - CONTAINER_PADDING, y: 20 - CONTAINER_PADDING });
    expect(out.size.width).toBe(40 + CONTAINER_PADDING * 2);
  });

  test("成员全空时收缩回最小尺寸", () => {
    const c = node("c1", "ac-vpp-box", 0, 0, 500, 400);
    const out = fitContainerToMembers(c, []);
    expect(out.size).toEqual({ width: 180, height: 112 });
  });

  test("挤出:容器内非成员被推到界外,线路豁免", () => {
    const c = { ...node("c1", "ac-vpp-box", 0, 0, 200, 200), containerId: undefined };
    const insider = { ...node("in", "ac-load", 50, 50), containerId: "c1" };
    const outsider = node("out", "ac-load", 60, 60);
    const line = node("ln", "ac-line", 70, 70);
    const patches = ejectOutsiders(c as any, [c, insider, outsider, line] as any);
    const ids = patches.map((p) => p.nodeId);
    expect(ids).toContain("out");
    expect(ids).not.toContain("in");
    expect(ids).not.toContain("ln");
    // 推出后中心在容器外
    const p = patches.find((x) => x.nodeId === "out")!;
    const cx = p.position.x + 20, cy = p.position.y + 15;
    expect(cx < 0 || cx > 200 || cy < 0 || cy > 200).toBe(true);
  });

  test("排序比较器:容器恒前(底层)", () => {
    const c = node("c1", "ac-vpp-box", 0, 0);
    const a = node("a", "ac-load", 0, 0);
    expect(containerFirstComparator(c as any, a as any)).toBeLessThan(0);
    expect(containerFirstComparator(a as any, c as any)).toBeGreaterThan(0);
    expect(containerFirstComparator(a as any, node("b", "ac-load", 0, 0) as any)).toBe(0);
    expect(isAcContainerNode(c as any)).toBe(true);
  });
});
```

- [ ] **Step 3: 运行确认失败**

Run: `pnpm vitest run src/acContainer.test.ts`
Expected: FAIL — 模块不存在

- [ ] **Step 4: 实现 src/acContainer.ts**

```ts
// 交流容器:布局/判定纯函数。无副作用,不依赖 React。
import { type ModelNode, isAcContainerKind } from "./model";
import { calculateNodeVisualBounds } from "./selectionActions";

export const CONTAINER_PADDING = 24;
export const CONTAINER_MIN_SIZE = { width: 180, height: 112 };

export type Rect = { x: number; y: number; width: number; height: number };
export type NodePositionPatch = { nodeId: string; position: { x: number; y: number } };

export function isAcContainerNode(node: ModelNode): boolean {
  return isAcContainerKind(node.kind);
}

/** 成员并集包围盒 + padding;无成员返回 null */
export function containerBoundsForMembers(members: ModelNode[]): Rect | null {
  if (members.length === 0) return null;
  let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
  for (const n of members) {
    const b = calculateNodeVisualBounds(n);
    x1 = Math.min(x1, b.x); y1 = Math.min(y1, b.y);
    x2 = Math.max(x2, b.x + b.width); y2 = Math.max(y2, b.y + b.height);
  }
  return {
    x: x1 - CONTAINER_PADDING, y: y1 - CONTAINER_PADDING,
    width: x2 - x1 + CONTAINER_PADDING * 2, height: y2 - y1 + CONTAINER_PADDING * 2,
  };
}

/** 容器重算为包围成员;成员为空时收缩回最小尺寸(保持左上角) */
export function fitContainerToMembers(container: ModelNode, members: ModelNode[]): ModelNode {
  const r = containerBoundsForMembers(members);
  if (!r) {
    return { ...container, size: { ...CONTAINER_MIN_SIZE } };
  }
  return {
    ...container,
    position: { x: r.x, y: r.y },
    size: { width: Math.max(r.width, CONTAINER_MIN_SIZE.width), height: Math.max(r.height, CONTAINER_MIN_SIZE.height) },
  };
}

function centerOf(n: ModelNode) {
  return { x: n.position.x + n.size.width / 2, y: n.position.y + n.size.height / 2 };
}

/** 容器矩形内的非成员(线路豁免、容器自身豁免、已属其它容器豁免)沿最近边推到界外 */
export function ejectOutsiders(container: ModelNode, nodes: ModelNode[]): NodePositionPatch[] {
  const c = container;
  const x1 = c.position.x, y1 = c.position.y;
  const x2 = x1 + c.size.width, y2 = y1 + c.size.height;
  const out: NodePositionPatch[] = [];
  for (const n of nodes) {
    if (n.id === c.id) continue;
    if (isAcContainerNode(n)) continue;
    if (n.kind === "ac-line") continue;           // 线路豁免
    if (n.containerId) continue;                   // 属于某容器(含本容器)
    const ct = centerOf(n);
    if (ct.x < x1 || ct.x > x2 || ct.y < y1 || ct.y > y2) continue; // 中心在外
    // 最近边法向推出 + padding
    const dl = ct.x - x1, dr = x2 - ct.x, dt = ct.y - y1, db = y2 - ct.y;
    const m = Math.min(dl, dr, dt, db);
    let px = n.position.x, py = n.position.y;
    if (m === dl) px = x1 - n.size.width - CONTAINER_PADDING;
    else if (m === dr) px = x2 + CONTAINER_PADDING;
    else if (m === dt) py = y1 - n.size.height - CONTAINER_PADDING;
    else py = y2 + CONTAINER_PADDING;
    out.push({ nodeId: n.id, position: { x: px, y: py } });
  }
  return out;
}

/** 排序:容器恒前(=先绘制=底层);其余保持原序 */
export function containerFirstComparator(a: ModelNode, b: ModelNode): number {
  const ca = isAcContainerNode(a) ? 0 : 1;
  const cb = isAcContainerNode(b) ? 0 : 1;
  return ca - cb;
}
```

按真实字段名调整(`calculateNodeVisualBounds` 返回的矩形字段名、`ModelNode.position/size` 字段名),测试同步。

- [ ] **Step 5: 运行确认通过**

Run: `pnpm vitest run src/acContainer.test.ts`
Expected: PASS(6 tests)

- [ ] **Step 6: 提交**

```bash
git add src/acContainer.ts src/acContainer.test.ts
git commit -m "feat(container): 布局纯函数(包围盒/收缩/挤出/排序比较器)"
```

---

### Task 4: 归属判定与不变量出口

**Files:**
- Modify: `src/acContainer.ts`(追加)
- Test: `src/acContainer.test.ts`(追加)

**Interfaces:**
- Consumes: Task 3 全部
- Produces:

```ts
export type MembershipDecision = {
  patch: NodePositionPatch[];                 // 位置更新(容器重算 + 挤出)
  containerUpdates: ModelNode[];              // 容器节点更新(position/size)
  membershipChanges: { nodeId: string; containerId: string | undefined }[];
};
export function judgeContainerMembership(args: {
  nodes: ModelNode[];                          // 拖动后的全量节点
  movedIds: string[];                          // 本次被拖动的节点 id
  altKey: boolean;
}): { membershipChanges: MembershipDecision["membershipChanges"]; enterContainerId?: string };
export function enforceContainerMembership(nodes: ModelNode[]): MembershipDecision;
```

- [ ] **Step 1: 写失败测试**

```ts
// src/acContainer.test.ts 追加
import { judgeContainerMembership, enforceContainerMembership } from "./acContainer";

describe("归属判定", () => {
  const c = { ...node("c1", "ac-vpp-box", 0, 0, 200, 200), containerId: undefined };
  const inside = { ...node("in", "ac-load", 50, 50), containerId: "c1" };
  const outside = node("out", "ac-load", 500, 500);

  test("非成员落进容器中心点内 → 移入", () => {
    const moved = { ...outside, position: { x: 60, y: 60 } };
    const r = judgeContainerMembership({ nodes: [c, inside, moved], movedIds: ["out"], altKey: false });
    expect(r.enterContainerId).toBe("c1");
    expect(r.membershipChanges).toEqual([{ nodeId: "out", containerId: "c1" }]);
  });

  test("成员 Alt 拖动 → 移出", () => {
    const moved = { ...inside, position: { x: 60, y: 60 } };
    const r = judgeContainerMembership({ nodes: [c, moved], movedIds: ["in"], altKey: true });
    expect(r.membershipChanges).toEqual([{ nodeId: "in", containerId: undefined }]);
  });

  test("成员非 Alt 拖动 → 成员不变", () => {
    const r = judgeContainerMembership({ nodes: [c, inside], movedIds: ["in"], altKey: false });
    expect(r.membershipChanges).toEqual([]);
  });

  test("非成员 Alt 落入容器 → 不移入", () => {
    const moved = { ...outside, position: { x: 60, y: 60 } };
    const r = judgeContainerMembership({ nodes: [c, moved], movedIds: ["out"], altKey: true });
    expect(r.membershipChanges).toEqual([]);
  });

  test("enforceContainerMembership:容器随成员扩展 + 挤出非成员", () => {
    const far = { ...node("far", "ac-load", 400, 60), containerId: "c1" };
    const dec = enforceContainerMembership([c, far, outside] as any);
    const upd = dec.containerUpdates.find((u) => u.id === "c1")!;
    expect(upd.position.x).toBe(400 - 24);
    expect(dec.patch.map((p) => p.nodeId)).not.toContain("far");
  });
});
```

- [ ] **Step 2: 运行确认失败**

Run: `pnpm vitest run src/acContainer.test.ts`
Expected: FAIL — judgeContainerMembership 未导出

- [ ] **Step 3: 实现(追加到 src/acContainer.ts)**

```ts
export type MembershipDecision = {
  patch: NodePositionPatch[];
  containerUpdates: ModelNode[];
  membershipChanges: { nodeId: string; containerId: string | undefined }[];
};

/** 拖动结束判定:非成员落进容器=移入;Alt+成员=移出;Alt+非成员=不移入 */
export function judgeContainerMembership(args: {
  nodes: ModelNode[];
  movedIds: string[];
  altKey: boolean;
}) {
  const { nodes, movedIds, altKey } = args;
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const containers = nodes.filter(isAcContainerNode);
  const changes: { nodeId: string; containerId: string | undefined }[] = [];
  let enterContainerId: string | undefined;
  for (const id of movedIds) {
    const n = byId.get(id);
    if (!n || isAcContainerNode(n)) continue;
    if (n.containerId) {
      if (altKey) changes.push({ nodeId: id, containerId: undefined });
    } else if (!altKey) {
      const ct = centerOf(n);
      for (const c of containers) {
        if (n.containerId === c.id) break;
        if (ct.x >= c.position.x && ct.x <= c.position.x + c.size.width &&
            ct.y >= c.position.y && ct.y <= c.position.y + c.size.height) {
          changes.push({ nodeId: id, containerId: c.id });
          enterContainerId = c.id;
          break;
        }
      }
    }
  }
  return { membershipChanges: changes, enterContainerId };
}

/** 统一出口:按当前 containerId 重算全部容器范围 + 挤出范围内非成员 */
export function enforceContainerMembership(nodes: ModelNode[]): MembershipDecision {
  const containers = nodes.filter(isAcContainerNode);
  const containerUpdates: ModelNode[] = [];
  const patch: NodePositionPatch[] = [];
  for (const c of containers) {
    const members = nodes.filter((n) => n.containerId === c.id && n.id !== c.id);
    const fitted = fitContainerToMembers(c, members);
    containerUpdates.push(fitted);
    patch.push(...ejectOutsiders(fitted, nodes));
  }
  return { patch, containerUpdates, membershipChanges: [] };
}
```

- [ ] **Step 4: 运行确认通过**

Run: `pnpm vitest run src/acContainer.test.ts`
Expected: PASS(11 tests)

- [ ] **Step 5: 提交**

```bash
git add src/acContainer.ts src/acContainer.test.ts
git commit -m "feat(container): 归属判定与成员不变量统一出口"
```

---

### Task 5: 渲染沉底(画布 + 导出 SVG 单源排序)

**Files:**
- Modify: `src/appExtracted/appToolbarHookFactories.tsx:2060-2064`(callback57 比较器)
- Modify: `src/export/svg.ts:958-982`(分层输出序,容器层最先)
- Test: `src/acContainer.test.ts`(追加比较器在混合数组上的稳定性断言)

**Interfaces:**
- Consumes: Task 3 `containerFirstComparator`
- Produces: 画布与导出 SVG 同序(容器先输出);不改 nodes 数组

- [ ] **Step 1: 读现状**

读 `appToolbarHookFactories.tsx:2060-2064`(nodeIndexById 比较器实现)、`svg.ts:275/:317-324/:958-982`(orderNodesByModelLayer 与分层输出)。

- [ ] **Step 2: 写失败测试**

```ts
// src/acContainer.test.ts 追加
import { containerFirstComparator } from "./acContainer";

test("混合数组排序:容器全部在前,非容器保持相对序", () => {
  const arr = [node("a", "ac-load", 0, 0), node("c1", "ac-vpp-box", 0, 0),
               node("b", "ac-load", 0, 0), node("c2", "ac-switch-box", 0, 0)] as any[];
  const sorted = [...arr].sort(containerFirstComparator);
  expect(sorted.map((n) => n.id)).toEqual(["c1", "c2", "a", "b"]);
});
```

- [ ] **Step 3: 运行确认失败**

Run: `pnpm vitest run src/acContainer.test.ts -t "混合数组"`
Expected: PASS(若已通过说明比较器正确,该测试固化为守卫)

- [ ] **Step 4: 接入两处**

1. 画布:`appToolbarHookFactories.tsx:2060-2064` 的排序比较器改为先 `containerFirstComparator`、再原 nodeIndexById:

```ts
viewNodes.sort((a, b) => containerFirstComparator(a, b) || (nodeIndexById.get(a.id)! - nodeIndexById.get(b.id)!));
```

2. 导出 SVG:`src/export/svg.ts` 输出序(`:958-982`)在设备层输出前先输出容器节点层:

```ts
const containerNodes = ordered.filter((n) => isAcContainerNode(n));
// 在 background 之后、segment 之前输出 containerNodes 层
```

`isAcContainerNode` 从 `src/acContainer.ts` import;确认 `svg.ts` 无 `.tsx` import(直载约束)。

- [ ] **Step 5: 验证**

Run: `pnpm vitest run src/acContainer.test.ts src/svgExport.test.ts`
Expected: PASS

- [ ] **Step 6: 提交**

```bash
git add src/appExtracted/appToolbarHookFactories.tsx src/export/svg.ts src/acContainer.test.ts
git commit -m "feat(container): 容器沉底单源排序(画布 + 导出 SVG)"
```

---

### Task 6: 右侧面板 — 所属容器行与容器参数行

**Files:**
- Modify: `src/appExtracted/appRightPanel.tsx:1062-1112`(属性行区;特殊行仿 `:1107-1109`)
- Modify: `src/hooks/useBatchEditors.tsx:260-272`(动态选项,仿 paramOptionsForDefinition)
- Test: `src/acContainerModel.test.ts`(追加纯函数断言)

**Interfaces:**
- Consumes: Task 1 `AC_CONTAINER_KINDS`/`isAcContainerKind`;Task 4 出口
- Produces:
  - `function containerSelectOptions(nodes: ModelNode[]): { label: string; value: string }[]`(导出,label = `名称 (idx)`,value = 容器节点 id,首项 `{ label: "无(当前模板)", value: "" }`)
  - `function containerMemberOptions(nodes: ModelNode[], containerId: string): { label: string; value: string }[]`(绑定设备候选 = 容器成员)

- [ ] **Step 1: 写失败测试**

```ts
// src/acContainerModel.test.ts 追加
import { containerSelectOptions, containerMemberOptions } from "./acContainer";

test("所属容器下拉:首项无容器,其余 名称(idx)", () => {
  const c = { ...node("c1", "ac-vpp-box", 0, 0), name: "开关箱甲", params: { idx: "12" } } as any;
  const opts = containerSelectOptions([c, node("a", "ac-load", 0, 0)] as any);
  expect(opts[0]).toEqual({ label: "无(当前模板)", value: "" });
  expect(opts[1]).toEqual({ label: "开关箱甲 (12)", value: "c1" });
});

test("绑定设备候选 = 容器成员", () => {
  const c = { ...node("c1", "ac-vpp-box", 0, 0), params: { idx: "12" } } as any;
  const m = { ...node("m1", "ac-load", 0, 0), name: "负荷A", params: { idx: "7" }, containerId: "c1" } as any;
  expect(containerMemberOptions([c, m], "c1")).toEqual([{ label: "负荷A (7)", value: "m1" }]);
});
```

- [ ] **Step 2: 运行确认失败**

Run: `pnpm vitest run src/acContainerModel.test.ts`
Expected: FAIL

- [ ] **Step 3: 实现**

1. `src/acContainer.ts` 追加两个选项构造函数(label 解析 `params.idx`)。
2. `appRightPanel.tsx` 属性行区顶部插入「所属容器」特殊行(仿 `:1107-1109` renderVoltageBaseRow 写法):

```tsx
// 所属容器行:容器节点自身不显示该行
{!isAcContainerNode(node) && (
  <tr><th>所属容器</th><td>
    <Select value={node.containerId ?? ""} options={containerSelectOptions(nodes)}
      onChange={(v) => setNodeContainerId(node.id, v || undefined)} />
  </td></tr>
)}
```

3. 选中容器节点时,属性行区追加两行(在容器参数定义流之外特判渲染):
   - 「是否作为关口设备」:`Select` 0/1(写 `params.is_gateway`)
   - 「绑定到设备」:`Select` 选项 = `containerMemberOptions(nodes, container.id)`,开启关口且未绑定时置红提示;写入 `params.bound_device_id`;变更时同步量测组(Task 9)与解绑检查

4. `setNodeContainerId`/`setContainerGateway`/`setContainerBoundDevice` 三个 setter 走既有图元 patch 提交通道(照抄邻近 setter,如电压基值行的提交函数),提交后调 `enforceContainerMembership` 并应用 patch。

- [ ] **Step 4: 运行确认通过**

Run: `pnpm vitest run src/acContainerModel.test.ts`
Expected: PASS

- [ ] **Step 5: 手工验证**

`pnpm dev` → 放一个虚拟电厂 + 两个负荷 → 选负荷 → 模型页下拉选容器 → 容器矩形自动包围 → 选容器 → 关口开关与绑定下拉可见。

- [ ] **Step 6: 提交**

```bash
git add src/appExtracted/appRightPanel.tsx src/hooks/useBatchEditors.tsx src/acContainer.ts src/acContainerModel.test.ts
git commit -m "feat(container): 面板所属容器行与关口/绑定参数行"
```

---

### Task 7: 右键菜单 — 添加到容器 / 移出容器

**Files:**
- Modify: `src/appExtracted/appContextMenus.tsx:121-128` 附近(仿组合菜单项)
- Modify: `src/appExtracted/appSelectionDragFactories.tsx:1675-1705` 附近(新建工厂)
- Modify: `src/appExtracted/appRenderBatch.tsx:1397-1398`(装配进 __appScope)
- Test: `src/acContainer.test.ts`(追加创建容器纯函数断言)

**Interfaces:**
- Consumes: Task 3/4;Task 1 kind
- Produces:
  - `function buildNewContainer(kind: DeviceKind, name: string, members: ModelNode[], nextIdx: string): ModelNode`(纯函数,放 acContainer.ts;返回容器节点:位置/尺寸=包围成员,padding 24,`params.idx = nextIdx`)
  - `function defaultContainerName(kind: DeviceKind, existing: ModelNode[]): string`(「虚拟电厂1」按类型计数)

- [ ] **Step 1: 写失败测试**

```ts
// src/acContainer.test.ts 追加
import { buildNewContainer, defaultContainerName } from "./acContainer";

test("新建容器包围成员", () => {
  const c = buildNewContainer("ac-vpp-box", "虚拟电厂1", [node("a", "ac-load", 100, 100)] as any, "30");
  expect(c.kind).toBe("ac-vpp-box");
  expect(c.position).toEqual({ x: 100 - 24, y: 100 - 24 });
  expect(c.params.idx).toBe("30");
});

test("默认名按类型计数", () => {
  const ex = [{ kind: "ac-vpp-box" }, { kind: "ac-vpp-box" }] as any[];
  expect(defaultContainerName("ac-vpp-box", ex)).toBe("虚拟电厂3");
  expect(defaultContainerName("ac-switch-box", ex)).toBe("开关箱1");
});
```

- [ ] **Step 2: 运行确认失败**

Run: `pnpm vitest run src/acContainer.test.ts`
Expected: FAIL

- [ ] **Step 3: 实现**

1. `acContainer.ts` 加 `buildNewContainer` / `defaultContainerName`(kind→中文名映射表 `CONTAINER_KIND_LABELS`)。
2. `appSelectionDragFactories.tsx` 加两个工厂(仿 `:1675` createGroupSelectedGraphics 的结构:读选中、调纯函数、提交 patch):
   - `createAddToAcContainer`:
     - 过滤选中中的容器节点;无普通图元则 toast 提示
     - 模型无容器 → antd `Modal.confirm` + 输入框(默认名 `defaultContainerName`)→ `buildNewContainer`(idx 取 `assignPermanentDeviceIndex` 同源分配器)→ 插入节点 + 成员赋 `containerId` + `enforceContainerMembership`
     - 有容器 → 弹窗:容器列表 Select(名称+idx) + 「新建…」选项切输入框 → 同路径
   - `createRemoveFromAcContainer`:选中成员清 `containerId`;若为某关口绑定设备 → 解绑 + 关关口 + 删容器量测组(Task 9 接口);`enforceContainerMembership` + toast
3. `appContextMenus.tsx` 在组合菜单附近加两项:【添加到容器】(选中含普通图元时可用)、【移出容器】(选中含已归属成员时显示)。
4. `appRenderBatch.tsx:1397-1398` 装配两工厂进 `__appScope`(注意 appScopeContract 守卫:`createMeasurementFieldParameterDefinition` 相关约束不受影响,但新符号必须静态 import 或经 scope 调用,照抄组合工厂写法)。

- [ ] **Step 4: 运行确认通过**

Run: `pnpm vitest run src/acContainer.test.ts src/appExtracted/appScopeContract.test.ts`
Expected: PASS

- [ ] **Step 5: 手工验证**

`pnpm dev` → 选两个负荷 → 右键【添加到容器】→ 无容器时弹输入框 → 创建后矩形包住两负荷;再选第三个负荷右键 → 列表可选已有或新建;右键【移出容器】→ 移出 + 矩形收缩。

- [ ] **Step 6: 提交**

```bash
git add src/acContainer.ts src/appExtracted/appContextMenus.tsx src/appExtracted/appSelectionDragFactories.tsx src/appExtracted/appRenderBatch.tsx src/acContainer.test.ts
git commit -m "feat(container): 右键添加到容器/移出容器"
```

---

### Task 8: 拖拽接入 — 扩展跟随、Alt 移出、拖容器整体移动

**Files:**
- Modify: `src/appExtracted/appCanvasInteractionFactories.tsx:1224-1355`(createFinishNodeDrag)
- Test: `src/acContainer.test.ts`(追加整组移动纯函数断言)

**Interfaces:**
- Consumes: Task 4 `judgeContainerMembership`/`enforceContainerMembership`
- Produces: `function containerDragGroup(nodes: ModelNode[], draggedIds: string[]): string[]`(拖容器时返回容器 + 全部成员 id 集;否则返回原集合)

- [ ] **Step 1: 写失败测试**

```ts
// src/acContainer.test.ts 追加
import { containerDragGroup } from "./acContainer";

test("拖容器 → 容器与全部成员一起移动", () => {
  const c = node("c1", "ac-vpp-box", 0, 0) as any;
  const m1 = { ...node("m1", "ac-load", 10, 10), containerId: "c1" } as any;
  const m2 = { ...node("m2", "ac-load", 20, 20), containerId: "c1" } as any;
  const other = node("o", "ac-load", 90, 90) as any;
  expect(containerDragGroup([c, m1, m2, other], ["c1"]).sort()).toEqual(["c1", "m1", "m2"]);
  expect(containerDragGroup([c, m1, m2, other], ["o"])).toEqual(["o"]);
});
```

- [ ] **Step 2: 运行确认失败**

Run: `pnpm vitest run src/acContainer.test.ts`
Expected: FAIL

- [ ] **Step 3: 实现**

1. `acContainer.ts` 加 `containerDragGroup`(纯函数)。
2. `appCanvasInteractionFactories.tsx` `createFinishNodeDrag`(`:1224-1355`)在 `commitFastMovedGraphPatches`(`:1337`)之前:
   - 用 `containerDragGroup` 扩展本次拖动集合(拖容器 = 整组)
   - 调 `judgeContainerMembership({ nodes: 拖动后节点, movedIds, altKey: event.altKey })`
   - 应用 `membershipChanges`(写/清 `containerId`)+ 调 `enforceContainerMembership` 应用 patch(容器重算 + 挤出)
   - 移出且是关口绑定设备 → 解绑联动(Task 9 接口)
   - 全部改动并入同一次 patch 提交(单一撤销单元)
   - Alt 按下时在拖动过程中显示「移出容器」光标提示(可选:CSS class 切换)

- [ ] **Step 4: 运行确认通过**

Run: `pnpm vitest run src/acContainer.test.ts`
Expected: PASS

- [ ] **Step 5: 手工验证**

`pnpm dev` → 拖动成员到远处松手(容器跟随扩展);Alt 拖动成员到容器外松手(移出 + 容器收缩);拖非成员进容器松手(移入 toast);拖容器描边(整体移动,相对位置不变);点容器内部空白不选中容器(穿透)。

- [ ] **Step 6: 提交**

```bash
git add src/appExtracted/appCanvasInteractionFactories.tsx src/acContainer.ts src/acContainer.test.ts
git commit -m "feat(container): 拖拽归属判定与拖容器整体移动"
```

---

### Task 9: 量测同步 — 关口绑定容器量测组

**Files:**
- Modify: `src/measurements.ts:322-343` 附近(量测组操作)
- Modify: `src/appExtracted/appRightPanel.tsx`(绑定/解绑触发,Task 6 已留调用点)
- Test: `src/measurements.test.ts`(追加)

**Interfaces:**
- Consumes: Task 6 setter 调用点
- Produces:
  - `function syncContainerMeasurementGroup(config: ProjectMeasurementConfig, containerId: string, boundDeviceId: string): ProjectMeasurementConfig`(复制/刷新:容器组 items 同绑定设备,nodeId = containerId)
  - `function removeContainerMeasurementGroup(config: ProjectMeasurementConfig, containerId: string): ProjectMeasurementConfig`

- [ ] **Step 1: 写失败测试**

```ts
// src/measurements.test.ts 追加
import { syncContainerMeasurementGroup, removeContainerMeasurementGroup } from "./measurements";

test("关口绑定:容器量测组 = 绑定设备量测组副本(nodeId 换容器)", () => {
  const cfg = { groups: [{ nodeId: "dev1", items: [{ point: "P", name: "有功" }] }] } as any;
  const out = syncContainerMeasurementGroup(cfg, "c1", "dev1");
  const g = out.groups.find((x: any) => x.nodeId === "c1")!;
  expect(g.items).toEqual([{ point: "P", name: "有功" }]);
  // 绑定设备组不变
  expect(out.groups.find((x: any) => x.nodeId === "dev1")!.items.length).toBe(1);
});

test("重复同步覆盖不重复建组", () => {
  let cfg = { groups: [{ nodeId: "dev1", items: [{ point: "P" }] }] } as any;
  cfg = syncContainerMeasurementGroup(cfg, "c1", "dev1");
  cfg.groups.find((x: any) => x.nodeId === "dev1")!.items.push({ point: "Q" });
  cfg = syncContainerMeasurementGroup(cfg, "c1", "dev1");
  expect(cfg.groups.filter((x: any) => x.nodeId === "c1").length).toBe(1);
  expect(cfg.groups.find((x: any) => x.nodeId === "c1")!.items.length).toBe(2);
});

test("解绑删除容器量测组", () => {
  const cfg = syncContainerMeasurementGroup({ groups: [{ nodeId: "dev1", items: [] }] } as any, "c1", "dev1");
  const out = removeContainerMeasurementGroup(cfg, "c1");
  expect(out.groups.some((x: any) => x.nodeId === "c1")).toBe(false);
});
```

组对象字段名以 `src/measurements.ts:322-343` 实际结构为准,同步调整断言。

- [ ] **Step 2: 运行确认失败**

Run: `pnpm vitest run src/measurements.test.ts`
Expected: FAIL

- [ ] **Step 3: 实现**

1. `measurements.ts` 加两函数(纯函数,返回新 config;深拷贝 items 避免引用共享)。
2. 触发点:绑定设备变更 / 关闭关口 / 绑定设备移出容器 / 绑定设备删除 / Alt 拖出 → 对应 `sync` 或 `remove`;绑定设备量测组自身变更时,若它是某关口绑定设备 → 刷新容器组(单向)。
3. 非关口容器不做任何量测操作。

- [ ] **Step 4: 运行确认通过**

Run: `pnpm vitest run src/measurements.test.ts`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add src/measurements.ts src/measurements.test.ts src/appExtracted/appRightPanel.tsx
git commit -m "feat(container): 关口容器量测组单向同步"
```

---

### Task 10: E 导出 — 容器段与模板态静默过滤

**Files:**
- Modify: `src/model-eexport.ts:33-50`(E_SECTION_COLUMNS)、`:344`(E_KIND_SECTION_MAP)、`:1830-2018`(buildEDeviceRecords 主循环)、`:2010-2017`(模板态过滤)
- Test: `src/model-eexport.test.ts`(追加)

**Interfaces:**
- Consumes: Task 1 kind/`isAcContainerKind`
- Produces: 容器记录 section = `ACContainer`,列:`idx`/`name`/`type`/`is_gateway`/`bound_device_idx`

- [ ] **Step 1: 读现状**

读 `src/model-eexport.ts:33-50`(段列定义真实结构)、`:336-344`(inferESection)、`:1846-1878`(主循环与 columns.length===0 continue)、`:2010-2017`(模板态过滤)、`:2040-2074`(告警)。

- [ ] **Step 2: 写失败测试**

```ts
// src/model-eexport.test.ts 追加
test("非关口容器仅入 ACContainer 段,不进拓扑节点表", () => {
  const model = makeModelWithContainer({ isGateway: false }); // 用现有测试工厂构造
  const out = buildEFileExport(model, { /* 照抄本文件既有用例 options */ } as any);
  const containerRows = rowsOfSection(out, "ACContainer");
  expect(containerRows.length).toBe(1);
  expect(containerRows[0].is_gateway).toBe("0");
  expect(topologyNodeIds(out)).not.toContain("c1");
});

test("模板态下容器静默过滤(不产出、不告警)", () => {
  const model = makeModelWithContainer({ isGateway: false });
  const out = buildEFileExport(model, { templateConfig: {/* 预定义模板 */} } as any);
  expect(rowsOfSection(out, "ACContainer").length).toBe(0);
  expect(out.warnings.filter((w) => w.includes("容器"))).toEqual([]);
});
```

`rowsOfSection`/`topologyNodeIds`/`makeModelWithContainer` 按本文件既有断言辅助函数风格就地实现(读文件后对齐);若既有用例直接解析字符串,则用同样的解析方式。

- [ ] **Step 3: 运行确认失败**

Run: `pnpm vitest run src/model-eexport.test.ts -t "容器"`
Expected: FAIL

- [ ] **Step 4: 实现**

1. `E_SECTION_COLUMNS` 加段(照抄相邻段结构):

```ts
ACContainer: [
  { key: "idx", label: "序号" },
  { key: "name", label: "名称" },
  { key: "type", label: "类型" },
  { key: "is_gateway", label: "是否关口" },
  { key: "bound_device_idx", label: "绑定设备序号" },
],
```

2. `E_KIND_SECTION_MAP`(`:344`)加 3 条:3 个容器 kind → `"ACContainer"`(容器非 static,不走 `:336-340` 分支;写一条断言守卫:inferESection("ac-vpp-box") === "ACContainer")。
3. `buildEDeviceRecords` 主循环:容器节点生成一条记录:

```ts
// 容器记录:类型取 kind 中文名,绑定设备解析其 params.idx
{
  section: "ACContainer",
  idx: node.params.idx,
  name: node.name,
  type: CONTAINER_KIND_LABELS[node.kind],
  is_gateway: node.params.is_gateway ?? "0",
  bound_device_idx: node.params.bound_device_id
    ? nodesById.get(node.params.bound_device_id)?.params.idx ?? ""
    : "",
}
```

4. 模板态静默:主循环对容器节点先判 `hasTemplateConfigValue && !definition("ACContainer")` → 直接跳过(不产出、不告警),其余段维持既有过滤与告警行为。

- [ ] **Step 5: 运行确认通过**

Run: `pnpm vitest run src/model-eexport.test.ts`
Expected: PASS(含既有用例)

- [ ] **Step 6: 提交**

```bash
git add src/model-eexport.ts src/model-eexport.test.ts
git commit -m "feat(container): E 导出容器段与模板态静默过滤"
```

---

### Task 11: 关口拓扑变换 — 合成端子与替换上游

**Files:**
- Modify: `src/model-eexport.ts:1830-1834`(buildEDeviceRecords 入口,拓扑计算前)
- Test: `src/model-eexport.test.ts`(追加)

**Interfaces:**
- Consumes: Task 10 容器段;`:1542-1564` 拓扑节点表构建
- Produces: `function transformGraphForGateways(nodes: ModelNode[], edges: ModelEdge[]): { nodes: ModelNode[]; edges: ModelEdge[]; warnings: string[] }`(纯函数,导出供测)

- [ ] **Step 1: 读现状**

读 `src/model-eexport.ts:1542-1564`(拓扑节点表仅由带 nodeNumber 端子驱动、:1552 跳过 static)、`:1590-1638`(buildTopologyNodeDevices)、`:1830-1846`(入口顺序)、`src/model-routing.ts:4702`(calculateElectricalTopology 入参)、ModelNode.terminals 真实结构(`src/model.ts` 端子定义)与边如何表达端点连接。

- [ ] **Step 2: 写失败测试**

```ts
// src/model-eexport.test.ts 追加
test("关口容器:合成端子 + 绑定设备上游替换为容器", () => {
  const model = makeModelWithContainer({ isGateway: true, withUpstream: true });
  const { nodes, edges, warnings } = transformGraphForGateways(model.nodes, model.edges);
  const c = nodes.find((n) => n.id === "c1")!;
  expect(c.terminals.length).toBeGreaterThan(0);
  expect(c.terminals.every((t) => t.nodeNumber != null)).toBe(true);
  // 原上游 → 容器;容器 → 绑定设备
  const up = model.upstreamId;
  expect(edges.some((e) => touches(e, up, "c1"))).toBe(true);
  expect(edges.some((e) => touches(e, "c1", model.boundId))).toBe(true);
  expect(warnings).toEqual([]);
});

test("绑定设备无上游连接 → 告警并退化", () => {
  const model = makeModelWithContainer({ isGateway: true, withUpstream: false });
  const { warnings, nodes } = transformGraphForGateways(model.nodes, model.edges);
  expect(warnings.length).toBe(1);
  expect(nodes.find((n) => n.id === "c1")!.terminals.length).toBe(0);
});
```

`touches` 按边的端点字段名就地实现(读文件后对齐);`makeModelWithContainer` 扩展支持 `withUpstream`/`boundId`。

- [ ] **Step 3: 运行确认失败**

Run: `pnpm vitest run src/model-eexport.test.ts -t "关口"`
Expected: FAIL

- [ ] **Step 4: 实现**

1. 纯函数 `transformGraphForGateways`:
   - 遍历关口容器(`is_gateway === "1"` 且有 `bound_device_id`)
   - 为容器合成端子:电源侧 + 负荷侧,`nodeNumber` 与既有分配一致(同岛同号;读 `:1542-1564` 的分配逻辑复用同一函数)
   - 拷贝 nodes/edges(不污染原模型);边改接:原上游 → 容器电源端子;容器负荷端子 → 绑定设备电源端子
   - 绑定设备无上游连接 → `warnings.push("容器 X 的绑定设备无上游连接,退化为仅容器表记录")`,该容器不加端子
2. `buildEDeviceRecords` 入口(`:1830-1834`)在 `calculateElectricalTopology` 之前:

```ts
const g = transformGraphForGateways(nodes, edges);
// 后续拓扑与设备记录全部基于 g.nodes / g.edges
// g.warnings 汇入既有告警输出
```

- [ ] **Step 5: 运行确认通过**

Run: `pnpm vitest run src/model-eexport.test.ts`
Expected: PASS

- [ ] **Step 6: 提交**

```bash
git add src/model-eexport.ts src/model-eexport.test.ts
git commit -m "feat(container): 关口拓扑变换(合成端子+替换上游)"
```

---

### Task 12: 剪贴板剥离与其余提交点接入

**Files:**
- Modify: `src/selectionActions.ts:582-591`(buildCanvasClipboard)
- Modify: `src/appExtracted/appCanvasInteractionFactories.tsx`(createFinishKeyboardMove 提交点)
- Modify: `src/appExtracted/appControlFactories.tsx`(createProgrammaticAddDevice)
- Modify: `src/svgModelImport.ts`
- Test: `src/selectionActions.test.ts`(追加)

**Interfaces:**
- Consumes: Task 4 `enforceContainerMembership`
- Produces: 副本剥离规则:`containerId` 清空;粘贴容器节点时 `bound_device_id` 清空、`is_gateway` 置 "0"

- [ ] **Step 1: 写失败测试**

```ts
// src/selectionActions.test.ts 追加
test("剪贴板副本剥离 containerId 与绑定", () => {
  const nodes = [
    { ...createDefaultNode("ac-load"), id: "m1", containerId: "c1" },
    { ...createDefaultNode("ac-vpp-box"), id: "c1", params: { is_gateway: "1", bound_device_id: "m1" } },
  ] as any;
  const clip = buildCanvasClipboard(nodes, [], [] as any);
  const m = clip.nodes.find((n: any) => n.id === "m1")!;
  const c = clip.nodes.find((n: any) => n.id === "c1")!;
  expect(m.containerId).toBeUndefined();
  expect(c.params.bound_device_id).toBeUndefined();
  expect(c.params.is_gateway).toBe("0");
});
```

- [ ] **Step 2: 运行确认失败**

Run: `pnpm vitest run src/selectionActions.test.ts -t "剥离"`
Expected: FAIL

- [ ] **Step 3: 实现**

1. `buildCanvasClipboard` 节点映射处剥离上述三字段。
2. 四个提交点收尾调 `enforceContainerMembership` 并应用 patch:
   - 键盘移动提交(createFinishKeyboardMove,同 `appCanvasInteractionFactories.tsx`)
   - 程序化加图元(`appControlFactories.tsx` createProgrammaticAddDevice 提交后)
   - SVG 导入(`svgModelImport.ts` 导入落库前)
   - 粘贴提交(selectionActions 粘贴路径;粘贴后落点在容器内走 `judgeContainerMembership` 非 Alt 分支)
3. 自动对齐/自动散开/整理连接线的批量布局提交点同样收尾调用(定位:`selectionActions.ts` 内 align/distribute 相关提交函数,实现时 grep「alignSelection」「distributeSelection」定位)。

- [ ] **Step 4: 运行确认通过**

Run: `pnpm vitest run src/selectionActions.test.ts`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add src/selectionActions.ts src/appExtracted/appCanvasInteractionFactories.tsx src/appExtracted/appControlFactories.tsx src/svgModelImport.ts src/selectionActions.test.ts
git commit -m "feat(container): 剪贴板剥离与各提交点不变量接入"
```

---

### Task 13: 全量回归与手工验收

**Files:**
- 无新改动(仅验证;发现问题回对应任务修)

- [ ] **Step 1: 全量单测**

Run: `pnpm vitest run`
Expected: 全绿(既有 ~737 用例 + 本功能新增)

- [ ] **Step 2: 类型检查**

Run: `pnpm tsc --noEmit`
Expected: 无新增错误

- [ ] **Step 3: 未定义名审计**

Run: `pnpm audit:names`
Expected: 无新增 ReferenceError 类缺陷(注意 @ts-nocheck 掩盖)

- [ ] **Step 4: 手工验收清单(`pnpm dev`)**

1. 放虚拟电厂/开关箱/配变箱 各一,视觉同分组框(虚线圆角、名称左上)
2. 选 2 个负荷 → 右键添加到容器 → 弹输入框 → 容器包住两负荷,容器在设备下方(沉底)
3. 面板模型页选负荷 → 所属容器下拉出现「无(当前模板)」+ 容器「名称 (idx)」
4. 拖成员远处松手 → 容器扩展跟随;Alt 拖成员出界松手 → 移出 + 收缩 + toast
5. 拖非成员进容器松手 → 移入 toast;点容器内部空白 → 不选中容器;点描边 → 选中
6. 拖容器描边 → 容器与成员整体平移
7. 容器内放入无关设备 → 自动挤出容器外
8. 容器面板:开关口 + 选绑定设备 → 容器量测页签与绑定设备一致;移出绑定设备 → 自动解绑关关口
9. 导出 E 文件(无模板态)→ 容器表段含全部容器;关口容器 → 拓扑中出现容器节点且绑定设备上游为容器
10. 导出 SVG → 容器在设备层之下;导出 CIM → 无异常(容器跳过)
11. 删除容器 → 确认框提示 N 个成员散出,成员保留
12. 撤销/重做:添加/移出/拖动各为单一撤销单元

- [ ] **Step 5: 提交验收修正(如有)并汇总**

```bash
git status --short   # 确认无遗漏
git log --oneline -15
```

---

## 自审记录

- **Spec 覆盖**:需求 1(Task 1/6)、2(Task 1/2)、3(Task 7)、4(Task 3/4/5/12)、5(Task 3/7)、6(Task 3/8)、7(Task 9/10/11)、8(Task 7)、9(Task 8);阻断 1(Task 10)、阻断 2(Task 1)、阻断 3(Task 9)、重要 4(Task 5)、重要 5(Task 2)、重要 6(Task 12)、重要 7(Task 11)、重要 8(Task 12)、重要 9(Task 8);次要 10(Task 10)、11(Task 6)、12(基线表)、13(Task 10)、14(全局约束)、15(Task 6)。无缺口。
- **类型一致性**:`NodePositionPatch`/`MembershipDecision`/`fitContainerToMembers`/`containerFirstComparator`/`judgeContainerMembership`/`enforceContainerMembership`/`containerSelectOptions`/`containerMemberOptions`/`containerDragGroup`/`buildNewContainer`/`defaultContainerName`/`transformGraphForGateways` 在定义任务与消费任务中签名一致。
- **占位符**:无 TBD/TODO;所有代码步骤含可执行代码或明确「读 file:line 后按实际结构对齐」的核对指令(字段名核对非占位,是代码库事实确认步骤)。
