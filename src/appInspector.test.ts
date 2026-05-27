import { describe, expect, test } from "vitest";

async function readAppSource() {
  // @ts-ignore - tests run in Node, while the app tsconfig intentionally stays browser-focused.
  const { readFile } = await import("node:fs/promises");
  return readFile(new URL("./App.tsx", import.meta.url), "utf8") as Promise<string>;
}

async function readStyles() {
  // @ts-ignore - tests run in Node, while the app tsconfig intentionally stays browser-focused.
  const { readFile } = await import("node:fs/promises");
  return readFile(new URL("./styles.css", import.meta.url), "utf8") as Promise<string>;
}

async function readModelSource() {
  // @ts-ignore - tests run in Node, while the app tsconfig intentionally stays browser-focused.
  const { readFile } = await import("node:fs/promises");
  return readFile(new URL("./model.ts", import.meta.url), "utf8") as Promise<string>;
}

async function readServerSource() {
  // @ts-ignore - tests run in Node, while the app tsconfig intentionally stays browser-focused.
  const { readFile } = await import("node:fs/promises");
  return readFile(new URL("../server/image-server.mjs", import.meta.url), "utf8") as Promise<string>;
}

function selectedTerminalCountRow(source: string) {
  const headerIndex = source.indexOf('renderChineseParamHeader("terminalCount")');
  if (headerIndex < 0) {
    return "";
  }
  const rowStart = source.lastIndexOf("<tr>", headerIndex);
  const rowEnd = source.indexOf("</tr>", headerIndex);
  return source.slice(rowStart, rowEnd);
}

function cssRuleBlock(styles: string, selector: string) {
  const start = styles.indexOf(selector);
  if (start < 0) {
    return "";
  }
  const end = styles.indexOf("}", start);
  return styles.slice(start, end);
}

describe("graph inspector panel", () => {
  test("shows selected element terminal count as readonly text instead of an editable field", async () => {
    const source = await readAppSource();
    const row = selectedTerminalCountRow(source);

    expect(row).toContain("graph-readonly-value");
    expect(row).not.toContain("updateTerminalCount");
    expect(row).not.toContain("<input");
  });

  test("uses fuzzy connection drop targets with an animated snap hint", async () => {
    const source = await readAppSource();
    const styles = await readStyles();

    expect(source).toContain("CONNECT_TERMINAL_SNAP_TOLERANCE");
    expect(source).toContain("CONNECT_BUS_SNAP_TOLERANCE");
    expect(source).toContain("connectDropTargetPoint");
    expect(source).toContain("connect-drop-hint");
    expect(styles).toContain("@keyframes connectDropPulse");
    expect(styles).toContain(".connect-drop-hint-ring");
  });

  test("uses the same fuzzy snap hint while dragging existing connection endpoints", async () => {
    const source = await readAppSource();

    expect(source).toContain("dropTargetPoint?: Point");
    expect(source).toContain("dropTarget?: ConnectTarget");
    expect(source).toContain("findRewireTargetAtPoint(previewPoint, rewiring)");
    expect(source).toContain("const dropTargetPoint = target ? connectTargetSnapPoint(target) : undefined;");
    expect(source).toContain("dropTarget: target ?? undefined");
    expect(source).toContain("rewiring?.dropTargetPoint");
    expect(source).toContain("const activeDropReady = connectDropReady || Boolean(rewiring?.dropTargetPoint) || Boolean(nodeTerminalSnapTarget);");
  });

  test("uses the fuzzy snap hint while dragging device terminals near matching device terminals", async () => {
    const source = await readAppSource();
    const finishStart = source.indexOf("const finishNodeDrag = () =>");
    const finishEnd = source.indexOf("const moveSelection", finishStart);
    const finishBlock = source.slice(finishStart, finishEnd);

    expect(source).toContain("type NodeTerminalSnapTarget");
    expect(source).toContain("findNodeTerminalSnapTarget");
    expect(source).toContain("nodeTerminalSnapTarget");
    expect(source).toContain("nodeTerminalSnapTarget?.point");
    expect(source).toContain("|| Boolean(nodeTerminalSnapTarget)");
    expect(source).toContain("CONNECT_TERMINAL_SNAP_TOLERANCE");
    expect(finishBlock).toContain("applyNodeTerminalSnap");
    expect(finishBlock.indexOf("applyNodeTerminalSnap")).toBeLessThan(finishBlock.indexOf("adjustEdgesAfterNodeMove"));
  });

  test("reconciles implicit overlapping terminal connections after node moves", async () => {
    const source = await readAppSource();
    const styles = await readStyles();
    const finishStart = source.indexOf("const finishNodeDrag = () =>");
    const finishEnd = source.indexOf("const moveSelection", finishStart);
    const finishBlock = source.slice(finishStart, finishEnd);
    const overlappedRule = cssRuleBlock(styles, ".terminal-dot.overlapped");

    expect(source).toContain("reconcileOverlappingTerminalConnections");
    expect(source).toContain("finalizeMovedNodeEdgesFast");
    expect(source).toContain("getOverlappingTerminalGroups");
    expect(source).toContain("getTerminalBusContactGroups");
    expect(source).toContain("findNodeBusSnapTarget");
    expect(source).toContain("pointOnBusForSnap");
    expect(source).toContain("overlappedTerminalKeys");
    expect(source).toContain("terminal-dot ${terminal.type} ${overlapped ? \"overlapped\" : \"\"}");
    expect(source).toContain("r={overlapped ? 7.2 : 6}");
    expect(overlappedRule).not.toContain("#f97316");
    expect(overlappedRule).not.toContain("drop-shadow");
    expect(finishBlock).toContain("finalizeMovedNodeEdgesFast");
    expect(finishBlock.indexOf("finalizeMovedNodeEdgesFast")).toBeGreaterThan(finishBlock.indexOf("adjustEdgesAfterNodeMove"));
  });

  test("keeps connection previews on the lightweight stored-route path", async () => {
    const source = await readAppSource();
    const previewStart = source.indexOf("const buildConnectPreviewPath = (");
    const previewEnd = source.indexOf("const connectPreviewColor", previewStart);
    const previewBlock = source.slice(previewStart, previewEnd);

    expect(previewBlock).toContain("routeEdgesForStoredRendering");
    expect(previewBlock).not.toContain("routeEdgesForRendering");
    expect(previewBlock).not.toContain("simpleOrthogonalPolyline");
  });

  test("routes connection previews through the snapped target terminal normal", async () => {
    const source = await readAppSource();
    const previewStart = source.indexOf("const buildConnectPreviewPath = (");
    const previewEnd = source.indexOf("const connectPreviewColor", previewStart);
    const previewBlock = source.slice(previewStart, previewEnd);
    const pointerStart = source.indexOf("if (connectSource) {");
    const pointerEnd = source.indexOf("if (terminalPress", pointerStart);
    const pointerBlock = source.slice(pointerStart, pointerEnd);

    expect(source).toContain("connectDropTargetRef");
    expect(source).not.toContain("setConnectDropTarget");
    expect(previewBlock).toContain("const previewTarget = target;");
    expect(previewBlock).toContain("targetId: previewTarget?.node.id ?? \"floating-connect-preview-target\"");
    expect(previewBlock).toContain("targetTerminalId: previewTarget?.terminalId ?? \"t1\"");
    expect(previewBlock).toContain("targetPoint: previewTarget");
    expect(pointerBlock).toContain("target ?? null");
  });

  test("keeps endpoint rewire previews on the lightweight stored-route path", async () => {
    const source = await readAppSource();
    const previewStart = source.indexOf("const rewiringPreviewRoute = useMemo");
    const previewEnd = source.indexOf("const manualPathPreviewRoute", previewStart);
    const previewBlock = source.slice(previewStart, previewEnd);

    expect(previewBlock).toContain("routeEdgesForStoredRendering");
    expect(previewBlock).not.toContain("routeEdgesForRendering");
    expect(previewBlock).not.toContain("simpleOrthogonalPolyline");
  });

  test("keeps terminal move previews on the lightweight stored-route path", async () => {
    const source = await readAppSource();
    const previewStart = source.indexOf("const terminalPressPreviewEdgeRoutes = useMemo");
    const previewEnd = source.indexOf("const terminalPressPreviewEdgeIdSet", previewStart);
    const previewBlock = source.slice(previewStart, previewEnd);

    expect(previewBlock).toContain("routeEdgesForStoredRendering");
    expect(previewBlock).not.toContain("routeEdgesForRendering");
    expect(previewBlock).not.toContain("simpleOrthogonalPolyline");
  });

  test("draws original dragged edges as dashed ghosts and moving edges as selected solid lines", async () => {
    const source = await readAppSource();
    const styles = await readStyles();
    const ghostRule = cssRuleBlock(styles, ".connection-line.drag-ghost");
    const previewRule = cssRuleBlock(styles, ".connection-line.drag-preview");
    const nodeRenderIndex = source.indexOf("{viewportNodes.map((node) =>");
    const ghostRenderIndex = source.indexOf("{dragGhostEdgeRoutes.map");
    const previewRenderIndex = source.indexOf("{dragPreviewEdgeRoutes.map");

    expect(ghostRule).toContain("stroke-dasharray");
    expect(ghostRule).toContain("opacity: 0.34");
    expect(previewRule).toContain("stroke: #dc2626");
    expect(previewRule).toContain("stroke-width: 4");
    expect(previewRule).not.toContain("stroke-dasharray");
    expect(ghostRenderIndex).toBeGreaterThan(-1);
    expect(ghostRenderIndex).toBeLessThan(nodeRenderIndex);
    expect(previewRenderIndex).toBeGreaterThan(nodeRenderIndex);
    expect(source).toContain("!(draggingDelta && dragPreviewEdgeIdSet.has(selectedEdge.id))");
  });

  test("only previews dragged connection lines when both endpoint graphics are visible", async () => {
    const source = await readAppSource();
    const previewStart = source.indexOf("const dragPreviewEdgeRoutes = useMemo");
    const previewEnd = source.indexOf("const dragPreviewEdgeIdSet", previewStart);
    const previewBlock = source.slice(previewStart, previewEnd);
    const ghostStart = source.indexOf("const dragGhostEdgeRoutes = useMemo");
    const ghostEnd = source.indexOf("useEffect(() =>", ghostStart);
    const ghostBlock = source.slice(ghostStart, ghostEnd);

    expect(previewBlock).toContain("visibleEdgeIdSet.has(edge.id)");
    expect(ghostBlock).toContain("visibleEdgeIdSet.has(edge.id)");
  });

  test("limits selection and modification operations to the active model layer", async () => {
    const source = await readAppSource();
    const activeLayerStart = source.indexOf("const activeLayerNodes = useMemo");
    const activeLayerEnd = source.indexOf("const activeSelectedNodeIds = useMemo", activeLayerStart);
    const activeLayerBlock = source.slice(activeLayerStart, activeLayerEnd);
    const selectionStateStart = source.indexOf("const activeSelectedNodeIds = useMemo");
    const selectionStateEnd = source.indexOf("const activeSelectedEdgeIds = useMemo", selectionStateStart);
    const selectionStateBlock = source.slice(selectionStateStart, selectionStateEnd);
    const copyStart = source.indexOf("const copySelection =");
    const pasteStart = source.indexOf("const pasteSelection =", copyStart);
    const copyCutDeleteBlock = source.slice(copyStart, pasteStart);
    const dragStart = source.indexOf("const handleNodePointerDown");
    const dragEnd = source.indexOf("const startMarquee", dragStart);
    const dragBlock = source.slice(dragStart, dragEnd);
    const layoutStart = source.indexOf("const applySelectedNodeLayout");
    const layoutEnd = source.indexOf("const alignSelected", layoutStart);
    const layoutBlock = source.slice(layoutStart, layoutEnd);

    expect(activeLayerBlock).toContain("(node.layerId ?? DEFAULT_MODEL_LAYER_ID) === activeLayerId");
    expect(activeLayerBlock).toContain("activeLayerNodeIdSet.has(edge.sourceId) || activeLayerNodeIdSet.has(edge.targetId)");
    expect(selectionStateBlock).toContain("selectedNodeIds.filter((nodeId) => activeLayerNodeIdSet.has(nodeId))");
    expect(selectionStateBlock).toContain("const selectedNodeId = activeSelectedNodeIds[0] ?? \"\"");
    expect(selectionStateBlock).toContain("new Set(activeSelectedNodeIds)");
    expect(source).toContain("setSelectedNodeIds(activeLayerNodes.map((node) => node.id))");
    expect(source).toContain("selectGraphicsInRect(activeLayerNodes, activeLayerRoutedEdges");
    expect(copyCutDeleteBlock).toContain("buildCanvasClipboard(visibleNodes, visibleEdges, routedEdges, activeSelectedNodeIds, activeSelectedEdgeIds)");
    expect(copyCutDeleteBlock).toContain("deleteNodesWithConnectedEdges(nodes, edges, activeSelectedNodeIds)");
    expect(dragBlock).toContain("let dragNodeIds = nodeWasSelected ? activeSelectedNodeIds : [node.id]");
    expect(dragBlock).toContain("dragNodeIds = nodeWasSelected ? activeSelectedNodeIds : [...activeSelectedNodeIds, node.id]");
    expect(dragBlock).toContain("if (!activeLayerNodeIdSet.has(node.id))");
    expect(layoutBlock).toContain("layoutNodes(nodes, activeSelectedNodeIds)");
    expect(source).toContain("if (!activeLayerEdgeIdSet.has(edgeId))");
    expect(source).toContain("for (const node of visibleNodes)");
  });

  test("checks a newly drawn connection route before committing it to the model", async () => {
    const source = await readAppSource();
    const commitStart = source.indexOf("const commitNewConnectionEdge");
    const commitEnd = source.indexOf("const finishConnectToTarget", commitStart);
    const commitBlock = source.slice(commitStart, commitEnd);
    const finishStart = source.indexOf("const finishConnectToTarget");
    const finishEnd = source.indexOf("const finishRewiring", finishStart);
    const finishBlock = source.slice(finishStart, finishEnd);
    const terminalStart = source.indexOf("const handleTerminalPointerDown");
    const terminalEnd = source.indexOf("const ensureSavedBeforeExport", terminalStart);
    const terminalBlock = source.slice(terminalStart, terminalEnd);

    expect(commitBlock).toContain("prepareConnectionEdgeForCommit");
    expect(commitBlock).toContain("canvasBounds, routedEdges");
    expect(commitBlock).toContain("联络线绘制失败");
    expect(commitBlock).toContain("prepared.edge");
    expect(commitBlock.indexOf("prepareConnectionEdgeForCommit")).toBeLessThan(commitBlock.indexOf("setEdges"));
    expect(finishBlock).toContain("return commitNewConnectionEdge(newEdge");
    expect(terminalBlock).toContain("commitNewConnectionEdge(newEdge");
  });

  test("prepares rewired connection geometry before committing endpoint changes", async () => {
    const source = await readAppSource();
    const rewiringStart = source.indexOf("const finishRewiring");
    const rewiringEnd = source.indexOf("const handleDrop", rewiringStart);
    const rewiringBlock = source.slice(rewiringStart, rewiringEnd);

    expect(rewiringBlock).toContain("prepareConnectionEdgeForCommit");
    expect(rewiringBlock).toContain("canvasBounds,");
    expect(rewiringBlock).toContain("routedEdges");
    expect(rewiringBlock).toContain("prepared.edge");
    expect(rewiringBlock.indexOf("prepareConnectionEdgeForCommit")).toBeLessThan(rewiringBlock.indexOf("setEdges"));
  });

  test("commits drag-end nodes, edges, and drag state without forcing a synchronous render", async () => {
    const source = await readAppSource();
    const finishStart = source.indexOf("const finishNodeDrag = () =>");
    const finishEnd = source.indexOf("const moveSelection", finishStart);
    const finishBlock = source.slice(finishStart, finishEnd);

    expect(source).not.toContain("import { flushSync } from \"react-dom\";");
    expect(finishBlock).not.toContain("flushSync(() =>");
    expect(source).toContain("const commitFastMovedGraph");
    expect(source).toContain("setNodes(nextNodes)");
    expect(source).toContain("setEdges(nextEdges)");
    expect(finishBlock).toContain("commitFastMovedGraph");
    expect(finishBlock).toContain("setDragging(null)");
    const commitStart = finishBlock.indexOf("commitFastMovedGraph");
    const commitEnd = finishBlock.indexOf("writeOperationLog", commitStart);
    const commitBlock = finishBlock.slice(commitStart, commitEnd);
    expect(commitBlock).toContain("nextEdges");
    expect(commitBlock).toContain("setDragging(null)");
    expect(commitBlock.indexOf("commitFastMovedGraph")).toBeLessThan(commitBlock.indexOf("setDragging(null)"));
  });

  test("defers expensive post-move connection route optimization after a single graphic move", async () => {
    const source = await readAppSource();
    const helperStart = source.indexOf("const rebuildSingleAffectedConnectionRoute");
    const helperEnd = source.indexOf("const finalizeMovedNodeEdgesFast", helperStart);
    const helperBlock = source.slice(helperStart, helperEnd);
    const fastStart = source.indexOf("const finalizeMovedNodeEdgesFast", helperStart);
    const fastEnd = source.indexOf("const optimizeMovedNodeEdgeRoutes", fastStart);
    const fastBlock = source.slice(fastStart, fastEnd);
    const optimizeStart = source.indexOf("const optimizeMovedNodeEdgeRoutes", fastEnd);
    const optimizeEnd = source.indexOf("const scheduleMovedEdgeOptimization", optimizeStart);
    const optimizeBlock = source.slice(optimizeStart, optimizeEnd);
    const scheduleStart = source.indexOf("const scheduleMovedEdgeOptimization", optimizeEnd);
    const scheduleEnd = source.indexOf("const commitFastMovedGraph", scheduleStart);
    const scheduleBlock = source.slice(scheduleStart, scheduleEnd);
    const finishStart = source.indexOf("const finishNodeDrag = () =>");
    const finishEnd = source.indexOf("const moveSelection", finishStart);
    const finishBlock = source.slice(finishStart, finishEnd);

    expect(source).toContain("rebuildSingleConnectionRoute");
    expect(helperStart).toBeGreaterThan(-1);
    expect(helperBlock).toContain("affectedEdgeIds.length === 1");
    expect(helperBlock).toContain("rebuildSingleConnectionRoute");
    expect(fastStart).toBeGreaterThan(-1);
    expect(fastBlock).not.toContain("rebuildSingleAffectedConnectionRoute");
    expect(fastBlock).not.toContain("rerouteEdgesAroundMovedNodes");
    expect(optimizeBlock).toContain("routePointsForMovedNodeBlockers");
    expect(optimizeBlock).toContain("rebuildSingleAffectedConnectionRoute");
    expect(optimizeBlock).toContain("rerouteEdgesAroundMovedNodes");
    expect(source).toContain("const shouldRunDeferredMoveOptimization");
    expect(source).not.toContain("movedIds.size <= 1 || selectedEdgeIds.size === 1");
    expect(source).toContain("if (blockedEdgeIds.size > 0)");
    expect(source).toContain("return affectedConnectionCount === 1");
    expect(scheduleBlock).toContain("!shouldRunDeferredMoveOptimization(optimizationEdges, movedNodeIds, selectedEdgeIds, blockedEdgeIds)");
    expect(scheduleBlock).toContain("deferredMoveOptimizationCancelRef.current = null");
    expect(scheduleBlock).toContain("scheduleIdleWork");
    expect(scheduleBlock).toContain("latestNodesRef.current !== expectedNodes");
    expect(finishBlock).toContain("finalizeMovedNodeEdgesFast");
    expect(finishBlock).toContain("commitFastMovedGraph");
    expect(finishBlock).not.toContain("routePointsForMovedNodeBlockers");
  });

  test("uses live routing data while deferred routes are stale after a drag commit", async () => {
    const source = await readAppSource();
    const routingStart = source.indexOf("const deferredRoutingNodes = useDeferredValue(visibleNodes);");
    const routingEnd = source.indexOf("const routedEdges = useMemo", routingStart);
    const routingBlock = source.slice(routingStart, routingEnd);

    expect(routingBlock).toContain("const deferredRoutingIsCurrent");
    expect(routingBlock).toContain("deferredRoutingNodes === visibleNodes");
    expect(routingBlock).toContain("deferredRoutingEdges === visibleEdges");
    expect(routingBlock).toContain("!deferredRoutingIsCurrent");
    expect(routingBlock).toContain("routingNodes = requiresLiveRouting ? visibleNodes : deferredRoutingNodes");
    expect(routingBlock).toContain("routingEdges = requiresLiveRouting ? visibleEdges : deferredRoutingEdges");
  });

  test("uses stored connection geometry on open and only enables full routing after edits", async () => {
    const source = await readAppSource();
    const routingStart = source.indexOf("const deferredRoutingNodes = useDeferredValue(visibleNodes);");
    const routingEnd = source.indexOf("const routedEdgeById", routingStart);
    const routingBlock = source.slice(routingStart, routingEnd);

    expect(source).toContain("routeRenderingReady");
    expect(source).toContain("setRouteRenderingReady(true)");
    expect(source).toContain("routeEdgesForStoredRendering");
    expect(source).toContain("routeEdgesForCachedStoredRendering");
    expect(source).toContain("setRouteRenderingReady(false)");
    expect(routingBlock).toContain("routeRenderingEnabled");
    expect(routingBlock).toContain("pendingStoredRouteEdgeIdsRef.current");
    expect(routingBlock).toContain("routeEdgesForCachedStoredRendering");
    expect(routingBlock).toContain("routeEdgesForIncrementalRendering");
    expect(routingBlock).toContain("cachedRoutedEdgesRef.current");
    expect(routingBlock).toContain("return routeEdgesForStoredRendering");
    expect(routingBlock).not.toContain("routeEdgesForRendering(routingNodes, routingEdges");
  });

  test("keeps svg export and canvas size checks on stored connection geometry", async () => {
    const source = await readAppSource();
    const exportStart = source.indexOf("export function buildSvgDocument");
    const exportEnd = source.indexOf("const nodeMarkup", exportStart);
    const exportBlock = source.slice(exportStart, exportEnd);
    const sizeStart = source.indexOf("const commitCanvasSizeDraft");
    const sizeEnd = source.indexOf("const resetCanvasSizeDraft", sizeStart);
    const sizeBlock = source.slice(sizeStart, sizeEnd);

    expect(source).not.toContain("routeEdgesForRendering,");
    expect(exportBlock).toContain("routeEdgesForStoredRendering(nodes, edges, canvasSize)");
    expect(exportBlock).not.toContain("routeEdgesForRendering");
    expect(sizeBlock).toContain("routeEdgesForStoredRendering(nodes, edges");
    expect(sizeBlock).not.toContain("routeEdgesForRendering");
  });

  test("clips the main svg render list to the current viewport while preserving selected graphics", async () => {
    const source = await readAppSource();
    const routeCullStart = source.indexOf("const viewportRoutedEdges = useMemo");
    const routeCullEnd = source.indexOf("const activeLayerRoutedEdges", routeCullStart);
    const routeCullBlock = source.slice(routeCullStart, routeCullEnd);
    const edgeRenderIndex = source.indexOf("{viewportRoutedEdges.map((route) =>");
    const nodeRenderIndex = source.indexOf("{viewportNodes.map((node) =>");

    expect(source).toContain("expandViewBoxForRendering(viewBox)");
    expect(source).toContain("nodeIntersectsRenderViewport");
    expect(source).toContain("routeIntersectsRenderViewport");
    expect(routeCullBlock).toContain("activeSelectedEdgeSet.has(route.edgeId)");
    expect(routeCullBlock).toContain("routeIntersectsRenderViewport(route, renderViewportBounds)");
    expect(routeCullBlock).toContain("selectedNodeIdSet.has(node.id)");
    expect(routeCullBlock).toContain("draggingNodeIdSet.has(node.id)");
    expect(edgeRenderIndex).toBeGreaterThan(-1);
    expect(nodeRenderIndex).toBeGreaterThan(-1);
  });

  test("defers selected device parameter view construction until the device tab is active", async () => {
    const source = await readAppSource();
    const paramStart = source.indexOf("const deviceParamPanelActive");
    const paramEnd = source.indexOf("useEffect(() => {\n    if (!layers.some", paramStart);
    const paramBlock = source.slice(paramStart, paramEnd);

    expect(paramBlock).toContain("const deviceParamPanelActive = inspectorTab === \"device\"");
    expect(paramBlock).toContain("deviceParamPanelActive && selectedNode ? libraryTemplateByKind.get(selectedNode.kind) : undefined");
    expect(paramBlock).toContain("deviceParamPanelActive && selectedNode ? buildContainerDeviceParameterViews");
  });

  test("keeps post-drag edge ordering linear and avoids sorting every route", async () => {
    const source = await readAppSource();
    const renderStart = source.indexOf("const renderedRoutedEdges = useMemo");
    const renderEnd = source.indexOf("const routedEdgeById", renderStart);
    const renderBlock = source.slice(renderStart, renderEnd);

    expect(renderBlock).toContain("activeSelectedEdgeSet.size === 0");
    expect(renderBlock).toContain("return routedEdges");
    expect(renderBlock).toContain("regularRoutes.push(route)");
    expect(renderBlock).toContain("selectedRoutes.push(route)");
    expect(renderBlock).not.toContain(".sort(");
  });

  test("limits full routing to direct path edits and keeps node dragging on the lightweight preview path", async () => {
    const source = await readAppSource();
    const routingStart = source.indexOf("const affectedRoutingEdgeIds = useMemo");
    const routingEnd = source.indexOf("const routedEdges = useMemo", routingStart);
    const routingBlock = source.slice(routingStart, routingEnd);
    const dragPreviewStart = source.indexOf("const dragPreviewEdgeRoutes = useMemo");
    const dragPreviewEnd = source.indexOf("const dragPreviewEdgeIdSet", dragPreviewStart);
    const dragPreviewBlock = source.slice(dragPreviewStart, dragPreviewEnd);

    expect(source).toContain("routeEdgesForIncrementalRendering");
    expect(source).toContain("pendingRouteEdgeIdsRef");
    expect(source).toContain("pendingStoredRouteEdgeIdsRef");
    expect(source).toContain("markStoredRouteEdgesDirty(dirtyEdgeIdsForMovedLocalRoutes");
    expect(source).toContain("markRouteEdgesDirty(dirtyEdgeIdsAfterMove");
    expect(routingBlock).not.toContain("manualPathDrag.edgeId");
    expect(routingBlock).not.toContain("rewiring.edgeId");
    expect(routingBlock).not.toContain("terminalPress?.moved");
    expect(routingBlock).not.toContain("dragging.edgeIds");
    expect(routingBlock).not.toContain("draggingNodeIdSet.has(edge.sourceId)");
    expect(routingBlock).not.toContain("draggingNodeIdSet.has(edge.targetId)");
    expect(dragPreviewBlock).toContain("dragging.affectedEdges.flatMap");
    expect(dragPreviewBlock).not.toContain("edges.flatMap");
    expect(dragPreviewBlock).toContain("draggingNodeIdSet.has(edge.sourceId)");
    expect(dragPreviewBlock).toContain("preserveDraggedRouteShape");
  });

  test("keeps node drag snapshots lightweight for large models", async () => {
    const source = await readAppSource();
    const dragStart = source.indexOf("const handleNodePointerDown");
    const dragEnd = source.indexOf("const handlePointerMove", dragStart);
    const dragStartBlock = source.slice(dragStart, dragEnd);

    expect(dragStartBlock).toContain("affectedEdgeIdsForDrag");
    expect(dragStartBlock).toContain("affectedEdgeIdsForDrag.has(edge.id)");
    expect(dragStartBlock).toContain("const affectedEdgesForDrag = edges.filter((edge) => affectedEdgeIdsForDrag.has(edge.id))");
    expect(dragStartBlock).toContain("affectedEdges: affectedEdgesForDrag");
    expect(dragStartBlock).toContain("originalRoutePoints: Object.fromEntries(\n        affectedEdgesForDrag.map");
    expect(dragStartBlock).not.toContain("(routeByEdgeId.get(edge.id) ?? []).map((routePoint) => ({ ...routePoint }))");
    expect(dragStartBlock).not.toContain("originalEdgePoints: Object.fromEntries(\n        edges.map");
    expect(dragStartBlock).not.toContain("originalRoutePoints: Object.fromEntries(\n        edges.map");
  });

  test("limits drag-end rerouting to moved-node blocker candidates", async () => {
    const source = await readAppSource();
    const helperStart = source.indexOf("const routePointsForMovedNodeBlockers");
    const helperEnd = source.indexOf("const sameOptionalPoint", helperStart);
    const helperBlock = source.slice(helperStart, helperEnd);
    const adjustStart = source.indexOf("const adjustEdgesAfterNodeMove");
    const adjustEnd = source.indexOf("const rebuildSingleAffectedConnectionRoute", adjustStart);
    const adjustBlock = source.slice(adjustStart, adjustEnd);
    const finishStart = source.indexOf("const finishNodeDrag = () =>");
    const finishEnd = source.indexOf("const moveSelection", finishStart);
    const finishBlock = source.slice(finishStart, finishEnd);

    expect(helperStart).toBeGreaterThan(-1);
    expect(helperBlock).toContain("getRouteBlockingCandidates(movedNodes)");
    expect(helperBlock).toContain("movedCandidateBounds");
    expect(helperBlock).toContain("boxesOverlap(routePointBounds(route.points, 8), movedCandidateBounds)");
    expect(helperBlock).toContain("getRouteBlockingCandidateNodesFromBoxes");
    expect(helperBlock).toContain("routedEdgeById.get(edge.id)");
    expect(helperBlock).toContain("baseRoutePoints[edge.id]");
    expect(adjustBlock).toContain("if (!sourceMoved && !targetMoved && !preserveRouteEdgeIds.has(edge.id))");
    expect(adjustBlock).toContain("return edge;");
    expect(source).toContain("const optimizeMovedNodeEdgeRoutes");
    expect(source).toContain("const routePointsForReroute = hasPrecomputedBlockers");
    expect(source).toContain("? precomputedBlockedRoutePoints");
    expect(source).toContain(": routePointsForMovedNodeBlockers");
    expect(finishBlock).toContain("commitFastMovedGraph");
    expect(finishBlock).not.toContain("const routePointsForReroute = routePointsForMovedNodeBlockers");
  });

  test("schedules local rerouting when moved graphics interfere with unrelated connection lines", async () => {
    const source = await readAppSource();
    const scheduleStart = source.indexOf("const scheduleMovedEdgeOptimization");
    const scheduleEnd = source.indexOf("const commitFastMovedGraph", scheduleStart);
    const scheduleBlock = source.slice(scheduleStart, scheduleEnd);

    expect(scheduleBlock).toContain("movedNodeIds.length > MAX_ORIGINAL_POSITION_REROUTE_MOVED_NODES");
    expect(scheduleBlock).toContain("const optimizationEdges = localRouteOptimizationEdges");
    expect(scheduleBlock).toContain("const blockedRoutePoints = routePointsForMovedNodeBlockers(nextNodes, optimizationEdges, movedNodeIds, {});");
    expect(scheduleBlock).toContain("const blockedEdgeIds = new Set(Object.keys(blockedRoutePoints));");
    expect(scheduleBlock).toContain("!shouldRunDeferredMoveOptimization(optimizationEdges, movedNodeIds, selectedEdgeIds, blockedEdgeIds)");
    expect(scheduleBlock).toContain("blockedRoutePoints");
    expect(scheduleBlock).not.toContain("dirtyEdgeIdsAfterMove(\n        expectedEdges,\n        optimized.edges,\n        movedNodeIds");
  });

  test("reroutes connection lines near original positions after moving a small number of graphics", async () => {
    const source = await readAppSource();
    const modelSource = await readModelSource();
    const helperStart = source.indexOf("const routePointsNearOriginalMovedNodes");
    const helperEnd = source.indexOf("const sameOptionalPoint", helperStart);
    const helperBlock = source.slice(helperStart, helperEnd);
    const scheduleStart = source.indexOf("const scheduleMovedEdgeOptimization");
    const scheduleEnd = source.indexOf("const commitFastMovedGraph", scheduleStart);
    const scheduleBlock = source.slice(scheduleStart, scheduleEnd);
    const commitStart = source.indexOf("const commitFastMovedGraph");
    const commitEnd = source.indexOf("const clampPointToCanvas", commitStart);
    const commitBlock = source.slice(commitStart, commitEnd);
    const finishStart = source.indexOf("const finishNodeDrag = () =>");
    const finishEnd = source.indexOf("const moveSelection", finishStart);
    const finishBlock = source.slice(finishStart, finishEnd);
    const rerouteStart = modelSource.indexOf("export function rerouteEdgesAroundMovedNodes");
    const rerouteEnd = modelSource.indexOf("function samePoint", rerouteStart);
    const rerouteBlock = modelSource.slice(rerouteStart, rerouteEnd);

    expect(source).toContain("const MAX_ORIGINAL_POSITION_REROUTE_MOVED_NODES = 5");
    expect(source).toContain("const MOVE_ROUTE_LOCAL_SEARCH_PADDING = 96");
    expect(source).toContain("const localRouteOptimizationEdges");
    expect(helperStart).toBeGreaterThan(-1);
    expect(helperBlock).toContain("movedIds.size > MAX_ORIGINAL_POSITION_REROUTE_MOVED_NODES");
    expect(helperBlock).toContain("originalPositions[node.id]");
    expect(helperBlock).toContain("routePointBounds(route.points, 8)");
    expect(helperBlock).toContain("routeTouchesExpandedBoxes");
    expect(helperBlock).toContain("movedIds.has(edge.sourceId) || movedIds.has(edge.targetId)");
    expect(scheduleBlock).toContain("routePointsNearOriginalMovedNodes");
    expect(scheduleBlock).toContain("optimizationEdges");
    expect(scheduleBlock).toContain("const releasedEdgeIds");
    expect(scheduleBlock).toContain("forcedRerouteEdgeIds");
    expect(scheduleBlock).toContain("optimizationEdges");
    expect(commitBlock).toContain("originalPositions");
    expect(commitBlock).toContain("scheduleMovedEdgeOptimization(");
    expect(finishBlock).toContain("activeDragging.originalPositions");
    expect(rerouteBlock).toContain("forceEdgeIds: Iterable<string>");
    expect(rerouteBlock).toContain("forcedEdgeIds.has(edge.id)");
  });

  test("spatially filters route blockers and connection segments before scoring commit candidates", async () => {
    const source = await readModelSource();
    const selectStart = source.indexOf("function selectRouteCandidate");
    const selectEnd = source.indexOf("function pathWithCrossingArcs", selectStart);
    const selectBlock = source.slice(selectStart, selectEnd);
    const commitStart = source.indexOf("function selectCommitSafeRoute");
    const commitEnd = source.indexOf("function designCommitSafeRoute", commitStart);
    const commitBlock = source.slice(commitStart, commitEnd);

    expect(source).toContain("function filterBlockersForRoutePoints");
    expect(source).toContain("function filterSegmentsForRoutePoints");
    expect(selectBlock).toContain("filterBlockersForRoutePoints(candidate, blockers");
    expect(selectBlock).toContain("filterSegmentsForRoutePoints(candidate, avoidedSegments");
    expect(commitBlock).toContain("filterBlockersForRoutePoints(simplified, nodes");
    expect(commitBlock).toContain("filterSegmentsForRoutePoints(simplified, avoidedSegments");
  });

  test("caps orthogonal routing lane candidates to avoid quadratic searches in dense connection areas", async () => {
    const source = await readModelSource();
    const laneStart = source.indexOf("function candidateLanes");
    const laneEnd = source.indexOf("function buildRouteCandidates", laneStart);
    const laneBlock = source.slice(laneStart, laneEnd);

    expect(source).toContain("const ROUTE_MAX_LANES_PER_AXIS");
    expect(source).toContain("function prioritizeLaneValues");
    expect(laneBlock).toContain("prioritizeLaneValues");
    expect(laneBlock).not.toContain("return { xs: uniqueSorted(xValues), ys: uniqueSorted(yValues) };");
  });

  test("defers full terminal overlap detection off the drag release frame", async () => {
    const source = await readAppSource();
    const overlapStart = source.indexOf("const terminalOverlapNodes");
    const overlapEnd = source.indexOf("const nodeTerminalSnapTarget", overlapStart);
    const overlapBlock = source.slice(overlapStart, overlapEnd);

    expect(overlapBlock).toContain("dragging && draggingDelta ? dragPreviewNodes : deferredRoutingNodes");
    expect(overlapBlock).toContain("terminalOverlapAffectedNodeIds");
    expect(overlapBlock).toContain("getOverlappingTerminalGroups(terminalOverlapNodes, terminalOverlapAffectedNodeIds)");
    expect(overlapBlock).toContain("getTerminalBusContactGroups(terminalOverlapNodes, 0, terminalOverlapAffectedNodeIds)");
    expect(overlapBlock).not.toContain("getOverlappingTerminalGroups(dragPreviewNodes, dragging ? draggingNodeIdSet : undefined)");
  });

  test("uses animation-frame coalescing and lightweight undo snapshots for node drag moves", async () => {
    const source = await readAppSource();
    const refsStart = source.indexOf("const pendingNodeDragMoveRef");
    const dragMoveStart = source.indexOf("const applyNodeDragMove");
    const dragMoveEnd = source.indexOf("const finishNodeDrag", dragMoveStart);
    const dragMoveBlock = source.slice(dragMoveStart, dragMoveEnd);
    const finishStart = source.indexOf("const finishNodeDrag = () =>", dragMoveEnd);
    const finishEnd = source.indexOf("const moveSelection", finishStart);
    const finishBlock = source.slice(finishStart, finishEnd);
    const pointerStart = source.indexOf("const handlePointerMove = (event: PointerEvent<SVGSVGElement>)");
    const pointerEnd = source.indexOf("const handleWheel", pointerStart);
    const pointerBlock = source.slice(pointerStart, pointerEnd);
    const undoStart = source.indexOf("const cloneProjectState");
    const undoEnd = source.indexOf("const requestCanvasFrameCenter", undoStart);
    const undoBlock = source.slice(undoStart, undoEnd);
    const undoActionStart = source.indexOf("const undoLastOperation = () =>");
    const undoActionEnd = source.indexOf("useEffect(() =>", undoActionStart);
    const undoActionBlock = source.slice(undoActionStart, undoActionEnd);

    expect(refsStart).toBeGreaterThan(-1);
    expect(dragMoveBlock).toContain("window.requestAnimationFrame");
    expect(dragMoveBlock).toContain("pendingNodeDragMoveRef.current");
    expect(dragMoveBlock).toContain("pushUndoSnapshot(true, false)");
    expect(dragMoveBlock).toContain("renderPreview = true");
    expect(source).toContain("mousePositionTextRef");
    expect(source).not.toContain("setMousePosition");
    expect(source).not.toContain("const [mousePosition");
    expect(source).toContain("mousePositionTextRef.current.textContent");
    expect(source).toContain("connectPreviewDomRef");
    expect(source).toContain("connectPreviewPathElementRef");
    expect(source).toContain("connectDropHintElementRef");
    expect(source).not.toContain("setConnectPreviewPoint");
    expect(finishBlock).toContain("flushPendingNodeDragMove(false)");
    expect(pointerBlock).toContain("scheduleNodeDragMove(point, event.ctrlKey, event.shiftKey)");
    expect(pointerBlock).not.toContain("setDragging((current) =>");
    expect(undoBlock).toContain("deepModelSnapshot");
    expect(undoBlock).toContain("nodes: deepModelSnapshot ? cloneNodesForUndo(nodes) : nodes");
    expect(undoActionBlock).toContain("deferredMoveOptimizationCancelRef.current?.()");
    expect(undoActionBlock).toContain("pendingStoredRouteEdgeIdsRef.current = new Set()");
    expect(undoActionBlock).toContain("markRouteEdgesDirty(new Set([");
    expect(undoActionBlock).toContain("...snapshot.edges.map((edge) => edge.id)");
  });

  test("defers bus terminal synchronization and only writes local draft from manual save", async () => {
    const source = await readAppSource();
    const busSyncStart = source.indexOf("const synchronized = synchronizeBusTerminalsWithEdges(syncNodes, syncEdges);");
    const busSyncEffectStart = source.indexOf("const endpointSignature = connectionEndpointSignature(edges);");
    const busSyncEffectEnd = source.indexOf("const canvasBounds", busSyncEffectStart);
    const busSyncEffectBlock = source.slice(busSyncEffectStart, busSyncEffectEnd);
    const saveDraftStart = source.indexOf("const saveDraftProject =");
    const saveDraftEnd = source.indexOf("const saveCurrentProject", saveDraftStart);
    const saveDraftBlock = source.slice(saveDraftStart, saveDraftEnd);
    const saveStart = source.indexOf("const saveCurrentProject");
    const saveEnd = source.indexOf("const renameProjectRecord", saveStart);
    const saveBlock = source.slice(saveStart, saveEnd);
    const topologyStaleStart = source.indexOf("拓扑结果已过期");

    expect(source).toContain("const scheduleIdleWork");
    expect(source).toContain("requestIdleCallback");
    expect(source).toContain("const connectionEndpointSignature");
    expect(busSyncEffectBlock).toContain("lastBusTerminalSyncSignatureRef.current === endpointSignature");
    expect(busSyncEffectBlock).toContain("lastBusTerminalSyncSignatureRef.current = endpointSignature");
    expect(source.slice(Math.max(0, busSyncStart - 300), busSyncStart + 300)).toContain("scheduleIdleWork");
    expect(saveDraftBlock).toContain("DRAFT_PROJECT_STORAGE_KEY");
    expect(saveDraftBlock).toContain("window.localStorage.setItem");
    expect(saveBlock).toContain("saveDraftProject(targetId");
    expect(saveBlock).toContain("saveDraftProject(record.id");
    expect(source).not.toContain("[activeProjectId, activeSchemeId, canvasBackgroundColor, canvasBackgroundImage, canvasBackgroundImageAssetId, canvasHeight, canvasWidth, currentUnit, deviceIndexCounters, edges, nodes, powerBaseValue, powerUnit, projectName, voltageUnit]");
    expect(source.slice(Math.max(0, topologyStaleStart - 400), topologyStaleStart + 300)).toContain("scheduleIdleWork");
  });

  test("keeps drag boundary checks and route dirty marking local to affected connection lines", async () => {
    const source = await readAppSource();
    const boundaryStart = source.indexOf("const nodeMoveGeometryInsideCanvas");
    const boundaryEnd = source.indexOf("const nearestBoundarySafeDelta", boundaryStart);
    const boundaryBlock = source.slice(boundaryStart, boundaryEnd);
    const dirtyStart = source.indexOf("const dirtyEdgeIdsForMovedLocalRoutes");
    const dirtyEnd = source.indexOf("const selectedRoutedEdge", dirtyStart);
    const dirtyBlock = source.slice(dirtyStart, dirtyEnd);
    const commitStart = source.indexOf("const commitFastMovedGraph");
    const commitEnd = source.indexOf("const clampPointToCanvas", commitStart);
    const commitBlock = source.slice(commitStart, commitEnd);
    const scheduleStart = source.indexOf("const scheduleMovedEdgeOptimization");
    const scheduleEnd = source.indexOf("const commitFastMovedGraph", scheduleStart);
    const scheduleBlock = source.slice(scheduleStart, scheduleEnd);

    expect(boundaryBlock).toContain("const relevantNodeIds = new Set(nodeIds)");
    expect(boundaryBlock).toContain("for (const edge of affectedEdgesForMove)");
    expect(boundaryBlock).toContain("const nextNodes = nodes.flatMap");
    expect(boundaryBlock).not.toContain("const nextNodes = nodes.map");
    expect(dirtyBlock).toContain("Object.keys(originalRoutePoints)");
    expect(dirtyBlock).not.toContain("for (const edge of edges)");
    expect(commitBlock).toContain("markStoredRouteEdgesDirty(dirtyEdgeIdsForMovedLocalRoutes");
    expect(commitBlock).not.toContain("markStoredRouteEdgesDirty(dirtyEdgeIdsAfterMove");
    expect(scheduleBlock).toContain("for (const edge of optimizationEdges)");
    expect(scheduleBlock).not.toContain("edgeReferenceDiffIds(expectedEdges, optimized.edges)");
  });

  test("reuses the element tree while drag-only geometry changes do not alter tree content", async () => {
    const source = await readAppSource();
    const elementTreeStart = source.indexOf("const elementTreeSignature = useMemo");
    const elementTreeEnd = source.indexOf("useEffect(() => {\n    setSelectedEdgeIds", elementTreeStart);
    const elementTreeBlock = source.slice(elementTreeStart, elementTreeEnd);

    expect(source).toContain("elementTreeCacheSignature");
    expect(source).toContain("elementTreeCacheRef");
    expect(elementTreeBlock).toContain("elementTreeCacheRef.current.signature === elementTreeSignature");
    expect(elementTreeBlock).toContain("return elementTreeCacheRef.current.tree");
    expect(elementTreeBlock).toContain("buildElementTree(deferredElementTreeNodes, deferredElementTreeEdges, libraryTemplates)");
  });

  test("bounds right-panel tree and topology warning rendering for large models", async () => {
    const source = await readAppSource();
    const styles = await readStyles();
    const treeStart = source.indexOf("const renderElementTreePanel = () =>");
    const treeEnd = source.indexOf("const topologyWarningDisplayMessage", treeStart);
    const treeBlock = source.slice(treeStart, treeEnd);
    const validationStart = source.indexOf("{topologyErrors.length > 0 && (");
    const validationEnd = source.indexOf("</section>", validationStart);
    const validationBlock = source.slice(validationStart, validationEnd);

    expect(source).toContain("ELEMENT_TREE_INITIAL_ITEM_LIMIT");
    expect(source).toContain("ELEMENT_TREE_ITEM_LIMIT_STEP");
    expect(treeBlock).toContain("const visibleItems = group.items.slice(0, visibleLimit)");
    expect(treeBlock).toContain("className=\"element-tree-more\"");
    expect(source).toContain("TOPOLOGY_WARNING_PAGE_SIZE");
    expect(source).toContain("topologyWarningPageCount");
    expect(source).toContain("normalizedTopologyWarningPage * TOPOLOGY_WARNING_PAGE_SIZE");
    expect(validationBlock).toContain("validation-pagination");
    expect(styles).toContain("content-visibility: auto");
    expect(styles).toContain(".validation-pagination");
  });

  test("adds a topbar color palette entry and passes the mode into canvas coloring", async () => {
    const source = await readAppSource();
    const topbarStart = source.indexOf("<header className=\"topbar\">");
    const topbarEnd = source.indexOf("</header>", topbarStart);
    const topbarBlock = source.slice(topbarStart, topbarEnd);
    const terminalStart = source.indexOf("<g className=\"node-terminal-layer\"");
    const terminalEnd = source.indexOf("{selected && selectedNodeCount === 1", terminalStart);
    const terminalBlock = source.slice(terminalStart, terminalEnd);

    expect(source).toContain("type ColorDisplayMode");
    expect(source).toContain("colorDisplayMode");
    expect(source).toContain("toggleColorDisplayMode");
    expect(topbarBlock).toContain("aria-label=\"颜色切换\"");
    expect(topbarBlock).toContain("aria-label=\"配色设置\"");
    expect(topbarBlock).toContain("<Paintbrush size={16} />");
    expect(topbarBlock).toContain("<Palette size={16} />");
    expect(topbarBlock).toContain("氢能、热能始终按能源类型显示");
    expect(source).toContain("getConnectionStrokeColor(edge, nodeById, colorDisplayMode, colorPalette)");
    expect(source).toContain("getDeviceStrokeColor(node, colorDisplayMode, colorPalette)");
    expect(terminalBlock).toContain("getTerminalDisplayColor(node, terminal, colorDisplayMode, colorPalette)");
    expect(terminalBlock).toContain("\"--terminal-color\"");
  });

  test("opens a configurable color palette dialog from the topbar", async () => {
    const source = await readAppSource();
    const serverSource = await readServerSource();
    const topbarStart = source.indexOf("<header className=\"topbar\">");
    const topbarEnd = source.indexOf("</header>", topbarStart);
    const topbarBlock = source.slice(topbarStart, topbarEnd);

    expect(source).toContain("colorPaletteDialogOpen");
    expect(source).toContain("colorPaletteDraft");
    expect(source).toContain("saveColorPalette");
    expect(source).toContain("resetEnergyColors");
    expect(source).toContain("resetVoltageColors");
    expect(source).toContain("addVoltageColorRow");
    expect(source).toContain("voltageColorVisibility");
    expect(source).toContain("currentModelVoltageColorKeys");
    expect(source).toContain("visibleVoltageColorRows");
    expect(source).toContain("nearestVoltageColor");
    expect(source).toContain("fillMissingVoltageColorRows");
    expect(source).toContain("window.alert(`当前模型存在");
    expect(source).toContain("fetchBackendColorConfig");
    expect(source).toContain("saveBackendColorConfigPayload");
    expect(source).toContain("serializeColorConfigForStorage");
    expect(source).toContain("backendColorConfigLoadedRef");
    expect(source).toContain("lastPersistedColorConfigPayloadRef");
    expect(topbarBlock).toContain("aria-label=\"配色设置\"");
    expect(source).toContain("按能流类型");
    expect(source).toContain("按电压等级");
    expect(source).toContain("全部电压等级");
    expect(source).toContain("当前模型电压等级");
    expect(source).toContain("交流电");
    expect(source).toContain("直流电");
    expect(source).toContain("氢能");
    expect(source).toContain("热能");
    expect(source).toContain("电压基值");
    expect(source).toContain("AC/DC");
    expect(source).toContain("type ColorPalette");
    expect(source).toContain("colorPalette");
    expect(source).toContain("getConnectionStrokeColor(edge, nodeById, colorDisplayMode, colorPalette)");
    expect(source).toContain("getDeviceStrokeColor(node, colorDisplayMode, colorPalette)");
    expect(source).toContain("getTerminalDisplayColor(node, terminal, colorDisplayMode, colorPalette)");
    expect(serverSource).toContain("const colorConfigPath");
    expect(serverSource).toContain("readColorConfig");
    expect(serverSource).toContain("writeColorConfig");
    expect(serverSource).toContain("handleSaveColorConfig");
    expect(serverSource).toContain("\"/api/color-config\"");
  });

  test("moves model layer definition controls from the inspector table to a topbar dialog", async () => {
    const source = await readAppSource();
    const styles = await readStyles();
    const topbarStart = source.indexOf("<header className=\"topbar\">");
    const topbarEnd = source.indexOf("</header>", topbarStart);
    const topbarBlock = source.slice(topbarStart, topbarEnd);

    expect(source).toContain("layerDialogOpen");
    expect(source).toContain("setLayerDialogOpen(true)");
    expect(topbarBlock).toContain("aria-label=\"图层管理\"");
    expect(source).toContain("id=\"layer-dialog-title\"");
    expect(source).toContain("renderLayerManager()");
    expect(source).toContain("新增图层");
    expect(source).toContain("nextDefaultModelLayerName");
    expect(source).toContain("`图层${index}`");
    expect(source).not.toContain("请输入新图层名称");
    expect(source).not.toContain("重命名图层");
    expect(source).not.toContain("renderChineseParamHeader(\"layers\", \"图层\")");
    expect(source).toContain("renderChineseParamHeader(\"layerId\", \"所属图层\")");
    expect(styles).toContain(".layer-dialog");
  });

  test("deletes model layer graphics after confirming non-empty layer deletion", async () => {
    const source = await readAppSource();
    const deleteStart = source.indexOf("const deleteModelLayer");
    const deleteEnd = source.indexOf("const renderLayerManager", deleteStart);
    const deleteBlock = source.slice(deleteStart, deleteEnd);
    const managerStart = source.indexOf("const renderLayerManager");
    const managerEnd = source.indexOf("const saveCurrentProject", managerStart);
    const managerBlock = source.slice(managerStart, managerEnd);

    expect(deleteBlock).toContain("nodeIdsInLayer");
    expect(deleteBlock).toContain("该图层内共有");
    expect(deleteBlock).toContain("继续删除将同时删除这些图元及相关联络线");
    expect(deleteBlock).toContain("deleteNodesWithConnectedEdges(nodes, edges, nodeIdsInLayer)");
    expect(deleteBlock).toContain("setSelectedNodeIds([])");
    expect(deleteBlock).toContain("setSelectedEdgeId(\"\")");
    expect(deleteBlock).toContain("setSelectedEdgeIds([])");
    expect(deleteBlock).toContain("setConnectSource(null)");
    expect(deleteBlock).toContain("setRewiring(null)");
    expect(deleteBlock).not.toContain("不能删除当前激活图层");
    expect(deleteBlock).not.toContain("该图层内图元将移动到当前激活图层");
    expect(managerBlock).toContain("disabled={layers.length <= 1}");
    expect(managerBlock).not.toContain("disabled={layers.length <= 1 || layer.id === activeLayerId}");
  });

  test("opens a dialog from one context menu action for assigning selected graphics to a model layer", async () => {
    const source = await readAppSource();
    const styles = await readStyles();
    const contextStart = source.indexOf("{contextMenu && (");
    const contextEnd = source.indexOf("{projectMenu && (", contextStart);
    const contextBlock = source.slice(contextStart, contextEnd);

    expect(source).toContain("assignSelectedNodesToModelLayer");
    expect(source).toContain("layerAssignmentDialogOpen");
    expect(source).toContain("layerAssignmentTargetId");
    expect(source).toContain("openLayerAssignmentDialog");
    expect(source).toContain("applyLayerAssignmentDialog");
    expect(contextBlock).toContain("openLayerAssignmentDialog");
    expect(contextBlock).toContain("图层修改");
    expect(contextBlock).not.toContain("修改所属图层");
    expect(contextBlock).not.toContain("layers.map((layer)");
    expect(contextBlock).not.toContain("assignSelectedNodesToModelLayer(layer.id)");
    expect(source).toContain("id=\"layer-assignment-title\"");
    expect(source).toContain("目标图层");
    expect(styles).toContain(".layer-assignment-dialog");
    expect(styles).toContain(".layer-assignment-field");
  });

  test("removes layer-order actions from the topbar, context menu, and graph inspector", async () => {
    const source = await readAppSource();
    const topbarStart = source.indexOf("<header className=\"topbar\">");
    const topbarEnd = source.indexOf("</header>", topbarStart);
    const topbarBlock = source.slice(topbarStart, topbarEnd);
    const contextStart = source.indexOf("{contextMenu && (");
    const contextEnd = source.indexOf("{projectMenu && (", contextStart);
    const contextBlock = source.slice(contextStart, contextEnd);

    expect(source).not.toContain("const moveSelectedLayer");
    expect(source).not.toContain("renderChineseParamHeader(\"layerOrder\")");
    expect(source).not.toContain("BringToFront");
    expect(source).not.toContain("SendToBack");
    expect(topbarBlock).not.toContain("aria-label=\"图层向上\"");
    expect(topbarBlock).not.toContain("aria-label=\"图层向下\"");
    expect(topbarBlock).not.toContain("aria-label=\"图层置顶\"");
    expect(topbarBlock).not.toContain("aria-label=\"图层置底\"");
    expect(contextBlock).not.toContain("图层向上");
    expect(contextBlock).not.toContain("图层向下");
    expect(contextBlock).not.toContain("图层置顶");
    expect(contextBlock).not.toContain("图层置底");
  });

  test("guards page unload and model switching when the current model has unsaved changes", async () => {
    const source = await readAppSource();
    const styles = await readStyles();
    const loadStart = source.indexOf("const loadSavedProject =");
    const loadEnd = source.indexOf("const createSchemeRecord", loadStart);
    const loadBlock = source.slice(loadStart, loadEnd);
    const projectListStart = source.indexOf("{isExpanded && <div className=\"scheme-projects\">");
    const projectListEnd = source.indexOf("</div>}", projectListStart);
    const projectListBlock = source.slice(projectListStart, projectListEnd);

    expect(source).toContain("type UnsavedChangeAction");
    expect(source).toContain("pendingUnsavedAction");
    expect(source).toContain("requestUnsavedChangeAction");
    expect(source).toContain("resolveUnsavedChangeAction");
    expect(source).toContain("window.addEventListener(\"beforeunload\", handleBeforeUnload)");
    expect(source).toContain("当前模型尚未保存");
    expect(source).toContain("不保存继续切换");
    expect(source).toContain("保存后切换");
    expect(source).toContain("退出操作");
    expect(source).toContain("requestLoadSavedProject(project, scheme.id)");
    expect(projectListBlock).not.toContain("loadSavedProject(project, scheme.id)");
    expect(loadBlock).toContain("setUndoStack([])");
    expect(loadBlock).toContain("clearNodeDragMoveSchedule()");
    expect(loadBlock).toContain("draggingRef.current = null");
    expect(loadBlock).toContain("setDragging(null)");
    expect(loadBlock).toContain("setSelectedEdgeIds([])");
    expect(loadBlock).not.toContain("pushUndoSnapshot(false)");
    expect(styles).toContain(".unsaved-change-dialog");
  });

  test("marks graph edits dirty and keeps load/save/internal sync from re-dirtying the current model", async () => {
    const source = await readAppSource();
    const dirtyEffectStart = source.indexOf("const currentGraphDirtyBaseline = ()");
    const dirtyEffectEnd = source.indexOf("const clearTransientSelectionState", dirtyEffectStart);
    const dirtyBlock = source.slice(dirtyEffectStart, dirtyEffectEnd);
    const pasteStart = source.indexOf("const pasteSelection = () =>");
    const pasteEnd = source.indexOf("const finishMarqueeSelection", pasteStart);
    const pasteBlock = source.slice(pasteStart, pasteEnd);
    const loadStart = source.indexOf("const loadSavedProject =");
    const loadEnd = source.indexOf("const requestUnsavedChangeAction", loadStart);
    const loadBlock = source.slice(loadStart, loadEnd);
    const saveStart = source.indexOf("const saveCurrentProject =");
    const saveEnd = source.indexOf("const renameProjectRecord", saveStart);
    const saveBlock = source.slice(saveStart, saveEnd);
    const busSyncStart = source.indexOf("const synchronized = synchronizeBusTerminalsWithEdges(syncNodes, syncEdges);");
    const busSyncEnd = source.indexOf("if (synchronized.nodes !== syncNodes)", busSyncStart);
    const busSyncBlock = source.slice(busSyncStart, busSyncEnd);

    expect(source).toContain("type GraphDirtyBaseline");
    expect(source).toContain("graphDirtyBaselineRef");
    expect(source).toContain("suppressNextGraphDirtyRef");
    expect(dirtyBlock).toContain("graphDirtyBaselineChanged(previousBaseline, nextBaseline)");
    expect(dirtyBlock).toContain("setHasUnsavedChanges(true)");
    expect(pasteBlock).toContain("pushUndoSnapshot();");
    expect(pasteBlock).not.toContain("pushUndoSnapshot(false)");
    expect(loadBlock).toContain("suppressNextGraphDirtyRef.current = true");
    expect(saveBlock).toContain("graphDirtyBaselineRef.current = currentGraphDirtyBaseline()");
    expect(busSyncBlock).toContain("suppressNextGraphDirtyRef.current = true");
  });

  test("keeps full saved-scheme normalization off the initial render path", async () => {
    const source = await readAppSource();
    const savedProjectNormalizerStart = source.indexOf("function normalizeSavedProjectIndexes");
    const savedProjectNormalizerEnd = source.indexOf("function normalizeSavedSchemeIndexes", savedProjectNormalizerStart);
    const savedProjectNormalizerBlock = source.slice(savedProjectNormalizerStart, savedProjectNormalizerEnd);

    expect(source).toContain("const lastPersistedSchemesPayloadRef = useRef<string | null>(null)");
    expect(source).not.toContain("const initialSchemesPayload");
    expect(source).not.toContain("const normalizedSchemesPayload = useMemo");
    expect(source).toContain("const normalizedSchemesPayload = serializeSchemesForStorage(schemes);");
    expect(savedProjectNormalizerBlock).not.toContain("assignMissingDeviceIndexes");
  });
});
