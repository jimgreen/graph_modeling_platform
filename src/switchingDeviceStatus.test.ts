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
});
