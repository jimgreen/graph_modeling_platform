export type SidePanelMode = "pinned" | "hidden" | "auto";
export type SidePanelSide = "left" | "right";
export type SidePanelAutoEvent = "edge-enter" | "panel-enter" | "panel-leave" | "canvas-activate";

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
