import { ChangeEvent, DragEvent, PointerEvent, useMemo, useRef, useState } from "react";
import {
  Cable,
  Download,
  FileInput,
  FileJson,
  Grid2X2,
  MousePointer2,
  Save,
  Trash2
} from "lucide-react";
import {
  buildTopology,
  canConnectTerminals,
  createTerminals,
  createDefaultNode,
  deserializeProject,
  DEVICE_LIBRARY,
  type DeviceKind,
  type Edge,
  type ModelNode,
  type Point,
  routeOrthogonalEdge,
  serializeProject
} from "./model";

type ToolMode = "select" | "connect";

const CANVAS_WIDTH = 1800;
const CANVAS_HEIGHT = 1200;
const SAMPLE_NODES: ModelNode[] = [
  createDefaultNode("ac-source", { x: 190, y: 210 }),
  createDefaultNode("ac-switch", { x: 360, y: 210 }),
  createDefaultNode("ac-bus", { x: 540, y: 210 }),
  createDefaultNode("ac-transformer", { x: 760, y: 210 }),
  createDefaultNode("dc-bus", { x: 1010, y: 210 }),
  createDefaultNode("dc-load", { x: 1210, y: 210 })
].map((node, index) => ({
  ...node,
  id: `seed-${index + 1}`,
  name: ["交流电源A", "进线开关", "10kV母线", "交流主变", "750V直流母线", "直流负荷"][index]
}));

const SAMPLE_EDGES: Edge[] = [
  { id: "seed-e1", sourceId: "seed-1", targetId: "seed-2" },
  { id: "seed-e2", sourceId: "seed-2", targetId: "seed-3" },
  { id: "seed-e3", sourceId: "seed-3", targetId: "seed-4" },
  { id: "seed-e4", sourceId: "seed-4", targetId: "seed-5" },
  { id: "seed-e5", sourceId: "seed-5", targetId: "seed-6" }
];

const groupedLibrary = DEVICE_LIBRARY.reduce<Record<string, typeof DEVICE_LIBRARY>>((groups, item) => {
  groups[item.group] = groups[item.group] ? [...groups[item.group], item] : [item];
  return groups;
}, {});

function screenToSvgPoint(svg: SVGSVGElement, clientX: number, clientY: number): Point {
  const point = svg.createSVGPoint();
  point.x = clientX;
  point.y = clientY;
  const matrix = svg.getScreenCTM();
  if (!matrix) {
    return { x: clientX, y: clientY };
  }
  const transformed = point.matrixTransform(matrix.inverse());
  return { x: Math.round(transformed.x), y: Math.round(transformed.y) };
}

function pointsToPath(points: Point[]) {
  return points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
}

function downloadText(filename: string, text: string, mime: string) {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function DeviceGlyph({ node, miniature = false }: { node: ModelNode; miniature?: boolean }) {
  const w = miniature ? 58 : node.size.width;
  const h = miniature ? 38 : node.size.height;
  const stroke = node.kind.startsWith("dc") || node.kind.includes("dcdc") ? "#0f766e" : "#2563eb";
  const fill = node.kind.includes("converter") ? "#ecfeff" : node.kind.includes("switch") ? "#fff7ed" : "#ffffff";

  if (node.kind.includes("bus")) {
    return <rect x={-w / 2} y={-h / 2 + h / 3} width={w} height={h / 3} rx="2" fill={stroke} />;
  }

  if (node.kind.includes("line")) {
    return (
      <g stroke={stroke} strokeWidth="4" strokeLinecap="round">
        <line x1={-w / 2 + 8} y1="0" x2={w / 2 - 8} y2="0" />
        <line x1={-w / 4} y1="-10" x2={w / 4} y2="10" />
      </g>
    );
  }

  if (node.kind.includes("transformer")) {
    return (
      <g fill={fill} stroke={stroke} strokeWidth="2.5">
        <circle cx="-14" cy="0" r={miniature ? 11 : 18} />
        <circle cx="14" cy="0" r={miniature ? 11 : 18} />
      </g>
    );
  }

  if (node.kind.includes("switch")) {
    return (
      <g fill="none" stroke={stroke} strokeWidth="2.5" strokeLinecap="round">
        <line x1={-w / 2 + 10} y1="0" x2="-8" y2="0" />
        <line x1="8" y1="0" x2={w / 2 - 10} y2="0" />
        <line x1="-8" y1="0" x2="11" y2="-14" />
      </g>
    );
  }

  if (node.kind.includes("load")) {
    return (
      <g fill={fill} stroke={stroke} strokeWidth="2.5" strokeLinejoin="round">
        <path d={`M ${-w / 3} ${-h / 3} L ${w / 3} ${-h / 3} L 0 ${h / 3} Z`} />
      </g>
    );
  }

  if (node.kind.includes("converter")) {
    return (
      <g>
        <rect x={-w / 2} y={-h / 2} width={w} height={h} rx="6" fill={fill} stroke={stroke} strokeWidth="2.5" />
        <path d={`M ${-w / 4} 0 H ${w / 4}`} stroke={stroke} strokeWidth="2.5" strokeLinecap="round" />
        <path d={`M ${w / 8} -8 L ${w / 4} 0 L ${w / 8} 8`} fill="none" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" />
      </g>
    );
  }

  return (
    <g>
      <circle cx="0" cy="0" r={miniature ? 16 : 24} fill={fill} stroke={stroke} strokeWidth="2.5" />
      <path d="M -10 0 H 10 M 0 -10 V 10" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" />
    </g>
  );
}

function buildSvgDocument(nodes: ModelNode[], edges: Edge[]) {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const edgeMarkup = edges
    .map((edge) => {
      const source = nodeById.get(edge.sourceId);
      const target = nodeById.get(edge.targetId);
      if (!source || !target) {
        return "";
      }
      const d = pointsToPath(routeOrthogonalEdge(source, target, nodes, edge));
      return `<path d="${d}" fill="none" stroke="#334155" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`;
    })
    .join("\n");
  const nodeMarkup = nodes
    .map(
      (node) => `<g transform="translate(${node.position.x} ${node.position.y}) rotate(${node.rotation}) scale(${node.scale})">
  <rect x="${-node.size.width / 2}" y="${-node.size.height / 2}" width="${node.size.width}" height="${node.size.height}" rx="8" fill="#ffffff" stroke="#94a3b8"/>
  <text x="0" y="${node.size.height / 2 + 20}" text-anchor="middle" font-size="14" font-family="Arial, sans-serif" fill="#0f172a">${node.name}</text>
</g>`
    )
    .join("\n");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" viewBox="0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}">
<rect width="100%" height="100%" fill="#f8fafc"/>
${edgeMarkup}
${nodeMarkup}
</svg>`;
}

export function App() {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const importRef = useRef<HTMLInputElement | null>(null);
  const [nodes, setNodes] = useState<ModelNode[]>(SAMPLE_NODES);
  const [edges, setEdges] = useState<Edge[]>(SAMPLE_EDGES);
  const [mode, setMode] = useState<ToolMode>("select");
  const [selectedNodeId, setSelectedNodeId] = useState(nodes[0]?.id ?? "");
  const [connectSource, setConnectSource] = useState<{ nodeId: string; terminalId: string } | null>(null);
  const [dragging, setDragging] = useState<{ nodeId: string; offset: Point } | null>(null);

  const selectedNode = nodes.find((node) => node.id === selectedNodeId);
  const topology = useMemo(() => buildTopology(nodes, edges), [nodes, edges]);
  const nodeById = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);

  const updateSelectedNode = (patch: Partial<ModelNode>) => {
    if (!selectedNodeId) {
      return;
    }
    setNodes((current) => current.map((node) => (node.id === selectedNodeId ? { ...node, ...patch } : node)));
  };

  const updateParam = (key: string, value: string) => {
    if (!selectedNodeId) {
      return;
    }
    setNodes((current) =>
      current.map((node) =>
        node.id === selectedNodeId ? { ...node, params: { ...node.params, [key]: value } } : node
      )
    );
  };

  const updateTerminalCount = (count: number) => {
    if (!selectedNode) {
      return;
    }
    const type = selectedNode.terminals[0]?.type ?? (selectedNode.kind.startsWith("dc") ? "dc" : "ac");
    const terminals = createTerminals(type, count);
    setNodes((current) => current.map((node) => (node.id === selectedNode.id ? { ...node, terminals } : node)));
    setEdges((current) =>
      current.filter((edge) => {
        if (edge.sourceId === selectedNode.id && !terminals.some((terminal) => terminal.id === edge.sourceTerminalId)) {
          return false;
        }
        if (edge.targetId === selectedNode.id && !terminals.some((terminal) => terminal.id === edge.targetTerminalId)) {
          return false;
        }
        return true;
      })
    );
  };

  const handleDrop = (event: DragEvent<SVGSVGElement>) => {
    event.preventDefault();
    const kind = event.dataTransfer.getData("application/device-kind") as DeviceKind;
    if (!kind || !svgRef.current) {
      return;
    }
    const position = screenToSvgPoint(svgRef.current, event.clientX, event.clientY);
    const node = createDefaultNode(kind, position);
    setNodes((current) => [...current, node]);
    setSelectedNodeId(node.id);
  };

  const handleNodePointerDown = (event: PointerEvent<SVGGElement>, node: ModelNode) => {
    event.stopPropagation();
    setSelectedNodeId(node.id);
    if (mode === "connect") {
      return;
    }
    if (!svgRef.current) {
      return;
    }
    const point = screenToSvgPoint(svgRef.current, event.clientX, event.clientY);
    setDragging({ nodeId: node.id, offset: { x: point.x - node.position.x, y: point.y - node.position.y } });
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent<SVGSVGElement>) => {
    if (!dragging || !svgRef.current) {
      return;
    }
    const point = screenToSvgPoint(svgRef.current, event.clientX, event.clientY);
    setNodes((current) =>
      current.map((node) =>
        node.id === dragging.nodeId
          ? { ...node, position: { x: point.x - dragging.offset.x, y: point.y - dragging.offset.y } }
          : node
      )
    );
  };

  const deleteSelected = () => {
    if (!selectedNodeId) {
      return;
    }
    setNodes((current) => current.filter((node) => node.id !== selectedNodeId));
    setEdges((current) => current.filter((edge) => edge.sourceId !== selectedNodeId && edge.targetId !== selectedNodeId));
    setSelectedNodeId("");
  };

  const handleTerminalPointerDown = (
    event: PointerEvent<SVGCircleElement>,
    node: ModelNode,
    terminalId: string
  ) => {
    event.stopPropagation();
    setSelectedNodeId(node.id);
    if (mode !== "connect") {
      return;
    }
    if (!connectSource) {
      setConnectSource({ nodeId: node.id, terminalId });
      return;
    }
    const sourceNode = nodeById.get(connectSource.nodeId);
    if (!sourceNode || !canConnectTerminals(sourceNode, connectSource.terminalId, node, terminalId)) {
      setConnectSource(null);
      return;
    }
    setEdges((current) => [
      ...current,
      {
        id: `edge-${Date.now()}`,
        sourceId: sourceNode.id,
        targetId: node.id,
        sourceTerminalId: connectSource.terminalId,
        targetTerminalId: terminalId
      }
    ]);
    setConnectSource(null);
  };

  const exportModel = () => {
    downloadText(
      "power-system-model.json",
      serializeProject({ version: 1, name: "电力系统图上模型", nodes, edges }),
      "application/json"
    );
  };

  const exportSvg = () => {
    downloadText("power-system-diagram.svg", buildSvgDocument(nodes, edges), "image/svg+xml");
  };

  const importModel = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    const text = await file.text();
    const project = deserializeProject(text);
    setNodes(project.nodes);
    setEdges(project.edges);
    setSelectedNodeId(project.nodes[0]?.id ?? "");
    event.target.value = "";
  };

  return (
    <div className="app-shell">
      <aside className="library-panel">
        <div className="brand">
          <div className="brand-mark">PS</div>
          <div>
            <h1>电力系统图上建模平台</h1>
            <p>拖拽建模、拓扑关联、参数维护</p>
          </div>
        </div>
        <div className="tool-switch">
          <button className={mode === "select" ? "active" : ""} onClick={() => setMode("select")} title="选择/拖拽">
            <MousePointer2 size={17} />
            选择
          </button>
          <button className={mode === "connect" ? "active" : ""} onClick={() => setMode("connect")} title="联络线">
            <Cable size={17} />
            联络线
          </button>
        </div>
        <div className="library-scroll">
          {Object.entries(groupedLibrary).map(([group, items]) => (
            <section className="library-group" key={group}>
              <h2>{group}</h2>
              {items.map((item) => {
                const preview = createDefaultNode(item.kind, { x: 0, y: 0 });
                return (
                  <button
                    className="library-item"
                    draggable
                    key={item.kind}
                    onDragStart={(event) => event.dataTransfer.setData("application/device-kind", item.kind)}
                  >
                    <svg viewBox="-40 -28 80 56" aria-hidden="true">
                      <DeviceGlyph node={preview} miniature />
                    </svg>
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </section>
          ))}
        </div>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <div className="status-cluster">
            <span>
              <Grid2X2 size={16} />
              元件 {nodes.length}
            </span>
            <span>联络线 {edges.length}</span>
            <span>拓扑岛 {topology.connectedComponents.length}</span>
            {mode === "connect" && <strong>{connectSource ? "选择同类型目标端子" : "选择起点端子"}</strong>}
          </div>
          <div className="action-cluster">
            <input ref={importRef} type="file" accept="application/json,.json" hidden onChange={importModel} />
            <button onClick={() => importRef.current?.click()}>
              <FileInput size={16} />
              导入模型
            </button>
            <button onClick={exportModel}>
              <FileJson size={16} />
              保存文件
            </button>
            <button onClick={exportSvg}>
              <Download size={16} />
              保存SVG
            </button>
          </div>
        </header>

        <section className="canvas-frame">
          <svg
            ref={svgRef}
            className="diagram-canvas"
            viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}
            onDrop={handleDrop}
            onDragOver={(event) => event.preventDefault()}
            onPointerMove={handlePointerMove}
            onPointerUp={() => setDragging(null)}
            onPointerLeave={() => setDragging(null)}
            onPointerDown={() => {
              setSelectedNodeId("");
              setConnectSource(null);
            }}
          >
            <defs>
              <pattern id="small-grid" width="24" height="24" patternUnits="userSpaceOnUse">
                <path d="M 24 0 L 0 0 0 24" fill="none" stroke="#e2e8f0" strokeWidth="1" />
              </pattern>
              <pattern id="large-grid" width="120" height="120" patternUnits="userSpaceOnUse">
                <rect width="120" height="120" fill="url(#small-grid)" />
                <path d="M 120 0 L 0 0 0 120" fill="none" stroke="#cbd5e1" strokeWidth="1.2" />
              </pattern>
              <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#334155" />
              </marker>
            </defs>
            <rect width={CANVAS_WIDTH} height={CANVAS_HEIGHT} fill="#f8fafc" />
            <rect width={CANVAS_WIDTH} height={CANVAS_HEIGHT} fill="url(#large-grid)" />
            {edges.map((edge) => {
              const source = nodeById.get(edge.sourceId);
              const target = nodeById.get(edge.targetId);
              if (!source || !target) {
                return null;
              }
              const path = pointsToPath(routeOrthogonalEdge(source, target, nodes, edge));
              return (
                <path
                  key={edge.id}
                  d={path}
                  className="connection-line"
                  markerEnd="url(#arrow)"
                  onPointerDown={(event) => {
                    event.stopPropagation();
                    setSelectedNodeId("");
                  }}
                />
              );
            })}
            {nodes.map((node) => {
              const selected = node.id === selectedNodeId;
              const isConnectSource = node.id === connectSource?.nodeId;
              return (
                <g
                  key={node.id}
                  className={`diagram-node ${selected ? "selected" : ""} ${isConnectSource ? "connect-source" : ""}`}
                  transform={`translate(${node.position.x} ${node.position.y}) rotate(${node.rotation}) scale(${node.scale})`}
                  onPointerDown={(event) => handleNodePointerDown(event, node)}
                >
                  <rect
                    x={-node.size.width / 2}
                    y={-node.size.height / 2}
                    width={node.size.width}
                    height={node.size.height}
                    rx="8"
                    className="node-hitbox"
                  />
                  <DeviceGlyph node={node} />
                  <text y={node.size.height / 2 + 22} textAnchor="middle">
                    {node.name}
                  </text>
                  {node.terminals.map((terminal) => {
                    const sourceNode = connectSource ? nodeById.get(connectSource.nodeId) : undefined;
                    const disabled =
                      mode === "connect" &&
                      Boolean(sourceNode) &&
                      !canConnectTerminals(sourceNode!, connectSource!.terminalId, node, terminal.id);
                    return (
                      <circle
                        key={terminal.id}
                        className={`terminal-dot ${terminal.type} ${disabled ? "disabled" : ""}`}
                        cx={terminal.anchor.x * node.size.width}
                        cy={terminal.anchor.y * node.size.height}
                        r={6}
                        onPointerDown={(event) => handleTerminalPointerDown(event, node, terminal.id)}
                      >
                        <title>{`${terminal.label} / ${terminal.type.toUpperCase()}`}</title>
                      </circle>
                    );
                  })}
                </g>
              );
            })}
          </svg>
        </section>
      </main>

      <aside className="inspector-panel">
        <div className="inspector-title">
          <div>
            <h2>参数面板</h2>
            <p>{selectedNode ? "修改后自动更新模型文件" : "选择画布元件查看参数"}</p>
          </div>
          <button onClick={deleteSelected} disabled={!selectedNode} title="删除元件">
            <Trash2 size={17} />
          </button>
        </div>
        {selectedNode ? (
          <div className="form-stack">
            <label>
              元件名称
              <input value={selectedNode.name} onChange={(event) => updateSelectedNode({ name: event.target.value })} />
            </label>
            <label>
              X坐标
              <input
                type="number"
                value={Math.round(selectedNode.position.x)}
                onChange={(event) =>
                  updateSelectedNode({ position: { ...selectedNode.position, x: Number(event.target.value) } })
                }
              />
            </label>
            <label>
              Y坐标
              <input
                type="number"
                value={Math.round(selectedNode.position.y)}
                onChange={(event) =>
                  updateSelectedNode({ position: { ...selectedNode.position, y: Number(event.target.value) } })
                }
              />
            </label>
            <label>
              旋转角度
              <input
                type="number"
                value={selectedNode.rotation}
                onChange={(event) => updateSelectedNode({ rotation: Number(event.target.value) })}
              />
            </label>
            <label>
              缩放倍率
              <input
                type="number"
                min="0.5"
                max="2"
                step="0.1"
                value={selectedNode.scale}
                onChange={(event) => updateSelectedNode({ scale: Number(event.target.value) })}
              />
            </label>
            <label>
              端子数量
              <input
                type="number"
                min="1"
                max="8"
                value={selectedNode.terminals.length}
                onChange={(event) => updateTerminalCount(Number(event.target.value))}
              />
            </label>
            <div className="terminal-list">
              {selectedNode.terminals.map((terminal) => (
                <span key={terminal.id}>{`${terminal.label} / ${terminal.type.toUpperCase()}`}</span>
              ))}
            </div>
            <div className="param-divider">设备参数</div>
            {Object.entries(selectedNode.params).map(([key, value]) => (
              <label key={key}>
                {key}
                <input value={value} onChange={(event) => updateParam(key, event.target.value)} />
              </label>
            ))}
            <div className="topology-card">
              <span>连接度</span>
              <strong>{topology.nodes[selectedNode.id]?.degree ?? 0}</strong>
              <small>
                {(topology.nodes[selectedNode.id]?.neighbors ?? [])
                  .map((id) => nodeById.get(id)?.name)
                  .filter(Boolean)
                  .join("、") || "暂无相邻元件"}
              </small>
            </div>
          </div>
        ) : (
          <div className="empty-state">
            <Save size={28} />
            <p>从左侧拖入元件，或使用联络线模式点击两个元件建立拓扑关系。</p>
          </div>
        )}
      </aside>
    </div>
  );
}
