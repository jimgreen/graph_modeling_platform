// src/model.ts 的 normalizeRoutableLineDeviceStrokeWidthParam：可布线线路设备的线宽参数迁移
// （旧默认 7 → 现默认 4）。此前零断言。
// 判错不抛异常：只是线宽画得粗一点或细一点，导出 SVG 后才看得出差异。
//
// 11 处变异逐条跑过，10 处转红。1 处 NOT-CAUGHT 经论证为**源码等价**，不算本文件覆盖了它：
// `Number(lineWidth ?? "")` → `Number(lineWidth)`：lineWidth 为 undefined 时前者得 0、后者得 NaN，
// 但守卫是 `lineWidth && ...`，undefined 本就短路走不到比较那一步，两条路径结果一致。
import { describe, expect, test } from "vitest";

import { normalizeRoutableLineDeviceStrokeWidthParam } from "./model";
import type { ModelNode } from "./model";

type Params = Record<string, string | number>;

const node = (kind: string, params: Params = {}): ModelNode =>
  ({
    id: "n1",
    kind,
    name: "n1",
    nodeNumber: "n1",
    position: { x: 0, y: 0 },
    size: { width: 100, height: 100 },
    rotation: 0,
    scale: 1,
    terminals: [],
    params
  }) as unknown as ModelNode;

const paramsOf = (result: ModelNode): Params => result.params as Params;

const ROUTABLE_KINDS = [
  "ac-routable-line",
  "ac-zero-routable-branch",
  "dc-routable-line",
  "dc-zero-routable-branch",
  "hydrogen-routable-pipeline",
  "heat-routable-line"
];

describe("normalizeRoutableLineDeviceStrokeWidthParam：适用范围", () => {
  test("★ 非可布线 kind 原样返回**同一引用**", () => {
    for (const kind of ["ac-line", "ac-switch", "heat-line", "dc-line"]) {
      const input = node(kind, { line_width: "7" });
      expect(normalizeRoutableLineDeviceStrokeWidthParam(input), kind).toBe(input);
    }
  });

  test("六种可布线 kind 全部参与迁移（统一补成 4）", () => {
    for (const kind of ROUTABLE_KINDS) {
      expect(paramsOf(normalizeRoutableLineDeviceStrokeWidthParam(node(kind))).line_width, kind).toBe("4");
    }
  });

  test("带 -vertical 后缀的变体按 baseDeviceKind 归一后同样命中", () => {
    const result = normalizeRoutableLineDeviceStrokeWidthParam(node("ac-routable-line-vertical", { line_width: "7" }));
    expect(paramsOf(result).line_width).toBe("4");
  });
});

describe("normalizeRoutableLineDeviceStrokeWidthParam：什么时候被改写", () => {
  test("没写 / 写成空串 → 补成 4", () => {
    expect(paramsOf(normalizeRoutableLineDeviceStrokeWidthParam(node("ac-routable-line"))).line_width).toBe("4");
    expect(
      paramsOf(normalizeRoutableLineDeviceStrokeWidthParam(node("ac-routable-line", { line_width: "" }))).line_width
    ).toBe("4");
  });

  test("★ 旧默认 7 → 改写成 4（数字型 7 同样命中）", () => {
    expect(
      paramsOf(normalizeRoutableLineDeviceStrokeWidthParam(node("ac-routable-line", { line_width: "7" }))).line_width
    ).toBe("4");
    expect(
      paramsOf(normalizeRoutableLineDeviceStrokeWidthParam(node("ac-routable-line", { line_width: 7 }))).line_width
    ).toBe("4");
  });

  test("其余取值一律保留，且原样返回同一引用", () => {
    for (const line_width of ["4", "9", "0", "2.5", "-7", "abc"]) {
      const input = node("ac-routable-line", { line_width });
      const result = normalizeRoutableLineDeviceStrokeWidthParam(input);
      expect(paramsOf(result).line_width, line_width).toBe(line_width);
      expect(result, line_width).toBe(input);
    }
  });

  test("入参不被改（迁移走副本）", () => {
    const original = { line_width: "7" };
    normalizeRoutableLineDeviceStrokeWidthParam(node("ac-routable-line", original));
    expect(original).toEqual({ line_width: "7" });
  });

  test("改写只动 line_width，其余参数原样带过", () => {
    const result = normalizeRoutableLineDeviceStrokeWidthParam(
      node("ac-routable-line", { line_width: "7", from_node: "a", to_node: "b" })
    );
    expect(paramsOf(result)).toEqual({ line_width: "4", from_node: "a", to_node: "b" });
  });
});

describe("normalizeRoutableLineDeviceStrokeWidthParam：驼峰键的不对称", () => {
  test("驼峰 lineWidth=7 → 补出本名 line_width=4，驼峰那个键留着", () => {
    const result = normalizeRoutableLineDeviceStrokeWidthParam(node("ac-routable-line", { lineWidth: "7" }));
    expect(paramsOf(result)).toEqual({ lineWidth: "7", line_width: "4" });
  });

  test("★ 驼峰 lineWidth=9 读得到却**不**补本名键（短路在补键之前）", () => {
    const input = node("ac-routable-line", { lineWidth: "9" });
    const result = normalizeRoutableLineDeviceStrokeWidthParam(input);
    expect(paramsOf(result)).toEqual({ lineWidth: "9" });
    expect(result).toBe(input);
  });
});
