// 配色面板的读写操作。两条易错契约：
//  ① createSetVoltageColorRows 只保留「非 ac:/dc: 前缀」的旧键（历史纯数字键），
//     旧的 typed 键被整段替换，否则删行会删不掉；
//  ② createAddVoltageColorRow 从固定电压序列里挑第一个未被占用的。
import { describe, expect, test, vi } from "vitest";

import {
  createAddVoltageColorRow,
  createDeleteVoltageColorRow,
  createResetEnergyColors,
  createResetVoltageColors,
  createSaveColorPalette,
  createSetVoltageColorRows,
  createToggleColorDisplayMode,
  createUpdateEnergyColor,
  createUpdateVoltageColorRow
} from "./appExtracted/appGraphMeasurementFactories";

describe("createToggleColorDisplayMode", () => {
  test("不传参数时在 energy / voltage 间切换", () => {
    const setColorDisplayMode = vi.fn();
    const toggle = createToggleColorDisplayMode({ setColorDisplayMode });

    toggle();

    expect(setColorDisplayMode).toHaveBeenCalledTimes(1);
    const updater = setColorDisplayMode.mock.calls[0][0];
    expect(updater("energy")).toBe("voltage");
    expect(updater("voltage")).toBe("energy");
  });

  test("传了目标模式就固定成该模式", () => {
    const setColorDisplayMode = vi.fn();
    createToggleColorDisplayMode({ setColorDisplayMode })("voltage");

    expect(setColorDisplayMode.mock.calls[0][0]("energy")).toBe("voltage");
  });
});

describe("createSaveColorPalette", () => {
  test("归一后落盘、切到当前 tab 并关窗", () => {
    const scope = {
      colorPaletteDraft: { voltage: {}, energy: {} },
      colorPaletteTab: "energy",
      normalizeColorPalette: vi.fn(() => ({ voltage: { "ac:220": "#123456" }, energy: {} })),
      requireEditMode: vi.fn(() => true),
      setColorDisplayMode: vi.fn(),
      setColorPalette: vi.fn(),
      setColorPaletteDialogOpen: vi.fn()
    };

    createSaveColorPalette(scope)();

    expect(scope.requireEditMode).toHaveBeenCalledWith("保存配色");
    expect(scope.setColorPalette).toHaveBeenCalledWith({ voltage: { "ac:220": "#123456" }, energy: {} });
    expect(scope.setColorDisplayMode).toHaveBeenCalledWith("energy");
    expect(scope.setColorPaletteDialogOpen).toHaveBeenCalledWith(false);
  });

  test("只读模式下什么都不做", () => {
    const scope = {
      colorPaletteDraft: { voltage: {}, energy: {} },
      colorPaletteTab: "energy",
      normalizeColorPalette: vi.fn(),
      requireEditMode: vi.fn(() => false),
      setColorDisplayMode: vi.fn(),
      setColorPalette: vi.fn(),
      setColorPaletteDialogOpen: vi.fn()
    };

    createSaveColorPalette(scope)();

    expect(scope.normalizeColorPalette).not.toHaveBeenCalled();
    expect(scope.setColorPalette).not.toHaveBeenCalled();
    expect(scope.setColorPaletteDialogOpen).not.toHaveBeenCalled();
  });
});

describe("能量色 / 电压色重置与改写", () => {
  const DEFAULT_COLOR_PALETTE = { energy: { ac: "#aaaaaa" }, voltage: { "ac:220": "#bbbbbb" } };

  test("重置能量色只换 energy 段", () => {
    const setColorPaletteDraft = vi.fn();
    createResetEnergyColors({ DEFAULT_COLOR_PALETTE, setColorPaletteDraft })();

    const next = setColorPaletteDraft.mock.calls[0][0]({ energy: { ac: "#000000" }, voltage: { "ac:220": "#111111" } });
    expect(next).toEqual({ energy: { ac: "#aaaaaa" }, voltage: { "ac:220": "#111111" } });
  });

  test("重置电压色只换 voltage 段", () => {
    const setColorPaletteDraft = vi.fn();
    createResetVoltageColors({ DEFAULT_COLOR_PALETTE, setColorPaletteDraft })();

    const next = setColorPaletteDraft.mock.calls[0][0]({ energy: { ac: "#000000" }, voltage: { "ac:220": "#111111" } });
    expect(next).toEqual({ energy: { ac: "#000000" }, voltage: { "ac:220": "#bbbbbb" } });
  });

  test("重置得到的是深拷贝，改草稿不会污染默认表", () => {
    const setColorPaletteDraft = vi.fn();
    createResetEnergyColors({ DEFAULT_COLOR_PALETTE, setColorPaletteDraft })();

    const next = setColorPaletteDraft.mock.calls[0][0]({});
    next.energy.ac = "#ffffff";
    expect(DEFAULT_COLOR_PALETTE.energy.ac).toBe("#aaaaaa");
  });

  test("改单条能量色保留其余键", () => {
    const setColorPaletteDraft = vi.fn();
    createUpdateEnergyColor({ setColorPaletteDraft })("dc" as any, "#00ff00");

    const next = setColorPaletteDraft.mock.calls[0][0]({ energy: { ac: "#aaaaaa" }, voltage: { "ac:220": "#bbbbbb" } });
    expect(next.energy).toEqual({ ac: "#aaaaaa", dc: "#00ff00" });
    expect(next.voltage).toEqual({ "ac:220": "#bbbbbb" });
  });
});

describe("createSetVoltageColorRows", () => {
  function scope(voltage: Record<string, string>) {
    const setColorPaletteDraft = vi.fn();
    return {
      setColorPaletteDraft,
      scope: { colorPaletteDraft: { voltage }, normalizeVoltageBaseInput: (v: string) => v.trim(), setColorPaletteDraft }
    };
  }

  test("按 <type>:<voltage> 重建 typed 段", () => {
    const h = scope({ "ac:220": "#111111" });

    createSetVoltageColorRows(h.scope)([{ type: "ac", voltage: "220", color: "#222222" }]);

    const next = h.setColorPaletteDraft.mock.calls[0][0]({ voltage: {} });
    expect(next.voltage).toEqual({ "ac:220": "#222222" });
  });

  test("非 ac:/dc: 前缀的历史键被保留", () => {
    const h = scope({ "legacy": "#333333", "ac:220": "#111111" });

    createSetVoltageColorRows(h.scope)([]);

    const next = h.setColorPaletteDraft.mock.calls[0][0]({ voltage: {} });
    expect(next.voltage).toEqual({ "legacy": "#333333" });
  });

  test("电压值先归一再拼键", () => {
    const h = scope({});
    h.scope.normalizeVoltageBaseInput = (v: string) => (v.trim() === "220.0" ? "220" : v.trim());

    createSetVoltageColorRows(h.scope)([{ type: "dc", voltage: "220.0", color: "#444444" }]);

    const next = h.setColorPaletteDraft.mock.calls[0][0]({ voltage: {} });
    expect(next.voltage).toEqual({ "dc:220": "#444444" });
  });

  test("归一为空且去空格也为空时落到 0", () => {
    const h = scope({});
    h.scope.normalizeVoltageBaseInput = () => "";

    createSetVoltageColorRows(h.scope)([{ type: "ac", voltage: "   ", color: "#555555" }]);

    const next = h.setColorPaletteDraft.mock.calls[0][0]({ voltage: {} });
    expect(next.voltage).toEqual({ "ac:0": "#555555" });
  });

  test("行内 type/voltage 同名冲突时后者覆盖前者", () => {
    const h = scope({});

    createSetVoltageColorRows(h.scope)([
      { type: "ac", voltage: "220", color: "#aaaaaa" },
      { type: "ac", voltage: "220", color: "#bbbbbb" }
    ]);

    const next = h.setColorPaletteDraft.mock.calls[0][0]({ voltage: {} });
    expect(next.voltage).toEqual({ "ac:220": "#bbbbbb" });
  });
});

describe("电压色行编辑", () => {
  const row = (key: string) => ({ key, type: "ac" as const, voltage: "220", color: "#111111" });

  test("改行只动 key 命中的那行", () => {
    const setVoltageColorRows = vi.fn();
    const voltageColorRows = [row("a"), row("b")];

    createUpdateVoltageColorRow({ setVoltageColorRows, voltageColorRows })("b", { color: "#999999" });

    const next = setVoltageColorRows.mock.calls[0][0];
    expect(next[0]).toBe(voltageColorRows[0]);
    expect(next[1]).toEqual({ ...row("b"), color: "#999999" });
  });

  test("key 不存在时行内容原样不变", () => {
    const setVoltageColorRows = vi.fn();
    const voltageColorRows = [row("a")];

    createUpdateVoltageColorRow({ setVoltageColorRows, voltageColorRows })("缺失", { color: "#000000" });

    expect(setVoltageColorRows.mock.calls[0][0]).toEqual([row("a")]);
  });

  test("删行按 key 过滤", () => {
    const setVoltageColorRows = vi.fn();
    createDeleteVoltageColorRow({ setVoltageColorRows, voltageColorRows: [row("a"), row("b")] })("a");

    expect(setVoltageColorRows.mock.calls[0][0].map((r: any) => r.key)).toEqual(["b"]);
  });

  test("新增行挑第一个未被占用的基准电压", () => {
    const setVoltageColorRows = vi.fn();
    const voltageColorRows = [row("ac:10"), row("ac:35"), row("ac:110")];

    createAddVoltageColorRow({
      DEFAULT_COLOR_PALETTE: { voltage: { "ac:220": "#abcdef" } },
      setVoltageColorRows,
      voltageColorRows
    })();

    expect(setVoltageColorRows.mock.calls[0][0][3]).toEqual({ type: "ac", voltage: "220", color: "#abcdef" });
  });

  test("基准电压全被占用时退回序号命名", () => {
    const setVoltageColorRows = vi.fn();
    const voltageColorRows = ["10", "35", "110", "220", "500", "750", "800"].map((v) => row(`ac:${v}`));

    createAddVoltageColorRow({ DEFAULT_COLOR_PALETTE: { voltage: {} }, setVoltageColorRows, voltageColorRows })();

    expect(setVoltageColorRows.mock.calls[0][0][7]).toEqual({ type: "ac", voltage: "8", color: "#2563eb" });
  });

  test("默认表里没有该电压时退回 #2563eb", () => {
    const setVoltageColorRows = vi.fn();

    createAddVoltageColorRow({ DEFAULT_COLOR_PALETTE: { voltage: {} }, setVoltageColorRows, voltageColorRows: [] })();

    expect(setVoltageColorRows.mock.calls[0][0][0].color).toBe("#2563eb");
  });
});
