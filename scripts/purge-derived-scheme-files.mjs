// 一次性迁移脚本：把 data/schemes/files 下的非 .json 文件归档进
// data/schemes/trash/<timestamp>/<原相对路径>。默认 dry-run，--apply 才实际移动。
import { mkdir, readdir, rename } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const rootArg = args.find((item) => !item.startsWith("--"));
const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const filesRoot = resolve(rootArg ?? join(repoRoot, "data", "schemes", "files"));
const trashRoot = resolve(join(dirname(filesRoot), "trash"));
const archiveId = new Date().toISOString().replace(/[:.]/gu, "-");

async function collect(dir, isRoot = false) {
  const found = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch (error) {
    if (isRoot) {
      // 根目录不存在/不可读：不能静默当「无待归档文件」，否则操作员会误判存量已清完
      throw error;
    }
    // 嵌套目录读失败不阻塞整轮，但必须留痕（打印被跳过的路径，便于人工核查）
    console.error(`跳过不可读目录：${dir}（${error?.message ?? String(error)}）`);
    return found;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      found.push(...(await collect(full)));
      continue;
    }
    if (entry.isFile() && !/\.json$/iu.test(entry.name)) {
      found.push(full);
    }
  }
  return found;
}

let targets;
try {
  targets = await collect(filesRoot, true);
} catch (error) {
  console.error(`无法读取待归档根目录：${filesRoot}`);
  console.error(error?.message ?? String(error));
  process.exitCode = 1;
}

if (Array.isArray(targets)) {
  if (targets.length === 0) {
    console.log(`无待归档文件：${filesRoot}`);
  } else {
    for (const filePath of targets) {
      const target = join(trashRoot, archiveId, relative(filesRoot, filePath));
      console.log(`${apply ? "归档" : "将归档"} ${relative(filesRoot, filePath)} → ${relative(join(trashRoot, ".."), target)}`);
      if (apply) {
        await mkdir(dirname(target), { recursive: true });
        await rename(filePath, target);
      }
    }
    console.log(`${apply ? "已归档" : "待归档"} ${targets.length} 个文件${apply ? "" : "（加 --apply 执行）"}`);
  }
}
