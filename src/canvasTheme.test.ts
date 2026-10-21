import { describe, expect, it } from "vitest";
import {
    CANVAS_THEME_COLORS,
    DARK_CANVAS_BACKGROUND,
    LIGHT_CANVAS_BACKGROUND,
    auditDarkCanvasPalette,
    auditLightCanvasPalette,
    canvasDrawingTokens,
    canvasThemeColorsFor,
    contrastRatio,
    flipCanvasThemeMode,
    isLightCanvasBackground,
    migrateLegacyCanvasBackground,
    normalizeCanvasThemeMode,
    parseCssColor,
    themeCanvasBackground,
    themeCanvasFill,
    themeSemanticColor,
} from "./canvasTheme";

describe("画布主题底色", () => {
    it("浅色纯白、深色纯黑", () => {
        expect(LIGHT_CANVAS_BACKGROUND).toBe("#ffffff");
        expect(DARK_CANVAS_BACKGROUND).toBe("#000000");
        expect(themeCanvasBackground("light")).toBe("#ffffff");
        expect(themeCanvasBackground("dark")).toBe("#000000");
    });

    it("主题名归一：只有 dark 是深色", () => {
        expect(normalizeCanvasThemeMode("dark")).toBe("dark");
        expect(normalizeCanvasThemeMode("light")).toBe("light");
        expect(normalizeCanvasThemeMode(undefined)).toBe("light");
        expect(normalizeCanvasThemeMode("auto")).toBe("light");
        expect(flipCanvasThemeMode("light")).toBe("dark");
        expect(flipCanvasThemeMode("dark")).toBe("light");
    });

    it("取配色时模式与底色自洽", () => {
        expect(canvasThemeColorsFor("light").canvasBackground).toBe("#ffffff");
        expect(canvasThemeColorsFor("dark").canvasBackground).toBe("#000000");
        expect(canvasDrawingTokens("dark")).toBe(canvasThemeColorsFor("dark"));
    });
});

describe("画布配色：深浅两套值都要有", () => {
    const light = CANVAS_THEME_COLORS.light;
    const dark = CANVAS_THEME_COLORS.dark;

    it("键集完全一致（不存在只配了一半的颜色项）", () => {
        expect(Object.keys(dark).sort()).toEqual(Object.keys(light).sort());
    });

    it("每个颜色项都是非空字符串", () => {
        for (const [key, value] of Object.entries(light)) {
            if (key === "mode") continue;
            expect(typeof value, `light.${key}`).toBe("string");
            expect(String(value).length, `light.${key}`).toBeGreaterThan(0);
        }
        for (const [key, value] of Object.entries(dark)) {
            if (key === "mode") continue;
            expect(typeof value, `dark.${key}`).toBe("string");
            expect(String(value).length, `dark.${key}`).toBeGreaterThan(0);
        }
    });

    it("深色值不照搬浅色值（文字与辅助元素必须重新着色）", () => {
        // 三处刻意的例外：
        // - surfaceFill：图元填充两种主题下一律透明（用户要求），它不是「按画布配的颜色」，而是「不画」。
        // - frameBackground：视口那圈浅灰，用户明确要求深色时也沿用浅色配色。
        // - busEndpointDot / busEndpointDotStroke：母线连接点，用户明确要求两种主题都透明。
        const sharedColorKeys = Object.keys(light).filter((key) => key !== "mode" && key !== "surfaceFill" && key !== "frameBackground" && key !== "busEndpointDot" && key !== "busEndpointDotStroke");
        const identical = sharedColorKeys.filter(
            (key) => String((light as unknown as Record<string, unknown>)[key]) === String((dark as unknown as Record<string, unknown>)[key]),
        );
        expect(identical).toEqual([]);
    });

    it("视口底色两种主题一致，且与纯黑画布拉开明度差（边界仍然看得见）", () => {
        expect(dark.frameBackground).toBe(light.frameBackground);
        expect(contrastRatio(light.frameBackground, dark.canvasBackground)).toBeGreaterThan(3);
    });

    it("图元填充 token 两种主题都透明（除盒型开关外设备填充全透明）", () => {
        expect(light.surfaceFill).toBe("transparent");
        expect(dark.surfaceFill).toBe("transparent");
    });

    it("母线连接点两种主题都透明（fill 与 stroke 都是「不随主题变化」的第三类例外）", () => {
        expect(light.busEndpointDot).toBe("transparent");
        expect(dark.busEndpointDot).toBe("transparent");
        expect(light.busEndpointDotStroke).toBe("transparent");
        expect(dark.busEndpointDotStroke).toBe("transparent");
    });
});

describe("深色模式在纯黑画布上的可读性", () => {
    it("文本三档 ≥ 4.5:1", () => {
        const dark = CANVAS_THEME_COLORS.dark;
        expect(contrastRatio(dark.primary, "#000000")).toBeGreaterThanOrEqual(4.5);
        expect(contrastRatio(dark.secondary, "#000000")).toBeGreaterThanOrEqual(4.5);
        expect(contrastRatio(dark.muted, "#000000")).toBeGreaterThanOrEqual(4.5);
    });

    it("默认审计清单全项达标", () => {
        expect(auditDarkCanvasPalette()).toEqual([]);
    });

    it("浅色模式在纯白画布上同样达标", () => {
        expect(auditLightCanvasPalette()).toEqual([]);
    });

    it("网格线暗但可辨：比底色亮，又不抢主文本", () => {
        const dark = CANVAS_THEME_COLORS.dark;
        const gridMinor = contrastRatio(dark.gridMinor, "#000000");
        const gridMajor = contrastRatio(dark.gridMajor, "#000000");
        const text = contrastRatio(dark.primary, "#000000");
        expect(gridMinor).toBeGreaterThan(1.1);
        expect(gridMajor).toBeGreaterThan(gridMinor);
        expect(gridMajor).toBeLessThan(text);
    });

    it("浅色网格不会吃掉深色文本", () => {
        const light = CANVAS_THEME_COLORS.light;
        expect(contrastRatio(light.primary, light.gridMajor)).toBeGreaterThanOrEqual(4.5);
    });
});

describe("颜色工具", () => {
    it("解析多种写法", () => {
        expect(parseCssColor("#fff")).toEqual([255, 255, 255, 1]);
        expect(parseCssColor("#000000")).toEqual([0, 0, 0, 1]);
        expect(parseCssColor("rgba(0, 0, 0, 0.5)")).toEqual([0, 0, 0, 0.5]);
        expect(parseCssColor("not-a-color")).toBeNull();
    });

    it("对比度端点", () => {
        expect(contrastRatio("#000000", "#000000")).toBeCloseTo(1, 5);
        expect(contrastRatio("#ffffff", "#000000")).toBeCloseTo(21, 5);
    });

    it("带 alpha 的颜色按合成后计算", () => {
        expect(contrastRatio("rgba(0, 0, 0, 0)", "#000000")).toBeCloseTo(1, 5);
    });
});

describe("存量画布底色迁移", () => {
    it("老的浅灰默认值视为未设置", () => {
        expect(migrateLegacyCanvasBackground("#f1f5f9")).toBe("");
        expect(migrateLegacyCanvasBackground("  #F1F5F9 ")).toBe("");
    });

    it("未设置保持为空，自定义色原样保留", () => {
        expect(migrateLegacyCanvasBackground(undefined)).toBe("");
        expect(migrateLegacyCanvasBackground("   ")).toBe("");
        expect(migrateLegacyCanvasBackground("#123456")).toBe("#123456");
    });
});

describe("画布实际填充色（显式底色 vs 主题底色）", () => {
    it("没设底色时直接用主题底色", () => {
        expect(themeCanvasFill("light")).toBe("#ffffff");
        expect(themeCanvasFill("dark")).toBe("#000000");
        expect(themeCanvasFill("light", "")).toBe("#ffffff");
        expect(themeCanvasFill("dark", "   ")).toBe("#000000");
    });

    it("存量项目落盘的近白底色在两种主题下都让位给主题底色", () => {
        // 用户实测的项目里 canvasBackgroundColor 就是 #f9fafa，它必须不能挡住纯白/纯黑
        expect(themeCanvasFill("light", "#f9fafa")).toBe("#ffffff");
        expect(themeCanvasFill("dark", "#f9fafa")).toBe("#000000");
        expect(themeCanvasFill("light", "#ffffff")).toBe("#ffffff");
        expect(themeCanvasFill("dark", "#ffffff")).toBe("#000000");
    });

    it("用户特意配的有区分度的底色照常保留", () => {
        expect(themeCanvasFill("light", "#123456")).toBe("#123456");
        expect(themeCanvasFill("dark", "#1a1a1a")).toBe("#1a1a1a");
    });

    it("isLightCanvasBackground 只认近白", () => {
        expect(isLightCanvasBackground("#f9fafa")).toBe(true);
        expect(isLightCanvasBackground("#ffffff")).toBe(true);
        expect(isLightCanvasBackground("#f1f5f9")).toBe(true);
        expect(isLightCanvasBackground("#1a1a1a")).toBe(false);
        expect(isLightCanvasBackground("#000000")).toBe(false);
        expect(isLightCanvasBackground("")).toBe(false);
        expect(isLightCanvasBackground(undefined)).toBe(false);
        expect(isLightCanvasBackground("not-a-color")).toBe(false);
    });
});

/**
 * 语义色（能流类型色 / 电压等级色）在深色下的换算。
 *
 * 与图元填充不同，语义色是**标识色**：不能透明、不能改色相，只调明度。
 * 配色设置弹框的色块和画布上的端子/母排都靠它，必须保证纯黑底上能看清。
 */
describe("语义色随主题换算", () => {
    it("浅色主题原样返回", () => {
        expect(themeSemanticColor("#2563eb", "light")).toBe("#2563eb");
        expect(themeSemanticColor("#0f766e", "light")).toBe("#0f766e");
    });

    it("深色主题下所有能流默认色都够亮（对比度 >= 门槛）", () => {
        for (const color of ["#2563eb", "#0f766e", "#7c3aed", "#dc2626"]) {
            const themed = themeSemanticColor(color, "dark");
            expect(contrastRatio(themed, DARK_CANVAS_BACKGROUND), color).toBeGreaterThanOrEqual(3);
        }
    });

    it("深色主题下所有电压等级默认色都够亮", () => {
        // 覆盖 VOLTAGE_LEVEL_COLORS 的深浅两端：#7f1d1d 最暗、#22c55e 最亮
        for (const color of ["#64748b", "#22c55e", "#0ea5e9", "#f97316", "#a855f7", "#6366f1", "#ef4444", "#b91c1c", "#7f1d1d", "#dc2626", "#0891b2", "#0e7490"]) {
            const themed = themeSemanticColor(color, "dark");
            expect(contrastRatio(themed, DARK_CANVAS_BACKGROUND), color).toBeGreaterThanOrEqual(3);
        }
    });

    it("本来就够亮的颜色原样保留，不改用户选定的色", () => {
        expect(themeSemanticColor("#facc15", "dark")).toBe("#facc15");
        expect(themeSemanticColor("#67e8f9", "dark")).toBe("#67e8f9");
        expect(themeSemanticColor("#ffffff", "dark")).toBe("#ffffff");
    });

    it("不做透明化：语义色永远不是一个空值", () => {
        for (const color of ["#7f1d1d", "#000000", "#0f172a"]) {
            const themed = themeSemanticColor(color, "dark");
            expect(themed).not.toBe("");
            expect(themed.toLowerCase()).not.toBe("transparent");
        }
    });

    it("空值 / transparent / 非法色原样返回，不炸", () => {
        expect(themeSemanticColor("", "dark")).toBe("");
        expect(themeSemanticColor("transparent", "dark")).toBe("transparent");
        expect(themeSemanticColor("not-a-color", "dark")).toBe("not-a-color");
        expect(themeSemanticColor(undefined as unknown as string, "dark")).toBe("");
    });

    /**
     * 配色弹框曾经的 bug：内置色在纯黑上「本来就算够亮」（例如 #0f766e 的对比度虽然不高，
     * 但 #2563eb 这类中亮度色早就过门槛），只走对比度兜底时会原样返回，
     * 于是弹框色块在切主题后纹丝不动、和画布上的颜色对不上。
     * 传了配对表就必须按表取值，与画布 resolveThemedPalette 同源。
     */
    it("给了配对表就走查表：浅取 light、深取 dark，不再看对比度", () => {
        const table = [
            { light: "#2563eb", dark: "#60a5fa" },
            { light: "#0f766e", dark: "#2dd4bf" },
        ];
        expect(themeSemanticColor("#2563eb", "light", table)).toBe("#2563eb");
        expect(themeSemanticColor("#2563eb", "dark", table)).toBe("#60a5fa");
        expect(themeSemanticColor("#0f766e", "dark", table)).toBe("#2dd4bf");
        // 表里没有的用户自选色：退回对比度兜底，不会被表影响
        expect(themeSemanticColor("#facc15", "dark", table)).toBe("#facc15");
    });

    it("表里命中的颜色不区分大小写，深色值回切也能还原浅色值", () => {
        const table = [{ light: "#2563EB", dark: "#60A5FA" }];
        expect(themeSemanticColor("#60a5fa", "light", table)).toBe("#2563EB");
        expect(themeSemanticColor("#60a5fa", "dark", table)).toBe("#60A5FA");
    });
});
