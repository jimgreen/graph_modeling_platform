import { describe, expect, test } from "vitest";
import { E_TEMPLATE_DIR, PREDEFINED_E_DEVICE_TEMPLATES, readPredefinedTemplateBase64 } from "./eFileTemplates.mjs";

describe("eFileTemplates", () => {
  test("暴露 4 个预定义模板", () => {
    expect(Object.keys(PREDEFINED_E_DEVICE_TEMPLATES).sort()).toEqual(
      ["台区实时库", "国网E格式", "主网实时库", "配网实时库"].sort()
    );
  });

  test("模板目录指向 public/e-templates/", () => {
    expect(E_TEMPLATE_DIR.replace(/\\/g, "/")).toMatch(/public\/e-templates\/$/);
  });

  test("可读出 GBK/UTF-8 模板的 base64", async () => {
    const base64 = await readPredefinedTemplateBase64("国网E格式");
    expect(typeof base64).toBe("string");
    expect(base64.length).toBeGreaterThan(0);
  });

  test("未知模板名抛错", async () => {
    await expect(readPredefinedTemplateBase64("不存在的模板")).rejects.toThrow();
  });
});
