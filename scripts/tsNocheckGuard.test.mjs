// 全仓 @ts-nocheck 白名单只减不增守卫
//
// 目的：
// 1. 杜绝任何新增文件或重构文件再重新引入 `// @ts-nocheck` 逃避 TypeScript 类型检查；
// 2. 强制要求每摘除一个存量白名单文件的 `@ts-nocheck`，就同步把它从下方名单里移除，
//    确保名单单调递减，直至归零。
import { readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

const repoRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const srcRoot = join(repoRoot, "src");

/**
 * 历史遗留允许保留 `// @ts-nocheck` 的白名单（已彻底清零，永久禁止新增）。
 */
const ALLOWED_TS_NOCHECK_FILES = [];

function collectTsFiles(dir, acc = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === "dist" || entry.name === ".worktrees" || entry.name === "tmp") {
      continue;
    }
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      collectTsFiles(full, acc);
    } else if (/\.(?:ts|tsx)$/u.test(entry.name)) {
      acc.push(full);
    }
  }
  return acc;
}

/** 仅识别真实的 TypeScript 编译器指令行（独占注释行的 `// @ts-nocheck`），避免误伤普通文档注释。 */
function hasTsNocheckDirective(source) {
  return /^\s*\/\/\s*@ts-nocheck\s*$/im.test(source);
}

describe("全仓 @ts-nocheck 只减不增白名单守卫", () => {
  test("不允许任何新文件引入 @ts-nocheck，且已摘除文件须及时移出白名单", () => {
    const actual = collectTsFiles(srcRoot)
      .filter((filePath) => hasTsNocheckDirective(readFileSync(filePath, "utf8")))
      .map((filePath) => relative(repoRoot, filePath).replace(/\\/gu, "/"))
      .sort();

    const unexpected = actual.filter((file) => !ALLOWED_TS_NOCHECK_FILES.includes(file));
    const alreadyCleaned = ALLOWED_TS_NOCHECK_FILES.filter((file) => !actual.includes(file));

    expect(
      unexpected,
      `以下文件新增了 @ts-nocheck，禁止逃避类型检查：\n${unexpected.join("\n")}`
    ).toEqual([]);
    expect(
      alreadyCleaned,
      `以下文件已摘除 @ts-nocheck，请从 ALLOWED_TS_NOCHECK_FILES 白名单移除：\n${alreadyCleaned.join("\n")}`
    ).toEqual([]);
  });
});
