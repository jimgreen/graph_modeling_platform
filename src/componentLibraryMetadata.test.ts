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

// ---------------------------------------------------------------------------
// 以下两组覆盖内部归一函数的零覆盖分支。normalizeFlag / normalizeTerminalCount
// 都不是 export（L31 / L37），唯一观察口是 resolveComponentLibraryClassMetadata：
//   normalizeFlag        ← definition.isDerivedComponentLibrary（→ isDerivedComponentLibrary）
//                           与 definition.isContainerComponentLibrary（→ isContainer）
//   normalizeTerminalCount ← definition.terminalCount（→ terminalCount）
// 三个字段在返回对象里都是**未经二次加工的归一结果**（L177 / L179 / L184），
// 故断言它们即为直接断言归一函数。
//
// ⚠️ 观察口径的两个坑，写在这里免得后人重新踩：
//   ① 只有当 definition 上该字段 !== undefined 时才走 normalizeFlag（见 L118 / L167）。
//      字段缺省会绕开它落到 Boolean(derivedInfo) / Boolean(template.isContainer)，
//      那条路上同样的输入可能得到同样的结果却根本没调用被测函数 —— 所以下面
//      「undefined」一条用模板 isContainer 制造出与 normalizeFlag 相反的期望值，
//      才能证明走的是哪条分支。
//   ② isDerivedComponentLibrary 一旦为 true，元数据会去继承基类的 terminalCount /
//      isContainer（L128-140），normalizeTerminalCount 就被 inheritedMetadata?.terminalCount
//      短路掉了。所以端子数一组全部用 isDerivedComponentLibrary: false 的非派生类观察。
// ---------------------------------------------------------------------------

describe("布尔标记归一 normalizeFlag", () => {
  // isContainerComponentLibrary 走 L167-169 这条最短的观察口：非派生类时
  // isContainer = normalizeFlag(字段)，没有继承、没有二次加工。
  const containerFlag = (raw: unknown) => resolveComponentLibraryClassMetadata(
    "FlagProbe",
    "用户设备",
    [{
      name: "FlagProbe",
      categoryLibraryName: "用户设备",
      isDerivedComponentLibrary: false,
      isContainerComponentLibrary: raw
    }] as any,
    []
  )!.isContainer;

  test("四个真值串与布尔 true 都归一为 true", () => {
    // 判据是 L34 的四元 or：trim + toLowerCase 后等于 1 / true / yes / 是
    for (const raw of ["1", "true", "yes", "是"]) {
      expect(containerFlag(raw), JSON.stringify(raw)).toBe(true);
    }
    // typeof === boolean 在 L32 就早退了，不经字符串判据 —— 但结果同为 true
    expect(containerFlag(true)).toBe(true);
    // 数字 1 也为真：String(1) === "1" 命中同一判据（说明这不是布尔专用分支）
    expect(containerFlag(1)).toBe(true);
  });

  test("四个假值串、空串与 null 都归一为 false", () => {
    // 假值是「不命中四元 or」的默认结果，不是另一条显式判据 —— 实现里没有假值白名单
    for (const raw of ["0", "false", "no", "否"]) {
      expect(containerFlag(raw), JSON.stringify(raw)).toBe(false);
    }
    // 空串：String("" ?? "") === "" → trim 后 "" → 不命中 → false
    expect(containerFlag("")).toBe(false);
    // null：String(null ?? "") === "" → 同上。注意 Number(null) 是 0 那种坑不在此函数
    expect(containerFlag(null)).toBe(false);
  });

  test("undefined 不经 normalizeFlag，落到模板的 isContainer 分支", () => {
    // L167 的判据是 `!== undefined`，所以字段为 undefined 时 normalizeFlag 压根不被调用，
    // 而是走 Boolean(template?.isContainer)。这里给模板 isContainer: true：
    // 若真的调了 normalizeFlag(undefined)，结果会是 false；得到 true 即证明走了模板分支。
    // 这条同时钉住「undefined 不是真值」这个容易被误读的点。
    const metadata = resolveComponentLibraryClassMetadata(
      "FlagProbe",
      "用户设备",
      [{ name: "FlagProbe", categoryLibraryName: "用户设备", isDerivedComponentLibrary: false }] as any,
      [{ kind: "custom-probe", label: "探针模板", componentClass: "FlagProbe", categoryLibrary: "用户设备", isContainer: true }] as any
    )!;
    expect(metadata.isContainer).toBe(true);

    // 反证：同一个模板，去掉 isContainer 后就是 false；证明上一条不是因为别的原因为真
    const withoutFlag = resolveComponentLibraryClassMetadata(
      "FlagProbe",
      "用户设备",
      [{ name: "FlagProbe", categoryLibraryName: "用户设备", isDerivedComponentLibrary: false }] as any,
      [{ kind: "custom-probe", label: "探针模板", componentClass: "FlagProbe", categoryLibrary: "用户设备" }] as any
    )!;
    expect(withoutFlag.isContainer).toBe(false);
  });

  test("已定义但为假的标记仍走 normalizeFlag，不被模板的 isContainer 顶掉", () => {
    // ⚠️ 这条是 L167 那个 `!== undefined` 守卫的**唯一**有牙齿的断言。
    // 判据取 `!== undefined` 而非 truthiness，正是为了区分这三类值：
    //   字段缺省 / undefined → 不调用 normalizeFlag，落到 Boolean(template.isContainer)
    //   字段已定义但为假（"" / null / false）→ **调用** normalizeFlag ⇒ 恒为 false
    // 只断言「结果为 false」看不出来，因为模板 isContainer 为 true 时两条路都是……不对，
    // 恰恰相反：模板 isContainer: true 时，若守卫被改成 truthiness 判断，
    // "" / null / false 会绕开 normalizeFlag 而得到 **true**，与下面的断言相反。
    // 所以模板必须给 isContainer: true —— 那样这条断言才有判别力。
    const containerFlagWithTemplate = (raw: unknown) => resolveComponentLibraryClassMetadata(
      "FlagProbe",
      "用户设备",
      [{
        name: "FlagProbe",
        categoryLibraryName: "用户设备",
        isDerivedComponentLibrary: false,
        isContainerComponentLibrary: raw
      }] as any,
      [{ kind: "custom-probe", label: "探针模板", componentClass: "FlagProbe", categoryLibrary: "用户设备", isContainer: true }] as any
    )!.isContainer;

    // 已定义但为假 ⇒ 走 normalizeFlag ⇒ false（而不是模板的 true）
    for (const raw of ["", null, false, "0", "false", "no", "否"]) {
      expect(containerFlagWithTemplate(raw), JSON.stringify(raw)).toBe(false);
    }
    // 对照：已定义且为真 ⇒ 也是 normalizeFlag 的 true，与模板同值但来源不同
    for (const raw of ["1", "true", "yes", "是", true]) {
      expect(containerFlagWithTemplate(raw), JSON.stringify(raw)).toBe(true);
    }
    // 把守卫从 `!== undefined` 改成 truthiness，上面那个假值循环会整体变红。
  });

  test("歧义输入：空白与大小写被吸收，全角数字与全角 TRUE 未被处理", () => {
    // trim + toLowerCase 两条都生效：
    expect(containerFlag("  1  ")).toBe(true);
    expect(containerFlag("True")).toBe(true);
    expect(containerFlag("YES")).toBe(true);
    // 换行/制表符同样被 String.trim 吸收
    expect(containerFlag("\t是\n")).toBe(true);

    // ⚠️ 未被处理的两类输入（当前真实行为 = false，如实记录）：
    //  ① 全角字符。toLowerCase 不做 NFKC 全角折叠，故 "１" 与 "ＴＲＵＥ" 都不命中四元 or。
    expect(containerFlag("１")).toBe(false);
    expect(containerFlag("ＴＲＵＥ")).toBe(false);
    //  ② 中文「真」。判据只认「是」，「真」是 false。
    expect(containerFlag("真")).toBe(false);
    //  若日后有人加全角折叠或改用 NFKC，上面三条会先红 —— 那是一次行为变更。
  });

  test("isDerivedComponentLibrary 走同一个 normalizeFlag", () => {
    // 另一个调用点（L119）。这里必须带基类，否则 L126 会因基类名缺失返回 null。
    const derivedMetadata = (flag: unknown) => resolveComponentLibraryClassMetadata(
      "FlagDerived",
      "用户设备",
      [
        { name: "FlagBase", categoryLibraryName: "用户设备", isDerivedComponentLibrary: false, terminalCount: 2 },
        {
          name: "FlagDerived",
          categoryLibraryName: "用户设备",
          isDerivedComponentLibrary: flag,
          derivedFromComponentLibrary: "FlagBase",
          terminalCount: 3
        }
      ] as any,
      []
    );

    // ⚠️ 判别力来自 terminalCount 这个**翻转**：FlagDerived 自己声明 terminalCount: 3，
    // 基类 FlagBase 是 2。同一个 fixture 下 flag 为真 ⇒ 继承基类的 2（L128-134）；
    // flag 为假 ⇒ inheritedMetadata 为 null，L148 改用自己声明的 3。
    // 只断言 isDerivedComponentLibrary 的话，它是被测值的直接回显，恒定不变也能过，
    // 而 terminalCount 的翻转证明 normalizeFlag 的结果真的改变了下游走向。
    // 顺带记录一个曾踩的坑：baseComponentLibrary 两种情况下都是 FlagBase ——
    // 声明的基类名优先于 L124 的 className 兜底，故此处不能拿它当派生与否的判据。
    for (const flag of ["1", "true", "yes", "是", true]) {
      const metadata = derivedMetadata(flag)!;
      expect(metadata.isDerivedComponentLibrary, JSON.stringify(flag)).toBe(true);
      expect(metadata.terminalCount, JSON.stringify(flag)).toBe(2);
    }
    for (const flag of ["0", "false", "no", "否", "", null]) {
      const metadata = derivedMetadata(flag)!;
      expect(metadata.isDerivedComponentLibrary, JSON.stringify(flag)).toBe(false);
      expect(metadata.terminalCount, JSON.stringify(flag)).toBe(3);
    }
  });

  test("已定义但为假的 isDerivedComponentLibrary 仍走 normalizeFlag，不被 derivedInfo 顶掉", () => {
    // ⚠️ 这是 L118 那个 `!== undefined` 守卫的**唯一**有牙齿的断言，理由与
    // isContainerComponentLibrary 那条完全对称：守卫取 `!== undefined` 而非
    // truthiness，才区分得开「字段缺省（→ Boolean(derivedInfo)）」与
    // 「字段已定义为假（→ normalizeFlag，恒 false）」。
    // 所以模板必须**能产出 derivedInfo**，否则两条路都是 false，断言恒绿。
    const derivedFlagWithTemplate = (flag: unknown) => resolveComponentLibraryClassMetadata(
      "DerivedFlagProbe",
      "用户设备",
      [{
        name: "DerivedFlagProbe",
        categoryLibraryName: "用户设备",
        isDerivedComponentLibrary: flag,
        derivedFromComponentLibrary: "FlagBase",
        terminalCount: 3
      }] as any,
      [{
        kind: "ac-hydro-source",
        label: "能产出 derivedInfo 的模板",
        componentClass: "DerivedFlagProbe",
        categoryLibrary: "用户设备",
        // model.ts L3240-3244：base 与 derived 都有值且不等 ⇒ derivedInfo 非空
        params: { component_type: "DerivedFlagProbe" },
        derivedFromComponentLibrary: "FlagBase",
        derivedComponentLibrary: "DerivedFlagProbe"
      }] as any
    )!;

    // 前置自检：确认这条 fixture 真的能产出 derivedInfo，否则下面的断言没有判别力。
    // 把 flag 整个删掉（→ 守卫短路到 Boolean(derivedInfo)）应当得到 true。
    const viaDerivedInfo = resolveComponentLibraryClassMetadata(
      "DerivedFlagProbe",
      "用户设备",
      [{ name: "DerivedFlagProbe", categoryLibraryName: "用户设备", derivedFromComponentLibrary: "FlagBase", terminalCount: 3 }] as any,
      [{
        kind: "ac-hydro-source",
        label: "能产出 derivedInfo 的模板",
        componentClass: "DerivedFlagProbe",
        categoryLibrary: "用户设备",
        params: { component_type: "DerivedFlagProbe" },
        derivedFromComponentLibrary: "FlagBase",
        derivedComponentLibrary: "DerivedFlagProbe"
      }] as any
    )!;
    expect(viaDerivedInfo.isDerivedComponentLibrary).toBe(true);

    // 已定义但为假 ⇒ 走 normalizeFlag ⇒ false，而**不是** derivedInfo 的 true
    for (const flag of ["", null, false, "0", "false", "no", "否"]) {
      expect(derivedFlagWithTemplate(flag).isDerivedComponentLibrary, JSON.stringify(flag)).toBe(false);
    }
    // 守卫若被改成 truthiness，上面整个循环会变红（拿到 true）。
  });
});

describe("端子数归一 normalizeTerminalCount", () => {
  // 观察口：非派生类（isDerivedComponentLibrary: false）的 definition.terminalCount。
  // 此时 L148 的 inheritedMetadata?.terminalCount 为 null，normalizeTerminalCount 必定被调用。
  const countFor = (raw: unknown) => resolveComponentLibraryClassMetadata(
    "CountProbe",
    "用户设备",
    [{
      name: "CountProbe",
      categoryLibraryName: "用户设备",
      isDerivedComponentLibrary: false,
      terminalCount: raw
    }] as any,
    []
  )!.terminalCount;

  test("合法数值与数字字符串按原值透传", () => {
    expect(countFor(5)).toBe(5);
    expect(countFor("3")).toBe(3);   // 前端存的是字符串，Number("3") 解析成功
    expect(countFor(0)).toBe(0);
    // 带空白的数字串同样被 Number 解析（注意此处走的是 Number 不是 normalizeName）
    expect(countFor("  4  ")).toBe(4);
  });

  test("非有限值退回 fallback 2，包括 Infinity", () => {
    // 判据是 Number.isFinite(Number(value))，所以 Infinity 也退回而非夹到上限
    for (const raw of [Number.NaN, Infinity, -Infinity, "不是数字", undefined]) {
      expect(countFor(raw), String(raw)).toBe(2);
    }
    // ⚠️ 对照组：null 与空串不是 NaN（Number 折成 0），故得到 0 个端子而非 fallback。
    // 若有人给归一加显式判缺值，这条与上面的 NaN 组会同时变红。
    expect(countFor(null)).toBe(0);
    expect(countFor("")).toBe(0);
  });

  test("小数按 Math.round 四舍五入，不是截断", () => {
    expect(countFor(3.7)).toBe(4);
    expect(countFor(3.2)).toBe(3);
    expect(countFor(3.5)).toBe(4);
    // 负小数先四舍五入再被下限夹到 0（顺序是 round → clamp，不是 clamp → round）
    expect(countFor(-0.4)).toBe(0);
  });

  test("负数被下限夹到 0，而不是退回 fallback", () => {
    // Math.max(0, ...) 的下限是 0，与 NaN 路径的 fallback 2 是两回事
    expect(countFor(-2)).toBe(0);
    expect(countFor(-1)).toBe(0);
    // 对照：非有限值才会拿到 2 —— 证明 -2 得到 0 不是因为走了 fallback
    expect(countFor(Number.NaN)).toBe(2);
  });

  test("上限 clamp 生效：上界与上界 +1 同值，上界 -1 与上界 +1 异值", () => {
    // ⚠️ 边界口径说明（与任务提示相反，故记录在此）：clamp 到上界的函数在
    // 「恰好等于上界」与「上界 +1」处必然同值 —— 这正是 clamp 生效的证据，
    // 不是缺陷。真正有判别力的是「上界 -1 vs 上界 +1」两侧不同。
    expect(countFor(COMPONENT_LIBRARY_MAX_TERMINALS)).toBe(COMPONENT_LIBRARY_MAX_TERMINALS);
    expect(countFor(COMPONENT_LIBRARY_MAX_TERMINALS + 1)).toBe(COMPONENT_LIBRARY_MAX_TERMINALS);
    expect(countFor(99)).toBe(COMPONENT_LIBRARY_MAX_TERMINALS);
    expect(countFor(1000)).toBe(COMPONENT_LIBRARY_MAX_TERMINALS);

    // 有判别力的那对：夹住之前与之后不同
    const below = countFor(COMPONENT_LIBRARY_MAX_TERMINALS - 1);
    const above = countFor(COMPONENT_LIBRARY_MAX_TERMINALS + 1);
    expect(below).not.toBe(above);
    expect(below).toBe(COMPONENT_LIBRARY_MAX_TERMINALS - 1);

    // 去掉 clamp（即恒等返回）会让本条转红：99 会变成 99 而非 8
  });

  test("超出上限的部分不建端子（clamp 在建数组之前生效）", () => {
    const metadata = resolveComponentLibraryClassMetadata(
      "CountProbe",
      "用户设备",
      [{
        name: "CountProbe",
        categoryLibraryName: "用户设备",
        isDerivedComponentLibrary: false,
        terminalCount: 9
      }] as any,
      []
    )!;
    expect(metadata.terminalCount).toBe(COMPONENT_LIBRARY_MAX_TERMINALS);
    expect(metadata.terminalTypes).toHaveLength(COMPONENT_LIBRARY_MAX_TERMINALS);
    expect(metadata.terminalLabels).toHaveLength(COMPONENT_LIBRARY_MAX_TERMINALS);
    expect(metadata.terminalRoles).toHaveLength(COMPONENT_LIBRARY_MAX_TERMINALS);
    expect(metadata.terminalAssociations).toHaveLength(COMPONENT_LIBRARY_MAX_TERMINALS);
  });
});

describe("族解析排序：先按深度、同深度按 localeCompare", () => {
  // ⚠️ localeCompare 的结果依赖运行环境的 ICU 数据（同一个数组在 full-icu 与
  // small-icu 下顺序可以不同）。故此处**不断言任何具体先后**，
  // 只断言「结果是一个按 depth 非降的数组」+「类名集合与输入一致」。
  // 这样既覆盖到排序这一步，又不会因 CI 的 ICU 版本不同而偶发红。
  const definitions = [
    { name: "SortRoot", categoryLibraryName: "交流设备", label: "排序根", isDerivedComponentLibrary: false, terminalCount: 2 },
    { name: "SortChildB", categoryLibraryName: "交流设备", label: "子B", isDerivedComponentLibrary: true, derivedFromComponentLibrary: "SortRoot" },
    { name: "SortChildA", categoryLibraryName: "交流设备", label: "子A", isDerivedComponentLibrary: true, derivedFromComponentLibrary: "SortRoot" },
    { name: "SortGrandChild", categoryLibraryName: "交流设备", label: "孙", isDerivedComponentLibrary: true, derivedFromComponentLibrary: "SortChildA" }
  ] as any;

  const depthOf = (className: string) =>
    className === "SortRoot" ? 0
      : className === "SortGrandChild" ? 2
        : 1;

  test("结果按 depth 非降排列", () => {
    const family = resolveComponentLibraryClassFamilyMetadata("SortRoot", "交流设备", definitions, []);
    expect(family.length).toBe(4);
    const depths = family.map((metadata) => depthOf(metadata.className));
    // 非降即已足够：它约束的是 L317 的首个比较项 left.depth - right.depth，
    // 与 ICU 无关。反序（降序）会让这条转红。
    for (let index = 1; index < depths.length; index += 1) {
      expect(depths[index], `第 ${index} 项深度`).toBeGreaterThanOrEqual(depths[index - 1]);
    }
    // 根必然在首位（depth 0 唯一），这一条不依赖 ICU
    expect(family[0].className).toBe("SortRoot");
    // 孙类（depth 2）必然在末位
    expect(family[family.length - 1].className).toBe("SortGrandChild");
  });

  test("同深度的兄弟节点都保留，顺序不敏感", () => {
    const family = resolveComponentLibraryClassFamilyMetadata("SortRoot", "交流设备", definitions, []);
    // 用集合比较吸收 localeCompare 的环境差异：候选一个不落、也不多
    expect([...family.map((metadata) => metadata.className)].sort()).toEqual([
      "SortChildA",
      "SortChildB",
      "SortGrandChild",
      "SortRoot"
    ]);
    // 两个同深度兄弟（SortChildA / SortChildB）都在结果里 —— 覆盖到 tie-break 分支被走到
    expect(family.map((metadata) => metadata.className)).toContain("SortChildA");
    expect(family.map((metadata) => metadata.className)).toContain("SortChildB");
    // 无关分类的类不进族
    expect(resolveComponentLibraryClassFamilyMetadata("SortRoot", "直流设备", definitions, []).length).toBe(0);
  });

  test("族内每个成员的元数据都已解析完成（排序不会漏掉成员）", () => {
    const family = resolveComponentLibraryClassFamilyMetadata("SortRoot", "交流设备", definitions, []);
    for (const metadata of family) {
      expect(metadata).not.toBeNull();
      expect(typeof metadata.className).toBe("string");
      expect(metadata.categoryLibraryName).toBe("交流设备");
      // depth 0 的根与 depth 2 的孙类都该有完整结构字段
      expect(metadata.terminalTypes).toHaveLength(metadata.terminalCount);
    }
  });
});
