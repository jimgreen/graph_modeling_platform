import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, test } from "vitest";
import {
  archiveStaleSchemeFiles,
  deleteSchemeProjectRecord,
  deleteSchemeRecordDirectory,
  saveSchemeProjectRecord,
  saveSchemeRecordDirectory
} from "./image-server.mjs";

describe("scheme file persistence", () => {
  test("moves stale scheme files into trash instead of permanently deleting them", async () => {
    const root = await mkdtemp(join(tmpdir(), "scheme-persistence-"));
    try {
      const filesRoot = join(root, "files");
      const trashRoot = join(root, "trash");
      const schemeDir = join(filesRoot, "默认方案");
      const staleFile = join(schemeDir, "qinling.json");
      const keptFile = join(schemeDir, "山西.json");
      await mkdir(schemeDir, { recursive: true });
      await writeFile(staleFile, "{\"name\":\"qinling\"}", "utf-8");
      await writeFile(keptFile, "{\"name\":\"山西\"}", "utf-8");

      await archiveStaleSchemeFiles(
        filesRoot,
        new Set([keptFile]),
        new Set([filesRoot, schemeDir]),
        { trashRoot, archiveId: "test-archive" }
      );

      await expect(readFile(keptFile, "utf-8")).resolves.toContain("山西");
      await expect(readFile(staleFile, "utf-8")).rejects.toThrow();
      await expect(readFile(join(trashRoot, "test-archive", "默认方案", "qinling.json"), "utf-8")).resolves.toContain("qinling");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test("saves one project file without rewriting or removing sibling models", async () => {
    const root = await mkdtemp(join(tmpdir(), "scheme-single-project-"));
    try {
      const filesRoot = join(root, "files");
      const trashRoot = join(root, "trash");
      const schemeDir = join(filesRoot, "默认方案");
      const siblingFile = join(schemeDir, "qinling.json");
      const projectFile = join(schemeDir, "山西.json");
      await mkdir(schemeDir, { recursive: true });
      await writeFile(siblingFile, "{\"name\":\"qinling\"}", "utf-8");
      await writeFile(projectFile, "{\"name\":\"old\"}", "utf-8");

      await saveSchemeProjectRecord({
        filesRoot,
        trashRoot,
        schemePath: ["默认方案"],
        record: {
          name: "山西",
          updatedAt: "2026-06-08T12:00:00.000Z",
          project: {
            version: 1,
            name: "山西",
            nodes: [],
            edges: []
          }
        },
        measurementConfig: {}
      });

      await expect(readFile(siblingFile, "utf-8")).resolves.toContain("qinling");
      await expect(readFile(projectFile, "utf-8")).resolves.toContain("山西");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test("deletes one project by archiving only that model's files", async () => {
    const root = await mkdtemp(join(tmpdir(), "scheme-delete-project-"));
    try {
      const filesRoot = join(root, "files");
      const trashRoot = join(root, "trash");
      const schemeDir = join(filesRoot, "默认方案");
      const siblingFile = join(schemeDir, "qinling.json");
      const projectFile = join(schemeDir, "山西.json");
      await mkdir(schemeDir, { recursive: true });
      await writeFile(siblingFile, "{\"name\":\"qinling\"}", "utf-8");
      await writeFile(projectFile, "{\"name\":\"山西\"}", "utf-8");

      await deleteSchemeProjectRecord({
        filesRoot,
        trashRoot,
        schemePath: ["默认方案"],
        name: "山西",
        archiveId: "delete-project"
      });

      await expect(readFile(siblingFile, "utf-8")).resolves.toContain("qinling");
      await expect(readFile(projectFile, "utf-8")).rejects.toThrow();
      await expect(readFile(join(trashRoot, "delete-project", "默认方案", "山西.json"), "utf-8")).resolves.toContain("山西");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test("renames one scheme directory without rewriting sibling schemes", async () => {
    const root = await mkdtemp(join(tmpdir(), "scheme-rename-"));
    try {
      const filesRoot = join(root, "files");
      const oldSchemeDir = join(filesRoot, "旧方案");
      const siblingDir = join(filesRoot, "默认方案");
      await mkdir(oldSchemeDir, { recursive: true });
      await mkdir(siblingDir, { recursive: true });
      await writeFile(join(oldSchemeDir, "qinling.json"), "{\"name\":\"qinling\"}", "utf-8");
      await writeFile(join(siblingDir, "山西.json"), "{\"name\":\"山西\"}", "utf-8");

      await saveSchemeRecordDirectory({
        filesRoot,
        schemePath: ["新方案"],
        previousSchemePath: ["旧方案"]
      });

      await expect(readFile(join(filesRoot, "新方案", "qinling.json"), "utf-8")).resolves.toContain("qinling");
      await expect(readFile(join(siblingDir, "山西.json"), "utf-8")).resolves.toContain("山西");
      await expect(readFile(join(oldSchemeDir, "qinling.json"), "utf-8")).rejects.toThrow();
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test("deletes one scheme directory by archiving only that scheme", async () => {
    const root = await mkdtemp(join(tmpdir(), "scheme-delete-"));
    try {
      const filesRoot = join(root, "files");
      const trashRoot = join(root, "trash");
      await mkdir(join(filesRoot, "默认方案"), { recursive: true });
      await mkdir(join(filesRoot, "待删方案"), { recursive: true });
      await writeFile(join(filesRoot, "默认方案", "山西.json"), "{\"name\":\"山西\"}", "utf-8");
      await writeFile(join(filesRoot, "待删方案", "qinling.json"), "{\"name\":\"qinling\"}", "utf-8");

      await deleteSchemeRecordDirectory({
        filesRoot,
        trashRoot,
        schemePath: ["待删方案"],
        archiveId: "delete-scheme"
      });

      await expect(readFile(join(filesRoot, "默认方案", "山西.json"), "utf-8")).resolves.toContain("山西");
      await expect(readFile(join(filesRoot, "待删方案", "qinling.json"), "utf-8")).rejects.toThrow();
      await expect(readFile(join(trashRoot, "delete-scheme", "待删方案", "qinling.json"), "utf-8")).resolves.toContain("qinling");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
