// encodeTextAsBytes / encodeGbk 跨端一致性的直接单测。
//
// ## 为什么单独钉这两个纯函数
//
// `fileIO.test.ts` 覆盖的是**交互流程**（弹窗、写盘、viewToken 回传），
// 全程经过 mock，`encodeTextAsBytes` 从未被真正调用过。而它恰恰是
// **E 文件落盘编码**的唯一入口：
//
//   encodeTextAsBytes(text, "gbk")  →  GBK 字节
//   encodeTextAsBytes(text)         →  UTF-8 字节（TextEncoder）
//
// 判错的后果很直接：E 文件按 UTF-8 落盘而下游按 GBK 解析，
// 设备名里的中文全部变成乱码，且**导出流程不报任何错** ——
// 只在别人打开文件时才发现。
//
// 前端用 `TextEncoder`，而 Node 侧 `server/eFileExport.mjs` 走 `iconv-lite`。
// 两条路径必须产出**逐字节相同**的 GBK 字节，否则"前端保存"与
// "后端下载"会给出不同的文件。
import { describe, expect, test } from "vitest";
import iconv from "iconv-lite";
import { encodeTextAsBytes } from "./fileIO";
import { encodeGbk } from "./encoding/gbk";

const asGbk = (text: string) => encodeTextAsBytes(text, "gbk");
const asUtf8 = (text: string) => encodeTextAsBytes(text, "utf-8");

describe("默认编码是 utf-8", () => {
  test("不传第二参 → 与 TextEncoder 逐字节相同", () => {
    for (const text of ["", "abc", "中文", "1号主变压器", "220kV 母线 A 相", "混合 mixed 文本 123"]) {
      const expected = new TextEncoder().encode(text);
      expect(encodeTextAsBytes(text), JSON.stringify(text)).toEqual(expected);
    }
  });

  test("显式传 'utf-8' 与不传等价", () => {
    for (const text of ["", "abc", "中文", "设备</ACLoad attr=\"1\">"]) {
      expect(asUtf8(text), text).toEqual(encodeTextAsBytes(text));
    }
  });

  test("★ utf-8 与 gbk 对中文产出**不同**字节（证明编码参数真的生效）", () => {
    const text = "主变压器";
    expect(Array.from(asUtf8(text))).not.toEqual(Array.from(asGbk(text)));
    // 「主」「变」是双字节、「压」「器」是双字节 —— 4 个汉字 × 2 字节 = 8
    // （我起初按"有些汉字是 3 字节"算成 6，被测试当场抓出：GBK 里汉字一律 2 字节）
    expect(asGbk(text).length).toBe(8);
    expect(asUtf8(text).length).toBe(12); // 4 × 3 字节
    // 双字节汉字的 GBK 首字节恒 >= 0x81（低位留给 ASCII）
    for (const byte of asGbk(text)) expect(byte).toBeGreaterThanOrEqual(0x81);
  });
});

describe("★ 前端 encodeTextAsBytes('gbk') 与后端 iconv-lite 逐字节一致", () => {
  // 这是「前端落盘」与「后端下载」两条链路的交汇点。
  // 若两边对某个字符的处理不同（缺字、映射表版本差异），用户会拿到
  // 两种内容不同但都能"打开"的 E 文件，且没有任何提示。
  const samples = [
    "", "abc", "123", "  ", "\n", "\t",
    "1号主变压器", "220kV 母线 A 相", "厂站电源", "馈线负荷", "台区",
    "交流厂站电源", "直流母线", "储氢罐", "供热锅炉",
    "ACLoad&ACGenerator", "设备</ACLoad attr=\"1\">", "x' onload='alert(1)",
    "€", // U+20AC —— GBK 单字节 0x80（此前修过 euro 静默变 '?' 的缺陷）
    "…", "—", "·", "℃", "Ω", "α", "β",
    "Ⅰ", "Ⅱ", "Ⅲ", "℃", "№", "㎡",
    "混合 mixed 123 文本", "换行\n换行", "制表\t制表"
  ];

  test("全部样本逐字节相同（32 例）", () => {
    const mismatches: string[] = [];
    for (const text of samples) {
      const mine = Array.from(asGbk(text));
      const theirs = Array.from(iconv.encode(text, "gbk"));
      if (JSON.stringify(mine) !== JSON.stringify(theirs)) {
        mismatches.push(`${JSON.stringify(text)}: 本端=${JSON.stringify(mine)} iconv=${JSON.stringify(theirs)}`);
      }
    }
    expect(mismatches, `两边 GBK 编码不一致:\n${mismatches.join("\n")}`).toEqual([]);
    expect(samples.length).toBeGreaterThan(20);
  });

  test("euro 符号 U+20AC 编码为单字节 0x80（不是 '?'）", () => {
    // 回归守卫：`scripts/gen-gbk-table.mjs` 的收集条件是 `buf.length === 2`，
    // 只收双字节，euro 落在表外。修复后单字节 0x80 有了映射。
    const bytes = asGbk("€");
    expect(bytes.length).toBe(1);
    expect(bytes[0]).toBe(0x80);
    expect(bytes[0]).not.toBe(0x3f); // 0x3F = '?' —— 静默降级的症状
    // 与 iconv 一致
    expect(Array.from(bytes)).toEqual(Array.from(iconv.encode("€", "gbk")));
  });

  test("不可映射字符仍按 iconv 的替换行为（记为已知限制，不静默）", () => {
    // emoji 等 GBK 无映射的字符，iconv 走替换。这不是本函数的责任，
    // 但必须与后端**一致** —— 否则两端产出不同文件。
    const emoji = "设备😀";
    expect(Array.from(asGbk(emoji))).toEqual(Array.from(iconv.encode(emoji, "gbk")));
  });
});

describe("encodeTextAsBytes 与 encodeGbk 是同一条路径", () => {
  // fileIO 转发到 encoding/gbk。单独钉住"转发"这条关系，
  // 避免日后有人在 fileIO 里另写一份编码逻辑而两边漂移。
  const samples = ["", "abc", "中文主变压器", "€", "1号", "换行\n", "特殊&<>'\""];

  test("逐字节相同（8 例）", () => {
    for (const text of samples) {
      expect(Array.from(asGbk(text)), JSON.stringify(text)).toEqual(Array.from(encodeGbk(text)));
    }
  });
});

describe("返回类型与边界", () => {
  test("返回 Uint8Array", () => {
    for (const text of ["", "abc", "中文"]) {
      expect(encodeTextAsBytes(text)).toBeInstanceOf(Uint8Array);
      expect(encodeTextAsBytes(text, "gbk")).toBeInstanceOf(Uint8Array);
    }
  });

  test("空串 → 空数组（不是 undefined / null）", () => {
    expect(encodeTextAsBytes("").length).toBe(0);
    expect(encodeTextAsBytes("", "gbk").length).toBe(0);
  });

  test("★ GBK 下非 ASCII 一律 1~2 字节，无 4 字节（UTF-8 才有 3~4 字节）", () => {
    // 用来证明 'gbk' 参数真的切换了编码表，而不是被忽略。
    const asciiOnly = "abcdefghij";
    expect(asGbk(asciiOnly).length).toBe(asciiOnly.length);
    expect(asUtf8(asciiOnly).length).toBe(asciiOnly.length);

    const cjk = "一二三";
    expect(asGbk(cjk).length).toBe(6);   // 3 个汉字 × 2 字节
    expect(asUtf8(cjk).length).toBe(9);  // 3 个汉字 × 3 字节
  });

  test("换行与制表在两种编码下都是单字节（ASCII 兼容）", () => {
    for (const ch of ["\n", "\r", "\t", " "]) {
      expect(asGbk(ch).length, JSON.stringify(ch)).toBe(1);
      expect(asUtf8(ch).length, JSON.stringify(ch)).toBe(1);
      expect(asGbk(ch)[0]).toBe(asUtf8(ch)[0]);
    }
  });
});
