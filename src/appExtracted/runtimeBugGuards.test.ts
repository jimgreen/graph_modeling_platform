import { readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import ts from "typescript";
import { describe, expect, test, vi } from "vitest";
import {
  createConfirmNodeDoubleClickDialog,
  createPointerInsideElementRect,
  createStartCanvasResizeFromBottomOverlay,
  createStartCanvasResizeFromLeftOverlay,
  createStartCanvasResizeFromRightOverlay,
  createStartCanvasResizeFromTopOverlay,
  createStopNodeDoubleClickDialogEvent,
  createStopSidePanelEventPropagation
} from "./appCanvasInteractionFactories";
import { createStopDeviceLibraryDialogEvent } from "./appDeviceDefinitionFactories";
import { createPushUndoSnapshot } from "./appGraphMeasurementFactories";
import { createAppHookCallback121, createAppHookCallback123 } from "./appToolbarHookFactories";
import { createRedoLastOperation, createUndoLastOperation } from "./appTransformDragFactories";
import { sharedElementRectCache } from "../lib/rafCoalescer";

const SRC_ROOT = resolve(process.cwd(), "src");

function collectProductionSourceFiles(dir: string): string[] {
  const result: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (["node_modules", ".git", ".worktrees", "dist", "tmp"].includes(entry.name)) {
      continue;
    }
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      result.push(...collectProductionSourceFiles(fullPath));
    } else if (/\.(ts|tsx)$/.test(entry.name) && !/\.test\.(ts|tsx)$/.test(entry.name)) {
      result.push(fullPath);
    }
  }
  return result;
}

const MUTABLE_SCOPE_STATE_KEYS = new Set([
  "nodes",
  "edges",
  "schemes",
  "activeProjectKey",
  "activeSchemeKey",
  "saveRequired",
  "canExportCurrentModel",
  "selectedIds",
  "selectedEdgeId",
  "projectName",
  "layers",
  "activeLayerId",
  "measurements",
  "colorDisplayMode",
  "themeMode",
  "deviceLabelsVisible",
  "deviceMeasurementsVisible",
  "customDeviceTemplates",
  "deviceDefinitionOverrides",
  "currentSpaceId",
  "spaces"
]);

describe("深层运行时缺陷静态与行为守卫 (Runtime Bug Guards)", () => {
  test("全仓 async 函数在 await 恢复后不得读取入口解构自 __appScope/scope 的陈旧状态", () => {
    const violations: string[] = [];

    for (const filePath of collectProductionSourceFiles(SRC_ROOT)) {
      const sourceText = readFileSync(filePath, "utf8");
      if (!sourceText.includes("await ")) continue;

      const sf = ts.createSourceFile(
        filePath,
        sourceText,
        ts.ScriptTarget.Latest,
        true,
        filePath.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS
      );

      const visit = (node: ts.Node) => {
        if (
          (ts.isArrowFunction(node) || ts.isFunctionExpression(node) || ts.isFunctionDeclaration(node)) &&
          node.modifiers?.some((m) => m.kind === ts.SyntaxKind.AsyncKeyword) &&
          node.body &&
          ts.isBlock(node.body)
        ) {
          const destructured = new Map<string, string>();
          let firstAwaitEnd = -1;

          const scanBody = (child: ts.Node) => {
            if (
              child !== node &&
              (ts.isArrowFunction(child) || ts.isFunctionExpression(child) || ts.isFunctionDeclaration(child))
            ) {
              return;
            }
            if (
              firstAwaitEnd === -1 &&
              ts.isVariableDeclaration(child) &&
              child.initializer &&
              ts.isIdentifier(child.initializer) &&
              (child.initializer.text === "__appScope" || child.initializer.text === "scope") &&
              ts.isObjectBindingPattern(child.name)
            ) {
              for (const el of child.name.elements) {
                const propName =
                  el.propertyName && ts.isIdentifier(el.propertyName)
                    ? el.propertyName.text
                    : ts.isIdentifier(el.name)
                      ? el.name.text
                      : "";
                const localName = ts.isIdentifier(el.name) ? el.name.text : "";
                if (MUTABLE_SCOPE_STATE_KEYS.has(propName) && localName) {
                  destructured.set(localName, propName);
                }
              }
            }
            if (firstAwaitEnd === -1 && ts.isAwaitExpression(child)) {
              firstAwaitEnd = child.getEnd();
            }
            if (
              firstAwaitEnd !== -1 &&
              child.getStart() > firstAwaitEnd &&
              ts.isIdentifier(child) &&
              destructured.has(child.text)
            ) {
              const parent = child.parent;
              const isPropAccessName = ts.isPropertyAccessExpression(parent) && parent.name === child;
              const isPropAssignName = ts.isPropertyAssignment(parent) && parent.name === child;
              if (!isPropAccessName && !isPropAssignName) {
                const { line } = sf.getLineAndCharacterOfPosition(child.getStart());
                const rel = relative(process.cwd(), filePath).replace(/\\/g, "/");
                violations.push(
                  `${rel}:${line + 1} 在 await 后读取了旧帧闭包变量 '${child.text}' (__appScope.${destructured.get(child.text)})`
                );
              }
            }
            ts.forEachChild(child, scanBody);
          };

          scanBody(node.body);
        }
        ts.forEachChild(node, visit);
      };

      visit(sf);
    }

    expect(violations).toEqual([]);
  });

  test("appView.tsx 中 MemoizedViewSection (recent-glyphs / topology-warning) 必须包含全部关键重渲染 inputs", () => {
    const appViewPath = resolve(SRC_ROOT, "appExtracted/appView.tsx");
    const sourceText = readFileSync(appViewPath, "utf8");
    const sf = ts.createSourceFile(appViewPath, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

    const sectionInputs = new Map<string, string>();
    const visit = (node: ts.Node) => {
      if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(sf) === "MemoizedViewSection") {
        let sectionName = "";
        let inputsText = "";
        for (const prop of node.attributes.properties) {
          if (!ts.isJsxAttribute(prop) || !prop.initializer) continue;
          const attrName = prop.name.getText(sf);
          if (attrName === "section" && ts.isStringLiteral(prop.initializer)) {
            sectionName = prop.initializer.text;
          } else if (attrName === "inputs") {
            inputsText = prop.initializer.getText(sf);
          }
        }
        if (sectionName) {
          sectionInputs.set(sectionName, inputsText);
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(sf);

    const recentGlyphInputs = sectionInputs.get("recent-glyphs") ?? "";
    for (const requiredKey of [
      "recentGlyphKinds",
      "hasActiveModel",
      "libraryTemplates",
      "colorDisplayMode",
      "colorPalette",
      "themeMode"
    ]) {
      expect(recentGlyphInputs, `recent-glyphs 缺少依赖 ${requiredKey}`).toContain(requiredKey);
    }

    const topologyWarningInputs = sectionInputs.get("topology-warning") ?? "";
    for (const requiredKey of [
      "topologyWarningPanelVisible",
      "topologyFilteredErrors",
      "topologyWarningCategory",
      "topologyWarningStatus"
    ]) {
      expect(topologyWarningInputs, `topology-warning 缺少依赖 ${requiredKey}`).toContain(requiredKey);
    }
  });

  test("侧栏与三大浮窗事件停止器必须拦截容器内部事件并放行 document.body Portal 子弹层事件", () => {
    class MockNode {
      children: MockNode[] = [];
      appendChild(child: MockNode) {
        this.children.push(child);
        return child;
      }
      contains(target: unknown): boolean {
        if (target === this) return true;
        return this.children.some((c) => c.contains(target));
      }
    }

    const previousNode = (globalThis as any).Node;
    (globalThis as any).Node = MockNode;
    try {
      const panelHost = new MockNode();
      const insideButton = panelHost.appendChild(new MockNode());
      const portalPopup = new MockNode();

      const finishDoubleClickOp = vi.fn();
      const finishLibraryOp = vi.fn();

      const stopSidePanel = createStopSidePanelEventPropagation({} as any);
      const stopDoubleClickDialog = createStopNodeDoubleClickDialogEvent({
        finishNodeDoubleClickDialogPointerOperation: finishDoubleClickOp
      } as any);
      const stopDeviceLibraryDialog = createStopDeviceLibraryDialogEvent({
        finishDeviceLibraryDialogPointerOperation: finishLibraryOp
      } as any);

      // 1. 容器外 Portal 弹层事件必须放行（不调用 stopPropagation）
      for (const handler of [stopSidePanel, stopDoubleClickDialog, stopDeviceLibraryDialog]) {
        const stopPropagation = vi.fn();
        handler({
          type: "pointerup",
          target: portalPopup,
          currentTarget: panelHost,
          stopPropagation
        } as any);
        expect(stopPropagation).not.toHaveBeenCalled();
      }
      expect(finishDoubleClickOp).not.toHaveBeenCalled();
      expect(finishLibraryOp).not.toHaveBeenCalled();

      // 2. 容器内子元素事件必须正常截断冒泡
      for (const handler of [stopSidePanel, stopDoubleClickDialog, stopDeviceLibraryDialog]) {
        const stopPropagation = vi.fn();
        handler({
          type: "pointerup",
          target: insideButton,
          currentTarget: panelHost,
          stopPropagation
        } as any);
        expect(stopPropagation).toHaveBeenCalledTimes(1);
      }
      expect(finishDoubleClickOp).toHaveBeenCalledTimes(1);
      expect(finishLibraryOp).toHaveBeenCalledTimes(1);
    } finally {
      (globalThis as any).Node = previousNode;
    }
  });

  test("画布交互期必须具备暂停 CSS 电流流水线动画的降载样式规则", () => {
    const css = readFileSync(resolve(SRC_ROOT, "styles.css"), "utf8");
    expect(css).toContain(".diagram-canvas.panning .electric-flow-arrow");
    expect(css).toContain(".diagram-canvas.multi-node-dragging .electric-flow-arrow");
    expect(css).toContain("animation-play-state: paused !important");
  });

  test("首屏核心入口不得顶层静态 import 低频重型导入器 (svgModelImport / dotImport)", () => {
    const entryFiles = [
      "App.tsx",
      "sharedIconLibrary.ts",
      "appExtracted/appStaticScope.ts",
      "appExtracted/appCanvasViewportBatch.tsx",
      "appExtracted/appStateBatch.tsx"
    ];
    for (const rel of entryFiles) {
      const content = readFileSync(resolve(SRC_ROOT, rel), "utf8");
      const staticImportHit = /^\s*import\s+(?!type\b).*from\s+["'][^"']*(?:svgModelImport|dotImport)["']/m.test(
        content
      );
      expect(staticImportHit, `${rel} 仍存在对 svgModelImport/dotImport 的顶层静态导入`).toBe(false);
    }
  });

  test("保存/导出/双击确认入口必须调用 flushActiveBufferedInput 刷出未失焦草稿", () => {
    const targets: Array<[string, string]> = [
      ["appExtracted/appToolbarHookFactories.tsx", "handleGlobalSaveKeyDown"],
      ["appExtracted/appProjectCanvasFactories.tsx", "createSaveCurrentProject"],
      ["appExtracted/appExportImportFactories.tsx", "createEnsureSavedBeforeExport"],
      ["appExtracted/appCanvasInteractionFactories.tsx", "createConfirmNodeDoubleClickDialog"],
      ["appExtracted/appDeviceDefinitionFactories.tsx", "createSaveDeviceDefinitionDraft"],
      ["appExtracted/appDeviceDefinitionFactories.tsx", "createSaveCustomDeviceDefinitionDialog"]
    ];
    for (const [rel, fnName] of targets) {
      const content = readFileSync(resolve(SRC_ROOT, rel), "utf8");
      const start = content.indexOf(fnName);
      expect(start, `未找到 ${rel} 中的 ${fnName}`).toBeGreaterThanOrEqual(0);
      const slice = content.slice(start, start + 650);
      expect(slice, `${rel}:${fnName} 未在入口刷出缓冲输入草稿`).toContain("flushActiveBufferedInput()");
    }
  });

  test("全局 Ctrl+Z / Ctrl+Shift+Z 快捷键必须排除文本输入目标 (!isTextInputTarget)", () => {
    const content = readFileSync(resolve(SRC_ROOT, "appExtracted/appToolbarHookFactories.tsx"), "utf8");
    expect(content).toMatch(
      /if\s*\(\(event\.ctrlKey\s*\|\|\s*event\.metaKey\)\s*&&\s*event\.key\.toLowerCase\(\)\s*===\s*"z"\s*&&\s*!isTextInputTarget\)/
    );
  });

  test("undoLastOperation 与 redoLastOperation 执行快照恢复前必须中止在途拖拽与编辑交互", () => {
    const cancelActiveEditInteractions = vi.fn();
    const finishMeasurementDrag = vi.fn();
    const setRoutableLinePlacement = vi.fn();
    const resetRoutableLinePreviewState = vi.fn();
    const baseSnapshot = {
      projectName: "测试模型",
      layers: [{ id: "layer-1", name: "默认图层", visible: true }],
      activeLayerId: "layer-1",
      canvasWidth: 1600,
      canvasHeight: 1200,
      allowAutoExpandCanvas: true,
      canvasBackgroundColor: "#ffffff",
      canvasBackgroundImage: "",
      canvasBackgroundImageAssetId: "",
      backgroundProjectId: "",
      backgroundLayerIds: [],
      powerUnit: "MW",
      voltageUnit: "kV",
      currentUnit: "A",
      powerBaseValue: "100",
      deviceIndexCounters: {},
      nodes: [],
      edges: [],
      groups: [],
      measurements: [],
      topologyErrors: [],
      topology: { islands: [], buses: [], branches: [] },
      topologyStatus: { state: "idle", summary: "" },
      label: "移动"
    };
    const undoStackRef = { current: [baseSnapshot] };
    const redoStackRef = { current: [] as unknown[] };
    const noop = vi.fn();

    const mockScope = new Proxy(
      {
        cancelActiveEditInteractions,
        finishMeasurementDrag,
        setRoutableLinePlacement,
        resetRoutableLinePreviewState,
        deferredMoveOptimizationCancelRef: { current: null },
        deferredRoutableLineRouteRepairCancelRef: { current: null },
        pendingStoredRouteEdgeIdsRef: { current: new Set() },
        pendingBusTerminalSyncNodeIdsRef: { current: new Set() },
        skipNextTopologyStaleRef: { current: false },
        currentMutationRevisionRef: { current: 1 },
        savedMutationRevisionRef: { current: 0 },
        undoStackRef,
        redoStackRef,
        cloneProjectState: () => ({ ...baseSnapshot }),
        setUndoStack: vi.fn(),
        setRedoStack: vi.fn()
      },
      {
        get(target, prop) {
          if (prop in target) {
            return target[prop as keyof typeof target];
          }
          return noop;
        }
      }
    );

    const undo = createUndoLastOperation(mockScope as never);
    undo();
    expect(cancelActiveEditInteractions).toHaveBeenCalledTimes(1);
    expect(finishMeasurementDrag).toHaveBeenCalledTimes(1);
    expect(setRoutableLinePlacement).toHaveBeenCalledWith(null);
    expect(resetRoutableLinePreviewState).toHaveBeenCalledTimes(1);

    const redo = createRedoLastOperation(mockScope as never);
    redo();
    expect(cancelActiveEditInteractions).toHaveBeenCalledTimes(2);
    expect(finishMeasurementDrag).toHaveBeenCalledTimes(2);
  });

  test("pushUndoSnapshot 在具备 undoStackRef 时必须同步推进 undoStackRef.current（不滞后至下一渲染帧）", () => {
    const undoStackRef = { current: [] as unknown[] };
    const redoStackRef = { current: [{ nodes: [] }] as unknown[] };
    // 模拟 React 19 批处理：setUndoStack 在当前同步调用栈中不执行函数式 updater
    const setUndoStack = vi.fn();
    const setRedoStack = vi.fn();
    const pushUndo = createPushUndoSnapshot({
      cloneProjectState: () => ({ nodes: [{ id: "n1" }], edges: [] }),
      deferredMoveOptimizationCancelRef: { current: null },
      deferredRoutableLineRouteRepairCancelRef: { current: null },
      currentMutationRevisionRef: { current: 0 },
      undoStackRef,
      redoStackRef,
      setUndoStack,
      setRedoStack,
      setHasUnsavedChanges: vi.fn(),
      activeSelectedNodeIds: []
    } as never);

    pushUndo(true, false);
    expect(undoStackRef.current).toHaveLength(1);
    expect(redoStackRef.current).toEqual([]);
    expect(setUndoStack).toHaveBeenCalledWith(undoStackRef.current);
  });

  test("电压基值弹窗关闭态下 Callback121/123 短路跳过全图扫描，打开态正常返回扫描结果", () => {
    const normalizeVoltageBaseInput = vi.fn((v: string | undefined) => (v ? String(v).trim() : ""));
    const nodes = [
      {
        id: "tx-1",
        name: "主变1",
        terminals: [
          { id: "t1", type: "ac", vbase: "220", label: "高压侧" },
          { id: "t2", type: "ac", vbase: "110", label: "低压侧" }
        ],
        params: { vbase: "220", i_vbase: "220", j_vbase: "110" }
      }
    ];
    const baseScope = {
      VOLTAGE_BASE_SET_PRESETS: ["10", "110"],
      nodes,
      normalizeVoltageBaseInput,
      voltageBaseSetCandidateNodes: nodes,
      voltageBaseSettingModeForNode: () => "terminal",
      voltageBaseTerminalValues: { "tx-1": { t1: "220", t2: "110" } }
    };

    const closedOptions = createAppHookCallback121({
      ...baseScope,
      voltageBaseSetDialogOpen: false
    } as never)();
    expect(closedOptions).toEqual(["10", "110"]);
    expect(normalizeVoltageBaseInput).not.toHaveBeenCalled();

    const closedRows = createAppHookCallback123({
      ...baseScope,
      voltageBaseSetDialogOpen: false
    } as never)();
    expect(closedRows).toEqual([]);

    const openOptions = createAppHookCallback121({
      ...baseScope,
      voltageBaseSetDialogOpen: true
    } as never)();
    expect(openOptions).toEqual(["10", "110", "220"]);
    expect(normalizeVoltageBaseInput).toHaveBeenCalled();

    const openRows = createAppHookCallback123({
      ...baseScope,
      voltageBaseSetDialogOpen: true
    } as never)();
    expect(openRows).toHaveLength(2);
  });

  test("画布四边缘缩放热区与侧栏指针检测共享单帧 DOMRect 缓存，单次点击最多触发 1 次 getBoundingClientRect", () => {
    sharedElementRectCache.invalidate();
    const getBoundingClientRect = vi.fn(() => ({
      width: 1000,
      height: 800,
      left: 0,
      right: 1000,
      top: 0,
      bottom: 800
    }) as DOMRect);
    const fakeSvg = { getBoundingClientRect } as unknown as SVGSVGElement;
    const scope = {
      CANVAS_RESIZE_HANDLE_SIZE: 12,
      canvasBounds: { width: 2000, height: 1600 },
      startCanvasResize: vi.fn(),
      svgRef: { current: fakeSvg }
    };
    const clickCenterEvent = { clientX: 500, clientY: 400 } as never;

    expect(createStartCanvasResizeFromRightOverlay(scope as never)(clickCenterEvent)).toBe(false);
    expect(createStartCanvasResizeFromLeftOverlay(scope as never)(clickCenterEvent)).toBe(false);
    expect(createStartCanvasResizeFromBottomOverlay(scope as never)(clickCenterEvent)).toBe(false);
    expect(createStartCanvasResizeFromTopOverlay(scope as never)(clickCenterEvent)).toBe(false);
    expect(createPointerInsideElementRect(scope as never)(clickCenterEvent, fakeSvg as unknown as HTMLElement, 0)).toBe(true);
    expect(getBoundingClientRect).toHaveBeenCalledTimes(1);

    // 验证 createConfirmNodeDoubleClickDialog 支持经 __appScopeRef 读取 flush 后的最新草稿
    const patchGraphNodes = vi.fn();
    const staleNode = { id: "n1", name: "旧名", params: { p1: "1" } };
    const updatedDraftNode = { id: "n1", name: "新名", params: { p1: "2" } };
    const initialScope = {
      nodeDoubleClickDialog: { nodeId: "n1" },
      nodeDoubleClickDraft: { nodeId: "n1", node: staleNode },
      nodeById: new Map([["n1", staleNode]]),
      nodeDoubleClickDraftHasModelChanges: (a: { name: string }, b: { name: string }) => a.name !== b.name,
      rememberNodeDoubleClickDialogGuard: vi.fn(),
      pushNodeOnlyUndoSnapshot: vi.fn(),
      patchGraphNodes,
      finishNodeDoubleClickDialogPointerOperation: vi.fn(),
      setNodeDoubleClickDialog: vi.fn(),
      setNodeDoubleClickDraft: vi.fn(),
      __appScopeRef: { current: null as unknown }
    };
    initialScope.__appScopeRef.current = {
      ...initialScope,
      nodeDoubleClickDraft: { nodeId: "n1", node: updatedDraftNode }
    };
    createConfirmNodeDoubleClickDialog(initialScope as never)();
    expect(patchGraphNodes).toHaveBeenCalledWith([
      expect.objectContaining({ id: "n1", name: "新名", params: { p1: "2" } })
    ]);
  });
});
