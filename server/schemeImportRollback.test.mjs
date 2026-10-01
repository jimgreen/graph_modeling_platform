// 方案压缩包导入失败不留半成品（importSchemeArchiveBuffer）。
//
// 空间侧早有这条不变量（handleImportSpaceArchive：失败即 remove 刚建的空间，注释里写了
// 完整理由），方案侧却没有：extractSchemeZipToDirectory 直接往 targetDir 里写，中途失败
// （磁盘满 / 权限丢失 / 某个条目触发守卫）就原样冒泡，于是方案树里留下一个看着正常、
// 实则缺文件的方案目录 —— 用户无从分辨「导入失败」与「导入成功但模型丢了」。
//
// 覆盖模式更糟：旧方案已被 archiveSchemeStoreEntry rename 进回收站，新方案又是半份，
// 两头落空。
//
// 注入方式：让**第二个**条目写盘失败，确保第一个已经落盘（半成品是真的，不是没开始写）。
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";
import AdmZip from "adm-zip";

// 让文件名含「坏条目」的写入失败（原子写的 .tmp 路径同样含该片段，一并拦掉）
let failFileNamed = "";
vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    writeFile: async (path, ...rest) => {
      if (failFileNamed && String(path).includes(failFileNamed)) {
        const error = new Error(`ENOSPC: no space left on device, open '${path}'`);
        error.code = "ENOSPC";
        throw error;
      }
      return actual.writeFile(path, ...rest);
    }
  };
});

let server;
let baseUrl;
let dataDir;
let filesRoot;

const modelJson = JSON.stringify({ version: 1, name: "模型一", modelType: "厂站", nodes: [], edges: [] });

/** 造一个含两个模型条目的方案压缩包（第二个条目的名字用于注入写失败） */
const buildSchemeZip = (schemeName, secondEntryName) => {
  const zip = new AdmZip();
  zip.addFile(`${schemeName}/模型一.json`, Buffer.from(modelJson, "utf-8"));
  zip.addFile(`${schemeName}/${secondEntryName}`, Buffer.from(modelJson, "utf-8"));
  return zip.toBuffer();
};

const importZip = (buffer, query = "") =>
  fetch(`${baseUrl}/webgrp/schemes/import${query}`, {
    method: "POST",
    headers: { "content-type": "application/zip" },
    body: buffer
  });

beforeAll(async () => {
  dataDir = mkdtempSync(join(tmpdir(), "scheme-import-rollback-"));
  process.env.GRAPH_MODEL_DATA_DIR = dataDir;
  const { createImageServer, defaultPaths } = await import("./server.mjs");
  filesRoot = defaultPaths.schemeFiles;
  server = await createImageServer({ port: 0, host: "127.0.0.1" });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

afterAll(async () => {
  failFileNamed = "";
  if (server) await new Promise((resolve) => server.close(resolve));
  rmSync(dataDir, { recursive: true, force: true });
});

describe("方案导入失败不留半成品", () => {
  test("★ 解包中途失败：目标方案目录被清掉，不留在方案树里", async () => {
    failFileNamed = "坏条目.json";
    const response = await importZip(buildSchemeZip("半成品方案", "坏条目.json"));
    failFileNamed = "";

    expect(response.status).not.toBe(200);
    // 关键断言：半成品目录整个不存在（而不是「存在但缺文件」）
    expect(existsSync(join(filesRoot, "半成品方案")), "导入失败却把半成品方案留在磁盘上").toBe(false);

    // 方案树里也看不到它
    const tree = await (await fetch(`${baseUrl}/webgrp/schemes`)).json();
    expect(JSON.stringify(tree)).not.toContain("半成品方案");
  });

  test("★ 导入成功时目录与模型都在（别把回滚写过头）", async () => {
    const response = await importZip(buildSchemeZip("完整方案", "第二个模型.json"));
    expect(response.status).toBe(200);

    expect(existsSync(join(filesRoot, "完整方案", "模型一.json"))).toBe(true);
    expect(existsSync(join(filesRoot, "完整方案", "第二个模型.json"))).toBe(true);
  });
});