import { describe, it, expect } from "vitest";
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
