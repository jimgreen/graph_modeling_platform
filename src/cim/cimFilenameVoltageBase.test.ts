// src/cim/ 的两个零直呼函数的直接单测：
//   cimFilename（跨端文件名单源）与 voltageBaseMap / extractBaseVoltages。
//
// `server/cimExport.mjs:11` 直载它们，跨进程无类型兜底。
//
// **cimFilename 的跨端一致性是最需要钉住的地方**：
// 前端落盘名（cim-export.ts:134）与后端 `Content-Disposition`（cimExport.mjs:63）
// 复用**同一个函数**。若两处规则分歧，下载文件名与实际落盘名就不一致 —— 用户按名字
// 找不到文件，而导出过程**不报任何错**。这也是它零直呼却风险最高的原因。
import { describe, expect, test } from "vitest";
import { cimFilename } from "./cim-export";
import { extractBaseVoltages, voltageBaseMap } from "./cim-builder";
import type { ModelNode } from "../model";

describe("cimFilename（文件名单源，跨端一致性的唯一出处）", () => {
  test("普通名字原样 + .xml", () => {
    expect(cimFilename("项目A")).toBe("项目A.xml");
    expect(cimFilename("正常名字.v2")).toBe("正常名字.v2.xml");
    expect(cimFilename("emoji🎉")).toBe("emoji🎉.xml");
  });

  test("Windows 非法字符集 [\\\\/:*?\"<>|] 逐个替换为下划线", () => {
    expect(cimFilename('a/b\\c:d*e?f"g<h>i|j')).toBe("a_b_c_d_e_f_g_h_i_j.xml");
    expect(cimFilename("a\\b")).toBe("a_b.xml");
    expect(cimFilename("带|竖线")).toBe("带_竖线.xml");
  });

  test("**tab 与换行不净化**（不在 Windows 非法字符集内，规则正确）", () => {
    expect(cimFilename("tab\there")).toBe("tab\there.xml");
    expect(cimFilename("换\n行")).toBe("换\n行.xml");
  });

  test("首尾空白被 trim 后再净化", () => {
    expect(cimFilename("  前后空白  ")).toBe("前后空白.xml");
  });

  test("净化后为空才回落到「未命名」——不是空串、也不是净化前判断", () => {
    expect(cimFilename("")).toBe("未命名.xml");
    expect(cimFilename("   ")).toBe("未命名.xml");
    // 关键区分：'///' 净化后是 '_'（非空），故**不**回落到「未命名」
    expect(cimFilename("///")).toBe("_.xml");
    // '.' 不在非法集，故全点号也照原样
    expect(cimFilename("...")).toBe("....xml");
  });

  test("**safeFilePart 先执行、其返回值再被净化**（探针实测顺序）", () => {
    const seen: string[] = [];
    expect(cimFilename("a/b", (s) => { seen.push(s); return s; })).toBe("a_b.xml");
    // 注入函数收到的是**净化前**的原串
    expect(seen).toEqual(["a/b"]);

    // 注入函数返回带非法字符时同样被净化 —— 前端 safeFilePart 只需管自己的规则
    expect(cimFilename("x", () => "a/b:c")).toBe("a_b_c.xml");
    // 注入函数返回空串 → 净化后为空 → 同样走「未命名」兜底
    expect(cimFilename("x", () => "")).toBe("未命名.xml");
  });

  test("不做长度截断（如实记录当前行为）", () => {
    const long = "a".repeat(200);
    expect(cimFilename(long)).toBe(`${long}.xml`);
  });

  test("不含时间戳、不带 _CIM16 后缀（2026-09-13 去后缀，便于与接口产物按名对拍）", () => {
    const out = cimFilename("项目A");
    expect(out).not.toMatch(/\d{8}|\d{4}-\d{2}-\d{2}/);
    expect(out).not.toContain("CIM16");
    expect(out.endsWith(".xml")).toBe(true);
  });
});

describe("extractBaseVoltages / voltageBaseMap（CIM BaseVoltage 提取）", () => {
  /** 按 ModelNode 的全部必填字段构造，vbases 落到 terminals[].vbase，params 走分侧/通用键 */
  const bus = (id: string, { vbases = [] as string[], params = {} as Record<string, string> } = {}): ModelNode => ({
    id,
    kind: "ac-bus",
    name: id,
    nodeNumber: id,
    acTopologyNode: 0,
    dcTopologyNode: 0,
    position: { x: 0, y: 0 },
    size: { width: 10, height: 10 },
    rotation: 0,
    scale: 1,
    terminals: vbases.map((v, i) => ({
      id: `t${i + 1}`,
      label: `T${i + 1}`,
      type: "ac" as const,
      anchor: { x: 0, y: 0 },
      nodeNumber: String(i + 1),
      vbase: v
    })),
    params
  } as ModelNode);

  const ids = (nodes: ModelNode[]) => extractBaseVoltages(nodes).map((bv) => bv.rdfId);

  test("三个来源都被收集：端子 vbase / 分侧 key / 通用 params.vbase", () => {
    // 母线等设备的电压常只写在 params.vbase 上（端子 vbase 保持占位 0）
    expect(ids([bus("a", { vbases: ["0.1"] })])).toEqual(["BV_0.1"]);
    expect(ids([bus("a", { params: { i_vbase: "0.1" } })])).toEqual(["BV_0.1"]);
    expect(ids([bus("a", { params: { vbase: "0.1" } })])).toEqual(["BV_0.1"]);
  });

  test("三来源同值时**去重**成一条", () => {
    expect(ids([bus("a", { vbases: ["0.1"], params: { i_vbase: "0.1", vbase: "0.1" } })])).toEqual(["BV_0.1"]);
  });

  test("8 个分侧 key 全部生效，非分侧 key 不生效", () => {
    for (const key of ["i_vbase", "j_vbase", "k_vbase", "high_vbase", "medium_vbase",
      "low_vbase", "source_vbase", "target_vbase"]) {
      expect(ids([bus("a", { params: { [key]: "0.1" } })]), key).toEqual(["BV_0.1"]);
    }
    // 同前缀但不在清单里的 key 不收（精确匹配，不是前缀匹配）
    expect(ids([bus("a", { params: { random_vbase: "0.1" } })])).toEqual([]);
  });

  test("非法值一律忽略：0 / 0.0 / 空 / 纯空白 / 非数字 / 负数 / Infinity / NaN", () => {
    for (const v of ["0", "0.0", "", "   ", "abc", "-5", "Infinity", "NaN"]) {
      expect(ids([bus("a", { vbases: [v] })]), JSON.stringify(v)).toEqual([]);
    }
  });

  test("容忍首尾空白与科学计数法（Number 能解析即收）", () => {
    expect(ids([bus("a", { vbases: [" 20 "] })])).toEqual(["BV_20"]);
    expect(ids([bus("a", { vbases: ["1e3"] })])).toEqual(["BV_1000"]);
  });

  test("**升序排序**且小数排序正确（数值比较，非字符串比较）", () => {
    expect(ids([bus("a", { vbases: ["10", "2", "10", "30"] })])).toEqual(["BV_2", "BV_10", "BV_30"]);
    // 字符串比较会得到 0.1, 1.5, 10, 2 的错误顺序
    expect(ids([bus("a", { vbases: ["10", "0.1", "2", "1.5"] })])).toEqual(["BV_0.1", "BV_1.5", "BV_2", "BV_10"]);
  });

  test("跨节点去重；数值等价形式合并（1 / 1.0 / 1.00 → 1）", () => {
    expect(ids([bus("a", { vbases: ["10"] }), bus("b", { vbases: ["10"] })])).toEqual(["BV_10"]);
    expect(ids([bus("a", { vbases: ["1", "1.0", "1.00"] })])).toEqual(["BV_1"]);
  });

  test("rdfId / name / nominalVoltage 的形态", () => {
    const list = extractBaseVoltages([bus("a", { vbases: ["0.1", "10"] })]);
    expect(list[0]).toEqual({ rdfId: "BV_0.1", name: "0.1kV", nominalVoltage: 0.1 });
    expect(list[1]).toEqual({ rdfId: "BV_10", name: "10kV", nominalVoltage: 10 });
  });

  test("voltageBaseMap：number → rdfId，key 是**数字**不是字符串", () => {
    const map = voltageBaseMap([bus("a", { vbases: ["0.1", "10"] })]);
    expect([...map.entries()]).toEqual([[0.1, "BV_0.1"], [10, "BV_10"]]);
    // 与 extractBaseVoltages 同序（升序）
    expect([...map.values()]).toEqual(["BV_0.1", "BV_10"]);
  });

  test("空输入 / 全非法值 → 空结果（不抛错）", () => {
    expect(extractBaseVoltages([])).toEqual([]);
    expect(voltageBaseMap([]).size).toBe(0);
    expect(extractBaseVoltages([bus("a", { vbases: ["0", "abc"] })])).toEqual([]);
  });
});
