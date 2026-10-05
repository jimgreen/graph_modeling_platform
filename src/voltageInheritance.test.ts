import { describe, it, expect } from "vitest";
import {
  resolveNodeVoltageAtTerminal,
  isNodeVoltageDefault,
  applyVoltageInheritance,
} from "./voltageInheritance";
import type { ModelNode, Terminal, TerminalType } from "./model";
import { getRatedCapacityDefaultForKind } from "./model";

// ─── 测试辅助 ─────────────────────────────────────────────

function makeTerminal(
  id: string,
  type: TerminalType = "ac",
  vbase?: string
): Terminal {
  return {
    id,
    label: id,
    type,
    anchor: { x: 0, y: 0 },
    nodeNumber: "",
    vbase,
  };
}

function makeNode(
  kind: string,
  terminals: Terminal[],
  params: Record<string, string> = {}
): ModelNode {
  return {
    id: "n1",
    kind: kind as ModelNode["kind"],
    name: kind,
    nodeNumber: "",
    acTopologyNode: 0,
    dcTopologyNode: 0,
    position: { x: 0, y: 0 },
    size: { width: 100, height: 50 },
    rotation: 0,
    scale: 1,
    terminals,
    params,
  };
}

// ─── resolveNodeVoltageAtTerminal ─────────────────────────

describe("voltageInheritance", () => {
  describe("resolveNodeVoltageAtTerminal", () => {
    // ── 正常场景 AC-01~AC-05 ─────────────────────────────

    it("AC-01: 单端子设备，电压从端子 vbase 继承", () => {
      const node = makeNode(
        "ac-source",
        [makeTerminal("t0", "ac", "110")]
      );
      expect(resolveNodeVoltageAtTerminal(node, "t0")).toBe("110");
    });

    it("AC-02: 双端子设备，端子 0 电压从 i_vbase 继承", () => {
      const node = makeNode(
        "ac-line",
        [makeTerminal("t0"), makeTerminal("t1")],
        { i_vbase: "10" }
      );
      expect(resolveNodeVoltageAtTerminal(node, "t0")).toBe("10");
    });

    it("AC-03: 双端子设备，端子 1 电压从 j_vbase 继承", () => {
      const node = makeNode(
        "ac-line",
        [makeTerminal("t0"), makeTerminal("t1")],
        { j_vbase: "35" }
      );
      expect(resolveNodeVoltageAtTerminal(node, "t1")).toBe("35");
    });

    it("AC-04: 三绕组变压器，端子 0→i_vbase, 1→k_vbase, 2→j_vbase", () => {
      const node = makeNode(
        "ac-three-winding-transformer",
        [
          makeTerminal("t0"),
          makeTerminal("t1"),
          makeTerminal("t2"),
        ],
        { i_vbase: "110", k_vbase: "35", j_vbase: "10" }
      );
      expect(resolveNodeVoltageAtTerminal(node, "t0")).toBe("110");
      expect(resolveNodeVoltageAtTerminal(node, "t1")).toBe("35");
      expect(resolveNodeVoltageAtTerminal(node, "t2")).toBe("10");
    });

    it("AC-05: 通用设备无端子指定时，从 params.vbase 继承", () => {
      const node = makeNode(
        "ac-ground",
        [makeTerminal("t0")],
        { vbase: "10" }
      );
      // 端子无 vbase、非三绕组、非双端子特定侧 → 回落到通用 vbase
      expect(resolveNodeVoltageAtTerminal(node, "t0")).toBe("10");
    });

    // ── 边界场景 B-01~B-06 ──────────────────────────────

    it("B-01: 电压为 '0' 时不继承，返回空字符串", () => {
      const node = makeNode(
        "ac-line",
        [makeTerminal("t0"), makeTerminal("t1")],
        { i_vbase: "0" }
      );
      expect(resolveNodeVoltageAtTerminal(node, "t0")).toBe("");
    });

    it("B-02: 电压为空字符串时不继承，返回空字符串", () => {
      const node = makeNode(
        "ac-line",
        [makeTerminal("t0"), makeTerminal("t1")],
        { i_vbase: "" }
      );
      expect(resolveNodeVoltageAtTerminal(node, "t0")).toBe("");
    });

    it("B-03: 非电气设备（氢能/热力）返回空字符串", () => {
      const h2Node = makeNode(
        "h2-electrolyzer",
        [makeTerminal("t0", "h2")],
        { vbase: "110" }
      );
      expect(resolveNodeVoltageAtTerminal(h2Node, "t0")).toBe("");

      const heatNode = makeNode(
        "heat-boiler",
        [makeTerminal("t0", "heat")],
        { vbase: "110" }
      );
      expect(resolveNodeVoltageAtTerminal(heatNode, "t0")).toBe("");
    });

    it("B-04: 端子 ID 不存在且无通用 vbase 时返回空字符串", () => {
      const node = makeNode(
        "ac-line",
        [makeTerminal("t0"), makeTerminal("t1")],
        { i_vbase: "110" }
      );
      expect(resolveNodeVoltageAtTerminal(node, "nonexistent")).toBe("");
    });

    it("B-04b: 端子 ID 不存在但有通用 vbase 时回退到 params.vbase", () => {
      const busNode = makeNode(
        "ac-bus",
        [makeTerminal("t0")],
        { vbase: "750" }
      );
      // 连接到一个不存在的端子 ID（如总线端子 ID 与 edge 记录不一致时）
      expect(resolveNodeVoltageAtTerminal(busNode, "nonexistent")).toBe("750");
    });

    it("B-05: 端子类型为非电气（h2/heat）时返回空字符串", () => {
      const node = makeNode(
        "custom-device",
        [
          makeTerminal("h2t", "h2", "110"),
          makeTerminal("ht", "heat", "110"),
        ],
        {}
      );
      expect(resolveNodeVoltageAtTerminal(node, "h2t")).toBe("");
      expect(resolveNodeVoltageAtTerminal(node, "ht")).toBe("");
    });

    it("B-06: 优先级：端子 vbase > 侧电压 > 通用 vbase", () => {
      // 端子 vbase 优先
      const nodeA = makeNode(
        "ac-line",
        [makeTerminal("t0", "ac", "220"), makeTerminal("t1")],
        { i_vbase: "110", vbase: "35" }
      );
      expect(resolveNodeVoltageAtTerminal(nodeA, "t0")).toBe("220");

      // 端子无 vbase → 侧电压 i_vbase 优先于通用 vbase
      const nodeB = makeNode(
        "ac-line",
        [makeTerminal("t0"), makeTerminal("t1")],
        { i_vbase: "110", vbase: "35" }
      );
      expect(resolveNodeVoltageAtTerminal(nodeB, "t0")).toBe("110");

      // 侧电压也无 → 通用 vbase
      const nodeC = makeNode(
        "ac-ground",
        [makeTerminal("t0")],
        { vbase: "35" }
      );
      expect(resolveNodeVoltageAtTerminal(nodeC, "t0")).toBe("35");
    });
  });

  // ─── isNodeVoltageDefault ─────────────────────────────

  describe("isNodeVoltageDefault", () => {
    it("电压为 '0' 时返回 true", () => {
      const node = makeNode(
        "ac-line",
        [makeTerminal("t0"), makeTerminal("t1")],
        { i_vbase: "0" }
      );
      expect(isNodeVoltageDefault(node, "t0")).toBe(true);
    });

    it("电压为空时返回 true", () => {
      const node = makeNode(
        "ac-line",
        [makeTerminal("t0"), makeTerminal("t1")],
        {}
      );
      expect(isNodeVoltageDefault(node, "t0")).toBe(true);
    });

    it("有非零电压时返回 false", () => {
      const node = makeNode(
        "ac-line",
        [makeTerminal("t0"), makeTerminal("t1")],
        { i_vbase: "110" }
      );
      expect(isNodeVoltageDefault(node, "t0")).toBe(false);
    });
  });

  // ─── applyVoltageInheritance ──────────────────────────

  describe("applyVoltageInheritance", () => {
    it("rated_voltage 是 '0.0' 这类零值写法时照样被继承电压覆盖", () => {
      // 旧口径用 `normalized === "0"` 字符串相等，而 normalizeVoltageBaseInput 只剥非数字
      // 字符，"0.0" 原样留下 → 被当成「用户自定义过」而不覆盖。
      const node = makeNode(
        "ac-ground",
        [makeTerminal("t0")],
        { rated_voltage: "0.0" }
      );
      const result = applyVoltageInheritance(node, "110");
      expect(result.rated_voltage).toBe("110");
    });

    it("无端子指定时设置通用 vbase", () => {
      const node = makeNode("ac-ground", [makeTerminal("t0")], {});
      const result = applyVoltageInheritance(node, "110");
      expect(result.vbase).toBe("110");
    });

    it("双端子 uniform 设备写入 vbase", () => {
      const node = makeNode(
        "ac-line",
        [makeTerminal("t0"), makeTerminal("t1")],
        {}
      );
      const result = applyVoltageInheritance(node, "110", "t0");
      expect(result.vbase).toBe("110");
      expect(result.i_vbase).toBeUndefined();
      expect(result.j_vbase).toBeUndefined();
    });

    it("双端子 terminal 设备，端子 0 写入 i_vbase", () => {
      const node = makeNode(
        "ac-two-winding-transformer",
        [makeTerminal("t0"), makeTerminal("t1")],
        {}
      );
      const result = applyVoltageInheritance(node, "110", "t0");
      expect(result.i_vbase).toBe("110");
    });

    it("双端子 terminal 设备，端子 1 写入 j_vbase", () => {
      const node = makeNode(
        "ac-two-winding-transformer",
        [makeTerminal("t0"), makeTerminal("t1")],
        {}
      );
      const result = applyVoltageInheritance(node, "35", "t1");
      expect(result.j_vbase).toBe("35");
    });

    it("三绕组变压器：端子 0→i_vbase, 1→k_vbase, 2→j_vbase", () => {
      const node = makeNode(
        "ac-three-winding-transformer",
        [
          makeTerminal("t0"),
          makeTerminal("t1"),
          makeTerminal("t2"),
        ],
        {}
      );
      const r0 = applyVoltageInheritance(node, "110", "t0");
      expect(r0.i_vbase).toBe("110");

      const r1 = applyVoltageInheritance(node, "35", "t1");
      expect(r1.k_vbase).toBe("35");

      const r2 = applyVoltageInheritance(node, "10", "t2");
      expect(r2.j_vbase).toBe("10");
    });

    it("不修改原节点 params（返回新对象）", () => {
      const node = makeNode(
        "ac-line",
        [makeTerminal("t0"), makeTerminal("t1")],
        { i_vbase: "0" }
      );
      const original = { ...node.params };
      applyVoltageInheritance(node, "110", "t0");
      expect(node.params.i_vbase).toBe(original.i_vbase);
    });

    it("端子 ID 不存在时写入通用 vbase", () => {
      const node = makeNode(
        "ac-line",
        [makeTerminal("t0"), makeTerminal("t1")],
        {}
      );
      const result = applyVoltageInheritance(node, "110", "nonexistent");
      expect(result.vbase).toBe("110");
    });

    // ── 三绕组变压器多端子场景 ─────────────────────────

    it("三绕组变压器多端子场景：110kV/35kV/10kV", () => {
      const node = makeNode(
        "ac-three-winding-transformer",
        [
          makeTerminal("t0"),
          makeTerminal("t1"),
          makeTerminal("t2"),
        ],
        {}
      );

      const p0 = applyVoltageInheritance(node, "110", "t0");
      const p1 = applyVoltageInheritance(
        { ...node, params: p0 },
        "35",
        "t1"
      );
      const p2 = applyVoltageInheritance(
        { ...node, params: p1 },
        "10",
        "t2"
      );

      expect(p2.i_vbase).toBe("110");
      expect(p2.k_vbase).toBe("35");
      expect(p2.j_vbase).toBe("10");
    });

    // ── 线路设备额定容量继承 ───────────────────────────

    it("线路设备继承电压后，getRatedCapacityDefaultForKind 正确设置 ratedCapacity", () => {
      const node = makeNode(
        "ac-line",
        [makeTerminal("t0"), makeTerminal("t1")],
        { ratedCapacity: "0" }
      );
      const result = applyVoltageInheritance(node, "10", "t0");
      expect(result.vbase).toBe("10");

      const ratedCapacity = getRatedCapacityDefaultForKind("ac-line", result.vbase);
      expect(ratedCapacity).toBe("10 MW");
    });

    it("110kV 线路额定容量为 150 MW", () => {
      const capacity = getRatedCapacityDefaultForKind("ac-line", "110");
      expect(capacity).toBe("150 MW");
    });

    it("非线路/负荷设备，getRatedCapacityDefaultForKind 返回 null", () => {
      const capacity = getRatedCapacityDefaultForKind("ac-source", "110");
      expect(capacity).toBeNull();
    });
  });

  // ─── 索引越界 / 空值 / 数值边界分支 ────────────────────
  //
  // 本组用例针对三条互不相同、极易混淆的「写入通用 vbase」路径。
  // 它们**只有靠 rated_voltage 的行为才能区分**：
  //
  //   · terminalId 缺省（L193 的 !terminalId 块）
  //   · terminalId 找不到（L203 的 terminalIndex < 0 块）
  //   · 索引超出侧电压映射表（L218 三绕组 else / L230 双端子 else）
  //
  // 前两者会连带把「零值默认的 rated_voltage」一起改写，后两者**只**写 vbase。
  // 少了 rated_voltage 断言，protect 这两个 else 的门控就会被「兄弟分支完全遮蔽」：
  // 因为 L193 与 L203 的语句体逐字符相同，而任何 terminalId 缺省/找不到的输入
  // 翻转门控后都会落进另一个体等同的块里，产出完全一致的输出。

  describe("端子索引越界与空值边界", () => {
    // ── resolveSideVoltage：sideValues / 双端子索引表越界 ──

    it("三绕组变压器第 4 个端子（中性点）无侧电压，回落到通用 vbase", () => {
      // sideValues 只有 3 项，terminalIndex=3 命中 `?? []` 右臂 → 返回 ""，
      // 于是 resolveNodeVoltageAtTerminal 继续走到通用 vbase。
      // 若把 `?? []` 换成 `?? sideValues[0]`，这里会变成 i_vbase 的值。
      const node = makeNode(
        "ac-three-winding-transformer-neutral",
        [
          makeTerminal("t0"),
          makeTerminal("t1"),
          makeTerminal("t2"),
          makeTerminal("tn"),
        ],
        { i_vbase: "110", k_vbase: "35", j_vbase: "10", vbase: "162" }
      );
      expect(resolveNodeVoltageAtTerminal(node, "tn")).toBe("162");
      // 对照：索引 0..2 各自取到自己的侧电压，说明第 4 个端子不是「取不到节点参数」
      expect(resolveNodeVoltageAtTerminal(node, "t0")).toBe("110");
      expect(resolveNodeVoltageAtTerminal(node, "t1")).toBe("35");
      expect(resolveNodeVoltageAtTerminal(node, "t2")).toBe("10");
    });

    it("非三绕组设备第 3 个端子无对应侧电压，有通用 vbase 时回落到它、无则为空串", () => {
      // 双端子设备表只覆盖 index 0/1，第 3 个端子命中 `return ""`。
      const withCommon = makeNode(
        "ac-two-winding-transformer",
        [makeTerminal("t0"), makeTerminal("t1"), makeTerminal("t2")],
        { i_vbase: "63", j_vbase: "27", low_vbase: "17", vbase: "162" }
      );
      expect(resolveNodeVoltageAtTerminal(withCommon, "t2")).toBe("162");

      // 对照：同一条索引越界路径在没有任何可用电压时产出空串（而非 undefined）。
      const bare = makeNode(
        "ac-two-winding-transformer",
        [makeTerminal("t0"), makeTerminal("t1"), makeTerminal("t2")],
        {}
      );
      expect(resolveNodeVoltageAtTerminal(bare, "t2")).toBe("");
      expect(isNodeVoltageDefault(bare, "t2")).toBe(true);
    });

    // ── applyVoltageInheritance：sourceVoltage 的 falsy 边界 ──

    it("sourceVoltage 归一化后为空串时用默认初始电压 '0'，非空则原样透传", () => {
      const node = makeNode("ac-line", [makeTerminal("t0")], {});

      // falsy 只有 "" 一种：terminalVoltageBaseNumber 恒返回字符串，
      // 而 "0" 是**非空字符串**（truthy），所以它走的是左臂、不是 || 的右臂。
      // 变异实测（勿改成 ??）：把 `|| DEFAULT` 换成 `?? DEFAULT` 会红 ——
      // 因为 "" 是 falsy 但**非 nullish**，`??` 不短路，`expected '' to be '0'`。
      // 也就是说 "0" 这条输入恰恰证明了 || 与 ?? 的区别承重。
      expect(applyVoltageInheritance(node, "").vbase).toBe("0");
      expect(applyVoltageInheritance(node, "kV").vbase).toBe("0");
      expect(applyVoltageInheritance(node, "0").vbase).toBe("0");

      // 对照：能归一出数字的输入不会被默认值吞掉。
      expect(applyVoltageInheritance(node, "37.5").vbase).toBe("37.5");
      expect(applyVoltageInheritance(node, "162 kV").vbase).toBe("162");
    });

    // ── applyVoltageInheritance：三条「写 vbase」路径的可区分性 ──

    it("terminalId 缺省时写通用 vbase，即使存在 id 为空串的端子也不落到侧电压", () => {
      // terminalId 为 "" 会被 `!terminalId` 判为缺省；
      // 而它同时又是 terminals 里第一个端子的真实 id ——
      // 门控一旦翻转（`!terminalId` → `terminalId`），findIndex 就会命中 0
      // 并把电压写进 i_vbase，产出 `expected undefined to be '27.5'`。
      // 这条空串 id 的夹具是**唯一**能看见该门控的输入：换成普通 id 的节点，
      // 翻转后只是从 L193 体等同的 L203 块里出来，输出完全一致 → 恒绿。
      const node = makeNode(
        "ac-two-winding-transformer",
        [makeTerminal(""), makeTerminal("t1")],
        { rated_voltage: "0.0" }
      );
      const result = applyVoltageInheritance(node, "27.5", "");
      expect(result.vbase).toBe("27.5");
      expect(result.i_vbase).toBeUndefined();
      expect(result.j_vbase).toBeUndefined();
      // 该块会连带改写零值默认的 rated_voltage
      expect(result.rated_voltage).toBe("27.5");
    });

    it("terminalId 查不到时写通用 vbase，并改写零值默认的 rated_voltage", () => {
      const node = makeNode(
        "ac-two-winding-transformer",
        [makeTerminal("t0"), makeTerminal("t1")],
        { rated_voltage: "0.0" }
      );
      const result = applyVoltageInheritance(node, "27.5", "no-such-terminal");
      expect(result.vbase).toBe("27.5");
      expect(result.i_vbase).toBeUndefined();
      expect(result.j_vbase).toBeUndefined();
      expect(result.rated_voltage).toBe("27.5");
    });

    it("三绕组变压器第 4 个端子写入通用 vbase，且不动 rated_voltage", () => {
      // paramKeys 只有 i/k/j 三项，terminalIndex=3 时 key 为 undefined → else。
      // 这条 else **只**写 vbase，不改 rated_voltage —— 与上面两条构成对照。
      const node = makeNode(
        "ac-three-winding-transformer-neutral",
        [
          makeTerminal("t0"),
          makeTerminal("t1"),
          makeTerminal("t2"),
          makeTerminal("tn"),
        ],
        { rated_voltage: "0.0" }
      );
      const result = applyVoltageInheritance(node, "162", "tn");
      expect(result.vbase).toBe("162");
      expect(result.rated_voltage).toBe("0.0");
      expect(result.i_vbase).toBeUndefined();
      expect(result.k_vbase).toBeUndefined();
      expect(result.j_vbase).toBeUndefined();
    });

    it("双端子设备第 3 个端子写入通用 vbase，且不动 rated_voltage", () => {
      // terminalIndex=2 既不是 0 也不是 1 → else 写 vbase，同样不改 rated_voltage。
      const node = makeNode(
        "ac-two-winding-transformer",
        [makeTerminal("t0"), makeTerminal("t1"), makeTerminal("t2")],
        { rated_voltage: "0.0" }
      );
      const result = applyVoltageInheritance(node, "27.5", "t2");
      expect(result.vbase).toBe("27.5");
      expect(result.rated_voltage).toBe("0.0");
      expect(result.i_vbase).toBeUndefined();
      expect(result.j_vbase).toBeUndefined();
    });

    // ── 三条路径的横向对照：证明它们确实不是同一条 ──

    it("索引越界与查不到端子：vbase 相同但 rated_voltage 行为不同", () => {
      // 若缺少这条对照，上面四条用例里 L193 / L203 的门控任一被翻转，
      // 都会落进体等同的兄弟块而**看不出差别**。这里用同一次调用的两份结果
      // 明确区分「会改 rated_voltage」与「不会改 rated_voltage」两类。
      const node = makeNode(
        "ac-two-winding-transformer",
        [makeTerminal("t0"), makeTerminal("t1"), makeTerminal("t2")],
        { rated_voltage: "0.0" }
      );
      const viaMissing = applyVoltageInheritance(node, "27.5");
      const viaOutOfRange = applyVoltageInheritance(node, "27.5", "t2");

      expect(viaMissing.vbase).toBe("27.5");
      expect(viaOutOfRange.vbase).toBe("27.5");
      // 唯一的区别：前者走了会改 rated_voltage 的块，后者没有
      expect(viaMissing.rated_voltage).toBe("27.5");
      expect(viaOutOfRange.rated_voltage).toBe("0.0");
    });
  });
});
