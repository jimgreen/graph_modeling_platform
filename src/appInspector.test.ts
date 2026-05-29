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
  test("allows canvas width and height up to 10000", async () => {
    const source = await readAppSource();

    expect(source).toContain("const MAX_CANVAS_WIDTH = 10000;");
    expect(source).toContain("const MAX_CANVAS_HEIGHT = 10000;");
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

  test("lets terminal stubs scale with the view like device glyph strokes", async () => {
    const styles = await readStyles();
    const terminalStubBlock = cssRuleBlock(styles, ".terminal-stub");

    expect(terminalStubBlock).not.toContain("vector-effect");
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
  });

  test("manages English device types from the former export-section dropdown", async () => {
    const source = await readAppSource();

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
    expect(source).not.toContain("placeholder=\"例如 ACUnit\"");
    expect(source).not.toContain("<span>导出Section</span>");
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
    expect(source).toContain("className={attributeLibraryOptionClass(group)}");
    expect(source).toContain("className={componentTypeOptionClass(section)}");
    expect(source).toContain("系统内置属性库，无法删除");
    expect(source).toContain("用户自定义元件类型，可以删除");
    expect(styles).toContain(".source-select.builtin-source");
    expect(styles).toContain(".source-select.custom-source");
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
    expect(source).toContain("setCustomComponentTypes((current) => normalizeCustomComponentTypes([...current, { name: componentType, attributeLibraryName }]))");
    expect(source).toContain("(groupedAttributeLibraryByComponentType[group] ?? []).map((typeGroup)");
    expect(source).toContain("attribute-library-component-type-section");
    expect(source).toContain("attribute-library-component-type-header");
    expect(source).toContain("component-definition-type-group");
    expect(source).toContain("aria-label={`${group}/${typeGroup.section}元件列表`}");
    expect(source).toContain("renderCustomComponentManagerTree");
    expect(source).toContain("custom-component-manager-panel");
    expect(source).toContain("custom-device-dialog-layout");
    expect(source).toContain("customComponentTreeSelection");
    expect(source).toContain("collapsedCustomComponentTreeLibraries");
    expect(source).toContain("collapsedCustomComponentTreeTypes");
    expect(source).toContain("toggleCustomComponentTreeLibrary");
    expect(source).toContain("toggleCustomComponentTreeType");
    expect(source).toContain("aria-expanded={!libraryCollapsed}");
    expect(source).toContain("aria-expanded={!typeCollapsed}");
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
    expect(styles).toContain(".custom-attribute-library-select-row.single-control");
  });

  test("keeps static drawing primitives under the StaticSymbol device type", async () => {
    const source = await readAppSource();
    const modelSource = await readModelSource();
    const serverSource = await readServerSource();

    expect(modelSource).toContain("StaticSymbol: []");
    expect(modelSource).toContain('if (isStaticKind(kind)) return "StaticSymbol";');
    expect(source).toContain('if (section === "StaticSymbol") {');
    expect(source).toContain('return "静态图元";');
    expect(source).toContain('if (normalized.includes("静态")) return "StaticSymbol";');
    expect(serverSource).toContain("StaticSymbol: []");
    expect(serverSource).toContain('if (isStaticKind(kind)) return "StaticSymbol";');
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

  test("keeps backend SVG bus export square ended", async () => {
    const serverSource = await readServerSource();
    const busExportStart = serverSource.indexOf("if (isBus)");
    const busExportEnd = serverSource.indexOf("\n      }\n      return", busExportStart);
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
    const layoutStart = source.indexOf("const applySelectedNodeLayout");
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
    expect(source).toContain("buildCanvasLayoutUnits(activeLayerGroups, activeLayerNodes, activeSelectedNodeIds, activeSelectedEdgeIds)");
    expect(layoutBlock).toContain("layoutNodes(nodes, selectedLayoutUnits)");
    expect(layoutBlock).toContain("const selected = new Set(layoutNodeIds)");
    expect(source).toContain("if (!activeLayerEdgeIdSet.has(edgeId))");
    expect(source).toContain("const visibleNodeSpatialIndex = visibleProject.nodeSpatialIndex");
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
    const dragStart = source.indexOf("const handleNodePointerDown");
    const dragEnd = source.indexOf("const handlePointerMove", dragStart);
    const dragBlock = source.slice(dragStart, dragEnd);
    const updateStart = source.indexOf("const updateSelectedNode");
    const updateEnd = source.indexOf("const assignSelectedNodesToModelLayer", updateStart);
    const updateBlock = source.slice(updateStart, updateEnd);

    expect(source).toContain("type CanvasSelectionScope");
    expect(source).toContain("const [canvasSelectionScope, setCanvasSelectionScope]");
    expect(source).toContain("const displaySelectedNodeIds = canvasSelectionScope === \"direct\" ? groupExpandedCanvasSelection.nodeIds : activeSelectedNodeIds");
    expect(source).toContain("const displaySelectedEdgeIds = canvasSelectionScope === \"direct\" ? groupExpandedCanvasSelection.edgeIds : activeCanvasSelection.edgeIds");
    expect(source).toContain("new Set(displaySelectedNodeIds)");
    expect(source).toContain("const focused = node.id === selectedNodeId");
    expect(source).toContain("selected ? \"selected\" : \"\"} ${focused ? \"focused\" : \"\"}");
    expect(source).toContain("{selected && focused && selectedNodeCount === 1 && (");
    expect(styles).toContain(".diagram-node.selected.focused .node-hitbox");
    expect(selectionStateBlock).toContain("selectedCanvasGroupIds(activeLayerGroups, groupExpandedCanvasSelection.nodeIds, groupExpandedCanvasSelection.edgeIds)");
    expect(selectionStateBlock).toContain("canvasGroupMemberNodeIds(activeLayerGroups, activeSelectedGroupIds)");
    expect(copyCutBlock).toContain("{ expandGroups: canvasSelectionScope === \"group\" }");
    expect(moveBlock).toContain("const moveNodeIds = canvasSelectionScope === \"direct\" ? displaySelectedNodeIds : activeSelectedNodeIds");
    expect(moveBlock).toContain("const moveEdgeIds = canvasSelectionScope === \"direct\" ? displaySelectedEdgeIds : activeSelectedEdgeIds");
    expect(moveBlock).toContain("commitFastMovedGraphPatches(");
    expect(moveBlock).toContain("moveNodeIds");
    expect(updateBlock).toContain("if (patch.position && focusedGroupedNodeMovesGroup && selectedNode)");
    expect(updateBlock).toContain("moveSelection(nextPosition.x - selectedNode.position.x, nextPosition.y - selectedNode.position.y)");
    expect(dragBlock).toContain("const clickedSelectedGroupMember");
    expect(dragBlock).toContain("nodeWasSelected");
    expect(dragBlock).toContain("const groupDragSelection");
    expect(dragBlock).toContain("nodeIds: groupExpandedCanvasSelection.nodeIds");
    expect(dragBlock).toContain("let dragSelection = nodeWasSelected");
    expect(dragBlock).toContain("? groupDragSelection");
    expect(dragBlock).toContain("selectedGroupMemberNodeIdSet.has(node.id)");
    expect(dragBlock).toContain("setSelectedNodeIds([node.id])");
    expect(dragBlock).toContain("setCanvasSelectionScope(\"direct\")");
    expect(dragBlock).toContain("const dragNodeIds = dragSelection.nodeIds");
    expect(dragBlock).toContain("originalPositions: Object.fromEntries");
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
    expect(rewiringBlock.indexOf("prepareConnectionEdgeForCommit")).toBeLessThan(rewiringBlock.indexOf("patchGraphEdges"));
  });

  test("commits drag-end nodes, edges, and drag state without forcing a synchronous render", async () => {
    const source = await readAppSource();
    const finishStart = source.indexOf("const finishNodeDrag = () =>");
    const finishEnd = source.indexOf("const moveSelection", finishStart);
    const finishBlock = source.slice(finishStart, finishEnd);

    expect(source).not.toContain("import { flushSync } from \"react-dom\";");
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
    const helperStart = source.indexOf("const rebuildEdgesAfterNodeGeometryChange");
    const helperEnd = source.indexOf("const selectedRoutedEdge", helperStart);
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
    expect(helperBlock).toContain("rebuildConnectionRoutesForNodes(nextNodes, currentEdges, changedIds, canvasBounds)");
    expect(helperBlock).toContain("dirtyEdgeIdsAfterMove");
    expect(helperBlock).toContain("markRouteEdgesDirty");
    expect(helperBlock).toContain("markStoredRouteEdgesDirty");
    expect(updateBlock).toContain("const geometryPatch");
    expect(updateBlock).toContain("rebuildEdgesAfterNodeGeometryChange(nextNodes, [selectedNodeId])");
    expect(mirrorBlock).toContain("rebuildEdgesAfterNodeGeometryChange(nextNodes, activeSelectedNodeIds)");
    expect(finishTransformBlock).toContain("transformDragChangedRef.current");
    expect(finishTransformBlock).toContain("rebuildEdgesAfterNodeGeometryChange(nodes, [activeTransform.nodeId])");
    expect(pointerBlock).toContain("transformDragChangedRef.current = true");
    expect(source).toContain("finishTransformDrag();");
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
    expect(scheduleBlock).toContain("graphStorePatchStillCurrent");
    expect(finishBlock).toContain("finalizeMovedNodeEdgesFast");
    expect(finishBlock).toContain("commitFastMovedGraphPatches");
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
    expect(source).toContain("upsertSavedProject(scheme.projects, importedRecord)");
    expect(source).toContain("loadSavedProject(importedRecord, targetScheme.id)");
    expect(source).toContain("模型名称重复</h2>");
    expect(source).toContain("请选择导入处理方式");
    expect(source).toContain(">覆盖</button>");
    expect(source).toContain(">重命名</button>");
    expect(source).toContain(">不导入</button>");
    expect(topbarBlock).toContain("openModelImportFilePicker()");
    expect(topbarBlock).toContain("onChange={importModelFile}");
    expect(topbarBlock).toContain("aria-label=\"导入模型文件\"");
    expect(topbarBlock).toContain("aria-label=\"导出当前模型文件\"");
    expect(contextBlock).not.toContain("导入模型");
    expect(contextBlock).not.toContain("导出模型");
    expect(projectContextBlock).toContain("exportProjectRecordFile");
    expect(projectContextBlock).toContain("openModelImportFilePicker(projectMenu.schemeId)");
    expect(projectContextBlock).toContain("模型导入");
    expect(projectContextBlock).toContain("模型导出");
  });

  test("exports schemes through a directory picker and keeps imports exports in context menus", async () => {
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

    expect(source).toContain("type DirectoryPickerWindow");
    expect(source).toContain("showDirectoryPicker");
    expect(source).toContain("const writeTextFileToDirectory = async");
    expect(source).toContain("const schemeImportInputRef = useRef<HTMLInputElement | null>(null)");
    expect(source).toContain("pendingSchemeImportConflict");
    expect(source).toContain("resolveDuplicateSchemeImport");
    expect(source).toContain("const openSchemeImportFilePicker = () =>");
    expect(source).toContain("const importSchemeFile = async");
    expect(exportBlock).toContain("showDirectoryPicker");
    expect(exportBlock).toContain("writeTextFileToDirectory(directoryHandle");
    expect(exportBlock).toContain("serializeProject(project.project)");
    expect(exportBlock).toContain("buildSvgDocument(project.project.nodes");
    expect(exportBlock).toContain("buildEDeviceParameterFile(project.project)");
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
    const edgeRenderIndex = source.indexOf("{viewportRoutedEdges.map((route) =>");
    const nodeRenderIndex = source.indexOf("{viewportNodes.map((node) =>");

    expect(source).toContain("visibleCanvasViewBoxFromRects");
    expect(source).toContain("initialVisibleCanvasViewBox");
    expect(source).toContain("const [canvasVisibleViewBox, setCanvasVisibleViewBox]");
    expect(source).toContain("frame.addEventListener(\"scroll\", scheduleCanvasVisibleViewBoxUpdate");
    expect(source).toContain("expandViewBoxForRendering(canvasVisibleViewBox)");
    expect(source).toContain("setCanvasVisibleViewBox(initialVisibleCanvasViewBox(nextCanvasBounds, canvasFrameRef.current))");
    expect(source).not.toContain("expandViewBoxForRendering(viewBox)");
    expect(source).toContain("nodeIntersectsRenderViewport");
    expect(routeCullBlock).toContain("if (activeSelectedEdgeSet.size === 0)");
    expect(routeCullBlock).toContain("activeSelectedEdgeSet.has(route.edgeId)");
    expect(routeCullBlock).toContain("queryRouteSpatialIndex(routedEdgeSpatialIndex, renderViewportBounds)");
    expect(routeCullBlock).not.toContain("renderedRoutedEdges.filter");
    expect(routeCullBlock).not.toContain("visibleNodes.filter");
    expect(routeCullBlock).toContain("selectedNodeIdSet.forEach(addVisibleNodeId)");
    expect(routeCullBlock).toContain("draggingNodeIdSet.forEach(addVisibleNodeId)");
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

  test("keeps selected edge overlay viewport-scoped without building a full rendered route array", async () => {
    const source = await readAppSource();
    const routeCullStart = source.indexOf("const viewportRoutedEdges = useMemo");
    const routeCullEnd = source.indexOf("const viewportNodes = useMemo", routeCullStart);
    const routeCullBlock = source.slice(routeCullStart, routeCullEnd);

    expect(source).not.toContain("const renderedRoutedEdges = useMemo");
    expect(routeCullBlock).toContain("queryRouteSpatialIndex(routedEdgeSpatialIndex, renderViewportBounds)");
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

  test("uses the route spatial index for connection route hit tests", async () => {
    const source = await readAppSource();
    const hitStart = source.indexOf("const findConnectionRouteHitAtPoint = (point: Point) =>");
    const hitEnd = source.indexOf("const insertManualBendAtPoint", hitStart);
    const hitBlock = source.slice(hitStart, hitEnd);

    expect(hitBlock).toContain("const hitBounds");
    expect(hitBlock).toContain("queryRouteSpatialIndex(routedEdgeSpatialIndex, hitBounds)");
    expect(hitBlock).not.toContain("renderedRoutedEdges");
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

  test("reuses the graph store node spatial index when visible nodes keep graph order", async () => {
    const source = await readAppSource();
    const visibleProjectStart = source.indexOf("const visibleProject = useMemo");
    const visibleProjectEnd = source.indexOf("const visibleNodes = visibleProject.nodes", visibleProjectStart);
    const visibleProjectBlock = source.slice(visibleProjectStart, visibleProjectEnd);
    const visibleIndexStart = source.indexOf("const visibleNodeById = useMemo");
    const visibleIndexEnd = source.indexOf("const activeLayerNodes = useMemo", visibleIndexStart);
    const visibleIndexBlock = source.slice(visibleIndexStart, visibleIndexEnd);

    expect(visibleProjectBlock).toContain("visibleProjectNodesMatchGraphStoreOrder");
    expect(visibleProjectBlock).toContain("graphStore.nodeSpatialIndex");
    expect(visibleProjectBlock).toContain("buildNodeSpatialIndex(filtered.nodes)");
    expect(visibleIndexBlock).toContain("visibleNodes === nodes ? graphStore.nodeMap");
    expect(visibleIndexBlock).toContain("visibleNodes === nodes ? graphStore.nodeIdSet");
    expect(visibleIndexBlock).toContain("visibleEdges === edges ? graphStore.edgeIdSet");
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

    expect(source).toContain("const edgesByNodeId = graphStore.edgesByNodeId");
    expect(source).toContain("const edgeListForNodeIds =");
    expect(dragStartBlock).toContain("affectedEdgeIdsForDrag");
    expect(dragStartBlock).toContain("const affectedEdgesForDrag = edgeListForNodeIds(dragNodeIds, edgeIdsForDrag)");
    expect(dragStartBlock).not.toContain("for (const edge of edges)");
    expect(dragStartBlock).not.toContain("const affectedEdgesForDrag = edges.filter");
    expect(dragStartBlock).toContain("affectedEdges: affectedEdgesForDrag");
    expect(dragStartBlock).toContain("originalRoutePoints: Object.fromEntries(\n        affectedEdgesForDrag.map");
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
    expect(finishBlock).toContain("overlayGraphStoreNodes(graphStore, movedNodeUpdates)");
    expect(finishBlock).not.toContain("nodes.map((node)");
    expect(finishBlock).not.toContain("edges.map((edge)");
    expect(finishBlock).not.toContain("new Map(adjustedAffectedEdges.map");
    expect(moveBlock).toContain("const affectedEdgesForMove = edgeListForNodeIds(moveNodeIds, moveEdgeIds)");
    expect(moveBlock).toContain("buildMovedNodeUpdates");
    expect(moveBlock).toContain("overlayGraphStoreNodes(graphStore, movedNodeUpdates)");
    expect(moveBlock).not.toContain("const affectedEdgesForMove = edges.filter");
    expect(moveBlock).not.toContain("nodes.map((node)");
    expect(moveBlock).not.toContain("edges.map((edge)");
    expect(moveBlock).not.toContain("new Map(adjustedAffectedEdges.map");
    expect(commitBlock).toContain("moveCandidateEdges");
    expect(commitBlock).toContain("rebuildExternalConnectionRoutesForMovedNodes(");
    expect(commitBlock).toContain("moveCandidateEdges");
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
    expect(finishBlock).toContain("activeDragging.nodeIds,\n      adjustedAffectedEdges");
    expect(moveBlock).toContain("moveNodeIds,\n      adjustedAffectedEdges");
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
    expect(source).toContain("routeStoreSetRoutes");
    expect(source).toContain("queryRouteSpatialIndex");
    expect(source).toContain("const routedEdgeSpatialIndex = routedEdgeStore.routeSpatialIndex");
    expect(scheduleBlock).toContain("const routeCandidateEdges = localRouteOptimizationCandidateEdges");
    expect(scheduleBlock).toContain("const optimizationEdges = localRouteOptimizationEdges");
    expect(scheduleBlock).toContain("routeCandidateEdges");
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
    expect(rerouteBlock).toContain("searchEdges: Edge[] = edges");
    expect(rerouteBlock).toContain("? searchEdges.filter");
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
    const candidateStart = source.indexOf("function buildRouteCandidates");
    const candidateEnd = source.indexOf("function selectRouteCandidate", candidateStart);
    const candidateBlock = source.slice(candidateStart, candidateEnd);

    expect(source).toContain("const ROUTE_MAX_LANES_PER_AXIS");
    expect(source).toContain("const ROUTE_MAX_LANE_PAIRS");
    expect(source).toContain("function prioritizeLaneValues");
    expect(source).toContain("function prioritizeLanePairs");
    expect(laneBlock).toContain("prioritizeLaneValues");
    expect(candidateBlock).toContain("prioritizeLanePairs(xs, ys");
    expect(candidateBlock).toContain("for (const { x, y } of lanePairs)");
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

  test("defers full terminal overlap detection off the drag release frame", async () => {
    const source = await readAppSource();
    const overlapStart = source.indexOf("const terminalOverlapNodes");
    const overlapEnd = source.indexOf("const nodeTerminalSnapTarget", overlapStart);
    const overlapBlock = source.slice(overlapStart, overlapEnd);

    expect(source).toContain("const dragInteractionNodes = useMemo");
    expect(source).toContain("const dragPreviewMovedNodeById = useMemo");
    expect(source).not.toContain("Array.from(dragPreviewNodeById.values()).filter");
    expect(overlapBlock).toContain("dragging && draggingDelta ? dragInteractionNodes : deferredRoutingNodes");
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
    expect(dragPreviewBlock).toContain("const source = dragPreviewNodeFor(previewEdge.sourceId)");
    expect(dragPreviewBlock).toContain("nextNodes: dragInteractionNodes");
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

    expect(source).toContain("function buildNodeSpatialIndex");
    expect(source).toContain("function queryNodeSpatialIndex");
    expect(source).toContain("const visibleNodeSpatialIndex = visibleProject.nodeSpatialIndex");
    expect(findConnectBlock).toContain("queryNodeSpatialIndex(visibleNodeSpatialIndex, searchBounds)");
    expect(findConnectBlock).not.toContain("for (const node of visibleNodes)");
    expect(findRewireBlock).toContain("queryNodeSpatialIndex(visibleNodeSpatialIndex, searchBounds)");
    expect(findRewireBlock).not.toContain("for (const node of visibleNodes)");
    expect(dragPreviewBlock).toContain("queryNodeSpatialIndex(visibleNodeSpatialIndex, dragInteractionBounds)");
    expect(dragPreviewBlock).not.toContain("for (const node of visibleNodes)");
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

  test("defers bus terminal synchronization and autosaves graph edits only to local draft", async () => {
    const source = await readAppSource();
    const busSyncStart = source.indexOf("const synchronized = scheduledBusSyncNodeIds.size > 0");
    const busSyncEffectStart = source.indexOf("const pendingBusSyncNodeIds = pendingBusTerminalSyncNodeIdsRef.current;");
    const busSyncEffectEnd = source.indexOf("const canvasBounds", busSyncEffectStart);
    const busSyncEffectBlock = source.slice(busSyncEffectStart, busSyncEffectEnd);
    const saveDraftStart = source.indexOf("const saveDraftProject =");
    const saveDraftEnd = source.indexOf("const saveCurrentProject", saveDraftStart);
    const saveDraftBlock = source.slice(saveDraftStart, saveDraftEnd);
    const saveStart = source.indexOf("const saveCurrentProject");
    const saveEnd = source.indexOf("const renameProjectRecord", saveStart);
    const saveBlock = source.slice(saveStart, saveEnd);
    const autoDraftStart = source.indexOf("const draftAutosaveProjectId = activeProjectId || selectedProjectId");
    const autoDraftEnd = source.indexOf("const setActiveLayer", autoDraftStart);
    const autoDraftBlock = source.slice(autoDraftStart, autoDraftEnd);
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
    expect(autoDraftBlock).toContain("if (!hasUnsavedChanges)");
    expect(autoDraftBlock).toContain("window.setTimeout");
    expect(autoDraftBlock).toContain("saveDraftProject(draftAutosaveProjectId");
    expect(autoDraftBlock).not.toContain("saveCurrentProject");
    expect(autoDraftBlock).not.toContain("saveBackendSchemesPayload");
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

  test("scopes delayed bus terminal synchronization after graph moves to pending affected nodes", async () => {
    const source = await readAppSource();
    const refStart = source.indexOf("const pendingBusTerminalSyncNodeIdsRef");
    const busSyncEffectStart = source.indexOf("const pendingBusSyncNodeIds = pendingBusTerminalSyncNodeIdsRef.current;");
    const busSyncEffectEnd = source.indexOf("const canvasBounds", busSyncEffectStart);
    const busSyncEffectBlock = source.slice(busSyncEffectStart, busSyncEffectEnd);
    const commitStart = source.indexOf("const commitFastMovedGraph");
    const commitEnd = source.indexOf("const clampPointToCanvas", commitStart);
    const commitBlock = source.slice(commitStart, commitEnd);

    expect(refStart).toBeGreaterThan(-1);
    expect(busSyncEffectBlock).toContain("scheduledBusSyncNodeIds.size > 0");
    expect(busSyncEffectBlock).toContain("synchronizeBusTerminalsWithEdges(syncNodes, syncEdges, scheduledBusSyncNodeIds)");
    expect(busSyncEffectBlock).not.toContain("synchronizeBusTerminalsWithEdges(syncNodes, syncEdges);");
    expect(commitBlock).toContain("markBusTerminalSyncDirty(movedNodeIds)");
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
    expect(elementTreeBlock).toContain("buildElementTree(deferredElementTreeNodes, deferredElementTreeEdges, libraryTemplates, { includeContainerChildren: false })");
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
    expect(source).toContain("includeContainerChildren: false");
    expect(treeBlock).toContain("const itemChildren = elementTreeItemChildren(item)");
    expect(treeBlock).toContain("itemChildren.length");
    expect(treeBlock).toContain("itemChildren.map((child)");
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

  test("adds persistent group and ungroup actions to the topbar and context menu", async () => {
    const source = await readAppSource();
    const topbarStart = source.indexOf("<header className=\"topbar\">");
    const topbarEnd = source.indexOf("</header>", topbarStart);
    const topbarBlock = source.slice(topbarStart, topbarEnd);
    const contextStart = source.indexOf("{contextMenu && (");
    const contextEnd = source.indexOf("{projectMenu && (", contextStart);
    const contextBlock = source.slice(contextStart, contextEnd);

    expect(source).toContain("const [groups, setGroups]");
    expect(source).toContain("expandSelectionByGroups(activeLayerGroups");
    expect(source).toContain("expandSelectionByGroups(nextGroups, activeSelectedNodeIds, activeSelectedEdgeIds)");
    expect(source).toContain("groups: normalizeModelGroups(groups, nodes, edges)");
    expect(source).toContain("setGroups(snapshot.groups)");
    expect(topbarBlock).toContain("aria-label=\"组合\"");
    expect(topbarBlock).toContain("aria-label=\"解散\"");
    expect(contextBlock).toContain("groupSelectedGraphics");
    expect(contextBlock).toContain("ungroupSelectedGraphics");
    expect(contextBlock).toContain("组合");
    expect(contextBlock).toContain("解散");
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
    expect(topbarBlock).toContain("disabled={!canGroupSelectedGraphics}");
    expect(contextBlock).toContain("{canGroupSelectedGraphics && (");
    expect(contextBlock).toContain("{canUngroupSelectedGraphics && (");
    expect(contextBlock).toContain("groupSelectedGraphics");
    expect(contextBlock).toContain("ungroupSelectedGraphics");
    expect(contextBlock).not.toContain("disabled=");
  });

  test("uses explicit model scheme and blank project-list context-menu actions", async () => {
    const source = await readAppSource();
    const projectPanelStart = source.indexOf("const renderProjectPanel = () => (");
    const projectPanelEnd = source.indexOf("const customDraftTerminalTypes", projectPanelStart);
    const projectPanelBlock = source.slice(projectPanelStart, projectPanelEnd);
    const projectContextStart = source.indexOf("{projectMenu && (");
    const projectContextEnd = source.indexOf("{pendingModelImportConflict && (", projectContextStart);
    const projectContextBlock = source.slice(projectContextStart, projectContextEnd);
    const modelLabels = ["模型删除", "模型导出", "模型导入", "模型重命名", "模型复制", "模型粘贴"];
    const schemeLabels = ["方案删除", "方案导出", "方案导入", "方案重命名", "方案复制", "模型粘贴", "方案粘贴"];
    const blankLabels = ["方案新增", "方案粘贴", "方案导入"];
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
    expect(projectContextBlock).toContain("createSchemeRecord");
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
    const moveEnd = source.indexOf("const saveDraftProject", moveStart);
    const moveBlock = source.slice(moveStart, moveEnd);
    const resolveStart = source.indexOf("const resolveRecordPasteConflict =");
    const resolveEnd = source.indexOf("const moveProjectRecordToScheme", resolveStart);
    const resolveBlock = source.slice(resolveStart, resolveEnd);
    const dialogStart = source.indexOf("{pendingRecordPasteConflict && (");
    const dialogEnd = source.indexOf("{pendingModelImportConflict && (", dialogStart);
    const dialogBlock = source.slice(dialogStart, dialogEnd);

    expect(source).toContain("kind: \"project-drag\"");
    expect(moveBlock).toContain("duplicateProject");
    expect(moveBlock).toContain("setPendingRecordPasteConflict");
    expect(moveBlock).toContain("commitProjectRecordMove");
    expect(resolveBlock).toContain("请输入拖拽后的模型名称");
    expect(resolveBlock).toContain("commitProjectRecordMove");
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
    const autoDraftStart = source.indexOf("const draftAutosaveProjectId = activeProjectId || selectedProjectId");
    const autoDraftEnd = source.indexOf("const setActiveLayer", autoDraftStart);
    const autoDraftBlock = source.slice(autoDraftStart, autoDraftEnd);
    const busSyncStart = source.indexOf("const synchronized = scheduledBusSyncNodeIds.size > 0");
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
    expect(autoDraftBlock).toContain("saveDraftProject(draftAutosaveProjectId");
    expect(autoDraftBlock).not.toContain("saveCurrentProject");
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

  test("persists scheme and model list changes to the backend without swallowing the first edit", async () => {
    const source = await readAppSource();
    const schemePersistStart = source.indexOf("const normalizedSchemesPayload = serializeSchemesForStorage(schemes);");
    const schemePersistEnd = source.indexOf("}, [schemes]);", schemePersistStart);
    const schemePersistBlock = source.slice(schemePersistStart, schemePersistEnd);
    const saveCallIndex = schemePersistBlock.indexOf("saveBackendSchemesPayload(normalizedSchemesPayload)");
    const persistedAssignmentIndex = schemePersistBlock.indexOf("lastPersistedSchemesPayloadRef.current = normalizedSchemesPayload");

    expect(schemePersistBlock).toContain("suppressNextBackendSchemeSyncRef.current && normalizedSchemesPayload === lastPersistedSchemesPayloadRef.current");
    expect(schemePersistBlock).toContain("suppressNextBackendSchemeSyncRef.current = false;");
    expect(saveCallIndex).toBeGreaterThan(-1);
    expect(persistedAssignmentIndex).toBeGreaterThan(saveCallIndex);
    expect(schemePersistBlock).toContain(".then(() => {");
    expect(schemePersistBlock).toContain("lastPersistedSchemesPayloadRef.current = normalizedSchemesPayload;");
    expect(schemePersistBlock).toContain("writeOperationLog(\"方案/模型目录已自动保存到后台\")");
    expect(schemePersistBlock).not.toContain("if (suppressNextBackendSchemeSyncRef.current) {\n        suppressNextBackendSchemeSyncRef.current = false;\n        return;\n      }\n      void saveBackendSchemesPayload");
  });

  test("persists custom device library definitions through the backend", async () => {
    const source = await readAppSource();
    const serverSource = await readServerSource();

    expect(source).toContain("fetchBackendDeviceLibrary");
    expect(source).toContain("saveBackendDeviceLibraryPayload");
    expect(source).toContain('fetch("/api/device-library")');
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
    expect(serverSource).toContain('url.pathname === "/api/device-library"');
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
    const writeSchemesEnd = serverSource.indexOf("async function ensureSettingsStore", writeSchemesStart);
    const writeSchemesBlock = serverSource.slice(writeSchemesStart, writeSchemesEnd);

    expect(serverSource).toContain("function isStaticKind(kind)");
    expect(inferBlock).toContain("isStaticKind(kind)");
    expect(inferBlock).not.toContain("isStaticNode(kind)");
    expect(electricalTopologyBlock).toContain("if (!numberByTypeAndRoot[type])");
    expect(electricalTopologyBlock).toContain("numberByTypeAndRoot[type] = new Map();");
    expect(electricalTopologyBlock).toContain("nextTopologyNumberByType[type] = 1;");
    expect(topologyBlock).toContain("const group = groups[terminal.type];");
    expect(topologyBlock).toContain("if (!group) continue;");
    expect(topologyBlock).not.toContain("groups[terminal.type].get");
    expect(writeSchemesBlock.indexOf("await writeSchemeFiles(schemes);")).toBeLessThan(
      writeSchemesBlock.indexOf("await writeTextIfChanged(schemeManifestPath")
    );
  });
});
