import { describe, expect, test, vi } from "vitest";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

let blockedPath = "";

vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    stat: async (filePath, ...rest) => {
      if (blockedPath && String(filePath) === blockedPath) {
        throw Object.assign(new Error(`EACCES: permission denied, stat '${filePath}'`), { code: "EACCES" });
      }
      return actual.stat(filePath, ...rest);
    }
  };
});

const { serveStaticAsset, serveIconLibraryAsset } = await import("../server.mjs?static-read-failure");

describe("静态资源读盘失败", () => {
  test("静态资源 stat 的非 ENOENT 错误不回退到 index.html", async () => {
    const root = mkdtempSync(join(tmpdir(), "static-read-failure-"));
    const asset = join(root, "assets", "app.js");
    mkdirSync(join(root, "assets"), { recursive: true });
    writeFileSync(join(root, "index.html"), "<html>app</html>", "utf-8");
    writeFileSync(asset, "console.log('app')", "utf-8");
    blockedPath = asset;

    await expect(serveStaticAsset(
      { method: "GET" },
      {},
      new URL("http://127.0.0.1/assets/app.js"),
      root
    )).rejects.toMatchObject({ code: "EACCES" });
    rmSync(root, { recursive: true, force: true });
  });

  test("icon-library stat 的非 ENOENT 错误不静默返回未命中", async () => {
    const catalog = fileURLToPath(new URL("../../public/icon-library/catalog.json", import.meta.url));
    blockedPath = catalog;

    await expect(serveIconLibraryAsset(
      { method: "GET" },
      {},
      new URL("http://127.0.0.1/icon-library/catalog.json")
    )).rejects.toMatchObject({ code: "EACCES" });
  });
});
