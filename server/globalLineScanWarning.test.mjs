// 迁移扫描遇到读不到的目录要留痕（listProjectJsonFiles）。
//
// 该函数被两处 best-effort 迁移扫描调用（readStoredManagedProjects /
// migrateStoredProjects），可重跑，所以「跳过这棵子树」是刻意的：为一个读不到的目录
// 让整个迁移抛出去，等于「某处权限变了」就把每一次模型保存都打挂。
//
// 但静默跳过的代价是：那棵子树里的模型这次既不迁移也不清理，全局线路表与磁盘就此
// 不同步，日志里一个字都没有。故非 ENOENT 必须留一句；ENOENT（目录本就不在）是正常
// 路径，不该刷屏——否则每次新建空间都会冒一串。
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";

const UNREADABLE_DIR = "读不到的空间";
vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    readdir: async (dir, options) => {
      if (String(dir).endsWith(UNREADABLE_DIR)) {
        const error = new Error(`EACCES: permission denied, scandir '${dir}'`);
        error.code = "EACCES";
        throw error;
      }
      return actual.readdir(dir, options);
    }
  };
});

let dataDir;
let filesRoot;
const warnings = [];
let originalWarn;

beforeAll(() => {
  dataDir = mkdtempSync(join(tmpdir(), "glr-scan-warn-"));
  filesRoot = join(dataDir, "schemes", "files");
  mkdirSync(join(filesRoot, "正常空间"), { recursive: true });
  writeFileSync(
    join(filesRoot, "正常空间", "模型一.json"),
    JSON.stringify({ version: 1, name: "模型一", idx: 1, modelType: "厂站", nodes: [], edges: [] }),
    "utf-8"
  );
  mkdirSync(join(filesRoot, UNREADABLE_DIR), { recursive: true });
  writeFileSync(
    join(filesRoot, UNREADABLE_DIR, "模型二.json"),
    JSON.stringify({ version: 1, name: "模型二", idx: 2, modelType: "厂站", nodes: [], edges: [] }),
    "utf-8"
  );

  originalWarn = console.warn;
  console.warn = (...args) => {
    warnings.push(args.map(String).join(" "));
  };
});

afterAll(() => {
  console.warn = originalWarn;
  rmSync(dataDir, { recursive: true, force: true });
});

describe("迁移扫描遇到读不到的目录", () => {
  test("★ 非 ENOENT 会留痕，且说清跳过了哪棵子树", async () => {
    const { createGlobalLineRegistry } = await import("./globalLineRegistry.mjs");
    warnings.length = 0;
    const registry = createGlobalLineRegistry({ dataRoot: dataDir, schemeFilesRoot: filesRoot });

    await registry.rebuildFromStorage();

    const scanWarn = warnings.filter((line) => line.includes("[全局线路]") && line.includes("扫描目录失败"));
    expect(scanWarn.length, "读不到的目录没有留痕").toBeGreaterThan(0);
    expect(scanWarn[0]).toContain("EACCES");
    // 说出被跳过的目录，排查者才知道该去看哪儿
    expect(scanWarn.some((line) => line.includes(UNREADABLE_DIR))).toBe(true);
  });

  test("★ ENOENT（目录本就不在）不刷屏", async () => {
    const { createGlobalLineRegistry } = await import("./globalLineRegistry.mjs");
    warnings.length = 0;
    // 根目录整个不存在：每一层都是 ENOENT
    const registry = createGlobalLineRegistry({
      dataRoot: dataDir,
      schemeFilesRoot: join(dataDir, "根本不存在的根")
    });

    await registry.rebuildFromStorage();

    expect(warnings.filter((line) => line.includes("扫描目录失败")).length).toBe(0);
  });

  test("可读的那半边照常迁移（跳过是局部的，不是整体放弃）", async () => {
    const { createGlobalLineRegistry } = await import("./globalLineRegistry.mjs");
    warnings.length = 0;
    const registry = createGlobalLineRegistry({ dataRoot: dataDir, schemeFilesRoot: filesRoot });

    const records = await registry.rebuildFromStorage();

    // 模型一没有接触边界设备的线路，本就不产生记录；这里断言的是「没有抛错且正常返回」
    expect(Array.isArray(records)).toBe(true);
  });
});