// model.ts 的三个静态图元判定函数直测 —— isStaticBoxLikeTemplate 此前 0 调用
// （在既有测试里只以 `vi.fn(() => false)` 的形式被 mock 过一次，从未真跑）。
//
// ## 覆盖的是什么
//
// 三者共用一条链：`staticComponentLibraryFromParams(params)` 优先，
// 否则查 kind 映射表 STATIC_COMPONENT_LIBRARY_BY_KIND。表里 9 个库名，
// 但判定的**结果**只分三类：
//   - 非空且不是 StaticConnectorSymbol → 「盒子类」
//   - StaticConnectorSymbol（线/连接器）→ 不是盒子
//   - 空（非静态 kind）→ 不是盒子
// 外加两条特例短路：static-point / static-ring 虽然同属 StaticBasicShape，
// 却被显式排除（点是零尺寸，盒子判定不该把它算进去）。
import { describe, expect, test } from "vitest";

import {
  isStaticBoxLikeTemplate,
  isStaticButtonCapableKind,
  isStaticButtonCapableNode,
  staticComponentLibraryForNodeLike
} from "./model";

// params 必须是 Record 而非可选 —— isStaticBoxLikeTemplate 的签名是
// Pick<DeviceTemplate, "kind" | "params">，params 非可选。缺省给空对象即可：
// staticComponentLibraryFromParams({}) 与 (undefined) 都得到空串。
const template = (kind: string, params: Record<string, string> = {}) => ({ kind, params });

describe("isStaticBoxLikeTemplate", () => {
  test("★ static-point / static-ring 是 StaticBasicShape 却被显式排除", () => {
    // 两者映射到 StaticBasicShape，但同一库里 static-circle/rect 判 true —— 这条
    // 短路正是「点不该按包围盒参与盒子类逻辑」的意思。
    expect(staticComponentLibraryForNodeLike("static-point")).toBe("StaticBasicShape");
    expect(staticComponentLibraryForNodeLike("static-ring")).toBe("StaticBasicShape");
    expect(isStaticBoxLikeTemplate(template("static-point"))).toBe(false);
    expect(isStaticBoxLikeTemplate(template("static-ring"))).toBe(false);
  });

  test("基本形状 / 流节点 / 文本 / 媒体都算盒子类", () => {
    for (const kind of [
      "static-circle",
      "static-ellipse",
      "static-rect",
      "static-hexagon",
      "static-parallelogram",
      "static-triangle",
      "static-default-node",
      "static-card-node",
      "static-toolbar-node",
      "static-text",
      "static-image"
    ]) {
      expect(isStaticBoxLikeTemplate(template(kind)), kind).toBe(true);
    }
  });

  test("★ 连接器一律不算（库名是 StaticConnectorSymbol）", () => {
    for (const kind of [
      "static-line",
      "static-polyline",
      "static-straight-connector",
      "static-arrow-connector",
      "static-elbow-connector",
      "static-bezier-connector",
      "static-smoothstep-connector",
      "static-self-loop"
    ]) {
      expect(staticComponentLibraryForNodeLike(kind), kind).toBe("StaticConnectorSymbol");
      expect(isStaticBoxLikeTemplate(template(kind)), kind).toBe(false);
    }
  });

  test("非静态 kind（无库名）不算盒子类", () => {
    expect(isStaticBoxLikeTemplate(template("ac-load"))).toBe(false);
    expect(isStaticBoxLikeTemplate(template("hydrogen-pipeline"))).toBe(false);
  });

  test("★ params 里的 component_type 压过 kind 映射（同一个 kind 两种结论）", () => {
    // 取值键是 component_type / componentLibrary / componentType 三级回落
    // （**没有** component_library —— 写 snake_case 会被静默忽略）
    expect(isStaticBoxLikeTemplate(template("static-text"))).toBe(true);
    expect(
      isStaticBoxLikeTemplate(template("static-text", { component_type: "StaticConnectorSymbol" }))
    ).toBe(false);
    expect(isStaticBoxLikeTemplate(template("static-text", { component_type: "StaticButton" }))).toBe(true);
    // 未被识别的键名不参与判定
    expect(
      isStaticBoxLikeTemplate(template("static-text", { component_library: "StaticConnectorSymbol" }))
    ).toBe(true);
  });

  test("params.componentLibrary 与 componentType 同样能改判（三级回落的第二、三级）", () => {
    expect(isStaticBoxLikeTemplate(template("static-line", { component_type: "StaticBasicShape" }))).toBe(true);
    expect(isStaticBoxLikeTemplate(template("static-line", { componentType: "StaticConnectorSymbol" }))).toBe(false);
  });

  test("非法库名被忽略、回落 kind 映射（不是判成盒子）", () => {
    expect(
      isStaticBoxLikeTemplate(template("static-line", { component_type: "并不存在的库" }))
    ).toBe(false);
  });

  test("竖装 kind 归一到 baseKind 后再判定", () => {
    expect(staticComponentLibraryForNodeLike("static-rect-vertical")).toBe(
      staticComponentLibraryForNodeLike("static-rect")
    );
    expect(isStaticBoxLikeTemplate(template("static-rect-vertical"))).toBe(true);
  });
});

describe("isStaticButtonCapableKind", () => {
  test("静态按钮本体可加按钮", () => {
    expect(isStaticButtonCapableKind("static-button")).toBe(true);
  });

  test("★ 线类连接器不可加按钮（isStaticLineLikeKind 排除）", () => {
    expect(isStaticButtonCapableKind("static-line")).toBe(false);
    expect(isStaticButtonCapableKind("static-polyline")).toBe(false);
    expect(isStaticButtonCapableKind("static-elbow-connector")).toBe(false);
  });

  test("非静态 kind 不可加按钮", () => {
    expect(isStaticButtonCapableKind("ac-load")).toBe(false);
  });

  test("其它静态图元可加按钮（靠 isStaticKind && !line-like 这条兜底）", () => {
    expect(isStaticButtonCapableKind("static-rect")).toBe(true);
    expect(isStaticButtonCapableKind("static-text")).toBe(true);
  });
});

describe("isStaticButtonCapableNode", () => {
  test("kind 可加按钮即可（不要求 params 有库名）", () => {
    expect(isStaticButtonCapableNode({ kind: "static-rect", params: {} })).toBe(true);
  });

  test("★ kind 不可加但 params 指定 StaticButton 库时仍可加", () => {
    expect(isStaticButtonCapableNode({ kind: "static-line", params: {} })).toBe(false);
    expect(
      isStaticButtonCapableNode({ kind: "static-line", params: { component_type: "StaticButton" } })
    ).toBe(true);
  });

  test("非静态 kind + 无按钮库 → 不可加", () => {
    expect(isStaticButtonCapableNode({ kind: "ac-load", params: {} })).toBe(false);
  });
});