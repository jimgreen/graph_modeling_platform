// 设备参数中文名推导链的直接单测（跨端共享单源，此前 src 侧只是 re-export）。
//
// ## 它决定什么
//
// 设备参数的**中文名**若为空/无意义（"自定义参数1"、与英文名相同），
// 就从**英文名**按 token 词典推导。这决定 E 文件 / SVG / 图例上显示什么。
// 推导错了不会崩，但会导出「自定义参数（rated_voltage）」这种无信息量的名字，
// 下游读的人完全看不懂 —— 属于「静默的质量退化」。
//
// ## 判定链（三级，逐级降级）
//
//   meaningfulDeviceParameterChineseName(en, cn)
//     ① cn 含有 CJK 字符（U+3400–U+9FFF）
//     ② 且 cn !== en
//     ③ 且 cn 不含「自定义参数」
//     → 满足则原样返回 cn
//     ④ 否则 inferDeviceParameterChineseName(en)（按 `_` 拆 token 查词典）
//     ⑤ 再不行 → `自定义参数（${en || "未命名"}）`
//
// ## 跨端单源
//
// 实现在 `shared/deviceParameterChineseNames.mjs`（249 行），
// `src/deviceParameterChineseNames.ts`（6 行）只是 re-export —— 已是单源。
// 本文件从 `src/` 侧测，因为那是前端与 server 的共同入口。
import { describe, expect, test } from "vitest";
import {
  inferDeviceParameterChineseName,
  isGenericCustomParameterChineseName,
  meaningfulDeviceParameterChineseName,
  normalizeDeviceParameterEnglishName
} from "./deviceParameterChineseNames";

describe("meaningfulDeviceParameterChineseName：三级降级", () => {
  test("① 有意义的中文名 → 原样返回", () => {
    expect(meaningfulDeviceParameterChineseName("rated_voltage", "额定电压")).toBe("额定电压");
    expect(meaningfulDeviceParameterChineseName("p", "有功功率")).toBe("有功功率");
    expect(meaningfulDeviceParameterChineseName("anything", "自定义名称但含中文")).toBe("自定义名称但含中文");
  });

  test("② cn 与 en 相同 → 不算有意义（走推导）", () => {
    // 逐条比较：两者相同时应落到推导或兜底，而不是把英文名当中文名返回。
    const out = meaningfulDeviceParameterChineseName("rated_voltage", "rated_voltage");
    expect(out).not.toBe("rated_voltage");
  });

  test("③ cn 含「自定义参数」→ 不算有意义（走推导）", () => {
    const out = meaningfulDeviceParameterChineseName("rated_voltage", "自定义参数1");
    expect(out).not.toBe("自定义参数1");
    expect(out).not.toContain("自定义参数1");
  });

  test("④ cn 为空 / 纯空白 → 走推导", () => {
    for (const cn of ["", "   ", "\t", "\n"]) {
      const out = meaningfulDeviceParameterChineseName("rated_voltage", cn);
      expect(out, JSON.stringify(cn)).not.toBe("");
    }
  });

  test("⑤ cn 无 CJK 字符（纯英文/数字/符号）→ 走推导", () => {
    for (const cn of ["abc", "123", "---", "P", "V_base", "()"]) {
      const out = meaningfulDeviceParameterChineseName("rated_voltage", cn);
      // 推导成功时得到中文名；失败时落到「自定义参数（…）」，也不该原样返回 cn
      expect(out, JSON.stringify(cn)).not.toBe(cn);
    }
  });
});

describe("CJK 字符的边界：U+3400–U+9FFF 之外不算", () => {
  // 正则用的是 `[\u3400-\u9FFF]`（CJK 扩展 A + 基本区），不含兼容汉字。
  test("基本区汉字（含「一」U+4E00 ~ 「龥」U+9FA5）算 CJK", () => {
    expect(meaningfulDeviceParameterChineseName("x", "一")).toBe("一");
    expect(meaningfulDeviceParameterChineseName("x", "龥")).toBe("龥");
  });

  test("★ 扩展 A 区（U+3400–U+4DBF）也在范围内", () => {
    // 探针实测 U+3400 命中；这条容易被"以为只覆盖基本区"而误判
    expect(meaningfulDeviceParameterChineseName("x", "\u3400")).toBe("\u3400");
  });

  test("★ 扩展 B 区及以后（U+20000+）**不在**范围内", () => {
    // 常见汉字在基本区，但生僻字（如「𠀀」U+20000）落在扩展 B，会被判为无 CJK
    expect(meaningfulDeviceParameterChineseName("x", "\u20000")).not.toBe("\u20000");
  });

  test("★ 兼容汉字（U+F900–U+FAFF，如「豈」）**不在**范围内", () => {
    // 兼容表意文字在字体里显示为汉字，但码位不在 CJK 基本区/扩展 A
    expect(meaningfulDeviceParameterChineseName("x", "\uF900")).not.toBe("\uF900");
  });

  test("CJK 标点（、。「」）**不算** CJK 字符", () => {
    // 顿号/句号在 U+3001/U+3002，不在 U+3400–U+9FFF
    for (const cn of ["、", "。", "「」", "，", "（）"]) {
      expect(meaningfulDeviceParameterChineseName("x", cn), cn).not.toBe(cn);
    }
  });

  test("日文假名 / 韩文**不算** CJK 字符（各自 Unicode 区）", () => {
    for (const cn of ["\u3042", "\u30A2", "\uAC00", "\uD55C"]) {
      expect(meaningfulDeviceParameterChineseName("x", cn), JSON.stringify(cn)).not.toBe(cn);
    }
  });
});

describe("isGenericCustomParameterChineseName：只认「自定义参数」四字", () => {
  test("含「自定义参数」→ true", () => {
    expect(isGenericCustomParameterChineseName("自定义参数")).toBe(true);
    expect(isGenericCustomParameterChineseName("自定义参数1")).toBe(true);
    expect(isGenericCustomParameterChineseName("前缀自定义参数后缀")).toBe(true);
    expect(isGenericCustomParameterChineseName("  自定义参数  ")).toBe(true);
  });

  test("不含 → false", () => {
    for (const s of ["额定电压", "自定义", "自定", "义参数", "自 定义参数", "custom", "", "   "]) {
      expect(isGenericCustomParameterChineseName(s), JSON.stringify(s)).toBe(false);
    }
  });

  test("四个字必须**连续**（中间插字不算）", () => {
    expect(isGenericCustomParameterChineseName("自定义参数")).toBe(true);
    expect(isGenericCustomParameterChineseName("自定义参 数")).toBe(false);
    expect(isGenericCustomParameterChineseName("自 定义参数")).toBe(false);
  });

  test("非字符串输入安全返回 false", () => {
    for (const bad of [undefined, null, 0, 1, {}, []] as never[]) {
      expect(isGenericCustomParameterChineseName(bad), String(bad)).toBe(false);
    }
  });
});

describe("inferDeviceParameterChineseName：按 token 查词典", () => {
  test("已知 token 组合 → 拼出中文名", () => {
    // 这些是词典里确有的常见电气量；具体返回值由词典决定，
    // 这里只断言「推出的是非空中文」而不逐字钉死词典内容。
    for (const en of ["rated_voltage", "rated_current", "rated_power", "active_power", "reactive_power"]) {
      const cn = inferDeviceParameterChineseName(en);
      expect(cn, en).toBeTypeOf("string");
      expect(cn, en).not.toBe("");
      if (cn) expect(cn, en).toMatch(/[\u3400-\u9fff]/u);
    }
  });

  test("★ 全部 token 都命中词典才拼（缺一即 undefined）", () => {
    // 这是 `labels.every(Boolean)` 的语义：部分命中不算。
    const partial = inferDeviceParameterChineseName("rated_zzzzz");
    const full = inferDeviceParameterChineseName("rated_voltage");
    expect(partial, "含未知 token 应推出 undefined").toBeUndefined();
    expect(full, "全命中应推出中文名").toBeDefined();
  });

  test("空串 / 纯下划线 → undefined（无 token）", () => {
    for (const en of ["", "   ", "_", "__", "___"]) {
      expect(inferDeviceParameterChineseName(en), JSON.stringify(en)).toBeUndefined();
    }
  });

  test("★ `filter(Boolean)` 跳过空 token：连续下划线不阻断匹配", () => {
    // "rated__voltage" 拆出 ["rated", "", "voltage"]，过滤空串后仍是全命中
    expect(inferDeviceParameterChineseName("rated__voltage")).toBe(inferDeviceParameterChineseName("rated_voltage"));
  });

  test("大小写：token 查表是否归一", () => {
    const lower = inferDeviceParameterChineseName("rated_voltage");
    const upper = inferDeviceParameterChineseName("RATED_VOLTAGE");
    const mixed = inferDeviceParameterChineseName("Rated_Voltage");
    // 三者应一致（说明上游做了归一）；若不一致，此处会转红提示
    expect(upper, "大写应与全小写一致").toBe(lower);
    expect(mixed, "混合大小写应与全小写一致").toBe(lower);
  });

  test("非字符串输入安全返回 undefined", () => {
    for (const bad of [undefined, null, 0, 1, {}, []] as never[]) {
      expect(inferDeviceParameterChineseName(bad), String(bad)).toBeUndefined();
    }
  });
});

describe("normalizeDeviceParameterEnglishName：英文名归一", () => {
  test("trim 后返回", () => {
    expect(normalizeDeviceParameterEnglishName("  rated_voltage  ")).toBe("rated_voltage");
    expect(normalizeDeviceParameterEnglishName("")).toBe("");
  });

  test("非字符串走 String()", () => {
    expect(normalizeDeviceParameterEnglishName(null as never)).toBe("");
    expect(normalizeDeviceParameterEnglishName(123 as never)).toBe("123");
  });

  test("★ 与 inferDeviceParameterChineseName 的一致性：归一后的名字能查到词典", () => {
    // 若 normalize 做了 trim / 大小写归一，则 "  RATED_VOLTAGE  " 也能推出中文名
    const out = inferDeviceParameterChineseName(normalizeDeviceParameterEnglishName("  RATED_VOLTAGE  "));
    expect(out).toBe(inferDeviceParameterChineseName("rated_voltage"));
  });
});

describe("★ 端到端降级链的完整形态", () => {
  // 三类结果：原样（cn 有意义）/ 推导（cn 无意义但 en 查得到词典）/ 兜底（en 也查不到）
  // 注意「自定义参数N」这个 cn 属于**推导**类而非兜底 —— 只要 en 查得到词典就推导。
  const cases: Array<[string, string | undefined, string]> = [
    ["rated_voltage", "额定电压", "原样"],
    ["rated_voltage", "", "推导"],
    ["rated_voltage", undefined, "推导"],
    ["rated_voltage", "自定义参数3", "推导"],
    ["rated_voltage", "rated_voltage", "推导"],
    ["zzzz_zzzz", "自定义参数1", "兜底"],
    ["zzzz_zzzz", undefined, "兜底"],
    ["", "", "兜底"]
  ];

  for (const [en, cn, mode] of cases) {
    test(`en=${JSON.stringify(en)} cn=${JSON.stringify(cn)} → ${mode}`, () => {
      const out = meaningfulDeviceParameterChineseName(en, cn);
      expect(out, `${en} / ${cn}`).toBeTypeOf("string");
      expect(out.length, `${en} / ${cn}`).toBeGreaterThan(0);
      if (mode === "原样") expect(out).toBe(cn);
      if (mode === "兜底") expect(out, `${en} / ${cn}`).toMatch(/^自定义参数（/);
      if (mode === "推导") expect(out, `${en} / ${cn}`).not.toMatch(/^自定义参数（/);
    });
  }

  test("★ 关键对照：同一个 en，cn 是否为「自定义参数」**不改变**结果类别", () => {
    // 探针实测：rated_voltage 无论 cn 是什么，只要 cn 不「有意义」，都推出「额定电压」。
    const withGeneric = meaningfulDeviceParameterChineseName("rated_voltage", "自定义参数3");
    const withEmpty = meaningfulDeviceParameterChineseName("rated_voltage", "");
    expect(withGeneric).toBe(withEmpty);
    expect(withGeneric).toBe("额定电压");
  });

  test("**兜底文案用全角括号且含未命名占位**", () => {
    expect(meaningfulDeviceParameterChineseName("zzzz_zzzz", "")).toBe("自定义参数（zzzz_zzzz）");
    expect(meaningfulDeviceParameterChineseName("", "")).toBe("自定义参数（未命名）");
    expect(meaningfulDeviceParameterChineseName("   ", "")).toBe("自定义参数（未命名）");
  });

  test("兜底括号的样式不可改（下游可能按它做正则提取真实参数名）", () => {
    const out = meaningfulDeviceParameterChineseName("some_unknown", "");
    expect(out).toBe("自定义参数（some_unknown）");
    // 明确不是半角括号 / 方括号 / 冒号
    expect(out).not.toContain("(");
    expect(out).not.toContain("[");
    expect(out).not.toContain(":");
  });
});
