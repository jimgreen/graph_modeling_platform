// 预定义 E 设备模板的前后端单源守卫。
//
// 同一份清单在两个地方各存了一份：前端 `src/predefinedEDeviceTemplates.ts`（数组，
// 供模板下拉与「从文件加载」按名反查文件）与后端 `server/eFileTemplates.mjs`（对象，
// 供 `readPredefinedTemplateBase64` 读盘）。两边唯一的约束是**注释里的一句话**
// 「同名同序」，没有任何可执行检查。
//
// 漂移的后果是静默的：前端下拉多出一个模板名 → 后端 `PREDEFINED_E_DEVICE_TEMPLATES[name]`
// 为 undefined → 抛「未知模板：X」；反过来模板文件被删 → 端点 500 ENOENT。
// 两者都要用户手动点一次导出才发现。
import { describe, expect, test } from "vitest";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  PREDEFINED_E_DEVICE_TEMPLATES,
  predefinedEDeviceTemplateByFile,
  predefinedEDeviceTemplateByName
} from "./predefinedEDeviceTemplates";
// 后端 .mjs 无类型声明（tsconfig allowJs:false），与 spaceClient.test.ts 同款处理。
// @ts-expect-error TS7016 无声明文件
import { PREDEFINED_E_DEVICE_TEMPLATES as SERVER_TEMPLATES } from "../server/eFileTemplates.mjs";

const TEMPLATE_DIR = fileURLToPath(new URL("../public/e-templates/", import.meta.url));

describe("前后端清单同名同序", () => {
  test("条目逐项对齐（名字与文件名都相同）", () => {
    const frontend = PREDEFINED_E_DEVICE_TEMPLATES.map((template) => [template.name, template.file]);
    const backend = Object.entries(SERVER_TEMPLATES);
    expect(frontend).toEqual(backend);
  });

  test("反向也成立：后端有的每个模板，前端下拉里都选得到", () => {
    // 上面的 toEqual 已覆盖顺序与内容；这条独立地把「后端是子集」这一方向单列，
    // 失败时报错能直接指出是哪一侧多出/少了什么。
    for (const name of Object.keys(SERVER_TEMPLATES)) {
      expect(predefinedEDeviceTemplateByName(name), `后端模板 ${name} 在前端查不到`).not.toBeNull();
    }
    for (const template of PREDEFINED_E_DEVICE_TEMPLATES) {
      expect(SERVER_TEMPLATES[template.name as keyof typeof SERVER_TEMPLATES], `前端模板 ${template.name} 后端没有`).toBe(
        template.file
      );
    }
  });

  test("模板名与文件名都不重复（否则按名/按文件反查会命中错误条目）", () => {
    expect(new Set(PREDEFINED_E_DEVICE_TEMPLATES.map((t) => t.name)).size).toBe(PREDEFINED_E_DEVICE_TEMPLATES.length);
    expect(new Set(PREDEFINED_E_DEVICE_TEMPLATES.map((t) => t.file)).size).toBe(PREDEFINED_E_DEVICE_TEMPLATES.length);
  });
});

describe("模板文件真实存在", () => {
  test.each(PREDEFINED_E_DEVICE_TEMPLATES.map((t) => [t.name, t.file] as const))(
    "%s → %s 在 public/e-templates/ 下可读",
    (_name, file) => {
      const path = `${TEMPLATE_DIR}${file}`;
      expect(existsSync(path), `模板文件缺失：${path}`).toBe(true);
    }
  );
});

describe("反查函数", () => {
  test("按名字查到对应文件名", () => {
    expect(predefinedEDeviceTemplateByName("国网E格式")).toEqual({ name: "国网E格式", file: "sgcc.e" });
    expect(predefinedEDeviceTemplateByName("台区实时库")).toEqual({ name: "台区实时库", file: "taiqu_rtdb.e" });
  });

  test("按文件名查到对应模板名（appView 的「从文件加载」走这条）", () => {
    expect(predefinedEDeviceTemplateByFile("ems_rtdb.e")).toEqual({ name: "主网实时库", file: "ems_rtdb.e" });
  });

  test("查不到一律 null，不抛异常（调用方据此回落原名）", () => {
    expect(predefinedEDeviceTemplateByName("不存在的模板")).toBeNull();
    expect(predefinedEDeviceTemplateByFile("unknown.e")).toBeNull();
    expect(predefinedEDeviceTemplateByName("")).toBeNull();
    expect(predefinedEDeviceTemplateByFile("")).toBeNull();
  });

  test("大小写与空格敏感（不做模糊匹配，避免选中错模板）", () => {
    expect(predefinedEDeviceTemplateByName("国网e格式")).toBeNull();
    expect(predefinedEDeviceTemplateByName(" 国网E格式")).toBeNull();
    expect(predefinedEDeviceTemplateByFile("SGCG.E")).toBeNull();
  });
});
