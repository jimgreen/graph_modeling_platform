// formatSvgNumber 的等价性与漂移修复守卫（跨端共享单源）。
//
// 此前三处实现**语义已漂移**：src 版对非有限值输出字面 "NaN"/"Infinity"，
// server 版归 0，scripts 版连精度都不同（4 位 vs 5 位）。本文件把三者钉到同一语义，
// 并记录「为什么取 server 那一版」。
import { describe, expect, test } from "vitest";
import { formatSvgNumber } from "./formatSvgNumber.mjs";

/** src/svgUtils.ts 的原实现（无防御） */
const originalNoGuard = (value) => {
  const rounded = Math.round(value * 100000) / 100000;
  return String(Object.is(rounded, -0) ? 0 : rounded);
};
/** scripts/generate-docer-compatible-icons.mjs 的原实现（4 位小数） */
const originalScripts = (value) => Number(value.toFixed(4)).toString();

describe("★ 漂移修复：非有限值归 0（此前 src 版输出字面 NaN）", () => {
  test("NaN / Infinity / -Infinity → \"0\"，不产出无效 SVG 属性", () => {
    // 修前：`formatSvgNumber(NaN)` 返回 "NaN" → 生成 x="NaN" → 浏览器**静默忽略**
    // 该属性 → 元素坐标回落默认值，而渲染/导出流程不报任何错。
    expect(formatSvgNumber(NaN)).toBe("0");
    expect(formatSvgNumber(Infinity)).toBe("0");
    expect(formatSvgNumber(-Infinity)).toBe("0");
  });

  test("undefined / null / 非数字字符串 / 对象 → \"0\"", () => {
    expect(formatSvgNumber(undefined)).toBe("0");
    expect(formatSvgNumber(null)).toBe("0");
    expect(formatSvgNumber("abc")).toBe("0");
    expect(formatSvgNumber({})).toBe("0");
  });

  test("与修前实现对照：这六类输入的差异正是本次修复的范围", () => {
    // 显式记录差异，避免后人以为"两边一样"而回退修复
    expect(originalNoGuard(NaN)).toBe("NaN");
    expect(originalNoGuard(undefined)).toBe("NaN");
    expect(formatSvgNumber(NaN)).not.toBe(originalNoGuard(NaN));
  });
});

describe("零行为变化：对所有有限值与原实现逐字节相同", () => {
  test("整型与边界值", () => {
    const cases = [0, -0, 1, -1, 0.5, -0.5, 1e-7, -1e-7, 104, 64, 1e15, -1e15,
      1e21, -1e21, Number.MAX_SAFE_INTEGER, -Number.MAX_SAFE_INTEGER, 2 ** 31, -(2 ** 31)];
    for (const v of cases) {
      expect(formatSvgNumber(v), String(v)).toBe(originalNoGuard(v));
    }
  });

  test("舍入边界（第 6 位为 5 的值）", () => {
    for (let i = 1; i <= 500; i += 1) {
      const v = i / 1000000;
      expect(formatSvgNumber(v), String(v)).toBe(originalNoGuard(v));
      expect(formatSvgNumber(-v), String(-v)).toBe(originalNoGuard(-v));
    }
  });

  test("字符串数值（server 版做 Number() 显式转换，src 版靠乘法隐式转换）", () => {
    for (const s of ["1.5", "-2.25", "0", "1e3", "  7  ", "0.000005", "0.000015"]) {
      expect(formatSvgNumber(s), s).toBe(originalNoGuard(s));
    }
  });

  test("负零归零（不输出 \"-0\"）", () => {
    expect(Object.is(formatSvgNumber(-0), "-0")).toBe(false);
    expect(formatSvgNumber(-0)).toBe("0");
    expect(formatSvgNumber(-1e-7)).toBe("0");
  });

  test("随机浮点 20000 例与原实现相同", () => {
    let seed = 20260929;
    const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    for (let i = 0; i < 20000; i += 1) {
      const v = (rnd() - 0.5) * (i % 3 === 0 ? 1e6 : i % 3 === 1 ? 1000 : 1e-3);
      expect(formatSvgNumber(v), String(v)).toBe(originalNoGuard(v));
    }
  });
});

describe("精度约定：5 位小数（与 scripts 版 4 位不同，已刻意统一）", () => {
  test("第 5 位小数保留、第 6 位截断", () => {
    expect(formatSvgNumber(1.234567891)).toBe("1.23457");
    // scripts 版原为 4 位：Number((1.234567891).toFixed(4)) === 1.2346
    expect(originalScripts(1.234567891)).toBe("1.2346");
    // 刻意取 5 位（server 与 src 原本都是 5 位，占多数）
    expect(formatSvgNumber(1.234567891)).not.toBe(originalScripts(1.234567891));
  });
});

describe("输出可直接用作 SVG 属性值", () => {
  test("非有限值已归 0，输出不含 NaN / Infinity", () => {
    for (const v of [NaN, Infinity, -Infinity, undefined, null, "abc", {}]) {
      const out = formatSvgNumber(v);
      expect(out, String(v)).not.toMatch(/NaN|Infinity/i);
    }
  });

  test("如实记录：超大值会输出**科学计数法**（SVG 1.1 不接受，浏览器会忽略该属性）", () => {
    // 探针实测发现：String(1e21) === "1e+21"，而 SVG 1.1 的数值语法不含指数形式，
    // 即 `x="1e+21"` 会被浏览器当无效属性忽略。
    //
    // **刻意不修**：1e21 像素级坐标不可能来自真实数据（画布量级在 1e4~1e5），
    // 只可能来自脏数据。而修复要么展开成 22 位定点（让 SVG 体积暴涨）、
    // 要么加范围截断（凭空发明业务规则）—— 两者都是**无收益的复杂度**。
    // 此处钉住当前行为，日后若真出现超大坐标再按实际需求处理。
    expect(formatSvgNumber(1e21)).toBe("1e+21");
    expect(formatSvgNumber(-1e21)).toBe("-1e+21");
    // 现实量级不受影响
    for (const v of [0, 1, 100, 1e4, 1e5, 1e6, 1e15]) {
      expect(formatSvgNumber(v), String(v)).not.toMatch(/e[+-]/i);
    }
  });

  test("放进 SVG 根标签后是合法属性值（浏览器不会忽略）", () => {
    const attr = `x="${formatSvgNumber(NaN)}" y="${formatSvgNumber(12.5)}"`;
    expect(attr).toBe('x="0" y="12.5"');
  });
});

// 以下输入全部**不是** JS number，一律走源码第一行 `Number(value)` 的 ToNumber 转换。
//
// 此前该转换面只有 null / undefined / `abc` / `{}` 顺带经过（见首个 describe），
// 且只断言「归 0」这一个结果，**零断言覆盖**。缺口在于：哪些输入其实转换得出
// 合法数字，从未被钉住。
//
// ## 各条断言的判别力（副本上注入变异实测，勿凭猜）
//
//   `Number(value)` → `Number.parseFloat(value)`：本块 4 条转红（布尔 / 对象与数组 /
//     进制前缀串 / 非法字符串）。parseFloat("0x10")===0、parseFloat("12abc")===12、
//     parseFloat(true)===NaN，三处都被抓。
//   `Number(value)` → 直接用 `value`（删掉包装）：本块 5 条转红。
//   `Number(value)` → `value * 1`：**只有 BigInt 那一条转红**。
//
//   最后一条是反直觉的，记在这里免得后人重新踩：`x * 1` 与 `Number(x)` 同为 ToNumber，
//   对字符串**同样认** 0x / 0b / 0o 前缀。所以下面的「进制前缀串」断言
//   **不能**区分二者 —— 别把它当成 `Number()` 的防线，它挡的是 parseFloat 和
//   「删掉包装」这两种改法。
//
// 另有两条属于**契约钉桩而非判别项**（实测任何常见变异都转不了红，故如实标注）：
// 「空类与空值」对 null/空串/空白串，parseFloat 与 Number 同值；「非有限值与负零」
// 的 NaN 分支由首个 describe 的漂移修复用例先行拦下。保留它们是为了把当前行为写成
// 可执行的文字契约，而不是为了挡变异。
describe("Number() 隐式转换面：非 number 输入的实际取值", () => {
  test("空类与空值：null / undefined / 空串 / 纯空白串 一律归 0", () => {
    expect(formatSvgNumber(null)).toBe("0");
    expect(formatSvgNumber(undefined)).toBe("0");
    expect(formatSvgNumber("")).toBe("0");
    expect(formatSvgNumber("   ")).toBe("0");
    expect(formatSvgNumber("\n\t")).toBe("0");
    // 空白串归 0 来自 Number() 的空串规则，不是本仓自加的守卫；
    // 保留该行为是为了让「上游传来带 padding 的坐标」静默退化，而不是抛错。
    // **契约钉桩，非判别项**（见上方变异实测）：这几条与 null/NaN 同归 0，
    // 本就无法把 Number() 与 parseFloat / `* 1` 区分开。
  });

  test("布尔：true 转换为 1、false 转换为 0", () => {
    expect(formatSvgNumber(true)).toBe("1");
    expect(formatSvgNumber(false)).toBe("0");
    // `false → "0"` 与 `NaN → "0"` 的**返回值完全相同**，故上方非有限值用例
    // 无法证明布尔分支被走过；只有 `true → "1"` 才是这条分支的唯一判别项。
  });

  test("对象与数组：单元素数组按 ToPrimitive 取值，空数组与多元素数组归 0", () => {
    // Number({}) === NaN → 归 0
    expect(formatSvgNumber({})).toBe("0");
    // Number([]) === 0；Number([""]) === Number("") === 0 —— 两者同值但路径不同
    expect(formatSvgNumber([])).toBe("0");
    expect(formatSvgNumber([""])).toBe("0");
    // 单元素数组：ToPrimitive 先 join("")，故 ["5"] 与 [5] 都得到 5
    expect(formatSvgNumber(["5"])).toBe("5");
    expect(formatSvgNumber([5])).toBe("5");
    // 多元素数组 join(",") → "1,2" → NaN → 0，**不会**静默取首元素
    expect(formatSvgNumber(["1", "2"])).toBe("0");
  });

  test("进制前缀串：0x10 → 16、0b101 → 5、0o17 → 15", () => {
    // 这三条能挡住 `Number.parseFloat`（parseFloat("0x10")===0）与「删掉 Number() 包装」
    // （Number.isFinite("0x10")===false → 归 0）两种改法。
    // 但**挡不住** `value * 1` —— 乘法同样是 ToNumber，实测仍得 16。
    expect(formatSvgNumber("0x10")).toBe("16");
    expect(formatSvgNumber("0b101")).toBe("5");
    expect(formatSvgNumber("0o17")).toBe("15");
    // 前缀十六进制带小数点不是合法数值 → NaN → 0。
    // 注意这条**不判别**：parseFloat("0x10.8") 同样是 0（它在 'x' 处就截断），
    // 两者同值。写在这里只为钉住「不该把 0x10.8 当成 16.8 解析」。
    expect(formatSvgNumber("0x10.8")).toBe("0");
  });

  test("指数、前导符号与首尾空白：Number() 全部吞掉", () => {
    expect(formatSvgNumber("1e3")).toBe("1000");
    expect(formatSvgNumber(" 12 ")).toBe("12");
    expect(formatSvgNumber("+7")).toBe("7");
    expect(formatSvgNumber("-7")).toBe("-7");
    // 刻意与「科学计数法**输出**」区分开：这里是**输入** `1e3` 被解析成有限值 1000，
    // 不产出 `e+` 记号。输出侧 1e21 → "1e+21" 是另一回事，且**刻意不修**
    // （理由见上文「如实记录：超大值会输出科学计数法」一条）。
  });

  test("非法字符串：abc / 12abc / 字符串 Infinity 均归 0", () => {
    expect(formatSvgNumber("abc")).toBe("0");
    // 部分数值前缀也不合法：parseFloat 能吃下 "12abc"，Number() 不能
    expect(formatSvgNumber("12abc")).toBe("0");
    // 字符串 "Infinity" 能被 Number() **成功**解析成 Infinity，再被有限性守卫归 0 ——
    // 转换成功、随后守卫兜底，与直接传 Infinity 同守卫但不同路径。
    expect(formatSvgNumber("Infinity")).toBe("0");
    expect(formatSvgNumber("-Infinity")).toBe("0");
  });

  test("非有限值与负零：NaN / ±Infinity / -0 / 字符串 -0 全部归 0", () => {
    expect(formatSvgNumber(NaN)).toBe("0");
    expect(formatSvgNumber(Infinity)).toBe("0");
    expect(formatSvgNumber(-Infinity)).toBe("0");
    expect(formatSvgNumber(-0)).toBe("0");
    // 字符串 "-0" 先转成 -0 再走 Object.is 判定，与数字 -0 殊途同归
    expect(formatSvgNumber("-0")).toBe("0");
    // 取整后落在 -0 的区间（|v| < 5e-6）
    expect(formatSvgNumber("-0.000001")).toBe("0");
    // 附注（实测）：源码里 `Object.is(rounded, -0) ? 0 : rounded` 这一层**是冗余的** ——
    // 因为 `String(-0)` 本就等于 "0"。删掉它本块与既有「负零归零」用例全部照绿。
    // 即属等价变异，绿是正确结果，别为它硬造断言；要动这层须先改变 String 的取用方式。
  });

  test("Symbol 会抛 TypeError —— 当前唯一未被归 0 兜住的输入（非有意设计）", () => {
    // 与上面所有「静默归 0」相反：Number(Symbol) 本身即抛异常，函数无 try/catch。
    // **不是有意为之**，此处仅把现状钉成契约：若日后补上 try/catch，这条会转红，
    // 那时应当由改动者显式决定归 0 还是继续抛，而不是被静默改掉。
    expect(() => formatSvgNumber(Symbol("x"))).toThrow(TypeError);
    // 反之 BigInt 与 Number 包装对象 Number() 都能正常转换。
    // **BigInt 这条是 `Number()` 唯一不可替代之处**：实测把 `Number(value)` 换成
    // `value * 1` 时，本块**只有这一条**会红（`1n * 1` 抛 BigInt 混合运算错误）。
    // 若日后有人删掉它，本块对 `Number()` vs `* 1` 就彻底零判别力了。
    expect(formatSvgNumber(1n)).toBe("1");
    expect(formatSvgNumber(new Number(7))).toBe("7");
  });
});
