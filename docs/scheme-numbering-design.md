# 统一数字 schemeId 设计

## 背景

当前系统同时存在两套方案身份：

- 后端持久化的 `schemeNo`，是空间内唯一的数字编号；
- 前端运行时的 `schemeId` / `id`，通常是 `scheme:<编码路径>`，新建临时方案还可能是 `scheme-<UUID>`。

两套身份导致 API、前端状态、MCP 和地址栏需要在 `schemeNo`、`schemeId`、`schemePath` 之间转换。新的契约只保留一套方案身份：数字 `schemeId`。

## 目标

- 每个空间内的每个方案及子方案拥有唯一、递增、不复用的正安全整数 `schemeId`。
- 前后端、内部 REST、v1、MCP、运行时状态和界面统一使用 `schemeId`。
- 删除 `schemeNo` 字段、参数、响应和文档；不再生成或依赖 UUID/路径形式的运行时方案 ID。
- 方案重命名、移动保留 `schemeId`；复制、导入分配新的 `schemeId`。
- `schemePath` 作为名称路径兼容选择器保留，但不再是第二套身份。

## 统一数据模型

### 持久化

方案目录的 `scheme.json` 使用：

```json
{
  "schemeId": 12,
  "name": "默认方案",
  "updatedAt": "2026-11-21T00:00:00.000Z"
}
```

空间级计数器继续位于 `scheme-index.json`，字段改为 `lastSchemeId`。写锁、原子写入、空间退休守护和高水位不复用规则保持不变。完整空间备份恢复时原样恢复方案元数据和计数器，因此方案编号保持不变；单独导入方案 ZIP 时视为复制，重新分配新编号。

读取旧数据时：

1. 优先读取有效的 `schemeId`；
2. 旧的有效 `schemeNo` 只作为一次迁移输入；
3. 将迁移结果写回 `schemeId`，删除 `schemeNo`；
4. 无编号或重复编号按稳定目录顺序重新分配；
5. 计数器从旧字段、旧计数器和现有最大编号恢复高水位。

迁移完成后，新的落盘数据不再包含 `schemeNo`。

### 前端方案记录

`SavedSchemeRecord` 使用 `schemeId: number` 作为唯一方案身份，删除 `schemeNo`。现有树组件保留的 `id` 只作为兼容键，始终是 `schemeId` 的十进制文本；新代码不得生成 UUID 或路径键，也不得把该兼容键写入持久化或公开 API。`activeSchemeId`、`selectedSchemeId`、方案菜单、拖拽排序、模型归属和所有方案查找函数以数字 `schemeId` 为判断依据。

方案路径仍由方案名称树计算，仅用于展示、旧链接兼容和 API `schemePath` 选择器。方案路径不写入身份字段，也不参与编号生成。

### 临时方案

新建、导入和复制流程必须先通过后端分配 `schemeId`，再把带编号的记录放入前端树。前端不再生成 `scheme-<UUID>` 或 `scheme:<路径>` 作为方案身份。

## API 契约

### 选择器

所有按方案定位的接口统一接受：

- `schemeId`：正安全整数，首选；
- `schemePath`：旧名称路径兼容选择器。

对读取、模型操作、导出和删除接口，两者同时提供时必须指向同一方案，否则返回 `400 bad-request`。重命名/移动方案是例外：`schemeId` 指向源方案，`schemePath` 表示目标路径，`previousSchemePath`（如提供）必须与源方案一致。未知 `schemeId` 返回现有 `404 not-found`。`schemeNo` 不再接受、不再透传、不再出现在错误消息和文档中。

### 覆盖范围

- 内部方案/模型读取、保存、删除、导出、导入；
- v1 方案树、层级、模型列表、JSON/SVG/E 文件/CIM、ZIP、发送；
- v1 拓扑检查与修复；
- 控制台新建方案、新建模型、切换模型；
- MCP 方案读取、模型读取、导出、发送、拓扑和控制工具；
- 方案写入和导入回执、方案树摘要、运行时模型信息。

创建子方案使用 `parentSchemeId`；新建模型使用 `schemeId`。这些字段都指向同一个数字方案身份，不再区分运行时 key 和持久化编号。

`PUT /schemes/scheme` 创建时由后端分配 `schemeId`；重命名/移动时 `schemeId` 标识源方案，`schemePath` 是目标位置。删除支持 `schemeId` 或 `schemePath`。

### 地址栏

地址栏 `#scheme=` 改为数字 `schemeId`。旧的路径 slug 和 `scheme:<路径>` 形式只在一次兼容读取中解析，之后写回数字 `schemeId`。

## 界面

- 左侧状态栏和右侧方案 tooltip 继续显示“方案ID”，其值来自数字 `schemeId`；不再出现 `schemeNo` 文案。
- 后端回执、MCP 结果和运行时模型信息使用同名字段 `schemeId`。
- 方案编号可复制；未分配状态只允许出现在后端分配前的短暂创建流程，不作为持久化记录落盘。
- 左侧 Ant Design `Tree` 的拖拽键直接兼容数字 `schemeId`；模型拖拽仍通过 `project:`/`model:` 运行期键区分。方案拖入自身或后代方案会被循环保护拒绝，判断依据是当前树结构而不是路径字符串前缀。

### 保存通知

模型更新订阅服务在保存成功后按方案路径匹配订阅。对于只提交 `schemeId` 的模型保存请求，后端会在写盘后把编号解析为当前真实 `schemePath`，再发布 `model.updated`；因此 `schemeId` 定位和路径订阅保持一致。该解析不改变持久化身份，也不把路径重新写回方案记录。

## 兼容与风险边界

- 旧 `scheme.json` 的 `schemeNo` 只用于迁移，不作为新的公开 API 参数。
- 旧前端 localStorage 中带 UUID/路径 `id` 的方案记录按名称路径与后端方案树合并，最终以服务端数字 `schemeId` 覆盖。
- 旧 URL 中的 `scheme=<slug>` 或 `scheme:<路径>` 读取后解析到方案树，再转换成数字 `schemeId`。
- 模型自身的 `projectId` / `modelId` 不改变；本次只统一方案身份。
- `schemePath` 继续存在用于兼容和可读定位，但不再和另一套方案 ID 并列维护。

## 验证范围

- 旧数据迁移：`schemeNo` → `schemeId`、重复/缺失编号、计数器高水位和不复用；
- 后端、v1、MCP 的 `schemeId` 单独选择、路径选择、两者冲突和未知编号；
- 前端方案树、拖拽、选择、创建、复制、导入、模型加载和地址栏同步；
- 所有响应、Swagger、MCP 文档和测试中不再出现 `schemeNo`；
- 类型检查和完整测试按项目规则执行。
