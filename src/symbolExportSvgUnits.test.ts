// symbolExportSvg.ts 导出纯函数的直接单测 —— 此前 7 个函数在测试里「零直呼」。
//
// 「零直呼」的意思是：它们只被别的测试**顺带**调用到，没有任何一条断言专门钉住它们的行为。
// 后果是改坏它们时不会有任何测试报警 —— 上面 isSymbolExportTemplateVisible 那段注释
// 记的正是本文件修过的两个真实 bug（取消「竖向图元」后竖向变体残留 / 取消「其它图元」
// 把兜底类整批误杀），这两条规则必须被显式钉住，不能只靠间接捎带。
import { afterEach, describe, expect, test, vi } from "vitest";
import {
  SYMBOL_EXPORT_FILTERS,
  SYMBOL_EXPORT_SCHEME_SCHEMA_VERSION,
  DEFAULT_SYMBOL_EXPORT_FILTER_KEYS,
  isSymbolExportFilterKey,
  normalizeSymbolExportFilterKeys,
  symbolExportFilterKeysForTemplate,
  isSymbolExportTemplateVisible,
  symbolExportSchemeIdFromName,
  formatSymbolNumber,
  safeSymbolFileStem,
  normalizeSymbolExportSchemes
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

// ---------------------------------------------------------------------------
// normalizeSymbolExportSchemes：落盘载荷归一（前端侧这一份实现）
//
// ⚠ 与后端 server/symbolExportSchemes.mjs 的同名函数是**两套独立代码**：后端那份还做
// 键名小写化、32 字符上限、条数上限与严格校验，前端这份一概不做。本组只钉前端这份的真实
// 行为，不要把 server/symbolExportSchemes.test.mjs 的期望搬过来（反之亦然）。
//
// 这三条路径此前没有任何直接断言，且改坏了都不会有测试报警：
//   ① 载荷非对象（null/undefined/数组/字符串/数字）必须回落成**空方案集**而不是抛错 ——
//      落盘文件畸形时前端仍要照常打开，白屏比丢方案更严重；
//   ② 旧字段 symbolExportSchemes 的迁移回退（老版本落盘格式）仍要能读出来 ——
//      删掉这条分支的代价是「老用户的保存方案在新版本里静默变成零方案」，且不报错；
//   ③ updatedAt 缺失时回落 new Date().toISOString()，**非确定性** —— 直接断言字符串会随机
//      红（跑到哪一秒就写哪一秒），必须先把时钟钉成固定时刻再断言。
// ---------------------------------------------------------------------------

/** 假时钟的固定时刻。带毫秒是因为 toISOString() 恒带 .sss，写 0 容易看漏。 */
const FIXED_NOW = new Date("2026-03-04T05:06:07.008Z");
const FIXED_ISO = "2026-03-04T05:06:07.008Z";

describe("normalizeSymbolExportSchemes（落盘载荷归一）", () => {
  const names = (payload: unknown) =>
    normalizeSymbolExportSchemes(payload).schemes.map((scheme) => scheme.name);
  const stamps = (records: ReadonlyArray<Record<string, unknown>>) =>
    normalizeSymbolExportSchemes({ schemes: records }).schemes.map((scheme) => scheme.updatedAt);
  /** payload 的可读标签（JSON.stringify(undefined) 会返回 undefined，故兜一层）。 */
  const label = (value: unknown) => JSON.stringify(value) ?? "undefined";

  // 本组会开假时钟。**必须**在 afterEach 还原：泄漏出去会让同一 worker 里后续文件
  // （以及本文件后面不用时钟的用例）拿到被钉住的 Date，症状是「某个不相关的测试突然
  // 断言当前时间失败」，极难定位。
  afterEach(() => {
    vi.useRealTimers();
  });

  test("载荷非对象（null/undefined/数组/字符串/数字/布尔）→ 回落空方案集，不抛错", () => {
    const nonObjects: unknown[] = [null, undefined, [], ["数组载荷"], "schemes 文本", 0, 42, true, false];
    for (const payload of nonObjects) {
      const normalized = normalizeSymbolExportSchemes(payload);
      expect(normalized.schemes, label(payload)).toEqual([]);
      // schemaVersion 恒为当前常量。注意：这条断言与常量本身同源，改常量时两边一起变，
      // 所以它**不是**「版本号不能改」的守卫；真正的载荷侧判据见下面旧字段那条。
      expect(normalized.schemaVersion, label(payload)).toBe(SYMBOL_EXPORT_SCHEME_SCHEMA_VERSION);
    }
  });

  test("条目层同样过滤：非对象条目丢弃，数组即使带 name 也丢，只有空白名的丢弃", () => {
    // 与上面载荷层的判断是两处独立代码（一个整包归 {}，一个逐条 continue）
    const namedArray = Object.assign([], { name: "数组带名" });
    expect(names({ schemes: ["字符串", 42, null, namedArray, { name: "留我" }] })).toEqual(["留我"]);
    // 空白名靠 trim 后判空丢弃 —— "   " 是这里唯一能验到 trim 的输入，
    // 光断言 name: "" 会与「字符串拼出空名」的等价写法分不开。
    expect(names({ schemes: [{ name: "   " }, { name: "" }, { name: null }, { id: "只有 id" }] }))
      .toEqual([]);
  });

  test("旧字段 symbolExportSchemes 仍被读取（迁移兼容路径）", () => {
    // 老版本落盘格式：顶层只有 symbolExportSchemes，完全没有 schemes 键 ——
    // 这是唯一能验到那条回退分支的输入（两字段同时存在时被新字段压住，见优先级那条）。
    const legacy = {
      schemaVersion: 0,
      symbolExportSchemes: [
        {
          id: "  old-1  ",
          name: "  老方案  ",
          templateKinds: [" ac-load ", "ac-load", "", null],
          filterKeys: ["bus", "bogus"]
        }
      ]
    };
    const normalized = normalizeSymbolExportSchemes(legacy);
    expect(normalized.schemes).toHaveLength(1);
    expect(normalized.schemes[0]).toMatchObject({
      id: "old-1",
      name: "老方案",
      templateKinds: ["ac-load"],
      filterKeys: ["bus"]
    });
    // 载荷自带的 schemaVersion（这里是 0）被忽略，一律归一到当前常量：
    // 老文件的版本号不认识也必须能读进来，否则「升级即丢方案」。
    expect(normalized.schemaVersion).toBe(SYMBOL_EXPORT_SCHEME_SCHEMA_VERSION);
    expect(normalized.schemaVersion).not.toBe(0);
  });

  test("新字段存在但不是数组时才回退旧字段（判据是 Array.isArray，不是 ?? 兜底）", () => {
    // 若把 `Array.isArray(source.schemes) ? … : source.symbolExportSchemes` 改成
    // `source.schemes ?? source.symbolExportSchemes`：字符串会让 for…of 逐字符迭代、
    // 全被条目层过滤掉 → 变成空集；对象根本不可迭代 → 直接抛 TypeError。两条都会红。
    const legacy = { symbolExportSchemes: [{ name: "老方案" }] };
    for (const bad of [null, undefined, "schemes", 0, false, {}]) {
      expect(names({ ...legacy, schemes: bad }), `schemes=${label(bad)}`).toEqual(["老方案"]);
    }
  });

  test("新旧字段同时存在 → 新字段 schemes 优先，旧字段整批不参与", () => {
    expect(names({ schemes: [{ name: "新方案" }], symbolExportSchemes: [{ name: "旧方案" }] }))
      .toEqual(["新方案"]);
    // ★ 空数组也优先：新字段「在场」的判据是 Array.isArray，不是长度。
    // 把它改成 length > 0 判据时，只有这条能红 —— 上面那条两条路径产出不同，
    // 靠它验不出「空数组」这个边界。
    expect(names({ schemes: [], symbolExportSchemes: [{ name: "旧方案" }] })).toEqual([]);
  });

  test("updatedAt 缺失或空白 → 回落假时钟的固定时刻（钉住 new Date 的非确定性）", () => {
    // 只假 Date，不假 setTimeout/setInterval：泄漏面最小，且本函数只用 new Date()。
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(FIXED_NOW);
    expect(vi.isFakeTimers(), "前提自检：假时钟确实装上了").toBe(true);

    const records = [
      { name: "无字段" },
      { name: "显式 undefined", updatedAt: undefined },
      { name: "显式 null", updatedAt: null },
      { name: "空串", updatedAt: "" },
      { name: "纯空白", updatedAt: "   " }
    ];
    const values = stamps(records);
    expect(values).toEqual(records.map(() => FIXED_ISO));
    // 回落源确实是当前时钟而非某个写死的常量：固定时刻与此刻的 Date 读数一致。
    expect(values[0]).toBe(new Date().toISOString());
  });

  test("不钉时钟时回落的是真实当前时刻（证明回落源确为 new Date 而非常量）", () => {
    const before = Date.now();
    const value = stamps([{ name: "现取" }])[0];
    expect(value).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u);
    expect(value).not.toBe(FIXED_ISO);
    // 解析回的毫秒必须落在调用前后的窗口内（不写死具体值，容忍跨毫秒边界）
    expect(Date.parse(value)).toBeGreaterThanOrEqual(before - 1000);
    expect(Date.parse(value)).toBeLessThanOrEqual(Date.now() + 1000);
  });

  test("updatedAt 给了就原样透传：ISO 串只 trim，时间戳数字按 String 原样、不转 ISO", () => {
    // 断言的是**真实行为**而非期望行为：数字时间戳不会被归一化成 ISO 串。
    // 若将来要改成 ISO 转换，这条会红 —— 那是有意的提醒，届时连同 server 那份一起改。
    const cases: Array<[unknown, string]> = [
      ["2026-01-02T03:04:05.000Z", "2026-01-02T03:04:05.000Z"],
      ["  2026-01-02T03:04:05.000Z  ", "2026-01-02T03:04:05.000Z"],
      [1700000000000, "1700000000000"],
      // ★ 0 / false 是 falsy，但 String() 之后是 "0" / "false" 非空 → 仍然透传、不回落。
      // 这两条验的是「回落的判据是 trim 后的字符串是否为空」，而不是「原值是否 truthy」；
      // 只给一条合法时间戳的话，两种写法产出完全相同，永远分不开。
      [0, "0"],
      [false, "false"]
    ];
    const records = cases.map(([updatedAt], index) => ({ name: `方案${index}`, updatedAt }));
    expect(stamps(records)).toEqual(cases.map(([, expected]) => expected));
  });

  test("updatedAt 非法格式不校验、原样透传（只有空串/纯空白才回落）", () => {
    const values = stamps([
      { name: "英文垃圾", updatedAt: "not-a-date" },
      { name: "越界日期", updatedAt: "2026-13-45" },
      { name: "裸数字串", updatedAt: "0" },
      { name: "带空白垃圾", updatedAt: "  not-a-date  " }
    ]);
    expect(values).toEqual(["not-a-date", "2026-13-45", "0", "not-a-date"]);
    // 顺带钉住「本函数不做格式校验」：前两个连 Date.parse 都不认，照样透传。
    expect(Date.parse(values[0])).toBeNaN();
    expect(Date.parse(values[1])).toBeNaN();
  });

  test("假时钟已在 afterEach 还原（不泄漏给同 worker 的后续用例）", () => {
    // 本组最后一条，且它自己不开假时钟 —— 文件内用例按声明顺序执行，
    // 所以这里的 isFakeTimers() 检查的是上面几条用完 afterEach 之后的状态。
    expect(vi.isFakeTimers()).toBe(false);
    expect(Math.abs(Date.now() - FIXED_NOW.getTime())).toBeGreaterThan(60_000);
  });
});
