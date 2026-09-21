// 图元 Symbol 批量导出：从模型图元库（DeviceTemplate）裁剪出「只含 <style> 与 <defs><symbol>」的 SVG。
//
// 单一实现来源：单模板正文复用 buildDeviceTemplateIconSvg（与右键「导出图元为 SVG」同源），
// 本模块只做三件事 —— 摘取 <style>/<symbol>、把 symbol 的 viewBox 归一化为 0,0,width,height、
// 跨模板合并去重。任何「自己重画图元」的写法都会与画布渲染分叉，禁止。
//
// 纯模块（Node 可直载），不依赖 React / DOM，便于单测与后端复用。

// 显式 .ts 后缀：本模块要能被后端 Node ESM 直载（解析器不成对补后缀），
// 与 src/export/svg.ts 的 import 写法一致。Vite/vitest 侧同样接受显式后缀。
import type { DeviceTemplate } from "./model.ts";
import { getTemplateStateDefinitions, isContainerParams, isRoutableLineDeviceKind, isStaticNode } from "./model.ts";

/** 预设过滤分类。key 会随方案落盘，改名等于破坏已存方案，勿动。 */
export type SymbolExportFilterKey =
  | "vertical"
  | "static"
  | "adaptable"
  | "stateful"
  | "bus"
  | "container"
  | "custom"
  | "other";

export type SymbolExportFilterDefinition = {
  key: SymbolExportFilterKey;
  label: string;
  /** 悬浮说明：写清判据，避免用户把「竖向」误解成画布上的旋转。 */
  hint: string;
  matches: (template: DeviceTemplate) => boolean;
};

const VERTICAL_KIND_PATTERN = /-vertical$/iu;
const BUS_KIND_PATTERN = /bus/iu;

/** 分类 1～7 的判据；第 8 类「其它」= 未被前 7 类命中的兜底，故不在此表。 */
const PRIMARY_FILTERS: SymbolExportFilterDefinition[] = [
  {
    key: "vertical",
    label: "竖向图元",
    hint: "kind 以 -vertical 结尾（母线/开关/接地刀闸等的竖向变体）",
    matches: (template) => VERTICAL_KIND_PATTERN.test(String(template.kind ?? ""))
  },
  {
    key: "static",
    label: "静态图元",
    hint: "静态图元库（文本、图形、按钮、装饰等无电气语义的图元）",
    matches: (template) => isStaticNode(template)
  },
  {
    key: "adaptable",
    label: "自适应图元",
    hint: "自适应线路（交流/直流线路与零阻抗支路、输氢管道、热力线路，可随端点伸缩）",
    matches: (template) => isRoutableLineDeviceKind(String(template.kind ?? ""))
  },
  {
    key: "stateful",
    label: "多状态图元",
    hint: "状态定义 ≥ 2 的图元（如断路器的分/合，导出时会逐状态各产出一个 symbol）",
    matches: (template) => getTemplateStateDefinitions(template).length >= 2
  },
  {
    key: "bus",
    label: "母线图元",
    hint: "kind 含 bus 的母线类图元",
    matches: (template) => BUS_KIND_PATTERN.test(String(template.kind ?? ""))
  },
  {
    key: "container",
    label: "容器图元",
    hint: "可作为容器承载子设备的图元（箱体类）",
    matches: (template) => Boolean(template.isContainer) || isContainerParams(template.params ?? {})
  },
  {
    key: "custom",
    label: "自定义图元",
    hint: "用户自建/导入的图元（非系统内置）",
    matches: (template) => template.custom === true
  }
];

export const SYMBOL_EXPORT_FILTERS: SymbolExportFilterDefinition[] = [
  ...PRIMARY_FILTERS,
  {
    key: "other",
    label: "其它图元",
    hint: "未被以上任何分类命中的图元（兜底类，默认勾选以免漏选）",
    matches: () => false
  }
];

export const DEFAULT_SYMBOL_EXPORT_FILTER_KEYS: SymbolExportFilterKey[] =
  SYMBOL_EXPORT_FILTERS.map((filter) => filter.key);

export function isSymbolExportFilterKey(value: unknown): value is SymbolExportFilterKey {
  return SYMBOL_EXPORT_FILTERS.some((filter) => filter.key === value);
}

export function normalizeSymbolExportFilterKeys(value: unknown): SymbolExportFilterKey[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const seen = new Set<SymbolExportFilterKey>();
  const keys: SymbolExportFilterKey[] = [];
  for (const item of value) {
    if (isSymbolExportFilterKey(item) && !seen.has(item)) {
      seen.add(item);
      keys.push(item);
    }
  }
  return keys;
}

/** 模板命中的分类键（可能多个，如「竖向母线」同时命中 vertical 与 bus）。 */
export function symbolExportFilterKeysForTemplate(template: DeviceTemplate): SymbolExportFilterKey[] {
  const keys = PRIMARY_FILTERS.filter((filter) => filter.matches(template)).map((filter) => filter.key);
  return keys.length > 0 ? keys : ["other"];
}

/**
 * 预设过滤的可见性判据 = **减法语义（取消即硬排除）**。
 *
 * 一个图元常常同时命中多个分类：内置的竖向变体全部是「{本体} + vertical」双命中 ——
 * `createVerticalDeviceTemplate` 只改 `kind` 与 `label`，所以「交流母线（竖向）」同时命中
 * `bus`，「交流开关（竖向）」同时命中 `stateful`。若按并集语义（命中任一勾选分类即显示），
 * 用户取消「竖向图元」后这些图元会因本体分类仍被勾选而残留 —— 那正是这个函数要修掉的 bug。
 *
 * 规则为两条，且**排除优先**（后一条否决前一条）：
 *   1. 允许：命中任一**已勾选**分类 → 候选可见（保证「只勾一两个分类就拿得到该类的全部」）；
 *   2. 排除：命中任一**未勾选**分类 → 一律隐藏，不因第一条而豁免。
 *
 * 兜底类「其它图元」例外，单独短路为可见：它的 `matches` 恒为 false，只是一枚「未被任何主分类
 * 命中」的标记，既不该参与排除、也不该被要求出现在允许集里。否则取消「其它图元」会把这类
 * 图元整批误杀（空集回落 bug 的镜像版本）。
 *
 * 由此得到两个可预期的端点行为：
 *   - 全部勾选 → 排除集为空 → 全部可见（不会误伤「全选」）；
 *   - 全部取消 → 允许集为空、且所有主分类都进了排除集 → 一律隐藏
 *     （不会回落到全部分类，那会让「清空」按钮点了没反应）。
 */
export function isSymbolExportTemplateVisible(
  template: DeviceTemplate,
  activeFilterKeys: readonly SymbolExportFilterKey[]
): boolean {
  const keys = symbolExportFilterKeysForTemplate(template);
  const activeSet = new Set(activeFilterKeys);

  // 兜底类只作「未被主分类命中」的标记，`matches` 恒为 false，因此它既不该参与排除，
  // 也不该被要求出现在允许集里 —— 否则取消「其它图元」会把这类图元整批误杀。
  if (keys.length === 1 && keys[0] === "other") {
    return true;
  }

  // 排除优先：命中任一未勾选的主分类即隐藏（否决下面的允许判定）。
  if (keys.some((key) => !activeSet.has(key))) {
    return false;
  }
  return keys.some((key) => activeSet.has(key));
}

export function filterSymbolExportTemplates(
  templates: readonly DeviceTemplate[],
  activeFilterKeys: readonly SymbolExportFilterKey[]
): DeviceTemplate[] {
  return templates.filter((template) => isSymbolExportTemplateVisible(template, activeFilterKeys));
}

// ---------------------------------------------------------------------------
// 方案（保存到后端文件的勾选快照）
// ---------------------------------------------------------------------------

export const SYMBOL_EXPORT_SCHEME_SCHEMA_VERSION = 1;

export type SymbolExportScheme = {
  id: string;
  name: string;
  templateKinds: string[];
  filterKeys: SymbolExportFilterKey[];
  updatedAt: string;
};

export type SymbolExportSchemesPayload = {
  schemaVersion: number;
  schemes: SymbolExportScheme[];
};

export function symbolExportSchemeIdFromName(name: string): string {
  const slug = String(name ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/gu, "-")
    .replace(/^-+|-+$/gu, "");
  return `scheme-${slug || "unnamed"}`;
}

export function normalizeSymbolExportSchemes(payload: unknown): SymbolExportSchemesPayload {
  const source = payload && typeof payload === "object" && !Array.isArray(payload)
    ? payload as Record<string, unknown>
    : {};
  const rawSchemes = Array.isArray(source.schemes)
    ? source.schemes
    : Array.isArray(source.symbolExportSchemes)
      ? source.symbolExportSchemes
      : [];
  const byId = new Map<string, SymbolExportScheme>();
  for (const raw of rawSchemes) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      continue;
    }
    const record = raw as Record<string, unknown>;
    const name = String(record.name ?? "").trim();
    if (!name) {
      continue;
    }
    const id = String(record.id ?? "").trim() || symbolExportSchemeIdFromName(name);
    const templateKinds = Array.from(new Set(
      (Array.isArray(record.templateKinds) ? record.templateKinds : [])
        .map((item) => String(item ?? "").trim())
        .filter(Boolean)
    ));
    // 同名覆盖：方案名在前端是唯一键，重复名保留最后一条，避免加载时歧义
    for (const [existingId, existing] of byId) {
      if (existing.name === name) {
        byId.delete(existingId);
      }
    }
    byId.set(id, {
      id,
      name,
      templateKinds,
      filterKeys: normalizeSymbolExportFilterKeys(record.filterKeys),
      updatedAt: String(record.updatedAt ?? "").trim() || new Date().toISOString()
    });
  }
  return {
    schemaVersion: SYMBOL_EXPORT_SCHEME_SCHEMA_VERSION,
    schemes: Array.from(byId.values())
  };
}

/** 保存方案：同名覆盖、同 id 覆盖，其余追加。返回新数组（不就地改）。 */
export function upsertSymbolExportScheme(
  schemes: readonly SymbolExportScheme[],
  scheme: SymbolExportScheme
): SymbolExportScheme[] {
  const next = schemes.filter((item) => item.id !== scheme.id && item.name !== scheme.name);
  next.push(scheme);
  next.sort((left, right) => left.name.localeCompare(right.name, "zh-Hans-CN"));
  return next;
}

export function removeSymbolExportScheme(
  schemes: readonly SymbolExportScheme[],
  schemeId: string
): SymbolExportScheme[] {
  return schemes.filter((item) => item.id !== schemeId);
}

// ---------------------------------------------------------------------------
// SVG 合成
// ---------------------------------------------------------------------------

const SYMBOL_BLOCK_PATTERN = /<symbol\b[^>]*>[\s\S]*?<\/symbol>/giu;
const STYLE_BLOCK_PATTERN = /<style\b[^>]*>([\s\S]*?)<\/style>/giu;
const SYMBOL_OPEN_TAG_PATTERN = /^<symbol\b[^>]*>/iu;
const VIEW_BOX_PATTERN = /\bviewBox\s*=\s*"([^"]*)"/iu;

/**
 * 带 `/g` 或 `/y` 的正则对象**自带 `lastIndex` 游标**，跨调用保持状态。
 * 把这类常量直接交给 `.exec()` 会得到一个只从上次命中处继续搜索的对象 ——
 * 表现为「同样的输入换个调用顺序就漏匹配」（本模块的独立导出就踩过：
 * `ac-breaker` 跑完后 `ac-load` 的 `<use>` 再也匹配不到）。
 * 故凡在函数内用 `.exec()` / `.test()` 循环的，一律先取出一个无状态副本。
 */
function stateless(pattern: RegExp): RegExp {
  return new RegExp(pattern.source, pattern.flags.replace(/[gy]/gu, ""));
}

export function formatSymbolNumber(value: number): string {
  if (!Number.isFinite(value)) {
    return "0";
  }
  const rounded = Math.round(value * 1000) / 1000;
  return Object.is(rounded, -0) ? "0" : String(rounded);
}

function parseViewBox(value: string): { minX: number; minY: number; width: number; height: number } | null {
  const parts = String(value ?? "")
    .trim()
    .split(/[\s,]+/u)
    .map((item) => Number.parseFloat(item));
  if (parts.length !== 4 || parts.some((item) => !Number.isFinite(item))) {
    return null;
  }
  const [minX, minY, width, height] = parts;
  if (width <= 0 || height <= 0) {
    return null;
  }
  return { minX, minY, width, height };
}

/**
 * 把 symbol 的 viewBox 归一化为 `0,0,width,height`：正文整体平移 (-minX,-minY) 抵消偏移。
 * 原 viewBox 以原点为中心（如 `-75 -47 150 94`），若只改 viewBox 不平移，图形会被裁掉一半。
 */
export function normalizeSymbolViewBox(symbolMarkup: string): { markup: string; width: number; height: number } | null {
  const openTag = SYMBOL_OPEN_TAG_PATTERN.exec(symbolMarkup)?.[0] ?? "";
  if (!openTag) {
    return null;
  }
  const box = parseViewBox(VIEW_BOX_PATTERN.exec(openTag)?.[1] ?? "");
  if (!box) {
    return null;
  }
  const { minX, minY, width, height } = box;
  const body = symbolMarkup.slice(openTag.length, symbolMarkup.lastIndexOf("</symbol>"));
  const needsShift = minX !== 0 || minY !== 0;
  const shiftedBody = needsShift
    ? `<g transform="translate(${formatSymbolNumber(-minX)},${formatSymbolNumber(-minY)})">${body}</g>`
    : body;
  const nextOpenTag = openTag.replace(VIEW_BOX_PATTERN, `viewBox="0,0,${formatSymbolNumber(width)},${formatSymbolNumber(height)}"`);
  return { markup: `${nextOpenTag}${shiftedBody}</symbol>`, width, height };
}

/** 从整份单模板 SVG 中摘出 <style> 规则文本与全部 <symbol> 块。 */
export function extractSymbolExportParts(sourceSvg: string): { styleRules: string[]; symbols: string[] } {
  const styleRules: string[] = [];
  for (const match of String(sourceSvg ?? "").matchAll(STYLE_BLOCK_PATTERN)) {
    const raw = match[1] ?? "";
    const unwrapped = raw.replace(/<!\[CDATA\[/gu, "").replace(/\]\]>/gu, "").trim();
    if (unwrapped) {
      styleRules.push(unwrapped);
    }
  }
  const symbols = Array.from(String(sourceSvg ?? "").matchAll(SYMBOL_BLOCK_PATTERN)).map((match) => match[0]);
  return { styleRules, symbols };
}

/** 基础样式：symbol 一律允许溢出（与画布/导出同口径），其余规则来自单模板导出。 */
const BASE_SYMBOL_STYLE_RULE = "symbol{overflow:visible}";

/**
 * 删除导出 SVG 里的非必要换行：整行空白（含只剩缩进空格的行）、行尾空白。
 *
 * 空行来自单模板正文构建器（buildSvgDocument）的空图层拼接——图层为空时模板
 * 仍留下换行与缩进，两种导出（合并 / 独立）都会把它带进产物。元素之间的空白
 * 在 SVG 里没有渲染语义，删掉是安全的；唯一有语义的位置是 `<text>` 内容，
 * 本仓图元定义的 text 一律是单行短文本，行级清理不会切入标签内部。
 *
 * 合并导出与独立导出的最终产物都过一遍本函数（见 buildSymbolExportSvg /
 * buildStandaloneSymbolFiles）。
 */
export function compactSymbolExportWhitespace(svg: string): string {
  return String(svg ?? "")
    .replace(/\r\n?/gu, "\n")
    .split("\n")
    .map((line) => line.replace(/\s+$/u, ""))
    .filter((line) => line.trim().length > 0)
    .join("\n");
}

export type SymbolExportBuildResult = {
  svg: string;
  /** 实际写入的 <symbol> 数量（含同一图元的多状态）。 */
  symbolCount: number;
  /** 导出了 symbol 的图元 kind，按输入顺序去重。 */
  exportedKinds: string[];
  /** 无法产出 symbol 的图元 kind（异常兜底，不应出现）。 */
  skippedKinds: string[];
};

/** 正文 `<use>` 网格：每行 6 个，与【已选图元】清单的排列口径一致。 */
const USE_GRID_COLUMNS = 6;
/** 单元格比 symbol 绘图框（150×96）留一圈边距，观感与缩略图网格同。 */
const USE_GRID_CELL_WIDTH = 160;
const USE_GRID_CELL_HEIGHT = 120;
/** 每个 `<use>` 的视口尺寸 = symbol 绘图框；非该尺寸的 symbol 会被 meet 缩放居中。 */
const USE_GRID_VIEWPORT_WIDTH = 150;
const USE_GRID_VIEWPORT_HEIGHT = 96;

/**
 * 按输入顺序生成 `<use>` 网格（从左到右、从上到下，每行 6 个）。
 * 每个图元只占一格、引用它的主 symbol —— 与【已选图元】清单「一图元一项」同构。
 */
function buildSymbolOverviewUses(primarySymbolIds: readonly string[]): string[] {
  const uses: string[] = [];
  primarySymbolIds.forEach((id, index) => {
    if (!id) {
      return;
    }
    const column = index % USE_GRID_COLUMNS;
    const row = Math.floor(index / USE_GRID_COLUMNS);
    const x = column * USE_GRID_CELL_WIDTH + (USE_GRID_CELL_WIDTH - USE_GRID_VIEWPORT_WIDTH) / 2;
    const y = row * USE_GRID_CELL_HEIGHT + (USE_GRID_CELL_HEIGHT - USE_GRID_VIEWPORT_HEIGHT) / 2;
    uses.push(
      `<use href="#${id}" x="${formatSymbolNumber(x)}" y="${formatSymbolNumber(y)}" ` +
      `width="${USE_GRID_VIEWPORT_WIDTH}" height="${USE_GRID_VIEWPORT_HEIGHT}"/>`
    );
  });
  return uses;
}

/**
 * 合成导出文件。`buildTemplateSvg` 由调用方注入（生产传 buildDeviceTemplateIconSvg），
 * 便于单测替换为确定性桩，也避免本模块依赖 React 组件层。
 *
 * 产物 = `<style>` + `<defs>` 里一排 `<symbol>` 定义集 + 正文 `<g id="Symbol_Overview_Layer">`
 * 里的 `<use>` 网格（每行 6 个，顺序与输入 templates 一致 = 前端【已选图元】清单顺序）。
 * 每个图元引用的主 symbol 取「原始单模板正文 `<use>` 指向的那个」——即画布/缩略图呈现的默认状态。
 */
export function buildSymbolExportSvg(
  templates: readonly DeviceTemplate[],
  buildTemplateSvg: (template: DeviceTemplate) => string
): SymbolExportBuildResult {
  const styleRules: string[] = [];
  const seenStyleRules = new Set<string>();
  const symbolBlocks: string[] = [];
  const seenSymbolIds = new Set<string>();
  const primarySymbolIds: string[] = [];
  const exportedKinds: string[] = [];
  const skippedKinds: string[] = [];
  let maxWidth = 0;
  let maxHeight = 0;

  for (const template of templates) {
    const kind = String(template?.kind ?? "").trim();
    if (!kind) {
      continue;
    }
    let source = "";
    try {
      source = buildTemplateSvg(template) ?? "";
    } catch {
      skippedKinds.push(kind);
      continue;
    }
    const parts = extractSymbolExportParts(source);
    // 原始正文里那个 <use> 指向的 symbol id = 该图元的默认状态（与已选清单缩略图同口径）
    const referencedId = symbolIdFromUseTag(stateless(USE_TAG_PATTERN).exec(source)?.[0] ?? "");
    const accepted: Array<{ id: string; markup: string }> = [];
    for (const symbol of parts.symbols) {
      const id = symbolIdFromSymbolBlock(symbol);
      if (id && seenSymbolIds.has(id)) {
        continue;
      }
      const normalized = normalizeSymbolViewBox(symbol);
      if (!normalized) {
        continue;
      }
      if (id) {
        seenSymbolIds.add(id);
      }
      maxWidth = Math.max(maxWidth, normalized.width);
      maxHeight = Math.max(maxHeight, normalized.height);
      accepted.push({ id, markup: normalized.markup });
    }
    if (accepted.length === 0) {
      skippedKinds.push(kind);
      continue;
    }
    // 主 symbol：优先原始 <use> 引用的那个（默认状态），异常时退回第一个被接受的。
    const primary = accepted.find((item) => item.id && item.id === referencedId) ?? accepted[0];
    if (primary.id) {
      primarySymbolIds.push(primary.id);
    }
    for (const rule of parts.styleRules) {
      if (!seenStyleRules.has(rule)) {
        seenStyleRules.add(rule);
        styleRules.push(rule);
      }
    }
    symbolBlocks.push(...accepted.map((item) => item.markup));
    exportedKinds.push(kind);
  }

  const overviewUses = buildSymbolOverviewUses(primarySymbolIds);
  // 有正文网格时根 viewBox 覆盖整个网格（每行 6 个、行高 120）；纯定义集（无 use）时保持旧口径。
  const viewBoxWidth = overviewUses.length > 0
    ? USE_GRID_COLUMNS * USE_GRID_CELL_WIDTH
    : (maxWidth || 1);
  const viewBoxHeight = overviewUses.length > 0
    ? Math.ceil(primarySymbolIds.length / USE_GRID_COLUMNS) * USE_GRID_CELL_HEIGHT
    : (maxHeight || 1);
  const overviewLayer = overviewUses.length > 0
    ? `\n<g id="Symbol_Overview_Layer">\n${overviewUses.join("\n")}\n</g>`
    : "";
  const width = formatSymbolNumber(viewBoxWidth);
  const height = formatSymbolNumber(viewBoxHeight);
  const styleBody = [BASE_SYMBOL_STYLE_RULE, ...styleRules].join("\n");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="100%" height="100%" viewBox="0,0,${width},${height}">
<style type="text/css"><![CDATA[
${styleBody}
]]></style>
<defs>
${symbolBlocks.join("\n")}
</defs>${overviewLayer}
</svg>`;

  return { svg: compactSymbolExportWhitespace(svg), symbolCount: symbolBlocks.length, exportedKinds, skippedKinds };
}

export function symbolExportFileName(timestamp = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  const stamp = [
    timestamp.getFullYear(),
    pad(timestamp.getMonth() + 1),
    pad(timestamp.getDate())
  ].join("") + "-" + [pad(timestamp.getHours()), pad(timestamp.getMinutes()), pad(timestamp.getSeconds())].join("");
  return `component-symbols-${stamp}.svg`;
}

// ---------------------------------------------------------------------------
// 独立图元 SVG（非 symbol 形式）
// ---------------------------------------------------------------------------
//
// 与「合并导出一个 SVG」的区别：那边产一份「<style> + <defs> 里一排 <symbol>」的集合件，
// 供整体引用；这边每个图元产一份**可直接打开、自包含**的 SVG —— 把 symbol 正文就地内联，
// 去掉 <defs>/<symbol> 包装，文件里只有实际图形。
//
// 为什么不是「照搬单模板正文」：单模板正文虽然根标签也是 <svg>，但图形藏在
// <defs><symbol> 里、由一个 <use href="#symbol"> 引用（见 device-template-icon.ts）。
// 那是「定义 + 引用」形态，不是用户要的独立图形；且多状态图元的多个 <symbol> 只有一个
// 被 <use> 引用，直接照搬会丢掉其余状态。

/** `<use .../>` 自闭合标签（含换行，故用 [^>]* 而非 .*）。 */
const USE_TAG_PATTERN = /<use\b[^>]*\/>/giu;
const HREF_ATTR_PATTERN = /\b(?:xlink:)?href\s*=\s*"([^"]*)"/iu;
const SYMBOL_ID_ATTR_PATTERN = /\bid\s*=\s*"([^"]*)"/iu;
const TITLE_BLOCK_PATTERN = /<title\b[^>]*>[\s\S]*?<\/title>/giu;

/** 从 `<use href="#some_id">` 取出被引用的 symbol id。 */
function symbolIdFromUseTag(useTag: string): string {
  const href = stateless(HREF_ATTR_PATTERN).exec(useTag)?.[1]?.trim() ?? "";
  return href.startsWith("#") ? href.slice(1) : "";
}

/**
 * 从整个 `<symbol ...>…</symbol>` 块取 id —— 只在 open tag 上找，
 * 不受正文里其它元素（g/rect…）的 id 属性干扰。
 */
function symbolIdFromSymbolBlock(symbolMarkup: string): string {
  const openTag = stateless(SYMBOL_OPEN_TAG_PATTERN).exec(symbolMarkup)?.[0] ?? "";
  return openTag ? stateless(SYMBOL_ID_ATTR_PATTERN).exec(openTag)?.[1]?.trim() ?? "" : "";
}

/**
 * 一个 symbol 块的「图形正文 + 尺寸」。
 * `viewBox` 缺失/非法时返回 null（与 normalizeSymbolViewBox 同判据），调用方跳过该状态。
 */
function symbolGraphicBody(
  symbolMarkup: string
): { body: string; minX: number; minY: number; width: number; height: number } | null {
  const openTag = stateless(SYMBOL_OPEN_TAG_PATTERN).exec(symbolMarkup)?.[0] ?? "";
  if (!openTag) {
    return null;
  }
  const box = parseViewBox(stateless(VIEW_BOX_PATTERN).exec(openTag)?.[1] ?? "");
  if (!box) {
    return null;
  }
  const closeAt = symbolMarkup.lastIndexOf("</symbol>");
  if (closeAt < 0) {
    return null;
  }
  const rawBody = symbolMarkup.slice(openTag.length, closeAt);
  // 剥掉 <title>：独立文件里 title 对可见渲染无贡献，反而会把图元中文名重复带进正文。
  const body = rawBody.replace(TITLE_BLOCK_PATTERN, "").trim();
  return { body, minX: box.minX, minY: box.minY, width: box.width, height: box.height };
}

/** 把某个 <symbol> 的正文按其 viewBox 平移，使内容落在 viewBox 原点（本就为原点时原样返回）。 */
function wrapBodyForViewBox(body: string, minX: number, minY: number): string {
  if (minX === 0 && minY === 0) {
    return body;
  }
  return `<g transform="translate(${formatSymbolNumber(-minX)},${formatSymbolNumber(-minY)})">${body}</g>`;
}

export type StandaloneSymbolFile = {
  /** 稳定标识：`${kind}` 或 `${kind}__state_${stateValue}`（多状态时一状态一文件）。 */
  id: string;
  /** 落盘文件名（已做安全化处理，含 .svg 后缀）。 */
  fileName: string;
  /** 完整 SVG 文档文本。 */
  svg: string;
};

/** 文件名安全化：保留中英文/数字/`-`/`_`，其余替换为 `-`，并压掉重复分隔符。 */
export function safeSymbolFileStem(value: string, fallback = "component"): string {
  const stem = String(value ?? "")
    .trim()
    .replace(/[^A-Za-z0-9\u4e00-\u9fff_-]+/gu, "-")
    .replace(/-{2,}/gu, "-")
    .replace(/^-+|-+$/gu, "");
  return stem || fallback;
}

/**
 * 单模板 → 独立 SVG（把 <defs> 里的 symbol 正文内联回图形位置）。
 *
 * 返回**一个或多个**文件：多状态图元（如断路器的分/合）每个状态各一份，
 * 因为一份 SVG 只能呈现一个状态，合并会丢掉其余状态。
 *
 * 找不到 `<use>` 引用（定义异常或非 `<use>` 形式）时返回空数组，由调用方计入 skippedKinds。
 */
export function buildStandaloneSymbolFiles(
  sourceSvg: string,
  template: DeviceTemplate
): StandaloneSymbolFile[] {
  const source = String(sourceSvg ?? "");
  const kind = String(template?.kind ?? "").trim();
  if (!kind) {
    return [];
  }
  const useTag = stateless(USE_TAG_PATTERN).exec(source)?.[0] ?? "";
  const usedId = symbolIdFromUseTag(useTag);
  if (!usedId) {
    return [];
  }

  // 收集全部 symbol：id → { markup, index }。
  const symbols = new Map<string, { markup: string; index: number }>();
  let order = 0;
  for (const match of source.matchAll(SYMBOL_BLOCK_PATTERN)) {
    const markup = match[0];
    const id = symbolIdFromSymbolBlock(markup);
    if (id && !symbols.has(id)) {
      symbols.set(id, { markup, index: order++ });
    }
  }

  // 被 <use> 引用的那个排在最前 → 它就是「模板默认状态」，文件名不带后缀，保持直观。
  const ordered = [...symbols.entries()].sort((left, right) => {
    const leftPriority = left[0] === usedId ? 0 : 1;
    const rightPriority = right[0] === usedId ? 0 : 1;
    if (leftPriority !== rightPriority) {
      return leftPriority - rightPriority;
    }
    return left[1].index - right[1].index;
  });

  const files: StandaloneSymbolFile[] = [];
  const usedStems = new Set<string>();
  const label = String(template?.label ?? "").trim();
  for (const [id, entry] of ordered) {
    const graphic = symbolGraphicBody(entry.markup);
    if (!graphic) {
      continue;
    }
    const isPrimary = id === usedId;
    // 主状态的 stem 用 kind（稳定、可被脚本引用）；其余状态用 symbol id 后缀以区分。
    const idSuffix = /^(.*)_(state_[^_]+)$/u.exec(id)?.[2] ?? "";
    const stem = safeSymbolFileStem(
      isPrimary ? kind : `${kind}-${idSuffix || id}`
    );
    let fileName = `${stem}.svg`;
    let dedupeIndex = 2;
    while (usedStems.has(fileName.toLowerCase())) {
      fileName = `${stem}-${dedupeIndex++}.svg`;
    }
    usedStems.add(fileName.toLowerCase());

    const body = wrapBodyForViewBox(graphic.body, graphic.minX, graphic.minY);
    const title = label || kind;
    const svg = compactSymbolExportWhitespace(`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" preserveAspectRatio="xMidYMid meet" width="${formatSymbolNumber(graphic.width)}" height="${formatSymbolNumber(graphic.height)}" viewBox="0,0,${formatSymbolNumber(graphic.width)},${formatSymbolNumber(graphic.height)}">
<title>${escapeSymbolXmlText(title)}</title>
${body}
</svg>`);
    files.push({ id: isPrimary ? kind : `${kind}__${idSuffix || id}`, fileName, svg });
  }
  return files;
}

/** 独立 SVG 的 <title> 文本转义（& < > 三者足够，title 不进属性）。 */
function escapeSymbolXmlText(value: string): string {
  return String(value ?? "")
    .replace(/&/gu, "&amp;")
    .replace(/</gu, "&lt;")
    .replace(/>/gu, "&gt;");
}

/** ZIP 落盘名：`component-symbols-<时间戳>.zip`（与合并导出的 .svg 同前缀，便于成对识别）。 */
export function standaloneSymbolsZipFileName(timestamp = new Date()): string {
  return symbolExportFileName(timestamp).replace(/\.svg$/u, ".zip");
}

/** 独立导出结果：文件清单 + 各类计数，供后端组装响应与前端提示文案。 */
export type StandaloneSymbolExportResult = {
  files: StandaloneSymbolFile[];
  /** 成功产出文件的图元 kind，按输入顺序去重。 */
  exportedKinds: string[];
  /** 有模板但产不出独立 SVG 的 kind（定义异常兜底）。 */
  skippedKinds: string[];
};

export function buildStandaloneSymbolExport(
  templates: readonly DeviceTemplate[],
  buildTemplateSvg: (template: DeviceTemplate) => string
): StandaloneSymbolExportResult {
  const files: StandaloneSymbolFile[] = [];
  const exportedKinds: string[] = [];
  const skippedKinds: string[] = [];
  const seenIds = new Set<string>();

  for (const template of templates) {
    const kind = String(template?.kind ?? "").trim();
    if (!kind) {
      continue;
    }
    let produced: StandaloneSymbolFile[];
    try {
      produced = buildStandaloneSymbolFiles(buildTemplateSvg(template) ?? "", template);
    } catch {
      produced = [];
    }
    // 跨模板去重：同一 id 只保留首次出现的文件（kind 已在入参层去重，这里防多状态标识撞车）。
    const accepted = produced.filter((file) => {
      if (seenIds.has(file.id)) {
        return false;
      }
      seenIds.add(file.id);
      return true;
    });
    if (accepted.length === 0) {
      skippedKinds.push(kind);
      continue;
    }
    files.push(...accepted);
    exportedKinds.push(kind);
  }

  return { files, exportedKinds, skippedKinds };
}
