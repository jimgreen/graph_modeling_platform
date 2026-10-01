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
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, test, vi } from "vitest";

// 必须让 **rename** 失败，而不是 writeFile：tmp 残骸只在「tmp 已写成、rename 没搬成」时
// 才有东西可漏。writeFile 失败的话 tmp 压根没被创建，断言恒绿、没有判别力
// （探针实测：桩 writeFile 失败时，改动前后用例都通过 —— 假绿）。
// rename 失败是真实场景：Windows 上目标文件被占用（杀软/同步盘/另一个进程）即 EPERM/EBUSY。
let failRenames = false;
// 「写到一半崩溃」注入：只对**非 .tmp 路径**生效——即直接往目标文件写的裸 writeFile。
// tmp 路径不注入，否则连原子写自己的临时文件也被腰斩，测的就不是目标文件了。
let truncateWrites = false;
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
    },
    writeFile: async (path, data, options) => {
      if (truncateWrites && !String(path).endsWith(".tmp")) {
        const text = typeof data === "string" ? data : String(data);
        await actual.writeFile(path, text.slice(0, Math.floor(text.length / 2)), options);
        const error = new Error(`ENOSPC: no space left on device, write '${path}'`);
        error.code = "ENOSPC";
        throw error;
      }
      return actual.writeFile(path, data, options);
    }
  };
});

const { createGlobalLineRegistry } = await import("./globalLineRegistry.mjs");
const { createSpaceStore } = await import("./spaceStore.mjs");

const tmpFilesUnder = (dir) => readdirSync(dir).filter((name) => name.endsWith(".tmp"));

let dataDir;

afterEach(() => {
  failRenames = false;
  truncateWrites = false;
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

// ─── 模型文件本身不得被写成半截 ──────────────────────────────────
//
// rebuildFromStorage 会就地重写 schemes/files/**.json（把线路收敛进全局表）。
// 此前 writeProjectIfChanged 用的是裸 writeFile：进程写到一半崩溃 / 磁盘满 / Windows
// 上被占用，用户的模型文件就停在半截 JSON 上 —— 该模型直接报废且无从恢复。
// 这正是 shared/atomicWrite.mjs 文件头把「manifest 非原子写」列为 A1-P0-1 的那类问题，
// 而模型文件的分量比 manifest 更重。
describe("模型文件的原子性", () => {
  const node = (id, kind, params = {}, name = id) => ({ id, kind, name, params, terminals: [] });
  const line = (id, kind, sourceId, targetId, params = {}, name = id) => node(id, kind, {
    rated_capacity: "220",
    i_max: "199",
    r: "0.1",
    i_node: "1",
    j_node: "2",
    _routableLineSourceNodeId: sourceId,
    _routableLineTargetNodeId: targetId,
    ...params
  }, name);

  /** 种一个「厂站」模型：接触边界设备的交流线路会在迁移时被改写。 */
  const seedManagedProject = (dataRoot) => {
    const boundary = node("station", "ac-station-source", { model_id: "3" });
    const bus = node("bus", "ac-bus");
    const boundaryLine = line("boundary-line", "ac-routable-line", bus.id, boundary.id, {}, "边界线");
    const dir = join(dataRoot, "schemes", "files", "方案A");
    mkdirSync(dir, { recursive: true });
    const filePath = join(dir, "厂站一.json");
    writeFileSync(
      filePath,
      `${JSON.stringify({ version: 1, idx: 3, name: "厂站一", modelType: "厂站", nodes: [boundary, bus, boundaryLine], edges: [] }, null, 2)}\n`,
      "utf-8"
    );
    return filePath;
  };

  test("★ 迁移正常时模型文件被完整改写（不是没写）", async () => {
    dataDir = mkdtempSync(join(tmpdir(), "glr-atomic-ok-"));
    const filePath = seedManagedProject(dataDir);
    const before = readFileSync(filePath, "utf-8");
    const registry = createGlobalLineRegistry({
      dataRoot: dataDir,
      schemeFilesRoot: join(dataDir, "schemes", "files")
    });

    await registry.rebuildFromStorage();

    const after = readFileSync(filePath, "utf-8");
    // 迁移确实改写了这个文件（线路被收敛进全局表）—— 否则下一条的「完整性」断言是空转
    expect(after).not.toBe(before);
    expect(() => JSON.parse(after)).not.toThrow();
  });

  test("★ 写到一半崩溃：模型文件仍是完整可解析的 JSON，不留半截", async () => {
    dataDir = mkdtempSync(join(tmpdir(), "glr-atomic-crash-"));
    const filePath = seedManagedProject(dataDir);
    const before = readFileSync(filePath, "utf-8");
    const registry = createGlobalLineRegistry({
      dataRoot: dataDir,
      schemeFilesRoot: join(dataDir, "schemes", "files")
    });

    // 裸 writeFile 会被腰斩（写一半再抛）；原子写的 tmp 路径不受影响。
    // 错误本身要吞掉：真正要证明的是**磁盘上的模型文件**有没有被留在半截，
    // 异常抛不抛是次要的（让它冒出来会让断言在读到文件内容前就中断）。
    truncateWrites = true;
    await registry.rebuildFromStorage().catch(() => undefined);

    const after = readFileSync(filePath, "utf-8");
    expect(() => JSON.parse(after), "模型文件被留在了半截 JSON 上").not.toThrow();
    // 要么原封不动（写失败），要么被完整替换 —— 绝不是前缀
    expect(after === before || JSON.parse(after).name === "厂站一").toBe(true);
  });
});