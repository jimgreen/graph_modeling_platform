// 一次性数据迁移：把已保存模型里「厂站/台区 派生电源」的端子锚点，从旧默认「右边」改到
// 与同层级负荷一致的「上边」。
//
// 背景（缺陷即「交流厂站电源」与「交流厂站负荷」图元看起来不一样）：
//   - 两者图标同源（src/DeviceGlyph.ts 的 station/feeder/district 三族各一套 path），
//     视觉参数、尺寸也完全一致，画布上唯一的差别是端子引线方向。
//   - 引线方向由 terminals[0].anchor 决定（src/model-routing.ts:1978 terminalStubSegment）。
//     派生件工厂过去只对「馈线」强制覆盖锚点，厂站/台区直接继承基类模板；基类里
//     ac-load(src/model.ts) / dc-load 显式声明上边 {0,-0.5}，而 ac-source / dc-source 缺省，
//     单端子默认是右边 {0.5,0}（src/definitionInstanceSync.ts defaultTerminalAnchor）。
//   - 模板侧已改为按模型层级统一（src/model.ts 的 modelAssociationDerivedTerminalAnchors），
//     但那只影响**新放置的节点**：加载期 syncDefinitionTerminals 会刻意保留已存的单端子锚点
//     （src/definitionInstanceSync.ts:200-202，配 src/definitionInstanceSync.test.ts 的
//     「preserves a saved single-terminal instance anchor」）。所以存量模型必须单独迁移。
//
// 用法（项目根目录）：
//   node scripts/migrate-model-association-source-anchors.mjs            # 预演(dry-run)，只报告不写入
//   node scripts/migrate-model-association-source-anchors.mjs --apply    # 实际写入（逐文件先备份 .bak）
//
// 安全性：
//   - 默认 dry-run；只改「锚点严格等于旧默认 {x:0.5,y:0}」的节点，手工拖过的锚点一律不动。
//   - 幂等：已迁移过的再跑一次报告「无待迁移」。
//   - 写文件前先 copyFileSync 出 `<file>.<timestamp>.bak`，再用原子写落盘。
//   - 只处理 `<space>/schemes/files/**` 下的模型 JSON（默认空间 data/schemes/files，
//     其余空间 data/workspaces/<id>/schemes/files），trash / device-library 一概不碰。

import { copyFileSync, existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { atomicWriteFileSync } from "../shared/atomicWrite.mjs";
import { MODEL_ASSOCIATION_DERIVED_CLASS_SPECS } from "../src/model.ts";

const APPLY = process.argv.includes("--apply");
const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const dataRoot = resolve(repoRoot, "data");

const REPORT_PREFIX = "[migrate:source-anchor]";
function report(message) {
  console.log(`${REPORT_PREFIX} ${message}`);
}

/** 旧默认锚点：单端子的 createTerminals 默认在右边。 */
const LEGACY_ANCHOR = { x: 0.5, y: 0 };
/** 新锚点：与同层级负荷（ac-load/dc-load 的 {0,-0.5}）一致，引线竖直向上。 */
const NEXT_ANCHOR = { x: 0, y: -0.5 };

/**
 * 需要迁移的派生电源 kind —— 直接从 model.ts 的规格表取，避免脚本里的 kind 清单与源码分叉。
 * 「馈线」一族本来就被覆盖成左边 {x:-0.5,y:0}，与同层级负荷一致，不在此列。
 */
const TARGET_KINDS = new Set(
  MODEL_ASSOCIATION_DERIVED_CLASS_SPECS
    .filter((spec) => spec.modelType !== "馈线" && spec.baseKind.endsWith("-source"))
    .map((spec) => spec.kind)
);

/** 扫描的模型目录：默认空间 + 每个 workspace 空间，形如 `<space>/schemes/files`。 */
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
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch (error) {
    console.error(`跳过不可读目录：${dir}（${error?.message ?? String(error)}）`);
    return found;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      collectJsonFiles(full, found);
      continue;
    }
    if (entry.isFile() && /\.json$/iu.test(entry.name)) {
      found.push(full);
    }
  }
  return found;
}

function isLegacyAnchor(anchor) {
  return Boolean(anchor) &&
    Number(anchor.x) === LEGACY_ANCHOR.x &&
    Number(anchor.y) === LEGACY_ANCHOR.y;
}

/**
 * 保持文件原有排版：把原文与几种缩进的重排结果比对，选中能逐字节复现的那一种。
 * 都对不上时退回 2 空格（本仓模型 JSON 就是 2 空格）。
 */
function detectIndent(raw, value) {
  for (const indent of [2, 4, 0]) {
    if (JSON.stringify(value, null, indent || undefined) === raw) {
      return indent;
    }
  }
  return 2;
}

/** 返回本文件中被改写的节点描述；不修改入参。 */
function planFile(filePath) {
  const raw = readFileSync(filePath, "utf-8");
  const project = JSON.parse(raw);
  if (!project || !Array.isArray(project.nodes)) {
    return null;
  }
  // 排版要在**改动之前**探测：detectIndent 靠「原文 === 重排结果」判定，改过就永远对不上。
  const indent = detectIndent(raw, project);
  const changes = [];
  for (const node of project.nodes) {
    if (!TARGET_KINDS.has(node?.kind)) {
      continue;
    }
    // 只动「单端子」节点：多端子设备的锚点是布局的一部分，不属本次范围。
    if (!Array.isArray(node.terminals) || node.terminals.length !== 1) {
      continue;
    }
    const terminal = node.terminals[0];
    if (!isLegacyAnchor(terminal?.anchor)) {
      continue;
    }
    terminal.anchor = { ...NEXT_ANCHOR };
    changes.push({
      id: node.id,
      kind: node.kind,
      name: typeof node.name === "string" ? node.name : "",
      from: LEGACY_ANCHOR,
      to: NEXT_ANCHOR
    });
  }
  if (changes.length === 0) {
    return null;
  }
  return { project, changes, indent };
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
    nodeCount += plan.changes.length;
    report(`${APPLY ? "迁移" : "待迁移"} ${relative(dataRoot, filePath)}：${plan.changes.length} 个节点`);
    for (const change of plan.changes) {
      report(`  - ${change.name || change.id} [${change.kind}] 锚点 ${JSON.stringify(change.from)} → ${JSON.stringify(change.to)}`);
    }
    if (!APPLY) {
      continue;
    }
    copyFileSync(filePath, `${filePath}.${stamp}.bak`);
    atomicWriteFileSync(filePath, JSON.stringify(plan.project, null, plan.indent || undefined));
  }
}

if (fileCount === 0) {
  report(`无待迁移节点（已全部为 ${JSON.stringify(NEXT_ANCHOR)}）`);
} else {
  report(
    `${APPLY ? "已迁移" : "待迁移"} ${nodeCount} 个节点 / ${fileCount} 个文件` +
    (APPLY ? `。备份后缀：.${stamp}.bak` : "（加 --apply 执行）")
  );
}
