import { describe, expect, test, vi } from "vitest";
import {
  handleV1Library,
  handleV1LibraryCategories,
  handleV1LibraryDevices,
  handleV1LibraryMeasurements,
  handleV1LibraryDeviceDefinitions,
  handleV1LibraryTemplates
} from "./apiV1Library.mjs";

// handler 单测：mock image-server 依赖，验证正路径 + 信封 + 空库。
// HTTP 错误路径少（图元库域无 schemePath/name 参数，主要 200 + internal）。

vi.mock("./image-server.mjs", () => ({
  readDeviceLibraryConfig: vi.fn(),
  readMeasurementConfig: vi.fn(),
  eSectionColumns: {
    ACNode: ["idx", "name", "vbase"],
    StaticBasicShape: [],
    HydroSource: ["idx", "name", "node"]
  },
  staticComponentLibraryByKind: {
    "static-rect": "StaticBasicShape",
    "ac-bus": "StaticBasicShape"
  }
}));

import { readDeviceLibraryConfig, readMeasurementConfig } from "./image-server.mjs";

function createMockResponse() {
  const chunks = [];
  return {
    statusCode: 0,
    headers: {},
    writeHead(status, headers) {
      this.statusCode = status;
      this.headers = headers ?? {};
    },
    end(data) {
      if (data !== undefined) chunks.push(Buffer.isBuffer(data) ? data : Buffer.from(data));
    },
    body() {
      return Buffer.concat(chunks).toString("utf-8");
    },
    jsonBody() {
      return JSON.parse(this.body());
    }
  };
}

function ctx() {
  return { request: { headers: {} }, response: createMockResponse() };
}

const fullLib = {
  customDeviceTemplates: [{ id: "t1", name: "自定义模板1" }],
  customCategoryLibraries: ["自定义库A"],
  customComponentLibraries: [{ name: "自定义类型1" }],
  customGraphTemplateTypes: [{ name: "图元模板类型1" }],
  customGraphTemplates: [{ id: "gt1" }],
  deviceDefinitionOverrides: { "ac-bus": { name: "母线" } }
};

const fullMeasurement = {
  measurementTypes: [{ id: "voltage", name: "电压" }],
  deviceProfiles: [{ deviceKind: "ac-bus", items: [] }]
};

describe("handleV1LibraryCategories", () => {
  test("成功返分类树（静态 bases + 自定义库）", async () => {
    readDeviceLibraryConfig.mockResolvedValue(fullLib);
    const { request, response } = ctx();
    await handleV1LibraryCategories({ request, response });
    expect(response.statusCode).toBe(200);
    const names = response.jsonBody().data.categories.map((c) => c.name);
    expect(names).toContain("静态图元");
    expect(names).toContain("交流设备");
    expect(names).toContain("自定义库A");
  });

  test("空库（无自定义）返静态 bases", async () => {
    readDeviceLibraryConfig.mockResolvedValue({ exists: false, customCategoryLibraries: [] });
    const { request, response } = ctx();
    await handleV1LibraryCategories({ request, response });
    expect(response.jsonBody().data.categories).toHaveLength(5);
  });

  test("readDeviceLibraryConfig 抛错转 internal", async () => {
    readDeviceLibraryConfig.mockRejectedValue(new Error("boom"));
    const { request, response } = ctx();
    await handleV1LibraryCategories({ request, response });
    expect(response.statusCode).toBe(500);
    expect(response.jsonBody().error.code).toBe("internal");
  });
});

describe("handleV1LibraryDevices", () => {
  test("成功返 E 段定义 + 静态图元类型 + 自定义类型", async () => {
    readDeviceLibraryConfig.mockResolvedValue(fullLib);
    const { request, response } = ctx();
    await handleV1LibraryDevices({ request, response });
    const data = response.jsonBody().data;
    expect(data.eSections.length).toBe(3);
    expect(data.eSections.find((s) => s.section === "ACNode").columns).toEqual(["idx", "name", "vbase"]);
    expect(data.eSections.find((s) => s.section === "ACNode").base).toBe("交流设备");
    expect(data.eSections.find((s) => s.section === "HydroSource").base).toBe("氢能设备");
    expect(data.staticComponentLibraries).toHaveLength(2);
    expect(data.customComponentLibraries).toEqual([{ name: "自定义类型1" }]);
  });

  test("E 段 base 推导：StaticBasicShape→静态图元", async () => {
    readDeviceLibraryConfig.mockResolvedValue({ exists: false });
    const { request, response } = ctx();
    await handleV1LibraryDevices({ request, response });
    const staticSection = response.jsonBody().data.eSections.find((s) => s.section === "StaticBasicShape");
    expect(staticSection.base).toBe("静态图元");
  });
});

describe("handleV1LibraryMeasurements", () => {
  test("成功返量测定义", async () => {
    readMeasurementConfig.mockResolvedValue(fullMeasurement);
    const { request, response } = ctx();
    await handleV1LibraryMeasurements({ request, response });
    expect(response.jsonBody().data).toEqual({
      measurementTypes: [{ id: "voltage", name: "电压" }],
      deviceProfiles: [{ deviceKind: "ac-bus", items: [] }]
    });
  });

  test("空量测配置返空数组", async () => {
    readMeasurementConfig.mockResolvedValue({ exists: false, measurementTypes: [], deviceProfiles: [] });
    const { request, response } = ctx();
    await handleV1LibraryMeasurements({ request, response });
    expect(response.jsonBody().data.measurementTypes).toEqual([]);
  });
});

describe("handleV1LibraryDeviceDefinitions", () => {
  test("成功返图元定义", async () => {
    readDeviceLibraryConfig.mockResolvedValue(fullLib);
    const { request, response } = ctx();
    await handleV1LibraryDeviceDefinitions({ request, response });
    expect(response.jsonBody().data).toEqual({
      deviceDefinitionOverrides: { "ac-bus": { name: "母线" } },
      customComponentLibraries: [{ name: "自定义类型1" }],
      customCategoryLibraries: ["自定义库A"]
    });
  });
});

describe("handleV1LibraryTemplates", () => {
  test("成功返模板库", async () => {
    readDeviceLibraryConfig.mockResolvedValue(fullLib);
    const { request, response } = ctx();
    await handleV1LibraryTemplates({ request, response });
    expect(response.jsonBody().data).toEqual({
      customDeviceTemplates: [{ id: "t1", name: "自定义模板1" }],
      customGraphTemplates: [{ id: "gt1" }],
      customGraphTemplateTypes: [{ name: "图元模板类型1" }]
    });
  });
});

describe("handleV1Library 聚合", () => {
  test("一次返全部图元库信息", async () => {
    readDeviceLibraryConfig.mockResolvedValue(fullLib);
    readMeasurementConfig.mockResolvedValue(fullMeasurement);
    const { request, response } = ctx();
    await handleV1Library({ request, response });
    const data = response.jsonBody().data;
    expect(data.categories).toBeDefined();
    expect(data.devices).toBeDefined();
    expect(data.measurements).toBeDefined();
    expect(data.deviceDefinitions).toBeDefined();
    expect(data.templates).toBeDefined();
    expect(data.templates.customDeviceTemplates).toHaveLength(1);
  });

  test("聚合时 readDeviceLibraryConfig 抛错转 internal", async () => {
    readDeviceLibraryConfig.mockRejectedValue(new Error("boom"));
    readMeasurementConfig.mockResolvedValue(fullMeasurement);
    const { request, response } = ctx();
    await handleV1Library({ request, response });
    expect(response.statusCode).toBe(500);
  });
});
