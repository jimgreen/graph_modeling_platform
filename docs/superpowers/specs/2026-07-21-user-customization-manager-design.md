# User Customization Manager Design

## Goal

Provide one place where the user can inspect every currently effective customization, export it as a portable backup, import a package in replace or incremental mode, and restore selected or all customizations to the program defaults.

The manager represents the current effective differences from built-in defaults. It is not an audit log of historical clicks or edits.

## Built-In And User-Owned Data

The program keeps two kinds of built-in content:

- Device structure, terminals, states, parameters, and default visuals are primarily defined in `src/model.ts`, including `BASE_DEVICE_LIBRARY` and `DEVICE_LIBRARY`.
- Referenced image and icon files are stored under `data/images` and `data/icon-library`.

User-owned customizations currently span several persistence domains:

- `data/device-library/library.json`: custom category libraries, component libraries, custom devices, built-in device overrides, E-file class metadata, graph template types, and graph templates.
- `data/settings/measurement-config.json`: measurement definitions and defaults.
- `data/settings/color-config.json`: color display mode and custom palettes.
- Non-built-in image and icon assets managed by the image-library APIs.
- Local-storage and IndexedDB copies retained only as compatibility caches, not as an independent source of truth after backend data has loaded.

Existing model files, the current canvas, drawn device instances, drawn measurement instances, and ordinary UI preferences are outside this feature's export and reset scope.

## User Experience

Add a dedicated `用户自定义管理` dialog reachable from the component-library toolbar. The dialog uses the approved two-column layout:

- A summary header shows total custom items, additions, built-in overrides, and user resource files.
- The left tree groups customization domains and shows the number of effective changes in each domain.
- The right table shows the selected domain's current items, change type, ownership, and concise change summary.
- Search and change-type filters apply to the current domain.
- Commands include `导出全部`, `导入配置`, `恢复所选`, `恢复当前分类`, and `恢复全部默认`.
- Individual rows may be restored when their domain supports item-level restoration.

The initial domains are:

1. Custom category libraries.
2. Custom component libraries.
3. Custom devices.
4. Built-in device-definition overrides.
5. Parameter-definition changes.
6. Measurement-definition changes.
7. E-file interface-definition changes.
8. Custom graph templates and template types.
9. User image and icon assets.
10. Color settings.

Static summary rows are derived from normalized current data. The dialog does not persist a second customization registry that could drift from the actual data.

## Customization Snapshot

Introduce a normalized customization snapshot assembled from the existing persistence payloads. The snapshot contains:

- Device-library persistence payload.
- Measurement configuration.
- Color configuration.
- User image folders and non-built-in image/icon assets, including portable data URLs for export.
- Metadata containing package format, package version, export timestamp, application version when available, and per-domain counts.

Pure inventory builders compare the normalized snapshot with program defaults and produce display rows. Each row has a stable domain key, item key, display name, change type, and summary. The inventory is a view over source data and is never saved separately.

Built-in definitions remain the restore baseline. Empty custom arrays and maps restore the device library to built-in behavior. Measurement and color restoration use `DEFAULT_MEASUREMENT_CONFIG`, the default color display mode, and `DEFAULT_COLOR_PALETTE`. Built-in image/icon assets are excluded from reset and export.

## Package Compatibility

Extend the existing `graph-modeling-platform-library-package` format to the next package version and add optional color-configuration and manifest sections. The new all-customizations export remains a single JSON file.

The normalizer accepts both:

- Existing version-1 library packages, treating missing color and manifest sections as absent domains.
- The new package version, validating every included domain before any persistent write starts.

Existing scoped import/export entry points continue to work. The new manager uses the full customization scope and does not remove the current template-library or component-library workflows.

## Export Flow

1. Flush any buffered editor values that belong to an open customization editor.
2. Read and normalize device-library, measurement, color, and user-asset data.
3. Exclude built-in assets and compatibility-cache duplicates.
4. Build the manifest and full package.
5. Download one timestamped JSON file.
6. Show a successful-export dialog containing the item and asset counts.

Export is read-only and does not mark the model or customization editors as modified.

## Import Flow

The import dialog validates the selected file first and then shows domain counts plus the expected numbers of additions, updates, unchanged items, and conflicts. The user chooses one mode:

### Overall replacement

- Automatically export the current full customization package as a backup.
- Replace all managed customization domains with the imported package.
- A domain absent from a version-1 package is left unchanged rather than reset, preventing legacy packages from unexpectedly clearing newer settings.

### Incremental update

- Automatically export the current full customization package as a backup.
- Preserve local items that are absent from the imported package.
- Add imported items whose stable IDs do not exist locally.
- Replace local items when the imported package contains the same stable ID.
- Present same-name/different-ID cases as conflicts before confirmation; after confirmation, imported content wins while stable-ID normalization prevents duplicate effective entries.

All package sections are normalized and validated before applying changes. Application is coordinated as a transaction: retain the pre-import snapshot, write all target domains, refresh them from the backend, and automatically restore the retained snapshot if any write or asset operation fails. The user receives a success summary or a failure message that identifies the failed domain and rollback result.

## Restore Flow

Restoration supports three scopes:

- Selected rows.
- Current domain.
- All customizations.

Every restore command requires confirmation and lists the number and type of affected items. `恢复全部默认` automatically exports the current customization package before changing data.

Restoration removes user definitions and overrides from the relevant persistence domain and restores built-in defaults. It does not delete or rewrite existing canvas nodes, edges, measurement instances, project files, or schemes. After restoration, the application reloads effective definitions and applies the existing definition-to-instance reconciliation rules where a valid current definition exists. Orphaned drawn devices retain their stored snapshot so they remain visible and exportable.

User image and icon restoration deletes only assets identified as user-owned. An asset still referenced by an existing model remains available to that model until the user explicitly removes or replaces the reference; the manager reports referenced assets and excludes them from destructive bulk deletion unless their binary content is embedded in the automatic backup and the user confirms the dependency warning.

## State And Refresh Rules

- The backend remains the authoritative store after initial load.
- Successful import or restore updates React state, compatibility caches, persisted-payload refs, and customization inventory from the same normalized result.
- The manager refreshes after every operation rather than manually adjusting counters.
- Operations on customization data do not set the current model's dirty flag unless definition-to-instance reconciliation actually changes the open model.
- Closing the manager during an active import or restore is disabled.

## Error Handling And Safety

- Reject files with an invalid format, unsupported future version, malformed domain, duplicate stable ID, unsafe asset path, invalid data URL, or configured size-limit violation.
- Show validation errors before offering the final import confirmation.
- Never modify built-in source files or bundled assets during reset or import.
- Prevent concurrent import, restore, and save operations through one operation lock.
- Keep the automatic pre-operation backup downloadable even when the subsequent operation fails.
- If rollback fails, report both the original failure and rollback failure and retain the backup file for manual recovery.

## Implementation Boundaries

Keep the feature split into focused units:

- Snapshot and inventory helpers: normalize data, build counts, compare with defaults, and create stable display rows.
- Package helpers: version compatibility, export construction, validation, replace merge, and incremental merge.
- Persistence coordinator: capture backup, apply domains, roll back, and refresh backend state.
- Dialog state and commands: selection, filters, confirmations, progress, and success/failure messages.
- View component and styles: approved tree/table layout without embedding persistence logic.

Existing library package helpers and backend persistence APIs are reused where possible. New helpers are introduced only where full-snapshot orchestration, color packaging, or deterministic incremental merging is not already available.

## Verification

- Unit tests for inventory counts and item classification across every domain.
- Unit tests for version-1 compatibility and the new full package format.
- Unit tests for replacement and incremental merging, including same-ID overwrite and same-name/different-ID conflicts.
- Unit tests for selected, domain, and full restoration against built-in defaults.
- Persistence tests for successful multi-domain apply, injected failure, and rollback.
- Asset tests proving built-in files are excluded and user assets survive export/import.
- Integration tests for dialog summaries, import preview, confirmations, success messages, and operation locking.
- Regression tests confirming restore does not delete drawn instances and orphaned devices still display and export.
- Production build and browser verification of the dialog at desktop and reduced-width viewports.
