// CONVERTER_GLYPH_BORDER_INSET —— 变换器字形（dcdc/acdc/dcac/acac-converter）
// 的「边框内缩」几何常量，定义在 model-routing.ts:1823。
//
// 它的唯一作用是把端子位置从字形外框往里收：消费点有两处端子偏移计算，
// 形如 Math.max(0, fullRectDistance - scaled(CONVERTER_GLYPH_BORDER_INSET))，
// DeviceGlyph.ts 另有直接读取决定边框位置。
//
// 之所以要钉桩：这是一个纯数字字面量，没有类型、没有调用方签名、也没有任何
// 既有断言覆盖它。把它改成 9 或 -1 不会让任何编译或既有测试失败，只会让变换器
// 端子在画布上整体偏几个像素。所以这里断言三件事 —— 确切取值、必须是有限正数、
// 必须是模块加载期就定下的常量（跨重新 import 依旧不变）。
import { describe, expect, test, vi } from "vitest";

import { CONVERTER_GLYPH_BORDER_INSET } from "./model-routing";

/** 源码里的字面量，改常量时必须同步改这里并说明原因。 */
const EXPECTED_INSET = 8;

describe("CONVERTER_GLYPH_BORDER_INSET", () => {
  test("取值等于源码字面量 8", () => {
    expect(CONVERTER_GLYPH_BORDER_INSET).toBe(EXPECTED_INSET);
  });

  test("是有限正数：不会让端子偏移量退化成 NaN、负内缩或贴死边框", () => {
    expect(Number.isFinite(CONVERTER_GLYPH_BORDER_INSET)).toBe(true);
    expect(CONVERTER_GLYPH_BORDER_INSET).toBeGreaterThan(0);
    // 消费点是 Math.max(0, fullRectDistance - scaled(INSET))：
    //   · 非有限值 → scaled() 产出 NaN → 偏移量直接变 NaN，端子位置崩掉；
    //   · 取 0    → 内缩失效，端子贴死在字形外框上；
    //   · 取负数  → Math.max(0, …) 把端子往外推，等于反向加宽。
    // 三种都静默出错，故至少要留一个整像素的内缩。
    expect(CONVERTER_GLYPH_BORDER_INSET).toBeGreaterThanOrEqual(1);
  });

  test("重新加载模块后仍是同一个值，不会被重算或改写", async () => {
    vi.resetModules();
    const reloaded = (await import("./model-routing")).CONVERTER_GLYPH_BORDER_INSET;
    expect(reloaded).toBe(EXPECTED_INSET);
    // 数字是原始值，引用相等退化为 Object.is。跨模块实例仍相等，才能排除
    // 「从 const 字面量改成运行时计算或 let + 副作用改写」这类改动。
    expect(Object.is(reloaded, CONVERTER_GLYPH_BORDER_INSET)).toBe(true);
  });
});
