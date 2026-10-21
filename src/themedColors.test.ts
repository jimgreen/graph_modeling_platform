import { describe, expect, it } from "vitest";
import {
    DEFAULT_COLOR_PALETTE,
    ENERGY_THEME_COLORS,
    VOLTAGE_LEVEL_THEME_COLORS,
    colorPaletteForTheme,
    connectionStrokeColor,
    normalizeColorPalette,
    resolveThemedPalette
} from "./model";
import { THEMED_COLOR_PALETTES } from "./model";
import { contrastRatio } from "./canvasTheme";
import { themeModeOf, themedCanvasBackground, themedCanvasColors, themedMeasurementTextColor } from "./themedColors";

const DARK_BG = "#000000";

describe("能流配色两套值", () => {
    it("四个能流类型都有 light / dark", () => {
        expect(Object.keys(ENERGY_THEME_COLORS).sort()).toEqual(["ac", "dc", "h2", "heat"]);
        for (const [type, pair] of Object.entries(ENERGY_THEME_COLORS)) {
            expect(pair.light, type).toMatch(/^#[0-9a-f]{6}$/i);
            expect(pair.dark, type).toMatch(/^#[0-9a-f]{6}$/i);
            expect(pair.dark, type).not.toBe(pair.light);
        }
    });

    it("深色值在纯黑画布上 ≥ 4.5:1", () => {
        for (const [type, pair] of Object.entries(ENERGY_THEME_COLORS)) {
            expect(contrastRatio(pair.dark, DARK_BG), type).toBeGreaterThanOrEqual(4.5);
        }
    });

    it("浅色值保持历史配色不变", () => {
        expect(ENERGY_THEME_COLORS.ac.light).toBe("#2563eb");
        expect(ENERGY_THEME_COLORS.dc.light).toBe("#0f766e");
        expect(ENERGY_THEME_COLORS.h2.light).toBe("#7c3aed");
        expect(ENERGY_THEME_COLORS.heat.light).toBe("#dc2626");
    });
});

describe("电压等级配色两套值", () => {
    it("内置电压等级都成对配置", () => {
        expect(Object.keys(VOLTAGE_LEVEL_THEME_COLORS)).toHaveLength(16);
        for (const [voltage, pair] of Object.entries(VOLTAGE_LEVEL_THEME_COLORS)) {
            expect(pair.light, voltage).toMatch(/^#[0-9a-f]{6}$/i);
            expect(pair.dark, voltage).toMatch(/^#[0-9a-f]{6}$/i);
        }
    });

    it("深色值在纯黑画布上 ≥ 4.5:1（历史深红/深青在黑底上不可见）", () => {
        for (const [voltage, pair] of Object.entries(VOLTAGE_LEVEL_THEME_COLORS)) {
            expect(contrastRatio(pair.dark, DARK_BG), voltage).toBeGreaterThanOrEqual(4.5);
        }
    });

    it("深色值与浅色值不同（不照搬）", () => {
        for (const [voltage, pair] of Object.entries(VOLTAGE_LEVEL_THEME_COLORS)) {
            expect(pair.dark, voltage).not.toBe(pair.light);
        }
    });

    it("相邻电压等级在深色下仍可区分（不同电压不撞色成同一档）", () => {
        const darkColors = Object.values(VOLTAGE_LEVEL_THEME_COLORS).map((pair) => pair.dark);
        // 允许重复（0.22/0.4 等同档），但不同的必须真的不同
        expect(new Set(darkColors).size).toBeGreaterThanOrEqual(8);
    });
});

describe("resolveThemedPalette", () => {
    it("未自定义时：浅色取历史值，深色取深色值", () => {
        const light = resolveThemedPalette(DEFAULT_COLOR_PALETTE, "light");
        const dark = resolveThemedPalette(DEFAULT_COLOR_PALETTE, "dark");
        expect(light.energy.ac).toBe("#2563eb");
        expect(light.energy.ac).toBe(DEFAULT_COLOR_PALETTE.energy.ac);
        expect(dark.energy.ac).toBe(ENERGY_THEME_COLORS.ac.dark);
        expect(dark.voltage["ac:110"]).toBe(VOLTAGE_LEVEL_THEME_COLORS["110"].dark);
    });

    it("用户自定义值优先于内置颜色（两种主题都生效）", () => {
        const custom = normalizeColorPalette({
            energy: { ...DEFAULT_COLOR_PALETTE.energy, ac: "#123456" },
            voltage: { ...DEFAULT_COLOR_PALETTE.voltage }
        });
        expect(resolveThemedPalette(custom, "light").energy.ac).toBe("#123456");
        expect(resolveThemedPalette(custom, "dark").energy.ac).toBe("#123456");
    });

    it("解析结果覆盖全部键（不存在只有浅色的项）", () => {
        for (const theme of ["light", "dark"] as const) {
            const resolved = resolveThemedPalette(DEFAULT_COLOR_PALETTE, theme);
            expect(Object.keys(resolved.voltage).sort()).toEqual(Object.keys(DEFAULT_COLOR_PALETTE.voltage).sort());
            for (const value of Object.values(resolved.voltage)) {
                expect(String(value).trim().length).toBeGreaterThan(0);
            }
        }
    });

    it("深色表里没有任何一个值等于浅色默认值（红/青系必须已提亮）", () => {
        const dark = resolveThemedPalette(DEFAULT_COLOR_PALETTE, "dark");
        const light = resolveThemedPalette(DEFAULT_COLOR_PALETTE, "light");
        const identical = Object.keys(dark.voltage).filter((key) => dark.voltage[key] === light.voltage[key]);
        // 同电压的 ac:/dc: 与纯数字键共用一对值，这里比对的是“深浅是否相同”
        expect(identical).toEqual([]);
    });
});

describe("colorPaletteForTheme / THEMED_COLOR_PALETTES", () => {
    it("两套默认配色都完整且有差异", () => {
        expect(THEMED_COLOR_PALETTES.light.energy.ac).toBe("#2563eb");
        expect(THEMED_COLOR_PALETTES.dark.energy.ac).toBe("#60a5fa");
        expect(Object.keys(THEMED_COLOR_PALETTES.dark.voltage).sort()).toEqual(Object.keys(THEMED_COLOR_PALETTES.light.voltage).sort());
    });

    it("colorPaletteForTheme 与 resolveThemedPalette 同源", () => {
        expect(colorPaletteForTheme(DEFAULT_COLOR_PALETTE, "dark")).toEqual(resolveThemedPalette(DEFAULT_COLOR_PALETTE, "dark"));
    });
});

describe("连线兜底色", () => {
    it("浅色深灰，深色浅灰，深色值在黑底上可辨", () => {
        expect(connectionStrokeColor("light")).toBe("#334155");
        expect(connectionStrokeColor("dark")).toBe("#cbd5e1");
        expect(contrastRatio(connectionStrokeColor("dark"), DARK_BG)).toBeGreaterThanOrEqual(4.5);
    });
});

describe("主题适配层", () => {
    it("只认 dark 为深色", () => {
        expect(themeModeOf("dark")).toBe("dark");
        expect(themeModeOf(undefined)).toBe("light");
        expect(themeModeOf("auto")).toBe("light");
    });

    it("画布底色随主题：纯白 / 纯黑", () => {
        expect(themedCanvasBackground("light")).toBe("#ffffff");
        expect(themedCanvasBackground("dark")).toBe("#000000");
    });

    it("画布辅助元素随主题给出不同值", () => {
        const light = themedCanvasColors("light");
        const dark = themedCanvasColors("dark");
        expect(light.gridMinor).not.toBe(dark.gridMinor);
        expect(light.primary).not.toBe(dark.primary);
        expect(dark.canvasBackground).toBe("#000000");
    });
});

describe("量测文本取色", () => {
    it("浅色下原样返回，不动用户数据色", () => {
        expect(themedMeasurementTextColor("#334155", "light")).toBe("#334155");
        expect(themedMeasurementTextColor("#dc2626", "light")).toBe("#dc2626");
    });

    it("深色下把默认深灰字抬成浅色字，且在纯黑画布上可辨", () => {
        const dark = themedMeasurementTextColor("#334155", "dark");
        expect(dark).toBe("#e2e8f0");
        expect(contrastRatio(dark, DARK_BG)).toBeGreaterThanOrEqual(4.5);
    });

    it("深色下保留用户显式设置的彩色", () => {
        expect(themedMeasurementTextColor("#dc2626", "dark")).toBe("#dc2626");
        expect(themedMeasurementTextColor("#16a34a", "dark")).toBe("#16a34a");
    });

    it("非十六进制与空值不炸", () => {
        expect(themedMeasurementTextColor("", "dark")).toBe("");
        expect(themedMeasurementTextColor("rgb(51, 65, 85)", "dark")).toBe("rgb(51, 65, 85)");
    });
});
