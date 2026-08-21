import { describe, expect, test, vi } from "vitest";
import {
  createFinishTerminalPress,
  createHandleTerminalPointerDown,
  createStartConnectFromTerminal
} from "./appExtracted/appDeviceDefinitionFactories";
import { createDefaultNode, type ModelNode, type Point } from "./model";

function createPointerEvent(pointerId = 7) {
  return {
    button: 0,
    pointerId,
    clientX: 150,
    clientY: 100,
    stopPropagation: vi.fn(),
    preventDefault: vi.fn()
  } as any;
}

function createTerminalPointerScope(node: ModelNode) {
  return {
    activeLayerNodeIdSet: new Set([node.id]),
    staticDrawing: null,
    svgRef: { current: {} },
    isBrowseMode: false,
    routableLinePlacement: null,
    rewiring: null,
    connectSource: null,
    busAnchorFromEvent: () => undefined,
    screenToSvgPoint: () => ({ x: 150, y: 100 }),
    clampPointToCanvas: (point: Point) => point,
    isBusNode: () => false,
    setTerminalPress: vi.fn(),
    captureCanvasPointer: vi.fn(),
    startConnectFromTerminal: vi.fn()
  };
}

describe("single-terminal pointer interaction", () => {
  test("does not start an ordinary link from station feeder district source/load terminals", () => {
    for (const kind of [
      "ac-station-source",
      "ac-feeder-source",
      "ac-district-source",
      "dc-station-source",
      "dc-feeder-source",
      "dc-district-source",
      "ac-station-load",
      "ac-feeder-load",
      "ac-district-load",
      "dc-station-load",
      "dc-feeder-load",
      "dc-district-load"
    ] as const) {
      const node = createDefaultNode(kind, { x: 100, y: 100 });
      const setConnectSource = vi.fn();
      const requireEditMode = vi.fn(() => true);

      createStartConnectFromTerminal({
        activeLayerNodeIdSet: new Set([node.id]),
        applyConnectPreviewState: vi.fn(),
        getModelEdgeEndpointPoint: vi.fn(() => ({ x: 100, y: 100 })),
        requireEditMode,
        resetRoutableLinePreviewState: vi.fn(),
        setCanvasSelectionScope: vi.fn(),
        setConnectSource,
        setMode: vi.fn(),
        setRoutableLinePlacement: vi.fn(),
        setSelectedEdgeId: vi.fn(),
        setSelectedEdgeIds: vi.fn(),
        setSelectedNodeIds: vi.fn()
      })(node, node.terminals[0].id);

      expect(requireEditMode, kind).not.toHaveBeenCalled();
      expect(setConnectSource, kind).not.toHaveBeenCalled();
    }
  });

  test("defers connection until pointer-up so dragging can switch the terminal side", () => {
    const node = createDefaultNode("ac-source", { x: 100, y: 100 });
    const scope = createTerminalPointerScope(node);

    createHandleTerminalPointerDown(scope)(createPointerEvent(), node, node.terminals[0].id);

    expect(scope.setTerminalPress).toHaveBeenCalledWith({
      nodeId: node.id,
      terminalId: node.terminals[0].id,
      pointerId: 7,
      startPoint: { x: 150, y: 100 },
      currentPoint: { x: 150, y: 100 },
      moved: false
    });
    expect(scope.captureCanvasPointer).toHaveBeenCalledWith(7);
    expect(scope.startConnectFromTerminal).not.toHaveBeenCalled();
  });

  test("keeps immediate connection behavior for multi-terminal devices", () => {
    const node = createDefaultNode("ac-source", { x: 100, y: 100 });
    const multiTerminalNode: ModelNode = {
      ...node,
      terminals: [node.terminals[0], { ...node.terminals[0], id: "t2" }]
    };
    const scope = createTerminalPointerScope(multiTerminalNode);

    createHandleTerminalPointerDown(scope)(
      createPointerEvent(),
      multiTerminalNode,
      multiTerminalNode.terminals[0].id
    );

    expect(scope.startConnectFromTerminal).toHaveBeenCalledTimes(1);
    expect(scope.setTerminalPress).not.toHaveBeenCalled();
    expect(scope.captureCanvasPointer).not.toHaveBeenCalled();
  });

  test("starts a connection when a pending single-terminal press is released without dragging", () => {
    const node = createDefaultNode("ac-source", { x: 100, y: 100 });
    const startConnectFromTerminal = vi.fn();
    const patchSingleTerminalAnchorFromPoint = vi.fn();
    const setTerminalPress = vi.fn();
    const terminalPress = {
      nodeId: node.id,
      terminalId: node.terminals[0].id,
      pointerId: 7,
      startPoint: { x: 150, y: 100 },
      currentPoint: { x: 150, y: 100 },
      moved: false
    };

    createFinishTerminalPress({
      terminalPress,
      nodeById: new Map([[node.id, node]]),
      isBusNode: () => false,
      busAnchorFromPoint: vi.fn(),
      startConnectFromTerminal,
      patchSingleTerminalAnchorFromPoint,
      setTerminalPress
    })();

    expect(startConnectFromTerminal).toHaveBeenCalledWith(node, node.terminals[0].id, undefined);
    expect(patchSingleTerminalAnchorFromPoint).not.toHaveBeenCalled();
    expect(setTerminalPress).toHaveBeenLastCalledWith(null);
  });

  test("commits the terminal side instead of starting a connection after dragging", () => {
    const node = createDefaultNode("ac-source", { x: 100, y: 100 });
    const startConnectFromTerminal = vi.fn();
    const patchSingleTerminalAnchorFromPoint = vi.fn();
    const setTerminalPress = vi.fn();
    const terminalPress = {
      nodeId: node.id,
      terminalId: node.terminals[0].id,
      pointerId: 7,
      startPoint: { x: 150, y: 100 },
      currentPoint: { x: 100, y: 20 },
      moved: true
    };

    createFinishTerminalPress({
      terminalPress,
      nodeById: new Map([[node.id, node]]),
      isBusNode: () => false,
      busAnchorFromPoint: vi.fn(),
      startConnectFromTerminal,
      patchSingleTerminalAnchorFromPoint,
      setTerminalPress
    })();

    expect(patchSingleTerminalAnchorFromPoint).toHaveBeenCalledWith(
      node.id,
      node.terminals[0].id,
      terminalPress.currentPoint,
      terminalPress.startPoint
    );
    expect(startConnectFromTerminal).not.toHaveBeenCalled();
    expect(setTerminalPress).toHaveBeenLastCalledWith(null);
  });
});
