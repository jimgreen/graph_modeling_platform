// finiteNumber 的直接单测（14 处生产调用、此前零直呼）。
//
// ## 它是什么
//
// 数值安全取值：`Number(value)` 后若非有限则用 `fallback`。用在量测配置的
// 字号/小数位/默认值等**从 localStorage 或 JSON 读回**的字段上 —— 那些值可能
// 是字符串、null、脏数据。
//
// ## 探针实测出的四个「不是缺陷、但极易被顺手改坏」的契约
//
// ① **`""` / `"  "` / `null` / `false` / `[]` 都得 0，不是 fallback**
//    因为 `Number("") === 0`、`Number(null) === 0`、`Number(false) === 0`、
//    `Number([]) === 0`。若有人「顺手」加一层 `if (!value) return fallback`，
//    这些输入的行为会全部改变 —— 而 `0` 往往是**合法值**（字号 0、比例 0）。
//
// ② **fallback 不做类型校验**：签名写 `(value: unknown, fallback: number): number`，
//    但实际 `finiteNumber("abc", "9" as never)` 返回的是字符串 `"9"`。
//    形参类型是约定不是保证；类型面已由 TS 兜住，运行时不再校验是有意的取舍
//    （每次取值加一次校验 = 14 个调用点的固定开销）。
//
// ③ **`valueOf` 钩子会被调用**：`{valueOf: () => 7}` → 7。
//    这是 `Number()` 的标准行为（ToPrimitive），不是本函数特有的。
//
// ④ **十六进制/二进制字面量被解析**：`"0x1F"` → 31、`"0b101"` → 5。
//    同样来自 `Number()`，但对"配置值"这个场景很反直觉 —— 写错一个字符
//    从 31 变成 0（`"0xZZ"`），静默得很。
import { describe, expect, test } from "vitest";
import { finiteNumber } from "./formatUtils";

describe("正常路径：数值与数值字符串原样返回", () => {
  test("数字", () => {
    expect(finiteNumber(0, -999)).toBe(0);
    expect(finiteNumber(1, -999)).toBe(1);
    expect(finiteNumber(-1, -999)).toBe(-1);
    expect(finiteNumber(0.5, -999)).toBe(0.5);
    expect(finiteNumber(-2.5, -999)).toBe(-2.5);
  });

  test("数值字符串（含首尾空白、指数形式）", () => {
    expect(finiteNumber("0", -999)).toBe(0);
    expect(finiteNumber("1.5", -999)).toBe(1.5);
    expect(finiteNumber("-2.5", -999)).toBe(-2.5);
    expect(finiteNumber(" 3 ", -999), "Number() 会 trim").toBe(3);
    expect(finiteNumber("\t4\n", -999)).toBe(4);
    expect(finiteNumber("1e3", -999)).toBe(1000);
  });

  test("边界数值原样透传（未被舍入或截断）", () => {
    for (const v of [Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER, Number.MAX_VALUE, Number.MIN_VALUE, 5e-324, 1e308, -1e308, 1e-308]) {
      expect(finiteNumber(v, -999), String(v)).toBe(v);
    }
  });

  test("★ 负零的符号**保留**", () => {
    expect(Object.is(finiteNumber(-0, 99), -0), "-0 应保留符号").toBe(true);
    expect(Object.is(finiteNumber("-0", 99), -0), "字符串 -0 也保留").toBe(true);
    // 但算术上仍等于 0
    expect(finiteNumber(-0, 99) === 0).toBe(true);
  });

  test("返回类型恒为 number（正常输入下）", () => {
    for (const v of [0, 1, -1, 0.5, "3", "1e3"] as never[]) {
      expect(typeof finiteNumber(v, -999), String(v)).toBe("number");
    }
  });
});

describe("★ 非有限值 → 落 fallback", () => {
  test("Infinity / -Infinity / NaN（数字与字符串形式）", () => {
    for (const v of [Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NaN,
      "Infinity", "-Infinity", "NaN"] as never[]) {
      expect(finiteNumber(v, -999), String(v)).toBe(-999);
    }
  });

  test("无法解析的字符串 → fallback", () => {
    for (const v of ["abc", "1.2.3", "1,5", "--1", "1e", "e5", "1px", "50%"] as never[]) {
      expect(finiteNumber(v, -999), JSON.stringify(v)).toBe(-999);
    }
  });

  test("多元素数组（String() 得逗号分隔串，无法解析）→ fallback", () => {
    expect(finiteNumber([1, 2] as never, -999)).toBe(-999);
  });

  test("空对象（String() 得方括号包裹的 object Object）→ fallback", () => {
    expect(finiteNumber({} as never, -999)).toBe(-999);
  });

  test("不同 fallback 值都原样返回", () => {
    expect(finiteNumber("abc", 0)).toBe(0);
    expect(finiteNumber("abc", 42)).toBe(42);
    expect(finiteNumber("abc", -1)).toBe(-1);
    expect(finiteNumber("abc", 3.14)).toBe(3.14);
  });
});

describe("★ 空值不是 fallback：`Number()` 的隐式转换给 0", () => {
  // 这是最容易被"顺手优化"破坏的一组。若有人加 `if (!value) return fallback`，
  // 下面每一条都会变 —— 而 0 在量测配置里常是**合法值**（字号 0、比例 0）。
  test("空串与纯空白 → 0", () => {
    expect(finiteNumber("", -999), "Number(空串) === 0").toBe(0);
    expect(finiteNumber("   ", -999)).toBe(0);
    expect(finiteNumber("\t\n", -999)).toBe(0);
  });

  test("null → 0（Number(null) === 0）", () => {
    expect(finiteNumber(null, -999)).toBe(0);
  });

  test("布尔 → 1 / 0", () => {
    expect(finiteNumber(true, -999)).toBe(1);
    expect(finiteNumber(false, -999)).toBe(0);
  });

  test("空数组 / 单元素数组 → 0 / 元素值", () => {
    expect(finiteNumber([] as never, -999), "Number([]) === 0").toBe(0);
    expect(finiteNumber([5] as never, -999)).toBe(5);
    expect(finiteNumber(["5"] as never, -999)).toBe(5);
  });

  test("undefined → fallback（唯一走 fallback 的「空」值）", () => {
    // 与 null 的区别：Number(undefined) 是 NaN，不是 0
    expect(finiteNumber(undefined, -999)).toBe(-999);
  });

  test("★ 对照表：哪些「空」值得 0、哪些落 fallback", () => {
    const toZero = ["", "   ", null, false, []] as never[];
    const toFallback = [undefined, "abc", Number.NaN, Infinity, [1, 2], {}] as never[];
    for (const v of toZero) {
      expect(finiteNumber(v, -999), `${JSON.stringify(v)} 应得 0`).toBe(0);
    }
    for (const v of toFallback) {
      expect(finiteNumber(v, -999), `${JSON.stringify(v)} 应落 fallback`).toBe(-999);
    }
  });
});

describe("★ 十六进制 / 二进制字面量被解析（易被误读为 0）", () => {
  // 来自 `Number()` 的标准行为，但对「配置值」这个场景很反直觉：
  // 写错一个字符就静默变成别的数。
  test("十六进制", () => {
    expect(finiteNumber("0x1F", -999)).toBe(31);
    expect(finiteNumber("0xff", -999)).toBe(255);
    expect(finiteNumber("0X10", -999)).toBe(16);
  });

  test("二进制与八进制", () => {
    expect(finiteNumber("0b101", -999)).toBe(5);
    expect(finiteNumber("0o17", -999)).toBe(15);
  });

  test("★ 非法十六进制 → fallback（不会误读成 0）", () => {
    expect(finiteNumber("0xZZ", -999)).toBe(-999);
    expect(finiteNumber("0b12", -999)).toBe(-999);
  });
});

describe("★ `valueOf` / `toString` 钩子被调用（ToPrimitive 标准行为）", () => {
  test("自定义 valueOf", () => {
    expect(finiteNumber({ valueOf: () => 7 } as never, -999)).toBe(7);
  });

  test("自定义 toString", () => {
    expect(finiteNumber({ toString: () => "12" } as never, -999)).toBe(12);
  });

  test("valueOf 抛异常会**穿透**（不被兜底）", () => {
    // 如实记录：finiteNumber 不做 try/catch。钩子抛错是调用方的责任。
    const bomb = { valueOf: () => { throw new Error("boom"); } } as never;
    expect(() => finiteNumber(bomb, -999)).toThrow("boom");
  });
});

describe("等价性记录：`Number.isFinite` vs 全局 `isFinite`（此处可互换）", () => {
  // 变异验证时我把 `Number.isFinite` 改成全局 `isFinite`，测试**全绿**。
  // 查证后确认这是**等价改写**而非假绿：全局 isFinite 会先做隐式转换，
  // 而本函数的实参**已经过 `Number(value)`**，永远是 number。
  // 对 12 个 number 样本（0 / -0 / NaN / ±Infinity / 1e308 / 5e-324 /
  // MAX_VALUE / MIN_VALUE / ±1 / 0.5）实测差异 **0 个**。
  //
  // 记在这里是为了让后人看到"全绿"时不必重新怀疑：这两种写法在本函数里等价。
  // 若哪天有人把 `Number(value)` 那步去掉，全局 isFinite 就会开始"意外工作"
  //（对 undefined 返回 true），那时这条注释就是预警。
  test("对 number 实参两者完全等价（12 个样本）", () => {
    const numbers = [0, -0, 1, -1, 0.5, Number.NaN, Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY, 1e308, 5e-324, Number.MAX_VALUE, Number.MIN_VALUE];
    for (const n of numbers) {
      expect(Number.isFinite(n), String(n)).toBe(isFinite(n));
    }
  });

  test("对非 number 实参两者**不同**（所以去掉 Number() 转换就会出问题）", () => {
    // 全局 isFinite(undefined) === true（会先转成 NaN 再判… 实际 JS 规定
    // isFinite(undefined) 是 false，但 isFinite("abc") 是 false、
    // isFinite(null) 是 true）。这条钉住差异，免得有人"顺手简化"时踩坑。
    expect(isFinite(null as never), "全局 isFinite(null) 是 true").toBe(true);
    expect(Number.isFinite(null as never), "Number.isFinite(null) 是 false").toBe(false);
    expect(isFinite([] as never), "全局 isFinite([]) 是 true（空数组转 0）").toBe(true);
    expect(Number.isFinite([] as never)).toBe(false);
  });
});

describe("★ fallback 自身不做校验（原样透出）", () => {
  // 签名是 `(value: unknown, fallback: number): number`，但 fallback 参数
  // 不做运行时校验 —— 传非有限值会原样返回。
  test("非有限 fallback 原样透出", () => {
    expect(finiteNumber("abc", Number.NaN)).toBeNaN();
    expect(finiteNumber("abc", Number.POSITIVE_INFINITY)).toBe(Number.POSITIVE_INFINITY);
    expect(finiteNumber("abc", Number.NEGATIVE_INFINITY)).toBe(Number.NEGATIVE_INFINITY);
  });

  test("★ 类型违反的 fallback 原样透出（返回类型标注是 number，实际可能不是）", () => {
    // 我第一版把期望写成"会被转换"，被测试当场抓出。实际是**原样返回**。
    // 形参类型是约定不是保证；TS 在编译期兜住，运行时不再校验是有意的取舍
    // —— 每次取值加一次校验 = 14 个调用点的固定开销。
    expect(finiteNumber("abc", "9" as never)).toBe("9" as never);
    expect(typeof finiteNumber("abc", "9" as never)).toBe("string");
    expect(finiteNumber("abc", true as never)).toBe(true as never);
    expect(finiteNumber("abc", null as never)).toBeNull();
    expect(finiteNumber("abc", undefined as never)).toBeUndefined();
  });

  test("但 fallback 只在**原值非有限**时才透出（原值有限时不看 fallback）", () => {
    expect(finiteNumber(5, "9" as never), "原值有限 → 直接返回原值").toBe(5);
    expect(finiteNumber("6", "9" as never)).toBe(6);
  });
});

describe("幂等性：合法值再过一次仍是自己", () => {
  test("finiteNumber(finiteNumber(x, f), f) === finiteNumber(x, f)", () => {
    const samples: unknown[] = [0, 1, -1, 0.5, "2", "", null, true, [], [3], "abc", Number.NaN, Infinity, "0x10"];
    for (const v of samples) {
      const once = finiteNumber(v as never, -999);
      const twice = finiteNumber(once as never, -999);
      expect(twice, `${JSON.stringify(v)} → ${once} → ${twice}`).toBe(once);
    }
  });

  test("★ 唯一的例外：fallback 本身非有限时，第二次会再兜一次", () => {
    // finiteNumber("abc", NaN) = NaN（透出）；再过一次仍非有限 → 又透出 NaN。
    // 结果相同但走了两次兜底路径 —— 说明这个函数不缓存、每次都重新判定。
    const once = finiteNumber("abc", Number.NaN);
    const twice = finiteNumber(once, Number.NaN);
    expect(Number.isNaN(once)).toBe(true);
    expect(Number.isNaN(twice)).toBe(true);
  });
});
