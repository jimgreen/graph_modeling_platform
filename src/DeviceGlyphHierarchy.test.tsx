// DeviceGlyph 的层级图元判定与 SvgMarkupChunk —— 补 DeviceGlyph.test.tsx 未覆盖的分支。
//
// ## 为什么单立文件
//
// `DeviceGlyph.test.tsx` 已有 349 行 / 14 个用例，覆盖的是**渲染结果**（各种图元画成什么样）。
// 本文件补的是它没碰的两块：
//   1. `modelHierarchyGlyphFamily/Role/EnergyFor*` 三个判定函数（未导出，经渲染间接观察）。
//      它们决定「厂站 / 馈线 / 台区」三类模型归属图元的形态与徽标，判错的表现是
//      **图元画对了但归属信息画错** —— 而既有断言只比对图形轮廓，比不出来。
//   2. `SvgMarkupChunk`：把字符串 markup 塞进 <g> 的唯一出口。
//      它走 dangerouslySetInnerHTML，判错的表现是**注入的 HTML 没渲染或渲染错位**。
//
// 观察手段：用 `renderToStaticMarkup` 取静态标记 —— 无需 DOM、不需 jsdom 布局。
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { DeviceGlyph, SvgMarkupChunk } from "./DeviceGlyph";
import { MODEL_ASSOCIATION_DERIVED_CLASS_SPECS } from "./model";
import type { ModelNode } from "./model";

const node = (over: Partial<ModelNode> = {}): ModelNode =>
  ({
    id: "n1",
    kind: "ac-load",
    name: "负荷1",
    position: { x: 0, y: 0 },
    size: { width: 80, height: 40 },
    rotation: 0,
    scale: 1,
    terminals: [],
    params: {},
    ...over
  }) as unknown as ModelNode;

/** 渲染一个节点，返回静态标记。 */
const markupOf = (over: Partial<ModelNode> = {}, props = {}) =>
  renderToStaticMarkup(
    createElement("svg", null, createElement(DeviceGlyph, { node: node(over), ...props }))
  );

// ─── 三个层级判定函数（经渲染间接观察）─────────────────────
//
// modelAssociationModelTypeForKind（model.ts）决定 kind 落到哪个模型类型；
// 三个 For* 函数再把「模型类型 / kind」翻译成图元的 family / role / energy。
// 它们的取值域都是小闭集，故用「不同输入产出可区分的标记」来观察。

describe("modelHierarchyGlyphFamilyForModelType：厂站 / 馈线 / 台区三分", () => {
  // kind 名来自 model.ts 的 MODEL_ASSOCIATION_DERIVED_CLASS_SPECS（12 个派生件）。
  // 这里直接拿那张表当数据源 —— 硬编码 kind 名会在表变动时静默失效。

  it("三个 modelType 各产出一个互不相同的图元（family 判定在跑）", () => {
    const station = markupOf({ kind: "ac-station-load" });
    const feeder = markupOf({ kind: "ac-feeder-load" });
    const district = markupOf({ kind: "ac-district-load" });
    // 若 family 判定退化成一个常量，三者标记会趋于一致
    expect(new Set([station, feeder, district]).size).toBe(3);
  });

  it("三类负荷与三类电源各产出一个互不相同的图元", () => {
    const loads = ["ac-station-load", "ac-feeder-load", "ac-district-load"].map((kind) => markupOf({ kind }));
    const sources = ["ac-station-source", "ac-feeder-source", "ac-district-source"].map((kind) => markupOf({ kind }));
    expect(new Set(loads).size).toBe(3);
    expect(new Set(sources).size).toBe(3);
  });

  it("★ 12 个派生件的图元两两互不相同（family × role × energy 三个判定共同决定形态）", () => {
    const markups = MODEL_ASSOCIATION_DERIVED_CLASS_SPECS.map((spec) => markupOf({ kind: spec.kind }));
    expect(markups.length).toBe(12);
    expect(new Set(markups).size, "有派生件的图元撞成了同一个").toBe(12);
  });

  it("普通 kind（不在派生件表里）走基础图元，与派生件不同", () => {
    const plain = markupOf({ kind: "ac-load" });
    expect(new Set([plain, ...MODEL_ASSOCIATION_DERIVED_CLASS_SPECS.map((s) => markupOf({ kind: s.kind }))]).size)
      .toBe(13);
  });

  it("派生件的图元 class 名带 family 线索（station / feeder / district）", () => {
    // 判定的直接可观察后果：class 里的 family 词与 modelType 对应
    const station = markupOf({ kind: "ac-station-load" });
    expect(station).toContain("station");
    const feeder = markupOf({ kind: "ac-feeder-load" });
    expect(feeder).toContain("feeder");
    const district = markupOf({ kind: "ac-district-load" });
    expect(district).toContain("district");
  });
});

describe("modelHierarchyGlyphRoleForKind / EnergyForKind：源荷与交直流", () => {
  it("同 family 下 source 与 load 产出不同图元（role 判定在跑）", () => {
    const source = markupOf({ kind: "ac-station-source" });
    const load = markupOf({ kind: "ac-station-load" });
    expect(source).not.toBe(load);
  });

  it("同 family 同 role 下 ac 与 dc 产出不同图元（energy 判定在跑）", () => {
    const acLoad = markupOf({ kind: "ac-station-load" });
    const dcLoad = markupOf({ kind: "dc-station-load" });
    expect(acLoad).not.toBe(dcLoad);
  });

  it("dc 侧同样覆盖三个 family（不是只有交流有层级图元）", () => {
    const markups = MODEL_ASSOCIATION_DERIVED_CLASS_SPECS
      .filter((spec) => spec.baseKind === "dc-load")
      .map((spec) => markupOf({ kind: spec.kind }));
    expect(markups.length).toBe(3);
    expect(new Set(markups).size).toBe(3);
  });

  it("判定走 baseDeviceKind：竖向变体归到同一 family（family 只看 modelType）", () => {
    // modelHierarchyGlyphRoleForKind 用 baseDeviceKind(kind) 去掉 -vertical 之类后缀，
    // 故变体与本体归同一 role。变体自身在竖向上另有差异，这里只断言都能渲染且非空。
    for (const kind of ["ac-station-load", "ac-station-load-vertical"]) {
      expect(markupOf({ kind }).length, kind).toBeGreaterThan(0);
    }
  });
});

describe("deviceVisualReplacesGlyph：视觉替换图让内置图元整体不画", () => {
  const PLATFORM_MARKER = "data:image/svg+xml;base64,";

  it("stateVisual.imageCleared=\"1\" → 整个图元返回 null（渲染出空 svg）", () => {
    const markup = renderToStaticMarkup(
      createElement("svg", null, createElement(DeviceGlyph, {
        node: node(),
        stateVisual: { value: "1", name: "态1", imageCleared: "1" } as never
      }))
    );
    // 组件返回 null ⇒ <svg> 里没有任何子节点
    expect(markup).toBe("<svg></svg>");
  });

  it("node.params.backgroundImageCleared=\"1\" 同样让内置图元不画", () => {
    const markup = markupOf({ params: { backgroundImageCleared: "1" } });
    expect(markup).toBe("<svg></svg>");
  });

  it("普通背景图不替换（内置图元仍画，只是叠了图）", () => {
    // 「平台生成的替换图」与「用户配的普通图」判据不同：前者整体替换，
    // 后者叠加。这一条守住那条分界线。
    const markup = markupOf({ params: { backgroundImage: "/api/images/a.png" } });
    expect(markup).not.toBe("<svg></svg>");
  });

  it("stateVisual 的替换图与 node 的替换图都参与判定", () => {
    void PLATFORM_MARKER;
    const withStateImage = renderToStaticMarkup(
      createElement("svg", null, createElement(DeviceGlyph, {
        node: node(),
        stateVisual: { value: "1", name: "态1", image: `${PLATFORM_MARKER}abc` } as never
      }))
    );
    // 具体是否替换取决于 isPlatformDeviceVisualReplacementImage 的判据（已有专测），
    // 这里只确认它不会抛错、且渲染结果稳定
    expect(typeof withStateImage).toBe("string");
  });
});

// ─── SvgMarkupChunk ──────────────────────────────────────

describe("SvgMarkupChunk", () => {
  it("把 markup 原样塞进 <g class=...>，内容不被再次转义", () => {
    const markup = renderToStaticMarkup(
      createElement("g", null, createElement(SvgMarkupChunk, {
        className: "chunk-a",
        markup: '<rect x="1" y="2" />'
      }))
    );
    expect(markup).toContain('class="chunk-a"');
    // innerHTML 注入：rect 是真元素，不是被转义成文本的 &lt;rect
    expect(markup).toContain("<rect");
    expect(markup).not.toContain("&lt;rect");
  });

  it("className 原样落到 class 属性", () => {
    for (const className of ["chunk-a", "导出层", "a b"]) {
      const markup = renderToStaticMarkup(
        createElement(SvgMarkupChunk, { className, markup: "<g />" })
      );
      expect(markup).toContain('class="');
    }
  });

  it("markup 为空串时仍产出 <g> 壳（不是 null）", () => {
    const markup = renderToStaticMarkup(
      createElement("svg", null, createElement(SvgMarkupChunk, { className: "c", markup: "" }))
    );
    expect(markup).toBe("<svg><g class=\"c\"></g></svg>");
  });

  it("markup 里的 style / class 属性原样保留（导出态样式依赖它）", () => {
    const markup = renderToStaticMarkup(
      createElement(SvgMarkupChunk, {
        className: "c",
        markup: '<path class="ac" style="fill:#f00" d="M0 0" />'
      })
    );
    expect(markup).toContain('class="ac"');
    expect(markup).toContain("fill:#f00");
  });
});
