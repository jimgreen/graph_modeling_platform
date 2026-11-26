/** 方案与模型记录 CRUD、剪贴板粘贴、电压基准批量设置及图层管理工厂模块。 */

import type { ProjectCanvasScope } from "./appScopeTypes";
import { createRafLatestScheduler, sharedElementRectCache, type RafLatestScheduler } from "../lib/rafCoalescer";
import { applyImperativeMarqueeRect } from "./imperativeMarquee";

// 滚轮连续缩放时的视口裁剪静默窗口（ms）：避免在 16k SVG 上施加 CSS transform 引发重光栅化，
// 同时在连续缩放期间抑制视口子集裁剪重渲染，停手后补一次精确 canvasVisibleViewBox 同步
const WHEEL_ZOOM_SETTLE_DELAY_MS = 120;

// 按 setMarquee / setViewBox 实例缓存单帧 rAF 合批调度器，避免高刷鼠标每帧多次触发 React 重渲染
type MarqueeRect = { start: Point; current: Point };
type StateSetter<T> = (next: T | ((current: T) => T)) => void;

const marqueeRafSchedulers = new WeakMap<Function, RafLatestScheduler<MarqueeRect>>();
const panViewBoxRafSchedulers = new WeakMap<Function, RafLatestScheduler<CanvasViewBox>>();

function scheduleMarqueeUpdate(setMarquee: StateSetter<MarqueeRect | null>, next: MarqueeRect | null) {
  let scheduler = marqueeRafSchedulers.get(setMarquee);
  if (!scheduler) {
    scheduler = createRafLatestScheduler<MarqueeRect>((rect) => {
      setMarquee((current) =>
        current &&
        current.start.x === rect.start.x &&
        current.start.y === rect.start.y &&
        current.current.x === rect.current.x &&
        current.current.y === rect.current.y
          ? current
          : rect
      );
    });
    marqueeRafSchedulers.set(setMarquee, scheduler);
  }
  if (next === null) {
    scheduler.cancel();
    setMarquee(null);
    return;
  }
  scheduler.schedule(next);
}

function schedulePanViewBoxUpdate(setViewBox: StateSetter<CanvasViewBox>, nextViewBox: CanvasViewBox) {
  let scheduler = panViewBoxRafSchedulers.get(setViewBox);
  if (!scheduler) {
    scheduler = createRafLatestScheduler<CanvasViewBox>((vb) => {
      setViewBox((current) =>
        current.x === vb.x && current.y === vb.y && current.width === vb.width && current.height === vb.height
          ? current
          : vb
      );
    });
    panViewBoxRafSchedulers.set(setViewBox, scheduler);
  }
  scheduler.schedule(nextViewBox);
}
import { clampNumber } from "../canvasViewport";
import { routeEdgesForStoredRendering } from "../model-routing";
import {
  GLOBAL_LINE_ID_PARAM,
  applyGlobalLineRecordToNode,
  deriveLocalDeviceIndexCounters,
  globalLineEndpointPlacementFailureMessage,
  globalLineSourcePlacementFailureMessage,
  shouldManageLineGlobally,
  shouldUseGlobalLineForEndpoints,
} from "../global-lines";
import {
  cloneEdgeEditablePoints,
  isLineOnlyConnectionNode,
  modelAssociationLineConnectionFailureMessage,
} from "../model";
import { resolveNodeVoltageAtTerminal, isNodeVoltageDefault, applyVoltageInheritance } from "../voltageInheritance";
import { getRatedCapacityDefaultForKind } from "../model";
import { graphStorePatchNodes } from "../graphStore";
import {
  applyDragContainerMembership,
  clampContainerCenterToMembers,
  containerDragGroup,
  containerMemberNodes,
  containerResizeMinSize,
  foldContainerScaleIntoSize,
  hasContainer,
  isContainerNode,
  withNodeUpdates,
} from "../acContainer";
import {
  arrangeContainerInteriors,
  autoAlignEdgeWithoutStoredRoute,
  autoAlignStoredRouteDrops,
  mergeContainerLayoutUnits,
  type AutoAlignQualityReport,
} from "../selectionActions";
import { runAutoAlignPlanInWorker } from "../autoAlign/autoAlignClient";
import type {
  CanvasBounds,
  DeviceKind,
  DeviceTemplate,
  Edge,
  ModelNode,
  Point,
} from "../model";
import type { MeasurementGroup, ProjectMeasurementConfig } from "../measurements";
import type {
  CanvasWheelZoomEvent,
  ConnectTarget,
  DraggingState,
  EdgeEndpoint,
  RoutableLinePlacementState,
  VoltageBaseSetMode,
  WheelZoomAnchor,
} from "./appCoreCanvasUtilities";
import type { VoltageBaseSetResult, VoltageBaseSetScope, VoltageBaseTerminalValuesByNodeId } from "../model-routing";
import type { CanvasViewBox } from "../canvasViewport";
import type { CanvasLayoutUnit } from "../selectionActions";
import type { GlobalLineChoice } from "../global-lines";
import type { DragEvent as ReactDragEvent, PointerEvent as ReactPointerEvent } from "react";

export function projectMoveDebug(label: string, payload: Record<string, unknown> = {}) {
  if (import.meta.env.DEV && typeof window !== "undefined") {
    const diagnosticWindow = window as typeof window & {
      __projectTreeDragLogs?: Array<{ at: number; label: string; payload: Record<string, unknown> }>;
    };
    const logs = diagnosticWindow.__projectTreeDragLogs ?? [];
    logs.push({ at: Date.now(), label: `move:${label}`, payload });
    diagnosticWindow.__projectTreeDragLogs = logs.slice(-100);
    console.info(`[project-tree-drag] move:${label}`, payload);
  }
}

export function createCommitRoutableLineDevice(__appScope: ProjectCanvasScope) {
  return async (template: DeviceTemplate, source: ConnectTarget, target: ConnectTarget, manualPoints?: Point[], globalLineChoice?: GlobalLineChoice) => {
  const { CANVAS_AUTO_EXPAND_PADDING, activateInspectorFromCanvas, activeLayerId, applyCanvasBounds, assignPermanentDeviceIndex, attachGlobalLineForNode, buildManualConnectionPreviewRoute, canvasBounds, canvasBoundsForAutoExpandedGraphContent, canvasBoundsWithOriginShift, connectTargetPoint, createRoutableLineDeviceFromEndpoints, deviceIndexCounters, edges, hasCanvasOriginShift, leftTopCanvasOriginShiftForContent, markBusTerminalSyncDirtyForEdges, nodes, pushRecentGlyph, pushUndoSnapshot, rejectAutoCanvasExpansionForContent, resetRoutableLinePreviewState, routableLineDeviceEndpointRefForNode, routeRoutableLineDevice, setCanvasSelectionScope, setDeviceIndexCounters, setGraphArrays, setMode, setRecentGlyphKinds, setRoutableLineDeviceCanvasPoints, setRoutableLinePlacement, setSelectedEdgeId, setSelectedEdgeIds, setSelectedNodeIds, shiftCachedRoutesForCanvasOrigin, translateEdgeBy, translateNodeBy, writeOperationLog } = __appScope;
    const connectionIssue = modelAssociationLineConnectionFailureMessage(source.node) ||
      modelAssociationLineConnectionFailureMessage(target.node);
    if (connectionIssue) {
      showGlobalMessage(connectionIssue);
      writeOperationLog?.(`线路绘制失败：${connectionIssue}`);
      return false;
    }
    const endpointIssue = globalLineEndpointPlacementFailureMessage(source.node, target.node);
    if (endpointIssue) {
      showGlobalMessage(endpointIssue);
      writeOperationLog?.(`线路绘制失败：${endpointIssue}`);
      return false;
    }
    const sourcePoint = connectTargetPoint(source);
    const targetPoint = connectTargetPoint(target);
    const rawLine = createRoutableLineDeviceFromEndpoints(
      template,
      sourcePoint,
      targetPoint,
      activeLayerId,
      {
        source: routableLineDeviceEndpointRefForNode(source.node, source.terminalId, source.point),
        target: routableLineDeviceEndpointRefForNode(target.node, target.terminalId, target.point)
      }
    );

    // 集成线路电压继承逻辑
    const sourceVoltage = resolveNodeVoltageAtTerminal(source.node, source.terminalId);
    if (sourceVoltage) {
      rawLine.params.rated_voltage = sourceVoltage;
      const ratedCapacity = getRatedCapacityDefaultForKind(template.kind, sourceVoltage);
      if (ratedCapacity !== null) {
        rawLine.params.ratedCapacity = ratedCapacity;
      }
    }

    const manualRoutePoints = manualPoints?.length
      ? buildManualConnectionPreviewRoute(sourcePoint, manualPoints, targetPoint, canvasBounds)
      : null;
    const routedLine = manualRoutePoints
      ? setRoutableLineDeviceCanvasPoints(rawLine, manualRoutePoints, {
          // 提交路径：手动打点建线也要强制「从设备外侧指向锚点」。
          nodeById: new Map([...nodes, rawLine].map((item: ModelNode) => [item.id, item])),
          bounds: canvasBounds
        })
      : routeRoutableLineDevice(rawLine, [...nodes, rawLine], canvasBounds);
    if (rejectAutoCanvasExpansionForContent([...nodes, routedLine], edges)) {
      return false;
    }
    const dropOriginShift = leftTopCanvasOriginShiftForContent([...nodes, routedLine], edges);
    const dropSourceNodes = hasCanvasOriginShift(dropOriginShift)
      ? nodes.map((node: ModelNode) => translateNodeBy(node, dropOriginShift))
      : nodes;
    const dropSourceEdges = hasCanvasOriginShift(dropOriginShift)
      ? edges.map((edge: Edge) => translateEdgeBy(edge, dropOriginShift))
      : edges;
    const shiftedLine = translateNodeBy(routedLine, dropOriginShift);
    const dropCanvasBounds = canvasBoundsForAutoExpandedGraphContent(
      canvasBoundsWithOriginShift(canvasBounds, dropOriginShift),
      [...dropSourceNodes, shiftedLine],
      dropSourceEdges,
      [],
      CANVAS_AUTO_EXPAND_PADDING
    );
    applyCanvasBounds(dropCanvasBounds, dropOriginShift);
    shiftCachedRoutesForCanvasOrigin(dropOriginShift);
    if (hasCanvasOriginShift(dropOriginShift)) {
      markBusTerminalSyncDirtyForEdges(dropSourceEdges);
    }
    const indexed = globalLineChoice
      ? {
          node: applyGlobalLineRecordToNode(shiftedLine, await attachGlobalLineForNode(shiftedLine, globalLineChoice)),
          counters: deviceIndexCounters
        }
      : assignPermanentDeviceIndex(shiftedLine, deriveLocalDeviceIndexCounters(dropSourceNodes));
    pushUndoSnapshot(true, false, undefined, "添加线路", indexed.node.name);
    if (!globalLineChoice) {
      setDeviceIndexCounters(indexed.counters);
    }
    setGraphArrays([...dropSourceNodes, indexed.node], dropSourceEdges);
    setCanvasSelectionScope("group");
    setSelectedNodeIds([indexed.node.id]);
    setSelectedEdgeId("");
    setSelectedEdgeIds([]);
    setRoutableLinePlacement(null);
    resetRoutableLinePreviewState();
    setMode("select");
    activateInspectorFromCanvas();
    writeOperationLog(`新增线路：${indexed.node.name}`);
    setRecentGlyphKinds?.((prev: string[]) => pushRecentGlyph(prev, template.kind));
    return true;
  };
}

export function createStartRoutableLineFromTerminal(__appScope: ProjectCanvasScope) {
  return (node: ModelNode, terminalId: string, point?: Point) => {
  const { activeLayerNodeIdSet, applyRoutableLinePreviewState, connectTargetPoint, connectTargetTerminalType, routableLinePlacement, routableLineTemplateTerminalType, setCanvasSelectionScope, setContextMenu, setMode, setRoutableLinePlacement, setSelectedEdgeId, setSelectedEdgeIds, setSelectedNodeIds, writeOperationLog } = __appScope;
    if (!routableLinePlacement || !activeLayerNodeIdSet.has(node.id)) {
      return false;
    }
    const connectionIssue = modelAssociationLineConnectionFailureMessage(node);
    if (connectionIssue) {
      showGlobalMessage(connectionIssue);
      writeOperationLog(`线路起点设置失败：${connectionIssue}`);
      return false;
    }
    const endpointIssue = globalLineSourcePlacementFailureMessage(node);
    if (endpointIssue) {
      showGlobalMessage(endpointIssue);
      writeOperationLog(`线路起点设置失败：${endpointIssue}`);
      return false;
    }
    const source: ConnectTarget = { node, terminalId, point };
    if (connectTargetTerminalType(source) !== routableLineTemplateTerminalType(routableLinePlacement.template)) {
      return false;
    }
    const nextPlacement: RoutableLinePlacementState = { ...routableLinePlacement, source };
    setRoutableLinePlacement(nextPlacement);
    applyRoutableLinePreviewState(connectTargetPoint(source), null, null, nextPlacement);
    setCanvasSelectionScope("group");
    setSelectedNodeIds([]);
    setSelectedEdgeId("");
    setSelectedEdgeIds([]);
    setContextMenu(null);
    setMode("connect");
    writeOperationLog(`线路起点：${node.name}`);
    return true;
  };
}

export function createFinishRoutableLineToTarget(__appScope: ProjectCanvasScope) {
  return async (target: ConnectTarget, manualPoints?: Point[]) => {
  const { commitRoutableLineDevice, connectTargetTerminalType, modelType, requestGlobalLinePlacement, routableLinePlacement, routableLineTemplateTerminalType, writeOperationLog } = __appScope;
    if (manualPoints === undefined) {
      manualPoints = routableLinePlacement?.manualPoints;
    }
    if (!routableLinePlacement?.source) {
      return false;
    }
    const connectionIssue = modelAssociationLineConnectionFailureMessage(routableLinePlacement.source.node) ||
      modelAssociationLineConnectionFailureMessage(target.node);
    if (connectionIssue) {
      showGlobalMessage(connectionIssue);
      writeOperationLog(`线路终点设置失败：${connectionIssue}`);
      return false;
    }
    const endpointIssue = globalLineEndpointPlacementFailureMessage(routableLinePlacement.source.node, target.node);
    if (endpointIssue) {
      showGlobalMessage(endpointIssue);
      writeOperationLog(`线路终点设置失败：${endpointIssue}`);
      return false;
    }
    if (connectTargetTerminalType(target) !== routableLineTemplateTerminalType(routableLinePlacement.template)) {
      return false;
    }
    if (shouldUseGlobalLineForEndpoints(
      modelType,
      routableLinePlacement.template.kind,
      routableLinePlacement.source.node,
      target.node
    )) {
      requestGlobalLinePlacement(routableLinePlacement.template, routableLinePlacement.source, target, manualPoints);
      writeOperationLog("线路连接跨模型边界，请选择既有全局线路或新建全局线路。");
      return true;
    }
    const committed = await commitRoutableLineDevice(routableLinePlacement.template, routableLinePlacement.source, target, manualPoints);
    if (committed) {
      writeOperationLog(`线路终点：${target.node.name}`);
    }
    return committed;
  };
}

export function createUpdateRoutableLineEndpointDrag(__appScope: ProjectCanvasScope) {
  return (point: Point, ctrlKey = false) => {
  const { alignBusEndpointPointToRouteSegmentExtension, connectTargetPoint, findRoutableLineEndpointTargetAtPoint, isBusNode, nodeById, routableLineDeviceCanvasPoints, routableLineEndpointDrag, sameConnectTarget, sameOptionalPoint, setRoutableLineEndpointDrag } = __appScope;
    if (!routableLineEndpointDrag) {
      return;
    }
    const lineNode = nodeById.get(routableLineEndpointDrag.nodeId);
    if (!lineNode) {
      return;
    }
    const terminalIndex = routableLineEndpointDrag.endpoint === "source" ? 0 : 1;
    const terminalType = lineNode.terminals[terminalIndex]?.type ?? lineNode.terminals[0]?.type;
    const target = terminalType
      ? findRoutableLineEndpointTargetAtPoint(point, {
          terminalType,
          excludedNodeId: lineNode.id,
          excludedEndpoint: routableLineEndpointDrag.endpoint
        })
      : null;
    const routePoints = routableLineDeviceCanvasPoints(lineNode);
    const alignedPoint =
      target && ctrlKey && isBusNode(target.node)
        ? alignBusEndpointPointToRouteSegmentExtension(target.node, routePoints, routableLineEndpointDrag.endpoint)
        : null;
    const effectiveTarget = target && alignedPoint ? { ...target, point: alignedPoint } : target;
    const snappedPoint = effectiveTarget ? connectTargetPoint(effectiveTarget) : point;
    setRoutableLineEndpointDrag((current: any) =>
      current && current.nodeId === routableLineEndpointDrag.nodeId && current.endpoint === routableLineEndpointDrag.endpoint
        ? sameOptionalPoint(current.previewPoint, snappedPoint) &&
          sameOptionalPoint(current.dropTargetPoint, effectiveTarget ? snappedPoint : undefined) &&
          sameConnectTarget(current.dropTarget, effectiveTarget)
          ? current
          : {
              ...current,
              previewPoint: snappedPoint,
              dropTargetPoint: effectiveTarget ? snappedPoint : undefined,
              dropTarget: effectiveTarget ?? undefined
            }
        : current
    );
  };
}

export function createStartRoutableLineEndpointDrag(__appScope: ProjectCanvasScope) {
  return (
    event: ReactPointerEvent<SVGCircleElement>,
    node: ModelNode,
    endpoint: EdgeEndpoint
  ) => {
  const { activeLayerNodeIdSet, routableLineDeviceCanvasPoints, setCanvasSelectionScope, setContextMenu, setRoutableLineEndpointDrag, setSelectedEdgeId, setSelectedEdgeIds, setSelectedNodeIds } = __appScope;
    event.preventDefault();
    event.stopPropagation();
    if (event.button !== 0 || !activeLayerNodeIdSet.has(node.id)) {
      return;
    }
    const points = routableLineDeviceCanvasPoints(node);
    const previewPoint = endpoint === "source" ? points[0] : points[points.length - 1];
    if (!previewPoint) {
      return;
    }
    setRoutableLineEndpointDrag({
      nodeId: node.id,
      endpoint,
      previewPoint,
      pointerId: event.pointerId
    });
    setCanvasSelectionScope("group");
    setSelectedNodeIds([node.id]);
    setSelectedEdgeId("");
    setSelectedEdgeIds([]);
    setContextMenu(null);
    event.currentTarget.setPointerCapture(event.pointerId);
  };
}

export function createFinishRoutableLineEndpointDrag(__appScope: ProjectCanvasScope) {
  return () => {
  const { canvasBounds, connectTargetPoint, globalLineBoundaryAdjustmentConflictMessage, modelType, nodeById, nodes, patchGraphNodes, pushUndoSnapshot, requestGlobalLineTransition, routableLineDeviceCanvasPoints, routableLineDeviceEndpointRefForNode, routableLineDeviceEndpointRefs, routableLineEndpointDrag, setCanvasSelectionScope, setRoutableLineDeviceEndpointsPreservingRoute, setRoutableLineEndpointDrag, setSelectedEdgeId, setSelectedEdgeIds, setSelectedNodeIds, writeOperationLog } = __appScope;
    if (!routableLineEndpointDrag) {
      return;
    }
    const lineNode = nodeById.get(routableLineEndpointDrag.nodeId);
    const target = routableLineEndpointDrag.dropTarget;
    if (lineNode && target) {
      const connectionIssue = modelAssociationLineConnectionFailureMessage(target.node);
      if (connectionIssue) {
        showGlobalMessage(connectionIssue);
        writeOperationLog(`线路端点调整失败：${connectionIssue}`);
        setRoutableLineEndpointDrag(null);
        return;
      }
      const points = routableLineDeviceCanvasPoints(lineNode);
      const currentStart = points[0];
      const currentEnd = points[points.length - 1];
      if (currentStart && currentEnd) {
        const targetPoint = connectTargetPoint(target);
        const nextStart = routableLineEndpointDrag.endpoint === "source" ? targetPoint : currentStart;
        const nextEnd = routableLineEndpointDrag.endpoint === "target" ? targetPoint : currentEnd;
        const refs = routableLineDeviceEndpointRefs(lineNode);
        const nextRefs =
          routableLineEndpointDrag.endpoint === "source"
            ? {
                source: routableLineDeviceEndpointRefForNode(target.node, target.terminalId, target.point),
                target: refs.target
              }
            : {
                source: refs.source,
                target: routableLineDeviceEndpointRefForNode(target.node, target.terminalId, target.point)
              };
        const commitNodeById = new Map<string, ModelNode>(nodes.map((node: ModelNode) => [node.id, node] as [string, ModelNode]));
        commitNodeById.set(target.node.id, target.node);
        const nextSourceNode = nextRefs.source ? commitNodeById.get(nextRefs.source.nodeId) : undefined;
        const nextTargetNode = nextRefs.target ? commitNodeById.get(nextRefs.target.nodeId) : undefined;
        if (nextSourceNode && nextTargetNode) {
          const endpointIssue = globalLineEndpointPlacementFailureMessage(nextSourceNode, nextTargetNode);
          if (endpointIssue) {
            showGlobalMessage(endpointIssue);
            writeOperationLog(`线路端点调整失败：${endpointIssue}`);
            setRoutableLineEndpointDrag(null);
            return;
          }
        }
        const routedLine = setRoutableLineDeviceEndpointsPreservingRoute(
          lineNode,
          nextStart,
          nextEnd,
          nextRefs,
          commitNodeById,
          canvasBounds
        );
        const nextNodes = nodes.map((node: ModelNode) => node.id === routedLine.id ? routedLine : node);
        const wasGlobal = Boolean(String(lineNode.params[GLOBAL_LINE_ID_PARAM] ?? "").trim()) || shouldManageLineGlobally(lineNode, nodes, modelType);
        const willBeGlobal = shouldManageLineGlobally(routedLine, nextNodes, modelType);
        if (wasGlobal !== willBeGlobal) {
          requestGlobalLineTransition(
            lineNode,
            routedLine,
            willBeGlobal ? "local-to-global" : "global-to-local"
          );
          writeOperationLog(willBeGlobal
            ? `线路连接方式拟由本图维护切换为全局维护：${lineNode.name}`
            : `线路连接方式拟由全局维护切换为本图维护：${lineNode.name}`
          );
          setRoutableLineEndpointDrag(null);
          return;
        }
        if (wasGlobal && willBeGlobal) {
          const conflictMessage = globalLineBoundaryAdjustmentConflictMessage?.(lineNode, routedLine) ?? "";
          if (conflictMessage) {
            showGlobalMessage(conflictMessage);
            writeOperationLog(`全局线路边界端调整失败：${lineNode.name}`);
            setRoutableLineEndpointDrag(null);
            return;
          }
        }
        pushUndoSnapshot(true, false, undefined, "调整线路端点", routedLine.name);
        patchGraphNodes([routedLine]);
        setCanvasSelectionScope("group");
        setSelectedNodeIds([routedLine.id]);
        setSelectedEdgeId("");
        setSelectedEdgeIds([]);
        writeOperationLog(`调整线路端点：${routedLine.name}`);
      }
    } else if (lineNode) {
      showGlobalMessage("线路端点必须连接到同类型设备端子或母线，已保持原连接。");
      writeOperationLog("线路端点调整失败");
    }
    setRoutableLineEndpointDrag(null);
  };
}

export function createCommitNewConnectionEdge(__appScope: ProjectCanvasScope) {
  return (newEdge: Edge, sourceName: string, targetName: string) => {
  const { buildManualConnectionPreviewRoute, canvasBounds, connectionCommitFailureMessage, connectionEndpointRuleFailureMessage, getModelEdgeEndpointPoint, graphStoreApplyPatch, markBusTerminalSyncDirtyForEdges, markRouteEdgesDirty, markStoredRouteEdgesDirty, prepareConnectionEdgeForCommit, pushUndoSnapshot, resetConnectPreviewState, routedEdges, routingNodesForConnectionEdge, setCanvasSelectionScope, setConnectSource, setGraphStore, setMode, setSelectedEdgeId, setSelectedEdgeIds, setSelectedNodeIds, writeOperationLog, __appScopeRef, patchGraphNodes, setGraphArrays, visibleNodeById } = __appScope;

  // 读取 lastPlacedNodeIdRef 并清除（保留兼容性，但不再作为电压继承的判断依据）
  const lastPlacedNodeIdRef = __appScopeRef?.current?.lastPlacedNodeIdRef;
  if (lastPlacedNodeIdRef) {
    lastPlacedNodeIdRef.current = null;
  }

    const routeNodes = routingNodesForConnectionEdge(newEdge);
    const routeNodeById = new Map(routeNodes.map((node: ModelNode) => [node.id, node]));
    const sourceNode = routeNodeById.get(newEdge.sourceId);
    const targetNode = routeNodeById.get(newEdge.targetId);

    // 获取实际设备节点
    const actualSourceNode = visibleNodeById.get(newEdge.sourceId);
    const actualTargetNode = visibleNodeById.get(newEdge.targetId);

    let edgeForCommit;
    const nodesToUpdate: ModelNode[] = [];
    if (!sourceNode || !targetNode || !actualSourceNode || !actualTargetNode) {
      edgeForCommit = newEdge;
    } else {
      // Voltage inheritance: 任意一端电压为0时，从对端继承
      const sourceVoltage = resolveNodeVoltageAtTerminal(actualSourceNode, newEdge.sourceTerminalId ?? "");
      const targetVoltage = resolveNodeVoltageAtTerminal(actualTargetNode, newEdge.targetTerminalId ?? "");
      const sourceIsDefault = isNodeVoltageDefault(actualSourceNode, newEdge.sourceTerminalId ?? "");
      const targetIsDefault = isNodeVoltageDefault(actualTargetNode, newEdge.targetTerminalId ?? "");

      if (sourceIsDefault && targetVoltage) {
        // source 电压为0，从 target 继承
        const newParams = applyVoltageInheritance(actualSourceNode, targetVoltage, newEdge.sourceTerminalId);
        nodesToUpdate.push({ ...actualSourceNode, params: newParams });
      }
      if (targetIsDefault && sourceVoltage) {
        // target 电压为0，从 source 继承
        const newParams = applyVoltageInheritance(actualTargetNode, sourceVoltage, newEdge.targetTerminalId);
        nodesToUpdate.push({ ...actualTargetNode, params: newParams });
      }

      if (!newEdge.manualPoints?.length) {
        edgeForCommit = newEdge;
      } else {
        const sourcePoint = getModelEdgeEndpointPoint(sourceNode, newEdge.sourcePoint, newEdge.sourceTerminalId);
        const targetPoint = getModelEdgeEndpointPoint(targetNode, newEdge.targetPoint, newEdge.targetTerminalId);
        const manualPreviewRoutePoints = buildManualConnectionPreviewRoute(
          sourcePoint,
          newEdge.manualPoints,
          targetPoint,
          canvasBounds
        );
        edgeForCommit = manualPreviewRoutePoints.length >= 2
          ? { ...newEdge, routePoints: manualPreviewRoutePoints }
          : newEdge;
      }
    }
    const endpointRuleMessage = connectionEndpointRuleFailureMessage(edgeForCommit);
    if (endpointRuleMessage) {
      showGlobalMessage(`联络线绘制失败：${endpointRuleMessage}`);
      writeOperationLog(`联络线绘制失败：${endpointRuleMessage}`);
      return false;
    }
    const prepared = prepareConnectionEdgeForCommit(
      routeNodes,
      [edgeForCommit],
      edgeForCommit.id,
      canvasBounds,
      routedEdges,
      { preserveManualRouteDisplay: Boolean(edgeForCommit.manualPoints?.length) }
    );
    if (!prepared.ok || !prepared.edge) {
      const message = connectionCommitFailureMessage(prepared.issues);
      showGlobalMessage(`联络线绘制失败：${message}`);
      writeOperationLog(`联络线绘制失败：${message}`);
      return false;
    }
    const preparedEdge = prepared.edge;
    pushUndoSnapshot(true, false, undefined, "添加联络线", sourceName + " -> " + targetName);
    markRouteEdgesDirty([preparedEdge.id]);
    markStoredRouteEdgesDirty([preparedEdge.id]);
    markBusTerminalSyncDirtyForEdges([preparedEdge]);
    // 将电压继承的节点更新与边更新合并到一次 setGraphStore 调用中
    setGraphStore((current: any) => {
      let next = current;
      if (nodesToUpdate.length > 0) {
        next = graphStorePatchNodes(next, nodesToUpdate);
      }
      const result = graphStoreApplyPatch(next, { edgeUpserts: [preparedEdge] });
      return result;
    });
    setCanvasSelectionScope("group");
    setSelectedNodeIds([]);
    setSelectedEdgeId(preparedEdge.id);
    setSelectedEdgeIds([preparedEdge.id]);
    setConnectSource(null);
    resetConnectPreviewState();
    setMode("select");
    writeOperationLog(`新增联络线：${sourceName} -> ${targetName}`);
    return true;
  };
}

export function createFinishConnectToTarget(__appScope: ProjectCanvasScope) {
  return (target: ConnectTarget, endpointPoint?: Point | null) => {
  const { busAnchorFromPoint, canConnectTerminals, commitNewConnectionEdge, connectPreviewPointRef, connectSource, getTerminalPoint, isBusNode, visibleNodeById } = __appScope;
    if (endpointPoint === undefined) {
      endpointPoint = connectPreviewPointRef.current;
    }
    if (!connectSource) {
      return false;
    }
    const sourceNode = visibleNodeById.get(connectSource.nodeId);
    if (!sourceNode || !canConnectTerminals(sourceNode, connectSource.terminalId, target.node, target.terminalId)) {
      return false;
    }
    if (isLineOnlyConnectionNode(sourceNode) || isLineOnlyConnectionNode(target.node)) {
      return false;
    }
    const targetPoint = isBusNode(target.node)
      ? target.point ?? busAnchorFromPoint(target.node, endpointPoint ?? getTerminalPoint(target.node, target.terminalId))
      : target.point;
    const newEdge: Edge = {
      id: `edge-${Date.now()}`,
      sourceId: sourceNode.id,
      targetId: target.node.id,
      sourceTerminalId: connectSource.terminalId,
      sourcePoint: connectSource.point,
      manualPoints: connectSource.manualPoints,
      targetTerminalId: target.terminalId,
      targetPoint
    };
    return commitNewConnectionEdge(newEdge, sourceNode.name, target.node.name);
  };
}

export function createFinishRewiring(__appScope: ProjectCanvasScope) {
  return (event: ReactPointerEvent<SVGSVGElement>) => {
  const { canvasBounds, clampPointToCanvas, connectionCommitFailureMessage, connectionEndpointRuleFailureMessage, edgeById, endpointMatchedRoutePointsForEdge, findRewireTargetAtPoint, getModelEdgeEndpointPoint, getTerminalPoint, isBusNode, markBusTerminalSyncDirtyForEdges, markRouteEdgesDirty, markStoredRouteEdgesDirty, nodeById, nodes, patchGraphEdges, prepareConnectionEdgeForCommit, preserveConnectionEdgeRouteShape, previewStoredRoutePointsForEdge, pushUndoSnapshot, resolveStraightBusSlideEndpointToPoint, rewiring, routedEdgeById, routedEdges, routingNodesForConnectionEdge, screenToSvgPoint, selectCanvasGraphics, setRewiring, svgRef, writeOperationLog } = __appScope;
    if (!rewiring || !svgRef.current) {
      return;
    }
    const point = clampPointToCanvas(screenToSvgPoint(svgRef.current, event.clientX, event.clientY));
    const target = findRewireTargetAtPoint(point, rewiring);
    if (target) {
      const edge = edgeById.get(rewiring.edgeId);
      const movingPoint = target.point ?? getTerminalPoint(target.node, target.terminalId);
      const sourceNode = edge ? nodeById.get(edge.sourceId) : undefined;
      const targetNode = edge ? nodeById.get(edge.targetId) : undefined;
      const matchedRewireRoutePoints = edge && sourceNode && targetNode
        ? endpointMatchedRoutePointsForEdge(edge, routedEdgeById.get(edge.id)?.points)
        : [];
      const currentRewireRoutePoints = edge && sourceNode && targetNode
        ? matchedRewireRoutePoints.length
          ? matchedRewireRoutePoints
          : previewStoredRoutePointsForEdge(edge)
        : [];
      const currentSourcePoint = edge && sourceNode
        ? currentRewireRoutePoints[0] ?? getModelEdgeEndpointPoint(sourceNode, edge.sourcePoint, edge.sourceTerminalId)
        : undefined;
      const currentTargetPoint = edge && targetNode
        ? currentRewireRoutePoints[currentRewireRoutePoints.length - 1] ?? getModelEdgeEndpointPoint(targetNode, edge.targetPoint, edge.targetTerminalId)
        : undefined;
      const fixedSourcePoint = edge && sourceNode && currentSourcePoint && isBusNode(sourceNode)
        ? currentSourcePoint
        : edge?.sourcePoint;
      const fixedTargetPoint = edge && targetNode && currentTargetPoint && isBusNode(targetNode)
        ? currentTargetPoint
        : edge?.targetPoint;
      const rewiredEdge = edge
        ? rewiring.endpoint === "source"
          ? {
              ...edge,
              sourceId: target.node.id,
              sourceTerminalId: target.terminalId,
              sourcePoint: target.point,
              targetPoint: fixedTargetPoint
            }
          : {
              ...edge,
              sourcePoint: fixedSourcePoint,
              targetId: target.node.id,
              targetTerminalId: target.terminalId,
              targetPoint: target.point
            }
        : null;
      const slidePatch = edge && sourceNode && targetNode
        ? resolveStraightBusSlideEndpointToPoint({
            edge,
            sourceNode,
            targetNode,
            movingEndpoint: rewiring.endpoint,
            movingPoint,
            nodes,
            movingNode: target.node,
            movingTerminalId: target.terminalId
          })
        : null;
      const candidateEdge = rewiredEdge ? (slidePatch ? { ...rewiredEdge, ...slidePatch } : rewiredEdge) : null;
      const routingNodes = candidateEdge ? routingNodesForConnectionEdge(candidateEdge, nodes) : [];
      const rewireStoredPoints = currentRewireRoutePoints.length >= 2
        ? currentRewireRoutePoints.map((routePoint: Point) => ({ ...routePoint }))
        : edge && currentSourcePoint && currentTargetPoint
          ? previewStoredRoutePointsForEdge(edge, currentSourcePoint, currentTargetPoint)
          : edge
            ? previewStoredRoutePointsForEdge(edge)
            : [];
      const edgeForCommit = candidateEdge && edge
        ? preserveConnectionEdgeRouteShape(
            routingNodes,
            candidateEdge,
            rewireStoredPoints,
            canvasBounds
          )
        : null;
      const endpointRuleMessage = edgeForCommit ? connectionEndpointRuleFailureMessage(edgeForCommit) : "";
      const prepared = edgeForCommit && !endpointRuleMessage
        ? prepareConnectionEdgeForCommit(
            routingNodes,
            [edgeForCommit],
            rewiring.edgeId,
            canvasBounds,
            routedEdges
          )
        : null;
      if (prepared?.ok && prepared.edge) {
        const preparedEdge = prepared.edge;
        pushUndoSnapshot(true, false, undefined, "调整联络线端子", rewiring.edgeId);
        markRouteEdgesDirty([rewiring.edgeId]);
        markStoredRouteEdgesDirty([rewiring.edgeId]);
        markBusTerminalSyncDirtyForEdges([edge, preparedEdge]);
        patchGraphEdges([preparedEdge]);
        writeOperationLog(`调整联络线端子：${rewiring.edgeId}`);
      } else {
        const message = endpointRuleMessage || connectionCommitFailureMessage(prepared?.issues);
        showGlobalMessage(`联络线端子调整失败：${message}`);
        writeOperationLog(`联络线端子调整失败：${message}`);
      }
    } else {
      showGlobalMessage("联络线端子必须连接到同类型端子或母线，已保持原连接。");
      writeOperationLog("联络线端子调整失败");
    }
    selectCanvasGraphics([], [rewiring.edgeId]);
    setRewiring(null);
  };
}

export function createHandleDrop(__appScope: ProjectCanvasScope) {
  return (event: ReactDragEvent<SVGSVGElement>) => {
  const { customGraphTemplates, dropGraphTemplate, libraryTemplates, placeLibraryDeviceAtPoint, screenToSvgPoint, svgRef } = __appScope;
    event.preventDefault();
    const graphTemplateId = event.dataTransfer.getData("application/graph-template-id");
    if (graphTemplateId && svgRef.current) {
      const template = customGraphTemplates.find((item: any) => item.id === graphTemplateId);
      if (!template) {
        return;
      }
      const pointerPosition = screenToSvgPoint(svgRef.current, event.clientX, event.clientY);
      dropGraphTemplate(template, pointerPosition);
      return;
    }
    const kind = event.dataTransfer.getData("application/device-kind") as DeviceKind;
    if (!kind || !svgRef.current) {
      return;
    }
    const pointerPosition = screenToSvgPoint(svgRef.current, event.clientX, event.clientY);
    const position = { x: pointerPosition.x, y: pointerPosition.y };
    const template = libraryTemplates.find((item: DeviceTemplate) => item.kind === kind);
    if (!template) {
      return;
    }
    placeLibraryDeviceAtPoint(template, position);
  };
}

export function createHandleRoutableLineNodePointerDown(__appScope: ProjectCanvasScope) {
  return (event: ReactPointerEvent<Element>, node: ModelNode) => {
  const { activateInspectorFromCanvas, activeLayerNodeIdSet, clampPointToCanvas, hasCanvasSelectionModifier, insertRoutableLineBendFromPointer, isEditMode, resetConnectPreviewState, routableLineDeviceCanvasPoints, screenToSvgPoint, selectCanvasGraphics, selectedNodeIdSet, setConnectSource, setContextMenu, setRewiring, startModifierSelectionPress, svgRef, switchInspectorTabForCanvasSelection } = __appScope;
    event.preventDefault();
    event.stopPropagation();
    if (event.button !== 0 || !activeLayerNodeIdSet.has(node.id)) {
      return;
    }
    activateInspectorFromCanvas();
    if (isEditMode && selectedNodeIdSet.has(node.id) && event.detail >= 2 && svgRef.current) {
      const pointer = clampPointToCanvas(screenToSvgPoint(svgRef.current, event.clientX, event.clientY));
      const routePoints = routableLineDeviceCanvasPoints(node);
      if (insertRoutableLineBendFromPointer(node.id, routePoints, pointer)) {
        return;
      }
    }
    if (hasCanvasSelectionModifier(event)) {
      startModifierSelectionPress(event, { kind: "node", nodeId: node.id });
      return;
    }
    selectCanvasGraphics([node.id], [], { scope: "direct" });
    switchInspectorTabForCanvasSelection([node.id], [], "single");
    setConnectSource(null);
    resetConnectPreviewState();
    setRewiring(null);
    setContextMenu(null);
  };
}

export function createHandleNodePointerDown(__appScope: ProjectCanvasScope) {
  return (event: ReactPointerEvent<SVGGElement>, node: ModelNode) => {
  const { activateInspectorFromCanvas, activeLayerNodeIdSet, activeSelectedEdgeIds, activeSelectedNodeIds, appendStaticDrawingPoint, applyConnectPreviewState, beginStaticButtonPointerFeedback, buildMultiNodeDragOverlayPreview, buildSingleNodeDragCache, canvasSelectionScope, clampPointToCanvas, clearNodeDragMoveSchedule, connectSource, connectTargetSnapPoint, createCanvasSelectionSnapshot, dragUndoCapturedRef, edgeListForNodeIds, expandActiveGroupSelection, findConnectTargetAtPoint, finishConnectToTarget, groupExpandedCanvasSelection, handleRoutableLineNodePointerDown, handleTerminalPointerDown, hasCanvasSelectionModifier, isBusNode, isMultiNodeMoveState, isRoutableLineDeviceKind, isStaticButtonEnabledForNode, isWholeActiveLayerMove, lastCanvasPointerRef, mode, movableCanvasNodeIds, nodeById, nodes, resetConnectPreviewState, resolveConnectPreviewPoint, restoreCanvasSelectionSnapshotWithInspector, routableLinePlacement, routePointsSnapshotForMove, screenToSvgPoint, selectCanvasGraphics, selectedEdgeId, selectedEdgeIds, selectedGroupMemberNodeIdSet, selectedNodeIdSet, selectedNodeIds, setConnectSource, setContextMenu, setLastCanvasClickTarget, setRewiring, setSelectedEdgeId, setSelectedEdgeIds, snapshotRouteBounds, startDraggingState, startModifierSelectionPress, staticDrawing, svgRef, switchInspectorTabForCanvasSelection, updateMouseStatus } = __appScope;
    event.stopPropagation();
    if (event.button !== 0) {
      return;
    }
    setLastCanvasClickTarget("device");
    if (staticDrawing && svgRef.current) {
      const pointer = clampPointToCanvas(screenToSvgPoint(svgRef.current, event.clientX, event.clientY));
      appendStaticDrawingPoint(pointer, event.detail >= 2);
      return;
    }
    if (!activeLayerNodeIdSet.has(node.id)) {
      return;
    }
    activateInspectorFromCanvas();
    if (routableLinePlacement && isBusNode(node)) {
      event.preventDefault();
      event.stopPropagation();
      handleTerminalPointerDown(event as unknown as ReactPointerEvent<SVGCircleElement>, node, node.terminals[0]?.id ?? "t1");
      return;
    }
    if (connectSource && svgRef.current) {
      event.preventDefault();
      event.stopPropagation();
      const pointer = clampPointToCanvas(screenToSvgPoint(svgRef.current, event.clientX, event.clientY));
      lastCanvasPointerRef.current = pointer;
      updateMouseStatus(pointer);
      const previewPoint = resolveConnectPreviewPoint(pointer, event);
      const target = findConnectTargetAtPoint(previewPoint);
      applyConnectPreviewState(previewPoint, Boolean(target), target ? connectTargetSnapPoint(target) : null);
      if (target) {
        finishConnectToTarget(target, previewPoint);
      }
      return;
    }
    if (isRoutableLineDeviceKind(node.kind)) {
      handleRoutableLineNodePointerDown(event, node);
      return;
    }
    if (hasCanvasSelectionModifier(event)) {
      startModifierSelectionPress(event, { kind: "node", nodeId: node.id });
      return;
    }
    beginStaticButtonPointerFeedback(event, node);
    const nodeWasSelected = selectedNodeIdSet.has(node.id);
    const hadCanvasSelection = selectedNodeIds.length > 0 || selectedEdgeIds.length > 0;
    let applyPointerDownSelectionImmediately = false;
    const clickedSelectedGroupMember =
      !event.ctrlKey &&
      !event.shiftKey &&
      !event.metaKey &&
      nodeWasSelected &&
      selectedGroupMemberNodeIdSet.has(node.id);
    const keepEdgeSelection = nodeWasSelected && activeSelectedEdgeIds.length > 0;
    let dragSelectionSnapshot = createCanvasSelectionSnapshot(
      canvasSelectionScope,
      selectedNodeIds,
      keepEdgeSelection ? selectedEdgeIds : [],
      keepEdgeSelection ? selectedEdgeId : ""
    );
    if (!keepEdgeSelection && nodeWasSelected && activeSelectedEdgeIds.length > 0) {
      setSelectedEdgeId("");
      setSelectedEdgeIds([]);
    }
    const groupDragSelection = {
      nodeIds: groupExpandedCanvasSelection.nodeIds,
      edgeIds: groupExpandedCanvasSelection.edgeIds
    };
    let dragSelection = nodeWasSelected
      ? groupDragSelection
      : expandActiveGroupSelection([node.id], []);
    if (clickedSelectedGroupMember) {
      dragSelectionSnapshot = createCanvasSelectionSnapshot("direct", [node.id], [], "");
      applyPointerDownSelectionImmediately = true;
    } else if (event.ctrlKey || event.shiftKey || event.metaKey) {
      dragSelection = nodeWasSelected
        ? groupDragSelection
        : expandActiveGroupSelection([...activeSelectedNodeIds, node.id], activeSelectedEdgeIds);
      dragSelectionSnapshot = createCanvasSelectionSnapshot("group", dragSelection.nodeIds, dragSelection.edgeIds, dragSelection.edgeIds[0] ?? "");
      applyPointerDownSelectionImmediately = true;
    } else if (!nodeWasSelected) {
      dragSelection = expandActiveGroupSelection([node.id], []);
      dragSelectionSnapshot = createCanvasSelectionSnapshot("group", dragSelection.nodeIds, dragSelection.edgeIds, dragSelection.edgeIds[0] ?? "");
      applyPointerDownSelectionImmediately = hadCanvasSelection;
    }
    if (applyPointerDownSelectionImmediately) {
      restoreCanvasSelectionSnapshotWithInspector(dragSelectionSnapshot);
    }
    // 拖容器 = 整组:把成员并入本次拖动集合(成员随容器平移,其连线也随拖动候选集一并处理)
    const dragNodeIds = movableCanvasNodeIds(containerDragGroup(nodes, dragSelection.nodeIds));
    if (mode === "connect") {
      if (isBusNode(node)) {
        handleTerminalPointerDown(event as unknown as ReactPointerEvent<SVGCircleElement>, node, node.terminals[0]?.id ?? "t1");
      }
      return;
    }
    if (connectSource && isBusNode(node)) {
      handleTerminalPointerDown(event as unknown as ReactPointerEvent<SVGCircleElement>, node, node.terminals[0]?.id ?? "t1");
      return;
    }
    if (!svgRef.current) {
      return;
    }
    const point = clampPointToCanvas(screenToSvgPoint(svgRef.current, event.clientX, event.clientY));
    if (dragNodeIds.length === 0) {
      return;
    }
    const edgeIdsForDrag = dragSelection.edgeIds;
    const affectedEdgesForDrag = edgeListForNodeIds(dragNodeIds, edgeIdsForDrag);
    const wholeLayerMove = isWholeActiveLayerMove(dragNodeIds);
    clearNodeDragMoveSchedule();
    dragUndoCapturedRef.current = false;
    const originalPositionsForDrag = Object.fromEntries(
      dragNodeIds.flatMap((id: string) => {
        const item = nodeById.get(id);
        return item ? [[item.id, { ...item.position }]] : [];
      })
    );
    const originalRoutePointsForDrag = routePointsSnapshotForMove(affectedEdgesForDrag, dragNodeIds, edgeIdsForDrag);
    const nextDragging: DraggingState = {
      source: "pointer",
      nodeIds: dragNodeIds,
      grabbedNodeIds: dragSelection.nodeIds,
      edgeIds: edgeIdsForDrag,
      affectedEdges: affectedEdgesForDrag,
      wholeLayerMove,
      startPoint: point,
      originalPositions: originalPositionsForDrag,
      originalEdgePoints: Object.fromEntries(
        affectedEdgesForDrag.map((edge: Edge) => [
          edge.id,
          {
            ...cloneEdgeEditablePoints(edge),
            routePoints: edge.routePoints?.map((point: Point) => ({ ...point }))
          }
        ])
      ),
      originalRoutePoints: originalRoutePointsForDrag,
      originalRouteBounds: snapshotRouteBounds(originalRoutePointsForDrag),
      singleNodeDragCache: buildSingleNodeDragCache(dragNodeIds, edgeIdsForDrag, affectedEdgesForDrag),
      overlayPreview: isMultiNodeMoveState({ nodeIds: dragNodeIds })
        ? buildMultiNodeDragOverlayPreview(dragNodeIds, affectedEdgesForDrag, originalPositionsForDrag, originalRoutePointsForDrag, edgeIdsForDrag)
        : undefined,
      selection: dragSelectionSnapshot
    };
    startDraggingState(nextDragging);
    event.currentTarget.setPointerCapture(event.pointerId);
  };
}

export function createHandleRoutableLineNodePathPointerDown(__appScope: ProjectCanvasScope) {
  return (event: ReactPointerEvent<SVGPathElement>, node: ModelNode) => {
  const { handleRoutableLineNodePointerDown } = __appScope;
    handleRoutableLineNodePointerDown(event, node);
  };
}

export function createHandlePointerMove(__appScope: ProjectCanvasScope) {
  return (event: ReactPointerEvent<SVGSVGElement>) => {
  const { CANVAS_SELECTION_DRAG_THRESHOLD, MOVE_BOUNDARY_GUARD, applyCanvasPanningVisualOffset, buildGroupTransformNodeUpdates, buildRoutableLineEndpointPreviewNodeUpdates, cancelPendingBlankCanvasDeselectOnMove, canvasBounds, canvasFrameRef, canvasFrameUserScrollRef, canvasNoScrollOffsetRef, clampCanvasNoScrollOffsetPoint, clampNumber, clampPointToCanvas, clampViewBoxToCanvas, connectSource, contextMarqueeSelectionRef, draggingRef, getNodeScaleX, getNodeScaleY, graphStore, imperativeMarqueeRectRef, isBusNode, isGroupTransformDrag, isLineSegmentBusNode, isRoutableLineDeviceKind, lastCanvasClientPointerRef, lastCanvasPointerRef, lastRawCanvasPointerRef, latestGraphStoreRef, libraryPlacement, manualPathDrag, marquee, marqueeCurrentRef, modelGeometryInsideCanvasBounds, modifierSelectionPressRef, moveOrthogonalRouteSegment, moveRoutableLineDeviceSegment, nodeById, nodeLabelDrag, nodeLabelRotateDrag, nodeLabelRotationFromPoint, normalizeNodeLabelRotation, normalizeRotationDegrees, panning, panningRef, patchGraphNodes, patchSingleTerminalAnchorFromPoint, pendingCanvasNoScrollOffsetRef, proportionalSignedScaleFromHandleDelta, proportionalSignedScaleFromUprightHandleDelta, pushUndoSnapshot, resizeLineSegmentBusGeometryFromHandleDrag, resolveConnectPreviewPoint, resolveRoutableLinePreviewPoint, rewiring, rotationDeltaBetweenTransformPoints, routableLineDeviceCanvasPoints, routableLineEndpointDrag, routableLinePlacement, sameOptionalPoint, sameOptionalPointList, scheduleConnectPreviewPoint, scheduleNodeDragMove, scheduleRewirePreviewPoint, scheduleRoutableLinePreviewPoint, screenToSvgPoint, setManualPathDrag, setMarquee, setModifierSelectionPress, setNodeLabelDrag, setNodeLabelRotateDrag, setRoutableLineDeviceCanvasPoints, setTerminalPress, setTransformDrag, setViewBox, signedScaleFromRotatedHandleDelta, signedScaleFromUprightHandleDelta, singleTransformBaseNode, skipNextCanvasScrollSyncRef, staticButtonPointerRef, staticDrawing, svgRef, terminalPress, transformDrag, transformDragChangedRef, updateGraphNodeById, updateInteractiveStaticDrawingPreview, updateLibraryPlacementPreview, updateMeasurementDrag, updateMouseStatus, updateRoutableLineEndpointDrag } = __appScope;
    const staticButtonPointer = staticButtonPointerRef.current;
    if (
      staticButtonPointer &&
      !staticButtonPointer.moved &&
      Math.hypot(event.clientX - staticButtonPointer.clientX, event.clientY - staticButtonPointer.clientY) > 4
    ) {
      staticButtonPointerRef.current = { ...staticButtonPointer, moved: true };
    }
    const activePanning = panningRef.current ?? panning;
    if (activePanning && svgRef.current) {
      // 平移视图不该丢掉已选设备：指针一旦越过阈值就作废「单击空白清选」
      cancelPendingBlankCanvasDeselectOnMove?.(event.clientX, event.clientY, CANVAS_SELECTION_DRAG_THRESHOLD);
      const frame = canvasFrameRef.current;
      const useHorizontalScrollPanning = Boolean(frame && activePanning.horizontalScrollMode);
      const useVerticalScrollPanning = Boolean(frame && activePanning.verticalScrollMode);
      if (frame) {
        const pointerDeltaX = event.clientX - activePanning.clientX;
        const pointerDeltaY = event.clientY - activePanning.clientY;
        let nextOffsetX = activePanning.canvasOffset.x + pointerDeltaX;
        let nextOffsetY = activePanning.canvasOffset.y + pointerDeltaY;
        let scrollChanged = false;
        if (useHorizontalScrollPanning) {
          const requestedLeft = activePanning.scrollLeft - pointerDeltaX;
          const previousLeft = frame.scrollLeft;
          frame.scrollLeft = requestedLeft;
          nextOffsetX = activePanning.canvasOffset.x + frame.scrollLeft - requestedLeft;
          if (Math.abs(frame.scrollLeft - previousLeft) > 0.5) {
            scrollChanged = true;
          }
        }
        if (useVerticalScrollPanning) {
          const requestedTop = activePanning.scrollTop - pointerDeltaY;
          const previousTop = frame.scrollTop;
          frame.scrollTop = requestedTop;
          nextOffsetY = activePanning.canvasOffset.y + frame.scrollTop - requestedTop;
          if (Math.abs(frame.scrollTop - previousTop) > 0.5) {
            scrollChanged = true;
          }
        }
        const nextOffset = clampCanvasNoScrollOffsetPoint({
          x: nextOffsetX,
          y: nextOffsetY
        });
        const offsetChanged =
          Math.abs(nextOffset.x - activePanning.canvasOffset.x) > 0.5 ||
          Math.abs(nextOffset.y - activePanning.canvasOffset.y) > 0.5;
        pendingCanvasNoScrollOffsetRef.current = nextOffset;
        canvasNoScrollOffsetRef.current = nextOffset;
        applyCanvasPanningVisualOffset(nextOffset);
        skipNextCanvasScrollSyncRef.current = offsetChanged;
        if (scrollChanged || offsetChanged) {
          canvasFrameUserScrollRef.current = true;
        }
        return;
      }
      const rect = sharedElementRectCache.getRect(svgRef.current);
      const dx = rect.width > 0 ? ((event.clientX - activePanning.clientX) / rect.width) * canvasBounds.width : 0;
      const dy = rect.height > 0 ? ((event.clientY - activePanning.clientY) / rect.height) * canvasBounds.height : 0;
      const nextViewBox = clampViewBoxToCanvas({ ...activePanning.viewBox, x: activePanning.viewBox.x - dx, y: activePanning.viewBox.y - dy });
      schedulePanViewBoxUpdate(setViewBox, nextViewBox);
      return;
    }
    if (svgRef.current) {
      const rawPointer = screenToSvgPoint(svgRef.current, event.clientX, event.clientY);
      const pointer = draggingRef.current ? rawPointer : clampPointToCanvas(rawPointer);
      lastRawCanvasPointerRef.current = rawPointer;
      lastCanvasPointerRef.current = pointer;
      lastCanvasClientPointerRef.current = { x: event.clientX, y: event.clientY };
      updateMouseStatus(pointer);
      if (libraryPlacement) {
        updateLibraryPlacementPreview(pointer);
      }
      if (routableLinePlacement) {
        const previewPoint = resolveRoutableLinePreviewPoint(pointer, event);
        scheduleRoutableLinePreviewPoint(previewPoint);
      }
      const activeContextMarqueeSelection = contextMarqueeSelectionRef.current;
      if (activeContextMarqueeSelection) {
        const nextMarquee = { start: activeContextMarqueeSelection.start, current: pointer };
        if (imperativeMarqueeRectRef?.current && marqueeCurrentRef) {
          marqueeCurrentRef.current = nextMarquee;
          applyImperativeMarqueeRect(imperativeMarqueeRectRef.current, nextMarquee);
        } else {
          scheduleMarqueeUpdate(setMarquee, nextMarquee);
        }
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      if (routableLineEndpointDrag) {
        updateRoutableLineEndpointDrag(pointer, event.ctrlKey);
      }
      if (connectSource) {
        const previewPoint = resolveConnectPreviewPoint(pointer, event);
        scheduleConnectPreviewPoint(previewPoint);
      }
      if (staticDrawing && !connectSource) {
        updateInteractiveStaticDrawingPreview(pointer);
      }
    }
    if (updateMeasurementDrag(event)) {
      return;
    }
    const modifierPress = modifierSelectionPressRef.current;
    if (modifierPress && svgRef.current && modifierPress.pointerId === event.pointerId) {
      const currentPoint = lastCanvasPointerRef.current ?? clampPointToCanvas(screenToSvgPoint(svgRef.current, event.clientX, event.clientY));
      const moved =
        modifierPress.moved ||
        Math.hypot(event.clientX - modifierPress.startClientX, event.clientY - modifierPress.startClientY) > CANVAS_SELECTION_DRAG_THRESHOLD;
      const nextPress = sameOptionalPoint(modifierPress.currentPoint, currentPoint) && modifierPress.moved === moved
        ? modifierPress
        : { ...modifierPress, currentPoint, moved };
      if (nextPress !== modifierPress) {
        modifierSelectionPressRef.current = nextPress;
        if (!moved) {
          setModifierSelectionPress(nextPress);
        }
      }
      if (moved) {
        const nextMarquee = { start: modifierPress.startPoint, current: currentPoint };
        if (imperativeMarqueeRectRef?.current && marqueeCurrentRef) {
          marqueeCurrentRef.current = nextMarquee;
          applyImperativeMarqueeRect(imperativeMarqueeRectRef.current, nextMarquee);
        } else {
          scheduleMarqueeUpdate(setMarquee, nextMarquee);
        }
      } else {
        if (imperativeMarqueeRectRef?.current && marqueeCurrentRef) {
          marqueeCurrentRef.current = null;
          applyImperativeMarqueeRect(imperativeMarqueeRectRef.current, null);
        } else {
          scheduleMarqueeUpdate(setMarquee, null);
        }
      }
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    if (nodeLabelRotateDrag && svgRef.current) {
      const point = lastCanvasPointerRef.current ?? clampPointToCanvas(screenToSvgPoint(svgRef.current, event.clientX, event.clientY));
      const nextRotation = String(nodeLabelRotationFromPoint(nodeLabelRotateDrag.center, point));
      const currentNode = nodeById.get(nodeLabelRotateDrag.nodeId);
      if (!currentNode || normalizeNodeLabelRotation(currentNode.params._labelRotation) === Number(nextRotation)) {
        return;
      }
      if (!nodeLabelRotateDrag.historyCaptured) {
        pushUndoSnapshot();
      }
      updateGraphNodeById(nodeLabelRotateDrag.nodeId, (node: ModelNode) => ({
        ...node,
        params: { ...node.params, _labelRotation: nextRotation }
      }));
      setNodeLabelRotateDrag((current: any) =>
        current && current.nodeId === nodeLabelRotateDrag.nodeId
          ? { ...current, historyCaptured: true }
          : current
      );
      return;
    }
    if (nodeLabelDrag && svgRef.current) {
      const point = lastCanvasPointerRef.current ?? clampPointToCanvas(screenToSvgPoint(svgRef.current, event.clientX, event.clientY));
      const nextOffset = {
        x: Math.round((nodeLabelDrag.startOffset.x + (point.x - nodeLabelDrag.startPoint.x) / nodeLabelDrag.scaleX) * 10) / 10,
        y: Math.round((nodeLabelDrag.startOffset.y + (point.y - nodeLabelDrag.startPoint.y) / nodeLabelDrag.scaleY) * 10) / 10
      };
      if (sameOptionalPoint(nextOffset, nodeLabelDrag.startOffset) && !nodeLabelDrag.historyCaptured) {
        return;
      }
      if (!nodeLabelDrag.historyCaptured) {
        pushUndoSnapshot();
      }
      updateGraphNodeById(nodeLabelDrag.nodeId, (node: ModelNode) => {
        const currentX = node.params._labelX ?? "";
        const currentY = node.params._labelY ?? "";
        const nextX = String(nextOffset.x);
        const nextY = String(nextOffset.y);
        if (currentX === nextX && currentY === nextY) {
          return node;
        }
        return { ...node, params: { ...node.params, _labelX: nextX, _labelY: nextY } };
      });
      setNodeLabelDrag((current: any) =>
        current && current.nodeId === nodeLabelDrag.nodeId
          ? { ...current, historyCaptured: current.historyCaptured || nodeLabelDrag.historyCaptured || !sameOptionalPoint(nextOffset, nodeLabelDrag.startOffset) }
          : current
      );
      return;
    }
    if (terminalPress && svgRef.current) {
      const point = lastCanvasPointerRef.current;
      const node = nodeById.get(terminalPress.nodeId);
      if (!node || !point) {
        return;
      }
      const distance = Math.hypot(point.x - terminalPress.startPoint.x, point.y - terminalPress.startPoint.y);
      const nextPress = { ...terminalPress, currentPoint: point, moved: terminalPress.moved || distance > 4 };
      if (!nextPress.moved) {
        setTerminalPress(nextPress);
        return;
      }
      if (isBusNode(node) || node.terminals.length !== 1) {
        setTerminalPress(nextPress);
        return;
      }
      if (!nextPress.historyCaptured) {
        pushUndoSnapshot();
        nextPress.historyCaptured = true;
      }
      setTerminalPress(nextPress);
      patchSingleTerminalAnchorFromPoint(terminalPress.nodeId, terminalPress.terminalId, point, terminalPress.startPoint);
      return;
    }
    if (manualPathDrag && svgRef.current) {
      const point = lastCanvasPointerRef.current;
      if (!point) {
        return;
      }
      const nextDrag = { ...manualPathDrag };
      if (!nextDrag.historyCaptured) {
        pushUndoSnapshot();
        nextDrag.historyCaptured = true;
      }
      const originalRoutePoints = nextDrag.originalRoutePoints;
      if (originalRoutePoints.length < 2) {
        return;
      }
      const nextPoints = originalRoutePoints.map((item: Point) => ({ ...item }));
      const routableLineNode = nextDrag.nodeId ? nodeById.get(nextDrag.nodeId) : undefined;
      if ("pointIndex" in nextDrag) {
        if (nextDrag.pointIndex > 0 && nextDrag.pointIndex < originalRoutePoints.length - 1) {
          const originalPoint = originalRoutePoints[nextDrag.pointIndex];
          nextPoints[nextDrag.pointIndex] = clampPointToCanvas({
            x: originalPoint.x + point.x - nextDrag.startPoint.x,
            y: originalPoint.y + point.y - nextDrag.startPoint.y
          });
        }
      } else {
        nextPoints.splice(
          0,
          nextPoints.length,
          ...moveOrthogonalRouteSegment(originalRoutePoints, nextDrag.segmentIndex, nextDrag.orientation, point, canvasBounds)
        );
      }
      const previewRoutePoints = routableLineNode && isRoutableLineDeviceKind(routableLineNode.kind)
        ? routableLineDeviceCanvasPoints(
            "pointIndex" in nextDrag
              ? setRoutableLineDeviceCanvasPoints(routableLineNode, nextPoints)
              : moveRoutableLineDeviceSegment(
                  setRoutableLineDeviceCanvasPoints(routableLineNode, originalRoutePoints),
                  nextDrag.segmentIndex,
                  nextDrag.orientation,
                  point,
                  canvasBounds
                )
          )
        : nextPoints.map((item: Point) => ({ ...item }));
      if (!modelGeometryInsideCanvasBounds([], [{ points: previewRoutePoints }], canvasBounds, MOVE_BOUNDARY_GUARD)) {
        return;
      }
      if (
        nextDrag.historyCaptured === manualPathDrag.historyCaptured &&
        sameOptionalPointList(previewRoutePoints, manualPathDrag.previewRoutePoints)
      ) {
        return;
      }
      setManualPathDrag({ ...nextDrag, previewRoutePoints });
      return;
    }
    if (rewiring && svgRef.current) {
      const previewPoint = lastCanvasPointerRef.current ?? clampPointToCanvas(screenToSvgPoint(svgRef.current, event.clientX, event.clientY));
      scheduleRewirePreviewPoint(previewPoint, rewiring, event.ctrlKey);
      return;
    }
    const activeMarquee = marqueeCurrentRef?.current ?? marquee;
    if (activeMarquee && svgRef.current) {
      const currentPoint = lastCanvasPointerRef.current ?? clampPointToCanvas(screenToSvgPoint(svgRef.current, event.clientX, event.clientY));
      if (!sameOptionalPoint(activeMarquee.current, currentPoint)) {
        const nextMarquee = { start: activeMarquee.start, current: currentPoint };
        if (imperativeMarqueeRectRef?.current && marqueeCurrentRef) {
          // 拖动框选全程直接操作 SVG <rect> 属性：0 次 React 重渲染
          marqueeCurrentRef.current = nextMarquee;
          applyImperativeMarqueeRect(imperativeMarqueeRectRef.current, nextMarquee);
        } else {
          scheduleMarqueeUpdate(setMarquee, nextMarquee);
        }
      }
      return;
    }
    if (transformDrag && svgRef.current) {
      const rawPoint = lastRawCanvasPointerRef.current ?? screenToSvgPoint(svgRef.current, event.clientX, event.clientY);
      const point = transformDrag.kind === "rotate" ? clampPointToCanvas(rawPoint) : rawPoint;
      transformDragChangedRef.current = true;
      if (!transformDrag.historyCaptured) {
        pushUndoSnapshot();
        if (!isGroupTransformDrag(transformDrag)) {
          setTransformDrag({ ...transformDrag, historyCaptured: true });
        }
      }
      const currentStore = latestGraphStoreRef.current ?? graphStore;
      if (isGroupTransformDrag(transformDrag)) {
        const transformForMove = transformDrag.kind === "rotate"
          ? transformDrag
          : { ...transformDrag, proportionalScale: true };
        const nextNodeUpdates = buildGroupTransformNodeUpdates(transformForMove, point, currentStore);
        if (nextNodeUpdates.length === 0) {
          return;
        }
        setTransformDrag((current: any) =>
          current && isGroupTransformDrag(current) && current.groupId === transformDrag.groupId
            ? current.historyCaptured && current.proportionalScale === transformForMove.proportionalScale && sameOptionalPoint(current.previewPoint, point)
              ? current
              : { ...current, historyCaptured: true, proportionalScale: transformForMove.proportionalScale, previewPoint: point }
            : current
        );
        return;
      }
      const node = currentStore.nodeMap.get(transformDrag.nodeId);
      if (!node) {
        return;
      }
      const baseNode = singleTransformBaseNode(transformDrag, node);
      let nextNode: ModelNode;
      if (transformDrag.kind === "rotate") {
        const rotationDelta = rotationDeltaBetweenTransformPoints(baseNode.position, transformDrag.startPoint, point, false);
        nextNode = {
          ...node,
          position: baseNode.position,
          rotation: normalizeRotationDegrees(baseNode.rotation + rotationDelta),
          scale: baseNode.scale,
          scaleX: baseNode.scaleX,
          scaleY: baseNode.scaleY
        };
        setTransformDrag((current: any) =>
          current && !isGroupTransformDrag(current) && current.nodeId === transformDrag.nodeId
            ? current.historyCaptured && sameOptionalPoint(current.previewPoint, point)
              ? current
              : { ...current, historyCaptured: true, previewPoint: point }
            : current
        );
      } else {
        const currentSignedScaleX = getNodeScaleX(baseNode);
        const currentSignedScaleY = getNodeScaleY(baseNode);
        const lineSegmentBusResize = isLineSegmentBusNode(baseNode);
        // 交流容器拖角也是「几何 resize」(改 size,不改 scale),与分段母线同一条路:
        // 渲染矩形 = size × |scale|,写 scale 会让所见与 eject/入组用的 size 矩形分叉
        const containerResize = !lineSegmentBusResize && isContainerNode(baseNode);
        const geometryResize = lineSegmentBusResize || containerResize;
        const localScaleKind = !geometryResize && (event.shiftKey || transformDrag.kind === "scale-both")
          ? "scale-both"
          : transformDrag.kind;
        const proportionalScale = !geometryResize && localScaleKind === "scale-both";
        const signedScaleFromHandleDelta = transformDrag.uprightStaticSelection
          ? signedScaleFromUprightHandleDelta
          : signedScaleFromRotatedHandleDelta;
        setTransformDrag((current: any) =>
          current && !isGroupTransformDrag(current) && current.nodeId === transformDrag.nodeId
            ? current.historyCaptured && current.proportionalScale === proportionalScale
              ? current
              : { ...current, historyCaptured: true, proportionalScale }
            : current
        );
        if (containerResize) {
          const originalSize = transformDrag.originalSize ?? baseNode.size;
          // 起始几何走容器唯一归一出口:遗留 scale 在此被吃进 size(起始尺寸 = 渲染尺寸),拖完 scale 恒 1
          const baseGeometry = foldContainerScaleIntoSize({ ...baseNode, size: { ...originalSize } });
          const members = containerMemberNodes(currentStore.nodes, baseNode.id);
          const resizedNode = resizeLineSegmentBusGeometryFromHandleDrag({
            node: baseGeometry,
            startPoint: transformDrag.startPoint,
            point,
            handleXDirection: transformDrag.handleXDirection,
            handleYDirection: transformDrag.handleYDirection,
            resizeX: localScaleKind === "scale-x" || localScaleKind === "scale-both",
            resizeY: localScaleKind === "scale-y" || localScaleKind === "scale-both",
            // 下限 = 成员视觉包围盒 + 内侧留白(无成员 = CONTAINER_MIN_SIZE):缩到刚好包住成员为止
            minSize: containerResizeMinSize(baseNode, members)
          });
          nextNode = {
            ...node,
            position: clampContainerCenterToMembers(resizedNode.position, resizedNode.size, members),
            size: resizedNode.size,
            rotation: baseNode.rotation,
            scale: 1,
            scaleX: 1,
            scaleY: 1
          };
        } else if (lineSegmentBusResize) {
          const originalSize = transformDrag.originalSize ?? baseNode.size;
          const resizedNode = resizeLineSegmentBusGeometryFromHandleDrag({
            node: { ...baseNode, size: { ...originalSize } },
            startPoint: transformDrag.startPoint,
            point,
            handleXDirection: transformDrag.handleXDirection,
            handleYDirection: transformDrag.handleYDirection,
            resizeX: localScaleKind === "scale-x" || localScaleKind === "scale-both",
            resizeY: localScaleKind === "scale-y" || localScaleKind === "scale-both"
          });
          nextNode = {
            ...node,
            position: resizedNode.position,
            size: resizedNode.size,
            rotation: baseNode.rotation,
            scale: baseNode.scale,
            scaleX: baseNode.scaleX,
            scaleY: baseNode.scaleY
          };
        } else if (localScaleKind === "scale-x") {
          const nextSignedScaleX = signedScaleFromHandleDelta(transformDrag, point, baseNode, "scale-x");
          nextNode = {
            ...node,
            position: baseNode.position,
            rotation: baseNode.rotation,
            scale: Math.max(Math.abs(nextSignedScaleX), Math.abs(currentSignedScaleY)),
            scaleX: nextSignedScaleX,
            scaleY: currentSignedScaleY
          };
        } else if (localScaleKind === "scale-y") {
          const nextSignedScaleY = signedScaleFromHandleDelta(transformDrag, point, baseNode, "scale-y");
          nextNode = {
            ...node,
            position: baseNode.position,
            rotation: baseNode.rotation,
            scale: Math.max(Math.abs(currentSignedScaleX), Math.abs(nextSignedScaleY)),
            scaleX: currentSignedScaleX,
            scaleY: nextSignedScaleY
          };
        } else {
          const nextSignedScale = transformDrag.uprightStaticSelection
            ? proportionalSignedScaleFromUprightHandleDelta(transformDrag, point, baseNode)
            : proportionalSignedScaleFromHandleDelta(transformDrag, point, baseNode);
          nextNode = { ...node, position: baseNode.position, rotation: baseNode.rotation, scale: nextSignedScale.scale, scaleX: nextSignedScale.scaleX, scaleY: nextSignedScale.scaleY };
        }
      }
      const routableLinePreviewNodeUpdates = buildRoutableLineEndpointPreviewNodeUpdates(
        currentStore.nodes,
        currentStore.nodeMap,
        [nextNode.id],
        [nextNode],
        canvasBounds
      );
      patchGraphNodes([nextNode, ...routableLinePreviewNodeUpdates]);
      return;
    }
    if (!draggingRef.current || !svgRef.current) {
      return;
    }
    const point = lastCanvasPointerRef.current ?? clampPointToCanvas(screenToSvgPoint(svgRef.current, event.clientX, event.clientY));
    scheduleNodeDragMove(point, event.ctrlKey, event.shiftKey);
  };
}

export function createFinishCanvasPanning(__appScope: ProjectCanvasScope) {
  return () => {
  const { applyCanvasPanningVisualOffset, canvasNoScrollOffsetRef, flushPendingBlankCanvasDeselect, panningRef, pendingCanvasNoScrollOffsetRef, scheduleCanvasVisibleViewBoxUpdate, setCanvasNoScrollOffset, setCanvasPanning } = __appScope;
    if (!panningRef.current && !pendingCanvasNoScrollOffsetRef.current) {
      flushPendingBlankCanvasDeselect?.();
      return;
    }
    const pendingOffset = pendingCanvasNoScrollOffsetRef.current;
    pendingCanvasNoScrollOffsetRef.current = null;
    if (pendingOffset) {
      canvasNoScrollOffsetRef.current = pendingOffset;
      applyCanvasPanningVisualOffset(pendingOffset);
      setCanvasNoScrollOffset((current: Point) =>
        current.x === pendingOffset.x && current.y === pendingOffset.y ? current : pendingOffset
      );
    }
    scheduleCanvasVisibleViewBoxUpdate();
    setCanvasPanning(null);
    // 抬起时位移仍未越过阈值 → 视为「单击空白」，此时才执行清空选中
    flushPendingBlankCanvasDeselect?.();
  };
}

export function createStartCanvasPanning(__appScope: ProjectCanvasScope) {
  return (event: ReactPointerEvent<Element>) => {
  const { activateInspectorFromCanvas, canvasFrameHasHorizontalScrollableRange, canvasFrameHasVerticalScrollableRange, canvasFrameRef, canvasHorizontalScrollbarsActiveRef, canvasInteractionRef, canvasNoScrollOffsetRef, canvasVerticalScrollbarsActiveRef, clampPointToCanvas, currentViewBoxFromCanvasFrameScroll, flushPendingWheelZoom, lastCanvasPointerRef, lastRawCanvasPointerRef, pendingCanvasNoScrollOffsetRef, pendingWheelZoomRequestRef, projectListPointerInsideRef, resetConnectPreviewState, screenToSvgPoint, setCanvasPanning, setConnectSource, setContextMenu, setProjectMenu, setRewiring, svgRef, updateMouseStatus } = __appScope;
    if (pendingWheelZoomRequestRef?.current) {
      flushPendingWheelZoom?.();
    }
    const svg = svgRef.current;
    if (event.button !== 0 || !svg) {
      return false;
    }
    activateInspectorFromCanvas();
    canvasInteractionRef.current = true;
    projectListPointerInsideRef.current = false;
    const rawPointer = screenToSvgPoint(svg, event.clientX, event.clientY);
    const pointer = clampPointToCanvas(rawPointer);
    lastRawCanvasPointerRef.current = rawPointer;
    lastCanvasPointerRef.current = pointer;
    updateMouseStatus(pointer);
    setContextMenu(null);
    setProjectMenu(null);
    setConnectSource(null);
    resetConnectPreviewState();
    setRewiring(null);
    const frame = canvasFrameRef.current;
    const panningViewBox = currentViewBoxFromCanvasFrameScroll();
    pendingCanvasNoScrollOffsetRef.current = null;
    setCanvasPanning({
      clientX: event.clientX,
      clientY: event.clientY,
      viewBox: panningViewBox,
      canvasOffset: canvasNoScrollOffsetRef.current,
      scrollLeft: frame?.scrollLeft ?? 0,
      scrollTop: frame?.scrollTop ?? 0,
      horizontalScrollMode: frame ? canvasHorizontalScrollbarsActiveRef.current && canvasFrameHasHorizontalScrollableRange(frame) : false,
      verticalScrollMode: frame ? canvasVerticalScrollbarsActiveRef.current && canvasFrameHasVerticalScrollableRange(frame) : false
    });
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    return true;
  };
}

export function createHandleCanvasPointerDownCapture(__appScope: ProjectCanvasScope) {
  return (event: ReactPointerEvent<SVGSVGElement>) => {
  const { connectSource, hasCanvasSelectionModifier, lastCanvasClientPointerRef, staticDrawing } = __appScope;
    lastCanvasClientPointerRef.current = { x: event.clientX, y: event.clientY };
    if (!hasCanvasSelectionModifier(event) || staticDrawing || connectSource) {
      return;
    }
  };
}

export function createClientPointInsideRenderedCanvas(__appScope: ProjectCanvasScope) {
  return (clientX: number, clientY: number) => {
  const { canvasFrameRef, svgRef } = __appScope;
    const frame = canvasFrameRef.current;
    const svg = svgRef.current;
    if (!frame || !svg) {
      return false;
    }
    const frameRect = sharedElementRectCache.getRect(frame);
    const svgRect = sharedElementRectCache.getRect(svg);
    return (
      clientX >= frameRect.left &&
      clientX <= frameRect.right &&
      clientY >= frameRect.top &&
      clientY <= frameRect.bottom &&
      clientX >= svgRect.left &&
      clientX <= svgRect.right &&
      clientY >= svgRect.top &&
      clientY <= svgRect.bottom
    );
  };
}

export function createFocusCanvasKeyboardShortcutHost(__appScope: ProjectCanvasScope) {
  return (event: ReactPointerEvent<HTMLElement>) => {
  const { canvasFrameRef, canvasInteractionRef, clampPointToCanvas, clientPointInsideRenderedCanvas, contextMarqueeSelectionRef, draggingRef, isCanvasKeyboardBlockingTarget, lastCanvasClientPointerRef, lastCanvasPointerRef, lastKeyboardShortcutClientPointerRef, lastRawCanvasPointerRef, marqueeCurrentRef, modifierSelectionPressRef, panningRef, projectListPointerInsideRef, screenToSvgPoint, svgRef, updateMouseStatus } = __appScope;
    lastKeyboardShortcutClientPointerRef.current = { x: event.clientX, y: event.clientY };
    // 高频平移、拖拽或框选期间由画布 <svg> 自身处理指针，避免冒泡到 .canvas-frame 重复触发 CTM/getBoundingClientRect/focus
    if (
      panningRef?.current ||
      draggingRef?.current ||
      marqueeCurrentRef?.current ||
      contextMarqueeSelectionRef?.current ||
      modifierSelectionPressRef?.current
    ) {
      return;
    }
    if (isCanvasKeyboardBlockingTarget(event.target)) {
      return;
    }
    const svg = svgRef.current;
    if (!svg || !clientPointInsideRenderedCanvas(event.clientX, event.clientY)) {
      return;
    }
    const rawPointer = screenToSvgPoint(svg, event.clientX, event.clientY);
    const pointer = clampPointToCanvas(rawPointer);
    lastRawCanvasPointerRef.current = rawPointer;
    lastCanvasPointerRef.current = pointer;
    lastCanvasClientPointerRef.current = { x: event.clientX, y: event.clientY };
    updateMouseStatus(pointer);
    const frame = canvasFrameRef.current;
    if (frame && (typeof document === "undefined" || document.activeElement !== frame)) {
      frame.focus({ preventScroll: true });
    }
    canvasInteractionRef.current = true;
    projectListPointerInsideRef.current = false;
  };
}

export function createWheelZoomAnchorFromClient(__appScope: ProjectCanvasScope) {
  return (clientX: number, clientY: number): WheelZoomAnchor | null => {
  const { canvasBoundsRef, canvasFrameRef, canvasVisibleViewBoxRef, clampNumber, clampPointToBounds, screenToSvgPoint, svgRef, viewBoxRef } = __appScope;
    const frame = canvasFrameRef.current;
    const svg = svgRef.current;
    if (!frame || !svg) {
      return null;
    }
    const frameRect = sharedElementRectCache.getRect(frame);
    const cursorInsideFrame =
      clientX >= frameRect.left &&
      clientX <= frameRect.right &&
      clientY >= frameRect.top &&
      clientY <= frameRect.bottom;
    if (cursorInsideFrame) {
      return {
        point: clampPointToBounds(screenToSvgPoint(svg, clientX, clientY), canvasBoundsRef.current),
        cursorOffsetX: clampNumber(clientX - frameRect.left, 0, frameRect.width),
        cursorOffsetY: clampNumber(clientY - frameRect.top, 0, frameRect.height)
      };
    }
    const visible = canvasVisibleViewBoxRef.current;
    const current = viewBoxRef.current;
    const fallbackPoint = visible.width > 0 && visible.height > 0
      ? {
          x: visible.x + visible.width / 2,
          y: visible.y + visible.height / 2
        }
      : {
          x: current.x + current.width / 2,
          y: current.y + current.height / 2
        };
    return {
      point: clampPointToBounds(fallbackPoint, canvasBoundsRef.current),
      cursorOffsetX: frameRect.width / 2,
      cursorOffsetY: frameRect.height / 2
    };
  };
}

export function createFlushPendingWheelZoom(__appScope: ProjectCanvasScope) {
  return () => {
  const { canvasBoundsRef, clampViewBoxDimensionsForZoom, normalizeViewBoxToCanvas, pendingWheelZoomAnchorRef, pendingWheelZoomRequestRef, setViewBox, wheelZoomFrameRef } = __appScope;
    if (wheelZoomFrameRef.current !== null && typeof window !== "undefined") {
      window.cancelAnimationFrame(wheelZoomFrameRef.current);
      wheelZoomFrameRef.current = null;
    }
    sharedElementRectCache.invalidate();
    const request = pendingWheelZoomRequestRef.current;
    if (!request) {
      return;
    }
    pendingWheelZoomRequestRef.current = null;
    pendingWheelZoomAnchorRef.current = request.anchor;
    setViewBox((current: CanvasViewBox) => {
      const bounds = canvasBoundsRef.current;
      const { width: nextWidth, height: nextHeight } = clampViewBoxDimensionsForZoom(
        { width: current.width * request.zoomFactor, height: current.height * request.zoomFactor },
        bounds
      );
      const nextScaleX = bounds.width / Math.max(1, nextWidth);
      const nextScaleY = bounds.height / Math.max(1, nextHeight);
      return normalizeViewBoxToCanvas({
        x: request.anchor.point.x - request.anchor.cursorOffsetX / nextScaleX,
        y: request.anchor.point.y - request.anchor.cursorOffsetY / nextScaleY,
        width: nextWidth,
        height: nextHeight
      }, bounds);
    });
  };
}

export function createScheduleWheelZoom(__appScope: ProjectCanvasScope) {
  return (anchor: WheelZoomAnchor, zoomFactor: number) => {
  const { flushPendingWheelZoom, pendingWheelZoomRequestRef, scheduleCanvasVisibleViewBoxUpdate, wheelZoomCommitTimerRef, wheelZoomFrameRef } = __appScope;
    const current = pendingWheelZoomRequestRef.current;
    pendingWheelZoomRequestRef.current = current
      ? { anchor, zoomFactor: current.zoomFactor * zoomFactor }
      : { anchor, zoomFactor };

    // 标记连续滚轮活跃期：期间若新视口仍在当前已渲染区域内，跳过昂贵的 16k SVG 裁剪重渲染，
    // 停手 120ms 后再补一次精确 canvasVisibleViewBox 同步。
    if (wheelZoomCommitTimerRef) {
      if (wheelZoomCommitTimerRef.current !== null) {
        clearTimeout(wheelZoomCommitTimerRef.current);
      }
      wheelZoomCommitTimerRef.current = setTimeout(() => {
        wheelZoomCommitTimerRef.current = null;
        scheduleCanvasVisibleViewBoxUpdate?.();
      }, WHEEL_ZOOM_SETTLE_DELAY_MS);
    }

    if (wheelZoomFrameRef.current !== null) {
      return;
    }
    wheelZoomFrameRef.current = window.requestAnimationFrame(flushPendingWheelZoom);
  };
}

export function createZoomCanvasFromWheelEvent(__appScope: ProjectCanvasScope) {
  return (event: CanvasWheelZoomEvent) => {
  const { scheduleWheelZoom, shouldZoomCanvasFromWheelEvent, wheelZoomAnchorFromClient } = __appScope;
    if (!shouldZoomCanvasFromWheelEvent(event)) {
      return false;
    }
    if (!event.defaultPrevented) {
      event.preventDefault();
    }
    event.stopPropagation();
    const anchor = wheelZoomAnchorFromClient(event.clientX, event.clientY);
    if (!anchor) {
      return true;
    }
    const zoomFactor = event.deltaY > 0 ? 1.12 : 0.88;
    scheduleWheelZoom(anchor, zoomFactor);
    return true;
  };
}

export function createHandleWheel(__appScope: ProjectCanvasScope) {
  return (event: React.WheelEvent<SVGSVGElement>) => {
  const { canvasWheelTargetIsRenderedCanvas, isCanvasWheelZoomExcludedTarget, shouldZoomCanvasFromWheelEvent, zoomCanvasFromWheelEvent } = __appScope;
    if (!shouldZoomCanvasFromWheelEvent(event)) {
      return;
    }
    if (isCanvasWheelZoomExcludedTarget(event.target) || !canvasWheelTargetIsRenderedCanvas(event.target)) {
      return;
    }
    if (event.nativeEvent.defaultPrevented) {
      event.stopPropagation();
      return;
    }
    zoomCanvasFromWheelEvent(event);
  };
}

export function createDeleteSelected(__appScope: ProjectCanvasScope) {
  return () => {
  const { deleteSelection } = __appScope;
    deleteSelection();
  };
}

export function createRunContextMenuAction(__appScope: ProjectCanvasScope) {
  return (action: () => void) => {
  const { setContextMenu, setProjectMenu, setTemplateMenu } = __appScope;
    action();
    setContextMenu(null);
    setProjectMenu(null);
    setTemplateMenu(null);
  };
}

export function createReadjustMovedBusConnectionRoutes(__appScope: ProjectCanvasScope) {
  return (
    nextNodes: ModelNode[],
    candidateEdges: Edge[],
    movedNodeIds: Iterable<string>,
    bounds: CanvasBounds
  ) => {
  const { isBusNode, realignConnectionEdgeBusEndpointPoints, redrawConnectionRoutesForEdges } = __appScope;
    const movedIds = new Set(movedNodeIds);
    if (movedIds.size === 0 || candidateEdges.length === 0) {
      return candidateEdges;
    }
    const nextNodeById = new Map(nextNodes.map((node) => [node.id, node]));
    const busConnectedEdgeIds: string[] = [];
    for (const edge of candidateEdges) {
      if (!(movedIds.has(edge.sourceId) || movedIds.has(edge.targetId))) {
        continue;
      }
      const source = nextNodeById.get(edge.sourceId);
      const target = nextNodeById.get(edge.targetId);
      if (!source || !target || (!isBusNode(source) && !isBusNode(target))) {
        continue;
      }
      busConnectedEdgeIds.push(edge.id);
    }
    if (busConnectedEdgeIds.length === 0) {
      return candidateEdges;
    }
    const redrawnCandidateEdges = redrawConnectionRoutesForEdges(nextNodes, candidateEdges, busConnectedEdgeIds, bounds);
    const busConnectedEdgeIdSet = new Set(busConnectedEdgeIds);
    const realignedCandidateEdges = redrawnCandidateEdges.map((edge: Edge) =>
      busConnectedEdgeIdSet.has(edge.id) ? realignConnectionEdgeBusEndpointPoints(nextNodes, edge) : edge
    );
    return redrawConnectionRoutesForEdges(nextNodes, realignedCandidateEdges, busConnectedEdgeIds, bounds);
  };
}

export function createReadjustActiveLayerBusEndpointRoutes(__appScope: ProjectCanvasScope) {
  return () => {
  const { activeLayerEdges, activeLayerNodes, canvasBounds, edges, equalizeBusConnectionEdgeEndpointPoints, isBusNode, isRoutableLineDeviceKind, markRouteEdgesDirty, markStoredRouteEdgesDirty, nodeById, nodes, patchGraphEdges, patchGraphNodes, pushUndoSnapshot, redrawConnectionRoutesForEdges, redrawRoutableLineDeviceRoutes, routableLineDeviceEndpointRefs, undoScopeForGraphPatch } = __appScope;
    const edgeIds = activeLayerEdges
      .filter((edge: Edge) => {
        const source = nodeById.get(edge.sourceId);
        const target = nodeById.get(edge.targetId);
        return source && target && (isBusNode(source) || isBusNode(target));
      })
      .map((edge: Edge) => edge.id)
      .sort();
    const lineNodeIds = activeLayerNodes
      .filter((node: ModelNode) => {
        if (!isRoutableLineDeviceKind(node.kind)) {
          return false;
        }
        const refs = routableLineDeviceEndpointRefs(node);
        const sourceNode = refs.source ? nodeById.get(refs.source.nodeId) : undefined;
        const targetNode = refs.target ? nodeById.get(refs.target.nodeId) : undefined;
        return Boolean((sourceNode && isBusNode(sourceNode)) || (targetNode && isBusNode(targetNode)));
      })
      .map((node: ModelNode) => node.id)
      .sort();

    if (edgeIds.length === 0 && lineNodeIds.length === 0) {
      return 0;
    }

    const equalizedEdges = equalizeBusConnectionEdgeEndpointPoints
      ? equalizeBusConnectionEdgeEndpointPoints(nodes, edges)
      : edges;
    const nextEdges = edgeIds.length > 0
      ? redrawConnectionRoutesForEdges(nodes, equalizedEdges, edgeIds, canvasBounds)
      : equalizedEdges;
    const changedEdges: Edge[] = [];
    for (let index = 0; index < nextEdges.length; index += 1) {
      if (nextEdges[index] !== edges[index]) {
        changedEdges.push(nextEdges[index]);
      }
    }
    const changedLineNodes = lineNodeIds.length > 0
      ? redrawRoutableLineDeviceRoutes(nodes, lineNodeIds, canvasBounds)
      : [];
    if (changedEdges.length === 0 && changedLineNodes.length === 0) {
      return 0;
    }

    const changedEdgeIds = changedEdges.map((edge: Edge) => edge.id);
    const changedNodeIds = changedLineNodes.map((node: ModelNode) => node.id);
    pushUndoSnapshot(true, false, undoScopeForGraphPatch(changedNodeIds, changedEdgeIds));
    if (changedEdges.length > 0) {
      markRouteEdgesDirty(changedEdgeIds);
      markStoredRouteEdgesDirty(changedEdgeIds);
      patchGraphEdges(changedEdges);
    }
    if (changedLineNodes.length > 0) {
      patchGraphNodes(changedLineNodes);
    }
    return changedEdges.length + changedLineNodes.length;
  };
}

/**
 * 清理「失效的存档折线」:把「按端口重算严格更简单」的线路换成重算几何(清掉 manualPoints,重写 routePoints)。
 * 一次撤销单元,只改边、不动图元 —— 用于自动对齐没移动任何图元、但仍有折线可清的情形
 * (如 `多能流` 里 交流断路器-5 → 交流线路-1 两端共 y 却带一个 9px 凹口,4 个拐点 → 0 个)。
 *
 * **有图元移动时必须由调用方在移动提交之后调用**,并传 `skipUndoSnapshot: true`(复用移动提交的快照):
 * 移动提交内部会 `preserveConnectionEdgeRouteShape` 把存档绕行按新端点重锚,
 * 先改后移等于白改 —— 直线会重新长成 4 拐点的 U 形凹口。
 */
export function createCleanupStaleConnectionRoutes(__appScope: ProjectCanvasScope) {
  return (
    drops?: readonly { edgeId: string; points: readonly Point[] }[],
    options: { skipUndoSnapshot?: boolean } = {}
  ) => {
  const { activeLayerEdges, canvasBounds, editModeRouteRenderOptions, markRouteEdgesDirty, markStoredRouteEdgesDirty, nodes, patchGraphEdges, pushUndoSnapshot, routeEdgesForStoredRendering, undoScopeForGraphPatch } = __appScope;
    const resolvedDrops = drops ?? autoAlignStoredRouteDrops(
      nodes,
      activeLayerEdges,
      new Set(activeLayerEdges.map((edge: Edge) => edge.id)),
      (candidateNodes: readonly ModelNode[], candidateEdges: readonly Edge[]) =>
        routeEdgesForStoredRendering([...candidateNodes], [...candidateEdges], canvasBounds, editModeRouteRenderOptions)
    );
    if (resolvedDrops.length === 0) {
      return 0;
    }
    const edgeById = new Map<string, Edge>(activeLayerEdges.map((edge: Edge) => [edge.id, edge] as [string, Edge]));
    const cleanedEdges: Edge[] = [];
    for (const drop of resolvedDrops) {
      const edge = edgeById.get(drop.edgeId);
      if (!edge) {
        continue;
      }
      cleanedEdges.push({
        ...autoAlignEdgeWithoutStoredRoute(edge),
        routePoints: drop.points.map((point) => ({ ...point }))
      });
    }
    if (cleanedEdges.length === 0) {
      return 0;
    }
    const cleanedEdgeIds = cleanedEdges.map((edge) => edge.id);
    if (!options.skipUndoSnapshot) {
      pushUndoSnapshot(true, false, undoScopeForGraphPatch([], cleanedEdgeIds));
    }
    markRouteEdgesDirty(cleanedEdgeIds);
    markStoredRouteEdgesDirty(cleanedEdgeIds);
    patchGraphEdges(cleanedEdges);
    return cleanedEdges.length;
  };
}

export function createCommitLayoutNodePositions(__appScope: ProjectCanvasScope) {
  return (
    layoutNodeIds: string[],
    arranged: ModelNode[],
    options: {
      preserveCanvasBounds?: boolean;
      readjustBusEndpoints?: boolean;
      /**
       * 本次提交要并入**同一撤销单元**的「失效存档折线」线路 id(见 `autoAlignStoredRouteDrops`)。
       * 只登记 id、不在本函数里改几何:折线清理由调用方在移动提交**之后**用
       * `createCleanupStaleConnectionRoutes(drops, { skipUndoSnapshot: true })` 完成 ——
       * 本函数内部的 `adjustEdgesAfterNodeMove → preserveConnectionEdgeRouteShape` 会「保持连接线形状」,
       * 把存档绕行按新端点重锚,在这里改掉的几何会被它重新长出来(实测:直线被重锚成 4 拐点的 U 形凹口)。
       */
      storedRouteDropIds?: Iterable<string>;
    } = {}
  ) => {
  const { CANVAS_AUTO_EXPAND_PADDING, adjustEdgesAfterNodeMove, applyCanvasBounds, canvasBounds, canvasBoundsForAutoExpandedGraphContent, commitFastMovedGraphPatches, currentStoredRoutePointsForEdge, edgeListForNodeIds, edges, finalizeMovedNodeEdgesFast, isRoutableLineDeviceKind, mergeNodeUpdateLists, nodeById, nodes, orderedNodeFromList, pushUndoSnapshot, readjustMovedBusConnectionRoutes, realignRoutableLineDeviceBusEndpointPoints, redrawRoutableLineDeviceRoutes, rejectAutoCanvasExpansionForContent, routableLineIdsConnectedToNodeIds, snapshotEdgePoints, undoScopeForGraphPatch } = __appScope;
    const uniqueLayoutNodeIds = Array.from(new Set(layoutNodeIds));
    if (uniqueLayoutNodeIds.length === 0) {
      return 0;
    }
    const movedNodeUpdates = uniqueLayoutNodeIds.flatMap((nodeId) => {
      const previous = nodeById.get(nodeId);
      const nextNode = orderedNodeFromList(arranged, nodeId);
      if (!previous || !nextNode) {
        return [];
      }
      return previous.position.x !== nextNode.position.x || previous.position.y !== nextNode.position.y ? [nextNode] : [];
    });
    if (movedNodeUpdates.length === 0) {
      return 0;
    }
    const movedNodeIds = movedNodeUpdates.map((node) => node.id);
    const movedNodeIdSet = new Set(movedNodeIds);
    // 失效存档折线只登记 id:几何改由调用方在移动提交之后做(见 options.storedRouteDropIds 注释)。
    // 仍要把它们并进撤销范围,好让「移动 + 清折线」共用同一次快照(调用方据此跳过自己的快照)。
    const storedRouteDropIds = Array.from(new Set(options.storedRouteDropIds ?? []));
    const affectedEdgesForLayout = edgeListForNodeIds(movedNodeIds);
    const busConnectedLineNodeIds = options.readjustBusEndpoints
      ? routableLineIdsConnectedToNodeIds(movedNodeIds)
      : new Set<string>();
    if (rejectAutoCanvasExpansionForContent(movedNodeUpdates, affectedEdgesForLayout)) {
      return 0;
    }
    // 归属落地:批量布局(对齐/分布/自动对齐/自动散开)会把节点移进容器矩形;判定与容器重算走拖拽同一出口,
    // 容器几何 / 成员归属 / 挤出全在布局集之外,故并入本次提交(单一撤销单元)。
    // 与拖动同口径传 repelNonMembers:布局把设备摆进**已有**容器 → 弹回框外,不写归属。
    const { updates: containerUpdates } = applyDragContainerMembership({
      nodes: arranged,
      movedIds: movedNodeIds,
      altKey: false,
      repelNonMembers: true
    });
    // 有容器时作用域必须让位:容器几何重算与被挤出的非成员都在布局集之外,走 patch 通道会漏进撤销计划(Task 8 同口径)
    pushUndoSnapshot(
      true,
      false,
      hasContainer(nodes)
        ? undefined
        : undoScopeForGraphPatch(
            busConnectedLineNodeIds.size > 0 ? [...movedNodeIds, ...busConnectedLineNodeIds] : movedNodeIds,
            [...affectedEdgesForLayout.map((edge: Edge) => edge.id), ...storedRouteDropIds]
          )
    );
    const layoutCanvasBounds = options.preserveCanvasBounds
      ? canvasBounds
      : canvasBoundsForAutoExpandedGraphContent(
          canvasBounds,
          arranged,
          edges,
          [],
          CANVAS_AUTO_EXPAND_PADDING
        );
    if (!options.preserveCanvasBounds) {
      applyCanvasBounds(layoutCanvasBounds);
    }
    const originalPositions = Object.fromEntries(
      movedNodeIds.flatMap((id) => {
        const node = nodeById.get(id);
        return node ? [[id, node.position]] : [];
      })
    );
    const deltas = Object.fromEntries(
      movedNodeUpdates.map((node) => {
        const previous = nodeById.get(node.id);
        return [
          node.id,
          {
            x: node.position.x - (previous?.position.x ?? node.position.x),
            y: node.position.y - (previous?.position.y ?? node.position.y)
          }
        ];
      })
    );
    const originalEdgePoints = snapshotEdgePoints(affectedEdgesForLayout);
    const originalRoutePoints = Object.fromEntries(
      affectedEdgesForLayout.map((edge: Edge) => [
        edge.id,
        currentStoredRoutePointsForEdge(edge)
      ])
    );
    const adjustedAffectedEdges = affectedEdgesForLayout.length > 0
      ? adjustEdgesAfterNodeMove(
          affectedEdgesForLayout,
          arranged,
          movedNodeIdSet,
          originalEdgePoints,
          deltas,
          originalRoutePoints,
          new Set<string>(),
          layoutCanvasBounds
        )
      : affectedEdgesForLayout;
    const finalizedCandidateEdges = adjustedAffectedEdges.length > 0
      ? finalizeMovedNodeEdgesFast(
          nodes,
          arranged,
          adjustedAffectedEdges,
          movedNodeIds,
          adjustedAffectedEdges
        )
      : adjustedAffectedEdges;
    const committedCandidateEdges = options.readjustBusEndpoints
      ? readjustMovedBusConnectionRoutes(
          arranged,
          finalizedCandidateEdges,
          movedNodeIds,
          layoutCanvasBounds
        )
      : finalizedCandidateEdges;
    // 无容器变更时不走合并,保持 movedNodeUpdates 原引用(被调方虽也短路,但「空 = 原引用」是调用点契约)
    let committedNodeUpdates = containerUpdates.length > 0 ? mergeNodeUpdateLists(movedNodeUpdates, containerUpdates) : movedNodeUpdates;
    let committedArrangedNodes: ModelNode[] = withNodeUpdates(arranged, containerUpdates);
    if (options.readjustBusEndpoints && busConnectedLineNodeIds.size > 0) {
      const initiallyRedrawnLineNodes = redrawRoutableLineDeviceRoutes(
        committedArrangedNodes,
        busConnectedLineNodeIds,
        layoutCanvasBounds
      );
      const initiallyRedrawnLineById = new Map<string, ModelNode>(initiallyRedrawnLineNodes.map((node: ModelNode) => [node.id, node] as [string, ModelNode]));
      const arrangedWithInitialRedrawnLines: ModelNode[] = initiallyRedrawnLineNodes.length > 0
        ? committedArrangedNodes.map((node: ModelNode) => initiallyRedrawnLineById.get(node.id) ?? node)
        : committedArrangedNodes;
      const realignedLineNodes: ModelNode[] = [];
      for (const lineNodeId of busConnectedLineNodeIds) {
        const lineNode = orderedNodeFromList(arrangedWithInitialRedrawnLines, lineNodeId) ?? nodeById.get(lineNodeId);
        if (!lineNode || !isRoutableLineDeviceKind(lineNode.kind)) {
          continue;
        }
        const realignedLineNode = realignRoutableLineDeviceBusEndpointPoints(lineNode, arrangedWithInitialRedrawnLines);
        if (realignedLineNode !== lineNode) {
          realignedLineNodes.push(realignedLineNode);
        }
      }
      const realignedLineNodeById = new Map<string, ModelNode>(realignedLineNodes.map((node: ModelNode) => [node.id, node] as [string, ModelNode]));
      const arrangedWithRealignedLines = realignedLineNodes.length > 0
        ? arrangedWithInitialRedrawnLines.map((node: ModelNode) => (realignedLineNodeById.get(node.id) ?? node) as ModelNode)
        : arrangedWithInitialRedrawnLines;
      const redrawnLineNodes = realignedLineNodes.length > 0
        ? redrawRoutableLineDeviceRoutes(
            arrangedWithRealignedLines,
            busConnectedLineNodeIds,
            layoutCanvasBounds
          )
        : [];
      const lineNodeUpdates = mergeNodeUpdateLists(
        initiallyRedrawnLineNodes,
        mergeNodeUpdateLists(realignedLineNodes, redrawnLineNodes)
      );
      if (lineNodeUpdates.length > 0) {
        const lineNodeUpdateById = new Map<string, ModelNode>(lineNodeUpdates.map((node: ModelNode) => [node.id, node] as [string, ModelNode]));
        committedNodeUpdates = mergeNodeUpdateLists(committedNodeUpdates, lineNodeUpdates);
        committedArrangedNodes = committedArrangedNodes.map((node: ModelNode) =>
          lineNodeUpdateById.get(node.id) ?? node
        );
      }
    }
    commitFastMovedGraphPatches(
      committedNodeUpdates,
      committedArrangedNodes,
      committedCandidateEdges,
      affectedEdgesForLayout,
      movedNodeIds,
      originalRoutePoints,
      new Set<string>(),
      originalPositions,
      nodes,
      layoutCanvasBounds
    );
    return movedNodeUpdates.length;
  };
}

export function createApplySelectedNodeLayout(__appScope: ProjectCanvasScope) {
  return (
    minimumUnitCount: number,
    layoutNodes: (currentNodes: ModelNode[], currentLayoutUnits: CanvasLayoutUnit[]) => ModelNode[]
  ) => {
  const { commitLayoutNodePositions, nodes, selectedLayoutUnits } = __appScope;
    if (selectedLayoutUnits.length < minimumUnitCount) {
      return;
    }
    // 选中集含容器 → 容器与其全部成员合并成一个整组单元参与(相对位置不变,成员不被落下);
    // 仅选中成员(不含其容器)时成员各自成单元,容器随后由 enforce 的 fitContainerToMembers 跟随
    const layoutUnits = mergeContainerLayoutUnits(nodes, selectedLayoutUnits);
    const layoutNodeIds = Array.from(new Set(layoutUnits.flatMap((unit) => unit.nodeIds)));
    if (layoutNodeIds.length === 0) {
      return;
    }
    const arranged = layoutNodes(nodes, layoutUnits);
    commitLayoutNodePositions(layoutNodeIds, arranged);
  };
}

export function buildAutoSpreadMeasurementReflow(options: {
  nodes: ModelNode[];
  projectMeasurements: ProjectMeasurementConfig;
  fixedRects: Array<{ left: number; right: number; top: number; bottom: number }>;
  canvasBounds: CanvasBounds;
  autoSpreadMovableRects: (
    items: Array<{ id: string; rect: { left: number; right: number; top: number; bottom: number } }>,
    fixedRects: Array<{ left: number; right: number; top: number; bottom: number }>,
    options: { padding: number; bounds: CanvasBounds }
  ) => Map<string, { x: number; y: number }>;
  measurementGroupCanvasPosition: (node: ModelNode, group: MeasurementGroup) => Point;
  measurementGroupRenderMetrics: (node: ModelNode, group: MeasurementGroup) => { width: number; height: number } | null;
  measurementGroupsForNode: (measurements: ProjectMeasurementConfig, nodeId: string) => MeasurementGroup[];
  measurementOffsetScaleForNode: (node: ModelNode) => { x: number; y: number };
}) {
  const measurementLayoutItems: Array<{
    id: string;
    nodeId: string;
    rect: { left: number; right: number; top: number; bottom: number };
  }> = [];
  for (const node of options.nodes) {
    for (const group of options.measurementGroupsForNode(options.projectMeasurements, node.id) ?? []) {
      const metrics = options.measurementGroupRenderMetrics(node, group);
      if (!metrics) {
        continue;
      }
      const position = options.measurementGroupCanvasPosition(node, group);
      const width = Number(metrics.width);
      const height = Number(metrics.height);
      if (
        !Number.isFinite(position?.x) ||
        !Number.isFinite(position?.y) ||
        !Number.isFinite(width) ||
        !Number.isFinite(height) ||
        width <= 0 ||
        height <= 0
      ) {
        continue;
      }
      measurementLayoutItems.push({
        id: group.id,
        nodeId: node.id,
        rect: {
          left: position.x - width / 2,
          right: position.x + width / 2,
          top: position.y - height / 2,
          bottom: position.y + height / 2
        }
      });
    }
  }
  const measurementDeltas = measurementLayoutItems.length > 0
    ? options.autoSpreadMovableRects(
        measurementLayoutItems.map((item) => ({ id: item.id, rect: item.rect })),
        options.fixedRects,
        { padding: 4, bounds: options.canvasBounds }
      )
    : new Map<string, { x: number; y: number }>();
  const extraBoundsByNodeId = new Map<string, Array<{ left: number; right: number; top: number; bottom: number }>>();
  for (const item of measurementLayoutItems) {
    const delta = measurementDeltas.get(item.id) ?? { x: 0, y: 0 };
    const boxes = extraBoundsByNodeId.get(item.nodeId) ?? [];
    boxes.push({
      left: item.rect.left + delta.x,
      right: item.rect.right + delta.x,
      top: item.rect.top + delta.y,
      bottom: item.rect.bottom + delta.y
    });
    extraBoundsByNodeId.set(item.nodeId, boxes);
  }
  const nodeById = new Map(options.nodes.map((node) => [node.id, node]));
  let adjustedCount = 0;
  const nextGroups = options.projectMeasurements.groups.map((group) => {
    const delta = measurementDeltas.get(group.id);
    const node = delta ? nodeById.get(group.nodeId) : undefined;
    if (!delta || !node) {
      return group;
    }
    const scale = options.measurementOffsetScaleForNode(node);
    const scaleX = Number.isFinite(scale?.x) && scale.x !== 0 ? scale.x : 1;
    const scaleY = Number.isFinite(scale?.y) && scale.y !== 0 ? scale.y : 1;
    adjustedCount += 1;
    return {
      ...group,
      anchor: "custom",
      offset: {
        x: Math.round((group.offset.x + delta.x / scaleX) * 10) / 10,
        y: Math.round((group.offset.y + delta.y / scaleY) * 10) / 10
      }
    };
  });
  return {
    adjustedCount,
    extraBoundsByNodeId,
    measurementDeltas,
    measurementLayoutItems,
    nextProjectMeasurements: adjustedCount > 0
      ? { version: 1, groups: nextGroups }
      : options.projectMeasurements
  };
}

export function createAutoSpreadCanvasGraphics(__appScope: ProjectCanvasScope) {
  return () => {
  const { activeLayerEdges, activeLayerGroups, activeLayerNodes, autoSpreadMovableRects, autoSpreadNodeLayoutUnits, buildCanvasLayoutUnits, cachedRoutedEdgesRef, calculateNodeVisualBounds, canvasBounds, commitLayoutNodePositions, deferredRoutableLineRouteRepairCancelRef, includeMeasurementGroupBounds, isCanvasNodeMovable, latestGraphStoreRef, measurementGroupCanvasPosition, measurementGroupRenderMetrics, measurementGroupsForNode, measurementOffsetScaleForNode, nodes, projectMeasurements, pushUndoSnapshot, routedEdges, scheduleIdleWork, setProjectMeasurements, writeOperationLog } = __appScope;
    const activeNodeIds = activeLayerNodes.map((node: ModelNode) => node.id);
    if (activeNodeIds.length < 2) {
      emitLayoutOperationFeedback(__appScope, "自动散开需要至少 2 个可操作图元", "error");
      return;
    }
    const measurementReflowToken = Symbol("auto-spread-measurement-reflow");
    if (latestGraphStoreRef && typeof latestGraphStoreRef === "object") {
      latestGraphStoreRef.autoSpreadMeasurementReflowToken = measurementReflowToken;
    }
    const routeAvoidRectsFor = (currentRoutes: Array<{ edgeId: string; points?: Array<{ x: number; y: number }> }>) => {
      const routeByEdgeId = new Map((currentRoutes ?? []).map((route) => [route.edgeId, route]));
      const routeSegmentPadding = 10;
      const routeEndpointTrim = routeSegmentPadding * 1.5;
      return activeLayerEdges.flatMap((edge: { id: string }) => {
        const points = routeByEdgeId.get(edge.id)?.points ?? [];
        if (points.length < 2) {
          return [];
        }
        return points.slice(1).flatMap((point, index) => {
          const previous = points[index];
          const dx = point.x - previous.x;
          const dy = point.y - previous.y;
          const length = Math.hypot(dx, dy);
          if (length <= routeEndpointTrim * 2) {
            return [];
          }
          const trimX = (dx / length) * routeEndpointTrim;
          const trimY = (dy / length) * routeEndpointTrim;
          const start = { x: previous.x + trimX, y: previous.y + trimY };
          const end = { x: point.x - trimX, y: point.y - trimY };
          return {
            left: Math.min(start.x, end.x) - routeSegmentPadding,
            right: Math.max(start.x, end.x) + routeSegmentPadding,
            top: Math.min(start.y, end.y) - routeSegmentPadding,
            bottom: Math.max(start.y, end.y) + routeSegmentPadding
          };
        });
      });
    };
    const avoidRects = routeAvoidRectsFor(routedEdges);
    // 两阶段(用户裁决):阶段 1 每个容器内成员先自散开;阶段 2 容器作为整体(连同成员)参与全层散开。
    // 阶段 1 只挪成员,容器几何由后续 enforce 按成员重算;作用域锁当前图层,别层容器不被动;
    // 后续测量/视觉包围盒改用阶段 1 后的位置。
    const stageOneNodes = arrangeContainerInteriors(
      nodes,
      (currentNodes, memberUnits) =>
        autoSpreadNodeLayoutUnits(currentNodes, memberUnits, { padding: 4, bounds: canvasBounds, avoidRects: [] }),
      activeNodeIds
    );
    const stageOneLayerNodes = withNodeUpdates(activeLayerNodes, stageOneNodes);
    const baseLayoutUnits = buildCanvasLayoutUnits(
      activeLayerGroups,
      stageOneLayerNodes,
      activeNodeIds,
      [],
      activeLayerEdges,
      routedEdges,
      { isTransformableNode: (node: ModelNode) => isCanvasNodeMovable(node.kind) }
    );
    const canAdjustMeasurements =
      typeof autoSpreadMovableRects === "function" &&
      typeof measurementGroupCanvasPosition === "function" &&
      typeof measurementGroupRenderMetrics === "function" &&
      typeof measurementGroupsForNode === "function" &&
      typeof measurementOffsetScaleForNode === "function" &&
      typeof pushUndoSnapshot === "function" &&
      typeof setProjectMeasurements === "function" &&
      Array.isArray(projectMeasurements?.groups);
    const nodeVisualEntries = typeof calculateNodeVisualBounds === "function"
      ? stageOneLayerNodes.map((node) => ({ node, rect: calculateNodeVisualBounds(node) }))
      : [];
    const nodeVisualAvoidRects = nodeVisualEntries.length > 0
      ? nodeVisualEntries.map((entry) => entry.rect)
      : baseLayoutUnits.flatMap((unit: { collisionRects?: Array<{ left: number; right: number; top: number; bottom: number }> }) => unit.collisionRects ?? []);
    const stationaryNodeAvoidRects = nodeVisualEntries
      .filter((entry) => !isCanvasNodeMovable(entry.node.kind))
      .map((entry) => entry.rect);
    const fixedAnnotationAvoidRects = [...nodeVisualAvoidRects, ...avoidRects];
    const measurementReflow = canAdjustMeasurements
      ? buildAutoSpreadMeasurementReflow({
          nodes: stageOneLayerNodes,
          projectMeasurements,
          fixedRects: fixedAnnotationAvoidRects,
          canvasBounds,
          autoSpreadMovableRects,
          measurementGroupCanvasPosition,
          measurementGroupRenderMetrics,
          measurementGroupsForNode,
          measurementOffsetScaleForNode
        })
      : null;
    const measurementDeltas = measurementReflow?.measurementDeltas ?? new Map<string, { x: number; y: number }>();
    const extraBoundsByNodeId = measurementReflow?.extraBoundsByNodeId ?? new Map<string, Array<{ left: number; right: number; top: number; bottom: number }>>();
    if (!measurementReflow) {
      for (const node of stageOneLayerNodes) {
        const boxes: Array<{ left: number; right: number; top: number; bottom: number }> = [];
        includeMeasurementGroupBounds?.(node, (box: { left: number; right: number; top: number; bottom: number }) => boxes.push(box));
        if (boxes.length > 0) {
          extraBoundsByNodeId.set(node.id, boxes);
        }
      }
    }
    const layoutUnits = mergeContainerLayoutUnits(
      stageOneNodes,
      buildCanvasLayoutUnits(
        activeLayerGroups,
        stageOneLayerNodes,
        activeNodeIds,
        [],
        activeLayerEdges,
        routedEdges,
        { isTransformableNode: (node: ModelNode) => isCanvasNodeMovable(node.kind), extraBoundsByNodeId }
      )
    );
    if (layoutUnits.length < 2 && measurementDeltas.size === 0) {
      emitLayoutOperationFeedback(__appScope, "自动散开没有发现可调整的图元", "error");
      return;
    }
    const arranged = layoutUnits.length >= 2
      ? autoSpreadNodeLayoutUnits(stageOneNodes, layoutUnits, {
          padding: 4,
          bounds: canvasBounds,
          // 不可移动图元(母线等)是硬障碍:移完不能压在它们身上。
          avoidRects: stationaryNodeAvoidRects,
          // 路线走廊只能是**软**障碍:线路在设备移动后本来就按新位置重算,
          // 当硬障碍会让设备为了躲开**自己那根线**被推到画布另一头(实测 +1605px)。
          softAvoidRects: avoidRects
        })
      : stageOneNodes;
    const movedCount = layoutUnits.length >= 2
      ? commitLayoutNodePositions(
          Array.from(new Set(layoutUnits.flatMap((unit) => unit.nodeIds))),
          arranged,
          { preserveCanvasBounds: true }
        )
      : 0;
    const adjustedMeasurementCount = measurementReflow?.adjustedCount ?? 0;
    if (measurementReflow && adjustedMeasurementCount > 0) {
      if (movedCount === 0) {
        pushUndoSnapshot();
      }
      setProjectMeasurements(measurementReflow.nextProjectMeasurements);
    }
    const shouldSchedulePostRouteMeasurementReflow =
      movedCount > 0 &&
      canAdjustMeasurements &&
      (measurementReflow?.measurementLayoutItems?.length ?? 0) > 0 &&
      typeof scheduleIdleWork === "function" &&
      latestGraphStoreRef &&
      typeof latestGraphStoreRef === "object";
    if (shouldSchedulePostRouteMeasurementReflow) {
      const schedulePostRouteMeasurementReflow = (delayMs: number, retriesRemaining: number) => {
        scheduleIdleWork(() => {
          if (latestGraphStoreRef.autoSpreadMeasurementReflowToken !== measurementReflowToken) {
            return;
          }
          if (deferredRoutableLineRouteRepairCancelRef?.current && retriesRemaining > 0) {
            schedulePostRouteMeasurementReflow(140, retriesRemaining - 1);
            return;
          }
          const latestStore = latestGraphStoreRef.current;
          if (!latestStore) {
            return;
          }
          const latestNodeById = new Map(latestStore.nodes.map((node: ModelNode) => [node.id, node]));
          const latestActiveNodes = activeNodeIds.flatMap((nodeId: string) => {
            const node = latestNodeById.get(nodeId);
            return node ? [node] : [];
          });
          if (latestActiveNodes.length !== activeNodeIds.length) {
            return;
          }
          const latestRoutes = Array.isArray(cachedRoutedEdgesRef?.current)
            ? cachedRoutedEdgesRef.current
            : routedEdges;
          const latestNodeVisualRects = typeof calculateNodeVisualBounds === "function"
            ? latestActiveNodes.map((node: ModelNode) => calculateNodeVisualBounds(node))
            : [];
          const latestFixedRects = [
            ...latestNodeVisualRects,
            ...routeAvoidRectsFor(latestRoutes)
          ];
          setProjectMeasurements((currentMeasurements: ProjectMeasurementConfig) => {
            if (
              latestGraphStoreRef.autoSpreadMeasurementReflowToken !== measurementReflowToken ||
              !Array.isArray(currentMeasurements?.groups)
            ) {
              return currentMeasurements;
            }
            const latestReflow = buildAutoSpreadMeasurementReflow({
              nodes: latestActiveNodes,
              projectMeasurements: currentMeasurements,
              fixedRects: latestFixedRects,
              canvasBounds,
              autoSpreadMovableRects,
              measurementGroupCanvasPosition,
              measurementGroupRenderMetrics,
              measurementGroupsForNode,
              measurementOffsetScaleForNode
            });
            return latestReflow.adjustedCount > 0
              ? latestReflow.nextProjectMeasurements
              : currentMeasurements;
          });
        }, delayMs, 2000);
      };
      schedulePostRouteMeasurementReflow(240, 4);
    }
    if (movedCount > 0 && adjustedMeasurementCount > 0) {
      emitLayoutOperationFeedback(__appScope, `自动散开 ${movedCount} 个图元，调整 ${adjustedMeasurementCount} 个量测框`);
    } else if (movedCount > 0) {
      emitLayoutOperationFeedback(__appScope, `自动散开 ${movedCount} 个图元`);
    } else if (adjustedMeasurementCount > 0) {
      emitLayoutOperationFeedback(__appScope, `自动散开调整 ${adjustedMeasurementCount} 个量测框`);
    } else {
      emitLayoutOperationFeedback(__appScope, "自动散开未发现重叠图元", "error");
    }
  };
}

/**
 * 自动对齐质量报告的日志后缀(线路质量约束的三种结局 + 无异常)。
 * 抽出来是为了避免在调用处堆四层嵌套三元。
 */
function autoAlignQualitySuffix(report: AutoAlignQualityReport): string {
  if (report.revertedByVerification) {
    return "（未找到线路评分不变差的更规整布局，已保留原图）";
  }
  if (report.frozenUnitCount > 0) {
    return `（为避免线路质量变差，${report.frozenUnitCount} 个图元保持原位）`;
  }
  if (report.degraded) {
    return "（线路校验超出耗时预算，剩余图元保持原位）";
  }
  return "";
}

/**
 * 自动对齐浮动提示的严重程度。判据直接读 `AutoAlignQualityReport` 的**结构化字段**,
 * 不对 `autoAlignQualitySuffix` 的渲染文案做子串匹配(那会随文案改字而静默失效)。
 *
 * 三种「没达到预期」的结局统一按 `error`:
 * - `revertedByVerification`:整次对齐被线路校验否决
 * - `frozenUnitCount > 0`:部分图元为避免线路变差被冻结原位
 * - `degraded`:校验超预算,剩余图元未处理
 *
 * 其余(含无异常)按 `info`。
 */
function autoAlignFeedbackType(report: AutoAlignQualityReport): "error" | "info" {
  if (report.revertedByVerification || report.frozenUnitCount > 0 || report.degraded) {
    return "error";
  }
  return "info";
}

/**
 * 自动对齐的完成文案。**状态栏日志与浮动提示同源**,一份文案两处消费 ——
 * 避免「浮窗说移动了 3 个、状态栏说 4 个」这类双份字符串走样。
 *
 * 优先级:有图元移动 > 只整理了母线落点 > 只整理了折线 > 仅质量后缀 > 本就已就位。
 */
function autoAlignOperationLog(options: {
  movedCount: number;
  readjustedRouteCount: number;
  cleanedRouteCount: number;
  cleanedSegment: string;
  qualitySuffix: string;
}): string {
  const { movedCount, readjustedRouteCount, cleanedRouteCount, cleanedSegment, qualitySuffix } = options;
  if (movedCount > 0) {
    return `自动对齐 ${movedCount} 个图元${cleanedSegment}${qualitySuffix}`;
  }
  if (readjustedRouteCount > 0) {
    return `自动对齐未移动图元，已整理 ${readjustedRouteCount} 条母线连接落点${cleanedSegment}${qualitySuffix}`;
  }
  if (cleanedRouteCount > 0) {
    return `自动对齐未移动图元${cleanedSegment}${qualitySuffix}`;
  }
  if (qualitySuffix) {
    return `自动对齐未移动图元${qualitySuffix}`;
  }
  return "图元已处于拓扑稳定布局";
}

/**
 * 一次「完成/中止」的收口:状态栏日志 + 浮动提示**一起**发出,保证两者永不脱节
 * (历史上自动对齐只写状态栏,用户看不到浮动反馈)。
 *
 * 提示类型默认 `info`(正常完成);「需要至少 N 个图元」「没有发现可调整的图元」「失败」
 * 「放弃本次对齐」等否定结局传 `error`,让图标与颜色区别于成功路径。
 *
 * 取值优先 scope 上的 `showGlobalMessage`(带 `success/error/info` 类型,与 App 内既有
 * toast 同源);不可用时回落 `globalThis.showGlobalMessage?.()` —— 走这条而**不**
 * 顶层 `import` 是因为 `src/globalMessage.ts` 顶层即写 `window`,node 测试环境 import 就炸
 * (`memoryWatch.ts` 同款约束)。类型见 `src/vite-env.d.ts`。两条都不可用时静默降级,只留状态栏日志。
 */
function emitLayoutOperationFeedback(
  __appScope: ProjectCanvasScope,
  message: string,
  type: "success" | "error" | "info" = "info",
  duration = 4000
): void {
  __appScope.writeOperationLog?.(message);
  const scopeShowGlobalMessage = __appScope.showGlobalMessage;
  if (typeof scopeShowGlobalMessage === "function") {
    scopeShowGlobalMessage(message, type, duration);
    return;
  }
  globalThis.showGlobalMessage?.(message);
}

export function createAutoAlignCanvasGraphics(__appScope: ProjectCanvasScope) {
  return async () => {
    const { activeLayerEdges, activeLayerGroups, activeLayerNodes, autoAlignAbortControllerRef, canvasBounds, cleanupStaleConnectionRoutes, commitLayoutNodePositions, editModeRouteRenderOptions, edges, nodes, readjustActiveLayerBusEndpointRoutes, requireEditMode, routedEdges, setAutoAlignProgress } = __appScope;
    if (typeof requireEditMode === "function" && !requireEditMode("自动对齐")) {
      return;
    }
    const activeNodeIds = activeLayerNodes.map((node: ModelNode) => node.id);
    if (activeNodeIds.length < 2) {
      emitLayoutOperationFeedback(__appScope, "自动对齐需要至少 2 个可操作图元", "error");
      return;
    }
    if (autoAlignAbortControllerRef?.current) {
      return;
    }
    const controller = new AbortController();
    if (autoAlignAbortControllerRef) {
      autoAlignAbortControllerRef.current = controller;
    }
    setAutoAlignProgress?.({ percent: 0, stage: "正在准备自动对齐" });
    try {
      const plan = await runAutoAlignPlanInWorker({
        nodes,
        activeLayerNodes,
        activeLayerEdges: activeLayerEdges ?? [],
        activeLayerGroups: activeLayerGroups ?? [],
        edges: edges ?? [],
        routedEdges: routedEdges ?? [],
        canvasBounds,
        editModeRouteRenderOptions: editModeRouteRenderOptions ?? {}
      }, undefined, undefined, {
        signal: controller.signal,
        onProgress: (progress) => setAutoAlignProgress?.(progress)
      });
      if (plan.layoutUnitCount < 2) {
        emitLayoutOperationFeedback(__appScope, "自动对齐没有发现可调整的图元", "error");
        return;
      }
      if (plan.qualityReport.revertedByVerification) {
        const cleanedRouteCount = plan.storedRouteDrops.length > 0
          ? cleanupStaleConnectionRoutes?.(plan.storedRouteDrops) ?? 0
          : 0;
        const cleanedSegment = cleanedRouteCount > 0 ? `，已整理 ${cleanedRouteCount} 条线路折线` : "";
        emitLayoutOperationFeedback(
          __appScope,
          autoAlignOperationLog({ movedCount: 0, readjustedRouteCount: 0, cleanedRouteCount, cleanedSegment, qualitySuffix: autoAlignQualitySuffix(plan.qualityReport) }),
          autoAlignFeedbackType(plan.qualityReport)
        );
        return;
      }
      const movedCount = commitLayoutNodePositions(
        plan.nodeIds,
        plan.arranged,
        { readjustBusEndpoints: true, storedRouteDropIds: plan.storedRouteDrops.map((drop) => drop.edgeId) }
      );
      const cleanedRouteCount = plan.storedRouteDrops.length > 0
        ? cleanupStaleConnectionRoutes?.(plan.storedRouteDrops, { skipUndoSnapshot: movedCount > 0 }) ?? 0
        : 0;
      const readjustedRouteCount = movedCount === 0 ? readjustActiveLayerBusEndpointRoutes() : 0;
      const cleanedSegment = cleanedRouteCount > 0 ? `，已整理 ${cleanedRouteCount} 条线路折线` : "";
      const qualitySuffix = autoAlignQualitySuffix(plan.qualityReport);
      emitLayoutOperationFeedback(
        __appScope,
        autoAlignOperationLog({
          movedCount,
          readjustedRouteCount,
          cleanedRouteCount,
          cleanedSegment,
          qualitySuffix
        }),
        // 严重程度取自**结构化**质量报告,而非在渲染文案里做子串匹配 ——
        // 「已放弃本次对齐」「X 个图元保持原位」「超出耗时预算」都是没达到预期的结局,
        // 提示按 error 走,让用户一眼分辨于正常完成。
        autoAlignFeedbackType(plan.qualityReport)
      );
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        emitLayoutOperationFeedback(__appScope, "自动对齐已终止，图形保持执行前状态", "info");
      } else {
        emitLayoutOperationFeedback(
          __appScope,
          `自动对齐失败：${error instanceof Error ? error.message : String(error)}`,
          "error"
        );
      }
    } finally {
      if (autoAlignAbortControllerRef?.current === controller) {
        autoAlignAbortControllerRef.current = null;
      }
      setAutoAlignProgress?.(null);
    }
  };
}

export function createDefaultVoltageBaseSetValue(__appScope: ProjectCanvasScope) {
  return () => {
  const { activeSelectedNodeIds, nodeById, normalizeVoltageBaseInput } = __appScope;
    for (const nodeId of activeSelectedNodeIds) {
      const node = nodeById.get(nodeId);
      if (!node) {
        continue;
      }
      const candidates = [
        node.terminals[0]?.vbase,
        node.params.vbase,
        node.params.i_vbase,
        node.params.highVbase,
        node.params.sourceVbase,
        node.params.v_set,
        node.params.ac_v_set,
        node.params.dc_v_set,
        node.params.voltage
      ];
      for (const candidate of candidates) {
        const normalized = normalizeVoltageBaseInput(candidate);
        // 跳过 "0" 值，继续检查下一个候选值
        if (normalized && normalized !== "0") {
          return normalized;
        }
      }
    }
    return "110";
  };
}

export function createRecommendedVoltageBaseSetMode(__appScope: ProjectCanvasScope) {
  return (): VoltageBaseSetMode => {
  const { voltageBaseSetHasTerminalTargets, voltageBaseSetHasUniformTargets } = __appScope;
    if (voltageBaseSetHasUniformTargets && voltageBaseSetHasTerminalTargets) {
      return "byDevice";
    }
    if (voltageBaseSetHasTerminalTargets) {
      return "terminal";
    }
    return "uniform";
  };
}

export function createDefaultVoltageBaseTerminalValues(__appScope: ProjectCanvasScope) {
  return () => {
  const { defaultVoltageBaseSetValue, isThreeWindingTransformer, normalizeVoltageBaseInput, voltageBaseSetCandidateNodes, voltageBaseSettingModeForNode } = __appScope;
    const fallback = defaultVoltageBaseSetValue();
    const values: VoltageBaseTerminalValuesByNodeId = {};
    for (const node of voltageBaseSetCandidateNodes) {
      if (voltageBaseSettingModeForNode(node) !== "terminal" || node.terminals.length <= 1) {
        continue;
      }
      values[node.id] = Object.fromEntries(
        node.terminals.map((terminal: ModelNode["terminals"][number], index: number) => {
          // 优先读取端子自身 vbase（排除 "0"）
          const terminalVbase = normalizeVoltageBaseInput(terminal.vbase);
          if (terminalVbase && terminalVbase !== "0") return [terminal.id, terminalVbase];

          // 回退到 params 中的侧电压（i_vbase/j_vbase/k_vbase）
          const isThreeWinding = isThreeWindingTransformer(node);
          let paramVbase;
          if (isThreeWinding) {
            const keys = ["i_vbase", "k_vbase", "j_vbase"];
            paramVbase = normalizeVoltageBaseInput(node.params[keys[index]]);
          } else {
            const keys = ["i_vbase", "j_vbase"];
            paramVbase = normalizeVoltageBaseInput(node.params[keys[index]]);
          }
          if (paramVbase && paramVbase !== "0") return [terminal.id, paramVbase];

          // 再回退到通用 vbase
          const commonVbase = normalizeVoltageBaseInput(node.params.vbase);
          if (commonVbase && commonVbase !== "0") return [terminal.id, commonVbase];

          return [terminal.id, fallback];
        })
      );
    }
    return values;
  };
}

export function createDefaultVoltageBaseTerminalKey(__appScope: ProjectCanvasScope) {
  return () => {
  const { voltageBaseSetCandidateNodes, voltageBaseSettingModeForNode } = __appScope;
    for (const node of voltageBaseSetCandidateNodes) {
      if (voltageBaseSettingModeForNode(node) !== "terminal" || node.terminals.length <= 1) {
        continue;
      }
      const [terminal] = node.terminals;
      if (terminal) {
        return `${node.id}:${terminal.id}`;
      }
    }
    return "";
  };
}

export function createActiveVoltageBaseTerminalValues(__appScope: ProjectCanvasScope) {
  return () => {
  const { activeVoltageBaseTerminalRow } = __appScope;
    if (!activeVoltageBaseTerminalRow) {
      return {};
    }
    const value = activeVoltageBaseTerminalRow.value.trim();
    return value
      ? { [activeVoltageBaseTerminalRow.nodeId]: { [activeVoltageBaseTerminalRow.terminalId]: value } }
      : {};
  };
}

export function createSetVoltageBaseTerminalValue(__appScope: ProjectCanvasScope) {
  return (nodeId: string, terminalId: string, value: string) => {
  const { setVoltageBaseTerminalValues } = __appScope;
    setVoltageBaseTerminalValues((current: VoltageBaseTerminalValuesByNodeId) => ({
      ...current,
      [nodeId]: {
        ...(current[nodeId] ?? {}),
        [terminalId]: value
      }
    }));
  };
}

export function createMergeVoltageBaseSetResults(__appScope: ProjectCanvasScope) {
  return (
    first: VoltageBaseSetResult,
    second: VoltageBaseSetResult
  ): VoltageBaseSetResult => {
    const updatesById = new Map<string, ModelNode>();
    for (const node of first.nodeUpdates) {
      updatesById.set(node.id, node);
    }
    for (const node of second.nodeUpdates) {
      updatesById.set(node.id, node);
    }
    return {
      nodes: second.nodes,
      nodeUpdates: Array.from(updatesById.values()),
      targetNodeIds: Array.from(new Set([...first.targetNodeIds, ...second.targetNodeIds])),
      changedNodeIds: Array.from(new Set([...first.changedNodeIds, ...second.changedNodeIds]))
    };
  };
}

export function createVoltageBaseSetReady(__appScope: ProjectCanvasScope) {
  return () => {
  const { activeVoltageBaseTerminalRow, voltageBaseSetHasTerminalTargets, voltageBaseSetHasUniformTargets, voltageBaseSetMode, voltageBaseSetValue } = __appScope;
    const terminalReadyForActiveRow = activeVoltageBaseTerminalRow ? activeVoltageBaseTerminalRow.value.trim().length > 0 : false;
    if (voltageBaseSetMode === "byDevice") {
      const uniformReady = !voltageBaseSetHasUniformTargets || voltageBaseSetValue.trim().length > 0;
      const terminalReady = !voltageBaseSetHasTerminalTargets || terminalReadyForActiveRow;
      return uniformReady && terminalReady;
    }
    return voltageBaseSetMode === "terminal"
      ? terminalReadyForActiveRow
      : voltageBaseSetValue.trim().length > 0;
  };
}

export function createVoltageBaseSetResultForScope(__appScope: ProjectCanvasScope) {
  return (scope: VoltageBaseSetScope) => {
  const { activeSelectedNodeIds, activeVoltageBaseTerminalValues, edges, emptyVoltageBaseSetResult, hasVoltageBaseTerminalValues, mergeVoltageBaseSetResults, nodes, setVoltageBaseTerminalValuesForScope, setVoltageBaseValuesForScope, voltageBaseSetMode, voltageBaseSetPreviewByScope, voltageBaseSetReady, voltageBaseSetValue } = __appScope;
    if (voltageBaseSetMode === "byDevice") {
      if (!voltageBaseSetReady()) {
        return emptyVoltageBaseSetResult();
      }
      const preview = voltageBaseSetPreviewByScope[scope];
      if (preview) {
        return preview;
      }
      const uniformResult = voltageBaseSetValue.trim().length > 0
        ? setVoltageBaseValuesForScope(nodes, edges, activeSelectedNodeIds, scope, voltageBaseSetValue.trim())
        : emptyVoltageBaseSetResult();
      const selectedTerminalValues = activeVoltageBaseTerminalValues();
      const terminalResult = hasVoltageBaseTerminalValues(selectedTerminalValues)
        ? setVoltageBaseTerminalValuesForScope(uniformResult.nodes, edges, selectedTerminalValues, scope)
        : { ...emptyVoltageBaseSetResult(), nodes: uniformResult.nodes };
      return mergeVoltageBaseSetResults(uniformResult, terminalResult);
    }
    if (voltageBaseSetMode === "terminal") {
      return hasVoltageBaseTerminalValues(activeVoltageBaseTerminalValues())
        ? voltageBaseSetPreviewByScope[scope] ?? setVoltageBaseTerminalValuesForScope(nodes, edges, activeVoltageBaseTerminalValues(), scope)
        : emptyVoltageBaseSetResult();
    }
    return voltageBaseSetValue.trim().length === 0
      ? emptyVoltageBaseSetResult()
      : voltageBaseSetPreviewByScope[scope] ?? setVoltageBaseValuesForScope(nodes, edges, activeSelectedNodeIds, scope, voltageBaseSetValue.trim());
  };
}
