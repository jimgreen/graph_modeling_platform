const EXACT_PARAMETER_LABELS = Object.freeze({
  rdf_id: "原始标识",
  idx: "设备序号",
  name: "设备名称",
  parent: "所属模型",
  dev_type: "设备类型",
  component_type: "设备类",
  node: "节点号",
  node1: "第一端节点号",
  node2: "第二端节点号",
  node3: "第三端节点号",
  node4: "第四端节点号",
  i_node: "首端节点号",
  j_node: "末端节点号",
  k_node: "中压侧节点号",
  ac_node: "交流侧节点号",
  dc_node: "直流侧节点号",
  control_type: "控制模式",
  status: "开合状态量测值",
  status_set: "开合状态设定值",
  closed_status: "开合状态量测值",
  closed_status_set: "开合状态设定值",
  run_stat: "工作状态",
  regable: "是否可调",
  rated_capacity: "额定容量",
  rated_voltage: "额定电压",
  pbase: "有功功率基准值",
  qbase: "无功功率基准值",
  p_set: "有功设定值",
  q_set: "无功设定值",
  v_set: "电压设定值",
  u_set: "电压设定值",
  i_set: "电流设定值",
  p_max: "有功上限",
  p_min: "有功下限",
  q_max: "无功上限",
  q_min: "无功下限",
  v_max: "电压上限",
  v_min: "电压下限",
  u_max: "电压上限",
  u_min: "电压下限",
  i_max: "电流上限",
  i_min: "电流下限",
  pv0: "有功恒功率比例系数",
  pv1: "有功恒电流比例系数",
  pv2: "有功恒阻抗比例系数",
  qv0: "无功恒功率比例系数",
  qv1: "无功恒电流比例系数",
  qv2: "无功恒阻抗比例系数",
  alpha: "功率调节系数",
  soc: "荷电状态（SOC）",
  initial_soc: "初始荷电状态",
  soc_upper_limit: "荷电状态上限",
  soc_lower_limit: "荷电状态下限",
  e2h_coeff: "电能转换效率",
  h2e_coeff: "氢能发电效率",
  pressure_set: "压力设定值",
  pressure_max: "压力上限",
  pressure_min: "压力下限",
  flow_set: "流量设定值",
  flow_max: "流量上限",
  flow_min: "流量下限",
  supply_temperature: "供水温度",
  supply_temperature_set: "出口温度设定值",
  water_volume: "水容积",
  gas_quantity: "气体数量",
  r: "电阻",
  x: "电抗",
  b: "半充电电纳",
  gt: "励磁电导",
  bt: "励磁电纳",
  tap: "分接头档位",
  tap_set: "分接头档位设定值",
  shift: "相移角",
  r1: "首端等值电阻",
  r2: "末端等值电阻",
  p: "有功量测值",
  q: "无功量测值",
  u: "电压量测值",
  v: "电压量测值",
  i: "电流量测值",
  i_p: "首端有功量测值",
  i_q: "首端无功量测值",
  i_u: "首端电压量测值",
  i_i: "首端电流量测值",
  j_p: "末端有功量测值",
  j_q: "末端无功量测值",
  j_u: "末端电压量测值",
  j_i: "末端电流量测值",
  k_p: "中压侧有功量测值",
  k_q: "中压侧无功量测值",
  k_u: "中压侧电压量测值",
  k_i: "中压侧电流量测值",
  p_ac_set: "交流侧有功设定值",
  q_ac_set: "交流侧无功设定值",
  v_ac_set: "交流侧电压设定值",
  p_dc_set: "直流侧有功设定值",
  i_dc_set: "直流侧电流设定值",
  v_dc_set: "直流侧电压设定值",
  line_width: "线条宽度",
  font_size: "字号",
  font_family: "字体",
  time_constant: "时间常数",
  droop_coeff: "下垂系数",
  power_factor: "功率因数",
  frequency: "频率",
  frequency_set: "频率设定值",
  angle: "相角"
});

const ASSOCIATED_DEVICE_LABELS = Object.freeze({
  ac_unit: "交流电源",
  dc_unit: "直流电源",
  ac_load: "交流负荷",
  dc_load: "直流负荷",
  h2_unit: "氢源",
  h2_load: "氢负荷",
  heat_unit: "热源",
  heat2_unit: "双端热源",
  transformer: "变压器"
});

const SIDE_PREFIXES = Object.freeze([
  ["source_", "首端"],
  ["target_", "末端"],
  ["medium_", "中压侧"],
  ["high_", "高压侧"],
  ["low_", "低压侧"],
  ["ac_", "交流侧"],
  ["dc_", "直流侧"],
  ["i_", "首端"],
  ["j_", "末端"],
  ["k_", "中压侧"]
]);

const TOKEN_LABELS = Object.freeze({
  active: "有功",
  reactive: "无功",
  power: "功率",
  voltage: "电压",
  current: "电流",
  resistance: "电阻",
  reactance: "电抗",
  conductance: "电导",
  susceptance: "电纳",
  magnetizing: "励磁",
  control: "控制",
  type: "模式",
  mode: "模式",
  status: "状态",
  run: "工作",
  stat: "状态",
  rated: "额定",
  capacity: "容量",
  set: "设定值",
  max: "上限",
  min: "下限",
  upper: "上限",
  lower: "下限",
  limit: "限值",
  coeff: "系数",
  coefficient: "系数",
  ratio: "比例",
  constant: "常数",
  time: "时间",
  droop: "下垂",
  node: "节点号",
  initial: "初始",
  temperature: "温度",
  pressure: "压力",
  flow: "流量",
  water: "水",
  volume: "容积",
  gas: "气体",
  quantity: "数量",
  efficiency: "效率",
  frequency: "频率",
  angle: "相角",
  shift: "相移",
  tap: "分接头档位",
  position: "位置",
  level: "等级",
  base: "基准值",
  value: "值",
  measurement: "量测",
  enabled: "是否启用",
  readonly: "是否只读",
  color: "颜色",
  width: "宽度",
  height: "高度",
  size: "大小",
  line: "线条",
  font: "字体",
  family: "字族",
  factor: "因数"
});

export function normalizeDeviceParameterEnglishName(value) {
  return String(value ?? "")
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[^A-Za-z0-9_]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
}

export function isGenericCustomParameterChineseName(value) {
  return /自定义参数/u.test(String(value ?? "").trim());
}

function translatedTokenPhrase(normalizedName) {
  const tokens = normalizedName.split("_").filter(Boolean);
  if (!tokens.length) return undefined;
  const labels = tokens.map((token) => TOKEN_LABELS[token]);
  return labels.every(Boolean) ? labels.join("") : undefined;
}

export function inferDeviceParameterChineseName(enNameValue) {
  const normalizedName = normalizeDeviceParameterEnglishName(enNameValue);
  if (!normalizedName) return undefined;

  const exact = EXACT_PARAMETER_LABELS[normalizedName];
  if (exact) return exact;

  const relationMatch = /^idx_(ac_unit|dc_unit|ac_load|dc_load|h2_unit|h2_load|heat_unit|heat2_unit|transformer)_t(\d+)$/u.exec(normalizedName);
  if (relationMatch) {
    return `第${relationMatch[2]}端关联${ASSOCIATED_DEVICE_LABELS[relationMatch[1]] ?? "设备"}序号`;
  }

  for (const [prefix, sideLabel] of SIDE_PREFIXES) {
    if (!normalizedName.startsWith(prefix)) continue;
    const baseName = normalizedName.slice(prefix.length);
    const baseLabel = EXACT_PARAMETER_LABELS[baseName] ?? translatedTokenPhrase(baseName);
    if (baseLabel) return `${sideLabel}${baseLabel}`;
  }

  return translatedTokenPhrase(normalizedName);
}

export function meaningfulDeviceParameterChineseName(enNameValue, cnNameValue) {
  const enName = String(enNameValue ?? "").trim();
  const cnName = String(cnNameValue ?? "").trim();
  const hasMeaningfulChineseName = /[\u3400-\u9fff]/u.test(cnName) &&
    cnName !== enName &&
    !isGenericCustomParameterChineseName(cnName);
  if (hasMeaningfulChineseName) return cnName;
  return inferDeviceParameterChineseName(enName) ?? `自定义参数（${enName || "未命名"}）`;
}
