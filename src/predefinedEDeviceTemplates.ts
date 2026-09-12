// 预定义 E 设备模板单源：模板名（导出/发送时用 template=）与模板文件名（「从文件加载」用）的对应。
// 与 server/eFileTemplates.mjs 的 PREDEFINED_E_DEVICE_TEMPLATES 同名同序；后端的类型门控见
// eDeviceTemplateTypePolicy（哪些模型类型能用哪个模板）。

export const PREDEFINED_E_DEVICE_TEMPLATES = [
  { name: "国网E格式", file: "sgcc.e" },
  { name: "主网实时库", file: "ems_rtdb.e" },
  { name: "配网实时库", file: "dms_rtdb.e" },
  { name: "台区实时库", file: "taiqu_rtdb.e" }
] as const;

export function predefinedEDeviceTemplateByName(name: string) {
  return PREDEFINED_E_DEVICE_TEMPLATES.find((template) => template.name === name) ?? null;
}

export function predefinedEDeviceTemplateByFile(file: string) {
  return PREDEFINED_E_DEVICE_TEMPLATES.find((template) => template.file === file) ?? null;
}
