<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-06-22 -->

# hooks

## Purpose

自定义 React Hook。当前仅 `useBatchEditors`，封装批量属性编辑器的状态与行为。

## Key Files

| File | Description |
|------|-------------|
| `useBatchEditors.tsx` | 批量编辑器 Hook：管理参数表行、枚举值编辑、中英文表头渲染等 |

## For AI Agents

### Working In This Directory

- Hook 返回状态 + 操作函数，供设备定义/量测面板消费。
- 新增 Hook 放此目录，保持纯函数风格（无副作用耦合）。

### Testing Requirements

- 无独立测试；通过使用方间接覆盖。

## Dependencies

### Internal

- 被设备定义面板、量测面板引用

### External

- `react`

<!-- MANUAL: -->
