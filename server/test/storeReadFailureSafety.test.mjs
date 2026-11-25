import { afterEach, describe, expect, test, vi } from "vitest";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

let unreadablePath = "";

vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    readFile: async (filePath, ...rest) => {
      if (unreadablePath && String(filePath) === unreadablePath) {
        throw Object.assign(new Error(`EACCES: permission denied, open '${filePath}'`), { code: "EACCES" });
      }
      return actual.readFile(filePath, ...rest);
    }
  };
});

const { writeTextIfChanged, readManifest } = await import("../server.mjs?store-failure-safety");
const { createSpaceStore } = await import("../spaceStore.mjs?store-failure-safety");

afterEach(() => {
  unreadablePath = "";
});

describe("存储读盘失败不会被当成缺失文件覆盖", () => {
  test("writeTextIfChanged 在 EACCES 时保留原文件并抛出错误", async () => {
    const root = mkdtempSync(join(tmpdir(), "store-read-failure-"));
    const filePath = join(root, "settings.json");
    writeFileSync(filePath, "原始配置", "utf-8");
    unreadablePath = filePath;

    await expect(writeTextIfChanged(filePath, "新配置")).rejects.toMatchObject({ code: "EACCES" });
    expect(readFileSync(filePath, "utf-8")).toBe("原始配置");
    rmSync(root, { recursive: true, force: true });
  });

  test("readManifest 在 manifest 读盘失败时不创建空清单", async () => {
    const root = mkdtempSync(join(tmpdir(), "manifest-read-failure-"));
    const images = join(root, "images");
    const manifest = join(images, "manifest.json");
    mkdirSync(images, { recursive: true });
    writeFileSync(manifest, JSON.stringify([{ id: "keep-me" }]), "utf-8");
    unreadablePath = manifest;

    await expect(readManifest({ paths: { images, manifest } })).rejects.toMatchObject({ code: "EACCES" });
    expect(readFileSync(manifest, "utf-8")).toContain("keep-me");
    rmSync(root, { recursive: true, force: true });
  });
});

describe("空间注册表读盘失败不会被重建覆盖", () => {
  test("spaces.json 的 EACCES 直接失败，不回写重建注册表", async () => {
    const root = mkdtempSync(join(tmpdir(), "spaces-read-failure-"));
    const spacesFile = join(root, "spaces.json");
    writeFileSync(spacesFile, JSON.stringify({
      schemaVersion: 1,
      spaces: [{ id: "alice", name: "Alice" }]
    }), "utf-8");
    unreadablePath = spacesFile;

    const store = createSpaceStore(root);
    await expect(store.ensureInitialized()).rejects.toMatchObject({ code: "EACCES" });
    expect(readFileSync(spacesFile, "utf-8")).toContain("alice");
    rmSync(root, { recursive: true, force: true });
  });
});
