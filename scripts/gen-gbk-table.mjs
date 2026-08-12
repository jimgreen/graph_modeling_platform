// 生成前端 GBK 编码表模块 src/encoding/gbkTable.ts
// 从 iconv-lite 提取 BMP 内 unicode -> GBK 双字节码映射，base64 紧凑存储
import { createRequire } from "node:module";
import { writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const iconv = require("iconv-lite");

const pairs = [];
for (let cp = 0x80; cp <= 0xffff; cp += 1) {
  const ch = String.fromCharCode(cp);
  try {
    const buf = iconv.encode(ch, "gbk");
    if (buf.length === 2 && !iconv.decode(buf, "gbk").includes("\uFFFD")) {
      pairs.push([cp, (buf[0] << 8) | buf[1]]);
    }
  } catch {
    // 忽略不可编码字符
  }
}

const unicodes = Uint16Array.from(pairs.map(([cp]) => cp));
const codes = Uint16Array.from(pairs.map(([, code]) => code));

const encodeB64 = (arr) => Buffer.from(arr.buffer, arr.byteOffset, arr.byteLength).toString("base64");

const content = `// 自动生成：GBK 编码表（unicode -> GBK 双字节码），由 scripts/gen-gbk-table.mjs 生成，请勿手改
// 覆盖 BMP 内 ${unicodes.length} 个可编码字符（0x80-0xFFFF）
export const GBK_UNICODE_B64 = "${encodeB64(unicodes)}";
export const GBK_CODE_B64 = "${encodeB64(codes)}";
`;

const outPath = resolve(dirname(fileURLToPath(import.meta.url)), "../src/encoding/gbkTable.ts");
writeFileSync(outPath, content, "utf-8");
console.log(`生成完成: ${outPath} (${unicodes.length} 字符, ${content.length} 字节)`);
