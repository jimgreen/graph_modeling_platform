import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { apiPath } from "../config.mjs";
import { readInterfaceCustomizationConfig } from "../interfaceCustomization.mjs";
import { createImageServer } from "../server.mjs";

let dataDir;
let configPath;
let server;
let projectServer;
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
  if (projectServer) await new Promise((resolve) => projectServer.close(resolve));
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
    expect(payload.deviceLibrary.categories).toEqual({});
    expect(payload.deviceLibrary.categoryOrder).toEqual([]);
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

  test("读取时先加载示例配置，再由自定义配置覆盖", async () => {
    const examplePath = join(dataDir, "ui-customization.config.example");
    await writeFile(examplePath, JSON.stringify({
      buttons: { "topbar.save": false },
      modules: { "module.canvas": false }
    }), "utf8");
    await writeFile(configPath, JSON.stringify({
      buttons: { "topbar.save": true }
    }), "utf8");

    const payload = await readInterfaceCustomizationConfig({
      exampleFilePath: examplePath,
      filePath: configPath
    });
    expect(payload.exists).toBe(true);
    expect(payload.buttons["topbar.save"]).toBe(true);
    expect(payload.modules["module.canvas"]).toBe(false);
    expect(payload.modules["module.rightPanel"]).toBe(true);
  });

  test("指定项目目录时 GET/PUT 使用项目 ui-customization.config.json", async () => {
    const projectDirectory = join(dataDir, "projects", "alpha");
    await mkdir(projectDirectory, { recursive: true });
    projectServer = await createImageServer({
      port: 0,
      host: "127.0.0.1",
      projectDirectory
    });
    const projectBaseUrl = `http://127.0.0.1:${projectServer.address().port}`;
    const getResponse = await fetch(`${projectBaseUrl}${apiPath("/interface-customization")}`);
    const getPayload = await getResponse.json();
    expect(getResponse.status).toBe(200);
    expect(getPayload.exists).toBe(false);

    const putResponse = await fetch(`${projectBaseUrl}${apiPath("/interface-customization")}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ buttons: { "topbar.save": false } })
    });
    expect(putResponse.status).toBe(200);
    const stored = JSON.parse(await readFile(join(projectDirectory, "ui-customization.config.json"), "utf8"));
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
