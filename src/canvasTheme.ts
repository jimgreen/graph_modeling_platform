/**
 * 画布主题（浅色 / 深色）。
 *
 * 约定（新需求口径）：
 * - **界面配色不随主题变化**：顶栏、侧栏、弹窗、tab 等外壳一律保持原有浅色配色。
 * - **只有画布变**：浅色模式画布纯白 #ffffff，深色模式画布纯黑 #000000。
 * - 画布上的一切颜色（能流、电压等级、文本、绘图辅助元素）都按“两套值”提供，
 *   深色那套必须能在纯黑画布上读清楚。
 *
 * 本模块是纯函数模块，不依赖 React，也不依赖 DOM —— 后端 SVG/CIM 导出适配层
 * 可以用 node 直接 import。
 */

/** 画布主题两种取值。 */
export type CanvasThemeMode = "light" | "dark";

/** 浅色画布的底色：纯白。 */
export const LIGHT_CANVAS_BACKGROUND = "#ffffff";

/** 深色画布的底色：纯黑。 */
export const DARK_CANVAS_BACKGROUND = "#000000";

/**
 * 历史默认画布底色（浅灰）。存量项目里 `canvasBackgroundColor` 落盘的值就是它。
 * 它**不再**被视为“未设置”的哨兵，只用于迁移：读到它就当作没设置，走主题底色。
 */
export const LEGACY_LIGHT_CANVAS_BACKGROUND = "#f1f5f9";

/** 把任意输入归一成主题名；非 "dark" 一律当浅色。 */
export function normalizeCanvasThemeMode(value: unknown): CanvasThemeMode {
    return value === "dark" ? "dark" : "light";
}

/** 给定主题返回画布底色。 */
export function themeCanvasBackground(mode: CanvasThemeMode): string {
    return mode === "dark" ? DARK_CANVAS_BACKGROUND : LIGHT_CANVAS_BACKGROUND;
}

/** 解析 `#rgb` / `#rrggbb` 两种写法；解析不了返回 null。 */
function parseHexColor(color: string): { r: number; g: number; b: number } | null {
    const text = color.trim().toLowerCase();
    const short = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/.exec(text);
    if (short) {
        return {
            r: parseInt(short[1] + short[1], 16),
            g: parseInt(short[2] + short[2], 16),
            b: parseInt(short[3] + short[3], 16),
        };
    }
    const long = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/.exec(text);
    if (long) {
        return { r: parseInt(long[1], 16), g: parseInt(long[2], 16), b: parseInt(long[3], 16) };
    }
    return null;
}

/**
 * 判断一个画布底色是不是“按浅色画布配的近白色”。
 *
 * 存量项目把画布底色落盘成近白（如 `#f9fafa`），它在深色主题下会挡住纯黑画布。
 * 判定阈值取亮度 ≥ 0.85：这样的底色必须托住深色墨色图形，切到深色一定不可用。
 */
export function isLightCanvasBackground(color: string | null | undefined): boolean {
    if (!color) return false;
    const rgb = parseHexColor(color);
    if (!rgb) return false;
    // 相对亮度（WCAG 简化版，够用即可）
    const channels = [rgb.r, rgb.g, rgb.b].map((value) => {
        const c = value / 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    const luminance = 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
    return luminance >= 0.7;
}

/**
 * 算出画布 `<rect>` 真正要用的填充色。
 *
 * 验收口径：浅色画布必须是纯白、深色画布必须是纯黑，不能被存量项目里
 * 落盘的近白底色（如 `#f9fafa`）挡掉。所以“近白”的显式底色在两种主题下
 * 都让位给主题底色；用户特意配的有区分度的底色（彩色底、深色底）照常保留。
 */
export function themeCanvasFill(mode: CanvasThemeMode, explicitBackground?: string | null): string {
    const explicit = typeof explicitBackground === "string" ? explicitBackground.trim() : "";
    if (!explicit) return themeCanvasBackground(mode);
    if (isLightCanvasBackground(explicit)) return themeCanvasBackground(mode);
    return explicit;
}

/** 主题的另一半。 */
export function flipCanvasThemeMode(mode: CanvasThemeMode): CanvasThemeMode {
    return mode === "dark" ? "light" : "dark";
}

/** 浅色 / 深色两套值。 */
export interface ThemeColorPair {
    light: string;
    dark: string;
}

/** 画布里“绘图辅助元素”的配色。 */
export interface CanvasDrawingTokens {
    /** 细网格线 */
    gridMinor: string;
    /** 粗网格线（主网格） */
    gridMajor: string;
    /** 画布外边框 */
    canvasBorder: string;
    /** 禁用端子的桩线 */
    disabledStub: string;
    /** 对齐辅助线 */
    alignmentGuide: string;
    /** 框选矩形描边 */
    marqueeStroke: string;
    /** 框选矩形填充 */
    marqueeFill: string;
    /** 连线预览（拖拽中） */
    connectionPreview: string;
    /** 端子圆点的外圈描边 */
    terminalDotStroke: string;
    /**
     * 母线连接点（`circle.bus-connection-dot`）的填充。
     *
     * 用户要求两种主题下都是 `transparent`：这类点只是边的可控端点，画成实心圆会在
     * 母排上糊出一串色块。所以深浅两套值相同，是「不随主题变化」的 token。
     */
    busEndpointDot: string;
    /** 母线连接点的描边，同样两种主题都是 `transparent`（只保留可点击区域）。 */
    busEndpointDotStroke: string;
    /** 画布视口底色：露出在画布 SVG 之外的区域（画布比视口小时、滚动留白处） */
    frameBackground: string;
    /** 标尺条背景 */
    rulerBackground: string;
    /** 标尺边框 */
    rulerBorder: string;
    /** 标尺刻度文字 */
    rulerText: string;
    /** 标尺主刻度线 */
    rulerTickMajor: string;
    /** 标尺次刻度线 */
    rulerTickMinor: string;
}

/** 画布上“文本”的配色。 */
export interface CanvasTextTokens {
    /** 设备标签 / 主干文本 */
    primary: string;
    /** 次级说明文本 */
    secondary: string;
    /** 微弱文本（坐标、角标） */
    muted: string;
    /** 文本外描边（让文字压在网格/连线上仍清晰） */
    halo: string;
}

/** 画布内其余语义色。 */
export interface CanvasSemanticTokens {
    /** 选中框 / 高亮描边 */
    selectionStroke: string;
    /** 选中框填充 */
    selectionFill: string;
    /** 强调色（预览线、提示） */
    accent: string;
    /** 图元填充底色 */
    surfaceFill: string;
    /** 图元描边 */
    surfaceStroke: string;
}

/** 画布配色总表。 */
export interface CanvasThemeColors extends CanvasDrawingTokens, CanvasTextTokens, CanvasSemanticTokens {
    mode: CanvasThemeMode;
    /** 画布底色 */
    canvasBackground: string;
}

const LIGHT_DRAWING: CanvasDrawingTokens = {
    gridMinor: "#e2e8f0",
    gridMajor: "#cbd5e1",
    canvasBorder: "#cbd5e1",
    disabledStub: "#cbd5e1",
    alignmentGuide: "#2563eb",
    marqueeStroke: "#2563eb",
    marqueeFill: "rgba(37, 99, 235, 0.08)",
    connectionPreview: "#64748b",
    terminalDotStroke: "#ffffff",
    busEndpointDot: "transparent",
    busEndpointDotStroke: "transparent",
    // 浅色视口沿用原有的浅灰（不是纯白，才能分出“画布外”与“画布内”）。
    frameBackground: "#e5e7eb",
    rulerBackground: "#f8fafc",
    rulerBorder: "#d8dee8",
    rulerText: "#64748b",
    rulerTickMajor: "#94a3b8",
    rulerTickMinor: "#dbe3ec",
};

/**
 * 深色画布的辅助元素：纯黑底上不能再用浅灰网格（会刺眼且盖住线条），
 * 也不能用接近黑的灰（看不见）。取“暗但可辨”的蓝灰。
 */
const DARK_DRAWING: CanvasDrawingTokens = {
    gridMinor: "#1f2937",
    gridMajor: "#334155",
    canvasBorder: "#475569",
    disabledStub: "#64748b",
    alignmentGuide: "#60a5fa",
    marqueeStroke: "#60a5fa",
    marqueeFill: "rgba(96, 165, 250, 0.12)",
    connectionPreview: "#94a3b8",
    // 黑底上的白圈会变成一块白斑，深色下改用比底色更深的描边把端子从底色里“挖”出来。
    terminalDotStroke: "#0b1220",
    busEndpointDot: "transparent",
    busEndpointDotStroke: "transparent",
    // 视口（画布外那一圈）两种主题共用同一档浅灰：用户明确要求深色时也沿用浅色视口。
    // 它与纯黑画布本身就隔着一整段明度差，边界照样看得见。
    frameBackground: "#e5e7eb",
    // 标尺：底色不能再用 #f8fafc（黑画布边上一条白带），刻度线要够亮才数得清。
    rulerBackground: "#0d1523",
    rulerBorder: "#26334a",
    rulerText: "#94a3b8",
    rulerTickMajor: "#64748b",
    rulerTickMinor: "#2b3a52",
};

const LIGHT_TEXT: CanvasTextTokens = {
    primary: "#111827",
    secondary: "#334155",
    muted: "#64748b",
    // 浅色画布上文字压着浅灰网格，用白描边把字托起来（沿用现有做法）。
    halo: "#ffffff",
};

/**
 * 深色文本：纯黑底上主文本用近白，次级用浅灰蓝，微弱用中灰蓝。
 * 全部经 alpha 混合后对 #000000 的对比度 ≥ 4.5:1。
 */
const DARK_TEXT: CanvasTextTokens = {
    primary: "#f8fafc",
    secondary: "#cbd5e1",
    muted: "#94a3b8",
    // 黑底上白描边会变成光晕，改用纯黑描边。
    halo: "#000000",
};

const LIGHT_SEMANTIC: CanvasSemanticTokens = {
    selectionStroke: "#2563eb",
    selectionFill: "rgba(37, 99, 235, 0.1)",
    accent: "#2563eb",
    // 与深色一致：图元填充透明，见下方 DARK_SEMANTIC 的说明。
    surfaceFill: "transparent",
    surfaceStroke: "#334155",
};

const DARK_SEMANTIC: CanvasSemanticTokens = {
    selectionStroke: "#60a5fa",
    selectionFill: "rgba(96, 165, 250, 0.16)",
    accent: "#60a5fa",
    // 图元填充两种主题下一律透明（用户要求：除盒型开关外设备填充全透明），
    // 底色交给画布自己 —— 这枚 token 因此不再是「深色图元底色」，只作兜底参考值。
    surfaceFill: "transparent",
    surfaceStroke: "#cbd5e1",
};

/** 两套完整画布配色。 */
export const CANVAS_THEME_COLORS: Record<CanvasThemeMode, CanvasThemeColors> = {
    light: {
        mode: "light",
        canvasBackground: LIGHT_CANVAS_BACKGROUND,
        ...LIGHT_DRAWING,
        ...LIGHT_TEXT,
        ...LIGHT_SEMANTIC,
    },
    dark: {
        mode: "dark",
        canvasBackground: DARK_CANVAS_BACKGROUND,
        ...DARK_DRAWING,
        ...DARK_TEXT,
        ...DARK_SEMANTIC,
    },
};

/** 取某个模式的画布配色。 */
export function canvasThemeColorsFor(mode: CanvasThemeMode): CanvasThemeColors {
    return CANVAS_THEME_COLORS[mode === "dark" ? "dark" : "light"];
}

/** 兼容旧调用口径：只取绘图辅助元素那一段。 */
export function canvasDrawingTokens(mode: CanvasThemeMode): CanvasDrawingTokens {
    return canvasThemeColorsFor(mode);
}

/**
 * 把存量的浅灰底色迁移成“未设置”。
 * 老项目落盘的 `#f1f5f9` 就是当年的默认值，读到它应当跟随主题，而不是永远停在白灰。
 */
export function migrateLegacyCanvasBackground(value: unknown): string {
    if (typeof value !== "string") return "";
    const trimmed = value.trim();
    if (!trimmed) return "";
    if (trimmed.toLowerCase() === LEGACY_LIGHT_CANVAS_BACKGROUND) return "";
    return trimmed;
}

// ---------------------------------------------------------------------------
// 用户图元配色（fillColor / strokeColor）随画布主题换算
// ---------------------------------------------------------------------------
//
// 设备的填充色、描边色是用户数据（node.params.fillColor / strokeColor），
// 存下来的是“画在浅色画布上好看”的值：#ffffff 的白底块、#eff6ff 的淡蓝底、
// #334155 的深灰描边……直接铺到纯黑画布上，白底块会变成刺眼的白斑，
// 深灰描边会糊进底色里看不见。
//
// 这里不改用户数据，只在渲染时按当前主题换算：同一份模型，浅色下仍是原色，
// 深色下换成“同色相、为黑底重新调过明度”的对应值。
//
// 换算规则（不是逐色硬编码，任意用户自选色都能覆盖）：
// - transparent / 空 / none：原样返回，没有填充就没有问题；
// - 极浅色（亮度高）：当作“想让这块图元比底色亮一点点”，深色下换成低亮度同色相；
// - 中低亮度色：当作“想让这块图元比底色暗”，深色下需要反过来提亮才能看见。
// 有确切对应关系的常用色走表，表里没有的走上面的规则，保证不会漏。

/** 浅色画布上常用的图元描边色 → 深色画布上的对应值。 */
const GLYPH_STROKE_DARK_MAP: Record<string, string> = {
    // 深灰描边在黑底上几乎不可见，需要大幅提亮
    "#334155": "#cbd5e1",
    "#475569": "#cbd5e1",
    "#1f2937": "#e2e8f0",
    "#64748b": "#94a3b8",
    "#cbd5e1": "#94a3b8",
    // 白描边在黑底上会变成发光的白边
    "#ffffff": "#cbd5e1",
    "#fff": "#cbd5e1",
    // 彩色描边：保持色相，深色下用同名浅色档
    "#2563eb": "#60a5fa",
    "#0284c7": "#38bdf8",
    "#ca8a04": "#facc15",
    "#ea580c": "#fb923c",
    "#059669": "#34d399",
    "#dc2626": "#f87171",
    "#7c3aed": "#c084fc",
    "#0f766e": "#2dd4bf",
};

/**
 * 把语义色（能流类型色 / 电压等级色）换算成指定主题下的值。
 *
 * 与 {@link themeGlyphColor} 的区别：语义色是**标识色**，不准透明、也不准改色相。
 *
 * 两段逻辑，优先级从高到低：
 *
 * 1. **查表**（`themePairTable` 给出时）：内置的能流/电压等级色都有一对明确的
 *    浅色/深色值（`ENERGY_THEME_COLORS` / `VOLTAGE_LEVEL_THEME_COLORS`）。
 *    命中浅色或深色任一档就返回该主题的那一档 —— 这是画布真正用的取值方式
 *    （`model.ts` 的 `resolveThemedPalette`），配色弹框必须与画布同源，
 *    否则弹框显示的颜色和画布上画出来的颜色是两回事。
 * 2. **对比度兜底**（用户自选色，不在表里）：深色下凡是对纯黑底对比度不足
 *    `SEMANTIC_MIN_CONTRAST` 的颜色，按同色相逐档提亮，直到够亮为止；
 *    已经够亮（例如本来就是亮黄、亮青）的原样保留。
 */
export const SEMANTIC_MIN_CONTRAST = 3;

/** 语义色查表用的「浅色值 → 深色值」映射。 */
export type SemanticThemePairTable = ReadonlyArray<{ readonly light: string; readonly dark: string }>;

export function themeSemanticColor(color: unknown, mode: CanvasThemeMode, themePairTable?: SemanticThemePairTable): string {
    if (typeof color !== "string") return "";
    const raw = color.trim();
    if (!raw) return "";
    const key = raw.toLowerCase();
    if (key === "transparent" || key === "none" || key === "inherit") return raw;
    if (themePairTable) {
        const pair = themePairTable.find((entry) => entry.light.toLowerCase() === key || entry.dark.toLowerCase() === key);
        if (pair) return mode === "dark" ? pair.dark : pair.light;
    }
    if (mode !== "dark") return raw;
    const rgba = parseCssColor(raw);
    if (!rgba) return raw;
    const [r, g, b, a] = rgba;
    if (a === 0) return raw;
    if (contrastRatio(raw, DARK_CANVAS_BACKGROUND) >= SEMANTIC_MIN_CONTRAST) return raw;
    // 同色相提亮：把颜色朝白色方向按比例混合，保色相不变、拉高亮度。
    // 每次混 30%，最多 6 轮（0.3 → 0.88），足以把 #0f172a 这种深藏青拉到可读。
    let current: [number, number, number] = [r, g, b];
    for (let step = 0; step < 6; step += 1) {
        current = [
            Math.round(current[0] + (255 - current[0]) * 0.3),
            Math.round(current[1] + (255 - current[1]) * 0.3),
            Math.round(current[2] + (255 - current[2]) * 0.3),
        ];
        const candidate = `rgb(${current[0]}, ${current[1]}, ${current[2]})`;
        if (contrastRatio(candidate, DARK_CANVAS_BACKGROUND) >= SEMANTIC_MIN_CONTRAST) return candidate;
    }
    return `rgb(${current[0]}, ${current[1]}, ${current[2]})`;
}

/** 没有确切对应关系时的兜底：按亮度把颜色翻到黑底可读的一侧。 */
function remapColorForDarkCanvas(input: string): string {
    const rgba = parseCssColor(input);
    if (!rgba) return input;
    const [r, g, b, a] = rgba;
    if (a === 0) return input;
    const luminance = relativeLuminance([r, g, b]);
    let out: [number, number, number];
    if (luminance > 0.55) {
        // 极浅色：原本“接近白底”的填充，深色下压成接近黑底的同色相
        out = [Math.round(r * 0.14), Math.round(g * 0.18), Math.round(b * 0.3)];
    } else if (luminance < 0.18) {
        // 极深色：原本“比白底黑”的描边，深色下提亮
        out = [
            Math.min(255, Math.round(120 + r * 0.4)),
            Math.min(255, Math.round(130 + g * 0.4)),
            Math.min(255, Math.round(150 + b * 0.4))
        ];
    } else {
        return input;
    }
    return `rgb(${out[0]}, ${out[1]}, ${out[2]})`;
}

/**
 * 把图元填充/描边色换算成指定主题下的值。
 * 不会修改用户数据：拿到的是渲染用的临时值。
 *
 * 填充色**两种主题下一律透明**（用户要求：除盒型开关外，设备填充都改成透明）。
 * 图元只靠描边和文字表达，底色交给画布自己 —— 深色下不会被亮块糊住内部笔画，
 * 浅色下也不会出现一块块和画布底色不一样的色疤。盒型开关（box-breaker-glyph）
 * 不经过这里的填充映射 —— 它闭合时直接用 stroke 当填充，见 DeviceGlyph.ts 的
 * box-breaker 分支。
 *
 * 描边色：深色下按表换算 / 亮度兜底翻到黑底可读的一侧；浅色原样返回。
 */
export function themeGlyphColor(color: unknown, mode: CanvasThemeMode, role: "fill" | "stroke" = "fill"): string {
    if (typeof color !== "string") return "";
    const raw = color.trim();
    if (!raw) return "";
    const key = raw.toLowerCase();
    if (key === "transparent" || key === "none" || key === "inherit") return raw;
    if (role === "fill") return "transparent";
    if (mode !== "dark") return raw;
    const mapped = GLYPH_STROKE_DARK_MAP[key];
    if (mapped) return mapped;
    return remapColorForDarkCanvas(raw);
}

// ---------------------------------------------------------------------------
// 可读性审计（测试与自检用）
// ---------------------------------------------------------------------------

/** 解析 #rgb / #rrggbb / #rrggbbaa / rgb() / rgba() 为 [r,g,b,a]。 */
export function parseCssColor(input: string): [number, number, number, number] | null {
    const value = String(input ?? "").trim().toLowerCase();
    if (!value) return null;
    const hex = value.match(/^#([0-9a-f]{3,8})$/);
    if (hex) {
        const raw = hex[1];
        if (raw.length === 3 || raw.length === 4) {
            const r = parseInt(raw[0] + raw[0], 16);
            const g = parseInt(raw[1] + raw[1], 16);
            const b = parseInt(raw[2] + raw[2], 16);
            const a = raw.length === 4 ? parseInt(raw[3] + raw[3], 16) / 255 : 1;
            return [r, g, b, a];
        }
        if (raw.length === 6 || raw.length === 8) {
            const r = parseInt(raw.slice(0, 2), 16);
            const g = parseInt(raw.slice(2, 4), 16);
            const b = parseInt(raw.slice(4, 6), 16);
            const a = raw.length === 8 ? parseInt(raw.slice(6, 8), 16) / 255 : 1;
            return [r, g, b, a];
        }
        return null;
    }
    const fn = value.match(/^rgba?\(([^)]+)\)$/);
    if (!fn) return null;
    const parts = fn[1].split(",").map((part) => Number(part.trim()));
    if (parts.length < 3 || parts.some((n) => Number.isNaN(n))) return null;
    return [parts[0], parts[1], parts[2], parts.length >= 4 ? parts[3] : 1];
}

/** 把带 alpha 的前景色合成到底色上，返回实际看到的颜色。 */
export function compositeOver(foreground: string, background: string): [number, number, number] {
    const fg = parseCssColor(foreground) ?? [0, 0, 0, 1];
    const bg = parseCssColor(background) ?? [255, 255, 255, 1];
    const a = Math.max(0, Math.min(1, fg[3]));
    return [
        Math.round(fg[0] * a + bg[0] * (1 - a)),
        Math.round(fg[1] * a + bg[1] * (1 - a)),
        Math.round(fg[2] * a + bg[2] * (1 - a)),
    ];
}

/** WCAG 相对亮度。 */
export function relativeLuminance(rgb: [number, number, number]): number {
    const [r, g, b] = rgb.map((channel) => {
        const c = channel / 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 对比度（1~21）。前景带 alpha 时先合成到背景上再算。 */
export function contrastRatio(foreground: string, background: string): number {
    const fg = compositeOver(foreground, background);
    const bg = compositeOver(background, "#000000");
    const l1 = relativeLuminance(fg);
    const l2 = relativeLuminance(bg);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
}

/** 文本可读性门槛：正文 4.5:1。 */
export const TEXT_MIN_CONTRAST = 4.5;

/** 审计一组“前景 → 底色”颜色，返回不达标的项。 */
export function auditCanvasColors(
    mode: CanvasThemeMode,
    entries: Array<{ token: string; color: string; min?: number }>,
    background = themeCanvasBackground(mode),
): Array<{ token: string; color: string; ratio: number; min: number }> {
    const failures: Array<{ token: string; color: string; ratio: number; min: number }> = [];
    for (const entry of entries) {
        const min = entry.min ?? TEXT_MIN_CONTRAST;
        const ratio = contrastRatio(entry.color, background);
        if (ratio + 1e-9 < min) {
            failures.push({ token: entry.token, color: entry.color, ratio, min });
        }
    }
    return failures;
}

/**
 * 深色模式在纯黑画布上的默认审计清单：
 * 文本三档 + 必须看得见的辅助元素。网格是底纹，只要求“暗但可辨”，门槛单独给。
 */
export function auditDarkCanvasPalette(
    colors: CanvasThemeColors = CANVAS_THEME_COLORS.dark,
    background = DARK_CANVAS_BACKGROUND,
): Array<{ token: string; color: string; ratio: number; min: number }> {
    return auditCanvasColors("dark", [
        { token: "text.primary", color: colors.primary },
        { token: "text.secondary", color: colors.secondary },
        { token: "text.muted", color: colors.muted },
        { token: "semantic.accent", color: colors.accent },
        { token: "semantic.selectionStroke", color: colors.selectionStroke },
        { token: "semantic.surfaceStroke", color: colors.surfaceStroke },
        { token: "drawing.alignmentGuide", color: colors.alignmentGuide },
        { token: "drawing.connectionPreview", color: colors.connectionPreview },
        // 网格是低对比底纹：只要在黑底上能看见且不抢线条即可。
        { token: "drawing.gridMinor", color: colors.gridMinor, min: 1.35 },
        { token: "drawing.gridMajor", color: colors.gridMajor, min: 1.9 },
        { token: "drawing.canvasBorder", color: colors.canvasBorder, min: 2.2 },
        // 标尺刻度线属辅助刻度，比正文低一档，但必须能从标尺底色里辨出来。
        { token: "drawing.rulerTickMajor", color: colors.rulerTickMajor, min: 1.9 },
        { token: "drawing.rulerTickMinor", color: colors.rulerTickMinor, min: 1.25 },
        { token: "drawing.rulerBorder", color: colors.rulerBorder, min: 1.25 },
    ], background);
}

/** 浅色模式同口径审计（浅色画布纯白）。 */
export function auditLightCanvasPalette(
    colors: CanvasThemeColors = CANVAS_THEME_COLORS.light,
    background = LIGHT_CANVAS_BACKGROUND,
): Array<{ token: string; color: string; ratio: number; min: number }> {
    return auditCanvasColors("light", [
        { token: "text.primary", color: colors.primary },
        { token: "text.secondary", color: colors.secondary },
        { token: "text.muted", color: colors.muted },
        { token: "semantic.accent", color: colors.accent },
        { token: "semantic.selectionStroke", color: colors.selectionStroke },
        { token: "semantic.surfaceStroke", color: colors.surfaceStroke },
        { token: "drawing.alignmentGuide", color: colors.alignmentGuide },
        { token: "drawing.connectionPreview", color: colors.connectionPreview },
    ], background);
}
