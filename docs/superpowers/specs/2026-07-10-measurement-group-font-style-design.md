# Measurement Group Font Style Design

## Goal

Allow a measurement group to define a shared font color and font size while preserving optional per-measurement overrides.

## Style Precedence

The effective style for a measurement item is resolved in this order, with later values taking precedence:

1. Measurement type defaults.
2. Device measurement profile item override.
3. Measurement group `groupStyleOverride`.
4. Measurement item `styleOverride`.

A measurement item may override only one field. For example, an item-specific color still inherits the group font size.

## Data And Compatibility

The existing `MeasurementGroup.groupStyleOverride` and `MeasurementStyleOverride` structures store the values, so no project schema version change is required. Existing projects without group font settings continue to use measurement type and profile defaults. Existing item overrides remain authoritative.

## User Interface

Add group-level font color and font size controls to both measurement editing surfaces:

- The selected-device dynamic measurement property table.
- The measurement editor dialog summary.

The per-item color and font-size controls remain available and display the currently effective inherited value. Editing an item control creates or updates the item override.

## Rendering And Export

The shared resolver used by canvas rendering and frontend SVG export must include the group override. The server SVG resolver must use the same precedence so saved scheme SVG and explicit SVG export stay consistent.

## Validation And Tests

Font size is constrained to the existing 6 through 96 range at editing boundaries. Tests cover group inheritance, partial item override, frontend SVG output, server SVG output, and the presence of both group-level controls.
