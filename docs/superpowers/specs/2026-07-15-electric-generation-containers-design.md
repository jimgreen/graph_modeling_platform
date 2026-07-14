# 交直流发电容器元件设计

## 1. 目标

在现有元件库中提供风力、光伏、火力、水力、核能五类发电设施的交直流容器元件，共 10 种：

| 中文名称 | 内部类型 | 变更方式 | 关联设备模型 |
| --- | --- | --- | --- |
| 交流风力发电机 | `ac-wind-source` | 现有类型就地升级 | `ACGenerator` |
| 直流风力发电机 | `dc-wind-source` | 现有类型就地升级 | `DCGenerator` |
| 交流光伏发电机 | `ac-pv-source` | 现有类型就地升级 | `ACGenerator` |
| 直流光伏发电机 | `dc-pv-source` | 现有类型就地升级 | `DCGenerator` |
| 交流火力发电机 | `ac-thermal-source` | 现有类型就地升级 | `ACGenerator` |
| 直流火力发电机 | `dc-thermal-source` | 新增类型 | `DCGenerator` |
| 交流水力发电机 | `ac-hydro-source` | 现有类型就地升级 | `ACGenerator` |
| 直流水力发电机 | `dc-hydro-source` | 新增类型 | `DCGenerator` |
| 交流核能发电机 | `ac-nuclear-source` | 现有类型就地升级 | `ACGenerator` |
| 直流核能发电机 | `dc-nuclear-source` | 新增类型 | `DCGenerator` |

保留已有类型标识的目的是让历史模型继续识别原有节点，不在元件库中保留重复的“普通发电源”和“容器发电机”两套类型。

## 2. 容器结构

每种发电设施都是单端容器：

- 交流类型使用一个交流端子，端子标签为“交流发电机端”，关联类型为 `ac-generator`，关联字段为 `idx_ac_unit_t1`。
- 直流类型使用一个直流端子，端子标签为“直流发电机端”，关联类型为 `dc-generator`，关联字段为 `idx_dc_unit_t1`。
- 容器设置 `isContainer: true`，端子角色为 `single-source`。
- 容器本体保存电站或机组的能源专属属性。
- 关联设备保存标准 `ACGenerator` 或 `DCGenerator` 参数，包括节点号、控制方式、功率/电压/电流设定值和运行状态。
- 元件定义界面中，“设备本体”与“端1（交流电源）”或“端1（直流电源）”分别显示，不把两组参数混为一组。

## 3. 参数定义

所有参数均同时提供中文名称和稳定的英文存储字段。原类型已有的 `ratedPower`、`ratedVoltage` 和风速字段继续沿用，避免历史数据丢失。

### 3.1 公共容器参数

| 中文名称 | 英文字段 | 类型 | 说明 |
| --- | --- | --- | --- |
| 序号 | `idx` | integer | 只读，容器自身序号 |
| 名称 | `name` | string | 只读，由节点名称维护 |
| 设备状态 | `status` | numberEnum | `1` 运行、`0` 停止 |
| 工作状态 | `run_stat` | stringEnum | 运行、停运 |
| 发电类型 | `sourceType` | string | 固定为风力、光伏、火力、水力或核能 |
| 额定功率 | `ratedPower` | string | 保留单位的工程值 |
| 额定电压 | `ratedVoltage` | string | 交流或直流额定电压 |

关联 idx 参数根据电气类型分别使用 `idx_ac_unit_t1` 或 `idx_dc_unit_t1`，只读并由平台统一分配。

### 3.2 风力发电参数

| 中文名称 | 英文字段 | 类型 |
| --- | --- | --- |
| 风机型号 | `windTurbineModel` | string |
| 风机台数 | `windTurbineCount` | integer |
| 单机额定功率 | `unitRatedPower` | string |
| 切入风速 | `cutInWindSpeed` | string |
| 额定风速 | `ratedWindSpeed` | string |
| 切出风速 | `cutOutWindSpeed` | string |
| 叶轮直径 | `rotorDiameter` | string |
| 轮毂高度 | `hubHeight` | string |

### 3.3 光伏发电参数

| 中文名称 | 英文字段 | 类型 |
| --- | --- | --- |
| 光伏组件型号 | `pvModuleModel` | string |
| 光伏组件数量 | `pvModuleCount` | integer |
| 单组件额定功率 | `moduleRatedPower` | string |
| 组件效率 | `moduleEfficiency` | string |
| 阵列面积 | `arrayArea` | string |
| MPPT 路数 | `mpptCount` | integer |

### 3.4 火力发电参数

| 中文名称 | 英文字段 | 类型 |
| --- | --- | --- |
| 火电机组型号 | `thermalUnitModel` | string |
| 燃料类型 | `fuelType` | stringEnum |
| 热效率 | `thermalEfficiency` | string |
| 热耗率 | `heatRate` | string |
| 主蒸汽压力 | `mainSteamPressure` | string |
| 主蒸汽温度 | `mainSteamTemperature` | string |

`fuelType` 使用稳定值与中文标签：`coal`（煤）、`gas`（天然气）、`oil`（燃油）、`biomass`（生物质）。

### 3.5 水力发电参数

| 中文名称 | 英文字段 | 类型 |
| --- | --- | --- |
| 水电机组型号 | `hydroUnitModel` | string |
| 水轮机类型 | `turbineType` | stringEnum |
| 水轮机台数 | `turbineCount` | integer |
| 单机额定功率 | `unitRatedPower` | string |
| 设计水头 | `designHead` | string |
| 设计流量 | `designFlow` | string |
| 额定转速 | `ratedSpeed` | string |
| 发电机效率 | `generatorEfficiency` | string |

`turbineType` 使用稳定值与中文标签：`francis`（混流式）、`kaplan`（轴流式）、`pelton`（冲击式）、`bulb`（贯流式）。

### 3.6 核能发电参数

| 中文名称 | 英文字段 | 类型 |
| --- | --- | --- |
| 核电机组型号 | `nuclearUnitModel` | string |
| 反应堆类型 | `reactorType` | stringEnum |
| 反应堆数量 | `reactorCount` | integer |
| 单机额定功率 | `unitRatedPower` | string |
| 反应堆热功率 | `reactorThermalPower` | string |
| 热效率 | `thermalEfficiency` | string |
| 一回路压力 | `primaryLoopPressure` | string |
| 主蒸汽压力 | `mainSteamPressure` | string |
| 主蒸汽温度 | `mainSteamTemperature` | string |
| 容量因子 | `capacityFactor` | string |

`reactorType` 使用稳定值与中文标签：`pwr`（压水堆）、`bwr`（沸水堆）、`phwr`（重水堆）、`htgr`（高温气冷堆）、`fbr`（快中子增殖堆）。

## 4. 默认值

- 交流风力：35 kV、50 MW；直流风力：1500 V、10 MW。
- 交流光伏：10 kV、20 MW；直流光伏：1500 V、5 MW。
- 交流火力：220 kV、600 MW；直流火力：1500 V、600 MW。
- 交流水力：220 kV、300 MW；直流水力：1500 V、300 MW。
- 交流核能：500 kV、1000 MW；直流核能：1500 V、1000 MW。
- 风力默认风速为 3 m/s、12 m/s、25 m/s。
- 个性化参数默认值用于新建节点；历史节点已有同名参数时始终保留历史值。

## 5. 历史模型迁移

加载历史模型时，对 `ac-wind-source`、`dc-wind-source`、`ac-pv-source`、`dc-pv-source`、`ac-thermal-source`、`ac-hydro-source` 和 `ac-nuclear-source` 执行幂等迁移：

1. 保留节点 id、kind、名称、位置、尺寸、旋转、图层、端子节点号、电压基值和连接线。
2. 当节点缺少容器标记时补充 `is_container=1`。
3. 补充缺失的容器参数定义和对应关联 idx 字段，不覆盖已有属性值。
4. 通过现有永久序号分配逻辑为关联的 `ACGenerator` 或 `DCGenerator` 分配全局唯一 idx。
5. 重复加载和重复归一化不得再次创建关联字段、改变 idx 或把模型标记为用户修改。

新类型 `dc-thermal-source`、`dc-hydro-source`、`dc-nuclear-source` 不需要历史 kind 迁移。

## 6. 元件定义覆盖

发电容器必须使用自身 kind 作为定义覆盖键，不能继续继承通用 `ACGenerator` 或 `DCGenerator` 的容器本体定义。这样修改某一种风电、光伏、火电、水电或核电容器的参数和图形时，不会污染其他发电类型。

关联发电机参数仍由标准 `ACGenerator` 或 `DCGenerator` 字段集合生成。容器本体定义与关联发电机定义保持独立。

## 7. 量测

- 交流发电容器默认在端子 `t1` 创建关联发电机量测：有功功率、无功功率、电压、频率。
- 直流发电容器默认在端子 `t1` 创建关联发电机量测：有功功率、电压、电流。
- 新建默认配置直接使用 `position: "t1"`。
- 对历史默认配置，仅在这些内置发电类型的量测项没有显式位置时迁移到 `t1`；用户明确配置过的位置不改动。
- 量测 source point 继续使用现有 `nodeId.t1.<field>` 规则，保证脚本可以独立定位和更新量测值。

## 8. 保存与导出

- 项目 JSON 和元件库导入导出必须保留容器标记、端子关联、个性化参数、枚举定义和定义覆盖。
- SVG 中每个发电容器仍作为一个可见设备导出，不额外输出不可见的虚拟发电机图形。
- E 文件中容器本体不伪装成普通发电机；由关联设备记录输出到 `ACGenerator` 或 `DCGenerator`，节点号来自容器端子。
- 前端导出与后端方案导出采用相同语义，避免同一模型从两个入口导出不同的发电机记录。
- 关联设备 idx 和名称遵循现有容器规则，并参与重复校验。

## 9. 图形表现

- 沿用现有风力、光伏、火力、水力和核能图形变体，不重新设计图标。
- 新增的直流火力、直流水力、直流核能分别复用火力、水力、核能图形变体。
- 端子位于外边框，端子到内部图案的连接线继续使用统一端子渲染逻辑。
- 元件库显示完整中文名称，内部类型保持英文 kind。

## 10. 错误处理与兼容边界

- 若关联类型与端子类型不匹配，沿用容器关联校验并阻止保存无效定义。
- 若历史节点包含未知个性化参数，参数原样保留，不在迁移中删除。
- 若历史节点已有 kind 专属定义覆盖，优先应用该覆盖；通用发电机覆盖只作用于关联设备参数，不覆盖容器本体。
- 不在本次范围内把柴油或储能同步改造成容器。
- 不新增新的 E 文件段，能源专属属性保存在项目和元件定义数据中，标准电气计算参数仍进入 `ACGenerator`/`DCGenerator`。

## 11. 验收标准

1. 元件库中准确出现 10 种完整命名的发电容器，不出现旧名称重复项。
2. 每种元件的 `isContainer`、端子类型、端子标签和关联模型正确。
3. 元件定义页面能够分别编辑设备本体个性化参数和端 1 关联发电机参数。
4. 现有 7 种历史 kind 节点加载后自动获得容器能力，连接关系和已有数据不变。
5. AC 关联记录进入 `ACGenerator`，DC 关联记录进入 `DCGenerator`，idx 全局唯一。
6. 默认量测显示在端子关联层，且交直流量测集合正确。
7. 保存后重新打开，所有参数、枚举、关联字段和图形保持一致。
8. SVG、E 文件、元件库导入导出和后端方案导出均通过针对性测试。
9. `pnpm vitest run`、`pnpm tsc --noEmit` 和生产构建通过。
