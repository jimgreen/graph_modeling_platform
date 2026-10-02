// 用户定制的资产引用收集与快照合并。
// 收集要「深度遍历 + 环安全 + 只认资产引用键」：图元库/图标库导入前要知道哪些图片还在被引用，
// 否则会把仍被用到的图片当孤儿删掉。合并则由 userCustomizations 的单源实现承担。
import { describe, expect, test } from "vitest";

import { collectReferencedUserAssetIds, mergeUserCustomizationSnapshots } from "./userCustomizations";
import { createMergedUserCustomizationSnapshot, createReferencedUserAssetIds } from "./appExtracted/appUserCustomizationFactories";

describe("collectReferencedUserAssetIds", () => {
  test("收集 imageAssetId 形态的引用", () => {
    const result = collectReferencedUserAssetIds({ deviceLibrary: { customDeviceTemplates: [{ imageAssetId: "a1" }] } });

    expect([...result]).toEqual(["a1"]);
  });

  test("收集 backgroundImageAssetId 这类以 ImageAssetId 结尾的键", () => {
    const result = collectReferencedUserAssetIds({ backgroundImageAssetId: "bg1" });

    expect([...result]).toEqual(["bg1"]);
  });

  test("深层嵌套也能收集到", () => {
    const result = collectReferencedUserAssetIds({
      schemes: [{ projects: [{ project: { nodes: [{ params: { imageAssetId: "deep" } }] } }] }]
    });

    expect([...result]).toEqual(["deep"]);
  });

  test("数组里的元素也会被遍历", () => {
    const result = collectReferencedUserAssetIds([{ imageAssetId: "a1" }, { imageAssetId: "a2" }]);

    expect([...result].sort()).toEqual(["a1", "a2"]);
  });

  test("同 id 多次引用只收一个", () => {
    const result = collectReferencedUserAssetIds([{ imageAssetId: "a1" }, { imageAssetId: "a1" }]);

    expect(result.size).toBe(1);
  });

  test("引用值两侧空白被裁掉", () => {
    const result = collectReferencedUserAssetIds({ imageAssetId: "  a1  " });

    expect([...result]).toEqual(["a1"]);
  });

  test("空白引用被忽略", () => {
    expect(collectReferencedUserAssetIds({ imageAssetId: "   " }).size).toBe(0);
  });

  test("非字符串引用值被忽略（继续下钻）", () => {
    expect(collectReferencedUserAssetIds({ imageAssetId: { id: "a1" } }).size).toBe(0);
  });

  test("普通键名不被当成资产引用", () => {
    const result = collectReferencedUserAssetIds({ someName: "a1" });

    expect(result.size).toBe(0);
  });

  test("循环引用不会栈溢出（visited 去重）", () => {
    const cyclic: any = { imageAssetId: "a1" };
    cyclic.self = cyclic;

    expect([...collectReferencedUserAssetIds(cyclic)]).toEqual(["a1"]);
  });

  test("共享子对象只遍历一次但结果不变", () => {
    const shared = { imageAssetId: "shared" };
    const result = collectReferencedUserAssetIds({ a: shared, b: shared });

    expect([...result]).toEqual(["shared"]);
  });

  test("null / undefined / 原始值返回空集合", () => {
    expect(collectReferencedUserAssetIds(null).size).toBe(0);
    expect(collectReferencedUserAssetIds(undefined).size).toBe(0);
    expect(collectReferencedUserAssetIds("字符串").size).toBe(0);
  });
});

describe("createReferencedUserAssetIds", () => {
  test("把 scope 的四路数据汇总", () => {
    const scope = {
      nodes: [{ params: { imageAssetId: "n1" } }],
      projectMeasurements: { groups: [] },
      schemes: [],
      currentDeviceLibraryPersistencePayload: () => ({ customDeviceTemplates: [{ imageAssetId: "d1" }] })
    };

    const result = createReferencedUserAssetIds(scope);

    expect([...result].sort()).toEqual(["d1", "n1"]);
  });

  test("四路都空时返回空集合", () => {
    const scope = {
      nodes: [],
      projectMeasurements: null,
      schemes: [],
      currentDeviceLibraryPersistencePayload: () => null
    };

    expect(createReferencedUserAssetIds(scope).size).toBe(0);
  });
});

describe("快照合并", () => {
  const empty = { deviceLibrary: {}, imageLibrary: { assets: [] } } as any;

  test("replace 模式以导入方为准", () => {
    const imported = { deviceLibrary: { customCategoryLibraries: [{ name: "库" }] } } as any;

    const result = mergeUserCustomizationSnapshots(empty, imported, "replace");

    expect(result.deviceLibrary.customCategoryLibraries).toHaveLength(1);
  });

  test("merge 模式不丢当前已有的自定义元件模板", () => {
    const current = { deviceLibrary: { customDeviceTemplates: [{ id: "t1", kind: "ac-a" }] } } as any;
    const imported = { deviceLibrary: { customCategoryLibraries: [{ id: "c2", name: "新来" }] } } as any;

    const result = mergeUserCustomizationSnapshots(current, imported, "incremental");

    expect(result.deviceLibrary.customDeviceTemplates).toHaveLength(1);
  });

  test("merge 模式同 id 时以导入方为准（只留一条）", () => {
    const current = { deviceLibrary: { customCategoryLibraries: [{ id: "c1", name: "原有" }] } } as any;
    const imported = { deviceLibrary: { customCategoryLibraries: [{ id: "c1", name: "覆盖" }] } } as any;

    const result = mergeUserCustomizationSnapshots(current, imported, "incremental");

    expect(result.deviceLibrary.customCategoryLibraries).toHaveLength(1);
  });

  test("工厂是单源委托：结果与直接调用一致", () => {
    const current = { deviceLibrary: { customCategoryLibraries: [{ name: "原有" }] } } as any;
    const imported = { deviceLibrary: { customCategoryLibraries: [{ name: "新来" }] } } as any;

    expect(createMergedUserCustomizationSnapshot(current, imported, "incremental")).toEqual(
      mergeUserCustomizationSnapshots(current, imported, "incremental")
    );
  });

  test("导入为空时结果与当前一致", () => {
    const current = { deviceLibrary: { customCategoryLibraries: [{ name: "原有" }] } } as any;

    const result = mergeUserCustomizationSnapshots(current, {}, "incremental");

    expect(result.deviceLibrary.customCategoryLibraries).toHaveLength(1);
  });
});
