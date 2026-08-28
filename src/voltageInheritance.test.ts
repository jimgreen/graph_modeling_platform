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
});
