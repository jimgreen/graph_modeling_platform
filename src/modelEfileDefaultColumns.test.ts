// E 段「缺值兜底值」的直接单测（此前 defaultEColumnValue /
// defaultContainerAssociatedColumnValue 均零测试直呼）。
//
// ## 为什么要钉
//
// 这两个函数决定 E 文件里**空值填什么**。填错不会报错 —— 只会让下游 CIM/E 解析器
// 拿到一个"看起来合法、数值却不对"的值（比如负荷的 `pv0` 填成 `0` 而不是 `1.0`，
// 等于凭空造出一个 0 出力负荷）。这是典型的静默数据失真。
//
// ## 层次关系（探针实测）
//
//   defaultEColumnValue(column, rowIndex)            通用兜底
//     ↑ 被 defaultContainerAssociatedColumnValue 先查「section 专用表」，未命中才回落
//     ↑ 也被 formatEColumnValue 在 converter/hydro 的少数几列上直接调用
//
// 两条路径对**同一列**可能给出不同结果（见「ACACConverter 专用」一组），
// 所以必须分别钉住，不能只测其中一个。
import { describe, expect, test } from "vitest";
import { defaultContainerAssociatedColumnValue } from "./model-eexport";

/**
 * `defaultEColumnValue` 是 module-private。用一个**不命中任何专用规则**的 section
 * 去调 `defaultContainerAssociatedColumnValue`，即可间接拿到通用兜底的行为 ——
 * 这也顺带证明了「未命中专用表时确实回落到通用兜底」。
 */
const genericDefault = (column: string, rowIndex = 0) =>
  defaultContainerAssociatedColumnValue("__NoSuchSection__", column, rowIndex);

describe("通用兜底 defaultEColumnValue（经未命中 section 触发）", () => {
  test("idx = rowIndex + 1（**1 起**，不是 0 起）", () => {
    expect(genericDefault("idx", 0)).toBe("1");
    expect(genericDefault("idx", 1)).toBe("2");
    expect(genericDefault("idx", 9)).toBe("10");
    expect(genericDefault("idx", 99)).toBe("100");
  });

  test("idx 的 rowIndex 边界：负数不按 0 夹紧", () => {
    // 负数 → 0；这在正常导出里不会发生（rowIndex 恒 >= 0），如实记录。
    expect(genericDefault("idx", -1)).toBe("0");
    expect(genericDefault("idx", -5)).toBe("-4");
  });

  test("idx 的 rowIndex 非整数：直接相加不取整", () => {
    expect(genericDefault("idx", 1.5)).toBe("2.5");
  });

  test("name = unnamed_<rowIndex+1>", () => {
    expect(genericDefault("name", 0)).toBe("unnamed_1");
    expect(genericDefault("name", 4)).toBe("unnamed_5");
    // name 同样用 rowIndex+1，与 idx 对齐
    expect(genericDefault("name", 4).slice("unnamed_".length)).toBe(genericDefault("idx", 4));
  });

  test("开关量与控制类型列的固定默认值", () => {
    expect(genericDefault("run_stat")).toBe("1");
    expect(genericDefault("status")).toBe("1");
    expect(genericDefault("control_type")).toBe("0");
    expect(genericDefault("i_control_type")).toBe("NONE");
    expect(genericDefault("j_control_type")).toBe("NONE");
    expect(genericDefault("ac_control_type")).toBe("PQ");
    expect(genericDefault("dc_control_type")).toBe("V");
  });

  test("调压/电压/容量类列 = 1.0", () => {
    for (const column of ["tap", "tap1", "tap2", "tap3", "alpha", "voltage", "vbase"]) {
      expect(genericDefault(column), column).toBe("1.0");
    }
  });

  test("其余一切列 = \"0\"（含未知列与空列名）", () => {
    for (const column of ["unknown_col", "", "IXX", "Idx", "IDX", "vbase2", "tap4", "i_vbase", "dev_type", "parent", "ist"]) {
      expect(genericDefault(column), column).toBe("0");
    }
  });

  test("**大小写敏感**：`Idx` 不是 `idx`", () => {
    // 这条容易被"顺手"改成 toLowerCase 而破坏 —— E 段列名是字面量契约。
    expect(genericDefault("Idx")).toBe("0");
    expect(genericDefault("idx", 0)).toBe("1");
  });

  test("`tap[123]` 用正则，其余 `tapN` 不算（tap4 → 0）", () => {
    expect(genericDefault("tap1")).toBe("1.0");
    expect(genericDefault("tap2")).toBe("1.0");
    expect(genericDefault("tap3")).toBe("1.0");
    expect(genericDefault("tap4")).toBe("0");
    expect(genericDefault("tap0")).toBe("0");
    expect(genericDefault("tap12")).toBe("0");
  });
});

describe("section 专用覆盖层（defaultContainerAssociatedColumnValue）", () => {
  test("负荷段 ACLoad / DCLoad：pv0 与 qv0 = 1.0，其余 pv/qv = 0.0", () => {
    for (const section of ["ACLoad", "DCLoad"]) {
      expect(defaultContainerAssociatedColumnValue(section, "pv0", 0), section).toBe("1.0");
      expect(defaultContainerAssociatedColumnValue(section, "qv0", 0), section).toBe("1.0");
      for (const column of ["pv1", "pv2", "qv1", "qv2"]) {
        expect(defaultContainerAssociatedColumnValue(section, column, 0), `${section}.${column}`).toBe("0.0");
      }
    }
  });

  test("★ 负荷专用值确实**覆盖**了通用兜底（pv0：1.0 vs 0）", () => {
    // 通用兜底给 pv0 的值是 "0"（不在 tap/alpha/voltage/vbase 名单里）。
    // 若某天专用规则被删，负荷会凭空多出 4 个 0 出力测点 —— 静默失真。
    expect(genericDefault("pv0")).toBe("0");
    expect(genericDefault("pv1")).toBe("0");
    expect(defaultContainerAssociatedColumnValue("ACLoad", "pv0")).toBe("1.0");
    expect(defaultContainerAssociatedColumnValue("ACLoad", "pv1")).toBe("0.0");
  });

  test("发电段控制类型：ACGenerator=PV / DCGenerator=P", () => {
    expect(defaultContainerAssociatedColumnValue("ACGenerator", "control_type")).toBe("PV");
    expect(defaultContainerAssociatedColumnValue("DCGenerator", "control_type")).toBe("P");
    // 通用兜底给 control_type 的值是 "0"
    expect(genericDefault("control_type")).toBe("0");
  });

  test("氢能段控制类型：HydroSource / HydroLoad 都是 FLOW", () => {
    expect(defaultContainerAssociatedColumnValue("HydroSource", "control_type")).toBe("FLOW");
    expect(defaultContainerAssociatedColumnValue("HydroLoad", "control_type")).toBe("FLOW");
  });

  test("供热段：HeatSource / HeatSource2 的 supply_temperature_set = 95", () => {
    expect(defaultContainerAssociatedColumnValue("HeatSource", "supply_temperature_set")).toBe("95");
    expect(defaultContainerAssociatedColumnValue("HeatSource2", "supply_temperature_set")).toBe("95");
    expect(genericDefault("supply_temperature_set")).toBe("0");
  });

  test("**供热段的 control_type 没有专用规则**（→ 通用 \"0\"）", () => {
    // 探针实测：HeatSource.control_type 走的是通用兜底，不是 FLOW。
    // 容易想当然地以为"所有源都 FLOW"，所以显式钉住。
    expect(defaultContainerAssociatedColumnValue("HeatSource", "control_type")).toBe("0");
    expect(defaultContainerAssociatedColumnValue("HeatSource2", "control_type")).toBe("0");
    expect(defaultContainerAssociatedColumnValue("ACSubstation", "control_type")).toBe("0");
  });

  test("未登记的 section 完全走通用兜底（与逐列核对一致）", () => {
    const sections = ["ACSubstation", "ACBus", "ACTransfomer3", "ACTransformer", "", "acload"];
    const columns = ["idx", "name", "pv0", "qv0", "pv1", "control_type", "supply_temperature_set", "unknown"];
    for (const section of sections) {
      for (const column of columns) {
        for (const rowIndex of [0, 3]) {
          expect(
            defaultContainerAssociatedColumnValue(section, column, rowIndex),
            `${section}.${column}@${rowIndex}`
          ).toBe(genericDefault(column, rowIndex));
        }
      }
    }
  });

  test("**section 名大小写敏感**：`acload` 不等于 `ACLoad`", () => {
    expect(defaultContainerAssociatedColumnValue("acload", "pv0")).toBe("0");
    expect(defaultContainerAssociatedColumnValue("ACLoad", "pv0")).toBe("1.0");
  });

  test("rowIndex 默认值是 0（可省略第三参）", () => {
    expect(defaultContainerAssociatedColumnValue("ACLoad", "pv0")).toBe(
      defaultContainerAssociatedColumnValue("ACLoad", "pv0", 0)
    );
    // 专用规则不看 rowIndex，只有 idx / name 受它影响
    expect(defaultContainerAssociatedColumnValue("ACLoad", "idx")).toBe("1");
    expect(defaultContainerAssociatedColumnValue("ACLoad", "name")).toBe("unnamed_1");
  });
});
