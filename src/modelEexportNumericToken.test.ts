// firstNumericToken 的直接单测（此前 11 处生产调用、零测试直呼）。
//
// ## 它是干什么的
//
// 取出文本里的**第一个数值 token**。三个调用点决定了它的错误是**静默**的：
// - `model.ts:8736/8793`  解析设备定义的 `typicalValue` → 错值进 E 文件
// - `model-eexport.ts:1693` 解析量测参数值
// - `model-eexport.ts:2510` 解析 `params.idx` → **原样写进 E 文件**（见下）
//
// ## 本次修的两处正则缺口
//
// | 输入      | 修前    | 修后    | 差了多少    |
// |-----------|---------|---------|-------------|
// | `"1e5"`   | `"1"`   | `"1e5"` | 100000 倍   |
// | `"1.5e3"` | `"1.5"` | `"1.5e3"`| 1000 倍    |
// | `".5"`    | `"5"`   | `".5"`  | 10 倍且反向 |
//
// `".5"` 尤其糟：修前返回 `"5"`，是正确值 `.5` 的 **10 倍**，方向还反了。
//
// ## 刻意没扩展的（保持原行为，见实现注释）
//
// 千分位逗号 / 十六进制 / 二进制 / 不完整指数 —— 详见 `firstNumericToken` 的注释。
// 本文件用「模糊测试 + 真实形态穷举」两组用例把这些边界**钉死**，防止日后被"顺手"统一。
import { describe, expect, test } from "vitest";
import { firstNumericToken } from "./model-eexport";

/** 修前的正则，作为「哪些形态不该变」的对照。 */
const legacyToken = (value: string) => value.trim().match(/[-+]?\d+(?:\.\d+)?/)?.[0] ?? "";

describe("普通十进制：修前修后**逐字节相同**", () => {
  // 这批是真实数据里实际存在的全部形态（data/ 下 37 个 typicalValue + 1155 个 idx
  // 都是这一类），改动的爆炸半径必须为零。
  const realShapes = [
    "0", "0.0", "-0", "0.1", "0.5", "0.9", "1", "1.5", "220", "35", "10.5",
    "-0.5", "0.01", "100", "0.0001", "007", "0.000", "-10", "12.5", "1e-3" /* 唯一会变的，见下 */
  ].filter((s) => s !== "1e-3");

  test("19 个真实形态全部与修前一致", () => {
    for (const s of realShapes) {
      expect(firstNumericToken(s), JSON.stringify(s)).toBe(legacyToken(s));
    }
    expect(realShapes.length).toBe(19);
  });

  test("带单位 / 前后杂文的文本取第一个数", () => {
    expect(firstNumericToken("12.5 kV")).toBe("12.5");
    expect(firstNumericToken("220kV")).toBe("220");
    expect(firstNumericToken("  35  ")).toBe("35");
    expect(firstNumericToken("额定 220 V")).toBe("220");
    expect(firstNumericToken("abc")).toBe("");
  });

  test("前导零**保留**（不归一化，调用方可能按字符串比对）", () => {
    expect(firstNumericToken("007")).toBe("007");
    expect(firstNumericToken("0012.30")).toBe("0012.30");
  });

  test("只有第一个 token，后面的数字被丢弃", () => {
    expect(firstNumericToken("1 2 3")).toBe("1");
    expect(firstNumericToken("1-2")).toBe("1");
    expect(firstNumericToken("1,000")).toBe("1");
    expect(firstNumericToken("1_000")).toBe("1");
  });
});

describe("★ 指数形式：修前被静默截断", () => {
  test("`1e5` 修前是 1（差 10 万倍），修后是完整 token", () => {
    expect(legacyToken("1e5")).toBe("1");
    expect(firstNumericToken("1e5")).toBe("1e5");
    expect(Number(firstNumericToken("1e5"))).toBe(100000);
  });

  test("大小写 e / E、带符号指数都完整保留", () => {
    expect(firstNumericToken("1E5")).toBe("1E5");
    expect(firstNumericToken("1e-5")).toBe("1e-5");
    expect(Number(firstNumericToken("1e-5"))).toBe(0.00001);
    expect(firstNumericToken("1.5e3")).toBe("1.5e3");
    expect(Number(firstNumericToken("1.5e3"))).toBe(1500);
    expect(firstNumericToken("2.5e-3")).toBe("2.5e-3");
    expect(firstNumericToken("1.5E+10")).toBe("1.5E+10");
    expect(Number(firstNumericToken("1.5E+10"))).toBe(15000000000);
  });

  test("数值与修前一致的部分：指数前的整数部分不变", () => {
    for (const s of ["1e5", "1.5e3", "-1e5", "+2.5e-3"]) {
      const legacy = legacyToken(s);
      const now = firstNumericToken(s);
      // 修前是修后的「前缀」，即修前丢的正是指数部分
      expect(now.startsWith(legacy), `${s}: ${legacy} vs ${now}`).toBe(true);
    }
  });
});

describe("★ 前导小数点：修前丢小数点导致 10 倍反向误差", () => {
  test("`.5` 修前是 5（10 倍且反向），修后是 .5", () => {
    expect(legacyToken(".5")).toBe("5");
    expect(firstNumericToken(".5")).toBe(".5");
    expect(Number(firstNumericToken(".5"))).toBe(0.5);
  });

  test("带符号 / 带前后杂文", () => {
    expect(firstNumericToken("-.5")).toBe("-.5");
    expect(Number(firstNumericToken("-.5"))).toBe(-0.5);
    expect(firstNumericToken("+.5")).toBe("+.5");
    expect(firstNumericToken("abc.5")).toBe(".5");
    expect(firstNumericToken("-.5e3")).toBe("-.5e3");
    expect(Number(firstNumericToken("-.5e3"))).toBe(-500);
  });
});

describe("★ 刻意保持原行为：歧义与非十进制写法", () => {
  // 下面每一条都是**故意不改**的。用例把它们钉死，防止日后有人"顺手统一"，
  // 把千分位/十六进制也吃进去 —— 那会把 `"1,000"` 从 1 变成 1000 或 1，
  // 在两种读法之间**赌**输赢，而调用点无法判断原文是哪种。
  const mustStaySame = [
    ["千分位逗号", "1,000"],
    ["千分位（欧洲小数点形态）", "1,0"],
    ["十六进制", "0x1F"],
    ["二进制", "0b101"],
    ["下划线分隔", "1_000"],
    ["百分号", "50%"],
    ["指数不完整", "1e"],
    ["无整数部分的 e", "e5"],
    ["双负号", "--1"],
    ["正负交错", "-+1"],
    ["多个小数点", "1.2.3"],
    ["连续小数点", "1..2"]
  ] as const;

  for (const [label, s] of mustStaySame) {
    test(`${label} ${JSON.stringify(s)}：与修前一致`, () => {
      expect(firstNumericToken(s)).toBe(legacyToken(s));
    });
  }

  test("千分位具体仍取到 \"1\"（下游拿到的仍是 1，不是 1000）", () => {
    expect(firstNumericToken("1,000")).toBe("1");
    expect(firstNumericToken("1,0")).toBe("1");
  });

  test("十六进制/二进制取到前缀 \"0\"（非十进制 token 不解析）", () => {
    expect(firstNumericToken("0x1F")).toBe("0");
    expect(firstNumericToken("0b101")).toBe("0");
  });
});

describe("模糊测试：任何差异都必须落在两种扩展形态内", () => {
  // 差异必须且只能是「token 以 . 开头」或「token 含指数」这两类 ——
  // 也就是本次修的两处扩展。若日后有人扩大正则，这里会红。
  //
  // 判定要按**匹配结果**而不是按输入长相：`"x.0"` 这种「点前不是数字」的串
  // 也会从 `"0"` 变成 `".0"`（数值相同、token 形态不同），它属于前导点那一类。
  const isExtendedForm = (token: string) => /^[-+]?\./.test(token) || /[eE][-+]?\d/.test(token);

  test("20000 例随机串：差异集合 ⊆ 两种扩展形态", () => {
    const pool = ["0", "1", "5", "9", ".", "-", "+", "e", "E", ",", " ", "a", "x", "_", "%", "k", "V", "0.0", "1e5"];
    let seed = 20260929;
    const rnd = (n: number) => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed % n; };
    const unexpected: string[] = [];
    let changed = 0;
    for (let i = 0; i < 20000; i += 1) {
      const len = rnd(8);
      let s = "";
      for (let j = 0; j < len; j += 1) s += pool[rnd(pool.length)];
      const legacy = legacyToken(s);
      const now = firstNumericToken(s);
      if (legacy === now) continue;
      changed += 1;
      if (!isExtendedForm(now)) unexpected.push(`${JSON.stringify(s)}: 旧=${JSON.stringify(legacy)} 新=${JSON.stringify(now)}`);
    }
    expect(changed, "样本应确实触发过差异，否则这条断言是空跑").toBeGreaterThan(0);
    expect(unexpected.slice(0, 10), `出现 ${unexpected.length} 个非预期差异（总变化 ${changed} 例）`).toEqual([]);
  });

  test("不含 e/E、也不含「点」的数字串上**零差异**（真实数据形态的合集）", () => {
    // 真实数据里的 typicalValue / idx 形态由「数字、可选负号、可选小数部分」构成，
    // 不含字母也不含独立的点。这里穷举该字符集，机器证明「爆炸半径为零」。
    const pool = "0123456789- + xakV".split("");
    const diffs: string[] = [];
    for (const a of pool) for (const b of pool) for (const c of pool) {
      const s = a + b + c;
      if (legacyToken(s) !== firstNumericToken(s)) diffs.push(s);
    }
    expect(diffs).toEqual([]);
  });

  test("含小数点但**点前有数字**的形态上零差异（0.0 / 10.5 这类）", () => {
    const shapes = ["0.0", "0.1", "10.5", "-0.5", "0.01", "0.0001", "0012.30", "12.5", "0.000"];
    for (const s of shapes) expect(firstNumericToken(s), s).toBe(legacyToken(s));
  });
});

describe("空值与非字符串输入", () => {
  test("空串 / 纯空白 / 无数字 → 空串（调用方靠它做 `|| 兜底`）", () => {
    for (const s of ["", "   ", "abc", "NaN", "Infinity", "-Infinity", "abc def"]) {
      expect(firstNumericToken(s), JSON.stringify(s)).toBe("");
    }
  });

  test("「只有字母 + 数字」仍取到数字（`e5` → `5`，与修前一致）", () => {
    // e/E 不是数值 token 的一部分，但后面的数字是 —— 与修前相同，刻意不变。
    for (const s of ["e5", "E5", "k5"]) {
      expect(firstNumericToken(s), JSON.stringify(s)).toBe(legacyToken(s));
      expect(firstNumericToken(s), JSON.stringify(s)).not.toBe("");
    }
  });

  test("`|| 兜底` 仍能工作：空串是 falsy", () => {
    // model-eexport.ts:2510 靠 `firstNumericToken(...) || String(sectionRowCount)` 兜底
    expect(firstNumericToken("abc") || "7").toBe("7");
    expect(firstNumericToken("5") || "7").toBe("5");
    expect(firstNumericToken("0") || "7").toBe("0"); // "0" 是非空串，truthy，不被兜底
  });
});
