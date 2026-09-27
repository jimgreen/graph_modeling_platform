// .gitattributes 存在性与行尾策略守卫 —— 此前该文件完全不存在。
//
// 为什么需要守卫：本仓库原先没有 .gitattributes，只靠各人本地的 core.autocrlf
// （Windows 上为 true）。后果是 `git status` 会持续假报警：跑完
// `npm run gen:gbk-table` 后显示 `M src/encoding/gbkTable.ts`，但 `git diff` 为空、
// 归一化后的 blob hash 与 HEAD 完全一致 —— 纯 stat-cache 的行尾抖动。
// 这类假报警会让人以为生成器改坏了产物，实测因此白排查了一轮。
//
// 行尾策略一旦被删或被改松，问题会静默回归且极难归因，故钉住。
import { describe, expect, test } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const gitattributesPath = path.join(repoRoot, ".gitattributes");

describe(".gitattributes 行尾策略", () => {
  test("文件存在（删除会让 git status 假报警静默回归）", () => {
    expect(
      existsSync(gitattributesPath),
      "缺少 .gitattributes：git status 会因 core.autocrlf 持续假报警（内容零差异却显示 M）"
    ).toBe(true);
  });

  test("源码类型显式声明 eol=lf，不依赖各人本地 autocrlf", () => {
    const source = readFileSync(gitattributesPath, "utf8");
    for (const ext of ["ts", "tsx", "mjs", "js", "cjs", "json", "md", "css"]) {
      const pattern = new RegExp(`^\\*\\.${ext}\\s+text\\s+eol=lf\\s*$`, "mu");
      expect(pattern.test(source), `*.${ext} 未显式声明 text eol=lf`).toBe(true);
    }
  });

  test("有兜底的 * text=auto（未列出的文件不至于失控）", () => {
    const source = readFileSync(gitattributesPath, "utf8");
    expect(/^\*\s+text=auto\s*$/mu.test(source)).toBe(true);
  });

  test("Windows 批处理强制 CRLF（否则在 cmd 下无法执行）", () => {
    const source = readFileSync(gitattributesPath, "utf8");
    expect(/^\*\.bat\s+text\s+eol=crlf\s*$/mu.test(source)).toBe(true);
    expect(/^\*\.cmd\s+text\s+eol=crlf\s*$/mu.test(source)).toBe(true);
  });

  test("二进制类型标记为 binary（行尾转换会损坏文件）", () => {
    const source = readFileSync(gitattributesPath, "utf8");
    for (const ext of ["png", "jpg", "zip", "pdf", "woff2"]) {
      expect(new RegExp(`^\\*\\.${ext}\\s+binary\\s*$`, "mu").test(source), `*.${ext} 未标记 binary`).toBe(
        true
      );
    }
  });
});
