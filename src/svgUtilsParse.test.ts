// svgUtils.ts 的「SVG 解析 / 数值格式化」基础件直接单测：
//   svgRootAttributeValue / svgLengthNumber / escapeXml 转发 / formatSvgNumber。
//
// 这些是整条 SVG 管线的**地基**：`escapeXml` 被生产代码调用 166 处（全站 SVG
// 输出的转义都经它），`svgRootAttributeValue` + `svgLengthNumber` 是
// `inlineSvgImageMarkup`（svgUtils.ts:306-307）读根属性 width/height、
// 决定是否补 `viewBox` 的唯一出处 —— 读错则导出的内联 SVG 尺寸错、图变形，
// 而导出流程**不报错**。
//
// escapeXml 的核心实现在 shared/xmlEscape.mjs（已有测试），本文件覆盖的是
// **svgUtils 这层转发**的契约与边界。
import { describe, expect, test } from "vitest";
import { svgRootAttributeValue, svgLengthNumber, escapeXml, formatSvgNumber } from "./svgUtils";

describe("svgRootAttributeValue（根属性读取）", () => {
  test("常规：双引号 / 单引号 / 大小写 / 等号两侧空格", () => {
    const attrs = `<svg width="100" height="60" viewBox="0 0 172 132">`;
    expect(svgRootAttributeValue(attrs, "width")).toBe("100");
    expect(svgRootAttributeValue(attrs, "height")).toBe("60");
    expect(svgRootAttributeValue(attrs, "viewBox")).toBe("0 0 172 132");
    expect(svgRootAttributeValue(`<svg WIDTH="100">`, "width")).toBe("100");
    expect(svgRootAttributeValue(`<svg width = "100">`, "width")).toBe("100");
  });

  test("属性不存在 / 无引号取值 → 空串（调用方据此判「无尺寸」）", () => {
    expect(svgRootAttributeValue(`<svg width="100">`, "foo")).toBe("");
    // 无引号的属性值取不到（正则要求引号）
    expect(svgRootAttributeValue(`<svg width=100>`, "width")).toBe("");
  });

  test("重复属性取**首个**", () => {
    expect(svgRootAttributeValue(`width="100" width="200"`, "width")).toBe("100");
  });

  test("混合引号时也取首个出现位置的值（不按引号类型优先）", () => {
    expect(svgRootAttributeValue(`width='1' width="2"`, "width")).toBe("1");
    expect(svgRootAttributeValue(`width="1" width='2'`, "width")).toBe("1");
  });

  test("**词边界只挡「后缀」，不挡「前缀」**（探针实测的真实局限）", () => {
    // mywidth：y→w 之间没有词边界（都是单词字符）→ 挡得住
    expect(svgRootAttributeValue(`<svg mywidth="100">`, "width")).toBe("");
    // data-width：`-` → `w` 之间**是**词边界（- 是非单词字符）→ 挡不住，会匹配上
    // 如实记录：查 "width" 时 data-width 会被误命中。唯一消费点只查 width/height，
    // 而 SVG 根标签不会同时有 data-width，故当前无影响；但这解释了为何不能
    // 把该函数当成「精确属性匹配」来依赖。
    expect(svgRootAttributeValue(`<svg data-width="100">`, "width")).toBe("100");
  });

  test("双引号属性值内的单引号不算结束（引号类不互相嵌套）", () => {
    expect(svgRootAttributeValue(`<svg name="a'b">`, "name")).toBe("a'b");
  });

  test("**已知限制（如实记录）**：name 直接拼进 new RegExp，元字符会改变匹配语义", () => {
    // 唯一真实调用点（svgUtils.ts:306/307）只传字面量 "width" / "height"，
    // 外部数据不可达，故不改实现。但把该限制钉在这里：日后有人把 name 接到
    // 用户/外部数据上时，本用例会立刻提示「name 必须是字面量」。
    // ① 字符类能匹配任意属性名 —— 语义被劫持
    expect(svgRootAttributeValue(`<svg data-x="注入">`, "[a-z]+" as never)).toBe("注入");
    // ② 未闭合的分组会抛 SyntaxError（未捕获，直接冒泡）
    expect(() => svgRootAttributeValue(`<svg width="1">`, "wid(th" as never)).toThrow(SyntaxError);
    // ③ 其余元字符（点 / 加号 / 花括号 / \d）被词边界与属性结构挡住，取不到值
    for (const name of ["w.", "wid+h", "a{1,3}", "w\\d", "(?:x)"]) {
      expect(svgRootAttributeValue(`<svg wid+h="注入">`, name as never), name).toBe("");
    }
  });
});

describe("svgLengthNumber（尺寸数值解析：>0 守卫 + parseFloat 前缀语义）", () => {
  test("正常值：纯数字 / 带单位 / 科学计数", () => {
    expect(svgLengthNumber("100")).toBe(100);
    expect(svgLengthNumber("100px")).toBe(100);
    expect(svgLengthNumber("1.5em")).toBe(1.5);
    expect(svgLengthNumber("1e3")).toBe(1000);
    expect(svgLengthNumber(".5")).toBe(0.5);
    expect(svgLengthNumber("+7")).toBe(7);
    expect(svgLengthNumber("  42  ")).toBe(42);
  });

  test("**0 / 负数一律归 0**（守卫是 `> 0`，非 `>= 0`）", () => {
    // 消费点用它判「是否补 viewBox」，0 表示「尺寸不可用」
    for (const v of ["0", "0.0", "-5", "-0.1"]) {
      expect(svgLengthNumber(v), v).toBe(0);
    }
  });

  test("非数字 / 空 / 非有限值 → 0", () => {
    for (const v of ["abc", "", "   ", "NaN", "Infinity", "1e400", "0x10"]) {
      expect(svgLengthNumber(v), JSON.stringify(v)).toBe(0);
    }
  });

  test("**parseFloat 前缀语义**：尾部垃圾被忽略", () => {
    expect(svgLengthNumber("100abc")).toBe(100);
    // "1/2" 解析到首个 '/' 之前 —— 不是数学除法
    expect(svgLengthNumber("1/2")).toBe(1);
  });

  test("超长数字精度丢失（超过 MAX_SAFE_INTEGER，探针实测）", () => {
    expect(svgLengthNumber("9007199254740993")).toBe(9007199254740992);
  });
});

describe("escapeXml（svgUtils 转发层：5 个 XML 实体）", () => {
  test("五个保留字符全部转义（含单引号）", () => {
    expect(escapeXml(`<>&"'`)).toBe("&lt;&gt;&amp;&quot;&apos;");
  });

  test("**非幂等**：已转义内容会被再次转义", () => {
    // escapeXml(&) -> &amp; ；再次调用 -> &amp;amp;
    // 这一点重要：调用方不可对同一值重复转义（如先转义再拼接再转义）
    expect(escapeXml(escapeXml("&"))).toBe("&amp;amp;");
    expect(escapeXml("&lt;")).toBe("&amp;lt;");
  });

  test("空值 / 非字符串走 String()", () => {
    expect(escapeXml("")).toBe("");
    // 类型面是 string；实现内 String(value ?? "") 使 undefined 运行时安全
    expect(escapeXml(undefined as never)).toBe("");
    expect(escapeXml(123 as never)).toBe("123");
  });

  test("**控制字符不转义**（如实记录：转义器只管 5 个 XML 保留字符）", () => {
    expect(escapeXml("a\u0001b")).toBe("a\u0001b");
  });
});

describe("formatSvgNumber（SVG 数值格式化：5 位小数 + 负零归零）", () => {
  test("常规值与 5 位小数截断", () => {
    expect(formatSvgNumber(0)).toBe("0");
    expect(formatSvgNumber(100)).toBe("100");
    expect(formatSvgNumber(-1.5)).toBe("-1.5");
    expect(formatSvgNumber(1.234567891)).toBe("1.23457");
  });

  test("**-0 归零**（避免输出 '-0' 这种非法/怪异的 SVG 数值）", () => {
    expect(Object.is(formatSvgNumber(-0), "-0")).toBe(false);
    expect(formatSvgNumber(-0)).toBe("0");
  });

  test("绝对值小于精度阈值的负数归零", () => {
    expect(formatSvgNumber(-1e-7)).toBe("0");
  });
});
