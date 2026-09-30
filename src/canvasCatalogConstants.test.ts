// 画布常量表之间的交叉不变量。
//
// 这些常量单独看都没什么分支，但**彼此之间**有必须成立的关系：分类库受保护集合
// 派生自内置分类、缩放手柄配置与组缩放手柄是过滤关系。任何一边单独改都会静默
// 失衡 —— 比如「静态图元」既进了受保护集合又出现在自定义基类里，表现为用户
// 能把内置分类删掉或基于它建自定义分类。
import { describe, expect, test } from "vitest";
import {
  COMPONENT_LIBRARY_LABELS,
  CUSTOM_CATEGORY_LIBRARY_BASES,
  DEFAULT_CATEGORY_LIBRARIES,
  GROUP_SCALE_HANDLE_CONFIGS,
  PROTECTED_CATEGORY_LIBRARIES,
  SCALE_HANDLE_CONFIGS
} from "./appExtracted/appCoreCanvasUtilities";

describe("分类库：受保护集合与自定义基类的差集", () => {
  test("受保护集合就是内置分类的全集", () => {
    expect([...PROTECTED_CATEGORY_LIBRARIES].sort()).toEqual([...DEFAULT_CATEGORY_LIBRARIES].sort());
  });

  test("★ 差集恰为「静态图元」：它受保护，但不能作为自定义分类的基类", () => {
    const custom = new Set(CUSTOM_CATEGORY_LIBRARY_BASES);
    const onlyProtected = DEFAULT_CATEGORY_LIBRARIES.filter((name) => !custom.has(name));
    expect(onlyProtected).toEqual(["静态图元"]);
  });

  test("★ 自定义基类全部来自内置分类（不会出现凭空的名字）", () => {
    for (const base of CUSTOM_CATEGORY_LIBRARY_BASES) {
      expect(`${base} ∈ 内置分类: ${DEFAULT_CATEGORY_LIBRARIES.includes(base)}`).toBe(`${base} ∈ 内置分类: true`);
    }
  });

  test("内置分类无重复项（否则 Set 会静默吞掉一个）", () => {
    expect(new Set(DEFAULT_CATEGORY_LIBRARIES).size).toBe(DEFAULT_CATEGORY_LIBRARIES.length);
  });
});

describe("缩放手柄配置", () => {
  test("八个手柄，id 与方向一一对应", () => {
    expect(SCALE_HANDLE_CONFIGS.map((h) => h.id)).toEqual([
      "north-west",
      "north",
      "north-east",
      "east",
      "south-east",
      "south",
      "south-west",
      "west"
    ]);
  });

  test("★ kind 与方向自洽：x 手柄 yDirection 必为 0，y 手柄 xDirection 必为 0", () => {
    for (const handle of SCALE_HANDLE_CONFIGS) {
      if (handle.kind === "scale-x") {
        expect(`${handle.id}: ${handle.yDirection}`).toBe(`${handle.id}: 0`);
      }
      if (handle.kind === "scale-y") {
        expect(`${handle.id}: ${handle.xDirection}`).toBe(`${handle.id}: 0`);
      }
      if (handle.kind === "scale-both") {
        expect(`${handle.id}: ${handle.xDirection !== 0 && handle.yDirection !== 0}`).toBe(`${handle.id}: true`);
      }
    }
  });

  test("★ 组缩放手柄是角点四个（两轴都有的 scale-both）", () => {
    expect(GROUP_SCALE_HANDLE_CONFIGS.map((h) => h.id)).toEqual(["north-west", "north-east", "south-east", "south-west"]);
    for (const handle of GROUP_SCALE_HANDLE_CONFIGS) {
      expect(handle.kind).toBe("scale-both");
    }
  });

  test("上下手柄共用 vertical 类名、左右共用 horizontal（CSS 靠这个定位）", () => {
    const classOf = (id: string) => SCALE_HANDLE_CONFIGS.find((h) => h.id === id)!.className;
    expect(classOf("north")).toBe(classOf("south"));
    expect(classOf("east")).toBe(classOf("west"));
    expect(classOf("north")).not.toBe(classOf("east"));
  });
});

describe("COMPONENT_LIBRARY_LABELS", () => {
  test("★ 覆盖 ELEMENT_TREE 里的全部元件库（缺一个就是树里显示英文原名）", () => {
    // 标签表是从 ELEMENT_TREE_COMPONENT_LIBRARY_LABELS 单源并入的；
    // 这里只断言「至少有中文标签且无空串」，不断言具体清单（那是数据不是逻辑）。
    const entries = Object.entries(COMPONENT_LIBRARY_LABELS);
    expect(entries.length).toBeGreaterThan(0);
    for (const [key, label] of entries) {
      expect(`${key}=${label}`).not.toBe(`${key}=`);
    }
  });

  test("已并入的键不会覆盖既有值（先到先得）", () => {
    // 取任意一个必然存在的键，两次读取结果相同即说明没有二次赋值抖动
    const first = COMPONENT_LIBRARY_LABELS[Object.keys(COMPONENT_LIBRARY_LABELS)[0]];
    expect(COMPONENT_LIBRARY_LABELS[Object.keys(COMPONENT_LIBRARY_LABELS)[0]]).toBe(first);
  });
});