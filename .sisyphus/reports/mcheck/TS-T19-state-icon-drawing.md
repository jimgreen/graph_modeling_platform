# T19 stateIconDrawing.tsx 审查报告

## 概览
- 文件：src/stateIconDrawing.tsx ｜ 2593 行 ｜ 发现总数：6（P0:0 / P1:0 / P2:2 / P3:4）
- 审查方式：主线程抽样审读（头部类型区、generateStateVisualShapeImage switch 区、SVG 解析区 1200-1260 / 2100-2160、反模式 grep）
- ⚠️ 配套测试文件 stateIconDrawing.test.ts（125KB）本次未审读（配额受限），待补
- 总体评价：SVG 字符串构建全程一致使用 escapeXml，数值边界 Math.max(1,…) 防御到位；data-* 属性协议清晰。主要问题是魔法色值散布与形状模板的硬编码分支。

## P0 严重

（无）

## P1 重要

（无）

## P2 一般

### [P2] 默认色值 "#2563eb" 魔法字符串散布十余处
- 位置: src/stateIconDrawing.tsx:424, :1216, :1236, :1254 及后续同类 fallback（grep 计 10+ 处）
- 类型: 重复
- 描述: `|| "#2563eb"` 作为 stroke/fill 兜底色散布全文。F 组报告（图标生成器）已发现同一色值在 scripts 三个文件重复——前端此处再次复现。改主题色时需全文搜索替换，漏改即视觉不一致。
- 建议: 提取共享常量 `DEFAULT_SHAPE_STROKE_COLOR = "#2563eb"`（可放 svgUtils 或新建 colorTokens.ts），前后端共用。

### [P2] generateStateVisualShapeImage 的 18 种形状 switch 硬编码 SVG body
- 位置: src/stateIconDrawing.tsx:423-490
- 类型: 抽象层次
- 描述: 每个分支内联一段手写 SVG path/circle/rect 字符串，stroke-width/linecap 等公共属性逐份重复。新增形状必须修改函数体；形状视觉规范（线宽比例等）无法统一调整。
- 建议: 保持 switch 可读性可接受，但至少把公共属性抽成模板函数（如 `shapePath(d, extraAttrs)`），path 数据收敛到常量表；长期可将形状库外置为 JSON。

## P3 轻微

### [P3] 正则解析自家 SVG 标记的脆弱性
- 位置: src/stateIconDrawing.tsx:1206,1225,1242（`/<path\b([^>]*)>/i.exec` 系列）及 readSvgMarkup* 工具群
- 类型: 脆弱实现
- 描述: 用正则提取 SVG 属性，属性值包含 `>` 字符时会截断匹配。因解析对象是本模块自己生成的受控标记（escapeXml 后属性值不含裸 `>`），当前安全；但若未来接入外部 SVG 导入路径会踩坑（F 组 normalizeSvg 已有同型隐患记录）。
- 建议: 在 readSvgMarkup* 工具头部加注释声明"仅用于本模块生成的受控标记"；外部 SVG 一律走 DOMParser 路径（现有 parsed.editableChildren 已如此，保持）。

### [P3] customParamId/deviceDefinitionRowId/stateDraftRowId 三胞胎生成器
- 位置: src/stateIconDrawing.tsx:141-152
- 类型: 重复
- 描述: 三个 ID 生成函数结构相同（前缀 + 计数器/随机段），且项目内已有第 5 处 Date.now/random 型 ID 生成（横向共性）。
- 建议: 统一 ID 生成工具（crypto.randomUUID + 语义前缀包装）。

### [P3] stateVisualShapeLabel 的 kind→label 映射 if/return 链
- 位置: src/stateIconDrawing.tsx:378-421（约 40 行）
- 类型: 简化
- 描述: 18 个分支逐一 if 返回中文标签，纯映射关系。
- 建议: 改为 Record<StateVisualShapeKind, string> 常量表 + 单次查表。

### [P3] 头部 100+ 行类型定义可下沉 shared
- 位置: src/stateIconDrawing.tsx:14-99
- 类型: 抽象层次
- 描述: StateVisualShapeKind/StateIconLineCapKind/StateIconDrawingElement 等核心类型被 drawing 与编辑器两侧消费，若编辑器侧（appDeviceDefinitionDialogs 等）也 import 本文件，会造成 UI 模块对渲染模块的反向依赖。
- 建议: 确认引用方向；若存在反向依赖，把类型移到 model.ts 或独立 types 文件。

---
统计：P0:0 | P1:0 | P2:2 | P3:4 = 6 项（stateIconDrawing.test.ts 待补审）
