import { type CSSProperties } from "react";
import { type Point } from "./model";
import { type MainWorkspaceProps } from "./MainWorkspace";
import { useWorkspaceCanvasInteractions } from "./useWorkspaceCanvasInteractions";

export function WorkspaceCanvasFrame(props: MainWorkspaceProps) {
  const {
    CircleDot,
    Copy,
    DEFAULT_CANVAS_BACKGROUND,
    Grid2X2,
    Group,
    Layers,
    Layers2,
    MemoDeviceGlyph,
    Route,
    SCALE_HANDLE_CONFIGS,
    Scissors,
    SvgMarkupChunk,
    TRANSFORM_ROTATE_HANDLE_GAP,
    TRANSFORM_ROTATE_STEM_END,
    TRANSFORM_ROTATE_STEM_START,
    Trash2,
    Type,
    Ungroup,
    activeDropHintPoint,
    activeDropHintStyle,
    activeDropReady,
    activeLayer,
    activeLayerEdgeIdSet,
    activeLayerId,
    activeLayerNodeIdSet,
    activeSelectedEdgeSet,
    addManualBendToSelectedEdgeCenter,
    assignSelectedNodesToModelLayer,
    busEndpointColor,
    canAddTemplateFromSelection,
    canConnectTerminals,
    canGroupSelectedGraphics,
    canUngroupSelectedGraphics,
    canvasBackgroundColor,
    canvasBackgroundImageUrl,
    canvasDisplayHeight,
    canvasDisplayOffsetX,
    canvasDisplayOffsetY,
    canvasDisplayWidth,
    canvasFrameRef,
    canvasHorizontalScrollbarsActive,
    canvasInteractionRef,
    canvasRenderBounds,
    canvasResizeHandles,
    canvasResizeHotzoneStyle,
    canvasResizePreviewRect,
    canvasScrollSurfaceHeight,
    canvasScrollSurfaceWidth,
    canvasVerticalScrollbarsActive,
    clampPointToCanvas,
    clearStaticButtonFeedback,
    colorDisplayMode,
    colorPalette,
    connectDropHintElementRef,
    connectPreviewColor,
    connectPreviewDom,
    connectPreviewPathElementRef,
    connectSource,
    connectSourceNode,
    connectTerminalCompatibilityActive,
    connectionLineStyle,
    copySelection,
    cutSelection,
    deleteManualBendPoint,
    deleteSelection,
    detailedSelectedEdgeIdSet,
    detailedViewportNodes,
    deviceLabelsVisible,
    dragAffectedEdgeIdSet,
    dragGhostEdgeRoutes,
    dragOverlayEdgeIdSet,
    dragPreviewEdgeIdSet,
    dragPreviewEdgeRoutes,
    dragging,
    draggingDelta,
    draggingNodeIdSet,
    edgeById,
    edgeFloatingToolbar,
    findRewireTargetAtPoint,
    floatingToolbarIconSize,
    floatingToolbarWrapperStyle,
    flushConnectPreviewDom,
    formatSvgNumber,
    getEdgeEndpointPoint,
    getMovableRouteSegmentIndexes,
    getNodeScaleX,
    getNodeScaleY,
    getTerminalDisplayColor,
    groupSelectedGraphics,
    groupTransformPreviewEdgeIdSet,
    groupTransformPreviewGroupId,
    groupTransformPreviewNodeIdSet,
    handleEdgePathPointerDown,
    handleLodNodeContextMenu,
    handleLodNodeDoubleClick,
    handleLodNodePointerDown,
    handleNodePointerDown,
    handleStaticButtonClick,
    handleTerminalPointerDown,
    hasCanvasSelectionModifier,
    imperativeMultiNodeDragOverlayRef,
    imperativeNodeDragDropHintRef,
    imperativeSingleNodeDragEdgePreviewRef,
    imperativeSingleNodeDragNodeOverlayRef,
    insertManualBendFromEdgePath,
    isBrowseMode,
    isBusNode,
    isEditMode,
    isGroupTransformDrag,
    isRoutableLineDeviceKind,
    isStaticButtonEnabledForNode,
    isStaticNode,
    lastCanvasPointerRef,
    libraryPlacement,
    lodCanvasNodeChunks,
    lodCanvasRouteChunks,
    lodSelectedNodeMarkup,
    manualPathPreviewRoute,
    marquee,
    multiNodeDragging,
    nodeById,
    nodeFloatingToolbar,
    nodeForegroundImage,
    nodeGeometryTransform,
    nodeImage,
    nodeLabelDrag,
    nodeLabelFontSize,
    nodeLabelRotateDrag,
    nodeLabelShouldRender,
    nodeLabelText,
    nodeLabelTextAnchor,
    nodeLabelTextStyle,
    nodeLabelTransform,
    nodeLabelVertical,
    nodeLabelVerticalSegments,
    nodeLabelVerticalTokenStyle,
    nodeLabelVerticalTokenY,
    nodeRotateHandleControlPoints,
    nodeScaleHandleControlPoint,
    nodeUprightRotateHandleControlPoints,
    nodeUprightScaleTransform,
    nodeUprightSelectionOutlineRect,
    nodeUsesUprightStaticSelectionOutline,
    openAddTemplateDialog,
    openEdgeContextMenu,
    openGraphicContextMenu,
    openLayerAssignmentDialog,
    overlappedTerminalKeys,
    panning,
    projectListPointerInsideRef,
    renderBoundaryBusInternalConnector,
    renderGroupTransformPhotoPreview,
    renderInteractiveStaticDrawingPreview,
    renderLibraryPlacementPreview,
    renderMeasurementGroup,
    renderMultiNodeDragOverlay,
    renderReadonlyBackgroundPage,
    renderSingleTransformRotateOriginGhost,
    renderTransformRotationTrajectory,
    renderViewportRoutedEdges,
    resetConnectPreviewState,
    resetRoutableLinePreviewState,
    resizeSizeHint,
    rewiring,
    rewiringPreviewRoute,
    routableLineActiveTerminalType,
    routableLineEndpointDragColor,
    routableLineEndpointDragPreviewRoute,
    routableLineEndpointHandles,
    routableLinePlacement,
    routableLinePlacementColor,
    routableLinePreview,
    routableLineTerminalCompatibilityActive,
    scaleHandleCursorClass,
    screenToSvgPoint,
    selectCanvasGraphics,
    selectedEdge,
    selectedNodeCount,
    selectedNodeId,
    selectedNodeIdSet,
    selectedRoutedEdge,
    selectedTransformGroupUnit,
    selectionRectCenter,
    setConnectSource,
    setImageTarget,
    setMode,
    setRewiring,
    setRoutableLinePlacement,
    setStaticButtonFeedback,
    singleNodeDragging,
    smartAlignmentGuides,
    startGroupMoveDrag,
    startGroupTransformDrag,
    startManualPointDrag,
    startManualSegmentDrag,
    startModifierSelectionPress,
    startNodeLabelDrag,
    startNodeLabelRotateDrag,
    startRoutableLineEndpointDrag,
    startSingleTransformDrag,
    staticButtonPointerRef,
    staticButtonVisual,
    staticDrawing,
    svgRef,
    svgStrokeDashArray,
    terminalPressPreviewEdgeIdSet,
    terminalPressPreviewEdgeRoutes,
    terminalRenderLocalPoint,
    terminalStubSegment,
    terminalStubStrokeWidth,
    tidySelectedEdgeRoute,
    toggleSelectedNodeLabelDisplay,
    transformDrag,
    ungroupSelectedGraphics,
    updateMouseStatus,
    useSimplifiedCanvasNodes,
    useSimplifiedCanvasRoutes,
    useSimplifiedSelectedCanvasNodes,
    visibleMeasurementGroups,
    visibleSelectedGroupLayoutUnits
  } = props;
  const { canvasResizeHotzoneHandlers, scrollSurfaceHandlers, svgHandlers } = useWorkspaceCanvasInteractions(props);

  return (
        <section
          className="canvas-frame"
          ref={canvasFrameRef}
          style={{
            overflowX: canvasHorizontalScrollbarsActive ? "auto" : "hidden",
            overflowY: canvasVerticalScrollbarsActive ? "auto" : "hidden"
          }}
        >
          <div
            className="canvas-scroll-surface"
            style={{ width: canvasScrollSurfaceWidth, height: canvasScrollSurfaceHeight }}
            {...scrollSurfaceHandlers}
          >
            <svg
              ref={svgRef}
              className={`diagram-canvas ${connectSource ? "connect-mode" : ""} ${staticDrawing ? "static-draw-mode" : ""} ${libraryPlacement ? "library-place-mode" : ""} ${activeDropReady ? "connect-drop-ready" : ""} ${panning ? "panning" : ""} ${multiNodeDragging ? "multi-node-dragging" : ""} ${singleNodeDragging ? "single-node-dragging" : ""}`}
              style={{ width: canvasDisplayWidth, height: canvasDisplayHeight, left: canvasDisplayOffsetX, top: canvasDisplayOffsetY }}
            viewBox={`0 0 ${canvasRenderBounds.width} ${canvasRenderBounds.height}`}
            {...svgHandlers}
          >
            <defs>
              <pattern id="small-grid" width="5" height="5" patternUnits="userSpaceOnUse">
                <path d="M 5 0 L 0 0 0 5" fill="none" stroke="#e2e8f0" strokeWidth="0.45" />
              </pattern>
              <pattern id="large-grid" width="25" height="25" patternUnits="userSpaceOnUse">
                <rect width="25" height="25" fill="url(#small-grid)" />
                <path d="M 25 0 L 0 0 0 25" fill="none" stroke="#cbd5e1" strokeWidth="0.8" />
              </pattern>
            </defs>
            <rect width={canvasRenderBounds.width} height={canvasRenderBounds.height} fill={canvasBackgroundColor || DEFAULT_CANVAS_BACKGROUND} />
            {canvasBackgroundImageUrl && (
              <image
                href={canvasBackgroundImageUrl}
                x="0"
                y="0"
                width={canvasRenderBounds.width}
                height={canvasRenderBounds.height}
                preserveAspectRatio="xMidYMid slice"
                pointerEvents="none"
              />
            )}
            <rect width={canvasRenderBounds.width} height={canvasRenderBounds.height} fill="url(#large-grid)" />
            <rect className="canvas-boundary" x="0" y="0" width={canvasRenderBounds.width} height={canvasRenderBounds.height} />
            {renderReadonlyBackgroundPage()}
            <g className="canvas-content">
            {marquee && (
              <rect
                className="marquee-box"
                x={Math.min(marquee.start.x, marquee.current.x)}
                y={Math.min(marquee.start.y, marquee.current.y)}
                width={Math.abs(marquee.current.x - marquee.start.x)}
                height={Math.abs(marquee.current.y - marquee.start.y)}
              />
            )}
            {renderLibraryPlacementPreview()}
            {renderInteractiveStaticDrawingPreview()}
            {smartAlignmentGuides.map((guide: any) => (
              <line
                key={guide.id}
                className={`smart-alignment-guide smart-alignment-guide-${guide.orientation}`}
                x1={guide.orientation === "vertical" ? guide.position : guide.start}
                y1={guide.orientation === "vertical" ? guide.start : guide.position}
                x2={guide.orientation === "vertical" ? guide.position : guide.end}
                y2={guide.orientation === "vertical" ? guide.end : guide.position}
                vectorEffect="non-scaling-stroke"
              />
            ))}
            {dragGhostEdgeRoutes.map((route: any) => (
              <path key={`drag-ghost-edge-${route.edgeId}`} d={route.path} className="connection-line drag-ghost" style={connectionLineStyle(route.edgeId)} />
            ))}
            {lodCanvasRouteChunks.length > 0 && (
              <g className="lod-route-layer">
                {lodCanvasRouteChunks.map((chunk: any) => (
                  <SvgMarkupChunk key={chunk.key} className="lod-route-layer-chunk" markup={chunk.markup} />
                ))}
              </g>
            )}
            {dragging?.historyCaptured && !multiNodeDragging && dragging.nodeIds.map((nodeId: string) => {
              const node = nodeById.get(nodeId);
              const originalPosition = dragging.originalPositions[nodeId];
              if (!node || !originalPosition) {
                return null;
              }
              const ghostNode = { ...node, position: originalPosition };
              const ghostNodeIsBus = isBusNode(ghostNode);
              return (
                <g
                  key={`drag-ghost-${node.id}`}
                  className={`node-drag-ghost ${ghostNodeIsBus ? "bus-node" : ""}`}
                  transform={`translate(${ghostNode.position.x} ${ghostNode.position.y})`}
                >
                  <g transform={nodeGeometryTransform(ghostNode)}>
                    <rect
                      x={-ghostNode.size.width / 2}
                      y={-ghostNode.size.height / 2}
                      width={ghostNode.size.width}
                      height={ghostNode.size.height}
                      rx="8"
                      className="node-drag-ghost-box"
                    />
                    <MemoDeviceGlyph node={ghostNode} mode="geometry" colorDisplayMode={colorDisplayMode} colorPalette={colorPalette} />
                    <MemoDeviceGlyph node={ghostNode} mode="text" colorDisplayMode={colorDisplayMode} colorPalette={colorPalette} />
                  </g>
                </g>
              );
            })}
            {renderViewportRoutedEdges.map((route: any) => {
              const edge = edgeById.get(route.edgeId);
              if (!edge) return null;
              const selected = activeSelectedEdgeSet.has(edge.id);
              if (
                (singleNodeDragging && dragAffectedEdgeIdSet.has(edge.id)) ||
                (draggingDelta && dragPreviewEdgeIdSet.has(edge.id)) ||
                (multiNodeDragging && dragOverlayEdgeIdSet.has(edge.id)) ||
                groupTransformPreviewEdgeIdSet.has(edge.id) ||
                terminalPressPreviewEdgeIdSet.has(edge.id) ||
                rewiring?.edgeId === edge.id
              ) {
                return null;
              }
              if (useSimplifiedCanvasRoutes && !selected) {
                return null;
              }
              if (useSimplifiedCanvasRoutes && selected && !detailedSelectedEdgeIdSet.has(edge.id)) {
                return null;
              }
              const sourcePoint = getEdgeEndpointPoint(edge, "source");
              const targetPoint = getEdgeEndpointPoint(edge, "target");
              const sourceNode = nodeById.get(edge.sourceId);
              const targetNode = nodeById.get(edge.targetId);
              const editable = isEditMode && activeLayerEdgeIdSet.has(edge.id);
              const inactiveLayerGraphic = isEditMode && !editable;
              const rewiringSource = rewiring?.edgeId === edge.id && rewiring.endpoint === "source";
              const rewiringTarget = rewiring?.edgeId === edge.id && rewiring.endpoint === "target";
              const rewireTarget = rewiring?.edgeId === edge.id ? findRewireTargetAtPoint(rewiring.previewPoint, rewiring) : null;
              const sourceBusDotPoint = rewiringSource
                ? rewireTarget?.node && isBusNode(rewireTarget.node)
                  ? rewireTarget.point
                  : undefined
                : sourcePoint && sourceNode && isBusNode(sourceNode)
                  ? sourcePoint
                  : undefined;
              const targetBusDotPoint = rewiringTarget
                ? rewireTarget?.node && isBusNode(rewireTarget.node)
                  ? rewireTarget.point
                  : undefined
                : targetPoint && targetNode && isBusNode(targetNode)
                  ? targetPoint
                  : undefined;
              return (
                <g key={edge.id} className={`connection-group ${selected ? "selected" : ""} ${inactiveLayerGraphic ? "inactive-layer-graphic" : ""}`} style={connectionLineStyle(edge.id)}>
                  <path
                    d={route.path}
                    className="connection-hitline"
                    onContextMenu={editable ? (event) => openEdgeContextMenu(event, edge.id, route.points) : undefined}
                    onDoubleClick={editable ? (event) => insertManualBendFromEdgePath(event, edge.id, route.points) : undefined}
                    onPointerDown={editable ? (event) => handleEdgePathPointerDown(event, edge.id, route.points) : undefined}
                  />
                  <path
                    d={route.path}
                    className="connection-line"
                    onContextMenu={editable ? (event) => openEdgeContextMenu(event, edge.id, route.points) : undefined}
                    onDoubleClick={editable ? (event) => insertManualBendFromEdgePath(event, edge.id, route.points) : undefined}
                    onPointerDown={editable ? (event) => handleEdgePathPointerDown(event, edge.id, route.points) : undefined}
                  />
                  {renderBoundaryBusInternalConnector(sourceNode, sourceBusDotPoint, `${edge.id}-source-internal-connector`)}
                  {renderBoundaryBusInternalConnector(targetNode, targetBusDotPoint, `${edge.id}-target-internal-connector`)}
                  {isEditMode && sourceBusDotPoint && (
                    <circle
                      className="bus-connection-dot"
                      cx={sourceBusDotPoint.x}
                      cy={sourceBusDotPoint.y}
                      r={7}
                      fill={busEndpointColor((rewiringSource ? rewireTarget?.node : sourceNode) ?? sourceNode!, colorPalette)}
                      onPointerDown={editable ? (event) => {
                        event.stopPropagation();
                        if (event.button !== 0 || !svgRef.current) {
                          return;
                        }
                        selectCanvasGraphics([], [edge.id]);
                        setRewiring({
                          edgeId: edge.id,
                          endpoint: "source",
                          previewPoint: clampPointToCanvas(screenToSvgPoint(svgRef.current, event.clientX, event.clientY)),
                          pointerId: event.pointerId
                        });
                        event.currentTarget.setPointerCapture(event.pointerId);
                      } : undefined}
                    />
                  )}
                  {isEditMode && targetBusDotPoint && (
                    <circle
                      className="bus-connection-dot"
                      cx={targetBusDotPoint.x}
                      cy={targetBusDotPoint.y}
                      r={7}
                      fill={busEndpointColor((rewiringTarget ? rewireTarget?.node : targetNode) ?? targetNode!, colorPalette)}
                      onPointerDown={editable ? (event) => {
                        event.stopPropagation();
                        if (event.button !== 0 || !svgRef.current) {
                          return;
                        }
                        selectCanvasGraphics([], [edge.id]);
                        setRewiring({
                          edgeId: edge.id,
                          endpoint: "target",
                          previewPoint: clampPointToCanvas(screenToSvgPoint(svgRef.current, event.clientX, event.clientY)),
                          pointerId: event.pointerId
                        });
                        event.currentTarget.setPointerCapture(event.pointerId);
                      } : undefined}
                    />
                  )}
                  {isEditMode && selected && sourcePoint && (
                    <circle
                      className="edge-endpoint-handle"
                      cx={rewiring?.edgeId === edge.id && rewiring.endpoint === "source" ? rewiring.previewPoint.x : sourcePoint.x}
                      cy={rewiring?.edgeId === edge.id && rewiring.endpoint === "source" ? rewiring.previewPoint.y : sourcePoint.y}
                      r={8}
                      onPointerDown={(event) => {
                        event.stopPropagation();
                        if (event.button !== 0 || !svgRef.current) {
                          return;
                        }
                        if (hasCanvasSelectionModifier(event)) {
                          startModifierSelectionPress(event, { kind: "edge", edgeId: edge.id });
                          return;
                        }
                        setRewiring({
                          edgeId: edge.id,
                          endpoint: "source",
                          previewPoint: clampPointToCanvas(screenToSvgPoint(svgRef.current, event.clientX, event.clientY)),
                          pointerId: event.pointerId
                        });
                        event.currentTarget.setPointerCapture(event.pointerId);
                      }}
                    />
                  )}
                  {isEditMode && selected && targetPoint && (
                    <circle
                      className="edge-endpoint-handle"
                      cx={rewiring?.edgeId === edge.id && rewiring.endpoint === "target" ? rewiring.previewPoint.x : targetPoint.x}
                      cy={rewiring?.edgeId === edge.id && rewiring.endpoint === "target" ? rewiring.previewPoint.y : targetPoint.y}
                      r={8}
                      onPointerDown={(event) => {
                        event.stopPropagation();
                        if (event.button !== 0 || !svgRef.current) {
                          return;
                        }
                        if (hasCanvasSelectionModifier(event)) {
                          startModifierSelectionPress(event, { kind: "edge", edgeId: edge.id });
                          return;
                        }
                        setRewiring({
                          edgeId: edge.id,
                          endpoint: "target",
                          previewPoint: clampPointToCanvas(screenToSvgPoint(svgRef.current, event.clientX, event.clientY)),
                          pointerId: event.pointerId
                        });
                        event.currentTarget.setPointerCapture(event.pointerId);
                      }}
                    />
                  )}
                </g>
              );
            })}
            {rewiringPreviewRoute && (
              <path
                key={`rewiring-preview-edge-${rewiringPreviewRoute.edgeId}`}
                d={rewiringPreviewRoute.path}
                className="connection-line drag-preview"
                style={connectionLineStyle(rewiringPreviewRoute.edgeId)}
              />
            )}
            {visibleSelectedGroupLayoutUnits.map((unit: any) => {
              const transforming = groupTransformPreviewGroupId === unit.id;
              const focused = selectedTransformGroupUnit?.id === unit.id;
              const bounds = unit.bounds;
              const width = Math.max(1, bounds.right - bounds.left);
              const height = Math.max(1, bounds.bottom - bounds.top);
              const center = selectionRectCenter(bounds);
              const handleGapX = 14;
              const handleGapY = 14;
              const rotateStemStart = TRANSFORM_ROTATE_STEM_START;
              const rotateStemEnd = TRANSFORM_ROTATE_STEM_END;
              const rotateHandleGap = TRANSFORM_ROTATE_HANDLE_GAP;
              return (
                <g key={`group-selection-${unit.id}`} className={`group-selection-overlay ${focused ? "focused" : ""} ${transforming ? "transforming" : ""}`}>
                  <rect
                    className="group-selection-hitbox"
                    x={bounds.left}
                    y={bounds.top}
                    width={width}
                    height={height}
                    onPointerDown={(event) => startGroupMoveDrag(event, unit)}
                    onContextMenu={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      if (!activeLayer?.visible) {
                        return;
                      }
                      canvasInteractionRef.current = true;
                      projectListPointerInsideRef.current = false;
                      let pointer: Point | undefined;
                      if (svgRef.current) {
                        pointer = clampPointToCanvas(screenToSvgPoint(svgRef.current, event.clientX, event.clientY));
                        lastCanvasPointerRef.current = pointer;
                        updateMouseStatus(pointer);
                      }
                      if (connectSource) {
                        setConnectSource(null);
                        resetConnectPreviewState();
                        setMode("select");
                        return;
                      }
                      if (routableLinePlacement) {
                        setRoutableLinePlacement(null);
                        resetRoutableLinePreviewState();
                        setMode("select");
                        return;
                      }
                      openGraphicContextMenu({ x: event.clientX, y: event.clientY, target: "group", canvasPoint: pointer });
                    }}
                  />
                  <rect
                    className="group-selection-outline"
                    x={bounds.left}
                    y={bounds.top}
                    width={width}
                    height={height}
                  />
                  {focused && (
                    <g className={`transform-handles group-transform-handles ${transformDrag && isGroupTransformDrag(transformDrag) && transformDrag.groupId === unit.id.replace(/^group:/, "") && transformDrag.kind !== "rotate" ? "resizing" : ""}`}>
                      <line x1={center.x} y1={bounds.top - rotateStemStart} x2={center.x} y2={bounds.top - rotateStemEnd} />
                      <g transform={`translate(${center.x} ${bounds.top - rotateHandleGap})`}>
                        <circle
                          className="rotate-handle"
                          cx="0"
                          cy="0"
                          r="8"
                          onPointerDown={(event) => startGroupTransformDrag(event, unit, "rotate")}
                        />
                      </g>
                      {SCALE_HANDLE_CONFIGS.map((handle: any) => {
                        const handleCursorClass = scaleHandleCursorClass(handle, 0);
                        const x =
                          handle.xDirection === 0
                            ? center.x
                            : handle.xDirection < 0
                              ? bounds.left - handleGapX
                              : bounds.right + handleGapX;
                        const y =
                          handle.yDirection === 0
                            ? center.y
                            : handle.yDirection < 0
                              ? bounds.top - handleGapY
                              : bounds.bottom + handleGapY;
                        return (
                          <g key={handle.id} transform={`translate(${x} ${y})`}>
                            <rect
                              className={`scale-handle ${handleCursorClass}`}
                              x="-8"
                              y="-8"
                              width="16"
                              height="16"
                              rx="3"
                              onPointerDown={(event) => startGroupTransformDrag(event, unit, handle.kind)}
                            />
                          </g>
                        );
                      })}
                    </g>
                  )}
                </g>
              );
            })}
            {lodCanvasNodeChunks.length > 0 && (
              <g
                className="lod-node-layer"
                onPointerDown={handleLodNodePointerDown}
                onContextMenu={handleLodNodeContextMenu}
                onDoubleClick={handleLodNodeDoubleClick}
              >
                {lodCanvasNodeChunks.map((chunk: any) => (
                  <SvgMarkupChunk key={chunk.key} className="lod-node-layer-chunk" markup={chunk.markup} />
                ))}
              </g>
            )}
            {lodSelectedNodeMarkup && (
              <g className="lod-node-selection-layer" dangerouslySetInnerHTML={{ __html: lodSelectedNodeMarkup }} />
            )}
            {detailedViewportNodes.map((node: any) => {
              if (groupTransformPreviewNodeIdSet.has(node.id)) {
                return null;
              }
              const selected = selectedNodeIdSet.has(node.id);
              const focused = node.id === selectedNodeId;
              const editable = activeLayerNodeIdSet.has(node.id);
              const inactiveLayerGraphic = isEditMode && !editable;
              const nodeIsBus = isBusNode(node);
              const nodeIsStatic = isStaticNode(node);
              const nodeIsRoutableLineDevice = isRoutableLineDeviceKind(node.kind);
              const isStorageBus =
                node.kind === "hydrogen-tank" ||
                node.kind === "hydrogen-tank-horizontal" ||
                node.kind === "hydrogen-tank-container" ||
                node.kind === "thermal-storage-tank";
              const isConnectSource = node.id === connectSource?.nodeId;
              const originalDragPosition = dragging?.originalPositions[node.id];
              const renderPosition = draggingDelta && originalDragPosition
                ? {
                    x: originalDragPosition.x + draggingDelta.x,
                    y: originalDragPosition.y + draggingDelta.y
                  }
                : node.position;
              const renderSimplifiedNode =
                useSimplifiedCanvasNodes &&
                (!selected || (useSimplifiedSelectedCanvasNodes && !focused)) &&
                !isConnectSource &&
                !transformDrag &&
                !nodeLabelDrag &&
                !nodeLabelRotateDrag;
              if (renderSimplifiedNode) {
                return null;
              }
              const imageHref = nodeImage(node);
              const foregroundImageHref = nodeForegroundImage(node);
              const uprightStaticSelectionOutline = nodeUsesUprightStaticSelectionOutline(node, imageHref, foregroundImageHref);
              const uprightSelectionOutlineRect = uprightStaticSelectionOutline ? nodeUprightSelectionOutlineRect(node) : null;
              const nodeGeometryTransformValue = nodeGeometryTransform(node);
              const nodeScaleX = getNodeScaleX(node);
              const nodeScaleY = getNodeScaleY(node);
              const inverseScaleX = nodeScaleX === 0 ? 1 : 1 / nodeScaleX;
              const inverseScaleY = nodeScaleY === 0 ? 1 : 1 / nodeScaleY;
              const terminalStubDashArray = svgStrokeDashArray(node.params.strokeStyle);
              const terminalControlTransform = (x: number, y: number) => `translate(${x} ${y}) scale(${inverseScaleX} ${inverseScaleY})`;
              const handleTransform = (x: number, y: number) => `translate(${x} ${y})`;
              const handleGapX = 14;
              const handleGapY = 14;
              const rotateStemStart = TRANSFORM_ROTATE_STEM_START;
              const rotateStemEnd = TRANSFORM_ROTATE_STEM_END;
              const rotateHandleGap = TRANSFORM_ROTATE_HANDLE_GAP;
              const rotateHandlePoints = uprightStaticSelectionOutline
                ? nodeUprightRotateHandleControlPoints(node, rotateStemStart, rotateStemEnd, rotateHandleGap)
                : nodeRotateHandleControlPoints(node, rotateStemStart, rotateStemEnd, rotateHandleGap);
              const staticButtonEnabled = isBrowseMode && isStaticButtonEnabledForNode(node);
              const staticButtonState = staticButtonVisual?.nodeId === node.id ? staticButtonVisual.state : "";
              const staticButtonCornerRadius = Math.max(0, Number(node.params.cornerRadius || 8));
              const showStaticSelectionFrame = nodeIsStatic && selected && !uprightStaticSelectionOutline;
              const staticSelectionPadding = 10;
              const staticSelectionCornerSize = 12;
              const staticSelectionX = -node.size.width / 2 - staticSelectionPadding;
              const staticSelectionY = -node.size.height / 2 - staticSelectionPadding;
              const staticSelectionWidth = node.size.width + staticSelectionPadding * 2;
              const staticSelectionHeight = node.size.height + staticSelectionPadding * 2;
              const staticSelectionCornerPoints = [
                { x: staticSelectionX, y: staticSelectionY },
                { x: staticSelectionX + staticSelectionWidth - staticSelectionCornerSize, y: staticSelectionY },
                { x: staticSelectionX, y: staticSelectionY + staticSelectionHeight - staticSelectionCornerSize },
                { x: staticSelectionX + staticSelectionWidth - staticSelectionCornerSize, y: staticSelectionY + staticSelectionHeight - staticSelectionCornerSize }
              ];
              const nodeLabelVisible = nodeLabelShouldRender(node, deviceLabelsVisible);
              const nodeLabelContent = nodeLabelVisible ? nodeLabelText(node) : "";
              const nodeLabelIsVertical = nodeLabelVisible && nodeLabelVertical(node);
              const nodeLabelVerticalTokens = nodeLabelIsVertical ? nodeLabelVerticalSegments(nodeLabelContent) : [];
              const nodeLabelFontSizeValue = nodeLabelVisible ? nodeLabelFontSize(node) : 0;
              return (
                <g
                  key={node.id}
                  className={`diagram-node ${nodeIsBus ? "bus-node" : ""} ${nodeIsRoutableLineDevice ? "routable-line-node" : ""} ${isStorageBus ? "storage-node" : ""} ${uprightStaticSelectionOutline ? "static-upright-selection-node" : ""} ${staticButtonEnabled ? "static-button-enabled" : ""} ${staticButtonState ? `static-button-${staticButtonState}` : ""} ${multiNodeDragging && draggingNodeIdSet.has(node.id) ? "multi-drag-origin" : ""} ${singleNodeDragging && draggingNodeIdSet.has(node.id) ? "single-drag-origin" : ""} ${selected ? "selected" : ""} ${focused ? "focused" : ""} ${isConnectSource ? "connect-source" : ""} ${inactiveLayerGraphic ? "inactive-layer-graphic" : ""}`}
                  transform={`translate(${renderPosition.x} ${renderPosition.y})`}
                  onPointerDown={(event) => handleNodePointerDown(event, node)}
                  onPointerEnter={() => {
                    if (staticButtonEnabled) {
                      setStaticButtonFeedback(node.id, "hover");
                    }
                  }}
                  onPointerLeave={() => {
                    if (staticButtonEnabled) {
                      staticButtonPointerRef.current = null;
                      clearStaticButtonFeedback(node.id);
                    }
                  }}
                  onPointerUp={() => {
                    if (staticButtonEnabled && staticButtonVisual?.nodeId === node.id && staticButtonVisual.state === "pressed") {
                      setStaticButtonFeedback(node.id, "hover");
                    }
                  }}
                  onClick={(event) => handleStaticButtonClick(event, node)}
                  onContextMenu={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    if (!editable) {
                      return;
                    }
                    canvasInteractionRef.current = true;
                    projectListPointerInsideRef.current = false;
                    if (svgRef.current) {
                      const pointer = clampPointToCanvas(screenToSvgPoint(svgRef.current, event.clientX, event.clientY));
                      lastCanvasPointerRef.current = pointer;
                      updateMouseStatus(pointer);
                    }
                    if (routableLinePlacement) {
                      setRoutableLinePlacement(null);
                      resetRoutableLinePreviewState();
                      setMode("select");
                      return;
                    }
                    if (connectSource) {
                      setConnectSource(null);
                      resetConnectPreviewState();
                      setMode("select");
                      return;
                    }
                    if (!selectedNodeIdSet.has(node.id)) {
                      selectCanvasGraphics([node.id], []);
                    }
                    openGraphicContextMenu({ x: event.clientX, y: event.clientY, target: "node", nodeId: node.id });
                  }}
                  onDoubleClick={(event) => {
                    event.stopPropagation();
                    if (!editable) {
                      return;
                    }
                    if (isBusNode(node)) {
                      return;
                    }
                    selectCanvasGraphics([node.id], []);
                    setImageTarget({ kind: "node", nodeId: node.id });
                  }}
                >
                  <title>{node.name}</title>
                  {imageHref && !nodeIsBus && (
                    <clipPath id={`clip-${node.id}`}>
                      <rect
                        x={-node.size.width / 2}
                        y={-node.size.height / 2}
                        width={node.size.width}
                        height={node.size.height}
                        rx="8"
                      />
                    </clipPath>
                  )}
                  <g className="node-geometry" transform={nodeGeometryTransformValue}>
                    <rect
                      x={-node.size.width / 2}
                      y={-node.size.height / 2}
                      width={node.size.width}
                      height={node.size.height}
                      rx="8"
                      className={`node-hitbox ${nodeIsBus ? "bus-hitbox" : ""} ${nodeIsStatic ? "static-hitbox" : ""}`}
                    />
                    <MemoDeviceGlyph node={node} mode="geometry" colorDisplayMode={colorDisplayMode} colorPalette={colorPalette} />
                    <MemoDeviceGlyph node={node} mode="text" colorDisplayMode={colorDisplayMode} colorPalette={colorPalette} />
                    {staticButtonEnabled && (
                      <rect
                        x={-node.size.width / 2}
                        y={-node.size.height / 2}
                        width={node.size.width}
                        height={node.size.height}
                        rx={staticButtonCornerRadius}
                        className="static-button-feedback-surface"
                      />
                    )}
                    {showStaticSelectionFrame && (
                      <g className="node-static-selection-frame">
                        <rect
                          x={staticSelectionX}
                          y={staticSelectionY}
                          width={staticSelectionWidth}
                          height={staticSelectionHeight}
                          rx={Math.max(8, staticButtonCornerRadius + staticSelectionPadding)}
                          className="node-static-selection-glow"
                        />
                        {staticSelectionCornerPoints.map((point, index) => (
                          <rect
                            key={`static-selection-corner-${index}`}
                            x={point.x}
                            y={point.y}
                            width={staticSelectionCornerSize}
                            height={staticSelectionCornerSize}
                            rx="3"
                            className="node-static-selection-corner"
                          />
                        ))}
                      </g>
                    )}
                  </g>
                  {!nodeIsBus && (imageHref || foregroundImageHref) && (
                    <g className="node-upright-content" transform={nodeUprightScaleTransform(node)}>
                      {imageHref && nodeIsStatic && (
                        <image
                          href={imageHref}
                          x={-node.size.width / 2}
                          y={-node.size.height / 2}
                          width={node.size.width}
                          height={node.size.height}
                          preserveAspectRatio="xMidYMid slice"
                          clipPath={`url(#clip-${node.id})`}
                          className="node-background-image"
                        />
                      )}
                      {imageHref && !nodeIsStatic && (
                        <rect
                          x={-node.size.width / 2}
                          y={-node.size.height / 2}
                          width={node.size.width}
                          height={node.size.height}
                          rx="8"
                          className="node-image-cover"
                        />
                      )}
                      {imageHref && !nodeIsStatic && (
                        <image
                          href={imageHref}
                          x={-node.size.width / 2}
                          y={-node.size.height / 2}
                          width={node.size.width}
                          height={node.size.height}
                          preserveAspectRatio="xMidYMid slice"
                          clipPath={`url(#clip-${node.id})`}
                          className="node-background-image"
                        />
                      )}
                      {foregroundImageHref && (
                        <image
                          href={foregroundImageHref}
                          x={-node.size.width / 2}
                          y={-node.size.height / 2}
                          width={node.size.width}
                          height={node.size.height}
                          preserveAspectRatio="xMidYMid slice"
                          clipPath={`url(#clip-${node.id})`}
                          className="node-foreground-image"
                        />
                      )}
                    </g>
                  )}
                  {uprightSelectionOutlineRect && (
                    <rect
                      className="node-upright-selection-outline"
                      x={uprightSelectionOutlineRect.x}
                      y={uprightSelectionOutlineRect.y}
                      width={uprightSelectionOutlineRect.width}
                      height={uprightSelectionOutlineRect.height}
                      rx="4"
                    />
                  )}
                  {nodeLabelVisible && (
                    <g
                      className={`node-device-label ${selected ? "selected" : ""} ${focused ? "focused" : ""} ${nodeLabelIsVertical ? "vertical" : "horizontal"}`}
                      data-node-id={node.id}
                      data-label-owner="device"
                      transform={nodeLabelTransform(node)}
                      onPointerDown={isEditMode ? (event) => startNodeLabelDrag(event, node) : undefined}
                    >
                      {nodeLabelIsVertical ? (
                        nodeLabelVerticalTokens.map((segment: any, index: number) => (
                          <text
                            key={`${segment.text}-${index}`}
                            className={`node-label-vertical-token ${segment.numeric ? "numeric" : ""}`}
                            x="0"
                            y={nodeLabelVerticalTokenY(index, nodeLabelVerticalTokens.length, node)}
                            dominantBaseline="middle"
                            textAnchor="middle"
                            style={nodeLabelVerticalTokenStyle(node)}
                          >
                            {segment.text}
                          </text>
                        ))
                      ) : (
                        <text
                          x="0"
                          y="0"
                          dominantBaseline="middle"
                          textAnchor={nodeLabelTextAnchor(node)}
                          style={nodeLabelTextStyle(node)}
                        >
                          {nodeLabelContent}
                        </text>
                      )}
                      {isEditMode && selected && focused && selectedNodeCount === 1 && (
                        <g className="node-label-rotate-control" transform={`translate(0 ${formatSvgNumber(-nodeLabelFontSizeValue - 18)})`}>
                          <line x1="0" y1="8" x2="0" y2="0" />
                          <circle
                            cx="0"
                            cy="0"
                            r="6"
                            onPointerDown={(event) => startNodeLabelRotateDrag(event, node)}
                          >
                            <title>旋转标识</title>
                          </circle>
                        </g>
                      )}
                    </g>
                  )}
                  <g className="node-terminal-layer" transform={nodeGeometryTransformValue}>
                    {node.terminals.map((terminal: any) => {
                      const hideFixedTerminal = nodeIsBus || isStaticNode(node) || isRoutableLineDeviceKind(node.kind);
                      const disabled =
                        !hideFixedTerminal &&
                        (
                          (connectTerminalCompatibilityActive &&
                            !canConnectTerminals(connectSourceNode!, connectSource!.terminalId, node, terminal.id)) ||
                          (routableLineTerminalCompatibilityActive &&
                            Boolean(routableLineActiveTerminalType) &&
                            terminal.type !== routableLineActiveTerminalType)
                        );
                      const overlapped = isEditMode && overlappedTerminalKeys.has(`${node.id}:${terminal.id}`);
                      const renderPoint = terminalRenderLocalPoint(terminal, node.size, nodeScaleX, nodeScaleY, node.kind);
                      const stub = terminalStubSegment(terminal, nodeScaleX, nodeScaleY, 24, node.kind, node.size);
                      const terminalDisplayColor = getTerminalDisplayColor(node, terminal, colorDisplayMode, colorPalette);
                      return hideFixedTerminal ? null : (
                        <g
                          key={terminal.id}
                          transform={terminalControlTransform(renderPoint.x, renderPoint.y)}
                        >
                          <line
                            className={`terminal-stub ${terminal.type} ${disabled ? "disabled" : ""}`}
                            strokeDasharray={terminalStubDashArray}
                            style={{
                              stroke: disabled ? "#cbd5e1" : terminalDisplayColor,
                              strokeWidth: terminalStubStrokeWidth(node, terminal)
                            }}
                            x1={stub.from.x}
                            y1={stub.from.y}
                            x2={stub.to.x}
                            y2={stub.to.y}
                          />
                          <circle
                            className={`terminal-dot ${terminal.type} ${overlapped ? "overlapped" : ""} ${disabled ? "disabled" : ""}`}
                            style={{ "--terminal-color": terminalDisplayColor } as CSSProperties}
                            cx="0"
                            cy="0"
                            r={overlapped ? 7.2 : 6}
                            onPointerDown={isEditMode ? (event) => handleTerminalPointerDown(event, node, terminal.id) : undefined}
                          >
                            <title>{`${terminal.label} / ${terminal.type.toUpperCase()}`}</title>
                          </circle>
                        </g>
                      );
                    })}
                  </g>
                  {selected && focused && selectedNodeCount === 1 && !nodeIsRoutableLineDevice && (
                    isEditMode ? (
                    <g className={`transform-handles ${transformDrag && !isGroupTransformDrag(transformDrag) && transformDrag.nodeId === node.id && transformDrag.kind !== "rotate" ? "resizing" : ""}`}>
                      <line x1={rotateHandlePoints.stemStart.x} y1={rotateHandlePoints.stemStart.y} x2={rotateHandlePoints.stemEnd.x} y2={rotateHandlePoints.stemEnd.y} />
                      <g transform={handleTransform(rotateHandlePoints.handle.x, rotateHandlePoints.handle.y)}>
                        <circle
                          className="rotate-handle"
                          cx="0"
                          cy="0"
                          r="8"
                          onPointerDown={(event) => startSingleTransformDrag(event, node, "rotate")}
                        />
                      </g>
                      {SCALE_HANDLE_CONFIGS.map((handle: any) => {
                        const handlePoint = nodeScaleHandleControlPoint(node, handle, handleGapX, handleGapY, uprightStaticSelectionOutline);
                        const handleCursorClass = scaleHandleCursorClass(handle, uprightStaticSelectionOutline ? 0 : node.rotation);
                        return (
                          <g key={handle.id} transform={handleTransform(handlePoint.x, handlePoint.y)}>
                            <rect
                              className={`scale-handle ${handleCursorClass}`}
                              x="-8"
                              y="-8"
                              width="16"
                              height="16"
                              rx="3"
                              onPointerDown={(event) => startSingleTransformDrag(event, node, handle.kind, handle)}
                            />
                          </g>
                        );
                      })}
                    </g>
                    ) : null
                  )}
                </g>
              );
            })}
            {visibleMeasurementGroups.length > 0 && (
              <g className="measurement-layer" pointerEvents={isBrowseMode ? "none" : "auto"}>
                {visibleMeasurementGroups.map(renderMeasurementGroup)}
              </g>
            )}
            {renderSingleTransformRotateOriginGhost()}
            {renderGroupTransformPhotoPreview()}
            {renderTransformRotationTrajectory()}
            </g>
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
            {dragPreviewEdgeRoutes.map((route: any) => (
              <path key={`drag-preview-edge-${route.edgeId}`} d={route.path} className="connection-line drag-preview" style={connectionLineStyle(route.edgeId)} />
            ))}
            {terminalPressPreviewEdgeRoutes.map((route: any) => (
              <path key={`terminal-preview-edge-${route.edgeId}`} d={route.path} className="connection-line drag-preview" style={connectionLineStyle(route.edgeId)} />
            ))}
            {connectSource && (
              <path
                ref={(element) => {
                  connectPreviewPathElementRef.current = element;
                  if (element) {
                    flushConnectPreviewDom();
                  }
                }}
                d={connectPreviewDom.path}
                className="connection-preview-line"
                style={connectPreviewColor ? ({ "--connection-color": connectPreviewColor } as CSSProperties) : undefined}
              />
            )}
            {routableLinePlacement && routableLinePreview.path && (
              <path
                d={routableLinePreview.path}
                className="routable-line-drawing-preview"
                style={routableLinePlacementColor ? ({ "--connection-color": routableLinePlacementColor } as CSSProperties) : undefined}
              />
            )}
            {routableLineEndpointDragPreviewRoute && (
              <path
                d={routableLineEndpointDragPreviewRoute.path}
                className="routable-line-drawing-preview endpoint-retarget-preview"
                style={routableLineEndpointDragColor ? ({ "--connection-color": routableLineEndpointDragColor } as CSSProperties) : undefined}
              />
            )}
            {connectSource && (
              <g
                ref={(element) => {
                  connectDropHintElementRef.current = element;
                  if (element) {
                    flushConnectPreviewDom();
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
            {routableLineEndpointHandles.length > 0 && (
              <g className="routable-line-endpoint-handle-layer">
                {routableLineEndpointHandles.map((handle: any) => (
                  <circle
                    key={`${handle.node.id}-${handle.endpoint}`}
                    className={`routable-line-endpoint-handle ${handle.endpoint}`}
                    cx={handle.point.x}
                    cy={handle.point.y}
                    r="7"
                    onPointerDown={(event) => startRoutableLineEndpointDrag(event, handle.node, handle.endpoint)}
                  >
                    <title>{handle.endpoint === "source" ? "调整线路起点" : "调整线路终点"}</title>
                  </circle>
                ))}
              </g>
            )}
            {selectedRoutedEdge &&
              selectedEdge &&
              !(singleNodeDragging && dragAffectedEdgeIdSet.has(selectedEdge.id)) &&
              !(draggingDelta && dragPreviewEdgeIdSet.has(selectedEdge.id)) &&
              !(multiNodeDragging && dragOverlayEdgeIdSet.has(selectedEdge.id)) &&
              !groupTransformPreviewEdgeIdSet.has(selectedEdge.id) &&
              !terminalPressPreviewEdgeIdSet.has(selectedEdge.id) &&
              (() => {
              const edge = selectedEdge;
              const route = selectedRoutedEdge;
              const isRewiringSelectedEdge = rewiring?.edgeId === edge.id;
              const isManualPathSelectedEdge = manualPathPreviewRoute?.edgeId === edge.id;
              const routePoints = isManualPathSelectedEdge ? manualPathPreviewRoute.points : route.points;
              const displayPath = isRewiringSelectedEdge && rewiringPreviewRoute
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
              return (
                <g className="connection-group selected topmost" style={connectionLineStyle(edge.id)}>
                  <path
                    d={displayPath}
                    className="connection-hitline"
                    onContextMenu={isEditMode ? (event) => openEdgeContextMenu(event, edge.id, routePoints) : undefined}
                    onDoubleClick={isEditMode ? (event) => insertManualBendFromEdgePath(event, edge.id, routePoints) : undefined}
                    onPointerDown={isEditMode ? (event) => handleEdgePathPointerDown(event, edge.id, routePoints) : undefined}
                  />
                  <path
                    d={displayPath}
                    className="connection-line"
                    onContextMenu={isEditMode ? (event) => openEdgeContextMenu(event, edge.id, routePoints) : undefined}
                    onDoubleClick={isEditMode ? (event) => insertManualBendFromEdgePath(event, edge.id, routePoints) : undefined}
                    onPointerDown={isEditMode ? (event) => handleEdgePathPointerDown(event, edge.id, routePoints) : undefined}
                  />
                  {isEditMode && !isRewiringSelectedEdge && routePoints.slice(1).map((point: Point, index: number) => {
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
                        onPointerDown={(event) => startManualSegmentDrag(event, edge.id, segmentIndex, orientation, routePoints)}
                        onDoubleClick={(event) => insertManualBendFromEdgePath(event, edge.id, routePoints)}
                        onContextMenu={(event) => openEdgeContextMenu(event, edge.id, routePoints)}
                      />
                    );
                  })}
                  {isEditMode && !isRewiringSelectedEdge && routePoints.slice(2, -2).map((point: Point, index: number) => {
                    const routePointIndex = index + 2;
                    return (
                      <circle
                        key={`bend-${routePointIndex}`}
                        className="manual-bend-handle"
                        cx={point.x}
                        cy={point.y}
                        r={5.5}
                        onPointerDown={(event) => startManualPointDrag(event, edge.id, routePointIndex, routePoints)}
                        onDoubleClick={(event) => insertManualBendFromEdgePath(event, edge.id, routePoints)}
                        onContextMenu={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          deleteManualBendPoint(edge.id, routePointIndex, routePoints);
                        }}
                      />
                    );
                  })}
                  {renderBoundaryBusInternalConnector(sourceNode, sourceBusDotPoint, `${edge.id}-topmost-source-internal-connector`)}
                  {renderBoundaryBusInternalConnector(targetNode, targetBusDotPoint, `${edge.id}-topmost-target-internal-connector`)}
                  {isEditMode && sourcePoint && (
                    <circle
                      className="edge-endpoint-handle"
                      cx={rewiring?.edgeId === edge.id && rewiring.endpoint === "source" ? rewiring.previewPoint.x : sourcePoint.x}
                      cy={rewiring?.edgeId === edge.id && rewiring.endpoint === "source" ? rewiring.previewPoint.y : sourcePoint.y}
                      r={8}
                      onPointerDown={(event) => {
                        event.stopPropagation();
                        if (event.button !== 0 || !svgRef.current) {
                          return;
                        }
                        setRewiring({
                          edgeId: edge.id,
                          endpoint: "source",
                          previewPoint: clampPointToCanvas(screenToSvgPoint(svgRef.current, event.clientX, event.clientY)),
                          pointerId: event.pointerId
                        });
                        event.currentTarget.setPointerCapture(event.pointerId);
                      }}
                    />
                  )}
                  {isEditMode && targetPoint && (
                    <circle
                      className="edge-endpoint-handle"
                      cx={rewiring?.edgeId === edge.id && rewiring.endpoint === "target" ? rewiring.previewPoint.x : targetPoint.x}
                      cy={rewiring?.edgeId === edge.id && rewiring.endpoint === "target" ? rewiring.previewPoint.y : targetPoint.y}
                      r={8}
                      onPointerDown={(event) => {
                        event.stopPropagation();
                        if (event.button !== 0 || !svgRef.current) {
                          return;
                        }
                        setRewiring({
                          edgeId: edge.id,
                          endpoint: "target",
                          previewPoint: clampPointToCanvas(screenToSvgPoint(svgRef.current, event.clientX, event.clientY)),
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
                <text x="0" y="0" textAnchor="middle" dominantBaseline="middle">{resizeSizeHint.text}</text>
              </g>
            )}
            {isEditMode && canvasResizeHandles}
            </svg>
            {canvasResizePreviewRect && (
              <div
                className="canvas-resize-preview"
                style={{
                  left: canvasResizePreviewRect.left,
                  top: canvasResizePreviewRect.top,
                  width: canvasResizePreviewRect.width,
                  height: canvasResizePreviewRect.height
                }}
              />
            )}
            {isEditMode && (
              <div className="canvas-resize-hotzones" style={canvasResizeHotzoneStyle} aria-hidden="true">
                <div className="canvas-resize-hotzone canvas-resize-hotzone-left" onPointerDown={canvasResizeHotzoneHandlers.left} />
                <div className="canvas-resize-hotzone canvas-resize-hotzone-top" onPointerDown={canvasResizeHotzoneHandlers.top} />
                <div className="canvas-resize-hotzone canvas-resize-hotzone-right" onPointerDown={canvasResizeHotzoneHandlers.right} />
                <div className="canvas-resize-hotzone canvas-resize-hotzone-bottom" onPointerDown={canvasResizeHotzoneHandlers.bottom} />
                <div className="canvas-resize-hotzone canvas-resize-hotzone-top-left" onPointerDown={canvasResizeHotzoneHandlers.topLeft} />
                <div className="canvas-resize-hotzone canvas-resize-hotzone-top-right" onPointerDown={canvasResizeHotzoneHandlers.topRight} />
                <div className="canvas-resize-hotzone canvas-resize-hotzone-bottom-left" onPointerDown={canvasResizeHotzoneHandlers.bottomLeft} />
                <div className="canvas-resize-hotzone canvas-resize-hotzone-bottom-right" onPointerDown={canvasResizeHotzoneHandlers.bottomRight} />
              </div>
            )}
            {isEditMode && (nodeFloatingToolbar || edgeFloatingToolbar) && (
              <div className="canvas-floating-toolbar-layer">
                {nodeFloatingToolbar && (
                  <div className="canvas-floating-toolbar-wrapper" style={floatingToolbarWrapperStyle(nodeFloatingToolbar)}>
                    <div
                      className="canvas-floating-toolbar node-toolbar"
                      role="toolbar"
                      aria-label="选中图元快捷操作"
                      onPointerDown={(event) => event.stopPropagation()}
                      onClick={(event) => event.stopPropagation()}
                    >
                      <button type="button" title="复制" aria-label="复制" onClick={copySelection}>
                        <Copy size={floatingToolbarIconSize} />
                      </button>
                      <button type="button" title="剪切" aria-label="剪切" onClick={cutSelection}>
                        <Scissors size={floatingToolbarIconSize} />
                      </button>
                      <button type="button" title="删除" aria-label="删除" onClick={deleteSelection}>
                        <Trash2 size={floatingToolbarIconSize} />
                      </button>
                      <button type="button" title="图层修改" aria-label="图层修改" onClick={openLayerAssignmentDialog}>
                        <Layers size={floatingToolbarIconSize} />
                      </button>
                      <button type="button" title="置于当前图层" aria-label="置于当前图层" onClick={() => assignSelectedNodesToModelLayer(activeLayerId)}>
                        <Layers2 size={floatingToolbarIconSize} />
                      </button>
                      {canGroupSelectedGraphics && (
                        <button type="button" title="组合" aria-label="组合" onClick={groupSelectedGraphics}>
                          <Group size={floatingToolbarIconSize} />
                        </button>
                      )}
                      {canUngroupSelectedGraphics && (
                        <button type="button" title="解散" aria-label="解散" onClick={ungroupSelectedGraphics}>
                          <Ungroup size={floatingToolbarIconSize} />
                        </button>
                      )}
                      {canAddTemplateFromSelection && (
                        <button type="button" title="添加到模板库" aria-label="添加到模板库" onClick={openAddTemplateDialog}>
                          <Grid2X2 size={floatingToolbarIconSize} />
                        </button>
                      )}
                      <button type="button" title="标识显示" aria-label="标识显示" onClick={toggleSelectedNodeLabelDisplay}>
                        <Type size={floatingToolbarIconSize} />
                      </button>
                    </div>
                  </div>
                )}
                {edgeFloatingToolbar && (
                  <div className="canvas-floating-toolbar-wrapper" style={floatingToolbarWrapperStyle(edgeFloatingToolbar)}>
                    <div
                      className="canvas-floating-toolbar edge-toolbar"
                      role="toolbar"
                      aria-label="选中连接线快捷操作"
                      onPointerDown={(event) => event.stopPropagation()}
                      onClick={(event) => event.stopPropagation()}
                    >
                      <button type="button" title="复制连接线" aria-label="复制连接线" onClick={copySelection}>
                        <Copy size={floatingToolbarIconSize} />
                      </button>
                      <button type="button" title="添加拐点" aria-label="添加拐点" onClick={addManualBendToSelectedEdgeCenter}>
                        <CircleDot size={floatingToolbarIconSize} />
                      </button>
                      <button type="button" title="整理连接线" aria-label="整理连接线" onClick={tidySelectedEdgeRoute}>
                        <Route size={floatingToolbarIconSize} />
                      </button>
                      <button type="button" title="删除连接线" aria-label="删除连接线" onClick={deleteSelection}>
                        <Trash2 size={floatingToolbarIconSize} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
  );
}
