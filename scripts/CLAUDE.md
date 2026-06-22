<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-06-22 -->

# scripts

## Purpose

一次性分析/修复脚本（`.cjs` / `.js`），用于代码库体检、DOM 分析、CSS 精简、`__appScope` 解构检查等。非运行时依赖，不进打包。多数为历史上 App.tsx 拆分、scope 解构陷阱排查时留下的工具。

## Key Files

| File | Description |
|------|-------------|
| `analyze-dom.cjs` / `analyze-dom-deep.cjs` | DOM 结构分析 |
| `analyze-scope-destructure.cjs` / `compare-appscope-destructure.cjs` / `verify-appscope-precise.cjs` | `__appScope` 子组件解构检查（防 ReferenceError） |
| `analyze-factory-destructure.cjs` | 工厂函数解构分析 |
| `analyze-empty.cjs` / `analyze-svg.cjs` | 空节点 / SVG 分析 |
| `generate-appscope-report.cjs` | 生成 `appscope-destructure-report.json` |
| `fix-appscope-mounts.js` | 修复 `__appScope` 挂载 |
| `slim-css-crush.cjs` / `slim-snapshot.cjs` | CSS 精简 / 快照 |
| `*.json` | 分析报告输出（`appscope-destructure-report.json`、`scope-destructure-issues.json`、`verified-appscope-report.json`） |

## For AI Agents

### Working In This Directory

- 脚本为 CommonJS（`.cjs`）或 ESM（`.js`），独立运行，互不依赖。
- 多数脚本产出 JSON 报告到本目录，用于人工审查。
- 修改 App.tsx 拆分后可跑 `analyze-scope-destructure.cjs` 验证 `__appScope` 解构完整性。

### Testing Requirements

- 无测试；脚本本身按需手动运行：`node scripts/<name>.cjs`

## Dependencies

### External

- Node 内置 `fs` / `path` / `url`

<!-- MANUAL: -->
