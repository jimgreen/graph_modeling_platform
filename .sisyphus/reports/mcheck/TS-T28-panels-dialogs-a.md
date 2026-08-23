# T28 面板与对话框审查报告（A 批）

## 概览
- 文件数：5（appRightPanel / appCanvasDialogs / appProjectDialogs / appResourceDialogs / appContextMenus）
- 总行数约 1900 ｜ 发现总数：6（P0:0 / P1:2 / P2:2 / P3:2）
- 审查方式：appContextMenus 全文精读 + 其余头部与结构抽样
- 总体评价：五个文件呈现完全一致的"机械提取"模式——首行 `// @ts-nocheck`、memo 包装、从 scope 解构 80~120 个属性、经 MemoizedViewSection 手动 inputs 数组控制重渲染。

## P0 严重

（无）

## P1 重要

### [P1] 本组 5/5 文件全部 @ts-nocheck，props 契约完全失守
- 位置: src/appExtracted/appContextMenus.tsx:1、appRightPanel.tsx:1、appCanvasDialogs.tsx:1、appProjectDialogs.tsx:1、appResourceDialogs.tsx:1（全组一致）
- 类型: 抽象层次 / 类型安全
- 描述: 与 App.tsx 一致，整个面板/对话框层零类型检查。scope 中被解构的每个名字（appContextMenus.tsx:7-22 约 110 个、appRightPanel.tsx:21-130 约 130 个）在编译期都不存在——拼错、漏传、类型不匹配全部静默。这是全项目 32 个 @ts-nocheck 文件的组成部分（见总报告横向主题）。
- 建议: 纳入 appExtracted 整体去 nocheck 计划：先为每文件的 scope 解构建立显式 Props 接口（可由现有解构清单机械生成），再逐文件移除 nocheck。

### [P1] MemoizedViewSection 的 inputs 数组手工维护，漏项即静默 stale UI
- 位置: src/appRightPanel.tsx:9-16（inputs 由调用方拼装）；同模式遍布 appCanvasDialogs/appRenderPanels 等
- 类型: bug（易发）
- 提示: 重渲染依赖靠调用方手工罗列 `inputs={[]}` 数组等值比较决定是否跳过渲染。新增 UI 引用某个 scope 字段但忘记加进 inputs 时，界面将停留在旧值且无任何告警——nocheck 下连 lint 都不会提示。
- 建议: 短期在 AGENTS.md 的提取规范中强制"新引用必须同步 inputs"检查单；长期改为 zustand/selector 订阅或至少用 Proxy 追踪读取自动收集依赖。

## P2 一般

### [P2] 五个文件重复同一组件脚手架样板
- 位置: 各文件头部（memo + scope 解构 + ViewSection 包装三段式）
- 类型: 重复
- 描述: 每个提取文件重复 ~15 行相同包装代码；差异只有 section 名与 render 内容。
- 建议: 提供 `createScopeSection(name, ContentComponent)` 高阶工厂，消除五处样板。

### [P2] 对话框打开状态散布为独立布尔变量
- 位置: appCanvasDialogs.tsx:34-37（colorPaletteDialogOpen/connectionRedrawDialogOpen/filterSelectionDialogOpen/groupDeviceDefinitionDialog/ratedCapacityDialogOpen…约 8 个并列布尔）
- 类型: 抽象层次
- 描述: 多对话框互斥/叠加关系靠布尔组合推断，容易出现两个对话框同时打开的未定义态。
- 建议: 收敛为单一 `activeDialog: DialogKind | null` 可辨识联合。

## P3 轻微

### [P3] formatVoltageLabel 特判 "0.22"
- 位置: src/appExtracted/appCanvasDialogs.tsx:5
- 类型: 风格
- 描述: `v === "0.22" ? "220V"` 单独特例硬编码，其他值一律 kV。
- 建议: 注释说明 0.22kV=220V 的行业惯例来源即可，或用数值比较替代字符串比较。

### [P3] appContextMenus submenu 关闭定时器无清理
- 位置: src/appExtracted/appContextMenus.tsx:24-31
- 类型: 内存
- 描述: closeTimerRef 的 setTimeout 在组件卸载时未 clearTimeout。菜单常驻挂载所以实际影响趋零，但属未清理资源。
- 建议: 补 useEffect return 清理。

---
统计：P0:0 | P1:2 | P2:2 | P3:2 = 6 项
