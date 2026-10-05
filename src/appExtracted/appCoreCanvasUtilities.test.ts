// 端子电压兜底与电压配色键。
//
// 这个文件此前零直接测试，而它里面藏着一次**只在运行到才炸**的缺陷：
// `terminalVbaseFallbackValue` 用了 `isThreeWindingTransformerKind` 却没 import ——
// 文件头是 `// @ts-nocheck`，`pnpm tsc --noEmit` 不报，`vitest` 也不报（此前无人调用），
// 只有 `pnpm audit:names` 抓得到。任何一次「选中设备 → 读端子电压」都会 ReferenceError。
// 本文件把这条路径真正跑起来，让缺失的 import 变成编译期/测试期可见的失败。
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { DeviceKind, ModelNode, TerminalType } from "../model";
import {
  canvasWheelTargetIsRenderedCanvas,
  groupTransformGeometry,
  isCanvasKeyboardBlockingTarget,
  isCanvasWheelZoomExcludedTarget,
  terminalVbaseFallbackValue,
  voltageColorKeyForTerminal,
  type GroupTransformDrag
} from "./appCoreCanvasUtilities";

const terminal = (type: TerminalType, vbase: string, index: number) => ({
  id: `t${index}`,
  label: `端子${index + 1}`,
  type,
  anchor: { x: index * 10, y: 0 },
  nodeNumber: String(index + 1),
  vbase
});

// 只带上被测两个纯函数读到的字段：kind / params / terminals。
// 走 createDefaultNode 会把 model-node-ops 拉进 import 链，绕回 model.ts 形成
// 循环依赖，在测试里炸 `INTERACTIVE_STATIC_DRAWING_KINDS is not iterable`。
const node = (kind: DeviceKind, params: Record<string, string>, terminalCount = 2): ModelNode =>
  ({
    id: "n1",
    kind,
    name: kind,
    params,
    terminals: Array.from({ length: terminalCount }, (_, index) => terminal("ac", "", index))
  }) as ModelNode;

describe("terminalVbaseFallbackValue", () => {
  test("三绕组：四个端子各取自己的绕组侧，端子自身 vbase 缺失时才兜底", () => {
    const n = node(
      "ac-three-winding-transformer",
      { i_vbase: "110", k_vbase: "35", j_vbase: "10", neutral_vbase: "10.5" },
      4
    );
    expect([0, 1, 2, 3].map((i) => terminalVbaseFallbackValue(n, i))).toEqual(["110", "35", "10", "10.5"]);
  });

  test("三绕组：分侧键缺失时回退到 legacy 侧键（high/medium/low）", () => {
    const n = node(
      "ac-three-winding-transformer",
      { high_vbase: "110", medium_vbase: "35", low_vbase: "10" },
      3
    );
    expect([0, 1, 2].map((i) => terminalVbaseFallbackValue(n, i))).toEqual(["110", "35", "10"]);
  });

  test("三绕组：中性点端子无 neutral_vbase 时回退到通用 vbase", () => {
    const n = node("ac-three-winding-transformer-neutral", { i_vbase: "110", vbase: "35" }, 4);
    expect(terminalVbaseFallbackValue(n, 3)).toBe("35");
  });

  test("中性点变体同样走三绕组分支（不是两绕组）", () => {
    const n = node("ac-three-winding-transformer-neutral", { i_vbase: "110", k_vbase: "35", j_vbase: "10" }, 4);
    // 走两绕组分支时端子 2 会拿到 j_vbase（这里恰好相同），故用 k 侧区分
    const m = node("ac-three-winding-transformer-neutral", { i_vbase: "110", medium_vbase: "35", j_vbase: "10" }, 4);
    expect(terminalVbaseFallbackValue(m, 1)).toBe("35");
    expect(terminalVbaseFallbackValue(n, 1)).toBe("35");
  });

  test("两绕组：端子 0 取源侧、其余取目标侧，逐级兜底", () => {
    const n = node("ac-transformer", { i_vbase: "110", j_vbase: "35" });
    expect(terminalVbaseFallbackValue(n, 0)).toBe("110");
    expect(terminalVbaseFallbackValue(n, 1)).toBe("35");
    expect(terminalVbaseFallbackValue(n, 2)).toBe("35");
  });

  test("两绕组：source/target 别名优先于 high/low", () => {
    const n = node("ac-transformer", { source_vbase: "220", target_vbase: "10", high_vbase: "999", low_vbase: "888" });
    expect([terminalVbaseFallbackValue(n, 0), terminalVbaseFallbackValue(n, 1)]).toEqual(["220", "10"]);
  });

  test("全缺时按 vbase → voltage_level → rated_voltage 逐级兜底", () => {
    expect(terminalVbaseFallbackValue(node("ac-transformer", {}), 0)).toBe("");
    expect(terminalVbaseFallbackValue(node("ac-transformer", { vbase: "110" }), 0)).toBe("110");
    expect(terminalVbaseFallbackValue(node("ac-transformer", { voltage_level: "35" }), 0)).toBe("35");
    expect(terminalVbaseFallbackValue(node("ac-transformer", { rated_voltage: "10" }), 0)).toBe("10");
  });

  test("非变压器设备不受两绕组分支影响", () => {
    expect(terminalVbaseFallbackValue(node("ac-load", { vbase: "10" }), 0)).toBe("10");
  });

  // params 是字符串字典，「未填」有两种存法：空串（用户清空输入框，createUpdateParam
  // 存的是提交上去的原串）与 "0"（模板 typicalValue 的默认值）。`??` 只挡 undefined，
  // 遇到这两种都会提前短路，把后面的别名键 / 通用键变成永不触发的死代码。
  test("i_vbase 被清空成空串时继续往别名键找（不被空串短路）", () => {
    const n = node("ac-transformer", { i_vbase: "", high_vbase: "110", j_vbase: "35" });
    expect(terminalVbaseFallbackValue(n, 0)).toBe("110");
    expect(terminalVbaseFallbackValue(n, 1)).toBe("35");
  });

  test("i_vbase 为 '0' 时同样继续往别名键找", () => {
    const n = node("ac-transformer", { i_vbase: "0", source_vbase: "220", j_vbase: "0", target_vbase: "10" });
    expect(terminalVbaseFallbackValue(n, 0)).toBe("220");
    expect(terminalVbaseFallbackValue(n, 1)).toBe("10");
  });

  test("两侧都空时兜到通用键 vbase（空串不再吃掉 vbase）", () => {
    expect(terminalVbaseFallbackValue(node("ac-transformer", { i_vbase: "", j_vbase: "", vbase: "110" }), 0)).toBe("110");
    expect(terminalVbaseFallbackValue(node("ac-transformer", { i_vbase: "", j_vbase: "", voltage_level: "35" }), 0)).toBe("35");
    expect(terminalVbaseFallbackValue(node("ac-transformer", { i_vbase: "", j_vbase: "", rated_voltage: "10" }), 0)).toBe("10");
  });

  test("三绕组分侧键被清空时回退到 legacy 侧键", () => {
    const n = node("ac-three-winding-transformer", { i_vbase: "", k_vbase: "0", j_vbase: "", high_vbase: "110", medium_vbase: "35", low_vbase: "10" }, 3);
    expect([0, 1, 2].map((i) => terminalVbaseFallbackValue(n, i))).toEqual(["110", "35", "10"]);
  });

  test("三绕组中性别名缺失时回退到通用 vbase", () => {
    const n = node("ac-three-winding-transformer", { i_vbase: "110", neutral_vbase: "", vbase: "35" }, 4);
    expect(terminalVbaseFallbackValue(n, 3)).toBe("35");
  });

  test("带单位的写在这一层就归一成纯数字（下游不用再洗一遍）", () => {
    expect(terminalVbaseFallbackValue(node("ac-transformer", { high_vbase: "35 kV" }), 0)).toBe("35");
  });

  test("值非数字（'abc'）时跳过它继续找下一个键", () => {
    expect(terminalVbaseFallbackValue(node("ac-transformer", { i_vbase: "abc", source_vbase: "220" }), 0)).toBe("220");
  });
});

describe("voltageColorKeyForTerminal", () => {
  test("非电类型（氢/热）不参与电压配色", () => {
    const n = node("ac-transformer", { i_vbase: "110" });
    for (const type of ["h2", "heat"] as const) {
      expect(voltageColorKeyForTerminal(n, terminal(type, "", 0), 0)).toBe("");
    }
  });

  test("ac/dc 各自成键，同电压不同类型不撞色", () => {
    const n = node("ac-transformer", { i_vbase: "110", j_vbase: "35" });
    expect(voltageColorKeyForTerminal(n, terminal("ac", "", 0), 0)).toBe("ac:110");
    expect(voltageColorKeyForTerminal(n, terminal("ac", "", 1), 1)).toBe("ac:35");
    expect(voltageColorKeyForTerminal(n, terminal("dc", "", 1), 1)).toBe("dc:35");
  });

  test("端子自带 vbase 时优先于 params 兜底", () => {
    const n = node("ac-transformer", { i_vbase: "110", j_vbase: "35" });
    expect(voltageColorKeyForTerminal(n, terminal("ac", "220", 0), 0)).toBe("ac:220");
  });

  test("电压为空时不成键（不落到兜底电压上）", () => {
    const n = node("ac-transformer", {});
    expect(voltageColorKeyForTerminal(n, terminal("ac", "", 0), 0)).toBe("");
  });

  test("电压为 0 视为未填（与电压继承 isNodeVoltageDefault 同口径）", () => {
    const n = node("ac-transformer", { i_vbase: "110" });
    expect(voltageColorKeyForTerminal(n, terminal("ac", "0", 0), 0)).toBe("ac:110");
    const zero = node("ac-transformer", { i_vbase: "0" });
    expect(voltageColorKeyForTerminal(zero, terminal("ac", "", 0), 0)).toBe("");
  });

  test("带单位写法（'35 kV'）归一后与纯数字同键", () => {
    const n = node("ac-transformer", {});
    const key = (vbase: string) => voltageColorKeyForTerminal(n, terminal("ac", vbase, 0), 0);
    expect(key("35 kV")).toBe("ac:35");
    expect(key("35")).toBe("ac:35");
  });

  // 端到端口径：params 里主键被清空后，设备仍要能按别名键拿到电压上色，
  // 否则用户「清空再填回别名」这类操作会让电压配色整片消失。
  test("params 主键被清空成空串时仍按别名键上色", () => {
    const n = node("ac-transformer", { i_vbase: "", high_vbase: "35" });
    expect(voltageColorKeyForTerminal(n, terminal("ac", "", 0), 0)).toBe("ac:35");
  });

  test("params 主键为 '0' 时仍按别名键上色", () => {
    const n = node("ac-transformer", { i_vbase: "0", high_vbase: "35" });
    expect(voltageColorKeyForTerminal(n, terminal("ac", "", 0), 0)).toBe("ac:35");
  });
});

// ── L1506：三绕组的 `sideValues ?? []` 右臂 ────────────────────────────────────
// 判别输入是「**下标越界**」（sideValues 那个字面量数组只有 4 项，terminalIndex=4
// 取到 undefined），而不是「该侧的值是空数组」—— 写成 `[terminalIndex]` 有值但为空
// 的话 `??` 直接短路取左值，右臂从未被求值，改成什么都不改也照样绿。
describe("terminalVbaseFallbackValue：端子下标越界（sideValues ?? [] 的右臂）", () => {
  test("★ terminalIndex 超出四个绕组侧 → 退到只含通用 vbase 的候选集", () => {
    // 侧值数组长度是 4（i/high、k/medium、j/low、neutral），index=4 取不到任何一侧。
    const n = node("ac-three-winding-transformer", { vbase: "35" }, 4);
    expect(terminalVbaseFallbackValue(n, 4)).toBe("35");
  });

  test("★ 越界时通用键也缺 → 返回空串（不是崩溃、也不是把 undefined 拼进结果）", () => {
    const n = node("ac-three-winding-transformer", {}, 4);
    expect(terminalVbaseFallbackValue(n, 4)).toBe("");
  });

  // 负下标同样取不到侧值，但走的是另一条取下标的路径，一并钉住。
  test("★ terminalIndex 为 -1 同样取不到侧值", () => {
    const n = node("ac-three-winding-transformer", { vbase: "10" }, 4);
    expect(terminalVbaseFallbackValue(n, -1)).toBe("10");
  });

  // 对照组：下标**没**越界时侧值必须真的参与，否则上面三条就是「函数恒返回 vbase」的假绿。
  //
  // 变异记录（哨兵值的选择很关键，见下）：
  //  - `?? []` → `?? ["777"]`（**数字**哨兵）→ RED：`expected '777' to be '35'`。
  //    右臂确实被求值，且 777 能活过出口。
  //  - `?? []` → `?? ["SENTINEL_VBASE"]`（**非数字**哨兵）→ GREEN，这是**可证等价**，
  //    不是夹具没覆盖维度：出口 firstNonZeroVoltageBase 逐项走
  //    `nonZeroTerminalVoltageBaseNumber(value)`，非数字返回空串从而被跳过
  //    （既有用例「值非数字（'abc'）时跳过它继续找下一个键」就是这条门）。
  //    于是非数字哨兵恒等价于 `?? []`：两者都产出「跳过这一项、继续找 node.params.vbase」。
  //    所以验这条分支只能用**数字**哨兵。
  test("对照：下标未越界时侧值照常生效（证明越界那条走了不同路径）", () => {
    const n = node("ac-three-winding-transformer", { i_vbase: "110", vbase: "35" }, 4);
    expect(terminalVbaseFallbackValue(n, 0)).toBe("110");
    expect(terminalVbaseFallbackValue(n, 4)).toBe("35");
  });
});

// ── L505：等比缩放 + scale-y 时，unitScale 取的是被拖的那一轴 ──────────────────
// L504 的 `kind === "scale-x"` 臂与 L507 的 `Math.max` 臂都被既有用例覆盖了
// （"单轴 kind + proportionalScale" 与 "scale-both 隐式等比"）；
// 缺的是 `kind === "scale-y"` 为真、且 proportionalScale 生效的那条。
describe("groupTransformGeometry：等比缩放下 scale-y 取被拖的纵轴", () => {
  const bounds100 = { left: 0, top: 0, right: 100, bottom: 100 };

  const drag = (over: Partial<GroupTransformDrag> = {}): GroupTransformDrag =>
    ({
      kind: "scale-y",
      groupId: "g1",
      nodeIds: ["n1"],
      bounds: bounds100,
      center: { x: 0, y: 0 },
      startPoint: { x: 0, y: 0 },
      originalNodes: {},
      originalEdgeRoutes: [],
      ...over
    }) as GroupTransformDrag;

  // 两轴倍率刻意不等：rawX = 1 + 50/50 = 2，rawY = 1 + 25/50 = 1.5。
  // 若这一臂被改成走 Math.max(rawX, rawY) 会得 2 —— 与期望的 1.5 有鉴别力。
  test("★ 等比 + scale-y：以纵轴倍率为准，横轴的更大倍率不得泄漏进结果", () => {
    const geometry = groupTransformGeometry(
      drag({
        kind: "scale-y",
        startPoint: { x: 100, y: 100 },
        handleXDirection: 1,
        handleYDirection: 1,
        proportionalScale: true
      }),
      { x: 150, y: 125 }
    );
    expect(geometry).toEqual({ kind: "scale", scaleX: 1.5, scaleY: 1.5 });
  });

  // 第二条夹具刻意选**纵轴被钳成 0** 的方向：rawY=0，rawX=2。
  // ⚠️ 这里不能选「rawY 比 rawX 大」的方向 —— 那时 Math.max(rawX,rawY) 恰好就等于
  // rawY，两条臂产出同一个值，断言恒绿（§2）。只有 rawY 严格小于 rawX 时
  // 「取被拖的轴」与「取较大者」才分得开。
  test("★ 等比 + scale-y：纵轴被钳成 0 时也不退回横轴倍率（塌成一点）", () => {
    const geometry = groupTransformGeometry(
      drag({
        kind: "scale-y",
        startPoint: { x: 100, y: 100 },
        handleXDirection: 1,
        handleYDirection: 1,
        proportionalScale: true
      }),
      { x: 150, y: 0 }
    );
    expect(geometry).toEqual({ kind: "scale", scaleX: 0, scaleY: 0 });
  });

  // 对照组：不等比时横轴恒 1、纵轴照算 —— 证明上面两条不是「恒返回同一个数」。
  test("对照：不等比的 scale-y 横轴恒 1、纵轴照算", () => {
    const geometry = groupTransformGeometry(
      drag({ kind: "scale-y", startPoint: { x: 100, y: 100 }, handleXDirection: 1, handleYDirection: 1 }),
      { x: 150, y: 125 }
    );
    expect(geometry).toEqual({ kind: "scale", scaleX: 1, scaleY: 1.5 });
  });
});

// ── L186 / L191 / L196：`target instanceof Element ? … : target instanceof Node ? parentElement : null`
// 这三行是同一段形状：两个 `instanceof` 之间的 `parentElement` 兜底臂，以及
// 「既不是 Element 也不是 Node」的 null 臂。canvasEventTargets.test.ts 只给
// isCanvasWheelZoomExcludedTarget 钉过 parentElement 那条，另两个函数的 parentElement
// 臂与三者的 null 臂都没有。node 环境没有 DOM，要自己 stub 全局（`instanceof` 认的是
// 被 stub 的构造器）。
class FakeElement {
  classes: string[];
  constructor(classes: string[] = []) {
    this.classes = classes;
  }
  matches(selector: string): boolean {
    if (selector.startsWith(".")) return this.classes.includes(selector.slice(1));
    const attr = selector.match(/^\[([a-z]+)=["']([^"']+)["']\]$/i);
    if (attr) return this.getAttribute(attr[1]) === attr[2];
    const contains = selector.match(/^\[([a-z]+)\*=['"]([^'"]+)['"]\]$/i);
    if (contains) return this.classes.some((name) => name.includes(contains[2]));
    return false;
  }
  getAttribute(name: string) {
    const value = this.classes.includes(`role=${name}`) ? this.classes.find((c) => c.startsWith(`role=${name}=`)) : null;
    return value ? value.split("=")[1] : null;
  }
  closest(selector: string): FakeElement | null {
    return selector
      .split(",")
      .map((part) => part.trim())
      .some((part) => this.matches(part))
      ? this
      : null;
  }
}

class FakeNode {
  parentElement: FakeElement | null = null;
}

describe("画布事件目标判定：非 Element 目标的三段兜底", () => {
  beforeEach(() => {
    vi.stubGlobal("Element", FakeElement);
    vi.stubGlobal("Node", FakeNode);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // ── L191：canvasWheelTargetIsRenderedCanvas ────────────────────────────────
  test("★ canvasWheelTargetIsRenderedCanvas：文本节点退到 parentElement 判画布", () => {
    const text = new FakeNode();
    text.parentElement = new FakeElement(["diagram-canvas"]);
    expect(canvasWheelTargetIsRenderedCanvas(text as unknown as EventTarget)).toBe(true);
  });

  test("canvasWheelTargetIsRenderedCanvas：文本节点的 parentElement 不在画布上则不算", () => {
    const text = new FakeNode();
    text.parentElement = new FakeElement(["canvas-scroll-surface"]);
    expect(canvasWheelTargetIsRenderedCanvas(text as unknown as EventTarget)).toBe(false);
  });

  // ── L196：isCanvasKeyboardBlockingTarget ───────────────────────────────────
  test("★ isCanvasKeyboardBlockingTarget：文本节点退到 parentElement 判屏蔽", () => {
    const text = new FakeNode();
    text.parentElement = new FakeElement(["context-menu"]);
    expect(isCanvasKeyboardBlockingTarget(text as unknown as EventTarget)).toBe(true);
  });

  test("isCanvasKeyboardBlockingTarget：文本节点的 parentElement 是画布本体则放行", () => {
    const text = new FakeNode();
    text.parentElement = new FakeElement(["diagram-canvas"]);
    expect(isCanvasKeyboardBlockingTarget(text as unknown as EventTarget)).toBe(false);
  });

  // ── null 臂（三处各一条）──────────────────────────────────────────────────
  // 关键设计：喂一个**带 closest 且会命中**、但既不是 Element 也不是 Node 的裸对象。
  // 当前实现把它归成 null → 返回 false；若哪天的 `: null` 被写成 `: target`，
  // 就会返回 true，断言以 `expected false to be true` 转红并指名是这条臂。
  const bareTarget = () => ({ closest: () => ({ matches: () => true }) }) as unknown as EventTarget;

  test("★ isCanvasWheelZoomExcludedTarget：裸对象（既非 Element 也非 Node）归 null", () => {
    expect(isCanvasWheelZoomExcludedTarget(bareTarget())).toBe(false);
  });

  test("★ canvasWheelTargetIsRenderedCanvas：裸对象归 null（不回退到 target 自己）", () => {
    expect(canvasWheelTargetIsRenderedCanvas(bareTarget())).toBe(false);
  });

  test("★ isCanvasKeyboardBlockingTarget：裸对象归 null（不回退到 target 自己）", () => {
    expect(isCanvasKeyboardBlockingTarget(bareTarget())).toBe(false);
  });

  // parentElement 为 null 的文本节点：parentElement 臂本身取到 null，与裸对象同结果。
  // 它区分的是「Node 臂确实被走过」—— 若 Node 臂被删，element 直接是 target。
  test("★ 文本节点且 parentElement 为 null → 不当成画布", () => {
    const text = new FakeNode();
    expect(canvasWheelTargetIsRenderedCanvas(text as unknown as EventTarget)).toBe(false);
    expect(isCanvasKeyboardBlockingTarget(text as unknown as EventTarget)).toBe(false);
  });

  // 对照组：真 Element 命中时必须为 true，证明上面几条不是「这些函数恒返回 false」。
  test("对照：Element 本体命中时照常返回 true", () => {
    expect(canvasWheelTargetIsRenderedCanvas(new FakeElement(["diagram-canvas"]) as unknown as EventTarget)).toBe(true);
    expect(isCanvasKeyboardBlockingTarget(new FakeElement(["context-menu"]) as unknown as EventTarget)).toBe(true);
    expect(isCanvasWheelZoomExcludedTarget(new FakeElement(["context-menu"]) as unknown as EventTarget)).toBe(true);
  });
});
