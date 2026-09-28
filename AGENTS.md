<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **graph_modeling_platform** (6552 symbols, 24088 relationships, 300 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> If any GitNexus tool warns the index is stale, run `npx gitnexus analyze` in terminal first.

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `gitnexus_impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `gitnexus_detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `gitnexus_query({query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `gitnexus_context({name: "symbolName"})`.

## When Debugging

1. `gitnexus_query({query: "<error or symptom>"})` — find execution flows related to the issue
2. `gitnexus_context({name: "<suspect function>"})` — see all callers, callees, and process participation
3. `READ gitnexus://repo/graph_modeling_platform/process/{processName}` — trace the full execution flow step by step
4. For regressions: `gitnexus_detect_changes({scope: "compare", base_ref: "main"})` — see what your branch changed

## When Refactoring

- **Renaming**: MUST use `gitnexus_rename({symbol_name: "old", new_name: "new", dry_run: true})` first. Review the preview — graph edits are safe, text_search edits need manual review. Then run with `dry_run: false`.
- **Extracting/Splitting**: MUST run `gitnexus_context({name: "target"})` to see all incoming/outgoing refs, then `gitnexus_impact({target: "target", direction: "upstream"})` to find all external callers before moving code.
- After any refactor: run `gitnexus_detect_changes({scope: "all"})` to verify only expected files changed.

## Never Do

- NEVER edit a function, class, or method without first running `gitnexus_impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `gitnexus_rename` which understands the call graph.
- NEVER commit changes without running `gitnexus_detect_changes()` to check affected scope.

## Tools Quick Reference

| Tool | When to use | Command |
|------|-------------|---------|
| `query` | Find code by concept | `gitnexus_query({query: "auth validation"})` |
| `context` | 360-degree view of one symbol | `gitnexus_context({name: "validateUser"})` |
| `impact` | Blast radius before editing | `gitnexus_impact({target: "X", direction: "upstream"})` |
| `detect_changes` | Pre-commit scope check | `gitnexus_detect_changes({scope: "staged"})` |
| `rename` | Safe multi-file rename | `gitnexus_rename({symbol_name: "old", new_name: "new", dry_run: true})` |
| `cypher` | Custom graph queries | `gitnexus_cypher({query: "MATCH ..."})` |

## Impact Risk Levels

| Depth | Meaning | Action |
|-------|---------|--------|
| d=1 | WILL BREAK — direct callers/importers | MUST update these |
| d=2 | LIKELY AFFECTED — indirect deps | Should test |
| d=3 | MAY NEED TESTING — transitive | Test if critical path |

## Resources

| Resource | Use for |
|----------|---------|
| `gitnexus://repo/graph_modeling_platform/context` | Codebase overview, check index freshness |
| `gitnexus://repo/graph_modeling_platform/clusters` | All functional areas |
| `gitnexus://repo/graph_modeling_platform/processes` | All execution flows |
| `gitnexus://repo/graph_modeling_platform/process/{name}` | Step-by-step execution trace |

## Self-Check Before Finishing

Before completing any code modification task, verify:
1. `gitnexus_impact` was run for all modified symbols
2. No HIGH/CRITICAL risk warnings were ignored
3. `gitnexus_detect_changes()` confirms changes match expected scope
4. All d=1 (WILL BREAK) dependents were updated

## Test Guards: Verify They Actually Bite

A new test file is **not** a guard until you have watched it fail. Before committing
any new `*.test.*`, run at least one **mutation** against the production code and
confirm the new tests turn red. Then restore with `git checkout -- <file>`.

```bash
node tmp/mut-<name>.mjs 1     # inject a deliberately wrong version
npx vitest run src/<file>.test.ts   # MUST show Failed Tests > 0
git checkout -- <the mutated production file>   # never the test file
```

Two rules learned the hard way here:

- **Restore only the production file.** `git checkout -- <test file>` throws away
  work you have not committed yet.
- **A run reporting `Tests: no tests` is not a passing mutation.** It means the
  injected edit broke the file syntactically, so the suite failed to even load.
  Rewrite the mutation so the result still parses (replace whole lines, not
  fragments; do not paste `String.replace` group references like `${1}` into source).

### When a behaviour assertion cannot see the contract

If a contract is "**this code must not do X**", an output assertion often cannot
detect X being removed — usually because some *other* guard already rejects the
input first. Two escapes, in order of preference:

1. **Construct an input where the guard actually fires.** A redundant-looking
   condition (e.g. `cn !== en` behind a CJK check) only matters for rare inputs;
   find one (`en` that itself contains CJK) and assert on it.
2. **Fall back to a static assertion** that reads the source file and matches the
   line. Slower to write, but it makes "the guard is still there" executable.

### Check that you assert on the object the mutation changes

A near-miss that survived one round of mutation testing: a guard asserted
`expect(previousStore.edgeMap.has("GHOST")).toBe(false)` while the mutation
inserted `GHOST` into the **newly returned** store. The old store is immutable
and untouched, so the assertion passed forever — while the real behaviour was
broken.

Ask this of every assertion: **"if this line of production code changed behaviour,
would the object I am inspecting actually change?"** If not, the assertion cannot
fail and is worthless.

Real examples in this repo, all caught by mutation testing rather than by reading:
`shared/xmlEscape.mjs` (chained `replace` vs single-lookup), `normalizeName`'s
`.trim()` (invisible because `includes` tolerates padding),
`meaningfulDeviceParameterChineseName`'s `cn !== en` clause, and
`graphStorePatchEdges`'s skip-unknown-id branch.

## Keeping the Index Fresh

After committing code changes, the GitNexus index becomes stale. Re-run analyze to update it:

```bash
npx gitnexus analyze
```

If the index previously included embeddings, preserve them by adding `--embeddings`:

```bash
npx gitnexus analyze --embeddings
```

To check whether embeddings exist, inspect `.gitnexus/meta.json` — the `stats.embeddings` field shows the count (0 means no embeddings). **Running analyze without `--embeddings` will delete any previously generated embeddings.**

> Claude Code users: A PostToolUse hook handles this automatically after `git commit` and `git merge`.

## CLI

| Task | Read this skill file |
|------|---------------------|
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus/gitnexus-cli/SKILL.md` |

<!-- gitnexus:end -->
