// shared/xmlEscape.mjs 的单元测试 —— 此前零覆盖。
//
// 它是「全仓库唯一」的 XML/HTML 转义实现，被 E 文件、CIM/XML、SVG 导出共用。
// 转义有漏就是 XML 注入（设备名里塞 `</ACLoad><script>` 就能截断文档结构），
// 且导出格式一旦被破坏，第三方解析器会直接读不出数据 —— 现有端到端测试
// 用的都是不含元字符的普通名，覆盖不到。
import { describe, expect, test } from "vitest";
import { escapeXmlFull } from "./xmlEscape.mjs";

describe("escapeXmlFull", () => {
  test("五个 XML 保留字符全部转义", () => {
    expect(escapeXmlFull(`&<>"'`)).toBe("&amp;&lt;&gt;&quot;&apos;");
  });

  test("& 先于其它实体转义（顺序正确，不会双重转义）", () => {
    // 若先转 < 再转 &，&lt; 会变成 &amp;lt;
    expect(escapeXmlFull("<")).toBe("&lt;");
    expect(escapeXmlFull("&lt;")).toBe("&amp;lt;");
  });

  test("双引号与单引号都被覆盖（属性可能用任一种引号包裹）", () => {
    expect(escapeXmlFull(`"`)).toBe("&quot;");
    expect(escapeXmlFull(`'`)).toBe("&apos;");
  });

  test("设备名里的闭合标签注入被中和", () => {
    const malicious = `设备</ACLoad><injected attr="1">`;
    const escaped = escapeXmlFull(malicious);
    expect(escaped).not.toContain("<injected");
    expect(escaped).toContain("&lt;/ACLoad&gt;");
  });

  test("属性值注入（单引号闭合）被中和", () => {
    const malicious = `x' onload='alert(1)`;
    const escaped = escapeXmlFull(malicious);
    expect(escaped).not.toContain("' onload='");
  });

  test("普通文本与中文原样保留", () => {
    expect(escapeXmlFull("1号主变压器")).toBe("1号主变压器");
    expect(escapeXmlFull("220kV 母线 A 相")).toBe("220kV 母线 A 相");
  });

  test("nullish 与非字符串输入安全处理", () => {
    expect(escapeXmlFull(null)).toBe("");
    expect(escapeXmlFull(undefined)).toBe("");
    expect(escapeXmlFull(123)).toBe("123");
    expect(escapeXmlFull(false)).toBe("false");
  });
});
