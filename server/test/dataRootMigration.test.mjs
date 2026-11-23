import { describe, expect, test } from "vitest";
import { mkdtemp, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import AdmZip from "adm-zip";

import { createDataRootMigration } from "../dataRootMigration.mjs";

async function makeRoots(prefix = "data-root-migration-") {
  const root = await mkdtemp(join(tmpdir(), prefix));
  const source = join(root, "source");
  const target = join(root, "target");
  await mkdir(source);
  await mkdir(target);
  return { root, source, target };
}

async function seedSource(source) {
  await mkdir(join(source, "empty-dir"));
  await mkdir(join(source, "中文"));
  await writeFile(join(source, "spaces.json"), '{"spaces":[]}\n', "utf8");
  await writeFile(join(source, "中文", "零字节.bin"), Buffer.alloc(0));
}

async function writeExample(root) {
  const examplePath = join(root, "platform.config.json.example");
  await writeFile(examplePath, JSON.stringify({ dataDir: "../data", host: "127.0.0.1" }, null, 2), "utf8");
  return examplePath;
}

function migrationFor({ source, target, root, hooks, configPath }) {
  return createDataRootMigration({
    currentRoot: source,
    targetRoot: target,
    configPath: configPath ?? join(root, "platform.config.json"),
    exampleConfigPath: join(root, "platform.config.json.example"),
    archiveParent: root,
    hooks
  });
}

describe("data root migration", () => {
  test("rejects a target directory containing hidden entries", async () => {
    const { root, source, target } = await makeRoots();
    try {
      await writeFile(join(target, ".keep"), "x", "utf8");
      const migration = migrationFor({ source, target, root });
      await expect(migration.validateTargetDirectory()).rejects.toMatchObject({ code: "DATA_DIR_NOT_EMPTY" });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test("rejects the current root and overlapping parent/child paths", async () => {
    const { root, source, target } = await makeRoots();
    try {
      const same = migrationFor({ source, target: source, root });
      await expect(same.validateTargetDirectory()).rejects.toMatchObject({ code: "DATA_DIR_PATH_INVALID" });

      const child = join(source, "child");
      await mkdir(child);
      const nested = migrationFor({ source, target: child, root });
      await expect(nested.validateTargetDirectory()).rejects.toMatchObject({ code: "DATA_DIR_PATH_INVALID" });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test("copies, verifies, archives, deletes, and persists a missing config from the example", async () => {
    const { root, source, target } = await makeRoots();
    try {
      await seedSource(source);
      const examplePath = await writeExample(root);
      const migration = createDataRootMigration({
        currentRoot: source,
        targetRoot: target,
        configPath: join(root, "platform.config.json"),
        exampleConfigPath: examplePath,
        archiveParent: root
      });

      const result = await migration.run();
      expect(result.dataRoot).toBe(resolve(target));
      expect(result.archivePath).toMatch(/source\.archive-\d{8}-\d{6}-[a-z0-9-]+\.zip$/iu);
      await expect(stat(source)).rejects.toMatchObject({ code: "ENOENT" });
      expect(await readFile(join(target, "spaces.json"), "utf8")).toBe('{"spaces":[]}\n');
      expect((await stat(join(target, "empty-dir"))).isDirectory()).toBe(true);
      expect((await stat(join(target, "中文", "零字节.bin"))).size).toBe(0);

      const archive = new AdmZip(result.archivePath);
      expect(archive.getEntries().map((entry) => entry.entryName).sort()).toEqual([
        "empty-dir/",
        "spaces.json",
        "中文/",
        "中文/零字节.bin"
      ]);
      const config = JSON.parse(await readFile(join(root, "platform.config.json"), "utf8"));
      expect(config.dataDir).toBe(resolve(target));
      expect(config.host).toBe("127.0.0.1");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test("rolls back the deleted source, target contents, config, and archive on commit failure", async () => {
    const { root, source, target } = await makeRoots("data-root-rollback-");
    try {
      await seedSource(source);
      const configPath = join(root, "platform.config.json");
      await writeFile(configPath, JSON.stringify({ dataDir: source, host: "old" }, null, 2), "utf8");
      await writeExample(root);
      const migration = migrationFor({
        source,
        target,
        root,
        configPath,
        hooks: { beforeConfigWrite: () => { throw new Error("config commit failed"); } }
      });

      await expect(migration.run()).rejects.toThrow("config commit failed");
      expect(await readFile(join(source, "spaces.json"), "utf8")).toBe('{"spaces":[]}\n');
      expect(await readdir(target)).toEqual([]);
      expect(await readFile(configPath, "utf8")).toBe(JSON.stringify({ dataDir: source, host: "old" }, null, 2));
      const leftovers = (await readdir(root)).filter((name) => name.includes("archive-"));
      expect(leftovers).toEqual([]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
