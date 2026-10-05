// stateIconDrawingElementPreviewImage 直测。
//
// 为什么单独开一个文件：stateIconDrawing.test.ts 里 3 处命中（742 / 1719 / 1833 行）
// 全是 `vi.mock` 出来的假对象（`() => ({ href: "", x: 0, ... })` / `() => null`），
// 真实实现**从未被调用过**。也就是说这个函数虽然被 appDeviceDefinitionRenderers.tsx
// 的 1131 / 2069 两处量尺寸逻辑依赖，它的 padding 与坐标系却没有任何断言护着。
//
// 本文件不 mock 任何东西，直呼 src/stateIconDrawing.tsx 的真实导出。
//
// ## 契约（照抄 src/stateIconDrawing.tsx:2518-2538，未做任何推断）
//
//   const w       = Math.max(1, element.width);
//   const h       = Math.max(1, element.height);
//   const padding = Math.max(18, Math.max(0, element.strokeWidth) * 3);
//   const svgWidth  = w + padding * 2;
//   const svgHeight = h + padding * 2;
//   return { href, x: -w / 2 - padding, y: -h / 2 - padding, width: svgWidth, height: svgHeight };
//
// 关键点（都容易凭直觉写错，故在此记下）：
//   · x / y 除的是**原始** w / h（不是 svgWidth），但因 svgWidth = w + 2*padding，
//     -w/2 - padding 与 -svgWidth/2 **恒等**。下面两条都断言，是为了让「写法变了但
//     结果没变」和「坐标系真的错了」能被区分开。
//   · padding 的下界 18 与 3×描边宽在 strokeWidth = 6 处相交（6×3 = 18），
//     故分界用例取 5 与 7。
//   · width / height 先经 Math.max(1, …) 钳位，0 与负数都当 1 处理。
import { describe, expect, test } from "vitest";

import {
  createStateIconDrawingElement,
  stateIconDrawingElementPreviewImage,
  type StateIconDrawingElement
} from "./stateIconDrawing";

/** 只保留被测函数真正读取的字段，避免夹具自己变成噪声源。 */
function makeElement(overrides: Partial<StateIconDrawingElement> = {}): StateIconDrawingElement {
  return {
    id: "el-1",
    kind: "rectangle",
    x: 0,
    y: 0,
    width: 100,
    height: 60,
    rotation: 45,
    strokeWidth: 0,
    strokeColor: "#111827",
    fillColor: "transparent",
    textColor: "#111827",
    text: "",
    ...overrides
  };
}

/** padding 没有单独返回，只能由 width 反解：width = w + 2×padding。 */
function paddingOf(element: StateIconDrawingElement) {
  const result = stateIconDrawingElementPreviewImage(element);
  const w = Math.max(1, element.width);
  return (result.width - w) / 2;
}

/** href 是 encodeURIComponent 过的 data URL，量尺寸要看里面的 svg 根标签。 */
function rootSvgTag(href: string) {
  expect(href.startsWith("data:image/svg+xml;utf8,")).toBe(true);
  const svg = decodeURIComponent(href.slice("data:image/svg+xml;utf8,".length));
  expect(svg.startsWith("<svg ")).toBe(true);
  return { svg, rootTag: svg.slice(0, svg.indexOf(">") + 1) };
}

describe("stateIconDrawingElementPreviewImage 的 padding", () => {
  test("描边宽为 0 时 padding 落在下界 18", () => {
    // 0 × 3 = 0 < 18 ⇒ 取下界。断言的是 padding 本身，不只是 width。
    expect(paddingOf(makeElement({ strokeWidth: 0 }))).toBe(18);
  });

  test("描边宽为 20 时 padding 取描边宽的三倍", () => {
    // 20 × 3 = 60 > 18 ⇒ 走 3 倍分支。两个极端各测一端，
    // 若把 Math.max 换成二选一（只留 18 或只留 3 倍），本文件必红。
    expect(paddingOf(makeElement({ strokeWidth: 20 }))).toBe(60);
  });

  test("下界 18 与三倍描边宽在描边宽 6 处相交", () => {
    // 5×3 = 15 < 18 ⇒ 18；7×3 = 21 > 18 ⇒ 21。
    // 这一条专盯交点位置：把 18 改成别的常数，或把倍数 3 改成 2，分界就会漂移。
    expect(paddingOf(makeElement({ strokeWidth: 5 }))).toBe(18);
    expect(paddingOf(makeElement({ strokeWidth: 6 }))).toBe(18);
    expect(paddingOf(makeElement({ strokeWidth: 7 }))).toBe(21);
  });

  test("负描边宽先归零，padding 仍取下界 18", () => {
    // padding 这一行里嵌套着 Math.max(0, strokeWidth)。诚实说明：
    // 去掉它**在本文件里观察不到**——负数乘 3 必为负，再被外层 max(18, …) 兜成 18，
    // 两条路径结果相同（等价变异）。内层钳位真正承重的地方是 stroke-width 属性，
    // 而那处由 stateIconDrawingElementMarkup 自己独立钳，不归本函数管。
    // 保留本用例是为了锁住这个事实：将来若有人改 padding 的下界，它会立刻红。
    expect(paddingOf(makeElement({ strokeWidth: -5 }))).toBe(18);
  });
});

describe("stateIconDrawingElementPreviewImage 的返回尺寸与坐标系", () => {
  test("宽高各等于原宽高加两侧 padding", () => {
    const element = makeElement({ width: 100, height: 60, strokeWidth: 0 });
    const result = stateIconDrawingElementPreviewImage(element);
    expect(paddingOf(element)).toBe(18);
    expect(result.width).toBe(100 + 18 * 2);
    expect(result.height).toBe(60 + 18 * 2);
  });

  test("宽高为 0 或负数时先钳到 1 再加两侧 padding", () => {
    // 缺这一条的话，把 Math.max(1, …) 删掉（全用原值）不会被发现：
    // width=0 时 svgWidth 会从 37 变成 36。
    const zero = stateIconDrawingElementPreviewImage(makeElement({ width: 0, height: 0, strokeWidth: 0 }));
    expect(zero.width).toBe(1 + 18 * 2);
    expect(zero.height).toBe(1 + 18 * 2);

    const negative = stateIconDrawingElementPreviewImage(
      makeElement({ width: -10, height: -20, strokeWidth: 0 })
    );
    expect(negative.width).toBe(1 + 18 * 2);
    expect(negative.height).toBe(1 + 18 * 2);
  });

  test("原点落在元素中心偏左上，x 与 y 为负的半宽半高再加 padding", () => {
    const element = makeElement({ width: 100, height: 60, strokeWidth: 20 });
    const result = stateIconDrawingElementPreviewImage(element);
    // padding = 60 ⇒ svgWidth = 220、svgHeight = 180。
    // 源码写的是 -w/2 - padding（除的是原始宽高，不是最终宽高）。
    expect(result.x).toBe(-(100 / 2) - 60);
    expect(result.y).toBe(-(60 / 2) - 60);
    // 因 svgWidth = w + 2×padding，两种写法恒等；一并断言以证明坐标系居中没跑偏。
    expect(result.x).toBe(-result.width / 2);
    expect(result.y).toBe(-result.height / 2);
  });

  test("元素的原始 x y rotation 不影响预览坐标系", () => {
    // previewElement 把 x / y 重设为 padding + 半宽、rotation 归零，
    // 否则预览图会带着画布上的位移和倾斜。加这句是防止有人漏掉这层重置。
    const moved = stateIconDrawingElementPreviewImage(
      makeElement({ x: 300, y: -120, rotation: 30, width: 80, height: 40, strokeWidth: 0 })
    );
    const origin = stateIconDrawingElementPreviewImage(
      makeElement({ x: 0, y: 0, rotation: 0, width: 80, height: 40, strokeWidth: 0 })
    );
    expect(moved).toEqual(origin);
    expect(moved.x).toBe(-(80 / 2) - 18);
    expect(moved.y).toBe(-(40 / 2) - 18);
  });
});

describe("stateIconDrawingElementPreviewImage 的 href", () => {
  test("href 是 data URL，且内嵌 svg 的尺寸与 viewBox 与返回值一致", () => {
    // 不只看前缀：padding 若漏进 svg 根标签，画布上就会出现 18px 的透明边。
    const element = makeElement({ width: 100, height: 60, strokeWidth: 0 });
    const result = stateIconDrawingElementPreviewImage(element);
    const { rootTag } = rootSvgTag(result.href);

    expect(rootTag).toContain('width="136"');
    expect(rootTag).toContain('height="96"');
    expect(rootTag).toContain('viewBox="0 0 136 96"');
    expect(result.width).toBe(136);
    expect(result.height).toBe(96);
  });

  test("描边宽变化时内嵌 svg 的尺寸跟着 padding 一起变", () => {
    const thin = stateIconDrawingElementPreviewImage(makeElement({ strokeWidth: 0 }));
    const thick = stateIconDrawingElementPreviewImage(makeElement({ strokeWidth: 20 }));

    expect(rootSvgTag(thin.href).rootTag).toContain('viewBox="0 0 136 96"');
    expect(rootSvgTag(thick.href).rootTag).toContain('viewBox="0 0 220 180"');
    expect(thick.width).toBeGreaterThan(thin.width);
    expect(thick.height).toBeGreaterThan(thin.height);
  });

  test("工厂造出的默认元素同样走同一套 padding 规则", () => {
    // 默认元素 strokeWidth = 6 ⇒ 6×3 = 18 = 下界，两分支恰在交点，
    // 顺带确认没有依赖夹具里那些手填字段。
    const element = createStateIconDrawingElement("rectangle");
    expect(element.strokeWidth).toBe(6);
    expect(paddingOf(element)).toBe(18);
    expect(stateIconDrawingElementPreviewImage(element).width).toBe(element.width + 36);
  });
});

describe("stateIconDrawingElementPreviewImage 的返回值形状", () => {
  test("只返回 href x y width height 五个字段，且没有 undefined 值", () => {
    // 返回对象是直接喂给画布 <image> 的，多余字段（哪怕值是 undefined）
    // 都会变成无效属性。断言精确键集比逐个 toBeDefined 更严：
    // 键集一旦多出 spread 进来的元素字段就会红。
    const result = stateIconDrawingElementPreviewImage(
      makeElement({ width: 100, height: 60, strokeWidth: 20 })
    );
    expect(Object.keys(result).sort()).toEqual(["height", "href", "width", "x", "y"]);

    for (const [key, value] of Object.entries(result)) {
      expect(value, `字段 ${key} 不该是 undefined`).toBeDefined();
      expect(value, `字段 ${key} 不该是 null`).not.toBeNull();
      if (key !== "href") {
        expect(Number.isFinite(value as number), `字段 ${key} 应为有限数`).toBe(true);
      }
    }
    expect(typeof result.href).toBe("string");
  });
});