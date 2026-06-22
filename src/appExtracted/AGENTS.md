<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-06-22 -->

# appExtracted

## Purpose

从 `App.tsx` 抽取的大型工厂/视图模块。App.tsx 历史上是超大单文件，按职责拆分到此目录：画布区域、交互工厂、设备定义、量测、持久化导出、项目画布、选择拖拽、工具栏 Hook、整体视图。模块间通过 `__appScope` 共享状态。

## Key Files

| File | Description |
|------|-------------|
| `appView.tsx` | `renderAppView(__appScope)`：渲染 topbar/画布/面板/弹窗整体视图；含 RT-WS 指示灯组件 |
| `appCanvasArea.tsx` | 画布区域渲染（SVG `<rect data-canvas-background>` 背景层、网格、节点、边、resize handles） |
| `appCanvasInteractionFactories.tsx` | 画布交互工厂（指针/拖拽/连接预览） |
| `appCoreCanvasUtilities.tsx` | 画布核心工具（坐标变换、命中检测、`DEFAULT_CANVAS_BACKGROUND` 等常量） |
| `appDeviceDefinitionFactories.tsx` | 设备定义工厂（含 `buildSvgDocument` 导出 SVG 调用） |
| `appGraphMeasurementFactories.tsx` | 图形量测工厂 |
| `appPersistenceLibraryExport.tsx` | 持久化与导出：`buildSvgDocument`（自包含 SVG，内联样式）、E 文件导出 |
| `appProjectCanvasFactories.tsx` | 项目画布工厂（保存/删除/重命名/导入导出） |
| `appSelectionDragFactories.tsx` | 选择与拖拽工厂（含 `canvasBackgroundColor` 持久化） |
| `appToolbarHookFactories.tsx` | 工具栏 Hook 工厂（背景页渲染、对齐、图层） |

## For AI Agents

### Working In This Directory

- 所有模块签名模式：`export function renderXxx(__appScope: Record<string, any>) { ... }`，从 `__appScope` 解构取值。
- 文件带 `// @ts-nocheck`（自动生成属性），改时注意类型不校验。
- `buildSvgDocument`（appPersistenceLibraryExport.tsx）是 SVG/SVG 截图的唯一自包含输出源，改它影响 `/api/v1/runtime/svg`、`/api/v1/runtime/screenshot`、导出按钮三处。
- 画布背景层 `<rect data-canvas-background>` 标记用于截图/序列化时移除背景。

### Testing Requirements

- 对应测试在 `src/` 根：`appDeviceDefinitionFactories.test.ts`、`appGraphMeasurementFactories.test.ts`、`appInspector.functional.test.ts`、`appPersistenceLibraryExport.test.ts`、`appSelectionDragFactories.test.ts`、`backgroundPageRender.test.ts`、`canvasLod.test.ts`

### Common Patterns

- 从 `__appScope` 解构：`const { activeProjectKey, nodes, edges, ... } = __appScope;`
- `Object.assign(__appScope, { ... })` 回写派生状态

## Dependencies

### Internal

- `src/App.tsx` — `__appScope` 装配源
- `src/model.ts` — 类型定义

### External

- `react` — JSX
- `lucide-react` — 图标

<!-- MANUAL: -->
