import { describe, expect, test } from "vitest";
import * as shared from "./device-definition-shared";
import * as legacy from "../customDeviceUtils";
import { DEVICE_LIBRARY, baseDeviceKind, templateDerivedComponentLibraryInfo } from "../model";

describe("src/export/device-definition-shared", () => {
  test("导出迁移后的关键函数", () => {
    expect(typeof shared.deviceDefinitionSharedKeyForTemplate).toBe("function");
    expect(typeof shared.normalizeSharedDeviceDefinitionOverrides).toBe("function");
    expect(typeof shared.resolveTemplateComponentLibrary).toBe("function");
    expect(typeof shared.deviceDefinitionKeyForTemplate).toBe("function");
  });

  test("customDeviceUtils 保持同一引用（不产生第二份实现）", () => {
    expect(legacy.deviceDefinitionSharedKeyForTemplate).toBe(shared.deviceDefinitionSharedKeyForTemplate);
    expect(legacy.normalizeSharedDeviceDefinitionOverrides).toBe(shared.normalizeSharedDeviceDefinitionOverrides);
    expect(legacy.resolveTemplateComponentLibrary).toBe(shared.resolveTemplateComponentLibrary);
    expect(legacy.deviceDefinitionOverrideForTemplate).toBe(shared.deviceDefinitionOverrideForTemplate);
    expect(legacy.componentClassForConcreteTemplate).toBe(shared.componentClassForConcreteTemplate);
    expect(legacy.buildEffectiveLibraryTemplates).toBe(shared.buildEffectiveLibraryTemplates);
    expect(legacy.buildBaseLibraryTemplates).toBe(shared.buildBaseLibraryTemplates);
  });
});

describe("buildEffectiveLibraryTemplates", () => {
  test("无覆盖时等于 内置库 + 自定义库 的拼接", () => {
    const custom = [{ ...DEVICE_LIBRARY[0], kind: "custom-probe", name: "探针" }];
    const out = shared.buildEffectiveLibraryTemplates(custom as any, {});
    expect(out.length).toBe(DEVICE_LIBRARY.length + 1);
    expect(out[out.length - 1].kind).toBe("custom-probe");
  });

  test("buildBaseLibraryTemplates 与生效库的前半段同源", () => {
    const base = shared.buildBaseLibraryTemplates([]);
    expect(base.length).toBe(DEVICE_LIBRARY.length);
    expect(base.map((template) => template.kind)).toEqual(DEVICE_LIBRARY.map((template) => template.kind));
  });

  test("覆盖生效：改过的参数表进入结果模板，未覆盖模板不受影响", () => {
    const target = DEVICE_LIBRARY.find((template) => !template.custom)!;
    const overrides = {
      [target.kind]: { parameterDefinitions: [{ enName: "probe_param", cnName: "探针参数" }] }
    };
    const out = shared.buildEffectiveLibraryTemplates([], overrides as any);
    const patched = out.find((template) => template.kind === target.kind)!;
    expect(JSON.stringify(patched)).toContain("probe_param");
    // 未覆盖的模板不应被改动
    const untouched = out.find((template) => template.kind !== target.kind)!;
    expect(JSON.stringify(untouched)).not.toContain("probe_param");
  });

  test("覆盖生效：端子类覆盖改写结果模板的端子", () => {
    const target = DEVICE_LIBRARY.find((template) => !template.custom)!;
    const overrides = {
      [`class:${shared.resolveTemplateComponentLibrary(target)}`]: {
        terminalTypes: ["ac", "ac", "ac"],
        terminalCount: 3
      }
    };
    const out = shared.buildEffectiveLibraryTemplates([], overrides as any);
    const patched = out.find((template) => template.kind === target.kind)!;
    expect(patched.terminalCount).toBe(3);
    expect(patched.terminalTypes?.length).toBe(3);
  });

  test("deviceDefinitionOverrideForTemplate 对无覆盖模板返回 undefined", () => {
    const target = DEVICE_LIBRARY[0];
    expect(shared.deviceDefinitionOverrideForTemplate(target, {} as any, DEVICE_LIBRARY)).toBeUndefined();
  });
});

// 下面几组此前零直接覆盖。sharedKey 决定「哪个模板的改写会串到哪些模板」——
// 判错的表现是用户在 A 模板改的参数表莫名其妙出现在 B 模板上（或该串的不串），
// 而这条路径上没有任何异常，全靠断言钉住。

describe("BUILT_IN_DEVICE_TEMPLATE_BY_KIND", () => {
  test("覆盖全部内置模板且 kind 无重复（Map 会静默吞掉重复键）", () => {
    expect(shared.BUILT_IN_DEVICE_TEMPLATE_BY_KIND.size).toBe(DEVICE_LIBRARY.length);
    expect(new Set(DEVICE_LIBRARY.map((template) => template.kind)).size).toBe(DEVICE_LIBRARY.length);
  });

  test("每一项的 kind 都等于它的键（表不是照着错位建起来的）", () => {
    for (const [kind, template] of shared.BUILT_IN_DEVICE_TEMPLATE_BY_KIND) {
      expect(template.kind, `${kind} 这一项的 kind 对不上`).toBe(kind);
    }
  });

  test("查不到的 kind 返回 undefined，不返回别的模板", () => {
    expect(shared.BUILT_IN_DEVICE_TEMPLATE_BY_KIND.get("不存在的-kind")).toBeUndefined();
  });
});

describe("deviceDefinitionSharedIdentityForTemplate", () => {
  test("带派生元件信息的模板退回基类 kind，而不是组件库名", () => {
    // 派生件（风电/光伏/储能…）共用基类的元件定义，所以身份必须落在基类 kind 上；
    // 若退化成组件库名，基类模板的改写就会漏给派生件，反之亦然。
    const derived = DEVICE_LIBRARY.filter((template) => templateDerivedComponentLibraryInfo(template) !== null);
    expect(derived.length, "内置库里应当存在派生元件模板").toBeGreaterThan(0);
    for (const template of derived) {
      expect(shared.deviceDefinitionSharedIdentityForTemplate(template)).toBe(baseDeviceKind(template.kind));
    }
  });

  test("静态图元退回自身 kind（静态库之间不该互相串改）", () => {
    const stat = DEVICE_LIBRARY.find((template) => template.kind === "static-text")!;
    expect(shared.deviceDefinitionSharedIdentityForTemplate(stat)).toBe("static-text");
  });

  test("带 dev_type 时身份为「组件库::dev_type」，清掉 dev_type 则退回组件库本身", () => {
    const withDevType = DEVICE_LIBRARY.filter((template) => String(template.params?.dev_type ?? "").trim() !== "");
    expect(withDevType.length, "内置库里应当至少有一个带 dev_type 的模板").toBeGreaterThan(0);
    const template = withDevType[0];
    const library = shared.resolveTemplateComponentLibrary(template);
    const devType = String(template.params.dev_type);
    expect(shared.deviceDefinitionSharedIdentityForTemplate(template)).toBe(`${library}::${devType}`);
    const stripped = { ...template, params: { ...template.params, dev_type: "   " } };
    expect(shared.deviceDefinitionSharedIdentityForTemplate(stripped)).toBe(library);
  });
});

describe("groupPeerKindsBySharedKey", () => {
  test("内置库分组后 kind 不重不漏，且确实存在多成员分组", () => {
    const grouped = shared.groupPeerKindsBySharedKey(DEVICE_LIBRARY);
    const allKinds = [...grouped.values()].flat();
    expect(allKinds).toHaveLength(DEVICE_LIBRARY.length);
    expect(new Set(allKinds).size).toBe(allKinds.length);
    const multi = [...grouped.entries()].filter(([, kinds]) => kinds.length > 1);
    expect(multi.length, "内置库里应当存在共享同一份定义的模板组").toBeGreaterThan(0);
  });

  test("每个 kind 落在的那一组，键与它自己的 sharedKey 一致（建表没串位）", () => {
    const grouped = shared.groupPeerKindsBySharedKey(DEVICE_LIBRARY);
    const byKind = new Map(DEVICE_LIBRARY.map((template) => [template.kind, template]));
    for (const [key, kinds] of grouped) {
      for (const kind of kinds) {
        expect(shared.deviceDefinitionSharedKeyForTemplate(byKind.get(kind)!), `${kind} 被放进了 ${key}`).toBe(key);
      }
    }
  });

  test("同组件库的多形状变体确实归到一组（否则串改功能形同虚设）", () => {
    const grouped = shared.groupPeerKindsBySharedKey(DEVICE_LIBRARY);
    const peers = grouped.get("shared:ACContainer");
    expect(peers).toBeDefined();
    expect(peers!.length).toBeGreaterThan(1);
  });

  test("空输入得到空表", () => {
    expect(shared.groupPeerKindsBySharedKey([]).size).toBe(0);
  });
});

describe("fallbackComponentLibraryForCategoryLibrary", () => {
  test("按分类名里的关键字落到对应组件库", () => {
    expect(shared.fallbackComponentLibraryForCategoryLibrary("静态设备")).toBe("StaticBasicShape");
    expect(shared.fallbackComponentLibraryForCategoryLibrary("直流设备")).toBe("DCLoad");
    expect(shared.fallbackComponentLibraryForCategoryLibrary("氢能设备")).toBe("HydroLoad");
    expect(shared.fallbackComponentLibraryForCategoryLibrary("热力设备")).toBe("HeatLoad");
  });

  test("认不出来的分类落到交流负载（最后的兜底）", () => {
    expect(shared.fallbackComponentLibraryForCategoryLibrary("交流设备")).toBe("ACLoad");
    expect(shared.fallbackComponentLibraryForCategoryLibrary("")).toBe("ACLoad");
  });

  test("「变流」分支只在未归一的名字上生效：标准「变流设备」先被归一成直流设备", () => {
    // 归一在前，所以「变流设备」走的是直流分支而不是变流分支；
    // 变流分支留给的是「变流器」这类非标准名。两者的差别写在这里防止后人以为变流分支是死代码。
    expect(shared.normalizeCategoryLibraryName("变流设备")).toBe("直流设备");
    expect(shared.fallbackComponentLibraryForCategoryLibrary("变流设备")).toBe("DCLoad");
    expect(shared.fallbackComponentLibraryForCategoryLibrary("变流器")).toBe("DCDCConverter");
  });

  test("「交流系统」「直流系统」先归一再匹配", () => {
    expect(shared.normalizeCategoryLibraryName("交流系统")).toBe("交流设备");
    expect(shared.normalizeCategoryLibraryName("直流系统")).toBe("直流设备");
    // 归一后不含「直流」，落到交流兜底 —— 记下来是因为它反直觉
    expect(shared.fallbackComponentLibraryForCategoryLibrary("交流系统")).toBe("ACLoad");
  });
});

describe("SHARED_DEFINITION_METADATA_PARAM_NAMES", () => {
  test("五个派生/共享元参数都在集合内", () => {
    for (const name of [
      "component_type",
      "derived_from_component_type",
      "derived_component_type",
      "derived_component_library_label",
      "is_derived_component_library"
    ]) {
      expect(shared.SHARED_DEFINITION_METADATA_PARAM_NAMES.has(name), `${name} 不在元参数集合里`).toBe(true);
    }
  });

  test("这些名字都被认作「元件定义参数」（即 concreteDeviceDefinitionParams 会保留它们）", () => {
    for (const name of shared.SHARED_DEFINITION_METADATA_PARAM_NAMES) {
      expect(shared.isConcreteDeviceDefinitionParamName(name)).toBe(true);
    }
  });
});
