<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-06-22 -->

# docs

## Purpose

项目文档。第三方 `/api/v1` API 的设计、需求、工作流文档，以及 superpowers 计划/规格。

## Key Files

| File | Description |
|------|-------------|
| `DESIGN_THIRD_PARTY_API.md` | 第三方 API 设计（三域 + 运行时态 WS 桥接） |
| `REQUIREMENTS_THIRD_PARTY_API.md` | 第三方 API 需求 |
| `WORKFLOW_THIRD_PARTY_API.md` | 第三方 API 工作流 |

## Subdirectories

| Directory | Purpose |
|-----------|---------|
| `superpowers/` | superpowers 计划与规格（`plans/`、`specs/`） |

## For AI Agents

### Working In This Directory

- 文档为 Markdown，描述 `/api/v1` 只读 API 的设计意图与约束。
- 改动 v1 API 行为后同步更新对应文档。

## Dependencies

### Internal

- 描述对象：`server/apiV1*.mjs`、`server/runtimeWs.mjs`

<!-- MANUAL: -->
