import { describe, expect, test } from "vitest";
import {
  COMPONENT_LIBRARY_MAX_TERMINALS,
  componentLibraryDefinitionFromMetadata,
  resolveComponentLibraryClassFamilyMetadata,
  resolveComponentLibraryClassMetadata
} from "./componentLibraryMetadata";

describe("component library class metadata", () => {
  test("derived classes inherit structural metadata and persist no duplicate structural fields", () => {
    const definitions = [
      {
        name: "UserBase",
        categoryLibraryName: "用户设备",
        label: "用户基类",
        isDerivedComponentLibrary: false,
        isContainerComponentLibrary: false,
        terminalCount: 2,
        terminalTypes: ["ac", "dc"],
        terminalLabels: ["交流端", "直流端"],
        terminalRoles: ["single-source", "single-load"],
        terminalAssociations: ["ac-generator", "dc-load"]
      },
      {
        name: "UserDerived",
        categoryLibraryName: "用户设备",
        label: "用户派生类",
        isDerivedComponentLibrary: true,
        derivedFromComponentLibrary: "UserBase",
        isContainerComponentLibrary: true,
        terminalCount: 1,
        terminalTypes: ["h2"],
        terminalLabels: ["不应采用的旧端子"]
      }
    ] as any;

    const metadata = resolveComponentLibraryClassMetadata(
      "UserDerived",
      "用户设备",
      definitions,
      []
    );

    expect(metadata).toMatchObject({
      className: "UserDerived",
      baseComponentLibrary: "UserBase",
      isDerivedComponentLibrary: true,
      isContainer: false,
      terminalCount: 2,
      terminalTypes: ["ac", "dc"],
      terminalLabels: ["交流端", "直流端"],
      terminalRoles: ["single-source", "single-load"],
      terminalAssociations: ["ac-generator", "dc-load"]
    });

    const storedDefinition = componentLibraryDefinitionFromMetadata(metadata!);
    expect(storedDefinition).toEqual({
      name: "UserDerived",
      categoryLibraryName: "用户设备",
      label: "用户派生类",
      isDerivedComponentLibrary: true,
      derivedFromComponentLibrary: "UserBase"
    });
  });

  test("rejects cyclic derived-class relationships", () => {
    const definitions = [
      {
        name: "ClassA",
        categoryLibraryName: "用户设备",
        isDerivedComponentLibrary: true,
        derivedFromComponentLibrary: "ClassB"
      },
      {
        name: "ClassB",
        categoryLibraryName: "用户设备",
        isDerivedComponentLibrary: true,
        derivedFromComponentLibrary: "ClassA"
      }
    ] as any;

    expect(resolveComponentLibraryClassMetadata("ClassA", "用户设备", definitions, [])).toBeNull();
    expect(resolveComponentLibraryClassMetadata("ClassB", "用户设备", definitions, [])).toBeNull();
  });

  test("returns only the selected component-library family including nested derived classes", () => {
    const definitions = [
      {
        name: "UserWindGen",
        categoryLibraryName: "交流设备",
        label: "用户风电",
        isDerivedComponentLibrary: true,
        derivedFromComponentLibrary: "ACGenerator"
      },
      {
        name: "OffshoreWindGen",
        categoryLibraryName: "交流设备",
        label: "海上风电",
        isDerivedComponentLibrary: true,
        derivedFromComponentLibrary: "UserWindGen"
      },
      {
        name: "UserBranch",
        categoryLibraryName: "交流设备",
        label: "用户支路",
        isDerivedComponentLibrary: true,
        derivedFromComponentLibrary: "ACBranch"
      }
    ] as any;
    const templates = [
      {
        kind: "ac-source",
        label: "交流电源",
        componentClass: "ACGenerator",
        categoryLibrary: "交流设备",
        params: { component_type: "ACGenerator" },
        terminalType: "ac",
        terminalCount: 1,
        terminalTypes: ["ac"]
      },
      {
        kind: "ac-branch",
        label: "交流线路",
        componentClass: "ACBranch",
        categoryLibrary: "交流设备",
        params: { component_type: "ACBranch" },
        terminalType: "ac",
        terminalCount: 2,
        terminalTypes: ["ac", "ac"]
      }
    ] as any;

    const family = resolveComponentLibraryClassFamilyMetadata(
      "UserWindGen",
      "交流设备",
      definitions,
      templates
    );

    expect(family.map((metadata) => metadata.className)).toEqual([
      "ACGenerator",
      "UserWindGen",
      "OffshoreWindGen"
    ]);
    expect(family.map((metadata) => metadata.className)).not.toContain("ACBranch");
    expect(family.map((metadata) => metadata.className)).not.toContain("UserBranch");
  });

  test("recovers a family root hidden by a historical concrete-template class override", () => {
    const definitions = [{
      name: "TestGen2",
      categoryLibraryName: "交流设备",
      label: "派生发电机",
      isDerivedComponentLibrary: true,
      derivedFromComponentLibrary: "ACGenerator"
    }] as any;
    const templates = [{
      kind: "ac-source",
      label: "被历史覆盖的交流电源",
      componentClass: "CorruptedDerivedClass",
      categoryLibrary: "交流设备",
      params: { component_type: "ACGenerator" },
      isDerivedComponentLibrary: true,
      derivedFromComponentLibrary: "ACRealBs",
      derivedComponentLibrary: "CorruptedDerivedClass",
      terminalType: "ac",
      terminalCount: 1,
      terminalTypes: ["ac"]
    }, {
      kind: "ac-hydro-source",
      label: "交流水力发电机",
      componentClass: "ACHydroGen",
      categoryLibrary: "交流设备",
      params: { component_type: "ACGenerator" },
      isDerivedComponentLibrary: true,
      derivedFromComponentLibrary: "ACGenerator",
      derivedComponentLibrary: "ACHydroGen",
      terminalType: "ac",
      terminalCount: 1,
      terminalTypes: ["ac"]
    }] as any;

    const familyFromDerived = resolveComponentLibraryClassFamilyMetadata(
      "ACHydroGen",
      "交流设备",
      definitions,
      templates
    );
    const familyFromMissingRoot = resolveComponentLibraryClassFamilyMetadata(
      "ACGenerator",
      "交流设备",
      definitions,
      templates
    );

    expect(familyFromDerived.map((metadata) => metadata.className)).toEqual([
      "ACGenerator",
      "ACHydroGen",
      "TestGen2"
    ]);
    expect(familyFromMissingRoot.map((metadata) => metadata.className)).toEqual([
      "ACGenerator",
      "ACHydroGen",
      "TestGen2"
    ]);
    expect(familyFromMissingRoot[0]).toMatchObject({
      className: "ACGenerator",
      isDerivedComponentLibrary: false,
      baseComponentLibrary: "ACGenerator",
      terminalTypes: ["ac"]
    });
  });
});

// 下面这组覆盖「元数据解析的边界」：端子数归一、类名缺失、派生链断口。
// 全部通过 resolveComponentLibraryClassMetadata 观察 —— normalizeTerminalCount
// 本身未导出（是内部实现），但它的三条归一规则决定了派生出的四组端子数组长度，
// 而这四个数组长度不一致会让「按索引取端子类型」拿到 undefined。
describe("端子数归一（normalizeTerminalCount 的三条规则，经元数据观察）", () => {
  const definitionFor = (extra: Record<string, unknown>) => [{
    name: "ProbeClass",
    categoryLibraryName: "用户设备",
    label: "探针类",
    isDerivedComponentLibrary: false,
    ...extra
  }] as any;

  test("缺省为 2（四组端子数组长度一致）", () => {
    const metadata = resolveComponentLibraryClassMetadata("ProbeClass", "用户设备", definitionFor({}), [])!;
    expect(metadata.terminalCount).toBe(2);
    expect(metadata.terminalTypes).toHaveLength(2);
    expect(metadata.terminalLabels).toHaveLength(2);
    expect(metadata.terminalRoles).toHaveLength(2);
    expect(metadata.terminalAssociations).toHaveLength(2);
  });

  test("小数四舍五入到整数（不是截断）", () => {
    // Math.round(2.6) = 3、Math.round(2.4) = 2
    expect(resolveComponentLibraryClassMetadata("ProbeClass", "用户设备", definitionFor({ terminalCount: 2.6 }), [])!.terminalCount).toBe(3);
    expect(resolveComponentLibraryClassMetadata("ProbeClass", "用户设备", definitionFor({ terminalCount: 2.4 }), [])!.terminalCount).toBe(2);
    // 恰好 .5 时 Math.round 向上（不是银行家舍入）
    expect(resolveComponentLibraryClassMetadata("ProbeClass", "用户设备", definitionFor({ terminalCount: 2.5 }), [])!.terminalCount).toBe(3);
  });

  test("非数值退回默认 2（NaN / 非数值字符串 / 键缺省）", () => {
    // 判据是 Number.isFinite(Number(value))：NaN 才退回。
    for (const terminalCount of ["不是数字", Number.NaN, undefined]) {
      const metadata = resolveComponentLibraryClassMetadata(
        "ProbeClass",
        "用户设备",
        definitionFor({ terminalCount }),
        []
      )!;
      expect(metadata.terminalCount, JSON.stringify(terminalCount ?? null)).toBe(2);
    }
    // 字符串数值仍被解析（前端存的是字符串）
    expect(resolveComponentLibraryClassMetadata("ProbeClass", "用户设备", definitionFor({ terminalCount: "4" }), [])!.terminalCount).toBe(4);
  });

  test("null 与空串被 Number() 折成 0，是「0 个端子」而非「缺省 2」", () => {
    // Number(null) === 0、Number("") === 0 —— 不是 NaN，故走「0 个端子」那条路。
    // 与 atLeastOneNumber 是同一种判据分叉：那边 0 退回 fallback，这边 0 是合法值。
    // 若日后有人给归一加 `value == null || value === ""` 的显式判缺值，本条会先红。
    for (const terminalCount of [null, ""]) {
      const metadata = resolveComponentLibraryClassMetadata(
        "ProbeClass",
        "用户设备",
        definitionFor({ terminalCount }),
        []
      )!;
      expect(metadata.terminalCount, JSON.stringify(terminalCount)).toBe(0);
    }
  });

  test("上限夹到 COMPONENT_LIBRARY_MAX_TERMINALS，超出部分不建端子", () => {
    const metadata = resolveComponentLibraryClassMetadata(
      "ProbeClass",
      "用户设备",
      definitionFor({ terminalCount: 99 }),
      []
    )!;
    expect(metadata.terminalCount).toBe(COMPONENT_LIBRARY_MAX_TERMINALS);
    expect(metadata.terminalTypes).toHaveLength(COMPONENT_LIBRARY_MAX_TERMINALS);
    // 上限同时决定了 appDeviceDefinitionFactories 里那批 Array.from({length: MAX}) 的长度
    expect(COMPONENT_LIBRARY_MAX_TERMINALS).toBe(8);
  });

  test("负数夹到 0（不是退回默认 2）", () => {
    // Math.max(0, ...) —— 下限是 0 而非 fallback，故负数得到 0 个端子
    const metadata = resolveComponentLibraryClassMetadata("ProbeClass", "用户设备", definitionFor({ terminalCount: -5 }), [])!;
    expect(metadata.terminalCount).toBe(0);
    expect(metadata.terminalTypes).toEqual([]);
  });

  test("0 个端子是合法形态（无端子图元）", () => {
    const metadata = resolveComponentLibraryClassMetadata("ProbeClass", "用户设备", definitionFor({ terminalCount: 0 }), [])!;
    expect(metadata.terminalCount).toBe(0);
    expect(metadata.terminalRoles).toEqual([]);
    expect(metadata.terminalAssociations).toEqual([]);
  });
});

describe("类名与派生链的边界", () => {
  test("空类名 / 空白类名返回 null", () => {
    const definitions = [{ name: "RealClass", categoryLibraryName: "用户设备" }] as any;
    expect(resolveComponentLibraryClassMetadata("", "用户设备", definitions, [])).toBeNull();
    expect(resolveComponentLibraryClassMetadata("   ", "用户设备", definitions, [])).toBeNull();
    expect(resolveComponentLibraryClassMetadata(undefined, "用户设备", definitions, [])).toBeNull();
  });

  test("未登记的类名返回 null（不会凭空造一个元数据）", () => {
    const definitions = [{ name: "RealClass", categoryLibraryName: "用户设备" }] as any;
    expect(resolveComponentLibraryClassMetadata("GhostClass", "用户设备", definitions, [])).toBeNull();
  });

  test("族解析：空类名返回空数组", () => {
    expect(resolveComponentLibraryClassFamilyMetadata("", "用户设备", [], [])).toEqual([]);
    expect(resolveComponentLibraryClassFamilyMetadata("  ", "用户设备", [], [])).toEqual([]);
    expect(resolveComponentLibraryClassFamilyMetadata(undefined, "用户设备", [], [])).toEqual([]);
  });

  test("族解析：类名不存在时返回空数组（不抛错）", () => {
    expect(resolveComponentLibraryClassFamilyMetadata("GhostClass", "用户设备", [], [])).toEqual([]);
  });

  test("派生类缺基类名返回 null（否则会建出一个指向空串的派生关系）", () => {
    const definitions = [{
      name: "OrphanDerived",
      categoryLibraryName: "用户设备",
      isDerivedComponentLibrary: true,
      derivedFromComponentLibrary: "   "
    }] as any;
    expect(resolveComponentLibraryClassMetadata("OrphanDerived", "用户设备", definitions, [])).toBeNull();
  });

  test("派生类基类在库中不存在时仍能解析出根元数据（历史数据容错）", () => {
    // 基类查不到时返回 null 会让整个派生类不可用；实现选择造一个根元数据兜底。
    // 若日后有人改成严格 null，本条会先红 —— 那是一次行为变更，不该悄悄发生。
    const definitions = [{
      name: "LostBaseDerived",
      categoryLibraryName: "用户设备",
      label: "丢了基类的派生类",
      isDerivedComponentLibrary: true,
      derivedFromComponentLibrary: "NeverDefinedBase",
      terminalCount: 2
    }] as any;
    const metadata = resolveComponentLibraryClassMetadata("LostBaseDerived", "用户设备", definitions, [])!;
    expect(metadata).not.toBeNull();
    expect(metadata.isDerivedComponentLibrary).toBe(true);
    expect(metadata.baseComponentLibrary).toBe("NeverDefinedBase");
  });

  test("分类不匹配时不串库（同名的两个分类各归各的元数据）", () => {
    const definitions = [
      { name: "SameName", categoryLibraryName: "交流设备", label: "交流版", terminalCount: 1 },
      { name: "SameName", categoryLibraryName: "直流设备", label: "直流版", terminalCount: 3 }
    ] as any;
    expect(resolveComponentLibraryClassMetadata("SameName", "交流设备", definitions, [])!.label).toBe("交流版");
    expect(resolveComponentLibraryClassMetadata("SameName", "直流设备", definitions, [])!.label).toBe("直流版");
    // 指定了不存在的分类 ⇒ 两个都不匹配 ⇒ null（不默认取第一个）
    expect(resolveComponentLibraryClassMetadata("SameName", "热力设备", definitions, [])).toBeNull();
  });
});

describe("端子类型补齐：数组比端子数短时用分类兜底类型", () => {
  test("缺项回落到分类库推出的默认端子类型与其默认关联", () => {
    const definitions = [{
      name: "ShortTypesClass",
      categoryLibraryName: "直流设备",
      terminalCount: 3,
      terminalTypes: ["ac"]
    }] as any;
    const metadata = resolveComponentLibraryClassMetadata("ShortTypesClass", "直流设备", definitions, [])!;
    expect(metadata.terminalTypes).toEqual(["ac", "dc", "dc"]);
    // 关联跟随补齐后的端子类型，不是跟随定义里写的那个
    expect(metadata.terminalAssociations).toEqual(["ac-load", "dc-load", "dc-load"]);
  });

  test("定义里的端子类型非法时整项回落到默认类型（不是部分保留）", () => {
    const definitions = [{
      name: "BadTypesClass",
      categoryLibraryName: "热力设备",
      terminalCount: 2,
      terminalTypes: ["xx", "h2"]
    }] as any;
    const metadata = resolveComponentLibraryClassMetadata("BadTypesClass", "热力设备", definitions, [])!;
    expect(metadata.terminalTypes).toEqual(["heat", "h2"]);
  });

  test("端子标签/角色缺项分别补空串与 single-load（不留 undefined）", () => {
    const definitions = [{
      name: "SparseClass",
      categoryLibraryName: "用户设备",
      terminalCount: 3,
      terminalLabels: ["只有一个"],
      terminalRoles: ["single-source"]
    }] as any;
    const metadata = resolveComponentLibraryClassMetadata("SparseClass", "用户设备", definitions, [])!;
    expect(metadata.terminalLabels).toEqual(["只有一个", "", ""]);
    expect(metadata.terminalRoles).toEqual(["single-source", "single-load", "single-load"]);
    for (const value of metadata.terminalLabels) {
      expect(typeof value).toBe("string");
    }
  });
});
