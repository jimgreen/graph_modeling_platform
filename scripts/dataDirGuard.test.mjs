// `data/` 不得有任何版本跟踪文件 —— 守卫。
//
// 项目 CLAUDE.md 写着「`data/` 整目录忽略、无版本跟踪文件（`git ls-files data` 为空）」，
// 但此前没有任何测试盯着。为什么值得盯：
//   · `data/` 是运行时数据根（default 空间就是它），里面会出现用户的方案、导出的派生文件
//     （.e / .svg / CIM）、缓存与回收站。误提交 = 用户数据进仓库，且 `data/workspaces/` 会
//     破坏「clean 检出必然缺数据」这个前提，一堆按样本取数的用例会跟着行为漂移。
//   · 一旦有人 `git add -f data/...`，`.gitignore` 不会拦，事后只能靠人记得删。
// 派生文件的正确去处是 `pnpm purge:derived`（归档进 `data/schemes/trash/`），仍在 data/ 内。
//
// 已正向验证：`git add -f data/__guard_probe.txt` 之后本守卫立刻转红并点名那个路径，
// 撤掉暂存（`git reset -- data/...`）后恢复绿。
//
// 判定分两半：① .gitignore 里必须有 data/ 这一条（挡住新增）；② `git ls-files data` 必须为空
// （挡住已经被跟踪的历史遗留）。没有 .git 的检出（tarball / 裸拷贝）里第②半无意义，跳过。
import { describe, expect, test } from "vitest";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const hasGitDir = existsSync(path.join(repoRoot, ".git"));

const trackedUnderData = () => {
  if (!hasGitDir) return null;
  return execFileSync("git", ["ls-files", "--", "data"], { cwd: repoRoot, encoding: "utf8" })
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
};

describe("data/ 目录守卫", () => {
  test("★ .gitignore 里有 data/ 这一条", () => {
    const lines = readFileSync(path.join(repoRoot, ".gitignore"), "utf8").split(/\r?\n/).map((line) => line.trim());
    expect(lines, ".gitignore 必须忽略整个 data/ 目录").toContain("data/");
  });

  test("★ data/ 下没有版本跟踪文件", () => {
    const tracked = trackedUnderData();
    if (tracked === null) {
      // 没有 .git 的检出里谈不上「被跟踪」，这一半不适用
      expect(true).toBe(true);
      return;
    }
    expect(tracked, `这些 data/ 下的文件被 git 跟踪了，请 git rm --cached：\n${tracked.join("\n")}`).toEqual([]);
  });

  test("★ 图标库在 public/ 下（那一份才是版本跟踪的）", () => {
    // 记忆里踩过的坑：data/icon-library/ 曾被当成图标库真源，实际真源是 public/icon-library/
    expect(existsSync(path.join(repoRoot, "public", "icon-library"))).toBe(true);
    const trackedIcons = hasGitDir
      ? execFileSync("git", ["ls-files", "--", "public/icon-library"], { cwd: repoRoot, encoding: "utf8" }).split("\n").filter(Boolean).length
      : 0;
    expect(trackedIcons).toBeGreaterThan(0);
  });
});
