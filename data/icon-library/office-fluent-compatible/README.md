# Office Fluent Compatible Icon Library

This directory contains SVG icons selected from Microsoft Fluent UI System Icons.

Source:

- Package: `@fluentui/svg-icons@1.1.330`
- Repository: https://github.com/microsoft/fluentui-system-icons
- License: MIT

Scope:

- Included: generic Office-style UI, document, collaboration, data, media, status, developer, and canvas-modeling icons.
- Excluded: Microsoft Office application brand logos and proprietary Office built-in icon assets.

Generated output:

- Total icons: 2120
- Style: mostly `24px regular`; a small number use the closest available regular size.
- Format: standalone SVG using Fluent UI's original path geometry and `currentColor`.

Categories:

- `commands`: 常用命令 (223)
- `navigation-view`: 导航视图 (222)
- `documents-files`: 文档文件 (223)
- `formatting`: 文字排版 (210)
- `data-charts`: 数据图表 (189)
- `collaboration`: 协作通信 (224)
- `media-assets`: 媒体素材 (82)
- `status-security`: 状态安全 (146)
- `developer-integration`: 开发集成 (90)
- `canvas-modeling`: 画布建模 (58)
- `maps-places`: 地图地点 (65)
- `transport-facilities`: 交通设施 (25)
- `business-finance`: 业务金融 (75)
- `devices-hardware`: 设备硬件 (76)
- `energy-utilities`: 能源公用事业 (39)
- `cloud-ai-infrastructure`: 云与AI基础设施 (26)
- `security-compliance`: 安全合规 (5)
- `education-research`: 教育科研 (30)
- `health-wellness`: 医疗健康 (14)
- `workflow-automation`: 流程自动化 (17)
- `accessibility-inclusion`: 无障碍与包容 (14)
- `retail-commerce`: 零售商务 (1)
- `mail-calendar`: 邮件日程 (11)
- `meeting-devices`: 会议与终端 (5)
- `forms-tables`: 表单表格 (24)
- `operations-maintenance`: 运营维护 (7)
- `campus-education`: 校园教育 (0)
- `public-sector`: 公共服务 (0)
- `asset-logistics`: 资产与物流 (7)
- `field-service`: 现场服务 (0)
- `energy-control`: 能源与控制 (0)
- `generation-link`: 发电环节 (0)
- `transmission-link`: 输电环节 (1)
- `substation-link`: 变电环节 (0)
- `distribution-link`: 配电环节 (0)
- `consumption-link`: 用电环节 (0)
- `new-energy-equipment`: 新能源设备 (0)
- `power-electronics`: 电力电子 (1)
- `cooling-heating-energy`: 冷热能源 (3)
- `gas-energy`: 燃气能源 (0)
- `integrated-energy`: 综合能源 (0)
- `meteorology-environment`: 气象与环境 (0)
- `communication-network`: 通信网络 (7)

Rebuild:

```bash
node scripts/generate-office-fluent-icons.mjs
```
