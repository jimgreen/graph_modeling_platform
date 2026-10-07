import { afterEach, describe, it, expect, vi } from "vitest";
import { encodeGbk, decodeGbk, looksLikeGbk } from "./gbk";
import * as gbkTable from "./gbkTable";

describe("GBK 编码器", () => {
  it("ASCII 直通", () => {
    expect(Array.from(encodeGbk("abc 123"))).toEqual([97, 98, 99, 32, 49, 50, 51]);
  });

  it("中文编码为双字节（与 iconv-lite 一致）", () => {
    // 变压器 = b1 e4 d1 b9 c6 f7（iconv-lite gbk 实测）
    expect(Array.from(encodeGbk("变压器"))).toEqual([0xb1, 0xe4, 0xd1, 0xb9, 0xc6, 0xf7]);
  });

  it("混合内容编码：汉字 2 字节 + ASCII 1 字节", () => {
    const text = "天府新区站.e <basevalue>";
    // 5 个汉字（10 字节）+ 14 个 ASCII = 24
    expect(text.length).toBe(19);
    expect(Array.from(encodeGbk(text)).length).toBe(24);
    expect(Array.from(encodeGbk(text).slice(0, 4))).toEqual([0xcc, 0xec, 0xb8, 0xae]); // 天府
  });

  it("无法编码的字符替换为 ?", () => {
    // for...of 迭代 surrogate pair 为一个字符，码点 > 0xFFFF -> 单个 ?
    const bytes = encodeGbk("a\uD83D\uDE00b");
    expect(Array.from(bytes)).toEqual([97, 0x3f, 98]);
  });

  it("GBK 解码回原文", () => {
    const text = "天府新区站/母线/断路器 123";
    const bytes = encodeGbk(text);
    expect(decodeGbk(bytes)).toBe(text);
  });

  it("looksLikeGbk：GBK 字节为 true，UTF-8 中文为 false", () => {
    const gbkBytes = encodeGbk("天府新区站");
    expect(looksLikeGbk(gbkBytes)).toBe(true);
    const utf8Bytes = new TextEncoder().encode("天府新区站");
    expect(looksLikeGbk(utf8Bytes)).toBe(false);
  });
});

/**
 * 目标分支：`src/encoding/gbk.ts` L54（`char.codePointAt(0) ?? 0`）与
 * L97（`looksLikeGbk` 的 `catch { return false }`）。
 *
 * L54 的**右臂（`?? 0`）在字符串定义域内不可达**，理由是完整定义域论证：
 * `for (const char of text)` 里 `text: string`，字符串迭代器只产出长度 1 或 2
 * 的子串（代理对拆两码元、其余拆一码元），从不为空串；而
 * `String.prototype.codePointAt(pos)` 只在 `pos >= length` 时返回 `undefined`。
 * 这里 `pos` 恒为 0 且 `length >= 1`，故左操作数恒为数字、`?? 0` 永不求值。
 * 可执行的对应物就是下面那条用例：它证明**左操作数承重**——
 * 把 `char.codePointAt(0)` 改写成 `0` 就会产出 NUL 字节从而转红，
 * 也就是说这行不是死代码，只有它的右臂是。
 */
describe("encodeGbk 的码点读取", () => {
  it("孤立代理项取到的是真实码点，绝不会退化成 ?? 0 的 0（输出里不出现 NUL 字节）", () => {
    // 孤立高位代理（for...of 会把它当成一个码元，码点 0xD800，仍在 BMP 内 ⇒ 走查表失败 ⇒ '?'）
    expect(Array.from(encodeGbk("\uD800"))).toEqual([0x3f]);
    // 孤立低位代理夹在 ASCII 之间：若退化成 cp=0，这里会变成 0x00
    expect(Array.from(encodeGbk("a\uDC00b"))).toEqual([97, 0x3f, 98]);
    // 代理对整体 > 0xFFFF ⇒ 另一条 '?' 分支，与本行无关，一并钉住
    expect(Array.from(encodeGbk("\u{1F600}"))).toEqual([0x3f]);
    // 显式反证：0 号字节确实不该出现在这些输入的编码结果里
    expect(Array.from(encodeGbk("\uD800a\uDC00"))).not.toContain(0);
  });
});

describe("looksLikeGbk 的解码器兜底", () => {
  it("TextDecoder 不可用（构造即抛）时返回 false，而不是把异常抛给调用方", () => {
    // 真实环境里这条由「运行时不支持 gbk 编码名」触发（如 small-icu 构建）；
    // 用替身把它变成可复现的路径，否则本分支在 CI 上永远走不到。
    class ThrowingTextDecoder {
      constructor() {
        throw new RangeError("unknown encoding: gbk");
      }
    }
    vi.stubGlobal("TextDecoder", ThrowingTextDecoder);
    try {
      // 守卫：替身真的生效了（否则下面那条断言会变成恒绿）
      expect(() => new TextDecoder("gbk")).toThrow();
      expect(looksLikeGbk(Uint8Array.from([0xb1, 0xe4, 0xd1, 0xb9]))).toBe(false);
      // 同样不能因 BOM 短路而假装成功：BOM 那条 return false 与本 catch 是两个出口
      expect(looksLikeGbk(Uint8Array.from([0xef, 0xbb, 0xbf, 0xb1]))).toBe(false);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("替身还原后 GBK 字节仍判为 true（确认上面的用例不是因为替身泄漏才通过的）", () => {
    expect(looksLikeGbk(encodeGbk("天府新区站"))).toBe(true);
  });
});

/**
 * 表数据损坏时的解码边界。
 *
 * 缺陷：decodeB64ToUint16 里 `bytes.byteLength / 2` 在字节数为奇数时被 Uint16Array
 * 构造的 ToIndex 截成 floor(n/2)，末尾半个字静默丢弃、其后条目整体错位一格。
 * findGbkCode 的二分查找对错位毫无察觉，会把某个 unicode 配上**相邻**记录的 GBK
 * 码 —— 不抛错，静默给出错字，正是本仓反复强调的那种「极难归因」的文件损坏。
 *
 * 为什么用 `atob` 的既有失败路径接：base64 串可以完全合法（生成脚本写到一半、
 * 手工改坏表），atob 只在字符集非法时才抛，漏掉了奇数字节这种形态。
 * 非法表今天抛的是 DOMException/InvalidCharacterError 并向上传播，下面把
 * 同一形状与同一出口钉住。
 *
 * 表被换掉的路径：`vi.doMock` 替换 `./gbkTable` 的导出、`vi.resetModules()` 让
 * `gbk` 的模块级 `unicodeTable`/`codeTable` 缓存一并重建 —— 缓存不清的话，
 * 换表根本不会生效（第一张真表解码后就不会再读常量）。
 * `vi.doMock` 不做提升，只影响其后的动态 import，故文件顶部静态 import 的真表常量
 * 始终是真的。测完 `vi.doUnmock` 还原，否则本文件后续用例会拿到假表。
 *
 * 注：`vi.spyOn` 在这里编译不过 —— 两个导出是 `const` 字符串字面量，
 * 其键类型被推断成字面量联合，spyOn 的 key 泛型落到 `never`。
 *
 * ── 变异验证结果（2026-10-07，注入器拒绝空变异/锚点重复/未改动三种假绿） ──
 *  ① 整段校验删除（缺陷原始形态）→ RED，2 条红
 *  ② 条件极性反转（偶数才抛）    → RED，8 条红
 *  ③ `bytes.byteLength` 换成 `raw.length` → GREEN，**属等价变异**，理由可证：
 *     上一行就是 `const bytes = new Uint8Array(raw.length)`，故 raw.length 与
 *     bytes.byteLength 在整个定义域上恒等（Uint8Array 的 length 就是它的字节数），
 *     两个表达式检查的是同一个数，绿是正确结果。不需要也不应该补断言去凑。
 *     真正承重的是**「字节数为奇数就抛」这一事实**，不是「用哪个表达式判奇偶」。
 *  ④ `bytes.byteLength` 换成 `value.length`（base64 **串长**）→ RED，2 条红。
 *     这一条刻意与 ③ 对照：串长与字节数没有固定关系（"J1m6TgA=" 串长 8 偶、
 *     字节 5 奇），改成看 value.length 就会漏掉真正的缺陷。绿在 ③ 红在 ④，
 *     说明这两条之间存在可观察的差异，不是测试没覆盖。
 */
describe("GBK 表数据损坏时的解码边界", () => {
  const REAL_UNICODE_B64 = gbkTable.GBK_UNICODE_B64;
  const REAL_CODE_B64 = gbkTable.GBK_CODE_B64;

  // 表里存的是小端 uint16 序列，下面直接给字节，省掉一层手工大小端换算。
  const le = (u16s: number[]) => u16s.flatMap((v) => [v & 0xff, (v >> 8) & 0xff]);
  const toB64 = (bytes: number[]) => Buffer.from(bytes).toString("base64");

  // 合法的小表：中 U+4E2D -> D6D0、人 U+4EBA -> C8CB（大 不在表里 -> '?'）
  const OK_UNICODE_B64 = toB64(le([0x4e2d, 0x4eba]));
  const OK_CODE_B64 = toB64(le([0xd6d0, 0xc8cb]));

  // 奇数字节（5）：解出 [0x5927 大, 0x4EBA 人]
  //   大 配上 D6D0（那是 中 的码）⇒ 静默错字；真正的 中 被挤出表外 ⇒ 退化成 '?'
  const ODD_UNICODE_B64 = toB64([...le([0x5927, 0x4eba]), 0x00]);

  // 字符集非法的 base64：atob 既有失败路径的形态
  const JUNK_UNICODE_B64 = "!!!!not-base64!!!!";

  /** 换上假表并重建 gbk 的模块缓存，让首次查表重新解码这张假表 */
  async function withTable(unicodeB64: string, codeB64: string): Promise<typeof import("./gbk")> {
    vi.doMock("./gbkTable.ts", () => ({ GBK_UNICODE_B64: unicodeB64, GBK_CODE_B64: codeB64 }));
    vi.resetModules();
    return import("./gbk");
  }

  afterEach(() => {
    vi.doUnmock("./gbkTable.ts");
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("守卫先行：字节数为奇数的 base64 串本身是合法 base64（atob 不抛）", () => {
    // 这条不是断言生产代码，而是断言夹具本身成立：
    // 若哪天 atob 也开始校验字节奇偶，本文件整组用例的前提就变了，必须先看到红。
    expect(Buffer.from(ODD_UNICODE_B64, "base64").length % 2).toBe(1);
    expect(atob(ODD_UNICODE_B64).length % 2).toBe(1);
    // base64 **字符串**的长度是 8（偶数）—— 奇偶只能从字节数判断，看串长不行
    expect(ODD_UNICODE_B64.length % 2).toBe(0);
  });

  it("夹具对拍：换上合法小表后「中」仍编码成 d6 d0（证明换表机制本身有效）", async () => {
    const gbk = await withTable(OK_UNICODE_B64, OK_CODE_B64);
    expect(Array.from(gbk.encodeGbk("中"))).toEqual([0xd6, 0xd0]);
  });

  it("奇数字节：走 atob 的既有失败路径抛 DOMException，而不是错位后静默给错字", async () => {
    const gbk = await withTable(ODD_UNICODE_B64, OK_CODE_B64);
    // ❌ 没有校验时的实际输出（探针实测）：[0x3f] —— 静默把 中 变成 '?'，
    //    而错位产生的 大 被配上 D6D0。这条断言与那份实测输出直接对立。
    expect(() => gbk.encodeGbk("中")).toThrow();
    let caught: unknown;
    try {
      gbk.encodeGbk("中");
    } catch (error) {
      caught = error;
    }
    // 与 atob 非法 base64 那条既有失败路径同形状：同一个错误类、同一个 name、同一个 code
    const atobError = (() => {
      try {
        atob(JUNK_UNICODE_B64);
      } catch (error) {
        return error as DOMException;
      }
      throw new Error("守卫失效：atob 对非法 base64 竟然没抛");
    })();
    expect(caught).toBeInstanceOf(atobError.constructor);
    expect((caught as DOMException).name).toBe("InvalidCharacterError");
    expect((caught as DOMException).code).toBe(atobError.code);
    // 报错要指向真实病因，不能继续说「Invalid character」误导人查字符集
    expect((caught as DOMException).message).toMatch(/偶数/);
  });

  it("奇数字节：反复调用不会因缓存而侥幸通过（每次都该抛）", async () => {
    const gbk = await withTable(ODD_UNICODE_B64, OK_CODE_B64);
    // 校验放在 decodeB64ToUint16 内部而非 tables() 的懒初始化里：
    // 抛在解码点 ⇒ 两张表都还没写进缓存，不会出现「第一次抛、第二次放行」。
    expect(() => gbk.encodeGbk("中")).toThrow();
    expect(() => gbk.encodeGbk("中")).toThrow();
    expect(() => gbk.encodeGbk("中")).toThrow();
  });

  it("合法输入不受影响：真表下常用字仍与 iconv 一致（校验只拦奇数字节）", async () => {
    // doUnmock + resetModules 之后动态 import 必须拿回**真表**，否则这条断言
    // 量的还是上一条用例留下的假表（小表里没有 天府新区站，只会得到一堆 '?'）。
    // 这条用例本身就是「替身没泄漏」的守卫：期望值取自 iconv 实测，
    // 假表跑出来是 [3f×12]，立刻转红。
    vi.doUnmock("./gbkTable.ts");
    vi.resetModules();
    const gbk = await import("./gbk");
    // 天府新区站 = cc ec b8 ae d0 c2 c7 f8 d5 be（iconv-lite gbk 实测，5 字 = 10 字节）
    expect(Array.from(gbk.encodeGbk("天府新区站"))).toEqual([
      0xcc, 0xec, 0xb8, 0xae, 0xd0, 0xc2, 0xc7, 0xf8, 0xd5, 0xbe
    ]);
  });

  it("换表替身已还原：真正的表常量与真值一致", () => {
    expect(Buffer.from(REAL_UNICODE_B64, "base64").length % 2).toBe(0);
    expect(Buffer.from(REAL_CODE_B64, "base64").length % 2).toBe(0);
  });
});
