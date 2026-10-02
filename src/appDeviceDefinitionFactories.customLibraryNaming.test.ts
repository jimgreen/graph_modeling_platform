// 自定义库与模板的默认命名：都要「按序号递增 + 大小写不敏感去重」，
// 999 个都用完时退回时间戳（而不是重名或抛错）。
// 模板 kind 还要先把库名里的非法字符换成下划线。
import { describe, expect, test, vi } from "vitest";

import {
  createNextCustomCategoryLibraryName,
  createNextCustomComponentLibraryName,
  createNextCustomTemplateKind
} from "./appExtracted/appDeviceDefinitionFactories";

describe("createNextCustomCategoryLibraryName", () => {
  test("没有同名库时返回第一个序号", () => {
    expect(createNextCustomCategoryLibraryName({ categoryLibraries: [] })()).toBe("类别库1");
  });

  test("跳过已占用的序号", () => {
    const scope = { categoryLibraries: ["类别库1", "类别库2"] };

    expect(createNextCustomCategoryLibraryName(scope)()).toBe("类别库3");
  });

  test("同名库出现多次时也只占一个序号", () => {
    const scope = { categoryLibraries: ["类别库1", "类别库1", "类别库2"] };

    expect(createNextCustomCategoryLibraryName(scope)()).toBe("类别库3");
  });

  test("序号不连续时取最小可用值", () => {
    const scope = { categoryLibraries: ["类别库1", "类别库3"] };

    expect(createNextCustomCategoryLibraryName(scope)()).toBe("类别库2");
  });

  test("999 个都被占用时退回时间戳", () => {
    const scope = { categoryLibraries: Array.from({ length: 999 }, (_, i) => `类别库${i + 1}`) };

    expect(createNextCustomCategoryLibraryName(scope)()).toMatch(/^类别库\d{10,}$/);
  });
});

describe("createNextCustomComponentLibraryName", () => {
  test("没有同名库时返回第一个序号", () => {
    expect(createNextCustomComponentLibraryName({ componentLibraryOptions: [] })()).toBe("CustomDevice1");
  });

  test("跳过已占用的序号", () => {
    expect(createNextCustomComponentLibraryName({ componentLibraryOptions: ["CustomDevice1"] })()).toBe("CustomDevice2");
  });

  test("大小写不敏感去重", () => {
    expect(createNextCustomComponentLibraryName({ componentLibraryOptions: ["customdevice1"] })()).toBe("CustomDevice2");
  });

  test("999 个都被占用时退回时间戳", () => {
    const scope = { componentLibraryOptions: Array.from({ length: 999 }, (_, i) => `CustomDevice${i + 1}`) };

    expect(createNextCustomComponentLibraryName(scope)()).toMatch(/^CustomDevice\d{10,}$/);
  });
});

describe("createNextCustomTemplateKind", () => {
  const scope = (kinds: string[]) => ({ libraryTemplates: kinds.map((kind) => ({ kind })) });

  test("库名合法且未占用时直接用 custom-<库名>", () => {
    expect(createNextCustomTemplateKind(scope([]))("AcLib")).toBe("custom-AcLib");
  });

  test("库名里的非法字符换成下划线", () => {
    expect(createNextCustomTemplateKind(scope([]))("ac-lib.v2")).toBe("custom-ac_lib_v2");
  });

  test("库名全是非法字符时整段被替换成一个下划线", () => {
    // "***" → "_"（非空），故不走 CustomDevice 兜底
    expect(createNextCustomTemplateKind(scope([]))("***")).toBe("custom-_");
  });

  test("基础名被占用时从 2 开始递增", () => {
    expect(createNextCustomTemplateKind(scope(["custom-AcLib"]))("AcLib")).toBe("custom-AcLib-2");
  });

  test("大小写不敏感去重", () => {
    expect(createNextCustomTemplateKind(scope(["CUSTOM-ACLIB"]))("AcLib")).toBe("custom-AcLib-2");
  });

  test("递增跳过中间已占用的序号", () => {
    expect(createNextCustomTemplateKind(scope(["custom-AcLib", "custom-AcLib-2", "custom-AcLib-3"]))("AcLib")).toBe("custom-AcLib-4");
  });

  test("空库名也退回 CustomDevice", () => {
    expect(createNextCustomTemplateKind(scope([]))("")).toBe("custom-CustomDevice");
  });

  test("重复的非法字符合并成一个下划线", () => {
    expect(createNextCustomTemplateKind(scope([]))("a---b")).toBe("custom-a_b");
  });
});

describe("createCreateCustomCategoryLibrary", () => {
  test("只读模式下不打开新建对话框", async () => {
    const { createCreateCustomCategoryLibrary } = await import("./appExtracted/appDeviceDefinitionFactories");
    const setCustomLibraryCreateDialog = vi.fn();
    const create = createCreateCustomCategoryLibrary({
      requireEditMode: vi.fn(() => false),
      setCustomLibraryCreateDialog
    });

    create();

    expect(setCustomLibraryCreateDialog).not.toHaveBeenCalled();
  });
});
