// validateDeviceOperatingLimits 直测 —— 该导出此前 0 调用（只被 model-topology.test.ts
// import 过，从未执行）。
//
// ## 覆盖的是什么
//
// 它是 `normalizeDeviceOperatingLimitsAfterTopology(nodes, options).warnings` 的薄封装。
// warnings 里的实际内容是**「设定值越界自动修正」**告警（`device-setpoint-auto-corrected`）：
// 设备参数里的 `p_set*` 落在 `p_min* … p_max*` 之外时，归一化会把它夹回区间并留一条告警。
//
// ## 为什么钉它
//
// 这条告警是用户唯一的反馈：自动修正发生了，但设备参数被改了。没有测试时，
// 「夹到上限还是夹到下限」「缺参数时按什么算」都只能靠读代码确认。
//
// 注：氢能耦合校验（e2h_coeff / h2e_coeff 为正数）走的是同一次归一化，但结果落在
// `invalidRelationFields` 而**不**进 warnings —— 所以这里断言不到它。
import { describe, expect, test } from "vitest";

import { createDefaultNode } from "./model";
import { validateDeviceOperatingLimits } from "./model-routing";

/** 造一个给定 kind 的节点；params 覆盖默认。 */
const nodeOf = (kind: string, params: Record<string, string> = {}) => {
  const node = createDefaultNode(kind, { x: 0, y: 0 });
  return { ...node, params: { ...node.params, ...params } };
};

const messagesOf = (nodes: ReturnType<typeof nodeOf>[]) =>
  validateDeviceOperatingLimits(nodes).map((warning) => warning.message);

describe("validateDeviceOperatingLimits —— 无设定值的设备", () => {
  test("空数组 → 无告警", () => {
    expect(validateDeviceOperatingLimits([])).toEqual([]);
  });

  test("母线 / 静态图元 → 无告警（它们没有 p_set 参数）", () => {
    expect(messagesOf([nodeOf("ac-bus")])).toEqual([]);
    expect(messagesOf([nodeOf("static-rect")])).toEqual([]);
  });

  test("★ ac-load 缺 p_set → 告警点名参数与区间，并说明已修正", () => {
    const [warning] = validateDeviceOperatingLimits([nodeOf("ac-load")]);
    expect(warning.type).toBe("device-setpoint-auto-corrected");
    expect(warning.message).toContain("p_set");
    expect(warning.message).toContain("p_min=0");
    expect(warning.message).toContain("p_max=5");
    expect(warning.message).toContain("已自动修正");
  });
});

describe("validateDeviceOperatingLimits —— 设定值在区间内", () => {
  test("★ 填了范围内的值 → 不告警", () => {
    expect(messagesOf([nodeOf("ac-load", { p_set: "3" })])).toEqual([]);
  });

  test("等于上下限也算在区间内（闭区间）", () => {
    expect(messagesOf([nodeOf("ac-load", { p_set: "0" })])).toEqual([]);
    expect(messagesOf([nodeOf("ac-load", { p_set: "5" })])).toEqual([]);
  });
});

describe("validateDeviceOperatingLimits —— 设定值越界", () => {
  test("★ 高于上限 → 告警且按上限修正", () => {
    const [warning] = validateDeviceOperatingLimits([nodeOf("ac-load", { p_set: "9" })]);
    expect(warning.type).toBe("device-setpoint-auto-corrected");
    expect(warning.message).toContain("p_set=9");
    // 修正目标写进文案：超上限夹到 p_max
    expect(warning.message).toContain("5");
  });

  test("低于下限时夹到下限", () => {
    const [warning] = validateDeviceOperatingLimits([nodeOf("ac-load", { p_set: "-3", p_min: "1" })]);
    expect(warning.message).toContain("已自动修正");
  });

  test("告警 id 含 kind / 节点 id / 参数名，便于前端定位", () => {
    const node = nodeOf("ac-load", { p_set: "9" });
    const [warning] = validateDeviceOperatingLimits([node]);
    expect(warning.id).toContain("device-setpoint-auto-corrected");
    expect(warning.id).toContain(node.id);
    expect(warning.id).toContain("p_set");
  });
});

describe("validateDeviceOperatingLimits —— 关联设备的独立参数名", () => {
  test("★ 电解槽告警用的是带后缀的关联字段名（p_set_ac_load_t1），不是 p_set", () => {
    const [warning] = validateDeviceOperatingLimits([nodeOf("ac-electrolyzer")]);
    expect(warning.message).toContain("p_set_ac_load_t1");
    expect(warning.message).toContain("p_max_ac_load_t1");
    expect(warning.message).not.toContain("p_set_ac_load_t1=未设置 不在 p_min=0");
  });

  test("★ 燃料电池有功与无功各一条（两条独立区间）", () => {
    const warnings = validateDeviceOperatingLimits([nodeOf("ac-fuel-cell")]);
    expect(warnings.length).toBe(2);
    const texts = warnings.map((warning) => warning.message).join("\n");
    expect(texts).toContain("p_set_ac_unit_t1");
    expect(texts).toContain("q_set_ac_unit_t1");
  });

  test("同一输入两次调用结果一致（无隐藏随机/顺序依赖）", () => {
    const nodes = [nodeOf("ac-load"), nodeOf("ac-electrolyzer")];
    expect(messagesOf(nodes)).toEqual(messagesOf(nodes));
  });
});