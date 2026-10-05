// shared/deviceParameterChineseNames.mjs 的契约测试 —— 此前零覆盖。
//
// 它决定 E 文件 / CIM 导出的**字段中文表头**。表头错了不会让导出失败，
// 只会在下游系统里显示成一列乱码或错误的列名 —— 属于静默劣化，
// 端到端导出测试（用的都是已知字段）抓不到。
//
// 这里只测「契约」而非逐条查表内容：一批代表性字段的映射、通用名识别、
// 以及 meaningfulDeviceParameterChineseName 的取舍优先级。
import { describe, expect, test } from "vitest";
import {
  normalizeDeviceParameterEnglishName,
  isGenericCustomParameterChineseName,
  inferDeviceParameterChineseName,
  meaningfulDeviceParameterChineseName
} from "./deviceParameterChineseNames.mjs";

describe("normalizeDeviceParameterEnglishName", () => {
  test("去空白并把中文名规范成英文（空则空串）", () => {
    expect(typeof normalizeDeviceParameterEnglishName("  rdf_id  ")).toBe("string");
    expect(normalizeDeviceParameterEnglishName("")).toBe("");
    expect(normalizeDeviceParameterEnglishName(null)).toBe("");
    expect(normalizeDeviceParameterEnglishName(undefined)).toBe("");
  });
});

describe("isGenericCustomParameterChineseName", () => {
  test("识别含「自定义参数」的占位名（含带序号的变体）", () => {
    // 实现是 /自定义参数/ 包含匹配，故「自定义参数1」也算占位
    expect(isGenericCustomParameterChineseName("自定义参数")).toBe(true);
    expect(isGenericCustomParameterChineseName("自定义参数1")).toBe(true);
  });

  test("不含该四字的「自定义」不算占位", () => {
    // 钉住真实语义：正则是「自定义参数」四字整体，不是「自定义」
    expect(isGenericCustomParameterChineseName("自定义")).toBe(false);
  });

  test("真实业务名不算通用名", () => {
    expect(isGenericCustomParameterChineseName("额定容量")).toBe(false);
    expect(isGenericCustomParameterChineseName("有功值")).toBe(false);
  });
});

describe("inferDeviceParameterChineseName", () => {
  test("核心 E 字段给出确定的中文名", () => {
    const cases = [
      ["rdf_id", "原始标识"],
      ["idx", "设备序号"],
      ["name", "设备名称"],
      ["dev_type", "设备类型"],
      ["i_node", "首端节点号"],
      ["j_node", "末端节点号"],
      ["parent", "所属模型"]
    ];
    for (const [en, expected] of cases) {
      expect(inferDeviceParameterChineseName(en), `${en} 的中文名`).toBe(expected);
    }
  });

  test("多端设备的第 N 端关联序号能推出来", () => {
    const label = inferDeviceParameterChineseName("idx_ac_load_t1");
    expect(typeof label).toBe("string");
    expect(label.length).toBeGreaterThan(0);
  });

  test("未登记的字段返回 undefined（调用方据此回落到兜底文案）", () => {
    // 实现的返回类型是 string | undefined（不是 null）—— 钉住这一点，
    // 因为 meaningfulDeviceParameterChineseName 靠 `?? 兜底` 接住它。
    for (const en of ["zzz_unknown_field", "", "   ", "___"]) {
      expect(inferDeviceParameterChineseName(en)).toBeUndefined();
    }
  });
});

// 原型链键守卫 —— 两张标签表（EXACT_PARAMETER_LABELS / TOKEN_LABELS）都是普通对象
// 字面量，直接 `TABLE[key]` 会命中 Object.prototype 上的成员。英文参数名来自工程文件，
// 属外部输入，且这个函数的返回值直接当 E 文件 / CIM 的**字段中文表头**用。
//
// ⚠ 先钉清一个事实，否则下面一半断言会被误读（实测 normalize 后的键，见注释）：
//   5 个原型链键里**只有 `constructor` 真的漏**。另外 4 个在到达查表口之前就被
//   normalizeDeviceParameterEnglishName 拆掉了驼峰/下划线：
//     toString → to_string、hasOwnProperty → has_own_property、valueOf → value_of、
//     __proto__ → proto（先 _+ 折叠成 _proto_，再剥掉首尾下划线）
//   它们都不是任何一张表的自有键，删掉守卫照样返回 undefined —— 属于**回归锁**，
//   不是承重断言。真正能杀掉守卫的是 `constructor` 的三条路径（下面三个 ★ 用例）。
describe("inferDeviceParameterChineseName：原型链键守卫", () => {
  const PROTOTYPE_CHAIN_KEYS = ["constructor", "__proto__", "toString", "hasOwnProperty", "valueOf"];

  test("5 个原型链键查表返回 undefined，不是函数也不是对象", () => {
    // 钉住真实返回形态：未知参数 → undefined（不是空串、不是 null），
    // 调用方 meaningfulDeviceParameterChineseName 靠 `?? 兜底` 接住它。
    // 「不是函数也不是对象」单独再断言一遍：这正是修复前的泄漏形态
    // （constructor 拿到函数 Object，__proto__ 拿到 Object.prototype 对象），
    // 两种形态都会被下游拼进表头字符串。
    for (const key of PROTOTYPE_CHAIN_KEYS) {
      const label = inferDeviceParameterChineseName(key);
      expect(label, key).toBeUndefined();
      expect(typeof label, `${key} 不应是函数`).not.toBe("function");
      expect(typeof label, `${key} 不应是对象`).not.toBe("object");
    }
  });

  test("★ 裸 constructor 精确查表口：修复前返回的是函数 Object 本身", () => {
    // 这条是守卫的承重断言。修复前：EXACT_PARAMETER_LABELS["constructor"] 命中
    // Object.prototype.constructor（即 Object 构造器），函数经 `if (exact) return exact`
    // 原样返回 —— 返回类型变成 function，违反 d.mts 声明的 string | undefined。
    const label = inferDeviceParameterChineseName("constructor");
    expect(label, "constructor 不得返回函数").not.toBeInstanceOf(Function);
    expect(label).toBeUndefined();
  });

  test("★ 带侧前缀的 constructor 走前缀剥离后的查表口", () => {
    // 第二个查表口：SIDE_PREFIXES 循环里 `exactParameterLabel(baseName) ?? ...`。
    // 修复前 EXACT_PARAMETER_LABELS["constructor"] 命中的函数**不是 nullish**，
    // 所以 `??` 短路不生效，函数被当成 baseLabel 拼进模板字符串 ——
    // 实测得到「首端function Object() { [native code] }」，直接落进导出表头。
    expect(inferDeviceParameterChineseName("source_constructor")).toBeUndefined();
    expect(inferDeviceParameterChineseName("ac_constructor")).toBeUndefined();
    expect(inferDeviceParameterChineseName("i_constructor")).toBeUndefined();
    expect(inferDeviceParameterChineseName("high_constructor")).toBeUndefined();
    // 不另加 `not.toContain("native code")`：toContain 要求实参是字符串，而修复后
    // 的正确返回正是 undefined —— 加了会在**修复生效时**报类型错。
    // toBeUndefined 已含这条语义：含函数源码的串不可能同时是 undefined。
  });

  test("★ 拆 token 后的 constructor 走 TOKEN_LABELS 查表口", () => {
    // 第三个查表口：translatedTokenPhrase 用 `labels.every(Boolean)` 判成败。
    // TOKEN_LABELS["constructor"] 命中函数，函数是 truthy ⇒ every 通过 ⇒
    // 函数被 join 进结果。实测修复前得到「额定function Object() { [native code] }」。
    // 注意这里 token 必须是 normalize 后的原文：拆的是 `_`，所以要写 rated_constructor，
    // 而不是直接写 constructor（那走的是上面的精确表口，不是这条路径）。
    for (const key of ["rated_constructor", "constructor_set", "set_constructor"]) {
      const label = inferDeviceParameterChineseName(key);
      expect(label, key).not.toBeInstanceOf(Function);
      expect(label, key).toBeUndefined();
    }
  });

  test("正常键不受守卫影响：精确表、前缀表、token 表、关联设备四路都照常出中文名", () => {
    // 防误伤，也是「守卫不能写成恒假」的对侧断言：把 Object.hasOwn 反过来
    // （一律视为未命中）会让下面全变成 undefined。故必须同时钉住正常键。
    // 四条路径各取一例，防止只守住其中一口而另三口被改成恒假。
    expect(inferDeviceParameterChineseName("rated_capacity")).toBe("额定容量");
    expect(inferDeviceParameterChineseName("rdf_id")).toBe("原始标识");
    // 前缀 + 精确表（i_node → 首端 + 节点号）
    expect(inferDeviceParameterChineseName("i_node")).toBe("首端节点号");
    // 前缀 + 精确表（ac_p_max → 交流侧 + 有功上限）
    expect(inferDeviceParameterChineseName("ac_p_max")).toBe("交流侧有功上限");
    // 纯 token 拆解（rated_capacity_set → 额定 + 容量 + 设定值）
    expect(inferDeviceParameterChineseName("rated_capacity_set")).toBe("额定容量设定值");
    // 关联设备的正则分支
    expect(inferDeviceParameterChineseName("idx_ac_load_t1")).toBe("第1端关联交流负荷序号");
  });

  test("空串、纯下划线、含点号与斜杠的键按未登记处理，点号与斜杠归一化后仍可查表", () => {
    // 空串 / 纯下划线：normalize 后为空，被 `if (!normalizedName) return undefined` 拦下。
    for (const key of ["", "___"]) {
      expect(inferDeviceParameterChineseName(key), JSON.stringify(key)).toBeUndefined();
    }
    // 含点号 / 斜杠：normalize 把非字母数字下划线全替成 _，所以这些键不会命中表。
    for (const key of ["a.b", "a/b", "node.1"]) {
      expect(inferDeviceParameterChineseName(key), key).toBeUndefined();
    }
    // 反向钉住「归一化本身仍工作」：分隔符被换成 _ 之后，多段键照常查得到。
    // 若哪天把分隔符替换删了，这里会变 undefined 而上面三条仍绿 —— 断言会假绿。
    expect(inferDeviceParameterChineseName("rated/capacity")).toBe("额定容量");
    expect(inferDeviceParameterChineseName("rated.capacity_set")).toBe("额定容量设定值");
    expect(inferDeviceParameterChineseName("AC.rated.capacity")).toBe("交流侧额定容量");
  });

  test("meaningfulDeviceParameterChineseName 对原型链键落到兜底文案，拿到的是字符串", () => {
    // 真实导出入口（server.mjs:1132 用的就是它）：返回类型必须是 string，
    // 修复前 constructor 会一路把函数 Object 带到这里。
    for (const key of PROTOTYPE_CHAIN_KEYS) {
      const out = meaningfulDeviceParameterChineseName(key, "");
      expect(typeof out, `${key} 必须是 string`).toBe("string");
      expect(out, key).toBe(`自定义参数（${key}）`);
    }
  });
});

describe("meaningfulDeviceParameterChineseName", () => {
  test("传入有效中文名时优先用它", () => {
    expect(meaningfulDeviceParameterChineseName("rated_capacity", "额定容量")).toBe("额定容量");
  });

  test("中文名与英文名相同时视为无效，回落到推断", () => {
    // en === cn 不算「有意义的中文名」
    const out = meaningfulDeviceParameterChineseName("rated_capacity", "rated_capacity");
    expect(out).not.toBe("rated_capacity");
  });

  test("中文名是通用占位（自定义参数）时回落到推断", () => {
    const out = meaningfulDeviceParameterChineseName("rated_capacity", "自定义参数");
    expect(out).not.toBe("自定义参数");
  });

  test("中文名无汉字时视为无效，回落到推断", () => {
    const out = meaningfulDeviceParameterChineseName("rated_capacity", "abc");
    expect(out).not.toBe("abc");
  });

  test("中文名为空时回落到推断", () => {
    const out = meaningfulDeviceParameterChineseName("rated_capacity", "");
    expect(typeof out).toBe("string");
    expect(out.length).toBeGreaterThan(0);
  });

  test("两参都空时给出可读的兜底文案，不返回空串", () => {
    const out = meaningfulDeviceParameterChineseName("", "");
    expect(typeof out).toBe("string");
    expect(out.length).toBeGreaterThan(0);
  });

  test("结果非 nullish 恒成立（导出表头不允许空）", () => {
    for (const [en, cn] of [["", ""], ["x", null], [undefined, undefined], ["a", "中"]]) {
      const out = meaningfulDeviceParameterChineseName(en, cn);
      expect(typeof out).toBe("string");
      expect(out.length).toBeGreaterThan(0);
    }
  });
});

// ── 归一化输出形状：translatedTokenPhrase 里 `if (!tokens.length) return undefined`
// 那道早退（L236）在当前调用图下**不可达**，它的可达性完全依赖下面这条不变量：
// normalizeDeviceParameterEnglishName 的输出要么是空串，要么**首尾都是字母数字**。
//
// 论证（两条调用路径穷举）：
//   · L260 `translatedTokenPhrase(normalizedName)`：调用前 L243 已排除空串，
//     故 normalizedName 非空；配合「首尾是字母数字」⇒ 至少含 1 个非下划线 token。
//   · L256 `translatedTokenPhrase(baseName)`，baseName = normalizedName.slice(prefix.length)，
//     而 10 个 SIDE_PREFIXES 全部以 "_" 结尾。baseName 为空 ⇒ normalizedName 也以 "_"
//     结尾（与不变量矛盾）；baseName 全是下划线 ⇒ 同理与不变量矛盾。
// 所以下面这条形状断言就是 L236 可达性的**可执行前提**：它一旦转红（normalize 输出
// 出现首尾下划线），L236 立刻变成活代码，届时必须补它的直接用例。
//
// 变异实测（本文件 v9 + 本文件用例）：
//   · L236 `if (!tokens.length) return undefined;` → `if (false) …`：**GREEN**（不可达）。
//   · 叠加变异（路线 B）—— 同上，**再**把 normalize 的 `.replace(/^_+|_+$/g, "")`
//     换成永不匹配的 `.replace(/^$/, "")`：立刻 **RED**，红因是
//     `AssertionError: "___": expected '' to be undefined`（另有一条 `"_" -> "_"` 的形状断言）。
//     即：**L236 的唯一作用就是拦住「归一化吐出全下划线串」这一种形状**；一旦那条
//     剥离被削弱，tokens=[] 会让 `labels.every(Boolean)` 恒真并返回 `""`。
//     两条叠加起来就给出了可达性结论的机制，而不只是「测不出来」。
describe("归一化输出形状：L236 空 token 早退的可达性前提", () => {
  const NORMALIZED_SHAPE = /^[a-z0-9]([a-z0-9_]*[a-z0-9])?$/u;

  test("输出要么空串、要么首尾都是字母数字（绝不出现首尾下划线）", () => {
    // 逐条点名：全部下划线会被首尾剥离成空串；夹在字母中间的连写下划线折叠成一个；
    // 首尾的下划线/连字符/点号都被剥掉；中文与符号整段变下划线后也被剥成空串。
    for (const raw of [
      "", "   ", null, undefined,
      "_", "__", "___", "____",
      "i_", "_i_", "i__", "a.b", "a/b", "node.1",
      "-rated-", "_rated_", "rated/capacity", "rated.capacity_set",
      "AC.rated.capacity", "ratedCapacity", "Rated", "1", "0", "构造", "a__b"
    ]) {
      const normalized = normalizeDeviceParameterEnglishName(raw);
      const ok = normalized === "" || NORMALIZED_SHAPE.test(normalized);
      expect(ok, `${JSON.stringify(raw)} -> ${JSON.stringify(normalized)}`).toBe(true);
    }
  });

  test("纯下划线的键归一化成空串后按未登记处理，绝不返回空串标签", () => {
    // 这组输入是「L236 那道早退」在 normalize 一旦失去剥离能力时唯一会漏出来的形状：
    // 若同时去掉 L236 的 `if (!tokens.length)`，tokens=[] 会让 `labels.every(Boolean)`
    // 恒真并返回 `""`，于是这里会收到空串而不是 undefined。
    for (const key of ["_", "__", "___", "source__", "a._", "a._b", "j__", "k___"]) {
      expect(inferDeviceParameterChineseName(key), JSON.stringify(key)).toBeUndefined();
    }
    // 反向钉住「剥离只剥下划线、不动字母数字」：`i__` 归一化成 `i`，而 `i` 是
    // EXACT 的裸键 ⇒ 拿到真标签。若哪天把剥离改成整段丢弃，这里会变成 undefined。
    expect(inferDeviceParameterChineseName("i__")).toBe("电流量测值");
  });
});

// ── 关联设备标签表与关系正则的**同步不变量**（L250 的 `?? "设备"` 兜底）。
// 正则 `/^idx_(ac_unit|…|transformer)_t(\d+)$/` 的 9 个设备种类与
// ASSOCIATED_DEVICE_LABELS 的 9 个自有键**恰好一一对应**，且每个值都是非空串，
// 所以查表永远命中 —— `?? "设备"` 这条右臂在当前定义域内**恒不求值**。
// 但它是「正则加了种类却忘了加标签」时唯一的救命稻草，且失败是**静默**的：
// 产出「第N端关联设备序号」没有任何报错，只在导出表头里变成一句泛称。
// 故下面用「假想新增种类 ac_source」把这条兜底钉成可观测契约：它现在必须是
// undefined（未匹配正则），一旦有人往正则里加了 ac_source 却没登记标签，
// 这里立刻转红。
//
// 变异实测：`?? "设备"` → `?? "关系对象"` 与 →（删掉）都是 **GREEN**，与「右臂永不求值」
// 一致（这是可证的：正则的 9 个 kind 与标签表 9 个自有键逐字相同，值均非空串）。
// 真正能杀掉这一行的是**同步失配**，实测两条都 RED：
//   · L248 正则加 `|ac_source` → `AssertionError: ac_source: expected
//     '第1端关联设备序号' not to be '第1端关联设备序号'`；
//   · L250 端号换成 kind → `expected '第ac_load端关联交流负荷序号' to be
//     '第1端关联交流负荷序号'`。
describe("关联设备标签表与关系正则的同步不变量（L250 的 ?? 兜底）", () => {
  const REGISTERED_KINDS = [
    ["ac_unit", "交流电源"],
    ["dc_unit", "直流电源"],
    ["ac_load", "交流负荷"],
    ["dc_load", "直流负荷"],
    ["h2_unit", "氢源"],
    ["h2_load", "氢负荷"],
    ["heat_unit", "热源"],
    ["heat2_unit", "双端热源"],
    ["transformer", "变压器"]
  ];

  test("9 个已登记种类各自取到专属标签，任何一种都不得落到「设备」兜底", () => {
    // 序号也要覆盖：relationMatch[2] 是多位数，且不受前导零影响。
    for (const [kind, label] of REGISTERED_KINDS) {
      for (const terminal of ["1", "2", "7", "12", "0"]) {
        const out = inferDeviceParameterChineseName(`idx_${kind}_t${terminal}`);
        expect(out, `${kind}#${terminal}`).toBe(`第${Number(terminal)}端关联${label}序号`);
        expect(out, `${kind}#${terminal}`).not.toBe(`第${terminal}端关联设备序号`);
      }
    }
  });

  test("正则未收录的设备种类不产出关联文案，也就不可能走到「设备」兜底", () => {
    // 判别输入用的是**表里不存在的键**（ac_source），不是表里恰好存在的那个 ——
    // 硬编码型变异猜不到它，两侧差异才明显。
    for (const kind of ["ac_source", "dc_source", "h2_source", "water_unit", "transformer2"]) {
      const out = inferDeviceParameterChineseName(`idx_${kind}_t1`);
      expect(out, kind).not.toBe("第1端关联设备序号");
      expect(out, kind).toBeUndefined();
    }
  });

  test("未匹配关系正则的相邻形状（多一位、缺位、非数字）同样不进关联分支", () => {
    for (const key of ["idx_ac_unit_t", "idx_ac_unit_tx", "idx_ac_unit_t1x", "idx_ac_unit_1", "x_idx_ac_unit_t1"]) {
      const out = inferDeviceParameterChineseName(key);
      // 不用 toContain：out 可能是 undefined，而 toContain 对非字符串/数组会直接抛。
      expect(out === undefined || !out.includes("端关联"), key).toBe(true);
    }
  });
});

// ── 侧前缀剥离路径（L253-258）的穷举矩阵。顺带把 L236 的「余下 base 至少含一个
// token」这条前提按 10 个前缀 × 已登记 token 逐条钉住：每个 (prefix, token)
// 组合都必须产出「侧标签 + token 标签」，因此前缀循环不会静默退化成恒假。
describe("侧前缀剥离：10 个前缀 × 已登记 token 穷举", () => {
  const SIDE_PREFIX_LABELS = [
    ["source_", "首端"],
    ["target_", "末端"],
    ["medium_", "中压侧"],
    ["high_", "高压侧"],
    ["low_", "低压侧"],
    ["ac_", "交流侧"],
    ["dc_", "直流侧"],
    ["i_", "首端"],
    ["j_", "末端"],
    ["k_", "中压侧"]
  ];
  // 取 TOKEN_LABELS 里有、EXACT_PARAMETER_LABELS 里**没有** `<prefix><token>` 形式的 token，
  // 保证走的是「前缀剥离后 token 拆解」这条路径而非精确表口。
  // ⚠ `i_set` / `i_max` / `i_min` 是 EXACT 的真实键（电流设定值/上限/下限），
  //   精确表优先于前缀循环 —— 那三条在下面单独钉，不混进本矩阵。
  const TOKENS = [
    ["rated", "额定"],
    ["capacity", "容量"],
    ["value", "值"],
    ["upper_limit", "上限限值"],   // 拆成 upper + limit 两个 token
    ["lower_limit", "下限限值"]
  ];

  test("每个前缀剥掉后余下的 token 都照常译出，产出「侧标签 + token 标签」", () => {
    for (const [prefix, sideLabel] of SIDE_PREFIX_LABELS) {
      for (const [token, tokenLabel] of TOKENS) {
        expect(inferDeviceParameterChineseName(`${prefix}${token}`), prefix + token).toBe(`${sideLabel}${tokenLabel}`);
      }
    }
  });

  test("组合名恰好落进 EXACT 表时精确表优先（i_set / i_max / i_min 三个真实键）", () => {
    // 顺序契约：L245 的精确表口先于 L253 的前缀循环。若把两处调换，
    // 这三条会变成「首端 + token 标签」= 首端设定值/上限/下限，下游表头就变了。
    expect(inferDeviceParameterChineseName("i_set")).toBe("电流设定值");
    expect(inferDeviceParameterChineseName("i_max")).toBe("电流上限");
    expect(inferDeviceParameterChineseName("i_min")).toBe("电流下限");
    // 而带下划线的兄弟键不在 EXACT 里，所以走前缀循环 —— 与上面三条形成对照。
    expect(inferDeviceParameterChineseName("i_max_value")).toBe("首端上限值");
    expect(inferDeviceParameterChineseName("i_set_rated")).toBe("首端设定值额定");
  });

  test("前缀本身当键名时不会产出裸侧标签（剥完余下空串那一形状不存在）", () => {
    // 10 个前缀全以 "_" 结尾，而归一化会剥掉尾下划线 ⇒ baseName 不可能是空串，
    // 所以「剥空后拼出裸侧标签」这条形状不可达。这里逐个前缀按实际结果钉住。
    const EXPECTED_BARE = {
      source_: undefined,
      target_: undefined,
      medium_: undefined,
      high_: undefined,
      low_: undefined,
      ac_: undefined,
      dc_: undefined,
      i_: "电流量测值",   // `i` 是 EXACT 的裸键
      j_: undefined,
      k_: undefined
    };
    for (const [prefix, sideLabel] of SIDE_PREFIX_LABELS) {
      const bare = prefix.replace(/_+$/u, "");
      const out = inferDeviceParameterChineseName(bare);
      expect(out, bare).toBe(EXPECTED_BARE[prefix]);
      // 无论命中哪条路，都不能是「只有侧标签」这种剥空产物。
      expect(out, `${bare} 不得产出裸侧标签 ${sideLabel}`).not.toBe(sideLabel);
    }
  });
});
