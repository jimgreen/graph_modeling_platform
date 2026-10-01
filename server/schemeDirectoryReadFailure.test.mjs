// 方案目录读不到时报错，不再让整棵子树从列表里悄悄消失。
//
// 此前 readSchemeDirectory 的 readdir catch 一律 return null，调用方再跳过一次，
// 于是「方案 A 的目录被占用 / 权限被改」这种纯 IO 问题，表现是方案树里方案 A 连同
// 其子方案与全部模型凭空消失，200 ok、零日志 —— 用户只能得出「方案被删了」这个
// 错误结论，下一步多半是重建一遍。
//
// 方案 ZIP 导出路径（schemeArchive.listModelJsonFiles）对同一件事是**上抛**，模块头
// 注释里写着「目录读失败即上抛，不静默跳过：否则该子树会凭空消失，而 ZIP 仍成功
// 返回，产出残缺压缩包」。本次让列表 API 与之对齐。
//
// 注入不可读：Windows 上 chmod / ACL 不可移植，故只对特定目录名让 readdir 抛
// 错误码，其余路径一律透传真实实现（与 schemeArchiveRealtime.test.mjs 同法）。
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test, beforeAll, afterAll, vi } from "vitest";
import { apiPath } from "./config.mjs";

const UNREADABLE_DIR = "被占用方案";
const VANISHED_DIR = "刚好被删方案";
vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    readdir: async (dir, options) => {
      if (String(dir).endsWith(UNREADABLE_DIR)) {
        const error = new Error(`EBUSY: resource busy or locked, scandir '${dir}'`);
        error.code = "EBUSY";
        throw error;
      }
      if (String(dir).endsWith(VANISHED_DIR)) {
        // 目录条目被枚举到、真正去读时已不在（删除与列举之间的竞态）
        const error = new Error(`ENOENT: no such file or directory, scandir '${dir}'`);
        error.code = "ENOENT";
        throw error;
      }
      return actual.readdir(dir, options);
    }
  };
});

let server;
let baseUrl;
let dataDir;
let createImageServer;

beforeAll(async () => {
  dataDir = mkdtempSync(join(tmpdir(), "scheme-dir-read-"));
  const files = join(dataDir, "schemes", "files");
  mkdirSync(join(files, "正常方案"), { recursive: true });
  writeFileSync(join(files, "正常方案", "模型.json"), JSON.stringify({ name: "模型", idx: 1, nodes: [], edges: [] }), "utf-8");
  mkdirSync(join(files, UNREADABLE_DIR), { recursive: true });
  writeFileSync(join(files, UNREADABLE_DIR, "模型.json"), JSON.stringify({ name: "模型", idx: 1, nodes: [], edges: [] }), "utf-8");
  mkdirSync(join(files, VANISHED_DIR), { recursive: true });
  process.env.GRAPH_MODEL_DATA_DIR = dataDir;
  ({ createImageServer } = await import("./server.mjs"));
  server = await createImageServer({ port: 0, host: "127.0.0.1" });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

afterAll(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  rmSync(dataDir, { recursive: true, force: true });
});

describe("方案列表：目录读不到时报错", () => {
  test("★ 整体 500 而不是悄悄少一个方案", async () => {
    const response = await fetch(`${baseUrl}${apiPath("/schemes")}`);
    expect(response.status).toBe(500);
    expect(await response.text()).toContain("方案目录读取失败");
  });

  test("★ 错误信息点名是哪个目录与哪个错误码（EBUSY 这类）", async () => {
    const response = await fetch(`${baseUrl}${apiPath("/schemes")}`);
    const text = await response.text();
    expect(text).toContain(UNREADABLE_DIR);
    expect(text).toContain("EBUSY");
  });

  test("★ 被占用的目录若不存在（ENOENT）则不算错 —— 那才是「方案真的没了」", async () => {
    // 反证：把被占用目录挪走后，同一个请求恢复 200 且正常方案仍在
    rmSync(join(dataDir, "schemes", "files", UNREADABLE_DIR), { recursive: true, force: true });
    const after = await fetch(`${baseUrl}${apiPath("/schemes")}`);
    expect(after.status).toBe(200);
    const payload = await after.json();
    expect(payload.schemes.map((s) => s.name)).toContain("正常方案");
  });

  test("★ ENOENT（枚举到、读时已被删）走正常返回，不算读失败", async () => {
    // 上面那条已把 UNREADABLE_DIR 移除，本请求只剩「刚好被删方案」触发 ENOENT
    const response = await fetch(`${baseUrl}${apiPath("/schemes")}`);
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.schemes.map((s) => s.name)).toEqual(["正常方案"]);
  });
});