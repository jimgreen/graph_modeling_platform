import { describe, expect, test } from "vitest";
import {
  alignNodes,
  buildTopology,
  buildElementTree,
  buildEDeviceParameterFile,
  calculateElectricalTopology,
  canConnectTerminals,
  buildDefaultDeviceParameterDefinitions,
  clampNodePositionToBounds,
  assignPermanentDeviceIndex,
  createSavedProject,
  createSavedScheme,
  copySavedProjectWithUniqueName,
  copySavedSchemeWithUniqueName,
  createDefaultNode,
  createNodeFromTemplate,
  CUSTOM_DEVICE_TEMPLATE_KEY,
  CUSTOM_PARAM_DEFINITIONS_KEY,
  deriveDeviceIndexCounters,
  deleteNodesWithConnectedEdges,
  deleteSavedProject,
  DEVICE_LIBRARY,
  duplicateSavedProject,
  routeOrthogonalEdge,
  routeEdgesForRendering,
  renameSavedProject,
  renameSavedScheme,
  moveProjectToScheme,
  upsertSavedProject,
  validateTopology,
  getTerminalPoint,
  getNodeScaleX,
  getNodeScaleY,
  getDeviceGlyphVariant,
  getDeviceStrokeColor,
  getDeviceStrokeWidth,
  getElementFocusPoint,
  getContainerRelationKey,
  getEParameterKeys,
  getTemplateParameterDefinitions,
  validateContainerTerminalRoles,
  isGeneratorNode,
  isStaticNode,
  getSwitchVisualState,
  lockProjectEdgeTerminals,
  mirrorNodes,
  normalizeVoltageBaseInput,
  normalizeViewBoxToCanvas,
  terminalStubSegment,
  terminalVoltageBaseNumber,
  serializeProject,
  deserializeProject,
  type Edge,
  type DeviceTemplate,
  type ModelNode,
  type Point
} from "./model";

describe("power system model", () => {
  test("builds adjacency topology from connection lines", () => {
    const nodes: ModelNode[] = [
      createDefaultNode("ac-bus", { x: 100, y: 100 }),
      createDefaultNode("ac-line", { x: 220, y: 100 }),
      createDefaultNode("ac-load", { x: 340, y: 100 })
    ];
    const edges: Edge[] = [
      { id: "e1", sourceId: nodes[0].id, targetId: nodes[1].id },
      { id: "e2", sourceId: nodes[1].id, targetId: nodes[2].id }
    ];

    const topology = buildTopology(nodes, edges);

    expect(topology.nodes[nodes[1].id].degree).toBe(2);
    expect(topology.nodes[nodes[0].id].neighbors).toEqual([nodes[1].id]);
    expect(topology.connectedComponents).toEqual([[nodes[0].id, nodes[1].id, nodes[2].id]]);
  });

  test("round-trips project files without losing device parameters", () => {
    const node = createDefaultNode("ac-transformer", { x: 160, y: 180 });
    node.name = "1号主变";
    node.params.ratedCapacity = "50 MVA";
    node.params.voltageRatio = "110/10 kV";

    const json = serializeProject({
      version: 1,
      name: "测试模型",
      canvasBackgroundColor: "#f1f5f9",
      canvasBackgroundImage: "/api/images/background",
      canvasBackgroundImageAssetId: "background",
      powerUnit: "MW",
      voltageUnit: "kV",
      currentUnit: "kA",
      powerBaseValue: 100,
      nodes: [node],
      edges: []
    });
    const loaded = deserializeProject(json);

    expect(loaded.name).toBe("测试模型");
    expect(loaded.canvasBackgroundColor).toBe("#f1f5f9");
    expect(loaded.canvasBackgroundImage).toBe("/api/images/background");
    expect(loaded.canvasBackgroundImageAssetId).toBe("background");
    expect(loaded.powerUnit).toBe("MW");
    expect(loaded.voltageUnit).toBe("kV");
    expect(loaded.currentUnit).toBe("kA");
    expect(loaded.powerBaseValue).toBe(100);
    expect(loaded.nodes[0].name).toBe("1号主变");
    expect(loaded.nodes[0].params.voltageRatio).toBe("110/10 kV");
  });

  test("locks connection endpoints to explicit terminals for non-bus devices", () => {
    const source = createDefaultNode("ac-switch", { x: 100, y: 100 });
    const target = createDefaultNode("ac-load", { x: 240, y: 100 });
    const bus = createDefaultNode("ac-bus", { x: 360, y: 100 });

    const locked = lockProjectEdgeTerminals({
      version: 1,
      name: "端子锁定",
      nodes: [source, target, bus],
      edges: [
        {
          id: "non-bus-edge",
          sourceId: source.id,
          targetId: target.id,
          sourcePoint: { x: 123, y: 456 },
          targetPoint: { x: 222, y: 333 }
        },
        {
          id: "bus-edge",
          sourceId: source.id,
          targetId: bus.id,
          sourceTerminalId: "t2",
          targetPoint: { x: 350, y: 100 }
        }
      ]
    });

    expect(locked.edges[0].sourceTerminalId).toBe("t1");
    expect(locked.edges[0].targetTerminalId).toBe("t1");
    expect(locked.edges[0].sourcePoint).toBeUndefined();
    expect(locked.edges[0].targetPoint).toBeUndefined();
    expect(locked.edges[1].sourceTerminalId).toBe("t2");
    expect(locked.edges[1].targetTerminalId).toBe("t1");
    expect(locked.edges[1].targetPoint).toEqual({ x: 350, y: 100 });
  });

  test("creates generator parameters with readonly node numbers and control types", () => {
    const acWind = createDefaultNode("ac-wind-source", { x: 100, y: 100 });
    const dcPv = createDefaultNode("dc-pv-source", { x: 240, y: 100 });

    expect(isGeneratorNode(acWind)).toBe(true);
    expect(acWind.nodeNumber).toMatch(/^N\d+$/);
    expect(acWind.params.ratedCapacity).toBe("50 MW");
    expect(acWind.params.controlType).toBe("PV");
    expect(acWind.params.cutInWindSpeed).toBe("3 m/s");
    expect(acWind.params.ratedWindSpeed).toBe("12 m/s");
    expect(acWind.params.cutOutWindSpeed).toBe("25 m/s");

    expect(dcPv.params.controlType).toBe("P");
    expect(dcPv.params.ratedCapacity).toBe("5 MW");
  });

  test("creates DC source with exactly one DC terminal and one DC node number", () => {
    const dcSource = createDefaultNode("dc-source", { x: 100, y: 100 });

    expect(dcSource.terminals).toHaveLength(1);
    expect(dcSource.terminals[0].id).toBe("t1");
    expect(dcSource.terminals[0].type).toBe("dc");
    expect(dcSource.terminals[0].nodeNumber).toMatch(/^N\d+$/);
    expect(new Set(dcSource.terminals.map((terminal) => terminal.nodeNumber)).size).toBe(1);
  });

  test("creates AC source with exactly one AC terminal and one AC node number", () => {
    const acSource = createDefaultNode("ac-source", { x: 100, y: 100 });

    expect(acSource.terminals).toHaveLength(1);
    expect(acSource.terminals[0].id).toBe("t1");
    expect(acSource.terminals[0].type).toBe("ac");
    expect(acSource.terminals[0].nodeNumber).toMatch(/^N\d+$/);
    expect(new Set(acSource.terminals.map((terminal) => terminal.nodeNumber)).size).toBe(1);
  });

  test("creates load devices with one terminal and one node number", () => {
    const dcLoad = createDefaultNode("dc-load", { x: 100, y: 100 });
    const acLoad = createDefaultNode("ac-load", { x: 220, y: 100 });

    expect(dcLoad.terminals).toHaveLength(1);
    expect(dcLoad.terminals[0].type).toBe("dc");
    expect(dcLoad.terminals[0].nodeNumber).toMatch(/^N\d+$/);
    expect(new Set(dcLoad.terminals.map((terminal) => terminal.nodeNumber)).size).toBe(1);

    expect(acLoad.terminals).toHaveLength(1);
    expect(acLoad.terminals[0].type).toBe("ac");
    expect(acLoad.terminals[0].nodeNumber).toMatch(/^N\d+$/);
    expect(new Set(acLoad.terminals.map((terminal) => terminal.nodeNumber)).size).toBe(1);
  });

  test("creates DC branch devices with two DC terminals and two DC node numbers", () => {
    const dcKinds = ["dc-switch", "dc-breaker", "dc-line"] as const;

    for (const kind of dcKinds) {
      const node = createDefaultNode(kind, { x: 100, y: 100 });
      expect(node.terminals).toHaveLength(2);
      expect(node.terminals.map((terminal) => terminal.id)).toEqual(["t1", "t2"]);
      expect(node.terminals.every((terminal) => terminal.type === "dc")).toBe(true);
      expect(node.terminals[0].nodeNumber).toMatch(/^N\d+$/);
      expect(node.terminals[1].nodeNumber).toMatch(/^N\d+$/);
      expect(new Set(node.terminals.map((terminal) => terminal.nodeNumber)).size).toBe(2);
    }
  });

  test("creates AC branch devices with two AC terminals and two AC node numbers", () => {
    const acKinds = ["ac-switch", "ac-breaker", "ac-line"] as const;

    for (const kind of acKinds) {
      const node = createDefaultNode(kind, { x: 100, y: 100 });
      expect(node.terminals).toHaveLength(2);
      expect(node.terminals.map((terminal) => terminal.id)).toEqual(["t1", "t2"]);
      expect(node.terminals.every((terminal) => terminal.type === "ac")).toBe(true);
      expect(node.terminals[0].nodeNumber).toMatch(/^N\d+$/);
      expect(node.terminals[1].nodeNumber).toMatch(/^N\d+$/);
      expect(new Set(node.terminals.map((terminal) => terminal.nodeNumber)).size).toBe(2);
    }
  });

  test("includes AC and DC zero-impedance branch elements in the library and E export", () => {
    const acTemplate = DEVICE_LIBRARY.find((item) => item.kind === "ac-zero-branch");
    const dcTemplate = DEVICE_LIBRARY.find((item) => item.kind === "dc-zero-branch");
    expect(acTemplate).toMatchObject({ label: "交流零阻抗支路", group: "交流设备", terminalType: "ac", terminalCount: 2 });
    expect(dcTemplate).toMatchObject({ label: "直流零阻抗支路", group: "直流设备", terminalType: "dc", terminalCount: 2 });

    const acZeroBranch = createDefaultNode("ac-zero-branch", { x: 100, y: 100 });
    const dcZeroBranch = createDefaultNode("dc-zero-branch", { x: 260, y: 100 });
    expect(acZeroBranch.terminals.map((terminal) => terminal.type)).toEqual(["ac", "ac"]);
    expect(dcZeroBranch.terminals.map((terminal) => terminal.type)).toEqual(["dc", "dc"]);
    expect(getDeviceGlyphVariant("ac-zero-branch")).toBe("line");
    expect(getDeviceGlyphVariant("dc-zero-branch")).toBe("line");

    const exported = JSON.parse(buildEDeviceParameterFile({
      version: 1,
      name: "零阻抗支路测试",
      nodes: [acZeroBranch, dcZeroBranch],
      edges: []
    }));
    expect(exported.devices.some((device: { section: string }) => device.section === "ACZeroBranch")).toBe(true);
    expect(exported.devices.some((device: { section: string }) => device.section === "DCZeroBranch")).toBe(true);
  });

  test("uses impedance glyphs for AC lines and resistance-only glyphs for DC lines", () => {
    expect(getDeviceGlyphVariant("ac-line")).toBe("ac-line");
    expect(getDeviceGlyphVariant("dc-line")).toBe("dc-line");
    expect(getDeviceGlyphVariant("ac-zero-branch")).toBe("line");
    expect(getDeviceGlyphVariant("dc-zero-branch")).toBe("line");
  });

  test("adds editable voltage base defaults to every electrical terminal", () => {
    const acLine = createDefaultNode("ac-line", { x: 100, y: 100 });
    const dcLine = createDefaultNode("dc-line", { x: 220, y: 100 });

    expect(acLine.terminals.map((terminal) => terminal.vbase)).toEqual(["10 kV", "10 kV"]);
    expect(dcLine.terminals.map((terminal) => terminal.vbase)).toEqual(["750 V", "750 V"]);
  });

  test("normalizes terminal voltage base values to numeric-only input text", () => {
    expect(terminalVoltageBaseNumber("10 kV")).toBe("10");
    expect(terminalVoltageBaseNumber("750 V")).toBe("750");
    expect(terminalVoltageBaseNumber("1.05")).toBe("1.05");
    expect(normalizeVoltageBaseInput("abc10.5kV")).toBe("10.5");
    expect(normalizeVoltageBaseInput("12..34 V")).toBe("12.34");
    expect(normalizeVoltageBaseInput("kV")).toBe("");
  });

  test("draws fixed-length terminal stubs from the device body toward visible terminals", () => {
    expect(terminalStubSegment({ anchor: { x: 0.5, y: 0 } })).toEqual({
      from: { x: -16, y: 0 },
      to: { x: 0, y: 0 }
    });
    expect(terminalStubSegment({ anchor: { x: -0.5, y: 0 } })).toEqual({
      from: { x: 16, y: 0 },
      to: { x: 0, y: 0 }
    });
    expect(terminalStubSegment({ anchor: { x: 0, y: -0.5 } })).toEqual({
      from: { x: 0, y: 16 },
      to: { x: 0, y: 0 }
    });
    expect(terminalStubSegment({ anchor: { x: 0, y: 0.5 } })).toEqual({
      from: { x: 0, y: -16 },
      to: { x: 0, y: 0 }
    });
    expect(terminalStubSegment({ anchor: { x: 0.5, y: 0 } }, -1, 1)).toEqual({
      from: { x: 16, y: 0 },
      to: { x: 0, y: 0 }
    });
  });

  test("uses the device glyph line color and width for terminal stubs", () => {
    const acLine = createDefaultNode("ac-line", { x: 100, y: 100 });
    expect(getDeviceStrokeColor(acLine)).toBe("#2563eb");
    expect(getDeviceStrokeWidth(acLine)).toBe(4);

    const customColored = { ...acLine, params: { ...acLine.params, foregroundColor: "#123456", lineWidth: "3.5" } };
    expect(getDeviceStrokeColor(customColored)).toBe("#123456");
    expect(getDeviceStrokeWidth(customColored)).toBe(3.5);

    const dcLoad = createDefaultNode("dc-load", { x: 220, y: 100 });
    expect(getDeviceStrokeColor(dcLoad)).toBe("#0f766e");
    expect(getDeviceStrokeWidth(dcLoad)).toBe(2.5);

    const electrolyzer = createDefaultNode("ac-electrolyzer", { x: 340, y: 100 });
    expect(getDeviceStrokeColor(electrolyzer)).toBe("#7c3aed");
    expect(getDeviceStrokeWidth(electrolyzer)).toBe(2.3);
  });

  test("allocates permanent device idx by E section without reusing deleted gaps", () => {
    const firstLoad = createDefaultNode("ac-load", { x: 100, y: 100 });
    const fourthLoad = createDefaultNode("ac-load", { x: 220, y: 100 });
    firstLoad.params = { ...firstLoad.params, idx: "1" };
    fourthLoad.params = { ...fourthLoad.params, idx: "4" };

    const counters = deriveDeviceIndexCounters([firstLoad, fourthLoad]);
    const { node: nextLoad, counters: nextCounters } = assignPermanentDeviceIndex(
      createDefaultNode("ac-load", { x: 340, y: 100 }),
      counters
    );

    expect(nextLoad.params.idx).toBe("5");
    expect(nextCounters.ACLoad).toBe(5);
  });

  test("keeps idx counters independent for each E device section and skips static graphics", () => {
    const acLoad = createDefaultNode("ac-load", { x: 100, y: 100 });
    const acGenerator = createDefaultNode("ac-source", { x: 220, y: 100 });
    const text = createDefaultNode("static-text", { x: 340, y: 100 });
    acLoad.params = { ...acLoad.params, idx: "8" };
    acGenerator.params = { ...acGenerator.params, idx: "2" };

    const counters = deriveDeviceIndexCounters([acLoad, acGenerator, text]);
    const { node: nextGenerator, counters: generatorCounters } = assignPermanentDeviceIndex(
      createDefaultNode("ac-source", { x: 460, y: 100 }),
      counters
    );
    const { node: staticNode, counters: staticCounters } = assignPermanentDeviceIndex(
      createDefaultNode("static-rect", { x: 580, y: 100 }),
      generatorCounters
    );

    expect(counters).toMatchObject({ ACLoad: 8, ACGenerator: 2 });
    expect(counters).not.toHaveProperty("static-text");
    expect(nextGenerator.params.idx).toBe("3");
    expect(staticNode.params.idx).toBeUndefined();
    expect(staticCounters).toEqual(generatorCounters);
  });

  test("builds E parameter files without platform-only device fields", () => {
    const acLoad = createDefaultNode("ac-load", { x: 100, y: 100 });
    const staticText = createDefaultNode("static-text", { x: 200, y: 100 });
    acLoad.name = "load_1";
    acLoad.params = {
      ...acLoad.params,
      source_section: "ACLoad",
      idx: "7",
      node: "3",
      pbase: "9.5",
      ratedActivePower: "不要导出",
      backgroundImage: "/api/images/asset"
    };

    const payload = JSON.parse(
      buildEDeviceParameterFile({
        version: 1,
        name: "E导出模型",
        powerUnit: "MW",
        voltageUnit: "kV",
        currentUnit: "A",
        powerBaseValue: 100,
        nodes: [acLoad, staticText],
        edges: []
      })
    );

    const exportedLoad = payload.devices.find((device: { section: string; kind: string }) => device.section === "ACLoad" && device.kind === "ac-load");
    expect(payload.devices.map((device: { section: string }) => device.section)).toContain("ACNode");
    expect(exportedLoad).toMatchObject({
      id: acLoad.id,
      kind: "ac-load",
      section: "ACLoad",
      params: {
        idx: "7",
        name: "load_1",
        node: "1",
        pbase: "9.5",
        run_stat: "1"
      }
    });
    expect(exportedLoad).not.toHaveProperty("nodeNumber");
    expect(exportedLoad).not.toHaveProperty("terminals");
    expect(JSON.stringify(exportedLoad)).not.toContain("ratedActivePower");
    expect(JSON.stringify(exportedLoad)).not.toContain("backgroundImage");
  });

  test("maps graphical AC and DC buses to real bus sections in E parameter files", () => {
    const acBus = createDefaultNode("ac-bus", { x: 100, y: 100 });
    const dcBus = createDefaultNode("dc-bus", { x: 220, y: 100 });
    acBus.name = "ac_bus";
    dcBus.name = "dc_bus";
    acBus.params = { ...acBus.params, source_section: "ACNode", idx: "21", vbase: "380", run_stat: "1" };
    dcBus.params = { ...dcBus.params, source_section: "DCNode", idx: "1", vbase: "720", run_stat: "1" };
    acBus.terminals[0].nodeNumber = "21";
    dcBus.terminals[0].nodeNumber = "1";

    const payload = JSON.parse(
      buildEDeviceParameterFile({
        version: 1,
        name: "母线分组",
        nodes: [acBus, dcBus],
        edges: []
      })
    );

    const acRealBus = payload.devices.find((device: { section: string }) => device.section === "ACRealBs");
    const dcRealBus = payload.devices.find((device: { section: string }) => device.section === "DCRealBs");
    expect(payload.devices.map((device: { section: string }) => device.section)).toEqual(["ACNode", "DCNode", "ACRealBs", "DCRealBs"]);
    expect(acRealBus?.params).toEqual({
      idx: "21",
      name: "ac_bus",
      node: "1",
      run_stat: "1"
    });
    expect(dcRealBus?.params).toEqual({
      idx: "1",
      name: "dc_bus",
      node: "1",
      run_stat: "1"
    });
  });

  test("exports ACNode and DCNode records from calculated graph topology", () => {
    const acSource = createDefaultNode("ac-source", { x: 80, y: 100 });
    const acLine = createDefaultNode("ac-line", { x: 220, y: 100 });
    const acLoad = createDefaultNode("ac-load", { x: 360, y: 100 });
    const dcSource = createDefaultNode("dc-source", { x: 80, y: 240 });
    const dcLine = createDefaultNode("dc-line", { x: 220, y: 240 });
    const dcLoad = createDefaultNode("dc-load", { x: 360, y: 240 });
    acSource.name = "ac_src";
    acLoad.name = "ac_load";
    dcSource.name = "dc_src";
    dcLoad.name = "dc_load";
    acSource.terminals[0].vbase = "10 kV";
    acLine.terminals[0].vbase = "10 kV";
    acLine.terminals[1].vbase = "10 kV";
    acLoad.terminals[0].vbase = "10 kV";
    dcSource.terminals[0].vbase = "750 V";
    dcLine.terminals[0].vbase = "750 V";
    dcLine.terminals[1].vbase = "750 V";
    dcLoad.terminals[0].vbase = "750 V";
    acLine.params = { ...acLine.params, idx: "1", i_node: "99", j_node: "100" };
    acLoad.params = { ...acLoad.params, idx: "1", node: "100" };
    dcLine.params = { ...dcLine.params, idx: "1", i_node: "88", j_node: "89" };
    dcLoad.params = { ...dcLoad.params, idx: "1", node: "89" };

    const payload = JSON.parse(
      buildEDeviceParameterFile({
        version: 1,
        name: "拓扑节点导出",
        nodes: [acSource, acLine, acLoad, dcSource, dcLine, dcLoad],
        edges: [
          { id: "ac-source-line", sourceId: acSource.id, targetId: acLine.id, sourceTerminalId: "t1", targetTerminalId: "t1" },
          { id: "ac-line-load", sourceId: acLine.id, targetId: acLoad.id, sourceTerminalId: "t2", targetTerminalId: "t1" },
          { id: "dc-source-line", sourceId: dcSource.id, targetId: dcLine.id, sourceTerminalId: "t1", targetTerminalId: "t1" },
          { id: "dc-line-load", sourceId: dcLine.id, targetId: dcLoad.id, sourceTerminalId: "t2", targetTerminalId: "t1" }
        ]
      })
    );

    const acNodes = payload.devices.filter((device: { section: string }) => device.section === "ACNode");
    const dcNodes = payload.devices.filter((device: { section: string }) => device.section === "DCNode");
    const acBranch = payload.devices.find((device: { section: string }) => device.section === "ACBranch");
    const dcBranch = payload.devices.find((device: { section: string }) => device.section === "DCBranch");
    const exportedAcLoad = payload.devices.find((device: { section: string; kind: string }) => device.section === "ACLoad" && device.kind === "ac-load");
    const exportedDcLoad = payload.devices.find((device: { section: string; kind: string }) => device.section === "DCLoad" && device.kind === "dc-load");

    expect(acNodes.map((device: { params: Record<string, string> }) => device.params.idx)).toEqual(["1", "2"]);
    expect(acNodes.map((device: { params: Record<string, string> }) => device.params.name)).toEqual(["ac_src", "ac_load"]);
    expect(acNodes.map((device: { params: Record<string, string> }) => device.params.vbase)).toEqual(["10", "10"]);
    expect(dcNodes.map((device: { params: Record<string, string> }) => device.params.idx)).toEqual(["1", "2"]);
    expect(dcNodes.map((device: { params: Record<string, string> }) => device.params.name)).toEqual(["dc_src", "dc_load"]);
    expect(dcNodes.map((device: { params: Record<string, string> }) => device.params.vbase)).toEqual(["750", "750"]);
    expect(acBranch?.params).toMatchObject({ i_node: "1", j_node: "2" });
    expect(dcBranch?.params).toMatchObject({ i_node: "1", j_node: "2" });
    expect(exportedAcLoad?.params.node).toBe("2");
    expect(exportedDcLoad?.params.node).toBe("2");
  });

  test("creates load, line, and transformer electrical parameter defaults", () => {
    const acLoad = createDefaultNode("ac-load", { x: 100, y: 100 });
    const dcLoad = createDefaultNode("dc-load", { x: 200, y: 100 });
    const acLine = createDefaultNode("ac-line", { x: 300, y: 100 });
    const twoWinding = createDefaultNode("ac-two-winding-transformer", { x: 400, y: 100 });
    const threeWinding = createDefaultNode("ac-three-winding-transformer", { x: 500, y: 100 });

    expect(acLoad.nodeNumber).toMatch(/^N\d+$/);
    expect(acLoad.params.ratedActivePower).toBe("5 MW");
    expect(acLoad.params.pv0).toBe("1.0");
    expect(acLoad.params.pv1).toBe("0.0");
    expect(acLoad.params.pv2).toBe("0.0");
    expect(acLoad.params.ratedReactivePower).toBe("1.2 Mvar");
    expect(acLoad.params.qv0).toBe("1.0");
    expect(acLoad.params.qv1).toBe("0.0");
    expect(acLoad.params.qv2).toBe("0.0");
    expect(dcLoad.params.ratedReactivePower).toBeUndefined();

    expect(acLine.terminals[0].nodeNumber).toMatch(/^N\d+$/);
    expect(acLine.terminals[1].nodeNumber).toMatch(/^N\d+$/);
    expect(acLine.params.resistancePu).toBe("0.0");
    expect(acLine.params.reactancePu).toBe("0.1");
    expect(acLine.params.halfChargingSusceptancePu).toBe("0.0");

    expect(twoWinding.terminals).toHaveLength(2);
    expect(twoWinding.params.ratedCapacity).toBe("50 MVA");
    expect(twoWinding.params.resistancePu).toBe("0.0");
    expect(twoWinding.params.reactancePu).toBe("0.1");
    expect(twoWinding.params.magnetizingConductancePu).toBe("0.0");
    expect(twoWinding.params.magnetizingSusceptancePu).toBe("0.0");
    expect(twoWinding.params.tapRatio).toBe("1.0");

    expect(threeWinding.terminals).toHaveLength(3);
    expect(threeWinding.params.highRatedCapacity).toBe("90 MVA");
    expect(threeWinding.params.mediumRatedCapacity).toBe("90 MVA");
    expect(threeWinding.params.lowRatedCapacity).toBe("90 MVA");
    expect(threeWinding.params.highTapRatio).toBe("1.0");
    expect(threeWinding.params.mediumTapRatio).toBe("1.0");
    expect(threeWinding.params.lowTapRatio).toBe("1.0");

    const dcdc = createDefaultNode("dcdc-converter", { x: 600, y: 100 });
    expect(dcdc.terminals[0].nodeNumber).toMatch(/^N\d+$/);
    expect(dcdc.terminals[1].nodeNumber).toMatch(/^N\d+$/);
    expect(dcdc.params.sourceEquivalentResistance).toBe("0.0");
    expect(dcdc.params.targetEquivalentResistance).toBe("0.0");
    expect(dcdc.params.sourceControlType).toBe("定P");
    expect(dcdc.params.targetControlType).toBe("不定");

    const acdc = createDefaultNode("acdc-converter", { x: 700, y: 100 });
    expect(acdc.params.sourceEquivalentResistance).toBe("0.0");
    expect(acdc.params.targetEquivalentResistance).toBe("0.0");
    expect(acdc.params.acControlType).toBe("定PQ");
    expect(acdc.params.dcControlType).toBe("不定");

    const acac = createDefaultNode("acac-converter", { x: 800, y: 100 });
    expect(acac.params.sourceEquivalentResistance).toBe("0.0");
    expect(acac.params.targetEquivalentResistance).toBe("0.0");
    expect(acac.params.sourceControlType).toBe("定PQ");
    expect(acac.params.targetControlType).toBe("不定");

    const dcLine = createDefaultNode("dc-line", { x: 900, y: 100 });
    expect(dcLine.params.resistancePu).toBe("0.0");
    expect(dcLine.params.reactancePu).toBeUndefined();
    expect(dcLine.params.halfChargingSusceptancePu).toBeUndefined();

    const acSwitch = createDefaultNode("ac-switch", { x: 1000, y: 100 });
    const dcBreaker = createDefaultNode("dc-breaker", { x: 1100, y: 100 });
    expect(acSwitch.terminals[0].nodeNumber).toMatch(/^N\d+$/);
    expect(acSwitch.terminals[1].nodeNumber).toMatch(/^N\d+$/);
    expect(acSwitch.params.ratedCapacity).toBe("1250 A");
    expect(acSwitch.params.closedStatus).toBe("闭合");
    expect(getSwitchVisualState(acSwitch)).toBe("closed");
    acSwitch.params.status = "0";
    expect(getSwitchVisualState(acSwitch)).toBe("open");
    acSwitch.params.status = "1";
    expect(getSwitchVisualState(acSwitch)).toBe("closed");
    delete dcBreaker.params.status;
    dcBreaker.params.closedStatus = "打开";
    expect(getSwitchVisualState(dcBreaker)).toBe("open");
    dcBreaker.params.status = "1";
    expect(getSwitchVisualState(dcBreaker)).toBe("closed");
  });

  test("routes orthogonal connection around interfering devices", () => {
    const source = createDefaultNode("ac-bus", { x: 100, y: 100 });
    const target = createDefaultNode("ac-load", { x: 420, y: 100 });
    const blocker = createDefaultNode("ac-switch", { x: 260, y: 100 });

    const points = routeOrthogonalEdge(source, target, [source, target, blocker]);

    expect(points.length).toBeGreaterThan(2);
    for (let index = 1; index < points.length; index += 1) {
      const prev = points[index - 1];
      const point = points[index];
      expect(prev.x === point.x || prev.y === point.y).toBe(true);
    }
    const blockerBox = {
      left: blocker.position.x - blocker.size.width / 2 - 8,
      right: blocker.position.x + blocker.size.width / 2 + 8,
      top: blocker.position.y - blocker.size.height / 2 - 8,
      bottom: blocker.position.y + blocker.size.height / 2 + 8
    };
    expect(
      points.some(
        (point) =>
          point.x > blockerBox.left &&
          point.x < blockerBox.right &&
          point.y > blockerBox.top &&
          point.y < blockerBox.bottom
      )
    ).toBe(false);
    for (let index = 1; index < points.length; index += 1) {
      const prev = points[index - 1];
      const point = points[index];
      if (prev.x === point.x) {
        const yMin = Math.min(prev.y, point.y);
        const yMax = Math.max(prev.y, point.y);
        expect(prev.x > blockerBox.left && prev.x < blockerBox.right && yMax > blockerBox.top && yMin < blockerBox.bottom).toBe(false);
      }
      if (prev.y === point.y) {
        const xMin = Math.min(prev.x, point.x);
        const xMax = Math.max(prev.x, point.x);
        expect(prev.y > blockerBox.top && prev.y < blockerBox.bottom && xMax > blockerBox.left && xMin < blockerBox.right).toBe(false);
      }
    }
  });

  test("repairs manual connection paths that would be covered by a device", () => {
    const source = createDefaultNode("ac-source", { x: 100, y: 100 });
    const target = createDefaultNode("ac-load", { x: 460, y: 100 });
    const blocker = createDefaultNode("ac-switch", { x: 280, y: 100 });
    const edge: Edge = {
      id: "manual-covered",
      sourceId: source.id,
      targetId: target.id,
      sourceTerminalId: "t1",
      targetTerminalId: "t1",
      manualPoints: [
        { x: 220, y: 100 },
        { x: 340, y: 100 }
      ]
    };
    const blockerBox = {
      left: blocker.position.x - blocker.size.width / 2 - 8,
      right: blocker.position.x + blocker.size.width / 2 + 8,
      top: blocker.position.y - blocker.size.height / 2 - 8,
      bottom: blocker.position.y + blocker.size.height / 2 + 8
    };

    const route = routeEdgesForRendering([source, target, blocker], [edge], { width: 640, height: 260 })[0];

    for (let index = 1; index < route.points.length; index += 1) {
      const prev = route.points[index - 1];
      const point = route.points[index];
      expect(prev.x === point.x || prev.y === point.y).toBe(true);
      if (prev.x === point.x) {
        const yMin = Math.min(prev.y, point.y);
        const yMax = Math.max(prev.y, point.y);
        expect(prev.x > blockerBox.left && prev.x < blockerBox.right && yMax > blockerBox.top && yMin < blockerBox.bottom).toBe(false);
      }
      if (prev.y === point.y) {
        const xMin = Math.min(prev.x, point.x);
        const xMax = Math.max(prev.x, point.x);
        expect(prev.y > blockerBox.top && prev.y < blockerBox.bottom && xMax > blockerBox.left && xMin < blockerBox.right).toBe(false);
      }
    }
  });

  test("keeps terminal stubs perpendicular after local obstacle repair", () => {
    const source = createDefaultNode("ac-source", { x: 100, y: 100 });
    const target = createDefaultNode("ac-load", { x: 420, y: 100 });
    const blocker = createDefaultNode("ac-switch", { x: 190, y: 100 });
    const edge: Edge = {
      id: "near-terminal-obstacle",
      sourceId: source.id,
      targetId: target.id,
      sourceTerminalId: "t1",
      targetTerminalId: "t1"
    };

    const route = routeEdgesForRendering([source, target, blocker], [edge], { width: 640, height: 260 })[0];
    const sourceTerminal = getTerminalPoint(source, "t1");
    const targetTerminal = getTerminalPoint(target, "t1");

    expect(route.points[0]).toEqual(sourceTerminal);
    expect(route.points[1].y).toBe(sourceTerminal.y);
    expect(route.points[1].x).toBeGreaterThan(sourceTerminal.x);
    expect(route.points[route.points.length - 1]).toEqual(targetTerminal);
    expect(route.points[route.points.length - 2].y).toBe(targetTerminal.y);
    expect(route.points[route.points.length - 2].x).toBeGreaterThan(targetTerminal.x);
  });

  test("keeps automatic obstacle detours local instead of routing to canvas edges", () => {
    const source = createDefaultNode("ac-bus", { x: 100, y: 100 });
    const target = createDefaultNode("ac-load", { x: 420, y: 100 });
    const blocker = createDefaultNode("ac-switch", { x: 260, y: 100 });
    const route = routeEdgesForRendering(
      [source, target, blocker],
      [{ id: "local-detour", sourceId: source.id, targetId: target.id, sourceTerminalId: "t1", targetTerminalId: "t1" }],
      { width: 640, height: 260 }
    )[0];

    const yValues = route.points.map((point) => point.y);
    expect(Math.max(...yValues)).toBeLessThanOrEqual(blocker.position.y + blocker.size.height / 2 + 40);
    expect(Math.min(...yValues)).toBeGreaterThanOrEqual(blocker.position.y - blocker.size.height / 2 - 40);
  });

  test("clamps a moved device inside the display area", () => {
    const node = createDefaultNode("ac-source", { x: -100, y: 900 });
    const position = clampNodePositionToBounds(node, { width: 1980, height: 1024 });

    expect(position.x).toBeGreaterThanOrEqual((node.size.width * Math.abs(node.scaleX ?? node.scale)) / 2);
    expect(position.y).toBeLessThanOrEqual(1024 - (node.size.height * Math.abs(node.scaleY ?? node.scale)) / 2);
  });

  test("centers the drawing area when the SVG view box is larger than the canvas", () => {
    expect(normalizeViewBoxToCanvas({ x: 0, y: 0, width: 3000, height: 1800 }, { width: 1980, height: 1024 })).toMatchObject({
      x: -510,
      y: -388
    });
    expect(normalizeViewBoxToCanvas({ x: 900, y: 600, width: 1200, height: 800 }, { width: 1980, height: 1024 })).toMatchObject({
      x: 780,
      y: 224
    });
  });

  test("keeps routed connection points inside the display area", () => {
    const source = createDefaultNode("ac-source", { x: 42, y: 120 });
    const target = createDefaultNode("ac-load", { x: 330, y: 120 });
    const edge: Edge = {
      id: "bounded-route",
      sourceId: source.id,
      targetId: target.id,
      sourceTerminalId: "t1",
      targetTerminalId: "t1"
    };

    const route = routeEdgesForRendering([source, target], [edge], { width: 360, height: 240 })[0];

    for (const point of route.points) {
      expect(point.x).toBeGreaterThanOrEqual(0);
      expect(point.x).toBeLessThanOrEqual(360);
      expect(point.y).toBeGreaterThanOrEqual(0);
      expect(point.y).toBeLessThanOrEqual(240);
    }
    for (let index = 1; index < route.points.length; index += 1) {
      expect(route.points[index - 1].x === route.points[index].x || route.points[index - 1].y === route.points[index].y).toBe(true);
    }
  });

  test("keeps every routed segment orthogonal without diagonal fallbacks", () => {
    const left = createDefaultNode("ac-bus", { x: 100, y: 240 });
    const right = createDefaultNode("ac-bus", { x: 500, y: 240 });
    const top = createDefaultNode("ac-bus", { x: 300, y: 80 });
    const bottom = createDefaultNode("ac-bus", { x: 300, y: 400 });
    const load = createDefaultNode("ac-load", { x: 620, y: 160 });
    const routes = routeEdgesForRendering(
      [left, right, top, bottom, load],
      [
        { id: "horizontal", sourceId: left.id, targetId: right.id, sourceTerminalId: "t2", targetTerminalId: "t1" },
        { id: "vertical", sourceId: top.id, targetId: bottom.id, sourceTerminalId: "t4", targetTerminalId: "t3" },
        { id: "mixed", sourceId: right.id, targetId: load.id, sourceTerminalId: "t2", targetTerminalId: "t1" }
      ]
    );

    for (const route of routes) {
      for (let index = 1; index < route.points.length; index += 1) {
        const previous = route.points[index - 1];
        const point = route.points[index];
        expect(previous.x === point.x || previous.y === point.y).toBe(true);
      }
    }
  });

  test("keeps routed connection segments from overlapping previous routed lines", () => {
    const leftA = createDefaultNode("ac-source", { x: 120, y: 120 });
    const rightA = createDefaultNode("ac-load", { x: 520, y: 120 });
    const leftB = createDefaultNode("ac-source", { x: 120, y: 220 });
    const rightB = createDefaultNode("ac-load", { x: 520, y: 220 });

    const routes = routeEdgesForRendering(
      [leftA, rightA, leftB, rightB],
      [
        { id: "edge-a", sourceId: leftA.id, targetId: rightA.id, sourceTerminalId: "t1", targetTerminalId: "t1" },
        { id: "edge-b", sourceId: leftB.id, targetId: rightB.id, sourceTerminalId: "t1", targetTerminalId: "t1" }
      ]
    );

    const segments = routes.map((route) =>
      route.points.slice(1).map((point, index) => ({ a: route.points[index], b: point }))
    );
    const overlapAmount = (first: { a: Point; b: Point }, second: { a: Point; b: Point }) => {
      if (first.a.y === first.b.y && second.a.y === second.b.y && first.a.y === second.a.y) {
        const left = Math.max(Math.min(first.a.x, first.b.x), Math.min(second.a.x, second.b.x));
        const right = Math.min(Math.max(first.a.x, first.b.x), Math.max(second.a.x, second.b.x));
        return Math.max(0, right - left);
      }
      if (first.a.x === first.b.x && second.a.x === second.b.x && first.a.x === second.a.x) {
        const top = Math.max(Math.min(first.a.y, first.b.y), Math.min(second.a.y, second.b.y));
        const bottom = Math.min(Math.max(first.a.y, first.b.y), Math.max(second.a.y, second.b.y));
        return Math.max(0, bottom - top);
      }
      return 0;
    };

    expect(segments[1].some((segment) => segments[0].some((previous) => overlapAmount(segment, previous) > 2))).toBe(false);
  });

  test("does not reroute unrelated lines when a far non-interfering device moves", () => {
    const source = createDefaultNode("ac-source", { x: 120, y: 140 });
    const target = createDefaultNode("ac-load", { x: 420, y: 140 });
    const unrelated = createDefaultNode("ac-switch", { x: 1200, y: 840 });
    const movedUnrelated = { ...unrelated, position: { x: 1400, y: 980 } };
    const edge: Edge = {
      id: "stable-line",
      sourceId: source.id,
      targetId: target.id,
      sourceTerminalId: "t1",
      targetTerminalId: "t1"
    };

    const before = routeEdgesForRendering([source, target, unrelated], [edge])[0].points;
    const after = routeEdgesForRendering([source, target, movedUnrelated], [edge])[0].points;

    expect(after).toEqual(before);
  });

  test("anchors route endpoints on terminals and leaves terminals perpendicularly", () => {
    const source = createDefaultNode("ac-line", { x: 120, y: 120 });
    const target = createDefaultNode("ac-line", { x: 420, y: 120 });
    const edge: Edge = {
      id: "e-terminal",
      sourceId: source.id,
      targetId: target.id,
      sourceTerminalId: "t2",
      targetTerminalId: "t1"
    };

    const points = routeOrthogonalEdge(source, target, [source, target], edge);
    const sourceTerminal = getTerminalPoint(source, "t2");
    const targetTerminal = getTerminalPoint(target, "t1");

    expect(points[0]).toEqual(sourceTerminal);
    expect(points[points.length - 1]).toEqual(targetTerminal);
    expect(points[1].y).toBe(sourceTerminal.y);
    expect(points[1].x).toBeGreaterThan(sourceTerminal.x);
    expect(points[points.length - 2].y).toBe(targetTerminal.y);
    expect(points[points.length - 2].x).toBeLessThan(targetTerminal.x);
  });

  test("keeps same-side endpoint stubs outside device bodies", () => {
    const source = createDefaultNode("ac-source", { x: 100, y: 120 });
    const target = createDefaultNode("ac-load", { x: 420, y: 120 });
    const edge: Edge = {
      id: "same-side-terminals",
      sourceId: source.id,
      targetId: target.id,
      sourceTerminalId: "t1",
      targetTerminalId: "t1"
    };

    const points = routeOrthogonalEdge(source, target, [source, target], edge);
    const sourceTerminal = getTerminalPoint(source, "t1");
    const targetTerminal = getTerminalPoint(target, "t1");
    const targetBox = {
      left: target.position.x - target.size.width / 2 - 8,
      right: target.position.x + target.size.width / 2 + 8,
      top: target.position.y - target.size.height / 2 - 8,
      bottom: target.position.y + target.size.height / 2 + 8
    };

    expect(points[0]).toEqual(sourceTerminal);
    expect(points[1].y).toBe(sourceTerminal.y);
    expect(points[1].x).toBeGreaterThan(sourceTerminal.x);
    expect(points[1].x - sourceTerminal.x).toBeLessThanOrEqual(40);
    expect(points[points.length - 1]).toEqual(targetTerminal);
    expect(points[points.length - 2].y).toBe(targetTerminal.y);
    expect(points[points.length - 2].x).toBeGreaterThan(targetTerminal.x);
    expect(points[points.length - 2].x - targetTerminal.x).toBeLessThanOrEqual(40);

    const yValues = points.map((point) => point.y);
    expect(Math.min(...yValues)).toBeGreaterThanOrEqual(Math.min(source.position.y - source.size.height / 2, target.position.y - target.size.height / 2) - 48);
    expect(Math.max(...yValues)).toBeLessThanOrEqual(Math.max(source.position.y + source.size.height / 2, target.position.y + target.size.height / 2) + 48);

    for (let index = 2; index < points.length - 1; index += 1) {
      const prev = points[index - 1];
      const point = points[index];
      if (prev.y === point.y) {
        const xMin = Math.min(prev.x, point.x);
        const xMax = Math.max(prev.x, point.x);
        expect(prev.y > targetBox.top && prev.y < targetBox.bottom && xMax > targetBox.left && xMin < targetBox.right).toBe(false);
      }
      if (prev.x === point.x) {
        const yMin = Math.min(prev.y, point.y);
        const yMax = Math.max(prev.y, point.y);
        expect(prev.x > targetBox.left && prev.x < targetBox.right && yMax > targetBox.top && yMin < targetBox.bottom).toBe(false);
      }
    }
  });

  test("routes around rotated device bodies using their visual bounds", () => {
    const source = createDefaultNode("ac-line", { x: 100, y: 150 });
    const target = createDefaultNode("ac-line", { x: 420, y: 150 });
    const blocker = { ...createDefaultNode("ac-line", { x: 260, y: 100 }), rotation: 90 };
    const edge: Edge = {
      id: "rotated-blocker",
      sourceId: source.id,
      targetId: target.id,
      sourceTerminalId: "t2",
      targetTerminalId: "t1"
    };

    const route = routeEdgesForRendering([source, target, blocker], [edge], { width: 640, height: 260 })[0];
    const blockerBox = {
      left: blocker.position.x - blocker.size.height / 2 - 8,
      right: blocker.position.x + blocker.size.height / 2 + 8,
      top: blocker.position.y - blocker.size.width / 2 - 8,
      bottom: blocker.position.y + blocker.size.width / 2 + 8
    };

    for (let index = 1; index < route.points.length; index += 1) {
      const prev = route.points[index - 1];
      const point = route.points[index];
      expect(prev.x === point.x || prev.y === point.y).toBe(true);
      if (prev.x === point.x) {
        const yMin = Math.min(prev.y, point.y);
        const yMax = Math.max(prev.y, point.y);
        expect(prev.x > blockerBox.left && prev.x < blockerBox.right && yMax > blockerBox.top && yMin < blockerBox.bottom).toBe(false);
      }
      if (prev.y === point.y) {
        const xMin = Math.min(prev.x, point.x);
        const xMax = Math.max(prev.x, point.x);
        expect(prev.y > blockerBox.top && prev.y < blockerBox.bottom && xMax > blockerBox.left && xMin < blockerBox.right).toBe(false);
      }
    }
  });

  test("uses mirrored terminal normals after horizontal flips", () => {
    const source = { ...createDefaultNode("ac-source", { x: 200, y: 120 }), scaleX: -1 };
    const target = createDefaultNode("ac-line", { x: 80, y: 120 });
    const edge: Edge = {
      id: "mirrored-terminal",
      sourceId: source.id,
      targetId: target.id,
      sourceTerminalId: "t1",
      targetTerminalId: "t2"
    };

    const points = routeOrthogonalEdge(source, target, [source, target], edge);
    const sourceTerminal = getTerminalPoint(source, "t1");

    expect(points[0]).toEqual(sourceTerminal);
    expect(points[1].y).toBe(sourceTerminal.y);
    expect(points[1].x).toBeLessThan(sourceTerminal.x);
  });

  test("mirrors selected graphical nodes by flipping only the requested scale axis", () => {
    const selected = { ...createDefaultNode("ac-source", { x: 200, y: 120 }), scale: 1.5, scaleX: 1.5, scaleY: 1.5 };
    const other = createDefaultNode("static-rect", { x: 320, y: 120 });

    const horizontallyMirrored = mirrorNodes([selected, other], [selected.id], "horizontal");
    expect(getNodeScaleX(horizontallyMirrored[0])).toBe(-1.5);
    expect(getNodeScaleY(horizontallyMirrored[0])).toBe(1.5);
    expect(horizontallyMirrored[0].position).toEqual(selected.position);
    expect(getNodeScaleX(horizontallyMirrored[1])).toBe(getNodeScaleX(other));

    const verticallyMirrored = mirrorNodes(horizontallyMirrored, [selected.id], "vertical");
    expect(getNodeScaleX(verticallyMirrored[0])).toBe(-1.5);
    expect(getNodeScaleY(verticallyMirrored[0])).toBe(-1.5);

    const restoredHorizontal = mirrorNodes(verticallyMirrored, [selected.id], "horizontal");
    expect(getNodeScaleX(restoredHorizontal[0])).toBe(1.5);
    expect(getNodeScaleY(restoredHorizontal[0])).toBe(-1.5);
  });

  test("uses vertical terminal normals for top and bottom terminals", () => {
    const source = createDefaultNode("ac-bus", { x: 200, y: 220 });
    const target = createDefaultNode("ac-bus", { x: 200, y: 520 });
    const edge: Edge = {
      id: "e-vertical-terminal",
      sourceId: source.id,
      targetId: target.id,
      sourceTerminalId: "t4",
      targetTerminalId: "t3"
    };

    const points = routeOrthogonalEdge(source, target, [source, target], edge);
    const sourceTerminal = getTerminalPoint(source, "t4");
    const targetTerminal = getTerminalPoint(target, "t3");

    expect(points[0]).toEqual(sourceTerminal);
    expect(points[1].x).toBe(sourceTerminal.x);
    expect(points[1].y).toBeGreaterThan(sourceTerminal.y);
    expect(points[points.length - 1]).toEqual(targetTerminal);
    expect(points[points.length - 2].x).toBe(targetTerminal.x);
    expect(points[points.length - 2].y).toBeLessThan(targetTerminal.y);
  });

  test("connects buses perpendicularly even when legacy terminal ids are present", () => {
    const source = createDefaultNode("ac-bus", { x: 200, y: 220 });
    const target = createDefaultNode("ac-line", { x: 520, y: 220 });
    const edge: Edge = {
      id: "e-mixed-terminal",
      sourceId: source.id,
      targetId: target.id,
      sourceTerminalId: "t3",
      targetTerminalId: "t1"
    };

    const points = routeOrthogonalEdge(source, target, [source, target], edge);
    const sourceTerminal = getTerminalPoint(source, "t3");

    expect(points[0]).toEqual(sourceTerminal);
    expect(points[1].x).toBe(sourceTerminal.x);
    expect(points[1].y).not.toBe(sourceTerminal.y);
  });

  test("connects to arbitrary bus points with a perpendicular final segment", () => {
    const source = createDefaultNode("ac-line", { x: 160, y: 120 });
    const bus = createDefaultNode("ac-bus", { x: 420, y: 220 });
    const busPoint = { x: 380, y: 220 };
    const edge: Edge = {
      id: "e-bus-point",
      sourceId: source.id,
      targetId: bus.id,
      sourceTerminalId: "t2",
      targetTerminalId: "t1",
      targetPoint: busPoint
    };

    const points = routeOrthogonalEdge(source, bus, [source, bus], edge);
    const finalPoint = points[points.length - 1];
    const beforeFinal = points[points.length - 2];

    expect(finalPoint).toEqual(busPoint);
    expect(beforeFinal.x).toBe(busPoint.x);
    expect(beforeFinal.y).not.toBe(busPoint.y);
  });

  test("allows only terminals with the same electrical type to connect", () => {
    const acBus = createDefaultNode("ac-bus", { x: 100, y: 100 });
    const acLoad = createDefaultNode("ac-load", { x: 240, y: 100 });
    const dcLoad = createDefaultNode("dc-load", { x: 380, y: 100 });

    expect(canConnectTerminals(acBus, acBus.terminals[0].id, acLoad, acLoad.terminals[0].id)).toBe(true);
    expect(canConnectTerminals(acBus, acBus.terminals[0].id, dcLoad, dcLoad.terminals[0].id)).toBe(false);
  });

  test("aligns selected nodes horizontally and vertically without moving unselected nodes", () => {
    const nodes: ModelNode[] = [
      createDefaultNode("ac-source", { x: 100, y: 100 }),
      createDefaultNode("ac-switch", { x: 260, y: 180 }),
      createDefaultNode("ac-load", { x: 420, y: 260 })
    ];
    const selectedIds = [nodes[0].id, nodes[2].id];

    const horizontal = alignNodes(nodes, selectedIds, "horizontal");
    expect(horizontal.find((node) => node.id === nodes[0].id)?.position.y).toBe(180);
    expect(horizontal.find((node) => node.id === nodes[2].id)?.position.y).toBe(180);
    expect(horizontal.find((node) => node.id === nodes[1].id)?.position).toEqual({ x: 260, y: 180 });

    const vertical = alignNodes(nodes, selectedIds, "vertical");
    expect(vertical.find((node) => node.id === nodes[0].id)?.position.x).toBe(260);
    expect(vertical.find((node) => node.id === nodes[2].id)?.position.x).toBe(260);
    expect(vertical.find((node) => node.id === nodes[1].id)?.position).toEqual({ x: 260, y: 180 });
  });

  test("includes specialized AC and DC source device types with matching terminal types", () => {
    const expected = [
      ["ac-wind-source", "ac"],
      ["dc-wind-source", "dc"],
      ["ac-pv-source", "ac"],
      ["dc-pv-source", "dc"],
      ["ac-thermal-source", "ac"],
      ["ac-hydro-source", "ac"],
      ["ac-nuclear-source", "ac"]
    ];

    for (const [kind, terminalType] of expected) {
      const template = DEVICE_LIBRARY.find((item) => item.kind === kind);
      expect(template?.terminalType).toBe(terminalType);
    }
  });

  test("includes DC electrochemical storage as a single-port DC device", () => {
    const template = DEVICE_LIBRARY.find((item) => item.kind === "dc-storage");
    expect(template).toMatchObject({
      label: "电化学储能",
      group: "直流设备",
      terminalType: "dc",
      terminalCount: 1
    });

    const node = createDefaultNode("dc-storage", { x: 100, y: 100 });
    expect(node.terminals).toHaveLength(1);
    expect(node.terminals[0].type).toBe("dc");
    expect(node.params.vbase).toBe("750 V");
    expect(getDeviceGlyphVariant("dc-storage")).toBe("battery-storage");
  });

  test("includes AC electrochemical storage as a single-port AC device", () => {
    const template = DEVICE_LIBRARY.find((item) => item.kind === "ac-storage");
    expect(template).toMatchObject({
      label: "电化学储能",
      group: "交流设备",
      terminalType: "ac",
      terminalCount: 1
    });

    const node = createDefaultNode("ac-storage", { x: 100, y: 100 });
    expect(node.terminals).toHaveLength(1);
    expect(node.terminals[0].type).toBe("ac");
    expect(node.params.vbase).toBe("10 kV");
    expect(getDeviceGlyphVariant("ac-storage")).toBe("battery-storage");
  });

  test("includes hydrogen equipment library with mixed electric-hydrogen ports", () => {
    const expected = [
      ["ac-electrolyzer", "交流电制氢", ["ac", "h2"], "hydrogen-electrolyzer"],
      ["dc-electrolyzer", "直流电制氢", ["dc", "h2"], "hydrogen-electrolyzer"],
      ["hydrogen-source", "氢源", ["h2"], "hydrogen-source"],
      ["hydrogen-tank", "储氢罐", ["h2", "h2", "h2", "h2"], "hydrogen-storage"],
      ["hydrogen-load", "氢荷", ["h2"], "hydrogen-load"],
      ["ac-fuel-cell", "交流燃料电池", ["ac", "h2"], "hydrogen-fuel-cell"],
      ["dc-fuel-cell", "直流燃料电池", ["dc", "h2"], "hydrogen-fuel-cell"],
      ["hydrogen-bus", "氢能母线", ["h2", "h2", "h2", "h2"], "hydrogen-bus"],
      ["hydrogen-compressor", "氢压机", ["h2", "h2"], "hydrogen-compressor"],
      ["hydrogen-pressure-reducer", "减压阀", ["h2", "h2"], "hydrogen-regulator"],
      ["hydrogen-shutoff-valve", "截止阀", ["h2", "h2"], "hydrogen-valve"],
      ["hydrogen-pipeline", "输氢管道", ["h2", "h2"], "hydrogen-pipeline"]
    ] as const;

    for (const [kind, label, terminalTypes, glyphVariant] of expected) {
      const template = DEVICE_LIBRARY.find((item) => item.kind === kind);
      expect(template).toMatchObject({ label, group: "氢能设备", terminalCount: terminalTypes.length });
      const node = createDefaultNode(kind, { x: 100, y: 100 });
      expect(node.terminals.map((terminal) => terminal.type)).toEqual([...terminalTypes]);
      expect(getDeviceGlyphVariant(kind)).toBe(glyphVariant);
    }

    const acElectrolyzer = createDefaultNode("ac-electrolyzer", { x: 100, y: 100 });
    const dcElectrolyzer = createDefaultNode("dc-electrolyzer", { x: 240, y: 100 });
    const hydrogenBus = createDefaultNode("hydrogen-bus", { x: 380, y: 100 });
    const hydrogenPipeline = createDefaultNode("hydrogen-pipeline", { x: 520, y: 100 });
    expect(canConnectTerminals(acElectrolyzer, "t1", dcElectrolyzer, "t1")).toBe(false);
    expect(canConnectTerminals(acElectrolyzer, "t2", hydrogenPipeline, "t1")).toBe(true);
    expect(canConnectTerminals(hydrogenBus, "t1", hydrogenPipeline, "t1")).toBe(true);

    const calculated = calculateElectricalTopology(
      [acElectrolyzer, hydrogenBus, hydrogenPipeline],
      [
        { id: "h2-bus", sourceId: acElectrolyzer.id, targetId: hydrogenBus.id, sourceTerminalId: "t2", targetTerminalId: "t1" },
        { id: "h2-pipe", sourceId: hydrogenBus.id, targetId: hydrogenPipeline.id, sourceTerminalId: "t2", targetTerminalId: "t1" }
      ]
    );
    const calculatedElectrolyzer = calculated.find((node) => node.id === acElectrolyzer.id)!;
    const calculatedPipeline = calculated.find((node) => node.id === hydrogenPipeline.id)!;
    expect(calculatedElectrolyzer.terminals[1].nodeNumber).toBe(calculatedPipeline.terminals[0].nodeNumber);
  });

  test("includes thermal equipment library with heat network and mixed electric-thermal ports", () => {
    const expected = [
      ["heat-boiler", "供热锅炉", ["heat"], "heat-boiler"],
      ["two-port-heat-boiler", "供热锅炉2", ["heat", "heat"], "heat-boiler"],
      ["heat-source", "单端热源", ["heat"], "heat-source"],
      ["two-port-heat-source", "双端热源", ["heat", "heat"], "heat-source"],
      ["heat-exchanger", "双端热交换器", ["heat", "heat"], "heat-exchanger-two"],
      ["three-port-heat-exchanger", "三端热交换器", ["heat", "heat", "heat"], "heat-exchanger-three"],
      ["four-port-heat-exchanger", "四端热交换器", ["heat", "heat", "heat", "heat"], "heat-exchanger-four"],
      ["ac-heater", "交流电制热", ["ac", "heat"], "heat-electric-heater"],
      ["ac-two-port-heater", "交流电制热2", ["ac", "heat", "heat"], "heat-electric-heater"],
      ["dc-heater", "直流电制热", ["dc", "heat"], "heat-electric-heater"],
      ["dc-two-port-heater", "直流电制热2", ["dc", "heat", "heat"], "heat-electric-heater"],
      ["thermal-storage-tank", "储热罐", ["heat", "heat", "heat", "heat"], "heat-storage"],
      ["heat-load", "热负荷", ["heat"], "heat-load"],
      ["single-port-heat-load", "单端热荷", ["heat"], "heat-load"],
      ["two-port-heat-load", "双端热荷", ["heat", "heat"], "heat-load"],
      ["heat-bus", "热力母线", ["heat", "heat", "heat", "heat"], "heat-bus"],
      ["heat-pipeline", "输热管道", ["heat", "heat"], "heat-pipeline"],
      ["heat-pump", "循环水泵", ["heat", "heat"], "heat-pump"],
      ["heat-shutoff-valve", "截止阀", ["heat", "heat"], "heat-valve"]
    ] as const;

    for (const [kind, label, terminalTypes, glyphVariant] of expected) {
      const template = DEVICE_LIBRARY.find((item) => item.kind === kind);
      expect(template).toMatchObject({ label, group: "热能设备", terminalCount: terminalTypes.length });
      const node = createDefaultNode(kind, { x: 100, y: 100 });
      expect(node.terminals.map((terminal) => terminal.type)).toEqual([...terminalTypes]);
      expect(getDeviceGlyphVariant(kind)).toBe(glyphVariant);
    }

    const threePort = createDefaultNode("three-port-heat-exchanger", { x: 100, y: 100 });
    expect(threePort.terminals.map((terminal) => terminal.label)).toEqual(["单端侧", "双端侧供水", "双端侧回水"]);
    expect(threePort.terminals.map((terminal) => terminal.anchor)).toEqual([
      { x: -0.5, y: 0 },
      { x: 0.5, y: -0.25 },
      { x: 0.5, y: 0.25 }
    ]);

    const fourPort = createDefaultNode("four-port-heat-exchanger", { x: 100, y: 100 });
    expect(fourPort.terminals.map((terminal) => terminal.label)).toEqual(["一侧供水", "一侧回水", "二侧供水", "二侧回水"]);
    expect(fourPort.terminals.map((terminal) => terminal.anchor)).toEqual([
      { x: -0.5, y: -0.25 },
      { x: -0.5, y: 0.25 },
      { x: 0.5, y: -0.25 },
      { x: 0.5, y: 0.25 }
    ]);

    const twoPortBoiler = createDefaultNode("two-port-heat-boiler", { x: 100, y: 100 });
    expect(twoPortBoiler.terminals.map((terminal) => terminal.label)).toEqual(["供水端", "回水端"]);
    expect(twoPortBoiler.terminals.map((terminal) => terminal.anchor)).toEqual([
      { x: 0.5, y: -0.25 },
      { x: 0.5, y: 0.25 }
    ]);

    const acTwoPortHeater = createDefaultNode("ac-two-port-heater", { x: 100, y: 100 });
    expect(acTwoPortHeater.terminals.map((terminal) => terminal.label)).toEqual(["交流端", "供水端", "回水端"]);
    expect(acTwoPortHeater.terminals.map((terminal) => terminal.anchor)).toEqual([
      { x: -0.5, y: 0 },
      { x: 0.5, y: -0.25 },
      { x: 0.5, y: 0.25 }
    ]);

    const dcTwoPortHeater = createDefaultNode("dc-two-port-heater", { x: 100, y: 100 });
    expect(dcTwoPortHeater.terminals.map((terminal) => terminal.label)).toEqual(["直流端", "供水端", "回水端"]);
    expect(dcTwoPortHeater.terminals.map((terminal) => terminal.anchor)).toEqual([
      { x: -0.5, y: 0 },
      { x: 0.5, y: -0.25 },
      { x: 0.5, y: 0.25 }
    ]);

    const acHeater = createDefaultNode("ac-heater", { x: 100, y: 100 });
    const dcHeater = createDefaultNode("dc-heater", { x: 240, y: 100 });
    const heatBus = createDefaultNode("heat-bus", { x: 380, y: 100 });
    const heatPipeline = createDefaultNode("heat-pipeline", { x: 520, y: 100 });
    expect(canConnectTerminals(acHeater, "t1", dcHeater, "t1")).toBe(false);
    expect(canConnectTerminals(acHeater, "t2", heatPipeline, "t1")).toBe(true);
    expect(canConnectTerminals(heatBus, "t1", heatPipeline, "t1")).toBe(true);

    const calculated = calculateElectricalTopology(
      [acHeater, heatBus, heatPipeline],
      [
        { id: "heat-bus-edge", sourceId: acHeater.id, targetId: heatBus.id, sourceTerminalId: "t2", targetTerminalId: "t1" },
        { id: "heat-pipeline-edge", sourceId: heatBus.id, targetId: heatPipeline.id, sourceTerminalId: "t2", targetTerminalId: "t1" }
      ]
    );
    const calculatedHeater = calculated.find((node) => node.id === acHeater.id)!;
    const calculatedPipeline = calculated.find((node) => node.id === heatPipeline.id)!;
    expect(calculatedHeater.terminals[1].nodeNumber).toBe(calculatedPipeline.terminals[0].nodeNumber);
  });

  test("creates user-defined device templates with custom terminal energy types and default parameters", () => {
    const template: DeviceTemplate = {
      kind: "ACUnit",
      label: "ACUnit",
      group: "自定义元件库",
      size: { width: 104, height: 64 },
      params: { backgroundImage: "data:image/svg+xml,custom", fillColor: "transparent", strokeColor: "transparent", lineWidth: "0" },
      terminalType: "ac",
      terminalCount: 4,
      terminalTypes: ["ac", "dc", "h2", "heat"],
      terminalLabels: ["交流端", "直流端", "氢能端", "热能端"],
      custom: true,
      parameterDefinitions: [
        { cnName: "序号", enName: "idx", valueType: "integer", typicalValue: "", readonly: true },
        { cnName: "名称", enName: "name", valueType: "string", typicalValue: "", readonly: true },
        { cnName: "运行状态", enName: "run_stat", valueType: "enum", typicalValue: "运行", readonly: true },
        { cnName: "额定效率", enName: "eta", valueType: "float", typicalValue: "0.95" }
      ]
    };

    const node = createNodeFromTemplate(template, { x: 100, y: 120 });
    expect(node.kind).toBe("ACUnit");
    expect(node.terminals.map((terminal) => terminal.type)).toEqual(["ac", "dc", "h2", "heat"]);
    expect(node.terminals.map((terminal) => terminal.label)).toEqual(["交流端", "直流端", "氢能端", "热能端"]);
    expect(node.params[CUSTOM_DEVICE_TEMPLATE_KEY]).toBe("1");
    expect(JSON.parse(node.params[CUSTOM_PARAM_DEFINITIONS_KEY])).toHaveLength(4);
    expect(node.params.eta).toBe("0.95");
    expect(node.params.strokeColor).toBe("transparent");
    expect(canConnectTerminals(node, "t3", createDefaultNode("hydrogen-pipeline", { x: 240, y: 120 }), "t1")).toBe(true);
    expect(canConnectTerminals(node, "t4", createDefaultNode("hydrogen-pipeline", { x: 300, y: 120 }), "t1")).toBe(false);

    const firstIndexed = assignPermanentDeviceIndex(node, {});
    const secondIndexed = assignPermanentDeviceIndex(createNodeFromTemplate(template, { x: 180, y: 120 }), firstIndexed.counters);
    expect(firstIndexed.node.params.idx).toBe("1");
    expect(secondIndexed.node.params.idx).toBe("2");
  });

  test("creates container device definitions with association idx fields instead of topology node fields", () => {
    const terminalTypes = ["ac", "dc", "heat", "heat"] as const;
    const terminalRoles = ["single-load", "single-source", "double-source", "single-load"] as const;
    const definitions = buildDefaultDeviceParameterDefinitions(terminalTypes, {
      isContainer: true,
      terminalRoles
    });

    expect(getContainerRelationKey("ac", "single-load", 0)).toBe("idx_ac_load_t1");
    expect(getContainerRelationKey("dc", "single-source", 1)).toBe("idx_dc_unit_t2");
    expect(getContainerRelationKey("heat", "double-source", 2)).toBe("idx_heat2_unit_t3");
    expect(getContainerRelationKey("heat", "single-load", 3)).toBe("idx_heat_load_t4");
    expect(definitions.map((definition) => definition.enName)).toEqual([
      "idx",
      "name",
      "run_stat",
      "is_container",
      "idx_ac_load_t1",
      "idx_dc_unit_t2",
      "idx_heat2_unit_t3",
      "idx_heat2_unit_t4"
    ]);
    expect(definitions.some((definition) => definition.enName.includes("node"))).toBe(false);

    const template: DeviceTemplate = {
      kind: "CustomContainer",
      label: "CustomContainer",
      group: "自定义元件库",
      size: { width: 104, height: 64 },
      params: { backgroundImage: "data:image/svg+xml,custom", fillColor: "transparent", strokeColor: "transparent", lineWidth: "0" },
      terminalType: "ac",
      terminalCount: terminalTypes.length,
      terminalTypes: [...terminalTypes],
      terminalRoles: [...terminalRoles],
      isContainer: true,
      custom: true,
      parameterDefinitions: definitions
    };
    const node = createNodeFromTemplate(template, { x: 100, y: 100 });

    expect(node.params.is_container).toBe("1");
    expect(node.params.idx_ac_load_t1).toBe("");
    expect(node.params.idx_dc_unit_t2).toBe("");
    expect(node.params.idx_heat2_unit_t3).toBe("");
    expect(node.params.idx_heat2_unit_t4).toBe("");
    expect(node.params.t1_node).toBeUndefined();
    expect(node.params.t2_node).toBeUndefined();
  });

  test("pairs the next terminal with a double-port container association", () => {
    const terminalTypes = ["heat", "heat", "heat", "heat"] as const;
    const terminalRoles = ["double-source", "single-load", "double-source", "single-load"] as const;
    const definitions = buildDefaultDeviceParameterDefinitions(terminalTypes, {
      isContainer: true,
      terminalRoles
    });

    expect(definitions.map((definition) => definition.enName)).toEqual([
      "idx",
      "name",
      "run_stat",
      "is_container",
      "idx_heat2_unit_t1",
      "idx_heat2_unit_t2",
      "idx_heat2_unit_t3",
      "idx_heat2_unit_t4"
    ]);

    const template: DeviceTemplate = {
      kind: "CustomDoubleContainer",
      label: "CustomDoubleContainer",
      group: "自定义元件库",
      size: { width: 104, height: 64 },
      params: { backgroundImage: "data:image/svg+xml,custom", fillColor: "transparent", strokeColor: "transparent", lineWidth: "0" },
      terminalType: "heat",
      terminalCount: terminalTypes.length,
      terminalTypes: [...terminalTypes],
      terminalRoles: [...terminalRoles],
      isContainer: true,
      custom: true,
      parameterDefinitions: definitions
    };
    const indexed = assignPermanentDeviceIndex(createNodeFromTemplate(template, { x: 100, y: 100 }), {});

    expect(indexed.node.params.idx_heat2_unit_t1).toBe("1");
    expect(indexed.node.params.idx_heat2_unit_t2).toBe("1");
    expect(indexed.node.params.idx_heat2_unit_t3).toBe("2");
    expect(indexed.node.params.idx_heat2_unit_t4).toBe("2");
    expect(indexed.counters.TwoPortHeatSource).toBe(2);
  });

  test("rejects double-port container association on the last terminal", () => {
    const invalid = validateContainerTerminalRoles(["heat"], ["double-source"]);
    expect(invalid.valid).toBe(false);
    expect(invalid.message).toContain("最后一个端子");

    const validDependentLast = validateContainerTerminalRoles(["heat", "heat"], ["double-source", "double-load"]);
    expect(validDependentLast.valid).toBe(true);
  });

  test("marks built-in cross-energy devices as containers with clarified source-load associations", () => {
    const expected = [
      ["ac-fuel-cell", ["idx_ac_unit_t1", "idx_h2_load_t2"]],
      ["dc-fuel-cell", ["idx_dc_unit_t1", "idx_h2_load_t2"]],
      ["ac-electrolyzer", ["idx_ac_load_t1", "idx_h2_unit_t2"]],
      ["dc-electrolyzer", ["idx_dc_load_t1", "idx_h2_unit_t2"]],
      ["ac-heater", ["idx_ac_load_t1", "idx_heat_unit_t2"]],
      ["dc-heater", ["idx_dc_load_t1", "idx_heat_unit_t2"]],
      ["ac-two-port-heater", ["idx_ac_load_t1", "idx_heat2_unit_t2", "idx_heat2_unit_t3"]],
      ["dc-two-port-heater", ["idx_dc_load_t1", "idx_heat2_unit_t2", "idx_heat2_unit_t3"]]
    ] as const;

    for (const [kind, relationKeys] of expected) {
      const template = DEVICE_LIBRARY.find((item) => item.kind === kind);
      expect(template?.isContainer).toBe(true);
      const definitions = getTemplateParameterDefinitions(template!);
      expect(definitions.map((definition) => definition.enName)).toEqual(expect.arrayContaining(["is_container", ...relationKeys]));
      expect(definitions.some((definition) => definition.enName === "node" || definition.enName.endsWith("_node"))).toBe(false);
      const node = createDefaultNode(kind, { x: 100, y: 100 });
      expect(node.params.is_container).toBe("1");
      for (const relationKey of relationKeys) {
        expect(node.params[relationKey]).toBe("");
      }
      expect(getEParameterKeys(kind, node.params)).toEqual([]);
    }
  });

  test("allocates permanent idx values for container-associated child devices", () => {
    const electrolyzer = createDefaultNode("ac-electrolyzer", { x: 100, y: 100 });
    const indexedElectrolyzer = assignPermanentDeviceIndex(electrolyzer, {});
    expect(indexedElectrolyzer.node.params.idx).toBe("1");
    expect(indexedElectrolyzer.node.params.idx_ac_load_t1).toBe("1");
    expect(indexedElectrolyzer.node.params.idx_h2_unit_t2).toBe("1");
    expect(indexedElectrolyzer.counters).toMatchObject({
      "ac-electrolyzer": 1,
      ACLoad: 1,
      HydrogenSource: 1
    });

    const heater = createDefaultNode("ac-two-port-heater", { x: 100, y: 100 });
    const indexedHeater = assignPermanentDeviceIndex(heater, indexedElectrolyzer.counters);
    expect(indexedHeater.node.params.idx).toBe("1");
    expect(indexedHeater.node.params.idx_ac_load_t1).toBe("2");
    expect(indexedHeater.node.params.idx_heat2_unit_t2).toBe("1");
    expect(indexedHeater.node.params.idx_heat2_unit_t3).toBe("1");
    expect(indexedHeater.counters).toMatchObject({
      "ac-two-port-heater": 1,
      ACLoad: 2,
      TwoPortHeatSource: 1
    });

    const derived = deriveDeviceIndexCounters([indexedElectrolyzer.node, indexedHeater.node]);
    expect(derived).toMatchObject({
      "ac-electrolyzer": 1,
      "ac-two-port-heater": 1,
      ACLoad: 2,
      HydrogenSource: 1,
      TwoPortHeatSource: 1
    });
  });

  test("applies edited built-in template definitions when creating new nodes", () => {
    const baseTemplate = DEVICE_LIBRARY.find((item) => item.kind === "ac-line");
    expect(baseTemplate).toBeDefined();
    const template: DeviceTemplate = {
      ...baseTemplate!,
      params: { ...baseTemplate!.params, owner: "运维班" },
      parameterDefinitions: [
        {
          cnName: "巡视单位",
          enName: "owner",
          valueType: "enum",
          typicalValue: "运维班"
        }
      ]
    };

    const node = createNodeFromTemplate(template, { x: 100, y: 100 });

    expect(node.params.owner).toBe("运维班");
    expect(JSON.parse(node.params[CUSTOM_PARAM_DEFINITIONS_KEY])).toEqual(template.parameterDefinitions);
  });

  test("infers expected value types for built-in component definitions", () => {
    const definitionTypes = (kind: string) => {
      const template = DEVICE_LIBRARY.find((item) => item.kind === kind);
      expect(template).toBeDefined();
      return Object.fromEntries(getTemplateParameterDefinitions(template!).map((definition) => [definition.enName, definition.valueType]));
    };

    expect(definitionTypes("ac-source")).toMatchObject({
      idx: "integer",
      node: "integer",
      p_set: "float",
      q_set: "float",
      v_set: "float"
    });
    expect(definitionTypes("dc-source")).toMatchObject({
      idx: "integer",
      node: "integer",
      p_set: "float",
      i_set: "float",
      v_set: "float"
    });
    expect(definitionTypes("ac-load")).toMatchObject({
      pbase: "float",
      qbase: "float",
      pv0: "float",
      pv1: "float",
      pv2: "float",
      qv0: "float",
      qv1: "float",
      qv2: "float"
    });
    expect(definitionTypes("ac-line")).toMatchObject({
      i_node: "integer",
      j_node: "integer",
      r: "float",
      x: "float",
      b: "float"
    });
    expect(definitionTypes("ac-transformer")).toMatchObject({
      gt: "float",
      bt: "float",
      r: "float",
      x: "float"
    });
    expect(definitionTypes("dcdc-converter")).toMatchObject({
      i_node: "integer",
      j_node: "integer",
      r1: "float",
      r2: "float"
    });
  });

  test("builds a two-level element tree and focus points for canvas elements", () => {
    const source = createDefaultNode("ac-source", { x: 100, y: 100 });
    const load = createDefaultNode("ac-load", { x: 260, y: 100 });
    const text = createDefaultNode("static-text", { x: 180, y: 180 });
    source.name = "电源A";
    load.name = "负荷A";
    text.name = "说明文字";
    const edge: Edge = {
      id: "edge-a",
      sourceId: source.id,
      targetId: load.id,
      sourceTerminalId: "t1",
      targetTerminalId: "t1",
      manualPoints: [{ x: 180, y: 140 }]
    };

    const tree = buildElementTree([source, load, text], [edge]);

    expect(tree.map((group) => group.typeLabel)).toEqual(["交流电源", "交流负荷", "文字", "联络线"]);
    expect(tree.find((group) => group.typeLabel === "交流电源")?.items).toEqual([
      { kind: "node", id: source.id, name: "电源A" }
    ]);
    expect(tree.find((group) => group.typeLabel === "联络线")?.items[0]).toMatchObject({
      kind: "edge",
      id: "edge-a",
      name: "电源A -> 负荷A"
    });
    expect(getElementFocusPoint({ kind: "node", id: text.id }, [source, load, text], [edge])).toEqual(text.position);
    expect(getElementFocusPoint({ kind: "edge", id: "edge-a" }, [source, load, text], [edge])).toEqual({ x: 223, y: 120 });
  });

  test("omits retired disconnectors and DC transformer from the element library", () => {
    const retiredKinds = ["ac-disconnector", "dc-disconnector", "dc-transformer"];
    const libraryKinds = DEVICE_LIBRARY.map((item) => item.kind);
    const libraryLabels = DEVICE_LIBRARY.map((item) => item.label);

    for (const kind of retiredKinds) {
      expect(libraryKinds).not.toContain(kind);
    }
    expect(libraryLabels).not.toContain("交流刀闸");
    expect(libraryLabels).not.toContain("直流刀闸");
    expect(libraryLabels).not.toContain("直流主变");
    expect(libraryLabels).not.toContain("直流变压器");
  });

  test("uses distinct glyph variants for switches, breakers, and converter families", () => {
    expect(getDeviceGlyphVariant("ac-source")).toBe("ac-generator");
    expect(getDeviceGlyphVariant("dc-source")).toBe("dc-generator");
    expect(getDeviceGlyphVariant("ac-wind-source")).toBe("wind-source");
    expect(getDeviceGlyphVariant("dc-pv-source")).toBe("pv-source");

    expect(getDeviceGlyphVariant("ac-switch")).toBe("switch");
    expect(getDeviceGlyphVariant("dc-switch")).toBe("switch");
    expect(getDeviceGlyphVariant("ac-breaker")).toBe("breaker");
    expect(getDeviceGlyphVariant("dc-breaker")).toBe("breaker");
    expect(getDeviceGlyphVariant("ac-switch")).not.toBe(getDeviceGlyphVariant("ac-breaker"));

    const converterVariants = new Set([
      getDeviceGlyphVariant("dcdc-converter"),
      getDeviceGlyphVariant("acdc-converter"),
      getDeviceGlyphVariant("acac-converter")
    ]);
    expect(converterVariants).toEqual(new Set(["dcdc-converter", "acdc-converter", "acac-converter"]));
  });

  test("creates static drawing primitives without electrical terminals", () => {
    const expected = [
      "static-text",
      "static-line",
      "static-polyline",
      "static-circle",
      "static-ellipse",
      "static-rect",
      "static-image",
      "static-web",
      "static-date",
      "static-time",
      "static-datetime",
      "static-input",
      "static-button"
    ] as const;

    for (const kind of expected) {
      const node = createDefaultNode(kind, { x: 100, y: 100 });
      expect(isStaticNode(node)).toBe(true);
      expect(node.terminals).toEqual([]);
      expect(node.params.fillColor).toBeDefined();
      expect(node.params.strokeColor).toBeDefined();
    }

    const errors = validateTopology([createDefaultNode("static-text", { x: 100, y: 100 })], []);
    expect(errors).toEqual([]);
  });

  test("adds run_stat operating status to every device type", () => {
    for (const template of DEVICE_LIBRARY.filter((item) => !item.kind.startsWith("static-"))) {
      const node = createDefaultNode(template.kind, { x: 100, y: 100 });
      expect(node.params.run_stat).toBe("运行");
    }
  });

  test("adds voltage base parameters to devices, transformers, and converters", () => {
    expect(createDefaultNode("ac-load", { x: 100, y: 100 }).params.vbase).toBe("10 kV");
    const twoWinding = createDefaultNode("ac-two-winding-transformer", { x: 200, y: 100 });
    expect(twoWinding.params.highVbase).toBe("110 kV");
    expect(twoWinding.params.lowVbase).toBe("10 kV");
    const threeWinding = createDefaultNode("ac-three-winding-transformer", { x: 300, y: 100 });
    expect(threeWinding.params.highVbase).toBe("220 kV");
    expect(threeWinding.params.mediumVbase).toBe("110 kV");
    expect(threeWinding.params.lowVbase).toBe("10 kV");
    const converter = createDefaultNode("acdc-converter", { x: 400, y: 100 });
    expect(converter.params.sourceVbase).toBe("10 kV");
    expect(converter.params.targetVbase).toBe("750 V");
  });

  test("includes two-winding and three-winding transformer device types", () => {
    const twoWinding = DEVICE_LIBRARY.find((item) => item.kind === "ac-two-winding-transformer");
    const threeWinding = DEVICE_LIBRARY.find((item) => item.kind === "ac-three-winding-transformer");

    expect(twoWinding?.terminalType).toBe("ac");
    expect(twoWinding?.terminalCount).toBe(2);
    expect(threeWinding?.terminalType).toBe("ac");
    expect(threeWinding?.terminalCount).toBe(3);
  });

  test("renders crossing connection lines with local arc transitions", () => {
    const left = createDefaultNode("ac-bus", { x: 100, y: 240 });
    const right = createDefaultNode("ac-bus", { x: 500, y: 240 });
    const top = createDefaultNode("ac-bus", { x: 300, y: 80 });
    const bottom = createDefaultNode("ac-bus", { x: 300, y: 400 });
    const edges: Edge[] = [
      { id: "horizontal", sourceId: left.id, targetId: right.id, sourceTerminalId: "t2", targetTerminalId: "t1" },
      { id: "vertical", sourceId: top.id, targetId: bottom.id, sourceTerminalId: "t4", targetTerminalId: "t3" }
    ];

    const routes = routeEdgesForRendering([left, right, top, bottom], edges);

    expect(routes[0].path).not.toContain("Q");
    expect(routes[1].path).toContain("Q");
  });

  test("manages saved drawing model records", () => {
    const project = createSavedProject("模型A", {
      version: 1,
      name: "模型A",
      nodes: [createDefaultNode("ac-bus", { x: 100, y: 100 })],
      edges: []
    });

    const saved = upsertSavedProject([], project);
    expect(saved).toHaveLength(1);

    const renamed = renameSavedProject(saved, project.id, "模型B");
    expect(renamed[0].name).toBe("模型B");
    expect(renamed[0].project.name).toBe("模型B");

    const copied = duplicateSavedProject(renamed, project.id);
    expect(copied).toHaveLength(2);
    expect(copied[1].name).toBe("模型B 副本");
    expect(copied[1].id).not.toBe(project.id);

    const deleted = deleteSavedProject(copied, project.id);
    expect(deleted).toHaveLength(1);
    expect(deleted[0].name).toBe("模型B 副本");
  });

  test("rejects duplicate project names when renaming inside the same scheme", () => {
    const first = createSavedProject("模型A", {
      version: 1,
      name: "模型A",
      nodes: [],
      edges: []
    });
    const second = createSavedProject("模型A", {
      version: 1,
      name: "模型A",
      nodes: [],
      edges: []
    });

    const saved = upsertSavedProject(upsertSavedProject([], first), second);
    expect(saved.map((project) => project.name)).toEqual(["模型A", "模型A (2)"]);

    const renamed = renameSavedProject(saved, saved[1].id, "模型A");
    expect(renamed.map((project) => project.name)).toEqual(["模型A", "模型A (2)"]);
  });

  test("rejects duplicate scheme names and renames moved projects on conflict", () => {
    const sourceProject = createSavedProject("模型A", { version: 1, name: "模型A", nodes: [], edges: [] });
    const targetProject = createSavedProject("模型A", { version: 1, name: "模型A", nodes: [], edges: [] });
    const firstScheme = createSavedScheme("方案A", [sourceProject]);
    const secondScheme = createSavedScheme("方案B", upsertSavedProject([], targetProject));
    const renamedSchemes = renameSavedScheme([firstScheme, secondScheme], secondScheme.id, "方案A");

    expect(renamedSchemes.map((scheme) => scheme.name)).toEqual(["方案A", "方案B"]);

    const moved = moveProjectToScheme([firstScheme, secondScheme], sourceProject.id, secondScheme.id);
    const target = moved.find((scheme) => scheme.id === secondScheme.id);
    expect(target?.projects.map((project) => project.name)).toEqual(["模型A", "模型A (2)"]);
  });

  test("copies saved project and scheme records with automatic unique names", () => {
    const project = createSavedProject("模型A", { version: 1, name: "模型A", nodes: [], edges: [] });
    const copiedProject = copySavedProjectWithUniqueName(project, ["模型A", "模型A 副本"]);

    expect(copiedProject.name).toBe("模型A 副本 (2)");
    expect(copiedProject.project.name).toBe("模型A 副本 (2)");

    const scheme = createSavedScheme("方案A", [
      createSavedProject("模型A", { version: 1, name: "模型A", nodes: [], edges: [] }),
      createSavedProject("模型A 副本", { version: 1, name: "模型A 副本", nodes: [], edges: [] })
    ]);
    const copiedScheme = copySavedSchemeWithUniqueName(scheme, ["方案A", "方案A 副本"]);

    expect(copiedScheme.name).toBe("方案A 副本 (2)");
    expect(copiedScheme.projects.map((item) => item.name)).toEqual(["模型A 副本", "模型A 副本 副本"]);
  });

  test("deletes selected devices and automatically removes their connected lines", () => {
    const nodes: ModelNode[] = [
      createDefaultNode("ac-source", { x: 100, y: 100 }),
      createDefaultNode("ac-switch", { x: 240, y: 100 }),
      createDefaultNode("ac-load", { x: 380, y: 100 })
    ];
    const edges: Edge[] = [
      { id: "e1", sourceId: nodes[0].id, targetId: nodes[1].id },
      { id: "e2", sourceId: nodes[1].id, targetId: nodes[2].id }
    ];

    const result = deleteNodesWithConnectedEdges(nodes, edges, [nodes[1].id]);

    expect(result.nodes.map((node) => node.id)).toEqual([nodes[0].id, nodes[2].id]);
    expect(result.edges).toEqual([]);
  });

  test("calculates terminal topology node numbers by contracting connection lines and buses", () => {
    const acSource = createDefaultNode("ac-source", { x: 100, y: 100 });
    const acBus = createDefaultNode("ac-bus", { x: 240, y: 100 });
    const dcBus = createDefaultNode("dc-bus", { x: 380, y: 100 });
    const dcLoad = createDefaultNode("dc-load", { x: 520, y: 100 });
    const edges: Edge[] = [
      { id: "ac", sourceId: acSource.id, targetId: acBus.id, sourceTerminalId: "t1", targetTerminalId: "t1" },
      { id: "dc", sourceId: dcBus.id, targetId: dcLoad.id, sourceTerminalId: "t1", targetTerminalId: "t1" }
    ];

    const calculated = calculateElectricalTopology([acSource, acBus, dcBus, dcLoad], edges);
    const byId = new Map(calculated.map((node) => [node.id, node]));

    expect(byId.get(acSource.id)?.acTopologyNode).toBe(1);
    expect(byId.get(acBus.id)?.acTopologyNode).toBe(1);
    expect(byId.get(acSource.id)?.terminals[0].nodeNumber).toBe("1");
    expect(new Set(byId.get(acBus.id)?.terminals.map((terminal) => terminal.nodeNumber))).toEqual(new Set(["1"]));
    expect(byId.get(dcBus.id)?.dcTopologyNode).toBe(1);
    expect(byId.get(dcLoad.id)?.dcTopologyNode).toBe(1);
    expect(byId.get(dcLoad.id)?.terminals[0].nodeNumber).toBe("1");
    expect(byId.get(dcLoad.id)?.acTopologyNode).toBe(0);
  });

  test("contracts all lines connected to the same bus and numbers AC and DC independently", () => {
    const acBus = createDefaultNode("ac-bus", { x: 200, y: 100 });
    const acLoadA = createDefaultNode("ac-load", { x: 80, y: 100 });
    const acLoadB = createDefaultNode("ac-load", { x: 320, y: 100 });
    const dcBus = createDefaultNode("dc-bus", { x: 200, y: 260 });
    const dcLoadA = createDefaultNode("dc-load", { x: 80, y: 260 });
    const dcLoadB = createDefaultNode("dc-load", { x: 320, y: 260 });

    const calculated = calculateElectricalTopology(
      [acBus, acLoadA, acLoadB, dcBus, dcLoadA, dcLoadB],
      [
        { id: "ac-a", sourceId: acLoadA.id, targetId: acBus.id, sourceTerminalId: "t1", targetTerminalId: "t1", targetPoint: { x: 160, y: 100 } },
        { id: "ac-b", sourceId: acLoadB.id, targetId: acBus.id, sourceTerminalId: "t1", targetTerminalId: "t1", targetPoint: { x: 240, y: 100 } },
        { id: "dc-a", sourceId: dcLoadA.id, targetId: dcBus.id, sourceTerminalId: "t1", targetTerminalId: "t1", targetPoint: { x: 160, y: 260 } },
        { id: "dc-b", sourceId: dcLoadB.id, targetId: dcBus.id, sourceTerminalId: "t1", targetTerminalId: "t1", targetPoint: { x: 240, y: 260 } }
      ]
    );
    const byId = new Map(calculated.map((node) => [node.id, node]));

    expect(byId.get(acBus.id)?.acTopologyNode).toBe(1);
    expect(byId.get(acLoadA.id)?.terminals[0].nodeNumber).toBe("1");
    expect(byId.get(acLoadB.id)?.terminals[0].nodeNumber).toBe("1");
    expect(new Set(byId.get(acBus.id)?.terminals.map((terminal) => terminal.nodeNumber))).toEqual(new Set(["1"]));
    expect(byId.get(dcBus.id)?.dcTopologyNode).toBe(1);
    expect(byId.get(dcLoadA.id)?.terminals[0].nodeNumber).toBe("1");
    expect(byId.get(dcLoadB.id)?.terminals[0].nodeNumber).toBe("1");
    expect(new Set(byId.get(dcBus.id)?.terminals.map((terminal) => terminal.nodeNumber))).toEqual(new Set(["1"]));
  });

  test("keeps two-terminal branch device endpoint node numbers separate unless connected", () => {
    const source = createDefaultNode("ac-source", { x: 100, y: 100 });
    const line = createDefaultNode("ac-line", { x: 240, y: 100 });
    const load = createDefaultNode("ac-load", { x: 380, y: 100 });

    const calculated = calculateElectricalTopology(
      [source, line, load],
      [
        { id: "source-line", sourceId: source.id, targetId: line.id, sourceTerminalId: "t1", targetTerminalId: "t1" },
        { id: "line-load", sourceId: line.id, targetId: load.id, sourceTerminalId: "t2", targetTerminalId: "t1" }
      ]
    );
    const byId = new Map(calculated.map((node) => [node.id, node]));

    expect(byId.get(source.id)?.terminals[0].nodeNumber).toBe("1");
    expect(byId.get(line.id)?.terminals[0].nodeNumber).toBe("1");
    expect(byId.get(line.id)?.terminals[1].nodeNumber).toBe("2");
    expect(byId.get(load.id)?.terminals[0].nodeNumber).toBe("2");
  });

  test("validates floating terminals, mixed terminal types, and voltage mismatch before topology", () => {
    const acSource = createDefaultNode("ac-source", { x: 100, y: 100 });
    const dcLoad = createDefaultNode("dc-load", { x: 220, y: 100 });
    const acLoad = createDefaultNode("ac-load", { x: 340, y: 100 });
    acSource.params.vbase = "10 kV";
    acLoad.params.vbase = "35 kV";
    acLoad.terminals[0].vbase = "35 kV";
    const errors = validateTopology(
      [acSource, dcLoad, acLoad],
      [
        { id: "mixed", sourceId: acSource.id, targetId: dcLoad.id, sourceTerminalId: "t1", targetTerminalId: "t1" },
        { id: "voltage", sourceId: acSource.id, targetId: acLoad.id, sourceTerminalId: "t1", targetTerminalId: "t1" }
      ]
    );

    expect(errors.some((error) => error.type === "terminal-type-mismatch" && error.edgeId === "mixed")).toBe(true);
    expect(errors.some((error) => error.type === "voltage-mismatch" && error.edgeId === "voltage")).toBe(true);

    const loneLoad = createDefaultNode("ac-load", { x: 460, y: 100 });
    const floatingErrors = validateTopology([loneLoad], []);
    expect(floatingErrors.some((error) => error.type === "floating-terminal" && error.nodeId === loneLoad.id)).toBe(true);
  });

  test("validates voltage mismatch from the connected terminal voltage bases", () => {
    const source = createDefaultNode("ac-source", { x: 100, y: 100 });
    const load = createDefaultNode("ac-load", { x: 240, y: 100 });
    source.params.vbase = "10 kV";
    load.params.vbase = "10 kV";
    source.terminals[0].vbase = "10 kV";
    load.terminals[0].vbase = "35 kV";

    const errors = validateTopology(
      [source, load],
      [{ id: "e-terminal-vbase", sourceId: source.id, targetId: load.id, sourceTerminalId: "t1", targetTerminalId: "t1" }]
    );

    expect(errors.some((error) => error.type === "voltage-mismatch" && error.edgeId === "e-terminal-vbase")).toBe(true);
  });

  test("validates voltage mismatch across terminals contracted through the same bus", () => {
    const bus = createDefaultNode("ac-bus", { x: 200, y: 100 });
    const load10 = createDefaultNode("ac-load", { x: 80, y: 100 });
    const load35 = createDefaultNode("ac-load", { x: 320, y: 100 });
    bus.params.vbase = "";
    bus.terminals = bus.terminals.map((terminal) => ({ ...terminal, vbase: "" }));
    load10.terminals[0].vbase = "10 kV";
    load35.terminals[0].vbase = "35 kV";

    const errors = validateTopology(
      [bus, load10, load35],
      [
        { id: "load10-bus", sourceId: load10.id, targetId: bus.id, sourceTerminalId: "t1", targetTerminalId: "t1" },
        { id: "load35-bus", sourceId: load35.id, targetId: bus.id, sourceTerminalId: "t1", targetTerminalId: "t1" }
      ]
    );

    expect(errors.some((error) => error.type === "voltage-mismatch" && error.relatedNodeIds.includes(load10.id) && error.relatedNodeIds.includes(load35.id))).toBe(true);
  });
});
