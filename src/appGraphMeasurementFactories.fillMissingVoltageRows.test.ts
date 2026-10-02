// createFillMissingVoltageColorRows：给模型里用到但调色板没配的电压键补色。
// 两条易错点：① 无缺失时必须原样返回同一个 palette 引用（不复制）；
// ② 逐个补色时读的是「已补过的那份」voltage，后补的不会与先补的撞色。
import { describe, expect, test, vi } from "vitest";

import { createFillMissingVoltageColorRows } from "./appExtracted/appGraphMeasurementFactories";

function createScope() {
  const nearestVoltageColor = vi.fn((key: string) => `#${key.length}${key.length}${key.length}`);
  return {
    nearestVoltageColor,
    collectCurrentModelVoltageColorKeys: vi.fn(() => new Set<string>()),
    scope: { nearestVoltageColor, collectCurrentModelVoltageColorKeys: vi.fn(() => new Set<string>()) }
  };
}

describe("createFillMissingVoltageColorRows", () => {
  test("无缺失键时原样返回同一个 palette 引用，missingKeys 为空", () => {
    const h = createScope();
    const palette = { voltage: { "ac:220": "#111111" }, energy: {} } as any;
    const fill = createFillMissingVoltageColorRows(h.scope);

    const result = fill(palette, new Set(["ac:220"]));

    expect(result.palette).toBe(palette);
    expect(result.missingKeys).toEqual([]);
    expect(h.nearestVoltageColor).not.toHaveBeenCalled();
  });

  test("缺失键被逐个补色并写进新 palette，原 palette 不被改", () => {
    const h = createScope();
    const palette = { voltage: { "ac:220": "#111111" }, energy: {} } as any;
    const fill = createFillMissingVoltageColorRows(h.scope);

    const result = fill(palette, new Set(["ac:220", "ac:110"]));

    expect(result.missingKeys).toEqual(["ac:110"]);
    expect(result.palette.voltage).toEqual({ "ac:220": "#111111", "ac:110": "#666" });
    expect(palette.voltage).toEqual({ "ac:220": "#111111" });
    expect(result.palette).not.toBe(palette);
  });

  test("补色时传入的是同一个逐轮累积的 voltage 对象", () => {
    const h = createScope();
    const fill = createFillMissingVoltageColorRows(h.scope);

    fill({ voltage: {} } as any, new Set(["k1", "k1k1"]));

    // 同一对象引用被就地累积，故只能断言最终形态：第二个键确实看得见第一个键补出的色
    expect(h.nearestVoltageColor.mock.calls[0][0]).toBe("k1");
    expect(h.nearestVoltageColor.mock.calls[1]).toEqual(["k1k1", { k1: "#222", k1k1: "#444" }]);
  });

  test("空字符串算缺失（falsy 判定）", () => {
    const h = createScope();
    const fill = createFillMissingVoltageColorRows(h.scope);

    const result = fill({ voltage: { "ac:220": "" } } as any, new Set(["ac:220"]));

    expect(result.missingKeys).toEqual(["ac:220"]);
  });

  test("不传 sourceKeys 时向 scope 现取模型键", () => {
    const h = createScope();
    h.scope.collectCurrentModelVoltageColorKeys = vi.fn(() => new Set(["ac:999"]));
    const fill = createFillMissingVoltageColorRows(h.scope);

    const result = fill({ voltage: {} } as any);

    expect(result.missingKeys).toEqual(["ac:999"]);
  });

  test("energy 等其它配色段原样带出", () => {
    const h = createScope();
    const fill = createFillMissingVoltageColorRows(h.scope);

    const result = fill({ voltage: {}, energy: { "a:b": "#654321" } } as any, new Set());

    expect(result.palette.energy).toEqual({ "a:b": "#654321" });
  });
});
