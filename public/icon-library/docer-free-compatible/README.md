# Docer Free Compatible Icon Library

This directory contains editable SVG icons generated for the graph modeling platform.

Important source note:

- The Docer/WPS icon marketplace was checked before generation.
- Public anonymous endpoints exposed icon tags and some SVG storage URLs.
- The probed SVG sample belonged to the `docer_icon` privilege set, and the sample collection reported `free_count=0`.
- To avoid copying assets without verified reuse rights, the SVG files in this directory are original project assets, not copied Docer files.

Generated output:

- Total icons: 796
- SVG format: standalone `viewBox="0 0 64 64"`
- Styling: editable paths using `currentColor` and a default `color` on the root SVG
- External dependencies: none
- Scripts or remote image references: none
- Search: `search-index.json` provides a flat searchable index; `index.html` provides browser-side keyword/category filtering.

Categories:

- `electric-power`: 电力设备
- `converter`: 变流器
- `renewable-generation`: 新能源与发电
- `storage`: 储能
- `thermal`: 热力设备
- `hydrogen`: 氢能
- `measurement-control`: 测控保护
- `generic-shapes`: 通用图形
- `grid-primary-equipment`: 电网一次设备
- `industrial-loads`: 工业负荷
- `automation-communication`: 自动化通信
- `flow-diagram`: 流程图与业务图
- `building-facility`: 建筑与设施
- `weather-environment`: 气象与环境
- `business-operation`: 运营管理
- `diagram-symbols`: 图形符号扩展
- `power-market-carbon`: 电力市场与碳管理
- `safety-fire`: 安全消防
- `maintenance-tools`: 检修工具
- `sensors-instruments`: 传感仪表
- `water-wastewater`: 水务环保
- `oil-gas-chemical`: 油气化工
- `smart-city`: 智慧城市
- `ai-digital`: AI与数字化
- `rail-transit-energy`: 轨道交通能源
- `port-logistics`: 港口与物流
- `building-hvac`: 建筑暖通
- `agriculture-rural-energy`: 农业与乡村能源
- `communication-power`: 通信电源
- `energy-finance-assets`: 能源资产金融
- `lab-testing`: 实验检测
- `emergency-resilience`: 应急韧性
- `mining-metallurgy`: 矿山冶金
- `marine-offshore-energy`: 海洋与海上能源
- `advanced-renewables`: 新能源扩展
- `digital-operations`: 数字运维
- `data-governance`: 数据治理
- `residential-commercial-energy`: 民商用能源
- `power-electronics-control`: 电力电子控制
- `compliance-risk`: 合规与风险
- `campus-energy-management`: 校园能源管理
- `research-lab-facility`: 科研实验设施
- `public-service-facilities`: 公共服务设施
- `teaching-training`: 教学培训
- `utility-metering-billing`: 计量计费
- `low-carbon-campus`: 低碳校园
- `power-grid-protection`: 电力与保护控制
- `generation-link`: 发电环节
- `transmission-link`: 输电环节
- `substation-link`: 变电环节
- `distribution-link`: 配电环节
- `consumption-link`: 用电环节
- `wind-power-scene`: 风电场景
- `hydro-power-scene`: 水电场景
- `thermal-power-scene`: 火电场景
- `solar-pv-scene`: 光伏场景
- `hydrogen-energy-scene`: 氢能场景
- `energy-storage-scene`: 储能场景
- `wind-power-advanced`: 风电细分设备
- `solar-pv-advanced`: 光伏细分设备
- `hydrogen-process-advanced`: 氢能工艺设备
- `storage-advanced-scene`: 储能细分设备
- `power-electronics-scene`: 电力电子设备
- `cooling-energy-scene`: 供冷与冷源
- `gas-energy-scene`: 燃气与气网
- `integrated-energy-scene`: 冷热电气综合能源
- `heating-network-scene`: 供热场景
- `meteorology-scada-scene`: 气象监测场景
- `communication-control-scene`: 通信控制场景

Rebuild:

```bash
node scripts/generate-docer-compatible-icons.mjs
```
