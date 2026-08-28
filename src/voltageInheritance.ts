/**
 * 电压继承核心模块
 *
 * 提供设备端子电压等级的解析、判断与继承能力。
 * 纯函数模块，无 React 依赖。
 */

import {
  DEFAULT_INITIAL_TERMINAL_VBASE,
  terminalVoltageBaseNumber,
  type ModelNode,
  type Terminal,
  type TerminalType
} from "./model";

import {
  firstNonZeroVoltageBase,
  isThreeWindingTransformer,
  THREE_WINDING_TRANSFORMER_SIDES
} from "./model-eexport";

import { voltageBaseSettingModeForNode } from "./model-routing";

// ─── 辅助函数 ──────────────────────────────────────────────

/** 判断端子类型是否为电气类型（ac / dc） */
function isElectricalTerminalType(type: TerminalType): boolean {
  return type === "ac" || type === "dc";
}

/** 判断设备是否含有电气端子 */
function hasElectricalTerminal(node: Pick<ModelNode, "terminals">): boolean {
  return node.terminals.some((t) => isElectricalTerminalType(t.type));
}

/** 判断电压值是否为零（"0" 或空字符串） */
function isZeroVoltage(value: string | undefined): boolean {
  const normalized = terminalVoltageBaseNumber(value);
  return !normalized || normalized === "0";
}

/**
 * 按端子索引解析设备侧电压
 *
 * 三绕组变压器：
 *   - 端子 0 → i_vbase / high_vbase
 *   - 端子 1 → k_vbase / medium_vbase
 *   - 端子 2 → j_vbase / low_vbase
 *
 * 双端子设备：
 *   - 端子 0 → i_vbase / source_vbase / high_vbase
 *   - 端子 1 → j_vbase / target_vbase / low_vbase
 */
function resolveSideVoltage(
  node: Pick<ModelNode, "kind" | "params">,
  terminalIndex: number
): string {
  if (isThreeWindingTransformer(node)) {
    // 三绕组变压器各侧电压映射
    const sideValues = [
      [node.params.i_vbase, node.params.high_vbase],
      [node.params.k_vbase, node.params.medium_vbase],
      [node.params.j_vbase, node.params.low_vbase]
    ];
    return firstNonZeroVoltageBase(sideValues[terminalIndex] ?? []);
  }

  // 双端子设备
  if (terminalIndex === 0) {
    return firstNonZeroVoltageBase([
      node.params.i_vbase,
      node.params.source_vbase,
      node.params.high_vbase
    ]);
  }
  if (terminalIndex === 1) {
    return firstNonZeroVoltageBase([
      node.params.j_vbase,
      node.params.target_vbase,
      node.params.low_vbase
    ]);
  }
  return "";
}

// ─── 公开 API ──────────────────────────────────────────────

/**
 * 解析设备在指定端子处的电压等级
 *
 * 优先级：
 *   1. 端子自身的 vbase（非零）
 *   2. 按端子索引取设备侧电压参数
 *   3. 通用 vbase
 *   4. 返回空字符串
 *
 * 仅对 ac / dc 类型端子生效，非电气端子返回空字符串。
 */
export function resolveNodeVoltageAtTerminal(
  node: Pick<ModelNode, "kind" | "terminals" | "params">,
  terminalId: string
): string {
  const terminalIndex = node.terminals.findIndex((t) => t.id === terminalId);

  // 端子 ID 未找到时，回退到通用 vbase
  if (terminalIndex < 0) {
    const commonVbase = terminalVoltageBaseNumber(node.params.vbase);
    if (commonVbase && commonVbase !== "0") {
      return commonVbase;
    }
    return "";
  }

  const terminal = node.terminals[terminalIndex];

  // 仅对 ac/dc 类型端子生效
  if (!isElectricalTerminalType(terminal.type)) {
    // 非电气端子（h2/heat），不继承电压
    return "";
  }

  // 1. 端子自身的 vbase（非零）
  const terminalVbase = terminalVoltageBaseNumber(terminal.vbase);
  if (terminalVbase && terminalVbase !== "0") {
    return terminalVbase;
  }

  // 2. 按端子索引取设备侧电压参数
  const sideVoltage = resolveSideVoltage(node, terminalIndex);
  if (sideVoltage && sideVoltage !== "0") {
    return sideVoltage;
  }

  // 3. 通用 vbase
  const commonVbase = terminalVoltageBaseNumber(node.params.vbase);
  if (commonVbase && commonVbase !== "0") {
    return commonVbase;
  }

  // 4. 返回空字符串
  return "";
}

/**
 * 判断设备在指定端子处是否为默认电压
 *
 * 当电压为 "0" 或空时返回 true。
 */
export function isNodeVoltageDefault(
  node: Pick<ModelNode, "kind" | "terminals" | "params">,
  terminalId: string
): boolean {
  const voltage = resolveNodeVoltageAtTerminal(node, terminalId);
  return isZeroVoltage(voltage);
}

/**
 * 将电压继承到目标设备
 *
 * 根据设备的电压设置模式选择不同的继承策略：
 * - uniform 模式（如断路器、母线）：设置 params.vbase
 * - terminal 模式（如变压器）：按端子索引设置对应的侧电压参数
 *   - 三绕组变压器：端子 0 → i_vbase，端子 1 → k_vbase，端子 2 → j_vbase
 *   - 双端子设备：端子 0 → i_vbase，端子 1 → j_vbase
 *
 * 同时更新 rated_voltage 参数（如果存在且为默认值）
 *
 * @returns 修改后的 params 对象（新对象，不修改原节点）
 */
export function applyVoltageInheritance(
  targetNode: Pick<ModelNode, "kind" | "terminals" | "params">,
  sourceVoltage: string,
  terminalId?: string
): Record<string, string> {
  const nextParams = { ...targetNode.params };
  const voltage = terminalVoltageBaseNumber(sourceVoltage) || DEFAULT_INITIAL_TERMINAL_VBASE;

  // 检查设备的电压设置模式
  const settingMode = voltageBaseSettingModeForNode(targetNode as ModelNode);

  // uniform 模式：直接设置通用 vbase
  if (settingMode === "uniform") {
    nextParams.vbase = voltage;
    // 同时更新 rated_voltage（如果存在且为默认值）
    if (Object.prototype.hasOwnProperty.call(nextParams, "rated_voltage") && isZeroVoltage(nextParams.rated_voltage)) {
      nextParams.rated_voltage = voltage;
    }
    return nextParams;
  }

  // terminal 模式或 null：按端子索引设置侧电压

  // 无端子指定 → 设置通用 vbase
  if (!terminalId) {
    nextParams.vbase = voltage;
    // 同时更新 rated_voltage（如果存在且为默认值）
    if (Object.prototype.hasOwnProperty.call(nextParams, "rated_voltage") && isZeroVoltage(nextParams.rated_voltage)) {
      nextParams.rated_voltage = voltage;
    }
    return nextParams;
  }

  const terminalIndex = targetNode.terminals.findIndex((t) => t.id === terminalId);
  if (terminalIndex < 0) {
    nextParams.vbase = voltage;
    // 同时更新 rated_voltage（如果存在且为默认值）
    if (Object.prototype.hasOwnProperty.call(nextParams, "rated_voltage") && isZeroVoltage(nextParams.rated_voltage)) {
      nextParams.rated_voltage = voltage;
    }
    return nextParams;
  }

  // 三绕组变压器：端子 0→i_vbase, 1→k_vbase, 2→j_vbase
  if (isThreeWindingTransformer(targetNode)) {
    const paramKeys = ["i_vbase", "k_vbase", "j_vbase"] as const;
    const key = paramKeys[terminalIndex];
    if (key) {
      nextParams[key] = voltage;
    } else {
      // 超出三绕组范围（如 neutral），写入通用 vbase
      nextParams.vbase = voltage;
    }
    return nextParams;
  }

  // 双端子设备：端子 0 → i_vbase，端子 1 → j_vbase
  if (terminalIndex === 0) {
    nextParams.i_vbase = voltage;
  } else if (terminalIndex === 1) {
    nextParams.j_vbase = voltage;
  } else {
    nextParams.vbase = voltage;
  }

  return nextParams;
}
