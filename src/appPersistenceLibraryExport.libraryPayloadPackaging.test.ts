// 图标库落盘载荷归一 + 库包按作用域裁剪 + 设备模板按分类库分组。
// 归一的三道闸：① 非对象 / 数组 → 落成空壳（但 root 目录仍会被补上）；
// ② 内置图标资产被剔除（不与用户资产抢 id）；③ folderId 指向不存在的目录时落回 root。
// 目录数组还有个隐含行为：没有 root 时会补一个「默认文件夹」到最前面。
import { describe, expect, test } from "vitest";

import {
  groupDeviceTemplatesByCategoryLibrary,
  normalizeIconLibraryPersistencePayload,
  packageScopedDeviceLibraryPayload
} from "./appExtracted/appPersistenceLibraryExport";

const ROOT_ONLY = [{ id: "root", name: "默认文件夹", createdAt: undefined, imageCount: undefined }];

describe("normalizeIconLibraryPersistencePayload", () => {
  test("非对象输入落成只含 root 目录的空载荷", () => {
    expect(normalizeIconLibraryPersistencePayload(null as any)).toEqual({ folders: ROOT_ONLY, assets: [] });
  });

  test("数组输入同样落成只含 root 的空载荷", () => {
    expect(normalizeIconLibraryPersistencePayload([] as any)).toEqual({ folders: ROOT_ONLY, assets: [] });
  });

  test("缺字段时目录为 [root]、资产为空", () => {
    expect(normalizeIconLibraryPersistencePayload({} as any)).toEqual({ folders: ROOT_ONLY, assets: [] });
  });

  test("显式给出 root 时不重复补", () => {
    const result = normalizeIconLibraryPersistencePayload({ folders: [{ id: "root", name: "默认文件夹" }] } as any);

    expect(result.folders).toHaveLength(1);
  });

  test("自定义目录排在 root 之后", () => {
    const result = normalizeIconLibraryPersistencePayload({ folders: [{ id: "f1", name: "F1" }] } as any);

    expect(result.folders.map((f: any) => f.id)).toEqual(["root", "f1"]);
  });

  test("内置共享图标目录被剔除", () => {
    const result = normalizeIconLibraryPersistencePayload({ folders: [{ id: "builtin-shared-icons" }] } as any);

    expect(result.folders.map((f: any) => f.id)).toEqual(["root"]);
  });

  test("重复目录 id 只保留一条", () => {
    const result = normalizeIconLibraryPersistencePayload({ folders: [{ id: "f1" }, { id: "f1" }] } as any);

    expect(result.folders.filter((f: any) => f.id === "f1")).toHaveLength(1);
  });

  test("正常资产被保留并补 url", () => {
    const result = normalizeIconLibraryPersistencePayload({
      folders: [{ id: "f1" }],
      assets: [{ id: "a1", dataUrl: "data:image/png;base64,AAA", folderId: "f1" }]
    } as any);

    expect(result.assets).toHaveLength(1);
    expect(result.assets[0]).toMatchObject({ id: "a1", folderId: "f1" });
    expect(result.assets[0].url).toContain("a1");
  });

  test("内置共享图标资产被剔除", () => {
    const result = normalizeIconLibraryPersistencePayload({
      assets: [{ id: "builtin-shared-icon-x", dataUrl: "data:1" }, { id: "a1", dataUrl: "data:1", folderId: "builtin-shared-icons" }]
    } as any);

    expect(result.assets).toEqual([]);
  });

  test("id 或 dataUrl 缺失的资产被丢弃", () => {
    const result = normalizeIconLibraryPersistencePayload({
      assets: [{ dataUrl: "data:1" }, { id: "a2" }, { id: "a3", dataUrl: "data:3" }]
    } as any);

    expect(result.assets.map((a: any) => a.id)).toEqual(["a3"]);
  });

  test("重复 id 只保留第一条", () => {
    const result = normalizeIconLibraryPersistencePayload({
      assets: [
        { id: "a1", dataUrl: "data:1" },
        { id: "a1", dataUrl: "data:2" }
      ]
    } as any);

    expect(result.assets).toHaveLength(1);
    expect(result.assets[0].dataUrl).toBe("data:1");
  });

  test("指向不存在目录的资产落回 root", () => {
    const result = normalizeIconLibraryPersistencePayload({
      folders: [{ id: "f1" }],
      assets: [{ id: "a1", dataUrl: "data:1", folderId: "不存在的目录" }]
    } as any);

    expect(result.assets[0].folderId).toBe("root");
  });

  test("目录 id 带前后空白时被裁掉再匹配", () => {
    const result = normalizeIconLibraryPersistencePayload({
      folders: [{ id: "f1" }],
      assets: [{ id: "a1", dataUrl: "data:1", folderId: " f1 " }]
    } as any);

    expect(result.assets[0].folderId).toBe("f1");
  });

  test("name 缺省或空白时回落到 id", () => {
    const withName = normalizeIconLibraryPersistencePayload({ assets: [{ id: "a1", dataUrl: "data:1" }] } as any);
    const withBlank = normalizeIconLibraryPersistencePayload({ assets: [{ id: "a2", dataUrl: "data:1", name: "   " }] } as any);

    expect(withName.assets[0].name).toBe("a1");
    expect(withBlank.assets[0].name).toBe("a2");
  });

  test("name 缺省时用 filename", () => {
    const result = normalizeIconLibraryPersistencePayload({ assets: [{ id: "a1", dataUrl: "data:1", filename: "图标.png" }] } as any);

    expect(result.assets[0].name).toBe("图标.png");
  });

  test("id 需要 URL 编码后进 url", () => {
    const result = normalizeIconLibraryPersistencePayload({ assets: [{ id: "a b/c", dataUrl: "data:1" }] } as any);

    expect(result.assets[0].url).toContain("a%20b%2Fc");
  });

  test("assets 不是数组时落成空数组", () => {
    expect(normalizeIconLibraryPersistencePayload({ assets: "不是数组" } as any).assets).toEqual([]);
  });
});

describe("packageScopedDeviceLibraryPayload", () => {
  // 设备模板要走 concreteDeviceTemplateForStorage（剥派生/容器类字段），需要较完整的形状
  const deviceTemplate = (id: string) => ({
    id,
    name: id,
    kind: "ac-load",
    categoryLibrary: "交流",
    componentLibrary: "ac",
    imageHref: "",
    params: { dev_type: id }
  });
  const graphTemplate = (id: string) => ({
    id,
    name: id,
    typeName: "我的类型",
    kind: `custom-${id}`,
    categoryLibrary: "交流",
    componentLibrary: "ac",
    params: {}
  });
  const full = {
    customGraphTemplateTypes: ["我的类型"],
    customGraphTemplates: [graphTemplate("g1")],
    customDeviceTemplates: [deviceTemplate("d1")]
  } as any;

  test("template-library 把设备模板整段换成空（只带图模板）", () => {
    const result = packageScopedDeviceLibraryPayload(full, "template-library" as any);

    expect(result.customDeviceTemplates).toEqual([]);
    expect(result.customCategoryLibraries).toEqual([]);
    expect(result.customComponentLibraries).toEqual([]);
  });

  test("template-library 保留图模板类型", () => {
    expect(packageScopedDeviceLibraryPayload(full, "template-library" as any).customGraphTemplateTypes).toEqual(["我的类型"]);
  });

  test("device-library 清空图模板、保留设备模板", () => {
    const result = packageScopedDeviceLibraryPayload(full, "device-library" as any);

    expect(result.customGraphTemplates).toEqual([]);
    expect(result.customGraphTemplateTypes).toEqual([]);
    expect(result.customDeviceTemplates.map((t: any) => t.id)).toEqual(["d1"]);
  });

  test("component-library 同样清空图模板", () => {
    const result = packageScopedDeviceLibraryPayload(full, "component-library" as any);

    expect(result.customGraphTemplates).toEqual([]);
    expect(result.customDeviceTemplates.map((t: any) => t.id)).toEqual(["d1"]);
  });

  test("其他作用域不清空任何一段（与 template-library 可区分）", () => {
    const result = packageScopedDeviceLibraryPayload(full, "unknown" as any);

    expect(result.customDeviceTemplates.map((t: any) => t.id)).toEqual(["d1"]);
  });

  test("载荷为 undefined 时不抛", () => {
    expect(() => packageScopedDeviceLibraryPayload(undefined, "device-library" as any)).not.toThrow();
  });
});

describe("groupDeviceTemplatesByCategoryLibrary", () => {
  const template = (id: string, categoryLibrary: string) => ({ id, categoryLibrary } as any);

  test("按分类库分组", () => {
    const result = groupDeviceTemplatesByCategoryLibrary([template("a", "交流"), template("b", "交流"), template("c", "直流")]);

    expect(Object.keys(result).sort()).toEqual(["交流", "直流"]);
    expect(result["交流"].map((t: any) => t.id)).toEqual(["a", "b"]);
  });

  test("分组内模板的分类库被归一后回填（历史名会被改名）", () => {
    const result = groupDeviceTemplatesByCategoryLibrary([template("a", "交流系统")]);

    expect(Object.keys(result)).toEqual(["交流设备"]);
    expect(Object.values(result).flat()[0].categoryLibrary).toBe("交流设备");
  });

  test("改名后原数组不被改动", () => {
    const source = [template("a", "交流系统")];

    groupDeviceTemplatesByCategoryLibrary(source);

    expect(source[0].categoryLibrary).toBe("交流系统");
  });

  test("模板对象被复制，不改原数组", () => {
    const source = [template("a", "交流")];

    groupDeviceTemplatesByCategoryLibrary(source);

    expect(source[0].categoryLibrary).toBe("交流");
  });

  test("空数组返回空对象", () => {
    expect(groupDeviceTemplatesByCategoryLibrary([])).toEqual({});
  });

  test("无分类库的模板仍归入某一组（不会被丢弃）", () => {
    const result = groupDeviceTemplatesByCategoryLibrary([template("a", "")]);

    expect(Object.values(result).flat()).toHaveLength(1);
  });
});
