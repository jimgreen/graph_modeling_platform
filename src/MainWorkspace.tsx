import { type CSSProperties } from "react";
import { type Point } from "./model";
import { WorkspaceCanvasFrame } from "./WorkspaceCanvasFrame";
import { WorkspaceTopbar } from "./WorkspaceTopbar";

export type MainWorkspaceProps = Record<string, any>;

export function MainWorkspace(props: MainWorkspaceProps) {
  const {
    CANVAS_MINIMAP_HEIGHT,
    CANVAS_MINIMAP_WIDTH,
    Grid2X2,
    LocateFixed,
    MapIcon,
    Maximize2,
    Minus,
    Plus,
    RotateCcw,
    ScanSearch,
    centerSelectedInView,
    connectSource,
    currentZoomPercent,
    edges,
    fitViewToContent,
    fitViewToSelection,
    formatSvgNumber,
    getNodeScaleX,
    getNodeScaleY,
    handleMinimapNavigate,
    hideAutoPanelsFromWorkspace,
    mapPointToMinimap,
    minimapContentHeight,
    minimapContentWidth,
    minimapNodes,
    minimapOffsetX,
    minimapOffsetY,
    minimapRoutes,
    minimapScale,
    minimapViewportBottom,
    minimapViewportLeft,
    minimapViewportRight,
    minimapViewportTop,
    minimapVisible,
    mode,
    mousePositionTextRef,
    nodes,
    operationLogRef,
    operationLogStatusRef,
    resetViewport,
    saveRequired,
    selectedCanvasBounds,
    selectedCount,
    selectedNodeIdSet,
    selectedNodeTransformStatus,
    setMinimapVisible,
    startStatusbarResize,
    topologyErrors,
    topologyStatus,
    viewportOverlayStyle,
    warningStatusText,
    warningStatusTitle,
    zoomViewportAtCenter
  } = props;

  return (
      <main className="workspace" onPointerEnter={hideAutoPanelsFromWorkspace}>
        <WorkspaceTopbar {...props} />

        <WorkspaceCanvasFrame {...props} />
        <div
          className="viewport-overlay"
          style={viewportOverlayStyle}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="viewport-controls" role="group" aria-label="视口控制">
            <button type="button" title="适配视图" aria-label="适配视图" onClick={fitViewToContent}>
              <Maximize2 size={16} />
            </button>
            <button type="button" title="居中选中" aria-label="居中选中" disabled={!selectedCanvasBounds} onClick={centerSelectedInView}>
              <LocateFixed size={16} />
            </button>
            <button type="button" title="缩放到选中区域" aria-label="缩放到选中区域" disabled={!selectedCanvasBounds} onClick={fitViewToSelection}>
              <ScanSearch size={16} />
            </button>
            <button type="button" title="放大" aria-label="放大" onClick={() => zoomViewportAtCenter(0.82)}>
              <Plus size={16} />
            </button>
            <button type="button" title="缩小" aria-label="缩小" onClick={() => zoomViewportAtCenter(1.18)}>
              <Minus size={16} />
            </button>
            <button type="button" title="重置缩放" aria-label="重置缩放" onClick={resetViewport}>
              <RotateCcw size={16} />
            </button>
            <button
              type="button"
              className={minimapVisible ? "active" : ""}
              title={minimapVisible ? "隐藏小地图" : "显示小地图"}
              aria-label={minimapVisible ? "隐藏小地图" : "显示小地图"}
              onClick={() => setMinimapVisible((current: boolean) => !current)}
            >
              <MapIcon size={16} />
            </button>
          </div>
          {minimapVisible && (
            <div className="canvas-minimap" aria-label="鸟瞰导航">
              <svg
                viewBox={`0 0 ${CANVAS_MINIMAP_WIDTH} ${CANVAS_MINIMAP_HEIGHT}`}
                onPointerDown={(event) => {
                  handleMinimapNavigate(event);
                  event.currentTarget.setPointerCapture(event.pointerId);
                }}
                onPointerMove={(event) => {
                  if (event.buttons & 1) {
                    handleMinimapNavigate(event);
                  }
                }}
              >
                <rect
                  className="minimap-canvas"
                  x={minimapOffsetX}
                  y={minimapOffsetY}
                  width={minimapContentWidth}
                  height={minimapContentHeight}
                />
                {minimapRoutes.map((route: any) => (
                  <polyline
                    key={`minimap-route-${route.edgeId}`}
                    className="minimap-route"
                    points={route.points.map(mapPointToMinimap).map((point: Point) => `${formatSvgNumber(point.x)},${formatSvgNumber(point.y)}`).join(" ")}
                  />
                ))}
                {minimapNodes.map((node: any) => {
                  const center = mapPointToMinimap(node.position);
                  const width = Math.max(1.8, Math.abs(getNodeScaleX(node)) * node.size.width * minimapScale);
                  const height = Math.max(1.8, Math.abs(getNodeScaleY(node)) * node.size.height * minimapScale);
                  return (
                    <rect
                      key={`minimap-node-${node.id}`}
                      className={`minimap-node ${selectedNodeIdSet.has(node.id) ? "selected" : ""}`}
                      x={center.x - width / 2}
                      y={center.y - height / 2}
                      width={width}
                      height={height}
                      rx="1"
                    />
                  );
                })}
                <rect
                  className="minimap-viewport"
                  x={minimapViewportLeft}
                  y={minimapViewportTop}
                  width={Math.max(4, minimapViewportRight - minimapViewportLeft)}
                  height={Math.max(4, minimapViewportBottom - minimapViewportTop)}
                />
              </svg>
            </div>
          )}
        </div>
        <footer className="bottom-statusbar" aria-label="运行状态">
          <div
            className="statusbar-resize-handle"
            role="separator"
            aria-orientation="horizontal"
            aria-label="调整提示信息栏高度"
            title="拖拽调整提示信息栏高度"
            onPointerDown={startStatusbarResize}
          />
          <span className="status-pill">
            坐标 <span ref={mousePositionTextRef}>X:- Y:-</span>
          </span>
          <span className="status-pill" title={`当前视图缩放比 ${currentZoomPercent}%`}>
            缩放 {currentZoomPercent}%
          </span>
          <span className={`status-pill topology-${topologyStatus.state}`} title={topologyStatus.message}>
            拓扑 {topologyStatus.message}
          </span>
          <span className={`status-pill warning-${topologyErrors.length > 0 ? "active" : "idle"}`} title={warningStatusTitle}>
            {warningStatusText}
          </span>
          <span ref={operationLogStatusRef} className="status-pill status-log" title={operationLogRef.current}>
            日志 {operationLogRef.current}
          </span>
          <span className="status-pill">
            <Grid2X2 size={15} />
            元件 {nodes.length}
          </span>
          <span className="status-pill">联络线 {edges.length}</span>
          <span className="status-pill">选中 {selectedCount}</span>
          {selectedNodeTransformStatus && (
            <span className="status-pill status-transform" title={selectedNodeTransformStatus.title}>
              图元 缩放 {selectedNodeTransformStatus.scaleText} 旋转 {selectedNodeTransformStatus.rotationText}
            </span>
          )}
          {saveRequired && <strong>未保存</strong>}
          {mode === "connect" && <strong>{connectSource ? "选择同类型目标端子" : "选择起点端子"}</strong>}
          {mode === "static-draw" && <strong>点击落点，双击或 Enter 完成，Esc 取消</strong>}
        </footer>
      </main>
  );
}
