// 选项与光标的 class 名：内置/自定义来源要视觉上可区分，缩放手柄光标要跟节点的旋转角走。
// 光标分档是 22.5° 一档的四象限，写错一档会让手柄光标与实际拖动方向差 45°。
import { describe, expect, test } from "vitest";

import {
  categoryLibraryOptionClass,
  componentLibraryOptionClass,
  scaleHandleCursorClass,
  sourceSelectClassName
} from "./appExtracted/appPersistenceLibraryExport";

describe("选项 class 名", () => {
  test("受保护的分类库（静态图元 / 交流设备 …）给 builtin-option", () => {
    for (const name of ["静态图元", "交流设备", "直流设备", "氢能设备", "热能设备"]) {
      expect(categoryLibraryOptionClass(name)).toBe("builtin-option");
    }
  });

  test("自定义分类库给 custom-option", () => {
    expect(categoryLibraryOptionClass("我的分类")).toBe("custom-option");
  });

  test("内置元件库（E 文件段名）给 builtin-option", () => {
    expect(componentLibraryOptionClass("ACLoad")).toBe("builtin-option");
  });

  test("自定义元件库给 custom-option", () => {
    expect(componentLibraryOptionClass("MyLib")).toBe("custom-option");
  });

  test("内置判定大小写不敏感", () => {
    expect(componentLibraryOptionClass("acload")).toBe("builtin-option");
  });

  test("空名不崩（按自定义处理）", () => {
    expect(categoryLibraryOptionClass("")).toBe("custom-option");
    expect(componentLibraryOptionClass("")).toBe("custom-option");
  });
});

describe("sourceSelectClassName", () => {
  test("内置来源带 builtin-source", () => {
    expect(sourceSelectClassName(true)).toBe("source-select builtin-source");
  });

  test("自定义来源带 custom-source", () => {
    expect(sourceSelectClassName(false)).toBe("source-select custom-source");
  });

  test("基础类始终在最前", () => {
    expect(sourceSelectClassName(true).startsWith("source-select ")).toBe(true);
    expect(sourceSelectClassName(false).startsWith("source-select ")).toBe(true);
  });
});

describe("scaleHandleCursorClass", () => {
  const handle = { xDirection: 1, yDirection: 0, className: "scale-handle" } as any;

  test("不旋转、横向手柄 → horizontal", () => {
    expect(scaleHandleCursorClass(handle, 0)).toBe("horizontal");
  });

  test("旋转 90° 后同一手柄变成纵向 → vertical", () => {
    expect(scaleHandleCursorClass(handle, 90)).toBe("vertical");
  });

  test("旋转 45° → diagonal-nwse", () => {
    expect(scaleHandleCursorClass(handle, 45)).toBe("diagonal-nwse");
  });

  test("旋转 135° → diagonal-nesw", () => {
    expect(scaleHandleCursorClass(handle, 135)).toBe("diagonal-nesw");
  });

  test("旋转 180° 回到 horizontal（手柄方向等价）", () => {
    expect(scaleHandleCursorClass(handle, 180)).toBe("horizontal");
  });

  test("旋转 360° 与 0° 同档", () => {
    expect(scaleHandleCursorClass(handle, 360)).toBe(scaleHandleCursorClass(handle, 0));
  });

  test("纵向手柄在 0° 时是 vertical", () => {
    expect(scaleHandleCursorClass({ ...handle, xDirection: 0, yDirection: 1 }, 0)).toBe("vertical");
  });

  test("零方向手柄（退化）回落到自带 className", () => {
    expect(scaleHandleCursorClass({ ...handle, xDirection: 0, yDirection: 0 }, 45)).toBe("scale-handle");
  });

  test("分档边界：22.5° 仍算 horizontal（< 22.5 才进 diagonal）", () => {
    expect(scaleHandleCursorClass(handle, 22.5)).toBe("horizontal");
  });

  test("分档边界：67.5° 归入 vertical（< 67.5 才算 diagonal-nwse）", () => {
    expect(scaleHandleCursorClass(handle, 67.5)).toBe("vertical");
  });

  test("分档边界：112.5° 仍算 vertical", () => {
    expect(scaleHandleCursorClass(handle, 112.5)).toBe("vertical");
  });

  test("分档边界：157.5° 回到 horizontal（>= 157.5）", () => {
    expect(scaleHandleCursorClass(handle, 157.5)).toBe("horizontal");
  });

  test("四档各取一个代表角度", () => {
    expect(scaleHandleCursorClass(handle, 0)).toBe("horizontal");
    expect(scaleHandleCursorClass(handle, 45)).toBe("diagonal-nwse");
    expect(scaleHandleCursorClass(handle, 90)).toBe("vertical");
    expect(scaleHandleCursorClass(handle, 135)).toBe("diagonal-nesw");
  });

  test("负旋转角按 180° 取模后仍分档正确", () => {
    expect(scaleHandleCursorClass(handle, -90)).toBe("vertical");
  });
});
