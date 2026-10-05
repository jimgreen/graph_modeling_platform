import { describe, expect, test } from "vitest";
import * as shared from "./device-definition-shared";
import * as legacy from "../customDeviceUtils";
import {
  DEVICE_LIBRARY,
  baseDeviceKind,
  templateDerivedComponentLibraryInfo,
  resolveEffectiveTemplateParameterDefinitions
} from "../model";
import { DEVICE_DEFINITION_VISUAL_PARAM_KEYS } from "../deviceVisualParams";

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

// 下面这组是「元件定义共享层」的判据函数，此前只在迁移测试里被断言存在（typeof === "function"），
// 从未被调用过。判错的后果都是静默的：串改 / 漏改 / 串到不该串的模板上，全程不报错。

describe("componentClassForConcreteTemplate", () => {
  test("显式 componentClass 优先于一切推导", () => {
    const template = { ...DEVICE_LIBRARY[0], componentClass: "MyExplicitClass" } as any;
    expect(shared.componentClassForConcreteTemplate(template)).toBe("MyExplicitClass");
  });

  test("空白 componentClass 不算数（trim 后为空即走推导）", () => {
    const template = { ...DEVICE_LIBRARY[0], componentClass: "   " } as any;
    expect(shared.componentClassForConcreteTemplate(template))
      .toBe(shared.componentClassForConcreteTemplate({ ...template, componentClass: undefined }));
  });

  test("派生件取 derivedComponentLibrary，而非基类的组件库", () => {
    const derived = DEVICE_LIBRARY.find((template) => templateDerivedComponentLibraryInfo(template) !== null)!;
    const info = templateDerivedComponentLibraryInfo(derived)!;
    expect(shared.componentClassForConcreteTemplate(derived as any)).toBe(info.derivedComponentLibrary);
  });

  test("非派生件回落到组件库名（与 resolveTemplateComponentLibrary 同源）", () => {
    const plain = DEVICE_LIBRARY.find((template) => !template.custom && !templateDerivedComponentLibraryInfo(template))!;
    expect(shared.componentClassForConcreteTemplate(plain as any))
      .toBe(shared.resolveTemplateComponentLibrary(plain));
  });

  test("全部内置模板都产出非空类名（空串会让后续按键分组全落到同一桶）", () => {
    for (const template of DEVICE_LIBRARY) {
      expect(shared.componentClassForConcreteTemplate(template as any).length, template.kind).toBeGreaterThan(0);
    }
  });
});

describe("normalizeCategoryLibraryName", () => {
  test("四个别名归一到标准名，其余原样返回", () => {
    expect(shared.normalizeCategoryLibraryName("交流系统")).toBe("交流设备");
    expect(shared.normalizeCategoryLibraryName("直流系统")).toBe("直流设备");
    expect(shared.normalizeCategoryLibraryName("变流设备")).toBe("直流设备");
    // 不在别名表里则原样（含空串，不做兜底）
    expect(shared.normalizeCategoryLibraryName("氢能设备")).toBe("氢能设备");
    expect(shared.normalizeCategoryLibraryName("")).toBe("");
  });

  test("不做 trim / 不改大小写：这是精确匹配而非模糊归一", () => {
    expect(shared.normalizeCategoryLibraryName(" 交流系统 ")).toBe(" 交流系统 ");
  });
});

describe("normalizeComponentLibraryName", () => {
  test("只 trim，其余不动", () => {
    expect(shared.normalizeComponentLibraryName("  ACLoad  ")).toBe("ACLoad");
    expect(shared.normalizeComponentLibraryName("   ")).toBe("");
    expect(shared.normalizeComponentLibraryName("")).toBe("");
  });
});

describe("isConcreteDeviceDefinitionParamName", () => {
  test("视觉参数逐个被认作「元件定义参数」", () => {
    // 这批键是 DEVICE_DEFINITION_VISUAL_PARAM_KEYS 全集；任一漏登记，
    // 该键就会留在共享 params 里、随改写串到同组其它模板上。
    for (const key of DEVICE_DEFINITION_VISUAL_PARAM_KEYS) {
      expect(shared.isConcreteDeviceDefinitionParamName(key), key).toBe(true);
    }
    expect(DEVICE_DEFINITION_VISUAL_PARAM_KEYS.size, "视觉参数集合不该是空的").toBeGreaterThan(20);
  });

  test("button 前缀的参数被前缀匹配认作元件定义参数", () => {
    expect(shared.isConcreteDeviceDefinitionParamName("buttonLayerId")).toBe(true);
    expect(shared.isConcreteDeviceDefinitionParamName("button")).toBe(true);
    expect(shared.isConcreteDeviceDefinitionParamName("buttonXYZ")).toBe(true);
  });

  test("相似但不同前缀的键不被前缀命中（button 与 buttons 不同）", () => {
    // 前缀表是 ["button"]，"buttons..." 也会命中 —— 这不是 bug 也不是「精确前缀」，
    // 记下来是为了让日后有人收紧判据时知道会影响到哪些键。
    expect(shared.isConcreteDeviceDefinitionParamName("buttonsId")).toBe(true);
    expect(shared.isConcreteDeviceDefinitionParamName("ButtonLayerId")).toBe(false);
    expect(shared.isConcreteDeviceDefinitionParamName("mybutton")).toBe(false);
  });

  test("普通业务参数（rdf_id / u / i_p）不算元件定义参数", () => {
    for (const key of ["rdf_id", "u", "i_p", "rated_voltage", "idx", "name"]) {
      expect(shared.isConcreteDeviceDefinitionParamName(key), key).toBe(false);
    }
  });

  test("实例图形参数（layerId / rotation / scaleX）不算 —— 它们属于实例而非定义", () => {
    // 这是两条易混的集合：DEVICE_INSTANCE_GRAPH_PARAM_KEYS 刻意不在定义侧。
    for (const key of ["layerId", "rotation", "scaleX", "scaleY"]) {
      expect(shared.isConcreteDeviceDefinitionParamName(key), key).toBe(false);
    }
  });
});

describe("concreteDeviceDefinitionParams", () => {
  test("只保留元件定义参数，业务参数被滤掉", () => {
    const out = shared.concreteDeviceDefinitionParams({
      icon: "i.svg",
      layerId: "L1",
      rdf_id: "R1",
      u: "220"
    } as any);
    expect(Object.keys(out)).toEqual(["icon"]);
  });

  test("undefined 入参返回空对象（不抛错）", () => {
    expect(shared.concreteDeviceDefinitionParams(undefined)).toEqual({});
    expect(shared.concreteDeviceDefinitionParams({} as any)).toEqual({});
  });

  test("不修改原对象", () => {
    const source = { icon: "i", rdf_id: "R" };
    shared.concreteDeviceDefinitionParams(source as any);
    expect(Object.keys(source)).toEqual(["icon", "rdf_id"]);
  });
});

describe("sharedDefinitionParams", () => {
  test("保留业务参数、滤掉元件定义参数（与 concreteDeviceDefinitionParams 互为补集）", () => {
    const out = shared.sharedDefinitionParams({
      params: { icon: "i", rdf_id: "R", u: "220" }
    } as any);
    expect(Object.keys(out).sort()).toEqual(["rdf_id", "u"]);
  });

  test("共享元参数是例外：即便被定义侧滤掉也留下", () => {
    const out = shared.sharedDefinitionParams({
      params: { component_type: "ACLoad", icon: "i", rdf_id: "R" }
    } as any);
    expect(Object.keys(out).sort()).toEqual(["component_type", "rdf_id"]);
  });

  test("无 params / 无 override 时返回空对象", () => {
    expect(shared.sharedDefinitionParams(undefined)).toEqual({});
    expect(shared.sharedDefinitionParams({} as any)).toEqual({});
  });
});

describe("overrideTimestamp", () => {
  test("非法时间戳归 0（排序时不炸）", () => {
    expect(shared.overrideTimestamp(undefined)).toBe(0);
    expect(shared.overrideTimestamp({} as any)).toBe(0);
    expect(shared.overrideTimestamp({ updatedAt: "不是时间" } as any)).toBe(0);
    expect(shared.overrideTimestamp({ updatedAt: "" } as any)).toBe(0);
  });

  test("合法 ISO 时间戳被解析成毫秒数", () => {
    expect(shared.overrideTimestamp({ updatedAt: "2026-01-02T03:04:05.000Z" } as any))
      .toBe(Date.parse("2026-01-02T03:04:05.000Z"));
  });
});

describe("latestDefinitionSource / preferredDefinitionSource", () => {
  // 覆盖源的真实形状要求 kind 等必填字段；这里只需要 updatedAt 参与排序，
  // 故用 as any 构造最小对象（与同文件其余用例一致）。
  const older = { updatedAt: "2026-01-01T00:00:00.000Z", params: { a: "1" } } as any;
  const newer = { updatedAt: "2026-01-02T00:00:00.000Z", params: { b: "2" } } as any;

  test("取时间戳最大的那个（参数顺序无关）", () => {
    expect(shared.latestDefinitionSource(older, newer)).toBe(newer);
    expect(shared.latestDefinitionSource(newer, older)).toBe(newer);
  });

  test("undefined 被跳过，全 undefined 返回 undefined", () => {
    expect(shared.latestDefinitionSource(undefined, older)).toBe(older);
    expect(shared.latestDefinitionSource(undefined, undefined)).toBeUndefined();
    expect(shared.latestDefinitionSource()).toBeUndefined();
  });

  test("时间戳相同时取原数组里靠前的那个（比较器返回 0 ⇒ 稳定排序保持原序）", () => {
    // 实现是 `sort((l, r) => ts(r) - ts(l))[0]`：时间戳全相等时比较器恒返回 0，
    // 稳定排序保持原序，故取到先传入的那个。若日后有人改成不稳定排序或加二级比较器，
    // 本条会先红 —— 那会改变「新旧覆盖同时存在时谁生效」的行为。
    const first = { updatedAt: "2026-01-01T00:00:00.000Z", params: { x: "1" } } as any;
    const second = { updatedAt: "2026-01-01T00:00:00.000Z", params: { x: "2" } } as any;
    expect(shared.latestDefinitionSource(first, second)).toBe(first);
  });

  test("时间戳无法解析时全部归 0，于是取先传入的那个（不抛错、不随机）", () => {
    const first = { updatedAt: "不是时间", params: { x: "1" } } as any;
    const second = { updatedAt: "", params: { x: "2" } } as any;
    expect(shared.latestDefinitionSource(first, second)).toBe(first);
  });

  test("sharedOverride 命中 predicate 时直接胜出，不与候选比时间", () => {
    // 共享覆盖是「显式落到 shared key 上」的，理应优先于按 kind 命中的候选
    const sharedOld = { updatedAt: "2020-01-01T00:00:00.000Z", params: { s: "1" } };
    expect(shared.preferredDefinitionSource(sharedOld as any, [newer as any], () => true)).toBe(sharedOld);
  });

  test("sharedOverride 未命中 predicate 时退回候选里最新的命中者", () => {
    // sharedOverride 是旧的、且不满足判据 ⇒ 让位给候选里最新的
    const sharedOld = { updatedAt: "2020-01-01T00:00:00.000Z", params: { s: "1" } };
    const acceptCandidatesOnly = (source: { params?: Record<string, string> }) => source.params?.s !== "1";
    expect(shared.preferredDefinitionSource(sharedOld as any, [older as any, newer as any], acceptCandidatesOnly)).toBe(newer);
    // 候选全不命中时无源可用
    expect(shared.preferredDefinitionSource(undefined, [older as any, newer as any], () => false)).toBeUndefined();
  });

  test("候选里混有不命中 predicate 的项时，先过滤再排序", () => {
    // 未命中的项即便时间戳最新也不该被选中 —— 判据是 predicate，不是时间
    const isKindA = (source: { params?: Record<string, string> }) => source.params?.a === "1";
    const winner = { updatedAt: "2026-01-01T00:00:00.000Z", params: { a: "1" } } as any;
    const loser = { updatedAt: "2026-06-01T00:00:00.000Z", params: { b: "2" } } as any;
    expect(shared.preferredDefinitionSource(undefined, [winner, loser], isKindA)).toBe(winner);
  });
});

describe("visualOnlyOverride", () => {
  test("剥掉参数表与量测定义，只留视觉覆盖", () => {
    const out = shared.visualOnlyOverride({
      kind: "ac-load",
      updatedAt: "2026-01-01T00:00:00.000Z",
      params: { icon: "i", rdf_id: "R" },
      parameterDefinitions: [{ enName: "u" }],
      measurementDefinitions: [{ id: "m" }]
    } as any);
    expect(out).toBeDefined();
    expect(out!.parameterDefinitions).toBeUndefined();
    expect(out!.measurementDefinitions).toBeUndefined();
    expect(out!.params).toEqual({ icon: "i" });
    // 元字段保留（判「这份覆盖还有没有内容」要用）
    expect(out!.kind).toBe("ac-load");
    expect(out!.updatedAt).toBe("2026-01-01T00:00:00.000Z");
  });

  test("连 Intent 标记一并剥掉（否则会被当成「待删空表」）", () => {
    const out = shared.visualOnlyOverride({
      kind: "k",
      parameterDefinitionsIntent: "delete-all",
      measurementDefinitionsIntent: "delete-all"
    } as any);
    expect(out!.parameterDefinitionsIntent).toBeUndefined();
    expect(out!.measurementDefinitionsIntent).toBeUndefined();
  });

  test("不改原对象", () => {
    const source = { kind: "k", params: { icon: "i" }, parameterDefinitions: [{ enName: "u" }] } as any;
    shared.visualOnlyOverride(source);
    expect(source.parameterDefinitions).toHaveLength(1);
  });

  test("undefined 返回 undefined", () => {
    expect(shared.visualOnlyOverride(undefined)).toBeUndefined();
  });
});

describe("deviceDefinitionKeyForTemplate", () => {
  test("全部内置模板的 key 都非空且已 trim", () => {
    for (const template of DEVICE_LIBRARY) {
      const key = shared.deviceDefinitionKeyForTemplate(template as any);
      expect(key.length, template.kind).toBeGreaterThan(0);
      expect(key, template.kind).toBe(key.trim());
    }
  });
});

describe("deviceDefinitionSharedKeyForTemplate", () => {
  test("带 shared: 前缀（与 kind 覆盖的键空间不撞）", () => {
    const key = shared.deviceDefinitionSharedKeyForTemplate(DEVICE_LIBRARY[0] as any);
    expect(key.startsWith("shared:")).toBe(true);
    expect(key.slice("shared:".length))
      .toBe(shared.deviceDefinitionSharedIdentityForTemplate(DEVICE_LIBRARY[0]));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// deviceDefinitionOverrideForTemplate 的 class: 分支 + normalizeSharedDeviceDefinitionOverrides 的 peer 裁剪。
// 这两条链上出错的共同形态是「静默」：class: 覆盖套错类名会让一个元件类的端子规格泄漏到别的类；
// peer 裁剪判错会让本该保留的视觉覆盖整条消失。都不抛异常，只能靠断言钉住。
// ─────────────────────────────────────────────────────────────────────────────

describe("deviceDefinitionOverrideForTemplate：class: 元件类覆盖", () => {
  // ac-vpp-box 所在分组 shared:ACContainer 有 3 个成员，且每个成员都不带 -vertical 后缀，
  // 所以「peer 专属的 kind」是货真价实的第 5 类候选键（下面 L350 那条要靠它）。
  const base = DEVICE_LIBRARY.find((template) => template.kind === "ac-vpp-box")!;
  const peerKind = "ac-switch-box";
  const className = shared.componentClassForConcreteTemplate(base as any);
  const grouped = shared.groupPeerKindsBySharedKey(DEVICE_LIBRARY);

  test("前置事实：base 自带参数表、className 非 Static —— 否则下面几条断的是兜底值", () => {
    // §2：断言值不能恰好等于 fallback。这里先钉住夹具的两个前提，
    // 免得日后有人改了内置库数据，本组用例悄悄退化成「只断兜底」。
    expect(base.custom, "必须是内置模板（custom 为假才走 resolveEffectiveTemplateParameterDefinitions）").toBeFalsy();
    expect(resolveEffectiveTemplateParameterDefinitions(base, DEVICE_LIBRARY).length).toBeGreaterThan(1);
    expect(className.startsWith("Static"), "className 走静态库会让 class: 覆盖的语义换一族").toBe(false);
    const peers = grouped.get(shared.deviceDefinitionSharedKeyForTemplate(base as any))!;
    expect(peers).toContain(peerKind);
    // 组里除 base 自己之外至少还有别的成员 —— peer 专属键才真的存在
    expect(peers.filter((kind) => kind !== base.kind).length).toBeGreaterThan(0);
  });

  test("terminalCount 缺省时按 terminalTypes 的实际长度截断（不靠 terminalCount 也能定端子数）", () => {
    // 既有那条用例同时给了 terminalCount: 3 和长度为 3 的 terminalTypes ——
    // 两个来源同值，故 `terminalCount ?? terminalTypes.length` 删掉哪一侧都测不出来。
    // 这里只给 terminalTypes，且故意用 p/q/r 这种非规范值（规范值是 ac/dc，硬编码变异会猜到）。
    const out = shared.deviceDefinitionOverrideForTemplate(base, {
      [`class:${className}`]: { terminalTypes: ["p", "q", "r"] }
    } as any, DEVICE_LIBRARY, grouped)!;
    expect(out.terminalTypes).toEqual(["p", "q", "r"]);
    expect(out.terminalCount).toBe(3);
    expect(out.terminalType).toBe("p");
  });

  test("terminalTypes 被 terminalCount 截短：多出来的端子连同 labels/roles/associations 一起丢掉", () => {
    // 四条 slice 共用 classTerminalTypes.length 这一个上界，所以长度必须一致；
    // 任一条把上界写成 terminalTypes.length 或写死常量，这里都会红。
    const out = shared.deviceDefinitionOverrideForTemplate(base, {
      [`class:${className}`]: {
        terminalTypes: ["p", "q", "r"],
        terminalLabels: ["L1", "L2", "L3", "L4"],
        terminalRoles: ["R1", "R2", "R3", "R4"],
        terminalAssociations: ["T1", "T2", "T3", "T4"]
      }
    } as any, DEVICE_LIBRARY, grouped)!;
    expect(out.terminalTypes).toEqual(["p", "q", "r"]);
    expect(out.terminalLabels).toEqual(["L1", "L2", "L3"]);
    expect(out.terminalRoles).toEqual(["R1", "R2", "R3"]);
    expect(out.terminalAssociations).toEqual(["T1", "T2", "T3"]);
  });

  test("terminalTypes 为空时 terminalType 退回模板自带的 —— 空数组本身不足以改写端子类型", () => {
    // terminalCount=2 但 terminalTypes=[] ⇒ slice 得到空数组；空数组是 truthy，
    // 于是仍会展开端子块，而 [0] 为 undefined 才真正需要 `?? template.terminalType`。
    // 期望值取一个硬编码变异不会猜的 ZQXPROBE（规范值是 ac/dc）。
    const tpl = { ...base, terminalType: "ZQXPROBE" } as any;
    expect(tpl.terminalType).toBe("ZQXPROBE");
    const out = shared.deviceDefinitionOverrideForTemplate(tpl, {
      [`class:${className}`]: { terminalTypes: [], terminalCount: 2 }
    } as any, DEVICE_LIBRARY, grouped)!;
    expect(out.terminalTypes).toEqual([]);
    expect(out.terminalCount).toBe(0);
    expect(out.terminalType).toBe("ZQXPROBE");
  });

  test("派生元件按基类库名取 class: 覆盖，按派生库名取则完全落空（整条覆盖返回 undefined）", () => {
    // terminalDefinitionClass 取的是 derivedInfo.baseComponentLibrary，而 componentClassForConcreteTemplate
    // 取的是 derivedComponentLibrary —— 两者不同，这正是「按哪个键查」的判据。
    const derived = DEVICE_LIBRARY.find((t) => t.kind === "ac-station-source")!;
    const info = templateDerivedComponentLibraryInfo(derived)!;
    // §2：先证明两个来源确实不同，否则双边断言没有鉴别力
    expect(info.baseComponentLibrary).not.toBe(info.derivedComponentLibrary);
    expect(shared.componentClassForConcreteTemplate(derived as any)).toBe(info.derivedComponentLibrary);

    const byBase = shared.deviceDefinitionOverrideForTemplate(derived, {
      [`class:${info.baseComponentLibrary}`]: { terminalTypes: ["p", "q"], terminalCount: 2 }
    } as any, DEVICE_LIBRARY, grouped)!;
    expect(byBase.terminalTypes).toEqual(["p", "q"]);
    expect(byBase.terminalCount).toBe(2);

    // 同一个覆盖改挂到派生库名下 ⇒ 该模板拿不到任何覆盖（无 shared / 无视觉 / 无 class 三者皆空）
    const byDerived = shared.deviceDefinitionOverrideForTemplate(derived, {
      [`class:${info.derivedComponentLibrary}`]: { terminalTypes: ["p", "q"], terminalCount: 2 }
    } as any, DEVICE_LIBRARY, grouped);
    expect(byDerived, "派生库名不是可用的 class 键").toBeUndefined();
  });

  test("peer 分组表缺该 sharedKey 的条目时，只按模板自身的候选键查 —— peer 的覆盖不再算数", () => {
    // peerKind 是第 5 类候选键：既不是 sharedKey，也不是 legacySharedKey / kind / baseDeviceKind /
    // deviceDefinitionKeyForTemplate。空表 ⇒ 它不在候选里 ⇒ 查不到那份参数表。
    const overrides = {
      [peerKind]: {
        kind: peerKind,
        updatedAt: "2026-01-01T00:00:00.000Z",
        parameterDefinitions: [{ enName: "probe_peer_param", cnName: "探针" }]
      }
    };
    const identity = shared.deviceDefinitionSharedIdentityForTemplate(base as any);
    const baseKind = baseDeviceKind(base.kind);
    const deviceKey = shared.deviceDefinitionKeyForTemplate(base as any);
    for (const key of [shared.deviceDefinitionSharedKeyForTemplate(base as any), base.kind, baseKind, deviceKey, identity]) {
      expect(peerKind === key, `peerKind 撞上了候选键 ${key}，本用例就失去鉴别力`).toBe(false);
    }

    const withTable = shared.deviceDefinitionOverrideForTemplate(base, overrides as any, DEVICE_LIBRARY, grouped)!;
    expect(withTable.parameterDefinitions).toEqual([{ enName: "probe_peer_param", cnName: "探针" }]);

    // 不传表时走的是独立 filter 路径，结果必须与查表路径一致（两条实现同源）
    const noTable = shared.deviceDefinitionOverrideForTemplate(base, overrides as any, DEVICE_LIBRARY)!;
    expect(noTable.parameterDefinitions).toEqual([{ enName: "probe_peer_param", cnName: "探针" }]);

    // 传一张缺该键的空表 ⇒ 找不到 peer ⇒ 返回 undefined（三种路径两两不同，不是同一结果换皮）
    const emptyTable = shared.deviceDefinitionOverrideForTemplate(base, overrides as any, DEVICE_LIBRARY, new Map());
    expect(emptyTable, "空表下 peer 覆盖不该被查到").toBeUndefined();
  });

  test("没有任何参数表覆盖时回落到内置参数表，而不是留空", () => {
    // 覆盖物只有 class: 端子（不含 parameterDefinitions）⇒ parameterSource 为空，
    // 落进 builtInParameterDefinitions 那一档。既有那条 buildEffectiveLibraryTemplates 用例
    // 断的是最终模板，本条断的是 deviceDefinitionOverrideForTemplate 自己返回的对象。
    const out = shared.deviceDefinitionOverrideForTemplate(base, {
      [`class:${className}`]: { terminalTypes: ["p"], terminalCount: 1 }
    } as any, DEVICE_LIBRARY, grouped)!;
    const builtIn = resolveEffectiveTemplateParameterDefinitions(base, DEVICE_LIBRARY);
    expect(builtIn.length).toBeGreaterThan(1);
    expect(out.parameterDefinitions).toEqual(builtIn);
  });
});

describe("normalizeSharedDeviceDefinitionOverrides：peer 裁剪", () => {
  const group = ["ac-vpp-box", "ac-switch-box", "ac-distribution-box"]
    .map((kind) => DEVICE_LIBRARY.find((template) => template.kind === kind)!);

  test("只剩视觉参数的 peer 整条保留 —— 键层面空空如也但 params 里有图标", () => {
    // hasVisualContent 的左侧只看顶层键，右侧才看 params。覆盖里除 kind/updatedAt/params 外什么都没有，
    // 所以左侧必然为假 —— 保住这条覆盖的**只有**右侧这一条路。
    const overrides = {
      "shared:ACContainer": {
        kind: "shared:ACContainer",
        updatedAt: "2026-01-01T00:00:00.000Z",
        params: { u: "220" },
        parameterDefinitions: [{ enName: "u", cnName: "电压" }]
      },
      "ac-switch-box": {
        kind: "ac-switch-box",
        updatedAt: "2026-01-02T00:00:00.000Z",
        params: { icon: "i.svg" }
      }
    };
    const out = shared.normalizeSharedDeviceDefinitionOverrides(overrides as any, group);
    expect(out["ac-switch-box"], "只有视觉内容的 peer 不该被删").toBeDefined();
    expect(out["ac-switch-box"]!.params).toEqual({ icon: "i.svg" });
  });

  test("两侧都为空的 peer 被整条删除（否则上面那条就成了恒绿断言）", () => {
    // params 里只有业务参数 u，concreteDeviceDefinitionParams 会把它滤掉 ⇒ 视觉 params 为空；
    // 顶层又只剩元字段 ⇒ 两条判据都为假 ⇒ 整条删除。
    const overrides = {
      "shared:ACContainer": {
        kind: "shared:ACContainer",
        updatedAt: "2026-01-01T00:00:00.000Z",
        params: { u: "220" },
        parameterDefinitions: [{ enName: "u", cnName: "电压" }]
      },
      "ac-distribution-box": {
        kind: "ac-distribution-box",
        updatedAt: "2026-01-02T00:00:00.000Z",
        params: { u: "110" }
      }
    };
    const out = shared.normalizeSharedDeviceDefinitionOverrides(overrides as any, group);
    expect(out["ac-distribution-box"], "无任何视觉内容的 peer 该被删").toBeUndefined();
    // 共享条目本身不受 peer 裁剪影响（对照组：证明上条删的是 peer 而不是 shared）
    expect(out["shared:ACContainer"]!.parameterDefinitions).toEqual([{ enName: "u", cnName: "电压" }]);
  });

  test("peer 的 kind 恰好等于 sharedKey 时跳过裁剪 —— 否则共享条目会被自己的视觉化结果覆盖掉", () => {
    // kind === "shared:" + identity 只能靠「kind 本身就是 shared: 前缀 + 组件库名」构造出来
    // （身份取组件库名那一档：非派生件、dev_type 为空、组件库不以 Static 开头）。
    const tpl = { kind: "shared:ACLoad", name: "探针", params: { component_type: "ACLoad" } } as any;
    expect(shared.deviceDefinitionSharedIdentityForTemplate(tpl)).toBe("ACLoad");
    expect(shared.deviceDefinitionSharedKeyForTemplate(tpl)).toBe(tpl.kind);

    const overrides = {
      "shared:ACLoad": {
        kind: "shared:ACLoad",
        updatedAt: "2026-01-01T00:00:00.000Z",
        params: { probe_biz: "1" },
        parameterDefinitions: [{ enName: "probe_shared", cnName: "探针" }]
      }
    };
    const out = shared.normalizeSharedDeviceDefinitionOverrides(overrides as any, [tpl]);
    expect(out[tpl.kind], "共享条目不该被 peer 裁剪掉").toBeDefined();
    expect(out[tpl.kind]!.parameterDefinitions).toEqual([{ enName: "probe_shared", cnName: "探针" }]);
    expect(out[tpl.kind]!.params).toEqual({ probe_biz: "1" });
  });
});
