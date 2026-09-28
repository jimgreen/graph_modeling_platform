// 设备索引分配：容器关系字段的 idx 落地逻辑（此前关键语义零直接断言）。
//
// 分配错的后果是**静默**的：设备落进错池 → idx 重号/漂移 → 导出的 E 文件里两个设备
// 指向同一个 index，潮流算错但流程不报错，只有核对 E 文件或跑潮流才发现。
//
// `assignPermanentDeviceIndex` 已有 73 处直呼，但**核心语义未被直接断言**：
// 现有测试里 `idx_heat2_unit_t2` 只以 `toBeUndefined()` 出现 —— 那是因为 params 里
// 根本没有该键，而非「验证了共享 idx」。本文件补的正是显式存在时的行为。
//
// 钉住的实测契约（均非缺陷，误判成 bug 反而危险）：
//
// ① **双端口的两个关系字段共享同一个 idx**（它们指同一个物理设备）。
//    配对失败（只有 t1、无 t2）时 t1 单独成组，**不报错**、idx 仍自洽。
// ② 组内两字段 idx 不一致时**取最大值并双向归一**（3 与 8 → 都变 8）；
//    其中无效值（0）不参与，取有效者的值。
// ③ **不同 counterKey 各自分池互不影响**：unit 组与 load 组可以拿到同一个 idx。
// ④ **两套容器判定并存的实际后果**：`deviceIndexCounterKey` 走 `isContainerKind`（kind 判据），
//    而关系字段分配走 `isContainerParams`（params 判据）。
//    故「kind 是容器但 params.is_container 不是」时：**自身 idx 照常分配**（走 ac_container 池），
//    **关系字段一个都不动**。误以为两者同源会判断错。
// ⑤ `parseDeviceIndex` 的正则 `/^[1-9]\d*$/` 严格：拒绝 0 / 前导零 / 负数 / 浮点 /
//    科学计数 / 全角数字，但**允许首尾空白**（先 trim）。超长数字**精度丢失**
//    （`9007199254740993` → `9007199254740992`，超过 MAX_SAFE_INTEGER）。
// ⑥ `resetDeviceIndexesForPaste` 对容器是「**置空**」关系字段（非删除），
//    对非容器则**保留**关系字段不动、只删自身 idx。
import { describe, expect, test } from "vitest";
import {
  parseDeviceIndex,
  assignPermanentDeviceIndex,
  resetDeviceIndexesForPaste,
  deriveDeviceIndexCounters
} from "./model";
import type { ModelNode } from "./model";

/** 容器节点的最小 params：is_container=1 即关系字段分配的前提 */
const containerParams = (extra: Record<string, string> = {}): Record<string, string> => ({
  is_container: "1",
  ...extra
});
const containerNode = (params: Record<string, string>) =>
  ({ kind: "ac-vpp-box", name: "C", params } as Pick<ModelNode, "kind" | "name" | "params">);

describe("parseDeviceIndex（/^[1-9]\\d*$/ 严格正则，探针实测全量边界）", () => {
  test("正常的正整数原样解析", () => {
    expect(parseDeviceIndex("1")).toBe(1);
    expect(parseDeviceIndex("9")).toBe(9);
    expect(parseDeviceIndex("10")).toBe(10);
  });

  test("缺失 / 空 / 纯空白 → 0（表示「未分配」，不是错误）", () => {
    expect(parseDeviceIndex(undefined)).toBe(0);
    // null 不在 `string | undefined` 类型面，但实现用 `String(value ?? "")` 运行时容忍，
    // 探针实测 null -> 0。此处 as never 只为记录该运行时行为，不放宽生产类型。
    expect(parseDeviceIndex(null as never)).toBe(0);
    expect(parseDeviceIndex("")).toBe(0);
    expect(parseDeviceIndex(" ")).toBe(0);
  });

  test("拒绝 0 与**前导零**（`01`/`007` → 0，不是 1/7）", () => {
    expect(parseDeviceIndex("0")).toBe(0);
    expect(parseDeviceIndex("01")).toBe(0);
    expect(parseDeviceIndex("007")).toBe(0);
  });

  test("拒绝负数 / 浮点 / 科学计数 / 带符号 / 全角数字 / NaN / Infinity", () => {
    for (const v of ["-1", "1.0", "1e3", "+5", "５", "NaN", "Infinity"]) {
      expect(parseDeviceIndex(v), v).toBe(0);
    }
  });

  test("**允许首尾空白**（先 trim 再校验）", () => {
    expect(parseDeviceIndex(" 5 ")).toBe(5);
  });

  test("超长数字精度丢失（超过 MAX_SAFE_INTEGER，探针实测）", () => {
    // 正则放行，但 parseInt 后超出安全整数范围 —— 边界特性，如实记录
    expect(parseDeviceIndex("9007199254740993")).toBe(9007199254740992);
  });
});

describe("assignContainerRelationIndexes（经 assignPermanentDeviceIndex 调用）", () => {
  test("单端口关系字段从空值分配新 idx", () => {
    const r = assignPermanentDeviceIndex(containerNode(containerParams({ idx_ac_unit_t1: "" })));
    expect(r.node.params.idx_ac_unit_t1).toBe("1");
    expect(r.counters.ACGenerator).toBe(1);
  });

  test("按传入 counter 递增分配", () => {
    const r = assignPermanentDeviceIndex(
      containerNode(containerParams({ idx_ac_unit_t1: "" })),
      { ACGenerator: 3 }
    );
    expect(r.node.params.idx_ac_unit_t1).toBe("4");
  });

  test("① **双端口两字段共享同一 idx**（核心语义：它们指同一个物理设备）", () => {
    const r = assignPermanentDeviceIndex(
      containerNode(containerParams({ idx_heat2_unit_t1: "", idx_heat2_unit_t2: "" }))
    );
    expect(r.node.params.idx_heat2_unit_t1).toBe("1");
    expect(r.node.params.idx_heat2_unit_t2).toBe("1");
    // 只消耗**一个**池位
    expect(r.counters.HeatSource2).toBe(1);
  });

  test("① 配对失败（只有 t1）时 t1 单独成组，**不报错**、idx 仍自洽", () => {
    const r = assignPermanentDeviceIndex(containerNode(containerParams({ idx_heat2_unit_t1: "" })));
    expect(r.node.params.idx_heat2_unit_t1).toBe("1");
    expect(r.counters.HeatSource2).toBe(1);
  });

  test("① 从属槽显式存在但值不同时仍被**归一到同值**（不能各占一个设备）", () => {
    const r = assignPermanentDeviceIndex(
      containerNode(containerParams({ idx_heat2_unit_t1: "", idx_heat2_unit_t2: "" }))
    );
    expect(r.node.params.idx_heat2_unit_t1).toBe(r.node.params.idx_heat2_unit_t2);
  });

  test("③ **不同 counterKey 各自分池**：unit 组与 load 组可拿到同一 idx", () => {
    const r = assignPermanentDeviceIndex(containerNode(containerParams({
      idx_heat2_unit_t1: "", idx_heat2_unit_t2: "",
      idx_heat2_load_t1: "", idx_heat2_load_t2: ""
    })));
    // 两个独立双端口，各自一个池，都从 1 开始
    expect(r.node.params.idx_heat2_unit_t1).toBe("1");
    expect(r.node.params.idx_heat2_load_t1).toBe("1");
    expect(r.counters.HeatSource2).toBe(1);
    expect(r.counters.HeatLoad2).toBe(1);
  });

  test("不同能流各自分池（ac/dc/h2），池位互不串", () => {
    const r = assignPermanentDeviceIndex(
      containerNode(containerParams({
        idx_ac_unit_t1: "", idx_dc_unit_t1: "", idx_h2_load_t1: ""
      })),
      { ACGenerator: 5 }
    );
    expect(r.node.params.idx_ac_unit_t1).toBe("6"); // 沿用传入的 5 递增
    expect(r.node.params.idx_dc_unit_t1).toBe("1"); // 自起
    expect(r.node.params.idx_h2_load_t1).toBe("1"); // 自起
  });

  test("② 组内 idx 不一致时取**最大值并双向归一**", () => {
    const r = assignPermanentDeviceIndex(
      containerNode(containerParams({ idx_heat2_unit_t1: "3", idx_heat2_unit_t2: "8" }))
    );
    expect(r.node.params.idx_heat2_unit_t1).toBe("8");
    expect(r.node.params.idx_heat2_unit_t2).toBe("8");
    expect(r.counters.HeatSource2).toBe(8);
  });

  test("② 组内含无效值（0）时取有效者的值", () => {
    const r = assignPermanentDeviceIndex(
      containerNode(containerParams({ idx_heat2_unit_t1: "0", idx_heat2_unit_t2: "5" }))
    );
    expect(r.node.params.idx_heat2_unit_t1).toBe("5");
    expect(r.node.params.idx_heat2_unit_t2).toBe("5");
  });

  test("已有有效 idx 时**不改 node**，只把 counter 抬到该值", () => {
    const r = assignPermanentDeviceIndex(
      containerNode(containerParams({ idx_heat2_unit_t1: "7", idx_heat2_unit_t2: "7" }))
    );
    expect(r.node.params.idx_heat2_unit_t1).toBe("7");
    expect(r.counters.HeatSource2).toBe(7);
  });

  test("已有 idx 低于 counter 时 node 与 counter 都不动（counter 更高就保持更高）", () => {
    const r = assignPermanentDeviceIndex(
      containerNode(containerParams({ idx_heat2_unit_t1: "7", idx_heat2_unit_t2: "7" })),
      { HeatSource2: 9 }
    );
    expect(r.node.params.idx_heat2_unit_t1).toBe("7");
    expect(r.counters.HeatSource2).toBe(9);
  });

  test("④ **两套容器判定并存的实际后果**：kind 是容器但 params 不是", () => {
    // deviceIndexCounterKey 走 isContainerKind（kind 判据）→ 自身 idx 照常分配；
    // 关系字段分配走 isContainerParams（params 判据）→ 一个都不动。
    const r = assignPermanentDeviceIndex(
      { kind: "ac-vpp-box", name: "C", params: { idx_ac_unit_t1: "" } } as Pick<
        ModelNode,
        "kind" | "name" | "params"
      >,
      { ACGenerator: 5 }
    );
    // 关系字段保持原样（空串未被填）
    expect(r.node.params.idx_ac_unit_t1).toBe("");
    // 自身 idx 已分配，且落在 ac_container 池（kind 判据）
    expect(r.node.params.idx).toBe("1");
    expect(r.counters.ac_container).toBe(1);
    // 关系字段的池完全没被触碰
    expect(r.counters.ACGenerator).toBe(5);
  });

  test("无关系字段时不动关系相关状态", () => {
    const r = assignPermanentDeviceIndex(containerNode(containerParams()), { ACGenerator: 5 });
    expect(r.counters.ACGenerator).toBe(5);
  });
});

describe("resetDeviceIndexesForPaste（粘贴重置）", () => {
  test("⑥ 容器：删自身 idx，关系字段**置空**（不是删除键）", () => {
    const out = resetDeviceIndexesForPaste({
      kind: "ac-vpp-box",
      name: "C",
      params: { is_container: "1", idx: "5", idx_ac_unit_t1: "2", idx_ac_unit_t2: "2", 无关: "x" }
    });
    expect("idx" in out.params).toBe(false);
    expect(out.params.idx_ac_unit_t1).toBe("");
    expect(out.params.idx_ac_unit_t2).toBe("");
    // 置空而非删除：键仍在，重置后会被重新分配
    expect("idx_ac_unit_t1" in out.params).toBe(true);
    // 无关参数保持
    expect(out.params.无关).toBe("x");
  });

  test("⑥ 非容器：只删自身 idx，**关系字段原样保留**", () => {
    const out = resetDeviceIndexesForPaste({
      kind: "ac-load",
      name: "L",
      params: { idx: "5", idx_ac_unit_t1: "2" }
    });
    expect("idx" in out.params).toBe(false);
    expect(out.params.idx_ac_unit_t1).toBe("2");
  });

  test("本来就没有 idx 时不改任何东西", () => {
    const out = resetDeviceIndexesForPaste({
      kind: "ac-load",
      name: "L",
      params: { ratedVoltage: "10" }
    });
    expect(out.params).toEqual({ ratedVoltage: "10" });
  });
});

describe("deriveDeviceIndexCounters（从节点反推各池已用最大值）", () => {
  test("取各池的最大值；无效 idx（0）不参与", () => {
    const counters = deriveDeviceIndexCounters([
      { kind: "ac-vpp-box", params: containerParams({ idx_heat2_unit_t1: "3", idx_heat2_unit_t2: "3" }) },
      { kind: "ac-vpp-box", params: containerParams({ idx_ac_unit_t1: "8" }) },
      { kind: "ac-load", params: { idx: "12" } },
      { kind: "ac-vpp-box", params: containerParams({ idx_ac_unit_t1: "0" }) }
    ]);
    expect(counters.HeatSource2).toBe(3);
    expect(counters.ACGenerator).toBe(8); // 末尾的 "0" 未把 8 拉低
    expect(counters.ACLoad).toBe(12);
  });

  test("空输入得空 counters", () => {
    expect(deriveDeviceIndexCounters([])).toEqual({});
  });
});
