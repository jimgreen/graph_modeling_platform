import { describe, it, expect, vi } from "vitest";
import { encodeGbk, decodeGbk, looksLikeGbk } from "./gbk";

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
