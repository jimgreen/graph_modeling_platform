<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-06-22 -->

# hooks

## Purpose

自定义 React Hook。`useBatchEditors` 封装批量属性编辑器，`useGlobalLines` 封装全局线路的放置/删除流程。

## Key Files

| File | Description |
|------|-------------|
| `useBatchEditors.tsx` | 批量编辑器 Hook：管理参数表行、枚举值编辑、中英文表头渲染等 |
| `useGlobalLines.tsx` | 全局线路 Hook：放置对话框状态、跨模型线路的增删与同步 |

## For AI Agents

### Working In This Directory

- Hook 返回状态 + 操作函数，供设备定义/量测面板消费。
- 新增 Hook 放此目录，保持纯函数风格（无副作用耦合）。
- `useGlobalLines` 依赖大 scope 与 `fetch`，补单测成本高，目前靠使用方间接覆盖。

### Testing Requirements

- `useBatchEditors` 有独立测试（`useBatchEditors.test.tsx`，与源文件同目录）。
- `useGlobalLines` 无独立测试。

## Dependencies

### Internal

- 被设备定义面板、量测面板引用

### External

- `react`

<!-- MANUAL: -->
