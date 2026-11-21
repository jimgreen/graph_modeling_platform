import { withNodeUpdates } from "../acContainer";
import {
  arrangeContainerInteriors,
  compareAutoAlignLayoutRegularity,
  compareAutoAlignRouteQuality,
  autoAlignEdgeWithoutStoredRoute,
  autoAlignStoredRouteDrops,
  buildCanvasLayoutUnits,
  countAutoAlignRouteBends,
  countAutoAlignRouteLength,
  countAutoAlignRouteCrossings,
  createAutoAlignQualityReport,
  localAutoAlignNodeLayoutCandidates,
  mergeContainerLayoutUnits,
  scoreAutoAlignLayoutRegularity,
  topologyAutoAlignNodeLayoutCandidates,
  topologyAutoAlignNodeLayoutUnits,
  type AutoAlignQualityReport,
  type AutoAlignRouteQuality,
  type AutoAlignStoredRouteDrop
} from "../selectionActions";
import { routeEdgesForStoredRendering } from "../model-routing";
import { cloneEdgeEditablePoints, isCanvasNodeMovable, type CanvasBounds, type Edge, type ModelGroup, type ModelNode, type RoutedEdge } from "../model";

type RouteRenderOptions = {
  preserveManualRouteDisplay?: boolean;
};

export type AutoAlignPlanInput = {
  nodes: ModelNode[];
  activeLayerNodes: ModelNode[];
  activeLayerEdges: Edge[];
  activeLayerGroups: ModelGroup[];
  edges: Edge[];
  routedEdges: RoutedEdge[];
  canvasBounds: CanvasBounds;
  editModeRouteRenderOptions: RouteRenderOptions;
};

export type AutoAlignPlanResult = {
  arranged: ModelNode[];
  nodeIds: string[];
  layoutUnitCount: number;
  storedRouteDrops: AutoAlignStoredRouteDrop[];
  qualityReport: AutoAlignQualityReport;
};

export type AutoAlignProgress = { percent: number; stage: string };
export type AutoAlignPlanOptions = {
  onProgress?: (progress: AutoAlignProgress) => void;
  signal?: AbortSignal;
};

function throwIfAutoAlignAborted(signal?: AbortSignal): void {
  if (!signal?.aborted) return;
  const error = new Error("自动对齐已终止");
  error.name = "AbortError";
  throw error;
}

const cloneNode = (node: ModelNode): ModelNode => ({
  ...node,
  position: { ...node.position }
});

const cloneEdge = (edge: Edge): Edge => ({
  ...edge,
  ...cloneEdgeEditablePoints(edge),
  routePoints: edge.routePoints?.map((point) => ({ ...point }))
});

const cloneRoute = (route: RoutedEdge): RoutedEdge => ({
  ...route,
  points: route.points.map((point) => ({ ...point }))
});

export function runAutoAlignPlan(input: AutoAlignPlanInput, options: AutoAlignPlanOptions = {}): AutoAlignPlanResult {
  const reportProgress = (percent: number, stage: string) => {
    throwIfAutoAlignAborted(options.signal);
    options.onProgress?.({ percent, stage });
  };
  reportProgress(5, "正在分析拓扑关系");
  const nodes = input.nodes.map(cloneNode);
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const edges = input.edges.map(cloneEdge);
  const edgeById = new Map(edges.map((edge) => [edge.id, edge]));
  const activeLayerNodes = input.activeLayerNodes.map((node) => nodeById.get(node.id) ?? cloneNode(node));
  const activeLayerEdges = input.activeLayerEdges
    .map((edge) => edgeById.get(edge.id) ?? cloneEdge(edge))
    .sort((left, right) => left.id.localeCompare(right.id));
  const activeLayerGroups = input.activeLayerGroups.map((group) => ({
    ...group,
    nodeIds: [...group.nodeIds],
    edgeIds: [...group.edgeIds],
    childGroupIds: group.childGroupIds ? [...group.childGroupIds] : undefined
  }));
  const routedEdges = input.routedEdges.map(cloneRoute);
  const canvasBounds = { ...input.canvasBounds };
  const routeRenderOptions = { ...input.editModeRouteRenderOptions };
  const routeWithCanvasParams = (candidateNodes: readonly ModelNode[], candidateEdges: readonly Edge[]) =>
    routeEdgesForStoredRendering(
      [...candidateNodes],
      [...candidateEdges],
      canvasBounds,
      routeRenderOptions
    );
  const qualityReport = createAutoAlignQualityReport();

  const activeNodeIds = activeLayerNodes.map((node) => node.id);
  const stageOneNodes = arrangeContainerInteriors(
    nodes,
    (currentNodes, memberUnits) => topologyAutoAlignNodeLayoutUnits(currentNodes, memberUnits, activeLayerEdges, {
      origin: {
        x: Math.min(...memberUnits.map((unit) => unit.bounds.left)),
        y: Math.min(...memberUnits.map((unit) => unit.bounds.top))
      }
    }),
    activeNodeIds
  );
  reportProgress(25, "正在整理容器内部设备");
  const stageOneLayerNodes = withNodeUpdates(activeLayerNodes, stageOneNodes);
  const layoutUnits = mergeContainerLayoutUnits(
    stageOneNodes,
    buildCanvasLayoutUnits(
      activeLayerGroups,
      stageOneLayerNodes,
      activeNodeIds,
      [],
      activeLayerEdges,
      routedEdges,
      { isTransformableNode: (node) => isCanvasNodeMovable(node.kind) }
    )
  );
  if (layoutUnits.length < 2) {
    reportProgress(100, "自动对齐完成");
    return {
      arranged: stageOneNodes,
      nodeIds: [],
      layoutUnitCount: layoutUnits.length,
      storedRouteDrops: [],
      qualityReport
    };
  }

  reportProgress(60, "正在检查线路变化");
  const rerouteEdges = activeLayerEdges.map(autoAlignEdgeWithoutStoredRoute);
  const beforeRoutes = routeWithCanvasParams(nodes, rerouteEdges);
  const routeQuality = (routes: readonly RoutedEdge[]): AutoAlignRouteQuality => ({
    bends: routes.reduce((sum, route) => sum + countAutoAlignRouteBends(route.points), 0),
    crossings: countAutoAlignRouteCrossings(routes.map((route) => route.points)),
    length: routes.reduce((sum, route) => sum + countAutoAlignRouteLength(route.points), 0)
  });
  const beforeQuality = routeQuality(beforeRoutes);
  const originalLayoutUnits = mergeContainerLayoutUnits(
    nodes,
    buildCanvasLayoutUnits(
      activeLayerGroups,
      activeLayerNodes,
      activeNodeIds,
      [],
      activeLayerEdges,
      routedEdges,
      { isTransformableNode: (node) => isCanvasNodeMovable(node.kind) }
    )
  );
  const layoutUnitsFor = (candidateNodes: readonly ModelNode[], candidateRoutes: readonly RoutedEdge[]) => {
    const candidateById = new Map(candidateNodes.map((node) => [node.id, node]));
    const candidateLayerNodes = activeLayerNodes.map((node) => candidateById.get(node.id) ?? node);
    return mergeContainerLayoutUnits(
      [...candidateNodes],
      buildCanvasLayoutUnits(
        activeLayerGroups,
        candidateLayerNodes,
        activeNodeIds,
        [],
        activeLayerEdges,
        candidateRoutes,
        { isTransformableNode: (node) => isCanvasNodeMovable(node.kind) }
      )
    );
  };
  const regularityFor = (candidateNodes: readonly ModelNode[], candidateRoutes: readonly RoutedEdge[]) => {
    const candidateUnits = layoutUnitsFor(candidateNodes, candidateRoutes);
    return scoreAutoAlignLayoutRegularity(candidateUnits, candidateRoutes.map((route) => route.points));
  };
  const currentRegularity = regularityFor(nodes, beforeRoutes);
  const localCandidateLimit = activeLayerNodes.length <= 32 && activeLayerEdges.length <= 64 ? 4 : activeLayerNodes.length <= 128 ? 2 : 1;
  const localCandidatesFor = (
    candidateNodes: ModelNode[],
    candidateRoutes: RoutedEdge[],
    baselineRegularity: ReturnType<typeof scoreAutoAlignLayoutRegularity>
  ) => {
    const units = layoutUnitsFor(candidateNodes, candidateRoutes);
    return localAutoAlignNodeLayoutCandidates(candidateNodes, units)
      .map((candidate) => ({ candidate, geometry: regularityFor(candidate.nodes, candidateRoutes) }))
      .filter(({ geometry }) => geometry.overlapCount <= baselineRegularity.overlapCount)
      .sort((left, right) => compareAutoAlignLayoutRegularity(left.geometry, right.geometry) ||
        (left.candidate.key < right.candidate.key ? -1 : left.candidate.key > right.candidate.key ? 1 : 0))
      .slice(0, localCandidateLimit)
      .map(({ candidate }) => candidate);
  };
  const localCandidates = localCandidatesFor(nodes, beforeRoutes, currentRegularity);
  const topologyCandidates = topologyAutoAlignNodeLayoutCandidates(stageOneNodes, layoutUnits, activeLayerEdges);
  const layoutCandidates = [...localCandidates, ...topologyCandidates];
  const movementDistance = (candidateNodes: readonly ModelNode[]) => {
    const candidateById = new Map(candidateNodes.map((node) => [node.id, node]));
    return activeLayerNodes.reduce((total, node) => {
      const candidate = candidateById.get(node.id);
      return total + (candidate ? Math.abs(candidate.position.x - node.position.x) + Math.abs(candidate.position.y - node.position.y) : 0);
    }, 0);
  };
  const scoredCandidates: Array<{
    key: string;
    nodes: ModelNode[];
    routes: RoutedEdge[];
    quality: AutoAlignRouteQuality;
    regularity: ReturnType<typeof scoreAutoAlignLayoutRegularity>;
    movement: number;
    isOriginal: boolean;
  }> = [{
    key: "current-layout",
    nodes,
    routes: beforeRoutes,
    quality: beforeQuality,
    regularity: currentRegularity,
    movement: 0,
    isOriginal: true
  }];
  let hasWorseRouteCandidate = false;
  reportProgress(70, "正在生成拓扑布局候选");
  for (let index = 0; index < layoutCandidates.length; index += 1) {
    throwIfAutoAlignAborted(options.signal);
    const candidate = layoutCandidates[index];
    const candidateRoutes = routeWithCanvasParams(candidate.nodes, rerouteEdges);
    const candidateQuality = routeQuality(candidateRoutes);
    const qualityComparison = compareAutoAlignRouteQuality(candidateQuality, beforeQuality);
    if (qualityComparison > 0) {
      hasWorseRouteCandidate = true;
      if (candidateQuality.crossings > beforeQuality.crossings) qualityReport.crossingRejectedCount += 1;
      else qualityReport.bendRejectedCount += 1;
      reportProgress(70 + Math.round(19 * (index + 1) / layoutCandidates.length), `正在筛选布局候选 ${index + 1}/${layoutCandidates.length}`);
      continue;
    }
    const regularity = regularityFor(candidate.nodes, candidateRoutes);
    if (regularity.overlapCount > currentRegularity.overlapCount) {
      reportProgress(70 + Math.round(19 * (index + 1) / layoutCandidates.length), `正在筛选布局候选 ${index + 1}/${layoutCandidates.length}`);
      continue;
    }
    qualityReport.verifiedCandidateCount += 1;
    scoredCandidates.push({
      key: candidate.key,
      nodes: candidate.nodes,
      routes: candidateRoutes,
      quality: candidateQuality,
      regularity,
      movement: movementDistance(candidate.nodes),
      isOriginal: false
    });
    reportProgress(70 + Math.round(19 * (index + 1) / layoutCandidates.length), `正在筛选布局候选 ${index + 1}/${layoutCandidates.length}`);
  }
  reportProgress(90, "正在确定最规整的合格布局");
  let selected = scoredCandidates.sort((left, right) =>
    compareAutoAlignRouteQuality(left.quality, right.quality) ||
    compareAutoAlignLayoutRegularity(left.regularity, right.regularity) ||
    left.movement - right.movement ||
    (left.key < right.key ? -1 : left.key > right.key ? 1 : 0)
  )[0];
  const positionSignature = (candidateNodes: readonly ModelNode[]) => [...candidateNodes]
    .sort((left, right) => left.id.localeCompare(right.id))
    .map((node) => `${node.id}:${node.position.x},${node.position.y}`)
    .join("|");
  const seenLocalLayouts = new Set([positionSignature(selected.nodes)]);
  const evaluatedLayouts = new Set([positionSignature(nodes), ...layoutCandidates.map((candidate) => positionSignature(candidate.nodes))]);
  for (let localPass = 0; ; localPass += 1) {
    throwIfAutoAlignAborted(options.signal);
    const variants = localCandidatesFor(selected.nodes, selected.routes, selected.regularity);
    let bestLocal: typeof selected | undefined;
    for (const candidate of variants) {
      const signature = positionSignature(candidate.nodes);
      if (seenLocalLayouts.has(signature) || evaluatedLayouts.has(signature)) continue;
      evaluatedLayouts.add(signature);
      const candidateRoutes = routeWithCanvasParams(candidate.nodes, rerouteEdges);
      const candidateQuality = routeQuality(candidateRoutes);
      const routeComparison = compareAutoAlignRouteQuality(candidateQuality, selected.quality);
      if (compareAutoAlignRouteQuality(candidateQuality, beforeQuality) > 0) {
        hasWorseRouteCandidate = true;
      }
      if (routeComparison > 0) continue;
      const regularity = regularityFor(candidate.nodes, candidateRoutes);
      if (regularity.overlapCount > selected.regularity.overlapCount) continue;
      qualityReport.verifiedCandidateCount += 1;
      const regularityComparison = compareAutoAlignLayoutRegularity(regularity, selected.regularity);
      if (routeComparison === 0 && regularityComparison >= 0) continue;
      const candidateScore = {
        key: `${candidate.key}:local-${localPass}`,
        nodes: candidate.nodes,
        routes: candidateRoutes,
        quality: candidateQuality,
        regularity,
        movement: movementDistance(candidate.nodes),
        isOriginal: false
      };
      if (!bestLocal || compareAutoAlignRouteQuality(candidateScore.quality, bestLocal.quality) < 0 ||
        (compareAutoAlignRouteQuality(candidateScore.quality, bestLocal.quality) === 0 &&
          (compareAutoAlignLayoutRegularity(candidateScore.regularity, bestLocal.regularity) < 0 ||
            (compareAutoAlignLayoutRegularity(candidateScore.regularity, bestLocal.regularity) === 0 && candidateScore.key < bestLocal.key)))) {
        bestLocal = candidateScore;
      }
    }
    if (!bestLocal) break;
    selected = bestLocal;
    seenLocalLayouts.add(positionSignature(selected.nodes));
    reportProgress(Math.min(99, 90 + localPass + 1), "正在收敛局部对齐");
  }
  const currentSignature = positionSignature(nodes);
  const currentLayoutIsCanonical = layoutCandidates.some((candidate) => positionSignature(candidate.nodes) === currentSignature);
  qualityReport.revertedByVerification = selected.isOriginal && hasWorseRouteCandidate && !currentLayoutIsCanonical;
  const nodeIds = qualityReport.revertedByVerification
    ? []
    : [...new Set(layoutUnits.flatMap((unit) => unit.nodeIds))];
  const allEdgeIds = new Set(edges.map((edge) => edge.id));
  const storedRouteDrops = autoAlignStoredRouteDrops(selected.nodes, edges, allEdgeIds, routeWithCanvasParams);
  reportProgress(100, "自动对齐完成");
  return {
    arranged: selected.nodes,
    nodeIds,
    layoutUnitCount: layoutUnits.length,
    storedRouteDrops,
    qualityReport
  };
}
