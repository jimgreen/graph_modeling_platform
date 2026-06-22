import { describe, expect, test, beforeEach, afterEach } from "vitest";
import { createImageServer } from "./image-server.mjs";

// HTTP 集成测试：起真实 server，打 /api/v1/library/* 真实请求。
// 验证路由挂载 + 信封格式 + 真实 device-library/measurement-config 配置响应。

let server;
let baseUrl;

beforeEach(async () => {
  server = await createImageServer({ port: 0, host: "127.0.0.1" });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

afterEach(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
});

async function fetchV1(pathname) {
  const res = await fetch(`${baseUrl}${pathname}`);
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    // 非 JSON
  }
  return { status: res.status, headers: res.headers, text, json };
}

describe("/api/v1/library HTTP 路由", () => {
  test("/api/v1/library 返聚合信封", async () => {
    const { status, json } = await fetchV1("/api/v1/library");
    expect(status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.data.categories).toBeDefined();
    expect(json.data.devices).toBeDefined();
    expect(json.data.measurements).toBeDefined();
    expect(json.data.deviceDefinitions).toBeDefined();
    expect(json.data.templates).toBeDefined();
  });

  test("/api/v1/library/categories 返分类树", async () => {
    const { status, json } = await fetchV1("/api/v1/library/categories");
    expect(status).toBe(200);
    expect(Array.isArray(json.data.categories)).toBe(true);
    expect(json.data.categories.some((c) => c.name === "静态图元")).toBe(true);
  });

  test("/api/v1/library/devices 返 E 段定义", async () => {
    const { status, json } = await fetchV1("/api/v1/library/devices");
    expect(status).toBe(200);
    expect(Array.isArray(json.data.eSections)).toBe(true);
    expect(json.data.eSections.length).toBeGreaterThan(0);
    expect(json.data.eSections[0]).toHaveProperty("section");
    expect(json.data.eSections[0]).toHaveProperty("columns");
    expect(json.data.eSections[0]).toHaveProperty("base");
  });

  test("/api/v1/library/measurements 返量测定义", async () => {
    const { status, json } = await fetchV1("/api/v1/library/measurements");
    expect(status).toBe(200);
    expect(Array.isArray(json.data.measurementTypes)).toBe(true);
    expect(Array.isArray(json.data.deviceProfiles)).toBe(true);
  });

  test("/api/v1/library/device-definitions 返图元定义", async () => {
    const { status, json } = await fetchV1("/api/v1/library/device-definitions");
    expect(status).toBe(200);
    expect(json.data).toHaveProperty("deviceDefinitionOverrides");
    expect(json.data).toHaveProperty("customComponentTypes");
    expect(json.data).toHaveProperty("customAttributeLibraries");
  });

  test("/api/v1/library/templates 返模板库", async () => {
    const { status, json } = await fetchV1("/api/v1/library/templates");
    expect(status).toBe(200);
    expect(json.data).toHaveProperty("customDeviceTemplates");
    expect(json.data).toHaveProperty("customGraphTemplates");
    expect(json.data).toHaveProperty("customGraphTemplateTypes");
  });

  test("未知 /api/v1/library/* 路径返 404", async () => {
    const { status, json } = await fetchV1("/api/v1/library/unknown");
    expect(status).toBe(404);
    expect(json.error).toBeTruthy();
  });
});
