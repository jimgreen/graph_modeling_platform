// server/xmlEncoding.mjs 的单元测试 —— 此前零覆盖。
//
// 它是「导出响应体与前端落盘文件逐字节一致」这条契约的单源实现，被
// /v1/schemes/model/e-file、/svg、/cim-xml、/send 四处共用。字节不一致的后果
// 是第三方拿到的文件与用户本地保存的文件不同（编码声明错、BOM 多余、声明重复），
// 而现有端到端测试比的是**内容**不是**字节**，抓不到声明层面的差异。
import { describe, expect, test, vi } from "vitest";
import iconv from "iconv-lite";
import { encodeTextBytes, withXmlEncodingDeclaration } from "./xmlEncoding.mjs";

describe("encodeTextBytes", () => {
  test("gbk 走 iconv，字节与 iconv.encode 一致", () => {
    const text = "中文测试";
    expect(encodeTextBytes(text, "gbk")).toEqual(iconv.encode(text, "gbk"));
  });

  test("非 gbk（即 utf-8）按 utf-8 编码", () => {
    const text = "中文测试";
    expect(encodeTextBytes(text, "utf-8")).toEqual(Buffer.from(text, "utf-8"));
    // 未传 / 传其它值也走 utf-8
    expect(encodeTextBytes(text, undefined)).toEqual(Buffer.from(text, "utf-8"));
    expect(encodeTextBytes(text, "GBK")).toEqual(Buffer.from(text, "utf-8")); // 大小写敏感
  });

  test("gbk 与 utf-8 对同一中文文本产出不同字节（证明确实按编码走）", () => {
    const text = "母线";
    expect(encodeTextBytes(text, "gbk").equals(encodeTextBytes(text, "utf-8"))).toBe(false);
  });

  test("gbk 产物可被 iconv 无损解码回原文", () => {
    const text = "第1端关联交流单元序号";
    expect(iconv.decode(encodeTextBytes(text, "gbk"), "gbk")).toBe(text);
  });

  test("nullish 与非字符串输入不抛错", () => {
    expect(encodeTextBytes(null, "utf-8").length).toBe(0);
    expect(encodeTextBytes(undefined, "utf-8").length).toBe(0);
    expect(encodeTextBytes(123, "utf-8").toString("utf-8")).toBe("123");
  });
});

describe("encodeTextBytes：GBK 不可映射字符告警", () => {
  test("★ 字节输出不变（与 iconv.encode 逐字节相同，告警不参与编码）", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const text = "设备😀";
    expect(encodeTextBytes(text, "gbk").equals(iconv.encode(text, "gbk"))).toBe(true);
    warn.mockRestore();
  });

  test("★ emoji / 生僻字被写成 ? 时告警，并点名具体字符与码位", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    encodeTextBytes("设备😀", "gbk");
    expect(warn).toHaveBeenCalledTimes(1);
    const message = String(warn.mock.calls[0][0]);
    expect(message).toContain("GBK");
    expect(message).toContain("U+1F600");
    expect(message).toContain("共 1 个");
    warn.mockRestore();
  });

  test("多个不可映射字符计数正确（超过 10 个时省略号收尾）", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    encodeTextBytes("设备𠮷𬜨😀🙈🎉🕐🌍🔥💡⭐🚀", "gbk");
    const message = String(warn.mock.calls[0][0]);
    expect(message).toContain("共 11 个");
    expect(message).toContain("…");
    warn.mockRestore();
  });

  test("★ 正常中文不告警（别把每次导出都刷成噪音）", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    encodeTextBytes("第1端关联交流单元序号 母线 负荷 断路器", "gbk");
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  test("★ 原文本来就含 '?' 不算丢失（'?' 的 GBK 编码能原样往返）", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    encodeTextBytes("状态?正常", "gbk");
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  test("utf-8 路径不告警（GBK 无损，不需要检测）", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    encodeTextBytes("设备😀", "utf-8");
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  test("★ 损坏确实发生（不是理论告警）：emoji 解码回来是问号", () => {
    expect(iconv.decode(iconv.encode("😀", "gbk"), "gbk")).toBe("?");
  });
});

describe("withXmlEncodingDeclaration", () => {
  test("utf-8 产出正确的声明", () => {
    const out = withXmlEncodingDeclaration("<root/>", "utf-8");
    expect(out.startsWith('<?xml version="1.0" encoding="UTF-8"?>\n')).toBe(true);
  });

  test("gbk 产出 GBK 声明（大小写按标准）", () => {
    const out = withXmlEncodingDeclaration("<root/>", "gbk");
    expect(out.startsWith('<?xml version="1.0" encoding="GBK"?>\n')).toBe(true);
  });

  test("已有声明被剥离，不会出现两个声明", () => {
    const out = withXmlEncodingDeclaration('<?xml version="1.0" encoding="utf-8"?><root/>', "gbk");
    expect(out.match(/<\?xml/gu)).toHaveLength(1);
    expect(out).toContain('encoding="GBK"');
    expect(out).toContain("<root/>");
  });

  test("带 BOM 与前导空白的已有声明同样被剥离", () => {
    const withBom = '\uFEFF<?xml version="1.0"?>\n<root/>';
    const out = withXmlEncodingDeclaration(withBom, "utf-8");
    expect(out.match(/<\?xml/gu)).toHaveLength(1);
    expect(out.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    // 剥离处不留 BOM
    expect(out.charCodeAt(0)).toBe(0x3c); // '<'
  });

  test("内容里出现的 <?xml 不是开头的声明时不被剥离", () => {
    // 只剥离前导的那一个；正文里的处理成字符内容
    const out = withXmlEncodingDeclaration("<a><?pi?></a>", "utf-8");
    expect(out).toContain("<a><?pi?></a>");
  });

  test("声明与内容的拼接是幂等的（重复调用不会叠加）", () => {
    const once = withXmlEncodingDeclaration("<root/>", "gbk");
    const twice = withXmlEncodingDeclaration(once, "gbk");
    expect(twice).toBe(once);
  });

  test("空内容也能产出合法声明", () => {
    const out = withXmlEncodingDeclaration("", "utf-8");
    expect(out).toBe('<?xml version="1.0" encoding="UTF-8"?>\n');
  });

  test("声明 + 编码后的字节与前端落盘路径一致（E 文件实拍用例）", () => {
    // 模拟：正文含中文，声明声明 gbk，编码后应能被 iconv 还原出正文
    const body = "<ACLoad><name>1号主变压器</name></ACLoad>";
    const declared = withXmlEncodingDeclaration(body, "gbk");
    const bytes = encodeTextBytes(declared, "gbk");
    const decoded = iconv.decode(bytes, "gbk");
    expect(decoded).toBe(declared);
    expect(decoded).toContain('encoding="GBK"');
    expect(decoded).toContain("1号主变压器");
  });
});
