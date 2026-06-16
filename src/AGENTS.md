# src/ - 前端源码

**模块:** 前端核心逻辑
**父级:** [../AGENTS.md](../AGENTS.md)

## 概述

扁平结构的前端源码目录，包含 React 组件、核心模型、工具函数和测试文件。所有文件位于同一层级，无子模块划分。

## 文件职责

| 文件 | 职责 | 行数 |
|------|------|------|
| `model.ts` | 核心类型定义（设备类型、拓扑结构） | 6000+ |
| `App.tsx` | 主应用组件（画布、面板、工具栏） | 大型 |
| `main.tsx` | React 入口点 | 10 |
| `keyboardShortcuts.ts` | 键盘快捷键处理 | 小型 |
| `sidePanelVisibility.ts` | 侧边栏显隐逻辑 | 小型 |
| `selectionActions.ts` | 选择操作工具函数 | 小型 |
| `styles.css` | 全局样式 | 中型 |

## 测试文件

| 测试文件 | 对应源文件 |
|----------|------------|
| `model.test.ts` | `model.ts` |
| `svgExport.test.tsx` | 导出功能 |
| `keyboardShortcuts.test.ts` | `keyboardShortcuts.ts` |
| `selectionActions.test.ts` | `selectionActions.ts` |
| `sidePanelVisibility.test.ts` | `sidePanelVisibility.ts` |

## 约定（本目录特有）

| 约定 | 说明 |
|------|------|
| 测试命名 | `*.test.ts` / `*.test.tsx`，与源文件同名 |
| 无子目录 | 所有代码平铺，无 `components/`、`utils/` 等划分 |
| 单一模型文件 | `model.ts` 集中所有类型，不拆分 |

## 反模式（本目录）

- ❌ **扁平结构** - 13 个源文件在同一目录，无功能分组
- ❌ **巨型模型文件** - `model.ts` 6000+ 行，应考虑拆分

## 关键导入

```typescript
// 主组件入口
import { App } from "./App";

// 核心模型
import { DeviceKind, buildTopology, buildEFileExport } from "./model";

// 工具函数
import { keyboardShortcuts } from "./keyboardShortcuts";
```
