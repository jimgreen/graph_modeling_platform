import { describe, expect, test } from "vitest";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));

// 子进程用 node 直跑（不过 vitest 的 Vite transform）：
// Vite/esbuild 能编译 .tsx，Node 不能。若后端适配层的依赖链里被加进一条指向 .tsx 的
// import，测试会全绿而生产环境直载会抛 ERR_UNKNOWN_FILE_EXTENSION —— 本守卫专拦这类回归。
const CHILD_SCRIPT = `
await import("./server/eFileExport.mjs");
await import("./server/svgExport.mjs");
await import("./server/cimExport.mjs");
`;

describe("Node 原生直载后端适配层", () => {
  test("三个适配层可被 node 直接 import（不依赖 Vite transform）", () => {
    const dataDir = mkdtempSync(path.join(tmpdir(), "native-load-"));
    try {
      const result = spawnSync(process.execPath, ["--input-type=module", "-e", CHILD_SCRIPT], {
        cwd: repoRoot,
        env: { ...process.env, GRAPH_MODEL_DATA_DIR: dataDir },
        encoding: "utf-8",
        windowsHide: true
      });
      const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
      expect(output).not.toContain("ERR_UNKNOWN_FILE_EXTENSION");
      expect(output).not.toContain("Unknown file extension");
      expect(result.status).toBe(0);
    } finally {
      rmSync(dataDir, { recursive: true, force: true });
    }
  });
});
