// E 文件接口模板对模型类型的限制策略（纯函数，供主流程导出校验与全网拓扑导出校验共用）。
// 无该 key 的模板名（原始定义/自定义/自定义-xx/文件加载/未知）视为不限制类型。

export const E_DEVICE_TEMPLATE_ALLOWED_MODEL_TYPES: Record<string, string[]> = {
  "国网E格式": ["厂站"],
  "主网实时库": ["厂站"],
  "配网实时库": ["馈线"],
  "台区实时库": ["台区"]
};

const MODEL_TYPE_NETWORK_LABEL: Record<string, string> = { "厂站": "主网", "馈线": "配网", "台区": "台区" };

/**
 * 限制表的唯一查表口。
 *
 * 表是普通对象，直接 `TABLE[key]` 会对原型链成员命中 `Object.prototype` 上的东西：
 * constructor/toString/valueOf/hasOwnProperty 是函数，`__proto__` 是 `Object.prototype`
 * 对象，全都不是数组。随后 `allowed.includes(...)` 抛
 * `TypeError: allowed.includes is not a function` —— 模板名来自工程文件，是外部输入，
 * 这条路径不能因为一个词就被打挂。
 *
 * 故统一加 `Object.hasOwn` 自有键守卫：未命中（含原型链键、空串、空白串）一律按
 * 「无该 key 的模板名视为不限制类型」处理，即返回 undefined，交给调用方的
 * 「不限制」分支 —— 与文件头注释既定的语义一致。
 */
function eDeviceTemplateAllowedModelTypes(templateName: string): string[] | undefined {
  return Object.hasOwn(E_DEVICE_TEMPLATE_ALLOWED_MODEL_TYPES, templateName)
    ? E_DEVICE_TEMPLATE_ALLOWED_MODEL_TYPES[templateName]
    : undefined;
}

/** 主流程单模型校验：模板有类型限制且与 modelType 不符时返回提示文案，否则 null。 */
export function eDeviceTemplateSingleTypeMismatchMessage(templateName: string, modelType: string): string | null {
  const allowed = eDeviceTemplateAllowedModelTypes(templateName);
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
  const allowed = templateName ? eDeviceTemplateAllowedModelTypes(templateName) : undefined;
  if (!allowed) {
    return null;
  }
  const offending = [...new Set((modelTypes ?? []).map((value) => String(value ?? "").trim()).filter(Boolean))]
    .filter((modelType) => !allowed.includes(modelType));
  return offending.length > 0
    ? `当前模板「${templateName}」不支持模型类型：${offending.join("、")}；请转为自定义配置或切换模板后重试。`
    : null;
}
