import { MemoizedViewSection } from "./appViewRenderBoundary";

import type { ReactNode } from "react";

type AppLeftPanelProps = {
  scope: Record<string, any>;
  inputs: readonly unknown[];
  embeddedRightPanel?: ReactNode;
};

export function AppLeftPanel({ scope, inputs, embeddedRightPanel }: AppLeftPanelProps) {
  return (
    <MemoizedViewSection
      section="left-panel"
      inputs={inputs}
      render={() => <AppLeftPanelContent scope={scope} embeddedRightPanel={embeddedRightPanel} />}
    />
  );
}
function AppLeftPanelContent({ scope, embeddedRightPanel }: { scope: Record<string, any>; embeddedRightPanel?: ReactNode }) {
  const {
    effectiveLeftPanelTab,
    activeSchemeKey,
    handleSidePanelPointerLeave,
    isEditMode,
    leftPanelContent,
    leftPanelRef,
    leftPanelTab,
    leftPanelVisible,
    compactPanelTab,
    schemes,
    findSavedSchemeById,
    projectIdx,
    renderSidePanelModeControls,
    setLeftPanelTab,
    startSidePanelResize,
    stopSidePanelEventPropagation,
    updateAutoPanelVisibility
  } = scope;

  const activeScheme = findSavedSchemeById(schemes ?? [], activeSchemeKey);
  const displaySchemeId = activeScheme?.schemeId;
  const currentSchemeId = Number.isSafeInteger(displaySchemeId) && displaySchemeId > 0
    ? displaySchemeId
    : null;
  const currentProjectIdx = Number.isSafeInteger(projectIdx) && projectIdx > 0 ? projectIdx : null;

  const copyId = async (event: any, value: number) => {
    const rect = event.currentTarget.getBoundingClientRect();
    let message = "已复制";
    try {
      await navigator.clipboard.writeText(String(value));
    } catch {
      message = "复制失败";
    }
    const toast = document.createElement("span");
    toast.className = "id-copy-toast";
    toast.setAttribute("role", "status");
    toast.style.position = "fixed";
    toast.style.left = `${rect.left + rect.width / 2}px`;
    toast.style.top = `${rect.top - 8}px`;
    document.body.appendChild(toast);
    requestAnimationFrame(() => {
      toast.textContent = message;
    });
    setTimeout(() => toast.remove(), 1000);
  };

  return (
    <div data-ui-module="module.leftPanel" className="ui-customization-module-shell">
    <aside ref={leftPanelRef} className={`library-panel floating-side-panel ${leftPanelVisible ? "visible" : "hidden"} left-panel-compact-${compactPanelTab}`} onPointerDown={stopSidePanelEventPropagation} onPointerMoveCapture={stopSidePanelEventPropagation} onPointerMove={stopSidePanelEventPropagation} onPointerEnter={() => updateAutoPanelVisibility("left", "panel-enter")} onPointerLeave={(event) => handleSidePanelPointerLeave("left", event)} onMouseMoveCapture={stopSidePanelEventPropagation} onMouseMove={stopSidePanelEventPropagation} onClick={stopSidePanelEventPropagation} onDoubleClick={stopSidePanelEventPropagation} onContextMenu={stopSidePanelEventPropagation} onKeyDown={stopSidePanelEventPropagation} onKeyUp={stopSidePanelEventPropagation}>
      <div className="side-panel-resize-handle right-edge" role="separator" aria-orientation="vertical" aria-label="调整左侧栏宽度" title="拖拽调整左侧栏宽度" onPointerDown={(event) => startSidePanelResize(event, "left")}/>
      <div data-ui-content="module.leftPanel.modeControls">{renderSidePanelModeControls("left")}</div>
      <div className="left-panel-tabs" role="tablist" aria-label="左侧资源库">
        <button data-ui-content="module.leftPanel.modelLibrary" className={effectiveLeftPanelTab === "projects" ? "active" : ""} onMouseEnter={() => setLeftPanelTab("projects")} onClick={() => { setLeftPanelTab("projects"); scope.setCompactPanelTab?.("left"); }} role="tab" aria-selected={effectiveLeftPanelTab === "projects"}>
          模型库
        </button>
        {isEditMode && (<>
          <button data-ui-content="module.leftPanel.deviceLibrary" className={leftPanelTab === "library" ? "active" : ""} onMouseEnter={() => setLeftPanelTab("library")} onClick={() => { setLeftPanelTab("library"); scope.setCompactPanelTab?.("left"); }} role="tab" aria-selected={leftPanelTab === "library"}>
            图元库
          </button>
          <button data-ui-content="module.leftPanel.templateLibrary" className={leftPanelTab === "templates" ? "active" : ""} onMouseEnter={() => setLeftPanelTab("templates")} onClick={() => { setLeftPanelTab("templates"); scope.setCompactPanelTab?.("left"); }} role="tab" aria-selected={leftPanelTab === "templates"}>
            模板库
          </button>
        </>)}
      </div>
      <div className="left-panel-embedded-content" data-ui-content="module.leftPanel.embeddedInspector">
        {embeddedRightPanel}
      </div>
      <div className="left-panel-content">
        <div data-ui-content={
          effectiveLeftPanelTab === "projects"
            ? "module.leftPanel.modelLibrary"
            : effectiveLeftPanelTab === "library"
              ? "module.leftPanel.deviceLibrary"
              : "module.leftPanel.templateLibrary"
        }>
          {leftPanelContent}
        </div>
      </div>
      <div className="left-panel-footer">
        <span className="left-panel-footer-item" data-ui-content="module.leftPanel.schemeId">
          <span className="left-panel-footer-label">方案ID：</span>
          <button
            type="button"
            className="scheme-copy-cell"
            title="点击复制方案 ID（schemeId）"
            aria-label={currentSchemeId ? `复制方案 ID ${currentSchemeId}` : "方案 ID 未分配"}
            disabled={currentSchemeId === null}
            onClick={(event) => currentSchemeId && copyId(event, currentSchemeId)}
          >
            {currentSchemeId ?? "—"}
          </button>
        </span>
        <span className="left-panel-footer-item" data-ui-content="module.leftPanel.modelId">
          <span className="left-panel-footer-label">模型ID：</span>
          <button
            type="button"
            className="id-copy-cell"
            title="点击复制模型 ID（model_id）"
            aria-label={currentProjectIdx ? `复制模型 ID ${currentProjectIdx}` : "模型 ID 未分配"}
            disabled={currentProjectIdx === null}
            onClick={(event) => currentProjectIdx && copyId(event, currentProjectIdx)}
          >
            {currentProjectIdx ?? "—"}
          </button>
        </span>
      </div>
    </aside>
    </div>
  );
}
