# Definition-to-Instance Synchronization Design

## Goal

Keep already-drawn devices and measurements aligned with the latest component visual, parameter, and measurement definitions without discarding instance-owned values, positions, visibility, or manual overrides.

## Scope

- Reconcile the currently open canvas immediately after a component or measurement definition is saved.
- Reconcile saved legacy models when they are opened.
- Cover component visuals, state visuals, size, terminal definitions, parameter definitions, and measurement profiles.
- Preserve orphaned devices whose source component has been deleted; only reconcile nodes for which a current template still exists.

## Ownership Rules

### Definition-owned data

- Component background and foreground imagery, image fit, border/fill and other visual definition parameters.
- Component size and state definitions.
- Terminal count, type, label, anchor, role, and association.
- Parameter metadata: name, value type, enum values, readonly state, export metadata, and default value for newly introduced fields.
- Measurement profile membership and inherited profile metadata: binding field, source point, label, unit, decimals, visibility default, and inherited item style.
- Measurement type metadata and platform group defaults.

### Instance-owned data

- Node identity, name, position, rotation, scale, layer, device index, topology node numbers, and compatible terminal voltage base values.
- Existing parameter values for parameters that still exist.
- Measurement group anchor, offset, layout, visibility, label/unit visibility, and manually overridden group style.
- User-overridden measurement item visibility, label, unit, decimals, and style.
- Manually added measurement groups and items.

## Node Reconciliation

1. Resolve the latest effective template for each node kind.
2. Reconcile stored parameter definitions:
   - Add new fields with the latest default value.
   - Preserve values for fields that still exist.
   - Remove fields deleted from the definition.
   - Replace stored parameter metadata with the latest normalized definitions.
3. Apply definition-owned visual parameters, size, and state metadata.
4. Rebuild terminals from the latest template while preserving node numbers and compatible voltage-base values by terminal index.
5. Leave nodes unchanged when their source template no longer exists.

The same pure node reconciliation operation is used by immediate definition saves and saved-model loading so the two paths cannot drift.

## Measurement Reconciliation

1. Generate the desired default measurement groups for each current node from the new measurement configuration.
2. Match generated groups and generated items by their deterministic IDs.
3. For existing generated groups:
   - Preserve group position, layout, visibility, and user overrides.
   - Update inherited group defaults only when the existing value still equals the previous default.
4. For existing generated items:
   - Update type, role, source point, and inherited profile metadata.
   - Preserve a field when it differs from the previous generated value, treating it as a user override.
5. Add newly defined generated groups/items.
6. Remove generated items deleted from the profile. Remove an empty generated group only when no manual items remain.
7. Preserve groups and items whose IDs identify them as manually created.
8. Remove terminal-bound generated groups when the terminal no longer exists, while retaining unrelated manual groups.

When loading a legacy model without an earlier configuration snapshot, deterministic generated IDs identify managed groups/items; instance presentation fields remain preserved while bindings and missing defaults are brought up to date.

## Save And Load Integration

- Component visual, state, parameter, and custom-component save flows reuse the unified node reconciliation operation and then reconcile measurements for affected nodes.
- Measurement configuration save reconciles all measurement instances on the open canvas before committing the new configuration.
- Saved model loading reconciles nodes first, then normalizes and reconciles measurements against the latest configuration.
- Any migration that changes the loaded model marks it as modified so the upgraded state can be saved explicitly.

## Error Handling

- Invalid component or measurement definitions continue to fail compliance validation before migration.
- Reconciliation is pure and deterministic; if no effective template or profile exists, it preserves existing instance data rather than deleting it blindly.
- Backend persistence failure does not roll back the already-applied local migration, matching current local-first save behavior.

## Verification

- Unit tests for node parameter, visual, terminal, and instance-value preservation.
- Unit tests for measurement add/update/delete behavior and manual override preservation.
- Integration tests for measurement configuration save and saved-model load migration.
- Production build and browser verification with an old device and old measurement configuration.
