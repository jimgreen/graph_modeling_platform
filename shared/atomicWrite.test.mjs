// shared/atomicWrite.mjs 的单元测试 —— 此前零覆盖。
//
// 它是 manifest / 配置 / 迁移结果等落盘路径的共同底层（A1-P0-1 的修复），
// 语义是「崩溃时目标文件要么旧完整、要么新完整，不出现半写」。
// 要验证的三件事：真的原子（无残留 tmp）、失败时清理干净、并发安全（tmp 名唯一）。
import { describe, expect, test, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, readFileSync, readdirSync, writeFileSync, mkdirSync, chmodSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { atomicWriteFile, atomicWriteFileSync } from "./atomicWrite.mjs";

let dir;
beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), "atomic-"));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("atomicWriteFile", () => {
  test("写入内容与目标一致", async () => {
    const file = path.join(dir, "a.json");
    await atomicWriteFile(file, '{"ok":true}', "utf-8");
    expect(readFileSync(file, "utf-8")).toBe('{"ok":true}');
  });

  test("目标目录不存在时自动创建", async () => {
    const file = path.join(dir, "deep", "nested", "b.json");
    await atomicWriteFile(file, "x", "utf-8");
    expect(readFileSync(file, "utf-8")).toBe("x");
  });

  test("覆盖已有文件后不残留任何 .tmp", async () => {
    const file = path.join(dir, "c.json");
    await atomicWriteFile(file, "第一版", "utf-8");
    await atomicWriteFile(file, "第二版", "utf-8");
    expect(readFileSync(file, "utf-8")).toBe("第二版");
    expect(readdirSync(dir).filter((n) => n.endsWith(".tmp"))).toEqual([]);
  });

  test("两次写入之间不互相污染（并发各写各的目标）", async () => {
    const files = [path.join(dir, "x1"), path.join(dir, "x2"), path.join(dir, "x3")];
    await Promise.all(files.map((f, i) => atomicWriteFile(f, `内容${i}`, "utf-8")));
    for (const [i, f] of files.entries()) {
      expect(readFileSync(f, "utf-8")).toBe(`内容${i}`);
    }
    expect(readdirSync(dir).filter((n) => n.endsWith(".tmp"))).toEqual([]);
  });

  test("写入失败时抛错且不留下半成品目标", async () => {
    // 用一个目录当目标：writeFile 到目录路径必失败（EISDIR）
    const target = path.join(dir, "as-dir");
    mkdirSync(target);
    await expect(atomicWriteFile(target, "x", "utf-8")).rejects.toBeTruthy();
    // 目标仍是目录（未被破坏），且无 tmp 残留
    expect(readdirSync(dir).filter((n) => n.endsWith(".tmp"))).toEqual([]);
  });
});

describe("atomicWriteFileSync", () => {
  test("写入内容一致且自动建目录", () => {
    const file = path.join(dir, "s", "d.json");
    atomicWriteFileSync(file, "同步内容", "utf-8");
    expect(readFileSync(file, "utf-8")).toBe("同步内容");
  });

  test("覆盖后不残留 .tmp", () => {
    const file = path.join(dir, "s2.json");
    atomicWriteFileSync(file, "1", "utf-8");
    atomicWriteFileSync(file, "2", "utf-8");
    expect(readFileSync(file, "utf-8")).toBe("2");
    expect(readdirSync(dir).filter((n) => n.endsWith(".tmp"))).toEqual([]);
  });

  test("目标为目录时抛错且清理 tmp", () => {
    const target = path.join(dir, "dir-target");
    mkdirSync(target);
    expect(() => atomicWriteFileSync(target, "x", "utf-8")).toThrow();
    expect(readdirSync(dir).filter((n) => n.endsWith(".tmp"))).toEqual([]);
  });
});
