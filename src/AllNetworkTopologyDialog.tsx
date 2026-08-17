import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { AlertTriangle, ChevronRight, Download, FolderTree, Network } from "lucide-react";

import {
  analyzeAllNetworkTopology,
  collectAllNetworkTopologyModels,
  collectAllNetworkTopologyReferenceModels,
  defaultAllNetworkTopologySelection,
  type AllNetworkTopologyAlert,
  type AllNetworkTopologyModel,
  type AllNetworkTopologyResult
} from "./all-network-topology";
import { buildMultiModelEFileExport } from "./model";
import { buildEFileExportOptionsFromLibrary } from "./appExtracted/appDeviceDefinitionFactories";
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

const MODEL_TYPE_ORDER = ["厂站", "馈线", "台区"] as const;
const FLOATING_WINDOW_MARGIN = 8;
const FLOATING_WINDOW_MIN_WIDTH = 760;
const FLOATING_WINDOW_MIN_HEIGHT = 520;

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

async function loadFullModel(scope: Record<string, any>, model: AllNetworkTopologyModel) {
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
  } as AllNetworkTopologyModel;
}

export function AllNetworkTopologyDialog({ scope }: AllNetworkTopologyDialogProps) {
  const open = Boolean(scope.allNetworkTopologyDialogOpen);
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
    const loadResults = await Promise.all(selectedModels.map(async (model) => {
      try {
        return { model: await loadFullModel(scope, model) };
      } catch (error) {
        return { error: modelLoadError(model, error) };
      }
    }));
    const loadedModels = loadResults.flatMap((item) => item.model ? [item.model] : []);
    const loadErrors = loadResults.flatMap((item) => item.error ? [item.error] : []);
    try {
      const result = analyzeAllNetworkTopology(loadedModels, referenceModels);
      const nextResult = { ...result, errors: [...loadErrors, ...result.errors] };
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
    const model = completedRun?.models.find((item) => item.projectId === alert.projectId) ??
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
            <button
              type="button"
              className="all-network-topology-run"
              onClick={() => void runTopology()}
              disabled={running || selectedProjectIds.size === 0}
            >
              <Network size={17} aria-hidden="true" />
              {running ? "正在拓扑..." : "全网拓扑"}
            </button>
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
  );
}
