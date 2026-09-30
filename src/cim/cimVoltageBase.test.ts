// CIM/XML 导出：BaseVoltage 提取（阶段 1）。
//
// 电压值有三个来源 —— 端子自带的 vbase、8 个分侧/别名键、以及通用 params.vbase ——
// 三者都收进 BaseVoltage 清单，但取值顺序（决定「主电压」，进而决定 VoltageLevel 分组）
// 是「端子 → 分侧 → 通用」。这条链一旦写错，导出仍是**合法**的 CIM，只是电压挂错节点，
// 不抛错、只能拿参考文件对比才发现，所以在此把三源与过滤规则逐条钉住。
import { describe, expect, test } from "vitest";
import type { ModelNode } from "../model";
import { extractBaseVoltages, voltageBaseMap } from "./cim-builder";

const node = (params: Record<string, string>, terminalVbases: Array<string | undefined> = [], id = "n1"): ModelNode =>
  ({
    id,
    kind: "ac-bus",
    name: id,
    params,
    position: { x: 0, y: 0 },
    size: { width: 100, height: 20 },
    rotation: 0,
    scale: 1,
    layerId: "default",
    terminals: terminalVbases.map((vbase, index) => ({
      id: `t${index}`,
      label: `端子${index + 1}`,
      type: "ac",
      anchor: { x: 0, y: index },
      nodeNumber: String(index + 1),
      vbase
    }))
  }) as unknown as ModelNode;

describe("extractBaseVoltages：三个来源 + 过滤", () => {
  test("端子自带的 vbase", () => {
    expect(extractBaseVoltages([node({}, ["10.5"])])).toEqual([
      { rdfId: "BV_10.5", name: "10.5kV", nominalVoltage: 10.5 }
    ]);
  });

  test("★ 分侧键 i_vbase / j_vbase 都被收（不限设备类型）", () => {
    expect(extractBaseVoltages([node({ i_vbase: "110", j_vbase: "35" })])).toEqual([
      { rdfId: "BV_35", name: "35kV", nominalVoltage: 35 },
      { rdfId: "BV_110", name: "110kV", nominalVoltage: 110 }
    ]);
  });

  test("★ 8 个分侧/别名键全收（含 legacy high/medium/low 与 source/target）", () => {
    const params = {
      i_vbase: "1",
      j_vbase: "2",
      k_vbase: "3",
      high_vbase: "4",
      medium_vbase: "5",
      low_vbase: "6",
      source_vbase: "7",
      target_vbase: "8"
    };
    expect(extractBaseVoltages([node(params)]).map((bv) => bv.nominalVoltage)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  test("★ 通用 params.vbase 计入（母线的电压常只写在这里）", () => {
    expect(extractBaseVoltages([node({ vbase: "0.4" })])).toEqual([
      { rdfId: "BV_0.4", name: "0.4kV", nominalVoltage: 0.4 }
    ]);
  });

  test("★ 母线端子的占位 0 不进清单（`value > 0` 才收）", () => {
    expect(extractBaseVoltages([node({}, ["0", "0"], "bus")])).toEqual([]);
  });

  test("★ 空串 / 空白串不算数（`raw &&` 挡掉，而不是被 Number('') = 0 收进来）", () => {
    expect(extractBaseVoltages([node({ vbase: "   ", i_vbase: "" }, [""])])).toEqual([]);
  });

  test("★ 非数字与负值被丢（Number('abc') 是 NaN，负值不满足 > 0）", () => {
    expect(extractBaseVoltages([node({ i_vbase: "abc", vbase: "-10" }, ["abc", "-5"])])).toEqual([]);
  });

  test("★ 带单位写法不被解析（'35 kV' → NaN，直接丢弃，不猜单位）", () => {
    expect(extractBaseVoltages([node({ vbase: "35 kV" })])).toEqual([]);
  });

  test("去重后升序排列（多个节点同电压只出一条）", () => {
    const nodes = [node({}, ["10"]), node({}, ["10"]), node({ vbase: "35" }), node({}, ["10"], "n3")];
    expect(extractBaseVoltages(nodes).map((bv) => bv.nominalVoltage)).toEqual([10, 35]);
  });

  test("rdfId / name 的派生格式", () => {
    expect(extractBaseVoltages([node({ vbase: "110" })])[0]).toEqual({
      rdfId: "BV_110",
      name: "110kV",
      nominalVoltage: 110
    });
  });

  test("空节点列表 → 空清单", () => {
    expect(extractBaseVoltages([])).toEqual([]);
  });
});

describe("voltageBaseMap：电压值 → rdfId", () => {
  test("与 extractBaseVoltages 同源", () => {
    const nodes = [node({ vbase: "10" }, ["35"], "n1")];
    const map = voltageBaseMap(nodes);
    expect(map.get(10)).toBe("BV_10");
    expect(map.get(35)).toBe("BV_35");
    expect(map.size).toBe(2);
  });

  test("无电压节点 → 空映射", () => {
    expect(voltageBaseMap([node({}, ["0"])])).toEqual(new Map());
  });
});