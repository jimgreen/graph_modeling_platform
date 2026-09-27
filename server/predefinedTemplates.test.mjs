// 预定义 E 设备模板「跨端单源」守卫。
//
// src/predefinedEDeviceTemplates.ts 与 server/eFileTemplates.mjs 各有一份
// PREDEFINED_E_DEVICE_TEMPLATES，两边的注释都写着「同名同序」—— 前端供
// `template=` 下拉与「从文件加载」，后端 `readPredefinedTemplateBase64` 按名字取文件。
//
// 任何一侧增删改模板而另一侧没跟上，后果是**静默**的：前端下拉里选得到、后端
// 报「未知模板」（或反之，用户根本选不到新模板）。此前无任何测试覆盖这个契约。
//
// 另外校验：每个模板对应的文件在 public/e-templates/ 下真实存在 —— 名字写错同样是
// 运行时才发现。
import { describe, expect, test } from "vitest";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  PREDEFINED_E_DEVICE_TEMPLATES,
  predefinedEDeviceTemplateByName,
  predefinedEDeviceTemplateByFile
} from "../src/predefinedEDeviceTemplates";
import { PREDEFINED_E_DEVICE_TEMPLATES as SERVER_TEMPLATES } from "./eFileTemplates.mjs";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const templateDir = path.join(repoRoot, "public", "e-templates");

describe("预定义 E 设备模板跨端一致性", () => {
  test("前后端模板名与文件映射逐项相同且顺序一致", () => {
    const frontend = PREDEFINED_E_DEVICE_TEMPLATES.map((t) => [t.name, t.file]);
    const backend = Object.entries(SERVER_TEMPLATES);
    expect(
      frontend,
      "src/predefinedEDeviceTemplates.ts 与 server/eFileTemplates.mjs 的模板清单已漂移"
    ).toEqual(backend);
  });

  test("每个模板的 .e 文件在 public/e-templates/ 下真实存在", () => {
    for (const template of PREDEFINED_E_DEVICE_TEMPLATES) {
      expect(
        existsSync(path.join(templateDir, template.file)),
        `模板 ${template.name} 指向的文件不存在：public/e-templates/${template.file}`
      ).toBe(true);
    }
  });

  test("按名字/按文件查模板双向自洽", () => {
    for (const template of PREDEFINED_E_DEVICE_TEMPLATES) {
      expect(predefinedEDeviceTemplateByName(template.name)?.file).toBe(template.file);
      expect(predefinedEDeviceTemplateByFile(template.file)?.name).toBe(template.name);
    }
    expect(predefinedEDeviceTemplateByName("不存在的模板")).toBeNull();
    expect(predefinedEDeviceTemplateByFile("nope.e")).toBeNull();
  });
});
