# 内置设备参数语义类型审计报告

- 扫描范围：全部 112 个非静态内置模板（静态图元按既有规则排除）。
- 修改范围：110 个方向模板，合并竖向变体后为 75 类设备、134 项参数变更。
- 类型规则：工程量为 `float`；数量和拓扑引用为 `integer`；固定文本选项为 `stringEnum`；数字状态码为 `numberEnum`；标识、型号、名称和说明保留 `string`。
- 默认值规则：`float`/`integer` 默认值只保留数字，不再携带 MW、kV、MVA、MPa、degC、%、m/s 等单位。历史实例中的任意非数字自定义文本不会被清空。
- 审计结果：数值类型非数字默认值 0 项；同名参数混合类型 0 项；枚举缺少选项 0 项。

## 变更明细

| 设备 | 元件类型 | 参数 | 修改前类型 | 修改后类型 | 修改前默认值 | 修改后默认值 |
|---|---|---|---|---|---|---|
| 盒型开关（含竖向变体） | `ac-box-breaker` | run_stat（`run_stat`） | `string` | `stringEnum` | （空） | 运行 |
| 盒型开关（含竖向变体） | `ac-box-breaker` | status（`status`） | `integer` | `numberEnum` | 1 | 1 |
| 交流断路器（含竖向变体） | `ac-breaker` | run_stat（`run_stat`） | `string` | `stringEnum` | （空） | 运行 |
| 交流断路器（含竖向变体） | `ac-breaker` | status（`status`） | `string` | `numberEnum` | （空） | 1 |
| 交流母线（含竖向变体） | `ac-bus` | run_stat（`run_stat`） | `string` | `stringEnum` | （空） | 运行 |
| 交流柴油发电机 | `ac-diesel-source` | alpha（`alpha`） | `string` | `float` | （空） | （空） |
| 交流柴油发电机 | `ac-diesel-source` | control_type（`control_type`） | `string` | `stringEnum` | （空） | PV |
| 交流电制氢（含竖向变体） | `ac-electrolyzer` | hydrogen_flow（`hydrogen_flow`） | `string` | `float` | 1000 Nm3/h | 1000 |
| 交流电制氢（含竖向变体） | `ac-electrolyzer` | rated_power（`rated_power`） | `float` | `float` | 5 MW | 5 |
| 交流电制氢（含竖向变体） | `ac-electrolyzer` | rated_voltage（`rated_voltage`） | `float` | `float` | 10 kV | 10 |
| 交流燃料电池（含竖向变体） | `ac-fuel-cell` | hydrogen_flow（`hydrogen_flow`） | `string` | `float` | 600 Nm3/h | 600 |
| 交流燃料电池（含竖向变体） | `ac-fuel-cell` | rated_power（`rated_power`） | `float` | `float` | 3 MW | 3 |
| 交流燃料电池（含竖向变体） | `ac-fuel-cell` | rated_voltage（`rated_voltage`） | `float` | `float` | 10 kV | 10 |
| 接地刀闸（含竖向变体） | `ac-ground-disconnector` | run_stat（`run_stat`） | `string` | `stringEnum` | （空） | 运行 |
| 接地刀闸（含竖向变体） | `ac-ground-disconnector` | status（`status`） | `integer` | `numberEnum` | 0 | 0 |
| 交流电制热（含竖向变体） | `ac-heater` | heat_power（`heat_power`） | `float` | `float` | 4.8 MW | 4.8 |
| 交流电制热（含竖向变体） | `ac-heater` | rated_power（`rated_power`） | `float` | `float` | 5 MW | 5 |
| 交流电制热（含竖向变体） | `ac-heater` | rated_voltage（`rated_voltage`） | `float` | `float` | 10 kV | 10 |
| 交流水力发电机 | `ac-hydro-source` | alpha（`alpha`） | `string` | `float` | （空） | （空） |
| 交流水力发电机 | `ac-hydro-source` | control_type（`control_type`） | `string` | `stringEnum` | （空） | PV |
| 交流线路（含竖向变体） | `ac-line` | run_stat（`run_stat`） | `string` | `stringEnum` | （空） | 运行 |
| 交流负荷 | `ac-load` | run_stat（`run_stat`） | `string` | `stringEnum` | （空） | 运行 |
| 交流核能发电机 | `ac-nuclear-source` | alpha（`alpha`） | `string` | `float` | （空） | （空） |
| 交流核能发电机 | `ac-nuclear-source` | control_type（`control_type`） | `string` | `stringEnum` | （空） | PV |
| 交流光伏发电机 | `ac-pv-source` | alpha（`alpha`） | `string` | `float` | （空） | （空） |
| 交流光伏发电机 | `ac-pv-source` | control_type（`control_type`） | `string` | `stringEnum` | （空） | PV |
| 交流线路（自适应） | `ac-routable-line` | run_stat（`run_stat`） | `string` | `stringEnum` | （空） | 运行 |
| 交流电源 | `ac-source` | alpha（`alpha`） | `string` | `float` | （空） | （空） |
| 交流电源 | `ac-source` | control_type（`control_type`） | `string` | `stringEnum` | （空） | PV |
| 交流电源 | `ac-source` | 频率（`frequency`） | `string` | `float` | 50 Hz | 50 |
| 交流电源 | `ac-source` | 额定容量（`rated_capacity`） | `string` | `float` | 10 MW | 10 |
| 交流电源 | `ac-source` | 额定电压（`rated_voltage`） | `string` | `float` | 10 kV | 10 |
| 交流电源 | `ac-source` | run_stat（`run_stat`） | `string` | `stringEnum` | （空） | 运行 |
| 交流电源 | `ac-source` | 短路容量（`short_circuit_capacity`） | `string` | `float` | 500 MVA | 500 |
| 交流电化学储能 | `ac-storage` | alpha（`alpha`） | `string` | `float` | （空） | （空） |
| 交流电化学储能 | `ac-storage` | control_type（`control_type`） | `string` | `stringEnum` | （空） | PV |
| 交流开关（含竖向变体） | `ac-switch` | run_stat（`run_stat`） | `string` | `stringEnum` | （空） | 运行 |
| 交流开关（含竖向变体） | `ac-switch` | status（`status`） | `integer` | `numberEnum` | 1 | 1 |
| 终端变负荷 | `ac-terminal-transformer-load` | run_stat（`run_stat`） | `string` | `stringEnum` | （空） | 运行 |
| 交流火力发电机 | `ac-thermal-source` | alpha（`alpha`） | `string` | `float` | （空） | （空） |
| 交流火力发电机 | `ac-thermal-source` | control_type（`control_type`） | `string` | `stringEnum` | （空） | PV |
| 三绕组主变 | `ac-three-winding-transformer` | shift1（`shift1`） | `integer` | `float` | 0 | 0 |
| 三绕组主变 | `ac-three-winding-transformer` | shift2（`shift2`） | `integer` | `float` | 0 | 0 |
| 三绕组主变 | `ac-three-winding-transformer` | shift3（`shift3`） | `integer` | `float` | 0 | 0 |
| 三绕组主变(中性点) | `ac-three-winding-transformer-neutral` | shift1（`shift1`） | `integer` | `float` | 0 | 0 |
| 三绕组主变(中性点) | `ac-three-winding-transformer-neutral` | shift2（`shift2`） | `integer` | `float` | 0 | 0 |
| 三绕组主变(中性点) | `ac-three-winding-transformer-neutral` | shift3（`shift3`） | `integer` | `float` | 0 | 0 |
| 交流电制热2 | `ac-two-port-heater` | heat_power（`heat_power`） | `float` | `float` | 4.8 MW | 4.8 |
| 交流电制热2 | `ac-two-port-heater` | rated_power（`rated_power`） | `float` | `float` | 5 MW | 5 |
| 交流电制热2 | `ac-two-port-heater` | rated_voltage（`rated_voltage`） | `float` | `float` | 10 kV | 10 |
| 交流电制热2 | `ac-two-port-heater` | return_temperature（`return_temperature`） | `float` | `float` | 70 degC | 70 |
| 交流电制热2 | `ac-two-port-heater` | supply_temperature（`supply_temperature`） | `float` | `float` | 95 degC | 95 |
| 交流风力发电机 | `ac-wind-source` | alpha（`alpha`） | `string` | `float` | （空） | （空） |
| 交流风力发电机 | `ac-wind-source` | control_type（`control_type`） | `string` | `stringEnum` | （空） | PV |
| 交流零阻抗支路（含竖向变体） | `ac-zero-branch` | run_stat（`run_stat`） | `string` | `stringEnum` | （空） | 运行 |
| 交流零阻抗支路（自适应） | `ac-zero-routable-branch` | run_stat（`run_stat`） | `string` | `stringEnum` | （空） | 运行 |
| ACAC变流器（含竖向变体） | `acac-converter` | run_stat（`run_stat`） | `string` | `stringEnum` | （空） | 运行 |
| ACDC变流器（含竖向变体） | `acdc-converter` | run_stat（`run_stat`） | `string` | `stringEnum` | （空） | 运行 |
| 直流断路器（含竖向变体） | `dc-breaker` | run_stat（`run_stat`） | `string` | `stringEnum` | （空） | 运行 |
| 直流断路器（含竖向变体） | `dc-breaker` | status（`status`） | `string` | `numberEnum` | （空） | 1 |
| 直流母线（含竖向变体） | `dc-bus` | run_stat（`run_stat`） | `string` | `stringEnum` | （空） | 运行 |
| 直流柴油发电机 | `dc-diesel-source` | control_type（`control_type`） | `string` | `stringEnum` | （空） | P |
| 直流电制氢（含竖向变体） | `dc-electrolyzer` | hydrogen_flow（`hydrogen_flow`） | `string` | `float` | 1000 Nm3/h | 1000 |
| 直流电制氢（含竖向变体） | `dc-electrolyzer` | rated_power（`rated_power`） | `float` | `float` | 5 MW | 5 |
| 直流电制氢（含竖向变体） | `dc-electrolyzer` | rated_voltage（`rated_voltage`） | `float` | `float` | 750 V | 750 |
| 直流燃料电池（含竖向变体） | `dc-fuel-cell` | hydrogen_flow（`hydrogen_flow`） | `string` | `float` | 600 Nm3/h | 600 |
| 直流燃料电池（含竖向变体） | `dc-fuel-cell` | rated_power（`rated_power`） | `float` | `float` | 3 MW | 3 |
| 直流燃料电池（含竖向变体） | `dc-fuel-cell` | rated_voltage（`rated_voltage`） | `float` | `float` | 750 V | 750 |
| 直流电制热（含竖向变体） | `dc-heater` | heat_power（`heat_power`） | `float` | `float` | 4.8 MW | 4.8 |
| 直流电制热（含竖向变体） | `dc-heater` | rated_power（`rated_power`） | `float` | `float` | 5 MW | 5 |
| 直流电制热（含竖向变体） | `dc-heater` | rated_voltage（`rated_voltage`） | `float` | `float` | 750 V | 750 |
| 直流水力发电机 | `dc-hydro-source` | control_type（`control_type`） | `string` | `stringEnum` | （空） | P |
| 直流线路（含竖向变体） | `dc-line` | run_stat（`run_stat`） | `string` | `stringEnum` | （空） | 运行 |
| 直流负荷 | `dc-load` | run_stat（`run_stat`） | `string` | `stringEnum` | （空） | 运行 |
| 直流核能发电机 | `dc-nuclear-source` | control_type（`control_type`） | `string` | `stringEnum` | （空） | P |
| 直流光伏发电机 | `dc-pv-source` | control_type（`control_type`） | `string` | `stringEnum` | （空） | P |
| 直流线路（自适应） | `dc-routable-line` | run_stat（`run_stat`） | `string` | `stringEnum` | （空） | 运行 |
| 直流电源 | `dc-source` | control_type（`control_type`） | `string` | `stringEnum` | （空） | P |
| 直流电源 | `dc-source` | 最大电流（`max_current`） | `string` | `float` | 2000 A | 2000 |
| 直流电源 | `dc-source` | 额定容量（`rated_capacity`） | `string` | `float` | 10 MW | 10 |
| 直流电源 | `dc-source` | 额定电压（`rated_voltage`） | `string` | `float` | 750 V | 750 |
| 直流电源 | `dc-source` | run_stat（`run_stat`） | `string` | `stringEnum` | （空） | 运行 |
| 直流电化学储能 | `dc-storage` | control_type（`control_type`） | `string` | `stringEnum` | （空） | P |
| 直流开关（含竖向变体） | `dc-switch` | run_stat（`run_stat`） | `string` | `stringEnum` | （空） | 运行 |
| 直流开关（含竖向变体） | `dc-switch` | status（`status`） | `integer` | `numberEnum` | 1 | 1 |
| 直流火力发电机 | `dc-thermal-source` | control_type（`control_type`） | `string` | `stringEnum` | （空） | P |
| 直流电制热2 | `dc-two-port-heater` | heat_power（`heat_power`） | `float` | `float` | 4.8 MW | 4.8 |
| 直流电制热2 | `dc-two-port-heater` | rated_power（`rated_power`） | `float` | `float` | 5 MW | 5 |
| 直流电制热2 | `dc-two-port-heater` | rated_voltage（`rated_voltage`） | `float` | `float` | 750 V | 750 |
| 直流电制热2 | `dc-two-port-heater` | return_temperature（`return_temperature`） | `float` | `float` | 70 degC | 70 |
| 直流电制热2 | `dc-two-port-heater` | supply_temperature（`supply_temperature`） | `float` | `float` | 95 degC | 95 |
| 直流风力发电机 | `dc-wind-source` | control_type（`control_type`） | `string` | `stringEnum` | （空） | P |
| 直流零阻抗支路（含竖向变体） | `dc-zero-branch` | run_stat（`run_stat`） | `string` | `stringEnum` | （空） | 运行 |
| 直流零阻抗支路（自适应） | `dc-zero-routable-branch` | run_stat（`run_stat`） | `string` | `stringEnum` | （空） | 运行 |
| DCAC变流器（含竖向变体） | `dcac-converter` | run_stat（`run_stat`） | `string` | `stringEnum` | （空） | 运行 |
| DCDC变流器（含竖向变体） | `dcdc-converter` | run_stat（`run_stat`） | `string` | `stringEnum` | （空） | 运行 |
| 四端热交换器 | `four-port-heat-exchanger` | node1（`node1`） | `string` | `integer` | （空） | （空） |
| 四端热交换器 | `four-port-heat-exchanger` | node2（`node2`） | `string` | `integer` | （空） | （空） |
| 四端热交换器 | `four-port-heat-exchanger` | node3（`node3`） | `string` | `integer` | （空） | （空） |
| 四端热交换器 | `four-port-heat-exchanger` | node4（`node4`） | `string` | `integer` | （空） | （空） |
| 四端热交换器 | `four-port-heat-exchanger` | run_stat（`run_stat`） | `string` | `stringEnum` | （空） | 运行 |
| 供热锅炉 | `heat-boiler` | heat_power（`heat_power`） | `float` | `float` | 10 MW | 10 |
| 供热锅炉 | `heat-boiler` | supply_temperature（`supply_temperature`） | `float` | `float` | 95 degC | 95 |
| 热力母线（含竖向变体） | `heat-bus` | run_stat（`run_stat`） | `string` | `stringEnum` | （空） | 运行 |
| 双端热交换器（含竖向变体） | `heat-exchanger` | run_stat（`run_stat`） | `string` | `stringEnum` | （空） | 运行 |
| 输热管道（含竖向变体） | `heat-pipeline` | run_stat（`run_stat`） | `string` | `stringEnum` | （空） | 运行 |
| 循环水泵（含竖向变体） | `heat-pump` | run_stat（`run_stat`） | `string` | `stringEnum` | （空） | 运行 |
| 热力线路（自适应） | `heat-routable-line` | run_stat（`run_stat`） | `string` | `stringEnum` | （空） | 运行 |
| 截止阀（含竖向变体） | `heat-shutoff-valve` | run_stat（`run_stat`） | `string` | `stringEnum` | （空） | 运行 |
| 截止阀（含竖向变体） | `heat-shutoff-valve` | status（`status`） | `integer` | `numberEnum` | 1 | 1 |
| 单端热源 | `heat-source` | run_stat（`run_stat`） | `string` | `stringEnum` | （空） | 运行 |
| 氢能母线（含竖向变体） | `hydrogen-bus` | run_stat（`run_stat`） | `string` | `stringEnum` | （空） | 运行 |
| 氢压机（含竖向变体） | `hydrogen-compressor` | run_stat（`run_stat`） | `string` | `stringEnum` | （空） | 运行 |
| 氢荷 | `hydrogen-load` | run_stat（`run_stat`） | `string` | `stringEnum` | （空） | 运行 |
| 输氢管道（含竖向变体） | `hydrogen-pipeline` | run_stat（`run_stat`） | `string` | `stringEnum` | （空） | 运行 |
| 减压阀（含竖向变体） | `hydrogen-pressure-reducer` | run_stat（`run_stat`） | `string` | `stringEnum` | （空） | 运行 |
| 输氢管道（自适应） | `hydrogen-routable-pipeline` | run_stat（`run_stat`） | `string` | `stringEnum` | （空） | 运行 |
| 截止阀（含竖向变体） | `hydrogen-shutoff-valve` | run_stat（`run_stat`） | `string` | `stringEnum` | （空） | 运行 |
| 截止阀（含竖向变体） | `hydrogen-shutoff-valve` | status（`status`） | `integer` | `numberEnum` | 1 | 1 |
| 氢源 | `hydrogen-source` | run_stat（`run_stat`） | `string` | `stringEnum` | （空） | 运行 |
| 储氢罐 | `hydrogen-tank` | run_stat（`run_stat`） | `string` | `stringEnum` | （空） | 运行 |
| 集装格式储氢罐 | `hydrogen-tank-container` | run_stat（`run_stat`） | `string` | `stringEnum` | （空） | 运行 |
| 横卧式储氢罐 | `hydrogen-tank-horizontal` | run_stat（`run_stat`） | `string` | `stringEnum` | （空） | 运行 |
| 单端热荷 | `single-port-heat-load` | run_stat（`run_stat`） | `string` | `stringEnum` | （空） | 运行 |
| 储热罐 | `thermal-storage-tank` | run_stat（`run_stat`） | `string` | `stringEnum` | （空） | 运行 |
| 三端热交换器 | `three-port-heat-exchanger` | node1（`node1`） | `string` | `integer` | （空） | （空） |
| 三端热交换器 | `three-port-heat-exchanger` | node2（`node2`） | `string` | `integer` | （空） | （空） |
| 三端热交换器 | `three-port-heat-exchanger` | node3（`node3`） | `string` | `integer` | （空） | （空） |
| 三端热交换器 | `three-port-heat-exchanger` | run_stat（`run_stat`） | `string` | `stringEnum` | （空） | 运行 |
| 供热锅炉2（含竖向变体） | `two-port-heat-boiler` | heat_power（`heat_power`） | `float` | `float` | 10 MW | 10 |
| 供热锅炉2（含竖向变体） | `two-port-heat-boiler` | return_temperature（`return_temperature`） | `float` | `float` | 70 degC | 70 |
| 供热锅炉2（含竖向变体） | `two-port-heat-boiler` | supply_temperature（`supply_temperature`） | `float` | `float` | 95 degC | 95 |
| 双端热荷（含竖向变体） | `two-port-heat-load` | run_stat（`run_stat`） | `string` | `stringEnum` | （空） | 运行 |
| 双端热源（含竖向变体） | `two-port-heat-source` | run_stat（`run_stat`） | `string` | `stringEnum` | （空） | 运行 |
