# Live Measurement Value DOM Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split live measurement rows into independently addressable label, value, and unit SVG text nodes without changing canvas interaction behavior.

**Architecture:** Extend existing measurement row metrics with three display fragments, then render those fragments in both the React live canvas and imperative drag-preview markup. Emit stable value IDs only in the live React path to avoid duplicate IDs during drag previews.

**Tech Stack:** TypeScript, React, SVG, Vitest

---

### Task 1: Extend Measurement Row Metrics

**Files:**
- Modify: `src/appExtracted/appGraphMeasurementFactories.tsx`
- Test: `src/appGraphMeasurementFactories.test.ts`

- [ ] **Step 1: Write a failing metrics test**

Call `createMeasurementGroupRenderMetrics` with one visible current measurement and assert the row contains:

```ts
{
  labelText: "I",
  valueText: "--",
  unitText: "A",
  text: "I -- A"
}
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm test -- src/appGraphMeasurementFactories.test.ts`

Expected: the row does not yet expose the three fragments.

- [ ] **Step 3: Implement split metrics**

Build `labelText`, `valueText`, and `unitText`, then retain the joined `text` for existing box width calculations.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `npm test -- src/appGraphMeasurementFactories.test.ts`

Expected: the metrics test passes.

### Task 2: Split Imperative Preview Markup

**Files:**
- Modify: `src/appExtracted/appGraphMeasurementFactories.tsx`
- Test: `src/appGraphMeasurementFactories.test.ts`

- [ ] **Step 1: Write a failing markup test**

Assert that `createBuildMeasurementGroupMarkup` emits row class `mi`, child classes `ml`, `mv`, and `mu`, compact `mid`, `mt`, and `mf` attributes, and no `id="mv-..."` value ID.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm test -- src/appGraphMeasurementFactories.test.ts`

Expected: the current markup contains one combined `<text class="measurement-item">`.

- [ ] **Step 3: Implement split preview markup**

Use inherited text styling on the row `<g>`, estimate label and value widths, and position each child text independently. Omit stable IDs in this path.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `npm test -- src/appGraphMeasurementFactories.test.ts`

Expected: split preview markup assertions pass.

### Task 3: Split Live React Canvas Markup

**Files:**
- Modify: `src/appExtracted/appToolbarHookFactories.tsx`
- Test: `src/appGraphMeasurementFactories.test.ts`

- [ ] **Step 1: Write a failing live-render test**

Render a measurement group and assert the row group contains `ml`, `mv`, and `mu` children, the value has `id="mv-item-1"`, and no child contains the combined string `I -- A`.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm test -- src/appGraphMeasurementFactories.test.ts`

Expected: the current renderer returns one combined text node.

- [ ] **Step 3: Implement split live markup**

Render a `<g className="measurement-item mi">` carrying metadata and three child `<text>` nodes. Keep the parent measurement group's pointer handler unchanged.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `npm test -- src/appGraphMeasurementFactories.test.ts`

Expected: all live-render tests pass.

### Task 4: Verify, Commit, Push, And Restart

**Files:**
- Verify all modified source, test, design, and plan files.

- [ ] **Step 1: Run related regression tests**

Run: `npm test -- src/appGraphMeasurementFactories.test.ts src/measurements.test.ts src/svgExport.test.tsx src/model.test.ts src/appView.test.tsx server/image-server.test.mjs server/apiV1Schemes.handlers.test.mjs`

Expected: all tests pass with zero failures.

- [ ] **Step 2: Run the production build**

Run: `npm run build`

Expected: TypeScript and Vite build successfully.

- [ ] **Step 3: Run GitNexus change detection**

Run: `node .gitnexus/run.cjs detect-changes --scope compare --base-ref main --limit 100`

Expected: only live measurement rendering and App display flows are affected.

- [ ] **Step 4: Commit and push**

Stage only the feature files, commit with a focused message, and push `main` to `origin`.

- [ ] **Step 5: Restart and verify WEB**

Restart the project process tree and verify `http://127.0.0.1:5173` and `http://127.0.0.1:5174/swigger` both return HTTP 200.
