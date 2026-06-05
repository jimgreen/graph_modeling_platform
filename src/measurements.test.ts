import { describe, expect, test } from "vitest";
import {
  DEFAULT_MEASUREMENT_CONFIG,
  createDefaultMeasurementGroupForNode,
  formatMeasurementDisplayValue,
  measurementGroupsForExistingNodes,
  normalizeMeasurementConfig,
  normalizeProjectMeasurements,
  removeMeasurementGroupsForNodeIds,
  resolveMeasurementItemDisplay
} from "./measurements";
import type { MeasurementRuntimeValue, ProjectMeasurementConfig } from "./measurements";
import type { ModelNode } from "./model";

const node = (id: string, kind = "ACLoad"): ModelNode => ({
  id,
  kind: kind as ModelNode["kind"],
  name: `${kind}-1`,
  nodeNumber: "",
  acTopologyNode: 0,
  dcTopologyNode: 0,
  position: { x: 0, y: 0 },
  size: { width: 100, height: 60 },
  rotation: 0,
  scale: 1,
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
      groups: [
        {
          id: "group-1",
          nodeId: "node-1",
          visible: true,
          anchor: "bottom",
          offset: { x: 0, y: 80 },
          layout: "vertical",
          items: [
            {
              id: "item-1",
              measurementTypeId: "activePower",
              sourcePoint: "plant.load.1.p",
              decimalsOverride: 2,
              unitOverride: "kW",
              styleOverride: { color: "#475569" }
            }
          ]
        }
      ]
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
});
