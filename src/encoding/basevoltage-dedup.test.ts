import { describe, it, expect } from "vitest";
import fs from "node:fs";
import { parseEDeviceDefinitionFile, buildEDeviceParameterFile } from "../model-eexport";
import { applyEDeviceDefinitionSectionsToLibraryState, buildEFileExportOptionsFromLibrary } from "../appExtracted/appDeviceDefinitionFactories";
import { DEVICE_LIBRARY, type ProjectFile } from "../model";

// 这两条用例要读真实工程样本，而 data/ 整目录在 .gitignore 里（运行时数据），
// 干净检出的仓库上并不存在。缺样本时跳过，别让 ENOENT 报成「导出逻辑坏了」。
const TIANFU_PROJECT = "data/schemes/files/四川/成都/厂站/天府新区站.json";
const SHUANGMU_PROJECT = "data/schemes/files/主配微联合/地区1/主网/双母线.json";

/**
 * basevoltage 段去重回归测试：
 * 导出 basevoltage 只输出模型实际使用的电压等级（按配置顺序、vltp 数值去重），
 * 不输出 ac/dc 全量配置等级（每个等级重复两份）；模型无有效电压等级时回退全量。
 *
 * 第一条用例是自造数据的纯逻辑回归，任何检出都能跑；
 * 后两条依赖真实工程样本（data/ 被 .gitignore），样本缺失时各自显式条件跳过。
 */
describe("basevoltage 去重", () => {
  const template = fs.readFileSync("public/e-templates/ems_rtdb.e", "utf-8");
  const sections = parseEDeviceDefinitionFile(template);
  const result = applyEDeviceDefinitionSectionsToLibraryState({
    sections,
    libraryTemplates: DEVICE_LIBRARY as any
  });
  const exportOptions = buildEFileExportOptionsFromLibrary({
    libraryTemplates: DEVICE_LIBRARY as any,
    eDeviceDefinitionLabels: result.eDeviceDefinitionLabels,
    eDeviceDefinitionFieldOrder: result.eDeviceDefinitionFieldOrder,
    eDeviceDefinitionTemplateFields: result.eDeviceDefinitionTemplateFields,
    eDeviceDefinitionTableIds: result.eDeviceDefinitionTableIds
  });

  function countSectionRows(text: string, name: string) {
    const matches = [...text.matchAll(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`, "g"))];
    return matches.map((m) => m[1].split("\n").filter((l) => l.trim().startsWith("#")).length);
  }

  function busNode(id: string, name: string, vbase: string) {
    return {
      id,
      kind: "ac-bus",
      name,
      position: { x: 0, y: 0 },
      size: { width: 100, height: 20 },
      rotation: 0,
      params: { vbase, name },
      terminals: [{ type: "ac", vbase, anchor: { x: 0.5, y: 0.5 }, nodeNumber: id }]
    } as any;
  }

  it("双母线（110/10）：basevoltage 恰好 2 行，无 ac/dc 重复", () => {
    const project: ProjectFile = {
      version: 1,
      name: "双母线",
      nodes: [
        busNode("b1", "1M", "110"),
        busNode("b2", "2M", "110"),
        busNode("l1", "负荷", "10")
      ],
      edges: []
    } as any;
    const text = buildEDeviceParameterFile(project, ["默认方案"], exportOptions);
    expect(countSectionRows(text, "basevoltage")).toEqual([2]);
    const m = text.match(/<basevoltage>([\s\S]*?)<\/basevoltage>/);
    const rows = m![1].split("\n").filter((l) => l.trim().startsWith("#"));
    const nomvols = rows.map((r) => r.split(/\s+/).filter(Boolean)[3]);
    expect([...nomvols].sort()).toEqual(["10", "110"]);
  });

  // 显式条件跳过（环境依赖，非「用例坏了」）：
  //   缺什么 —— data/ 整目录在 .gitignore 里（运行时数据），干净检出的仓库上
  //             没有这份真实工程样本，JSON.parse(fs.readFileSync(...)) 会 ENOENT。
  //   为什么现在不能跑 —— 样本文件不入库，任何检出都拿不到，只能靠 existsSync 现场判断。
  //   恢复条件 —— 在装有 data/ 的开发机（或把样本纳入仓库）上跑本文件，两条都会真跑；
  //               缺样本时自动跳过，CI 不会把 ENOENT 报成「导出逻辑坏了」。
  //
  // 实测（2026-10，本机有样本时）：该样本 169 节点、edges 为空，params.vbase 全为 "0"，
  // 电压信息只在 voltage_level（10/750）与 rated_voltage（35/10/220/500/750/1500）上。
  // 于是走的是 modelUsedVoltageLevels 的第二条兜底（节点参数电压字段），
  // 输出 6 行：10 / 35 / 220 / 500 / 750 / 1500（1500 不在内置配置里，按原值追加到末尾）。
  // ⚠️ 它并不覆盖标题原写的「回退全量配置」那条分支——那条分支目前无守卫，
  //    要覆盖需要一个「所有节点都没有任何电压信息」的自造 fixture。
  it.skipIf(!fs.existsSync(TIANFU_PROJECT))("vbase 全为 0、电压只在 voltage_level/rated_voltage 上：按节点参数兜底去重输出（仅 1 个 basevoltage 段）", () => {
    const project = JSON.parse(fs.readFileSync(TIANFU_PROJECT, "utf-8")) as ProjectFile;
    const text = buildEDeviceParameterFile(project, ["默认方案"], exportOptions);
    const counts = countSectionRows(text, "basevoltage");
    expect(counts.length).toBe(1);
    // 提取模型实际电压字段（vbase/voltage_level/rated_voltage）后去重，行数远小于 ac/dc 全量。
    // 内置 BUILTIN_VOLTAGE_LEVELS 有 16 项，ac + dc 拼起来是 32 行；26 是卡在
    // 「模型等级数（实测 6）」与「ac/dc 全量（32）」之间的阈值，去重一旦回退成全量就会红。
    expect(counts[0]).toBeGreaterThan(0);
    expect(counts[0]).toBeLessThan(26);
  });

  // 显式条件跳过（环境依赖，非「用例坏了」）：同上一条。
  //   缺什么 —— data/schemes/files/主配微联合/.../双母线.json 不入库（data/ 被 .gitignore）。
  //   为什么现在不能跑 —— 干净检出上文件不存在，读它必然 ENOENT。
  //   恢复条件 —— 装有 data/ 的机器上跑本文件即真跑；缺样本自动跳过。
  //
  // 实测（2026-10）：该样本 params.vbase 是 500 / 110（非 0），所以走
  // modelUsedVoltageLevels 的第一条（records 上的 _vbase/vbase），
  // 输出 2 行：110 / 500。⚠️ 它并不覆盖标题原写的「vbase 全 0 但节点带 voltage_level」
  // 那条兜底路径——那份数据里 vbase 并不为 0。
  it.skipIf(!fs.existsSync(SHUANGMU_PROJECT))("vbase 为 500/110：只输出模型实际等级，不重复", () => {
    const project = JSON.parse(fs.readFileSync(SHUANGMU_PROJECT, "utf-8")) as ProjectFile;
    const text = buildEDeviceParameterFile(project, ["默认方案"], exportOptions);
    const counts = countSectionRows(text, "basevoltage");
    expect(counts.length).toBe(1);
    // 模型节点电压等级去重后输出（实际行数取决于数据文件中的电压等级数量）
    expect(counts[0]).toBeGreaterThanOrEqual(1);
    expect(counts[0]).toBeLessThan(26);
    const m = text.match(/<basevoltage>([\s\S]*?)<\/basevoltage>/);
    const rows = m![1].split("\n").filter((l) => l.trim().startsWith("#"));
    const nomvols = rows.map((r) => r.split(/\s+/).filter(Boolean)[3]);
    // 验证输出的是模型实际使用的电压等级（去重后）
    expect(nomvols.length).toBe(counts[0]);
    expect(nomvols.every((v) => v && v !== "0")).toBe(true);
  });
});
