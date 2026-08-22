import { describe, expect, test } from "vitest";
import { meaningfulDeviceParameterChineseName } from "./deviceParameterChineseNames";

describe("meaningfulDeviceParameterChineseName", () => {
  test.each([
    ["i_q_set", "首端无功设定值"],
    ["j_q_set", "末端无功设定值"],
    ["p_set", "有功设定值"],
    ["control_type", "控制模式"],
    ["closed_status", "开合状态量测值"],
    ["closed_status_set", "开合状态设定值"],
    ["p_max", "有功上限"],
    ["p_min", "有功下限"],
    ["q_max", "无功上限"],
    ["q_min", "无功下限"],
    ["v_max", "电压上限"],
    ["v_min", "电压下限"],
    ["i_max", "电流上限"],
    ["i_min", "电流下限"],
    ["r", "电阻"],
    ["x", "电抗"],
    ["gt", "励磁电导"],
    ["bt", "励磁电纳"],
    ["i_p_max", "首端有功上限"],
    ["j_q_min", "末端无功下限"],
    ["i_i_min", "首端电流下限"],
    ["j_v_max", "末端电压上限"],
    ["i_control_type", "首端控制模式"],
    ["j_r", "末端电阻"],
    ["k_x", "中压侧电抗"],
    ["ac_v_min", "交流侧电压下限"],
    ["dc_i_max", "直流侧电流上限"],
    ["high_gt", "高压侧励磁电导"],
    ["medium_bt", "中压侧励磁电纳"],
    ["low_r", "低压侧电阻"],
    ["idx_ac_load_t2", "第2端关联交流负荷序号"],
    ["droop_coeff", "下垂系数"],
    ["time_constant", "时间常数"]
  ])("将 %s 解释为有意义的中文名", (enName, expected) => {
    expect(meaningfulDeviceParameterChineseName(enName, `自定义参数（${enName}）`)).toBe(expected);
  });

  test("保留用户已经填写的真实中文名", () => {
    expect(meaningfulDeviceParameterChineseName("i_q_set", "机组首端无功给定值")).toBe("机组首端无功给定值");
  });

  test("无法可靠解释的英文名仍使用可识别的自定义参数兜底", () => {
    expect(meaningfulDeviceParameterChineseName("vendor_magic", "自定义参数（vendor_magic）"))
      .toBe("自定义参数（vendor_magic）");
  });
});
