import { beforeAll, afterAll, describe, expect, test } from "vitest";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const apiPath = (subPath) => `/webgrp${subPath}`;

let root;
let source;
let target;
let configPath;
let server;
let baseUrl;
let createImageServer;

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), "data-root-api-"));
  source = join(root, "source");
  target = join(root, "target");
  configPath = join(root, "platform.config.json");
  await mkdir(source);
  await mkdir(target);
  await writeFile(
    join(source, "spaces.json"),
    JSON.stringify({
      schemaVersion: 1,
      spaces: [{ id: "default", name: "默认空间", pinned: true, createdAt: "2026-01-01T00:00:00.000Z" }]
    }),
    "utf8"
  );
  process.env.GRAPH_MODEL_DATA_DIR = source;
  process.env.GRAPH_MODEL_CONFIG = configPath;
  ({ createImageServer } = await import("../server.mjs?data-root-api"));
  server = await createImageServer({ port: 0, host: "127.0.0.1" });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
  delete process.env.GRAPH_MODEL_DATA_DIR;
});

afterAll(async () => {
  if (server) await new Promise((resolveClose) => server.close(resolveClose));
  delete process.env.GRAPH_MODEL_DATA_DIR;
  delete process.env.GRAPH_MODEL_CONFIG;
  if (root) await rm(root, { recursive: true, force: true });
});

async function post(payload) {
  const response = await fetch(`${baseUrl}${apiPath("/platform/data-dir")}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
  return { response, body: await response.json() };
}

describe("platform data-dir API", () => {
  test("rejects a missing path with a stable validation error", async () => {
    const { response, body } = await post({});
    expect(response.status).toBe(400);
    expect(body.error.code).toBe("DATA_DIR_PATH_INVALID");
  });

  test("rejects data-dir requests from an untrusted Origin", async () => {
    const response = await fetch(`${baseUrl}${apiPath("/platform/data-dir")}`, {
      method: "POST",
      headers: { "content-type": "application/json", origin: "https://evil.example" },
      body: JSON.stringify({ path: join(root, "nonexistent-data-dir") })
    });
    expect(response.status).toBe(403);
    expect((await response.json()).error.code).toBe("DATA_DIR_ORIGIN_FORBIDDEN");
  });

  test("rejects migration when GRAPH_MODEL_DATA_DIR overrides platform.config.json", async () => {
    const previous = process.env.GRAPH_MODEL_DATA_DIR;
    process.env.GRAPH_MODEL_DATA_DIR = source;
    try {
      const response = await fetch(`${baseUrl}${apiPath("/platform/data-dir")}`, {
        method: "POST",
        headers: { "content-type": "application/json", origin: "http://127.0.0.1:5173" },
        body: JSON.stringify({ path: join(root, "nonexistent-data-dir") })
      });
      expect(response.status).toBe(409);
      expect((await response.json()).error.code).toBe("DATA_DIR_ENV_OVERRIDE");
    } finally {
      if (previous === undefined) delete process.env.GRAPH_MODEL_DATA_DIR;
      else process.env.GRAPH_MODEL_DATA_DIR = previous;
    }
  });

  test("rejects non-local data-dir callers before parsing the migration body", async () => {
    const response = await fetch(`${baseUrl}${apiPath("/platform/data-dir")}`, {
      method: "POST",
      headers: { "content-type": "application/json", origin: "http://127.0.0.1:5173" },
      body: JSON.stringify({})
    });
    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("DATA_DIR_PATH_INVALID");
  });

  test("rejects a non-empty target directory", async () => {
    await writeFile(join(target, ".keep"), "x", "utf8");
    try {
      const { response, body } = await post({ path: target });
      expect(response.status).toBe(400);
      expect(body.error.code).toBe("DATA_DIR_NOT_EMPTY");
    } finally {
      await rm(join(target, ".keep"), { force: true });
    }
  });

  test("migrates the active root, creates config from the example, and serves spaces from the new root", async () => {
    const previous = process.env.GRAPH_MODEL_DATA_DIR;
    delete process.env.GRAPH_MODEL_DATA_DIR;
    try {
      const { response, body } = await post({ path: target });
      expect(response.status).toBe(200);
      expect(body.ok).toBe(true);
      expect(body.dataRoot).toBe(resolve(target));
      expect(body.archivePath).toMatch(/source\.archive-\d{8}-\d{6}-[a-z0-9-]+\.zip$/iu);

      const config = JSON.parse(await readFile(configPath, "utf8"));
      expect(config.dataDir).toBe(resolve(target));
      const spacesResponse = await fetch(`${baseUrl}${apiPath("/spaces")}`);
      expect(spacesResponse.status).toBe(200);
      expect((await spacesResponse.json()).current).toBe("default");
      await expect(readFile(join(source, "spaces.json"), "utf8")).rejects.toMatchObject({ code: "ENOENT" });
      expect(await readFile(join(target, "spaces.json"), "utf8")).toContain("默认空间");
    } finally {
      if (previous === undefined) delete process.env.GRAPH_MODEL_DATA_DIR;
      else process.env.GRAPH_MODEL_DATA_DIR = previous;
    }
  });
});
