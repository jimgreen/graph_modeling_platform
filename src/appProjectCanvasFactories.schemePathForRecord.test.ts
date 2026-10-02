// 方案层级路径与模型图层默认命名。
// 两者都是「找第一个没被占用的默认名」：方案回落到 [名字]，图层从 1 递增。
import { describe, expect, test, vi } from "vitest";

import {
  createNextDefaultModelLayerName,
  createSchemePathForRecord
} from "./appExtracted/appProjectCanvasFactories";

describe("createSchemePathForRecord", () => {
  const build = (path: string[]) =>
    createSchemePathForRecord({ schemePathForScheme: vi.fn(() => path) });

  test("有层级路径时原样返回", () => {
    expect(build(["父方案", "子方案"])({ id: "s2", name: "子方案" } as any)).toEqual(["父方案", "子方案"]);
  });

  test("顶层方案回落到单元素路径", () => {
    expect(build([])({ id: "s1", name: "顶层" } as any)).toEqual(["顶层"]);
  });

  test("按方案 id 查询路径", () => {
    const schemePathForScheme = vi.fn(() => ["父"]);
    const scheme = { id: "s9", name: "子" };

    createSchemePathForRecord({ schemePathForScheme })(scheme as any);

    expect(schemePathForScheme).toHaveBeenCalledWith("s9");
  });
});

describe("createNextDefaultModelLayerName", () => {
  test("没有图层时返回「图层1」", () => {
    expect(createNextDefaultModelLayerName({ layers: [] })()).toBe("图层1");
  });

  test("跳过已占用的序号", () => {
    expect(createNextDefaultModelLayerName({ layers: [{ name: "图层1" }] })()).toBe("图层2");
  });

  test("序号不连续时取最小可用值", () => {
    expect(createNextDefaultModelLayerName({ layers: [{ name: "图层1" }, { name: "图层3" }] })()).toBe("图层2");
  });

  test("名称两侧空白被去重（避免「 图层1 」占不掉「图层1」）", () => {
    expect(createNextDefaultModelLayerName({ layers: [{ name: " 图层1 " }] })()).toBe("图层2");
  });

  test("同名图层出现多次不影响结果", () => {
    expect(createNextDefaultModelLayerName({ layers: [{ name: "图层1" }, { name: "图层1" }] })()).toBe("图层2");
  });

  test("自定义名称不参与占用计数", () => {
    expect(createNextDefaultModelLayerName({ layers: [{ name: "我的图层" }] })()).toBe("图层1");
  });
});
