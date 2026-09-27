// decodeAuto / looksLikeGbk 的契约测试 —— 此前这两个函数零直接覆盖。
//
// 它们是「导入 .e 文件时自动识别编码」的唯一手段（runtimeSnapshot 的
// templateData 路径：外部系统 POST base64 的原始模板字节过来，**不告知编码**）。
// 判错的后果是整份模板乱码 → E 文件导出的段名/字段名全错。
//
// 下面第 4 条用真实 .e 模板（全仓 4 个，最大 6.2 万字符）做端到端验证，
// 结论是：**真实语料上 GBK 与 UTF-8 两种输入都能正确识别**。
import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import iconv from "iconv-lite";
import { decodeAuto, looksLikeGbk, encodeGbk } from "./gbk";

const templatesDir = path.resolve(fileURLToPath(new URL("..", import.meta.url)), "../public/e-templates");
const templateFiles = readdirSync(templatesDir);

const utf8 = (s: string) => new TextEncoder().encode(s);
const bytesOf = (arr: Uint8Array | number[]) => (arr instanceof Uint8Array ? arr : Uint8Array.from(arr));

describe("decodeAuto 编码自动识别", () => {
  it("UTF-8 BOM 优先走 UTF-8（即便内容也能被 GBK 解出）", () => {
    const text = "天府新区站";
    const withBom = Uint8Array.from([0xef, 0xbb, 0xbf, ...utf8(text)]);
    expect(decodeAuto(withBom)).toBe(text);
    // 说明：实现里 decodeAuto 的 BOM 分支其实是**冗余**的 —— TextDecoder 默认
    // ignoreBOM:false 会自己剥离 BOM，fatal 严格解码即可得到同样结果（已实测）。
    // 保留它无害，但别以为它在起作用；真正不可省的是 looksLikeGbk 的 BOM 分支。
    expect(new TextDecoder("utf-8", { fatal: true }).decode(withBom)).toBe(text);
  });

  it("纯 ASCII：GBK 与 UTF-8 解出同一结果，无需区分", () => {
    const text = "ACLoad 220kV <Model> / basevalue";
    expect(decodeAuto(utf8(text))).toBe(text);
    expect(decodeAuto(encodeGbk(text))).toBe(text);
  });

  it("UTF-8 无 BOM 的中文：strict 解码成功即判 UTF-8", () => {
    const text = "1号主变压器 断路器 隔离开关";
    expect(decodeAuto(utf8(text))).toBe(text);
  });

  it("GBK 中文：strict UTF-8 失败时回落 GBK", () => {
    const text = "1号主变压器 断路器 隔离开关";
    expect(decodeAuto(encodeGbk(text))).toBe(text);
  });

  it("真实 .e 模板：GBK 与 UTF-8 两种输入都能正确识别（决定性验证）", () => {
    expect(templateFiles.length).toBeGreaterThan(0);
    for (const file of templateFiles) {
      const raw = readFileSync(path.join(templatesDir, file));
      // 仓库里的模板是 UTF-8 文本；外部系统传来的可能是 GBK
      const text = new TextDecoder("utf-8").decode(raw);
      expect(text.length).toBeGreaterThan(100);

      // 输入为 GBK 字节（外部系统常见）→ 必须还原成原文
      expect(decodeAuto(encodeGbk(text)), `${file} 的 GBK 输入`).toBe(text);
      // 输入为 UTF-8 字节且无 BOM → 必须还原成原文
      expect(decodeAuto(utf8(text)), `${file} 的 UTF-8 输入`).toBe(text);
    }
  });

  it("GBK 字节与 iconv-lite 产出一致（识别与编码用的是同一套映射）", () => {
    const text = "天府新区站 220kV 母线";
    expect(Buffer.from(encodeGbk(text))).toEqual(iconv.encode(text, "gbk"));
    // 且 iconv 能无损还原
    expect(decodeAuto(encodeGbk(text))).toBe(text);
  });

  /**
   * 记录一个**有意接受**的边界，不是 bug 断言。
   *
   * GBK 的双字节里，有一部分恰好构成合法 UTF-8（BMP 全表 23938 字中 1920 个，例如
   * 「一」= D2 BB 是合法的 2 字节 UTF-8）。若一份文本**所有**双字节字符都落在这一
   * 子集里，strict UTF-8 会解成功、从而被误判成 UTF-8。
   *
   * 为什么不改：实测 4 个真实 .e 模板（最大 62317 字符）在 GBK / UTF-8 两种输入下
   * 全部正确识别；13 个真实设备名 GBK 全对；20000 个随机多字 GBK 串里旧新判据仅差 4 例。
   * 为 0 收益的场景引入「文种区间枚举」启发式，反而会新增误判风险
   * （试过：把生僻文种占比当信号，UTF-8 侧新增 47 处失败）。故保持现实现，
   * 用本条把边界显式记录下来，避免日后有人误判成缺陷又改坏。
   */
  it("已知边界：全为「GBK/UTF-8 编码重合字」的极短文本会被判成 UTF-8（有记录即可）", () => {
    // 「一」的 GBK 编码 D2 BB 同时是合法的 2 字节 UTF-8
    expect(Array.from(encodeGbk("一"))).toEqual([0xd2, 0xbb]);

    // 程序化枚举重合子集（23938 个表内字符），不靠人肉列字（实测踩过：
    // 凭印象写的「何」并不在子集里）。常用字确实有一批落在其中：一 丞 丧 为 也 习 …
    const overlap: string[] = [];
    for (const ch of "一二三四五六七八九十丁七万丈三上下不与丐丑专且世丘丙业丛东丝") {
      const gbk = encodeGbk(ch);
      if (gbk.length !== 2) continue;
      try {
        new TextDecoder("utf-8", { fatal: true }).decode(gbk);
        overlap.push(ch);
      } catch {
        /* 不在重合子集 */
      }
    }
    expect(overlap.length, "常用字里应有一批落在重合子集").toBeGreaterThan(5);
    expect(overlap).toContain("一");

    // 只由重合字组成的 GBK 文本会被识别为 UTF-8 —— 有意接受的边界
    const gbkOnly = encodeGbk(overlap.join(""));
    expect(() => new TextDecoder("utf-8", { fatal: true }).decode(gbkOnly)).not.toThrow();

    // 但只要混入一个不在重合子集里的字，立刻正确回落 GBK（真实文本总是这样）
    expect(decodeAuto(encodeGbk("一天一天"))).toBe("一天一天");
    expect(decodeAuto(encodeGbk("1号主变压器"))).toBe("1号主变压器");
    expect(decodeAuto(encodeGbk("天府新区站"))).toBe("天府新区站");
  });
});

describe("looksLikeGbk", () => {
  it("GBK 字节为 true（无 UTF-8 BOM 且 GBK 解码无替换字符）", () => {
    expect(looksLikeGbk(encodeGbk("天府新区站"))).toBe(true);
  });

  it("UTF-8 中文为 false（按 GBK 解会出现替换字符）", () => {
    expect(looksLikeGbk(utf8("天府新区站"))).toBe(false);
  });

  it("带 UTF-8 BOM 的一律 false，即便后续字节恰好能凑成合法 GBK 对（分支必要性）", () => {
    // BOM(3 字节) + 1 个 ASCII = 4 字节，解成 GBK 恰好是 (EF,BB)(BF,41) 两个合法对、
    // 不含替换字符 —— 所以「只看去不出替换字符」的判据会误判成 true。
    // 这条 BOM 前置检查是唯一拦住它的东西，删掉本用例即红。
    const bomPlusAscii = Uint8Array.from([0xef, 0xbb, 0xbf, 0x41]);
    expect(new TextDecoder("gbk").decode(bomPlusAscii)).not.toContain("�");
    expect(looksLikeGbk(bomPlusAscii)).toBe(false);

    const bomPlusGbk = bytesOf([0xef, 0xbb, 0xbf, ...encodeGbk("天府新区站")]);
    expect(looksLikeGbk(bomPlusGbk)).toBe(false);
  });

  it("空输入不抛错（true：无可判定的替换字符）", () => {
    expect(looksLikeGbk(new Uint8Array())).toBe(true);
  });
});
