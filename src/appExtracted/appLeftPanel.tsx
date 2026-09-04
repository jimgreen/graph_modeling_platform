import { MemoizedViewSection } from "./appViewRenderBoundary";

type AppLeftPanelProps = {
  scope: Record<string, any>;
  inputs: readonly unknown[];
};

export function AppLeftPanel({ scope, inputs }: AppLeftPanelProps) {
  return (
    <MemoizedViewSection
      section="left-panel"
      inputs={inputs}
      render={() => <AppLeftPanelContent scope={scope} />}
    />
  );
}
function AppLeftPanelContent({ scope }: { scope: Record<string, any> }) {
  const {
    activeProjectKey,
    effectiveLeftPanelTab,
    handleSidePanelPointerLeave,
    isEditMode,
    leftPanelContent,
    leftPanelRef,
    leftPanelTab,
    leftPanelVisible,
    renderSidePanelModeControls,
    setLeftPanelTab,
    startSidePanelResize,
    stopSidePanelEventPropagation,
    updateAutoPanelVisibility
  } = scope;

  const copyId = (event: any, rawValue: string, kind: "scheme" | "project") => {
    const rect = event.currentTarget.getBoundingClientRect();
    const stripped = rawValue.replace(/^[^:]+:/, "");
    const value = kind === "project" ? stripped.split("/").pop() || "" : stripped;
    const id = value ? decodeURIComponent(value) : "—";
    navigator.clipboard.writeText(id).then(() => {
      const toast = document.createElement("span");
      toast.className = "id-copy-toast";
      toast.textContent = "已复制";
      toast.style.position = "fixed";
      toast.style.left = `${rect.left + rect.width / 2}px`;
      toast.style.top = `${rect.top - 8}px`;
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 1000);
    });
  };

  const displayId = (rawValue: string, kind: "scheme" | "project") => {
    const stripped = rawValue.replace(/^[^:]+:/, "");
    const value = kind === "project" ? stripped.split("/").pop() || "" : stripped;
    return value ? decodeURIComponent(value) : "—";
  };

  return (
    <aside ref={leftPanelRef} className={`library-panel floating-side-panel ${leftPanelVisible ? "visible" : "hidden"}`} onPointerDown={stopSidePanelEventPropagation} onPointerMoveCapture={stopSidePanelEventPropagation} onPointerMove={stopSidePanelEventPropagation} onPointerEnter={() => updateAutoPanelVisibility("left", "panel-enter")} onPointerLeave={(event) => handleSidePanelPointerLeave("left", event)} onMouseMoveCapture={stopSidePanelEventPropagation} onMouseMove={stopSidePanelEventPropagation} onClick={stopSidePanelEventPropagation} onDoubleClick={stopSidePanelEventPropagation} onContextMenu={stopSidePanelEventPropagation} onKeyDown={stopSidePanelEventPropagation} onKeyUp={stopSidePanelEventPropagation}>
      <div className="side-panel-resize-handle right-edge" role="separator" aria-orientation="vertical" aria-label="调整左侧栏宽度" title="拖拽调整左侧栏宽度" onPointerDown={(event) => startSidePanelResize(event, "left")}/>
      {renderSidePanelModeControls("left")}
      <div className="left-panel-tabs" role="tablist" aria-label="左侧资源库">
        <button className={effectiveLeftPanelTab === "projects" ? "active" : ""} onClick={() => setLeftPanelTab("projects")} role="tab" aria-selected={effectiveLeftPanelTab === "projects"}>
          模型库
        </button>
        {isEditMode && (<>
          <button className={leftPanelTab === "library" ? "active" : ""} onClick={() => setLeftPanelTab("library")} role="tab" aria-selected={leftPanelTab === "library"}>
            图元库
          </button>
          <button className={leftPanelTab === "templates" ? "active" : ""} onClick={() => setLeftPanelTab("templates")} role="tab" aria-selected={leftPanelTab === "templates"}>
            模板库
          </button>
        </>)}
      </div>
      <div className="left-panel-content">
        {leftPanelContent}
      </div>
      <div className="left-panel-footer">
        <span className="left-panel-footer-item">
          <span className="left-panel-footer-label">模型ID：</span>
          <span className="id-copy-cell" title="点击复制模型 ID" onClick={(event) => copyId(event, activeProjectKey || "", "project")}>
            {displayId(activeProjectKey || "", "project")}
          </span>
        </span>
      </div>
    </aside>
  );
}
