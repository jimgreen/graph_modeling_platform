/**
 * 拓扑检查中「额定容量告警」的两段式处理（会话内存）。
 *
 * 需求：拓扑检查发现设备 rated_capacity 为 0（或非正）且能按电压等级推出合理值时的处理口径——
 *  - 首次检查：只报告警，暂不改数据；
 *  - 第二次检查：自动为该设备的 rated_capacity 赋合理值，并消除该告警；
 *  - 赋值后该告警不再重复触发（只读检查拿到的模型副本场景由 "applied" 分支兜住）。
 *
 * 状态只存活在当前会话（模块级单例），刷新页面后重新从「第一次检查」算起。
 * 「这是第几次检查」的判定必须与检查范围绑定：同一设备在不同模型里互不影响。
 */
export type RatedCapacityFixDecision =
  /** 首次发现：调用方只报告警，不赋值。 */
  | "defer"
  /** 第二次发现：调用方按合理值赋值。 */
  | "apply"
  /** 已赋值过：静默按合理值参与后续计算，不再报告警。 */
  | "applied";

const deferredFixKeys = new Set<string>();
const appliedFixKeys = new Set<string>();

/**
 * 会话内唯一的修复项标识：检查范围 + 设备 + 参数键。
 * 容器关联字段的额定容量参数键自带关系前缀（如 `idx_ac_load_t1.rated_capacity`），天然与本体字段区分。
 */
export function ratedCapacityFixKey(scopeKey: string, nodeId: string, paramKey: string): string {
  return `${scopeKey}\u0000${nodeId}\u0000${paramKey}`;
}

/**
 * 判定本次检查对该设备该项额定容量应当做什么。
 * 同一会话内对同一修复项按「defer → apply → applied」单向推进，重复调用不会回退。
 */
export function decideRatedCapacityFix(
  scopeKey: string,
  nodeId: string,
  paramKey: string
): RatedCapacityFixDecision {
  const key = ratedCapacityFixKey(scopeKey, nodeId, paramKey);
  if (appliedFixKeys.has(key)) {
    return "applied";
  }
  if (deferredFixKeys.has(key)) {
    deferredFixKeys.delete(key);
    appliedFixKeys.add(key);
    return "apply";
  }
  deferredFixKeys.add(key);
  return "defer";
}

/** 复位会话状态。测试用例之间必须互相隔离；切换/关闭模型时也用于丢弃过期登记。 */
export function resetRatedCapacityFixSession(): void {
  deferredFixKeys.clear();
  appliedFixKeys.clear();
}

/** 仍处于「首查已报告、等待下次赋值」状态的修复项数量（供测试与操作日志）。 */
export function pendingRatedCapacityFixCount(): number {
  return deferredFixKeys.size;
}
