// 旧版注册表迁移的判定失败要留痕（globalLineRegistry 的 fileExists）。
//
// fileExists 的唯一用途是 ensureInitialized 里那句「新版注册表不存在、且旧版存在 → 从旧版
// 迁移」。静默 false 会让迁移被跳过：旧文件还躺在磁盘上，新注册表却按空表写回去，
// 全局线路的首末端关联就此丢失，而且 initialized=true 之后再也不会回头看它。
//
// ENOENT 是这里的常态（大多数部署根本没有旧版文件），不刷屏。
//
// 路径注意：旧版注册表在 <dataRoot>/settings/global-lines.json，**不在** schemes/ 下
// （新版在 schemes/global-lines.json）。写错目录会让三条断言的结果全错——
// 探针首版就栽在这：迁移压根没发生，records 为空，看着像「迁移功能坏了」。
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";

let failAccessFor = "";
vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    access: async (path, ...rest) => {
      if (failAccessFor && String(path) === failAccessFor) {
        const error = new Error(`EACCES: permission denied, access '${path}'`);
        error.code = "EACCES";
        throw error;
      }
      return actual.access(path, ...rest);
    }
  };
});

const { createGlobalLineRegistry } = await import("./globalLineRegistry.mjs");

const warnings = [];
let originalWarn;

const legacyRecord = {
  id: "gl-1",
  idx: 1,
  name: "旧线路",
  energyType: "ac",
  params: {},
  references: [],
  updatedAt: "2024-01-01T00:00:00.000Z"
};

const writeLegacy = (dataRoot) => {
  mkdirSync(join(dataRoot, "settings"), { recursive: true });
  writeFileSync(
    join(dataRoot, "settings", "global-lines.json"),
    JSON.stringify({ schemaVersion: 3, lastIndex: 0, records: [legacyRecord] }),
    "utf-8"
  );
  return join(dataRoot, "settings", "global-lines.json");
};

beforeAll(() => {
  originalWarn = console.warn;
  console.warn = (...args) => {
    warnings.push(args.map(String).join(" "));
  };
});

afterAll(() => {
  console.warn = originalWarn;
});

describe("旧版注册表迁移判定", () => {
  test("★ 检查失败时告警，并点明可能跳过迁移", async () => {
    const dataRoot = mkdtempSync(join(tmpdir(), "glr-legacy-"));
    try {
      const legacyPath = writeLegacy(dataRoot);
      warnings.length = 0;
      failAccessFor = legacyPath;
      const registry = createGlobalLineRegistry({ dataRoot });
      await registry.list();
      failAccessFor = "";

      const hit = warnings.filter((line) => line.includes("[全局线路]") && line.includes("可能跳过旧版注册表迁移"));
      expect(hit.length, "迁移判定失败没有留痕").toBeGreaterThan(0);
      expect(hit[0]).toContain("EACCES");
    } finally {
      failAccessFor = "";
      rmSync(dataRoot, { recursive: true, force: true });
    }
  });

  test("★ 文件确实不在（ENOENT）时不刷屏", async () => {
    const dataRoot = mkdtempSync(join(tmpdir(), "glr-legacy-enoent-"));
    try {
      warnings.length = 0;
      const registry = createGlobalLineRegistry({ dataRoot });
      await registry.list();
      expect(warnings.filter((line) => line.includes("可能跳过旧版注册表迁移"))).toEqual([]);
    } finally {
      rmSync(dataRoot, { recursive: true, force: true });
    }
  });

  test("迁移照常能跑（新注册表不存在、旧版在 settings/ 下时）", async () => {
    const dataRoot = mkdtempSync(join(tmpdir(), "glr-legacy-ok-"));
    try {
      writeLegacy(dataRoot);
      warnings.length = 0;
      const registry = createGlobalLineRegistry({ dataRoot });
      const records = await registry.list();
      expect(records.map((record) => record.name)).toEqual(["旧线路"]);
      expect(warnings.filter((line) => line.includes("可能跳过旧版注册表迁移"))).toEqual([]);
    } finally {
      rmSync(dataRoot, { recursive: true, force: true });
    }
  });
});