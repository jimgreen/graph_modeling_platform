// model-routing 里此前零断言的两个导出：resolveTopologyEdgeTerminal / buildTopologyConnectivity。
// 两者是电压继承的骨架：算错不会抛异常，只会让「改一侧电压时整片拓扑岛被漏改或跨电压级误改」
// 「断开的开关被当成连通」——静默算错一类。
//
// 断言一律走**相等关系**（哪些端子同根）而不是根字符串字面量：并查集的根取哪一个取决于
// union 顺序，换个实现细节就会让字面量断言假红，而「谁和谁同根」才是真正要钉住的东西。
//
// 另有三处**构造上不可覆盖**的写法，已在变异验证里逐条确认（改成等价形态后本文件全绿）：
//  1. 建图时对每个端子预先 `topology.ensure(...)` 的那一轮 —— 并查集的 find() 自己会 ensure，
//     而对外暴露的 topologyRoot / islandRoot 走的都是 find，删掉预置结果不变。
//  2. 岛侧同理：`island.ensure(topology.find(...))` 的实参从「拓扑根」换成「原始键」结果不变。
//  3. 岛收缩里的 `if (!first) continue;` —— 空数组解构出 first === undefined 且 rest === []，
//     下面的 for 本来就不会进，守卫删掉结果不变。
// 这三处属于「写多不写少」，不是行为漏洞；要动它们属于另一件事，本文件只负责如实记下。
import { describe, expect, test } from "vitest";

import { buildTopologyConnectivity, resolveTopologyEdgeTerminal } from "./model-routing";
import type { Edge, ModelNode, Terminal } from "./model";

/** anchor 是**归一化比例**（-0.5 ~ 0.5）乘以节点尺寸，见 getTerminalPoint。 */
const terminal = (id: string, type: string, x = 0, y = -0.5): Terminal =>
  ({ id, label: id, type, anchor: { x, y } }) as unknown as Terminal;

const node = (
  id: string,
  kind: string,
  terminals: Terminal[],
  x = 0,
  y = 0,
  params: Record<string, string> = {}
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
    params
  }) as unknown as ModelNode;

const edge = (
  id: string,
  sourceId: string,
  sourceTerminalId: string | undefined,
  targetId: string,
  targetTerminalId: string | undefined
): Edge => ({ id, sourceId, sourceTerminalId, targetId, targetTerminalId, points: [] }) as unknown as Edge;

describe("resolveTopologyEdgeTerminal", () => {
  const two = node("n", "ac-load", [terminal("t1", "ac", -0.5, 0), terminal("t2", "ac", 0.5, 0)]);
  const none = node("e", "ac-load", []);

  test("节点不存在 → undefined", () => {
    expect(resolveTopologyEdgeTerminal(undefined, "t1")).toBeUndefined();
    expect(resolveTopologyEdgeTerminal(undefined)).toBeUndefined();
  });

  test("节点没有端子 → undefined（带不带 terminalId 都一样）", () => {
    expect(resolveTopologyEdgeTerminal(none, "t1")).toBeUndefined();
    expect(resolveTopologyEdgeTerminal(none)).toBeUndefined();
  });

  test("给了 terminalId 且命中 → 返回那一个（不是第一个）", () => {
    expect(resolveTopologyEdgeTerminal(two, "t2")?.id).toBe("t2");
  });

  test("★ 给了 terminalId 但不存在 → undefined，**不回落**到第一个端子", () => {
    expect(resolveTopologyEdgeTerminal(two, "t9")).toBeUndefined();
  });

  test("不给 terminalId → 第一个端子", () => {
    expect(resolveTopologyEdgeTerminal(two)?.id).toBe("t1");
  });

  test("★ 空串 terminalId 算「没给」→ 第一个端子（判据是 if (terminalId)，不是 !== undefined）", () => {
    expect(resolveTopologyEdgeTerminal(two, "")?.id).toBe("t1");
  });
});

describe("buildTopologyConnectivity", () => {
  test("terminalKey 是 nodeId:terminalId", () => {
    const c = buildTopologyConnectivity([], []);
    expect(c.terminalKey("a", "t1")).toBe("a:t1");
  });

  test("空图 / 未知端子：查询退化成自身（并查集按需补键，不抛）", () => {
    const c = buildTopologyConnectivity([], []);
    expect(c.topologyRoot("a", "t1")).toBe("a:t1");
    expect(c.islandRoot("a", "t1")).toBe("a:t1");
  });

  test("同类型端子经一条边连通", () => {
    const c = buildTopologyConnectivity(
      [node("a", "ac-load", [terminal("t1", "ac", -0.5, 0)]), node("b", "ac-load", [terminal("t1", "ac", 0.5, 0)], 200)],
      [edge("e1", "a", "t1", "b", "t1")]
    );
    expect(c.topologyRoot("a", "t1")).toBe(c.topologyRoot("b", "t1"));
    expect(c.islandRoot("a", "t1")).toBe(c.islandRoot("b", "t1"));
  });

  test("★ 边接的是**不同类型**端子 → 不合并（ac 接 dc 不算连通）", () => {
    const c = buildTopologyConnectivity(
      [node("a", "ac-load", [terminal("t1", "ac", -0.5, 0)]), node("b", "dc-load", [terminal("t1", "dc", 0.5, 0)], 200)],
      [edge("e1", "a", "t1", "b", "t1")]
    );
    expect(c.topologyRoot("a", "t1")).not.toBe(c.topologyRoot("b", "t1"));
  });

  test("★ 边不写 terminalId → 两端都取第一个端子，仍然连通", () => {
    const c = buildTopologyConnectivity(
      [node("a", "ac-load", [terminal("t1", "ac", -0.5, 0)]), node("b", "ac-load", [terminal("t1", "ac", 0.5, 0)], 200)],
      [edge("e1", "a", undefined, "b", undefined)]
    );
    expect(c.topologyRoot("a", "t1")).toBe(c.topologyRoot("b", "t1"));
  });

  test("坏边被跳过：端点节点不存在 / 端子不存在 → 不抛，也不误连", () => {
    const c = buildTopologyConnectivity(
      [node("a", "ac-load", [terminal("t1", "ac", -0.5, 0), terminal("t2", "ac", 0.5, 0)])],
      [
        edge("e1", "zzz", "t1", "a", "t1"),
        edge("e2", "a", "t9", "a", "t2"),
        edge("e3", "a", "t1", "zzz", "t1")
      ]
    );
    expect(c.topologyRoot("a", "t1")).not.toBe(c.topologyRoot("a", "t2"));
  });

  test("★ 母线：同类型端子全部互连", () => {
    const bus = node("bus", "ac-bus", [terminal("t1", "ac", -0.5, 0), terminal("t2", "ac", 0.5, 0)]);
    const c = buildTopologyConnectivity(
      [
        bus,
        node("a", "ac-load", [terminal("t1", "ac", -0.5, 0)], -200),
        node("b", "ac-load", [terminal("t1", "ac", 0.5, 0)], 200)
      ],
      [edge("e1", "a", "t1", "bus", "t1"), edge("e2", "bus", "t2", "b", "t1")]
    );
    expect(c.topologyRoot("bus", "t1")).toBe(c.topologyRoot("bus", "t2"));
    expect(c.topologyRoot("bus", "t1")).toBe(c.topologyRoot("a", "t1"));
    expect(c.topologyRoot("bus", "t2")).toBe(c.topologyRoot("b", "t1"));
  });

  test("★ 母线端子数按边数重排：声明 3 个端子但只挂 1 条边时，多余端子在连通性里已不存在", () => {
    // buildTopologyConnectivity 开头会跑 synchronizeBusTerminalsWithEdges，把母线端子
    // 重排成「边数 + 隐式接触数」个。所以这里查 bus:t2 只能拿回它自己的根 —— 它被裁掉了。
    const c = buildTopologyConnectivity(
      [
        node("bus", "ac-bus", [terminal("t1", "ac", -0.5, 0), terminal("t2", "ac", 0.5, 0), terminal("t3", "ac", 0, -0.5)]),
        node("a", "ac-load", [terminal("t1", "ac", -0.5, 0)], -200)
      ],
      [edge("e1", "a", "t1", "bus", "t1")]
    );
    expect(c.topologyRoot("bus", "t1")).toBe(c.topologyRoot("a", "t1"));
    expect(c.topologyRoot("bus", "t2")).toBe("bus:t2");
    expect(c.topologyRoot("bus", "t3")).toBe("bus:t3");
  });

  test("★ 同一条母线上的不同类型端子各自成组：交流组与氢组互不连通", () => {
    // 母线端子同步只重排**数量与 id**、不统一类型，所以一条 ac-bus 上同时挂 ac 与 h2
    // 端子是能走到这里的。那道「按 type 分桶再合并」就是靠这个分桶隔开两组的 ——
    // 去掉分桶直接全并成一桶，交流端子就会被算进氢组。
    const bus = node("bus", "ac-bus", [
      terminal("t1", "ac", -0.5, 0),
      terminal("t2", "ac", 0.5, 0),
      terminal("t3", "h2", 0, -0.5),
      terminal("t4", "h2", 0, 0.5)
    ]);
    const c = buildTopologyConnectivity(
      [
        bus,
        node("a", "ac-load", [terminal("t1", "ac", -0.5, 0)], -300),
        node("b", "ac-load", [terminal("t1", "ac", -0.5, 0)], -150),
        node("c", "hydrogen-load", [terminal("t1", "h2", -0.5, 0)], 150),
        node("d", "hydrogen-load", [terminal("t1", "h2", -0.5, 0)], 300)
      ],
      [
        edge("e1", "a", "t1", "bus", "t1"),
        edge("e2", "b", "t1", "bus", "t2"),
        edge("e3", "c", "t1", "bus", "t3"),
        edge("e4", "d", "t1", "bus", "t4")
      ]
    );
    expect(c.topologyRoot("bus", "t1")).toBe(c.topologyRoot("bus", "t2"));
    expect(c.topologyRoot("bus", "t1")).toBe(c.topologyRoot("a", "t1"));
    expect(c.topologyRoot("bus", "t2")).toBe(c.topologyRoot("b", "t1"));
    expect(c.topologyRoot("bus", "t3")).toBe(c.topologyRoot("bus", "t4"));
    expect(c.topologyRoot("bus", "t3")).toBe(c.topologyRoot("c", "t1"));
    expect(c.topologyRoot("bus", "t4")).toBe(c.topologyRoot("d", "t1"));
    // 两组之间不通
    expect(c.topologyRoot("bus", "t1")).not.toBe(c.topologyRoot("bus", "t3"));
    expect(c.islandRoot("bus", "t1")).not.toBe(c.islandRoot("bus", "t3"));
  });

  test("母线端子类型随母线自己：氢母线挂交流端子经边相连也不合并", () => {
    const c = buildTopologyConnectivity(
      [
        node("bus", "hydrogen-bus", [terminal("t1", "h2", -0.5, 0)]),
        node("a", "ac-load", [terminal("t1", "ac", -0.5, 0)], -200)
      ],
      [edge("e1", "a", "t1", "bus", "t1")]
    );
    expect(c.topologyRoot("bus", "t1")).not.toBe(c.topologyRoot("a", "t1"));
  });

  test("同坐标同类型的端子跨节点重叠 → 视为连通（不需要边）", () => {
    const c = buildTopologyConnectivity(
      [
        node("a", "ac-load", [terminal("t1", "ac", -0.5, 0)], 0),
        node("b", "ac-load", [terminal("t1", "ac", -0.5, 0)], 0)
      ],
      []
    );
    expect(c.topologyRoot("a", "t1")).toBe(c.topologyRoot("b", "t1"));
  });

  test("★ 同坐标但类型不同 → 不合并（重叠判据带类型）", () => {
    const c = buildTopologyConnectivity(
      [
        node("a", "ac-load", [terminal("t1", "ac", -0.5, 0)], 0),
        node("b", "hydrogen-load", [terminal("t1", "h2", -0.5, 0)], 0)
      ],
      []
    );
    expect(c.topologyRoot("a", "t1")).not.toBe(c.topologyRoot("b", "t1"));
  });

  test("端子落在母线体内 → 与母线同类型端子连通，另一端不连", () => {
    const c = buildTopologyConnectivity(
      [
        node("bus", "ac-bus", [terminal("t1", "ac", -0.5, 0), terminal("t2", "ac", 0.5, 0)]),
        node("a", "ac-load", [terminal("t1", "ac", -0.5, 0)], 30)
      ],
      []
    );
    expect(c.topologyRoot("a", "t1")).toBe(c.topologyRoot("bus", "t1"));
    expect(c.topologyRoot("bus", "t2")).not.toBe(c.topologyRoot("bus", "t1"));
  });

  test("★ 线路把两侧收进同一电压岛：topologyRoot 分开但 islandRoot 相同", () => {
    const c = buildTopologyConnectivity(
      [
        node("a", "ac-load", [terminal("t1", "ac", -0.5, 0)]),
        node("line", "ac-line", [terminal("t1", "ac", -0.5, 0), terminal("t2", "ac", 0.5, 0)], 100),
        node("b", "ac-load", [terminal("t1", "ac", -0.5, 0)], 200)
      ],
      [edge("e1", "a", "t1", "line", "t1"), edge("e2", "line", "t2", "b", "t1")]
    );
    expect(c.topologyRoot("a", "t1")).not.toBe(c.topologyRoot("line", "t2"));
    expect(c.islandRoot("a", "t1")).toBe(c.islandRoot("line", "t2"));
    expect(c.islandRoot("a", "t1")).toBe(c.islandRoot("b", "t1"));
  });

  test("★ 分闸开关（closed_status=0）不收缩：两侧分成两个岛", () => {
    const c = buildTopologyConnectivity(
      [
        node("a", "ac-load", [terminal("t1", "ac", -0.5, 0)]),
        node("sw", "ac-switch", [terminal("t1", "ac", -0.5, 0), terminal("t2", "ac", 0.5, 0)], 100, 0, { closed_status: "0" }),
        node("b", "ac-load", [terminal("t1", "ac", -0.5, 0)], 200)
      ],
      [edge("e1", "a", "t1", "sw", "t1"), edge("e2", "sw", "t2", "b", "t1")]
    );
    expect(c.islandRoot("a", "t1")).not.toBe(c.islandRoot("sw", "t2"));
    expect(c.islandRoot("sw", "t1")).toBe(c.islandRoot("a", "t1"));
  });

  test("合闸开关与未写状态参数的开关都收缩（无参数按闭合处理）", () => {
    const build = (params: Record<string, string>) =>
      buildTopologyConnectivity(
        [
          node("a", "ac-load", [terminal("t1", "ac", -0.5, 0)]),
          node("sw", "ac-switch", [terminal("t1", "ac", -0.5, 0), terminal("t2", "ac", 0.5, 0)], 100, 0, params),
          node("b", "ac-load", [terminal("t1", "ac", -0.5, 0)], 200)
        ],
        [edge("e1", "a", "t1", "sw", "t1"), edge("e2", "sw", "t2", "b", "t1")]
      );
    for (const params of [{ closed_status: "1" }, {}] as Record<string, string>[]) {
      const c = build(params);
      expect(c.islandRoot("a", "t1")).toBe(c.islandRoot("sw", "t2"));
    }
  });

  test("★ 岛内只合并同类型的电气端子：ac-line 上挂的 h2 端子自成一座岛", () => {
    const c = buildTopologyConnectivity(
      [node("line", "ac-line", [terminal("t1", "ac", -0.5, 0), terminal("t2", "ac", 0.5, 0), terminal("t3", "h2", 0, -0.5)], 100)],
      []
    );
    expect(c.islandRoot("line", "t1")).toBe(c.islandRoot("line", "t2"));
    expect(c.islandRoot("line", "t3")).not.toBe(c.islandRoot("line", "t1"));
  });

  test("★ 变压器不收缩：两侧仍是两个岛（ACTransformer 不在收缩名单里）", () => {
    const c = buildTopologyConnectivity(
      [
        node("a", "ac-load", [terminal("t1", "ac", -0.5, 0)]),
        node("tr", "ac-transformer", [terminal("t1", "ac", -0.5, 0), terminal("t2", "ac", 0.5, 0)], 100),
        node("b", "ac-load", [terminal("t1", "ac", -0.5, 0)], 200)
      ],
      [edge("e1", "a", "t1", "tr", "t1"), edge("e2", "tr", "t2", "b", "t1")]
    );
    expect(c.islandRoot("a", "t1")).not.toBe(c.islandRoot("tr", "t2"));
  });

  test("★ 可布线线路设备：按端点引用自动补出两条拓扑边，两端设备因此连通", () => {
    const c = buildTopologyConnectivity(
      [
        node("a", "ac-load", [terminal("t1", "ac", -0.5, 0)]),
        node(
          "line",
          "ac-routable-line",
          [terminal("t1", "ac", -0.5, 0), terminal("t2", "ac", 0.5, 0)],
          100,
          0,
          {
            _routableLineSourceNodeId: "a",
            _routableLineSourceTerminalId: "t1",
            _routableLineTargetNodeId: "b",
            _routableLineTargetTerminalId: "t1"
          }
        ),
        node("b", "ac-load", [terminal("t1", "ac", -0.5, 0)], 200)
      ],
      []
    );
    // 没有任何显式边，全靠设备自身参数补出来的两条拓扑边
    expect(c.topologyRoot("a", "t1")).toBe(c.topologyRoot("line", "t1"));
    expect(c.topologyRoot("line", "t2")).toBe(c.topologyRoot("b", "t1"));
    expect(c.topologyRoot("a", "t1")).not.toBe(c.topologyRoot("line", "t2"));
    // ★ 但**不**收缩成同一个岛：inferESection("ac-routable-line") 返回 ""（收缩名单只认
    // ac-line / ac-zero-routable-branch / dc-* 那一串），所以两端仍是两个电压岛。
    expect(c.islandRoot("a", "t1")).not.toBe(c.islandRoot("b", "t1"));
  });

  test("★ 岛收缩只看电气端子：ac-line 第一个端子是非电气类型时，仍按剩下的电气端子合并", () => {
    const c = buildTopologyConnectivity(
      [
        node("a", "ac-load", [terminal("t1", "ac", -0.5, 0)]),
        node(
          "line",
          "ac-line",
          [terminal("t1", "h2", 0, -0.5), terminal("t2", "ac", -0.5, 0), terminal("t3", "ac", 0.5, 0)],
          100
        ),
        node("b", "ac-load", [terminal("t1", "ac", -0.5, 0)], 200)
      ],
      [edge("e1", "a", "t1", "line", "t2"), edge("e2", "line", "t3", "b", "t1")]
    );
    expect(c.islandRoot("a", "t1")).toBe(c.islandRoot("line", "t2"));
    expect(c.islandRoot("line", "t2")).toBe(c.islandRoot("line", "t3"));
    expect(c.islandRoot("line", "t1")).not.toBe(c.islandRoot("line", "t2"));
  });

  test("★ 岛收缩也要求两侧同类型：ac_line 上挂一个 dc 端子时不合并", () => {
    // 现实里线路设备的端子都是同一种类型，这条是为了钉住 `terminal.type === first.type`
    // 那道守卫 —— 去掉它，一个交流线端挂直流端子就会被算进同一电压岛。
    const c = buildTopologyConnectivity(
      [
        node("a", "ac-load", [terminal("t1", "ac", -0.5, 0)]),
        node("line", "ac-line", [terminal("t1", "ac", -0.5, 0), terminal("t2", "dc", 0.5, 0)], 100),
        node("b", "dc-load", [terminal("t1", "dc", -0.5, 0)], 200)
      ],
      [edge("e1", "a", "t1", "line", "t1"), edge("e2", "line", "t2", "b", "t1")]
    );
    expect(c.islandRoot("a", "t1")).not.toBe(c.islandRoot("b", "t1"));
  });

  test("入参不被改（同步母线端子走的是副本）", () => {
    const nodes = [
      node("bus", "ac-bus", [terminal("t1", "ac", -0.5, 0)]),
      node("a", "ac-load", [terminal("t1", "ac", -0.5, 0)], 200)
    ];
    const edges = [edge("e1", "a", "t1", "bus", "t1")];
    const nodesBefore = JSON.stringify(nodes);
    const edgesBefore = JSON.stringify(edges);
    buildTopologyConnectivity(nodes, edges);
    expect(JSON.stringify(nodes)).toBe(nodesBefore);
    expect(JSON.stringify(edges)).toBe(edgesBefore);
  });
});
