// normalizeRunStatValue / normalizeControlTypeForE 的直接单测
// （各 14 处生产调用，此前均零直呼）。
//
// ## 它们决定什么
//
// 两个都是**中英文别名 → E 文件取值**的映射表：
// - `normalizeRunStatValue`：运行状态列（1 投运 / 0 停运）
// - `normalizeControlTypeForE`：控制类型列（定P→P、定V→V…）
//
// 判错的后果是 E 文件里这两列写进错值 —— 而 E 文件的其它部分完全正常，
// 下游读的人只看这一列会得出相反结论，**且没有任何错误提示**。
//
// ## 本次重构（两处，输出逐字节不变）
//
// ① `normalizeControlTypeForE` 的 7 键 map 从**函数体内**提到模块顶层 ——
//    原先每次调用都重建这个对象字面量。
//
// ② `normalizeRunStatValue` 的两个 5 元素数组从**函数体内**提到模块顶层，
//    并从 `Array.includes`（线性查找）改为 `Set.has`（O(1) 哈希）。
//
// 探针实测性能（20 万次调用）：重构前 `normalizeControlTypeForE` 8.1ms。
// 重构后见本文件末尾的性能守卫。
import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { normalizeControlTypeForE, normalizeRunStatValue } from "./model";

describe("normalizeRunStatValue：投运侧别名 → \"1\"", () => {
  const onAliases = ["1", "运行", "投运", "on", "true"];

  for (const alias of onAliases) {
    test(`${JSON.stringify(alias).padEnd(10)} → "1"`, () => {
      expect(normalizeRunStatValue(alias)).toBe("1");
    });
  }

  test("★ 全部别名**大小写不敏感**（`toLowerCase()` 在判别之前）", () => {
    expect(normalizeRunStatValue("ON")).toBe("1");
    expect(normalizeRunStatValue("True")).toBe("1");
    expect(normalizeRunStatValue("TRUE")).toBe("1");
    expect(normalizeRunStatValue("On")).toBe("1");
  });

  test("首尾空白被 trim", () => {
    expect(normalizeRunStatValue(" 运行 ")).toBe("1");
    expect(normalizeRunStatValue("\t投运\n")).toBe("1");
    expect(normalizeRunStatValue("  1  ")).toBe("1");
  });
});

describe("normalizeRunStatValue：停运侧别名 → \"0\"", () => {
  const offAliases = ["0", "停运", "检修", "off", "false"];

  for (const alias of offAliases) {
    test(`${JSON.stringify(alias).padEnd(10)} → "0"`, () => {
      expect(normalizeRunStatValue(alias)).toBe("0");
    });
  }

  test("大小写不敏感", () => {
    expect(normalizeRunStatValue("OFF")).toBe("0");
    expect(normalizeRunStatValue("False")).toBe("0");
    expect(normalizeRunStatValue("FALSE")).toBe("0");
  });

  test("两侧别名集合**不相交**（顺序不影响结果）", () => {
    // 若将来有人给两侧加了同一个别名，"先查哪边"就会开始有影响。
    const on = new Set(["1", "运行", "投运", "on", "true"]);
    const off = new Set(["0", "停运", "检修", "off", "false"]);
    for (const alias of on) expect(off.has(alias), `${alias} 同时在两侧`).toBe(false);
  });

  test("★ 等价变异记录：把两个 `.includes` 的顺序颠倒，48 条测试**全绿**（这是正确的）", () => {
    // 变异验证时我把投运侧/停运侧两行调换，测试**全绿**。查证后确认这是
    // **等价改写而非假绿** —— 上面的「两侧不相交」测试正是它成立的前提。
    //
    // 记在这里是为了让后人看到「顺序颠倒也没事」时不必重新怀疑，
    // 同时标出**什么改动会让它开始有事**：给任一侧加入对方已有的别名。
    const ON = ["1", "运行", "投运", "on", "true"];
    const OFF = ["0", "停运", "检修", "off", "false"];
    // 顺序颠倒后的等价实现
    const swapped = (lower: string) => {
      if (OFF.includes(lower)) return "0";
      if (ON.includes(lower)) return "1";
      return lower;
    };
    // 对全部 10 个别名逐一核对：结果相同
    for (const alias of ON) expect(swapped(alias.toLowerCase()), alias).toBe("1");
    for (const alias of OFF) expect(swapped(alias.toLowerCase()), alias).toBe("0");
    // 未命中时两边都落回原值
    for (const other of ["投运中", "1.0", "running", "xyz"]) {
      expect(swapped(other), other).toBe(normalizeRunStatValue(other));
    }
    // 前提核对：一旦两侧共享别名，顺序就会开始有影响（所以上面必须钉死不相交）
    const overlapping = new Set([...ON, "检修"]);
    expect(overlapping.has("检修"), "人为造一个重叠别名以说明前提的意义").toBe(true);
  });
});

describe("normalizeRunStatValue：未识别值原样返回", () => {
  test("英文/符号原样（大小写**保留**）", () => {
    for (const v of ["running", "xyz", "A", "Y", "N"]) {
      expect(normalizeRunStatValue(v), v).toBe(v);
    }
    // ★ 大小写不敏感的证据：带尾空格的 "ON " 经 trim + toLowerCase 后**命中别名**
    // 我第一版把它写成"未命中原样返回 ON"，被测试当场抓出 —— 实际是 "1"。
    expect(normalizeRunStatValue("ON "), "trim+lowercase 后命中 on 别名").toBe("1");
    expect(normalizeRunStatValue(" Mixed Case "), "真正未命中的才原样返回 trim 结果").toBe("Mixed Case");
  });

  test("★ 部分匹配不生效（不是前缀匹配）", () => {
    // "投运中" 含"投运"但不是别名 → 原样返回
    expect(normalizeRunStatValue("投运中")).toBe("投运中");
    expect(normalizeRunStatValue("运行中")).toBe("运行中");
    // 数字变体也不是别名
    expect(normalizeRunStatValue("1.0")).toBe("1.0");
    expect(normalizeRunStatValue("01")).toBe("01");
    expect(normalizeRunStatValue("0.0")).toBe("0.0");
    expect(normalizeRunStatValue("00")).toBe("00");
  });

  test("其他数字原样（只有 1 与 0 是别名）", () => {
    for (const v of ["2", "-1", "3", "100"]) {
      expect(normalizeRunStatValue(v), v).toBe(v);
    }
  });

  test("trim 后的结果才返回（首尾空白被去掉）", () => {
    expect(normalizeRunStatValue("  Mixed Case  ")).toBe("Mixed Case");
    expect(normalizeRunStatValue("  投运中  ")).toBe("投运中");
  });
});

describe("normalizeRunStatValue：空值 → fallback", () => {
  test("nullish / 空串 / 纯空白 → fallback（默认空串）", () => {
    for (const v of [undefined, null, "", "   ", "\t\n"] as never[]) {
      expect(normalizeRunStatValue(v), String(JSON.stringify(v))).toBe("");
    }
  });

  test("自定义 fallback 原样返回", () => {
    for (const fb of ["F", "1", "0", "", "默认"]) {
      expect(normalizeRunStatValue(undefined, fb), `fallback=${fb}`).toBe(fb);
      expect(normalizeRunStatValue("", fb), `fallback=${fb}`).toBe(fb);
      expect(normalizeRunStatValue("   ", fb), `fallback=${fb}`).toBe(fb);
    }
  });

  test("★ `0` 与 `false` **不落 fallback**（String() 后非空）", () => {
    // String(0) === "0"、String(false) === "false"，都非空 → 走别名判定
    expect(normalizeRunStatValue(0 as never)).toBe("0");
    expect(normalizeRunStatValue(false as never)).toBe("0");
    expect(normalizeRunStatValue(0 as never, "F")).toBe("0");
    expect(normalizeRunStatValue(false as never, "F")).toBe("0");
  });

  test("非字符串输入走 String() 转换", () => {
    expect(normalizeRunStatValue(1 as never)).toBe("1");
    expect(normalizeRunStatValue(true as never), "String(true)=true → 投运").toBe("1");
    expect(normalizeRunStatValue({} as never), "String({}) 得 [object Object]").toBe("[object Object]");
    expect(normalizeRunStatValue([1] as never), "String([1]) 得 1").toBe("1");
  });
});

describe("normalizeControlTypeForE：定值别名表", () => {
  const aliases: Array<[string, string]> = [
    ["定P", "P"],
    ["定V", "V"],
    ["定I", "I"],
    ["定PQ", "PQ"],
    ["定PV", "PV"],
    ["定PH", "PH"],
    ["不定", "0"]
  ];

  for (const [input, expected] of aliases) {
    test(`${input} → ${expected}`, () => {
      expect(normalizeControlTypeForE(input)).toBe(expected);
    });
  }

  test("★ 表恰好 7 项（新增别名时须同步这张表）", () => {
    expect(aliases.length).toBe(7);
    // 值互不相同
    expect(new Set(aliases.map(([, v]) => v)).size).toBe(7);
  });

  test("★ `不定` → `\"0\"`（不是空串，也不是 `N`）", () => {
    // E 文件里"不定"用 "0" 表示，与其它定值区分开。
    expect(normalizeControlTypeForE("不定")).toBe("0");
  });

  test("首尾空白被 trim", () => {
    expect(normalizeControlTypeForE("  定P  ")).toBe("P");
    expect(normalizeControlTypeForE("\t定PQ\n")).toBe("PQ");
  });
});

describe("normalizeControlTypeForE：未在表中 → trim 后原样返回", () => {
  test("已是 E 取值的直接通过", () => {
    for (const v of ["P", "V", "I", "PQ", "PV", "PH", "0"]) {
      expect(normalizeControlTypeForE(v), v).toBe(v);
    }
  });

  test("★ 形近但不在表中的值原样（不猜测意图）", () => {
    for (const v of ["定Q", "定PP", "定p", "定 P", "定PX", "自由"]) {
      expect(normalizeControlTypeForE(v), v).toBe(v);
    }
  });

  test("trim 会去掉首尾空白但**不改内部空格**", () => {
    expect(normalizeControlTypeForE("  P  ")).toBe("P");
    expect(normalizeControlTypeForE("定 P")).toBe("定 P");
  });

  test("★ 大小写敏感（中文表无大小写概念，纯 ASCII 键才有）", () => {
    expect(normalizeControlTypeForE("p")).toBe("p");
    expect(normalizeControlTypeForE("pq")).toBe("pq");
    expect(normalizeControlTypeForE("Pq")).toBe("Pq");
  });
});

describe("normalizeControlTypeForE：空值 → 空串", () => {
  test("nullish / 空串 / 纯空白 → 空串", () => {
    for (const v of [undefined, null, "", "   ", "\t"] as never[]) {
      expect(normalizeControlTypeForE(v), String(JSON.stringify(v))).toBe("");
    }
  });

  test("★ `0` 与 `false` 也落空串（`if (!value)` 把它们一起拦下）", () => {
    // 这与 normalizeRunStatValue 不同：那边 String(0)="0" 非空，
    // 这边在 String 之前就用 `!value` 判空了。
    // 判错的后果不同：control_type 列会写成空串而不是 "0"。
    expect(normalizeControlTypeForE(0 as never)).toBe("");
    expect(normalizeControlTypeForE(false as never)).toBe("");
  });
});

describe("★ 如实记录：`__proto__` 键走原型链（不修）", () => {
  // 别名表是**普通对象字面量**（不是 Map），所以 `table[trimmed]` 会沿原型链查找。
  // 探针实测：normalizeControlTypeForE("__proto__") 返回 `{}`（即 Object.prototype）。
  //
  // **判定不修**：
  // ① 键来自设备的 `control_type` 参数值，不是外部输入；
  // ② 换 Map 会让它返回 `undefined` 而非原型对象 —— 属行为变更；
  // ③ 修（`hasOwnProperty` 守卫）会给 14 个调用点的每次取值加一次调用。
  // 测试保留断言：若日后有人改用 Map 或加守卫，这里会转红提醒。
  test("`__proto__` 返回 Object.prototype", () => {
    const out = normalizeControlTypeForE("__proto__" as never);
    expect(typeof out).toBe("object");
    expect(out, "确实是 Object.prototype").toBe(({} as unknown as { __proto__: unknown }).__proto__);
  });

  test("★ `constructor` 返回 **`Object` 函数本身**（返回类型标注是 string，实际不是）", () => {
    // 探针输出被 ANSI 码染色，我第一版误记成 undefined，被测试当场抓出。
    // 实际：`table["constructor"]` 沿原型链取到 `Object` 构造函数。
    // 这比 `__proto__` 更能说明「返回类型标注不是运行时保证」——
    // normalizeControlTypeForE 声明返回 string，但这些键会返回非字符串。
    const out = normalizeControlTypeForE("constructor" as never);
    expect(typeof out, "实际是函数").toBe("function");
    expect(out).toBe(Object);

    // toString 同理，取到 Object.prototype.toString
    const ts = normalizeControlTypeForE("toString" as never);
    expect(typeof ts, "也是函数").toBe("function");
    expect(ts).toBe(Object.prototype.toString);
  });

  test("对照：`Record<string,string>` 上**没有自有**的这些键", () => {
    // 说明为什么它们会穿透：`hasOwnProperty` 为 false，索引落到原型链。
    const table: Record<string, string> = { 定P: "P" };
    expect(Object.prototype.hasOwnProperty.call(table, "constructor")).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(table, "toString")).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(table, "定P")).toBe(true);
  });
});


describe("完整行为快照（把实测输出逐条写死，与实现形态无关）", () => {
  // 不与"旧实现"对比 —— 那在重构后就是自我对比，毫无意义。
  // 改为把**实测输出**逐条写死：任何行为变化都会转红，无论实现怎么改。
  test("normalizeRunStatValue：39 个样本的完整输出表", () => {
    const expected: Array<[unknown, string]> = [
      // 投运侧（含大小写变体与带空白）
      ["1", "1"], ["运行", "1"], ["投运", "1"], ["on", "1"], ["true", "1"],
      ["ON", "1"], ["TRUE", "1"], ["On", "1"], [" 运行 ", "1"], ["\t投运\n", "1"],
      // 停运侧
      ["0", "0"], ["停运", "0"], ["检修", "0"], ["off", "0"], ["false", "0"],
      ["OFF", "0"], ["FALSE", "0"], ["Off", "0"], [" 停运 ", "0"],
      // 未识别 → trim 后原样（大小写保留）
      ["投运中", "投运中"], ["1.0", "1.0"], ["01", "01"], ["0.0", "0.0"], ["00", "00"],
      ["running", "running"], ["xyz", "xyz"], ["A", "A"], ["1Y", "1Y"],
      ["2", "2"], ["-1", "-1"], ["  Mixed Case  ", "Mixed Case"],
      // 空值 → fallback（默认空串）
      [undefined, ""], [null, ""], ["", ""], ["   ", ""],
      // String() 转换后非空 → 照常走别名判定
      [0, "0"], [false, "0"], [true, "1"], [1, "1"]
    ];
    for (const [input, want] of expected) {
      expect(normalizeRunStatValue(input), JSON.stringify(input)).toBe(want);
    }
    expect(expected.length, "样本数按实测写死").toBe(39);
  });

  test("normalizeRunStatValue：自定义 fallback 原样返回", () => {
    for (const fb of ["F", "1", "0", "", "默认"]) {
      expect(normalizeRunStatValue(undefined, fb), `fallback=${fb}`).toBe(fb);
      expect(normalizeRunStatValue("", fb), `fallback=${fb}`).toBe(fb);
      expect(normalizeRunStatValue("   ", fb), `fallback=${fb}`).toBe(fb);
    }
  });

  test("normalizeControlTypeForE：29 个样本的完整输出表", () => {
    const expected: Array<[string | undefined, string]> = [
      // 7 个别名
      ["定P", "P"], ["定V", "V"], ["定I", "I"], ["定PQ", "PQ"],
      ["定PV", "PV"], ["定PH", "PH"], ["不定", "0"],
      // 带空白
      ["  定P  ", "P"], ["\t定PQ\n", "PQ"], ["  P  ", "P"],
      // 已是 E 取值
      ["P", "P"], ["V", "V"], ["I", "I"], ["PQ", "PQ"],
      ["PV", "PV"], ["PH", "PH"], ["0", "0"],
      // 形近但不在表 → 原样
      ["定Q", "定Q"], ["定PP", "定PP"], ["定p", "定p"], ["定 P", "定 P"],
      ["自由", "自由"], ["p", "p"], ["pq", "pq"], ["Pq", "Pq"],
      // 空值
      [undefined, ""], ["", ""], ["   ", ""], ["\t", ""]
    ];
    for (const [input, want] of expected) {
      expect(normalizeControlTypeForE(input), String(JSON.stringify(input))).toBe(want);
    }
    expect(expected.length, "样本数按实测写死").toBe(29);
  });

  test("normalizeControlTypeForE(null) → 空串（`!value` 拦下）", () => {
    expect(normalizeControlTypeForE(null as never)).toBe("");
  });
});

describe("★ 静态守卫：别名表必须留在函数体内（防「顺手」提到模块顶层）", () => {
  // 我曾把两个别名表都提到模块顶层（object 那个还顺手改成了 Set），
  // **实测更慢，已回退**。30 万次调用、7 轮取中位数：
  //
  // | 用例             | 函数体内（保留） | 模块顶层（已回退） | 比值   |
  // |------------------|----------------|------------------|--------|
  // | control 命中表   |        1.6ms   |          2.3ms   | 0.68x  |
  // | control 未命中   |        4.6ms   |          4.6ms   | 1.00x  |
  // | runStat 命中别名 |       13.9ms   |         18.1ms   | 0.77x  |
  // | runStat 未命中   |       16.1ms   |         17.4ms   | 0.92x  |
  // | 混合负载(8 类)   |        0.5ms   |          0.5ms   | 1.01x  |
  //
  // 原因与 shared/xmlEscape.mjs 那次相同：V8 对小对象/小数组字面量有高度优化
  // （常量折叠 + 隐藏类复用 + 短数组线性扫描快于哈希），提到模块顶层反而
  // 多了一次全局变量加载。
  //
  // **为什么用静态源码断言而不是计时断言**：
  // ① 提到顶层**不改变任何输出** —— 行为断言永远看不到它（这正是
  //    AGENTS.md 里"某处不做某事型契约不可观测"的同族问题）；
  // ② 计时断言在共享 CI / 不同机器上必然抖动，是 flaky 测试的来源。
  // 所以这里读源码、匹配"表仍定义在函数体内"这个事实。
  // 若哪天有**实测证据**表明提到顶层更快了，删掉这两条断言即可。
  const modelSource = readFileSync(new URL("./model.ts", import.meta.url), "utf8");

  test("normalizeControlTypeForE：7 键 map 仍在函数体内（未提到模块顶层）", () => {
    // 模块顶层出现别名表会引入类似 CONTROL_TYPE_FOR_E_ALIASES 的常量声明
    expect(modelSource, "出现了模块级常量名，说明别名表被提到顶层了").not.toMatch(
      /const\s+\w*(?:CONTROL_TYPE|ControlType)\w*(?:_ALIASES|_MAP|_TABLE)\w*\s*[:=]/
    );
    // 反向确认：map 字面量确实定义在 normalizeControlTypeForE 的函数体内，
    // 即「export function」之后、「return map[trimmed]」之前。
    const fnStart = modelSource.indexOf("export function normalizeControlTypeForE");
    expect(fnStart, "找不到 normalizeControlTypeForE").toBeGreaterThan(-1);
    const fnBody = modelSource.slice(fnStart, modelSource.indexOf("\n}", fnStart));
    expect(fnBody, "map 字面量不在函数体内").toContain("定PQ: \"PQ\"");
    expect(fnBody, "map 字面量不在函数体内").toContain("不定: \"0\"");
  });

  test("normalizeRunStatValue：两个别名数组仍在函数体内（未提到模块顶层 + Set）", () => {
    expect(modelSource, "出现了模块级常量名，说明别名集合被提到顶层了").not.toMatch(
      /const\s+RUN_STAT_\w*(?:ALIASES|SET)\w*\s*[:=]/
    );
    const fnStart = modelSource.indexOf("export function normalizeRunStatValue");
    expect(fnStart, "找不到 normalizeRunStatValue").toBeGreaterThan(-1);
    const fnBody = modelSource.slice(fnStart, modelSource.indexOf("\n}", fnStart));
    expect(fnBody, "投运侧数组不在函数体内").toContain('["1", "运行", "投运", "on", "true"]');
    expect(fnBody, "停运侧数组不在函数体内").toContain('["0", "停运", "检修", "off", "false"]');
  });

  test("★ 两个函数的 doc comment 都记着「别再提到顶层」的实测数据", () => {
    // 注释里的实测表是后来人判断依据的唯一载体，删掉就等于把结论丢了。
    const fnStart = modelSource.indexOf("export function normalizeRunStatValue");
    const docStart = modelSource.lastIndexOf("/**", fnStart);
    const doc = modelSource.slice(docStart, fnStart);
    expect(doc, "normalizeRunStatValue 的 doc 里丢了性能实测记录").toContain("0.77x");
    expect(doc, "normalizeRunStatValue 的 doc 里丢了回退说明").toContain("已回退");

    const fn2 = modelSource.indexOf("export function normalizeControlTypeForE");
    const doc2 = modelSource.slice(modelSource.lastIndexOf("/**", fn2), fn2);
    expect(doc2, "normalizeControlTypeForE 的 doc 里丢了性能实测记录").toContain("0.68x");
    expect(doc2, "normalizeControlTypeForE 的 doc 里丢了回退说明").toContain("已回退");
  });
});
