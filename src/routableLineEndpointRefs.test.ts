// 可路由线路的**端点引用**（`src/model-routing.ts`，14 处生产调用，此前零直呼）
//   inferMissingRoutableLineDeviceEndpointRefs  按几何就近推断缺失的端点引用
//   syncRoutableLineDeviceEndpointsToRefs        推断 + 把端点吸附到引用点
//
// 判错的后果：线路的端点**吸到别的设备**上（拓扑接错），或端点**不吸附**
// 留一条缝 —— 都只表现为画布上连线看着别扭 / 仿真拓扑错，**不报错**。
//
// ★ 引用参数名不是 `t1_node`/`t2_node`，而是六条下划线开头的：
//   _routableLineSourceNodeId / _routableLineSourceTerminalId / _routableLineSourceLocalPoint
//   _routableLineTargetNodeId / _routableLineTargetTerminalId / _routableLineTargetLocalPoint
// ★ 引用**必须同时有 nodeId 与 terminalId** 才算有效；缺一个就当没有，会重新推断。
import { describe, expect, test } from "vitest";
import {
  inferMissingRoutableLineDeviceEndpointRefs,
  routableLineDeviceCanvasPoints,
  syncRoutableLineDeviceEndpointsToRefs
} from "./model-routing";
import { isRoutableLineDeviceKind } from "./model";
import type { ModelNode, Point, TerminalType } from "./model";

const SRC_NODE = "_routableLineSourceNodeId";
const SRC_TERM = "_routableLineSourceTerminalId";
const SRC_PT = "_routableLineSourceLocalPoint";
const TGT_NODE = "_routableLineTargetNodeId";
const TGT_TERM = "_routableLineTargetTerminalId";
const TGT_PT = "_routableLineTargetLocalPoint";
const POINTS = "_routableLinePoints";

const T = (id: string, type: TerminalType = "ac", anchor: Point = { x: 0, y: 0 }) =>
  ({ id, label: id, type, anchor, nodeNumber: "1", vbase: "0" });

const N = (id: string, kind: string, over: Record<string, unknown> = {}) => ({
  id, kind, name: id, nodeNumber: id, acTopologyNode: 0, dcTopologyNode: 0,
  position: { x: 0, y: 0 }, size: { width: 40, height: 40 }, rotation: 0, scale: 1,
  params: {}, terminals: [T(`${id}-t1`), T(`${id}-t2`)], ...over
});

// ★ 端点 anchor 必须非零：全 0 时两个端点重合在中心（(100,0) 与 (100,0)），
//   推断必然失败。±0.5 是线路的常规横向端子。
const LINE = (over: Record<string, unknown> = {}) => N("L", "ac-routable-line", {
  position: { x: 100, y: 0 },
  size: { width: 100, height: 0 },
  terminals: [T("L-t1", "ac", { x: -0.5, y: 0 }), T("L-t2", "ac", { x: 0.5, y: 0 })],
  ...over
}) as unknown as ModelNode;

const LOAD = (id: string, x: number, over: Record<string, unknown> = {}) =>
  N(id, "ac-load", { position: { x, y: 0 }, ...over }) as unknown as ModelNode;

const infer = (node: ModelNode, refs: ModelNode[]) =>
  inferMissingRoutableLineDeviceEndpointRefs(node, refs);
const sync = (node: ModelNode, nodes: ModelNode[], nodeById?: Map<string, ModelNode>, referenceNodes?: ModelNode[]) =>
  syncRoutableLineDeviceEndpointsToRefs(node, nodes, nodeById, referenceNodes);

const srcOf = (n: ModelNode) => n.params[SRC_NODE] ?? null;
const tgtOf = (n: ModelNode) => n.params[TGT_NODE] ?? null;
const ends = (n: ModelNode) => {
  const p = routableLineDeviceCanvasPoints(n);
  return [p[0], p[p.length - 1]];
};

describe("前置：可路由线路 kind 只有 6 个", () => {
  test("六个 kind 命中（含 `-vertical` 变体走 `baseDeviceKind`）", () => {
    for (const kind of [
      "ac-routable-line", "ac-zero-routable-branch",
      "dc-routable-line", "dc-zero-routable-branch",
      "hydrogen-routable-pipeline", "heat-routable-line",
      "ac-routable-line-vertical", "dc-routable-line-vertical"
    ]) {
      expect(isRoutableLineDeviceKind(kind), kind).toBe(true);
    }
  });

  test("相邻但不属于的 kind 不命中（区分大小写）", () => {
    for (const kind of ["ac-line", "ac-bus", "ac-load", "AC-ROUTABLE-LINE", "routable-line", ""]) {
      expect(isRoutableLineDeviceKind(kind), kind).toBe(false);
    }
  });
});

describe("★ inferMissing：三条「原样返回」出口", () => {
  test("① 非线路 kind → **同引用**返回", () => {
    for (const kind of ["ac-bus", "ac-load", "ac-line"]) {
      const node = N("X", kind) as unknown as ModelNode;
      expect(infer(node, [node]), kind).toBe(node);
    }
  });

  test("② 一个都推断不出 → 同引用返回", () => {
    const line = LINE();
    // 只有自己一个候选，而 `candidate.id === node.id` 会跳过自己
    expect(infer(line, [line])).toBe(line);
    // 附近的设备端子类型不匹配（dc 端子 vs ac 端点）也算推断不出
    const dcLoad = N("D", "dc-load", { position: { x: 46, y: 0 }, terminals: [T("D-t1", "dc"), T("D-t2", "dc")] }) as unknown as ModelNode;
    const line2 = LINE();
    expect(infer(line2, [dcLoad, line2])).toBe(line2);
  });

  test("③ 另一条线路被排除在候选外", () => {
    const otherLine = N("L2", "ac-routable-line", { position: { x: 46, y: 0 } }) as unknown as ModelNode;
    const line = LINE();
    expect(infer(line, [otherLine, line]), "★ 线路不作为端点候选").toBe(line);
  });

  test("★ 引用必须**同时**有 nodeId 与 terminalId 才算有效", () => {
    // `routableLineEndpointRefFromParams`：`if (!nodeId || !terminalId) return undefined`
    // ⇒ 只写 nodeId 的那侧被视为「缺引用」，会被重新推断覆盖；
    //    写全的那侧原样保留。两侧是**各自独立**判断的。
    const half = LINE({ params: { [SRC_NODE]: "KEEP", [SRC_TERM]: "KEEP-t", [TGT_NODE]: "GONE" } });
    const out = infer(half, [LOAD("A", 46), LOAD("B", 154), half]);
    expect(srcOf(out), "★ 写全的那侧不动").toBe("KEEP");
    expect(out.params[SRC_TERM], "★ 写全的那侧 terminalId 不动").toBe("KEEP-t");
    expect(tgtOf(out), "★ 缺 terminalId → 被重新推断覆盖").toBe("B");
    // 前提：只写 terminalId 也算无效
    const termOnly = LINE({ params: { [SRC_TERM]: "KEEP-t" } });
    expect(srcOf(infer(termOnly, [LOAD("A", 46), termOnly])), "★ 缺 nodeId 同样无效").toBe("A");
    // ★ 补齐两侧 terminalId 后才是有效引用 → 原样返回
    const full = LINE({
      params: {
        [SRC_NODE]: "KEEP", [SRC_TERM]: "KEEP-t", [SRC_PT]: "[{\"x\":1,\"y\":2}]",
        [TGT_NODE]: "KEEP2", [TGT_TERM]: "KEEP2-t", [TGT_PT]: "[{\"x\":3,\"y\":4}]"
      }
    });
    expect(infer(full, [LOAD("A", 46), full]), "★ 有效引用 → 同引用").toBe(full);
    expect(full.params[SRC_PT], "★ localPoint 不参与有效性判定").toBe("[{\"x\":1,\"y\":2}]");
  });
});

describe("★ inferMissing：六条引用参数名与就近推断", () => {
  test("两侧都能推断时写满六条", () => {
    const a = LOAD("A", 46);
    const b = LOAD("B", 154);
    const line = LINE();
    const out = infer(line, [a, b, line]);
    expect(out).not.toBe(line);
    expect(out.params).toEqual({
      [SRC_NODE]: "A", [SRC_TERM]: "A-t1", [SRC_PT]: "[{\"x\":0,\"y\":0}]",
      [TGT_NODE]: "B", [TGT_TERM]: "B-t1", [TGT_PT]: "[{\"x\":0,\"y\":0}]"
    });
  });

  test("★ `localPoint` 存的是**单点数组的 JSON 文本**", () => {
    const a = LOAD("A", 46);
    const line = LINE();
    const out = infer(line, [a, line]);
    expect(out.params[SRC_PT], "★ 不是裸 {x,y}").toBe("[{\"x\":0,\"y\":0}]");
    // 前提：它能被解析回来
    expect(JSON.parse(out.params[SRC_PT])).toEqual([{ x: 0, y: 0 }]);
  });

  test("★ 容差 12px：`<= 12` 命中、`13` 起不命中", () => {
    for (const [distance, hit] of [[0, true], [5, true], [11, true], [12, true], [13, false], [20, false], [100, false]] as const) {
      const candidate = LOAD("C", 46 - distance);
      const line = LINE();
      const out = infer(line, [candidate, line]);
      expect(srcOf(out), `距离 ${distance}`).toBe(hit ? "C" : null);
    }
  });

  test("多个候选：最近的赢，**与数组顺序无关**", () => {
    const near = LOAD("NEAR", 40);
    const far = LOAD("FAR", 0);
    const l1 = LINE();
    expect(srcOf(infer(l1, [near, far, l1]))).toBe("NEAR");
    const l2 = LINE();
    expect(srcOf(infer(l2, [far, near, l2]))).toBe("NEAR");
  });

  test("★ 距离相等时**先出现**的赢（`distance >= bestDistance` 排除后者）", () => {
    // 端点在 x=46；C1@36 与 C2@56 距离都是 10
    const c1 = LOAD("C1", 36);
    const c2 = LOAD("C2", 56);
    const l1 = LINE();
    expect(srcOf(infer(l1, [c1, c2, l1])), "★ 顺序敏感").toBe("C1");
    const l2 = LINE();
    expect(srcOf(infer(l2, [c2, c1, l2])), "★ 顺序敏感").toBe("C2");
  });

  test("★ 只推断到一侧时，另一侧的三个参数**都不写**", () => {
    const a = LOAD("A", 46);
    const line = LINE();
    const out = infer(line, [a, line]);
    expect(srcOf(out)).toBe("A");
    expect(tgtOf(out), "★ 对侧不写").toBeNull();
    expect(out.params[TGT_TERM], "★ 对侧 terminalId 也不写").toBeUndefined();
    expect(out.params[TGT_PT]).toBeUndefined();
  });

  test("已有一侧时只补另一侧，已有的**原样保留**", () => {
    const half = LINE({ params: { [SRC_NODE]: "KEEP", [SRC_TERM]: "KEEP-t", [SRC_PT]: "[{\"x\":9,\"y\":9}]" } });
    const out = infer(half, [LOAD("B", 154), half]);
    expect(srcOf(out), "★ 已有侧不动").toBe("KEEP");
    expect(out.params[SRC_TERM]).toBe("KEEP-t");
    expect(out.params[SRC_PT], "★ 已有侧 localPoint 不动").toBe("[{\"x\":9,\"y\":9}]");
    expect(tgtOf(out), "★ 只补对侧").toBe("B");
  });

  test("端子**类型不匹配**的候选被跳过", () => {
    const dcLoad = N("D", "dc-load", {
      position: { x: 46, y: 0 }, terminals: [T("D-t1", "dc"), T("D-t2", "dc")]
    }) as unknown as ModelNode;
    const line = LINE();
    expect(infer(line, [dcLoad, line]), "★ 全被跳过 → 原样").toBe(line);
  });

  test("★ 目标端按 `terminals[1]` 的类型筛，不是 `terminals[0]`", () => {
    // 变异 `node.terminals[endpointIndex]` → `node.terminals[0]` 首轮全绿 ——
    // 因为我的线路两侧端子**都是 ac**，两种写法筛出的类型完全一样。
    // 鉴别输入：让线路的 t1 / t2 **类型不同**，再在目标端放一个相反类型的候选。
    const mixed = N("M", "ac-routable-line", {
      position: { x: 100, y: 0 },
      size: { width: 100, height: 0 },
      terminals: [T("M-t1", "ac", { x: -0.5, y: 0 }), T("M-t2", "dc", { x: 0.5, y: 0 })]
    }) as unknown as ModelNode;
    // 目标端 (154,0)：放一个 dc 设备（应被选中）与一个 ac 设备（不该被选中）
    const dcAtTarget = N("DC", "dc-load", { position: { x: 154, y: 0 }, terminals: [T("DC-t1", "dc"), T("DC-t2", "dc")] }) as unknown as ModelNode;
    const acAtTarget = N("AC", "ac-load", { position: { x: 155, y: 0 } }) as unknown as ModelNode;
    const out = infer(mixed, [acAtTarget, dcAtTarget, mixed]);
    expect(tgtOf(out), "★ 目标端按 t2 的 dc 类型筛").toBe("DC");
    // 前提：线路两端端子类型不同
    expect(mixed.terminals[0].type).toBe("ac");
    expect(mixed.terminals[1].type, "★ 前提：两端类型不同").toBe("dc");
    // 对照：源端按 t1 的 ac 类型筛 ⇒ 选中 ac 那个
    const acAtSource = N("ACS", "ac-load", { position: { x: 45, y: 0 } }) as unknown as ModelNode;
    const dcAtSource = N("DCS", "dc-load", { position: { x: 44, y: 0 }, terminals: [T("DCS-t1", "dc"), T("DCS-t2", "dc")] }) as unknown as ModelNode;
    const out2 = infer(mixed, [dcAtSource, acAtSource, mixed]);
    expect(srcOf(out2), "★ 源端按 t1 的 ac 类型筛").toBe("ACS");
  });

  test("不改入参（原节点的 params 不被就地改写）", () => {
    const a = LOAD("A", 46);
    const line = LINE();
    const snapshot = JSON.stringify(line.params);
    infer(line, [a, line]);
    expect(JSON.stringify(line.params)).toBe(snapshot);
  });
});

describe("★ sync：在推断之上把端点吸附到引用点", () => {
  test("非线路 kind → 同引用返回", () => {
    const bus = N("B", "ac-bus") as unknown as ModelNode;
    expect(sync(bus, [bus])).toBe(bus);
  });

  test("无引用可推断 → 返回 infer 的结果（此处就是原节点）", () => {
    const line = LINE();
    expect(sync(line, [line])).toBe(line);
  });

  test("★ 端点被移动到引用点，并改写 `_routableLinePoints`", () => {
    const a = LOAD("A", 40);
    const b = LOAD("B", 160);
    const line = LINE();
    const before = ends(line);
    const out = sync(line, [a, b, line]);
    expect(out).not.toBe(line);
    const after = ends(out);
    expect(after[0], "★ 源端吸到 A 的端子点 (40,0)").toEqual({ x: 40, y: 0 });
    expect(after[1], "★ 目标端吸到 B 的端子点 (160,0)").toEqual({ x: 160, y: 0 });
    expect(before[0]).not.toEqual(after[0]);
    // ★ 保留走线：points 从 2 个变 4 个（端点 + 原折点 + 端点）
    expect(out.params[POINTS], "★ 写回了 4 个点").toBeDefined();
    expect(JSON.parse(out.params[POINTS])).toHaveLength(4);
  });

  test("★ 已对齐时**不写** `_routableLinePoints`（只补引用）", () => {
    const a = LOAD("A", 46);   // 端子点就在 (46,0) = 线路源端
    const line = LINE();
    const out = sync(line, [a, line]);
    expect(out.params[POINTS], "★ 未写 points").toBeUndefined();
    expect(ends(out), "★ 端点没动").toEqual([{ x: 46, y: 0 }, { x: 154, y: 0 }]);
    expect(srcOf(out)).toBe("A");
    // 仍是新对象（infer 那一步建的）
    expect(out).not.toBe(line);
  });

  test("★ `nodeById` 与 `referenceNodes` 是**两个独立参数**", () => {
    const ref = LOAD("A", 40);
    // nodeById 有 A → 吸附生效
    const l1 = LINE();
    const withMap = sync(l1, [l1], new Map([["A", ref]]), [ref]);
    expect(withMap.params[POINTS], "★ 有 nodeById → 吸附并写 points").toBeDefined();
    // nodeById 为空 → 推断成功但找不到 ref → 端点不动
    const l2 = LINE();
    const noMap = sync(l2, [l2], new Map(), [ref]);
    expect(srcOf(noMap), "★ 推断照样成功").toBe("A");
    expect(noMap.params[POINTS], "★ 找不到 ref → 不吸附、不写 points").toBeUndefined();
    expect(ends(noMap)).toEqual([{ x: 46, y: 0 }, { x: 154, y: 0 }]);
  });

  test("默认 `nodeById` / `referenceNodes` 都由 `nodes` 派生", () => {
    const a = LOAD("A", 40);
    const b = LOAD("B", 160);
    const line = LINE();
    const out = sync(line, [a, b, line]);
    expect(ends(out)).toEqual([{ x: 40, y: 0 }, { x: 160, y: 0 }]);
  });

  test("不改入参", () => {
    const a = LOAD("A", 40);
    const line = LINE();
    const snapshot = JSON.stringify(line);
    sync(line, [a, line]);
    expect(JSON.stringify(line), "★ 入参不变").toBe(snapshot);
  });

  test("同一输入恒得同一结果（无模块级状态）", () => {
    const a = LOAD("A", 40);
    const b = LOAD("B", 160);
    const once = sync(LINE(), [a, b]);
    for (let i = 0; i < 20; i += 1) {
      expect(sync(LINE(), [a, b])).toEqual(once);
    }
  });
});

describe("★ 三条等价变异的记录（避免下一个人重查）", () => {
  test("等价 ①：`if (refs.source && refs.target) return node;` 摘掉不变", () => {
    // 变异：把「两侧引用都有效」的早返回改成 `if (false)`。首轮全绿。
    //   —— 两侧都有效时，三元里 `refs.source ? undefined : infer…` 本来就取
    //      `undefined`，于是 `inferredSource` 与 `inferredTarget` **都是** undefined；
    //      紧接着的 `if (!inferredSource && !inferredTarget) return node;`
    //      又把同一个 `node` 原样返回。
    //   ⇒ 两条出口给出**同一个引用**，摘掉哪一条都不改变输出。
    //   ⚠ 什么会让它失效：若第二个早返回被改成「只补缺失的那侧」而不是
    //      「全都没有才返回」，那两条出口才会分道扬镳。
    const full = LINE({
      params: {
        [SRC_NODE]: "KEEP", [SRC_TERM]: "KEEP-t",
        [TGT_NODE]: "KEEP2", [TGT_TERM]: "KEEP2-t"
      }
    });
    const out = infer(full, [LOAD("A", 46), full]);
    expect(out, "★ 两条出口都返回原引用").toBe(full);
    expect(out.params[SRC_NODE]).toBe("KEEP");
    expect(out.params[TGT_NODE]).toBe("KEEP2");
  });

  test("等价 ⑪：sync 的「无引用」早返回摘掉不变", () => {
    // 变异：`if (!refs.source && !refs.target) return nodeWithRefs;` 改 `if (false)`。
    //   —— 无引用时 `routableLineEndpointPointFromRef(undefined, …)` 给 `undefined`，
    //      `?? currentStart` / `?? currentEnd` 把它们还原成当前端点；
    //      于是后面「端点没动」的判定成立，仍返回 `nodeWithRefs`。
    //   ⇒ 恒等。
    //   ⚠ 什么会让它失效：若 `routableLineEndpointPointFromRef` 对 `undefined` ref
    //      返回一个**非** undefined 的兜底点。
    const line = LINE();
    expect(sync(line, [line]), "★ 无引用 → 原引用").toBe(line);
    // 前提：undefined ref 经 `??` 还原
    const nothing: string | undefined = undefined;
    expect((nothing ?? "fallback")).toBe("fallback");
  });

  test("等价 ⑭：sync 的「端点缺失」早返回摘掉不变", () => {
    // 变异：`if (!currentStart || !currentEnd) return nodeWithRefs;` 改 `if (false)`。
    //   —— `routableLineDeviceCanvasPoints` 对可路由线路**恒**返回 ≥2 个点
    //      （`defaultRoutableLineDeviceLocalPoints` 要么用两端端子、要么用
    //      size 的左右边缘），所以 `currentStart` / `currentEnd` 永不为空。
    //   ⇒ 恒等。
    //   ⚠ 什么会让它失效：若 `defaultRoutableLineDeviceLocalPoints` 在某类
    //      节点上返回少于 2 个点（例如 size 为 0 且无端子）。
    for (const node of [LINE(), LINE({ terminals: [] }), LINE({ size: { width: 0, height: 0 }, terminals: [] })]) {
      const points = routableLineDeviceCanvasPoints(node);
      expect(points.length, "★ 恒 ≥2").toBeGreaterThanOrEqual(2);
      expect(points[0]).toBeDefined();
      expect(points[points.length - 1]).toBeDefined();
    }
  });
});
