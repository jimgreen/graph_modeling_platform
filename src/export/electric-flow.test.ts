// 电流方向判定 + 箭头层标记的行为钉桩。
// 覆盖规格里逐条列出的 7 个场景 + 标记层的转义 / 降级 / 空串约定。
import { describe, expect, it } from "vitest";
import type { DeviceKind, Edge, ModelNode } from "../model.ts";
// 先引本模块（它第一个值依赖就是 ../model.ts）再引工厂模块：
// model-node-ops 与 model.ts 互为循环，单独先加载 model-node-ops 会让
// model.ts 的 STATIC_LINE_LIKE_KINDS 读到尚未初始化的 INTERACTIVE_STATIC_DRAWING_KINDS。
import { computeElectricFlowDirections, type ElectricFlowDirection } from "./electric-flow.ts";
import {
  buildElectricFlowLayerMarkup,
  buildElectricFlowStyleMarkup,
  ELECTRIC_FLOW_ARROW_CLASS,
  ELECTRIC_FLOW_LAYER_CLASS
} from "./electric-flow-markup.ts";
import { createDefaultNode } from "../model-node-ops.ts";

let nodeSeq = 0;

/** 用现成工厂造节点，只覆写 id / params —— 端子、默认参数、尺寸都走真模板。 */
function node(kind: DeviceKind, params?: Record<string, string>): ModelNode {
  const created = createDefaultNode(kind, { x: nodeSeq * 100, y: 0 });
  nodeSeq += 1;
  return {
    ...created,
    id: `n${nodeSeq}`,
    params: params ? { ...created.params, ...params } : created.params
  };
}

function edge(source: ModelNode, target: ModelNode, sourceTerminalId?: string, targetTerminalId?: string): Edge {
  return {
    id: `e${nodeSeq}-${source.id}-${target.id}`,
    sourceId: source.id,
    targetId: target.id,
    ...(sourceTerminalId ? { sourceTerminalId } : {}),
    ...(targetTerminalId ? { targetTerminalId } : {})
  };
}

function directionOf(directions: Map<string, ElectricFlowDirection>, target: Edge): ElectricFlowDirection {
  return directions.get(target.id) ?? "none";
}

/** 场景 1：电源 → 变压器 → 负荷。 */
describe("computeElectricFlowDirections — 电源→变压器→负荷", () => {
  const source = node("ac-source");
  const transformer = node("ac-transformer", { i_vbase: "110", j_vbase: "10" });
  const load = node("ac-load");
  const highSide = edge(source, transformer, source.terminals[0].id, transformer.terminals[0].id);
  const lowSide = edge(transformer, load, transformer.terminals[1].id, load.terminals[0].id);

  it("高压侧进、低压侧出，两段都是 forward", () => {
    const directions = computeElectricFlowDirections([source, transformer, load], [highSide, lowSide]);
    expect(directionOf(directions, highSide)).toBe("forward");
    expect(directionOf(directions, lowSide)).toBe("forward");
  });

  it("高压侧接在 target 端时记 reverse（方向语义绑定 source→target，与画布上下无关）", () => {
    // 高压侧电压 ≥ maxV ⇒ 电流流入变压器：edge 画成 变压器 → 电源 时电流走 target→source。
    const reversedHighSide: Edge = {
      ...highSide,
      id: "e-reversed-high",
      sourceId: transformer.id,
      targetId: source.id,
      sourceTerminalId: transformer.terminals[0].id,
      targetTerminalId: source.terminals[0].id
    };
    const directions = computeElectricFlowDirections([source, transformer, load], [reversedHighSide, lowSide]);
    expect(directionOf(directions, reversedHighSide)).toBe("reverse");
    expect(directionOf(directions, lowSide)).toBe("forward");
  });

  it("变压器电压参数缺失（同压退化）时退回普通 BFS，不截断下游", () => {
    const flatTransformer = node("ac-transformer");
    const toLoad = edge(flatTransformer, load, flatTransformer.terminals[1].id, load.terminals[0].id);
    const directions = computeElectricFlowDirections([source, flatTransformer, load], [
      edge(source, flatTransformer, source.terminals[0].id, flatTransformer.terminals[0].id),
      toLoad
    ]);
    expect(directionOf(directions, toLoad)).toBe("forward");
  });
});

/** 场景 2：母线扩散。 */
describe("computeElectricFlowDirections — 母线扩散", () => {
  it("电源 → 母线，母线 → 负荷A / 负荷B 共 3 条边全部有方向且母线出流为 forward", () => {
    const source = node("ac-source");
    const bus = node("ac-bus");
    const loadA = node("ac-load");
    const loadB = node("ac-load");
    const toBus = edge(source, bus);
    const toLoadA = edge(bus, loadA);
    const toLoadB = edge(bus, loadB);

    const directions = computeElectricFlowDirections([source, bus, loadA, loadB], [toBus, toLoadA, toLoadB]);

    expect(directions.size).toBe(3);
    expect(directionOf(directions, toBus)).toBe("forward");
    expect(directionOf(directions, toLoadA)).toBe("forward");
    expect(directionOf(directions, toLoadB)).toBe("forward");
  });
});

/** 场景 3：环网冲突。 */
describe("computeElectricFlowDirections — 环网闭合边", () => {
  it("电源接在环的中段节点上：闭合边 C→A 判 both", () => {
    // 母线三角环 A→B→C→A，电源接在 B 上。B 一展开就把 A、C 两条环边收进生成树，
    // 于是 C→A 在 A 侧记 reverse、在 C 侧记 forward ⇒ 闭合边判 both（环上真双向）。
    // A→B 只在 B 侧记过一次 reverse（A 正是经它到达的）、B→C 只记过一次 forward，
    // 两条生成树边都不误报。
    const source = node("ac-source");
    const a = node("ac-bus");
    const b = node("ac-bus");
    const c = node("ac-bus");
    const stub = edge(source, b);
    const ab = edge(a, b);
    const bc = edge(b, c);
    const ca = edge(c, a);

    const directions = computeElectricFlowDirections([source, a, b, c], [stub, ab, bc, ca]);

    expect([stub, ab, bc, ca].map((item) => directionOf(directions, item))).toEqual([
      "forward",
      "reverse",
      "forward",
      "both"
    ]);
  });

  it("电源本身在环上的 S→A→B→C→S：整环恰有一条冲突边，且是生成树之外的那条", () => {
    // BFS 生成树把 S→A 与 C→S 定成两棵子树（S 是电源，它的每条 incident 边各自成树），
    // 因此 C 先经 C→S 到达，B→C 才是树上多出来的那条边 —— 冲突落在它身上，
    // 而图纸上"闭合"回路的 C→S 只是普通反向边，不误报。
    const source = node("ac-source");
    const a = node("ac-bus");
    const b = node("ac-bus");
    const c = node("ac-bus");
    const ring = [edge(source, a), edge(a, b), edge(b, c), edge(c, source)];

    const directions = computeElectricFlowDirections([source, a, b, c], ring);

    expect(ring.map((item) => directionOf(directions, item))).toEqual(["forward", "forward", "both", "reverse"]);
    // 全网只有一条 both —— 树形分支绝不会被误判成环
    expect(ring.filter((item) => directionOf(directions, item) === "both")).toHaveLength(1);
  });

  it("树形网络（无环）不会误报 both", () => {
    const source = node("ac-source");
    const bus = node("ac-bus");
    const b1 = node("ac-bus");
    const b2 = node("ac-bus");
    const load = node("ac-load");
    const chain = [edge(source, bus), edge(bus, b1), edge(b1, load), edge(bus, b2)];

    const directions = computeElectricFlowDirections([source, bus, b1, b2, load], chain);

    expect(chain.map((item) => directionOf(directions, item))).toEqual(["forward", "forward", "forward", "forward"]);
  });
});

/** 场景 4：分闸开关 / 断路器。 */
describe("computeElectricFlowDirections — 分闸断路器", () => {
  it("分闸时两侧的边都是 none（不导通），合闸后恢复 forward", () => {
    const source = node("ac-source");
    const open = node("ac-breaker", { status: "0", closed_status: "0" });
    const load = node("ac-load");
    const up = edge(source, open);
    const down = edge(open, load);

    const opened = computeElectricFlowDirections([source, open, load], [up, down]);
    expect(directionOf(opened, up)).toBe("none");
    expect(directionOf(opened, down)).toBe("none");

    const closed = node("ac-breaker", { status: "1", closed_status: "1" });
    const closedUp = edge(source, closed);
    const closedDown = edge(closed, load);
    const reclosed = computeElectricFlowDirections([source, closed, load], [closedUp, closedDown]);
    expect(directionOf(reclosed, closedUp)).toBe("forward");
    expect(directionOf(reclosed, closedDown)).toBe("forward");
  });

  it("接地刀闸不受合分状态影响（switchingDeviceUsesClosedStatus 对其恒 false），且是潮流终点", () => {
    const source = node("ac-source");
    const grounding = node("ac-ground-disconnector", { status: "0" });
    const toGround = edge(source, grounding);

    const directions = computeElectricFlowDirections([source, grounding], [toGround]);
    expect(directionOf(directions, toGround)).toBe("forward");
  });
});

/** 场景 5：储能双向（既充又放）。 */
describe("computeElectricFlowDirections — 储能", () => {
  it("放电主路 S→储能→负荷 全 forward", () => {
    const source = node("ac-source");
    const storage = node("ac-storage");
    const load = node("ac-load");
    const discharge = edge(source, storage);
    const toLoad = edge(storage, load);

    const directions = computeElectricFlowDirections([source, storage, load], [discharge, toLoad]);

    expect(directionOf(directions, discharge)).toBe("forward");
    expect(directionOf(directions, toLoad)).toBe("forward");
  });

  it("纯充电支路（负荷侧母线 → 储能，支路画成 储能 → 母线）得到 reverse，电流朝储能流", () => {
    // 边画成 储能 → 负荷侧母线 ⇒ forward 是放电、reverse 是母线倒灌充电。
    // 储能只经这一条边被到达（没有电源直连进线），所以它不会从自身侧再记一次，
    // 整条边稳定保持 reverse。
    const source = node("ac-source");
    const loadSideBus = node("ac-bus");
    const storage = node("ac-storage");
    const toBus = edge(source, loadSideBus);
    const charge = edge(storage, loadSideBus);

    const directions = computeElectricFlowDirections([source, loadSideBus, storage], [toBus, charge]);

    expect(directionOf(directions, toBus)).toBe("forward");
    expect(directionOf(directions, charge)).toBe("reverse");
  });

  it("同一台储能既被电源侧充又被负荷侧充时，共用进线判 both（真·双向）", () => {
    // 电源进线与负荷侧进线落在同一条边上时不可能只留一个方向：
    // 储能已由电源到达、必然从自身侧记一次 forward，负荷侧母线再记一次 reverse ⇒ both。
    const source = node("ac-source");
    const storage = node("ac-storage");
    const loadSideBus = node("ac-bus");
    const shared = edge(storage, loadSideBus);
    const fromSource = edge(source, storage);

    const directions = computeElectricFlowDirections(
      [source, storage, loadSideBus],
      [fromSource, edge(source, loadSideBus), shared]
    );

    expect(directionOf(directions, fromSource)).toBe("forward");
    expect(directionOf(directions, shared)).toBe("both");
  });
});

/** 场景 6：无源孤岛。 */
describe("computeElectricFlowDirections — 无源孤岛", () => {
  it("没有任何电源的支路全部 none，另一个有源的岛不受牵连", () => {
    const islandBus = node("ac-bus");
    const islandLoadA = node("ac-load");
    const islandLoadB = node("ac-load");
    const e1 = edge(islandBus, islandLoadA);
    const e2 = edge(islandBus, islandLoadB);

    const liveSource = node("ac-source");
    const liveLoad = node("ac-load");
    const e3 = edge(liveSource, liveLoad);

    const directions = computeElectricFlowDirections(
      [islandBus, islandLoadA, islandLoadB, liveSource, liveLoad],
      [e1, e2, e3]
    );

    expect(directionOf(directions, e1)).toBe("none");
    expect(directionOf(directions, e2)).toBe("none");
    expect(directionOf(directions, e3)).toBe("forward");
  });
});

/** 场景 7：source / target 对调 ⇒ forward ⇄ reverse。 */
describe("computeElectricFlowDirections — source/target 对调", () => {
  it("同一条 edge 的 source/target 互换后，forward 必须变成 reverse", () => {
    const source = node("ac-source");
    const transformer = node("ac-transformer", { i_vbase: "110", j_vbase: "10" });
    const load = node("ac-load");
    const lowSide = edge(transformer, load, transformer.terminals[1].id, load.terminals[0].id);

    const drawnForward: Edge = {
      id: "e-high",
      sourceId: source.id,
      targetId: transformer.id,
      sourceTerminalId: source.terminals[0].id,
      targetTerminalId: transformer.terminals[0].id
    };
    const swapped: Edge = { ...drawnForward, sourceId: transformer.id, targetId: source.id };

    const forwardRun = computeElectricFlowDirections([source, transformer, load], [drawnForward, lowSide]);
    const swappedRun = computeElectricFlowDirections([source, transformer, load], [swapped, lowSide]);

    expect(directionOf(forwardRun, drawnForward)).toBe("forward");
    expect(directionOf(swappedRun, swapped)).toBe("reverse");
    // 对调只影响这条边本身：下游那一段仍是 forward。
    expect(directionOf(swappedRun, lowSide)).toBe("forward");
  });
});

/** 标记层：转义、方向、降级、空串。 */
describe("buildElectricFlowLayerMarkup", () => {
  const routed = [{ edgeId: "e1", path: "M 0 0 L 100 0" }];

  it("无有向内容时返回空串", () => {
    expect(buildElectricFlowLayerMarkup(routed, new Map([["e1", "none"]]))).toBe("");
    expect(buildElectricFlowLayerMarkup(routed, new Map())).toBe("");
    expect(buildElectricFlowLayerMarkup([], new Map([["e1", "forward"]]))).toBe("");
  });

  it("外层总组带 class 且 pointer-events=none，每条有向边一个 <g> + 两个错峰箭头", () => {
    const markup = buildElectricFlowLayerMarkup(routed, new Map([["e1", "forward"]]));
    expect(markup.startsWith(`<g class="${ELECTRIC_FLOW_LAYER_CLASS}" pointer-events="none">`)).toBe(true);
    expect(markup.match(new RegExp(`class="${ELECTRIC_FLOW_ARROW_CLASS}`, "g"))?.length).toBe(2);
    expect(markup).toContain("animation-delay: 0s");
    expect(markup).toContain("animation-delay: calc(var(--electric-flow-duration) * -0.5)");
    expect(markup).toContain("offset-rotate: auto");
  });

  it("reverse 用 offset-rotate: auto 180deg 回程；both 两个方向各一个箭头", () => {
    expect(buildElectricFlowLayerMarkup(routed, new Map([["e1", "reverse"]]))).toContain("offset-rotate: auto 180deg");
    const both = buildElectricFlowLayerMarkup(routed, new Map([["e1", "both"]]));
    expect(both).toContain("offset-rotate: auto;");
    expect(both).toContain("offset-rotate: auto 180deg;");
  });

  it("路径里的引号 / & / < / > 被 XML 转义，不会截断 style 属性", () => {
    const markup = buildElectricFlowLayerMarkup([{ edgeId: "e1", path: 'M 0 0 L 1 1" & < >' }], new Map([["e1", "forward"]]));
    expect(markup).toContain("path(&quot;M 0 0 L 1 1&quot; &amp; &lt; &gt;&quot;)");
    expect(markup).not.toContain('L 1 1"');
  });

  it("有向边超过 600 条时降级为每边 1 个箭头", () => {
    const many = Array.from({ length: 601 }, (_unused, index) => ({ edgeId: `e${index}`, path: "M 0 0 L 10 0" }));
    const directions = new Map(many.map((item) => [item.edgeId, "forward" as ElectricFlowDirection]));
    const markup = buildElectricFlowLayerMarkup(many, directions);
    expect(markup.match(new RegExp(`class="${ELECTRIC_FLOW_ARROW_CLASS}`, "g"))?.length).toBe(601);
    expect(markup).not.toContain("-0.5");
  });
});

describe("buildElectricFlowStyleMarkup", () => {
  it("含 CSS motion path 关键帧与可调的速度变量", () => {
    const style = buildElectricFlowStyleMarkup();
    expect(style.startsWith("<style><![CDATA[")).toBe(true);
    expect(style.endsWith("]]></style>")).toBe(true);
    expect(style).toContain("--electric-flow-duration: 1.6s");
    expect(style).toContain("@keyframes electric-flow-run-forward");
    expect(style).toContain("@keyframes electric-flow-run-reverse");
  });
});