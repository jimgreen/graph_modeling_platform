# Dynamic Measurements Design

## Goal

Add dynamic measurement display to the graph modeling platform. Different device types can display different runtime measurements, each with configurable label, unit, decimals, color, font, visibility, and layout. Runtime values come from a standardized backend interface so later database, file, simulation, SCADA, OPC, or other sources can connect through adapters without changing the canvas model.

## Core Decision

Use a four-layer model:

```text
platform measurement type library
  -> platform device measurement profiles
    -> model-level device measurement groups
      -> runtime measurement values
```

The measurement type library and device measurement profiles are platform-wide configuration. Device measurement groups are saved in each model. Runtime values are not saved in the model and do not enter undo/redo, topology, routing, auto-save, or graph-store updates.

## Platform Measurement Type Library

The platform owns a single measurement type library shared by all schemes and models. A measurement type describes a semantic value such as active power, reactive power, voltage, current, frequency, pressure, temperature, flow, level, storage, or loading.

Each measurement type defines:

- Stable `id`, for example `activePower`.
- Short `key`, for example `p`.
- Chinese display name, for example `有功功率`.
- Short label, for example `P`.
- Default unit, for example `MW`.
- Value type: `number`, `string`, or `boolean`.
- Default decimals.
- Default text color, font family, font size, and font weight.
- Default visibility.

Example:

```json
{
  "id": "activePower",
  "key": "p",
  "name": "有功功率",
  "shortLabel": "P",
  "defaultUnit": "MW",
  "valueType": "number",
  "defaultDecimals": 3,
  "defaultColor": "#334155",
  "defaultFontFamily": "Arial",
  "defaultFontSize": 12,
  "defaultFontWeight": "500",
  "defaultVisible": true
}
```

## Device Measurement Profiles

Device measurement profiles are also platform-wide. They describe which measurement types are normally available for a device kind.

Profiles do not repeat the full measurement style. They reference measurement types and can override label, unit, decimals, visibility, and style for a specific device kind or role.

Example:

```json
{
  "deviceKind": "ACTransformer3",
  "items": [
    { "measurementTypeId": "activePower", "role": "highSide", "labelOverride": "高压侧P" },
    { "measurementTypeId": "voltage", "role": "highSide", "labelOverride": "高压侧U" },
    { "measurementTypeId": "activePower", "role": "mediumSide", "labelOverride": "中压侧P" },
    { "measurementTypeId": "voltage", "role": "mediumSide", "labelOverride": "中压侧U" },
    { "measurementTypeId": "activePower", "role": "lowSide", "labelOverride": "低压侧P" },
    { "measurementTypeId": "voltage", "role": "lowSide", "labelOverride": "低压侧U" }
  ]
}
```

## Model-Level Measurement Groups

Each model can save measurement groups attached to nodes. A group belongs to one device node and stores display position, layout, visibility, and bound measurement items.

Saved model data:

```ts
type ProjectMeasurementConfig = {
  version: 1;
  groups: MeasurementGroup[];
};

type MeasurementGroup = {
  id: string;
  nodeId: string;
  visible: boolean;
  anchor: "top" | "bottom" | "left" | "right" | "custom";
  offset: { x: number; y: number };
  layout: "vertical" | "horizontal" | "grid";
  groupStyleOverride?: MeasurementStyleOverride;
  items: MeasurementItemBinding[];
};

type MeasurementItemBinding = {
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
```

Display settings are resolved with this priority:

```text
measurement type defaults
  < device profile overrides
  < device instance overrides
  < temporary interaction state
```

## Standard Runtime API

Because there is no fixed data source yet, the platform defines Measurement API v1. Future sources must adapt to this interface.

Required endpoints:

```text
GET /api/measurements/status
GET /api/measurements/catalog
GET /api/measurements/snapshot?schemePath=<scheme path>&modelName=<model name>
GET /api/measurements/stream?schemePath=<scheme path>&modelName=<model name>
```

`status` returns service health and freshness.

`catalog` returns available external measurement points for sidebar binding.

`snapshot` returns current values for initial page load.

`stream` uses Server-Sent Events for backend-to-frontend patches.

Runtime value shape:

```ts
type MeasurementRuntimeValue = {
  sourcePoint: string;
  value: number | string | boolean | null;
  unit?: string;
  quality: "good" | "bad" | "stale" | "missing";
  timestamp: number;
  sequence?: number;
};
```

The runtime API only cares about `sourcePoint` and value quality. It does not know how the canvas chooses fonts, colors, decimals, or group layout.

## Frontend Architecture

Add an independent runtime value store:

```text
snapshot/SSE
  -> measurementValueStore
  -> MeasurementGroupLayer
  -> local text refresh only
```

Runtime measurement updates must not call:

- `setGraphArrays`
- `graphStoreSetNodes`
- `graphStoreSetGraph`
- `serializeProject`
- undo/redo snapshot functions
- route-store refresh functions
- topology calculation functions
- element tree signature calculation

Measurement group configuration is editable and saved with the model. Runtime values are separate and volatile.

## Canvas Behavior

Measurement groups render as device-owned overlays. They are not static text nodes and do not participate in routing, topology, E export, or SVG model geometry unless a later export-specific requirement is added.

Behavior:

- A device can have zero or one default measurement group in phase one.
- A group can contain multiple measurement items.
- A group follows the owning device when the device moves.
- A group can be dragged manually by changing its `offset`.
- In browse mode, groups are read-only.
- In edit mode, groups can be selected through the owning device sidebar controls.
- When the device is deleted, its measurement group is deleted.
- When the device is copied, display style can be copied but `sourcePoint` bindings default to empty unless the user explicitly uses an automatic rebind command.

## Sidebar Behavior

For a selected device, add a measurement section:

- Enable or disable measurement display.
- Add default measurement items based on device kind.
- Edit group layout, anchor, offset, font size, and color overrides.
- Add or remove measurement items.
- Choose measurement type from the platform measurement type library.
- Bind `sourcePoint` from the backend catalog with search.
- Override label, unit, decimals, color, and visibility per item.

Platform configuration should later expose:

- Measurement type management.
- Device measurement profile management.

Phase one can use built-in defaults and backend JSON config without a full platform configuration UI.

## Backend Architecture

Add a backend measurement service module. It loads platform measurement config from `data/settings/measurement-config.json` and runtime sample values from `data/measurements/sample-values.json`.

The sample provider proves the standard interface before a real database or file provider exists. Future providers implement the same service boundary:

```ts
type MeasurementProvider = {
  getStatus(): Promise<MeasurementProviderStatus>;
  getCatalog(): Promise<MeasurementPointDefinition[]>;
  getSnapshot(request: MeasurementSnapshotRequest): Promise<MeasurementSnapshot>;
  subscribe?(
    request: MeasurementSubscribeRequest,
    onPatch: (patch: MeasurementPatch) => void
  ): () => void;
};
```

The first SSE implementation can poll the sample file at a fixed interval and emit patches when values change.

## Performance Requirements

The feature must preserve large-model responsiveness.

Required constraints:

- Runtime value updates only update measurement runtime state.
- Multiple value patches are batched into animation-frame or short-interval updates.
- Measurement rendering is scoped to visible or near-visible groups.
- Measurement group components are memoized by group configuration and relevant `sourcePoint` values.
- Browse mode skips edit controls and drag handlers for measurements.
- Saving a model serializes measurement configuration only, not live values.

## Testing Strategy

Add focused tests:

- Measurement type and profile normalization.
- Style resolution priority.
- Project serialization/deserialization of measurement groups.
- Deleting a node removes attached measurement groups.
- Runtime store applies snapshot and patch updates without touching graph arrays.
- Backend status/catalog/snapshot/SSE payload shapes.
- Rendering formats decimals, units, and quality states correctly.

End-to-end browser testing can be added after implementation to verify that a selected device can display live measurement values without causing graph geometry changes.

## Phase-One Scope

Included:

- Platform-wide measurement type library.
- Platform-wide device measurement profiles.
- Model-saved measurement groups.
- Standard backend status/catalog/snapshot/SSE endpoints.
- JSON sample provider.
- Sidebar editing for device measurement groups.
- Canvas display for measurement groups.
- Runtime value store isolated from graph state.
- Tests and performance probes.

Excluded from phase one:

- Historical curves.
- Alarm thresholds.
- Remote control commands.
- User permissions.
- Multi-source conflict resolution.
- Real industrial protocol adapters.
- Database schema customization.
