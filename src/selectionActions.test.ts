import { describe, expect, test } from "vitest";
import {
  assignPermanentDeviceIndex,
  calculateNodeVisualBounds,
  createDefaultNode,
  createRoutableLineDeviceFromEndpoints,
  DEVICE_LIBRARY,
  getTerminalPoint,
  isCanvasNodeMovable,
  normalizeDeviceIndexCounters,
  routeEdgesForRendering,
  routableLineDeviceEndpointRefForNode,
  routableLineDeviceEndpointRefs,
  type Edge,
  type ModelGroup,
  type ModelNode
} from "./model";
import {
  AUTO_ALIGN_DEFAULT_THRESHOLD_PX,
  AUTO_ALIGN_MAX_THRESHOLD_PX,
  AUTO_ALIGN_MIN_THRESHOLD_PX,
  CANVAS_EMPTY_SELECTION_MESSAGE,
  alignNodeLayoutUnits,
  autoAlignNodeLayoutUnits,
  autoSpreadNodeLayoutUnits,
  buildCanvasLayoutUnits,
  buildCanvasClipboard,
  canDissolveSingleCanvasGroupSelection,
  canGroupCanvasSelection,
  canvasGroupMemberNodeIds,
  canvasClipboardBounds,
  cloneCanvasClipboard,
  createCanvasGroupFromSelection,
  dissolveSelectedCanvasGroups,
  expandSelectionByGroups,
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

  test("auto-aligns layout units with nearby horizontal or vertical coordinates", () => {
    const firstColumn = createDefaultNode("ac-source", { x: 100, y: 100 });
    const secondColumn = createDefaultNode("ac-load", { x: 106, y: 260 });
    const firstRow = createDefaultNode("dc-load", { x: 360, y: 401 });
    const secondRow = createDefaultNode("ac-load", { x: 520, y: 406 });
    const farAway = createDefaultNode("dc-source", { x: 760, y: 640 });
    const exactThresholdFirst = createDefaultNode("ac-source", { x: 900, y: 900 });
    const exactThresholdSecond = createDefaultNode("ac-load", { x: 910, y: 960 });
    const nodes = [firstColumn, secondColumn, firstRow, secondRow, farAway, exactThresholdFirst, exactThresholdSecond];
    const units = buildCanvasLayoutUnits([], nodes, nodes.map((node) => node.id), []);

    const aligned = autoAlignNodeLayoutUnits(nodes, units, 10);
    const movedFirstColumn = aligned.find((node) => node.id === firstColumn.id)!;
    const movedSecondColumn = aligned.find((node) => node.id === secondColumn.id)!;
    const movedFirstRow = aligned.find((node) => node.id === firstRow.id)!;
    const movedSecondRow = aligned.find((node) => node.id === secondRow.id)!;
    const movedFarAway = aligned.find((node) => node.id === farAway.id)!;
    const movedExactThresholdFirst = aligned.find((node) => node.id === exactThresholdFirst.id)!;
    const movedExactThresholdSecond = aligned.find((node) => node.id === exactThresholdSecond.id)!;

    expect(movedFirstColumn.position.x).toBe(movedSecondColumn.position.x);
    expect(movedFirstRow.position.y).toBe(movedSecondRow.position.y);
    expect(movedFirstColumn.position.y).toBe(firstColumn.position.y);
    expect(movedSecondRow.position.x).toBe(secondRow.position.x);
    expect(movedFarAway.position).toEqual(farAway.position);
    expect(movedExactThresholdFirst.position).toEqual(exactThresholdFirst.position);
    expect(movedExactThresholdSecond.position).toEqual(exactThresholdSecond.position);
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
