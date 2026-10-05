import { beforeEach, describe, expect, test } from "vitest";

import {
  createDefaultNode,
  isRatedCapacityError,
  normalizeDeviceOperatingLimitsAfterTopology,
  type ModelNode,
  type TopologyValidationError
} from "./model";
import {
  decideRatedCapacityFix,
  pendingRatedCapacityFixCount,
  ratedCapacityFixKey,
  resetRatedCapacityFixSession
} from "./topology-capacity-fix";

const SCOPE_A = "scheme-root:model-a";
const SCOPE_B = "scheme-root:model-b";

function normalizeOptions(capacityFixScopeKey?: string) {
  return {
    powerUnit: "MW",
    voltageUnit: "kV",
    currentUnit: "A",
    ...(capacityFixScopeKey ? { capacityFixScopeKey } : {})
  };
}

function runCheck(nodes: ModelNode[], capacityFixScopeKey?: string) {
  return normalizeDeviceOperatingLimitsAfterTopology(nodes, normalizeOptions(capacityFixScopeKey));
}

function ratedCapacityAlerts(warnings: readonly TopologyValidationError[]) {
  return warnings.filter(isRatedCapacityError);
}

/** 负荷类设备一轮检查里会多次查询额定容量（有功/无功上下限各一次），用来验证「本轮决策」被复用。 */
function zeroRatedCapacityLoad() {
  return withRatedCapacity(createDefaultNode("ac-load", { x: 100, y: 100 }), "交流负荷", "10");
}

function zeroRatedCapacityLine(voltage: string) {
  return withRatedCapacity(createDefaultNode("ac-line", { x: 100, y: 100 }), "交流线路", voltage);
}

/** 统一用 snake_case 参数键，避免 camelCase 别名让断言指向另一个键。 */
function withRatedCapacity(node: ModelNode, name: string, voltage: string): ModelNode {
  const { ratedCapacity: _legacy, ...rest } = node.params;
  node.name = name;
  node.params = { ...rest, rated_capacity: "0", rated_voltage: voltage };
  return node;
}

beforeEach(() => {
  resetRatedCapacityFixSession();
});

describe("拓扑检查额定容量两段式处理", () => {
  test("首次检查只报告警，不给 rated_capacity 赋值", () => {
    const load = zeroRatedCapacityLoad();

    const first = runCheck([load], SCOPE_A);

    const alerts = ratedCapacityAlerts(first.warnings);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].type).toBe("device-limit-invalid");
    expect(alerts[0].message).toContain("额定容量 rated_capacity=0 无效");
    expect(alerts[0].message).toContain("首次");
    expect(alerts[0].message).toContain("下次拓扑检查");
    expect(alerts[0].message).toContain("5 MW");
    expect(first.nodes[0]?.params.rated_capacity).toBe("0");
    expect(pendingRatedCapacityFixCount()).toBe(1);
  });

  test("第二次检查按电压等级赋值并消除该告警", () => {
    const load = zeroRatedCapacityLoad();

    runCheck([load], SCOPE_A);
    const second = runCheck([load], SCOPE_A);

    expect(second.nodes[0]?.params.rated_capacity).toBe("5 MW");
    expect(ratedCapacityAlerts(second.warnings)).toEqual([]);
    expect(second.corrections).toContainEqual({
      nodeId: load.id,
      paramKey: "rated_capacity",
      value: "5 MW"
    });
    expect(pendingRatedCapacityFixCount()).toBe(0);
  });

  test("赋值后再次检查（只读模型副本仍为 0）不再重复触发该告警", () => {
    const load = zeroRatedCapacityLoad();

    runCheck([load], SCOPE_A);
    runCheck([load], SCOPE_A);
    // 第三次仍传旧值：模拟全网拓扑每轮都从后端重新加载模型副本。
    const third = runCheck([load], SCOPE_A);

    expect(ratedCapacityAlerts(third.warnings)).toEqual([]);
    expect(third.nodes[0]?.params.rated_capacity).toBe("5 MW");
  });

  test("不同检查范围的检查次数互相独立", () => {
    const load = zeroRatedCapacityLoad();

    runCheck([load], SCOPE_A);

    const otherModel = runCheck([load], SCOPE_B);

    expect(ratedCapacityAlerts(otherModel.warnings)).toHaveLength(1);
    expect(otherModel.nodes[0]?.params.rated_capacity).toBe("0");
    // A 已进入「待赋值」，B 仍是首查。
    expect(pendingRatedCapacityFixCount()).toBe(2);
  });

  test("线路类设备同样走两段式并按线路容量表赋值", () => {
    const line = zeroRatedCapacityLine("110");

    const first = runCheck([line], SCOPE_A);
    expect(ratedCapacityAlerts(first.warnings)).toHaveLength(1);
    expect(first.nodes[0]?.params.rated_capacity).toBe("0");

    const second = runCheck([line], SCOPE_A);
    expect(second.nodes[0]?.params.rated_capacity).toBe("150 MW");
    expect(ratedCapacityAlerts(second.warnings)).toEqual([]);
  });

  test("未指定检查范围时保持原有「首次即自动填充」行为", () => {
    const load = zeroRatedCapacityLoad();

    const result = runCheck([load]);

    expect(result.nodes[0]?.params.rated_capacity).toBe("5 MW");
    // 既有行为：同一轮检查里每个查询点各报一次自动填充告警，这里只确认它没有变成两段式告警。
    expect(
      result.warnings.filter((warning) => warning.type === "device-limit-autofill").length
    ).toBeGreaterThan(0);
    expect(ratedCapacityAlerts(result.warnings)).toEqual([]);
    expect(pendingRatedCapacityFixCount()).toBe(0);
  });

  test("无法按电压等级推出合理值的设备维持原有告警，不进入两段式", () => {
    const converter = createDefaultNode("dcac-converter", { x: 100, y: 100 });
    converter.terminals.find((terminal) => terminal.type === "ac")!.vbase = "10 kV";
    converter.params = { ...converter.params, rated_capacity: "0" };

    const first = runCheck([converter], SCOPE_A);
    const second = runCheck([converter], SCOPE_A);

    for (const result of [first, second]) {
      const alerts = ratedCapacityAlerts(result.warnings);
      expect(alerts).toHaveLength(1);
      expect(alerts[0].message).toContain("未自动修改");
      expect(result.nodes[0]?.params.rated_capacity).toBe("0");
    }
    expect(pendingRatedCapacityFixCount()).toBe(0);
  });

  test("同一轮检查内重复查询额定容量不会把首次检查误判成第二次", () => {
    const load = zeroRatedCapacityLoad();

    // 有功与无功两组上下限都会查询容量；若本轮不复用决策，第二次查询就会提前赋值。
    const first = runCheck([load], SCOPE_A);

    expect(ratedCapacityAlerts(first.warnings)).toHaveLength(1);
    expect(first.nodes[0]?.params.rated_capacity).toBe("0");
    expect(first.corrections.some((correction) => correction.paramKey === "ratedCapacity")).toBe(false);
  });
});

describe("开关类设备额定容量两段式处理", () => {
  /**
   * 开关类设备的 rated_capacity 承载的是额定电流（A）而不是功率：
   * 电压等级容量表里没有它们，因此要走开关类设备自己的默认额定电流。
   */
  function zeroRatedCapacitySwitchingDevice(kind: "ac-breaker" | "dc-breaker") {
    const node = createDefaultNode(kind, { x: 100, y: 100 });
    node.name = kind === "ac-breaker" ? "交流断路器-1" : "直流断路器-1";
    node.params = { ...node.params, rated_capacity: "0" };
    return node;
  }

  test("交流断路器：首次只报告警，第二次按默认额定电流赋值并消除告警", () => {
    const breaker = zeroRatedCapacitySwitchingDevice("ac-breaker");

    const first = runCheck([breaker], SCOPE_A);
    const firstAlerts = ratedCapacityAlerts(first.warnings);
    expect(firstAlerts).toHaveLength(1);
    expect(firstAlerts[0].message).toContain("额定容量 rated_capacity=0 无效");
    expect(firstAlerts[0].message).toContain("首次");
    expect(firstAlerts[0].message).toContain("开关类设备默认额定电流");
    expect(firstAlerts[0].message).toContain("1250 A");
    expect(firstAlerts[0].message).not.toContain("未自动修改");
    expect(first.nodes[0]?.params.rated_capacity).toBe("0");

    const second = runCheck([breaker], SCOPE_A);
    expect(second.nodes[0]?.params.rated_capacity).toBe("1250 A");
    expect(ratedCapacityAlerts(second.warnings)).toEqual([]);
    expect(second.corrections).toContainEqual({
      nodeId: breaker.id,
      paramKey: "rated_capacity",
      value: "1250 A"
    });
  });

  test("赋值后再次检查（只读模型副本仍为 0）不再重复触发该告警", () => {
    const breaker = zeroRatedCapacitySwitchingDevice("ac-breaker");

    runCheck([breaker], SCOPE_A);
    runCheck([breaker], SCOPE_A);
    const third = runCheck([breaker], SCOPE_A);

    expect(ratedCapacityAlerts(third.warnings)).toEqual([]);
    expect(third.nodes[0]?.params.rated_capacity).toBe("1250 A");
  });

  test("直流断路器取直流默认额定电流 1600 A", () => {
    const breaker = zeroRatedCapacitySwitchingDevice("dc-breaker");

    runCheck([breaker], SCOPE_A);
    const second = runCheck([breaker], SCOPE_A);

    expect(second.nodes[0]?.params.rated_capacity).toBe("1600 A");
    expect(ratedCapacityAlerts(second.warnings)).toEqual([]);
  });

  test("最大电流按额定电流直接补值，不做功率/基准电压折算", () => {
    const breaker = zeroRatedCapacitySwitchingDevice("ac-breaker");
    breaker.params = { ...breaker.params, rated_capacity: "1250 A", i_max: "0" };
    // 模拟已接到母线、端子继承了电压基值。
    breaker.terminals.forEach((terminal) => {
      terminal.vbase = "10 kV";
    });

    const result = runCheck([breaker]);

    expect(result.nodes[0]?.params.i_max).toBe("1250");
    expect(result.corrections).toContainEqual({
      nodeId: breaker.id,
      paramKey: "i_max",
      value: "1250"
    });
  });

  test("开关类设备与线路/负荷互不影响：同一轮检查各自按自己的默认值处理", () => {
    const breaker = zeroRatedCapacitySwitchingDevice("ac-breaker");
    const load = zeroRatedCapacityLoad();

    const first = runCheck([breaker, load], SCOPE_A);
    expect(ratedCapacityAlerts(first.warnings)).toHaveLength(2);

    const second = runCheck([breaker, load], SCOPE_A);
    expect(second.nodes[0]?.params.rated_capacity).toBe("1250 A");
    expect(second.nodes[1]?.params.rated_capacity).toBe("5 MW");
    expect(ratedCapacityAlerts(second.warnings)).toEqual([]);
  });

  test("开关类设备的额定电流不会拿去反推功率上下限", () => {
    const breaker = zeroRatedCapacitySwitchingDevice("ac-breaker");
    breaker.params = { ...breaker.params, p_max: "0", p_min: "0" };

    const first = runCheck([breaker], SCOPE_A);
    expect(ratedCapacityAlerts(first.warnings)).toHaveLength(1);

    const second = runCheck([breaker], SCOPE_A);
    expect(second.nodes[0]?.params.rated_capacity).toBe("1250 A");
    expect(second.nodes[0]?.params.p_max).toBe("0");
    expect(second.corrections.map((correction) => correction.paramKey)).toEqual(["rated_capacity"]);
  });
});

describe("额定容量修复会话登记", () => {
  test("按 defer → apply → applied 单向推进，复位后重新计数", () => {
    expect(decideRatedCapacityFix("m1", "n1", "rated_capacity")).toBe("defer");
    expect(decideRatedCapacityFix("m1", "n1", "rated_capacity")).toBe("apply");
    expect(decideRatedCapacityFix("m1", "n1", "rated_capacity")).toBe("applied");
    expect(decideRatedCapacityFix("m1", "n1", "rated_capacity")).toBe("applied");
    expect(pendingRatedCapacityFixCount()).toBe(0);

    resetRatedCapacityFixSession();

    expect(decideRatedCapacityFix("m1", "n1", "rated_capacity")).toBe("defer");
    expect(pendingRatedCapacityFixCount()).toBe(1);
  });

  test("设备与参数键共同区分修复项", () => {
    expect(ratedCapacityFixKey("m1", "n1", "rated_capacity")).not.toBe(
      ratedCapacityFixKey("m1", "n2", "rated_capacity")
    );
    expect(decideRatedCapacityFix("m1", "n1", "rated_capacity")).toBe("defer");
    expect(decideRatedCapacityFix("m1", "n1", "i_rated_capacity")).toBe("defer");
    expect(pendingRatedCapacityFixCount()).toBe(2);
  });
});

describe("修复项标识键的分段编码", () => {
  const NUL = "\u0000";
  const ESC = "\u0001";

  /**
   * 独立按 documented 规则写的解码器（见 src/topology-capacity-fix.ts 的 encodeFixKeySegment）：
   * 从左扫，遇转义符吃掉紧跟的一字符作为数据，遇裸分隔符断段。
   * 写成测试侧自有实现，是为了让「能还原」这条断言不依赖生产代码内部结构。
   */
  function decodeFixKey(key: string): string[] {
    const segments: string[] = [];
    let current = "";
    for (let index = 0; index < key.length; index += 1) {
      const char = key[index];
      if (char === ESC) {
        current += key[index + 1];
        index += 1;
      } else if (char === NUL) {
        segments.push(current);
        current = "";
      } else {
        current += char;
      }
    }
    return [...segments, current];
  }

  test("分段自带分隔符的两组输入不再撞成同一个键", () => {
    const left = ratedCapacityFixKey(`a${NUL}b`, "c", "d");
    const right = ratedCapacityFixKey("a", `b${NUL}c`, "d");

    // 裸拼接修复前两者都等于 a<NUL>b<NUL>c<NUL>d。
    expect(left).toBe(`a${ESC}${NUL}b${NUL}c${NUL}d`);
    expect(right).toBe(`a${NUL}b${ESC}${NUL}c${NUL}d`);
    expect(left).not.toBe(right);
    expect(left).not.toBe(`a${NUL}b${NUL}c${NUL}d`);
    expect(right).not.toBe(`a${NUL}b${NUL}c${NUL}d`);
  });

  test("曾会撞键的两组输入在会话登记里互不干扰", () => {
    // 修复前第二组会命中第一组已登记的键，直接从 defer 跳到 apply。
    expect(decideRatedCapacityFix(`a${NUL}b`, "c", "d")).toBe("defer");
    expect(decideRatedCapacityFix("a", `b${NUL}c`, "d")).toBe("defer");
    expect(pendingRatedCapacityFixCount()).toBe(2);

    expect(decideRatedCapacityFix(`a${NUL}b`, "c", "d")).toBe("apply");
    expect(decideRatedCapacityFix("a", `b${NUL}c`, "d")).toBe("apply");
    expect(pendingRatedCapacityFixCount()).toBe(0);
  });

  test("含空格、分隔符、冒号、转义符与中文字段的键可还原出原三元组", () => {
    const triples: Array<[string, string, string]> = [
      ["方案 A", "节点 1", "rated_capacity"],
      [`a${NUL}b`, `节 点${NUL}1`, `i${NUL}rated_capacity`],
      ["sc:1:2", "n:1", "p:1"],
      ["", NUL, ""],
      [ESC, `${ESC}${NUL}`, `${NUL}${ESC}`]
    ];

    for (const triple of triples) {
      const key = ratedCapacityFixKey(triple[0], triple[1], triple[2]);
      expect(decodeFixKey(key)).toEqual(triple);
    }
  });

  test("空串字段与边界拼接的两组输入互不撞键", () => {
    const keys = [
      ratedCapacityFixKey("", "", ""),
      ratedCapacityFixKey("a", "", ""),
      ratedCapacityFixKey("", "a", ""),
      ratedCapacityFixKey("", "", "a"),
      ratedCapacityFixKey("a", "b", "c"),
      ratedCapacityFixKey("ab", "c", ""),
      ratedCapacityFixKey("a", "bc", ""),
      ratedCapacityFixKey(`a${NUL}b`, "c", ""),
      ratedCapacityFixKey("a", "b", NUL),
      ratedCapacityFixKey("a b", "c", "d"),
      ratedCapacityFixKey("a", "b c", "d")
    ];

    expect(new Set(keys).size).toBe(keys.length);
  });

  test("含控制字符的分段做组合枚举后键两两不同", () => {
    const segments = ["", "a", "a b", `a${NUL}b`, NUL, ESC, "中文"];
    const keys = new Set<string>();
    let total = 0;

    for (const scopeKey of segments) {
      for (const nodeId of segments) {
        for (const paramKey of segments) {
          keys.add(ratedCapacityFixKey(scopeKey, nodeId, paramKey));
          total += 1;
        }
      }
    }

    expect(total).toBe(343);
    expect(keys.size).toBe(total);
  });

  test("同一组输入反复编码得到同一个键（幂等）", () => {
    const triple = [`方案 A${NUL}b`, "节 点", `rated${NUL}_capacity`] as const;
    const first = ratedCapacityFixKey(triple[0], triple[1], triple[2]);

    for (let round = 0; round < 3; round += 1) {
      expect(ratedCapacityFixKey(triple[0], triple[1], triple[2])).toBe(first);
    }
    expect(decodeFixKey(first)).toEqual([triple[0], triple[1], triple[2]]);
  });

  test("纯 ASCII 输入的键与修复前逐字一致", () => {
    // 转义只碰 \u0000 与 \u0001，普通字符原样透传，既有输入的键不变（会话状态不落盘，刷新即重置）。
    expect(ratedCapacityFixKey("m1", "n1", "rated_capacity")).toBe(`m1${NUL}n1${NUL}rated_capacity`);
    expect(
      ratedCapacityFixKey("scheme-root:model-a", "node-1", "idx_ac_load_t1.rated_capacity")
    ).toBe(`scheme-root:model-a${NUL}node-1${NUL}idx_ac_load_t1.rated_capacity`);
  });
});
