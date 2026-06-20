// 一次性迁移:把"模板库"(图模板)从 library.json 拆到独立文件 graph-templates.json。
// 模板库 = customGraphTemplates + customGraphTemplateTypes;其余(设备/元件定义)留在 library.json。
//
// 用法(项目根目录):
//   node scripts/migrate-split-graph-templates.mjs            # 预演
//   node scripts/migrate-split-graph-templates.mjs --apply    # 执行(先备份 library.json)
//
// 安全:默认 dry-run;--apply 前备份;幂等(library.json 已无图模板字段则跳过)。
// 注意:需在「已部署新后端代码(读取时合并两文件)」之后运行,否则旧后端读不到被拆出的图模板。

import { readFileSync, writeFileSync, existsSync, copyFileSync } from "node:fs";
import { join } from "node:path";

const APPLY = process.argv.includes("--apply");
const dir = join(process.cwd(), "data", "device-library");
const libraryPath = join(dir, "library.json");
const graphPath = join(dir, "graph-templates.json");

if (!existsSync(libraryPath)) {
  console.error("找不到 library.json:", libraryPath);
  process.exit(1);
}

const library = JSON.parse(readFileSync(libraryPath, "utf-8"));
const hasGraphKeys = "customGraphTemplates" in library || "customGraphTemplateTypes" in library;

console.log("=== migrate-split-graph-templates (" + (APPLY ? "APPLY" : "DRY-RUN") + ") ===");
if (!hasGraphKeys) {
  console.log("library.json 已不含图模板字段,无需迁移(幂等)。");
  process.exit(0);
}

const graphTemplates = Array.isArray(library.customGraphTemplates) ? library.customGraphTemplates : [];
const graphTypes = Array.isArray(library.customGraphTemplateTypes) ? library.customGraphTemplateTypes : [];

const deviceConfig = { ...library };
delete deviceConfig.customGraphTemplates;
delete deviceConfig.customGraphTemplateTypes;

const graphConfig = {
  customGraphTemplateTypes: graphTypes,
  customGraphTemplates: graphTemplates,
  savedAt: new Date().toISOString()
};

const beforeBytes = readFileSync(libraryPath, "utf-8").length;
const deviceRaw = JSON.stringify(deviceConfig, null, 2);
const graphRaw = JSON.stringify(graphConfig, null, 2);

const fmt = (n) => n.toLocaleString();
console.log("图模板:", graphTemplates.length, "个 | 图模板类型:", graphTypes.length, "个");
console.log("library.json:", fmt(beforeBytes), "->", fmt(deviceRaw.length), "chars",
  `(${((1 - deviceRaw.length / beforeBytes) * 100).toFixed(1)}% 减少)`);
console.log("graph-templates.json(新):", fmt(graphRaw.length), "chars");

if (!APPLY) {
  console.log("\nDRY-RUN:未写入。确认后用 --apply 执行(会先备份 library.json)。");
  process.exit(0);
}

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
copyFileSync(libraryPath, `${libraryPath}.${stamp}.bak`);
writeFileSync(graphPath, graphRaw);
writeFileSync(libraryPath, deviceRaw);
console.log(`\nAPPLIED。备份:library.json.${stamp}.bak。请确保后端已是新代码,然后刷新浏览器验证模板库。`);
