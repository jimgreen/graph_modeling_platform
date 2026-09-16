import { describe, expect, test } from "vitest";
import { switchingDeviceUsesClosedStatus } from "./model";

describe("switchingDeviceUsesClosedStatus", () => {
  test.each([
    ["ac-switch", {}],
    ["dc-switch", {}],
    ["ac-breaker", {}],
    ["dc-breaker", {}],
    ["custom-ac-switch", { component_type: "ACSwitch" }],
    ["custom-dc-breaker", { derived_from_component_type: "DCBreak" }],
    ["custom-derived-switch", { derived_component_type: "ACBreak" }]
  ])("uses closed_status for %s", (kind, params) => {
    expect(switchingDeviceUsesClosedStatus(kind, params)).toBe(true);
  });

  test("keeps status for ground disconnectors and ordinary devices", () => {
    expect(switchingDeviceUsesClosedStatus("ac-ground-disconnector")).toBe(false);
    expect(switchingDeviceUsesClosedStatus("ac-load", { component_type: "ACLoad" })).toBe(false);
  });

  test("交流容器不是开关设备:kind 含 switch 的 ac-switch-box 也走 status", () => {
    // 误命中根因:baseKind.includes("switch") 只看子串;容器无 E 设备类,默认参数不该被写成 closed_status
    expect(switchingDeviceUsesClosedStatus("ac-switch-box")).toBe(false);
    expect(switchingDeviceUsesClosedStatus("ac-vpp-box")).toBe(false);
    expect(switchingDeviceUsesClosedStatus("ac-distribution-box")).toBe(false);
  });
});
