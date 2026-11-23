import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import AdmZip from "adm-zip";
import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";
import { apiPath } from "../config.mjs";
import { spacePathsFor } from "../spaceStore.mjs";

let dataDir;
let paths;
let readSchemes;
let saveSchemeRecordDirectory;
let deleteSchemeRecordDirectory;
let createImageServer;
let importSchemeArchiveBuffer;

beforeAll(async () => {
  dataDir = await mkdtemp(join(tmpdir(), "scheme-numbering-"));
  process.env.GRAPH_MODEL_DATA_DIR = dataDir;
  ({
    defaultPaths: paths,
    readSchemes,
    saveSchemeRecordDirectory,
    deleteSchemeRecordDirectory,
    createImageServer,
    importSchemeArchiveBuffer
  } = await import("../server.mjs"));
});

afterAll(async () => {
  await rm(dataDir, { recursive: true, force: true });
  delete process.env.GRAPH_MODEL_DATA_DIR;
});

beforeEach(async () => {
  await rm(dataDir, { recursive: true, force: true });
  await mkdir(paths.schemeFiles, { recursive: true });
});

async function writeSchemeMeta(schemeDir, meta) {
  await mkdir(schemeDir, { recursive: true });
  await writeFile(join(schemeDir, "scheme.json"), JSON.stringify(meta));
}

async function writeModel(filePath, name) {
  await writeFile(filePath, JSON.stringify({
    version: 1,
    name,
    idx: 1,
    nodes: [],
    edges: []
  }));
}

describe("schemeId persistence", () => {
  test("backfills every legacy scheme while preserving metadata and excluding scheme.json from models", async () => {
    const rootDir = join(paths.schemeFiles, "Root");
    const childDir = join(rootDir, "Child");
    await mkdir(childDir, { recursive: true });
    await writeModel(join(rootDir, "Root model.json"), "Root model");
    const legacyMeta = { name: "Legacy root name", updatedAt: "2024-01-02T03:04:05.000Z" };
    await writeFile(join(rootDir, "scheme.json"), JSON.stringify(legacyMeta));

    const schemes = await readSchemes({ paths });
    const root = schemes[0];
    const child = root.children[0];

    expect(Number.isSafeInteger(root.schemeId) && root.schemeId > 0).toBe(true);
    expect(Number.isSafeInteger(child.schemeId) && child.schemeId > 0).toBe(true);
    expect(child.schemeId).not.toBe(root.schemeId);
    expect(root.name).toBe("Legacy root name");
    expect(root.projects.map((project) => project.name)).toEqual(["Root model"]);

    const storedMeta = JSON.parse(await readFile(join(rootDir, "scheme.json"), "utf-8"));
    expect(storedMeta).toEqual({ ...legacyMeta, schemeId: root.schemeId });
    const counter = JSON.parse(await readFile(join(paths.schemes, "scheme-index.json"), "utf-8"));
    expect(counter.lastSchemeId).toBeGreaterThanOrEqual(child.schemeId);
  });

  test("preserves unique stored numbers and repairs invalid or duplicate values", async () => {
    const fixtures = [
      ["A", { name: "A", schemeId: 20 }],
      ["B", { name: "B", schemeId: 10 }],
      ["C", { name: "C", schemeId: 20 }],
      ["D", { name: "D", schemeId: -1 }]
    ];
    for (const [name, meta] of fixtures) {
      await writeSchemeMeta(join(paths.schemeFiles, name), meta);
    }

    const schemes = await readSchemes({ paths });
    const numberByName = Object.fromEntries(schemes.map((scheme) => [scheme.name, scheme.schemeId]));

    expect(numberByName.A).toBe(20);
    expect(numberByName.B).toBe(10);
    expect(numberByName.C).toBeGreaterThan(20);
    expect(numberByName.D).toBeGreaterThan(numberByName.C);
    expect(new Set(Object.values(numberByName)).size).toBe(fixtures.length);
  });

  test("allocates increasing numbers, preserves them through moves, and never reuses deleted numbers", async () => {
    const first = await saveSchemeRecordDirectory({ paths, schemePath: ["First"] });
    const second = await saveSchemeRecordDirectory({ paths, schemePath: ["Second"] });
    expect(first).toBeGreaterThan(0);
    expect(second).toBeGreaterThan(first);

    const moved = await saveSchemeRecordDirectory({
      paths,
      schemePath: ["Moved"],
      previousSchemePath: ["First"]
    });
    expect(moved).toBe(first);

    await deleteSchemeRecordDirectory({ paths, schemePath: ["Second"] });
    const third = await saveSchemeRecordDirectory({ paths, schemePath: ["Third"] });
    expect(third).toBeGreaterThan(second);
  });

  test("serializes concurrent scheme creation into distinct numbers", async () => {
    const numbers = await Promise.all(
      Array.from({ length: 8 }, (_, index) => saveSchemeRecordDirectory({
        paths,
        schemePath: [`Parallel ${index}`]
      }))
    );

    expect(numbers.every((number) => Number.isSafeInteger(number) && number > 0)).toBe(true);
    expect(new Set(numbers).size).toBe(numbers.length);
  });

  test("allocates numbers independently within each space", async () => {
    const firstSpace = spacePathsFor(dataDir, "default");
    const secondSpace = spacePathsFor(dataDir, "test-space");

    const first = await saveSchemeRecordDirectory({ paths: firstSpace, schemePath: ["Same name"] });
    const second = await saveSchemeRecordDirectory({ paths: secondSpace, schemePath: ["Same name"] });

    expect(first).toBe(1);
    expect(second).toBe(1);
  });

  test("full-tree saves return backend-assigned numbers for roots and children", async () => {
    const server = await createImageServer({ port: 0, host: "127.0.0.1" });
    try {
      const baseUrl = `http://127.0.0.1:${server.address().port}`;
      const initialized = await fetch(`${baseUrl}${apiPath("/spaces/initialize")}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "测试空间" })
      });
      expect(initialized.status).toBe(200);

      const response = await fetch(`${baseUrl}${apiPath("/schemes")}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          schemes: [{
            name: "Bulk root",
            projects: [],
            children: [{ name: "Bulk child", projects: [], children: [] }]
          }]
        })
      });
      const payload = await response.json();

      expect(response.status).toBe(200);
      expect(payload.schemes[0].schemeId).toBe(1);
      expect(payload.schemes[0].children[0].schemeId).toBe(2);
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  test("full-tree rename preserves the existing schemeId", async () => {
    const server = await createImageServer({ port: 0, host: "127.0.0.1" });
    try {
      const baseUrl = `http://127.0.0.1:${server.address().port}`;
      const initialized = await fetch(`${baseUrl}${apiPath("/spaces/initialize")}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "测试空间" })
      });
      expect(initialized.status).toBe(200);

      const firstResponse = await fetch(`${baseUrl}${apiPath("/schemes")}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ schemes: [{ name: "Before", projects: [], children: [] }] })
      });
      const firstPayload = await firstResponse.json();
      const schemeId = firstPayload.schemes[0].schemeId;

      const movedResponse = await fetch(`${baseUrl}${apiPath("/schemes")}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          schemes: [{ ...firstPayload.schemes[0], name: "After" }]
        })
      });
      const movedPayload = await movedResponse.json();

      expect(firstResponse.status).toBe(200);
      expect(movedResponse.status).toBe(200);
      expect(movedPayload.schemes[0].schemeId).toBe(schemeId);
      expect((await readSchemes({ paths })).map((scheme) => scheme.schemeId)).toEqual([schemeId]);
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  test("ZIP import discards archived numbers and allocates fresh numbers recursively", async () => {
    const zip = new AdmZip();
    zip.addFile("External root/scheme.json", Buffer.from(JSON.stringify({ name: "External root", schemeId: 900 })));
    zip.addFile("External root/Child/scheme.json", Buffer.from(JSON.stringify({ name: "Child", schemeId: 901 })));

    const imported = await importSchemeArchiveBuffer({
      paths,
      fileName: "external.zip",
      buffer: zip.toBuffer()
    });
    const schemes = await readSchemes({ paths });

    expect(imported.schemeId).toBe(1);
    expect(schemes[0].schemeId).toBe(1);
    expect(schemes[0].children[0].schemeId).toBe(2);
  });

  test("ZIP import accepts parentSchemeId and nests the imported tree under that parent", async () => {
    const parentSchemeId = await saveSchemeRecordDirectory({ paths, schemePath: ["Parent"] });
    const zip = new AdmZip();
    zip.addFile("External root/scheme.json", Buffer.from(JSON.stringify({ name: "External root", schemeId: 900 })));

    const imported = await importSchemeArchiveBuffer({
      paths,
      parentSchemeId,
      fileName: "external.zip",
      buffer: zip.toBuffer()
    });
    const schemes = await readSchemes({ paths });

    expect(imported.importedPath).toEqual(["Parent", "External root"]);
    expect(schemes[0].schemeId).toBe(parentSchemeId);
    expect(schemes[0].children[0].schemeId).not.toBe(900);
  });

  test("internal project lookup accepts schemeId and rejects a conflicting path", async () => {
    const server = await createImageServer({ port: 0, host: "127.0.0.1" });
    try {
      const baseUrl = `http://127.0.0.1:${server.address().port}`;
      const initialized = await fetch(`${baseUrl}${apiPath("/spaces/initialize")}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "测试空间" })
      });
      expect(initialized.status).toBe(200);

      const created = await fetch(`${baseUrl}${apiPath("/schemes/scheme")}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ schemePath: ["Target"] })
      });
      const createdScheme = await created.json();
      expect(created.status).toBe(200);
      expect(Number.isSafeInteger(createdScheme.schemeId) && createdScheme.schemeId > 0).toBe(true);
      const schemeId = createdScheme.schemeId;
      const schemeDir = join(paths.schemeFiles, "Target");
      await mkdir(schemeDir, { recursive: true });
      await writeModel(join(schemeDir, "Model.json"), "Model");

      const byNumber = await fetch(`${baseUrl}${apiPath("/schemes/project")}?schemeId=${schemeId}&name=Model`);
      const project = await byNumber.json();
      expect(byNumber.status).toBe(200);
      expect(project.project.name).toBe("Model");

      const savedByNumber = await fetch(`${baseUrl}${apiPath("/schemes/project")}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          schemeId,
          record: {
            name: "Saved by number",
            project: { version: 1, name: "Saved by number", nodes: [], edges: [] }
          }
        })
      });
      expect(savedByNumber.status).toBe(200);
      const savedModel = await fetch(`${baseUrl}${apiPath("/schemes/project")}?schemeId=${schemeId}&name=Saved%20by%20number`);
      expect(savedModel.status).toBe(200);
      expect((await savedModel.json()).project.name).toBe("Saved by number");

      const deletedByNumber = await fetch(`${baseUrl}${apiPath("/schemes/project")}`, {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ schemeId, name: "Saved by number" })
      });
      expect(deletedByNumber.status).toBe(200);
      const missingAfterDelete = await fetch(`${baseUrl}${apiPath("/schemes/project")}?schemeId=${schemeId}&name=Saved%20by%20number`);
      expect(missingAfterDelete.status).toBe(404);

      const archive = new AdmZip();
      archive.addFile("Imported root/Imported model.json", Buffer.from(JSON.stringify({
        version: 1,
        name: "Imported model",
        nodes: [],
        edges: []
      })));
      const importedResponse = await fetch(`${baseUrl}${apiPath("/schemes/import")}?parentSchemeId=${schemeId}&fileName=child.zip`, {
        method: "POST",
        headers: { "content-type": "application/zip" },
        body: archive.toBuffer()
      });
      const importedPayload = await importedResponse.json();
      expect(importedResponse.status).toBe(200);
      const target = importedPayload.schemes.find((scheme) => scheme.schemeId === schemeId);
      expect(target.children[0].name).toBe("Imported root");
      expect(target.children[0].schemeId).not.toBe(schemeId);
      expect(importedPayload.schemeId).toBe(target.children[0].schemeId);

      const conflictingPath = encodeURIComponent(JSON.stringify(["Other"]));
      const conflict = await fetch(`${baseUrl}${apiPath("/schemes/project")}?schemePath=${conflictingPath}&schemeId=${schemeId}&name=Model`);
      expect(conflict.status).toBe(400);

      const invalid = await fetch(`${baseUrl}${apiPath("/schemes/project")}?schemeId=0&name=Model`);
      expect(invalid.status).toBe(400);
      const unknown = await fetch(`${baseUrl}${apiPath("/schemes/project")}?schemeId=99999&name=Model`);
      expect(unknown.status).toBe(404);

      const moved = await fetch(`${baseUrl}${apiPath("/schemes/scheme")}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ schemePath: ["Moved"], schemeId })
      });
      const movedPayload = await moved.json();
      expect(moved.status).toBe(200);
      expect(movedPayload.schemeId).toBe(schemeId);

      const conflictingMove = await fetch(`${baseUrl}${apiPath("/schemes/scheme")}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ schemePath: ["Other"], previousSchemePath: ["Wrong"], schemeId })
      });
      expect(conflictingMove.status).toBe(400);

      const emptySchemeNo = await saveSchemeRecordDirectory({ paths, schemePath: ["Empty"] });
      const exported = await fetch(`${baseUrl}${apiPath("/schemes/export")}?schemeId=${emptySchemeNo}`);
      expect(exported.status).toBe(200);
      expect(exported.headers.get("content-type")).toContain("application/zip");

      const deletedScheme = await fetch(`${baseUrl}${apiPath("/schemes/scheme")}`, {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ schemeId })
      });
      expect(deletedScheme.status).toBe(200);
      const remaining = await fetch(`${baseUrl}${apiPath("/schemes")}`);
      const remainingTree = await remaining.json();
      expect(remainingTree.schemes.some((scheme) => scheme.schemeId === schemeId)).toBe(false);
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });
});
