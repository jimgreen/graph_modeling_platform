// 后端查询串与配色显示模式归一。
// schemePathQueryParam 要做「JSON 序列化 + 整体 URL 编码」两步 ——
// 只编码不序列化会被后端 JSON.parse 拒；只序列化不编码则中文路径在 URL 里裸奔。
import { describe, expect, test } from "vitest";

import { normalizeColorDisplayMode, schemePathQueryParam } from "./appExtracted/appPersistenceLibraryExport";

describe("schemePathQueryParam", () => {
  test("产出 <名>=<编码后的 JSON 数组>", () => {
    expect(schemePathQueryParam("schemePath", ["a", "b"])).toBe("schemePath=" + encodeURIComponent(JSON.stringify(["a", "b"])));
  });

  test("中文路径被整体编码", () => {
    const result = schemePathQueryParam("schemePath", ["父方案", "子方案"]);

    expect(result).not.toContain("父方案");
    expect(result).toBe("schemePath=" + encodeURIComponent(JSON.stringify(["父方案", "子方案"])));
  });

  test("空路径编码成 []", () => {
    expect(schemePathQueryParam("schemePath", [])).toBe("schemePath=" + encodeURIComponent("[]"));
  });

  test("参数名原样出现在等号前", () => {
    expect(schemePathQueryParam("name", ["a"]).startsWith("name=")).toBe(true);
  });

  test("路径里含斜杠等保留字符时不会破坏查询串", () => {
    const result = schemePathQueryParam("schemePath", ["a/b", "c?d"]);

    expect(result.slice("schemePath=".length)).not.toContain("/");
  });

  test("编码结果可被 JSON.parse 还原", () => {
    const result = schemePathQueryParam("schemePath", ["a", "b"]);

    expect(JSON.parse(decodeURIComponent(result.slice("schemePath=".length)))).toEqual(["a", "b"]);
  });
});

describe("normalizeColorDisplayMode", () => {
  test("已知模式原样返回", () => {
    expect(normalizeColorDisplayMode("energy")).toBe("energy");
    expect(normalizeColorDisplayMode("voltage")).toBe("voltage");
  });

  test("未知值退回默认", () => {
    expect(normalizeColorDisplayMode("不存在")).toBe("energy");
  });

  test("空串退回默认", () => {
    expect(normalizeColorDisplayMode("")).toBe("energy");
  });

  test("null / undefined 退回默认", () => {
    expect(normalizeColorDisplayMode(null as any)).toBe("energy");
    expect(normalizeColorDisplayMode(undefined as any)).toBe("energy");
  });

  test("大小写不同不被识别（严格等于 voltage 才通过）", () => {
    expect(normalizeColorDisplayMode("Voltage")).toBe("energy");
    expect(normalizeColorDisplayMode("ENERGY")).toBe("energy");
  });

  test("非字符串退回默认", () => {
    expect(normalizeColorDisplayMode(1 as any)).toBe("energy");
  });
});
