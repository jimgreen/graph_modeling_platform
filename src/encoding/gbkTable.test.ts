// GBK 编码表的不变量守卫 —— 此前零覆盖。
//
// src/encoding/gbkTable.ts 有 23938 条 unicode→GBK 映射，由 scripts/gen-gbk-table.mjs
// 从 iconv-lite 生成。表坏掉的后果是**静默的文件损坏**：E 文件里只有用到那个字符的
// 设备名才会出错，导出流程不报错，第三方系统读到错字才发现 —— 极难归因。
//
// 三条不变量：
// 1. 两张表等长（unicodeTable[i] 与 codeTable[i] 必须成对）
// 2. unicode 表**严格升序**——这是 findGbkCode 二分查找的前提。
//    顺序一乱，二分查找不会报错，只会静默返回错误码点或 -1。
// 3. 全表与 iconv-lite（独立实现）逐条交叉核对。
//
// 第 3 条是关键：表本身由 iconv-lite 生成，自证循环无意义，必须拿它当 oracle。
import { describe, expect, it } from "vitest";
import iconv from "iconv-lite";
import { encodeGbk } from "./gbk";
import { GBK_UNICODE_B64, GBK_CODE_B64 } from "./gbkTable";

function decodeB64ToUint16(value: string): Uint16Array {
  const raw = atob(value);
  const bytes = new Uint8Array(raw.length);
  for (let index = 0; index < raw.length; index += 1) bytes[index] = raw.charCodeAt(index);
  return new Uint16Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 2);
}

const unicodeTable = decodeB64ToUint16(GBK_UNICODE_B64);
const codeTable = decodeB64ToUint16(GBK_CODE_B64);

describe("GBK 编码表不变量", () => {
  it("两张表等长（unicode[i] 与 code[i] 成对）", () => {
    expect(codeTable.length).toBe(unicodeTable.length);
    // 规模合理性：全表交叉核对依赖它足够大
    expect(unicodeTable.length).toBeGreaterThan(20_000);
  });

  it("unicode 表严格升序（findGbkCode 二分查找的前提）", () => {
    const offenders: string[] = [];
    for (let i = 1; i < unicodeTable.length; i += 1) {
      // 必须严格大于：相等意味着同一码点有两条记录，二分查找会命中不确定的那条
      if (unicodeTable[i] > unicodeTable[i - 1]) continue;
      offenders.push(
        `idx ${i}: U+${unicodeTable[i - 1].toString(16).toUpperCase()} -> U+${unicodeTable[i].toString(16).toUpperCase()}`
      );
    }
    expect(offenders.slice(0, 5), `共 ${offenders.length} 处非严格升序`).toEqual([]);
  });

  it("全表与 iconv-lite 逐条一致（23938 条，一个都不能错）", () => {
    const mismatches: string[] = [];
    for (let i = 0; i < unicodeTable.length; i += 1) {
      const ch = String.fromCharCode(unicodeTable[i]);
      const ours = [(codeTable[i] >> 8) & 0xff, codeTable[i] & 0xff];
      const theirs = [...iconv.encode(ch, "gbk")];
      if (ours.length === theirs.length && ours.every((b, k) => b === theirs[k])) continue;
      mismatches.push(
        `U+${unicodeTable[i].toString(16).toUpperCase().padStart(4, "0")} '${ch}' ` +
          `本实现=[${ours.map((b) => b.toString(16))}] iconv=[${theirs.map((b) => b.toString(16))}]`
      );
    }
    expect(mismatches.slice(0, 8), `共 ${mismatches.length} 条与 iconv-lite 不一致`).toEqual([]);
  });

  it("encodeGbk 对每个表内字符都产出表里登记的双字节", () => {
    // 端到端：编码器真的用了表，而不是碰巧对
    const offenders: string[] = [];
    for (let i = 0; i < unicodeTable.length; i += 1) {
      const ch = String.fromCharCode(unicodeTable[i]);
      const expected = [(codeTable[i] >> 8) & 0xff, codeTable[i] & 0xff];
      const actual = [...encodeGbk(ch)];
      if (actual.length === 2 && actual[0] === expected[0] && actual[1] === expected[1]) continue;
      offenders.push(`U+${unicodeTable[i].toString(16).toUpperCase()} '${ch}' -> [${actual}]`);
    }
    expect(offenders.slice(0, 8), `共 ${offenders.length} 个字符编码结果与表不符`).toEqual([]);
  });

  it("抽样往返：解码回原文（含工程里实际用到的字）", () => {
    const samples = [
      "天府新区站",
      "1号主变压器",
      "交流设备/母线/断路器",
      "第1端关联交流单元序号",
      "额定容量 kVA"
    ];
    for (const text of samples) {
      const bytes = encodeGbk(text);
      expect(iconv.decode(Buffer.from(bytes), "gbk"), `往返失真: ${text}`).toBe(text);
    }
  });
});
