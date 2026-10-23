<!-- 本文件的「改动分档」「检索纪律」为执行型规则，优先于下方自动生成的 gitnexus 块。 -->

# 工作规则

## 改动分档（先定档，再决定流程）

按**爆炸半径**选档，不按改动行数以外的直觉。定档在动手前一句话说明。

| 档 | 判据 | 流程 | 禁止 |
|----|------|------|------|
| **小** | ≤5 行、单文件、不改数据、不改契约/导出格式 | 定位 → 改 → 跑**受影响的单测文件** → 报告 | 不得跑全量测试、不得为自证再造独立脚本、不得做 git stash 反证 |
| **中** | 多文件或含存量数据迁移，但不改对外契约 | 小档 + 备份 + 幂等重跑验证 + 全量测试**一次** | 不得跳过迁移的 dry-run |
| **大** | 改契约/改导出格式/改共享类型/影响 >10 文件 | 完整七阶段 + gitnexus impact + detect_changes + 全量测试 | — |

「全量测试一次」是字面意思：同一批改动只跑一次全量，且放在**最后一轮**。中间验证用 `npx vitest run <受影响的文件>`，不要每改一处就 `pnpm vitest run`（实测单次约 120 秒 + 1 个 step；那次任务为此白跑到两次）。

gitnexus 块的 MUST（impact / detect_changes）适用于**中、大档**；小档改动只需读懂被改符号的直接调用方（grep 一次即可）。**任何归档都不豁免最后一轮全量测试**——小档也跑一次，因为 3 行改动确实能静默打挂既有用例。

## 检索纪律（省 step 就是省时间）

每步约 20–30 秒，**总耗时 ≈ step 数 × 单步延迟**。减少往返优于减少单次开销；让单条命令变快几乎没有意义（ops_bash 中位数只有 5.7 秒）。

一次实测（6 turn / 188 分钟）：455 个 step × 25 秒 = 3.1 小时，其中模型推理 39%、工具执行 32%、编排 29%。**唯一有效的杠杆是砍 step 数。**

### 必须并行（省时最多的一招）

- **入参互不依赖的工具调用必须一次发出**：读 3 个文件、跑 2 个 grep、查 2 个接口，放在同一条消息里并行调用。只有「先搜到文件名、再按名字读」这类真依赖才允许串行。
- 判据是入参而不是语义：只要 B 的命令行里不出现 A 的返回值，B 就必须和 A 同批发出。
- 反面数据：那次任务 455 个 step 里只有 5 个（1.1%）发过并行调用；并行率提到 30% 可直接省约 40 分钟。

### 一次拿全

- **连续探测合成一条命令**：要「文件在哪 / 内容是什么 / 接口回什么」，一条 `find … ; cat … ; curl …` 就够，不要拆成 8 个 step（曾连续 8 个 bash 只为一个答案）。
- **grep 一次拿全**：多 pattern 合并（`a\|b\|c`）、全仓搜。不要"发现新名字再回头搜第二遍"。
- **合并独立读取**：多个文件用一次 `ops_read_files`，不要 5 次单文件读。
- **不重复取证**：同一事实只确认一次，确认后就写进下一步的依据里，不回头复核。
- **浏览器只用来验证交互路径**。几何/数据/序列化结论用 Node 脚本或 grep，不用 DOM 二次确认。
- **量盒子一次量全**：要 side / block / list / row 的几何，写一个 evaluate 一次返回全部矩形，不要一个元素一个 step。
- **不要 `location.reload()`**：会销毁 CDP execution context，下次 evaluate 直接报 `Execution context was destroyed` / `No page found`，等于白送两个 step。优先用页面内交互，或先 `navigate_page` 再操作。
- 浏览器重启后 pageId 会变，先 `list_pages` 拿新 id，不要盲试旧 id。
- **不支持图片输入的模型不要 `take_screenshot`**：返回的是 `[image unavailable]`，零信息。

## 长任务：先拆 turn，再谈优化

单个 turn 超过约 60 个 step 就是信号——上下文膨胀后会触发大量被动 prune（那次任务 154 次），每次打断都吃掉真实时间。

- **主动折叠**：到 60 / 120 / 180 step 附近各 `compress` 一次，一次折掉已消费的检索证据，比让系统被动 prune 更划算。
- **一件交付物一个 turn**：不要把「改形状 + 写迁移脚本 + 跑全量 + 提交」全塞进同一个 turn；交付给用户看一眼再开下一个，成本只是用户点一下。
- 长命令（全量测试、构建、类型检查）放后台跑，不要前台空等（实测全量 `pnpm vitest run` 冷跑 110–120 秒、热跑约 60 秒；`tsc --noEmit` 约 56 秒）。
- 复盘一次任务为什么慢，用本仓自带脚本而不是手写探针：`node scripts/session-timing-report.mjs [<session-id>] [--file <log>] [--json]`，按 step 边界直接给出 turn 级时长、模型/工具/编排三段归因、并行率、最慢 step。

## 视觉 / 形状类问题

用户说「X 应该和 Y 一样」「X 的图形不对」时，**第一个动作是最小渲染对比，不是读渲染代码**：

1. 并排渲染/序列化 X 与 Y（`renderToStaticMarkup` 或导出 `<symbol>`），输出 diff。
2. 拿到差异 → 定位到产生差异的那几行。
3. **立即向用户确认口径**（改成哪个方向、是否同步存量数据），不要先铺证据。
4. 再改。

反面教训：曾为「两个图元图形不一致」先读了约 400 行渲染代码，结论是"渲染分支不影响几何"；而同一次的最小对比脚本在 40 分钟时才写，一次就定调。差异其实只在端子锚点 `{x:0.5,y:0}` vs `{x:0,y:-0.5}`。

## 歧义处理

- 用户描述偏主观（"一样""不对""怪怪的"）时，**10 分钟内提问**，用 `ask_user_question` 给出可判定的选项（含"同步存量数据"这类副作用选项，并说明不可逆）。
- 不要用"再多找点证据"代替提问。

## 数据与不可逆操作

- 改动 `data/` 下任何模型/配置 JSON 前：先 dry-run 打印将改动的条数，`--apply` 时逐文件 `.bak` 备份，改完再 dry-run 一次验幂等。
- 一次性数据修复脚本**只写到"能跑一次"为止**；不为 3 个节点写缩进探测/多空间枚举之类的通用工具。备份与幂等校验不省，其余不省时间的地方都可以省。

## 提交与推送（默认动作，无需再确认）

用户说「提交并推送」时，**两条远程都推**，顺序固定：

```bash
git push origin HEAD:master
git push origin_tsysmart HEAD:refs/for/master
```

- `origin` = GitHub（`git@github.com:jimgreen/graph_modeling_platform.git`），推 `master` 分支。
- `origin_tsysmart` = Gerrit（`ssh://foree@tsysmart.com:29418/graph_modeling_platform`），推 `refs/for/master` 走评审。Gerrit 侧 `master` 与 GitHub `origin/master` 目前指向同一提交，所以这样推不会分叉。
- 提交前先跑 `mcommit` 技能收敛为单个 commit（`Change-Id` 复用最底部提交的）；Gerrit 的 `commit-msg` hook 会生成 `Change-Id`，不要在 message 里手写。
- 推送成功后把 Gerrit 返回的 change 链接（`https://tsysmart.com:8080/review/c/graph_modeling_platform/+/<id>`）报给用户。

## 输出

- 汇报代码改动时**不必**为每条改动生成 dsh-ui 组件；小档改动用纯文本 + 关键 diff 行即可。组件只用于确实需要并排对比/多指标/流程图的场合。

## 查阅型资料不在此处

功能清单、代码映射、架构风格见 `docs/ARCHITECTURE.md`。目录结构、关键文件表、命令见 `CLAUDE.md`。改后端前读 `server/AGENTS.md`，改前端前读 `src/AGENTS.md`。

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **graph_modeling_platform** (37770 symbols, 104486 relationships, 873 execution flows).

> Index stale? Run `node .gitnexus/run.cjs analyze --index-only` from the project root — it auto-selects an available runner. No `.gitnexus/run.cjs` yet? Bootstrap with `npx`, `bunx`, or `pnpm dlx` — e.g. `bunx gitnexus@latest analyze` (npm 11 npx crash; #1939).

## Always Do

- **MUST run impact before editing.** Use `impact({target: "symbolName", direction: "upstream"})` or `node .gitnexus/run.cjs impact "symbolName" --direction upstream --repo .`; report callers, processes, and risk. Never substitute grep for graph analysis.
- **MUST analyze graph changes before committing.** Use `detect_changes({scope: "all"})` (MCP) or `node .gitnexus/run.cjs detect-changes --scope all --repo .` (CLI fallback). `partial: true` or `truncated: true` is not a clean check — a zero means unseen, not unaffected; re-run it. For regression review: `detect_changes({scope: "compare", base_ref: "main"})` or `node .gitnexus/run.cjs detect-changes --scope compare --base-ref "main" --repo .`.
- MUST warn on HIGH/CRITICAL `risk` pre-edit; never use `riskSharedAxes` to waive a HIGH/CRITICAL `risk` warning. Compare File/symbol: MCP File omits axes; Graph-RAG expands File.
- **MUST treat `risk: UNKNOWN` as unresolved, not as low.** An empty caller set is not evidence the symbol is unused — it can also mean the callers are not resolvable by the index (plain-object property access, dynamic dispatch, cross-language calls). `impact` pairs `UNKNOWN` with a `riskNote` saying so. Confirm with a text search before treating the symbol as safe to change or delete; do not proceed on the strength of a zero.
- **MUST use `query({search_query: "concept"})` for concepts/flows, `context({name: "symbolName"})` for a named symbol, or `impact` for blast radius, on read-only callers, dependencies, imports, or execution flow.** Graph first; text search only for empty/`UNKNOWN`/literals.
- For security review, `explain({target: "fileOrSymbol"})` lists taint findings (source→sink flows; needs `analyze --pdg`).

## Never Do

- NEVER edit a function, class, or method before MCP/CLI impact analysis.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis, and never read `UNKNOWN` as an all-clear — it means the walk could not answer, which is the one verdict that requires confirming by other means.
- NEVER rename symbols with find-and-replace — use `rename` which understands the call graph.
- NEVER commit before MCP/CLI graph change analysis.

## Resources

| Resource | Use for |
| --- | --- |
| `gitnexus://repo/graph_modeling_platform/context` | Codebase overview, check index freshness |
| `gitnexus://repo/graph_modeling_platform/clusters` | All functional areas |
| `gitnexus://repo/graph_modeling_platform/processes` | All execution flows |
| `gitnexus://repo/graph_modeling_platform/process/{name}` | Step-by-step execution trace |

## CLI

| Task | Read this skill file |
| --- | --- |
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus-cli/SKILL.md` |

<!-- gitnexus:end -->
