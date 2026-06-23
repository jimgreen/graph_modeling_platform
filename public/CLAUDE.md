<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-06-22 -->

# public

## Purpose

Vite 静态资源根。站点 favicon 等直接由 Vite 托管的公共资源放在这里。

## Key Files

| File | Description |
|------|-------------|
| `favicon.svg` | 站点图标 |

## Subdirectories

| Directory | Purpose |
|-----------|---------|
| - | 图标库已迁移到 `data/icon-library/`，由后端按 `/icon-library/...` 对外提供 |

## For AI Agents

### Working In This Directory

- 这里不再放 `icon-library/`。新增图标放到 `data/icon-library/` 对应场景目录。
- 图元库引用路径仍相对 `/icon-library/`，由后端静态路由映射到 `data/icon-library/`。

## Dependencies

### Internal

- favicon 等浏览器静态资源被前端页面直接引用

<!-- MANUAL: -->
