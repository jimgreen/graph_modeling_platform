// shared/xmlEscape.mjs 的输入边界测试 —— 钉现状，不改语义。
//
// 与 shared/xmlEscape.test.mjs 的分工：那份覆盖「五个保留字符 + nullish 兜底 +
// 注入场景」，即正常路径；本份只覆盖**正常路径之外的输入形态**——
// 控制字符、代理对（完整/落单）、Symbol、以及各类非字符串入参。
//
// 本文件的作用是「锁住既有语义边界」，让后续任何人想改这些行为时，
// 必须先看到这里的红，而不是在导出文件里静默改掉。
import { describe, expect, test } from "vitest";
import { escapeXmlFull } from "./xmlEscape.mjs";

// ---------------------------------------------------------------------------
// 一、控制字符：全部原样透传（不转义、不剔除、不编码成数字实体）
// ---------------------------------------------------------------------------

// 实现是 5 次纯 replace，键只有 & < > " ' 五字符，控制字符不在其中，
// 因此一律原样返回。实测覆盖 C0 的头尾、TAB/LF/CR 这三个「白名单」例外，
// 以及 DEL。
const CONTROL_CHARS: ReadonlyArray<readonly [name: string, code: number]> = [
  ["NUL", 0x0000],
  ["SOH", 0x0001],
  ["BS", 0x0008],
  ["TAB", 0x0009],
  ["LF", 0x000a],
  ["VT", 0x000b],
  ["FF", 0x000c],
  ["CR", 0x000d],
  ["ESC", 0x001b],
  ["US", 0x001f],
  ["DEL", 0x007f],
];

describe("控制字符", () => {
  test.each(CONTROL_CHARS)("%s (U+%s) 原样透传，不被转义也不被剔除", (_name, code) => {
    const ch = String.fromCharCode(code);
    const escaped = escapeXmlFull(ch);
    // 必须逐码点相等：既不能变成 ""（剔除），也不能变长（转义成 &#0; / &amp;#0;）。
    expect(escaped).toBe(ch);
    expect(escaped).toHaveLength(1);
  });

  test("控制字符与保留字符混合：只有保留字符被转义，控制字符原位保留", () => {
    // 变异方向：给实现追加 .replace(/[\u0000-\u001F]/g, "") 之类「清洗」步骤。
    // 本断言里首尾的 NUL/SOH 位置敏感——若被剔除，长度与位置都会变。
    expect(escapeXmlFull("\u0000<>\u0001")).toBe("\u0000&lt;&gt;\u0001");
    // 长度 10 = NUL(1) + &lt;(4) + &gt;(4) + SOH(1)。若首尾控制字符被剔除，
    // 长度会掉到 8；这个数字同时证明它们既没被剔除、也没被展开成实体。
    expect(escapeXmlFull("\u0000<>\u0001")).toHaveLength(10);
  });

  test("换行/回车/制表在多行文本中原样保留（不折叠为单个 \\n）", () => {
    // 这条专门盯「把 \\r\\n 规范化成 \\n」或「制表符展开为空格」的变异。
    // 若有人加 .replace(/\\r\\n/g, "\\n")，下面第一个断言就会红。
    expect(escapeXmlFull("a\nb\r\nc\td")).toBe("a\nb\r\nc\td");
    expect(escapeXmlFull("a\nb\r\nc\td")).toHaveLength(8);
  });

  // ⚠ **已知局限，非缺陷断言**：XML 1.0 规定 C0 控制字符（TAB/LF/CR 除外）
  // 在文档内容里非法，而本实现放它们过去，产出的 XML 严格校验器会拒收。
  // 这里的断言方向是「保持现状」——若将来决定剔除，这组测试会红，
  // 那正是需要有人拍板并更新此注释的信号点，而不是可以悄悄溜过的改动。
});

// ---------------------------------------------------------------------------
// 二、代理对：完整对保留为单个码点，落单代理原样透传
// ---------------------------------------------------------------------------

// String.prototype.replace 不校验代理对合法性：合法对不拆、落单的不补。
// 这一点对 SVG 导出有实际后果——落单代理会让 XML 解析器报错，
// 但在「是否补成 U+FFFD」被拍板之前，实现的行为是原样透传。
const HIGH = String.fromCharCode(0xd83d);
const LOW = String.fromCharCode(0xde00);
const LONE_HIGH = String.fromCharCode(0xd800); // 孤立高代理（后继被截断）
const LONE_LOW = String.fromCharCode(0xdc00); // 孤立低代理（前驱被截断）

describe("代理对", () => {
  test("完整代理对（😀 = \\uD83D\\uDE00）原样保留", () => {
    const pair = HIGH + LOW;
    const escaped = escapeXmlFull(pair);
    // 两个断言缺一不可：
    //  · length === 2 只说明「还是 2 个 UTF-16 单元」——若实现把它换成
    //    两个 U+FFFD，长度同样是 2，这条会误判为通过；
    //  · 码点计数 === 1 才证明它仍是**一个**码点 U+1F600 而非两个替换字符。
    expect(escaped).toHaveLength(2);
    expect([...escaped]).toHaveLength(1);
    expect(escaped.codePointAt(0)).toBe(0x1f600);
  });

  test("落单高代理与落单低代理均原样透传（不补 U+FFFD、不丢弃）", () => {
    // 变异方向：加 .replace(/[\uD800-\uDFFF]/g, "\uFFFD") 或 /g, "" 之类。
    expect(escapeXmlFull(LONE_HIGH)).toBe(LONE_HIGH);
    expect(escapeXmlFull(LONE_HIGH)).toHaveLength(1);
    expect(escapeXmlFull(LONE_LOW)).toBe(LONE_LOW);
    expect(escapeXmlFull(LONE_LOW)).toHaveLength(1);
  });

  test("顺序颠倒的代理（低在前、高在后）不配对，保持原顺序", () => {
    // 与完整对分开断言：实现没有任何「配对」逻辑，所以低+高必须保持低+高。
    expect(escapeXmlFull(LOW + HIGH)).toBe(LOW + HIGH);
  });

  test("代理对与控制字符、保留字符共存时，各自按各自规则处理", () => {
    const input = `\u0001${HIGH}${LOW}<&\uD800`;
    // NUL 位保留、控制位保留、完整对保留（1 个码点）、落单高代理保留，
    // 而 < & 仍被转义 —— 一次覆盖三类规则的互不干扰。
    expect(escapeXmlFull(input)).toBe(`\u0001${HIGH}${LOW}&lt;&amp;${LONE_HIGH}`);
    // 码点数 12 = SOH(1) + 完整代理对(1，因为它仍是**一个**码点 U+1F600)
    //        + &lt;(4) + &amp;(5) + 落单高代理(1)。
    // 代理对若被拆成两个 U+FFFD，这里会变成 13 —— 这正是这条断言存在的理由：
    // 只看 length(UTF-16 单元数) 无法区分「一对」与「两个替换字符」。
    expect([...escapeXmlFull(input)]).toHaveLength(12);
  });

  test("emoji 与保留字符相邻时：保留字符被转义，代理对不受影响", () => {
    // ⚠ 入参是**普通字符串**，不是 Symbol 描述符——这里 String() 是空操作。
    // 本条真正断言的是：转义链在含代理对的文本上跑时，< 的替换
    // 不会顺手破坏紧邻的代理对（两个 emoji 仍各自是一个完整码点）。
    const escaped = escapeXmlFull(`😀<🔧`);
    expect(escaped).toBe("😀&lt;\u{1f527}");
    // 码点 6 = 😀(1) + "&lt;" 的 4 个字符 + 🔧(1)。
    // emoji 各只算 1 个码点，所以这里能证明它们没被拆成落单代理。
    expect([...escaped]).toHaveLength(6);
    expect(escaped.codePointAt(0)).toBe(0x1f600);
  });
});

// ---------------------------------------------------------------------------
// 三、Symbol 与其它非字符串入参
// ---------------------------------------------------------------------------

describe("Symbol 与非字符串入参", () => {
  test("裸 Symbol 不抛错，转成其字符串描述形式", () => {
    // ⚠ 这条钉住的是 String() 的 Symbol 专门分支（ES 的 String 构造函数
    // 对 Symbol 走 SymbolDescriptiveString）。若实现改成 "" + value
    // 或 value.toString()，裸 Symbol 会抛 TypeError —— 下面的断言会红。
    // 也就是说：这组测试负责区分「用 String() 强制转换」与「字符串拼接强制转换」。
    expect(escapeXmlFull(Symbol("x"))).toBe("Symbol(x)");
    expect(escapeXmlFull(Symbol())).toBe("Symbol()");
    // 已知 symbol 的描述形式各不相同，用它排除「硬编码 Symbol(x)」的实现。
    expect(escapeXmlFull(Symbol.iterator)).toBe("Symbol(Symbol.iterator)");
  });

  test("Symbol 描述符里的保留字符被转义（转义链跑在强制转换之后）", () => {
    // 若实现先转义再转字符串（或干脆跳过裸 Symbol），这里必然红。
    expect(escapeXmlFull(Symbol("<a&b>"))).toBe("Symbol(&lt;a&amp;b&gt;)");
  });

  test("Symbol 包装对象（Object(sym)）抛 TypeError，与裸 Symbol 相反", () => {
    // String() 的「Symbol 专门分支」只认原始 Symbol；一旦包成对象，
    // 就退回 ToPrimitive，而 Symbol.prototype.toString 要求 this 是原始 Symbol。
    // 这条与上面「裸 Symbol 不抛」构成一对：两极都被钉住，
    // 所以「到底走没走 String()」这件事无法被单一分支糊弄过去。
    expect(() => escapeXmlFull(Object(Symbol("y")))).toThrow(TypeError);
    expect(() => escapeXmlFull(Symbol("y"))).not.toThrow();
  });

  test("无原型对象抛 TypeError，且与 Symbol 包装对象的报错信息不同", () => {
    // ⚠ 这里刻意**不**硬编码 V8 的报错文案（跨 Node 版本会变），
    // 只断言「两种失败模式的报错信息不同」——也就是说调用方能靠 message
    // 区分「Symbol 转换失败」和「对象无法转原始值」。
    // 用裸 toThrow(TypeError) 会让这两条互相遮蔽，看不出走的是哪条路。
    // ⚠ 这里刻意**不**写 `String(input)` 之类把入参再字符串化的提示文案：
    // 无原型对象连 String() 都会抛，真到了兜底分支会把「没抛错」
    // 这条信息替换成另一个无关异常，掩盖失败原因。
    const messageOf = (label: string, input: unknown): string => {
      try {
        escapeXmlFull(input);
      } catch (error) {
        return (error as Error).message;
      }
      throw new Error(`预期抛错但未抛：${label}`);
    };
    const nullProtoMessage = messageOf("Object.create(null)", Object.create(null));
    const symbolWrapperMessage = messageOf("Object(Symbol)", Object(Symbol("y")));
    expect(nullProtoMessage).not.toBe(symbolWrapperMessage);
  });

  test("数组与自定义 toString：字符串化之后仍要过转义链", () => {
    // Array#toString 会逐项 String()，所以元素里的元字符会进入待转义文本。
    expect(escapeXmlFull([1, "<"])).toBe("1,&lt;");
    expect(escapeXmlFull({ toString: () => "<b>" })).toBe("&lt;b&gt;");
    // String 包装对象同理：先拆箱再转义。
    expect(escapeXmlFull(new String("<x>"))).toBe("&lt;x&gt;");
  });

  test("数值/布尔/BigInt 一律走字符串化，不抛错", () => {
    expect(escapeXmlFull(0)).toBe("0");
    expect(escapeXmlFull(-0)).toBe("0");
    expect(escapeXmlFull(NaN)).toBe("NaN");
    expect(escapeXmlFull(Infinity)).toBe("Infinity");
    expect(escapeXmlFull(1n)).toBe("1");
    expect(escapeXmlFull(true)).toBe("true");
    expect(escapeXmlFull(false)).toBe("false");
  });

  test("nullish 兜底为空串（与「字符串化 null」不同）", () => {
    // 钉住实现里的 ?? ""：若改成 String(value)，null 会变成 "null"，
    // 下面两条会红。负数/NaN 等非空值不受 ?? 影响，所以这组只覆盖空值。
    expect(escapeXmlFull(null)).toBe("");
    expect(escapeXmlFull(undefined)).toBe("");
  });
});