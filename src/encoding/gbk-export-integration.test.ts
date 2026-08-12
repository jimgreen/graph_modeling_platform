// 集成验证：E 文件导出链路 GBK 编码
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import { join } from "node:path";
import { parseEDeviceDefinitionFile } from "../model-eexport";
import { encodeGbk, decodeGbk } from "./gbk";

describe("E 文件 GBK 导出链路", () => {
  it("GBK 字节可被 parseEDeviceDefinitionFile 正确解析（经 GBK 解码）", () => {
    const template = fs.readFileSync(join(process.cwd(), "public/e-templates/ems_rtdb.e"), "utf-8");
    // 模拟导出：UTF-8 文本 -> GBK 字节 -> 再读回 -> 解码 -> 解析
    const gbkBytes = encodeGbk(template);
    const decoded = decodeGbk(gbkBytes);
    const sections = parseEDeviceDefinitionFile(decoded);
    expect(sections.length).toBeGreaterThanOrEqual(24);
    const breaker = sections.find(s => s.kind === "breaker");
    expect(breaker?.label).toBe("断路器");
    expect(breaker?.componentLibrary).toBe("ACBreak");
  });

  it("GBK 编码不丢失模板字段中文名", () => {
    const sample = `<breaker 中文名="断路器" 类别库="交流设备" 元件库="交流断路器">
//  标识  英文标识  中文名称  描述  厂站ID
@  id    code      name      describeb  st_id
</breaker>`;
    const bytes = encodeGbk(sample);
    // 前 3 字节为 ASCII "<br"
    expect(bytes[0]).toBe(60); // <
    expect(bytes[1]).toBe(98); // b
    expect(bytes[2]).toBe(114); // r
    // 断路器 GBK = b6 cf c2 b7 c6 f7，应出现在字节序列中
    const breakerGbk = Uint8Array.from([0xb6, 0xcf, 0xc2, 0xb7, 0xc6, 0xf7]);
    let found = false;
    for (let i = 0; i <= bytes.length - 6; i += 1) {
      if (bytes[i] === breakerGbk[0] && bytes[i + 1] === breakerGbk[1] && bytes[i + 2] === breakerGbk[2]
        && bytes[i + 3] === breakerGbk[3] && bytes[i + 4] === breakerGbk[4] && bytes[i + 5] === breakerGbk[5]) {
        found = true;
        break;
      }
    }
    expect(found).toBe(true);
    // 整体解码还原
    expect(decodeGbk(bytes)).toBe(sample);
  });
});
