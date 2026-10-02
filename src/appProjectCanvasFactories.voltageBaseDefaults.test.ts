// 电压基值批量设置：推荐值与推荐模式。
// 两条贯穿全文件的规则：① 「0」不算有效电压基值（要往下一个候选找）；
// ② 候选顺序即优先级：端子 → 通用 vbase → 各侧 vbase → v_set 系列 → voltage。
import { describe, expect, test, vi } from "vitest";

import {
  createDefaultVoltageBaseSetValue,
  createRecommendedVoltageBaseSetMode
} from "./appExtracted/appProjectCanvasFactories";

const node = (id: string, terminals: any[] = [], params: Record<string, any> = {}) => ({ id, terminals, params });

describe("createDefaultVoltageBaseSetValue", () => {
  const build = (nodes: any[], normalize: (v: any) => string = (v) => (v === undefined || v === null ? "" : String(v))) =>
    createDefaultVoltageBaseSetValue({
      activeSelectedNodeIds: nodes.map((n) => n.id),
      nodeById: new Map(nodes.map((n) => [n.id, n])),
      normalizeVoltageBaseInput: vi.fn(normalize)
    });

  test("优先取第一个端子的 vbase", () => {
    const n = node("n1", [{ vbase: 220 }], { vbase: 110 });

    expect(build([n])()).toBe("220");
  });

  test("端子没有 vbase 时取通用 vbase", () => {
    expect(build([node("n1", [{}], { vbase: 110 })])()).toBe("110");
  });

  test("取值顺序：通用 → i_vbase → highVbase → sourceVbase → v_set → ac_v_set → dc_v_set → voltage", () => {
    expect(build([node("n1", [{}], { i_vbase: 1, highVbase: 2, sourceVbase: 3, v_set: 4, ac_v_set: 5, dc_v_set: 6, voltage: 7 })])()).toBe("1");
    expect(build([node("n1", [{}], { highVbase: 2, sourceVbase: 3, v_set: 4 })])()).toBe("2");
    expect(build([node("n1", [{}], { sourceVbase: 3, v_set: 4 })])()).toBe("3");
    expect(build([node("n1", [{}], { v_set: 4, ac_v_set: 5 })])()).toBe("4");
    expect(build([node("n1", [{}], { ac_v_set: 5, dc_v_set: 6 })])()).toBe("5");
    expect(build([node("n1", [{}], { dc_v_set: 6, voltage: 7 })])()).toBe("6");
    expect(build([node("n1", [{}], { voltage: 7 })])()).toBe("7");
  });

  test("值为 0 时继续找下一个候选", () => {
    expect(build([node("n1", [{ vbase: 0 }], { vbase: 110 })])()).toBe("110");
  });

  test("值为字符串 \"0\" 同样跳过", () => {
    expect(build([node("n1", [{ vbase: "0" }], { vbase: 110 })])()).toBe("110");
  });

  test("所有候选都是 0 时落到默认值 110", () => {
    expect(build([node("n1", [{ vbase: 0 }], { vbase: 0, voltage: 0 })])()).toBe("110");
  });

  test("没有任何候选时落到默认值 110", () => {
    expect(build([node("n1", [{}], {})])()).toBe("110");
  });

  test("按选中顺序取第一个有值的节点", () => {
    const nodes = [node("n1", [{}], {}), node("n2", [{}], { vbase: 220 })];

    expect(build(nodes)()).toBe("220");
  });

  test("查不到的节点被跳过", () => {
    const scope = {
      activeSelectedNodeIds: ["查无此节点", "n2"],
      nodeById: new Map([["n2", node("n2", [{}], { vbase: 220 })]]),
      normalizeVoltageBaseInput: (v: any) => (v == null ? "" : String(v))
    };

    expect(createDefaultVoltageBaseSetValue(scope)()).toBe("220");
  });

  test("没有选中节点时落到默认值", () => {
    expect(createDefaultVoltageBaseSetValue({ activeSelectedNodeIds: [], nodeById: new Map(), normalizeVoltageBaseInput: () => "" })()).toBe("110");
  });
});

describe("createRecommendedVoltageBaseSetMode", () => {
  const build = (uniform: boolean, terminal: boolean) =>
    createRecommendedVoltageBaseSetMode({
      voltageBaseSetHasUniformTargets: uniform,
      voltageBaseSetHasTerminalTargets: terminal
    })();

  test("既有统一目标又有端子目标 → byDevice", () => {
    expect(build(true, true)).toBe("byDevice");
  });

  test("只有端子目标 → terminal", () => {
    expect(build(false, true)).toBe("terminal");
  });

  test("只有统一目标 → uniform", () => {
    expect(build(true, false)).toBe("uniform");
  });

  test("两者都没有 → uniform", () => {
    expect(build(false, false)).toBe("uniform");
  });
});
