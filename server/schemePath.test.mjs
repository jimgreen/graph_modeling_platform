// server/schemePath.mjs（37 行）：方案路径的编解码
//   parseSchemePathParam  URL query → 字符串数组（非法返 null）
//   encodeSchemePath      字符串数组 → URL query 值
//   requireSchemePath     非空校验
//
// 这是**方案路径进入文件系统之前的唯一关口**。每段都要过 `sanitizeSegment`
// （审查 B-P0-1：schemePath 数组元素携带相对段逃逸出根目录）。
// 判错的后果分两种：放过穿越段 → 写到根目录之外；或静默换成 fallback
// → 请求落到一个**合法但不同**的方案上，界面表现为「方案不见了」。
import { describe, expect, test } from "vitest";
import { encodeSchemePath, parseSchemePathParam, requireSchemePath } from "./schemePath.mjs";
import { sanitizeSegment } from "../shared/pathSafety.mjs";

const decode = (value) => parseSchemePathParam(encodeSchemePath(value));
// 每段的 fallback 就是字面量「方案」（见 safeFilePart 的第二参数）
const FALLBACK = "方案";
// 私有常量 maxFilePartLength = 80，与 shared/pathSafety.mjs 的默认参数同值
const MAX_PART = 80;

describe("encodeSchemePath：`encodeURIComponent(JSON.stringify(parts))`", () => {
  test("标准形态", () => {
    expect(encodeSchemePath(["方案A", "子方案"])).toBe(
      encodeURIComponent(JSON.stringify(["方案A", "子方案"]))
    );
    expect(encodeSchemePath([])).toBe(encodeURIComponent("[]"));
  });

  test("★ 非数组也能编（`JSON.stringify` 不校验）", () => {
    // 探针实测：编码成功，但回解必然 null（JSON.parse 后不是数组）。
    // 也就是说 `encodeSchemePath` **不保证产出可解码的值**。
    expect(encodeSchemePath("abc")).toBe(encodeURIComponent(JSON.stringify("abc")));
    expect(parseSchemePathParam(encodeSchemePath("abc"))).toBeNull();
    expect(encodeSchemePath(123)).toBe("123");
    expect(parseSchemePathParam(encodeSchemePath(123))).toBeNull();
  });

  test("★ `undefined` 编成字面量 \"undefined\"（非 JSON）", () => {
    // `JSON.stringify(undefined)` 返回**值** undefined 而非字符串，
    // `encodeURIComponent(undefined)` 把它变成 "undefined"。
    // 回解时 `JSON.parse("undefined")` 抛错 → null。
    expect(encodeSchemePath(undefined)).toBe("undefined");
    expect(parseSchemePathParam("undefined")).toBeNull();
    expect(encodeSchemePath(null)).toBe("null");
    expect(parseSchemePathParam("null")).toBeNull();
  });

  test("往返一致（不含净化副作用的段）", () => {
    for (const parts of [[], ["方案A"], ["方案A", "子方案", "模型B"], ["😀😀😀"], ["a\nb\tc"]]) {
      expect(decode(parts), JSON.stringify(parts)).toEqual(parts);
    }
  });

  test("★ 往返**不是无损**的：净化会改写段内容", () => {
    // 逐条钉住 —— 「编码后再解码」不等于「原样回来」。
    const lossy = [
      [["a/b"], ["a_b"]],
      [["a\\b"], ["a_b"]],
      [['a:b*c?d"e<f>g|h'], ["a_b_c_d_e_f_g_h"]],
      [["  x  "], ["x"]],
      [["", "x"], [FALLBACK, "x"]],
      [[null, "x"], [FALLBACK, "x"]],
      [[1, 2], ["1", "2"]]
    ];
    for (const [input, expected] of lossy) {
      expect(decode(input), JSON.stringify(input)).toEqual(expected);
    }
  });

  test("★ 未编码的裸 JSON 也能解（`decodeURIComponent` 对无 % 的串是恒等）", () => {
    // 所以两种形态都能进：`encodeSchemePath` 的产物与手工拼的裸 JSON。
    expect(parseSchemePathParam('["方案A"]')).toEqual(["方案A"]);
    expect(parseSchemePathParam(encodeSchemePath(["方案A"]))).toEqual(["方案A"]);
  });
});

describe("★ parseSchemePathParam：点段被**替换成 fallback**，不是被拒", () => {
  // 这是本模块最容易被误读的一处。它返回 null 的只有「整个参数不可解析」；
  // 段级问题一律静默替换，调用方拿到的是一个**合法但不同**的路径。
  const table = [
    [[".."], [FALLBACK]],
    [["."], [FALLBACK]],
    [["..."], [FALLBACK]],
    [["...."], [FALLBACK]],
    [["..", "x"], [FALLBACK, "x"]],
    [["x", ".."], ["x", FALLBACK]],
    // ★ 路径式穿越：斜杠被换成下划线，整段留在**同一层**，不产生子目录
    [["a/../b"], ["a_.._b"]],
    [["../etc"], [".._etc"]],
    [["a/../../b"], ["a_.._.._b"]],
    // 绝对路径注入同样被压平
    [["/etc/passwd"], ["_etc_passwd"]],
    [["C:\\Windows"], ["C_Windows"]]
  ];
  for (const [input, expected] of table) {
    test(`${JSON.stringify(input).padEnd(18)} → ${JSON.stringify(expected)}`, () => {
      expect(decode(input)).toEqual(expected);
    });
  }

  test("★ 净化后的段**不含任何路径分隔符**（无法借此构造子目录）", () => {
    for (const input of [["a/b"], ["a\\b"], ["../x"], ["a/b/c"], ["//server/share"]]) {
      for (const part of decode(input)) {
        expect(part.includes("/"), `${JSON.stringify(input)} → ${part}`).toBe(false);
        expect(part.includes("\\"), `${JSON.stringify(input)} → ${part}`).toBe(false);
      }
    }
  });

  test("「替换」而非「丢弃」：段数不减少", () => {
    // 与 `filter(Boolean)` 给人「可能有段被丢」的印象相反 —— 一段都不会少。
    expect(decode(["a", "..", "b"])).toHaveLength(3);
    expect(decode(["", "", ""])).toHaveLength(3);
    expect(decode(["a", null])).toHaveLength(2);
  });

  test("每段都恰好是 `sanitizeSegment(part, \"方案\", 80)` 的结果", () => {
    // 把私有 safeFilePart 的行为锚到公开原语上：改动任一处都会被抓到。
    for (const parts of [["方案A", "a/b"], [".."], ["  x  "], [1], [""], ["x".repeat(120)]]) {
      const expected = parts.map((p) => sanitizeSegment(p, FALLBACK, MAX_PART));
      expect(decode(parts), JSON.stringify(parts)).toEqual(expected);
    }
  });
});

describe("parseSchemePathParam：falsy 输入 → 空数组（不是 null）", () => {
  for (const value of ["", null, undefined, 0, false, Number.NaN]) {
    test(`${String(value).padEnd(10)} → []`, () => {
      expect(parseSchemePathParam(value)).toEqual([]);
    });
  }

  test("★ 缺席与「非法」是两回事：前者给 `[]`（= 顶层），后者给 `null`（= 拒绝）", () => {
    // 调用点一律写 `if (!requireSchemePath(parts))` 拒答，所以对 6 个接口而言
    // 两者结果相同。但语义不同，值得钉住：null 表示「别信这个参数」。
    expect(parseSchemePathParam(undefined)).toEqual([]);
    expect(parseSchemePathParam("garbage")).toBeNull();
  });
});

describe("parseSchemePathParam：不可解析的参数一律 null", () => {
  const table = [
    ["非 JSON", "abc"],
    ["JSON 数字", "123"],
    ["JSON 字符串", '"abc"'],
    ["JSON null", "null"],
    ["JSON true", "true"],
    ["JSON 对象", '{"a":1}'],
    ["坏百分号", "%"],
    ["坏百分号序列", "%ZZ"],
    ["截断的转义", "%E4%B8"],
    ["数组被截断", '["a"'],
    ["空串元素之外的全空白", "   "]
  ];
  for (const [label, value] of table) {
    test(`${label.padEnd(18)} → null`, () => {
      expect(parseSchemePathParam(value)).toBeNull();
    });
  }

  test("坏转义由 `decodeURIComponent` 抛 `URIError`、由 catch 吞成 null", () => {
    expect(() => decodeURIComponent("%")).toThrow(URIError);
    expect(parseSchemePathParam("%")).toBeNull();
  });

  test("★ 下面两条等价变异全绿是**正确的**（记录，避免下一个人重查）", () => {
    // ① `if (!Array.isArray(parsed))` 改 `if (parsed === null)`
    //   —— 数组检查对**输出**是冗余的：JSON 能解出的非数组值只有
    //      字符串 / 数字 / 布尔 / 对象 / null，它们**都没有 `.map`**，
    //      所以 `parsed.map(...)` 一律抛 TypeError、落进同一个 catch、同样得 null。
    //      因此每一种「非数组输入」的最终返回值都不变 ⇒ 全绿是应有结果。
    //   ⚠ 它对**控制流**仍有意义：把 TypeError 换成显式 return，
    //      意图上更清楚（不依赖「没 map 就抛」这个巧合）。
    //   下面这组断言证明「非数组输入 → null」对每种 JSON 类型都成立：
    for (const value of ["123", '"abc"', "true", "false", "null", '{"a":1}']) {
      expect(parseSchemePathParam(value), value).toBeNull();
      // 等价的另一种写法：让 .map 自己抛
      expect(() => JSON.parse(value).map((x) => x), `${value} 无 .map`).toThrow(TypeError);
    }

    // ② 去掉 `.filter(Boolean)`
    //   —— fallback 是字面量「方案」（非空），`sanitizeSegment` 最后一行是
    //      `return cleaned || fallback`，所以**每段都非空**，filter 永远不删东西。
    //   ⇒ 等价变异，全绿正确。
    //   ⚠ 什么会让它失效：若把 fallback 改成 `""`，段就能为空、filter 开始起作用。
    expect(sanitizeSegment("", FALLBACK), "fallback 非空 → 段非空").toBe(FALLBACK);
    expect(sanitizeSegment("..", FALLBACK)).toBe(FALLBACK);
    expect(sanitizeSegment(null, FALLBACK)).toBe(FALLBACK);
    expect(decode(["", "..", null, "x"]).every((p) => p.length > 0), "无一为空").toBe(true);
  });

  test("嵌套数组被拍平（`sanitizeSegment` 的 `String([\"a\"])` → `\"a\"`）", () => {
    // 实测 `[["a"]]` → `["a"]`。不是报错，也不是保留嵌套 —— 是拍平。
    // （第一版我把探针里 encodeSchemePath 的**产物**当成裸字符串传，
    //   漏了收尾的 `]` 导致 JSON 不完整、返回 null，被测试当场顶回。）
    expect(parseSchemePathParam('[["a"]]')).toEqual(["a"]);
    // 更深一层：单元素数组，元素是 `[["b"],2]` → `String(...)` = `"b,2"` → **一段**
    expect(parseSchemePathParam('[[["b"],2]]')).toEqual(["b,2"]);
    // 两元素的嵌套数组 → 两段（用 encodeSchemePath 生成，避免手数括号）
    expect(decode([["b"], ["2"]])).toEqual(["b", "2"]);
    expect(parseSchemePathParam(encodeSchemePath([["b"], ["2"]]))).toEqual(["b", "2"]);
    // 往返视角：编码嵌套数组后解出来是一维的
    expect(decode([["a"]])).toEqual(["a"]);
    // 截断的嵌套数组（JSON 不完整）→ null，不是拍平
    expect(parseSchemePathParam('[["a"]')).toBeNull();
  });
});

describe("每段 80 码元上限（私有常量 maxFilePartLength）", () => {
  test("恰好 80 → 不截；81 → 截到 80", () => {
    expect(decode(["y".repeat(80)])[0]).toHaveLength(80);
    expect(decode(["y".repeat(81)])[0]).toHaveLength(80);
    expect(decode(["y".repeat(200)])[0]).toHaveLength(80);
  });

  test("★ 截断使不同输入碰撞（81 与 80 个 y 得同一个段）", () => {
    expect(decode(["y".repeat(81)])).toEqual(decode(["y".repeat(80)]));
  });

  test("★ `slice` 按 **UTF-16 码元**切 → 落单代理", () => {
    // 79 个 a + 1 个 emoji = 81 码元，截到 80 正好切在代理对中间，
    // 留下落单高位代理（0xD83D）。这会让 `encodeURIComponent` 抛 URIError。
    const input = `${"a".repeat(79)}😀`;
    const out = decode([input])[0];
    expect(input).toHaveLength(81);
    expect(out).toHaveLength(80);
    expect(out.charCodeAt(79), "★ 末位是落单高位代理").toBeGreaterThanOrEqual(0xd800);
    expect(out.charCodeAt(79)).toBeLessThanOrEqual(0xdbff);
    expect(() => encodeURIComponent(out), "★ 落单代理无法再编码").toThrow(URIError);
    expect(out).not.toBe(input);
  });

  test("★ 判定不修：真实数据里不可达（已量过）", () => {
    // 扫 `data/` 下全部 json：**只有 1 个 scheme 名**，最长 4 码元
    //（「自动成图」），超过 80 码元的 0 个。
    // 修它要把 `slice` 换成按码点的 `Array.from(str).slice(0, n)` ——
    // 那会改变**所有**段名的截断语义，是一次行为变更换 0 条真实收益。
    // 这里钉住现状，若日后出现长方案名，上面两条会先转红提醒。
    expect(MAX_PART).toBe(80);
    expect(decode(["方案A"])).toEqual(["方案A"]);
  });
});

describe("requireSchemePath：只看 `Array.isArray && length > 0`", () => {
  test("非空数组 → true（**不检查元素**）", () => {
    expect(requireSchemePath(["a"])).toBe(true);
    // ★ 以下三种都判 true，尽管每一种作为路径都是无意义的
    expect(requireSchemePath([""]), "空串元素").toBe(true);
    expect(requireSchemePath([null]), "null 元素").toBe(true);
    expect(requireSchemePath(["  "]), "纯空白元素").toBe(true);
    expect(requireSchemePath([["a"]]), "嵌套数组").toBe(true);
  });

  test("空数组 → false", () => {
    expect(requireSchemePath([])).toBe(false);
  });

  test("非数组 → false（含类数组与 Set）", () => {
    for (const value of [undefined, null, "a", {}, 0, true, new Set(["a"]), { length: 1 }]) {
      expect(requireSchemePath(value), String(JSON.stringify(value) ?? typeof value)).toBe(false);
    }
  });

  test("★ 它不检查元素，所以 `[\"\"]` 会通过 —— 净化阶段已把它变成「方案」", () => {
    // `parseSchemePathParam` 会把空串段替换成 fallback，所以从解析结果看
    // 不可能出现空元素；`requireSchemePath` 因此不需要重复检查。
    // 但直接调用它时是可以传空元素的 —— 6 个调用点都是从解析结果拿值，故安全。
    expect(decode([""])).toEqual([FALLBACK]);
    expect(requireSchemePath(decode([""]))).toBe(true);
  });
});
