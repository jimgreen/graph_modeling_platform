// E 文件接口模板对模型类型的限制策略（纯函数，供主流程导出校验与全网拓扑导出校验共用）。
// 无该 key 的模板名（原始定义/自定义/自定义-xx/文件加载/未知）视为不限制类型。

export const E_DEVICE_TEMPLATE_ALLOWED_MODEL_TYPES: Record<string, string[]> = {
  "国网E格式": ["厂站"],
  "主网实时库": ["厂站"],
  "配网实时库": ["馈线"],
  "台区实时库": ["台区"]
};

const MODEL_TYPE_NETWORK_LABEL: Record<string, string> = { "厂站": "主网", "馈线": "配网", "台区": "台区" };

/** 主流程单模型校验：模板有类型限制且与 modelType 不符时返回提示文案，否则 null。 */
export function eDeviceTemplateSingleTypeMismatchMessage(templateName: string, modelType: string): string | null {
  const allowed = E_DEVICE_TEMPLATE_ALLOWED_MODEL_TYPES[templateName];
  if (!allowed || allowed.includes(modelType)) {
    return null;
  }
  const allowedLabels = allowed.map((type) => MODEL_TYPE_NETWORK_LABEL[type] ?? type).join("、");
  const currentLabel = MODEL_TYPE_NETWORK_LABEL[modelType] ?? modelType;
  return `当前模板「${templateName}」仅支持${allowedLabels}模型，当前模型类型为「${currentLabel}」。请转为自定义配置或切换模型类型后重试。`;
}

/** 全网拓扑校验：模板有类型限制且模型类型集合含不支持的类型时返回提示文案（去重、按序），否则 null。 */
export function eDeviceTemplateNetworkTypeMismatchMessage(
  templateName: string | null | undefined,
  modelTypes: readonly (string | null | undefined)[]
): string | null {
  const allowed = templateName ? E_DEVICE_TEMPLATE_ALLOWED_MODEL_TYPES[templateName] : undefined;
  if (!allowed) {
    return null;
  }
  const offending = [...new Set((modelTypes ?? []).map((value) => String(value ?? "").trim()).filter(Boolean))]
    .filter((modelType) => !allowed.includes(modelType));
  return offending.length > 0
    ? `当前模板「${templateName}」不支持模型类型：${offending.join("、")}；请转为自定义配置或切换模板后重试。`
    : null;
}
