# Live Measurement Value DOM Design

## Goal

Allow browser scripts to locate and update only the live measurement value while keeping each measurement row and group as one canvas interaction unit.

## DOM Structure

Replace the live canvas row's combined text node with a row group containing separate label, value, and unit text nodes:

```xml
<g class="measurement-item mi" mid="item-1" mt="current" mf="device.current">
  <text class="measurement-label ml">I</text>
  <text id="mv-item-1" class="measurement-value mv">--</text>
  <text class="measurement-unit mu">A</text>
</g>
```

The stable value ID is emitted only for the normal live canvas. Drag preview markup uses the same split classes but omits the ID so temporary preview DOM cannot duplicate live IDs.

## Layout

Measurement render metrics retain the combined row text for box sizing and add `labelText`, `valueText`, and `unitText`. Label, value, and unit positions use the same width estimate and gap rules as exported SVG so the visual result remains unchanged.

## Interaction And Compatibility

Pointer handling remains on the parent measurement group, so selecting and dragging any child still moves the complete measurement group. Existing item metadata remains on the row group for compatibility, and compact `mid`, `mt`, and `mf` attributes are added for script queries. Formal frontend and server SVG exports are unchanged because they already split label, value, and unit.

## Tests

Tests cover split render metrics, split live React elements with a stable value ID, split drag-preview markup without stable IDs, and the absence of combined row text nodes.
