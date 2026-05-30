import { useEffect, useMemo } from "react";
import {
  Background,
  BaseEdge,
  Controls,
  Handle,
  MiniMap,
  Position,
  ReactFlow,
  useEdgesState,
  useNodesState,
  type EdgeProps,
  type NodeProps
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  modelToReactFlowElements,
  type ReactFlowModelNode,
  type ReactFlowSavedPathEdge
} from "./reactFlowAdapter";
import type { Edge, ModelNode } from "./model";

type ReactFlowPreviewProps = {
  nodes: ModelNode[];
  edges: Edge[];
};

function ModelDevicePreviewNode({ data, selected }: NodeProps<ReactFlowModelNode>) {
  return (
    <div className={`react-flow-device-node ${selected ? "selected" : ""}`} title={data.name}>
      <Handle type="target" position={Position.Left} className="react-flow-preview-handle" />
      <Handle type="source" position={Position.Right} className="react-flow-preview-handle" />
      <div className="react-flow-device-node-kind">{data.componentType || data.kind}</div>
      <div className="react-flow-device-node-name">{data.name}</div>
      <div className="react-flow-device-node-meta">{data.kind} · {data.terminalCount}端子</div>
    </div>
  );
}

function SavedPathPreviewEdge({ id, data, selected }: EdgeProps<ReactFlowSavedPathEdge>) {
  const path = data?.path ?? "";
  if (!path) {
    return null;
  }
  return (
    <BaseEdge
      id={id}
      path={path}
      className={`react-flow-saved-path-edge ${selected ? "selected" : ""}`}
    />
  );
}

const nodeTypes = {
  modelDevice: ModelDevicePreviewNode
};

const edgeTypes = {
  savedPath: SavedPathPreviewEdge
};

export default function ReactFlowPreview({ nodes, edges }: ReactFlowPreviewProps) {
  const elements = useMemo(() => modelToReactFlowElements({ nodes, edges }), [nodes, edges]);
  const [flowNodes, setFlowNodes, onNodesChange] = useNodesState(elements.nodes);
  const [flowEdges, setFlowEdges, onEdgesChange] = useEdgesState(elements.edges);

  useEffect(() => {
    setFlowNodes(elements.nodes);
    setFlowEdges(elements.edges);
  }, [elements.edges, elements.nodes, setFlowEdges, setFlowNodes]);

  return (
    <ReactFlow
      nodes={flowNodes}
      edges={flowEdges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      nodesConnectable={false}
      edgesReconnectable={false}
      fitView
      fitViewOptions={{ padding: 0.18 }}
      proOptions={{ hideAttribution: true }}
    >
      <Background />
      <MiniMap pannable zoomable />
      <Controls />
    </ReactFlow>
  );
}
