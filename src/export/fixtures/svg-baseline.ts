// SVG 导出基线 fixture：覆盖母排 / 开关 / 负荷 / 线路 / 静态图元 / 多状态视觉。
// 目的：去 JSX 重构前后输出必须逐字节一致。
// 相对任务简报原稿的修正（对照 src/model.ts 真实类型）：
//  - kind "busbar"/"breaker"/"load" 不是合法 DeviceKind，改为真实图元 "ac-bus"/"ac-breaker"/"ac-load"
//    （ac-bus 的 glyph 才产出 class="bus-glyph"，DeviceGlyph.test.tsx:332 可佐证）
//  - terminal.type "electrical" 非法，TerminalType 为 "ac" | "dc" | "h2" | "heat"，改为 "ac"
//  - 补齐 ModelNode 必填字段 name/nodeNumber/acTopologyNode/dcTopologyNode/scale，Terminal 必填字段 label
//  - layerId 用真实默认层 DEFAULT_MODEL_LAYER_ID（"layer-default"，model.ts:636）
export const SVG_BASELINE_FIXTURE = {
  width: 800,
  height: 600,
  backgroundColor: "#ffffff",
  deviceTemplates: [] as any[],
  imageExportPathById: {}
};

export const SVG_BASELINE_NODES = [
  {
    id: "bus1", kind: "ac-bus", name: "母线1", position: { x: 100, y: 100 }, size: { width: 200, height: 16 },
    rotation: 0, layerId: "layer-default", nodeNumber: "1", acTopologyNode: 0, dcTopologyNode: 0, scale: 1,
    params: { name: "母线1", vbase: "10" },
    terminals: [{ id: "t1", label: "", anchor: { x: 0.5, y: 0.5 }, type: "ac", nodeNumber: "1" }]
  },
  {
    id: "brk1", kind: "ac-breaker", name: "开关1", position: { x: 360, y: 100 }, size: { width: 32, height: 32 },
    rotation: 90, layerId: "layer-default", nodeNumber: "2", acTopologyNode: 0, dcTopologyNode: 0, scale: 1,
    params: { name: "开关1", status: "closed" },
    terminals: [
      { id: "t1", label: "", anchor: { x: 0, y: 0.5 }, type: "ac", nodeNumber: "2" },
      { id: "t2", label: "", anchor: { x: 1, y: 0.5 }, type: "ac", nodeNumber: "3" }
    ]
  },
  {
    id: "load1", kind: "ac-load", name: "负荷1", position: { x: 460, y: 180 }, size: { width: 40, height: 40 },
    rotation: 0, layerId: "layer-default", nodeNumber: "4", acTopologyNode: 0, dcTopologyNode: 0, scale: 1,
    params: { name: "负荷1", vbase: "10" },
    terminals: [{ id: "t1", label: "", anchor: { x: 0.5, y: 0 }, type: "ac", nodeNumber: "4" }]
  }
];

export const SVG_BASELINE_EDGES = [
  {
    id: "e1", sourceId: "bus1", targetId: "brk1",
    sourceTerminalId: "t1", targetTerminalId: "t1",
    sourcePoint: { x: 300, y: 108 }, targetPoint: { x: 360, y: 108 }
  }
];
