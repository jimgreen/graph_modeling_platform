import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, test } from "vitest";
import AdmZip from "adm-zip";
import {
  archiveStaleSchemeFiles,
  createSchemeArchiveBuffer,
  deleteSchemeProjectRecord,
  deleteSchemeRecordDirectory,
  importSchemeArchiveBuffer,
  readSchemeProjectRecord,
  readSchemesFromFiles,
  saveSchemeProjectRecord,
  saveSchemeRecordDirectory
} from "./image-server.mjs";

describe("scheme file persistence", () => {
  test("reads scheme directories as lightweight project summaries by default", async () => {
    const root = await mkdtemp(join(tmpdir(), "scheme-summary-read-"));
    try {
      const filesRoot = join(root, "files");
      await mkdir(join(filesRoot, "IEEE标准算例"), { recursive: true });
      await writeFile(join(filesRoot, "IEEE标准算例", "IEEE118.json"), "{ this is intentionally not parsed", "utf-8");

      const schemes = await readSchemesFromFiles({ filesRoot });

      expect(schemes).toHaveLength(1);
      expect(schemes[0].name).toBe("IEEE标准算例");
      expect(schemes[0].projects).toHaveLength(1);
      expect(schemes[0].projects[0].name).toBe("IEEE118");
      expect(schemes[0].projects[0].project).toMatchObject({
        name: "IEEE118",
        nodes: [],
        edges: [],
        __summaryOnly: true
      });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test("reads one full project file on demand", async () => {
    const root = await mkdtemp(join(tmpdir(), "scheme-project-read-"));
    try {
      const filesRoot = join(root, "files");
      await mkdir(join(filesRoot, "IEEE标准算例"), { recursive: true });
      await writeFile(
        join(filesRoot, "IEEE标准算例", "IEEE118.json"),
        JSON.stringify({
          version: 1,
          name: "IEEE118",
          nodes: [
            {
              id: "bus-1",
              kind: "ac-bus",
              name: "母线1",
              position: { x: 0, y: 0 },
              size: { width: 120, height: 16 },
              params: {},
              terminals: []
            }
          ],
          edges: []
        }),
        "utf-8"
      );

      const record = await readSchemeProjectRecord({
        filesRoot,
        schemePath: ["IEEE标准算例"],
        name: "IEEE118"
      });

      expect(record?.name).toBe("IEEE118");
      expect(record?.project.nodes).toHaveLength(1);
      expect(record?.project.nodes[0].id).toBe("bus-1");
      expect(record?.project.__summaryOnly).toBeUndefined();
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

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

  test("writes saved project svg image hrefs as root-relative image file paths", async () => {
    const root = await mkdtemp(join(tmpdir(), "scheme-svg-image-paths-"));
    try {
      const filesRoot = join(root, "files");
      const trashRoot = join(root, "trash");
      await saveSchemeProjectRecord({
        filesRoot,
        trashRoot,
        schemePath: ["默认方案"],
        record: {
          name: "图片模型",
          updatedAt: "2026-06-12T00:00:00.000Z",
          project: {
            version: 1,
            name: "图片模型",
            canvasBackgroundImage: "/api/images/canvas-bg",
            nodes: [
              {
                id: "image-node",
                kind: "static-image",
                name: "图片",
                position: { x: 100, y: 80 },
                size: { width: 80, height: 60 },
                params: {
                  backgroundImageAssetId: "node-bg",
                  backgroundImage: "/api/images/node-bg"
                },
                terminals: []
              }
            ],
            edges: []
          }
        },
        measurementConfig: {},
        imagePathById: {
          "canvas-bg": "data/images/canvas-bg.png",
          "node-bg": "data/images/node-bg.jpg"
        }
      });

      const svg = await readFile(join(filesRoot, "默认方案", "图片模型.svg"), "utf-8");
      expect(svg).toContain('href="data/images/canvas-bg.png"');
      expect(svg).toContain('href="data/images/node-bg.jpg"');
      expect(svg).not.toContain('href="/api/images/');
      expect(svg).not.toContain('href="http://');
      expect(svg).not.toContain('href="https://');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test("writes saved project svg image href fallbacks without backend api paths", async () => {
    const root = await mkdtemp(join(tmpdir(), "scheme-svg-image-path-fallback-"));
    try {
      const filesRoot = join(root, "files");
      const trashRoot = join(root, "trash");
      await saveSchemeProjectRecord({
        filesRoot,
        trashRoot,
        schemePath: ["默认方案"],
        record: {
          name: "缺失图片清单",
          updatedAt: "2026-06-12T00:00:00.000Z",
          project: {
            version: 1,
            name: "缺失图片清单",
            canvasBackgroundImage: "/api/images/missing-bg?id=1",
            nodes: [],
            edges: []
          }
        },
        measurementConfig: {},
        imagePathById: {}
      });

      const svg = await readFile(join(filesRoot, "默认方案", "缺失图片清单.svg"), "utf-8");
      expect(svg).toContain('href="data/images/missing-bg"');
      expect(svg).not.toContain('href="/api/images/');
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

  test("exports one scheme directory as a zip while preserving child scheme folders", async () => {
    const root = await mkdtemp(join(tmpdir(), "scheme-export-zip-"));
    try {
      const filesRoot = join(root, "files");
      await mkdir(join(filesRoot, "默认方案", "1-1"), { recursive: true });
      await writeFile(join(filesRoot, "默认方案", "电压等级.json"), "{\"name\":\"电压等级\"}", "utf-8");
      await writeFile(join(filesRoot, "默认方案", "1-1", "1-1-1.json"), "{\"name\":\"1-1-1\"}", "utf-8");

      const { buffer, filename } = await createSchemeArchiveBuffer({
        filesRoot,
        schemePath: ["默认方案"]
      });
      const zip = new AdmZip(buffer);
      const entryNames = zip.getEntries().map((entry) => entry.entryName.replace(/\\/gu, "/"));

      expect(filename).toBe("默认方案.zip");
      expect(entryNames).toContain("默认方案/电压等级.json");
      expect(entryNames).toContain("默认方案/1-1/1-1-1.json");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test("imports a scheme zip as a directory tree and requires overwrite on duplicate folders", async () => {
    const root = await mkdtemp(join(tmpdir(), "scheme-import-zip-"));
    try {
      const filesRoot = join(root, "files");
      const trashRoot = join(root, "trash");
      const zip = new AdmZip();
      zip.addFile("默认方案/线路.json", Buffer.from("{\"name\":\"线路\"}", "utf-8"));
      zip.addFile("默认方案/1-1/1-1-1.json", Buffer.from("{\"name\":\"1-1-1\"}", "utf-8"));

      const imported = await importSchemeArchiveBuffer({
        filesRoot,
        trashRoot,
        buffer: zip.toBuffer(),
        fileName: "默认方案.zip"
      });

      expect(imported.conflict).toBe(false);
      await expect(readFile(join(filesRoot, "默认方案", "线路.json"), "utf-8")).resolves.toContain("线路");
      await expect(readFile(join(filesRoot, "默认方案", "1-1", "1-1-1.json"), "utf-8")).resolves.toContain("1-1-1");

      const conflict = await importSchemeArchiveBuffer({
        filesRoot,
        trashRoot,
        buffer: zip.toBuffer(),
        fileName: "默认方案.zip"
      });
      expect(conflict).toMatchObject({ conflict: true, duplicateSchemeName: "默认方案" });

      const overwriteZip = new AdmZip();
      overwriteZip.addFile("默认方案/速度.json", Buffer.from("{\"name\":\"速度\"}", "utf-8"));
      await importSchemeArchiveBuffer({
        filesRoot,
        trashRoot,
        buffer: overwriteZip.toBuffer(),
        fileName: "默认方案.zip",
        mode: "overwrite"
      });

      await expect(readFile(join(filesRoot, "默认方案", "速度.json"), "utf-8")).resolves.toContain("速度");
      await expect(readFile(join(filesRoot, "默认方案", "线路.json"), "utf-8")).rejects.toThrow();
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
