import { useEffect, useMemo, useState } from "react";
import {
  Background,
  BackgroundVariant,
  BaseEdge,
  ControlButton,
  Controls,
  EdgeLabelRenderer,
  EdgeToolbar,
  Handle,
  MiniMap,
  NodeResizer,
  NodeToolbar,
  Panel,
  Position,
  ReactFlow,
  useEdgesState,
  useNodesState,
  type EdgeProps,
  type NodeProps
} from "@xyflow/react";
import { CircleDot, Copy, Maximize2, Route, Sparkles, Trash2 } from "lucide-react";
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

function pathMidpoint(points: readonly { x: number; y: number }[]) {
  if (points.length === 0) {
    return { x: 0, y: 0 };
  }
  if (points.length === 1) {
    return points[0]!;
  }
  const segmentLengths = points.slice(0, -1).map((from, index) => {
    const to = points[index + 1]!;
    return Math.hypot(to.x - from.x, to.y - from.y);
  });
  const totalLength = segmentLengths.reduce((sum, length) => sum + length, 0);
  let cursor = 0;
  const halfLength = totalLength / 2;
  for (let index = 0; index < segmentLengths.length; index += 1) {
    const length = segmentLengths[index]!;
    if (cursor + length >= halfLength) {
      const from = points[index]!;
      const to = points[index + 1]!;
      const ratio = length === 0 ? 0 : (halfLength - cursor) / length;
      return {
        x: from.x + (to.x - from.x) * ratio,
        y: from.y + (to.y - from.y) * ratio
      };
    }
    cursor += length;
  }
  return points[points.length - 1]!;
}

function ModelDevicePreviewNode({ data, selected }: NodeProps<ReactFlowModelNode>) {
  return (
    <>
      <NodeToolbar className="react-flow-node-toolbar" isVisible={selected} position={Position.Top} offset={8}>
        <button type="button" title="复制">
          <Copy size={12} />
        </button>
        <button type="button" title="删除">
          <Trash2 size={12} />
        </button>
        <button type="button" title="适配">
          <Maximize2 size={12} />
        </button>
      </NodeToolbar>
      <NodeResizer
        isVisible={selected}
        minWidth={64}
        minHeight={42}
        lineClassName="react-flow-node-resizer-line"
        handleClassName="react-flow-node-resizer-handle"
      />
      <div className={`react-flow-device-node ${selected ? "selected" : ""}`} title={data.name}>
        <Handle type="target" position={Position.Left} className="react-flow-preview-handle" />
        <Handle type="source" position={Position.Right} className="react-flow-preview-handle" />
        <div className="react-flow-device-node-kind">{data.componentLibrary || data.kind}</div>
        <div className="react-flow-device-node-name">{data.name}</div>
        <div className="react-flow-device-node-meta">{data.kind} · {data.terminalCount}端子</div>
      </div>
    </>
  );
}

function SavedPathPreviewEdge({ id, data, selected, animated }: EdgeProps<ReactFlowSavedPathEdge>) {
  const path = data?.path ?? "";
  if (!path) {
    return null;
  }
  const midpoint = pathMidpoint(data?.points ?? []);
  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        className={`react-flow-saved-path-edge ${selected ? "selected" : ""} ${animated ? "animated" : ""}`}
      />
      <EdgeToolbar
        edgeId={id}
        x={midpoint.x}
        y={midpoint.y}
        isVisible={selected}
        className="react-flow-edge-toolbar"
      >
        <button type="button" title="添加拐点">
          <CircleDot size={12} />
        </button>
        <button type="button" title="整理连接线">
          <Route size={12} />
        </button>
      </EdgeToolbar>
      <EdgeLabelRenderer>
        <div
          className={`react-flow-edge-label ${selected ? "selected" : ""}`}
          style={{
            transform: `translate(-50%, -50%) translate(${midpoint.x}px, ${midpoint.y}px)`
          }}
        >
          保存路径
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

const nodeTypes = {
  modelDevice: ModelDevicePreviewNode
};

const edgeTypes = {
  savedPath: SavedPathPreviewEdge
};

export default function ReactFlowPreview({ nodes, edges }: ReactFlowPreviewProps) {
  const [animatedEdges, setAnimatedEdges] = useState(true);
  const elements = useMemo(() => modelToReactFlowElements({ nodes, edges }), [nodes, edges]);
  const [flowNodes, setFlowNodes, onNodesChange] = useNodesState(elements.nodes);
  const [flowEdges, setFlowEdges, onEdgesChange] = useEdgesState(elements.edges);

  useEffect(() => {
    setFlowNodes(elements.nodes);
    setFlowEdges(elements.edges.map((edge) => ({ ...edge, animated: animatedEdges })));
  }, [animatedEdges, elements.edges, elements.nodes, setFlowEdges, setFlowNodes]);

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
      <Panel position="top-left" className="react-flow-preview-panel">
        <strong>已加载交互控件</strong>
        <span>Toolbar / Resizer / Edge Label / Panel / Animated Edge</span>
      </Panel>
      <Background variant={BackgroundVariant.Dots} gap={18} size={1.4} />
      <MiniMap pannable zoomable />
      <Controls>
        <ControlButton
          title={animatedEdges ? "关闭连线动画" : "开启连线动画"}
          aria-label={animatedEdges ? "关闭连线动画" : "开启连线动画"}
          onClick={() => setAnimatedEdges((current) => !current)}
        >
          <Sparkles size={14} />
        </ControlButton>
      </Controls>
    </ReactFlow>
  );
}
