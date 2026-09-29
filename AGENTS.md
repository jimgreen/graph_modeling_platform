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

Three rules learned the hard way here:

- **Restore only the production file.** `git checkout -- <test file>` throws away
  work you have not committed yet.
- **`git checkout --` on a production file throws away YOUR uncommitted work too.**
  This is the trap: you edit `src/model.ts` (say, adding a doc comment recording
  why the code looks odd), then run a mutation loop that ends in
  `git checkout -- src/model.ts`. The mutation is undone — and so is the doc
  comment, silently. It cost me a confusing "why did my static doc guard just
  start failing" debugging round.
  **Before any mutation loop, check `git diff --stat <file>`.** If it is
  non-empty, either commit the production change first, or back the file up and
  restore from the copy:
  ```powershell
  Copy-Item src/model.ts tmp/model.ts.bak -Force
  # ... run mutations, then instead of git checkout:
  Copy-Item tmp/model.ts.bak src/model.ts -Force
  ```
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

### A green mutation is not always a broken test

Before "fixing" a test that stayed green under mutation, check whether the
mutation was **semantically different at all**:

- Global `isFinite(x)` vs `Number.isFinite(x)` — identical once `x` is already
  a number, because the global form coerces first.
- Reordering two lookups whose results are provably equal.
- Swapping a value for a deep-equal copy.

If the rewrite is provably equivalent, **green is the correct outcome** and the
test needs nothing. Record the equivalence in the test file so the next person
does not re-investigate it — and leave a warning about what would break it
(e.g. dropping the `Number(value)` step would make global `isFinite` start
silently coercing `null` and `[]` to `0`).

The four failure modes above are all "**the test should have gone red and did
not**". This is the opposite: "**it went red-by-luck, or green for the right
reason**" — confirm which before changing anything.

### Put the mutation table in JSON, not in the injector

The recurrence of the "injector script is broken" failure mode is nested quotes:
a mutation pair like `return typeof (x as { size?: unknown })?.size === "number" ? …`
inside a double-quoted `.mjs` string is a parse error waiting to happen.

The failure is **silent from the outside**: the injector crashes, never touches
the source, and vitest cheerfully reports "32 passed". You cannot tell a real
green run from a no-op run by looking at the vitest summary — I nearly recorded
a whole round of mutation results that way.

Keep the pairs in a sibling `.json` and let the injector do nothing but
`JSON.parse` + string replace. A malformed pair then fails at parse time,
before it can masquerade as a passing run:

```js
const TABLE = JSON.parse(readFileSync("tmp/mut.json", "utf8"));
```

**And check the injector's own output**: it should print something like
`OK 注入 ① -> src/foo.ts`, and the loop should treat anything else as
"restore and skip" rather than running vitest on an unmodified file.

### A guard that skips a whole file to exclude one line is a hole

Static source guards usually start as "ignore the declaration itself, scan the
rest". It is very easy to write that as a **file** filter:

```ts
// WRONG — excludes the entire file, which is where the definition lives
if (file === definition) continue;
```

Mutation ⑦ injected `reuseSetOrCreate(s).add("X")` into the same file as the
function's definition. The guard skipped the whole file, found nothing, passed.
The real code has 21 call sites spread across *other* files, so the guard was
also only ever exercising a fraction of the repo.

Two fixes, and do both:

1. **Filter at the granularity you mean** — a line predicate
   (`/export function reuseSetOrCreate/`), not a file predicate.
2. **Give the detection logic its own self-test.** Assert against synthetic
   input — including the exact text of the mutation that fooled you — that the
   scanner reports it, *and* that legal forms do not:

   ```ts
   test("守卫的检测逻辑自测", () => {
     expect(findInlineMutate(['const p = (s) => reuseSetOrCreate(s).add("X");'])).toHaveLength(1);
     expect(findInlineMutate(["const ok = reuseSetOrCreate(ids).size;"])).toEqual([]);
   });
   ```

   This is strictly stronger than "we scanned N call sites": it proves the
   detector can go red, regardless of what the source currently contains.

Related: exclude `*.test.*` from any whole-`src/` scan, or the guard will flag
the guard's own test file, which legitimately calls the function it inspects.

### A mutation anchor that appears twice edits the wrong function

`String.prototype.replace(string, string)` replaces only the **first** occurrence. If
your anchor line appears more than once in the file, you have not mutated the
function you meant to — you have mutated whichever one came first, and the
targeted function is untouched, so the suite stays green.

This is not hypothetical. In `appPersistenceLibraryExport.tsx` the line

```ts
terminals: node.terminals.map((terminal) => ({ ...terminal, anchor: { ...terminal.anchor } }))
```

occurs twice — once in a graph-export helper, once in `cloneGraphTemplateClipboard`.
The "don't copy the anchor" mutation landed on the first, the guard went green, and
the reason was invisible from the vitest summary.

Make the injector **refuse** a non-unique anchor rather than silently patching the
first hit:

```js
const hits = src.split(anchor).length - 1;
if (hits === 0) { console.error(`X 锚点未找到: ${key}`); process.exit(1); }
if (hits > 1 && !spec.allowMulti) {
  console.error(`X 锚点出现 ${hits} 次，拒绝注入（会改到错误的函数）: ${key}`);
  process.exit(1);
}
```

Two companion rules:

- An anchor must carry enough context to be unique **inside the target function** —
  include the opening `nodes: clipboard.nodes.map((node) => ({` lines, not just the
  one line being changed. A short anchor drifts to a similar-looking sibling.
- After a green mutation, **confirm the edit landed where you intended** by grepping
  the mutated file. A zero-second grep is cheaper than a wrong conclusion.

### A green mutation you attributed to the wrong table row

Deleting or reordering entries in `tmp/mut-*.json` **renumbers every later index**.
A loop written as `for i in 0..n-1` then injects a *different* mutation than the one
you are reading the result for — and you conclude the wrong guard is broken.

This happened twice in one session on `routeStore`:

- Row 6 (`seenById` 上限清理被删) read GREEN. Row 6 was not the `seenById` row any
  more — an earlier edit had removed a row and the table was shorter. The real
  `seenById` row was untouched, so the green meant nothing.
- Row 11 (`Math.trunc` instead of `Math.floor`) also read GREEN, and separately, the
  same index printed `RED` in one run and `GREEN` in three. The variance was the
  giveaway: the source had been left mutated by a previous loop iteration whose
  `cp` restore had not run, so runs were not comparable at all.

Two habits that would have caught both:

1. **Print the row's `name` next to its verdict**, from the JSON — not from your
   memory of what you wrote. `node tmp/mut-x.mjs $i` already prints it; the loop
   must not swallow that output (`>/dev/null` is what hid it).
2. **Never leave a mutation un-restored between runs.** If a run is interrupted, the
   next run's "GREEN" is measuring the previous mutation, not its own. Restore from
   the backup *before* injecting, not only after.


### One array element per anchor line, or the CRLF joiner defeats you

The injector's `old`/`neu` are arrays of lines joined with the file's detected
line ending. Writing them as a single element containing `\n` escapes bypasses the
joiner entirely:

```json
// WRONG — one element, embedded \n. join() never inserts the separator,
//         so the anchor can only match an LF file, and a CRLF file reports
//         "锚点未找到" no matter how correct the text is.
"old": ["  return {\n    ...element,\n    x: center.x,"]

// RIGHT — one element per line
"old": ["  return {", "    ...element,", "    x: center.x,"]
```

Four mutations in one round reported a missing anchor for this reason. The error
message is indistinguishable from a typo, which is why it is worth stating
explicitly: **if several anchors miss at once, suspect the encoding, not your
transcription.**

### Reject an empty mutation, not just a missing anchor

A pair with identical `old` and `neu` injects cleanly, prints `OK`, changes
nothing, and yields a green run. That is the same failure mode as the duplicate
anchor, one level cheaper to hit — it happens when you draft a table entry and
forget to change the replacement.

```js
if (o === n) { console.error(`X 空变异（old 与 neu 相同）: ${key}`); process.exit(1); }
```

Together these make the injector refuse three distinct ways of doing nothing:
anchor absent, anchor ambiguous, and replacement empty.

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

### Assert the same value on both sides of a fallback

Two guards in one round came back green under mutations that deleted the branch
under test. Both had the same shape, and both were invisible for the same reason:
**the default value equalled the value being asserted.**

`staticNodeParticipatesInRoutingAvoidance` returns a flag whose fallback depends
on the node kind: container kinds default to "does not participate", every other
static kind defaults to "participates".

```ts
// WRONG — only covers the side where the fallback already agrees
expect(participates("static-point", { routeAvoidance: "参与" })).toBe(true);
```

Deleting the `"参与"` alias from the source makes the value fall through to the
default, which for `static-point` is *also* `true`. Green forever, behaviour broken.

```ts
// RIGHT — assert each alias on a kind whose default is the OPPOSITE value
const NON_CONTAINER = "static-point";   // default = participate
const CONTAINER = "static-group-box";    // default = do not participate
expect(participates(NON_CONTAINER, { routeAvoidance: "参与" })).toBe(true);
expect(participates(CONTAINER,    { routeAvoidance: "参与" })).toBe(true); // ← this one bites
```

Generalised rule: **before asserting "the value is X", confirm the default is not
also X.** For any function with a fallback, enumerate the fallback classes and
assert the interesting value on at least one class where it flips the outcome.
Add a companion assertion that the two defaults actually differ
(`expect(default(CONTAINER)).not.toBe(default(NON_CONTAINER))`) — otherwise the
double-sided assertions have no discriminating power at all.

This is the same trap as "assert on the object the mutation changes", one level up:
there the object was inert, here the *expected value* was inert.

### A helper with a default silently swallows the null case

Same round, a different guard went green under a mutation that removed an optional
chain. The assertion was:

```ts
const avoid = (kind, params) => participates({ kind, params: params ?? {} });
expect(avoid("static-point", null)).toBe(true);   // ← vacuous
```

`params ?? {}` turns `null` into `{}` before the value ever reaches the function, so
the assertion never exercised the optional chain. Deleting `node.params?.[...]` from
production code left the suite green. It reads like a real test and passes like one.

```ts
// RIGHT — bypass every wrapper that has a default
expect(() => participates({ kind: "static-point", params: null })).not.toThrow();
```

Generalised rule: **when asserting on a null / undefined / empty-string input, read
your own helper first and confirm nothing normalises it away.** Grep the helper for
`??`, `||`, and default parameters. A helper that "makes tests convenient" is
exactly what will hide the edge case you wrote the test for.

### A green mutation may be equivalent — or may just be outside your inputs

`parseSvgStyleAttribute` splits on `";"`. Injecting `split(/[;\n]/)` left the suite
green. That looked like a classic equivalent mutation, so the instinct was to record
it and move on. Recording it would have been wrong.

The mutation is only equivalent **on inputs that contain no newline**. The test set
had none, so the behaviour difference was real but unobservable — not absent. Green
from a mutation you cannot see is an *invalid signal*, not evidence of equivalence.

```js
// added after the green run, which makes the mutation red:
expect(parseSvgStyleAttribute("fill:red\nstroke:blue")).toEqual({ fill: "red\nstroke:blue" });
```

Before writing off any green mutation as equivalent, ask: **does my input set cover
the dimension the mutation touches?** If you cannot cover it, add an input that does
and re-run. Only one class of equivalence is worth recording — one where you can
state *why* the two forms agree on the whole domain:

- `Set.has(x)` → `[...set].includes(x)` — both use SameValueZero, so they agree for
  every possible argument.
- `rotation === 90 || rotation === 270` → `rotation !== 0 && rotation !== 180` —
  valid only because the callee provably returns one of `{0, 90, 180, 270}`. Record
  the invariant too, so the equivalence is *provable* rather than asserted.

A green run tells you "the mutation did not change any output I produce". It does not
tell you the mutation was harmless. The difference is your input coverage.

This has now bitten three times in one session, in three different shapes:

| Mutation | What my inputs were missing |
|---|---|
| `split(";")` → `split(/[;\n]/)` | no input containing a newline |
| `at(-1)` → `at(0)` in a dedup loop | no **non-first** point with `x === 0` (the loop starts at index 1) |
| drop `source_control_type` from a normalisation branch | only tested lower-snake; the branch's guard required `snake(x) === x`, so **upper**-case was the discriminating input |

So the check has to be an action, not an intention. Before writing off a green
mutation as equivalent, enumerate the **input dimensions** the mutation touches
and confirm each one is covered by at least one assertion:

- delimiters / separators — is every relevant one present in some input?
- position — does the code look at index 0, the last element, or a middle one?
  Does the loop start at 1?
- case — if the guard compares `normalise(x) === x`, only inputs where
  `normalise(x) !== x` exercise the other branch.
- falsy vs nullish — `""` and `"   "` often take different paths (see
  `normalizeModelLayers`, where `""` takes the fallback id but `"   "` is dropped).
- container presence — is the "missing" case (`undefined`, empty array, no key)
  distinguishable from the "present" case?
- **the key/field value space** — the fourth occurrence: dropping
  `(assetId && assets[assetId])` in favour of `assets[assetId]` was green until the
  map contained an **empty-string key**, which `saveImageAsset` can write because
  its `id` argument is unvalidated. So ask: *what values can a key, id, or index
  actually hold here?* If nothing constrains it, an empty string or a numeric-looking
  key is a discriminating input, not a hypothetical.
- **numeric boundaries of a fallback** — the fifth occurrence, and it took three
  rounds. Changing a guard's fallback from `0` to `-1` stayed green through
  "one valid and one invalid input" and through "two invalid inputs", because in both
  cases *both* operands were the same value, so the comparison could not tell the
  fallbacks apart. The discriminating input was `new Date`-style data whose parsed
  value is **exactly the fallback** — `Date.parse("1970-01-01T00:00:00.000Z") === 0`.
  Generalise: when you change a fallback, ask **what legitimate input produces the
  same number**. For a timestamp that is the epoch; for a count it is `0`; for a
  percentage it is `0`; for a length it is `0`. Those are the values that make two
  different fallbacks indistinguishable, and they are rarely the ones you try first.

### An assertion input that equals the value a mutation hardcodes

This is **not** the same failure as an uncovered dimension — the dimension is
covered, the value is just uninformative.

`downloadBytes(filename, bytes, mime)` was mutated to hardcode
`type: "application/octet-stream"`. The guard was green, not because `mime` was
never exercised but because the test passed `"application/octet-stream"` — the most
obvious value for a binary blob, and therefore the most likely one to be hardcoded.
Replacing it with `image/png` / `text/csv` / `application/zip` turned it red.

The general form:

> When asserting that a parameter is **passed through**, use at least one value
> that a hardcoding mutation would *not* pick. The canonical value for the
> parameter's category is the worst choice, because it is also the most likely
> literal to appear in a refactor.

This applies to encodings (`"utf-8"`), content types (`"text/plain"`), separators
(`","`), empty arrays (`[]`), and `null`. If the only input you tried is the
category's default, you have tested nothing about pass-through.

### A second path reaching the same output

This one is neither a missing dimension nor a bad input value. The condition you
mutated away genuinely runs, but a **different route** produces the same result
for every input you tried.

Two occurrences in one session, both in `appPersistenceLibraryExport.tsx`:

- `normalizeEnumOptionsForRow` appends `typicalValue` twice — once in the final
  `typicalExists` check, once inside a second `rawEnumValuesForRow` pass. Mutating
  `typicalExists` to drop `option.label === typicalValue` stayed green, because
  the second pass re-added the item. The fix was an input with **no
  `enumOptions`**, which skips the second pass.
- `normalizeGraphTemplateTypes` has three independent routes to
  `"i_control_type"` (a snake-case branch, a camel-case branch, and a direct
  column hit). Deleting the snake-case sub-clause stayed green until an
  **upper-case** input was added — that one only took the first route.

The test for a mutated condition:

> Find every other place the same value could be produced, then construct an input
> that **excludes all of them**. Only then does the mutation have a chance.

If you cannot exclude the other routes, say so in the commit message rather than
writing off the green run.

#### The sharpest form: a branch that is *totally* shadowed by its sibling

`isStaticButtonCapableKind` is `A || B`:

```ts
if (explicitStaticComponentLibraryForKind(baseKind) === "StaticButton") return true;
return isStaticKind(baseKind) && !isStaticLineLikeKind(baseKind);
```

Deleting branch `A` entirely — and flipping it to `return false` — both stayed green.
Not because the test set was thin, but because **every kind in the lookup table
satisfies both branches**: the only entry mapping to `StaticButton` is
`"static-button"`, and `"static-button".startsWith("static-")` is also true.
So no table entry can reach `A` alone.

The discriminator came from a **different naming space entirely** — a `custom-` kind:

```ts
isStaticKind("custom-staticbutton")   // "custom-staticbutton".startsWith("static-") === false
//   ⇒ B is false
staticComponentLibraryFromCustomKind("custom-staticbutton")
//   custom- prefix + suffix "staticbutton" matches a library name → "StaticButton"
//   ⇒ A is true
```

> When an `A || B` mutation stays green, do not conclude the inputs are thin. First
> check whether `A`'s discriminator set is a **subset of** `B`'s. If it is, the
> missing input is not a *value* you failed to try — it is a **kind that lives in
> another namespace** (a custom/aliased/derived kind, a legacy id, an override row)
> where the sibling predicate happens to be false.

The giveaway is that the obvious test input is the one the sibling also accepts.
Writing `expect(capable("static-button")).toBe(true)` feels like it covers branch
`A`; it covers `B`.

### A probe that returns empty everywhere is a broken fixture, not a finding

Before concluding "this function does nothing", check the fixture's **shape** against
the real data. A probe whose every case returns the same empty result has almost
always been fed geometry that collapses to a single point or a field name that does
not exist.

Two instances in one session, both in `routableLineEndpointRefs`:

- Terminals built with `anchor: { x: 0, y: 0 }` made the line's two endpoints
  **coincide** at its centre, so all fourteen probe cases returned `{}`. The real
  anchors are `±0.5`, and `terminalRenderLocalPoint` insets them further.
- Endpoint references were written as `params: { t1_node: "A" }`, but the real
  parameter names are `_routableLineSourceNodeId` / `_routableLineTargetNodeId` plus
  four companions. The "both endpoints already set" path therefore never ran, and the
  assertion that appeared to cover it was actually covering a different branch.

The distinguishing signal: **a constant result across varied inputs**. Either the
function is trivial, or your input is degenerate. Resolve it by printing the
intermediate geometry (`routableLineDeviceCanvasPoints(node)`) rather than the
function's return value, and by grepping the constants for the real parameter names
before writing the fixture.

### Upstream already normalises, so your own normaliser is invisible

`templateDefinitionIsReadonly` starts with `const normalizedName = enName.trim()`.
Mutating that to `enName` left the whole suite green — and it was **not** an
equivalent mutation. The test only ever reached the function through
`normalizeTemplateDefinitionList`, whose own line above is
`String(definition.enName ?? "").trim()`. So on that path the callee
**can never observe** the whitespace its own `.trim()` would remove. The
normalisation is redundant for that caller and load-bearing for every other one.

```ts
// ❌ green forever — the aggregate entry point pre-trims
expect(typed({ enName: " name ", valueType: "string" }).readonly).toBe(true);

// ✅ the only path that can see the callee's own trim
expect(templateDefinitionIsReadonly(" name ", false)).toBe(true);
```

The decision procedure, and it is one grep:

1. Is the function `export`ed? If yes, someone can hand it whatever they like.
2. Trace each production caller. Does **any** of them pass the argument raw?
3. If every caller normalises first, the guard must call the function directly.

> Generalised rule: **reaching a function only through an aggregate entry point
> makes every normalisation layer below it unobservable.** Those layers are exactly
> the ones whose removal you would want a test to catch. Any `export`ed helper needs
> at least one test that calls it with the raw shape its own code claims to handle.

The same shape bit a probe in the same round: to exercise the `valueType` fallback
I used `enName: "x"`, and `"x"` happens to be `x: "float"` in
`TEMPLATE_DEFINITION_VALUE_TYPES`. Twelve different `valueType` inputs all returned
`float` — the fallback branch was never reached. When a probe's *valid-input* cases
all return the same value, check whether your probe parameter is itself a special
name in a lookup table before concluding the parameter has no effect.

### Never nest a double quote inside a test title

```ts
// WRONG — the inner quote closes the title early; the file fails to parse
test("未知 valueType（`=== "string"` 之外都算数值）", () => { … })
```

This bites three times per session, and the failure is **silent by design**:

```
Test Files  1 failed (1)
     Tests  no tests
```

`no tests` is never a pass, but it is also easy to dismiss as "environment
problem". It is always a parse error in the file you just wrote.

The fix is ordering, not a linter. `vitest` reports only `no tests`; **`tsc` reports
the exact line and column**:

```
src/formatUtils.test.ts(318,34): error TS1005: ',', expected.
```

So always run the type-check **before** the test command, never after:

```powershell
npx tsc -b --force          # ← reports TS1005 with line:col
npx vitest run <file>       # ← only says "no tests"
```

A regex heuristic for unbalanced quotes is not worth having — it produces false
positives on every multi-line `test(` and every template-literal title, so it trains
you to ignore it. Rewrite such titles in prose, or use backticks / single quotes
for the code fragment inside them.

### A filter on your own console output is another source of distortion

Reading probe output through a grep that only keeps indented lines dropped a whole
section of plain-JSON logs; I briefly concluded the probe had not printed them.

If a section of expected output is missing, re-read the raw file before concluding
anything about the probe. Silent absence and "the code didn't run" look identical
once you have filtered the evidence away.

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
