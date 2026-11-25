import { mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { apiPath } from "../config.mjs";
import { createImageServer } from "../server.mjs";

let dataDir;
let configPath;
let server;
let baseUrl;

beforeEach(async () => {
  dataDir = await mkdtemp(join(tmpdir(), "interface-customization-"));
  configPath = join(dataDir, "ui-customization.config.json");
  server = await createImageServer({
    port: 0,
    host: "127.0.0.1",
    interfaceCustomizationPath: configPath
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

afterEach(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  if (dataDir) await rm(dataDir, { recursive: true, force: true });
});

describe("界面定制配置接口", () => {
  test("文件缺失时 GET 返回默认全显示配置", async () => {
    const response = await fetch(`${baseUrl}${apiPath("/interface-customization")}`);
    const payload = await response.json();
    expect(response.status).toBe(200);
    expect(payload.exists).toBe(false);
    expect(payload.buttons["topbar.save"]).toBe(true);
    expect(payload.buttons["topbar.brand"]).toBe(true);
    expect(payload.modules["module.canvas"]).toBe(true);
    expect(payload.modules["module.rightPanel.deviceMeasurement"]).toBe(true);
  });

  test("PUT 归一化布尔值并写入临时根目录文件", async () => {
    const response = await fetch(`${baseUrl}${apiPath("/interface-customization")}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        schemaVersion: 999,
        buttons: { "topbar.save": false, "topbar.brand": false, "topbar.unknown": false },
        modules: { "module.canvas": "false" }
      })
    });
    const payload = await response.json();
    const stored = JSON.parse(await readFile(configPath, "utf8"));
    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.buttons["topbar.save"]).toBe(false);
    expect(payload.buttons["topbar.brand"]).toBe(false);
    expect(payload.buttons["topbar.unknown"]).toBeUndefined();
    expect(payload.modules["module.canvas"]).toBe(true);
    expect(stored.buttons["topbar.save"]).toBe(false);
  });

  test("非法 JSON 返回 400", async () => {
    const response = await fetch(`${baseUrl}${apiPath("/interface-customization")}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: "{bad json"
    });
    const payload = await response.json();
    expect(response.status).toBe(400);
    expect(payload.error).toBeTruthy();
  });
});
