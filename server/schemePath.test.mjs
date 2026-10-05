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

// 模拟生产链路：编码 → 放进 URL query → URL 层解码（searchParams.get 的效果）→ 交给解析函数。
// 这层 decodeURIComponent **不能省**：省略它就等于测「传编码值」，而生产从不解两次。
const decode = (value) => parseSchemePathParam(decodeURIComponent(encodeSchemePath(value)));
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
    expect(decode("abc")).toBeNull();
    expect(encodeSchemePath(123)).toBe("123");
    expect(decode(123)).toBeNull();
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

  test("裸 JSON 与 URL 层已解码的值都能解（生产只走后者）", () => {
    // 入参契约是「已解码」，所以裸 JSON（URL 层解码后的原样）与手工拼的裸 JSON 等价。
    expect(parseSchemePathParam('["方案A"]')).toEqual(["方案A"]);
    expect(decode(["方案A"])).toEqual(["方案A"]);
  });

  test("★ 方案名含 % 时不被当百分号转义（修复二次解码的回归）", () => {
    // 旧实现多解一层：%41 → 'A'，方案名被静默改成另一个**合法但不同**的名字。
    for (const name of ["50%41厂", "100%班", "50%AB班", "50%"]) {
      expect(decode([name]), name).toEqual([name]);
    }
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

  test("坏转义串仍然 null，但已与 `decodeURIComponent` 无关", () => {
    // 保留这条对照事实：decodeURIComponent("%") 抛 URIError。
    // 解析函数**不再调用它**（契约是入参已解码），所以现在的 null 来自 JSON.parse 抛错。
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

// ══════════════════════════════════════════════════════════════════════
// 经**真实 URL** 的端到端往返
// ══════════════════════════════════════════════════════════════════════
//
// 为什么这组不能省（上面那条 `decode` 也编过一次）——
//
// `decode` 用 `decodeURIComponent` **模拟** URL 层。它成立的前提是
// `encodeURIComponent` 把所有 URL 敏感字符都编掉了。一旦编码侧漏编一个，
// `decode` 依旧全绿，而**真的 URL 解析器**会各自变形。实测（把
// `encodeURIComponent` 换成 `encodeURI`，后者保留 `#` `&` `+` `=` `$` `,`）：
//
//   输入              真实 URL 结果          `decode` 模拟结果（仍全绿）
//   ["方案#1"]        null（# 之后进 fragment） ["方案#1"]
//   ["a&b"]           null（值被切成两个参数）  ["a&b"]
//   ["a+b"]           ["a b"]（+ 被解成空格）   ["a+b"]
//
// 三类都是「静默落到另一个合法但不同的方案」或直接 400 —— 而 `decode` 一个都抓不到。
// 所以下面每条都让真的 `URL` / `URLSearchParams` 过一遍。
//
// 注入方式必须是**手拼 query 串**，这是生产写法：
//   · apiV1Schemes.test.mjs:183 / apiV1Schemes.mjs / cimExport.mjs / eFileExport.mjs / sendModel.mjs
//     都把 `encodeSchemePath` 的产物直接插进 `?schemePath=…`
//   · swaggerPage.mjs `buildUrl` 同理（`encodeURIComponent(name) + "=" + encodeURIComponent(v)`）
// ⚠ 不能用 `url.searchParams.set("schemePath", encoded)` —— 它会把 `%` 再编成 `%25`，
//   变成二次编码，`searchParams.get` 取出来仍带 `%`，生产从这条路径取值。
const ORIGIN = "http://127.0.0.1:5174";
const ENTRY = "/v1/schemes/model/svg";

const viaUrl = (parts, entry = ENTRY) => {
  const url = new URL(`${ORIGIN}${entry}?schemePath=${encodeSchemePath(parts)}`);
  // 这一行就是生产读取方式（apiV1Schemes.mjs:174 等 12 处）
  const got = url.searchParams.get("schemePath");
  return { url, got, out: parseSchemePathParam(got) };
};

describe("真实 URL 往返：含 # 的方案名不会被 fragment 截断", () => {
  const parts = ["方案#1", "子#方案", "100%#3", "#"];

  test("编码成 %23，往返还原成原串，hash 为空", () => {
    const { url, got, out } = viaUrl(parts);
    // ★ 判别点：# 若漏编，会被当成 fragment 分隔符，query 值只剩前缀
    expect(encodeSchemePath(parts), "★ # 必须编成 %23").toContain("%23");
    expect(url.hash, "★ # 未泄漏进 fragment").toBe("");
    expect(url.search, "query 里只有转义形态，无裸 #").not.toContain("#");
    expect(url.searchParams.getAll("schemePath"), "值未被切成两个参数").toHaveLength(1);
    // URL 层解码后就是裸 JSON（解码职责归 URL 层，见 schemePath.mjs 的入参契约）
    expect(got).toBe(JSON.stringify(parts));
    expect(out, "★ 往返还原成原串").toEqual(parts);
  });

  test("反证：漏编 # 时真的 URL 会吃掉尾巴（既有用例抓不到）", () => {
    // 同进程 `decode` 模拟：全绿，看不出问题
    expect(decodeURIComponent(encodeURI(JSON.stringify(["方案#1"]))), "既有模拟无判别力").toBe(
      '["方案#1"]'
    );
    // 真的 URL：# 之后全部进 fragment
    const raw = new URL(`${ORIGIN}${ENTRY}?schemePath=${JSON.stringify(["方案#1"])}`);
    // ⚠ fragment 用 WHATWG 的 fragment percent-encode 集合，`"` 被编成 %22
    expect(raw.hash, "反证：# 之后全进 fragment").toBe("#1%22]");
    expect(raw.searchParams.get("schemePath"), "反证：值只剩前缀").toBe('["方案');
    expect(parseSchemePathParam(raw.searchParams.get("schemePath")), "反证：前缀不可解").toBeNull();
  });
});

describe("真实 URL 往返：含 & 的方案名不会被切成第二个 query 参数", () => {
  const parts = ["a&b", "x=1&y=2", "&&", "a&"];

  test("编码成 %26，往返还原成原串，query 里只有一个 schemePath", () => {
    const { url, got, out } = viaUrl(parts);
    expect(encodeSchemePath(parts), "★ & 必须编成 %26").toContain("%26");
    expect([...url.searchParams.keys()], "★ 没有多出第二个参数名").toEqual(["schemePath"]);
    expect(url.searchParams.getAll("schemePath")).toHaveLength(1);
    expect(got).toBe(JSON.stringify(parts));
    expect(out, "★ 往返还原成原串").toEqual(parts);
  });

  test("反证：漏编 & 时值被截断，且 & 之后变成独立参数", () => {
    expect(decodeURIComponent(encodeURI(JSON.stringify(["a&b"]))), "既有模拟无判别力").toBe(
      '["a&b"]'
    );
    const raw = new URL(`${ORIGIN}${ENTRY}?schemePath=${JSON.stringify(["a&b"])}`);
    expect([...raw.searchParams.keys()], "反证：& 后面成了独立参数名").toEqual([
      "schemePath",
      'b"]'
    ]);
    expect(raw.searchParams.get("schemePath"), "反证：值只剩前缀").toBe('["a');
    expect(parseSchemePathParam(raw.searchParams.get("schemePath")), "反证：不可解").toBeNull();
  });
});

describe("真实 URL 往返：含 + 的方案名不会被解成空格", () => {
  const parts = ["a+b", "空格 x", "+", "a b"];

  test("编码成 %2B，往返还原成原串，+ 未变空格", () => {
    const { url, got, out } = viaUrl(parts);
    expect(encodeSchemePath(parts), "★ + 必须编成 %2B").toContain("%2B");
    expect(url.search, "query 里无裸 +").not.toContain("+");
    expect(got).toBe(JSON.stringify(parts));
    // ★ 判别点：URLSearchParams 走 urlencoded 规则，裸 + 会变空格。
    // 断言只能盯住第 0 段 —— parts[3] 本身就是含真空格的段，不能全局搜 "a b"。
    expect(out, "★ 往返还原成原串（+ 与空格是两个不同方案）").toEqual(parts);
    expect(out[0], "★ 第 0 段的 + 未被解成空格").toBe("a+b");
    expect(out[0], "★ 且未被解成 parts[3] 那个空格方案").not.toBe("a b");
  });

  test("反证：漏编 + 时静默落到另一个合法但不同的方案", () => {
    expect(decodeURIComponent(encodeURI(JSON.stringify(["a+b"]))), "既有模拟无判别力").toBe(
      '["a+b"]'
    );
    const raw = new URL(`${ORIGIN}${ENTRY}?schemePath=${JSON.stringify(["a+b"])}`);
    expect(raw.searchParams.get("schemePath"), "反证：+ 被解成空格").toBe('["a b"]');
    // ★ 危险形态：不报错、不是 null，而是**合法但不同**的路径
    expect(parseSchemePathParam(raw.searchParams.get("schemePath")), "反证：静默漂移").toEqual([
      "a b"
    ]);
  });
});

describe("真实 URL 往返：裸 % 原样保留（实测无损，非降级）", () => {
  // 先跑过一遍才敢这么写：`encodeURIComponent` 把 `%` 编成 `%25`，所以
  // URL 层解回来仍是裸 `%`，**没有抛错**。若把断言写成「抛错」会红。
  // %41 = 合法转义（会被解成 'A'）、%AB = 非法续字节（会被解成替换字符 U+FFFD），
  // %25 = 编码后的裸 % 自身。三者在「多解一层」下分别给出三个不同的错误答案。
  const parts = ["50%", "%", "100%班", "50%41厂", "50%AB班", "%E4%B8", "%25"];

  test("每个 % 编成 %25，往返还原成原串（含 %41 / %AB 这类伪转义）", () => {
    const { url, got, out } = viaUrl(parts);
    expect(encodeSchemePath(parts), "★ 裸 % 编成 %25").toContain("%25");
    expect(url.search).toContain("%25");
    // URL 层只解一层：%25 → %，于是 %41 保持字面文本，不会变成 'A'
    expect(got).toBe(JSON.stringify(parts));
    expect(out, "★ 往返还原成原串").toEqual(parts);
    expect(out[1], "★ 纯 % 段原样回来").toBe("%");
    expect(out[3], "★ %41 未被解成 A").toBe("50%41厂");
    expect(out[4], "★ %AB 未被解成 U+FFFD").toBe("50%AB班");
    expect(out[6], "★ %25 未被解成 %").toBe("%25");
    expect(out).not.toContain("50A厂");
  });

  test("解码层数决定一切：解一层保留 %41，解两层漂移到别的方案", () => {
    // 这就是 schemePath.mjs 注释里记的「不再多解一层」的理由，本次在 URL 层复核
    expect(decodeURIComponent(encodeSchemePath(["50%41厂"])), "解一层").toBe('["50%41厂"]');
    expect(
      decodeURIComponent(decodeURIComponent(encodeSchemePath(["50%41厂"]))),
      "★ 多解一层会落到 50A厂"
    ).toBe('["50A厂"]');
    // 而 %AB（非合法 UTF-8 续字节）多解一层会抛 URIError —— 生产不抛，因为它不解第二层
    expect(() => decodeURIComponent(encodeSchemePath(["50%AB班"]))).not.toThrow();
    expect(parseSchemePathParam(viaUrl(["50%AB班"]).got), "生产路径原样保留").toEqual(["50%AB班"]);
  });
});

describe("真实 URL 往返：超长段 —— 该输入不可无损往返，钉的是现状降级", () => {
  test("81 码元起截到 80（真实阈值 = MAX_PART，非 81 非 100）", () => {
    // 边界逐个量过：79 / 80 无损，81 / 82 截到 80
    expect(viaUrl(["y".repeat(79)]).out, "79 无损").toEqual(["y".repeat(79)]);
    expect(viaUrl(["y".repeat(80)]).out, "80 无损").toEqual(["y".repeat(80)]);
    // ★ 降级形态：静默截断，不报错、不返回 null
    expect(viaUrl(["y".repeat(81)]).out[0], "★ 81 → 80").toHaveLength(MAX_PART);
    expect(viaUrl(["y".repeat(82)]).out[0], "★ 82 → 80").toHaveLength(MAX_PART);
    expect(viaUrl(["y".repeat(200)]).out[0]).toHaveLength(MAX_PART);
    expect(viaUrl(["y".repeat(81)]).out[0]).toBe("y".repeat(MAX_PART));
  });

  test("★ 截断使 81 与 80 码元碰撞（同 hash 的两个输入落到同一目录）", () => {
    expect(viaUrl(["y".repeat(81)]).out).toEqual(viaUrl(["y".repeat(80)]).out);
    // 判别力自证：这三条若被改成「不截断」或「阈值 81」，必转红
    expect(MAX_PART).toBe(80);
  });

  test("★ 截断切在代理对中间 → 产物是落单代理，无法直接进 URL", () => {
    // 79 个 a + 1 个 emoji = 81 码元，slice 切在高位代理 0xD83D 之后
    const input = `${"a".repeat(79)}😀`;
    const { out } = viaUrl([input]);
    expect(input).toHaveLength(81);
    expect(out[0]).toHaveLength(MAX_PART);
    expect(out[0].charCodeAt(79), "★ 末位是落单高位代理").toBe(0xd83d);
    // 判别点：这个段**不能**用 encodeURIComponent 直接进 URL
    expect(() => encodeURIComponent(out[0]), "★ 落单代理无法直接编进 URL").toThrow(URIError);
    // 但 encodeSchemePath 仍能编（JSON.stringify 先把它转义成 6 字符序列），且能无损往返
    expect(encodeSchemePath(out), "经 encodeSchemePath 可编").toContain("%5Cud83d");
    expect(viaUrl(out).out, "★ 落单代理本身可无损往返").toEqual(out);
  });
});

describe("真实 URL 往返：落单代理段（lone surrogate）", () => {
  const parts = ["\uD800", "a\uD800b", "\uDC00", "😀\uD83Dx", "\uDFFF"];

  test("encodeURIComponent 直接吃落单代理会抛，encodeSchemePath 却不抛", () => {
    // 抛错的根因：URIError —— 落单代理不是合法 UTF-8 码点
    expect(() => encodeURIComponent("\uD800"), "★ 直接编抛 URIError").toThrow(URIError);
    // encodeSchemePath 之所以安全：**JSON.stringify 在前面**。
    // well-formed JSON.stringify（ES2019）把落单代理写成 6 字符转义序列
    // `\ud800`，到 encodeURIComponent 手里已是纯 ASCII。
    expect(() => encodeSchemePath(parts), "★ 经 JSON 层后不抛").not.toThrow();
    expect(JSON.stringify(["\uD800"]), "先转义成文本").toBe('["\\ud800"]');
    expect(encodeSchemePath(["\uD800"]), "编出的是 %5Cud800 六个字符").toBe(
      encodeURIComponent('["\\ud800"]')
    );
    expect(encodeSchemePath(["\uD800"])).toContain("%5Cud800");
  });

  test("★ 往返无损还原出落单代理本身（码元级核对）", () => {
    const { url, got, out } = viaUrl(parts);
    expect(url.hash, "无 fragment 泄漏").toBe("");
    expect(got).toBe(JSON.stringify(parts));
    expect(out, "★ 往返还原成原串").toEqual(parts);
    // 码元级核对：不是「长得像」，是真的同一批码元
    expect(out[0].charCodeAt(0), "高位代理 D800").toBe(0xd800);
    expect(out[1].charCodeAt(1), "嵌在中间的 D800").toBe(0xd800);
    expect(out[2].charCodeAt(0), "低位代理 DC00").toBe(0xdc00);
    expect(out[4].charCodeAt(0), "DFFF").toBe(0xdfff);
    // 判别点：这些段**不能**用 encodeURIComponent 直接进 URL（与上一条互为对照）
    expect(() => encodeURIComponent(parts[0])).toThrow(URIError);
  });

  test("混合真实代理对与落单代理仍各自保真", () => {
    const mixed = ["😀", "\uD800", "😀\uDC00\uD800", "a😀b"];
    const { out } = viaUrl(mixed);
    expect(out, "★ 逐段还原").toEqual(mixed);
    expect(out[0].codePointAt(0), "合法代理对仍是一个码点").toBe(0x1f600);
    expect(out[2]).toHaveLength(4); // 😀(2) + 落单低(1) + 落单高(1)
    expect(out[2].charCodeAt(2)).toBe(0xdc00);
    expect(out[2].charCodeAt(3)).toBe(0xd800);
  });
});

describe("★ 判别力自证：既有用例对编码侧漏编无反应，真实 URL 用例有", () => {
  test("编码侧换成 encodeURI：真实 URL 三类全红，既有 decode 仍全绿", () => {
    // 模拟「把 encodeSchemePath 里的 encodeURIComponent 换成 encodeURI」这个变异
    const mutateEncode = (parts) => encodeURI(JSON.stringify(parts));
    // 变异体 + 真的 URL 解析器（本组新用例的判据）
    const mutatedViaUrl = (parts) => {
      const url = new URL(`${ORIGIN}${ENTRY}?schemePath=${mutateEncode(parts)}`);
      return parseSchemePathParam(url.searchParams.get("schemePath"));
    };
    // 变异体 + 既有同进程模拟（既有用例的判据）
    const mutatedLegacy = (parts) =>
      parseSchemePathParam(decodeURIComponent(mutateEncode(parts)));

    // 真实 URL 侧：① # 吃尾巴 → ② & 切参数 → ③ + 变空格，三类全被抓住
    expect(mutatedViaUrl(["方案#1"]), "★ # 截断").toBeNull();
    expect(mutatedViaUrl(["a&b"]), "★ & 切参数").toBeNull();
    expect(mutatedViaUrl(["a+b"]), "★ + 变空格（合法但不同）").toEqual(["a b"]);
    // 既有模拟侧：三类**全绿**，一个都抓不到 —— 这就是必须补真实 URL 的理由
    expect(mutatedLegacy(["方案#1"])).toEqual(["方案#1"]);
    expect(mutatedLegacy(["a&b"])).toEqual(["a&b"]);
    expect(mutatedLegacy(["a+b"])).toEqual(["a+b"]);
  });

  test("对照：未变异时两侧一致，证明上条红的不是解析器本身", () => {
    const parts = ["方案#1", "a&b", "a+b", "50%", "\uD800"];
    const viaReal = new URL(`${ORIGIN}${ENTRY}?schemePath=${encodeSchemePath(parts)}`);
    expect(parseSchemePathParam(viaReal.searchParams.get("schemePath"))).toEqual(viaUrl(parts).out);
    expect(decode(parts), "既有模拟与真实 URL 同结果").toEqual(viaUrl(parts).out);
  });
});
