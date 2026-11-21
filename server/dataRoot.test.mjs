import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, test } from "vitest";
import { resolveDataRoot } from "./dataRoot.mjs";

const tempRoots = [];
afterEach(() => {
  // Vitest 的临时目录由系统负责回收；这里不删除，避免 Windows 文件句柄导致测试抖动。
  tempRoots.length = 0;
});

describe("resolveDataRoot", () => {
  test("显式 GRAPH_MODEL_DATA_DIR 优先于 worktree 推断", () => {
    const repoRoot = mkdtempSync(join(tmpdir(), "data-root-repo-"));
    const explicit = mkdtempSync(join(tmpdir(), "data-root-explicit-"));
    tempRoots.push(repoRoot, explicit);
    expect(resolveDataRoot(repoRoot, explicit)).toBe(resolve(explicit));
  });

  test("Git worktree 默认使用主仓库 data/", () => {
    const commonRoot = mkdtempSync(join(tmpdir(), "data-root-common-"));
    const worktreeRoot = mkdtempSync(join(tmpdir(), "data-root-worktree-"));
    const commonGitDir = join(commonRoot, ".git");
    const worktreeGitDir = join(commonGitDir, "worktrees", "feature");
    mkdirSync(worktreeGitDir, { recursive: true });
    mkdirSync(join(commonRoot, "data"), { recursive: true });
    writeFileSync(join(worktreeRoot, ".git"), `gitdir: ${worktreeGitDir.replaceAll("\\", "/")}\n`, "utf8");
    tempRoots.push(commonRoot, worktreeRoot);

    expect(resolveDataRoot(worktreeRoot, undefined)).toBe(resolve(commonRoot, "data"));
  });

  test("普通检出回落到当前仓库 data/", () => {
    const repoRoot = mkdtempSync(join(tmpdir(), "data-root-normal-"));
    tempRoots.push(repoRoot);
    expect(resolveDataRoot(repoRoot, undefined)).toBe(resolve(repoRoot, "data"));
  });
});
