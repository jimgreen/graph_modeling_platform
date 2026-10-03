// scripts/purge-derived-scheme-files.mjs（`pnpm purge:derived`）直测 —— 此前零直测。
//
// ## 为什么该脚本必须有测试
//
// 它对**用户的真实数据**动手：把 data/schemes/files 下的非 .json 文件 `rename`
// 进 data/schemes/trash/<timestamp>/。三条纪律此前只写在注释里：
//   1. 默认 dry-run，不碰任何文件；
//   2. 只归档非 .json（.json 是模型本体，scheme.json 是注册表）；
//   3. 根目录读不到就 exit 1 —— 静默当「无待归档文件」会让操作员误判存量已清完。
//
// ## 为什么安全
//
// 脚本接受位置参数作为 filesRoot，所以测试全部指向 **tmpdir 里现造的树**，
// 绝不指向仓库的 data/。真实 data/ 一个字节都不会被读到或写到。
import { describe, expect, test, beforeEach, afterEach } from "vitest";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT = fileURLToPath(new URL("./purge-derived-scheme-files.mjs", import.meta.url));

let caseDir;
let filesRoot;

/** 造一个 `<caseDir>/files` 方案树，并返回该树的根。 */
function seedTree(files) {
  const root = join(caseDir, "files");
  for (const relPath of files) {
    const full = join(root, relPath);
    mkdirSync(join(full, ".."), { recursive: true });
    writeFileSync(full, "x", "utf-8");
  }
  return root;
}

/** 跑脚本，返回 { status, stdout, stderr }。 */
function run(args) {
  const result = spawnSync(process.execPath, [SCRIPT, ...args], { encoding: "utf-8" });
  return { status: result.status, stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
}

/** 把 Windows 的 \ 换成 /，让断言与平台无关。 */
function posix(path) {
  return relative(caseDir, path).replace(/\\/gu, "/");
}

beforeEach(() => {
  caseDir = mkdtempSync(join(tmpdir(), "purge-derived-"));
  filesRoot = null;
});

afterEach(() => {
  rmSync(caseDir, { recursive: true, force: true });
});

describe("purge:derived —— 默认 dry-run", () => {
  test("★ 只报告不移动：文件原地不动，trash 目录根本不被创建", () => {
    filesRoot = seedTree(["模型A.json", "模型A.e", "子方案/模型B.json", "子方案/模型B.svg"]);
    const before = ["模型A.json", "模型A.e", "子方案/模型B.json", "子方案/模型B.svg"]
      .map((relPath) => join(filesRoot, relPath));

    const { status, stdout } = run([filesRoot]);

    expect(status).toBe(0);
    expect(stdout).toContain("将归档");
    expect(stdout).toContain("（加 --apply 执行）");
    for (const file of before) {
      expect(existsSync(file), file).toBe(true);
    }
    expect(existsSync(join(caseDir, "trash"))).toBe(false);
  });

  test("只列出非 .json 文件，.json 一个都不提", () => {
    filesRoot = seedTree(["模型A.json", "模型A.e", "子方案/scheme.json"]);
    const { status, stdout } = run([filesRoot]);

    expect(status).toBe(0);
    expect(stdout).toContain("模型A.e");
    expect(stdout).not.toContain("模型A.json");
    expect(stdout).not.toContain("scheme.json");
  });

  test("递归到子方案目录（相对路径按 filesRoot 给，不是按方案目录）", () => {
    filesRoot = seedTree(["子方案/更深/模型C.svg"]);
    const { status, stdout } = run([filesRoot]);

    expect(status).toBe(0);
    expect(stdout.replace(/\\/gu, "/")).toContain("子方案/更深/模型C.svg");
  });

  test("目录里只有 .json 时报「无待归档文件」", () => {
    filesRoot = seedTree(["模型A.json"]);
    const { status, stdout } = run([filesRoot]);

    expect(status).toBe(0);
    expect(stdout).toContain("无待归档文件");
  });

  test("空目录同样是「无待归档文件」，不是报错", () => {
    // 注意与「目录不存在」的区别：这里目录**存在**只是空的（seedTree 不建空目录，故手动 mkdir）
    filesRoot = join(caseDir, "files");
    mkdirSync(filesRoot, { recursive: true });
    const { status, stdout } = run([filesRoot]);

    expect(status).toBe(0);
    expect(stdout).toContain("无待归档文件");
  });

  test("路径分隔符断言辅助函数本身可用（本组用例的基座）", () => {
    filesRoot = seedTree(["模型A.e"]);
    expect(posix(join(filesRoot, "模型A.e"))).toBe("files/模型A.e");
  });
});

// ─── --apply ─────────────────────────────────────────────

describe("purge:derived —— --apply 真归档", () => {
  /** trash 下的归档批次目录（形如 trash/2026-10-03T04-05-06-789Z）。 */
  function archiveBatchDirs() {
    const trash = join(caseDir, "trash");
    return existsSync(trash) ? readdirSync(trash) : [];
  }

  test("★ 文件真的被移走，落进 trash/<timestamp>/ 且保留相对路径", () => {
    filesRoot = seedTree(["模型A.e", "子方案/模型B.svg"]);
    const { status } = run([filesRoot, "--apply"]);

    expect(status).toBe(0);
    expect(existsSync(join(filesRoot, "模型A.e"))).toBe(false);
    expect(existsSync(join(filesRoot, "子方案/模型B.svg"))).toBe(false);

    const batches = archiveBatchDirs();
    expect(batches.length).toBe(1);
    // ISO 时间戳里的 : 被换成 -（文件名在 Windows 上不能用冒号）
    expect(batches[0]).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-/u);
    const batchDir = join(caseDir, "trash", batches[0]);
    expect(existsSync(join(batchDir, "模型A.e"))).toBe(true);
    expect(existsSync(join(batchDir, "子方案", "模型B.svg"))).toBe(true);
  });

  test("★ .json 原地不动（模型本体与 scheme.json 都不能被归档走）", () => {
    filesRoot = seedTree(["模型A.json", "scheme.json", "子方案/模型B.json"]);
    const { status } = run([filesRoot, "--apply"]);

    expect(status).toBe(0);
    expect(existsSync(join(filesRoot, "模型A.json"))).toBe(true);
    expect(existsSync(join(filesRoot, "scheme.json"))).toBe(true);
    expect(existsSync(join(filesRoot, "子方案", "模型B.json"))).toBe(true);
    expect(archiveBatchDirs()).toEqual([]);
  });

  test("输出用「归档 / 已归档」而非 dry-run 的「将归档」，并给出总数", () => {
    filesRoot = seedTree(["模型A.e", "模型A.svg"]);
    const { status, stdout } = run([filesRoot, "--apply"]);

    expect(status).toBe(0);
    expect(stdout).not.toContain("将归档");
    expect(stdout).toContain("已归档 2 个文件");
  });

  test("归档后原目录树保留（方案目录本身不删，只是里面的派生文件被搬走）", () => {
    filesRoot = seedTree(["模型A.json", "模型A.e"]);
    run([filesRoot, "--apply"]);

    expect(existsSync(filesRoot)).toBe(true);
    expect(existsSync(join(filesRoot, "模型A.json"))).toBe(true);
    expect(readdirSync(filesRoot)).toEqual(["模型A.json"]);
  });

  test("重复执行是幂等的：第二轮无待归档文件，不再造新批次", () => {
    filesRoot = seedTree(["模型A.e"]);
    run([filesRoot, "--apply"]);
    const first = archiveBatchDirs();

    const { status, stdout } = run([filesRoot, "--apply"]);

    expect(status).toBe(0);
    expect(stdout).toContain("无待归档文件");
    expect(archiveBatchDirs()).toEqual(first);
  });
});

// ─── 根目录读不到 ────────────────────────────────────────

describe("purge:derived —— 根目录不存在", () => {
  test("★ exit 1，且**不**打印「无待归档文件」", () => {
    // 这是最要紧的一条：静默当「无待归档文件」会让操作员误判存量已清完。
    const missing = join(caseDir, "根本不存在");
    const { status, stdout, stderr } = run([missing]);

    expect(status).toBe(1);
    expect(stdout).not.toContain("无待归档文件");
    expect(stderr).toContain("无法读取待归档根目录");
  });

  test("报错信息带上出错的具体路径（操作员要能直接照着排查）", () => {
    const missing = join(caseDir, "缺一层");
    const { status, stderr } = run([missing]);

    expect(status).toBe(1);
    expect(stderr).toContain(missing);
  });

  test("加 --apply 也一样 exit 1（不会因为要写 trash 就绕过校验）", () => {
    const missing = join(caseDir, "还是不存在");
    const { status, stdout } = run([missing, "--apply"]);

    expect(status).toBe(1);
    expect(stdout).not.toContain("已归档");
    expect(existsSync(join(caseDir, "trash"))).toBe(false);
  });
});

// ─── 「什么算派生文件」的判据 ────────────────────────────

describe("purge:derived —— 什么算派生文件", () => {
  test("★ `.JSON` / `.Json` 视为模型文件，保留（判据带 i 标志）", () => {
    filesRoot = seedTree(["大写.JSON", "混合.Json", "模型.json"]);
    const { status } = run([filesRoot, "--apply"]);

    expect(status).toBe(0);
    for (const name of ["大写.JSON", "混合.Json", "模型.json"]) {
      expect(existsSync(join(filesRoot, name)), name).toBe(true);
    }
  });

  test("除 .json 外的一切扩展名都算派生文件（.e/.svg/.xml/.bak/.txt）", () => {
    filesRoot = seedTree([
      "模型A.json",
      "模型A.e",
      "模型A.svg",
      "模型A.xml",
      "模型A.bak",
      "模型A.txt"
    ]);
    const { status, stdout } = run([filesRoot, "--apply"]);

    expect(status).toBe(0);
    expect(stdout).toContain("已归档 5 个文件");
    expect(readdirSync(filesRoot)).toEqual(["模型A.json"]);
  });

  test("无扩展名的文件也算派生文件", () => {
    filesRoot = seedTree(["README"]);
    const { status, stdout } = run([filesRoot, "--apply"]);

    expect(status).toBe(0);
    expect(stdout).toContain("已归档 1 个文件");
    expect(readdirSync(filesRoot)).toEqual([]);
  });

  test("路径里含 `.json` 但不是后缀的文件不被误判（子目录名带 .json）", () => {
    filesRoot = seedTree(["old.json 目录/模型D.e"]);
    const { status } = run([filesRoot, "--apply"]);

    expect(status).toBe(0);
    const batches = readdirSync(join(caseDir, "trash"));
    expect(existsSync(join(caseDir, "trash", batches[0], "old.json 目录", "模型D.e"))).toBe(true);
  });
});