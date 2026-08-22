import { describe, expect, test } from "vitest";
import { meaningfulStoredDeviceParameterChineseName } from "./server.mjs";

describe("meaningfulStoredDeviceParameterChineseName", () => {
  test.each([
    ["i_q_set", "首端无功设定值"],
    ["j_q_set", "末端无功设定值"],
    ["control_type", "控制模式"],
    ["closed_status", "开合状态量测值"],
    ["closed_status_set", "开合状态设定值"],
    ["i_i_min", "首端电流下限"],
    ["j_r", "末端电阻"]
  ])("服务端将 %s 的自定义参数占位名替换为中文语义", (enName, expected) => {
    expect(meaningfulStoredDeviceParameterChineseName(enName, `自定义参数（${enName}）`)).toBe(expected);
  });

  test("服务端保留用户填写的真实中文名", () => {
    expect(meaningfulStoredDeviceParameterChineseName("p_set", "机组有功给定值")).toBe("机组有功给定值");
  });
});
