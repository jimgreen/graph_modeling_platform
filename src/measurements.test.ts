import { describe, expect, test } from "vitest";
import {
  DEFAULT_MEASUREMENT_CONFIG,
  createDefaultMeasurementGroupForNode,
  createDefaultMeasurementGroupsForNode,
  formatMeasurementDisplayValue,
  measurementFontScaleForNode,
  measurementOffsetScaleForNode,
  measurementGroupsForExistingNodes,
  measurementProfileItemsForNodePosition,
  normalizeMeasurementConfig,
  normalizeProjectMeasurements,
  reconcileProjectMeasurementsWithConfig,
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
  test("reconciles generated measurements while preserving instance and manual overrides", () => {
    const sourceNode = {
      ...node("sync-node", "sync-device"),
      terminals: [{ id: "t1", label: "端1", type: "ac" as const, anchor: { x: 0.5, y: 0 }, nodeNumber: "N2", vbase: "35" }]
    };
    const previousConfig = normalizeMeasurementConfig({
      groupDefaults: { backgroundColor: "#ffffff", borderColor: "#111111", borderStyle: "solid", borderWidth: 1 },
      measurementTypes: DEFAULT_MEASUREMENT_CONFIG.measurementTypes,
      deviceProfiles: [{
        deviceKind: "sync-device",
        items: [
          { measurementTypeId: "activePower", position: "device", associatedField: "p_old", labelOverride: "旧有功", unitOverride: "MW", decimalsOverride: 2, styleOverride: { color: "#111111" } },
          { measurementTypeId: "voltage", position: "t1", associatedField: "u_old" }
        ]
      }]
    });
    const nextConfig = normalizeMeasurementConfig({
      groupDefaults: { backgroundColor: "#eeeeee", borderColor: "#222222", borderStyle: "dashed", borderWidth: 2 },
      measurementTypes: DEFAULT_MEASUREMENT_CONFIG.measurementTypes,
      deviceProfiles: [{
        deviceKind: "sync-device",
        items: [
          { measurementTypeId: "activePower", position: "device", associatedField: "p_new", labelOverride: "新有功", unitOverride: "kW", decimalsOverride: 1, styleOverride: { color: "#dc2626" } },
          { measurementTypeId: "reactivePower", position: "device", associatedField: "q_new" }
        ]
      }]
    });
    const generated = createDefaultMeasurementGroupsForNode(sourceNode, previousConfig);
    const deviceGroup = generated.find((group) => !group.terminalId)!;
    const terminalGroup = generated.find((group) => group.terminalId === "t1")!;
    const manualItem = {
      id: "measurement-sync-node-activePower-mabc1234-z9x8",
      name: "手工量测",
      measurementTypeId: "activePower",
      sourcePoint: "sync-node.manual",
      visible: true
    };
    const measurements: ProjectMeasurementConfig = {
      version: 1,
      groups: [
        {
          ...deviceGroup,
          visible: false,
          offset: { x: 88, y: 99 },
          layout: "horizontal",
          borderColor: "#f59e0b",
          items: [
            { ...deviceGroup.items[0], labelOverride: "用户自定义有功" },
            manualItem
          ]
        },
        terminalGroup,
        {
          ...deviceGroup,
          id: "measurement-sync-node-group-mabc1234-z9x8",
          items: [manualItem]
        }
      ]
    };

    const reconciled = reconcileProjectMeasurementsWithConfig(
      measurements,
      [sourceNode],
      nextConfig,
      previousConfig
    );

    const nextDeviceGroup = reconciled.groups.find((group) => group.id === "measurement-sync-node")!;
    expect(nextDeviceGroup).toMatchObject({
      visible: false,
      offset: { x: 88, y: 99 },
      layout: "horizontal",
      backgroundColor: "#eeeeee",
      borderColor: "#f59e0b",
      borderStyle: "dashed",
      borderWidth: 2
    });
    expect(nextDeviceGroup.items.map((item) => item.measurementTypeId)).toEqual([
      "activePower",
      "reactivePower",
      "activePower"
    ]);
    expect(nextDeviceGroup.items[0]).toMatchObject({
      sourcePoint: "sync-node.p_new",
      labelOverride: "用户自定义有功",
      unitOverride: "kW",
      decimalsOverride: 1,
      styleOverride: { color: "#dc2626" }
    });
    expect(nextDeviceGroup.items[2]).toEqual(manualItem);
    expect(reconciled.groups.some((group) => group.id === terminalGroup.id)).toBe(false);
    expect(reconciled.groups.some((group) => group.id === "measurement-sync-node-group-mabc1234-z9x8")).toBe(true);
  });

  test("keeps manual terminal measurements after the terminal definition is removed", () => {
    const oldNode = {
      ...node("terminal-sync", "sync-device"),
      terminals: [
        { id: "t1", label: "端1", type: "ac" as const, anchor: { x: -0.5, y: 0 }, nodeNumber: "N1", vbase: "35" },
        { id: "t2", label: "端2", type: "ac" as const, anchor: { x: 0.5, y: 0 }, nodeNumber: "N2", vbase: "35" }
      ]
    };
    const nextNode = { ...oldNode, terminals: oldNode.terminals.slice(0, 1) };
    const previousConfig = normalizeMeasurementConfig({
      measurementTypes: DEFAULT_MEASUREMENT_CONFIG.measurementTypes,
      deviceProfiles: [{ deviceKind: "sync-device", items: [{ measurementTypeId: "voltage", position: "t2" }] }]
    });
    const nextConfig = normalizeMeasurementConfig({
      measurementTypes: DEFAULT_MEASUREMENT_CONFIG.measurementTypes,
      deviceProfiles: [{ deviceKind: "sync-device", items: [] }]
    });
    const group = createDefaultMeasurementGroupsForNode(oldNode, previousConfig)[0];
    const manualItem = {
      id: "measurement-terminal-sync-t2-voltage-mabc1234-z9x8",
      measurementTypeId: "voltage",
      sourcePoint: "terminal-sync.t2.manual"
    };
    const measurements = {
      version: 1 as const,
      groups: [{ ...group, items: [...group.items, manualItem] }]
    };

    const reconciled = reconcileProjectMeasurementsWithConfig(measurements, [nextNode], nextConfig, previousConfig);

    expect(reconciled.groups).toHaveLength(1);
    expect(reconciled.groups[0].terminalId).toBe("t2");
    expect(reconciled.groups[0].items).toEqual([manualItem]);
  });

  test("returns the original project measurements when reconciliation changes nothing", () => {
    const sourceNode = node("same-node", "ac-load");
    const measurements = {
      version: 1 as const,
      groups: createDefaultMeasurementGroupsForNode(sourceNode, DEFAULT_MEASUREMENT_CONFIG)
    };

    expect(reconcileProjectMeasurementsWithConfig(
      measurements,
      [sourceNode],
      DEFAULT_MEASUREMENT_CONFIG,
      DEFAULT_MEASUREMENT_CONFIG
    )).toBe(measurements);
  });

  test("normalizes platform measurement types and keeps default active power settings", () => {
    const config = normalizeMeasurementConfig({
      measurementTypes: [{ id: "activePower", key: "p", name: "有功功率", shortLabel: "P" }],
      deviceProfiles: [{ deviceKind: "ac-load", items: [{ measurementTypeId: "activePower" }] }]
    });

    expect(config.measurementTypes.find((item) => item.id === "activePower")).toMatchObject({
      key: "p",
      defaultUnit: "MW",
      defaultDecimals: 3,
      defaultFontSize: 14,
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
      visible: true,
      backgroundColor: "transparent",
      borderColor: "#64748b",
      borderStyle: "none",
      borderWidth: 0
    });
    expect(group?.items.map((item) => item.measurementTypeId)).toEqual(["activePower", "reactivePower", "voltage", "current"]);
    expect(group?.items[0].sourcePoint).toBe("node-1.activePower");
  });

  test("applies configured defaults only when creating new measurement groups", () => {
    const config = normalizeMeasurementConfig({
      measurementTypes: DEFAULT_MEASUREMENT_CONFIG.measurementTypes,
      deviceProfiles: DEFAULT_MEASUREMENT_CONFIG.deviceProfiles,
      groupDefaults: {
        backgroundColor: "#fef3c7",
        borderColor: "#d97706",
        borderWidth: 3,
        borderStyle: "dashed"
      }
    });

    expect(config.groupDefaults).toEqual({
      backgroundColor: "#fef3c7",
      borderColor: "#d97706",
      borderWidth: 3,
      borderStyle: "dashed"
    });
    expect(createDefaultMeasurementGroupForNode(node("node-default-style"), config)).toMatchObject(config.groupDefaults);
  });

  test("shows an added device measurement unless the profile explicitly hides it", () => {
    const config = normalizeMeasurementConfig({
      measurementTypes: DEFAULT_MEASUREMENT_CONFIG.measurementTypes,
      deviceProfiles: [{ deviceKind: "ac-breaker", items: [{ measurementTypeId: "current" }] }]
    });
    const breaker = node("box-breaker-1", "ac-box-breaker");

    const group = createDefaultMeasurementGroupForNode(breaker, config);
    const item = group?.items[0];

    expect(item?.visible).toBe(true);
    expect(item && group ? resolveMeasurementItemDisplay({ config, node: breaker, group, item }).visible : false).toBe(true);
  });

  test("keeps explicitly hidden device profile measurements hidden", () => {
    const config = normalizeMeasurementConfig({
      measurementTypes: DEFAULT_MEASUREMENT_CONFIG.measurementTypes,
      deviceProfiles: [{ deviceKind: "ac-breaker", items: [{ measurementTypeId: "current", defaultVisible: false }] }]
    });
    const breaker = node("box-breaker-2", "ac-box-breaker");

    const group = createDefaultMeasurementGroupForNode(breaker, config);
    const item = group?.items[0];

    expect(item?.visible).toBe(false);
    expect(item && group ? resolveMeasurementItemDisplay({ config, node: breaker, group, item }).visible : true).toBe(false);
  });

  test("keeps legacy unspecified profile items on the device measurement group for multi-terminal devices", () => {
    const threeTerminalNode: ModelNode = {
      ...node("transformer-1", "ac-transformer"),
      terminals: [
        { id: "t1", label: "高压", type: "ac", anchor: { x: -0.5, y: 0 }, nodeNumber: "" },
        { id: "t2", label: "中压", type: "ac", anchor: { x: 0.5, y: 0 }, nodeNumber: "" },
        { id: "t3", label: "低压", type: "ac", anchor: { x: 0, y: 0.5 }, nodeNumber: "" }
      ]
    };

    const groups = createDefaultMeasurementGroupsForNode(threeTerminalNode, DEFAULT_MEASUREMENT_CONFIG);

    expect(groups).toHaveLength(1);
    expect(groups[0].terminalId).toBeUndefined();
    expect(groups[0].id).toBe("measurement-transformer-1");
    expect(groups[0].items[0].sourcePoint).toBe("transformer-1.activePower");
  });

  test("keeps device profile row names and measurement positions", () => {
    const config = normalizeMeasurementConfig({
      measurementTypes: DEFAULT_MEASUREMENT_CONFIG.measurementTypes,
      deviceProfiles: [{
        deviceKind: "ac-transformer",
        items: [
          { name: "整机状态", measurementTypeId: "status", position: "device", associatedField: "device.status" },
          { name: "高压侧电压", measurementTypeId: "voltage", position: "t1" }
        ]
      }]
    });

    expect(config.deviceProfiles.find((item) => item.deviceKind === "ac-transformer")?.items).toEqual([
      expect.objectContaining({ name: "整机状态", measurementTypeId: "status", position: "device", associatedField: "device.status" }),
      expect.objectContaining({ name: "高压侧电压", measurementTypeId: "voltage", position: "t1" })
    ]);
  });

  test("creates default measurement groups by device profile row position", () => {
    const threeTerminalNode: ModelNode = {
      ...node("transformer-2", "ac-transformer"),
      terminals: [
        { id: "t1", label: "高压", type: "ac", anchor: { x: -0.5, y: 0 }, nodeNumber: "" },
        { id: "t2", label: "中压", type: "ac", anchor: { x: 0.5, y: 0 }, nodeNumber: "" },
        { id: "t3", label: "低压", type: "ac", anchor: { x: 0, y: 0.5 }, nodeNumber: "" }
      ]
    };
    const config = normalizeMeasurementConfig({
      measurementTypes: DEFAULT_MEASUREMENT_CONFIG.measurementTypes,
      deviceProfiles: [{
        deviceKind: "ac-transformer",
        items: [
          { name: "整机状态", measurementTypeId: "status", position: "device" },
          { name: "高压P", measurementTypeId: "activePower", position: "t1" },
          { name: "低压U", measurementTypeId: "voltage", position: "t3" }
        ]
      }]
    });

    const groups = createDefaultMeasurementGroupsForNode(threeTerminalNode, config);

    expect(groups.map((group) => group.terminalId)).toEqual([undefined, "t1", "t3"]);
    expect(groups[0].items).toEqual([
      expect.objectContaining({
        measurementTypeId: "status",
        sourcePoint: "transformer-2.status",
        labelOverride: "整机状态"
      })
    ]);
    expect(groups[1].items).toEqual([
      expect.objectContaining({
        measurementTypeId: "activePower",
        sourcePoint: "transformer-2.t1.activePower",
        labelOverride: "高压P"
      })
    ]);
    expect(groups[2].items).toEqual([
      expect.objectContaining({
        measurementTypeId: "voltage",
        sourcePoint: "transformer-2.t3.voltage",
        labelOverride: "低压U"
      })
    ]);
  });

  test("uses the associated field as the generated measurement source point key", () => {
    const config = normalizeMeasurementConfig({
      measurementTypes: DEFAULT_MEASUREMENT_CONFIG.measurementTypes,
      deviceProfiles: [{
        deviceKind: "ac-load",
        items: [
          { name: "负荷有功", measurementTypeId: "activePower", position: "device", associatedField: "load.p" }
        ]
      }]
    });

    const group = createDefaultMeasurementGroupForNode(node("node-2", "ac-load"), config);

    expect(group?.items[0]).toMatchObject({
      measurementTypeId: "activePower",
      sourcePoint: "node-2.load.p",
      labelOverride: "负荷有功"
    });
  });

  test("filters profile items strictly by device or terminal measurement position", () => {
    const threeTerminalNode: ModelNode = {
      ...node("transformer-3", "ac-transformer"),
      terminals: [
        { id: "t1", label: "高压", type: "ac", anchor: { x: -0.5, y: 0 }, nodeNumber: "" },
        { id: "t2", label: "中压", type: "ac", anchor: { x: 0.5, y: 0 }, nodeNumber: "" },
        { id: "t3", label: "低压", type: "ac", anchor: { x: 0, y: 0.5 }, nodeNumber: "" }
      ]
    };
    const config = normalizeMeasurementConfig({
      measurementTypes: DEFAULT_MEASUREMENT_CONFIG.measurementTypes,
      deviceProfiles: [{
        deviceKind: "ac-transformer",
        items: [
          { name: "整机状态", measurementTypeId: "status", position: "device" },
          { name: "未指定电压", measurementTypeId: "voltage" },
          { name: "高压P", measurementTypeId: "activePower", position: "t1" },
          { name: "中压I", measurementTypeId: "current", position: "t2" }
        ]
      }]
    });

    expect(measurementProfileItemsForNodePosition(threeTerminalNode, config).map((item) => item.name)).toEqual(["整机状态", "未指定电压"]);
    expect(measurementProfileItemsForNodePosition(threeTerminalNode, config, "t1").map((item) => item.name)).toEqual(["高压P"]);
    expect(measurementProfileItemsForNodePosition(threeTerminalNode, config, "t2").map((item) => item.name)).toEqual(["中压I"]);
    expect(measurementProfileItemsForNodePosition(threeTerminalNode, config, "t3").map((item) => item.name)).toEqual([]);
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

  test("uses component library measurement profiles for concrete device templates", () => {
    const dcLineNode = node("line-1", "dc-routable-line");
    dcLineNode.params = { component_type: "DCBranch" };
    dcLineNode.terminals = [
      { id: "t1", label: "首端", type: "dc", anchor: { x: -0.5, y: 0 }, nodeNumber: "" },
      { id: "t2", label: "末端", type: "dc", anchor: { x: 0.5, y: 0 }, nodeNumber: "" }
    ];
    const config = normalizeMeasurementConfig({
      measurementTypes: DEFAULT_MEASUREMENT_CONFIG.measurementTypes,
      deviceProfiles: [{
        deviceKind: "DCBranch",
        items: [
          { name: "线路P", measurementTypeId: "activePower", position: "device" },
          { name: "首端U", measurementTypeId: "voltage", position: "t1" }
        ]
      }]
    });

    expect(measurementProfileItemsForNodePosition(dcLineNode, config).map((item) => item.name)).toEqual(["线路P"]);
    expect(measurementProfileItemsForNodePosition(dcLineNode, config, "t1").map((item) => item.name)).toEqual(["首端U"]);
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

  test("applies measurement group font style when an item has no override", () => {
    const config = normalizeMeasurementConfig(DEFAULT_MEASUREMENT_CONFIG);
    const group: ProjectMeasurementConfig["groups"][number] = {
      id: "group-style",
      nodeId: "node-1",
      visible: true,
      anchor: "bottom",
      offset: { x: 0, y: 80 },
      layout: "vertical",
      groupStyleOverride: { color: "#2563eb", fontSize: 18 },
      items: [{
        id: "item-group-style",
        measurementTypeId: "activePower",
        sourcePoint: "plant.load.1.p"
      }]
    };

    const display = resolveMeasurementItemDisplay({
      config,
      node: node("node-1", "ac-load"),
      group,
      item: group.items[0]
    });

    expect(display).toMatchObject({ color: "#2563eb", fontSize: 18 });
  });

  test("lets an item override one group font field while inheriting the other", () => {
    const config = normalizeMeasurementConfig(DEFAULT_MEASUREMENT_CONFIG);
    const group: ProjectMeasurementConfig["groups"][number] = {
      id: "group-partial-style",
      nodeId: "node-1",
      visible: true,
      anchor: "bottom",
      offset: { x: 0, y: 80 },
      layout: "vertical",
      groupStyleOverride: { color: "#2563eb", fontSize: 18 },
      items: [{
        id: "item-partial-style",
        measurementTypeId: "activePower",
        sourcePoint: "plant.load.1.p",
        styleOverride: { color: "#dc2626" }
      }]
    };

    const display = resolveMeasurementItemDisplay({
      config,
      node: node("node-1", "ac-load"),
      group,
      item: group.items[0]
    });

    expect(display).toMatchObject({ color: "#dc2626", fontSize: 18 });
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

  test("uses a transparent borderless box when legacy measurement groups omit box styles", () => {
    const normalized = normalizeProjectMeasurements(
      {
        version: 1,
        groups: [{
          id: "group-default-box",
          nodeId: "node-1",
          visible: true,
          anchor: "bottom",
          offset: { x: 0, y: 70 },
          layout: "vertical",
          items: []
        }]
      },
      [node("node-1")]
    );

    expect(normalized.groups[0]).toMatchObject({
      backgroundColor: "transparent",
      borderColor: "#64748b",
      borderStyle: "none",
      borderWidth: 0
    });
  });

  test("keeps editable measurement item names in project measurement groups", () => {
    const normalized = normalizeProjectMeasurements(
      {
        version: 1,
        groups: [{
          id: "group-names",
          nodeId: "node-1",
          visible: true,
          anchor: "bottom",
          offset: { x: 0, y: 70 },
          layout: "vertical",
          items: [{
            id: "item-p",
            name: "进线有功",
            measurementTypeId: "activePower",
            sourcePoint: "node-1.activePower"
          }]
        }]
      },
      [node("node-1")]
    );

    expect(normalized.groups[0].items[0]).toMatchObject({
      name: "进线有功",
      measurementTypeId: "activePower"
    });
  });

  test("keeps measurement group box style settings with bounded border width", () => {
    const normalized = normalizeProjectMeasurements(
      {
        version: 1,
        groups: [
          {
            id: "group-style",
            nodeId: "node-1",
            visible: true,
            backgroundColor: "#f8fafc",
            borderColor: "#64748b",
            borderStyle: "dashed",
            borderWidth: 16,
            anchor: "bottom",
            offset: { x: 0, y: 70 },
            layout: "vertical",
            items: []
          },
          {
            id: "group-hidden-box",
            nodeId: "node-1",
            visible: true,
            backgroundColor: "transparent",
            borderStyle: "none",
            borderWidth: 0,
            anchor: "bottom",
            offset: { x: 0, y: 90 },
            layout: "vertical",
            items: []
          }
        ]
      },
      [node("node-1")]
    );

    expect(normalized.groups[0]).toMatchObject({
      backgroundColor: "#f8fafc",
      borderColor: "#64748b",
      borderStyle: "dashed",
      borderWidth: 12
    });
    expect(normalized.groups[1]).toMatchObject({
      backgroundColor: "transparent",
      borderStyle: "none",
      borderWidth: 0
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

  test("filters groups by existing node ids while applying default box styles", () => {
    const group = { id: "group-1", nodeId: "node-1", visible: true, anchor: "bottom" as const, offset: { x: 0, y: 70 }, layout: "vertical" as const, items: [] };
    expect(measurementGroupsForExistingNodes([group], new Set(["node-1"]))[0]).toMatchObject({
      ...group,
      backgroundColor: "transparent",
      borderColor: "#64748b",
      borderStyle: "none",
      borderWidth: 0
    });
    expect(measurementGroupsForExistingNodes([group], new Set(["node-2"]))).toEqual([]);
  });
});
