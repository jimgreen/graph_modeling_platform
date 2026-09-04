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
    effectiveLeftPanelTab,
    handleSidePanelPointerLeave,
    isEditMode,
    leftPanelContent,
    leftPanelRef,
    leftPanelTab,
    leftPanelVisible,
    projectIdx,
    renderSidePanelModeControls,
    setLeftPanelTab,
    startSidePanelResize,
    stopSidePanelEventPropagation,
    updateAutoPanelVisibility
  } = scope;

  // 底部显示当前模型的 model_id（project.idx 编号），点击复制该编号
  const copyModelId = (event: any, projectIdx: number) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const id = String(projectIdx || "");
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
          <span className="id-copy-cell" title="点击复制模型 ID（model_id）" onClick={(event) => copyModelId(event, projectIdx)}>
            {projectIdx > 0 ? projectIdx : "—"}
          </span>
        </span>
      </div>
    </aside>
  );
}
