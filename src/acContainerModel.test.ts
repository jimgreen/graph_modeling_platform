// 交流容器数据模型测试(Task 1)
import { describe, test, expect } from "vitest";
import {
  DEVICE_LIBRARY_BY_KIND,
  AC_CONTAINER_KINDS,
  isAcContainerKind,
} from "./model";

describe("交流容器数据模型", () => {
  test("3 个容器 kind 已注册且分类为交流容器", () => {
    expect(AC_CONTAINER_KINDS).toEqual([
      "ac-vpp-box",
      "ac-switch-box",
      "ac-distribution-box",
    ]);
    for (const kind of AC_CONTAINER_KINDS) {
      const tpl = DEVICE_LIBRARY_BY_KIND.get(kind);
      expect(tpl, `${kind} 未注册`).toBeTruthy();
      expect(tpl!.categoryLibrary).toBe("交流容器");
    }
  });

  test("容器不进 static 家族(不写 component_type)", () => {
    for (const kind of AC_CONTAINER_KINDS) {
      const tpl = DEVICE_LIBRARY_BY_KIND.get(kind)!;
      // 字段名照抄真实模板结构:style 参数扁平在 params 上(非 defaults.params)
      const params = tpl.params;
      expect(params.component_type).toBeUndefined();
      expect(isAcContainerKind(kind)).toBe(true);
    }
    expect(isAcContainerKind("static-group-box")).toBe(false);
  });
});
