<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-06-22 -->

# public

## Purpose

Vite 静态资源根。站点 favicon 与图标库（docer-free-compatible 分类树），供图元库引用。

## Key Files

| File | Description |
|------|-------------|
| `favicon.svg` | 站点图标 |

## Subdirectories

| Directory | Purpose |
|-----------|---------|
| `icon-library/` | 图标库（`docer-free-compatible/` 下按场景分类，如 `advanced-renewables`、`building-hvac` 等） |

## For AI Agents

### Working In This Directory

- 图标库为静态 SVG 资源，按场景子目录组织。
- 新增图标放对应场景目录；图元库引用路径相对 `/icon-library/`。

## Dependencies

### Internal

- 被 `src/sharedIconLibrary.ts` 等图元库模块引用

<!-- MANUAL: -->
