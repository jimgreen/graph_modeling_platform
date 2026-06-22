<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-06-22 -->

# components

## Purpose

可复用 React 组件。受控输入组件（带缓冲/防抖）与静态按钮组件，供画布属性表、设备定义等使用。

## Key Files

| File | Description |
|------|-------------|
| `InputComponents.tsx` | `BufferedTextInput` / `BufferedTextarea` / `DeferredColorInput` 等受控输入（缓冲提交、颜色选择） |
| `StaticButtonComponents.tsx` | `StaticButton` 静态按钮组件（带视觉反馈） |

## For AI Agents

### Working In This Directory

- 组件接收 value + onCommit（而非 onChange），内部缓冲到失焦/回车才提交。
- 新增可复用输入组件放此目录，保持受控 + 缓冲模式。

### Testing Requirements

- 无独立测试；通过使用方（appView 等）间接覆盖。

## Dependencies

### Internal

- 被画布属性表、设备定义面板引用

### External

- `react`

<!-- MANUAL: -->
