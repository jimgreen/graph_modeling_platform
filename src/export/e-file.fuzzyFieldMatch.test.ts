// export/e-file.ts 的元件定义字段匹配直测 —— findMatchingField 的模糊分支
// （684-697）在覆盖率报告里是 0 覆盖。
//
// ## 覆盖的是什么
//
// `applyEDeviceDefinitionSectionsToLibraryState` 会为每个元件类算出一个「字段顺序表」
// `eDeviceDefinitionFieldOrder[class]`：模板段里写的每个字段，要么对上元件的真实参数名，
// 要么原样留作占位。这张表直接决定 E 文件的列序与取值。
//
// 匹配分两级：
//   1. exact：模板字段的 exportName/sourceName 与元件字段的 exportName 精确相等；
//   2. fuzzy：退到按 cnName（中文名）等键的集合交集去猜。
//
// ## 为什么顺带钉「不生效」的行为
//
// 下面的实测显示：模板段的 cnName **不会**被反向用来修正占位名
// （`@ 占位` + `// p` 最终仍得到 `占位`）。这不是 bug 的证据，只是当前实现的事实 —
// 写出来是为了：将来若有人改这条规则，这里会立刻红，而不是靠记忆。
import { describe, expect, test } from "vitest";

import { DEVICE_LIBRARY } from "../model";
import { parseEDeviceDefinitionFile } from "../model-eexport";
import { applyEDeviceDefinitionSectionsToLibraryState } from "./e-file";

/** 按一段 `<node 类=…>` 模板文本算 ACLoad 的字段顺序表。 */
function fieldOrderFor(fields: string) {
  const sections = parseEDeviceDefinitionFile(`<Model>
@ path name
# 自定义
</Model>
<node 类="ACLoad+交流负荷" 表号="00401">
@ ${fields}
// p
</node>
</Model>
`);
  const state = applyEDeviceDefinitionSectionsToLibraryState({ sections, libraryTemplates: DEVICE_LIBRARY });
  return state.eDeviceDefinitionFieldOrder.ACLoad;
}

describe("模板字段与元件字段的匹配", () => {
  test("★ 英文导出名直接对上元件参数名时用它（p → p）", () => {
    expect(fieldOrderFor("p")).toEqual(["p"]);
  });

  test("★ 匹配不上时原样留作占位（不硬套某个元件字段）", () => {
    expect(fieldOrderFor("压根不存在的字段")).toEqual(["压根不存在的字段"]);
  });

  test("★ cnName 不会被反向用来把占位改成真实参数名（实测事实）", () => {
    // 段的 exportName 是「占位」、cnName 是「p」，但结果仍是「占位」——
    // fuzzy 分支按 sectionKeys ∩ 元件字段键集合匹配，DEVICE_LIBRARY 这条链上没配上。
    expect(fieldOrderFor("占位")).toEqual(["占位"]);
  });

  test("多个不同字段按模板顺序保留", () => {
    expect(fieldOrderFor("p, u, q")).toEqual(["p, u, q"]);
  });

  test("模板段的 tableId 与导出开关被解析并透传", () => {
    const sections = parseEDeviceDefinitionFile(`<Model>
@ path name
# 自定义
</Model>
<node 类="ACLoad+交流负荷" 表号="00401">
@ p
// 有功值
</node>
</Model>
`);
    const state = applyEDeviceDefinitionSectionsToLibraryState({ sections, libraryTemplates: DEVICE_LIBRARY });
    const acLoad = sections.filter((section) => section.componentLibrary === "ACLoad");
    expect(acLoad.length).toBeGreaterThan(0);
    expect(acLoad[0].tableId).toBe("00401");
    expect(state.eDeviceDefinitionClassExportEnabled.ACLoad).toBe(true);
  });
});

describe("模板段解析（parseEDeviceDefinitionFile 的输入形态）", () => {
  test("★ 一段里 @ 与 // 各是一整串逗号串，不是逐字段数组", () => {
    // 这一点决定了匹配代码怎么写：sectionField 是**单对象**，字段名在逗号串里。
    const [section] = parseEDeviceDefinitionFile(`<Model>
@ path name
# 自定义
</Model>
<node 类="ACLoad+交流负荷" 表号="00401">
@ idx,name,dev_type,node
// 序号,名称,类型,节点
</node>
</Model>
`).filter((item) => item.componentLibrary === "ACLoad");
    expect(section.fields).toHaveLength(1);
    expect(section.fields[0]).toEqual({ exportName: "idx,name,dev_type,node", cnName: "序号,名称,类型,节点" });
  });
});

// ─── 「同一个元件字段不会被两个模板字段各取一次」────────────────────────────
//
// `eDeviceInterfaceFieldOrderForRow` 的 `used` 集合既是查找时的排除条件，也是最终去重的唯一依据。
// 该函数现在把每个元件字段的合规键（sourceKey / exportNameKey / fieldKeys）在循环外一次算好、
// 供所有模板字段复用 —— 这条重构的前提正是「这三个键只由字段自身决定，与 `used` 无关」。
// 若哪天有人把 `used` 的过滤一并搬进预计算（例如预计算时就跳过已用的字段），
// 下面两条会立刻红：字段会被第一个模板字段吃掉，第二个只能退到别的字段或占位。
//
// 选用 ACLoad 是因为它同时具备同名的精确键与不同的中文名键，能覆盖两级分支的互动：
// 模板字段 `p/有功值` 精确命中元件字段 `p`；第二个 `p/有功上限` 的精确键同为 `p`（已被 used 排除），
// 只能靠 cnName 在 fuzzy 分支落到 `p_max`。
describe("模板字段重叠时同一个元件字段只会被取一次", () => {
  test("★ 第二个模板字段不再重复取已用的 exact 键，改按 cnName 落到别的字段", () => {
    const sections = parseEDeviceDefinitionFile(`<Model>
@ path name
# 自定义
</Model>
<node 类="ACLoad+交流负荷" 表号="00401">
@ p
// 有功值
@ p
// 有功上限
</node>
</Model>
`);
    const state = applyEDeviceDefinitionSectionsToLibraryState({ sections, libraryTemplates: DEVICE_LIBRARY });
    // 断言「p 只出现一次」+「第二个 p 拿到的是 p_max，而不是 p 或占位 p」
    expect(state.eDeviceDefinitionFieldOrder.ACLoad).toEqual(["p", "p_max"]);
  });

  test("★ 三个重叠模板字段依次取到三个不同元件字段，无一重复", () => {
    const sections = parseEDeviceDefinitionFile(`<Model>
@ path name
# 自定义
</Model>
<node 类="ACLoad+交流负荷" 表号="00401">
@ p
// 有功值
@ p
// 有功上限
@ p
// 有功下限
</node>
</Model>
`);
    const state = applyEDeviceDefinitionSectionsToLibraryState({ sections, libraryTemplates: DEVICE_LIBRARY });
    expect(state.eDeviceDefinitionFieldOrder.ACLoad).toEqual(["p", "p_max", "p_min"]);
  });

  test("同名同中文名的模板字段只产出一次（第二个既不重取也不新增占位）", () => {
    const sections = parseEDeviceDefinitionFile(`<Model>
@ path name
# 自定义
</Model>
<node 类="ACLoad+交流负荷" 表号="00401">
@ p
// 有功值
@ p
// 有功值
</node>
</Model>
`);
    const state = applyEDeviceDefinitionSectionsToLibraryState({ sections, libraryTemplates: DEVICE_LIBRARY });
    expect(state.eDeviceDefinitionFieldOrder.ACLoad).toEqual(["p"]);
  });

  test("★ 只有大小写差异的两个模板字段（p / P）仍只产出一列", () => {
    // 第二个 `P` 在 exact 与 fuzzy 两级都被 used 排除（complianceKey 大小写不敏感），
    // 于是退回占位名 `P`；而占位名要再次经过外层 used 去重，**那道去重同样必须用 complianceKey** ——
    // 若改成直接比原始名，`P` 与已用的 `p` 就不相等，这里会多出一列重复的 `P`。
    const sections = parseEDeviceDefinitionFile(`<Model>
@ path name
# 自定义
</Model>
<node 类="ACLoad+交流负荷" 表号="00401">
@ p
// 有功值
@ P
// 毫不相干的中文名
</node>
</Model>
`);
    const state = applyEDeviceDefinitionSectionsToLibraryState({ sections, libraryTemplates: DEVICE_LIBRARY });
    expect(state.eDeviceDefinitionFieldOrder.ACLoad).toEqual(["p"]);
  });
});