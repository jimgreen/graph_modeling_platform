// src/export/static-button-targets.ts 的单测 —— 此前零覆盖。
//
// 它是「静态按钮图层目标解析」的唯一定义（原 .tsx 侧的实现在 Task 13 迁出，
// 只留转发），且被 Node 直载（server 经 src/export/* 走原生 TS）。
//
// 解析函数要兼容三种历史存储形态：JSON 数组字符串、分隔符串、以及单值 legacy 字段；
// 再叠加「id 优先、name 兜底、去重、找不到就跳过」的解析规则 —— 任何一处退化都
// 会表现为「按钮不再跳转到目标图层」，且不会报错，只能靠肉眼发现。
import { describe, expect, test } from "vitest";
import {
  parseStaticButtonTargetLayerValues,
  resolveStaticButtonTargetLayers
} from "./static-button-targets";
import type { ModelLayer, ModelNode } from "../model";

const layer = (id: string, name: string): ModelLayer =>
  ({ id, name, visible: true, locked: false } as unknown as ModelLayer);

const node = (params: Record<string, unknown>): ModelNode =>
  ({ id: "btn1", kind: "static-button", params } as unknown as ModelNode);

describe("parseStaticButtonTargetLayerValues", () => {
  test("空值返回空数组", () => {
    expect(parseStaticButtonTargetLayerValues(undefined)).toEqual([]);
    expect(parseStaticButtonTargetLayerValues("")).toEqual([]);
    expect(parseStaticButtonTargetLayerValues("   ")).toEqual([]);
  });

  test("JSON 数组字符串被解析", () => {
    expect(parseStaticButtonTargetLayerValues('["L1","L2"]')).toEqual(["L1", "L2"]);
  });

  test("JSON 里的空串与重复项被过滤去重", () => {
    expect(parseStaticButtonTargetLayerValues('["L1","","L1","  L2  "]')).toEqual(["L1", "L2"]);
  });

  test("分隔符串（逗号/换行/分号/竖线）都能拆", () => {
    expect(parseStaticButtonTargetLayerValues("L1,L2")).toEqual(["L1", "L2"]);
    expect(parseStaticButtonTargetLayerValues("L1;L2")).toEqual(["L1", "L2"]);
    expect(parseStaticButtonTargetLayerValues("L1|L2")).toEqual(["L1", "L2"]);
    expect(parseStaticButtonTargetLayerValues("L1\nL2")).toEqual(["L1", "L2"]);
  });

  test("非法的 JSON 前缀回落到分隔符解析（不抛错）", () => {
    // 形如 "[L1,L2]"：以 [ 开头但 JSON.parse 失败，应按分隔符拆而不是整个当一个字面量
    expect(parseStaticButtonTargetLayerValues("[L1,L2]")).toEqual(["[L1", "L2]"]);
  });

  test("单个值原样返回", () => {
    expect(parseStaticButtonTargetLayerValues("L1")).toEqual(["L1"]);
  });
});

describe("resolveStaticButtonTargetLayers", () => {
  const layers = [layer("L1", "底层"), layer("L2", "中层"), layer("L3", "上层")];

  test("按 id 解析出图层", () => {
    const result = resolveStaticButtonTargetLayers(node({ buttonTargetLayerIds: '["L1","L3"]' }), layers);
    expect(result.map((l) => l.id)).toEqual(["L1", "L3"]);
  });

  test("按 name 解析出图层", () => {
    const result = resolveStaticButtonTargetLayers(node({ buttonTargetLayerNames: '["中层"]' }), layers);
    expect(result.map((l) => l.id)).toEqual(["L2"]);
  });

  test("id 与 name 同时存在时两者都解析并去重", () => {
    const result = resolveStaticButtonTargetLayers(
      node({ buttonTargetLayerIds: '["L1"]', buttonTargetLayerNames: '["底层"]' }),
      layers
    );
    // 同一个图层被 id 与 name 各命中一次 → 只保留一份
    expect(result.map((l) => l.id)).toEqual(["L1"]);
  });

  test("legacy 单值字段在无新字段时生效", () => {
    const byId = resolveStaticButtonTargetLayers(node({ buttonTargetLayerId: "L2" }), layers);
    expect(byId.map((l) => l.id)).toEqual(["L2"]);
    const byName = resolveStaticButtonTargetLayers(node({ buttonTargetLayerName: "上层" }), layers);
    expect(byName.map((l) => l.id)).toEqual(["L3"]);
  });

  test("新字段非空时优先于 legacy（旧值被忽略）", () => {
    const result = resolveStaticButtonTargetLayers(
      node({ buttonTargetLayerIds: '["L1"]', buttonTargetLayerId: "L3" }),
      layers
    );
    expect(result.map((l) => l.id)).toEqual(["L1"]);
  });

  test("指向不存在的图层被跳过，不抛错", () => {
    const result = resolveStaticButtonTargetLayers(
      node({ buttonTargetLayerIds: '["不存在","L2"]' }),
      layers
    );
    expect(result.map((l) => l.id)).toEqual(["L2"]);
  });

  test("没有任何目标配置时返回空数组（不选图层，而不是全选）", () => {
    expect(resolveStaticButtonTargetLayers(node({}), layers)).toEqual([]);
  });

  test("可传 undefined 形式的参数值（不抛错）", () => {
    const result = resolveStaticButtonTargetLayers(
      node({ buttonTargetLayerIds: undefined, buttonTargetLayerNames: null }),
      layers
    );
    expect(result).toEqual([]);
  });
});
