# 三模式画布主题与自定义配色设计

## 目标

为画布增加第三种“自定义”模式，并让浅色、深色、自定义三种模式在顶部模式按钮和右侧面板中具有一致的切换语义。自定义模式默认使用深蓝色背景 `#192586`，用户可以修改背景色、能流配色和电压等级配色；这些自定义值写入后台 `settings/color-config.json`，下次打开页面继续使用。

界面外壳仍保持现有浅色界面风格。主题只影响画布、标尺、网格、节点文字、选择/辅助元素、能流颜色和电压等级颜色。

## 方案

采用三模式主题模型：

- `light`：现有浅色模式，画布默认纯白。
- `dark`：现有深色模式，画布默认纯黑。
- `custom`：独立的自定义背景和配色，默认背景为 `#192586`。

浅色/深色继续使用现有的标准配色和两套内置主题适配。自定义模式拥有独立的 `ColorPalette`，切回浅色或深色不会覆盖它；切回自定义时恢复上次自定义值。

辅助色不新增一套可编辑表单。自定义模式根据当前背景色计算网格、边框、标尺、文字、选中框和提示色，并使用对比度兜底，确保任意合法背景色都能保持可读。默认自定义能流/电压颜色从深色主题的高亮色出发，再针对深蓝背景做对比度审计。

## 数据契约

现有 `color-config.json` 字段保留，并增加画布主题字段：

```json
{
  "colorDisplayMode": "energy",
  "colorPalette": {
    "energy": {},
    "voltage": {}
  },
  "canvasThemeMode": "custom",
  "customTheme": {
    "background": "#192586",
    "colorPalette": {
      "energy": {},
      "voltage": {}
    }
  }
}
```

字段语义：

- `colorPalette` 是浅色/深色共用的现有用户配色，保持旧文件兼容。
- `customTheme.background` 是自定义模式的全局画布背景色，不写入单个模型的 `canvasBackgroundColor`。
- `customTheme.colorPalette` 只在自定义模式生效，包含独立的能流和电压等级颜色。
- `canvasThemeMode` 是最近一次选择的三模式值。

后台归一化规则：

- 只有 `light`、`dark`、`custom` 被接受，其他值回退到 `light`。
- 背景色必须是非空合法 CSS 颜色；非法值回退到 `#192586`。
- 缺少 `customTheme` 或其配色时，补齐自定义默认值。
- 缺少新增字段的旧配置继续按旧逻辑运行，并在启动同步时补写新字段。
- 非 `ENOENT` 的配置读取失败继续按现有错误语义处理，不把读取失败当成空配置覆盖原文件。

## 前端状态与数据流

### 启动

1. 先从 localStorage 读取旧的主题、标准配色和本地自定义主题缓存，作为无后台时的即时状态。
2. 启动时读取后台 `GET /webgrp/color-config`。
3. 后台存在配置时，归一化后设置主题模式、标准配色、自定义主题和当前能流/电压显示模式。
4. 后台不存在时，把本地状态连同自定义默认值写回后台；后台不可用时保留本地状态。

### 当前配色

画布和配色弹框消费“当前模式的活动配色”：

- `light` / `dark` 使用现有标准 `colorPalette`，由主题解析函数选取对应的浅/深内置值。
- `custom` 直接使用 `customTheme.colorPalette`，不再把自定义颜色当作浅色或深色值二次转换。

为减少渲染调用点改动，`__appScope.colorPalette` 继续暴露活动配色；配色弹框保存时根据当前 `themeMode` 写回标准配色或自定义配色。标准配色和自定义配色分别参与后台同步。

### 模式切换

- 顶部模式按钮单击按固定顺序循环：浅色 → 深色 → 自定义 → 浅色。
- 图标分别使用太阳、月亮、调色盘；`aria-label` 和 `title` 明确下一步模式。
- 右侧“背景色”使用三项 `Segmented`：白色、黑色、自定义。
- 选择自定义时，在同一行显示颜色输入；颜色提交后立即更新画布并触发后台同步。
- 三种模式切换都清空当前模型的显式 `canvasBackgroundColor`，避免模型旧底色覆盖全局主题；操作继续进入现有撤销快照路径。
- 自定义背景色只保存在后台全局配置，不修改模型 JSON。

### 配色弹框

现有“按能流类型 / 按电压等级”两个页签保留。打开弹框时加载当前模式的活动配色；保存时：

- 浅色/深色保存到标准 `colorPalette`。
- 自定义保存到 `customTheme.colorPalette`。

“恢复默认”在自定义模式下恢复深蓝背景对应的默认能流/电压颜色，不影响标准模式。

## 画布渲染

### `canvasTheme.ts`

- 将 `CanvasThemeMode` 扩展为三值。
- 保留浅色和深色现有 token，不改变其默认值。
- 新增默认深蓝背景常量和 `customCanvasThemeColorsFor(background)`。
- 自定义 token 的生成使用背景亮度/对比度判断：深色背景使用浅色文字和高亮辅助线，浅色背景使用深色文字和低对比度网格；网格、标尺和边框分别设定较低门槛，避免抢过设备/线路颜色。
- `themeCanvasBackground`、`themeCanvasFill`、`themeModeOf`、`themeSemanticColor`、`themeGlyphColor` 等入口扩展到 `custom`，并保持旧调用默认行为。
- 自定义模式的语义色直接使用活动自定义配色；用户新增的电压等级颜色不被主题适配覆盖。

### `model.ts` / `themedColors.ts`

- 保留现有浅/深 `ENERGY_THEME_COLORS`、`VOLTAGE_LEVEL_THEME_COLORS`。
- `resolveThemedPalette` 支持 `custom` 作为“已解析配色”，返回归一化后的自定义 palette。
- 连接线、端子、设备描边和电压等级取色继续通过同一入口，避免画布、预览和导出出现不同颜色。
- 自定义背景下图元描边和量测文字按背景对比度进行换算；用户显式设置的高饱和彩色不被覆盖。

### CSS 与静态层

现有根级 CSS 变量更新逻辑继续使用 `canvasThemeColors` 写入标尺、边框、视口背景和文字光晕变量。静态画布层使用 `canvasThemeColors.canvasBackground` 作为主题底色，自定义模式不再被模型显式背景覆盖。

## 后台与兼容

修改 `server/measurementConfigNormalization.mjs` 的颜色配置归一化、`server/server.mjs` 的默认返回和写入，以及前端 color-config 序列化/反序列化类型。

现有空间隔离和 `settings/color-config.json` 路径不变，因此空间导入/导出会自然携带新增字段。写入仍复用现有原子写路径和现有颜色配置保存队列。

## 错误处理

- 背景色输入无效时不更新配置，保留上一次合法值。
- localStorage 不可写时只影响持久化，不阻断当前会话。
- 后台读取/写入失败时继续显示当前本地状态，并保留下一次状态变化的重试路径。
- 旧后台文件只含 `colorDisplayMode` 和 `colorPalette` 时补齐自定义默认值，不改变已有标准配色。

## 测试范围

### 纯函数与渲染取色

- `canvasTheme.test.ts`：三模式归一化、背景色、动态 token、深蓝默认背景对比度、非法输入回退。
- `themedColors.test.ts` / 相关 model 测试：自定义 palette 不走浅/深替换，标准 palette 行为保持不变。
- 电压等级/能流默认色测试：自定义默认表键集、色值形状和最小对比度。

### 前端交互与持久化

- 右侧面板源码/渲染测试：三项模式、只在自定义模式显示颜色输入、切换时清理显式模型背景。
- 顶栏测试：按钮循环顺序、三个图标/ARIA 文本、模式切换调用统一入口。
- color-config 序列化和启动同步测试：新字段读写、旧 payload 兼容、本地回退和自定义 palette 独立保存。

### 后端

- `measurementConfigNormalization` 测试：新字段归一化、非法值回退、旧 JSON 兼容。
- `/webgrp/color-config` 集成测试：GET/PUT 新字段、空间隔离、文件落盘后再次读取。
- 现有颜色配置读失败、归档和路由覆盖测试继续运行。

验证顺序遵循仓库规则：先跑受影响的单测文件，最后对这批改动跑一次全量测试；不新增独立探针脚本。

## 不在本次范围内

- 不把自定义主题 token 扩展成一套新的逐项 UI 编辑器。
- 不改变方案模型 JSON 的导出格式或 SVG 的 `colorMode` 查询契约。
- 不改变界面外壳的浅色主题。
