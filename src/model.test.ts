import { describe, expect, test } from "vitest";
import {
  alignNodes,
  buildTopology,
  buildElementTree,
  buildEFileExport,
  buildEDeviceParameterFile,
  calculateElectricalTopology,
  calculateModelContentSize,
  canConnectTerminals,
  buildDefaultDeviceParameterDefinitions,
  buildContainerDeviceParameterViews,
  describeContainerTerminalAssociations,
  calculateModelGeometryBounds,
  clampNodePositionToBounds,
  clampViewBoxDimensionsForZoom,
  geometryBoundsInsideCanvas,
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
  distributeNodes,
  duplicateSavedProject,
  routeOrthogonalEdge,
  routeEdgesForRendering,
  ACAC_CONVERTER_CONTROL_TYPES,
  AC_GENERATOR_CONTROL_TYPES,
  DCAC_CONVERTER_CONTROL_TYPES,
  DC_GENERATOR_CONTROL_TYPES,
  E_SECTION_COLUMNS,
  tidyOrthogonalRoute,
  renameSavedProject,
  renameSavedScheme,
  resolveStraightBusSlideEndpoint,
  resolveStraightBusSlideEndpointToPoint,
  moveProjectToScheme,
  moveOrthogonalRouteSegment,
  modelGeometryInsideCanvasBounds,
  insertOrthogonalRouteBend,
  preserveDraggedRouteShape,
  upsertSavedProject,
  rerouteEdgesAroundMovedNodes,
  validateConnectionEdgeRoute,
  validateTopology,
  validateVoltageSetpointDeviations,
  getTerminalPoint,
  getMovableRouteSegmentIndexes,
  getNodeScaleX,
  getNodeScaleY,
  getDeviceGlyphVariant,
  getDeviceStrokeColor,
  getDeviceStrokeWidth,
  getConnectionStrokeColor,
  getElementFocusPoint,
  isBlockingTopologyValidationError,
  isRepeatedEdgePointerClick,
  getContainerAssociationRelationKey,
  getContainerRelationKey,
  getEExportWarnings,
  getEParameterKeys,
  getTemplateParameterDefinitions,
  validateContainerTerminalAssociations,
  validateContainerTerminalRoles,
  isGeneratorNode,
  isStaticNode,
  keyboardMoveStepForViewBox,
  viewBoxZoomPercent,
  getSwitchVisualState,
  lockProjectEdgeTerminals,
  mirrorNodes,
  normalizeScaleValue,
  normalizeNodeTerminalsByTemplate,
  normalizeVoltageBaseInput,
  normalizeViewBoxToCanvas,
  prepareConnectionEdgeForCommit,
  terminalStubSegment,
  terminalVoltageBaseNumber,
  topologyCalculationMessage,
  serializeProject,
  deserializeProject,
  type Edge,
  type DeviceTemplate,
  type ModelNode,
  type Point,
  type ProjectFile
} from "./model";

type ParsedESection = {
  columns: string[];
  rows: Record<string, string>[];
};

function parseESections(text: string): Record<string, ParsedESection> {
  const sections: Record<string, ParsedESection> = {};
  const sectionPattern = /<([^/][^>]*)>\s*\r?\n@ ([^\r\n]+)\r?\n([\s\S]*?)<\/\1>/g;
  for (const match of text.matchAll(sectionPattern)) {
    const [, sectionName, header, body] = match;
    const columns = header.trim().split(/\s+/);
    const rows = body
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.startsWith("#"))
      .map((line) => {
        const values = line.replace(/^#\s*/, "").trim().split(/\s+/);
        return Object.fromEntries(columns.map((column, index) => [column, values[index] ?? ""]));
      });
    sections[sectionName] = { columns, rows };
  }
  return sections;
}

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
        },
        {
          id: "floating-edge",
          sourceId: source.id,
          targetId: "",
          sourceTerminalId: "t1",
          targetPoint: { x: 500, y: 100 }
        }
      ]
    });

    expect(locked.edges).toHaveLength(2);
    expect(locked.edges[0].sourceTerminalId).toBe("t1");
    expect(locked.edges[0].targetTerminalId).toBe("t1");
    expect(locked.edges[0].sourcePoint).toBeUndefined();
    expect(locked.edges[0].targetPoint).toBeUndefined();
    expect(locked.edges[1].sourceTerminalId).toBe("t2");
    expect(locked.edges[1].targetTerminalId).toBe("t1");
    expect(locked.edges[1].targetPoint).toEqual({ x: 350, y: 100 });
  });

  test("creates buses without default terminals while still allowing compatible line drops", () => {
    const acBus = createDefaultNode("ac-bus", { x: 100, y: 100 });
    const dcBus = createDefaultNode("dc-bus", { x: 240, y: 100 });
    const acLoad = createDefaultNode("ac-load", { x: 100, y: 220 });
    const dcLoad = createDefaultNode("dc-load", { x: 240, y: 220 });

    expect(acBus.terminals).toHaveLength(0);
    expect(dcBus.terminals).toHaveLength(0);
    expect(canConnectTerminals(acBus, "t1", acLoad, "t1")).toBe(true);
    expect(canConnectTerminals(acBus, "t1", dcLoad, "t1")).toBe(false);
    expect(canConnectTerminals(dcBus, "t1", dcLoad, "t1")).toBe(true);
  });

  test("sizes each bus terminal list from the number of connected line endpoints", () => {
    const bus = createDefaultNode("ac-bus", { x: 200, y: 100 });
    const loadA = createDefaultNode("ac-load", { x: 80, y: 100 });
    const loadB = createDefaultNode("ac-load", { x: 320, y: 100 });
    const loadC = createDefaultNode("ac-load", { x: 440, y: 100 });

    const locked = lockProjectEdgeTerminals({
      version: 1,
      name: "母线动态端子",
      nodes: [bus, loadA, loadB, loadC],
      edges: [
        { id: "a", sourceId: loadA.id, targetId: bus.id, sourceTerminalId: "t1", targetTerminalId: "t1", targetPoint: { x: 160, y: 100 } },
        { id: "b", sourceId: loadB.id, targetId: bus.id, sourceTerminalId: "t1", targetTerminalId: "t1", targetPoint: { x: 200, y: 100 } },
        { id: "c", sourceId: bus.id, targetId: loadC.id, sourceTerminalId: "t1", targetTerminalId: "t1", sourcePoint: { x: 240, y: 100 } }
      ]
    });
    const lockedBus = locked.nodes.find((node) => node.id === bus.id)!;

    expect(lockedBus.terminals.map((terminal) => terminal.id)).toEqual(["t1", "t2", "t3"]);
    expect(locked.edges.map((edge) => (edge.targetId === bus.id ? edge.targetTerminalId : edge.sourceTerminalId))).toEqual(["t1", "t2", "t3"]);

    const afterDelete = lockProjectEdgeTerminals({
      ...locked,
      edges: locked.edges.filter((edge) => edge.id !== "b")
    });
    expect(afterDelete.nodes.find((node) => node.id === bus.id)?.terminals.map((terminal) => terminal.id)).toEqual(["t1", "t2"]);
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

    const exported = parseESections(buildEDeviceParameterFile({
      version: 1,
      name: "零阻抗支路测试",
      nodes: [acZeroBranch, dcZeroBranch],
      edges: []
    }));
    expect(exported.ACZeroBranch.rows).toHaveLength(1);
    expect(exported.DCZeroBranch.rows).toHaveLength(1);
  });

  test("places converter elements under AC/DC device library groups", () => {
    expect(DEVICE_LIBRARY.find((item) => item.kind === "acac-converter")).toMatchObject({ group: "交流设备" });
    expect(DEVICE_LIBRARY.find((item) => item.kind === "acdc-converter")).toMatchObject({ group: "直流设备" });
    expect(DEVICE_LIBRARY.find((item) => item.kind === "dcdc-converter")).toMatchObject({ group: "直流设备" });
  });

  test("builds a downloadable E file export for the current model", () => {
    const node = createDefaultNode("ac-source", { x: 100, y: 100 });
    const project: ProjectFile = {
      version: 1,
      name: "混合/能源:模型",
      nodes: [node],
      edges: []
    };

    const file = buildEFileExport(project);

    expect(file.filename).toBe("混合_能源_模型.e");
    expect(file.mime).toBe("text/plain");
    expect(file.text).toContain("<PowerBase>");
    expect(file.text).toContain("@ p_base u_unit p_unit i_unit");
    expect(file.text).toContain("<ACGenerator>");
    expect(() => JSON.parse(file.text)).toThrow();
  });

  test("exports hydrogen, heat, and cross-energy devices to E sections and reports unsupported devices", () => {
    const electrolyzer = assignPermanentDeviceIndex(createDefaultNode("ac-electrolyzer", { x: 100, y: 100 }), {}).node;
    const hydrogenPipe = assignPermanentDeviceIndex(createDefaultNode("hydrogen-pipeline", { x: 240, y: 100 }), {}).node;
    const heatTank = assignPermanentDeviceIndex(createDefaultNode("thermal-storage-tank", { x: 380, y: 100 }), {}).node;
    const custom: ModelNode = {
      ...createDefaultNode("ac-load", { x: 520, y: 100 }),
      kind: "unknown-device-kind",
      name: "未支持设备",
      params: {}
    };
    const exported = parseESections(buildEDeviceParameterFile({
      version: 1,
      name: "综合能源导出",
      nodes: [electrolyzer, hydrogenPipe, heatTank, custom],
      edges: []
    }));

    expect(exported.AcE2Hydro.rows).toHaveLength(1);
    expect(exported.ACLoad.rows).toHaveLength(1);
    expect(exported.HydroSource.rows).toHaveLength(1);
    expect(exported.HydroPipe.rows).toHaveLength(1);
    expect(exported.HeatTank.rows).toHaveLength(1);
    expect(getEExportWarnings({
      version: 1,
      name: "综合能源导出",
      nodes: [electrolyzer, hydrogenPipe, heatTank, custom],
      edges: []
    })).toEqual([
      expect.objectContaining({
        nodeId: custom.id,
        reason: "设备类型没有对应的 E 文件段定义。"
      })
    ]);
  });

  test("uses impedance glyphs for AC lines and resistance-only glyphs for DC lines", () => {
    expect(getDeviceGlyphVariant("ac-line")).toBe("ac-line");
    expect(getDeviceGlyphVariant("dc-line")).toBe("dc-line");
    expect(getDeviceGlyphVariant("ac-zero-branch")).toBe("line");
    expect(getDeviceGlyphVariant("dc-zero-branch")).toBe("line");
  });

  test("initializes editable terminal voltage bases to zero", () => {
    const acLine = createDefaultNode("ac-line", { x: 100, y: 100 });
    const dcLine = createDefaultNode("dc-line", { x: 220, y: 100 });

    expect(acLine.terminals.map((terminal) => terminal.vbase)).toEqual(["0", "0"]);
    expect(dcLine.terminals.map((terminal) => terminal.vbase)).toEqual(["0", "0"]);
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

    const payload = parseESections(
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

    const exportedLoad = payload.ACLoad.rows.find((row) => row.name === "load_1");
    expect(payload.ACNode.rows).toHaveLength(1);
    expect(exportedLoad).toMatchObject({
      idx: "7",
      name: "load_1",
      node: "1",
      pbase: "9.5",
      run_stat: "1"
    });
    expect(payload.ACLoad.columns).not.toContain("ratedActivePower");
    expect(payload.ACLoad.columns).not.toContain("backgroundImage");
    expect(buildEDeviceParameterFile({
      version: 1,
      name: "E导出模型",
      nodes: [acLoad, staticText],
      edges: []
    })).not.toContain("ratedActivePower");
  });

  test("sorts E section rows by numeric idx before exporting", () => {
    const load10 = createDefaultNode("ac-load", { x: 100, y: 100 });
    const load2 = createDefaultNode("ac-load", { x: 220, y: 100 });
    const load1 = createDefaultNode("ac-load", { x: 340, y: 100 });
    load10.name = "load10";
    load2.name = "load2";
    load1.name = "load1";
    load10.params = { ...load10.params, idx: "10" };
    load2.params = { ...load2.params, idx: "2" };
    load1.params = { ...load1.params, idx: "1" };

    const payload = parseESections(
      buildEDeviceParameterFile({
        version: 1,
        name: "idx排序测试",
        nodes: [load10, load2, load1],
        edges: []
      })
    );

    expect(payload.ACLoad.rows.map((row) => row.idx)).toEqual(["1", "2", "10"]);
    expect(payload.ACLoad.rows.map((row) => row.name)).toEqual(["load1", "load2", "load10"]);
  });

  test("uses requested default impedance values for new AC and DC lines", () => {
    const acLine = createDefaultNode("ac-line", { x: 100, y: 100 });
    const dcLine = createDefaultNode("dc-line", { x: 240, y: 100 });

    expect(acLine.params).toMatchObject({ r: "0.1", x: "1.0", b: "0.0" });
    expect(dcLine.params).toMatchObject({ r: "1.0" });

    const payload = parseESections(buildEDeviceParameterFile({
      version: 1,
      name: "线路默认参数测试",
      nodes: [acLine, dcLine],
      edges: []
    }));

    expect(payload.ACBranch.rows[0]).toMatchObject({ r: "0.1", x: "1.0", b: "0.0" });
    expect(payload.DCBranch.rows[0]).toMatchObject({ r: "1.0" });
  });

  test("maps graphical AC and DC buses to real bus sections in E parameter files", () => {
    const acBus = createDefaultNode("ac-bus", { x: 100, y: 100 });
    const dcBus = createDefaultNode("dc-bus", { x: 220, y: 100 });
    const acLoad = createDefaultNode("ac-load", { x: 100, y: 220 });
    const dcLoad = createDefaultNode("dc-load", { x: 220, y: 220 });
    acBus.name = "ac_bus";
    dcBus.name = "dc_bus";
    acBus.params = { ...acBus.params, source_section: "ACNode", idx: "21", vbase: "380", run_stat: "1" };
    dcBus.params = { ...dcBus.params, source_section: "DCNode", idx: "1", vbase: "720", run_stat: "1" };
    acLoad.terminals[0].vbase = "380";
    dcLoad.terminals[0].vbase = "720";

    const payload = parseESections(
      buildEDeviceParameterFile({
        version: 1,
        name: "母线分组",
        nodes: [acBus, dcBus, acLoad, dcLoad],
        edges: [
          { id: "ac-bus-load", sourceId: acBus.id, targetId: acLoad.id, sourceTerminalId: "t1", targetTerminalId: "t1" },
          { id: "dc-bus-load", sourceId: dcBus.id, targetId: dcLoad.id, sourceTerminalId: "t1", targetTerminalId: "t1" }
        ]
      })
    );

    const acRealBus = payload.ACRealBs.rows[0];
    const dcRealBus = payload.DCRealBs.rows[0];
    expect(payload.ACNode.rows).toHaveLength(1);
    expect(payload.DCNode.rows).toHaveLength(1);
    expect(acRealBus).toEqual({
      idx: "21",
      name: "ac_bus",
      node: "1",
      run_stat: "1"
    });
    expect(dcRealBus).toEqual({
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

    const payload = parseESections(
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

    const acNodes = payload.ACNode.rows;
    const dcNodes = payload.DCNode.rows;
    const acBranch = payload.ACBranch.rows[0];
    const dcBranch = payload.DCBranch.rows[0];
    const exportedAcLoad = payload.ACLoad.rows.find((row) => row.name === "ac_load");
    const exportedDcLoad = payload.DCLoad.rows.find((row) => row.name === "dc_load");

    expect(acNodes.map((row) => row.idx)).toEqual(["1", "2"]);
    expect(acNodes.map((row) => row.name)).toEqual(["ac_src", "ac_load"]);
    expect(acNodes.map((row) => row.vbase)).toEqual(["10", "10"]);
    expect(dcNodes.map((row) => row.idx)).toEqual(["1", "2"]);
    expect(dcNodes.map((row) => row.name)).toEqual(["dc_src", "dc_load"]);
    expect(dcNodes.map((row) => row.vbase)).toEqual(["750", "750"]);
    expect(acBranch).toMatchObject({ i_node: "1", j_node: "2" });
    expect(dcBranch).toMatchObject({ i_node: "1", j_node: "2" });
    expect(exportedAcLoad?.node).toBe("2");
    expect(exportedDcLoad?.node).toBe("2");
  });

  test("expands three-winding transformers into three ACTransformer branches with an auto neutral node", () => {
    const highBus = createDefaultNode("ac-bus", { x: 80, y: 100 });
    const mediumBus = createDefaultNode("ac-bus", { x: 80, y: 220 });
    const lowBus = createDefaultNode("ac-bus", { x: 80, y: 340 });
    const transformer = assignPermanentDeviceIndex(createDefaultNode("ac-three-winding-transformer", { x: 260, y: 220 }), {}).node;
    transformer.name = "T3";
    transformer.terminals[0].vbase = "220 kV";
    transformer.terminals[1].vbase = "110 kV";
    transformer.terminals[2].vbase = "10 kV";
    highBus.terminals.forEach((terminal) => { terminal.vbase = "220 kV"; });
    mediumBus.terminals.forEach((terminal) => { terminal.vbase = "110 kV"; });
    lowBus.terminals.forEach((terminal) => { terminal.vbase = "10 kV"; });

    const edges: Edge[] = [
      { id: "high", sourceId: highBus.id, targetId: transformer.id, sourceTerminalId: "t1", targetTerminalId: "t1" },
      { id: "medium", sourceId: mediumBus.id, targetId: transformer.id, sourceTerminalId: "t1", targetTerminalId: "t2" },
      { id: "low", sourceId: lowBus.id, targetId: transformer.id, sourceTerminalId: "t1", targetTerminalId: "t3" }
    ];

    const calculated = calculateElectricalTopology([highBus, mediumBus, lowBus, transformer], edges);
    const calculatedTransformer = calculated.find((node) => node.id === transformer.id)!;

    expect(calculatedTransformer.terminals.map((terminal) => terminal.nodeNumber)).toEqual(["1", "2", "3"]);
    expect(calculatedTransformer.params.neutral_node).toBe("4");
    expect(calculatedTransformer.params.neutral_vbase).toBe("1.0");

    const payload = parseESections(
      buildEDeviceParameterFile({
        version: 1,
        name: "三绕组主变导出",
        nodes: [highBus, mediumBus, lowBus, transformer],
        edges
      })
    );
    const acNodes = payload.ACNode.rows;
    const neutralNode = acNodes.find((row) => row.idx === "4");
    const transformerBranches = payload.ACTransformer.rows.filter((row) => row.name.startsWith("T3_"));
    const threePowerTransformer = payload.ThreePowerTransformer.rows.find((row) => row.name === "T3");

    expect(acNodes.map((row) => row.idx)).toEqual(["1", "2", "3", "4"]);
    expect(neutralNode).toMatchObject({ name: "T3_neutral", vbase: "1.0", voltage: "1.0" });
    expect(threePowerTransformer).toEqual({
      idx: "1",
      name: "T3",
      run_stat: "1",
      idx_xf_t1: "1",
      idx_xf_t2: "2",
      idx_xf_t3: "3"
    });
    expect(transformerBranches).toEqual([
      expect.objectContaining({ idx: "1", name: "T3_高压绕组", i_node: "1", j_node: "4", r: "0.0", x: "0.1", tap: "1.0" }),
      expect.objectContaining({ idx: "2", name: "T3_中压绕组", i_node: "2", j_node: "4", r: "0.0", x: "0.1", tap: "1.0" }),
      expect.objectContaining({ idx: "3", name: "T3_低压绕组", i_node: "3", j_node: "4", r: "0.0", x: "0.1", tap: "1.0" })
    ]);
  });

  test("creates load, line, and transformer electrical parameter defaults", () => {
    const acLoad = createDefaultNode("ac-load", { x: 100, y: 100 });
    const dcLoad = createDefaultNode("dc-load", { x: 200, y: 100 });
    const acLine = createDefaultNode("ac-line", { x: 300, y: 100 });
    const twoWinding = createDefaultNode("ac-transformer", { x: 400, y: 100 });
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
    expect(acLine.params.r).toBe("0.1");
    expect(acLine.params.x).toBe("1.0");
    expect(acLine.params.b).toBe("0.0");

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
    expect(threeWinding.params.is_container).toBe("1");
    expect(threeWinding.params.neutral_node).toBe("");
    expect(threeWinding.params.neutral_vbase).toBe("1.0");
    expect(threeWinding.params.idx_xf_t1).toBe("");
    expect(threeWinding.params.idx_xf_t2).toBe("");
    expect(threeWinding.params.idx_xf_t3).toBe("");
    expect(threeWinding.params.idx_ac_transformer_t1).toBeUndefined();

    const dcdc = createDefaultNode("dcdc-converter", { x: 600, y: 100 });
    expect(dcdc.terminals[0].nodeNumber).toMatch(/^N\d+$/);
    expect(dcdc.terminals[1].nodeNumber).toMatch(/^N\d+$/);
    expect(dcdc.params.sourceEquivalentResistance).toBe("0.0");
    expect(dcdc.params.targetEquivalentResistance).toBe("0.0");
    expect(dcdc.params.i_control_type).toBe("CTRL_P");
    expect(dcdc.params.j_control_type).toBe("SLACK");
    expect(dcdc.params.control_type).toBeUndefined();

    const acdc = createDefaultNode("acdc-converter", { x: 700, y: 100 });
    expect(acdc.terminals.map((terminal) => terminal.type)).toEqual(["ac", "dc"]);
    expect(acdc.terminals.map((terminal) => terminal.vbase)).toEqual(["0", "0"]);
    expect(acdc.params.sourceEquivalentResistance).toBe("0.0");
    expect(acdc.params.targetEquivalentResistance).toBe("0.0");
    expect(acdc.params.control_type).toBe("DCV");
    expect(acdc.params.acControlType).toBe("定PQ");
    expect(acdc.params.dcControlType).toBe("不定");

    const acac = createDefaultNode("acac-converter", { x: 800, y: 100 });
    expect(acac.params.sourceEquivalentResistance).toBe("0.0");
    expect(acac.params.targetEquivalentResistance).toBe("0.0");
    expect(acac.params.control_type).toBe("PQQ");
    expect(acac.params.sourceControlType).toBe("定PQ");
    expect(acac.params.targetControlType).toBe("不定");

    const dcLine = createDefaultNode("dc-line", { x: 900, y: 100 });
    expect(dcLine.params.r).toBe("1.0");
    expect(dcLine.params.x).toBeUndefined();
    expect(dcLine.params.b).toBeUndefined();

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

  test("accepts a newly drawn connection only when the final route satisfies connection constraints", () => {
    const source = createDefaultNode("ac-source", { x: 100, y: 120 });
    const target = createDefaultNode("ac-load", { x: 420, y: 120 });
    const edge: Edge = {
      id: "new-clear-connection",
      sourceId: source.id,
      targetId: target.id,
      sourceTerminalId: "t1",
      targetTerminalId: "t1"
    };

    const result = validateConnectionEdgeRoute([source, target], [edge], edge.id, { width: 640, height: 260 });

    expect(result.ok).toBe(true);
    expect(result.issues).toEqual([]);
    expect(result.route?.points[0]).toEqual(getTerminalPoint(source, "t1"));
    expect(result.route?.points[result.route.points.length - 1]).toEqual(getTerminalPoint(target, "t1"));
  });

  test("rejects a newly drawn connection when the final route still crosses a graphic", () => {
    const source = createDefaultNode("ac-source", { x: 80, y: 60 });
    const target = createDefaultNode("ac-load", { x: 330, y: 60 });
    const blocker = {
      ...createDefaultNode("static-rect", { x: 205, y: 60 }),
      size: { width: 90, height: 260 }
    };
    const edge: Edge = {
      id: "new-blocked-connection",
      sourceId: source.id,
      targetId: target.id,
      sourceTerminalId: "t1",
      targetTerminalId: "t1"
    };

    const result = validateConnectionEdgeRoute([source, target, blocker], [edge], edge.id, { width: 400, height: 120 });

    expect(result.ok).toBe(false);
    expect(result.issues.some((issue) => issue.type === "blocked-by-node" && issue.nodeId === blocker.id)).toBe(true);
  });

  test("redesigns a connection to the fewest safe bends before committing it", () => {
    const source = createDefaultNode("ac-line", { x: 100, y: 120 });
    const target = createDefaultNode("ac-line", { x: 460, y: 120 });
    const edge: Edge = {
      id: "over-bent-connection",
      sourceId: source.id,
      targetId: target.id,
      sourceTerminalId: "t2",
      targetTerminalId: "t1",
      manualPoints: [
        { x: 180, y: 120 },
        { x: 180, y: 220 },
        { x: 280, y: 220 },
        { x: 280, y: 80 },
        { x: 380, y: 80 },
        { x: 380, y: 120 }
      ]
    };

    const prepared = prepareConnectionEdgeForCommit([source, target], [edge], edge.id, { width: 640, height: 320 });
    const route = prepared.edge
      ? routeEdgesForRendering([source, target], [prepared.edge], { width: 640, height: 320 })[0]
      : undefined;

    expect(prepared.ok).toBe(true);
    expect(prepared.issues).toEqual([]);
    expect(prepared.edge?.manualPoints ?? []).toHaveLength(2);
    expect(route?.points).toHaveLength(4);
    expect(route?.points[1].y).toBe(route?.points[2].y);
    expect(new Set(route?.points.map((point) => point.y))).toEqual(new Set([120]));
  });

  test("reroutes committed connection endpoints around nearby graphics instead of surfacing blocker failures", () => {
    const source = { ...createDefaultNode("ac-source", { x: 100, y: 100 }), id: "source" };
    const target = { ...createDefaultNode("ac-load", { x: 460, y: 100 }), id: "target" };
    const blocker = {
      ...createDefaultNode("ac-pv-source", { x: 180, y: 140 }),
      id: "pv-blocker",
      name: "交流光伏"
    };
    const edge: Edge = {
      id: "rewired-near-pv",
      sourceId: source.id,
      targetId: target.id,
      sourceTerminalId: "t1",
      targetTerminalId: "t1"
    };

    const prepared = prepareConnectionEdgeForCommit([source, target, blocker], [edge], edge.id, { width: 640, height: 300 });
    const validation = prepared.edge
      ? validateConnectionEdgeRoute([source, target, blocker], [prepared.edge], prepared.edge.id, { width: 640, height: 300 })
      : prepared;

    expect(prepared.ok).toBe(true);
    expect(prepared.edge).toBeDefined();
    expect(validation.ok).toBe(true);
    expect(validation.issues).toEqual([]);
    expect(validation.route?.points[0]).toEqual(getTerminalPoint(source, "t1"));
    expect(validation.route?.points[validation.route.points.length - 1]).toEqual(getTerminalPoint(target, "t1"));
  });

  test("branches a second connection from the same terminal without treating the shared endpoint stub as impossible", () => {
    const source = { ...createDefaultNode("ac-source", { x: 120, y: 140 }), id: "source" };
    const loadA = { ...createDefaultNode("ac-load", { x: 420, y: 80 }), id: "load-a" };
    const loadB = { ...createDefaultNode("ac-load", { x: 420, y: 220 }), id: "load-b" };
    const firstEdge: Edge = {
      id: "first-branch",
      sourceId: source.id,
      targetId: loadA.id,
      sourceTerminalId: "t1",
      targetTerminalId: "t1"
    };
    const firstPrepared = prepareConnectionEdgeForCommit([source, loadA, loadB], [firstEdge], firstEdge.id, { width: 700, height: 320 });
    const secondEdge: Edge = {
      id: "second-branch",
      sourceId: source.id,
      targetId: loadB.id,
      sourceTerminalId: "t1",
      targetTerminalId: "t1"
    };

    const secondPrepared = prepareConnectionEdgeForCommit(
      [source, loadA, loadB],
      [firstPrepared.edge!, secondEdge],
      secondEdge.id,
      { width: 700, height: 320 }
    );
    const routes = secondPrepared.edge
      ? routeEdgesForRendering([source, loadA, loadB], [firstPrepared.edge!, secondPrepared.edge], { width: 700, height: 320 })
      : [];
    const secondRoute = routes.find((route) => route.edgeId === secondEdge.id);
    const validation = secondPrepared.edge
      ? validateConnectionEdgeRoute([source, loadA, loadB], [firstPrepared.edge!, secondPrepared.edge], secondEdge.id, { width: 700, height: 320 })
      : secondPrepared;

    expect(secondPrepared.ok).toBe(true);
    expect(secondPrepared.edge).toBeDefined();
    expect(validation.ok).toBe(true);
    expect(validation.issues).toEqual([]);
    expect(secondRoute?.points.some((point) => point.y !== 140 && point.y !== 220)).toBe(true);
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

  test("scales keyboard move steps with the current view box zoom", () => {
    const bounds = { width: 1980, height: 1024 };

    expect(keyboardMoveStepForViewBox({ x: 0, y: 0, width: 1980, height: 1024 }, bounds)).toBe(6);
    expect(keyboardMoveStepForViewBox({ x: 0, y: 0, width: 990, height: 512 }, bounds)).toBe(3);
    expect(keyboardMoveStepForViewBox({ x: 0, y: 0, width: 3960, height: 2048 }, bounds)).toBe(12);
    expect(keyboardMoveStepForViewBox({ x: 0, y: 0, width: 120, height: 80 }, bounds)).toBe(1);
    expect(keyboardMoveStepForViewBox({ x: 0, y: 0, width: 990, height: 512 }, bounds, 24)).toBe(12);
  });

  test("reports the current view box zoom as a percentage", () => {
    const bounds = { width: 1980, height: 1024 };

    expect(viewBoxZoomPercent({ x: 0, y: 0, width: 1980, height: 1024 }, bounds)).toBe(100);
    expect(viewBoxZoomPercent({ x: 0, y: 0, width: 990, height: 512 }, bounds)).toBe(200);
    expect(viewBoxZoomPercent({ x: 0, y: 0, width: 3960, height: 2048 }, bounds)).toBe(50);
  });

  test("clamps wheel zoom dimensions between 5 percent and 2000 percent", () => {
    const bounds = { width: 1980, height: 1024 };

    const maximumZoom = clampViewBoxDimensionsForZoom({ width: 10, height: 10 }, bounds);
    expect(maximumZoom.width).toBeCloseTo(99);
    expect(maximumZoom.height).toBeCloseTo(51.2);
    expect(viewBoxZoomPercent({ x: 0, y: 0, ...maximumZoom }, bounds)).toBe(2000);

    const minimumZoom = clampViewBoxDimensionsForZoom({ width: 100000, height: 100000 }, bounds);
    expect(minimumZoom.width).toBeCloseTo(39600);
    expect(minimumZoom.height).toBeCloseTo(20480);
    expect(viewBoxZoomPercent({ x: 0, y: 0, ...minimumZoom }, bounds)).toBe(5);
  });

  test("measures the displayed model content size from nodes and connection paths", () => {
    const node: ModelNode = {
      id: "node-1",
      kind: "static-rect",
      name: "图元1",
      nodeNumber: "",
      acTopologyNode: 0,
      dcTopologyNode: 0,
      position: { x: 100, y: 80 },
      size: { width: 60, height: 40 },
      rotation: 0,
      scale: 1,
      terminals: [],
      params: {}
    };
    const edge: Edge = {
      id: "edge-1",
      sourceId: "missing-source",
      targetId: "missing-target",
      sourcePoint: { x: 250, y: 180 },
      targetPoint: { x: 270, y: 190 },
      manualPoints: [{ x: 320, y: 210 }]
    };

    expect(
      calculateModelContentSize(
        [node],
        [edge],
        [{ edgeId: "edge-1", points: [{ x: 10, y: 10 }, { x: 430, y: 220 }], path: "" }]
      )
    ).toEqual({ width: 430, height: 220 });
  });

  test("checks display boundary clearance with both graphics and connection paths", () => {
    const node = createDefaultNode("ac-source", { x: 120, y: 90 });
    const routeNearBoundary = [{ edgeId: "edge-near", points: [{ x: 4, y: 80 }, { x: 160, y: 80 }], path: "" }];
    const routeClear = [{ edgeId: "edge-clear", points: [{ x: 24, y: 80 }, { x: 160, y: 80 }], path: "" }];
    const bounds = calculateModelGeometryBounds([node], routeNearBoundary);

    expect(bounds?.left).toBe(4);
    expect(geometryBoundsInsideCanvas(bounds, { width: 360, height: 240 }, 8)).toBe(false);
    expect(modelGeometryInsideCanvasBounds([node], routeNearBoundary, { width: 360, height: 240 }, 8)).toBe(false);
    expect(modelGeometryInsideCanvasBounds([node], routeClear, { width: 360, height: 240 }, 8)).toBe(true);
  });

  test("normalizes scale values without enforcing user-facing min or max ratios", () => {
    expect(normalizeScaleValue(0)).toBe(0);
    expect(normalizeScaleValue(0.05)).toBe(0.05);
    expect(normalizeScaleValue(8)).toBe(8);
    expect(normalizeScaleValue(-2)).toBe(-2);
    expect(normalizeScaleValue(Number.NaN, 1.5)).toBe(1.5);
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

  test("keeps endpoint stub points so a straight connection exposes a draggable middle segment", () => {
    const source = createDefaultNode("ac-source", { x: 100, y: 100 });
    const branch = createDefaultNode("ac-line", { x: 360, y: 100 });
    const edge: Edge = {
      id: "straight",
      sourceId: source.id,
      targetId: branch.id,
      sourceTerminalId: "t1",
      targetTerminalId: "t1"
    };

    const route = routeEdgesForRendering([source, branch], [edge], { width: 640, height: 260 })[0];

    expect(route.points.length).toBeGreaterThanOrEqual(4);
    expect(route.points[1].y).toBe(route.points[2].y);
    expect(route.points[1].x).not.toBe(route.points[2].x);
  });

  test("removes redundant collinear middle points while preserving endpoint stubs", () => {
    const source = createDefaultNode("ac-source", { x: 100, y: 100 });
    const branch = createDefaultNode("ac-line", { x: 420, y: 100 });
    const edge: Edge = {
      id: "redundant-collinear",
      sourceId: source.id,
      targetId: branch.id,
      sourceTerminalId: "t1",
      targetTerminalId: "t1",
      manualPoints: [
        { x: 180, y: 100 },
        { x: 260, y: 100 },
        { x: 340, y: 100 }
      ]
    };

    const route = routeEdgesForRendering([source, branch], [edge], { width: 640, height: 260 })[0];

    expect(route.points).toHaveLength(4);
    expect(route.points[0]).toEqual(getTerminalPoint(source, "t1"));
    expect(route.points[1].y).toBe(route.points[2].y);
    expect(route.points[3]).toEqual(getTerminalPoint(branch, "t1"));
  });

  test("tidies tiny dogleg bends while preserving endpoint stubs", () => {
    const routePoints: Point[] = [
      { x: 20, y: 80 },
      { x: 60, y: 80 },
      { x: 60, y: 86 },
      { x: 180, y: 86 },
      { x: 180, y: 80 },
      { x: 240, y: 80 }
    ];

    const tidied = tidyOrthogonalRoute(routePoints);

    expect(tidied).toEqual([
      { x: 20, y: 80 },
      { x: 60, y: 80 },
      { x: 180, y: 80 },
      { x: 240, y: 80 }
    ]);
  });

  test("removes redundant large dogleg bends when the direct segment is clear", () => {
    const routePoints: Point[] = [
      { x: 20, y: 80 },
      { x: 60, y: 80 },
      { x: 60, y: 150 },
      { x: 180, y: 150 },
      { x: 180, y: 80 },
      { x: 240, y: 80 }
    ];

    const tidied = tidyOrthogonalRoute(routePoints);

    expect(tidied).toEqual([
      { x: 20, y: 80 },
      { x: 60, y: 80 },
      { x: 180, y: 80 },
      { x: 240, y: 80 }
    ]);
  });

  test("keeps large dogleg bends when the direct segment would hit a blocker", () => {
    const blocker = {
      ...createDefaultNode("static-rect", { x: 120, y: 80 }),
      size: { width: 90, height: 18 }
    };
    const routePoints: Point[] = [
      { x: 20, y: 80 },
      { x: 60, y: 80 },
      { x: 60, y: 150 },
      { x: 180, y: 150 },
      { x: 180, y: 80 },
      { x: 240, y: 80 }
    ];

    const tidied = tidyOrthogonalRoute(routePoints, { blockers: [blocker] });

    expect(tidied).toEqual(routePoints);
  });

  test("does not tidy tiny doglegs when the simplified path would hit a blocker", () => {
    const blocker = {
      ...createDefaultNode("static-rect", { x: 120, y: 80 }),
      size: { width: 80, height: 12 }
    };
    const routePoints: Point[] = [
      { x: 20, y: 80 },
      { x: 60, y: 80 },
      { x: 60, y: 96 },
      { x: 180, y: 96 },
      { x: 180, y: 80 },
      { x: 240, y: 80 }
    ];

    const tidied = tidyOrthogonalRoute(routePoints, { blockers: [blocker] });

    expect(tidied).toEqual(routePoints);
  });

  test("ignores tiny internal route segments as drag targets when longer segments are available", () => {
    const routePoints: Point[] = [
      { x: 20, y: 80 },
      { x: 60, y: 80 },
      { x: 60, y: 86 },
      { x: 180, y: 86 },
      { x: 180, y: 80 },
      { x: 240, y: 80 }
    ];

    expect(getMovableRouteSegmentIndexes(routePoints)).toEqual([2]);
  });

  test("moves a manual horizontal or vertical segment directly to the pointer coordinate", () => {
    const routePoints: Point[] = [
      { x: 20, y: 20 },
      { x: 80, y: 20 },
      { x: 80, y: 120 },
      { x: 220, y: 120 },
      { x: 220, y: 20 },
      { x: 280, y: 20 }
    ];

    const movedVertical = moveOrthogonalRouteSegment(routePoints, 1, "vertical", { x: 140, y: 74 }, { width: 320, height: 180 });
    expect(movedVertical[1]).toEqual({ x: 140, y: 20 });
    expect(movedVertical[2]).toEqual({ x: 140, y: 120 });

    const movedHorizontal = moveOrthogonalRouteSegment(routePoints, 2, "horizontal", { x: 150, y: 88 }, { width: 320, height: 180 });
    expect(movedHorizontal[2]).toEqual({ x: 80, y: 88 });
    expect(movedHorizontal[3]).toEqual({ x: 220, y: 88 });
  });

  test("inserts an orthogonal manual bend into a horizontal or vertical segment", () => {
    const routePoints: Point[] = [
      { x: 20, y: 20 },
      { x: 80, y: 20 },
      { x: 80, y: 120 },
      { x: 220, y: 120 },
      { x: 220, y: 20 },
      { x: 280, y: 20 }
    ];

    const horizontalBend = insertOrthogonalRouteBend(routePoints, 2, { x: 150, y: 160 }, { width: 320, height: 220 });
    expect(horizontalBend.slice(2, 6)).toEqual([
      { x: 80, y: 120 },
      { x: 150, y: 120 },
      { x: 150, y: 152 },
      { x: 182, y: 152 }
    ]);

    const verticalBend = insertOrthogonalRouteBend(routePoints, 1, { x: 120, y: 72 }, { width: 320, height: 220 });
    expect(verticalBend.slice(1, 5)).toEqual([
      { x: 80, y: 20 },
      { x: 80, y: 72 },
      { x: 112, y: 72 },
      { x: 112, y: 104 }
    ]);

    for (const route of [horizontalBend, verticalBend]) {
      for (let index = 1; index < route.length; index += 1) {
        expect(route[index - 1].x === route[index].x || route[index - 1].y === route[index].y).toBe(true);
      }
    }
  });

  test("recognizes repeated connection-line pointer clicks across rerendered path elements", () => {
    const firstClick = { edgeId: "edge-1", clientX: 120, clientY: 80, at: 1000 };

    expect(isRepeatedEdgePointerClick(firstClick, { edgeId: "edge-1", clientX: 124, clientY: 82, at: 1300 })).toBe(true);
    expect(isRepeatedEdgePointerClick(firstClick, { edgeId: "edge-2", clientX: 124, clientY: 82, at: 1300 })).toBe(false);
    expect(isRepeatedEdgePointerClick(firstClick, { edgeId: "edge-1", clientX: 150, clientY: 82, at: 1300 })).toBe(false);
    expect(isRepeatedEdgePointerClick(firstClick, { edgeId: "edge-1", clientX: 124, clientY: 82, at: 1600 })).toBe(false);
  });

  test("inserts a visible bend on short segments away from adjacent turns", () => {
    const shortHorizontalNearTurn: Point[] = [
      { x: 498, y: 455 },
      { x: 526, y: 455 },
      { x: 548, y: 455 },
      { x: 548, y: 487 },
      { x: 648, y: 487 }
    ];
    const horizontalBend = insertOrthogonalRouteBend(
      shortHorizontalNearTurn,
      1,
      { x: 537, y: 455 },
      { width: 1980, height: 1024 }
    );
    expect(horizontalBend.slice(1, 7)).toEqual([
      { x: 526, y: 455 },
      { x: 537, y: 455 },
      { x: 537, y: 423 },
      { x: 548, y: 423 },
      { x: 548, y: 455 },
      { x: 548, y: 487 }
    ]);

    const shortVerticalNearTurn: Point[] = [
      { x: 100, y: 100 },
      { x: 100, y: 128 },
      { x: 100, y: 150 },
      { x: 132, y: 150 }
    ];
    const verticalBend = insertOrthogonalRouteBend(
      shortVerticalNearTurn,
      1,
      { x: 100, y: 139 },
      { width: 400, height: 400 }
    );
    expect(verticalBend.slice(1, 7)).toEqual([
      { x: 100, y: 128 },
      { x: 100, y: 139 },
      { x: 68, y: 139 },
      { x: 68, y: 150 },
      { x: 100, y: 150 },
      { x: 132, y: 150 }
    ]);
  });

  test("keeps endpoint stubs perpendicular after routing through inserted manual bends", () => {
    const source = createDefaultNode("ac-source", { x: 120, y: 120 });
    const target = createDefaultNode("ac-load", { x: 520, y: 120 });
    const edge: Edge = {
      id: "manual-bend-perpendicular",
      sourceId: source.id,
      targetId: target.id,
      sourceTerminalId: "t1",
      targetTerminalId: "t1"
    };
    const baseRoute = routeOrthogonalEdge(source, target, [source, target], edge);
    const bendRoute = insertOrthogonalRouteBend(baseRoute, 1, { x: 230, y: 190 }, { width: 700, height: 320 });
    const manualEdge = { ...edge, manualPoints: bendRoute.slice(2, -2) };
    const rerouted = routeOrthogonalEdge(source, target, [source, target], manualEdge, [], { width: 700, height: 320 });
    const sourceTerminal = getTerminalPoint(source, "t1");
    const targetTerminal = getTerminalPoint(target, "t1");

    expect(rerouted.some((point) => point.y > sourceTerminal.y)).toBe(true);
    expect(rerouted[0]).toEqual(sourceTerminal);
    expect(rerouted[1].y).toBe(sourceTerminal.y);
    expect(rerouted[1].x).toBeGreaterThan(sourceTerminal.x);
    expect(rerouted[rerouted.length - 1]).toEqual(targetTerminal);
    expect(rerouted[rerouted.length - 2].y).toBe(targetTerminal.y);
    expect(rerouted[rerouted.length - 2].x).toBeGreaterThan(targetTerminal.x);
  });

  test("repairs a manual bend path around blockers instead of discarding the manual route", () => {
    const source = createDefaultNode("ac-source", { x: 120, y: 120 });
    const target = createDefaultNode("ac-load", { x: 520, y: 120 });
    const blocker = createDefaultNode("ac-switch", { x: 330, y: 190 });
    const edge: Edge = {
      id: "manual-bend-repair",
      sourceId: source.id,
      targetId: target.id,
      sourceTerminalId: "t1",
      targetTerminalId: "t1"
    };
    const baseRoute = routeOrthogonalEdge(source, target, [source, target], edge);
    const bendRoute = insertOrthogonalRouteBend(baseRoute, 1, { x: 260, y: 190 }, { width: 700, height: 320 });
    const manualEdge = { ...edge, manualPoints: bendRoute.slice(2, -2) };

    const rerouted = routeOrthogonalEdge(source, target, [source, target, blocker], manualEdge, [], { width: 700, height: 320 });

    expect(rerouted.some((point) => point.y !== 120)).toBe(true);
    expect(rerouted.length).toBeGreaterThan(4);
    for (let index = 1; index < rerouted.length; index += 1) {
      expect(rerouted[index - 1].x === rerouted[index].x || rerouted[index - 1].y === rerouted[index].y).toBe(true);
    }
  });

  test("preserves the dragged connection route shape when only one endpoint moves", () => {
    const routePoints: Point[] = [
      { x: 100, y: 100 },
      { x: 130, y: 100 },
      { x: 130, y: 180 },
      { x: 240, y: 180 },
      { x: 300, y: 180 },
      { x: 300, y: 140 }
    ];

    const preserved = preserveDraggedRouteShape({
      routePoints,
      nextStart: { x: 140, y: 140 },
      nextEnd: { x: 300, y: 140 },
      sourceDelta: { x: 40, y: 40 },
      targetDelta: { x: 0, y: 0 }
    });

    expect(preserved).toEqual([
      { x: 140, y: 140 },
      { x: 170, y: 140 },
      { x: 170, y: 220 },
      { x: 280, y: 220 },
      { x: 300, y: 220 },
      { x: 300, y: 140 }
    ]);
    for (let index = 1; index < preserved.length; index += 1) {
      expect(preserved[index - 1].x === preserved[index].x || preserved[index - 1].y === preserved[index].y).toBe(true);
    }
  });

  test("marks every non-end route segment as movable", () => {
    const routePoints: Point[] = [
      { x: 20, y: 20 },
      { x: 80, y: 20 },
      { x: 80, y: 120 },
      { x: 220, y: 120 },
      { x: 220, y: 20 },
      { x: 280, y: 20 }
    ];

    expect(getMovableRouteSegmentIndexes(routePoints)).toEqual([1, 2, 3]);
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

  test("reroutes unrelated connection lines when a moved graphic blocks their previous path", () => {
    const source = { ...createDefaultNode("ac-source", { x: 120, y: 140 }), id: "source" };
    const target = { ...createDefaultNode("ac-load", { x: 520, y: 140 }), id: "target" };
    const blocker = { ...createDefaultNode("ac-pv-source", { x: 900, y: 140 }), id: "moved-pv", name: "交流光伏" };
    const movedBlocker = { ...blocker, position: { x: 300, y: 201 } };
    const edge: Edge = {
      id: "blocked-after-move",
      sourceId: source.id,
      targetId: target.id,
      sourceTerminalId: "t1",
      targetTerminalId: "t1"
    };
    const beforeRoutes = routeEdgesForRendering([source, target, blocker], [edge], { width: 700, height: 320 });

    const nextEdges = rerouteEdgesAroundMovedNodes(
      [source, target, movedBlocker],
      [edge],
      [movedBlocker.id],
      beforeRoutes,
      { width: 700, height: 320 }
    );
    const validation = validateConnectionEdgeRoute(
      [source, target, movedBlocker],
      nextEdges,
      edge.id,
      { width: 700, height: 320 }
    );

    expect(nextEdges[0].manualPoints?.length).toBeGreaterThan(0);
    expect(validation.ok).toBe(true);
    expect(validation.issues).toEqual([]);
    expect(validation.route?.points).not.toEqual(beforeRoutes[0].points);
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

  test("routes around rotated device structure when rotation changes terminals and glyphs", () => {
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
    const blockerHalfWidth = (blocker.size.width * Math.abs(getNodeScaleX(blocker))) / 2;
    const blockerHalfHeight = (blocker.size.height * Math.abs(getNodeScaleY(blocker))) / 2;
    const blockerRadians = (blocker.rotation * Math.PI) / 180;
    const blockerVisualHalfWidth = blockerHalfWidth * Math.abs(Math.cos(blockerRadians)) + blockerHalfHeight * Math.abs(Math.sin(blockerRadians));
    const blockerVisualHalfHeight = blockerHalfWidth * Math.abs(Math.sin(blockerRadians)) + blockerHalfHeight * Math.abs(Math.cos(blockerRadians));
    const blockerBox = {
      left: blocker.position.x - blockerVisualHalfWidth - 8,
      right: blocker.position.x + blockerVisualHalfWidth + 8,
      top: blocker.position.y - blockerVisualHalfHeight - 8,
      bottom: blocker.position.y + blockerVisualHalfHeight + 8
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

  test("uses rotated device body bounds while rotation also moves terminals", () => {
    const node = { ...createDefaultNode("ac-line", { x: 260, y: 120 }), rotation: 90 };
    const bounds = calculateModelGeometryBounds([node], [], 0);
    const terminal = getTerminalPoint(node, "t2");
    const halfWidth = (node.size.width * Math.abs(getNodeScaleX(node))) / 2;
    const halfHeight = (node.size.height * Math.abs(getNodeScaleY(node))) / 2;

    expect(bounds).toEqual({
      left: node.position.x - halfHeight,
      right: node.position.x + halfHeight,
      top: node.position.y - halfWidth,
      bottom: node.position.y + halfWidth
    });
    expect(terminal.x).toBe(node.position.x);
    expect(terminal.y).toBeGreaterThan(node.position.y);
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

  test("slides the bus endpoint when the opposite device moves so a straight line remains straight", () => {
    const load = createDefaultNode("ac-load", { x: 200, y: 100 });
    const movedLoad = { ...load, position: { x: 260, y: 100 } };
    const bus = createDefaultNode("ac-bus", { x: 300, y: 100 });
    const edge: Edge = {
      id: "slide-straight-bus",
      sourceId: load.id,
      targetId: bus.id,
      sourceTerminalId: "t1",
      targetTerminalId: "t1",
      targetPoint: { x: 243, y: 100 }
    };

    const patch = resolveStraightBusSlideEndpoint({
      edge,
      sourceNode: load,
      targetNode: bus,
      nextSourceNode: movedLoad,
      nextTargetNode: bus,
      movingEndpoint: "source",
      nodes: [load, bus],
      nextNodes: [movedLoad, bus]
    });

    expect(patch).toEqual({ targetPoint: { x: 303, y: 100 } });
  });

  test("slides bus endpoints for manual and non-straight connections instead of limiting the behavior to straight lines", () => {
    const load = createDefaultNode("ac-load", { x: 200, y: 100 });
    const movedLoad = { ...load, position: { x: 260, y: 140 } };
    const bus = createDefaultNode("ac-bus", { x: 300, y: 100 });
    const edge: Edge = {
      id: "slide-manual-bus",
      sourceId: load.id,
      targetId: bus.id,
      sourceTerminalId: "t1",
      targetTerminalId: "t1",
      targetPoint: { x: 243, y: 100 },
      manualPoints: [
        { x: 260, y: 130 },
        { x: 320, y: 130 }
      ]
    };

    const patch = resolveStraightBusSlideEndpoint({
      edge,
      sourceNode: load,
      targetNode: bus,
      nextSourceNode: movedLoad,
      nextTargetNode: bus,
      movingEndpoint: "source",
      nodes: [load, bus],
      nextNodes: [movedLoad, bus]
    });

    expect(patch).toEqual({ targetPoint: { x: 303, y: 100 } });
  });

  test("keeps the moved bus endpoint connected by clamping it to the bus range", () => {
    const load = createDefaultNode("ac-load", { x: 200, y: 100 });
    const movedLoad = { ...load, position: { x: 520, y: 100 } };
    const bus = createDefaultNode("ac-bus", { x: 300, y: 100 });
    const edge: Edge = {
      id: "slide-clamped-bus",
      sourceId: load.id,
      targetId: bus.id,
      sourceTerminalId: "t1",
      targetTerminalId: "t1",
      targetPoint: { x: 243, y: 100 }
    };

    const patch = resolveStraightBusSlideEndpoint({
      edge,
      sourceNode: load,
      targetNode: bus,
      nextSourceNode: movedLoad,
      nextTargetNode: bus,
      movingEndpoint: "source",
      nodes: [load, bus],
      nextNodes: [movedLoad, bus]
    });

    expect(patch).toEqual({ targetPoint: { x: 360, y: 100 } });
  });

  test("slides the opposite bus endpoint while a connection endpoint is being rewired or dragged", () => {
    const bus = createDefaultNode("ac-bus", { x: 300, y: 100 });
    const load = createDefaultNode("ac-load", { x: 460, y: 180 });
    const edge: Edge = {
      id: "slide-rewire-bus",
      sourceId: bus.id,
      targetId: load.id,
      sourceTerminalId: "t1",
      sourcePoint: { x: 260, y: 100 },
      targetTerminalId: "t1",
      manualPoints: [
        { x: 300, y: 150 },
        { x: 420, y: 150 }
      ]
    };

    const patch = resolveStraightBusSlideEndpointToPoint({
      edge,
      sourceNode: bus,
      targetNode: load,
      movingEndpoint: "target",
      movingPoint: { x: 330, y: 190 },
      nodes: [bus, load]
    });

    expect(patch).toEqual({ sourcePoint: { x: 330, y: 100 } });
  });

  test("connects to thermal storage tank boundary with a perpendicular movable middle segment", () => {
    const source = createDefaultNode("heat-pipeline", { x: 160, y: 120 });
    const tank = createDefaultNode("thermal-storage-tank", { x: 420, y: 120 });
    const edge: Edge = {
      id: "e-thermal-storage",
      sourceId: source.id,
      targetId: tank.id,
      sourceTerminalId: "t2",
      targetTerminalId: "t1"
    };

    const points = routeOrthogonalEdge(source, tank, [source, tank], edge);
    const targetPoint = points[points.length - 1];
    const beforeTarget = points[points.length - 2];

    expect(targetPoint).toEqual({ x: tank.position.x - tank.size.width / 2, y: tank.position.y });
    expect(beforeTarget.y).toBe(targetPoint.y);
    expect(beforeTarget.x).toBeLessThan(targetPoint.x);
    expect(getMovableRouteSegmentIndexes(points)).toContain(1);
  });

  test("connects to hydrogen tank boundary with a perpendicular movable middle segment", () => {
    const source = createDefaultNode("hydrogen-pipeline", { x: 160, y: 120 });
    const tank = createDefaultNode("hydrogen-tank", { x: 420, y: 120 });
    const edge: Edge = {
      id: "e-hydrogen-tank",
      sourceId: source.id,
      targetId: tank.id,
      sourceTerminalId: "t2",
      targetTerminalId: "t1"
    };

    const points = routeOrthogonalEdge(source, tank, [source, tank], edge);
    const targetPoint = points[points.length - 1];
    const beforeTarget = points[points.length - 2];

    expect(targetPoint).toEqual({ x: tank.position.x - tank.size.width / 2, y: tank.position.y });
    expect(beforeTarget.y).toBe(targetPoint.y);
    expect(beforeTarget.x).toBeLessThan(targetPoint.x);
    expect(getMovableRouteSegmentIndexes(points)).toContain(1);
  });

  test("allows only terminals with the same electrical type to connect", () => {
    const acBus = createDefaultNode("ac-bus", { x: 100, y: 100 });
    const acLoad = createDefaultNode("ac-load", { x: 240, y: 100 });
    const dcLoad = createDefaultNode("dc-load", { x: 380, y: 100 });

    expect(canConnectTerminals(acBus, "t1", acLoad, acLoad.terminals[0].id)).toBe(true);
    expect(canConnectTerminals(acBus, "t1", dcLoad, dcLoad.terminals[0].id)).toBe(false);
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

  test("aligns selected nodes to left, right, top, and bottom edges", () => {
    const nodes: ModelNode[] = [
      createDefaultNode("ac-source", { x: 100, y: 100 }),
      createDefaultNode("ac-switch", { x: 280, y: 220 }),
      createDefaultNode("ac-load", { x: 440, y: 320 })
    ];
    const selectedIds = [nodes[0].id, nodes[2].id];
    const firstHalfWidth = nodes[0].size.width / 2;
    const thirdHalfWidth = nodes[2].size.width / 2;
    const firstHalfHeight = nodes[0].size.height / 2;
    const thirdHalfHeight = nodes[2].size.height / 2;

    const left = alignNodes(nodes, selectedIds, "left");
    expect(left.find((node) => node.id === nodes[0].id)?.position.x).toBe(100);
    expect(left.find((node) => node.id === nodes[2].id)?.position.x).toBe(100 - firstHalfWidth + thirdHalfWidth);
    expect(left.find((node) => node.id === nodes[1].id)?.position).toEqual({ x: 280, y: 220 });

    const right = alignNodes(nodes, selectedIds, "right");
    expect(right.find((node) => node.id === nodes[0].id)?.position.x).toBe(440 + thirdHalfWidth - firstHalfWidth);
    expect(right.find((node) => node.id === nodes[2].id)?.position.x).toBe(440);

    const top = alignNodes(nodes, selectedIds, "top");
    expect(top.find((node) => node.id === nodes[0].id)?.position.y).toBe(100);
    expect(top.find((node) => node.id === nodes[2].id)?.position.y).toBe(100 - firstHalfHeight + thirdHalfHeight);

    const bottom = alignNodes(nodes, selectedIds, "bottom");
    expect(bottom.find((node) => node.id === nodes[0].id)?.position.y).toBe(320 + thirdHalfHeight - firstHalfHeight);
    expect(bottom.find((node) => node.id === nodes[2].id)?.position.y).toBe(320);
  });

  test("distributes selected nodes horizontally and vertically while keeping edge nodes fixed", () => {
    const nodes: ModelNode[] = [
      createDefaultNode("ac-source", { x: 100, y: 80 }),
      createDefaultNode("ac-switch", { x: 430, y: 360 }),
      createDefaultNode("ac-load", { x: 220, y: 220 }),
      createDefaultNode("dc-load", { x: 800, y: 800 })
    ];
    const selectedIds = [nodes[0].id, nodes[1].id, nodes[2].id];

    const horizontal = distributeNodes(nodes, selectedIds, "horizontal");
    expect(horizontal.find((node) => node.id === nodes[0].id)?.position.x).toBe(100);
    expect(horizontal.find((node) => node.id === nodes[2].id)?.position.x).toBe(265);
    expect(horizontal.find((node) => node.id === nodes[1].id)?.position.x).toBe(430);
    expect(horizontal.find((node) => node.id === nodes[3].id)?.position).toEqual({ x: 800, y: 800 });

    const vertical = distributeNodes(nodes, selectedIds, "vertical");
    expect(vertical.find((node) => node.id === nodes[0].id)?.position.y).toBe(80);
    expect(vertical.find((node) => node.id === nodes[2].id)?.position.y).toBe(220);
    expect(vertical.find((node) => node.id === nodes[1].id)?.position.y).toBe(360);
    expect(vertical.find((node) => node.id === nodes[3].id)?.position).toEqual({ x: 800, y: 800 });
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
    expect(node.params.vbase).toBe("0");
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
    expect(node.params.vbase).toBe("0");
    expect(getDeviceGlyphVariant("ac-storage")).toBe("battery-storage");
  });

  test("includes hydrogen equipment library with mixed electric-hydrogen ports", () => {
    const expected = [
      ["ac-electrolyzer", "交流电制氢", ["ac", "h2"], "hydrogen-electrolyzer"],
      ["dc-electrolyzer", "直流电制氢", ["dc", "h2"], "hydrogen-electrolyzer"],
      ["hydrogen-source", "氢源", ["h2"], "hydrogen-source"],
      ["hydrogen-tank", "储氢罐", [], "hydrogen-storage"],
      ["hydrogen-load", "氢荷", ["h2"], "hydrogen-load"],
      ["ac-fuel-cell", "交流燃料电池", ["ac", "h2"], "hydrogen-fuel-cell"],
      ["dc-fuel-cell", "直流燃料电池", ["dc", "h2"], "hydrogen-fuel-cell"],
      ["hydrogen-bus", "氢能母线", [], "hydrogen-bus"],
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
      ["thermal-storage-tank", "储热罐", [], "heat-storage"],
      ["heat-load", "热负荷", ["heat"], "heat-load"],
      ["single-port-heat-load", "单端热荷", ["heat"], "heat-load"],
      ["two-port-heat-load", "双端热荷", ["heat", "heat"], "heat-load"],
      ["heat-bus", "热力母线", [], "heat-bus"],
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
      "idx_heat2_unit_t3"
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
    expect(node.params.idx_heat2_unit_t4).toBeUndefined();
    expect(node.params.t1_node).toBeUndefined();
    expect(node.params.t2_node).toBeUndefined();
  });

  test("creates container definitions from explicit terminal association choices", () => {
    const terminalTypes = ["ac", "dc", "h2", "heat", "heat"] as const;
    const terminalAssociations = ["ac-generator", "dc-load", "h2-source", "heat2-load", ""] as const;
    const definitions = buildDefaultDeviceParameterDefinitions(terminalTypes, {
      isContainer: true,
      terminalAssociations
    });

    expect(getContainerAssociationRelationKey("ac-generator", 0)).toBe("idx_ac_unit_t1");
    expect(getContainerAssociationRelationKey("dc-load", 1)).toBe("idx_dc_load_t2");
    expect(getContainerAssociationRelationKey("h2-source", 2)).toBe("idx_h2_unit_t3");
    expect(getContainerAssociationRelationKey("heat2-load", 3)).toBe("idx_heat2_load_t4");
    expect(definitions.map((definition) => definition.enName)).toEqual([
      "idx",
      "name",
      "run_stat",
      "is_container",
      "idx_ac_unit_t1",
      "idx_dc_load_t2",
      "idx_h2_unit_t3",
      "idx_heat2_load_t4"
    ]);
    expect(definitions.find((definition) => definition.enName === "idx_ac_unit_t1")?.cnName).toContain("交流电源");
    expect(definitions.find((definition) => definition.enName === "idx_heat2_load_t4")?.cnName).toContain("双端热荷");
    expect(definitions.some((definition) => definition.enName.includes("node"))).toBe(false);

    const template: DeviceTemplate = {
      kind: "CustomAssociationDeviceModel",
      label: "CustomAssociationDeviceModel",
      group: "自定义元件库",
      size: { width: 104, height: 64 },
      params: {},
      terminalType: "ac",
      terminalCount: 2,
      terminalTypes: ["ac", "dc"],
      terminalAssociations: ["ac-generator", "dc-generator"],
      isContainer: true,
      custom: true,
      parameterDefinitions: buildDefaultDeviceParameterDefinitions(["ac", "dc"], {
        isContainer: true,
        terminalAssociations: ["ac-generator", "dc-generator"]
      })
    };
    expect(describeContainerTerminalAssociations(template)).toEqual([
      expect.objectContaining({
        relationKey: "idx_ac_unit_t1",
        roleLabel: "交流电源",
        deviceModel: "ACGenerator"
      }),
      expect.objectContaining({
        relationKey: "idx_dc_unit_t2",
        roleLabel: "直流电源",
        deviceModel: "DCGenerator"
      })
    ]);
  });

  test("validates explicit container associations against terminal energy types", () => {
    const wrongEnergy = validateContainerTerminalAssociations(["ac"], ["dc-load"]);
    expect(wrongEnergy.valid).toBe(false);
    expect(wrongEnergy.message).toContain("交流电");

    const invalidLast = validateContainerTerminalAssociations(["heat"], ["heat2-source"]);
    expect(invalidLast.valid).toBe(false);
    expect(invalidLast.message).toContain("最后一个端子");

    const invalidDependentValue = validateContainerTerminalAssociations(["heat", "heat"], ["heat2-source", "heat2-source"]);
    expect(invalidDependentValue.valid).toBe(false);
    expect(invalidDependentValue.message).toContain("关联属性应为空");

    const valid = validateContainerTerminalAssociations(["heat", "heat"], ["heat2-source", ""]);
    expect(valid.valid).toBe(true);
  });

  test("describes container terminal association metadata for definition dialogs", () => {
    const template: DeviceTemplate = {
      kind: "CustomContainerAssociations",
      label: "CustomContainerAssociations",
      group: "自定义元件库",
      size: { width: 104, height: 64 },
      params: {},
      terminalType: "heat",
      terminalCount: 3,
      terminalTypes: ["heat", "heat", "ac"],
      terminalLabels: ["供水端", "回水端", "交流端"],
      terminalRoles: ["double-source", "single-load", "single-load"],
      isContainer: true,
      custom: true,
      parameterDefinitions: buildDefaultDeviceParameterDefinitions(["heat", "heat", "ac"], {
        isContainer: true,
        terminalRoles: ["double-source", "single-load", "single-load"]
      })
    };

    expect(describeContainerTerminalAssociations(template)).toEqual([
      expect.objectContaining({
        terminalIndex: 0,
        terminalLabel: "供水端",
        terminalType: "heat",
        relationKey: "idx_heat2_unit_t1",
        relationName: "热能端1双端源关联idx",
        roleLabel: "双端源",
        sourceTerminalIndex: 0,
        dependent: false
      }),
      expect.objectContaining({
        terminalIndex: 1,
        terminalLabel: "回水端",
        terminalType: "heat",
        relationKey: "",
        relationName: "随端子1关联双端源",
        roleLabel: "双端源",
        sourceTerminalIndex: 0,
        dependent: true
      }),
      expect.objectContaining({
        terminalIndex: 2,
        terminalLabel: "交流端",
        terminalType: "ac",
        relationKey: "idx_ac_load_t3",
        relationName: "交流端3单端荷关联idx",
        roleLabel: "单端荷",
        sourceTerminalIndex: 2,
        dependent: false
      })
    ]);
  });

  test("describes three-winding transformer terminal associations as internal two-winding transformers", () => {
    const template = DEVICE_LIBRARY.find((item) => item.kind === "ac-three-winding-transformer")!;

    expect(describeContainerTerminalAssociations(template)).toEqual([
      expect.objectContaining({
        terminalIndex: 0,
        terminalType: "ac",
        relationKey: "idx_xf_t1",
        relationName: "高压绕组双绕组主变idx",
        roleLabel: "双绕组主变首端",
        deviceModel: "ACTransformer"
      }),
      expect.objectContaining({
        terminalIndex: 1,
        terminalType: "ac",
        relationKey: "idx_xf_t2",
        relationName: "中压绕组双绕组主变idx",
        roleLabel: "双绕组主变首端",
        deviceModel: "ACTransformer"
      }),
      expect.objectContaining({
        terminalIndex: 2,
        terminalType: "ac",
        relationKey: "idx_xf_t3",
        relationName: "低压绕组双绕组主变idx",
        roleLabel: "双绕组主变首端",
        deviceModel: "ACTransformer"
      })
    ]);
  });

  test("builds one body view plus associated device views for container parameters", () => {
    const node = assignPermanentDeviceIndex(createDefaultNode("ac-electrolyzer", { x: 100, y: 100 }), {}).node;
    node.name = "EL1";
    node.terminals[0].nodeNumber = "5";
    node.terminals[1].nodeNumber = "2";
    const template = DEVICE_LIBRARY.find((item) => item.kind === "ac-electrolyzer")!;

    const views = buildContainerDeviceParameterViews(node, template);

    expect(views.map((view) => view.label)).toEqual(["容器本体", "交流端交流电负荷", "氢能端氢源"]);
    expect(views[0]).toMatchObject({ id: "container", kind: "container" });
    expect(views[1]).toMatchObject({
      kind: "associated",
      deviceType: "ACLoad",
      relationKeys: ["idx_ac_load_t1"],
      terminalIndexes: [0]
    });
    expect(views[1].rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: "idx", value: "1" }),
      expect.objectContaining({ key: "node", value: "5" }),
      expect.objectContaining({ key: "pbase", value: "0" }),
      expect.objectContaining({ key: "pv0", value: "1.0" }),
      expect.objectContaining({ key: "qbase", value: "0" }),
      expect.objectContaining({ key: "qv0", value: "1.0" })
    ]));
    expect(views[2]).toMatchObject({
      kind: "associated",
      deviceType: "HydroSource",
      relationKeys: ["idx_h2_unit_t2"],
      terminalIndexes: [1]
    });
  });

  test("shows container-associated electric port parameters using the associated E section columns", () => {
    const node = assignPermanentDeviceIndex(createDefaultNode("ac-electrolyzer", { x: 100, y: 100 }), {}).node;
    node.name = "EL1";
    node.terminals[0].nodeNumber = "5";
    node.params.pbase_ac_load_t1 = "6.5";
    node.params.pv0_ac_load_t1 = "1.0";
    node.params.qbase_ac_load_t1 = "1.2";
    const template = DEVICE_LIBRARY.find((item) => item.kind === "ac-electrolyzer")!;

    const views = buildContainerDeviceParameterViews(node, template);

    expect(views[1]).toMatchObject({
      kind: "associated",
      deviceType: "ACLoad",
      relationKeys: ["idx_ac_load_t1"],
      terminalIndexes: [0]
    });
    expect(views[1].rows.map((row) => row.key)).toEqual(E_SECTION_COLUMNS.ACLoad);
    expect(views[1].rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: "idx", value: node.params.idx_ac_load_t1, readonly: true }),
      expect.objectContaining({ key: "name", value: "EL1_交流端交流电负荷", readonly: false }),
      expect.objectContaining({ key: "node", value: "5", readonly: true }),
      expect.objectContaining({ key: "pbase", value: "6.5", readonly: false }),
      expect.objectContaining({ key: "pv0", value: "1.0", readonly: false }),
      expect.objectContaining({ key: "qbase", value: "1.2", readonly: false })
    ]));
  });

  test("shows DC fuel-cell electric port parameters using DCGenerator columns", () => {
    const node = assignPermanentDeviceIndex(createDefaultNode("dc-fuel-cell", { x: 100, y: 100 }), {}).node;
    node.name = "FC1";
    node.terminals[0].nodeNumber = "7";
    node.params.control_type_dc_unit_t1 = "V";
    node.params.v_set_dc_unit_t1 = "750";
    node.params.p_set_dc_unit_t1 = "3.2";
    node.params.i_set_dc_unit_t1 = "4.5";
    const template = DEVICE_LIBRARY.find((item) => item.kind === "dc-fuel-cell")!;

    const views = buildContainerDeviceParameterViews(node, template);
    const exported = parseESections(buildEDeviceParameterFile({
      version: 1,
      name: "直流燃料电池参数测试",
      nodes: [node],
      edges: []
    }));

    expect(views[1]).toMatchObject({
      kind: "associated",
      deviceType: "DCGenerator",
      relationKeys: ["idx_dc_unit_t1"],
      terminalIndexes: [0]
    });
    expect(views[1].rows.map((row) => row.key)).toEqual(E_SECTION_COLUMNS.DCGenerator);
    expect(views[1].rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: "idx", value: node.params.idx_dc_unit_t1, readonly: true }),
      expect.objectContaining({ key: "name", value: "FC1_直流端直流电源", readonly: false }),
      expect.objectContaining({ key: "node", value: "7", readonly: true }),
      expect.objectContaining({ key: "control_type", value: "V", readonly: false }),
      expect.objectContaining({ key: "v_set", value: "750", readonly: false }),
      expect.objectContaining({ key: "p_set", value: "3.2", readonly: false }),
      expect.objectContaining({ key: "i_set", value: "4.5", readonly: false })
    ]));
    expect(exported.DCGenerator.rows[0]).toMatchObject({
      idx: node.params.idx_dc_unit_t1,
      name: "FC1_直流端直流电源",
      node: "1",
      control_type: "V",
      v_set: "750",
      p_set: "3.2",
      i_set: "4.5"
    });
  });

  test("uses associated E section columns for every built-in container-associated device view", () => {
    for (const template of DEVICE_LIBRARY.filter((item) => item.isContainer)) {
      const node = assignPermanentDeviceIndex(createDefaultNode(template.kind, { x: 100, y: 100 }), {}).node;
      const views = buildContainerDeviceParameterViews(node, template).filter((view) => view.kind === "associated");

      expect(views.length, template.kind).toBeGreaterThan(0);
      for (const view of views) {
        expect(view.deviceType, `${template.kind}:${view.label}`).toBeTruthy();
        const columns = E_SECTION_COLUMNS[view.deviceType ?? ""];
        expect(columns, `${template.kind}:${view.label}:${view.deviceType}`).toBeDefined();
        expect(view.rows.map((row) => row.key), `${template.kind}:${view.label}`).toEqual(columns);
      }
    }
  });

  test("filters container body parameters to the current container variant", () => {
    const expected = [
      ["ac-electrolyzer", ["idx", "name", "run_stat", "is_container", "idx_ac_load_t1", "idx_h2_unit_t2"], ["idx_dc_load_t1"]],
      ["dc-electrolyzer", ["idx", "name", "run_stat", "is_container", "idx_dc_load_t1", "idx_h2_unit_t2"], ["idx_ac_load_t1"]],
      ["ac-fuel-cell", ["idx", "name", "run_stat", "is_container", "idx_ac_unit_t1", "idx_h2_load_t2"], ["idx_dc_unit_t1"]],
      ["dc-fuel-cell", ["idx", "name", "run_stat", "is_container", "idx_dc_unit_t1", "idx_h2_load_t2"], ["idx_ac_unit_t1"]],
      ["ac-heater", ["idx", "name", "run_stat", "is_container", "idx_ac_load_t1", "idx_heat_unit_t2"], ["idx_dc_load_t1"]],
      ["dc-heater", ["idx", "name", "run_stat", "is_container", "idx_dc_load_t1", "idx_heat_unit_t2"], ["idx_ac_load_t1"]]
    ] as const;

    for (const [kind, includedKeys, excludedKeys] of expected) {
      const template = DEVICE_LIBRARY.find((item) => item.kind === kind)!;
      const node = assignPermanentDeviceIndex(createDefaultNode(kind, { x: 100, y: 100 }), {}).node;
      const bodyView = buildContainerDeviceParameterViews(node, template)[0];
      const keys = bodyView.rows.map((row) => row.key);

      expect(bodyView).toMatchObject({ id: "container", kind: "container" });
      expect(keys, kind).toEqual(expect.arrayContaining([...includedKeys]));
      for (const excludedKey of excludedKeys) {
        expect(keys, `${kind}:${excludedKey}`).not.toContain(excludedKey);
      }
    }
  });

  test("shows three-winding transformer associated branches with ACTransformer side parameters", () => {
    const node = assignPermanentDeviceIndex(createDefaultNode("ac-three-winding-transformer", { x: 100, y: 100 }), {}).node;
    node.name = "T3";
    node.terminals[0].nodeNumber = "11";
    node.params.neutral_node = "99";
    node.params.highResistancePu = "0.01";
    node.params.highReactancePu = "0.11";
    node.params.highMagnetizingConductancePu = "0.001";
    node.params.highMagnetizingSusceptancePu = "0.002";
    node.params.highTapRatio = "1.03";
    node.params.highShift = "2.5";
    const template = DEVICE_LIBRARY.find((item) => item.kind === "ac-three-winding-transformer")!;

    const views = buildContainerDeviceParameterViews(node, template);

    expect(views[1]).toMatchObject({
      kind: "associated",
      deviceType: "ACTransformer",
      relationKeys: ["idx_xf_t1"],
      terminalIndexes: [0]
    });
    expect(views[1].rows.map((row) => row.key)).toEqual(E_SECTION_COLUMNS.ACTransformer);
    expect(views[1].rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: "idx", value: node.params.idx_xf_t1, readonly: true }),
      expect.objectContaining({ key: "name", value: "T3_高压绕组", readonly: false }),
      expect.objectContaining({ key: "i_node", value: "11", readonly: true }),
      expect.objectContaining({ key: "j_node", value: "99", readonly: true }),
      expect.objectContaining({ key: "r", value: "0.01", readonly: false }),
      expect.objectContaining({ key: "x", value: "0.11", readonly: false }),
      expect.objectContaining({ key: "gt", value: "0.001", readonly: false }),
      expect.objectContaining({ key: "bt", value: "0.002", readonly: false }),
      expect.objectContaining({ key: "tap", value: "1.03", readonly: false }),
      expect.objectContaining({ key: "shift", value: "2.5", readonly: false })
    ]));
  });

  test("maps electrolysis electric terminals to loads and fuel-cell electric terminals to generators", () => {
    const expected = [
      ["ac-electrolyzer", "idx_ac_load_t1", "ACLoad", "ACLoad", "idx_h2_unit_t2", "HydroSource"],
      ["dc-electrolyzer", "idx_dc_load_t1", "DCLoad", "DCLoad", "idx_h2_unit_t2", "HydroSource"],
      ["ac-fuel-cell", "idx_ac_unit_t1", "ACGenerator", "ACGenerator", "idx_h2_load_t2", "HydroLoad"],
      ["dc-fuel-cell", "idx_dc_unit_t1", "DCGenerator", "DCGenerator", "idx_h2_load_t2", "HydroLoad"]
    ] as const;

    for (const [kind, electricRelationKey, electricDeviceType, electricSection, hydrogenRelationKey, hydrogenSection] of expected) {
      const template = DEVICE_LIBRARY.find((item) => item.kind === kind)!;
      const node = assignPermanentDeviceIndex(createDefaultNode(kind, { x: 100, y: 100 }), {}).node;
      const associations = describeContainerTerminalAssociations(template);
      const views = buildContainerDeviceParameterViews(node, template);
      const exported = parseESections(buildEDeviceParameterFile({
        version: 1,
        name: `${kind}-关联测试`,
        nodes: [node],
        edges: []
      }));

      expect(associations[0]).toMatchObject({
        terminalIndex: 0,
        relationKey: electricRelationKey,
        deviceModel: electricDeviceType
      });
      expect(associations[1]).toMatchObject({
        terminalIndex: 1,
        relationKey: hydrogenRelationKey,
        deviceModel: hydrogenSection
      });
      expect(views[1]).toMatchObject({
        kind: "associated",
        deviceType: electricDeviceType,
        relationKeys: [electricRelationKey],
        terminalIndexes: [0]
      });
      expect(exported[electricSection].rows[0].idx).toBe(node.params[electricRelationKey]);
      expect(exported[hydrogenSection].rows[0].idx).toBe(node.params[hydrogenRelationKey]);
    }
  });

  test("deduplicates double-port container associations into one associated device view", () => {
    const node = assignPermanentDeviceIndex(createDefaultNode("ac-two-port-heater", { x: 100, y: 100 }), {}).node;
    node.terminals[0].nodeNumber = "1";
    node.terminals[1].nodeNumber = "2";
    node.terminals[2].nodeNumber = "3";
    const template = DEVICE_LIBRARY.find((item) => item.kind === "ac-two-port-heater")!;

    const views = buildContainerDeviceParameterViews(node, template);

    expect(views.map((view) => view.label)).toEqual(["容器本体", "交流端交流电负荷", "供水端双端热源"]);
    expect(views[2]).toMatchObject({
      kind: "associated",
      deviceType: "HeatSource2",
      relationKeys: ["idx_heat2_unit_t2"],
      terminalIndexes: [1, 2]
    });
    expect(views[2].rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: "idx", value: "1" }),
      expect.objectContaining({ key: "i_node", value: "2" }),
      expect.objectContaining({ key: "j_node", value: "3" })
    ]));
  });

  test("builds associated device parameter views for three-winding transformer branches", () => {
    const node = assignPermanentDeviceIndex(createDefaultNode("ac-three-winding-transformer", { x: 100, y: 100 }), {}).node;
    node.name = "T3";
    node.terminals[0].nodeNumber = "1";
    node.terminals[1].nodeNumber = "2";
    node.terminals[2].nodeNumber = "3";
    node.params.neutral_node = "4";
    const template = DEVICE_LIBRARY.find((item) => item.kind === "ac-three-winding-transformer")!;

    const views = buildContainerDeviceParameterViews(node, template);

    expect(views.map((view) => view.label)).toEqual(["容器本体", "端子1双绕组主变首端", "端子2双绕组主变首端", "端子3双绕组主变首端"]);
    expect(views[1]).toMatchObject({
      kind: "associated",
      deviceType: "ACTransformer",
      relationKeys: ["idx_xf_t1"],
      terminalIndexes: [0]
    });
    expect(views[1].rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: "idx", value: "1" }),
      expect.objectContaining({ key: "i_node", value: "1" }),
      expect.objectContaining({ key: "j_node", value: "4" })
    ]));
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
      "idx_heat2_unit_t3"
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
    expect(indexed.node.params.idx_heat2_unit_t2).toBeUndefined();
    expect(indexed.node.params.idx_heat2_unit_t3).toBe("2");
    expect(indexed.node.params.idx_heat2_unit_t4).toBeUndefined();
    expect(indexed.counters.HeatSource2).toBe(2);
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
      ["ac-two-port-heater", ["idx_ac_load_t1", "idx_heat2_unit_t2"]],
      ["dc-two-port-heater", ["idx_dc_load_t1", "idx_heat2_unit_t2"]],
      ["heat-boiler", ["idx_heat_unit_t1"]],
      ["two-port-heat-boiler", ["idx_heat2_unit_t1"]]
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
      expect(getEParameterKeys(kind, node.params)).toEqual(expect.arrayContaining(["idx", "name", "run_stat"]));
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
      HydroSource: 1
    });

    const heater = createDefaultNode("ac-two-port-heater", { x: 100, y: 100 });
    const indexedHeater = assignPermanentDeviceIndex(heater, indexedElectrolyzer.counters);
    expect(indexedHeater.node.params.idx).toBe("1");
    expect(indexedHeater.node.params.idx_ac_load_t1).toBe("2");
    expect(indexedHeater.node.params.idx_heat2_unit_t2).toBe("1");
    expect(indexedHeater.node.params.idx_heat2_unit_t3).toBeUndefined();
    expect(indexedHeater.counters).toMatchObject({
      "ac-two-port-heater": 1,
      ACLoad: 2,
      HeatSource2: 1
    });

    const derived = deriveDeviceIndexCounters([indexedElectrolyzer.node, indexedHeater.node]);
    expect(derived).toMatchObject({
      "ac-electrolyzer": 1,
      "ac-two-port-heater": 1,
      ACLoad: 2,
      HydroSource: 1,
      HeatSource2: 1
    });

    const boiler = createDefaultNode("two-port-heat-boiler", { x: 100, y: 100 });
    const indexedBoiler = assignPermanentDeviceIndex(boiler, indexedHeater.counters);
    expect(indexedBoiler.node.params.idx_heat2_unit_t1).toBe("2");
    expect(indexedBoiler.node.params.idx_heat2_unit_t2).toBeUndefined();
    expect(indexedBoiler.counters.HeatSource2).toBe(2);
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
      r2: "float",
      i_control_type: "enum",
      j_control_type: "enum"
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
      { kind: "node", id: source.id, name: "电源A", idx: "", editableDevice: true }
    ]);
    expect(tree.find((group) => group.typeLabel === "文字")?.items).toEqual([
      { kind: "node", id: text.id, name: "说明文字", idx: "", editableDevice: false }
    ]);
    expect(tree.find((group) => group.typeLabel === "联络线")?.items[0]).toMatchObject({
      kind: "edge",
      id: "edge-a",
      name: "电源A -> 负荷A"
    });
    expect(getElementFocusPoint({ kind: "node", id: text.id }, [source, load, text], [edge])).toEqual(text.position);
    expect(getElementFocusPoint({ kind: "edge", id: "edge-a" }, [source, load, text], [edge])).toEqual({ x: 223, y: 120 });
  });

  test("colors connection lines by their connected terminal energy type", () => {
    const acSource = createDefaultNode("ac-source", { x: 100, y: 100 });
    const acLoad = createDefaultNode("ac-load", { x: 240, y: 100 });
    const dcSource = createDefaultNode("dc-source", { x: 100, y: 180 });
    const dcLoad = createDefaultNode("dc-load", { x: 240, y: 180 });
    const hydrogenSource = createDefaultNode("hydrogen-source", { x: 100, y: 260 });
    const hydrogenLoad = createDefaultNode("hydrogen-load", { x: 240, y: 260 });
    const heatSource = createDefaultNode("heat-source", { x: 100, y: 340 });
    const heatLoad = createDefaultNode("heat-load", { x: 240, y: 340 });
    const nodeById = new Map([acSource, acLoad, dcSource, dcLoad, hydrogenSource, hydrogenLoad, heatSource, heatLoad].map((node) => [node.id, node]));

    expect(getConnectionStrokeColor({ id: "ac", sourceId: acSource.id, targetId: acLoad.id, sourceTerminalId: "t1", targetTerminalId: "t1" }, nodeById)).toBe("#2563eb");
    expect(getConnectionStrokeColor({ id: "dc", sourceId: dcSource.id, targetId: dcLoad.id, sourceTerminalId: "t1", targetTerminalId: "t1" }, nodeById)).toBe("#0f766e");
    expect(getConnectionStrokeColor({ id: "h2", sourceId: hydrogenSource.id, targetId: hydrogenLoad.id, sourceTerminalId: "t1", targetTerminalId: "t1" }, nodeById)).toBe("#7c3aed");
    expect(getConnectionStrokeColor({ id: "heat", sourceId: heatSource.id, targetId: heatLoad.id, sourceTerminalId: "t1", targetTerminalId: "t1" }, nodeById)).toBe("#dc2626");
    expect(getConnectionStrokeColor({ id: "floating", sourceId: "missing", targetId: "missing" }, nodeById)).toBe("#334155");
  });

  test("shows associated container devices as child rows in the element tree", () => {
    const electrolyzer = assignPermanentDeviceIndex(createDefaultNode("ac-electrolyzer", { x: 100, y: 100 }), {}).node;
    electrolyzer.name = "EL1";
    electrolyzer.params.name_ac_load_t1 = "自定义交流负荷";

    const tree = buildElementTree([electrolyzer], [], DEVICE_LIBRARY);
    const item = tree.find((group) => group.typeLabel === "交流电制氢")?.items[0];

    expect(item).toMatchObject({
      kind: "node",
      id: electrolyzer.id,
      name: "EL1",
      idx: electrolyzer.params.idx,
      editableDevice: true
    });
    expect(item?.children).toEqual([
      expect.objectContaining({
        deviceType: "ACLoad",
        idx: electrolyzer.params.idx_ac_load_t1,
        name: "自定义交流负荷",
        nameKey: "name_ac_load_t1",
        relationKeys: ["idx_ac_load_t1"],
        terminalLabels: "交流端"
      }),
      expect.objectContaining({
        deviceType: "HydroSource",
        idx: electrolyzer.params.idx_h2_unit_t2,
        name: "EL1_氢能端氢源",
        nameKey: "name_h2_unit_t2",
        relationKeys: ["idx_h2_unit_t2"],
        terminalLabels: "氢能端"
      })
    ]);
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
      "static-image"
    ] as const;
    const removedControlKinds = [
      "static-web",
      "static-date",
      "static-time",
      "static-datetime",
      "static-input",
      "static-button"
    ];

    for (const kind of expected) {
      const node = createDefaultNode(kind, { x: 100, y: 100 });
      expect(isStaticNode(node)).toBe(true);
      expect(node.terminals).toEqual([]);
      expect(node.params.fillColor).toBeDefined();
      expect(node.params.strokeColor).toBeDefined();
    }

    expect(DEVICE_LIBRARY.filter((template) => removedControlKinds.includes(template.kind)).map((template) => template.kind)).toEqual([]);
    expect(DEVICE_LIBRARY.filter((template) => template.group === "静态图元").map((template) => template.kind)).toEqual([...expected]);

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
    expect(createDefaultNode("ac-load", { x: 100, y: 100 }).params.vbase).toBe("0");
    const twoWinding = createDefaultNode("ac-transformer", { x: 200, y: 100 });
    expect(twoWinding.params.highVbase).toBe("0");
    expect(twoWinding.params.lowVbase).toBe("0");
    const threeWinding = createDefaultNode("ac-three-winding-transformer", { x: 300, y: 100 });
    expect(threeWinding.params.highVbase).toBe("0");
    expect(threeWinding.params.mediumVbase).toBe("0");
    expect(threeWinding.params.lowVbase).toBe("0");
    const converter = createDefaultNode("acdc-converter", { x: 400, y: 100 });
    expect(converter.params.sourceVbase).toBe("0");
    expect(converter.params.targetVbase).toBe("0");
    expect(converter.terminals.map((terminal) => terminal.type)).toEqual(["ac", "dc"]);
    expect(converter.terminals.map((terminal) => terminal.vbase)).toEqual(["0", "0"]);
  });

  test("keeps ACDC converter terminal 1 as AC and terminal 2 as DC for connection rules and legacy nodes", () => {
    const converter = createDefaultNode("acdc-converter", { x: 100, y: 100 });
    const acLoad = createDefaultNode("ac-load", { x: 220, y: 100 });
    const dcLoad = createDefaultNode("dc-load", { x: 340, y: 100 });

    expect(canConnectTerminals(converter, "t1", acLoad, "t1")).toBe(true);
    expect(canConnectTerminals(converter, "t2", dcLoad, "t1")).toBe(true);
    expect(canConnectTerminals(converter, "t1", dcLoad, "t1")).toBe(false);
    expect(canConnectTerminals(converter, "t2", acLoad, "t1")).toBe(false);

    const legacyConverter: ModelNode = {
      ...converter,
      terminals: converter.terminals.map((terminal) => ({ ...terminal, type: "ac", vbase: "10 kV" }))
    };
    const normalized = normalizeNodeTerminalsByTemplate(legacyConverter);
    expect(normalized.terminals.map((terminal) => terminal.type)).toEqual(["ac", "dc"]);
    expect(normalized.terminals.map((terminal) => terminal.vbase)).toEqual(["10 kV", "0"]);
  });

  test("exports DCDC converter endpoint control types with supported values", () => {
    const defaultConverter = createDefaultNode("dcdc-converter", { x: 100, y: 100 });
    const legacyConverter = createDefaultNode("dcdc-converter", { x: 240, y: 100 });
    const invalidConverter = createDefaultNode("dcdc-converter", { x: 380, y: 100 });
    defaultConverter.params.i_control_type = "CTRL_V";
    defaultConverter.params.j_control_type = "CTRL_I";
    legacyConverter.params.i_control_type = "";
    legacyConverter.params.j_control_type = "";
    legacyConverter.params.sourceControlType = "定P";
    legacyConverter.params.targetControlType = "不定";
    invalidConverter.params.i_control_type = "BAD";
    invalidConverter.params.j_control_type = "V";

    const payload = parseESections(buildEDeviceParameterFile({
      version: 1,
      name: "DCDC控制类型测试",
      nodes: [defaultConverter, legacyConverter, invalidConverter],
      edges: []
    }));

    expect(payload.DCDCConverter.columns).toContain("i_control_type");
    expect(payload.DCDCConverter.columns).toContain("j_control_type");
    expect(payload.DCDCConverter.columns).not.toContain("control_type");
    expect(payload.DCDCConverter.rows.map((row) => row.i_control_type)).toEqual(["CTRL_V", "CTRL_P", "SLACK"]);
    expect(payload.DCDCConverter.rows.map((row) => row.j_control_type)).toEqual(["CTRL_I", "SLACK", "CTRL_V"]);
  });

  test("exports AC generator control_type with only PV PQ PH values", () => {
    const voltageControlledGenerator = createDefaultNode("ac-source", { x: 100, y: 100 });
    const powerControlledGenerator = createDefaultNode("ac-source", { x: 240, y: 100 });
    const phaseControlledGenerator = createDefaultNode("ac-source", { x: 380, y: 100 });
    const invalidGenerator = createDefaultNode("ac-source", { x: 520, y: 100 });
    voltageControlledGenerator.params.control_type = "PV";
    powerControlledGenerator.params.control_type = "定PQ";
    phaseControlledGenerator.params.control_type = "PH";
    invalidGenerator.params.control_type = "P";

    const payload = parseESections(buildEDeviceParameterFile({
      version: 1,
      name: "交流电源控制类型测试",
      nodes: [voltageControlledGenerator, powerControlledGenerator, phaseControlledGenerator, invalidGenerator],
      edges: []
    }));
    const values = payload.ACGenerator.rows.map((row) => row.control_type);

    expect(values).toEqual(["PV", "PQ", "PH", "PV"]);
    expect(values.every((value) => (AC_GENERATOR_CONTROL_TYPES as readonly string[]).includes(value))).toBe(true);
  });

  test("exports DC generator control_type with only P V I values", () => {
    const powerControlledGenerator = createDefaultNode("dc-source", { x: 100, y: 100 });
    const voltageControlledGenerator = createDefaultNode("dc-source", { x: 240, y: 100 });
    const currentControlledGenerator = createDefaultNode("dc-source", { x: 380, y: 100 });
    const invalidGenerator = createDefaultNode("dc-source", { x: 520, y: 100 });
    powerControlledGenerator.params.control_type = "P";
    voltageControlledGenerator.params.control_type = "定V";
    currentControlledGenerator.params.control_type = "I";
    invalidGenerator.params.control_type = "PQ";

    const payload = parseESections(buildEDeviceParameterFile({
      version: 1,
      name: "直流电源控制类型测试",
      nodes: [powerControlledGenerator, voltageControlledGenerator, currentControlledGenerator, invalidGenerator],
      edges: []
    }));
    const values = payload.DCGenerator.rows.map((row) => row.control_type);

    expect(values).toEqual(["P", "V", "I", "P"]);
    expect(values.every((value) => (DC_GENERATOR_CONTROL_TYPES as readonly string[]).includes(value))).toBe(true);
  });

  test("exports DCAC converter control_type with only supported values", () => {
    const defaultConverter = createDefaultNode("acdc-converter", { x: 100, y: 100 });
    const invalidConverter = createDefaultNode("acdc-converter", { x: 240, y: 100 });
    const acVoltageConverter = createDefaultNode("acdc-converter", { x: 380, y: 100 });
    defaultConverter.params.control_type = "DCV";
    invalidConverter.params.control_type = "PQ";
    invalidConverter.params.acControlType = "定PQ";
    acVoltageConverter.params.control_type = "ACV";

    const payload = parseESections(buildEDeviceParameterFile({
      version: 1,
      name: "DCAC控制类型测试",
      nodes: [defaultConverter, invalidConverter, acVoltageConverter],
      edges: []
    }));
    const values = payload.DCACConverter.rows.map((row) => row.control_type);

    expect(values).toEqual(["DCV", "ACP", "ACV"]);
    expect(values.every((value) => (DCAC_CONVERTER_CONTROL_TYPES as readonly string[]).includes(value))).toBe(true);
  });

  test("exports ACAC converter control_type with only supported values", () => {
    const defaultConverter = createDefaultNode("acac-converter", { x: 100, y: 100 });
    const sourceVoltageConverter = createDefaultNode("acac-converter", { x: 240, y: 100 });
    const targetVoltageConverter = createDefaultNode("acac-converter", { x: 380, y: 100 });
    const bothVoltageConverter = createDefaultNode("acac-converter", { x: 520, y: 100 });
    defaultConverter.params.control_type = "PQQ";
    sourceVoltageConverter.params.control_type = "PQ";
    sourceVoltageConverter.params.sourceControlType = "定PV";
    targetVoltageConverter.params.control_type = "PQ";
    targetVoltageConverter.params.targetControlType = "定PV";
    bothVoltageConverter.params.control_type = "PVV";

    const payload = parseESections(buildEDeviceParameterFile({
      version: 1,
      name: "ACAC控制类型测试",
      nodes: [defaultConverter, sourceVoltageConverter, targetVoltageConverter, bothVoltageConverter],
      edges: []
    }));
    const values = payload.ACACConverter.rows.map((row) => row.control_type);

    expect(values).toEqual(["PQQ", "PVQ", "PQV", "PVV"]);
    expect(values.every((value) => (ACAC_CONVERTER_CONTROL_TYPES as readonly string[]).includes(value))).toBe(true);
  });

  test("removes the explicit two-winding transformer glyph and keeps the three-winding container definition", () => {
    const acTransformer = DEVICE_LIBRARY.find((item) => item.kind === "ac-transformer");
    const twoWinding = DEVICE_LIBRARY.find((item) => item.kind === "ac-two-winding-transformer");
    const threeWinding = DEVICE_LIBRARY.find((item) => item.kind === "ac-three-winding-transformer");

    expect(acTransformer?.label).toBe("双绕组主变");
    expect(twoWinding).toBeUndefined();
    expect(threeWinding?.terminalType).toBe("ac");
    expect(threeWinding?.terminalCount).toBe(3);
    expect(threeWinding?.isContainer).toBe(true);
    expect(getTemplateParameterDefinitions(threeWinding!).map((definition) => definition.enName)).toEqual([
      "idx",
      "name",
      "run_stat",
      "idx_xf_t1",
      "idx_xf_t2",
      "idx_xf_t3"
    ]);
    expect(getEParameterKeys("ac-three-winding-transformer", createDefaultNode("ac-three-winding-transformer", { x: 100, y: 100 }).params)).toEqual([]);
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

  test("fills zero generator voltage setpoints from the topology node rated voltage", () => {
    const acSource = createDefaultNode("ac-source", { x: 100, y: 100 });
    const acBus = createDefaultNode("ac-bus", { x: 240, y: 100 });
    const dcFuelCell = assignPermanentDeviceIndex(createDefaultNode("dc-fuel-cell", { x: 100, y: 240 }), {}).node;
    const dcBus = createDefaultNode("dc-bus", { x: 240, y: 240 });
    acSource.params.v_set = "0.0";
    acSource.terminals[0].vbase = "35 kV";
    acBus.terminals.forEach((terminal) => {
      terminal.vbase = "35 kV";
    });
    dcFuelCell.params.v_set_dc_unit_t1 = "0.0";
    dcFuelCell.terminals[0].vbase = "1500 V";
    dcBus.terminals.forEach((terminal) => {
      terminal.vbase = "1500 V";
    });

    const calculated = calculateElectricalTopology(
      [acSource, acBus, dcFuelCell, dcBus],
      [
        { id: "ac", sourceId: acSource.id, targetId: acBus.id, sourceTerminalId: "t1", targetTerminalId: "t1" },
        { id: "dc", sourceId: dcFuelCell.id, targetId: dcBus.id, sourceTerminalId: "t1", targetTerminalId: "t1" }
      ]
    );
    const byId = new Map(calculated.map((node) => [node.id, node]));

    expect(byId.get(acSource.id)?.params.v_set).toBe("35");
    expect(byId.get(dcFuelCell.id)?.params.v_set_dc_unit_t1).toBe("1500");
  });

  test("fills zero converter voltage setpoints from the related topology node rated voltage", () => {
    const dcdc = createDefaultNode("dcdc-converter", { x: 100, y: 100 });
    dcdc.params.v_set = "0.0";
    dcdc.params.i_control_type = "CTRL_P";
    dcdc.params.j_control_type = "CTRL_V";
    dcdc.terminals[0].vbase = "1500 V";
    dcdc.terminals[1].vbase = "750 V";
    const acdc = createDefaultNode("acdc-converter", { x: 260, y: 100 });
    acdc.params.v_set = "0.0";
    acdc.params.v_ac_set = "0.0";
    acdc.params.v_dc_set = "0.0";
    acdc.terminals[0].vbase = "35 kV";
    acdc.terminals[1].vbase = "800 V";
    const acac = createDefaultNode("acac-converter", { x: 420, y: 100 });
    acac.params.i_v_set = "0.0";
    acac.params.j_v_set = "0.0";
    acac.terminals[0].vbase = "110 kV";
    acac.terminals[1].vbase = "10 kV";

    const calculated = calculateElectricalTopology([dcdc, acdc, acac], []);
    const byId = new Map(calculated.map((node) => [node.id, node]));

    expect(byId.get(dcdc.id)?.params.v_set).toBe("750");
    expect(byId.get(acdc.id)?.params.v_set).toBe("35");
    expect(byId.get(acdc.id)?.params.v_ac_set).toBe("35");
    expect(byId.get(acdc.id)?.params.v_dc_set).toBe("800");
    expect(byId.get(acac.id)?.params.i_v_set).toBe("110");
    expect(byId.get(acac.id)?.params.j_v_set).toBe("10");
  });

  test("checks voltage setpoint deviations after topology fills zero defaults", () => {
    const acBus = createDefaultNode("ac-bus", { x: 160, y: 100 });
    const acdc = createDefaultNode("acdc-converter", { x: 360, y: 100 });
    acBus.terminals.forEach((terminal) => {
      terminal.vbase = "35 kV";
    });
    acdc.terminals[0].vbase = "35 kV";
    acdc.terminals[1].vbase = "800 V";
    acdc.params.v_set = "0.0";
    acdc.params.v_ac_set = "0.0";

    const calculated = calculateElectricalTopology(
      [acBus, acdc],
      [{ id: "acdc-ac", sourceId: acdc.id, targetId: acBus.id, sourceTerminalId: "t1", targetTerminalId: "t1" }]
    );
    const byId = new Map(calculated.map((node) => [node.id, node]));

    expect(byId.get(acdc.id)?.params.v_set).toBe("35");
    expect(byId.get(acdc.id)?.params.v_ac_set).toBe("35");
    expect(validateVoltageSetpointDeviations(calculated, []).some((error) => error.type === "voltage-setpoint-deviation")).toBe(false);
  });

  test("fills missing AC/DC converter voltage setpoints from topology rated voltages", () => {
    const acBus = createDefaultNode("ac-bus", { x: 160, y: 100 });
    const dcBus = createDefaultNode("dc-bus", { x: 160, y: 260 });
    const acdc = createDefaultNode("acdc-converter", { x: 360, y: 180 });
    acBus.terminals.forEach((terminal) => {
      terminal.vbase = "35 kV";
    });
    dcBus.terminals.forEach((terminal) => {
      terminal.vbase = "800 V";
    });
    acdc.terminals[0].vbase = "35 kV";
    acdc.terminals[1].vbase = "800 V";
    delete acdc.params.v_ac_set;
    acdc.params.v_dc_set = "";

    const calculated = calculateElectricalTopology(
      [acBus, dcBus, acdc],
      [
        { id: "acdc-ac", sourceId: acdc.id, targetId: acBus.id, sourceTerminalId: "t1", targetTerminalId: "t1" },
        { id: "acdc-dc", sourceId: acdc.id, targetId: dcBus.id, sourceTerminalId: "t2", targetTerminalId: "t1" }
      ]
    );
    const byId = new Map(calculated.map((node) => [node.id, node]));

    expect(byId.get(acdc.id)?.params.v_ac_set).toBe("35");
    expect(byId.get(acdc.id)?.params.v_dc_set).toBe("800");
  });

  test("builds topology calculation success and failure prompts", () => {
    expect(topologyCalculationMessage(0)).toBe("图上拓扑成功。");
    expect(topologyCalculationMessage(2)).toBe("图上拓扑失败：发现 2 条错误，已定位到第一条错误。");
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

  test("rejects two-terminal devices whose endpoints fall on the same topology node", () => {
    const line = createDefaultNode("ac-line", { x: 240, y: 100 });
    const bus = createDefaultNode("ac-bus", { x: 240, y: 220 });
    line.terminals.forEach((terminal) => {
      terminal.vbase = "10 kV";
    });

    const errors = validateTopology(
      [line, bus],
      [
        { id: "line-i-bus", sourceId: line.id, targetId: bus.id, sourceTerminalId: "t1", targetTerminalId: "t1", targetPoint: { x: 180, y: 220 } },
        { id: "line-j-bus", sourceId: line.id, targetId: bus.id, sourceTerminalId: "t2", targetTerminalId: "t2", targetPoint: { x: 300, y: 220 } }
      ],
      { includeVoltageSetpointDeviations: false }
    );

    expect(errors).toEqual(expect.arrayContaining([
      expect.objectContaining({
        type: "same-topology-node-endpoints",
        nodeId: line.id,
        relatedNodeIds: [line.id],
        message: expect.stringContaining("首末端不能位于同一个拓扑节点")
      })
    ]));
  });

  test("fills zero voltage bases across topology islands without merging topology node numbers", () => {
    const source = createDefaultNode("ac-source", { x: 100, y: 100 });
    const line = createDefaultNode("ac-line", { x: 240, y: 100 });
    const load = createDefaultNode("ac-load", { x: 380, y: 100 });
    source.terminals[0].vbase = "10 kV";
    source.params.v_set = "0.0";

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
    expect(byId.get(source.id)?.terminals[0].vbase).toBe("10");
    expect(byId.get(line.id)?.terminals.map((terminal) => terminal.vbase)).toEqual(["10", "10"]);
    expect(byId.get(load.id)?.terminals[0].vbase).toBe("10");
    expect(byId.get(load.id)?.params.vbase).toBe("10");
    expect(byId.get(source.id)?.params.v_set).toBe("10");
  });

  test("reports topology islands with missing or conflicting non-zero voltage bases", () => {
    const zeroSource = createDefaultNode("ac-source", { x: 100, y: 100 });
    const zeroLine = createDefaultNode("ac-line", { x: 240, y: 100 });
    const zeroLoad = createDefaultNode("ac-load", { x: 380, y: 100 });
    const missingErrors = validateTopology(
      [zeroSource, zeroLine, zeroLoad],
      [
        { id: "zero-source-line", sourceId: zeroSource.id, targetId: zeroLine.id, sourceTerminalId: "t1", targetTerminalId: "t1" },
        { id: "zero-line-load", sourceId: zeroLine.id, targetId: zeroLoad.id, sourceTerminalId: "t2", targetTerminalId: "t1" }
      ],
      { includeVoltageSetpointDeviations: false }
    );
    expect(missingErrors).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: "missing-island-voltage", relatedNodeIds: expect.arrayContaining([zeroSource.id, zeroLine.id, zeroLoad.id]) })
    ]));

    const source10 = createDefaultNode("ac-source", { x: 100, y: 260 });
    const zeroBranch = createDefaultNode("ac-zero-branch", { x: 240, y: 260 });
    const load35 = createDefaultNode("ac-load", { x: 380, y: 260 });
    source10.terminals[0].vbase = "10 kV";
    load35.terminals[0].vbase = "35 kV";
    const conflictingErrors = validateTopology(
      [source10, zeroBranch, load35],
      [
        { id: "source-zero", sourceId: source10.id, targetId: zeroBranch.id, sourceTerminalId: "t1", targetTerminalId: "t1" },
        { id: "zero-load", sourceId: zeroBranch.id, targetId: load35.id, sourceTerminalId: "t2", targetTerminalId: "t1" }
      ],
      { includeVoltageSetpointDeviations: false }
    );
    expect(conflictingErrors).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: "island-voltage-mismatch", relatedNodeIds: expect.arrayContaining([source10.id, zeroBranch.id, load35.id]) })
    ]));
  });

  test("reports transformer terminals that fall inside the same topology island", () => {
    const transformer = createDefaultNode("ac-transformer", { x: 100, y: 100 });
    const line = createDefaultNode("ac-line", { x: 240, y: 100 });
    transformer.terminals[0].vbase = "10 kV";
    transformer.terminals[1].vbase = "10 kV";

    const errors = validateTopology(
      [transformer, line],
      [
        { id: "xf-i-line", sourceId: transformer.id, targetId: line.id, sourceTerminalId: "t1", targetTerminalId: "t1" },
        { id: "xf-j-line", sourceId: transformer.id, targetId: line.id, sourceTerminalId: "t2", targetTerminalId: "t2" }
      ],
      { includeVoltageSetpointDeviations: false }
    );

    expect(errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: "transformer-island-short", nodeId: transformer.id })
    ]));

    const threeWinding = createDefaultNode("ac-three-winding-transformer", { x: 100, y: 260 });
    const zeroBranch = createDefaultNode("ac-zero-branch", { x: 240, y: 260 });
    threeWinding.terminals.forEach((terminal) => {
      terminal.vbase = "10 kV";
    });
    const threeWindingErrors = validateTopology(
      [threeWinding, zeroBranch],
      [
        { id: "t3-i-zero", sourceId: threeWinding.id, targetId: zeroBranch.id, sourceTerminalId: "t1", targetTerminalId: "t1" },
        { id: "t3-j-zero", sourceId: threeWinding.id, targetId: zeroBranch.id, sourceTerminalId: "t2", targetTerminalId: "t2" }
      ],
      { includeVoltageSetpointDeviations: false }
    );
    expect(threeWindingErrors).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: "transformer-island-short", nodeId: threeWinding.id })
    ]));
  });

  test("validates floating terminals, mixed terminal types, and voltage mismatch before topology", () => {
    const acSource = createDefaultNode("ac-source", { x: 100, y: 100 });
    const dcLoad = createDefaultNode("dc-load", { x: 220, y: 100 });
    const acLoad = createDefaultNode("ac-load", { x: 340, y: 100 });
    const acBus = createDefaultNode("ac-bus", { x: 100, y: 220 });
    acSource.params.vbase = "10 kV";
    acSource.terminals[0].vbase = "10 kV";
    acLoad.params.vbase = "35 kV";
    acLoad.terminals[0].vbase = "35 kV";
    const errors = validateTopology(
      [acSource, dcLoad, acLoad, acBus],
      [
        { id: "mixed", sourceId: acSource.id, targetId: dcLoad.id, sourceTerminalId: "t1", targetTerminalId: "t1" },
        { id: "voltage", sourceId: acSource.id, targetId: acLoad.id, sourceTerminalId: "t1", targetTerminalId: "t1" },
        { id: "same-bus", sourceId: acBus.id, targetId: acBus.id, sourceTerminalId: "t1", targetTerminalId: "t2" }
      ]
    );

    expect(errors.some((error) => error.type === "terminal-type-mismatch" && error.edgeId === "mixed")).toBe(true);
    expect(errors.some((error) => error.type === "voltage-mismatch" && error.edgeId === "voltage")).toBe(true);
    expect(errors).toEqual(expect.arrayContaining([
      expect.objectContaining({
        type: "same-bus-endpoints",
        edgeId: "same-bus",
        nodeId: acBus.id,
        message: expect.stringContaining("首末端不能位于同一个母线")
      })
    ]));

    const loneLoad = createDefaultNode("ac-load", { x: 460, y: 100 });
    const floatingErrors = validateTopology([loneLoad], []);
    expect(floatingErrors).toEqual(expect.arrayContaining([
      expect.objectContaining({
        type: "floating-terminal",
        nodeId: loneLoad.id,
        message: expect.stringContaining("悬空")
      })
    ]));

    const floatingEdgeErrors = validateTopology(
      [acSource],
      [{ id: "floating-edge", sourceId: acSource.id, targetId: "", sourceTerminalId: "t1", targetPoint: { x: 500, y: 100 } }]
    );
    expect(floatingEdgeErrors.some((error) => error.type === "floating-terminal" && error.edgeId === "floating-edge")).toBe(true);
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

  test("ignores zero terminal voltage bases during validation and fills them after topology", () => {
    const source = createDefaultNode("ac-source", { x: 100, y: 100 });
    const load = createDefaultNode("ac-load", { x: 240, y: 100 });
    source.terminals[0].vbase = "10 kV";
    load.terminals[0].vbase = "0";

    const edges: Edge[] = [
      { id: "zero-vbase", sourceId: source.id, targetId: load.id, sourceTerminalId: "t1", targetTerminalId: "t1" }
    ];
    const errors = validateTopology([source, load], edges, { includeVoltageSetpointDeviations: false });
    const calculated = calculateElectricalTopology([source, load], edges);
    const byId = new Map(calculated.map((node) => [node.id, node]));

    expect(errors.some((error) => error.type === "voltage-mismatch")).toBe(false);
    expect(byId.get(load.id)?.terminals[0].vbase).toBe("10");
  });

  test("warns when voltage setpoints deviate more than 30 percent from rated topology voltage", () => {
    const acBus10 = createDefaultNode("ac-bus", { x: 160, y: 100 });
    const acBus35 = createDefaultNode("ac-bus", { x: 160, y: 260 });
    const dcBus750 = createDefaultNode("dc-bus", { x: 160, y: 420 });
    const dcBus750B = createDefaultNode("dc-bus", { x: 560, y: 420 });
    const source = createDefaultNode("ac-source", { x: 40, y: 100 });
    const dcdc = createDefaultNode("dcdc-converter", { x: 360, y: 420 });
    const acdc = createDefaultNode("acdc-converter", { x: 360, y: 100 });
    const acac = createDefaultNode("acac-converter", { x: 360, y: 260 });
    acBus10.name = "交流母线10";
    acBus35.name = "交流母线35";
    dcBus750.name = "直流母线750A";
    dcBus750B.name = "直流母线750B";
    acBus10.terminals.forEach((terminal) => {
      terminal.vbase = "10 kV";
    });
    acBus35.terminals.forEach((terminal) => {
      terminal.vbase = "35 kV";
    });
    dcBus750.terminals.forEach((terminal) => {
      terminal.vbase = "750 V";
    });
    dcBus750B.terminals.forEach((terminal) => {
      terminal.vbase = "750 V";
    });
    source.terminals[0].vbase = "10 kV";
    source.params.v_set = "14";
    dcdc.terminals[0].vbase = "750 V";
    dcdc.terminals[1].vbase = "750 V";
    dcdc.params.v_set = "1000";
    acdc.terminals[0].vbase = "10 kV";
    acdc.terminals[1].vbase = "750 V";
    acdc.params.v_ac_set = "12";
    acdc.params.v_dc_set = "1000";
    acac.terminals[0].vbase = "10 kV";
    acac.terminals[1].vbase = "35 kV";
    acac.params.i_v_set = "14";
    acac.params.j_v_set = "40";

    const errors = validateTopology(
      [acBus10, acBus35, dcBus750, dcBus750B, source, dcdc, acdc, acac],
      [
        { id: "source-ac", sourceId: source.id, targetId: acBus10.id, sourceTerminalId: "t1", targetTerminalId: "t1" },
        { id: "dcdc-i", sourceId: dcdc.id, targetId: dcBus750.id, sourceTerminalId: "t1", targetTerminalId: "t2" },
        { id: "dcdc-j", sourceId: dcdc.id, targetId: dcBus750B.id, sourceTerminalId: "t2", targetTerminalId: "t1" },
        { id: "acdc-ac", sourceId: acdc.id, targetId: acBus10.id, sourceTerminalId: "t1", targetTerminalId: "t2" },
        { id: "acdc-dc", sourceId: acdc.id, targetId: dcBus750.id, sourceTerminalId: "t2", targetTerminalId: "t1" },
        { id: "acac-i", sourceId: acac.id, targetId: acBus10.id, sourceTerminalId: "t1", targetTerminalId: "t3" },
        { id: "acac-j", sourceId: acac.id, targetId: acBus35.id, sourceTerminalId: "t2", targetTerminalId: "t1" }
      ]
    );

    expect(errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: "voltage-setpoint-deviation", nodeId: source.id, message: expect.stringContaining("v_set=14") }),
      expect.objectContaining({ type: "voltage-setpoint-deviation", nodeId: dcdc.id, message: expect.stringContaining("v_set=1000") }),
      expect.objectContaining({ type: "voltage-setpoint-deviation", nodeId: acdc.id, message: expect.stringContaining("v_dc_set=1000") }),
      expect.objectContaining({ type: "voltage-setpoint-deviation", nodeId: acac.id, message: expect.stringContaining("i_v_set=14") })
    ]));
    expect(errors.some((error) => error.message.includes("v_ac_set=12"))).toBe(false);
    expect(errors.some((error) => error.message.includes("j_v_set=40"))).toBe(false);
  });

  test("does not warn zero voltage setpoints before topology can fill them", () => {
    const bus = createDefaultNode("ac-bus", { x: 160, y: 100 });
    const source = createDefaultNode("ac-source", { x: 40, y: 100 });
    bus.terminals.forEach((terminal) => {
      terminal.vbase = "10 kV";
    });
    source.terminals[0].vbase = "10 kV";
    source.params.v_set = "0.0";

    const errors = validateTopology(
      [bus, source],
      [{ id: "source-bus", sourceId: source.id, targetId: bus.id, sourceTerminalId: "t1", targetTerminalId: "t1" }]
    );

    expect(errors.some((error) => error.type === "voltage-setpoint-deviation")).toBe(false);
  });

  test("checks legacy ac_v_set and dc_v_set converter voltage setpoint aliases", () => {
    const acBus = createDefaultNode("ac-bus", { x: 160, y: 100 });
    const dcBus = createDefaultNode("dc-bus", { x: 160, y: 260 });
    const acdc = createDefaultNode("acdc-converter", { x: 360, y: 180 });
    acBus.terminals.forEach((terminal) => {
      terminal.vbase = "10 kV";
    });
    dcBus.terminals.forEach((terminal) => {
      terminal.vbase = "750 V";
    });
    acdc.terminals[0].vbase = "10 kV";
    acdc.terminals[1].vbase = "750 V";
    acdc.params.ac_v_set = "14";
    acdc.params.dc_v_set = "1000";

    const errors = validateTopology(
      [acBus, dcBus, acdc],
      [
        { id: "acdc-ac", sourceId: acdc.id, targetId: acBus.id, sourceTerminalId: "t1", targetTerminalId: "t1" },
        { id: "acdc-dc", sourceId: acdc.id, targetId: dcBus.id, sourceTerminalId: "t2", targetTerminalId: "t1" }
      ]
    );

    expect(errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: "voltage-setpoint-deviation", nodeId: acdc.id, message: expect.stringContaining("ac_v_set=14") }),
      expect.objectContaining({ type: "voltage-setpoint-deviation", nodeId: acdc.id, message: expect.stringContaining("dc_v_set=1000") })
    ]));
  });

  test("validates duplicate idx and names within the same device type", () => {
    const firstLoad = createDefaultNode("ac-load", { x: 100, y: 100 });
    const secondLoad = createDefaultNode("ac-load", { x: 240, y: 100 });
    const dcLoad = createDefaultNode("dc-load", { x: 380, y: 100 });
    firstLoad.name = "重复负荷";
    secondLoad.name = "重复负荷";
    dcLoad.name = "重复负荷";
    firstLoad.params = { ...firstLoad.params, idx: "3" };
    secondLoad.params = { ...secondLoad.params, idx: "3" };
    dcLoad.params = { ...dcLoad.params, idx: "3" };

    const errors = validateTopology([firstLoad, secondLoad, dcLoad], []);

    expect(errors).toEqual(expect.arrayContaining([
      expect.objectContaining({
        type: "duplicate-device-idx",
        relatedNodeIds: expect.arrayContaining([firstLoad.id, secondLoad.id]),
        message: expect.stringContaining("ACLoad")
      }),
      expect.objectContaining({
        type: "duplicate-device-name",
        relatedNodeIds: expect.arrayContaining([firstLoad.id, secondLoad.id]),
        message: expect.stringContaining("重复负荷")
      })
    ]));
    expect(errors.some((error) => error.type === "duplicate-device-idx" && error.relatedNodeIds.includes(dcLoad.id))).toBe(false);
    expect(errors.some((error) => error.type === "duplicate-device-name" && error.relatedNodeIds.includes(dcLoad.id))).toBe(false);
  });

  test("treats duplicate identity and voltage setpoint deviations as non-blocking topology warnings", () => {
    expect(isBlockingTopologyValidationError({ type: "floating-terminal" })).toBe(true);
    expect(isBlockingTopologyValidationError({ type: "terminal-type-mismatch" })).toBe(true);
    expect(isBlockingTopologyValidationError({ type: "same-bus-endpoints" })).toBe(true);
    expect(isBlockingTopologyValidationError({ type: "same-topology-node-endpoints" })).toBe(true);
    expect(isBlockingTopologyValidationError({ type: "voltage-mismatch" })).toBe(true);
    expect(isBlockingTopologyValidationError({ type: "missing-island-voltage" })).toBe(true);
    expect(isBlockingTopologyValidationError({ type: "island-voltage-mismatch" })).toBe(true);
    expect(isBlockingTopologyValidationError({ type: "transformer-island-short" })).toBe(true);
    expect(isBlockingTopologyValidationError({ type: "duplicate-device-idx" })).toBe(false);
    expect(isBlockingTopologyValidationError({ type: "duplicate-device-name" })).toBe(false);
    expect(isBlockingTopologyValidationError({ type: "voltage-setpoint-deviation" })).toBe(false);
  });

  test("validates duplicate idx and names between container-associated devices and ordinary devices", () => {
    const load = createDefaultNode("ac-load", { x: 100, y: 100 });
    const electrolyzer = assignPermanentDeviceIndex(createDefaultNode("ac-electrolyzer", { x: 260, y: 100 }), {}).node;
    electrolyzer.name = "EL1";
    electrolyzer.params.name_ac_load_t1 = "自定义交流负荷";
    load.name = "自定义交流负荷";
    load.params = { ...load.params, idx: electrolyzer.params.idx_ac_load_t1 ?? "1" };

    const errors = validateTopology([load, electrolyzer], []);

    expect(errors).toEqual(expect.arrayContaining([
      expect.objectContaining({
        type: "duplicate-device-idx",
        relatedNodeIds: expect.arrayContaining([load.id, electrolyzer.id]),
        message: expect.stringContaining("ACLoad")
      }),
      expect.objectContaining({
        type: "duplicate-device-name",
        relatedNodeIds: expect.arrayContaining([load.id, electrolyzer.id]),
        message: expect.stringContaining("自定义交流负荷")
      })
    ]));
  });

  test("exports edited container-associated device names to E sections", () => {
    const electrolyzer = assignPermanentDeviceIndex(createDefaultNode("ac-electrolyzer", { x: 100, y: 100 }), {}).node;
    electrolyzer.name = "EL1";
    electrolyzer.params.name_ac_load_t1 = "自定义交流负荷";
    electrolyzer.params.name_h2_unit_t2 = "自定义氢源";

    const payload = parseESections(
      buildEDeviceParameterFile({
        version: 1,
        name: "容器子设备导出",
        nodes: [electrolyzer],
        edges: []
      })
    );

    expect(payload.ACLoad.rows[0]).toMatchObject({
      idx: electrolyzer.params.idx_ac_load_t1,
      name: "自定义交流负荷"
    });
    expect(payload.HydroSource.rows[0]).toMatchObject({
      idx: electrolyzer.params.idx_h2_unit_t2,
      name: "自定义氢源"
    });
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
