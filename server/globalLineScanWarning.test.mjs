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
// 已存项目文件的读盘失败按注入的 code 抛出（EACCES / ENOENT 各一条用例）。
// 目录侧失败走 readdir 桩，文件侧走 readFile 桩，二者互不干扰。
let failReadFor = null;
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
    },
    readFile: async (path, ...rest) => {
      if (failReadFor && String(path) === failReadFor.path) {
        const error = new Error(`${failReadFor.code}: injected read failure, open '${path}'`);
        error.code = failReadFor.code;
        throw error;
      }
      return actual.readFile(path, ...rest);
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

  // ── 读盘侧（readStoredManagedProjects / migrateStoredProjects 两处 catch）──
  //
  // 与上面的目录侧同一条纪律，但落点不同。目录侧丢掉的是「一棵子树」；文件侧丢掉的是
  // 「一个模型的全局线路判定」，两处后果各不相同：
  //
  //   readStoredManagedProjects —— 只被 syncProject 调用，读不到时
  //     previouslySavedGlobalLineIds 为空 ⇒ 同一条线路被重新分配记录；
  //   migrateStoredProjects —— 扫 reuseOnlyRecordIds（哪些记录不能被清空引用），
  //     读不到时那份名单残缺，第二遍照常把名单外的记录引用清空，即「读不到」变成了「删除」。
  //
  // 这两条通道**必须各自走一遍**：只测 rebuildFromStorage 只会经过后者，
  // 前者恒绿（变异 ① 首次注入时正是如此）。
  //
  // 三类输入都必要：
  //   EISDIR —— 真·非 ENOENT 读盘失败，必须 warn；
  //   ENOENT —— 列举与读盘之间被删的竞态，静默降级是既有契约，一个字都不许留；
  //   坏 JSON —— SyntaxError 没有 code，既往下走又不该被新加的告警刷屏，
  //            这是「把非 ENOENT 一律上告警」最容易写坏的边界。
  const projectWarn = () => warnings.filter((line) => (
    line.includes("[全局线路]") && line.includes("读取已存项目失败")
  ));

  test("★ 迁移扫描读盘失败（非 ENOENT）留痕，并说清哪个模型未进入复用保护名单", async () => {
    const { createGlobalLineRegistry } = await import("./globalLineRegistry.mjs");
    warnings.length = 0;
    failReadFor = { code: "EISDIR", path: join(filesRoot, "正常空间", "模型一.json") };
    const registry = createGlobalLineRegistry({ dataRoot: dataDir, schemeFilesRoot: filesRoot });
    try {
      await registry.rebuildFromStorage();
    } finally {
      failReadFor = null;
    }

    const readWarn = projectWarn();
    expect(readWarn.length, "读不到的项目文件没有留痕").toBeGreaterThan(0);
    expect(readWarn.some((line) => line.includes("EISDIR"))).toBe(true);
    expect(readWarn.some((line) => line.includes("模型一.json"))).toBe(true);
    expect(readWarn.some((line) => line.includes("复用保护名单"))).toBe(true);
  });

  test("★ syncProject 读已存项目失败（非 ENOENT）同样留痕", async () => {
    const { createGlobalLineRegistry } = await import("./globalLineRegistry.mjs");
    warnings.length = 0;
    const target = join(filesRoot, "正常空间", "模型一.json");
    failReadFor = { code: "EACCES", path: target };
    const registry = createGlobalLineRegistry({ dataRoot: dataDir, schemeFilesRoot: filesRoot });
    try {
      // 受管模型 + 一条接触边界设备的线路：syncProject 走到写盘前必然读过已存项目
      await registry.syncProject({
        projectIdx: 1,
        projectName: "模型一",
        schemePath: ["正常空间"],
        project: {
          version: 1,
          idx: 1,
          name: "模型一",
          modelType: "厂站",
          nodes: [
            { id: "station", kind: "ac-station-source", name: "厂站母线", params: {}, terminals: [] },
            { id: "bus", kind: "ac-bus", name: "普通母线", params: {}, terminals: [] },
            {
              id: "line-a",
              kind: "ac-routable-line",
              name: "边界线",
              params: {
                _routableLineSourceNodeId: "bus",
                _routableLineTargetNodeId: "station"
              },
              terminals: []
            }
          ],
          edges: []
        }
      });
    } finally {
      failReadFor = null;
    }

    const readWarn = projectWarn();
    expect(readWarn.length, "syncProject 读不到已存项目却没有留痕").toBeGreaterThan(0);
    expect(readWarn.some((line) => line.includes("EACCES"))).toBe(true);
    expect(readWarn.some((line) => line.includes("模型一.json"))).toBe(true);
    expect(readWarn.some((line) => line.includes("未参与本次判定"))).toBe(true);
  });

  test("★ 项目文件真的不在（ENOENT）时不刷屏，与 EISDIR 明确不同", async () => {
    const { createGlobalLineRegistry } = await import("./globalLineRegistry.mjs");
    warnings.length = 0;
    failReadFor = { code: "ENOENT", path: join(filesRoot, "正常空间", "模型一.json") };
    const registry = createGlobalLineRegistry({ dataRoot: dataDir, schemeFilesRoot: filesRoot });
    try {
      await registry.rebuildFromStorage();
      await registry.syncProject({ projectIdx: 1, projectName: "模型一", schemePath: ["正常空间"], project: { modelType: "厂站", nodes: [] } });
    } finally {
      failReadFor = null;
    }

    // 同一条代码路径、同一个文件，只把 code 换掉：告警出现与否即为两条的分野。
    expect(projectWarn()).toEqual([]);
  });

  test("坏 JSON 静默跳过，既不抛也不被新告警刷屏", async () => {
    const { createGlobalLineRegistry } = await import("./globalLineRegistry.mjs");
    // 路径必须落在 filesRoot 之下：迁移扫描从 filesRoot 起枚举，写到 dataDir 顶层的
    // 文件永远不会被列到，坏 JSON 那条就成了一条与被测代码无关的空断言。
    const brokenRoot = join(filesRoot, "坏JSON空间");
    mkdirSync(brokenRoot, { recursive: true });
    writeFileSync(join(brokenRoot, "模型三.json"), "{ 这不是 JSON", "utf-8");
    warnings.length = 0;
    const registry = createGlobalLineRegistry({ dataRoot: dataDir, schemeFilesRoot: filesRoot });
    try {
      const records = await registry.rebuildFromStorage();
      expect(Array.isArray(records)).toBe(true);
      // syncProject 那条通道同样静默：JSON.parse 的失败不是「读不到」
      const synced = await registry.syncProject({ projectIdx: 3, projectName: "模型三", schemePath: ["坏JSON空间"], project: { modelType: "厂站", nodes: [] } });
      expect(Array.isArray(synced.nodes)).toBe(true);
    } finally {
      failReadFor = null;
    }

    expect(projectWarn()).toEqual([]);
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