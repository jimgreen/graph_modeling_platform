// src/backendExportPath.ts 的单测 —— 此前零覆盖。
//
// 它是前端各导出入口（E / SVG / JSON / CIM / 发送）共用的「方案路径口径」单源。
// 口径分叉的后果隐蔽：某个导出入口漏用它就会用错路径去请求后端，轻则 404，
// 重则导出了另一个方案的内容。函数本身极简但带一条关键兜底 ——
// 拿不到路径时回落到「默认方案」而不是空数组（空数组会让后端收到
// schemePath=[] 从而报 bad-request）。
import { describe, expect, test } from "vitest";
import { backendExportSchemePath } from "./backendExportPath";

describe("backendExportSchemePath", () => {
  test("有 schemePathForScheme 时用它的返回值", () => {
    const scope = {
      activeSchemeKey: "k1",
      schemePathForScheme: (key: string) => (key === "k1" ? ["方案A", "子方案1"] : [])
    };
    expect(backendExportSchemePath(scope)).toEqual(["方案A", "子方案1"]);
  });

  test("取到空数组时回落到「默认方案」（不返回空数组）", () => {
    const scope = {
      activeSchemeKey: "k1",
      schemePathForScheme: () => []
    };
    expect(backendExportSchemePath(scope)).toEqual(["默认方案"]);
  });

  test("没有 schemePathForScheme（历史数据无此依赖）时也回落", () => {
    expect(backendExportSchemePath({ activeSchemeKey: "k1" })).toEqual(["默认方案"]);
  });

  test("schemePathForScheme 抛错不会穿透（调用方在渲染路径上）", () => {
    // 实际实现不解包 try；这里钉住当前行为 —— 抛出即抛出，
    // 避免有人以为它已兜住而写出依赖兜底的错误前提。
    const scope = {
      activeSchemeKey: "k1",
      schemePathForScheme: () => {
        throw new Error("boom");
      }
    };
    expect(() => backendExportSchemePath(scope)).toThrow("boom");
  });

  test("返回非数组时回落到「默认方案」", () => {
    const scope = {
      activeSchemeKey: "k1",
      schemePathForScheme: () => "不是数组"
    };
    expect(backendExportSchemePath(scope)).toEqual(["默认方案"]);
  });

  test("结果恒为非空数组（导出入口可以安全地 .map/.join）", () => {
    const scopes = [
      {},
      { activeSchemeKey: "k" },
      { schemePathForScheme: () => [] },
      { schemePathForScheme: () => null },
      { schemePathForScheme: () => ["a"] }
    ];
    for (const scope of scopes) {
      const out = backendExportSchemePath(scope);
      expect(Array.isArray(out)).toBe(true);
      expect(out.length).toBeGreaterThan(0);
    }
  });
});
