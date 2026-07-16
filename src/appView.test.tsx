import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { areCanvasPropsEqual } from "./appExtracted/appCanvasArea";
import {
  inspectorTabShowsDevicePanel,
  resolveDeviceDefinitionParameterRowsForDisplay,
  resolveDeviceModelPanelParameterKeys,
  resolveCustomDeviceParameterRowsForDisplay,
  resolveInspectorGraphId,
  resolveInspectorTopologyEntry
} from "./appExtracted/appView";
import { createDefaultNode, type Topology } from "./model";

describe("app view topology inspector", () => {
  test("uses live topology entries instead of stale saved topology entries", () => {
    const staleTopology: Topology = {
      nodes: {
        "selected-line": {
          id: "selected-line",
          degree: 0,
          neighbors: [],
          edgeIds: []
        }
      },
      connectedComponents: []
    };
    const liveTopology: Topology = {
      nodes: {
        "selected-line": {
          id: "selected-line",
          degree: 2,
          neighbors: ["source-bus", "target-bus"],
          edgeIds: ["line:routable-source", "line:routable-target"]
        }
      },
      connectedComponents: [["source-bus", "selected-line", "target-bus"]]
    };

    expect(resolveInspectorTopologyEntry(staleTopology, liveTopology, "selected-line")?.degree).toBe(2);
    expect(resolveInspectorTopologyEntry(staleTopology, liveTopology, "selected-line")?.neighbors).toEqual([
      "source-bus",
      "target-bus"
    ]);
  });
});

describe("app view inspector tab visibility", () => {
  test("shows device details only on the device tab", () => {
    expect(inspectorTabShowsDevicePanel("model", true)).toBe(false);
    expect(inspectorTabShowsDevicePanel("tree", true)).toBe(false);
    expect(inspectorTabShowsDevicePanel("graph", true)).toBe(false);
    expect(inspectorTabShowsDevicePanel("device", true)).toBe(true);
    expect(inspectorTabShowsDevicePanel("device", false)).toBe(false);
  });
});

describe("app view device model parameter keys", () => {
  test("shows base class E fields together with derived-specific fields", () => {
    const keys = resolveDeviceModelPanelParameterKeys(
      ["idx", "name", "node", "control_type", "p_set", "run_stat"],
      [
        { cnName: "水电机组型号", enName: "hydroUnitModel", valueType: "string", typicalValue: "" },
        { cnName: "水轮机类型", enName: "turbineType", valueType: "stringEnum", typicalValue: "" }
      ],
      []
    );

    expect(keys).toEqual([
      "idx",
      "name",
      "node",
      "control_type",
      "p_set",
      "run_stat",
      "hydroUnitModel",
      "turbineType"
    ]);
  });
});

describe("app view device definition parameter rows", () => {
  test("renders the E interface dialog after the custom device dialog so it is not hidden behind it", () => {
    const source = readFileSync(new URL("./appExtracted/appView.tsx", import.meta.url), "utf8");

    expect(source.indexOf("{customDeviceDialogOpen &&")).toBeLessThan(
      source.indexOf("{eDeviceDefinitionInterfaceDialogOpen &&")
    );
  });

  test("filters polluted base rows from derived component parameter tables", () => {
    const rows = resolveDeviceDefinitionParameterRowsForDisplay(
      [
        { id: "idx", enName: "idx" },
        { id: "name", enName: "name" },
        { id: "status", enName: "status" },
        { id: "hydro", enName: "hydroUnitModel" },
        { id: "turbine", enName: "turbineType" },
        { id: "node", enName: "node" }
      ],
      [
        { enName: "hydroUnitModel" },
        { enName: "turbineType" }
      ]
    );

    expect(rows.map((row) => row.enName)).toEqual(["hydroUnitModel", "turbineType"]);
  });

  test("keeps new derived parameter draft rows visible while hiding base rows", () => {
    const rows = resolveDeviceDefinitionParameterRowsForDisplay(
      [
        { id: "base", enName: "p_set" },
        { id: "existing-derived", enName: "hydroUnitModel" },
        { id: "new-blank", enName: "" },
        { id: "new-derived", enName: "ownerName" }
      ],
      [
        { enName: "hydroUnitModel" }
      ],
      {
        baseComponentLibrary: "ACGenerator",
        isDerivedComponentBaseParamName: (name: unknown) => String(name ?? "").trim() === "p_set"
      }
    );

    expect(rows.map((row) => row.id)).toEqual(["existing-derived", "new-blank", "new-derived"]);
  });

  test("renders the parameter table from display-filtered rows", () => {
    const source = readFileSync(new URL("./appExtracted/appView.tsx", import.meta.url), "utf8");

    expect(source).toMatch(/definitionDraftRowsForDisplay\.map\(\(row\)/);
    expect(source).not.toMatch(/definitionDraftRows\.map\(\(row\)\s*=>\s*\(<tr key=\{row\.id\}/);
  });

  test("keeps derived edit dialogs from injecting base default parameters", () => {
    const source = readFileSync(new URL("./App.tsx", import.meta.url), "utf8");

    expect(source).toMatch(/isDerivedComponentLibrary:\s*customDeviceDraft\.isDerivedComponentLibrary/);
  });

  test("passes derived metadata into custom device measurement positions", () => {
    const source = readFileSync(new URL("./App.tsx", import.meta.url), "utf8");

    expect(source).toMatch(
      /const customDeviceMeasurementPositionDefinitions = buildMeasurementProfilePositionDefinitions\(\{[\s\S]*source:\s*\{[\s\S]*is_derived_component_library:\s*"1"[\s\S]*isDerivedComponentLibrary:\s*customDeviceDraft\.isDerivedComponentLibrary[\s\S]*derivedFromComponentLibrary:\s*customDeviceDraft\.isDerivedComponentLibrary[\s\S]*customDeviceDraft\.derivedFromComponentLibrary \|\| customDeviceDraft\.componentLibrary[\s\S]*derivedComponentLibrary:\s*customDeviceDraft\.isDerivedComponentLibrary \? customDeviceDraft\.derivedComponentLibrary : ""[\s\S]*derivedComponentLibraryLabel:\s*customDeviceDraft\.isDerivedComponentLibrary \? customDeviceDraft\.derivedComponentLibraryLabel : ""/
    );
  });

  test("filters polluted base rows from derived custom component dialogs", () => {
    const rows = resolveCustomDeviceParameterRowsForDisplay(
      [
        { id: "default-idx", enName: "idx" },
        { id: "default-name", enName: "name" }
      ],
      [
        { id: "status", enName: "status" },
        { id: "run-stat", enName: "run_stat" },
        { id: "node", enName: "node" },
        { id: "pv", enName: "pvModuleModel" },
        { id: "mppt", enName: "mpptCount" }
      ],
      {
        isDerivedComponentLibrary: true,
        baseComponentLibrary: "ACGenerator",
        isDerivedComponentBaseParamName: (name: unknown) =>
          ["idx", "name", "status", "run_stat", "node"].includes(String(name ?? "").trim())
      }
    );

    expect(rows.defaultRows.map((row) => row.enName)).toEqual([]);
    expect(rows.customRows.map((row) => row.enName)).toEqual(["pvModuleModel", "mpptCount"]);
  });

  test("keeps new blank rows visible in derived custom component dialogs", () => {
    const rows = resolveCustomDeviceParameterRowsForDisplay(
      [],
      [
        { id: "base-status", enName: "status" },
        { id: "new-blank", enName: "" },
        { id: "new-derived", enName: "ownerName" }
      ],
      {
        isDerivedComponentLibrary: true,
        baseComponentLibrary: "ACGenerator",
        isDerivedComponentBaseParamName: (name: unknown) =>
          !String(name ?? "").trim() ||
          ["idx", "name", "status", "run_stat", "node"].includes(String(name ?? "").trim())
      }
    );

    expect(rows.customRows.map((row) => row.id)).toEqual(["new-blank", "new-derived"]);
  });
});

describe("app view inspector graph id", () => {
  test("uses the same normalized device id rule as SVG export", () => {
    const first = createDefaultNode("ac-box-breaker", { x: 100, y: 100 });
    first.id = "node-1783657543903-first";
    first.params = { ...first.params, idx: "1" };
    const second = createDefaultNode("ac-box-breaker", { x: 200, y: 100 });
    second.id = "node-1783657543903-second";
    second.params = { ...second.params, idx: "2" };

    expect(resolveInspectorGraphId([first, second], second)).toBe("ACBreak-2");
  });

  test("uses stable semantic ids for static graphics regardless of node order", () => {
    const first = createDefaultNode("static-circle", { x: 100, y: 100 });
    first.id = "node-static-b";
    const second = createDefaultNode("static-circle", { x: 200, y: 100 });
    second.id = "node-static-a";

    expect(resolveInspectorGraphId([first, second], second)).toBe("static-circle-1");
    expect(resolveInspectorGraphId([first, second], first)).toBe("static-circle-2");
    expect(resolveInspectorGraphId([second, first], second)).toBe("static-circle-1");
    expect(resolveInspectorGraphId([second, first], first)).toBe("static-circle-2");
  });
});

describe("canvas memoization", () => {
  test("rerenders when visible measurement groups move", () => {
    const sharedScope = {
      visibleNodes: [],
      visibleEdges: [],
      selectedNodeIdSet: new Set<string>(),
      selectedEdgeIds: []
    };
    const previousGroup = {
      id: "measurement-line",
      nodeId: "line-node",
      visible: true,
      offset: { x: -240, y: -90 }
    };
    const nextGroup = {
      ...previousGroup,
      offset: { x: -68, y: -176 }
    };

    expect(areCanvasPropsEqual(
      { scope: { ...sharedScope, visibleMeasurementGroups: [previousGroup] } },
      { scope: { ...sharedScope, visibleMeasurementGroups: [nextGroup] } }
    )).toBe(false);
  });
});
