// @ts-nocheck
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
    currentZoomPercent,
    edges,
    mode,
    mousePositionTextRef,
    nodes,
    operationLogRef,
    operationLogStatusRef,
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

  return (
    <footer className="bottom-statusbar" aria-label="运行状态">
      <div className="statusbar-resize-handle" role="separator" aria-orientation="horizontal" aria-label="调整提示信息栏高度" title="拖拽调整提示信息栏高度" onPointerDown={startStatusbarResize}/>
      <span className="status-pill">
        坐标 <span ref={mousePositionTextRef}>X:- Y:-</span>
      </span>
      <span className="status-pill" title={`当前视图缩放比 ${currentZoomPercent}%`}>
        缩放 {currentZoomPercent}%
      </span>
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
      {selectedNodeTransformStatus && (<span className="status-pill status-transform" title={selectedNodeTransformStatus.title}>
        图元 缩放 {selectedNodeTransformStatus.scaleText} 旋转 {selectedNodeTransformStatus.rotationText}
      </span>)}
      {saveRequired && <strong onClick={() => setUnsavedChangesDialogOpen(true)} style={{ cursor: "pointer" }} title="点击查看未保存的修改">未保存</strong>}
      {mode === "connect" && <strong>{connectSource ? "选择同类型目标端子" : "选择起点端子"}</strong>}
      {mode === "static-draw" && <strong>点击落点，双击或 Enter 完成，Esc 取消</strong>}
    </footer>
  );
}
