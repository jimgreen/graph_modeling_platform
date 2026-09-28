// 容器关系字段解析与池键映射的直接单测（此前 6 个函数零直呼）。
//
// 这些字段名直接进 E 导出：`idx_<能流>_<角色>_t<端子>` → 池键（设备模型名）→ 设备索引。
// 解析放宽或收紧都会**静默**改变导出结果：设备落到错池 → idx 重号/漂移，
// 流程不报错，只有跑潮流或比对 E 文件才发现。
//
// 本文件钉住三条实测的真实契约（均非缺陷，误以为是 bug 反而危险）：
//   ① 解析正则严格区分大小写、不允许多余下划线，但 `\d+` **允许 t0 与前导零**（t01 → 1）；
//      而 `containerRelationNameKey` 的前缀替换是**幂等**的（name_ 输入原样返回）。
//   ② `containerRelationCounterKey` 有**兜底** `ContainerRelation:<能流>_<角色>`：
//      非 ac 的 transformer 关系（dc/h2/heat/ac2/dc2/h22/heat2_transformer）都能解析，
//      但映射表里没有，全落到兜底键 —— 不是空串。
//   ③ `isContainerTransformerRelationKey` 用的是**宽松后缀** `/_transformer_t\d+$/`，
//      比 `parseContainerRelationField` 宽松（不看能流段合法性与前缀）。
import { describe, expect, test } from "vitest";
import {
  containerCounterKey,
  parseContainerRelationField,
  containerRelationCounterKey,
  isContainerTransformerRelationKey,
  containerRelationNameKey,
  containerAssociatedDeviceName
} from "./model";

describe("containerCounterKey（kind 前缀 → 计数器池键，调用方须先过 isContainerKind）", () => {
  test("三个能流前缀各自命中自己的池", () => {
    expect(containerCounterKey("dc-vpp-box")).toBe("dc_container");
    expect(containerCounterKey("hydrogen-vpp-box")).toBe("hydrogen_container");
    expect(containerCounterKey("heat-vpp-box")).toBe("heat_container");
  });

  test("ac 容器（含未列入前缀表的两个 kind）落 AC 池", () => {
    expect(containerCounterKey("ac-vpp-box")).toBe("ac_container");
    expect(containerCounterKey("ac-switch-box")).toBe("ac_container");
    expect(containerCounterKey("ac-distribution-box")).toBe("ac_container");
  });

  test("非容器 kind 也返回池键（**调用方前置条件**，本函数自己不校验）", () => {
    // 注释明写「调用方须先过 isContainerKind」。探针实测 dc-load 仍会拿到 dc 池、
    // heat（非容器）落到 AC 池。若日后误删调用方的 isContainerKind 守卫会静默串池。
    expect(containerCounterKey("dc-load")).toBe("dc_container");
    expect(containerCounterKey("heat")).toBe("ac_container");
    expect(containerCounterKey("")).toBe("ac_container");
  });
});

describe("parseContainerRelationField（严格正则，见文件头注释①）", () => {
  test("四种能流 × unit/load 的正常解析", () => {
    expect(parseContainerRelationField("idx_ac_unit_t1")).toEqual({
      energy: "ac", role: "unit", terminalNumber: 1, doublePort: false
    });
    expect(parseContainerRelationField("idx_ac_load_t2")).toEqual({
      energy: "ac", role: "load", terminalNumber: 2, doublePort: false
    });
    expect(parseContainerRelationField("idx_h2_load_t1")).toEqual({
      energy: "h2", role: "load", terminalNumber: 1, doublePort: false
    });
  });

  test("带 2 的能流段（ac2/dc2/h22/heat2）标 doublePort=true", () => {
    for (const [f, energy] of [
      ["idx_ac2_unit_t1", "ac2"],
      ["idx_dc2_load_t3", "dc2"],
      ["idx_h22_load_t1", "h22"],
      ["idx_heat2_load_t2", "heat2"]
    ] as const) {
      expect(parseContainerRelationField(f), f).toEqual({
        energy, role: f.includes("load") ? "load" : "unit",
        terminalNumber: Number(f.match(/t(\d+)/)![1]),
        doublePort: true
      });
    }
  });

  test("idx_xf_tN 是变压器的独立分支，恒 energy=ac 且 doublePort=false", () => {
    expect(parseContainerRelationField("idx_xf_t1")).toEqual({
      energy: "ac", role: "transformer", terminalNumber: 1, doublePort: false
    });
    // 多位端子号（探针实测 idx_xf_t12 → 12）
    expect(parseContainerRelationField("idx_xf_t12")?.terminalNumber).toBe(12);
  });

  test("**\\d+ 允许 t0 与前导零**（探针实测 t0 → 0、t01 → 1），非拒绝而是宽松解析", () => {
    expect(parseContainerRelationField("idx_ac_unit_t0")?.terminalNumber).toBe(0);
    expect(parseContainerRelationField("idx_ac_unit_t01")?.terminalNumber).toBe(1);
  });

  test("大小写敏感、不允许多余下划线/尾缀（探针实测全为 null）", () => {
    for (const f of ["IDX_AC_UNIT_T1", "idx_acunit_t1", "idx_ac__unit_t1",
      "idx_ac_unit_t1x", "name_ac_unit_t1", "", "随便"]) {
      expect(parseContainerRelationField(f), f).toBeNull();
    }
  });

  test("heat-source / heat-load 是**关联类型名**不是字段名，不匹配（探针实测 null）", () => {
    // 容易与 containerTerminalAssociationDefinitions 的 key 混淆：
    // 那些是 "heat2-source" 这类关联类型，关系**字段名**的能流段是 heat/heat2。
    expect(parseContainerRelationField("idx_heat_source_t1")).toBeNull();
    expect(parseContainerRelationField("idx_heat_unit_t1")).not.toBeNull();
  });
});

describe("containerRelationCounterKey（映射表 + 兜底，见文件头注释②）", () => {
  test("映射表内 17 个键（探针实测全量）", () => {
    expect(containerRelationCounterKey("idx_ac_unit_t1")).toBe("ACGenerator");
    expect(containerRelationCounterKey("idx_ac_load_t1")).toBe("ACLoad");
    expect(containerRelationCounterKey("idx_ac_transformer_t1")).toBe("ACTransformer");
    expect(containerRelationCounterKey("idx_xf_t1")).toBe("ACTransformer");
    expect(containerRelationCounterKey("idx_ac2_unit_t1")).toBe("TwoPortACGenerator");
    expect(containerRelationCounterKey("idx_ac2_load_t1")).toBe("TwoPortACLoad");
    expect(containerRelationCounterKey("idx_dc_unit_t1")).toBe("DCGenerator");
    expect(containerRelationCounterKey("idx_dc_load_t1")).toBe("DCLoad");
    expect(containerRelationCounterKey("idx_dc2_unit_t1")).toBe("TwoPortDCGenerator");
    expect(containerRelationCounterKey("idx_dc2_load_t1")).toBe("TwoPortDCLoad");
    expect(containerRelationCounterKey("idx_h2_unit_t1")).toBe("HydroSource");
    expect(containerRelationCounterKey("idx_h2_load_t1")).toBe("HydroLoad");
    expect(containerRelationCounterKey("idx_h22_unit_t1")).toBe("TwoPortHydrogenSource");
    expect(containerRelationCounterKey("idx_h22_load_t1")).toBe("TwoPortHydrogenLoad");
    expect(containerRelationCounterKey("idx_heat_unit_t1")).toBe("HeatSource");
    expect(containerRelationCounterKey("idx_heat_load_t1")).toBe("HeatLoad");
    expect(containerRelationCounterKey("idx_heat2_unit_t1")).toBe("HeatSource2");
    expect(containerRelationCounterKey("idx_heat2_load_t1")).toBe("HeatLoad2");
  });

  test("非 ac 的 transformer 关系落**兜底键** ContainerRelation:<能流>_transformer（不是空串）", () => {
    // 探针实测：这些字段 parse 得通、isContainerTransformerRelationKey 也为 true，
    // 但映射表里没有对应键，故全部落到兜底。若误以为「无映射就返回空」会判错。
    for (const [f, key] of [
      ["idx_dc_transformer_t1", "ContainerRelation:dc_transformer"],
      ["idx_h2_transformer_t1", "ContainerRelation:h2_transformer"],
      ["idx_heat_transformer_t1", "ContainerRelation:heat_transformer"],
      ["idx_ac2_transformer_t1", "ContainerRelation:ac2_transformer"],
      ["idx_dc2_transformer_t1", "ContainerRelation:dc2_transformer"],
      ["idx_h22_transformer_t1", "ContainerRelation:h22_transformer"],
      ["idx_heat2_transformer_t3", "ContainerRelation:heat2_transformer"]
    ] as const) {
      expect(containerRelationCounterKey(f), f).toBe(key);
    }
  });

  test("解析不出来的字段名返回空串（此时不是兜底键）", () => {
    expect(containerRelationCounterKey("随便")).toBe("");
    expect(containerRelationCounterKey("")).toBe("");
    expect(containerRelationCounterKey("IDX_AC_UNIT_T1")).toBe("");
  });
});

describe("isContainerTransformerRelationKey（宽松后缀匹配，见文件头注释③）", () => {
  test("idx_xf_tN 与任意 *_transformer_tN 都算变压器关系", () => {
    for (const f of ["idx_xf_t1", "idx_xf_t99", "idx_ac_transformer_t1",
      "idx_heat2_transformer_t3", "完全无关_prefix_transformer_t7"]) {
      expect(isContainerTransformerRelationKey(f), f).toBe(true);
    }
  });

  test("unit/load 关系与畸形后缀不算", () => {
    for (const f of ["idx_ac_unit_t1", "idx_xf_t", "idx_xf_ta", "随便", ""]) {
      expect(isContainerTransformerRelationKey(f), f).toBe(false);
    }
  });
});

describe("containerRelationNameKey（idx_ → name_ 前缀替换，幂等）", () => {
  test("正常替换", () => {
    expect(containerRelationNameKey("idx_ac_unit_t1")).toBe("name_ac_unit_t1");
    expect(containerRelationNameKey("idx_xf_t2")).toBe("name_xf_t2");
  });

  test("**幂等**：已是 name_ 前缀的输入原样返回（^idx_ 不匹配）", () => {
    expect(containerRelationNameKey("name_ac_unit_t1")).toBe("name_ac_unit_t1");
  });

  test("只替换首个前缀；空串与裸前缀的边界", () => {
    expect(containerRelationNameKey("idx_")).toBe("name_");
    expect(containerRelationNameKey("")).toBe("");
  });
});

describe("containerAssociatedDeviceName（params 的 name_* 优先，回退到「容器名_端子标签」）", () => {
  const node = (name: string, params: Record<string, string>) => ({ name, terminals: [], params });

  test("params 里 name_* 有有效值时用该值（并 trim）", () => {
    expect(containerAssociatedDeviceName(node("容器A", { name_ac_unit_t1: "  真实名  " }), "idx_ac_unit_t1"))
      .toBe("真实名");
  });

  test("值为**全空白**时也回退（trim 后为空即视为未设置）", () => {
    expect(containerAssociatedDeviceName(node("容器A", { name_ac_unit_t1: "   " }), "idx_ac_unit_t1"))
      .toBe("容器A_端子1交流电源");
  });

  test("params 缺键时回退（探针实测；键名须是 name_*，写成 name_idx_* 匹配不到）", () => {
    expect(containerAssociatedDeviceName(node("容器A", {}), "idx_ac_unit_t1"))
      .toBe("容器A_端子1交流电源");
    // 键名多带一层 idx_ 前缀 → 视为未设置，回退
    expect(containerAssociatedDeviceName(node("容器A", { name_idx_ac_unit_t1: "错误键名" }), "idx_ac_unit_t1"))
      .toBe("容器A_端子1交流电源");
  });

  test("容器本身无名时兜底为「未命名容器」", () => {
    expect(containerAssociatedDeviceName(node("", {}), "idx_ac_unit_t1"))
      .toBe("未命名容器_端子1交流电源");
  });
});
