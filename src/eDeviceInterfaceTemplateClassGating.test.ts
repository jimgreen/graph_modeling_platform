import { describe, expect, test } from "vitest";
import { DEVICE_LIBRARY } from "./model";
import { buildEFileExportOptionsFromLibrary } from "./appExtracted/appDeviceDefinitionEInterface";

// 验证“只含当前模板命中的表/类”机制：模板加载会把未命中类的
// eDeviceDefinitionClassExportEnabled 置 false（见 applyEDeviceDefinitionSectionsToLibraryState），
// 导出器按 interfaceDefinition.exportEnabled===false 剔除（model-eexport.ts 2016/2057/3806）。
describe("当前模板类导出门控（模板命中表机制）", () => {
  test("原始/无模板态：所有类默认可导出", () => {
    const options = buildEFileExportOptionsFromLibrary({ libraryTemplates: DEVICE_LIBRARY });
    expect(options.interfaceDefinitions.length).toBeGreaterThan(0);
    expect(options.interfaceDefinitions.some((definition) => definition.exportEnabled !== false)).toBe(true);
  });

  test("classExportEnabled=false 的类被标记为不导出，其它类不受影响", () => {
    const base = buildEFileExportOptionsFromLibrary({ libraryTemplates: DEVICE_LIBRARY });
    const target = base.interfaceDefinitions.find((definition) => definition.exportEnabled !== false);
    expect(target).toBeDefined();

    const disabled = buildEFileExportOptionsFromLibrary({
      libraryTemplates: DEVICE_LIBRARY,
      eDeviceDefinitionClassExportEnabled: { [target.componentLibrary]: false }
    });
    const disabledRow = disabled.interfaceDefinitions.find(
      (definition) => definition.componentLibrary === target.componentLibrary
    );
    expect(disabledRow).toBeDefined();
    expect(disabledRow?.exportEnabled).toBe(false);

    const enabledRow = disabled.interfaceDefinitions.find(
      (definition) =>
        definition.componentLibrary !== target.componentLibrary && definition.exportEnabled !== false
    );
    expect(enabledRow).toBeDefined();
  });
});
