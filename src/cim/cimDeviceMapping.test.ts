// CIM/XML 导出：节点 → CIM 设备对象映射（阶段 4a）与 kind→类决策。
//
// 这一步是「图形元件」到「CIM 类」的翻译，选错分支不会抛错、也不会产生非法 XML ——
// 只会安静地发出一个类名不对但结构完整的元素（比如把三绕组主变只发两个绕组），
// 只有拿参考 CIM 文件逐类比对才会发现。故把 kind→class 决策表与各分支的参数
// 口径逐条钉住。
import { describe, expect, test } from "vitest";
import type { DeviceKind, ModelNode } from "../model";
import { buildCimPackage, cimClassForKind } from "./cim-builder";

const node = (kind: DeviceKind, params: Record<string, string> = {}, id = "n1", name = "设备1"): ModelNode =>
  ({
    id,
    kind,
    name,
    params,
    position: { x: 0, y: 0 },
    size: { width: 40, height: 40 },
    rotation: 0,
    scale: 1,
    layerId: "default",
    terminals: []
  }) as unknown as ModelNode;

const pkgOf = (nodes: ModelNode[]) =>
  buildCimPackage({ nodes, edges: [], projectName: "测试模型", modelId: "m1" });

describe("cimClassForKind：kind → CIM 类决策", () => {
  test("线路的四种 kind（含设备型/零支）都发 ACLineSegment", () => {
    for (const kind of ["ac-line", "ac-routable-line", "ac-zero-branch", "ac-zero-routable-branch"] as const) {
      expect(cimClassForKind(kind)).toEqual({ className: "ACLineSegment" });
    }
  });

  test("★ 变压器四个 kind（含中性点变体）都发 PowerTransformer", () => {
    for (const kind of [
      "ac-transformer",
      "ac-two-winding-transformer",
      "ac-three-winding-transformer",
      "ac-three-winding-transformer-neutral"
    ] as const) {
      expect(cimClassForKind(kind).className).toBe("PowerTransformer");
    }
  });

  test("五类负荷都发 EnergyConsumer，四类电源都发 EnergySource", () => {
    for (const kind of ["ac-load", "ac-station-load", "ac-feeder-load", "ac-district-load", "ac-terminal-transformer-load"] as const) {
      expect(cimClassForKind(kind).className).toBe("EnergyConsumer");
    }
    for (const kind of ["ac-source", "ac-station-source", "ac-feeder-source", "ac-district-source"] as const) {
      expect(cimClassForKind(kind).className).toBe("EnergySource");
    }
  });

  test("★ 直流类与未知 kind 一律 skip（CIM16 对 DC 支持不全，退化不发）", () => {
    for (const kind of ["dc-line", "dc-bus", "dc-transformer", "ac-storage-not-exist" as DeviceKind]) {
      expect(cimClassForKind(kind).skip).toBe(true);
    }
  });

  test("开关按 kind 分 Breaker / Disconnector", () => {
    expect(cimClassForKind("ac-breaker").className).toBe("Breaker");
    expect(cimClassForKind("ac-box-breaker").className).toBe("Breaker");
    expect(cimClassForKind("ac-switch").className).toBe("Disconnector");
    expect(cimClassForKind("ac-ground-disconnector").className).toBe("Disconnector");
  });

  test("补偿设备分并联/串联两类", () => {
    expect(cimClassForKind("ac-capacitor").className).toBe("LinearShuntCompensator");
    expect(cimClassForKind("ac-reactor").className).toBe("LinearShuntCompensator");
    expect(cimClassForKind("ac-series-capacitor").className).toBe("SeriesCompensator");
    expect(cimClassForKind("ac-series-reactor").className).toBe("SeriesCompensator");
  });
});

describe("buildCimPackage：母线与线路", () => {
  test("母线按主电压挂到对应 VoltageLevel", () => {
    const bus = node("ac-bus", { vbase: "110" }, "b1", "110kV 母线");
    expect(pkgOf([bus]).busbarSections).toEqual([
      { rdfId: "N_b1", name: "110kV 母线", voltageLevelId: "VL_110" }
    ]);
  });

  test("★ 无电压母线不挂 VoltageLevel（悬挂引用由序列化器省略，不会写出 undefined 资源引用）", () => {
    const bus = node("ac-bus", {}, "b1", "孤立母线");
    expect(pkgOf([bus]).busbarSections[0].voltageLevelId).toBeUndefined();
  });

  test("线路参数走别名优先级（r → r1 → resistance）", () => {
    const line = node("ac-line", { r1: "0.2", resistance: "9", x: "0.4", bch: "0.0001" }, "l1", "线路1");
    const segment = pkgOf([line]).acLineSegments[0];
    expect(segment.r).toBe(0.2);
    expect(segment.x).toBe(0.4);
    expect(segment.bch).toBe(0.0001);
  });

  test("线路参数全缺 → 三个电气量取 0（不是 NaN，NaN 会让 XML 里出现 <r>NaN</r>）", () => {
    const segment = pkgOf([node("ac-line", {}, "l1", "线路1")]).acLineSegments[0];
    expect([segment.r, segment.x, segment.bch]).toEqual([0, 0, 0]);
  });

  test("线路 baseVoltageId 取主电压，电压未登记时挂 BV_UNKNOWN", () => {
    const line = node("ac-line", { vbase: "35" }, "l1", "线路1");
    expect(pkgOf([line]).acLineSegments[0].baseVoltageId).toBe("BV_35");
  });
});

describe("buildCimPackage：变压器与绕组", () => {
  test("两绕组 → 两个 TransformerEnd，endNumber 从 1 起", () => {
    const pkg = pkgOf([node("ac-transformer", { i_vbase: "110", j_vbase: "35" }, "t1", "1号主变")]);
    expect(pkg.powerTransformers).toHaveLength(1);
    expect(pkg.transformerEnds.map((end) => end.endNumber)).toEqual([1, 2]);
    expect(pkg.transformerEnds.map((end) => end.ratedU)).toEqual([110, 35]);
    expect(pkg.transformerEnds.map((end) => end.baseVoltageId)).toEqual(["BV_110", "BV_35"]);
    expect(pkg.transformerEnds.every((end) => end.transformerId === "N_t1")).toBe(true);
  });

  test("★ 三绕组 → 三个 TransformerEnd，侧电压按 i / k / j 顺序（不是 i / j / k）", () => {
    const pkg = pkgOf([node("ac-three-winding-transformer", { i_vbase: "110", k_vbase: "35", j_vbase: "10" }, "t1", "主变")]);
    expect(pkg.transformerEnds).toHaveLength(3);
    expect(pkg.transformerEnds.map((end) => end.ratedU)).toEqual([110, 35, 10]);
    expect(pkg.transformerEnds.map((end) => end.name)).toEqual(["主变绕组1", "主变绕组2", "主变绕组3"]);
  });

  test("★ 中性点变体同样按三绕组处理（只发两个绕组就是错类）", () => {
    const pkg = pkgOf([node("ac-three-winding-transformer-neutral", { i_vbase: "110", k_vbase: "35", j_vbase: "10" }, "t1", "主变")]);
    expect(pkg.transformerEnds).toHaveLength(3);
  });

  test("侧电压缺失 → BV_UNKNOWN（不写 BV_NaN）", () => {
    const pkg = pkgOf([node("ac-transformer", {}, "t1", "主变")]);
    expect(pkg.transformerEnds.map((end) => end.baseVoltageId)).toEqual(["BV_UNKNOWN", "BV_UNKNOWN"]);
    expect(pkg.transformerEnds.map((end) => end.ratedU)).toEqual([0, 0]);
  });

  test("侧电压未登记进 BaseVoltage 清单时按 BV_<值> 兜底", () => {
    // j_vbase 不在节点电压清单里时电压等级仍能引用（序列化阶段才决定是否成悬挂）
    const pkg = pkgOf([node("ac-transformer", { i_vbase: "110", j_vbase: "35" }, "t1", "主变")]);
    expect(pkg.transformerEnds[1].baseVoltageId).toBe("BV_35");
    expect(pkg.baseVoltages.map((bv) => bv.rdfId)).toContain("BV_35");
  });

  test("vectorGroup 走 snake / camel 两个别名，空串落 undefined", () => {
    expect(pkgOf([node("ac-transformer", { vector_group: "YNd11" }, "t1", "主变")]).powerTransformers[0].vectorGroup).toBe("YNd11");
    expect(pkgOf([node("ac-transformer", { vectorGroup: "Dyn11" }, "t2", "主变")]).powerTransformers[0].vectorGroup).toBe("Dyn11");
    expect(pkgOf([node("ac-transformer", { vector_group: "  " }, "t3", "主变")]).powerTransformers[0].vectorGroup).toBeUndefined();
  });

  test("额定容量走 sn / rated_s / rated_capacity / capacity 别名", () => {
    expect(pkgOf([node("ac-transformer", { i_vbase: "110", sn: "50" }, "t1", "主变")]).transformerEnds[0].ratedS).toBe(50);
    expect(pkgOf([node("ac-transformer", { i_vbase: "110", capacity: "31.5" }, "t2", "主变")]).transformerEnds[0].ratedS).toBe(31.5);
    expect(pkgOf([node("ac-transformer", { i_vbase: "110" }, "t3", "主变")]).transformerEnds[0].ratedS).toBeUndefined();
  });
});

describe("buildCimPackage：负荷、电源与开关", () => {
  test("负荷 p / q 走别名，缺省留 undefined（不补 0）", () => {
    const consumer = pkgOf([node("ac-load", { p: "5", reactive_power: "2" }, "l1", "负荷1")]).energyConsumers[0];
    expect([consumer.activePower, consumer.reactivePower]).toEqual([5, 2]);
    const bare = pkgOf([node("ac-load", {}, "l2", "负荷2")]).energyConsumers[0];
    expect(bare.activePower).toBeUndefined();
  });

  test("电源与负荷分属不同数组", () => {
    const pkg = pkgOf([node("ac-source", { p: "10" }, "s1", "电源1"), node("ac-load", { p: "5" }, "l1", "负荷1")]);
    expect(pkg.energySources.map((s) => s.rdfId)).toEqual(["N_s1"]);
    expect(pkg.energyConsumers.map((c) => c.rdfId)).toEqual(["N_l1"]);
  });

  test("★ 发电单元按 kind 落具体 CIM 类（未知回落 ThermalGeneratingUnit）", () => {
    const expected: Array<[DeviceKind, string]> = [
      ["ac-wind-source", "WindGeneratingUnit"],
      ["ac-pv-source", "SolarGeneratingUnit"],
      ["ac-hydro-source", "HydroGeneratingUnit"],
      ["ac-nuclear-source", "ThermalGeneratingUnit"],
      ["ac-storage", "BatteryUnit"]
    ];
    for (const [kind, cimClass] of expected) {
      expect(pkgOf([node(kind, {}, "g1", kind)]).generatingUnits[0].cimClass).toBe(cimClass);
    }
  });

  test("发电单元额定有功走 pn / rated_capacity / capacity 别名", () => {
    expect(pkgOf([node("ac-wind-source", { pn: "20" }, "g1", "风机")]).generatingUnits[0].ratedGrossMaxP).toBe(20);
  });

  test("★ 开关分合位：closed_status 优先，其次 status，缺省闭合", () => {
    const open = (params: Record<string, string>, id: string) => pkgOf([node("ac-breaker", params, id, "开关")]).switches[0].normalOpen;
    expect(open({ closed_status: "0" }, "a")).toBe(true);
    expect(open({ closed_status: "open" }, "b")).toBe(true);
    expect(open({ status: "0" }, "c")).toBe(true);
    // closed_status 存在时压过 status
    expect(open({ closed_status: "1", status: "0" }, "d")).toBe(false);
    expect(open({}, "e")).toBe(false);
  });

  test("断路器与隔离开关在 switches 数组里靠 cimClass 区分", () => {
    const pkg = pkgOf([node("ac-breaker", {}, "a", "断路器"), node("ac-switch", {}, "b", "隔离开关")]);
    expect(pkg.switches.map((s) => s.cimClass)).toEqual(["Breaker", "Disconnector"]);
  });

  test("补偿设备单段（sections 固定 1）", () => {
    const pkg = pkgOf([node("ac-capacitor", {}, "c1", "电容器"), node("ac-series-capacitor", {}, "c2", "串联电容")]);
    expect(pkg.shuntCompensators.map((s) => s.cimClass)).toEqual(["LinearShuntCompensator", "SeriesCompensator"]);
    expect(pkg.shuntCompensators.every((s) => s.sections === 1)).toBe(true);
  });
});

describe("buildCimPackage：跳过的 kind 不产出任何对象", () => {
  test("直流母线 / 直流线路都不进设备数组", () => {
    const pkg = pkgOf([node("dc-bus", { vbase: "35" }, "b1", "直流母线"), node("dc-line", {}, "l1", "直流线路")]);
    expect(pkg.busbarSections).toEqual([]);
    expect(pkg.acLineSegments).toEqual([]);
  });

  test("但直流电压仍进 BaseVoltage 清单（声明即收）", () => {
    expect(pkgOf([node("dc-bus", { vbase: "35" }, "b1", "直流母线")]).baseVoltages.map((bv) => bv.rdfId)).toEqual(["BV_35"]);
  });
});