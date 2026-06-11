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

async function readReactFlowPreviewSource() {
  // @ts-ignore - tests run in Node, while the app tsconfig intentionally stays browser-focused.
  const { readFile } = await import("node:fs/promises");
  return readFile(new URL("./ReactFlowPreview.tsx", import.meta.url), "utf8") as Promise<string>;
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

async function readViteConfigSource() {
  // @ts-ignore - tests run in Node, while the app tsconfig intentionally stays browser-focused.
  const { readFile } = await import("node:fs/promises");
  return readFile(new URL("../vite.config.ts", import.meta.url), "utf8") as Promise<string>;
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
  test("creates new models with the default 1920 by 1024 canvas size", async () => {
    const source = await readAppSource();
    const serverSource = await readServerSource();
    const createStart = source.indexOf("const createBlankProject =");
    const createEnd = source.indexOf("const locateTopologyError", createStart);
    const createBlock = source.slice(createStart, createEnd);

    expect(source).toContain("const DEFAULT_CANVAS_WIDTH = 1920;");
    expect(source).toContain("const DEFAULT_CANVAS_HEIGHT = 1024;");
    expect(createBlock).toContain("canvasWidth: DEFAULT_CANVAS_WIDTH");
    expect(createBlock).toContain("canvasHeight: DEFAULT_CANVAS_HEIGHT");
    expect(createBlock).not.toContain("canvasWidth,\n      canvasHeight,");
    expect(serverSource).toContain("Number(project.canvasWidth ?? 1920)");
    expect(serverSource).toContain("Number(project.canvasHeight ?? 1024)");
  });

  test("allows canvas width and height up to 50000", async () => {
    const source = await readAppSource();

    expect(source).toContain("const MAX_CANVAS_WIDTH = 50000;");
    expect(source).toContain("const MAX_CANVAS_HEIGHT = 50000;");
  });

  test("adds a per-model switch that gates automatic canvas expansion", async () => {
    const source = await readAppSource();
    const model = await readModelSource();
    const modelPanelStart = source.indexOf("{inspectorTab === \"model\" && currentModelRecord");
    const modelPanelEnd = source.indexOf(") : inspectorTab === \"tree\"", modelPanelStart);
    const modelPanelBlock = source.slice(modelPanelStart, modelPanelEnd);
    const autoExpandStart = source.indexOf("const autoCanvasExpansionBlockedMessage");
    const autoExpandEnd = source.indexOf("const hasCanvasOriginShift", autoExpandStart);
    const autoExpandBlock = source.slice(autoExpandStart, autoExpandEnd);
    const moveBoundsStart = source.indexOf("const canvasBoundsForMoveDelta");
    const moveBoundsEnd = source.indexOf("const computeNodeDragDelta", moveBoundsStart);
    const moveBoundsBlock = source.slice(moveBoundsStart, moveBoundsEnd);

    expect(model).toContain("allowAutoExpandCanvas?: boolean;");
    expect(source).toContain("allowAutoExpandCanvas: boolean;");
    expect(source).toContain("const [allowAutoExpandCanvas, setAllowAutoExpandCanvas] = useState(() => initialDraft?.allowAutoExpandCanvas ?? true);");
    expect(source).toContain("setAllowAutoExpandCanvas(project.project.allowAutoExpandCanvas ?? true)");
    expect(source).toContain("allowAutoExpandCanvas,");
    expect(source).toContain("previous.allowAutoExpandCanvas !== next.allowAutoExpandCanvas");
    expect(modelPanelBlock).toContain("renderChineseParamHeader(\"allowAutoExpandCanvas\"");
    expect(modelPanelBlock).toContain("value={allowAutoExpandCanvas ? \"allow\" : \"deny\"}");
    expect(modelPanelBlock).toContain("setAllowAutoExpandCanvas(event.target.value === \"allow\")");
    expect(modelPanelBlock).toContain("<option value=\"allow\">允许</option>");
    expect(modelPanelBlock).toContain("<option value=\"deny\">不允许</option>");
    expect(autoExpandBlock).toContain("if (!allowAutoExpandCanvas)");
    expect(autoExpandBlock).toContain("return baseBounds;");
    expect(autoExpandBlock).toContain("modelGeometryInsideCanvasBounds(contentNodes, [...contentRoutes, ...edgeRoutesForGeometryBounds(contentEdges)], bounds, 0)");
    expect(moveBoundsBlock).toContain("if (!allowAutoExpandCanvas)");
    expect(moveBoundsBlock).toContain("return canvasBounds;");
  });

  test("adds browse and edit modes that persist the last selected mode", async () => {
    const source = await readAppSource();
    const styles = await readStyles();
    const topbarStart = source.indexOf("<header className=\"topbar\"");
    const topbarEnd = source.indexOf("</header>", topbarStart);
    const topbarBlock = source.slice(topbarStart, topbarEnd);
    const keydownStart = source.indexOf("const handleKeyDown = (event: KeyboardEvent) => {");
    const keydownEnd = source.indexOf("const handleKeyUp = (event: KeyboardEvent) => {", keydownStart);
    const keydownBlock = source.slice(keydownStart, keydownEnd);
    const canvasScrollSurfaceStart = source.indexOf("className=\"canvas-scroll-surface\"");
    const canvasScrollSurfaceEnd = source.indexOf("<svg", canvasScrollSurfaceStart);
    const canvasScrollSurfaceBlock = source.slice(canvasScrollSurfaceStart, canvasScrollSurfaceEnd);
    const nodePointerStart = source.indexOf("const handleNodePointerDown");
    const nodePointerEnd = source.indexOf("const handlePointerMove", nodePointerStart);
    const nodePointerBlock = source.slice(nodePointerStart, nodePointerEnd);
    const staticButtonStart = source.indexOf("const beginStaticButtonPointerFeedback");
    const staticButtonEnd = source.indexOf("const resolveStaticButtonTargetProject", staticButtonStart);
    const staticButtonBlock = source.slice(staticButtonStart, staticButtonEnd);

    expect(source).toContain("type InteractionMode = \"browse\" | \"edit\";");
    expect(source).toContain("const INTERACTION_MODE_STORAGE_KEY = \"graph-modeling-platform:interaction-mode\";");
    expect(source).toContain("function normalizeInteractionMode(value: unknown): InteractionMode");
    expect(source).toContain("function readStoredInteractionMode(): InteractionMode");
    expect(source).toContain("function writeStoredInteractionMode(mode: InteractionMode)");
    expect(source).toContain("return normalizeInteractionMode(window.localStorage.getItem(INTERACTION_MODE_STORAGE_KEY));");
    expect(source).toContain("window.localStorage.setItem(INTERACTION_MODE_STORAGE_KEY, mode);");
    expect(source).toContain("const [interactionMode, setInteractionMode] = useState<InteractionMode>(() => readStoredInteractionMode());");
    expect(source).toContain("writeStoredInteractionMode(interactionMode);");
    expect(source).toContain("const isBrowseMode = interactionMode === \"browse\";");
    expect(source).toContain("const isEditMode = interactionMode === \"edit\";");
    expect(source).toContain("const requireEditMode = (action: string) => {");
    expect(source).toContain("浏览模式下不能");
    expect(topbarBlock).toContain("mode-toggle-button");
    expect(topbarBlock).toContain("onClick={toggleInteractionMode}");
    expect(topbarBlock).toContain("aria-label={isEditMode ? \"切换到浏览模式\" : \"切换到编辑模式\"}");
    expect(topbarBlock).toContain("<span>{isEditMode ? \"编辑模式\" : \"浏览模式\"}</span>");
    expect(topbarBlock).toContain("disabled={isBrowseMode}");
    expect(topbarBlock).toContain("disabled={isBrowseMode || !saveRequired}");
    expect(keydownBlock).toContain("if (!isEditMode) {");
    expect(keydownBlock).toContain("releaseKeyboardMoveKey(event.key)");
    expect(canvasScrollSurfaceBlock).toContain("if (isEditMode && startCanvasResizeFromTopOverlay(event))");
    expect(canvasScrollSurfaceBlock).toContain("if (isEditMode && hasCanvasSelectionModifier(event))");
    expect(nodePointerBlock).toContain("if (isBrowseMode) {");
    expect(nodePointerBlock).toContain("selectCanvasGraphics([node.id], [], { scope: \"direct\" });");
    expect(nodePointerBlock).not.toContain("if (isBrowseMode) {\n      startDraggingState");
    expect(staticButtonBlock).toContain("if (!isBrowseMode || !isStaticButtonEnabledForNode(node)");
    expect(source).toContain("{isEditMode && canvasResizeHandles}");
    expect(source).toContain("{isEditMode && (nodeFloatingToolbar || edgeFloatingToolbar) && (");
    expect(source).toContain("const canvasResizeHandles = (");
    expect(styles).toContain(".mode-toggle-button");
    expect(styles).toContain(".app-shell.browse-mode");
  });

  test("keeps the element tree selection easy to click and synced with canvas selection", async () => {
    const source = await readAppSource();
    const styles = await readStyles();
    const treeStart = source.indexOf("const renderElementTreePanel = () => (");
    const treeEnd = source.indexOf("const topologyWarningDisplayMessage", treeStart);
    const treeBlock = source.slice(treeStart, treeEnd);
    const selectedRule = cssRuleBlock(styles, ".element-tree-item.selected {");

    expect(source).toContain("const elementTreeItemRefs = useRef<Record<string, HTMLDivElement | null>>({});");
    expect(source).toContain("const [elementTreeSearchQuery, setElementTreeSearchQuery] = useState(\"\");");
    expect(source).toContain("const filteredElementTree = useMemo(() => {");
    expect(source).toContain("elementTreeItemRefs.current[selectedElementTreeItemKey]?.scrollIntoView");
    expect(source).toContain("block: \"nearest\"");
    expect(source).toContain("inline: \"nearest\"");
    expect(treeBlock).toContain("placeholder=\"搜索图元名称\"");
    expect(treeBlock).toContain("setElementTreeSearchQuery(event.target.value)");
    expect(treeBlock).toContain("filteredElementTree.map((group)");
    expect(treeBlock).toContain("elementTreeSearchNeedle ? deviceGroup.items : deviceGroup.items.slice(0, visibleLimit)");
    expect(treeBlock).toContain("onPointerDown={selectTreeItem}");
    expect(source).toContain("const centerViewOnPointAtZoom = (point: Point, zoomPercent = 100) => {");
    expect(source).toContain("zoomPercent,\n      zoomPercent");
    expect(source).toContain("const jumpToElementTreeItem = (item: ElementTreeItem) => {");
    expect(source).toContain("centerViewOnPointAtZoom(point, 100);");
    expect(treeBlock).toContain("className=\"element-tree-jump-button\"");
    expect(treeBlock).toContain("title=\"跳转到画布中心并以 100% 显示\"");
    expect(treeBlock).toContain("onPointerDown={(event) => event.stopPropagation()}");
    expect(treeBlock).toContain("jumpToElementTreeItem(item);");
    expect(treeBlock).toContain("<LocateFixed size={13} />");
    expect(treeBlock).toContain("ref={(element) => {");
    expect(treeBlock).toContain("elementTreeItemRefs.current[treeItemKey] = element;");
    expect(styles).toContain(".element-tree-search");
    expect(styles).toContain(".element-tree-jump-button");
    expect(styles).toContain(".element-tree-item.selected .element-tree-item-main");
    expect(selectedRule).toContain("background: var(--element-tree-selected-bg)");
    expect(selectedRule).toContain("box-shadow: inset 3px 0 0 var(--element-tree-selected-accent)");
    expect(selectedRule).toContain("font-weight: 800");
  });

  test("shows element tree types with Chinese and English labels without duplicating device names", async () => {
    const source = await readAppSource();
    const modelSource = await readModelSource();
    const styles = await readStyles();
    const treeStart = source.indexOf("const renderElementTreePanel = () => (");
    const treeEnd = source.indexOf("const topologyWarningDisplayMessage", treeStart);
    const treeBlock = source.slice(treeStart, treeEnd);

    expect(modelSource).toContain("typeEnglishLabel?: string;");
    expect(modelSource).toContain("componentTypeLabel?: string;");
    expect(modelSource).not.toContain("nameEnglish?: string;");
    expect(treeBlock).toContain("group.typeEnglishLabel");
    expect(treeBlock).toContain("child.componentTypeLabel || child.componentType");
    expect(treeBlock).not.toContain("item.nameEnglish");
    expect(treeBlock).not.toContain("child.nameEnglish");
    expect(styles).toContain(".element-tree-bilingual");
    expect(styles).not.toContain(".element-tree-field-secondary");
  });

  test("renders the graph tree as component type, device, and graphic instance levels", async () => {
    const source = await readAppSource();
    const modelSource = await readModelSource();
    const styles = await readStyles();
    const treeStart = source.indexOf("const renderElementTreePanel = () =>");
    const treeEnd = source.indexOf("const topologyWarningDisplayMessage", treeStart);
    const treeBlock = source.slice(treeStart, treeEnd);

    expect(modelSource).toContain("export type ElementTreeDeviceGroup = {");
    expect(modelSource).toContain("deviceGroups?: ElementTreeDeviceGroup[];");
    expect(modelSource).toContain("const appendDeviceItem = (");
    expect(modelSource).toContain("elementTreeComponentTypeLabel(typeEnglishLabel)");
    expect(treeBlock).toContain("const deviceGroups = group.deviceGroups ?? [];");
    expect(treeBlock).toContain("deviceGroups.map((deviceGroup)");
    expect(treeBlock).toContain("className=\"element-tree-device-type\"");
    expect(treeBlock).toContain("aria-level={2}");
    expect(treeBlock).toContain("aria-level={3}");
    expect(treeBlock).toContain("deviceGroup.deviceLabel");
    expect(treeBlock).toContain("deviceGroup.deviceEnglishLabel");
    expect(styles).toContain(".element-tree-device-group");
    expect(styles).toContain(".element-tree-device-type");
    expect(styles).toContain(".element-tree-device-items");
  });

  test("opens a delete-only context menu from graph tree instance rows", async () => {
    const source = await readAppSource();
    const treeStart = source.indexOf("const renderElementTreePanel = () =>");
    const treeEnd = source.indexOf("const topologyWarningDisplayMessage", treeStart);
    const treeBlock = source.slice(treeStart, treeEnd);
    const contextStart = source.indexOf("{contextMenu && (");
    const contextEnd = source.indexOf("{projectMenu && (", contextStart);
    const contextBlock = source.slice(contextStart, contextEnd);

    expect(source).toContain("source?: \"canvas\" | \"element-tree\";");
    expect(source).toContain("const contextMenuFromElementTree = contextMenu?.source === \"element-tree\";");
    expect(source).toContain("const openElementTreeItemContextMenu = (event: MouseEvent<HTMLDivElement>, item: ElementTreeItem) => {");
    expect(source).toContain("source: \"element-tree\"");
    expect(source).toContain("target: item.kind");
    expect(treeBlock).toContain("onContextMenu={(event) => openElementTreeItemContextMenu(event, item)}");
    expect(contextBlock).toContain("{isEditMode && contextMenuFromElementTree && contextMenuForSelection && contextSelectionCount > 0 && (");
    expect(contextBlock).toContain("{!contextMenuFromElementTree && (");
  });

  test("sets transformer and converter voltage bases through a single selected terminal dropdown", async () => {
    const source = await readAppSource();
    const dialogStart = source.indexOf("{voltageBaseSetDialogOpen && (");
    const dialogEnd = source.indexOf("{voltageBaseClearDialogOpen && (", dialogStart);
    const dialogBlock = source.slice(dialogStart, dialogEnd);

    expect(source).toContain("const [activeVoltageBaseTerminalKey, setActiveVoltageBaseTerminalKey] = useState(\"\");");
    expect(source).toContain("const activeVoltageBaseTerminalValues = ()");
    expect(dialogBlock).toContain("<select");
    expect(dialogBlock).toContain("value={activeVoltageBaseTerminalKey}");
    expect(dialogBlock).toContain("onChange={(event) => setActiveVoltageBaseTerminalKey(event.target.value)}");
    expect(dialogBlock).toContain("activeVoltageBaseTerminalRow");
    expect(dialogBlock).toContain("value={activeVoltageBaseTerminalRow.value}");
    expect(source).toContain("setVoltageBaseTerminalValuesForScope(nodes, edges, activeVoltageBaseTerminalValues(), scope)");
  });

  test("forces the left panel back to the model library and hides edit-only library tabs in browse mode", async () => {
    const source = await readAppSource();
    const effectStart = source.indexOf("useEffect(() => {\n    if (isBrowseMode && leftPanelTab !== \"projects\")");
    const effectEnd = source.indexOf("useEffect(() => {\n    if (leftPanelTab !== \"projects\")", effectStart);
    const effectBlock = source.slice(effectStart, effectEnd);
    const leftContentStart = source.indexOf("const effectiveLeftPanelTab =");
    const leftContentEnd = source.indexOf("const canvasResizeHandles = (", leftContentStart);
    const leftContentBlock = source.slice(leftContentStart, leftContentEnd);
    const tabStart = source.indexOf("<div className=\"left-panel-tabs\"");
    const tabEnd = source.indexOf("<div className=\"left-panel-content\">", tabStart);
    const tabBlock = source.slice(tabStart, tabEnd);

    expect(effectStart).toBeGreaterThan(-1);
    expect(effectBlock).toContain("setLeftPanelTab(\"projects\");");
    expect(effectBlock).toContain("}, [isBrowseMode, leftPanelTab]);");
    expect(leftContentBlock).toContain("const effectiveLeftPanelTab = isBrowseMode ? \"projects\" : leftPanelTab;");
    expect(leftContentBlock).toContain("const leftPanelContent = effectiveLeftPanelTab === \"projects\"");
    expect(tabBlock).toContain("aria-selected={effectiveLeftPanelTab === \"projects\"}");
    expect(tabBlock).toContain("{isEditMode && (");
    expect(tabBlock).toContain("leftPanelTab === \"library\"");
    expect(tabBlock).toContain("图元库");
    expect(tabBlock).toContain("leftPanelTab === \"templates\"");
    expect(tabBlock).toContain("模板库");
  });

  test("prevents all canvas graphic drag entry points in browse mode", async () => {
    const source = await readAppSource();
    const labelDragStart = source.indexOf("const startNodeLabelDrag =");
    const labelDragEnd = source.indexOf("const finishNodeLabelDrag", labelDragStart);
    const labelDragBlock = source.slice(labelDragStart, labelDragEnd);
    const groupTransformStart = source.indexOf("const startGroupTransformDrag =");
    const groupTransformEnd = source.indexOf("const startSingleTransformDrag", groupTransformStart);
    const groupTransformBlock = source.slice(groupTransformStart, groupTransformEnd);
    const singleTransformStart = source.indexOf("const startSingleTransformDrag =");
    const singleTransformEnd = source.indexOf("const startGroupMoveDrag", singleTransformStart);
    const singleTransformBlock = source.slice(singleTransformStart, singleTransformEnd);
    const groupMoveStart = source.indexOf("const startGroupMoveDrag =");
    const groupMoveEnd = source.indexOf("const buildGroupTransformNodeUpdates", groupMoveStart);
    const groupMoveBlock = source.slice(groupMoveStart, groupMoveEnd);
    const manualSegmentStart = source.indexOf("const startManualSegmentDrag =");
    const manualSegmentEnd = source.indexOf("const startManualPointDrag", manualSegmentStart);
    const manualSegmentBlock = source.slice(manualSegmentStart, manualSegmentEnd);
    const manualPointStart = source.indexOf("const startManualPointDrag =");
    const manualPointEnd = source.indexOf("const insertManualBendFromPointer", manualPointStart);
    const manualPointBlock = source.slice(manualPointStart, manualPointEnd);
    const edgePathStart = source.indexOf("const handleEdgePathPointerDown =");
    const edgePathEnd = source.indexOf("const deleteManualBendPoint", edgePathStart);
    const edgePathBlock = source.slice(edgePathStart, edgePathEnd);
    const terminalStart = source.indexOf("const handleTerminalPointerDown =");
    const terminalEnd = source.indexOf("const handleNodePointerDown", terminalStart);
    const terminalBlock = source.slice(terminalStart, terminalEnd);
    const renderEdgeStart = source.indexOf("renderViewportRoutedEdges.map");
    const renderEdgeEnd = source.indexOf("{selectedEdge &&", renderEdgeStart);
    const renderEdgeBlock = source.slice(renderEdgeStart, renderEdgeEnd);

    expect(labelDragBlock).toContain("if (isBrowseMode) {");
    expect(labelDragBlock).not.toContain("if (isBrowseMode) {\n      setNodeLabelDrag");
    expect(edgePathBlock).toContain("if (isBrowseMode) {");
    expect(edgePathBlock).not.toContain("if (isBrowseMode) {\n      setManualPathDrag");
    expect(manualSegmentBlock).toContain("if (isBrowseMode) {");
    expect(manualSegmentBlock).not.toContain("if (isBrowseMode) {\n      setManualPathDrag");
    expect(manualPointBlock).toContain("if (isBrowseMode) {");
    expect(manualPointBlock).not.toContain("if (isBrowseMode) {\n      setManualPathDrag");
    expect(terminalBlock).toContain("if (isBrowseMode) {");
    expect(terminalBlock).not.toContain("if (isBrowseMode) {\n      setTerminalPress");
    expect(groupTransformBlock).toContain("if (!requireEditMode(\"拖拽图元\"))");
    expect(singleTransformBlock).toContain("if (!requireEditMode(\"拖拽图元\"))");
    expect(groupMoveBlock).toContain("if (!requireEditMode(\"拖拽图元\"))");
    expect(renderEdgeBlock).toContain("{isEditMode && sourceBusDotPoint && (");
    expect(renderEdgeBlock).toContain("{isEditMode && targetBusDotPoint && (");
    expect(renderEdgeBlock).toContain("{isEditMode && selected && sourcePoint && (");
    expect(renderEdgeBlock).toContain("{isEditMode && selected && targetPoint && (");
  });

  test("keeps pure browse canvas on readonly hit testing and rendering paths", async () => {
    const source = await readAppSource();
    const keyStart = source.indexOf("const handleKeyDown =");
    const keyEnd = source.indexOf("const handleKeyUp = (event: KeyboardEvent) => {", keyStart);
    const keyBlock = source.slice(keyStart, keyEnd);
    const browseStart = keyBlock.indexOf("if (!isEditMode) {\n        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === \"a\"");
    const browseEnd = keyBlock.indexOf("return;\n      }", browseStart);
    const browseBlock = keyBlock.slice(browseStart, browseEnd);
    const svgPointerStart = source.indexOf("onPointerDown={(event) => {\n              if (event.button !== 0)");
    const svgPointerEnd = source.indexOf("lastEdgePointerClickRef.current = null;", svgPointerStart);
    const svgPointerBlock = source.slice(svgPointerStart, svgPointerEnd);
    const svgContextStart = source.indexOf("onContextMenu={(event) => {", source.indexOf("className={`diagram-canvas"));
    const svgContextEnd = source.indexOf("setContextMenu({ x: event.clientX, y: event.clientY, target: \"blank\"", svgContextStart);
    const svgContextBlock = source.slice(svgContextStart, svgContextEnd);
    const routeRenderStart = source.indexOf("renderViewportRoutedEdges.map");
    const routeRenderEnd = source.indexOf("{selectedRoutedEdge &&", routeRenderStart);
    const routeRenderBlock = source.slice(routeRenderStart, routeRenderEnd);
    const selectedRouteStart = source.indexOf("{selectedRoutedEdge &&");
    const selectedRouteEnd = source.indexOf("{resizeSizeHint &&", selectedRouteStart);
    const selectedRouteBlock = source.slice(selectedRouteStart, selectedRouteEnd);
    const terminalStart = source.indexOf("<g className=\"node-terminal-layer\"");
    const terminalEnd = source.indexOf("{selected && focused && selectedNodeCount === 1", terminalStart);
    const terminalBlock = source.slice(terminalStart, terminalEnd);
    const overlapStart = source.indexOf("const overlappedTerminalKeys = useMemo");
    const overlapEnd = source.indexOf("const nodeTerminalSnapTarget = useMemo", overlapStart);
    const overlapBlock = source.slice(overlapStart, overlapEnd);
    const snapStart = source.indexOf("const nodeTerminalSnapTarget = useMemo");
    const snapEnd = source.indexOf("if (!imperativeSingleNodeDragActiveRef.current)", snapStart);
    const snapBlock = source.slice(snapStart, snapEnd);
    const toolbarStart = source.indexOf("const nodeFloatingToolbar =");
    const toolbarEnd = source.indexOf("const floatingToolbarWrapperStyle", toolbarStart);
    const toolbarBlock = source.slice(toolbarStart, toolbarEnd);

    expect(source).toContain("const isReadonlyCanvasMode = isBrowseMode;");
    expect(browseBlock).toContain("浏览模式下不执行全画布全选");
    expect(browseBlock).not.toContain("setSelectedNodeIds(activeLayerNodes.map((node) => node.id))");
    expect(svgPointerBlock).toContain("const routeHit = isReadonlyCanvasMode ? null : findConnectionRouteHitAtPoint(pointer);");
    expect(svgContextBlock.indexOf("if (isReadonlyCanvasMode)")).toBeLessThan(svgContextBlock.indexOf("findConnectionRouteHitAtPoint(pointer)"));
    expect(routeRenderBlock).toContain("const editable = isEditMode && activeLayerEdgeIdSet.has(edge.id);");
    expect(selectedRouteBlock).toContain("onContextMenu={isEditMode ? (event) => openEdgeContextMenu(event, edge.id, routePoints) : undefined}");
    expect(selectedRouteBlock).toContain("onPointerDown={isEditMode ? (event) => handleEdgePathPointerDown(event, edge.id, routePoints) : undefined}");
    expect(source).toContain("const connectSourceNode = isEditMode && connectSource ? visibleNodeById.get(connectSource.nodeId) : undefined;");
    expect(source).toContain("const connectTerminalCompatibilityActive = isEditMode && mode === \"connect\" && Boolean(connectSourceNode);");
    expect(source).toContain("const routableLineTerminalCompatibilityActive = isEditMode && Boolean(routableLinePlacement || routableLineEndpointDrag);");
    expect(source).toContain("const routableLineActiveTerminalType =");
    expect(source).toContain("routableLineTemplateTerminalType(routableLinePlacement.template)");
    expect(terminalBlock).toContain("const disabled =");
    expect(terminalBlock).toContain("connectTerminalCompatibilityActive");
    expect(terminalBlock).toContain("!canConnectTerminals(connectSourceNode!, connectSource!.terminalId, node, terminal.id)");
    expect(terminalBlock).toContain("routableLineTerminalCompatibilityActive");
    expect(terminalBlock).toContain("terminal.type !== routableLineActiveTerminalType");
    expect(terminalBlock).toContain("const overlapped = isEditMode && overlappedTerminalKeys.has(`${node.id}:${terminal.id}`);");
    expect(terminalBlock).toContain("onPointerDown={isEditMode ? (event) => handleTerminalPointerDown(event, node, terminal.id) : undefined}");
    expect(overlapBlock).toContain("if (isReadonlyCanvasMode)");
    expect(overlapBlock).toContain("if (suppressDragTerminalInteraction)");
    expect(snapBlock).toContain("!isReadonlyCanvasMode &&");
    expect(toolbarBlock).toContain("isEditMode && !selectedToolbarHidden");
  });

  test("prevents selected graphic right-clicks from falling through to the blank canvas menu", async () => {
    const source = await readAppSource();
    const svgContextStart = source.indexOf("onContextMenu={(event) => {", source.indexOf("className={`diagram-canvas"));
    const svgContextEnd = source.indexOf("setContextMenu({ x: event.clientX, y: event.clientY, target: \"blank\"", svgContextStart);
    const svgContextBlock = source.slice(svgContextStart, svgContextEnd);

    expect(source).toContain("const CANVAS_GRAPHIC_CONTEXT_MENU_TARGET_SELECTOR =");
    expect(source).toContain("function isCanvasGraphicContextMenuTarget(target: EventTarget | null)");
    expect(source).toContain(".diagram-node");
    expect(source).toContain(".lod-node");
    expect(source).toContain(".lod-node-layer");
    expect(source).toContain(".lod-node-selection-layer");
    expect(source).toContain(".group-selection-overlay");
    expect(source).toContain(".group-selection-hitbox");
    expect(source).toContain(".group-selection-outline");
    expect(source).toContain(".transform-handles");
    expect(source).toContain(".scale-handle");
    expect(source).toContain(".rotate-handle");
    expect(source).toContain(".manual-bend-handle");
    expect(source).toContain("const canvasGraphicContextMenuHandledRef = useRef(false);");
    expect(source).toContain("const openGraphicContextMenu = (menu: NonNullable<ContextMenuState>) => {");
    expect(source).toContain("canvasGraphicContextMenuHandledRef.current = true;");
    expect(source).toContain("const consumeGraphicContextMenuHandled = () => {");
    expect(svgContextBlock).toContain("if (isCanvasGraphicContextMenuTarget(event.target))");
    expect(svgContextBlock).toContain("consumeGraphicContextMenuHandled()");
    expect(svgContextBlock.indexOf("if (isCanvasGraphicContextMenuTarget(event.target))")).toBeLessThan(
      svgContextBlock.indexOf("const rawPointer = screenToSvgPoint")
    );
    expect(svgContextBlock.indexOf("consumeGraphicContextMenuHandled()")).toBeLessThan(
      svgContextBlock.indexOf("const rawPointer = screenToSvgPoint")
    );
    expect(source).toContain("openGraphicContextMenu({ x: event.clientX, y: event.clientY, target: \"node\", nodeId: node.id })");
    expect(source).toContain("openGraphicContextMenu({ x: event.clientX, y: event.clientY, target: \"group\", canvasPoint: pointer })");
    expect(source).toContain("openGraphicContextMenu({");
    expect(source).toContain("target: \"edge\"");
  });

  test("adds a searchable component library for large symbol sets", async () => {
    const source = await readAppSource();
    const styles = await readStyles();
    const libraryPanelStart = source.indexOf("const renderLibraryPanel");
    const libraryPanelEnd = source.indexOf("const renderLeftPanelContent", libraryPanelStart);
    const libraryPanelBlock = source.slice(libraryPanelStart, libraryPanelEnd);

    expect(source).toContain("const [librarySearchQuery, setLibrarySearchQuery] = useState(\"\");");
    expect(source).toContain("const librarySearchNeedle = normalizeLibrarySearchText(librarySearchQuery);");
    expect(source).toContain("libraryTemplateMatchesSearch(item, group, typeGroup.section, librarySearchNeedle)");
    expect(libraryPanelBlock).toContain("className=\"library-search\"");
    expect(libraryPanelBlock).toContain("placeholder=\"搜索图元/类型\"");
    expect(libraryPanelBlock).toContain("aria-label=\"搜索图元库\"");
    expect(libraryPanelBlock).toContain("未找到匹配图元");
    expect(styles).toContain(".library-search");
    expect(styles).toContain(".library-search input");
    expect(styles).toContain(".library-empty");
  });

  test("keeps fixed line-like templates in the placement component library", async () => {
    const source = await readAppSource();

    expect(source).not.toContain("libraryTemplates.filter(isDeviceTemplateVisibleInPlacementLibrary)");
    expect(source).toContain("if (!librarySearchNeedle) {\n      return groupedAttributeLibraryByComponentType;");
    expect(source).toContain("const filteredEntries = Object.entries(groupedAttributeLibraryByComponentType)");
    expect(source).toContain("? attributeLibraries.filter((group) => (filteredAttributeLibraryByComponentType[group] ?? []).length > 0)\n      : attributeLibraries");
    expect(source).toContain("new Map(libraryTemplates.map((template) => [template.kind, template]))");
  });

  test("adds a searchable model library with clear empty results", async () => {
    const source = await readAppSource();
    const styles = await readStyles();
    const projectPanelStart = source.indexOf("const renderProjectSchemeNode =");
    const projectPanelEnd = source.indexOf("const customDraftTerminalTypes", projectPanelStart);
    const projectPanelBlock = source.slice(projectPanelStart, projectPanelEnd);

    expect(source).toContain("const [projectSearchQuery, setProjectSearchQuery] = useState(\"\");");
    expect(source).toContain("const projectSearchNeedle = normalizeLibrarySearchText(projectSearchQuery);");
    expect(source).toContain("const filteredProjectSchemes = useMemo<SavedSchemeRecord[]>");
    expect(source).toContain("normalizeLibrarySearchText(scheme.name).includes(projectSearchNeedle)");
    expect(source).toContain("normalizeLibrarySearchText(project.name).includes(projectSearchNeedle)");
    expect(source).toContain("const isExpanded = projectSearchNeedle ? true : expandedSchemeIds.includes(scheme.id);");
    expect(source).not.toContain("hoveredSchemeId");
    expect(source).not.toContain("setHoveredSchemeId");
    expect(source).toContain("const projects = useMemo(() => flattenSavedProjects(schemes), [schemes]);");
    expect(source).toContain("(scheme.children ?? []).map(filterScheme)");
    expect(projectPanelBlock).not.toContain("onMouseEnter={() => setHoveredSchemeId(scheme.id)}");
    expect(projectPanelBlock).not.toContain("onMouseLeave={() => setHoveredSchemeId((current) => current === scheme.id ? \"\" : current)}");
    expect(projectPanelBlock).toContain("className=\"library-search project-search\"");
    expect(projectPanelBlock).toContain("placeholder=\"搜索方案/模型\"");
    expect(projectPanelBlock).toContain("aria-label=\"搜索模型库\"");
    expect(projectPanelBlock).toContain("aria-label=\"清空模型库搜索\"");
    expect(projectPanelBlock).toContain("未找到匹配方案或模型");
    expect(projectPanelBlock).toContain("aria-label={`方案：${scheme.name}`}");
    expect(projectPanelBlock).toContain("aria-label={`模型：${project.name}`}");
    expect(projectPanelBlock).toContain("className=\"scheme-folder-icon\"");
    expect(projectPanelBlock).toContain("className=\"project-item-icon\"");
    expect(projectPanelBlock).toContain("className=\"project-tree-name\"");
    expect(projectPanelBlock).not.toContain("scheme-kind-badge");
    expect(projectPanelBlock).not.toContain("model-kind-badge");
    expect(projectPanelBlock).toContain("filteredProjectSchemes.map((scheme) => renderProjectSchemeNode(scheme))");
    expect(styles).toContain(".project-search");
    expect(styles).toContain(".project-search-empty");
    expect(styles).not.toContain(".project-tree-kind-badge");
    expect(styles).not.toContain(".scheme-kind-badge");
    expect(styles).not.toContain(".model-kind-badge");
    expect(styles).toContain(".scheme-folder-icon");
    expect(styles).toContain(".project-item-icon");
    expect(styles).toContain(".project-tree-name");
  });

  test("configures and renders a readonly background model page from the basic inspector", async () => {
    const source = await readAppSource();
    const model = await readModelSource();
    const styles = await readStyles();
    const modelPanelStart = source.indexOf("{inspectorTab === \"model\" && currentModelRecord");
    const modelPanelEnd = source.indexOf(") : inspectorTab === \"graph\"", modelPanelStart);
    const modelPanelBlock = source.slice(modelPanelStart, modelPanelEnd);
    const canvasStart = source.indexOf("<rect width={canvasRenderBounds.width} height={canvasRenderBounds.height} fill={canvasBackgroundColor || DEFAULT_CANVAS_BACKGROUND} />");
    const canvasEnd = source.indexOf("{marquee && (", canvasStart);
    const canvasBlock = source.slice(canvasStart, canvasEnd);
    const backgroundRenderStart = source.indexOf("const renderReadonlyBackgroundPage = () =>");
    const backgroundRenderEnd = source.indexOf("const viewportOverlayStyle", backgroundRenderStart);
    const backgroundRenderBlock = source.slice(backgroundRenderStart, backgroundRenderEnd);
    const backgroundLayerStyleStart = styles.indexOf(".background-page-layer");
    const backgroundLayerStyleEnd = styles.indexOf(".background-page-fill", backgroundLayerStyleStart);
    const backgroundLayerStyleBlock = styles.slice(backgroundLayerStyleStart, backgroundLayerStyleEnd);

    expect(model).toContain("backgroundProjectId?: string;");
    expect(model).toContain("backgroundLayerIds?: string[];");
    expect(source).toContain("backgroundProjectId: string;");
    expect(source).toContain("backgroundLayerIds: string[];");
    expect(source).toContain("const [backgroundProjectId, setBackgroundProjectId]");
    expect(source).toContain("const [backgroundLayerIds, setBackgroundLayerIds]");
    expect(source).toContain("backgroundProjectId,");
    expect(source).toContain("backgroundLayerIds,");
    expect(source).toContain("setBackgroundProjectId(project.project.backgroundProjectId ?? \"\")");
    expect(source).toContain("setBackgroundLayerIds(resolveConfiguredBackgroundLayerIds(project.project.backgroundProjectId, project.project.backgroundLayerIds))");
    expect(source).toContain("function backgroundPageCanvasTransform");
    expect(source).toContain("const backgroundPageRender = useMemo");
    expect(source).toContain("filterProjectByVisibleLayers(backgroundProject.nodes, backgroundProject.edges, backgroundLayers)");
    expect(source).toContain("routeEdgesForSavedPathRendering(backgroundNodes, backgroundEdges, backgroundPageFrameRender.backgroundBounds, { refreshCrossingArcs: savedRouteCrossingArcsReady })");
    expect(source).toContain("savedProjectPathOptions(schemes, activeProjectKey)");
    expect(source).toContain("backgroundColor: backgroundProject.canvasBackgroundColor ?? DEFAULT_CANVAS_BACKGROUND");
    expect(source).toContain("backgroundImageUrl: resolveProjectImage(backgroundProject, imageAssets)");
    expect(source).toContain("const renderReadonlyBackgroundPage = () =>");
    expect(source).toContain("beginReadonlyBackgroundStaticButtonPointerFeedback");
    expect(modelPanelBlock).toContain("renderChineseParamHeader(\"backgroundProjectId\"");
    expect(modelPanelBlock).toContain("<option value=\"\">不使用背景页面</option>");
    expect(modelPanelBlock).toContain("backgroundProjectOptions.map(({ project, label })");
    expect(modelPanelBlock).toContain("{label}");
    expect(modelPanelBlock).not.toContain("{scheme.name} / {project.name}");
    expect(modelPanelBlock).toContain("setBackgroundProjectId(nextProjectId)");
    expect(modelPanelBlock).toContain("setBackgroundLayerIds(defaultBackgroundLayerIdsForProject(backgroundProject.project))");
    expect(modelPanelBlock).toContain("renderChineseParamHeader(\"backgroundLayerIds\"");
    expect(modelPanelBlock).toContain("toggleBackgroundLayer");
    expect(canvasBlock).toContain("{renderReadonlyBackgroundPage()}");
    expect(canvasBlock.indexOf("{renderReadonlyBackgroundPage()}")).toBeLessThan(canvasBlock.indexOf("<g className=\"canvas-content\">"));
    expect(backgroundRenderBlock.indexOf("className=\"background-page-fill\"")).toBeLessThan(backgroundRenderBlock.indexOf("className=\"background-page-image\""));
    expect(backgroundRenderBlock.indexOf("className=\"background-page-image\"")).toBeLessThan(backgroundRenderBlock.indexOf("className=\"background-page-edges\""));
    expect(backgroundRenderBlock.indexOf("className=\"background-page-edges\"")).toBeLessThan(backgroundRenderBlock.indexOf("className=\"background-page-nodes\""));
    expect(styles).toContain(".background-page-layer");
    expect(backgroundLayerStyleBlock).not.toContain("opacity:");
    expect(source).toContain("className=\"background-page-fill\"");
    expect(source).toContain("className=\"background-page-image\"");
    expect(styles).toContain(".background-page-button");
    expect(styles).toContain("pointer-events: all");
  });

  test("tracks component type groups in the library and toggles them on click", async () => {
    const source = await readAppSource();
    const styles = await readStyles();
    const libraryPanelStart = source.indexOf("const renderLibraryPanel");
    const libraryPanelEnd = source.indexOf("const renderLeftPanelContent", libraryPanelStart);
    const libraryPanelBlock = source.slice(libraryPanelStart, libraryPanelEnd);

    expect(source).toContain("const [expandedAttributeLibraryComponentTypes, setExpandedAttributeLibraryComponentTypes] = useState<string[]>([]);");
    expect(source).toContain("const attributeLibraryComponentTypeKey = (attributeLibraryName: string, sectionName: string) =>");
    expect(source).toContain("const toggleAttributeLibraryComponentType = (attributeLibraryName: string, sectionName: string) =>");
    expect(libraryPanelBlock).toContain("const componentTypeExpanded = librarySearchNeedle");
    expect(libraryPanelBlock).toContain("libraryExpanded");
    expect(libraryPanelBlock).toContain("!collapsedExpandedModeComponentTypes.includes(componentTypeKey)");
    expect(libraryPanelBlock).toContain("expandedAttributeLibraryComponentTypes.includes(componentTypeKey) || hoveredAttributeLibraryComponentType === componentTypeKey");
    expect(libraryPanelBlock).toContain("aria-expanded={componentTypeExpanded || componentTypeFlyoutVisible}");
    expect(libraryPanelBlock).toContain("onClick={() => toggleAttributeLibraryComponentType(group, typeGroup.section)}");
    expect(libraryPanelBlock).toContain("setHoveredAttributeLibraryComponentType(componentTypeKey);");
    expect(libraryPanelBlock).toContain("{componentTypeExpanded && (");
    expect(styles).toContain(".attribute-library-component-type-header");
    expect(styles).toContain("cursor: pointer");
  });

  test("lets downward expanded library groups collapse by click without hover forcing them open", async () => {
    const source = await readAppSource();
    const libraryPanelStart = source.indexOf("const renderLibraryPanel");
    const libraryPanelEnd = source.indexOf("const renderLeftPanelContent", libraryPanelStart);
    const libraryPanelBlock = source.slice(libraryPanelStart, libraryPanelEnd);

    expect(source).toContain("const [collapsedExpandedModeAttributeLibraries, setCollapsedExpandedModeAttributeLibraries] = useState<AttributeLibrary[]>([]);");
    expect(source).toContain("const [collapsedExpandedModeComponentTypes, setCollapsedExpandedModeComponentTypes] = useState<string[]>([]);");
    expect(source).toContain("const toggleAttributeLibrary = (group: AttributeLibrary) =>");
    expect(source).toContain("componentLibraryDisplayMode === \"expanded\"");
    expect(source).toContain("setCollapsedExpandedModeAttributeLibraries");
    expect(source).toContain("setCollapsedExpandedModeComponentTypes");
    expect(libraryPanelBlock).toContain("const expanded = librarySearchNeedle ? true : libraryExpanded");
    expect(libraryPanelBlock).toContain("!collapsedExpandedModeAttributeLibraries.includes(group)");
    expect(libraryPanelBlock).toContain("!collapsedExpandedModeComponentTypes.includes(componentTypeKey)");
    expect(libraryPanelBlock).not.toContain("const expanded = libraryExpanded || librarySearchNeedle ? true");
    expect(libraryPanelBlock).not.toContain("const componentTypeExpanded = libraryExpanded || librarySearchNeedle");
    expect(libraryPanelBlock).toContain("onClick={() => toggleAttributeLibrary(group)}");
  });

  test("shows component library type entries in Chinese and English", async () => {
    const source = await readAppSource();
    const styles = await readStyles();
    const libraryPanelStart = source.indexOf("const renderLibraryPanel");
    const libraryPanelEnd = source.indexOf("const renderElementTreePanel", libraryPanelStart);
    const libraryPanelBlock = source.slice(libraryPanelStart, libraryPanelEnd);
    const searchStart = source.indexOf("function libraryTemplateMatchesSearch");
    const searchEnd = source.indexOf("function normalizeAttributeLibraryName", searchStart);
    const searchBlock = source.slice(searchStart, searchEnd);

    expect(source).toContain("const COMPONENT_TYPE_LABELS: Record<string, string> = {");
    expect(source).toContain("ACLoad: \"交流负荷\"");
    expect(source).toContain("StaticFlowNode: \"流程节点\"");
    expect(source).toContain("function componentTypeDisplayParts(sectionName: string)");
    expect(source).toContain("function componentTypeDisplayName(sectionName: string)");
    expect(searchBlock).toContain("componentTypeDisplayName(section)");
    expect(libraryPanelBlock).toContain("const componentTypeDisplay = componentTypeDisplayParts(typeGroup.section);");
    expect(libraryPanelBlock).toContain("className=\"component-type-name-cn\"");
    expect(libraryPanelBlock).toContain("className=\"component-type-name-en\"");
    expect(libraryPanelBlock).toContain("{componentTypeDisplay.chinese}");
    expect(libraryPanelBlock).toContain("{componentTypeDisplay.english}");
    expect(styles).toContain(".component-type-name-cn");
    expect(styles).toContain(".component-type-name-en");
  });

  test("switches component library display between downward expansion and right floating modes", async () => {
    const source = await readAppSource();
    const styles = await readStyles();
    const libraryPanelStart = source.indexOf("const renderLibraryPanel");
    const libraryPanelEnd = source.indexOf("const renderLeftPanelContent", libraryPanelStart);
    const libraryPanelBlock = source.slice(libraryPanelStart, libraryPanelEnd);

    expect(source).toContain("type ComponentLibraryDisplayMode = \"expanded\" | \"right\";");
    expect(source).toContain("const [componentLibraryDisplayMode, setComponentLibraryDisplayMode] = useState<ComponentLibraryDisplayMode>(\"right\");");
    expect(libraryPanelBlock).toContain("className=\"library-display-mode\"");
    expect(libraryPanelBlock).toContain("role=\"radiogroup\"");
    expect(libraryPanelBlock).toContain("向下展开");
    expect(libraryPanelBlock).toContain("向右浮动");
    expect(libraryPanelBlock).not.toContain("[\"down\", \"向下\"]");
    expect(libraryPanelBlock).not.toContain(">向下<");
    expect(libraryPanelBlock).not.toContain(">向右<");
    expect(libraryPanelBlock).toContain("const libraryExpanded = componentLibraryDisplayMode === \"expanded\";");
    expect(libraryPanelBlock).toContain("const libraryFlyout = componentLibraryDisplayMode === \"right\";");
    expect(libraryPanelBlock).toContain("const expanded = librarySearchNeedle ? true : libraryExpanded");
    expect(libraryPanelBlock).toContain(": expandedAttributeLibraries.includes(group);");
    expect(libraryPanelBlock).not.toContain("expandedAttributeLibraries.includes(group) || hoveredAttributeLibrary === group");
    expect(libraryPanelBlock).toContain("!collapsedExpandedModeAttributeLibraries.includes(group)");
    expect(libraryPanelBlock).toContain("const componentTypeExpanded = librarySearchNeedle");
    expect(libraryPanelBlock).toContain("!collapsedExpandedModeComponentTypes.includes(componentTypeKey)");
    expect(libraryPanelBlock).toContain("libraryFlyout ? false");
    expect(libraryPanelBlock).toContain("onMouseEnter={() => {");
    expect(libraryPanelBlock).toContain("if (!libraryExpanded)");
    expect(libraryPanelBlock).toContain("libraryFlyout && !librarySearchNeedle && hoveredAttributeLibraryComponentType === componentTypeKey");
    expect(source).toContain("className=\"library-group flyout-library-group\"");
    expect(libraryPanelBlock).toContain("renderLibraryFlyout(flyoutListKey, componentTypeKey, group, typeGroup)");
    expect(libraryPanelBlock).toContain("className=\"library-group inline-library-group\"");
    expect(styles).toContain(".library-display-mode");
    expect(styles).toContain("grid-template-columns: repeat(2, minmax(0, 1fr));");
    expect(styles).toContain(".attribute-library-component-type-section.flyout-mode");
    const flyoutLibraryGroupBlock = cssRuleBlock(styles, ".flyout-library-group");
    expect(flyoutLibraryGroupBlock).toContain("position: fixed;");
    expect(flyoutLibraryGroupBlock).toContain("grid-template-columns: repeat(3, 56px);");
    expect(flyoutLibraryGroupBlock).toContain("width: 204px;");
    expect(flyoutLibraryGroupBlock).toContain("max-height: none;");
    expect(flyoutLibraryGroupBlock).toContain("overflow: visible;");
    expect(flyoutLibraryGroupBlock).toContain("top: var(--library-flyout-top, 0px);");
    expect(flyoutLibraryGroupBlock).toContain("left: var(--library-flyout-left, 0px);");
    expect(flyoutLibraryGroupBlock).toContain("z-index: 75;");
    expect(flyoutLibraryGroupBlock).not.toContain("calc(100% -");
    expect(flyoutLibraryGroupBlock).not.toContain("overflow-x");
    expect(flyoutLibraryGroupBlock).not.toContain("overflow-y");
  });

  test("keeps right-side component lists inside the visible library panel without the old downward mode", async () => {
    const source = await readAppSource();
    const styles = await readStyles();
    const libraryPanelStart = source.indexOf("const renderLibraryPanel");
    const libraryPanelEnd = source.indexOf("const renderLeftPanelContent", libraryPanelStart);
    const libraryPanelBlock = source.slice(libraryPanelStart, libraryPanelEnd);

    expect(source).toContain("const [libraryFlyoutPositions, setLibraryFlyoutPositions] = useState<Record<string, { top: number; left: number }>>({});");
    expect(source).toContain("const libraryScrollRef = useRef<HTMLDivElement | null>(null);");
    expect(source).toContain("const libraryComponentListRefs = useRef<Map<string, HTMLDivElement>>(new Map());");
    expect(source).toContain("const libraryComponentTypeHeaderRefs = useRef<Map<string, HTMLButtonElement>>(new Map());");
    expect(source).toContain("const setLibraryComponentTypeHeaderRef = (key: string) => (element: HTMLButtonElement | null) =>");
    expect(source).toContain("const renderLibraryFlyout = (flyoutListKey: string, componentTypeKey: string, group: AttributeLibrary, typeGroup: AttributeLibraryComponentTypeGroup) =>");
    expect(source).toContain("return createPortal(flyout, document.body);");
    expect(source).not.toContain("const scrollLibraryListIntoView = (listElement: HTMLElement) =>");
    expect(source).not.toContain("scrollElement.scrollTop += listRect.bottom - maxBottom;");
    expect(source).toContain("const fitLibraryFlyoutsToVisibleArea = () =>");
    expect(source).toContain("const headerElement = libraryComponentTypeHeaderRefs.current.get(key);");
    expect(source).toContain("const desiredLeft = headerRect.right + gap;");
    expect(source).toContain("const horizontallyOverlapsHeader =");
    expect(source).toContain("setLibraryFlyoutPositions(nextPositions);");
    expect(libraryPanelBlock).toContain("ref={libraryScrollRef}");
    expect(libraryPanelBlock).toContain("hideLibraryFlyout();");
    expect(libraryPanelBlock).toContain("ref={setLibraryComponentTypeHeaderRef(flyoutListKey)}");
    expect(libraryPanelBlock).toContain("ref={setLibraryComponentListRef(inlineListKey)}");
    expect(libraryPanelBlock).toContain("renderLibraryFlyout(flyoutListKey, componentTypeKey, group, typeGroup)");
    expect(libraryPanelBlock).not.toContain("ref={setLibraryComponentListRef(flyoutListKey)}");
    expect(styles).toContain("top: var(--library-flyout-top, 0px);");
    expect(styles).toContain("left: var(--library-flyout-left, 0px);");
  });

  test("keeps node drag previews visible outside the canvas boundary while preserving bounded commit delta", async () => {
    const source = await readAppSource();
    const styles = await readStyles();
    const dragDeltaStart = source.indexOf("const draggingCommitDelta = dragging?.currentDelta;");
    const dragDeltaEnd = source.indexOf("const dragAffectedEdgeIdSet", dragDeltaStart);
    const dragDeltaBlock = source.slice(dragDeltaStart, dragDeltaEnd);
    const applyMoveStart = source.indexOf("const applyNodeDragMove = (point: Point");
    const applyMoveEnd = source.indexOf("const scheduleNodeDragMove", applyMoveStart);
    const applyMoveBlock = source.slice(applyMoveStart, applyMoveEnd);
    const canvasStart = source.indexOf("className={`diagram-canvas");
    const leaveStart = source.indexOf("onPointerLeave={() => {", canvasStart);
    const leaveEnd = source.indexOf("onPointerCancel={() => {", leaveStart);
    const leaveBlock = source.slice(leaveStart, leaveEnd);
    const diagramCanvasBlock = cssRuleBlock(styles, ".diagram-canvas");

    expect(source).toContain("previewDelta?: Point;");
    expect(source).toContain("const computeNodeDragPreviewDelta = (");
    expect(dragDeltaBlock).toContain("const draggingCommitDelta = dragging?.currentDelta;");
    expect(dragDeltaBlock).toContain("const draggingDelta = dragging?.previewDelta ?? draggingCommitDelta;");
    expect(applyMoveBlock).toContain("const previewDelta = computeNodeDragPreviewDelta(currentDrag, point, ctrlKey, shiftKey);");
    expect(applyMoveBlock).toContain("currentDrag.previewDelta?.x === effectivePreviewDelta.x");
    expect(applyMoveBlock).toContain("previewDelta: effectivePreviewDelta");
    expect(applyMoveBlock).toContain("updateMultiNodeDragOverlayTransform(effectivePreviewDelta);");
    expect(source).toContain("const renderPosition = draggingDelta && originalDragPosition");
    expect(source).not.toContain("const renderPosition = draggingDelta && originalDragPosition\n                ? clampNodeToCanvas");
    expect(leaveBlock).toContain("if (draggingRef.current) {");
    expect(leaveBlock).toContain("return;");
    expect(diagramCanvasBlock).toContain("overflow: visible;");
  });

  test("uses an explicit hide policy for right-side component library flyouts", async () => {
    const source = await readAppSource();
    const libraryPanelStart = source.indexOf("const renderLibraryPanel");
    const libraryPanelEnd = source.indexOf("const renderLeftPanelContent", libraryPanelStart);
    const libraryPanelBlock = source.slice(libraryPanelStart, libraryPanelEnd);
    const hideStart = source.indexOf("const hideLibraryFlyout = () =>");
    const hideEnd = source.indexOf("const scheduleLibraryFlyoutClose", hideStart);
    const hideBlock = source.slice(hideStart, hideEnd);
    const outsideStart = source.indexOf("const hideLibraryFlyoutOnOutsidePointerDown = (event: globalThis.PointerEvent) =>");
    const outsideEnd = source.indexOf("window.addEventListener(\"pointerdown\", hideLibraryFlyoutOnOutsidePointerDown, true);", outsideStart);
    const outsideBlock = source.slice(outsideStart, outsideEnd);

    expect(hideBlock).toContain("clearLibraryFlyoutCloseTimer();");
    expect(hideBlock).toContain("setHoveredAttributeLibrary(\"\");");
    expect(hideBlock).toContain("setHoveredAttributeLibraryComponentType(\"\");");
    expect(hideBlock).toContain("setLibraryFlyoutPositions({});");
    expect(source).toContain("setHoveredAttributeLibraryComponentType((current) => componentTypeKey ? current === componentTypeKey ? \"\" : current : \"\");");
    expect(source).toContain("if (leftPanelTab !== \"library\" || componentLibraryDisplayMode !== \"right\" || librarySearchNeedle) {");
    expect(source).toContain("if (!leftPanelVisible) {");
    expect(source).toContain("hideLibraryFlyout();");
    expect(outsideBlock).toContain("event.target as Node | null");
    expect(outsideBlock).toContain("const targetElement = target instanceof Element ? target : target.parentElement;");
    expect(outsideBlock).toContain("targetElement?.closest(\".attribute-library-component-type-section.flyout-mode\")");
    expect(outsideBlock).not.toContain("libraryPanel?.contains(target)");
    expect(outsideBlock).toContain("flyoutElement?.contains(target)");
    expect(source).toContain("if (event.key === \"Escape\" && hoveredAttributeLibraryComponentType) {");
    expect(source).toContain("window.addEventListener(\"pointerdown\", hideLibraryFlyoutOnOutsidePointerDown, true);");
    expect(source).toContain("window.removeEventListener(\"pointerdown\", hideLibraryFlyoutOnOutsidePointerDown, true);");
    expect(libraryPanelBlock).toContain("hideLibraryFlyout();");
    expect(libraryPanelBlock).toContain("if (componentLibraryDisplayMode === \"right\") {");
    expect(source).toContain("onDragStart={(event) => {");
  });

  test("uses library group names for terminal energy dropdowns in device definition dialogs", async () => {
    const source = await readAppSource();
    const optionsStart = source.indexOf("const TERMINAL_TYPE_OPTIONS");
    const optionsEnd = source.indexOf("const CONTAINER_TERMINAL_ASSOCIATION_OPTIONS", optionsStart);
    const optionsBlock = source.slice(optionsStart, optionsEnd);
    const terminalLabelStart = source.indexOf("terminalLabels: terminalTypes.map");
    const terminalLabelEnd = source.indexOf("isContainer: customDeviceDraft.isContainer", terminalLabelStart);
    const terminalLabelBlock = source.slice(terminalLabelStart, terminalLabelEnd);

    expect(source).toContain("TERMINAL_TYPE_LIBRARY_LABELS");
    expect(optionsBlock).toContain("TERMINAL_TYPE_LIBRARY_LABELS.ac");
    expect(optionsBlock).toContain("TERMINAL_TYPE_LIBRARY_LABELS.dc");
    expect(optionsBlock).toContain("TERMINAL_TYPE_LIBRARY_LABELS.h2");
    expect(optionsBlock).toContain("TERMINAL_TYPE_LIBRARY_LABELS.heat");
    expect(optionsBlock).not.toContain("label: \"交流电\"");
    expect(optionsBlock).not.toContain("label: \"直流电\"");
    expect(terminalLabelBlock).toContain("TERMINAL_TYPE_LIBRARY_LABELS");
  });

  test("labels device definition parameter actions as parameters instead of attributes", async () => {
    const source = await readAppSource();

    expect(source).toContain("新增参数");
    expect(source).not.toContain("新增属性");
    expect(source).not.toContain("修改属性");
  });

  test("lets terminal stubs scale with the view like device glyph strokes", async () => {
    const styles = await readStyles();
    const terminalStubBlock = cssRuleBlock(styles, ".terminal-stub");

    expect(terminalStubBlock).not.toContain("vector-effect");
  });

  test("keeps upright static symbol text from deforming under non-uniform resize", async () => {
    const source = await readAppSource();
    const matrixStart = source.indexOf("function nodeCounterTransformMatrix");
    const matrixEnd = source.indexOf("function uprightText", matrixStart);
    const matrixBlock = source.slice(matrixStart, matrixEnd);
    const staticTextStart = source.indexOf("function staticShapeText");
    const staticTextEnd = source.indexOf("function staticConnectorMarker", staticTextStart);
    const staticTextBlock = source.slice(staticTextStart, staticTextEnd);

    expect(matrixBlock).toContain("const desiredScale = preserveScale ? Math.sqrt((Math.abs(scaleX) || 1) * (Math.abs(scaleY) || 1)) : 1;");
    expect(matrixBlock).toContain("const desiredScaleX = desiredScale;");
    expect(matrixBlock).toContain("const desiredScaleY = desiredScale;");
    expect(matrixBlock).not.toContain("preserveScale ? Math.abs(scaleX)");
    expect(matrixBlock).not.toContain("preserveScale ? Math.abs(scaleY)");
    expect(staticTextBlock).toContain('const fontSize = miniature ? 12 : staticNumericParam(node, "fontSize", 16, 8);');
    expect(staticTextBlock).toContain("fontSize,");
    expect(staticTextBlock).toContain("return uprightText(");
  });

  test("shows static symbol font size as a 100 percent baseline before text styles", async () => {
    const source = await readAppSource();
    const staticPanelStart = source.indexOf("{isStaticNode(inspectorSelectedNode) && (");
    const fontFamilyIndex = source.indexOf('renderChineseParamHeader("fontFamily")', staticPanelStart);
    const fontSizeIndex = source.indexOf('<th title="fontSize">字体大小（100%）</th>', staticPanelStart);
    const textStyleIndex = source.indexOf("<th>文字样式</th>", staticPanelStart);
    const buttonEditorIndex = source.indexOf("{renderStaticButtonActionEditor(inspectorSelectedNode)}", staticPanelStart);
    const fontSizeRowStart = source.lastIndexOf("<tr>", fontSizeIndex);
    const fontSizeRowEnd = source.indexOf("</tr>", fontSizeIndex);
    const fontSizeRow = source.slice(fontSizeRowStart, fontSizeRowEnd);

    expect(staticPanelStart).toBeGreaterThanOrEqual(0);
    expect(fontFamilyIndex).toBeGreaterThan(staticPanelStart);
    expect(fontSizeIndex).toBeGreaterThan(fontFamilyIndex);
    expect(textStyleIndex).toBeGreaterThan(fontSizeIndex);
    expect(buttonEditorIndex).toBeGreaterThan(textStyleIndex);
    expect(fontSizeRow).toContain('type="number"');
    expect(fontSizeRow).toContain('min="8"');
    expect(fontSizeRow).toContain('max="160"');
    expect(fontSizeRow).toContain('updateParam("fontSize", event.target.value)');
  });

  test("exposes selected graphic display-layer controls in the topbar and context menu", async () => {
    const source = await readAppSource();
    const importStart = source.indexOf("} from \"./selectionActions\";");
    const actionStart = source.indexOf("const adjustSelectedDisplayLayer =");
    const actionEnd = source.indexOf("const clearTransientSelectionState", actionStart);
    const actionBlock = source.slice(actionStart, actionEnd);
    const topbarStart = source.indexOf("<header className=\"topbar\">");
    const topbarEnd = source.indexOf("</header>", topbarStart);
    const topbarBlock = source.slice(topbarStart, topbarEnd);
    const contextStart = source.indexOf("{contextMenu && (");
    const contextEnd = source.indexOf("{projectMenu && (", contextStart);
    const contextBlock = source.slice(contextStart, contextEnd);

    expect(source.slice(0, importStart)).toContain("reorderItemsByDisplayLayer");
    expect(actionBlock).toContain("const nextNodes = reorderItemsByDisplayLayer(nodes, activeSelectedNodeIds, action);");
    expect(actionBlock).toContain("if (nextNodes === nodes)");
    expect(actionBlock).toContain("pushUndoSnapshot();");
    expect(actionBlock).toContain("setNodes(nextNodes);");
    expect(topbarBlock).toContain("className=\"topbar-dropdown display-layer-dropdown\"");
    expect(topbarBlock).toContain("title=\"显示层级\"");
    expect(topbarBlock).toContain("aria-label=\"显示层级\"");
    expect(topbarBlock).toContain("role=\"menu\" aria-label=\"显示层级\"");
    expect(topbarBlock).toContain("<span>提升显示层级</span>");
    expect(topbarBlock).toContain("<span>降低显示层级</span>");
    expect(topbarBlock).toContain("<span>顶层显示</span>");
    expect(topbarBlock).toContain("<span>底层显示</span>");
    expect(topbarBlock).toContain("adjustSelectedDisplayLayer(\"raise\")");
    expect(topbarBlock).toContain("adjustSelectedDisplayLayer(\"lower\")");
    expect(topbarBlock).toContain("adjustSelectedDisplayLayer(\"front\")");
    expect(topbarBlock).toContain("adjustSelectedDisplayLayer(\"back\")");
    expect(topbarBlock).toContain("disabled={!canAdjustSelectedDisplayLayer}");
    expect(topbarBlock).not.toContain("className=\"display-layer-button-group\"");
    expect(contextBlock).toContain("显示层级");
    expect(contextBlock).toContain("提升显示层级");
    expect(contextBlock).toContain("降低显示层级");
    expect(contextBlock).toContain("顶层显示");
    expect(contextBlock).toContain("底层显示");
  });

  test("keeps only the real canvas boundary as the visible canvas border", async () => {
    const source = await readAppSource();
    const styles = await readStyles();
    const canvasBlock = cssRuleBlock(styles, ".diagram-canvas");
    const boundaryBlock = cssRuleBlock(styles, ".canvas-boundary");

    expect(source).toContain("<rect className=\"canvas-boundary\" x=\"0\" y=\"0\" width={canvasRenderBounds.width} height={canvasRenderBounds.height} />");
    expect(canvasBlock).not.toContain("border:");
    expect(canvasBlock).not.toContain("box-shadow:");
    expect(canvasBlock).toContain("background: transparent;");
    expect(canvasBlock).not.toContain("background: #f8fafc;");
    expect(boundaryBlock).toContain("stroke: #475569");
    expect(boundaryBlock).toContain("pointer-events: none");
  });

  test("bridges the topbar dropdown hover gap between trigger and floating menu", async () => {
    const styles = await readStyles();
    const topbarBlock = cssRuleBlock(styles, ".topbar {");
    const sidePanelBlock = cssRuleBlock(styles, ".floating-side-panel {");
    const dropdownMenuBlock = cssRuleBlock(styles, ".topbar-dropdown-menu {");
    const dropdownBridgeBlock = cssRuleBlock(styles, ".topbar-dropdown::after");

    expect(topbarBlock).toContain("z-index: 90;");
    expect(sidePanelBlock).toContain("z-index: 70;");
    expect(dropdownMenuBlock).toContain("z-index: 100;");
    expect(dropdownBridgeBlock).toContain("content: \"\"");
    expect(dropdownBridgeBlock).toContain("top: 100%");
    expect(dropdownBridgeBlock).toContain("height: 8px");
    expect(styles).toContain(".topbar-dropdown:hover .topbar-dropdown-menu");
  });

  test("keeps bus selection outlines compact relative to bus glyphs", async () => {
    const styles = await readStyles();
    const busSelectedBlock = cssRuleBlock(styles, ".diagram-node.bus-node.selected .bus-glyph");
    const busFocusedBlock = cssRuleBlock(styles, ".diagram-node.bus-node.selected.focused .bus-glyph");
    const storageSelectedBlock = cssRuleBlock(styles, ".diagram-node.storage-node.selected .node-hitbox");
    const storageFocusedBlock = cssRuleBlock(styles, ".diagram-node.storage-node.selected.focused .node-hitbox");

    expect(busSelectedBlock).toContain("stroke-width: 1.75");
    expect(busSelectedBlock).toContain("vector-effect: non-scaling-stroke");
    expect(busFocusedBlock).toContain("stroke-width: 2.25");
    expect(storageSelectedBlock).toContain("stroke-width: 2");
    expect(storageFocusedBlock).toContain("stroke-width: 2.25");
  });

  test("keeps upright static symbol selection outlines aligned after right-angle rotation", async () => {
    const source = await readAppSource();
    const styles = await readStyles();
    const renderStart = source.indexOf("{detailedViewportNodes.map((node) =>");
    const renderEnd = source.indexOf("{renderSingleTransformRotateOriginGhost()}", renderStart);
    const renderBlock = source.slice(renderStart, renderEnd);
    const singleDragStart = source.indexOf("const startSingleTransformDrag");
    const singleDragEnd = source.indexOf("const startGroupMoveDrag", singleDragStart);
    const singleDragBlock = source.slice(singleDragStart, singleDragEnd);
    const pointerStart = source.indexOf("if (transformDrag && svgRef.current)");
    const pointerEnd = source.indexOf("if (!draggingRef.current || !svgRef.current)", pointerStart);
    const pointerBlock = source.slice(pointerStart, pointerEnd);
    const lodStart = source.indexOf("const lodSelectedNodeMarkup = useMemo");
    const lodEnd = source.indexOf("const lodNodeFromEvent", lodStart);
    const lodBlock = source.slice(lodStart, lodEnd);
    const selectedHitboxOverrideBlock = cssRuleBlock(styles, ".diagram-node.static-upright-selection-node.selected .node-hitbox");
    const focusedHitboxOverrideBlock = cssRuleBlock(styles, ".diagram-node.static-upright-selection-node.selected.focused .node-hitbox");
    const outlineBlock = cssRuleBlock(styles, ".node-upright-selection-outline");
    const selectedOutlineBlock = cssRuleBlock(styles, ".diagram-node.static-upright-selection-node.selected .node-upright-selection-outline");
    const focusedOutlineBlock = cssRuleBlock(styles, ".diagram-node.static-upright-selection-node.selected.focused .node-upright-selection-outline");
    const staticFrameBlock = cssRuleBlock(styles, ".node-static-selection-frame");
    const staticGlowBlock = cssRuleBlock(styles, ".node-static-selection-glow");
    const staticCornerBlock = cssRuleBlock(styles, ".node-static-selection-corner");
    const focusedStaticGlowBlock = cssRuleBlock(styles, ".diagram-node.selected.focused .node-static-selection-glow");
    const focusedStaticCornerBlock = cssRuleBlock(styles, ".diagram-node.selected.focused .node-static-selection-corner");

    expect(source).toContain("function nodeUsesUprightStaticSelectionOutline");
    expect(source).toContain("function nodeUprightSelectionOutlineRect");
    expect(source).toContain("function nodeUprightRotateHandleControlPoints");
    expect(source).toContain("function nodeScaleHandleControlPoint");
    expect(source).toContain("const signedScaleFromUprightHandleDelta");
    expect(source).toContain("const proportionalSignedScaleFromUprightHandleDelta");
    expect(source).toContain("uprightStaticSelection?: boolean;");
    expect(singleDragBlock).toContain("uprightStaticSelection: nodeUsesUprightStaticSelectionOutline(node, nodeImage(node), nodeForegroundImage(node))");
    expect(pointerBlock).toContain("transformDrag.uprightStaticSelection");
    expect(pointerBlock).toContain("signedScaleFromUprightHandleDelta");
    expect(pointerBlock).toContain("proportionalSignedScaleFromUprightHandleDelta");
    expect(renderBlock).toContain("const uprightStaticSelectionOutline = nodeUsesUprightStaticSelectionOutline(node, imageHref, foregroundImageHref);");
    expect(renderBlock).toContain("${uprightStaticSelectionOutline ? \"static-upright-selection-node\" : \"\"}");
    expect(renderBlock).toContain("const uprightSelectionOutlineRect = uprightStaticSelectionOutline ? nodeUprightSelectionOutlineRect(node) : null;");
    expect(renderBlock).toContain("const rotateHandlePoints = uprightStaticSelectionOutline");
    expect(renderBlock).toContain("nodeUprightRotateHandleControlPoints(node, rotateStemStart, rotateStemEnd, rotateHandleGap)");
    expect(renderBlock).toContain("nodeScaleHandleControlPoint(node, handle, handleGapX, handleGapY, uprightStaticSelectionOutline)");
    expect(renderBlock).toContain("className=\"node-upright-selection-outline\"");
    expect(renderBlock).toContain("const nodeIsStatic = isStaticNode(node);");
    expect(renderBlock).toContain("const showStaticSelectionFrame = nodeIsStatic && selected && !uprightStaticSelectionOutline;");
    expect(renderBlock).toContain("const staticSelectionCornerPoints = [");
    expect(renderBlock).toContain("className=\"node-static-selection-frame\"");
    expect(renderBlock).toContain("className=\"node-static-selection-glow\"");
    expect(renderBlock).toContain("className=\"node-static-selection-corner\"");
    expect(renderBlock).not.toContain("className=\"node-static-selection-halo\"");
    expect(renderBlock).toContain("x={uprightSelectionOutlineRect.x}");
    expect(renderBlock).toContain("width={uprightSelectionOutlineRect.width}");
    expect(lodBlock).toContain("nodeUsesUprightStaticSelectionOutline(node)");
    expect(lodBlock).toContain("class=\"lod-node-selection lod-node-upright-selection\"");
    expect(outlineBlock).toContain("pointer-events: none");
    expect(outlineBlock).toContain("vector-effect: non-scaling-stroke");
    expect(selectedHitboxOverrideBlock).toContain("stroke: transparent");
    expect(focusedHitboxOverrideBlock).toContain("stroke: transparent");
    expect(selectedOutlineBlock).toContain("stroke: transparent");
    expect(selectedOutlineBlock).toContain("stroke-width: 0");
    expect(focusedOutlineBlock).toContain("stroke: transparent");
    expect(focusedOutlineBlock).toContain("stroke-width: 0");
    expect(selectedOutlineBlock).toContain("fill: rgba(249, 115, 22, 0.16)");
    expect(staticFrameBlock).toContain("pointer-events: none");
    expect(staticGlowBlock).toContain("stroke: transparent");
    expect(staticGlowBlock).toContain("stroke-width: 0");
    expect(staticGlowBlock).toContain("filter: drop-shadow(0 0 13px rgba(249, 115, 22, 0.58))");
    expect(staticCornerBlock).toContain("fill: #f97316");
    expect(staticCornerBlock).toContain("stroke: #fff7ed");
    expect(focusedStaticGlowBlock).toContain("stroke: transparent");
    expect(focusedStaticGlowBlock).toContain("stroke-width: 0");
    expect(focusedStaticCornerBlock).toContain("fill: #ea580c");
    expect(styles).not.toContain(".node-static-selection-halo");
  });

  test("rebuilds moved-to-stationary connection routes without a moved-node count gate", async () => {
    const source = await readAppSource();
    const commitStart = source.indexOf("const commitFastMovedGraph");
    const commitEnd = source.indexOf("setNodes(nextNodes);", commitStart);
    const commitBlock = source.slice(commitStart, commitEnd);

    expect(commitBlock).toContain("rebuildExternalConnectionRoutesForMovedNodes");
    expect(commitBlock).toContain("movedNodeIds.length > 0");
    expect(commitBlock).not.toContain("SMALL_MOVE_FULL_REBUILD_NODE_LIMIT");
    expect(source).not.toContain("const SMALL_MOVE_FULL_REBUILD_NODE_LIMIT");
  });

  test("uses a deferred drag-style session for keyboard nudges instead of committing every arrow key", async () => {
    const source = await readAppSource();
    const keyHandlerStart = source.indexOf("const handleKeyDown = (event: KeyboardEvent)");
    const keyHandlerEnd = source.indexOf("window.addEventListener(\"keydown\", handleKeyDown)", keyHandlerStart);
    const keyHandlerBlock = source.slice(keyHandlerStart, keyHandlerEnd);
    const keyboardMoveStart = source.indexOf("const finishKeyboardMove");
    const keyboardMoveEnd = source.indexOf("const moveSelection", keyboardMoveStart);
    const keyboardMoveBlock = source.slice(keyboardMoveStart, keyboardMoveEnd);
    const keyboardNudgeStart = source.indexOf("const nudgeSelectionByKeyboard");
    const keyboardNudgeEnd = source.indexOf("const moveSelection", keyboardNudgeStart);
    const keyboardNudgeBlock = source.slice(keyboardNudgeStart, keyboardNudgeEnd);
    const keyboardReleaseStart = source.indexOf("const releaseKeyboardMoveKey");
    const keyboardReleaseEnd = source.indexOf("const startKeyboardMoveSession", keyboardReleaseStart);
    const keyboardReleaseBlock = source.slice(keyboardReleaseStart, keyboardReleaseEnd);

    expect(keyHandlerBlock).toContain("nudgeSelectionByKeyboard(");
    expect(keyHandlerBlock).not.toContain("moveSelection(");
    expect(source).toContain("const pendingKeyboardMoveDeltaRef");
    expect(source).toContain("const keyboardMoveActiveKeyDeltasRef");
    expect(source).toContain("const keyboardMoveLastFrameTimeRef");
    expect(source).toContain("const keyboardMoveFrameElapsedMsRef");
    expect(source).toContain("const keyboardMoveFrameRef");
    expect(source).toContain("const keyboardMoveCommitCancelRef");
    expect(keyHandlerBlock).toContain("event.repeat");
    expect(keyHandlerBlock).toContain("releaseKeyboardMoveKey(event.key)");
    expect(keyboardMoveBlock).toContain("startKeyboardMoveSession");
    expect(keyboardMoveBlock).toContain("startKeyboardMoveSession(false)");
    expect(keyboardMoveBlock).toContain("scheduleKeyboardNudgeFrame");
    expect(keyboardMoveBlock).toContain("window.requestAnimationFrame");
    expect(keyboardMoveBlock).toContain("flushPendingKeyboardMove(false)");
    expect(keyboardMoveBlock).toContain("keyboardMoveActiveFrameDelta");
    expect(keyboardMoveBlock).toContain("KEYBOARD_MOVE_REPEAT_RATE_PER_SECOND");
    expect(keyboardMoveBlock).toContain("KEYBOARD_MOVE_FRAME_INTERVAL_MS");
    expect(keyboardMoveBlock).toContain("keyboardMoveFrameElapsedMsRef.current");
    expect(keyboardMoveBlock).toContain("keyboardMoveActiveKeyDeltasRef.current.size > 0");
    expect(keyboardMoveBlock).toContain("keyboardMoveActiveKeyDeltasRef.current.size === 0");
    expect(keyboardMoveBlock).not.toContain("ensureDraggingUndoSnapshot");
    expect(keyboardMoveBlock).toContain("const multiNodeMove = isMultiNodeMoveState(activeDragging);");
    expect(keyboardMoveBlock).toContain("if (multiNodeMove)");
    expect(keyboardMoveBlock).toContain("updateSingleNodeDragImperativePreview(nextDragging, boundedDelta);");
    expect(keyboardMoveBlock).toContain("setDragging(singleNodeDragRenderState(nextDragging));");
    expect(keyboardMoveBlock).not.toContain("setDragging((current) =>");
    expect(keyboardMoveBlock).toContain("scheduleKeyboardMoveCommit");
    expect(keyboardMoveBlock).toContain("scheduleIdleWork");
    expect(keyboardMoveBlock).toContain("finishKeyboardMove");
    expect(keyboardMoveBlock).toContain("flushPendingKeyboardMove(true)");
    expect(keyboardMoveBlock).toContain("clearKeyboardMoveCommitSchedule();");
    expect(keyboardReleaseBlock).toContain("scheduleKeyboardMoveCommit();");
    expect(keyboardReleaseBlock).not.toContain("finishKeyboardMove();");
    expect(keyboardNudgeBlock).not.toContain("boundedDeltaForMoveGeometry");
    expect(keyboardNudgeBlock).not.toContain("setDragging");
  });

  test("commits a single keyboard nudge directly without rendering a drag ghost", async () => {
    const source = await readAppSource();
    const keyboardNudgeStart = source.indexOf("const nudgeSelectionByKeyboard");
    const keyboardNudgeEnd = source.indexOf("const moveSelection", keyboardNudgeStart);
    const keyboardNudgeBlock = source.slice(keyboardNudgeStart, keyboardNudgeEnd);

    expect(keyboardNudgeBlock).toContain("if (!repeated && !wasActive && !draggingRef.current)");
    expect(keyboardNudgeBlock).toContain("moveSelection(dx, dy);");
    expect(keyboardNudgeBlock).toContain("return;");
    expect(keyboardNudgeBlock.indexOf("moveSelection(dx, dy);")).toBeLessThan(
      keyboardNudgeBlock.indexOf("startKeyboardMoveSession(false)")
    );
  });

  test("keeps single-node drag hot path lightweight and defers terminal reconciliation", async () => {
    const source = await readAppSource();
    const previewKeyStart = source.indexOf("const singleNodeDragPreviewKey");
    const previewKeyEnd = source.indexOf("const buildLightweightNodeDragPreviewRoutes", previewKeyStart);
    const previewKeyBlock = source.slice(previewKeyStart, previewKeyEnd);
    const updatePreviewStart = source.indexOf("const updateNodeDragLightweightEdgePreview");
    const updatePreviewEnd = source.indexOf("const singleNodeDragInteractionNodes", updatePreviewStart);
    const updatePreviewBlock = source.slice(updatePreviewStart, updatePreviewEnd);
    const syncFinalizeStart = source.indexOf("const shouldFinalizeMovedNodeEdgesSynchronously");
    const syncFinalizeEnd = source.indexOf("const terminalReconcileNodeScope", syncFinalizeStart);
    const syncFinalizeBlock = source.slice(syncFinalizeStart, syncFinalizeEnd);
    const deferredRepairStart = source.indexOf("const scheduleDeferredMovedConnectionRepair");
    const deferredRepairEnd = source.indexOf("const moveRouteRepairSeedEdges", deferredRepairStart);
    const deferredRepairBlock = source.slice(deferredRepairStart, deferredRepairEnd);
    const commitStart = source.indexOf("const commitFastMovedGraphPatches");
    const commitEnd = source.indexOf("const clampPointToCanvas", commitStart);
    const commitBlock = source.slice(commitStart, commitEnd);

    expect(source).toContain("type SingleNodeDeferredRepairOptions");
    expect(source).toContain("const shouldDeferSingleNodeTerminalReconciliation");
    expect(previewKeyBlock).toContain("singleNodeDragPreviewKey");
    expect(previewKeyBlock).toContain("`single:");
    expect(updatePreviewBlock).toContain("singleNodeDragPreviewKey(dragState, roundedPreviewDelta, previewEdges)");
    expect(updatePreviewBlock).not.toContain(": \"\";");
    expect(syncFinalizeBlock).toContain("movedNodeIds.length > 1");
    expect(syncFinalizeBlock).not.toContain("movedNodeIds.length !== 1");
    expect(deferredRepairBlock).toContain("options: SingleNodeDeferredRepairOptions = {}");
    expect(deferredRepairBlock).toContain("options.reconcileTerminalConnections");
    expect(deferredRepairBlock).toContain("finalizeMovedNodeEdgesFast(");
    expect(deferredRepairBlock).toContain("edgePatchFromCandidateEdges(latestCandidateEdges, optimizedEdges)");
    expect(commitBlock).toContain("!wholeLayerMove &&\n      shouldDeferSingleNodeTerminalReconciliation(");
    expect(commitBlock).toContain("reconcileTerminalConnections: deferSingleNodeTerminalReconciliation");
  });

  test("does not snap placed, drawn, dragged, or keyboard-moved graphics to a canvas grid", async () => {
    const source = await readAppSource();
    const keyboardHandlerStart = source.indexOf("const handleGlobalKeyDown = ");
    const keyboardHandlerEnd = source.indexOf("const handleGlobalKeyUp = ", keyboardHandlerStart);
    const keyboardHandlerBlock = source.slice(keyboardHandlerStart, keyboardHandlerEnd);
    const pasteStart = source.indexOf("const pasteSelection = () =>");
    const pasteEnd = source.indexOf("const createGraphTemplateType", pasteStart);
    const pasteBlock = source.slice(pasteStart, pasteEnd);
    const templateDropStart = source.indexOf("const dropGraphTemplate = ");
    const templateDropEnd = source.indexOf("function finishMarqueeSelectionFromPoints", templateDropStart);
    const templateDropBlock = source.slice(templateDropStart, templateDropEnd);
    const dragDeltaStart = source.indexOf("const computeNodeDragPreviewDelta = ");
    const dragDeltaEnd = source.indexOf("const applyNodeDragMove", dragDeltaStart);
    const dragDeltaBlock = source.slice(dragDeltaStart, dragDeltaEnd);
    const keyboardDeltaStart = source.indexOf("const applyKeyboardMoveDelta = ");
    const keyboardDeltaEnd = source.indexOf("const flushPendingKeyboardMove", keyboardDeltaStart);
    const keyboardDeltaBlock = source.slice(keyboardDeltaStart, keyboardDeltaEnd);
    const moveSelectionStart = source.indexOf("const moveSelection = ");
    const moveSelectionEnd = source.indexOf("const undoScopeForNodeFootprintPatch", moveSelectionStart);
    const moveSelectionBlock = source.slice(moveSelectionStart, moveSelectionEnd);
    const dropStart = source.indexOf("const handleDrop = ");
    const dropEnd = source.indexOf("const handleNodePointerDown", dropStart);
    const dropBlock = source.slice(dropStart, dropEnd);
    const placeStart = source.indexOf("const placeLibraryDeviceAtPoint =");
    const placeEnd = source.indexOf("const commitLibraryPlacementAtPoint", placeStart);
    const placeBlock = source.slice(placeStart, placeEnd);
    const staticDrawStart = source.indexOf("const startInteractiveStaticDrawing = ");
    const staticDrawEnd = source.indexOf("const renderInteractiveStaticDrawingPreview", staticDrawStart);
    const staticDrawBlock = source.slice(staticDrawStart, staticDrawEnd);

    expect(source).not.toContain("snapNodePositionToGrid");
    expect(source).not.toContain("snapPointToGrid");
    expect(source).not.toContain("const snapNodeToCanvasGrid = ");
    expect(source).not.toContain("const snapMoveDeltaToGrid = ");
    expect(keyboardHandlerBlock).not.toContain("CANVAS_GRID_SIZE");
    expect(pasteBlock).not.toContain("snapPointToGrid");
    expect(templateDropBlock).not.toContain("snapPointToGrid");
    expect(dropBlock).toContain("placeLibraryDeviceAtPoint(template");
    expect(placeBlock).toContain("const createdNode = { ...createNodeFromTemplate(template, position), layerId: activeLayerId };");
    expect(placeBlock).toContain("const rawNode = isRoutableLineDeviceKind(createdNode.kind)");
    expect(placeBlock).not.toContain("snapNodeToCanvasGrid");
    expect(staticDrawBlock).not.toContain("snapPointToGrid");
    expect(staticDrawBlock).toContain("const pointer = clampPointToCanvas(startPoint);");
    expect(staticDrawBlock).toContain("appendDistinctStaticDrawingPoint(staticDrawing.points, clampPointToCanvas(finalPoint))");
    expect(staticDrawBlock).toContain("const nextPoint = clampPointToCanvas(point);");
    expect(staticDrawBlock).toContain("const previewPoint = clampPointToCanvas(point);");
    expect(dragDeltaBlock).not.toContain("snapMoveDeltaToGrid");
    expect(dragDeltaBlock).toContain("const smartSnap = computeSmartAlignmentSnap(dragState, movementDelta, ctrlKey || shiftKey);");
    expect(dragDeltaBlock).toContain("return smartSnap.delta;");
    expect(keyboardDeltaBlock).not.toContain("snapMoveDeltaToGrid");
    expect(moveSelectionBlock).not.toContain("snapMoveDeltaToGrid");
  });

  test("manages custom component libraries from the new-device manager tree", async () => {
    const source = await readAppSource();
    const styles = await readStyles();

    expect(source).toContain("CUSTOM_ATTRIBUTE_LIBRARIES_STORAGE_KEY");
    expect(source).toContain("normalizeCustomAttributeLibraries");
    expect(source).toContain("readCustomAttributeLibraries");
    expect(source).toContain("customAttributeLibraries");
    expect(source).toContain("selectableAttributeLibraries");
    expect(source).toContain("createCustomAttributeLibrary");
    expect(source).toContain("deleteCustomAttributeLibrary");
    expect(source).toContain("customComponentTreeSearchQuery");
    expect(source).toContain("filteredCustomComponentTreeByComponentType");
    expect(source).toContain("displayedCustomComponentTreeLibraries");
    expect(source).toContain("aria-label=\"搜索元件结构\"");
    expect(source).toContain("componentTypeDisplayParts(typeGroup.section)");
    expect(source).toContain("window.prompt(\"请输入新属性库名称\"");
    expect(source).toContain("属性库名称已存在，无法新增同名属性库。");
    expect(source).toContain("默认属性库无法删除。");
    expect(source).toContain("window.confirm(`属性库“${attributeLibraryName}”中共有");
    expect(source).toContain("删除属性库会同时删除这些元件及其自定义元件类型");
    expect(source).toContain("deletedComponentTypeKeys");
    expect(source).toContain("setCustomComponentTypes((current) => current.filter((componentType) => !deletedComponentTypeKeys.has(componentType.name.toLowerCase())))");
    expect(source).toContain("PROTECTED_ATTRIBUTE_LIBRARIES.has(attributeLibraryName)");
    expect(source).toContain("PROTECTED_ATTRIBUTE_LIBRARIES.has(oldAttributeLibraryName)");
    expect(source).toContain("renderCustomComponentManagerTree");
    expect(source).toContain("custom-component-manager-actions");
    expect(source).toContain("selectableAttributeLibraries.map((group)");
    expect(source).not.toContain("新增自定义属性库");
    expect(styles).toContain(".custom-attribute-library-select-row");
    expect(styles).toContain(".dialog-tree-search");
    expect(styles).toContain(".dialog-tree-bilingual");
  });

  test("manages English device types from the former export-section dropdown", async () => {
    const source = await readAppSource();
    const styles = await readStyles();
    const customTemplateStart = source.indexOf("const template: DeviceTemplate = {", source.indexOf("const saveCustomDeviceTemplate = () =>"));
    const customTemplateEnd = source.indexOf("setCustomDeviceTemplates((current) =>", customTemplateStart);
    const customTemplateBlock = source.slice(customTemplateStart, customTemplateEnd);

    expect(source).toContain("CUSTOM_COMPONENT_TYPES_STORAGE_KEY");
    expect(source).toContain("DEVICE_TYPE_NAME_PATTERN");
    expect(source).toContain("normalizeCustomComponentTypes");
    expect(source).toContain("readCustomComponentTypes");
    expect(source).toContain("componentTypeOptions");
    expect(source).toContain("createCustomComponentType");
    expect(source).toContain("deleteCustomComponentType");
    expect(source).toContain("请输入新元件类型英文名称");
    expect(source).toContain("元件类型必须是英文名称");
    expect(source).toContain("元件类型已存在，无法新增同名元件类型。");
    expect(source).toContain("内置元件类型无法删除。");
    expect(source).toContain("libraryTemplates.filter((template) => template.custom && resolveTemplateComponentType(template).toLowerCase() === componentType.toLowerCase())");
    expect(source).toContain("setCustomDeviceTemplates((current) => current.filter((template) => !deletedKinds.has(template.kind)))");
    expect(source).toContain("nextCustomTemplateKind");
    expect(source).toContain("kind: customKind");
    expect(source).toContain("componentName: \"\"");
    expect(source).toContain("const componentLabel = customDeviceDraft.componentName.trim() || componentType;");
    expect(source).toContain("label: componentLabel");
    expect(source).toContain("placeholder=\"例如 水电、核电、风电、光伏\"");
    expect(source).toContain("component_type: customDeviceDraft.componentType");
    expect(source).toContain("backgroundImageAssetId: string;");
    expect(source).toContain("backgroundImageAssetId: template.params.backgroundImageAssetId ?? \"\"");
    expect(source).toContain("asset = await uploadBackendImage(file.name, imageData, activeImageFolderId)");
    expect(source).toContain("backgroundImage: asset?.url ?? imageData");
    expect(source).toContain("backgroundImageAssetId: asset?.id ?? \"\"");
    expect(source).toContain('accept="image/*,.svg,image/svg+xml"');
    expect(source).toContain("上传SVG/图片到后台");
    expect(source).toContain("后台已保存");
    expect(source).toContain("backgroundImageAssetId");
    expect(source).toContain("allowResizeTransform: string;");
    expect(source).toContain("allowResizeTransform: \"0\"");
    expect(source).toContain("allowResizeTransform: templateResizeTransformValue(template)");
    expect(source).toContain("allowResizeTransform: customDeviceDraft.allowResizeTransform === \"1\"");
    expect(customTemplateBlock).not.toContain("[ALLOW_RESIZE_TRANSFORM_PARAM]: customDeviceDraft.allowResizeTransform");
    expect(source).toContain("是否允许变形");
    expect(source).toContain("value={customDeviceDraft.allowResizeTransform}");
    expect(source).toContain("allowResizeTransform: event.target.value");
    expect(source).not.toContain("placeholder=\"例如 ACUnit\"");
    expect(source).not.toContain("<span>导出Section</span>");
    expect(source).toContain("className=\"custom-device-name-field\"");
    expect(source).toContain("className=\"custom-device-container-field\"");
    expect(source).toContain("className=\"custom-device-resize-field\"");
    expect(source).toContain("className=\"custom-device-terminal-count-field\"");
    expect(styles).toContain(".custom-device-form-grid .custom-attribute-library-field,");
    expect(styles).toContain(".custom-device-form-grid .custom-component-type-field");
    expect(styles).toContain(".custom-device-form-grid .custom-device-container-field,");
    expect(styles).toContain(".custom-device-form-grid .custom-device-resize-field,");
    expect(styles).toContain(".custom-device-form-grid .custom-device-terminal-count-field");
    expect(styles).toContain("minmax(190px, 1.35fr)\n    92px\n    112px\n    112px;");
  });

  test("places device measurement bindings inside the component definition dialog", async () => {
    const source = await readAppSource();
    const styles = await readStyles();
    const dialogStart = source.indexOf("{deviceDefinitionDialogOpen && (");
    const dialogEnd = source.indexOf("{customDeviceDialogOpen && (", dialogStart);
    const dialogBlock = source.slice(dialogStart, dialogEnd);
    const visualPanelStart = source.indexOf("const renderDeviceDefinitionVisualPanel = (template: DeviceTemplate) => {");
    const visualPanelEnd = source.indexOf("const renderCustomComponentManagerTree = () =>", visualPanelStart);
    const visualPanelBlock = source.slice(visualPanelStart, visualPanelEnd);
    const definitionSaveStart = source.indexOf("const saveDeviceDefinitionDraft = () =>");
    const definitionSaveEnd = source.indexOf("const deleteDeviceDefinitionParameter = (index: number) =>", definitionSaveStart);
    const definitionSaveBlock = source.slice(definitionSaveStart, definitionSaveEnd);

    expect(source).toContain('const [deviceDefinitionView, setDeviceDefinitionView] = useState<"visual" | "parameters" | "measurements">("parameters");');
    expect(dialogBlock).toContain("device-definition-tabs");
    expect(dialogBlock).toContain("deviceDefinitionSearchQuery");
    expect(dialogBlock).toContain("filteredDeviceDefinitionByComponentType");
    expect(dialogBlock).toContain("displayedDeviceDefinitionLibraries");
    expect(dialogBlock).toContain("aria-label=\"搜索元件定义\"");
    expect(dialogBlock).toContain("componentTypeDisplayParts(typeGroup.section)");
    expect(source).toContain("const [collapsedDefinitionComponentTypes, setCollapsedDefinitionComponentTypes] = useState<string[]>([]);");
    expect(source).toContain("const toggleDefinitionComponentType = (attributeLibrary: AttributeLibrary, componentType: string) => {");
    expect(dialogBlock).toContain("const typeKey = attributeLibraryComponentTypeKey(group, typeGroup.section);");
    expect(dialogBlock).toContain("const typeCollapsed = deviceDefinitionSearchNeedle ? false : collapsedDefinitionComponentTypes.includes(typeKey);");
    expect(dialogBlock).toContain("className={`component-definition-type-header ${typeCollapsed ? \"\" : \"active\"}`}");
    expect(dialogBlock).toContain("aria-expanded={!typeCollapsed}");
    expect(dialogBlock).toContain("onClick={() => toggleDefinitionComponentType(group, typeGroup.section)}");
    expect(dialogBlock).toContain("!typeCollapsed && <div className=\"device-definition-items\"");
    expect(dialogBlock).toContain("参数定义");
    expect(dialogBlock).toContain("量测定义");
    expect(dialogBlock).toContain('deviceDefinitionView === "parameters"');
    expect(dialogBlock).toContain('deviceDefinitionView === "measurements"');
    expect(dialogBlock).toContain("renderDeviceDefinitionMeasurementPanel(selectedDefinitionTemplate)");
    expect(source).toContain("const renderDeviceDefinitionMeasurementPanel = (template: DeviceTemplate)");
    expect(source).toContain("function deviceDefinitionKeyForTemplate(template: DeviceTemplate)");
    expect(source).toContain("deviceDefinitionOverrideForTemplate(template, deviceDefinitionOverrides)");
    expect(source).toContain("const selectedKind = normalizeComponentTypeName(definitionDraftSection) || deviceDefinitionKeyForTemplate(template);");
    expect(source).toContain("const definitionKey = normalizeComponentTypeName(definitionDraftSection) || deviceDefinitionKeyForTemplate(selectedDefinitionTemplate);");
    expect(source).toContain("next[definitionKey] =");
    expect(source).not.toContain("const selectedKind = template.kind;");
    expect(definitionSaveBlock).not.toContain("[selectedDefinitionTemplate.kind]: {");
    expect(source).toContain("保存量测定义");
    expect(source).toContain("saveMeasurementConfigDialog");
    expect(source).toContain("measurementConfigDraft");
    expect(styles).toContain(".device-definition-tabs");
    expect(styles).toContain(".device-definition-measurement-panel");
    expect(styles).toContain(".device-definition-tree-scroll");
    expect(styles).toContain(".device-definition-dialog .custom-param-table input,");
    expect(styles).toContain(".custom-device-dialog .custom-param-table input,");
    expect(styles).toContain(".dialog-compact-tree");
    expect(styles).toContain(".device-definition-list .component-definition-type-header");
    expect(styles).toContain(".dialog-compact-tree .custom-component-tree-row.library,");
    expect(styles).toContain(".dialog-compact-tree .device-definition-group-toggle");
    expect(styles).toContain(".dialog-compact-tree .custom-component-tree-row.type,");
    expect(styles).toContain(".dialog-compact-tree .component-definition-type-header");
    expect(styles).toContain(".dialog-compact-tree .custom-component-tree-row.component,");
    expect(styles).toContain(".dialog-compact-tree .device-definition-item");
    expect(styles).toContain(".dialog-compact-tree .dialog-tree-bilingual {");
    expect(styles).toContain("align-items: baseline;");
    expect(styles).toContain("padding-left: calc(var(--dialog-tree-indent) * 1.45);");
    expect(styles).toContain("padding-left: calc(var(--dialog-tree-indent) * 1.7);");
  });

  test("visually distinguishes built-in and custom library and device type options", async () => {
    const source = await readAppSource();
    const styles = await readStyles();

    expect(source).toContain("isBuiltInAttributeLibrary");
    expect(source).toContain("isBuiltInComponentType");
    expect(source).toContain("attributeLibraryOptionClass");
    expect(source).toContain("componentTypeOptionClass");
    expect(source).toContain("sourceSelectClassName");
    expect(source).toContain("className={sourceSelectClassName(isBuiltInAttributeLibrary(customDeviceDraft.attributeLibraryName))}");
    expect(source).toContain("className={sourceSelectClassName(isBuiltInComponentType(customDeviceDraft.componentType))}");
    expect(source).toContain("className={sourceSelectClassName(isBuiltInComponentType(definitionDraftSection))}");
    expect(source).toContain("definitionDraftSectionEditing");
    expect(source).toContain("device-definition-summary-value");
    expect(source).toContain("onClick={() => setDefinitionDraftSectionEditing(true)}");
    expect(source).toContain("onBlur={() => setDefinitionDraftSectionEditing(false)}");
    expect(source).toContain("className={attributeLibraryOptionClass(group)}");
    expect(source).toContain("className={componentTypeOptionClass(section)}");
    expect(source).toContain("系统内置属性库，无法删除");
    expect(source).toContain("用户自定义元件类型，可以删除");
    expect(styles).toContain(".source-select.builtin-source");
    expect(styles).toContain(".source-select.custom-source");
    expect(styles).toContain(".device-definition-summary-value");
    expect(styles).toContain(".builtin-option");
    expect(styles).toContain(".custom-option");
  });

  test("renders component libraries as library device-type component trees", async () => {
    const source = await readAppSource();
    const styles = await readStyles();

    expect(source).toContain("type CustomComponentTypeDefinition");
    expect(source).toContain("groupDeviceTemplatesByAttributeLibraryAndComponentType");
    expect(source).toContain("groupedAttributeLibraryByComponentType");
    expect(source).toContain("componentTypeOptionsByAttributeLibrary");
    expect(source).toContain("currentAttributeLibraryComponentTypeOptions");
    expect(source).toContain("definitionAttributeLibraryComponentTypeOptions");
    expect(source).toContain("const [hoveredAttributeLibrary, setHoveredAttributeLibrary]");
    expect(source).toContain("const [hoveredAttributeLibraryComponentType, setHoveredAttributeLibraryComponentType]");
    expect(source).toContain("setCustomComponentTypes((current) => normalizeCustomComponentTypes([...current, { name: componentType, attributeLibraryName }]))");
    expect(source).toContain("filterAttributeLibraryComponentTypeGroups");
    expect(source).toContain("typeGroups.map((typeGroup)");
    expect(source).toContain("attribute-library-component-type-section");
    expect(source).toContain("attribute-library-component-type-header");
    expect(source).not.toContain("expandedAttributeLibraries.includes(group) || hoveredAttributeLibrary === group");
    expect(source).toContain("setHoveredAttributeLibraryComponentType(componentTypeKey);");
    expect(source).toContain("setHoveredAttributeLibraryComponentType((current) => current === componentTypeKey ? \"\" : current)");
    expect(source).toContain("expandedAttributeLibraryComponentTypes.includes(componentTypeKey) || hoveredAttributeLibraryComponentType === componentTypeKey");
    expect(source).toContain("component-definition-type-group");
    expect(source).toContain("aria-label={`${group}/${typeGroup.section}元件列表`}");
    expect(source).toContain("renderCustomComponentManagerTree");
    expect(source).toContain("custom-component-manager-panel");
    expect(source).toContain("className=\"custom-component-manager-tree dialog-compact-tree\"");
    expect(source).toContain("className=\"device-definition-tree-scroll dialog-compact-tree\"");
    expect(source).toContain("className=\"dialog-tree-bilingual dialog-tree-component-label\"");
    expect(source).toContain("custom-device-dialog-layout");
    expect(source).toContain("customComponentTreeSelection");
    expect(source).toContain("collapsedCustomComponentTreeLibraries");
    expect(source).toContain("collapsedCustomComponentTreeTypes");
    expect(source).toContain("toggleCustomComponentTreeLibrary");
    expect(source).toContain("toggleCustomComponentTreeType");
    expect(source).toContain("aria-expanded={!libraryCollapsed}");
    expect(source).toContain("aria-expanded={!typeCollapsed}");
    expect(source).toContain("onClick={() => toggleCustomComponentTreeLibrary(group)}");
    expect(source).toContain("onClick={() => toggleCustomComponentTreeType(group, typeGroup.section)}");
    expect(source).toContain("selectCustomComponentTemplate(template, typeGroup.section)");
    expect(source).toContain("renameSelectedCustomDeviceTreeItem");
    expect(source).toContain("deleteSelectedCustomDeviceTreeItem");
    expect(source).toContain("startCustomComponentCreate");
    expect(source).toContain("editingCustomDeviceKind");
    expect(source).toContain("currentAttributeLibraryComponentTypeOptions.map((section)");
    expect(source).toContain("onChange={(event) => selectCustomAttributeLibrary(event.target.value)}");
    expect(source).toContain("onChange={(event) => selectCustomComponentType(customDeviceDraft.attributeLibraryName, event.target.value)}");
    expect(styles).toContain(".attribute-library-component-type-section");
    expect(styles).toContain(".attribute-library-component-type-header");
    expect(styles).toContain(".component-definition-type-group");
    expect(styles).toContain(".custom-component-manager-panel");
    expect(styles).toContain(".custom-component-tree-row");
    expect(styles).toContain(".custom-component-tree-row svg");
    expect(styles).toContain(".dialog-compact-tree .dialog-tree-component-label {");
    expect(styles).toContain("overflow-wrap: anywhere;");
    expect(styles).toContain(".custom-attribute-library-select-row.single-control");
  });

  test("splits static drawing primitives into functional component types", async () => {
    const source = await readAppSource();
    const modelSource = await readModelSource();
    const serverSource = await readServerSource();

    for (const section of [
      "StaticTextSymbol",
      "StaticMediaSymbol",
      "StaticBasicShape",
      "StaticFlowNode",
      "StaticButton",
      "StaticContainerSymbol",
      "StaticConnectorSymbol",
      "StaticAnnotationSymbol"
    ]) {
      expect(modelSource).toContain(`${section}: []`);
      expect(serverSource).toContain(`${section}: []`);
    }
    expect(modelSource).toContain("STATIC_COMPONENT_TYPE_BY_KIND");
    expect(modelSource).toContain('"static-line": "StaticConnectorSymbol"');
    expect(modelSource).toContain('"static-button": "StaticButton"');
    expect(modelSource).toContain('"static-callout": "StaticAnnotationSymbol"');
    expect(modelSource).not.toContain('if (isStaticKind(kind)) return "StaticSymbol";');
    expect(source).toContain('if (section.startsWith("Static")) {');
    expect(source).toContain('return "静态图元";');
    expect(source).toContain('if (normalized.includes("静态")) return "StaticBasicShape";');
    expect(serverSource).toContain("staticComponentTypeByKind");
    expect(serverSource).toContain('"static-line": "StaticConnectorSymbol"');
    expect(serverSource).toContain('"static-button": "StaticButton"');
    expect(serverSource).toContain('"static-callout": "StaticAnnotationSymbol"');
    expect(serverSource).not.toContain('if (isStaticKind(kind)) return "StaticSymbol";');
  });

  test("adds React-Flow-style static symbols and exposes unified style editors", async () => {
    const source = await readAppSource();
    const modelSource = await readModelSource();
    const glyphStart = source.indexOf("if (isStaticGlyph) {");
    const glyphEnd = source.indexOf("if (glyphVariant === \"ac-generator\"", glyphStart);
    const glyphBlock = source.slice(glyphStart, glyphEnd);
    const inspectorStart = source.indexOf("{isStaticNode(inspectorSelectedNode) && (");
    const inspectorEnd = source.indexOf("{!isStaticNode(inspectorSelectedNode) && (", inspectorStart);
    const inspectorBlock = source.slice(inspectorStart, inspectorEnd);

    for (const kind of [
      "static-rounded-rect",
      "static-diamond",
      "static-pill",
      "static-database",
      "static-document",
      "static-note",
      "static-group-box",
      "static-swimlane",
      "static-point",
      "static-ring",
      "static-circle-node",
      "static-straight-connector",
      "static-arrow-connector",
      "static-double-arrow-connector",
      "static-elbow-connector",
      "static-hexagon",
      "static-parallelogram",
      "static-triangle",
      "static-callout",
      "static-default-node",
      "static-input-node",
      "static-output-node",
      "static-port-node",
      "static-card-node",
      "static-toolbar-node",
      "static-button",
      "static-resizer-frame",
      "static-subflow-box",
      "static-bezier-connector",
      "static-smoothstep-connector",
      "static-self-loop",
      "static-edge-label"
    ]) {
      expect(modelSource).toContain(`kind: "${kind}"`);
      expect(glyphBlock).toContain(`node.kind === "${kind}"`);
    }

    expect(glyphBlock).toContain("staticSymbolShadowStyle");
    expect(glyphBlock).toContain("staticShapeText");
    expect(inspectorBlock).toContain("cornerRadius");
    expect(inspectorBlock).toContain("accentColor");
    expect(inspectorBlock).toContain("shadowEnabled");
    expect(inspectorBlock).toContain("padding");
    expect(inspectorBlock).toContain("textAlign");
    expect(inspectorBlock).toContain("verticalAlign");
    expect(inspectorBlock).toContain("markerStart");
    expect(inspectorBlock).toContain("markerEnd");
    expect(inspectorBlock).toContain("arrowSize");
    expect(inspectorBlock).toContain("handleColor");
    expect(inspectorBlock).toContain("handleSize");
    expect(inspectorBlock).toContain("renderStaticButtonActionEditor");
    expect(source).toContain("executeStaticButtonAction");
    expect(source).toContain("handleStaticButtonClick");
    expect(source).toContain("static-button-feedback-surface");
  });

  test("configures static button actions with dropdown enablement and multiple target layers", async () => {
    const source = await readAppSource();
    const modelSource = await readModelSource();
    const editorStart = source.indexOf("const renderStaticButtonActionEditor");
    const editorEnd = source.indexOf("const renderParamHeader", editorStart);
    const editorBlock = source.slice(editorStart, editorEnd);
    const runtimeStart = source.indexOf("const resolveStaticButtonTargetLayers");
    const runtimeEnd = source.indexOf("const handleStaticButtonClick", runtimeStart);
    const runtimeBlock = source.slice(runtimeStart, runtimeEnd);
    const exportStart = source.indexOf("function exportSvgLayerScriptMarkup");
    const exportEnd = source.indexOf("export function buildSvgDocument", exportStart);
    const exportBlock = source.slice(exportStart, exportEnd);

    expect(modelSource).toContain("buttonTargetLayerIds: \"\",");
    expect(modelSource).toContain("buttonTargetLayerNames: \"\",");
    expect(source).toContain("const parseStaticButtonTargetLayerValues = (value?: string) =>");
    expect(source).toContain("const serializeStaticButtonTargetLayerIds = (layerIds: string[]) => JSON.stringify(layerIds);");
    expect(editorBlock).toContain("value={buttonEnabled ? \"1\" : \"0\"}");
    expect(editorBlock).toContain("<option value=\"1\">启用</option>");
    expect(editorBlock).toContain("<option value=\"0\">禁用</option>");
    expect(editorBlock).not.toContain("type=\"checkbox\"");
    expect(editorBlock).toContain("multiple");
    expect(editorBlock).toContain("value={resolveStaticButtonTargetLayers(node, layers).map((layer) => layer.id)}");
    expect(editorBlock).toContain("Array.from(event.target.selectedOptions)");
    expect(editorBlock).toContain("buttonTargetLayerIds: serializeStaticButtonTargetLayerIds(selectedLayers.map((layer) => layer.id))");
    expect(editorBlock).toContain("buttonTargetLayerNames: serializeStaticButtonTargetLayerIds(selectedLayers.map((layer) => layer.name))");
    expect(runtimeBlock).toContain("const targetLayers = resolveStaticButtonTargetLayers(node, layers);");
    expect(runtimeBlock).toContain("const targetLayerIdSet = new Set(targetLayers.map((layer) => layer.id));");
    expect(runtimeBlock).toContain("setActiveLayerId(targetLayers[0].id);");
    expect(runtimeBlock).toContain("setLayers((current) => current.map((item) => ({ ...item, visible: targetLayerIdSet.has(item.id) })))");
    expect(exportBlock).toContain("data-export-button-target-layer-ids");
    expect(exportBlock).toContain("function exportSvgActivateLayers(layerIds)");
    expect(exportBlock).toContain("const targetLayerIds = exportSvgButtonTargetLayerIds(button);");
  });

  test("shows Chinese and English labels in the generic device parameter table", async () => {
    const source = await readAppSource();
    const styles = await readStyles();
    const headerStart = source.indexOf("const renderParamHeader =");
    const headerEnd = source.indexOf("const renderChineseParamHeader", headerStart);
    const headerBlock = source.slice(headerStart, headerEnd);
    const editorStart = source.indexOf("const renderParamEditor =");
    const editorEnd = source.indexOf("const renderStaticButtonActionEditor", editorStart);
    const editorBlock = source.slice(editorStart, editorEnd);

    expect(source).toContain("const PARAM_OPTION_LABELS: Record<string, Record<string, string>> = {");
    expect(source).toContain("buttonEnabled: { \"1\": \"启用\", \"0\": \"禁用\" }");
    expect(source).toContain("buttonActionType: STATIC_BUTTON_ACTION_LABELS");
    expect(source).toContain("buttonCommand: STATIC_BUTTON_COMMAND_LABELS");
    expect(source).toContain("component_type: \"元件类型\"");
    expect(headerBlock).toContain("const visibleLabel = displayName === key ? title : displayName;");
    expect(headerBlock).toContain("className=\"param-header-bilingual\"");
    expect(headerBlock).toContain("<span>{visibleLabel}</span>");
    expect(headerBlock).toContain("<small>{englishLabel}</small>");
    expect(editorBlock).toContain("const optionLabels = PARAM_OPTION_LABELS[key] ?? {};");
    expect(editorBlock).toContain("{optionLabels[option] ?? option}");
    expect(styles).toContain(".param-header-bilingual");
  });

  test("keeps backend electric heat sections split by AC and DC device types", async () => {
    const serverSource = await readServerSource();

    expect(serverSource).toContain("AcElec2Heat: [\"idx\", \"name\", \"run_stat\", \"idx_ac_load_t1\", \"idx_heat_unit_t2\"]");
    expect(serverSource).toContain("DcElec2Heat: [\"idx\", \"name\", \"run_stat\", \"idx_dc_load_t1\", \"idx_heat_unit_t2\"]");
    expect(serverSource).toContain("AcElec2Heat2: [\"idx\", \"name\", \"run_stat\", \"idx_ac_load_t1\", \"idx_heat2_unit_t2\"]");
    expect(serverSource).toContain("DcElec2Heat2: [\"idx\", \"name\", \"run_stat\", \"idx_dc_load_t1\", \"idx_heat2_unit_t2\"]");
    expect(serverSource).toContain('if (kind === "ac-heater") return "AcElec2Heat";');
    expect(serverSource).toContain('if (kind === "dc-heater") return "DcElec2Heat";');
    expect(serverSource).toContain('if (kind === "ac-two-port-heater") return "AcElec2Heat2";');
    expect(serverSource).toContain('if (kind === "dc-two-port-heater") return "DcElec2Heat2";');
    expect(serverSource).not.toContain('if (kind === "ac-heater" || kind === "dc-heater") return "Elec2Heat";');
    expect(serverSource).not.toContain('if (kind === "ac-two-port-heater" || kind === "dc-two-port-heater") return "Elec2Heat2";');
  });

  test("scales built-in device glyph internals with normalized device size", async () => {
    const source = await readAppSource();
    const glyphStart = source.indexOf("function DeviceGlyph(");
    const glyphEnd = source.indexOf("const MemoDeviceGlyph = memo(", glyphStart);
    const glyphBlock = source.slice(glyphStart, glyphEnd);

    expect(glyphBlock).toContain("DEVICE_GLYPH_DESIGN_LONGEST_SIDE");
    expect(glyphBlock).toContain("glyphContentScale");
    expect(glyphBlock).toContain("renderDeviceGlyphContent");
    expect(glyphBlock).toContain("transform={`scale(${formatSvgNumber(glyphContentScale)})`}");
    expect(glyphBlock).toContain("const w = rawW / glyphContentScale");
    expect(glyphBlock).toContain("const h = rawH / glyphContentScale");
  });

  test("aligns multi-port heat glyph branches to their terminal anchor ratios", async () => {
    const source = await readAppSource();
    const glyphStart = source.indexOf("function DeviceGlyph(");
    const glyphEnd = source.indexOf("const MemoDeviceGlyph = memo(", glyphStart);
    const glyphBlock = source.slice(glyphStart, glyphEnd);

    expect(glyphBlock).toContain("const branchY = miniature ? 11 : h * 0.25;");
    expect(glyphBlock).toContain("const heaterPortY = miniature ? 13 : h * 0.25;");
    expect(glyphBlock).toContain("heater-two-port-supply-marker");
    expect(glyphBlock).toContain("heater-two-port-return-marker");
  });

  test("keeps backend SVG bus export square ended", async () => {
    const serverSource = await readServerSource();
    const busExportStart = serverSource.indexOf("if (isBus)");
    const busExportEnd = serverSource.indexOf("    } else {", busExportStart);
    const busExportBlock = serverSource.slice(busExportStart, busExportEnd);

    expect(busExportBlock).toContain("<rect");
    expect(busExportBlock).toContain("class=\"bus-glyph\"");
    expect(busExportBlock).not.toContain("<line");
    expect(busExportBlock).not.toContain("stroke-linecap=\"round\"");
    expect(busExportBlock).not.toContain("rx=");
  });

  test("shows selected element terminal count as readonly text instead of an editable field", async () => {
    const source = await readAppSource();
    const row = selectedTerminalCountRow(source);

    expect(row).toContain("graph-readonly-value");
    expect(row).not.toContain("updateTerminalCount");
    expect(row).not.toContain("<input");
  });

  test("shows inspector parameter tables as compact click-to-edit rows", async () => {
    const styles = await readStyles();
    const tableBlockStart = styles.indexOf(".param-table {\n  --param-table-row-height");
    const tableBlock = tableBlockStart >= 0 ? styles.slice(tableBlockStart, styles.indexOf("}", tableBlockStart)) : "";
    const rowBlock = cssRuleBlock(styles, ".param-table tr");
    const cellBlock = cssRuleBlock(styles, ".param-table th,\n.param-table td");
    const defaultInputBlock = cssRuleBlock(styles, ".param-table td:not(:focus-within) input:not([type=\"color\"]):not([type=\"checkbox\"]),");
    const focusCellBlock = cssRuleBlock(styles, ".param-table td:focus-within");
    const focusInputBlock = cssRuleBlock(styles, ".param-table td:focus-within input:not([type=\"color\"]):not([type=\"checkbox\"]),");
    const directFocusBlock = cssRuleBlock(styles, ".param-table input:focus,\n.param-table select:focus,\n.param-table textarea:focus");
    const compactUnitBlock = cssRuleBlock(styles, ".param-table .unit-value-field");
    const textStyleLabelBlock = cssRuleBlock(styles, ".text-style-actions label");

    expect(tableBlock).toContain("--param-table-row-height: 40px");
    expect(tableBlock).toContain("--param-table-control-height: 26px");
    expect(rowBlock).toContain("height: var(--param-table-row-height)");
    expect(cellBlock).toContain("height: var(--param-table-row-height)");
    expect(cellBlock).toContain("padding: 3px 7px");
    expect(defaultInputBlock).toContain("border-color: transparent");
    expect(defaultInputBlock).toContain("background: transparent");
    expect(defaultInputBlock).toContain("box-shadow: none");
    expect(focusCellBlock).toContain("background: #f8fafc");
    expect(focusInputBlock).toContain("border-color: transparent");
    expect(focusInputBlock).toContain("background: transparent");
    expect(focusInputBlock).toContain("box-shadow: none");
    expect(focusInputBlock).toContain("outline: none");
    expect(directFocusBlock).toContain("outline: none");
    expect(compactUnitBlock).toContain("gap: 4px");
    expect(compactUnitBlock).toContain("min-height: var(--param-table-control-height)");
    expect(textStyleLabelBlock).toContain("border: 0");
    expect(textStyleLabelBlock).toContain("background: transparent");
    expect(textStyleLabelBlock).toContain("min-height: var(--param-table-control-height)");
  });

  test("keeps embedded controls inside parameter tables from expanding row height", async () => {
    const styles = await readStyles();
    const compactControlBlock = cssRuleBlock(styles, ".param-table .color-field button,\n.param-table .image-field-actions button,\n.param-table .background-page-field button");
    const compactColorInputBlock = cssRuleBlock(styles, ".param-table .color-field input[type=\"color\"]");
    const compactFieldBlock = cssRuleBlock(styles, ".param-table .color-field,\n.param-table .image-field-actions,\n.param-table .background-page-field");
    const compactColorLayoutBlock = cssRuleBlock(styles, ".param-table .color-field.with-none,\n.param-table .color-field.with-clear");
    const compactIconBlock = cssRuleBlock(styles, ".param-table button svg");
    const backgroundLayerListBlock = cssRuleBlock(styles, ".background-layer-checklist");
    const backgroundLayerOptionBlock = cssRuleBlock(styles, ".background-layer-option");
    const mutedInlineStart = styles.lastIndexOf(".muted-inline-text {");
    const mutedInlineBlock = mutedInlineStart >= 0 ? styles.slice(mutedInlineStart, styles.indexOf("}", mutedInlineStart)) : "";

    expect(compactControlBlock).toContain("min-height: var(--param-table-control-height)");
    expect(compactControlBlock).toContain("height: var(--param-table-control-height)");
    expect(compactControlBlock).toContain("padding: 0 6px");
    expect(compactControlBlock).toContain("font-size: 11px");
    expect(compactColorInputBlock).toContain("width: 28px");
    expect(compactColorInputBlock).toContain("height: var(--param-table-control-height)");
    expect(compactColorInputBlock).toContain("border: 0");
    expect(compactFieldBlock).toContain("gap: 4px");
    expect(compactFieldBlock).toContain("align-items: center");
    expect(compactColorLayoutBlock).toContain("grid-template-columns: 28px minmax(0, 1fr) auto");
    expect(compactIconBlock).toContain("width: 12px");
    expect(compactIconBlock).toContain("height: 12px");
    expect(backgroundLayerListBlock).toContain("padding: 0");
    expect(backgroundLayerOptionBlock).toContain("min-height: var(--param-table-control-height");
    expect(mutedInlineBlock).toContain("line-height: var(--param-table-control-height");
  });

  test("keeps the node double-click text editor textarea height stable when focus moves to action buttons", async () => {
    const styles = await readStyles();
    const textareaBlock = cssRuleBlock(styles, ".param-table.node-double-click-param-table textarea");
    const blurTextareaBlock = cssRuleBlock(styles, ".param-table.node-double-click-param-table td:not(:focus-within) textarea");

    expect(textareaBlock).toContain("min-height: 120px");
    expect(blurTextareaBlock).toContain("min-height: 120px");
    expect(blurTextareaBlock).toContain("max-height: none");
    expect(styles.indexOf(".param-table.node-double-click-param-table td:not(:focus-within) textarea")).toBeLessThan(
      styles.indexOf(".param-table td:not(:focus-within) textarea"),
    );
    expect(blurTextareaBlock).not.toContain("min-height: 72px");
    expect(blurTextareaBlock).not.toContain("max-height: 44px");
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

  test("adds lightweight viewport controls and minimap navigation without replacing the SVG canvas", async () => {
    const source = await readAppSource();
    const styles = await readStyles();
    const zoomStart = source.indexOf("const zoomViewportAtCenter = (zoomFactor: number) =>");
    const zoomEnd = source.indexOf("const resetViewportZoom = () =>", zoomStart);
    const zoomBlock = source.slice(zoomStart, zoomEnd);
    const resetStart = source.indexOf("const resetViewportZoom = () =>");
    const resetEnd = source.indexOf("const fitWholeCanvasToFrame = () =>", resetStart);
    const resetBlock = source.slice(resetStart, resetEnd);
    const centerStart = source.indexOf("const centerViewBoxOnPoint = (point: Point) =>");
    const centerEnd = source.indexOf("const zoomViewportAtCenter = (zoomFactor: number) =>", centerStart);
    const centerBlock = source.slice(centerStart, centerEnd);
    const fitBoundsStart = source.indexOf("const fitViewToBounds = (bounds: GeometryBounds | SelectionRect | null");
    const fitBoundsEnd = source.indexOf("const fitViewToContent = () =>", fitBoundsStart);
    const fitBoundsBlock = source.slice(fitBoundsStart, fitBoundsEnd);
    const controlsStart = source.indexOf("<div className=\"viewport-controls\"");
    const controlsEnd = source.indexOf("{minimapVisible &&", controlsStart);
    const controlsBlock = source.slice(controlsStart, controlsEnd);
    const viewportActionStart = source.indexOf("const selectedViewportActionDisabled = !selectedCanvasBounds;");
    const viewportActionEnd = source.indexOf("const nodeFloatingToolbarActionCount =", viewportActionStart);
    const viewportActionBlock = source.slice(viewportActionStart, viewportActionEnd);
    const viewportButtonDisabledBlock = cssRuleBlock(styles, ".viewport-controls button:disabled");

    expect(source).toContain("const [minimapVisible, setMinimapVisible] = useState(true)");
    expect(source).toContain("const FIT_SELECTION_MAX_ZOOM_PERCENT = 100;");
    expect(source).toContain("const handleMinimapNavigate");
    expect(source).toContain("fitViewToContent");
    expect(source).toContain("centerSelectedInView");
    expect(source).toContain("fitViewToSelection");
    expect(source).toContain("zoomViewportAtCenter");
    expect(source).toContain("resetViewportZoom");
    expect(source).toContain("const viewportCenterAnchorForPoint = (point: Point): WheelZoomAnchor | null =>");
    expect(source).toContain("const setViewBoxAtViewportCenter = (nextViewBox: CanvasViewBox, point: Point) =>");
    expect(centerBlock).toContain("setViewBoxAtViewportCenter(");
    expect(fitBoundsBlock).toContain("const viewportAspect = canvasFrameRef.current?.clientWidth");
    expect(fitBoundsBlock).toContain("maxZoomPercent = 2000");
    expect(fitBoundsBlock).toContain("clampViewBoxDimensionsForZoom(fitSize, canvasBounds, 5, maxZoomPercent)");
    expect(fitBoundsBlock).toContain("setViewBoxAtViewportCenter(");
    expect(fitBoundsBlock).not.toContain("setViewBox(clampViewBoxToCanvas({");
    expect(viewportActionBlock).toContain("const selectedViewportActionDisabled = !selectedCanvasBounds;");
    expect(viewportActionBlock).toContain("先选中图元或连接线后可居中");
    expect(viewportActionBlock).toContain("先选中图元或连接线后可缩放到选中区域");
    expect(zoomBlock).toContain("const frame = canvasFrameRef.current;");
    expect(zoomBlock).toContain("const frameRect = frame.getBoundingClientRect();");
    expect(zoomBlock).toContain("const anchor = wheelZoomAnchorFromClient(");
    expect(zoomBlock).toContain("frameRect.left + frameRect.width / 2");
    expect(zoomBlock).toContain("frameRect.top + frameRect.height / 2");
    expect(zoomBlock).toContain("pendingWheelZoomAnchorRef.current = anchor;");
    expect(zoomBlock).toContain("const bounds = canvasBoundsRef.current;");
    expect(zoomBlock).toContain("const { width: nextWidth, height: nextHeight } = clampViewBoxDimensionsForZoom(");
    expect(zoomBlock).toContain("x: anchor.point.x - anchor.cursorOffsetX / nextScaleX");
    expect(zoomBlock).toContain("y: anchor.point.y - anchor.cursorOffsetY / nextScaleY");
    expect(zoomBlock).not.toContain("const visible = canvasVisibleViewBoxRef.current");
    expect(resetBlock).toContain("const frame = canvasFrameRef.current;");
    expect(resetBlock).toContain("const frameRect = frame.getBoundingClientRect();");
    expect(resetBlock).toContain("const anchor = wheelZoomAnchorFromClient(");
    expect(resetBlock).toContain("frameRect.left + frameRect.width / 2");
    expect(resetBlock).toContain("frameRect.top + frameRect.height / 2");
    expect(resetBlock).toContain("pendingWheelZoomAnchorRef.current = anchor;");
    expect(resetBlock).toContain("const bounds = canvasBoundsRef.current;");
    expect(resetBlock).toContain("const { width: nextWidth, height: nextHeight } = clampViewBoxDimensionsForZoom(");
    expect(resetBlock).toContain("x: anchor.point.x - anchor.cursorOffsetX / nextScaleX");
    expect(resetBlock).toContain("y: anchor.point.y - anchor.cursorOffsetY / nextScaleY");
    expect(controlsBlock).toContain("aria-label=\"适配视图\"");
    expect(controlsBlock).toContain("onClick={fitWholeCanvasToFrame}");
    expect(controlsBlock).not.toContain("onClick={fitViewToContent}");
    expect(controlsBlock).toContain("title={centerSelectedViewportTitle}");
    expect(controlsBlock).toContain("aria-label=\"居中选中\"");
    expect(controlsBlock).toContain("disabled={selectedViewportActionDisabled}");
    expect(controlsBlock).toContain("onClick={centerSelectedInView}");
    expect(controlsBlock).toContain("title={fitSelectedViewportTitle}");
    expect(controlsBlock).toContain("aria-label=\"缩放到选中区域\"");
    expect(source).toContain("fitViewToBounds(selectedCanvasBounds, 80, FIT_SELECTION_MAX_ZOOM_PERCENT);");
    expect(controlsBlock).toContain("aria-label=\"重置缩放\"");
    expect(controlsBlock).toContain("onClick={resetViewportZoom}");
    expect(source).toContain("ScanSearch");
    expect(source).toContain("aria-label=\"缩放到选中区域\"");
    expect(source).toContain("className=\"viewport-controls\"");
    expect(source).toContain("className=\"canvas-minimap\"");
    expect(source).toContain("className=\"minimap-viewport\"");
    expect(styles).toContain(".viewport-overlay");
    expect(styles).toContain(".canvas-minimap");
    expect(styles).toContain(".minimap-viewport");
    expect(viewportButtonDisabledBlock).toContain("color: #94a3b8");
    expect(viewportButtonDisabledBlock).toContain("cursor: not-allowed");
    expect(viewportButtonDisabledBlock).toContain("opacity: 0.62");
  });

  test("adds selected graphic quick toolbars, edge controls, and resize feedback on top of existing actions", async () => {
    const source = await readAppSource();
    const styles = await readStyles();
    const edgeToolbarStart = source.indexOf("className=\"canvas-floating-toolbar edge-toolbar\"");
    const edgeToolbarEnd = source.indexOf("</div>\n                  </div>\n                )}", edgeToolbarStart);
    const edgeToolbarBlock = source.slice(edgeToolbarStart, edgeToolbarEnd);

    expect(source).toContain("className=\"canvas-floating-toolbar node-toolbar\"");
    expect(source).toContain("className=\"canvas-floating-toolbar edge-toolbar\"");
    expect(source).toContain("className=\"canvas-floating-toolbar-layer\"");
    expect(source).toContain("className=\"canvas-floating-toolbar-wrapper\"");
    expect(source).toContain("style={floatingToolbarWrapperStyle(nodeFloatingToolbar)}");
    expect(source).toContain("style={floatingToolbarWrapperStyle(edgeFloatingToolbar)}");
    expect(source).toContain("nodeFloatingToolbarWidth * floatingToolbarScreenScale");
    expect(source).toContain("selectedFloatingToolbarBounds");
    expect(source).toContain("EDGE_FLOATING_TOOLBAR_WIDTH * floatingToolbarScreenScale");
    expect(source).toContain("tidySelectedEdgeRoute");
    expect(edgeToolbarBlock).not.toContain("title=\"添加拐点\"");
    expect(edgeToolbarBlock).not.toContain("addManualBendToSelectedEdgeCenter");
    expect(edgeToolbarBlock).toContain("title=\"整理连接线\" aria-label=\"整理连接线\"");
    expect(source).toContain("toggleSelectedNodeLabelDisplay");
    expect(source).toContain("nodeFloatingToolbarActionCount");
    expect(source).toContain("title=\"剪切\" aria-label=\"剪切\"");
    expect(source).toContain("title=\"解散\" aria-label=\"解散\"");
    expect(source).toContain("title=\"添加到模板库\" aria-label=\"添加到模板库\"");
    expect(source).toContain("title=\"复制连接线\" aria-label=\"复制连接线\"");
    expect(source).toContain("proportionalScale");
    expect(source).toContain("event.shiftKey || transformDrag.kind === \"scale-both\"");
    expect(source).toContain("className=\"resize-size-badge\"");
    expect(styles).toContain(".canvas-floating-toolbar");
    expect(styles).toContain(".canvas-floating-toolbar-layer");
    expect(styles).toContain(".canvas-floating-toolbar-wrapper");
    expect(styles).toContain(".resize-size-badge");
    expect(styles).toContain(".scale-handle:hover");
    expect(styles).toContain(".terminal-dot:not(.disabled):hover");
    expect(styles).toContain(".diagram-node:not(.bus-node):not(.storage-node):not(.routable-line-node):hover .node-hitbox");
    expect(styles).toContain(".edge-endpoint-handle:hover");
    expect(styles).toContain(".connect-drop-hint-halo");
    expect(styles).toContain(".diagram-canvas.connect-drop-ready .connection-preview-line");
    expect(styles).toContain(".connection-group:hover .connection-line");
    expect(styles).toContain(".manual-segment-handle:hover");
    expect(styles).toContain(".diagram-node.selected .terminal-dot:not(.disabled)");
    expect(styles).toContain(".node-toolbar");
  });

  test("renders manually saved bend points with a distinct edit-mode handle style", async () => {
    const source = await readAppSource();
    const styles = await readStyles();
    const selectedEdgeStart = source.indexOf("{selectedRoutedEdge &&");
    const selectedEdgeEnd = source.indexOf("{renderBoundaryBusInternalConnector", selectedEdgeStart);
    const selectedEdgeBlock = source.slice(selectedEdgeStart, selectedEdgeEnd);

    expect(selectedEdgeBlock).toContain("manualRoutePointKeys");
    expect(selectedEdgeBlock).toContain("manual-bend-handle user-manual-bend");
    expect(styles).toContain(".manual-bend-handle.user-manual-bend");
  });

  test("keeps floating toolbars screen-sized and avoids toolbar overlap under zoom", async () => {
    const source = await readAppSource();
    const toolbarStart = source.indexOf("const nodeFloatingToolbarActionCount =");
    const toolbarEnd = source.indexOf("const resizeSizeHint =", toolbarStart);
    const toolbarBlock = source.slice(toolbarStart, toolbarEnd);

    expect(toolbarBlock).toContain("const floatingToolbarScreenScale = clampNumber(Math.sqrt(currentZoomPercent / 100), 0.78, 1);");
    expect(toolbarBlock).toContain("const canvasPointToSurfaceCss = (point: Point): Point =>");
    expect(toolbarBlock).toContain("const floatingToolbarViewport =");
    expect(toolbarBlock).toContain("const placeFloatingToolbar =");
    expect(toolbarBlock).toContain("const canvasRectToSurfaceCssRect = (rect: RenderViewportBounds, padding = 0): RenderViewportBounds =>");
    expect(toolbarBlock).toContain("const rotateControlAvoidRectFromCanvas = (centerX: number, topY: number): RenderViewportBounds =>");
    expect(toolbarBlock).toContain("const selectedRotateControlAvoidRects: RenderViewportBounds[] = [];");
    expect(toolbarBlock).toContain("selectedRotateControlAvoidRects.push(");
    expect(toolbarBlock).toContain("const selectedFloatingToolbarAvoidRect = selectedFloatingToolbarBounds");
    expect(toolbarBlock).toContain("const nodeFloatingToolbarAvoidRects = [");
    expect(toolbarBlock).toContain("...(selectedFloatingToolbarAvoidRect ? [selectedFloatingToolbarAvoidRect] : [])");
    expect(toolbarBlock).toContain("...selectedRotateControlAvoidRects");
    expect(toolbarBlock).toContain("const rotateAvoidTop = selectedRotateControlAvoidRects.length > 0");
    expect(toolbarBlock).toContain("const nodeToolbarCandidates = [");
    expect(toolbarBlock).toContain("return placeFloatingToolbar(nodeToolbarCandidates, width, height, nodeFloatingToolbarAvoidRects);");
    expect(toolbarBlock).not.toContain("y: floatingToolbarViewport.top + floatingToolbarPadding");
    expect(toolbarBlock).toContain("const nodeFloatingToolbarRect = nodeFloatingToolbar ? floatingToolbarBounds(nodeFloatingToolbar) : null;");
    expect(toolbarBlock).toContain("const avoidRects = nodeFloatingToolbarRect ? [nodeFloatingToolbarRect] : [];");
    expect(toolbarBlock).toContain("toolbarOverlapArea(rect, avoidRect)");
    expect(toolbarBlock).toContain("const chosen = [...placements].sort(");
    expect(toolbarBlock).toContain("first.overlap - second.overlap || first.drift - second.drift || first.index - second.index");
    expect(toolbarBlock).not.toContain("placements.find((placement) => placement.overlap === 0)");
    expect(toolbarBlock).toContain("width = Math.round(nodeFloatingToolbarWidth * floatingToolbarScreenScale)");
    expect(toolbarBlock).toContain("height = Math.round(EDGE_FLOATING_TOOLBAR_HEIGHT * floatingToolbarScreenScale)");
    expect(toolbarBlock).toContain("const floatingToolbarWrapperStyle = (toolbar: FloatingToolbarPlacement)");
    expect(toolbarBlock).not.toContain("svgToolbarUiUnit");
    expect(toolbarBlock).not.toContain("scaleX: svgUiUnitX");
    expect(toolbarBlock).not.toContain("scaleY: svgUiUnitY");
  });

  test("shows selected node scale and rotation in the bottom status bar", async () => {
    const source = await readAppSource();
    const styles = await readStyles();
    const selectionStart = source.indexOf("const selectedNodeCount = activeSelectedNodeIds.length;");
    const selectionEnd = source.indexOf("const contextSelectionCount =", selectionStart);
    const selectionBlock = source.slice(selectionStart, selectionEnd);
    const statusbarStart = source.indexOf("<footer className=\"bottom-statusbar\"");
    const statusbarEnd = source.indexOf("</footer>", statusbarStart);
    const statusbarBlock = source.slice(statusbarStart, statusbarEnd);

    expect(source).toContain("const formatStatusScalePercent = (value: number) => `${formatStatusNumber(value * 100)}%`;");
    expect(source).toContain("const formatStatusRotationDegrees = (value: number) => `${formatStatusNumber(normalizeRotationDegrees(value))}°`;");
    expect(selectionBlock).toContain("const selectedNodeTransformStatus = useMemo(() =>");
    expect(selectionBlock).toContain("activeSelectedNodeIds.flatMap((nodeId) => visibleNodeById.get(nodeId) ?? [])");
    expect(selectionBlock).toContain("getNodeScaleX(firstNode)");
    expect(selectionBlock).toContain("getNodeScaleY(firstNode)");
    expect(selectionBlock).toContain("normalizeRotationDegrees(firstNode.rotation)");
    expect(selectionBlock).toContain("scaleText");
    expect(selectionBlock).toContain("rotationText");
    expect(selectionBlock).toContain("多值");
    expect(statusbarBlock).toContain("selectedNodeTransformStatus && (");
    expect(statusbarBlock).toContain("className=\"status-pill status-transform\"");
    expect(statusbarBlock).toContain("图元 缩放 {selectedNodeTransformStatus.scaleText} 旋转 {selectedNodeTransformStatus.rotationText}");
    expect(styles).toContain(".bottom-statusbar .status-transform");
  });

  test("rounds inspector scale input display to three decimal places", async () => {
    const source = await readAppSource();
    const scaleRowsStart = source.indexOf('renderChineseParamHeader("scaleX")');
    const scaleRowsEnd = source.indexOf('renderChineseParamHeader("layerId"', scaleRowsStart);
    const scaleRowsBlock = source.slice(scaleRowsStart, scaleRowsEnd);

    expect(source).toContain("const formatInspectorScaleValue = (value: number) => Number.isFinite(value) ? value.toFixed(3) : \"1.000\";");
    expect(scaleRowsBlock).toContain("formatInspectorScaleValue(getNodeScaleX(inspectorSelectedNode))");
    expect(scaleRowsBlock).toContain("formatInspectorScaleValue(getNodeScaleY(inspectorSelectedNode))");
    expect(scaleRowsBlock).not.toContain("value={getNodeScaleX(inspectorSelectedNode)}");
    expect(scaleRowsBlock).not.toContain("value={getNodeScaleY(inspectorSelectedNode)}");
  });

  test("links inspector vertical scale to horizontal scale when the selected node cannot deform", async () => {
    const source = await readAppSource();
    const scaleRowsStart = source.indexOf('const selectedNodeAllowsIndependentScale = inspectorSelectedNode');
    const scaleRowsEnd = source.indexOf('renderChineseParamHeader("layerId"', scaleRowsStart);
    const scaleRowsBlock = source.slice(scaleRowsStart, scaleRowsEnd);

    expect(scaleRowsStart).toBeGreaterThan(-1);
    expect(scaleRowsBlock).toContain("nodeKindAllowsResizeTransform(inspectorSelectedNode.kind)");
    expect(scaleRowsBlock).toContain("const nextScaleY = selectedNodeAllowsIndependentScale");
    expect(scaleRowsBlock).toContain("disabled={!selectedNodeAllowsIndependentScale}");
    expect(scaleRowsBlock).toContain('title={!selectedNodeAllowsIndependentScale ? "当前图元不允许变形，纵向倍率跟随横向倍率" : undefined}');
    expect(scaleRowsBlock).toContain("selectedNodeAllowsIndependentScale ? formatInspectorScaleValue(getNodeScaleY(inspectorSelectedNode)) : formatInspectorScaleValue(getNodeScaleX(inspectorSelectedNode))");
  });

  test("loads additional React Flow interaction and animation controls in the preview runtime only", async () => {
    const preview = await readReactFlowPreviewSource();
    const styles = await readStyles();

    for (const token of [
      "NodeToolbar",
      "NodeResizer",
      "EdgeToolbar",
      "EdgeLabelRenderer",
      "ControlButton",
      "Panel",
      "BackgroundVariant.Dots",
      "animatedEdges"
    ]) {
      expect(preview).toContain(token);
    }
    expect(preview).toContain("className=\"react-flow-node-toolbar\"");
    expect(preview).toContain("className=\"react-flow-edge-toolbar\"");
    expect(preview).toContain("className={`react-flow-saved-path-edge ${selected ? \"selected\" : \"\"} ${animated ? \"animated\" : \"\"}`}");
    expect(preview).toContain("setFlowEdges(elements.edges.map((edge) => ({ ...edge, animated: animatedEdges })))");
    expect(styles).toContain(".react-flow-node-toolbar");
    expect(styles).toContain(".react-flow-node-resizer-handle");
    expect(styles).toContain(".react-flow-edge-label");
    expect(styles).toContain("@keyframes reactFlowSavedPathDash");
  });

  test("uses rotation-aware bus hit testing for connection drops", async () => {
    const source = await readAppSource();
    const busHitStart = source.indexOf("const isPointNearBus = (node: ModelNode, point: Point, tolerance = 0)");
    const busHitEnd = source.indexOf("const connectTargetSnapPoint", busHitStart);
    const busHitBlock = source.slice(busHitStart, busHitEnd);

    expect(busHitStart).toBeGreaterThan(-1);
    expect(busHitBlock).toContain("pointOnBusForSnap(node, point, tolerance)");
    expect(busHitBlock).not.toContain("node.position.x - halfWidth");
    expect(busHitBlock).not.toContain("node.position.y - halfHeight");
  });

  test("uses the same fuzzy snap hint while dragging existing connection endpoints", async () => {
    const source = await readAppSource();
    const pointerStart = source.indexOf("if (rewiring && svgRef.current)");
    const pointerEnd = source.indexOf("if (marquee", pointerStart);
    const pointerBlock = source.slice(pointerStart, pointerEnd);
    const schedulerStart = source.indexOf("const scheduleRewirePreviewPoint");
    const schedulerEnd = source.indexOf("const resetConnectPreviewState", schedulerStart);
    const schedulerBlock = source.slice(schedulerStart, schedulerEnd);

    expect(source).toContain("dropTargetPoint?: Point");
    expect(source).toContain("dropTarget?: ConnectTarget");
    expect(pointerBlock).toContain("scheduleRewirePreviewPoint(previewPoint, rewiring)");
    expect(pointerBlock).not.toContain("findRewireTargetAtPoint(previewPoint, rewiring)");
    expect(schedulerBlock).toContain("window.requestAnimationFrame");
    expect(schedulerBlock).toContain("const target = findRewireTargetAtPoint(next.point, next.rewiring)");
    expect(source).toContain("const dropTargetPoint = target ? connectTargetSnapPoint(target) : undefined;");
    expect(source).toContain("dropTarget: target ?? undefined");
    expect(source).toContain("rewiring?.dropTargetPoint");
    expect(source).toContain("const activeDropReady =");
    expect(source).toContain("connectDropReady");
    expect(source).toContain("Boolean(rewiring?.dropTargetPoint)");
    expect(source).toContain("Boolean(nodeTerminalSnapTarget)");
    expect(source).toContain("Boolean(routableLinePreview.targetPoint)");
    expect(source).toContain("Boolean(routableLineEndpointDrag?.dropTargetPoint)");
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
    expect(source).toContain("Boolean(nodeTerminalSnapTarget)");
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

  test("finalizes separated implicit terminal overlaps even when moves have no explicit edge candidates", async () => {
    const source = await readAppSource();
    const syncFinalizeStart = source.indexOf("const shouldFinalizeMovedNodeEdgesSynchronously");
    const syncFinalizeEnd = source.indexOf("const terminalReconcileNodeScope", syncFinalizeStart);
    const syncFinalizeBlock = source.slice(syncFinalizeStart, syncFinalizeEnd);
    const finishStart = source.indexOf("const finishNodeDrag = () =>");
    const finishEnd = source.indexOf("const finishTransformDrag", finishStart);
    const finishBlock = source.slice(finishStart, finishEnd);
    const moveStart = source.indexOf("const moveSelection =");
    const moveEnd = source.indexOf("const updateSelectedNode", moveStart);
    const moveBlock = source.slice(moveStart, moveEnd);

    expect(syncFinalizeBlock).toContain("candidateEdges.length === 0");
    expect(finishBlock).not.toContain("multiNodeMove || !shouldFinalizeMovedNodeEdgesSynchronously");
    expect(moveBlock).not.toContain("multiNodeMove || !shouldFinalizeMovedNodeEdgesSynchronously");
    expect(finishBlock).toContain("const terminalFinalizationCandidateEdges =\n      internalMovedEdgeIds.size === 0 ? adjustedAffectedEdges : finalizationCandidateEdges;");
    expect(finishBlock).toContain("shouldFinalizeMovedNodeEdgesSynchronously(activeDragging.nodeIds, terminalFinalizationCandidateEdges)");
    expect(finishBlock).toContain("terminalFinalizationCandidateEdges");
    expect(moveBlock).toContain("const terminalFinalizationCandidateEdges =\n      internalMovedEdgeIds.size === 0 ? adjustedAffectedEdges : finalizationCandidateEdges;");
    expect(moveBlock).toContain("shouldFinalizeMovedNodeEdgesSynchronously(moveNodeIds, terminalFinalizationCandidateEdges)");
  });

  test("keeps connection previews on the lightweight stored-route path", async () => {
    const source = await readAppSource();
    const previewStart = source.indexOf("const buildConnectPreviewPath = (");
    const previewEnd = source.indexOf("const connectPreviewColor", previewStart);
    const previewBlock = source.slice(previewStart, previewEnd);

    expect(previewBlock).toContain("routeEdgesForStoredRendering");
    expect(previewBlock).not.toContain("routeEdgesForRendering");
    expect(previewBlock).not.toContain("simpleOrthogonalPolyline");
    expect(previewBlock).toContain("const previewNodes = previewTarget?.node");
    expect(previewBlock).not.toContain("[...visibleNodes, previewTarget.node]");
  });

  test("routes connection previews through the snapped target terminal normal", async () => {
    const source = await readAppSource();
    const previewStart = source.indexOf("const buildConnectPreviewPath = (");
    const previewEnd = source.indexOf("const connectPreviewColor", previewStart);
    const previewBlock = source.slice(previewStart, previewEnd);
    const schedulerStart = source.indexOf("const scheduleConnectPreviewPoint");
    const schedulerEnd = source.indexOf("const resetConnectPreviewState", schedulerStart);
    const schedulerBlock = source.slice(schedulerStart, schedulerEnd);

    expect(source).toContain("connectDropTargetRef");
    expect(source).not.toContain("setConnectDropTarget");
    expect(previewBlock).toContain("const previewTarget = target;");
    expect(previewBlock).toContain("targetId: previewTarget?.node.id ?? \"floating-connect-preview-target\"");
    expect(previewBlock).toContain("targetTerminalId: previewTarget?.terminalId ?? \"t1\"");
    expect(previewBlock).toContain("targetPoint: previewTarget");
    expect(schedulerBlock).toContain("target ?? null");
  });

  test("keeps endpoint rewire previews on the lightweight stored-route path", async () => {
    const source = await readAppSource();
    const previewStart = source.indexOf("const rewiringPreviewRoute = useMemo");
    const previewEnd = source.indexOf("const manualPathPreviewRoute", previewStart);
    const previewBlock = source.slice(previewStart, previewEnd);

    expect(previewBlock).toContain("routeEdgesForStoredRendering");
    expect(previewBlock).toContain("compactPreviewNodes");
    expect(previewBlock).not.toContain("routeEdgesForStoredRendering(visibleNodes");
    expect(previewBlock).not.toContain("[...visibleNodes, movingTarget.node]");
    expect(previewBlock).not.toContain("routeEdgesForRendering");
    expect(previewBlock).not.toContain("simpleOrthogonalPolyline");
  });

  test("keeps terminal move previews on the lightweight stored-route path", async () => {
    const source = await readAppSource();
    const previewStart = source.indexOf("const terminalPressPreviewEdgeRoutes = useMemo");
    const previewEnd = source.indexOf("const terminalPressPreviewEdgeIdSet", previewStart);
    const previewBlock = source.slice(previewStart, previewEnd);

    expect(previewBlock).toContain("routeEdgesForStoredRendering");
    expect(previewBlock).toContain("const previewNodes = compactPreviewNodes(sourceNode, targetNode)");
    expect(previewBlock).not.toContain("routeEdgesForStoredRendering(visibleNodes");
    expect(previewBlock).not.toContain("routeEdgesForRendering");
    expect(previewBlock).not.toContain("simpleOrthogonalPolyline");
  });

  test("snaps dragged single-terminal anchors to the nearest side point", async () => {
    const source = await readAppSource();
    const previewStart = source.indexOf("if (terminalPress && svgRef.current) {");
    const previewEnd = source.indexOf("if (manualPathDrag && svgRef.current)", previewStart);
    const previewBlock = source.slice(previewStart, previewEnd);
    const finishStart = source.indexOf("const finishTerminalPress = () => {");
    const finishEnd = source.indexOf("const handleTerminalPointerDown", finishStart);
    const finishBlock = source.slice(finishStart, finishEnd);
    const helperStart = source.indexOf("const patchSingleTerminalAnchorFromPoint = (");
    const helperEnd = source.indexOf("const rebuildEdgeUpdatesAfterNodeGeometryChange", helperStart);
    const helperBlock = source.slice(helperStart, helperEnd);

    expect(helperBlock).toContain("markGraphDirtyForInteractiveCommit();");
    expect(helperBlock).toContain("const anchor = snapSingleTerminalAnchorToNearestSide(currentNode, point);");
    expect(helperBlock).toContain("current.edgesByNodeId.get(nodeId)");
    expect(helperBlock).toContain("markRouteEdgesDirty(dirtyEdgeIds);");
    expect(helperBlock).toContain("markStoredRouteEdgesDirty(dirtyEdgeIds);");
    expect(helperBlock).toContain("nodes: current.nodes");
    expect(previewBlock).toContain("patchSingleTerminalAnchorFromPoint(terminalPress.nodeId, terminalPress.terminalId, point, terminalPress.startPoint);");
    expect(finishBlock).toContain("patchSingleTerminalAnchorFromPoint(");
    expect(finishBlock).toContain("terminalPress.currentPoint");
    expect(finishBlock).toContain("terminalPress.startPoint");
    expect(finishBlock).not.toContain("graphStorePatchGraph(current, [nextNode], nextEdges)");
    expect(source).not.toContain("clampSingleTerminalAnchor");
  });

  test("draws original dragged edges as dashed ghosts and moving edges as selected solid lines", async () => {
    const source = await readAppSource();
    const styles = await readStyles();
    const ghostRule = cssRuleBlock(styles, ".connection-line.drag-ghost");
    const previewRule = cssRuleBlock(styles, ".connection-line.drag-preview");
    const nodeRenderIndex = source.indexOf("{detailedViewportNodes.map((node) =>");
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
    const lightweightStart = source.indexOf("const buildLightweightNodeDragPreviewRoutes");
    const lightweightEnd = source.indexOf("const buildLightweightNodeDragPreviewRouteMarkup", lightweightStart);
    const lightweightBlock = source.slice(lightweightStart, lightweightEnd);
    const ghostStart = source.indexOf("const dragGhostEdgeRoutes = useMemo");
    const ghostEnd = source.indexOf("useEffect(() =>", ghostStart);
    const ghostBlock = source.slice(ghostStart, ghostEnd);

    expect(previewBlock).toContain("buildLightweightNodeDragPreviewRoutes(dragging, draggingDelta, previewEdges)");
    expect(lightweightBlock).toContain("visibleEdgeIdSet.has(edge.id)");
    expect(ghostBlock).toContain("visibleEdgeIdSet.has(edge.id)");
  });

  test("limits selection and modification operations to the active model layer", async () => {
    const source = await readAppSource();
    const activeLayerStart = source.indexOf("const activeLayerNodes = useMemo");
    const activeLayerEnd = source.indexOf("const activeCanvasSelection = useMemo", activeLayerStart);
    const activeLayerBlock = source.slice(activeLayerStart, activeLayerEnd);
    const selectionStateStart = source.indexOf("const activeCanvasSelection = useMemo");
    const selectionStateEnd = source.indexOf("const selectedEdge =", selectionStateStart);
    const selectionStateBlock = source.slice(selectionStateStart, selectionStateEnd);
    const copyStart = source.indexOf("const copySelection =");
    const pasteStart = source.indexOf("const pasteSelection =", copyStart);
    const copyCutDeleteBlock = source.slice(copyStart, pasteStart);
    const dragStart = source.indexOf("const handleNodePointerDown");
    const dragEnd = source.indexOf("const startMarquee", dragStart);
    const dragBlock = source.slice(dragStart, dragEnd);
    const layoutStart = source.indexOf("const commitLayoutNodePositions");
    const layoutEnd = source.indexOf("const alignSelected", layoutStart);
    const layoutBlock = source.slice(layoutStart, layoutEnd);

    expect(activeLayerBlock).toContain("graphStore.nodesByLayerId.get(activeLayerId)");
    expect(activeLayerBlock).toContain("edgesByNodeId.get(node.id)");
    expect(activeLayerBlock).toContain("visibleEdgeIdSet.has(edge.id)");
    expect(source).toContain("const rawActiveSelectedNodeIds = useMemo");
    expect(source).toContain("selectedNodeIds.filter((nodeId) => activeLayerNodeIdSet.has(nodeId))");
    expect(selectionStateBlock).toContain("activeCanvasSelection.nodeIds");
    expect(selectionStateBlock).toContain("groupExpandedCanvasSelection");
    expect(selectionStateBlock).toContain("displaySelectedNodeIds");
    expect(selectionStateBlock).toContain("const selectedNodeId = activeSelectedNodeIds[0] ?? \"\"");
    expect(selectionStateBlock).toContain("new Set(displaySelectedNodeIds)");
    expect(source).toContain("setSelectedNodeIds(activeLayerNodes.map((node) => node.id))");
    expect(source).toContain("selectGraphicsInRect(activeLayerNodes, activeLayerRoutedEdges");
    expect(copyCutDeleteBlock).toContain("{ expandGroups: canvasSelectionScope === \"group\" }");
    expect(copyCutDeleteBlock).toContain("deleteNodesWithConnectedEdges(nodes, edges, activeSelectedNodeIds)");
    expect(dragBlock).toContain("let dragSelection = nodeWasSelected");
    expect(dragBlock).toContain("? groupDragSelection");
    expect(dragBlock).toContain("expandActiveGroupSelection([...activeSelectedNodeIds, node.id], activeSelectedEdgeIds)");
    expect(dragBlock).toContain("const dragNodeIds = dragSelection.nodeIds");
    expect(dragBlock).toContain("if (!activeLayerNodeIdSet.has(node.id))");
    expect(source).toContain("const selectedLayoutUnits = useMemo");
    expect(source).toContain("buildCanvasLayoutUnits(activeLayerGroups, activeLayerNodes, activeSelectedNodeIds, activeSelectedEdgeIds, activeLayerEdges, routedEdges)");
    expect(layoutBlock).toContain("layoutNodes(nodes, selectedLayoutUnits)");
    expect(layoutBlock).toContain("const movedNodeIdSet = new Set(movedNodeIds)");
    expect(source).toContain("if (!activeLayerEdgeIdSet.has(edgeId))");
    expect(source).toContain("const visibleNodeSpatialIndex = visibleProject.nodeSpatialIndex");
  });

  test("visually de-emphasizes visible graphics outside the active layer in edit mode", async () => {
    const source = await readAppSource();
    const styles = await readStyles();
    const routeRenderStart = source.indexOf("renderViewportRoutedEdges.map");
    const routeRenderEnd = source.indexOf("{selectedRoutedEdge &&", routeRenderStart);
    const routeRenderBlock = source.slice(routeRenderStart, routeRenderEnd);
    const nodeRenderStart = source.indexOf("{detailedViewportNodes.map((node)");
    const nodeRenderEnd = source.indexOf("{selectedRoutedEdge &&", nodeRenderStart);
    const nodeRenderBlock = source.slice(nodeRenderStart, nodeRenderEnd);
    const lodRouteStart = source.indexOf("const lodCanvasRouteChunks = useMemo");
    const lodRouteEnd = source.indexOf("const lodCanvasNodeChunks = useMemo", lodRouteStart);
    const lodRouteBlock = source.slice(lodRouteStart, lodRouteEnd);
    const lodNodeStart = source.indexOf("const lodCanvasNodeChunks = useMemo");
    const lodNodeEnd = source.indexOf("const lodSelectedNodeMarkup = useMemo", lodNodeStart);
    const lodNodeBlock = source.slice(lodNodeStart, lodNodeEnd);
    const inactiveBlock = cssRuleBlock(styles, ".diagram-node.inactive-layer-graphic");

    expect(routeRenderBlock).toContain("const inactiveLayerGraphic = isEditMode && !editable;");
    expect(routeRenderBlock).toContain("${inactiveLayerGraphic ? \"inactive-layer-graphic\" : \"\"}");
    expect(nodeRenderBlock).toContain("const inactiveLayerGraphic = isEditMode && !editable;");
    expect(nodeRenderBlock).toContain("${inactiveLayerGraphic ? \"inactive-layer-graphic\" : \"\"}");
    expect(lodRouteBlock).toContain("inactiveLayerGraphic: isEditMode && !activeLayerEdgeIdSet.has(edge.id)");
    expect(lodRouteBlock).toContain("inactiveLayerGraphic ? \" inactive-layer-graphic\" : \"\"");
    expect(lodNodeBlock).toContain("const inactiveLayerGraphic = isEditMode && !activeLayerNodeIdSet.has(node.id);");
    expect(lodNodeBlock).toContain("${inactiveLayerGraphic ? \" inactive-layer-graphic\" : \"\"}");
    expect(inactiveBlock).toContain("opacity: 0.36");
    expect(inactiveBlock).toContain("filter: grayscale(0.45) saturate(0.55)");
    expect(styles).toContain(".connection-group.inactive-layer-graphic:hover .connection-line");
    expect(styles).toContain(".diagram-node.inactive-layer-graphic:hover .node-hitbox");
  });

  test("selects visible operable nodes and connection lines for Ctrl+A copy paste", async () => {
    const source = await readAppSource();
    const keyStart = source.indexOf("const handleKeyDown =");
    const keyEnd = source.indexOf("window.addEventListener(\"keydown\"", keyStart);
    const keyBlock = source.slice(keyStart, keyEnd);
    const ctrlAStart = keyBlock.lastIndexOf("event.key.toLowerCase() === \"a\"");
    const ctrlAEnd = keyBlock.indexOf("} else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === \"c\")", ctrlAStart);
    const ctrlABlock = keyBlock.slice(ctrlAStart, ctrlAEnd);
    const copyStart = source.indexOf("const copySelection =");
    const pasteStart = source.indexOf("const pasteSelection =", copyStart);
    const copyBlock = source.slice(copyStart, pasteStart);

    expect(ctrlABlock).toContain("setSelectedNodeIds(activeLayerNodes.map((node) => node.id))");
    expect(ctrlABlock).toContain("const selectableEdgeIds = activeLayerEdges.map((edge) => edge.id)");
    expect(ctrlABlock).toContain("setSelectedEdgeIds(selectableEdgeIds)");
    expect(ctrlABlock).toContain("setSelectedEdgeId(selectableEdgeIds[0] ?? \"\")");
    expect(ctrlABlock).not.toContain("setSelectedEdgeIds([])");
    expect(copyBlock).toContain("visibleEdges");
    expect(copyBlock).toContain("activeSelectedEdgeIds");
  });

  test("focuses a selected nested group member and moves the whole group", async () => {
    const source = await readAppSource();
    const styles = await readStyles();
    const selectionStateStart = source.indexOf("const activeSelectedGroupIds = useMemo");
    const selectionStateEnd = source.indexOf("const topologyWarningPageCount", selectionStateStart);
    const selectionStateBlock = source.slice(selectionStateStart, selectionStateEnd);
    const copyStart = source.indexOf("const copySelection =");
    const pasteStart = source.indexOf("const pasteSelection =", copyStart);
    const copyCutBlock = source.slice(copyStart, pasteStart);
    const moveStart = source.indexOf("const moveSelection =");
    const moveEnd = source.indexOf("const updateSelectedNode", moveStart);
    const moveBlock = source.slice(moveStart, moveEnd);
    const dragMoveStart = source.indexOf("const applyNodeDragMove =");
    const dragMoveEnd = source.indexOf("const scheduleNodeDragMove =", dragMoveStart);
    const dragMoveBlock = source.slice(dragMoveStart, dragMoveEnd);
    const dragStart = source.indexOf("const handleNodePointerDown");
    const dragEnd = source.indexOf("const handlePointerMove", dragStart);
    const dragBlock = source.slice(dragStart, dragEnd);
    const updateStart = source.indexOf("const updateSelectedNode");
    const updateEnd = source.indexOf("const assignSelectedNodesToModelLayer", updateStart);
    const updateBlock = source.slice(updateStart, updateEnd);

    expect(source).toContain("type CanvasSelectionScope");
    expect(source).toContain("type CanvasSelectionSnapshot =");
    expect(source).toContain("selection?: CanvasSelectionSnapshot;");
    expect(source).toContain("const restoreCanvasSelectionSnapshot =");
    expect(source).toContain("restoreCanvasSelectionSnapshot(activeDragging.selection);");
    expect(source).toContain("const [canvasSelectionScope, setCanvasSelectionScope]");
    expect(source).toContain("const displaySelectedNodeIds = canvasSelectionScope === \"direct\" ? groupExpandedCanvasSelection.nodeIds : activeSelectedNodeIds");
    expect(source).toContain("const displaySelectedEdgeIds = canvasSelectionScope === \"direct\" ? groupExpandedCanvasSelection.edgeIds : activeCanvasSelection.edgeIds");
    expect(source).toContain("new Set(displaySelectedNodeIds)");
    expect(source).toContain("const focused = node.id === selectedNodeId");
    expect(source).toContain("selected ? \"selected\" : \"\"} ${focused ? \"focused\" : \"\"}");
    expect(source).toContain("{selected && focused && selectedNodeCount === 1 && !nodeIsRoutableLineDevice && (");
    expect(styles).toContain(".diagram-node.selected.focused .node-hitbox");
    expect(selectionStateBlock).toContain("selectedCanvasGroupIds(activeLayerGroups, groupExpandedCanvasSelection.nodeIds, groupExpandedCanvasSelection.edgeIds)");
    expect(selectionStateBlock).toContain("canvasGroupMemberNodeIds(activeLayerGroups, activeSelectedGroupIds)");
    expect(source).toContain("const selectedFloatingToolbarBounds =");
    expect(source).toContain("focusedGroupedNodeMovesGroup && selectedNode ? calculateNodeVisualBounds(selectedNode) : selectedCanvasBounds");
    expect(source).toContain("const visibleSelectedGroupLayoutUnits = focusedGroupedNodeMovesGroup ? [] : selectedGroupLayoutUnits;");
    expect(source).toContain("{visibleSelectedGroupLayoutUnits.map((unit) =>");
    expect(copyCutBlock).toContain("{ expandGroups: canvasSelectionScope === \"group\" }");
    expect(moveBlock).toContain("const moveNodeIds = canvasSelectionScope === \"direct\" ? displaySelectedNodeIds : activeSelectedNodeIds");
    expect(moveBlock).toContain("const moveEdgeIds = canvasSelectionScope === \"direct\" ? displaySelectedEdgeIds : activeSelectedEdgeIds");
    expect(moveBlock).toContain("commitFastMovedGraphPatches(");
    expect(moveBlock).toContain("moveNodeIds");
    expect(dragMoveBlock).toContain("setDragging(singleNodeDragRenderState(nextDragState));");
    expect(dragMoveBlock).not.toContain("setDragging((current) =>");
    expect(dragMoveBlock).not.toContain("draggingRef.current = null;\n        return current;");
    expect(updateBlock).toContain("if (patch.position && focusedGroupedNodeMovesGroup && selectedNode)");
    expect(updateBlock).toContain("moveSelection(nextPosition.x - selectedNode.position.x, nextPosition.y - selectedNode.position.y)");
    expect(dragBlock).toContain("const clickedSelectedGroupMember");
    expect(dragBlock).toContain("nodeWasSelected");
    expect(dragBlock).toContain("const groupDragSelection");
    expect(dragBlock).toContain("let dragSelectionSnapshot = createCanvasSelectionSnapshot");
    expect(dragBlock).toContain("nodeIds: groupExpandedCanvasSelection.nodeIds");
    expect(dragBlock).toContain("let dragSelection = nodeWasSelected");
    expect(dragBlock).toContain("? groupDragSelection");
    expect(dragBlock).toContain("selectedGroupMemberNodeIdSet.has(node.id)");
    expect(dragBlock).toContain("setSelectedNodeIds([node.id])");
    expect(dragBlock).toContain("setCanvasSelectionScope(\"direct\")");
    expect(dragBlock).toContain("dragSelectionSnapshot = createCanvasSelectionSnapshot(\"direct\", [node.id], [], \"\")");
    expect(dragBlock).toContain("selection: dragSelectionSnapshot");
    expect(dragBlock).toContain("const dragNodeIds = dragSelection.nodeIds");
    expect(dragBlock).toContain("const originalPositionsForDrag = Object.fromEntries");
  });

  test("shows selected canvas groups and transforms them as layout units", async () => {
    const source = await readAppSource();
    const styles = await readStyles();
    const selectionStateStart = source.indexOf("const activeSelectedGroupIds = useMemo");
    const selectionStateEnd = source.indexOf("const topologyWarningPageCount", selectionStateStart);
    const selectionStateBlock = source.slice(selectionStateStart, selectionStateEnd);
    const mirrorStart = source.indexOf("const mirrorSelectedNodes");
    const mirrorEnd = source.indexOf("const updateCanvasSize", mirrorStart);
    const mirrorBlock = source.slice(mirrorStart, mirrorEnd);
    const pointerStart = source.indexOf("if (transformDrag && svgRef.current)");
    const pointerEnd = source.indexOf("if (!draggingRef.current || !svgRef.current)", pointerStart);
    const pointerBlock = source.slice(pointerStart, pointerEnd);
    const groupPointerStart = pointerBlock.indexOf("if (isGroupTransformDrag(transformDrag))");
    const groupPointerEnd = pointerBlock.indexOf("const node = currentStore.nodeMap.get", groupPointerStart);
    const groupPointerBlock = pointerBlock.slice(groupPointerStart, groupPointerEnd);
    const finishTransformStart = source.indexOf("const finishTransformDrag");
    const finishTransformEnd = source.indexOf("const finishKeyboardMove", finishTransformStart);
    const finishTransformBlock = source.slice(finishTransformStart, finishTransformEnd);
    const groupPreviewStart = source.indexOf("const groupTransformPreviewTransform");
    const groupPreviewEnd = source.indexOf("const dragPreviewEdgeRoutes", groupPreviewStart);
    const groupPreviewBlock = source.slice(groupPreviewStart, groupPreviewEnd);
    const renderStart = source.indexOf("{visibleSelectedGroupLayoutUnits.map");
    const renderEnd = source.indexOf("{detailedViewportNodes.map", renderStart);
    const renderBlock = source.slice(renderStart, renderEnd);
    const edgeRenderStart = source.indexOf("{renderViewportRoutedEdges.map((route) =>");
    const edgeRenderEnd = source.indexOf("{visibleSelectedGroupLayoutUnits.map", edgeRenderStart);
    const edgeRenderBlock = source.slice(edgeRenderStart, edgeRenderEnd);
    const nodeRenderStart = source.indexOf("{detailedViewportNodes.map((node) =>");
    const nodeRenderEnd = source.indexOf("{renderMultiNodeDragOverlay()}", nodeRenderStart);
    const nodeRenderBlock = source.slice(nodeRenderStart, nodeRenderEnd);

    expect(source).toContain("type GroupTransformNodeSnapshot");
    expect(source).toContain("type GroupTransformEdgeRouteSnapshot");
    expect(source).toContain("function groupTransformSvgTransform");
    expect(source).toContain("const selectedGroupLayoutUnits = useMemo");
    expect(source).toContain("const visibleSelectedGroupLayoutUnits = focusedGroupedNodeMovesGroup ? [] : selectedGroupLayoutUnits;");
    expect(source).toContain("const selectedTransformGroupUnit =");
    expect(groupPreviewBlock).toContain("groupTransformPreviewTransform");
    expect(groupPreviewBlock).toContain("path: pointsToPreviewPath(points)");
    expect(groupPreviewBlock).toContain("groupTransformPreviewEdgeIdSet");
    expect(source).toContain("const startGroupTransformDrag");
    expect(source).toContain("const startGroupMoveDrag");
    expect(source).toContain("snapshotGroupTransformEdgeRoutes(unit)");
    expect(source).toContain("const buildGroupTransformNodeUpdates");
    expect(pointerBlock).toContain("isGroupTransformDrag(transformDrag)");
    expect(pointerBlock).toContain("const transformForMove = transformDrag.kind === \"rotate\"");
    expect(pointerBlock).toContain("proportionalScale: true");
    expect(pointerBlock).toContain("buildGroupTransformNodeUpdates(transformForMove, point, currentStore)");
    expect(groupPointerBlock).not.toContain("patchGraphNodes");
    expect(pointerBlock).toContain("previewPoint: point");
    expect(finishTransformBlock).toContain("activeTransform.nodeIds");
    expect(finishTransformBlock).toContain("buildGroupTransformNodeUpdates(activeTransform, finalPreviewPoint, current, { snapRotation: activeTransform.kind === \"rotate\" })");
    expect(finishTransformBlock).toContain("graphStorePatchGraphFromArrays");
    expect(finishTransformBlock).toContain("rebuildEdgeUpdatesAfterNodeGeometryChange(finalNextNodes, transformedNodeIds, current.edges)");
    expect(finishTransformBlock).toContain("graphStoreApplyPatch(current, {");
    expect(finishTransformBlock).toContain("edgeUpserts: edgeUpdates");
    expect(edgeRenderBlock).toContain("groupTransformPreviewEdgeIdSet.has(edge.id)");
    expect(nodeRenderBlock).toContain("groupTransformPreviewNodeIdSet.has(node.id)");
    expect(mirrorBlock).toContain("selectedLayoutUnits");
    expect(source).toContain("unit.kind === \"group\"");
    expect(mirrorBlock).toContain("mirrorLayoutUnitNodeUpdates");
    expect(source).toContain("const renderGroupTransformPhotoPreview");
    expect(source).toContain("transform={groupTransformPreviewTransform}");
    expect(renderBlock).toContain("const transforming = groupTransformPreviewGroupId === unit.id");
    expect(renderBlock).toContain("transforming ? \"transforming\" : \"\"");
    expect(renderBlock).toContain("group-selection-overlay");
    expect(renderBlock).toContain("group-selection-hitbox");
    expect(renderBlock).toContain("startGroupMoveDrag(event, unit)");
    expect(renderBlock).toContain("selectedTransformGroupUnit?.id === unit.id");
    expect(renderBlock).toContain("startGroupTransformDrag(event, unit, \"rotate\")");
    expect(renderBlock).toContain("startGroupTransformDrag(event, unit, handle.kind)");
    expect(source).toContain("const GROUP_SCALE_HANDLE_CONFIGS = SCALE_HANDLE_CONFIGS.filter((handle) => handle.kind === \"scale-both\");");
    expect(renderBlock).toContain("{GROUP_SCALE_HANDLE_CONFIGS.map((handle) => {");
    expect(source).toContain("className=\"group-transform-photo-preview\"");
    expect(styles).toContain(".group-selection-overlay");
    expect(styles).toContain(".group-selection-hitbox");
    expect(styles).toContain("cursor: grab");
    expect(styles).toContain(".group-selection-outline");
    expect(styles).toContain(".group-selection-overlay.transforming");
    expect(styles).toContain(".group-transform-photo-preview");
  });

  test("uses routed group connection geometry for group bounds and scales grouped routes during transform", async () => {
    const source = await readAppSource();
    const layoutStart = source.indexOf("const selectedLayoutUnits = useMemo");
    const layoutEnd = source.indexOf("const canUngroupSelectedGraphics", layoutStart);
    const layoutBlock = source.slice(layoutStart, layoutEnd);
    const previewStart = source.indexOf("const groupTransformPreviewEdgeRoutes");
    const previewEnd = source.indexOf("const groupTransformPreviewEdgeIdSet", previewStart);
    const previewBlock = source.slice(previewStart, previewEnd);
    const finishTransformStart = source.indexOf("const finishTransformDrag");
    const finishTransformEnd = source.indexOf("const transformedNode =", finishTransformStart);
    const finishTransformBlock = source.slice(finishTransformStart, finishTransformEnd);
    const groupGeometryStart = source.indexOf("function groupTransformGeometry");
    const groupGeometryEnd = source.indexOf("function transformGroupPoint", groupGeometryStart);
    const groupGeometryBlock = source.slice(groupGeometryStart, groupGeometryEnd);
    const groupStartDragStart = source.indexOf("const startGroupTransformDrag");
    const groupStartDragEnd = source.indexOf("const startSingleTransformDrag", groupStartDragStart);
    const groupStartDragBlock = source.slice(groupStartDragStart, groupStartDragEnd);

    expect(layoutBlock).toContain("buildCanvasLayoutUnits(");
    expect(layoutBlock).toContain("transformableActiveSelectedNodeIds");
    expect(layoutBlock).toContain("isTransformableNode: (node) => isCanvasNodeMovable(node.kind)");
    expect(source).toContain("const buildGroupTransformEdgeUpdates");
    expect(source).toContain("handleXDirection?: -1 | 0 | 1;");
    expect(source).toContain("handleYDirection?: -1 | 0 | 1;");
    expect(groupGeometryBlock).toContain("point.x - drag.startPoint.x");
    expect(groupGeometryBlock).toContain("point.y - drag.startPoint.y");
    expect(groupGeometryBlock).not.toContain("Math.abs(point.x - drag.center.x) / halfWidth");
    expect(groupStartDragBlock).toContain("if (kind !== \"rotate\" && kind !== \"scale-both\")");
    expect(groupStartDragBlock).toContain("handleXDirection: kind === \"rotate\" ? 0 : startPoint.x >= center.x ? 1 : -1");
    expect(groupStartDragBlock).toContain("handleYDirection: kind === \"rotate\" ? 0 : startPoint.y >= center.y ? 1 : -1");
    expect(previewBlock).toContain("transformDrag.originalEdgeRoutes.flatMap");
    expect(previewBlock).toContain("const geometry = groupTransformGeometry(transformDrag, transformDrag.previewPoint)");
    expect(previewBlock).toContain("transformGroupPoint(transformDrag, geometry, routePoint)");
    expect(source).toContain("className=\"group-transform-photo-content\"");
    expect(source).toContain("transform={groupTransformPreviewTransform}");
    expect(finishTransformBlock).toContain("const transformedEdgeUpdates = buildGroupTransformEdgeUpdates(activeTransform, finalPreviewPoint, current, { snapRotation: activeTransform.kind === \"rotate\" })");
    expect(finishTransformBlock).toContain("const transformedRouteEdgeIds = new Set(transformedEdgeUpdates.map((edge) => edge.id))");
    expect(finishTransformBlock).toContain("rebuildEdgesAfterNodeGeometryChange(nextNodes, transformedNodeIds, transformedEdges, transformedRouteEdgeIds)");
  });

  test("mirrors node rotation and selected group routes through the same layout axis", async () => {
    const source = await readAppSource();
    const mirrorStart = source.indexOf("const mirrorSelectedNodes");
    const mirrorEnd = source.indexOf("const updateCanvasSize", mirrorStart);
    const mirrorBlock = source.slice(mirrorStart, mirrorEnd);
    const layoutMirrorStart = source.indexOf("const mirrorLayoutUnitNodeUpdates");
    const layoutMirrorEnd = source.indexOf("const busAnchorFromEvent", layoutMirrorStart);
    const layoutMirrorBlock = source.slice(layoutMirrorStart, layoutMirrorEnd);

    expect(source).toContain("function mirrorPointAcrossAxis");
    expect(source).toContain("const buildMirrorLayoutUnitEdgeUpdates");
    expect(layoutMirrorBlock).toContain("rotation: normalizeRotationDegrees(-node.rotation)");
    expect(layoutMirrorBlock).toContain("mirrorPointAcrossAxis(node.position, center, axis)");
    expect(layoutMirrorBlock).toContain("scaleX: -getNodeScaleX(node)");
    expect(layoutMirrorBlock).toContain("scaleY: -getNodeScaleY(node)");
    expect(mirrorBlock).toContain("const mirroredEdgeUpdates = buildMirrorLayoutUnitEdgeUpdates");
    expect(mirrorBlock).toContain("const preservedMirrorEdgeIds = new Set(mirroredEdgeUpdates.map((edge) => edge.id))");
    expect(mirrorBlock).not.toContain("const mirroredEdges = overlayEdgeUpdatesForTransform(edges, mirroredEdgeUpdates)");
    expect(mirrorBlock).toContain("rebuildEdgeUpdatesAfterNodeGeometryChange(nextNodes, transformedNodeIds, edges, preservedMirrorEdgeIds)");
    expect(mirrorBlock).toContain("graphStoreApplyPatch(current, {");
  });

  test("groups alignment and rotation actions into hover topbar dropdowns", async () => {
    const source = await readAppSource();
    const styles = await readStyles();
    const rotateStart = source.indexOf("const rotateSelectedLayoutUnits");
    const rotateEnd = source.indexOf("const mirrorSelectedNodes", rotateStart);
    const rotateBlock = source.slice(rotateStart, rotateEnd);
    const topbarStart = source.indexOf("<header className=\"topbar\"");
    const topbarEnd = source.indexOf("</header>", topbarStart);
    const topbarBlock = source.slice(topbarStart, topbarEnd);

    expect(source).toContain("RotateCcw");
    expect(source).toContain("RotateCw");
    expect(source).toContain("const rotateLayoutUnitNodeUpdates");
    expect(source).toContain("const buildRotateLayoutUnitEdgeUpdates");
    expect(rotateBlock).toContain("const degrees = direction === \"left\" ? -90 : 90");
    expect(rotateBlock).toContain("rotateLayoutUnitNodeUpdates(selectedLayoutUnits, degrees)");
    expect(rotateBlock).toContain("const rotatedEdgeUpdates = buildRotateLayoutUnitEdgeUpdates");
    expect(rotateBlock).toContain("const preservedRotateEdgeIds = new Set(rotatedEdgeUpdates.map((edge) => edge.id))");
    expect(rotateBlock).toContain("rebuildEdgeUpdatesAfterNodeGeometryChange(nextNodes, transformedNodeIds, edges, preservedRotateEdgeIds)");
    expect(rotateBlock).toContain("graphStoreApplyPatch(current, {");
    expect(topbarBlock).toContain("className=\"topbar-dropdown align-dropdown\"");
    expect(topbarBlock).toContain("className=\"topbar-dropdown rotate-dropdown\"");
    expect(topbarBlock).toContain("className=\"topbar-dropdown-trigger\"");
    expect(topbarBlock).toContain("className=\"topbar-dropdown-menu\"");
    expect(topbarBlock).toContain("title=\"对齐操作\"");
    expect(topbarBlock).toContain("aria-label=\"对齐操作\"");
    expect(topbarBlock).toContain("title=\"旋转操作\"");
    expect(topbarBlock).toContain("aria-label=\"旋转操作\"");
    expect(topbarBlock).toContain("onClick={() => alignSelected(\"left\")}");
    expect(topbarBlock).toContain("onClick={() => alignSelected(\"right\")}");
    expect(topbarBlock).toContain("onClick={() => alignSelected(\"horizontal\")}");
    expect(topbarBlock).toContain("onClick={() => distributeSelected(\"horizontal\")}");
    expect(topbarBlock).toContain("onClick={() => distributeSelected(\"vertical\")}");
    expect(topbarBlock).toContain("onClick={() => rotateSelectedLayoutUnits(\"left\")}");
    expect(topbarBlock).toContain("title=\"向左旋转90度\"");
    expect(topbarBlock).toContain("aria-label=\"向左旋转90度\"");
    expect(topbarBlock).toContain("<RotateCcw size={16} />");
    expect(topbarBlock).toContain("onClick={() => rotateSelectedLayoutUnits(\"right\")}");
    expect(topbarBlock).toContain("title=\"向右旋转90度\"");
    expect(topbarBlock).toContain("aria-label=\"向右旋转90度\"");
    expect(topbarBlock).toContain("<RotateCw size={16} />");
    expect(topbarBlock).toContain("onClick={() => mirrorSelectedNodes(\"horizontal\")}");
    expect(topbarBlock).toContain("onClick={() => mirrorSelectedNodes(\"vertical\")}");
    expect(topbarBlock.indexOf("title=\"旋转操作\"")).toBeLessThan(topbarBlock.indexOf("aria-label=\"导出图形文件\""));
    expect(styles).toContain(".topbar-dropdown:hover .topbar-dropdown-menu");
    expect(styles).toContain(".topbar-dropdown:focus-within .topbar-dropdown-menu");
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
    expect(commitBlock).toContain("connectionEndpointRuleFailureMessage(newEdge)");
    expect(commitBlock).toContain("routingNodesForConnectionEdge(newEdge)");
    expect(commitBlock).toContain("canvasBounds");
    expect(commitBlock).toContain("routedEdges");
    expect(commitBlock).toContain("联络线绘制失败");
    expect(commitBlock).toContain("prepared.edge");
    expect(commitBlock).toContain("graphStoreApplyPatch(current, { edgeUpserts: [preparedEdge] })");
    expect(commitBlock.indexOf("connectionEndpointRuleFailureMessage(newEdge)")).toBeLessThan(commitBlock.indexOf("prepareConnectionEdgeForCommit"));
    expect(commitBlock.indexOf("prepareConnectionEdgeForCommit")).toBeLessThan(commitBlock.indexOf("graphStoreApplyPatch"));
    expect(finishBlock).toContain("return commitNewConnectionEdge(newEdge");
    expect(terminalBlock).toContain("commitNewConnectionEdge(newEdge");
  });

  test("prepares rewired connection geometry before committing endpoint changes", async () => {
    const source = await readAppSource();
    const rewiringStart = source.indexOf("const finishRewiring");
    const rewiringEnd = source.indexOf("const handleDrop", rewiringStart);
    const rewiringBlock = source.slice(rewiringStart, rewiringEnd);

    expect(rewiringBlock).toContain("prepareConnectionEdgeForCommit");
    expect(rewiringBlock).toContain("connectionEndpointRuleFailureMessage(candidateEdge)");
    expect(rewiringBlock).toContain("canvasBounds,");
    expect(rewiringBlock).toContain("routedEdges");
    expect(rewiringBlock).toContain("prepared.edge");
    expect(rewiringBlock.indexOf("connectionEndpointRuleFailureMessage(candidateEdge)")).toBeLessThan(rewiringBlock.indexOf("prepareConnectionEdgeForCommit"));
    expect(rewiringBlock.indexOf("prepareConnectionEdgeForCommit")).toBeLessThan(rewiringBlock.indexOf("patchGraphEdges"));
  });

  test("commits drag-end nodes, edges, and drag state without forcing a synchronous render", async () => {
    const source = await readAppSource();
    const finishStart = source.indexOf("const finishNodeDrag = () =>");
    const finishEnd = source.indexOf("const moveSelection", finishStart);
    const finishBlock = source.slice(finishStart, finishEnd);

    expect(finishBlock).not.toContain("flushSync(() =>");
    expect(source).toContain("const commitFastMovedGraph");
    expect(source).toContain("graphStorePatchGraphFromArrays");
    expect(finishBlock).not.toContain("setNodes(nextNodes)");
    expect(finishBlock).not.toContain("setEdges(nextEdges)");
    expect(finishBlock).toContain("commitFastMovedGraphPatches");
    expect(finishBlock).toContain("setDragging(null)");
    const commitStart = finishBlock.indexOf("commitFastMovedGraphPatches");
    const commitEnd = finishBlock.indexOf("writeOperationLog", commitStart);
    const commitBlock = finishBlock.slice(commitStart, commitEnd);
    expect(commitBlock).toContain("finalizedCandidateEdges");
    expect(commitBlock).toContain("setDragging(null)");
    expect(commitBlock.indexOf("commitFastMovedGraphPatches")).toBeLessThan(commitBlock.indexOf("setDragging(null)"));
  });

  test("reroutes only connected lines after node geometry transforms", async () => {
    const source = await readAppSource();
    const helperStart = source.indexOf("const rebuildEdgeUpdatesAfterNodeGeometryChange");
    const helperEnd = source.indexOf("const rebuildEdgesAfterNodeGeometryChange", helperStart);
    const helperBlock = source.slice(helperStart, helperEnd);
    const updateStart = source.indexOf("const updateSelectedNode");
    const updateEnd = source.indexOf("const assignSelectedNodesToModelLayer", updateStart);
    const updateBlock = source.slice(updateStart, updateEnd);
    const mirrorStart = source.indexOf("const mirrorSelectedNodes");
    const mirrorEnd = source.indexOf("const updateCanvasSize", mirrorStart);
    const mirrorBlock = source.slice(mirrorStart, mirrorEnd);
    const finishTransformStart = source.indexOf("const finishTransformDrag");
    const finishTransformEnd = source.indexOf("const moveSelection", finishTransformStart);
    const finishTransformBlock = source.slice(finishTransformStart, finishTransformEnd);
    const pointerStart = source.indexOf("if (transformDrag && svgRef.current)");
    const pointerEnd = source.indexOf("if (!dragging || !svgRef.current)", pointerStart);
    const pointerBlock = source.slice(pointerStart, pointerEnd);

    expect(source).toContain("rebuildConnectionRoutesForNodes");
    expect(helperBlock).toContain("const localEdges = currentEdges === edges");
    expect(helperBlock).toContain("edgeListForNodeIds(changedIds)");
    expect(helperBlock).toContain("routingNodesForConnectionEdges(rerouteEdges, nextNodes, changedIds)");
    expect(helperBlock).toContain("rebuildConnectionRoutesForNodes(routingNodes, rerouteEdges, changedIds, canvasBounds, rerouteEdges, editModeRouteRebuildOptions)");
    expect(helperBlock).toContain("dirtyEdgeIdsAfterMove(rerouteEdges, nextLocalEdges, changedIds)");
    expect(helperBlock).toContain("markRouteEdgesDirty");
    expect(helperBlock).toContain("markStoredRouteEdgesDirty");
    expect(updateBlock).toContain("const geometryPatch");
    expect(updateBlock).toContain("rebuildEdgeUpdatesAfterNodeGeometryChange(finalNextNodes, [selectedNodeId])");
    expect(mirrorBlock).toContain("rebuildEdgeUpdatesAfterNodeGeometryChange(nextNodes, transformedNodeIds, edges, preservedMirrorEdgeIds)");
    expect(mirrorBlock).toContain("graphStoreApplyPatch(current, {");
    expect(mirrorBlock).not.toContain("setGraphArrays(nextNodes, nextEdges)");
    expect(finishTransformBlock).toContain("transformDragChangedRef.current");
    expect(finishTransformBlock).toContain("rebuildEdgeUpdatesAfterNodeGeometryChange(finalNextNodes, transformedNodeIds, current.edges)");
    expect(finishTransformBlock).toContain("graphStoreApplyPatch(current, {");
    expect(finishTransformBlock).toContain("edgeUpserts: edgeUpdates");
    expect(pointerBlock).toContain("transformDragChangedRef.current = true");
    expect(source).toContain("finishTransformDrag();");
  });

  test("maps single-node scale handles through rotation before changing local scale axes", async () => {
    const source = await readAppSource();
    const helperStart = source.indexOf("function localScaleKindForScreenHandle");
    const helperEnd = source.indexOf("type Marquee", helperStart);
    const helperBlock = source.slice(helperStart, helperEnd);
    const pointerStart = source.indexOf("if (transformDrag && svgRef.current)");
    const pointerEnd = source.indexOf("if (!draggingRef.current || !svgRef.current)", pointerStart);
    const pointerBlock = source.slice(pointerStart, pointerEnd);
    const renderStart = source.indexOf("{detailedViewportNodes.map((node) =>");
    const renderEnd = source.indexOf("{renderGroupTransformPhotoPreview()}", renderStart);
    const renderBlock = source.slice(renderStart, renderEnd);
    const proportionalStart = source.indexOf("const proportionalSignedScaleFromHandleDelta =");
    const proportionalEnd = source.indexOf("const proportionalSignedScaleFromUprightHandleDelta", proportionalStart);
    const proportionalBlock = source.slice(proportionalStart, proportionalEnd);
    const uprightProportionalStart = source.indexOf("const proportionalSignedScaleFromUprightHandleDelta =");
    const uprightProportionalEnd = source.indexOf("const snapshotGroupTransformNodes", uprightProportionalStart);
    const uprightProportionalBlock = source.slice(uprightProportionalStart, uprightProportionalEnd);

    expect(source).toContain("type SingleTransformDrag");
    expect(source).toContain("const startSingleTransformDrag");
    expect(source).toContain("const singleTransformBaseNode");
    expect(source).toContain("function scaleHandleControlPoint");
    expect(source).toContain("function nodeScaleHandleControlPoint");
    expect(source).toContain("function scaleHandleCursorClass");
    expect(source).toContain("const signedScaleFromRotatedHandleDelta");
    expect(source).toContain("const signedScaleFromUprightHandleDelta");
    expect(source).toContain("const proportionalSignedScaleFromHandleDelta");
    expect(source).toContain("const proportionalSignedScaleFromUprightHandleDelta");
    expect(source).toContain("startPoint: Point");
    expect(helperStart).toBeGreaterThan(-1);
    expect(helperBlock).toContain("rotation");
    expect(helperBlock).toContain("screenAxis");
    expect(helperBlock).toContain("localVector");
    expect(pointerBlock).toContain("const baseNode = singleTransformBaseNode(transformDrag, node);");
    expect(pointerBlock).toContain("const rawPoint = lastRawCanvasPointerRef.current");
    expect(pointerBlock).not.toContain("toLocalNodePoint(node, point)");
    expect(pointerBlock).toContain("const localScaleKind = event.shiftKey || transformDrag.kind === \"scale-both\"");
    expect(pointerBlock).toContain(": transformDrag.kind;");
    expect(pointerBlock).not.toContain("localScaleKindForScreenHandle(transformDrag.kind, baseNode.rotation)");
    expect(pointerBlock).toContain("if (localScaleKind === \"scale-x\")");
    expect(pointerBlock).toContain("} else if (localScaleKind === \"scale-y\")");
    expect(pointerBlock).toContain("const currentSignedScaleX = getNodeScaleX(baseNode);");
    expect(pointerBlock).toContain("const currentSignedScaleY = getNodeScaleY(baseNode);");
    expect(pointerBlock).toContain("scaleY: currentSignedScaleY");
    expect(pointerBlock).toContain("scaleX: currentSignedScaleX");
    expect(pointerBlock).toContain("const signedScaleFromHandleDelta = transformDrag.uprightStaticSelection");
    expect(pointerBlock).toContain("? signedScaleFromUprightHandleDelta");
    expect(pointerBlock).toContain(": signedScaleFromRotatedHandleDelta;");
    expect(pointerBlock).toContain("signedScaleFromHandleDelta(transformDrag, point, baseNode, \"scale-x\")");
    expect(pointerBlock).toContain("signedScaleFromHandleDelta(transformDrag, point, baseNode, \"scale-y\")");
    expect(pointerBlock).toContain("const nextSignedScale = transformDrag.uprightStaticSelection");
    expect(pointerBlock).toContain("? proportionalSignedScaleFromUprightHandleDelta(transformDrag, point, baseNode)");
    expect(pointerBlock).toContain(": proportionalSignedScaleFromHandleDelta(transformDrag, point, baseNode);");
    expect(pointerBlock).not.toContain("normalizeScale(Math.max(nextScaleX, nextScaleY))");
    expect(proportionalBlock).toContain("const startLocal = toLocalNodePoint(baseNode, drag.startPoint);");
    expect(proportionalBlock).toContain("const currentLocal = toLocalNodePoint(baseNode, point);");
    expect(proportionalBlock).not.toContain("point.x - drag.startPoint.x");
    expect(proportionalBlock).not.toContain("point.y - drag.startPoint.y");
    expect(uprightProportionalBlock).toContain("point.x - drag.startPoint.x");
    expect(uprightProportionalBlock).toContain("point.y - drag.startPoint.y");
    expect(renderBlock).toContain("startSingleTransformDrag(event, node, \"rotate\")");
    expect(renderBlock).toContain("const handlePoint = nodeScaleHandleControlPoint(node, handle, handleGapX, handleGapY, uprightStaticSelectionOutline);");
    expect(renderBlock).toContain("const handleCursorClass = scaleHandleCursorClass(handle, uprightStaticSelectionOutline ? 0 : node.rotation);");
    expect(renderBlock).toContain("transform={handleTransform(handlePoint.x, handlePoint.y)}");
    expect(renderBlock).toContain("className={`scale-handle ${handleCursorClass}`}");
    expect(renderBlock).toContain("startSingleTransformDrag(event, node, handle.kind, handle)");
  });

  test("filters single-node resize handles by component resize permission", async () => {
    const source = await readAppSource();
    const renderStart = source.indexOf("{detailedViewportNodes.map((node) =>");
    const renderEnd = source.indexOf("{visibleMeasurementGroups.length > 0 &&", renderStart);
    const renderBlock = source.slice(renderStart, renderEnd);
    const singleTransformStart = source.indexOf("const startSingleTransformDrag =");
    const singleTransformEnd = source.indexOf("const startGroupMoveDrag", singleTransformStart);
    const singleTransformBlock = source.slice(singleTransformStart, singleTransformEnd);
    const definitionSaveStart = source.indexOf("const saveDeviceDefinitionDraft = () =>");
    const definitionSaveEnd = source.indexOf("const resetDeviceDefinitionDraft = () =>", definitionSaveStart);
    const definitionSaveBlock = source.slice(definitionSaveStart, definitionSaveEnd);
    const selectedModelParamStart = source.indexOf("const eKeys = getEParameterKeys(inspectorSelectedNode.kind, inspectorSelectedNode.params);");
    const selectedModelParamEnd = source.indexOf("return keys.map((key) =>", selectedModelParamStart);
    const selectedModelParamBlock = source.slice(selectedModelParamStart, selectedModelParamEnd);

    expect(source).toContain("ALLOW_RESIZE_TRANSFORM_PARAM");
    expect(source).toContain("allowResizeTransform: [\"1\", \"0\"]");
    expect(source).toContain("allowResizeTransform: { \"1\": \"允许\", \"0\": \"不允许\" }");
    expect(source).toContain("allowResizeTransform: \"是否允许变形\"");
    expect(source).toContain("templateResizeTransformValue");
    expect(source).toContain("templateAllowsResizeTransform");
    expect(source).toContain("const nodeKindAllowsResizeTransform = (kind: string) => {");
    expect(source).toContain("return template ? templateAllowsResizeTransform(template) : defaultAllowsResizeTransformForKind(kind);");
    expect(source).toContain("const isReservedDeviceDefinitionParamName = (enName: string)");
    expect(source).toContain("isReservedDeviceDefinitionParamName(enName)");
    expect(source).toContain("是否允许变形是元件属性");
    expect(source).toContain("<span>是否允许变形</span>");
    expect(source).toContain("const updateSelectedDefinitionResizePermission = (value: string) => {");
    expect(source).toContain("const nextAllowed = value === \"1\";");
    expect(source).toContain("allowResizeTransform: nextAllowed");
    expect(source).toContain("value={templateResizeTransformValue(selectedDefinitionTemplate)}");
    expect(source).toContain("onChange={(event) => updateSelectedDefinitionResizePermission(event.target.value)}");
    expect(source).not.toContain("<strong>{templateAllowsResizeTransform(selectedDefinitionTemplate) ? \"是\" : \"否\"}</strong>");
    expect(source).not.toContain("nodeAllowsResizeTransform");
    expect(source).not.toContain("definitionResizePermissionNodeUpdates");
    expect(source).not.toContain("node.params[ALLOW_RESIZE_TRANSFORM_PARAM] === value");
    expect(source).not.toContain("patchGraphNodes(definitionResizePermissionNodeUpdates);");
    expect(source).not.toContain("resizePermissionNodeUpdates");
    expect(source).not.toContain("node.params[ALLOW_RESIZE_TRANSFORM_PARAM] === customDeviceDraft.allowResizeTransform");
    expect(definitionSaveBlock).not.toContain("const resizeDefinitionValue = params[ALLOW_RESIZE_TRANSFORM_PARAM];");
    expect(definitionSaveBlock).not.toContain("resizeDefinitionNodeUpdates");
    expect(selectedModelParamBlock).toContain("key !== ALLOW_RESIZE_TRANSFORM_PARAM");
    expect(renderBlock).toContain("const scaleHandleConfigsForNode = nodeKindAllowsResizeTransform(node.kind)");
    expect(renderBlock).toContain(": SCALE_HANDLE_CONFIGS.filter((handle) => handle.kind === \"scale-both\");");
    expect(renderBlock).toContain("{scaleHandleConfigsForNode.map((handle) => {");
    expect(singleTransformBlock).toContain("if (kind !== \"rotate\" && kind !== \"scale-both\" && !nodeKindAllowsResizeTransform(node.kind))");
  });

  test("keeps scale handles under the cursor by deferring canvas expansion until transform release", async () => {
    const source = await readAppSource();
    const pointerStart = source.indexOf("if (transformDrag && svgRef.current)");
    const pointerEnd = source.indexOf("if (!draggingRef.current || !svgRef.current)", pointerStart);
    const pointerBlock = source.slice(pointerStart, pointerEnd);
    const finishStart = source.indexOf("const finishTransformDrag");
    const finishEnd = source.indexOf("const finishKeyboardMove", finishStart);
    const finishBlock = source.slice(finishStart, finishEnd);

    expect(pointerBlock).toContain("if (isGroupTransformDrag(transformDrag))");
    expect(pointerBlock).toContain("patchGraphNodes([nextNode, ...routableLinePreviewNodeUpdates]);");
    expect(pointerBlock).not.toContain("applyCanvasBounds(transformBounds);");
    expect(pointerBlock).not.toContain("clampNodePositionToBounds(nextNode, transformBounds");
    expect(finishBlock).toContain("applyCanvasBounds(transformBounds);");
    expect(finishBlock).toContain("const currentSingleNode = currentStore.nodeMap.get(activeTransform.nodeId);");
    expect(finishBlock).toContain("[currentSingleNode]");
    expect(finishBlock).toContain("clampNodePositionToBounds(currentNode, transformBounds");
    expect(finishBlock).toContain("rebuildEdgeUpdatesAfterNodeGeometryChange(finalNextNodes, transformedNodeIds, current.edges)");
  });

  test("previews mouse rotation continuously and snaps to right angles only on release", async () => {
    const source = await readAppSource();
    const styles = await readStyles();
    const helperStart = source.indexOf("function rotationDeltaFromTransformPoint");
    const helperEnd = source.indexOf("function localScaleKindForScreenHandle", helperStart);
    const helperBlock = source.slice(helperStart, helperEnd);
    const snapStart = source.indexOf("function snapRotationDeltaToRightAngle");
    const snapEnd = source.indexOf("function rotationDeltaFromTransformPoint", snapStart);
    const snapBlock = source.slice(snapStart, snapEnd);
    const pointerStart = source.indexOf("if (transformDrag && svgRef.current)");
    const pointerEnd = source.indexOf("if (!draggingRef.current || !svgRef.current)", pointerStart);
    const pointerBlock = source.slice(pointerStart, pointerEnd);
    const finishStart = source.indexOf("const finishTransformDrag");
    const finishEnd = source.indexOf("const finishKeyboardMove", finishStart);
    const finishBlock = source.slice(finishStart, finishEnd);
    const renderStart = source.indexOf("{detailedViewportNodes.map((node) =>");
    const renderEnd = source.indexOf("{renderMultiNodeDragOverlay()}", renderStart);
    const renderBlock = source.slice(renderStart, renderEnd);
    const trajectoryStart = source.indexOf("const renderTransformRotationTrajectory = () =>");
    const trajectoryEnd = source.indexOf("const renderBoundaryBusInternalConnector", trajectoryStart);
    const trajectoryBlock = source.slice(trajectoryStart, trajectoryEnd);

    expect(source).toContain("function rotationDeltaFromTransformPoint");
    expect(source).toContain("function rotationDeltaBetweenTransformPoints");
    expect(source).toContain("function transformPointAngle");
    expect(source).toContain("function snapRotationDeltaToRightAngle");
    expect(source).toContain("Math.atan2(point.y - center.y, point.x - center.x)");
    expect(source).toContain("function normalizedRotationDelta");
    expect(source).toContain("return ((delta + 180) % 360 + 360) % 360 - 180;");
    expect(snapBlock).toContain("Math.round(delta / 90) * 90");
    expect(source).toContain("function rotationTrajectoryArcPath");
    expect(source).toContain("function rotationTrajectoryArcPath(center: Point, startPoint: Point, degrees: number)");
    expect(source).not.toContain("const start = { x: center.x, y: center.y - safeRadius };");
    expect(source).toContain("rotationStartPoint?: Point;");
    expect(source).toContain("rotationStartPoint: kind === \"rotate\" ? { x: center.x, y: unit.bounds.top - TRANSFORM_ROTATE_HANDLE_GAP } : undefined");
    expect(source).toContain("rotationStartPoint: kind === \"rotate\"");
    expect(source).toContain("? { x: node.position.x + rotateHandleStart.x, y: node.position.y + rotateHandleStart.y }");
    expect(source).toContain("const singleTransformNodeUpdate");
    expect(source).toContain("rotationDeltaBetweenTransformPoints(baseNode.position, drag.startPoint, point, snapRotation)");
    expect(source).toContain("rotationDeltaBetweenTransformPoints(drag.center, drag.startPoint, point, Boolean(options?.snapRotation))");
    expect(pointerBlock).toContain("rotationDeltaBetweenTransformPoints(baseNode.position, transformDrag.startPoint, point, false)");
    expect(pointerBlock).toContain("previewPoint: point");
    expect(pointerBlock).not.toContain("Math.round(angle / 90)");
    expect(pointerBlock).not.toContain("const snapped =");
    expect(finishBlock).toContain("activeTransform.kind === \"rotate\" && activeTransform.previewPoint");
    expect(finishBlock).toContain("singleTransformNodeUpdate(activeTransform, activeTransform.previewPoint, current, true)");
    expect(finishBlock).toContain("nodeUpdates: [currentSingleNodeUpdate]");
    expect(renderBlock).toContain("{renderSingleTransformRotateOriginGhost()}");
    expect(renderBlock).toContain("{renderTransformRotationTrajectory()}");
    expect(trajectoryBlock).toContain("const delta = rotationDeltaBetweenTransformPoints(center, transformDrag.startPoint, transformDrag.previewPoint, false);");
    expect(trajectoryBlock).toContain("const startPoint = transformDrag.rotationStartPoint ?? transformDrag.startPoint;");
    expect(trajectoryBlock).toContain("const arcPath = rotationTrajectoryArcPath(center, startPoint, delta);");
    expect(trajectoryBlock).not.toContain("const startPoint = { x: center.x, y: center.y - radius };");
    expect(source).toContain("function nodeRotateHandleControlPoints");
    expect(source).toContain("const { halfHeight } = nodeScaledLocalHalfExtents(node);");
    expect(source).toContain("stemStart: rotatePointAround({ x: 0, y: -halfHeight - rotateStemStart }, origin, node.rotation)");
    expect(source).toContain("handle: rotatePointAround({ x: 0, y: -halfHeight - rotateHandleGap }, origin, node.rotation)");
    expect(source).toContain("rotateControlAvoidRectFromCanvasPoints(selectedNodeRotateHandlePoints)");
    expect(renderBlock).toContain("const rotateHandlePoints = uprightStaticSelectionOutline");
    expect(renderBlock).toContain("? nodeUprightRotateHandleControlPoints(node, rotateStemStart, rotateStemEnd, rotateHandleGap)");
    expect(renderBlock).toContain(": nodeRotateHandleControlPoints(node, rotateStemStart, rotateStemEnd, rotateHandleGap);");
    expect(renderBlock).toContain("x1={rotateHandlePoints.stemStart.x}");
    expect(renderBlock).toContain("transform={handleTransform(rotateHandlePoints.handle.x, rotateHandlePoints.handle.y)}");
    expect(source).not.toContain("rotationDeltaFromTransformPoint(drag.center, point, Boolean(options?.snapRotation))");
    expect(styles).toContain(".node-rotate-origin-ghost");
    expect(styles).toContain(".rotation-trajectory");
    expect(source).not.toContain("rotation-angle-badge");
    expect(source).not.toContain("动态 ${formatStatusNumber");
    expect(source).not.toContain("落点 ${formatStatusNumber");
    expect(styles).not.toContain(".rotation-angle-badge");
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
    const commitStart = source.indexOf("const commitFastMovedGraphPatches");
    const commitEnd = source.indexOf("const clampPointToCanvas", commitStart);
    const commitBlock = source.slice(commitStart, commitEnd);
    const finishStart = source.indexOf("const finishNodeDrag = () =>");
    const finishEnd = source.indexOf("const moveSelection", finishStart);
    const finishBlock = source.slice(finishStart, finishEnd);

    expect(source).toContain("rebuildSingleConnectionRoute");
    expect(helperStart).toBeGreaterThan(-1);
    expect(helperBlock).toContain("affectedEdgeIds.length !== 1");
    expect(helperBlock).toContain("routingNodesForConnectionEdge(affectedEdge, nextNodes)");
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
    expect(scheduleBlock).toContain("!shouldRunDeferredMoveOptimization(latestOptimizationEdges, movedNodeIds, selectedEdgeIds, blockedEdgeIds)");
    expect(scheduleBlock).toContain("deferredMoveOptimizationCancelRef.current = null");
    expect(scheduleBlock).toContain("scheduleIdleWork");
    expect(scheduleBlock).toContain("graphStorePatchStillCurrent");
    expect(commitBlock).toContain("const routeRepairCandidateEdges = wholeLayerMove");
    expect(commitBlock).toContain(": localRouteOptimizationCandidateEdges(");
    expect(commitBlock).toContain("!wholeLayerMove &&\n      shouldDeferSingleNodeTerminalReconciliation(");
    expect(commitBlock).toContain("movedNodeIds.length > 0 &&\n      (deferredRepairCandidateEdges.length > 0 || deferSingleNodeTerminalReconciliation)");
    expect(commitBlock).toContain("scheduleDeferredMovedConnectionRepair(");
    expect(commitBlock).toContain("previousNodes");
    expect(commitBlock).toContain("originalPositions");
    expect(commitBlock).toContain("originalRoutePoints");
    expect(commitBlock).toContain("reconcileTerminalConnections: deferSingleNodeTerminalReconciliation");
    expect(finishBlock).toContain("finalizeMovedNodeEdgesFast");
    expect(finishBlock).toContain("commitFastMovedGraphPatches");
    expect(finishBlock).not.toContain("routePointsForMovedNodeBlockers");
  });

  test("keeps routing inputs stable for parameter-only updates while deferred routes are stale after a graph edit", async () => {
    const source = await readAppSource();
    const routingStart = source.indexOf("const routeInputLayerSignature = useMemo");
    const routingEnd = source.indexOf("const routedEdges = useMemo", routingStart);
    const routingBlock = source.slice(routingStart, routingEnd);

    expect(source).toContain("routeGeometryRevision");
    expect(routingBlock).toContain("cachedRouteInputRef.current");
    expect(routingBlock).toContain("cachedRouteInput.routeGeometryRevision === graphStore.routeGeometryRevision");
    expect(routingBlock).toContain("cachedRouteInput.layerSignature === routeInputLayerSignature");
    expect(routingBlock).toContain("const routingNodes = routeInput.nodes;");
    expect(routingBlock).toContain("const routingEdges = routeInput.edges;");
    expect(routingBlock).not.toContain("const deferredRoutingNodes = useDeferredValue(routeInput.nodes);");
    expect(routingBlock).not.toContain("const deferredRoutingEdges = useDeferredValue(routeInput.edges);");
  });

  test("uses stored connection geometry on open and only enables full routing after edits", async () => {
    const source = await readAppSource();
    const routingStart = source.indexOf("const routeInputLayerSignature = useMemo");
    const routingEnd = source.indexOf("const routedEdgeById", routingStart);
    const routingBlock = source.slice(routingStart, routingEnd);

    expect(source).toContain("routeRenderingReady");
    expect(source).toContain("setRouteRenderingReady(true)");
    expect(source).toContain("routeEdgesForSavedPathRendering");
    expect(source).toContain("routeEdgesForStoredRendering");
    expect(source).toContain("routeEdgesForCachedStoredRendering");
    expect(source).toContain("setRouteRenderingReady(false)");
    expect(routingBlock).toContain("routeRenderingEnabled");
    expect(routingBlock).toContain("pendingStoredRouteEdgeIdsRef.current");
    expect(routingBlock).toContain("routeEdgesForCachedStoredRendering");
    expect(routingBlock).toContain("routeEdgesForIncrementalRendering");
    expect(routingBlock).toContain("cachedRoutedEdgesRef.current");
    expect(routingBlock).toContain("savedRouteCrossingArcsReady");
    expect(routingBlock).toContain("routes: routeEdgesForSavedPathRendering(routingNodes, routingEdges, canvasBounds, { refreshCrossingArcs: savedRouteCrossingArcsReady })");
    expect(routingBlock).not.toContain("routeEdgesForRendering(routingNodes, routingEdges");
  });

  test("keeps graph tree and saved-route crossing arcs off the startup render path", async () => {
    const source = await readAppSource();
    const routingStart = source.indexOf("const routeInputLayerSignature = useMemo");
    const routingEnd = source.indexOf("const routedEdgeById", routingStart);
    const routingBlock = source.slice(routingStart, routingEnd);
    const savedArcEffectStart = source.indexOf("useEffect(() => {\n    if (isBrowseMode || routeRenderingReady || savedRouteCrossingArcsReady");
    const savedArcEffectEnd = source.indexOf("const routeRenderingEnabled = routeRenderingReady", savedArcEffectStart);
    const savedArcEffectBlock = source.slice(savedArcEffectStart, savedArcEffectEnd);

    expect(source).toContain("const [inspectorTab, setInspectorTab] = useState<\"model\" | \"tree\" | \"graph\" | \"device\">(\"graph\");");
    expect(source).toContain("const [savedRouteCrossingArcsReady, setSavedRouteCrossingArcsReady] = useState(false);");
    expect(savedArcEffectBlock).toContain("scheduleIdleWork");
    expect(savedArcEffectBlock).toContain("setSavedRouteCrossingArcsReady(true)");
    expect(savedArcEffectBlock).toContain("isBrowseMode");
    expect(savedArcEffectBlock).toContain("routingEdges.length === 0");
    expect(source).toContain("const renderViewportRoutedEdges = useMemo");
    expect(source).toContain("return refreshCrossingArcPaths(viewportRoutedEdges);");
    expect(routingBlock).toContain("routeEdgesForSavedPathRendering(routingNodes, routingEdges, canvasBounds, { refreshCrossingArcs: savedRouteCrossingArcsReady })");
    expect(routingBlock).not.toContain("routeEdgesForSavedPathRendering(routingNodes, routingEdges, canvasBounds)");
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
    expect(exportBlock).toContain("const exportNodes = orderNodesByModelLayer(nodes, normalizedLayers);");
    expect(exportBlock).toContain("routeEdgesForStoredRendering(exportNodes, edges, canvasSize)");
    expect(source).toContain("function exportDeviceMetadataAttributes");
    expect(source).toContain('data-export-device-idx="${escapeXml(node.params.idx ?? "")}"');
    expect(source).toContain('data-export-device-name="${escapeXml(node.name)}"');
    expect(source).toContain("const measurementMarkup = measurements.groups");
    expect(source).toContain("buildExportMeasurementGroupMarkup(node, group, measurementConfig, usedSvgIds)");
    expect(exportBlock).not.toContain("routeEdgesForRendering");
    expect(sizeBlock).toContain("routeEdgesForStoredRendering(nodes, edges");
    expect(sizeBlock).not.toContain("routeEdgesForRendering");
  });

  test("exports SVG devices as defs symbols with explicit use dimensions", async () => {
    const source = await readAppSource();
    const serverSource = await readServerSource();
    const exportStart = source.indexOf("export function buildSvgDocument");
    const exportEnd = source.indexOf("export function App", exportStart);
    const exportBlock = source.slice(exportStart, exportEnd);
    const serverExportStart = serverSource.indexOf("function buildSvgFile");
    const serverExportEnd = serverSource.indexOf("async function listSchemeStoreEntries", serverExportStart);
    const serverExportBlock = serverSource.slice(serverExportStart, serverExportEnd);

    expect(exportBlock).toContain("const nodeSymbolMarkup: string[] = [];");
    expect(exportBlock).toContain('<symbol id="${escapeXml(symbolId)}" viewBox="');
    expect(exportBlock).toContain('<use id="${escapeXml(useId)}" class="export-node${exportButtonClass}" href="#${escapeXml(symbolId)}" xlink:href="#${escapeXml(symbolId)}" x="');
    expect(exportBlock).toContain('width="${formatSvgNumber(node.size.width)}" height="${formatSvgNumber(node.size.height)}"');
    expect(serverExportBlock).toContain("const symbolMarkup = [];");
    expect(serverExportBlock).toContain('<symbol id="${escapeSvgAttribute(symbolId)}" viewBox="');
    expect(serverExportBlock).toContain('<use id="${escapeSvgAttribute(useId)}" class="export-node" href="#${escapeSvgAttribute(symbolId)}" xlink:href="#${escapeSvgAttribute(symbolId)}" x="');
    expect(serverExportBlock).toContain('class="export-node-geometry" transform="${escapeSvgAttribute(geometryTransform)}"');
    expect(serverExportBlock).toContain("buildServerSvgNodeLabelMarkup(node)");
    expect(serverExportBlock).toContain("buildServerSvgMeasurementGroupMarkup(node, group, measurementConfig, usedIds)");
    expect(serverSource).toContain('data-export-measurement-source-point="${escapeSvgAttribute(row.item?.sourcePoint ?? "")}"');
    expect(source).toContain('idx="${escapeXml(node.params.idx ?? "")}"');
    expect(source).toContain('name="${escapeXml(node.name)}"');
    expect(source).toContain('class="export-measurement-value measurement-value"');
    expect(source).toContain('data-export-measurement-text-role="value"');
    expect(source).toContain('data-export-measurement-value="1"');
    expect(serverSource).toContain('class="export-measurement-value measurement-value"');
    expect(serverSource).toContain('data-export-measurement-text-role="value"');
    expect(serverSource).toContain('data-export-measurement-value="1"');
  });

  test("resizes the canvas from its edges and expands it for moved or pasted graphics", async () => {
    const source = await readAppSource();
    const styles = await readStyles();
    const pasteStart = source.indexOf("const pasteSelection =");
    const pasteEnd = source.indexOf("const finishMarqueeSelection", pasteStart);
    const pasteBlock = source.slice(pasteStart, pasteEnd);
    const moveStart = source.indexOf("const moveSelection =");
    const moveEnd = source.indexOf("const updateSelectedNode", moveStart);
    const moveBlock = source.slice(moveStart, moveEnd);
    const updateStart = source.indexOf("const updateSelectedNode");
    const updateEnd = source.indexOf("const assignSelectedNodesToModelLayer", updateStart);
    const updateBlock = source.slice(updateStart, updateEnd);
    const dropStart = source.indexOf("const handleDrop =");
    const dropEnd = source.indexOf("const handleNodePointerDown", dropStart);
    const dropBlock = source.slice(dropStart, dropEnd);
    const placeStart = source.indexOf("const placeLibraryDeviceAtPoint =");
    const placeEnd = source.indexOf("const commitLibraryPlacementAtPoint", placeStart);
    const placeBlock = source.slice(placeStart, placeEnd);

    expect(source).toContain("type CanvasResizeEdge");
    expect(source).toContain("const [canvasResizeDrag, setCanvasResizeDrag]");
    expect(source).toContain("const startCanvasResize");
    expect(source).toContain("minimumCanvasBoundsForContent");
    expect(source).toContain("canvas-resize-handle-right");
    expect(source).toContain("canvas-resize-handle-left");
    expect(source).toContain("canvas-resize-handle-top");
    expect(source).toContain("canvas-resize-handle-top-left");
    expect(source).toContain("canvas-resize-handle-top-right");
    expect(source).toContain("canvas-resize-handle-bottom-left");
    expect(styles).toContain(".canvas-resize-handle-right");
    expect(styles).toContain(".canvas-resize-handle-left");
    expect(styles).toContain(".canvas-resize-handle-top");
    expect(styles).toContain(".canvas-resize-handle-top-left");
    expect(styles).toContain(".canvas-resize-handle-top-right");
    expect(styles).toContain(".canvas-resize-handle-bottom-left");
    expect(styles).toContain(".canvas-resize-handle-corner");
    expect(pasteBlock).toContain("pastedCanvasBounds");
    expect(pasteBlock).toContain("applyCanvasBounds(pastedCanvasBounds, pasteOriginShift)");
    expect(pasteBlock).not.toContain("粘贴位置超过显示边界");
    expect(moveBlock).toContain("canvasBoundsForMoveDelta");
    expect(moveBlock).toContain("commitFastMovedGraphPatches(");
    expect(updateBlock).toContain("selectedNodeCanvasBounds");
    expect(updateBlock).toContain("applyCanvasBounds(selectedNodeCanvasBounds)");
    expect(dropBlock).toContain("placeLibraryDeviceAtPoint(template");
    expect(placeBlock).toContain("dropCanvasBounds");
    expect(placeBlock).toContain("applyCanvasBounds(dropCanvasBounds, dropOriginShift)");
  });

  test("keeps canvas edge resizing anchored instead of recentering or changing zoom scale", async () => {
    const source = await readAppSource();
    const styles = await readStyles();
    const resizeStart = source.indexOf("useEffect(() => {\n    if (!canvasResizeDrag)");
    const resizeEnd = source.indexOf("useEffect(() => {\n    if (!statusbarResize)", resizeStart);
    const resizeBlock = source.slice(resizeStart, resizeEnd);
    const centerStart = source.indexOf("const requestCanvasFrameCenter = () =>");
    const centerEnd = source.indexOf("useEffect(() => {\n    if (!projectPanelResize)", centerStart);
    const centerBlock = source.slice(centerStart, centerEnd);
    const applyStart = source.indexOf("const applyCanvasBounds =");
    const applyEnd = source.indexOf("const expandCanvasToFitGraph", applyStart);
    const applyBlock = source.slice(applyStart, applyEnd);
    const startResizeStart = source.indexOf("const startCanvasResize =");
    const startResizeEnd = source.indexOf("const startStatusbarResize", startResizeStart);
    const startResizeBlock = source.slice(startResizeStart, startResizeEnd);
    const scrollSurfaceStart = source.indexOf("className=\"canvas-scroll-surface\"");
    const scrollSurfaceEnd = source.indexOf("<svg", scrollSurfaceStart);
    const scrollSurfaceBlock = source.slice(scrollSurfaceStart, scrollSurfaceEnd);
    const edgeTriggerStart = source.indexOf("const renderSidePanelEdgeTrigger =");
    const edgeTriggerEnd = source.indexOf("const normalizeScale", edgeTriggerStart);
    const edgeTriggerBlock = source.slice(edgeTriggerStart, edgeTriggerEnd);
    const resizeMoveStart = resizeBlock.indexOf("const handlePointerMove");
    const resizeMoveEnd = resizeBlock.indexOf("const handlePointerUp", resizeMoveStart);
    const resizeMoveBlock = resizeBlock.slice(resizeMoveStart, resizeMoveEnd);

    expect(centerBlock).toContain("}, [canvasCenterRequest]);");
    expect(centerBlock).not.toContain("}, [canvasCenterRequest, canvasHeight, canvasWidth]);");
    expect(startResizeBlock).toContain("const currentCanvasBounds = canvasBoundsRef.current;");
    expect(startResizeBlock).toContain("unitsPerCssX: svgRect.width > 0 ? currentCanvasBounds.width / svgRect.width : 1");
    expect(startResizeBlock).toContain("unitsPerCssY: svgRect.height > 0 ? currentCanvasBounds.height / svgRect.height : 1");
    expect(startResizeBlock).toContain("const startCanvasResizeFromRightOverlay = (event: PointerEvent<Element>) =>");
    expect(startResizeBlock).toContain("const startCanvasResizeFromLeftOverlay = (event: PointerEvent<Element>) =>");
    expect(startResizeBlock).toContain("const startCanvasResizeFromTopOverlay = (event: PointerEvent<Element>) =>");
    expect(startResizeBlock).toContain("const startCanvasResizeFromBottomOverlay = (event: PointerEvent<Element>) =>");
    expect(startResizeBlock).toContain("Math.abs(event.clientX - svgRect.right) <= rightEdgeHotspot");
    expect(startResizeBlock).toContain("startCanvasResize(event, \"right\");");
    expect(startResizeBlock).toContain("Math.abs(event.clientX - svgRect.left) <= leftEdgeHotspot");
    expect(startResizeBlock).toContain("startCanvasResize(event, \"left\");");
    expect(startResizeBlock).toContain("Math.abs(event.clientY - svgRect.top) <= topEdgeHotspot");
    expect(startResizeBlock).toContain("startCanvasResize(event, \"top\");");
    expect(startResizeBlock).toContain("Math.abs(event.clientY - svgRect.bottom) <= bottomEdgeHotspot");
    expect(startResizeBlock).toContain("startCanvasResize(event, \"bottom\");");
    expect(scrollSurfaceBlock).toContain("if (startCanvasResizeFromTopOverlay(event))");
    expect(scrollSurfaceBlock).toContain("if (startCanvasResizeFromLeftOverlay(event))");
    expect(scrollSurfaceBlock).toContain("if (startCanvasResizeFromRightOverlay(event))");
    expect(scrollSurfaceBlock).toContain("if (startCanvasResizeFromBottomOverlay(event))");
    expect(scrollSurfaceBlock.indexOf("startCanvasResizeFromBottomOverlay(event)")).toBeLessThan(
      scrollSurfaceBlock.indexOf("startCanvasPanning(event);")
    );
    expect(edgeTriggerBlock).toContain("onPointerDown={(event) => {");
    expect(edgeTriggerBlock).toContain("side === \"left\" && startCanvasResizeFromLeftOverlay(event)");
    expect(edgeTriggerBlock).toContain("side === \"right\" && startCanvasResizeFromRightOverlay(event)");
    expect(source).toContain("const canvasRenderBounds = canvasBounds;");
    expect(source).toContain("const canvasRenderViewBox = viewBox;");
    expect(source).toContain("const canvasResizePreviewRect = canvasResizeDrag && canvasResizeDraft");
    expect(source).toContain("canvasResizePreviewRectForDraft(canvasResizeDrag, canvasResizeDraft)");
    expect(source).toContain("export function canvasRenderViewBoxAfterBoundsDraft(");
    expect(source).toContain("const canvasScrollScale = canvasScrollScaleFromViewBox(canvasRenderViewBox, canvasRenderBounds);");
    expect(source).toContain("const canvasDisplayWidth = Math.max(1, Math.round(canvasRenderBounds.width * canvasScrollScale.x));");
    expect(source).toContain("const canvasDisplayHeight = Math.max(1, Math.round(canvasRenderBounds.height * canvasScrollScale.y));");
    expect(source).toContain("function canvasResizeAnchoredDisplayOffset(");
    expect(source).toContain("startDisplayOffsetX: canvasDisplayOffsetX");
    expect(source).toContain("startDisplayOffsetY: canvasDisplayOffsetY");
    expect(source).toContain("startScrollTop: canvasFrameRef.current?.scrollTop ?? 0");
    expect(source).toContain("startScrollSurfaceHeight: canvasScrollSurfaceHeight");
    expect(source).toContain("startVerticalScrollbarsActive: canvasVerticalScrollbarsActive");
    expect(source).toContain("const canvasDisplayOffsetX = canvasResizeAnchoredDisplayOffset(");
    expect(source).toContain("const canvasDisplayOffsetY = canvasResizeAnchoredDisplayOffset(");
    expect(source).toContain("const canvasResizeKeepsVerticalScrollRange = canvasResizeKeepsScrollRange(canvasResizeDrag, \"y\");");
    expect(source).toContain("Math.max(computedCanvasScrollSurfaceHeight, canvasResizeDrag.startScrollSurfaceHeight)");
    expect(source).toContain("const canvasNoScrollOffsetForCanvasResizeAnchor = (drag: NonNullable<CanvasResizeState>, nextBounds: CanvasBounds): Point =>");
    expect(source).toContain("const nextViewBox = canvasRenderViewBoxAfterBoundsDraft(currentViewBox, currentBounds, nextBounds);");
    expect(source).toContain("const desiredLeft = canvasResizeEdgeAnchorsStart(drag.edge, \"x\")");
    expect(source).toContain("const desiredTop = canvasResizeEdgeAnchorsStart(drag.edge, \"y\")");
    expect(source).toContain("function canvasResizeOriginShiftForBounds(edge: CanvasResizeEdge, startBounds: CanvasBounds, nextBounds: CanvasBounds): Point");
    expect(resizeBlock).toContain("const resizeOriginShift = canvasResizeOriginShiftForBounds(");
    expect(resizeBlock).toContain("nodes.map((node) => translateNodeBy(node, originShift))");
    expect(resizeBlock).toContain("edges.map((edge) => translateEdgeBy(edge, originShift))");
    expect(resizeBlock).toContain("shiftCachedRoutesForCanvasOrigin(originShift);");
    expect(source).toContain("const nextCanvasNoScrollOffset = canvasNoScrollOffsetForCanvasResizeAnchor(canvasResizeDrag, draftBounds);");
    expect(source).toContain("setCanvasNoScrollOffset((current) =>");
    expect(source).toContain("viewBox={`0 0 ${canvasRenderBounds.width} ${canvasRenderBounds.height}`}");
    expect(source).toContain("<rect className=\"canvas-boundary\" x=\"0\" y=\"0\" width={canvasRenderBounds.width} height={canvasRenderBounds.height} />");
    expect(source).toContain("x={canvasRenderBounds.width - CANVAS_RESIZE_HANDLE_SIZE / 2}");
    expect(source).toContain("y={canvasRenderBounds.height - CANVAS_RESIZE_HANDLE_SIZE / 2}");
    expect(source).toContain("className=\"canvas-resize-preview\"");
    expect(source).toContain("const canvasResizeHotzoneWidth = Math.round(clampNumber(CANVAS_RESIZE_HANDLE_SIZE * canvasScrollScale.x, 10, 28));");
    expect(source).toContain("const canvasResizeHotzoneHeight = Math.round(clampNumber(CANVAS_RESIZE_HANDLE_SIZE * canvasScrollScale.y, 10, 28));");
    expect(source).toContain("const canvasResizeHotzoneStyle = {");
    expect(source).toContain("\"--canvas-resize-hotzone-x\": `${canvasResizeHotzoneWidth}px`");
    expect(source).toContain("\"--canvas-resize-hotzone-y\": `${canvasResizeHotzoneHeight}px`");
    expect(source).toContain("<div className=\"canvas-resize-hotzones\" style={canvasResizeHotzoneStyle} aria-hidden=\"true\">");
    expect(source).toContain("className=\"canvas-resize-hotzone canvas-resize-hotzone-left\"");
    expect(source).toContain("className=\"canvas-resize-hotzone canvas-resize-hotzone-top\"");
    expect(source).toContain("className=\"canvas-resize-hotzone canvas-resize-hotzone-right\"");
    expect(source).toContain("className=\"canvas-resize-hotzone canvas-resize-hotzone-bottom\"");
    expect(source).toContain("className=\"canvas-resize-hotzone canvas-resize-hotzone-top-left\"");
    expect(source).toContain("className=\"canvas-resize-hotzone canvas-resize-hotzone-top-right\"");
    expect(source).toContain("className=\"canvas-resize-hotzone canvas-resize-hotzone-bottom-left\"");
    expect(source).toContain("className=\"canvas-resize-hotzone canvas-resize-hotzone-bottom-right\"");
    expect(styles).toContain(".canvas-resize-hotzones");
    expect(styles).toContain("z-index: 46;");
    expect(styles).toContain("pointer-events: none;");
    expect(styles).toContain(".canvas-resize-hotzone");
    expect(styles).toContain("pointer-events: all;");
    expect(source).toContain("onPointerDown={(event) => startCanvasResize(event, \"top-right\")}");
    expect(source).toContain("onPointerDown={(event) => startCanvasResize(event, \"bottom-left\")}");
    expect(source).toContain("const clearCanvasBoundsScrollSyncPending = () => {");
    expect(startResizeBlock).toContain("clearCanvasBoundsScrollSyncPending();");
    expect(startResizeBlock).toContain("pendingCanvasResizeCommitAnchorRef.current = null;");
    expect(resizeBlock).toContain("applyCanvasBounds(draftBounds, originShift, { preserveScrollAnchor: false });");
    expect(applyBlock).toContain("const currentBoundsForApply = canvasBoundsRef.current;");
    expect(applyBlock).toContain("if (!canvasBoundsChangeIsMeaningful(currentBoundsForApply, nextBounds, originShift))");
    expect(applyBlock).toContain("canvasBoundsRef.current = nextBounds;");
    expect(applyBlock).toContain("return viewBoxAfterCanvasBoundsChange(current, nextBounds, originShift, currentBoundsForApply);");
    expect(source).not.toContain("function scaledViewBoxSizeForBounds(");
    expect(applyBlock).not.toContain("scaledViewBoxSizeForBounds(current, canvasBounds, nextBounds)");
    expect(applyBlock).not.toContain("clampViewBoxDimensionsForZoom(nextViewBoxSize, nextBounds)");
    expect(source).toContain("import { createPortal, flushSync } from \"react-dom\";");
    expect(resizeMoveBlock).toContain("flushSync(() => setCanvasResizeDraft(clampedBounds));");
    expect(resizeMoveBlock).not.toContain("setCanvasFrameScrollPosition");
    expect(resizeMoveBlock).not.toContain("canvasResizeDrag.startScrollTop");
    expect(resizeMoveBlock).not.toContain("requestAnimationFrame");
    expect(resizeMoveBlock).not.toContain("commitCanvasResizeBounds");
    expect(resizeBlock).not.toContain("const flushCanvasResizeDraft");
    expect(resizeBlock).not.toContain("applyCanvasBounds(clampedBounds);");
  });

  test("keeps canvas control-point resizing single-sided after inspector width or height edits", async () => {
    const source = await readAppSource();
    const updateStart = source.indexOf("const updateCanvasSize =");
    const updateEnd = source.indexOf("const commitCanvasSizeDraft", updateStart);
    const updateBlock = source.slice(updateStart, updateEnd);
    const blurStart = source.indexOf("const handleCanvasSizeBlur =");
    const blurEnd = source.indexOf("const handleCanvasSizeKeyDown", blurStart);
    const blurBlock = source.slice(blurStart, blurEnd);
    const keydownStart = source.indexOf("const handleCanvasSizeKeyDown =");
    const keydownEnd = source.indexOf("const renderStaticDrawingPreview", keydownStart);
    const keydownBlock = source.slice(keydownStart, keydownEnd);
    const startResizeStart = source.indexOf("const startCanvasResize =");
    const startResizeEnd = source.indexOf("const startCanvasResizeFromRightOverlay", startResizeStart);
    const startResizeBlock = source.slice(startResizeStart, startResizeEnd);

    expect(updateBlock).toContain("const currentBounds = canvasBoundsRef.current;");
    expect(updateBlock).toContain("const nextBounds = { width, height };");
    expect(updateBlock).toContain("applyCanvasBounds(nextBounds);");
    expect(updateBlock).not.toContain("setCanvasWidth(width);");
    expect(updateBlock).not.toContain("setCanvasHeight(height);");
    expect(blurBlock).toContain("flushSync(() => commitCanvasSizeDraft());");
    expect(keydownBlock).toContain("flushSync(() => commitCanvasSizeDraft());");
    expect(startResizeBlock).toContain("const currentCanvasBounds = canvasBoundsRef.current;");
    expect(startResizeBlock).toContain("startWidth: currentCanvasBounds.width");
    expect(startResizeBlock).toContain("startHeight: currentCanvasBounds.height");
    expect(startResizeBlock).toContain("unitsPerCssX: svgRect.width > 0 ? currentCanvasBounds.width / svgRect.width : 1");
    expect(startResizeBlock).toContain("unitsPerCssY: svgRect.height > 0 ? currentCanvasBounds.height / svgRect.height : 1");
  });

  test("keeps the actively dragged canvas resize edge in view when scrollbars appear", async () => {
    const source = await readAppSource();
    const resizeStart = source.indexOf("useEffect(() => {\n    if (!canvasResizeDrag)");
    const resizeEnd = source.indexOf("useEffect(() => {\n    if (!statusbarResize)", resizeStart);
    const resizeBlock = source.slice(resizeStart, resizeEnd);
    const resizeMoveStart = resizeBlock.indexOf("const handlePointerMove");
    const resizeMoveEnd = resizeBlock.indexOf("const handlePointerUp", resizeMoveStart);
    const resizeMoveBlock = resizeBlock.slice(resizeMoveStart, resizeMoveEnd);

    expect(source).not.toContain("const syncCanvasFrameScrollToResizeAnchorNow =");
    expect(source).not.toContain("const syncCanvasFrameScrollToResizeAnchor =");
    expect(source).toContain("const canvasResizePreviewRect = canvasResizeDrag && canvasResizeDraft");
    expect(source).toContain("className=\"canvas-resize-preview\"");
    expect(resizeMoveBlock).toContain("canvasResizeDraftRef.current = clampedBounds;");
    expect(resizeMoveBlock).toContain("flushSync(() => setCanvasResizeDraft(clampedBounds));");
    expect(resizeMoveBlock).not.toContain("setCanvasFrameScrollPosition");
    expect(resizeMoveBlock).not.toContain("setViewBox");
    expect(resizeMoveBlock).not.toContain("applyCanvasBounds");
    expect(resizeBlock).toContain("const handlePointerUp = (event: globalThis.PointerEvent) =>");
    expect(resizeBlock).toContain("flushSync(() => {");
    expect(resizeBlock).toContain("setCanvasResizeDrag(null);");
    expect(resizeBlock).toContain("commitCanvasResizeBounds(draftBounds, resizeOriginShift);");
  });

  test("keeps the untouched canvas resize axis from jumping when scrollbar state changes", async () => {
    const source = await readAppSource();
    const offsetStart = source.indexOf("function canvasResizeAnchoredDisplayOffset(");
    const offsetEnd = source.indexOf("function canvasResizeKeepsScrollRange", offsetStart);
    const offsetBlock = source.slice(offsetStart, offsetEnd);
    const keepRangeStart = source.indexOf("function canvasResizeKeepsScrollRange(");
    const keepRangeEnd = source.indexOf("function clampCanvasNoScrollOffset", keepRangeStart);
    const keepRangeBlock = source.slice(keepRangeStart, keepRangeEnd);
    const noScrollStart = source.indexOf("const canvasNoScrollOffsetForCanvasResizeAnchor =");
    const noScrollEnd = source.indexOf("const setCanvasFrameScrollPosition =", noScrollStart);
    const noScrollBlock = source.slice(noScrollStart, noScrollEnd);

    expect(offsetBlock).toContain("if (!drag) {");
    expect(offsetBlock).toContain("return Math.round(axis === \"x\" ? drag.startDisplayOffsetX : drag.startDisplayOffsetY);");
    expect(offsetBlock).not.toContain("canvasResizeEdgeAnchorsAxis(drag.edge, axis)");
    expect(keepRangeBlock).toContain("if (!drag) {");
    expect(keepRangeBlock).toContain("return axis === \"x\" ? drag.startHorizontalScrollbarsActive : drag.startVerticalScrollbarsActive;");
    expect(keepRangeBlock).not.toContain("canvasResizeEdgeAnchorsAxis(drag.edge, axis)");
    expect(noScrollBlock).toContain("const desiredLeft = canvasResizeEdgeAnchorsStart(drag.edge, \"x\")");
    expect(noScrollBlock).toContain("const desiredTop = canvasResizeEdgeAnchorsStart(drag.edge, \"y\")");
    expect(noScrollBlock).toContain("desiredLeft - nextBaseDisplayOffsetX");
    expect(noScrollBlock).toContain("desiredTop - nextBaseDisplayOffsetY");
    expect(noScrollBlock).not.toContain("const currentOffset = canvasNoScrollOffsetRef.current;");
    expect(noScrollBlock).not.toContain("currentOffset.x");
    expect(noScrollBlock).not.toContain("currentOffset.y");
    expect(source).not.toContain("frame.scrollLeft + svgRect.left - frameRect.left - drag.startDisplayOffsetX");
    expect(source).not.toContain("frame.scrollTop + svgRect.top - frameRect.top - drag.startDisplayOffsetY");
  });

  test("uses raw canvas landing points and expands before paste or new-device placement", async () => {
    const source = await readAppSource();
    const refsStart = source.indexOf("const lastCanvasPointerRef");
    const refsEnd = source.indexOf("const projectListPointerInsideRef", refsStart);
    const refsBlock = source.slice(refsStart, refsEnd);
    const pasteStart = source.indexOf("const pasteSelection = () =>");
    const pasteEnd = source.indexOf("const finishMarqueeSelection", pasteStart);
    const pasteBlock = source.slice(pasteStart, pasteEnd);
    const dropStart = source.indexOf("const handleDrop =");
    const dropEnd = source.indexOf("const handleNodePointerDown", dropStart);
    const dropBlock = source.slice(dropStart, dropEnd);
    const placeStart = source.indexOf("const placeLibraryDeviceAtPoint =");
    const placeEnd = source.indexOf("const commitLibraryPlacementAtPoint", placeStart);
    const placeBlock = source.slice(placeStart, placeEnd);
    const pointerMoveStart = source.indexOf("const handlePointerMove = (event: PointerEvent<SVGSVGElement>)");
    const pointerMoveEnd = source.indexOf("const handleWheel", pointerMoveStart);
    const pointerMoveBlock = source.slice(pointerMoveStart, pointerMoveEnd);
    const pointerDownStart = source.indexOf(
      "onPointerDown={(event) => {",
      source.indexOf("className={`diagram-canvas")
    );
    const pointerDownEnd = source.indexOf("onContextMenu={(event) => {", pointerDownStart);
    const pointerDownBlock = source.slice(pointerDownStart, pointerDownEnd);
    const contextMenuStart = source.indexOf("onContextMenu={(event) => {", pointerDownEnd);
    const contextMenuEnd = source.indexOf("<defs>", contextMenuStart);
    const contextMenuBlock = source.slice(contextMenuStart, contextMenuEnd);

    expect(refsBlock).toContain("const lastRawCanvasPointerRef = useRef<Point | null>(null);");
    expect(pointerMoveBlock).toContain("lastRawCanvasPointerRef.current = rawPointer;");
    expect(pointerDownBlock).toContain("const rawPointer = screenToSvgPoint(event.currentTarget, event.clientX, event.clientY);");
    expect(pointerDownBlock).toContain("lastRawCanvasPointerRef.current = rawPointer;");
    expect(contextMenuBlock).toContain("const rawPointer = screenToSvgPoint(event.currentTarget, event.clientX, event.clientY);");
    expect(contextMenuBlock).toContain("lastRawCanvasPointerRef.current = rawPointer;");
    expect(pasteBlock).toContain("const targetPoint = lastRawCanvasPointerRef.current ?? lastCanvasPointerRef.current;");
    expect(pasteBlock).toContain("const pasteOriginShift = leftTopCanvasOriginShiftForContent(");
    expect(pasteBlock).toContain("translateNodeBy(node, pasteOriginShift)");
    expect(pasteBlock).toContain("translateEdgeBy(edge, pasteOriginShift)");
    expect(pasteBlock).toContain("shiftCachedRoutesForCanvasOrigin(pasteOriginShift);");
    expect(pasteBlock).toContain("markBusTerminalSyncDirtyForEdges(pasteSourceEdges, shiftedClonedEdges);");
    expect(pasteBlock.indexOf("applyCanvasBounds(pastedCanvasBounds, pasteOriginShift);")).toBeLessThan(
      pasteBlock.indexOf("shiftCachedRoutesForCanvasOrigin(pasteOriginShift);")
    );
    expect(pasteBlock.indexOf("shiftCachedRoutesForCanvasOrigin(pasteOriginShift);")).toBeLessThan(
      pasteBlock.indexOf("clampNodePositionToBounds(node, pastedCanvasBounds")
    );
    expect(pasteBlock.indexOf("applyCanvasBounds(pastedCanvasBounds, pasteOriginShift);")).toBeLessThan(
      pasteBlock.indexOf("setGraphArrays(nextNodes, nextEdges);")
    );
    expect(dropBlock).toContain("placeLibraryDeviceAtPoint(template");
    expect(placeBlock).toContain("const dropOriginShift = leftTopCanvasOriginShiftForContent([...nodes, rawNode], edges);");
    expect(placeBlock).toContain("translateNodeBy(rawNode, dropOriginShift)");
    expect(placeBlock).toContain("translateEdgeBy(edge, dropOriginShift)");
    expect(placeBlock).toContain("shiftCachedRoutesForCanvasOrigin(dropOriginShift);");
    expect(placeBlock).toContain("markBusTerminalSyncDirtyForEdges(dropSourceEdges);");
    expect(placeBlock.indexOf("applyCanvasBounds(dropCanvasBounds, dropOriginShift);")).toBeLessThan(
      placeBlock.indexOf("shiftCachedRoutesForCanvasOrigin(dropOriginShift);")
    );
    expect(placeBlock.indexOf("shiftCachedRoutesForCanvasOrigin(dropOriginShift);")).toBeLessThan(
      placeBlock.indexOf("clampNodePositionToBounds(node, dropCanvasBounds")
    );
    expect(placeBlock.indexOf("applyCanvasBounds(dropCanvasBounds, dropOriginShift);")).toBeLessThan(
      placeBlock.indexOf("setGraphArrays([...dropSourceNodes, indexed.node], dropSourceEdges);")
    );
  });

  test("exports and imports platform model files with duplicate-name choices", async () => {
    const source = await readAppSource();
    const exportStart = source.indexOf("const exportCurrentModelFile =");
    const exportEnd = source.indexOf("const importModelFile", exportStart);
    const exportBlock = source.slice(exportStart, exportEnd);
    const importStart = source.indexOf("const importModelFile =");
    const importEnd = source.indexOf("const chooseImage", importStart);
    const importBlock = source.slice(importStart, importEnd);
    const topbarStart = source.indexOf("<header className=\"topbar\">");
    const topbarEnd = source.indexOf("</header>", topbarStart);
    const topbarBlock = source.slice(topbarStart, topbarEnd);
    const contextStart = source.indexOf("{contextMenu && (");
    const contextEnd = source.indexOf("{projectMenu && (", contextStart);
    const contextBlock = source.slice(contextStart, contextEnd);
    const projectContextStart = source.indexOf("{projectMenu && (");
    const projectContextEnd = source.indexOf("{pendingModelImportConflict && (", projectContextStart);
    const projectContextBlock = source.slice(projectContextStart, projectContextEnd);
    const modelProjectMenuStart = projectContextBlock.indexOf("{projectMenu.projectId && (");
    const modelProjectMenuEnd = projectContextBlock.indexOf("{!projectMenu.projectId && projectMenu.schemeId && (", modelProjectMenuStart);
    const modelProjectMenuBlock = projectContextBlock.slice(modelProjectMenuStart, modelProjectMenuEnd);
    const schemeMenuStart = modelProjectMenuEnd;
    const schemeMenuEnd = projectContextBlock.indexOf("{!projectMenu.projectId && !projectMenu.schemeId && (", schemeMenuStart);
    const schemeMenuBlock = projectContextBlock.slice(schemeMenuStart, schemeMenuEnd);

    expect(source).toContain("serializeProject");
    expect(source).toContain("deserializeProject");
    expect(source).toContain("const modelImportInputRef = useRef<HTMLInputElement | null>(null)");
    expect(source).toContain("const modelImportTargetSchemeIdRef = useRef<string>(\"\")");
    expect(source).toContain("pendingModelImportConflict");
    expect(source).toContain("resolveDuplicateModelImport");
    expect(source).toContain("const openModelImportFilePicker = (targetSchemeId = \"\")");
    expect(exportBlock).toContain("serializeProject(currentProject())");
    expect(exportBlock).toContain("description: \"平台模型文件\"");
    expect(exportBlock).toContain("extensions: [\".json\"]");
    expect(importBlock).toContain("deserializeProject(text)");
    expect(importBlock).toContain("modelImportTargetSchemeIdRef.current");
    expect(importBlock).toContain("setPendingModelImportConflict");
    expect(importBlock).not.toContain("模型名称重复。请输入 1 覆盖已有模型，2 重命名为新模型，3 不导入。");
    expect(importBlock).not.toContain("duplicateChoice");
    expect(importBlock).toContain("promptUniqueRecordName");
    expect(source).toContain("upsertSavedProjectInScheme(nextSchemes, targetScheme.id, importedRecord)");
    expect(source).toContain("loadSavedProject(importedRecord, targetScheme.id)");
    expect(source).toContain("模型名称重复</h2>");
    expect(source).toContain("请选择导入处理方式");
    expect(source).toContain(">覆盖</button>");
    expect(source).toContain(">重命名</button>");
    expect(source).toContain(">不导入</button>");
    expect(topbarBlock).toContain("onChange={importModelFile}");
    expect(topbarBlock).not.toContain("openModelImportFilePicker()");
    expect(topbarBlock).not.toContain("exportCurrentModelFile");
    expect(topbarBlock).not.toContain("aria-label=\"导入模型文件\"");
    expect(topbarBlock).not.toContain("aria-label=\"导出当前模型文件\"");
    expect(contextBlock).not.toContain("导入模型");
    expect(contextBlock).not.toContain("导出模型");
    expect(projectContextBlock).toContain("exportProjectRecordFile");
    expect(modelProjectMenuBlock).not.toContain("openModelImportFilePicker");
    expect(modelProjectMenuBlock).not.toContain("模型导入");
    expect(schemeMenuBlock).toContain("openModelImportFilePicker(projectMenu.schemeId");
    expect(schemeMenuBlock).toContain("模型导入");
    expect(projectContextBlock).toContain("模型导出");
  });

  test("exports schemes through backend zip archives and keeps imports exports in context menus", async () => {
    const source = await readAppSource();
    const styles = await readStyles();
    const exportStart = source.indexOf("const exportSchemeRecord = async");
    const exportEnd = source.indexOf("const chooseImage", exportStart);
    const exportBlock = source.slice(exportStart, exportEnd);
    const importStart = source.indexOf("const importSchemeFile = async");
    const importEnd = source.indexOf("const commitImportedModelRecord", importStart);
    const importBlock = source.slice(importStart, importEnd);
    const projectContextStart = source.indexOf("{projectMenu && (");
    const projectContextEnd = source.indexOf("{pendingModelImportConflict && (", projectContextStart);
    const projectContextBlock = source.slice(projectContextStart, projectContextEnd);

    expect(source).toContain("downloadBackendSchemeArchive");
    expect(source).toContain("uploadBackendSchemeArchive");
    expect(source).toContain("applyBackendSchemeArchiveImport");
    expect(source).toContain("const schemeImportInputRef = useRef<HTMLInputElement | null>(null)");
    expect(source).toContain("pendingSchemeImportConflict");
    expect(source).toContain("resolveDuplicateSchemeImport");
    expect(source).toContain("const openSchemeImportFilePicker = (parentSchemeId = \"\")");
    expect(source).toContain("const schemeImportParentSchemeIdRef = useRef<string>(\"\")");
    expect(source).toContain("const importSchemeFile = async");
    expect(source).toContain('accept=".zip,application/zip,.json,application/json"');
    expect(exportBlock).toContain("downloadBackendSchemeArchive");
    expect(exportBlock).toContain("schemePathForRecord(scheme)");
    expect(importBlock).toContain('/\\.zip$/iu.test(file.name)');
    expect(importBlock).toContain("uploadBackendSchemeArchive(file, parentPath)");
    expect(importBlock).toContain("applyBackendSchemeArchiveImport(payload, file.name)");
    expect(importBlock).toContain("duplicateScheme");
    expect(importBlock).toContain("setPendingSchemeImportConflict");
    expect(importBlock).not.toContain("promptUniqueRecordName");
    expect(importBlock).not.toContain("uniqueRecordName(importedName");
    expect(source).toContain("mergeImportedSchemeIntoExisting");
    expect(source).toContain("方案名称重复</h2>");
    expect(source).toContain("请选择导入处理方式");
    expect(source).toContain(">合并覆盖</button>");
    expect(source).toContain(">重新命名</button>");
    expect(source).toContain(">不导入</button>");
    expect(source).toContain("请输入导入后的方案名称");
    expect(source).not.toContain("project-panel-actions");
    expect(source).not.toContain("exportSelectedSchemeFromPanel");
    expect(source).not.toContain("openSelectedSchemeModelImport");
    expect(projectContextBlock).toContain("方案导入");
    expect(projectContextBlock).toContain("模型导入");
    expect(projectContextBlock).toContain("void exportSchemeRecord(scheme)");
    expect(projectContextBlock).toContain("方案导出");
    expect(styles).not.toContain(".project-panel-actions");
  });

  test("clips the main svg render list to the current viewport while preserving selected graphics", async () => {
    const source = await readAppSource();
    const routeCullStart = source.indexOf("const viewportRoutedEdges = useMemo");
    const routeCullEnd = source.indexOf("const activeLayerRoutedEdges", routeCullStart);
    const routeCullBlock = source.slice(routeCullStart, routeCullEnd);
    const edgeRenderIndex = source.indexOf("{renderViewportRoutedEdges.map((route) =>");
    const nodeRenderIndex = source.indexOf("{detailedViewportNodes.map((node) =>");

    expect(source).toContain("visibleCanvasViewBoxFromRects");
    expect(source).toContain("initialVisibleCanvasViewBox");
    expect(source).toContain("const [canvasVisibleViewBox, setCanvasVisibleViewBox]");
    expect(source).toContain("frame.addEventListener(\"scroll\", handleCanvasFrameScroll");
    expect(source).toContain("expandViewBoxForRendering(canvasVisibleViewBox)");
    expect(source).toContain("const viewportQueryBounds = useMemo");
    expect(source).toContain("snapRenderViewportBoundsForQuery(renderViewportBounds)");
    expect(source).toContain("const deferredViewportQueryBounds = useDeferredValue(viewportQueryBounds)");
    expect(source).toContain("setCanvasVisibleViewBox(canvasFullViewBoxFromBounds(nextCanvasBounds))");
    expect(source).not.toContain("expandViewBoxForRendering(viewBox)");
    expect(source).toContain("nodeIntersectsRenderViewport");
    expect(routeCullBlock).toContain("if (activeSelectedEdgeSet.size === 0)");
    expect(routeCullBlock).toContain("activeSelectedEdgeSet.has(route.edgeId)");
    expect(routeCullBlock).toContain("queryRouteSpatialIndex(routedEdgeSpatialIndex, deferredViewportQueryBounds)");
    expect(routeCullBlock).toContain("queryNodeSpatialIndex(visibleNodeSpatialIndex, deferredViewportQueryBounds)");
    expect(routeCullBlock).not.toContain("renderedRoutedEdges.filter");
    expect(routeCullBlock).not.toContain("visibleNodes.filter");
    expect(routeCullBlock).toContain("selectedNodeIdSet.forEach(addVisibleNodeId)");
    expect(routeCullBlock).toContain("draggingNodeIdSet.forEach(addVisibleNodeId)");
    expect(edgeRenderIndex).toBeGreaterThan(-1);
    expect(nodeRenderIndex).toBeGreaterThan(-1);
  });

  test("reuses snapped viewport query bounds so pan and zoom do not recalc visible graphics inside the same tile", async () => {
    const source = await readAppSource();
    const refsStart = source.indexOf("const canvasVisibleViewBoxFrameRef");
    const refsEnd = source.indexOf("const nodeDragMovePerfRef", refsStart);
    const refsBlock = source.slice(refsStart, refsEnd);
    const viewportStart = source.indexOf("const renderViewportBounds = useMemo");
    const viewportEnd = source.indexOf("const viewportRoutedEdges = useMemo", viewportStart);
    const viewportBlock = source.slice(viewportStart, viewportEnd);

    expect(source).toContain("const sameRenderViewportBounds = (first: RenderViewportBounds, second: RenderViewportBounds)");
    expect(refsBlock).toContain("const viewportQueryBoundsCacheRef = useRef<RenderViewportBounds | null>(null);");
    expect(viewportBlock).toContain("const nextViewportQueryBounds = snapRenderViewportBoundsForQuery(renderViewportBounds);");
    expect(viewportBlock).toContain("const previousViewportQueryBounds = viewportQueryBoundsCacheRef.current;");
    expect(viewportBlock).toContain("sameRenderViewportBounds(previousViewportQueryBounds, nextViewportQueryBounds)");
    expect(viewportBlock).toContain("return previousViewportQueryBounds;");
    expect(viewportBlock).toContain("viewportQueryBoundsCacheRef.current = nextViewportQueryBounds;");
    expect(viewportBlock).toContain("const deferredViewportQueryBounds = useDeferredValue(viewportQueryBounds);");
  });

  test("caches viewport route and node query results across repeated snapped bounds", async () => {
    const source = await readAppSource();
    const refsStart = source.indexOf("const viewportQueryBoundsCacheRef");
    const refsEnd = source.indexOf("const elementTreeCacheRef", refsStart);
    const refsBlock = source.slice(refsStart, refsEnd);
    const routeCullStart = source.indexOf("const viewportRoutedEdges = useMemo");
    const routeCullEnd = source.indexOf("const activeLayerRoutedEdges", routeCullStart);
    const routeCullBlock = source.slice(routeCullStart, routeCullEnd);

    expect(source).toContain("type ViewportResultCache<T>");
    expect(source).toContain("function viewportBoundsCacheKey(bounds: RenderViewportBounds)");
    expect(source).toContain("function readViewportResultCache<T>(");
    expect(source).toContain("function writeViewportResultCache<T>(");
    expect(refsBlock).toContain("const viewportRoutedEdgesResultCacheRef = useRef<ViewportResultCache<RoutedEdge[]>>");
    expect(refsBlock).toContain("const viewportNodesResultCacheRef = useRef<ViewportResultCache<ModelNode[]>>");
    expect(routeCullBlock).toContain("const viewportQueryCacheKey = viewportBoundsCacheKey(deferredViewportQueryBounds);");
    expect(routeCullBlock).toContain("readViewportResultCache(viewportRoutedEdgesResultCacheRef.current");
    expect(routeCullBlock).toContain("writeViewportResultCache(viewportRoutedEdgesResultCacheRef.current");
    expect(routeCullBlock).toContain("readViewportResultCache(viewportNodesResultCacheRef.current");
    expect(routeCullBlock).toContain("writeViewportResultCache(viewportNodesResultCacheRef.current");
  });

  test("scales the canvas scroll surface with viewport zoom instead of clipping zoomed content", async () => {
    const source = await readAppSource();
    const canvasRenderStart = source.indexOf("className=\"canvas-frame\"");
    const canvasRenderEnd = source.indexOf("onDrop={handleDrop}", canvasRenderStart);
    const canvasRenderBlock = source.slice(canvasRenderStart, canvasRenderEnd);

    expect(source).toContain("function canvasScrollScaleFromViewBox");
    expect(source).toContain("function canvasFullViewBoxFromBounds");
    expect(source).toContain("function canvasFrameHasScrollableRange");
    expect(source).toContain("function renderedCanvasFullyFitsFrame");
    expect(source).toContain("const CANVAS_FRAME_INSET = 16;");
    expect(source).toContain("const CANVAS_SCROLL_EDGE_VIEWPORT_RATIO = 1 / 3;");
    expect(source).toContain("const CANVAS_SCROLLBAR_VISIBILITY_TOLERANCE = 2;");
    expect(source).toContain("function canvasScrollEdgeInset(viewportSize: number)");
    expect(source).toContain("function canvasScrollSurfaceSize(displaySize: number, viewportSize: number, scrollActive: boolean)");
    expect(source).toContain("function canvasDisplayOffset(displaySize: number, surfaceSize: number, viewportSize: number, scrollActive: boolean)");
    expect(source).toContain("function clampCanvasNoScrollOffset(");
    expect(source).toContain("function viewBoxStartToScrollPosition(");
    expect(source).toContain("function scrollPositionToViewBoxStart(");
    expect(source).toContain("const canvasDisplayWidth = Math.max(1, Math.round(canvasRenderBounds.width * canvasScrollScale.x))");
    expect(source).toContain("const canvasDisplayHeight = Math.max(1, Math.round(canvasRenderBounds.height * canvasScrollScale.y))");
    expect(source).toContain("const computedCanvasHorizontalScrollbarsActive =");
    expect(source).toContain("const computedCanvasVerticalScrollbarsActive =");
    expect(source).toContain("const canvasHorizontalScrollbarsActive = computedCanvasHorizontalScrollbarsActive || canvasResizeKeepsHorizontalScrollRange;");
    expect(source).toContain("const canvasVerticalScrollbarsActive = computedCanvasVerticalScrollbarsActive || canvasResizeKeepsVerticalScrollRange;");
    expect(source).toContain("const canvasScrollbarsActive =");
    expect(source).toContain("canvasDisplayWidth + CANVAS_FRAME_INSET * 2 > canvasFrameViewportSize.width + CANVAS_SCROLLBAR_VISIBILITY_TOLERANCE");
    expect(source).toContain("canvasDisplayHeight + CANVAS_FRAME_INSET * 2 > canvasFrameViewportSize.height + CANVAS_SCROLLBAR_VISIBILITY_TOLERANCE");
    expect(source).toContain("canvasScrollbarsActiveRef.current = canvasScrollbarsActive;");
    expect(source).toContain("canvasHorizontalScrollbarsActiveRef.current = canvasHorizontalScrollbarsActive;");
    expect(source).toContain("canvasVerticalScrollbarsActiveRef.current = canvasVerticalScrollbarsActive;");
    expect(source).toContain("const computedCanvasScrollSurfaceWidth = canvasScrollSurfaceSize(");
    expect(source).toContain("canvasHorizontalScrollbarsActive");
    expect(source).toContain("const computedCanvasScrollSurfaceHeight = canvasScrollSurfaceSize(");
    expect(source).toContain("canvasVerticalScrollbarsActive");
    expect(source).toContain("const canvasScrollSurfaceWidth =");
    expect(source).toContain("const canvasScrollSurfaceHeight =");
    expect(source).toContain("const canvasBaseDisplayOffsetX = canvasDisplayOffset(");
    expect(source).toContain("const canvasBaseDisplayOffsetY = canvasDisplayOffset(");
    expect(source).toContain("const [canvasNoScrollOffset, setCanvasNoScrollOffset] = useState<Point>({ x: 0, y: 0 });");
    expect(source).toContain("const clampedCanvasNoScrollOffset = {");
    expect(source).toContain("const canvasDisplayOffsetX = canvasResizeAnchoredDisplayOffset(");
    expect(source).toContain("Math.round(canvasBaseDisplayOffsetX + clampedCanvasNoScrollOffset.x),");
    expect(source).toContain("const canvasDisplayOffsetY = canvasResizeAnchoredDisplayOffset(");
    expect(source).toContain("Math.round(canvasBaseDisplayOffsetY + clampedCanvasNoScrollOffset.y),");
    expect(source).toContain("const canvasNoScrollOffsetRef = useRef(clampedCanvasNoScrollOffset);");
    expect(source).toContain("canvasNoScrollOffsetRef.current = clampedCanvasNoScrollOffset;");
    expect(source).toContain("const clampCanvasNoScrollOffsetPoint = (offset: Point): Point =>");
    expect(source).toContain("syncCanvasFrameScrollToViewBox");
    expect(source).toContain("export function canvasFrameScrollTargetForViewBox({");
    expect(source).toContain("export function canvasViewBoxFromFrameScrollPosition({");
    expect(source).toContain("const canvasFullyVisible = !canvasScrollbarsActiveRef.current && renderedCanvasFullyFitsFrame(frameRect, svgRect)");
    expect(source).toContain("const next = canvasFullyVisible ? fullViewBox : visibleCanvasViewBoxFromRects(frameRect, svgRect, fullViewBox)");
    expect(source).toContain("if (canvasFullyVisible || !frameScrollWasUserDriven) {\n        return;\n      }");
    expect(canvasRenderBlock).toContain("className=\"canvas-scroll-surface\"");
    expect(source).toContain("overflowX: canvasHorizontalScrollbarsActive ? \"auto\" : \"hidden\"");
    expect(source).toContain("overflowY: canvasVerticalScrollbarsActive ? \"auto\" : \"hidden\"");
    expect(source).not.toContain("style={{ overflow: canvasScrollbarsActive ? \"auto\" : \"hidden\" }}");
    expect(canvasRenderBlock).toContain("style={{ width: canvasScrollSurfaceWidth, height: canvasScrollSurfaceHeight }}");
    expect(canvasRenderBlock).toContain("style={{ width: canvasDisplayWidth, height: canvasDisplayHeight, left: canvasDisplayOffsetX, top: canvasDisplayOffsetY }}");
    expect(canvasRenderBlock).toContain("viewBox={`0 0 ${canvasRenderBounds.width} ${canvasRenderBounds.height}`}");
    expect(canvasRenderBlock).not.toContain("viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}");
  });

  test("keeps fitted no-scroll canvas geometry from feeding back into viewport state", async () => {
    const source = await readAppSource();
    const syncBlockStart = source.indexOf("const syncCanvasFrameScrollToViewBox =");
    const syncBlockEnd = source.indexOf("const syncCanvasFrameScrollToWheelAnchor", syncBlockStart);
    const syncBlock = source.slice(syncBlockStart, syncBlockEnd);
    const visibleUpdateStart = source.indexOf("const scheduleCanvasVisibleViewBoxUpdate =");
    const visibleUpdateEnd = source.indexOf("const handleCanvasFrameScroll", visibleUpdateStart);
    const visibleUpdateBlock = source.slice(visibleUpdateStart, visibleUpdateEnd);
    const listenerStart = source.indexOf("useEffect(() => {\n    const frame = canvasFrameRef.current;");
    const listenerEnd = source.indexOf("useEffect(() => {\n    setCanvasSizeDraft", listenerStart);
    const listenerBlock = source.slice(listenerStart, listenerEnd);

    expect(source).toContain("export function canvasFrameScrollTargetForViewBox({");
    expect(source).toContain("const syncHorizontal = horizontalScrollbarsActive || maxScrollLeft > 1;");
    expect(source).toContain("const syncVertical = verticalScrollbarsActive || maxScrollTop > 1;");
    expect(source).toContain("viewBoxStartToScrollPosition(targetViewBox.x, targetViewBox.width, canvasBounds.width, maxScrollLeft)");
    expect(source).toContain("viewBoxStartToScrollPosition(targetViewBox.y, targetViewBox.height, canvasBounds.height, maxScrollTop)");
    expect(syncBlock).toContain("const { left: nextLeft, top: nextTop } = canvasFrameScrollTargetForViewBox({");
    expect(syncBlock).toContain("horizontalScrollbarsActive: canvasHorizontalScrollbarsActiveRef.current");
    expect(syncBlock).toContain("verticalScrollbarsActive: canvasVerticalScrollbarsActiveRef.current");
    expect(syncBlock).toContain("canvasBoundsScrollSyncTarget({");
    expect(syncBlock).toContain("anchorScrollLeft: boundsScrollAnchor.left");
    expect(syncBlock).toContain("targetScrollLeft: nextLeft");
    expect(syncBlock).toContain("setCanvasFrameScrollPosition(frame, targetLeft, targetTop);");
    expect(syncBlock).not.toContain("setCanvasFrameScrollPosition(frame, 0, 0);");
    expect(visibleUpdateBlock).toContain("const frameRect = frame.getBoundingClientRect();");
    expect(visibleUpdateBlock).toContain("const svgRect = svg.getBoundingClientRect();");
    expect(syncBlock).not.toContain("if (!canvasScrollbarsActiveRef.current)");
    expect(visibleUpdateBlock).toContain("const canvasFullyVisible = !canvasScrollbarsActiveRef.current && renderedCanvasFullyFitsFrame(frameRect, svgRect)");
    expect(visibleUpdateBlock).toContain("const next = canvasFullyVisible ? fullViewBox : visibleCanvasViewBoxFromRects(frameRect, svgRect, fullViewBox)");
    expect(visibleUpdateBlock.indexOf("if (canvasFullyVisible)")).toBeLessThan(visibleUpdateBlock.indexOf("setViewBox((current) =>"));
    expect(listenerBlock).toContain("observer?.observe(frame);");
    expect(listenerBlock).not.toContain("observer?.observe(svgRef.current)");
  });

  test("keeps manual canvas scrollbar movement as the scroll source of truth", async () => {
    const source = await readAppSource();
    const syncEffectStart = source.indexOf("useEffect(() => {\n    updateCanvasFrameViewportAndVisibleBox();");
    const syncEffectEnd = source.indexOf("useLayoutEffect(() => {", syncEffectStart);
    const syncEffectBlock = source.slice(syncEffectStart, syncEffectEnd);
    const listenerStart = source.indexOf("useEffect(() => {\n    const frame = canvasFrameRef.current;");
    const listenerEnd = source.indexOf("useEffect(() => {\n    setCanvasSizeDraft", listenerStart);
    const listenerBlock = source.slice(listenerStart, listenerEnd);
    const wheelGuardStart = source.indexOf("const preventPageWheelZoom = (event: WheelEvent) => {");
    const wheelGuardEnd = source.indexOf("window.addEventListener(\"wheel\", preventPageWheelZoom", wheelGuardStart);
    const wheelGuardBlock = source.slice(wheelGuardStart, wheelGuardEnd);
    const canvasPointStart = source.indexOf("const clientPointInsideRenderedCanvas =");
    const canvasPointEnd = source.indexOf("const wheelZoomAnchorFromClient =", canvasPointStart);
    const canvasPointBlock = source.slice(canvasPointStart, canvasPointEnd);
    const wheelStart = source.indexOf("const handleWheel = (event: React.WheelEvent<SVGSVGElement>) => {");
    const wheelEnd = source.indexOf("const deleteSelected = () => {", wheelStart);
    const wheelBlock = source.slice(wheelStart, wheelEnd);

    expect(source).toContain("const handleCanvasFrameScroll = () => {");
    expect(source).toContain("const canvasFrameProgrammaticScrollRef = useRef(false);");
    expect(source).toContain("const canvasBoundsScrollSyncPendingRef = useRef(false);");
    expect(source).toContain("const setCanvasFrameScrollPosition = (frame: HTMLElement, left: number, top: number) => {");
    expect(source).toContain("canvasFrameScrollIsUserDriven({");
    expect(source).toContain("programmaticScroll: canvasFrameProgrammaticScrollRef.current");
    expect(source).toContain("boundsScrollSyncPending: canvasBoundsScrollSyncPendingRef.current");
    expect(source).toContain("type WheelZoomAnchor = {");
    expect(source).toContain("function anchoredCanvasScrollPosition(");
    expect(source).toContain("const pendingWheelZoomAnchorRef = useRef<WheelZoomAnchor | null>(null);");
    expect(source).toContain("const syncCanvasFrameScrollToWheelAnchor = (anchor: WheelZoomAnchor) => {");
    expect(source).toContain("const pendingWheelZoomAnchor = pendingWheelZoomAnchorRef.current;");
    expect(source).toContain("syncCanvasFrameScrollToWheelAnchor(pendingWheelZoomAnchor);");
    expect(listenerBlock).toContain("frame.addEventListener(\"scroll\", handleCanvasFrameScroll, { passive: true });");
    expect(listenerBlock).toContain("frame.removeEventListener(\"scroll\", handleCanvasFrameScroll);");
    expect(listenerBlock).not.toContain("frame.addEventListener(\"scroll\", scheduleCanvasVisibleViewBoxUpdate");
    expect(syncEffectBlock).toContain("updateCanvasFrameViewportAndVisibleBox();");
    expect(syncEffectBlock).toContain("canvasScrollSurfaceHeight");
    expect(syncEffectBlock).toContain("canvasScrollSurfaceWidth");
    expect(syncEffectBlock).not.toContain("viewBox");
    expect(source).toContain("function canvasWheelEventHasNoModifier");
    expect(source).toContain("function shouldZoomCanvasFromWheelEvent");
    expect(source).toContain("const clientPointInsideRenderedCanvas = (clientX: number, clientY: number) => {");
    expect(source).toContain("function canvasWheelTargetIsRenderedCanvas(target: EventTarget | null)");
    expect(wheelGuardBlock).toContain("const cursorInsideCanvas = clientPointInsideRenderedCanvas(event.clientX, event.clientY);");
    expect(wheelGuardBlock).toContain("if (!canvasWheelTargetIsRenderedCanvas(event.target))");
    expect(wheelGuardBlock).toContain("if (cursorInsideCanvas && shouldZoomCanvasFromWheelEvent(event))");
    expect(wheelGuardBlock).not.toContain("if (event.ctrlKey || event.metaKey");
    expect(wheelGuardBlock).not.toContain("plainWheelInsideCanvasFrame");
    expect(canvasPointBlock).toContain("clientX >= frameRect.left");
    expect(canvasPointBlock).toContain("clientY <= frameRect.bottom");
    expect(canvasPointBlock).toContain("clientX >= svgRect.left");
    expect(canvasPointBlock).toContain("clientY <= svgRect.bottom");
    expect(wheelGuardBlock).toContain("zoomCanvasFromWheelEvent(event);");
    expect(source).toContain(".closest(\".diagram-canvas\")");
    expect(source).toContain("const wheelZoomAnchorFromClient = (clientX: number, clientY: number): WheelZoomAnchor | null => {");
    expect(source).toContain("const cursorInsideFrame =");
    expect(source).toContain("const zoomCanvasFromWheelEvent = (event: CanvasWheelZoomEvent) => {");
    expect(source).toContain("event.stopPropagation();");
    expect(source).toContain("const anchor = wheelZoomAnchorFromClient(event.clientX, event.clientY);");
    expect(source).toContain("const bounds = canvasBoundsRef.current;");
    expect(source).toContain("return normalizeViewBoxToCanvas({");
    expect(wheelBlock).toContain("if (!shouldZoomCanvasFromWheelEvent(event))");
    expect(wheelBlock).toContain("if (isCanvasWheelZoomExcludedTarget(event.target) || !canvasWheelTargetIsRenderedCanvas(event.target))");
    expect(wheelBlock).toContain("if (event.nativeEvent.defaultPrevented)");
    expect(wheelBlock).toContain("zoomCanvasFromWheelEvent(event);");
    expect(wheelBlock).not.toContain("const frame = canvasFrameRef.current;");
    expect(wheelBlock).not.toContain("const frameRect = frame.getBoundingClientRect();");
    expect(wheelBlock).not.toContain("const ratioX = (pointer.x - viewBox.x) / viewBox.width;");
  });

  test("does not route side-panel wheel events into canvas zoom", async () => {
    const source = await readAppSource();
    const selectorStart = source.indexOf("const CANVAS_WHEEL_ZOOM_EXCLUSION_SELECTOR =");
    const selectorEnd = source.indexOf("].join(\", \");", selectorStart);
    const selectorBlock = source.slice(selectorStart, selectorEnd);
    const wheelGuardStart = source.indexOf("const preventPageWheelZoom = (event: WheelEvent) => {");
    const wheelGuardEnd = source.indexOf("window.addEventListener(\"wheel\", preventPageWheelZoom", wheelGuardStart);
    const wheelGuardBlock = source.slice(wheelGuardStart, wheelGuardEnd);

    expect(selectorStart).toBeGreaterThan(-1);
    expect(selectorBlock).toContain(".floating-side-panel");
    expect(selectorBlock).toContain(".side-panel-edge-trigger");
    expect(source).toContain("function isCanvasWheelZoomExcludedTarget(target: EventTarget | null)");
    expect(wheelGuardBlock).toContain("if (isCanvasWheelZoomExcludedTarget(event.target))");
    expect(wheelGuardBlock.indexOf("if (isCanvasWheelZoomExcludedTarget(event.target))")).toBeLessThan(
      wheelGuardBlock.indexOf("const cursorInsideCanvas = clientPointInsideRenderedCanvas")
    );
  });

  test("does not route modal and popup wheel events into canvas zoom", async () => {
    const source = await readAppSource();
    const selectorStart = source.indexOf("const CANVAS_WHEEL_ZOOM_EXCLUSION_SELECTOR =");
    const selectorEnd = source.indexOf("].join(\", \");", selectorStart);
    const selectorBlock = source.slice(selectorStart, selectorEnd);
    const wheelGuardStart = source.indexOf("const preventPageWheelZoom = (event: WheelEvent) => {");
    const wheelGuardEnd = source.indexOf("window.addEventListener(\"wheel\", preventPageWheelZoom", wheelGuardStart);
    const wheelGuardBlock = source.slice(wheelGuardStart, wheelGuardEnd);

    expect(selectorStart).toBeGreaterThan(-1);
    expect(selectorBlock).toContain("[role=\\\"dialog\\\"]");
    expect(selectorBlock).toContain(".image-picker-backdrop");
    expect(selectorBlock).toContain(".context-menu");
    expect(wheelGuardBlock).toContain("if (isCanvasWheelZoomExcludedTarget(event.target))");
    expect(wheelGuardBlock.indexOf("if (isCanvasWheelZoomExcludedTarget(event.target))")).toBeLessThan(
      wheelGuardBlock.indexOf("const cursorInsideCanvas = clientPointInsideRenderedCanvas")
    );
  });

  test("only routes wheel zoom events whose target belongs to the canvas svg", async () => {
    const source = await readAppSource();
    const targetStart = source.indexOf("function canvasWheelTargetIsRenderedCanvas(target: EventTarget | null)");
    const targetEnd = source.indexOf("function readStoredInteractionMode", targetStart);
    const targetBlock = source.slice(targetStart, targetEnd);
    const wheelGuardStart = source.indexOf("const preventPageWheelZoom = (event: WheelEvent) => {");
    const wheelGuardEnd = source.indexOf("window.addEventListener(\"wheel\", preventPageWheelZoom", wheelGuardStart);
    const wheelGuardBlock = source.slice(wheelGuardStart, wheelGuardEnd);
    const wheelStart = source.indexOf("const handleWheel = (event: React.WheelEvent<SVGSVGElement>) => {");
    const wheelEnd = source.indexOf("const deleteSelected = () => {", wheelStart);
    const wheelBlock = source.slice(wheelStart, wheelEnd);

    expect(targetStart).toBeGreaterThan(-1);
    expect(targetBlock).toContain("target instanceof Element ? target : target instanceof Node ? target.parentElement : null");
    expect(targetBlock).toContain(".closest(\".diagram-canvas\")");
    expect(wheelGuardBlock).toContain("if (!canvasWheelTargetIsRenderedCanvas(event.target))");
    expect(wheelGuardBlock.indexOf("if (!canvasWheelTargetIsRenderedCanvas(event.target))")).toBeLessThan(
      wheelGuardBlock.indexOf("const cursorInsideCanvas = clientPointInsideRenderedCanvas")
    );
    expect(wheelBlock).toContain("!canvasWheelTargetIsRenderedCanvas(event.target)");
    expect(wheelBlock.indexOf("!canvasWheelTargetIsRenderedCanvas(event.target)")).toBeLessThan(
      wheelBlock.indexOf("zoomCanvasFromWheelEvent(event)")
    );
  });

  test("keeps wheel zoom anchored when canvas scrollbars appear or disappear", async () => {
    const source = await readAppSource();
    const syncStart = source.indexOf("const syncCanvasFrameScrollToWheelAnchor =");
    const syncEnd = source.indexOf("const currentViewBoxFromCanvasFrameScroll", syncStart);
    const syncBlock = source.slice(syncStart, syncEnd);

    expect(source).toContain("function anchoredCanvasNoScrollOffset(");
    expect(syncBlock).not.toContain("if (!canvasScrollbarsActiveRef.current) {\n      setCanvasFrameScrollPosition(frame, 0, 0);\n      return;\n    }");
    expect(syncBlock).toContain("const noScrollOffset = anchoredCanvasNoScrollOffset(");
    expect(syncBlock).toContain("const nextCanvasNoScrollOffset = clampCanvasNoScrollOffsetPoint({");
    expect(syncBlock).toContain("x: canvasHorizontalScrollbarsActiveRef.current ? 0 : noScrollOffset.x");
    expect(syncBlock).toContain("y: canvasVerticalScrollbarsActiveRef.current ? 0 : noScrollOffset.y");
    expect(syncBlock).toContain("setCanvasFrameScrollPosition(");
    expect(syncBlock).toContain("canvasHorizontalScrollbarsActiveRef.current ? scrollPosition.left : 0");
    expect(syncBlock).toContain("canvasVerticalScrollbarsActiveRef.current ? scrollPosition.top : 0");
    expect(syncBlock).toContain("const nextViewBox = normalizeViewBoxToCanvas({");
    expect(syncBlock).toContain("scrollPositionToViewBoxStart(");
    expect(syncBlock).toContain("setViewBox((current) => {");
    expect(syncBlock).toContain("setCanvasNoScrollOffset((current) => {");
    expect(syncBlock).toContain("skipNextCanvasScrollSyncRef.current = true;");
    expect(source).toContain("function canvasFrameViewportSizeChanged(");
    expect(source).toContain("const wheelZoomViewportChanged = canvasFrameViewportSizeChanged(canvasFrameRef.current, canvasFrameViewportSize);");
    expect(source).toContain("pendingWheelZoomAnchorRef.current = pendingWheelZoomAnchor;");
    expect(source).toContain("updateCanvasFrameViewportSize();");
  });

  test("pans zoomed scrollable canvas by moving the frame scrollbars directly", async () => {
    const source = await readAppSource();
    const panningStateStart = source.indexOf("type CanvasPanningState =");
    const panningStateEnd = source.indexOf("const [marquee, setMarquee]", panningStateStart);
    const panningStateBlock = source.slice(panningStateStart, panningStateEnd);
    const currentScrollStart = source.indexOf("const currentViewBoxFromCanvasFrameScroll =");
    const currentScrollEnd = source.indexOf("const scheduleCanvasVisibleViewBoxUpdate", currentScrollStart);
    const currentScrollBlock = source.slice(currentScrollStart, currentScrollEnd);
    const pointerMoveStart = source.indexOf("const activePanning = panningRef.current ?? panning;");
    const pointerMoveEnd = source.indexOf("if (transformDrag && svgRef.current)", pointerMoveStart);
    const pointerMoveBlock = source.slice(pointerMoveStart, pointerMoveEnd);
    const startPanStart = source.indexOf("const startCanvasPanning =");
    const startPanEnd = source.indexOf("const handleCanvasPointerDownCapture", startPanStart);
    const startPanBlock = source.slice(startPanStart, startPanEnd);
    const pointerLeaveStart = source.indexOf("onPointerLeave={() => {", source.indexOf("onPointerMove={handlePointerMove}"));
    const pointerLeaveEnd = source.indexOf("onPointerCancel={() => {", pointerLeaveStart);
    const pointerLeaveBlock = source.slice(pointerLeaveStart, pointerLeaveEnd);

    expect(panningStateBlock).toContain("scrollLeft: number;");
    expect(panningStateBlock).toContain("scrollTop: number;");
    expect(panningStateBlock).toContain("canvasOffset: Point;");
    expect(panningStateBlock).toContain("horizontalScrollMode: boolean;");
    expect(panningStateBlock).toContain("verticalScrollMode: boolean;");
    expect(source).toContain("export function canvasViewBoxFromFrameScrollPosition({");
    expect(source).toContain("scrollPositionToViewBoxStart(scrollLeft, currentViewBox.width, canvasBounds.width, maxScrollLeft, currentViewBox.x)");
    expect(source).toContain("scrollPositionToViewBoxStart(scrollTop, currentViewBox.height, canvasBounds.height, maxScrollTop, currentViewBox.y)");
    expect(currentScrollBlock).toContain("return canvasViewBoxFromFrameScrollPosition({");
    expect(currentScrollBlock).toContain("scrollLeft: frame.scrollLeft");
    expect(currentScrollBlock).toContain("scrollTop: frame.scrollTop");
    expect(currentScrollBlock).not.toContain("if (!canvasScrollbarsActiveRef.current)");
    expect(pointerMoveBlock).toContain("const useHorizontalScrollPanning = Boolean(frame && activePanning.horizontalScrollMode);");
    expect(pointerMoveBlock).toContain("const useVerticalScrollPanning = Boolean(frame && activePanning.verticalScrollMode);");
    expect(pointerMoveBlock).toContain("const nextLeft = clampNumber(activePanning.scrollLeft - (event.clientX - activePanning.clientX), 0, maxLeft);");
    expect(pointerMoveBlock).toContain("const nextTop = clampNumber(activePanning.scrollTop - (event.clientY - activePanning.clientY), 0, maxTop);");
    expect(pointerMoveBlock).toContain("frame.scrollLeft = nextLeft;");
    expect(pointerMoveBlock).toContain("frame.scrollTop = nextTop;");
    expect(pointerMoveBlock).toContain("canvasFrameUserScrollRef.current = true;");
    expect(pointerMoveBlock).toContain("const nextOffset = clampCanvasNoScrollOffsetPoint({");
    expect(pointerMoveBlock).toContain("x: useHorizontalScrollPanning ? activePanning.canvasOffset.x : activePanning.canvasOffset.x + event.clientX - activePanning.clientX");
    expect(pointerMoveBlock).toContain("setCanvasNoScrollOffset((current) =>");
    expect(startPanBlock).toContain("const panningViewBox = currentViewBoxFromCanvasFrameScroll();");
    expect(startPanBlock).toContain("canvasOffset: canvasNoScrollOffsetRef.current");
    expect(startPanBlock).toContain("horizontalScrollMode: frame ? canvasHorizontalScrollbarsActiveRef.current && canvasFrameHasHorizontalScrollableRange(frame) : false");
    expect(startPanBlock).toContain("verticalScrollMode: frame ? canvasVerticalScrollbarsActiveRef.current && canvasFrameHasVerticalScrollableRange(frame) : false");
    expect(startPanBlock).toContain("event.preventDefault();");
    expect(startPanBlock).toContain("event.stopPropagation();");
    expect(source).toContain("onPointerDownCapture={handleCanvasPointerDownCapture}");
    expect(source).toContain("onPointerMove={(event) => {\n              if (panningRef.current || modifierSelectionPressRef.current) {\n                handlePointerMove(event as unknown as PointerEvent<SVGSVGElement>);");
    expect(pointerLeaveBlock).toContain("if (panningRef.current) {\n                return;\n              }");
  });

  test("pans canvas per axis so fitted edge targets remain reachable without scrollbars", async () => {
    const source = await readAppSource();
    const panningStateStart = source.indexOf("type CanvasPanningState =");
    const panningStateEnd = source.indexOf("const [marquee, setMarquee]", panningStateStart);
    const panningStateBlock = source.slice(panningStateStart, panningStateEnd);
    const pointerMoveStart = source.indexOf("const activePanning = panningRef.current ?? panning;");
    const pointerMoveEnd = source.indexOf("if (transformDrag && svgRef.current)", pointerMoveStart);
    const pointerMoveBlock = source.slice(pointerMoveStart, pointerMoveEnd);
    const startPanStart = source.indexOf("const startCanvasPanning =");
    const startPanEnd = source.indexOf("const handleCanvasPointerDownCapture", startPanStart);
    const startPanBlock = source.slice(startPanStart, startPanEnd);

    expect(source).toContain("function canvasFrameHasHorizontalScrollableRange(frame: HTMLElement)");
    expect(source).toContain("function canvasFrameHasVerticalScrollableRange(frame: HTMLElement)");
    expect(panningStateBlock).toContain("horizontalScrollMode: boolean;");
    expect(panningStateBlock).toContain("verticalScrollMode: boolean;");
    expect(startPanBlock).toContain("horizontalScrollMode: frame ? canvasHorizontalScrollbarsActiveRef.current && canvasFrameHasHorizontalScrollableRange(frame) : false");
    expect(startPanBlock).toContain("verticalScrollMode: frame ? canvasVerticalScrollbarsActiveRef.current && canvasFrameHasVerticalScrollableRange(frame) : false");
    expect(pointerMoveBlock).toContain("const useHorizontalScrollPanning = Boolean(frame && activePanning.horizontalScrollMode);");
    expect(pointerMoveBlock).toContain("const useVerticalScrollPanning = Boolean(frame && activePanning.verticalScrollMode);");
    expect(pointerMoveBlock).toContain("if (useHorizontalScrollPanning) {");
    expect(pointerMoveBlock).toContain("if (useVerticalScrollPanning) {");
    expect(pointerMoveBlock).toContain("x: useHorizontalScrollPanning ? activePanning.canvasOffset.x : activePanning.canvasOffset.x + event.clientX - activePanning.clientX");
    expect(pointerMoveBlock).toContain("y: useVerticalScrollPanning ? activePanning.canvasOffset.y : activePanning.canvasOffset.y + event.clientY - activePanning.clientY");
    expect(pointerMoveBlock).not.toContain("if (frame && panning.scrollMode)");
  });

  test("keeps canvas panning active immediately when dragging from page or canvas blank areas", async () => {
    const source = await readAppSource();
    const stateStart = source.indexOf("const [panning, setPanning] = useState<");
    const stateEnd = source.indexOf("const [marquee, setMarquee]", stateStart);
    const stateBlock = source.slice(stateStart, stateEnd);
    const pointerMoveStart = source.indexOf("const activePanning = panningRef.current ?? panning;");
    const pointerMoveEnd = source.indexOf("if (transformDrag && svgRef.current)", pointerMoveStart);
    const pointerMoveBlock = source.slice(pointerMoveStart, pointerMoveEnd);
    const startPanStart = source.indexOf("const startCanvasPanning =");
    const startPanEnd = source.indexOf("const handleCanvasPointerDownCapture", startPanStart);
    const startPanBlock = source.slice(startPanStart, startPanEnd);
    const scrollSurfaceStart = source.indexOf("className=\"canvas-scroll-surface\"");
    const scrollSurfaceEnd = source.indexOf("<svg", scrollSurfaceStart);
    const scrollSurfaceBlock = source.slice(scrollSurfaceStart, scrollSurfaceEnd);
    const svgPointerUpStart = source.indexOf("onPointerUp={(event) => {", source.indexOf("className={`diagram-canvas"));
    const svgPointerUpEnd = source.indexOf("onPointerLeave={() => {", svgPointerUpStart);
    const svgPointerUpBlock = source.slice(svgPointerUpStart, svgPointerUpEnd);

    expect(stateBlock).toContain("const panningRef = useRef<CanvasPanningState>(null);");
    expect(stateBlock).toContain("const setCanvasPanning = (next: CanvasPanningState) => {");
    expect(stateBlock).toContain("panningRef.current = next;");
    expect(pointerMoveBlock).toContain("const activePanning = panningRef.current ?? panning;");
    expect(pointerMoveBlock).toContain("if (activePanning && svgRef.current) {");
    expect(pointerMoveBlock).toContain("activePanning.verticalScrollMode");
    expect(startPanBlock).toContain("setCanvasPanning({");
    expect(scrollSurfaceBlock).toContain("if (panningRef.current || modifierSelectionPressRef.current)");
    expect(scrollSurfaceBlock).toContain("setCanvasPanning(null);");
    expect(svgPointerUpBlock).toContain("setCanvasPanning(null);");
  });

  test("uses Ctrl or Shift on the canvas for marquee selection and node selection toggles", async () => {
    const source = await readAppSource();
    const captureStart = source.indexOf("const handleCanvasPointerDownCapture =");
    const captureEnd = source.indexOf("const wheelZoomAnchorFromClient =", captureStart);
    const captureBlock = source.slice(captureStart, captureEnd);
    const nodePointerStart = source.indexOf("const handleNodePointerDown =");
    const nodePointerEnd = source.indexOf("const handlePointerMove =", nodePointerStart);
    const nodePointerBlock = source.slice(nodePointerStart, nodePointerEnd);
    const labelDragStart = source.indexOf("const startNodeLabelDrag =");
    const labelDragEnd = source.indexOf("const finishNodeLabelDrag = ", labelDragStart);
    const labelDragBlock = source.slice(labelDragStart, labelDragEnd);
    const transformDragStart = source.indexOf("const startSingleTransformDrag =");
    const transformDragEnd = source.indexOf("const startGroupMoveDrag =", transformDragStart);
    const transformDragBlock = source.slice(transformDragStart, transformDragEnd);
    const edgePointerStart = source.indexOf("const handleEdgePathPointerDown =");
    const edgePointerEnd = source.indexOf("const deleteManualBendPoint =", edgePointerStart);
    const edgePointerBlock = source.slice(edgePointerStart, edgePointerEnd);
    const pointerMoveStart = source.indexOf("const handlePointerMove = (event: PointerEvent<SVGSVGElement>) =>");
    const pointerMoveEnd = source.indexOf("const startCanvasPanning =", pointerMoveStart);
    const pointerMoveBlock = source.slice(pointerMoveStart, pointerMoveEnd);
    const svgPointerUpStart = source.indexOf("onPointerUp={(event) => {", source.indexOf("onPointerMove={handlePointerMove}"));
    const svgPointerUpEnd = source.indexOf("onPointerLeave={() => {", svgPointerUpStart);
    const svgPointerUpBlock = source.slice(svgPointerUpStart, svgPointerUpEnd);
    const blankPointerStart = source.indexOf("if (hasCanvasSelectionModifier(event))", source.indexOf("const routeHit = isReadonlyCanvasMode ? null : findConnectionRouteHitAtPoint(pointer);"));
    const blankPointerEnd = source.indexOf("lastEdgePointerClickRef.current = null;", blankPointerStart);
    const blankPointerBlock = source.slice(blankPointerStart, blankPointerEnd);
    const svgBlankStart = source.indexOf("if (connectSource) {", source.indexOf("className={`diagram-canvas"));
    const svgBlankEnd = source.indexOf("const routeHit = isReadonlyCanvasMode ? null : findConnectionRouteHitAtPoint(pointer);", svgBlankStart);
    const svgBlankBeforeRouteHitBlock = source.slice(svgBlankStart, svgBlankEnd);
    const blankPanStart = source.indexOf("if (event.detail >= 2)", source.indexOf("setInspectorTab(\"model\");"));
    const blankPanEnd = source.indexOf("}}\n            onContextMenu", blankPanStart);
    const blankPanBlock = source.slice(blankPanStart, blankPanEnd);
    const scrollSurfaceStart = source.indexOf("className=\"canvas-scroll-surface\"");
    const scrollSurfaceEnd = source.indexOf("<svg", scrollSurfaceStart);
    const scrollSurfaceBlock = source.slice(scrollSurfaceStart, scrollSurfaceEnd);

    expect(source).toContain("function hasCanvasSelectionModifier");
    expect(source).toContain("type ModifierSelectionPressTarget =");
    expect(source).toContain("const [modifierSelectionPress, setModifierSelectionPressState] = useState<ModifierSelectionPressState>(null);");
    expect(source).toContain("const toggleNodeSelectionFromModifierClick = (node: ModelNode) =>");
    expect(source).toContain("const startModifierSelectionPress = (");
    expect(source).toContain("const finishModifierSelectionPress = (");
    expect(captureBlock).not.toContain("startCanvasPanning(event);");
    expect(nodePointerBlock).toContain("if (hasCanvasSelectionModifier(event))");
    expect(nodePointerBlock).toContain("startModifierSelectionPress(event, { kind: \"node\", nodeId: node.id });");
    expect(nodePointerBlock).not.toContain("toggleNodeSelectionFromModifierClick(node);");
    expect(nodePointerBlock).toContain("return;");
    expect(labelDragBlock).toContain("if (hasCanvasSelectionModifier(event))");
    expect(labelDragBlock).toContain("startModifierSelectionPress(event, { kind: \"node\", nodeId: node.id });");
    expect(transformDragBlock).toContain("if (hasCanvasSelectionModifier(event))");
    expect(transformDragBlock).toContain("startModifierSelectionPress(event, { kind: \"node\", nodeId: node.id });");
    expect(edgePointerBlock).toContain("if (hasCanvasSelectionModifier(event))");
    expect(edgePointerBlock).toContain("startModifierSelectionPress(event, { kind: \"edge\", edgeId });");
    expect(pointerMoveBlock).toContain("const modifierPress = modifierSelectionPressRef.current;");
    expect(pointerMoveBlock).toContain("setMarquee({ start: modifierPress.startPoint, current: currentPoint });");
    expect(svgPointerUpBlock).toContain("if (finishModifierSelectionPress(event.pointerId))");
    expect(svgPointerUpBlock.indexOf("finishModifierSelectionPress(event.pointerId)")).toBeLessThan(svgPointerUpBlock.indexOf("finishMarqueeSelection();"));
    expect(svgBlankBeforeRouteHitBlock).not.toContain("startCanvasPanning(event);");
    expect(blankPointerBlock).toContain("if (hasCanvasSelectionModifier(event))");
    expect(blankPointerBlock).toContain("startModifierSelectionPress(event, routeHit ? { kind: \"edge\", edgeId: routeHit.edgeId } : undefined);");
    expect(blankPointerBlock).toContain("return;");
    expect(blankPanBlock).toContain("startCanvasPanning(event);");
    expect(blankPanBlock).not.toContain("if (!canvasScrollbarsActiveRef.current)");
    expect(blankPanBlock).not.toContain("setMarquee({ start: point, current: point });");
    expect(scrollSurfaceBlock).toContain("hasCanvasSelectionModifier(event)");
    expect(scrollSurfaceBlock).toContain("startCanvasPanning(event);");
  });

  test("starts a one-shot marquee selection from the blank canvas context menu", async () => {
    const source = await readAppSource();
    const contextStart = source.indexOf("{contextMenu && (");
    const contextEnd = source.indexOf("{projectMenu && (", contextStart);
    const contextBlock = source.slice(contextStart, contextEnd);
    const pointerMoveStart = source.indexOf("const handlePointerMove = (event: PointerEvent<SVGSVGElement>) =>");
    const pointerMoveEnd = source.indexOf("const startCanvasPanning =", pointerMoveStart);
    const pointerMoveBlock = source.slice(pointerMoveStart, pointerMoveEnd);
    const svgPointerDownStart = source.indexOf("onPointerDown={(event) => {", source.indexOf("onPointerMove={handlePointerMove}"));
    const svgPointerDownEnd = source.indexOf("onContextMenu={(event) => {", svgPointerDownStart);
    const svgPointerDownBlock = source.slice(svgPointerDownStart, svgPointerDownEnd);

    expect(source).toContain("type ContextMarqueeSelectionState =");
    expect(source).toContain("const [contextMarqueeSelection, setContextMarqueeSelectionState] = useState<ContextMarqueeSelectionState>(null);");
    expect(source).toContain("const startContextMarqueeSelection = () =>");
    expect(contextBlock).toContain("{isEditMode && contextMenuTarget === \"blank\" && contextMenu.canvasPoint && (");
    expect(contextBlock).toContain("runContextMenuAction(startContextMarqueeSelection)");
    expect(contextBlock).toContain("框选");
    expect(pointerMoveBlock).toContain("const activeContextMarqueeSelection = contextMarqueeSelectionRef.current;");
    expect(pointerMoveBlock).toContain("setMarquee({ start: activeContextMarqueeSelection.start, current: pointer });");
    expect(svgPointerDownBlock).toContain("if (contextMarqueeSelectionRef.current)");
    expect(svgPointerDownBlock).toContain("finishMarqueeSelectionFromPoints(contextMarqueeSelectionRef.current.start, pointer);");
    expect(svgPointerDownBlock).toContain("setContextMarqueeSelection(null);");
  });

  test("automatically switches inspector tabs for common canvas selection flows", async () => {
    const source = await readAppSource();
    const selectionHelperStart = source.indexOf("const switchInspectorTabForCanvasSelection = (");
    const selectionHelperEnd = source.indexOf("const selectCanvasGraphics = (", selectionHelperStart);
    const selectionHelperBlock = source.slice(selectionHelperStart, selectionHelperEnd);
    const marqueeStart = source.indexOf("function finishMarqueeSelectionFromPoints");
    const marqueeEnd = source.indexOf("const startContextMarqueeSelection", marqueeStart);
    const marqueeBlock = source.slice(marqueeStart, marqueeEnd);
    const svgPointerDownStart = source.indexOf("onPointerDown={(event) => {", source.indexOf("onPointerMove={handlePointerMove}"));
    const svgPointerDownEnd = source.indexOf("onContextMenu={(event) => {", svgPointerDownStart);
    const svgPointerDownBlock = source.slice(svgPointerDownStart, svgPointerDownEnd);
    const nodePointerStart = source.indexOf("const handleNodePointerDown =");
    const nodePointerEnd = source.indexOf("const handleEdgePathPointerDown", nodePointerStart);
    const nodePointerBlock = source.slice(nodePointerStart, nodePointerEnd);
    const filterConfirmStart = source.indexOf("const confirmFilterSelectionDialog = () =>");
    const filterConfirmEnd = source.indexOf("const finishMarqueeSelection = () =>", filterConfirmStart);
    const filterConfirmBlock = source.slice(filterConfirmStart, filterConfirmEnd);
    const inspectorTabsStart = source.indexOf("<div className=\"inspector-tabs\">");
    const inspectorTabsEnd = source.indexOf("{inspectorTab === \"model\" && currentModelRecord", inspectorTabsStart);
    const inspectorTabsBlock = source.slice(inspectorTabsStart, inspectorTabsEnd);
    const autoInspectorTabStart = source.indexOf("const previousAutoInspectorSelectionKeyRef = useRef(activeSelectionKey);");
    const autoInspectorTabEnd = source.indexOf("const selectedNodeTransformStatus = useMemo", autoInspectorTabStart);
    const autoInspectorTabBlock = source.slice(autoInspectorTabStart, autoInspectorTabEnd);
    const ctrlAStart = source.indexOf("if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === \"a\")");
    const ctrlAEnd = source.indexOf("} else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === \"c\")", ctrlAStart);
    const ctrlABlock = source.slice(ctrlAStart, ctrlAEnd);

    expect(source).toContain("const switchInspectorTabForCanvasSelection = (");
    expect(source).toContain("const activeSelectionKey = useMemo(");
    expect(source).not.toContain("if (selectedCount > 1 && inspectorTab !== \"tree\")");
    expect(source).not.toContain("}, [inspectorTab, selectedCount]);");
    expect(autoInspectorTabBlock).toContain("previousAutoInspectorSelectionKeyRef.current === activeSelectionKey");
    expect(autoInspectorTabBlock).toContain("previousAutoInspectorSelectionKeyRef.current = activeSelectionKey;");
    expect(autoInspectorTabBlock).toContain("if (selectedCount > 1)");
    expect(autoInspectorTabBlock).toContain("setInspectorTab(\"tree\")");
    expect(autoInspectorTabBlock).toContain("}, [activeSelectionKey, selectedCount]);");
    expect(autoInspectorTabBlock).not.toContain("inspectorTab");
    expect(inspectorTabsBlock).toContain("onClick={() => setInspectorTab(\"model\")}");
    expect(inspectorTabsBlock).toContain("onClick={() => setInspectorTab(\"tree\")}");
    expect(inspectorTabsBlock).toContain("onClick={() => setInspectorTab(\"graph\")}");
    expect(selectionHelperBlock).toContain("nodeIds.length === 0 && edgeIds.length === 0");
    expect(selectionHelperBlock).toContain("setInspectorTab(\"model\")");
    expect(selectionHelperBlock).toContain("const selectedGraphicCount = nodeIds.length + edgeIds.length;");
    expect(selectionHelperBlock).toContain("selectedGraphicCount > 1");
    expect(selectionHelperBlock).toContain("setInspectorTab(\"tree\")");
    expect(selectionHelperBlock).toContain("selectedGraphicCount === 1");
    expect(selectionHelperBlock).toContain("setInspectorTab(\"graph\")");
    expect(marqueeBlock).toContain("switchInspectorTabForCanvasSelection(selection.nodeIds, selection.edgeIds, \"marquee\");");
    expect(svgPointerDownBlock).toContain("switchInspectorTabForCanvasSelection([], [], \"blank\");");
    expect(nodePointerBlock).toContain("switchInspectorTabForCanvasSelection([node.id], [], \"single\");");
    expect(filterConfirmBlock).toContain("switchInspectorTabForCanvasSelection(nextSelectedNodes.map((node) => node.id), [], \"marquee\");");
    expect(ctrlABlock).toContain("switchInspectorTabForCanvasSelection(activeLayerNodes.map((node) => node.id), selectableEdgeIds, \"marquee\");");
  });

  test("selects canvas nodes by one or more device types from the blank context menu", async () => {
    const source = await readAppSource();
    const styles = await readStyles();
    const contextStart = source.indexOf("{contextMenu && (");
    const contextEnd = source.indexOf("{projectMenu && (", contextStart);
    const contextBlock = source.slice(contextStart, contextEnd);
    const dialogStart = source.indexOf("{filterSelectionDialogOpen && (");
    const dialogEnd = source.indexOf("{renderMeasurementConfigDialog()}", dialogStart);
    const dialogBlock = source.slice(dialogStart, dialogEnd);
    const confirmStart = source.indexOf("const confirmFilterSelectionDialog = () =>");
    const confirmEnd = source.indexOf("const renderParamHeader", confirmStart);
    const confirmBlock = source.slice(confirmStart, confirmEnd);
    const listStyleBlock = cssRuleBlock(styles, ".filter-selection-list");
    const optionStyleBlock = cssRuleBlock(styles, ".filter-selection-option");
    const typeRowStyleBlock = cssRuleBlock(styles, ".filter-selection-type-row");
    const treeStyleBlock = cssRuleBlock(styles, ".filter-selection-tree");
    const treeChildrenStyleBlock = cssRuleBlock(styles, ".filter-selection-tree-children");
    const treeChildStyleBlock = cssRuleBlock(styles, ".filter-selection-tree-child {");
    const kindRowStyleBlock = cssRuleBlock(styles, ".filter-selection-kind-row");

    expect(source).toContain("const [filterSelectionDialogOpen, setFilterSelectionDialogOpen] = useState(false);");
    expect(source).toContain("const [filterSelectionTypeKeys, setFilterSelectionTypeKeys] = useState<string[]>([]);");
    expect(source).toContain("type FilterSelectionTypeOption =");
    expect(source).toContain("const filterSelectionTypeOptions = useMemo");
    expect(source).toContain("const filterSelectionTemplateComponentTypeKey = (template: DeviceTemplate)");
    expect(source).toContain("function filterSelectionTreeLabel(label: string, typeKey: string)");
    expect(source).toContain("const filterSelectionTemplateComponentTypeByKind = useMemo");
    expect(source).toContain("const filterSelectionComponentTypeKey = (node: ModelNode)");
    expect(source).toContain("filterSelectionTemplateComponentTypeByKind.get(node.kind)");
    expect(source).toContain("inferESection(template.kind, {})");
    expect(source).toContain("inferESection(node.kind, {})");
    expect(source).toContain("const filterSelectionSpecificTypeKey = (node: ModelNode) => node.kind;");
    expect(source).toContain("const filterSelectionItemKey = (node: ModelNode)");
    expect(source).toContain("items: Array<{ itemKey: string; typeKey: string; label: string; count: number; nodeIds: string[] }>");
    expect(source).not.toContain("filterSelectionNodeName");
    expect(source).toContain("const filterSelectionTypeSelected = (option: FilterSelectionTypeOption)");
    expect(source).toContain("const filterSelectionTypePartial = (option: FilterSelectionTypeOption)");
    expect(source).toContain("const openFilterSelectionDialog = () =>");
    expect(source).toContain("const toggleFilterSelectionType = (typeKey: string) =>");
    expect(source).toContain("const toggleFilterSelectionItem = (itemKey: string) =>");
    expect(source).toContain("const confirmFilterSelectionDialog = () =>");
    expect(contextBlock).toContain("{isEditMode && contextMenuTarget === \"blank\" && activeLayerNodes.length > 0 && (");
    expect(contextBlock).toContain("runContextMenuAction(openFilterSelectionDialog)");
    expect(contextBlock).toContain("过滤选择");
    expect(confirmBlock).toContain("new Set(filterSelectionTypeKeys)");
    expect(confirmBlock).toContain("activeLayerNodes.filter((node) => selectedItemKeys.has(filterSelectionItemKey(node)))");
    expect(confirmBlock).toContain("selectCanvasGraphics(nextSelectedNodes.map((node) => node.id), [], { scope: \"direct\" })");
    expect(confirmBlock).toContain("setFilterSelectionDialogOpen(false);");
    expect(confirmBlock).toContain("writeOperationLog(`过滤选择：选中 ${nextSelectedNodes.length} 个图元`)");
    expect(dialogBlock).toContain("role=\"dialog\"");
    expect(dialogBlock).toContain("aria-labelledby=\"filter-selection-title\"");
    expect(dialogBlock).toContain("元件类型列表");
    expect(dialogBlock).toContain("filterSelectionTypeOptions.map((option) =>");
    expect(dialogBlock).toContain("className=\"filter-selection-type-row\"");
    expect(dialogBlock).toContain("<strong>{filterSelectionTreeLabel(option.label, option.typeKey)}</strong>");
    expect(dialogBlock).not.toContain("<small>{option.typeKey}</small>");
    expect(dialogBlock).toContain("input.indeterminate = filterSelectionTypePartial(option);");
    expect(dialogBlock).toContain("checked={filterSelectionTypeSelected(option)}");
    expect(dialogBlock).toContain("className=\"filter-selection-tree\"");
    expect(dialogBlock).toContain("className=\"filter-selection-tree-children\"");
    expect(dialogBlock).toContain("className=\"filter-selection-tree-child\"");
    expect(dialogBlock).toContain("aria-label={`${option.label}元件类型树`}");
    expect(dialogBlock).not.toContain("具体元件列表");
    expect(dialogBlock).not.toContain("filter-selection-node-name-list");
    expect(dialogBlock).not.toContain("item.names");
    expect(dialogBlock).toContain("option.items.map((item) =>");
    expect(dialogBlock).toContain("key={item.itemKey}");
    expect(dialogBlock).toContain("className=\"filter-selection-kind-row\"");
    expect(dialogBlock).toContain("<strong>{filterSelectionTreeLabel(item.label, item.typeKey)}</strong>");
    expect(dialogBlock).not.toContain("<small>{item.typeKey}</small>");
    expect(dialogBlock).toContain("checked={filterSelectionTypeKeys.includes(item.itemKey)}");
    expect(dialogBlock).toContain("toggleFilterSelectionType(option.typeKey)");
    expect(dialogBlock).toContain("toggleFilterSelectionItem(item.itemKey)");
    expect(dialogBlock).toContain("全选");
    expect(dialogBlock).toContain("filterSelectionTypeOptions.flatMap((option) => option.items.map((item) => item.itemKey))");
    expect(dialogBlock).toContain("清空");
    expect(dialogBlock).toContain("确认选择");
    expect(listStyleBlock).toContain("gap: 2px;");
    expect(listStyleBlock).toContain("padding: 4px;");
    expect(optionStyleBlock).toContain("padding: 3px 4px;");
    expect(optionStyleBlock).toContain("background: transparent;");
    expect(optionStyleBlock).not.toContain("border:");
    expect(typeRowStyleBlock).toContain("min-height: 28px;");
    expect(treeStyleBlock).toContain("margin: 1px 0 2px 42px;");
    expect(treeStyleBlock).toContain("padding: 1px 0 1px 10px;");
    expect(treeChildrenStyleBlock).toContain("gap: 1px;");
    expect(treeChildStyleBlock).toContain("padding: 2px 0;");
    expect(treeChildStyleBlock).toContain("background: transparent;");
    expect(treeChildStyleBlock).not.toContain("border:");
    expect(kindRowStyleBlock).toContain("min-height: 24px;");
  });

  test("fits the whole canvas to the viewport when blank canvas is double-clicked", async () => {
    const source = await readAppSource();
    const fitFunctionStart = source.indexOf("function fitWholeCanvasViewBox");
    const fitFunctionEnd = source.indexOf("const boxesIntersect", fitFunctionStart);
    const fitFunctionBlock = source.slice(fitFunctionStart, fitFunctionEnd);
    const fitHandlerStart = source.indexOf("const fitWholeCanvasToFrame =");
    const fitHandlerEnd = source.indexOf("const fitViewToBounds", fitHandlerStart);
    const fitHandlerBlock = source.slice(fitHandlerStart, fitHandlerEnd);
    const blankPointerStart = source.indexOf("if (event.detail >= 2)", source.indexOf("setInspectorTab(\"model\");"));
    const blankPointerEnd = source.indexOf("}}\n            onContextMenu", blankPointerStart);
    const blankPointerBlock = source.slice(blankPointerStart, blankPointerEnd);
    const scrollSurfaceStart = source.indexOf("className=\"canvas-scroll-surface\"");
    const scrollSurfaceEnd = source.indexOf("<svg", scrollSurfaceStart);
    const scrollSurfaceBlock = source.slice(scrollSurfaceStart, scrollSurfaceEnd);

    expect(source).toContain("const CANVAS_FIT_SCROLLBAR_GUARD = 4;");
    expect(fitFunctionBlock).toContain("availableWidth");
    expect(fitFunctionBlock).toContain("availableHeight");
    expect(fitFunctionBlock).toContain("availableWidth / Math.max(1, canvasBounds.width)");
    expect(fitFunctionBlock).toContain("availableHeight / Math.max(1, canvasBounds.height)");
    expect(fitFunctionBlock).toContain("normalizeViewBoxToCanvas");
    expect(source).toContain("const centerCanvasFrameScrollPosition = (frame: HTMLElement) =>");
    expect(fitHandlerBlock).toContain("fitWholeCanvasViewBox(canvasBounds, canvasFrameRef.current)");
    expect(fitHandlerBlock).toContain("setCanvasNoScrollOffset({ x: 0, y: 0 });");
    expect(fitHandlerBlock).toContain("setCanvasVisibleViewBox(canvasFullViewBox)");
    expect(fitHandlerBlock).toContain("centerCanvasFrameScrollPosition(frame);");
    expect(fitHandlerBlock).toContain("const fitWholeCanvasFromBlankDoubleClick =");
    expect(fitHandlerBlock).toContain("staticDrawing || connectSource");
    expect(fitHandlerBlock).toContain("target?.closest(\".diagram-node, .connection-group");
    expect(fitHandlerBlock).toContain("findConnectionRouteHitAtPoint(pointer)");
    expect(blankPointerBlock).toContain("if (event.detail >= 2)");
    expect(blankPointerBlock).toContain("fitWholeCanvasToFrame();");
    expect(blankPointerBlock).toContain("return;");
    expect(blankPointerBlock).toContain("startCanvasPanning(event);");
    expect(blankPointerBlock).not.toContain("if (!canvasScrollbarsActiveRef.current)");
    expect(blankPointerBlock).not.toContain("setMarquee({ start: point, current: point });");
    expect(scrollSurfaceBlock).toContain("onDoubleClick={(event) =>");
    expect(scrollSurfaceBlock).toContain("event.target !== event.currentTarget");
    expect(scrollSurfaceBlock).toContain("fitWholeCanvasToFrame();");
    expect(source).toContain("onDoubleClick={fitWholeCanvasFromBlankDoubleClick}");
  });

  test("routes node double-clicks to interaction, text, image, device parameter, and undefined fallbacks", async () => {
    const source = await readAppSource();
    const decisionStart = source.indexOf("const doubleClickDialogKindForNode =");
    const decisionEnd = source.indexOf("const openNodeDoubleClickEditor =", decisionStart);
    const decisionBlock = source.slice(decisionStart, decisionEnd);
    const openStart = source.indexOf("const openNodeDoubleClickEditor =");
    const openEnd = source.indexOf("const connectPreviewDom", openStart);
    const openBlock = source.slice(openStart, openEnd);
    const lodStart = source.indexOf("const handleLodNodeDoubleClick =");
    const lodEnd = source.indexOf("const connectPreviewDom", lodStart);
    const lodBlock = source.slice(lodStart, lodEnd);
    const nodeDoubleClickStart = source.indexOf("onDoubleClick={(event) =>", source.indexOf("className={`diagram-node ${nodeIsBus ?"));
    const nodeDoubleClickEnd = source.indexOf("}}\n                >", nodeDoubleClickStart);
    const nodeDoubleClickBlock = source.slice(nodeDoubleClickStart, nodeDoubleClickEnd);

    expect(source).toContain("type NodeDoubleClickDialogKind = \"interaction\" | \"text\" | \"device\";");
    expect(source).toContain("const [nodeDoubleClickDialog, setNodeDoubleClickDialog]");
    expect(decisionBlock).toContain("nodeHasInteractionDoubleClickEditor(node)");
    expect(decisionBlock).toContain("isTextDoubleClickKind(node.kind)");
    expect(decisionBlock).toContain("isImageDoubleClickKind(node.kind)");
    expect(decisionBlock).toContain("!isStaticNode(node)");
    expect(decisionBlock).toContain("nodeHasTextDoubleClickEditor(node)");
    expect(decisionBlock).toContain("nodeHasImageDoubleClickEditor(node)");
    expect(decisionBlock.indexOf("nodeHasInteractionDoubleClickEditor(node)")).toBeLessThan(decisionBlock.indexOf("isTextDoubleClickKind(node.kind)"));
    expect(decisionBlock.indexOf("isTextDoubleClickKind(node.kind)")).toBeLessThan(decisionBlock.indexOf("isImageDoubleClickKind(node.kind)"));
    expect(decisionBlock.indexOf("isImageDoubleClickKind(node.kind)")).toBeLessThan(decisionBlock.indexOf("!isStaticNode(node)"));
    expect(decisionBlock.indexOf("!isStaticNode(node)")).toBeLessThan(decisionBlock.indexOf("nodeHasTextDoubleClickEditor(node)"));
    expect(decisionBlock.indexOf("nodeHasTextDoubleClickEditor(node)")).toBeLessThan(decisionBlock.indexOf("nodeHasImageDoubleClickEditor(node)"));
    expect(openBlock).toContain("selectCanvasGraphics([node.id], [])");
    expect(openBlock).toContain("editorKind === \"interaction\" || editorKind === \"text\" || editorKind === \"device\"");
    expect(openBlock).toContain("setNodeDoubleClickDraft({ nodeId: node.id, node: cloneNodeForDoubleClickDraft(node) })");
    expect(openBlock).toContain("setNodeDoubleClickDialog({ kind: editorKind, nodeId: node.id })");
    expect(openBlock).toContain("setImageTarget({ kind: \"node\", nodeId: node.id })");
    expect(openBlock).toContain("window.alert(\"当前图元没有双击定义。\")");
    expect(lodBlock).toContain("openNodeDoubleClickEditor(node)");
    expect(lodBlock).not.toContain("setImageTarget({ kind: \"node\", nodeId: node.id })");
    expect(nodeDoubleClickBlock).toContain("openNodeDoubleClickEditor(node)");
    expect(nodeDoubleClickBlock).not.toContain("setImageTarget({ kind: \"node\", nodeId: node.id })");
    expect(source).toContain("renderNodeDoubleClickDialog()");
    expect(source).toContain("id=\"node-double-click-dialog-title\"");
  });

  test("shows container and associated device parameter tabs in the node double-click device dialog", async () => {
    const source = await readAppSource();
    const modelSource = await readModelSource();
    const styles = await readStyles();
    const dialogStart = source.indexOf("const renderNodeDoubleClickDialog =");
    const dialogEnd = source.indexOf("const contextMenuStyle", dialogStart);
    const dialogBlock = source.slice(dialogStart, dialogEnd);
    const tabsBlock = cssRuleBlock(styles, ".container-param-tabs.node-double-click-container-tabs");
    const tabButtonBlock = cssRuleBlock(styles, ".container-param-tabs.node-double-click-container-tabs button");

    expect(source).toContain("containerViewId?: string;");
    expect(source).toContain("const renderNodeDoubleClickContainerParamRows =");
    expect(modelSource).toContain('label: "设备本体"');
    expect(modelSource).not.toContain('label: "容器本体"');
    expect(dialogBlock).toContain("const dialogNode =");
    expect(dialogBlock).toContain("buildContainerDeviceParameterViews(dialogNode, libraryTemplateByKind.get(dialogNode.kind))");
    expect(dialogBlock).toContain("const activeContainerView =");
    expect(dialogBlock).toContain("className=\"container-param-tabs node-double-click-container-tabs\"");
    expect(dialogBlock).toContain("setNodeDoubleClickDialog((current) =>");
    expect(dialogBlock).toContain("containerViewId: view.id");
    expect(dialogBlock).toContain("renderNodeDoubleClickContainerParamRows(dialogNode, activeContainerView)");
    expect(dialogBlock).toContain("renderNodeDoubleClickDeviceParamRows(dialogNode)");
    expect(tabsBlock).toContain("flex-wrap: nowrap");
    expect(tabsBlock).toContain("overflow-x: auto");
    expect(tabsBlock).toContain("overflow-y: hidden");
    expect(styles.indexOf(".container-param-tabs.node-double-click-container-tabs")).toBeLessThan(
      styles.indexOf(".container-param-tabs {"),
    );
    expect(tabButtonBlock).toContain("flex: 0 0 auto");
    expect(tabButtonBlock).toContain("white-space: nowrap");
  });

  test("deduplicates repeated node double-click dialog opens from overlapping text hit targets", async () => {
    const source = await readAppSource();
    const dialogStart = source.indexOf("const renderNodeDoubleClickDialog =");
    const dialogEnd = source.indexOf("const contextMenuStyle", dialogStart);
    const dialogBlock = source.slice(dialogStart, dialogEnd);
    const openStart = source.indexOf("const openNodeDoubleClickEditor =");
    const openEnd = source.indexOf("const connectPreviewDom", openStart);
    const openBlock = source.slice(openStart, openEnd);
    const confirmStart = source.indexOf("const confirmNodeDoubleClickDialog =");
    const confirmEnd = source.indexOf("const renderNodeDoubleClickDialog =", confirmStart);
    const confirmBlock = source.slice(confirmStart, confirmEnd);

    expect(source).toContain("const NODE_DOUBLE_CLICK_DIALOG_DEDUPE_MS");
    expect(source).toContain("const NODE_DOUBLE_CLICK_CLOSE_SUPPRESS_MS");
    expect(source).toContain("const nodeDoubleClickOpenGuardRef = useRef");
    expect(source).toContain("const nodeDoubleClickCloseSuppressUntilRef = useRef");
    expect(openBlock).toContain("const guardKey = `${node.id}:${editorKind}`;");
    expect(openBlock).toContain("now < nodeDoubleClickCloseSuppressUntilRef.current");
    expect(openBlock).toContain("nodeDoubleClickOpenGuardRef.current");
    expect(openBlock.indexOf("nodeDoubleClickOpenGuardRef.current")).toBeLessThan(openBlock.indexOf("setNodeDoubleClickDialog(null)"));
    expect(openBlock).toContain("now - nodeDoubleClickOpenGuardRef.current.time < NODE_DOUBLE_CLICK_DIALOG_DEDUPE_MS");
    expect(openBlock).toContain("nodeDoubleClickDialog?.kind === editorKind");
    expect(openBlock).toContain("nodeDoubleClickDialog.nodeId === node.id");
    expect(openBlock.indexOf("nodeDoubleClickDialog?.kind === editorKind")).toBeLessThan(openBlock.indexOf("setNodeDoubleClickDialog(null)"));
    expect(source).toContain("nodeDoubleClickOpenGuardRef.current = { key: `${dialog.nodeId}:${dialog.kind}`, time: now };");
    expect(source).toContain("nodeDoubleClickCloseSuppressUntilRef.current = now + NODE_DOUBLE_CLICK_CLOSE_SUPPRESS_MS;");
    expect(source).toContain("const stopNodeDoubleClickDialogEvent =");
    expect(source).toContain("const suppressNodeDoubleClickDialogEvent =");
    expect(dialogBlock).toContain("onPointerDown={stopNodeDoubleClickDialogEvent}");
    expect(dialogBlock).toContain("onPointerUp={stopNodeDoubleClickDialogEvent}");
    expect(dialogBlock).toContain("onClick={stopNodeDoubleClickDialogEvent}");
    expect(dialogBlock).toContain("onDoubleClick={suppressNodeDoubleClickDialogEvent}");
    expect(dialogBlock).toContain("onPointerDown={suppressNodeDoubleClickDialogEvent}");
    expect(confirmBlock.indexOf("rememberNodeDoubleClickDialogGuard(dialog);")).toBeLessThan(
      confirmBlock.indexOf("patchGraphNodes(["),
    );
  });

  test("stages node double-click dialog edits until confirm", async () => {
    const source = await readAppSource();
    const dialogStart = source.indexOf("const renderNodeDoubleClickDialog =");
    const dialogEnd = source.indexOf("const contextMenuStyle", dialogStart);
    const dialogBlock = source.slice(dialogStart, dialogEnd);

    expect(source).toContain("type NodeDoubleClickDialogDraftState");
    expect(source).toContain("const [nodeDoubleClickDraft, setNodeDoubleClickDraft]");
    expect(source).toContain("const updateNodeDoubleClickDraftParam =");
    expect(source).toContain("const confirmNodeDoubleClickDialog =");
    expect(source).toContain("const cancelNodeDoubleClickDialog =");
    expect(dialogBlock).toContain("nodeDoubleClickDialogActions");
    expect(dialogBlock).toContain("确定");
    expect(dialogBlock).toContain("取消");
    expect(dialogBlock).toContain("confirmNodeDoubleClickDialog");
    expect(dialogBlock).toContain("cancelNodeDoubleClickDialog");
    const actionsStart = dialogBlock.indexOf("node-double-click-dialog-actions nodeDoubleClickDialogActions");
    const actionsBlock = dialogBlock.slice(actionsStart, actionsStart + 1200);
    expect(actionsBlock.indexOf("确定")).toBeLessThan(actionsBlock.indexOf("取消"));
    expect(actionsBlock.indexOf("confirmNodeDoubleClickDialog")).toBeLessThan(
      actionsBlock.indexOf("cancelNodeDoubleClickDialog"),
    );
    expect(dialogBlock).not.toContain("updateParam(\"text\"");
  });

  test("fits the whole canvas once when the page is first opened", async () => {
    const source = await readAppSource();
    const initialFitStart = source.indexOf("const initialCanvasFitAppliedRef");
    const initialFitEnd = source.indexOf("useEffect(() => {\n    const frame = canvasFrameRef.current;", initialFitStart);
    const initialFitBlock = source.slice(initialFitStart, initialFitEnd);

    expect(source).toContain("const initialCanvasFitAppliedRef = useRef(false);");
    expect(initialFitBlock).toContain("if (initialCanvasFitAppliedRef.current)");
    expect(initialFitBlock).toContain("canvasFrameViewportSize.width <= 0 || canvasFrameViewportSize.height <= 0");
    expect(initialFitBlock).toContain("initialCanvasFitAppliedRef.current = true;");
    expect(initialFitBlock).toContain("setViewBox(fitWholeCanvasViewBox(canvasBounds, canvasFrameRef.current));");
    expect(initialFitBlock).toContain("setCanvasVisibleViewBox(canvasFullViewBox);");
    expect(initialFitBlock).toContain("scheduleCanvasVisibleViewBoxUpdate();");
    expect(initialFitBlock).toContain("canvasBounds");
    expect(initialFitBlock).toContain("canvasFrameViewportSize.height");
    expect(initialFitBlock).toContain("canvasFrameViewportSize.width");
  });

  test("scopes horizontal and vertical scrollbars to the canvas surface", async () => {
    const source = await readAppSource();
    const styles = await readStyles();
    const rootBlock = cssRuleBlock(styles, "html,\nbody,\n#root");
    const appShellBlock = cssRuleBlock(styles, ".app-shell");
    const workspaceBlock = cssRuleBlock(styles, ".workspace");
    const canvasFrameBlock = cssRuleBlock(styles, ".canvas-frame");
    const edgeTriggerBlock = cssRuleBlock(styles, ".side-panel-edge-trigger");
    const rightTriggerBlock = cssRuleBlock(styles, ".side-panel-edge-trigger.right");
    const sideTriggerStart = source.indexOf("const renderSidePanelEdgeTrigger =");
    const sideTriggerEnd = source.indexOf("const normalizeScale", sideTriggerStart);
    const sideTriggerBlock = source.slice(sideTriggerStart, sideTriggerEnd);

    expect(rootBlock).toContain("height: 100%;");
    expect(rootBlock).toContain("overflow: hidden;");
    expect(appShellBlock).toContain("width: 100vw;");
    expect(appShellBlock).toContain("max-width: 100vw;");
    expect(workspaceBlock).toContain("grid-template-rows: 58px minmax(0, 1fr) var(--statusbar-height);");
    expect(workspaceBlock).toContain("min-height: 0;");
    expect(workspaceBlock).toContain("overflow: hidden;");
    expect(canvasFrameBlock).toContain("position: relative;");
    expect(canvasFrameBlock).toContain("min-width: 0;");
    expect(canvasFrameBlock).toContain("min-height: 0;");
    expect(canvasFrameBlock).toContain("overflow: auto;");
    expect(canvasFrameBlock).toContain("overscroll-behavior: contain;");
    expect(canvasFrameBlock).toContain("padding: 0;");
    expect(styles).toMatch(/(?:^|\n)\.canvas-scroll-surface\s*\{[^}]*position:\s*relative/s);
    expect(styles).toMatch(/(?:^|\n)\.diagram-canvas\s*\{[^}]*position:\s*absolute/s);
    expect(edgeTriggerBlock).toContain("pointer-events: auto;");
    expect(rightTriggerBlock).toContain("right: 16px;");
    expect(sideTriggerBlock).toContain("if (visible)");
    expect(sideTriggerBlock).toContain("onPointerEnter={() => updateAutoPanelVisibility(side, \"edge-enter\")}");
    expect(sideTriggerBlock).toContain("mode === \"hidden\" ? `${label}并切换为永久显示` : label");
    expect(sideTriggerBlock).toContain("setSidePanelMode(side, \"pinned\")");
    expect(styles).toContain(".app-shell.right-panel-hidden .inspector-panel.floating-side-panel.hidden");
    expect(styles).toContain(".app-shell.left-panel-hidden .library-panel.floating-side-panel.hidden");
    expect(styles).toMatch(/\.app-shell\.right-panel-hidden \.inspector-panel\.floating-side-panel\.hidden,[\s\S]*?display:\s*none;/);
  });

  test("keeps side panel pointer and keyboard events from reaching the canvas", async () => {
    const source = await readAppSource();
    const styles = await readStyles();
    const helperStart = source.indexOf("const stopSidePanelEventPropagation =");
    const helperEnd = source.indexOf("const setSidePanelMode =");
    const helperBlock = source.slice(helperStart, helperEnd);
    const leftPanelRefIndex = source.indexOf("ref={leftPanelRef}");
    const leftPanelStart = source.lastIndexOf("<aside", leftPanelRefIndex);
    const leftPanelEnd = source.indexOf("className=\"side-panel-resize-handle right-edge\"", leftPanelStart);
    const leftPanelBlock = source.slice(leftPanelStart, leftPanelEnd);
    const rightPanelRefIndex = source.indexOf("ref={rightPanelRef}");
    const rightPanelStart = source.lastIndexOf("<aside", rightPanelRefIndex);
    const rightPanelEnd = source.indexOf("className=\"side-panel-resize-handle left-edge\"", rightPanelStart);
    const rightPanelBlock = source.slice(rightPanelStart, rightPanelEnd);
    const sidePanelBlock = cssRuleBlock(styles, ".floating-side-panel");
    const canvasResizeHotzoneBlock = cssRuleBlock(styles, ".canvas-resize-hotzones");

    expect(helperBlock).toContain("event.stopPropagation();");
    for (const panelBlock of [leftPanelBlock, rightPanelBlock]) {
      expect(panelBlock).toContain("onPointerDown={stopSidePanelEventPropagation}");
      expect(panelBlock).toContain("onPointerMoveCapture={stopSidePanelEventPropagation}");
      expect(panelBlock).toContain("onPointerMove={stopSidePanelEventPropagation}");
      expect(panelBlock).toContain("onMouseMoveCapture={stopSidePanelEventPropagation}");
      expect(panelBlock).toContain("onMouseMove={stopSidePanelEventPropagation}");
      expect(panelBlock).toContain("onClick={stopSidePanelEventPropagation}");
      expect(panelBlock).toContain("onDoubleClick={stopSidePanelEventPropagation}");
      expect(panelBlock).toContain("onContextMenu={stopSidePanelEventPropagation}");
      expect(panelBlock).toContain("onKeyDown={stopSidePanelEventPropagation}");
      expect(panelBlock).toContain("onKeyUp={stopSidePanelEventPropagation}");
    }
    expect(sidePanelBlock).toContain("z-index: 70;");
    expect(canvasResizeHotzoneBlock).toContain("z-index: 46;");
  });

  test("captures page-wide Ctrl+S before panels and dialogs stop keyboard propagation", async () => {
    const source = await readAppSource();
    const keyHandlerStart = source.indexOf("const handleGlobalSaveKeyDown = (event: KeyboardEvent) => {");
    const keyHandlerEnd = source.indexOf("const handleKeyDown = (event: KeyboardEvent) => {", keyHandlerStart);
    const globalSaveBlock = source.slice(keyHandlerStart, keyHandlerEnd);
    const keydownStart = source.indexOf("const handleKeyDown = (event: KeyboardEvent) => {", keyHandlerEnd);
    const keydownEnd = source.indexOf("const handleKeyUp = (event: KeyboardEvent) => {", keydownStart);
    const keydownBlock = source.slice(keydownStart, keydownEnd);
    const listenerStart = source.indexOf("window.addEventListener(\"keydown\", handleGlobalSaveKeyDown");
    const listenerEnd = source.indexOf("return () => {", listenerStart);
    const listenerBlock = source.slice(listenerStart, listenerEnd);
    const cleanupStart = source.indexOf("window.removeEventListener(\"keydown\", handleGlobalSaveKeyDown", listenerEnd);
    const cleanupEnd = source.indexOf("};", cleanupStart);
    const cleanupBlock = source.slice(cleanupStart, cleanupEnd);

    expect(globalSaveBlock).toContain("if (!isGlobalSaveShortcut(event))");
    expect(globalSaveBlock).toContain("event.preventDefault();");
    expect(globalSaveBlock).toContain("saveCurrentProject();");
    expect(globalSaveBlock).toContain("浏览模式下不能保存，请先切换到编辑模式");
    expect(listenerBlock).toContain("window.addEventListener(\"keydown\", handleGlobalSaveKeyDown, { capture: true });");
    expect(listenerBlock).toContain("window.addEventListener(\"keydown\", handleKeyDown);");
    expect(cleanupBlock).toContain("window.removeEventListener(\"keydown\", handleGlobalSaveKeyDown, { capture: true });");
    expect(cleanupBlock).toContain("window.removeEventListener(\"keydown\", handleKeyDown);");
    expect(keydownBlock).toContain("if (event.defaultPrevented) {");
    expect(keydownBlock).toContain("return;");
    expect(keydownBlock).not.toContain("if (isGlobalSaveShortcut(event))");
  });

  test("routes shortcuts to the canvas only when the pointer is over an unobstructed rendered canvas", async () => {
    const source = await readAppSource();
    const refsStart = source.indexOf("const canvasFrameRef");
    const refsEnd = source.indexOf("const backendSchemesLoadedRef", refsStart);
    const refsBlock = source.slice(refsStart, refsEnd);
    const helperStart = source.indexOf("const canvasPointerKeyboardShortcutAvailability = () =>");
    const helperEnd = source.indexOf("useEffect(() => {\n    const handleGlobalSaveKeyDown", helperStart);
    const helperBlock = source.slice(helperStart, helperEnd);
    const keydownStart = source.indexOf("const handleKeyDown = (event: KeyboardEvent) => {");
    const keydownEnd = source.indexOf("const handleKeyUp = (event: KeyboardEvent) => {", keydownStart);
    const keydownBlock = source.slice(keydownStart, keydownEnd);
    const pointerMoveStart = source.indexOf("const handlePointerMove = (event: PointerEvent<SVGSVGElement>)");
    const pointerMoveEnd = source.indexOf("if (libraryPlacement)", pointerMoveStart);
    const pointerMoveBlock = source.slice(pointerMoveStart, pointerMoveEnd);
    const canvasSvgStart = source.indexOf("className={`diagram-canvas");
    const pointerEnterStart = source.indexOf("onPointerEnter={(event) => {", canvasSvgStart);
    const pointerEnterEnd = source.indexOf("}}\n            onPointerUp", pointerEnterStart);
    const pointerEnterBlock = source.slice(pointerEnterStart, pointerEnterEnd);
    const pointerLeaveStart = source.indexOf("onPointerLeave={() => {", pointerEnterEnd);
    const pointerLeaveEnd = source.indexOf("}}\n            onPointerCancel", pointerLeaveStart);
    const pointerLeaveBlock = source.slice(pointerLeaveStart, pointerLeaveEnd);

    expect(source).toContain("const CANVAS_KEYBOARD_BLOCKING_SELECTOR = [");
    expect(source).toContain("function isCanvasKeyboardBlockingTarget(target: EventTarget | null)");
    expect(refsBlock).toContain("const lastCanvasClientPointerRef = useRef<Point | null>(null);");
    expect(helperBlock).toContain("const point = lastKeyboardShortcutClientPointerRef.current ?? lastCanvasClientPointerRef.current;");
    expect(helperBlock).toContain("document.elementFromPoint(point.x, point.y)");
    expect(helperBlock).toContain("isCanvasKeyboardBlockingTarget(topElement)");
    expect(helperBlock).toContain("topElement.closest(\".diagram-canvas\")");
    expect(keydownBlock).toContain("const canvasPointerShortcutAvailability = canvasPointerKeyboardShortcutAvailability();");
    expect(keydownBlock).toContain("isCanvasTarget: Boolean(target?.closest(\".diagram-canvas\")) && canvasPointerShortcutAvailability !== \"blocked\"");
    expect(keydownBlock).toContain("isCanvasPointerUnblocked: canvasPointerShortcutAvailability === \"unblocked\"");
    expect(keydownBlock).toContain("isCanvasInteractionActive: canvasInteractionRef.current && canvasPointerShortcutAvailability !== \"blocked\"");
    expect(pointerMoveBlock).toContain("lastCanvasClientPointerRef.current = { x: event.clientX, y: event.clientY };");
    expect(pointerEnterBlock).toContain("lastCanvasClientPointerRef.current = { x: event.clientX, y: event.clientY };");
    expect(pointerLeaveBlock).toContain("lastCanvasClientPointerRef.current = null;");
  });

  test("blocks canvas clipboard shortcuts while the pointer is over panels or dialogs", async () => {
    const source = await readAppSource();
    const blockingSelectorStart = source.indexOf("const CANVAS_KEYBOARD_BLOCKING_SELECTOR = [");
    const blockingSelectorEnd = source.indexOf("].join(\", \");", blockingSelectorStart);
    const blockingSelectorBlock = source.slice(blockingSelectorStart, blockingSelectorEnd);
    const refsStart = source.indexOf("const canvasFrameRef");
    const refsEnd = source.indexOf("const backendSchemesLoadedRef", refsStart);
    const refsBlock = source.slice(refsStart, refsEnd);
    const pointerEffectStart = source.indexOf("const updateKeyboardShortcutPointerPosition = (event: globalThis.PointerEvent) => {");
    const pointerEffectEnd = source.indexOf("}, []);", pointerEffectStart);
    const pointerEffectBlock = source.slice(pointerEffectStart, pointerEffectEnd);
    const helperStart = source.indexOf("const canvasPointerKeyboardShortcutAvailability = () =>");
    const helperEnd = source.indexOf("useEffect(() => {\n    const handleGlobalSaveKeyDown", helperStart);
    const helperBlock = source.slice(helperStart, helperEnd);

    expect(blockingSelectorBlock).toContain("\".library-panel\"");
    expect(blockingSelectorBlock).toContain("\".inspector-panel\"");
    expect(blockingSelectorBlock).toContain("\"[class*='-dialog']\"");
    expect(refsBlock).toContain("const lastKeyboardShortcutClientPointerRef = useRef<Point | null>(null);");
    expect(pointerEffectBlock).toContain("lastKeyboardShortcutClientPointerRef.current = { x: event.clientX, y: event.clientY };");
    expect(pointerEffectBlock).toContain("window.addEventListener(\"pointermove\", updateKeyboardShortcutPointerPosition, { capture: true });");
    expect(pointerEffectBlock).toContain("window.addEventListener(\"pointerdown\", updateKeyboardShortcutPointerPosition, { capture: true });");
    expect(helperBlock).toContain("const point = lastKeyboardShortcutClientPointerRef.current ?? lastCanvasClientPointerRef.current;");
    expect(helperBlock).toContain("isCanvasKeyboardBlockingTarget(topElement)");
  });

  test("defers selected device parameter view construction until the device tab is active", async () => {
    const source = await readAppSource();
    const paramStart = source.indexOf("const deviceParamPanelActive");
    const paramEnd = source.indexOf("useEffect(() => {\n    if (!layers.some", paramStart);
    const paramBlock = source.slice(paramStart, paramEnd);

    expect(paramBlock).toContain("const deviceParamPanelActive = inspectorTab === \"device\"");
    expect(paramBlock).toContain("deviceParamPanelActive && inspectorSelectedNode ? libraryTemplateByKind.get(inspectorSelectedNode.kind) : undefined");
    expect(paramBlock).toContain("deviceParamPanelActive && inspectorSelectedNode ? buildContainerDeviceParameterViews");
  });

  test("keeps selected edge overlay viewport-scoped without building a full rendered route array", async () => {
    const source = await readAppSource();
    const routeCullStart = source.indexOf("const viewportRoutedEdges = useMemo");
    const routeCullEnd = source.indexOf("const viewportNodes = useMemo", routeCullStart);
    const routeCullBlock = source.slice(routeCullStart, routeCullEnd);

    expect(source).not.toContain("const renderedRoutedEdges = useMemo");
    expect(routeCullBlock).toContain("queryRouteSpatialIndex(routedEdgeSpatialIndex, deferredViewportQueryBounds)");
    expect(routeCullBlock).toContain("selectedRoutes.push(route)");
    expect(routeCullBlock).toContain("routedEdgeById.get(edgeId)");
    expect(routeCullBlock).not.toContain("routedEdges.filter");
  });

  test("patches the route store from the previous render instead of rebuilding the route spatial index each time", async () => {
    const source = await readAppSource();
    const routeStoreStart = source.indexOf("const routedEdgeStore = useMemo");
    const routeStoreEnd = source.indexOf("const routedEdgeSpatialIndex", routeStoreStart);
    const routeStoreBlock = source.slice(routeStoreStart, routeStoreEnd);

    expect(source).toContain("const cachedRouteStoreRef = useRef<RouteStore | null>(null)");
    expect(routeStoreBlock).toContain("routeStoreSetRoutes(cachedRouteStoreRef.current, routedEdges)");
    expect(routeStoreBlock).not.toContain("createRouteStore(routedEdges)");
    expect(source).toContain("cachedRouteStoreRef.current = routedEdgeStore");
  });

  test("uses a route spatial index when refreshing crossing arc paths", async () => {
    const source = await readModelSource();
    const refreshStart = source.indexOf("function refreshCrossingArcPaths");
    const refreshEnd = source.indexOf("export function routeEdgesForRendering", refreshStart);
    const refreshBlock = source.slice(refreshStart, refreshEnd);

    expect(source).toContain("const CROSSING_ARC_SPATIAL_BUCKET_SIZE");
    expect(source).toContain("function buildCrossingRouteSpatialIndex");
    expect(source).toContain("function queryCrossingRouteSpatialIndex");
    expect(refreshBlock).toContain("const routeSpatialIndex = buildCrossingRouteSpatialIndex(routeBoxes)");
    expect(refreshBlock).toContain("queryCrossingRouteSpatialIndex(routeSpatialIndex, changedBox)");
    expect(refreshBlock).toContain("for (const previousRoute of previousRoutes)");
    expect(refreshBlock).toContain("changedEdgeIds.has(previousRoute.edgeId)");
    expect(refreshBlock).not.toContain("changedBoxes.some");
  });

  test("uses the route spatial index for connection route hit tests", async () => {
    const source = await readAppSource();
    const hitStart = source.indexOf("const findConnectionRouteHitAtPoint = (point: Point) =>");
    const hitEnd = source.indexOf("const insertManualBendAtPoint", hitStart);
    const hitBlock = source.slice(hitStart, hitEnd);
    const toleranceStart = source.indexOf("const connectionHitTolerance = () =>");
    const toleranceEnd = source.indexOf("const findConnectionRouteHitAtPoint = (point: Point) =>", toleranceStart);
    const toleranceBlock = source.slice(toleranceStart, toleranceEnd);
    const styles = await readStyles();
    const hitlineStyleStart = styles.indexOf(".connection-hitline");
    const hitlineStyleEnd = styles.indexOf(".connection-line", hitlineStyleStart);
    const hitlineStyleBlock = styles.slice(hitlineStyleStart, hitlineStyleEnd);

    expect(toleranceBlock).toContain("const svgViewBox = svg.viewBox.baseVal;");
    expect(toleranceBlock).toContain("const xTolerance = (svgViewBox.width / rect.width) * CONNECTION_HIT_SCREEN_TOLERANCE;");
    expect(toleranceBlock).toContain("const yTolerance = (svgViewBox.height / rect.height) * CONNECTION_HIT_SCREEN_TOLERANCE;");
    expect(toleranceBlock).not.toContain("viewBox.width / rect.width");
    expect(toleranceBlock).not.toContain("viewBox.height / rect.height");
    expect(toleranceBlock).not.toContain("Math.max(12");
    expect(hitBlock).toContain("const hitBounds");
    expect(hitBlock).toContain("queryRouteSpatialIndex(routedEdgeSpatialIndex, hitBounds)");
    expect(hitBlock).not.toContain("renderedRoutedEdges");
    expect(hitlineStyleBlock).toContain("stroke-width: 18;");
    expect(hitlineStyleBlock).toContain("vector-effect: non-scaling-stroke");
  });

  test("adds manual bends through editable middle route segments and preserves edit-mode manual display", async () => {
    const source = await readAppSource();
    const insertStart = source.indexOf("const insertManualBendFromPointer =");
    const insertEnd = source.indexOf("const addManualBendFromContextMenu", insertStart);
    const insertBlock = source.slice(insertStart, insertEnd);
    const routeStateStart = source.indexOf("const routedRouteState = useMemo");
    const routeStateEnd = source.indexOf("const routedEdges = routedRouteState.routes;", routeStateStart);
    const routeStateBlock = source.slice(routeStateStart, routeStateEnd);

    expect(insertBlock).toContain("findEditableRouteSegmentIndex(routePoints, clickPoint)");
    expect(routeStateBlock).toContain("preserveManualRouteDisplay: isEditMode");
  });

  test("uses graph store layer and adjacency indexes for active layer graphics", async () => {
    const source = await readAppSource();
    const activeLayerStart = source.indexOf("const activeLayerNodes = useMemo");
    const activeLayerEnd = source.indexOf("const activeLayerGroups = useMemo", activeLayerStart);
    const activeLayerBlock = source.slice(activeLayerStart, activeLayerEnd);

    expect(activeLayerBlock).toContain("graphStore.nodesByLayerId.get(activeLayerId)");
    expect(activeLayerBlock).toContain("visibleNodes === nodes && layerNodes.length === nodes.length ? visibleNodes");
    expect(activeLayerBlock).toContain("activeLayerNodes === visibleNodes ? visibleNodeIdSet");
    expect(activeLayerBlock).toContain("activeLayerNodes === visibleNodes ? visibleEdges");
    expect(activeLayerBlock).toContain("activeLayerEdges === visibleEdges ? visibleEdgeIdSet");
    expect(activeLayerBlock).toContain("edgesByNodeId.get(node.id)");
    expect(activeLayerBlock).not.toContain("visibleNodes.filter");
    expect(activeLayerBlock).not.toContain("visibleEdges.filter");
  });

  test("reuses graph store visible indexes when visible nodes keep graph order", async () => {
    const source = await readAppSource();
    const visibleProjectStart = source.indexOf("const visibleProject = useMemo");
    const visibleProjectEnd = source.indexOf("const visibleNodes = visibleProject.nodes", visibleProjectStart);
    const visibleProjectBlock = source.slice(visibleProjectStart, visibleProjectEnd);
    const visibleIndexStart = source.indexOf("const visibleNodeById = visibleProject.nodeById");
    const visibleIndexEnd = source.indexOf("const activeLayerNodes = useMemo", visibleIndexStart);
    const visibleIndexBlock = source.slice(visibleIndexStart, visibleIndexEnd);

    expect(visibleProjectBlock).toContain("allModelLayersVisible");
    expect(visibleProjectBlock).toContain("nodeById: graphStore.nodeMap");
    expect(visibleProjectBlock).toContain("nodeIdSet: graphStore.nodeIdSet");
    expect(visibleProjectBlock).toContain("edgeIdSet: graphStore.edgeIdSet");
    expect(visibleProjectBlock).toContain("nodeSpatialIndex: graphStore.nodeSpatialIndex");
    expect(visibleProjectBlock).toContain("const normalizedLayers = normalizeModelLayers(layers, nodes);");
    expect(visibleProjectBlock).toContain("graphStore.nodesByLayerId.get(layer.id)");
    expect(visibleProjectBlock).toContain("graphStore.edgesByNodeId.get(node.id)");
    expect(visibleProjectBlock).toContain("graphStore.edgeIndexById.get(first.id)");
    expect(visibleProjectBlock).toContain("visibleProjectNodesMatchGraphStoreOrder");
    expect(visibleProjectBlock).toContain("visibleNodeByIdForLayers");
    expect(visibleProjectBlock).toContain("visibleNodeIdSetForLayers");
    expect(visibleProjectBlock).toContain("visibleEdgeIdSetForLayers");
    expect(visibleProjectBlock).toContain("graphStore.nodeSpatialIndex");
    expect(visibleProjectBlock).toContain("buildNodeSpatialIndex(visibleNodesByLayer)");
    expect(visibleProjectBlock).not.toContain("filterProjectByVisibleLayers(nodes, edges, layers)");
    expect(visibleIndexBlock).toContain("const visibleNodeById = visibleProject.nodeById;");
    expect(visibleIndexBlock).toContain("const visibleNodeIdSet = visibleProject.nodeIdSet;");
    expect(visibleIndexBlock).toContain("const visibleEdgeIdSet = visibleProject.edgeIdSet;");
    expect(visibleIndexBlock).not.toContain("new Map(visibleNodes.map");
    expect(visibleIndexBlock).not.toContain("new Set(visibleNodes.map");
    expect(visibleIndexBlock).not.toContain("new Set(visibleEdges.map");
    expect(visibleIndexBlock).toContain("if (visibleEdges === edges)");
    expect(visibleIndexBlock).toContain("return graphStore.edgesByTerminalRef");
  });

  test("reuses routed edge lists when the active layer covers the visible graph", async () => {
    const source = await readAppSource();
    const activeRoutesStart = source.indexOf("const activeLayerRoutedEdges = useMemo");
    const activeRoutesEnd = source.indexOf("const markRouteEdgesDirty", activeRoutesStart);
    const activeRoutesBlock = source.slice(activeRoutesStart, activeRoutesEnd);

    expect(activeRoutesBlock).toContain("activeLayerEdges === visibleEdges ? routedEdges");
    expect(activeRoutesBlock).toContain("activeLayerEdgeIdSet.forEach");
    expect(activeRoutesBlock).toContain("return routes.sort(routeRenderOrder)");
  });

  test("limits full routing to direct path edits and keeps node dragging on the lightweight preview path", async () => {
    const source = await readAppSource();
    const routingStart = source.indexOf("const affectedRoutingEdgeIds = useMemo");
    const routingEnd = source.indexOf("const routedEdges = routedRouteState.routes;", routingStart);
    const routingBlock = source.slice(routingStart, routingEnd);
    const dragPreviewStart = source.indexOf("const dragPreviewEdgeRoutes = useMemo");
    const dragPreviewEnd = source.indexOf("const dragPreviewEdgeIdSet", dragPreviewStart);
    const dragPreviewBlock = source.slice(dragPreviewStart, dragPreviewEnd);

    expect(source).toContain("routeEdgesForIncrementalRendering");
    expect(source).toContain("pendingRouteEdgeIdsRef");
    expect(source).toContain("pendingStoredRouteEdgeIdsRef");
    expect(source).toContain("const initialStoredRouteDirtyIds = dirtyEdgeIdsForMovedLocalRoutes");
    expect(source).toContain("markStoredRouteEdgesDirty(nonTranslatedInitialStoredRouteDirtyIds)");
    expect(source).toContain("markRouteEdgesDirty(dirtyEdgeIdsAfterMove");
    expect(routingBlock).not.toContain("manualPathDrag.edgeId");
    expect(routingBlock).not.toContain("rewiring.edgeId");
    expect(routingBlock).not.toContain("terminalPress?.moved");
    expect(routingBlock).not.toContain("dragging.edgeIds");
    expect(routingBlock).not.toContain("draggingNodeIdSet.has(edge.sourceId)");
    expect(routingBlock).not.toContain("draggingNodeIdSet.has(edge.targetId)");
    expect(dragPreviewBlock).toContain("const previewEdges = isMultiNodeMoveState(dragging)");
    expect(dragPreviewBlock).toContain("buildLightweightNodeDragPreviewRoutes(dragging, draggingDelta, previewEdges)");
    expect(dragPreviewBlock).not.toContain("edges.flatMap");
    expect(dragPreviewBlock).not.toContain("preserveDraggedRouteShape");
    expect(dragPreviewBlock).not.toContain("resolveStraightBusSlideEndpoint");
  });

  test("keeps node drag snapshots lightweight for large models", async () => {
    const source = await readAppSource();
    const dragStart = source.indexOf("const handleNodePointerDown");
    const dragEnd = source.indexOf("const handlePointerMove", dragStart);
    const dragStartBlock = source.slice(dragStart, dragEnd);

    expect(source).toContain("const edgesByNodeId = graphStore.edgesByNodeId");
    expect(source).toContain("const edgeListForNodeIds =");
    expect(dragStartBlock).toContain("routePointsSnapshotForMove(affectedEdgesForDrag, dragNodeIds, edgeIdsForDrag)");
    expect(dragStartBlock).toContain("const affectedEdgesForDrag = edgeListForNodeIds(dragNodeIds, edgeIdsForDrag)");
    expect(dragStartBlock).not.toContain("for (const edge of edges)");
    expect(dragStartBlock).not.toContain("const affectedEdgesForDrag = edges.filter");
    expect(dragStartBlock).toContain("affectedEdges: affectedEdgesForDrag");
    expect(dragStartBlock).toContain("const originalRoutePointsForDrag = routePointsSnapshotForMove(affectedEdgesForDrag, dragNodeIds, edgeIdsForDrag);");
    expect(dragStartBlock).not.toContain("(routeByEdgeId.get(edge.id) ?? []).map((routePoint) => ({ ...routePoint }))");
    expect(dragStartBlock).not.toContain("originalEdgePoints: Object.fromEntries(\n        edges.map");
    expect(dragStartBlock).not.toContain("originalRoutePoints: Object.fromEntries(\n        edges.map");
  });

  test("passes local move candidate edges into drag-end route rebuilds", async () => {
    const source = await readAppSource();
    const finishStart = source.indexOf("const finishNodeDrag = () =>");
    const finishEnd = source.indexOf("const finishTransformDrag", finishStart);
    const finishBlock = source.slice(finishStart, finishEnd);
    const moveStart = source.indexOf("const moveSelection =");
    const moveEnd = source.indexOf("const updateSelectedNode", moveStart);
    const moveBlock = source.slice(moveStart, moveEnd);
    const commitStart = source.indexOf("const commitFastMovedGraph");
    const commitEnd = source.indexOf("const clampPointToCanvas", commitStart);
    const commitBlock = source.slice(commitStart, commitEnd);

    expect(finishBlock).toContain("buildMovedNodeUpdates");
    expect(finishBlock).toContain("nextNodesForMovedGraphCommit(graphStore, movedNodeUpdates, dragNodeIds)");
    expect(finishBlock).not.toContain("nodes.map((node)");
    expect(finishBlock).not.toContain("edges.map((edge)");
    expect(finishBlock).not.toContain("new Map(adjustedAffectedEdges.map");
    expect(moveBlock).toContain("const affectedEdgesForMove = edgeListForNodeIds(moveNodeIds, moveEdgeIds)");
    expect(moveBlock).toContain("buildMovedNodeUpdates");
    expect(moveBlock).toContain("nextNodesForMovedGraphCommit(graphStore, movedNodeUpdates, selected)");
    expect(moveBlock).not.toContain("const affectedEdgesForMove = edges.filter");
    expect(moveBlock).not.toContain("nodes.map((node)");
    expect(moveBlock).not.toContain("edges.map((edge)");
    expect(moveBlock).not.toContain("new Map(adjustedAffectedEdges.map");
    expect(commitBlock).toContain("committedCandidateEdges");
    expect(commitBlock).toContain("rebuildExternalConnectionRoutesForMovedNodes(");
    expect(commitBlock).toContain("committedCandidateEdges");
    expect(commitBlock).toContain("rebuildMovedInternalConnectionRoutesBlockedByStationaryNodes(");
  });

  test("keeps overlap reconciliation scoped to local move candidate edges", async () => {
    const source = await readAppSource();
    const finalizeStart = source.indexOf("const finalizeMovedNodeEdgesFast");
    const finalizeEnd = source.indexOf("const optimizeMovedNodeEdgeRoutes", finalizeStart);
    const finalizeBlock = source.slice(finalizeStart, finalizeEnd);
    const finishStart = source.indexOf("const finishNodeDrag = () =>");
    const finishEnd = source.indexOf("const moveSelection", finishStart);
    const finishBlock = source.slice(finishStart, finishEnd);
    const moveStart = source.indexOf("const moveSelection =");
    const moveEnd = source.indexOf("const updateSelectedNode", moveStart);
    const moveBlock = source.slice(moveStart, moveEnd);

    expect(finalizeBlock).toContain("localCandidateEdges");
    expect(finalizeBlock).toContain("reconcileOverlappingTerminalConnections(");
    expect(finalizeBlock).toContain("movedNodeIdSet,\n      localCandidateEdges");
    expect(finishBlock).toContain("const synchronousCandidateEdges = synchronousEdgeAdjustmentCandidates(");
    expect(finishBlock).toContain("const adjustedSynchronousEdges = synchronousCandidateEdges.length > 0\n      ? adjustEdgesAfterNodeMove");
    expect(finishBlock).toContain("adjustedAffectedEdges,\n          activeDragging.nodeIds");
    expect(moveBlock).toContain("const synchronousCandidateEdges = synchronousEdgeAdjustmentCandidates(");
    expect(moveBlock).toContain("const adjustedSynchronousEdges = synchronousCandidateEdges.length > 0\n      ? adjustEdgesAfterNodeMove");
    expect(moveBlock).toContain("adjustedAffectedEdges,\n          moveNodeIds");
  });

  test("preserves moved connection geometry before deferred multi-node route repair", async () => {
    const source = await readAppSource();
    const finishStart = source.indexOf("const finishNodeDrag = () =>");
    const finishEnd = source.indexOf("const finishTransformDrag", finishStart);
    const finishBlock = source.slice(finishStart, finishEnd);
    const moveStart = source.indexOf("const moveSelection =");
    const moveEnd = source.indexOf("const updateSelectedNode", moveStart);
    const moveBlock = source.slice(moveStart, moveEnd);
    const commitStart = source.indexOf("const commitFastMovedGraphPatches");
    const commitEnd = source.indexOf("const clampPointToCanvas", commitStart);
    const commitBlock = source.slice(commitStart, commitEnd);
    const deferStart = commitBlock.indexOf("if (deferMovedRouteRepair)");
    const deferEnd = commitBlock.indexOf("return;", deferStart);
    const deferBlock = commitBlock.slice(deferStart, deferEnd);

    expect(finishBlock).toContain("adjustEdgesAfterNodeMove(");
    expect(finishBlock).toContain("Object.fromEntries(activeDragging.nodeIds.map((id) => [id, finalDelta]))");
    expect(moveBlock).toContain("adjustEdgesAfterNodeMove(");
    expect(moveBlock).toContain("deltasByNode");
    expect(deferBlock).toContain("const edgePatch = edgePatchFromCandidateEdges(previousCandidateEdges, committedCandidateEdges);");
    expect(deferBlock).toContain("graphStoreApplyPatch(current, {");
    expect(deferBlock).toContain("edgeUpserts: expectedPatch.edgeUpserts");
    expect(deferBlock).toContain("scheduleDeferredMovedConnectionRepair(");
    expect(deferBlock).toContain("previousNodes");
    expect(deferBlock).toContain("originalPositions");
    expect(deferBlock).toContain("originalRoutePoints");
    expect(deferBlock).not.toContain("graphStorePatchNodes(current, expectedPatch.nodeUpdates)");
  });

  test("only preserves whole route shape for connection lines whose endpoints both move", async () => {
    const source = await readAppSource();
    const boundaryStart = source.indexOf("const nodeMoveGeometryInsideCanvas =");
    const boundaryEnd = source.indexOf("const nearestBoundarySafeDelta", boundaryStart);
    const boundaryBlock = source.slice(boundaryStart, boundaryEnd);
    const finishStart = source.indexOf("const finishNodeDrag = () =>");
    const finishEnd = source.indexOf("const finishTransformDrag", finishStart);
    const finishBlock = source.slice(finishStart, finishEnd);
    const moveStart = source.indexOf("const moveSelection =");
    const moveEnd = source.indexOf("const updateSelectedNode", moveStart);
    const moveBlock = source.slice(moveStart, moveEnd);

    expect(source).toContain("const routePreserveEdgeIdsForMovedNodes =");
    expect(boundaryBlock).toContain("routePreserveEdgeIdsForMovedNodes(affectedEdges, nodeIds, edgeIds)");
    expect(finishBlock).toContain("routePreserveEdgeIdsForMovedNodes(activeDragging.affectedEdges, dragNodeIds, dragEdgeIds)");
    expect(moveBlock).toContain("routePreserveEdgeIdsForMovedNodes(affectedEdgesForMove, selected, selectedMoveEdgeIds)");
    expect(finishBlock).not.toContain("new Set(activeDragging.edgeIds),\n          finalBounds");
    expect(moveBlock).not.toContain("new Set(moveEdgeIds),\n          finalBounds");
  });

  test("preserves directly affected connection preview geometry when a move expands the canvas origin", async () => {
    const source = await readAppSource();
    const adjustStart = source.indexOf("const adjustEdgesAfterNodeMove =");
    const adjustEnd = source.indexOf("const rebuildSingleAffectedConnectionRoute", adjustStart);
    const adjustBlock = source.slice(adjustStart, adjustEnd);

    expect(adjustBlock).toContain("allowAutoExpandCanvas && hasCanvasOriginShift(leftTopCanvasOriginShiftForContent(Array.from(movedNextNodeById.values())));");
    expect(adjustBlock).toContain("(preserveAffectedRoutesForCanvasOriginShift && (sourceMoved || targetMoved))");
    expect(adjustBlock).toContain("preserveDraggedRouteShape({");
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
    expect(helperBlock).toContain("routeSpatialIndexRenderBounds(routedEdgeSpatialIndex, edge.id, 8) ?? routeRenderBounds(route, 8)");
    expect(helperBlock).toContain("boxesOverlap(routeBounds, movedCandidateBounds)");
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
    expect(source).toContain("routeStoreSetRoutes");
    expect(source).toContain("queryRouteSpatialIndex");
    expect(source).toContain("const routedEdgeSpatialIndex = routedEdgeStore.routeSpatialIndex");
    expect(scheduleBlock).toContain("const routeCandidateEdges = moveCandidateEdges.length > 0");
    expect(scheduleBlock).toContain("? moveCandidateEdges");
    expect(scheduleBlock).toContain(": localRouteOptimizationCandidateEdges");
    expect(scheduleBlock).toContain("const optimizationEdges = localRouteOptimizationEdges");
    expect(scheduleBlock).toContain("routeCandidateEdges");
    expect(scheduleBlock).toContain("!shouldRunDeferredMoveOptimization(optimizationEdges, movedNodeIds, selectedEdgeIds)");
    expect(scheduleBlock).toContain("const blockedRoutePoints = routePointsForMovedNodeBlockers(expectedNodes, latestOptimizationEdges, movedNodeIds, {});");
    expect(scheduleBlock).toContain("const blockedEdgeIds = new Set(Object.keys(blockedRoutePoints));");
    expect(scheduleBlock).toContain("!shouldRunDeferredMoveOptimization(latestOptimizationEdges, movedNodeIds, selectedEdgeIds, blockedEdgeIds)");
    expect(scheduleBlock).toContain("const dirtyOptimizedEdgeIds = new Set<string>([...blockedEdgeIds, ...forcedRerouteEdgeIds]);");
    expect(scheduleBlock).not.toContain("new Set<string>(optimizationEdges.map");
    expect(scheduleBlock).toContain("blockedRoutePoints");
    expect(scheduleBlock).not.toContain("dirtyEdgeIdsAfterMove(\n        expectedEdges,\n        optimized.edges,\n        movedNodeIds");
    expect(scheduleBlock).not.toContain("const expectedEdges = latestStore.edges");
    expect(scheduleBlock).not.toContain("expectedEdges,");
  });

  test("repairs local third-party routes after moving an unconnected graphic", async () => {
    const source = await readAppSource();
    const commitStart = source.indexOf("const commitFastMovedGraphPatches");
    const commitEnd = source.indexOf("const clampPointToCanvas", commitStart);
    const commitBlock = source.slice(commitStart, commitEnd);

    expect(commitBlock).toContain("const routeRepairCandidateEdges = wholeLayerMove");
    expect(commitBlock).toContain(": localRouteOptimizationCandidateEdges(");
    expect(commitBlock).toContain("!wholeLayerMove &&\n      shouldDeferSingleNodeTerminalReconciliation(");
    expect(commitBlock).toContain("movedNodeIds.length > 0 &&\n      (deferredRepairCandidateEdges.length > 0 || deferSingleNodeTerminalReconciliation)");
    expect(commitBlock).toContain("const deferredRepairCandidateEdges =");
    expect(commitBlock).toContain("mergeUniqueEdgesById(routeRepairCandidateEdges, internalMovedCandidateEdges)");
    expect(commitBlock).toContain("scheduleDeferredMovedConnectionRepair(\n            movedNodeIds,\n            deferredRepairCandidateEdges.length > 0 ? deferredRepairCandidateEdges : synchronousRepairCandidateEdges,");
    expect(commitBlock).toContain("scheduleMovedEdgeOptimization(");
    expect(commitBlock).toContain("previousNodes,\n        committedNextNodes,\n        routeRepairCandidateEdges,");
    expect(commitBlock).toContain("deferredRepairCandidateEdges,\n        expectedPatch");
    expect(commitBlock).not.toContain("const deferMovedRouteRepair = movedNodeIds.length > 0 && candidateEdges.length > 0;");
  });

  test("limits deferred drag route repair to actually interfered connection lines", async () => {
    const source = await readAppSource();
    const helperStart = source.indexOf("const routePointsForMovedEdgesBlockedByStationaryNodes");
    const helperEnd = source.indexOf("const sameOptionalPoint", helperStart);
    const helperBlock = source.slice(helperStart, helperEnd);
    const scheduleStart = source.indexOf("const scheduleDeferredMovedConnectionRepair");
    const scheduleEnd = source.indexOf("const commitFastMovedGraph", scheduleStart);
    const scheduleBlock = source.slice(scheduleStart, scheduleEnd);

    expect(helperStart).toBeGreaterThan(-1);
    expect(source).toContain("const MAX_DEFERRED_MOVE_REPAIR_MOVED_NODES = 16;");
    expect(source).toContain("const MAX_DEFERRED_MOVE_REPAIR_CANDIDATE_EDGES = 96;");
    expect(helperBlock).toContain("routeIntersectsSpecificNodes(route.points, edge, blockers)");
    expect(scheduleBlock).toContain("movedNodeIds.length === 0");
    expect(scheduleBlock).toContain("movedNodeIds.length > MAX_DEFERRED_MOVE_REPAIR_MOVED_NODES");
    expect(scheduleBlock).toContain("candidateEdges.length > MAX_DEFERRED_MOVE_REPAIR_CANDIDATE_EDGES");
    expect(scheduleBlock).toContain("const movedBlockerRoutePoints = routePointsForMovedNodeBlockers");
    expect(scheduleBlock).toContain("const stationaryBlockerRoutePoints = routePointsForMovedEdgesBlockedByStationaryNodes");
    expect(scheduleBlock).toContain("const blockerRoutePoints = { ...movedBlockerRoutePoints, ...stationaryBlockerRoutePoints };");
    expect(scheduleBlock).toContain("routePointsNearOriginalMovedNodes(");
    expect(scheduleBlock).toContain("const repairEdgeIds = new Set(Object.keys(repairRoutePoints));");
    expect(scheduleBlock).toContain("let optimizedEdges = workingCandidateEdges;");
    expect(scheduleBlock).toContain("if (repairEdgeIds.size > 0)");
    expect(scheduleBlock).toContain("const repairCandidateEdges = workingCandidateEdges.filter((edge) => repairEdgeIds.has(edge.id));");
    expect(scheduleBlock).toContain("repairCandidateEdges");
    expect(scheduleBlock).toContain("const deferredEdgePatch = edgePatchFromCandidateEdges(latestCandidateEdges, optimizedEdges);");
    expect(scheduleBlock).not.toContain("if (repairEdgeIds.size === 0)");
    expect(scheduleBlock).not.toContain("repairedEdges,\n        movedNodeIds,\n        repairCanvasBounds,\n        repairedEdges");
    expect(scheduleBlock).not.toContain("latestStore.edges");
    expect(scheduleBlock).not.toContain("latestNodes,\n        latestStore.edges");
  });

  test("keeps high-fanout drag-end deferred repair seeds compact", async () => {
    const source = await readAppSource();
    const helperStart = source.indexOf("const moveRouteRepairSeedEdges =");
    const helperEnd = source.indexOf("const commitFastMovedGraphPatches", helperStart);
    const helperBlock = source.slice(helperStart, helperEnd);
    const commitStart = source.indexOf("const commitFastMovedGraphPatches");
    const commitEnd = source.indexOf("const clampPointToCanvas", commitStart);
    const commitBlock = source.slice(commitStart, commitEnd);

    expect(helperStart).toBeGreaterThan(-1);
    expect(helperBlock).toContain("candidateEdges.length <= MAX_DEFERRED_MOVE_REPAIR_CANDIDATE_EDGES");
    expect(helperBlock).toContain("selectedEdgeIds.has(edge.id)");
    expect(helperBlock).toContain("Boolean(originalRoutePoints[edge.id]?.length)");
    expect(helperBlock).toContain("Boolean(edge.manualPoints?.length)");
    expect(helperBlock).toContain("movedBusNodeIds.has(edge.sourceId) || movedBusNodeIds.has(edge.targetId)");
    expect(commitBlock).toContain("const routeRepairSeedEdges = moveRouteRepairSeedEdges(");
    expect(commitBlock).toContain("routeRepairSeedEdges");
    expect(commitBlock).not.toContain("originalPositions,\n      committedCandidateEdges\n    );");
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
    expect(helperBlock).toContain("routeSpatialIndexRenderBounds(routedEdgeSpatialIndex, edge.id, 8) ?? routeRenderBounds(route, 8)");
    expect(source).not.toContain("const routePointBounds =");
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
    expect(rerouteBlock).toContain("searchEdges: Edge[] = edges");
    expect(rerouteBlock).toContain("? searchEdges.filter");
    expect(rerouteBlock).toContain("forcedEdgeIds.has(edge.id)");
  });

  test("spatially filters route blockers and connection segments before scoring commit candidates", async () => {
    const source = await readModelSource();
    const selectStart = source.indexOf("function selectFullRouteCandidate");
    const selectEnd = source.indexOf("function pathWithCrossingArcs", selectStart);
    const selectBlock = source.slice(selectStart, selectEnd);
    const commitStart = source.indexOf("function selectCommitSafeRoute");
    const commitEnd = source.indexOf("function designCommitSafeRoute", commitStart);
    const commitBlock = source.slice(commitStart, commitEnd);

    expect(source).toContain("function filterBlockersForRoutePoints");
    expect(source).toContain("function filterSegmentsForRoutePoints");
    expect(selectBlock).toContain("filterBlockersForRoutePoints(candidateRoute, blockers");
    expect(selectBlock).toContain("filterSegmentsForRoutePoints(candidateRoute, avoidedSegments");
    expect(commitBlock).toContain("filterBlockersForRoutePoints(simplified, nodes");
    expect(commitBlock).toContain("filterSegmentsForRoutePoints(simplified, avoidedSegments");
  });

  test("routes connection lines around device labels and the device-label gap", async () => {
    const source = await readModelSource();
    const blockerStart = source.indexOf("function computeRouteBlockerBox");
    const blockerEnd = source.indexOf("function routeBlockerBox", blockerStart);
    const blockerBlock = source.slice(blockerStart, blockerEnd);

    expect(source).toContain("function nodeLabelRouteBlockerBox");
    expect(source).toContain("function nodeLabelBridgeBlockerBox");
    expect(source).toContain("function mergeRouteBlockerBoxes");
    expect(blockerBlock).toContain("nodeLabelRouteBlockerBox(node, effectivePadding)");
    expect(blockerBlock).toContain("nodeLabelBridgeBlockerBox(node, bodyBox, labelBox, effectivePadding)");
    expect(blockerBlock).toContain("mergeRouteBlockerBoxes");
    expect(source).toContain("_labelText");
    expect(source).toContain("_labelX");
    expect(source).toContain("_labelY");
    expect(source).toContain("_labelDisplayMode");
    expect(source).toContain("_labelRotation");
    expect(source).toContain("_labelFontSize");
    expect(source).toContain("export const DEFAULT_DEVICE_LABEL_FONT_SIZE = 14;");
  });

  test("uses visible device label bounds for canvas culling, drag preview, and local route search", async () => {
    const source = await readAppSource();
    const renderStart = source.indexOf("const nodeRenderBounds");
    const renderEnd = source.indexOf("const nodeIntersectsRenderViewport", renderStart);
    const renderBlock = source.slice(renderStart, renderEnd);
    const previewStart = source.indexOf("const buildMultiNodeDragOverlayPreview");
    const previewEnd = source.indexOf("const renderMultiNodeDragOverlay", previewStart);
    const previewBlock = source.slice(previewStart, previewEnd);
    const localBoundsStart = source.indexOf("const boundsForNodeSet");
    const localBoundsEnd = source.indexOf("const localRouteOptimizationEdges", localBoundsStart);
    const localBoundsBlock = source.slice(localBoundsStart, localBoundsEnd);

    expect(source).toContain("calculateNodeVisualBounds");
    expect(source).toContain("function nodeVisualInteractionBounds");
    expect(renderBlock).toContain("calculateNodeVisualBounds(node, 24)");
    expect(previewBlock).toContain("nodeVisualInteractionBounds(node, originalPosition, 0, includeUprightContentInBounds)");
    expect(localBoundsBlock).toContain("nodeVisualInteractionBounds(node, position, padding)");
    expect(localBoundsBlock).not.toContain("const halfWidth = Math.abs(node.size.width * getNodeScaleX(node)) / 2");
  });

  test("commits device label footprint edits with canvas expansion and local route repair", async () => {
    const source = await readAppSource();
    const footprintStart = source.indexOf("const commitNodeFootprintUpdates");
    const footprintEnd = source.indexOf("const assignSelectedNodesToModelLayer", footprintStart);
    const footprintBlock = source.slice(footprintStart, footprintEnd);
    const updateParamStart = source.indexOf("const updateParam");
    const updateParamEnd = source.indexOf("const renderColorEditor", updateParamStart);
    const updateParamBlock = source.slice(updateParamStart, updateParamEnd);
    const finishDragStart = source.indexOf("const finishNodeLabelDrag");
    const finishDragEnd = source.indexOf("const finishNodeLabelRotateDrag", finishDragStart);
    const finishDragBlock = source.slice(finishDragStart, finishDragEnd);

    expect(source).toContain("const NODE_LABEL_FOOTPRINT_PARAM_KEYS");
    expect(footprintBlock).toContain("canvasBoundsForGraphContent");
    expect(footprintBlock).toContain("localRouteOptimizationCandidateEdges");
    expect(footprintBlock).toContain("routePointsForMovedNodeBlockers");
    expect(footprintBlock).toContain("optimizeMovedNodeEdgeRoutes");
    expect(footprintBlock).toContain("optimizedEdges === optimizationEdges");
    expect(footprintBlock).not.toContain("optimizedEdges === optimizedEdges");
    expect(updateParamBlock).toContain("NODE_LABEL_FOOTPRINT_PARAM_KEYS.has(key)");
    expect(updateParamBlock).toContain("commitNodeFootprintUpdates([nextNode]");
    expect(finishDragBlock).toContain("commitNodeFootprintUpdates([currentNode]");
  });

  test("keeps plain device parameter edits node-only with scoped undo snapshots", async () => {
    const source = await readAppSource();
    const updateStart = source.indexOf("const updateSelectedNode");
    const updateEnd = source.indexOf("const commitNodeFootprintUpdates", updateStart);
    const updateBlock = source.slice(updateStart, updateEnd);
    const updateParamStart = source.indexOf("const updateParam");
    const updateParamEnd = source.indexOf("const renderColorEditor", updateParamStart);
    const updateParamBlock = source.slice(updateParamStart, updateParamEnd);
    const treeIdentityStart = source.indexOf("const commitElementTreeNodeIdentity");
    const treeIdentityEnd = source.indexOf("const commitElementTreeContainerChildParam", treeIdentityStart);
    const treeIdentityBlock = source.slice(treeIdentityStart, treeIdentityEnd);
    const childParamStart = source.indexOf("const commitElementTreeContainerChildParam");
    const childParamEnd = source.indexOf("const terminalVbaseFallback", childParamStart);
    const childParamBlock = source.slice(childParamStart, childParamEnd);
    const terminalStart = source.indexOf("const updateTerminalVbase");
    const terminalEnd = source.indexOf("const renderColorEditor", terminalStart);
    const terminalBlock = source.slice(terminalStart, terminalEnd);

    expect(source).toContain("const pushNodeOnlyUndoSnapshot = (nodeId: string)");
    expect(updateBlock).toContain("pushNodeOnlyUndoSnapshot(selectedNodeId)");
    expect(updateParamBlock).toContain("pushNodeOnlyUndoSnapshot(selectedNodeId)");
    expect(updateParamBlock).toContain("if (NODE_LABEL_FOOTPRINT_PARAM_KEYS.has(key))");
    expect(updateParamBlock).toContain("commitNodeFootprintUpdates([nextNode]");
    expect(updateParamBlock).toContain("patchGraphNodes([nextNode]);");
    expect(updateParamBlock).not.toContain("pushUndoSnapshot();");
    expect(treeIdentityBlock).toContain("pushNodeOnlyUndoSnapshot(nodeId)");
    expect(childParamBlock).toContain("pushNodeOnlyUndoSnapshot(nodeId)");
    expect(terminalBlock).toContain("pushNodeOnlyUndoSnapshot(selectedNodeId)");
  });

  test("supports batch editing common selected-node parameters while excluding identity and geometry fields", async () => {
    const source = await readAppSource();
    const styles = await readStyles();
    const excludedStart = source.indexOf("const BATCH_PARAM_EXCLUDED_KEYS");
    const excludedEnd = source.indexOf("function readSavedProjects", excludedStart);
    const excludedBlock = source.slice(excludedStart, excludedEnd);
    const commonStart = source.indexOf("const batchCommonParamRows = useMemo");
    const commonEnd = source.indexOf("const selectedEdge =", commonStart);
    const commonBlock = source.slice(commonStart, commonEnd);
    const measurementCommonStart = source.indexOf("const batchCommonMeasurementGroupRows = useMemo");
    const measurementCommonEnd = source.indexOf("const selectedEdge =", measurementCommonStart);
    const measurementCommonBlock = source.slice(measurementCommonStart, measurementCommonEnd);
    const applyStart = source.indexOf("const applyBatchCommonParam =");
    const applyEnd = source.indexOf("const commitElementTreeNodeIdentity", applyStart);
    const applyBlock = source.slice(applyStart, applyEnd);
    const batchColorRenderStart = source.indexOf("const renderBatchCommonColorParamEditor =");
    const batchColorRenderEnd = source.indexOf("const renderBatchCommonParamEditor =", batchColorRenderStart);
    const batchColorRenderBlock = source.slice(batchColorRenderStart, batchColorRenderEnd);
    const renderStart = source.indexOf("const renderBatchCommonParamEditor =");
    const renderEnd = source.indexOf("const renderStaticButtonActionEditor", renderStart);
    const renderBlock = source.slice(renderStart, renderEnd);
    const paramOptionsStart = source.indexOf("const PARAM_OPTIONS: Record<string, string[]> =");
    const paramOptionsEnd = source.indexOf("const STATIC_BUTTON_ACTION_LABELS", paramOptionsStart);
    const paramOptionsBlock = source.slice(paramOptionsStart, paramOptionsEnd);
    const optionLabelsStart = source.indexOf("const PARAM_OPTION_LABELS: Record<string, Record<string, string>> =");
    const optionLabelsEnd = source.indexOf("const parseStaticButtonTargetLayerValues", optionLabelsStart);
    const optionLabelsBlock = source.slice(optionLabelsStart, optionLabelsEnd);
    const graphPanelStart = source.indexOf(') : inspectorTab === "graph" ? (');
    const graphPanelSwitch = source.indexOf(') : inspectorSelectedNode ? (', graphPanelStart);
    const graphPanelEnd = source.indexOf('<div className="device-param-stack">', graphPanelSwitch);
    const graphPanelBlock = source.slice(graphPanelStart, graphPanelEnd);
    const devicePanelStart = source.indexOf('<div className="device-param-stack">');
    const devicePanelEnd = source.indexOf("{selectedContainerParameterViews.length > 0", devicePanelStart);
    const devicePanelBlock = source.slice(devicePanelStart, devicePanelEnd);

    expect(source).toContain("type BatchCommonParamRow =");
    expect(source).toContain("type BatchCommonMeasurementGroupRow =");
    expect(source).toContain("const BATCH_GRAPH_PARAM_KEYS");
    expect(source).toContain("const isBatchGraphCommonParamKey = (key: string)");
    expect(source).toContain("const COLOR_PARAM_KEY_PATTERN");
    expect(source).toContain("const isColorParamKey = (key: string)");
    expect(source).toContain("const BATCH_PARAM_EXCLUDED_PREFIXES");
    expect(source).toContain("const canBatchEditParam = (key: string)");
    expect(excludedBlock).toContain("\"idx\"");
    expect(excludedBlock).toContain("\"name\"");
    expect(excludedBlock).toContain("\"graph_x\"");
    expect(excludedBlock).toContain("\"graph_y\"");
    expect(excludedBlock).toContain("\"layerId\"");
    expect(excludedBlock).toContain("\"terminalCount\"");
    expect(excludedBlock).toContain("ALLOW_RESIZE_TRANSFORM_PARAM");
    expect(commonBlock).toContain("activeSelectedNodeIds.flatMap((nodeId) => nodeById.get(nodeId) ?? [])");
    expect(commonBlock).toContain("selectedNodes.length < 2");
    expect(commonBlock).toContain("canBatchEditParam(key)");
    expect(commonBlock).toContain("selectedNodes.every((node) => Object.prototype.hasOwnProperty.call(node.params, key))");
    expect(commonBlock).toContain("mixed: values.some((value) => value !== values[0])");
    expect(commonBlock).toContain("const batchCommonGraphicParamRows = useMemo");
    expect(commonBlock).toContain("batchCommonParamRows.filter((row) => isBatchGraphCommonParamKey(row.key))");
    expect(commonBlock).toContain("const batchCommonModelParamRows = useMemo");
    expect(commonBlock).toContain("batchCommonParamRows.filter((row) => !isBatchGraphCommonParamKey(row.key))");
    expect(commonBlock).toContain("const hasBatchCommonPropertyRows =");
    expect(commonBlock).toContain("batchCommonGraphicParamRows.length > 0");
    expect(commonBlock).toContain("batchCommonModelParamRows.length > 0");
    expect(commonBlock).toContain("batchCommonMeasurementGroupRows.length > 0");
    expect(measurementCommonBlock).toContain("activeSelectedNodeIds.flatMap((nodeId) => nodeById.get(nodeId) ?? [])");
    expect(measurementCommonBlock).toContain("selectedNodes.length < 2");
    expect(measurementCommonBlock).toContain("measurementGroupsForNode(projectMeasurements, node.id)");
    expect(measurementCommonBlock).toContain("measurementGroups.length === 0");
    expect(measurementCommonBlock).toContain("measurementGroupCommonValue(group, key)");
    expect(measurementCommonBlock).toContain("mixed: values.some((value) => value !== values[0])");
    expect(applyBlock).toContain("if (!requireEditMode(\"批量修改图元参数\"))");
    expect(applyBlock).toContain("const targetNodes = activeSelectedNodeIds.flatMap((nodeId) => nodeById.get(nodeId) ?? [])");
    expect(applyBlock).toContain("const nextNodes = targetNodes");
    expect(applyBlock).toContain("const normalizedLabelDisplayMode = key === \"_labelDisplayMode\" ? normalizeNodeLabelDisplayMode(value) : undefined");
    expect(applyBlock).toContain("const normalizedLabelVisible = normalizedLabelDisplayMode === \"hidden\" ? \"0\" : \"1\"");
    expect(applyBlock).toContain("node.params._labelDisplayMode !== normalizedLabelDisplayMode || node.params._labelVisible !== normalizedLabelVisible");
    expect(applyBlock).toContain("node.params[key] !== value");
    expect(applyBlock).toContain("params: { ...node.params, _labelDisplayMode: normalizedLabelDisplayMode, _labelVisible: normalizedLabelVisible }");
    expect(applyBlock).toContain("pushUndoSnapshot(true, false");
    expect(applyBlock).toContain("commitNodeFootprintUpdates(nextNodes);");
    expect(applyBlock).toContain("patchGraphNodes(nextNodes);");
    expect(applyBlock).toContain("const applyBatchCommonMeasurementGroupSetting =");
    expect(applyBlock).toContain("if (!requireEditMode(\"批量修改量测属性\"))");
    expect(applyBlock).toContain("selectedNodeIdsWithMeasurementGroups");
    expect(applyBlock).toContain("measurementGroupWithCommonSetting(group, key, value)");
    expect(applyBlock).toContain("updateProjectMeasurementsWithUndo(");
    expect(applyBlock).toContain("`批量修改量测属性：${BATCH_MEASUREMENT_GROUP_LABELS[key]}`");
    expect(renderBlock).toContain("row.mixed ? \"\" : row.value");
    expect(renderBlock).toContain("placeholder={row.mixed ? \"多个不同值\" : undefined}");
    expect(renderBlock).toContain("applyBatchCommonParam(row.key, event.target.value)");
    expect(renderBlock).toContain("paramOptionsForSection(row.key)");
    expect(renderBlock).toContain("if (isColorParamKey(row.key))");
    expect(renderBlock).toContain("renderBatchCommonColorParamEditor(row)");
    expect(batchColorRenderBlock).toContain("type=\"color\"");
    expect(batchColorRenderBlock).toContain("placeholder={row.mixed ? \"多个不同值\" : undefined}");
    expect(batchColorRenderBlock).toContain("applyBatchCommonParam(row.key, \"transparent\")");
    expect(batchColorRenderBlock).toContain(">无颜色</button>");
    expect(paramOptionsBlock).toContain("_labelDisplayMode: [\"always\", \"hidden\", \"follow\"]");
    expect(paramOptionsBlock).toContain("_labelVisible: [\"1\", \"0\"]");
    expect(paramOptionsBlock).toContain("_labelTextAnchor: [\"start\", \"middle\", \"end\"]");
    expect(paramOptionsBlock).toContain("_labelRotation: [\"0\", \"90\", \"180\", \"270\"]");
    expect(paramOptionsBlock).toContain("_labelFontStyle: [\"normal\", \"italic\"]");
    expect(paramOptionsBlock).toContain("_labelTextDecoration: [\"none\", \"underline\"]");
    expect(paramOptionsBlock).toContain("_labelFontWeight: [\"400\", \"500\", \"700\", \"900\"]");
    expect(optionLabelsBlock).toContain("_labelDisplayMode:");
    expect(optionLabelsBlock).toContain("_labelTextAnchor:");
    expect(optionLabelsBlock).toContain("_labelRotation:");
    expect(optionLabelsBlock).toContain("_labelFontStyle:");
    expect(optionLabelsBlock).toContain("_labelTextDecoration:");
    expect(optionLabelsBlock).toContain("_labelFontWeight:");
    expect(renderBlock).toContain("const renderBatchCommonParamTable = (");
    expect(renderBlock).toContain("aria-label={`${title}共同属性表`}");
    expect(renderBlock).toContain("renderBatchCommonParamEditor(row)");
    expect(renderBlock).toContain("const renderBatchCommonMeasurementGroupEditor =");
    expect(renderBlock).toContain("const renderBatchCommonMeasurementGroupColorEditor =");
    expect(renderBlock).toContain("const renderBatchCommonMeasurementGroupTable = () =>");
    expect(renderBlock).toContain("aria-label=\"量测共同属性表\"");
    expect(renderBlock).toContain("renderBatchCommonMeasurementGroupEditor(row)");
    expect(renderBlock).toContain("renderBatchCommonMeasurementGroupColorEditor(row)");
    expect(renderBlock).toContain("applyBatchCommonMeasurementGroupSetting(row.key, \"transparent\")");
    expect(renderBlock).toContain("batchCommonMeasurementGroupRows.map((row)");
    expect(renderBlock).toContain("const renderBatchCommonPropertyPanel = () => (");
    expect(renderBlock).toContain("aria-label=\"批量修改共同属性\"");
    expect(renderBlock).toContain("renderBatchCommonParamTable(\"图形\", batchCommonGraphicParamRows");
    expect(renderBlock).toContain("renderBatchCommonParamTable(\"模型\", batchCommonModelParamRows");
    expect(renderBlock).toContain("renderBatchCommonMeasurementGroupTable()");
    expect(graphPanelBlock).toContain("const multiNodeGraphSelection = activeSelectedNodeIds.length > 1");
    expect(graphPanelBlock).toContain("disabled={multiNodeGraphSelection || !inspectorSelectedNode}");
    expect(graphPanelBlock).toContain("disabled={multiNodeGraphSelection || !inspectorSelectedNode || isStaticNode(inspectorSelectedNode)}");
    expect(graphPanelBlock).toContain("multiNodeGraphSelection &&");
    expect(graphPanelBlock).toContain("共同属性");
    expect(graphPanelBlock).toContain("className=\"active\"");
    expect(graphPanelBlock).toContain("aria-selected={true}");
    expect(graphPanelBlock).toContain("className=\"batch-common-scroll-area\"");
    expect(graphPanelBlock).toContain("hasBatchCommonPropertyRows ? renderBatchCommonPropertyPanel()");
    expect(graphPanelBlock).toContain("当前选中的图元没有可批量修改的共同属性。");
    expect(graphPanelBlock).toContain(") : inspectorSelectedNode ? (");
    expect(devicePanelBlock).not.toContain("renderBatchCommonPropertyPanel()");
    expect(styles).toContain(".batch-param-panel");
    expect(styles).toContain(".batch-param-summary");
    expect(styles).toContain(".batch-common-table-stack");
    expect(styles).toContain(".batch-common-table-section");
    expect(styles).toContain(".batch-common-name-col");
    expect(styles).toContain(".batch-common-scroll-area");
    expect(styles).toContain("overflow-y: auto;");
  });

  test("formats model pbase and qbase rows without unit suffixes", async () => {
    const source = await readAppSource();
    const formatterStart = source.indexOf("const formatDeviceModelParamDisplayValue =");
    const formatterEnd = source.indexOf("const renderColorEditor =", formatterStart);
    const formatterBlock = source.slice(formatterStart, formatterEnd);
    const devicePanelStart = source.indexOf("<div className=\"device-param-stack\">");
    const devicePanelEnd = source.indexOf("{singleSelectedDeviceForInspector", devicePanelStart);
    const devicePanelBlock = source.slice(devicePanelStart, devicePanelEnd);

    expect(source).toContain("formatPowerBaseDisplayValue,");
    expect(formatterBlock).toContain("formatPowerBaseDisplayValue(key, value)");
    expect(devicePanelBlock).toContain("formatDeviceModelParamDisplayValue(row.key, row.value)");
    expect(devicePanelBlock).toContain("formatDeviceModelParamDisplayValue(key, value)");
    expect(devicePanelBlock).toContain("renderParamEditor(key, displayValue, false)");
  });

  test("shows topology connection card only for one selected device", async () => {
    const source = await readAppSource();
    const selectionStart = source.indexOf("const inspectorSelectedNode = selectedNode;");
    const selectionEnd = source.indexOf("const selectedMeasurementGroups = useMemo", selectionStart);
    const selectionBlock = source.slice(selectionStart, selectionEnd);
    const connectionCardIndex = source.indexOf("<span>连接度</span>");
    const connectionCardGuard = source.slice(Math.max(0, connectionCardIndex - 180), connectionCardIndex);

    expect(selectionBlock).toContain("const singleSelectedDeviceForInspector = Boolean(");
    expect(selectionBlock).toContain("inspectorSelectedNode");
    expect(selectionBlock).toContain("!isStaticNode(inspectorSelectedNode)");
    expect(selectionBlock).toContain("activeSelectedNodeIds.length === 1");
    expect(selectionBlock).toContain("activeSelectedEdgeIds.length === 0");
    expect(connectionCardGuard).toContain("{singleSelectedDeviceForInspector && inspectorSelectedNode && inspectorTab === \"graph\" && (");
    expect(source).not.toContain("{inspectorSelectedNode && inspectorTab === \"graph\" && (");
  });

  test("caps orthogonal routing lane candidates to avoid quadratic searches in dense connection areas", async () => {
    const source = await readModelSource();
    const laneStart = source.indexOf("function candidateLanes");
    const laneEnd = source.indexOf("function buildRouteCandidates", laneStart);
    const laneBlock = source.slice(laneStart, laneEnd);
    const candidateStart = source.indexOf("function routeCandidatesFromLanes");
    const candidateEnd = source.indexOf("function candidateLanes", candidateStart);
    const candidateBlock = source.slice(candidateStart, candidateEnd);
    const expandedStart = source.indexOf("function buildExpandedRouteCandidates");
    const expandedEnd = source.indexOf("function selectRouteCandidate", expandedStart);
    const expandedBlock = source.slice(expandedStart, expandedEnd);

    expect(source).toContain("const ROUTE_MAX_LANES_PER_AXIS");
    expect(source).toContain("const ROUTE_MAX_LANE_PAIRS");
    expect(source).toContain("function prioritizeLaneValues");
    expect(source).toContain("function prioritizeLanePairs");
    expect(laneBlock).toContain("prioritizeLaneValues");
    expect(candidateBlock).toContain("prioritizeLanePairs(xs, ys");
    expect(candidateBlock).toContain("for (const { x, y } of lanePairs)");
    expect(expandedBlock).toContain("ROUTE_MAX_LANE_PAIRS * 2");
    expect(laneBlock).not.toContain("return { xs: uniqueSorted(xValues), ys: uniqueSorted(yValues) };");
    expect(candidateBlock).not.toContain("for (const x of xs) {\n    for (const y of ys)");
  });

  test("caps bus endpoint landing combinations before full route design", async () => {
    const source = await readModelSource();
    const busStart = source.indexOf("function busOptimizedEdgeCandidates");
    const busEnd = source.indexOf("type DesignedCommitRoute", busStart);
    const busBlock = source.slice(busStart, busEnd);

    expect(source).toContain("const ROUTE_MAX_BUS_ENDPOINT_CANDIDATES");
    expect(source).toContain("function prioritizeBusOptimizedEdgeCandidates");
    expect(busBlock).toContain("prioritizeBusOptimizedEdgeCandidates(candidates");
    expect(busBlock).toContain("ROUTE_MAX_BUS_ENDPOINT_CANDIDATES");
    expect(busBlock).not.toContain("return candidates.filter((candidate) =>");
  });

  test("validates and prepares edited connection lines without rebuilding every route", async () => {
    const source = await readModelSource();
    const validationStart = source.indexOf("export function validateConnectionEdgeRoute");
    const validationEnd = source.indexOf("function commitManualPointsFromRoute", validationStart);
    const validationBlock = source.slice(validationStart, validationEnd);
    const prepareStart = source.indexOf("export function prepareConnectionEdgeForCommit");
    const prepareEnd = source.indexOf("export function rebuildSingleConnectionRoute", prepareStart);
    const prepareBlock = source.slice(prepareStart, prepareEnd);

    expect(source).toContain("function routeSingleConnectionForValidation");
    expect(validationBlock).toContain("routeSingleConnectionForValidation(nodes, edge, bounds)");
    expect(validationBlock).not.toContain("routeEdgesForIncrementalRendering");
    expect(validationBlock).not.toContain("routeEdgesForRendering(nodes, edges");
    expect(prepareBlock).toContain("designCommitSafeRoute(nodes, [edgeForDesign]");
    expect(prepareBlock).not.toContain("designCommitSafeRoute(nodes, edges");
    expect(prepareBlock).toContain("routeSingleConnectionForValidation(nodes, edgeForDesign, bounds)");
    expect(prepareBlock).not.toContain("routeEdgesForRendering(nodes, candidateEdges");
  });

  test("passes only the edited connection candidate into commit preparation", async () => {
    const source = await readAppSource();
    const newConnectionStart = source.indexOf("const commitNewConnectionEdge =");
    const newConnectionEnd = source.indexOf("const finishConnectToTarget", newConnectionStart);
    const newConnectionBlock = source.slice(newConnectionStart, newConnectionEnd);
    const rewireStart = source.indexOf("const finishRewiring =");
    const rewireEnd = source.indexOf("const handleDrop", rewireStart);
    const rewireBlock = source.slice(rewireStart, rewireEnd);
    const terminalRewireStart = source.indexOf("const otherNode = edge ? nodeById.get(rewiring.endpoint === \"source\" ? edge.targetId : edge.sourceId)");
    const terminalRewireEnd = source.indexOf("if (!connectSource)", terminalRewireStart);
    const terminalRewireBlock = source.slice(terminalRewireStart, terminalRewireEnd);

    expect(newConnectionBlock).toContain("routingNodesForConnectionEdge(newEdge)");
    expect(newConnectionBlock).toContain("[newEdge]");
    expect(newConnectionBlock).not.toContain("[...visibleEdges, newEdge]");
    expect(rewireBlock).toContain("routingNodesForConnectionEdge(candidateEdge, nodes)");
    expect(rewireBlock).toContain("[candidateEdge]");
    expect(rewireBlock).not.toContain("edges.map((item) => item.id === rewiring.edgeId ? candidateEdge : item)");
    expect(terminalRewireBlock).toContain("routingNodesForConnectionEdge(candidateEdge, nodes)");
    expect(terminalRewireBlock).toContain("[candidateEdge]");
    expect(terminalRewireBlock).not.toContain("edges.map((item) => item.id === edge.id ? candidateEdge : item)");
  });

  test("defers full terminal overlap detection off the drag release frame", async () => {
    const source = await readAppSource();
    const overlapStart = source.indexOf("const terminalOverlapNodes");
    const overlapEnd = source.indexOf("const nodeTerminalSnapTarget", overlapStart);
    const overlapBlock = source.slice(overlapStart, overlapEnd);

    expect(source).toContain("const dragInteractionNodes = useMemo");
    expect(source).toContain("const dragPreviewMovedNodeById = useMemo");
    expect(source).not.toContain("Array.from(dragPreviewNodeById.values()).filter");
    expect(source).toContain("const TERMINAL_OVERLAP_DEFER_NODE_THRESHOLD");
    expect(source).toContain("const [staticTerminalOverlapReadyKey");
    expect(source).toContain("const staticTerminalOverlapDeferred =");
    expect(source).toContain("return scheduleIdleWork(() => setStaticTerminalOverlapReadyKey(staticTerminalOverlapSourceKey), 120, 1500);");
    expect(overlapBlock).toContain("? dragInteractionNodes");
    expect(overlapBlock).toContain("? viewportNodes");
    expect(overlapBlock).toContain(": []");
    expect(overlapBlock).toContain("if (suppressDragTerminalInteraction)");
    expect(overlapBlock).toContain("if (!terminalOverlapCalculationReady)");
    expect(overlapBlock).toContain("terminalOverlapAffectedNodeIds");
    expect(overlapBlock).toContain("getOverlappingTerminalGroups(terminalOverlapNodes, terminalOverlapAffectedNodeIds)");
    expect(overlapBlock).toContain("getTerminalBusContactGroups(terminalOverlapNodes, 0, terminalOverlapAffectedNodeIds)");
    expect(overlapBlock).not.toContain("getOverlappingTerminalGroups(dragPreviewNodes, dragging ? draggingNodeIdSet : undefined)");
  });

  test("coalesces connection target lookup and limits drag-preview nodes for large diagrams", async () => {
    const source = await readAppSource();
    const pointerStart = source.indexOf("const handlePointerMove = (event: PointerEvent<SVGSVGElement>)");
    const pointerEnd = source.indexOf("const handleWheel", pointerStart);
    const pointerBlock = source.slice(pointerStart, pointerEnd);
    const connectSchedulerStart = source.indexOf("const scheduleConnectPreviewPoint");
    const connectSchedulerEnd = source.indexOf("const resetConnectPreviewState", connectSchedulerStart);
    const connectSchedulerBlock = source.slice(connectSchedulerStart, connectSchedulerEnd);
    const dragPreviewStart = source.indexOf("const dragInteractionNodes = useMemo");
    const dragPreviewEnd = source.indexOf("const dragPreviewEdgeIdSet", dragPreviewStart);
    const dragPreviewBlock = source.slice(dragPreviewStart, dragPreviewEnd);

    expect(pointerBlock).toContain("scheduleConnectPreviewPoint(previewPoint)");
    expect(pointerBlock).not.toContain("findConnectTargetAtPoint(previewPoint)");
    expect(connectSchedulerBlock).toContain("window.requestAnimationFrame");
    expect(connectSchedulerBlock).toContain("const target = next.point ? findConnectTargetAtPoint(next.point) : null");
    expect(source).toContain("const connectTargetSearchBounds = (point: Point)");
    expect(source).toContain("const searchBounds = connectTargetSearchBounds(point)");
    expect(source).toContain("queryNodeSpatialIndex(visibleNodeSpatialIndex, searchBounds)");
    expect(dragPreviewBlock).toContain("dragInteractionBounds");
    expect(dragPreviewBlock).toContain("candidateNodeIntersectsInteractionBounds");
    expect(source).toContain("const buildDragPreviewEndpointPoints =");
    expect(source).toContain("const buildLightweightNodeDragPreviewRoutes =");
    expect(dragPreviewBlock).toContain("buildLightweightNodeDragPreviewRoutes(dragging, draggingDelta, previewEdges)");
    expect(dragPreviewBlock).not.toContain("nextNodes: dragInteractionNodes");
    expect(dragPreviewBlock).not.toContain("Array.from(dragPreviewNodeById.values())");
  });

  test("uses node spatial indexes for connection hit tests and drag interaction candidates", async () => {
    const source = await readAppSource();
    const findConnectStart = source.indexOf("const findConnectTargetAtPoint = (point: Point)");
    const findConnectEnd = source.indexOf("const commitNewConnectionEdge", findConnectStart);
    const findConnectBlock = source.slice(findConnectStart, findConnectEnd);
    const findRewireStart = source.indexOf("const findRewireTargetAtPoint = (point: Point");
    const findRewireEnd = source.indexOf("const findConnectTargetAtPoint", findRewireStart);
    const findRewireBlock = source.slice(findRewireStart, findRewireEnd);
    const dragPreviewStart = source.indexOf("const dragInteractionNodes = useMemo");
    const dragPreviewEnd = source.indexOf("const terminalOverlapNodes", dragPreviewStart);
    const dragPreviewBlock = source.slice(dragPreviewStart, dragPreviewEnd);
    const nodeQueryStart = source.indexOf("function queryNodeSpatialIndex");
    const nodeQueryEnd = source.indexOf("const compactPreviewNodes", nodeQueryStart);
    const nodeQueryBlock = source.slice(nodeQueryStart, nodeQueryEnd);

    expect(source).toContain("type SpatialQueryState =");
    expect(source).toContain("const nextSpatialQueryMark =");
    expect(source).toContain("function buildNodeSpatialIndex");
    expect(source).toContain("function queryNodeSpatialIndex");
    expect(nodeQueryBlock).toContain("const queryMark = nextSpatialQueryMark(index.queryState);");
    expect(nodeQueryBlock).toContain("seenById.get(node.id) === queryMark");
    expect(nodeQueryBlock).not.toContain("const seen = new Set<string>();");
    expect(source).toContain("const visibleNodeSpatialIndex = visibleProject.nodeSpatialIndex");
    expect(findConnectBlock).toContain("queryNodeSpatialIndex(visibleNodeSpatialIndex, searchBounds)");
    expect(findConnectBlock).not.toContain("for (const node of visibleNodes)");
    expect(findRewireBlock).toContain("queryNodeSpatialIndex(visibleNodeSpatialIndex, searchBounds)");
    expect(findRewireBlock).not.toContain("for (const node of visibleNodes)");
    expect(dragPreviewBlock).toContain("queryNodeSpatialIndex(visibleNodeSpatialIndex, dragInteractionBounds)");
    expect(dragPreviewBlock).not.toContain("for (const node of visibleNodes)");
  });

  test("shows smart alignment guides and snaps node drag deltas to visible nearby nodes", async () => {
    const source = await readAppSource();
    const styleSource = await readStyles();
    const dragStart = source.indexOf("const computeSmartAlignmentSnap =");
    const dragEnd = source.indexOf("const computeNodeDragPreviewDelta =", dragStart);
    const smartAlignBlock = source.slice(dragStart, dragEnd);
    const previewStart = source.indexOf("const computeNodeDragPreviewDelta =");
    const previewEnd = source.indexOf("const computeNodeDragDelta =", previewStart);
    const previewBlock = source.slice(previewStart, previewEnd);
    const renderStart = source.indexOf("{smartAlignmentGuides.map");
    const renderEnd = source.indexOf("{dragging?.historyCaptured", renderStart);
    const renderBlock = source.slice(renderStart, renderEnd);
    const clearStart = source.indexOf("const clearDraggingMoveState =");
    const clearEnd = source.indexOf("const cancelActiveEditInteractions", clearStart);
    const clearBlock = source.slice(clearStart, clearEnd);
    const finishDragStart = source.indexOf("const finishNodeDrag = () =>");
    const finishDragEnd = source.indexOf("const finishTransformDrag", finishDragStart);
    const finishDragBlock = source.slice(finishDragStart, finishDragEnd);
    const moveSelectionStart = source.indexOf("const moveSelection =");
    const moveSelectionEnd = source.indexOf("const updateSelectedNode", moveSelectionStart);
    const moveSelectionBlock = source.slice(moveSelectionStart, moveSelectionEnd);

    expect(source).toContain("type SmartAlignmentGuide =");
    expect(source).toContain("const SMART_ALIGNMENT_SNAP_SCREEN_TOLERANCE = 8;");
    expect(source).toContain("const [smartAlignmentGuides, setSmartAlignmentGuides] = useState<SmartAlignmentGuide[]>([]);");
    expect(source).toContain("const smartAlignmentGuidesRef = useRef<SmartAlignmentGuide[]>([]);");
    expect(smartAlignBlock).toContain("queryNodeSpatialIndex(visibleNodeSpatialIndex, verticalSearchBounds)");
    expect(smartAlignBlock).toContain("queryNodeSpatialIndex(visibleNodeSpatialIndex, horizontalSearchBounds)");
    expect(smartAlignBlock).toContain("draggedNodeIds.has(candidate.id)");
    expect(smartAlignBlock).toContain("const xSnap = bestSmartAlignmentAxisSnap");
    expect(smartAlignBlock).toContain("const ySnap = bestSmartAlignmentAxisSnap");
    expect(previewBlock).toContain("const smartSnap = computeSmartAlignmentSnap(dragState, movementDelta, ctrlKey || shiftKey);");
    expect(previewBlock).toContain("updateSmartAlignmentGuides(smartSnap.guides);");
    expect(previewBlock).toContain("return smartSnap.delta;");
    expect(source).toContain("updateSmartAlignmentGuides([]);");
    expect(clearBlock).toContain("updateSmartAlignmentGuides([]);");
    expect(finishDragBlock).toContain("updateSmartAlignmentGuides([]);");
    expect(finishDragBlock.indexOf("updateSmartAlignmentGuides([]);")).toBeLessThan(finishDragBlock.indexOf("resetMultiNodeDragOverlayTransform();"));
    expect(moveSelectionBlock).toContain("updateSmartAlignmentGuides([]);");
    expect(renderBlock).toContain("className={`smart-alignment-guide smart-alignment-guide-${guide.orientation}`}");
    expect(renderBlock).toContain("vectorEffect=\"non-scaling-stroke\"");
    expect(styleSource).toContain(".smart-alignment-guide");
    expect(styleSource).toContain(".smart-alignment-guide-vertical");
    expect(styleSource).toContain(".smart-alignment-guide-horizontal");
  });

  test("adds terminal outflow axes to smart alignment guides for off-center terminals", async () => {
    const source = await readAppSource();
    const helperStart = source.indexOf("function nodeTerminalOutflowSmartAlignmentAnchors");
    const helperEnd = source.indexOf("function nodeSmartAlignmentBounds", helperStart);
    const helperBlock = source.slice(helperStart, helperEnd);
    const computeStart = source.indexOf("const computeSmartAlignmentSnap =");
    const computeEnd = source.indexOf("const computeNodeDragPreviewDelta =", computeStart);
    const computeBlock = source.slice(computeStart, computeEnd);

    expect(helperStart).toBeGreaterThan(-1);
    expect(source).toContain("type SmartAlignmentAnchorMap = Record<SmartAlignmentAxis, SmartAlignmentAnchor[]>;");
    expect(helperBlock).toContain("getTerminalPoint(positionedNode, terminal.id)");
    expect(helperBlock).toContain("getRouteEndpointNormal(positionedNode, terminalPoint");
    expect(helperBlock).toContain("normal.x !== 0");
    expect(helperBlock).toContain("anchors.y.push");
    expect(helperBlock).toContain("normal.y !== 0");
    expect(helperBlock).toContain("anchors.x.push");
    expect(computeBlock).toContain("const draggedTerminalAnchors = terminalOutflowAnchorsForSmartAlignmentDrag(dragState, movementDelta);");
    expect(computeBlock).toContain("anchors: nodeTerminalOutflowSmartAlignmentAnchors(candidate, candidate.position)");
    expect(computeBlock).toContain("bestSmartAlignmentAxisSnap(\"x\", draggedBounds, draggedTerminalAnchors.x");
    expect(computeBlock).toContain("bestSmartAlignmentAxisSnap(\"y\", draggedBounds, draggedTerminalAnchors.y");
  });

  test("uses node body bounds rather than labels or terminals for smart alignment centers", async () => {
    const source = await readAppSource();
    const helperStart = source.indexOf("function nodeSmartAlignmentBounds");
    const helperEnd = source.indexOf("function nodeVisualInteractionBounds", helperStart);
    const helperBlock = source.slice(helperStart, helperEnd);
    const dragStart = source.indexOf("const dragBoundsForSmartAlignment =");
    const dragEnd = source.indexOf("const computeSmartAlignmentSnap =", dragStart);
    const dragBoundsBlock = source.slice(dragStart, dragEnd);
    const computeStart = source.indexOf("const computeSmartAlignmentSnap =");
    const computeEnd = source.indexOf("const computeNodeDragPreviewDelta =", computeStart);
    const computeBlock = source.slice(computeStart, computeEnd);

    expect(helperStart).toBeGreaterThan(-1);
    expect(helperBlock).toContain("nodeTransformedHalfExtents(node, includeUprightContent)");
    expect(helperBlock).not.toContain("calculateNodeVisualBounds");
    expect(dragBoundsBlock).toContain("const nodeBounds = nodeSmartAlignmentBounds(node, movedPosition, nodeHasUprightBoundsContent(node));");
    expect(dragBoundsBlock).not.toContain("nodeVisualInteractionBounds(node, movedPosition");
    expect(computeBlock).toContain("bounds: nodeSmartAlignmentBounds(candidate, candidate.position, nodeHasUprightBoundsContent(candidate))");
  });

  test("keeps graph nodes and edges in a normalized store instead of array state", async () => {
    const source = await readAppSource();

    expect(source).toContain("const [graphStore, setGraphStore] = useState");
    expect(source).toContain("createGraphStore(initialIndexedNodes.nodes, initialLayeredProject.edges)");
    expect(source).toContain("const nodes = graphStore.nodes");
    expect(source).toContain("const edges = graphStore.edges");
    expect(source).toContain("const nodeById = graphStore.nodeMap");
    expect(source).toContain("const edgeById = graphStore.edgeMap");
    expect(source).toContain("const edgesByNodeId = graphStore.edgesByNodeId");
    expect(source).toContain("const visibleNodeSpatialIndex = visibleProject.nodeSpatialIndex");
    expect(source).toContain("graphStorePatchGraphFromArrays");
    expect(source).toContain("graphStorePatchNodes");
    expect(source).toContain("graphStorePatchEdges");
    expect(source).toContain("const patchGraphNodes");
    expect(source).toContain("const patchGraphEdges");
    expect(source).not.toContain("const [nodes, setNodes] = useState<ModelNode[]>");
    expect(source).not.toContain("const [edges, setEdges] = useState<Edge[]>");
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
    expect(dragMoveBlock).toContain("ensureDraggingUndoSnapshot");
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
    expect(undoActionBlock).toContain("applyUndoGraphSnapshot(snapshot);");
    expect(undoActionBlock).not.toContain("markRouteEdgesDirty(new Set([");
    expect(undoActionBlock).not.toContain("...snapshot.edges.map((edge) => edge.id)");
  });

  test("patches lightweight undo snapshots instead of rebuilding the whole graph", async () => {
    const source = await readAppSource();
    const snapshotStart = source.indexOf("const cloneProjectState");
    const snapshotEnd = source.indexOf("const pushUndoSnapshot", snapshotStart);
    const snapshotBlock = source.slice(snapshotStart, snapshotEnd);
    const undoPatchStart = source.indexOf("const undoGraphSnapshotPatchPlan");
    const undoPatchEnd = source.indexOf("const pushUndoSnapshot", undoPatchStart);
    const undoPatchBlock = source.slice(undoPatchStart, undoPatchEnd);
    const undoActionStart = source.indexOf("const undoLastOperation = () =>");
    const undoActionEnd = source.indexOf("useEffect(() =>", undoActionStart);
    const undoActionBlock = source.slice(undoActionStart, undoActionEnd);

    expect(source).toContain("graphSnapshotMode: \"deep\" | \"reference\"");
    expect(snapshotBlock).toContain("graphSnapshotMode: deepModelSnapshot ? \"deep\" : \"reference\"");
    expect(undoPatchStart).toBeGreaterThan(-1);
    expect(undoPatchBlock).toContain("snapshot.graphSnapshotMode !== \"reference\"");
    expect(undoPatchBlock).toContain("return { mode: \"full\"");
    expect(undoPatchBlock).toContain("graphStorePatchGraphFromArrays(current, snapshot.nodes, snapshot.edges");
    expect(undoPatchBlock).toContain("graphStoreSetGraph(current, snapshot.nodes, snapshot.edges)");
    expect(undoPatchBlock).toContain("store.edgesByNodeId.get(nodeId)");
    expect(undoPatchBlock).not.toContain("snapshotEdgesByChangedNode");
    expect(undoPatchBlock).not.toContain("...snapshot.edges.map((edge) => edge.id)");
    expect(undoActionBlock).toContain("applyUndoGraphSnapshot(snapshot);");
    expect(undoActionBlock).not.toContain("setGraphArrays(snapshot.nodes, snapshot.edges);");
  });

  test("scopes lightweight undo snapshots to known changed graph ids", async () => {
    const source = await readAppSource();
    const snapshotStart = source.indexOf("const cloneProjectState");
    const snapshotEnd = source.indexOf("const pushUndoSnapshot", snapshotStart);
    const snapshotBlock = source.slice(snapshotStart, snapshotEnd);
    const undoPatchStart = source.indexOf("const undoGraphSnapshotPatchPlan");
    const undoPatchEnd = source.indexOf("const applyUndoGraphSnapshot", undoPatchStart);
    const undoPatchBlock = source.slice(undoPatchStart, undoPatchEnd);
    const dragScopeStart = source.indexOf("const undoScopeForDraggingState");
    const dragScopeEnd = source.indexOf("const requestCanvasFrameCenter", dragScopeStart);
    const dragScopeBlock = source.slice(dragScopeStart, dragScopeEnd);
    const moveStart = source.indexOf("const moveSelection =");
    const moveEnd = source.indexOf("const updateSelectedNode", moveStart);
    const moveBlock = source.slice(moveStart, moveEnd);

    expect(source).toContain("type UndoGraphPatchScope");
    expect(source).toContain("graphPatchScope?: UndoGraphPatchScope");
    expect(snapshotBlock).toContain("deepModelSnapshot = false");
    expect(snapshotBlock).toContain("graphPatchScope");
    expect(undoPatchBlock).toContain("const scopedNodeIds = snapshot.graphPatchScope?.nodeIds");
    expect(undoPatchBlock).toContain("for (const nodeId of scopedNodeIds)");
    expect(undoPatchBlock).toContain("for (const edgeId of scopedEdgeIds)");
    expect(dragScopeBlock).toContain("undoScopeForDraggingState");
    expect(dragScopeBlock).toContain("dragState.affectedEdges.map((edge) => edge.id)");
    expect(dragScopeBlock).toContain("pushUndoSnapshot(true, false, undoScopeForDraggingState(draggingRef.current))");
    expect(moveBlock).toContain("pushUndoSnapshot(true, false, undoScopeForGraphPatch(moveNodeIds, affectedEdgesForMove.map((edge) => edge.id)))");
  });

  test("keeps multi-node drag movement lightweight with a precomputed overlay and deferred route repair", async () => {
    const source = await readAppSource();
    const dragDeltaStart = source.indexOf("const computeNodeDragDelta");
    const dragDeltaEnd = source.indexOf("const applyNodeDragMove", dragDeltaStart);
    const dragDeltaBlock = source.slice(dragDeltaStart, dragDeltaEnd);
    const dragMoveStart = source.indexOf("const applyNodeDragMove");
    const dragMoveEnd = source.indexOf("const scheduleNodeDragMove", dragMoveStart);
    const dragMoveBlock = source.slice(dragMoveStart, dragMoveEnd);
    const keyboardMoveStart = source.indexOf("const applyKeyboardMoveDelta");
    const keyboardMoveEnd = source.indexOf("const flushPendingKeyboardMove", keyboardMoveStart);
    const keyboardMoveBlock = source.slice(keyboardMoveStart, keyboardMoveEnd);
    const finishMoveStart = source.indexOf("const finishDraggingMove");
    const finishMoveEnd = source.indexOf("const finishNodeDrag", finishMoveStart);
    const finishMoveBlock = source.slice(finishMoveStart, finishMoveEnd);
    const finishDragStart = source.indexOf("const finishNodeDrag = () =>");
    const finishDragEnd = source.indexOf("const finishTransformDrag", finishDragStart);
    const finishDragBlock = source.slice(finishDragStart, finishDragEnd);
    const interactionStart = source.indexOf("const dragInteractionBounds");
    const interactionEnd = source.indexOf("const dragPreviewEdgeRoutes", interactionStart);
    const interactionBlock = source.slice(interactionStart, interactionEnd);
    const previewStart = source.indexOf("const dragPreviewEdgeRoutes");
    const previewEnd = source.indexOf("const dragPreviewEdgeIdSet", previewStart);
    const previewBlock = source.slice(previewStart, previewEnd);
    const multiPreviewStart = previewBlock.indexOf("const previewEdges = isMultiNodeMoveState(dragging)");
    const multiPreviewEnd = previewBlock.indexOf("return buildLightweightNodeDragPreviewRoutes", multiPreviewStart);
    const multiPreviewBlock = previewBlock.slice(multiPreviewStart, multiPreviewEnd);
    const ghostStart = source.indexOf("const dragGhostEdgeRoutes");
    const ghostEnd = source.indexOf("useEffect(() =>", ghostStart);
    const ghostBlock = source.slice(ghostStart, ghostEnd);
    const overlayStart = source.indexOf("const renderMultiNodeDragOverlay");
    const overlayEnd = source.indexOf("const groupTransformPreviewNodeFromSnapshot", overlayStart);
    const overlayBlock = source.slice(overlayStart, overlayEnd);
    const commitStart = source.indexOf("const commitFastMovedGraphPatches");
    const commitEnd = source.indexOf("const clampPointToCanvas", commitStart);
    const commitBlock = source.slice(commitStart, commitEnd);
    const moveSelectionStart = source.indexOf("const moveSelection =");
    const moveSelectionEnd = source.indexOf("const updateSelectedNode", moveSelectionStart);
    const moveSelectionBlock = source.slice(moveSelectionStart, moveSelectionEnd);

    expect(source).toContain("function isMultiNodeMoveState");
    expect(source).toContain("type MultiNodeDragOverlayPreview");
    expect(source).toContain("overlayPreview?: MultiNodeDragOverlayPreview");
    expect(source).toContain("dynamicEdgePreviewEdges: Edge[];");
    expect(source).toContain("const buildMultiNodeDragOverlayPreview");
    expect(source).toContain("const CANVAS_MULTI_NODE_DRAG_PREVIEW_EDGE_LIMIT");
    expect(source).toContain("const CANVAS_MULTI_NODE_DRAG_SNAP_NODE_LIMIT");
    expect(source).toContain("overlayPreview: isMultiNodeMoveState({ nodeIds: dragNodeIds })");
    expect(source).toContain("const multiNodeDragInteractionNodes =");
    expect(source).toContain("const snapMovedNodeIds = new Set<string>();");
    expect(source).not.toContain("movedNodeIds.size === 0 || movedNodeIds.size > CANVAS_MULTI_NODE_DRAG_SNAP_NODE_LIMIT");
    expect(source).toContain("const findMultiNodeDragSnapTargetAtDelta =");
    expect(source).toContain("const ensureDraggingUndoSnapshot");
    expect(source).toContain("const canvasBoundsForMovedNodeDelta");
    expect(source).toContain("const boundedDeltaForMultiNodeInteractiveMove =");
    expect(dragDeltaBlock).toContain("if (isMultiNodeMoveState(dragState))");
    expect(dragDeltaBlock).toContain("return boundedDeltaForMultiNodeInteractiveMove(dragState, movementDelta);");
    expect(dragDeltaBlock).not.toContain("const expandedBounds = canvasBoundsForMovedNodeDelta");
    expect(dragDeltaBlock).toContain("return boundedDeltaForMoveGeometry(");
    expect(dragMoveBlock).not.toContain("ensureDraggingUndoSnapshot()");
    expect(dragMoveBlock).not.toContain("applyCanvasBounds(");
    expect(dragMoveBlock).toContain("const multiNodeSnapTarget = multiNodeMove && renderPreview ? findMultiNodeDragSnapTargetAtDelta(currentDrag, boundedDelta) : null;");
    expect(dragMoveBlock).toContain("updateImperativeNodeDragDropHint(multiNodeSnapTarget);");
    expect(keyboardMoveBlock).toContain("isMultiNodeMoveState(activeDragging)");
    expect(keyboardMoveBlock).toContain("? boundedDeltaForMultiNodeInteractiveMove(activeDragging, requestedDelta)");
    expect(keyboardMoveBlock).not.toContain("? canvasBoundsForMovedNodeDelta(");
    expect(keyboardMoveBlock).not.toContain("ensureDraggingUndoSnapshot()");
    expect(keyboardMoveBlock).not.toContain("applyCanvasBounds(");
    expect(keyboardMoveBlock).toContain("findMultiNodeDragSnapTargetAtDelta(activeDragging, boundedDelta)");
    expect(moveSelectionBlock).toContain("moveNodeIds.length > 1");
    expect(moveSelectionBlock).toContain("? boundedDeltaForNodes(");
    expect(finishMoveBlock).toContain("ensureDraggingUndoSnapshot();");
    expect(finishMoveBlock).toContain("findMultiNodeDragSnapTargetAtDelta(activeDragging, delta)");
    expect(finishMoveBlock).toContain("findSingleNodeDragSnapTargetAtDelta(activeDragging, delta)");
    expect(finishDragBlock).toContain("ensureDraggingUndoSnapshot();");
    expect(finishDragBlock).toContain("nodeTerminalSnapTargetRef.current ?? (");
    expect(finishDragBlock).toContain("findMultiNodeDragSnapTargetAtDelta(activeDragging, delta)");
    expect(finishDragBlock).toContain("findSingleNodeDragSnapTargetAtDelta(activeDragging, delta)");
    expect(finishDragBlock).not.toContain("const releaseSnapTarget = findSingleNodeDragSnapTargetAtDelta(activeDragging, delta);");
    expect(interactionBlock).toContain("isMultiNodeMoveState(dragging)");
    expect(interactionBlock).toContain("const suppressDragTerminalInteraction");
    expect(interactionBlock).toContain("if (suppressDragTerminalInteraction)");
    expect(interactionBlock).toContain("!isMultiNodeMoveState(dragging)");
    expect(previewBlock).toContain("isMultiNodeMoveState(dragging)");
    expect(multiPreviewBlock).toContain("? dragging.overlayPreview?.dynamicEdgePreviewEdges ?? []");
    expect(multiPreviewBlock).toContain(": singleNodeDragPreviewEdges(dragging, draggingDelta)");
    expect(source).toContain("const renderMultiNodeDragOverlay");
    expect(multiPreviewBlock).not.toContain("resolveStraightBusSlideEndpoint");
    expect(multiPreviewBlock).not.toContain("preserveDraggedRouteShape");
    expect(multiPreviewBlock).not.toContain("getRouteEndpointNormal");
    expect(ghostBlock).toContain("isMultiNodeMoveState(dragging)");
    expect(ghostBlock).toContain("return dragging.overlayPreview?.edgeRoutes ?? []");
    expect(overlayBlock).toContain("const overlay = dragging.overlayPreview");
    expect(overlayBlock).toContain("overlay.edgeRoutes.map");
    expect(overlayBlock).toContain("overlay.bounds");
    expect(overlayBlock).not.toContain("dragging.affectedEdges.flatMap");
    expect(overlayBlock).toContain("dragging.nodeIds.map");
    expect(overlayBlock).toContain("DeviceGlyph");
    expect(overlayBlock).toContain("node-terminal-layer");
    expect(overlayBlock).toContain("terminal-dot");
    expect(overlayBlock).toContain("node-upright-content");
    expect(overlayBlock).toContain("node-background-image");
    expect(commitBlock).toContain("if (deferMovedRouteRepair)");
    expect(commitBlock).toContain("graphStoreApplyPatch(current, {");
    expect(commitBlock).toContain("edgeUpserts: expectedPatch.edgeUpserts");
    expect(commitBlock).toContain("window.requestAnimationFrame(() =>");
    expect(commitBlock).toContain("scheduleDeferredMovedConnectionRepair(");
  });

  test("expands canvas bounds before committing drag and move landing routes", async () => {
    const source = await readAppSource();
    const commitStart = source.indexOf("const commitFastMovedGraphPatches");
    const commitEnd = source.indexOf("const clampPointToCanvas", commitStart);
    const commitBlock = source.slice(commitStart, commitEnd);
    const pointerMoveStart = source.indexOf("const handlePointerMove = (event: PointerEvent<SVGSVGElement>)");
    const pointerMoveEnd = source.indexOf("const handleWheel", pointerMoveStart);
    const pointerMoveBlock = source.slice(pointerMoveStart, pointerMoveEnd);
    const dragMoveStart = source.indexOf("const applyNodeDragMove");
    const dragMoveEnd = source.indexOf("const scheduleNodeDragMove", dragMoveStart);
    const dragMoveBlock = source.slice(dragMoveStart, dragMoveEnd);
    const keyboardMoveStart = source.indexOf("const applyKeyboardMoveDelta");
    const keyboardMoveEnd = source.indexOf("const flushPendingKeyboardMove", keyboardMoveStart);
    const keyboardMoveBlock = source.slice(keyboardMoveStart, keyboardMoveEnd);
    const finishMoveStart = source.indexOf("const finishDraggingMove");
    const finishMoveEnd = source.indexOf("const finishNodeDrag", finishMoveStart);
    const finishMoveBlock = source.slice(finishMoveStart, finishMoveEnd);
    const finishDragStart = source.indexOf("const finishNodeDrag = () =>");
    const finishDragEnd = source.indexOf("const finishTransformDrag", finishDragStart);
    const finishDragBlock = source.slice(finishDragStart, finishDragEnd);
    const moveSelectionStart = source.indexOf("const moveSelection =");
    const moveSelectionEnd = source.indexOf("const updateSelectedNode", moveSelectionStart);
    const moveSelectionBlock = source.slice(moveSelectionStart, moveSelectionEnd);
    const updateStart = source.indexOf("const updateSelectedNode");
    const updateEnd = source.indexOf("const assignSelectedNodesToModelLayer", updateStart);
    const updateBlock = source.slice(updateStart, updateEnd);

    expect(pointerMoveBlock).toContain("const rawPointer = screenToSvgPoint(svgRef.current, event.clientX, event.clientY);");
    expect(pointerMoveBlock).toContain("const pointer = draggingRef.current ? rawPointer : clampPointToCanvas(rawPointer);");
    expect(pointerMoveBlock).toContain("const pointer = draggingRef.current ? rawPointer : clampPointToCanvas(rawPointer);");
    expect(dragMoveBlock).not.toContain("applyCanvasBounds(");
    expect(keyboardMoveBlock).toContain("const expandedBounds = multiNodeMove");
    expect(keyboardMoveBlock).not.toContain("applyCanvasBounds(");
    expect(commitBlock).toContain("effectiveCanvasBounds: CanvasBounds = canvasBounds");
    expect(commitBlock).toContain("shiftCachedRoutesForCanvasOrigin(originShift);");
    expect(commitBlock).toContain("const candidateEdgeIds = committedCandidateEdges.map((edge) => edge.id);");
    expect(commitBlock).toContain("markStoredRouteEdgesDirty(candidateEdgeIds);");
    expect(commitBlock).not.toContain("markStoredRouteEdgesDirty(shiftedNextEdges.map((edge) => edge.id));");
    expect(commitBlock).toContain("canvasBoundsForAutoExpandedGraphContent(effectiveCanvasBounds, committedNodeUpdates, committedCandidateEdges, [], CANVAS_AUTO_EXPAND_PADDING)");
    expect(commitBlock).toContain("scheduleDeferredMovedConnectionRepair(");
    expect(commitBlock).toContain("commitCanvasBounds");
    expect(commitBlock).toContain("previousNodes");
    expect(commitBlock).toContain("expandCanvasToFitGraph(committedNodeUpdates, nextEdgesForBounds, [], CANVAS_AUTO_EXPAND_PADDING, commitCanvasBounds);");
    expect(finishMoveBlock).toContain("nodes,\n      finalBounds");
    expect(finishDragBlock).toContain("nodes,\n      finalBounds");
    expect(moveSelectionBlock).toContain("nodes,\n      finalBounds");
    expect(updateBlock).toContain("nodes,\n        selectedNodeCanvasBounds");
  });

  test("preserves moved connection geometry before left or top canvas expansion shifts origin", async () => {
    const source = await readAppSource();
    const leftTopShiftStart = source.indexOf("const leftTopCanvasOriginShiftForContent");
    const leftTopShiftEnd = source.indexOf("const minimumCanvasBoundsForResizeEdge", leftTopShiftStart);
    const leftTopShiftBlock = source.slice(leftTopShiftStart, leftTopShiftEnd);
    const helperStart = source.indexOf("const clampNodePositionToExpandableBounds");
    const helperEnd = source.indexOf("const scheduleCanvasVisibleViewBoxUpdate", helperStart);
    const helperBlock = source.slice(helperStart, helperEnd);
    const boundaryStart = source.indexOf("const nodeMoveGeometryInsideCanvas =");
    const boundaryEnd = source.indexOf("const nearestBoundarySafeDelta", boundaryStart);
    const boundaryBlock = source.slice(boundaryStart, boundaryEnd);
    const adjustStart = source.indexOf("const adjustEdgesAfterNodeMove =");
    const adjustEnd = source.indexOf("const routePointsForMovedNodeBlockers", adjustStart);
    const adjustBlock = source.slice(adjustStart, adjustEnd);

    expect(helperBlock).toContain("const clampPointToExpandableBounds");
    expect(helperBlock).toContain("const clampEdgeGeometryToExpandableBounds");
    expect(adjustBlock).toContain("position: clampNodePositionToExpandableBounds(");
    expect(adjustBlock).toContain("const boundedNextEdge = clampEdgeGeometryToExpandableBounds(nextEdge, bounds);");
    expect(adjustBlock).not.toContain("clampEdgeGeometryToBounds(nextEdge, canvasBounds)");
    expect(leftTopShiftBlock).toContain("padding = 0");
    expect(leftTopShiftBlock).toContain("[...contentRoutes, ...edgeRoutesForGeometryBounds(contentEdges)],\n      padding");
    expect(boundaryBlock).toContain("leftTopCanvasOriginShiftForContent(movedNodes, [], affectedRoutes, MOVE_BOUNDARY_GUARD)");
  });

  test("moves multi-node drag previews through one SVG overlay transform without React state churn", async () => {
    const source = await readAppSource();
    const styles = await readStyles();
    const dragMoveStart = source.indexOf("const applyNodeDragMove");
    const dragMoveEnd = source.indexOf("const scheduleNodeDragMove", dragMoveStart);
    const dragMoveBlock = source.slice(dragMoveStart, dragMoveEnd);
    const multiMoveStart = dragMoveBlock.indexOf("if (multiNodeMove)");
    const multiMoveEnd = dragMoveBlock.indexOf("const nextDragState", multiMoveStart);
    const multiMoveBlock = dragMoveBlock.slice(multiMoveStart, multiMoveEnd);
    const overlayStart = source.indexOf("const renderMultiNodeDragOverlay");
    const overlayEnd = source.indexOf("const groupTransformPreviewNodeFromSnapshot", overlayStart);
    const overlayBlock = source.slice(overlayStart, overlayEnd);
    const commitStart = source.indexOf("const commitFastMovedGraphPatches");
    const commitEnd = source.indexOf("const clampPointToCanvas", commitStart);
    const commitBlock = source.slice(commitStart, commitEnd);
    const finishStart = source.indexOf("const finishNodeDrag = () =>");
    const finishEnd = source.indexOf("const finishTransformDrag", finishStart);
    const finishBlock = source.slice(finishStart, finishEnd);

    expect(source).toContain("const multiNodeDragOverlayRef");
    expect(source).toContain("const imperativeMultiNodeDragOverlayRef");
    expect(source).toContain("const imperativeMultiNodeDragActiveRef");
    expect(source).toContain("const updateMultiNodeDragOverlayTransform");
    expect(source).toContain("const showImperativeMultiNodeDragOverlay");
    expect(source).toContain("const hideImperativeMultiNodeDragOverlay");
    expect(source).toContain("const startDraggingState = (nextDragging: DraggingState)");
    expect(source).toContain("const CANVAS_MULTI_NODE_DRAG_OVERLAY_DETAIL_LIMIT = 24;");
    expect(source).toContain("const scheduleDeferredMovedConnectionRepair");
    expect(source).toContain("const inspectorSelectedNode = selectedNode;");
    expect(source).toContain("const inspectorSelectedEdge = selectedEdge;");
    expect(source).toContain("const inspectorTopologyErrors = useDeferredValue(topologyErrors)");
    expect(source).toContain("const deferredElementTreeSource = useDeferredValue(elementTreeSource)");
    expect(source).toContain("multiNodeDragOverlayRef.current?.setAttribute(\"transform\"");
    expect(source).toContain("imperativeMultiNodeDragOverlayRef.current?.setAttribute(\"transform\"");
    expect(source).toContain("activeDragging.overlayPreview?.dynamicEdgePreviewEdges ?? []");
    expect(source).not.toContain("updateNodeDragLightweightEdgePreview(activeDragging, nextDelta, activeDragging.affectedEdges)");
    expect(multiMoveBlock).toContain("previewDelta: effectivePreviewDelta");
    expect(multiMoveBlock).toContain("nodeTerminalSnapTargetRef.current = multiNodeSnapTarget");
    expect(multiMoveBlock).toContain("updateImperativeNodeDragDropHint(multiNodeSnapTarget)");
    expect(multiMoveBlock).toContain("updateMultiNodeDragOverlayTransform(effectivePreviewDelta)");
    expect(multiMoveBlock).not.toContain("setDragging");
    expect(commitBlock).toContain("const routeRepairCandidateEdges = wholeLayerMove");
    expect(commitBlock).toContain(": localRouteOptimizationCandidateEdges(");
    expect(commitBlock).toContain("!wholeLayerMove &&\n      shouldDeferSingleNodeTerminalReconciliation(");
    expect(commitBlock).toContain("movedNodeIds.length > 0 &&\n      (deferredRepairCandidateEdges.length > 0 || deferSingleNodeTerminalReconciliation)");
    expect(commitBlock).toContain("scheduleDeferredMovedConnectionRepair(");
    expect(commitBlock).toContain("markGraphDirtyForInteractiveCommit()");
    expect(finishBlock).toContain("const activeDragging = draggingRef.current;");
    expect(finishBlock).not.toContain("const activeDragging = draggingRef.current ?? dragging;");
    expect(overlayBlock).toContain("className=\"multi-node-drag-overlay\"");
    expect(overlayBlock).toContain("dangerouslySetInnerHTML={{ __html: overlay.simplifiedMarkup }}");
    expect(source).toContain("className=\"multi-node-drag-overlay imperative-multi-node-drag-overlay\"");
    expect(source).toContain("simplifiedMarkup && showImperativeMultiNodeDragOverlay(simplifiedMarkup)");
    expect(source).toContain("if (imperativeMultiNodeDragActiveRef.current && !dragging)");
    expect(overlayBlock).not.toContain("multiNodeDragDegradedPreview");
    expect(source).toContain("className={`diagram-canvas");
    expect(source).toContain("${contextMarqueeSelection ? \"context-marquee-mode\" : \"\"}");
    expect(source).toContain("${multiNodeDragging ? \"multi-node-dragging\" : \"\"}");
    expect(source).toContain("${singleNodeDragging ? \"single-node-dragging\" : \"\"}");
    expect(source).toContain("<g className=\"canvas-content\">");
    expect(source).not.toContain("if (multiNodeDragging && draggingNodeIdSet.has(node.id)) {\n                return null;");
    expect(source).toContain("{visibleSelectedGroupLayoutUnits.map");
    expect(source).not.toContain("{!multiNodeDragging && visibleSelectedGroupLayoutUnits.map");
    expect(source).toContain("dragging?.historyCaptured && !multiNodeDragging && dragging.nodeIds.map");
    expect(styles).toContain(".multi-node-drag-overlay");
    expect(styles).toContain(".multi-node-drag-preview-node-lite");
    expect(styles).toContain(".diagram-canvas.multi-node-dragging .canvas-content");
  });

  test("caches multi-node drag preview membership and skips same-pixel preview rewrites", async () => {
    const source = await readAppSource();
    const draggingTypeStart = source.indexOf("type MultiNodeDragOverlayPreview");
    const draggingTypeEnd = source.indexOf("type NodeDragPreviewRoute", draggingTypeStart);
    const draggingTypeBlock = source.slice(draggingTypeStart, draggingTypeEnd);
    const previewStart = source.indexOf("const buildMultiNodeDragOverlayPreview");
    const previewEnd = source.indexOf("const renderMultiNodeDragOverlay", previewStart);
    const previewBlock = source.slice(previewStart, previewEnd);
    const routesStart = source.indexOf("const buildLightweightNodeDragPreviewRoutes");
    const routesEnd = source.indexOf("const buildLightweightNodeDragPreviewRouteMarkup", routesStart);
    const routesBlock = source.slice(routesStart, routesEnd);
    const updateStart = source.indexOf("const updateNodeDragLightweightEdgePreview");
    const updateEnd = source.indexOf("const singleNodeDragInteractionNodes", updateStart);
    const updateBlock = source.slice(updateStart, updateEnd);
    const transformStart = source.indexOf("const updateMultiNodeDragOverlayTransform");
    const transformEnd = source.indexOf("const showImperativeMultiNodeDragOverlay", transformStart);
    const transformBlock = source.slice(transformStart, transformEnd);

    expect(draggingTypeBlock).toContain("movedNodeIds: Set<string>;");
    expect(draggingTypeBlock).toContain("draggedEdgeIds: Set<string>;");
    expect(draggingTypeBlock).toContain("movedBusNodeIds: Set<string>;");
    expect(source).toContain("const imperativeNodeDragEdgePreviewKeyRef");
    expect(previewBlock).toContain("const movingBusNodeIdSet = new Set");
    expect(previewBlock).toContain("movedNodeIds: movingNodeIdSet");
    expect(previewBlock).toContain("draggedEdgeIds: movingEdgeIdSet");
    expect(previewBlock).toContain("movedBusNodeIds: movingBusNodeIdSet");
    expect(routesBlock).toContain("const overlayPreviewCache = multiNodeMove ? dragState.overlayPreview : undefined;");
    expect(routesBlock).toContain("overlayPreviewCache?.movedNodeIds");
    expect(routesBlock).toContain("overlayPreviewCache?.draggedEdgeIds");
    expect(routesBlock).toContain("overlayPreviewCache?.movedBusNodeIds");
    expect(updateBlock).toContain("const roundedPreviewDelta");
    expect(updateBlock).toContain("const previewKey");
    expect(updateBlock).toContain("if (imperativeNodeDragEdgePreviewKeyRef.current === previewKey)");
    expect(updateBlock.indexOf("if (imperativeNodeDragEdgePreviewKeyRef.current === previewKey)"))
      .toBeLessThan(updateBlock.indexOf("const routes = buildLightweightNodeDragPreviewRoutes"));
    expect(updateBlock).toContain("const routes = buildLightweightNodeDragPreviewRoutes(dragState, roundedPreviewDelta, previewEdges);");
    expect(updateBlock).toContain("syncImperativeNodeDragPreviewPaths(edgePreview, routes);");
    expect(transformBlock).toContain("updateNodeDragLightweightEdgePreview(activeDragging, roundedDelta");
  });

  test("moves single-node drag previews imperatively without per-frame React state churn", async () => {
    const source = await readAppSource();
    const styles = await readStyles();
    const dragMoveStart = source.indexOf("const applyNodeDragMove");
    const dragMoveEnd = source.indexOf("const scheduleNodeDragMove", dragMoveStart);
    const dragMoveBlock = source.slice(dragMoveStart, dragMoveEnd);
    const singleMoveStart = dragMoveBlock.indexOf("const nextDragState");
    const singleMoveBlock = dragMoveBlock.slice(singleMoveStart);
    const finishStart = source.indexOf("const finishNodeDrag = () =>");
    const finishEnd = source.indexOf("const finishTransformDrag", finishStart);
    const finishBlock = source.slice(finishStart, finishEnd);
    const renderStart = source.indexOf("{renderViewportRoutedEdges.map((route) =>");
    const renderEnd = source.indexOf("{rewiringPreviewRoute", renderStart);
    const renderBlock = source.slice(renderStart, renderEnd);

    expect(source).toContain("const imperativeSingleNodeDragNodeOverlayRef");
    expect(source).toContain("const imperativeSingleNodeDragEdgePreviewRef");
    expect(source).toContain("const imperativeNodeDragDropHintRef");
    expect(source).toContain("const imperativeSingleNodeDragActiveRef");
    expect(source).toContain("const buildSingleNodeDragPreviewNodeMarkup");
    expect(source).toContain("const updateSingleNodeDragImperativePreview");
    expect(source).toContain("const hideImperativeSingleNodeDragPreview");
    expect(source).toContain("if (!imperativeSingleNodeDragActiveRef.current) {\n    nodeTerminalSnapTargetRef.current = nodeTerminalSnapTarget;\n  }");
    expect(dragMoveBlock).toContain("renderPreview && !isMultiNodeMoveState(currentDrag)");
    expect(dragMoveBlock).toContain("boundedDeltaForNodes(");
    expect(dragMoveBlock).toContain("computeNodeDragDelta(currentDrag, point, ctrlKey, shiftKey)");
    expect(singleMoveBlock).toContain("updateSingleNodeDragImperativePreview(nextDragState, previewDelta);");
    expect(singleMoveBlock).toContain("singleNodeDragRenderState(nextDragState)");
    expect(singleMoveBlock).not.toContain("setDragging((current) =>");
    expect(renderBlock).toContain("singleNodeDragging && dragAffectedEdgeIdSet.has(edge.id)");
    expect(finishBlock).toContain("nodeTerminalSnapTargetRef.current ?? (");
    expect(finishBlock).toContain("findMultiNodeDragSnapTargetAtDelta(activeDragging, delta)");
    expect(finishBlock).toContain("findSingleNodeDragSnapTargetAtDelta(activeDragging, delta)");
    expect(source).toContain("className=\"single-node-drag-overlay imperative-single-node-drag-edge-preview\"");
    expect(source).toContain("className=\"single-node-drag-overlay imperative-single-node-drag-node-overlay\"");
    expect(source).toContain("className=\"connect-drop-hint imperative-node-drag-drop-hint\"");
    expect(source).toContain("singleNodeDragging ? \"single-node-dragging\" : \"\"");
    expect(source).toContain("singleNodeDragging && draggingNodeIdSet.has(node.id) ? \"single-drag-origin\" : \"\"");
    expect(styles).toContain(".single-node-drag-overlay");
    expect(styles).toContain(".diagram-node.single-drag-origin");
  });

  test("keeps moved bus endpoint slide checks local during drag and move commits", async () => {
    const source = await readAppSource();
    const adjustStart = source.indexOf("const adjustEdgesAfterNodeMove =");
    const adjustEnd = source.indexOf("const rebuildSingleAffectedConnectionRoute", adjustStart);
    const adjustBlock = source.slice(adjustStart, adjustEnd);
    const slideStart = adjustBlock.indexOf("const slidePatch =");
    const slideEnd = adjustBlock.indexOf(": null;", slideStart);
    const slideBlock = adjustBlock.slice(slideStart, slideEnd);

    expect(adjustBlock).toContain("const previousSlideNodes = routingNodesForConnectionEdge(edge, nodes);");
    expect(adjustBlock).toContain("const nextSlideNodes = routingNodesForConnectionEdge(baseEdge, nextNodes);");
    expect(slideBlock).toContain("nodes: previousSlideNodes");
    expect(slideBlock).toContain("nextNodes: nextSlideNodes");
    expect(slideBlock).not.toContain("nodes,\n              nextNodes");
  });

  test("limits high-fanout single-node drag preview and snap work to viewport-local candidates", async () => {
    const source = await readAppSource();
    const previewStart = source.indexOf("const buildLightweightNodeDragPreviewRoutes");
    const previewEnd = source.indexOf("const singleNodeDragInteractionNodes", previewStart);
    const previewBlock = source.slice(previewStart, previewEnd);
    const interactionStart = source.indexOf("const singleNodeDragInteractionNodes");
    const interactionEnd = source.indexOf("const updateImperativeNodeDragDropHint", interactionStart);
    const interactionBlock = source.slice(interactionStart, interactionEnd);
    const updateStart = source.indexOf("const updateSingleNodeDragImperativePreview");
    const updateEnd = source.indexOf("const startDraggingState", updateStart);
    const updateBlock = source.slice(updateStart, updateEnd);

    expect(source).toContain("const CANVAS_SINGLE_NODE_DRAG_PREVIEW_EDGE_LIMIT");
    expect(source).toContain("const CANVAS_SINGLE_NODE_DRAG_SNAP_EDGE_LIMIT");
    expect(source).toContain("const singleNodeDragRelevantEdges =");
    expect(source).toContain("const singleNodeDragPreviewEdges =");
    expect(source).toContain("const singleNodeDragSnapEdges =");
    expect(previewBlock).toContain("const previewEdges = scopedPreviewEdges ?? (");
    expect(previewBlock).toContain("return previewEdges.flatMap((edge) =>");
    expect(previewBlock).not.toContain("return dragState.affectedEdges.flatMap((edge)");
    expect(interactionBlock).toContain("const snapEdges = scopedSnapEdges ?? singleNodeDragSnapEdges(dragState, delta);");
    expect(interactionBlock).toContain("for (const edge of snapEdges)");
    expect(interactionBlock).not.toContain("for (const edge of dragState.affectedEdges)");
    expect(updateBlock).toContain("const scopedEdges = singleNodeDragScopedEdges(dragState, previewDelta);");
    expect(updateBlock).toContain("const snapTarget = findSingleNodeDragSnapTargetAtDelta(dragState, previewDelta, scopedEdges.snapEdges);");
    expect(updateBlock).toContain("const visualDelta = applyNodeTerminalSnap(previewDelta, snapTarget);");
    expect(updateBlock).toContain("updateNodeDragLightweightEdgePreview(dragState, visualDelta, scopedEdges.previewEdges)");
    expect(updateBlock).toContain("nodeTerminalSnapTargetRef.current = snapTarget");
    expect(updateBlock).not.toContain("singleNodeDragInteractionNodes");
  });

  test("reuses precomputed single-node drag route bounds and edge scopes across preview work", async () => {
    const source = await readAppSource();
    const draggingTypeStart = source.indexOf("type DraggingState =");
    const draggingTypeEnd = source.indexOf("type MultiNodeDragOverlayPreview", draggingTypeStart);
    const draggingTypeBlock = source.slice(draggingTypeStart, draggingTypeEnd);
    const touchesStart = source.indexOf("const singleNodeDragEdgeTouchesBounds");
    const touchesEnd = source.indexOf("const singleNodeDragScopedEdges", touchesStart);
    const touchesBlock = source.slice(touchesStart, touchesEnd);
    const updateStart = source.indexOf("const updateSingleNodeDragImperativePreview");
    const updateEnd = source.indexOf("const startDraggingState", updateStart);
    const updateBlock = source.slice(updateStart, updateEnd);

    expect(draggingTypeBlock).toContain("originalRouteBounds: Record<string, RenderViewportBounds | null>;");
    expect(source).toContain("const snapshotRouteBounds =");
    expect(source).toContain("originalRouteBounds: snapshotRouteBounds(originalRoutePointsForMove)");
    expect(source).toContain("originalRouteBounds: snapshotRouteBounds(originalRoutePointsForDrag)");
    expect(source).toContain("const singleNodeDragScopedEdges =");
    expect(touchesBlock).toContain("dragState.originalRouteBounds[edge.id]");
    expect(touchesBlock).not.toContain("routeRenderBounds({ points: dragState.originalRoutePoints");
    expect(updateBlock).toContain("const scopedEdges = singleNodeDragScopedEdges(dragState, previewDelta);");
    expect(updateBlock).toContain("const snapTarget = findSingleNodeDragSnapTargetAtDelta(dragState, previewDelta, scopedEdges.snapEdges);");
    expect(updateBlock).toContain("const visualDelta = applyNodeTerminalSnap(previewDelta, snapTarget);");
    expect(updateBlock).toContain("updateNodeDragLightweightEdgePreview(dragState, visualDelta, scopedEdges.previewEdges)");
    expect(updateBlock).toContain("nodeTerminalSnapTargetRef.current = snapTarget");
    expect(updateBlock).not.toContain("singleNodeDragInteractionNodes");
    expect(updateBlock).not.toContain("const previewEdges = singleNodeDragPreviewEdges(dragState, previewDelta);");
    expect(updateBlock).not.toContain("singleNodeDragInteractionNodes(dragState, previewDelta);");
  });

  test("precomputes single-node drag candidate edges and id sets for smooth drag frames", async () => {
    const source = await readAppSource();
    const draggingTypeStart = source.indexOf("type DraggingState =");
    const draggingTypeEnd = source.indexOf("type MultiNodeDragOverlayPreview", draggingTypeStart);
    const draggingTypeBlock = source.slice(draggingTypeStart, draggingTypeEnd);
    const cacheTypeStart = source.indexOf("type SingleNodeDragCache =");
    const cacheTypeEnd = source.indexOf("type DraggingState =", cacheTypeStart);
    const cacheTypeBlock = source.slice(cacheTypeStart, cacheTypeEnd);
    const cacheStart = source.indexOf("const buildSingleNodeDragCache =");
    const cacheEnd = source.indexOf("const orderedNodeFromList", cacheStart);
    const cacheBlock = source.slice(cacheStart, cacheEnd);
    const relevantStart = source.indexOf("const singleNodeDragRelevantEdges");
    const relevantEnd = source.indexOf("const singleNodeDragPreviewBounds", relevantStart);
    const relevantBlock = source.slice(relevantStart, relevantEnd);
    const scopeStart = source.indexOf("const singleNodeDragScopedEdges");
    const scopeEnd = source.indexOf("const singleNodeDragPreviewEdges", scopeStart);
    const scopeBlock = source.slice(scopeStart, scopeEnd);
    const previewStart = source.indexOf("const buildLightweightNodeDragPreviewRoutes");
    const previewEnd = source.indexOf("const singleNodeDragInteractionNodes", previewStart);
    const previewBlock = source.slice(previewStart, previewEnd);
    const interactionStart = source.indexOf("const singleNodeDragInteractionNodes");
    const interactionEnd = source.indexOf("const updateImperativeNodeDragDropHint", interactionStart);
    const interactionBlock = source.slice(interactionStart, interactionEnd);

    expect(source).toContain("type SingleNodeDragCache =");
    expect(cacheTypeBlock).toContain("previewEdges: Edge[];");
    expect(cacheTypeBlock).toContain("snapEdges: Edge[];");
    expect(draggingTypeBlock).toContain("singleNodeDragCache?: SingleNodeDragCache;");
    expect(source).toContain("const buildSingleNodeDragCache =");
    expect(cacheBlock).toContain("const previewEdges = relevantEdges.slice(0, CANVAS_SINGLE_NODE_DRAG_PREVIEW_EDGE_LIMIT);");
    expect(cacheBlock).toContain("previewEdges,");
    expect(cacheBlock).toContain("snapEdges: relevantEdges.slice(0, CANVAS_SINGLE_NODE_DRAG_SNAP_EDGE_LIMIT)");
    expect(source).toContain("singleNodeDragCache: buildSingleNodeDragCache(moveNodeIds, moveEdgeIds, affectedEdgesForMove)");
    expect(source).toContain("singleNodeDragCache: buildSingleNodeDragCache(dragNodeIds, edgeIdsForDrag, affectedEdgesForDrag)");
    expect(relevantBlock).toContain("if (dragState.singleNodeDragCache) {");
    expect(relevantBlock).toContain("return dragState.singleNodeDragCache.relevantEdges;");
    expect(scopeBlock).toContain("return { previewEdges: dragState.singleNodeDragCache.previewEdges, snapEdges: dragState.singleNodeDragCache.snapEdges };");
    expect(scopeBlock.indexOf("return { previewEdges: dragState.singleNodeDragCache.previewEdges, snapEdges: dragState.singleNodeDragCache.snapEdges };"))
      .toBeLessThan(scopeBlock.indexOf("singleNodeDragViewportLocalEdgesByScan(dragState, relevantEdges, delta, bounds, localLimit)"));
    expect(previewBlock).toContain("const dragCache = dragState.singleNodeDragCache;");
    expect(previewBlock).toContain("const overlayPreviewCache = multiNodeMove ? dragState.overlayPreview : undefined;");
    expect(previewBlock).toContain("const movedNodeIds = dragCache?.movedNodeIds ?? overlayPreviewCache?.movedNodeIds ?? new Set(dragState.nodeIds);");
    expect(previewBlock).toContain("const draggedEdgeIds = dragCache?.draggedEdgeIds ?? overlayPreviewCache?.draggedEdgeIds ?? new Set(dragState.edgeIds);");
    expect(previewBlock).toContain("const movedBusIds = dragCache?.movedBusNodeIds ?? overlayPreviewCache?.movedBusNodeIds ?? new Set(");
    expect(interactionBlock).toContain("const dragCache = dragState.singleNodeDragCache;");
    expect(interactionBlock).toContain("const movedNodeIds = dragCache?.movedNodeIds ?? new Set(dragState.nodeIds);");
  });

  test("precomputes single-node drag preview endpoints so frames avoid endpoint recomputation", async () => {
    const source = await readAppSource();
    const cacheTypeStart = source.indexOf("type SingleNodeDragCache =");
    const cacheTypeEnd = source.indexOf("type DraggingState =", cacheTypeStart);
    const cacheTypeBlock = source.slice(cacheTypeStart, cacheTypeEnd);
    const cacheStart = source.indexOf("const buildSingleNodeDragCache =");
    const cacheEnd = source.indexOf("const orderedNodeFromList", cacheStart);
    const cacheBlock = source.slice(cacheStart, cacheEnd);
    const cachedPreviewStart = source.indexOf("const buildCachedSingleNodeDragPreviewRoutes =");
    const cachedPreviewEnd = source.indexOf("const buildDragPreviewEndpointPoints", cachedPreviewStart);
    const cachedPreviewBlock = source.slice(cachedPreviewStart, cachedPreviewEnd);
    const previewStart = source.indexOf("const buildLightweightNodeDragPreviewRoutes");
    const previewEnd = source.indexOf("const buildLightweightNodeDragPreviewRouteMarkup", previewStart);
    const previewBlock = source.slice(previewStart, previewEnd);

    expect(source).toContain("type SingleNodeDragPreviewEndpoint =");
    expect(cacheTypeBlock).toContain("previewEndpointByEdgeId: Map<string, SingleNodeDragPreviewEndpoint>;");
    expect(cacheBlock).toContain("const previewEndpointByEdgeId = new Map<string, SingleNodeDragPreviewEndpoint>();");
    expect(cacheBlock).toContain("previewEndpointByEdgeId.set(edge.id");
    expect(cacheBlock).toContain("previewEndpointByEdgeId");
    expect(source).toContain("const buildCachedSingleNodeDragPreviewRoutes =");
    expect(cachedPreviewBlock).toContain("cache.previewEndpointByEdgeId.get(edge.id)");
    expect(cachedPreviewBlock).toContain("shiftPreviewEndpointForDelta");
    expect(cachedPreviewBlock).not.toContain("getModelEdgeEndpointPoint(");
    expect(cachedPreviewBlock).not.toContain("singleNodeDragPreviewNodeFor(");
    expect(previewBlock).toContain("const cachedSingleNodePreviewRoutes =");
    expect(previewBlock).toContain("buildCachedSingleNodeDragPreviewRoutes(dragCache, delta, previewEdges)");
    expect(previewBlock).toContain("if (cachedSingleNodePreviewRoutes) {");
    expect(previewBlock).toContain("return cachedSingleNodePreviewRoutes;");
    expect(previewBlock.indexOf("buildCachedSingleNodeDragPreviewRoutes(dragCache, delta, previewEdges)"))
      .toBeLessThan(previewBlock.indexOf("return previewEdges.flatMap((edge) =>"));
  });

  test("updates node drag preview paths in place instead of rebuilding svg markup every frame", async () => {
    const source = await readAppSource();
    const refStart = source.indexOf("const imperativeNodeDragEdgePreviewPathRefs");
    const refEnd = source.indexOf("const nodePatchListLookupCacheRef", refStart);
    const refBlock = source.slice(refStart, refEnd);
    const updateStart = source.indexOf("const updateNodeDragLightweightEdgePreview =");
    const updateEnd = source.indexOf("const singleNodeDragInteractionNodes", updateStart);
    const updateBlock = source.slice(updateStart, updateEnd);
    const hideStart = source.indexOf("const clearImperativeNodeDragEdgePreview =");
    const hideEnd = source.indexOf("const showImperativeSingleNodeDragPreview", hideStart);
    const hideBlock = source.slice(hideStart, hideEnd);

    expect(refBlock).toContain("const imperativeNodeDragEdgePreviewPathRefs = useRef<Map<string, SVGPathElement>>(new Map());");
    expect(source).toContain("const syncImperativeNodeDragPreviewPaths =");
    expect(updateBlock).toContain("syncImperativeNodeDragPreviewPaths(edgePreview, routes);");
    expect(updateBlock).not.toContain("const markup = buildLightweightNodeDragPreviewRouteMarkup");
    expect(updateBlock).not.toContain("edgePreview.innerHTML = markup");
    expect(updateBlock).not.toContain("imperativeNodeDragEdgePreviewMarkupRef.current !== markup");
    expect(hideBlock).toContain("imperativeNodeDragEdgePreviewPathRefs.current.clear();");
  });

  test("reuses cached connection colors while preparing LOD route markup", async () => {
    const source = await readAppSource();
    const refStart = source.indexOf("const connectionStrokeColorCacheRef");
    const refEnd = source.indexOf("const cachedRouteInputRef", refStart);
    const refBlock = source.slice(refStart, refEnd);
    const colorStart = source.indexOf("const connectionStrokeColorCacheToken =");
    const colorEnd = source.indexOf("const buildMultiNodeDragOverlayPreview", colorStart);
    const colorBlock = source.slice(colorStart, colorEnd);
    const lodStart = source.indexOf("const lodCanvasRouteChunks = useMemo");
    const lodEnd = source.indexOf("const lodCanvasNodeChunks = useMemo", lodStart);
    const lodBlock = source.slice(lodStart, lodEnd);

    expect(source).toContain("type ConnectionStrokeColorCache");
    expect(refBlock).toContain("const connectionStrokeColorCacheRef = useRef<ConnectionStrokeColorCache>");
    expect(colorBlock).toContain("const connectionStrokeColorCacheToken = useMemo");
    expect(colorBlock).toContain("const cachedConnectionStrokeColor = (edge: Edge)");
    expect(colorBlock).toContain("connectionStrokeColorCacheRef.current");
    expect(colorBlock).toContain("getConnectionStrokeColor(edge, nodeById, colorDisplayMode, colorPalette)");
    expect(lodBlock).toContain("const color = cachedConnectionStrokeColor(edge);");
    expect(lodBlock).not.toContain("const color = getConnectionStrokeColor(edge, nodeById, colorDisplayMode, colorPalette);");
  });

  test("uses lightweight orthogonal node-drag route previews without preserving or rerouting during drag frames", async () => {
    const source = await readAppSource();
    const lightweightStart = source.indexOf("const buildLightweightNodeDragPreviewRoutes");
    const lightweightEnd = source.indexOf("const buildLightweightNodeDragPreviewRouteMarkup", lightweightStart);
    const lightweightBlock = source.slice(lightweightStart, lightweightEnd);
    const markupStart = source.indexOf("const buildLightweightNodeDragPreviewRouteMarkup");
    const markupEnd = source.indexOf("const singleNodeDragInteractionNodes", markupStart);
    const markupBlock = source.slice(markupStart, markupEnd);
    const updateStart = source.indexOf("const updateSingleNodeDragImperativePreview");
    const updateEnd = source.indexOf("const startDraggingState", updateStart);
    const updateBlock = source.slice(updateStart, updateEnd);
    const fallbackStart = source.indexOf("const dragPreviewEdgeRoutes = useMemo");
    const fallbackEnd = source.indexOf("const dragPreviewEdgeIdSet", fallbackStart);
    const fallbackBlock = source.slice(fallbackStart, fallbackEnd);

    expect(lightweightStart).toBeGreaterThan(-1);
    expect(lightweightBlock).toContain("simpleOrthogonalDragPreviewPoints");
    expect(lightweightBlock).toContain("buildDragPreviewEndpointPoints");
    expect(lightweightBlock).toContain("if (multiNodeMove && sourceMoved && targetMoved)");
    expect(lightweightBlock).not.toContain("preserveDraggedRouteShape");
    expect(lightweightBlock).not.toContain("resolveStraightBusSlideEndpoint");
    expect(lightweightBlock).not.toContain("routeEdgesForStoredRendering");
    expect(markupBlock).toContain("buildLightweightNodeDragPreviewRoutes(dragState, delta, previewEdges)");
    expect(updateBlock).toContain("updateNodeDragLightweightEdgePreview(dragState, visualDelta, scopedEdges.previewEdges)");
    expect(fallbackBlock).toContain("buildLightweightNodeDragPreviewRoutes(dragging, draggingDelta, previewEdges)");
    expect(fallbackBlock).not.toContain("preserveDraggedRouteShape");
    expect(fallbackBlock).not.toContain("resolveStraightBusSlideEndpoint");
  });

  test("keeps single-node drag frames lightweight while retaining terminal snap feedback", async () => {
    const source = await readAppSource();
    const updateStart = source.indexOf("const updateSingleNodeDragImperativePreview");
    const updateEnd = source.indexOf("const startDraggingState", updateStart);
    const updateBlock = source.slice(updateStart, updateEnd);
    const dragMoveStart = source.indexOf("const applyNodeDragMove");
    const dragMoveEnd = source.indexOf("const scheduleNodeDragMove", dragMoveStart);
    const dragMoveBlock = source.slice(dragMoveStart, dragMoveEnd);
    const noPreviewStart = dragMoveBlock.indexOf("if (!renderPreview) {", dragMoveBlock.indexOf("draggingRef.current = nextDragState"));
    const noPreviewEnd = dragMoveBlock.indexOf("updateSingleNodeDragImperativePreview", noPreviewStart);
    const noPreviewBlock = dragMoveBlock.slice(noPreviewStart, noPreviewEnd);
    const finishStart = source.indexOf("const finishNodeDrag = () =>");
    const finishEnd = source.indexOf("const finishTransformDrag", finishStart);
    const finishBlock = source.slice(finishStart, finishEnd);

    expect(updateBlock).toContain("const snapTarget = findSingleNodeDragSnapTargetAtDelta(dragState, previewDelta, scopedEdges.snapEdges);");
    expect(updateBlock).toContain("const visualDelta = applyNodeTerminalSnap(previewDelta, snapTarget);");
    expect(updateBlock).toContain("updateNodeDragLightweightEdgePreview(dragState, visualDelta, scopedEdges.previewEdges)");
    expect(updateBlock).toContain("nodeTerminalSnapTargetRef.current = snapTarget");
    expect(updateBlock).toContain("updateImperativeNodeDragDropHint(snapTarget)");
    expect(noPreviewBlock).toContain("nodeTerminalSnapTargetRef.current = null");
    expect(dragMoveBlock).not.toContain("ensureDraggingUndoSnapshot()");
    expect(finishBlock).toContain("ensureDraggingUndoSnapshot();");
    expect(finishBlock).toContain("nodeTerminalSnapTargetRef.current ?? (");
    expect(finishBlock).toContain("findSingleNodeDragSnapTargetAtDelta(activeDragging, delta)");
  });

  test("snapshots only route-preserving single-node drag edges instead of every affected edge", async () => {
    const source = await readAppSource();
    const snapshotHelperStart = source.indexOf("const routeSnapshotEdgesForMove =");
    const snapshotHelperEnd = source.indexOf("const routePointsSnapshotForMove", snapshotHelperStart);
    const snapshotHelperBlock = source.slice(snapshotHelperStart, snapshotHelperEnd);
    const routePointsHelperStart = source.indexOf("const routePointsSnapshotForMove =");
    const routePointsHelperEnd = source.indexOf("const snapshotEdgePoints", routePointsHelperStart);
    const routePointsHelperBlock = source.slice(routePointsHelperStart, routePointsHelperEnd);
    const keyboardStart = source.indexOf("const startKeyboardMoveSession");
    const keyboardEnd = source.indexOf("const nudgeSelectionByKeyboard", keyboardStart);
    const keyboardBlock = source.slice(keyboardStart, keyboardEnd);
    const groupMoveStart = source.indexOf("const startGroupMoveDrag");
    const nodeMoveStart = source.indexOf("const handleNodePointerDown");
    const nodeMoveEnd = source.indexOf("const handlePointerMove", nodeMoveStart);
    const dragStarts = [
      source.slice(groupMoveStart, nodeMoveStart),
      source.slice(nodeMoveStart, nodeMoveEnd)
    ];

    expect(snapshotHelperStart).toBeGreaterThan(-1);
    expect(snapshotHelperBlock).toContain("selectedEdgeIds.has(edge.id)");
    expect(snapshotHelperBlock).toContain("movedIds.has(edge.sourceId) && movedIds.has(edge.targetId)");
    expect(snapshotHelperBlock).toContain("Boolean(edge.manualPoints?.length || edge.routePoints?.length)");
    expect(routePointsHelperBlock).toContain("routeSnapshotEdgesForMove(candidateEdges, movedNodeIds, selectedEdgeIds)");
    expect(routePointsHelperBlock).toContain("currentStoredRoutePointsForEdge(edge)");
    expect(keyboardBlock).toContain("routePointsSnapshotForMove(affectedEdgesForMove, moveNodeIds, moveEdgeIds)");
    for (const block of dragStarts) {
      expect(block).toContain("routePointsSnapshotForMove(affectedEdgesForDrag, dragNodeIds, edgeIdsForDrag)");
      expect(block).not.toContain("affectedEdgesForDrag.map((edge) => [\n        edge.id,\n        affectedEdgeIdsForDrag.has(edge.id) ? currentStoredRoutePointsForEdge(edge) : []");
    }
  });

  test("limits synchronous single-node drag release edge adjustment and finalization work", async () => {
    const source = await readAppSource();
    const syncHelperStart = source.indexOf("const synchronousEdgeAdjustmentCandidates =");
    const syncHelperEnd = source.indexOf("const terminalReconcileNodeScope", syncHelperStart);
    const syncHelperBlock = source.slice(syncHelperStart, syncHelperEnd);
    const finishStart = source.indexOf("const finishNodeDrag = () =>");
    const finishEnd = source.indexOf("const finishTransformDrag", finishStart);
    const finishBlock = source.slice(finishStart, finishEnd);
    const finishMoveStart = source.indexOf("const finishDraggingMove");
    const finishMoveEnd = source.indexOf("const finishNodeDrag", finishMoveStart);
    const finishMoveBlock = source.slice(finishMoveStart, finishMoveEnd);

    expect(source).toContain("const CANVAS_SINGLE_NODE_DRAG_SYNC_EDGE_LIMIT");
    expect(syncHelperBlock).toContain("shouldAdjustEdgeSynchronouslyAfterMove");
    expect(syncHelperBlock).not.toContain("if (movedIds.size !== 1) {\n      return candidateEdges;\n    }");
    expect(syncHelperBlock).toContain("sourceMoved && targetMoved");
    expect(syncHelperBlock).toContain("Boolean(edge.manualPoints?.length)");
    expect(syncHelperBlock).toContain("movedBusNodeIds.has(edge.sourceId) || movedBusNodeIds.has(edge.targetId)");
    expect(syncHelperBlock).toContain("shouldFinalizeMovedNodeEdgesSynchronously");
    expect(syncHelperBlock).toContain("candidateEdges.length <= CANVAS_SINGLE_NODE_DRAG_SYNC_EDGE_LIMIT");
    expect(finishBlock).toContain("const synchronousCandidateEdges = synchronousEdgeAdjustmentCandidates(");
    expect(finishBlock).toContain("const adjustedAffectedEdges = mergeAdjustedCandidateEdges(activeDragging.affectedEdges, adjustedSynchronousEdges);");
    expect(finishBlock).toContain("shouldFinalizeMovedNodeEdgesSynchronously(activeDragging.nodeIds, adjustedAffectedEdges)");
    expect(finishMoveBlock).toContain("const synchronousCandidateEdges = synchronousEdgeAdjustmentCandidates(");
    expect(finishMoveBlock).toContain("shouldFinalizeMovedNodeEdgesSynchronously(activeDragging.nodeIds, adjustedAffectedEdges)");
  });

  test("snapshots node-drag route points from the routed-edge cache before recomputing paths", async () => {
    const source = await readAppSource();
    const snapshotStart = source.indexOf("const currentStoredRoutePointsForEdge =");
    const snapshotEnd = source.indexOf("const snapshotGroupTransformEdgeRoutes", snapshotStart);
    const snapshotBlock = source.slice(snapshotStart, snapshotEnd);
    const cachedIndex = snapshotBlock.indexOf("const cachedRoute =");
    const recomputeIndex = snapshotBlock.indexOf("routeEdgesForStoredRendering(");

    expect(snapshotStart).toBeGreaterThan(-1);
    expect(cachedIndex).toBeGreaterThan(-1);
    expect(recomputeIndex).toBeGreaterThan(cachedIndex);
    expect(snapshotBlock).toContain("!pendingStoredRouteEdgeIdsRef.current.has(edge.id)");
    expect(snapshotBlock).toContain("!pendingRouteEdgeIdsRef.current.has(edge.id)");
    expect(snapshotBlock).toContain("cachedRoute.points.map((point) => ({ ...point }))");
  });

  test("stops collecting single-node drag viewport candidates once preview and snap caps are satisfied", async () => {
    const source = await readAppSource();
    const cacheTypeStart = source.indexOf("type SingleNodeDragCache =");
    const cacheTypeEnd = source.indexOf("type DraggingState =", cacheTypeStart);
    const cacheTypeBlock = source.slice(cacheTypeStart, cacheTypeEnd);
    const scanStart = source.indexOf("const singleNodeDragViewportLocalEdgesByScan");
    const scanEnd = source.indexOf("const singleNodeDragScopedEdges", scanStart);
    const scanBlock = source.slice(scanStart, scanEnd);
    const scopeStart = source.indexOf("const singleNodeDragScopedEdges");
    const scopeEnd = source.indexOf("const singleNodeDragPreviewEdges", scopeStart);
    const scopeBlock = source.slice(scopeStart, scopeEnd);

    expect(source).not.toContain("buildRouteSpatialIndex");
    expect(cacheTypeBlock).not.toContain("routeSpatialIndex");
    expect(cacheTypeBlock).not.toContain("edgeByRouteId");
    expect(scanBlock).toContain("localLimit = Number.POSITIVE_INFINITY");
    expect(scanBlock).toContain("const viewportLocalEdges: Edge[] = [];");
    expect(scanBlock).toContain("for (const edge of edgesToCheck)");
    expect(scanBlock).toContain("if (viewportLocalEdges.length >= localLimit)");
    expect(scanBlock).toContain("break;");
    expect(scopeBlock).toContain("const localLimit = Math.max(CANVAS_SINGLE_NODE_DRAG_PREVIEW_EDGE_LIMIT, CANVAS_SINGLE_NODE_DRAG_SNAP_EDGE_LIMIT);");
    expect(scopeBlock).toContain("singleNodeDragViewportLocalEdgesByScan(dragState, relevantEdges, delta, bounds, localLimit)");
    expect(scopeBlock).not.toContain("queryRouteSpatialIndex");
    expect(scopeBlock).not.toContain("relevantEdges.filter((edge)");
  });

  test("keeps multi-node drag preview bounds scoped to moved graphics instead of all affected external lines", async () => {
    const source = await readAppSource();
    const previewStart = source.indexOf("const buildMultiNodeDragOverlayPreview");
    const previewEnd = source.indexOf("const renderMultiNodeDragOverlay", previewStart);
    const previewBlock = source.slice(previewStart, previewEnd);
    const startKeyboardStart = source.indexOf("const startKeyboardMoveSession");
    const startKeyboardEnd = source.indexOf("const nudgeSelectionByKeyboard", startKeyboardStart);
    const startKeyboardBlock = source.slice(startKeyboardStart, startKeyboardEnd);
    const nodeDragStart = source.indexOf("const handleNodePointerDown");
    const nodeDragEnd = source.indexOf("const handlePointerMove", nodeDragStart);
    const nodeDragBlock = source.slice(nodeDragStart, nodeDragEnd);
    const renderStart = source.indexOf("{renderViewportRoutedEdges.map((route) =>");
    const renderEnd = source.indexOf("{rewiringPreviewRoute", renderStart);
    const renderBlock = source.slice(renderStart, renderEnd);

    expect(previewBlock).toContain("movingEdgeIds: Iterable<string> = []");
    expect(previewBlock).toContain("const movingNodeIdSet = new Set(dragNodeIds)");
    expect(previewBlock).toContain("const movingEdgeIdSet = new Set(movingEdgeIds)");
    expect(previewBlock).toContain("const edgeMovesWithDraggedGraphics");
    expect(previewBlock).toContain("movingEdgeIdSet.has(edge.id)");
    expect(previewBlock).toContain("movingNodeIdSet.has(edge.sourceId) && movingNodeIdSet.has(edge.targetId)");
    expect(previewBlock).toContain("if (!edgeMovesWithDraggedGraphics)");
    expect(startKeyboardBlock).toContain("buildMultiNodeDragOverlayPreview(moveNodeIds, affectedEdgesForMove, originalPositionsForMove, originalRoutePointsForMove, moveEdgeIds)");
    expect(nodeDragBlock).toContain("buildMultiNodeDragOverlayPreview(dragNodeIds, affectedEdgesForDrag, originalPositionsForDrag, originalRoutePointsForDrag, edgeIdsForDrag)");
    expect(source).toContain("const dragOverlayEdgeIdSet = useMemo");
    expect(renderBlock).toContain("(multiNodeDragging && dragOverlayEdgeIdSet.has(edge.id))");
    expect(renderBlock).not.toContain("(multiNodeDragging && dragAffectedEdgeIdSet.has(edge.id))");
  });

  test("keeps canvas shortcuts active after dropping dragged graphics outside the canvas bounds", async () => {
    const source = await readAppSource();
    const finishMoveStart = source.indexOf("const finishDraggingMove");
    const finishMoveEnd = source.indexOf("const finishNodeDrag", finishMoveStart);
    const finishMoveBlock = source.slice(finishMoveStart, finishMoveEnd);
    const finishDragStart = source.indexOf("const finishNodeDrag = () =>");
    const finishDragEnd = source.indexOf("const finishTransformDrag", finishDragStart);
    const finishDragBlock = source.slice(finishDragStart, finishDragEnd);
    const canvasSvgStart = source.indexOf("viewBox={`0 0 ${canvasRenderBounds.width} ${canvasRenderBounds.height}`");
    const pointerLeaveStart = source.indexOf("onPointerLeave={() => {", canvasSvgStart);
    const pointerLeaveEnd = source.indexOf("onPointerCancel={() => {", pointerLeaveStart);
    const pointerLeaveBlock = source.slice(pointerLeaveStart, pointerLeaveEnd);
    const finishMoveCommitIndex = finishMoveBlock.indexOf("commitFastMovedGraphPatches(");
    const finishDragCommitIndex = finishDragBlock.indexOf("commitFastMovedGraphPatches(");

    expect(source).toContain("const canvasSelectionShortcutActiveRef = useRef(false);");
    expect(source).toContain("canvasSelectionShortcutActiveRef.current = activeSelectedNodeIds.length > 0 || activeCanvasSelection.edgeIds.length > 0;");
    expect(source).toContain("canvasSelectionShortcutActiveRef.current = snapshot.nodeIds.length > 0 || snapshot.edgeIds.length > 0;");
    expect(finishMoveBlock).toContain("canvasInteractionRef.current = true;");
    expect(finishMoveBlock).toContain("projectListPointerInsideRef.current = false;");
    expect(finishMoveCommitIndex).toBeGreaterThan(-1);
    expect(finishMoveBlock.indexOf("canvasInteractionRef.current = true;", finishMoveCommitIndex)).toBeGreaterThan(finishMoveCommitIndex);
    expect(finishMoveBlock.indexOf("projectListPointerInsideRef.current = false;", finishMoveCommitIndex)).toBeGreaterThan(finishMoveCommitIndex);
    expect(finishDragBlock).toContain("canvasInteractionRef.current = true;");
    expect(finishDragBlock).toContain("projectListPointerInsideRef.current = false;");
    expect(finishDragCommitIndex).toBeGreaterThan(-1);
    expect(finishDragBlock.indexOf("canvasInteractionRef.current = true;", finishDragCommitIndex)).toBeGreaterThan(finishDragCommitIndex);
    expect(finishDragBlock.indexOf("projectListPointerInsideRef.current = false;", finishDragCommitIndex)).toBeGreaterThan(finishDragCommitIndex);
    expect(pointerLeaveBlock).toContain("if (draggingRef.current) {");
    expect(pointerLeaveBlock).toContain("if (canvasSelectionShortcutActiveRef.current) {");
    expect(pointerLeaveBlock.indexOf("canvasInteractionRef.current = false;")).toBeGreaterThan(pointerLeaveBlock.indexOf("if (canvasSelectionShortcutActiveRef.current) {"));
  });

  test("keeps rotated bus graphics from inflating multi-node drag preview bounds", async () => {
    const source = await readAppSource();
    const previewStart = source.indexOf("const buildMultiNodeDragOverlayPreview");
    const previewEnd = source.indexOf("const renderMultiNodeDragOverlay", previewStart);
    const previewBlock = source.slice(previewStart, previewEnd);
    const renderStart = source.indexOf("{detailedViewportNodes.map((node) =>");
    const renderEnd = source.indexOf("{renderMultiNodeDragOverlay()}", renderStart);
    const nodeRenderBlock = source.slice(renderStart, renderEnd);

    expect(source).toContain("const nodeHasUprightBoundsContent");
    expect(previewBlock).toContain("const includeUprightContentInBounds = nodeHasUprightBoundsContent(");
    expect(previewBlock).toContain("nodeVisualInteractionBounds(node, originalPosition, 0, includeUprightContentInBounds)");
    expect(previewBlock).not.toContain("nodeTransformedHalfExtents(node, true)");
    expect(nodeRenderBlock).toContain("nodeScaleHandleControlPoint(node, handle, handleGapX, handleGapY, uprightStaticSelectionOutline)");
  });

  test("snapshots drag and transform routes from current rotated node geometry instead of stale routed cache", async () => {
    const source = await readAppSource();
    const helperStart = source.indexOf("const currentStoredRoutePointsForEdge");
    const helperEnd = source.indexOf("const buildGroupTransformEdgeUpdates", helperStart);
    const helperBlock = source.slice(helperStart, helperEnd);
    const keyboardStart = source.indexOf("const startKeyboardMoveSession");
    const keyboardEnd = source.indexOf("const nudgeSelectionByKeyboard", keyboardStart);
    const keyboardBlock = source.slice(keyboardStart, keyboardEnd);
    const moveStart = source.indexOf("const moveSelection =");
    const moveEnd = source.indexOf("const updateSelectedNode", moveStart);
    const moveBlock = source.slice(moveStart, moveEnd);
    const transformStart = source.indexOf("const snapshotGroupTransformEdgeRoutes");
    const transformEnd = source.indexOf("const buildGroupTransformEdgeUpdates", transformStart);
    const transformBlock = source.slice(transformStart, transformEnd);
    const dragStart = source.indexOf("const handleNodePointerDown");
    const dragEnd = source.indexOf("const handlePointerMove", dragStart);
    const dragBlock = source.slice(dragStart, dragEnd);
    const layoutStart = source.indexOf("const commitLayoutNodePositions");
    const layoutEnd = source.indexOf("const handleWheel", layoutStart);
    const layoutBlock = source.slice(layoutStart, layoutEnd);

    expect(helperStart).toBeGreaterThan(-1);
    expect(helperBlock).toContain("routeEdgesForStoredRendering(compactPreviewNodes(source, target), [edge], bounds)");
    expect(helperBlock).toContain("routedEdgeById.get(edge.id)?.points");
    expect(keyboardBlock).toContain("routePointsSnapshotForMove(affectedEdgesForMove, moveNodeIds, moveEdgeIds)");
    expect(moveBlock).toContain("routePointsSnapshotForMove(affectedEdgesForMove, moveNodeIds, moveEdgeIds)");
    expect(transformBlock).toContain("currentStoredRoutePointsForEdge(edgeById.get(edgeId))");
    expect(transformBlock).toContain("currentStoredRoutePointsForEdge(edge)");
    expect(dragBlock).toContain("routePointsSnapshotForMove(affectedEdgesForDrag, dragNodeIds, edgeIdsForDrag)");
    expect(layoutBlock).toContain("currentStoredRoutePointsForEdge(edge)");
  });

  test("renders device labels as scalable upright node-owned graphics with a global visibility toggle", async () => {
    const source = await readAppSource();
    const renderStart = source.indexOf("{detailedViewportNodes.map((node) =>");
    const renderEnd = source.indexOf("{terminalPressPreviewEdgeRoutes.map", renderStart);
    const renderBlock = source.slice(renderStart, renderEnd);
    const topbarStart = source.indexOf("<header className=\"topbar\"");
    const topbarEnd = source.indexOf("</header>", topbarStart);
    const topbarBlock = source.slice(topbarStart, topbarEnd);
    const pointerMoveStart = source.indexOf("const handlePointerMove");
    const pointerMoveEnd = source.indexOf("const handleWheel", pointerMoveStart);
    const pointerMoveBlock = source.slice(pointerMoveStart, pointerMoveEnd);

    expect(source).toContain("const [deviceLabelsVisible, setDeviceLabelsVisible] = useState(true)");
    expect(source).toContain("type NodeLabelDragState");
    expect(source).toContain("const nodeLabelTransform");
    expect(source).toContain("const nodeLabelText");
    expect(source).toContain("const nodeLabelVertical");
    expect(source).toContain("const nodeLabelDisplayMode");
    expect(source).toContain("const nodeLabelShouldRender");
    expect(source).toContain("const startNodeLabelDrag");
    expect(source).toContain("const finishNodeLabelDrag");
    expect(renderBlock).toContain("nodeLabelShouldRender(node, deviceLabelsVisible)");
    expect(renderBlock).toContain("className={`node-device-label");
    expect(renderBlock).toContain("transform={nodeLabelTransform(node)}");
    expect(renderBlock).toContain("onPointerDown={isEditMode ? (event) => startNodeLabelDrag(event, node) : undefined}");
    expect(topbarBlock).toContain("setDeviceLabelsVisible((current) => !current)");
    expect(topbarBlock).toContain("aria-label={deviceLabelsVisible ? \"隐藏设备标识\" : \"显示设备标识\"}");
    expect(pointerMoveBlock).toContain("if (nodeLabelDrag && svgRef.current)");
    expect(pointerMoveBlock).toContain("_labelX");
    expect(pointerMoveBlock).toContain("_labelY");
  });

  test("selects device labels as node-owned graphics without turning them into standalone objects", async () => {
    const source = await readAppSource();
    const styles = await readStyles();
    const renderStart = source.indexOf("{detailedViewportNodes.map((node) =>");
    const renderEnd = source.indexOf("{terminalPressPreviewEdgeRoutes.map", renderStart);
    const renderBlock = source.slice(renderStart, renderEnd);
    const labelStart = renderBlock.indexOf("className={`node-device-label");
    const labelEnd = renderBlock.indexOf("<g className=\"node-terminal-layer\"", labelStart);
    const labelBlock = renderBlock.slice(labelStart, labelEnd);
    const dragStart = source.indexOf("const startNodeLabelDrag");
    const dragEnd = source.indexOf("const finishNodeLabelDrag", dragStart);
    const dragBlock = source.slice(dragStart, dragEnd);
    const pointerMoveStart = source.indexOf("if (nodeLabelDrag && svgRef.current)");
    const pointerMoveEnd = source.indexOf("if (terminalPress && svgRef.current)", pointerMoveStart);
    const pointerMoveBlock = source.slice(pointerMoveStart, pointerMoveEnd);

    expect(renderBlock).toContain("${selected ? \"selected\" : \"\"}");
    expect(renderBlock).toContain("${focused ? \"focused\" : \"\"}");
    expect(labelBlock).toContain("data-node-id={node.id}");
    expect(labelBlock).toContain("data-label-owner=\"device\"");
    expect(dragBlock).toContain("selectCanvasGraphics([node.id], [], { scope: \"direct\" })");
    expect(dragBlock).toContain("setInspectorTab(\"graph\")");
    expect(dragBlock).not.toContain("setGraphInfoView");
    expect(pointerMoveBlock).toContain("params: { ...node.params, _labelX: nextX, _labelY: nextY }");
    expect(styles.slice(styles.indexOf(".node-device-label text"), styles.indexOf(".node-device-label.selected text"))).toContain("pointer-events: all");
    expect(source).not.toContain("selectedLabelId");
  });

  test("keeps rotated device labels upright by switching between horizontal and vertical text layout", async () => {
    const source = await readAppSource();
    const styles = await readStyles();
    const transformStart = source.indexOf("const nodeLabelTransform");
    const transformEnd = source.indexOf("function nodeLabelTextAnchor", transformStart);
    const transformBlock = source.slice(transformStart, transformEnd);
    const renderStart = source.indexOf("{detailedViewportNodes.map((node) =>");
    const renderEnd = source.indexOf("{terminalPressPreviewEdgeRoutes.map", renderStart);
    const renderBlock = source.slice(renderStart, renderEnd);
    const graphPanelStart = source.indexOf("aria-label=\"图元属性分类\"");
    const graphPanelEnd = source.indexOf("{isStaticNode(inspectorSelectedNode)", graphPanelStart);
    const graphPanelBlock = source.slice(graphPanelStart, graphPanelEnd);
    const pointerMoveStart = source.indexOf("const handlePointerMove");
    const pointerMoveEnd = source.indexOf("const handleWheel", pointerMoveStart);
    const pointerMoveBlock = source.slice(pointerMoveStart, pointerMoveEnd);

    expect(source).toContain("_labelRotation");
    expect(source).toContain("type NodeLabelRotateDragState");
    expect(source).toContain("function normalizeNodeLabelRotation");
    expect(source).toContain("const nodeLabelVertical");
    expect(source).toContain("const nodeLabelRotationFromPoint");
    expect(source).toContain("const startNodeLabelRotateDrag");
    expect(source).toContain("const finishNodeLabelRotateDrag");
    expect(transformBlock).not.toContain("rotate(");
    expect(transformBlock).not.toContain("scale(");
    expect(renderBlock).toContain("${nodeLabelIsVertical ? \"vertical\" : \"horizontal\"}");
    expect(renderBlock).toContain("className=\"node-label-rotate-control\"");
    expect(renderBlock).toContain("onPointerDown={(event) => startNodeLabelRotateDrag(event, node)}");
    expect(graphPanelBlock).toContain("_labelRotation");
    expect(graphPanelBlock).toContain("<option value=\"90\">90° 纵排</option>");
    expect(pointerMoveBlock).toContain("if (nodeLabelRotateDrag && svgRef.current)");
    expect(pointerMoveBlock).toContain("_labelRotation");
    expect(styles).toContain(".node-device-label.vertical text");
    expect(styles).toContain("writing-mode: vertical-rl");
    expect(styles).toContain("text-orientation: upright");
  });

  test("groups continuous numeric tokens while rendering vertical device labels", async () => {
    const source = await readAppSource();
    const styles = await readStyles();
    const renderStart = source.indexOf("{detailedViewportNodes.map((node) =>");
    const renderEnd = source.indexOf("{terminalPressPreviewEdgeRoutes.map", renderStart);
    const renderBlock = source.slice(renderStart, renderEnd);

    expect(source).toContain("function nodeLabelVerticalSegments");
    expect(source).toContain("nodeLabelNumericTokenPattern");
    expect(source).toContain("\\d+(?:[./:：-]\\d+)*");
    expect(renderBlock).toContain("const nodeLabelVerticalTokens = nodeLabelIsVertical ? nodeLabelVerticalSegments(nodeLabelContent) : [];");
    expect(renderBlock).toContain("nodeLabelVerticalTokens.map");
    expect(renderBlock).toContain("className={`node-label-vertical-token ${segment.numeric ? \"numeric\" : \"\"}`}");
    expect(renderBlock).toContain("nodeLabelVerticalTokenY(index, nodeLabelVerticalTokens.length, node)");
    expect(source).toContain("buildSvgNodeLabelTextMarkup(node)");
    expect(styles).toContain(".node-label-vertical-token.numeric");
    expect(styles).toContain("letter-spacing: 0");
  });

  test("offers device label content style and alignment editors in the graph panel", async () => {
    const source = await readAppSource();
    const styles = await readStyles();
    const graphPanelStart = source.indexOf("aria-label=\"图元属性分类\"");
    const graphPanelEnd = source.indexOf("{isStaticNode(inspectorSelectedNode)", graphPanelStart);
    const graphPanelBlock = source.slice(graphPanelStart, graphPanelEnd);
    const styleActionsBlock = cssRuleBlock(styles, ".device-label-style-actions {");
    const styleLabelBlock = cssRuleBlock(styles, ".device-label-style-actions label");
    const styleInputBlock = cssRuleBlock(styles, ".device-label-style-actions input");

    expect(source).toContain("const FONT_FAMILY_OPTIONS");
    expect(source).toContain("device-label-style-actions");
    expect(graphPanelBlock).toContain("_labelDisplayMode");
    expect(graphPanelBlock).toContain("_labelText");
    expect(graphPanelBlock).toContain("_labelColor");
    expect(graphPanelBlock).toContain("_labelFontFamily");
    expect(graphPanelBlock).toContain("_labelFontSize");
    expect(graphPanelBlock).toContain("_labelFontWeight");
    expect(graphPanelBlock).toContain("_labelFontStyle");
    expect(graphPanelBlock).toContain("_labelTextDecoration");
    expect(graphPanelBlock).toContain("_labelTextAnchor");
    expect(source).toContain("fontFamily: FONT_FAMILY_OPTIONS");
    expect(source).toContain("_labelFontFamily: FONT_FAMILY_OPTIONS");
    expect(graphPanelBlock).toContain("<option value=\"middle\">居中</option>");
    expect(styleActionsBlock).toContain("display: flex");
    expect(styleActionsBlock).toContain("flex-wrap: nowrap");
    expect(styleActionsBlock).not.toContain("repeat(3");
    expect(styleLabelBlock).toContain("min-height: var(--param-table-control-height)");
    expect(styleLabelBlock).toContain("border: 0");
    expect(styleLabelBlock).toContain("padding: 0 2px");
    expect(styleInputBlock).toContain("width: 14px");
    expect(styleInputBlock).toContain("height: 14px");
  });

  test("sets selected device label display mode from context menu and graph inspector", async () => {
    const source = await readAppSource();
    const contextStart = source.indexOf("{contextMenu && (");
    const contextEnd = source.indexOf("{projectMenu && (", contextStart);
    const contextBlock = source.slice(contextStart, contextEnd);
    const graphPanelStart = source.indexOf("aria-label=\"图元属性分类\"");
    const graphPanelEnd = source.indexOf("{isStaticNode(inspectorSelectedNode)", graphPanelStart);
    const graphPanelBlock = source.slice(graphPanelStart, graphPanelEnd);
    const renderStart = source.indexOf("{detailedViewportNodes.map((node) =>");
    const renderEnd = source.indexOf("{terminalPressPreviewEdgeRoutes.map", renderStart);
    const renderBlock = source.slice(renderStart, renderEnd);

    expect(source).toContain("type NodeLabelDisplayMode");
    expect(source).toContain("const NODE_LABEL_DISPLAY_MODES");
    expect(source).toContain("const setSelectedNodeLabelDisplayMode");
    expect(source).toContain("_labelDisplayMode");
    expect(renderBlock).toContain("nodeLabelShouldRender(node, deviceLabelsVisible)");
    expect(contextBlock).toContain("className=\"context-menu-submenu\"");
    expect(contextBlock).toContain("className=\"context-menu-submenu-trigger\"");
    expect(contextBlock).toContain("className=\"context-menu-submenu-panel\"");
    expect(contextBlock).toContain("标识显示");
    expect(contextBlock).toContain("标识始终显示");
    expect(contextBlock).toContain("标识始终隐藏");
    expect(contextBlock).toContain("标识跟随显示");
    expect(contextBlock).toContain("setSelectedNodeLabelDisplayMode(\"always\")");
    expect(contextBlock).toContain("setSelectedNodeLabelDisplayMode(\"hidden\")");
    expect(contextBlock).toContain("setSelectedNodeLabelDisplayMode(\"follow\")");
    expect(graphPanelBlock).toContain("_labelDisplayMode");
    expect(graphPanelBlock).toContain("<option value=\"always\">始终显示</option>");
    expect(graphPanelBlock).toContain("<option value=\"hidden\">始终隐藏</option>");
    expect(graphPanelBlock).toContain("<option value=\"follow\">跟随显示</option>");
  });

  test("defers bus terminal synchronization and keeps graph edits out of automatic draft saves", async () => {
    const source = await readAppSource();
    const busSyncEffectStart = source.indexOf("const pendingBusSyncNodeIds = pendingBusTerminalSyncNodeIdsRef.current;");
    const busSyncEffectEnd = source.indexOf("const canvasBounds", busSyncEffectStart);
    const busSyncEffectBlock = source.slice(busSyncEffectStart, busSyncEffectEnd);
    const saveDraftStart = source.indexOf("const saveActiveProjectPointer =");
    const saveDraftEnd = source.indexOf("const setActiveLayer", saveDraftStart);
    const saveDraftBlock = source.slice(saveDraftStart, saveDraftEnd);
    const saveStart = source.indexOf("const saveCurrentProject");
    const saveEnd = source.indexOf("const renameProjectRecord", saveStart);
    const saveBlock = source.slice(saveStart, saveEnd);
    const topologyStaleStart = source.indexOf("拓扑结果已过期");

    expect(source).toContain("const scheduleIdleWork");
    expect(source).toContain("requestIdleCallback");
    expect(source).toContain("edgeEndpointRevision");
    expect(source).not.toContain("const connectionEndpointSignature");
    expect(busSyncEffectBlock).toContain("lastBusTerminalSyncEndpointRevisionRef.current === graphStore.edgeEndpointRevision");
    expect(busSyncEffectBlock).toContain("lastBusTerminalSyncEndpointRevisionRef.current = graphStore.edgeEndpointRevision");
    expect(busSyncEffectBlock).toContain("scheduleIdleWork");
    expect(saveDraftBlock).toContain("ACTIVE_PROJECT_STORAGE_KEY");
    expect(saveDraftBlock).toContain("DRAFT_PROJECT_STORAGE_KEY");
    expect(saveDraftBlock).toContain("window.localStorage.setItem");
    expect(saveDraftBlock).not.toContain("nodes");
    expect(saveDraftBlock).not.toContain("edges");
    expect(saveDraftBlock).not.toContain("groups");
    expect(saveBlock).toContain("saveActiveProjectPointer(targetId");
    expect(saveBlock).toContain("saveActiveProjectPointer(savedRecord.id");
    expect(source).not.toContain("draftAutosaveProjectId");
    expect(source).not.toContain("saveDraftProject(draftAutosaveProjectId");
    expect(source).not.toContain("[activeProjectKey, activeSchemeKey, canvasBackgroundColor, canvasBackgroundImage, canvasBackgroundImageAssetId, canvasHeight, canvasWidth, currentUnit, deviceIndexCounters, edges, nodes, powerBaseValue, powerUnit, projectName, voltageUnit]");
    const topologyStaleBlock = source.slice(Math.max(0, topologyStaleStart - 400), topologyStaleStart + 300);
    expect(topologyStaleBlock).toContain("scheduleIdleWork");
    expect(topologyStaleBlock).toContain("graphStore.topologyRevision");
    expect(topologyStaleBlock).not.toContain("}, [edges, nodes]");
  });

  test("keeps graph operations out of autosave paths and avoids deep undo snapshots for move commits", async () => {
    const source = await readAppSource();
    const saveStart = source.indexOf("const saveCurrentProject");
    const saveEnd = source.indexOf("const renameProjectRecord", saveStart);
    const manualSaveBlock = source.slice(saveStart, saveEnd);
    const schemePersistStart = source.indexOf("const normalizedSchemesPayload = serializeSchemesForStorage(schemes);");
    const schemePersistEnd = source.indexOf("}, [schemes]);", schemePersistStart);
    const schemePersistBlock = source.slice(schemePersistStart, schemePersistEnd);
    const operationBlocks = [
      ["finishNodeDrag", source.indexOf("const finishNodeDrag = () =>"), source.indexOf("const finishTransformDrag")],
      ["moveSelection", source.indexOf("const moveSelection ="), source.indexOf("const updateSelectedNode")],
      ["pasteSelection", source.indexOf("const pasteSelection = () =>"), source.indexOf("const finishMarqueeSelection")],
      ["deleteSelectedGraphicsFromCanvas", source.indexOf("const deleteSelectedGraphicsFromCanvas = () =>"), source.indexOf("const groupSelectedGraphics", source.indexOf("const deleteSelectedGraphicsFromCanvas = () =>"))],
      ["finishConnectToTarget", source.indexOf("const finishConnectToTarget"), source.indexOf("const finishRewiring", source.indexOf("const finishConnectToTarget"))]
    ] as const;

    expect(manualSaveBlock).toContain("saveActiveProjectPointer(targetId");
    expect(manualSaveBlock).toContain("saveActiveProjectPointer(savedRecord.id");
    expect(schemePersistBlock).toContain("persistSchemesPayloadToStorageAndBackend(normalizedSchemesPayload)");
    expect(source).not.toContain("draftAutosaveProjectId");
    expect(source).not.toContain("saveDraftProject(draftAutosaveProjectId");
    expect(schemePersistBlock).not.toContain("nodes");
    expect(schemePersistBlock).not.toContain("edges");
    expect(schemePersistBlock).not.toContain("groups");
    for (const [name, start, end] of operationBlocks) {
      expect(start, `${name} block should exist`).toBeGreaterThan(-1);
      expect(end, `${name} block end should exist`).toBeGreaterThan(start);
      const block = source.slice(start, end);
      expect(block, `${name} must not call draft save`).not.toContain("saveDraftProject(");
      expect(block, `${name} must not call manual save`).not.toContain("saveCurrentProject(");
      expect(block, `${name} must not persist scheme payload`).not.toContain("persistBackendSchemesPayload(");
      expect(block, `${name} must not persist scheme payload`).not.toContain("persistSchemesPayloadToStorageAndBackend(");
      expect(block, `${name} must not serialize schemes`).not.toContain("serializeSchemesForStorage(");
      expect(block, `${name} must not mutate scheme records`).not.toContain("setSchemes(");
      expect(block, `${name} must not mutate saved project records`).not.toContain("updateProjectInSchemes(");
    }
    const moveStart = source.indexOf("const moveSelection =");
    const moveEnd = source.indexOf("const updateSelectedNode", moveStart);
    const moveBlock = source.slice(moveStart, moveEnd);
    expect(moveBlock).toContain("pushUndoSnapshot(true, false, undoScopeForGraphPatch");
    expect(moveBlock).not.toContain("pushUndoSnapshot();");
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
    expect(boundaryBlock).toContain("const nextNodes = orderedNodesForIds(nodes, relevantNodeIds).map");
    expect(boundaryBlock).not.toContain("const nextNodes = nodes.flatMap");
    expect(boundaryBlock).not.toContain("const nextNodes = nodes.map");
    expect(dirtyBlock).toContain("Object.keys(originalRoutePoints)");
    expect(dirtyBlock).not.toContain("for (const edge of edges)");
    expect(commitBlock).toContain("const initialStoredRouteDirtyIds = dirtyEdgeIdsForMovedLocalRoutes");
    expect(commitBlock).toContain("markStoredRouteEdgesDirty(nonTranslatedInitialStoredRouteDirtyIds)");
    expect(commitBlock).not.toContain("markStoredRouteEdgesDirty(dirtyEdgeIdsAfterMove");
    expect(scheduleBlock).toContain("for (const edgeId of dirtyOptimizedEdgeIds)");
    expect(scheduleBlock).not.toContain("for (const edge of optimizationEdges)");
    expect(scheduleBlock).not.toContain("edgeReferenceDiffIds(expectedEdges, optimized.edges)");
  });

  test("keeps single-node drag and move landing bounds scoped to moved content", async () => {
    const source = await readAppSource();
    const moveBoundsStart = source.indexOf("const canvasBoundsForMoveDelta");
    const moveBoundsEnd = source.indexOf("const computeNodeDragDelta", moveBoundsStart);
    const moveBoundsBlock = source.slice(moveBoundsStart, moveBoundsEnd);
    const adjustStart = source.indexOf("const adjustEdgesAfterNodeMove =");
    const adjustEnd = source.indexOf("const rebuildSingleAffectedConnectionRoute", adjustStart);
    const adjustBlock = source.slice(adjustStart, adjustEnd);
    const commitStart = source.indexOf("const commitFastMovedGraphPatches");
    const commitEnd = source.indexOf("const clampPointToCanvas", commitStart);
    const commitBlock = source.slice(commitStart, commitEnd);

    expect(moveBoundsBlock).toContain("const movedNodes: ModelNode[] = []");
    expect(moveBoundsBlock).not.toContain("nodes.map");
    expect(moveBoundsBlock).not.toContain("previewNodes");
    expect(moveBoundsBlock).not.toContain("edges,");
    expect(adjustBlock).toContain("leftTopCanvasOriginShiftForContent(Array.from(movedNextNodeById.values()))");
    expect(adjustBlock).not.toContain("leftTopCanvasOriginShiftForContent(nextNodes)");
    expect(commitBlock).toContain("leftTopCanvasOriginShiftForContent(committedNodeUpdates, committedCandidateEdges)");
    expect(commitBlock).toContain("canvasBoundsForAutoExpandedGraphContent(effectiveCanvasBounds, committedNodeUpdates, committedCandidateEdges, [], CANVAS_AUTO_EXPAND_PADDING)");
    expect(commitBlock).toContain("expandCanvasToFitGraph(committedNodeUpdates, nextEdgesForBounds, [], CANVAS_AUTO_EXPAND_PADDING, commitCanvasBounds);");
    expect(commitBlock).not.toContain("canvasBoundsForGraphContent(effectiveCanvasBounds, nextNodes, committedCandidateEdges, [], CANVAS_AUTO_EXPAND_PADDING)");
    expect(commitBlock).not.toContain("expandCanvasToFitGraph(nextNodes, nextEdgesForBounds, [], CANVAS_AUTO_EXPAND_PADDING, commitCanvasBounds);");
  });

  test("keeps single-node move route rendering on stored-route local patches", async () => {
    const source = await readAppSource();
    const routingStart = source.indexOf("const patchStoredRouteStoreForEdgeIds");
    const routingEnd = source.indexOf("const routedEdges = routedRouteState.routes;", routingStart);
    const routingBlock = source.slice(routingStart, routingEnd);
    const commitStart = source.indexOf("const commitFastMovedGraphPatches");
    const commitEnd = source.indexOf("const clampPointToCanvas", commitStart);
    const commitBlock = source.slice(commitStart, commitEnd);
    const normalCommitStart = commitBlock.lastIndexOf("const edgePatch = edgePatchFromCandidateEdges(previousCandidateEdges, committedCandidateEdges);");
    const normalCommitBlock = commitBlock.slice(normalCommitStart);

    expect(routingStart).toBeGreaterThan(-1);
    expect(source).toContain("refreshCrossingArcPaths");
    expect(source).toContain("routeStorePatchRoutes");
    expect(routingBlock).toContain("queryRouteSpatialIndex(store.routeSpatialIndex");
    expect(routingBlock).toContain("routeEdgesForStoredRendering(routeNodesForEdge, [edge], bounds)");
    expect(routingBlock).toContain("const routeDeleteIdSet = new Set<string>();");
    expect(routingBlock).toContain("changedRouteIds.has(route.edgeId) && localRouteById.has(route.edgeId) && !options.replaceChanged");
    expect(routingBlock).toContain("routeDeleteIdSet.add(edgeId);");
    expect(routingBlock).toContain("localRouteById.delete(edgeId);");
    expect(routingBlock).toContain("addLocalRoute(nextRoute, { replaceChanged: true });");
    expect(routingBlock).not.toContain("localRouteById.set(nextRoute.edgeId, nextRoute);");
    expect(routingBlock).toContain("refreshCrossingArcPaths(localRoutes, changedRouteIds, Array.from(previousLocalRouteById.values()))");
    expect(routingBlock).toContain("routeStorePatchRoutes(store, refreshedRoutes, routeDeleteIds)");
    expect(routingBlock).toContain("const patchedStoredRouteStore = patchStoredRouteStoreForEdgeIds(");
    expect(routingBlock).toContain("routeInput.nodes\n      );");
    expect(routingBlock).not.toContain("patchStoredRouteStoreForEdgeIds(cachedRouteStoreRef.current, committedStoredEdgeIds, canvasBounds, routingNodes)");
    expect(routingBlock).toContain("routeEdgesForCachedStoredRendering(");
    expect(routingBlock).toContain("routeInput.nodes,");
    expect(routingBlock).toContain("routeInput.edges,");
    expect(normalCommitBlock).toContain("const movedRouteDirtyResult = dirtyEdgeIdsAfterBulkMove(previousCandidateEdges, committedCandidateEdges, movedNodeIds, routeCachePatchedEdgeIds, edgePatchDirtyIds);");
    expect(normalCommitBlock).toContain("const movedRouteDirtyIds = movedRouteDirtyResult.dirtyIds;");
    expect(normalCommitBlock).toContain("legacyRouteDirtyCount: movedRouteDirtyResult.legacyDirtyCount");
    expect(normalCommitBlock).toContain("const storedRouteDirtyIds = storedRouteDirtyIdsForMove(movedRouteDirtyIds, routeCachePatchedEdgeIds);");
    expect(normalCommitBlock).toContain("markRouteEdgesDirty(movedRouteDirtyIds);");
    expect(normalCommitBlock).toContain("markStoredRouteEdgesDirty(storedRouteDirtyIds);");
    expect(normalCommitBlock).not.toContain("markStoredRouteEdgesDirty(edgePatchDirtyIds);");
    expect(normalCommitBlock).not.toContain("markRouteEdgesDirty(edgePatchDirtyIds);");
    expect(normalCommitBlock).toContain("const nextEdgesForBounds = edgePatch.edgeUpserts;");
    expect(normalCommitBlock).not.toContain("const nextEdgesForBounds = overlayEdgesForPatch(edgePatch.edgeUpserts, edgePatch.edgeDeleteIds);");
  });

  test("keeps high-fanout single-node drag commits off full node overlays and sync blocker scans", async () => {
    const source = await readAppSource();
    const finishStart = source.indexOf("const finishNodeDrag = () =>");
    const finishEnd = source.indexOf("const finishTransformDrag", finishStart);
    const finishBlock = source.slice(finishStart, finishEnd);
    const finishMoveStart = source.indexOf("const finishDraggingMove");
    const finishMoveEnd = source.indexOf("const finishNodeDrag", finishMoveStart);
    const finishMoveBlock = source.slice(finishMoveStart, finishMoveEnd);
    const commitStart = source.indexOf("const commitFastMovedGraphPatches");
    const commitEnd = source.indexOf("const clampPointToCanvas", commitStart);
    const commitBlock = source.slice(commitStart, commitEnd);

    expect(source).toContain("const nextNodesForMovedGraphCommit =");
    expect(source).toContain("const shouldRunSynchronousMoveBlockerRepair =");
    expect(source).toContain("const dragMovedNodeIdSet =");
    expect(source).toContain("const dragDraggedEdgeIdSet =");
    expect(source).toContain("const dragMovedBusNodeIdSet =");
    expect(source).toContain("movedNodeUpdates.length < store.nodes.length");
    expect(source).toContain("return uniqueMovedNodeIds.size > 0 && movedNodeUpdates.length < store.nodes.length ? movedNodeUpdates : overlayGraphStoreNodes(store, movedNodeUpdates);");
    expect(finishBlock).toContain("nextNodesForMovedGraphCommit(graphStore, movedNodeUpdates, dragNodeIds)");
    expect(finishBlock).not.toContain("const nextNodes = overlayGraphStoreNodes(graphStore, movedNodeUpdates);");
    expect(finishMoveBlock).toContain("nextNodesForMovedGraphCommit(graphStore, movedNodeUpdates, dragNodeIds)");
    expect(finishMoveBlock).not.toContain("const nextNodes = overlayGraphStoreNodes(graphStore, movedNodeUpdates);");
    expect(commitBlock).toContain("shouldRunSynchronousMoveBlockerRepair(\n        movedNodeIds,\n        externalMoveCandidateEdges(previousCandidateEdges, internalMovedEdgeIds),\n        synchronousRepairCandidateEdges");
    expect(commitBlock).toContain("routePointsForMovedEdgesBlockedByStationaryNodes(");
    expect(commitBlock).not.toContain("if (movedNodeIds.length > 0) {\n      const blockedConnectedRoutePoints = routePointsForMovedEdgesBlockedByStationaryNodes");
  });

  test("diffs unchanged-order drag candidate edges without rebuilding lookup maps", async () => {
    const source = await readAppSource();
    const orderHelperStart = source.indexOf("const edgeListsHaveSameOrder =");
    const orderHelperEnd = source.indexOf("const edgeReferenceDiffIds", orderHelperStart);
    const orderHelperBlock = source.slice(orderHelperStart, orderHelperEnd);
    const diffStart = source.indexOf("const edgeReferenceDiffIds =");
    const diffEnd = source.indexOf("const dirtyEdgeIdsAfterMove", diffStart);
    const diffBlock = source.slice(diffStart, diffEnd);
    const patchStart = source.indexOf("const edgePatchFromCandidateEdges =");
    const patchEnd = source.indexOf("const graphStorePatchStillCurrent", patchStart);
    const patchBlock = source.slice(patchStart, patchEnd);

    expect(orderHelperStart).toBeGreaterThan(-1);
    expect(orderHelperBlock).toContain("previousEdges.length !== nextEdges.length");
    expect(orderHelperBlock).toContain("previousEdges[index].id !== nextEdges[index].id");
    expect(diffBlock).toContain("if (edgeListsHaveSameOrder(previousEdges, nextEdges))");
    expect(diffBlock).toContain("if (previousEdges[index] !== nextEdges[index])");
    expect(diffBlock.indexOf("if (edgeListsHaveSameOrder(previousEdges, nextEdges))"))
      .toBeLessThan(diffBlock.indexOf("const previousById = new Map"));
    expect(patchBlock).toContain("if (edgeListsHaveSameOrder(previousCandidateEdges, nextCandidateEdges))");
    expect(patchBlock).toContain("return { edgeUpserts, edgeDeleteIds: [] };");
    expect(patchBlock.indexOf("if (edgeListsHaveSameOrder(previousCandidateEdges, nextCandidateEdges))"))
      .toBeLessThan(patchBlock.indexOf("const previousById = new Map"));
  });

  test("patches high-fanout moved-node route cache without forcing every connected route to rerender", async () => {
    const source = await readAppSource();
    const helperStart = source.indexOf("const shouldPatchRouteCacheForHighFanoutMove =");
    const helperEnd = source.indexOf("const commitFastMovedGraphPatches", helperStart);
    const helperBlock = source.slice(helperStart, helperEnd);
    const commitStart = source.indexOf("const commitFastMovedGraphPatches");
    const commitEnd = source.indexOf("const clampPointToCanvas", commitStart);
    const commitBlock = source.slice(commitStart, commitEnd);

    expect(helperStart).toBeGreaterThan(-1);
    expect(source).toContain("const shouldPatchRouteCacheForHighFanoutMove =");
    expect(helperBlock).not.toContain("movedNodeIds.length === 1 && candidateEdges.length > MAX_DEFERRED_MOVE_REPAIR_CANDIDATE_EDGES");
    expect(helperBlock).toContain("movedNodeIds.length > 0 && candidateEdges.length > MAX_DEFERRED_MOVE_REPAIR_CANDIDATE_EDGES");
    expect(helperBlock).toContain("cachedRouteStoreRef.current");
    expect(helperBlock).toContain("preserveDraggedRouteShape({");
    expect(helperBlock).toContain("pointsToOrthogonalPath(points)");
    expect(helperBlock).toContain("routeStorePatchRoutes(routeStore, routeUpdates)");
    expect(helperBlock).toContain("cachedRoutedEdgesRef.current = patchedRouteStore.routes");
    expect(commitBlock).toContain("patchCachedRoutesForHighFanoutMove(");
    expect(commitBlock).toContain("patchCachedRoutesForWholeMove(");
    expect(source).toContain("routeStorePatchRoutesById");
    expect(commitBlock).toContain("const movedRouteDirtyResult = dirtyEdgeIdsAfterBulkMove(");
    expect(commitBlock).toContain("const movedRouteDirtyIds = movedRouteDirtyResult.dirtyIds;");
    expect(commitBlock).toContain("legacyRouteDirtyCount: movedRouteDirtyResult.legacyDirtyCount");
    expect(commitBlock).toContain("const storedRouteDirtyIds = storedRouteDirtyIdsForMove(movedRouteDirtyIds, routeCachePatchedEdgeIds);");
    expect(commitBlock).toContain("markStoredRouteEdgesDirty(storedRouteDirtyIds);");
    expect(commitBlock).not.toContain("markStoredRouteEdgesDirty(movedRouteDirtyIds);");
    expect(source).toContain("bulkPlanMs: Number(stats.bulkPlanMs.toFixed(2))");
    expect(source).toContain("canvasBoundsMs: Number(stats.canvasBoundsMs.toFixed(2))");
    expect(source).toContain("edgePatchMs: Number(stats.edgePatchMs.toFixed(2))");
    expect(source).toContain("dirtyMs: Number(stats.dirtyMs.toFixed(2))");
    expect(source).toContain("markDirtyMs: Number(stats.markDirtyMs.toFixed(2))");
    expect(source).toContain("busSyncMs: Number(stats.busSyncMs.toFixed(2))");
    expect(source).toContain("syncRepairMs: Number(stats.syncRepairMs.toFixed(2))");
    expect(commitBlock).toContain("let bulkPlanMs = 0;");
    expect(commitBlock).toContain("let canvasBoundsMs = 0;");
    expect(commitBlock).toContain("let edgePatchMs = 0;");
    expect(commitBlock).toContain("let dirtyMs = 0;");
    expect(commitBlock).toContain("let markDirtyMs = 0;");
    expect(commitBlock).toContain("let busSyncMs = 0;");
    expect(commitBlock).toContain("let syncRepairMs = 0;");
  });

  test("keeps whole-layer multi-node moves on the coordinate-translation fast path", async () => {
    const source = await readAppSource();
    const draggingTypeStart = source.indexOf("type DraggingState =");
    const draggingTypeEnd = source.indexOf("type MultiNodeDragOverlayPreview", draggingTypeStart);
    const draggingTypeBlock = source.slice(draggingTypeStart, draggingTypeEnd);
    const wholeMoveStart = source.indexOf("const isWholeActiveLayerMove =");
    const wholeMoveEnd = source.indexOf("const routableLineRouteCandidateIdsForMovedNodes", wholeMoveStart);
    const wholeMoveBlock = source.slice(wholeMoveStart, wholeMoveEnd);
    const smartSnapStart = source.indexOf("const computeSmartAlignmentSnap =");
    const smartSnapEnd = source.indexOf("const computeNodeDragPreviewDelta", smartSnapStart);
    const smartSnapBlock = source.slice(smartSnapStart, smartSnapEnd);
    const snapStart = source.indexOf("const findMultiNodeDragSnapTargetAtDelta =");
    const snapEnd = source.indexOf("const updateSingleNodeDragImperativePreview", snapStart);
    const snapBlock = source.slice(snapStart, snapEnd);
    const previewStart = source.indexOf("const buildRoutableLineDragPreviewRoutes =");
    const previewEnd = source.indexOf("const shiftedDragPreviewPoint", previewStart);
    const previewBlock = source.slice(previewStart, previewEnd);
    const finishStart = source.indexOf("const finishNodeDrag = () =>");
    const finishEnd = source.indexOf("const finishTransformDrag", finishStart);
    const finishBlock = source.slice(finishStart, finishEnd);
    const moveStart = source.indexOf("const moveSelection =");
    const moveEnd = source.indexOf("const updateSelectedNode", moveStart);
    const moveBlock = source.slice(moveStart, moveEnd);
    const commitStart = source.indexOf("const commitFastMovedGraphPatches");
    const commitEnd = source.indexOf("const clampPointToCanvas", commitStart);
    const commitBlock = source.slice(commitStart, commitEnd);

    expect(draggingTypeBlock).toContain("wholeLayerMove?: boolean;");
    expect(source).toContain("type FastMovedGraphCommitOptions =");
    expect(wholeMoveStart).toBeGreaterThan(-1);
    expect(wholeMoveBlock).toContain("const movedIds = new Set(nodeIds);");
    expect(wholeMoveBlock).toContain("for (const node of activeLayerNodes)");
    expect(wholeMoveBlock).toContain("!isCanvasNodeMovable(node.kind)");
    expect(wholeMoveBlock).toContain("translateWholeMoveCandidateEdges");
    expect(wholeMoveBlock).toContain("wholeMoveRoutableLineNodeUpdates");
    expect(smartSnapBlock).toContain("dragState.wholeLayerMove");
    expect(snapBlock).toContain("if (dragState.wholeLayerMove)");
    expect(previewBlock).toContain("if (dragState.wholeLayerMove)");
    expect(source).toContain("routableLineDeviceCanvasPoints(lineNode).map((point) => translatePointBy(point, delta))");
    expect(finishBlock).toContain("const wholeLayerMove = activeDragging.wholeLayerMove === true;");
    expect(finishBlock).toContain("translateWholeMoveCandidateEdges(synchronousCandidateEdges, dragNodeIds, dragEdgeIds, finalDelta)");
    expect(finishBlock).toContain("shouldFinalizeMovedNodeEdgesSynchronously(activeDragging.nodeIds, terminalFinalizationCandidateEdges)");
    expect(moveBlock).toContain("const wholeLayerMove = isWholeActiveLayerMove(moveNodeIds);");
    expect(moveBlock).toContain("translateWholeMoveCandidateEdges(synchronousCandidateEdges, selected, selectedMoveEdgeIds, boundedDelta)");
    expect(commitBlock).toContain("const wholeLayerMove = options.wholeLayerMove === true;");
    expect(commitBlock).toContain("deferredMoveOptimizationCancelRef.current?.();");
    expect(commitBlock).toContain("wholeMoveRoutableLineNodeUpdates(movedNodeIds, wholeLayerMoveDelta)");
    expect(commitBlock).toContain("const routeRepairSeedEdges = wholeLayerMove");
    expect(commitBlock).toContain("!wholeLayerMove &&\n      shouldRunSynchronousMoveBlockerRepair");
    expect(commitBlock).toContain("patchCachedRoutesForWholeMove(");
    expect(commitBlock).toContain("if (!wholeLayerMove) {\n      scheduleDeferredRoutableLineRouteRepair(");
    expect(commitBlock).toContain("scheduleMovedEdgeOptimization(");
  });

  test("keeps ordinary multi-node internal connections and routable lines on the translation path until release repair", async () => {
    const source = await readAppSource();
    const helperStart = source.indexOf("const internalMoveEdgeIdsForMovedNodes =");
    const helperEnd = source.indexOf("const routableLineRouteCandidateIdsForMovedNodes", helperStart);
    const helperBlock = source.slice(helperStart, helperEnd);
    const previewStart = source.indexOf("const buildRoutableLineDragPreviewRoutes =");
    const previewEnd = source.indexOf("const shiftedDragPreviewPoint", previewStart);
    const previewBlock = source.slice(previewStart, previewEnd);
    const finishStart = source.indexOf("const finishNodeDrag = () =>");
    const finishEnd = source.indexOf("const finishTransformDrag", finishStart);
    const finishBlock = source.slice(finishStart, finishEnd);
    const finishMoveStart = source.indexOf("const finishDraggingMove");
    const finishMoveEnd = source.indexOf("const finishNodeDrag", finishMoveStart);
    const finishMoveBlock = source.slice(finishMoveStart, finishMoveEnd);
    const moveStart = source.indexOf("const moveSelection =");
    const moveEnd = source.indexOf("const updateSelectedNode", moveStart);
    const moveBlock = source.slice(moveStart, moveEnd);
    const commitStart = source.indexOf("const commitFastMovedGraphPatches");
    const commitEnd = source.indexOf("const clampPointToCanvas", commitStart);
    const commitBlock = source.slice(commitStart, commitEnd);

    expect(helperStart).toBeGreaterThan(-1);
    expect(source).toContain("internalMovedEdgeIds?: Iterable<string>;");
    expect(helperBlock).toContain("movedIds.has(edge.sourceId) && movedIds.has(edge.targetId)");
    expect(helperBlock).toContain("const externalMoveCandidateEdges =");
    expect(helperBlock).toContain("const translateInternalMoveCandidateEdges =");
    expect(helperBlock).toContain("translateStoredEdgeGeometryBy(edge, delta)");
    expect(helperBlock).toContain("const internalRoutableLineNodeUpdatesForMove =");
    expect(helperBlock).toContain("translateNodeBy(lineNode, delta)");
    expect(previewBlock).toContain("buildTranslatedInternalRoutableLineDragPreviewRoutes(dragState, delta, movedNodeIds)");
    expect(finishMoveBlock).toContain("const internalMovedEdgeIds = internalMoveEdgeIdsForMovedNodes(activeDragging.affectedEdges, dragNodeIds);");
    expect(finishMoveBlock).toContain("const externalSynchronousCandidateEdges = externalMoveCandidateEdges(synchronousCandidateEdges, internalMovedEdgeIds);");
    expect(finishMoveBlock).toContain("translateInternalMoveCandidateEdges(synchronousCandidateEdges, internalMovedEdgeIds, finalDelta)");
    expect(finishMoveBlock).toContain("(internalMovedEdgeIds.size === 0 || finalizationCandidateEdges.length > 0)");
    expect(finishMoveBlock).toContain("finalizationCandidateEdges");
    expect(finishMoveBlock).toContain("{ wholeLayerMove, moveDelta: finalDelta, internalMovedEdgeIds }");
    expect(finishBlock).toContain("const internalMovedEdgeIds = internalMoveEdgeIdsForMovedNodes(activeDragging.affectedEdges, dragNodeIds);");
    expect(finishBlock).toContain("const externalSynchronousCandidateEdges = externalMoveCandidateEdges(synchronousCandidateEdges, internalMovedEdgeIds);");
    expect(finishBlock).toContain("translateInternalMoveCandidateEdges(synchronousCandidateEdges, internalMovedEdgeIds, finalDelta)");
    expect(finishBlock).toContain("(internalMovedEdgeIds.size === 0 || finalizationCandidateEdges.length > 0)");
    expect(finishBlock).toContain("{ wholeLayerMove, moveDelta: finalDelta, internalMovedEdgeIds }");
    expect(moveBlock).toContain("const internalMovedEdgeIds = internalMoveEdgeIdsForMovedNodes(affectedEdgesForMove, selected);");
    expect(moveBlock).toContain("const externalSynchronousCandidateEdges = externalMoveCandidateEdges(synchronousCandidateEdges, internalMovedEdgeIds);");
    expect(moveBlock).toContain("translateInternalMoveCandidateEdges(synchronousCandidateEdges, internalMovedEdgeIds, boundedDelta)");
    expect(moveBlock).toContain("(internalMovedEdgeIds.size === 0 || finalizationCandidateEdges.length > 0)");
    expect(moveBlock).toContain("{ wholeLayerMove, moveDelta: boundedDelta, internalMovedEdgeIds }");
    expect(commitBlock).toContain("const internalMovedEdgeIds = options.internalMovedEdgeIds ? reuseSetOrCreate(options.internalMovedEdgeIds) : new Set<string>();");
    expect(commitBlock).toContain("internalRoutableLineNodeUpdatesForMove(movedNodeIds, wholeLayerMoveDelta)");
    expect(commitBlock).toContain("externalMoveCandidateEdges(committedCandidateEdges, internalMovedEdgeIds)");
    expect(commitBlock).toContain("const internalMovedCandidateEdges =");
    expect(commitBlock).toContain("const deferredRepairCandidateEdges = mergeUniqueEdgesById(routeRepairCandidateEdges, internalMovedCandidateEdges);");
    expect(commitBlock).toContain("patchCachedRoutesForInternalMove(");
  });

  test("defers routable-line rerouting after node drag release", async () => {
    const source = await readAppSource();
    const scheduleStart = source.indexOf("const scheduleDeferredRoutableLineRouteRepair =");
    const scheduleEnd = source.indexOf("const commitFastMovedGraphPatches", scheduleStart);
    const scheduleBlock = source.slice(scheduleStart, scheduleEnd);
    const commitStart = source.indexOf("const commitFastMovedGraphPatches");
    const commitEnd = source.indexOf("const clampPointToCanvas", commitStart);
    const commitBlock = source.slice(commitStart, commitEnd);

    expect(scheduleStart).toBeGreaterThan(-1);
    expect(source).toContain("const deferredRoutableLineRouteRepairCancelRef");
    expect(scheduleBlock).toContain("scheduleIdleWork");
    expect(scheduleBlock).toContain("routableLineRouteCandidateIdsForMovedNodes(");
    expect(scheduleBlock).toContain("rebuildRoutableLineDeviceRouteUpdates(");
    expect(scheduleBlock).toContain("{ movedNodeIds: movedNodeIdList }");
    expect(scheduleBlock).toContain("graphStorePatchStillCurrent(latestStore, expectedNodeUpdates, [], [])");
    expect(commitBlock).toContain("scheduleDeferredRoutableLineRouteRepair(");
    expect(commitBlock).toContain("const shiftedExpectedNodeUpdates =");
    expect(commitBlock).toContain("shiftedExpectedNodeUpdates,");
    expect(commitBlock).toContain("expectedPatch.nodeUpdates,");
    expect(commitBlock).not.toContain("const routableLineCandidateIds = routableLineRouteCandidateIdsForMovedNodes(");
    expect(commitBlock).not.toContain("rebuildRoutableLineDeviceRouteUpdates(fullNextNodesForRoutableLines");
    expect(commitBlock).not.toContain("{ nodeUpdates: shiftedNextNodes, edgeUpserts: shiftedNextEdges, edgeDeleteIds: [] }");
  });

  test("does not let an older route-cache effect clear freshly marked moved-edge dirtiness", async () => {
    const source = await readAppSource();
    const refStart = source.indexOf("const cachedRoutedEdgesRef");
    const refEnd = source.indexOf("const canvasVisibleViewBoxFrameRef", refStart);
    const refBlock = source.slice(refStart, refEnd);
    const markStart = source.indexOf("const markRouteEdgesDirty");
    const markEnd = source.indexOf("const edgeReferenceDiffIds", markStart);
    const markBlock = source.slice(markStart, markEnd);
    const cacheEffectStart = source.indexOf("const committedRouteDirtyGeneration = routeDirtyGenerationRef.current;");
    const cacheEffectEnd = source.indexOf("const renderViewportBounds", cacheEffectStart);
    const cacheEffectBlock = source.slice(cacheEffectStart, cacheEffectEnd);

    expect(refBlock).toContain("const routeDirtyGenerationRef = useRef(0);");
    expect(markBlock).toContain("let changed = false;");
    expect(markBlock).toContain("routeDirtyGenerationRef.current += 1;");
    expect(cacheEffectBlock).toContain("const committedRouteDirtyGeneration = routeDirtyGenerationRef.current;");
    expect(cacheEffectBlock).toContain("if (routeDirtyGenerationRef.current !== committedRouteDirtyGeneration)");
    expect(cacheEffectBlock).toContain("return;");
    expect(cacheEffectBlock.indexOf("routeDirtyGenerationRef.current !== committedRouteDirtyGeneration")).toBeLessThan(
      cacheEffectBlock.indexOf("cachedRoutedEdgesRef.current = routedEdges;")
    );
    expect(cacheEffectBlock).toContain("pendingRouteEdgeIdsRef.current = new Set();");
    expect(cacheEffectBlock).toContain("pendingStoredRouteEdgeIdsRef.current = new Set();");
  });

  test("keeps single-node geometry and label footprint commits scoped to changed content", async () => {
    const source = await readAppSource();
    const helperStart = source.indexOf("const rebuildEdgeUpdatesAfterNodeGeometryChange");
    const helperEnd = source.indexOf("const rebuildEdgesAfterNodeGeometryChange", helperStart);
    const helperBlock = source.slice(helperStart, helperEnd);
    const updateStart = source.indexOf("const updateSelectedNode");
    const updateEnd = source.indexOf("const assignSelectedNodesToModelLayer", updateStart);
    const updateBlock = source.slice(updateStart, updateEnd);
    const footprintStart = source.indexOf("const commitNodeFootprintUpdates");
    const footprintEnd = source.indexOf("const assignSelectedNodesToModelLayer", footprintStart);
    const footprintBlock = source.slice(footprintStart, footprintEnd);

    expect(helperStart).toBeGreaterThan(-1);
    expect(helperBlock).toContain("return nextLocalEdges.filter");
    expect(helperBlock).not.toContain("currentEdges.map((edge)");
    expect(updateBlock).not.toContain("const previewNodes = nodes.map");
    expect(updateBlock).not.toContain("canvasBoundsForGraphContent(\n          canvasBounds,\n          previewNodes,\n          edges");
    expect(updateBlock).toContain("canvasBoundsForAutoExpandedGraphContent(canvasBounds, [candidateNode], [], [], CANVAS_AUTO_EXPAND_PADDING)");
    expect(updateBlock).toContain("const edgeUpdates = rebuildEdgeUpdatesAfterNodeGeometryChange(finalNextNodes, [selectedNodeId]);");
    expect(updateBlock).toContain("expandCanvasToFitGraph(nodeUpdates, edgeUpdates, [], CANVAS_AUTO_EXPAND_PADDING, selectedNodeCanvasBounds);");
    expect(updateBlock).toContain("graphStoreApplyPatch(current, {");
    expect(footprintBlock).toContain("const directCandidateEdges = edgeListForNodeIds(changedNodeIds);");
    expect(footprintBlock).toContain("leftTopCanvasOriginShiftForContent(existingUpdates, directCandidateEdges)");
    expect(footprintBlock).toContain("canvasBoundsForAutoExpandedGraphContent(\n      canvasBounds,\n      existingUpdates,\n      directCandidateEdges");
    expect(footprintBlock).toContain("optimizeMovedNodeEdgeRoutes(\n          nextNodes,\n          optimizationEdges");
    expect(footprintBlock).toContain("expandCanvasToFitGraph(existingUpdates, edgeUpdates, [], CANVAS_AUTO_EXPAND_PADDING, footprintCanvasBounds);");
    expect(footprintBlock).not.toContain("const nextEdges = blockedEdgeIds.size > 0");
    expect(footprintBlock).not.toContain("expandCanvasToFitGraph(nextNodes, nextEdges");
    expect(footprintBlock).not.toContain("leftTopCanvasOriginShiftForContent(nextNodes)");
    expect(footprintBlock).not.toContain("canvasBoundsForGraphContent(\n      canvasBounds,\n      nextNodes,\n      edges");
  });

  test("scopes delayed bus terminal synchronization after graph moves to pending affected nodes", async () => {
    const source = await readAppSource();
    const refStart = source.indexOf("const pendingBusTerminalSyncNodeIdsRef");
    const busSyncEffectStart = source.indexOf("const pendingBusSyncNodeIds = pendingBusTerminalSyncNodeIdsRef.current;");
    const busSyncEffectEnd = source.indexOf("const canvasBounds", busSyncEffectStart);
    const busSyncEffectBlock = source.slice(busSyncEffectStart, busSyncEffectEnd);
    const patchHelperStart = source.indexOf("const busTerminalSyncNodeIdsForGraphPatch =");
    const patchHelperEnd = source.indexOf("const synchronizePendingBusTerminalsWithGraphStore", patchHelperStart);
    const patchHelperBlock = source.slice(patchHelperStart, patchHelperEnd);
    const scopedSyncStart = source.indexOf("const synchronizePendingBusTerminalsWithGraphStore");
    const scopedSyncEnd = source.indexOf("useEffect(() => {\n    const pendingBusSyncNodeIds", scopedSyncStart);
    const scopedSyncBlock = source.slice(scopedSyncStart, scopedSyncEnd);
    const commitStart = source.indexOf("const commitFastMovedGraph");
    const commitEnd = source.indexOf("const clampPointToCanvas", commitStart);
    const commitBlock = source.slice(commitStart, commitEnd);

    expect(refStart).toBeGreaterThan(-1);
    expect(scopedSyncStart).toBeGreaterThan(-1);
    expect(scopedSyncBlock).toContain("queryGraphStoreNodeSpatialIndex(store");
    expect(scopedSyncBlock).toContain("store.edgesByNodeId.get(busId)");
    expect(scopedSyncBlock).toContain("synchronizeBusTerminalsWithEdges(scopedNodes, scopedEdges, affectedBusIds)");
    expect(busSyncEffectBlock).toContain("scheduledBusSyncNodeIds.size > 0");
    expect(busSyncEffectBlock).toContain("synchronizePendingBusTerminalsWithGraphStore(latestStore, scheduledBusSyncNodeIds)");
    expect(busSyncEffectBlock).toContain("graphStoreApplyPatch(current, {");
    expect(busSyncEffectBlock).not.toContain("synchronizeBusTerminalsWithEdges(syncNodes, syncEdges, scheduledBusSyncNodeIds)");
    expect(busSyncEffectBlock).not.toContain("synchronizeBusTerminalsWithEdges(syncNodes, syncEdges);");
    expect(busSyncEffectBlock).not.toContain("synchronizeBusTerminalsWithEdges(syncNodes, syncEdges, undefined)");
    expect(busSyncEffectBlock).not.toContain("setGraphArrays(synchronized.nodes, synchronized.edges)");
    expect(source).toContain("const busTerminalSyncNodeIdsForGraphPatch =");
    expect(patchHelperBlock).toContain("void movedNodeIds;");
    expect(patchHelperBlock).toContain("const previousEdgeById = new Map(previousCandidateEdges.map");
    expect(patchHelperBlock).toContain("const edgeAttachmentChanged");
    expect(patchHelperBlock).toContain("if (!edgeAttachmentChanged(previousEdge, nextEdge))");
    expect(patchHelperBlock).not.toContain("if (busNodeIdSet.has(nodeId))");
    expect(source).toContain("const busNodeIdSet = graphStore.busNodeIdSet");
    expect(busSyncEffectBlock).toContain("busNodeIdSet.size === 0");
    expect(commitBlock).toContain("busTerminalSyncNodeIdsForGraphPatch(");
    expect(commitBlock).not.toContain("markBusTerminalSyncDirty(movedNodeIds)");
  });

  test("does not resync every bus terminal for drag route-only edge updates", async () => {
    const source = await readAppSource();
    const scheduleStart = source.indexOf("const scheduleMovedEdgeOptimization");
    const scheduleEnd = source.indexOf("const commitFastMovedGraph", scheduleStart);
    const scheduleBlock = source.slice(scheduleStart, scheduleEnd);
    const repairStart = source.indexOf("const scheduleDeferredMovedConnectionRepair");
    const repairEnd = source.indexOf("const commitFastMovedGraph", repairStart);
    const repairBlock = source.slice(repairStart, repairEnd);
    const commitStart = source.indexOf("const commitFastMovedGraph");
    const commitEnd = source.indexOf("const clampPointToCanvas", commitStart);
    const commitBlock = source.slice(commitStart, commitEnd);

    expect(scheduleBlock).toContain("setGraphStore((current) => graphStorePatchEdges(current, optimizedEdgeUpdates))");
    expect(scheduleBlock).not.toContain("markBusTerminalSyncDirtyForEdges(optimizedEdgeUpdates)");
    expect(repairBlock).toContain("setGraphStore((current) =>");
    expect(repairBlock).toContain("graphStoreApplyPatch(current, {");
    expect(repairBlock).toContain("edgeUpserts: deferredEdgePatch.edgeUpserts");
    expect(repairBlock).toContain("edgeDeleteIds: deferredEdgePatch.edgeDeleteIds");
    expect(repairBlock).toContain("busTerminalSyncNodeIdsForGraphPatch(");
    expect(repairBlock).not.toContain("markBusTerminalSyncDirtyForEdges(");
    expect(commitBlock).not.toContain("markBusTerminalSyncDirtyForEdges(shiftedNextEdges)");
  });

  test("keeps graph operation end derivations from scanning full node and edge lists unnecessarily", async () => {
    const source = await readAppSource();
    const activeGroupsStart = source.indexOf("const activeLayerGroups = useMemo");
    const activeGroupsEnd = source.indexOf("const rawActiveSelectedEdgeIds", activeGroupsStart);
    const activeGroupsBlock = source.slice(activeGroupsStart, activeGroupsEnd);
    const selectedLayoutStart = source.indexOf("const selectedLayoutUnits = useMemo");
    const selectedLayoutEnd = source.indexOf("const selectedGroupLayoutUnits", selectedLayoutStart);
    const selectedLayoutBlock = source.slice(selectedLayoutStart, selectedLayoutEnd);

    expect(activeGroupsStart).toBeGreaterThan(-1);
    expect(activeGroupsBlock).toContain("graphStore.elementTreeRevision");
    expect(activeGroupsBlock).toContain("isEditMode ? normalizeModelGroups(groups, activeLayerNodes, activeLayerEdges) : EMPTY_MODEL_GROUPS");
    expect(activeGroupsBlock).not.toContain("[activeLayerEdges, activeLayerNodes, groups]");
    expect(selectedLayoutBlock).toContain("if (!isEditMode)");
    expect(selectedLayoutBlock).toContain("activeSelectedNodeIds.length === 0 && activeSelectedEdgeIds.length === 0");
    expect(selectedLayoutBlock).toContain("return EMPTY_CANVAS_LAYOUT_UNITS;");
  });

  test("keeps pure browse mode off edit-only selection and layout derivations", async () => {
    const source = await readAppSource();
    const selectionStart = source.indexOf("const activeCanvasSelection = useMemo");
    const selectionEnd = source.indexOf("const activeSelectedNodeIds = activeCanvasSelection.nodeIds", selectionStart);
    const selectionBlock = source.slice(selectionStart, selectionEnd);
    const groupActionsStart = source.indexOf("const activeSelectedGroupIds = useMemo");
    const groupActionsEnd = source.indexOf("const topologyWarningPageCount", groupActionsStart);
    const groupActionsBlock = source.slice(groupActionsStart, groupActionsEnd);
    const boundsStart = source.indexOf("const browseSelectedCanvasBounds = useMemo");
    const boundsEnd = source.indexOf("const selectedFloatingToolbarBounds", boundsStart);
    const boundsBlock = source.slice(boundsStart, boundsEnd);

    expect(source).toContain("const EMPTY_MODEL_GROUPS: ModelGroup[] = [];");
    expect(source).toContain("const EMPTY_CANVAS_LAYOUT_UNITS: CanvasLayoutUnit[] = [];");
    expect(source).toContain("const EMPTY_CANVAS_SELECTION: ReturnType<typeof resolveCanvasSelection>");
    expect(selectionBlock).toContain("return EMPTY_CANVAS_SELECTION;");
    expect(selectionBlock).toContain("if (!isEditMode)");
    expect(selectionBlock).toContain("return resolveCanvasSelection([], rawActiveSelectedNodeIds, rawActiveSelectedEdgeIds, \"direct\");");
    expect(selectionBlock).toContain("return resolveCanvasSelection(activeLayerGroups, rawActiveSelectedNodeIds, rawActiveSelectedEdgeIds, canvasSelectionScope);");
    expect(groupActionsBlock).toContain("isEditMode");
    expect(groupActionsBlock).toContain("selectedCanvasGroupIds(activeLayerGroups");
    expect(groupActionsBlock).toContain("canvasGroupMemberNodeIds(activeLayerGroups");
    expect(groupActionsBlock).toContain("isEditMode && canDissolveSingleCanvasGroupSelection");
    expect(groupActionsBlock).toContain("isEditMode && canGroupCanvasSelection");
    expect(boundsBlock).toContain("const browseSelectedCanvasBounds = useMemo");
    expect(boundsBlock).toContain("if (isEditMode || (activeSelectedNodeIds.length === 0 && activeSelectedEdgeIds.length === 0))");
    expect(boundsBlock).toContain("calculateNodeVisualBounds(node)");
    expect(boundsBlock).toContain("calculateModelGeometryBounds([], [{ points: route.points }], 24)");
    expect(boundsBlock).toContain("const selectedCanvasBounds = isEditMode");
    expect(boundsBlock).toContain(": browseSelectedCanvasBounds");
  });

  test("reuses the element tree while drag-only geometry changes do not alter tree content", async () => {
    const source = await readAppSource();
    const elementTreeStart = source.indexOf("const elementTreeSignature = useMemo");
    const elementTreeEnd = source.indexOf("useEffect(() => {\n    setSelectedEdgeIds", elementTreeStart);
    const elementTreeBlock = source.slice(elementTreeStart, elementTreeEnd);

    expect(source).toContain("elementTreeCacheSignature");
    expect(source).toContain("elementTreeCacheRef");
    expect(source).toContain("elementTreeRevision");
    expect(source).toContain("elementTreeLayerSignature");
    expect(source).toContain("const elementTreeSource = useMemo");
    expect(source).toContain("current.revision !== graphStore.elementTreeRevision");
    expect(source).toContain("const deferredElementTreeSource = useDeferredValue(elementTreeSource)");
    expect(elementTreeBlock).toContain("elementTreeCacheSignature(deferredElementTreeSource.revision, deferredElementTreeSource.layerSignature, libraryTemplates)");
    expect(elementTreeBlock).not.toContain("elementTreeCacheSignature(deferredElementTreeNodes");
    expect(elementTreeBlock).toContain("elementTreeCacheRef.current.signature === elementTreeSignature");
    expect(elementTreeBlock).toContain("return elementTreeCacheRef.current.tree");
    expect(elementTreeBlock).toContain("buildElementTree(deferredElementTreeSource.nodes, deferredElementTreeSource.edges, libraryTemplates, { includeContainerChildren: false })");
  });

  test("freezes nonessential edit-mode derivations during hot canvas interactions", async () => {
    const source = await readAppSource();
    const elementTreeSourceStart = source.indexOf("const elementTreeSource = useMemo");
    const elementTreeSourceEnd = source.indexOf("const deferredElementTreeSource", elementTreeSourceStart);
    const elementTreeSourceBlock = source.slice(elementTreeSourceStart, elementTreeSourceEnd);
    const selectedLayoutStart = source.indexOf("const selectedLayoutUnits = useMemo");
    const selectedLayoutEnd = source.indexOf("const selectedGroupLayoutUnits", selectedLayoutStart);
    const selectedLayoutBlock = source.slice(selectedLayoutStart, selectedLayoutEnd);
    const minimapEffectStart = source.indexOf("useEffect(() => {\n    if (editHotInteractionActive) {");
    const minimapEffectEnd = source.indexOf("const minimapScale = Math.min", minimapEffectStart);
    const minimapEffectBlock = source.slice(minimapEffectStart, minimapEffectEnd);
    const minimapNodesStart = source.indexOf("const minimapNodes = useMemo");
    const minimapRoutesEnd = source.indexOf("const mapPointToMinimap", minimapNodesStart);
    const minimapBlock = source.slice(minimapNodesStart, minimapRoutesEnd);
    const rotateAvoidStart = source.indexOf("const selectedRotateControlAvoidRects");
    const rotateAvoidEnd = source.indexOf("const selectedFloatingToolbarAvoidRect", rotateAvoidStart);
    const rotateAvoidBlock = source.slice(rotateAvoidStart, rotateAvoidEnd);

    expect(source).toContain("const editHotInteractionActive = isEditMode && Boolean(");
    expect(source).toContain("const selectedLayoutUnitsCacheRef = useRef<CanvasLayoutUnit[]>([]);");
    expect(elementTreeSourceBlock).toContain("!editHotInteractionActive");
    expect(elementTreeSourceBlock).toContain("editHotInteractionActive");
    expect(selectedLayoutBlock).toContain("if (editHotInteractionActive && selectedLayoutUnitsCacheRef.current.length > 0)");
    expect(selectedLayoutBlock).toContain("selectedLayoutUnitsCacheRef.current = units;");
    expect(minimapEffectBlock).toContain("if (editHotInteractionActive) {");
    expect(minimapBlock).toContain("if (editHotInteractionActive) {");
    expect(minimapBlock).toContain("return cache.nodes;");
    expect(minimapBlock).toContain("return cache.routes;");
    expect(rotateAvoidBlock).toContain("!editHotInteractionActive");
  });

  test("bounds graph tree and floating topology warning rendering for large models", async () => {
    const source = await readAppSource();
    const styles = await readStyles();
    const topbarStart = source.indexOf("<header className=\"topbar\">");
    const topbarEnd = source.indexOf("</header>", topbarStart);
    const topbarBlock = source.slice(topbarStart, topbarEnd);
    const treeStart = source.indexOf("const renderElementTreePanel = () =>");
    const treeEnd = source.indexOf("const topologyWarningDisplayMessage", treeStart);
    const treeBlock = source.slice(treeStart, treeEnd);
    const validationStart = source.indexOf("{topologyWarningPanelVisible && (");
    const validationEnd = source.indexOf("</section>", validationStart);
    const validationBlock = source.slice(validationStart, validationEnd);
    const warningBodyStart = styles.indexOf(".topology-warning-floating-body {");
    const warningBodyEnd = styles.indexOf(".topology-warning-table", warningBodyStart);
    const warningBodyBlock = styles.slice(warningBodyStart, warningBodyEnd);
    const warningTableStart = styles.indexOf(".topology-warning-table {");
    const warningTableEnd = styles.indexOf(".topology-warning-table th,", warningTableStart);
    const warningTableBlock = styles.slice(warningTableStart, warningTableEnd);
    const warningTitleStart = styles.indexOf(".topology-warning-floating-title div {");
    const warningTitleEnd = styles.indexOf(".topology-warning-floating-title h2", warningTitleStart);
    const warningTitleBlock = styles.slice(warningTitleStart, warningTitleEnd);

    expect(source).toContain("ELEMENT_TREE_INITIAL_ITEM_LIMIT");
    expect(source).toContain("ELEMENT_TREE_ITEM_LIMIT_STEP");
    expect(treeBlock).toContain("const visibleItems = group.items.slice(0, visibleLimit)");
    expect(source).toContain("includeContainerChildren: false");
    expect(treeBlock).toContain("const itemChildren = elementTreeItemChildren(item)");
    expect(treeBlock).toContain("itemChildren.length");
    expect(treeBlock).toContain("itemChildren.map((child)");
    expect(treeBlock).toContain("className=\"element-tree-more\"");
    expect(source).toContain("TOPOLOGY_WARNING_PAGE_SIZE");
    expect(source).toContain("topologyWarningPageCount");
    expect(source).toContain("normalizedTopologyWarningPage * TOPOLOGY_WARNING_PAGE_SIZE");
    expect(source).toContain("const [topologyWarningPanelClosed, setTopologyWarningPanelClosed] = useState(false);");
    expect(source).toContain("const openTopologyWarningPanel = () =>");
    expect(topbarBlock).toContain("aria-label=\"告警窗口\"");
    expect(topbarBlock).toContain("title={topologyErrors.length > 0 ? \"显示告警窗口\" : \"当前没有拓扑告警\"}");
    expect(topbarBlock).toContain("disabled={topologyErrors.length === 0}");
    expect(topbarBlock).toContain("onClick={openTopologyWarningPanel}");
    expect(topbarBlock).toContain("<Bell size={16} />");
    expect(source).toContain("const startTopologyWarningPanelDrag = (event: PointerEvent<HTMLElement>) =>");
    expect(source).toContain("const startTopologyWarningPanelResize = (event: PointerEvent<HTMLDivElement>) =>");
    expect(validationBlock).toContain("className=\"topology-warning-floating-panel\"");
    expect(validationBlock).toContain("aria-label=\"拓扑警告信息\"");
    expect(validationBlock).toContain("<h2>拓扑警告信息</h2>");
    expect(validationBlock).toContain("<span>{inspectorTopologyErrors.length}条</span>");
    expect(validationBlock).toContain("onClick={() => setTopologyWarningPanelClosed(true)}");
    expect(validationBlock).toContain("<table className=\"topology-warning-table\">");
    expect(validationBlock).toContain("<th>状态</th>");
    expect(validationBlock).toContain("<th>信息</th>");
    expect(validationBlock).toContain("isBlockingTopologyValidationError(error)");
    expect(validationBlock).toContain("validation-pagination");
    expect(styles).toContain("content-visibility: auto");
    expect(styles).toContain(".validation-pagination");
    expect(styles).toContain(".topology-warning-floating-resize");
    expect(warningTitleBlock).toContain("display: flex");
    expect(warningTitleBlock).toContain("align-items: baseline");
    expect(warningBodyBlock).toContain("overflow-y: auto");
    expect(warningBodyBlock).toContain("overflow-x: hidden");
    expect(warningTableBlock).toContain("border-collapse: collapse");
    expect(warningTableBlock).toContain("table-layout: fixed");
    expect(styles).toContain(".topology-warning-table td:nth-child(2)");
    expect(styles).toContain("overflow-wrap: anywhere");
  });

  test("keeps minimap rendering sampled for large models", async () => {
    const source = await readAppSource();
    const minimapStart = source.indexOf("const CANVAS_MINIMAP_MAX_NODE_MARKS");
    const minimapEnd = source.indexOf("const CANVAS_SCROLLBAR_THICKNESS", minimapStart);
    const minimapConstantsBlock = source.slice(minimapStart, minimapEnd);
    const refsStart = source.indexOf("const minimapSampleCacheRef");
    const refsEnd = source.indexOf("const elementTreeCacheRef", refsStart);
    const refsBlock = source.slice(refsStart, refsEnd);
    const deferredStart = source.indexOf("useEffect(() => {\n    if (editHotInteractionActive) {");
    const deferredEnd = source.indexOf("const minimapScale = Math.min", deferredStart);
    const deferredBlock = source.slice(deferredStart, deferredEnd);
    const renderStart = source.indexOf("const minimapNodeStep =");
    const renderEnd = source.indexOf("const handleMinimapPointerDown", renderStart);
    const renderBlock = source.slice(renderStart, renderEnd);

    expect(minimapConstantsBlock).toContain("const CANVAS_MINIMAP_MAX_NODE_MARKS = 360;");
    expect(minimapConstantsBlock).toContain("const CANVAS_MINIMAP_MAX_ROUTE_MARKS = 160;");
    expect(minimapConstantsBlock).toContain("const CANVAS_MINIMAP_DEFER_SAMPLE_THRESHOLD = 1200;");
    expect(source).toContain("const [minimapSamplingReady, setMinimapSamplingReady] = useState(false);");
    expect(refsBlock).toContain("const minimapSampleCacheRef = useRef<");
    expect(deferredBlock).toContain("minimapSampleSize <= CANVAS_MINIMAP_DEFER_SAMPLE_THRESHOLD");
    expect(deferredBlock).toContain("return scheduleIdleWork(() => setMinimapSamplingReady(true)");
    expect(renderBlock).toContain("Math.ceil(visibleNodes.length / CANVAS_MINIMAP_MAX_NODE_MARKS)");
    expect(renderBlock).toContain("Math.ceil(routedEdges.length / CANVAS_MINIMAP_MAX_ROUTE_MARKS)");
    expect(renderBlock).toContain("if (!minimapSamplingReady)");
    expect(renderBlock).toContain("minimapSampleCacheRef.current");
    expect(renderBlock).toContain("visibleNodes.filter((_, index) => index % minimapNodeStep === 0)");
    expect(renderBlock).toContain("routedEdges.filter((_, index) => index % minimapRouteStep === 0)");
  });

  test("memoizes device glyph rendering during drag-end canvas updates", async () => {
    const source = await readAppSource();
    const importLine = source.slice(0, source.indexOf("} from \"react\";") + 15);
    const memoStart = source.indexOf("const MemoDeviceGlyph = memo(");
    const memoEnd = source.indexOf("function buildSvgNodeLabelTextMarkup", memoStart);
    const memoBlock = source.slice(memoStart, memoEnd);
    const renderStart = source.indexOf("{detailedViewportNodes.map((node) => {");
    const renderEnd = source.indexOf("{renderGroupTransformPhotoPreview()", renderStart);
    const renderBlock = source.slice(renderStart, renderEnd);

    expect(importLine).toContain("memo");
    expect(memoBlock).toContain("previous.node === next.node");
    expect(memoBlock).toContain("previous.colorPalette === next.colorPalette");
    expect(renderBlock).toContain("<MemoDeviceGlyph node={node} mode=\"geometry\"");
    expect(renderBlock).toContain("<MemoDeviceGlyph node={node} mode=\"text\"");
    expect(renderBlock).not.toContain("<DeviceGlyph node={node} mode=\"geometry\"");
  });

  test("uses level-of-detail node rendering for large zoomed-out canvases", async () => {
    const source = await readAppSource();
    const styles = await readStyles();
    const constantsStart = source.indexOf("const CANVAS_LOD_NODE_DETAIL_LIMIT");
    const constantsEnd = source.indexOf("const CANVAS_FLOATING_TOOLBAR_GAP", constantsStart);
    const constantsBlock = source.slice(constantsStart, constantsEnd);
    const lodStart = source.indexOf("const viewportNodeLodScreenSize = useMemo(");
    const lodEnd = source.indexOf("const connectPreviewDom", lodStart);
    const lodBlock = source.slice(lodStart, lodEnd);
    const routeStart = source.indexOf("const selected = activeSelectedEdgeSet.has(edge.id);");
    const routeEnd = source.indexOf("const sourcePoint = getEdgeEndpointPoint(edge, \"source\");", routeStart);
    const routeBlock = source.slice(routeStart, routeEnd);
    const routeMarkupStart = source.indexOf("const lodCanvasRouteChunks = useMemo");
    const routeMarkupEnd = source.indexOf("const lodCanvasNodeChunks = useMemo", routeMarkupStart);
    const routeMarkupBlock = source.slice(routeMarkupStart, routeMarkupEnd);
    const nodeMarkupStart = source.indexOf("const lodCanvasNodeChunks = useMemo");
    const selectedMarkupStart = source.indexOf("const lodSelectedNodeMarkup = useMemo");
    const nodeMarkupEnd = selectedMarkupStart;
    const nodeMarkupBlock = source.slice(nodeMarkupStart, nodeMarkupEnd);
    const selectedMarkupEnd = source.indexOf("const connectPreviewDom", selectedMarkupStart);
    const selectedMarkupBlock = source.slice(selectedMarkupStart, selectedMarkupEnd);
    const renderStart = source.indexOf("const renderSimplifiedNode =");
    const renderEnd = source.indexOf("const imageHref = nodeImage(node);", renderStart);
    const renderBlock = source.slice(renderStart, renderEnd);

    expect(constantsBlock).toContain("const CANVAS_LOD_NODE_DETAIL_LIMIT = 650;");
    expect(constantsBlock).toContain("const CANVAS_LOD_MAX_ZOOM_PERCENT = 120;");
    expect(constantsBlock).toContain("const CANVAS_LOD_MAX_NODE_SCREEN_SIZE = 18;");
    expect(constantsBlock).toContain("const CANVAS_LOD_NODE_SCREEN_SAMPLE_LIMIT = 96;");
    expect(constantsBlock).toContain("const CANVAS_LOD_SELECTED_DETAIL_LIMIT = 12;");
    expect(source).toContain("function estimatedViewportNodeScreenSize(");
    expect(lodBlock).toContain("const viewportNodeLodScreenSize = useMemo(");
    expect(lodBlock).toContain("viewportNodes.length > CANVAS_LOD_NODE_DETAIL_LIMIT");
    expect(lodBlock).toContain("currentZoomPercent <= CANVAS_LOD_MAX_ZOOM_PERCENT");
    expect(lodBlock).toContain("viewportNodeLodScreenSize <= CANVAS_LOD_MAX_NODE_SCREEN_SIZE");
    expect(lodBlock).toContain("const useSimplifiedSelectedCanvasNodes =");
    expect(lodBlock).toContain("selectedNodeIdSet.size > CANVAS_LOD_SELECTED_DETAIL_LIMIT");
    expect(lodBlock).toContain("const detailedViewportNodes = useMemo");
    expect(lodBlock).toContain("return viewportNodes.filter((node) => {");
    expect(lodBlock).toContain("return !useSimplifiedSelectedCanvasNodes || node.id === selectedNodeId;");
    expect(lodBlock).toContain("const useSimplifiedCanvasRoutes =");
    expect(lodBlock).toContain("const useSimplifiedSelectedCanvasEdges =");
    expect(lodBlock).toContain("activeSelectedEdgeSet.size > CANVAS_LOD_SELECTED_DETAIL_LIMIT");
    expect(lodBlock).toContain("const detailedSelectedEdgeIdSet = useMemo");
    expect(lodBlock).not.toContain("activeSelectedEdgeSet.size === 0");
    expect(routeBlock).toContain("useSimplifiedCanvasRoutes && !selected");
    expect(routeBlock).toContain("useSimplifiedCanvasRoutes && selected && !detailedSelectedEdgeIdSet.has(edge.id)");
    expect(routeBlock).toContain("return null");
    expect(routeMarkupBlock).toContain("connection-line lod-edge");
    expect(routeMarkupBlock).toContain("lod-selected-edge");
    expect(source).toContain("lodCanvasRouteChunks.map((chunk)");
    expect(source).toContain("className=\"lod-route-layer\"");
    expect(source).toContain("className=\"lod-route-layer-chunk\"");
    expect(nodeMarkupBlock).toContain("const lodCanvasNodeChunks = useMemo");
    expect(nodeMarkupBlock).toContain("diagram-node lod-node");
    expect(nodeMarkupBlock).toContain("customSingleTerminalAnchorToken(node, libraryTemplateByKind.get(node.kind))");
    expect(nodeMarkupBlock).toContain("custom-terminal-lod-node");
    expect(nodeMarkupBlock).toContain("lod-terminal-layer");
    expect(nodeMarkupBlock).toContain("buildSvgTerminalMarkup(node, colorDisplayMode, colorPalette)");
    expect(nodeMarkupBlock).toContain("if (customTerminalAnchorToken) {");
    expect(nodeMarkupBlock).not.toContain("selectedNodeIdSet.has(node.id)");
    expect(nodeMarkupBlock).toContain("data-node-id");
    expect(source).toContain("handleLodNodePointerDown");
    expect(selectedMarkupBlock).toContain("const lodSelectedNodeMarkup = useMemo");
    expect(selectedMarkupBlock).toContain("displaySelectedNodeIds.flatMap");
    expect(selectedMarkupBlock).toContain("lod-node-selection");
    expect(source).toContain("className=\"lod-node-layer\"");
    expect(source).toContain("lodCanvasNodeChunks.map((chunk)");
    expect(source).toContain("className=\"lod-node-layer-chunk\"");
    expect(source).toContain("className=\"lod-node-selection-layer\" dangerouslySetInnerHTML={{ __html: lodSelectedNodeMarkup }}");
    expect(source).toContain("{detailedViewportNodes.map((node) => {");
    expect(renderBlock).toContain("(!selected || (useSimplifiedSelectedCanvasNodes && !focused))");
    expect(renderBlock).toContain("return null");
    expect(renderBlock).not.toContain("<rect");
    expect(renderBlock).not.toContain("<MemoDeviceGlyph");
    expect(renderBlock).not.toContain("node.terminals.map");
    expect(renderBlock).not.toContain("nodeLabelShouldRender");
    expect(styles).toContain(".lod-node-selection");
    expect(styles).toContain(".lod-node-selection-layer");
    expect(styles).toContain("vector-effect: non-scaling-stroke");
    const lodSelectionLayerStart = styles.indexOf(".lod-node-selection-layer");
    const lodSelectionLayerEnd = styles.indexOf("}", lodSelectionLayerStart);
    const lodSelectionLayerBlock = styles.slice(lodSelectionLayerStart, lodSelectionLayerEnd);
    expect(lodSelectionLayerBlock).toContain("pointer-events: none");
  });

  test("keeps left library panels memoized across graph-only drag commits", async () => {
    const source = await readAppSource();
    const memoStart = source.indexOf("const libraryPanelContent = useMemo");
    const memoEnd = source.indexOf("return (\n    <div", memoStart);
    const memoBlock = source.slice(memoStart, memoEnd);
    const leftContentStart = source.indexOf("<div className=\"left-panel-content\">");
    const leftContentEnd = source.indexOf("</div>\n      </aside>", leftContentStart);
    const leftContentBlock = source.slice(leftContentStart, leftContentEnd);

    expect(memoStart).toBeGreaterThan(-1);
    expect(memoBlock).toContain("() => renderLibraryPanel()");
    expect(memoBlock).toContain("const templateLibraryPanelContent = useMemo");
    expect(memoBlock).toContain("() => renderTemplateLibraryPanel()");
    expect(memoBlock).toContain("const effectiveLeftPanelTab = isBrowseMode ? \"projects\" : leftPanelTab;");
    expect(memoBlock).toContain("const leftPanelContent = effectiveLeftPanelTab === \"projects\"");
    expect(memoBlock).toContain("librarySearchQuery");
    expect(memoBlock).toContain("expandedAttributeLibraryComponentTypes");
    expect(memoBlock).toContain("hoveredAttributeLibrary");
    expect(memoBlock).toContain("hoveredAttributeLibraryComponentType");
    expect(memoBlock).toContain("expandedGraphTemplateTypes");
    expect(memoBlock).toContain("hoveredGraphTemplateType");
    expect(memoBlock).not.toContain("nodes,");
    expect(memoBlock).not.toContain("edges,");
    expect(leftContentBlock).toContain("{leftPanelContent}");
    expect(leftContentBlock).not.toContain("renderLibraryPanel()");
    expect(leftContentBlock).not.toContain("renderTemplateLibraryPanel()");
  });

  test("does not preselect a large group when opening a model", async () => {
    const source = await readAppSource();
    const selectionStateStart = source.indexOf("const [selectedNodeIds, setSelectedNodeIds]");
    const selectionStateEnd = source.indexOf("const [selectedEdgeId", selectionStateStart);
    const selectionStateBlock = source.slice(selectionStateStart, selectionStateEnd);
    const openProjectStart = source.indexOf("setRouteRenderingReady(false);");
    const openProjectEnd = source.indexOf("setConnectSource(null);", openProjectStart);
    const openProjectBlock = source.slice(openProjectStart, openProjectEnd);

    expect(selectionStateBlock).toContain("useState<string[]>([])");
    expect(selectionStateBlock).not.toContain("nodes[0]");
    expect(openProjectBlock).toContain("setCanvasSelectionScope(\"direct\")");
    expect(openProjectBlock).toContain("setSelectedNodeIds([])");
    expect(openProjectBlock).not.toContain("firstVisibleNode");
    expect(openProjectBlock).not.toContain("setCanvasSelectionScope(\"group\")");
  });

  test("indexes terminal-bus contact detection instead of scanning every same-type bus", async () => {
    const source = await readModelSource();
    const contactStart = source.indexOf("export function getTerminalBusContactGroups");
    const contactEnd = source.indexOf("function collectOverlappingTerminalPairs", contactStart);
    const contactBlock = source.slice(contactStart, contactEnd);

    expect(source).toContain("const TERMINAL_BUS_CONTACT_BUCKET_SIZE = 256;");
    expect(contactBlock).toContain("const busEntryBucketsByType = new Map");
    expect(contactBlock).toContain("const affectedBusEntryBucketsByType = new Map");
    expect(contactBlock).toContain("const queryBusEntries =");
    expect(contactBlock).toContain("queryBusEntries(busEntryBucketsByType, terminal.type, point)");
    expect(contactBlock).not.toContain("busEntriesByType.get(terminal.type) ?? []");
  });

  test("caches route blocker boxes during drag-end route checks", async () => {
    const source = await readModelSource();
    const blockerStart = source.indexOf("const routeBlockerBoxCache");
    const blockerEnd = source.indexOf("export function calculateModelContentSize", blockerStart);
    const blockerBlock = source.slice(blockerStart, blockerEnd);

    expect(blockerBlock).toContain("const routeBlockerBoxCache = new WeakMap<ModelNode, Map<number, RouteBlockerBox>>();");
    expect(blockerBlock).toContain("function computeRouteBlockerBox");
    expect(blockerBlock).toContain("const cached = boxesByPadding.get(padding)");
    expect(blockerBlock).toContain("boxesByPadding.set(padding, box)");
  });

  test("keeps right-panel element tree content-height when only a few graphics exist", async () => {
    const styles = await readStyles();
    const panelTreeBlock = cssRuleBlock(styles, ".graph-info-panel > .element-tree");

    expect(panelTreeBlock).toContain("align-self: start");
    expect(panelTreeBlock).toContain("max-height: 100%");
    expect(panelTreeBlock).not.toMatch(/(^|\n)\s*height:\s*100%/);
    expect(styles).toMatch(/(?:^|\n)\.element-tree\s*\{[^}]*align-content: start/s);
    expect(styles).toMatch(/(?:^|\n)\.element-tree-group\s*\{[^}]*align-content: start/s);
    expect(styles).toMatch(/(?:^|\n)\.element-tree-items\s*\{[^}]*align-content: start/s);
  });

  test("vertically centers plain element tree item text", async () => {
    const styles = await readStyles();
    const itemMainBlock = cssRuleBlock(styles, ".element-tree-item-main");
    const itemTextBlock = cssRuleBlock(styles, ".element-tree-item > .element-tree-item-main > span");

    expect(itemMainBlock).toContain("display: grid");
    expect(itemMainBlock).toContain("align-items: center");
    expect(itemMainBlock).toContain("min-height: 26px");
    expect(itemTextBlock).toContain("display: flex");
    expect(itemTextBlock).toContain("align-items: center");
    expect(itemTextBlock).toContain("min-height: 26px");
  });

  test("renders element tree identity fields as compact click-to-edit table cells", async () => {
    const styles = await readStyles();
    const itemBlock = cssRuleBlock(styles, ".element-tree-item {");
    const deviceFieldsBlock = cssRuleBlock(styles, ".element-tree-device-fields");
    const hiddenLabelBlock = cssRuleBlock(styles, ".element-tree-device-fields label > span,\n.element-tree-child-item label > span");
    const inputBlock = cssRuleBlock(styles, ".element-tree-device-fields input,\n.element-tree-child-item input");
    const focusBlock = cssRuleBlock(styles, ".element-tree-device-fields input:focus,\n.element-tree-child-item input:focus");
    const childBlock = cssRuleBlock(styles, ".element-tree-child-item {");

    expect(itemBlock).toContain("min-height: 26px");
    expect(deviceFieldsBlock).toContain("align-items: center");
    expect(deviceFieldsBlock).toContain("padding: 1px 0");
    expect(hiddenLabelBlock).toContain("clip: rect(0 0 0 0)");
    expect(inputBlock).toContain("border-color: transparent");
    expect(inputBlock).toContain("background: transparent");
    expect(inputBlock).toContain("color: inherit");
    expect(focusBlock).toContain("background: #ffffff");
    expect(focusBlock).toContain("color: #0f172a");
    expect(childBlock).toContain("padding: 2px 4px");
  });

  test("keeps graph tree edit inputs controlled by local drafts while the tree source is deferred", async () => {
    const source = await readAppSource();
    const treeStart = source.indexOf("const renderElementTreePanel = () =>");
    const treeEnd = source.indexOf("const topologyWarningDisplayMessage", treeStart);
    const treeBlock = source.slice(treeStart, treeEnd);

    expect(source).toContain("const [elementTreeEditDrafts, setElementTreeEditDrafts] = useState<Record<string, string>>({});");
    expect(source).toContain("const elementTreeDraftValue = (key: string, fallback: string) =>");
    expect(source).toContain("const updateElementTreeDraft = (key: string, value: string) =>");
    expect(source).toContain("const clearElementTreeDraft = (key: string) =>");
    expect(source).toContain("const commitElementTreeNodeIdentity = (nodeId: string, field: \"idx\" | \"name\", value: string, draftKey?: string) =>");
    expect(source).toContain("const commitElementTreeContainerChildParam = (nodeId: string, key: string, value: string, draftKey?: string) =>");
    expect(treeBlock).toContain('const idxDraftKey = `node:${item.id}:idx`;');
    expect(treeBlock).toContain('const nameDraftKey = `node:${item.id}:name`;');
    expect(treeBlock).toContain("value={elementTreeDraftValue(nameDraftKey, item.name)}");
    expect(treeBlock).toContain("onChange={(event) => updateElementTreeDraft(nameDraftKey, event.target.value)}");
    expect(treeBlock).toContain('onBlur={(event) => commitElementTreeNodeIdentity(item.id, "name", event.currentTarget.value, nameDraftKey)}');
    expect(treeBlock).toContain('const childNameDraftKey = `node:${item.id}:child:${child.nameKey}:name`;');
    expect(treeBlock).toContain("value={elementTreeDraftValue(childNameDraftKey, child.name)}");
    expect(treeBlock).toContain("commitElementTreeInputOnEnter(event)");
  });

  test("uses a low-saturation right-panel selection palette", async () => {
    const styles = await readStyles();
    const toolSwitchActiveBlock = cssRuleBlock(styles, ".tool-switch button.active");
    const leftPanelTabActiveBlock = cssRuleBlock(styles, ".left-panel-tabs button.active");
    const libraryDisplayActiveBlock = cssRuleBlock(styles, ".library-display-mode label.active");
    const topbarPrimaryActiveBlock = cssRuleBlock(styles, ".topbar-primary-button.active");
    const viewportActiveBlock = cssRuleBlock(styles, ".viewport-controls button.active");
    const projectActiveBlock = cssRuleBlock(styles, ".project-option.active {");
    const projectSelectedActiveBlock = cssRuleBlock(styles, ".project-option.selected.active {");
    const projectSelectedBlock = cssRuleBlock(styles, ".project-option.selected {");
    const schemeSelectedBlock = cssRuleBlock(styles, ".scheme-option.selected {");
    const projectActiveNameBlock = cssRuleBlock(styles, ".project-option.active .project-tree-name,\n.project-option.selected.active .project-tree-name");
    const panelModeActiveBlock = cssRuleBlock(styles, ".side-panel-mode-controls button.active");
    const inspectorPanelModeActiveBlock = cssRuleBlock(styles, ".inspector-title .side-panel-mode-controls button.active");
    const inspectorTabActiveBlock = cssRuleBlock(styles, ".inspector-tabs button.active");
    const graphToolbarBlock = cssRuleBlock(styles, ".graph-info-toolbar");
    const graphToolbarButtonBlock = cssRuleBlock(styles, ".graph-info-toolbar button");
    const graphToolbarActiveBlock = cssRuleBlock(styles, ".graph-info-toolbar button.active");
    const treeTypeHoverBlock = cssRuleBlock(styles, ".element-tree-type:hover,\n.element-tree-type:focus-visible");
    const treeItemHoverBlock = cssRuleBlock(styles, ".element-tree-item:hover,\n.element-tree-item:focus-visible");
    const selectedItemBlock = cssRuleBlock(styles, ".element-tree-item.selected {");
    const selectedChildItemBlock = cssRuleBlock(styles, ".element-tree-item.selected .element-tree-child-item {");
    const treeInputFocusBlock = cssRuleBlock(styles, ".element-tree-device-fields input:focus,\n.element-tree-child-item input:focus");
    const containerParamTabActiveBlock = cssRuleBlock(styles, ".container-param-tabs button.active");

    for (const activeBlock of [
      toolSwitchActiveBlock,
      leftPanelTabActiveBlock,
      libraryDisplayActiveBlock,
      topbarPrimaryActiveBlock,
      viewportActiveBlock,
      panelModeActiveBlock,
      inspectorTabActiveBlock,
      graphToolbarActiveBlock
    ]) {
      expect(activeBlock).toContain("color: #1f2937");
      expect(activeBlock).not.toContain("color: #ffffff");
      expect(activeBlock).not.toContain("#1d4ed8");
      expect(activeBlock).not.toContain("#2563eb");
    }
    expect(projectSelectedBlock).toContain("background: #f1f5f9");
    expect(projectSelectedBlock).toContain("box-shadow: inset 3px 0 0 #94a3b8");
    expect(schemeSelectedBlock).toContain("background: #f1f5f9");
    expect(schemeSelectedBlock).toContain("box-shadow: inset 3px 0 0 #94a3b8");
    expect(projectActiveBlock).toContain("background: #e8eef5");
    expect(projectActiveBlock).toContain("box-shadow: inset 4px 0 0 #64748b");
    expect(projectActiveBlock).not.toContain("#facc15");
    expect(projectSelectedActiveBlock).toContain("background: #dfe7f0");
    expect(projectActiveNameBlock).toContain("color: #1f2937");
    expect(panelModeActiveBlock).toContain("background: #d7eeee");
    expect(panelModeActiveBlock).toContain("border-color: #3f8f96");
    expect(panelModeActiveBlock).toContain("color: #1f2937");
    expect(panelModeActiveBlock).not.toContain("#1d4ed8");
    expect(panelModeActiveBlock).not.toContain("#2563eb");
    expect(inspectorPanelModeActiveBlock).toContain("color: #1f2937");
    expect(inspectorTabActiveBlock).toContain("background: #d7eeee");
    expect(inspectorTabActiveBlock).toContain("border-color: #3f8f96");
    expect(inspectorTabActiveBlock).toContain("color: #1f2937");
    expect(graphToolbarBlock).toContain("display: flex");
    expect(graphToolbarBlock).toContain("padding: 0 0 8px 12px");
    expect(graphToolbarButtonBlock).toContain("width: auto");
    expect(graphToolbarButtonBlock).toContain("min-width: 48px");
    expect(graphToolbarButtonBlock).toContain("height: 24px");
    expect(graphToolbarButtonBlock).toContain("border: 1px solid transparent");
    expect(graphToolbarButtonBlock).toContain("border-radius: 4px");
    expect(graphToolbarButtonBlock).toContain("font-weight: 600");
    expect(graphToolbarActiveBlock).toContain("background: #d7eeee");
    expect(graphToolbarActiveBlock).toContain("border-color: #3f8f96");
    expect(graphToolbarActiveBlock).toContain("color: #1f2937");
    expect(treeTypeHoverBlock).toContain("background: var(--element-tree-row-hover)");
    expect(treeItemHoverBlock).toContain("background: var(--element-tree-row-hover)");
    expect(selectedItemBlock).toContain("background: var(--element-tree-selected-bg)");
    expect(selectedItemBlock).toContain("color: #1e293b");
    expect(selectedItemBlock).toContain("border-color: transparent");
    expect(selectedItemBlock).toContain("box-shadow: inset 3px 0 0 var(--element-tree-selected-accent)");
    expect(selectedItemBlock).not.toContain("color: #ffffff");
    expect(selectedItemBlock).not.toContain("#1d4ed8");
    expect(selectedChildItemBlock).toContain("color: #334155");
    expect(selectedChildItemBlock).toContain("background: transparent");
    expect(containerParamTabActiveBlock).toContain("background: #d7eeee");
    expect(containerParamTabActiveBlock).toContain("border-color: #3f8f96");
    expect(containerParamTabActiveBlock).toContain("color: #1f2937");
    expect(containerParamTabActiveBlock).not.toContain("color: #ffffff");
    expect(containerParamTabActiveBlock).not.toContain("#1d4ed8");
    expect(treeInputFocusBlock).toContain("border-color: #94a3b8");
    expect(treeInputFocusBlock).toContain("rgba(100, 116, 139, 0.12)");
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

  test("splits frontend build chunks for large model editor bundles", async () => {
    const source = await readViteConfigSource();

    expect(source).toContain("manualChunks: frontendManualChunks");
    expect(source).toContain("vendor-react");
    expect(source).toContain("vendor-icons");
    expect(source).toContain("model-core");
    expect(source).toContain("graph-core");
    expect(source).toContain("isSourceModule(moduleId, \"/src/model.ts\")");
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
    expect(source).toContain("collectCurrentModelVoltageColorKeys");
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
    expect(serverSource).toContain("[\"GET /api/color-config\"");
    expect(serverSource).toContain("[\"PUT /api/color-config\"");
  });

  test("moves model layer management into a combined topbar dropdown", async () => {
    const source = await readAppSource();
    const styles = await readStyles();
    const topbarStart = source.indexOf("<header className=\"topbar\">");
    const topbarEnd = source.indexOf("</header>", topbarStart);
    const topbarBlock = source.slice(topbarStart, topbarEnd);
    const managerStart = source.indexOf("const renderLayerManager");
    const managerEnd = source.indexOf("const renderDeviceDefinitionMeasurementPanel", managerStart);
    const managerBlock = source.slice(managerStart, managerEnd);

    expect(source).not.toContain("layerDialogOpen");
    expect(source).not.toContain("setLayerDialogOpen(true)");
    expect(source).not.toContain("id=\"layer-dialog-title\"");
    expect(topbarBlock).toContain("className=\"topbar-dropdown layer-management-dropdown\"");
    expect(topbarBlock).toContain("className=\"topbar-dropdown-trigger layer-management-trigger\"");
    expect(topbarBlock).toContain("title={`激活图层：${activeLayer?.name ?? \"默认图层\"}`}");
    expect(topbarBlock).toContain("aria-label=\"图层管理\"");
    expect(topbarBlock).toContain("<span>{activeLayer?.name ?? \"默认图层\"}</span>");
    expect(topbarBlock).toContain("role=\"menu\" aria-label=\"图层管理\"");
    expect(topbarBlock).toContain("{renderLayerManager()}");
    expect(source).toContain("新增图层");
    expect(source).toContain("nextDefaultModelLayerName");
    expect(source).toContain("`图层${index}`");
    expect(managerBlock).toContain("onClick={addModelLayer}");
    expect(managerBlock).toContain("onChange={() => setActiveLayer(layer.id)}");
    expect(managerBlock).toContain("moveModelLayer(layer.id, -1)");
    expect(managerBlock).toContain("moveModelLayer(layer.id, 1)");
    expect(managerBlock).toContain("deleteModelLayer(layer.id)");
    expect(source).not.toContain("请输入新图层名称");
    expect(source).not.toContain("重命名图层");
    expect(source).not.toContain("renderChineseParamHeader(\"layers\", \"图层\")");
    expect(source).toContain("renderChineseParamHeader(\"layerId\", \"所属图层\")");
    expect(styles).toContain(".layer-management-dropdown-menu");
    expect(styles).toContain(".layer-management-trigger");
    expect(styles).not.toContain(".layer-dialog");
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

  test("adds persistent group and ungroup actions to the topbar and context menu", async () => {
    const source = await readAppSource();
    const topbarStart = source.indexOf("<header className=\"topbar\">");
    const topbarEnd = source.indexOf("</header>", topbarStart);
    const topbarBlock = source.slice(topbarStart, topbarEnd);
    const contextStart = source.indexOf("{contextMenu && (");
    const contextEnd = source.indexOf("{projectMenu && (", contextStart);
    const contextBlock = source.slice(contextStart, contextEnd);
    const groupSelectionStart = source.indexOf("{visibleSelectedGroupLayoutUnits.map");
    const groupSelectionEnd = source.indexOf("{lodCanvasNodeChunks.length > 0", groupSelectionStart);
    const groupSelectionBlock = source.slice(groupSelectionStart, groupSelectionEnd);

    expect(source).toContain("const [groups, setGroups]");
    expect(source).toContain("expandSelectionByGroups(activeLayerGroups");
    expect(source).toContain("expandSelectionByGroups(nextGroups, activeSelectedNodeIds, activeSelectedEdgeIds)");
    expect(source).toContain("groups: normalizeModelGroups(groups, nodes, projectEdges)");
    expect(source).toContain("setGroups(snapshot.groups)");
    expect(topbarBlock).toContain("aria-label=\"组合\"");
    expect(topbarBlock).toContain("aria-label=\"解散\"");
    expect(contextBlock).toContain("groupSelectedGraphics");
    expect(contextBlock).toContain("ungroupSelectedGraphics");
    expect(contextBlock).toContain("组合");
    expect(contextBlock).toContain("解散");
    expect(source).toContain("target?: \"blank\" | \"node\" | \"edge\" | \"group\"");
    expect(source).toContain("const contextMenuForNode = contextMenuTarget === \"node\" || contextMenuTarget === \"group\"");
    expect(groupSelectionBlock).toContain("onContextMenu={(event) => {");
    expect(groupSelectionBlock).toContain("target: \"group\"");
  });

  test("adds a persistent draggable template library from selected groups", async () => {
    const source = await readAppSource();
    const styles = await readStyles();
    const server = await readServerSource();
    const leftPanelStart = source.indexOf("<div className=\"left-panel-tabs\"");
    const leftPanelEnd = source.indexOf("</aside>", leftPanelStart);
    const leftPanelBlock = source.slice(leftPanelStart, leftPanelEnd);
    const contextStart = source.indexOf("{contextMenu && (");
    const contextEnd = source.indexOf("{projectMenu && (", contextStart);
    const contextBlock = source.slice(contextStart, contextEnd);
    const dropStart = source.indexOf("const handleDrop =");
    const dropEnd = source.indexOf("const handleNodePointerDown", dropStart);
    const dropBlock = source.slice(dropStart, dropEnd);
    const templatePanelStart = source.indexOf("const renderTemplateLibraryPanel = () => (");
    const templatePanelEnd = source.indexOf("const renderLibraryPanel = () => (", templatePanelStart);
    const templatePanelBlock = source.slice(templatePanelStart, templatePanelEnd);

    expect(source).toContain("type GraphTemplate =");
    expect(source).toContain("sourceSize: { width: number; height: number }");
    expect(source).toContain("customGraphTemplateTypes");
    expect(source).toContain("customGraphTemplates");
    expect(source).toContain("const [hoveredGraphTemplateType, setHoveredGraphTemplateType] = useState(\"\");");
    expect(source).toContain("CUSTOM_GRAPH_TEMPLATE_TYPES_STORAGE_KEY");
    expect(source).toContain("CUSTOM_GRAPH_TEMPLATES_STORAGE_KEY");
    expect(server).toContain("customGraphTemplateTypes");
    expect(server).toContain("customGraphTemplates");
    expect(leftPanelBlock).toContain("模板库");
    expect(leftPanelBlock).toContain("leftPanelTab === \"templates\"");
    expect(leftPanelBlock).toContain("{leftPanelContent}");
    expect(source).toContain("() => renderTemplateLibraryPanel()");
    expect(source).toContain("groupGraphTemplatesByType");
    expect(source).toContain("renderGraphTemplatePreview");
    expect(source).toContain("renderTemplateLibraryPanel");
    expect(templatePanelBlock).toContain("expandedGraphTemplateTypes.includes(typeName) || hoveredGraphTemplateType === typeName");
    expect(templatePanelBlock).toContain("onMouseEnter={() => setHoveredGraphTemplateType(typeName)}");
    expect(templatePanelBlock).toContain("onMouseLeave={() => setHoveredGraphTemplateType((current) => current === typeName ? \"\" : current)}");
    expect(source).toContain("canAddTemplateFromSelection");
    expect(source).toContain("openAddTemplateDialog");
    expect(contextBlock).toContain("添加到模板库");
    expect(contextBlock).toContain("canAddTemplateFromSelection");
    expect(source).toContain("className=\"template-dialog\"");
    expect(source).toContain("模板类型");
    expect(source).toContain("新增模板类型");
    expect(source).toContain("templateDraftName");
    expect(source).toContain("confirmAddGraphTemplate");
    expect(source).toContain("cancelTemplateDialog");
    expect(source).toContain("createGraphTemplateType");
    expect(source).toContain("模板类型名称重复");
    expect(dropBlock).toContain("application/graph-template-id");
    expect(dropBlock).toContain("dropGraphTemplate");
    expect(styles).toContain(".template-library-item");
    expect(styles).toContain(".template-dialog");
  });

  test("creates custom devices from selected graphic groups", async () => {
    const source = await readAppSource();
    const styles = await readStyles();
    const contextStart = source.indexOf("{contextMenu && (");
    const contextEnd = source.indexOf("{projectMenu && (", contextStart);
    const contextBlock = source.slice(contextStart, contextEnd);
    const toolbarStart = source.indexOf("{nodeFloatingToolbar && (");
    const toolbarEnd = source.indexOf("{edgeFloatingToolbar && (", toolbarStart);
    const toolbarBlock = source.slice(toolbarStart, toolbarEnd);

    expect(source).toContain("type GroupDeviceDefinitionDialogState =");
    expect(source).toContain("type GroupDeviceTerminalDraft =");
    expect(source).toContain("const [groupDeviceDefinitionDialog, setGroupDeviceDefinitionDialog]");
    expect(source).toContain("const openGroupDeviceDefinitionDialog = () => {");
    expect(source).toContain("const createGroupDeviceIconSvg = (clipboard: CanvasClipboard) => {");
    expect(source).toContain("const groupDeviceExternalTerminals = (clipboard: CanvasClipboard, sourceEdges: Edge[]) => {");
    expect(source).toContain("const confirmCreateDeviceFromGroup = () => {");
    expect(source).toContain("setCustomDeviceDraft({");
    expect(source).toContain("backgroundImage: groupDeviceDefinitionDialog.iconImage");
    expect(source).toContain("terminalCount: groupDeviceDefinitionDialog.terminals.length");
    expect(source).toContain("const terminalTypes = groupDeviceDefinitionDialog.terminals.map((terminal) => terminal.type)");
    expect(source).toContain("terminalLabels: Array.from({ length: MAX_CUSTOM_DEVICE_TERMINALS }, (_, index) => groupDeviceDefinitionDialog.terminals[index]?.label ?? \"\")");
    expect(source).toContain("groupDeviceDefinitionDialog.terminals.map((terminal) => terminal.anchor)");
    expect(source).toContain("terminalAssociations: normalizeContainerTerminalAssociations(");
    expect(source).toContain("setCustomDeviceDialogOpen(true)");
    expect(source).toContain("定义为元件");
    expect(source).toContain("新建元件");
    expect(source).toContain("修改已有元件图标");
    expect(source).toContain("选择元件类型");
    expect(toolbarBlock).toContain("title=\"定义为元件\" aria-label=\"定义为元件\"");
    expect(contextBlock).toContain("定义为元件");
    expect(styles).toContain(".group-device-dialog");
    expect(styles).toContain(".group-device-mode-options");
  });

  test("validates replacement icon terminal signature before updating custom templates", async () => {
    const source = await readAppSource();
    const replaceStart = source.indexOf("const confirmReplaceDeviceIconFromGroup = () => {");
    const replaceEnd = source.indexOf("const openAddTemplateDialog = () => {", replaceStart);
    const replaceBlock = source.slice(replaceStart, replaceEnd);

    expect(source).toContain("const groupDeviceTerminalSignature = (terminalTypes: readonly TerminalType[]) =>");
    expect(source).toContain("const validateGroupDeviceIconReplacement = (target: DeviceTemplate, terminals: readonly GroupDeviceTerminalDraft[]) => {");
    expect(source).toContain("图元组合对外端子数量和端子类型必须与已有元件相同");
    expect(source).toContain("const groupDeviceReplacementTemplates = useMemo(");
    expect(source).toContain("() => libraryTemplates");
    expect(source).toContain("const replaceBuiltinDeviceIconOverride = (targetTemplate: DeviceTemplate, groupIcon: string) => {");
    expect(source).toContain("return overrides[template.kind] ?? overrides[deviceDefinitionKeyForTemplate(template)];");
    expect(replaceBlock).toContain("validateGroupDeviceIconReplacement(targetTemplate, groupDeviceDefinitionDialog.terminals)");
    expect(replaceBlock).toContain("setCustomDeviceTemplates((current) =>");
    expect(replaceBlock).toContain("params: { ...template.params, backgroundImage: groupIcon, backgroundImageAssetId: \"\" }");
    expect(replaceBlock).toContain("replaceBuiltinDeviceIconOverride(targetTemplate, groupIcon)");
    expect(replaceBlock).toContain("writeOperationLog(`修改元件图标：${targetTemplate.label}`)");
  });

  test("preserves custom device terminal anchors and size from group icon drafts", async () => {
    const source = await readAppSource();
    const styles = await readStyles();
    const customTemplateStart = source.indexOf("const template: DeviceTemplate = {", source.indexOf("const saveCustomDeviceTemplate = () =>"));
    const customTemplateEnd = source.indexOf("setCustomDeviceTemplates((current) =>", customTemplateStart);
    const customTemplateBlock = source.slice(customTemplateStart, customTemplateEnd);

    expect(source).toContain("size: { width: number; height: number };");
    expect(source).toContain("terminalLabels: string[];");
    expect(source).toContain("terminalAnchors: Point[];");
    expect(source).toContain("size: { width: 104, height: 64 },");
    expect(source).toContain("terminalLabels: Array.from({ length: MAX_CUSTOM_DEVICE_TERMINALS }, () => \"\"),");
    expect(source).toContain("terminalAnchors: createDefaultCustomDeviceTerminalAnchors(2),");
    expect(source).toContain("terminalLabels: Array.from({ length: MAX_CUSTOM_DEVICE_TERMINALS }, (_, index) => template.terminalLabels?.[index] ?? \"\")");
    expect(source).toContain("terminalAnchors: createDefaultCustomDeviceTerminalAnchors(terminalCount, template.terminalAnchors)");
    expect(source).toContain("terminalAnchors: createDefaultCustomDeviceTerminalAnchors(count, current.terminalAnchors)");
    expect(source).toContain("const customDeviceTerminalAnchors = createDefaultCustomDeviceTerminalAnchors(customDeviceDraft.terminalCount, customDeviceDraft.terminalAnchors);");
    expect(source).toContain("const updateCustomDeviceTerminalAnchor = (index: number, patch: Partial<Point>) => {");
    expect(source).toContain("const CUSTOM_DEVICE_TERMINAL_ANCHOR_GUIDE_VALUES = [-0.25, -1 / 6, 0, 1 / 6, 0.25];");
    expect(source).toContain("const projectCustomDeviceTerminalAnchorToBoundary = (anchor: Point): Point => {");
    expect(source).toContain("const snapCustomDeviceTerminalAnchor = (anchor: Point): Point => {");
    expect(source).toContain("const hasOverlappingCustomDeviceTerminalAnchors = (anchors: readonly Point[]) =>");
    expect(source).toContain("if (hasOverlappingCustomDeviceTerminalAnchors(customDeviceTerminalAnchors))");
    expect(source).toContain("const customDeviceTerminalConnectorSegment = (anchor: Point) => {");
    expect(source).toContain("const updateCustomDeviceTerminalAnchorFromPreview = (index: number, svg: SVGSVGElement, event: PointerEvent<SVGElement>) => {");
    expect(source).toContain("const boundaryAnchor = projectCustomDeviceTerminalAnchorToBoundary(anchor);");
    expect(source).toContain("const snappedAnchor = snapCustomDeviceTerminalAnchor");
    expect(source).toContain("customDeviceTerminalAnchorDragIndex !== null");
    expect(source).toContain("className=\"custom-device-anchor-preview\"");
    expect(source).toContain("className={`custom-device-terminal-guide ${active ? \"active\" : \"\"}`}");
    expect(source).toContain("className=\"custom-device-terminal-connector\"");
    expect(source).toContain("customDeviceTerminalAnchors.map((anchor, index) => {");
    expect(source).toContain("setCustomDeviceTerminalAnchorDragIndex(index);");
    expect(source).toContain("updateCustomDeviceTerminalAnchorFromPreview(index, svg, event);");
    expect(source).toContain("className=\"custom-terminal-anchor-inputs\"");
    expect(source).toContain("aria-label={`端子${index + 1} X位置`}");
    expect(source).toContain("aria-label={`端子${index + 1} Y位置`}");
    expect(styles).toContain(".custom-device-anchor-preview");
    expect(styles).toContain(".custom-device-terminal-guide");
    expect(styles).toContain(".custom-device-terminal-connector");
    expect(styles).toContain(".custom-device-terminal-anchor");
    expect(styles).toContain(".custom-terminal-anchor-inputs");
    expect(customTemplateBlock).toContain("size: customDeviceDraft.size");
    expect(customTemplateBlock).toContain("terminalLabels: customDeviceDraft.terminalLabels.slice(0, terminalTypes.length).map(");
    expect(customTemplateBlock).toContain("terminalAnchors: customDeviceTerminalAnchors.slice(0, terminalTypes.length).map((anchor) => ({ ...anchor }))");
  });

  test("preserves image-backed nodes when creating icons from selected graphic groups", async () => {
    const source = await readAppSource();
    const iconStart = source.indexOf("const createGroupDeviceIconSvg = (clipboard: CanvasClipboard) => {");
    const iconEnd = source.indexOf("const groupDeviceTerminalAnchor", iconStart);
    const iconBlock = source.slice(iconStart, iconEnd);

    expect(iconBlock).toContain("const imageHref = nodeImage(node);");
    expect(iconBlock).toContain("const foregroundHref = nodeForegroundImage(node);");
    expect(iconBlock).toContain("const imageMarkup = imageHref");
    expect(iconBlock).toContain("const foregroundMarkup = foregroundHref");
    expect(iconBlock).toContain("<image href=\"${escapeXml(imageHref)}\"");
    expect(iconBlock).toContain("transform=\"${escapeXml(nodeImageContentTransform(node))}\"");
    expect(iconBlock).toContain("preserveAspectRatio=\"xMidYMid slice\"");
  });

  test("persists template library edits to the backend immediately without graph save", async () => {
    const source = await readAppSource();
    const createTypeStart = source.indexOf("const createGraphTemplateType = () => {");
    const createTypeEnd = source.indexOf("const openAddTemplateDialog", createTypeStart);
    const createTypeBlock = source.slice(createTypeStart, createTypeEnd);
    const confirmStart = source.indexOf("const confirmAddGraphTemplate = () => {");
    const confirmEnd = source.indexOf("const dropGraphTemplate", confirmStart);
    const confirmBlock = source.slice(confirmStart, confirmEnd);

    expect(source).toContain("persistTemplateLibraryChange");
    expect(source).toContain("模板库已自动保存到后台");
    expect(createTypeBlock).toContain("persistTemplateLibraryChange({ customGraphTemplateTypes: nextTypes");
    expect(confirmBlock).toContain("persistTemplateLibraryChange({ customGraphTemplateTypes: nextTypes, customGraphTemplates: nextTemplates");
    expect(createTypeBlock).not.toContain("setHasUnsavedChanges(true)");
    expect(confirmBlock).not.toContain("setHasUnsavedChanges(true)");
  });

  test("places library devices and templates through click-to-draw mode instead of requiring drag", async () => {
    const source = await readAppSource();
    const styles = await readStyles();
    const templatePanelStart = source.indexOf("const renderTemplateLibraryPanel = () => (");
    const templatePanelEnd = source.indexOf("const renderLibraryPanel = () => (", templatePanelStart);
    const templatePanelBlock = source.slice(templatePanelStart, templatePanelEnd);
    const libraryButtonStart = source.indexOf("const renderLibraryTemplateButton = ");
    const libraryButtonEnd = source.indexOf("const renderLibraryFlyout = ", libraryButtonStart);
    const libraryButtonBlock = source.slice(libraryButtonStart, libraryButtonEnd);
    const pointerMoveStart = source.indexOf("const handlePointerMove = (event: PointerEvent<SVGSVGElement>)");
    const pointerMoveEnd = source.indexOf("if (nodeLabelRotateDrag", pointerMoveStart);
    const pointerMoveBlock = source.slice(pointerMoveStart, pointerMoveEnd);
    const canvasStart = source.indexOf("className={`diagram-canvas");
    const pointerDownStart = source.indexOf("onPointerDown={(event) => {", canvasStart);
    const pointerDownEnd = source.indexOf("if (staticDrawing)", pointerDownStart);
    const pointerDownBlock = source.slice(pointerDownStart, pointerDownEnd);
    const placementPreviewStart = source.indexOf("const renderLibraryPlacementPreview = () => {");
    const placementPreviewEnd = source.indexOf("const startSidePanelResize", placementPreviewStart);
    const placementPreviewBlock = source.slice(placementPreviewStart, placementPreviewEnd);
    const contextMenuStart = source.indexOf("onContextMenu={(event) => {", canvasStart);
    const contextMenuEnd = source.indexOf("if (connectSource)", contextMenuStart);
    const contextMenuBlock = source.slice(contextMenuStart, contextMenuEnd);
    const keyHandlerStart = source.indexOf("const handleKeyDown = (event: KeyboardEvent)");
    const keyHandlerEnd = source.indexOf("if (staticDrawing && isCanvasShortcutTarget)", keyHandlerStart);
    const keyHandlerBlock = source.slice(keyHandlerStart, keyHandlerEnd);

    expect(source).toContain("type LibraryPlacementState =");
    expect(source).toContain("const [libraryPlacement, setLibraryPlacement]");
    expect(source).toContain("const startLibraryDevicePlacement");
    expect(source).toContain("const startLibraryGraphTemplatePlacement");
    expect(source).toContain("const cancelLibraryPlacement");
    expect(source).toContain("const commitLibraryPlacementAtPoint");
    expect(source).toContain("const updateLibraryPlacementPreview");
    expect(source).toContain("const renderLibraryPlacementPreview");
    expect(libraryButtonBlock).toContain("onClick={() => startLibraryDevicePlacement(item)}");
    expect(libraryButtonBlock).toContain("onContextMenu={(event) => {");
    expect(libraryButtonBlock).toContain("cancelLibraryPlacement()");
    expect(libraryButtonBlock).toContain("const libraryPreviewImageHref = nodeImage(preview);");
    expect(libraryButtonBlock).toContain("const libraryPreviewForegroundHref = nodeForegroundImage(preview);");
    expect(libraryButtonBlock).toContain("libraryPreviewImageHref || libraryPreviewForegroundHref");
    expect(libraryButtonBlock).toContain("<image");
    expect(libraryButtonBlock).toContain("href={libraryPreviewImageHref}");
    expect(libraryButtonBlock).toContain("className=\"library-preview-image\"");
    expect(libraryButtonBlock).toContain("{!libraryPreviewHasImage && (");
    expect(placementPreviewBlock).toContain("renderNodePreviewImageContent(previewNode");
    expect(placementPreviewBlock).toContain("renderNodePreviewImageContent(node");
    expect(templatePanelBlock).toContain("onClick={() => startLibraryGraphTemplatePlacement(template)}");
    expect(templatePanelBlock).toContain("onContextMenu={(event) => {");
    expect(templatePanelBlock).toContain("cancelLibraryPlacement()");
    expect(pointerMoveBlock).toContain("updateLibraryPlacementPreview(pointer)");
    expect(pointerDownBlock).toContain("if (libraryPlacement)");
    expect(pointerDownBlock).toContain("commitLibraryPlacementAtPoint(pointer)");
    expect(contextMenuBlock).toContain("if (libraryPlacement)");
    expect(contextMenuBlock).toContain("cancelLibraryPlacement()");
    expect(keyHandlerBlock).toContain("if (libraryPlacement && isCanvasShortcutTarget)");
    expect(source).toContain("{renderLibraryPlacementPreview()}");
    expect(styles).toContain(".library-placement-preview");
  });

  test("uses a crosshair cursor over all canvas content while drawing", async () => {
    const styles = await readStyles();
    const drawingCursorBlock = cssRuleBlock(styles, ".diagram-canvas.connect-mode:not(.connect-drop-ready),");

    expect(drawingCursorBlock).toContain(".diagram-canvas.connect-mode:not(.connect-drop-ready) *");
    expect(drawingCursorBlock).toContain(".diagram-canvas.static-draw-mode *");
    expect(drawingCursorBlock).toContain(".diagram-canvas.library-place-mode *");
    expect(drawingCursorBlock).toContain("cursor: crosshair !important;");
  });

  test("marks the whole page as drawing mode but only previews placed symbols inside the canvas", async () => {
    const source = await readAppSource();
    const styles = await readStyles();
    const startDeviceStart = source.indexOf("const startLibraryDevicePlacement = (template: DeviceTemplate) => {");
    const startDeviceEnd = source.indexOf("const startLibraryGraphTemplatePlacement", startDeviceStart);
    const startDeviceBlock = source.slice(startDeviceStart, startDeviceEnd);
    const startTemplateStart = source.indexOf("const startLibraryGraphTemplatePlacement = (template: GraphTemplate) => {");
    const startTemplateEnd = source.indexOf("const cancelLibraryPlacement", startTemplateStart);
    const startTemplateBlock = source.slice(startTemplateStart, startTemplateEnd);
    const canvasSvgStart = source.indexOf("className={`diagram-canvas");
    const pointerEnterStart = source.indexOf("onPointerEnter={(event) => {", canvasSvgStart);
    const pointerEnterEnd = source.indexOf("}}\n            onPointerUp", pointerEnterStart);
    const pointerEnterBlock = source.slice(pointerEnterStart, pointerEnterEnd);
    const pointerLeaveStart = source.indexOf("onPointerLeave={() => {", pointerEnterEnd);
    const pointerLeaveEnd = source.indexOf("}}\n            onPointerCancel", pointerLeaveStart);
    const pointerLeaveBlock = source.slice(pointerLeaveStart, pointerLeaveEnd);
    const bodyCursorBlock = cssRuleBlock(styles, "body.canvas-drawing-mode:not(.canvas-connect-drop-ready),");

    expect(source).toContain("const drawingModeActive = Boolean(libraryPlacement || staticDrawing || connectSource || routableLinePlacement);");
    expect(source).toContain("document.body.classList.toggle(\"canvas-drawing-mode\", drawingModeActive);");
    expect(source).toContain("document.body.classList.toggle(\"canvas-connect-drop-ready\", drawingModeActive && activeDropReady);");
    expect(source).toContain("const clearLibraryPlacementPreview = () =>");
    expect(startDeviceBlock).toContain("previewPoint: null");
    expect(startTemplateBlock).toContain("previewPoint: null");
    expect(source).not.toContain("const libraryPlacementInitialPoint = () =>");
    expect(pointerEnterBlock).toContain("const rawPointer = screenToSvgPoint(event.currentTarget, event.clientX, event.clientY);");
    expect(pointerEnterBlock).toContain("if (libraryPlacement) {");
    expect(pointerEnterBlock).toContain("updateLibraryPlacementPreview(pointer);");
    expect(pointerLeaveBlock).toContain("clearLibraryPlacementPreview();");
    expect(bodyCursorBlock).toContain("body.canvas-drawing-mode:not(.canvas-connect-drop-ready) *");
    expect(bodyCursorBlock).toContain("cursor: crosshair !important;");
  });

  test("routes line-like static symbols through an interactive canvas drawing interface", async () => {
    const source = await readAppSource();
    const model = await readModelSource();
    const styles = await readStyles();
    const dropStart = source.indexOf("const handleDrop =");
    const dropEnd = source.indexOf("const handleNodePointerDown", dropStart);
    const dropBlock = source.slice(dropStart, dropEnd);
    const placeStart = source.indexOf("const placeLibraryDeviceAtPoint =");
    const placeEnd = source.indexOf("const commitLibraryPlacementAtPoint", placeStart);
    const placeBlock = source.slice(placeStart, placeEnd);
    const pointerMoveStart = source.indexOf("const handlePointerMove = (event: PointerEvent<SVGSVGElement>)");
    const pointerMoveEnd = source.indexOf("if (nodeLabelRotateDrag", pointerMoveStart);
    const pointerMoveBlock = source.slice(pointerMoveStart, pointerMoveEnd);
    const pointerDownStart = source.indexOf("onPointerDown={(event) => {");
    const pointerDownEnd = source.indexOf("if (connectSource)", pointerDownStart);
    const pointerDownBlock = source.slice(pointerDownStart, pointerDownEnd);
    const keyHandlerStart = source.indexOf("const handleKeyDown = (event: KeyboardEvent)");
    const keyHandlerEnd = source.indexOf("window.addEventListener(\"keydown\", handleKeyDown)", keyHandlerStart);
    const keyHandlerBlock = source.slice(keyHandlerStart, keyHandlerEnd);

    expect(model).toContain("export const STATIC_DRAW_POINTS_PARAM = \"drawPoints\";");
    expect(model).toContain("export const INTERACTIVE_STATIC_DRAWING_KINDS");
    for (const kind of [
      "static-line",
      "static-polyline",
      "static-straight-connector",
      "static-arrow-connector",
      "static-double-arrow-connector",
      "static-elbow-connector",
      "static-bezier-connector",
      "static-smoothstep-connector"
    ]) {
      expect(model).toContain(`"${kind}"`);
    }
    expect(model).toContain("export function createInteractiveStaticDrawingNode");
    expect(model).toContain("export function parseStaticDrawPoints");
    expect(source).toContain("type ToolMode = \"select\" | \"connect\" | \"static-draw\";");
    expect(source).toContain("type StaticDrawingState =");
    expect(source).toContain("const [staticDrawing, setStaticDrawing]");
    expect(source).toContain("const startInteractiveStaticDrawing");
    expect(source).toContain("const appendStaticDrawingPoint");
    expect(source).toContain("const finishInteractiveStaticDrawing");
    expect(source).toContain("const cancelInteractiveStaticDrawing");
    expect(source).toContain("const updateInteractiveStaticDrawingPreview");
    expect(source).toContain("const renderInteractiveStaticDrawingPreview");
    expect(source).toContain("function staticDrawPointsForNode");
    expect(dropBlock).toContain("placeLibraryDeviceAtPoint(template");
    expect(placeBlock).toContain("isInteractiveStaticDrawingKind(kind)");
    expect(placeBlock).toContain("startInteractiveStaticDrawing(template, pointerPosition)");
    expect(pointerMoveBlock).toContain("updateInteractiveStaticDrawingPreview(pointer)");
    expect(pointerDownBlock).toContain("appendStaticDrawingPoint(pointer");
    expect(keyHandlerBlock).toContain("finishInteractiveStaticDrawing()");
    expect(keyHandlerBlock).toContain("cancelInteractiveStaticDrawing()");
    expect(source).toContain("{renderInteractiveStaticDrawingPreview()}");
    expect(styles).toContain(".static-drawing-preview-line");
  });

  test("draws routable line-like devices from snapped terminals and supports endpoint retargeting", async () => {
    const source = await readAppSource();
    const model = await readModelSource();
    const styles = await readStyles();
    const startDeviceStart = source.indexOf("const startLibraryDevicePlacement = (template: DeviceTemplate) => {");
    const startDeviceEnd = source.indexOf("const startLibraryGraphTemplatePlacement", startDeviceStart);
    const startDeviceBlock = source.slice(startDeviceStart, startDeviceEnd);
    const terminalStart = source.indexOf("const handleTerminalPointerDown =");
    const terminalEnd = source.indexOf("const handleNodePointerDown", terminalStart);
    const terminalBlock = source.slice(terminalStart, terminalEnd);
    const pointerMoveStart = source.indexOf("const handlePointerMove = (event: PointerEvent<SVGSVGElement>)");
    const pointerMoveEnd = source.indexOf("if (nodeLabelRotateDrag", pointerMoveStart);
    const pointerMoveBlock = source.slice(pointerMoveStart, pointerMoveEnd);
    const endpointPreviewStart = source.indexOf("const routableLineEndpointDragPreviewRoute = useMemo");
    const endpointPreviewEnd = source.indexOf("const manualPathPreviewRoute = useMemo", endpointPreviewStart);
    const endpointPreviewBlock = source.slice(endpointPreviewStart, endpointPreviewEnd);
    const routeCandidatesStart = source.indexOf("const routableLineRouteCandidateIdsForMovedNodes =");
    const routeCandidatesEnd = source.indexOf("const rebuildRoutableLineNodeUpdatesForChangedNodes", routeCandidatesStart);
    const routeCandidatesBlock = source.slice(routeCandidatesStart, routeCandidatesEnd);
    const previewRoutesStart = source.indexOf("const buildRoutableLinePreviewRoutesForNodeUpdates =");
    const previewRoutesEnd = source.indexOf("const buildRoutableLineEndpointPreviewNodeUpdates", previewRoutesStart);
    const previewRoutesBlock = source.slice(previewRoutesStart, previewRoutesEnd);
    const dragPreviewRoutesStart = source.indexOf("const buildRoutableLineDragPreviewRoutes =");
    const dragPreviewRoutesEnd = source.indexOf("const shiftedDragPreviewPoint", dragPreviewRoutesStart);
    const dragPreviewRoutesBlock = source.slice(dragPreviewRoutesStart, dragPreviewRoutesEnd);
    const lineRebuildStart = source.indexOf("const rebuildRoutableLineNodeUpdatesForChangedNodes =");
    const lineRebuildEnd = source.indexOf("const localRouteOptimizationEdges", lineRebuildStart);
    const lineRebuildBlock = source.slice(lineRebuildStart, lineRebuildEnd);
    const buildMovedStart = source.indexOf("const buildMovedNodeUpdates =");
    const buildMovedEnd = source.indexOf("const nextNodesForMovedGraphCommit", buildMovedStart);
    const buildMovedBlock = source.slice(buildMovedStart, buildMovedEnd);
    const linePointerStart = source.indexOf("const handleRoutableLineNodePointerDown =");
    const linePointerEnd = source.indexOf("const handleNodePointerDown =", linePointerStart);
    const linePointerBlock = source.slice(linePointerStart, linePointerEnd);
    const linePathPointerStart = source.indexOf("const handleRoutableLineNodePathPointerDown =");
    const linePathPointerEnd = source.indexOf("const handlePointerMove = (event: PointerEvent<SVGSVGElement>)", linePathPointerStart);
    const linePathPointerBlock = source.slice(linePathPointerStart, linePathPointerEnd);
    const lodPointerStart = source.indexOf("const handleLodNodePointerDown =");
    const lodPointerEnd = source.indexOf("const handleLodNodeContextMenu", lodPointerStart);
    const lodPointerBlock = source.slice(lodPointerStart, lodPointerEnd);

    expect(model).toContain("export function createRoutableLineDeviceFromEndpoints");
    expect(model).toContain("export function setRoutableLineDeviceEndpoints");
    expect(source).toContain("type RoutableLinePlacementState =");
    expect(source).toContain("type RoutableLineEndpointDragState =");
    expect(source).toContain("const [routableLinePlacement, setRoutableLinePlacement]");
    expect(source).toContain("const [routableLineEndpointDrag, setRoutableLineEndpointDrag]");
    expect(startDeviceBlock).toContain("isRoutableLineDeviceKind(template.kind)");
    expect(startDeviceBlock).toContain("setRoutableLinePlacement({ template, source: null });");
    expect(source).toContain("const findRoutableLineEndpointTargetAtPoint");
    expect(source).toContain("const startRoutableLineFromTerminal");
    expect(source).toContain("const finishRoutableLineToTarget");
    expect(source).toContain("const startRoutableLineEndpointDrag");
    expect(source).toContain("const finishRoutableLineEndpointDrag");
    expect(terminalBlock).toContain("if (routableLinePlacement)");
    expect(terminalBlock).toContain("startRoutableLineFromTerminal");
    expect(terminalBlock).toContain("finishRoutableLineToTarget");
    expect(source).toContain("const hideFixedTerminal = nodeIsBus || isStaticNode(node) || isRoutableLineDeviceKind(node.kind);");
    expect(source).toContain("if (isBusNode(node) || isStaticNode(node) || isRoutableLineDeviceKind(node.kind))");
    expect(source).toContain("!nodeIsBus && !isStaticNode(node) && !isRoutableLineDeviceKind(node.kind)");
    expect(pointerMoveBlock).toContain("scheduleRoutableLinePreviewPoint");
    expect(pointerMoveBlock).toContain("updateRoutableLineEndpointDrag");
    expect(source).toContain("finishRoutableLineEndpointDrag");
    expect(source).toContain("createRoutableLineDeviceFromEndpoints");
    expect(source).toContain("setRoutableLineDeviceEndpoints");
    expect(source).toContain("routableLineDeviceEndpointRefForNode");
    expect(source).toContain("routableLineDeviceEndpointRefs");
    expect(source).toContain("routeRoutableLineDevice(rawLine");
    const nodeGeometryTransformStart = source.indexOf("function nodeGeometryTransform(node: ModelNode)");
    const nodeGeometryTransformEnd = source.indexOf("function nodeUprightScaleTransform", nodeGeometryTransformStart);
    const nodeGeometryTransformBlock = source.slice(nodeGeometryTransformStart, nodeGeometryTransformEnd);
    const endpointPreviewNodeUpdatesStart = source.indexOf("const buildRoutableLineEndpointPreviewNodeUpdates = (");
    const endpointPreviewNodeUpdatesEnd = source.indexOf("const buildRoutableLineDragPreviewRoutes", endpointPreviewNodeUpdatesStart);
    const endpointPreviewNodeUpdatesBlock = source.slice(endpointPreviewNodeUpdatesStart, endpointPreviewNodeUpdatesEnd);
    const initialNodesStart = source.indexOf("const initialIndexedNodes = useMemo(() => {");
    const initialNodesEnd = source.indexOf("const initialDeviceLibrary = useMemo", initialNodesStart);
    const initialNodesBlock = source.slice(initialNodesStart, initialNodesEnd);
    const groupTransformPreviewStart = source.indexOf("const renderGroupTransformPhotoPreview = () => {");
    const groupTransformPreviewEnd = source.indexOf("return (", groupTransformPreviewStart);
    const groupTransformPreviewBlock = source.slice(groupTransformPreviewStart, groupTransformPreviewEnd);
    const detailedViewportNodesStart = source.indexOf("const detailedViewportNodes = useMemo(() => {");
    const detailedViewportNodesEnd = source.indexOf("const useSimplifiedCanvasRoutes =", detailedViewportNodesStart);
    const detailedViewportNodesBlock = source.slice(detailedViewportNodesStart, detailedViewportNodesEnd);
    const lodCanvasNodeChunksStart = source.indexOf("const lodCanvasNodeChunks = useMemo(() => {");
    const lodCanvasNodeChunksEnd = source.indexOf("const lodSelectedNodeMarkup = useMemo", lodCanvasNodeChunksStart);
    const lodCanvasNodeChunksBlock = source.slice(lodCanvasNodeChunksStart, lodCanvasNodeChunksEnd);
    expect(nodeGeometryTransformBlock).toContain("if (isRoutableLineDeviceKind(node.kind))");
    expect(nodeGeometryTransformBlock).toContain("return \"rotate(0) scale(1 1)\";");
    expect(source).toContain("function routableLineDeviceRenderLocalPoints(node: ModelNode)");
    expect(detailedViewportNodesBlock).toContain("if (isRoutableLineDeviceKind(node.kind))");
    expect(detailedViewportNodesBlock).toContain("return true;");
    expect(lodCanvasNodeChunksBlock).toContain("!isRoutableLineDeviceKind(node.kind)");
    expect(initialNodesBlock).toContain("repairUnsafeRoutableLineDeviceRoutes(indexed.nodes, initialCanvasBounds)");
    expect(endpointPreviewNodeUpdatesBlock).toContain("const previewNodes = sourceNodes.map");
    expect(endpointPreviewNodeUpdatesBlock).toContain("const routingNodes = previewNodes.map");
    expect(endpointPreviewNodeUpdatesBlock).toContain("routeRoutableLineDevice(syncedLine, routingNodes, canvasBounds)");
    expect(groupTransformPreviewBlock).toContain("const previewNodes = nodes.map");
    expect(groupTransformPreviewBlock).toContain("const routedLine = routeRoutableLineDevice(syncedLine, routingNodes, canvasBounds)");
    expect(groupTransformPreviewBlock).toContain("path: pointsToPreviewPath(points)");
    expect(groupTransformPreviewBlock).not.toContain("Math.abs(end.x - start.x) >= Math.abs(end.y - start.y)");
    expect(endpointPreviewBlock).toContain("const refs = routableLineDeviceEndpointRefs(lineNode);");
    expect(endpointPreviewBlock).toContain("const movingTarget = routableLineEndpointDrag.dropTarget;");
    expect(endpointPreviewBlock).toContain("source: routableLineEndpointDrag.endpoint === \"source\"");
    expect(endpointPreviewBlock).toContain("target: routableLineEndpointDrag.endpoint === \"target\"");
    expect(endpointPreviewBlock).toContain("movingTarget ? routableLineDeviceEndpointRefForNode");
    expect(endpointPreviewBlock).toContain(": undefined");
    expect(source).toContain("const nodeIsRoutableLineDevice = isRoutableLineDeviceKind(node.kind);");
    expect(source).toContain("${nodeIsRoutableLineDevice ? \"routable-line-node\" : \"\"}");
    expect(source).toContain("selected && focused && selectedNodeCount === 1 && !nodeIsRoutableLineDevice");
    expect(buildMovedBlock).toContain("!isCanvasNodeMovable(node.kind)");
    expect(routeCandidatesBlock).toContain("routableLineNodeIdsByEndpointNodeId.get(nodeId)");
    expect(routeCandidatesBlock).toContain("routeTouchesExpandedBoxes(routableLineDeviceCanvasPoints(node)");
    expect(previewRoutesBlock).toContain("routableLineIdsConnectedToNodeIds(changedNodeIdList)");
    expect(previewRoutesBlock).not.toContain("routableLineRouteCandidateIdsForMovedNodes(");
    expect(dragPreviewRoutesBlock).not.toContain("routeFully: true");
    expect(lineRebuildBlock).toContain("completeNodeListForPartialPatch(previousNodes, nextNodes)");
    expect(lineRebuildBlock).toContain("rebuildRoutableLineDeviceRouteUpdates(fullNextNodes");
    expect(lineRebuildBlock).toContain("{ movedNodeIds: changedNodeIds }");
    expect(linePointerBlock).toContain("selectCanvasGraphics([node.id], [], { scope: \"direct\" })");
    expect(linePointerBlock).not.toContain("startDraggingState");
    expect(linePathPointerBlock).toContain("handleRoutableLineNodePointerDown(event, node)");
    expect(linePathPointerBlock).not.toContain("handleNodePointerDown");
    expect(lodPointerBlock).toContain("isRoutableLineDeviceKind(node.kind)");
    expect(lodPointerBlock).toContain("handleRoutableLineNodePointerDown(event, node)");
    expect(source).toContain("routable-line-drawing-preview");
    expect(source).toContain("routable-line-endpoint-handle");
    expect(styles).toContain(".routable-line-drawing-preview");
    expect(styles).toContain(".routable-line-endpoint-handle");
    expect(styles).toContain(".diagram-node.routable-line-node.selected .node-hitbox");
    expect(styles).toContain("pointer-events: none;");
    expect(styles).toContain(".diagram-node.routable-line-node.selected .routable-line-device-glyph path");
    const routableLineGlyphPathBlock = cssRuleBlock(styles, ".diagram-node.routable-line-node .routable-line-device-glyph path");
    expect(routableLineGlyphPathBlock).not.toContain("vector-effect: non-scaling-stroke");
    const endpointHoverBlock = cssRuleBlock(styles, ".routable-line-endpoint-handle:hover");
    expect(endpointHoverBlock).not.toContain("transform:");
    expect(endpointHoverBlock).not.toContain("stroke-width:");
  });

  test("supports manual bend insertion and segment dragging for routable line-like devices", async () => {
    const source = await readAppSource();
    const model = await readModelSource();
    const styles = await readStyles();
    const importBlockEnd = source.indexOf("} from \"./model\";");
    const importBlock = source.slice(0, importBlockEnd);
    const finishStart = source.indexOf("const finishManualPathDrag =");
    const finishEnd = source.indexOf("const tidySelectedEdgeRoute =", finishStart);
    const finishBlock = source.slice(finishStart, finishEnd);
    const pointerStart = source.indexOf("if (manualPathDrag && svgRef.current)");
    const pointerEnd = source.indexOf("if (rewiring && svgRef.current)", pointerStart);
    const pointerBlock = source.slice(pointerStart, pointerEnd);
    const renderStart = source.indexOf("{selectedRoutableLineManualPathRoute &&");
    const renderEnd = source.indexOf("{selectedRoutedEdge &&", renderStart);
    const renderBlock = source.slice(renderStart, renderEnd);

    expect(model).toContain("export function insertRoutableLineDeviceBend");
    expect(model).toContain("export function moveRoutableLineDeviceSegment");
    expect(importBlock).toContain("insertRoutableLineDeviceBend");
    expect(importBlock).toContain("moveRoutableLineDeviceSegment");
    expect(importBlock).toContain("setRoutableLineDeviceCanvasPoints");
    expect(source).toContain("const startRoutableLineSegmentDrag =");
    expect(source).toContain("const startRoutableLinePointDrag =");
    expect(source).toContain("const addRoutableLineBendFromContextMenu =");
    expect(source).toContain("contextMenuForRoutableLine");
    expect(source).toContain("routePoints: isRoutableLineDeviceKind(node.kind) ? routableLineDeviceCanvasPoints(node) : undefined");
    expect(source).toContain("routePoints: nodeIsRoutableLineDevice ? routableLineDeviceCanvasPoints(node) : undefined");
    expect(finishBlock).toContain("manualPathDrag.nodeId");
    expect(finishBlock).toContain("setRoutableLineDeviceCanvasPoints");
    expect(pointerBlock).toContain("moveRoutableLineDeviceSegment");
    expect(renderBlock).toContain("routable-line-manual-path-layer");
    expect(renderBlock).toContain("manual-segment-handle");
    expect(renderBlock).toContain("manual-bend-handle user-manual-bend");
    expect(styles).toContain(".routable-line-manual-path-layer");
  });

  test("draws box-like static symbols by rectangle and edits their real width and height", async () => {
    const model = await readModelSource();
    const source = await readAppSource();
    const dropStart = source.indexOf("const handleDrop =");
    const dropEnd = source.indexOf("const handleNodePointerDown", dropStart);
    const dropBlock = source.slice(dropStart, dropEnd);
    const placeStart = source.indexOf("const placeLibraryDeviceAtPoint =");
    const placeEnd = source.indexOf("const commitLibraryPlacementAtPoint", placeStart);
    const placeBlock = source.slice(placeStart, placeEnd);
    const staticDrawingStart = source.indexOf("const startInteractiveStaticDrawing");
    const staticDrawingEnd = source.indexOf("const startSidePanelResize", staticDrawingStart);
    const staticDrawingBlock = source.slice(staticDrawingStart, staticDrawingEnd);
    const selectedPanelStart = source.indexOf("aria-label=\"图元属性分类\"");
    const selectedPanelEnd = source.indexOf("{isStaticNode(inspectorSelectedNode)", selectedPanelStart);
    const selectedPanelBlock = source.slice(selectedPanelStart, selectedPanelEnd);

    expect(model).toContain("export function isStaticBoxLikeKind");
    expect(model).toContain("export function createStaticBoxNodeFromDrawing");
    expect(source).toContain("isStaticBoxLikeKind");
    expect(dropBlock).toContain("placeLibraryDeviceAtPoint(template");
    expect(placeBlock).toContain("isStaticBoxLikeKind(kind)");
    expect(placeBlock).toContain("startInteractiveStaticDrawing(template, pointerPosition)");
    expect(staticDrawingBlock).toContain("createStaticBoxNodeFromDrawing(staticDrawing.template");
    expect(staticDrawingBlock).toContain("renderStaticBoxDrawingPreview");
    expect(selectedPanelBlock).toContain("isStaticBoxLikeNode(inspectorSelectedNode)");
    expect(selectedPanelBlock).toContain("renderChineseParamHeader(\"staticWidth\"");
    expect(selectedPanelBlock).toContain("renderChineseParamHeader(\"staticHeight\"");
    expect(selectedPanelBlock).toContain("updateSelectedNode({ size: { ...inspectorSelectedNode.size, width:");
    expect(selectedPanelBlock).toContain("updateSelectedNode({ size: { ...inspectorSelectedNode.size, height:");
  });

  test("hides unavailable canvas context-menu actions instead of rendering disabled buttons", async () => {
    const source = await readAppSource();
    const topbarStart = source.indexOf("<header className=\"topbar\">");
    const topbarEnd = source.indexOf("</header>", topbarStart);
    const topbarBlock = source.slice(topbarStart, topbarEnd);
    const contextStart = source.indexOf("{contextMenu && (");
    const contextEnd = source.indexOf("{projectMenu && (", contextStart);
    const contextBlock = source.slice(contextStart, contextEnd);

    expect(source).toContain("const contextSelectionCount = activeSelectedNodeIds.length + activeSelectedEdgeIds.length");
    expect(source).toContain("const canUngroupSelectedGraphics = useMemo");
    expect(source).toContain("const canGroupSelectedGraphics = useMemo");
    expect(source).toContain("target?: \"blank\" | \"node\" | \"edge\"");
    expect(source).toContain("const contextMenuForSelection = contextMenuTarget !== \"blank\"");
    expect(source).toContain("const contextMenuForNode = contextMenuTarget === \"node\"");
    expect(source).toContain("const contextMenuForEdge = contextMenuTarget === \"edge\"");
    expect(topbarBlock).toContain("disabled={!canGroupSelectedGraphics}");
    expect(contextBlock).toContain("{contextMenuForSelection && contextSelectionCount > 0 && (");
    expect(contextBlock).toContain("{contextMenuForEdge && selectedEdge && (");
    expect(contextBlock).toContain("{contextMenuForEdge && contextMenu.edgeId && (");
    expect(contextBlock).toContain("{contextMenuForNode && canGroupSelectedGraphics && (");
    expect(contextBlock).toContain("{contextMenuForNode && canUngroupSelectedGraphics && (");
    expect(contextBlock).toContain("{contextMenuForNode && activeSelectedNodeIds.length > 0 && (");
    expect(contextBlock).toContain("groupSelectedGraphics");
    expect(contextBlock).toContain("ungroupSelectedGraphics");
    expect(contextBlock).not.toContain("disabled=");
  });

  test("auto-hides blank canvas context menus when users leave or move the canvas", async () => {
    const source = await readAppSource();
    const pointerCloseStart = source.indexOf("const closeContextMenus = (event: globalThis.PointerEvent) =>");
    const pointerCloseEnd = source.indexOf("useEffect(() => {\n    return () => {", pointerCloseStart);
    const closeBlock = source.slice(pointerCloseStart, pointerCloseEnd);
    const contextStart = source.indexOf("{contextMenu && (");
    const contextEnd = source.indexOf("{projectMenu && (", contextStart);
    const contextBlock = source.slice(contextStart, contextEnd);

    expect(source).toContain("const CONTEXT_MENU_AUTO_HIDE_MARGIN = 28;");
    expect(contextBlock).toContain("data-canvas-context-menu=\"true\"");
    expect(closeBlock).toContain("if (!contextMenu || contextMenu.target !== \"blank\")");
    expect(closeBlock).toContain("const closeBlankContextMenuIfPointerLeaves = (event: globalThis.PointerEvent) =>");
    expect(closeBlock).toContain("target?.closest(\".context-menu\")");
    expect(closeBlock).toContain("document.querySelector<HTMLElement>(\"[data-canvas-context-menu='true']\")");
    expect(closeBlock).toContain("CONTEXT_MENU_AUTO_HIDE_MARGIN");
    expect(closeBlock).toContain("window.addEventListener(\"pointermove\", closeBlankContextMenuIfPointerLeaves)");
    expect(closeBlock).toContain("window.addEventListener(\"wheel\", closeBlankContextMenuOnCanvasMotion, { capture: true })");
    expect(closeBlock).toContain("event.key === \"Escape\"");
    expect(closeBlock).toContain("window.removeEventListener(\"pointermove\", closeBlankContextMenuIfPointerLeaves)");
  });

  test("closes graphic context menus before blank-canvas panning consumes left clicks", async () => {
    const source = await readAppSource();
    const panningStart = source.indexOf("const startCanvasPanning =");
    const panningEnd = source.indexOf("const handleCanvasPointerDownCapture", panningStart);
    const panningBlock = source.slice(panningStart, panningEnd);
    const contextStart = source.indexOf("{contextMenu && (");
    const contextEnd = source.indexOf("{projectMenu && (", contextStart);
    const contextBlock = source.slice(contextStart, contextEnd);

    expect(panningBlock.indexOf("setContextMenu(null);")).toBeGreaterThanOrEqual(0);
    expect(panningBlock.indexOf("setProjectMenu(null);")).toBeGreaterThanOrEqual(0);
    expect(panningBlock.indexOf("setContextMenu(null);")).toBeLessThan(panningBlock.indexOf("event.stopPropagation();"));
    expect(panningBlock.indexOf("setProjectMenu(null);")).toBeLessThan(panningBlock.indexOf("event.stopPropagation();"));
    expect(contextBlock).toContain("{isEditMode && contextMenuTarget === \"blank\" && activeLayerNodes.length > 1 && (");
    expect(contextBlock).not.toContain("{isEditMode && !contextMenuForEdge && activeLayerNodes.length > 1 && (");
  });

  test("closes open context menus on left clicks before graphic handlers stop propagation", async () => {
    const source = await readAppSource();
    const globalCloseStart = source.indexOf("const closeContextMenus = (event: globalThis.PointerEvent) =>");
    const globalCloseEnd = source.indexOf("}, []);", globalCloseStart);
    const globalCloseBlock = source.slice(globalCloseStart, globalCloseEnd);
    const nodePointerStart = source.indexOf("const handleNodePointerDown =");
    const nodePointerEnd = source.indexOf("const handlePointerMove", nodePointerStart);
    const nodePointerBlock = source.slice(nodePointerStart, nodePointerEnd);

    expect(nodePointerBlock).toContain("event.stopPropagation();");
    expect(globalCloseBlock).toContain("event.button !== 0");
    expect(globalCloseBlock).toContain("target instanceof Element");
    expect(globalCloseBlock).toContain("target.closest(\".context-menu\")");
    expect(globalCloseBlock).toContain("setContextMenu(null);");
    expect(globalCloseBlock).toContain("setProjectMenu(null);");
    expect(globalCloseBlock).toContain("window.addEventListener(\"pointerdown\", closeContextMenus, { capture: true });");
    expect(globalCloseBlock).toContain("window.removeEventListener(\"pointerdown\", closeContextMenus, { capture: true });");
  });

  test("adds canvas context-menu action for auto-spreading overlapping graphics", async () => {
    const source = await readAppSource();
    const contextStart = source.indexOf("{contextMenu && (");
    const contextEnd = source.indexOf("{projectMenu && (", contextStart);
    const contextBlock = source.slice(contextStart, contextEnd);

    expect(source).toContain("autoSpreadCanvasGraphics");
    expect(source).toContain("autoSpreadNodeLayoutUnits");
    expect(contextBlock).toContain("自动散开");
    expect(contextBlock).toContain("runContextMenuAction(autoSpreadCanvasGraphics)");
  });

  test("adds canvas context-menu action for threshold-based auto-align", async () => {
    const source = await readAppSource();
    const contextStart = source.indexOf("{contextMenu && (");
    const contextEnd = source.indexOf("{projectMenu && (", contextStart);
    const contextBlock = source.slice(contextStart, contextEnd);

    expect(source).toContain("autoAlignCanvasGraphics");
    expect(source).toContain("autoAlignNodeLayoutUnits");
    expect(source).toContain("AUTO_ALIGN_DEFAULT_THRESHOLD_PX");
    expect(source).toContain("AUTO_ALIGN_MIN_THRESHOLD_PX");
    expect(source).toContain("AUTO_ALIGN_MAX_THRESHOLD_PX");
    expect(source).toContain("window.prompt");
    expect(source).toContain("Math.max(AUTO_ALIGN_MIN_THRESHOLD_PX, Math.min(AUTO_ALIGN_MAX_THRESHOLD_PX");
    expect(contextBlock).toContain("自动对齐");
    expect(contextBlock).toContain("runContextMenuAction(autoAlignCanvasGraphics)");
  });

  test("readjusts bus endpoint landing points after automatic alignment", async () => {
    const source = await readAppSource();
    const helperStart = source.indexOf("const readjustMovedBusConnectionRoutes");
    const helperEnd = source.indexOf("const commitLayoutNodePositions", helperStart);
    const helperBlock = source.slice(helperStart, helperEnd);
    const commitStart = source.indexOf("const commitLayoutNodePositions =");
    const commitEnd = source.indexOf("const applySelectedNodeLayout", commitStart);
    const commitBlock = source.slice(commitStart, commitEnd);
    const autoAlignStart = source.indexOf("const autoAlignCanvasGraphics =");
    const autoAlignEnd = source.indexOf("const connectionRedrawViewportBounds", autoAlignStart);
    const autoAlignBlock = source.slice(autoAlignStart, autoAlignEnd);

    expect(helperStart).toBeGreaterThan(-1);
    expect(helperBlock).toContain("isBusNode(source)");
    expect(helperBlock).toContain("isBusNode(target)");
    expect(helperBlock).toContain("movedIds.has(edge.sourceId) || movedIds.has(edge.targetId)");
    expect(helperBlock).toContain("redrawConnectionRoutesForEdges(nextNodes, candidateEdges, busConnectedEdgeIds, bounds)");
    expect(commitBlock).toContain("options: { readjustBusEndpoints?: boolean } = {}");
    expect(commitBlock).toContain("options.readjustBusEndpoints");
    expect(commitBlock).toContain("readjustMovedBusConnectionRoutes(");
    expect(autoAlignBlock).toContain("commitLayoutNodePositions(");
    expect(autoAlignBlock).toContain("{ readjustBusEndpoints: true }");
  });

  test("opens a scoped connection-redraw dialog from the blank canvas context menu", async () => {
    const source = await readAppSource();
    const styles = await readStyles();
    const contextStart = source.indexOf("{contextMenu && (");
    const contextEnd = source.indexOf("{projectMenu && (", contextStart);
    const contextBlock = source.slice(contextStart, contextEnd);
    const redrawStart = source.indexOf("const connectionRedrawViewportBounds = () =>");
    const redrawEnd = source.indexOf("const alignSelected =", redrawStart);
    const redrawBlock = source.slice(redrawStart, redrawEnd);
    const dialogStart = source.indexOf("{connectionRedrawDialogOpen && (");
    const dialogEnd = source.indexOf("{templateDialog && (", dialogStart);
    const dialogBlock = source.slice(dialogStart, dialogEnd);

    expect(source).toContain("type ConnectionRedrawScope = \"selected\" | \"viewport\" | \"all\"");
    expect(source).toContain("redrawConnectionRoutesForEdges");
    expect(contextBlock).toContain("contextMenuTarget === \"blank\"");
    expect(contextBlock).toContain("openConnectionRedrawDialog");
    expect(contextBlock).toContain("连接线重绘");
    expect(redrawBlock).toContain("queryRouteSpatialIndex(routedEdgeSpatialIndex, viewportBounds)");
    expect(redrawBlock).toContain("redrawConnectionRoutesForEdges(nodes, edges, targetEdgeIds, canvasBounds)");
    expect(redrawBlock).toContain("pushUndoSnapshot(true, false, undoScopeForGraphPatch([], changedEdgeIds))");
    expect(redrawBlock).toContain("patchGraphEdges(changedEdges)");
    expect(dialogBlock).toContain("role=\"radiogroup\"");
    expect(dialogBlock).toContain("CONNECTION_REDRAW_SCOPE_LABELS[scope]");
    expect(source).toContain("selected: \"选中连接线\"");
    expect(source).toContain("viewport: \"视图内连接线\"");
    expect(source).toContain("all: \"全部连接线\"");
    expect(dialogBlock).toContain("confirmConnectionRedrawDialog");
    expect(dialogBlock).toContain("确定");
    expect(styles).toContain(".connection-redraw-dialog");
    expect(styles).toContain(".connection-redraw-options");
  });

  test("opens a scoped voltage-base clear dialog from the canvas context menu", async () => {
    const source = await readAppSource();
    const model = await readModelSource();
    const contextStart = source.indexOf("{contextMenu && (");
    const contextEnd = source.indexOf("{projectMenu && (", contextStart);
    const contextBlock = source.slice(contextStart, contextEnd);
    const clearStart = source.indexOf("const voltageBaseClearPreviewByScope =");
    const clearEnd = source.indexOf("const alignSelected =", clearStart);
    const clearBlock = source.slice(clearStart, clearEnd);
    const dialogStart = source.indexOf("{voltageBaseClearDialogOpen && (");
    const dialogEnd = source.indexOf("{connectionRedrawDialogOpen && (", dialogStart);
    const dialogBlock = source.slice(dialogStart, dialogEnd);

    expect(model).toContain("export type VoltageBaseClearScope = \"selected\" | \"island\" | \"all\"");
    expect(model).toContain("export function clearVoltageBaseValuesForScope");
    expect(source).toContain("clearVoltageBaseValuesForScope");
    expect(source).toContain("VOLTAGE_BASE_CLEAR_SCOPE_LABELS");
    expect(contextBlock).toContain("openVoltageBaseClearDialog");
    expect(contextBlock).toContain("清空电压基值");
    expect(clearBlock).toContain("clearVoltageBaseValuesForScope(nodes, edges, activeSelectedNodeIds, scope)");
    expect(clearBlock).toContain("pushUndoSnapshot(true, false, undoScopeForGraphPatch(result.changedNodeIds, []))");
    expect(clearBlock).toContain("patchGraphNodes(result.nodeUpdates)");
    expect(dialogBlock).toContain("role=\"radiogroup\"");
    expect(source).toContain("selected: \"选中设备\"");
    expect(source).toContain("island: \"所在拓扑岛\"");
    expect(source).toContain("all: \"全网\"");
    expect(dialogBlock).toContain("VOLTAGE_BASE_CLEAR_SCOPE_LABELS[scope]");
    expect(dialogBlock).toContain("confirmVoltageBaseClearDialog");
  });

  test("opens a scoped voltage-base set dialog from the canvas context menu", async () => {
    const source = await readAppSource();
    const model = await readModelSource();
    const contextStart = source.indexOf("{contextMenu && (");
    const contextEnd = source.indexOf("{projectMenu && (", contextStart);
    const contextBlock = source.slice(contextStart, contextEnd);
    const setStart = source.indexOf("const voltageBaseSetPreviewByScope =");
    const setEnd = source.indexOf("const connectionRedrawViewportBounds =", setStart);
    const setBlock = source.slice(setStart, setEnd);
    const confirmSetStart = source.indexOf("const confirmVoltageBaseSetDialog = () =>");
    const confirmSetEnd = source.indexOf("const voltageBaseClearPreviewByScope =", confirmSetStart);
    const confirmSetBlock = source.slice(confirmSetStart, confirmSetEnd);
    const dialogStart = source.indexOf("{voltageBaseSetDialogOpen && (");
    const dialogEnd = source.indexOf("{voltageBaseClearDialogOpen && (", dialogStart);
    const dialogBlock = source.slice(dialogStart, dialogEnd);

    expect(model).toContain("export type VoltageBaseSetScope = \"selected\" | \"island\"");
    expect(model).toContain("export function setVoltageBaseValuesForScope");
    expect(model).toContain("export function setVoltageBaseTerminalValuesForScope");
    expect(source).toContain("setVoltageBaseValuesForScope");
    expect(source).toContain("setVoltageBaseTerminalValuesForScope");
    expect(source).toContain("VOLTAGE_BASE_SET_SCOPE_LABELS");
    const voltageBaseMenuLabelStart = contextBlock.indexOf("电压基值");
    const voltageBaseMenuStart = contextBlock.lastIndexOf("<div className=\"context-menu-submenu\">", voltageBaseMenuLabelStart);
    const voltageBaseMenuEnd = contextBlock.indexOf("{isEditMode && contextMenuTarget === \"blank\"", voltageBaseMenuStart);
    const voltageBaseMenuBlock = contextBlock.slice(voltageBaseMenuStart, voltageBaseMenuEnd);
    expect(voltageBaseMenuBlock).toContain("className=\"context-menu-submenu\"");
    expect(voltageBaseMenuBlock).toContain("className=\"context-menu-submenu-trigger\"");
    expect(voltageBaseMenuBlock).toContain("className=\"context-menu-submenu-panel\"");
    expect(contextBlock).toContain("openVoltageBaseSetDialog");
    expect(contextBlock).toContain("设置电压基值");
    expect(voltageBaseMenuBlock).toContain("openVoltageBaseSetDialog");
    expect(voltageBaseMenuBlock).toContain("设置电压基值");
    expect(voltageBaseMenuBlock).toContain("openVoltageBaseClearDialog");
    expect(voltageBaseMenuBlock).toContain("清空电压基值");
    expect(setBlock).toContain("setVoltageBaseValuesForScope(nodes, edges, activeSelectedNodeIds, scope, voltageBaseSetValue.trim())");
    expect(setBlock).toContain("setVoltageBaseTerminalValuesForScope(nodes, edges, activeVoltageBaseTerminalValues(), scope)");
    expect(setBlock).toContain("pushUndoSnapshot(true, false, undoScopeForGraphPatch(result.changedNodeIds, []))");
    expect(setBlock).toContain("patchGraphNodes(result.nodeUpdates)");
    expect(dialogBlock).toContain("设置方式");
    expect(source).toContain(": \"统一设置\";");
    expect(source).toContain("? \"按端子设置\"");
    expect(dialogBlock).toContain("voltage-base-terminal-grid");
    expect(dialogBlock).toContain("setVoltageBaseTerminalValue");
    expect(dialogBlock).toContain("list=\"voltage-base-set-options\"");
    expect(dialogBlock).toContain("<datalist id=\"voltage-base-set-options\">");
    expect(dialogBlock).toContain("role=\"radiogroup\"");
    expect(source).toContain("selected: \"选中设备\"");
    expect(source).toContain("island: \"所在拓扑岛\"");
    expect(dialogBlock).toContain("VOLTAGE_BASE_SET_SCOPE_LABELS[scope]");
    expect(dialogBlock).toContain("const count = result.changedNodeIds.length;");
    expect(dialogBlock).toContain("voltageBaseSetResultForScope(voltageBaseSetScope).changedNodeIds.length === 0");
    expect(dialogBlock).not.toContain("const count = result.targetNodeIds.length;");
    expect(dialogBlock).toContain("confirmVoltageBaseSetDialog");
    expect(confirmSetBlock).not.toContain("setVoltageBaseSetDialogOpen(false);");
    expect(dialogBlock).toContain(">退出</button>");
    expect(dialogBlock).not.toContain(">取消</button>");
  });

  test("uses explicit model scheme and blank project-list context-menu actions", async () => {
    const source = await readAppSource();
    const styles = await readStyles();
    const projectPanelStart = source.indexOf("const renderProjectSchemeNode =");
    const projectPanelEnd = source.indexOf("const customDraftTerminalTypes", projectPanelStart);
    const projectPanelBlock = source.slice(projectPanelStart, projectPanelEnd);
    const projectContextStart = source.indexOf("{projectMenu && (");
    const projectContextEnd = source.indexOf("{pendingModelImportConflict && (", projectContextStart);
    const projectContextBlock = source.slice(projectContextStart, projectContextEnd);
    const contextMenuBlock = cssRuleBlock(styles, ".context-menu {");
    const sidePanelBlock = cssRuleBlock(styles, ".floating-side-panel {");
    const modelLabels = ["模型删除", "模型导出", "模型重命名", "模型复制", "模型粘贴"];
    const schemeLabels = ["方案新增", "方案删除", "方案导出", "方案导入", "方案重命名", "方案复制", "方案粘贴", "模型新建", "模型导入", "模型粘贴"];
    const blankLabels = ["方案新增", "方案粘贴", "方案导入"];
    const modelProjectMenuStart = projectContextBlock.indexOf("{projectMenu.projectId && (");
    const modelProjectMenuEnd = projectContextBlock.indexOf("{!projectMenu.projectId && projectMenu.schemeId && (", modelProjectMenuStart);
    const modelProjectMenuBlock = projectContextBlock.slice(modelProjectMenuStart, modelProjectMenuEnd);
    const schemeMenuStart = modelProjectMenuEnd;
    const schemeMenuEnd = projectContextBlock.indexOf("{!projectMenu.projectId && !projectMenu.schemeId && (", schemeMenuStart);
    const schemeMenuBlock = projectContextBlock.slice(schemeMenuStart, schemeMenuEnd);
    const expectOrderedLabels = (labels: string[]) => {
      let cursor = -1;
      for (const label of labels) {
        const index = projectContextBlock.indexOf(label, cursor + 1);
        expect(index).toBeGreaterThan(cursor);
        cursor = index;
      }
    };

    expect(projectPanelBlock).toContain("target?.closest(\".scheme-option, .project-option\")");
    expect(projectPanelBlock).toContain("setProjectMenu({ x: event.clientX, y: event.clientY })");
    expect(projectContextBlock).toContain("{projectMenu.projectId && (");
    expect(projectContextBlock).toContain("{!projectMenu.projectId && projectMenu.schemeId && (");
    expect(projectContextBlock).toContain("{!projectMenu.projectId && !projectMenu.schemeId && (");
    expect(projectContextBlock).toContain("{recordClipboard?.kind === \"project\" && projectMenu.projectId && (");
    expect(projectContextBlock).toContain("{recordClipboard?.kind === \"project\" && projectMenu.schemeId && (");
    expect(projectContextBlock).toContain("{recordClipboard?.kind === \"scheme\" && (");
    expect(projectContextBlock).toContain("className=\"context-menu-separator\"");
    expect(projectContextBlock).toContain("role=\"separator\"");
    expect(projectContextBlock).toContain("aria-label=\"方案操作和模型操作分隔\"");
    expect(projectContextBlock).toContain("createSchemeRecord");
    expect(projectContextBlock).toContain("createSchemeRecord(projectMenu.schemeId ?? \"\")");
    expect(projectContextBlock).toContain("openSchemeImportFilePicker(projectMenu.schemeId ?? \"\")");
    expect(projectContextBlock).toContain("pasteSchemeClipboardRecord(projectMenu.schemeId ?? \"\")");
    expect(projectContextBlock).toContain("createBlankProject(projectMenu.schemeId ?? \"\")");
    expect(modelProjectMenuBlock).not.toContain("openModelImportFilePicker");
    expect(modelProjectMenuBlock).not.toContain("模型导入");
    expect(schemeMenuBlock).toContain("openModelImportFilePicker(projectMenu.schemeId ?? \"\")");
    expect(schemeMenuBlock).toContain("模型导入");
    expectOrderedLabels(modelLabels);
    expectOrderedLabels(schemeLabels);
    expectOrderedLabels(blankLabels);
    expect(projectContextBlock).not.toContain("新增方案");
    expect(projectContextBlock).not.toContain("新增模型");
    expect(projectContextBlock).not.toContain(">复制<");
    expect(projectContextBlock).not.toContain(">粘贴<");
    expect(projectContextBlock).not.toContain(">重命名<");
    expect(projectContextBlock).not.toContain(">删除<");
    expect(projectContextBlock).not.toContain("disabled=");
    expect(sidePanelBlock).toContain("z-index: 70;");
    expect(contextMenuBlock).toContain("z-index: 80;");
  });

  test("keeps the left auto panel visible while project context menus are open", async () => {
    const source = await readAppSource();
    const visibilityStart = source.indexOf("const updateAutoPanelVisibility =");
    const visibilityEnd = source.indexOf("const activateInspectorFromCanvas", visibilityStart);
    const visibilityBlock = source.slice(visibilityStart, visibilityEnd);
    const hideStart = source.indexOf("const hideAutoPanelsFromWorkspace =");
    const hideEnd = source.indexOf("const interactiveStaticDrawingNeedsExplicitFinish", hideStart);
    const hideBlock = source.slice(hideStart, hideEnd);
    const projectContextStart = source.indexOf("{projectMenu && (");
    const projectContextEnd = source.indexOf("{pendingRecordPasteConflict && (", projectContextStart);
    const projectContextBlock = source.slice(projectContextStart, projectContextEnd);

    expect(projectContextBlock).toContain("<div className=\"context-menu\" style={contextMenuStyle(projectMenu)}>");
    expect(visibilityBlock).toContain("side === \"left\" && event === \"panel-leave\" && projectMenu");
    expect(hideBlock).toContain("if (projectMenu)");
  });

  test("does not auto-open the right inspector when it is not in auto mode", async () => {
    const source = await readAppSource();
    const activateStart = source.indexOf("const activateInspectorFromCanvas =");
    const activateEnd = source.indexOf("const openMeasurementEditorForNode", activateStart);
    const activateBlock = source.slice(activateStart, activateEnd);

    expect(activateStart).toBeGreaterThan(-1);
    expect(activateBlock).toContain("if (rightPanelMode !== \"auto\")");
    expect(activateBlock).toContain("return;");
    expect(activateBlock).toContain("updateAutoPanelVisibility(\"right\", \"canvas-activate\")");
  });

  test("prompts for overwrite rename or cancel when pasted scheme or model names already exist", async () => {
    const source = await readAppSource();
    const pasteStart = source.indexOf("const pasteSchemeClipboardRecord =");
    const pasteEnd = source.indexOf("const pasteSelectedRecord", pasteStart);
    const pasteBlock = source.slice(pasteStart, pasteEnd);
    const resolveStart = source.indexOf("const resolveRecordPasteConflict =");
    const resolveEnd = source.indexOf("const moveProjectRecordToScheme", resolveStart);
    const resolveBlock = source.slice(resolveStart, resolveEnd);
    const dialogStart = source.indexOf("{pendingRecordPasteConflict && (");
    const dialogEnd = source.indexOf("{pendingModelImportConflict && (", dialogStart);
    const dialogBlock = source.slice(dialogStart, dialogEnd);

    expect(source).toContain("type PendingRecordPasteConflict");
    expect(source).toContain("pendingRecordPasteConflict");
    expect(pasteBlock).toContain("setPendingRecordPasteConflict");
    expect(pasteBlock).toContain("duplicateScheme");
    expect(pasteBlock).toContain("duplicateProject");
    expect(pasteBlock).not.toContain("copySavedSchemeWithUniqueName(sourceScheme");
    expect(pasteBlock).not.toContain("copySavedProjectWithUniqueName(sourceProject");
    expect(resolveBlock).toContain("action: \"overwrite\" | \"rename\" | \"cancel\"");
    expect(resolveBlock).toContain("promptUniqueRecordName");
    expect(resolveBlock).toContain("请输入粘贴后的方案名称");
    expect(resolveBlock).toContain("请输入粘贴后的模型名称");
    expect(resolveBlock).toContain("setSchemes");
    expect(dialogBlock).toContain("名称重复</h2>");
    expect(dialogBlock).toContain("覆盖</button>");
    expect(dialogBlock).toContain("新命名</button>");
    expect(dialogBlock).toContain("取消粘贴");
  });

  test("prompts for overwrite rename or cancel when dragged model names already exist", async () => {
    const source = await readAppSource();
    const moveStart = source.indexOf("const moveProjectRecordToScheme =");
    const moveEnd = source.indexOf("const saveActiveProjectPointer", moveStart);
    const moveBlock = source.slice(moveStart, moveEnd);
    const visibilityStart = source.indexOf("const updateAutoPanelVisibility =");
    const visibilityEnd = source.indexOf("const activateInspectorFromCanvas", visibilityStart);
    const visibilityBlock = source.slice(visibilityStart, visibilityEnd);
    const hideStart = source.indexOf("const hideAutoPanelsFromWorkspace =");
    const hideEnd = source.indexOf("const interactiveStaticDrawingNeedsExplicitFinish", hideStart);
    const hideBlock = source.slice(hideStart, hideEnd);
    const projectPanelStart = source.indexOf("const renderProjectSchemeNode =");
    const projectPanelEnd = source.indexOf("const customDraftTerminalTypes", projectPanelStart);
    const projectPanelBlock = source.slice(projectPanelStart, projectPanelEnd);
    const resolveStart = source.indexOf("const resolveRecordPasteConflict =");
    const resolveEnd = source.indexOf("const moveProjectRecordToScheme", resolveStart);
    const resolveBlock = source.slice(resolveStart, resolveEnd);
    const dialogStart = source.indexOf("{pendingRecordPasteConflict && (");
    const dialogEnd = source.indexOf("{pendingModelImportConflict && (", dialogStart);
    const dialogBlock = source.slice(dialogStart, dialogEnd);

    expect(source).toContain("kind: \"project-drag\"");
    expect(source).toContain("const projectRecordDragActiveRef = useRef(false);");
    expect(source).toContain("const startProjectRecordDrag =");
    expect(source).toContain("const finishProjectRecordDrag =");
    expect(visibilityBlock).toContain("side === \"left\" && event === \"panel-leave\" && projectRecordDragActiveRef.current");
    expect(hideBlock).toContain("if (projectRecordDragActiveRef.current)");
    expect(projectPanelBlock).toContain("startProjectRecordDrag(event, project.id)");
    expect(projectPanelBlock).toContain("onDragEnd={finishProjectRecordDrag}");
    expect(projectPanelBlock).toContain("finishProjectRecordDrag();");
    expect(moveBlock).toContain("duplicateProject");
    expect(moveBlock).toContain("setPendingRecordPasteConflict");
    expect(moveBlock).toContain("commitProjectRecordMove");
    expect(resolveBlock).toContain("请输入拖拽后的模型名称");
    expect(resolveBlock).toContain("commitProjectRecordMove");
    expect(dialogBlock).toContain("取消拖拽");
  });

  test("supports dragging schemes under another scheme with conflict choices", async () => {
    const source = await readAppSource();
    const moveStart = source.indexOf("const moveSchemeRecordToScheme =");
    const moveEnd = source.indexOf("const saveActiveProjectPointer", moveStart);
    const moveBlock = source.slice(moveStart, moveEnd);
    const visibilityStart = source.indexOf("const updateAutoPanelVisibility =");
    const visibilityEnd = source.indexOf("const activateInspectorFromCanvas", visibilityStart);
    const visibilityBlock = source.slice(visibilityStart, visibilityEnd);
    const hideStart = source.indexOf("const hideAutoPanelsFromWorkspace =");
    const hideEnd = source.indexOf("const interactiveStaticDrawingNeedsExplicitFinish", hideStart);
    const hideBlock = source.slice(hideStart, hideEnd);
    const projectPanelStart = source.indexOf("const renderProjectSchemeNode =");
    const projectPanelEnd = source.indexOf("const customDraftTerminalTypes", projectPanelStart);
    const projectPanelBlock = source.slice(projectPanelStart, projectPanelEnd);
    const resolveStart = source.indexOf("const resolveRecordPasteConflict =");
    const resolveEnd = source.indexOf("const moveProjectRecordToScheme", resolveStart);
    const resolveBlock = source.slice(resolveStart, resolveEnd);
    const dialogStart = source.indexOf("{pendingRecordPasteConflict && (");
    const dialogEnd = source.indexOf("{pendingModelImportConflict && (", dialogStart);
    const dialogBlock = source.slice(dialogStart, dialogEnd);

    expect(source).toContain("moveSavedSchemeToParent");
    expect(source).toContain("kind: \"scheme-drag\"");
    expect(source).toContain("const schemeRecordDragActiveRef = useRef(false);");
    expect(source).toContain("const startSchemeRecordDrag =");
    expect(source).toContain("const finishSchemeRecordDrag =");
    expect(visibilityBlock).toContain("side === \"left\" && event === \"panel-leave\" && schemeRecordDragActiveRef.current");
    expect(hideBlock).toContain("if (schemeRecordDragActiveRef.current)");
    expect(projectPanelBlock).toContain("draggable={isEditMode}");
    expect(projectPanelBlock).toContain("startSchemeRecordDrag(event, scheme.id)");
    expect(projectPanelBlock).toContain("onDragEnd={finishSchemeRecordDrag}");
    expect(projectPanelBlock).toContain("finishSchemeRecordDrag();");
    expect(projectPanelBlock).toContain("application/scheme-id");
    expect(projectPanelBlock).toContain("moveSchemeRecordToScheme(schemeId, scheme.id)");
    expect(moveBlock).toContain("duplicateScheme");
    expect(moveBlock).toContain("setPendingRecordPasteConflict");
    expect(moveBlock).toContain("moveSavedSchemeToParent");
    expect(resolveBlock).toContain("请输入拖拽后的方案名称");
    expect(resolveBlock).toContain("moveSavedSchemeToParent");
    expect(dialogBlock).toContain("取消拖拽");
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
    expect(source).toContain("function findProjectRecordInSchemes(");
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
    expect(loadBlock).toContain("setViewBox(fitWholeCanvasViewBox(nextCanvasBounds, canvasFrameRef.current));");
    expect(loadBlock).toContain("setCanvasVisibleViewBox(canvasFullViewBoxFromBounds(nextCanvasBounds));");
    expect(loadBlock).not.toContain("setViewBox(normalizeViewBoxToCanvas({ x: 0, y: 0, ...nextCanvasBounds }, nextCanvasBounds));");
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
    const busSyncStart = source.indexOf("const pendingBusSyncNodeIds = pendingBusTerminalSyncNodeIdsRef.current;");
    const busSyncEnd = source.indexOf("const canvasBounds", busSyncStart);
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
    expect(source).not.toContain("draftAutosaveProjectId");
    expect(source).not.toContain("saveDraftProject(draftAutosaveProjectId");
    expect(busSyncBlock).toContain("suppressNextGraphDirtyRef.current = true");
  });

  test("saves the currently rendered connection routes instead of raw edge geometry", async () => {
    const source = await readAppSource();
    const projectStart = source.indexOf("const currentProject = ()");
    const projectEnd = source.indexOf("const currentGraphDirtyBaseline", projectStart);
    const projectBlock = source.slice(projectStart, projectEnd);

    expect(source).toContain("edgeWithSavedRouteGeometry");
    expect(projectBlock).toContain("const projectEdges = edges.map(edgeWithCurrentRouteGeometryForSave);");
    expect(projectBlock).toContain("layers,");
    expect(projectBlock).toContain("activeLayerId,");
    expect(projectBlock).toContain("backgroundLayerIds,");
    expect(projectBlock).toContain("groups: normalizeModelGroups(groups, nodes, projectEdges)");
    expect(projectBlock).toContain("edges: projectEdges");
    expect(projectBlock).not.toContain("groups: normalizeModelGroups(groups, nodes, edges)");
    expect(projectBlock).not.toContain("\n      edges\n");
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

  test("persists scheme and model list changes through single-record backend APIs", async () => {
    const source = await readAppSource();
    const setterStart = source.indexOf("const [schemes, setSchemesState] = useState<SavedSchemeRecord[]>(initialSavedSchemes);");
    const setterEnd = source.indexOf("const [activeProjectKey", setterStart);
    const setterBlock = source.slice(setterStart, setterEnd);
    const backendLoadStart = source.indexOf("const loadToken = ++backendSchemesLoadTokenRef.current;");
    const backendLoadEnd = source.indexOf("fetchBackendColorConfig()", backendLoadStart);
    const backendLoadBlock = source.slice(backendLoadStart, backendLoadEnd);
    const projectSaveStart = source.indexOf("async function saveBackendProjectRecord");
    const projectSaveEnd = source.indexOf("async function deleteBackendProjectRecord", projectSaveStart);
    const projectSaveBlock = source.slice(projectSaveStart, projectSaveEnd);
    const schemeSaveStart = source.indexOf("async function saveBackendSchemeRecord");
    const schemeSaveEnd = source.indexOf("async function deleteBackendSchemeRecord", schemeSaveStart);
    const schemeSaveBlock = source.slice(schemeSaveStart, schemeSaveEnd);
    const schemePersistStart = source.indexOf("const normalizedSchemesPayload = serializeSchemesForStorage(schemes);");
    const schemePersistEnd = source.indexOf("}, [schemes]);", schemePersistStart);
    const schemePersistBlock = source.slice(schemePersistStart, schemePersistEnd);
    const saveStart = source.indexOf("const saveCurrentProject =");
    const saveEnd = source.indexOf("const renameProjectRecord", saveStart);
    const saveBlock = source.slice(saveStart, saveEnd);

    expect(source).toContain("async function fetchBackendSchemes()");
    expect(source).toContain("\"/api/schemes\"");
    expect(source).toContain("async function saveBackendProjectRecord");
    expect(source).toContain("async function saveBackendSchemeRecord");
    expect(projectSaveBlock).toContain("\"/api/schemes/project\"");
    expect(schemeSaveBlock).toContain("\"/api/schemes/scheme\"");
    expect(source).not.toContain("saveBackendSchemesPayload");
    expect(source).not.toContain("persistBackendSchemesPayload");
    expect(source).not.toContain("pendingBackendSchemesPayloadRef");
    expect(source).not.toContain("backendJsonRequest(\"PUT\", `{\"schemes\":");
    expect(source).toContain("const backendSchemesLoadTokenRef = useRef(0)");
    expect(source).toContain("const schemesChangedBeforeBackendLoadRef = useRef(false)");
    expect(source).toContain("const latestActiveProjectPointerRef = useRef<ActiveProjectPointer | null>(null)");
    expect(source).toContain("const latestSchemesRef = useRef<SavedSchemeRecord[]>(initialSavedSchemes)");
    expect(source).toContain("latestActiveProjectPointerRef.current = activeProjectPointerPayload(schemes, activeProjectKey, activeSchemeKey);");
    expect(setterBlock).toContain("schemesChangedBeforeBackendLoadRef.current = true");
    expect(setterBlock).toContain("setSchemesState(value)");
    expect(backendLoadBlock).toContain("const localChangedBeforeBackendLoad = schemesChangedBeforeBackendLoadRef.current");
    expect(backendLoadBlock).toContain("const loadToken = ++backendSchemesLoadTokenRef.current");
    expect(backendLoadBlock).toContain("if (loadToken !== backendSchemesLoadTokenRef.current)");
    expect(backendLoadBlock).toContain("const currentSchemesPayload = serializeSchemesForStorage(latestSchemesRef.current)");
    expect(backendLoadBlock).toContain("const mergedSchemes = mergeSavedSchemesForStartup(latestSchemesRef.current, backendSchemes);");
    expect(backendLoadBlock).toContain("setSchemesState(mergedSchemes)");
    expect(backendLoadBlock).toContain("persistSchemeProjectsToBackend(mergedSchemes, \"启动合并方案/模型\")");
    expect(backendLoadBlock).toContain("const activePointer = latestActiveProjectPointerRef.current;");
    expect(backendLoadBlock).toContain("const backendActiveProject = findSavedProjectByActivePointer(mergedSchemes, activePointer);");
    expect(backendLoadBlock).toContain("loadSavedProject(backendActiveProject.project, backendActiveProject.scheme.id);");
    expect(source).toContain("const persistSchemesPayloadToStorageAndBackend = (normalizedSchemesPayload: string) => {");
    expect(source).toContain("window.localStorage.setItem(SCHEME_STORAGE_KEY, normalizedSchemesPayload)");
    expect(schemePersistBlock).toContain("suppressNextBackendSchemeSyncRef.current && normalizedSchemesPayload === lastPersistedSchemesPayloadRef.current");
    expect(schemePersistBlock).toContain("suppressNextBackendSchemeSyncRef.current = false;");
    expect(schemePersistBlock).toContain("persistSchemesPayloadToStorageAndBackend(normalizedSchemesPayload)");
    expect(schemePersistBlock).not.toContain("saveBackendProjectRecord(");
    expect(schemePersistBlock).not.toContain("saveBackendSchemeRecord(");
    expect(saveBlock).toContain("const projectSnapshot = currentProject();");
    expect(saveBlock).toContain("project: projectSnapshot,");
    expect(saveBlock).toContain("upsertSavedProjectInScheme(fallbackSchemes, resolvedSchemeId, record)");
    expect(saveBlock).toContain("setSchemes(nextSchemes);");
    expect(saveBlock).toContain("persistSchemesPayloadToStorageAndBackend(serializeSchemesForStorage(nextSchemes));");
    expect(saveBlock).toContain("saveBackendProjectRecord(");
    expect(saveBlock).not.toContain("updateProjectInSchemes(");
  });

  test("merges startup local scheme cache with backend schemes instead of overwriting either side", async () => {
    const source = await readAppSource();
    const backendLoadStart = source.indexOf("const loadToken = ++backendSchemesLoadTokenRef.current;");
    const backendLoadEnd = source.indexOf("fetchBackendColorConfig()", backendLoadStart);
    const backendLoadBlock = source.slice(backendLoadStart, backendLoadEnd);
    const initialStateStart = source.indexOf("const initialProjectSources = useMemo(() => {");
    const initialStateEnd = source.indexOf("const initialLayeredProject = useMemo", initialStateStart);
    const initialStateBlock = source.slice(initialStateStart, initialStateEnd);

    expect(initialStateBlock).toContain("const refreshRecovery = readRefreshRecoveryProject();");
    expect(initialStateBlock).toContain("draft: refreshRecovery ?? savedProjectDraft ?? readDraftProject()");
    expect(source).toContain("mergeSavedSchemesForStartup");
    expect(source).not.toContain("function shouldPreferLocalSchemesOverBackend");
    expect(backendLoadBlock).toContain("const mergedSchemes = mergeSavedSchemesForStartup(latestSchemesRef.current, backendSchemes);");
    expect(backendLoadBlock).toContain("setSchemesState(mergedSchemes)");
    expect(backendLoadBlock).toContain("persistSchemeProjectsToBackend(mergedSchemes, \"启动合并方案/模型\")");
    expect(backendLoadBlock).not.toContain("recoveredFromRefresh:");
    expect(source).not.toContain("startupRecoveredFromRefreshRef");
  });

  test("keeps unsaved page-refresh recovery separate from manual draft saving", async () => {
    const source = await readAppSource();
    const initialStateStart = source.indexOf("const initialProjectSources = useMemo(() => {");
    const initialStateEnd = source.indexOf("const initialLayeredProject = useMemo", initialStateStart);
    const initialStateBlock = source.slice(initialStateStart, initialStateEnd);
    const recoveryPersistStart = source.indexOf("const persistRefreshRecoveryNow = () => {");
    const recoveryPersistEnd = source.indexOf("useEffect(() => {\n    const handleBeforeUnload", recoveryPersistStart);
    const recoveryPersistBlock = source.slice(recoveryPersistStart, recoveryPersistEnd);
    const unloadStart = source.indexOf("const handleBeforeUnload = (event: BeforeUnloadEvent) => {");
    const unloadEnd = source.indexOf("window.addEventListener(\"beforeunload\"", unloadStart);
    const unloadBlock = source.slice(unloadStart, unloadEnd);
    const saveDraftStart = source.indexOf("const saveActiveProjectPointer =");
    const saveDraftEnd = source.indexOf("const setActiveLayer", saveDraftStart);
    const saveDraftBlock = source.slice(saveDraftStart, saveDraftEnd);

    expect(source).toContain('const REFRESH_RECOVERY_STORAGE_KEY = "power-system-refresh-recovery";');
    expect(source).toContain("function readRefreshRecoveryProject()");
    expect(source).toContain("function writeRefreshRecoveryProject(state: RefreshRecoveryProjectState)");
    expect(source).toContain("window.sessionStorage.setItem(REFRESH_RECOVERY_STORAGE_KEY");
    expect(source).toContain("window.sessionStorage.removeItem(REFRESH_RECOVERY_STORAGE_KEY)");
    expect(initialStateBlock).toContain("const refreshRecovery = readRefreshRecoveryProject();");
    expect(initialStateBlock).toContain("draft: refreshRecovery ?? savedProjectDraft ?? readDraftProject()");
    expect(initialStateBlock).toContain("readActiveProjectPointer()");
    expect(initialStateBlock).toContain("draftProjectFromSavedSchemes(initialSavedSchemes");
    expect(source).toContain("const [hasUnsavedChanges, setHasUnsavedChanges] = useState(() => initialProjectSources.recoveredFromRefresh);");
    expect(recoveryPersistBlock).toContain("if (!saveRequiredRef.current)");
    expect(recoveryPersistBlock).toContain("writeRefreshRecoveryProject(recoveryProject)");
    expect(unloadBlock).toContain("persistRefreshRecoveryNow();");
    expect(source).toContain('window.addEventListener("pagehide", persistRefreshRecoveryNow);');
    expect(source).toContain('window.addEventListener("vite:beforeFullReload", persistRefreshRecoveryNow);');
    expect(saveDraftBlock).not.toContain("REFRESH_RECOVERY_STORAGE_KEY");
    expect(saveDraftBlock).not.toContain("nodes");
    expect(saveDraftBlock).not.toContain("edges");
    expect(saveDraftBlock).not.toContain("groups");
    expect(source).not.toContain("window.localStorage.setItem(REFRESH_RECOVERY_STORAGE_KEY");
  });

  test("persists the active model pointer by scheme path and model name instead of ids", async () => {
    const source = await readAppSource();
    const pointerTypeStart = source.indexOf("type ActiveProjectPointer =");
    const pointerTypeEnd = source.indexOf("type RefreshRecoveryProjectState", pointerTypeStart);
    const pointerTypeBlock = source.slice(pointerTypeStart, pointerTypeEnd);
    const readPointerStart = source.indexOf("function readActiveProjectPointer");
    const readPointerEnd = source.indexOf("function draftProjectFromSavedSchemes", readPointerStart);
    const readPointerBlock = source.slice(readPointerStart, readPointerEnd);
    const savePointerStart = source.indexOf("const saveActiveProjectPointer =");
    const savePointerEnd = source.indexOf("const setActiveLayer", savePointerStart);
    const savePointerBlock = source.slice(savePointerStart, savePointerEnd);
    const activePointerEffectStart = source.indexOf("useEffect(() => {\n    const activePointerPayload");
    const activePointerEffectEnd = source.indexOf("useEffect(() => {\n    setExpandedSchemeIds", activePointerEffectStart);
    const activePointerEffectBlock = source.slice(activePointerEffectStart, activePointerEffectEnd);

    expect(source).not.toContain("activeProjectId");
    expect(source).not.toContain("activeSchemeId");
    expect(pointerTypeBlock).toContain("activeProjectName: string;");
    expect(pointerTypeBlock).toContain("activeSchemePath: string[];");
    expect(pointerTypeBlock).not.toContain("activeProjectKey");
    expect(pointerTypeBlock).not.toContain("activeSchemeKey");
    expect(readPointerBlock).toContain("activeProjectName");
    expect(readPointerBlock).toContain("activeSchemePath");
    expect(readPointerBlock).not.toContain("parsed.activeProjectKey");
    expect(readPointerBlock).not.toContain("parsed.activeSchemeKey");
    expect(source).toContain("function activeProjectPointerPayload(");
    expect(savePointerBlock).toContain("const pointerPayload = activeProjectPointerPayload(schemes, draftProjectId, draftSchemeId);");
    expect(savePointerBlock).toContain("window.localStorage.setItem(ACTIVE_PROJECT_STORAGE_KEY, JSON.stringify(pointerPayload ?? {}));");
    expect(activePointerEffectBlock).toContain("const activePointerPayload = activeProjectPointerPayload(schemes, activeProjectKey, activeSchemeKey);");
    expect(activePointerEffectBlock).toContain("JSON.stringify(activePointerPayload ?? {})");
    expect(savePointerBlock).not.toContain("activeProjectKey: draftProjectId");
    expect(activePointerEffectBlock).not.toContain("JSON.stringify({ activeProjectKey, activeSchemeKey })");
  });

  test("keeps model record and refresh recovery snapshots stable across viewport-only renders", async () => {
    const source = await readAppSource();
    const recordStart = source.indexOf("const currentModelRecord = useMemo<SavedProjectRecord>(() =>");
    const recordEnd = source.indexOf("saveRequiredRef.current = saveRequired;", recordStart);
    const recordBlock = source.slice(recordStart, recordEnd);
    const recoveryStart = source.indexOf("const refreshRecoveryProjectSnapshot = useMemo<RefreshRecoveryProjectState>(() =>");
    const recoveryEnd = source.indexOf("refreshRecoveryProjectRef.current = refreshRecoveryProjectSnapshot;", recoveryStart);
    const recoveryBlock = source.slice(recoveryStart, recoveryEnd);

    expect(recordBlock).toContain("selectedProjectRecord ?? activeProjectRecord");
    expect(recordBlock).toContain("updatedAt: new Date().toISOString()");
    expect(recordBlock).toContain("), [");
    expect(recoveryBlock).toContain("savedAt: new Date().toISOString()");
    expect(recoveryBlock).toContain("nodes,");
    expect(recoveryBlock).toContain("edges");
    expect(recoveryBlock).toContain("groups");
    expect(recoveryBlock).toContain("}), [");
    expect(recordBlock).not.toContain("viewBox");
    expect(recordBlock).not.toContain("canvasVisibleViewBox");
    expect(recoveryBlock).not.toContain("viewBox");
    expect(recoveryBlock).not.toContain("canvasVisibleViewBox");
  });

  test("normalizes duplicate model names from backend data before rendering and saving", async () => {
    const source = await readAppSource();
    const serverSource = await readServerSource();
    const normalizerStart = source.indexOf("function normalizeSavedSchemeIndexes");
    const normalizerEnd = source.indexOf("function readStoredSchemesPayload", normalizerStart);
    const normalizerBlock = source.slice(normalizerStart, normalizerEnd);
    const backendSerializerStart = source.indexOf("function normalizeSchemesForBackendRuntime");
    const backendSerializerEnd = source.indexOf("function normalizeSchemesForBackend", backendSerializerStart + 1);
    const backendSerializerBlock = source.slice(backendSerializerStart, backendSerializerEnd);
    const saveStart = source.indexOf("const saveCurrentProject =");
    const saveEnd = source.indexOf("const renameProjectRecord", saveStart);
    const saveBlock = source.slice(saveStart, saveEnd);
    const serverNormalizeStart = serverSource.indexOf("function normalizeSchemesForStorage");
    const serverNormalizeEnd = serverSource.indexOf("function inferESection", serverNormalizeStart);
    const serverNormalizeBlock = serverSource.slice(serverNormalizeStart, serverNormalizeEnd);
    const serverGetStart = serverSource.indexOf("[\"GET /api/schemes\"");
    const serverGetEnd = serverSource.indexOf("[\"PUT /api/schemes\"", serverGetStart);
    const serverGetBlock = serverSource.slice(serverGetStart, serverGetEnd);

    expect(source).toContain("normalizeSavedProjectRecordNames");
    expect(source).toContain("savedProjectRecordNameKey");
    expect(source).toContain("function findProjectRecordByNameInScheme");
    expect(normalizerBlock).toContain("normalizeSavedProjectRecordNames(scheme.projects.map(normalizeSavedProjectIndexes))");
    expect(normalizerBlock).toContain("scheme.children.map(normalizeSavedSchemeIndexes)");
    expect(backendSerializerBlock).toContain("projects: normalizeSavedProjectRecordNames(");
    expect(backendSerializerBlock).toContain("children: Array.isArray(scheme.children) ? normalizeSchemesForBackendRuntime(scheme.children) : []");
    expect(saveBlock).toContain("upsertSavedProjectInScheme(schemes, ownerScheme.id, record)");
    expect(saveBlock).toContain("const recoveredRecord = findProjectRecordByNameInScheme(targetScheme, projectName);");
    expect(saveBlock).toContain("setActiveProjectKey(savedRecord.id);");
    expect(saveBlock).toContain("saveActiveProjectPointer(savedRecord.id, resolvedSchemeId);");
    expect(saveBlock).not.toContain("projects: scheme.projects.map((project) => (project.id === targetId ? record : project))");
    expect(serverSource).toContain("normalizeSchemeProjectRecordNamesForStorage");
    expect(serverSource).toContain("function storageProjectNameKey");
    expect(serverNormalizeBlock).toContain("normalizeSchemeProjectRecordNamesForStorage(");
    expect(serverNormalizeBlock).toContain("children: Array.isArray(scheme.children) ? normalizeSchemesForStorage(scheme.children) : []");
    expect(serverGetBlock).toContain("normalizeSchemesForStorage(await readSchemes())");
  });

  test("defers expensive background page routing until after first-screen rendering", async () => {
    const source = await readAppSource();
    const effectStart = source.indexOf("useEffect(() => {\n    if (!backgroundProjectId");
    const effectEnd = source.indexOf("const backgroundPageFrameRender = useMemo", effectStart);
    const effectBlock = source.slice(effectStart, effectEnd);
    const frameStart = source.indexOf("const backgroundPageFrameRender = useMemo");
    const frameEnd = source.indexOf("const backgroundPageRender = useMemo", frameStart);
    const frameBlock = source.slice(frameStart, frameEnd);
    const renderStart = source.indexOf("const backgroundPageRender = useMemo");
    const renderEnd = source.indexOf("const beginReadonlyBackgroundStaticButtonPointerFeedback", renderStart);
    const renderBlock = source.slice(renderStart, renderEnd);

    expect(source).toContain("const [backgroundPageRenderReady, setBackgroundPageRenderReady] = useState(false);");
    expect(effectBlock).toContain("setBackgroundPageRenderReady(false);");
    expect(effectBlock).toContain("return scheduleIdleWork(() => setBackgroundPageRenderReady(true)");
    expect(frameBlock).toContain("backgroundPageFrameRender");
    expect(frameBlock).not.toContain("filterProjectByVisibleLayers");
    expect(frameBlock).not.toContain("routeEdgesForSavedPathRendering");
    expect(renderBlock).toContain("if (!backgroundPageFrameRender || !backgroundPageRenderReady)");
    expect(renderBlock).toContain("routeEdgesForSavedPathRendering(backgroundNodes, backgroundEdges, backgroundPageFrameRender.backgroundBounds");
  });

  test("persists custom device library definitions through the backend", async () => {
    const source = await readAppSource();
    const serverSource = await readServerSource();

    expect(source).toContain("fetchBackendDeviceLibrary");
    expect(source).toContain("saveBackendDeviceLibraryPayload");
    expect(source).toContain("fetchBackendJson<BackendDeviceLibraryResponse>");
    expect(source).toContain('"/api/device-library"');
    expect(source).toContain("backendDeviceLibraryLoadedRef");
    expect(source).toContain("lastPersistedDeviceLibraryPayloadRef");
    expect(source).toContain("CUSTOM_DEVICE_LIBRARY_STORAGE_KEY");
    expect(source).toContain("CUSTOM_ATTRIBUTE_LIBRARIES_STORAGE_KEY");
    expect(source).toContain("CUSTOM_COMPONENT_TYPES_STORAGE_KEY");
    expect(source).toContain("DEVICE_DEFINITION_OVERRIDES_STORAGE_KEY");

    expect(serverSource).toContain('const deviceLibraryDataDir = resolve(repoRoot, "data", "device-library");');
    expect(serverSource).toContain('const deviceLibraryPath = join(deviceLibraryDataDir, "library.json");');
    expect(serverSource).toContain("readDeviceLibraryConfig");
    expect(serverSource).toContain("writeDeviceLibraryConfig");
    expect(serverSource).toContain("[\"GET /api/device-library\"");
    expect(serverSource).toContain("[\"PUT /api/device-library\"");
  });

  test("exposes dynamic measurement configuration and per-device measurement operations", async () => {
    const source = await readAppSource();
    const serverSource = await readServerSource();
    const styles = await readStyles();
    const modelPanelStart = source.indexOf("{inspectorTab === \"model\" && currentModelRecord");
    const modelPanelEnd = source.indexOf(") : inspectorTab === \"graph\"", modelPanelStart);
    const modelPanelBlock = source.slice(modelPanelStart, modelPanelEnd);
    const libraryPanelStart = source.indexOf("const renderLibraryPanel = () => (");
    const libraryPanelEnd = source.indexOf("const renderElementTreePanel", libraryPanelStart);
    const libraryPanelBlock = source.slice(libraryPanelStart, libraryPanelEnd);
    const libraryDefinitionActionsStart = source.indexOf("const renderLibraryDefinitionActions = () => (");
    const libraryDefinitionActionsEnd = source.indexOf("const renderGraphTemplatePreview", libraryDefinitionActionsStart);
    const libraryDefinitionActionsBlock = source.slice(libraryDefinitionActionsStart, libraryDefinitionActionsEnd);
    const selectedPanelStart = source.indexOf("{!isStaticNode(inspectorSelectedNode) && (");
    const selectedPanelEnd = source.indexOf("{isStaticNode(inspectorSelectedNode) && (", selectedPanelStart);
    const selectedPanelBlock = source.slice(selectedPanelStart, selectedPanelEnd);
    const selectedMeasurementTableStart = source.indexOf("const renderSelectedNodeMeasurementTable = (node: ModelNode)");
    const selectedMeasurementTableEnd = source.indexOf("const renderMeasurementConfigDialog = () =>", selectedMeasurementTableStart);
    const selectedMeasurementTableBlock = source.slice(selectedMeasurementTableStart, selectedMeasurementTableEnd);
    const devicePanelStart = source.indexOf('<div className="device-param-stack">');
    const devicePanelEnd = source.indexOf("{inspectorSelectedNode && inspectorTab === \"graph\" && (", devicePanelStart);
    const devicePanelBlock = source.slice(devicePanelStart, devicePanelEnd);
    const contextMeasurementMenuStart = source.indexOf("{isEditMode && contextMeasurementNode && !isStaticNode(contextMeasurementNode) && (");
    const contextMeasurementMenuEnd = source.indexOf("{contextMenuForNode && activeSelectedNodeIds.length > 0 && (", contextMeasurementMenuStart);
    const contextMeasurementMenuBlock = source.slice(contextMeasurementMenuStart, contextMeasurementMenuEnd);
    const measurementEditorStart = source.indexOf("const openMeasurementEditorForNode = (node: ModelNode) => {");
    const measurementEditorEnd = source.indexOf("const hideAutoPanelsFromWorkspace", measurementEditorStart);
    const measurementEditorBlock = source.slice(measurementEditorStart, measurementEditorEnd);
    const measurementConfigDialogStart = source.indexOf("const renderMeasurementConfigDialog = () =>");
    const measurementConfigDialogEnd = source.indexOf("const renderMeasurementEditorDialog = () =>", measurementConfigDialogStart);
    const measurementConfigDialogBlock = source.slice(measurementConfigDialogStart, measurementConfigDialogEnd);
    const serverMeasurementNormalizerStart = serverSource.indexOf("function normalizeMeasurementConfig(payload)");
    const serverMeasurementNormalizerEnd = serverSource.indexOf("async function readMeasurementConfig", serverMeasurementNormalizerStart);
    const serverMeasurementNormalizerBlock = serverSource.slice(serverMeasurementNormalizerStart, serverMeasurementNormalizerEnd);
    const canvasStart = source.indexOf("className={`diagram-canvas");
    const canvasEnd = source.indexOf("{selectedRoutedEdge &&", canvasStart);
    const canvasBlock = source.slice(canvasStart, canvasEnd);
    const graphToolbarBlock = cssRuleBlock(styles, ".graph-info-toolbar {");
    const graphToolbarButtonBlock = cssRuleBlock(styles, ".graph-info-toolbar button {");
    const graphToolbarActiveBlock = cssRuleBlock(styles, ".graph-info-toolbar button.active {");
    const deviceInfoTabsBlock = cssRuleBlock(styles, ".device-info-tabs {");
    const deviceInfoTabsButtonBlock = cssRuleBlock(styles, ".device-info-tabs button {");
    const deviceInfoTabsActiveBlock = cssRuleBlock(styles, ".device-info-tabs button.active {");

    expect(source).toContain("MEASUREMENT_CONFIG_STORAGE_KEY");
    expect(source).toContain('"/api/measurement-config"');
    expect(source).toContain("backendMeasurementConfigLoadedRef");
    expect(source).toContain("lastPersistedMeasurementConfigPayloadRef");
    expect(source).toContain("const [measurementConfig, setMeasurementConfig]");
    expect(source).toContain("const [measurementConfigDraft, setMeasurementConfigDraft]");
    expect(source).toContain("const measurementConfigDraftRef = useRef<PlatformMeasurementConfig | null>(null);");
    expect(source).toContain("const [projectMeasurements, setProjectMeasurements]");
    expect(source).toContain("const [measurementConfigDialogOpen, setMeasurementConfigDialogOpen]");
    expect(source).toContain("const [measurementEditorDialog, setMeasurementEditorDialog]");
    expect(source).toContain("createDefaultMeasurementGroupsForNode");
    expect(source).toContain("measurementGroupsForNode");
    expect(source).toContain("measurementProfileItemsForNodePosition");
    expect(source).toContain("measurementTypeOptionsForMeasurementGroup");
    expect(source).toContain("addMeasurementProfileItem");
    expect(source).toContain("updateMeasurementProfileItem");
    expect(source).toContain("moveMeasurementProfileItem");
    expect(source).toContain("deleteMeasurementProfileItem");
    expect(source).toContain("openMeasurementConfigDialog");
    expect(source).toContain("closeMeasurementConfigDialog");
    expect(source).toContain("saveMeasurementConfigDialog");
    expect(source).toContain("const currentMeasurementConfig = measurementConfigDraftRef.current ?? measurementConfigDraft ?? measurementConfig;");
    expect(source).toContain("normalizeMeasurementConfig(measurementConfigDraftRef.current ?? measurementConfigDraft ?? measurementConfig)");
    expect(source).toContain("const selectedMeasurementGroups = useMemo");
    expect(source).toContain("selectedMeasurementGroups.length");
    expect(source).toContain("buildMeasurementGroupsMarkup");
    expect(source).toContain("group.terminalId");
    expect(source).toContain("getTerminalPoint(node, group.terminalId)");
    expect(source).toContain('const [selectedDeviceInfoView, setSelectedDeviceInfoView] = useState<"model" | "measurement">("model");');
    expect(source).toContain("量测类型");
    expect(measurementConfigDialogBlock).toContain("新增量测类型");
    expect(measurementConfigDialogBlock).toContain("measurement-table");
    expect(measurementConfigDialogBlock).not.toContain("设备绑定");
    expect(measurementConfigDialogBlock).not.toContain("measurementConfigTab");
    expect(measurementConfigDialogBlock).not.toContain("measurement-profile-table");
    expect(measurementConfigDialogBlock).not.toContain("量测位置");
    expect(measurementConfigDialogBlock).not.toContain("设备层");
    expect(measurementConfigDialogBlock).not.toContain("端子层");
    expect(measurementConfigDialogBlock).not.toContain("全部端子层");
    expect(measurementConfigDialogBlock).not.toContain("all-terminals");
    expect(measurementConfigDialogBlock).not.toContain("添加量测");
    expect(measurementConfigDialogBlock).not.toContain("上移");
    expect(measurementConfigDialogBlock).not.toContain("下移");
    expect(measurementConfigDialogBlock).toContain("保存");
    expect(measurementConfigDialogBlock).toContain("取消");
    expect(measurementConfigDialogBlock).toContain("measurementConfigDraft");
    expect(measurementConfigDialogBlock).toContain("saveMeasurementConfigDialog");
    expect(measurementConfigDialogBlock).not.toContain("setMeasurementConfigDialogOpen(false)");
    expect(measurementConfigDialogBlock).not.toContain("measurement-profile-grid");
    expect(measurementConfigDialogBlock).not.toContain("measurement-profile-option");
    expect(measurementConfigDialogBlock).not.toContain("toggleMeasurementProfileType");
    expect(modelPanelBlock).not.toContain("配置量测类型/设备绑定");
    expect(libraryDefinitionActionsBlock).toContain("measurement-config-open-button");
    expect(libraryDefinitionActionsBlock).toContain("量测定义");
    expect(libraryDefinitionActionsBlock).toContain("新建元件");
    expect(libraryDefinitionActionsBlock).toContain("修改元件");
    expect(libraryPanelBlock).not.toContain("library-measurement-config-actions");
    expect(libraryPanelBlock).not.toContain("配置量测类型");
    expect(libraryPanelBlock).not.toContain("配置量测类型/设备绑定");
    expect(selectedPanelBlock).not.toContain('className="selected-node-info-tabs"');
    expect(selectedPanelBlock).not.toContain("设备表格内容切换");
    expect(selectedPanelBlock).not.toContain("selectedDeviceInfoView");
    expect(selectedPanelBlock).not.toContain("renderSelectedNodeMeasurementTable(inspectorSelectedNode)");
    expect(source).toContain('renderChineseParamHeader("graph_x", "X坐标")');
    expect(selectedPanelBlock).toContain('renderChineseParamHeader("_labelDisplayMode")');
    expect(devicePanelBlock).toContain('className="device-info-tabs"');
    expect(devicePanelBlock).toContain('aria-label="图元属性分类"');
    expect(devicePanelBlock).toContain("图形");
    expect(devicePanelBlock).toContain("模型");
    expect(devicePanelBlock).toContain("量测");
    expect(devicePanelBlock).toContain('selectedDeviceInfoView === "model"');
    expect(devicePanelBlock).toContain('selectedDeviceInfoView === "measurement"');
    expect(devicePanelBlock).toContain("renderSelectedNodeMeasurementTable(inspectorSelectedNode)");
    expect(deviceInfoTabsBlock).toContain("display: flex;");
    expect(deviceInfoTabsBlock).toContain("gap: 3px;");
    expect(deviceInfoTabsBlock).toContain("padding: 0 0 8px 12px;");
    expect(deviceInfoTabsButtonBlock).toContain("width: auto;");
    expect(deviceInfoTabsButtonBlock).toContain("min-width: 48px;");
    expect(deviceInfoTabsButtonBlock).toContain("height: 24px;");
    expect(deviceInfoTabsButtonBlock).toContain("border: 1px solid transparent;");
    expect(deviceInfoTabsButtonBlock).toContain("background: #f8fafc;");
    expect(deviceInfoTabsActiveBlock).toContain("color: #1f2937;");
    expect(deviceInfoTabsActiveBlock).toContain("border-color: #3f8f96;");
    expect(deviceInfoTabsActiveBlock).toContain("background: #d7eeee;");
    expect(deviceInfoTabsBlock).toBe(graphToolbarBlock.replace(".graph-info-toolbar", ".device-info-tabs"));
    expect(deviceInfoTabsButtonBlock).toBe(graphToolbarButtonBlock.replace(".graph-info-toolbar", ".device-info-tabs"));
    expect(deviceInfoTabsActiveBlock).toBe(graphToolbarActiveBlock.replace(".graph-info-toolbar", ".device-info-tabs"));
    expect(source).toContain("const renderSelectedNodeMeasurementTable = (node: ModelNode)");
    expect(source).toContain("动态量测");
    expect(source).toContain("添加默认量测");
    expect(source).toContain("添加量测项");
    expect(selectedMeasurementTableBlock).toContain("selectedMeasurementGroups.map(renderGroupRows)");
    expect(selectedMeasurementTableBlock).toContain("const selectedMeasurementGroupCommonDraft = selectedMeasurementGroups[0];");
    expect(selectedMeasurementTableBlock).toContain("const renderCommonMeasurementGroupRows = () =>");
    expect(selectedMeasurementTableBlock).toContain("updateSelectedMeasurementGroups");
    expect(selectedMeasurementTableBlock).toContain("terminal?.label");
    expect(selectedMeasurementTableBlock).toContain("addMeasurementItemToGroup(node, group)");
    expect(selectedMeasurementTableBlock).toContain("measurementTypeOptionsForMeasurementGroup(node, group)");
    expect(selectedMeasurementTableBlock).toContain("renderCommonMeasurementGroupRows()");
    expect(selectedMeasurementTableBlock).toContain("<th>背景显示</th>");
    expect(selectedMeasurementTableBlock).toContain("<th>背景颜色</th>");
    expect(selectedMeasurementTableBlock).toContain("<th>边框样式</th>");
    expect(selectedMeasurementTableBlock).toContain("<th>边框颜色</th>");
    expect(selectedMeasurementTableBlock).toContain("<th>边框宽度</th>");
    expect(selectedMeasurementTableBlock).toContain('aria-label="量测组背景颜色"');
    expect(selectedMeasurementTableBlock).toContain('aria-label="量测组边框颜色"');
    const commonMeasurementRowsStart = selectedMeasurementTableBlock.indexOf("const renderCommonMeasurementGroupRows = () =>");
    const commonMeasurementRowsEnd = selectedMeasurementTableBlock.indexOf("const renderGroupRows =", commonMeasurementRowsStart);
    const commonMeasurementRowsBlock = selectedMeasurementTableBlock.slice(commonMeasurementRowsStart, commonMeasurementRowsEnd);
    const renderGroupRowsStart = selectedMeasurementTableBlock.indexOf("const renderGroupRows =");
    const renderGroupRowsEnd = selectedMeasurementTableBlock.indexOf("return (", renderGroupRowsStart);
    const renderGroupRowsBlock = selectedMeasurementTableBlock.slice(renderGroupRowsStart, renderGroupRowsEnd);
    expect(commonMeasurementRowsBlock).toContain("<th>量测显示</th>");
    expect(commonMeasurementRowsBlock).toContain("<th>量测布局</th>");
    expect(commonMeasurementRowsBlock).toContain("<th>标签显示</th>");
    expect(commonMeasurementRowsBlock).toContain("<th>单位显示</th>");
    expect(commonMeasurementRowsBlock).toContain("<th>背景显示</th>");
    expect(commonMeasurementRowsBlock).toContain("<th>背景颜色</th>");
    expect(commonMeasurementRowsBlock).toContain("<th>边框样式</th>");
    expect(commonMeasurementRowsBlock).toContain("<th>边框颜色</th>");
    expect(commonMeasurementRowsBlock).toContain("<th>边框宽度</th>");
    expect(renderGroupRowsBlock).not.toContain("<th>量测显示</th>");
    expect(renderGroupRowsBlock).not.toContain("<th>量测布局</th>");
    expect(renderGroupRowsBlock).not.toContain("<th>背景显示</th>");
    expect(renderGroupRowsBlock).not.toContain("<th>边框宽度</th>");
    expect(contextMeasurementMenuBlock).toContain("量测显示");
    expect(contextMeasurementMenuBlock).toContain("添加量测");
    expect(contextMeasurementMenuBlock).toContain("修改量测");
    expect(contextMeasurementMenuBlock).toContain("删除量测");
    expect(contextMeasurementMenuBlock).toContain("openMeasurementEditorForNode");
    expect(contextMeasurementMenuBlock).toContain("disabled={Boolean(contextMeasurementGroup)}");
    expect(contextMeasurementMenuBlock.match(/disabled=\{!contextMeasurementGroup\}/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
    expect(contextMeasurementMenuBlock).not.toContain("动态量测");
    expect(contextMeasurementMenuBlock).not.toContain("添加量测项");
    expect(contextMeasurementMenuBlock).not.toContain("添加/重置默认量测");
    expect(contextMeasurementMenuBlock).not.toContain("配置量测库");
    expect(measurementEditorBlock).toContain("setMeasurementEditorDialog");
    expect(measurementEditorBlock).toContain("measurementGroupsForNode(projectMeasurements, node.id)");
    expect(source).toContain("drafts: MeasurementGroup[];");
    expect(source).toContain("current.groups.filter((group) => group.nodeId !== node.id)");
    expect(source).toContain("const measurementEditorRows =");
    expect(source).toContain("updateMeasurementEditorGroupSettings");
    expect(source).toContain("updateMeasurementEditorDraftItemPosition");
    expect(source).toContain("<option value=\"\">设备层</option>");
    expect(source).toContain("terminal.label || `端子${terminalIndex + 1}`");
    expect(source).toContain("<th>量测名称</th>");
    expect(source).toContain("<th>量测位置</th>");
    expect(source).toContain("measurementEditorItemName(item)");
    expect(source).toContain("duplicateMeasurementEditorItemNames");
    expect(source).toContain("同一个设备下量测名称不能重复");
    expect(source).toContain("name: event.target.value");
    expect(source).toContain("name: measurementEditorItemName(item)");
    expect(source).toContain("onChange={(event) => updateMeasurementEditorDraftItemPosition(node, row.groupId, item.id, event.target.value)}");
    expect(source).not.toContain("measurement-editor-groups");
    expect(source).not.toContain("新增量测组");
    expect(source).not.toContain("删除量测组");
    expect(source).not.toContain("setActiveMeasurementEditorGroup");
    expect(source).not.toContain("measurement-editor-readonly-value");
    expect(measurementEditorBlock).not.toContain("setSelectedDeviceInfoView(\"measurement\")");
    expect(source).toContain("const cloneMeasurementGroupForDraft = (group: MeasurementGroup): MeasurementGroup");
    expect(source).toContain("const renderMeasurementEditorDialog = () =>");
    expect(source).toContain("measurement-editor-dialog");
    expect(source).toContain("measurement-editor-table");
    expect(source).toContain("labelVisible");
    expect(source).toContain("unitVisible");
    expect(source).toContain("<span>标签显示</span>");
    expect(source).toContain("<span>单位显示</span>");
    expect(source).toContain('aria-label="量测标签显示"');
    expect(source).toContain('aria-label="量测单位显示"');
    expect(source).toContain("addMeasurementEditorDraftItem");
    expect(source).toContain("moveMeasurementEditorDraftItem");
    expect(source).toContain("removeMeasurementEditorDraftItem");
    expect(source).toContain("添加一行量测");
    expect(source).toContain("上移");
    expect(source).toContain("下移");
    expect(source).toContain("<span>背景显示</span>");
    expect(source).toContain("<span>背景颜色</span>");
    expect(source).toContain("透明");
    expect(source).toContain("<span>边框颜色</span>");
    expect(source).toContain("<span>边框样式</span>");
    expect(source).toContain("<span>边框宽度</span>");
    expect(source).toContain("无边框");
    expect(source).toContain("measurementGroupBackgroundColor(group)");
    expect(source).toContain("measurementGroupBorderColor(group)");
    expect(source).toContain("measurementGroupBorderWidth(group)");
    expect(source).toContain("measurementGroupBorderDashArray(group)");
    expect(source).toContain('fill="${escapeXml(measurementGroupBackgroundColor(group))}"');
    expect(source).toContain('stroke="${escapeXml(measurementGroupBorderColor(group))}"');
    expect(source).toContain('stroke-width="${formatSvgNumber(measurementGroupBorderWidth(group))}"');
    expect(source).toContain('strokeDasharray={measurementGroupBorderDashArray(group)}');
    expect(source).not.toContain("<span>X偏移</span>");
    expect(source).not.toContain("<span>Y偏移</span>");
    expect(source).not.toContain('aria-label="量测X偏移"');
    expect(source).not.toContain('aria-label="量测Y偏移"');
    expect(styles).not.toContain(".measurement-offset-editor");
    expect(source).toContain('group.labelVisible === false ? "" : display.label');
    expect(source).toContain('group.unitVisible === false ? "" : display.unit');
    expect(source).toContain("measurementFontScaleForNode(node)");
    expect(source).toContain("fontSize: display.fontSize * measurementFontScale");
    expect(source).toContain("row.fontSize");
    expect(source).toContain("measurementOffsetScaleForNode(node)");
    expect(source).toContain("measurementGroupLocalOffset(node, group)");
    expect(source).toContain("(point.x - measurementDrag.startPoint.x) / offsetScale.x");
    expect(source).toContain("(point.y - measurementDrag.startPoint.y) / offsetScale.y");
    expect(source).toContain("confirmMeasurementEditorDialog");
    expect(source).toContain("修改量测信息");
    expect(canvasBlock).toContain("measurement-layer");
    expect(canvasBlock).toContain("renderMeasurementGroup");
    expect(source).toContain("beginMeasurementDrag");
    expect(source).toContain("measurements: projectMeasurements");
    expect(styles).toContain(".measurement-layer");
    expect(styles).toContain(".measurement-config-dialog");
    expect(styles).toContain(".measurement-config-actions");
    expect(styles).toContain(".measurement-config-status");
    expect(styles).toContain(".measurement-editor-dialog");
    expect(styles).toContain(".measurement-editor-table");
    expect(styles).toContain("dialog-table-browse-controls");
    expect(styles).toContain("dialog-table-column-resize");
    expect(styles).toContain(".measurement-config-dialog .measurement-table th,");
    expect(styles).toContain(".custom-device-dialog .custom-param-table th");
    expect(styles).toContain("resize: horizontal;");
    expect(styles).toContain("min-width: 72px;");
    expect(styles).toContain("popup-table-borderless-wrap");
    expect(styles).toContain(".measurement-editor-table-wrap,");
    expect(styles).toContain("border-color: transparent;");
    expect(styles).toContain("border-radius: 0;");
    expect(styles).toContain(".measurement-editor-table input,");
    expect(styles).toContain(".measurement-config-dialog .measurement-table input,");
    expect(styles).toContain(".device-definition-dialog .measurement-table input,");
    expect(styles).toContain("border-color: transparent;");
    expect(styles).toContain("background: transparent;");
    expect(styles).toContain(".measurement-editor-table input:focus-visible,");
    expect(styles).toContain(".measurement-sidebar-actions");
    expect(styles).toContain(".device-info-tabs");
    expect(styles).toContain("grid-template-columns: repeat(3, minmax(0, 1fr));");
    expect(styles).toContain("height: 30px;");
    expect(styles).toContain("white-space: nowrap;");
    expect(serverSource).toContain('const measurementConfigPath = join(settingsDataDir, "measurement-config.json");');
    expect(serverSource).toContain("readMeasurementConfig");
    expect(serverSource).toContain("writeMeasurementConfig");
    expect(serverMeasurementNormalizerBlock).toContain("name: item.name");
    expect(serverMeasurementNormalizerBlock).toContain("position: item.position");
    expect(serverSource).toContain("[\"GET /api/measurement-config\"");
    expect(serverSource).toContain("[\"PUT /api/measurement-config\"");
  });

  test("keeps device measurement groups attached to node drag previews", async () => {
    const source = await readAppSource();
    const singlePreviewStart = source.indexOf("const buildSingleNodeDragPreviewNodeMarkup");
    const singlePreviewEnd = source.indexOf("const clearImperativeNodeDragEdgePreview", singlePreviewStart);
    const singlePreviewBlock = source.slice(singlePreviewStart, singlePreviewEnd);
    const multiPreviewStart = source.indexOf("const buildMultiNodeDragOverlayPreview");
    const multiPreviewEnd = source.indexOf("const renderMultiNodeDragOverlay", multiPreviewStart);
    const multiPreviewBlock = source.slice(multiPreviewStart, multiPreviewEnd);
    const renderStart = source.indexOf("const renderMeasurementGroup =");
    const renderEnd = source.indexOf("const resizeSizeHint", renderStart);
    const renderBlock = source.slice(renderStart, renderEnd);

    expect(source).toContain("const buildMeasurementGroupMarkup");
    expect(source).toContain("function exportMeasurementGroupMetadataAttributes");
    expect(source).toContain("function exportMeasurementItemMetadataAttributes");
    expect(source).toContain('data-export-measurement-name="${escapeXml(measurementName)}"');
    expect(source).toContain('data-export-measurement-source-point="${escapeXml(item.sourcePoint)}"');
    expect(singlePreviewBlock).toContain("buildMeasurementGroupsMarkup(node)");
    expect(singlePreviewBlock).toContain("${measurementMarkup}");
    expect(multiPreviewBlock).toContain("buildMeasurementGroupsMarkup(previewNode, { absolute: true })");
    expect(multiPreviewBlock).toContain("${measurementMarkup}");
    expect(renderBlock).toContain("measurementGroupCanvasPosition(node, group)");
    expect(renderBlock).toContain("data-export-measurement-group-id={group.id}");
    expect(renderBlock).toContain("data-export-measurement-item-id={row.item.id}");
    expect(renderBlock).toContain("data-export-device-idx={node.params.idx ?? \"\"}");
  });

  test("uses node icon images in drawing and drag ghost previews", async () => {
    const source = await readAppSource();
    const previewContentStart = source.indexOf("const renderNodePreviewImageContent = (");
    const previewContentEnd = source.indexOf("const buildNodePreviewImageMarkup = (", previewContentStart);
    const previewContentBlock = source.slice(previewContentStart, previewContentEnd);
    const previewMarkupStart = previewContentEnd;
    const previewMarkupEnd = source.indexOf("const canvasBackgroundImageUrl", previewMarkupStart);
    const previewMarkupBlock = source.slice(previewMarkupStart, previewMarkupEnd);
    const placementPreviewStart = source.indexOf("const renderLibraryPlacementPreview = () => {");
    const placementPreviewEnd = source.indexOf("const startSidePanelResize", placementPreviewStart);
    const placementPreviewBlock = source.slice(placementPreviewStart, placementPreviewEnd);
    const singlePreviewStart = source.indexOf("const buildSingleNodeDragPreviewNodeMarkup");
    const singlePreviewEnd = source.indexOf("const clearImperativeNodeDragEdgePreview", singlePreviewStart);
    const singlePreviewBlock = source.slice(singlePreviewStart, singlePreviewEnd);
    const multiPreviewStart = source.indexOf("const buildMultiNodeDragOverlayPreview");
    const multiPreviewEnd = source.indexOf("const renderMultiNodeDragOverlay", multiPreviewStart);
    const multiPreviewBlock = source.slice(multiPreviewStart, multiPreviewEnd);
    const rotateGhostStart = source.indexOf("const renderSingleTransformRotateOriginGhost");
    const rotateGhostEnd = source.indexOf("const renderTransformRotationTrajectory", rotateGhostStart);
    const rotateGhostBlock = source.slice(rotateGhostStart, rotateGhostEnd);
    const dragGhostStart = source.indexOf("{dragging?.historyCaptured && !multiNodeDragging");
    const dragGhostEnd = source.indexOf("{renderViewportRoutedEdges.map", dragGhostStart);
    const dragGhostBlock = source.slice(dragGhostStart, dragGhostEnd);

    expect(source).toContain("const renderNodePreviewImageContent = (");
    expect(source).toContain("const buildNodePreviewImageMarkup = (");
    expect(source).toContain("function nodeImageContentTransform(node: ModelNode) {");
    expect(source).toContain("return nodeGeometryTransform(node);");
    expect(previewContentBlock).toContain("transform={nodeImageContentTransform(node)}");
    expect(previewMarkupBlock).toContain("transform=\"${escapeXml(nodeImageContentTransform(node))}\"");
    expect(placementPreviewBlock).toContain("renderNodePreviewImageContent(previewNode");
    expect(placementPreviewBlock).toContain("renderNodePreviewImageContent(node");
    expect(singlePreviewBlock).toContain("buildNodePreviewImageMarkup(node, `single-node-drag-preview-clip-${node.id}`);");
    expect(singlePreviewBlock).toContain("const imageMarkup = buildNodePreviewImageMarkup(node, `single-node-drag-preview-clip-${node.id}`);");
    expect(singlePreviewBlock).toContain("${imageMarkup}");
    expect(multiPreviewBlock).toContain("buildNodePreviewImageMarkup(node, `multi-node-drag-lite-preview-clip-${node.id}`, { clip: false })");
    expect(dragGhostBlock).toContain("renderNodePreviewImageContent(ghostNode");
    expect(rotateGhostBlock).toContain("renderNodePreviewImageContent(ghostNode");
  });

  test("edits template icons and terminal anchors from the device definition dialog", async () => {
    const source = await readAppSource();
    const styles = await readStyles();
    const dialogStart = source.indexOf("{deviceDefinitionDialogOpen && (");
    const dialogEnd = source.indexOf("{customDeviceDialogOpen && (", dialogStart);
    const dialogBlock = source.slice(dialogStart, dialogEnd);
    const visualPanelStart = source.indexOf("const renderDeviceDefinitionVisualPanel = (template: DeviceTemplate) => {");
    const visualPanelEnd = source.indexOf("const renderCustomComponentManagerTree = () =>", visualPanelStart);
    const visualPanelBlock = source.slice(visualPanelStart, visualPanelEnd);

    expect(source).toContain("type DeviceDefinitionVisualDraft =");
    expect(source).toContain("const [definitionVisualDraft, setDefinitionVisualDraft]");
    expect(source).toContain("const [definitionTerminalAnchorDragIndex, setDefinitionTerminalAnchorDragIndex]");
    expect(source).toContain("const chooseDefinitionTemplateIcon = (event: ChangeEvent<HTMLInputElement>) => {");
    expect(source).toContain("const saveDeviceDefinitionVisualDraft = () => {");
    expect(source).toContain("const terminalAnchors = definitionVisualTerminalAnchors.slice(0, definitionVisualDraft.terminalCount).map((anchor) => ({ ...anchor }))");
    expect(source).toContain("terminalAnchors,");
    expect(source).toContain("backgroundImage: definitionVisualDraft.backgroundImage");
    expect(dialogBlock).toContain("图标/端子");
    expect(dialogBlock).toContain("renderDeviceDefinitionVisualPanel(selectedDefinitionTemplate)");
    expect(visualPanelBlock).toContain("device-definition-default-toolbar");
    expect(visualPanelBlock).toContain("上传到后台");
    expect(visualPanelBlock).toContain("className=\"custom-device-anchor-preview device-definition-anchor-preview\"");
    expect(visualPanelBlock).toContain("updateDefinitionTerminalAnchorFromPreview");
    expect(visualPanelBlock).toContain("CUSTOM_DEVICE_TERMINAL_ANCHOR_GUIDE_VALUES.map");
    expect(visualPanelBlock).toContain("端子位置");
    expect(visualPanelBlock).toContain("保存图标和端子");
    expect(visualPanelBlock).toContain("端子拖放到元件四周边框");
    expect(styles).toContain(".device-definition-visual-panel");
    expect(styles).toContain(".device-definition-anchor-preview");
  });

  test("edits status pages inside visual icon editors while sharing size and terminals", async () => {
    const source = await readAppSource();
    const styles = await readStyles();
    const definitionDialogStart = source.indexOf("{deviceDefinitionDialogOpen && (");
    const customDialogStart = source.indexOf("{customDeviceDialogOpen && (");
    const definitionDialogBlock = source.slice(definitionDialogStart, customDialogStart);
    const customDialogEnd = source.indexOf("{imageTarget && (", customDialogStart);
    const customDialogBlock = source.slice(customDialogStart, customDialogEnd);
    const visualPagerStart = source.indexOf("const renderStateVisualPager = (");
    const visualPagerEnd = source.indexOf("const renderDeviceDefinitionVisualPanel = (template: DeviceTemplate) => {", visualPagerStart);
    const visualPagerBlock = source.slice(visualPagerStart, visualPagerEnd);
    const definitionVisualStart = source.indexOf("const renderDeviceDefinitionVisualPanel = (template: DeviceTemplate) => {");
    const definitionVisualEnd = source.indexOf("const renderCustomComponentManagerTree = () =>", definitionVisualStart);
    const definitionVisualBlock = source.slice(definitionVisualStart, definitionVisualEnd);
    const definitionVisualSaveStart = source.indexOf("const saveDeviceDefinitionVisualDraft = () => {");
    const definitionVisualSaveEnd = source.indexOf("const saveDeviceDefinitionDraft = () =>", definitionVisualSaveStart);
    const definitionVisualSaveBlock = source.slice(definitionVisualSaveStart, definitionVisualSaveEnd);

    expect(source).toContain('const [customDeviceDialogView, setCustomDeviceDialogView] = useState<"visual" | "parameters">("visual");');
    expect(source).toContain('const [deviceDefinitionView, setDeviceDefinitionView] = useState<"visual" | "parameters" | "measurements">("parameters");');
    expect(definitionDialogBlock).not.toContain('setDeviceDefinitionView("states")');
    expect(customDialogBlock).not.toContain('setCustomDeviceDialogView("states")');
    expect(definitionDialogBlock).not.toContain('deviceDefinitionView === "states"');
    expect(customDialogBlock).not.toContain('customDeviceDialogView === "states"');
    expect(visualPagerBlock).toContain("device-state-pager");
    expect(visualPagerBlock).toContain('aria-label="状态分页"');
    expect(visualPagerBlock).toContain("新增状态");
    expect(visualPagerBlock).toContain("删除状态");
    expect(visualPagerBlock).toContain("状态值");
    expect(visualPagerBlock).toContain("状态名称");
    expect(visualPagerBlock).toContain("状态图片");
    expect(visualPagerBlock).toContain("状态文字");
    expect(visualPagerBlock).toContain("尺寸大小和端子位置由所有状态分页共享");
    expect(definitionVisualBlock).toContain("renderStateVisualPager(definitionStateDraftRows");
    expect(definitionVisualSaveBlock).toContain("validateStateDraftRows(definitionStateDraftRows)");
    expect(definitionVisualSaveBlock).toContain("stateDefinitions,");
    expect(customDialogBlock).toContain("renderStateVisualPager(customDeviceDraft.stateDefinitions");
    expect(styles).toContain(".device-state-pager");
    expect(styles).toContain(".device-state-tabs");
    expect(styles).toContain(".device-state-page-fields");
  });

  test("keeps default status page structural edits separate from state style edits", async () => {
    const source = await readAppSource();
    const styles = await readStyles();
    const visualPagerStart = source.indexOf("const renderStateVisualPager = (");
    const visualPagerEnd = source.indexOf("const renderDeviceDefinitionVisualPanel = (template: DeviceTemplate) => {", visualPagerStart);
    const visualPagerBlock = source.slice(visualPagerStart, visualPagerEnd);
    const definitionVisualStart = source.indexOf("const renderDeviceDefinitionVisualPanel = (template: DeviceTemplate) => {");
    const definitionVisualEnd = source.indexOf("const renderCustomComponentManagerTree = () =>", definitionVisualStart);
    const definitionVisualBlock = source.slice(definitionVisualStart, definitionVisualEnd);
    const customDialogStart = source.indexOf("{customDeviceDialogOpen && (");
    const customDialogEnd = source.indexOf("{imageTarget && (", customDialogStart);
    const customDialogBlock = source.slice(customDialogStart, customDialogEnd);
    const definitionStateSaveStart = source.indexOf("const saveDeviceDefinitionStateVisualDraft = () => {");
    const definitionStateSaveEnd = source.indexOf("const saveDeviceDefinitionVisualDraft = () => {", definitionStateSaveStart);
    const definitionStateSaveBlock = source.slice(definitionStateSaveStart, definitionStateSaveEnd);
    const addDefinitionStateStart = source.indexOf("const addDefinitionStateDraftRow = () => {");
    const addDefinitionStateEnd = source.indexOf("const deleteDefinitionStateDraftRow = (rowId: string) => {", addDefinitionStateStart);
    const addDefinitionStateBlock = source.slice(addDefinitionStateStart, addDefinitionStateEnd);
    const addCustomStateStart = source.indexOf("const addCustomDeviceStateDraftRow = () => {");
    const addCustomStateEnd = source.indexOf("const deleteCustomDeviceStateDraftRow = (rowId: string) => {", addCustomStateStart);
    const addCustomStateBlock = source.slice(addCustomStateStart, addCustomStateEnd);
    const definitionDialogStyleStart = styles.indexOf(".device-definition-dialog {");
    const definitionDialogStyleEnd = styles.indexOf(".device-definition-layout", definitionDialogStyleStart);
    const definitionDialogStyleBlock = styles.slice(definitionDialogStyleStart, definitionDialogStyleEnd);

    expect(source).toContain('const DEFAULT_STATE_PAGE_ID = "__default-state__";');
    expect(source).toContain("function createStateDraftRowFromDefaultVisual");
    expect(visualPagerBlock).toContain("默认状态");
    expect(visualPagerBlock).toContain("isDefaultStatePageId(activeRowId)");
    expect(visualPagerBlock).toContain("preview?: ReactNode;");
    expect(visualPagerBlock.indexOf("{handlers.preview}")).toBeGreaterThan(-1);
    expect(visualPagerBlock.indexOf("{handlers.preview}")).toBeLessThan(visualPagerBlock.indexOf("className=\"custom-device-actions device-state-actions\""));
    expect(visualPagerBlock).toContain("handlers.saveStateVisuals");
    expect(visualPagerBlock).toContain("保存状态样式");
    expect(source).toContain("type StateIconDrawingElement =");
    expect(source).toContain("type StateIconDrawingDialogState =");
    expect(source).toContain("selectedElementIds: string[]");
    expect(source).toContain('type StateIconDrawingDragMode = "move" | "resize" | "rotate";');
    expect(source).toContain('"imported-svg"');
    expect(source).toContain('"image"');
    expect(source).toContain("function visibleStateIconColor");
    expect(source).toContain('const stroke = visibleStateIconColor("#2563eb", row.strokeColor, row.color);');
    expect(source).toContain("function createStateIconDrawingElement");
    expect(source).toContain('const strokeColor = visibleStateIconColor("#2563eb", row?.strokeColor, row?.color);');
    expect(source).not.toContain('strokeColor: row?.strokeColor.trim() || row?.color.trim() || "#2563eb"');
    expect(source).toContain("function createImportedStateIconElement");
    expect(source).toContain("function svgSourceFromDataUrl");
    expect(source).toContain("function parseStateIconSvgSource");
    expect(source).toContain("function stateIconSvgNodeToReact");
    expect(source).toContain("function stateIconSvgSourceToReactNodes");
    expect(source).toContain("function parseSvgStyleAttribute");
    expect(source).toContain("return <polygon key={key} {...props} />;");
    expect(source).not.toContain("const props = { ...stateIconSvgReactAttributes(element), key };");
    expect(source).toContain("function createEditableStateIconElementsFromSvgSource");
    expect(source).toContain("function createStateIconDrawingInitialElements");
    expect(source).toContain("function svgSourceToDataUrl");
    expect(source).toContain("function stateIconDrawingSvgElementMarkup");
    expect(source).toContain("function stateIconDrawingToImage");
    expect(source).toContain("function stateIconDrawingElementPreviewImage");
    expect(source).toContain("function stateIconDrawingElementPreviewNode");
    expect(source).toContain("clip-path");
    expect(source).toContain("const [stateIconDrawingDialog, setStateIconDrawingDialog]");
    expect(source).toContain("stateIconDrawingSvgRef");
    expect(source).toContain("stateIconDrawingDragRef");
    expect(source).toContain("stateIconDrawingImportInputRef");
    expect(source).toContain("stateIconDrawingImportMode");
    expect(source).toContain("const [stateImageUploadTarget, setStateImageUploadTarget]");
    expect(source).toContain("const chooseStateVisualImage = (event: ChangeEvent<HTMLInputElement>) => {");
    expect(source).toContain("const chooseStateIconDrawingImport = (event: ChangeEvent<HTMLInputElement>) => {");
    expect(source).toContain("const importedElements = isSvg");
    expect(source).toContain("const startStateIconDrawingDrag = (event: PointerEvent<SVGElement>, elementId: string, mode: StateIconDrawingDragMode) => {");
    expect(source).toContain("const dragStateIconDrawingSelection = (event: PointerEvent<SVGSVGElement>) => {");
    expect(source).toContain("const deleteSelectedStateIconDrawingElements = () => {");
    expect(source).toContain("const openStateIconDrawingDialog = (target: StateIconDrawingTarget) => {");
    expect(source).toContain("const initial = createStateIconDrawingInitialElements(row, imageAssets);");
    expect(source).toContain("const applyStateIconDrawingDialog = () => {");
    expect(source).toContain("stateVisualImageInputRef");
    expect(visualPagerBlock).toContain("上传图形");
    expect(visualPagerBlock).toContain("绘制图标");
    expect(visualPagerBlock).toContain("handlers.drawStateIcon");
    expect(source).toContain("状态图标绘制器");
    expect(source).toContain("导入SVG");
    expect(source).toContain("导入图片");
    expect(source).toContain("SVG源码");
    expect(source).toContain("图片缩放");
    expect(source).toContain("裁剪X");
    expect(source).toContain("裁剪Y");
    expect(source).toContain("state-icon-drawing-hitbox");
    expect(source).toContain("state-icon-drawing-selection-box");
    expect(source).toContain("state-icon-drawing-composite-preview");
    expect(source).toContain("state-icon-drawing-side");
    expect(source).toContain("href={stateIconDrawingToImage(stateIconDrawingDialog.elements)}");
    expect(source).not.toContain("dangerouslySetInnerHTML={{ __html: parsed.body }}");
    expect(source).toContain("state-icon-drawing-resize-handle");
    expect(source).toContain("state-icon-drawing-rotate-handle");
    expect(source).toContain("state-icon-drawing-property-grid");
    expect(source).toContain("state-icon-drawing-svg-field");
    expect(source).toContain("应用到状态图标");
    expect(definitionVisualBlock).toContain("const definitionDefaultStateSelected = isDefaultStatePageId(definitionStatePageId);");
    expect(definitionVisualBlock).toContain("definitionDefaultStateSelected &&");
    expect(definitionVisualBlock).toContain("!definitionDefaultStateSelected ||");
    expect(definitionVisualBlock).toContain("saveStateVisuals: saveDeviceDefinitionStateVisualDraft");
    expect(definitionVisualBlock).toContain("保存图标和端子");
    expect(customDialogBlock).toContain("preview: !customDefaultStateSelected ? (");
    expect(customDialogBlock).toContain("saveStateVisuals: saveCustomDeviceTemplate");
    expect(customDialogBlock).toContain('saveStateVisualsLabel: "保存自定义设备"');
    expect(customDialogBlock).toContain('customDefaultStateSelected && <div className="custom-device-actions custom-device-visual-actions">');
    expect(customDialogBlock).toContain('customDefaultStateSelected && <div className="custom-device-preview">');
    expect(definitionStateSaveBlock).toContain("validateStateDraftRows(definitionStateDraftRows)");
    expect(definitionStateSaveBlock).toContain("stateDefinitions");
    expect(definitionStateSaveBlock).not.toContain("terminalCount");
    expect(definitionStateSaveBlock).not.toContain("terminalTypes");
    expect(definitionStateSaveBlock).not.toContain("terminalLabels");
    expect(definitionStateSaveBlock).not.toContain("terminalAnchors");
    expect(definitionStateSaveBlock).not.toContain("size,");
    expect(addDefinitionStateBlock).toContain("createStateDraftRowFromDefaultVisual(definitionDefaultStateVisualDraft()");
    expect(addCustomStateBlock).toContain("createStateDraftRowFromDefaultVisual(customDeviceDefaultStateVisualDraft()");
    expect(styles).toContain(".device-state-default-body");
    expect(styles).toContain(".device-state-shape-tools");
    expect(styles).toContain(".state-icon-drawing-dialog");
    expect(styles).toContain(".state-icon-drawing-property-grid");
    expect(styles).toContain(".state-icon-drawing-import-actions");
    expect(styles).toContain(".state-icon-drawing-svg-field");
    expect(styles).toContain(".state-icon-drawing-hitbox");
    expect(styles).toContain(".state-icon-drawing-composite-preview");
    expect(styles).toContain(".state-icon-drawing-side");
    expect(styles).toContain(".state-icon-drawing-selection-box");
    expect(styles).toContain(".state-icon-drawing-resize-handle");
    expect(styles).toContain(".state-icon-drawing-rotate-handle");
    expect(styles).toContain(".device-state-pager .custom-device-preview");
    expect(styles).toContain(".device-definition-visual-actions");
    expect(definitionDialogStyleBlock).toContain("overflow: auto;");
    expect(definitionDialogStyleBlock).not.toContain("overflow: hidden;");
  });

  test("keeps backend scheme persistence helpers self contained", async () => {
    const serverSource = await readServerSource();
    const inferStart = serverSource.indexOf("function inferESection");
    const inferEnd = serverSource.indexOf("function legacyValue", inferStart);
    const inferBlock = serverSource.slice(inferStart, inferEnd);
    const topologyStart = serverSource.indexOf("function buildTopologyNodeDevices");
    const topologyEnd = serverSource.indexOf("function buildDeviceParameterFile", topologyStart);
    const topologyBlock = serverSource.slice(topologyStart, topologyEnd);
    const electricalTopologyStart = serverSource.indexOf("function calculateElectricalTopology");
    const electricalTopologyEnd = serverSource.indexOf("function terminalNodeNumber", electricalTopologyStart);
    const electricalTopologyBlock = serverSource.slice(electricalTopologyStart, electricalTopologyEnd);
    const writeSchemesStart = serverSource.indexOf("async function writeSchemes");
    const writeSchemesEnd = serverSource.indexOf("function normalizeColorRecord", writeSchemesStart);
    const writeSchemesBlock = serverSource.slice(writeSchemesStart, writeSchemesEnd);
    const writeSchemeFilesStart = serverSource.indexOf("async function writeSchemeFiles");
    const writeSchemeFilesEnd = serverSource.indexOf("function publicAsset", writeSchemeFilesStart);
    const writeSchemeFilesBlock = serverSource.slice(writeSchemeFilesStart, writeSchemeFilesEnd);
    const routeHandlersStart = serverSource.indexOf("const exactRouteHandlers = new Map([");
    const routeHandlersEnd = serverSource.indexOf("const server = createServer", routeHandlersStart);
    const routeHandlersBlock = serverSource.slice(routeHandlersStart, routeHandlersEnd);

    expect(serverSource).toContain("const accessControlHeaders = {");
    expect(serverSource).toContain("async function readJsonBody");
    expect(serverSource).toContain("async function readJsonStoreFile");
    expect(serverSource).toContain("async function writeJsonStoreFile");
    expect(serverSource).toContain("function imageCountsByFolder");
    expect(serverSource).toContain("function isStaticKind(kind)");
    expect(inferBlock).toContain("isStaticKind(kind)");
    expect(inferBlock).not.toContain("isStaticNode(kind)");
    expect(electricalTopologyBlock).toContain("if (!numberByTypeAndRoot[type])");
    expect(electricalTopologyBlock).toContain("numberByTypeAndRoot[type] = new Map();");
    expect(electricalTopologyBlock).toContain("nextTopologyNumberByType[type] = 1;");
    expect(topologyBlock).toContain("const group = groups[terminal.type];");
    expect(topologyBlock).toContain("if (!group) continue;");
    expect(topologyBlock).not.toContain("groups[terminal.type].get");
    expect(writeSchemesBlock).toContain("await writeSchemeFiles(schemes);");
    expect(writeSchemesBlock).toContain("await removeLegacySchemeManifest();");
    expect(writeSchemesBlock).not.toContain("writeJsonStoreFile(schemeDataDir");
    expect(writeSchemeFilesBlock).toContain("const writeTasks = [];");
    expect(writeSchemeFilesBlock).toContain("writeTasks.push(");
    expect(writeSchemeFilesBlock).toContain("await Promise.all(writeTasks);");
    expect(routeHandlersBlock).toContain("[\"GET /api/images\"");
    expect(routeHandlersBlock).toContain("[\"GET /api/image-folders\"");
    expect(routeHandlersBlock).toContain("const counts = imageCountsByFolder(manifest);");
    expect(routeHandlersBlock).not.toContain("manifest.filter((item) => (item.folderId || \"root\") === folder.id).length");
    expect(routeHandlersBlock).toContain("dynamicRouteHandlers");
    expect(serverSource).not.toContain("url.pathname ===");
  });

  test("stores backend scheme files by visible scheme and model names without hidden id suffixes", async () => {
    const serverSource = await readServerSource();
    const readSchemesStart = serverSource.indexOf("async function readSchemes");
    const readSchemesEnd = serverSource.indexOf("async function writeSchemes", readSchemesStart);
    const readSchemesBlock = serverSource.slice(readSchemesStart, readSchemesEnd);
    const writeSchemesStart = serverSource.indexOf("async function writeSchemes");
    const writeSchemesEnd = serverSource.indexOf("function normalizeColorRecord", writeSchemesStart);
    const writeSchemesBlock = serverSource.slice(writeSchemesStart, writeSchemesEnd);
    const normalizerStart = serverSource.indexOf("function normalizeSchemesForStorage");
    const normalizerEnd = serverSource.indexOf("function inferESection", normalizerStart);
    const normalizerBlock = serverSource.slice(normalizerStart, normalizerEnd);
    const writeSchemeFilesStart = serverSource.indexOf("async function writeSchemeFiles");
    const writeSchemeFilesEnd = serverSource.indexOf("function publicAsset", writeSchemeFilesStart);
    const writeSchemeFilesBlock = serverSource.slice(writeSchemeFilesStart, writeSchemeFilesEnd);
    const safeFilePartStart = serverSource.indexOf("function safeFilePart");
    const safeFilePartEnd = serverSource.indexOf("function normalizeProjectForStorage", safeFilePartStart);
    const safeFilePartBlock = serverSource.slice(safeFilePartStart, safeFilePartEnd);
    const uniqueNameStart = serverSource.indexOf("function uniqueRecordNameForFilePartStorage");
    const uniqueNameEnd = serverSource.indexOf("function normalizeSchemeProjectRecordNamesForStorage", uniqueNameStart);
    const uniqueNameBlock = serverSource.slice(uniqueNameStart, uniqueNameEnd);

    expect(serverSource).not.toContain("schemeManifestPath");
    expect(serverSource).toContain("async function readSchemesFromFiles");
    expect(readSchemesBlock).toContain("return readSchemesFromFiles()");
    expect(writeSchemesBlock).not.toContain("writeJsonStoreFile(schemeDataDir");
    expect(writeSchemesBlock).toContain("await removeLegacySchemeManifest()");
    expect(serverSource).toContain("function uniqueRecordNameForFilePartStorage");
    expect(serverSource).toContain("const maxFilePartLength = 80;");
    expect(normalizerBlock).toContain("normalizeSchemeRecordNamesForStorage(schemes)");
    expect(normalizerBlock).toContain("normalizeSchemeProjectRecordNamesForStorage(");
    expect(serverSource).toContain("const { id: _schemeRuntimeId");
    expect(serverSource).toContain("const { id: _projectRuntimeId");
    expect(writeSchemeFilesBlock).toContain("const writeSchemeTree = async (scheme, parentDir) =>");
    expect(writeSchemeFilesBlock).toContain('const schemeDir = join(parentDir, safeFilePart(scheme.name, "方案"));');
    expect(writeSchemeFilesBlock).toContain('const baseName = safeFilePart(record.name, "模型");');
    expect(writeSchemeFilesBlock).toContain("for (const childScheme of scheme.children ?? [])");
    expect(writeSchemeFilesBlock).toContain("await writeSchemeTree(childScheme, schemeDir);");
    expect(safeFilePartBlock).toContain(".slice(0, maxFilePartLength)");
    expect(uniqueNameBlock).toContain("const baseLimit = Math.max(1, maxFilePartLength - suffix.length);");
    expect(uniqueNameBlock).toContain("candidate = `${visibleBase}${suffix}`;");
    expect(writeSchemeFilesBlock).not.toContain('"scheme.json"');
    expect(writeSchemeFilesBlock).not.toContain("__${scheme.id}");
    expect(writeSchemeFilesBlock).not.toContain("__${record.id}");
    expect(writeSchemeFilesBlock).not.toContain("__project");
    expect(writeSchemeFilesBlock).not.toContain("__scheme");
    expect(safeFilePartBlock).not.toContain(".replace(/\\s+/g");
  });
});
