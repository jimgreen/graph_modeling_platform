// 端到端验证：天府新区站 + ems_rtdb 模板 → buildEFileExport → encodeGbk → 文件字节为 GBK
import { describe, it, expect, afterEach } from "vitest";
import fs from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import iconv from "iconv-lite";
import { parseEDeviceDefinitionFile, buildEFileExport } from "../model-eexport";
import { applyEDeviceDefinitionSectionsToLibraryState, buildEFileExportOptionsFromLibrary } from "../appExtracted/appDeviceDefinitionFactories";
import { DEVICE_LIBRARY } from "../model";
import { encodeGbk } from "./gbk";

// 端到端要用真实工程样本，而 data/ 整目录在 .gitignore 里（运行时数据），
// 干净检出的仓库上不存在 —— 缺样本时跳过，别让 ENOENT 报成「导出坏了」。
const TIANFU_PROJECT = join(process.cwd(), "data/schemes/files/四川/成都/厂站/天府新区站.json");
// 显式的跳过条件：仅当上面的真实工程样本未就位时才跳过；样本在位时本用例**真跑**
// （本工作区实测通过），断言与所依赖逻辑均未过时。
const SAMPLE_MISSING = !fs.existsSync(TIANFU_PROJECT);

// 落盘校验用的临时目录：mkdtemp 建在系统临时目录（避免并发跑时互相覆盖），
// afterEach 清掉，不在工作区留任何产物。
// 原先写的是工作区内的 output/e2e_gbk_check.e —— output/ 同样在 .gitignore 里，
// 干净检出上该目录甚至不存在，writeFileSync 会抛 ENOENT，把「环境缺目录」报成
// 「导出坏了」的假红；且每跑一次就在工作区沉淀一个产物。
let tmpDir: string | null = null;
afterEach(() => {
  if (tmpDir) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    tmpDir = null;
  }
});

describe("E 文件导出端到端 GBK 验证", () => {
  // 跳过原因（中文）：本用例要读 data/ 下的真实工程样本（四川/成都/厂站/天府新区站.json），
  // 而 data/ 整目录在 .gitignore 里属运行时数据，干净检出的仓库上不存在该文件 ——
  // 这是环境依赖缺口而非断言过时，故按样本是否就位显式条件跳过；
  // 样本就位时用例真实执行并通过（本工作区即如此）。
  it.skipIf(SAMPLE_MISSING)("导出文本经 encodeGbk 后为合法 GBK，且可被 iconv-lite 无损解码", () => {
    const text = fs.readFileSync(join(process.cwd(), "public/e-templates/ems_rtdb.e"), "utf-8");
    const sections = parseEDeviceDefinitionFile(text);
    const result = applyEDeviceDefinitionSectionsToLibraryState({
      sections,
      customDeviceTemplates: [],
      libraryTemplates: DEVICE_LIBRARY,
      deviceDefinitionOverrides: {},
      eDeviceDefinitionLabels: {},
      eDeviceDefinitionClassExportEnabled: {},
      labels: {},
      resolveDefinitionComponentLibrary: undefined
    });
    const options = buildEFileExportOptionsFromLibrary({
      libraryTemplates: DEVICE_LIBRARY,
      labels: {},
      eDeviceDefinitionLabels: result.eDeviceDefinitionLabels,
      eDeviceDefinitionClassExportEnabled: result.eDeviceDefinitionClassExportEnabled,
      eDeviceDefinitionFieldOrder: result.eDeviceDefinitionFieldOrder,
      eDeviceDefinitionTemplateFields: result.eDeviceDefinitionTemplateFields,
      resolveDefinitionComponentLibrary: undefined
    });
    const project = JSON.parse(fs.readFileSync(TIANFU_PROJECT, "utf-8"));
    const file = buildEFileExport(project, ["四川", "成都", "厂站"], options);
    // 导出文本 -> GBK 字节
    const gbkBytes = encodeGbk(file.text);
    // 用 iconv-lite 解码验证无损
    const decoded = iconv.decode(Buffer.from(gbkBytes), "gbk");
    expect(decoded).toBe(file.text);
    // 与 UTF-8 字节不同（证明确实是 GBK）
    const utf8Bytes = new TextEncoder().encode(file.text);
    expect(gbkBytes.length).not.toBe(utf8Bytes.length);
    // 中文行应包含 GBK 双字节（非 UTF-8 三字节）
    expect(gbkBytes.length).toBeLessThan(utf8Bytes.length);
    // 写出文件供核对（原先注释写的是「供人工检查」）：落到系统临时目录并回读比对，
    // 让这次落盘仍被断言看见 —— 写出的字节必须与 encodeGbk 的结果逐字节一致。
    tmpDir = fs.mkdtempSync(join(tmpdir(), "gmp-gbk-export-e2e-"));
    const artifact = join(tmpDir, "e2e_gbk_check.e");
    fs.writeFileSync(artifact, Buffer.from(gbkBytes));
    expect(fs.readFileSync(artifact)).toEqual(Buffer.from(gbkBytes));
  });
});
