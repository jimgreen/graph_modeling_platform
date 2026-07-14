# Electric Generation Containers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the built-in wind, photovoltaic, thermal, hydro, and nuclear source families into ten AC/DC container devices that own energy-specific parameters and associate one standard ACGenerator or DCGenerator.

**Architecture:** Keep the seven existing kind identifiers for backward compatibility, add three missing DC kinds, and centralize the ten built-in templates behind a generation-container template factory in `src/model.ts`. Existing nodes are migrated during template terminal normalization, measurement profiles are moved to terminal `t1`, and backend E generation locally replaces visible container bodies with associated generator records without changing the globally critical server `inferESection` function.

**Tech Stack:** React 19, TypeScript, Vitest, Node.js ESM, Vite, GitNexus impact analysis.

---

### Task 1: Lock the ten built-in container definitions with failing model tests

**Files:**
- Modify: `src/model.test.ts`
- Test: `src/model.test.ts`

- [ ] **Step 1: Add a table-driven test for all ten templates**

Add a test whose expected rows are:

```ts
const expected = [
  ["ac-wind-source", "交流风力发电机", "ac", "ac-generator", "idx_ac_unit_t1", ["windTurbineModel", "cutInWindSpeed"]],
  ["dc-wind-source", "直流风力发电机", "dc", "dc-generator", "idx_dc_unit_t1", ["windTurbineModel", "cutInWindSpeed"]],
  ["ac-pv-source", "交流光伏发电机", "ac", "ac-generator", "idx_ac_unit_t1", ["pvModuleModel", "mpptCount"]],
  ["dc-pv-source", "直流光伏发电机", "dc", "dc-generator", "idx_dc_unit_t1", ["pvModuleModel", "mpptCount"]],
  ["ac-thermal-source", "交流火力发电机", "ac", "ac-generator", "idx_ac_unit_t1", ["thermalUnitModel", "fuelType"]],
  ["dc-thermal-source", "直流火力发电机", "dc", "dc-generator", "idx_dc_unit_t1", ["thermalUnitModel", "fuelType"]],
  ["ac-hydro-source", "交流水力发电机", "ac", "ac-generator", "idx_ac_unit_t1", ["hydroUnitModel", "turbineType"]],
  ["dc-hydro-source", "直流水力发电机", "dc", "dc-generator", "idx_dc_unit_t1", ["hydroUnitModel", "turbineType"]],
  ["ac-nuclear-source", "交流核能发电机", "ac", "ac-generator", "idx_ac_unit_t1", ["nuclearUnitModel", "reactorType"]],
  ["dc-nuclear-source", "直流核能发电机", "dc", "dc-generator", "idx_dc_unit_t1", ["nuclearUnitModel", "reactorType"]]
] as const;
```

For every row, assert `isContainer === true`, one terminal, the full Chinese label, the terminal type, `terminalRoles === ["single-source"]`, the expected terminal association, the expected relation key in `getTemplateParameterDefinitions`, and the family-specific parameter names.

- [ ] **Step 2: Add a failing creation and associated-view test**

Create one AC and one DC example from every family. Assert:

```ts
expect(node.params.is_container).toBe("1");
expect(node.params[relationKey]).toBe("");
expect(describeContainerTerminalAssociations(template)[0]).toMatchObject({
  relationKey,
  deviceModel
});
expect(buildContainerDeviceParameterViews(node, template)[1]).toMatchObject({
  kind: "associated",
  componentLibrary: deviceModel,
  relationKeys: [relationKey],
  terminalIndexes: [0]
});
```

After assigning permanent indexes and a terminal node number, export the node with `buildEDeviceParameterFile` and assert the relation idx appears in the expected `ACGenerator` or `DCGenerator` section while the container body does not create a second row.

- [ ] **Step 3: Add a failing legacy-node migration test**

Build a legacy `ac-wind-source` node without `is_container` or `idx_ac_unit_t1`, preserve a custom `ratedPower`, terminal node number, terminal vbase, id, position, and name, then call `normalizeNodeTerminalsWithTemplate`. Assert all preserved fields remain unchanged while `is_container`, the relation field, and stored parameter definitions are added. Call the function a second time and assert structural equality with the first result.

- [ ] **Step 4: Run the targeted model tests and verify RED**

Run:

```powershell
pnpm vitest run src/model.test.ts -t "built-in electric generation containers|migrates legacy electric generation sources"
```

Expected: FAIL because `dc-thermal-source`, `dc-hydro-source`, and `dc-nuclear-source` do not exist and existing source templates are not containers.

### Task 2: Implement built-in generation-container templates and node migration

**Files:**
- Modify: `src/model.ts`
- Test: `src/model.test.ts`

- [ ] **Step 1: Extend the DeviceKind union**

Add these missing literal kinds beside the existing specialized source kinds:

```ts
| "dc-thermal-source"
| "dc-hydro-source"
| "dc-nuclear-source"
```

- [ ] **Step 2: Add a reusable generation-container kind predicate**

Define the ten base kinds in a `ReadonlySet<string>` and export:

```ts
export function isElectricGenerationContainerKind(kind: string): boolean {
  return ELECTRIC_GENERATION_CONTAINER_KIND_SET.has(baseDeviceKind(kind));
}
```

The predicate must also recognize generated `-vertical` variants through `baseDeviceKind`.

- [ ] **Step 3: Add parameter-definition builders**

Create focused helpers before `BASE_DEVICE_LIBRARY` that build:

```ts
type ElectricGenerationFamily = "wind" | "pv" | "thermal" | "hydro" | "nuclear";
```

Each generated `DeviceTemplate` must include:

```ts
params: {
  is_container: "1",
  [relationKey]: "",
  sourceType,
  ratedPower,
  ratedVoltage,
  ...familyParams
},
terminalCount: 1,
terminalTypes: [terminalType],
terminalLabels: [terminalType === "ac" ? "交流发电机端" : "直流发电机端"],
terminalRoles: ["single-source"],
terminalAssociations: [terminalType === "ac" ? "ac-generator" : "dc-generator"],
isContainer: true
```

Parameter definitions must include `idx`, `name`, `status`, `run_stat`, the relation idx, `sourceType`, `ratedPower`, `ratedVoltage`, and the exact family-specific fields from the approved design. `fuelType`, `turbineType`, and `reactorType` must use enum options with stable English values and Chinese labels.

- [ ] **Step 4: Replace seven existing source objects and add three DC objects**

Replace the existing wind, PV, thermal, hydro, and nuclear template objects with calls to the helper. Keep their established sizes and glyph-selecting kind names. Do not convert diesel, storage, or generic `ac-source`/`dc-source`.

- [ ] **Step 5: Migrate legacy nodes in normalizeNodeTerminalsWithTemplate**

Before terminal comparison, when the template is one of the new generation containers, merge missing values from `buildDefaultParams(template)` underneath existing node params:

```ts
const migratedParams = {
  ...buildDefaultParams(template),
  ...normalizedNode.params,
  is_container: "1"
};
```

Only replace the node when the merged record differs. Existing values always win. This migration must run before project loading calls `assignMissingDeviceIndexes`, so the standard relation-index allocator can populate the associated generator idx.

- [ ] **Step 6: Run the targeted model tests and verify GREEN**

Run:

```powershell
pnpm vitest run src/model.test.ts -t "built-in electric generation containers|migrates legacy electric generation sources"
```

Expected: PASS.

- [ ] **Step 7: Run all model tests**

Run:

```powershell
pnpm vitest run src/model.test.ts
```

Expected: PASS after updating old assertions that referred to shortened labels or treated specialized sources as ordinary `ACGenerator`/`DCGenerator` tree items.

- [ ] **Step 8: Commit the model slice**

```powershell
git add -- src/model.ts src/model.test.ts
git commit -m "feat: add electric generation container devices"
```

### Task 3: Isolate container definitions from generic generator overrides

**Files:**
- Create: `src/customDeviceUtils.test.ts`
- Modify: `src/customDeviceUtils.ts`

- [ ] **Step 1: Write failing definition-key tests**

For an AC wind container and a DC nuclear container, assert:

```ts
expect(resolveTemplateComponentLibrary(acWind)).toBe("ACGenerator");
expect(resolveTemplateComponentLibrary(dcNuclear)).toBe("DCGenerator");
expect(deviceDefinitionKeyForTemplate(acWind)).toBe("ac-wind-source");
expect(deviceDefinitionKeyForTemplate(dcNuclear)).toBe("dc-nuclear-source");
```

Also assert ordinary `ac-source` still uses `ACGenerator` as its definition key and an existing non-generator container retains its current component-library key.

- [ ] **Step 2: Run the new test and verify RED**

Run:

```powershell
pnpm vitest run src/customDeviceUtils.test.ts
```

Expected: FAIL because the generation container currently falls back to ACLoad/DCLoad or a generic definition key.

- [ ] **Step 3: Implement narrow container handling**

In `resolveTemplateComponentLibrary`, preserve an explicit inferred E section first, then return `ACGenerator` or `DCGenerator` when the template is an electric generation container with the matching generator association.

In `deviceDefinitionKeyForTemplate`, return `template.kind` only for electric generation containers. Leave all other key behavior unchanged.

- [ ] **Step 4: Run the test and verify GREEN**

Run:

```powershell
pnpm vitest run src/customDeviceUtils.test.ts
```

Expected: PASS.

- [ ] **Step 5: Run definition-related regression tests**

Run:

```powershell
pnpm vitest run src/appDeviceDefinitionFactories.test.ts src/appPersistenceLibraryExport.test.ts src/stateIconDrawing.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit the definition-key slice**

```powershell
git add -- src/customDeviceUtils.ts src/customDeviceUtils.test.ts
git commit -m "fix: isolate generation container definitions"
```

### Task 4: Move generator measurements to the associated terminal

**Files:**
- Modify: `src/measurements.test.ts`
- Modify: `src/measurements.ts`

- [ ] **Step 1: Write failing default-profile tests**

For all ten kinds, create a default node and call `createDefaultMeasurementGroupsForNode`. Assert exactly one group is created with `terminalId === "t1"`. Assert AC groups contain active power, reactive power, voltage, and frequency; DC groups contain active power, voltage, and current.

- [ ] **Step 2: Write a failing legacy-config migration test**

Normalize a config containing an `ac-wind-source` profile whose items omit `position`. Assert the normalized items use `position: "t1"`. Include an explicit `position: "device"` item and assert it remains `device`. Include an ordinary `ac-source` item without a position and assert it remains without a position.

- [ ] **Step 3: Run measurements tests and verify RED**

Run:

```powershell
pnpm vitest run src/measurements.test.ts -t "generation container measurements|migrates legacy generation measurement positions"
```

Expected: FAIL because current defaults target the device body and three DC profiles are absent.

- [ ] **Step 4: Update DEFAULT_MEASUREMENT_CONFIG**

Give all ten generation-container profile items `position: "t1"`. Add profiles for `dc-thermal-source`, `dc-hydro-source`, and `dc-nuclear-source`.

- [ ] **Step 5: Add the narrowly scoped compatibility branch**

Inside `normalizeMeasurementConfig`, calculate the normalized position once per item. When the profile kind is one of the ten generation-container kinds and the raw item did not provide a position, use `t1`; otherwise preserve the normalized position exactly.

Do not change type normalization, group defaults, profile deduplication, import ordering, or explicit positions.

- [ ] **Step 6: Run focused and broad measurement tests**

Run:

```powershell
pnpm vitest run src/measurements.test.ts
pnpm vitest run src/appGraphMeasurementFactories.test.ts src/appPersistenceLibraryExport.test.ts src/svgExport.test.tsx
```

Expected: PASS.

- [ ] **Step 7: Commit the measurement slice**

```powershell
git add -- src/measurements.ts src/measurements.test.ts
git commit -m "feat: bind generation measurements to generator terminals"
```

### Task 5: Make backend E files emit associated generators without changing server inferESection

**Files:**
- Modify: `server/image-server.test.mjs`
- Modify: `server/image-server.mjs`

- [ ] **Step 1: Write a failing saved-project E export test**

Save a project containing:

```js
{
  kind: "ac-wind-source",
  name: "风电场A",
  params: {
    idx: "7",
    is_container: "1",
    idx_ac_unit_t1: "3",
    name_ac_unit_t1: "风电机组A",
    control_type_ac_unit_t1: "PV",
    p_set_ac_unit_t1: "45",
    q_set_ac_unit_t1: "2",
    v_set_ac_unit_t1: "35",
    alpha_ac_unit_t1: "1",
    run_stat_ac_unit_t1: "1"
  },
  terminals: [{ id: "t1", type: "ac", nodeNumber: "", vbase: "35" }]
}
```

and an equivalent `dc-nuclear-source` with `idx_dc_unit_t1`. Connect each to a matching bus so topology assigns node numbers. Assert the generated `.e` file has exactly one row in `ACGenerator` and one row in `DCGenerator`, uses relation idx/name and terminal topology node numbers, and never emits the container body's `idx` as an extra generator row.

- [ ] **Step 2: Run the backend test and verify RED**

Run:

```powershell
pnpm vitest run server/image-server.test.mjs -t "associated electric generation containers"
```

Expected: FAIL because backend E generation currently treats the container body itself as a generator.

- [ ] **Step 3: Add local E-export helpers**

Add private helpers near `buildDeviceParameterFile` that:

- Recognize only container nodes with `idx_ac_unit_t1` or `idx_dc_unit_t1`.
- Map those relation fields to `ACGenerator` or `DCGenerator`.
- Build standard section columns from `eSectionColumns`.
- Read relation-prefixed parameters such as `control_type_ac_unit_t1`.
- Use the container terminal's topology node number for `node`.
- Apply existing defaults for missing control type, numeric setpoints, and run state.

- [ ] **Step 4: Update buildDeviceParameterFile locally**

Build `associatedGeneratorRecords` from topology-normalized nodes. Skip the visible container body in the ordinary `deviceRecords` map when an associated generator relation is present. Add associated records to `recordsBySection` alongside topology-node and ordinary-device records.

Do not modify `server/image-server.mjs::inferESection`; its GitNexus risk is CRITICAL and it feeds SVG, indexing, and v1 APIs outside this feature.

- [ ] **Step 5: Run backend tests and verify GREEN**

Run:

```powershell
pnpm vitest run server/image-server.test.mjs -t "associated electric generation containers"
pnpm vitest run server/image-server.test.mjs
```

Expected: PASS.

- [ ] **Step 6: Commit the backend E slice**

```powershell
git add -- server/image-server.mjs server/image-server.test.mjs
git commit -m "fix: export generation container associations to E files"
```

### Task 6: Verify the complete feature and restart WEB

**Files:**
- Modify only if verification finds a feature regression.

- [ ] **Step 1: Run focused feature tests together**

```powershell
pnpm vitest run src/model.test.ts src/customDeviceUtils.test.ts src/measurements.test.ts server/image-server.test.mjs
```

Expected: PASS.

- [ ] **Step 2: Run cross-cutting export and definition regressions**

```powershell
pnpm vitest run src/appDeviceDefinitionFactories.test.ts src/appPersistenceLibraryExport.test.ts src/appGraphMeasurementFactories.test.ts src/svgExport.test.tsx src/stateIconDrawing.test.ts
```

Expected: PASS.

- [ ] **Step 3: Run type checking and production build**

```powershell
pnpm tsc --noEmit
pnpm build
```

Expected: both commands exit 0.

- [ ] **Step 4: Run the complete test suite**

```powershell
pnpm vitest run
```

Expected: PASS. If an unrelated pre-existing failure occurs, record the exact failing test and verify all changed-area suites remain green.

- [ ] **Step 5: Run GitNexus change detection**

```powershell
node .gitnexus/run.cjs detect-changes --scope compare --base-ref cb10ecde --repo graph_modeling_platform --limit 200
```

Expected: changed symbols are limited to the model library, container normalization, definition-key mapping, measurement normalization, backend E generation, and their tests.

- [ ] **Step 6: Restart frontend and backend**

Stop the existing processes bound to `127.0.0.1:5173` and `127.0.0.1:5174`, then start:

```powershell
pnpm dev
```

Keep the process running and confirm both ports respond.

- [ ] **Step 7: Browser acceptance**

At `http://127.0.0.1:5173/`, verify:

1. The library lists ten full Chinese names with no shortened duplicate entries.
2. One AC and one DC device from every family can be placed.
3. The definition view shows “设备本体” and one associated generator tab.
4. Family-specific fields and enums are editable and persist after save/reopen.
5. Adding default measurements creates a terminal `t1` measurement group.
6. Saving and reopening preserves container associations and parameters.

- [ ] **Step 8: Final review commit if verification required fixes**

Stage only files belonging to this feature, run GitNexus staged change detection, and commit any verification-only fixes with:

```powershell
git commit -m "test: verify electric generation containers"
```
