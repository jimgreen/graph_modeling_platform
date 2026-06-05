import {
  type DragEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent
} from "react";
import { type MainWorkspaceProps } from "./MainWorkspace";
import { type Point } from "./model";

type ScrollSurfacePointerEvent = ReactPointerEvent<HTMLDivElement>;
type SvgPointerEvent = ReactPointerEvent<SVGSVGElement>;
type SvgMouseEvent = ReactMouseEvent<SVGSVGElement>;
type SvgDragEvent = DragEvent<SVGSVGElement>;

export function useWorkspaceCanvasInteractions(props: MainWorkspaceProps) {
  const {
    activateInspectorFromCanvas,
    activeProjectKey,
    activeSchemeKey,
    appendStaticDrawingPoint,
    applyConnectPreviewState,
    applyRoutableLinePreviewState,
    cancelLibraryPlacement,
    cancelModifierSelectionPress,
    canvasInteractionRef,
    canvasSelectionShortcutActiveRef,
    clampPointToCanvas,
    clearLibraryPlacementPreview,
    clearRecordSelection,
    commitLibraryPlacementAtPoint,
    connectSource,
    connectTargetPoint,
    connectTargetSnapPoint,
    consumeGraphicContextMenuHandled,
    draggingRef,
    findConnectTargetAtPoint,
    findConnectionRouteHitAtPoint,
    findRoutableLineEndpointTargetAtPoint,
    finishConnectToTarget,
    finishInteractiveStaticDrawing,
    finishManualPathDrag,
    finishMarqueeSelection,
    finishMeasurementDrag,
    finishModifierSelectionPress,
    finishNodeDrag,
    finishNodeLabelDrag,
    finishNodeLabelRotateDrag,
    finishRewiring,
    finishRoutableLineEndpointDrag,
    finishRoutableLineToTarget,
    finishTerminalPress,
    finishTransformDrag,
    fitWholeCanvasFromBlankDoubleClick,
    fitWholeCanvasToFrame,
    handleCanvasPointerDownCapture,
    handleDrop,
    handlePointerMove,
    handleWheel,
    hasCanvasSelectionModifier,
    insertManualBendFromPointer,
    isCanvasGraphicContextMenuTarget,
    isEditMode,
    isReadonlyCanvasMode,
    isRepeatedEdgePointerClick,
    lastCanvasPointerRef,
    lastEdgePointerClickRef,
    lastRawCanvasPointerRef,
    libraryPlacement,
    manualPathDrag,
    modifierSelectionPressRef,
    panningRef,
    projectListPointerInsideRef,
    resetConnectPreviewState,
    resetRoutableLinePreviewState,
    resolveConnectPreviewPoint,
    routableLinePlacement,
    scheduleRoutableLinePreviewPoint,
    screenToSvgPoint,
    selectCanvasGraphics,
    setCanvasPanning,
    setCanvasSelectionScope,
    setConnectSource,
    setContextMenu,
    setInspectorTab,
    setMarquee,
    setMeasurementDrag,
    setMode,
    setRewiring,
    setRoutableLineEndpointDrag,
    setRoutableLinePlacement,
    setSelectedEdgeId,
    setSelectedEdgeIds,
    setSelectedNodeIds,
    setSelectedProjectId,
    setSelectedProjectIds,
    setSelectedSchemeId,
    setSelectedSchemeIds,
    setTerminalPress,
    startCanvasPanning,
    startCanvasResize,
    startCanvasResizeFromBottomOverlay,
    startCanvasResizeFromLeftOverlay,
    startCanvasResizeFromRightOverlay,
    startCanvasResizeFromTopOverlay,
    startModifierSelectionPress,
    startRoutableLineFromTerminal,
    staticDrawing,
    updateLibraryPlacementPreview,
    updateMeasurementDrag,
    updateMouseStatus
  } = props;

  const resolvePointer = (event: SvgPointerEvent | SvgMouseEvent) => {
    const rawPointer = screenToSvgPoint(event.currentTarget, event.clientX, event.clientY);
    const pointer = clampPointToCanvas(rawPointer);
    lastRawCanvasPointerRef.current = rawPointer;
    lastCanvasPointerRef.current = pointer;
    updateMouseStatus(pointer);
    return { rawPointer, pointer };
  };

  const finishCanvasTransientInteractions = () => {
    finishNodeLabelDrag();
    finishNodeLabelRotateDrag();
    setMeasurementDrag(null);
    finishNodeDrag();
    setTerminalPress(null);
    setRoutableLineEndpointDrag(null);
    finishManualPathDrag();
    finishTransformDrag();
  };

  const scrollSurfaceHandlers = {
    onPointerDown: (event: ScrollSurfacePointerEvent) => {
      if (event.button !== 0 || event.target !== event.currentTarget || staticDrawing || libraryPlacement || connectSource) {
        return;
      }
      if (isEditMode && startCanvasResizeFromTopOverlay(event)) {
        return;
      }
      if (isEditMode && startCanvasResizeFromLeftOverlay(event)) {
        return;
      }
      if (isEditMode && startCanvasResizeFromRightOverlay(event)) {
        return;
      }
      if (isEditMode && startCanvasResizeFromBottomOverlay(event)) {
        return;
      }
      if (isEditMode && hasCanvasSelectionModifier(event)) {
        startModifierSelectionPress(event);
        return;
      }
      startCanvasPanning(event);
    },
    onPointerMove: (event: ScrollSurfacePointerEvent) => {
      if (panningRef.current || modifierSelectionPressRef.current) {
        handlePointerMove(event as unknown as SvgPointerEvent);
      }
    },
    onPointerUp: (event: ScrollSurfacePointerEvent) => {
      finishModifierSelectionPress(event.pointerId);
      setCanvasPanning(null);
    },
    onPointerCancel: () => {
      cancelModifierSelectionPress();
      setCanvasPanning(null);
    },
    onLostPointerCapture: () => {
      cancelModifierSelectionPress();
      setCanvasPanning(null);
    },
    onDoubleClick: (event: ReactMouseEvent<HTMLDivElement>) => {
      if (event.button !== 0 || event.target !== event.currentTarget) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      fitWholeCanvasToFrame();
    }
  };

  const svgHandlers = {
    onDrop: handleDrop,
    onDragOver: (event: SvgDragEvent) => event.preventDefault(),
    onWheel: handleWheel,
    onDoubleClick: fitWholeCanvasFromBlankDoubleClick,
    onPointerDownCapture: handleCanvasPointerDownCapture,
    onPointerMove: (event: SvgPointerEvent) => {
      if (updateMeasurementDrag(event)) {
        return;
      }
      handlePointerMove(event);
    },
    onPointerEnter: (event: SvgPointerEvent) => {
      canvasInteractionRef.current = true;
      projectListPointerInsideRef.current = false;
      const { pointer } = resolvePointer(event);
      if (libraryPlacement) {
        updateLibraryPlacementPreview(pointer);
      }
      if (routableLinePlacement) {
        scheduleRoutableLinePreviewPoint(pointer);
      }
    },
    onPointerUp: (event: SvgPointerEvent) => {
      if (finishMeasurementDrag(event)) {
        return;
      }
      if (finishModifierSelectionPress(event.pointerId)) {
        return;
      }
      finishRewiring(event);
      finishRoutableLineEndpointDrag();
      finishTerminalPress();
      finishNodeLabelDrag();
      finishNodeLabelRotateDrag();
      finishMarqueeSelection();
      finishNodeDrag();
      finishManualPathDrag();
      finishTransformDrag();
      setCanvasPanning(null);
    },
    onPointerLeave: () => {
      clearLibraryPlacementPreview();
      if (routableLinePlacement) {
        resetRoutableLinePreviewState();
      }
      if (draggingRef.current) {
        canvasInteractionRef.current = true;
        projectListPointerInsideRef.current = false;
        return;
      }
      if (canvasSelectionShortcutActiveRef.current) {
        canvasInteractionRef.current = true;
        projectListPointerInsideRef.current = false;
        return;
      }
      canvasInteractionRef.current = false;
      if (manualPathDrag) {
        return;
      }
      finishNodeLabelDrag();
      finishNodeLabelRotateDrag();
      setMeasurementDrag(null);
      finishNodeDrag();
      if (panningRef.current) {
        return;
      }
      if (modifierSelectionPressRef.current) {
        return;
      }
      setTerminalPress(null);
      setRoutableLineEndpointDrag(null);
      finishManualPathDrag();
      finishTransformDrag();
      setMarquee(null);
      setRewiring(null);
    },
    onPointerCancel: () => {
      cancelModifierSelectionPress();
      finishCanvasTransientInteractions();
      setCanvasPanning(null);
      setMarquee(null);
      setRewiring(null);
    },
    onLostPointerCapture: () => {
      cancelModifierSelectionPress();
      finishCanvasTransientInteractions();
    },
    onPointerDown: (event: SvgPointerEvent) => {
      if (event.button !== 0) {
        return;
      }
      activateInspectorFromCanvas();
      canvasInteractionRef.current = true;
      projectListPointerInsideRef.current = false;
      const { pointer } = resolvePointer(event);
      if (routableLinePlacement) {
        const target = findRoutableLineEndpointTargetAtPoint(pointer);
        applyRoutableLinePreviewState(pointer, target ? connectTargetPoint(target) : null, target);
        if (target) {
          if (routableLinePlacement.source) {
            finishRoutableLineToTarget(target);
          } else {
            startRoutableLineFromTerminal(target.node, target.terminalId, target.point);
          }
        }
        return;
      }
      if (libraryPlacement) {
        commitLibraryPlacementAtPoint(pointer);
        return;
      }
      if (staticDrawing) {
        appendStaticDrawingPoint(pointer, event.detail >= 2);
        return;
      }
      if (connectSource) {
        const previewPoint = resolveConnectPreviewPoint(pointer, event);
        const target = findConnectTargetAtPoint(previewPoint);
        applyConnectPreviewState(previewPoint, Boolean(target), target ? connectTargetSnapPoint(target) : null);
        if (target) {
          finishConnectToTarget(target, previewPoint);
        } else {
          applyConnectPreviewState(previewPoint, false);
        }
        return;
      }
      const routeHit = isReadonlyCanvasMode ? null : findConnectionRouteHitAtPoint(pointer);
      if (hasCanvasSelectionModifier(event)) {
        startModifierSelectionPress(event, routeHit ? { kind: "edge", edgeId: routeHit.edgeId } : undefined);
        return;
      }
      if (routeHit) {
        const edgeClick = {
          edgeId: routeHit.edgeId,
          clientX: event.clientX,
          clientY: event.clientY,
          at: Date.now()
        };
        const repeatedClick = isRepeatedEdgePointerClick(lastEdgePointerClickRef.current, edgeClick);
        lastEdgePointerClickRef.current = edgeClick;
        selectCanvasGraphics([], [routeHit.edgeId]);
        setConnectSource(null);
        resetConnectPreviewState();
        setRewiring(null);
        clearRecordSelection();
        if (event.detail >= 2 || repeatedClick) {
          insertManualBendFromPointer(routeHit.edgeId, routeHit.routePoints, pointer);
          lastEdgePointerClickRef.current = null;
        }
        return;
      }
      lastEdgePointerClickRef.current = null;
      setCanvasSelectionScope("group");
      setSelectedNodeIds([]);
      setSelectedEdgeId("");
      setSelectedEdgeIds([]);
      setConnectSource(null);
      resetConnectPreviewState();
      setRewiring(null);
      setInspectorTab("model");
      if (activeProjectKey) {
        setSelectedProjectId(activeProjectKey);
        setSelectedProjectIds([activeProjectKey]);
        setSelectedSchemeId(activeSchemeKey);
        setSelectedSchemeIds([]);
      }
      if (event.detail >= 2) {
        event.preventDefault();
        setMarquee(null);
        fitWholeCanvasToFrame();
        return;
      }
      startCanvasPanning(event);
    },
    onContextMenu: (event: SvgMouseEvent) => {
      event.preventDefault();
      if (consumeGraphicContextMenuHandled()) {
        event.stopPropagation();
        return;
      }
      if (isCanvasGraphicContextMenuTarget(event.target)) {
        event.stopPropagation();
        return;
      }
      const { pointer } = resolvePointer(event);
      if (libraryPlacement) {
        cancelLibraryPlacement();
        return;
      }
      if (routableLinePlacement) {
        setRoutableLinePlacement(null);
        resetRoutableLinePreviewState();
        setMode("select");
        return;
      }
      if (staticDrawing) {
        finishInteractiveStaticDrawing(pointer);
        return;
      }
      if (connectSource) {
        setConnectSource(null);
        resetConnectPreviewState();
        setMode("select");
        return;
      }
      if (isReadonlyCanvasMode) {
        setContextMenu(null);
        return;
      }
      const routeHit = findConnectionRouteHitAtPoint(pointer);
      if (routeHit) {
        selectCanvasGraphics([], [routeHit.edgeId]);
        setConnectSource(null);
        resetConnectPreviewState();
        setRewiring(null);
        clearRecordSelection();
        setContextMenu({
          x: event.clientX,
          y: event.clientY,
          target: "edge",
          canvasPoint: pointer,
          edgeId: routeHit.edgeId,
          routePoints: routeHit.routePoints.map((point: Point) => ({ ...point }))
        });
        return;
      }
      setContextMenu({ x: event.clientX, y: event.clientY, target: "blank", canvasPoint: pointer });
    }
  };

  const canvasResizeHotzoneHandlers = {
    left: (event: ScrollSurfacePointerEvent) => startCanvasResize(event, "left"),
    top: (event: ScrollSurfacePointerEvent) => startCanvasResize(event, "top"),
    right: (event: ScrollSurfacePointerEvent) => startCanvasResize(event, "right"),
    bottom: (event: ScrollSurfacePointerEvent) => startCanvasResize(event, "bottom"),
    topLeft: (event: ScrollSurfacePointerEvent) => startCanvasResize(event, "top-left"),
    topRight: (event: ScrollSurfacePointerEvent) => startCanvasResize(event, "top-right"),
    bottomLeft: (event: ScrollSurfacePointerEvent) => startCanvasResize(event, "bottom-left"),
    bottomRight: (event: ScrollSurfacePointerEvent) => startCanvasResize(event, "corner")
  };

  return {
    canvasResizeHotzoneHandlers,
    scrollSurfaceHandlers,
    svgHandlers
  };
}
