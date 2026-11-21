import { readFileSync, statSync } from "node:fs";
import { isAbsolute, join, resolve } from "node:path";

function worktreeCommonRoot(repoRoot) {
  const gitMarkerPath = join(repoRoot, ".git");
  try {
    if (!statSync(gitMarkerPath).isFile()) return null;
    const marker = readFileSync(gitMarkerPath, "utf8").trim();
    if (!marker.startsWith("gitdir:")) return null;
    const gitDirValue = marker.slice("gitdir:".length).trim();
    const worktreeGitDir = isAbsolute(gitDirValue)
      ? resolve(gitDirValue)
      : resolve(repoRoot, gitDirValue);
    // worktree .git = <common-root>/.git/worktrees/<name>
    return resolve(worktreeGitDir, "..", "..", "..");
  } catch {
    return null;
  }
}

export function resolveDataRoot(repoRoot, explicitDataRoot) {
  if (explicitDataRoot !== undefined && explicitDataRoot !== null && String(explicitDataRoot).trim()) {
    return resolve(String(explicitDataRoot));
  }
  const commonRoot = worktreeCommonRoot(repoRoot);
  if (commonRoot) {
    const commonDataRoot = resolve(commonRoot, "data");
    try {
      if (statSync(commonDataRoot).isDirectory()) return commonDataRoot;
    } catch {
      // A source checkout without a data directory keeps the old repo-local fallback.
    }
  }
  return resolve(repoRoot, "data");
}
