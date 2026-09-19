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
