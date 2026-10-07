import { describe, expect, test } from "vitest";
import { contentDispositionAttachment } from "./contentDisposition.mjs";

// 本模块此前**零专属测试**，只有 cimExport.test.mjs / apiV1Schemes.handlers.test.mjs
// 等 3 处 handler 测试间接钉了头字符串的前缀。下面把 `contentDispositionAttachment`
// 的输出**逐字**钉住：所有期望值都由实际运行结果抄来（见每条用例注释），
// 不是按 RFC 6266 想象的「正确形式」写的 —— 实现刻意保留了既有的非规范写法，
// 这里只锁现状，不做修正。
describe("contentDispositionAttachment", () => {
  // 实际输出：
  //   attachment; filename="report.pdf"; filename*=UTF-8''report.pdf
  test("ASCII 文件名：两段都原样透传（无百分号编码）", () => {
    expect(contentDispositionAttachment("report.pdf")).toBe(
      "attachment; filename=\"report.pdf\"; filename*=UTF-8''report.pdf"
    );
  });

  // 实际输出：
  //   attachment; filename="%E6%96%B9%E6%A1%88%202024.e"; filename*=UTF-8''%E6%96%B9%E6%A1%88%202024.e
  // 注意**空格被编成 %20**，且 filename= 段同样是百分号编码（不是 RFC 6266 推荐的
  // ASCII 降级名）。这是既定行为，改动即协议变更。
  test("中文文件名：百分号编码后空格为 %20，两段逐字一致", () => {
    expect(contentDispositionAttachment("方案 2024.e")).toBe(
      "attachment; filename=\"%E6%96%B9%E6%A1%88%202024.e\"; filename*=UTF-8''%E6%96%B9%E6%A1%88%202024.e"
    );
  });

  // 实际输出：emoji（代理对）整段 UTF-8 编码
  //   attachment; filename="emoji%F0%9F%98%80.csv"; filename*=UTF-8''emoji%F0%9F%98%80.csv
  test("非 BMP 字符：代理对被完整编码", () => {
    expect(contentDispositionAttachment("emoji😀.csv")).toBe(
      "attachment; filename=\"emoji%F0%9F%98%80.csv\"; filename*=UTF-8''emoji%F0%9F%98%80.csv"
    );
  });

  // 实际输出：
  //   attachment; filename=""; filename*=UTF-8''
  // 空文件名**不抛错、不兜底**，直接产出两段空值。这是逐字锁定的现状
  // （调用方是否该兜底属于业务决策，不在本测试范围内）。
  test("空字符串：产出两个空 filename，不抛异常", () => {
    expect(contentDispositionAttachment("")).toBe(
      "attachment; filename=\"\"; filename*=UTF-8''"
    );
  });

  // 实际输出（均不抛错，由 encodeURIComponent 的字符串隐式转换产生）：
  //   undefined -> attachment; filename="undefined"; filename*=UTF-8''undefined
  //   null      -> attachment; filename="null"; filename*=UTF-8''null
  //   123       -> attachment; filename="123"; filename*=UTF-8''123
  // 注意这**不是**「空文件名」：`String(undefined)` 是 "undefined"，与 "" 不同。
  // 这里显式钉住，避免将来有人把 `?? ""` 之类的兜底悄悄加进来。
  test("undefined / null / 非字符串：被隐式转成字符串而非空串", () => {
    expect(contentDispositionAttachment(undefined)).toBe(
      "attachment; filename=\"undefined\"; filename*=UTF-8''undefined"
    );
    expect(contentDispositionAttachment(null)).toBe(
      "attachment; filename=\"null\"; filename*=UTF-8''null"
    );
    expect(contentDispositionAttachment(123)).toBe(
      "attachment; filename=\"123\"; filename*=UTF-8''123"
    );
  });

  // 实际输出：
  //   attachment; filename="a%22b.txt"; filename*=UTF-8''a%22b.txt
  // 双引号被编码成 %22，因此**不会**闭合 `filename="` 的引号
  // —— 这是实现选择编码而非加反斜杠转义的结果，也是它天然避免头注入的原因。
  test("含双引号：编码为 %22，不产生未闭合引号", () => {
    expect(contentDispositionAttachment('a"b.txt')).toBe(
      "attachment; filename=\"a%22b.txt\"; filename*=UTF-8''a%22b.txt"
    );
  });

  // 实际输出（CR/LF 均被编码，故不会造成响应头注入）：
  //   CRLF -> attachment; filename="line1%0D%0Aline2.txt"; filename*=UTF-8''line1%0D%0Aline2.txt
  //   LF   -> attachment; filename="line1%0Aline2.txt";  filename*=UTF-8''line1%0Aline2.txt
  // 两条都要断言：只看 LF 的用例在 CR 处理被改掉时会恒绿。
  test("含 CRLF 与单独 LF：均被编码，不产生裸换行", () => {
    expect(contentDispositionAttachment("line1\r\nline2.txt")).toBe(
      "attachment; filename=\"line1%0D%0Aline2.txt\"; filename*=UTF-8''line1%0D%0Aline2.txt"
    );
    expect(contentDispositionAttachment("line1\nline2.txt")).toBe(
      "attachment; filename=\"line1%0Aline2.txt\"; filename*=UTF-8''line1%0Aline2.txt"
    );
  });

  // 实际输出：
  //   attachment; filename="tab%09here.txt"; filename*=UTF-8''tab%09here.txt
  // 制表符同样被编码 —— 少一条断言的话，只钉 CRLF 的用例看不见这条回归。
  test("含制表符：编码为 %09", () => {
    expect(contentDispositionAttachment("tab\there.txt")).toBe(
      "attachment; filename=\"tab%09here.txt\"; filename*=UTF-8''tab%09here.txt"
    );
  });

  // 实际输出：
  //   逗号 -> attachment; filename="a%3Bb%2Cc.txt"; filename*=UTF-8''a%3Bb%2Cc.txt
  //   反斜杠 -> attachment; filename="a%5Cb.txt"; filename*=UTF-8''a%5Cb.txt
  //   百分号 -> attachment; filename="a%25b.txt"; filename*=UTF-8''a%25b.txt
  // 逗号是 header 参数分隔符、反斜杠是路径分隔符、百分号会被误当成已有转义
  // （idempotency 问题），三者都必须被编码。
  test("含分号 / 逗号 / 反斜杠 / 百分号：全部被编码", () => {
    expect(contentDispositionAttachment("a;b,c.txt")).toBe(
      "attachment; filename=\"a%3Bb%2Cc.txt\"; filename*=UTF-8''a%3Bb%2Cc.txt"
    );
    expect(contentDispositionAttachment("a\\b.txt")).toBe(
      "attachment; filename=\"a%5Cb.txt\"; filename*=UTF-8''a%5Cb.txt"
    );
    expect(contentDispositionAttachment("a%b.txt")).toBe(
      "attachment; filename=\"a%25b.txt\"; filename*=UTF-8''a%25b.txt"
    );
  });

  // 实际输出：
  //   "../../etc/passwd"          -> ..%2F..%2Fetc%2Fpasswd
  //   "..%2F..%2Fetc%2Fpasswd"   -> ..%252F..%252Fetc%2Fpasswd  （% 被编成 %25）
  // 头值里的路径只是给客户端的**文件名提示**，不参与服务端落盘，故这里只断言
  // 编码结果；第二条顺带钉住「已编码输入不会被二次解码」。
  test("路径分隔符与已编码串：前者被编码，后者被二次编码", () => {
    expect(contentDispositionAttachment("../../etc/passwd")).toBe(
      "attachment; filename=\"..%2F..%2Fetc%2Fpasswd\"; filename*=UTF-8''..%2F..%2Fetc%2Fpasswd"
    );
    expect(contentDispositionAttachment("..%2F..%2Fetc%2Fpasswd")).toBe(
      "attachment; filename=\"..%252F..%252Fetc%252Fpasswd\"; filename*=UTF-8''..%252F..%252Fetc%252Fpasswd"
    );
  });

  // 结构不变量：任何输入（这里是含中文、空串、数字、CRLF 四类）下
  // 都必须恰好产出一个 disposition-type、两个 filename 参数。
  // 这一条与逐字断言互补 —— 逐字断言随输入变化，结构断言锁住
  // 「三段拼接」这个模板本身没被动过。
  test("结构不变量：attachment 前缀 + filename + filename* 三段齐全", () => {
    for (const input of ["方案 2024.e", "", 123, "line1\r\nline2.txt"]) {
      const value = contentDispositionAttachment(input);
      expect(value.startsWith("attachment; ")).toBe(true);
      expect(value.match(/filename\*=/g)).toHaveLength(1);
      expect(value.match(/; filename="/g)).toHaveLength(1);
      // filename= 与 filename* 两段取到的值必须相同（实现里同一 encoded 复用两处）
      expect(value).toBe(
        `attachment; filename="${encodeURIComponent(input)}"; filename*=UTF-8''${encodeURIComponent(input)}`
      );
      // 头值内不得出现裸 CR/LF —— 否则可注入额外响应头
      expect(value.includes("\r")).toBe(false);
      expect(value.includes("\n")).toBe(false);
    }
  });
});