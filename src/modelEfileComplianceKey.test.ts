// deviceDefinitionComplianceKey 的直接单测（此前 39 处生产调用、零测试直呼）。
//
// ## 它是什么
//
// E 元件库的**字段匹配原语**：`trim + toLowerCase + 去下划线`。
// 目的是让**同一物理量在不同来源写法不同**时能对上 —— 模板里的 `AC_Busbar`
// 与器件定义里的 `ACBusbar` 必须视为同一个合规字段。
//
// ## 为什么 39 处调用点需要直接覆盖
//
// 全部调用点都是**查找**语义（Set 成员判定 / Map 键 / 相等比较），不是展示：
//
//   `e-file.ts:444`  `windingColumnKeys.has(key)`      —— 撞键会误判成绕组列
//   `e-file.ts:683`  `sourceKey === exportKey`         —— 撞键会错配模板字段
//   `e-file.ts:20-28` `seen: Set` 去重                  —— 撞键会**静默丢字段**
//
// 一旦归一化规则被"顺手改严"或"改松"，后果是 E 文件字段错配或静默丢失，
// 而导出流程**全程不报错**。本文件把归一化规则钉死。
import { describe, expect, test } from "vitest";
import { deviceDefinitionComplianceKey } from "./export/e-file";

const k = deviceDefinitionComplianceKey;

describe("核心契约：去下划线 + trim + 小写（这是功能，不是缺陷）", () => {
  test("大小写不敏感", () => {
    expect(k("ACBusbar")).toBe("acbusbar");
    expect(k("acbusbar")).toBe("acbusbar");
    expect(k("ACBUSBAR")).toBe("acbusbar");
  });

  test("★ **下划线被刻意去掉** —— 模板 `AC_Busbar` 必须匹配器件 `ACBusbar`", () => {
    // 这正是该函数存在的理由。若哪天有人"顺手"把 replace(/_/g,"") 删掉，
    // 模板字段与器件字段就会大面积失配，E 文件字段静默丢失。
    expect(k("AC_Busbar")).toBe("acbusbar");
    expect(k("AC_Busbar")).toBe(k("ACBusbar"));
    expect(k("ACBusbar")).toBe(k("AC_Bus_Bar"));
  });

  test("多下划线、首尾下划线、连续下划线全部去掉", () => {
    expect(k("_AC_")).toBe("ac");
    expect(k("A__B")).toBe("ab");
    expect(k("A_B_C")).toBe("abc");
  });

  test("首尾空白被 trim（含 NBSP / 全角空格 / BOM）", () => {
    expect(k("  ACBusbar  ")).toBe("acbusbar");
    expect(k("\tACBusbar\n")).toBe("acbusbar");
    expect(k("\u00A0ACBusbar\u00A0")).toBe("acbusbar");   // NBSP
    expect(k("\u3000ACBusbar\u3000")).toBe("acbusbar");   // 全角空格
    expect(k("\uFEFFACBusbar\uFEFF")).toBe("acbusbar");   // BOM
  });
});

describe("零宽字符**不**被 trim（ECMAScript WhiteSpace 的边界，如实记录）", () => {
  // `String.prototype.trim` 按规范只去 WhiteSpace + LineTerminator 集合。
  // 零宽字符（U+200B / U+180E）**不在**其中，故保留。
  //
  // **判定为边界行为，不改实现**：字段名来自图元库配置，零宽字符是人为构造；
  // 而"顺手"把零宽字符也去掉会引入新的归一化规则，与去下划线（对齐模板写法）
  // 的既定意图无关 —— 那属于凭空发明规则。
  test("U+200B 零宽空格保留在键里", () => {
    expect(k("\u200BACBusbar")).toBe("\u200bacbusbar");
    expect(k("\u200BACBusbar")).not.toBe(k("ACBusbar"));
  });

  test("U+180E MONGOLIAN VSEP 保留在键里", () => {
    expect(k("\u180EACBusbar")).toBe("\u180eacbusbar");
  });

  test("控制字符 / NUL 不被去除（如实记录）", () => {
    expect(k("a\u0000b")).toBe("a\u0000b");
    expect(k("a\u0001b")).toBe("a\u0001b");
  });
});

describe("★ 小写转换是 **simple case conversion**，不是全折叠（关键边界）", () => {
  // `String.prototype.toLowerCase` 用 Unicode **简单**大小写转换，不是 full case
  // folding。后果是**绝大多数「长得像」的字符不会撞键** —— 这保证了归一化的
  // 爆炸半径可控。**别改成 `toLocaleLowerCase()` 或 `normalize("NFKC")`**：
  // 后两者会引入全角/半角折叠与土耳其语 locale 行为，把下面这些"不同"变成"同键"，
  // 静默丢字段。
  test("长 s（U+017F）≠ ASCII s", () => {
    expect(k("\u017F")).toBe("\u017F");
    expect(k("\u017F")).not.toBe(k("s"));
  });

  test("上标 ²（U+00B2）≠ 数字 2", () => {
    expect(k("x\u00B2")).toBe("x\u00B2");
    expect(k("x\u00B2")).not.toBe(k("x2"));
  });

  test("带圈数字 ①（U+2460）≠ 数字 1", () => {
    expect(k("\u2460")).toBe("\u2460");
    expect(k("\u2460")).not.toBe(k("1"));
  });

  test("罗马数字 Ⅰ（U+2160）→ U+2170，仍 ≠ ASCII i", () => {
    expect(k("\u2160")).toBe("\u2170");
    expect(k("\u2160")).not.toBe(k("i"));
  });

  test("微符号 µ（U+00B5）≠ 希腊小写 mu", () => {
    expect(k("\u00B5")).toBe("\u00B5");
    expect(k("\u00B5")).not.toBe(k("\u03BC"));
  });

  test("全角下划线 ＿（U+FF3F）**不**被去掉（只去 ASCII U+005F）", () => {
    expect(k("ac\uFF3Fbusbar")).toBe("ac\uFF3Fbusbar");
    expect(k("ac\uFF3Fbusbar")).not.toBe(k("ac_busbar"));
  });
});

describe("如实记录：三个 Unicode「兼容符号」会撞键（需刻意构造，不改）", () => {
  // ECMAScript 简单大小写转换把这三个符号映射到已有字母，故撞键。
  // 均需在字段名里**刻意使用**这些符号才会发生（器件库字段名是 ASCII 标识符），
  // 故判定为边界行为、不改实现，只钉住行为供日后排查时对照。
  const collisions: Array<[string, string, string]> = [
    ["开尔文符号 K(U+212A)", "S\u212A", "Sk"],
    ["欧姆符号 Ω(U+2126)", "\u2126", "\u03C9"],
    ["埃 Å(U+212B)", "\u212B", "\u00E5"]
  ];
  for (const [label, a, b] of collisions) {
    test(`${label} 与其普通小写同键`, () => {
      expect(a).not.toBe(b);           // 源字符串视觉/码点不同
      expect(k(a)).toBe(k(b));          // 但归一化后同键
    });
  }

  test("长度会变的 Turkish İ(U+0130) → i + U+0307（两码点）", () => {
    // 唯一实测到「小写后长度变长」的字符。键只用于相等性判定，长度无关；
    // 但若有人把键拿去截断/建索引，需知道这一点。
    const out = k("\u0130");
    expect(out).toBe("i\u0307");
    expect([...out]).toHaveLength(2);
  });
});

describe("nullish 与非字符串输入（39 处调用点大量传 `?? \"\"` 兜底）", () => {
  test("null / undefined → 空串", () => {
    expect(k(null)).toBe("");
    expect(k(undefined)).toBe("");
  });

  test("空串与**首尾**纯空白同键（trim 先于去下划线执行）", () => {
    expect(k("")).toBe("");
    expect(k("   ")).toBe("");
    // 夹在中间的空白因 trim 在先而保留（详见下方 describe 的完整说明）
    expect(k("_\t_")).toBe("\t");
  });

  test("数字 / 布尔被 String 转换后参与归一化", () => {
    expect(k(0)).toBe("0");
    expect(k(1)).toBe("1");
    expect(k(false)).toBe("false");
    expect(k(true)).toBe("true");
    expect(k(Number.NaN)).toBe("nan");
  });

  test("对象 / 数组走默认 toString（不会抛）", () => {
    expect(k({})).toBe("[object object]");
    expect(k(["a"])).toBe("a");
  });

  test("**`filter(Boolean)` 的存在理由**：无名字段归一化成空串而被滤掉", () => {
    // e-file.ts:20 用 `.filter(Boolean)` 滤掉空键 —— 若不过滤，所有"无名"字段
    // 会共享 "" 这个键，第二个起就被判为重复而**静默丢弃**。
    const keys = ["", "  ", "_", "\t", " _ "].map(k);
    expect(keys, JSON.stringify(keys)).toEqual(["", "", "", "", ""]);
  });
});

describe("★ 最反直觉处：`trim` **先于**去下划线，故夹在中间的空白会活下来", () => {
  // 实现顺序是 `trim().toLowerCase().replace(/_/g, "")`，不是"先去下划线再 trim"。
  // 后果：`"_ _"` 的首尾是 `_` 而非空白 → **trim 不动它** → 去掉下划线后剩一个空格。
  //
  // 即：`" _ "`（全空白，两端是空格）→ `""`（空键，被 filter(Boolean) 滤掉）
  // 而 `"_ _"`（两端是下划线）→ `" "`（**非空键，逃过 filter(Boolean)**）。
  //
  // 同一类字符，人眼认为"都是空的"，却得到空/非空两个不同结果。
  // **判定为顺序依赖的既定行为，不改**：把 replace 提到 trim 之前会让
  // `"_ _"` 也变成空键而改变去重结果（原本保留的字段会被丢弃），
  // 且这两种字段名在图元库里都不存在 —— 改它是无收益的行为变更。
  // 这里钉住真实行为，日后若出现"无名字段没被滤掉"的报告，此处已有答案。
  test("两端是空白 → 空键（被 filter(Boolean) 滤掉）", () => {
    expect(k(" _ ")).toBe("");
    expect(k("  _  ")).toBe("");
  });

  test("★ 两端是下划线 → 中间空白成为**非空**键（逃过 filter(Boolean)）", () => {
    expect(k("_ _")).toBe(" ");
    expect(k("_\t_")).toBe("\t");
    expect(k("_ _")).not.toBe(k(" _ "));
    expect(k("_ _")).not.toBe(k("_"));
  });

  test("三处以上同样：`_ _ _` → 两个空格", () => {
    expect(k("_ _ _")).toBe("  ");
  });

  test("若把去下划线提到 trim 之前，`_ _` 就会变空键 —— 断言当前不是这样", () => {
    // 显式记录"实现顺序"这个判据，防止有人调换两步顺序而无人察觉。
    const trimmedFirst = (s: string) => String(s ?? "").trim().toLowerCase().replace(/_/g, "");
    const strippedFirst = (s: string) => String(s ?? "").replace(/_/g, "").trim().toLowerCase();
    expect(trimmedFirst("_ _")).toBe(" ");
    expect(strippedFirst("_ _")).toBe("");
  });
});

describe("去重语义端到端：撞键即静默丢字段（`appendUniqueFields` 的行为）", () => {
  // `e-file.ts:19-28` 的 appendUniqueFields 用该键建 seen 集合，
  // 键相同的后到字段被**静默跳过**（不报错、不告警）。
  const dedup = (names: string[]) => {
    const seen = new Set<string>();
    const kept: string[] = [];
    for (const name of names) {
      const key = k(String(name).trim());
      if (key && !seen.has(key)) {
        seen.add(key);
        kept.push(name);
      }
    }
    return kept;
  };

  test("同一物理量的不同写法只保留第一个", () => {
    expect(dedup(["ACBusbar", "AC_Busbar", "acbusbar", "AC_BUSBAR"])).toEqual(["ACBusbar"]);
  });

  test("空键字段被跳过（不参与去重，全部保留）", () => {
    expect(dedup(["", "  ", "ACBusbar"])).toEqual(["ACBusbar"]);
  });

  test("不同物理量都保留", () => {
    expect(dedup(["P", "Q", "S", "U", "I"])).toEqual(["P", "Q", "S", "U", "I"]);
    expect(dedup(["P", "Q", "S"])).toHaveLength(3);
  });

  test("保留的是**首次出现**的那个（顺序敏感，勿重排）", () => {
    expect(dedup(["ac_busbar", "ACBusbar"])).toEqual(["ac_busbar"]);
  });
});
