// 预定义 E 文件接口模板（public/e-templates/ 下文件）。
// 供 v1/runtime/e-file（经前端计算）与 v1/schemes/model/e-file（后端计算）共用。
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

export const PREDEFINED_E_DEVICE_TEMPLATES = {
  "国网E格式": "sgcc.e",
  "主网实时库": "ems_rtdb.e",
  "配网实时库": "dms_rtdb.e",
  "台区实时库": "taiqu_rtdb.e"
};

// 模板文件目录（server/../public/e-templates/）
export const E_TEMPLATE_DIR = fileURLToPath(new URL("../public/e-templates/", import.meta.url));

// 读预定义模板文件 → base64。模板可能为 UTF-8 或 GBK 编码，base64 透传原始字节，由消费方 decodeAuto 兼容解码。
export async function readPredefinedTemplateBase64(templateName) {
  // Object.hasOwn 守卫：PREDEFINED_E_DEVICE_TEMPLATES 是普通对象字面量，
  // 下标取值会一路走到 Object.prototype —— 传 "toString" / "constructor" /
  // "__proto__" / "hasOwnProperty" 时 file 拿到的是函数或原型对象（truthy），
  // 绕不过下面的 !file 判空，随后 `${E_TEMPLATE_DIR}${file}` 把函数源码当文件名
  // 拼出垃圾路径，报出来的还是 ENOENT 而不是「未知模板」。
  if (!Object.hasOwn(PREDEFINED_E_DEVICE_TEMPLATES, templateName)) {
    throw new Error(`未知模板：${templateName}`);
  }
  const file = PREDEFINED_E_DEVICE_TEMPLATES[templateName];
  if (!file) {
    throw new Error(`未知模板：${templateName}`);
  }
  const buffer = await readFile(`${E_TEMPLATE_DIR}${file}`);
  return buffer.toString("base64");
}
