export type SidePanelMode = "pinned" | "hidden" | "auto";
export type SidePanelSide = "left" | "right";
export type SidePanelAutoEvent = "edge-enter" | "panel-enter" | "panel-leave" | "canvas-activate";

// Must cover the 12px viewport gap used by floating side panels in styles.css.
export const SIDE_PANEL_VIEWPORT_EDGE_GAP = 12;
const SIDE_PANEL_POINTER_TOLERANCE = 1;

export function isPointerInsideSidePanelViewportEdgeBridge(
  side: SidePanelSide,
  clientX: number,
  clientY: number,
  panelRect: Pick<DOMRect, "top" | "bottom">,
  viewportWidth: number
): boolean {
  const insidePanelHeight =
    clientY >= panelRect.top - SIDE_PANEL_POINTER_TOLERANCE &&
    clientY <= panelRect.bottom + SIDE_PANEL_POINTER_TOLERANCE;
  if (!insidePanelHeight) {
    return false;
  }

  const bridgeWidth = SIDE_PANEL_VIEWPORT_EDGE_GAP + SIDE_PANEL_POINTER_TOLERANCE;
  if (side === "left") {
    return clientX >= 0 && clientX <= bridgeWidth;
  }
  return clientX >= Math.max(0, viewportWidth - bridgeWidth) && clientX <= viewportWidth;
}

export function normalizeSidePanelMode(value: string | null | undefined): SidePanelMode {
  return value === "hidden" || value === "auto" || value === "pinned" ? value : "pinned";
}

export function isSidePanelVisible(mode: SidePanelMode, autoVisible: boolean): boolean {
  if (mode === "pinned") {
    return true;
  }
  if (mode === "hidden") {
    return false;
  }
  return autoVisible;
}

export function nextSidePanelAutoVisible(
  side: SidePanelSide,
  mode: SidePanelMode,
  currentVisible: boolean,
  event: SidePanelAutoEvent
): boolean {
  if (mode !== "auto") {
    return currentVisible;
  }
  if (event === "edge-enter" || event === "panel-enter") {
    return true;
  }
  if (event === "panel-leave") {
    return false;
  }
  return side === "right" ? true : currentVisible;
}

export function shouldIgnoreWorkspaceAutoHide(
  relatedTargetInsideFloatingUi: boolean,
  pointerTargetInsideFloatingUi: boolean,
  pointerInsideFloatingBounds = false
): boolean {
  return relatedTargetInsideFloatingUi || pointerTargetInsideFloatingUi || pointerInsideFloatingBounds;
}
