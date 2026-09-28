// 容器端子「双端口依赖」逻辑的直接单测（此前零直呼）。
//
// 背景：双端口设备（heat2-source / heat2-load）一个关联占**两个端子槽**，
// 第二个槽从属于第一个。这类错配的后果是**静默**的：端子类型/电源角色对不上，
// 导出与拓扑计算不报错，只有核对 E 文件或潮流结果才发现。
//
// **最值得钉住的陷阱**（探针实测）：
//   assoc = ["heat2-source", "heat-load", "ac-generator"]
//   索引 1 里存着字面值 "heat-load"，但它是 heat2 的**从属槽**，永远不被读取 ——
//   有效关联来自索引 0。存储值与有效值不一致，是本模块最大的误用陷阱。
import { describe, expect, test } from "vitest";
import {
  isDoubleContainerTerminalAssociation,
  getContainerTerminalAssociationSourceIndex,
  isContainerTerminalAssociationDependent,
  getEffectiveContainerTerminalAssociation,
  getContainerAssociationRelationKey,
  isDoubleContainerTerminalRole,
  getContainerTerminalRoleSourceIndex,
  isContainerTerminalRoleDependent,
  getEffectiveContainerTerminalRole
} from "./model";
import type { ContainerTerminalAssociationValue, ContainerTerminalRole, TerminalType } from "./model";

describe("isDoubleContainerTerminalAssociation（双端口只认 heat2-*）", () => {
  test("heat2-source / heat2-load 为双端口（探针实测）", () => {
    expect(isDoubleContainerTerminalAssociation("heat2-source")).toBe(true);
    expect(isDoubleContainerTerminalAssociation("heat2-load")).toBe(true);
  });

  test("单端口关联一律 false", () => {
    for (const a of ["ac-generator", "ac-load", "dc-generator", "dc-load",
      "h2-source", "h2-load", "heat-source", "heat-load"] as const) {
      expect(isDoubleContainerTerminalAssociation(a), a).toBe(false);
    }
  });

  test("undefined / 未知值返回 false（不抛错）", () => {
    expect(isDoubleContainerTerminalAssociation(undefined)).toBe(false);
    expect(isDoubleContainerTerminalAssociation("不存在的" as never)).toBe(false);
  });
});

describe("isDoubleContainerTerminalRole", () => {
  test("仅 double-* 为双端口", () => {
    expect(isDoubleContainerTerminalRole("double-load")).toBe(true);
    expect(isDoubleContainerTerminalRole("double-source")).toBe(true);
    expect(isDoubleContainerTerminalRole("single-load")).toBe(false);
    expect(isDoubleContainerTerminalRole("single-source")).toBe(false);
  });

  test("undefined / 未知值返回 false", () => {
    expect(isDoubleContainerTerminalRole(undefined)).toBe(false);
    expect(isDoubleContainerTerminalRole("双端" as never)).toBe(false);
  });
});

describe("双端口依赖索引（association 与 role 两套同构）", () => {
  // heat2 占槽 0+1，索引 2 是独立的 ac 端子
  // ContainerTerminalAssociationValue = 类型 | ""（未设置），故从属槽可以合法存任意值
  const assoc: ContainerTerminalAssociationValue[] = ["heat2-source", "heat-load", "ac-generator"];
  const roles: ContainerTerminalRole[] = ["double-source", "single-load", "double-load"];

  test("第二槽从属于第一槽（探针实测）", () => {
    expect(getContainerTerminalAssociationSourceIndex(assoc, 0)).toBe(0);
    expect(getContainerTerminalAssociationSourceIndex(assoc, 1)).toBe(0);
    expect(isContainerTerminalAssociationDependent(assoc, 0)).toBe(false);
    expect(isContainerTerminalAssociationDependent(assoc, 1)).toBe(true);
  });

  test("双端口之后的独立端子不受牵连", () => {
    expect(getContainerTerminalAssociationSourceIndex(assoc, 2)).toBe(2);
    expect(isContainerTerminalAssociationDependent(assoc, 2)).toBe(false);
  });

  test("role 侧结构同构：连续两个双端口各自成对", () => {
    // double-source 占 0+1；double-load 占 2+3
    expect(getContainerTerminalRoleSourceIndex(roles, 0)).toBe(0);
    expect(getContainerTerminalRoleSourceIndex(roles, 1)).toBe(0);
    expect(isContainerTerminalRoleDependent(roles, 1)).toBe(true);
    expect(getContainerTerminalRoleSourceIndex(roles, 2)).toBe(2);
    expect(getContainerTerminalRoleSourceIndex(roles, 3)).toBe(2);
    expect(isContainerTerminalRoleDependent(roles, 3)).toBe(true);
  });

  test("越界索引原样返回自身（探针实测：不 clamp、不报错）", () => {
    // 契约是「原样返回，交给调用方回退」，不是「夹到边界内」
    expect(getContainerTerminalAssociationSourceIndex(assoc, 5)).toBe(5);
    expect(getContainerTerminalAssociationSourceIndex(assoc, -1)).toBe(-1);
    expect(getContainerTerminalRoleSourceIndex(roles, -1)).toBe(-1);
    expect(isContainerTerminalRoleDependent(roles, -1)).toBe(false);
  });
});

describe("getEffectiveContainerTerminalAssociation", () => {
  const assoc: ContainerTerminalAssociationValue[] = ["heat2-source", "heat-load", "ac-generator"];
  const types: TerminalType[] = ["heat", "heat", "ac"];

  test("从属槽继承源槽的关联，而非读自己的存储值（核心陷阱）", () => {
    // idx 1 存着 "heat-load"，但有效值是 idx 0 的 "heat2-source"
    expect(getEffectiveContainerTerminalAssociation(assoc, types, 0)).toBe("heat2-source");
    expect(getEffectiveContainerTerminalAssociation(assoc, types, 1)).toBe("heat2-source");
    expect(getEffectiveContainerTerminalAssociation(assoc, types, 2)).toBe("ac-generator");
  });

  test("无 associations 时按 role + terminalType 推导", () => {
    // double + heat → 双端口热源
    expect(getEffectiveContainerTerminalAssociation(undefined, ["heat"], 0, ["double-source"])).toBe("heat2-source");
    // 从属槽同样继承
    expect(getEffectiveContainerTerminalAssociation(undefined, ["heat"], 1, ["double-source"])).toBe("heat2-source");
    // single + ac → 单端交流电源
    expect(getEffectiveContainerTerminalAssociation(undefined, ["ac"], 0, ["single-source"])).toBe("ac-generator");
  });

  test("role 缺省为 single-load，terminalTypes 越界回退 ac（探针实测）", () => {
    expect(getEffectiveContainerTerminalAssociation(undefined, ["h2"], 0, undefined)).toBe("h2-load");
    expect(getEffectiveContainerTerminalAssociation(undefined, [], 0, ["single-load"])).toBe("ac-load");
  });

  test("h2 即使是 double 也走单端口 h2-*（双端口判定仅在 heat 之后生效）", () => {
    expect(getEffectiveContainerTerminalAssociation(undefined, ["h2"], 0, ["double-source"])).toBe("h2-source");
  });

  test("associations 槽位为 undefined 时回退到按源端子类型推导", () => {
    // 源槽有值但从属槽位置无值 —— 由源槽取值，不该返回 undefined
    const sparse: ContainerTerminalAssociationValue[] = ["heat2-source", "", "ac-generator"];
    expect(getEffectiveContainerTerminalAssociation(sparse, types, 1)).toBe("heat2-source");
  });
});

describe("getEffectiveContainerTerminalRole", () => {
  test("从属槽继承源槽的 role", () => {
    expect(getEffectiveContainerTerminalRole(["double-source"], 1)).toBe("double-source");
    expect(getEffectiveContainerTerminalRole(["single-load"], 1)).toBe("single-load");
  });

  test("空数组 / 越界 / undefined 一律回退 single-load（探针实测）", () => {
    expect(getEffectiveContainerTerminalRole([], 0)).toBe("single-load");
    expect(getEffectiveContainerTerminalRole(undefined, 3)).toBe("single-load");
    expect(getEffectiveContainerTerminalRole(["single-load"], 99)).toBe("single-load");
  });
});

describe("getContainerAssociationRelationKey（关系键含 energyKey / 角色 / 端子序号）", () => {
  test("探针实测的四个样本", () => {
    expect(getContainerAssociationRelationKey("heat2-source", 0)).toBe("idx_heat2_unit_t1");
    expect(getContainerAssociationRelationKey("heat2-load", 1)).toBe("idx_heat2_load_t2");
    expect(getContainerAssociationRelationKey("ac-load", 2)).toBe("idx_ac_load_t3");
    expect(getContainerAssociationRelationKey("dc-generator", 0)).toBe("idx_dc_unit_t1");
  });

  test("unit / load 角色落在不同键空间（不会互相覆盖）", () => {
    expect(getContainerAssociationRelationKey("ac-generator", 0))
      .not.toBe(getContainerAssociationRelationKey("ac-load", 0));
  });

  test("端子序号是 1-based（t{index+1}）", () => {
    expect(getContainerAssociationRelationKey("ac-load", 0)).toMatch(/_t1$/);
    expect(getContainerAssociationRelationKey("ac-load", 1)).toMatch(/_t2$/);
  });
});
