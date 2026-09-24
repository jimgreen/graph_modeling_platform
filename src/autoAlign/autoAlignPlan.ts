import { withNodeUpdates } from "../acContainer";
import {
  arrangeContainerInteriors,
  autoAlignNodeLayoutUnits,
  autoAlignStoredRouteDrops,
  buildCanvasLayoutUnits,
  createAutoAlignQualityReport,
  mergeContainerLayoutUnits,
  type AutoAlignQualityReport,
  type AutoAlignStoredRouteDrop,
  type CanvasLayoutUnit
} from "../selectionActions";
import { routeEdgesForStoredRendering } from "../model-routing";
import { isCanvasNodeMovable, type CanvasBounds, type Edge, type ModelGroup, type ModelNode, type RoutedEdge } from "../model";

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
  gridSpacing: number;
  editModeRouteRenderOptions: RouteRenderOptions;
};

export type AutoAlignPlanResult = {
  arranged: ModelNode[];
  nodeIds: string[];
  layoutUnitCount: number;
  storedRouteDrops: AutoAlignStoredRouteDrop[];
  qualityReport: AutoAlignQualityReport;
};

type UnitRunResult = {
  nodes: ModelNode[];
  storedRouteDrops: AutoAlignStoredRouteDrop[];
  storedRouteDropsReady: boolean;
};

const cloneNode = (node: ModelNode): ModelNode => ({
  ...node,
  position: { ...node.position }
});

const cloneEdge = (edge: Edge): Edge => ({
  ...edge,
  sourcePoint: edge.sourcePoint ? { ...edge.sourcePoint } : undefined,
  targetPoint: edge.targetPoint ? { ...edge.targetPoint } : undefined,
  manualPoints: edge.manualPoints?.map((point) => ({ ...point })),
  routePoints: edge.routePoints?.map((point) => ({ ...point }))
});

const cloneRoute = (route: RoutedEdge): RoutedEdge => ({
  ...route,
  points: route.points.map((point) => ({ ...point }))
});

const mergeQualityReport = (target: AutoAlignQualityReport, source: AutoAlignQualityReport) => {
  target.verifiedCandidateCount += source.verifiedCandidateCount;
  target.bendRejectedCount += source.bendRejectedCount;
  target.crossingRejectedCount += source.crossingRejectedCount;
  target.frozenUnitCount += source.frozenUnitCount;
  target.degraded = target.degraded || source.degraded;
  target.revertedByVerification = target.revertedByVerification || source.revertedByVerification;
};

export function runAutoAlignPlan(input: AutoAlignPlanInput): AutoAlignPlanResult {
  const nodes = input.nodes.map(cloneNode);
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const edges = input.edges.map(cloneEdge);
  const edgeById = new Map(edges.map((edge) => [edge.id, edge]));
  const activeLayerNodes = input.activeLayerNodes.map((node) => nodeById.get(node.id) ?? cloneNode(node));
  const activeLayerEdges = input.activeLayerEdges.map((edge) => edgeById.get(edge.id) ?? cloneEdge(edge));
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
  const runUnits = (currentNodes: ModelNode[], unitList: CanvasLayoutUnit[]): UnitRunResult => {
    const callReport = createAutoAlignQualityReport();
    const storedRouteDrops: AutoAlignStoredRouteDrop[] = [];
    const quality = {
      edges,
      routedEdges,
      verifyRouteEdges: routeWithCanvasParams,
      report: callReport,
      storedRouteDrops,
      storedRouteDropsReady: false
    };
    const result = autoAlignNodeLayoutUnits(currentNodes, unitList, input.gridSpacing, quality);
    mergeQualityReport(qualityReport, callReport);
    return {
      nodes: result,
      storedRouteDrops,
      storedRouteDropsReady: quality.storedRouteDropsReady
    };
  };

  const activeNodeIds = activeLayerNodes.map((node) => node.id);
  const stageOneNodes = arrangeContainerInteriors(
    nodes,
    (currentNodes, memberUnits) => runUnits(currentNodes, memberUnits).nodes,
    activeNodeIds
  );
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
    return {
      arranged: stageOneNodes,
      nodeIds: [],
      layoutUnitCount: layoutUnits.length,
      storedRouteDrops: [],
      qualityReport
    };
  }

  const finalRun = runUnits(stageOneNodes, layoutUnits);
  const allEdgeIds = new Set(edges.map((edge) => edge.id));
  const storedRouteDrops = finalRun.storedRouteDropsReady
    ? finalRun.storedRouteDrops
    : autoAlignStoredRouteDrops(finalRun.nodes, edges, allEdgeIds, routeWithCanvasParams);
  return {
    arranged: finalRun.nodes,
    nodeIds: [...new Set(layoutUnits.flatMap((unit) => unit.nodeIds))],
    layoutUnitCount: layoutUnits.length,
    storedRouteDrops,
    qualityReport
  };
}
