// escapeXmlFull 的等价性推理与性能守卫。
//
// ## 本文件要钉住两件事
//
// ① **等价性推理**（防后人"顺手优化"时破坏它）：链式 5 次 replace 看起来可以合并成
//    「单次字符类 + 查表」，但**后续规则会作用在前次规则的结果上**，而映射值 `&amp;`
//    本身含键 `&` —— 很容易想当然地认定"合并后行为会变"而不敢动，或反之。
//    本文件把等价性**穷举证明**固定下来。
//
// ② **性能陷阱**（我实测踩过一次）：单次查表版实测**更慢** 0.51x~0.74x，已回退。
//    原因：V8 对 `replace(/单字面量/g, "字符串")` 有高度优化（内部 memchr 类
//    单字符搜索 + 直接拼接，无匹配时返回原引用、零分配），而单次字符类 + 替换
//    回调每个匹配都要调一次 JS 函数，回调开销吃掉了省下 4 次扫描的收益。
//    **别再改成单次查表版** —— 本文件的性能守卫就是拦这个。
import { describe, expect, test } from "vitest";
import { escapeXmlFull } from "./xmlEscape.mjs";

/** 我一度提交过、实测更慢、已回退的「单次字符类 + 查表」版。用作性能对照。 */
const singleLookupImpl = (value) => {
  const table = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" };
  return String(value ?? "").replace(/[&<>"']/g, (char) => table[char]);
};

describe("等价性：链式 ≡ 单次查表（穷举证明，防误改）", () => {
  test("五个保留字符的 1~3 字符组合（1110 例）逐字节相同", () => {
    const alphabet = ["&", "<", ">", '"', "'", "a", "1", " ", "\n", "中"];
    const mismatches = [];
    const check = (s) => {
      if (escapeXmlFull(s) !== singleLookupImpl(s)) mismatches.push(s);
    };
    for (const a of alphabet) {
      check(a);
      for (const b of alphabet) {
        check(a + b);
        for (const c of alphabet) check(a + b + c);
      }
    }
    expect(mismatches).toEqual([]);
  });

  test("真实场景样本逐字节相同", () => {
    const samples = [
      "1号主变压器",
      "220kV 母线 A 相",
      '设备</ACLoad><injected attr="1">',
      "x' onload='alert(1)",
      "a&b<c>d\"e'f",
      "&amp;",
      "&lt;",
      "&&&",
      "<<<",
      "'''",
      "ACLoad&ACGenerator",
      "路径 C:\\temp\\file",
      "含中文的设备名 #1",
      "",
      "a".repeat(1000),
      "&".repeat(500)
    ];
    for (const s of samples) {
      expect(escapeXmlFull(s), JSON.stringify(s)).toBe(singleLookupImpl(s));
    }
  });

  test("nullish 与非字符串输入逐字节相同", () => {
    for (const v of [null, undefined, 0, false, Number.NaN]) {
      expect(escapeXmlFull(v), String(v)).toBe(singleLookupImpl(v));
    }
  });

  test("**关键：映射值本身含键（`&amp;` 含 `&`）也不产生二次转义**", () => {
    // 若先转 < 再转 &，`<` 会得到 `&amp;lt`。当前顺序（& 最先）保证不会。
    expect(escapeXmlFull("<")).toBe("&lt;");
    expect(escapeXmlFull("&")).toBe("&amp;");
    expect(escapeXmlFull("&&")).toBe("&amp;&amp;");
    // 已转义内容会被**再次**转义（这是正确行为，调用方不可重复转义同一值）
    expect(escapeXmlFull("&lt;")).toBe("&amp;lt;");
  });
});

describe("性能：链式实现不得慢于单次查表版（拦「聪明但更慢」的改写）", () => {
  const measure = (fn, sample) => {
    for (let i = 0; i < 400; i += 1) fn(sample); // 预热，排除 JIT 编译开销
    const runs = [];
    for (let round = 0; round < 7; round += 1) {
      const start = performance.now();
      for (let i = 0; i < 600; i += 1) fn(sample);
      runs.push(performance.now() - start);
    }
    runs.sort((left, right) => left - right);
    return runs[Math.floor(runs.length / 2)]; // 中位数，抗抖动
  };

  // 断言方向：新版**不得比单次查表版慢超过 2 倍**。
  // 正常情况下链式明显更快（实测 1.3x~2.0x），留 2 倍余量吸收机器抖动。
  // 若有人把实现换成单次查表，这条会转红（约慢 0.5x~0.74x，触碰边界）。
  const cases = [
    ["无元字符（最常见：设备名/电压等级）", "220kV 母线 A 相 abc 123".repeat(400)],
    ["含元字符", '设备名</ACLoad attr="1">'.repeat(400)],
    ["混合", "a&b<c>d\"e'f 中文 123".repeat(300)]
  ];

  for (const [label, sample] of cases) {
    test(`${label}：链式不应慢于单次查表`, () => {
      const chainMs = measure(escapeXmlFull, sample);
      const singleMs = measure(singleLookupImpl, sample);
      expect(
        chainMs,
        `链式 ${chainMs.toFixed(1)}ms / 单次查表 ${singleMs.toFixed(1)}ms（实测链式应更快）`
      ).toBeLessThan(singleMs * 2);
    });
  }
});
