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
  test("allows canvas width and height up to 50000", async () => {
    const source = await readAppSource();

    expect(source).toContain("const MAX_CANVAS_WIDTH = 50000;");
    expect(source).toContain("const MAX_CANVAS_HEIGHT = 50000;");
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

  test("adds a searchable model library with clear empty results", async () => {
    const source = await readAppSource();
    const styles = await readStyles();
    const projectPanelStart = source.indexOf("const renderProjectPanel = () => (");
    const projectPanelEnd = source.indexOf("const customDraftTerminalTypes", projectPanelStart);
    const projectPanelBlock = source.slice(projectPanelStart, projectPanelEnd);

    expect(source).toContain("const [projectSearchQuery, setProjectSearchQuery] = useState(\"\");");
    expect(source).toContain("const projectSearchNeedle = normalizeLibrarySearchText(projectSearchQuery);");
    expect(source).toContain("const filteredProjectSchemes = useMemo<SavedSchemeRecord[]>");
    expect(source).toContain("normalizeLibrarySearchText(scheme.name).includes(projectSearchNeedle)");
    expect(source).toContain("normalizeLibrarySearchText(project.name).includes(projectSearchNeedle)");
    expect(source).toContain("const isExpanded = projectSearchNeedle ? true : expandedSchemeIds.includes(scheme.id);");
    expect(projectPanelBlock).toContain("className=\"library-search project-search\"");
    expect(projectPanelBlock).toContain("placeholder=\"搜索方案/模型\"");
    expect(projectPanelBlock).toContain("aria-label=\"搜索模型库\"");
    expect(projectPanelBlock).toContain("aria-label=\"清空模型库搜索\"");
    expect(projectPanelBlock).toContain("未找到匹配方案或模型");
    expect(projectPanelBlock).toContain("filteredProjectSchemes.map((scheme)");
    expect(styles).toContain(".project-search");
    expect(styles).toContain(".project-search-empty");
  });

  test("collapses component type groups in the library by default and toggles them on click", async () => {
    const source = await readAppSource();
    const styles = await readStyles();
    const libraryPanelStart = source.indexOf("const renderLibraryPanel");
    const libraryPanelEnd = source.indexOf("const renderLeftPanelContent", libraryPanelStart);
    const libraryPanelBlock = source.slice(libraryPanelStart, libraryPanelEnd);

    expect(source).toContain("const [expandedAttributeLibraryComponentTypes, setExpandedAttributeLibraryComponentTypes] = useState<string[]>([]);");
    expect(source).toContain("const attributeLibraryComponentTypeKey = (attributeLibraryName: string, sectionName: string) =>");
    expect(source).toContain("const toggleAttributeLibraryComponentType = (attributeLibraryName: string, sectionName: string) =>");
    expect(libraryPanelBlock).toContain("const componentTypeExpanded = librarySearchNeedle ? true : expandedAttributeLibraryComponentTypes.includes(componentTypeKey);");
    expect(libraryPanelBlock).toContain("aria-expanded={componentTypeExpanded}");
    expect(libraryPanelBlock).toContain("onClick={() => toggleAttributeLibraryComponentType(group, typeGroup.section)}");
    expect(libraryPanelBlock).toContain("{componentTypeExpanded && (");
    expect(styles).toContain(".attribute-library-component-type-header");
    expect(styles).toContain("cursor: pointer");
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

  test("keeps only the real canvas boundary as the visible canvas border", async () => {
    const source = await readAppSource();
    const styles = await readStyles();
    const canvasBlock = cssRuleBlock(styles, ".diagram-canvas");
    const boundaryBlock = cssRuleBlock(styles, ".canvas-boundary");

    expect(source).toContain("<rect className=\"canvas-boundary\" x=\"0\" y=\"0\" width={canvasWidth} height={canvasHeight} />");
    expect(canvasBlock).not.toContain("border:");
    expect(canvasBlock).not.toContain("box-shadow:");
    expect(boundaryBlock).toContain("stroke: #475569");
    expect(boundaryBlock).toContain("pointer-events: none");
  });

  test("bridges the topbar dropdown hover gap between trigger and floating menu", async () => {
    const styles = await readStyles();
    const dropdownBridgeBlock = cssRuleBlock(styles, ".topbar-dropdown::after");

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
    expect(keyboardMoveBlock).toContain("ensureDraggingUndoSnapshot");
    expect(keyboardMoveBlock).toContain("setDragging");
    expect(keyboardMoveBlock).toContain("scheduleKeyboardMoveCommit");
    expect(keyboardMoveBlock).toContain("scheduleIdleWork");
    expect(keyboardMoveBlock).toContain("finishKeyboardMove");
    expect(keyboardMoveBlock).toContain("flushPendingKeyboardMove(true)");
    expect(keyboardMoveBlock).toContain("clearKeyboardMoveCommitSchedule();");
    expect(keyboardMoveBlock).toContain("current?.source === \"keyboard\" || current === null");
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

  test("splits static drawing primitives into functional component types", async () => {
    const source = await readAppSource();
    const modelSource = await readModelSource();
    const serverSource = await readServerSource();

    for (const section of [
      "StaticTextSymbol",
      "StaticMediaSymbol",
      "StaticBasicShape",
      "StaticFlowNode",
      "StaticContainerSymbol",
      "StaticConnectorSymbol",
      "StaticAnnotationSymbol"
    ]) {
      expect(modelSource).toContain(`${section}: []`);
      expect(serverSource).toContain(`${section}: []`);
    }
    expect(modelSource).toContain("STATIC_COMPONENT_TYPE_BY_KIND");
    expect(modelSource).toContain('"static-line": "StaticConnectorSymbol"');
    expect(modelSource).toContain('"static-callout": "StaticAnnotationSymbol"');
    expect(modelSource).not.toContain('if (isStaticKind(kind)) return "StaticSymbol";');
    expect(source).toContain('if (section.startsWith("Static")) {');
    expect(source).toContain('return "静态图元";');
    expect(source).toContain('if (normalized.includes("静态")) return "StaticBasicShape";');
    expect(serverSource).toContain("staticComponentTypeByKind");
    expect(serverSource).toContain('"static-line": "StaticConnectorSymbol"');
    expect(serverSource).toContain('"static-callout": "StaticAnnotationSymbol"');
    expect(serverSource).not.toContain('if (isStaticKind(kind)) return "StaticSymbol";');
  });

  test("adds React-Flow-style static symbols and exposes unified style editors", async () => {
    const source = await readAppSource();
    const modelSource = await readModelSource();
    const glyphStart = source.indexOf("if (isStaticNode(node)) {");
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

  test("adds lightweight viewport controls and minimap navigation without replacing the SVG canvas", async () => {
    const source = await readAppSource();
    const styles = await readStyles();

    expect(source).toContain("const [minimapVisible, setMinimapVisible] = useState(true)");
    expect(source).toContain("const handleMinimapNavigate");
    expect(source).toContain("fitViewToContent");
    expect(source).toContain("centerSelectedInView");
    expect(source).toContain("fitViewToSelection");
    expect(source).toContain("zoomViewportAtCenter");
    expect(source).toContain("resetViewport");
    expect(source).toContain("ScanSearch");
    expect(source).toContain("aria-label=\"缩放到选中区域\"");
    expect(source).toContain("className=\"viewport-controls\"");
    expect(source).toContain("className=\"canvas-minimap\"");
    expect(source).toContain("className=\"minimap-viewport\"");
    expect(styles).toContain(".viewport-overlay");
    expect(styles).toContain(".canvas-minimap");
    expect(styles).toContain(".minimap-viewport");
  });

  test("adds selected graphic quick toolbars, edge controls, and resize feedback on top of existing actions", async () => {
    const source = await readAppSource();
    const styles = await readStyles();

    expect(source).toContain("className=\"canvas-floating-toolbar node-toolbar\"");
    expect(source).toContain("className=\"canvas-floating-toolbar edge-toolbar\"");
    expect(source).toContain("className=\"canvas-floating-toolbar-wrapper\"");
    expect(source).toContain("transform={`matrix(${nodeFloatingToolbar.scaleX} 0 0 ${nodeFloatingToolbar.scaleY} ${nodeFloatingToolbar.x} ${nodeFloatingToolbar.y})`}");
    expect(source).toContain("transform={`matrix(${edgeFloatingToolbar.scaleX} 0 0 ${edgeFloatingToolbar.scaleY} ${edgeFloatingToolbar.x} ${edgeFloatingToolbar.y})`}");
    expect(source).toContain("width: nodeFloatingToolbarWidth");
    expect(source).toContain("width: EDGE_FLOATING_TOOLBAR_WIDTH");
    expect(source).toContain("addManualBendToSelectedEdgeCenter");
    expect(source).toContain("tidySelectedEdgeRoute");
    expect(source).toContain("toggleSelectedNodeLabelDisplay");
    expect(source).toContain("nodeFloatingToolbarActionCount");
    expect(source).toContain("title=\"剪切\" aria-label=\"剪切\"");
    expect(source).toContain("title=\"解散\" aria-label=\"解散\"");
    expect(source).toContain("title=\"添加模板\" aria-label=\"添加模板\"");
    expect(source).toContain("title=\"复制连接线\" aria-label=\"复制连接线\"");
    expect(source).toContain("proportionalScale");
    expect(source).toContain("event.shiftKey || transformDrag.kind === \"scale-both\"");
    expect(source).toContain("className=\"resize-size-badge\"");
    expect(styles).toContain(".canvas-floating-toolbar");
    expect(styles).toContain(".canvas-floating-toolbar-wrapper");
    expect(styles).toContain(".resize-size-badge");
    expect(styles).toContain(".scale-handle:hover");
    expect(styles).toContain(".terminal-dot:not(.disabled):hover");
    expect(styles).toContain(".diagram-node:not(.bus-node):not(.storage-node):hover .node-hitbox");
    expect(styles).toContain(".edge-endpoint-handle:hover");
    expect(styles).toContain(".connect-drop-hint-halo");
    expect(styles).toContain(".diagram-canvas.connect-drop-ready .connection-preview-line");
    expect(styles).toContain(".connection-group:hover .connection-line");
    expect(styles).toContain(".manual-segment-handle:hover");
    expect(styles).toContain(".diagram-node.selected .terminal-dot:not(.disabled)");
    expect(styles).toContain(".node-toolbar");
  });

  test("keeps floating toolbars uniformly scaled while canvas dimensions change", async () => {
    const source = await readAppSource();
    const toolbarStart = source.indexOf("const nodeFloatingToolbarActionCount =");
    const toolbarEnd = source.indexOf("const resizeSizeHint =", toolbarStart);
    const toolbarBlock = source.slice(toolbarStart, toolbarEnd);

    expect(toolbarBlock).toContain("const svgToolbarUiUnit = Math.max(svgUiUnitX, svgUiUnitY);");
    expect(toolbarBlock).toContain("const toolbarPaddingX = 8 * svgToolbarUiUnit;");
    expect(toolbarBlock).toContain("const toolbarPaddingY = 8 * svgToolbarUiUnit;");
    expect(toolbarBlock).toContain("const width = nodeFloatingToolbarWidth * svgToolbarUiUnit;");
    expect(toolbarBlock).toContain("const height = NODE_FLOATING_TOOLBAR_HEIGHT * svgToolbarUiUnit;");
    expect(toolbarBlock).toContain("CANVAS_FLOATING_TOOLBAR_GAP * svgToolbarUiUnit");
    expect(toolbarBlock).toContain("scaleX: svgToolbarUiUnit");
    expect(toolbarBlock).toContain("scaleY: svgToolbarUiUnit");
    expect(toolbarBlock).not.toContain("scaleX: svgUiUnitX");
    expect(toolbarBlock).not.toContain("scaleY: svgUiUnitY");
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
    expect(source).toContain("buildCanvasLayoutUnits(activeLayerGroups, activeLayerNodes, activeSelectedNodeIds, activeSelectedEdgeIds, activeLayerEdges, routedEdges)");
    expect(layoutBlock).toContain("layoutNodes(nodes, selectedLayoutUnits)");
    expect(layoutBlock).toContain("const selected = new Set(layoutNodeIds)");
    expect(source).toContain("if (!activeLayerEdgeIdSet.has(edgeId))");
    expect(source).toContain("const visibleNodeSpatialIndex = visibleProject.nodeSpatialIndex");
  });

  test("selects visible operable nodes and connection lines for Ctrl+A copy paste", async () => {
    const source = await readAppSource();
    const keyStart = source.indexOf("const handleKeyDown =");
    const keyEnd = source.indexOf("window.addEventListener(\"keydown\"", keyStart);
    const keyBlock = source.slice(keyStart, keyEnd);
    const ctrlAStart = keyBlock.indexOf("event.key.toLowerCase() === \"a\"");
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
    const renderStart = source.indexOf("{selectedGroupLayoutUnits.map");
    const renderEnd = source.indexOf("{viewportNodes.map", renderStart);
    const renderBlock = source.slice(renderStart, renderEnd);
    const edgeRenderStart = source.indexOf("{viewportRoutedEdges.map((route) =>");
    const edgeRenderEnd = source.indexOf("{selectedGroupLayoutUnits.map", edgeRenderStart);
    const edgeRenderBlock = source.slice(edgeRenderStart, edgeRenderEnd);
    const nodeRenderStart = source.indexOf("{viewportNodes.map((node) =>");
    const nodeRenderEnd = source.indexOf("{renderMultiNodeDragOverlay()}", nodeRenderStart);
    const nodeRenderBlock = source.slice(nodeRenderStart, nodeRenderEnd);

    expect(source).toContain("type GroupTransformNodeSnapshot");
    expect(source).toContain("type GroupTransformEdgeRouteSnapshot");
    expect(source).toContain("function groupTransformSvgTransform");
    expect(source).toContain("const selectedGroupLayoutUnits = useMemo");
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
    expect(pointerBlock).toContain("proportionalScale: event.shiftKey");
    expect(pointerBlock).toContain("buildGroupTransformNodeUpdates(transformForMove, point, currentStore)");
    expect(groupPointerBlock).not.toContain("patchGraphNodes");
    expect(pointerBlock).toContain("previewPoint: point");
    expect(finishTransformBlock).toContain("activeTransform.nodeIds");
    expect(finishTransformBlock).toContain("buildGroupTransformNodeUpdates(activeTransform, finalPreviewPoint, current)");
    expect(finishTransformBlock).toContain("graphStorePatchGraphFromArrays");
    expect(finishTransformBlock).toContain("rebuildEdgesAfterNodeGeometryChange(nodes, transformedNodeIds)");
    expect(edgeRenderBlock).toContain("groupTransformPreviewEdgeIdSet.has(edge.id)");
    expect(nodeRenderBlock).toContain("groupTransformPreviewNodeIdSet.has(node.id)");
    expect(mirrorBlock).toContain("selectedLayoutUnits");
    expect(source).toContain("unit.kind === \"group\"");
    expect(mirrorBlock).toContain("mirrorLayoutUnitNodes");
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

    expect(layoutBlock).toContain("buildCanvasLayoutUnits(activeLayerGroups, activeLayerNodes, activeSelectedNodeIds, activeSelectedEdgeIds, activeLayerEdges, routedEdges)");
    expect(source).toContain("const buildGroupTransformEdgeUpdates");
    expect(previewBlock).toContain("transformDrag.originalEdgeRoutes.flatMap");
    expect(previewBlock).toContain("const geometry = groupTransformGeometry(transformDrag, transformDrag.previewPoint)");
    expect(previewBlock).toContain("transformGroupPoint(transformDrag, geometry, routePoint)");
    expect(source).toContain("className=\"group-transform-photo-content\"");
    expect(source).toContain("transform={groupTransformPreviewTransform}");
    expect(finishTransformBlock).toContain("const transformedEdgeUpdates = buildGroupTransformEdgeUpdates(activeTransform, finalPreviewPoint, current)");
    expect(finishTransformBlock).toContain("const transformedRouteEdgeIds = new Set(transformedEdgeUpdates.map((edge) => edge.id))");
    expect(finishTransformBlock).toContain("rebuildEdgesAfterNodeGeometryChange(nextNodes, transformedNodeIds, transformedEdges, transformedRouteEdgeIds)");
  });

  test("mirrors node rotation and selected group routes through the same layout axis", async () => {
    const source = await readAppSource();
    const mirrorStart = source.indexOf("const mirrorSelectedNodes");
    const mirrorEnd = source.indexOf("const updateCanvasSize", mirrorStart);
    const mirrorBlock = source.slice(mirrorStart, mirrorEnd);
    const layoutMirrorStart = source.indexOf("const mirrorLayoutUnitNodes");
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
    expect(mirrorBlock).toContain("const mirroredEdges = overlayEdgeUpdatesForTransform(edges, mirroredEdgeUpdates)");
    expect(mirrorBlock).toContain("rebuildEdgesAfterNodeGeometryChange(nextNodes, transformedNodeIds, mirroredEdges, preservedMirrorEdgeIds)");
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
    expect(source).toContain("const rotateLayoutUnitNodes");
    expect(source).toContain("const buildRotateLayoutUnitEdgeUpdates");
    expect(rotateBlock).toContain("const degrees = direction === \"left\" ? -90 : 90");
    expect(rotateBlock).toContain("rotateLayoutUnitNodes(nodes, selectedLayoutUnits, degrees)");
    expect(rotateBlock).toContain("const rotatedEdgeUpdates = buildRotateLayoutUnitEdgeUpdates");
    expect(rotateBlock).toContain("const preservedRotateEdgeIds = new Set(rotatedEdgeUpdates.map((edge) => edge.id))");
    expect(rotateBlock).toContain("rebuildEdgesAfterNodeGeometryChange(nextNodes, transformedNodeIds, rotatedEdges, preservedRotateEdgeIds)");
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
    expect(commitBlock).toContain("routingNodesForConnectionEdge(newEdge)");
    expect(commitBlock).toContain("canvasBounds");
    expect(commitBlock).toContain("routedEdges");
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
    expect(helperBlock).toContain("const localEdges = currentEdges === edges");
    expect(helperBlock).toContain("edgeListForNodeIds(changedIds)");
    expect(helperBlock).toContain("routingNodesForConnectionEdges(rerouteEdges, nextNodes, changedIds)");
    expect(helperBlock).toContain("rebuildConnectionRoutesForNodes(routingNodes, rerouteEdges, changedIds, canvasBounds, rerouteEdges)");
    expect(helperBlock).toContain("dirtyEdgeIdsAfterMove(rerouteEdges, nextLocalEdges, changedIds)");
    expect(helperBlock).toContain("markRouteEdgesDirty");
    expect(helperBlock).toContain("markStoredRouteEdgesDirty");
    expect(updateBlock).toContain("const geometryPatch");
    expect(updateBlock).toContain("rebuildEdgesAfterNodeGeometryChange(nextNodes, [selectedNodeId])");
    expect(mirrorBlock).toContain("rebuildEdgesAfterNodeGeometryChange(nextNodes, transformedNodeIds, mirroredEdges, preservedMirrorEdgeIds)");
    expect(finishTransformBlock).toContain("transformDragChangedRef.current");
    expect(finishTransformBlock).toContain("rebuildEdgesAfterNodeGeometryChange(nodes, transformedNodeIds)");
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
    const renderStart = source.indexOf("{viewportNodes.map((node) =>");
    const renderEnd = source.indexOf("{renderGroupTransformPhotoPreview()}", renderStart);
    const renderBlock = source.slice(renderStart, renderEnd);

    expect(source).toContain("type SingleTransformDrag");
    expect(source).toContain("const startSingleTransformDrag");
    expect(source).toContain("const singleTransformBaseNode");
    expect(source).toContain("const signedScaleFromScreenHandleDelta");
    expect(source).toContain("startPoint: Point");
    expect(helperStart).toBeGreaterThan(-1);
    expect(helperBlock).toContain("rotation");
    expect(helperBlock).toContain("screenAxis");
    expect(helperBlock).toContain("localVector");
    expect(pointerBlock).toContain("const baseNode = singleTransformBaseNode(transformDrag, node);");
    expect(pointerBlock).toContain("toLocalNodePoint(baseNode, point)");
    expect(pointerBlock).not.toContain("toLocalNodePoint(node, point)");
    expect(pointerBlock).toContain("const localScaleKind = event.shiftKey || transformDrag.kind === \"scale-both\"");
    expect(pointerBlock).toContain("localScaleKindForScreenHandle(transformDrag.kind, baseNode.rotation)");
    expect(pointerBlock).toContain("if (localScaleKind === \"scale-x\")");
    expect(pointerBlock).toContain("} else if (localScaleKind === \"scale-y\")");
    expect(pointerBlock).toContain("const currentSignedScaleX = getNodeScaleX(baseNode);");
    expect(pointerBlock).toContain("const currentSignedScaleY = getNodeScaleY(baseNode);");
    expect(pointerBlock).toContain("scaleY: currentSignedScaleY");
    expect(pointerBlock).toContain("scaleX: currentSignedScaleX");
    expect(renderBlock).toContain("startSingleTransformDrag(event, node, \"rotate\")");
    expect(renderBlock).toContain("startSingleTransformDrag(event, node, handle.kind, handle)");
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

    expect(source).toContain("type CanvasResizeEdge");
    expect(source).toContain("const [canvasResizeDrag, setCanvasResizeDrag]");
    expect(source).toContain("const startCanvasResize");
    expect(source).toContain("minimumCanvasBoundsForContent");
    expect(source).toContain("canvas-resize-handle-right");
    expect(styles).toContain(".canvas-resize-handle-right");
    expect(styles).toContain(".canvas-resize-handle-corner");
    expect(pasteBlock).toContain("pastedCanvasBounds");
    expect(pasteBlock).toContain("applyCanvasBounds(pastedCanvasBounds, pasteOriginShift)");
    expect(pasteBlock).not.toContain("粘贴位置超过显示边界");
    expect(moveBlock).toContain("canvasBoundsForMoveDelta");
    expect(moveBlock).toContain("commitFastMovedGraphPatches(");
    expect(updateBlock).toContain("selectedNodeCanvasBounds");
    expect(updateBlock).toContain("applyCanvasBounds(selectedNodeCanvasBounds)");
    expect(dropBlock).toContain("dropCanvasBounds");
    expect(dropBlock).toContain("applyCanvasBounds(dropCanvasBounds, dropOriginShift)");
  });

  test("keeps canvas edge resizing anchored instead of recentering or changing zoom scale", async () => {
    const source = await readAppSource();
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

    expect(centerBlock).toContain("}, [canvasCenterRequest]);");
    expect(centerBlock).not.toContain("}, [canvasCenterRequest, canvasHeight, canvasWidth]);");
    expect(startResizeBlock).toContain("unitsPerCssX: svgRect.width > 0 ? canvasBounds.width / svgRect.width : 1");
    expect(startResizeBlock).toContain("unitsPerCssY: svgRect.height > 0 ? canvasBounds.height / svgRect.height : 1");
    expect(applyBlock).toContain("const nextViewBoxSize = scaledViewBoxSizeForBounds(current, canvasBounds, nextBounds);");
    expect(applyBlock).toContain("...clampViewBoxDimensionsForZoom(nextViewBoxSize, nextBounds)");
    expect(resizeBlock).toContain("setCanvasResizeDraft");
    expect(resizeBlock).toContain("requestAnimationFrame");
    expect(resizeBlock).not.toContain("applyCanvasBounds(clampedBounds);");
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
    const pointerMoveStart = source.indexOf("const handlePointerMove = (event: PointerEvent<SVGSVGElement>)");
    const pointerMoveEnd = source.indexOf("const handleWheel", pointerMoveStart);
    const pointerMoveBlock = source.slice(pointerMoveStart, pointerMoveEnd);
    const pointerDownStart = source.indexOf("onPointerDown={(event) => {");
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
    expect(dropBlock).toContain("const dropOriginShift = leftTopCanvasOriginShiftForContent([...nodes, rawNode], edges);");
    expect(dropBlock).toContain("translateNodeBy(rawNode, dropOriginShift)");
    expect(dropBlock).toContain("translateEdgeBy(edge, dropOriginShift)");
    expect(dropBlock).toContain("shiftCachedRoutesForCanvasOrigin(dropOriginShift);");
    expect(dropBlock).toContain("markBusTerminalSyncDirtyForEdges(dropSourceEdges);");
    expect(dropBlock.indexOf("applyCanvasBounds(dropCanvasBounds, dropOriginShift);")).toBeLessThan(
      dropBlock.indexOf("shiftCachedRoutesForCanvasOrigin(dropOriginShift);")
    );
    expect(dropBlock.indexOf("shiftCachedRoutesForCanvasOrigin(dropOriginShift);")).toBeLessThan(
      dropBlock.indexOf("clampNodePositionToBounds(node, dropCanvasBounds")
    );
    expect(dropBlock.indexOf("applyCanvasBounds(dropCanvasBounds, dropOriginShift);")).toBeLessThan(
      dropBlock.indexOf("setGraphArrays([...dropSourceNodes, indexed.node], dropSourceEdges);")
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
    expect(topbarBlock).toContain("onChange={importModelFile}");
    expect(topbarBlock).not.toContain("openModelImportFilePicker()");
    expect(topbarBlock).not.toContain("exportCurrentModelFile");
    expect(topbarBlock).not.toContain("aria-label=\"导入模型文件\"");
    expect(topbarBlock).not.toContain("aria-label=\"导出当前模型文件\"");
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
    expect(source).toContain("frame.addEventListener(\"scroll\", handleCanvasFrameScroll");
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

  test("scales the canvas scroll surface with viewport zoom instead of clipping zoomed content", async () => {
    const source = await readAppSource();
    const canvasRenderStart = source.indexOf("<section className=\"canvas-frame\"");
    const canvasRenderEnd = source.indexOf("onDrop={handleDrop}", canvasRenderStart);
    const canvasRenderBlock = source.slice(canvasRenderStart, canvasRenderEnd);

    expect(source).toContain("function canvasScrollScaleFromViewBox");
    expect(source).toContain("function canvasFullViewBoxFromBounds");
    expect(source).toContain("const canvasDisplayWidth = Math.max(1, Math.round(canvasBounds.width * canvasScrollScale.x))");
    expect(source).toContain("const canvasDisplayHeight = Math.max(1, Math.round(canvasBounds.height * canvasScrollScale.y))");
    expect(source).toContain("syncCanvasFrameScrollToViewBox");
    expect(source).toContain("visibleCanvasViewBoxFromRects(frame.getBoundingClientRect(), svg.getBoundingClientRect(), canvasFullViewBoxRef.current)");
    expect(canvasRenderBlock).toContain("style={{ width: canvasDisplayWidth, height: canvasDisplayHeight }}");
    expect(canvasRenderBlock).toContain("viewBox={`0 0 ${canvasBounds.width} ${canvasBounds.height}`}");
    expect(canvasRenderBlock).not.toContain("viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}");
  });

  test("keeps manual canvas scrollbar movement as the scroll source of truth", async () => {
    const source = await readAppSource();
    const syncEffectStart = source.indexOf("useEffect(() => {\n    scheduleCanvasVisibleViewBoxUpdate();");
    const syncEffectEnd = source.indexOf("useLayoutEffect(() => {", syncEffectStart);
    const syncEffectBlock = source.slice(syncEffectStart, syncEffectEnd);
    const listenerStart = source.indexOf("useEffect(() => {\n    const frame = canvasFrameRef.current;");
    const listenerEnd = source.indexOf("useEffect(() => {\n    setCanvasSizeDraft", listenerStart);
    const listenerBlock = source.slice(listenerStart, listenerEnd);
    const wheelGuardStart = source.indexOf("const preventPageWheelZoom = (event: WheelEvent) => {");
    const wheelGuardEnd = source.indexOf("window.addEventListener(\"wheel\", preventPageWheelZoom", wheelGuardStart);
    const wheelGuardBlock = source.slice(wheelGuardStart, wheelGuardEnd);
    const wheelStart = source.indexOf("const handleWheel = (event: React.WheelEvent<SVGSVGElement>) => {");
    const wheelEnd = source.indexOf("const deleteSelected = () => {", wheelStart);
    const wheelBlock = source.slice(wheelStart, wheelEnd);

    expect(source).toContain("const handleCanvasFrameScroll = () => {");
    expect(source).toContain("canvasFrameUserScrollRef.current = true;");
    expect(listenerBlock).toContain("frame.addEventListener(\"scroll\", handleCanvasFrameScroll, { passive: true });");
    expect(listenerBlock).toContain("frame.removeEventListener(\"scroll\", handleCanvasFrameScroll);");
    expect(listenerBlock).not.toContain("frame.addEventListener(\"scroll\", scheduleCanvasVisibleViewBoxUpdate");
    expect(syncEffectBlock).toContain("}, [canvasDisplayHeight, canvasDisplayWidth]);");
    expect(syncEffectBlock).not.toContain("viewBox");
    expect(wheelGuardBlock).toContain("event.ctrlKey || event.metaKey");
    expect(wheelGuardBlock).not.toContain("if ((event.target as Element | null)?.closest(\".diagram-canvas\"))");
    expect(wheelBlock).toContain("if (!event.ctrlKey && !event.metaKey)");
    expect(wheelBlock.indexOf("if (!event.ctrlKey && !event.metaKey)")).toBeLessThan(wheelBlock.indexOf("event.preventDefault();"));
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

    expect(visibleProjectBlock).toContain("allModelLayersVisible");
    expect(visibleProjectBlock).toContain("return { nodes, edges, nodeSpatialIndex: graphStore.nodeSpatialIndex }");
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
    expect(dragStartBlock).toContain("const originalRoutePointsForDrag = Object.fromEntries(\n      affectedEdgesForDrag.map");
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
    expect(finishBlock).not.toContain("? activeDragging.affectedEdges");
    expect(finishBlock).toContain("hasAffectedEdges\n      ? adjustEdgesAfterNodeMove");
    expect(finishBlock).toContain("adjustedAffectedEdges,\n          activeDragging.nodeIds");
    expect(moveBlock).not.toContain("? affectedEdgesForMove");
    expect(moveBlock).toContain("affectedEdgesForMove.length > 0\n      ? adjustEdgesAfterNodeMove");
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
    expect(deferBlock).toContain("scheduleDeferredMovedConnectionRepair(movedNodeIds, committedCandidateEdges, expectedPatch, commitCanvasBounds);");
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
    expect(finishBlock).toContain("routePreserveEdgeIdsForMovedNodes(activeDragging.affectedEdges, activeDragging.nodeIds, activeDragging.edgeIds)");
    expect(moveBlock).toContain("routePreserveEdgeIdsForMovedNodes(affectedEdgesForMove, moveNodeIds, moveEdgeIds)");
    expect(finishBlock).not.toContain("new Set(activeDragging.edgeIds),\n          finalBounds");
    expect(moveBlock).not.toContain("new Set(moveEdgeIds),\n          finalBounds");
  });

  test("preserves directly affected connection preview geometry when a move expands the canvas origin", async () => {
    const source = await readAppSource();
    const adjustStart = source.indexOf("const adjustEdgesAfterNodeMove =");
    const adjustEnd = source.indexOf("const rebuildSingleAffectedConnectionRoute", adjustStart);
    const adjustBlock = source.slice(adjustStart, adjustEnd);

    expect(adjustBlock).toContain("const preserveAffectedRoutesForCanvasOriginShift = hasCanvasOriginShift(leftTopCanvasOriginShiftForContent(nextNodes));");
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
    expect(scheduleBlock).toContain("const blockedRoutePoints = routePointsForMovedNodeBlockers(expectedNodes, optimizationEdges, movedNodeIds, {});");
    expect(scheduleBlock).toContain("const blockedEdgeIds = new Set(Object.keys(blockedRoutePoints));");
    expect(scheduleBlock).toContain("!shouldRunDeferredMoveOptimization(optimizationEdges, movedNodeIds, selectedEdgeIds, blockedEdgeIds)");
    expect(scheduleBlock).toContain("const dirtyOptimizedEdgeIds = new Set<string>([...blockedEdgeIds, ...forcedRerouteEdgeIds]);");
    expect(scheduleBlock).not.toContain("new Set<string>(optimizationEdges.map");
    expect(scheduleBlock).toContain("blockedRoutePoints");
    expect(scheduleBlock).not.toContain("dirtyEdgeIdsAfterMove(\n        expectedEdges,\n        optimized.edges,\n        movedNodeIds");
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
    expect(helperBlock).toContain("routeIntersectsSpecificNodes(route.points, edge, blockers)");
    expect(scheduleBlock).toContain("const movedBlockerRoutePoints = routePointsForMovedNodeBlockers");
    expect(scheduleBlock).toContain("const stationaryBlockerRoutePoints = routePointsForMovedEdgesBlockedByStationaryNodes");
    expect(scheduleBlock).toContain("const repairRoutePoints = { ...movedBlockerRoutePoints, ...stationaryBlockerRoutePoints };");
    expect(scheduleBlock).toContain("const repairEdgeIds = new Set(Object.keys(repairRoutePoints));");
    expect(scheduleBlock).toContain("if (repairEdgeIds.size === 0)");
    expect(scheduleBlock).toContain("const repairCandidateEdges = latestCandidateEdges.filter((edge) => repairEdgeIds.has(edge.id));");
    expect(scheduleBlock).toContain("repairCandidateEdges");
    expect(scheduleBlock).not.toContain("repairedEdges,\n        movedNodeIds,\n        repairCanvasBounds,\n        repairedEdges");
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

  test("routes connection lines around device labels and the device-label gap", async () => {
    const source = await readModelSource();
    const blockerStart = source.indexOf("function routeBlockerBox");
    const blockerEnd = source.indexOf("export function calculateModelContentSize", blockerStart);
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
    expect(overlapBlock).toContain("dragging && draggingDelta && !suppressDragTerminalInteraction ? dragInteractionNodes : viewportNodes");
    expect(overlapBlock).toContain("if (suppressDragTerminalInteraction)");
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
    expect(undoActionBlock).toContain("markRouteEdgesDirty(new Set([");
    expect(undoActionBlock).toContain("...snapshot.edges.map((edge) => edge.id)");
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
    const multiPreviewStart = previewBlock.indexOf("if (isMultiNodeMoveState(dragging))");
    const multiPreviewEnd = previewBlock.indexOf("const draggedEdgeIds", multiPreviewStart);
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
    expect(source).toContain("const buildMultiNodeDragOverlayPreview");
    expect(source).toContain("overlayPreview: isMultiNodeMoveState({ nodeIds: dragNodeIds })");
    expect(source).toContain("const ensureDraggingUndoSnapshot");
    expect(source).toContain("const canvasBoundsForMovedNodeDelta");
    expect(dragDeltaBlock).toContain("if (isMultiNodeMoveState(dragState))");
    expect(dragDeltaBlock).toContain("canvasBoundsForMovedNodeDelta(");
    expect(dragDeltaBlock).toContain("return boundedDeltaForNodes(");
    expect(dragDeltaBlock).toContain("return boundedDeltaForMoveGeometry(");
    expect(dragMoveBlock).toContain("if (!isMultiNodeMoveState(currentDrag) && !currentDrag.historyCaptured");
    expect(dragMoveBlock).toContain("if (!isMultiNodeMoveState(currentDrag))");
    expect(keyboardMoveBlock).toContain("isMultiNodeMoveState(activeDragging)");
    expect(keyboardMoveBlock).toContain("? boundedDeltaForNodes(");
    expect(keyboardMoveBlock).toContain("canvasBoundsForMovedNodeDelta(");
    expect(keyboardMoveBlock).toContain("if (!isMultiNodeMoveState(activeDragging) && !activeDragging.historyCaptured");
    expect(keyboardMoveBlock).toContain("if (!isMultiNodeMoveState(activeDragging))");
    expect(moveSelectionBlock).toContain("moveNodeIds.length > 1");
    expect(moveSelectionBlock).toContain("? boundedDeltaForNodes(");
    expect(finishMoveBlock).toContain("ensureDraggingUndoSnapshot();");
    expect(finishMoveBlock).toContain("const effectiveSnapTarget = isMultiNodeMoveState(activeDragging) ? null : snapTarget;");
    expect(finishDragBlock).toContain("ensureDraggingUndoSnapshot();");
    expect(finishDragBlock).toContain("const effectiveSnapTarget = isMultiNodeMoveState(activeDragging) ? null : nodeTerminalSnapTarget;");
    expect(interactionBlock).toContain("isMultiNodeMoveState(dragging)");
    expect(interactionBlock).toContain("const suppressDragTerminalInteraction");
    expect(interactionBlock).toContain("if (suppressDragTerminalInteraction)");
    expect(interactionBlock).toContain("!isMultiNodeMoveState(dragging)");
    expect(previewBlock).toContain("isMultiNodeMoveState(dragging)");
    expect(multiPreviewBlock).toContain("return []");
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
    expect(dragMoveBlock).toContain("applyCanvasBounds(canvasBoundsForMovedNodeDelta(currentDrag.nodeIds, currentDrag.originalPositions, boundedDelta.x, boundedDelta.y));");
    expect(keyboardMoveBlock).toContain("applyCanvasBounds(canvasBoundsForMovedNodeDelta(activeDragging.nodeIds, activeDragging.originalPositions, boundedDelta.x, boundedDelta.y));");
    expect(commitBlock).toContain("effectiveCanvasBounds: CanvasBounds = canvasBounds");
    expect(commitBlock).toContain("shiftCachedRoutesForCanvasOrigin(originShift);");
    expect(commitBlock).toContain("const candidateEdgeIds = committedCandidateEdges.map((edge) => edge.id);");
    expect(commitBlock).toContain("markStoredRouteEdgesDirty(candidateEdgeIds);");
    expect(commitBlock).not.toContain("markStoredRouteEdgesDirty(shiftedNextEdges.map((edge) => edge.id));");
    expect(commitBlock).toContain("canvasBoundsForGraphContent(effectiveCanvasBounds, nextNodes, committedCandidateEdges, [], CANVAS_AUTO_EXPAND_PADDING)");
    expect(commitBlock).toContain("scheduleDeferredMovedConnectionRepair(movedNodeIds, committedCandidateEdges, expectedPatch, commitCanvasBounds);");
    expect(commitBlock).toContain("expandCanvasToFitGraph(nextNodes, nextEdgesForBounds, [], CANVAS_AUTO_EXPAND_PADDING, commitCanvasBounds);");
    expect(finishMoveBlock).toContain("nodes,\n      finalBounds");
    expect(finishDragBlock).toContain("nodes,\n      finalBounds");
    expect(moveSelectionBlock).toContain("nodes,\n      finalBounds");
    expect(updateBlock).toContain("nodes,\n        selectedNodeCanvasBounds");
  });

  test("preserves moved connection geometry before left or top canvas expansion shifts origin", async () => {
    const source = await readAppSource();
    const helperStart = source.indexOf("const clampNodePositionToExpandableBounds");
    const helperEnd = source.indexOf("const scheduleCanvasVisibleViewBoxUpdate", helperStart);
    const helperBlock = source.slice(helperStart, helperEnd);
    const adjustStart = source.indexOf("const adjustEdgesAfterNodeMove =");
    const adjustEnd = source.indexOf("const routePointsForMovedNodeBlockers", adjustStart);
    const adjustBlock = source.slice(adjustStart, adjustEnd);

    expect(helperBlock).toContain("const clampPointToExpandableBounds");
    expect(helperBlock).toContain("const clampEdgeGeometryToExpandableBounds");
    expect(adjustBlock).toContain("position: clampNodePositionToExpandableBounds(");
    expect(adjustBlock).toContain("const boundedNextEdge = clampEdgeGeometryToExpandableBounds(nextEdge, bounds);");
    expect(adjustBlock).not.toContain("clampEdgeGeometryToBounds(nextEdge, canvasBounds)");
  });

  test("moves multi-node drag previews through one SVG overlay transform without React state churn", async () => {
    const source = await readAppSource();
    const styles = await readStyles();
    const dragMoveStart = source.indexOf("const applyNodeDragMove");
    const dragMoveEnd = source.indexOf("const scheduleNodeDragMove", dragMoveStart);
    const dragMoveBlock = source.slice(dragMoveStart, dragMoveEnd);
    const multiMoveStart = dragMoveBlock.indexOf("if (isMultiNodeMoveState(currentDrag))");
    const multiMoveEnd = dragMoveBlock.indexOf("const nextDragState", multiMoveStart);
    const multiMoveBlock = dragMoveBlock.slice(multiMoveStart, multiMoveEnd);
    const overlayStart = source.indexOf("const renderMultiNodeDragOverlay");
    const overlayEnd = source.indexOf("const groupTransformPreviewNodeFromSnapshot", overlayStart);
    const overlayBlock = source.slice(overlayStart, overlayEnd);
    const commitStart = source.indexOf("const commitFastMovedGraphPatches");
    const commitEnd = source.indexOf("const clampPointToCanvas", commitStart);
    const commitBlock = source.slice(commitStart, commitEnd);

    expect(source).toContain("const multiNodeDragOverlayRef");
    expect(source).toContain("const updateMultiNodeDragOverlayTransform");
    expect(source).toContain("const scheduleDeferredMovedConnectionRepair");
    expect(source).toContain("const deferredSelectedNode = useDeferredValue(selectedNode)");
    expect(source).toContain("const inspectorSelectedNode = selectedNode && deferredSelectedNode?.id === selectedNode.id");
    expect(source).toContain("const inspectorTopologyErrors = useDeferredValue(topologyErrors)");
    expect(source).toContain("const deferredElementTreeRevision = useDeferredValue(graphStore.elementTreeRevision)");
    expect(source).toContain("multiNodeDragOverlayRef.current.setAttribute(\"transform\"");
    expect(multiMoveBlock).toContain("updateMultiNodeDragOverlayTransform(boundedDelta)");
    expect(multiMoveBlock).not.toContain("setDragging");
    expect(commitBlock).toContain("const deferMovedRouteRepair = movedNodeIds.length > 1");
    expect(commitBlock).toContain("scheduleDeferredMovedConnectionRepair(");
    expect(overlayBlock).toContain("className=\"multi-node-drag-overlay\"");
    expect(overlayBlock).not.toContain("multiNodeDragDegradedPreview");
    expect(source).toContain("className={`diagram-canvas ${connectSource ? \"connect-mode\" : \"\"} ${staticDrawing ? \"static-draw-mode\" : \"\"} ${activeDropReady ? \"connect-drop-ready\" : \"\"} ${panning ? \"panning\" : \"\"} ${multiNodeDragging ? \"multi-node-dragging\" : \"\"}`}");
    expect(source).toContain("<g className=\"canvas-content\">");
    expect(source).not.toContain("if (multiNodeDragging && draggingNodeIdSet.has(node.id)) {\n                return null;");
    expect(source).toContain("{selectedGroupLayoutUnits.map");
    expect(source).not.toContain("{!multiNodeDragging && selectedGroupLayoutUnits.map");
    expect(source).toContain("dragging?.historyCaptured && !multiNodeDragging && dragging.nodeIds.map");
    expect(styles).toContain(".multi-node-drag-overlay");
    expect(styles).toContain(".diagram-canvas.multi-node-dragging .canvas-content");
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
    const renderStart = source.indexOf("{viewportRoutedEdges.map((route) =>");
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

  test("keeps rotated bus graphics from inflating multi-node drag preview bounds", async () => {
    const source = await readAppSource();
    const previewStart = source.indexOf("const buildMultiNodeDragOverlayPreview");
    const previewEnd = source.indexOf("const renderMultiNodeDragOverlay", previewStart);
    const previewBlock = source.slice(previewStart, previewEnd);
    const renderStart = source.indexOf("{viewportNodes.map((node) =>");
    const renderEnd = source.indexOf("{selected && focused", renderStart);
    const nodeRenderBlock = source.slice(renderStart, renderEnd);

    expect(source).toContain("const nodeHasUprightBoundsContent");
    expect(previewBlock).toContain("const includeUprightContentInBounds = nodeHasUprightBoundsContent(");
    expect(previewBlock).toContain("const halfExtents = nodeTransformedHalfExtents(node, includeUprightContentInBounds)");
    expect(previewBlock).not.toContain("nodeTransformedHalfExtents(node, true)");
    expect(nodeRenderBlock).toContain("const includeUprightContentInHandles = nodeHasUprightBoundsContent(");
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
    const layoutStart = source.indexOf("const applySelectedNodeLayout");
    const layoutEnd = source.indexOf("const handleWheel", layoutStart);
    const layoutBlock = source.slice(layoutStart, layoutEnd);

    expect(helperStart).toBeGreaterThan(-1);
    expect(helperBlock).toContain("routeEdgesForStoredRendering(compactPreviewNodes(source, target), [edge], bounds)");
    expect(helperBlock).toContain("routedEdgeById.get(edge.id)?.points");
    expect(keyboardBlock).toContain("currentStoredRoutePointsForEdge(edge)");
    expect(moveBlock).toContain("currentStoredRoutePointsForEdge(edge)");
    expect(transformBlock).toContain("currentStoredRoutePointsForEdge(edgeById.get(edgeId))");
    expect(transformBlock).toContain("currentStoredRoutePointsForEdge(edge)");
    expect(dragBlock).toContain("currentStoredRoutePointsForEdge(edge)");
    expect(layoutBlock).toContain("currentStoredRoutePointsForEdge(edge)");
  });

  test("renders device labels as scalable upright node-owned graphics with a global visibility toggle", async () => {
    const source = await readAppSource();
    const renderStart = source.indexOf("{viewportNodes.map((node) =>");
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
    expect(renderBlock).toContain("onPointerDown={(event) => startNodeLabelDrag(event, node)}");
    expect(topbarBlock).toContain("setDeviceLabelsVisible((current) => !current)");
    expect(topbarBlock).toContain("aria-label={deviceLabelsVisible ? \"隐藏设备标识\" : \"显示设备标识\"}");
    expect(pointerMoveBlock).toContain("if (nodeLabelDrag && svgRef.current)");
    expect(pointerMoveBlock).toContain("_labelX");
    expect(pointerMoveBlock).toContain("_labelY");
  });

  test("selects device labels as node-owned graphics without turning them into standalone objects", async () => {
    const source = await readAppSource();
    const styles = await readStyles();
    const renderStart = source.indexOf("{viewportNodes.map((node) =>");
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
    expect(dragBlock).toContain("setGraphInfoView(\"selected\")");
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
    const renderStart = source.indexOf("{viewportNodes.map((node) =>");
    const renderEnd = source.indexOf("{terminalPressPreviewEdgeRoutes.map", renderStart);
    const renderBlock = source.slice(renderStart, renderEnd);
    const graphPanelStart = source.indexOf("graphInfoView === \"tree\"");
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
    expect(renderBlock).toContain("${nodeLabelVertical(node) ? \"vertical\" : \"horizontal\"}");
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
    const renderStart = source.indexOf("{viewportNodes.map((node) =>");
    const renderEnd = source.indexOf("{terminalPressPreviewEdgeRoutes.map", renderStart);
    const renderBlock = source.slice(renderStart, renderEnd);

    expect(source).toContain("function nodeLabelVerticalSegments");
    expect(source).toContain("nodeLabelNumericTokenPattern");
    expect(source).toContain("\\d+(?:[./:：-]\\d+)*");
    expect(renderBlock).toContain("nodeLabelVerticalSegments(nodeLabelText(node)).map");
    expect(renderBlock).toContain("className={`node-label-vertical-token ${segment.numeric ? \"numeric\" : \"\"}`}");
    expect(renderBlock).toContain("nodeLabelVerticalTokenY(index, nodeLabelVerticalSegments(nodeLabelText(node)).length, node)");
    expect(source).toContain("buildSvgNodeLabelTextMarkup(node)");
    expect(styles).toContain(".node-label-vertical-token.numeric");
    expect(styles).toContain("letter-spacing: 0");
  });

  test("offers device label content style and alignment editors in the graph panel", async () => {
    const source = await readAppSource();
    const graphPanelStart = source.indexOf("graphInfoView === \"tree\"");
    const graphPanelEnd = source.indexOf("{isStaticNode(inspectorSelectedNode)", graphPanelStart);
    const graphPanelBlock = source.slice(graphPanelStart, graphPanelEnd);

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
    expect(graphPanelBlock).toContain("<option value=\"middle\">居中</option>");
  });

  test("sets selected device label display mode from context menu and graph inspector", async () => {
    const source = await readAppSource();
    const contextStart = source.indexOf("{contextMenu && (");
    const contextEnd = source.indexOf("{projectMenu && (", contextStart);
    const contextBlock = source.slice(contextStart, contextEnd);
    const graphPanelStart = source.indexOf("graphInfoView === \"tree\"");
    const graphPanelEnd = source.indexOf("{isStaticNode(inspectorSelectedNode)", graphPanelStart);
    const graphPanelBlock = source.slice(graphPanelStart, graphPanelEnd);
    const renderStart = source.indexOf("{viewportNodes.map((node) =>");
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
    const topologyStaleStart = source.indexOf("拓扑结果已过期");

    expect(source).toContain("const scheduleIdleWork");
    expect(source).toContain("requestIdleCallback");
    expect(source).toContain("edgeEndpointRevision");
    expect(source).not.toContain("const connectionEndpointSignature");
    expect(busSyncEffectBlock).toContain("lastBusTerminalSyncEndpointRevisionRef.current === graphStore.edgeEndpointRevision");
    expect(busSyncEffectBlock).toContain("lastBusTerminalSyncEndpointRevisionRef.current = graphStore.edgeEndpointRevision");
    expect(source.slice(Math.max(0, busSyncStart - 300), busSyncStart + 300)).toContain("scheduleIdleWork");
    expect(saveDraftBlock).toContain("DRAFT_PROJECT_STORAGE_KEY");
    expect(saveDraftBlock).toContain("window.localStorage.setItem");
    expect(saveBlock).toContain("saveDraftProject(targetId");
    expect(saveBlock).toContain("saveDraftProject(record.id");
    expect(source).not.toContain("draftAutosaveProjectId");
    expect(source).not.toContain("saveDraftProject(draftAutosaveProjectId");
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
    expect(boundaryBlock).toContain("const nextNodes = orderedNodesForIds(nodes, relevantNodeIds).map");
    expect(boundaryBlock).not.toContain("const nextNodes = nodes.flatMap");
    expect(boundaryBlock).not.toContain("const nextNodes = nodes.map");
    expect(dirtyBlock).toContain("Object.keys(originalRoutePoints)");
    expect(dirtyBlock).not.toContain("for (const edge of edges)");
    expect(commitBlock).toContain("markStoredRouteEdgesDirty(dirtyEdgeIdsForMovedLocalRoutes");
    expect(commitBlock).not.toContain("markStoredRouteEdgesDirty(dirtyEdgeIdsAfterMove");
    expect(scheduleBlock).toContain("for (const edgeId of dirtyOptimizedEdgeIds)");
    expect(scheduleBlock).not.toContain("for (const edge of optimizationEdges)");
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
    expect(source).toContain("const busTerminalSyncNodeIdsForGraphPatch =");
    expect(source).toContain("const busNodeIdSet = graphStore.busNodeIdSet");
    expect(busSyncEffectBlock).toContain("busNodeIdSet.size === 0");
    expect(commitBlock).toContain("busTerminalSyncNodeIdsForGraphPatch(");
    expect(commitBlock).not.toContain("markBusTerminalSyncDirty(movedNodeIds)");
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
    expect(source).toContain("const deferredElementTreeRevision = useDeferredValue(graphStore.elementTreeRevision)");
    expect(elementTreeBlock).toContain("elementTreeCacheSignature(deferredElementTreeRevision, elementTreeLayerSignature, libraryTemplates)");
    expect(elementTreeBlock).not.toContain("elementTreeCacheSignature(deferredElementTreeNodes");
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
    const validationStart = source.indexOf("{inspectorTopologyErrors.length > 0 && (");
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

    expect(source).toContain("type GraphTemplate =");
    expect(source).toContain("sourceSize: { width: number; height: number }");
    expect(source).toContain("customGraphTemplateTypes");
    expect(source).toContain("customGraphTemplates");
    expect(source).toContain("CUSTOM_GRAPH_TEMPLATE_TYPES_STORAGE_KEY");
    expect(source).toContain("CUSTOM_GRAPH_TEMPLATES_STORAGE_KEY");
    expect(server).toContain("customGraphTemplateTypes");
    expect(server).toContain("customGraphTemplates");
    expect(leftPanelBlock).toContain("模板库");
    expect(leftPanelBlock).toContain("leftPanelTab === \"templates\"");
    expect(leftPanelBlock).toContain("renderTemplateLibraryPanel()");
    expect(source).toContain("groupGraphTemplatesByType");
    expect(source).toContain("renderGraphTemplatePreview");
    expect(source).toContain("renderTemplateLibraryPanel");
    expect(source).toContain("canAddTemplateFromSelection");
    expect(source).toContain("openAddTemplateDialog");
    expect(contextBlock).toContain("添加模板");
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

  test("routes line-like static symbols through an interactive canvas drawing interface", async () => {
    const source = await readAppSource();
    const model = await readModelSource();
    const styles = await readStyles();
    const dropStart = source.indexOf("const handleDrop =");
    const dropEnd = source.indexOf("const handleNodePointerDown", dropStart);
    const dropBlock = source.slice(dropStart, dropEnd);
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
    expect(dropBlock).toContain("isInteractiveStaticDrawingKind(kind)");
    expect(dropBlock).toContain("startInteractiveStaticDrawing(template, pointerPosition)");
    expect(pointerMoveBlock).toContain("updateInteractiveStaticDrawingPreview(pointer)");
    expect(pointerDownBlock).toContain("appendStaticDrawingPoint(pointer");
    expect(keyHandlerBlock).toContain("finishInteractiveStaticDrawing()");
    expect(keyHandlerBlock).toContain("cancelInteractiveStaticDrawing()");
    expect(source).toContain("{renderInteractiveStaticDrawingPreview()}");
    expect(styles).toContain(".static-drawing-preview-line");
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

  test("uses explicit model scheme and blank project-list context-menu actions", async () => {
    const source = await readAppSource();
    const projectPanelStart = source.indexOf("const renderProjectPanel = () => (");
    const projectPanelEnd = source.indexOf("const customDraftTerminalTypes", projectPanelStart);
    const projectPanelBlock = source.slice(projectPanelStart, projectPanelEnd);
    const projectContextStart = source.indexOf("{projectMenu && (");
    const projectContextEnd = source.indexOf("{pendingModelImportConflict && (", projectContextStart);
    const projectContextBlock = source.slice(projectContextStart, projectContextEnd);
    const modelLabels = ["模型删除", "模型导出", "模型导入", "模型重命名", "模型复制", "模型粘贴"];
    const schemeLabels = ["方案删除", "方案导出", "方案导入", "模型新建", "模型导入", "方案重命名", "方案复制", "模型粘贴", "方案粘贴"];
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
    expect(projectContextBlock).toContain("createBlankProject(projectMenu.schemeId)");
    expect(projectContextBlock).toContain("openModelImportFilePicker(projectMenu.schemeId)");
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
    expect(source).not.toContain("draftAutosaveProjectId");
    expect(source).not.toContain("saveDraftProject(draftAutosaveProjectId");
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
    const setterStart = source.indexOf("const [schemes, setSchemesState] = useState<SavedSchemeRecord[]>(initialSavedSchemes);");
    const setterEnd = source.indexOf("const [activeProjectId", setterStart);
    const setterBlock = source.slice(setterStart, setterEnd);
    const backendLoadStart = source.indexOf("const loadToken = ++backendSchemesLoadTokenRef.current;");
    const backendLoadEnd = source.indexOf("fetchBackendColorConfig()", backendLoadStart);
    const backendLoadBlock = source.slice(backendLoadStart, backendLoadEnd);
    const persistHelperStart = source.indexOf("const persistBackendSchemesPayload = (normalizedSchemesPayload: string) => {");
    const persistHelperEnd = source.indexOf("useEffect(() => {\n    fetchBackendSchemes()", persistHelperStart);
    const persistHelperBlock = source.slice(persistHelperStart, persistHelperEnd);
    const schemePersistStart = source.indexOf("const normalizedSchemesPayload = serializeSchemesForStorage(schemes);");
    const schemePersistEnd = source.indexOf("}, [schemes]);", schemePersistStart);
    const schemePersistBlock = source.slice(schemePersistStart, schemePersistEnd);
    const saveCallIndex = persistHelperBlock.indexOf("saveBackendSchemesPayload(normalizedSchemesPayload)");
    const persistedAssignmentIndex = persistHelperBlock.indexOf("lastPersistedSchemesPayloadRef.current = normalizedSchemesPayload");

    expect(source).toContain("const pendingBackendSchemesPayloadRef = useRef<string | null>(null)");
    expect(source).toContain("const backendSchemesLoadTokenRef = useRef(0)");
    expect(source).toContain("const schemesChangedBeforeBackendLoadRef = useRef(false)");
    expect(source).toContain("const latestSchemesRef = useRef<SavedSchemeRecord[]>(initialSavedSchemes)");
    expect(setterBlock).toContain("schemesChangedBeforeBackendLoadRef.current = true");
    expect(setterBlock).toContain("setSchemesState(value)");
    expect(backendLoadBlock).toContain("const localChangedBeforeBackendLoad = schemesChangedBeforeBackendLoadRef.current");
    expect(backendLoadBlock).toContain("const loadToken = ++backendSchemesLoadTokenRef.current");
    expect(backendLoadBlock).toContain("if (loadToken !== backendSchemesLoadTokenRef.current)");
    expect(backendLoadBlock).toContain("const currentSchemesPayload = serializeSchemesForStorage(latestSchemesRef.current)");
    expect(backendLoadBlock).toContain("if (localChangedBeforeBackendLoad)");
    expect(backendLoadBlock).toContain("persistBackendSchemesPayload(pendingPayload)");
    expect(backendLoadBlock).toContain("setSchemesState(backendSchemes)");
    expect(schemePersistBlock).toContain("suppressNextBackendSchemeSyncRef.current && normalizedSchemesPayload === lastPersistedSchemesPayloadRef.current");
    expect(schemePersistBlock).toContain("suppressNextBackendSchemeSyncRef.current = false;");
    expect(schemePersistBlock).toContain("pendingBackendSchemesPayloadRef.current = normalizedSchemesPayload");
    expect(schemePersistBlock).toContain("persistBackendSchemesPayload(normalizedSchemesPayload)");
    expect(saveCallIndex).toBeGreaterThan(-1);
    expect(persistedAssignmentIndex).toBeGreaterThan(saveCallIndex);
    expect(persistHelperBlock).toContain(".then(() => {");
    expect(persistHelperBlock).toContain("lastPersistedSchemesPayloadRef.current = normalizedSchemesPayload;");
    expect(persistHelperBlock).toContain("pendingBackendSchemesPayloadRef.current = null");
    expect(persistHelperBlock).toContain("writeOperationLog(\"方案/模型目录已自动保存到后台\")");
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
