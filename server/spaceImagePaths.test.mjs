// images / icons 域按空间隔离：manifest 与图片文件都落在空间根下。
import { expect, test, beforeAll, afterAll } from "vitest";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { installDomShim } from "./domShim.mjs";
import { spacePathsFor } from "./spaceStore.mjs";

installDomShim();

let dataDir;
// beforeAll：同 spaceConfigPaths.test.mjs —— server.mjs 每文件只加载一次，
// 其 dataRoot 首 import 时缓存，逐用例换目录会让后续用例指向已删目录。
beforeAll(() => { dataDir = mkdtempSync(join(tmpdir(), "space-image-")); });
afterAll(() => { rmSync(dataDir, { recursive: true, force: true }); });

test("readManifest 按 paths 读指定根，不污染默认根", async () => {
  process.env.GRAPH_MODEL_DATA_DIR = dataDir;
  const { readManifest, defaultPaths } = await import("./server.mjs");
  const paths = spacePathsFor(dataDir, "张三");
  mkdirSync(paths.images, { recursive: true });
  writeFileSync(paths.manifest,
    JSON.stringify([{ id: "abc", name: "图.png", folderId: "root" }]), "utf-8");
  // 默认根也塞一条：否则 readManifest() 在空 tmpdir 上恒为 []，
  // 「不污染默认根」这行断言永远不可能变红。两边内容不同，互串即红。
  mkdirSync(defaultPaths.images, { recursive: true });
  writeFileSync(defaultPaths.manifest,
    JSON.stringify([{ id: "def", name: "默认图.png", folderId: "root" }]), "utf-8");

  expect((await readManifest({ paths })).map((item) => item.id)).toEqual(["abc"]);
  expect((await readManifest()).map((item) => item.id)).toEqual(["def"]);
  delete process.env.GRAPH_MODEL_DATA_DIR;
});

test("ensureStore 在空间根下建骨架并建 icons 目录", async () => {
  process.env.GRAPH_MODEL_DATA_DIR = dataDir;
  const { ensureStore } = await import("./server.mjs");
  const paths = spacePathsFor(dataDir, "张三");
  await ensureStore({ paths });
  expect(existsSync(paths.manifest)).toBe(true);
  expect(existsSync(paths.imageFolders)).toBe(true);
  expect(existsSync(paths.icons)).toBe(true);
  delete process.env.GRAPH_MODEL_DATA_DIR;
});
