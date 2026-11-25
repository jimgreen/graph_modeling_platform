/**
 * CanvasTransientOverlayLayer - SVG 顶层瞬态交互覆盖层
 *
 * 位于 `<g className="canvas-content">` 之后，承载命令式拖拽覆盖层、
 * 连线/改线/折点预览、吸附提示点、自适应线路端点把手、置顶选中边折点与画布拉伸把手。
 * 所有交互事件经 `readLatestScope` 实时读取当帧回调，杜绝陈旧闭包。
 */
import { memo, type CSSProperties } from "react";
import type React from "react";
import type { ModelNode, Point } from "../../model";
import { CanvasConnectionPaths } from "./CanvasConnectionPaths";
import {
  areTransientOverlayPropsEqual,
  readLatestScope,
  type CanvasTransientOverlayLayerProps
} from "./layerComparators";

type RoutableLineEndpointHandle = { node: ModelNode; endpoint: "source" | "target"; point: Point };
type EdgePreviewRoute = { edgeId: string; path: string; color?: string };

export const CanvasTransientOverlayLayer = memo(function CanvasTransientOverlayLayerInner({
  scope,
  selectedEdgeTopmostVisible
}: CanvasTransientOverlayLayerProps) {
  const {
    imperativeMultiNodeDragOverlayRef,
    imperativeSingleNodeDragEdgePreviewRef,
    imperativeSingleNodeDragNodeOverlayRef,
    imperativeNodeDragDropHintRef,
    connectPreviewPathElementRef,
    connectPreviewHandleElementRef,
    connectPreviewPointRef,
    connectDropHintElementRef,
    renderMultiNodeDragOverlay,
    dragPreviewEdgeRoutes,
    terminalPressPreviewEdgeRoutes,
    rewiringPreviewRoute,
    rewiring,
    connectSource,
    connectPreviewDom,
    connectPreviewColor,
    routableLinePlacement,
    routableLinePreview,
    routableLinePlacementColor,
    routableLineEndpointDragPreviewRoute,
    routableLineEndpointDrag,
    routableLineEndpointDragColor,
    activeDropHintPoint,
    activeDropHintStyle,
    selectedRoutableLineManualPathRoute,
    dragGhostRoutableLineNodeIdSet,
    routableLineEndpointHandles,
    selectedRoutedEdge,
    selectedEdge,
    manualPathPreviewRoute,
    resizeSizeHint,
    isEditMode,
    canvasResizeHandles,
    connectionLineStyle,
    sameOptionalPoint,
    getEdgeEndpointPoint,
    nodeById,
    isBusNode,
    getMovableRouteSegmentIndexes,
    renderBoundaryBusInternalConnector
  } = scope;

  const openSelectedRoutableLineRouteContextMenu = (
    event: React.MouseEvent,
    node: ModelNode,
    routePoints: Point[]
  ) => {
    const latest = readLatestScope(scope);
    event.preventDefault();
    event.stopPropagation();
    if (!latest.isEditMode || !latest.activeLayerNodeIdSet.has(node.id)) {
      return;
    }
    latest.canvasInteractionRef.current = true;
    latest.projectListPointerInsideRef.current = false;
    let pointer: Point | undefined;
    if (latest.svgRef.current) {
      pointer = latest.clampPointToCanvas(
        latest.screenToSvgPoint(latest.svgRef.current, event.clientX, event.clientY)
      );
      latest.lastCanvasPointerRef.current = pointer;
      latest.updateMouseStatus(pointer);
    }
    latest.selectCanvasGraphics([node.id], [], { scope: "direct" });
    latest.openGraphicContextMenu({
      x: event.clientX,
      y: event.clientY,
      target: "node",
      canvasPoint: pointer,
      nodeId: node.id,
      routePoints: routePoints.map((point: Point) => ({ ...point }))
    });
  };

  return (
    <>
      <g
        ref={imperativeMultiNodeDragOverlayRef}
        className="multi-node-drag-overlay imperative-multi-node-drag-overlay"
        style={{ display: "none" }}
        aria-hidden="true"
      />
      {renderMultiNodeDragOverlay()}
      <g
        ref={imperativeSingleNodeDragEdgePreviewRef}
        className="single-node-drag-overlay imperative-single-node-drag-edge-preview"
        style={{ display: "none" }}
        aria-hidden="true"
      />
      <g
        ref={imperativeSingleNodeDragNodeOverlayRef}
        className="single-node-drag-overlay imperative-single-node-drag-node-overlay"
        style={{ display: "none" }}
        aria-hidden="true"
      />
      {dragPreviewEdgeRoutes.map((route: EdgePreviewRoute) => (
        <path
          key={`drag-preview-edge-${route.edgeId}`}
          d={route.path}
          className="connection-line drag-preview"
          style={{ "--connection-color": route.color } as CSSProperties}
        />
      ))}
      {terminalPressPreviewEdgeRoutes.map((route: EdgePreviewRoute) => (
        <path
          key={`terminal-preview-edge-${route.edgeId}`}
          d={route.path}
          className="connection-line drag-preview"
          style={connectionLineStyle(route.edgeId)}
        />
      ))}
      {rewiringPreviewRoute && (
        <path
          key={`rewiring-preview-edge-${rewiringPreviewRoute.edgeId}`}
          d={rewiringPreviewRoute.path}
          className="connection-line drag-preview"
          style={connectionLineStyle(rewiringPreviewRoute.edgeId)}
        />
      )}
      {rewiring && (
        <circle
          className="edge-endpoint-handle active-drag-handle"
          cx={rewiring.previewPoint.x}
          cy={rewiring.previewPoint.y}
          r={8}
        >
          <title>{rewiring.endpoint === "source" ? "拖拽线路起点" : "拖拽线路终点"}</title>
        </circle>
      )}
      {connectSource && (
        <path
          ref={(element) => {
            connectPreviewPathElementRef.current = element;
            if (element) {
              readLatestScope(scope).flushConnectPreviewDom();
            }
          }}
          d={connectPreviewDom.path}
          className="connection-preview-line"
          style={connectPreviewColor ? ({ "--connection-color": connectPreviewColor } as CSSProperties) : undefined}
        />
      )}
      {connectSource && (
        <circle
          ref={(element) => {
            connectPreviewHandleElementRef.current = element;
            if (element) {
              readLatestScope(scope).flushConnectPreviewDom();
            }
          }}
          className="connection-preview-active-endpoint"
          cx={connectPreviewDom.targetPoint?.x ?? connectPreviewPointRef.current?.x ?? 0}
          cy={connectPreviewDom.targetPoint?.y ?? connectPreviewPointRef.current?.y ?? 0}
          r={7}
          style={{
            ...(connectPreviewColor ? ({ "--connection-color": connectPreviewColor } as CSSProperties) : {}),
            display: connectPreviewDom.targetPoint ?? connectPreviewPointRef.current ? undefined : "none"
          }}
        >
          <title>拖拽连接线终点</title>
        </circle>
      )}
      {connectSource && (
        <>
          {connectSource.manualPoints?.map((point: Point, index: number) => (
            <circle
              key={`connect-preview-bend-${index}`}
              className="connection-preview-bend-point"
              cx={point.x}
              cy={point.y}
              r={5}
              style={
                connectPreviewColor ? ({ "--connection-color": connectPreviewColor } as CSSProperties) : undefined
              }
            />
          ))}
        </>
      )}
      {routableLinePlacement && routableLinePreview.path && (
        <path
          d={routableLinePreview.path}
          className="routable-line-drawing-preview"
          style={
            routableLinePlacementColor
              ? ({ "--connection-color": routableLinePlacementColor } as CSSProperties)
              : undefined
          }
        />
      )}
      {routableLinePlacement && (
        <>
          {routableLinePlacement.manualPoints?.map((point: Point, index: number) => (
            <circle
              key={`routable-line-preview-bend-${index}`}
              className="connection-preview-bend-point routable-line-preview-bend-point"
              cx={point.x}
              cy={point.y}
              r={5}
              style={
                routableLinePlacementColor
                  ? ({ "--connection-color": routableLinePlacementColor } as CSSProperties)
                  : undefined
              }
            />
          ))}
        </>
      )}
      {routableLineEndpointDragPreviewRoute && (
        <path
          d={routableLineEndpointDragPreviewRoute.path}
          className="routable-line-drawing-preview endpoint-retarget-preview"
          style={
            routableLineEndpointDragColor
              ? ({ "--connection-color": routableLineEndpointDragColor } as CSSProperties)
              : undefined
          }
        />
      )}
      {routableLineEndpointDrag && (
        <circle
          className={`routable-line-endpoint-handle active-drag-handle ${routableLineEndpointDrag.endpoint}`}
          cx={routableLineEndpointDrag.previewPoint.x}
          cy={routableLineEndpointDrag.previewPoint.y}
          r="7"
          style={
            routableLineEndpointDragColor
              ? ({ "--connection-color": routableLineEndpointDragColor } as CSSProperties)
              : undefined
          }
        >
          <title>{routableLineEndpointDrag.endpoint === "source" ? "拖拽线路起点" : "拖拽线路终点"}</title>
        </circle>
      )}
      {connectSource && (
        <g
          ref={(element) => {
            connectDropHintElementRef.current = element;
            if (element) {
              readLatestScope(scope).flushConnectPreviewDom();
            }
          }}
          className="connect-drop-hint"
          transform={
            connectPreviewDom.targetPoint
              ? `translate(${Math.round(connectPreviewDom.targetPoint.x)} ${Math.round(connectPreviewDom.targetPoint.y)})`
              : undefined
          }
          style={{
            ...(connectPreviewColor ? ({ "--connection-color": connectPreviewColor } as CSSProperties) : {}),
            display: connectPreviewDom.targetPoint ? undefined : "none"
          }}
        >
          <circle className="connect-drop-hint-halo" cx="0" cy="0" r="24" />
          <circle className="connect-drop-hint-ring" cx="0" cy="0" r="16" />
          <circle className="connect-drop-hint-core" cx="0" cy="0" r="5" />
        </g>
      )}
      {activeDropHintPoint && (
        <g
          className="connect-drop-hint"
          transform={`translate(${activeDropHintPoint.x} ${activeDropHintPoint.y})`}
          style={activeDropHintStyle}
        >
          <circle className="connect-drop-hint-halo" cx="0" cy="0" r="24" />
          <circle className="connect-drop-hint-ring" cx="0" cy="0" r="16" />
          <circle className="connect-drop-hint-core" cx="0" cy="0" r="5" />
        </g>
      )}
      <g
        ref={imperativeNodeDragDropHintRef}
        className="connect-drop-hint imperative-node-drag-drop-hint"
        style={{ display: "none" }}
        aria-hidden="true"
      >
        <circle className="connect-drop-hint-halo" cx="0" cy="0" r="24" />
        <circle className="connect-drop-hint-ring" cx="0" cy="0" r="16" />
        <circle className="connect-drop-hint-core" cx="0" cy="0" r="5" />
      </g>
      {selectedRoutableLineManualPathRoute &&
        !routableLineEndpointDrag &&
        !dragGhostRoutableLineNodeIdSet.has(selectedRoutableLineManualPathRoute.node.id) && (
          <g
            className="routable-line-manual-path-layer"
            data-node-id={selectedRoutableLineManualPathRoute.node.id}
          >
            <path
              d={selectedRoutableLineManualPathRoute.path}
              className="routable-line-manual-path-preview"
              onPointerDown={(event) =>
                readLatestScope(scope).handleRoutableLineNodePathPointerDown(
                  event,
                  selectedRoutableLineManualPathRoute.node
                )
              }
              onContextMenu={(event) =>
                openSelectedRoutableLineRouteContextMenu(
                  event,
                  selectedRoutableLineManualPathRoute.node,
                  selectedRoutableLineManualPathRoute.points
                )
              }
            />
            {selectedRoutableLineManualPathRoute.points.slice(1).map((point: Point, index: number) => {
              const from = selectedRoutableLineManualPathRoute.points[index];
              const segmentIndex = index;
              if (!from || sameOptionalPoint(from, point) || (from.x !== point.x && from.y !== point.y)) {
                return null;
              }
              const orientation = from.y === point.y ? "horizontal" : "vertical";
              return (
                <path
                  key={`routable-line-segment-${segmentIndex}`}
                  d={`M ${from.x} ${from.y} L ${point.x} ${point.y}`}
                  className={`manual-segment-handle ${orientation}`}
                  onPointerDown={(event) =>
                    readLatestScope(scope).startRoutableLineSegmentDrag(
                      event,
                      selectedRoutableLineManualPathRoute.node,
                      segmentIndex,
                      orientation,
                      selectedRoutableLineManualPathRoute.points
                    )
                  }
                  onContextMenu={(event) =>
                    openSelectedRoutableLineRouteContextMenu(
                      event,
                      selectedRoutableLineManualPathRoute.node,
                      selectedRoutableLineManualPathRoute.points
                    )
                  }
                />
              );
            })}
            {selectedRoutableLineManualPathRoute.points.slice(1, -1).map((point: Point, index: number) => {
              const routePointIndex = index + 1;
              return (
                <circle
                  key={`routable-line-bend-${routePointIndex}`}
                  className="manual-bend-handle user-manual-bend"
                  cx={point.x}
                  cy={point.y}
                  r={5.5}
                  onPointerDown={(event) =>
                    readLatestScope(scope).startRoutableLinePointDrag(
                      event,
                      selectedRoutableLineManualPathRoute.node,
                      routePointIndex,
                      selectedRoutableLineManualPathRoute.points
                    )
                  }
                  onContextMenu={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    readLatestScope(scope).deleteRoutableLineBendPoint(
                      selectedRoutableLineManualPathRoute.node.id,
                      routePointIndex,
                      selectedRoutableLineManualPathRoute.points
                    );
                  }}
                />
              );
            })}
          </g>
        )}
      {!routableLineEndpointDrag && routableLineEndpointHandles.length > 0 && (
        <g className="routable-line-endpoint-handle-layer">
          {routableLineEndpointHandles
            .filter((handle: RoutableLineEndpointHandle) => !dragGhostRoutableLineNodeIdSet.has(handle.node.id))
            .map((handle: RoutableLineEndpointHandle) => (
              <circle
                key={`${handle.node.id}-${handle.endpoint}`}
                className={`routable-line-endpoint-handle ${handle.endpoint}`}
                data-node-id={handle.node.id}
                cx={handle.point.x}
                cy={handle.point.y}
                r="7"
                onPointerDown={(event) =>
                  readLatestScope(scope).startRoutableLineEndpointDrag(event, handle.node, handle.endpoint)
                }
              >
                <title>{handle.endpoint === "source" ? "调整线路起点" : "调整线路终点"}</title>
              </circle>
            ))}
        </g>
      )}
      {selectedRoutedEdge &&
        selectedEdgeTopmostVisible &&
        selectedEdge &&
        (() => {
          const edge = selectedEdge;
          const route = selectedRoutedEdge;
          const isRewiringSelectedEdge = rewiring?.edgeId === edge.id;
          const isManualPathSelectedEdge = manualPathPreviewRoute?.edgeId === edge.id;
          const routePoints = isManualPathSelectedEdge ? manualPathPreviewRoute.points : route.points;
          const displayPath =
            isRewiringSelectedEdge && rewiringPreviewRoute
              ? rewiringPreviewRoute.path
              : isManualPathSelectedEdge
                ? manualPathPreviewRoute.path
                : route.path;
          const sourcePoint = getEdgeEndpointPoint(edge, "source");
          const targetPoint = getEdgeEndpointPoint(edge, "target");
          const sourceNode = nodeById.get(edge.sourceId);
          const targetNode = nodeById.get(edge.targetId);
          const sourceBusDotPoint = sourcePoint && sourceNode && isBusNode(sourceNode) ? sourcePoint : undefined;
          const targetBusDotPoint = targetPoint && targetNode && isBusNode(targetNode) ? targetPoint : undefined;
          const movableSegmentIndexes = new Set(getMovableRouteSegmentIndexes(routePoints));
          const manualRoutePointKey = (point: Point) => `${Math.round(point.x)},${Math.round(point.y)}`;
          const manualRoutePointKeys = new Set((edge.manualPoints ?? []).map(manualRoutePointKey));
          return (
            <g
              className="connection-group selected topmost"
              style={connectionLineStyle(edge.id)}
              data-edge-id={edge.id}
            >
              <CanvasConnectionPaths
                d={displayPath}
                onContextMenu={
                  isEditMode
                    ? (event) => readLatestScope(scope).openEdgeContextMenu(event, edge.id, routePoints)
                    : undefined
                }
                onDoubleClick={
                  isEditMode
                    ? (event) => readLatestScope(scope).insertManualBendFromEdgePath(event, edge.id, routePoints)
                    : undefined
                }
                onPointerDown={
                  isEditMode
                    ? (event) => readLatestScope(scope).handleEdgePathPointerDown(event, edge.id, routePoints)
                    : undefined
                }
              />
              {isEditMode &&
                !isRewiringSelectedEdge &&
                routePoints.slice(1).map((point: Point, index: number) => {
                  const from = routePoints[index];
                  const segmentIndex = index;
                  if (!movableSegmentIndexes.has(segmentIndex)) {
                    return null;
                  }
                  const orientation = from.y === point.y ? "horizontal" : "vertical";
                  return (
                    <path
                      key={`segment-${segmentIndex}`}
                      d={`M ${from.x} ${from.y} L ${point.x} ${point.y}`}
                      className={`manual-segment-handle ${orientation}`}
                      onPointerDown={(event) =>
                        readLatestScope(scope).startManualSegmentDrag(
                          event,
                          edge.id,
                          segmentIndex,
                          orientation,
                          routePoints
                        )
                      }
                      onDoubleClick={(event) =>
                        readLatestScope(scope).insertManualBendFromEdgePath(event, edge.id, routePoints)
                      }
                      onContextMenu={(event) =>
                        readLatestScope(scope).openEdgeContextMenu(event, edge.id, routePoints)
                      }
                    />
                  );
                })}
              {isEditMode &&
                !isRewiringSelectedEdge &&
                routePoints.slice(2, -2).map((point: Point, index: number) => {
                  const routePointIndex = index + 2;
                  const isUserManualBend = manualRoutePointKeys.has(manualRoutePointKey(point));
                  return (
                    <circle
                      key={`bend-${routePointIndex}`}
                      className={isUserManualBend ? "manual-bend-handle user-manual-bend" : "manual-bend-handle"}
                      cx={point.x}
                      cy={point.y}
                      r={5.5}
                      onPointerDown={(event) =>
                        readLatestScope(scope).startManualPointDrag(event, edge.id, routePointIndex, routePoints)
                      }
                      onDoubleClick={(event) =>
                        readLatestScope(scope).insertManualBendFromEdgePath(event, edge.id, routePoints)
                      }
                      onContextMenu={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        readLatestScope(scope).deleteManualBendPoint(edge.id, routePointIndex, routePoints);
                      }}
                    />
                  );
                })}
              {renderBoundaryBusInternalConnector(
                sourceNode,
                sourceBusDotPoint,
                `${edge.id}-topmost-source-internal-connector`
              )}
              {renderBoundaryBusInternalConnector(
                targetNode,
                targetBusDotPoint,
                `${edge.id}-topmost-target-internal-connector`
              )}
              {isEditMode && !isRewiringSelectedEdge && sourcePoint && (
                <circle
                  className="edge-endpoint-handle"
                  cx={
                    rewiring?.edgeId === edge.id && rewiring.endpoint === "source"
                      ? rewiring.previewPoint.x
                      : sourcePoint.x
                  }
                  cy={
                    rewiring?.edgeId === edge.id && rewiring.endpoint === "source"
                      ? rewiring.previewPoint.y
                      : sourcePoint.y
                  }
                  r={8}
                  onPointerDown={(event) => {
                    const latest = readLatestScope(scope);
                    event.stopPropagation();
                    if (event.button !== 0 || !latest.svgRef.current) {
                      return;
                    }
                    latest.setRewiring({
                      edgeId: edge.id,
                      endpoint: "source",
                      previewPoint: latest.clampPointToCanvas(
                        latest.screenToSvgPoint(latest.svgRef.current, event.clientX, event.clientY)
                      ),
                      pointerId: event.pointerId
                    });
                    event.currentTarget.setPointerCapture(event.pointerId);
                  }}
                />
              )}
              {isEditMode && !isRewiringSelectedEdge && targetPoint && (
                <circle
                  className="edge-endpoint-handle"
                  cx={
                    rewiring?.edgeId === edge.id && rewiring.endpoint === "target"
                      ? rewiring.previewPoint.x
                      : targetPoint.x
                  }
                  cy={
                    rewiring?.edgeId === edge.id && rewiring.endpoint === "target"
                      ? rewiring.previewPoint.y
                      : targetPoint.y
                  }
                  r={8}
                  onPointerDown={(event) => {
                    const latest = readLatestScope(scope);
                    event.stopPropagation();
                    if (event.button !== 0 || !latest.svgRef.current) {
                      return;
                    }
                    latest.setRewiring({
                      edgeId: edge.id,
                      endpoint: "target",
                      previewPoint: latest.clampPointToCanvas(
                        latest.screenToSvgPoint(latest.svgRef.current, event.clientX, event.clientY)
                      ),
                      pointerId: event.pointerId
                    });
                    event.currentTarget.setPointerCapture(event.pointerId);
                  }}
                />
              )}
            </g>
          );
        })()}
      {resizeSizeHint && (
        <g className="resize-size-badge" transform={`translate(${resizeSizeHint.x} ${resizeSizeHint.y})`}>
          <rect x="-48" y="-13" width="96" height="26" rx="6" />
          <text x="0" y="0" textAnchor="middle" dominantBaseline="middle">
            {resizeSizeHint.text}
          </text>
        </g>
      )}
      {isEditMode && canvasResizeHandles}
    </>
  );
}, areTransientOverlayPropsEqual);
