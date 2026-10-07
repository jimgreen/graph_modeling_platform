// 导入 SVG 元素的选择框：按 SVG 自身 viewBox 等比缩放到元素尺寸并居中。
// 缩放取「两轴较小者」（contain），不是拉伸 —— 拉伸会让选择框和图形对不上。
// 三个返回 null 的前置条件也都要钉住，否则退化成一个 0×0 的框、点不中。
import { describe, expect, test } from "vitest";

import { clampStateIconDrawingMovementDelta, stateIconDrawingImportedSvgSelectionFrame } from "./appExtracted/appDeviceDefinitionFactories";

// 本文件**刻意不 vi.mock stateIconDrawing**，直接跑真实的 stateIconSvgVisibleViewBox。
//
// 早先这里 mock 掉了 viewBox 解析（只认 "空" 与固定的 "0 0 100 50"），它把两个前提
// 藏了起来：① 顶层 vi.mock 只在「本文件的模块注册表里还没求值过该模块」时才接管；
// ② 自闭合的 <svg .../> 走不通真实解析（见下）。关掉 isolate 后共享注册表里
// 别的文件已把 stateIconDrawing / appDeviceDefinitionFactories 求值过，mock 直接失效，
// 真实实现被调用，而自闭合源码解析不出 viewBox，于是**整条被测路径返回 null** ——
// 不是数值偏差，是 5 条断言同时塌成 "expected null"。
//
// 现在改用**闭合写法** `<svg viewBox='0 0 100 50'></svg>`：真实解析在无 DOM 环境
// （本仓 test.environment = "node"，既无 DOMParser 也无 document）下走
// stateIconSvgFallbackParts 的正则分支，能读出 "0 0 100 50"，与原先 mock 注入的值一致，
// 故下面所有期望数字一条不改，两种模式下都成立，且不再依赖「注册表是干净的」。
// ⚠ 别再把 mock 加回来：那正是跨文件泄漏的入口，而它并不能让断言更严。
const VIEW_BOX_SOURCE = "<svg viewBox='0 0 100 50'></svg>";

const element = (over: Record<string, any> = {}) => ({
  kind: "imported-svg",
  svgSource: VIEW_BOX_SOURCE,
  width: 40,
  height: 40,
  ...over
});

describe("stateIconDrawingImportedSvgSelectionFrame", () => {
  test("等比缩放到元素宽度并居中", () => {
    // viewBox 100×50，元素 40×40 → scale = min(40/100, 40/50) = 0.4 → 40×20
    expect(stateIconDrawingImportedSvgSelectionFrame(element())).toEqual({
      x: -20,
      y: -10,
      width: 40,
      height: 20,
      halfWidth: 20,
      halfHeight: 10
    });
  });

  test("元素更宽时以宽度为准", () => {
    // 元素 200×40 → scale = min(200/100, 40/50) = 0.8 → 80×40
    const frame = stateIconDrawingImportedSvgSelectionFrame(element({ width: 200, height: 40 }));

    expect(frame).toMatchObject({ width: 80, height: 40 });
  });

  test("元素更高时以高度为准", () => {
    // 元素 40×200 → scale = min(0.4, 4) = 0.4 → 40×20
    expect(stateIconDrawingImportedSvgSelectionFrame(element({ width: 40, height: 200 }))).toMatchObject({
      width: 40,
      height: 20
    });
  });

  test("非导入 SVG 元素返回 null", () => {
    expect(stateIconDrawingImportedSvgSelectionFrame(element({ kind: "image" }))).toBeNull();
  });

  test("缺少 svgSource 返回 null", () => {
    expect(stateIconDrawingImportedSvgSelectionFrame(element({ svgSource: "" }))).toBeNull();
  });

  test("viewBox 解析不出四段数时返回 null", () => {
    // 非 SVG 源码：真实解析走 stateIconSvgFallbackParts，认不出 <svg…> 开标签 → viewBox 为空串
    expect(stateIconDrawingImportedSvgSelectionFrame(element({ svgSource: "空" }))).toBeNull();
  });

  test("viewBox 尺寸为 0 时返回 null（避免除零）", () => {
    // 闭合写法让真实解析确实读出 "0 0 0 0"，于是真正走到 width <= 0 那条除零守卫上。
    // 早先的写法是 `frame === null || Number.isFinite(frame.width)` —— mock 让本用例
    // 恒真，等于什么都没验；去掉 mock 后才有资格断言「必须返回 null」。
    expect(stateIconDrawingImportedSvgSelectionFrame(element({ svgSource: "<svg viewBox='0 0 0 0'></svg>" }))).toBeNull();
  });

  test("元素宽高为 0 时按 1 兜底", () => {
    const frame = stateIconDrawingImportedSvgSelectionFrame(element({ width: 0, height: 0 }));

    // scale = min(1/100, 1/50) = 0.01 → 100*0.01 = 1，50*0.01 = 0.5
    expect(frame).toMatchObject({ width: 1, height: 0.5 });
  });

  test("halfWidth / halfHeight 与宽高自洽", () => {
    const frame = stateIconDrawingImportedSvgSelectionFrame(element())!;

    expect(frame.halfWidth).toBe(frame.width / 2);
    expect(frame.halfHeight).toBe(frame.height / 2);
  });

  test("element 为 undefined 时返回 null", () => {
    expect(stateIconDrawingImportedSvgSelectionFrame(undefined)).toBeNull();
  });
});

// stateIconDrawingMovementVisibleFrame 的可见框来自两处：visibleFrames 缓存，和上面这个
// viewBox 兜底函数。缓存那条路上 x / y 是浏览器量像素算出来的，缺字段 / 非数值都可能出现；
// 而 visibleFrame 的 x / y 直接乘进角点，NaN 会顺着 Math.min/max 污染整个边界盒，
// 拖拽收敛就变成 NaN 位移。
//
// 该可见框本身不是导出函数，唯一可观测的入口是 clampStateIconDrawingMovementDelta（导出的），
// 它把 frame 喂给 Math.min/max 再对画布夹取，所以断言落在夹取结果上。
//
// ⚠ 断言值不是「不是 NaN」：帧非法时回退框是居中铺满元素尺寸的 { -w/2, -h/2, w, h }，
// 元素 40×40 且不旋转 ⇒ 边界盒 [-20,20]²，画布 200×200 ⇒ 可走区间 x/y 各 [20,180]，
// 位移 999 收敛到 180。若 x / y 未校验，边界盒全 NaN，
// `minimumDelta <= maximumDelta` 因 NaN 比较为 false 而锁死 0 —— 180 与 0 相差两个数量级，
// 断言能真正咬住这一行。
describe("imported-svg 可见框的 x / y 边界校验", () => {
  const SVG_SOURCE = "<svg viewBox='0 0 100 50'></svg>";
  const movementElement = (over: Record<string, any> = {}) => ({
    id: "el1",
    kind: "imported-svg",
    svgSource: SVG_SOURCE,
    x: 0,
    y: 0,
    width: 40,
    height: 40,
    rotation: 0,
    ...over
  });
  // 必须逐字复刻 stateIconDrawingMovementVisibleFrame 的键：stroke 三项走的是
  // `${element.strokeWidth}:${element.strokeColor ?? ""}:${element.strokeStyle ?? ""}`，
  // 而 strokeWidth 没有 ?? 兜底，未设置时插值成字符串 "undefined"（不是空串）。
  // 键拼错 ⇒ 缓存查不到 ⇒ 悄悄回落到 viewBox 兜底框（40×20），本组断言全部失去被测对象。
  const frameKey = `${movementElement().id}:${SVG_SOURCE}:undefined::`;
  const canvasRect = { x: 0, y: 0, width: 200, height: 200 };
  // 位移往右下猛推，两轴都撞到画布边界 → 收敛值只取决于选区边界盒本身。
  const clampWithFrame = (frame: Record<string, any>) =>
    clampStateIconDrawingMovementDelta(
      [movementElement()],
      { x: 999, y: 999 },
      canvasRect,
      { image: {}, svg: { [frameKey]: frame } }
    );

  // 宽高非法时的既有回退框：居中铺满元素尺寸。这个值是下面所有用例的期望值基准，
  // 也钉住了「x/y 非法必须回落到与宽高非法同一个框」这条契约。
  const INVALID_SIZE_FALLBACK_CLAMP = { x: 180, y: 180 };

  test("宽高非法时回退到居中铺满元素尺寸的框", () => {
    // width = 0 ⇒ !(0 > 0) ⇒ 走回退分支
    expect(clampWithFrame({ x: 0, y: 0, width: 0, height: 40, basisWidth: 40, basisHeight: 40 })).toEqual(
      INVALID_SIZE_FALLBACK_CLAMP
    );
  });

  test("合法 x / y 走缩放分支，与回退值不同", () => {
    // frame 铺满元素 40×40、basis 同为 40 ⇒ scale 1，边界盒 [0,40] ⇒ 区间 [0,160]
    expect(clampWithFrame({ x: 0, y: 0, width: 40, height: 40, basisWidth: 40, basisHeight: 40 })).toEqual({
      x: 160,
      y: 160
    });
  });

  // 负坐标是合法的（导入 SVG 的 viewBox 常有负原点，见 stateIconDrawingImportedSvgSelectionFrame
  // 的 x = -fittedWidth / 2）。所以守卫只能要求「有限」，不能顺手加 `> 0`。
  test("负坐标仍走缩放分支（守卫不误杀合法负值）", () => {
    // x/y 各 -20、宽高 40 ⇒ 边界盒 [-20,20] ⇒ 与回退框同形 ⇒ 同样收敛到 180
    expect(clampWithFrame({ x: -20, y: -20, width: 40, height: 40, basisWidth: 40, basisHeight: 40 })).toEqual(
      INVALID_SIZE_FALLBACK_CLAMP
    );
  });

  test.each([
    ["undefined", undefined],
    ["null", null],
    ['"abc"', "abc"],
    ["NaN", Number.NaN]
  ])("frame.x / frame.y 为 %s 时回退到宽高非法时的同一个框", (_label, bad) => {
    const finite = { width: 40, height: 40, basisWidth: 40, basisHeight: 40 };

    expect(clampWithFrame({ ...finite, x: bad, y: 0 })).toEqual(INVALID_SIZE_FALLBACK_CLAMP);
    expect(clampWithFrame({ ...finite, x: 0, y: bad })).toEqual(INVALID_SIZE_FALLBACK_CLAMP);
    expect(clampWithFrame({ ...finite, x: bad, y: bad })).toEqual(INVALID_SIZE_FALLBACK_CLAMP);
  });

  // Number(null) === 0，是个合法坐标 —— 若守卫写成 `Number.isFinite(Number(v))` 就静默通过。
  // 这里只把 null 交给没转数字的 Number.isFinite 判定，与 frame.basisWidth 的处理一致。
  test("null 不会被静默当成坐标 0", () => {
    expect(clampWithFrame({ x: null, y: 0, width: 40, height: 40, basisWidth: 40, basisHeight: 40 })).toEqual(
      INVALID_SIZE_FALLBACK_CLAMP
    );
  });
});
