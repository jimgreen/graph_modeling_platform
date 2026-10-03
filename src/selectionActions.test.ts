import { describe, expect, test } from "vitest";
import {
  assignPermanentDeviceIndex,
  calculateNodeVisualBounds,
  createDefaultNode,
  createRoutableLineDeviceFromEndpoints,
  DEVICE_LIBRARY,
  getEdgeEndpointPoint,
  getTerminalPoint,
  isCanvasNodeMovable,
  normalizeDeviceIndexCounters,
  routeEdgesForRendering,
  routableLineDeviceEndpointRefForNode,
  routableLineDeviceEndpointRefs,
  type Edge,
  type ModelGroup,
  type ModelNode,
  type RoutedEdge
} from "./model";
import {
  AUTO_ALIGN_DEFAULT_THRESHOLD_PX,
  AUTO_ALIGN_MAX_THRESHOLD_PX,
  AUTO_ALIGN_MIN_THRESHOLD_PX,
  CANVAS_EMPTY_SELECTION_MESSAGE,
  type CanvasLayoutUnit,
  alignNodeLayoutUnits,
  autoAlignEdgeWithoutStoredRoute,
  autoAlignNodeLayoutUnits,
  autoAlignPreviewRoutes,
  autoAlignStoredRouteDrops,
  autoAlignStoredRoutePlan,
  arrangeContainerInteriors,
  autoSpreadMovableRects,
  autoSpreadNodeLayoutUnits,
  buildCanvasLayoutUnits,
  buildCanvasClipboard,
  canDissolveSingleCanvasGroupSelection,
  canGroupCanvasSelection,
  canvasGroupMemberNodeIds,
  canvasClipboardBounds,
  cloneCanvasClipboard,
  countAutoAlignRouteBends,
  countAutoAlignRouteCrossings,
  createAutoAlignQualityReport,
  createAutoAlignRouteQualityIndex,
  createCanvasGroupFromSelection,
  distributeNodeLayoutUnits,
  dissolveSelectedCanvasGroups,
  expandSelectionByGroups,
  mergeContainerLayoutUnits,
  reorderItemsByDisplayLayer,
  resolveCanvasSelection,
  resolveCanvasDeleteAction,
  selectedCanvasGroupIds,
  selectGraphicsInRect
} from "./selectionActions";

describe("canvas selection actions", () => {
  test("defines auto-align threshold defaults and limits", () => {
    expect(AUTO_ALIGN_DEFAULT_THRESHOLD_PX).toBe(50);
    expect(AUTO_ALIGN_MIN_THRESHOLD_PX).toBe(5);
    expect(AUTO_ALIGN_MAX_THRESHOLD_PX).toBe(200);
  });

  test("deletes selected graphics including nodes and connection lines", () => {
    expect(resolveCanvasDeleteAction({ selectedNodeCount: 1, hasSelectedEdge: false })).toEqual({ kind: "delete" });
    expect(resolveCanvasDeleteAction({ selectedNodeCount: 0, hasSelectedEdge: true })).toEqual({ kind: "delete" });
  });

  test("warns when deleting with no selected graphics", () => {
    expect(resolveCanvasDeleteAction({ selectedNodeCount: 0, hasSelectedEdge: false })).toEqual({
      kind: "warn",
      message: CANVAS_EMPTY_SELECTION_MESSAGE
    });
  });

  test("reorders selected graphics by display layer while preserving selected relative order", () => {
    const items = ["a", "b", "c", "d", "e"].map((id) => ({ id }));

    expect(reorderItemsByDisplayLayer(items, ["b", "c"], "raise").map((item) => item.id)).toEqual(["a", "d", "b", "c", "e"]);
    expect(reorderItemsByDisplayLayer(items, ["c", "d"], "lower").map((item) => item.id)).toEqual(["a", "c", "d", "b", "e"]);
    expect(reorderItemsByDisplayLayer(items, ["b", "d"], "front").map((item) => item.id)).toEqual(["a", "c", "e", "b", "d"]);
    expect(reorderItemsByDisplayLayer(items, ["b", "d"], "back").map((item) => item.id)).toEqual(["b", "d", "a", "c", "e"]);
    expect(reorderItemsByDisplayLayer(items, [], "front")).toBe(items);
    expect(reorderItemsByDisplayLayer(items, ["missing"], "front")).toBe(items);
  });

  test("reorders selected graphics only inside their model layer", () => {
    const items = [
      { id: "a1", layerId: "layer-a" },
      { id: "b1", layerId: "layer-b" },
      { id: "a2", layerId: "layer-a" },
      { id: "b2", layerId: "layer-b" },
      { id: "a3", layerId: "layer-a" }
    ];

    expect(reorderItemsByDisplayLayer(items, ["a1"], "raise").map((item) => item.id)).toEqual(["a2", "b1", "a1", "b2", "a3"]);
    expect(reorderItemsByDisplayLayer(items, ["a3"], "back").map((item) => item.id)).toEqual(["a3", "b1", "a1", "b2", "a2"]);
    expect(reorderItemsByDisplayLayer(items, ["b1"], "front").map((item) => item.id)).toEqual(["a1", "b2", "a2", "b1", "a3"]);
  });

  test("selects nodes and routed connection lines fully enclosed by the marquee rectangle", () => {
    const source = createDefaultNode("ac-source", { x: 100, y: 100 });
    const target = createDefaultNode("ac-load", { x: 300, y: 100 });
    const outside = createDefaultNode("dc-load", { x: 500, y: 300 });
    const edge: Edge = {
      id: "edge-in-marquee",
      sourceId: source.id,
      targetId: target.id,
      sourceTerminalId: "t1",
      targetTerminalId: "t1"
    };
    const routes = routeEdgesForRendering([source, target, outside], [edge], { width: 800, height: 500 });

    const selection = selectGraphicsInRect(
      [source, target, outside],
      routes,
      { left: 0, right: 450, top: 0, bottom: 360 }
    );

    expect(selection.nodeIds).toEqual([source.id, target.id]);
    expect(selection.edgeIds).toEqual([edge.id]);
  });

  test("does not select a graphic that is only partially covered by the marquee rectangle", () => {
    const source = createDefaultNode("ac-source", { x: 100, y: 100 });
    const target = createDefaultNode("ac-load", { x: 300, y: 100 });
    const edge: Edge = {
      id: "edge-partial",
      sourceId: source.id,
      targetId: target.id,
      sourceTerminalId: "t1",
      targetTerminalId: "t1"
    };
    const routes = routeEdgesForRendering([source, target], [edge], { width: 800, height: 500 });

    const selection = selectGraphicsInRect(
      [source, target],
      routes,
      { left: 120, right: 260, top: 70, bottom: 130 }
    );

    expect(selection.nodeIds).toEqual([]);
    expect(selection.edgeIds).toEqual([]);
  });

  test("includes visible device labels in selection and clipboard bounds while keeping alignment bounds body-only", () => {
    const base = createDefaultNode("ac-source", { x: 100, y: 100 });
    const labeled = {
      ...base,
      params: {
        ...base.params,
        _labelText: "交流电源标识",
        _labelX: "150",
        _labelY: "0",
        _labelFontSize: "18",
        _labelTextAnchor: "middle",
        _labelRotation: "0"
      }
    };
    const bodyRight = labeled.position.x + (labeled.size.width * Math.abs(Number(labeled.scaleX ?? labeled.scale ?? 1))) / 2;

    const selection = selectGraphicsInRect([labeled], [], {
      left: 0,
      right: bodyRight + 4,
      top: 0,
      bottom: 200
    });
    const clipboardBounds = canvasClipboardBounds({ nodes: [labeled], edges: [], groups: [] })!;
    const units = buildCanvasLayoutUnits([], [labeled], [labeled.id], []);

    expect(selection.nodeIds).toEqual([]);
    expect(clipboardBounds.right).toBeGreaterThan(bodyRight + 80);
    expect(units[0].bounds.right).toBeGreaterThan(bodyRight + 80);
    expect(units[0].layoutBounds.right).toBeCloseTo(bodyRight);
  });

  test("includes default-rendered device labels in grouped layout bounds even when label params are absent", () => {
    const base = createDefaultNode("ac-source", { x: 100, y: 100 });
    const paramsWithoutLabel = Object.fromEntries(
      Object.entries(base.params).filter(([key]) => !key.startsWith("_label"))
    );
    const labeled = {
      ...base,
      name: "组合边界需要包含设备标识",
      params: paramsWithoutLabel
    };
    const otherBase = createDefaultNode("ac-load", { x: 20, y: 100 });
    const other = {
      ...otherBase,
      params: {
        ...otherBase.params,
        _labelVisible: "0",
        _labelDisplayMode: "hidden"
      }
    };
    const groups: ModelGroup[] = [{
      id: "group-default-label",
      name: "组合1",
      nodeIds: [labeled.id, other.id],
      edgeIds: []
    }];
    const nodeBodyBottom = (node: ModelNode) => node.position.y + (node.size.height * Math.abs(Number(node.scaleY ?? node.scale ?? 1))) / 2;
    const bodyBottom = nodeBodyBottom(labeled);
    const groupBodyBottom = Math.max(nodeBodyBottom(labeled), nodeBodyBottom(other));

    const units = buildCanvasLayoutUnits(groups, [labeled, other], [labeled.id], []);

    expect(units).toHaveLength(1);
    expect(units[0].kind).toBe("group");
    expect(units[0].bounds.bottom).toBeGreaterThan(bodyBottom + 20);
    expect(units[0].layoutBounds.bottom).toBeCloseTo(groupBodyBottom + 4);
  });

  test("does not build full layout indexes when nothing is selected", () => {
    const nodes = [] as ReturnType<typeof createDefaultNode>[];
    const edges = [] as Edge[];
    const routes = [] as ReturnType<typeof routeEdgesForRendering>;
    nodes.map = () => {
      throw new Error("node scan should be skipped for empty selection");
    };
    edges.map = () => {
      throw new Error("edge scan should be skipped for empty selection");
    };
    routes.map = () => {
      throw new Error("route scan should be skipped for empty selection");
    };

    expect(buildCanvasLayoutUnits([], nodes, [], [], edges, routes)).toEqual([]);
  });

  test("copies and pastes selected nodes with their selected connection lines", () => {
    const source = createDefaultNode("ac-source", { x: 100, y: 100 });
    const target = createDefaultNode("ac-load", { x: 300, y: 100 });
    const edge: Edge = {
      id: "edge-to-copy",
      sourceId: source.id,
      targetId: target.id,
      sourceTerminalId: "t1",
      targetTerminalId: "t1"
    };
    const routes = routeEdgesForRendering([source, target], [edge], { width: 800, height: 500 });
    const clipboard = buildCanvasClipboard([source, target], [edge], routes, [source.id, target.id], [edge.id]);
    const bounds = canvasClipboardBounds(clipboard)!;
    let nextNodeNumber = 1;

    const pasted = cloneCanvasClipboard(
      clipboard,
      { x: 400, y: 300 },
      () => `node-copy-${nextNodeNumber++}`,
      () => "edge-copy"
    );

    expect(pasted.nodes).toHaveLength(2);
    expect(pasted.edges).toHaveLength(1);
    expect(pasted.nodes[0].position).toEqual({
      x: Math.round(source.position.x + 400 - bounds.left),
      y: Math.round(source.position.y + 300 - bounds.top)
    });
    expect(pasted.edges[0]).toEqual(expect.objectContaining({
      id: "edge-copy",
      sourceId: "node-copy-1",
      targetId: "node-copy-2",
      sourceTerminalId: "t1",
      targetTerminalId: "t1"
    }));
    expect(pasted.edges[0].manualPoints?.length).toBeGreaterThan(0);
  });

  test("remaps pasted routable line endpoint refs to the copied endpoint devices", () => {
    const template = DEVICE_LIBRARY.find((item) => item.kind === "ac-routable-line");
    expect(template).toBeTruthy();
    const source = { ...createDefaultNode("ac-source", { x: 100, y: 120 }), id: "source-original" };
    const target = { ...createDefaultNode("ac-load", { x: 420, y: 120 }), id: "target-original" };
    const line = {
      ...createRoutableLineDeviceFromEndpoints(
        template!,
        getTerminalPoint(source, "t1"),
        getTerminalPoint(target, "t1"),
        "layer-a",
        {
          source: routableLineDeviceEndpointRefForNode(source, "t1"),
          target: routableLineDeviceEndpointRefForNode(target, "t1")
        }
      ),
      id: "line-original"
    };
    const clipboard = buildCanvasClipboard(
      [source, target, line],
      [],
      [],
      [source.id, target.id, line.id],
      []
    );
    const nextNodeIds = ["source-copy", "target-copy", "line-copy"];

    const pasted = cloneCanvasClipboard(
      clipboard,
      { x: 600, y: 300 },
      () => nextNodeIds.shift()!,
      () => "unused-edge"
    );

    const pastedLine = pasted.nodes.find((node) => node.id === "line-copy");
    expect(pastedLine).toBeTruthy();
    const refs = routableLineDeviceEndpointRefs(pastedLine!);
    expect(refs.source).toMatchObject({ nodeId: "source-copy", terminalId: "t1" });
    expect(refs.target).toMatchObject({ nodeId: "target-copy", terminalId: "t1" });
  });

  test("does not paste a selected connection line when its endpoint devices are not copied", () => {
    const source = createDefaultNode("ac-source", { x: 100, y: 100 });
    const target = createDefaultNode("ac-load", { x: 300, y: 100 });
    const edge: Edge = {
      id: "edge-only",
      sourceId: source.id,
      targetId: target.id,
      sourceTerminalId: "t1",
      targetTerminalId: "t1"
    };
    const routes = routeEdgesForRendering([source, target], [edge], { width: 800, height: 500 });
    const clipboard = buildCanvasClipboard([source, target], [edge], routes, [], [edge.id]);

    const pasted = cloneCanvasClipboard(clipboard, { x: 400, y: 300 }, () => "unused-node", () => "edge-copy");

    expect(pasted.nodes).toHaveLength(0);
    expect(pasted.edges).toHaveLength(0);
  });

  test("resets pasted container indexes so body and associated device idx values stay globally unique", () => {
    let counters = {};
    const first = assignPermanentDeviceIndex(createDefaultNode("ac-electrolyzer", { x: 100, y: 100 }), counters);
    counters = first.counters;
    const second = assignPermanentDeviceIndex(createDefaultNode("ac-electrolyzer", { x: 260, y: 100 }), counters);
    counters = second.counters;
    const routes = routeEdgesForRendering([first.node, second.node], [], { width: 800, height: 500 });
    const clipboard = buildCanvasClipboard([first.node, second.node], [], routes, [second.node.id], []);

    const cloned = cloneCanvasClipboard(clipboard, { x: 420, y: 220 }, () => "pasted-electrolyzer", () => "unused-edge");
    const currentPageCounters = normalizeDeviceIndexCounters({}, [first.node, second.node]);
    const pasted = assignPermanentDeviceIndex(cloned.nodes[0], currentPageCounters).node;

    expect(second.node.params).toMatchObject({
      idx: "2",
      idx_ac_load_t1: "2",
      idx_h2_unit_t2: "2"
    });
    expect(pasted.params).toMatchObject({
      idx: "3",
      idx_ac_load_t1: "3",
      idx_h2_unit_t2: "3"
    });
  });

  test("expands a member selection to the whole graphic group", () => {
    const source = createDefaultNode("ac-source", { x: 100, y: 100 });
    const target = createDefaultNode("ac-load", { x: 300, y: 100 });
    const edge: Edge = {
      id: "edge-grouped",
      sourceId: source.id,
      targetId: target.id,
      sourceTerminalId: "t1",
      targetTerminalId: "t1"
    };
    const groups: ModelGroup[] = [{
      id: "group-1",
      name: "组合1",
      nodeIds: [source.id, target.id],
      edgeIds: [edge.id]
    }];

    expect(expandSelectionByGroups(groups, [source.id], [])).toEqual({
      nodeIds: [source.id, target.id],
      edgeIds: [edge.id]
    });
    expect(expandSelectionByGroups(groups, [], [edge.id])).toEqual({
      nodeIds: [source.id, target.id],
      edgeIds: [edge.id]
    });
    expect(resolveCanvasSelection(groups, [source.id], [], "direct")).toEqual({
      nodeIds: [source.id],
      edgeIds: []
    });
  });

  test("expands a member selection through nested graphic groups", () => {
    const first = createDefaultNode("ac-source", { x: 100, y: 100 });
    const second = createDefaultNode("ac-load", { x: 220, y: 100 });
    const third = createDefaultNode("dc-load", { x: 360, y: 100 });
    const groups: ModelGroup[] = [
      {
        id: "group-child",
        name: "组合1",
        nodeIds: [first.id, second.id],
        edgeIds: []
      } as ModelGroup,
      {
        id: "group-parent",
        name: "组合2",
        nodeIds: [third.id],
        edgeIds: [],
        childGroupIds: ["group-child"]
      } as ModelGroup
    ];

    expect(expandSelectionByGroups(groups, [first.id], [])).toEqual({
      nodeIds: [first.id, second.id, third.id],
      edgeIds: []
    });
  });

  test("copies only the direct group member when group expansion is disabled", () => {
    const source = createDefaultNode("ac-source", { x: 100, y: 100 });
    const target = createDefaultNode("ac-load", { x: 300, y: 100 });
    const edge: Edge = {
      id: "edge-direct-member-copy",
      sourceId: source.id,
      targetId: target.id,
      sourceTerminalId: "t1",
      targetTerminalId: "t1"
    };
    const groups: ModelGroup[] = [{
      id: "group-direct-member",
      name: "组合1",
      nodeIds: [source.id, target.id],
      edgeIds: [edge.id]
    }];
    const routes = routeEdgesForRendering([source, target], [edge], { width: 800, height: 500 });

    const clipboard = buildCanvasClipboard([source, target], [edge], routes, [source.id], [], groups, { expandGroups: false });

    expect(clipboard.nodes.map((node) => node.id)).toEqual([source.id]);
    expect(clipboard.edges).toEqual([]);
    expect(clipboard.groups).toEqual([]);
  });

  test("creates and dissolves canvas groups without deleting graphics", () => {
    const first = createDefaultNode("ac-source", { x: 100, y: 100 });
    const second = createDefaultNode("ac-load", { x: 300, y: 100 });

    const created = createCanvasGroupFromSelection([], [first.id, second.id], [], () => "group-created");

    expect(created.group).toEqual({
      id: "group-created",
      name: "组合1",
      nodeIds: [first.id, second.id],
      edgeIds: []
    });

    const dissolved = dissolveSelectedCanvasGroups(created.groups, [first.id], []);

    expect(dissolved.removedGroupIds).toEqual(["group-created"]);
    expect(dissolved.groups).toEqual([]);
  });

  test("creates a parent group from an existing group and standalone graphics", () => {
    const first = createDefaultNode("ac-source", { x: 100, y: 100 });
    const second = createDefaultNode("ac-load", { x: 220, y: 100 });
    const third = createDefaultNode("dc-load", { x: 360, y: 100 });
    const child: ModelGroup = {
      id: "group-child",
      name: "组合1",
      nodeIds: [first.id, second.id],
      edgeIds: []
    };

    const created = createCanvasGroupFromSelection([child], [first.id, third.id], [], () => "group-parent");

    expect(created.groups).toContainEqual(child);
    expect(created.group).toEqual({
      id: "group-parent",
      name: "组合2",
      nodeIds: [third.id],
      edgeIds: [],
      childGroupIds: ["group-child"]
    });
  });

  test("dissolves only the selected parent group and keeps nested child groups", () => {
    const first = createDefaultNode("ac-source", { x: 100, y: 100 });
    const second = createDefaultNode("ac-load", { x: 220, y: 100 });
    const third = createDefaultNode("dc-load", { x: 360, y: 100 });
    const child: ModelGroup = {
      id: "group-child",
      name: "组合1",
      nodeIds: [first.id, second.id],
      edgeIds: []
    };
    const parent: ModelGroup = {
      id: "group-parent",
      name: "组合2",
      nodeIds: [third.id],
      edgeIds: [],
      childGroupIds: [child.id]
    } as ModelGroup;

    const dissolved = dissolveSelectedCanvasGroups([child, parent], [first.id], []);

    expect(dissolved.removedGroupIds).toEqual(["group-parent"]);
    expect(dissolved.groups).toEqual([child]);
  });

  test("allows dissolving only when the selection resolves to one graphic group", () => {
    const first = createDefaultNode("ac-source", { x: 100, y: 100 });
    const second = createDefaultNode("ac-load", { x: 220, y: 100 });
    const third = createDefaultNode("dc-load", { x: 360, y: 100 });
    const fourth = createDefaultNode("dc-source", { x: 500, y: 100 });
    const firstGroup: ModelGroup = {
      id: "group-first",
      name: "组合1",
      nodeIds: [first.id, second.id],
      edgeIds: []
    };
    const secondGroup: ModelGroup = {
      id: "group-second",
      name: "组合2",
      nodeIds: [third.id, fourth.id],
      edgeIds: []
    };

    expect(canDissolveSingleCanvasGroupSelection([firstGroup, secondGroup], [first.id], [])).toBe(true);
    expect(canDissolveSingleCanvasGroupSelection([firstGroup, secondGroup], [first.id, third.id], [])).toBe(false);
    expect(canDissolveSingleCanvasGroupSelection([firstGroup, secondGroup], [first.id, fourth.id], [])).toBe(false);
    expect(canDissolveSingleCanvasGroupSelection([firstGroup], [first.id, third.id], [])).toBe(false);

    const blocked = dissolveSelectedCanvasGroups([firstGroup], [first.id, third.id], []);

    expect(blocked.removedGroupIds).toEqual([]);
    expect(blocked.groups).toEqual([firstGroup]);
  });

  test("allows grouping multiple groups but not a single selected group", () => {
    const first = createDefaultNode("ac-source", { x: 100, y: 100 });
    const second = createDefaultNode("ac-load", { x: 220, y: 100 });
    const third = createDefaultNode("dc-load", { x: 360, y: 100 });
    const fourth = createDefaultNode("dc-source", { x: 500, y: 100 });
    const firstGroup: ModelGroup = {
      id: "group-first",
      name: "组合1",
      nodeIds: [first.id, second.id],
      edgeIds: []
    };
    const secondGroup: ModelGroup = {
      id: "group-second",
      name: "组合2",
      nodeIds: [third.id, fourth.id],
      edgeIds: []
    };

    expect(canGroupCanvasSelection([firstGroup, secondGroup], [first.id], [])).toBe(false);
    expect(canGroupCanvasSelection([firstGroup, secondGroup], [first.id, third.id], [])).toBe(true);
    expect(canGroupCanvasSelection([firstGroup], [first.id, third.id], [])).toBe(true);
  });

  test("collects node members of nested selected groups without standalone selected nodes", () => {
    const first = createDefaultNode("ac-source", { x: 100, y: 100 });
    const second = createDefaultNode("ac-load", { x: 220, y: 100 });
    const third = createDefaultNode("dc-load", { x: 360, y: 100 });
    const standalone = createDefaultNode("dc-source", { x: 500, y: 100 });
    const child: ModelGroup = {
      id: "group-child",
      name: "组合1",
      nodeIds: [first.id, second.id],
      edgeIds: []
    };
    const parent: ModelGroup = {
      id: "group-parent",
      name: "组合2",
      nodeIds: [third.id],
      edgeIds: [],
      childGroupIds: [child.id]
    } as ModelGroup;

    expect(canvasGroupMemberNodeIds([child, parent], [parent.id])).toEqual([first.id, second.id, third.id]);
    expect(canvasGroupMemberNodeIds([child, parent], [])).not.toContain(standalone.id);
  });

  test("resolves a direct focused member in a deeply nested group back to the whole group", () => {
    const first = createDefaultNode("ac-source", { x: 100, y: 100 });
    const second = createDefaultNode("ac-load", { x: 220, y: 100 });
    const third = createDefaultNode("dc-load", { x: 360, y: 100 });
    const fourth = createDefaultNode("dc-source", { x: 500, y: 100 });
    const leaf: ModelGroup = {
      id: "group-leaf",
      name: "组合1",
      nodeIds: [first.id, second.id],
      edgeIds: []
    };
    const middle: ModelGroup = {
      id: "group-middle",
      name: "组合2",
      nodeIds: [third.id],
      edgeIds: [],
      childGroupIds: [leaf.id]
    };
    const root: ModelGroup = {
      id: "group-root",
      name: "组合3",
      nodeIds: [fourth.id],
      edgeIds: [],
      childGroupIds: [middle.id]
    };
    const groups = [leaf, middle, root];
    const expanded = resolveCanvasSelection(groups, [first.id], [], "group");
    const selectedGroupIds = selectedCanvasGroupIds(groups, expanded.nodeIds, expanded.edgeIds);

    expect(expanded.nodeIds).toEqual([first.id, second.id, third.id, fourth.id]);
    expect(selectedGroupIds).toEqual([root.id]);
    expect(canvasGroupMemberNodeIds(groups, selectedGroupIds)).toEqual([first.id, second.id, third.id, fourth.id]);
  });

  test("can exclude routable line-like devices from transformable group layout nodes", () => {
    const source = { ...createDefaultNode("ac-source", { x: 100, y: 100 }), id: "source-node" };
    const target = { ...createDefaultNode("ac-load", { x: 420, y: 100 }), id: "target-node" };
    const line = { ...createDefaultNode("ac-routable-line", { x: 260, y: 100 }), id: "line-node" };
    const groups: ModelGroup[] = [{
      id: "group-with-line",
      name: "组合1",
      nodeIds: [source.id, line.id, target.id],
      edgeIds: []
    }];

    const units = buildCanvasLayoutUnits(
      groups,
      [source, line, target],
      [source.id],
      [],
      [],
      [],
      { isTransformableNode: (node) => isCanvasNodeMovable(node.kind) }
    );

    expect(units).toHaveLength(1);
    expect(units[0].nodeIds).toEqual([source.id, target.id]);
    expect(units[0].nodeIds).not.toContain(line.id);
  });

  test("copies and pastes selected graphics while preserving their group relationship", () => {
    const source = createDefaultNode("ac-source", { x: 100, y: 100 });
    const target = createDefaultNode("ac-load", { x: 300, y: 100 });
    const edge: Edge = {
      id: "edge-group-copy",
      sourceId: source.id,
      targetId: target.id,
      sourceTerminalId: "t1",
      targetTerminalId: "t1"
    };
    const groups: ModelGroup[] = [{
      id: "group-copy-source",
      name: "组合1",
      nodeIds: [source.id, target.id],
      edgeIds: [edge.id]
    }];
    const routes = routeEdgesForRendering([source, target], [edge], { width: 800, height: 500 });
    const clipboard = buildCanvasClipboard([source, target], [edge], routes, [source.id], [], groups);

    const pasted = cloneCanvasClipboard(
      clipboard,
      { x: 400, y: 300 },
      (() => {
        let index = 0;
        return () => `node-copy-${++index}`;
      })(),
      () => "edge-copy",
      () => "group-copy"
    );

    expect(pasted.nodes.map((node) => node.id)).toEqual(["node-copy-1", "node-copy-2"]);
    expect(pasted.edges.map((item) => item.id)).toEqual(["edge-copy"]);
    expect(pasted.groups).toEqual([{
      id: "group-copy",
      name: "组合1 副本",
      nodeIds: ["node-copy-1", "node-copy-2"],
      edgeIds: ["edge-copy"]
    }]);
  });

  test("copies and pastes internal connection lines for a selected group even when group edge ids are missing", () => {
    const source = createDefaultNode("ac-source", { x: 100, y: 100 });
    const target = createDefaultNode("ac-load", { x: 300, y: 100 });
    const edge: Edge = {
      id: "edge-implicit-group-copy",
      sourceId: source.id,
      targetId: target.id,
      sourceTerminalId: "t1",
      targetTerminalId: "t1"
    };
    const groups: ModelGroup[] = [{
      id: "group-with-implicit-edge",
      name: "组合1",
      nodeIds: [source.id, target.id],
      edgeIds: []
    }];
    const routes = routeEdgesForRendering([source, target], [edge], { width: 800, height: 500 });
    const clipboard = buildCanvasClipboard([source, target], [edge], routes, [source.id], [], groups);

    const pasted = cloneCanvasClipboard(
      clipboard,
      { x: 400, y: 300 },
      (() => {
        let index = 0;
        return () => `node-copy-${++index}`;
      })(),
      () => "edge-copy",
      () => "group-copy"
    );

    expect(clipboard.edges.map((item) => item.edge.id)).toEqual([edge.id]);
    expect(pasted.nodes.map((node) => node.id)).toEqual(["node-copy-1", "node-copy-2"]);
    expect(pasted.edges.map((item) => item.id)).toEqual(["edge-copy"]);
    expect(pasted.groups).toEqual([{
      id: "group-copy",
      name: "组合1 副本",
      nodeIds: ["node-copy-1", "node-copy-2"],
      edgeIds: ["edge-copy"]
    }]);
  });

  test("copies and pastes nested graphic groups while preserving their hierarchy", () => {
    const first = createDefaultNode("ac-source", { x: 100, y: 100 });
    const second = createDefaultNode("ac-load", { x: 220, y: 100 });
    const third = createDefaultNode("dc-load", { x: 360, y: 100 });
    const groups: ModelGroup[] = [
      {
        id: "group-child",
        name: "组合1",
        nodeIds: [first.id, second.id],
        edgeIds: []
      },
      {
        id: "group-parent",
        name: "组合2",
        nodeIds: [third.id],
        edgeIds: [],
        childGroupIds: ["group-child"]
      } as ModelGroup
    ];

    const clipboard = buildCanvasClipboard([first, second, third], [], [], [first.id], [], groups);
    let nextNode = 0;
    let nextGroup = 0;
    const pasted = cloneCanvasClipboard(
      clipboard,
      { x: 500, y: 300 },
      () => `node-copy-${++nextNode}`,
      () => "unused-edge",
      () => `group-copy-${++nextGroup}`
    );

    expect(pasted.nodes.map((node) => node.id)).toEqual(["node-copy-1", "node-copy-2", "node-copy-3"]);
    expect(pasted.groups).toEqual([
      {
        id: "group-copy-1",
        name: "组合1 副本",
        nodeIds: ["node-copy-1", "node-copy-2"],
        edgeIds: []
      },
      {
        id: "group-copy-2",
        name: "组合2 副本",
        nodeIds: ["node-copy-3"],
        edgeIds: [],
        childGroupIds: ["group-copy-1"]
      }
    ]);
  });

  test("aligns selected grouped graphics as a single layout unit", () => {
    const standalone = createDefaultNode("ac-source", { x: 100, y: 100 });
    const firstGrouped = createDefaultNode("ac-load", { x: 420, y: 100 });
    const secondGrouped = createDefaultNode("dc-load", { x: 540, y: 100 });
    const groups: ModelGroup[] = [{
      id: "group-layout",
      name: "组合1",
      nodeIds: [firstGrouped.id, secondGrouped.id],
      edgeIds: []
    }];

    const units = buildCanvasLayoutUnits(groups, [standalone, firstGrouped, secondGrouped], [standalone.id, firstGrouped.id], []);
    const aligned = alignNodeLayoutUnits([standalone, firstGrouped, secondGrouped], units, "left");
    const movedStandalone = aligned.find((node) => node.id === standalone.id)!;
    const movedFirst = aligned.find((node) => node.id === firstGrouped.id)!;
    const movedSecond = aligned.find((node) => node.id === secondGrouped.id)!;
    const firstDelta = movedFirst.position.x - firstGrouped.position.x;
    const secondDelta = movedSecond.position.x - secondGrouped.position.x;

    expect(units.map((unit) => ({ kind: unit.kind, nodeIds: unit.nodeIds }))).toEqual([
      { kind: "group", nodeIds: [firstGrouped.id, secondGrouped.id] },
      { kind: "node", nodeIds: [standalone.id] }
    ]);
    expect(units[0].bounds.left).toBeLessThan(firstGrouped.position.x - firstGrouped.size.width / 2);
    expect(movedStandalone.position).toEqual(standalone.position);
    expect(firstDelta).toBeLessThan(0);
    expect(firstDelta).toBe(secondDelta);
    expect(movedSecond.position.x - movedFirst.position.x).toBe(secondGrouped.position.x - firstGrouped.position.x);
  });

  test("aligns layout units by device body bounds instead of visible label bounds", () => {
    const labeledBase = createDefaultNode("ac-source", { x: 220, y: 100 });
    const labeled = {
      ...labeledBase,
      params: {
        ...labeledBase.params,
        _labelText: "很长的左侧标识",
        _labelX: "-180",
        _labelY: "0",
        _labelFontSize: "22",
        _labelTextAnchor: "middle",
        _labelRotation: "0"
      }
    };
    const plainBase = createDefaultNode("ac-load", { x: 360, y: 160 });
    const plain = {
      ...plainBase,
      params: {
        ...plainBase.params,
        _labelVisible: "0",
        _labelDisplayMode: "hidden"
      }
    };
    const bodyLeft = (node: ModelNode) =>
      Math.round(node.position.x - (node.size.width * Math.abs(Number(node.scaleX ?? node.scale ?? 1))) / 2);
    const units = buildCanvasLayoutUnits([], [labeled, plain], [labeled.id, plain.id], []);

    const aligned = alignNodeLayoutUnits([labeled, plain], units, "left");
    const alignedLabeled = aligned.find((node) => node.id === labeled.id)!;
    const alignedPlain = aligned.find((node) => node.id === plain.id)!;

    expect(units[0].bounds.left).toBeLessThan(bodyLeft(labeled) - 80);
    expect(bodyLeft(alignedLabeled)).toBe(bodyLeft(alignedPlain));
  });

  test("auto-spreads overlapping layout units while preserving grouped relative positions", () => {
    const standalone = createDefaultNode("ac-source", { x: 100, y: 100 });
    const firstGrouped = createDefaultNode("ac-load", { x: 104, y: 100 });
    const secondGrouped = createDefaultNode("dc-load", { x: 154, y: 100 });
    const groups: ModelGroup[] = [{
      id: "group-auto-spread",
      name: "组合1",
      nodeIds: [firstGrouped.id, secondGrouped.id],
      edgeIds: []
    }];
    const nodes = [standalone, firstGrouped, secondGrouped];
    const units = buildCanvasLayoutUnits(groups, nodes, nodes.map((node) => node.id), []);

    const arranged = autoSpreadNodeLayoutUnits(nodes, units, { padding: 4 });
    const nextUnits = buildCanvasLayoutUnits(groups, arranged, arranged.map((node) => node.id), []);
    const firstBounds = nextUnits[0].bounds;
    const secondBounds = nextUnits[1].bounds;
    const movedFirst = arranged.find((node) => node.id === firstGrouped.id)!;
    const movedSecond = arranged.find((node) => node.id === secondGrouped.id)!;

    expect(units).toHaveLength(2);
    const overlapX = Math.min(firstBounds.right, secondBounds.right) - Math.max(firstBounds.left, secondBounds.left);
    const overlapY = Math.min(firstBounds.bottom, secondBounds.bottom) - Math.max(firstBounds.top, secondBounds.top);
    expect(overlapX <= 0 || overlapY <= 0).toBe(true);
    expect(movedSecond.position.x - movedFirst.position.x).toBe(secondGrouped.position.x - firstGrouped.position.x);
  });

  test("auto-spread keeps moved graphics away from occupied route or annotation rectangles", () => {
    const first = createDefaultNode("ac-source", { x: 100, y: 100 });
    const second = createDefaultNode("ac-load", { x: 104, y: 100 });
    const nodes = [first, second];
    const units = buildCanvasLayoutUnits([], nodes, nodes.map((node) => node.id), []);
    const occupiedRect = { left: 170, right: 350, top: 40, bottom: 180 };

    const arranged = autoSpreadNodeLayoutUnits(nodes, units, {
      padding: 4,
      avoidRects: [occupiedRect]
    });
    const nextUnits = buildCanvasLayoutUnits([], arranged, arranged.map((node) => node.id), []);

    for (const unit of nextUnits) {
      const overlapX = Math.min(unit.bounds.right, occupiedRect.right) - Math.max(unit.bounds.left, occupiedRect.left);
      const overlapY = Math.min(unit.bounds.bottom, occupiedRect.bottom) - Math.max(unit.bounds.top, occupiedRect.top);
      expect(overlapX <= 0 || overlapY <= 0).toBe(true);
    }
  });

  test("auto-spread does not disturb an already separated layout because of its current routes", () => {
    const first = createDefaultNode("ac-source", { x: 100, y: 100 });
    const second = createDefaultNode("ac-load", { x: 400, y: 100 });
    const third = createDefaultNode("ac-source", { x: 700, y: 100 });
    const nodes = [first, second, third];
    const units = buildCanvasLayoutUnits([], nodes, nodes.map((node) => node.id), []);

    const arranged = autoSpreadNodeLayoutUnits(nodes, units, {
      padding: 4,
      bounds: { width: 1200, height: 900 },
      avoidRects: [{ left: 80, right: 720, top: 90, bottom: 110 }]
    });

    expect(arranged.map((node) => node.position)).toEqual(nodes.map((node) => node.position));
  });

  test("auto-spread does not treat empty space inside a sparse group as an overlap", () => {
    const firstGrouped = createDefaultNode("ac-source", { x: 100, y: 100 });
    const middle = createDefaultNode("ac-load", { x: 400, y: 100 });
    const secondGrouped = createDefaultNode("dc-load", { x: 700, y: 100 });
    const nodes = [firstGrouped, middle, secondGrouped];
    const groups: ModelGroup[] = [{
      id: "group-sparse-auto-spread",
      name: "稀疏组合",
      nodeIds: [firstGrouped.id, secondGrouped.id],
      edgeIds: []
    }];
    const units = buildCanvasLayoutUnits(groups, nodes, nodes.map((node) => node.id), []);

    const arranged = autoSpreadNodeLayoutUnits(nodes, units, {
      padding: 4,
      bounds: { width: 1200, height: 900 }
    });

    expect(arranged.map((node) => node.position)).toEqual(nodes.map((node) => node.position));
  });

  test("auto-spread does not treat the gap before a detached measurement box as occupied", () => {
    const measured = createDefaultNode("ac-source", { x: 100, y: 100 });
    const middle = createDefaultNode("ac-load", { x: 350, y: 100 });
    const nodes = [measured, middle];
    const measurementBounds = { left: 560, right: 680, top: 60, bottom: 140 };
    const units = buildCanvasLayoutUnits([], nodes, nodes.map((node) => node.id), [], [], [], {
      extraBoundsByNodeId: new Map([[measured.id, [measurementBounds]]])
    });

    const arranged = autoSpreadNodeLayoutUnits(nodes, units, {
      padding: 4,
      bounds: { width: 1000, height: 700 }
    });

    expect(arranged.map((node) => node.position)).toEqual(nodes.map((node) => node.position));
  });

  test("layout units include extra node bounds such as measurement boxes", () => {
    const node = createDefaultNode("ac-source", { x: 100, y: 100 });
    const measurementBounds = { left: 220, right: 340, top: 70, bottom: 140 };

    const [unit] = buildCanvasLayoutUnits([], [node], [node.id], [], [], [], {
      extraBoundsByNodeId: new Map([[node.id, [measurementBounds]]])
    });

    expect(unit.bounds.right).toBeGreaterThanOrEqual(measurementBounds.right);
    expect(unit.bounds.top).toBeLessThanOrEqual(measurementBounds.top);
    expect(unit.layoutBounds.right).toBeLessThan(measurementBounds.right);
  });

  test("auto-spread keeps dense clusters near their original in-canvas area", () => {
    const nodes = Array.from({ length: 6 }, (_, index) =>
      createDefaultNode("ac-source", { x: 100 + (index % 2) * 4, y: 100 + Math.floor(index / 2) * 4 })
    );
    const units = buildCanvasLayoutUnits([], nodes, nodes.map((node) => node.id), []);

    const arranged = autoSpreadNodeLayoutUnits(nodes, units, { padding: 4, bounds: { width: 1200, height: 900 } });
    const nextUnits = buildCanvasLayoutUnits([], arranged, arranged.map((node) => node.id), []);

    for (const unit of nextUnits) {
      expect(unit.bounds.left).toBeGreaterThanOrEqual(0);
      expect(unit.bounds.top).toBeGreaterThanOrEqual(0);
      expect(unit.bounds.right).toBeLessThanOrEqual(1200);
      expect(unit.bounds.bottom).toBeLessThanOrEqual(900);
    }
    for (let firstIndex = 0; firstIndex < nextUnits.length - 1; firstIndex += 1) {
      for (let secondIndex = firstIndex + 1; secondIndex < nextUnits.length; secondIndex += 1) {
        const firstBounds = nextUnits[firstIndex].bounds;
        const secondBounds = nextUnits[secondIndex].bounds;
        const overlapX = Math.min(firstBounds.right, secondBounds.right) - Math.max(firstBounds.left, secondBounds.left);
        const overlapY = Math.min(firstBounds.bottom, secondBounds.bottom) - Math.max(firstBounds.top, secondBounds.top);
        expect(overlapX <= 0 || overlapY <= 0).toBe(true);
      }
    }
  });

  test("auto-spread balances horizontal and vertical expansion for tightly overlapped clusters", () => {
    const nodes = Array.from({ length: 16 }, (_, index) =>
      createDefaultNode("ac-source", { x: 400 + (index % 4), y: 300 + Math.floor(index / 4) })
    );
    const units = buildCanvasLayoutUnits([], nodes, nodes.map((node) => node.id), []);

    const arranged = autoSpreadNodeLayoutUnits(nodes, units, { padding: 4, bounds: { width: 2000, height: 1600 } });
    const nextUnits = buildCanvasLayoutUnits([], arranged, arranged.map((node) => node.id), []);
    const bounds = {
      left: Math.min(...nextUnits.map((unit) => unit.bounds.left)),
      right: Math.max(...nextUnits.map((unit) => unit.bounds.right)),
      top: Math.min(...nextUnits.map((unit) => unit.bounds.top)),
      bottom: Math.max(...nextUnits.map((unit) => unit.bounds.bottom))
    };
    const uniqueColumns = new Set(arranged.map((node) => Math.round(node.position.x)));
    const uniqueRows = new Set(arranged.map((node) => Math.round(node.position.y)));
    const aspectRatio = (bounds.right - bounds.left) / Math.max(1, bounds.bottom - bounds.top);

    expect(uniqueColumns.size).toBeGreaterThan(1);
    expect(uniqueRows.size).toBeGreaterThan(1);
    expect(uniqueColumns.size).toBeLessThanOrEqual(5);
    expect(uniqueRows.size).toBeLessThanOrEqual(5);
    expect(aspectRatio).toBeGreaterThan(0.55);
    expect(aspectRatio).toBeLessThan(1.8);
  });

  test("auto-spread brings a separated unit back inside the canvas after auto-align", () => {
    const canvasBounds = { width: 400, height: 300 };
    const padding = 4;
    const first = createDefaultNode("ac-source", { x: 100, y: 250 });
    const second = createDefaultNode("ac-load", { x: 300, y: 290 });
    const nodes = [first, second];
    const initialUnits: CanvasLayoutUnit[] = [
      {
        id: `node:${first.id}`,
        kind: "node",
        nodeIds: [first.id],
        edgeIds: [],
        bounds: { left: 60, right: 140, top: 220, bottom: 286 },
        layoutBounds: { left: 90, right: 110, top: 240, bottom: 260 },
        collisionRects: [{ left: 60, right: 140, top: 220, bottom: 286 }]
      },
      {
        id: `node:${second.id}`,
        kind: "node",
        nodeIds: [second.id],
        edgeIds: [],
        bounds: { left: 260, right: 340, top: 275, bottom: 295 },
        layoutBounds: { left: 290, right: 310, top: 280, bottom: 300 },
        collisionRects: [{ left: 260, right: 340, top: 275, bottom: 295 }]
      }
    ];
    const offsetUnits = (units: readonly CanvasLayoutUnit[], before: readonly ModelNode[], after: readonly ModelNode[]) => {
      const beforeById = new Map(before.map((node) => [node.id, node]));
      const afterById = new Map(after.map((node) => [node.id, node]));
      const offsetRect = (rect: CanvasLayoutUnit["bounds"], dx: number, dy: number) => ({
        left: rect.left + dx,
        right: rect.right + dx,
        top: rect.top + dy,
        bottom: rect.bottom + dy
      });
      return units.map((unit) => {
        const nodeId = unit.nodeIds[0];
        const beforeNode = beforeById.get(nodeId)!;
        const afterNode = afterById.get(nodeId)!;
        const dx = afterNode.position.x - beforeNode.position.x;
        const dy = afterNode.position.y - beforeNode.position.y;
        return {
          ...unit,
          bounds: offsetRect(unit.bounds, dx, dy),
          layoutBounds: offsetRect(unit.layoutBounds, dx, dy),
          collisionRects: unit.collisionRects.map((rect) => offsetRect(rect, dx, dy))
        };
      });
    };

    const firstSpread = autoSpreadNodeLayoutUnits(nodes, initialUnits, { padding, bounds: canvasBounds });
    const aligned = autoAlignNodeLayoutUnits(firstSpread, initialUnits, 50);
    const alignedUnits = offsetUnits(initialUnits, nodes, aligned);
    expect(alignedUnits.some((unit) => unit.bounds.bottom > canvasBounds.height)).toBe(true);

    const finalNodes = autoSpreadNodeLayoutUnits(aligned, alignedUnits, { padding, bounds: canvasBounds });
    const finalUnits = offsetUnits(alignedUnits, aligned, finalNodes);

    for (const unit of finalUnits) {
      expect(unit.bounds.left).toBeGreaterThanOrEqual(padding);
      expect(unit.bounds.top).toBeGreaterThanOrEqual(padding);
      expect(unit.bounds.right).toBeLessThanOrEqual(canvasBounds.width - padding);
      expect(unit.bounds.bottom).toBeLessThanOrEqual(canvasBounds.height - padding);
    }
  });

  test("auto-spread moves a measurement rectangle away from a device label", () => {
    const fixedRect = { left: 80, right: 160, top: 80, bottom: 140 };
    const measurementRect = { left: 100, right: 180, top: 120, bottom: 154 };
    const deltas = autoSpreadMovableRects(
      [{ id: "measurement-1", rect: measurementRect }],
      [fixedRect],
      { padding: 4, bounds: { width: 300, height: 220 } }
    );
    const delta = deltas.get("measurement-1");

    expect(delta).toBeDefined();
    expect(Math.abs(delta!.x) + Math.abs(delta!.y)).toBeGreaterThan(0);
    const movedRect = {
      left: measurementRect.left + delta!.x,
      right: measurementRect.right + delta!.x,
      top: measurementRect.top + delta!.y,
      bottom: measurementRect.bottom + delta!.y
    };
    const overlapX = Math.min(fixedRect.right, movedRect.right) - Math.max(fixedRect.left, movedRect.left);
    const overlapY = Math.min(fixedRect.bottom, movedRect.bottom) - Math.max(fixedRect.top, movedRect.top);
    expect(overlapX <= 0 || overlapY <= 0).toBe(true);
    expect(movedRect.left).toBeGreaterThanOrEqual(4);
    expect(movedRect.top).toBeGreaterThanOrEqual(4);
    expect(movedRect.right).toBeLessThanOrEqual(296);
    expect(movedRect.bottom).toBeLessThanOrEqual(216);
  });

  test("auto-spread separates multiple measurement rectangles from labels and each other", () => {
    const fixedRect = { left: 90, right: 170, top: 90, bottom: 135 };
    const items = [
      { id: "measurement-1", rect: { left: 110, right: 190, top: 110, bottom: 146 } },
      { id: "measurement-2", rect: { left: 116, right: 196, top: 116, bottom: 152 } }
    ];
    const deltas = autoSpreadMovableRects(items, [fixedRect], {
      padding: 4,
      bounds: { width: 320, height: 240 }
    });
    const movedRects = items.map((item) => {
      const delta = deltas.get(item.id) ?? { x: 0, y: 0 };
      return {
        left: item.rect.left + delta.x,
        right: item.rect.right + delta.x,
        top: item.rect.top + delta.y,
        bottom: item.rect.bottom + delta.y
      };
    });
    const overlaps = (first: typeof fixedRect, second: typeof fixedRect) =>
      Math.min(first.right, second.right) - Math.max(first.left, second.left) > 0 &&
      Math.min(first.bottom, second.bottom) - Math.max(first.top, second.top) > 0;

    expect(overlaps(movedRects[0], fixedRect)).toBe(false);
    expect(overlaps(movedRects[1], fixedRect)).toBe(false);
    expect(overlaps(movedRects[0], movedRects[1])).toBe(false);
    for (const rect of movedRects) {
      expect(rect.left).toBeGreaterThanOrEqual(4);
      expect(rect.top).toBeGreaterThanOrEqual(4);
      expect(rect.right).toBeLessThanOrEqual(316);
      expect(rect.bottom).toBeLessThanOrEqual(236);
    }
  });

  test("支持对齐方向、空选择和已对齐的平凡分支", () => {
    const first = createDefaultNode("ac-load", { x: 110, y: 120 });
    const second = createDefaultNode("ac-load", { x: 300, y: 260 });
    const nodes = [first, second];
    const units = buildCanvasLayoutUnits([], nodes, nodes.map((node) => node.id), []);

    expect(alignNodeLayoutUnits(nodes, [], "left")).toBe(nodes);
    for (const direction of ["left", "right", "top", "bottom", "horizontal", "vertical"] as const) {
      const aligned = alignNodeLayoutUnits(nodes, units, direction);
      expect(aligned).not.toBe(nodes);
    }
    const horizontal = alignNodeLayoutUnits(nodes, units, "horizontal");
    expect(horizontal[0].position.y).toBe(horizontal[1].position.y);
    const vertical = alignNodeLayoutUnits(nodes, units, "vertical");
    expect(vertical[0].position.x).toBe(vertical[1].position.x);
    const sameNodes = [createDefaultNode("ac-load", { x: 100, y: 100 })];
    expect(alignNodeLayoutUnits(sameNodes, buildCanvasLayoutUnits([], sameNodes, [sameNodes[0].id], []), "left")).toBe(sameNodes);
  });

  test("auto-align 对空、单元不足或无效间距直接保留原数组", () => {
    const node = createDefaultNode("ac-load", { x: 110, y: 120 });
    const nodes = [node];
    const unit = buildCanvasLayoutUnits([], nodes, [node.id], []);
    expect(autoAlignNodeLayoutUnits(nodes, [], 50)).toBe(nodes);
    expect(autoAlignNodeLayoutUnits(nodes, unit, 0)).toBe(nodes);
    expect(autoAlignNodeLayoutUnits(nodes, unit, -50)).toBe(nodes);
  });

  test("auto-align 线路候选可覆盖预算耗尽、无效候选和回退分支", () => {
    const first = createDefaultNode("ac-load", { x: 112, y: 120 });
    const second = createDefaultNode("ac-load", { x: 400, y: 200 });
    const isolated = createDefaultNode("ac-source", { x: 700, y: 400 });
    const edge: Edge = {
      id: "edge-budget",
      sourceId: first.id,
      targetId: second.id,
      sourceTerminalId: first.terminals[0].id,
      targetTerminalId: second.terminals[0].id
    };
    const nodes = [first, second, isolated];
    const units = buildCanvasLayoutUnits([], nodes, [first.id, isolated.id], []);
    const report = createAutoAlignQualityReport();
    const routeEdges = (stateNodes: readonly ModelNode[], edgeList: readonly Edge[]): RoutedEdge[] => {
      const startedAt = Date.now();
      while (Date.now() - startedAt < 2) {
        // 让质量预算分支在测试中稳定耗尽。
      }
      return autoAlignPreviewRoutes(stateNodes, edgeList);
    };
    const degraded = autoAlignNodeLayoutUnits(nodes, units, 50, {
      edges: [edge],
      routeEdges,
      timeBudgetMs: -1,
      report
    });
    expect(degraded).not.toBe(nodes);
    expect(report.degraded).toBe(true);
    expect(report.frozenUnitCount).toBeGreaterThan(0);

    const blockedUnits = [
      units[0],
      {
        ...units[1],
        collisionRects: [{ left: -1000, right: 1000, top: -1000, bottom: 1000 }]
      }
    ];
    const blockedReport = createAutoAlignQualityReport();
    const blocked = autoAlignNodeLayoutUnits(nodes, blockedUnits, 50, { edges: [edge], routeEdges, report: blockedReport });
    expect(blocked.find((node) => node.id === isolated.id)?.position).toEqual(isolated.position);
  });

  test("auto-align 终检发现恶化时撤回并清理存档线路结果", () => {
    const first = createDefaultNode("ac-load", { x: 112, y: 120 });
    const second = createDefaultNode("ac-load", { x: 400, y: 200 });
    const edge: Edge = {
      id: "edge-verify",
      sourceId: first.id,
      targetId: second.id,
      sourceTerminalId: first.terminals[0].id,
      targetTerminalId: second.terminals[0].id
    };
    const nodes = [first, second];
    const units = buildCanvasLayoutUnits([], nodes, nodes.map((node) => node.id), []);
    const storedRouteDrops: { edgeId: string; points: readonly { x: number; y: number }[] }[] = [];
    const verifyRouteEdges = (stateNodes: readonly ModelNode[], edgeList: readonly Edge[]) => {
      const moved = stateNodes.some((node) => node.position.x !== 112 && node.position.x !== 400);
      return edgeList.map((item) => ({
        edgeId: item.id,
        points: moved
          ? [{ x: 0, y: 0 }, { x: 50, y: 0 }, { x: 50, y: 50 }, { x: 100, y: 50 }]
          : [{ x: 0, y: 0 }, { x: 100, y: 0 }],
        path: ""
      }));
    };
    const result = autoAlignNodeLayoutUnits(nodes, units, 50, {
      edges: [edge],
      routeEdges: autoAlignPreviewRoutes,
      verifyRouteEdges,
      storedRouteDrops,
      report: createAutoAlignQualityReport()
    });
    expect(result).toEqual(nodes);
    expect(storedRouteDrops).toEqual([]);
  });

  test("auto-aligns device centers to distinct grid intersections without overlap", () => {
    const first = createDefaultNode("ac-source", { x: 112, y: 113 });
    const second = createDefaultNode("ac-load", { x: 118, y: 119 });
    const third = createDefaultNode("dc-load", { x: 171, y: 121 });
    const fourth = createDefaultNode("dc-source", { x: 224, y: 178 });
    const nodes = [first, second, third, fourth];
    const units = buildCanvasLayoutUnits([], nodes, nodes.map((node) => node.id), []);

    const aligned = autoAlignNodeLayoutUnits(nodes, units, 50);
    const centerKeys = aligned.map((node) => `${node.position.x},${node.position.y}`);
    expect(new Set(centerKeys).size).toBe(aligned.length);
    for (const node of aligned) {
      expect(node.position.x % 50).toBe(0);
      expect(node.position.y % 50).toBe(0);
    }

    const visualBounds = aligned.map((node) => calculateNodeVisualBounds(node));
    for (let firstIndex = 0; firstIndex < visualBounds.length; firstIndex += 1) {
      for (let secondIndex = firstIndex + 1; secondIndex < visualBounds.length; secondIndex += 1) {
        const firstBounds = visualBounds[firstIndex];
        const secondBounds = visualBounds[secondIndex];
        const overlaps =
          Math.min(firstBounds.right, secondBounds.right) - Math.max(firstBounds.left, secondBounds.left) > 0 &&
          Math.min(firstBounds.bottom, secondBounds.bottom) - Math.max(firstBounds.top, secondBounds.top) > 0;
        expect(overlaps).toBe(false);
      }
    }
  });

  test("spreads a dense auto-align cluster across nearby unoccupied grid intersections", () => {
    const nodes = Array.from({ length: 16 }, (_, index) => createDefaultNode(
      index % 2 === 0 ? "ac-source" : "ac-load",
      { x: 111 + index % 4 * 3, y: 112 + Math.floor(index / 4) * 3 }
    ));
    const units = buildCanvasLayoutUnits([], nodes, nodes.map((node) => node.id), []);

    const aligned = autoAlignNodeLayoutUnits(nodes, units, 50);
    expect(new Set(aligned.map((node) => `${node.position.x},${node.position.y}`)).size).toBe(aligned.length);
    expect(aligned.every((node) => node.position.x % 50 === 0 && node.position.y % 50 === 0)).toBe(true);

    const visualBounds = aligned.map((node) => calculateNodeVisualBounds(node));
    for (let firstIndex = 0; firstIndex < visualBounds.length; firstIndex += 1) {
      for (let secondIndex = firstIndex + 1; secondIndex < visualBounds.length; secondIndex += 1) {
        const firstBounds = visualBounds[firstIndex];
        const secondBounds = visualBounds[secondIndex];
        expect(
          Math.min(firstBounds.right, secondBounds.right) - Math.max(firstBounds.left, secondBounds.left) > 0 &&
          Math.min(firstBounds.bottom, secondBounds.bottom) - Math.max(firstBounds.top, secondBounds.top) > 0
        ).toBe(false);
      }
    }
  });

  test("includes grouped connection line geometry in the layout unit bounds", () => {
    const firstGrouped = createDefaultNode("ac-load", { x: 420, y: 220 });
    const secondGrouped = createDefaultNode("ac-source", { x: 540, y: 220 });
    const edge: Edge = {
      id: "edge-group-wide",
      sourceId: firstGrouped.id,
      targetId: secondGrouped.id,
      sourceTerminalId: "t1",
      targetTerminalId: "t1",
      sourcePoint: { x: 420, y: 220 },
      manualPoints: [
        { x: 420, y: 40 },
        { x: 720, y: 40 },
        { x: 720, y: 220 }
      ],
      targetPoint: { x: 540, y: 220 }
    };
    const groups: ModelGroup[] = [{
      id: "group-with-edge",
      name: "组合1",
      nodeIds: [firstGrouped.id, secondGrouped.id],
      edgeIds: [edge.id]
    }];

    const units = buildCanvasLayoutUnits(groups, [firstGrouped, secondGrouped], [firstGrouped.id], [], [edge]);

    expect(units).toHaveLength(1);
    expect(units[0].kind).toBe("group");
    expect(units[0].edgeIds).toEqual([edge.id]);
    expect(units[0].bounds.top).toBe(36);
    expect(units[0].bounds.right).toBe(724);
  });

  test("uses rendered internal connection routes and padding for grouped layout bounds", () => {
    const firstBase = createDefaultNode("ac-load", { x: 420, y: 220 });
    const secondBase = createDefaultNode("ac-source", { x: 540, y: 220 });
    const firstGrouped = { ...firstBase, params: { ...firstBase.params, _labelVisible: "0" } };
    const secondGrouped = { ...secondBase, params: { ...secondBase.params, _labelVisible: "0" } };
    const edge: Edge = {
      id: "edge-group-routed",
      sourceId: firstGrouped.id,
      targetId: secondGrouped.id,
      sourceTerminalId: "t1",
      targetTerminalId: "t1"
    };
    const groups: ModelGroup[] = [{
      id: "group-with-routed-edge",
      name: "组合1",
      nodeIds: [firstGrouped.id, secondGrouped.id],
      edgeIds: []
    }];
    const routedEdges = [{
      edgeId: edge.id,
      points: [
        { x: 420, y: 220 },
        { x: 420, y: 40 },
        { x: 720, y: 40 },
        { x: 720, y: 220 },
        { x: 540, y: 220 }
      ],
      path: ""
    }];

    const units = buildCanvasLayoutUnits(groups, [firstGrouped, secondGrouped], [firstGrouped.id], [], [edge], routedEdges);
    const routeBounds = {
      left: Math.min(...routedEdges[0].points.map((point) => point.x)),
      top: Math.min(...routedEdges[0].points.map((point) => point.y)),
      right: Math.max(...routedEdges[0].points.map((point) => point.x)),
      bottom: Math.max(...routedEdges[0].points.map((point) => point.y))
    };
    const boxes = [calculateNodeVisualBounds(firstGrouped), calculateNodeVisualBounds(secondGrouped), routeBounds];
    const expectedBounds = {
      left: Math.min(...boxes.map((box) => box.left)) - 4,
      top: Math.min(...boxes.map((box) => box.top)) - 4,
      right: Math.max(...boxes.map((box) => box.right)) + 4,
      bottom: Math.max(...boxes.map((box) => box.bottom)) + 4
    };

    expect(units).toHaveLength(1);
    expect(units[0].edgeIds).toEqual([edge.id]);
    expect(units[0].bounds).toEqual(expectedBounds);
  });
});

// ─── 剪贴板副本剥离:副本不继承归属,容器副本不携带失效绑定 ─────────────────
// 整节点 spread 会把 containerId / bound_device_id 一起带走:粘贴后归属指向不存在的容器、
// 绑定指向副本里已换 id 的设备(跨模型粘贴更是必然悬空)。
describe("剪贴板副本剥离容器归属", () => {
  test("副本清空 containerId;容器副本清 bound_device_id 且 is_gateway 置 0;原图不受影响", () => {
    const member = { ...createDefaultNode("ac-load", { x: 0, y: 0 }), id: "m1", containerId: "c1" };
    const plainNode = { ...createDefaultNode("ac-breaker", { x: 0, y: 0 }), id: "b1" };
    const container = {
      ...createDefaultNode("ac-vpp-box", { x: 0, y: 0 }),
      id: "c1",
      params: { is_gateway: "1", bound_device_id: "m1" }
    };
    const clip = buildCanvasClipboard([member, plainNode, container], [], [], ["m1", "b1", "c1"], []);
    const copiedMember = clip.nodes.find((node) => node.id === "m1")!;
    const copiedPlain = clip.nodes.find((node) => node.id === "b1")!;
    const copiedContainer = clip.nodes.find((node) => node.id === "c1")!;

    expect(copiedMember.containerId).toBeUndefined();
    expect(copiedContainer.params.bound_device_id).toBeUndefined();
    expect(copiedContainer.params.is_gateway).toBe("0");
    // 非容器副本的参数原样
    expect(copiedPlain.params).toEqual(plainNode.params);
    // 剥离只发生在副本上,原图字段不动
    expect(member.containerId).toBe("c1");
    expect(container.params.bound_device_id).toBe("m1");
    expect(container.params.is_gateway).toBe("1");
  });

  test("非容器节点副本保留自有参数(is_gateway 不被误改写)", () => {
    const device = {
      ...createDefaultNode("ac-breaker", { x: 0, y: 0 }),
      id: "b2",
      params: { is_gateway: "1", bound_device_id: "m9" }
    };
    const clip = buildCanvasClipboard([device], [], [], ["b2"], []);
    expect(clip.nodes[0].params).toEqual({ is_gateway: "1", bound_device_id: "m9" });
  });

  // 存量已持久化模板的剪贴板 JSON 早于本功能落库,构建期剥离对它无效 —— 克隆出口是最后一关
  test("克隆出口同样剥离:直接构造的剪贴板(存量模板)落到图上也干净", () => {
    const clipboard = {
      nodes: [
        { ...createDefaultNode("ac-load", { x: 0, y: 0 }), id: "m1", containerId: "c1" },
        { ...createDefaultNode("ac-vpp-box", { x: 0, y: 0 }), id: "c1", params: { is_gateway: "1", bound_device_id: "m1" } }
      ],
      edges: [],
      groups: []
    } as any;
    let seq = 0;
    const cloned = cloneCanvasClipboard(clipboard, { x: 0, y: 0 }, () => `clone-${++seq}`, () => "edge-1");

    const member = cloned.nodes.find((node) => node.kind === "ac-load")!;
    const container = cloned.nodes.find((node) => node.kind === "ac-vpp-box")!;
    expect(member.containerId).toBeUndefined();
    expect(container.params.bound_device_id).toBeUndefined();
    expect(container.params.is_gateway).toBe("0");
    // 原剪贴板(存量模板内容)不被改写:模板可反复使用
    expect(clipboard.nodes[0].containerId).toBe("c1");
  });
});

// ─── 容器整组参与布局(用户裁决) ──────────────────────────────────────────
// 对齐/分布选中容器 → 容器作为整体参与(容器与成员相对位置不变);
// 自动对齐/散开的阶段2 同理。容器内自布局(阶段1)对每个容器单独跑一次成员布局。
describe("容器整组参与布局", () => {
  const container = (id: string, x: number, y: number) => ({
    ...createDefaultNode("ac-vpp-box", { x: 0, y: 0 }),
    id,
    position: { x, y },
    size: { width: 200, height: 200 }
  });
  const member = (id: string, containerId: string, x: number, y: number) => ({
    ...createDefaultNode("ac-load", { x: 0, y: 0 }),
    id,
    position: { x, y },
    containerId
  });
  const plain = (id: string, x: number, y: number) => ({
    ...createDefaultNode("ac-load", { x: 0, y: 0 }),
    id,
    position: { x, y }
  });

  test("mergeContainerLayoutUnits:容器与其成员合并成一个整组单元,成员单元不再独立出现", () => {
    const nodes = [container("c1", 0, 0), member("m1", "c1", 40, 40), member("m2", "c1", -40, 40), plain("o1", 900, 900)];
    const units = buildCanvasLayoutUnits([], nodes, ["c1", "m1", "m2", "o1"], [], [], []);
    const merged = mergeContainerLayoutUnits(nodes, units);

    const group = merged.find((unit) => unit.id === "container:c1")!;
    expect([...group.nodeIds].sort()).toEqual(["c1", "m1", "m2"]);
    expect(merged.some((unit) => unit.id === "node:m1")).toBe(false);
    expect(merged.some((unit) => unit.id === "node:c1")).toBe(false);
    expect(merged.some((unit) => unit.id === "node:o1")).toBe(true);
    // 整组包围盒覆盖容器与全部成员
    for (const node of nodes.filter((candidate) => candidate.id !== "o1")) {
      expect(group.bounds.left).toBeLessThanOrEqual(node.position.x);
      expect(group.bounds.right).toBeGreaterThanOrEqual(node.position.x);
      expect(group.bounds.top).toBeLessThanOrEqual(node.position.y);
      expect(group.bounds.bottom).toBeGreaterThanOrEqual(node.position.y);
    }
  });

  test("mergeContainerLayoutUnits:只选中容器时成员照样并入(整组平移,成员不被落下)", () => {
    const nodes = [container("c1", 0, 0), member("m1", "c1", 40, 40), member("m2", "c1", -40, 40)];
    const units = buildCanvasLayoutUnits([], nodes, ["c1"], [], [], []);
    const merged = mergeContainerLayoutUnits(nodes, units);

    expect(merged).toHaveLength(1);
    expect([...merged[0].nodeIds].sort()).toEqual(["c1", "m1", "m2"]);
  });

  test("mergeContainerLayoutUnits:无容器参与时原样返回;已归属别处的成员不受影响", () => {
    const nodes = [container("c1", 0, 0), member("m1", "c1", 40, 40), plain("o1", 900, 900), plain("o2", 960, 900)];
    const units = buildCanvasLayoutUnits([], nodes, ["o1", "o2"], [], [], []);
    expect(mergeContainerLayoutUnits(nodes, units)).toEqual(units);
  });

  test("arrangeContainerInteriors:每个容器单独跑一次成员布局(单元只含该容器成员)", () => {
    const nodes = [
      container("c1", 0, 0),
      member("m1", "c1", 40, 40),
      member("m2", "c1", 80, 40),
      container("c2", 1000, 0),
      member("n1", "c2", 1040, 40),
      member("n2", "c2", 1080, 40),
      plain("o1", 900, 900)
    ];
    const seen: string[][] = [];
    const shifted = arrangeContainerInteriors(nodes, (currentNodes, units) => {
      seen.push(units.flatMap((unit) => unit.nodeIds));
      const movedIds = new Set(units.flatMap((unit) => unit.nodeIds));
      return currentNodes.map((node) =>
        movedIds.has(node.id) ? { ...node, position: { x: node.position.x + 10, y: node.position.y } } : node
      );
    });

    expect(seen).toHaveLength(2);
    expect([...seen[0]].sort()).toEqual(["m1", "m2"]);
    expect([...seen[1]].sort()).toEqual(["n1", "n2"]);
    const byId = new Map(shifted.map((node) => [node.id, node]));
    // 每个成员各被自己的容器推一次(跨容器不串味),容器自身与散装节点不动
    expect(byId.get("m1")!.position).toEqual({ x: 50, y: 40 });
    expect(byId.get("n1")!.position).toEqual({ x: 1050, y: 40 });
    expect(byId.get("c1")!.position).toEqual({ x: 0, y: 0 });
    expect(byId.get("o1")!.position).toEqual({ x: 900, y: 900 });
  });

  test("mergeContainerLayoutUnits:混装组合里的散装节点补成独立单元,不被静默丢弃", () => {
    // 「画布组合」单元可同时装容器、容器成员与散装节点:合并时只吐整组单元会把散装节点无声抹掉
    const nodes = [container("c1", 525, 400), member("m1", "c1", 500, 400), plain("o1", 900, 900)];
    const rect = (left: number, right: number, top: number, bottom: number) => ({ left, right, top, bottom });
    const groupUnit: CanvasLayoutUnit = {
      id: "group:g1",
      kind: "group",
      nodeIds: ["c1", "m1", "o1"],
      edgeIds: [],
      bounds: rect(400, 1000, 300, 1000),
      layoutBounds: rect(400, 1000, 300, 1000),
      collisionRects: [rect(425, 625, 300, 500), rect(480, 520, 385, 415), rect(880, 920, 885, 915)]
    };
    const merged = mergeContainerLayoutUnits(nodes, [groupUnit]);

    const group = merged.find((unit) => unit.id === "container:c1")!;
    expect([...group.nodeIds].sort()).toEqual(["c1", "m1"]);
    const rest = merged.find((unit) => unit.nodeIds.includes("o1"))!;
    expect(rest.nodeIds).toEqual(["o1"]);
    expect(rest.bounds).toEqual(calculateNodeVisualBounds(nodes[2]));
  });

  test("mergeContainerLayoutUnits:线路设备成员不吸入整组(可移动性谓词与 buildCanvasLayoutUnits 同源)", () => {
    const line = {
      ...createDefaultNode("ac-routable-line", { x: 0, y: 0 }),
      id: "l1",
      position: { x: 500, y: 400 },
      containerId: "c1"
    };
    expect(isCanvasNodeMovable(line.kind)).toBe(false); // 前提:线路设备不可作布局单元
    const nodes = [container("c1", 525, 400), member("m1", "c1", 500, 400), line];
    const units = buildCanvasLayoutUnits([], nodes, ["c1", "m1"], [], [], []);
    const merged = mergeContainerLayoutUnits(nodes, units);

    expect([...merged.find((unit) => unit.id === "container:c1")!.nodeIds]).toEqual(["c1", "m1"]);
  });

  test("arrangeContainerInteriors:只处理作用域内的容器(别层容器不被动)", () => {
    const nodes = [
      container("c1", 525, 400),
      member("m1", "c1", 500, 400),
      member("m2", "c1", 600, 400),
      container("c2", 1500, 400),
      member("n1", "c2", 1480, 400),
      member("n2", "c2", 1560, 400)
    ];
    const seen: string[][] = [];
    arrangeContainerInteriors(
      nodes,
      (currentNodes, units) => {
        seen.push(units.flatMap((unit) => unit.nodeIds));
        return currentNodes;
      },
      ["c1", "m1", "m2"]
    );

    expect(seen).toHaveLength(1);
    expect([...seen[0]].sort()).toEqual(["m1", "m2"]);
  });

  test("arrangeContainerInteriors:成员不足 2 个的容器跳过(无可布局内容)", () => {
    const nodes = [container("c1", 0, 0), member("m1", "c1", 40, 40), container("c2", 1000, 0)];
    let calls = 0;
    arrangeContainerInteriors(nodes, (currentNodes) => {
      calls += 1;
      return currentNodes;
    });
    expect(calls).toBe(0);
  });
});

describe("auto-align line quality constraints", () => {
  const positionOf = (nodes: readonly ModelNode[], nodeId: string) => {
    const node = nodes.find((item) => item.id === nodeId);
    if (!node) {
      throw new Error(`missing node ${nodeId}`);
    }
    return node.position;
  };

  const connect = (source: ModelNode, target: ModelNode, id: string): Edge => ({
    id,
    sourceId: source.id,
    targetId: target.id,
    sourceTerminalId: source.terminals[0].id,
    targetTerminalId: target.terminals[0].id
  });

  /**
   * 测试用假路由器:端点对齐(共 x / 共 y)时直连(0 拐点),否则走一个拐点的 L 形。
   * 用它代替真实路由器,把「对齐 → 无拐点」这条因果链固定下来,便于断言约束行为。
   */
  const fakeRouteEdges = (stateNodes: readonly ModelNode[], edgeList: readonly Edge[]): RoutedEdge[] => {
    const byId = new Map(stateNodes.map((node) => [node.id, node]));
    return edgeList.flatMap((edge) => {
      const source = byId.get(edge.sourceId);
      const target = byId.get(edge.targetId);
      if (!source || !target) {
        return [];
      }
      const start = getEdgeEndpointPoint(source, edge.sourcePoint, edge.sourceTerminalId);
      const end = getEdgeEndpointPoint(target, edge.targetPoint, edge.targetTerminalId);
      const points = start.x === end.x || start.y === end.y ? [start, end] : [start, { x: start.x, y: end.y }, end];
      return [{ edgeId: edge.id, points, path: "" }];
    });
  };

  test("counts route bends and only counts strict crossings", () => {
    expect(countAutoAlignRouteBends([{ x: 0, y: 0 }])).toBe(0);
    expect(countAutoAlignRouteBends([{ x: 0, y: 0 }, { x: 100, y: 0 }])).toBe(0);
    expect(countAutoAlignRouteBends([{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 50 }])).toBe(1);
    expect(countAutoAlignRouteBends([{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 50 }, { x: 200, y: 50 }])).toBe(2);
    expect(countAutoAlignRouteBends([{ x: 0, y: 0 }, { x: 100, y: 50 }])).toBe(0);
    // 共用端点的 T 型相接不是交叉
    expect(countAutoAlignRouteCrossings([
      [{ x: 0, y: 0 }, { x: 100, y: 0 }],
      [{ x: 50, y: 0 }, { x: 50, y: 80 }]
    ])).toBe(0);
    // 共线重叠也不是交叉
    expect(countAutoAlignRouteCrossings([
      [{ x: 0, y: 0 }, { x: 100, y: 0 }],
      [{ x: 20, y: 0 }, { x: 80, y: 0 }]
    ])).toBe(0);
    expect(countAutoAlignRouteCrossings([
      [{ x: 0, y: 0 }, { x: 100, y: 0 }],
      [{ x: 50, y: -20 }, { x: 50, y: 80 }]
    ])).toBe(1);
    expect(countAutoAlignRouteCrossings([])).toBe(0);
    expect(countAutoAlignRouteCrossings([[{ x: 0, y: 0 }], [{ x: 1, y: 1 }]])).toBe(0);
  });

  test("维护线路质量索引并支持重复、退化、替换和删除", () => {
    const straight: RoutedEdge = { edgeId: "straight", points: [{ x: 0, y: 0 }, { x: 100, y: 0 }], path: "" };
    const bent: RoutedEdge = {
      edgeId: "bent",
      points: [{ x: 0, y: 10 }, { x: 50, y: 10 }, { x: 50, y: 60 }],
      path: ""
    };
    const degenerate: RoutedEdge = { edgeId: "degenerate", points: [{ x: 3, y: 3 }], path: "" };
    const index = createAutoAlignRouteQualityIndex([straight, bent, degenerate]);

    expect(index.quality()).toEqual({ bends: 1, crossings: 0 });
    expect(index.routes()).toEqual([straight, bent, degenerate]);
    index.replace({ ...straight, points: [{ x: 0, y: 0 }, { x: 0, y: 40 }, { x: 80, y: 40 }], path: "" });
    expect(index.quality()).toEqual({ bends: 2, crossings: 1 });
    index.replace({ ...bent, points: [{ x: 0, y: 10 }, { x: 50, y: 10 }], path: "" });
    expect(index.quality()).toEqual({ bends: 1, crossings: 0 });
    index.remove("missing");
    index.remove("degenerate");
    expect(index.routes().map((route) => route.edgeId)).toEqual(["straight", "bent"]);
    index.remove("straight");
    expect(index.routes().map((route) => route.edgeId)).toEqual(["bent"]);
  });

  test("snaps an off-grid pair onto one shared grid line so the straight connection stays straight", () => {
    const first = createDefaultNode("ac-load", { x: 110, y: 120 });
    const second = createDefaultNode("ac-load", { x: 300, y: 120 });
    const nodes = [first, second];
    const edge = connect(first, second, "edge-straight-pair");
    const units = buildCanvasLayoutUnits([], nodes, nodes.map((node) => node.id), []);
    const originalRoutes = fakeRouteEdges(nodes, [edge]);
    expect(countAutoAlignRouteBends(originalRoutes[0].points)).toBe(0);

    const aligned = autoAlignNodeLayoutUnits(nodes, units, 50, { edges: [edge], routeEdges: fakeRouteEdges });
    const nextFirst = positionOf(aligned, first.id);
    const nextSecond = positionOf(aligned, second.id);

    expect(nextFirst.y).toBe(nextSecond.y);
    expect(nextFirst.y % 50).toBe(0);
    expect(nextFirst.x % 50).toBe(0);
    const alignedRoutes = fakeRouteEdges(aligned, [edge]);
    expect(countAutoAlignRouteBends(alignedRoutes[0].points)).toBe(0);
  });

  test("freezes a unit when every grid candidate would bend a straight connection to a fixed partner", () => {
    const moving = createDefaultNode("ac-load", { x: 110, y: 120 });
    const fixedPartner = createDefaultNode("ac-load", { x: 300, y: 120 });
    const isolated = createDefaultNode("ac-source", { x: 500, y: 400 });
    const nodes = [moving, fixedPartner, isolated];
    const edge = connect(moving, fixedPartner, "edge-frozen-unit");
    // 只把 moving 与 isolated 纳入对齐范围:fixedPartner 不在范围内,位置不会变
    const units = buildCanvasLayoutUnits([], nodes, [moving.id, isolated.id], []);

    const aligned = autoAlignNodeLayoutUnits(nodes, units, 50, { edges: [edge], routeEdges: fakeRouteEdges });

    // 任何网格候选都会把原本对齐的连线掰弯 → 该单元原地保留(约束优先于网格)
    expect(positionOf(aligned, moving.id)).toEqual({ x: 110, y: 120 });
    expect(positionOf(aligned, fixedPartner.id)).toEqual({ x: 300, y: 120 });
    // 无线路的孤立图元不受影响,照常吸附到网格
    expect(positionOf(aligned, isolated.id).x % 50).toBe(0);
    expect(positionOf(aligned, isolated.id).y % 50).toBe(0);
    const routes = fakeRouteEdges(aligned, [edge]);
    expect(countAutoAlignRouteBends(routes[0].points)).toBe(0);
  });

  test("rejects a grid candidate that would add a line crossing", () => {
    const moving = createDefaultNode("ac-load", { x: 112, y: 120 });
    const partner = createDefaultNode("ac-load", { x: 400, y: 200 });
    const isolated = createDefaultNode("ac-source", { x: 700, y: 400 });
    const nodes = [moving, partner, isolated];
    const edge = connect(moving, partner, "edge-crossing-candidate");
    const units = buildCanvasLayoutUnits([], nodes, [moving.id, isolated.id], []);
    const sourcePort = getEdgeEndpointPoint(moving, undefined, moving.terminals[0].id);
    // 已渲染的竖线落在「源端口左移 5px」:向左侧吸附(最近网格点)会把 L 形水平段拉长并穿过它
    const otherRoute: RoutedEdge = {
      edgeId: "edge-other",
      points: [{ x: sourcePort.x - 5, y: -400 }, { x: sourcePort.x - 5, y: 400 }],
      path: ""
    };

    const aligned = autoAlignNodeLayoutUnits(nodes, units, 50, {
      edges: [edge],
      routedEdges: [otherRoute],
      routeEdges: fakeRouteEdges
    });

    const routes = fakeRouteEdges(aligned, [edge]);
    expect(countAutoAlignRouteCrossings([otherRoute.points, routes[0].points])).toBe(0);
    // 最近的网格点(x=100)会新增交叉被否决,改选不会新增交叉的候选
    expect(positionOf(aligned, moving.id).x).toBeGreaterThan(moving.position.x);
  });

  test("reports frozen units so the caller can explain skipped grid snapping", () => {
    const moving = createDefaultNode("ac-load", { x: 110, y: 120 });
    const fixedPartner = createDefaultNode("ac-load", { x: 300, y: 120 });
    const isolated = createDefaultNode("ac-source", { x: 500, y: 400 });
    const nodes = [moving, fixedPartner, isolated];
    const edge = connect(moving, fixedPartner, "edge-report");
    const units = buildCanvasLayoutUnits([], nodes, [moving.id, isolated.id], []);
    const report = createAutoAlignQualityReport();

    autoAlignNodeLayoutUnits(nodes, units, 50, { edges: [edge], routeEdges: fakeRouteEdges, report });

    expect(report.frozenUnitCount).toBe(1);
    // 所有候选都因为「会把原本对齐的连线掰弯」被否决(约束一优先于网格)
    expect(report.bendRejectedCount).toBeGreaterThan(0);
    expect(report.degraded).toBe(false);
    expect(report.revertedByVerification).toBe(false);
  });
});

// distributeNodeLayoutUnits 把首尾单元钉住、其余等距铺开。
// 它是「等分」而不是「对齐」的对偶面：两端不动，中间按 (end-start)/(n-1) 补齐。
describe("distributeNodeLayoutUnits", () => {
  const centerOf = (nodes: readonly ModelNode[], nodeId: string, axis: "x" | "y") => {
    const unit = buildCanvasLayoutUnits([], nodes, [nodeId], [])[0];
    const bounds = unit.layoutBounds ?? unit.bounds;
    return axis === "x" ? (bounds.left + bounds.right) / 2 : (bounds.top + bounds.bottom) / 2;
  };
  const centersOf = (nodes: readonly ModelNode[], axis: "x" | "y") =>
    nodes.map((node) => centerOf(nodes, node.id, axis));

  const threeAt = (points: readonly { x: number; y: number }[]) =>
    points.map((position) => createDefaultNode("ac-load", position));

  test("横向分布：首尾不动，中间补到等距", () => {
    const nodes = threeAt([{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 500, y: 0 }]);
    const units = buildCanvasLayoutUnits([], nodes, nodes.map((node) => node.id), []);

    const spread = distributeNodeLayoutUnits(nodes, units, "horizontal");

    expect(centersOf(spread, "x")).toEqual([0, 250, 500]);
    // 只动 x：y 一个都不许动
    expect(centersOf(spread, "y")).toEqual([0, 0, 0]);
  });

  test("纵向分布：动 y 不动 x（方向名与 alignNodeLayoutUnits 相反，勿混）", () => {
    // alignNodeLayoutUnits 的 "horizontal" 指「横向对齐」= 统一 y；这里 "horizontal" 是「沿 x 铺开」。
    // 名字相同语义不同，钉住以免调用侧按对齐的直觉传错方向。
    const nodes = threeAt([{ x: 0, y: 0 }, { x: 0, y: 100 }, { x: 0, y: 500 }]);
    const units = buildCanvasLayoutUnits([], nodes, nodes.map((node) => node.id), []);

    const spread = distributeNodeLayoutUnits(nodes, units, "vertical");

    expect(centersOf(spread, "y")).toEqual([0, 250, 500]);
    expect(centersOf(spread, "x")).toEqual([0, 0, 0]);
  });

  test("目标位落在整数网格上，半值向 +∞", () => {
    // 0 → 101 分三份，步长 50.5；中间落点取整成 51（不是 50，也不是浮点 50.5）
    // 变异实测：把 distribute 里的 Math.round 去掉，这一条**一样绿** ——
    // moveNodesByUnitDeltas 落地时又对 position 做了一次 Math.round，两次取整在这里等价。
    // 所以这条钉的是「落点必为整数、半值向 +∞」这个对外契约，而不是某一行的实现细节。
    const nodes = threeAt([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 101, y: 0 }]);
    const units = buildCanvasLayoutUnits([], nodes, nodes.map((node) => node.id), []);

    expect(centersOf(distributeNodeLayoutUnits(nodes, units, "horizontal"), "x")).toEqual([0, 51, 101]);
  });

  test("不足三个单元原样返回同一个数组", () => {
    const nodes = threeAt([{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 500, y: 0 }]);
    const units = buildCanvasLayoutUnits([], nodes, nodes.map((node) => node.id), []);

    expect(distributeNodeLayoutUnits(nodes, units.slice(0, 2), "horizontal")).toBe(nodes);
    expect(distributeNodeLayoutUnits(nodes, units.slice(0, 0), "horizontal")).toBe(nodes);
  });

  test("首尾中心重合时原样返回（等距无从谈起）", () => {
    const nodes = threeAt([{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }]);
    const units = buildCanvasLayoutUnits([], nodes, nodes.map((node) => node.id), []);

    expect(distributeNodeLayoutUnits(nodes, units, "horizontal")).toBe(nodes);
  });

  test("只搬 units 里的节点，其余节点原地不动", () => {
    const nodes = threeAt([{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 500, y: 0 }]);
    const bystander = createDefaultNode("ac-source", { x: 900, y: 900 });
    const all = [...nodes, bystander];
    const units = buildCanvasLayoutUnits([], all, nodes.map((node) => node.id), []);

    const spread = distributeNodeLayoutUnits(all, units, "horizontal");

    expect(centersOf(spread, "x")).toEqual([0, 250, 500, 900]);
  });

  // 两处变异实测与本文件无关、源码自身不可观测（不是「没测到」，是「测不到」）：
  // 1. 把 `units.length < 3` 放宽成 `< 2`：两个单元时步长 = end - start，两端位移恰好都为 0，
  //    moveNodesByUnitDeltas 提前原样返回 —— 结果完全一致。
  // 2. 把排序比较器反号：start/end 随之对调，目标是 start + step*index 这一族，
  //    反序算出来的落点集合与正序相同（每个单元都落在首尾连线上等距的那个点）。
});

// autoAlignPreviewRoutes 是候选判定用的纯几何代理：一个端口对齐就直连，否则先横后竖一个拐点。
// 它的拐点方向与 renderToStaticMarkup 那套测试假路由（先竖后横）相反，
// 但两者拐点数相同，所以只影响「相对好坏」的判定口径，不影响拐点计数。
describe("autoAlignPreviewRoutes", () => {
  const connect = (source: ModelNode, target: ModelNode, id: string): Edge => ({
    id,
    sourceId: source.id,
    targetId: target.id,
    sourceTerminalId: source.terminals[0].id,
    targetTerminalId: target.terminals[0].id
  });

  test("两端端口共 y 时直连（两点，无拐点）", () => {
    const source = createDefaultNode("ac-load", { x: 0, y: 0 });
    const target = createDefaultNode("ac-load", { x: 200, y: 0 });
    const routes = autoAlignPreviewRoutes([source, target], [connect(source, target, "e-straight")]);

    expect(routes).toHaveLength(1);
    expect(routes[0].points).toHaveLength(2);
    expect(routes[0].points[0].y).toBe(routes[0].points[1].y);
    expect(routes[0].edgeId).toBe("e-straight");
  });

  test("共 x 时同样直连", () => {
    const source = createDefaultNode("ac-load", { x: 0, y: 0 });
    const target = createDefaultNode("ac-load", { x: 0, y: 300 });
    const routes = autoAlignPreviewRoutes([source, target], [connect(source, target, "e-vertical")]);

    expect(routes[0].points).toHaveLength(2);
    expect(routes[0].points[0].x).toBe(routes[0].points[1].x);
  });

  test("两个方向都不对齐时走先横后竖的 L 形（拐点取目标的 x、源的 y）", () => {
    const source = createDefaultNode("ac-load", { x: 0, y: 0 });
    const target = createDefaultNode("ac-load", { x: 200, y: 150 });
    const [route] = autoAlignPreviewRoutes([source, target], [connect(source, target, "e-lshape")]);

    const start = getEdgeEndpointPoint(source, undefined, source.terminals[0].id);
    const end = getEdgeEndpointPoint(target, undefined, target.terminals[0].id);
    expect(start).toEqual({ x: 0, y: -55 });
    expect(end).toEqual({ x: 200, y: 95 });
    // 拐点 = (end.x, start.y)：第一段横、第二段竖
    expect(route.points).toEqual([start, { x: end.x, y: start.y }, end]);
    expect(countAutoAlignRouteBends(route.points)).toBe(1);
  });

  test("path 恒为空串：代理只给几何，不给渲染路径", () => {
    const source = createDefaultNode("ac-load", { x: 0, y: 0 });
    const target = createDefaultNode("ac-load", { x: 200, y: 150 });

    expect(autoAlignPreviewRoutes([source, target], [connect(source, target, "e-path")])[0].path).toBe("");
  });

  test("端点设备不在节点表里的悬空边被跳过", () => {
    // 变异实测：把 `!source || !target` 改成 `&&`，本条会以 TypeError 转红
    //（getEdgeEndpointPoint 拿到 undefined）。守卫不是多余的 —— 半条边进代理会直接崩。
    const source = createDefaultNode("ac-load", { x: 0, y: 0 });
    const target = createDefaultNode("ac-load", { x: 200, y: 150 });

    expect(autoAlignPreviewRoutes([source], [connect(source, target, "e-dangling")])).toEqual([]);
    expect(autoAlignPreviewRoutes([], [connect(source, target, "e-dangling")])).toEqual([]);
  });

  test("无边时返回空数组", () => {
    const source = createDefaultNode("ac-load", { x: 0, y: 0 });

    expect(autoAlignPreviewRoutes([source], [])).toEqual([]);
  });
});

// autoAlignStoredRoutePlan 找出「存档折线已经失效」的线路：按端口重算的拐点**严格更少**才算失效。
// 判据的严格性是用户裁决的结果 —— 放宽成「不差于」会把「拐点打平但腿位不同」的线也换掉，凭空改形状。
describe("autoAlignStoredRoutePlan", () => {
  const emptyPlan = { drops: [], preservedRoutes: [], reroutedRoutes: [] };

  /**
   * 假路由器：边还带存档折线时按 stored 给几何（=「保留存档折线」那一遍），
   * 存档已被剥掉时按 fresh 给几何（=「按当前端口重算」那一遍）。
   * 真实路由器看的是边表而不是调用次序，所以必须这样区分 —— 用一张按 id 查的固定表会让两遍完全相同，测不出差异。
   */
  const routeTable = (
    stored: Record<string, { x: number; y: number }[]>,
    fresh: Record<string, { x: number; y: number }[]>
  ) => {
    const calls: { edgeIds: string[]; strippedIds: string[] }[] = [];
    const routeEdges = (stateNodes: readonly ModelNode[], edges: readonly Edge[]) => {
      calls.push({
        edgeIds: edges.map((edge) => edge.id),
        strippedIds: edges.filter((edge) => !edge.manualPoints?.length && !edge.routePoints?.length).map((edge) => edge.id)
      });
      return edges.map((edge) => ({
        edgeId: edge.id,
        points: edge.manualPoints?.length || edge.routePoints?.length ? stored[edge.id] ?? [] : fresh[edge.id] ?? [],
        path: ""
      }));
    };
    return { routeEdges, calls };
  };

  const edgeOf = (id: string, stored?: Partial<Edge>): Edge => ({
    id,
    sourceId: "n1",
    targetId: "n2",
    ...stored
  });

  test("候选集为空：三个字段全空，且一次都不跑路由器", () => {
    const { routeEdges, calls } = routeTable({}, {});
    const nodes = [createDefaultNode("ac-load", { x: 0, y: 0 })];

    const plan = autoAlignStoredRoutePlan(nodes, [edgeOf("e1")], new Set(), routeEdges);

    expect(plan).toEqual(emptyPlan);
    expect(autoAlignStoredRouteDrops(nodes, [edgeOf("e1")], new Set(), routeEdges)).toEqual([]);
    expect(calls).toHaveLength(0);
  });

  test("边表为空：同样早退", () => {
    const { routeEdges, calls } = routeTable({}, {});
    const nodes = [createDefaultNode("ac-load", { x: 0, y: 0 })];

    const plan = autoAlignStoredRoutePlan(nodes, [], new Set(["e1"]), routeEdges);

    expect(plan).toEqual(emptyPlan);
    expect(calls).toHaveLength(0);
  });

  test("候选 id 在边表里一条都匹配不上：早退，不跑路由器", () => {
    const { routeEdges, calls } = routeTable({}, {});
    const nodes = [createDefaultNode("ac-load", { x: 0, y: 0 })];

    const plan = autoAlignStoredRoutePlan(nodes, [edgeOf("e1")], new Set(["别的边"]), routeEdges);

    expect(plan).toEqual(emptyPlan);
    expect(calls).toHaveLength(0);
  });

  test("拐点严格更少才算失效：打平的线不动", () => {
    // e1 存档 2 拐点 → 重算 1 拐点：丢弃
    // e2 存档 1 拐点 → 重算 1 拐点：打平，保留（放宽成「不差于」会连它一起换掉）
    const stored = {
      e1: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 20, y: 10 }],
      e2: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }]
    };
    const fresh = {
      e1: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }],
      e2: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }]
    };
    const { routeEdges } = routeTable(stored, fresh);
    const nodes = [createDefaultNode("ac-load", { x: 0, y: 0 })];
    const edges = [edgeOf("e1", { routePoints: stored.e1 }), edgeOf("e2", { routePoints: stored.e2 })];

    const plan = autoAlignStoredRoutePlan(nodes, edges, new Set(["e1", "e2"]), routeEdges);

    expect(plan.drops.map((drop) => drop.edgeId)).toEqual(["e1"]);
    // drops 装的是重算几何，不是存档几何
    expect(plan.drops[0].points).toEqual(fresh.e1);
  });

  test("重算后拐点更多或相等都不丢", () => {
    // e1 存档 2 拐点 → 重算 3 拐点（更差）；e2 存档直连（0 拐点）→ 重算 2 拐点（更差）
    const stored = {
      e1: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 20, y: 10 }],
      e2: [{ x: 0, y: 0 }, { x: 10, y: 0 }]
    };
    const fresh = {
      e1: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 20, y: 10 }, { x: 20, y: 20 }],
      e2: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 20, y: 10 }]
    };
    const { routeEdges } = routeTable(stored, fresh);
    const nodes = [createDefaultNode("ac-load", { x: 0, y: 0 })];
    const edges = [edgeOf("e1", { routePoints: stored.e1 }), edgeOf("e2", { routePoints: stored.e2 })];

    expect(autoAlignStoredRoutePlan(nodes, edges, new Set(["e1", "e2"]), routeEdges).drops).toEqual([]);
  });

  test("任一侧几何点数不足 2 时跳过：单点几何不参与拐点比较", () => {
    // e1 存档 4 点（2 拐点）但重算只剩 1 点 → 丢掉守卫就会拿 0 拐点去比 2 拐点，凭空丢弃一条线
    // e2 反过来：存档 1 点、重算 4 点 → 同理
    const { routeEdges } = routeTable(
      {
        e1: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 20, y: 10 }],
        e2: [{ x: 0, y: 0 }]
      },
      {
        e1: [{ x: 0, y: 0 }],
        e2: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 20, y: 10 }]
      }
    );
    const nodes = [createDefaultNode("ac-load", { x: 0, y: 0 })];
    const edges = [
      edgeOf("e1", { routePoints: [{ x: 0, y: 0 }, { x: 9, y: 0 }] }),
      edgeOf("e2", { routePoints: [{ x: 0, y: 0 }, { x: 9, y: 0 }] })
    ];

    expect(autoAlignStoredRoutePlan(nodes, edges, new Set(["e1", "e2"]), routeEdges).drops).toEqual([]);
  });

  test("重算几何为空数组（边在重算里查不到）时跳过", () => {
    const { routeEdges } = routeTable({ e1: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 20, y: 10 }] }, {});
    const nodes = [createDefaultNode("ac-load", { x: 0, y: 0 })];
    const edges = [edgeOf("e1", { routePoints: [{ x: 0, y: 0 }, { x: 9, y: 0 }] })];

    expect(autoAlignStoredRoutePlan(nodes, edges, new Set(["e1"]), routeEdges).drops).toEqual([]);
  });

  test("只有候选边被剥掉存档折线，非候选边保持带存档折线", () => {
    const { routeEdges, calls } = routeTable({ e1: [{ x: 0, y: 0 }] }, { e1: [{ x: 0, y: 0 }] });
    const nodes = [createDefaultNode("ac-load", { x: 0, y: 0 })];
    const candidate = edgeOf("e1", { manualPoints: [{ x: 0, y: 0 }, { x: 5, y: 5 }], routePoints: [{ x: 0, y: 0 }] });
    const bystander = edgeOf("e2", { manualPoints: [{ x: 1, y: 1 }] });

    const plan = autoAlignStoredRoutePlan(nodes, [candidate, bystander], new Set(["e1"]), routeEdges);

    // 两次都是全量边表：第一遍没有任何边被剥掉（原始表），第二遍只有候选 e1 被剥掉
    expect(calls).toEqual([
      { edgeIds: ["e1", "e2"], strippedIds: [] },
      { edgeIds: ["e1", "e2"], strippedIds: ["e1"] }
    ]);
    // 非候选边在两遍里都走存档几何：bystander 只出现在 preservedRoutes 的对应位置
    expect(plan.preservedRoutes.map((route) => route.edgeId)).toEqual(["e1", "e2"]);
    expect(plan.reroutedRoutes.map((route) => route.edgeId)).toEqual(["e1", "e2"]);
    // 原始边对象没被就地改写
    expect(candidate.manualPoints).toHaveLength(2);
    expect(bystander.manualPoints).toHaveLength(1);
  });

  test("preservedRoutes 与 reroutedRoutes 都按全量边表返回", () => {
    const { routeEdges } = routeTable({}, { e1: [{ x: 0, y: 0 }], e2: [{ x: 1, y: 1 }] });
    const nodes = [createDefaultNode("ac-load", { x: 0, y: 0 })];
    const edges = [edgeOf("e1"), edgeOf("e2")];

    const plan = autoAlignStoredRoutePlan(nodes, edges, new Set(["e1"]), routeEdges);

    expect(plan.preservedRoutes.map((route) => route.edgeId)).toEqual(["e1", "e2"]);
    expect(plan.reroutedRoutes.map((route) => route.edgeId)).toEqual(["e1", "e2"]);
  });

  // 变异实测：`candidateEdgeIds.size === 0 || edges.length === 0` 改成 `&&` 一样绿 ——
  // 候选集为空时 filter 结果必然为空，下一道 `candidates.length === 0` 会照样早退。
  // 第一道守卫在行为上是冗余的，这里钉的是「候选集为空就不跑路由器」这个对外契约。
});

describe("autoAlignEdgeWithoutStoredRoute", () => {
  test("没有存档折线时返回同一个对象（不复制）", () => {
    const edge: Edge = { id: "e1", sourceId: "n1", targetId: "n2" };
    const emptyManual: Edge = { ...edge, manualPoints: [] };

    expect(autoAlignEdgeWithoutStoredRoute(edge)).toBe(edge);
    // 空数组也算「没有存档折线」→ 早退，连同空字段一起原样返回
    expect(autoAlignEdgeWithoutStoredRoute(emptyManual)).toBe(emptyManual);
  });

  test("有存档折线时返回去掉两者的副本，原对象保持不变", () => {
    const edge: Edge = {
      id: "e1",
      sourceId: "n1",
      targetId: "n2",
      manualPoints: [{ x: 0, y: 0 }],
      routePoints: [{ x: 1, y: 1 }]
    };

    const stripped = autoAlignEdgeWithoutStoredRoute(edge);

    expect(stripped).not.toBe(edge);
    expect(stripped.manualPoints).toBeUndefined();
    expect(stripped.routePoints).toBeUndefined();
    expect(stripped.id).toBe("e1");
    expect(edge.manualPoints).toHaveLength(1);
  });

  test("只删非空的那一个，另一侧字段原样保留", () => {
    const edge: Edge = { id: "e1", sourceId: "n1", targetId: "n2", manualPoints: [{ x: 0, y: 0 }] };

    const stripped = autoAlignEdgeWithoutStoredRoute(edge);

    expect(stripped.manualPoints).toBeUndefined();
    expect("routePoints" in stripped).toBe(false);
  });
});
