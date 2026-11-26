/**
 * 显式 any 只减不增守卫：
 * 配合 scripts/tsNocheckGuard.test.mjs（全仓 0 个 @ts-nocheck），
 * 锁住 src/ 生产代码中的显式 any / Record<string, any> 总量上限，防止类型安全退化反弹。
 * 每次进一步收紧类型后，同步调低 MAX_EXPLICIT_ANY_COUNT。
 */
import { describe, expect, test } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const srcRoot = join(repoRoot, "src");

const MAX_EXPLICIT_ANY_COUNT = 1140;
const EXPLICIT_ANY_PATTERN = /:\s*any\b|\bas\s+any\b|<any>|Record<string,\s*any>/g;
const IGNORED_DIRS = new Set(["node_modules", ".git", "dist", ".worktrees", "data", "tmp"]);

function walkProdTsFiles(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (IGNORED_DIRS.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      walkProdTsFiles(full, out);
    } else if (/\.(ts|tsx)$/.test(entry.name) && !entry.name.includes(".test.")) {
      out.push(full);
    }
  }
  return out;
}

describe("src/ 显式 any 只减不增守卫", () => {
  test("全仓生产代码显式 any 总数不得超过当前基线上限", () => {
    let total = 0;
    const perFile = [];
    for (const file of walkProdTsFiles(srcRoot)) {
      const text = readFileSync(file, "utf8");
      const matches = text.match(EXPLICIT_ANY_PATTERN);
      if (matches && matches.length > 0) {
        total += matches.length;
        perFile.push({ file: file.slice(repoRoot.length + 1).replace(/\\/g, "/"), count: matches.length });
      }
    }
    const topHotspots = perFile.sort((a, b) => b.count - a.count).slice(0, 8)
      .map((item) => `  ${item.file}: ${item.count}`).join("\n");
    expect(
      total,
      `显式 any 总数 (${total}) 超过基线上限 (${MAX_EXPLICIT_ANY_COUNT})，请优先使用 appScopeTypes.ts 分域接口或具名类型。\n前 8 热点：\n${topHotspots}`
    ).toBeLessThanOrEqual(MAX_EXPLICIT_ANY_COUNT);
  });
});
