// encodeGbk 的**边界**契约（已有 gbk.test.ts 覆盖 ASCII/中文/emoji 常规路径，
// 本文件补的是易被漏掉的那一半：GBK 单字节区、控制字符、孤立代理对、
// 以及编码表覆盖不到的那一项）。
//
// 这些边界的共同后果是**静默数据丢失**：无法编码的字符一律变 '?'（0x3F），
// 导出的 E 文件里设备名/参数值变了样，而导出过程不报任何错 —— 只有 CIM 侧
// 读到错名字、或用户发现文件名不对才知道。
import { describe, expect, test } from "vitest";
import iconv from "iconv-lite";
import { encodeGbk, decodeGbk } from "./gbk";
import { GBK_UNICODE_B64, GBK_CODE_B64 } from "./gbkTable";

const hex = (u8: Uint8Array) => Array.from(u8).map((b) => b.toString(16).padStart(2, "0")).join(" ");
const gbkRef = (ch: string) => new Uint8Array(iconv.encode(ch, "gbk"));

const decodeTable = (b64: string): Uint16Array => {
  const raw = atob(b64);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);
  return new Uint16Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 2);
};

describe("GBK 单字节区：euro（U+20AC → 0x80）", () => {
  test("euro 编码为**单字节 0x80**（与 iconv-lite 一致）", () => {
    expect(Array.from(encodeGbk("€"))).toEqual([0x80]);
    expect(hex(encodeGbk("€"))).toBe(hex(gbkRef("€")));
  });

  test("euro 在首/中/尾各占 1 字节", () => {
    for (const [text, expected] of [
      ["€", "80"],
      ["a€b", "61 80 62"],
      ["€€", "80 80"],
      ["中文€中文", "d6 d0 ce c4 80 d6 d0 ce c4"]
    ] as const) {
      expect(hex(encodeGbk(text)), text).toBe(expected);
      expect(hex(encodeGbk(text)), text).toBe(hex(gbkRef(text)));
    }
  });

  test("往返自洽：decodeGbk(encodeGbk(x)) 能还原含 euro 的文本", () => {
    for (const text of ["€", "a€b", "€€", "中文€中文", "天€.e"]) {
      expect(decodeGbk(encodeGbk(text)), text).toBe(text);
    }
  });

  test("**编码表确实未收录 euro** —— 特判是必要而非重复", () => {
    // 若日后有人放宽生成脚本的过滤条件（收进单字节项），本特判就会遮蔽表项。
    // 这条守卫让「表未收录」这个前提被显式钉住 —— 一旦表变了会转红，提醒复核特判。
    const unicode = decodeTable(GBK_UNICODE_B64);
    const code = decodeTable(GBK_CODE_B64);
    expect(Array.from(unicode).includes(0x20ac)).toBe(false);
    // 生成脚本的过滤条件是 buf.length === 2 → 表中不应有码值 < 0x100 的项
    expect(Array.from(code).some((c) => c < 0x100)).toBe(false);
  });

  test("0x80 与无效单字节区 0x81-0xA0 明确区分（特判不会牵连）", () => {
    // 0x80 解回 euro；0x81/0xA0/0xFF 是无效单字节（解出替换字符）
    expect(decodeGbk(Uint8Array.from([0x80]))).toBe("€");
    for (const b of [0x81, 0xa0, 0xff]) {
      expect(decodeGbk(Uint8Array.from([b])), `0x${b.toString(16)}`).toContain("\uFFFD");
    }
  });

  test("0x80 单独出现即 euro，**与后跟字节无关**", () => {
    // 探针实测 `[0x80, 0x40]` 解为 "€@"：0x80 不会被当成双字节首字节
    expect(decodeGbk(Uint8Array.from([0x80, 0x40]))).toBe("€@");
    // 对照：0xA1 是双字节首字节
    expect(decodeGbk(Uint8Array.from([0xa1, 0xa1]))).toBe("　");
  });

  test("其余 0x80-0xFF 区间的符号仍是双字节（未被特判误伤）", () => {
    for (const ch of ["×", "÷", "‖", "√", "℃", "㎡", "§", "·", "　"]) {
      expect(hex(encodeGbk(ch)), ch).toBe(hex(gbkRef(ch)));
      expect(encodeGbk(ch).length, ch).toBe(2);
    }
  });
});

describe("ASCII 全区间与 iconv-lite 全量对拍", () => {
  test("U+0000-U+007F 全部单字节直通，与 iconv 完全一致", () => {
    const mismatches: number[] = [];
    for (let i = 0; i < 0x80; i += 1) {
      const ch = String.fromCharCode(i);
      if (hex(encodeGbk(ch)) !== hex(gbkRef(ch))) mismatches.push(i);
    }
    expect(mismatches).toEqual([]);
  });

  test("控制字符直通（ASCII 通路的必然结果，如实记录）", () => {
    for (const ch of ["\u0000", "\u0001", "\u0007", "\u001B", "\u007F"]) {
      expect(hex(encodeGbk(ch)), JSON.stringify(ch)).toBe(hex(gbkRef(ch)));
    }
  });
});

describe("无法编码的字符一律退化为 '?'（0x3F）", () => {
  test("表外 BMP 字符（含扩展区、生僻字、BOM）→ 单个 ?", () => {
    for (const ch of ["\u9FFF", "\u2A6A", "\uFEFF"]) {
      expect(Array.from(encodeGbk(ch)), ch).toEqual([0x3f]);
      expect(hex(encodeGbk(ch)), ch).toBe(hex(gbkRef(ch)));
    }
  });

  test("孤立代理对（不构成字符）→ ?，与 iconv 一致", () => {
    for (const s of ["\uD83D", "\uDE00", "\uD83D\uDE00"]) {
      expect(hex(encodeGbk(s)), JSON.stringify(s)).toBe(hex(gbkRef(s)));
      expect(Array.from(encodeGbk(s)).every((b) => b === 0x3f)).toBe(true);
    }
  });

  test("组合序列：每个码点各得一个 ?（ZWJ / 变体选择符 / 肤色修饰）", () => {
    expect(Array.from(encodeGbk("\u{1F468}‍\u{1F469}")).length).toBe(3);
    expect(Array.from(encodeGbk("✈️")).length).toBe(2);
    expect(Array.from(encodeGbk("\u{1F44D}\u{1F3FB}")).length).toBe(2);
  });

  test("空串 → 空数组", () => {
    expect(encodeGbk("").length).toBe(0);
  });
});

describe("中文全量抽样对拍（无回归）", () => {
  test("常用电力术语逐字与 iconv-lite 一致", () => {
    const sample = "天府新区站母线断路器变压器开关电抗器电容光伏风电储能氢能热源热负荷充放";
    const mismatches = [...sample].filter(
      (ch) => hex(encodeGbk(ch)) !== hex(gbkRef(ch))
    );
    expect(mismatches).toEqual([]);
  });
});
