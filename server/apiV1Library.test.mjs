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

vi.mock("./server.mjs", () => ({
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

import { readDeviceLibraryConfig, readMeasurementConfig, eSectionColumns } from "./server.mjs";

// 临时往 mock 的 eSectionColumns 追加段名（用于触发 baseForESection 的兜底/兜底后分支），
// 跑完即删 —— 既有断言依赖 eSections.length === 3，泄漏会误伤它们。
async function withExtraESections(extraNames, run) {
  try {
    for (const name of extraNames) eSectionColumns[name] = [];
    await run();
  } finally {
    for (const name of extraNames) delete eSectionColumns[name];
  }
}

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
  deviceProfiles: [{ deviceKind: "ac-bus", items: [] }],
  groupDefaults: {
    backgroundColor: "transparent",
    borderColor: "#64748b",
    borderWidth: 0,
    borderStyle: "none"
  }
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
      deviceProfiles: [{ deviceKind: "ac-bus", items: [] }],
      groupDefaults: fullMeasurement.groupDefaults
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

// ── 未覆盖分支补齐 ──────────────────────────────────────────────
// 目标行：apiV1Library.mjs 33（未知段名兜底 base）、39（customCategoryLibraries 非数组兜底）、
// 72（categories catch 的非 Error 侧）、81（devices catch）、92/93（量测三字段兜底）、
// 95（measurements catch）、105/106（图元定义三字段兜底）。
describe("未覆盖分支", () => {
  test("未知段名前缀落到静态图元兜底（末条 return）", async () => {
    readDeviceLibraryConfig.mockResolvedValue({ exists: false });
    await withExtraESections(["ZetaNode", "WindTurbineBay"], async () => {
      const { request, response } = ctx();
      await handleV1LibraryDevices({ request, response });
      const eSections = response.jsonBody().data.eSections;
      // 既不匹配静态白名单、也不匹配 AC/Ground/DC/Hydro*/Heat* 任一前缀
      expect(eSections.find((s) => s.section === "ZetaNode").base).toBe("静态图元");
      expect(eSections.find((s) => s.section === "WindTurbineBay").base).toBe("静态图元");
    });
  });

  test("customCategoryLibraries 非数组时兜底空数组（不把非数组摊进 bases）", async () => {
    // 输入是非数组对象：兜底生效时 bases 仍是 5 个静态 base；
    // 若去掉 Array.isArray 守卫，`...{ weird: true }` 抛 TypeError → 500。
    readDeviceLibraryConfig.mockResolvedValue({ exists: false, customCategoryLibraries: { weird: true } });
    const { request, response } = ctx();
    await handleV1LibraryCategories({ request, response });
    expect(response.statusCode).toBe(200);
    expect(response.jsonBody().data.categories.map((c) => c.name)).toEqual([
      "静态图元", "交流设备", "直流设备", "氢能设备", "热能设备"
    ]);
  });

  test("categories 端点：抛出的不是 Error 时用固定兜底文案", async () => {
    readDeviceLibraryConfig.mockRejectedValue("字符串原因");
    const { request, response } = ctx();
    await handleV1LibraryCategories({ request, response });
    expect(response.statusCode).toBe(500);
    expect(response.jsonBody().error).toEqual({ code: "internal", message: "后端处理失败。" });
  });

  test("devices 端点抛错转 internal 并透传 Error.message", async () => {
    readDeviceLibraryConfig.mockRejectedValue(new Error("设备库配置损坏"));
    const { request, response } = ctx();
    await handleV1LibraryDevices({ request, response });
    expect(response.statusCode).toBe(500);
    expect(response.jsonBody().error).toEqual({ code: "internal", message: "设备库配置损坏" });
  });

  test("量测配置三字段全缺失时各自兜底（空对象/空数组）", async () => {
    readMeasurementConfig.mockResolvedValue({ exists: false });
    const { request, response } = ctx();
    await handleV1LibraryMeasurements({ request, response });
    expect(response.statusCode).toBe(200);
    expect(response.jsonBody().data).toEqual({
      groupDefaults: {},
      measurementTypes: [],
      deviceProfiles: []
    });
  });

  test("measurements 端点：抛出的不是 Error 时用固定兜底文案", async () => {
    // 普通对象（非 Error），且自身带 code —— 若 handler 改走别的 code 分支会被断言抓住
    readMeasurementConfig.mockRejectedValue({ code: "ENOENT", reason: "量测配置缺失" });
    const { request, response } = ctx();
    await handleV1LibraryMeasurements({ request, response });
    expect(response.statusCode).toBe(500);
    expect(response.jsonBody().error).toEqual({ code: "internal", message: "后端处理失败。" });
  });

  test("图元定义三字段全缺失时各自兜底（空对象/空数组）", async () => {
    readDeviceLibraryConfig.mockResolvedValue({ exists: false });
    const { request, response } = ctx();
    await handleV1LibraryDeviceDefinitions({ request, response });
    expect(response.statusCode).toBe(200);
    expect(response.jsonBody().data).toEqual({
      deviceDefinitionOverrides: {},
      customComponentLibraries: [],
      customCategoryLibraries: []
    });
  });
});
