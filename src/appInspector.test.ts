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
    expect(source).toContain("const activeDropReady = connectDropReady || Boolean(rewiring?.dropTargetPoint);");
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

  test("commits drag-end nodes, edges, and drag state in one render", async () => {
    const source = await readAppSource();
    const finishStart = source.indexOf("const finishNodeDrag = () =>");
    const finishEnd = source.indexOf("const moveSelection", finishStart);
    const finishBlock = source.slice(finishStart, finishEnd);
    const flushStart = finishBlock.indexOf("flushSync(() =>");
    const flushEnd = finishBlock.indexOf("});", flushStart);
    const flushBlock = finishBlock.slice(flushStart, flushEnd);

    expect(source).toContain("import { flushSync } from \"react-dom\";");
    expect(flushStart).toBeGreaterThan(-1);
    expect(flushBlock).toContain("setNodes(nextNodes)");
    expect(flushBlock).toContain("setEdges(nextEdges)");
    expect(flushBlock).toContain("setDragging(null)");
    expect(finishBlock).not.toContain("setDragging(null);\n    writeOperationLog");
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
});
