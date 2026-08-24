import { describe, expect, test } from "vitest";
import { getRatedCapacityDefaultForKind, LINE_DEVICE_KINDS, LOAD_DEVICE_KINDS, VOLTAGE_LINE_RATED_CAPACITY, VOLTAGE_LOAD_RATED_CAPACITY } from "./model";
import { setVoltageBaseValuesForScope } from "./model-routing";
import type { ModelNode } from "./model";

describe("电压等级 → 额定容量默认值映射", () => {
  test("线路种类集合包含 ac/dc line 变体", () => {
    expect(LINE_DEVICE_KINDS.has("ac-line")).toBe(true);
    expect(LINE_DEVICE_KINDS.has("dc-routable-line")).toBe(true);
    expect(LINE_DEVICE_KINDS.has("ac-zero-branch")).toBe(true);
  });

  test("负荷种类集合包含 ac/dc load 变体", () => {
    expect(LOAD_DEVICE_KINDS.has("ac-load")).toBe(true);
    expect(LOAD_DEVICE_KINDS.has("dc-station-load")).toBe(true);
  });

  test("线路电压等级映射正确", () => {
    expect(VOLTAGE_LINE_RATED_CAPACITY["0.4"]).toBe("200 kW");
    expect(VOLTAGE_LINE_RATED_CAPACITY["10"]).toBe("10 MW");
    expect(VOLTAGE_LINE_RATED_CAPACITY["110"]).toBe("150 MW");
    expect(VOLTAGE_LINE_RATED_CAPACITY["500"]).toBe("1500 MW");
  });

  test("负荷电压等级映射正确", () => {
    expect(VOLTAGE_LOAD_RATED_CAPACITY["0.4"]).toBe("100 kW");
    expect(VOLTAGE_LOAD_RATED_CAPACITY["10"]).toBe("5 MW");
    expect(VOLTAGE_LOAD_RATED_CAPACITY["110"]).toBe("100 MW");
    expect(VOLTAGE_LOAD_RATED_CAPACITY["500"]).toBe("1000 MW");
  });

  test("getRatedCapacityDefaultForKind 返回正确值", () => {
    expect(getRatedCapacityDefaultForKind("ac-line", "10")).toBe("10 MW");
    expect(getRatedCapacityDefaultForKind("ac-load", "10")).toBe("5 MW");
    expect(getRatedCapacityDefaultForKind("ac-source", "10")).toBeNull();
    expect(getRatedCapacityDefaultForKind("ac-line", "999")).toBeNull();
  });
});

describe("setVoltageBaseValuesForScope 更新额定容量", () => {
  const makeNode = (id: string, kind: string, params: Record<string, string> = {}): ModelNode => ({
    id,
    kind,
    name: kind,
    x: 0,
    y: 0,
    width: 100,
    height: 50,
    params,
    terminals: [],
    layer: "default",
    locked: false,
    visible: true
  });

  test("设置 10kV 后线路额定容量变为 10 MW", () => {
    const line = makeNode("line1", "ac-line", { ratedCapacity: "0", rated_voltage: "10" });
    const result = setVoltageBaseValuesForScope([line], [], ["line1"], "selected", "10");
    const updated = result.nodeUpdates.find((n) => n.id === "line1");
    expect(updated?.params.ratedCapacity).toBe("10 MW");
  });

  test("设置 110kV 后负荷额定容量变为 100 MW", () => {
    const load = makeNode("load1", "ac-load", { ratedCapacity: "5 MW", rated_voltage: "110" });
    const result = setVoltageBaseValuesForScope([load], [], ["load1"], "selected", "110");
    const updated = result.nodeUpdates.find((n) => n.id === "load1");
    expect(updated?.params.ratedCapacity).toBe("100 MW");
  });

  test("非线路/负荷设备不更新额定容量", () => {
    const source = makeNode("src1", "ac-source", { ratedCapacity: "50 MW" });
    const result = setVoltageBaseValuesForScope([source], [], ["src1"], "selected", "110");
    const updated = result.nodes.find((n) => n.id === "src1");
    expect(updated?.params.ratedCapacity).toBe("50 MW");
  });

  test("未知电压等级不更新额定容量", () => {
    const line = makeNode("line1", "ac-line", { ratedCapacity: "0" });
    const result = setVoltageBaseValuesForScope([line], [], ["line1"], "selected", "999");
    const updated = result.nodes.find((n) => n.id === "line1");
    expect(updated?.params.ratedCapacity).toBe("0");
  });
});
