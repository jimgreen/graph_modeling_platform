// describeContainerTerminalAssociations 的从属槽分支与容错兜底分支直接单测。
//
// 它是 `containerAssociatedDeviceIdentityForTerminal` 的**唯一数据源** —— 后者用
// `sourceAssociation.relationKey` 去读容器 params 里的设备 idx。relationKey 算错，
// 读到的就是别的设备的 idx → 量测绑定到错误设备，且**全程不报错**。
//
// 现有 6 处直呼只覆盖三类：非容器返回 `[]`、三绕组变压器分支、单端口容器正常分支。
// **从属槽分支与「正则模糊兜底」分支此前零直接覆盖**，本文件补这两处。
//
// 钉住的实测契约（均非缺陷，误判成 bug 反而危险）：
//
// ① **正则模糊兜底会以 definitions 为准**（容错优先的取舍）：算出的
//    expectedRelationKey 若在 parameterDefinitions 里找不到，就用
//    `^idx_.+_t{index+1}$` 模糊匹配兜底。探针实测：definitions 里只有
//    `idx_ac_load_t1` 而算出的是 `idx_ac_unit_t1` 时，relationKey 取
//    **`idx_ac_load_t1`**、deviceModel 取 **ACLoad**，而 roleLabel 仍来自
//    terminalRoles。看似矛盾的组合是既定行为，用于兼容老数据/手改的键名。
//    误当成 bug 去「修正」会打断老数据兼容。
// ② **从属槽 relationKey 恒为空串**，且**不参与**正则兜底（即使 definitions 里有
//    `idx_heat2_unit_t2`）。从属槽只报 `随端子N关联X`，其 idx 由源槽持有。
// ③ `terminalTypes` 可以短于 `terminalCount`，缺的部分由**必填的** `terminalType` 补齐
//    （`templateTerminalTypes`）。故不存在「某端子无类型」的情形 ——
//    我第一版探针漏传必填的 terminalType，产出了 `idx_undefined_load_t2` 这种
//    垃圾键，是**探针的错**不是实现缺陷。
// ④ 变压器关系键（`idx_xf_tN` 或任意 `*_transformer_tN`）→ deviceModel **硬编码**
//    "ACTransformer"、roleLabel "双绕组主变首端"，relationName 直接用 definitions 的
//    cnName。注意关联值里**没有** transformer 变体 —— 变压器是按 relationKey 识别的。
// ⑤ 两条路径的 roleLabel 不同：roles 路径给"双端源"，associations 路径给"双端热源"。
//
// **最容易读错的一条**（探针纠正）：`getContainerRelationKey` 里
// `single-*` → 无 "2"、`double-*` → 带 "2"，而 `*source` → **`unit`**、`*load` → **`load`**。
// 「源/荷」体现在 unit/load，**不分 generator**。故
// `idx_ac_generator_t1` 是**非法**关系键（parse=null、counterKey=""），
// deviceModel 会是空串 —— 而空串会让 `containerAssociatedDeviceIdentityForTerminal`
// 返回 undefined，**不会错绑设备**。这条安全链已单独钉住。
import { describe, expect, test } from "vitest";
import {
  describeContainerTerminalAssociations,
  getContainerRelationKey,
  parseContainerRelationField,
  containerRelationCounterKey,
  containerAssociatedDeviceIdentityForTerminal
} from "./model";
import type {
  ContainerTerminalAssociationValue,
  ContainerTerminalRole,
  DeviceTemplate,
  Terminal,
  TerminalType
} from "./model";

/** 按 DeviceTemplate 的**全部必填字段**构造容器模板（少传必填字段会造出假警报） */
const containerTemplate = (over: Partial<DeviceTemplate> = {}): DeviceTemplate => ({
  kind: "customContainer",
  label: "自定义容器",
  categoryLibrary: "自建元件",
  size: { width: 100, height: 100 },
  params: {},
  terminalType: "ac",
  terminalCount: 2,
  isContainer: true,
  ...over
} as DeviceTemplate);

describe("getContainerRelationKey（源/荷体现在 unit/load，不分 generator）", () => {
  test("single-* 无 2 后缀、double-* 带 2 后缀", () => {
    expect(getContainerRelationKey("ac", "single-source", 0)).toBe("idx_ac_unit_t1");
    expect(getContainerRelationKey("ac", "double-source", 0)).toBe("idx_ac2_unit_t1");
    expect(getContainerRelationKey("ac", "single-load", 0)).toBe("idx_ac_load_t1");
    expect(getContainerRelationKey("ac", "double-load", 0)).toBe("idx_ac2_load_t1");
  });

  test("端子序号 1-based：t{index+1}", () => {
    expect(getContainerRelationKey("ac", "single-source", 1)).toBe("idx_ac_unit_t2");
    expect(getContainerRelationKey("heat", "double-source", 1)).toBe("idx_heat2_unit_t2");
    expect(getContainerRelationKey("h2", "double-load", 0)).toBe("idx_h22_load_t1");
  });

  test("**idx_ac_generator_t1 是非法关系键**（role 段不接受 generator）", () => {
    expect(parseContainerRelationField("idx_ac_generator_t1")).toBeNull();
    expect(containerRelationCounterKey("idx_ac_generator_t1")).toBe("");
    // 合法对照
    expect(containerRelationCounterKey("idx_ac_unit_t1")).toBe("ACGenerator");
  });
});

describe("describeContainerTerminalAssociations 的守卫分支", () => {
  test("非容器 / terminalCount<=0 → 空数组（现有覆盖之外的边界：terminalCount=0）", () => {
    expect(describeContainerTerminalAssociations(
      containerTemplate({ isContainer: false, terminalTypes: ["ac"] })
    )).toEqual([]);
    expect(describeContainerTerminalAssociations(
      containerTemplate({ terminalCount: 0, terminalTypes: [] })
    )).toEqual([]);
  });
});

describe("从属槽（dependent）分支", () => {
  test("② 双端口第二槽：relationKey 为空、sourceTerminalIndex 指向源槽、dependent=true", () => {
    const list = describeContainerTerminalAssociations(containerTemplate({
      terminalTypes: ["heat", "heat"],
      terminalRoles: ["double-source", "single-load"] as ContainerTerminalRole[]
    }));
    expect(list[1]).toMatchObject({
      terminalIndex: 1,
      relationKey: "",
      sourceTerminalIndex: 0,
      dependent: true,
      // deviceModel 仍给出源槽的模型（读它的人据此知道这些端子共用一个设备）
      deviceModel: "HeatSource2"
    });
  });

  test("② relationName 固定为「随端子N关联X」（N 是 1-based 的源槽序号）", () => {
    const list = describeContainerTerminalAssociations(containerTemplate({
      terminalTypes: ["heat", "heat"],
      terminalAssociations: ["heat2-source", ""] as ContainerTerminalAssociationValue[]
    }));
    expect(list[1].relationName).toBe("随端子1关联双端热源");
  });

  test("② **从属槽不参与正则兜底**：definitions 里有 idx_heat2_unit_t2 也拿不到", () => {
    const list = describeContainerTerminalAssociations(containerTemplate({
      terminalTypes: ["heat", "heat"],
      terminalRoles: ["double-source", "single-load"] as ContainerTerminalRole[],
      parameterDefinitions: [{ enName: "idx_heat2_unit_t2", cnName: "t2定义" }] as never
    }));
    expect(list[0].relationKey).toBe("idx_heat2_unit_t1");
    // 关键：从属槽的 relationKey 恒为空，不因 definitions 里有对应键而改变
    expect(list[1].relationKey).toBe("");
  });
});

describe("正则模糊兜底分支（容错优先，见文件头①）", () => {
  test("① 算出的键在 definitions 里找不到时，以 definitions 中的同槽键为准", () => {
    // terminalRoles 是「单端源」→ 算出 idx_ac_unit_t1；
    // definitions 里只有 idx_ac_load_t1 → 正则 ^idx_.+_t1$ 匹配上它
    const list = describeContainerTerminalAssociations(containerTemplate({
      terminalTypes: ["ac"],
      terminalRoles: ["single-source"] as ContainerTerminalRole[],
      parameterDefinitions: [{ enName: "idx_ac_load_t1", cnName: "交流负荷关联idx" }] as never
    }));
    expect(list[0].relationKey).toBe("idx_ac_load_t1");
    // deviceModel 随 relationKey 走 → ACLoad
    expect(list[0].deviceModel).toBe("ACLoad");
    // roleLabel 仍来自 terminalRoles → 源角色
    expect(list[0].roleLabel).toBe("单端源");
  });

  test("① 精确命中时优先于正则兜底", () => {
    const list = describeContainerTerminalAssociations(containerTemplate({
      terminalTypes: ["ac"],
      terminalRoles: ["single-source"] as ContainerTerminalRole[],
      parameterDefinitions: [
        { enName: "idx_ac_unit_t1", cnName: "精确匹配" },
        { enName: "idx_ac_load_t1", cnName: "正则候选" }
      ] as never
    }));
    expect(list[0].relationKey).toBe("idx_ac_unit_t1");
    expect(list[0].deviceModel).toBe("ACGenerator");
  });

  test("① definitions 里没有任何同槽键时，落回算出的 expectedRelationKey", () => {
    const list = describeContainerTerminalAssociations(containerTemplate({
      terminalTypes: ["ac"],
      terminalRoles: ["single-source"] as ContainerTerminalRole[],
      parameterDefinitions: [{ enName: "i_r", cnName: "无关参数" }] as never
    }));
    expect(list[0].relationKey).toBe("idx_ac_unit_t1");
  });

  test("① 非法关系键被兜底挑中时 deviceModel 为空串（下游据此拒绝错绑）", () => {
    const list = describeContainerTerminalAssociations(containerTemplate({
      terminalTypes: ["ac"],
      terminalRoles: ["single-source"] as ContainerTerminalRole[],
      parameterDefinitions: [{ enName: "idx_ac_generator_t1", cnName: "非法键" }] as never
    }));
    expect(list[0].relationKey).toBe("idx_ac_generator_t1");
    expect(list[0].deviceModel).toBe("");
  });
});

describe("containerAssociatedDeviceIdentityForTerminal 的下游拒绝（安全链）", () => {
  // Terminal 的必填字段是 id/label/type/anchor/nodeNumber（无 index 字段），
  // 这里按真实类型补齐，不用 as 绕过检查。
  const nodeWith = (params: Record<string, string>, terminalCount = 1) => ({
    name: "C",
    terminals: Array.from({ length: terminalCount }, (_, i): Terminal => ({
      id: `t${i + 1}`,
      label: `端子${i + 1}`,
      type: "ac",
      anchor: { x: 0, y: 0 },
      nodeNumber: String(i + 1)
    })),
    params
  });
  const tplWith = (enName: string, over: Partial<DeviceTemplate> = {}) => containerTemplate({
    terminalCount: 1,
    terminalTypes: ["ac"],
    terminalRoles: ["single-source"] as ContainerTerminalRole[],
    parameterDefinitions: [{ enName, cnName: enName }] as never,
    ...over
  });

  test("正常身份：relationKey + deviceModel + index 三者齐备", () => {
    const identity = containerAssociatedDeviceIdentityForTerminal(
      nodeWith({ idx_ac_unit_t1: "7" }),
      tplWith("idx_ac_unit_t1"),
      "t1"
    );
    expect(identity).toEqual({
      terminalId: "t1",
      relationKey: "idx_ac_unit_t1",
      deviceModel: "ACGenerator",
      index: "7",
      deviceId: "ACGenerator-7",
      name: "C_端子1交流电源"
    });
  });

  test("**非法关系键（generator）→ deviceModel 空串 → 整体被拒，不会错绑设备**", () => {
    // 兜底挑中了 idx_ac_generator_t1，但它不是合法关系字段名 → counterKey 为 ""
    expect(containerAssociatedDeviceIdentityForTerminal(
      nodeWith({ idx_ac_generator_t1: "7" }),
      tplWith("idx_ac_generator_t1"),
      "t1"
    )).toBeUndefined();
  });

  test("缺 index → 拒绝（没有设备可绑）", () => {
    expect(containerAssociatedDeviceIdentityForTerminal(
      nodeWith({}), tplWith("idx_ac_unit_t1"), "t1"
    )).toBeUndefined();
  });

  test("terminalId 越界 / 空 → 拒绝", () => {
    const tpl = tplWith("idx_ac_unit_t1", { terminalCount: 2, terminalTypes: ["ac", "ac"] });
    const node = nodeWith({ idx_ac_unit_t1: "7" }, 2);
    expect(containerAssociatedDeviceIdentityForTerminal(node, tpl, "t9")).toBeUndefined();
    expect(containerAssociatedDeviceIdentityForTerminal(node, tpl, "")).toBeUndefined();
    expect(containerAssociatedDeviceIdentityForTerminal(node, tpl, undefined)).toBeUndefined();
  });
});

describe("终端类型与角色标签", () => {
  test("③ terminalTypes 短于 terminalCount 时由必填的 terminalType 补齐", () => {
    const list = describeContainerTerminalAssociations(containerTemplate({
      terminalCount: 3,
      terminalTypes: ["heat", "heat"] as TerminalType[],
      terminalRoles: ["double-source", "single-load", "single-load"] as ContainerTerminalRole[]
    }));
    expect(list).toHaveLength(3);
    expect(list[2]).toMatchObject({
      terminalIndex: 2,
      relationKey: "idx_ac_load_t3",
      terminalType: "ac",
      deviceModel: "ACLoad"
    });
  });

  test("⑤ 两条路径的 roleLabel 不同（associations 用关联标签，roles 用角色标签）", () => {
    const viaRoles = describeContainerTerminalAssociations(containerTemplate({
      terminalTypes: ["heat"],
      terminalRoles: ["double-source"] as ContainerTerminalRole[]
    }));
    const viaAssociations = describeContainerTerminalAssociations(containerTemplate({
      terminalTypes: ["heat"],
      terminalAssociations: ["heat2-source"] as ContainerTerminalAssociationValue[]
    }));
    expect(viaRoles[0].roleLabel).toBe("双端源");
    expect(viaAssociations[0].roleLabel).toBe("双端热源");
  });

  test("terminalLabels 覆盖默认标签，并进入 relationName", () => {
    const list = describeContainerTerminalAssociations(containerTemplate({
      terminalTypes: ["ac"],
      terminalRoles: ["single-source"] as ContainerTerminalRole[],
      terminalLabels: ["自定义端子名"]
    }));
    expect(list[0].terminalLabel).toBe("自定义端子名");
    expect(list[0].relationName).toBe("自定义端子名单端源关联idx");
  });
});

describe("变压器关系键的硬编码分支（见文件头④）", () => {
  test("idx_xf_tN → deviceModel 硬编码 ACTransformer、roleLabel 双绕组主变首端", () => {
    const list = describeContainerTerminalAssociations(containerTemplate({
      terminalTypes: ["ac"],
      terminalRoles: ["single-source"] as ContainerTerminalRole[],
      parameterDefinitions: [{ enName: "idx_xf_t1", cnName: "主变首端" }] as never
    }));
    expect(list[0]).toMatchObject({
      relationKey: "idx_xf_t1",
      deviceModel: "ACTransformer",
      roleLabel: "双绕组主变首端",
      relationName: "主变首端"
    });
  });

  test("*_transformer_tN 形式同样命中（不限于 idx_xf）", () => {
    const list = describeContainerTerminalAssociations(containerTemplate({
      terminalTypes: ["ac"],
      terminalRoles: ["single-source"] as ContainerTerminalRole[],
      parameterDefinitions: [{ enName: "idx_heat2_transformer_t1", cnName: "变压器" }] as never
    }));
    expect(list[0]).toMatchObject({
      relationKey: "idx_heat2_transformer_t1",
      deviceModel: "ACTransformer",
      roleLabel: "双绕组主变首端",
      relationName: "变压器"
    });
  });
});
