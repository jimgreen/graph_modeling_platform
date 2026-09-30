// model-routing 里三处此前零断言的导出：createTerminals / createTemplateTerminals /
// collectVoltageBaseIslandForTerminal。
// 三者都是纯函数、不抛异常，判错后果是「新建设备的端子少一个 / 类型串了」
// 「改一侧电压时整片拓扑岛被漏改或跨电压级误改」，属静默算错一类。
import { describe, expect, test } from "vitest";

import { collectVoltageBaseIslandForTerminal, createTemplateTerminals, createTerminals } from "./model-routing";
import type { DeviceTemplate, Edge, ModelNode, Terminal } from "./model";

/** anchor 是**归一化比例**（-0.5 ~ 0.5）乘以节点尺寸，见 getTerminalPoint。 */
const terminal = (id: string, type: string, x = 0, y = -0.5): Terminal =>
  ({ id, label: id, type, anchor: { x, y } }) as unknown as Terminal;

const node = (
  id: string,
  kind: string,
  terminals: Terminal[],
  x = 0,
  y = 0,
  extra: Record<string, unknown> = {}
): ModelNode =>
  ({
    id,
    kind,
    name: id,
    nodeNumber: id,
    position: { x, y },
    size: { width: 100, height: 100 },
    rotation: 0,
    scale: 1,
    terminals,
    params: {},
    ...extra
  }) as unknown as ModelNode;

const edge = (id: string, sourceId: string, sourceTerminalId: string, targetId: string, targetTerminalId: string): Edge =>
  ({ id, sourceId, sourceTerminalId, targetId, targetTerminalId, points: [] }) as unknown as Edge;

const template = (fields: Record<string, unknown>) => fields as unknown as DeviceTemplate;

const island = (nodes: ModelNode[], edges: Edge[], seedNodeId: string, seedTerminalId: string) => {
  const result = collectVoltageBaseIslandForTerminal(nodes, edges, seedNodeId, seedTerminalId);
  return {
    nodes: [...result.nodeIds].sort(),
    // 扁平化成 "nodeId:terminalId" 列表，逐条可比
    terminals: [...result.terminalIdsByNodeId.entries()]
      .flatMap(([nodeId, ids]) => [...ids].map((terminalId) => `${nodeId}:${terminalId}`))
      .sort()
  };
};

describe("createTerminals", () => {
  test("count 上限 8、锚点按 8 槽位固定排布", () => {
    expect(createTerminals("ac", 20).map((item) => item.id)).toEqual(["t1", "t2", "t3", "t4", "t5", "t6", "t7", "t8"]);
    expect(createTerminals("ac", 8).map((item) => `${item.anchor.x},${item.anchor.y}`)).toEqual([
      "-0.5,0", "0.5,0", "0,-0.5", "0,0.5", "-0.5,-0.25", "0.5,-0.25", "-0.5,0.25", "0.5,0.25"
    ]);
  });

  test("1 个端子锚在右侧、2 个端子左右分列（与 8 槽位表不同）", () => {
    expect(createTerminals("ac", 1).map((item) => `${item.id}@${item.anchor.x},${item.anchor.y}`)).toEqual(["t1@0.5,0"]);
    expect(createTerminals("ac", 2).map((item) => `${item.id}@${item.anchor.x},${item.anchor.y}`)).toEqual([
      "t1@-0.5,0", "t2@0.5,0"
    ]);
    expect(createTerminals("ac", 3).map((item) => `${item.id}@${item.anchor.x},${item.anchor.y}`)).toEqual([
      "t1@-0.5,0", "t2@0.5,0", "t3@0,-0.5"
    ]);
  });

  test("★ count 先四舍五入再夹取：0.4 仍得 1 个端子（不是 0）", () => {
    // 早退判据是 `count <= 0`，0.4 > 0 走不到早退；Math.round(0.4) = 0 再被 clamp 抬到 1
    expect(createTerminals("ac", 0.4)).toHaveLength(1);
    expect(createTerminals("ac", 2.4)).toHaveLength(2);
    expect(createTerminals("ac", 2.6)).toHaveLength(3);
    // 真正的 0 / 负数才走早退
    expect(createTerminals("ac", 0)).toEqual([]);
    expect(createTerminals("ac", -3)).toEqual([]);
  });

  test("★ NaN 落进「既不等于 1 也不等于 2」的第三条路，slice(0, NaN) 收成空数组", () => {
    // NaN <= 0 为 false（不早退），NaN === 1 / === 2 也为 false，
    // 于是走到 anchors.slice(0, NaN)，slice 视 NaN 为 0
    expect(createTerminals("ac", Number.NaN)).toEqual([]);
  });

  test("标签按类型取中文名，vbase 恒为同一常量，nodeNumber 逐个唯一", () => {
    expect(createTerminals("h2", 2).map((item) => item.label)).toEqual(["氢能设备端1", "氢能设备端2"]);
    expect(createTerminals("ac", 3).map((item) => item.vbase)).toEqual(["0", "0", "0"]);
    expect(createTerminals("heat", 1)[0].label).toBe("热能设备端1");
    const numbers = createTerminals("ac", 5).map((item) => item.nodeNumber);
    expect(new Set(numbers).size).toBe(5);
    // ≥3 个端子走的是 8 槽位那条分支，标签编号另算一套（index+1）
    expect(createTerminals("ac", 3).map((item) => item.label)).toEqual(["交流设备端1", "交流设备端2", "交流设备端3"]);
    expect(createTerminals("dc", 5).map((item) => item.label)).toEqual([
      "直流设备端1", "直流设备端2", "直流设备端3", "直流设备端4", "直流设备端5"
    ]);
  });
});

describe("createTemplateTerminals", () => {
  test("无 terminalTypes 时只覆盖标签与锚点，类型沿用模板的 terminalType", () => {
    const result = createTemplateTerminals(template({ terminalType: "ac", terminalCount: 2 }));
    expect(result.map((item) => `${item.id}/${item.type}/${item.label}`)).toEqual([
      "t1/ac/交流设备端1",
      "t2/ac/交流设备端2"
    ]);
    expect(result.map((item) => `${item.anchor.x},${item.anchor.y}`)).toEqual(["-0.5,0", "0.5,0"]);
    // 已证明类型分支里 `?? template.terminalType` 换成 `?? terminal.type` 不能作为覆盖证据
    // （属源码自身等价）：terminal.type 本就是 createTerminals 用 template.terminalType 生成的。
    // 同理，无类型分支里的标签回落到 terminal.label（createTerminals 按 template.terminalType 生成），
    // 也不可观测 —— 这两条回落写成哪个来源都读不出差别。
  });

  test("terminalLabels / terminalAnchors 逐下标覆盖，短数组缺位回落默认", () => {
    const result = createTemplateTerminals(template({
      terminalType: "ac",
      terminalCount: 2,
      terminalLabels: ["A"],
      terminalAnchors: [{ x: 9, y: 9 }]
    }));
    expect(result.map((item) => item.label)).toEqual(["A", "交流设备端2"]);
    expect(result.map((item) => `${item.anchor.x},${item.anchor.y}`)).toEqual(["9,9", "0.5,0"]);
  });

  test("★ 有 terminalTypes 时逐下标改类型，缺失下标回落 template.terminalType", () => {
    const result = createTemplateTerminals(template({
      terminalType: "ac",
      terminalCount: 3,
      terminalTypes: ["dc", "heat"]
    }));
    expect(result.map((item) => `${item.id}/${item.type}/${item.label}`)).toEqual([
      "t1/dc/直流设备端1",
      "t2/heat/热能设备端2",
      "t3/ac/交流设备端3"
    ]);
  });

  test("★ terminalTypes 先按端子数截断：多给的类型不会多生端子", () => {
    const result = createTemplateTerminals(template({
      terminalType: "ac",
      terminalCount: 1,
      terminalTypes: ["dc", "dc", "dc"]
    }));
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("dc");
    // 已证明 `.slice(0, baseTerminals.length)` 这个截断不能作为覆盖证据（属源码自身等价）：
    // 后面 map 遍历的是 baseTerminals，下标恒 < baseTerminals.length，
    // 截断只影响永远读不到的那几项，删掉后逐字节同解。
  });

  test("空数组视作「没给类型」：走无类型分支，标签按 terminalType 生成", () => {
    // `!terminalTypes?.length` 对 [] 为真 —— 不是「按空数组逐项回落」
    const result = createTemplateTerminals(template({ terminalType: "ac", terminalCount: 2, terminalTypes: [] }));
    expect(result.map((item) => `${item.type}/${item.label}`)).toEqual(["ac/交流设备端1", "ac/交流设备端2"]);
    // 已证明 `!terminalTypes?.length` 里的 `?.length` 判断不能作为覆盖证据（属源码自身等价）：
    // 若改成只看 `!terminalTypes`（空数组也进类型分支），类型分支里
    // `terminalTypes[index] ?? template.terminalType` 逐项仍取到 template.terminalType，
    // 标签/锚点也走同一套回落，与无类型分支结果逐字节相同。
  });

  test("terminalCount 缺省 / 为 0 / 为负都是空数组", () => {
    expect(createTemplateTerminals(template({ terminalType: "ac" }))).toEqual([]);
    expect(createTemplateTerminals(template({ terminalType: "ac", terminalCount: 0 }))).toEqual([]);
    expect(createTemplateTerminals(template({ terminalType: "ac", terminalCount: -2 }))).toEqual([]);
  });

  test("有 terminalTypes 也改不掉端子总数（总数只由 terminalCount 决定）", () => {
    const result = createTemplateTerminals(template({ terminalType: "ac", terminalTypes: ["dc", "dc"] }));
    expect(result).toEqual([]);
  });

  test("★ 两条分支的 vbase 恒为 \"0\"：defaultTerminalVbase 忽略 type 参数", () => {
    // 有类型分支里 `vbase: defaultTerminalVbase(type)` 看似按类型重算，
    // 但 defaultTerminalVbase 的形参带下划线前缀（刻意不用），所有类型返回同一常量。
    const withTypes = createTemplateTerminals(template({
      terminalType: "ac",
      terminalCount: 2,
      terminalTypes: ["dc", "h2"]
    }));
    expect(withTypes.map((item) => item.vbase)).toEqual(["0", "0"]);
    expect(createTemplateTerminals(template({ terminalType: "heat", terminalCount: 1 }))[0].vbase).toBe("0");
  });
});

describe("collectVoltageBaseIslandForTerminal：入口守卫", () => {
  const a = node("a", "ac-load", [terminal("t1", "ac")]);

  test("未知节点 / 未知端子 / 非电气端子都返回空岛（不抛错）", () => {
    expect(island([a], [], "zz", "t1")).toEqual({ nodes: [], terminals: [] });
    expect(island([a], [], "a", "t9")).toEqual({ nodes: [], terminals: [] });
    expect(island([node("d", "ac-load", [terminal("t1", "comm")])], [], "d", "t1")).toEqual({ nodes: [], terminals: [] });
    // 已证明入口那道 `!isElectricalTerminalType(seedTerminal.type)` 不能作为覆盖证据（属源码自身等价）：
    // BFS 出队时还有一次同判据的检查（`if (terminal && !isElectricalTerminalType(terminal.type)) continue`），
    // 删掉入口这道，非电气种子照样在出队时被挡，仍是空岛。
  });

  test("★ 只有 ac / dc 算「电气端子」：h2 / heat 起点直接落空岛", () => {
    const table: Array<[string, boolean]> = [["ac", true], ["dc", true], ["h2", false], ["heat", false], ["comm", false], ["AC", false]];
    for (const [type, expected] of table) {
      const n = node("n", "ac-load", [terminal("t1", type)]);
      expect(island([n], [], "n", "t1").nodes, `type=${type}`).toEqual(expected ? ["n"] : []);
    }
  });
});

describe("collectVoltageBaseIslandForTerminal：沿边扩散", () => {
  // 位置拉开，避免「端子点重合」这条邻接来源把测试意图搅浑
  const a = node("a", "ac-load", [terminal("t1", "ac")], 0);
  const b = node("b", "ac-load", [terminal("t1", "ac")], 500);
  const c = node("c", "ac-load", [terminal("t1", "ac")], 1000);

  test("无边时只含起点自身", () => {
    expect(island([a, b, c], [], "a", "t1")).toEqual({ nodes: ["a"], terminals: ["a:t1"] });
  });

  test("一条边连出对端，两端都能当起点", () => {
    const edges = [edge("e1", "a", "t1", "b", "t1")];
    const expected = { nodes: ["a", "b"], terminals: ["a:t1", "b:t1"] };
    expect(island([a, b, c], edges, "a", "t1")).toEqual(expected);
    expect(island([a, b, c], edges, "b", "t1")).toEqual(expected);
  });

  test("链式两条边扩散到第三个节点", () => {
    const edges = [edge("e1", "a", "t1", "b", "t1"), edge("e2", "b", "t1", "c", "t1")];
    expect(island([a, b, c], edges, "a", "t1")).toEqual({ nodes: ["a", "b", "c"], terminals: ["a:t1", "b:t1", "c:t1"] });
    // 已证明 push 里的 `if (!visited.has(key))` 不能作为覆盖证据（属源码自身等价）：
    // 出队开头还有一次同样的 `if (visited.has(key)) continue`，重复入队只是多排一次队、结果不变。
  });

  test("★ 边缺端子 id 时不建邻接（不按节点级连通）", () => {
    // 两侧都缺：连出来的是 "a:undefined" ↔ "b:undefined"，起点键 "a:t1" 根本不在邻接表里
    const loose = [{ id: "e9", sourceId: "a", targetId: "b", points: [] }] as unknown as Edge[];
    expect(island([a, b], loose, "a", "t1")).toEqual({ nodes: ["a"], terminals: ["a:t1"] });
    // 只缺一侧：若守卫失效，"a:t1" 会被连到 "b:undefined"，b 就被算进岛里
    const half = [{ id: "e9", sourceId: "a", sourceTerminalId: "t1", targetId: "b", points: [] }] as unknown as Edge[];
    expect(island([a, b], half, "a", "t1")).toEqual({ nodes: ["a"], terminals: ["a:t1"] });
  });

  test("★ 跨端子类型的边不通：ac 侧与 dc 侧各成一个岛", () => {
    const d = node("d", "ac-load", [terminal("t1", "dc")], 500);
    const edges = [edge("e1", "a", "t1", "d", "t1")];
    expect(island([a, d], edges, "a", "t1")).toEqual({ nodes: ["a"], terminals: ["a:t1"] });
    expect(island([a, d], edges, "d", "t1")).toEqual({ nodes: ["d"], terminals: ["d:t1"] });
    // 同理，出队时那道 `!isElectricalTerminalType(terminal.type)` 也观测不到：
    // 非电气端子只能经邻接进来，而邻接那一步的「类型必须相等」先把非电气端子挡掉了。
    // 换句话说这两处检查是冗余的，不是本组断言的覆盖面。
  });
});

describe("collectVoltageBaseIslandForTerminal：同节点端子合并", () => {
  test("同类型端子在 uniform 设备上合并成一个岛", () => {
    const m = node("m", "ac-load", [terminal("t1", "ac", 0, -0.5), terminal("t2", "ac", 0, 0.5)]);
    expect(island([m], [], "m", "t1")).toEqual({ nodes: ["m"], terminals: ["m:t1", "m:t2"] });
    expect(island([m], [], "m", "t2")).toEqual({ nodes: ["m"], terminals: ["m:t1", "m:t2"] });
  });

  test("异类型端子不合并（只并入与起点同类型的那几个）", () => {
    const m = node("m", "ac-load", [terminal("t1", "ac", 0, -0.5), terminal("t2", "dc", 0, 0.5)]);
    expect(island([m], [], "m", "t1")).toEqual({ nodes: ["m"], terminals: ["m:t1"] });
    expect(island([m], [], "m", "t2")).toEqual({ nodes: ["m"], terminals: ["m:t2"] });
  });

  test("★ 变压器 / 换流器走 terminal 模式：分侧端子互不合并", () => {
    const pairs = [
      terminal("t1", "ac", 0, -0.5),
      terminal("t2", "ac", 0, 0.5)
    ];
    // 判定看 kind（TERMINAL_VOLTAGE_BASE_SETTING_KINDS），不是 params 键
    for (const kind of [
      "ac-transformer",
      "ac-two-winding-transformer",
      "ac-three-winding-transformer",
      "dcdc-converter",
      "dcac-converter",
      "acac-converter",
      "acdc-converter"
    ]) {
      const n = node("n", kind, pairs);
      expect(island([n], [], "n", "t1"), kind).toEqual({ nodes: ["n"], terminals: ["n:t1"] });
    }
    // 反过来，ac-load 即使在 params 里写 voltage_base_setting_mode: "terminal"，仍按 uniform 合并 ——
    // 这道判据只认 kind 与 E 段，不读 params
    const withParam = node("n", "ac-load", pairs, 0, 0, { params: { voltage_base_setting_mode: "terminal" } });
    expect(island([withParam], [], "n", "t1")).toEqual({ nodes: ["n"], terminals: ["n:t1", "n:t2"] });
  });

  test("开关与线路仍按 uniform 合并", () => {
    const pairs = [terminal("t1", "ac", 0, -0.5), terminal("t2", "ac", 0, 0.5)];
    for (const kind of ["ac-switch", "ac-line"]) {
      const n = node("n", kind, pairs);
      expect(island([n], [], "n", "t1"), kind).toEqual({ nodes: ["n"], terminals: ["n:t1", "n:t2"] });
    }
    // 派生 kind 仍按 baseDeviceKind 归到线路族
    const derived = node("n", "ac-line:derived:custom-1", pairs);
    expect(island([derived], [], "n", "t1")).toEqual({ nodes: ["n"], terminals: ["n:t1", "n:t2"] });
  });

  test("★ 同节点内部的自环边被挡（不跨到本节点其它端子）", () => {
    // 用 transformer（terminal 模式，不做同类型合并）才能单独验证这道守卫：
    // 换成 ac-load 时 uniform 合并本来就会把 t2 带进来，两条路径混在一起分不清
    const tv = node("tv", "ac-two-winding-transformer", [terminal("t1", "ac", 0, -0.5), terminal("t2", "ac", 0, 0.5)]);
    const plain = node("m", "ac-load", [terminal("t1", "ac", 0, -0.5), terminal("t2", "ac", 0, 0.5)]);
    // 无自环边时：terminal 模式不合并，uniform 模式合并
    expect(island([tv], [], "tv", "t1")).toEqual({ nodes: ["tv"], terminals: ["tv:t1"] });
    expect(island([plain], [], "m", "t1")).toEqual({ nodes: ["m"], terminals: ["m:t1", "m:t2"] });
    // 加上 t1→t2 的自环边：两种设备的 t2 都不因这条边进来
    expect(island([tv], [edge("s", "tv", "t1", "tv", "t2")], "tv", "t1")).toEqual({
      nodes: ["tv"],
      terminals: ["tv:t1"]
    });
    expect(island([plain], [edge("s", "m", "t1", "m", "t2")], "m", "t1")).toEqual({
      nodes: ["m"],
      terminals: ["m:t1", "m:t2"]
    });
  });
});

describe("collectVoltageBaseIslandForTerminal：端子点重合 / 母线接触", () => {
  test("两个设备端子点完全重合即视为连通，无需任何边", () => {
    const o1 = node("o1", "ac-load", [terminal("t1", "ac")], 0, 0);
    const o2 = node("o2", "ac-load", [terminal("t1", "ac")], 0, 0);
    const expected = { nodes: ["o1", "o2"], terminals: ["o1:t1", "o2:t1"] };
    expect(island([o1, o2], [], "o1", "t1")).toEqual(expected);
    expect(island([o1, o2], [], "o2", "t1")).toEqual(expected);
  });

  test("重合但端子类型不同不通", () => {
    const o1 = node("o1", "ac-load", [terminal("t1", "ac")], 0, 0);
    const o3 = node("o3", "ac-load", [terminal("t1", "dc")], 0, 0);
    expect(island([o1, o3], [], "o1", "t1")).toEqual({ nodes: ["o1"], terminals: ["o1:t1"] });
  });

  test("★ 重合组里出现变压器则整组断开：变压器端子不算接触邻接", () => {
    const o1 = node("o1", "ac-load", [terminal("t1", "ac")], 0, 0);
    for (const kind of ["ac-transformer", "ac-two-winding-transformer"]) {
      const t = node("t", kind, [terminal("t1", "ac")], 0, 0);
      expect(island([o1, t], [], "o1", "t1"), kind).toEqual({ nodes: ["o1"], terminals: ["o1:t1"] });
      expect(island([o1, t], [], "t", "t1"), kind).toEqual({ nodes: ["t"], terminals: ["t:t1"] });
    }
  });

  test("★ 母线端子由「边端点数」重算：声明的端子会被丢弃", () => {
    // syncBusNodeTerminals 用 (边端点数 + 隐式接触数) 重新生成母线端子，
    // 没有边也没有接触时计数为 0，母线节点自己的 terminals 被清空
    const bare = node("bus", "ac-bus", [terminal("t1", "ac", -0.5, 0), terminal("t2", "ac", 0.5, 0)], 500, 0,
      { size: { width: 200, height: 20 } });
    expect(island([bare], [], "bus", "t1")).toEqual({ nodes: [], terminals: [] });
  });

  test("母线按边端点数拿到 t1/t2，且两侧端子合成一片（uniform）", () => {
    const bus = node("bus", "ac-bus", [], 500, 0, { size: { width: 200, height: 20 } });
    const l1 = node("l1", "ac-load", [terminal("t1", "ac")], 0);
    const l2 = node("l2", "ac-load", [terminal("t1", "ac")], 1000);
    const edges = [edge("e1", "l1", "t1", "bus", "t1"), edge("e2", "l2", "t1", "bus", "t2")];
    const expected = { nodes: ["bus", "l1", "l2"], terminals: ["bus:t1", "bus:t2", "l1:t1", "l2:t1"] };
    expect(island([bus, l1, l2], edges, "bus", "t1")).toEqual(expected);
    expect(island([bus, l1, l2], edges, "bus", "t2")).toEqual(expected);
    expect(island([bus, l1, l2], edges, "l1", "t1")).toEqual(expected);
  });

  test("只连一个负载时母线只生成一个端子，不凭空多一个", () => {
    const bus = node("bus", "ac-bus", [], 500, 0, { size: { width: 200, height: 20 } });
    const l1 = node("l1", "ac-load", [terminal("t1", "ac")], 0);
    const l2 = node("l2", "ac-load", [terminal("t1", "ac")], 1000);
    const edges = [edge("e1", "l1", "t1", "bus", "t1")];
    expect(island([bus, l1, l2], edges, "bus", "t1")).toEqual({ nodes: ["bus", "l1"], terminals: ["bus:t1", "l1:t1"] });
  });

  test("★ 隐式接触：负载端子压在母线中心线上即成一片（无边）", () => {
    const bus = node("bus", "ac-bus", [], 500, 0, { size: { width: 200, height: 20 } });
    const near = node("near", "ac-load", [terminal("t1", "ac", 0, -0.5)], 500, 50);
    const expected = { nodes: ["bus", "near"], terminals: ["bus:t1", "near:t1"] };
    expect(island([bus, near], [], "near", "t1")).toEqual(expected);
    // 反向从母线起也通；母线的 t1 正是这次隐式接触给它补出来的
    expect(island([bus, near], [], "bus", "t1")).toEqual(expected);
  });

  test("★ 隐式接触遇变压器被排除：变压器端子压母线不通", () => {
    const bus = node("bus", "ac-bus", [], 500, 0, { size: { width: 200, height: 20 } });
    const tvc = node("tvc", "ac-two-winding-transformer", [terminal("t1", "ac", 0, -0.5)], 500, 50);
    expect(island([bus, tvc], [], "tvc", "t1")).toEqual({ nodes: ["tvc"], terminals: ["tvc:t1"] });
  });
});
