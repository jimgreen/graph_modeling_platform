# Dynamic Measurements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add platform-wide dynamic measurement definitions, model-level device measurement groups, and a standard backend runtime measurement API without slowing the existing SVG canvas.

**Architecture:** Measurement configuration is split into platform measurement types, device measurement profiles, and model-saved device measurement groups. Runtime values are read from backend snapshot/SSE endpoints into a separate frontend store so live updates never mutate `nodes`, `edges`, undo snapshots, topology, routing, or auto-save state.

**Tech Stack:** React 19, TypeScript, Vite, Vitest, Node ESM HTTP server, SVG rendering.

---

## File Structure

- Create: `D:\codex\graph_modeling_platform\src\measurements.ts`
  - Owns measurement types, profile types, model group types, normalization, default config, style resolution, runtime value formatting, and helper operations.
- Create: `D:\codex\graph_modeling_platform\src\measurements.test.ts`
  - Unit tests for normalization, style resolution, serialization helpers, runtime formatting, and delete/copy behavior helpers.
- Modify: `D:\codex\graph_modeling_platform\src\model.ts`
  - Adds optional `measurements?: ProjectMeasurementConfig` to `ProjectFile` and normalizes measurement groups during serialize/deserialize.
- Modify: `D:\codex\graph_modeling_platform\src\model.test.ts`
  - Verifies measurement groups round-trip with models and stale node references are removed.
- Create: `D:\codex\graph_modeling_platform\server\measurement-service.mjs`
  - Backend standard Measurement API v1 service and JSON sample provider.
- Create: `D:\codex\graph_modeling_platform\server\measurement-service.test.mjs`
  - Backend tests for config load, catalog, snapshot, and patch diff behavior.
- Modify: `D:\codex\graph_modeling_platform\server\image-server.mjs`
  - Wires `/api/measurements/status`, `/api/measurements/catalog`, `/api/measurements/snapshot`, and `/api/measurements/stream`.
- Create: `D:\codex\graph_modeling_platform\data\settings\measurement-config.json`
  - Platform-wide measurement type library and device measurement profiles.
- Create: `D:\codex\graph_modeling_platform\data\measurements\sample-values.json`
  - Standard sample runtime values for development and tests.
- Create: `D:\codex\graph_modeling_platform\src\measurementClient.ts`
  - Frontend REST/SSE client.
- Create: `D:\codex\graph_modeling_platform\src\measurementRuntimeStore.ts`
  - Small external-store style runtime value cache with batched updates.
- Create: `D:\codex\graph_modeling_platform\src\measurementRuntimeStore.test.ts`
  - Tests snapshot/patch application and batching behavior.
- Modify: `D:\codex\graph_modeling_platform\src\App.tsx`
  - Loads platform measurement config and runtime values, saves model measurement config, renders measurement groups, and adds sidebar controls.
- Modify: `D:\codex\graph_modeling_platform\src\styles.css`
  - Adds measurement group display and sidebar styles.
- Modify: `D:\codex\graph_modeling_platform\src\appInspector.test.ts`
  - Adds inspector tests for measurement controls where current test utilities allow.

---

### Task 1: Measurement Domain Model

**Files:**
- Create: `D:\codex\graph_modeling_platform\src\measurements.ts`
- Create: `D:\codex\graph_modeling_platform\src\measurements.test.ts`

- [ ] **Step 1: Write failing tests for normalization and style resolution**

Add `src\measurements.test.ts`:

```ts
import { describe, expect, test } from "vitest";
import {
  DEFAULT_MEASUREMENT_CONFIG,
  formatMeasurementDisplayValue,
  measurementGroupsForExistingNodes,
  normalizeMeasurementConfig,
  normalizeProjectMeasurements,
  resolveMeasurementItemDisplay
} from "./measurements";
import type { MeasurementRuntimeValue, ProjectMeasurementConfig } from "./measurements";
import type { ModelNode } from "./model";

const node = (id: string, kind = "ACLoad"): ModelNode => ({
  id,
  kind,
  name: `${kind}-1`,
  position: { x: 0, y: 0 },
  size: { width: 100, height: 60 },
  rotation: 0,
  terminals: [],
  params: {}
});

describe("measurement domain", () => {
  test("normalizes platform config and keeps default active power type", () => {
    const config = normalizeMeasurementConfig({
      measurementTypes: [{ id: "activePower", key: "p", name: "有功功率", shortLabel: "P" }],
      deviceProfiles: [{ deviceKind: "ACLoad", items: [{ measurementTypeId: "activePower" }] }]
    });

    expect(config.measurementTypes.find((item) => item.id === "activePower")).toMatchObject({
      key: "p",
      defaultUnit: "MW",
      defaultDecimals: 3,
      defaultVisible: true
    });
    expect(config.deviceProfiles.find((item) => item.deviceKind === "ACLoad")?.items).toHaveLength(1);
  });

  test("resolves display settings from type defaults, profile overrides, and item overrides", () => {
    const config = normalizeMeasurementConfig(DEFAULT_MEASUREMENT_CONFIG);
    const group: ProjectMeasurementConfig = {
      version: 1,
      groups: [{
        id: "group-1",
        nodeId: "node-1",
        visible: true,
        anchor: "bottom",
        offset: { x: 0, y: 80 },
        layout: "vertical",
        items: [{
          id: "item-1",
          measurementTypeId: "activePower",
          sourcePoint: "plant.load.1.p",
          decimalsOverride: 2,
          unitOverride: "kW",
          styleOverride: { color: "#475569" }
        }]
      }]
    };

    const display = resolveMeasurementItemDisplay({
      config,
      node: node("node-1", "ACLoad"),
      group: group.groups[0],
      item: group.groups[0].items[0]
    });

    expect(display).toMatchObject({
      label: "P",
      unit: "kW",
      decimals: 2,
      color: "#475569",
      visible: true
    });
  });

  test("formats runtime values with decimals, units, and quality fallback", () => {
    const good: MeasurementRuntimeValue = {
      sourcePoint: "plant.load.1.p",
      value: 12.3456,
      unit: "MW",
      quality: "good",
      timestamp: 1000,
      sequence: 1
    };

    const missing: MeasurementRuntimeValue = {
      sourcePoint: "plant.load.1.q",
      value: null,
      unit: "Mvar",
      quality: "missing",
      timestamp: 1000,
      sequence: 1
    };

    expect(formatMeasurementDisplayValue(good, 2, "MW")).toBe("12.35 MW");
    expect(formatMeasurementDisplayValue(missing, 3, "Mvar")).toBe("-- Mvar");
  });

  test("drops groups whose node no longer exists", () => {
    const normalized = normalizeProjectMeasurements(
      {
        version: 1,
        groups: [
          { id: "keep", nodeId: "node-1", visible: true, anchor: "bottom", offset: { x: 0, y: 70 }, layout: "vertical", items: [] },
          { id: "drop", nodeId: "missing", visible: true, anchor: "bottom", offset: { x: 0, y: 70 }, layout: "vertical", items: [] }
        ]
      },
      [node("node-1")]
    );

    expect(normalized.groups.map((group) => group.id)).toEqual(["keep"]);
  });

  test("filters groups by existing node ids without changing valid objects", () => {
    const group = { id: "group-1", nodeId: "node-1", visible: true, anchor: "bottom" as const, offset: { x: 0, y: 70 }, layout: "vertical" as const, items: [] };
    expect(measurementGroupsForExistingNodes([group], new Set(["node-1"]))).toEqual([group]);
    expect(measurementGroupsForExistingNodes([group], new Set(["node-2"]))).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the failing test**

Run:

```powershell
npm test -- src/measurements.test.ts
```

Expected: failure because `src/measurements.ts` does not exist.

- [ ] **Step 3: Implement measurement domain helpers**

Create `src\measurements.ts`:

```ts
import type { ModelNode } from "./model";

export type MeasurementValueType = "number" | "string" | "boolean";
export type MeasurementQuality = "good" | "bad" | "stale" | "missing";
export type MeasurementGroupAnchor = "top" | "bottom" | "left" | "right" | "custom";
export type MeasurementGroupLayout = "vertical" | "horizontal" | "grid";

export type MeasurementStyleOverride = {
  color?: string;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: "400" | "500" | "700";
  fontStyle?: "normal" | "italic";
  textDecoration?: "none" | "underline";
};

export type MeasurementTypeDefinition = {
  id: string;
  key: string;
  name: string;
  shortLabel: string;
  defaultUnit: string;
  valueType: MeasurementValueType;
  defaultDecimals: number;
  defaultColor: string;
  defaultFontFamily: string;
  defaultFontSize: number;
  defaultFontWeight: "400" | "500" | "700";
  defaultVisible: boolean;
};

export type DeviceMeasurementProfileItem = {
  measurementTypeId: string;
  role?: string;
  defaultVisible?: boolean;
  labelOverride?: string;
  unitOverride?: string;
  decimalsOverride?: number;
  styleOverride?: MeasurementStyleOverride;
};

export type DeviceMeasurementProfile = {
  deviceKind: string;
  items: DeviceMeasurementProfileItem[];
};

export type PlatformMeasurementConfig = {
  measurementTypes: MeasurementTypeDefinition[];
  deviceProfiles: DeviceMeasurementProfile[];
};

export type MeasurementItemBinding = {
  id: string;
  measurementTypeId: string;
  role?: string;
  sourcePoint: string;
  visible?: boolean;
  labelOverride?: string;
  unitOverride?: string;
  decimalsOverride?: number;
  styleOverride?: MeasurementStyleOverride;
};

export type MeasurementGroup = {
  id: string;
  nodeId: string;
  visible: boolean;
  anchor: MeasurementGroupAnchor;
  offset: { x: number; y: number };
  layout: MeasurementGroupLayout;
  groupStyleOverride?: MeasurementStyleOverride;
  items: MeasurementItemBinding[];
};

export type ProjectMeasurementConfig = {
  version: 1;
  groups: MeasurementGroup[];
};

export type MeasurementRuntimeValue = {
  sourcePoint: string;
  value: number | string | boolean | null;
  unit?: string;
  quality: MeasurementQuality;
  timestamp: number;
  sequence?: number;
};

export type ResolvedMeasurementDisplay = {
  label: string;
  unit: string;
  decimals: number;
  color: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: "400" | "500" | "700";
  fontStyle: "normal" | "italic";
  textDecoration: "none" | "underline";
  visible: boolean;
};

const DEFAULT_TYPE_VALUES = {
  defaultUnit: "",
  valueType: "number" as MeasurementValueType,
  defaultDecimals: 3,
  defaultColor: "#334155",
  defaultFontFamily: "Arial",
  defaultFontSize: 12,
  defaultFontWeight: "500" as const,
  defaultVisible: true
};

export const DEFAULT_MEASUREMENT_CONFIG: PlatformMeasurementConfig = {
  measurementTypes: [
    { id: "activePower", key: "p", name: "有功功率", shortLabel: "P", defaultUnit: "MW", valueType: "number", defaultDecimals: 3, defaultColor: "#334155", defaultFontFamily: "Arial", defaultFontSize: 12, defaultFontWeight: "500", defaultVisible: true },
    { id: "reactivePower", key: "q", name: "无功功率", shortLabel: "Q", defaultUnit: "Mvar", valueType: "number", defaultDecimals: 3, defaultColor: "#475569", defaultFontFamily: "Arial", defaultFontSize: 12, defaultFontWeight: "500", defaultVisible: true },
    { id: "voltage", key: "u", name: "电压", shortLabel: "U", defaultUnit: "kV", valueType: "number", defaultDecimals: 2, defaultColor: "#334155", defaultFontFamily: "Arial", defaultFontSize: 12, defaultFontWeight: "500", defaultVisible: true },
    { id: "current", key: "i", name: "电流", shortLabel: "I", defaultUnit: "A", valueType: "number", defaultDecimals: 1, defaultColor: "#334155", defaultFontFamily: "Arial", defaultFontSize: 12, defaultFontWeight: "500", defaultVisible: false },
    { id: "frequency", key: "f", name: "频率", shortLabel: "f", defaultUnit: "Hz", valueType: "number", defaultDecimals: 2, defaultColor: "#334155", defaultFontFamily: "Arial", defaultFontSize: 12, defaultFontWeight: "500", defaultVisible: false },
    { id: "pressure", key: "pressure", name: "压力", shortLabel: "压力", defaultUnit: "MPa", valueType: "number", defaultDecimals: 3, defaultColor: "#334155", defaultFontFamily: "Arial", defaultFontSize: 12, defaultFontWeight: "500", defaultVisible: true },
    { id: "temperature", key: "temperature", name: "温度", shortLabel: "温度", defaultUnit: "℃", valueType: "number", defaultDecimals: 1, defaultColor: "#334155", defaultFontFamily: "Arial", defaultFontSize: 12, defaultFontWeight: "500", defaultVisible: false },
    { id: "flow", key: "flow", name: "流量", shortLabel: "流量", defaultUnit: "kg/s", valueType: "number", defaultDecimals: 2, defaultColor: "#334155", defaultFontFamily: "Arial", defaultFontSize: 12, defaultFontWeight: "500", defaultVisible: true },
    { id: "level", key: "level", name: "液位", shortLabel: "液位", defaultUnit: "%", valueType: "number", defaultDecimals: 1, defaultColor: "#334155", defaultFontFamily: "Arial", defaultFontSize: 12, defaultFontWeight: "500", defaultVisible: true }
  ],
  deviceProfiles: [
    { deviceKind: "ACLoad", items: [{ measurementTypeId: "activePower" }, { measurementTypeId: "reactivePower" }, { measurementTypeId: "voltage" }, { measurementTypeId: "current" }] },
    { deviceKind: "DCLoad", items: [{ measurementTypeId: "activePower" }, { measurementTypeId: "voltage" }, { measurementTypeId: "current" }] },
    { deviceKind: "HydroStorage", items: [{ measurementTypeId: "pressure" }, { measurementTypeId: "level" }, { measurementTypeId: "temperature" }] },
    { deviceKind: "HeatStorage", items: [{ measurementTypeId: "temperature" }, { measurementTypeId: "flow" }] }
  ]
};

const byId = <T extends { id: string }>(items: T[]) => new Map(items.map((item) => [item.id, item]));

export function normalizeMeasurementConfig(input: Partial<PlatformMeasurementConfig> | undefined): PlatformMeasurementConfig {
  const defaultTypes = byId(DEFAULT_MEASUREMENT_CONFIG.measurementTypes);
  const measurementTypes = (input?.measurementTypes ?? DEFAULT_MEASUREMENT_CONFIG.measurementTypes)
    .filter((item): item is Partial<MeasurementTypeDefinition> & { id: string } => Boolean(item?.id))
    .map((item) => {
      const fallback = defaultTypes.get(item.id);
      const key = item.key || fallback?.key || item.id;
      return {
        id: item.id,
        key,
        name: item.name || fallback?.name || key,
        shortLabel: item.shortLabel || fallback?.shortLabel || item.name || key,
        defaultUnit: item.defaultUnit ?? fallback?.defaultUnit ?? DEFAULT_TYPE_VALUES.defaultUnit,
        valueType: item.valueType ?? fallback?.valueType ?? DEFAULT_TYPE_VALUES.valueType,
        defaultDecimals: Number.isFinite(item.defaultDecimals) ? Number(item.defaultDecimals) : fallback?.defaultDecimals ?? DEFAULT_TYPE_VALUES.defaultDecimals,
        defaultColor: item.defaultColor || fallback?.defaultColor || DEFAULT_TYPE_VALUES.defaultColor,
        defaultFontFamily: item.defaultFontFamily || fallback?.defaultFontFamily || DEFAULT_TYPE_VALUES.defaultFontFamily,
        defaultFontSize: Number.isFinite(item.defaultFontSize) ? Number(item.defaultFontSize) : fallback?.defaultFontSize ?? DEFAULT_TYPE_VALUES.defaultFontSize,
        defaultFontWeight: item.defaultFontWeight || fallback?.defaultFontWeight || DEFAULT_TYPE_VALUES.defaultFontWeight,
        defaultVisible: item.defaultVisible ?? fallback?.defaultVisible ?? DEFAULT_TYPE_VALUES.defaultVisible
      };
    });

  const deviceProfiles = (input?.deviceProfiles ?? DEFAULT_MEASUREMENT_CONFIG.deviceProfiles)
    .filter((profile): profile is DeviceMeasurementProfile => Boolean(profile?.deviceKind && Array.isArray(profile.items)))
    .map((profile) => ({
      deviceKind: profile.deviceKind,
      items: profile.items.filter((item) => Boolean(item.measurementTypeId))
    }));

  return { measurementTypes, deviceProfiles };
}

export function normalizeProjectMeasurements(input: ProjectMeasurementConfig | undefined, nodes: readonly ModelNode[]): ProjectMeasurementConfig {
  const nodeIds = new Set(nodes.map((node) => node.id));
  return {
    version: 1,
    groups: measurementGroupsForExistingNodes(input?.groups ?? [], nodeIds)
  };
}

export function measurementGroupsForExistingNodes(groups: readonly MeasurementGroup[], nodeIds: ReadonlySet<string>): MeasurementGroup[] {
  return groups
    .filter((group) => nodeIds.has(group.nodeId))
    .map((group) => ({
      id: group.id,
      nodeId: group.nodeId,
      visible: group.visible !== false,
      anchor: group.anchor ?? "bottom",
      offset: group.offset ?? { x: 0, y: 70 },
      layout: group.layout ?? "vertical",
      groupStyleOverride: group.groupStyleOverride,
      items: Array.isArray(group.items) ? group.items.filter((item) => Boolean(item.id && item.measurementTypeId)) : []
    }));
}

export function resolveMeasurementItemDisplay({
  config,
  node,
  item
}: {
  config: PlatformMeasurementConfig;
  node: ModelNode;
  group: MeasurementGroup;
  item: MeasurementItemBinding;
}): ResolvedMeasurementDisplay {
  const type = config.measurementTypes.find((candidate) => candidate.id === item.measurementTypeId);
  const profileItem = config.deviceProfiles
    .find((profile) => profile.deviceKind === node.kind)
    ?.items.find((candidate) => candidate.measurementTypeId === item.measurementTypeId && (candidate.role ?? "") === (item.role ?? ""));
  const style = { ...(profileItem?.styleOverride ?? {}), ...(item.styleOverride ?? {}) };

  return {
    label: item.labelOverride || profileItem?.labelOverride || type?.shortLabel || item.measurementTypeId,
    unit: item.unitOverride ?? profileItem?.unitOverride ?? type?.defaultUnit ?? "",
    decimals: item.decimalsOverride ?? profileItem?.decimalsOverride ?? type?.defaultDecimals ?? 3,
    color: style.color || type?.defaultColor || DEFAULT_TYPE_VALUES.defaultColor,
    fontFamily: style.fontFamily || type?.defaultFontFamily || DEFAULT_TYPE_VALUES.defaultFontFamily,
    fontSize: style.fontSize ?? type?.defaultFontSize ?? DEFAULT_TYPE_VALUES.defaultFontSize,
    fontWeight: style.fontWeight || type?.defaultFontWeight || DEFAULT_TYPE_VALUES.defaultFontWeight,
    fontStyle: style.fontStyle || "normal",
    textDecoration: style.textDecoration || "none",
    visible: item.visible ?? profileItem?.defaultVisible ?? type?.defaultVisible ?? true
  };
}

export function formatMeasurementDisplayValue(value: MeasurementRuntimeValue | undefined, decimals: number, fallbackUnit: string): string {
  const unit = value?.unit ?? fallbackUnit;
  if (!value || value.value === null || value.quality === "missing") {
    return unit ? `-- ${unit}` : "--";
  }
  const formatted = typeof value.value === "number" ? value.value.toFixed(Math.max(0, Math.min(12, decimals))) : String(value.value);
  return unit ? `${formatted} ${unit}` : formatted;
}
```

- [ ] **Step 4: Run test to verify domain helpers pass**

Run:

```powershell
npm test -- src/measurements.test.ts
```

Expected: pass.

- [ ] **Step 5: Commit domain model**

Run:

```powershell
git add src/measurements.ts src/measurements.test.ts
git commit -m "feat: add measurement domain model"
```

---

### Task 2: Model Serialization Integration

**Files:**
- Modify: `D:\codex\graph_modeling_platform\src\model.ts`
- Modify: `D:\codex\graph_modeling_platform\src\model.test.ts`

- [ ] **Step 1: Write failing serialization tests**

Append tests to the existing serialization section in `src\model.test.ts`:

```ts
test("serializes and deserializes model measurement groups", () => {
  const project: ProjectFile = {
    version: 1,
    name: "量测模型",
    nodes: [createDefaultNode("ac-load", { x: 100, y: 100 })],
    edges: [],
    measurements: {
      version: 1,
      groups: [{
        id: "measurement-group-1",
        nodeId: "node-1",
        visible: true,
        anchor: "bottom",
        offset: { x: 0, y: 90 },
        layout: "vertical",
        items: [{
          id: "measurement-item-1",
          measurementTypeId: "activePower",
          sourcePoint: "plant.load.1.p",
          decimalsOverride: 2
        }]
      }]
    }
  };
  project.nodes[0] = { ...project.nodes[0], id: "node-1" };

  const restored = deserializeProject(serializeProject(project));

  expect(restored.measurements?.groups).toHaveLength(1);
  expect(restored.measurements?.groups[0].items[0]).toMatchObject({
    measurementTypeId: "activePower",
    sourcePoint: "plant.load.1.p",
    decimalsOverride: 2
  });
});

test("drops measurement groups for missing nodes when loading a model", () => {
  const json = JSON.stringify({
    version: 1,
    name: "量测模型",
    nodes: [],
    edges: [],
    measurements: {
      version: 1,
      groups: [{
        id: "measurement-group-1",
        nodeId: "missing-node",
        visible: true,
        anchor: "bottom",
        offset: { x: 0, y: 90 },
        layout: "vertical",
        items: []
      }]
    }
  });

  const restored = deserializeProject(json);

  expect(restored.measurements?.groups).toEqual([]);
});
```

- [ ] **Step 2: Run failing model tests**

Run:

```powershell
npm test -- src/model.test.ts -t "measurement"
```

Expected: TypeScript or assertion failure because `ProjectFile.measurements` is not defined or not normalized.

- [ ] **Step 3: Add model field and normalization**

Modify imports near the top of `src\model.ts`:

```ts
import { normalizeProjectMeasurements, type ProjectMeasurementConfig } from "./measurements";
```

Add to `ProjectFile`:

```ts
  measurements?: ProjectMeasurementConfig;
```

Update `serializeProject`:

```ts
export function serializeProject(project: ProjectFile): string {
  const locked = normalizeProjectLayers(lockProjectEdgeTerminals(project));
  return JSON.stringify(
    {
      ...locked,
      measurements: normalizeProjectMeasurements(locked.measurements, locked.nodes)
    },
    null,
    2
  );
}
```

Update `deserializeProject`:

```ts
export function deserializeProject(json: string): ProjectFile {
  const parsed = JSON.parse(json) as ProjectFile;
  if (parsed.version !== 1 || !Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) {
    throw new Error("Unsupported or invalid model file");
  }
  const locked = normalizeProjectLayers(lockProjectEdgeTerminals(parsed));
  return {
    ...locked,
    measurements: normalizeProjectMeasurements(locked.measurements, locked.nodes)
  };
}
```

- [ ] **Step 4: Run serialization tests**

Run:

```powershell
npm test -- src/model.test.ts -t "measurement"
```

Expected: pass.

- [ ] **Step 5: Run domain and model tests together**

Run:

```powershell
npm test -- src/measurements.test.ts src/model.test.ts -t "measurement|measurement domain"
```

Expected: pass.

- [ ] **Step 6: Commit serialization integration**

Run:

```powershell
git add src/model.ts src/model.test.ts
git commit -m "feat: persist measurement groups in models"
```

---

### Task 3: Backend Measurement Service and Standard API

**Files:**
- Create: `D:\codex\graph_modeling_platform\server\measurement-service.mjs`
- Create: `D:\codex\graph_modeling_platform\server\measurement-service.test.mjs`
- Modify: `D:\codex\graph_modeling_platform\server\image-server.mjs`
- Create: `D:\codex\graph_modeling_platform\data\settings\measurement-config.json`
- Create: `D:\codex\graph_modeling_platform\data\measurements\sample-values.json`

- [ ] **Step 1: Create platform measurement config JSON**

Create `data\settings\measurement-config.json`:

```json
{
  "measurementTypes": [
    { "id": "activePower", "key": "p", "name": "有功功率", "shortLabel": "P", "defaultUnit": "MW", "valueType": "number", "defaultDecimals": 3, "defaultColor": "#334155", "defaultFontFamily": "Arial", "defaultFontSize": 12, "defaultFontWeight": "500", "defaultVisible": true },
    { "id": "reactivePower", "key": "q", "name": "无功功率", "shortLabel": "Q", "defaultUnit": "Mvar", "valueType": "number", "defaultDecimals": 3, "defaultColor": "#475569", "defaultFontFamily": "Arial", "defaultFontSize": 12, "defaultFontWeight": "500", "defaultVisible": true },
    { "id": "voltage", "key": "u", "name": "电压", "shortLabel": "U", "defaultUnit": "kV", "valueType": "number", "defaultDecimals": 2, "defaultColor": "#334155", "defaultFontFamily": "Arial", "defaultFontSize": 12, "defaultFontWeight": "500", "defaultVisible": true },
    { "id": "current", "key": "i", "name": "电流", "shortLabel": "I", "defaultUnit": "A", "valueType": "number", "defaultDecimals": 1, "defaultColor": "#334155", "defaultFontFamily": "Arial", "defaultFontSize": 12, "defaultFontWeight": "500", "defaultVisible": false },
    { "id": "pressure", "key": "pressure", "name": "压力", "shortLabel": "压力", "defaultUnit": "MPa", "valueType": "number", "defaultDecimals": 3, "defaultColor": "#334155", "defaultFontFamily": "Arial", "defaultFontSize": 12, "defaultFontWeight": "500", "defaultVisible": true },
    { "id": "temperature", "key": "temperature", "name": "温度", "shortLabel": "温度", "defaultUnit": "℃", "valueType": "number", "defaultDecimals": 1, "defaultColor": "#334155", "defaultFontFamily": "Arial", "defaultFontSize": 12, "defaultFontWeight": "500", "defaultVisible": false },
    { "id": "flow", "key": "flow", "name": "流量", "shortLabel": "流量", "defaultUnit": "kg/s", "valueType": "number", "defaultDecimals": 2, "defaultColor": "#334155", "defaultFontFamily": "Arial", "defaultFontSize": 12, "defaultFontWeight": "500", "defaultVisible": true },
    { "id": "level", "key": "level", "name": "液位", "shortLabel": "液位", "defaultUnit": "%", "valueType": "number", "defaultDecimals": 1, "defaultColor": "#334155", "defaultFontFamily": "Arial", "defaultFontSize": 12, "defaultFontWeight": "500", "defaultVisible": true }
  ],
  "deviceProfiles": [
    { "deviceKind": "ACLoad", "items": [{ "measurementTypeId": "activePower" }, { "measurementTypeId": "reactivePower" }, { "measurementTypeId": "voltage" }, { "measurementTypeId": "current" }] },
    { "deviceKind": "DCLoad", "items": [{ "measurementTypeId": "activePower" }, { "measurementTypeId": "voltage" }, { "measurementTypeId": "current" }] },
    { "deviceKind": "HydroStorage", "items": [{ "measurementTypeId": "pressure" }, { "measurementTypeId": "level" }, { "measurementTypeId": "temperature" }] },
    { "deviceKind": "HeatStorage", "items": [{ "measurementTypeId": "temperature" }, { "measurementTypeId": "flow" }] }
  ]
}
```

- [ ] **Step 2: Create sample runtime values**

Create `data\measurements\sample-values.json`:

```json
{
  "timestamp": 1717550000000,
  "sequence": 1,
  "points": [
    { "sourcePoint": "sample.ac-load-1.p", "name": "交流负荷-1 有功", "deviceName": "交流负荷-1", "key": "p", "label": "P", "unit": "MW", "valueType": "number", "value": 12.345, "quality": "good" },
    { "sourcePoint": "sample.ac-load-1.q", "name": "交流负荷-1 无功", "deviceName": "交流负荷-1", "key": "q", "label": "Q", "unit": "Mvar", "valueType": "number", "value": 3.21, "quality": "good" },
    { "sourcePoint": "sample.ac-load-1.u", "name": "交流负荷-1 电压", "deviceName": "交流负荷-1", "key": "u", "label": "U", "unit": "kV", "valueType": "number", "value": 110.0, "quality": "good" }
  ]
}
```

- [ ] **Step 3: Write failing backend tests**

Create `server\measurement-service.test.mjs`:

```js
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import {
  createMeasurementService,
  diffMeasurementValues,
  normalizeMeasurementRuntimePayload
} from "./measurement-service.mjs";

async function createFixture() {
  const root = await mkdtemp(join(tmpdir(), "measurement-service-"));
  const settingsDir = join(root, "settings");
  const measurementDir = join(root, "measurements");
  await mkdir(settingsDir, { recursive: true });
  await mkdir(measurementDir, { recursive: true });
  await writeFile(join(settingsDir, "measurement-config.json"), JSON.stringify({
    measurementTypes: [{ id: "activePower", key: "p", name: "有功功率", shortLabel: "P" }],
    deviceProfiles: [{ deviceKind: "ACLoad", items: [{ measurementTypeId: "activePower" }] }]
  }), "utf8");
  await writeFile(join(measurementDir, "sample-values.json"), JSON.stringify({
    timestamp: 1000,
    sequence: 1,
    points: [{ sourcePoint: "sample.p", name: "P", key: "p", label: "P", unit: "MW", valueType: "number", value: 1.234, quality: "good" }]
  }), "utf8");
  return { root, settingsDir, measurementDir };
}

describe("measurement service", () => {
  test("loads platform config", async () => {
    const fixture = await createFixture();
    const service = createMeasurementService({
      configPath: join(fixture.settingsDir, "measurement-config.json"),
      sampleValuesPath: join(fixture.measurementDir, "sample-values.json")
    });

    const config = await service.getConfig();

    expect(config.measurementTypes[0]).toMatchObject({ id: "activePower", key: "p" });
    expect(config.deviceProfiles[0]).toMatchObject({ deviceKind: "ACLoad" });
  });

  test("returns catalog and snapshot from sample values", async () => {
    const fixture = await createFixture();
    const service = createMeasurementService({
      configPath: join(fixture.settingsDir, "measurement-config.json"),
      sampleValuesPath: join(fixture.measurementDir, "sample-values.json")
    });

    const catalog = await service.getCatalog();
    const snapshot = await service.getSnapshot({ schemePath: "默认方案", modelName: "模型" });

    expect(catalog.points[0]).toMatchObject({ sourcePoint: "sample.p", unit: "MW" });
    expect(snapshot.values[0]).toMatchObject({ sourcePoint: "sample.p", value: 1.234, quality: "good" });
  });

  test("normalizes invalid runtime payload into missing-safe values", () => {
    const payload = normalizeMeasurementRuntimePayload({
      timestamp: 1000,
      sequence: 1,
      points: [{ sourcePoint: "x", value: undefined, quality: "unknown" }]
    });

    expect(payload.points[0]).toMatchObject({ sourcePoint: "x", value: null, quality: "missing" });
  });

  test("diffs changed values by source point", () => {
    const previous = [{ sourcePoint: "a", value: 1, quality: "good", timestamp: 1000 }];
    const next = [
      { sourcePoint: "a", value: 1, quality: "good", timestamp: 1000 },
      { sourcePoint: "b", value: 2, quality: "good", timestamp: 1001 }
    ];

    expect(diffMeasurementValues(previous, next)).toEqual([next[1]]);
  });
});
```

- [ ] **Step 4: Run failing backend tests**

Run:

```powershell
npm test -- server/measurement-service.test.mjs
```

Expected: failure because `server/measurement-service.mjs` does not exist.

- [ ] **Step 5: Implement backend service**

Create `server\measurement-service.mjs`:

```js
import { readFile, stat } from "node:fs/promises";

const goodQualities = new Set(["good", "bad", "stale", "missing"]);

async function readJsonFile(path, fallback) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch {
    return fallback;
  }
}

export function normalizeMeasurementRuntimePayload(payload) {
  const timestamp = Number.isFinite(payload?.timestamp) ? Number(payload.timestamp) : Date.now();
  const sequence = Number.isFinite(payload?.sequence) ? Number(payload.sequence) : timestamp;
  const points = Array.isArray(payload?.points) ? payload.points : [];
  return {
    timestamp,
    sequence,
    points: points
      .filter((point) => typeof point?.sourcePoint === "string" && point.sourcePoint.trim())
      .map((point) => ({
        sourcePoint: point.sourcePoint.trim(),
        name: point.name || point.sourcePoint.trim(),
        deviceName: point.deviceName || "",
        key: point.key || "",
        label: point.label || point.key || point.sourcePoint.trim(),
        unit: point.unit || "",
        valueType: point.valueType || "number",
        value: point.value === undefined ? null : point.value,
        quality: goodQualities.has(point.quality) ? point.quality : "missing",
        timestamp: Number.isFinite(point.timestamp) ? Number(point.timestamp) : timestamp,
        sequence: Number.isFinite(point.sequence) ? Number(point.sequence) : sequence
      }))
  };
}

export function diffMeasurementValues(previous, next) {
  const previousByKey = new Map(previous.map((item) => [item.sourcePoint, JSON.stringify(item)]));
  return next.filter((item) => previousByKey.get(item.sourcePoint) !== JSON.stringify(item));
}

export function createMeasurementService({ configPath, sampleValuesPath }) {
  let cachedRuntime = null;
  let cachedRuntimeMtime = 0;

  const readRuntime = async () => {
    const fileStat = await stat(sampleValuesPath).catch(() => ({ mtimeMs: 0 }));
    if (cachedRuntime && cachedRuntimeMtime === fileStat.mtimeMs) {
      return cachedRuntime;
    }
    cachedRuntime = normalizeMeasurementRuntimePayload(await readJsonFile(sampleValuesPath, { points: [] }));
    cachedRuntimeMtime = fileStat.mtimeMs;
    return cachedRuntime;
  };

  return {
    async getConfig() {
      const payload = await readJsonFile(configPath, { measurementTypes: [], deviceProfiles: [] });
      return {
        measurementTypes: Array.isArray(payload.measurementTypes) ? payload.measurementTypes : [],
        deviceProfiles: Array.isArray(payload.deviceProfiles) ? payload.deviceProfiles : []
      };
    },
    async getStatus() {
      const runtime = await readRuntime();
      return {
        ok: true,
        provider: "sample-json",
        mode: "snapshot+sse",
        lastUpdateTime: runtime.timestamp,
        latencyMs: Math.max(0, Date.now() - runtime.timestamp),
        message: "量测数据正常"
      };
    },
    async getCatalog() {
      const runtime = await readRuntime();
      return {
        version: "1.0",
        points: runtime.points.map(({ sourcePoint, name, deviceName, key, label, unit, valueType }) => ({
          sourcePoint,
          name,
          deviceName,
          key,
          label,
          unit,
          valueType
        }))
      };
    },
    async getSnapshot(request) {
      const runtime = await readRuntime();
      return {
        version: "1.0",
        schemePath: request.schemePath || "",
        modelName: request.modelName || "",
        timestamp: runtime.timestamp,
        sequence: runtime.sequence,
        values: runtime.points.map(({ sourcePoint, value, unit, quality, timestamp, sequence }) => ({
          sourcePoint,
          value,
          unit,
          quality,
          timestamp,
          sequence
        }))
      };
    },
    async getPatchSince(previousValues) {
      const snapshot = await this.getSnapshot({});
      return {
        version: "1.0",
        timestamp: snapshot.timestamp,
        sequence: snapshot.sequence,
        values: diffMeasurementValues(previousValues, snapshot.values)
      };
    }
  };
}
```

- [ ] **Step 6: Wire backend routes**

Modify `server\image-server.mjs` imports:

```js
import { createMeasurementService } from "./measurement-service.mjs";
```

Add paths near existing settings paths:

```js
const measurementConfigPath = join(settingsDataDir, "measurement-config.json");
const measurementDataDir = resolve(repoRoot, "data", "measurements");
const measurementSampleValuesPath = join(measurementDataDir, "sample-values.json");
```

Create service inside `createImageServer` before route maps:

```js
  const measurementService = createMeasurementService({
    configPath: measurementConfigPath,
    sampleValuesPath: measurementSampleValuesPath
  });
```

Add exact handlers:

```js
    ["GET /api/measurements/status", async ({ response }) => {
      sendJson(response, 200, await measurementService.getStatus());
    }],
    ["GET /api/measurements/catalog", async ({ response }) => {
      sendJson(response, 200, await measurementService.getCatalog());
    }],
    ["GET /api/measurements/snapshot", async ({ url, response }) => {
      sendJson(response, 200, await measurementService.getSnapshot({
        schemePath: url.searchParams.get("schemePath") || "",
        modelName: url.searchParams.get("modelName") || ""
      }));
    }],
```

Add dynamic SSE handler before image dynamic handlers:

```js
    {
      method: "GET",
      pattern: /^\/api\/measurements\/stream$/u,
      handle: async ({ url, request, response }) => {
        response.writeHead(200, {
          "content-type": "text/event-stream; charset=utf-8",
          "cache-control": "no-store",
          connection: "keep-alive",
          ...accessControlHeaders
        });
        let lastValues = [];
        const writePatch = async () => {
          const snapshot = await measurementService.getSnapshot({
            schemePath: url.searchParams.get("schemePath") || "",
            modelName: url.searchParams.get("modelName") || ""
          });
          const values = diffMeasurementValues(lastValues, snapshot.values);
          lastValues = snapshot.values;
          if (values.length > 0) {
            response.write(`event: measurement.patch\n`);
            response.write(`data: ${JSON.stringify({ version: "1.0", timestamp: snapshot.timestamp, sequence: snapshot.sequence, values })}\n\n`);
          }
        };
        await writePatch();
        const timer = setInterval(() => {
          writePatch().catch(() => undefined);
        }, 1000);
        request.on("close", () => clearInterval(timer));
      }
    },
```

Import `diffMeasurementValues` too:

```js
import { createMeasurementService, diffMeasurementValues } from "./measurement-service.mjs";
```

- [ ] **Step 7: Run backend tests**

Run:

```powershell
npm test -- server/measurement-service.test.mjs
```

Expected: pass.

- [ ] **Step 8: Start backend and verify endpoints manually**

Run:

```powershell
npm run backend
```

In another terminal:

```powershell
Invoke-RestMethod -Uri "http://127.0.0.1:5174/api/measurements/status"
Invoke-RestMethod -Uri "http://127.0.0.1:5174/api/measurements/catalog"
Invoke-RestMethod -Uri "http://127.0.0.1:5174/api/measurements/snapshot?schemePath=默认方案&modelName=测试模型"
```

Expected: status returns `ok: true`, catalog returns at least three sample points, snapshot returns values.

- [ ] **Step 9: Commit backend API**

Run:

```powershell
git add server/measurement-service.mjs server/measurement-service.test.mjs server/image-server.mjs data/settings/measurement-config.json data/measurements/sample-values.json
git commit -m "feat: add standard measurement backend API"
```

---

### Task 4: Frontend Client and Runtime Store

**Files:**
- Create: `D:\codex\graph_modeling_platform\src\measurementClient.ts`
- Create: `D:\codex\graph_modeling_platform\src\measurementRuntimeStore.ts`
- Create: `D:\codex\graph_modeling_platform\src\measurementRuntimeStore.test.ts`

- [ ] **Step 1: Write failing runtime store tests**

Create `src\measurementRuntimeStore.test.ts`:

```ts
import { describe, expect, test, vi } from "vitest";
import { createMeasurementRuntimeStore } from "./measurementRuntimeStore";

describe("measurement runtime store", () => {
  test("applies snapshot values by source point", () => {
    const store = createMeasurementRuntimeStore();
    store.applySnapshot({
      version: "1.0",
      timestamp: 1000,
      sequence: 1,
      values: [{ sourcePoint: "p1", value: 1.23, quality: "good", timestamp: 1000, sequence: 1 }]
    });

    expect(store.getValue("p1")).toMatchObject({ value: 1.23, quality: "good" });
  });

  test("applies patch values without dropping unchanged points", () => {
    const store = createMeasurementRuntimeStore();
    store.applySnapshot({
      version: "1.0",
      timestamp: 1000,
      sequence: 1,
      values: [
        { sourcePoint: "p1", value: 1, quality: "good", timestamp: 1000, sequence: 1 },
        { sourcePoint: "p2", value: 2, quality: "good", timestamp: 1000, sequence: 1 }
      ]
    });
    store.applyPatch({
      version: "1.0",
      timestamp: 1001,
      sequence: 2,
      values: [{ sourcePoint: "p1", value: 3, quality: "good", timestamp: 1001, sequence: 2 }]
    });

    expect(store.getValue("p1")?.value).toBe(3);
    expect(store.getValue("p2")?.value).toBe(2);
  });

  test("notifies subscribers once for a batched patch", () => {
    vi.useFakeTimers();
    const store = createMeasurementRuntimeStore({ batchMs: 20 });
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);

    store.applyPatch({ version: "1.0", timestamp: 1001, sequence: 2, values: [{ sourcePoint: "p1", value: 1, quality: "good", timestamp: 1001 }] });
    store.applyPatch({ version: "1.0", timestamp: 1002, sequence: 3, values: [{ sourcePoint: "p2", value: 2, quality: "good", timestamp: 1002 }] });
    vi.advanceTimersByTime(20);

    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    vi.useRealTimers();
  });
});
```

- [ ] **Step 2: Run failing runtime tests**

Run:

```powershell
npm test -- src/measurementRuntimeStore.test.ts
```

Expected: failure because runtime store file does not exist.

- [ ] **Step 3: Implement client types and REST/SSE functions**

Create `src\measurementClient.ts`:

```ts
import type { MeasurementRuntimeValue, PlatformMeasurementConfig } from "./measurements";

export type MeasurementStatusResponse = {
  ok: boolean;
  provider: string;
  mode: string;
  lastUpdateTime: number;
  latencyMs: number;
  message: string;
};

export type MeasurementCatalogPoint = {
  sourcePoint: string;
  name: string;
  deviceName?: string;
  key?: string;
  label?: string;
  unit?: string;
  valueType?: "number" | "string" | "boolean";
};

export type MeasurementCatalogResponse = {
  version: "1.0";
  points: MeasurementCatalogPoint[];
};

export type MeasurementSnapshotResponse = {
  version: "1.0";
  schemePath?: string;
  modelName?: string;
  timestamp: number;
  sequence: number;
  values: MeasurementRuntimeValue[];
};

export type MeasurementPatchResponse = {
  version: "1.0";
  timestamp: number;
  sequence: number;
  values: MeasurementRuntimeValue[];
};

const jsonRequest = async <T>(url: string): Promise<T> => {
  const response = await fetch(url, { headers: { accept: "application/json" } });
  if (!response.ok) {
    throw new Error(`Measurement request failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
};

export const fetchMeasurementConfig = () => jsonRequest<PlatformMeasurementConfig>("/api/measurements/config");
export const fetchMeasurementStatus = () => jsonRequest<MeasurementStatusResponse>("/api/measurements/status");
export const fetchMeasurementCatalog = () => jsonRequest<MeasurementCatalogResponse>("/api/measurements/catalog");

export function fetchMeasurementSnapshot(schemePath: string, modelName: string) {
  const params = new URLSearchParams({ schemePath, modelName });
  return jsonRequest<MeasurementSnapshotResponse>(`/api/measurements/snapshot?${params.toString()}`);
}

export function openMeasurementStream({
  schemePath,
  modelName,
  onPatch,
  onStatus
}: {
  schemePath: string;
  modelName: string;
  onPatch: (patch: MeasurementPatchResponse) => void;
  onStatus?: (status: MeasurementStatusResponse) => void;
}) {
  const params = new URLSearchParams({ schemePath, modelName });
  const source = new EventSource(`/api/measurements/stream?${params.toString()}`);
  source.addEventListener("measurement.patch", (event) => {
    onPatch(JSON.parse((event as MessageEvent).data));
  });
  source.addEventListener("measurement.status", (event) => {
    onStatus?.(JSON.parse((event as MessageEvent).data));
  });
  return () => source.close();
}
```

Add a config endpoint in Task 3 route wiring if it was not added:

```js
    ["GET /api/measurements/config", async ({ response }) => {
      sendJson(response, 200, await measurementService.getConfig());
    }],
```

- [ ] **Step 4: Implement runtime store**

Create `src\measurementRuntimeStore.ts`:

```ts
import type { MeasurementRuntimeValue } from "./measurements";
import type { MeasurementPatchResponse, MeasurementSnapshotResponse } from "./measurementClient";

export type MeasurementRuntimeStore = ReturnType<typeof createMeasurementRuntimeStore>;

export function createMeasurementRuntimeStore({ batchMs = 16 }: { batchMs?: number } = {}) {
  const values = new Map<string, MeasurementRuntimeValue>();
  const listeners = new Set<() => void>();
  let timer: ReturnType<typeof setTimeout> | undefined;

  const notify = () => {
    timer = undefined;
    listeners.forEach((listener) => listener());
  };

  const scheduleNotify = () => {
    if (timer !== undefined) {
      return;
    }
    timer = setTimeout(notify, batchMs);
  };

  const applyValues = (nextValues: MeasurementRuntimeValue[]) => {
    for (const value of nextValues) {
      if (value.sourcePoint) {
        values.set(value.sourcePoint, value);
      }
    }
    scheduleNotify();
  };

  return {
    applySnapshot(snapshot: MeasurementSnapshotResponse) {
      values.clear();
      applyValues(snapshot.values);
    },
    applyPatch(patch: MeasurementPatchResponse) {
      applyValues(patch.values);
    },
    getValue(sourcePoint: string) {
      return values.get(sourcePoint);
    },
    getSnapshot() {
      return new Map(values);
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    }
  };
}
```

- [ ] **Step 5: Run runtime store tests**

Run:

```powershell
npm test -- src/measurementRuntimeStore.test.ts
```

Expected: pass.

- [ ] **Step 6: Commit frontend runtime foundation**

Run:

```powershell
git add src/measurementClient.ts src/measurementRuntimeStore.ts src/measurementRuntimeStore.test.ts
git commit -m "feat: add measurement runtime client store"
```

---

### Task 5: App State, Model Save, and Deletion Behavior

**Files:**
- Modify: `D:\codex\graph_modeling_platform\src\App.tsx`
- Modify: `D:\codex\graph_modeling_platform\src\measurements.ts`
- Modify: `D:\codex\graph_modeling_platform\src\measurements.test.ts`

- [ ] **Step 1: Add helper tests for default groups**

Append to `src\measurements.test.ts`:

```ts
import { createDefaultMeasurementGroupForNode, removeMeasurementGroupsForNodeIds } from "./measurements";

test("creates default measurement group from a device profile", () => {
  const group = createDefaultMeasurementGroupForNode({
    node: node("node-1", "ACLoad"),
    config: normalizeMeasurementConfig(DEFAULT_MEASUREMENT_CONFIG)
  });

  expect(group?.nodeId).toBe("node-1");
  expect(group?.items.map((item) => item.measurementTypeId)).toEqual(["activePower", "reactivePower", "voltage", "current"]);
  expect(group?.items.every((item) => item.sourcePoint === "")).toBe(true);
});

test("removes measurement groups when node ids are deleted", () => {
  const groups = [
    { id: "g1", nodeId: "n1", visible: true, anchor: "bottom" as const, offset: { x: 0, y: 70 }, layout: "vertical" as const, items: [] },
    { id: "g2", nodeId: "n2", visible: true, anchor: "bottom" as const, offset: { x: 0, y: 70 }, layout: "vertical" as const, items: [] }
  ];

  expect(removeMeasurementGroupsForNodeIds(groups, new Set(["n1"])).map((group) => group.id)).toEqual(["g2"]);
});
```

- [ ] **Step 2: Implement helper functions**

Add to `src\measurements.ts`:

```ts
const measurementId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export function createDefaultMeasurementGroupForNode({
  node,
  config
}: {
  node: ModelNode;
  config: PlatformMeasurementConfig;
}): MeasurementGroup | null {
  const profile = config.deviceProfiles.find((candidate) => candidate.deviceKind === node.kind);
  if (!profile || profile.items.length === 0) {
    return null;
  }
  return {
    id: measurementId("measurement-group"),
    nodeId: node.id,
    visible: true,
    anchor: "bottom",
    offset: { x: 0, y: Math.max(70, node.size.height / 2 + 24) },
    layout: "vertical",
    items: profile.items.map((item) => ({
      id: measurementId("measurement-item"),
      measurementTypeId: item.measurementTypeId,
      role: item.role,
      sourcePoint: "",
      visible: item.defaultVisible
    }))
  };
}

export function removeMeasurementGroupsForNodeIds(groups: readonly MeasurementGroup[], nodeIds: ReadonlySet<string>): MeasurementGroup[] {
  return groups.filter((group) => !nodeIds.has(group.nodeId));
}
```

- [ ] **Step 3: Run helper tests**

Run:

```powershell
npm test -- src/measurements.test.ts
```

Expected: pass.

- [ ] **Step 4: Wire app state without rendering yet**

Modify `src\App.tsx` imports:

```ts
import {
  DEFAULT_MEASUREMENT_CONFIG,
  createDefaultMeasurementGroupForNode,
  normalizeMeasurementConfig,
  normalizeProjectMeasurements,
  removeMeasurementGroupsForNodeIds,
  type MeasurementGroup,
  type PlatformMeasurementConfig,
  type ProjectMeasurementConfig
} from "./measurements";
import { fetchMeasurementCatalog, fetchMeasurementConfig, fetchMeasurementSnapshot, openMeasurementStream, type MeasurementCatalogPoint } from "./measurementClient";
import { createMeasurementRuntimeStore } from "./measurementRuntimeStore";
```

Add state near project-level state:

```ts
  const [platformMeasurementConfig, setPlatformMeasurementConfig] = useState<PlatformMeasurementConfig>(() => normalizeMeasurementConfig(DEFAULT_MEASUREMENT_CONFIG));
  const [measurementCatalog, setMeasurementCatalog] = useState<MeasurementCatalogPoint[]>([]);
  const [measurements, setMeasurements] = useState<ProjectMeasurementConfig>(() =>
    normalizeProjectMeasurements(initialDraft?.measurements, initialIndexedNodes.nodes)
  );
  const measurementRuntimeStoreRef = useRef(createMeasurementRuntimeStore());
```

Update `currentProject()` to include:

```ts
measurements: normalizeProjectMeasurements(measurements, nodes)
```

Update project loading code wherever `setNodes`, `setEdges`, `setGroups`, and layer/project metadata are set:

```ts
setMeasurements(normalizeProjectMeasurements(project.measurements, project.nodes));
```

Add config and runtime loading effect:

```ts
  useEffect(() => {
    let canceled = false;
    fetchMeasurementConfig()
      .then((config) => {
        if (!canceled) {
          setPlatformMeasurementConfig(normalizeMeasurementConfig(config));
        }
      })
      .catch(() => {
        if (!canceled) {
          setPlatformMeasurementConfig(normalizeMeasurementConfig(DEFAULT_MEASUREMENT_CONFIG));
        }
      });
    fetchMeasurementCatalog()
      .then((catalog) => {
        if (!canceled) {
          setMeasurementCatalog(catalog.points);
        }
      })
      .catch(() => {
        if (!canceled) {
          setMeasurementCatalog([]);
        }
      });
    return () => {
      canceled = true;
    };
  }, []);

  useEffect(() => {
    let closed = false;
    const schemePath = activeSchemePath.join("/");
    fetchMeasurementSnapshot(schemePath, projectName)
      .then((snapshot) => {
        if (!closed) {
          measurementRuntimeStoreRef.current.applySnapshot(snapshot);
        }
      })
      .catch(() => undefined);
    const closeStream = openMeasurementStream({
      schemePath,
      modelName: projectName,
      onPatch: (patch) => measurementRuntimeStoreRef.current.applyPatch(patch)
    });
    return () => {
      closed = true;
      closeStream();
    };
  }, [activeSchemePath, projectName]);
```

When deleting nodes, after the existing node deletion logic determines deleted node ids, add:

```ts
setMeasurements((current) => ({
  version: 1,
  groups: removeMeasurementGroupsForNodeIds(current.groups, new Set(deletedNodeIds))
}));
```

- [ ] **Step 5: Run focused tests and build**

Run:

```powershell
npm test -- src/measurements.test.ts src/model.test.ts -t "measurement|measurement domain"
npm run build
```

Expected: tests pass and build succeeds.

- [ ] **Step 6: Commit app state integration**

Run:

```powershell
git add src/App.tsx src/measurements.ts src/measurements.test.ts
git commit -m "feat: wire measurement config into app state"
```

---

### Task 6: Canvas Measurement Group Rendering

**Files:**
- Modify: `D:\codex\graph_modeling_platform\src\App.tsx`
- Modify: `D:\codex\graph_modeling_platform\src\styles.css`

- [ ] **Step 1: Add local measurement value subscription hook**

In `src\App.tsx`, add a small hook inside the module, outside `App`:

```ts
function useMeasurementRuntimeSnapshot(store: ReturnType<typeof createMeasurementRuntimeStore>) {
  const [, forceVersion] = useState(0);
  useEffect(() => store.subscribe(() => forceVersion((value) => value + 1)), [store]);
  return store.getSnapshot();
}
```

- [ ] **Step 2: Add measurement layer data inside `App`**

Inside `App`, derive runtime values:

```ts
  const measurementRuntimeSnapshot = useMeasurementRuntimeSnapshot(measurementRuntimeStoreRef.current);
  const visibleMeasurementGroups = useMemo(
    () => measurements.groups.filter((group) => group.visible && visibleNodeById.has(group.nodeId)),
    [measurements.groups, visibleNodeById]
  );
```

- [ ] **Step 3: Add measurement group renderer**

Add renderer inside `App` before `return`:

```tsx
  const renderMeasurementGroup = (group: MeasurementGroup) => {
    const node = visibleNodeById.get(group.nodeId);
    if (!node) {
      return null;
    }
    const x = node.position.x + node.size.width / 2 + group.offset.x;
    const y = node.position.y + node.size.height / 2 + group.offset.y;
    const rows = group.items
      .map((item) => {
        const display = resolveMeasurementItemDisplay({ config: platformMeasurementConfig, node, group, item });
        if (!display.visible) {
          return null;
        }
        const runtime = item.sourcePoint ? measurementRuntimeSnapshot.get(item.sourcePoint) : undefined;
        return { item, display, text: formatMeasurementDisplayValue(runtime, display.decimals, display.unit), quality: runtime?.quality ?? "missing" };
      })
      .filter((row): row is NonNullable<typeof row> => Boolean(row));

    if (rows.length === 0) {
      return null;
    }

    return (
      <g key={group.id} className={`measurement-group measurement-layout-${group.layout}`} transform={`translate(${x} ${y})`}>
        {rows.map((row, index) => (
          <text
            key={row.item.id}
            className={`measurement-item measurement-quality-${row.quality}`}
            x={0}
            y={index * (row.display.fontSize + 4)}
            fill={row.display.color}
            fontFamily={row.display.fontFamily}
            fontSize={row.display.fontSize}
            fontWeight={row.display.fontWeight}
            fontStyle={row.display.fontStyle}
            textDecoration={row.display.textDecoration}
          >
            {`${row.display.label} ${row.text}`}
          </text>
        ))}
      </g>
    );
  };
```

Ensure the import from `src\measurements.ts` includes:

```ts
formatMeasurementDisplayValue,
resolveMeasurementItemDisplay
```

- [ ] **Step 4: Insert layer in the SVG after node/device labels and before edit overlays**

Find the main SVG content where nodes are rendered. Insert:

```tsx
{visibleMeasurementGroups.length > 0 && (
  <g className="measurement-layer" pointerEvents={isBrowseMode ? "none" : "auto"}>
    {visibleMeasurementGroups.map(renderMeasurementGroup)}
  </g>
)}
```

Place it after normal node graphics so values are visible, but before transform handles so edit handles stay usable.

- [ ] **Step 5: Add styles**

Append to `src\styles.css`:

```css
.measurement-layer {
  overflow: visible;
}

.measurement-group {
  pointer-events: none;
  user-select: none;
}

.measurement-item {
  paint-order: stroke;
  stroke: rgba(255, 255, 255, 0.88);
  stroke-width: 3px;
  stroke-linejoin: round;
}

.measurement-quality-good {
  opacity: 1;
}

.measurement-quality-stale {
  opacity: 0.62;
}

.measurement-quality-bad {
  fill: #b45309;
}

.measurement-quality-missing {
  fill: #94a3b8;
}
```

- [ ] **Step 6: Run build**

Run:

```powershell
npm run build
```

Expected: build succeeds.

- [ ] **Step 7: Commit measurement rendering**

Run:

```powershell
git add src/App.tsx src/styles.css
git commit -m "feat: render device measurement groups"
```

---

### Task 7: Sidebar Measurement Editing

**Files:**
- Modify: `D:\codex\graph_modeling_platform\src\App.tsx`
- Modify: `D:\codex\graph_modeling_platform\src\styles.css`

- [ ] **Step 1: Add measurement update helpers**

Inside `App`, add helpers near other selected-node update helpers:

```ts
  const selectedMeasurementGroup = useMemo(
    () => (selectedNodeId ? measurements.groups.find((group) => group.nodeId === selectedNodeId) : undefined),
    [measurements.groups, selectedNodeId]
  );

  const updateMeasurementGroup = (groupId: string, updater: (group: MeasurementGroup) => MeasurementGroup) => {
    setMeasurements((current) => ({
      version: 1,
      groups: current.groups.map((group) => (group.id === groupId ? updater(group) : group))
    }));
    setSaveRequired(true);
  };

  const addDefaultMeasurementGroupForSelectedNode = () => {
    if (!inspectorSelectedNode || selectedMeasurementGroup) {
      return;
    }
    const group = createDefaultMeasurementGroupForNode({ node: inspectorSelectedNode, config: platformMeasurementConfig });
    if (!group) {
      return;
    }
    setMeasurements((current) => ({ version: 1, groups: [...current.groups, group] }));
    setSaveRequired(true);
  };

  const removeSelectedMeasurementGroup = () => {
    if (!selectedMeasurementGroup) {
      return;
    }
    setMeasurements((current) => ({
      version: 1,
      groups: current.groups.filter((group) => group.id !== selectedMeasurementGroup.id)
    }));
    setSaveRequired(true);
  };
```

- [ ] **Step 2: Render sidebar controls for device measurements**

Inside the selected non-static node inspector table, after label rows and before terminal rows, insert:

```tsx
<tr>
  <th>动态量测</th>
  <td>
    <div className="measurement-sidebar-actions">
      <button type="button" disabled={isBrowseMode || Boolean(selectedMeasurementGroup)} onClick={addDefaultMeasurementGroupForSelectedNode}>
        添加默认量测
      </button>
      <button type="button" disabled={isBrowseMode || !selectedMeasurementGroup} onClick={removeSelectedMeasurementGroup}>
        删除量测
      </button>
    </div>
  </td>
</tr>
{selectedMeasurementGroup && (
  <>
    <tr>
      <th>量测显示</th>
      <td>
        <select
          value={selectedMeasurementGroup.visible ? "1" : "0"}
          disabled={isBrowseMode}
          onChange={(event) => updateMeasurementGroup(selectedMeasurementGroup.id, (group) => ({ ...group, visible: event.target.value === "1" }))}
        >
          <option value="1">显示</option>
          <option value="0">隐藏</option>
        </select>
      </td>
    </tr>
    <tr>
      <th>量测布局</th>
      <td>
        <select
          value={selectedMeasurementGroup.layout}
          disabled={isBrowseMode}
          onChange={(event) => updateMeasurementGroup(selectedMeasurementGroup.id, (group) => ({ ...group, layout: event.target.value as MeasurementGroup["layout"] }))}
        >
          <option value="vertical">竖向</option>
          <option value="horizontal">横向</option>
          <option value="grid">表格</option>
        </select>
      </td>
    </tr>
    {selectedMeasurementGroup.items.map((item) => (
      <Fragment key={item.id}>
        <tr>
          <th>{item.measurementTypeId}</th>
          <td>
            <select
              value={item.sourcePoint}
              disabled={isBrowseMode}
              onChange={(event) => updateMeasurementGroup(selectedMeasurementGroup.id, (group) => ({
                ...group,
                items: group.items.map((candidate) => candidate.id === item.id ? { ...candidate, sourcePoint: event.target.value } : candidate)
              }))}
            >
              <option value="">未绑定测点</option>
              {measurementCatalog.map((point) => (
                <option key={point.sourcePoint} value={point.sourcePoint}>
                  {point.name || point.sourcePoint}
                </option>
              ))}
            </select>
          </td>
        </tr>
        <tr>
          <th>显示名称</th>
          <td>
            <input
              value={item.labelOverride ?? ""}
              disabled={isBrowseMode}
              title="为空时继承量测类型"
              onChange={(event) => updateMeasurementGroup(selectedMeasurementGroup.id, (group) => ({
                ...group,
                items: group.items.map((candidate) => candidate.id === item.id ? { ...candidate, labelOverride: event.target.value } : candidate)
              }))}
            />
          </td>
        </tr>
      </Fragment>
    ))}
  </>
)}
```

Ensure imports include `Fragment` if it is not already imported.

- [ ] **Step 3: Add sidebar styles**

Append to `src\styles.css`:

```css
.measurement-sidebar-actions {
  display: flex;
  gap: 6px;
  align-items: center;
}

.measurement-sidebar-actions button {
  min-height: 24px;
  padding: 2px 8px;
  border-radius: 4px;
}
```

- [ ] **Step 4: Run build**

Run:

```powershell
npm run build
```

Expected: build succeeds.

- [ ] **Step 5: Manual browser check**

Run:

```powershell
npm run dev
```

Open `http://127.0.0.1:5173/`. Select an AC load, click `添加默认量测`, bind `sample.ac-load-1.p`, and confirm `P 12.345 MW` appears near the device.

- [ ] **Step 6: Commit sidebar editing**

Run:

```powershell
git add src/App.tsx src/styles.css
git commit -m "feat: add measurement sidebar controls"
```

---

### Task 8: Measurement Drag Offset and Interaction Isolation

**Files:**
- Modify: `D:\codex\graph_modeling_platform\src\App.tsx`
- Modify: `D:\codex\graph_modeling_platform\src\styles.css`

- [ ] **Step 1: Add drag state**

Inside `App`, add state:

```ts
  const [measurementDrag, setMeasurementDrag] = useState<{
    groupId: string;
    nodeId: string;
    pointerId: number;
    startCanvasPoint: Point;
    startOffset: Point;
  } | null>(null);
```

- [ ] **Step 2: Add measurement pointer handlers**

Inside `App`, add:

```ts
  const beginMeasurementDrag = (event: PointerEvent<SVGGElement>, group: MeasurementGroup) => {
    if (isBrowseMode) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const point = clientToCanvasPoint(event.clientX, event.clientY);
    setMeasurementDrag({
      groupId: group.id,
      nodeId: group.nodeId,
      pointerId: event.pointerId,
      startCanvasPoint: point,
      startOffset: group.offset
    });
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const updateMeasurementDrag = (event: PointerEvent<SVGSVGElement>) => {
    if (!measurementDrag || event.pointerId !== measurementDrag.pointerId) {
      return;
    }
    const point = clientToCanvasPoint(event.clientX, event.clientY);
    const offset = {
      x: measurementDrag.startOffset.x + point.x - measurementDrag.startCanvasPoint.x,
      y: measurementDrag.startOffset.y + point.y - measurementDrag.startCanvasPoint.y
    };
    setMeasurements((current) => ({
      version: 1,
      groups: current.groups.map((group) => group.id === measurementDrag.groupId ? { ...group, offset, anchor: "custom" } : group)
    }));
  };

  const endMeasurementDrag = (event: PointerEvent<SVGSVGElement>) => {
    if (!measurementDrag || event.pointerId !== measurementDrag.pointerId) {
      return;
    }
    setMeasurementDrag(null);
    setSaveRequired(true);
  };
```

Hook these handlers into the main SVG pointer move/up paths:

```tsx
onPointerMove={(event) => {
  updateMeasurementDrag(event);
  existingPointerMoveHandler(event);
}}
onPointerUp={(event) => {
  endMeasurementDrag(event);
  existingPointerUpHandler(event);
}}
```

Use the actual existing handler names in `App.tsx`; keep measurement handlers at the top so active measurement drag does not leak into graph drag.

- [ ] **Step 3: Enable pointer events on measurement groups in edit mode**

Change measurement group render:

```tsx
<g
  key={group.id}
  className={`measurement-group measurement-layout-${group.layout}`}
  transform={`translate(${x} ${y})`}
  onPointerDown={(event) => beginMeasurementDrag(event, group)}
>
```

Change layer pointer events:

```tsx
<g className="measurement-layer" pointerEvents={isBrowseMode ? "none" : "auto"}>
```

- [ ] **Step 4: Update styles**

Append:

```css
.edit-mode .measurement-group {
  cursor: move;
  pointer-events: auto;
}

.browse-mode .measurement-group {
  pointer-events: none;
}
```

- [ ] **Step 5: Build and manual drag check**

Run:

```powershell
npm run build
```

Expected: build succeeds.

Manual check: drag a measurement text group. The owning device does not move, no connection line reroutes, and the model only becomes dirty after the measurement drag ends.

- [ ] **Step 6: Commit drag interaction**

Run:

```powershell
git add src/App.tsx src/styles.css
git commit -m "feat: allow measurement group positioning"
```

---

### Task 9: Performance Probe and Guardrails

**Files:**
- Modify: `D:\codex\graph_modeling_platform\src\measurementRuntimeStore.test.ts`
- Modify: `D:\codex\graph_modeling_platform\src\App.tsx`

- [ ] **Step 1: Add runtime store performance test**

Append to `src\measurementRuntimeStore.test.ts`:

```ts
test("applies 5000 runtime values without graph-shaped work", () => {
  const store = createMeasurementRuntimeStore({ batchMs: 0 });
  const values = Array.from({ length: 5000 }, (_, index) => ({
    sourcePoint: `p-${index}`,
    value: index,
    quality: "good" as const,
    timestamp: 1000,
    sequence: 1
  }));
  const startedAt = performance.now();

  store.applySnapshot({ version: "1.0", timestamp: 1000, sequence: 1, values });
  const elapsed = performance.now() - startedAt;

  expect(store.getValue("p-4999")?.value).toBe(4999);
  expect(elapsed).toBeLessThan(50);
});
```

- [ ] **Step 2: Add development-only measurement timing**

In `src\App.tsx`, around runtime patch application:

```ts
const startedAt = performance.now();
measurementRuntimeStoreRef.current.applyPatch(patch);
if (import.meta.env.DEV && patch.values.length > 0) {
  console.debug(`[measurement] patch values=${patch.values.length} applyMs=${(performance.now() - startedAt).toFixed(2)}`);
}
```

Around snapshot application:

```ts
const startedAt = performance.now();
measurementRuntimeStoreRef.current.applySnapshot(snapshot);
if (import.meta.env.DEV && snapshot.values.length > 0) {
  console.debug(`[measurement] snapshot values=${snapshot.values.length} applyMs=${(performance.now() - startedAt).toFixed(2)}`);
}
```

- [ ] **Step 3: Run performance test**

Run:

```powershell
npm test -- src/measurementRuntimeStore.test.ts
```

Expected: pass, including `applies 5000 runtime values without graph-shaped work`.

- [ ] **Step 4: Build**

Run:

```powershell
npm run build
```

Expected: build succeeds.

- [ ] **Step 5: Commit guardrails**

Run:

```powershell
git add src/measurementRuntimeStore.test.ts src/App.tsx
git commit -m "perf: guard measurement runtime updates"
```

---

### Task 10: End-to-End Verification and Final Integration

**Files:**
- No new production files unless verification exposes a defect.

- [ ] **Step 1: Run full tests**

Run:

```powershell
npm test
```

Expected: all tests pass.

- [ ] **Step 2: Run production build**

Run:

```powershell
npm run build
```

Expected: TypeScript build and Vite build pass.

- [ ] **Step 3: Run local app**

Run:

```powershell
npm run dev
```

Expected:

```text
frontend http://127.0.0.1:5173/
backend http://127.0.0.1:5174/
```

- [ ] **Step 4: Browser functional verification**

Open `http://127.0.0.1:5173/` and verify:

- In edit mode, select an AC load and add default measurements.
- Bind `sample.ac-load-1.p` to active power.
- The value appears near the device.
- Drag the device; measurement group follows.
- Drag only the measurement group; device and connection lines do not move.
- Save and reload; measurement group configuration remains.
- Runtime value is loaded from snapshot again and is not saved inside the model JSON as a live value.
- Delete the device; attached measurement group disappears.
- In browse mode, measurement values display but cannot be edited or dragged.

- [ ] **Step 5: Performance verification**

In development console, confirm logs look like:

```text
[measurement] snapshot values=3 applyMs=0.20
[measurement] patch values=1 applyMs=0.05
```

For a synthetic large sample file with 5000 points, confirm snapshot apply time remains below 50ms in the unit test and that the canvas does not reroute edges or recompute topology when values update.

- [ ] **Step 6: Final commit if verification fixes were needed**

If verification required fixes, commit them:

```powershell
git add src server data
git commit -m "fix: stabilize measurement integration"
```

---

## Self-Review

Spec coverage:

- Platform-wide measurement type library: Task 1 and Task 3.
- Device measurement profiles: Task 1 and Task 3.
- Model-saved measurement groups: Task 2 and Task 5.
- Runtime standard API: Task 3 and Task 4.
- Runtime store isolation from graph state: Task 4 and Task 9.
- Canvas display: Task 6.
- Sidebar controls: Task 7.
- Drag positioning: Task 8.
- Deletion cleanup: Task 5.
- Performance guardrails: Task 9 and Task 10.

Completeness scan:

- No incomplete-marker tokens.
- No open-ended implementation gaps.
- Each task has files, steps, commands, and expected outcomes.

Type consistency:

- Shared measurement names come from `src\measurements.ts`.
- Backend payload names align with `src\measurementClient.ts`.
- Model serialization uses `ProjectMeasurementConfig`.
