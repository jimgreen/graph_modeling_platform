/**
 * 画布连线/可变线路右键菜单、折点与线段拖拽及端子连线起点交互工厂模块。
 * 从 appDeviceDefinitionFactories.tsx 拆分，保持严格 TypeScript 类型检查。
 */

import type { EdgeRouteInteractionScope } from "./appScopeTypes";
import { sharedElementRectCache } from "../lib/rafCoalescer";
import type { MouseEvent, PointerEvent } from "react";
import { isLineOnlyConnectionNode, type Edge, type ModelNode, type Point } from "../model";
import { type ConnectTarget } from "./appCoreCanvasUtilities";

export function createOpenEdgeContextMenu(__appScope: EdgeRouteInteractionScope) {
  return (event: MouseEvent<SVGPathElement>, edgeId: string, routePoints?: Point[]) => {
  const { activateInspectorFromCanvas, activeLayerEdgeIdSet, canvasInteractionRef, clampPointToCanvas, lastCanvasPointerRef, lastRawCanvasPointerRef, openGraphicContextMenu, projectListPointerInsideRef, screenToSvgPoint, selectCanvasGraphics, svgRef, updateMouseStatus } = __appScope;
    event.preventDefault();
    event.stopPropagation();
    if (!activeLayerEdgeIdSet.has(edgeId)) {
      return;
    }
    activateInspectorFromCanvas();
    canvasInteractionRef.current = true;
    projectListPointerInsideRef.current = false;
    let pointer: Point | undefined;
    if (svgRef.current) {
      const rawPointer = screenToSvgPoint(svgRef.current, event.clientX, event.clientY);
      pointer = clampPointToCanvas(rawPointer);
      lastRawCanvasPointerRef.current = rawPointer;
      lastCanvasPointerRef.current = pointer;
      updateMouseStatus(pointer);
    }
    selectCanvasGraphics([], [edgeId]);
    openGraphicContextMenu({
      x: event.clientX,
      y: event.clientY,
      target: "edge",
      canvasPoint: pointer,
      edgeId,
      routePoints: routePoints?.map((point) => ({ ...point }))
    });
  };
}

export function createCaptureCanvasPointer(__appScope: EdgeRouteInteractionScope) {
  return (pointerId: number) => {
  const { svgRef } = __appScope;
    try {
      svgRef.current?.setPointerCapture(pointerId);
    } catch {
      // Pointer capture can fail if the browser has already canceled the pointer.
    }
  };
}

export function createStartManualSegmentDrag(__appScope: EdgeRouteInteractionScope) {
  return (
    event: PointerEvent<SVGPathElement>,
    edgeId: string,
    segmentIndex: number,
    orientation: "horizontal" | "vertical",
    routePoints: Point[]
  ) => {
  const { activeLayerEdgeIdSet, captureCanvasPointer, clampPointToCanvas, edgePointerBendInsertRef, hasCanvasSelectionModifier, insertManualBendAtPoint, routeManualPoints, screenToSvgPoint, selectCanvasGraphics, setManualPathDrag, startModifierSelectionPress, svgRef } = __appScope;
    event.stopPropagation();
    if (event.button !== 0 || !svgRef.current || !activeLayerEdgeIdSet.has(edgeId)) {
      return;
    }
    if (hasCanvasSelectionModifier(event)) {
      startModifierSelectionPress(event, { kind: "edge", edgeId });
      return;
    }
    const pointer = clampPointToCanvas(screenToSvgPoint(svgRef.current, event.clientX, event.clientY));
    if (event.detail >= 2) {
      event.preventDefault();
      edgePointerBendInsertRef.current = {
        edgeId,
        clientX: event.clientX,
        clientY: event.clientY,
        at: Date.now()
      };
      insertManualBendAtPoint(edgeId, segmentIndex, routePoints, pointer);
      return;
    }
    selectCanvasGraphics([], [edgeId]);
    setManualPathDrag({
      edgeId,
      segmentIndex,
      orientation,
      startPoint: pointer,
      originalManualPoints: routeManualPoints(routePoints),
      originalRoutePoints: routePoints.map((point) => ({ ...point }))
    });
    captureCanvasPointer(event.pointerId);
  };
}

export function createStartManualPointDrag(__appScope: EdgeRouteInteractionScope) {
  return (event: PointerEvent<SVGCircleElement>, edgeId: string, pointIndex: number, routePoints: Point[]) => {
  const { activeLayerEdgeIdSet, captureCanvasPointer, clampPointToCanvas, edgePointerBendInsertRef, findBendInsertRouteSegmentIndex, hasCanvasSelectionModifier, insertManualBendAtPoint, routeManualPoints, screenToSvgPoint, selectCanvasGraphics, setManualPathDrag, startModifierSelectionPress, svgRef } = __appScope;
    event.stopPropagation();
    if (event.button !== 0 || !svgRef.current || !activeLayerEdgeIdSet.has(edgeId)) {
      return;
    }
    if (hasCanvasSelectionModifier(event)) {
      startModifierSelectionPress(event, { kind: "edge", edgeId });
      return;
    }
    const pointer = clampPointToCanvas(screenToSvgPoint(svgRef.current, event.clientX, event.clientY));
    if (event.detail >= 2) {
      event.preventDefault();
      const segmentIndex = findBendInsertRouteSegmentIndex(routePoints, pointer);
      if (segmentIndex >= 0) {
        edgePointerBendInsertRef.current = {
          edgeId,
          clientX: event.clientX,
          clientY: event.clientY,
          at: Date.now()
        };
        insertManualBendAtPoint(edgeId, segmentIndex, routePoints, pointer);
      }
      return;
    }
    selectCanvasGraphics([], [edgeId]);
    setManualPathDrag({
      edgeId,
      pointIndex,
      startPoint: pointer,
      originalManualPoints: routeManualPoints(routePoints),
      originalRoutePoints: routePoints.map((point) => ({ ...point }))
    });
    captureCanvasPointer(event.pointerId);
  };
}

export function createRouteSegmentPointerDistance(__appScope: EdgeRouteInteractionScope) {
  return (point: Point, from: Point, to: Point) => {
    if (from.y === to.y) {
      const minX = Math.min(from.x, to.x);
      const maxX = Math.max(from.x, to.x);
      if (point.x >= minX && point.x <= maxX) {
        return Math.abs(point.y - from.y);
      }
    } else if (from.x === to.x) {
      const minY = Math.min(from.y, to.y);
      const maxY = Math.max(from.y, to.y);
      if (point.y >= minY && point.y <= maxY) {
        return Math.abs(point.x - from.x);
      }
    }
    return Math.min(
      Math.hypot(point.x - from.x, point.y - from.y),
      Math.hypot(point.x - to.x, point.y - to.y)
    );
  };
}

export function createFindEditableRouteSegmentIndex(__appScope: EdgeRouteInteractionScope) {
  return (routePoints: Point[], point: Point) => {
  const { routeSegmentPointerDistance, sameOptionalPoint } = __appScope;
    const candidates = routePoints
      .slice(0, -1)
      .map((from, segmentIndex) => ({ from, to: routePoints[segmentIndex + 1], segmentIndex }))
      .filter(({ from, to }) => to && !sameOptionalPoint(from, to) && (from.x === to.x || from.y === to.y));
    return candidates.reduce<{ index: number; distance: number } | null>((nearest, candidate) => {
      const distance = routeSegmentPointerDistance(point, candidate.from, candidate.to);
      return !nearest || distance < nearest.distance ? { index: candidate.segmentIndex, distance } : nearest;
    }, null)?.index ?? -1;
  };
}

export function createConnectionHitTolerance(__appScope: EdgeRouteInteractionScope) {
  return () => {
  const { CONNECTION_HIT_SCREEN_TOLERANCE, svgRef } = __appScope;
    const svg = svgRef.current;
    const rect = svg ? sharedElementRectCache.getRect(svg) : undefined;
    if (!svg || !rect || rect.width <= 0 || rect.height <= 0) {
      return 16;
    }
    const svgViewBox = svg.viewBox.baseVal;
    const xTolerance = (svgViewBox.width / rect.width) * CONNECTION_HIT_SCREEN_TOLERANCE;
    const yTolerance = (svgViewBox.height / rect.height) * CONNECTION_HIT_SCREEN_TOLERANCE;
    return Math.max(xTolerance, yTolerance);
  };
}

export function createFindConnectionRouteHitAtPoint(__appScope: EdgeRouteInteractionScope) {
  return (point: Point) => {
  const { activeLayerEdgeIdSet, connectionHitTolerance, queryRouteSpatialIndex, routeSegmentPointerDistance, routedEdgeIndexById, routedEdgeSpatialIndex } = __appScope;
    const tolerance = connectionHitTolerance();
    const hitBounds = {
      left: point.x - tolerance,
      right: point.x + tolerance,
      top: point.y - tolerance,
      bottom: point.y + tolerance
    };
    return queryRouteSpatialIndex(routedEdgeSpatialIndex, hitBounds)
      .filter((route: any) => activeLayerEdgeIdSet.has(route.edgeId))
      .flatMap((route: any) =>
        route.points.slice(0, -1).map((from: any, segmentIndex: any) => ({
          edgeId: route.edgeId,
          routePoints: route.points,
          distance: routeSegmentPointerDistance(point, from, route.points[segmentIndex + 1]),
          routeOrder: routedEdgeIndexById.get(route.edgeId) ?? -1,
          segmentIndex
        }))
      )
      .filter((candidate: any) => candidate.distance <= tolerance)
      .sort((first: any, second: any) =>
        first.distance - second.distance ||
        second.routeOrder - first.routeOrder ||
        first.segmentIndex - second.segmentIndex
      )[0] ?? null;
  };
}

export function createInsertManualBendAtPoint(__appScope: EdgeRouteInteractionScope) {
  return (edgeId: string, segmentIndex: number, routePoints: Point[], clickPoint: Point) => {
  const { activeLayerEdgeIdSet, canvasBounds, insertOrthogonalRouteBend, pushUndoSnapshot, routeManualPoints, setEdgeManualPoints } = __appScope;
    if (!activeLayerEdgeIdSet.has(edgeId)) {
      return;
    }
    const from = routePoints[segmentIndex];
    const to = routePoints[segmentIndex + 1];
    if (!from || !to || (from.x !== to.x && from.y !== to.y)) {
      return;
    }
    pushUndoSnapshot();
    const nextPoints = insertOrthogonalRouteBend(routePoints, segmentIndex, clickPoint, canvasBounds);
    setEdgeManualPoints(edgeId, routeManualPoints(nextPoints), nextPoints);
  };
}

export function createInsertManualBendFromPointer(__appScope: EdgeRouteInteractionScope) {
  return (edgeId: string, routePoints: Point[], clickPoint: Point) => {
  const { findEditableRouteSegmentIndex, insertManualBendAtPoint } = __appScope;
    const segmentIndex = findEditableRouteSegmentIndex(routePoints, clickPoint);
    if (segmentIndex >= 0) {
      insertManualBendAtPoint(edgeId, segmentIndex, routePoints, clickPoint);
      return true;
    }
    return false;
  };
}

export function createAddManualBendFromContextMenu(__appScope: EdgeRouteInteractionScope) {
  return () => {
  const { contextMenu, insertManualBendFromPointer, lastCanvasPointerRef, selectedEdgeId, selectedRoutedEdge } = __appScope;
    const edgeId = contextMenu?.edgeId ?? selectedEdgeId;
    const routePoints = contextMenu?.routePoints ?? selectedRoutedEdge?.points;
    const point = contextMenu?.canvasPoint ?? lastCanvasPointerRef.current;
    if (!edgeId || !routePoints?.length || !point) {
      return;
    }
    insertManualBendFromPointer(edgeId, routePoints, point);
  };
}

export function createAddRoutableLineBendFromContextMenu(__appScope: EdgeRouteInteractionScope) {
  return () => {
  const { contextMenu, insertRoutableLineBendFromPointer, isRoutableLineDeviceKind, lastCanvasPointerRef, nodeById, routableLineDeviceCanvasPoints } = __appScope;
    const nodeId = contextMenu?.nodeId;
    const lineNode = nodeId ? nodeById.get(nodeId) : undefined;
    const point = contextMenu?.canvasPoint ?? lastCanvasPointerRef.current;
    if (!nodeId || !lineNode || !isRoutableLineDeviceKind(lineNode.kind) || !point) {
      return;
    }
    const routePoints = contextMenu?.routePoints ?? routableLineDeviceCanvasPoints(lineNode);
    if (routePoints.length < 2) {
      return;
    }
    insertRoutableLineBendFromPointer(nodeId, routePoints, point);
  };
}

export function createInsertManualBendFromEdgePath(__appScope: EdgeRouteInteractionScope) {
  return (event: MouseEvent<SVGElement>, edgeId: string, routePoints: Point[]) => {
  const { activateInspectorFromCanvas, activeLayerEdgeIdSet, clampPointToCanvas, edgePointerBendInsertRef, insertManualBendFromPointer, screenToSvgPoint, selectCanvasGraphics, staticDrawing, svgRef } = __appScope;
    event.preventDefault();
    event.stopPropagation();
    if (staticDrawing) {
      return;
    }
    if (!activeLayerEdgeIdSet.has(edgeId)) {
      return;
    }
    const pointerInsertedBend = edgePointerBendInsertRef.current;
    if (
      pointerInsertedBend &&
      pointerInsertedBend.edgeId === edgeId &&
      Date.now() - pointerInsertedBend.at < 800 &&
      Math.hypot(event.clientX - pointerInsertedBend.clientX, event.clientY - pointerInsertedBend.clientY) <= 8
    ) {
      edgePointerBendInsertRef.current = null;
      return;
    }
    if (!svgRef.current) {
      return;
    }
    activateInspectorFromCanvas();
    selectCanvasGraphics([], [edgeId]);
    const clickPoint = clampPointToCanvas(screenToSvgPoint(svgRef.current, event.clientX, event.clientY));
    insertManualBendFromPointer(edgeId, routePoints, clickPoint);
  };
}

export function createHandleEdgePathPointerDown(__appScope: EdgeRouteInteractionScope) {
  return (event: PointerEvent<SVGPathElement>, edgeId: string, routePoints: Point[]) => {
  const { activateInspectorFromCanvas, activeLayerEdgeIdSet, appendStaticDrawingPoint, clampPointToCanvas, edgePointerBendInsertRef, hasCanvasSelectionModifier, insertManualBendFromPointer, isRepeatedEdgePointerClick, lastEdgePointerClickRef, screenToSvgPoint, selectCanvasGraphics, startModifierSelectionPress, staticDrawing, svgRef } = __appScope;
    event.stopPropagation();
    if (event.button !== 0 || !svgRef.current) {
      return;
    }
    if (staticDrawing) {
      const pointer = clampPointToCanvas(screenToSvgPoint(svgRef.current, event.clientX, event.clientY));
      appendStaticDrawingPoint(pointer, event.detail >= 2);
      return;
    }
    if (!activeLayerEdgeIdSet.has(edgeId)) {
      return;
    }
    if (hasCanvasSelectionModifier(event)) {
      startModifierSelectionPress(event, { kind: "edge", edgeId });
      return;
    }
    activateInspectorFromCanvas();
    selectCanvasGraphics([], [edgeId]);
    const clickPoint = clampPointToCanvas(screenToSvgPoint(svgRef.current, event.clientX, event.clientY));
    const edgeClick = {
      edgeId,
      clientX: event.clientX,
      clientY: event.clientY,
      at: Date.now()
    };
    const repeatedClick = isRepeatedEdgePointerClick(lastEdgePointerClickRef.current, edgeClick);
    lastEdgePointerClickRef.current = edgeClick;
    if (event.detail < 2 && !repeatedClick) {
      return;
    }
    event.preventDefault();
    if (insertManualBendFromPointer(edgeId, routePoints, clickPoint)) {
      edgePointerBendInsertRef.current = {
        edgeId,
        clientX: event.clientX,
        clientY: event.clientY,
        at: Date.now()
      };
      lastEdgePointerClickRef.current = null;
    }
  };
}

export function createDeleteManualBendPoint(__appScope: EdgeRouteInteractionScope) {
  return (edgeId: string, routePointIndex: number, routePoints: Point[]) => {
  const { activeLayerEdgeIdSet, pushUndoSnapshot, routeManualPoints, setEdgeManualPoints } = __appScope;
    if (!activeLayerEdgeIdSet.has(edgeId)) {
      return;
    }
    if (routePointIndex <= 0 || routePointIndex >= routePoints.length - 1) {
      return;
    }
    pushUndoSnapshot();
    const nextPoints = routePoints.filter((_, index) => index !== routePointIndex);
    setEdgeManualPoints(edgeId, routeManualPoints(nextPoints), nextPoints);
  };
}

export function createSetRoutableLineManualPathPoints(__appScope: EdgeRouteInteractionScope) {
  return (nodeId: string, routePoints: Point[]) => {
  const { activeLayerNodeIdSet, canvasBounds, isRoutableLineDeviceKind, nodeById, patchGraphNodes, setRoutableLineDeviceCanvasPoints } = __appScope;
    const lineNode = nodeById.get(nodeId);
    if (!lineNode || !activeLayerNodeIdSet.has(nodeId) || !isRoutableLineDeviceKind(lineNode.kind)) {
      return;
    }
    // 提交路径：面板/菜单改路径点时强制「从设备外侧指向锚点」。
    const nextNode = setRoutableLineDeviceCanvasPoints(lineNode, routePoints, { nodeById, bounds: canvasBounds });
    if (nextNode !== lineNode) {
      patchGraphNodes([nextNode]);
    }
  };
}

export function createInsertRoutableLineBendAtPoint(__appScope: EdgeRouteInteractionScope) {
  return (nodeId: string, segmentIndex: number, routePoints: Point[], clickPoint: Point) => {
  const { activeLayerNodeIdSet, canvasBounds, insertRoutableLineDeviceBend, isRoutableLineDeviceKind, nodeById, patchGraphNodes, pushUndoSnapshot, setRoutableLineDeviceCanvasPoints, writeOperationLog } = __appScope;
    const lineNode = nodeById.get(nodeId);
    if (!lineNode || !activeLayerNodeIdSet.has(nodeId) || !isRoutableLineDeviceKind(lineNode.kind)) {
      return false;
    }
    const from = routePoints[segmentIndex];
    const to = routePoints[segmentIndex + 1];
    if (!from || !to || (from.x !== to.x && from.y !== to.y)) {
      return false;
    }
    pushUndoSnapshot();
    // 提交路径：加拐点前先把基线摆成端点合规走向，再插拐点。
    const baseNode = setRoutableLineDeviceCanvasPoints(lineNode, routePoints, { nodeById, bounds: canvasBounds });
    const nextNode = insertRoutableLineDeviceBend(baseNode, segmentIndex, clickPoint, canvasBounds);
    if (nextNode !== lineNode) {
      patchGraphNodes([nextNode]);
      writeOperationLog(`添加可变线路拐点：${nextNode.name}`);
    }
    return true;
  };
}

export function createInsertRoutableLineBendFromPointer(__appScope: EdgeRouteInteractionScope) {
  return (nodeId: string, routePoints: Point[], clickPoint: Point) => {
  const { findEditableRouteSegmentIndex, insertRoutableLineBendAtPoint } = __appScope;
    const segmentIndex = findEditableRouteSegmentIndex(routePoints, clickPoint);
    if (segmentIndex >= 0) {
      return insertRoutableLineBendAtPoint(nodeId, segmentIndex, routePoints, clickPoint);
    }
    return false;
  };
}

export function createStartRoutableLineSegmentDrag(__appScope: EdgeRouteInteractionScope) {
  return (
    event: PointerEvent<SVGPathElement>,
    node: ModelNode,
    segmentIndex: number,
    orientation: "horizontal" | "vertical",
    routePoints: Point[]
  ) => {
  const { activeLayerNodeIdSet, captureCanvasPointer, clampPointToCanvas, hasCanvasSelectionModifier, insertRoutableLineBendAtPoint, screenToSvgPoint, selectCanvasGraphics, setManualPathDrag, startModifierSelectionPress, svgRef } = __appScope;
    event.stopPropagation();
    if (event.button !== 0 || !svgRef.current || !activeLayerNodeIdSet.has(node.id)) {
      return;
    }
    if (hasCanvasSelectionModifier(event)) {
      startModifierSelectionPress(event, { kind: "node", nodeId: node.id });
      return;
    }
    const pointer = clampPointToCanvas(screenToSvgPoint(svgRef.current, event.clientX, event.clientY));
    if (event.detail >= 2) {
      event.preventDefault();
      insertRoutableLineBendAtPoint(node.id, segmentIndex, routePoints, pointer);
      return;
    }
    selectCanvasGraphics([node.id], [], { scope: "direct" });
    setManualPathDrag({
      nodeId: node.id,
      segmentIndex,
      orientation,
      startPoint: pointer,
      originalManualPoints: [],
      originalRoutePoints: routePoints.map((point) => ({ ...point }))
    });
    captureCanvasPointer(event.pointerId);
  };
}

export function createStartRoutableLinePointDrag(__appScope: EdgeRouteInteractionScope) {
  return (event: PointerEvent<SVGCircleElement>, node: ModelNode, pointIndex: number, routePoints: Point[]) => {
  const { activeLayerNodeIdSet, captureCanvasPointer, clampPointToCanvas, hasCanvasSelectionModifier, insertRoutableLineBendFromPointer, screenToSvgPoint, selectCanvasGraphics, setManualPathDrag, startModifierSelectionPress, svgRef } = __appScope;
    event.stopPropagation();
    if (event.button !== 0 || !svgRef.current || !activeLayerNodeIdSet.has(node.id)) {
      return;
    }
    if (hasCanvasSelectionModifier(event)) {
      startModifierSelectionPress(event, { kind: "node", nodeId: node.id });
      return;
    }
    const pointer = clampPointToCanvas(screenToSvgPoint(svgRef.current, event.clientX, event.clientY));
    if (event.detail >= 2) {
      event.preventDefault();
      insertRoutableLineBendFromPointer(node.id, routePoints, pointer);
      return;
    }
    selectCanvasGraphics([node.id], [], { scope: "direct" });
    setManualPathDrag({
      nodeId: node.id,
      pointIndex,
      startPoint: pointer,
      originalManualPoints: [],
      originalRoutePoints: routePoints.map((point) => ({ ...point }))
    });
    captureCanvasPointer(event.pointerId);
  };
}

export function createDeleteRoutableLineBendPoint(__appScope: EdgeRouteInteractionScope) {
  return (nodeId: string, routePointIndex: number, routePoints: Point[]) => {
  const { activeLayerNodeIdSet, pushUndoSnapshot, setRoutableLineManualPathPoints } = __appScope;
    if (!activeLayerNodeIdSet.has(nodeId) || routePointIndex <= 0 || routePointIndex >= routePoints.length - 1) {
      return;
    }
    pushUndoSnapshot();
    const nextPoints = routePoints.filter((_, index) => index !== routePointIndex);
    setRoutableLineManualPathPoints(nodeId, nextPoints);
  };
}

export function createStartConnectFromTerminal(__appScope: EdgeRouteInteractionScope) {
  return (node: ModelNode, terminalId: string, point?: Point) => {
  const { activeLayerNodeIdSet, applyConnectPreviewState, getModelEdgeEndpointPoint, resetRoutableLinePreviewState, setCanvasSelectionScope, setConnectSource, setMode, setRoutableLinePlacement, setSelectedEdgeId, setSelectedEdgeIds, setSelectedNodeIds } = __appScope;
    if (isLineOnlyConnectionNode(node)) {
      return;
    }
    if (!activeLayerNodeIdSet.has(node.id)) {
      return;
    }
    const sourcePoint = point ?? getModelEdgeEndpointPoint(node, undefined, terminalId);
    const nextConnectSource: { nodeId: string; terminalId: string; point?: Point; manualPoints?: Point[] } = point ? { nodeId: node.id, terminalId, point } : { nodeId: node.id, terminalId };
    setRoutableLinePlacement(null);
    resetRoutableLinePreviewState();
    setConnectSource(nextConnectSource);
    applyConnectPreviewState(sourcePoint, false, null, null, nextConnectSource);
    setMode("connect");
    setCanvasSelectionScope("group");
    setSelectedNodeIds([]);
    setSelectedEdgeId("");
    setSelectedEdgeIds([]);
  };
}

export function createFinishTerminalPress(__appScope: EdgeRouteInteractionScope) {
  return () => {
  const { busAnchorFromPoint, isBusNode, nodeById, patchSingleTerminalAnchorFromPoint, setTerminalPress, startConnectFromTerminal, terminalPress } = __appScope;
    if (!terminalPress) {
      return;
    }
    const node = nodeById.get(terminalPress.nodeId);
    if (!node) {
      setTerminalPress(null);
      return;
    }
    const busPoint = isBusNode(node) ? busAnchorFromPoint(node, terminalPress.startPoint) : undefined;
    if (!terminalPress.moved) {
      startConnectFromTerminal(node, terminalPress.terminalId, busPoint);
      setTerminalPress(null);
      return;
    }
    if (!isBusNode(node) && node.terminals.length === 1) {
      patchSingleTerminalAnchorFromPoint(
        terminalPress.nodeId,
        terminalPress.terminalId,
        terminalPress.currentPoint,
        terminalPress.startPoint
      );
    }
    setTerminalPress(null);
  };
}

export function createHandleTerminalPointerDown(__appScope: EdgeRouteInteractionScope) {
  return (
    event: PointerEvent<SVGCircleElement>,
    node: ModelNode,
    terminalId: string
  ) => {
  const { activeLayerNodeIdSet, appendStaticDrawingPoint, busAnchorFromEvent, busAnchorFromPoint, canConnectTerminals, canvasBounds, captureCanvasPointer, clampPointToCanvas, commitNewConnectionEdge, connectPreviewPointRef, connectSource, connectTargetTerminalType, connectionCommitFailureMessage, connectionEndpointRuleFailureMessage, edgeById, finishConnectToTarget, finishRoutableLineToTarget, getTerminalPoint, hasCanvasSelectionModifier, isBusNode, markBusTerminalSyncDirtyForEdges, markRouteEdgesDirty, markStoredRouteEdgesDirty, nodeById, nodes, patchGraphEdges, prepareConnectionEdgeForCommit, preserveConnectionEdgeRouteShape, previewStoredRoutePointsForEdge, pushUndoSnapshot, resetConnectPreviewState, resolveStraightBusSlideEndpointToPoint, rewiring, routableLinePlacement, routableLineTemplateTerminalType, routedEdges, routingNodesForConnectionEdge, screenToSvgPoint, setCanvasSelectionScope, setConnectSource, setRewiring, setSelectedEdgeId, setSelectedEdgeIds, setSelectedNodeIds, setTerminalPress, startConnectFromTerminal, startModifierSelectionPress, startRoutableLineFromTerminal, staticDrawing, svgRef, visibleNodeById, writeOperationLog } = __appScope;
    event.stopPropagation();
    if (staticDrawing && event.button === 0 && svgRef.current) {
      const pointer = clampPointToCanvas(screenToSvgPoint(svgRef.current, event.clientX, event.clientY));
      appendStaticDrawingPoint(pointer, event.detail >= 2);
      return;
    }
    if (!activeLayerNodeIdSet.has(node.id)) {
      return;
    }
    if (routableLinePlacement && event.button === 0 && svgRef.current) {
      const busPoint = busAnchorFromEvent(node, event);
      const target: ConnectTarget = { node, terminalId, point: busPoint };
      if (routableLinePlacement.source) {
        if (connectTargetTerminalType(target) === routableLineTemplateTerminalType(routableLinePlacement.template)) {
          finishRoutableLineToTarget(target, routableLinePlacement.manualPoints);
        }
      } else {
        startRoutableLineFromTerminal(node, terminalId, busPoint);
      }
      return;
    }
    if (event.button === 0 && svgRef.current && !rewiring) {
      event.preventDefault();
      const busPoint = busAnchorFromEvent(node, event);
      if (connectSource) {
        const target: ConnectTarget = { node, terminalId, point: busPoint };
        finishConnectToTarget(target, busPoint ?? getTerminalPoint(node, terminalId));
      } else if (!isBusNode(node) && node.terminals.length === 1) {
        const point = clampPointToCanvas(screenToSvgPoint(svgRef.current, event.clientX, event.clientY));
        setTerminalPress({
          nodeId: node.id,
          terminalId,
          pointerId: event.pointerId,
          startPoint: point,
          currentPoint: point,
          moved: false
        });
        captureCanvasPointer(event.pointerId);
      } else {
        startConnectFromTerminal(node, terminalId, busPoint);
      }
      return;
    }
    if (event.button === 0 && hasCanvasSelectionModifier(event)) {
      startModifierSelectionPress(event, { kind: "node", nodeId: node.id });
      return;
    }
    setCanvasSelectionScope("direct");
    setSelectedNodeIds([node.id]);
    setSelectedEdgeId("");
    setSelectedEdgeIds([]);
    if (event.button !== 0 || !svgRef.current) {
      return;
    }
    const busPoint = busAnchorFromEvent(node, event);
    if (rewiring) {
      const edge = edgeById.get(rewiring.edgeId);
      const otherNode = edge ? nodeById.get(rewiring.endpoint === "source" ? edge.targetId : edge.sourceId) : undefined;
      const otherTerminalId = rewiring.endpoint === "source" ? edge?.targetTerminalId : edge?.sourceTerminalId;
      if (edge && otherNode && otherTerminalId && canConnectTerminals(node, terminalId, otherNode, otherTerminalId)) {
        const movingPoint = busPoint ?? getTerminalPoint(node, terminalId);
        const sourceNode = nodeById.get(edge.sourceId);
        const targetNode = nodeById.get(edge.targetId);
        const rewiredEdge =
          rewiring.endpoint === "source"
            ? { ...edge, sourceId: node.id, sourceTerminalId: terminalId, sourcePoint: busPoint }
            : { ...edge, targetId: node.id, targetTerminalId: terminalId, targetPoint: busPoint };
        const slidePatch = sourceNode && targetNode
          ? resolveStraightBusSlideEndpointToPoint({
              edge,
              sourceNode,
              targetNode,
              movingEndpoint: rewiring.endpoint,
              movingPoint,
              nodes,
              movingNode: node,
              movingTerminalId: terminalId
            })
          : null;
        const candidateEdge = slidePatch ? { ...rewiredEdge, ...slidePatch } : rewiredEdge;
        const routingNodes = routingNodesForConnectionEdge(candidateEdge, nodes);
        const edgeForCommit = preserveConnectionEdgeRouteShape(
          routingNodes,
          candidateEdge,
          previewStoredRoutePointsForEdge(edge),
          canvasBounds
        );
        const endpointRuleMessage = connectionEndpointRuleFailureMessage(edgeForCommit);
        const prepared = endpointRuleMessage
          ? null
          : prepareConnectionEdgeForCommit(
          routingNodes,
          [edgeForCommit],
          edge.id,
          canvasBounds,
          routedEdges,
          { preserveManualRouteDisplay: Boolean(edgeForCommit.manualPoints?.length) }
        );
        if (prepared?.ok && prepared.edge) {
          const preparedEdge = prepared.edge;
          pushUndoSnapshot();
          markRouteEdgesDirty([edge.id]);
          markStoredRouteEdgesDirty([edge.id]);
          markBusTerminalSyncDirtyForEdges([edge, preparedEdge]);
          patchGraphEdges([preparedEdge]);
        } else {
          const message = endpointRuleMessage || connectionCommitFailureMessage(prepared?.issues);
          showGlobalMessage(`联络线端子调整失败：${message}`);
          writeOperationLog(`联络线端子调整失败：${message}`);
        }
      }
      setRewiring(null);
      return;
    }
    if (!connectSource) {
      return;
    }
    const sourceNode = visibleNodeById.get(connectSource.nodeId);
    if (sourceNode?.id === node.id && connectSource.terminalId === terminalId) {
      return;
    }
    if (!sourceNode || !canConnectTerminals(sourceNode, connectSource.terminalId, node, terminalId)) {
      return;
    }
    const newEdge: Edge = {
      id: `edge-${Date.now()}`,
      sourceId: sourceNode.id,
      targetId: node.id,
      sourceTerminalId: connectSource.terminalId,
      sourcePoint: connectSource.point,
      manualPoints: connectSource.manualPoints,
      targetTerminalId: terminalId,
      targetPoint: isBusNode(node) ? busAnchorFromPoint(node, connectPreviewPointRef.current ?? busPoint ?? getTerminalPoint(node, terminalId)) : busPoint
    };
    commitNewConnectionEdge(newEdge, sourceNode.name, node.name);
  };
}
