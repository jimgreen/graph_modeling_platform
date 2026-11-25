import { describe, expect, test } from "vitest";
import {
  DEFAULT_INTERFACE_CUSTOMIZATION_CONFIG,
  interfaceCustomizationCss,
  isInterfaceCustomizationVisible,
  normalizeInterfaceCustomizationConfig
} from "./interfaceCustomization";

describe("界面定制配置", () => {
  test("缺失和非法值回退到默认全显示", () => {
    const normalized = normalizeInterfaceCustomizationConfig({
      buttons: { "topbar.save": false, "topbar.topology": "false", unknown: false },
      modules: null
    });
    expect(normalized.buttons["topbar.save"]).toBe(false);
    expect(normalized.buttons["topbar.topology"]).toBe(true);
    expect(normalized.modules["module.canvas"]).toBe(true);
    expect(normalized.buttons.unknown).toBeUndefined();
  });

  test("未知 ID 默认可见，已登记的隐藏项返回 false", () => {
    const config = normalizeInterfaceCustomizationConfig({ buttons: { "topbar.save": false } });
    expect(isInterfaceCustomizationVisible(config, "topbar.save")).toBe(false);
    expect(isInterfaceCustomizationVisible(config, "future.control")).toBe(true);
  });

  test("隐藏按钮生成稳定 CSS 选择器", () => {
    const config = normalizeInterfaceCustomizationConfig({ buttons: { "topbar.save": false, "topbar.brand": false, "topbar.runtimeWs": false } });
    expect(interfaceCustomizationCss(config)).toContain("#topbar-save");
    expect(interfaceCustomizationCss(config)).toContain("#topbar-brand");
    expect(interfaceCustomizationCss(config)).toContain("#topbar-runtime-ws");
    expect(interfaceCustomizationCss(DEFAULT_INTERFACE_CUSTOMIZATION_CONFIG)).toBe("");
  });

  test("截图中的顶栏固定元素都有配置定义", async () => {
    const { interfaceCustomizationDefinitions } = await import("./interfaceCustomization");
    const buttonIds = interfaceCustomizationDefinitions("button").map((definition) => definition.id);
    const moduleIds = interfaceCustomizationDefinitions("module").map((definition) => definition.id);
    expect(buttonIds).toEqual(expect.arrayContaining([
      "topbar.brand",
      "topbar.activeModel",
      "topbar.template",
      "topbar.spaceSwitcher",
      "topbar.interfaceCustomization",
      "topbar.runtimeWs"
    ]));
    expect(moduleIds).toEqual(expect.arrayContaining([
      "module.leftPanel.modelLibrary",
      "module.leftPanel.deviceLibrary",
      "module.leftPanel.templateLibrary",
      "module.rightPanel.baseCanvasSettings",
      "module.rightPanel.graphGraphics",
      "module.rightPanel.deviceMeasurement"
    ]));
    expect(buttonIds).toEqual(expect.arrayContaining(["topbar.undo", "topbar.redo"]));
  });

  test("全部隐藏配置必须保留界面定制入口受保护可见，防止自锁死", async () => {
    const {
      buildHideAllInterfaceCustomizationConfig,
      isProtectedInterfaceCustomizationId
    } = await import("./interfaceCustomization");
    const hiddenAll = buildHideAllInterfaceCustomizationConfig();
    expect(isProtectedInterfaceCustomizationId("topbar.interfaceCustomization")).toBe(true);
    expect(hiddenAll.buttons["topbar.interfaceCustomization"]).toBe(true);
    expect(hiddenAll.buttons["topbar.save"]).toBe(false);
    expect(hiddenAll.buttons["topbar.undo"]).toBe(false);
    expect(hiddenAll.modules["module.canvas"]).toBe(false);
  });

  test("前后端界面定制配置键集合保持单源一致", async () => {
    const { DEFAULT_INTERFACE_CUSTOMIZATION_CONFIG: frontDefaults } = await import("./interfaceCustomization");
    // @ts-expect-error 后端 ESM .mjs 模块不提供 .d.ts 声明文件
    const { INTERFACE_CUSTOMIZATION_DEFAULTS: serverDefaults } = await import("../server/interfaceCustomization.mjs");
    expect(Object.keys(serverDefaults.buttons).sort()).toEqual(Object.keys(frontDefaults.buttons).sort());
    expect(Object.keys(serverDefaults.modules).sort()).toEqual(Object.keys(frontDefaults.modules).sort());
  });
});
