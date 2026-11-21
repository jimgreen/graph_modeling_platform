// 一次性数据迁移：把三绕组变压器已有的分侧电压参数对齐到对应端子 vbase。
//
// 既定侧位：三绕组端子 1/2/3 = i/k/j = 高/中/低；带中性点时第 4 个端子对应 neutral_vbase。
// 端子是当前读取与着色的优先来源，因此端子为非零值时只改已有分侧参数；端子为 0/空值时跳过。
//
// 用法（项目根目录）：
//   node scripts/migrate-three-winding-transformer-voltages.mjs            # dry-run
//   node scripts/migrate-three-winding-transformer-voltages.mjs --apply    # 写入，逐文件备份

import { copyFileSync, existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { atomicWriteFileSync } from "../shared/atomicWrite.mjs";
import { configuredDataDir } from "../server/config.mjs";
import { isThreeWindingTransformerKind, terminalVoltageBaseNumber } from "../src/model.ts";

const APPLY = process.argv.includes("--apply");
const dataRoot = configuredDataDir;

const REPORT_PREFIX = "[migrate:three-winding-voltage]";
const SIDE_PARAM_KEYS = [
  ["i_vbase", "high_vbase", "highVbase"],
  ["k_vbase", "medium_vbase", "mediumVbase"],
  ["j_vbase", "low_vbase", "lowVbase"],
  ["neutral_vbase"]
];

function report(message) {
  console.log(`${REPORT_PREFIX} ${message}`);
}
function modelRoots() {
  const roots = [join(dataRoot, "schemes", "files")];
  const workspacesRoot = join(dataRoot, "workspaces");
  if (existsSync(workspacesRoot)) {
    for (const entry of readdirSync(workspacesRoot, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        roots.push(join(workspacesRoot, entry.name, "schemes", "files"));
      }
    }
  }
  return roots.filter((root) => existsSync(root));
}

function collectJsonFiles(dir, found = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      collectJsonFiles(full, found);
    } else if (entry.isFile() && /\.json$/iu.test(entry.name)) {
      found.push(full);
    }
  }
  return found;
}

function detectIndent(raw, value) {
  for (const indent of [2, 4, 0]) {
    if (JSON.stringify(value, null, indent || undefined) === raw) {
      return indent;
    }
  }
  return 2;
}

function isNonZeroVoltage(value) {
  const normalized = terminalVoltageBaseNumber(value);
  return normalized !== "" && Number(normalized) !== 0;
}

function planFile(filePath) {
  const raw = readFileSync(filePath, "utf-8");
  const project = JSON.parse(raw);
  if (!project || !Array.isArray(project.nodes)) {
    return null;
  }
  const indent = detectIndent(raw, project);
  const changes = [];

  for (const node of project.nodes) {
    if (!node || !isThreeWindingTransformerKind(node.kind) || !Array.isArray(node.terminals) || !node.params) {
      continue;
    }
    for (let terminalIndex = 0; terminalIndex < Math.min(node.terminals.length, SIDE_PARAM_KEYS.length); terminalIndex += 1) {
      const terminalVoltage = terminalVoltageBaseNumber(node.terminals[terminalIndex]?.vbase);
      if (!isNonZeroVoltage(terminalVoltage)) {
        continue;
      }
      for (const key of SIDE_PARAM_KEYS[terminalIndex]) {
        if (!Object.prototype.hasOwnProperty.call(node.params, key)) {
          continue;
        }
        const previous = terminalVoltageBaseNumber(node.params[key]);
        if (previous === terminalVoltage) {
          continue;
        }
        node.params[key] = terminalVoltage;
        changes.push({
          id: node.id,
          name: typeof node.name === "string" ? node.name : "",
          terminalIndex,
          key,
          from: previous,
          to: terminalVoltage
        });
      }
    }
  }

  return changes.length > 0 ? { project, changes, indent } : null;
}

const roots = modelRoots();
if (roots.length === 0) {
  console.error(`找不到任何模型目录（数据根：${dataRoot}）`);
  process.exit(1);
}

report(`=== (${APPLY ? "APPLY" : "DRY-RUN"}) ===`);
report(`扫描目录：${roots.map((root) => relative(dataRoot, root)).join(" | ")}`);

const stamp = new Date().toISOString().replace(/[:.]/gu, "-");
let fileCount = 0;
let nodeCount = 0;
let fieldCount = 0;

for (const root of roots) {
  for (const filePath of collectJsonFiles(root)) {
    let plan;
    try {
      plan = planFile(filePath);
    } catch (error) {
      console.error(`解析失败，跳过：${relative(dataRoot, filePath)}（${error?.message ?? String(error)}）`);
      continue;
    }
    if (!plan) {
      continue;
    }
    fileCount += 1;
    nodeCount += new Set(plan.changes.map((change) => change.id)).size;
    fieldCount += plan.changes.length;
    report(`${APPLY ? "迁移" : "待迁移"} ${relative(dataRoot, filePath)}：${plan.changes.length} 个字段`);
    for (const change of plan.changes) {
      report(`  - ${change.name || change.id} t${change.terminalIndex + 1} ${change.key}: ${change.from || "<空>"} → ${change.to}`);
    }
    if (!APPLY) {
      continue;
    }
    copyFileSync(filePath, `${filePath}.${stamp}.bak`);
    atomicWriteFileSync(filePath, JSON.stringify(plan.project, null, plan.indent || undefined));
  }
}

if (fileCount === 0) {
  report("无待迁移字段（端子电压与已有分侧参数已一致，或端子仍为默认 0/空值）");
} else {
  report(
    `${APPLY ? "已迁移" : "待迁移"} ${fieldCount} 个字段 / ${nodeCount} 个节点 / ${fileCount} 个文件` +
    (APPLY ? `。备份后缀：.${stamp}.bak` : "（加 --apply 执行）")
  );
}
