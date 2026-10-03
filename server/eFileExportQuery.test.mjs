// server/eFileExport.mjs 的 parseEFileQuery 直测 —— 此前零直呼。
//
// 它是 v1 E 文件端点的**全部入参校验**：schemePath / name / encoding / template
// 四道关都在这里过，返回 error 就直接 400。四道关的判错后果完全一样 ——
// 调用方拿到一个「看起来合法但实际不是」的参数，于是：
//   - schemePath 缺失 → 后面 readSchemeProjectRecord 拿到空数组，可能误命中第一条记录
//   - encoding 拼错 → 用 GBK 解 UTF-8（或反之），E 文件整篇乱码而不报错
//   - template 拼错 → 静默走「无模板」路径，导出的是原始定义而非用户要的模板
//
// 这些都**不会抛错**，只表现为「导出的东西不对」。所以必须逐条钉住。
//
// 注意：`.test.mjs` 必须是纯 JS —— 不要写 `as never` / 类型标注 / 非空断言，
// 那些会触发 RollupError: Parse failure，表现为「Tests: no tests」（看着像通过，实际没跑）。
import { describe, expect, test } from "vitest";
import { parseEFileQuery } from "./eFileExport.mjs";
import { PREDEFINED_E_DEVICE_TEMPLATES } from "./eFileTemplates.mjs";

/** 造一个只带 searchParams 的最小 URL（parseEFileQuery 不读别的字段）。 */
function urlWith(params) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      search.set(key, value);
    }
  }
  return new URL(`http://127.0.0.1/webgrp/v1/schemes/model/e-file?${search.toString()}`);
}

// 生产链路是**单次编码**：`URLSearchParams.set` 自己会编码，所以这里传原始 JSON 字符串。
// 若再套一层 encodeURIComponent，值会被编码两次，`searchParams.get` 取出时仍带 % ——
// 那不是生产形态，解析函数也不该为它做二次解码。
const schemePath = (parts) => JSON.stringify(parts);

describe("parseEFileQuery / 成功路径", () => {
  test("最小可用入参：schemePath + name，其余走默认", () => {
    const parsed = parseEFileQuery(urlWith({ schemePath: schemePath(["方案A", "子方案"]), name: "模型1" }));
    expect(parsed.error).toBeUndefined();
    expect(parsed.parts).toEqual(["方案A", "子方案"]);
    expect(parsed.name).toBe("模型1");
    // encoding 缺省即 gbk（E 文件的既定默认）
    expect(parsed.encoding).toBe("gbk");
    expect(parsed.templateName).toBe("");
  });

  test("encoding 两种取值都接受，且大小写不敏感", () => {
    for (const encoding of ["gbk", "utf-8", "GBK", "UTF-8", "Utf-8", " gbk "]) {
      const parsed = parseEFileQuery(urlWith({
        schemePath: schemePath(["方案A"]),
        name: "模型1",
        encoding
      }));
      expect(parsed.error, `encoding=${JSON.stringify(encoding)}`).toBeUndefined();
      expect(["gbk", "utf-8"], `encoding=${JSON.stringify(encoding)}`).toContain(parsed.encoding);
    }
  });

  test("encoding 只给空白时回落到默认 gbk（那行 `|| \"gbk\"` 兜底）", () => {
    const parsed = parseEFileQuery(urlWith({ schemePath: schemePath(["方案A"]), name: "模型1", encoding: "   " }));
    expect(parsed.encoding).toBe("gbk");
  });

  test("name 两端空白被裁掉", () => {
    const parsed = parseEFileQuery(urlWith({ schemePath: schemePath(["方案A"]), name: "  模型1  " }));
    expect(parsed.name).toBe("模型1");
  });

  test("已知模板名被接受，并原样回传", () => {
    const templateName = Object.keys(PREDEFINED_E_DEVICE_TEMPLATES)[0];
    const parsed = parseEFileQuery(urlWith({
      schemePath: schemePath(["方案A"]),
      name: "模型1",
      template: templateName
    }));
    expect(parsed.error).toBeUndefined();
    expect(parsed.templateName).toBe(templateName);
  });

  test("template 只给空白时按「无模板」处理（不是未知模板）", () => {
    const parsed = parseEFileQuery(urlWith({ schemePath: schemePath(["方案A"]), name: "模型1", template: "   " }));
    expect(parsed.error).toBeUndefined();
    expect(parsed.templateName).toBe("");
  });
});

describe("parseEFileQuery / schemePath 校验", () => {
  test("缺失 / 空串 / 非法 JSON 都回 bad-request", () => {
    for (const [label, value] of [
      ["缺失", undefined],
      ["空串", ""],
      ["非 JSON", "不是JSON"],
      ["不是数组", encodeURIComponent(JSON.stringify({ a: 1 }))]
    ]) {
      const parsed = parseEFileQuery(urlWith({ schemePath: value, name: "模型1" }));
      expect(parsed.error?.code, label).toBe("bad-request");
      expect(parsed.error?.message, label).toContain("schemePath");
    }
  });

  test("空数组（JSON 合法但无层级）也回 bad-request —— 不是模型", () => {
    // parseSchemePathParam("[]") 返回 []（非 null），但 requireSchemePath 判它为非法
    const parsed = parseEFileQuery(urlWith({ schemePath: schemePath([]), name: "模型1" }));
    expect(parsed.error?.code).toBe("bad-request");
  });

  test("schemePath 里的点段被净化掉，不会逃出方案根", () => {
    // ".." 经 sanitizeSegment 变成兜底名（"方案"），而不是被原样当路径段用
    const parsed = parseEFileQuery(urlWith({ schemePath: schemePath(["..", "子方案"]), name: "模型1" }));
    expect(parsed.error).toBeUndefined();
    expect(parsed.parts.some((part) => part === "..")).toBe(false);
  });
});

describe("parseEFileQuery / name 校验", () => {
  test("缺失 / 只有空白都回 bad-request", () => {
    for (const [label, value] of [["缺失", undefined], ["空串", ""], ["空白", "   "]]) {
      const parsed = parseEFileQuery(urlWith({ schemePath: schemePath(["方案A"]), name: value }));
      expect(parsed.error?.code, label).toBe("bad-request");
      expect(parsed.error?.message, label).toContain("模型名称");
    }
  });
});

describe("parseEFileQuery / encoding 校验", () => {
  test("非 gbk / utf-8 的取值回 bad-request（拼错编码会让整篇 E 文件乱码）", () => {
    for (const encoding of ["utf8", "utf_8", "gb2312", "latin1", "base64", "x"]) {
      const parsed = parseEFileQuery(urlWith({
        schemePath: schemePath(["方案A"]),
        name: "模型1",
        encoding
      }));
      expect(parsed.error?.code, `encoding=${encoding}`).toBe("bad-request");
      expect(parsed.error?.message, `encoding=${encoding}`).toContain("gbk");
    }
  });
});

describe("parseEFileQuery / template 校验", () => {
  test("未知模板名回 bad-request，并在消息里列出可用模板", () => {
    const parsed = parseEFileQuery(urlWith({
      schemePath: schemePath(["方案A"]),
      name: "模型1",
      template: "不存在的模板"
    }));
    expect(parsed.error?.code).toBe("bad-request");
    expect(parsed.error?.message).toContain("不存在的模板");
    // 消息里列出全部可用名，便于调用方自查
    for (const name of Object.keys(PREDEFINED_E_DEVICE_TEMPLATES)) {
      expect(parsed.error?.message, name).toContain(name);
    }
  });

  test("合法性与清单单源：只有 PREDEFINED_E_DEVICE_TEMPLATES 里的键被接受", () => {
    // 若日后往清单里加模板，这条自动跟着变；若从别处取名字，这里会红。
    const known = Object.keys(PREDEFINED_E_DEVICE_TEMPLATES);
    expect(known.length, "预定义模板清单不该是空的").toBeGreaterThan(0);
    for (const name of known) {
      const parsed = parseEFileQuery(urlWith({
        schemePath: schemePath(["方案A"]),
        name: "模型1",
        template: name
      }));
      expect(parsed.error, `模板「${name}」应当被接受`).toBeUndefined();
    }
  });
});

describe("parseEFileQuery / 校验顺序", () => {
  test("多道关同时不合法时，schemePath 的错误先报出", () => {
    // 顺序决定调用方看到的提示。改顺序会让已有客户端的报错文案对不上。
    const parsed = parseEFileQuery(urlWith({ schemePath: "不是JSON", name: "", encoding: "乱码", template: "不存在" }));
    expect(parsed.error?.message).toContain("schemePath");
  });

  test("schemePath 合法后，name 的错误第二个报出", () => {
    const parsed = parseEFileQuery(urlWith({ schemePath: schemePath(["方案A"]), name: "", encoding: "乱码", template: "不存在" }));
    expect(parsed.error?.message).toContain("模型名称");
  });

  test("前三道合法后，encoding 的错误第三个报出", () => {
    const parsed = parseEFileQuery(urlWith({ schemePath: schemePath(["方案A"]), name: "模型1", encoding: "乱码", template: "不存在" }));
    expect(parsed.error?.message).toContain("encoding");
  });
});
