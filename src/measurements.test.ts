import { describe, expect, test } from "vitest";
import {
  DEFAULT_MEASUREMENT_CONFIG,
  buildMeasurementProfilePositionDefinitions,
  createDefaultMeasurementGroupForNode,
  createDefaultMeasurementGroupsForNode,
  formatMeasurementDisplayValue,
  measurementFormatValueText,
  measurementFontScaleForNode,
  measurementOffsetScaleForNode,
  measurementPadTextToVisualWidth,
  measurementVisualWidth,
  materializeNewMeasurementDefinitionFields,
  MEASUREMENT_INTER_COLUMN_GAP,
  MEASUREMENT_VALUE_DECIMAL_WIDTH,
  MEASUREMENT_VALUE_DECIMALS,
  MEASUREMENT_VALUE_INTEGER_WIDTH,
  MEASUREMENT_VALUE_TOTAL_WIDTH,
  resolveMeasurementItemBindingMetadata,
  measurementGroupsForExistingNodes,
  measurementProfileItemsForNodePosition,
  normalizeMeasurementConfig,
  normalizeProjectMeasurements,
  reconcileContainerMeasurementGroups,
  reconcileProjectMeasurementsWithConfig,
  removeContainerMeasurementGroup,
  resolveMeasurementItemDisplay,
  syncContainerMeasurementGroup,
  upsertMeasurementGroups
} from "./measurements";
import type { MeasurementRuntimeValue, ProjectMeasurementConfig } from "./measurements";
import { DEVICE_LIBRARY, assignPermanentDeviceIndex, createDefaultNode, getTemplateParameterDefinitions } from "./model";
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
  test("keeps tap-position and endpoint measurement profiles in legacy measurement configurations", () => {
    const normalized = normalizeMeasurementConfig({
      measurementTypes: [
        { id: "activePower", key: "p", name: "有功功率" },
        { id: "reactivePower", key: "q", name: "无功功率" },
        { id: "voltage", key: "u", name: "电压" },
        { id: "current", key: "i", name: "电流" },
        { id: "status", key: "status", name: "状态" }
      ]
    });
    expect(normalized.measurementTypes.find((type) => type.id === "tapPosition")).toMatchObject({
      key: "tap",
      name: "分接头档位",
      defaultDecimals: 0
    });

    const profileFields = (kind: string) => normalized.deviceProfiles.find((profile) => profile.deviceKind === kind)
      ?.items.map((item) => item.associatedField) ?? [];
    expect(profileFields("ac-line")).toEqual(["i_p", "i_q", "i_u", "i_i", "j_p", "j_q", "j_u", "j_i"]);
    expect(profileFields("dc-line")).toEqual(["i_p", "i_u", "i_i", "j_p", "j_u", "j_i"]);
    expect(profileFields("ac-switch")).toEqual(["status", "p", "q", "u", "i"]);
    expect(profileFields("dc-switch")).toEqual(["status", "p", "u", "i"]);
    expect(profileFields("ac-transformer")).toEqual([
      "i_p", "i_q", "i_u", "i_i", "j_p", "j_q", "j_u", "j_i", "tap"
    ]);

    const legacyBranch = normalizeMeasurementConfig({
      measurementTypes: normalized.measurementTypes,
      deviceProfiles: [{
        deviceKind: "ac-line",
        items: [
          { measurementTypeId: "activePower", associatedField: "p" },
          { measurementTypeId: "reactivePower", associatedField: "q" },
          { measurementTypeId: "current", associatedField: "i" }
        ]
      }]
    });
    expect(legacyBranch.deviceProfiles.find((profile) => profile.deviceKind === "ac-line")
      ?.items.map((item) => item.associatedField)).toEqual([
      "i_p", "i_q", "i_u", "i_i", "j_p", "j_q", "j_u", "j_i"
    ]);
  });

  test("migrates legacy SOC measurement definitions and project bindings", () => {
    const config = normalizeMeasurementConfig({
      measurementTypes: [{ id: "state_of_charge", key: "stateOfCharge", name: "SOC" }],
      deviceProfiles: [{
        deviceKind: "ac-storage",
        items: [{ measurementTypeId: "stateOfCharge", associatedField: "state_of_charge" }]
      }]
    });
    expect(config.measurementTypes.find((item) => item.id === "soc")).toMatchObject({ key: "soc" });
    expect(config.deviceProfiles.find((item) => item.deviceKind === "ac-storage")?.items[0]).toMatchObject({
      measurementTypeId: "soc",
      associatedField: "soc"
    });

    const storage = node("legacy-storage-soc", "ac-storage");
    const project = normalizeProjectMeasurements({
      version: 1,
      groups: [{
        id: "custom-soc-group",
        nodeId: storage.id,
        visible: true,
        anchor: "bottom",
        offset: { x: 0, y: 70 },
        layout: "vertical",
        items: [{
          id: "legacy-soc-item",
          measurementTypeId: "state_of_charge",
          sourcePoint: `${storage.id}.stateOfCharge`
        }]
      }]
    }, [storage]);
    expect(project.groups[0].items[0]).toMatchObject({
      measurementTypeId: "soc",
      sourcePoint: `${storage.id}.soc`
    });
  });

  test("binds electric-hydrogen coupling measurements to associated endpoint fields", () => {
    for (const kind of ["ac-electrolyzer", "dc-electrolyzer", "ac-fuel-cell", "dc-fuel-cell"] as const) {
      const profile = DEFAULT_MEASUREMENT_CONFIG.deviceProfiles.find((candidate) => candidate.deviceKind === kind);
      expect(profile?.items, kind).toEqual([
        expect.objectContaining({ measurementTypeId: "activePower", position: "t1", associatedField: "p" }),
        expect.objectContaining({ measurementTypeId: "voltage", position: "t1", associatedField: "u" }),
        expect.objectContaining({ measurementTypeId: "flow", position: "t2", associatedField: "flow", unitOverride: "Nm3/h" })
      ]);

      const node = assignPermanentDeviceIndex(createDefaultNode(kind, { x: 100, y: 120 }), {}).node;
      const groups = createDefaultMeasurementGroupsForNode(node, DEFAULT_MEASUREMENT_CONFIG);
      expect(groups.map((group) => group.id)).toEqual([`measurement-${node.id}-t1`, `measurement-${node.id}-t2`]);
      expect(groups[0].items.map((item) => item.sourcePoint)).toEqual([`${node.id}.t1.p`, `${node.id}.t1.u`]);
      expect(groups[1].items.map((item) => item.sourcePoint)).toEqual([`${node.id}.t2.flow`]);
    }
  });

  test("offers runtime measurement fields on coupling-associated endpoints", () => {
    const template = DEVICE_LIBRARY.find((candidate) => candidate.kind === "ac-electrolyzer")!;
    const positions = buildMeasurementProfilePositionDefinitions({ source: template, libraryTemplates: DEVICE_LIBRARY });
    const fields = (terminalId: string) => positions.find((position) => position.value === terminalId)
      ?.parameterDefinitions.map((definition) => definition.enName) ?? [];

    expect(fields("device")).not.toEqual(expect.arrayContaining(["p", "u", "flow"]));
    expect(fields("t1")).toEqual(expect.arrayContaining(["p", "q", "u", "i"]));
    expect(fields("t2")).toEqual(expect.arrayContaining(["pressure", "flow"]));
  });

  test("binds AC compensator measurements to canonical SVG runtime fields", () => {
    const expectedItems = {
      "ac-capacitor": [
        { measurementTypeId: "reactivePower", associatedField: "q" },
        { measurementTypeId: "current", associatedField: "current" }
      ],
      "ac-reactor": [
        { measurementTypeId: "reactivePower", associatedField: "q" },
        { measurementTypeId: "current", associatedField: "current" }
      ],
      "ac-series-capacitor": [
        { measurementTypeId: "activePower", associatedField: "p" },
        { measurementTypeId: "reactivePower", associatedField: "q" },
        { measurementTypeId: "current", associatedField: "current" }
      ],
      "ac-series-reactor": [
        { measurementTypeId: "activePower", associatedField: "p" },
        { measurementTypeId: "reactivePower", associatedField: "q" },
        { measurementTypeId: "current", associatedField: "current" }
      ]
    } as const;

    for (const [kind, items] of Object.entries(expectedItems)) {
      expect(DEFAULT_MEASUREMENT_CONFIG.deviceProfiles.find((profile) => profile.deviceKind === kind)?.items).toEqual(items);
      const group = createDefaultMeasurementGroupForNode(node(`${kind}-node`, kind), DEFAULT_MEASUREMENT_CONFIG);
      expect(group?.items.map((item) => ({ measurementTypeId: item.measurementTypeId, sourcePoint: item.sourcePoint }))).toEqual(
        items.map((item) => ({ measurementTypeId: item.measurementTypeId, sourcePoint: `${kind}-node.${item.associatedField}` }))
      );
    }
  });

  test("normalizes legacy gas quantity field names while retaining the measurement type id", () => {
    const config = normalizeMeasurementConfig({
      measurementTypes: [{
        id: "gasQuantity",
        key: "gasquantity",
        name: "储气量",
        defaultUnit: "Nm3"
      }],
      deviceProfiles: [{
        deviceKind: "hydrogen-tank",
        items: [{ measurementTypeId: "gasQuantity", associatedField: "gasQuantity" }]
      }]
    });
    expect(config.measurementTypes.find((item) => item.id === "gasQuantity")).toMatchObject({
      id: "gasQuantity",
      key: "gas_quantity"
    });
    expect(config.deviceProfiles.find((profile) => profile.deviceKind === "hydrogen-tank")?.items).toEqual(
      expect.arrayContaining([expect.objectContaining({
        measurementTypeId: "gasQuantity",
        associatedField: "gas_quantity"
      })])
    );

    const tank = node("tank-legacy-field", "hydrogen-tank");
    const measurements = normalizeProjectMeasurements({
      version: 1,
      groups: [{
        id: "custom-measurement-group",
        nodeId: tank.id,
        visible: true,
        anchor: "bottom",
        offset: { x: 0, y: 70 },
        layout: "vertical",
        items: [{
          id: "gas-item",
          measurementTypeId: "gasQuantity",
          sourcePoint: `${tank.id}.gasquantity`
        }]
      }]
    }, [tank]);
    expect(measurements.groups[0].items[0].sourcePoint).toBe(`${tank.id}.gas_quantity`);
  });
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
      defaultFontSize: 12,
      defaultVisible: true
    });
    expect(config.deviceProfiles.find((item) => item.deviceKind === "ac-load")?.items).toHaveLength(1);
  });

  test("uses soc instead of liquid level for AC and DC storage measurements", () => {
    expect(DEFAULT_MEASUREMENT_CONFIG.measurementTypes.find((item) => item.id === "soc")).toMatchObject({
      key: "soc",
      name: "soc",
      shortLabel: "soc",
      defaultUnit: "%",
      valueType: "number",
      defaultDecimals: 1,
      defaultVisible: true
    });

    expect(DEFAULT_MEASUREMENT_CONFIG.deviceProfiles.find((item) => item.deviceKind === "ac-storage")?.items.map((item) => item.measurementTypeId)).toEqual([
      "activePower",
      "reactivePower",
      "voltage",
      "soc"
    ]);
    expect(DEFAULT_MEASUREMENT_CONFIG.deviceProfiles.find((item) => item.deviceKind === "dc-storage")?.items.map((item) => item.measurementTypeId)).toEqual([
      "activePower",
      "voltage",
      "current",
      "soc"
    ]);

    const acStorageGroup = createDefaultMeasurementGroupForNode(node("ac-storage-node", "ac-storage"), DEFAULT_MEASUREMENT_CONFIG);
    const dcStorageGroup = createDefaultMeasurementGroupForNode(node("dc-storage-node", "dc-storage"), DEFAULT_MEASUREMENT_CONFIG);
    expect(acStorageGroup?.items.at(-1)).toMatchObject({ measurementTypeId: "soc", sourcePoint: "ac-storage-node.soc" });
    expect(dcStorageGroup?.items.at(-1)).toMatchObject({ measurementTypeId: "soc", sourcePoint: "dc-storage-node.soc" });

    expect(DEFAULT_MEASUREMENT_CONFIG.deviceProfiles.find((item) => item.deviceKind === "thermal-storage-tank")?.items.map((item) => item.measurementTypeId)).toContain("level");
  });

  test("defines pressure, flow, gas quantity, and soc measurements for hydrogen tanks", () => {
    expect(DEFAULT_MEASUREMENT_CONFIG.measurementTypes.find((item) => item.id === "gasQuantity")).toMatchObject({
      key: "gas_quantity",
      name: "储气量",
      shortLabel: "储气量",
      defaultUnit: "Nm3",
      valueType: "number",
      defaultDecimals: 2,
      defaultVisible: true
    });

    for (const kind of ["hydrogen-tank", "hydrogen-tank-horizontal", "hydrogen-tank-container"] as const) {
      const profile = DEFAULT_MEASUREMENT_CONFIG.deviceProfiles.find((item) => item.deviceKind === kind);
      const template = DEVICE_LIBRARY.find((item) => item.kind === kind)!;
      const parameterNames = new Set(getTemplateParameterDefinitions(template).map((definition) => definition.enName));
      expect(profile?.items).toEqual([
        expect.objectContaining({ measurementTypeId: "pressure", associatedField: "pressure", unitOverride: "MPa" }),
        expect.objectContaining({ measurementTypeId: "flow", associatedField: "flow", unitOverride: "Nm3/h" }),
        expect.objectContaining({ measurementTypeId: "gasQuantity", associatedField: "gas_quantity", unitOverride: "Nm3" }),
        expect.objectContaining({ measurementTypeId: "soc", associatedField: "soc", unitOverride: "%" })
      ]);
      expect(profile?.items.every((item) => !("labelOverride" in item))).toBe(true);

      const group = createDefaultMeasurementGroupForNode(node(`${kind}-node`, kind), DEFAULT_MEASUREMENT_CONFIG);
      expect(group?.items).toEqual([
        expect.objectContaining({ measurementTypeId: "pressure", sourcePoint: `${kind}-node.pressure`, labelOverride: undefined, unitOverride: "MPa" }),
        expect.objectContaining({ measurementTypeId: "flow", sourcePoint: `${kind}-node.flow`, labelOverride: undefined, unitOverride: "Nm3/h" }),
        expect.objectContaining({ measurementTypeId: "gasQuantity", sourcePoint: `${kind}-node.gas_quantity`, labelOverride: undefined, unitOverride: "Nm3" }),
        expect.objectContaining({ measurementTypeId: "soc", sourcePoint: `${kind}-node.soc`, labelOverride: undefined, unitOverride: "%" })
      ]);
      expect(profile?.items.map((item) => item.associatedField)).toEqual(["pressure", "flow", "gas_quantity", "soc"]);
      for (const item of profile?.items ?? []) {
        expect(parameterNames.has(item.associatedField ?? ""), `${kind}:${item.associatedField}`).toBe(true);
      }
    }
  });

  test("binds hydrogen source and load pressure and flow measurements to engineering fields", () => {
    for (const kind of ["hydrogen-source", "hydrogen-load"] as const) {
      const profile = DEFAULT_MEASUREMENT_CONFIG.deviceProfiles.find((item) => item.deviceKind === kind);
      expect(profile?.items.slice(0, 2)).toEqual([
        expect.objectContaining({ measurementTypeId: "pressure", associatedField: "pressure", unitOverride: "MPa" }),
        expect.objectContaining({ measurementTypeId: "flow", associatedField: "flow", unitOverride: "Nm3/h" })
      ]);
      const group = createDefaultMeasurementGroupForNode(node(`${kind}-node`, kind), DEFAULT_MEASUREMENT_CONFIG);
      expect(group?.items.slice(0, 2)).toEqual([
        expect.objectContaining({ sourcePoint: `${kind}-node.pressure`, unitOverride: "MPa" }),
        expect.objectContaining({ sourcePoint: `${kind}-node.flow`, unitOverride: "Nm3/h" })
      ]);
    }
  });

  test("migrates the legacy default hydrogen tank profile to gas measurements", () => {
    const migratedConfig = normalizeMeasurementConfig({
      measurementTypes: DEFAULT_MEASUREMENT_CONFIG.measurementTypes.filter((item) => item.id !== "gasQuantity"),
      deviceProfiles: [{
        deviceKind: "hydrogen-tank",
        items: [
          { measurementTypeId: "pressure" },
          { measurementTypeId: "level" },
          { measurementTypeId: "temperature" }
        ]
      }]
    });

    expect(migratedConfig.measurementTypes.find((item) => item.id === "gasQuantity")).toMatchObject({
      key: "gas_quantity",
      name: "储气量",
      defaultUnit: "Nm3"
    });
    expect(migratedConfig.deviceProfiles.find((item) => item.deviceKind === "hydrogen-tank")?.items).toEqual([
      expect.objectContaining({ measurementTypeId: "pressure", associatedField: "pressure", labelOverride: undefined, unitOverride: "MPa" }),
      expect.objectContaining({ measurementTypeId: "flow", associatedField: "flow", labelOverride: undefined, unitOverride: "Nm3/h" }),
      expect.objectContaining({ measurementTypeId: "gasQuantity", associatedField: "gas_quantity", labelOverride: undefined, unitOverride: "Nm3" }),
      expect.objectContaining({ measurementTypeId: "soc", associatedField: "soc", labelOverride: undefined, unitOverride: "%" })
    ]);
  });

  test("migrates the persisted three-item hydrogen tank profile and restores the SOC type", () => {
    const migratedConfig = normalizeMeasurementConfig({
      measurementTypes: DEFAULT_MEASUREMENT_CONFIG.measurementTypes.filter((item) => item.id !== "soc"),
      deviceProfiles: [{
        deviceKind: "hydrogen-tank",
        items: [
          { measurementTypeId: "pressure", associatedField: "pressure", labelOverride: "气压" },
          { measurementTypeId: "flow", associatedField: "flow", labelOverride: "流量" },
          { measurementTypeId: "gasQuantity", associatedField: "gas_quantity", labelOverride: "储气量" }
        ]
      }]
    });

    expect(migratedConfig.measurementTypes.find((item) => item.id === "soc")).toMatchObject({
      key: "soc",
      defaultUnit: "%"
    });
    expect(migratedConfig.deviceProfiles.find((item) => item.deviceKind === "hydrogen-tank")?.items).toEqual([
      expect.objectContaining({ measurementTypeId: "pressure", associatedField: "pressure", labelOverride: "气压" }),
      expect.objectContaining({ measurementTypeId: "flow", associatedField: "flow", labelOverride: "流量" }),
      expect.objectContaining({ measurementTypeId: "gasQuantity", associatedField: "gas_quantity", labelOverride: "储气量" }),
      expect.objectContaining({ measurementTypeId: "soc", associatedField: "soc", labelOverride: undefined })
    ]);
  });

  test("removes legacy hydrogen tank label overrides while preserving custom labels", () => {
    const migratedConfig = normalizeMeasurementConfig({
      measurementTypes: DEFAULT_MEASUREMENT_CONFIG.measurementTypes,
      deviceProfiles: [{
        deviceKind: "hydrogen-tank",
        items: [
          { measurementTypeId: "pressure", associatedField: "pressure", labelOverride: "PRESS" },
          { measurementTypeId: "flow", associatedField: "flow", labelOverride: "入口流量" },
          { measurementTypeId: "gasQuantity", associatedField: "gas_quantity", labelOverride: "GAS_QUANTITY" },
          { measurementTypeId: "soc", associatedField: "soc", labelOverride: "SOC" }
        ]
      }]
    });

    expect(migratedConfig.deviceProfiles[0].items.map((item) => item.labelOverride)).toEqual([
      undefined,
      "入口流量",
      undefined,
      undefined
    ]);
  });

  test("migrates persisted storage level definitions and generated items to soc", () => {
    const legacyConfig = {
      measurementTypes: DEFAULT_MEASUREMENT_CONFIG.measurementTypes.filter((item) => item.id !== "soc"),
      deviceProfiles: [
        { deviceKind: "ac-storage", items: [{ measurementTypeId: "activePower" }, { measurementTypeId: "level" }] },
        { deviceKind: "dc-storage", items: [{ measurementTypeId: "activePower" }, { measurementTypeId: "level" }] },
        { deviceKind: "hydrogen-tank", items: [{ measurementTypeId: "level" }] }
      ]
    };
    const migratedConfig = normalizeMeasurementConfig(legacyConfig);

    expect(migratedConfig.measurementTypes.find((item) => item.id === "soc")).toMatchObject({
      key: "soc",
      name: "soc",
      shortLabel: "soc",
      defaultUnit: "%"
    });
    expect(migratedConfig.deviceProfiles.find((item) => item.deviceKind === "ac-storage")?.items.map((item) => item.measurementTypeId)).toEqual(["activePower", "soc"]);
    expect(migratedConfig.deviceProfiles.find((item) => item.deviceKind === "dc-storage")?.items.map((item) => item.measurementTypeId)).toEqual(["activePower", "soc"]);
    expect(migratedConfig.deviceProfiles.find((item) => item.deviceKind === "hydrogen-tank")?.items.map((item) => item.measurementTypeId)).toEqual(["level"]);

    const storageNode = node("legacy-storage-node", "ac-storage");
    const currentGroup = createDefaultMeasurementGroupForNode(storageNode, DEFAULT_MEASUREMENT_CONFIG)!;
    const legacyGroup = {
      ...currentGroup,
      items: currentGroup.items.map((item, index) => index === currentGroup.items.length - 1
        ? {
            ...item,
            id: `measurement-${storageNode.id}-level-${index}`,
            measurementTypeId: "level",
            sourcePoint: `${storageNode.id}.level`
          }
        : item)
    };
    const reconciled = reconcileProjectMeasurementsWithConfig(
      { version: 1, groups: [legacyGroup] },
      [storageNode],
      DEFAULT_MEASUREMENT_CONFIG
    );

    expect(reconciled.groups[0].items.map((item) => item.measurementTypeId)).toEqual([
      "activePower",
      "reactivePower",
      "voltage",
      "soc"
    ]);
    expect(reconciled.groups[0].items.at(-1)?.sourcePoint).toBe("legacy-storage-node.soc");
  });

  test("creates a default device measurement group from the device type profile", () => {
    const group = createDefaultMeasurementGroupForNode(node("node-1", "ac-load"), DEFAULT_MEASUREMENT_CONFIG);

    expect(group).toMatchObject({
      nodeId: "node-1",
      anchor: "bottom",
      layout: "vertical",
      visible: false,
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

    const legacyConfig = normalizeMeasurementConfig({
      measurementTypes: DEFAULT_MEASUREMENT_CONFIG.measurementTypes,
      deviceProfiles: [{
        deviceKind: "ac-transformer",
        items: [
          { measurementTypeId: "activePower" },
          { measurementTypeId: "reactivePower" },
          { measurementTypeId: "voltage" },
          { measurementTypeId: "current" }
        ]
      }]
    });
    const groups = createDefaultMeasurementGroupsForNode(threeTerminalNode, legacyConfig);

    expect(groups).toHaveLength(1);
    expect(groups[0].terminalId).toBeUndefined();
    expect(groups[0].id).toBe("measurement-transformer-1");
    expect(groups[0].items[0].sourcePoint).toBe("transformer-1.activePower");
  });

  test("uses separate high and low side measurement fields for the default two-winding transformer profile", () => {
    const transformer: ModelNode = {
      ...node("transformer-sided", "ac-transformer"),
      params: {
        i_p: "10",
        i_q: "2",
        i_u: "110",
        i_i: "55",
        j_p: "9.5",
        j_q: "1.8",
        j_u: "10",
        j_i: "520"
      },
      terminals: [
        { id: "t1", label: "高压", type: "ac", anchor: { x: -0.5, y: 0 }, nodeNumber: "" },
        { id: "t2", label: "低压", type: "ac", anchor: { x: 0.5, y: 0 }, nodeNumber: "" }
      ]
    };

    const profile = DEFAULT_MEASUREMENT_CONFIG.deviceProfiles.find((item) => item.deviceKind === "ac-transformer");
    const group = createDefaultMeasurementGroupForNode(transformer, DEFAULT_MEASUREMENT_CONFIG);

    expect(profile?.items.map((item) => item.associatedField)).toEqual([
      "i_p", "i_q", "i_u", "i_i", "j_p", "j_q", "j_u", "j_i", "tap"
    ]);
    expect(group?.items.map((item) => item.sourcePoint)).toEqual([
      "transformer-sided.i_p",
      "transformer-sided.i_q",
      "transformer-sided.i_u",
      "transformer-sided.i_i",
      "transformer-sided.j_p",
      "transformer-sided.j_q",
      "transformer-sided.j_u",
      "transformer-sided.j_i",
      "transformer-sided.tap"
    ]);
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

  test("supports the measurement display printf subset", () => {
    const value = (input: number | string): MeasurementRuntimeValue => ({
      sourcePoint: "node-1.p",
      value: input,
      quality: "good",
      timestamp: 1000
    });

    expect(formatMeasurementDisplayValue(value(12.3456), 3, "", "%.3f")).toBe("12.346");
    expect(formatMeasurementDisplayValue(value(12.3456), 3, "", "%3.2f")).toBe("12.35");
    expect(formatMeasurementDisplayValue(value(5), 3, "", "%5.2f")).toBe(" 5.00");
    expect(formatMeasurementDisplayValue(value(12.9), 3, "", "%04d")).toBe("0012");
    expect(formatMeasurementDisplayValue(value(12.9), 3, "", "%d")).toBe("12");
    expect(formatMeasurementDisplayValue(value("RUN"), 3, "", "%s")).toBe("RUN");
    expect(formatMeasurementDisplayValue(value(12.3456), 3, "", "%unsupported")).toBe("12.346");
    // 自定义格式保持其精度/补零语义；小数点固定在同一列，末尾补空格保持值列宽度。
    expect(measurementFormatValueText(formatMeasurementDisplayValue(value(0), 3, "", "%.3f"))).toBe("    0.000");
    expect(measurementFormatValueText(formatMeasurementDisplayValue(value(0), 3, "", "%4.2f"))).toBe("    0.00 ");
    expect(measurementFormatValueText(formatMeasurementDisplayValue(value(12.9), 3, "", "%04d"), "%04d")).toBe(" 0012    ");
    expect(measurementFormatValueText(formatMeasurementDisplayValue(value(12.9), 3, "", "%d"), "%d")).toBe("   12    ");
    expect(measurementFormatValueText(formatMeasurementDisplayValue(value("RUN"), 3, "", "%s"), "%s")).toBe("      RUN");
    const twoDecimals = measurementFormatValueText(formatMeasurementDisplayValue(value(0), 3, "", "%4.2f"));
    const threeDecimals = measurementFormatValueText(formatMeasurementDisplayValue(value(0), 3, "", "%.3f"));
    const fiveWidth = measurementFormatValueText(formatMeasurementDisplayValue(value(5), 3, "", "%5.2f"), "%5.2f");
    expect(fiveWidth).toBe("    5.00 ");
    expect(twoDecimals.indexOf(".")).toBe(threeDecimals.indexOf("."));
    expect(fiveWidth.indexOf(".")).toBe(threeDecimals.indexOf("."));
  });

  test("preserves explicitly empty measurement labels and units", () => {
    const config = normalizeMeasurementConfig({
      measurementTypes: [{ id: "activePower", shortLabel: "P", defaultUnit: "MW" }],
      deviceProfiles: [{
        deviceKind: "ac-load",
        items: [{ measurementTypeId: "activePower", labelOverride: "", unitOverride: "" }]
      }]
    });
    const item = {
      id: "measurement-1-activePower-0",
      measurementTypeId: "activePower",
      sourcePoint: "node-1.p",
      labelOverride: "",
      unitOverride: ""
    };
    const display = resolveMeasurementItemDisplay({
      config,
      node: node("node-1"),
      group: { id: "measurement-node-1", nodeId: "node-1", visible: true, anchor: "bottom", offset: { x: 0, y: 0 }, layout: "vertical", items: [item] },
      item
    });

    expect(display.label).toBe("");
    expect(display.unit).toBe("");
    expect(config.deviceProfiles[0]?.items[0]).toMatchObject({ labelOverride: "", unitOverride: "" });
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

  test("removes stale labels only from generated hydrogen tank measurements", () => {
    const tank = node("tank-legacy-label", "hydrogen-tank");
    const normalized = normalizeProjectMeasurements(
      {
        version: 1,
        groups: [{
          id: `measurement-${tank.id}`,
          nodeId: tank.id,
          visible: true,
          anchor: "bottom",
          offset: { x: 0, y: 70 },
          layout: "vertical",
          items: [
            { id: `measurement-${tank.id}-pressure-0`, measurementTypeId: "pressure", sourcePoint: `${tank.id}.pressure`, labelOverride: "PRESS" },
            { id: `measurement-${tank.id}-flow-1`, measurementTypeId: "flow", sourcePoint: `${tank.id}.flow`, labelOverride: "入口流量" },
            { id: `measurement-${tank.id}-gasQuantity-2`, measurementTypeId: "gasQuantity", sourcePoint: `${tank.id}.gas_quantity`, labelOverride: "GAS_QUANTITY" },
            { id: `measurement-${tank.id}-soc-3`, measurementTypeId: "soc", sourcePoint: `${tank.id}.soc`, labelOverride: "SOC" },
            { id: "manual-pressure", measurementTypeId: "pressure", sourcePoint: "manual.pressure", labelOverride: "PRESS" }
          ]
        }]
      },
      [tank]
    );

    expect(normalized.groups[0].items.map((item) => item.labelOverride)).toEqual([
      undefined,
      "入口流量",
      undefined,
      undefined,
      "PRESS"
    ]);
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
    // 量测框内容不随设备缩放
    expect(measurementFontScaleForNode({ ...node("scaled-node"), scaleX: 4, scaleY: 1 })).toBeCloseTo(1);
    expect(measurementFontScaleForNode({ ...node("mirrored-node"), scaleX: -2.25, scaleY: 1 })).toBeCloseTo(1);
  });

  test("scales measurement group offset with the owning device axes", () => {
    // 量测框与设备间距不随设备缩放
    expect(measurementOffsetScaleForNode({ ...node("scaled-node"), scaleX: 2, scaleY: 0.5 })).toEqual({ x: 1, y: 1 });
    expect(measurementOffsetScaleForNode({ ...node("mirrored-node"), scaleX: -3, scaleY: -1.5 })).toEqual({ x: 1, y: 1 });
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

// 关口容器量测组:容器组恒为绑定设备量测组的副本(nodeId = 容器 id),单向 绑定设备 → 容器
describe("container measurement groups", () => {
  const group = (nodeId: string, items: any[]): any => ({
    id: `measurement-${nodeId}`,
    nodeId,
    visible: true,
    anchor: "bottom",
    offset: { x: 0, y: 70 },
    layout: "vertical",
    items
  });
  const item = (id: string, point: string): any => ({ id, measurementTypeId: "activePower", sourcePoint: point, name: "有功" });
  const cfg = (groups: any[]): ProjectMeasurementConfig => ({ version: 1, groups } as ProjectMeasurementConfig);
  const container = (id: string, params: Record<string, string>): ModelNode => ({ ...node(id, "ac-vpp-box"), params });
  const member = (id: string, containerId: string): ModelNode => ({ ...node(id), containerId });
  const findGroup = (config: ProjectMeasurementConfig, nodeId: string): any => config.groups.find((entry) => entry.nodeId === nodeId);

  test("关口绑定:容器量测组 = 绑定设备量测组副本(nodeId 换容器)", () => {
    const config = cfg([group("dev1", [item("i1", "dev1.p")])]);
    const out = syncContainerMeasurementGroup(config, "c1", "dev1");
    const mirror = findGroup(out, "c1");
    expect(mirror.items).toEqual([item("i1", "dev1.p")]);
    expect(mirror.id).toBe("measurement-c1");
    // 绑定设备组不变
    expect(findGroup(out, "dev1").items.length).toBe(1);
  });

  test("副本与源组不共享引用(改副本不影响绑定设备)", () => {
    const out = syncContainerMeasurementGroup(cfg([group("dev1", [item("i1", "dev1.p")])]), "c1", "dev1");
    findGroup(out, "c1").items[0].sourcePoint = "容器改过的测点";
    expect(findGroup(out, "dev1").items[0].sourcePoint).toBe("dev1.p");
  });

  test("副本的组级 offset 与源组隔离(改副本偏移不动绑定设备)", () => {
    const out = syncContainerMeasurementGroup(cfg([group("dev1", [item("i1", "dev1.p")])]), "c1", "dev1");
    findGroup(out, "c1").offset.x = 999;
    expect(findGroup(out, "dev1").offset.x).toBe(0);
  });

  test("绑定设备无量测组 → 不建空镜像组", () => {
    const out = syncContainerMeasurementGroup(cfg([group("dev1", [])]), "c1", "dev1");
    expect(out.groups.some((entry) => entry.nodeId === "c1")).toBe(false);
  });

  test("重复同步覆盖不重复建组", () => {
    let config = cfg([group("dev1", [item("i1", "dev1.p")])]);
    config = syncContainerMeasurementGroup(config, "c1", "dev1");
    config = {
      version: 1,
      groups: config.groups.map((entry) => entry.nodeId === "dev1" ? { ...entry, items: [...entry.items, item("i2", "dev1.q")] } : entry)
    };
    config = syncContainerMeasurementGroup(config, "c1", "dev1");
    expect(config.groups.filter((entry) => entry.nodeId === "c1").length).toBe(1);
    expect(findGroup(config, "c1").items.map((entry: any) => entry.id)).toEqual(["i1", "i2"]);
  });

  test("解绑删除容器量测组", () => {
    const config = syncContainerMeasurementGroup(cfg([group("dev1", [item("i1", "dev1.p")])]), "c1", "dev1");
    const out = removeContainerMeasurementGroup(config, "c1");
    expect(out.groups.some((entry) => entry.nodeId === "c1")).toBe(false);
    // 绑定设备的组不受影响
    expect(findGroup(out, "dev1").items.length).toBe(1);
  });

  test("无容器组时删除返回原 config(引用不变,便于调用方短路)", () => {
    const config = cfg([group("dev1", [item("i1", "dev1.p")])]);
    expect(removeContainerMeasurementGroup(config, "c1")).toBe(config);
  });

  test("收敛:关口 + 绑定成员 → 镜像覆盖;关关口 → 镜像保留(不再清理)", () => {
    const nodes = [container("c1", { is_gateway: "1", bound_device_id: "dev1" }), member("dev1", "c1")];
    const synced = reconcileContainerMeasurementGroups(cfg([group("dev1", [item("i1", "dev1.p")])]), nodes);
    expect(findGroup(synced, "c1").items.length).toBe(1);

    const gatewayOff = nodes.map((entry) => entry.id === "c1" ? { ...entry, params: { ...entry.params, is_gateway: "0" } } : entry);
    // fb13 口径修正:关关口后旧镜像保留(不再清空)—— 用户可在【量测】页【默认】恢复成容器档 V/I/P/Q
    expect(findGroup(reconcileContainerMeasurementGroups(synced, gatewayOff), "c1").items.length).toBe(1);
  });

  test("非关口容器自带的组保留(用户数据,不再被清理)", () => {
    // fb13 口径修正:容器组有两个合法来源 —— ① 关口绑定时的镜像(覆盖式);
    // ② 非关口容器自身的组(用户在【量测】页建/【默认】按钮建)。②不再被 reconcile 清空。
    const withContainerOwnGroup = cfg([group("c1", [item("i0", "手建测点")]), group("dev1", [item("i1", "dev1.p")])]);
    const nodes = [container("c1", { is_gateway: "0", bound_device_id: "" }), member("dev1", "c1")];
    const out = reconcileContainerMeasurementGroups(withContainerOwnGroup, nodes);
    expect(findGroup(out, "c1").items.map((entry: any) => entry.sourcePoint)).toEqual(["手建测点"]);
    // 非容器组不受影响
    expect(findGroup(out, "dev1").items.length).toBe(1);

    // 无自带组时非关口容器不产生新对象(短路语义保留)
    const clean = cfg([group("dev1", [item("i1", "dev1.p")])]);
    expect(reconcileContainerMeasurementGroups(clean, nodes)).toBe(clean);
  });

  test("收敛:绑定设备被删除 / 已不在容器内 → 旧镜像保留(用户可【默认】重建)", () => {
    const synced = syncContainerMeasurementGroup(cfg([group("dev1", [item("i1", "dev1.p")])]), "c1", "dev1");
    const bound = container("c1", { is_gateway: "1", bound_device_id: "dev1" });
    // 绑定设备已删除(图中只剩容器)
    expect(findGroup(reconcileContainerMeasurementGroups(synced, [bound]), "c1").items.length).toBe(1);
    // 绑定设备仍在图里但已不属于该容器(移出/改归属)
    expect(findGroup(reconcileContainerMeasurementGroups(synced, [bound, node("dev1")]), "c1").items.length).toBe(1);
  });

  test("收敛幂等:重复调用不重复建组", () => {
    const nodes = [container("c1", { is_gateway: "1", bound_device_id: "dev1" }), member("dev1", "c1")];
    const once = reconcileContainerMeasurementGroups(cfg([group("dev1", [item("i1", "dev1.p")])]), nodes);
    const twice = reconcileContainerMeasurementGroups(once, nodes);
    expect(twice.groups.filter((entry) => entry.nodeId === "c1").length).toBe(1);
    expect(findGroup(twice, "c1").items).toEqual(findGroup(once, "c1").items);
  });

  test("归一化即收敛:绑定设备增删测点容器组跟随,绑定设备被删除后旧镜像保留", () => {
    const nodes = [container("c1", { is_gateway: "1", bound_device_id: "dev1" }), member("dev1", "c1")];
    const normalized = normalizeProjectMeasurements(cfg([group("dev1", [item("i1", "dev1.p")])]), nodes);
    expect(normalized.groups.some((entry) => entry.nodeId === "c1")).toBe(true);

    // 绑定设备增删测点(单向:绑定设备 → 容器)
    const grown = normalizeProjectMeasurements({
      version: 1,
      groups: normalized.groups.map((entry) => entry.nodeId === "dev1" ? { ...entry, items: [...entry.items, item("i2", "dev1.q")] } : entry)
    }, nodes);
    expect(findGroup(grown, "c1").items.map((entry: any) => entry.id)).toEqual(["i1", "i2"]);

    // 绑定设备被删除 → 旧镜像保留(不再自动清空,用户可在【默认】重建)
    expect(normalizeProjectMeasurements(grown, [nodes[0]]).groups.some((entry) => entry.nodeId === "c1")).toBe(true);
  });
});

// ─── fb13:交流容器默认量测(电压/电流/有功/无功)──────────────────────────────
// 容器无 E 设备类,量测档按段名 ACContainer 单条覆盖三 kind(measurementProfileForNode 的
// directKeys[0] = inferESection → "ACContainer"),不再回退到开关/电源兜底档。
describe("AC 容器默认量测档", () => {
  const containerNode = (kind: string): ModelNode => ({ ...node("c-demo", kind), params: {} });
  const typeIds = (kind: string) =>
    measurementProfileItemsForNodePosition(containerNode(kind), DEFAULT_MEASUREMENT_CONFIG)
      .map((item) => item.measurementTypeId);

  test("三容器 kind 同一条 ACContainer 档:默认测点 = 有功/无功/电压/电流", () => {
    for (const kind of ["ac-vpp-box", "ac-switch-box", "ac-distribution-box"]) {
      expect(typeIds(kind), kind).toEqual(["activePower", "reactivePower", "voltage", "current"]);
    }
  });

  test("不再回退到开关/电源兜底档(无 status,也无 frequency)", () => {
    const ids = typeIds("ac-switch-box");
    expect(ids).not.toContain("status");
    expect(ids).not.toContain("frequency");
  });

  test("【默认】按钮建出的容器组与档一致", () => {
    const group = createDefaultMeasurementGroupForNode(containerNode("ac-vpp-box"), DEFAULT_MEASUREMENT_CONFIG);
    expect(group?.items.map((item) => item.measurementTypeId)).toEqual([
      "activePower", "reactivePower", "voltage", "current"
    ]);
  });
});

describe("upsertMeasurementGroups", () => {
  // 该函数此前在别处只以 `vi.fn()` 形式出现（调用方把它打桩），真实实现从未被执行。
  // 它有三处值得钉住的语义：同 id 覆盖、原顺序保持、新 id 追加到末尾。
  const group = (id: string, nodeId: string, label = "g") => ({
    id,
    nodeId,
    anchor: "top" as const,
    offset: { x: 0, y: 0 },
    visible: true,
    layout: "vertical" as const,
    items: []
  });
  const config = (groups: ReturnType<typeof group>[]) => ({ version: 1, groups }) as never;

  test("空 incoming 时原样返回（不新建等价副本的语义差异）", () => {
    const input = config([group("a", "n1")]);
    expect(upsertMeasurementGroups(input, [])).toEqual({ version: 1, groups: [group("a", "n1")] });
  });

  test("同 id 覆盖：内容更新但位置保持原顺序", () => {
    const input = config([group("a", "n1", "旧"), group("b", "n2")]);
    const result = upsertMeasurementGroups(input, [group("a", "n1", "新")]);
    expect(result.groups.map((g) => g.id)).toEqual(["a", "b"]);
    expect(result.groups[0].nodeId).toBe("n1");
  });

  test("新 id 追加到末尾，不打乱既有顺序", () => {
    const input = config([group("a", "n1"), group("b", "n2")]);
    const result = upsertMeasurementGroups(input, [group("c", "n3")]);
    expect(result.groups.map((g) => g.id)).toEqual(["a", "b", "c"]);
  });

  test("同一批 incoming 内出现重复 id 时以最后一个为准", () => {
    const input = config([]);
    const result = upsertMeasurementGroups(input, [group("x", "n1", "先"), group("x", "n2", "后")]);
    expect(result.groups).toHaveLength(1);
    expect(result.groups[0].nodeId).toBe("n2");
  });

  test("结果 version 恒为 1", () => {
    const result = upsertMeasurementGroups(config([]), [group("a", "n1")]);
    expect(result.version).toBe(1);
  });
});

// 量测文字宽度的口径。此前这两个函数一次都没被直接测过，而量测组的画布排版
// （列宽、占位、导出 SVG 里的 x 坐标）全按它们算。判错不抛异常，只是文字
// 溢出容器或列与列叠在一起。
describe("量测文字视觉宽度", () => {
  test("半角按 1、CJK 按 2 累加", () => {
    expect(measurementVisualWidth("")).toBe(0);
    expect(measurementVisualWidth("abc")).toBe(3);
    expect(measurementVisualWidth("有功")).toBe(4);
    expect(measurementVisualWidth("P有功")).toBe(5);
  });

  test("五个宽字符区间都算 2 格（改任一区间的边界都会被这条抓住）", () => {
    // 基本汉字 / 扩展A / 兼容汉字 / 全角与半角标点 / CJK 标点
    expect(measurementVisualWidth("一")).toBe(2);
    expect(measurementVisualWidth("㐀")).toBe(2);
    expect(measurementVisualWidth("豈")).toBe(2);
    expect(measurementVisualWidth("Ａ")).toBe(2);
    expect(measurementVisualWidth("、")).toBe(2);
  });

  test("区间外相邻码位按半角算（区间端点是闭区间，不要多算一格）", () => {
    const ch = (code: number) => String.fromCodePoint(code);
    expect(measurementVisualWidth(ch(0x33ff))).toBe(1); // 扩展A 下界前一格
    expect(measurementVisualWidth(ch(0x3400))).toBe(2); // 扩展A 下界
    expect(measurementVisualWidth(ch(0x4dbf))).toBe(2); // 扩展A 上界
    expect(measurementVisualWidth(ch(0x4e00))).toBe(2); // 基本汉字 下界
    expect(measurementVisualWidth(ch(0x9fff))).toBe(2); // 基本汉字 上界
    expect(measurementVisualWidth(ch(0xa000))).toBe(1); // 基本汉字 上界后一格
    expect(measurementVisualWidth(ch(0x2fff))).toBe(1); // CJK 标点 下界前一格
    expect(measurementVisualWidth(ch(0x3000))).toBe(2); // CJK 标点 下界
    expect(measurementVisualWidth(ch(0x303f))).toBe(2); // CJK 标点 上界
    expect(measurementVisualWidth(ch(0x3040))).toBe(1); // CJK 标点 上界后一格
  });

  test("列宽常量自洽：总值 = 整数位 + 小数点 + 小数位，且小数位数与常量一致", () => {
    expect(MEASUREMENT_VALUE_TOTAL_WIDTH)
      .toBe(MEASUREMENT_VALUE_INTEGER_WIDTH + 1 + MEASUREMENT_VALUE_DECIMAL_WIDTH);
    // 小数位常量多给一位是留给进位的余量，所以只断言它 >= 小数位数
    expect(MEASUREMENT_VALUE_DECIMAL_WIDTH).toBeGreaterThanOrEqual(MEASUREMENT_VALUE_DECIMALS);
    expect(MEASUREMENT_INTER_COLUMN_GAP).toBeGreaterThan(0);
  });

  test("补空格按视觉宽度而不是字符数（中文串补得比等长英文少）", () => {
    expect(measurementPadTextToVisualWidth("abc", 6)).toBe("   abc");
    expect(measurementPadTextToVisualWidth("有功", 6)).toBe("  有功");
    expect(measurementVisualWidth(measurementPadTextToVisualWidth("有功", 6))).toBe(6);
  });

  test("已经够宽或刚好等宽时原样返回（不补也不截）", () => {
    expect(measurementPadTextToVisualWidth("abcdef", 4)).toBe("abcdef");
    expect(measurementPadTextToVisualWidth("abc", 3)).toBe("abc");
  });

  test("目标宽度小于当前宽度时返回超长文本而不是负数长度的空格串", () => {
    expect(measurementPadTextToVisualWidth("有功有功", 2)).toBe("有功有功");
  });

  // 变异验证补记：把 `currentWidth >= targetWidth` 改成 `>` 仍然全绿 ——
  // 两者在「刚好等宽」时结果相同（repeat(0) + text 还是 text），属等价变异，
  // 不是这条测试没守住。所以别把它当成「>= 那一半被覆盖了」的证据。
  // measurementPadTextToVisualWidth / measurementVisualWidth 的其余分支均已被抓。
});

describe("materializeNewMeasurementDefinitionFields", () => {
  const profileItem = (over: Record<string, unknown> = {}) =>
    ({ measurementTypeId: "activePower", name: "有功功率", associatedField: "p", position: "device", ...over }) as never;

  const positionDefinitions = (fields: string[]) =>
    [{ value: "device", label: "设备本体", parameterDefinitions: fields.map((enName) => ({ cnName: enName, enName, valueType: "float" as const, typicalValue: "0" })) }];

  test("新出现的测点字段被物化成参数定义并登记在 additions 里", () => {
    const result = materializeNewMeasurementDefinitionFields({
      previousItems: [profileItem({ associatedField: "p" })],
      nextItems: [profileItem({ associatedField: "p" }), profileItem({ measurementTypeId: "q", name: "无功功率", associatedField: "q" })],
      parameterDefinitions: [{ cnName: "p", enName: "p", valueType: "float", typicalValue: "0" }],
      positionDefinitions: positionDefinitions(["p"]) as never
    });
    expect(result.additions.map((addition) => addition.field)).toEqual(["q"]);
    expect(result.parameterDefinitions.map((definition) => definition.enName)).toEqual(["p", "q"]);
  });

  test("重复测点（含本轮内重复）不会物化两次", () => {
    const result = materializeNewMeasurementDefinitionFields({
      nextItems: [profileItem({ associatedField: "r" }), profileItem({ measurementTypeId: "r2", name: "电阻", associatedField: "r" })],
      parameterDefinitions: [],
      positionDefinitions: positionDefinitions([]) as never
    });
    expect(result.additions.map((addition) => addition.field)).toEqual(["r"]);
    expect(result.parameterDefinitions.filter((definition) => definition.enName === "r")).toHaveLength(1);
  });

  test("字段比较忽略大小写（列表里写 P、参数表里写 p 视为已存在）", () => {
    const result = materializeNewMeasurementDefinitionFields({
      nextItems: [profileItem({ associatedField: "P" })],
      parameterDefinitions: [],
      positionDefinitions: positionDefinitions(["p"]) as never
    });
    expect(result.additions).toEqual([]);
    expect(result.parameterDefinitions.map((definition) => definition.enName)).toEqual(["p"]);
  });

  test("没有 associatedField 的测点被跳过（物化不出参数）", () => {
    const result = materializeNewMeasurementDefinitionFields({
      nextItems: [profileItem({ associatedField: "   " })],
      parameterDefinitions: [],
      positionDefinitions: positionDefinitions([]) as never
    });
    expect(result.additions).toEqual([]);
  });

  test("materializeDeviceFields=false 时设备本体的测点不物化，端子位的不受影响", () => {
    const result = materializeNewMeasurementDefinitionFields({
      nextItems: [profileItem({ associatedField: "p" }), profileItem({ measurementTypeId: "t1", name: "1号端子", associatedField: "u", position: "t1" })],
      parameterDefinitions: [],
      positionDefinitions: [
        { value: "device", label: "设备本体", parameterDefinitions: [] },
        { value: "t1", label: "1号端子", parameterDefinitions: [] }
      ] as never,
      materializeDeviceFields: false
    });
    expect(result.additions.map((addition) => addition.field)).toEqual(["u"]);
    expect(result.additions[0].position).toBe("t1");
    expect(result.parameterDefinitions).toEqual([]);
  });

  test("没有 positionDefinitions 时按单一「设备本体」位处理", () => {
    const result = materializeNewMeasurementDefinitionFields({
      nextItems: [profileItem({ associatedField: "p" })],
      parameterDefinitions: [{ cnName: "额定值", enName: "rated", valueType: "float", typicalValue: "0" }]
    });
    expect(result.additions.map((addition) => addition.field)).toEqual(["p"]);
    expect(result.parameterDefinitions.map((definition) => definition.enName)).toEqual(["rated", "p"]);
    expect(result.positionDefinitions).toHaveLength(1);
  });

  test("没有传 positionDefinitions 时不回写调用方的数组（入参不被就地改）", () => {
    const parameterDefinitions = [{ cnName: "额定值", enName: "rated", valueType: "float" as const, typicalValue: "0" }];
    materializeNewMeasurementDefinitionFields({
      nextItems: [profileItem({ associatedField: "p" })],
      parameterDefinitions
    });
    expect(parameterDefinitions.map((definition) => definition.enName)).toEqual(["rated"]);
  });

  // 变异验证补记：addedReferences 去重集合、`if (!field) continue` 这两处守卫
  // 删掉后仍然全绿 —— 前者被「字段已进 parameterDefinitions 就跳过」这条挡住，
  // 后者被 createMeasurementFieldParameterDefinition("") 返回 null 挡住。属等价变异，
  // 不是这两条测试没守住。
});

describe("resolveMeasurementItemBindingMetadata", () => {
  const load = node("n1", "ac-load");
  const measurementTypeId = "activePower";

  // 默认配置里档项只有 measurementTypeId，associatedField 要用户在量测配置里
  // 自己填；下面用一个填了字段的合成配置把「有字段」那条分支也跑起来。
  const associatedConfig = {
    ...DEFAULT_MEASUREMENT_CONFIG,
    deviceProfiles: DEFAULT_MEASUREMENT_CONFIG.deviceProfiles.map((profile) => (
      profile.deviceKind === "ac-load"
        ? { ...profile, items: profile.items.map((item) => ({ ...item, associatedField: "p" })) }
        : profile
    ))
  };

  test("档项没填 associatedField 时绑定字段退回测量类型 id，源点按「节点ID.类型id」补齐", () => {
    expect(resolveMeasurementItemBindingMetadata({
      config: DEFAULT_MEASUREMENT_CONFIG,
      node: load,
      item: { measurementTypeId, sourcePoint: "" } as never
    })).toEqual({ measurementTypeId, bindingField: measurementTypeId, sourcePoint: `n1.${measurementTypeId}` });
  });

  test("档里没有的类型同样退回测量类型 id", () => {
    expect(resolveMeasurementItemBindingMetadata({
      config: DEFAULT_MEASUREMENT_CONFIG,
      node: load,
      item: { measurementTypeId: "不存在的类型", sourcePoint: "" } as never
    })).toEqual({ measurementTypeId: "不存在的类型", bindingField: "不存在的类型", sourcePoint: "n1.不存在的类型" });
  });

  test("档项填了 associatedField 时绑定字段取它，源点空则按「节点ID.字段」补齐", () => {
    expect(resolveMeasurementItemBindingMetadata({
      config: associatedConfig,
      node: load,
      item: { measurementTypeId, sourcePoint: "" } as never
    })).toEqual({ measurementTypeId, bindingField: "p", sourcePoint: "n1.p" });
  });

  test("测量类型 id 与源点两端都 trim", () => {
    const resolved = resolveMeasurementItemBindingMetadata({
      config: associatedConfig,
      node: load,
      item: { measurementTypeId: `  ${measurementTypeId}  `, sourcePoint: "  " } as never
    });
    expect(resolved.measurementTypeId).toBe(measurementTypeId);
    expect(resolved.sourcePoint).toBe("n1.p");
  });

  test("源点本地段正好等于测量类型 id 时被换成 associatedField", () => {
    expect(resolveMeasurementItemBindingMetadata({
      config: associatedConfig,
      node: load,
      item: { measurementTypeId, sourcePoint: `n1.${measurementTypeId}` } as never
    }).sourcePoint).toBe("n1.p");
  });

  test("源点本地段以「.测量类型 id」结尾时只替换那一段尾巴", () => {
    // 判据是「以点分隔的类型 id 收尾」，所以 n1.t1.activePower 会改成 n1.t1.p，
    // 而 n1.t1_activePower（下划线分隔）不满足，保持原样。
    expect(resolveMeasurementItemBindingMetadata({
      config: associatedConfig,
      node: load,
      item: { measurementTypeId, sourcePoint: `n1.t1.${measurementTypeId}` } as never
    }).sourcePoint).toBe("n1.t1.p");
    expect(resolveMeasurementItemBindingMetadata({
      config: associatedConfig,
      node: load,
      item: { measurementTypeId, sourcePoint: `n1.t1_${measurementTypeId}` } as never
    }).sourcePoint).toBe(`n1.t1_${measurementTypeId}`);
  });

  test("源点不是本节点前缀时原样保留（跨设备引用不该被就地改写）", () => {
    expect(resolveMeasurementItemBindingMetadata({
      config: associatedConfig,
      node: load,
      item: { measurementTypeId, sourcePoint: "other.p" } as never
    }).sourcePoint).toBe("other.p");
    // 特意挑一个本地段也以类型 id 收尾的跨节点引用：只看「结尾」不先看前缀的话，
    // 会被切成 n1.<截断段>.p 这种既不像原样也不像本节点的第三种结果。
    expect(resolveMeasurementItemBindingMetadata({
      config: associatedConfig,
      node: load,
      item: { measurementTypeId, sourcePoint: `other.${measurementTypeId}` } as never
    }).sourcePoint).toBe(`other.${measurementTypeId}`);
  });

  test("本地段既不等于类型 id 也不以它结尾时原样保留", () => {
    expect(resolveMeasurementItemBindingMetadata({
      config: associatedConfig,
      node: load,
      item: { measurementTypeId, sourcePoint: "n1.别的字段" } as never
    }).sourcePoint).toBe("n1.别的字段");
  });

  test("档里没有的类型不会被别的类型顶包（绑定字段仍退回类型 id）", () => {
    expect(resolveMeasurementItemBindingMetadata({
      config: associatedConfig,
      node: load,
      item: { measurementTypeId: "不存在的类型", sourcePoint: "" } as never
    })).toEqual({ measurementTypeId: "不存在的类型", bindingField: "不存在的类型", sourcePoint: "n1.不存在的类型" });
  });

  test("同类型不同 role 的档项按 role 区分（多端子电流/电压各绑各的）", () => {
    const config = {
      ...DEFAULT_MEASUREMENT_CONFIG,
      deviceProfiles: DEFAULT_MEASUREMENT_CONFIG.deviceProfiles.map((profile) => (
        profile.deviceKind === "ac-load"
          ? {
            ...profile,
            items: [
              { measurementTypeId: "current", role: "i", associatedField: "i" },
              { measurementTypeId: "current", role: "j", associatedField: "j" }
            ]
          }
          : profile
      ))
    };
    expect(resolveMeasurementItemBindingMetadata({
      config, node: load, item: { measurementTypeId: "current", role: "i", sourcePoint: "" } as never
    }).bindingField).toBe("i");
    expect(resolveMeasurementItemBindingMetadata({
      config, node: load, item: { measurementTypeId: "current", role: "j", sourcePoint: "" } as never
    }).bindingField).toBe("j");
    // role 对不上时退回该类型的第一条，而不是硬套 role 为空的项
    expect(resolveMeasurementItemBindingMetadata({
      config, node: load, item: { measurementTypeId: "current", role: "k", sourcePoint: "" } as never
    }).bindingField).toBe("current");
  });

  test("带端子组时按组内端子定位档项，不带组时定位设备本体那一条", () => {
    const config = {
      ...DEFAULT_MEASUREMENT_CONFIG,
      deviceProfiles: DEFAULT_MEASUREMENT_CONFIG.deviceProfiles.map((profile) => (
        profile.deviceKind === "ac-load"
          ? {
            ...profile,
            items: [
              { measurementTypeId: "voltage", position: "device", associatedField: "u" },
              { measurementTypeId: "voltage", position: "t1", associatedField: "u_t1" }
            ]
          }
          : profile
      ))
    };
    expect(resolveMeasurementItemBindingMetadata({
      config, node: load, item: { measurementTypeId: "voltage", sourcePoint: "" } as never
    }).bindingField).toBe("u");
    expect(resolveMeasurementItemBindingMetadata({
      config, node: load, group: { terminalId: "t1" }, item: { measurementTypeId: "voltage", sourcePoint: "" } as never
    }).bindingField).toBe("u_t1");
    // 组内端子在档里没有对应项时退回该类型的第一条
    expect(resolveMeasurementItemBindingMetadata({
      config, node: load, group: { terminalId: "t9" }, item: { measurementTypeId: "voltage", sourcePoint: "" } as never
    }).bindingField).toBe("u");
  });
});
