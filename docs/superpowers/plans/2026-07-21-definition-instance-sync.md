# Definition-to-Instance Synchronization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make existing and subsequently reopened devices and measurements follow the latest component visual, parameter, terminal, and measurement definitions while preserving instance-owned values and layout overrides.

**Architecture:** Add two pure reconciliation boundaries: one for a node plus its effective template, and one for project measurement instances plus old/new measurement configuration. Reuse those functions from immediate definition-save flows and saved-model loading so migration behavior is consistent and testable.

**Tech Stack:** TypeScript, React state factories, Vitest, Vite, Playwright browser verification.

---

### Task 1: Pure node definition reconciliation

**Files:**
- Create: `src/definitionInstanceSync.ts`
- Modify: `src/appExtracted/appGraphMeasurementFactories.tsx`
- Test: `src/definitionInstanceSync.test.ts`

- [ ] **Step 1: Write failing tests**

Cover a node whose latest template changes visual params, size, terminal count, and parameter definitions. Assert that position/name/rotation/scale/layer/index and existing surviving parameter values remain unchanged, new fields receive defaults, deleted fields disappear, and compatible terminal node numbers/vbase values survive.

- [ ] **Step 2: Run the focused test and confirm failure**

Run: `npx vitest run src/definitionInstanceSync.test.ts --exclude .worktrees/**`

Expected: FAIL because `reconcileNodeWithDefinition` is not implemented.

- [ ] **Step 3: Implement the pure function**

Create this API:

```ts
export function reconcileNodeWithDefinition(
  node: ModelNode,
  template: DefinitionSyncTemplate,
  previousDefinitions?: readonly DeviceParameterDefinition[]
): ModelNode;
```

The function must use normalized latest parameter definitions, apply only definition-owned visual keys and size, rebuild terminals by index while preserving compatible instance topology data, and return the original node object when no field changes.

- [ ] **Step 4: Reuse it from the current-canvas sync factory**

Replace the duplicated inner visual and terminal reconciliation blocks in `createSyncExistingNodesWithTemplateDefinitions` with `reconcileNodeWithDefinition`. Preserve the current undo snapshot and `patchGraphNodes` behavior.

- [ ] **Step 5: Run focused tests**

Run: `npx vitest run src/definitionInstanceSync.test.ts src/appDeviceDefinitionFactories.test.ts --exclude .worktrees/**`

Expected: PASS.

### Task 2: Pure measurement definition reconciliation

**Files:**
- Modify: `src/measurements.ts`
- Test: `src/measurements.test.ts`

- [ ] **Step 1: Write failing measurement migration tests**

Add cases for:

```ts
reconcileProjectMeasurementsWithConfig(
  measurements,
  nodes,
  nextConfig,
  previousConfig
)
```

Verify newly defined generated items are added, deleted generated items are removed, changed source points and inherited defaults update, user-modified item fields remain, group offsets/layout remain, manually generated random-ID items remain, and terminal groups removed by a terminal-definition change are cleaned only when no manual items remain.

- [ ] **Step 2: Run the focused tests and confirm failure**

Run: `npx vitest run src/measurements.test.ts --exclude .worktrees/**`

Expected: FAIL because the reconciliation API does not exist.

- [ ] **Step 3: Implement deterministic merge helpers**

Use deterministic default group/item IDs from `createDefaultMeasurementGroupsForNode`. Compare existing values with the previous generated value to distinguish inherited fields from user overrides. Preserve random-ID manual groups/items. Return the input measurement object unchanged when the normalized result is structurally equal.

- [ ] **Step 4: Run focused measurement tests**

Run: `npx vitest run src/measurements.test.ts --exclude .worktrees/**`

Expected: PASS.

### Task 3: Apply measurement migration when definitions are saved

**Files:**
- Modify: `src/appExtracted/appGraphMeasurementFactories.tsx`
- Test: `src/appGraphMeasurementFactories.test.ts`

- [ ] **Step 1: Write failing save-flow tests**

Test that `createSaveMeasurementConfigDialog` reconciles current `projectMeasurements` using the old and new normalized configs before replacing `measurementConfig`, and that no measurement undo snapshot is created when reconciliation is unchanged.

- [ ] **Step 2: Run the focused test and confirm failure**

Run: `npx vitest run src/appGraphMeasurementFactories.test.ts --exclude .worktrees/**`

Expected: FAIL because saving only persists the config.

- [ ] **Step 3: Integrate migration**

Capture the previous normalized config, reconcile current measurements against the new config, apply changed measurements through the existing undo-aware state path, then persist the new global config. Log the count or fact of migrated old measurements.

- [ ] **Step 4: Reconcile measurements after node definition sync**

After `createSyncExistingNodesWithTemplateDefinitions` updates node visuals/parameters/terminals, reconcile measurement groups for the resulting node list with the unchanged current measurement config. Reuse the same undo snapshot as the node-definition update.

- [ ] **Step 5: Run save-flow tests**

Run: `npx vitest run src/appGraphMeasurementFactories.test.ts src/appDeviceDefinitionFactories.test.ts --exclude .worktrees/**`

Expected: PASS.

### Task 4: Migrate old saved models on load

**Files:**
- Modify: `src/appExtracted/appProjectCanvasFactories.tsx`
- Test: `src/appProjectCanvasFactories.test.ts`

- [ ] **Step 1: Write a failing legacy-model load test**

Create a saved project containing an old node definition and old deterministic measurement item. Load it with a newer template/config and assert that the node and measurement definitions upgrade while instance position, parameter values, measurement offset, and manual items remain.

- [ ] **Step 2: Run the focused test and confirm failure**

Run: `npx vitest run src/appProjectCanvasFactories.test.ts --exclude .worktrees/**`

Expected: FAIL because loading currently normalizes terminals only.

- [ ] **Step 3: Integrate both pure reconcilers**

In `createLoadSavedProject`, reconcile each node for which `libraryTemplateByKind` has a current template, then reconcile normalized project measurements against the latest `measurementConfig`. Keep nodes with missing source templates unchanged. Mark the loaded model modified only when reconciliation changes persisted graph data.

- [ ] **Step 4: Run load-flow tests**

Run: `npx vitest run src/appProjectCanvasFactories.test.ts src/definitionInstanceSync.test.ts src/measurements.test.ts --exclude .worktrees/**`

Expected: PASS.

### Task 5: Full verification

**Files:**
- Verify all modified files.

- [ ] **Step 1: Run affected suites**

Run:

```text
npx vitest run src/definitionInstanceSync.test.ts src/measurements.test.ts src/appGraphMeasurementFactories.test.ts src/appDeviceDefinitionFactories.test.ts src/appProjectCanvasFactories.test.ts src/appView.test.tsx server/apiInternal.test.mjs --exclude .worktrees/**
```

Expected: all tests pass.

- [ ] **Step 2: Run production build**

Run: `npm run build`

Expected: TypeScript and Vite build pass.

- [ ] **Step 3: Run GitNexus change detection**

Run: `node .gitnexus/run.cjs detect-changes -r graph_modeling_platform --scope all`

Expected: changed flows are limited to component-definition save, measurement-definition save, project load, and their rendering consumers. Explain unrelated dirty-worktree findings separately.

- [ ] **Step 4: Browser verification**

Open an existing model, change a component visual/parameter and a measurement profile, save each definition, and confirm the already-drawn device and measurement update without changing device position or measurement offset. Reopen the saved legacy model and confirm the same migration occurs.
