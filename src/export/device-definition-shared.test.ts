import { describe, expect, test } from "vitest";
import * as shared from "./device-definition-shared";
import * as legacy from "../customDeviceUtils";
import { DEVICE_LIBRARY } from "../model";

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
