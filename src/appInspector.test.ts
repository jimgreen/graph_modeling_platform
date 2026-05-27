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

  test("routes connection previews through the obstacle-aware router", async () => {
    const source = await readAppSource();
    const previewStart = source.indexOf("const connectPreviewPath = useMemo");
    const previewEnd = source.indexOf("const connectPreviewColor", previewStart);
    const previewBlock = source.slice(previewStart, previewEnd);

    expect(previewBlock).toContain("routeEdgesForRendering");
    expect(previewBlock).not.toContain("simpleOrthogonalPolyline");
  });

  test("routes endpoint rewire previews through the obstacle-aware router", async () => {
    const source = await readAppSource();
    const previewStart = source.indexOf("const rewiringPreviewRoute = useMemo");
    const previewEnd = source.indexOf("const manualPathPreviewRoute", previewStart);
    const previewBlock = source.slice(previewStart, previewEnd);

    expect(previewBlock).toContain("routeEdgesForRendering");
    expect(previewBlock).not.toContain("simpleOrthogonalPolyline");
  });

  test("routes terminal move previews through the obstacle-aware router", async () => {
    const source = await readAppSource();
    const previewStart = source.indexOf("const terminalPressPreviewEdgeRoutes = useMemo");
    const previewEnd = source.indexOf("const terminalPressPreviewEdgeIdSet", previewStart);
    const previewBlock = source.slice(previewStart, previewEnd);

    expect(previewBlock).toContain("routeEdgesForRendering");
    expect(previewBlock).not.toContain("simpleOrthogonalPolyline");
  });

  test("draws original dragged edges as dashed ghosts and moving edges as selected solid lines", async () => {
    const source = await readAppSource();
    const styles = await readStyles();
    const ghostRule = cssRuleBlock(styles, ".connection-line.drag-ghost");
    const previewRule = cssRuleBlock(styles, ".connection-line.drag-preview");
    const nodeRenderIndex = source.indexOf("{nodes.map((node) =>");
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
    expect(scheduleBlock).toContain("scheduleIdleWork");
    expect(scheduleBlock).toContain("latestNodesRef.current !== expectedNodes");
    expect(finishBlock).toContain("finalizeMovedNodeEdgesFast");
    expect(finishBlock).toContain("commitFastMovedGraph");
    expect(finishBlock).not.toContain("routePointsForMovedNodeBlockers");
  });

  test("uses live routing data while deferred routes are stale after a drag commit", async () => {
    const source = await readAppSource();
    const routingStart = source.indexOf("const deferredRoutingNodes = useDeferredValue(nodes);");
    const routingEnd = source.indexOf("const routedEdges = useMemo", routingStart);
    const routingBlock = source.slice(routingStart, routingEnd);

    expect(routingBlock).toContain("const deferredRoutingIsCurrent");
    expect(routingBlock).toContain("deferredRoutingNodes === nodes");
    expect(routingBlock).toContain("deferredRoutingEdges === edges");
    expect(routingBlock).toContain("!deferredRoutingIsCurrent");
    expect(routingBlock).toContain("routingNodes = requiresLiveRouting ? nodes : deferredRoutingNodes");
    expect(routingBlock).toContain("routingEdges = requiresLiveRouting ? edges : deferredRoutingEdges");
  });

  test("uses stored connection geometry on open and only enables full routing after edits", async () => {
    const source = await readAppSource();
    const routingStart = source.indexOf("const deferredRoutingNodes = useDeferredValue(nodes);");
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
    expect(source).toContain("markStoredRouteEdgesDirty(dirtyEdgeIdsAfterMove");
    expect(source).toContain("markRouteEdgesDirty(dirtyEdgeIdsAfterMove");
    expect(routingBlock).toContain("manualPathDrag.edgeId");
    expect(routingBlock).toContain("rewiring.edgeId");
    expect(routingBlock).toContain("terminalPress?.moved");
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
    expect(helperBlock).toContain("getRouteBlockingCandidateNodes");
    expect(helperBlock).toContain("routedEdgeById.get(edge.id)");
    expect(helperBlock).toContain("baseRoutePoints[edge.id]");
    expect(adjustBlock).toContain("if (!sourceMoved && !targetMoved && !preserveRouteEdgeIds.has(edge.id))");
    expect(adjustBlock).toContain("return edge;");
    expect(source).toContain("const optimizeMovedNodeEdgeRoutes");
    expect(source).toContain("const routePointsForReroute = routePointsForMovedNodeBlockers");
    expect(finishBlock).toContain("commitFastMovedGraph");
    expect(finishBlock).not.toContain("const routePointsForReroute = routePointsForMovedNodeBlockers");
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

    expect(refsStart).toBeGreaterThan(-1);
    expect(dragMoveBlock).toContain("window.requestAnimationFrame");
    expect(dragMoveBlock).toContain("pendingNodeDragMoveRef.current");
    expect(dragMoveBlock).toContain("pushUndoSnapshot(true, false)");
    expect(dragMoveBlock).toContain("renderPreview = true");
    expect(finishBlock).toContain("flushPendingNodeDragMove(false)");
    expect(pointerBlock).toContain("scheduleNodeDragMove(point, event.ctrlKey, event.shiftKey)");
    expect(pointerBlock).not.toContain("setDragging((current) =>");
    expect(undoBlock).toContain("deepModelSnapshot");
    expect(undoBlock).toContain("nodes: deepModelSnapshot ? cloneNodesForUndo(nodes) : nodes");
  });

  test("defers post-edit persistence and bus terminal synchronization off the drag release frame", async () => {
    const source = await readAppSource();
    const busSyncStart = source.indexOf("const synchronized = synchronizeBusTerminalsWithEdges(nodes, edges);");
    const draftStart = source.indexOf("window.localStorage.setItem(\n          DRAFT_PROJECT_STORAGE_KEY");
    const topologyStaleStart = source.indexOf("拓扑结果已过期");

    expect(source).toContain("const scheduleIdleWork");
    expect(source).toContain("requestIdleCallback");
    expect(source.slice(Math.max(0, busSyncStart - 300), busSyncStart + 300)).toContain("scheduleIdleWork");
    expect(source.slice(Math.max(0, draftStart - 500), draftStart + 900)).toContain("scheduleIdleWork");
    expect(source.slice(Math.max(0, topologyStaleStart - 400), topologyStaleStart + 300)).toContain("scheduleIdleWork");
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
    const topbarStart = source.indexOf("<header className=\"topbar\">");
    const topbarEnd = source.indexOf("</header>", topbarStart);
    const topbarBlock = source.slice(topbarStart, topbarEnd);

    expect(source).toContain("colorPaletteDialogOpen");
    expect(source).toContain("colorPaletteDraft");
    expect(source).toContain("saveColorPalette");
    expect(source).toContain("resetEnergyColors");
    expect(source).toContain("resetVoltageColors");
    expect(source).toContain("addVoltageColorRow");
    expect(topbarBlock).toContain("aria-label=\"配色设置\"");
    expect(source).toContain("按能流类型");
    expect(source).toContain("按电压等级");
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
  });

  test("moves layer-order actions from the context menu to icon-only topbar buttons", async () => {
    const source = await readAppSource();
    const topbarStart = source.indexOf("<header className=\"topbar\">");
    const topbarEnd = source.indexOf("</header>", topbarStart);
    const topbarBlock = source.slice(topbarStart, topbarEnd);
    const contextStart = source.indexOf("{contextMenu && (");
    const contextEnd = source.indexOf("{projectMenu && (", contextStart);
    const contextBlock = source.slice(contextStart, contextEnd);

    expect(source).toContain("BringToFront");
    expect(source).toContain("SendToBack");
    expect(source).toContain("Layers2");
    expect(source).toContain("Layers");
    expect(topbarBlock).toContain("aria-label=\"图层向上\"");
    expect(topbarBlock).toContain("<Layers2 size={16} />");
    expect(topbarBlock).toContain("aria-label=\"图层向下\"");
    expect(topbarBlock).toContain("<Layers size={16} />");
    expect(topbarBlock).toContain("aria-label=\"图层置顶\"");
    expect(topbarBlock).toContain("<BringToFront size={16} />");
    expect(topbarBlock).toContain("aria-label=\"图层置底\"");
    expect(topbarBlock).toContain("<SendToBack size={16} />");
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
    const busSyncStart = source.indexOf("const synchronized = synchronizeBusTerminalsWithEdges(nodes, edges);");
    const busSyncEnd = source.indexOf("if (synchronized.nodes !== nodes)", busSyncStart);
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
