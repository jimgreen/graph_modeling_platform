// symbolExportSvg.ts 导出纯函数的直接单测 —— 此前 7 个函数在测试里「零直呼」。
//
// 「零直呼」的意思是：它们只被别的测试**顺带**调用到，没有任何一条断言专门钉住它们的行为。
// 后果是改坏它们时不会有任何测试报警 —— 上面 isSymbolExportTemplateVisible 那段注释
// 记的正是本文件修过的两个真实 bug（取消「竖向图元」后竖向变体残留 / 取消「其它图元」
// 把兜底类整批误杀），这两条规则必须被显式钉住，不能只靠间接捎带。
import { describe, expect, test } from "vitest";
import {
  SYMBOL_EXPORT_FILTERS,
  DEFAULT_SYMBOL_EXPORT_FILTER_KEYS,
  isSymbolExportFilterKey,
  normalizeSymbolExportFilterKeys,
  symbolExportFilterKeysForTemplate,
  isSymbolExportTemplateVisible,
  symbolExportSchemeIdFromName,
  formatSymbolNumber,
  safeSymbolFileStem
} from "./symbolExportSvg";

const keys = (t: unknown) => symbolExportFilterKeysForTemplate(t as never);

/**
 * 造一个最小图元模板。
 * 字段按 PRIMARY_FILTERS 的 matches 实际读的键来给（读实现定 fixture，不猜）：
 *   vertical  → kind 以 -vertical 结尾
 *   static    → isStaticNode(kind)
 *   adaptable → kind 命中可拉伸线路种类
 *   stateful  → 状态定义 ≥ 2
 *   bus       → kind 含 bus
 *   container → isContainer 或 params
 *   custom    → custom === true
 */
const template = (overrides: Record<string, unknown> = {}) =>
  ({ kind: "ac-load", label: "负载", ...overrides }) as never;

/**
 * 命中两个主分类的样本：kind = "ac-bus-vertical" 同时满足
 *   vertical（以 -vertical 结尾）与 bus（kind 含 bus）。
 * 这正是 isSymbolExportTemplateVisible 注释里说的「内置竖向变体全部双命中」形态。
 */
const verticalBus = template({ kind: "ac-bus-vertical", label: "交流母线（竖向）" });

/**
 * 四命中样本：kind = "ac-bus-vertical" + container + custom
 * → vertical（-vertical 结尾）、bus（kind 含 bus）、container、custom
 * 用来验证「排除优先」在多命中下逐个生效。
 */
const multiHit = template({
  kind: "ac-bus-vertical",
  label: "交流母线（竖向）",
  isContainer: true,
  custom: true
});

/** 完全未命中任何主分类的兜底样本。 */
const uncategorized = template({
  kind: "zzz-完全未注册的种类",
  label: "未归类",
  categoryLibrary: "未归类库",
  componentLibrary: "未归类库"
});

/** 命中单个主分类的样本（custom === true）。 */
const customOnly = template({ kind: "my-custom-thing", label: "自建图元", custom: true });

describe("isSymbolExportFilterKey", () => {
  test("认得全部已注册分类键", () => {
    for (const filter of SYMBOL_EXPORT_FILTERS) {
      expect(isSymbolExportFilterKey(filter.key), filter.key).toBe(true);
    }
  });

  test("拒绝未注册值（不因类型断言而放行）", () => {
    for (const bad of ["", "unknown", "BUS", "__proto__", "constructor", null, undefined, 0, 1, {}]) {
      expect(isSymbolExportFilterKey(bad), String(bad)).toBe(false);
    }
  });
});

describe("normalizeSymbolExportFilterKeys", () => {
  test("非数组返回空（不抛错）", () => {
    for (const bad of [undefined, null, "bus", 0, {}, true]) {
      expect(normalizeSymbolExportFilterKeys(bad)).toEqual([]);
    }
  });

  test("丢弃非法键并按入参顺序去重", () => {
    expect(normalizeSymbolExportFilterKeys(["stateful", "nope", "stateful", "bus"])).toEqual([
      "stateful",
      "bus"
    ]);
  });

  test("保持入参顺序（顺序会决定 symbol 输出顺序）", () => {
    const all = [...SYMBOL_EXPORT_FILTERS].map((f) => f.key);
    expect(normalizeSymbolExportFilterKeys([...all].reverse())).toEqual([...all].reverse());
  });

  test("空数组返回空", () => {
    expect(normalizeSymbolExportFilterKeys([])).toEqual([]);
  });
});

describe("symbolExportFilterKeysForTemplate", () => {
  test("命中主分类时返回那些分类，不含兜底类", () => {
    // 前提自检：custom === true 命中 custom 这一类
    const keys = symbolExportFilterKeysForTemplate(customOnly);
    expect(keys).toContain("custom");
    expect(keys).not.toContain("other");
  });

  test("未命中任何主分类时回落为 ['other']（单元素）", () => {
    // 兜底类是「未被任何主分类命中」的标记，必须恰好是单元素 —— isSymbolExportTemplateVisible
    // 靠 keys.length === 1 && keys[0] === 'other' 识别它，多一个元素就会走进正常排除逻辑。
    expect(symbolExportFilterKeysForTemplate(uncategorized)).toEqual(["other"]);
  });

  test("竖向变体确实双命中（后续断言的前提自检）", () => {
    const keys = symbolExportFilterKeysForTemplate(verticalBus);
    expect(keys).toContain("vertical");
    expect(keys).toContain("bus");
    expect(keys.length).toBeGreaterThanOrEqual(2);
  });
});

describe("isSymbolExportTemplateVisible（减法语义：取消即硬排除）", () => {
  const keysOf = (t: unknown) => symbolExportFilterKeysForTemplate(t as never);

  test("全选 → 全部可见（不误伤「全选」端点）", () => {
    for (const t of [customOnly, verticalBus, multiHit, uncategorized]) {
      expect(isSymbolExportTemplateVisible(t, DEFAULT_SYMBOL_EXPORT_FILTER_KEYS)).toBe(true);
    }
  });

  test("兜底类图元在「取消其它图元」时仍可见（回归：曾被整批误杀）", () => {
    expect(keysOf(uncategorized)).toEqual(["other"]);
    const withoutOther = DEFAULT_SYMBOL_EXPORT_FILTER_KEYS.filter((k) => k !== "other");
    expect(
      isSymbolExportTemplateVisible(uncategorized, withoutOther),
      "取消「其它图元」不应误杀兜底类"
    ).toBe(true);
  });

  test("命中多个分类时，取消任一即隐藏（回归：竖向变体曾因本体分类仍勾选而残留）", () => {
    // 排除优先：双命中的竖向母线，取消「竖向图元」或「母线图元」任一都应整类隐藏
    for (const dropped of ["vertical", "bus"]) {
      const without = DEFAULT_SYMBOL_EXPORT_FILTER_KEYS.filter((k) => k !== dropped);
      expect(
        isSymbolExportTemplateVisible(verticalBus, without),
        `取消「${dropped}」后仍可见 —— 正是这里修掉的并集语义 bug`
      ).toBe(false);
    }
  });

  test("多命中样本：取消其中任一个即隐藏（排除优先逐个生效）", () => {
    const keys = keysOf(multiHit);
    expect(keys.length, "前提：应命中 ≥3 个分类").toBeGreaterThanOrEqual(3);
    for (const dropped of keys) {
      const without = DEFAULT_SYMBOL_EXPORT_FILTER_KEYS.filter((k) => k !== dropped);
      expect(isSymbolExportTemplateVisible(multiHit, without), `取消「${dropped}」`).toBe(false);
    }
  });

  test("只勾一个分类时，该类图元全部可见（保证「勾得少也拿得全」）", () => {
    const own = keysOf(customOnly).filter((k) => k !== "other");
    expect(own).toContain("custom");
    expect(isSymbolExportTemplateVisible(customOnly, ["custom"])).toBe(true);
  });

  test("勾选集为空 → 隐藏（排除优先，无兜底）", () => {
    expect(isSymbolExportTemplateVisible(verticalBus, [])).toBe(false);
    expect(isSymbolExportTemplateVisible(customOnly, [])).toBe(false);
  });
});

describe("symbolExportSchemeIdFromName", () => {
  test("中文名保留为 slug", () => {
    expect(symbolExportSchemeIdFromName("典型方案")).toBe("scheme-典型方案");
  });

  test("非字母数字折叠为连字符、首尾剥除", () => {
    expect(symbolExportSchemeIdFromName("  My Scheme  ")).toBe("scheme-my-scheme");
    expect(symbolExportSchemeIdFromName("a  //  b")).toBe("scheme-a-b");
  });

  test("全非法字符回落为 unnamed（不产生空 id）", () => {
    for (const name of ["", "   ", "///", "!!!", "（）"]) {
      expect(symbolExportSchemeIdFromName(name), name).toBe("scheme-unnamed");
    }
  });

  test("同名的 slug 稳定（多次调用一致）", () => {
    expect(symbolExportSchemeIdFromName("方案 A")).toBe(symbolExportSchemeIdFromName("方案 A"));
  });
});

describe("formatSymbolNumber", () => {
  test("保留三位小数（去掉浮点尾巴）", () => {
    expect(formatSymbolNumber(1.2345)).toBe("1.235");
    expect(formatSymbolNumber(1.2)).toBe("1.2");
    expect(formatSymbolNumber(1)).toBe("1");
  });

  test("非有限值回落 0（不吐 NaN/Infinity）", () => {
    expect(formatSymbolNumber(Number.NaN)).toBe("0");
    expect(formatSymbolNumber(Number.POSITIVE_INFINITY)).toBe("0");
    expect(formatSymbolNumber(Number.NEGATIVE_INFINITY)).toBe("0");
  });

  test("负零归一为 '0'（不吐 '-0'）", () => {
    expect(formatSymbolNumber(-0)).toBe("0");
    expect(formatSymbolNumber(-0.0001)).toBe("0");
  });
});

describe("safeSymbolFileStem（白名单：只留字母数字/中文/下划线/连字符）", () => {
  test("路径分隔符与点被替换掉，产物不可能逃出目标目录", () => {
    // ZIP 条目名最终会进 zip.addFile，文件名若带 / 或 . 就可能形成目录层级
    for (const input of ["a/b", "a\\b", "../../etc/passwd", "..", "."]) {
      const stem = safeSymbolFileStem(input);
      expect(stem, input).not.toContain("/");
      expect(stem, input).not.toContain("\\");
      expect(stem, input).not.toBe("..");
      expect(stem, input).not.toBe(".");
    }
  });

  test("合法名原样保留（连字符/下划线/中文）", () => {
    expect(safeSymbolFileStem("ac-transformer")).toBe("ac-transformer");
    expect(safeSymbolFileStem("交流母线_1")).toBe("交流母线_1");
  });

  test("全非法字符回落为 fallback", () => {
    expect(safeSymbolFileStem("")).toBe("component");
    expect(safeSymbolFileStem("///")).toBe("component");
    expect(safeSymbolFileStem("***", "fb")).toBe("fb");
  });

  test("连续分隔符折叠、首尾剥除", () => {
    expect(safeSymbolFileStem("--a--b--")).toBe("a-b");
  });
});

describe("过滤键清单的自洽性", () => {
  test("DEFAULT 覆盖全部已注册键，且不含重复", () => {
    expect([...DEFAULT_SYMBOL_EXPORT_FILTER_KEYS].sort()).toEqual(
      [...SYMBOL_EXPORT_FILTERS.map((f) => f.key)].sort()
    );
    expect(new Set(DEFAULT_SYMBOL_EXPORT_FILTER_KEYS).size).toBe(DEFAULT_SYMBOL_EXPORT_FILTER_KEYS.length);
  });

  test("兜底类 other 存在、matches 恒 false，且不与主分类混为一谈", () => {
    const other = SYMBOL_EXPORT_FILTERS.find((f) => f.key === "other");
    expect(other, "兜底类 other 必须存在").toBeTruthy();
    // matches 恒为 false：它只是「未被任何主分类命中」的标记，不能真的去匹配
    expect(other!.matches(customOnly)).toBe(false);
    expect(other!.matches(verticalBus)).toBe(false);
    expect(other!.matches(uncategorized)).toBe(false);

    // 主分类集合 = SYMBOL_EXPORT_FILTERS 去掉 other（PRIMARY_FILTERS 未导出，此处按语义推导）
    const primaryKeys = SYMBOL_EXPORT_FILTERS.filter((f) => f.key !== "other").map((f) => f.key);
    expect(primaryKeys).not.toContain("other");
    expect(DEFAULT_SYMBOL_EXPORT_FILTER_KEYS).toContain("other");
    // 任一主分类 matches 为真时，归类结果就不该是 ['other']
    expect(keys(customOnly)).not.toEqual(["other"]);
  });
});
