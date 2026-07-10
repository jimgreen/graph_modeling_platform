# Measurement Group Font Style Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add group-level measurement font color and font size settings with per-item overrides.

**Architecture:** Reuse the existing `groupStyleOverride` field and insert it into the effective-style merge order between profile and item overrides. Expose the fields in both measurement editors and use the same resolution rule in frontend and server SVG rendering.

**Tech Stack:** TypeScript, React, SVG, Node.js, Vitest

---

### Task 1: Define Effective Style Precedence

**Files:**
- Modify: `src/measurements.ts`
- Test: `src/measurements.test.ts`

- [ ] **Step 1: Write a failing resolver test**

Create a group with `groupStyleOverride: { color: "#2563eb", fontSize: 18 }` and assert that `resolveMeasurementItemDisplay` returns those values when the item has no override.

- [ ] **Step 2: Write a failing partial-override test**

Give the item `styleOverride: { color: "#dc2626" }` and assert that the result uses item color `#dc2626` while inheriting group font size `18`.

- [ ] **Step 3: Run the focused tests and verify RED**

Run: `npm test -- src/measurements.test.ts`

Expected: the new assertions fail because `groupStyleOverride` is not yet merged.

- [ ] **Step 4: Implement the resolver merge**

Destructure `group` in `resolveMeasurementItemDisplay` and merge styles as:

```ts
const style = {
  ...(profileItem?.styleOverride ?? {}),
  ...(group.groupStyleOverride ?? {}),
  ...(item.styleOverride ?? {})
};
```

- [ ] **Step 5: Run the focused tests and verify GREEN**

Run: `npm test -- src/measurements.test.ts`

Expected: all measurement tests pass.

### Task 2: Match Frontend And Server SVG Rendering

**Files:**
- Modify: `server/image-server.mjs`
- Test: `src/svgExport.test.tsx`
- Test: `server/image-server.test.mjs`

- [ ] **Step 1: Add failing SVG tests**

Assert that a group color and font size appear in frontend and server SVG text attributes, and that an item color override wins while group font size remains effective.

- [ ] **Step 2: Run the focused SVG tests and verify RED**

Run: `npm test -- src/svgExport.test.tsx server/image-server.test.mjs`

Expected: server SVG assertions fail because the server resolver ignores group style.

- [ ] **Step 3: Add the group argument to the server resolver**

Change the server resolver to accept `group` and merge:

```js
const style = {
  ...(profileItem?.styleOverride ?? {}),
  ...(group?.groupStyleOverride ?? {}),
  ...(item?.styleOverride ?? {})
};
```

Pass the current group from measurement metric generation.

- [ ] **Step 4: Run the focused SVG tests and verify GREEN**

Run: `npm test -- src/svgExport.test.tsx server/image-server.test.mjs`

Expected: all focused SVG tests pass.

### Task 3: Add Group Font Controls

**Files:**
- Modify: `src/appExtracted/appGraphMeasurementFactories.tsx`
- Modify: `src/appExtracted/appProjectCanvasFactories.tsx`
- Test: `src/appGraphMeasurementFactories.test.ts`

- [ ] **Step 1: Add failing UI source assertions**

Assert that both editing surfaces expose controls labeled `量测组字体颜色` and `量测组字体大小` and update `groupStyleOverride` without discarding other group style fields.

- [ ] **Step 2: Run the focused UI test and verify RED**

Run: `npm test -- src/appGraphMeasurementFactories.test.ts`

Expected: the new labels and update expressions are absent.

- [ ] **Step 3: Add selected-device group controls**

Add a deferred color input and a numeric buffered input beside the existing group background and border rows. Merge updates into `groupStyleOverride` and clamp size to 6 through 96.

- [ ] **Step 4: Add measurement-dialog group controls**

Add the same two controls to the dialog summary. Update all draft groups through `updateMeasurementEditorGroupSettings` while preserving existing group style fields.

- [ ] **Step 5: Make item controls show inherited values**

Resolve item color and font size from item override, then group override, then measurement type default.

- [ ] **Step 6: Run the focused UI test and verify GREEN**

Run: `npm test -- src/appGraphMeasurementFactories.test.ts`

Expected: all focused UI tests pass.

### Task 4: Verify, Commit, Push, And Restart

**Files:**
- Verify all modified source and test files.

- [ ] **Step 1: Run related regression tests**

Run: `npm test -- src/measurements.test.ts src/appGraphMeasurementFactories.test.ts src/svgExport.test.tsx src/model.test.ts src/appView.test.tsx server/image-server.test.mjs server/apiV1Schemes.handlers.test.mjs`

Expected: all tests pass with zero failures.

- [ ] **Step 2: Run the production build**

Run: `npm run build`

Expected: TypeScript and Vite build successfully.

- [ ] **Step 3: Inspect GitNexus change scope**

Run: `node .gitnexus/run.cjs detect-changes --scope compare --base-ref main --limit 100`

Expected: changes are limited to measurement style resolution, measurement editors, and SVG rendering paths.

- [ ] **Step 4: Commit and push only relevant files**

Stage the modified measurement, SVG, UI, test, design, and plan files. Commit with a focused message and push `main` to `origin`.

- [ ] **Step 5: Restart and verify WEB**

Restart the project process tree, then verify `http://127.0.0.1:5173` and `http://127.0.0.1:5174/swigger` both return HTTP 200.
