// GBK 编码器（浏览器端）：将 UTF-16 字符串编码为 GBK 字节序列。
// 编码表由 scripts/gen-gbk-table.mjs 生成（BMP 内 unicode -> GBK 双字节码）。
// ASCII 单字节直通；GBK 可编码的双字节字符查表；无法编码的字符以 '?' (0x3F) 替代。

import { GBK_UNICODE_B64, GBK_CODE_B64 } from "./gbkTable";

let unicodeTable: Uint16Array | null = null;
let codeTable: Uint16Array | null = null;

function decodeB64ToUint16(value: string): Uint16Array {
  const raw = atob(value);
  const bytes = new Uint8Array(raw.length);
  for (let index = 0; index < raw.length; index += 1) {
    bytes[index] = raw.charCodeAt(index);
  }
  return new Uint16Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 2);
}

function tables(): { unicodeTable: Uint16Array; codeTable: Uint16Array } {
  if (!unicodeTable || !codeTable) {
    unicodeTable = decodeB64ToUint16(GBK_UNICODE_B64);
    codeTable = decodeB64ToUint16(GBK_CODE_B64);
  }
  return { unicodeTable, codeTable };
}

// 二分查找 unicode 在升序编码表中的索引；找不到返回 -1
function findGbkCode(cp: number): number {
  const { unicodeTable, codeTable } = tables();
  let low = 0;
  let high = unicodeTable.length - 1;
  while (low <= high) {
    const mid = (low + high) >> 1;
    const value = unicodeTable[mid];
    if (value === cp) {
      return codeTable[mid];
    }
    if (value < cp) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return -1;
}

/** 将字符串编码为 GBK 字节序列；无法表示的字符替换为 '?'（0x3F） */
export function encodeGbk(text: string): Uint8Array {
  const bytes: number[] = [];
  for (const char of text) {
    const cp = char.codePointAt(0) ?? 0;
    if (cp < 0x80) {
      // ASCII 单字节
      bytes.push(cp);
      continue;
    }
    if (cp > 0xffff) {
      // 超出 BMP（如 emoji），GBK 无法表示
      bytes.push(0x3f);
      continue;
    }
    const code = findGbkCode(cp);
    if (code < 0) {
      bytes.push(0x3f);
    } else {
      bytes.push((code >> 8) & 0xff, code & 0xff);
    }
  }
  return Uint8Array.from(bytes);
}

/** 是否为 GBK 编码字节流（用于导入时自动识别）：无 UTF-8 BOM 且 GBK 解码无替换字符 */
export function looksLikeGbk(bytes: Uint8Array): boolean {
  // 有 UTF-8 BOM 则视为 UTF-8
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return false;
  }
  try {
    const decoded = new TextDecoder("gbk", { fatal: false }).decode(bytes);
    return !decoded.includes("\uFFFD");
  } catch {
    return false;
  }
}

/** 将 GBK 字节流解码为字符串（导入 .e 文件时用） */
export function decodeGbk(bytes: Uint8Array): string {
  return new TextDecoder("gbk").decode(bytes);
}

/** 自动识别编码解码字节流：UTF-8 BOM → UTF-8；fatal UTF-8 解码成功 → UTF-8；否则 GBK */
export function decodeAuto(bytes: Uint8Array): string {
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return new TextDecoder("utf-8").decode(bytes);
  }
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return decodeGbk(bytes);
  }
}
