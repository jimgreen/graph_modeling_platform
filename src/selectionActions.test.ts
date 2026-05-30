import { describe, expect, test } from "vitest";
import {
  assignPermanentDeviceIndex,
  createDefaultNode,
  normalizeDeviceIndexCounters,
  routeEdgesForRendering,
  type Edge,
  type ModelGroup
} from "./model";
import {
  CANVAS_EMPTY_SELECTION_MESSAGE,
  alignNodeLayoutUnits,
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
  resolveCanvasSelection,
  resolveCanvasDeleteAction,
  selectedCanvasGroupIds,
  selectGraphicsInRect
} from "./selectionActions";

describe("canvas selection actions", () => {
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
      { left: 0, right: 400, top: 0, bottom: 200 }
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
    expect(movedStandalone.position).toEqual(standalone.position);
    expect(firstDelta).toBeLessThan(0);
    expect(firstDelta).toBe(secondDelta);
    expect(movedSecond.position.x - movedFirst.position.x).toBe(secondGrouped.position.x - firstGrouped.position.x);
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
    expect(units[0].bounds.top).toBeLessThanOrEqual(40);
    expect(units[0].bounds.right).toBeGreaterThanOrEqual(720);
  });
});
