import { MemoizedViewSection } from "./appViewRenderBoundary";

type AppStatusbarProps = {
  scope: Record<string, any>;
  inputs: readonly unknown[];
};

export function AppStatusbar({ scope, inputs }: AppStatusbarProps) {
  return (
    <MemoizedViewSection
      section="statusbar"
      inputs={inputs}
      render={() => <AppStatusbarContent scope={scope} />}
    />
  );
}
function AppStatusbarContent({ scope }: { scope: Record<string, any> }) {
  const {
    Grid2X2,
    connectSource,
    currentSpaceId,
    currentZoomPercent,
    edges,
    mode,
    mousePositionTextRef,
    nodes,
    operationLogRef,
    operationLogStatusRef,
    resetViewportZoom,
    saveRequired,
    selectedCount,
    selectedNodeTransformStatus,
    setTopologyWarningPanelClosed,
    setUnsavedChangesDialogOpen,
    startStatusbarResize,
    topologyErrors,
    topologyStatus,
    warningStatusText,
    warningStatusTitle
  } = scope;
  // 目录名 = 空间 id（data/workspaces/<id>/），改名只改显示名、id 不动，故两者会分叉 ——
  // 认目录只能靠 id，这里固定显示它。名字放 title（悬浮可见），不占栏宽。
  const currentSpaceName = (Array.isArray(scope.spaces) ? scope.spaces : [])
    .find((space: any) => space?.id === currentSpaceId)?.name ?? "";
  const copySpaceId = (event: any) => {
    const id = String(currentSpaceId ?? "");
    if (!id) return;
    const rect = event.currentTarget.getBoundingClientRect();
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
    <footer className="bottom-statusbar" aria-label="运行状态">
      <div className="statusbar-resize-handle" role="separator" aria-orientation="horizontal" aria-label="调整提示信息栏高度" title="拖拽调整提示信息栏高度" onPointerDown={startStatusbarResize}/>
      <span className="status-pill">
        坐标 <span ref={mousePositionTextRef}>X:- Y:-</span>
      </span>
      <button
        type="button"
        className="status-pill status-zoom-pill"
        title={`当前视图缩放比 ${currentZoomPercent}%，点击回到 100%`}
        aria-label="缩放回到 100%"
        onClick={resetViewportZoom}
      >
        缩放 {currentZoomPercent}%
      </button>
      <span className={`status-pill topology-${topologyStatus.state}`} title={topologyStatus.message}>
        拓扑 {topologyStatus.message}
      </span>
      <span className={`status-pill warning-${topologyErrors.length > 0 ? "active" : "idle"}`} title={topologyErrors.length > 0 ? `${warningStatusTitle}；点击打开拓扑告警窗口。` : warningStatusTitle} onClick={() => topologyErrors.length > 0 && setTopologyWarningPanelClosed(false)}>
        {warningStatusText}
      </span>
      <span ref={operationLogStatusRef} className="status-pill status-log" title={operationLogRef.current}>
        日志 {operationLogRef.current}
      </span>
      <span className="status-pill">
        <Grid2X2 size={15}/>
        元件 {nodes.length}
      </span>
      <span className="status-pill">联络线 {edges.length}</span>
      <span className="status-pill">选中 {selectedCount}</span>
      <span
        className="status-pill"
        title={`当前工作空间：${currentSpaceName || "—"}（id：${currentSpaceId || "—"}）。目录名就是 id，点击复制。`}
      >
        空间ID
        {/* 间距交给 .status-pill 自己的 gap: 6px，不再叠一层 inline margin */}
        <span className="id-copy-cell" aria-label="复制工作空间 ID" onClick={copySpaceId}>
          {currentSpaceId || "—"}
        </span>
      </span>
      {selectedNodeTransformStatus && (<span className="status-pill status-transform" title={selectedNodeTransformStatus.title}>
        图元 缩放 {selectedNodeTransformStatus.scaleText} 旋转 {selectedNodeTransformStatus.rotationText}
      </span>)}
      {saveRequired && <strong onClick={() => setUnsavedChangesDialogOpen(true)} style={{ cursor: "pointer" }} title="点击查看未保存的修改">未保存</strong>}
      {mode === "connect" && <strong>{connectSource ? "选择同类型目标端子" : "选择起点端子"}</strong>}
      {mode === "static-draw" && <strong>点击落点，双击或 Enter 完成，Esc 取消</strong>}
    </footer>
  );
}
