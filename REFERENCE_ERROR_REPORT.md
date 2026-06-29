# ReferenceError 排查报告

## 📊 排查概述

**排查时间**: 2026-06-18  
**排查范围**: `src/appExtracted/` 目录下所有 `@ts-nocheck` 文件  
**排查目标**: 找出可能导致 `ReferenceError: *** is not defined` 的代码问题

## 🔍 排查方法

1. **脚本分析**: 创建了多个分析脚本
   - `scripts/analyze-scope-destructure.cjs` - 初步扫描
   - `scripts/analyze-factory-destructure.cjs` - factory 函数分析
   - `scripts/compare-appscope-destructure.cjs` - 对比 __appScope 挂载与解构
   - `scripts/generate-appscope-report.cjs` - 生成完整报告

2. **代码审查**: 手动验证关键变量的定义和使用

## 📋 代码架构说明

该项目采用了一种特殊的架构模式：

1. **App.tsx** - 主组件，定义所有 state 和函数
2. **__appScope** - 全局作用域对象，通过 `Object.assign(__appScope, {...})` 挂载变量
3. **appExtracted/*.tsx** - 提取的子组件/factory 文件，从 `__appScope` 解构使用变量
4. **@ts-nocheck** - 所有提取文件都禁用了 TypeScript 检查

**问题模式**: 子组件从 `__appScope` 解构变量，但如果 App.tsx 没有挂载该变量，运行时就会抛出 `ReferenceError`。

## ⚠️ 发现的关键问题

### 🔴 高风险问题 (260 个变量)

**问题描述**: 这些变量在 App.tsx 中被导入和使用，但没有挂载到 `__appScope`，子组件解构使用时会导致 ReferenceError。

**影响文件**:
- `src/appExtracted/appView.tsx`
- `src/appExtracted/appCanvasArea.tsx`

**典型变量** (前 30 个):
```
ALLOW_RESIZE_TRANSFORM_PARAM
AlignCenterHorizontal, AlignCenterVertical, AlignEndHorizontal, AlignEndVertical
ArrowDown, ArrowUp, Bell, Bold, BoxSelect
BufferedTextInput, BufferedTextarea
CANVAS_MINIMAP_HEIGHT, CANVAS_MINIMAP_WIDTH
CONNECTION_REDRAW_SCOPE_LABELS
CONTAINER_TERMINAL_ASSOCIATION_OPTIONS
CURRENT_UNIT_OPTIONS
CUSTOM_DEVICE_TERMINAL_ANCHOR_GUIDE_LABELS
CUSTOM_DEVICE_TERMINAL_ANCHOR_GUIDE_VALUES
CUSTOM_DEVICE_TERMINAL_ANCHOR_PRECISION
CUSTOM_DEVICE_TERMINAL_PREVIEW_MARGIN
Cable, ChevronDown, ChevronRight, ChevronsDown, ChevronsUp
CircleDot, Copy, CustomComponentManagerTree
DEFAULT_CANVAS_BACKGROUND, DEFAULT_COLOR_PALETTE
DEFAULT_DEVICE_LABEL_FONT_SIZE, DEFAULT_MODEL_LAYER_ID
DEFAULT_POWER_BASE_VALUE
DeferredColorInput, Download
```

**完整列表**: 见 `scripts/appscope-destructure-report.json`

### 🟡 中风险问题 (271 个变量)

**问题描述**: 这些变量在 App.tsx 中可能未被导入或定义，子组件解构使用时会导致 ReferenceError。

**典型变量** (前 30 个):
```
activeImageFolderId, activeLayerId, activeProjectKey, activeSchemeKey
activeVoltageBaseTerminalKey, allowAutoExpandCanvas
aside, backgroundLayerIds, backgroundProjectId
button, canvasBackgroundColor, canvasBackgroundImage
canvasClipboard, canvasResizeDrag, canvasSizeDraft
circle, clipPath, code
collapsedCustomComponentTreeLibraries, collapsedCustomComponentTreeTypes
collapsedDefinitionComponentTypes, colorPaletteDialogOpen, colorPaletteDraft
colorPaletteTab, componentTypeDisplayParts, componentTypeOptionClass
componentTypeOptionsByAttributeLibrary, confirmAddGraphTemplate
confirmConnectionRedrawDialog, confirmCreateDeviceFromGroup
confirmFilterSelectionDialog, confirmReplaceDeviceIconFromGroup
confirmVoltageBaseClearDialog, confirmVoltageBaseSetDialog
```

**完整列表**: 见 `scripts/appscope-destructure-report.json`

## 💡 修复建议

### 方案 1: 在 App.tsx 中添加 __appScope 挂载 (推荐, P0)

在 App.tsx 中调用 `renderAppView(__appScope)` 之前，添加缺失的挂载：

```javascript
// 在 App.tsx 的 renderAppView(__appScope) 调用之前添加
Object.assign(__appScope, { ALLOW_RESIZE_TRANSFORM_PARAM });
Object.assign(__appScope, { AlignCenterHorizontal });
Object.assign(__appScope, { AlignCenterVertical });
// ... 其他 529 个变量
```

**优点**:
- 保持现有架构模式一致
- 改动集中在一处

**缺点**:
- 需要添加大量代码
- 增加 __appScope 对象的大小

### 方案 2: 在子组件中直接 import (P1)

对于静态变量（常量、组件），在子组件中直接 import：

```javascript
// 在 appView.tsx 顶部添加
import {
  ALLOW_RESIZE_TRANSFORM_PARAM,
  CANVAS_MINIMAP_HEIGHT,
  CANVAS_MINIMAP_WIDTH,
  // ... 其他常量
} from '../model';

import {
  BufferedTextInput,
  BufferedTextarea,
  CustomComponentManagerTree,
  // ... 其他组件
} from '../components';

import {
  AlignCenterHorizontal,
  ArrowDown,
  Bell,
  // ... 其他图标
} from 'lucide-react';
```

**优点**:
- 减少 __appScope 的大小
- 更清晰的依赖关系
- 可以利用 TypeScript 的类型检查

**缺点**:
- 需要修改多个文件
- 破坏了现有的架构模式

### 方案 3: 混合方案 (推荐)

1. **常量/组件** - 使用方案 2，在子组件中直接 import
2. **动态 state/函数** - 使用方案 1，通过 __appScope 传递

## 🛠️ 实施步骤

### 第一阶段: 修复高风险问题 (P0)

1. 生成完整的修复代码
   ```bash
   node scripts/generate-appscope-report.cjs
   ```

2. 将生成的代码添加到 App.tsx
   - 位置: `renderAppView(__appScope)` 调用之前
   - 参考: `scripts/appscope-destructure-report.json` 中的 `recommendations[0].code`

3. 测试验证
   ```bash
   pnpm build
   # 启动应用，检查控制台是否有 ReferenceError
   ```

### 第二阶段: 修复中风险问题 (P1)

1. 验证这些变量是否真的在 App.tsx 中定义
2. 如果未定义，在 App.tsx 中添加定义并挂载到 __appScope
3. 如果已定义但未导入，添加 import 语句

### 第三阶段: 长期优化 (P2)

1. 考虑移除 `@ts-nocheck`，启用 TypeScript 检查
2. 重构架构，减少对 __appScope 的依赖
3. 使用更清晰的依赖注入模式

## 📈 统计数据

| 指标 | 数值 |
|------|------|
| App.tsx 挂载到 __appScope 的变量数 | 1455 |
| App.tsx import 的变量数 | 1976 |
| appView.tsx 解构的变量数 | 923 |
| appCanvasArea.tsx 解构的变量数 | 365 |
| **高风险遗漏变量数** | **260** |
| **中风险遗漏变量数** | **271** |
| **总计潜在问题** | **531** |

## 🔗 相关文件

- 分析报告: `scripts/appscope-destructure-report.json`
- 分析脚本: `scripts/generate-appscope-report.cjs`
- 影响文件:
  - `src/App.tsx`
  - `src/appExtracted/appView.tsx`
  - `src/appExtracted/appCanvasArea.tsx`
  - `src/appExtracted/appCanvasInteractionFactories.tsx`
  - 其他 `src/appExtracted/*.tsx` 文件

## 📝 已知的相关问题

根据项目内存记录，已知的一个案例：
- `appCanvasArea.tsx` 引用 `setContextMenu` 但解构列表遗漏，导致画布空白区右键崩溃
- 修复: 补 `setContextMenu` 到解构列表

本次排查发现的问题规模远超已知案例，涉及 531 个变量。

## ⚡ 紧急建议

**立即行动**:
1. 运行 `node scripts/generate-appscope-report.cjs` 生成完整修复代码
2. 将高风险的 260 个变量挂载到 __appScope
3. 构建并测试应用
4. 检查浏览器控制台是否还有 ReferenceError

**预期影响**:
- 修复后，应用的多个功能区域将恢复正常
- 消除潜在的运行时崩溃风险
- 提升代码的可维护性和可靠性

---

**报告生成工具**: `scripts/generate-appscope-report.cjs`  
**最后更新**: 2026-06-18
