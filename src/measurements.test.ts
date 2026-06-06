import { describe, expect, test } from "vitest";
import {
  DEFAULT_MEASUREMENT_CONFIG,
  createDefaultMeasurementGroupForNode,
  formatMeasurementDisplayValue,
  measurementFontScaleForNode,
  measurementOffsetScaleForNode,
  measurementGroupsForExistingNodes,
  normalizeMeasurementConfig,
  normalizeProjectMeasurements,
  resolveMeasurementItemDisplay
} from "./measurements";
import type { MeasurementRuntimeValue, ProjectMeasurementConfig } from "./measurements";
import type { ModelNode } from "./model";

const node = (id: string, kind = "ac-load"): ModelNode => ({
  id,
  kind,
  name: `${kind}-1`,
  layerId: "layer-default",
  nodeNumber: "N1",
  acTopologyNode: 0,
  dcTopologyNode: 0,
  position: { x: 100, y: 120 },
  size: { width: 150, height: 90 },
  rotation: 0,
  scale: 1,
  scaleX: 1,
  scaleY: 1,
  terminals: [],
  params: {}
});

describe("measurement domain", () => {
  test("normalizes platform measurement types and keeps default active power settings", () => {
    const config = normalizeMeasurementConfig({
      measurementTypes: [{ id: "activePower", key: "p", name: "有功功率", shortLabel: "P" }],
      deviceProfiles: [{ deviceKind: "ac-load", items: [{ measurementTypeId: "activePower" }] }]
    });

    expect(config.measurementTypes.find((item) => item.id === "activePower")).toMatchObject({
      key: "p",
      defaultUnit: "MW",
      defaultDecimals: 3,
      defaultVisible: true
    });
    expect(config.deviceProfiles.find((item) => item.deviceKind === "ac-load")?.items).toHaveLength(1);
  });

  test("creates a default device measurement group from the device type profile", () => {
    const group = createDefaultMeasurementGroupForNode(node("node-1", "ac-load"), DEFAULT_MEASUREMENT_CONFIG);

    expect(group).toMatchObject({
      nodeId: "node-1",
      anchor: "bottom",
      layout: "vertical",
      visible: true
    });
    expect(group?.items.map((item) => item.measurementTypeId)).toEqual(["activePower", "reactivePower", "voltage", "current"]);
    expect(group?.items[0].sourcePoint).toBe("node-1.activePower");
  });

  test("keeps platform default device profiles when persisted config has none", () => {
    const config = normalizeMeasurementConfig({
      measurementTypes: DEFAULT_MEASUREMENT_CONFIG.measurementTypes,
      deviceProfiles: []
    });

    expect(config.deviceProfiles.find((item) => item.deviceKind === "dc-source")?.items.map((item) => item.measurementTypeId)).toEqual([
      "activePower",
      "voltage",
      "current"
    ]);
  });

  test("creates default measurements for specialized source devices through their generic profile", () => {
    const group = createDefaultMeasurementGroupForNode(node("node-1", "dc-pv-source"), DEFAULT_MEASUREMENT_CONFIG);

    expect(group?.items.map((item) => item.measurementTypeId)).toEqual(["activePower", "voltage", "current"]);
    expect(group?.items[0].sourcePoint).toBe("node-1.activePower");
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
          styleOverride: { color: "#475569", fontSize: 14 }
        }]
      }]
    };

    const display = resolveMeasurementItemDisplay({
      config,
      node: node("node-1", "ac-load"),
      group: group.groups[0],
      item: group.groups[0].items[0]
    });

    expect(display).toMatchObject({
      label: "P",
      unit: "kW",
      decimals: 2,
      color: "#475569",
      fontSize: 14,
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
    expect(formatMeasurementDisplayValue(undefined, 1, "")).toBe("--");
  });

  test("keeps measurement group label and unit visibility flags", () => {
    const normalized = normalizeProjectMeasurements(
      {
        version: 1,
        groups: [{
          id: "group-visibility",
          nodeId: "node-1",
          visible: true,
          labelVisible: false,
          unitVisible: false,
          anchor: "bottom",
          offset: { x: 0, y: 70 },
          layout: "vertical",
          items: []
        }]
      },
      [node("node-1")]
    );

    expect(normalized.groups[0]).toMatchObject({
      labelVisible: false,
      unitVisible: false
    });
  });

  test("scales measurement font size with the owning device scale without text deformation", () => {
    expect(measurementFontScaleForNode({ ...node("scaled-node"), scaleX: 4, scaleY: 1 })).toBeCloseTo(2);
    expect(measurementFontScaleForNode({ ...node("mirrored-node"), scaleX: -2.25, scaleY: 1 })).toBeCloseTo(1.5);
  });

  test("scales measurement group offset with the owning device axes", () => {
    expect(measurementOffsetScaleForNode({ ...node("scaled-node"), scaleX: 2, scaleY: 0.5 })).toEqual({ x: 2, y: 0.5 });
    expect(measurementOffsetScaleForNode({ ...node("mirrored-node"), scaleX: -3, scaleY: -1.5 })).toEqual({ x: 3, y: 1.5 });
  });

  test("drops measurement groups whose owning node no longer exists", () => {
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
