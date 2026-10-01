// 扫描 workspaces/ 失败要留痕（spaceStore.scanWorkspaces）。
//
// 降级本身是合理的：只返回注册表里已知的空间。但此前对 readdir 的失败一律静默，
// 于是「目录读不动」与「目录不存在」完全同形——磁盘上有、注册表里没有的空间这次全看不见，
// 用户在选择器里找不到它们，却无迹可寻。
//
// 同一函数里处理非法目录名时**是**会告警的，这一处不告警属于函数内的不一致。
// ENOENT 是常态（还没建过 workspaces/），不刷屏。
//
// 两个易踩的点（探针首版都栽了）：
//   · load() 会缓存 state，scanWorkspaces 只在**首次**加载时跑。所以断言必须换一个
//     新的 store 实例，否则第二次 list() 直接吃缓存、扫描压根没发生，看着像「注入无效」。
//   · list() 恒含「默认空间」，断言不能拿全量等值比。
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";

let failReaddirFor = "";
vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    readdir: async (dir, ...rest) => {
      if (failReaddirFor && String(dir) === failReaddirFor) {
        const error = new Error(`EACCES: permission denied, scandir '${dir}'`);
        error.code = "EACCES";
        throw error;
      }
      return actual.readdir(dir, ...rest);
    }
  };
});

const { createSpaceStore } = await import("./spaceStore.mjs");

const warnings = [];
let originalWarn;

beforeAll(() => {
  originalWarn = console.warn;
  console.warn = (...args) => {
    warnings.push(args.map(String).join(" "));
  };
});

afterAll(() => {
  console.warn = originalWarn;
});

describe("扫描工作区目录", () => {
  test("★ 目录读不到时告警，并说明本次只返回已登记的空间", async () => {
    const dataRoot = mkdtempSync(join(tmpdir(), "space-scan-"));
    try {
      const workspacesRoot = join(dataRoot, "workspaces");
      mkdirSync(join(workspacesRoot, "手工放的空间"), { recursive: true });

      // 第一个实例只负责把注册表写出来
      await createSpaceStore(dataRoot).create("已登记空间");

      // 第二个实例首次加载 → 这次扫描真的会发生
      warnings.length = 0;
      failReaddirFor = workspacesRoot;
      const listed = await createSpaceStore(dataRoot).list();
      failReaddirFor = "";

      const hit = warnings.filter((line) => line.includes("[空间]") && line.includes("扫描工作区目录失败"));
      expect(hit.length, "扫描失败没有留痕").toBeGreaterThan(0);
      expect(hit[0]).toContain("EACCES");
      // 降级本身仍然成立：list 照常返回注册表内的空间，没有因扫描失败而整体失败。
      // （不要断言「手工放的空间」不在列表里——第一个实例建注册表时那次扫描是成功的，
      // 它早就被登记进去了。这里断言的是**读不到时不再新增**，由第三条对照覆盖。）
      expect(listed.map((space) => space.name)).toContain("已登记空间");
    } finally {
      failReaddirFor = "";
      rmSync(dataRoot, { recursive: true, force: true });
    }
  });

  test("★ 目录真的不存在（ENOENT）时不刷屏，且 list 仍可用", async () => {
    const dataRoot = mkdtempSync(join(tmpdir(), "space-scan-enoent-"));
    try {
      await createSpaceStore(dataRoot).create("唯一空间");

      warnings.length = 0;
      const listed = await createSpaceStore(dataRoot).list();
      expect(warnings.filter((line) => line.includes("扫描工作区目录失败"))).toEqual([]);
      expect(listed.map((space) => space.name)).toContain("唯一空间");
    } finally {
      rmSync(dataRoot, { recursive: true, force: true });
    }
  });

  test("对照组：能读时，手工放入的空间照常被补登记", async () => {
    const dataRoot = mkdtempSync(join(tmpdir(), "space-scan-ok-"));
    try {
      const workspacesRoot = join(dataRoot, "workspaces");
      mkdirSync(join(workspacesRoot, "手工空间"), { recursive: true });

      await createSpaceStore(dataRoot).create("已登记空间");
      const names = (await createSpaceStore(dataRoot).list()).map((space) => space.name);

      expect(names).toContain("已登记空间");
      expect(names).toContain("手工空间");
    } finally {
      rmSync(dataRoot, { recursive: true, force: true });
    }
  });
});