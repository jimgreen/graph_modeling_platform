// 电压基值设置的结果合并与就绪判定。
// 就绪判定的形状随模式变化：uniform 只看统一值；terminal 只看当前端子行；
// byDevice 两者都要，且各自只在「确实有这类目标」时才要求非空。
import { describe, expect, test, vi } from "vitest";

import {
  createMergeVoltageBaseSetResults,
  createVoltageBaseSetReady
} from "./appExtracted/appProjectCanvasFactories";

const node = (id: string) => ({ id });

describe("createMergeVoltageBaseSetResults", () => {
  const merge = createMergeVoltageBaseSetResults({});

  const result = (ids: string[], targetIds: string[] = [], changedIds: string[] = []): any => ({
    nodes: ids.map(node),
    nodeUpdates: ids.map(node),
    targetNodeIds: targetIds,
    changedNodeIds: changedIds
  });

  test("节点列表取第二份的", () => {
    expect(merge(result(["n1"]), result(["n2"])).nodes).toEqual([node("n2")]);
  });

  test("节点更新按 id 合并，同 id 后者覆盖", () => {
    const first = { ...result(["n1"]), nodeUpdates: [{ id: "n1", v: 1 }] };
    const second = { ...result(["n1"]), nodeUpdates: [{ id: "n1", v: 2 }] };

    expect(merge(first as any, second as any).nodeUpdates).toEqual([{ id: "n1", v: 2 }]);
  });

  test("不同 id 的更新都保留", () => {
    const first = { ...result([]), nodeUpdates: [{ id: "n1" }] };
    const second = { ...result([]), nodeUpdates: [{ id: "n2" }] };

    expect(merge(first as any, second as any).nodeUpdates).toEqual([{ id: "n1" }, { id: "n2" }]);
  });

  test("目标与变更节点 id 取并集并去重", () => {
    const merged = merge(result([], ["n1", "n2"], ["n1"]), result([], ["n2", "n3"], ["n1", "n3"]));

    expect(merged.targetNodeIds).toEqual(["n1", "n2", "n3"]);
    expect(merged.changedNodeIds).toEqual(["n1", "n3"]);
  });

  test("两份都空时得到空结果", () => {
    const merged = merge(result([]), result([]));

    expect(merged).toEqual({ nodes: [], nodeUpdates: [], targetNodeIds: [], changedNodeIds: [] });
  });
});

describe("createVoltageBaseSetReady", () => {
  const build = (over: Record<string, any>) =>
    createVoltageBaseSetReady({
      activeVoltageBaseTerminalRow: null,
      voltageBaseSetHasTerminalTargets: false,
      voltageBaseSetHasUniformTargets: false,
      voltageBaseSetMode: "uniform",
      voltageBaseSetValue: "",
      ...over
    })();

  test("uniform 模式要求统一值非空", () => {
    expect(build({ voltageBaseSetMode: "uniform", voltageBaseSetValue: "220" })).toBe(true);
    expect(build({ voltageBaseSetMode: "uniform", voltageBaseSetValue: "   " })).toBe(false);
  });

  test("terminal 模式只要求当前端子行非空", () => {
    const row = { nodeId: "n1", terminalId: "t1", value: " 220 " };

    expect(build({ voltageBaseSetMode: "terminal", activeVoltageBaseTerminalRow: row })).toBe(true);
    expect(build({ voltageBaseSetMode: "terminal", activeVoltageBaseTerminalRow: { ...row, value: "" } })).toBe(false);
  });

  test("terminal 模式忽略统一值", () => {
    expect(build({ voltageBaseSetMode: "terminal", voltageBaseSetValue: "220" })).toBe(false);
  });

  test("byDevice：只有统一目标时只要求统一值", () => {
    const row = { nodeId: "n1", terminalId: "t1", value: "" };

    expect(build({ voltageBaseSetMode: "byDevice", voltageBaseSetHasUniformTargets: true, voltageBaseSetValue: "220" })).toBe(true);
    expect(build({ voltageBaseSetMode: "byDevice", voltageBaseSetHasUniformTargets: true, voltageBaseSetValue: "" })).toBe(false);
    expect(row.value).toBe("");
  });

  test("byDevice：只有端子目标时只要求当前行", () => {
    const row = { nodeId: "n1", terminalId: "t1", value: "220" };

    expect(build({ voltageBaseSetMode: "byDevice", voltageBaseSetHasTerminalTargets: true, activeVoltageBaseTerminalRow: row })).toBe(true);
    expect(build({ voltageBaseSetMode: "byDevice", voltageBaseSetHasTerminalTargets: true, activeVoltageBaseTerminalRow: null })).toBe(false);
  });

  test("byDevice：两类目标都有时两者都要", () => {
    const row = { nodeId: "n1", terminalId: "t1", value: "220" };
    const base = { voltageBaseSetMode: "byDevice", voltageBaseSetHasUniformTargets: true, voltageBaseSetHasTerminalTargets: true, voltageBaseSetValue: "220" };

    expect(build({ ...base, activeVoltageBaseTerminalRow: row })).toBe(true);
    expect(build({ ...base, activeVoltageBaseTerminalRow: null })).toBe(false);
    expect(build({ ...base, activeVoltageBaseTerminalRow: row, voltageBaseSetValue: "" })).toBe(false);
  });

  test("byDevice：两类目标都没有时恒为就绪", () => {
    expect(build({ voltageBaseSetMode: "byDevice" })).toBe(true);
  });
});
