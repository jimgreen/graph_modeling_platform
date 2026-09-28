// 容器端子关联「归一 + 校验」两层的直接单测。
//
// 归一层（customDeviceUtils）与校验层（model）在 `appDeviceDefinitionFactories` 里
// 成对调用：**先 normalize 再 validate**。normalize 是「修复者」，validate 是「拒绝者」。
// 两层职责搞混会静默放过非法配置，容器端子类型/电源角色错配 → 导出与拓扑全错但不报错。
//
// 本文件钉住四条实测契约（均非缺陷，误判成 bug 反而危险）：
//
// ① **两层的严格程度悬殊**（本文件最重要的一条）：
//    `validateContainerTerminalRoles` **不检查端子类型** ——
//    `["ac","ac"] + ["double-source","single-load"]` 判 VALID（探针实测）；
//    而 `validateContainerTerminalAssociations` **严格检查** ——
//    配对端子类型不符（heat+dc / heat+ac / heat+h2）一律拒绝。
//    role 只是「源荷 + 单双端」的粗粒度标签，type 合法性由 association 层兜住。
//
// ② `normalizeContainerTerminalAssociations` 是 validate 第 4 类拒绝
//    （「从属槽关联属性应为空」）的**前置修复者**：它会强制把从属槽置空，
//    所以该拒绝在正常调用链上不可达，是防御性检查。探针实测：
//    `["heat2-source","heat-load"]` 归一后成 `["heat2-source",""]` → validate 通过；
//    不归一直接校验则 INVALID。两条路径都已钉住。
//
// ③ 补齐与非法回退用的默认值恒为 **source 侧**（`OPTIONS[type][0].value`）：
//    ac-generator / dc-generator / h2-source / heat-source。
//
// ④ `validateContainerTerminalRoles` 对非法角色、角色数组短于端子数组一律 VALID ——
//    它只判「双端是否占了不存在的下一个端子」这一件事。
//
// 另记：`isAssociationAllowedForTerminal` / `defaultContainerAssociationForTerminalType`
// 传非法 TerminalType（如 "heat2"）会因 `OPTIONS[type]` 为 undefined 而抛 TypeError。
// **不修**：`TerminalType` 只有 ac/dc/h2/heat 四个值，类型系统已保证，防御属过度
// （与「已取证不修」的 containerAssociatedDeviceName 非字符串 params 同理）。
import { describe, expect, test } from "vitest";
import {
  normalizeContainerTerminalAssociations,
  isAssociationAllowedForTerminal
} from "./customDeviceUtils";
import {
  validateContainerTerminalRoles,
  validateContainerTerminalAssociations
} from "./model";
import type { ContainerTerminalAssociationValue, TerminalType } from "./model";

describe("defaultContainerAssociationForTerminalType（经 normalize 补齐/回退时用的默认值）", () => {
  test("四个端子类型的默认关联恒为 **source 侧**（探针实测）", () => {
    // normalizeContainerTerminalAssociations 内部用它给缺失槽补值 / 给非法值回退，
    // 取的是 CONTAINER_TERMINAL_ASSOCIATION_OPTIONS[type][0].value —— 即 source 那一项。
    const defaults: Record<string, string> = {
      ac: "ac-generator",
      dc: "dc-generator",
      h2: "h2-source",
      heat: "heat-source"
    };
    for (const [type, expected] of Object.entries(defaults)) {
      const normalized = normalizeContainerTerminalAssociations([type as TerminalType], [], 1);
      expect(normalized[0], type).toBe(expected);
    }
  });
});

describe("isAssociationAllowedForTerminal（逐项合法性白名单）", () => {
  test("同能流的关联放行", () => {
    expect(isAssociationAllowedForTerminal("ac", "ac-load")).toBe(true);
    expect(isAssociationAllowedForTerminal("ac", "ac-generator")).toBe(true);
    expect(isAssociationAllowedForTerminal("dc", "dc-generator")).toBe(true);
    expect(isAssociationAllowedForTerminal("h2", "h2-load")).toBe(true);
  });

  test("heat 端子**允许**双端口 heat2-*（探针实测）", () => {
    expect(isAssociationAllowedForTerminal("heat", "heat2-source")).toBe(true);
    expect(isAssociationAllowedForTerminal("heat", "heat-source")).toBe(true);
    expect(isAssociationAllowedForTerminal("heat", "heat-load")).toBe(true);
  });

  test("跨能流、空串、未知值一律 false", () => {
    expect(isAssociationAllowedForTerminal("ac", "dc-load")).toBe(false);
    expect(isAssociationAllowedForTerminal("ac", "heat2-source")).toBe(false);
    expect(isAssociationAllowedForTerminal("ac", "")).toBe(false);
    expect(isAssociationAllowedForTerminal("ac", "不存在的" as never)).toBe(false);
  });
});

describe("normalizeContainerTerminalAssociations（修复者：补齐/截断/置空/回退）", () => {
  test("① 补齐到 terminalCount，缺值用默认（source 侧）关联", () => {
    expect(normalizeContainerTerminalAssociations(["heat", "ac"], [], 3))
      .toEqual(["heat-source", "ac-generator", "ac-generator"]);
  });

  test("② 截断到 terminalCount（多出来的槽被丢弃）", () => {
    expect(normalizeContainerTerminalAssociations(["heat"], ["heat-source", "heat-load", "ac-load"] as never, 1))
      .toEqual(["heat-source"]);
  });

  test("③ **强制把从属槽置空**（前一槽是双端口时）", () => {
    // 这是 validate 第 4 类拒绝的前置修复，探针实测 heat-load 被抹成 ""
    expect(normalizeContainerTerminalAssociations(["heat", "heat"], ["heat2-source", "heat-load"], 2))
      .toEqual(["heat2-source", ""]);
  });

  test("③ 前一槽**非**双端口时不置空，保留自身关联", () => {
    // 第 3 槽的前一槽是 heat-load（单端口），故 heat-load 保留
    expect(normalizeContainerTerminalAssociations(["heat", "heat", "heat"], ["heat2-source", "", "heat-load"], 3))
      .toEqual(["heat2-source", "", "heat-load"]);
  });

  test("④ 非法关联回退默认：未知值 / 空串 / 跨能流", () => {
    expect(normalizeContainerTerminalAssociations(["heat"], ["不存在的" as never], 1)).toEqual(["heat-source"]);
    expect(normalizeContainerTerminalAssociations(["ac"], [""], 1)).toEqual(["ac-generator"]);
    expect(normalizeContainerTerminalAssociations(["ac"], ["dc-load"], 1)).toEqual(["ac-generator"]);
  });

  test("⑤ 不改入参（先 slice 拷贝，调用方的原数组安全）", () => {
    const original: ContainerTerminalAssociationValue[] = ["heat2-source", "heat-load"];
    const out = normalizeContainerTerminalAssociations(["heat", "heat"], original, 2);
    expect(original).toEqual(["heat2-source", "heat-load"]); // 未被就地抹空
    expect(out).toEqual(["heat2-source", ""]);
    expect(out).not.toBe(original);
  });

  test("归一后 validate 必过 —— 坐实「修复者是拒绝者的前置」关系（探针实测）", () => {
    const types: TerminalType[] = ["heat", "heat"];
    const dirty: ContainerTerminalAssociationValue[] = ["heat2-source", "heat-load"];
    // 不归一直接校验 → 被拒
    expect(validateContainerTerminalAssociations(types, dirty).valid).toBe(false);
    // 归一后再校验 → 通过
    const normalized = normalizeContainerTerminalAssociations(types, dirty, 2);
    expect(normalized).toEqual(["heat2-source", ""]);
    expect(validateContainerTerminalAssociations(types, normalized).valid).toBe(true);
  });
});

describe("validateContainerTerminalRoles（只判双端占位，**不查端子类型**，见文件头①）", () => {
  test("双端放在最后一个端子 → 拒绝（唯一职责）", () => {
    const r = rejected(validateContainerTerminalRoles(["heat"], ["double-source"]) as AssocValidation);
    expect(r.terminalIndex).toBe(0);
    expect(r.message).toContain("最后一个端子");
  });

  test("双端占位合法（第二槽是从属，被跳过）", () => {
    expect(validateContainerTerminalRoles(["heat", "heat"], ["double-source", "double-load"]).valid).toBe(true);
  });

  test("两个独立双端各占一对，合法", () => {
    expect(validateContainerTerminalRoles(
      ["heat", "heat", "heat", "heat"],
      ["double-source", "single-load", "double-load", "single-load"]
    ).valid).toBe(true);
  });

  test("第二个双端落在末位 → 拒绝并指出该端子索引", () => {
    const r = rejected(validateContainerTerminalRoles(["heat", "heat", "heat"], ["double-source", "double-load", "double-source"]) as AssocValidation);
    expect(r.terminalIndex).toBe(2);
  });

  test("**不检查端子类型**：给 ac 端子设双端源也放行（探针实测，与 association 层不同）", () => {
    // 这条是本文件的核心差异断言：roles 层是粗粒度标签校验，
    // type 合法性由 validateContainerTerminalAssociations 兜住。
    expect(validateContainerTerminalRoles(["ac", "ac"], ["double-source", "single-load"]).valid).toBe(true);
  });

  test("非法角色 / 角色数组缺省或短于端子数组 → 一律放行（只判双端占位）", () => {
    expect(validateContainerTerminalRoles(["heat"], ["不存在的角色" as never]).valid).toBe(true);
    expect(validateContainerTerminalRoles(["heat", "heat", "heat"], ["double-source"]).valid).toBe(true);
    expect(validateContainerTerminalRoles(["heat"], []).valid).toBe(true);
    expect(validateContainerTerminalRoles([], []).valid).toBe(true);
  });
});

type AssocValidation = ReturnType<typeof validateContainerTerminalAssociations>;

/**
 * 断言「被拒绝」并返回拒绝详情。
 * validate* 返回 `{valid:true} | {valid:false; message; terminalIndex}` 联合类型，
 * 直接访问 terminalIndex 需要先窄化 —— 顺带在失败时打印实际结果，比裸属性访问更好排查。
 */
function rejected(result: AssocValidation) {
  if (result.valid) {
    throw new Error(`期望被拒绝，实际放行：${JSON.stringify(result)}`);
  }
  return result;
}

describe("validateContainerTerminalAssociations（四类拒绝，逐类钉住）", () => {
  test("第 1 类：端子能流与关联不匹配", () => {
    const r = rejected(validateContainerTerminalAssociations(["ac"], ["dc-load"]));
    expect(r.terminalIndex).toBe(0);
    expect(r.message).toContain("交流设备");
  });

  test("第 2 类：双端口关联落在最后一个端子", () => {
    const r = rejected(validateContainerTerminalAssociations(["heat"], ["heat2-source"]));
    expect(r.terminalIndex).toBe(0);
    expect(r.message).toContain("最后一个端子");
  });

  test("第 3 类：**配对端子类型不匹配**（heat 配 dc/ac/h2 均拒绝）", () => {
    for (const pair of [["heat", "dc"], ["heat", "ac"], ["heat", "h2"]] as const) {
      const r = rejected(validateContainerTerminalAssociations(pair as unknown as TerminalType[], ["heat2-source", ""]));
      // 拒绝的是**配对端子**（索引 1），不是发起端
      expect(r.terminalIndex, pair.join("+")).toBe(1);
      expect(r.message).toContain("端子2必须是热能设备端口");
    }
  });

  test("第 3 类：配对端子不匹配时优先于后续槽位的错误报告", () => {
    // 端子2类型错 → 先报端子2，端子3的双端口末位问题轮不到
    const r = rejected(validateContainerTerminalAssociations(
      ["heat", "dc", "heat"] as TerminalType[],
      ["heat2-source", "", "heat2-load"]
    ));
    expect(r.terminalIndex).toBe(1);
  });

  test("第 4 类：从属槽填了非空关联（任意值都算，不只是重复值）", () => {
    const fillings: ContainerTerminalAssociationValue[] = ["heat-load", "heat2-source", "ac-load"];
    for (const filled of fillings) {
      const r = rejected(validateContainerTerminalAssociations(["heat", "heat"], ["heat2-source", filled]));
      expect(r.terminalIndex, filled).toBe(1);
      expect(r.message, filled).toContain("关联属性应为空");
    }
  });

  test("正常形态放行：单端口 / 双端口 + 空从属槽 / h2 与 ac 各能流", () => {
    expect(validateContainerTerminalAssociations(["heat", "heat"], ["heat2-source", ""]).valid).toBe(true);
    expect(validateContainerTerminalAssociations(["heat", "heat"], ["heat2-load", ""]).valid).toBe(true);
    expect(validateContainerTerminalAssociations(["h2", "h2"], ["h2-source", ""]).valid).toBe(true);
    expect(validateContainerTerminalAssociations(["ac", "ac"], ["ac-load", ""]).valid).toBe(true);
    // 关联数组全缺省 → 逐槽用默认关联推导，也放行
    expect(validateContainerTerminalAssociations(["heat", "heat"], []).valid).toBe(true);
  });
});
