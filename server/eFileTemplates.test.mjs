import { readFileSync } from "node:fs";
import { describe, expect, test, vi } from "vitest";
import { E_TEMPLATE_DIR, PREDEFINED_E_DEVICE_TEMPLATES, readPredefinedTemplateBase64 } from "./eFileTemplates.mjs";

// 模板文件在磁盘上读不到时的行为：readPredefinedTemplateBase64 不吞、不降级，
// ENOENT 由 readFile 原样上抛（区别于「模板名不存在」那条同步抛的未知模板）。
let enoentPath = "";
vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    readFile: async (path, ...rest) => {
      if (enoentPath && String(path) === enoentPath) {
        const error = new Error(`ENOENT: no such file or directory, open '${path}'`);
        error.code = "ENOENT";
        error.path = String(path);
        throw error;
      }
      return actual.readFile(path, ...rest);
    }
  };
});

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

  // 回归：模板表是普通对象字面量，直接下标取值会走到 Object.prototype。
  // toString / constructor / hasOwnProperty 取到函数，__proto__ 取到原型对象，
  // 都是 truthy，绕得过 !file 判空，于是 `${E_TEMPLATE_DIR}${file}` 把函数源码
  // 或 [object Object] 当文件名拼成垃圾路径，报 ENOENT 而不是未知模板。
  test("原型链上的键名按未知模板拒绝，不落到读盘路径", async () => {
    const unknown = await readPredefinedTemplateBase64("不存在的模板").catch((error) => error);
    expect(unknown).toBeInstanceOf(Error);
    expect(unknown.message).toBe("未知模板：不存在的模板");

    for (const name of ["toString", "constructor", "__proto__", "hasOwnProperty"]) {
      const error = await readPredefinedTemplateBase64(name).catch((caught) => caught);
      expect(error, `${name} 应当拒绝`).toBeInstanceOf(Error);
      expect(error.message).toBe(`未知模板：${name}`);
      // 命中原型链时是读盘 ENOENT：带 code / path，路径里是函数源码或 [object Object]。
      expect(error.code).toBeUndefined();
      expect(error.path).toBeUndefined();
    }
  });

  test("守卫不误伤：四个预定义模板仍逐字节读回磁盘文件", async () => {
    expect(Object.keys(PREDEFINED_E_DEVICE_TEMPLATES)).toHaveLength(4);
    for (const [name, file] of Object.entries(PREDEFINED_E_DEVICE_TEMPLATES)) {
      const base64 = await readPredefinedTemplateBase64(name);
      expect(typeof base64, name).toBe("string");
      const bytes = Buffer.from(base64, "base64");
      const onDisk = readFileSync(`${E_TEMPLATE_DIR}${file}`);
      expect(bytes.length, name).toBe(onDisk.length);
      expect(bytes.equals(onDisk), name).toBe(true);
    }
  });

  test("模板文件缺失时 ENOENT 原样上抛，不吞也不降级", async () => {
    enoentPath = `${E_TEMPLATE_DIR}sgcc.e`;
    try {
      const error = await readPredefinedTemplateBase64("国网E格式").catch((caught) => caught);
      expect(error.code).toBe("ENOENT");
      expect(error.path).toBe(enoentPath);
      // 与未知模板区分开：名字合法、只是盘上没有这个文件。
      expect(error.message).not.toMatch(/未知模板/);
    } finally {
      enoentPath = "";
    }
    // 注入只作用于上面那一次读，之后照旧。
    expect(typeof (await readPredefinedTemplateBase64("国网E格式"))).toBe("string");
  });
});
