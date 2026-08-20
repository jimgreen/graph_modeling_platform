import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { AlertTriangle, Cable, ChevronRight, Download, FolderTree, MapPin, Network, RefreshCw, Trash2 } from "lucide-react";

import {
  analyzeAllNetworkTopology,
  analyzeGlobalLineConsistency,
  analyzeGlobalLinesForAllNetworkTopology,
  collectAllNetworkTopologyModels,
  collectAllNetworkTopologyReferenceModels,
  defaultAllNetworkTopologySelection,
  modelForGlobalLineReference,
  referencedModelsForGlobalLines,
  type AllNetworkTopologyAlert,
  type AllNetworkTopologyModel,
  type AllNetworkTopologyReferenceModel,
  type AllNetworkTopologyResult
} from "./all-network-topology";
import {
  globalLineEndpointReference,
  type GlobalLineEndpoint,
  type GlobalLineRecord
} from "./global-lines";
import { buildMultiModelEFileExport } from "./model";
import { buildEFileExportOptionsFromLibrary } from "./appExtracted/appDeviceDefinitionFactories";
import { apiPath } from "./config";
import { saveLazyTextFile } from "./fileIO";
import { WindowCloseButton } from "./WindowCloseButton";

type AllNetworkTopologyDialogProps = {
  scope: Record<string, any>;
};

type CompletedTopologyRun = {
  selectionKey: string;
  models: AllNetworkTopologyModel[];
  result: AllNetworkTopologyResult;
};

type FloatingWindowFrame = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type FloatingWindowPointerState = {
  pointerId: number;
  startClientX: number;
  startClientY: number;
  frame: FloatingWindowFrame;
};

type GlobalLineWindowResizePointerState = FloatingWindowPointerState & {
  direction: GlobalLineWindowResizeDirection;
};

const MODEL_TYPE_ORDER = ["厂站", "馈线", "台区"] as const;
const FLOATING_WINDOW_MARGIN = 8;
const FLOATING_WINDOW_MIN_WIDTH = 760;
const FLOATING_WINDOW_MIN_HEIGHT = 520;
const GLOBAL_LINE_WINDOW_MARGIN = 8;
const GLOBAL_LINE_WINDOW_MIN_WIDTH = 680;
const GLOBAL_LINE_WINDOW_MIN_HEIGHT = 380;
const GLOBAL_LINE_WINDOW_RESIZE_DIRECTIONS = ["n", "ne", "e", "se", "s", "sw", "w", "nw"] as const;
type GlobalLineWindowResizeDirection = (typeof GLOBAL_LINE_WINDOW_RESIZE_DIRECTIONS)[number];
const GLOBAL_LINE_WINDOW_RESIZE_LABELS: Record<GlobalLineWindowResizeDirection, string> = {
  n: "上边缘",
  ne: "右上角",
  e: "右边缘",
  se: "右下角",
  s: "下边缘",
  sw: "左下角",
  w: "左边缘",
  nw: "左上角"
};

function viewportSize() {
  return {
    width: typeof window === "undefined" ? 1440 : window.innerWidth,
    height: typeof window === "undefined" ? 900 : window.innerHeight
  };
}

function clampFloatingWindowFrame(frame: FloatingWindowFrame): FloatingWindowFrame {
  const viewport = viewportSize();
  const maxWidth = Math.max(320, viewport.width - FLOATING_WINDOW_MARGIN * 2);
  const maxHeight = Math.max(280, viewport.height - FLOATING_WINDOW_MARGIN * 2);
  const minWidth = Math.min(FLOATING_WINDOW_MIN_WIDTH, maxWidth);
  const minHeight = Math.min(FLOATING_WINDOW_MIN_HEIGHT, maxHeight);
  const width = Math.min(maxWidth, Math.max(minWidth, frame.width));
  const height = Math.min(maxHeight, Math.max(minHeight, frame.height));
  const maxX = Math.max(FLOATING_WINDOW_MARGIN, viewport.width - width - FLOATING_WINDOW_MARGIN);
  const maxY = Math.max(FLOATING_WINDOW_MARGIN, viewport.height - height - FLOATING_WINDOW_MARGIN);
  return {
    x: Math.min(maxX, Math.max(FLOATING_WINDOW_MARGIN, frame.x)),
    y: Math.min(maxY, Math.max(FLOATING_WINDOW_MARGIN, frame.y)),
    width,
    height
  };
}

function defaultFloatingWindowFrame(): FloatingWindowFrame {
  const viewport = viewportSize();
  const width = Math.min(1180, Math.max(320, viewport.width - 48));
  const height = Math.min(760, Math.max(280, viewport.height - 48));
  return clampFloatingWindowFrame({
    x: (viewport.width - width) / 2,
    y: (viewport.height - height) / 2,
    width,
    height
  });
}

function clampGlobalLineListWindowFrame(frame: FloatingWindowFrame): FloatingWindowFrame {
  const viewport = viewportSize();
  const maxWidth = Math.max(320, viewport.width - GLOBAL_LINE_WINDOW_MARGIN * 2);
  const maxHeight = Math.max(280, viewport.height - GLOBAL_LINE_WINDOW_MARGIN * 2);
  const minWidth = Math.min(GLOBAL_LINE_WINDOW_MIN_WIDTH, maxWidth);
  const minHeight = Math.min(GLOBAL_LINE_WINDOW_MIN_HEIGHT, maxHeight);
  const width = Math.min(maxWidth, Math.max(minWidth, frame.width));
  const height = Math.min(maxHeight, Math.max(minHeight, frame.height));
  return {
    x: Math.min(viewport.width - width - GLOBAL_LINE_WINDOW_MARGIN, Math.max(GLOBAL_LINE_WINDOW_MARGIN, frame.x)),
    y: Math.min(viewport.height - height - GLOBAL_LINE_WINDOW_MARGIN, Math.max(GLOBAL_LINE_WINDOW_MARGIN, frame.y)),
    width,
    height
  };
}

function defaultGlobalLineListWindowFrame(): FloatingWindowFrame {
  const viewport = viewportSize();
  const width = Math.min(920, Math.max(320, viewport.width - 80));
  const height = Math.min(560, Math.max(280, viewport.height - 80));
  return clampGlobalLineListWindowFrame({
    x: (viewport.width - width) / 2,
    y: (viewport.height - height) / 2,
    width,
    height
  });
}

function resizeGlobalLineListWindowFrame(
  frame: FloatingWindowFrame,
  direction: GlobalLineWindowResizeDirection,
  deltaX: number,
  deltaY: number
): FloatingWindowFrame {
  const viewport = viewportSize();
  const minWidth = Math.min(GLOBAL_LINE_WINDOW_MIN_WIDTH, viewport.width - GLOBAL_LINE_WINDOW_MARGIN * 2);
  const minHeight = Math.min(GLOBAL_LINE_WINDOW_MIN_HEIGHT, viewport.height - GLOBAL_LINE_WINDOW_MARGIN * 2);
  let left = frame.x;
  let right = frame.x + frame.width;
  let top = frame.y;
  let bottom = frame.y + frame.height;

  if (direction.includes("w")) {
    left = Math.min(right - minWidth, Math.max(GLOBAL_LINE_WINDOW_MARGIN, left + deltaX));
  }
  if (direction.includes("e")) {
    right = Math.max(left + minWidth, Math.min(viewport.width - GLOBAL_LINE_WINDOW_MARGIN, right + deltaX));
  }
  if (direction.includes("n")) {
    top = Math.min(bottom - minHeight, Math.max(GLOBAL_LINE_WINDOW_MARGIN, top + deltaY));
  }
  if (direction.includes("s")) {
    bottom = Math.max(top + minHeight, Math.min(viewport.height - GLOBAL_LINE_WINDOW_MARGIN, bottom + deltaY));
  }

  return { x: left, y: top, width: right - left, height: bottom - top };
}

function selectionKey(ids: Iterable<string>) {
  return [...ids].sort().join("|");
}

function modelLoadError(model: AllNetworkTopologyModel, error: unknown): AllNetworkTopologyAlert {
  return {
    id: `${model.projectId}:load-failed`,
    projectId: model.projectId,
    schemeId: model.schemeId,
    modelName: model.name,
    deviceName: "模型",
    message: error instanceof Error ? error.message : `读取模型“${model.name}”失败。`,
    relatedNodeIds: []
  };
}

async function loadFullModel<T extends AllNetworkTopologyReferenceModel>(scope: Record<string, any>, model: T): Promise<T> {
  if (!scope.savedProjectRecordIsSummary?.(model.record)) {
    return model;
  }
  const loadedRecord = await scope.fetchBackendProjectRecord(model.schemePath, model.name);
  return {
    ...model,
    idx: Number.isSafeInteger(Number(loadedRecord?.project?.idx)) && Number(loadedRecord.project.idx) > 0
      ? Number(loadedRecord.project.idx)
      : model.idx,
    record: {
      ...loadedRecord,
      id: model.projectId,
      name: loadedRecord?.name || model.name
    }
  } as T;
}

async function loadGlobalLineRecordsForTopology(): Promise<GlobalLineRecord[]> {
  const response = await fetch(apiPath("/global-lines"));
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload?.ok || !Array.isArray(payload.records)) {
    throw new Error(String(payload?.message ?? `读取全局线路列表失败（HTTP ${response.status}）。`));
  }
  return payload.records as GlobalLineRecord[];
}

type GlobalLineListWindowProps = {
  open: boolean;
  loading: boolean;
  error: string;
  records: GlobalLineRecord[];
  referenceModels: AllNetworkTopologyReferenceModel[];
  consistencyRunning: boolean;
  consistencyResult: AllNetworkTopologyResult | null;
  deletingRecordId: string;
  onClose: () => void;
  onRefresh: () => void;
  onRunConsistency: () => void;
  onLocateAlert: (alert: AllNetworkTopologyAlert) => void;
  onLocateEndpoint: (record: GlobalLineRecord, endpoint: GlobalLineEndpoint) => void;
  onDeleteEmptyRecord: (record: GlobalLineRecord) => void;
};

function globalLineConsistencyAlertSource(alert: AllNetworkTopologyAlert) {
  return /:(?:missing-record|model-|other-model-)/.test(alert.id) ? "模型反查" : "全局线路表";
}

function GlobalLineListWindow({
  open,
  loading,
  error,
  records,
  referenceModels,
  consistencyRunning,
  consistencyResult,
  deletingRecordId,
  onClose,
  onRefresh,
  onRunConsistency,
  onLocateAlert,
  onLocateEndpoint,
  onDeleteEmptyRecord
}: GlobalLineListWindowProps) {
  const [activeView, setActiveView] = useState<"lines" | "alerts">("lines");
  const [windowFrame, setWindowFrame] = useState<FloatingWindowFrame>(defaultGlobalLineListWindowFrame);
  const dialogRef = useRef<HTMLElement | null>(null);
  const windowDragRef = useRef<FloatingWindowPointerState | null>(null);
  const windowResizeRef = useRef<GlobalLineWindowResizePointerState | null>(null);
  const consistencyAlerts = [
    ...(consistencyResult?.errors ?? []).map((alert) => ({ alert, severity: "错误" as const })),
    ...(consistencyResult?.warnings ?? []).map((alert) => ({ alert, severity: "警告" as const }))
  ];

  useEffect(() => {
    const handleViewportResize = () => {
      setWindowFrame((current) => clampGlobalLineListWindowFrame(current));
    };
    window.addEventListener("resize", handleViewportResize);
    return () => window.removeEventListener("resize", handleViewportResize);
  }, []);

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const state = windowResizeRef.current;
      if (!state || state.pointerId !== event.pointerId) return;
      setWindowFrame(resizeGlobalLineListWindowFrame(
        state.frame,
        state.direction,
        event.clientX - state.startClientX,
        event.clientY - state.startClientY
      ));
    };
    const finishPointerResize = (event: PointerEvent) => {
      if (windowResizeRef.current?.pointerId === event.pointerId) {
        windowResizeRef.current = null;
      }
    };
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", finishPointerResize);
    window.addEventListener("pointercancel", finishPointerResize);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", finishPointerResize);
      window.removeEventListener("pointercancel", finishPointerResize);
    };
  }, []);

  const handleGlobalLineWindowDragPointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.button !== 0 || (event.target instanceof Element && event.target.closest("button, a, input, select, textarea"))) {
      return;
    }
    const rect = dialogRef.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }
    windowDragRef.current = {
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      frame: { x: rect.left, y: rect.top, width: rect.width, height: rect.height }
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  };

  const handleGlobalLineWindowDragPointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    const state = windowDragRef.current;
    if (!state || state.pointerId !== event.pointerId) {
      return;
    }
    setWindowFrame(clampGlobalLineListWindowFrame({
      ...state.frame,
      x: state.frame.x + event.clientX - state.startClientX,
      y: state.frame.y + event.clientY - state.startClientY
    }));
  };

  const finishGlobalLineWindowDrag = (event: ReactPointerEvent<HTMLElement>) => {
    if (windowDragRef.current?.pointerId !== event.pointerId) {
      return;
    }
    windowDragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const handleGlobalLineWindowResizePointerDown = (
    event: ReactPointerEvent<HTMLSpanElement>,
    direction: GlobalLineWindowResizeDirection
  ) => {
    if (event.button !== 0) {
      return;
    }
    const rect = dialogRef.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }
    windowResizeRef.current = {
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      frame: { x: rect.left, y: rect.top, width: rect.width, height: rect.height },
      direction
    };
    event.preventDefault();
    event.stopPropagation();
  };

  return (
    <div
      className={`global-line-list-window-layer ${open ? "visible" : "hidden"}`}
      role="presentation"
      aria-hidden={!open}
    >
      <section
        ref={dialogRef}
        className="global-line-list-dialog window-close-host"
        style={{
          left: `${windowFrame.x}px`,
          top: `${windowFrame.y}px`,
          width: `${windowFrame.width}px`,
          height: `${windowFrame.height}px`
        }}
        role="dialog"
        aria-labelledby="global-line-list-title"
        aria-describedby="global-line-list-help"
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            onClose();
          }
        }}
      >
        <WindowCloseButton label="关闭全局线路列表" onClick={onClose} />
        <header
          className="global-line-list-header"
          onPointerDown={handleGlobalLineWindowDragPointerDown}
          onPointerMove={handleGlobalLineWindowDragPointerMove}
          onPointerUp={finishGlobalLineWindowDrag}
          onPointerCancel={finishGlobalLineWindowDrag}
          title="拖拽标题栏移动窗口"
        >
          <div>
            <h3 id="global-line-list-title"><Cable size={19} aria-hidden="true" />全局线路</h3>
            <p id="global-line-list-help">集中查看全局线路及其首末端模型；拖拽标题栏移动窗口，拖拽边缘或角点调整大小。</p>
          </div>
          <div className="global-line-list-header-actions">
            <span>{records.length} 条线路</span>
            <button
              type="button"
              className="global-line-consistency-run"
              onClick={() => {
                setActiveView("alerts");
                onRunConsistency();
              }}
              disabled={consistencyRunning}
            >
              <AlertTriangle size={15} aria-hidden="true" />
              {consistencyRunning ? "校验中..." : "一致性校验"}
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveView("lines");
                onRefresh();
              }}
              disabled={loading || consistencyRunning}
            >
              <RefreshCw size={15} aria-hidden="true" />
              {loading ? "刷新中..." : "刷新"}
            </button>
          </div>
        </header>

        <div className="global-line-consistency-tabs" role="tablist" aria-label="全局线路窗口内容">
          <button
            type="button"
            role="tab"
            aria-selected={activeView === "lines"}
            className={activeView === "lines" ? "active" : ""}
            onClick={() => setActiveView("lines")}
          >
            线路列表 <span>{records.length}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeView === "alerts"}
            className={activeView === "alerts" ? "active" : ""}
            onClick={() => setActiveView("alerts")}
          >
            一致性报警 <span>{consistencyAlerts.length}</span>
          </button>
        </div>

        {activeView === "lines" ? (
          <div className="global-line-list-table-wrap">
            <table className="global-line-list-table">
            <thead>
              <tr>
                <th>idx</th>
                <th>线路名称</th>
                <th>首端所在模型</th>
                <th>末端所在模型</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => {
                const sourceReference = globalLineEndpointReference(record, "source");
                const targetReference = globalLineEndpointReference(record, "target");
                const canDelete = !sourceReference && !targetReference;
                const sourceModel = modelForGlobalLineReference(sourceReference, referenceModels);
                const targetModel = modelForGlobalLineReference(targetReference, referenceModels);
                const sourceLabel = sourceModel?.name ?? sourceReference?.projectName ?? "未关联";
                const targetLabel = targetModel?.name ?? targetReference?.projectName ?? "未关联";
                return (
                  <tr key={record.id}>
                    <td><span className="global-line-list-index">{record.idx || "-"}</span></td>
                    <td>
                      <span className="global-line-list-name">{record.name}</span>
                      <small>{record.energyType === "dc" ? "直流线路" : "交流线路"}</small>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="global-line-list-endpoint"
                        aria-label="首端所在模型"
                        title={sourceModel ? `切换到模型“${sourceModel.name}”` : sourceReference ? "首端对应模型文件不存在" : "首端尚未关联模型"}
                        disabled={!sourceModel}
                        onClick={() => onLocateEndpoint(record, "source")}
                      >
                        <MapPin size={15} aria-hidden="true" />
                        <span>
                          {sourceLabel}
                          <small>{sourceModel ? sourceModel.schemePath.join(" / ") : sourceReference ? "模型文件不存在" : "首端为空"}</small>
                        </span>
                      </button>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="global-line-list-endpoint"
                        aria-label="末端所在模型"
                        title={targetModel ? `切换到模型“${targetModel.name}”` : targetReference ? "末端对应模型文件不存在" : "末端尚未关联模型"}
                        disabled={!targetModel}
                        onClick={() => onLocateEndpoint(record, "target")}
                      >
                        <MapPin size={15} aria-hidden="true" />
                        <span>
                          {targetLabel}
                          <small>{targetModel ? targetModel.schemePath.join(" / ") : targetReference ? "模型文件不存在" : "末端为空"}</small>
                        </span>
                      </button>
                    </td>
                    <td className="global-line-list-operation">
                      {canDelete ? (
                        <button
                          type="button"
                          className="global-line-list-delete"
                          aria-label={`删除全局线路“${record.name}”`}
                          title="删除这条两端均为空的全局线路"
                          disabled={Boolean(deletingRecordId)}
                          onClick={() => onDeleteEmptyRecord(record)}
                        >
                          <Trash2 size={15} aria-hidden="true" />
                          {deletingRecordId === record.id ? "删除中" : "删除"}
                        </button>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            </table>
            {loading && records.length === 0 ? (
              <div className="global-line-list-placeholder">正在读取全局线路列表...</div>
            ) : error ? (
              <div className="global-line-list-placeholder error">{error}</div>
            ) : records.length === 0 ? (
              <div className="global-line-list-placeholder">当前还没有全局线路记录。</div>
            ) : null}
          </div>
        ) : (
          <div className="global-line-list-table-wrap global-line-consistency-alert-wrap">
            <table className="global-line-list-table global-line-consistency-alert-table">
              <thead>
                <tr>
                  <th>类型 / 来源</th>
                  <th>所在模型</th>
                  <th>线路</th>
                  <th>报警信息</th>
                </tr>
              </thead>
              <tbody>
                {consistencyAlerts.map(({ alert, severity }) => {
                  const canLocate = Boolean(alert.projectId && (alert.nodeId || alert.edgeId || alert.relatedNodeIds.length > 0));
                  return (
                    <tr
                      key={`${severity}:${alert.id}`}
                      className={canLocate ? "locatable" : ""}
                      onDoubleClick={() => onLocateAlert(alert)}
                      title={canLocate ? "双击切换模型并定位线路" : "该报警没有可定位的模型线路"}
                    >
                      <td>
                        <span className={`global-line-consistency-severity ${severity === "错误" ? "error" : "warning"}`}>
                          {severity}
                        </span>
                        <small>{globalLineConsistencyAlertSource(alert)}</small>
                      </td>
                      <td>{alert.modelName}</td>
                      <td>{alert.deviceName}</td>
                      <td>{alert.message}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {consistencyRunning ? (
              <div className="global-line-list-placeholder">正在读取全部厂站、馈线和台区模型并执行一致性校验...</div>
            ) : error ? (
              <div className="global-line-list-placeholder error">{error}</div>
            ) : !consistencyResult ? (
              <div className="global-line-list-placeholder">点击“一致性校验”检查全局线路表和全部模型文件。</div>
            ) : consistencyAlerts.length === 0 ? (
              <div className="global-line-list-placeholder success">一致性校验通过，未发现报警。</div>
            ) : (
              <div className="global-line-consistency-locate-help">双击定位：可切换到对应模型并居中、选中线路；无模型记录的报警不可定位。</div>
            )}
          </div>
        )}
        {GLOBAL_LINE_WINDOW_RESIZE_DIRECTIONS.map((direction) => (
          <span
            key={direction}
            role="separator"
            className={`global-line-list-resize-handle ${direction}`}
            data-resize-direction={direction}
            aria-label={`调整全局线路窗口大小（${GLOBAL_LINE_WINDOW_RESIZE_LABELS[direction]}）`}
            title={`拖拽${GLOBAL_LINE_WINDOW_RESIZE_LABELS[direction]}调整窗口大小`}
            onPointerDown={(event) => handleGlobalLineWindowResizePointerDown(event, direction)}
          />
        ))}
      </section>
    </div>
  );
}

export function AllNetworkTopologyDialog({ scope }: AllNetworkTopologyDialogProps) {
  const open = Boolean(scope.allNetworkTopologyDialogOpen);
  const globalLineListOpen = Boolean(scope.globalLineListOpen);
  const models = useMemo(
    () => collectAllNetworkTopologyModels(scope.schemes ?? []),
    [scope.schemes]
  );
  const referenceModels = useMemo(
    () => collectAllNetworkTopologyReferenceModels(scope.schemes ?? []),
    [scope.schemes]
  );
  const modelSignature = models.map((model) => `${model.projectId}:${model.idx}:${model.modelType}`).join("|");
  const [selectedProjectIds, setSelectedProjectIds] = useState<Set<string>>(new Set());
  const [expandedModelTypes, setExpandedModelTypes] = useState<Set<string>>(new Set(MODEL_TYPE_ORDER));
  const [activeTab, setActiveTab] = useState<"errors" | "warnings">("errors");
  const [running, setRunning] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [completedRun, setCompletedRun] = useState<CompletedTopologyRun | null>(null);
  const [globalLineListLoading, setGlobalLineListLoading] = useState(false);
  const [globalLineListError, setGlobalLineListError] = useState("");
  const [globalLineListRecords, setGlobalLineListRecords] = useState<GlobalLineRecord[]>([]);
  const [globalLineConsistencyRunning, setGlobalLineConsistencyRunning] = useState(false);
  const [globalLineConsistencyResult, setGlobalLineConsistencyResult] = useState<AllNetworkTopologyResult | null>(null);
  const [globalLineConsistencyModels, setGlobalLineConsistencyModels] = useState<AllNetworkTopologyModel[]>([]);
  const [deletingGlobalLineRecordId, setDeletingGlobalLineRecordId] = useState("");
  const [windowFrame, setWindowFrame] = useState<FloatingWindowFrame>(defaultFloatingWindowFrame);
  const selectAllRef = useRef<HTMLInputElement | null>(null);
  const dialogRef = useRef<HTMLElement | null>(null);
  const windowDragRef = useRef<FloatingWindowPointerState | null>(null);
  const windowResizeRef = useRef<FloatingWindowPointerState | null>(null);

  useEffect(() => {
    setSelectedProjectIds(new Set(defaultAllNetworkTopologySelection(models)));
    setExpandedModelTypes(new Set(MODEL_TYPE_ORDER));
    setActiveTab("errors");
    setCompletedRun(null);
    setRunning(false);
  }, [modelSignature]);

  useEffect(() => {
    const handleViewportResize = () => {
      setWindowFrame((current) => clampFloatingWindowFrame(current));
    };
    window.addEventListener("resize", handleViewportResize);
    return () => window.removeEventListener("resize", handleViewportResize);
  }, []);

  const allSelected = models.length > 0 && selectedProjectIds.size === models.length;
  const partiallySelected = selectedProjectIds.size > 0 && !allSelected;
  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = partiallySelected;
    }
  }, [partiallySelected]);

  const currentSelectionKey = selectionKey(selectedProjectIds);
  const resultIsCurrent = completedRun?.selectionKey === currentSelectionKey;
  const displayedResult = resultIsCurrent ? completedRun.result : { errors: [], warnings: [] };
  const displayedAlerts = activeTab === "errors" ? displayedResult.errors : displayedResult.warnings;
  const modelsByType = new Map(MODEL_TYPE_ORDER.map((type) => [
    type,
    models.filter((model) => model.modelType === type)
  ]));

  const clearCompletedRun = () => {
    setCompletedRun(null);
  };

  const toggleProject = (projectId: string) => {
    setSelectedProjectIds((current) => {
      const next = new Set(current);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
    clearCompletedRun();
  };

  const toggleModelType = (type: (typeof MODEL_TYPE_ORDER)[number]) => {
    setExpandedModelTypes((current) => {
      const next = new Set(current);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  };

  const toggleAll = () => {
    setSelectedProjectIds(allSelected
      ? new Set()
      : new Set(defaultAllNetworkTopologySelection(models))
    );
    clearCompletedRun();
  };

  const handleWindowDragPointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.button !== 0) {
      return;
    }
    const rect = dialogRef.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }
    windowDragRef.current = {
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      frame: { x: rect.left, y: rect.top, width: rect.width, height: rect.height }
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  };

  const handleWindowDragPointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    const state = windowDragRef.current;
    if (!state || state.pointerId !== event.pointerId) {
      return;
    }
    setWindowFrame(clampFloatingWindowFrame({
      ...state.frame,
      x: state.frame.x + event.clientX - state.startClientX,
      y: state.frame.y + event.clientY - state.startClientY
    }));
  };

  const finishWindowDrag = (event: ReactPointerEvent<HTMLElement>) => {
    if (windowDragRef.current?.pointerId !== event.pointerId) {
      return;
    }
    windowDragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const handleWindowResizePointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) {
      return;
    }
    const rect = dialogRef.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }
    windowResizeRef.current = {
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      frame: { x: rect.left, y: rect.top, width: rect.width, height: rect.height }
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
    event.stopPropagation();
  };

  const handleWindowResizePointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const state = windowResizeRef.current;
    if (!state || state.pointerId !== event.pointerId) {
      return;
    }
    const viewport = viewportSize();
    const maxWidth = Math.max(320, viewport.width - state.frame.x - FLOATING_WINDOW_MARGIN);
    const maxHeight = Math.max(280, viewport.height - state.frame.y - FLOATING_WINDOW_MARGIN);
    const minWidth = Math.min(FLOATING_WINDOW_MIN_WIDTH, maxWidth);
    const minHeight = Math.min(FLOATING_WINDOW_MIN_HEIGHT, maxHeight);
    setWindowFrame({
      ...state.frame,
      width: Math.min(maxWidth, Math.max(minWidth, state.frame.width + event.clientX - state.startClientX)),
      height: Math.min(maxHeight, Math.max(minHeight, state.frame.height + event.clientY - state.startClientY))
    });
  };

  const finishWindowResize = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (windowResizeRef.current?.pointerId !== event.pointerId) {
      return;
    }
    windowResizeRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const runTopology = async () => {
    if (running || selectedProjectIds.size === 0) {
      return;
    }
    setRunning(true);
    const selectedModels = models.filter((model) => selectedProjectIds.has(model.projectId));
    try {
      const loadResults = await Promise.all(selectedModels.map(async (model) => {
        try {
          return { model: await loadFullModel(scope, model) };
        } catch (error) {
          return { error: modelLoadError(model, error) };
        }
      }));
      const loadedModels = loadResults.flatMap((item) => item.model ? [item.model] : []);
      const loadErrors = loadResults.flatMap((item) => item.error ? [item.error] : []);
      const result = analyzeAllNetworkTopology(loadedModels, referenceModels);

      const globalLineRecords = await loadGlobalLineRecordsForTopology();
      const referencedGlobalLineModels = referencedModelsForGlobalLines(globalLineRecords, referenceModels);
      const loadedGlobalLineModelResults = await Promise.all(referencedGlobalLineModels.map(async (model) => {
        try {
          return await loadFullModel(scope, model);
        } catch {
          return null;
        }
      }));
      const loadedGlobalLineModels = loadedGlobalLineModelResults.filter(
        (model): model is AllNetworkTopologyReferenceModel => Boolean(model)
      );
      const globalLineResult = analyzeGlobalLinesForAllNetworkTopology(
        globalLineRecords,
        loadedGlobalLineModels
      );
      const nextResult = {
        errors: [...loadErrors, ...result.errors, ...globalLineResult.errors],
        warnings: [...result.warnings, ...globalLineResult.warnings]
      };
      setCompletedRun({
        selectionKey: selectionKey(selectedProjectIds),
        models: loadedModels,
        result: nextResult
      });
      setActiveTab(nextResult.errors.length > 0 || nextResult.warnings.length === 0 ? "errors" : "warnings");
      scope.writeOperationLog?.(
        `全网拓扑完成：${loadedModels.length} 个模型，${nextResult.errors.length} 条错误，${nextResult.warnings.length} 条警告`
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "全网拓扑失败。";
      scope.showGlobalMessage?.(message, "error");
      scope.writeOperationLog?.(`全网拓扑失败：${message}`);
    } finally {
      setRunning(false);
    }
  };

  const locateAlert = (alert: AllNetworkTopologyAlert) => {
    const model = globalLineConsistencyModels.find((item) => item.projectId === alert.projectId) ??
      completedRun?.models.find((item) => item.projectId === alert.projectId) ??
      models.find((item) => item.projectId === alert.projectId);
    if (!model) {
      return;
    }
    scope.requestUnsavedChangeAction?.({
      kind: "load-project",
      project: model.record,
      schemeId: model.schemeId,
      label: `切换到模型“${model.name}”并定位告警设备`,
      onLoaded: () => {
        window.requestAnimationFrame(() => {
          const latestScope = scope.__appScopeRef?.current ?? scope;
          latestScope.locateTopologyError?.(alert.topologyError ?? {
            id: alert.id,
            type: "floating-terminal",
            message: alert.message,
            nodeId: alert.nodeId,
            edgeId: alert.edgeId,
            relatedNodeIds: alert.relatedNodeIds
          });
        });
      }
    });
  };

  const refreshGlobalLineList = async (clearConsistency: boolean) => {
    setGlobalLineListLoading(true);
    setGlobalLineListError("");
    if (clearConsistency) {
      setGlobalLineConsistencyResult(null);
      setGlobalLineConsistencyModels([]);
    }
    try {
      const latestScope = scope.__appScopeRef?.current ?? scope;
      const records = typeof latestScope.loadGlobalLineRecords === "function"
        ? await latestScope.loadGlobalLineRecords()
        : Array.isArray(latestScope.globalLineRecords)
          ? latestScope.globalLineRecords as GlobalLineRecord[]
          : [];
      setGlobalLineListRecords([...records].sort((left, right) =>
        left.idx - right.idx || left.name.localeCompare(right.name, "zh-CN")
      ));
    } catch (error) {
      const message = error instanceof Error ? error.message : "读取全局线路列表失败。";
      setGlobalLineListError(message);
      scope.showGlobalMessage?.(message, "error");
    } finally {
      setGlobalLineListLoading(false);
    }
  };

  useEffect(() => {
    if (!globalLineListOpen) return;
    void refreshGlobalLineList(false);
  }, [globalLineListOpen]);

  useEffect(() => {
    if (!globalLineListOpen) return;
    const currentRecords = Array.isArray(scope.globalLineRecords)
      ? scope.globalLineRecords as GlobalLineRecord[]
      : [];
    setGlobalLineListRecords([...currentRecords].sort((left, right) =>
      left.idx - right.idx || left.name.localeCompare(right.name, "zh-CN")
    ));
  }, [globalLineListOpen, scope.globalLineRecords]);

  const runGlobalLineConsistency = async () => {
    if (globalLineConsistencyRunning) return;
    setGlobalLineConsistencyRunning(true);
    setGlobalLineListError("");
    try {
      const [records, loadResults] = await Promise.all([
        loadGlobalLineRecordsForTopology(),
        Promise.all(models.map(async (model) => {
          try {
            return { model: await loadFullModel(scope, model) };
          } catch (error) {
            return { error: modelLoadError(model, error) };
          }
        }))
      ]);
      const loadedModels = loadResults.flatMap((item) => item.model ? [item.model] : []);
      const loadErrors = loadResults.flatMap((item) => item.error ? [item.error] : []);
      const consistency = analyzeGlobalLineConsistency(records, loadedModels);
      const result = {
        errors: [...loadErrors, ...consistency.errors],
        warnings: consistency.warnings
      };
      setGlobalLineListRecords([...records].sort((left, right) =>
        left.idx - right.idx || left.name.localeCompare(right.name, "zh-CN")
      ));
      setGlobalLineConsistencyModels(loadedModels);
      setGlobalLineConsistencyResult(result);
      scope.writeOperationLog?.(
        `全局线路一致性校验完成：${records.length} 条全局线路，${loadedModels.length} 个模型，${result.errors.length} 条错误，${result.warnings.length} 条警告`
      );
      scope.showGlobalMessage?.(
        result.errors.length > 0 || result.warnings.length > 0
          ? `一致性校验完成：${result.errors.length} 条错误，${result.warnings.length} 条警告。`
          : "全局线路一致性校验通过。",
        result.errors.length > 0 ? "error" : result.warnings.length > 0 ? "warning" : "success"
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "全局线路一致性校验失败。";
      setGlobalLineListError(message);
      setGlobalLineConsistencyResult(null);
      setGlobalLineConsistencyModels([]);
      scope.showGlobalMessage?.(message, "error");
    } finally {
      setGlobalLineConsistencyRunning(false);
    }
  };

  const deleteEmptyGlobalLineRecord = async (record: GlobalLineRecord) => {
    if (deletingGlobalLineRecordId) return;
    const sourceReference = globalLineEndpointReference(record, "source");
    const targetReference = globalLineEndpointReference(record, "target");
    if (sourceReference || targetReference) {
      scope.showGlobalMessage?.("只能删除首末端均为空的全局线路。", "warning");
      return;
    }
    if (!window.confirm(`确认删除两端均为空的全局线路“${record.name}”吗？此操作将立即写入全局线路表。`)) {
      return;
    }
    setDeletingGlobalLineRecordId(record.id);
    setGlobalLineListError("");
    try {
      const response = await fetch(apiPath("/global-lines/record"), {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: record.id })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.ok) {
        throw new Error(String(payload?.error ?? payload?.message ?? `删除全局线路失败（HTTP ${response.status}）。`));
      }
      const latestScope = scope.__appScopeRef?.current ?? scope;
      const records = typeof latestScope.loadGlobalLineRecords === "function"
        ? await latestScope.loadGlobalLineRecords()
        : await loadGlobalLineRecordsForTopology();
      setGlobalLineListRecords([...records].sort((left, right) =>
        left.idx - right.idx || left.name.localeCompare(right.name, "zh-CN")
      ));
      scope.writeOperationLog?.(`已删除两端均为空的全局线路：${record.name}`);
      scope.showGlobalMessage?.(`已删除全局线路“${record.name}”。`, "success");
      if (globalLineConsistencyResult) {
        await runGlobalLineConsistency();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "删除全局线路失败。";
      setGlobalLineListError(message);
      scope.showGlobalMessage?.(message, "error");
    } finally {
      setDeletingGlobalLineRecordId("");
    }
  };

  const locateGlobalLineEndpoint = (record: GlobalLineRecord, endpoint: GlobalLineEndpoint) => {
    const reference = globalLineEndpointReference(record, endpoint);
    const endpointLabel = endpoint === "source" ? "首端" : "末端";
    if (!reference) {
      scope.showGlobalMessage?.(`全局线路“${record.name}”的${endpointLabel}尚未关联模型。`, "warning");
      return;
    }
    const model = modelForGlobalLineReference(reference, referenceModels);
    if (!model) {
      scope.showGlobalMessage?.(
        `全局线路“${record.name}”的${endpointLabel}对应模型“${reference.projectName || reference.modelKey}”不存在。`,
        "warning"
      );
      return;
    }
    scope.requestUnsavedChangeAction?.({
      kind: "load-project",
      project: model.record,
      schemeId: model.schemeId,
      label: `切换到全局线路“${record.name}”${endpointLabel}所在模型“${model.name}”`
    });
  };

  const exportEFile = async () => {
    if (
      !completedRun ||
      !resultIsCurrent ||
      exporting ||
      completedRun.models.length === 0 ||
      completedRun.result.errors.length > 0
    ) {
      return;
    }
    setExporting(true);
    try {
      const exportOptions = buildEFileExportOptionsFromLibrary({
        libraryTemplates: scope.libraryTemplates,
        labels: scope.PARAM_LABELS,
        eDeviceDefinitionLabels: scope.eDeviceDefinitionLabels,
        eDeviceDefinitionClassExportEnabled: scope.eDeviceDefinitionClassExportEnabled,
        eDeviceDefinitionFieldOrder: scope.eDeviceDefinitionFieldOrder,
        eDeviceDefinitionTemplateFields: scope.eDeviceDefinitionTemplateFields,
        eDeviceDefinitionTableIds: scope.eDeviceDefinitionTableIds,
        resolveDefinitionComponentLibrary: scope.resolveTemplateComponentLibrary
      });
      const saved = await saveLazyTextFile({
        filename: "全网拓扑.e",
        loadText: () => buildMultiModelEFileExport(
          completedRun.models.map((model) => ({
            id: model.projectId,
            schemePath: model.schemePath,
            project: model.record.project
          })),
          exportOptions
        ).text,
        mime: "text/plain",
        description: "E 文件",
        extensions: [".e"],
        encoding: "gbk",
        pickerId: "all-network-topology-e-export",
        startIn: "downloads",
        preferNativeDialog: true
      });
      if (saved) {
        scope.showGlobalMessage?.("全网拓扑 E 文件导出成功。", "success");
        scope.writeOperationLog?.(`已导出全网拓扑 E 文件：${completedRun.models.length} 个模型`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "全网拓扑 E 文件导出失败。";
      scope.showGlobalMessage?.(message, "error");
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <div
      className={`all-network-topology-window-layer ${open ? "visible" : "hidden"}`}
      role="presentation"
      aria-hidden={!open}
    >
      <section
        ref={dialogRef}
        className="all-network-topology-dialog window-close-host"
        style={{
          left: `${windowFrame.x}px`,
          top: `${windowFrame.y}px`,
          width: `${windowFrame.width}px`,
          height: `${windowFrame.height}px`
        }}
        role="dialog"
        aria-labelledby="all-network-topology-title"
        aria-describedby="all-network-topology-window-help"
        onKeyDown={(event) => {
          if (event.key === "Escape" && !running && !exporting) {
            scope.setAllNetworkTopologyDialogOpen?.(false);
          }
        }}
      >
        <WindowCloseButton
          label="关闭全网拓扑"
          onClick={() => scope.setAllNetworkTopologyDialogOpen?.(false)}
          disabled={running || exporting}
        />
        <header
          className="all-network-topology-header"
          onPointerDown={handleWindowDragPointerDown}
          onPointerMove={handleWindowDragPointerMove}
          onPointerUp={finishWindowDrag}
          onPointerCancel={finishWindowDrag}
          title="拖拽标题栏移动窗口"
        >
          <div>
            <h2 id="all-network-topology-title"><Network size={20} aria-hidden="true" />全网拓扑</h2>
            <p id="all-network-topology-window-help">选择需要联合检查的厂站、馈线和台区模型；模型列表默认全部选中。拖拽标题栏移动窗口，拖拽右下角调整大小。</p>
          </div>
          <span>{selectedProjectIds.size} / {models.length} 个模型</span>
        </header>

        <div className="all-network-topology-body">
          <aside className="all-network-topology-model-panel" aria-label="模型树列表">
            <label className="all-network-topology-select-all">
              <input
                ref={selectAllRef}
                type="checkbox"
                checked={allSelected}
                onChange={toggleAll}
                disabled={running || models.length === 0}
              />
              <strong>全选</strong>
              <span>{models.length}</span>
            </label>
            <div className="all-network-topology-model-tree">
              {models.length === 0 ? (
                <p className="all-network-topology-empty">当前模型库中没有厂站、馈线或台区模型。</p>
              ) : (
                <ul className="all-network-topology-tree-list" role="tree" aria-label="模型类型与模型">
                  {MODEL_TYPE_ORDER.map((type) => {
                    const group = modelsByType.get(type) ?? [];
                    if (group.length === 0) {
                      return null;
                    }
                    const expanded = expandedModelTypes.has(type);
                    return (
                      <li
                        className="all-network-topology-tree-group"
                        key={type}
                        role="treeitem"
                        aria-level={1}
                        aria-expanded={expanded}
                      >
                        <button
                          type="button"
                          className="all-network-topology-tree-branch"
                          onClick={() => toggleModelType(type)}
                          aria-label={`${expanded ? "收起" : "展开"}${type}模型`}
                        >
                          <ChevronRight
                            className={`all-network-topology-tree-chevron${expanded ? " expanded" : ""}`}
                            size={15}
                            aria-hidden="true"
                          />
                          <FolderTree size={16} aria-hidden="true" />
                          <strong>{type}</strong>
                          <span>{group.length}</span>
                        </button>
                        {expanded ? (
                          <ul className="all-network-topology-tree-children" role="group">
                            {group.map((model) => {
                              const selected = selectedProjectIds.has(model.projectId);
                              return (
                                <li
                                  className="all-network-topology-tree-model"
                                  key={model.projectId}
                                  role="treeitem"
                                  aria-level={2}
                                  aria-selected={selected}
                                >
                                  <label className="all-network-topology-model-row">
                                    <input
                                      type="checkbox"
                                      checked={selected}
                                      onChange={() => toggleProject(model.projectId)}
                                      disabled={running}
                                    />
                                    <span className="all-network-topology-model-index">{model.idx || "-"}</span>
                                    <span className="all-network-topology-model-name" title={`${model.schemePath.join(" / ")} / ${model.name}`}>
                                      {model.name}
                                      <small>{model.schemePath.join(" / ")}</small>
                                    </span>
                                  </label>
                                </li>
                              );
                            })}
                          </ul>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            <div className="all-network-topology-actions">
              <button
                type="button"
                className="all-network-topology-run"
                onClick={() => void runTopology()}
                disabled={running || selectedProjectIds.size === 0}
              >
                <Network size={17} aria-hidden="true" />
                {running ? "正在拓扑..." : "全网拓扑"}
              </button>
            </div>
          </aside>

          <main className="all-network-topology-result-panel">
            <div className="all-network-topology-tabs" role="tablist" aria-label="全网拓扑告警分类">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "errors"}
                className={activeTab === "errors" ? "active" : ""}
                onClick={() => setActiveTab("errors")}
              >
                错误 <span>{displayedResult.errors.length}</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "warnings"}
                className={activeTab === "warnings" ? "active" : ""}
                onClick={() => setActiveTab("warnings")}
              >
                警告 <span>{displayedResult.warnings.length}</span>
              </button>
            </div>
            <div className="all-network-topology-alert-table-wrap">
              <table className="all-network-topology-alert-table">
                <thead>
                  <tr>
                    <th>模型名</th>
                    <th>设备名</th>
                    <th>告警信息</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedAlerts.map((alert) => (
                    <tr key={alert.id} onDoubleClick={() => locateAlert(alert)} title="双击切换模型并定位设备">
                      <td>{alert.modelName}</td>
                      <td>{alert.deviceName}</td>
                      <td>{alert.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {running ? (
                <div className="all-network-topology-placeholder">正在读取模型并执行全网拓扑...</div>
              ) : !resultIsCurrent ? (
                <div className="all-network-topology-placeholder">
                  <Network size={30} aria-hidden="true" />
                  <p>点击左下角“全网拓扑”开始检查。</p>
                </div>
              ) : displayedAlerts.length === 0 ? (
                <div className="all-network-topology-placeholder success">
                  <AlertTriangle size={28} aria-hidden="true" />
                  <p>{activeTab === "errors" ? "未发现全网拓扑错误。" : "未发现全网拓扑警告。"}</p>
                </div>
              ) : null}
            </div>
            <footer className="all-network-topology-footer">
              <span>双击告警记录可切换到对应模型并居中、选中、放大设备。</span>
              <button
                type="button"
                onClick={() => void exportEFile()}
                disabled={
                  !completedRun ||
                  !resultIsCurrent ||
                  exporting ||
                  running ||
                  completedRun.models.length === 0 ||
                  completedRun.result.errors.length > 0
                }
                title={displayedResult.errors.length > 0 ? "存在错误信息，不能导出 E 文件" : "导出 E 文件"}
              >
                <Download size={16} aria-hidden="true" />
                {exporting ? "正在导出..." : "导出 E 文件"}
              </button>
            </footer>
          </main>
        </div>
        <button
          type="button"
          className="all-network-topology-resize-handle"
          aria-label="调整全网拓扑窗口大小"
          title="拖拽调整窗口大小"
          onPointerDown={handleWindowResizePointerDown}
          onPointerMove={handleWindowResizePointerMove}
          onPointerUp={finishWindowResize}
          onPointerCancel={finishWindowResize}
        />
      </section>
      </div>
      <GlobalLineListWindow
        open={globalLineListOpen}
        loading={globalLineListLoading}
        error={globalLineListError}
        records={globalLineListRecords}
        referenceModels={referenceModels}
        consistencyRunning={globalLineConsistencyRunning}
        consistencyResult={globalLineConsistencyResult}
        deletingRecordId={deletingGlobalLineRecordId}
        onClose={() => scope.setGlobalLineListOpen?.(false)}
        onRefresh={() => void refreshGlobalLineList(true)}
        onRunConsistency={() => void runGlobalLineConsistency()}
        onLocateAlert={locateAlert}
        onLocateEndpoint={locateGlobalLineEndpoint}
        onDeleteEmptyRecord={(record) => void deleteEmptyGlobalLineRecord(record)}
      />
    </>
  );
}
