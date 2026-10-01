// 原子写失败不得留下 tmp 残骸（globalLineRegistry / spaceStore 的 writeState）。
//
// 这两处此前各自手搓 tmp+rename：写失败（磁盘满 / 权限丢失 / Windows 上文件被占用）
// 会把 `<目标>.json.<pid>.<uuid>.tmp` 永久留在磁盘上，没有任何清理扫得到。
//
// 后果不止是垃圾文件：空间导出 ZIP（spaceArchive.listSpaceFiles）遍历整个 schemes/，
// 只排除 schemes/trash —— 全局线路注册表正在 schemes/ 下，于是这些半截 JSON 会被
// 打进用户的备份包，再导入时一起回到空间里。
//
// 现已改走 shared/atomicWrite.mjs（tmp+rename+失败清理）。本文件钉住该行为。
import { mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, test, vi } from "vitest";

// 必须让 **rename** 失败，而不是 writeFile：tmp 残骸只在「tmp 已写成、rename 没搬成」时
// 才有东西可漏。writeFile 失败的话 tmp 压根没被创建，断言恒绿、没有判别力
// （探针实测：桩 writeFile 失败时，改动前后用例都通过 —— 假绿）。
// rename 失败是真实场景：Windows 上目标文件被占用（杀软/同步盘/另一个进程）即 EPERM/EBUSY。
let failRenames = false;
vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    rename: async (from, to) => {
      if (failRenames && String(from).endsWith(".tmp")) {
        const error = new Error(`EPERM: operation not permitted, rename '${from}' -> '${to}'`);
        error.code = "EPERM";
        throw error;
      }
      return actual.rename(from, to);
    }
  };
});

const { createGlobalLineRegistry } = await import("./globalLineRegistry.mjs");
const { createSpaceStore } = await import("./spaceStore.mjs");

const tmpFilesUnder = (dir) => readdirSync(dir).filter((name) => name.endsWith(".tmp"));

let dataDir;

afterEach(() => {
  failRenames = false;
  if (dataDir) rmSync(dataDir, { recursive: true, force: true });
  dataDir = null;
});

describe("写失败不留 tmp 残骸", () => {
  test("★ 全局线路注册表：rename 失败后 schemes/ 下无 .tmp，且错误照常上抛", async () => {
    dataDir = mkdtempSync(join(tmpdir(), "glr-tmp-"));
    const registry = createGlobalLineRegistry({ dataRoot: dataDir });

    failRenames = true;
    await expect(registry.attach({
      energyType: "ac",
      name: "线路一",
      references: [{ schemePath: ["方案甲"], nodeId: "n1", boundaryEndpoint: "source", terminalType: "ac" }]
    })).rejects.toThrow(/EPERM/u);

    expect(tmpFilesUnder(join(dataDir, "schemes"))).toEqual([]);
  });

  test("★ 写成功后也不留 .tmp（正常路径本来就没有）", async () => {
    dataDir = mkdtempSync(join(tmpdir(), "glr-tmp-ok-"));
    const registry = createGlobalLineRegistry({ dataRoot: dataDir });

    await registry.attach({
      energyType: "ac",
      name: "线路一",
      references: [{ schemePath: ["方案甲"], nodeId: "n1", boundaryEndpoint: "source", terminalType: "ac" }]
    });

    expect(tmpFilesUnder(join(dataDir, "schemes"))).toEqual([]);
  });

  test("★ 空间注册表：rename 失败后数据根下无 .tmp，且错误照常上抛", async () => {
    dataDir = mkdtempSync(join(tmpdir(), "space-tmp-"));
    const store = createSpaceStore(dataDir);

    failRenames = true;
    await expect(store.create({ name: "新空间" })).rejects.toThrow(/EPERM/u);

    expect(tmpFilesUnder(dataDir)).toEqual([]);
  });
});