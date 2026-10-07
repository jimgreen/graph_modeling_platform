// 端子电压兜底与电压配色键。
//
// 这个文件此前零直接测试，而它里面藏着一次**只在运行到才炸**的缺陷：
// `terminalVbaseFallbackValue` 用了 `isThreeWindingTransformerKind` 却没 import ——
// 文件头是 `// @ts-nocheck`，`pnpm tsc --noEmit` 不报，`vitest` 也不报（此前无人调用），
// 只有 `pnpm audit:names` 抓得到。任何一次「选中设备 → 读端子电压」都会 ReferenceError。
// 本文件把这条路径真正跑起来，让缺失的 import 变成编译期/测试期可见的失败。
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { DeviceKind, ModelNode, TerminalType } from "../model";
import type { MeasurementGroup } from "../measurements";
import {
  canvasWheelTargetIsRenderedCanvas,
  groupTransformGeometry,
  isCanvasKeyboardBlockingTarget,
  isCanvasWheelZoomExcludedTarget,
  isColorParamKey,
  isRedundantBatchCommonParamRow,
  measurementGroupCommonValue,
  measurementGroupWithCommonSetting,
  sameRenderViewportBounds,
  serializeStaticButtonTargetLayerIds,
  terminalVbaseFallbackValue,
  voltageColorKeyForTerminal,
  type BatchCommonMeasurementGroupKey,
  type BatchCommonParamRow,
  type GroupTransformDrag,
  type RenderViewportBounds
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

  // 这条用例喂的是字面 "0"。零的**判定口径**（而非字符串相等）在下面
  // describe「判零形态」里用 "0.0" / "0.00" 单独钉住 —— "0" 对任何判零实现都是
  // 显然成立的输入，看不见 `!== "0"` 与数值判零的差别。
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

// ── 判零形态：0.0 / 0.00 也算零（接上一条 "0" 用例）──────────────────────────
//
// 缺陷：`voltageColorKeyForTerminal` 的两处判零写的是 `!== "0"`，只认**字面** "0"。
// 真实写入路径 src/model-routing.ts 的「清零电压基值」传的是 **"0.0"**
// （清 params 的 i_vbase/j_vbase/... 与端子 vbase），于是清零后的设备：
//   ① 端子 vbase 是 "0.0" → 第一处判零放行 → 直接返回 `ac:0.0`，
//      **既不落到 params 兜底也画不出真实电压的颜色**（明明 params 里有 110）；
//   ② params 侧 vbase 是 "0.0" → 第二处判零放行 → 返回 `ac:0.0` 而不是空串，
//      下游把它当成一个真实电压档位去查配色表。
//
// 修法是判零统一交给 firstNonZeroVoltageBase（即 `normalized && !isZeroNumericText(normalized)`），
// 与电压继承 src/voltageInheritance.ts 的 isZeroVoltage（`!normalized || isZeroNumericText(normalized)`）
// 互为取反的同一口径。下面每条断言都落在**具体返回值**上。
describe("voltageColorKeyForTerminal：0.0 形态的零判定", () => {
  // 缺陷 ①：端子 vbase 是 0.0（清零后 params 仍有真电压）→ 必须继续往 params 找。
  // 旧实现此时返回 "ac:0.0"；修复后返回 "ac:110"。
  test("★ 端子 vbase 为 0.0 时不上 0.0 键，继续用 params 兜底电压", () => {
    const n = node("ac-transformer", { i_vbase: "110" });
    expect(voltageColorKeyForTerminal(n, terminal("ac", "0.0", 0), 0)).toBe("ac:110");
  });

  // 只判 "0" 的实现对 "0.00" 同样放行，所以这一条把**所有** 0 的十进制写法一起钉住。
  test("★ 端子 vbase 为 0.00 / 0.000 时同样继续走 params 兜底", () => {
    const n = node("ac-transformer", { i_vbase: "110" });
    expect(voltageColorKeyForTerminal(n, terminal("ac", "0.00", 0), 0)).toBe("ac:110");
    expect(voltageColorKeyForTerminal(n, terminal("ac", "0.000", 0), 0)).toBe("ac:110");
  });

  // 缺陷 ②：params 侧清零写的是 "0.0" → 必须返回空串，而不是把 0.0 当真实电压。
  test("★ params 兜底电压为 0.0 时不成键（而不是 ac:0.0）", () => {
    const zero = node("ac-transformer", { i_vbase: "0.0" });
    expect(voltageColorKeyForTerminal(zero, terminal("ac", "", 0), 0)).toBe("");
  });

  // 两处都清零：端子和 params 侧都是 0.0 → 整条链走到底，返回空串。
  // 这条同时钉住「第一处判零放行了也要被第二处拦住」——旧实现直接返回 ac:0.0。
  test("★ 端子与 params 都为 0.0 时不成键", () => {
    const zero = node("ac-transformer", { i_vbase: "0.0" });
    expect(voltageColorKeyForTerminal(zero, terminal("ac", "0.0", 0), 0)).toBe("");
  });

  // 通用键 vbase 清零（不是侧键 i_vbase）：second/fourth 级兜底也会拿到 0.0。
  test("★ 通用键 vbase 为 0.0 时不成键", () => {
    const zero = node("ac-transformer", { i_vbase: "0.0", vbase: "0.0" });
    expect(voltageColorKeyForTerminal(zero, terminal("ac", "", 0), 0)).toBe("");
  });

  // 对照组（防止上面几条变成「恒返回空串」）：
  //  · 0.5 是**非零**，必须当真实电压用，否则「把所有小数点形态都当零」的过度修法会绿。
  //  · 10.5 必须优先于 params 兜底，证明端子侧判零臂确实参与选择。
  test("对照：0.5 这类小数仍算非零，端子值优先于 params", () => {
    const n = node("ac-transformer", { i_vbase: "110" });
    expect(voltageColorKeyForTerminal(n, terminal("ac", "0.5", 0), 0)).toBe("ac:0.5");
    expect(voltageColorKeyForTerminal(n, terminal("ac", "10.5", 0), 0)).toBe("ac:10.5");
  });

  // dc 端子同样受影响（判零在类型分支之后统一生效，这里守住 ac 之外的第二条腿）。
  test("对照：dc 端子 vbase 为 0.0 时同样走 params 兜底", () => {
    const n = node("ac-transformer", { i_vbase: "750" });
    expect(voltageColorKeyForTerminal(n, terminal("dc", "0.0", 0), 0)).toBe("dc:750");
  });

  // 端子下标 1（目标侧）：j_vbase 侧清零成 0.0 也必须回退，而不是产出 ac:0.0。
  test("★ 端子下标 1 的目标侧清零为 0.0 时同样走兜底", () => {
    const n = node("ac-transformer", { i_vbase: "110", j_vbase: "0.0", target_vbase: "35" });
    expect(voltageColorKeyForTerminal(n, terminal("ac", "0.0", 1), 1)).toBe("ac:35");
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

// ══ 零覆盖的纯函数 ═══════════════════════════════════════════════════════════
// 以下 6 个导出的纯函数此前没有任何直接用例。这里逐个先打印实际输出再写断言，
// 覆盖空输入 / 边界 / 重复键三档。

describe("sameRenderViewportBounds", () => {
  const bounds = (left: number, top: number, right: number, bottom: number): RenderViewportBounds =>
    ({ left, top, right, bottom });

  test("四边全等时为 true（含两个不同对象——它比的是值不是引用）", () => {
    expect(sameRenderViewportBounds(bounds(0, 0, 100, 100), bounds(0, 0, 100, 100))).toBe(true);
    expect(sameRenderViewportBounds(bounds(-0, 0, 1e9, -1e9), bounds(0, 0, 1e9, -1e9))).toBe(true);
  });

  // 四条各差 1：逐边断言，防止「只比了某两维」的半吊子实现恒绿。
  test("任一边不等时为 false（左/右/上/下逐边）", () => {
    const base = bounds(0, 0, 100, 100);
    expect(sameRenderViewportBounds(base, bounds(1, 0, 100, 100))).toBe(false);
    expect(sameRenderViewportBounds(base, bounds(0, 0, 101, 100))).toBe(false);
    expect(sameRenderViewportBounds(base, bounds(0, 1, 100, 100))).toBe(false);
    expect(sameRenderViewportBounds(base, bounds(0, 0, 100, 101))).toBe(false);
  });

  // 负数坐标（画布向左滚时出现）是真实输入，不能被当成不等。
  test("负坐标下逐边相等仍为 true", () => {
    expect(sameRenderViewportBounds(bounds(-320, -240, -20, -40), bounds(-320, -240, -20, -40))).toBe(true);
    expect(sameRenderViewportBounds(bounds(-320, -240, -20, -40), bounds(-320, -240, -20, -39))).toBe(false);
  });

  // ★ 它用的是 `===` 而不是 Object.is，所以 NaN === NaN 为 false。
  // 若哪天换成 Object.is，这条断言会转红并指名是这次语义变更。
  test("同值 NaN 判为不等（用的是 === 而非 Object.is）", () => {
    expect(sameRenderViewportBounds(bounds(NaN, 0, 10, 10), bounds(NaN, 0, 10, 10))).toBe(false);
  });

  // 退化框（宽度或高度为 0，尚未展开的节点渲染框会出现）不能被当成「无框」。
  test("退化框（宽/高为 0）逐边相等时为 true", () => {
    expect(sameRenderViewportBounds(bounds(5, 5, 5, 5), bounds(5, 5, 5, 5))).toBe(true);
  });
});

describe("serializeStaticButtonTargetLayerIds", () => {
  test("空数组序列化为空数组的 JSON（不是空串、不是 null）", () => {
    expect(serializeStaticButtonTargetLayerIds([])).toBe("[]");
  });

  test("单元素与多元素按原样保序", () => {
    expect(serializeStaticButtonTargetLayerIds(["layer-1"])).toBe('["layer-1"]');
    expect(serializeStaticButtonTargetLayerIds(["b", "a"])).toBe('["b","a"]');
  });

  // ★ 重复键：它**不去重**，重复原样落库。
  // 去重会静默改变「多选图层」的语义（顺序 + 重复都是用户选出来的），故这里钉住不去重。
  test("★ 重复 id 原样保留（不去重也不重排）", () => {
    expect(serializeStaticButtonTargetLayerIds(["a", "a", "b"])).toBe('["a","a","b"]');
    expect(serializeStaticButtonTargetLayerIds(["a", "a"])).toBe('["a","a"]');
  });

  // 含引号的 id 必须被 JSON 转义 —— 图层名允许任意字符，漏转义会产出非法 JSON。
  test("含双引号的 id 被转义成合法 JSON", () => {
    expect(serializeStaticButtonTargetLayerIds(['a"b'])).toBe('["a\\"b"]');
    expect(JSON.parse(serializeStaticButtonTargetLayerIds(['a"b']))).toEqual(['a"b']);
  });

  test("非 ASCII（中文图层名）原样保留且可回读", () => {
    const serialized = serializeStaticButtonTargetLayerIds(["电气图层", "母线"]);
    expect(JSON.parse(serialized)).toEqual(["电气图层", "母线"]);
  });
});

describe("isRedundantBatchCommonParamRow", () => {
  const row = (key: string) => ({ key, label: key, value: "", mixed: false }) as BatchCommonParamRow;
  const keys = (...available: string[]) => new Set(available);
  const redundant = (key: string, ...available: string[]) =>
    isRedundantBatchCommonParamRow(row(key), keys(...available));

  // 三个旧字段各自被哪个新字段取代：
  //   buttonTargetSchemeId / buttonTargetProjectName → buttonTargetProjectId
  //   buttonTargetLayerId  → buttonTargetLayerIds
  //   buttonTargetLayerNames → buttonTargetLayerIds
  // 只有新字段**存在**时旧行才是冗余；都不在时旧行仍要显示。
  test("旧目标字段在新字段存在时判为冗余", () => {
    expect(redundant("buttonTargetSchemeId", "buttonTargetProjectId")).toBe(true);
    expect(redundant("buttonTargetProjectName", "buttonTargetProjectId")).toBe(true);
    expect(redundant("buttonTargetLayerId", "buttonTargetLayerIds")).toBe(true);
    expect(redundant("buttonTargetLayerNames", "buttonTargetLayerIds")).toBe(true);
  });

  // ★ 缺失 vs 存在但为空：availableKeys 装的是**键**不是值，
  // 所以「存在但值为空」与「存在且有值」对它完全一样 —— 用一个空串成员做对照，
  // 钉住判的是 Set.has（键存在性）而不是值的非空。
  test("★ 只看键存在性：新字段存在即冗余（与它的值无关）", () => {
    expect(redundant("buttonTargetLayerId", "buttonTargetLayerIds", "")).toBe(true);
    expect(redundant("buttonTargetSchemeId", "buttonTargetProjectId")).toBe(true);
  });

  // 缺失侧：新字段不在 → 旧行必须留着，否则用户就改不到这个字段了。
  test("★ 新字段缺失时旧行不判冗余（空 Set 下全部保留）", () => {
    expect(redundant("buttonTargetSchemeId")).toBe(false);
    expect(redundant("buttonTargetProjectName")).toBe(false);
    expect(redundant("buttonTargetLayerId")).toBe(false);
    expect(redundant("buttonTargetLayerName")).toBe(false);
    expect(redundant("buttonTargetLayerNames")).toBe(false);
  });

  // buttonTargetLayerName（单数 Name）特殊：它被 **Ids 或 Id** 任一取代。
  // 两条都缺才算保留 —— 少一条 OR 就会让它在某些组合下永久消失。
  test("★ buttonTargetLayerName 被 LayerIds 或 LayerId 任一取代", () => {
    expect(redundant("buttonTargetLayerName", "buttonTargetLayerIds")).toBe(true);
    expect(redundant("buttonTargetLayerName", "buttonTargetLayerId")).toBe(true);
    expect(redundant("buttonTargetLayerName", "buttonTargetLayerIds", "buttonTargetLayerId")).toBe(true);
    expect(redundant("buttonTargetLayerName", "buttonTargetProjectId")).toBe(false);
  });

  // 单数 LayerId 只被复数 LayerIds 取代，**不能**被单数自己或 ProjectId 取代：
  // 若误写成 `has("buttonTargetLayerId")`，这条恒 true，行会自己把自己判冗余而消失。
  test("★ 单数 LayerId 不被单数自己 / ProjectId 取代（防自吞）", () => {
    expect(redundant("buttonTargetLayerId", "buttonTargetLayerId")).toBe(false);
    expect(redundant("buttonTargetLayerId", "buttonTargetProjectId")).toBe(false);
  });

  // 未知键一律不冗余（默认分支）。这条同时挡住「fallback 成 true」的写法。
  test("未知键恒不冗余（含相似前缀，防止子串误判）", () => {
    expect(redundant("vbase", "buttonTargetLayerIds")).toBe(false);
    expect(redundant("buttonTargetLayerIdExtra", "buttonTargetLayerIds")).toBe(false);
    expect(redundant("", "buttonTargetLayerIds")).toBe(false);
  });
});

describe("isColorParamKey", () => {
  // 正则 /color$/i：全小写、驼峰、全大写、单独 color、词中间出现都算。
  test("以 color 结尾的键（大小写不敏感）都算颜色键", () => {
    for (const key of ["color", "Color", "COLOR", "borderColor", "BORDERCOLOR", "borderCOLOR", "itemColor"]) {
      expect(isColorParamKey(key), key).toBe(true);
    }
  });

  // ★ 位置维度：正则锚在 `$`，所以 color **不在结尾**不算。
  // 这条区分「/color\$/i」与写成 /color/i —— 后者会让下面全部为 true。
  test("★ color 不在结尾不算（正则锚在串尾）", () => {
    for (const key of ["colorRgb", "colorHex", "borderColorRgb", "colours", "isColored"]) {
      expect(isColorParamKey(key), key).toBe(false);
    }
  });

  // 「只看结尾」这条规则的边界：color 出现在**词中间**照样算
  // （rgcolor 以 color 收尾），因为没有词边界断言 —— 写 \bcolor$ 就会变 false。
  test("★ color 作为词的后缀（中间无分隔）也算：rgcolor 判 true", () => {
    expect(isColorParamKey("rgcolor")).toBe(true);
  });

  test("完全不含 color 的键为 false（空串、纯下划线、数字）", () => {
    for (const key of ["", "_", "vbase", "0"]) {
      expect(isColorParamKey(key), key).toBe(false);
    }
  });

  // 对照组（颜色键确实存在）：证明上面那批 false 不是「函数恒返回 false」。
  test("对照：确有真实颜色参数被判为颜色键", () => {
    expect(isColorParamKey("backgroundColor")).toBe(true);
    expect(isColorParamKey("borderColor")).toBe(true);
  });
});

describe("measurementGroupCommonValue", () => {
  const group = (over: Record<string, unknown> = {}): MeasurementGroup =>
    ({
      id: "mg1",
      nodeId: "n1",
      visible: true,
      anchor: "top",
      offset: { x: 0, y: 0 },
      layout: "vertical",
      items: [],
      ...over
    }) as MeasurementGroup;

  // 全字段缺省的组 → 每个键各自的兜底值。
  // layout **没有** `??` 兜底（直接返回 group.layout），所以这里返回 undefined：
  // 这条把「哪个键有兜底、哪个没有」钉住，写法改动会立刻暴露。
  test("缺省组的九个键各自返回值", () => {
    const empty = group({ visible: undefined, layout: undefined });
    expect(measurementGroupCommonValue(empty, "visible")).toBe("0");
    expect(measurementGroupCommonValue(empty, "layout")).toBeUndefined();
    expect(measurementGroupCommonValue(empty, "labelVisible")).toBe("1");
    expect(measurementGroupCommonValue(empty, "unitVisible")).toBe("1");
    expect(measurementGroupCommonValue(empty, "backgroundVisible")).toBe("0");
    expect(measurementGroupCommonValue(empty, "backgroundColor")).toBe("transparent");
    expect(measurementGroupCommonValue(empty, "borderStyle")).toBe("none");
    expect(measurementGroupCommonValue(empty, "borderColor")).toBe("#64748b");
    expect(measurementGroupCommonValue(empty, "borderWidth")).toBe("0");
  });

  // labelVisible / unitVisible 用的是 `=== false`：undefined 与 true 都归 "1"，
  // 只有显式 false 归 "0"。这条是「缺失键 vs 存在但为空」的又一处区分。
  test("★ labelVisible/unitVisible 只认显式 false（undefined 归 1）", () => {
    const explicitFalse = group({ labelVisible: false, unitVisible: false });
    expect(measurementGroupCommonValue(explicitFalse, "labelVisible")).toBe("0");
    expect(measurementGroupCommonValue(explicitFalse, "unitVisible")).toBe("0");
    expect(measurementGroupCommonValue(group({ labelVisible: true }), "labelVisible")).toBe("1");
    expect(measurementGroupCommonValue(group({ labelVisible: undefined }), "labelVisible")).toBe("1");
  });

  // backgroundVisible 的判据是「空串或 transparent 视为不显示」——
  // 空串走 falsy 分支，与 undefined 同结果；transparent 是显式值。
  test("★ backgroundVisible 把空串与 transparent 都算不显示", () => {
    expect(measurementGroupCommonValue(group({ backgroundColor: "transparent" }), "backgroundVisible")).toBe("0");
    expect(measurementGroupCommonValue(group({ backgroundColor: "" }), "backgroundVisible")).toBe("0");
    expect(measurementGroupCommonValue(group({ backgroundColor: undefined }), "backgroundVisible")).toBe("0");
    expect(measurementGroupCommonValue(group({ backgroundColor: "#ffffff" }), "backgroundVisible")).toBe("1");
  });

  test("已填值的组按原样读出（九键全非默认）", () => {
    const filled = group({
      visible: false,
      layout: "grid",
      labelVisible: false,
      unitVisible: false,
      backgroundColor: "#fff",
      borderStyle: "solid",
      borderColor: "#000",
      borderWidth: 3
    });
    expect(measurementGroupCommonValue(filled, "visible")).toBe("0");
    expect(measurementGroupCommonValue(filled, "layout")).toBe("grid");
    expect(measurementGroupCommonValue(filled, "labelVisible")).toBe("0");
    expect(measurementGroupCommonValue(filled, "unitVisible")).toBe("0");
    expect(measurementGroupCommonValue(filled, "backgroundVisible")).toBe("1");
    expect(measurementGroupCommonValue(filled, "backgroundColor")).toBe("#fff");
    expect(measurementGroupCommonValue(filled, "borderStyle")).toBe("solid");
    expect(measurementGroupCommonValue(filled, "borderColor")).toBe("#000");
    expect(measurementGroupCommonValue(filled, "borderWidth")).toBe("3");
  });

  // ★ borderWidth 的兜底与「显式 0」不可区分（都是 "0"）。
  // AGENTS.md 那条「断言前先确认默认值不等于期望值」的坑在此：这里只能钉住
  // 「显式 0 → 字符串 0」，无法区分「没填」与「填了 0」。故把这条与
  // String(0) 对照写出来，而不是假装它有鉴别力。
  test("borderWidth 数值转字符串：显式 0 与缺省同为 0（默认即期望值，无鉴别力）", () => {
    expect(measurementGroupCommonValue(group({ borderWidth: 0 }), "borderWidth")).toBe("0");
    expect(measurementGroupCommonValue(group(), "borderWidth")).toBe("0");
    expect(measurementGroupCommonValue(group({ borderWidth: 3 }), "borderWidth")).toBe("3");
  });

  test("未知键返回空串（default 分支，不抛）", () => {
    expect(measurementGroupCommonValue(group(), "zzz" as BatchCommonMeasurementGroupKey)).toBe("");
  });
});

describe("measurementGroupWithCommonSetting", () => {
  const group = (over: Record<string, unknown> = {}): MeasurementGroup =>
    ({
      id: "mg1",
      nodeId: "n1",
      visible: true,
      anchor: "top",
      offset: { x: 0, y: 0 },
      layout: "vertical",
      items: [],
      ...over
    }) as MeasurementGroup;

  // 布尔型（visible / labelVisible / unitVisible）只认 "1" 为真，
  // 任何其他串都归 false。缺省（undefined）必须变成**显式** false/true，
  // 否则工具栏批量改完还是 undefined。
  test("★ 布尔型键只认 1 为真，且缺省被写成显式值", () => {
    expect(measurementGroupWithCommonSetting(group(), "visible", "1").visible).toBe(true);
    expect(measurementGroupWithCommonSetting(group(), "visible", "0").visible).toBe(false);
    expect(measurementGroupWithCommonSetting(group(), "visible", "x").visible).toBe(false);
    const bare = group({ visible: undefined, labelVisible: undefined, unitVisible: undefined });
    expect(measurementGroupWithCommonSetting(bare, "labelVisible", "0").labelVisible).toBe(false);
    expect(measurementGroupWithCommonSetting(bare, "unitVisible", "1").unitVisible).toBe(true);
  });

  test("layout 原样写入（含无法识别的串，不做校验）", () => {
    expect(measurementGroupWithCommonSetting(group(), "layout", "grid").layout).toBe("grid");
    expect(measurementGroupWithCommonSetting(group(), "layout", "zzz").layout).toBe("zzz");
  });

  // ★ backgroundVisible=1 时把 transparent / 缺省换成 #ffffff，
  // 已有颜色不动。这是「缺失键 vs 存在但为 transparent」的岔路。
  test("★ backgroundVisible 置 1：transparent 与缺省都换成 #ffffff，已有颜色不动", () => {
    expect(measurementGroupWithCommonSetting(group({ backgroundColor: "transparent" }), "backgroundVisible", "1").backgroundColor).toBe("#ffffff");
    expect(measurementGroupWithCommonSetting(group(), "backgroundVisible", "1").backgroundColor).toBe("#ffffff");
    expect(measurementGroupWithCommonSetting(group({ backgroundColor: "#123456" }), "backgroundVisible", "1").backgroundColor).toBe("#123456");
  });

  test("backgroundVisible 置 0 一律写 transparent（覆盖已有颜色）", () => {
    expect(measurementGroupWithCommonSetting(group({ backgroundColor: "#123456" }), "backgroundVisible", "0").backgroundColor).toBe("transparent");
    expect(measurementGroupWithCommonSetting(group(), "backgroundVisible", "0").backgroundColor).toBe("transparent");
  });

  // 空串回落默认色（`value || 兜底`）——空串不是「透明」。
  test("★ 颜色键传空串时回落到默认色（不是空串、不是 transparent）", () => {
    expect(measurementGroupWithCommonSetting(group({ backgroundColor: "#123456" }), "backgroundColor", "").backgroundColor).toBe("#ffffff");
    expect(measurementGroupWithCommonSetting(group({ borderColor: "#000000" }), "borderColor", "").borderColor).toBe("#64748b");
  });

  test("颜色键传值时原样写入", () => {
    expect(measurementGroupWithCommonSetting(group(), "backgroundColor", "#123").backgroundColor).toBe("#123");
    expect(measurementGroupWithCommonSetting(group(), "borderColor", "#456").borderColor).toBe("#456");
  });

  // ★ borderStyle 切到 none 时线宽归 0，切到有线型时线宽至少 1。
  // 两条都要有：只测 solid 的话，「none 归 0」这条臂删掉照样绿。
  test("★ borderStyle 切 none 时线宽归 0，切有线型时线宽至少为 1", () => {
    expect(measurementGroupWithCommonSetting(group({ borderWidth: 7 }), "borderStyle", "none").borderWidth).toBe(0);
    expect(measurementGroupWithCommonSetting(group({ borderWidth: 7 }), "borderStyle", "solid").borderWidth).toBe(7);
    expect(measurementGroupWithCommonSetting(group(), "borderStyle", "solid").borderWidth).toBe(1);
    expect(measurementGroupWithCommonSetting(group(), "borderStyle", "dashed").borderWidth).toBe(1);
  });

  // borderWidth 走 clampNumber(Number(value), 0, 12)。
  test("borderWidth 按数值钳位到 0..12", () => {
    expect(measurementGroupWithCommonSetting(group(), "borderWidth", "99").borderWidth).toBe(12);
    expect(measurementGroupWithCommonSetting(group(), "borderWidth", "-3").borderWidth).toBe(0);
    expect(measurementGroupWithCommonSetting(group(), "borderWidth", "").borderWidth).toBe(0);
    expect(measurementGroupWithCommonSetting(group(), "borderWidth", "3.7").borderWidth).toBe(3.7);
    expect(measurementGroupWithCommonSetting(group(), "borderWidth", "0").borderWidth).toBe(0);
  });

  // ★ 非数字串产出 NaN（clampNumber 不处理 NaN：Math.min(NaN,12) 是 NaN）。
  // 这条把「非数字宽度会让线宽变成 NaN」这个事实钉在用例里，
  // 将来若有人给 clampNumber 补 NaN 兜底，这条会转红并指名是那次行为变更。
  test("★ borderWidth 传非数字产出 NaN（当前无 NaN 兜底）", () => {
    expect(measurementGroupWithCommonSetting(group(), "borderWidth", "abc").borderWidth).toBeNaN();
  });

  // 未知键原样返回同一个对象（default 分支返回 group 本身，不是拷贝）。
  test("未知键原样返回入参对象本身", () => {
    const source = group();
    expect(measurementGroupWithCommonSetting(source, "zzz" as BatchCommonMeasurementGroupKey, "v")).toBe(source);
  });

  // 纯函数语义：返回新对象，不改入参。断言的是「入参原对象没被改」——
  // 这正是批量编辑后能安全撤销的原因。
  test("★ 返回新对象且不改入参（批量编辑可撤销的前提）", () => {
    const source = group({ borderWidth: 2, backgroundColor: "#123456" });
    const next = measurementGroupWithCommonSetting(source, "borderWidth", "5");
    expect(next).not.toBe(source);
    expect(source.borderWidth).toBe(2);
    expect(source.backgroundColor).toBe("#123456");
    expect(next.borderWidth).toBe(5);
  });

  // 往返一致：commonValue(withSetting(g, k, v), k) === v —— 工具栏那圈
  // 「读当前值 → 写回新值」的循环依赖它。用九个键全覆盖。
  test("★ 九键往返一致（读到的值写回去能原样读回）", () => {
    const base = group();
    const values = {
      visible: "0",
      layout: "horizontal",
      labelVisible: "0",
      unitVisible: "0",
      backgroundVisible: "0",
      backgroundColor: "#abcdef",
      borderStyle: "dashed",
      borderColor: "#fedcba",
      borderWidth: "12"
    } as Record<BatchCommonMeasurementGroupKey, string>;
    for (const [key, value] of Object.entries(values) as [BatchCommonMeasurementGroupKey, string][]) {
      expect(measurementGroupCommonValue(measurementGroupWithCommonSetting(base, key, value), key), key).toBe(value);
    }
  });
});
