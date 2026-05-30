import type { Edge as ReactFlowEdge, Node as ReactFlowNode } from "@xyflow/react";
import {
  getEdgeEndpointPoint,
  getNodeScaleX,
  getNodeScaleY,
  inferESection,
  type Edge,
  type ModelNode,
  type Point
} from "./model";

export type ReactFlowModelNodeData = {
  modelNode: ModelNode;
  kind: string;
  name: string;
  componentType: string;
  terminalCount: number;
};

export type ReactFlowSavedPathEdgeData = {
  modelEdge: Edge;
  points: Point[];
  path: string;
};

export type ReactFlowModelNode = ReactFlowNode<ReactFlowModelNodeData, "modelDevice">;
export type ReactFlowSavedPathEdge = ReactFlowEdge<ReactFlowSavedPathEdgeData, "savedPath">;

export type ReactFlowModelElements = {
  nodes: ReactFlowModelNode[];
  edges: ReactFlowSavedPathEdge[];
};

function clonePoint(point: Point): Point {
  return { x: point.x, y: point.y };
}

function savedRoutePoints(edge: Edge, source: ModelNode, target: ModelNode): Point[] {
  const start = getEdgeEndpointPoint(source, edge.sourcePoint, edge.sourceTerminalId);
  const end = getEdgeEndpointPoint(target, edge.targetPoint, edge.targetTerminalId);
  return [
    clonePoint(start),
    ...(edge.manualPoints ?? []).map(clonePoint),
    clonePoint(end)
  ];
}

function savedPath(points: readonly Point[]): string {
  return points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");
}

export function modelNodeToReactFlowNode(node: ModelNode): ReactFlowModelNode {
  const width = node.size.width * getNodeScaleX(node);
  const height = node.size.height * getNodeScaleY(node);
  return {
    id: node.id,
    type: "modelDevice",
    position: {
      x: node.position.x - width / 2,
      y: node.position.y - height / 2
    },
    width,
    height,
    draggable: true,
    selectable: true,
    data: {
      modelNode: node,
      kind: node.kind,
      name: node.name,
      componentType: inferESection(node.kind, node.params),
      terminalCount: node.terminals.length
    }
  };
}

export function modelEdgeToReactFlowEdge(edge: Edge, nodeById: ReadonlyMap<string, ModelNode>): ReactFlowSavedPathEdge | null {
  const source = nodeById.get(edge.sourceId);
  const target = nodeById.get(edge.targetId);
  if (!source || !target) {
    return null;
  }
  const points = savedRoutePoints(edge, source, target);
  return {
    id: edge.id,
    source: edge.sourceId,
    target: edge.targetId,
    type: "savedPath",
    selectable: true,
    data: {
      modelEdge: edge,
      points,
      path: savedPath(points)
    }
  };
}

export function modelToReactFlowElements(model: { nodes: readonly ModelNode[]; edges: readonly Edge[] }): ReactFlowModelElements {
  const nodeById = new Map(model.nodes.map((node) => [node.id, node]));
  return {
    nodes: model.nodes.map(modelNodeToReactFlowNode),
    edges: model.edges
      .map((edge) => modelEdgeToReactFlowEdge(edge, nodeById))
      .filter((edge): edge is ReactFlowSavedPathEdge => Boolean(edge))
  };
}
