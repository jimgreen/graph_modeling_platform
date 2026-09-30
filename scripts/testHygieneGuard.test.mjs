// 测试卫生守卫：`.only` / `.skip` 与「零用例的测试文件」。
//
// 为什么要盯：
//   · `test.only` / `describe.only` 会让同文件里其余用例**静默不跑**，全量测试照样「全绿」；
//   · `test.skip` 把一条回归守卫变成装饰品 —— 它还在文件里，但再也不转红；
//   · 一个没有 `test(` 的测试文件更隐蔽：`.mjs` 里写错语法时 vitest 报的是
//     `Tests: no tests`，看起来像「没跑到用例」，很容易被当成通过（server/CLAUDE.md 专门警告过）。
// 这三条都属于 CLAUDE.md 里「无假完成」那条铁律的自动化版本。
//
// 已正向验证：临时放一个带 test.only + test.skip 的探针文件进 src/，本守卫两条断言立刻转红并
// 点名该文件，删掉探针后恢复绿。本文件自身豁免（判定正则里就写着那些字面量）。
//
// **不拦 `describe.skipIf` / `it.skipIf`**：那是本仓库的既有约定（见
// src/encoding/dms-rtdb-export-rules.test.ts 的注释）—— 按「样本文件在不在」条件跳过，
// 与「把守卫改成装饰品」是两回事。
import { describe, expect, test } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const SCAN_DIRS = ["src", "server", "scripts", "e2e"];
const TEST_FILE = /\.test\.(ts|tsx|mjs)$/;

const stripComments = (source) =>
  source
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|\s)\/\/.*$/gm, "$1");

function testFiles(dir) {
  const full = path.join(repoRoot, dir);
  let entries;
  try {
    entries = readdirSync(full, { withFileTypes: true });
  } catch {
    return [];
  }
  return entries.flatMap((entry) => {
    const child = path.join(dir, entry.name);
    if (entry.isDirectory()) return testFiles(child);
    // 统一成 POSIX 分隔符： SELF 之类的字面量在 Windows 上也要能对得上
    return TEST_FILE.test(entry.name) ? [child.split(path.sep).join("/")] : [];
  });
}

/** 本文件自身要豁免：它的判定正则里就写着那些字面量，否则会自己告自己。 */
const SELF = "scripts/testHygieneGuard.test.mjs";

const files = SCAN_DIRS.flatMap(testFiles);
const scanned = files.filter((file) => file !== SELF);
const codeOf = (file) => stripComments(readFileSync(path.join(repoRoot, file), "utf8"));

describe("测试卫生守卫", () => {
  test("扫到了测试文件（守卫本身没跑空）", () => {
    expect(files.length).toBeGreaterThan(50);
  });

  test("★ 没有 test.only / it.only / describe.only（它们会静默停掉同文件其余用例）", () => {
    const hits = scanned.filter((file) => /\b(?:test|it|describe)\.only\b/.test(codeOf(file)));
    expect(hits, `这些文件里有 .only：${hits.join(", ")}`).toEqual([]);
  });

  test("★ 没有裸的 test.skip / it.skip / describe.skip（skipIf 是仓库既有约定，不拦）", () => {
    const hits = scanned.filter((file) => /\b(?:test|it|describe)\.skip\(/.test(codeOf(file)));
    expect(hits, `这些文件里有 .skip：${hits.join(", ")}`).toEqual([]);
  });

  test("★ 每个测试文件至少有一个用例（防「no tests 被当成通过」）", () => {
    const empty = scanned.filter((file) => !/^\s*(?:test|it)(?:\.\w+)*\(/m.test(codeOf(file)));
    expect(empty, `这些测试文件里没有 test(/it(：${empty.join(", ")}`).toEqual([]);
  });
});
