// 电流方向判定：多源 BFS 生成有向生成树（arborescence），环路闭合边在冲突处收敛为 "both"。
//
// ## 为什么不直接「每条边各看两端电压等级」
//
// 直觉方案是按电压梯度给每条边定向，但那样一台**多端设备**（母线、变压器、储能）上
// 会同时有进流和出流，规则互相覆盖；环网更是无解（每条边都"两头有理"）。
// BFS 生成树把这层"从哪来、往哪去"一次性定下来：
//
//   - 展开节点 N 时，N 的每条入边以外的导通边都记方向 —— N 是该边 source 端记 `forward`，
//     是 target 端记 `reverse`；
//   - 同一个节点**只展开一次**，保证结果是树（不会因为环路无限传播）；
//   - 同一条边先后被记入两个相反方向 → 判定为 `both`。树形网络天然不会误报（树里每条边
//     只有一个展开点先碰到它），只有环路闭合边才会真的撞上两个方向。
//
// ## 纯模块约束
//
// 无 React / 无 DOM / 无浏览器 API；相对 import 一律带 `.ts` 扩展名，
// `server/*.mjs` 可与 `src/export/svg.ts` 一起被 Node 原生直载。
import type { Edge, ModelNode, Terminal, TerminalType } from "../model.ts";
import {
  baseDeviceKind,
  isGeneratorKind,
  isTransformerKind,
  normalizeSwitchStatusForE,
  switchingDeviceUsesClosedStatus,
  terminalVoltageBaseNumber
} from "../model.ts";
import { isBusNode, resolveTopologyEdgeTerminal } from "../model-routing.ts";
import { terminalVoltageDisplayValue } from "../model-eexport.ts";

/**
 * 电流方向。
 *
 * - `forward` —— 电流沿 edge 的 `sourceId → targetId`（画布上的箭头指向 target）。
 * - `reverse` —— 电流沿 `targetId → sourceId`。
 * - `both` —— 双向导通（环路闭合边、或电压规则与 BFS 推导互相矛盾时）。
 * - `none` —— 不导通 / 无潮流（分闸开关串断，或整条支路没有电源可达）。
 */
export type ElectricFlowDirection = "forward" | "reverse" | "both" | "none";

type FlowNodeRole =
  | "source"
  | "storage"
  | "load"
  | "ground-disconnector"
  | "bus"
  | "transformer"
  | "switching"
  | "plain";

type EdgeIncidence = { edgeId: string; side: "source" | "target" };

type QueueItem = { nodeId: string; arrivalEdgeId: string | null };

/**
 * 节点在潮流里的角色。**只做归类，不决定行为**：
 * 行为集中在 BFS 一处（`load` / `ground-disconnector` 停止传播，`transformer` 走电压规则，
 * 其余 —— 含母线与储能 —— 一律正常展开）。
 *
 * 母线/储能之所以要显式分类而不是留作 `plain`：它们是"潮流中转站"，
 * 分类让「母线从流入点扩散到各流出点」「储能同一套规则既充又放」这条意图留在代码里可查。
 */
function flowNodeRole(node: ModelNode): FlowNodeRole {
  const kind = baseDeviceKind(node.kind);
  if (isGeneratorKind(node.kind)) return "source";
  if (kind.includes("storage")) return "storage";
  if (kind.includes("load")) return "load";
  if (kind.includes("ground-disconnector")) return "ground-disconnector";
  if (isTransformerKind(node.kind)) return "transformer";
  if (isBusNode(node)) return "bus";
  if (switchingDeviceUsesClosedStatus(node.kind, node.params)) return "switching";
  return "plain";
}

/**
 * 分闸的开关 / 断路器不导通，其两侧的边整条判 `none`。
 *
 * ## 状态键必须按 `closed_status ?? closedStatus ?? status` 取
 *
 * `switchingDeviceUsesClosedStatus` 为 true 的设备（`acswitch`/`acbreak`/`dcswitch`/`dcbreak`
 * 组件库，或 kind 里带 switch/breaker 的），出厂默认参数写的是 **`closed_status`** —— 见
 * `model.ts` 的 `buildDefaultParams`：`usesClosedStatus ? "closed_status" : "status"`。
 * 只读 `params.status` 会把这些设备的真实合分状态整个漏掉：分闸开关两侧凭空冒出箭头。
 * 取键顺序对齐 `model-routing.ts` 的 `shouldContractTopologyIslandNode`（:3874），两处口径一致。
 *
 * ## 外层那道 `switchingDeviceUsesClosedStatus` 闸门不能去掉
 *
 * 接地刀闸与容器在该函数下**恒为 false**，所以闸门一放开，它们的 `params.status` 就会被读：
 * 而接地刀闸的模板默认值就是 `status: "0"`（常态分闸），一放开就等于把「流向接地刀闸」
 * 这条**末梢边**的箭头全掐掉 —— 但接地刀闸正是要作为末端设备看到箭头的（见 `flowNodeRole`）。
 * 闸门同时也是「只有开关/断路器才按状态掐断」这条语义的唯一出处，不能拿状态键去绕开它。
 */
function isSwitchingDeviceConducting(node: ModelNode): boolean {
  if (!switchingDeviceUsesClosedStatus(node.kind, node.params)) return true;
  return (
    normalizeSwitchStatusForE(node.params.closed_status ?? node.params.closedStatus ?? node.params.status) !== "0"
  );
}

/**
 * edge 在指定节点那一端的端子（缺省 `terminals[0]`，与拓扑连线同一套解析）。
 */
function edgeTerminalAtNode(edge: Edge, node: ModelNode): Terminal | undefined {
  const terminalId = edge.sourceId === node.id ? edge.sourceTerminalId : edge.targetTerminalId;
  return resolveTopologyEdgeTerminal(node, terminalId);
}

/**
 * edge 两端的端子类型（ac / dc / h2 / heat）。端子缺失（如 0 端子的母线）返回 undefined。
 *
 * 唯一用途是**变压器电压规则的闸门**：跨能量类型的连线（建模串联残留）不该按绕组电压定方向。
 */
function resolveEdgeTerminalTypes(edge: Edge, source: ModelNode, target: ModelNode): [TerminalType | undefined, TerminalType | undefined] {
  return [edgeTerminalAtNode(edge, source)?.type, edgeTerminalAtNode(edge, target)?.type];
}

/**
 * 变压器各端子电压（数字），取不到（缺失 / 归一后为 0 —— 端子 vbase 默认占位就是 `"0"`）
 * 的端子记 `NaN`。
 *
 * ## 直接用已导出的 `terminalVoltageDisplayValue`，不再抄一份 `terminalSideVoltageBase`
 *
 * 重抄那一份有三重代价：只认绕组键（漏掉端子自身 `vbase` 与 `params.vbase`/`voltage_level`/
 * `rated_voltage`/`voltage` 的级联）、只对变压器有意义、违反单源原则（那边改了这边不跟）。
 * `terminalVoltageDisplayValue`（`model-eexport.ts`）本身已经把整条级联串起来了。
 *
 * ## 传 terminal 对象（带 id）而不是只传电压
 *
 * 它内部靠 `terminalIndexForVoltageDisplay` 定位绕组下标：该函数在**没给 id** 时
 * 只对单端子节点返回 0，多端子一律 -1。这里始终传 `resolveTopologyEdgeTerminal` 拿到的
 * 完整端子（带 id），下标由 id 反查，两绕组 / 三绕组 / 三绕组带中性点都能落到正确的绕组。
 *
 * ## 它对变压器的实际行为（实测钉在 electric-flow.test.ts）
 *
 * - 两绕组：t1 取 `i_vbase|source_vbase|high_vbase`，t2 取 `j_vbase|target_vbase|low_vbase`。
 * - 三绕组：依次取 `i_vbase|high_vbase`、`k_vbase|medium_vbase`、`j_vbase|low_vbase`、
 *   `neutral_vbase`（t3 中性点通常为 0 ⇒ `NaN`，不参与高低压判定）。
 * - 端子自身 `vbase` 非 0 时优先于绕组参数（更贴近实际设定值），这正是我们要的。
 * - 绕组键全为 0 时会落到节点级回退（`params.vbase` / `voltage_level` / `rated_voltage`），
 *   各端子拿到**同一个**电压 ⇒ `maxV === minV`，被调用点的 `voltageRuleUsable` 挡下，
 *   退回普通 BFS。这是安全失败（方向退回拓扑推导，而非编造一个电压规则），
 *   故这里**不需要**再补一层 params 直读兜底。
 */
function transformerSideVoltages(node: ModelNode): number[] {
  return node.terminals.map((terminal) => {
    const normalized = terminalVoltageBaseNumber(terminalVoltageDisplayValue(node, terminal));
    const value = normalized ? Number(normalized) : Number.NaN;
    return Number.isFinite(value) && value > 0 ? value : Number.NaN;
  });
}

/**
 * 计算每条 edge 的电流方向。
 *
 * 返回的 Map **覆盖 `edges` 里的全部 edge**（包括悬空边与不可达边，值均为 `"none"`）：
 * 调用方按缺省 none 处理与读到显式 none 等价，直接 `map.get(id)` 即可，不必判存在。
 */
export function computeElectricFlowDirections(nodes: ModelNode[], edges: Edge[]): Map<string, ElectricFlowDirection> {
  const nodesById = new Map<string, ModelNode>();
  for (const node of nodes) {
    nodesById.set(node.id, node);
  }

  const edgesById = new Map<string, Edge>();
  const incidentByNode = new Map<string, EdgeIncidence[]>();
  const recorded = new Map<string, ElectricFlowDirection>();

  const addIncidence = (nodeId: string, item: EdgeIncidence) => {
    const list = incidentByNode.get(nodeId);
    if (list) list.push(item);
    else incidentByNode.set(nodeId, [item]);
  };

  for (const edge of edges) {
    if (edgesById.has(edge.id)) continue;
    edgesById.set(edge.id, edge);
    const source = nodesById.get(edge.sourceId);
    const target = nodesById.get(edge.targetId);
    // 悬空边（端点不在 nodes 里）无从导通判定，直接留 none，不进邻接表。
    if (!source || !target) continue;
    if (!isSwitchingDeviceConducting(source) || !isSwitchingDeviceConducting(target)) continue;
    addIncidence(edge.sourceId, { edgeId: edge.id, side: "source" });
    addIncidence(edge.targetId, { edgeId: edge.id, side: "target" });
  }

  /** 记一次方向；同一条边拿到相反方向即判 `both`。 */
  const recordFlow = (edgeId: string, direction: "forward" | "reverse") => {
    const current = recorded.get(edgeId);
    if (current === undefined) recorded.set(edgeId, direction);
    else if (current !== direction && current !== "both") recorded.set(edgeId, "both");
  };

  const queue: QueueItem[] = [];
  // 「所有电源端子入队」：端子数只影响入队条数，而展开是每节点一次 ——
  // 多出来的那几条会被 expanded 挡掉，故这里退化成每电源一条，语义等价且不留无用队列项。
  for (const node of nodes) {
    if (isGeneratorKind(node.kind)) queue.push({ nodeId: node.id, arrivalEdgeId: null });
  }

  const expanded = new Set<string>();

  /** 普通 BFS 规则：记方向 + 把对端入队（到达边固定为当前这条边）。 */
  const recordFromBfsRule = (item: EdgeIncidence, edge: Edge) => {
    recordFlow(item.edgeId, item.side === "source" ? "forward" : "reverse");
    queue.push({
      nodeId: item.side === "source" ? edge.targetId : edge.sourceId,
      arrivalEdgeId: item.edgeId
    });
  };

  for (let head = 0; head < queue.length; head += 1) {
    const { nodeId, arrivalEdgeId } = queue[head];
    if (expanded.has(nodeId)) continue;
    expanded.add(nodeId);
    const node = nodesById.get(nodeId);
    if (!node) continue;

    const role = flowNodeRole(node);
    // 负荷与接地刀闸是潮流终点：只保留到达它们的那次记录（记录发生在上一站的展开里），不再向外传播。
    if (role === "load" || role === "ground-disconnector") continue;

    const incident = incidentByNode.get(nodeId) ?? [];

    if (role === "transformer") {
      const sideVoltages = transformerSideVoltages(node);
      const known = sideVoltages.filter((value) => Number.isFinite(value));
      const maxV = known.length > 0 ? Math.max(...known) : Number.NaN;
      const minV = known.length > 0 ? Math.min(...known) : Number.NaN;
      // 只有存在**两个及以上不同电压等级**时电压规则才有判别力。
      // 全部绕组同压（参数没填全时很常见）时退回普通 BFS：否则「既算高压侧又算低压侧」
      // 会自相矛盾，且变压器会因「只从流出侧扩展」而把整条下游链截断。
      const voltageRuleUsable = known.length > 0 && maxV > minV;

      for (const item of incident) {
        if (item.edgeId === arrivalEdgeId) continue;
        const edge = edgesById.get(item.edgeId);
        if (!edge) continue;

        let roleSide: "high" | "low" | "none" = "none";
        if (voltageRuleUsable) {
          const sourceNode = nodesById.get(edge.sourceId);
          const targetNode = nodesById.get(edge.targetId);
          // 跨能量类型的连线不做电压定向（否则会把建模串联残留画成变压流向）
          if (sourceNode && targetNode) {
            const [sourceType, targetType] = resolveEdgeTerminalTypes(edge, sourceNode, targetNode);
            const sameEnergyDomain = !sourceType || !targetType || sourceType === targetType;
            if (sameEnergyDomain) {
              const terminal = edgeTerminalAtNode(edge, node);
              const terminalIndex = terminal ? node.terminals.findIndex((candidate) => candidate.id === terminal.id) : -1;
              const voltage = terminalIndex >= 0 ? sideVoltages[terminalIndex] : Number.NaN;
              if (Number.isFinite(voltage)) {
                if (voltage >= maxV) roleSide = "high";
                else if (voltage <= minV) roleSide = "low";
              }
            }
          }
        }

        if (roleSide === "none") {
          // 中压侧（三绕组中压绕组）或电压取不到：按 BFS 推导方向兜底。
          recordFromBfsRule(item, edge);
          continue;
        }

        // 高压侧流入、低压侧流出；箭头语义仍绑定 edge 的 source→target。
        const flowsOutOfNode = roleSide === "low";
        const direction = flowsOutOfNode === (item.side === "source") ? "forward" : "reverse";
        recordFlow(item.edgeId, direction);
        // 只从「流出」侧继续入队：顺着电压梯度继续展开，低压侧才是下游。
        if (flowsOutOfNode) {
          queue.push({
            nodeId: item.side === "source" ? edge.targetId : edge.sourceId,
            arrivalEdgeId: item.edgeId
          });
        }
      }
      continue;
    }

    // 母线 / 储能 / 开关 / 容器 / 静态图元 / 普通设备：无差别展开。
    for (const item of incident) {
      if (item.edgeId === arrivalEdgeId) continue;
      const edge = edgesById.get(item.edgeId);
      if (!edge) continue;
      recordFromBfsRule(item, edge);
    }
  }

  const directions = new Map<string, ElectricFlowDirection>();
  for (const edge of edges) {
    directions.set(edge.id, recorded.get(edge.id) ?? "none");
  }
  return directions;
}