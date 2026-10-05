// MODEL_TYPE_META 的零覆盖断言。
//
// 它在 src/model.ts 里被声明成 `Record<ModelType, { color: string; icon: string }>`——
// Record<ModelType, …> 这个类型只约束「键必须是 ModelType 的成员」，不约束
// 「ModelType 的每个成员都必须有键」。多写一个类型、少填一项，tsc 都不会报错，
// 运行时表现为 UI 侧 `meta.color` 读到 undefined（图标整块不渲染、图例颜色丢失），
// 且因为是纯数据表，**任何测试都不会红**。所以这张表需要自己的守卫。
//
// 这里刻意断言键集**双向**相等：既防「表里多一项」（会静默多出未知模型类型），
// 也防「表里少一项」（Record 的类型检查根本发现不了）。
import { describe, expect, test } from "vitest";

import { MODEL_TYPES, MODEL_TYPE_META } from "./model";

describe("MODEL_TYPE_META 的键集", () => {
  test("与 MODEL_TYPES 的成员完全相等，不多不少", () => {
    expect(Object.keys(MODEL_TYPE_META).sort()).toEqual([...MODEL_TYPES].sort());
  });

  test("MODEL_TYPES 自身无重复成员", () => {
    // MODEL_TYPES 是 as const 元组，类型层面同样允许重复值。若真出现重复，
    // 上一条的键数比对就会失败，但那条的报错信息看不出根因，这里单列一条。
    expect([...MODEL_TYPES].length).toBe(new Set(MODEL_TYPES).size);
  });
});

describe("MODEL_TYPE_META 的字段", () => {
  test("每一项的字段集恰为 color 与 icon，且两者都是非空字符串", () => {
    for (const type of MODEL_TYPES) {
      const meta = MODEL_TYPE_META[type];
      expect(meta, `${type} 缺少元数据`).toBeDefined();
      // 断言字段集恰为这两个，而不是「至少有这两个」：
      // 冒进来第三、第四个字段正是本守卫要抓的（它们的值会被误当成承重数据）。
      expect(Object.keys(meta).sort(), `${type} 的字段集不对`).toEqual(["color", "icon"]);
      expect(typeof meta.color, `${type}.color 不是字符串`).toBe("string");
      expect(typeof meta.icon, `${type}.icon 不是字符串`).toBe("string");
      expect(meta.color.trim().length, `${type}.color 为空`).toBeGreaterThan(0);
      expect(meta.icon.trim().length, `${type}.icon 为空`).toBeGreaterThan(0);
    }
  });

  test("颜色统一为小写十六进制，图标名统一为帕斯卡命名", () => {
    // 消费端会把 color 直接塞进 SVG fill / 图例色块，把 icon 直接当组件名渲染，
    // 两种格式都不是随便能写错的：写错一个字符 UI 就掉色或掉图标，且同样不会报错。
    for (const type of MODEL_TYPES) {
      expect(MODEL_TYPE_META[type].color, `${type}.color 不是小写 #rrggbb`).toMatch(
        /^#[0-9a-f]{6}$/
      );
      expect(MODEL_TYPE_META[type].icon, `${type}.icon 不是帕斯卡命名`).toMatch(
        /^[A-Z][A-Za-z0-9]*$/
      );
    }
  });
});

describe("MODEL_TYPE_META 的具体取值", () => {
  // 抽样钉住真实值，防止「格式化工具批量重写」或误编辑把某个颜色悄悄换掉。
  // 只钉三处（其余两项仍由上面的字段/格式断言覆盖），钉全表会让它变成快照测试，
  // 正常调色时每处都要改，反而更容易被整体忽略。
  test("厂站为蓝色 Factory 图标", () => {
    expect(MODEL_TYPE_META["厂站"]).toEqual({ color: "#2563eb", icon: "Factory" });
  });

  test("台区为绿色 HousePlug 图标", () => {
    expect(MODEL_TYPE_META["台区"]).toEqual({ color: "#059669", icon: "HousePlug" });
  });

  test("其他为灰色 FileJson 图标", () => {
    expect(MODEL_TYPE_META["其他"]).toEqual({ color: "#94a3b8", icon: "FileJson" });
  });
});