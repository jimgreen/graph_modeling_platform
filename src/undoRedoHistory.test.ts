import { describe, expect, it, vi } from "vitest";
import { createPushUndoSnapshot } from "./appExtracted/appGraphMeasurementFactories";
import { createRedoLastOperation, createUndoLastOperation } from "./appExtracted/appSelectionDragFactories";
import { createAppHookCallback101, createAppHookCallback110 } from "./appExtracted/appToolbarHookFactories";
import type { UndoSnapshot } from "./appExtracted/appCoreCanvasUtilities";

function createMockHistoryScope() {
  let state = {
    projectName: "初始模型",
    nodes: [{ id: "n0" }],
    edges: [] as unknown[],
    hasUnsavedChanges: false
  };
  let undoStack: UndoSnapshot[] = [];
  let redoStack: UndoSnapshot[] = [];
  const undoStackRef = { current: undoStack };
  const redoStackRef = { current: redoStack };
  const currentMutationRevisionRef = { current: 0 };
  const savedMutationRevisionRef = { current: 0 };
  const logs: string[] = [];

  const scope: Record<string, any> = {
    undoStackRef,
    redoStackRef,
    currentMutationRevisionRef,
    savedMutationRevisionRef,
    deferredMoveOptimizationCancelRef: { current: null },
    deferredRoutableLineRouteRepairCancelRef: { current: null },
    pendingStoredRouteEdgeIdsRef: { current: new Set<string>() },
    pendingBusTerminalSyncNodeIdsRef: { current: new Set<string>() },
    skipNextTopologyStaleRef: { current: false },
    cloneProjectState: () => ({
      graphSnapshotMode: "reference",
      projectName: state.projectName,
      layers: [],
      activeLayerId: "default",
      canvasWidth: 1600,
      canvasHeight: 1000,
      allowAutoExpandCanvas: true,
      canvasBackgroundColor: "#ffffff",
      canvasBackgroundImage: "",
      canvasBackgroundImageAssetId: "",
      canvasBackgroundImageFit: "cover",
      backgroundProjectId: "",
      backgroundLayerIds: [],
      powerUnit: "MW",
      voltageUnit: "kV",
      currentUnit: "A",
      powerBaseValue: 100,
      nodes: [...state.nodes] as any,
      edges: [...state.edges] as any,
      groups: [],
      measurements: { groups: [] } as any,
      topologyErrors: [],
      topology: { nodes: {}, edges: {} } as any,
      topologyStatus: { state: "idle", message: "" } as any,
      deviceIndexCounters: {},
      revision: currentMutationRevisionRef.current
    }),
    setUndoStack: (updater: any) => {
      undoStack = typeof updater === "function" ? updater(undoStack) : updater;
      undoStackRef.current = undoStack;
    },
    setRedoStack: (updater: any) => {
      redoStack = typeof updater === "function" ? updater(redoStack) : updater;
      redoStackRef.current = redoStack;
    },
    setProjectName: (v: string) => { state.projectName = v; },
    setLayers: () => {},
    setActiveLayerId: () => {},
    setCanvasWidth: () => {},
    setCanvasHeight: () => {},
    setAllowAutoExpandCanvas: () => {},
    setCanvasBackgroundColor: () => {},
    setCanvasBackgroundImage: () => {},
    setCanvasBackgroundImageAssetId: () => {},
    setCanvasBackgroundImageFit: () => {},
    setBackgroundProjectId: () => {},
    setBackgroundLayerIds: () => {},
    setPowerUnit: () => {},
    setVoltageUnit: () => {},
    setCurrentUnit: () => {},
    setPowerBaseValue: () => {},
    setModelType: () => {},
    setSubcontrolarea: () => {},
    setSubstation: () => {},
    setFeeder: () => {},
    setTaiqu: () => {},
    setDeviceIndexCounters: () => {},
    applyUndoGraphSnapshot: (snap: UndoSnapshot) => {
      state.nodes = [...(snap.nodes as any[])];
      state.edges = [...(snap.edges as any[])];
    },
    setGroups: () => {},
    setProjectMeasurements: () => {},
    setTopologyErrors: () => {},
    setTopology: () => {},
    setTopologyStatus: () => {},
    setCanvasSelectionScope: () => {},
    setSelectedNodeIds: () => {},
    setSelectedEdgeId: () => {},
    setSelectedEdgeIds: () => {},
    setConnectSource: () => {},
    resetConnectPreviewState: () => {},
    setRewiring: () => {},
    setContextMenu: () => {},
    setProjectMenu: () => {},
    setHasUnsavedChanges: (dirty: boolean) => { state.hasUnsavedChanges = dirty; },
    setOperationLogText: (msg: string) => { logs.push(msg); }
  };

  const pushUndo = createPushUndoSnapshot(scope);
  const undo = createUndoLastOperation(scope);
  const redo = createRedoLastOperation(scope);

  return {
    scope,
    getState: () => state,
    getUndoStack: () => undoStack,
    getRedoStack: () => redoStack,
    logs,
    mutate: (nextName: string, nextNodeIds: string[]) => {
      pushUndo(true, false, undefined, `改为 ${nextName}`);
      state.projectName = nextName;
      state.nodes = nextNodeIds.map((id) => ({ id }));
    },
    save: () => {
      savedMutationRevisionRef.current = currentMutationRevisionRef.current;
      state.hasUnsavedChanges = false;
    },
    undo,
    redo
  };
}

describe("Undo / Redo 历史栈与单调 mutationRevision 脏状态", () => {
  it("支持多步 Undo -> Redo 往返，新编辑发生时自动清空 Redo 栈", () => {
    const h = createMockHistoryScope();
    h.mutate("模型A", ["n0", "n1"]);
    h.mutate("模型B", ["n0", "n1", "n2"]);
    expect(h.getState().projectName).toBe("模型B");
    expect(h.getUndoStack().length).toBe(2);
    expect(h.getRedoStack().length).toBe(0);

    // 撤销两步回到初始态（恰好回到保存基线 revision=0）
    h.undo();
    expect(h.getState().projectName).toBe("模型A");
    expect(h.getState().hasUnsavedChanges).toBe(true);
    expect(h.getRedoStack().length).toBe(1);

    h.undo();
    expect(h.getState().projectName).toBe("初始模型");
    expect(h.getState().hasUnsavedChanges).toBe(false);
    expect(h.getRedoStack().length).toBe(2);

    // 重做两步回到模型B
    h.redo();
    expect(h.getState().projectName).toBe("模型A");
    expect(h.getState().hasUnsavedChanges).toBe(true);
    h.redo();
    expect(h.getState().projectName).toBe("模型B");
    expect(h.getRedoStack().length).toBe(0);

    // 撤销一步后再做新编辑，Redo 栈应清空
    h.undo();
    expect(h.getRedoStack().length).toBe(1);
    h.mutate("模型C", ["n0", "n3"]);
    expect(h.getRedoStack().length).toBe(0);
    expect(h.getState().projectName).toBe("模型C");
  });

  it("编辑超过 50 步触发 undoStack 截断后，撤销仍通过 mutationRevision 精准保持脏状态而不误判已保存", () => {
    const h = createMockHistoryScope();
    for (let i = 1; i <= 55; i += 1) {
      h.mutate(`步骤-${i}`, [`n${i}`]);
    }
    // 撤销栈被上限 50 截断，保存点仍在 revision=0
    expect(h.getUndoStack().length).toBe(50);
    // 即使连续撤销全部 50 步，也只能回到 revision=5（≠ savedRevision 0），必须仍为未保存
    for (let i = 0; i < 50; i += 1) {
      h.undo();
    }
    expect(h.getUndoStack().length).toBe(0);
    expect(h.scope.currentMutationRevisionRef.current).toBe(5);
    expect(h.getState().hasUnsavedChanges).toBe(true);
  });

  it("在中间步骤保存后，撤销再重做回到该保存点时精确恢复为已保存状态", () => {
    const h = createMockHistoryScope();
    h.mutate("版本1", ["n1"]);
    h.save();
    expect(h.getState().hasUnsavedChanges).toBe(false);

    h.mutate("版本2", ["n1", "n2"]);
    expect(h.getState().hasUnsavedChanges).toBe(true);

    // 撤销回到版本1（保存点） -> 自动干净
    h.undo();
    expect(h.getState().projectName).toBe("版本1");
    expect(h.getState().hasUnsavedChanges).toBe(false);

    // 再撤销到初始模型（早于保存点） -> 再次标脏
    h.undo();
    expect(h.getState().projectName).toBe("初始模型");
    expect(h.getState().hasUnsavedChanges).toBe(true);

    // 重做回到版本1（保存点） -> 精确变回干净
    h.redo();
    expect(h.getState().projectName).toBe("版本1");
    expect(h.getState().hasUnsavedChanges).toBe(false);
  });

  it("快捷键路由区分 Ctrl+Z(Undo) 与 Ctrl+Shift+Z / Ctrl+Y(Redo)", () => {
    const undoSpy = vi.fn();
    const redoSpy = vi.fn();
    const listeners = new Map<string, (e: any) => void>();
    const origWindow = (globalThis as any).window;
    (globalThis as any).window = {
      addEventListener: (type: string, fn: (e: any) => void) => listeners.set(type, fn),
      removeEventListener: (type: string) => listeners.delete(type)
    };
    const scopeRef: { current: Record<string, any> } = { current: {} };
    const scope: Record<string, any> = {
      __appScopeRef: scopeRef,
      canvasPointerKeyboardShortcutAvailability: () => "unblocked",
      resolveKeyboardShortcutScope: () => "canvas",
      canvasInteractionRef: { current: true },
      projectListPointerInsideRef: { current: false },
      isGlobalSaveShortcut: () => false,
      undoLastOperation: undoSpy,
      redoLastOperation: redoSpy
    };
    scopeRef.current = scope;

    try {
      const cleanup = createAppHookCallback110(scope)();
      const onKeyDown = listeners.get("keydown");
      expect(typeof onKeyDown).toBe("function");

      onKeyDown?.({ key: "z", ctrlKey: true, shiftKey: false, metaKey: false, defaultPrevented: false, target: null, preventDefault: vi.fn() });
      expect(undoSpy).toHaveBeenCalledTimes(1);
      expect(redoSpy).toHaveBeenCalledTimes(0);

      onKeyDown?.({ key: "Z", ctrlKey: true, shiftKey: true, metaKey: false, defaultPrevented: false, target: null, preventDefault: vi.fn() });
      expect(undoSpy).toHaveBeenCalledTimes(1);
      expect(redoSpy).toHaveBeenCalledTimes(1);

      onKeyDown?.({ key: "y", ctrlKey: true, shiftKey: false, metaKey: false, defaultPrevented: false, target: null, preventDefault: vi.fn() });
      expect(redoSpy).toHaveBeenCalledTimes(2);

      // 输入框内按 Ctrl+Y 不拦截重做画布
      onKeyDown?.({ key: "y", ctrlKey: true, shiftKey: false, metaKey: false, defaultPrevented: false, target: { tagName: "INPUT", closest: () => null }, preventDefault: vi.fn() });
      expect(redoSpy).toHaveBeenCalledTimes(2);

      cleanup?.();
    } finally {
      if (origWindow === undefined) delete (globalThis as any).window;
      else (globalThis as any).window = origWindow;
    }
  });

  it("画布边框拖拽 pointermove 经 requestAnimationFrame 合批更新，不再同步调用 flushSync", () => {
    const listeners = new Map<string, (e: any) => void>();
    const rafCallbacks: FrameRequestCallback[] = [];
    const origWindow = (globalThis as any).window;
    (globalThis as any).window = {
      addEventListener: (type: string, fn: (e: any) => void) => listeners.set(type, fn),
      removeEventListener: (type: string) => listeners.delete(type),
      requestAnimationFrame: (cb: FrameRequestCallback) => {
        rafCallbacks.push(cb);
        return rafCallbacks.length;
      },
      cancelAnimationFrame: vi.fn()
    };

    const flushSyncSpy = vi.fn((fn: () => void) => fn());
    const setDraftSpy = vi.fn();
    const canvasResizeDraftRef = { current: null as any };
    const scope: Record<string, any> = {
      canvasResizeDrag: { edge: "right", startWidth: 1200, startHeight: 800, minBounds: { width: 400, height: 300 }, startScrollLeft: 0, startScrollTop: 0 },
      canvasWidth: 1200,
      canvasHeight: 800,
      canvasBoundsRef: { current: { width: 1200, height: 800 } },
      canvasFrameRef: { current: null },
      canvasResizeDraftRef,
      canvasResizeUndoCapturedRef: { current: false },
      pendingCanvasResizeCommitAnchorRef: { current: null },
      canvasResizeBoundsFromPointerDrag: (_drag: any, ev: any) => ({ width: 1200 + ev.clientX, height: 800 }),
      clampCanvasBounds: (b: any) => b,
      flushSync: flushSyncSpy,
      setCanvasResizeDraft: setDraftSpy,
      setCanvasResizeDrag: vi.fn(),
      setCanvasNoScrollOffset: vi.fn(),
      applyCanvasBounds: vi.fn(),
      hasCanvasOriginShift: () => false,
      canvasResizeOriginShiftForBounds: () => ({ x: 0, y: 0 }),
      canvasNoScrollOffsetForCanvasResizeAnchor: () => ({ x: 0, y: 0 }),
      canvasResizePreviewRectForDraft: () => ({ left: 0, top: 0, width: 1300, height: 800 }),
      syncCanvasFrameScrollToCanvasResizeCommitAnchor: vi.fn(),
      scheduleCanvasVisibleViewBoxUpdate: vi.fn(),
      pushUndoSnapshot: vi.fn(),
      setGraphArrays: vi.fn(),
      shiftCachedRoutesForCanvasOrigin: vi.fn(),
      translateNodeBy: (n: any) => n,
      translateEdgeBy: (e: any) => e,
      writeOperationLog: vi.fn(),
      nodes: [],
      edges: []
    };

    try {
      const cleanup = createAppHookCallback101(scope)();
      const onMove = listeners.get("pointermove");
      expect(typeof onMove).toBe("function");

      // 同一帧内连续 3 次 pointermove，仅排入 1 个 rAF，且 0 次同步 flushSync
      onMove?.({ clientX: 10, preventDefault: vi.fn() });
      onMove?.({ clientX: 25, preventDefault: vi.fn() });
      onMove?.({ clientX: 40, preventDefault: vi.fn() });
      expect(flushSyncSpy).toHaveBeenCalledTimes(0);
      expect(rafCallbacks.length).toBe(1);
      expect(setDraftSpy).toHaveBeenCalledTimes(0);

      // 下一帧执行 rAF，一次提交最新尺寸 1240
      rafCallbacks[0](16);
      expect(setDraftSpy).toHaveBeenCalledTimes(1);
      expect(setDraftSpy).toHaveBeenCalledWith({ width: 1240, height: 800 });

      cleanup?.();
    } finally {
      if (origWindow === undefined) delete (globalThis as any).window;
      else (globalThis as any).window = origWindow;
    }
  });
});
