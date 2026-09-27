import { describe, expect, test } from "vitest";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, readdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const serverDir = path.join(repoRoot, "server");

/**
 * 直载适配层清单 —— 由源码**推导**得出，不手写。
 *
 * 手写清单必然会漏：symbolExport.mjs 同样直载 src/export/device-template-icon.ts，
 * 之前不在名单里，于是「有人往它依赖链里加一条 .tsx import」这类回归会全绿通过，
 * 直到生产环境真发请求才抛 ERR_UNKNOWN_FILE_EXTENSION。实测确认它能加载 ——
 * 正因为没人测，才没人知道它能不能加载。
 *
 * 判据：server 下非测试的 .mjs，含 `import("../src/...` 动态导入。
 */
const nativeLoadAdapters = readdirSync(serverDir)
  .filter((name) => /^[^.]/.test(name) && name.endsWith(".mjs") && !name.endsWith(".test.mjs"))
  .filter((name) => /import\(\s*["']\.\.\/src\//u.test(readFileSync(path.join(serverDir, name), "utf8")))
  .sort();

const CHILD_SCRIPT = nativeLoadAdapters.map((name) => `await import("./server/${name}");`).join("\n");

describe("Node 原生直载后端适配层", () => {
  test("扫描面有效：确实推导出了直载适配层清单", () => {
    // 防「正则写坏 → 清单为空 → 子进程脚本变成空串 → 全绿」的假绿
    expect(nativeLoadAdapters.length).toBeGreaterThanOrEqual(4);
    expect(CHILD_SCRIPT).toContain("eFileExport.mjs");
    expect(CHILD_SCRIPT).toContain("symbolExport.mjs");
  });

  test("全部直载适配层可被 node 直接 import（不依赖 Vite transform）", () => {
    // 子进程用 node 直跑（不过 vitest 的 Vite transform）：
    // Vite/esbuild 能编译 .tsx，Node 不能。若依赖链里被加进一条指向 .tsx 的
    // import，测试会全绿而生产环境直载会抛 ERR_UNKNOWN_FILE_EXTENSION —— 本守卫专拦这类回归。
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
