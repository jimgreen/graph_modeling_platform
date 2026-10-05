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
