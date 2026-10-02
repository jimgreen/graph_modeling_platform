// 电压基值的端子级取值：默认值批量生成、当前行取值、写回。
// 三级回退：端子 vbase → 侧 vbase（三绕组按 i/k/j，两绕组按 i/j）→ 通用 vbase → 全局兜底。
// 三绕组的侧序是 i/k/j 而不是 i/j/k —— 顺序写错会把电压填到错的侧上。
import { describe, expect, test, vi } from "vitest";

import {
  createActiveVoltageBaseTerminalValues,
  createDefaultVoltageBaseTerminalKey,
  createDefaultVoltageBaseTerminalValues,
  createSetVoltageBaseTerminalValue
} from "./appExtracted/appProjectCanvasFactories";

const normalize = (v: any) => (v === undefined || v === null || v === "" ? "" : String(v));

function createScope(candidateNodes: any[], over: Record<string, any> = {}) {
  return {
    voltageBaseSetCandidateNodes: candidateNodes,
    voltageBaseSettingModeForNode: vi.fn(() => "terminal"),
    normalizeVoltageBaseInput: vi.fn(normalize),
    isThreeWindingTransformer: vi.fn(() => false),
    defaultVoltageBaseSetValue: vi.fn(() => "110"),
    ...over
  };
}

const twoWinding = { id: "n1", terminals: [{ id: "t1" }, { id: "t2" }], params: {} };
const threeWinding = { id: "n2", terminals: [{ id: "t1" }, { id: "t2" }, { id: "t3" }], params: {} };

describe("createDefaultVoltageBaseTerminalValues", () => {
  test("两绕组按 i_vbase / j_vbase 依次取值", () => {
    const scope = createScope([twoWinding], {});
    (twoWinding.params as any).i_vbase = 35;
    (twoWinding.params as any).j_vbase = 10;

    expect(createDefaultVoltageBaseTerminalValues(scope)()).toEqual({ n1: { t1: "35", t2: "10" } });
  });

  test("三绕组按 i_vbase / k_vbase / j_vbase 取值（注意 k 在前）", () => {
    const scope = createScope([threeWinding], { isThreeWindingTransformer: vi.fn(() => true) });
    const params = { i_vbase: 35, k_vbase: 10.5, j_vbase: 110 } as any;
    const node = { ...threeWinding, params };

    expect(createDefaultVoltageBaseTerminalValues(createScope([node], { isThreeWindingTransformer: vi.fn(() => true) }))()).toEqual({
      n2: { t1: "35", t2: "10.5", t3: "110" }
    });
  });

  test("端子自身 vbase 优先于侧 vbase", () => {
    const node = { id: "n1", terminals: [{ id: "t1", vbase: 220 }, { id: "t2" }], params: { i_vbase: 35, j_vbase: 35 } };

    expect(createDefaultVoltageBaseTerminalValues(createScope([node]))()).toEqual({ n1: { t1: "220", t2: "35" } });
  });

  test("侧 vbase 缺失时回退到通用 vbase", () => {
    const node = { id: "n1", terminals: [{ id: "t1" }, { id: "t2" }], params: { vbase: 110 } };

    expect(createDefaultVoltageBaseTerminalValues(createScope([node]))()).toEqual({ n1: { t1: "110", t2: "110" } });
  });

  test("全都没有时用全局兜底值", () => {
    const node = { id: "n1", terminals: [{ id: "t1" }, { id: "t2" }], params: {} };

    expect(createDefaultVoltageBaseTerminalValues(createScope([node]))()).toEqual({ n1: { t1: "110", t2: "110" } });
  });

  test("值为 0 的侧 vbase 被跳过并落到全局兜底", () => {
    const node = { id: "n1", terminals: [{ id: "t1" }, { id: "t2" }], params: { i_vbase: 0, j_vbase: 10 } };

    // t1：i_vbase = 0 → 跳过；无通用 vbase → 兜底 110
    // t2：j_vbase = 10 → 用 10
    expect(createDefaultVoltageBaseTerminalValues(createScope([node]))()).toEqual({ n1: { t1: "110", t2: "10" } });
  });

  test("单端子节点被跳过（无从分侧）", () => {
    const node = { id: "n1", terminals: [{ id: "t1" }], params: { i_vbase: 35 } };

    expect(createDefaultVoltageBaseTerminalValues(createScope([node]))()).toEqual({});
  });

  test("设置模式不是 terminal 的节点被跳过", () => {
    const node = { id: "n1", terminals: [{ id: "t1" }, { id: "t2" }], params: {} };
    const scope = createScope([node], { voltageBaseSettingModeForNode: vi.fn(() => "uniform") });

    expect(createDefaultVoltageBaseTerminalValues(scope)()).toEqual({});
  });

  test("没有候选节点时返回空对象", () => {
    expect(createDefaultVoltageBaseTerminalValues(createScope([]))()).toEqual({});
  });
});

describe("createDefaultVoltageBaseTerminalKey", () => {
  test("取第一个可分侧节点的第一个端子", () => {
    expect(createDefaultVoltageBaseTerminalKey(createScope([twoWinding]))()).toBe("n1:t1");
  });

  test("跳过不满足条件的节点", () => {
    const scope = createScope([{ id: "n0", terminals: [{ id: "t1" }], params: {} }, twoWinding]);

    expect(createDefaultVoltageBaseTerminalKey(scope)()).toBe("n1:t1");
  });

  test("没有可用节点时返回空串", () => {
    expect(createDefaultVoltageBaseTerminalKey(createScope([]))()).toBe("");
  });
});

describe("createActiveVoltageBaseTerminalValues", () => {
  test("有当前行且值非空时返回单条记录", () => {
    const scope = { activeVoltageBaseTerminalRow: { nodeId: "n1", terminalId: "t1", value: " 220 " } };

    expect(createActiveVoltageBaseTerminalValues(scope)()).toEqual({ n1: { t1: "220" } });
  });

  test("值为空白时返回空对象", () => {
    const scope = { activeVoltageBaseTerminalRow: { nodeId: "n1", terminalId: "t1", value: "   " } };

    expect(createActiveVoltageBaseTerminalValues(scope)()).toEqual({});
  });

  test("没有当前行时返回空对象", () => {
    expect(createActiveVoltageBaseTerminalValues({ activeVoltageBaseTerminalRow: null })()).toEqual({});
  });
});

describe("createSetVoltageBaseTerminalValue", () => {
  test("按节点 → 端子两级合并写入", () => {
    const setVoltageBaseTerminalValues = vi.fn();
    const set = createSetVoltageBaseTerminalValue({ setVoltageBaseTerminalValues });

    set("n1", "t1", "220");

    expect(setVoltageBaseTerminalValues.mock.calls[0][0]({ n1: { t0: 0 } })).toEqual({ n1: { t0: 0, t1: "220" } });
  });

  test("同一端子重复写入时后者覆盖", () => {
    const setVoltageBaseTerminalValues = vi.fn();
    const set = createSetVoltageBaseTerminalValue({ setVoltageBaseTerminalValues });

    set("n1", "t1", "220");

    expect(setVoltageBaseTerminalValues.mock.calls[0][0]({ n1: { t1: 110 } })).toEqual({ n1: { t1: "220" } });
  });

  test("不改动原对象", () => {
    const setVoltageBaseTerminalValues = vi.fn();
    const set = createSetVoltageBaseTerminalValue({ setVoltageBaseTerminalValues });
    const current = { n1: { t1: 110 } };

    set("n1", "t2", "220");
    const next = setVoltageBaseTerminalValues.mock.calls[0][0](current);

    expect(current).toEqual({ n1: { t1: 110 } });
    expect(next).not.toBe(current);
  });
});
