# Open Source SVG Icon Library

This directory contains a curated, categorized set of SVG icons from license-clear open source packages.

Output:

- Total icons: 11012
- Source libraries: 53
- Categories: 34
- Search: `search-index.json` provides a flat searchable index; `index.html` provides browser-side keyword/category/source/license filtering.
- Styling: SVGs are normalized to use `currentColor` when the source shape does not specify fill or stroke.
- Excluded: obvious brand/logo icons are filtered out to avoid trademark confusion.

Sources:

- Lucide: `lucide-static@1.21.0`, ISC
- Tabler Icons: `@tabler/icons@3.44.0`, MIT
- Bootstrap Icons: `bootstrap-icons@1.13.1`, MIT
- Phosphor Icons: `@phosphor-icons/core@2.1.1`, MIT
- Primer Octicons: `@primer/octicons@19.28.1`, MIT
- Material Symbols: `@material-symbols/svg-400@0.45.2`, Apache-2.0
- Feather Icons: `feather-icons@4.29.2`, MIT
- Iconoir: `iconoir@7.11.1`, MIT
- Remix Icon: `remixicon@4.9.1`, Apache-2.0
- Eva Icons: `eva-icons@1.1.3`, MIT
- Ionicons: `ionicons@8.0.13`, MIT
- Ant Design Icons: `@ant-design/icons-svg@4.4.2`, MIT
- Material Design Icons: `@mdi/svg@7.4.47`, Apache-2.0
- CoreUI Icons: `@coreui/icons@3.1.0`, MIT
- Fluent UI System Icons: `@fluentui/svg-icons@1.1.330`, MIT
- Carbon Icons: `@carbon/icons@11.82.0`, Apache-2.0
- Teenyicons: `teenyicons@0.4.1`, MIT
- Jam Icons: `jam-icons@2.0.0`, MIT
- Bytesize Icons: `bytesize-icons@1.4.0`, MIT
- Simple Line Icons: `simple-line-icons@2.5.5`, MIT
- Line MD: `line-md@3.0.5`, MIT
- Heroicons: `heroicons@2.2.0`, MIT
- Flowbite Icons: `flowbite-icons@1.5.0`, MIT
- Mono Icons: `mono-icons@1.3.1`, MIT
- Majesticons: `majesticons@2.1.2`, MIT
- Zondicons: `zondicons@1.2.0`, CC-BY-4.0
- Boxicons: `boxicons@2.1.4`, (CC-BY-4.0 OR OFL-1.1 OR MIT)
- Font Awesome Free Solid: `@fortawesome/fontawesome-free@7.2.0`, (CC-BY-4.0 AND OFL-1.1 AND MIT)
- Font Awesome Free Regular: `@fortawesome/fontawesome-free@7.2.0`, (CC-BY-4.0 AND OFL-1.1 AND MIT)
- EOS Icons: `eos-icons@5.4.0`, MIT
- Pixelarticons: `pixelarticons@2.1.2`, MIT
- Evil Icons: `evil-icons@1.10.1`, MIT
- Mapbox Maki: `@mapbox/maki@8.2.0`, CC0-1.0
- Vaadin Icons: `@vaadin/icons@25.1.4`, Apache-2.0
- Gravity UI Icons: `@gravity-ui/icons@2.18.0`, MIT
- Humbleicons: `humbleicons@1.21.0`, MIT
- VS Code Codicons: `@vscode/codicons@0.0.45`, CC-BY-4.0
- Carbon Pictograms: `@carbon/pictograms@12.78.0`, Apache-2.0
- Open Iconic: `open-iconic@1.1.1`, MIT
- Healthicons: `healthicons@2.0.0`, MIT
- Entypo: `entypo@2.2.1`, ISC
- Grommet Icons: `grommet-icons@4.14.0`, Apache-2.0
- Sargam Icons: `sargam-icons@1.6.7`, MIT
- Ikonate: `ikonate@1.1.1`, MIT
- UIW Icons: `@uiw/icons@2.6.10`, MIT
- Mynaui Icons: `@mynaui/icons@0.4.3`, MIT
- PatternFly Icons: `@patternfly/icons@1.0.3`, MIT
- Flag Icons: `flag-icons@7.5.0`, MIT
- Gov Icons: `govicons@1.6.0`, (OFL-1.1 AND MIT)
- Zendesk Garden Icons: `@zendeskgarden/svg-icons@8.4.0`, Apache-2.0
- Map Icons: `map-icons@3.0.3`, ISC
- Adobe Spectrum CSS Icons: `@adobe/spectrum-css@3.0.0`, Apache-2.0
- Weather Underground Icons: `weather-underground-icons@1.0.0`, (MIT OR GPL-3.0)

Categories:

- `ui-commands`: 通用命令 (739)
- `canvas-tools`: 画布工具 (615)
- `files-documents`: 文件文档 (551)
- `data-charts`: 数据图表 (567)
- `status-alerts`: 状态告警 (664)
- `communication`: 协作通信 (670)
- `media-assets`: 媒体素材 (495)
- `developer-tools`: 开发工具 (376)
- `energy-generic`: 能源通用 (503)
- `weather-environment`: 气象环境 (327)
- `power-grid-electrical`: 电力电网 (127)
- `generation-link`: 发电环节 (97)
- `transmission-link`: 输电环节 (199)
- `substation-link`: 变电环节 (140)
- `distribution-link`: 配电环节 (314)
- `consumption-link`: 用电环节 (416)
- `renewable-generation`: 风光水发电 (93)
- `thermal-heating`: 火电供热 (82)
- `hydrogen-storage`: 氢能储能 (100)
- `new-energy-equipment`: 新能源设备 (1)
- `power-electronics`: 电力电子 (480)
- `cooling-heating-energy`: 冷热能源 (200)
- `gas-energy`: 燃气能源 (28)
- `integrated-energy`: 综合能源 (94)
- `communication-control`: 通信与控制 (193)
- `industry-facilities`: 工业设施 (68)
- `cloud-infrastructure`: 云与基础设施 (240)
- `health-safety`: 医疗安全 (339)
- `business-finance`: 业务金融 (479)
- `education-research`: 教育科研 (233)
- `flags-regions`: 国家地区旗帜 (298)
- `office-productivity`: 办公效率 (628)
- `maps-places`: 地图地点 (312)
- `transport-facilities`: 交通设施 (344)

Rebuild:

```bash
node scripts/generate-open-source-svg-icons.mjs
```
