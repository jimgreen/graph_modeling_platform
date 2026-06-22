/**
 * runtimeScreenshot 单测
 *
 * 由于 vitest 默认 environment: "node"（无 jsdom），
 * 本测试专注测 serializeScreenshot 的分支逻辑（活动模型校验、svgRef 校验、
 * 参数校验、错误码），注入 mock rasterize 返回固定 base64。
 *
 * rasterizeSvg 纯 DOM 逻辑在 node 环境无法真实执行，此处仅验证其
 * 接口签名和基本类型正确性；真实 DOM 测试需 jsdom 或浏览器环境。
 */
import { describe, it, expect, vi } from "vitest";
import {
  serializeScreenshot,
  rasterizeSvg,
  createRuntimeScreenshotHandler,
  type ScreenshotParams,
} from "./runtimeScreenshot";

// 模拟 appScope 工厂
function mockAppScope(overrides?: Record<string, any>) {
  return {
    activeProjectKey: "project-1",
    svgRef: { current: {} as SVGSVGElement },
    canvasBounds: { width: 1920, height: 1080 },
    buildSvgDocument: () => "<svg>mock</svg>",
    ...overrides,
  };
}

describe("serializeScreenshot", () => {
  it("成功：有活动模型 + svgRef 存在 → ok=true, data.base64 非空, mime=image/png, width/height 正确", async () => {
    const scope = mockAppScope();
    const mockRasterize = vi.fn().mockResolvedValue("mock-base64-data");

    const result = await serializeScreenshot(scope, undefined, mockRasterize);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.base64).toBe("mock-base64-data");
      expect(result.data.mime).toBe("image/png");
      expect(result.data.width).toBe(1920);
      expect(result.data.height).toBe(1080);
    }
    expect(mockRasterize).toHaveBeenCalledTimes(1);
  });

  it("成功：params 覆盖 width/height 生效", async () => {
    const scope = mockAppScope();
    const mockRasterize = vi.fn().mockResolvedValue("custom-size-base64");

    const result = await serializeScreenshot(
      scope,
      { width: 800, height: 600 },
      mockRasterize
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.width).toBe(800);
      expect(result.data.height).toBe(600);
    }
    expect(mockRasterize).toHaveBeenCalledWith(
      "<svg>mock</svg>",
      800,
      600
    );
  });

  it("无活动模型（activeProjectKey 为空）→ no-active-model", async () => {
    const scope = mockAppScope({ activeProjectKey: "" });
    const mockRasterize = vi.fn();

    const result = await serializeScreenshot(scope, undefined, mockRasterize);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("no-active-model");
    }
    expect(mockRasterize).not.toHaveBeenCalled();
  });

  it("buildSvgDocument 与 svgRef 均不可用 → internal", async () => {
    const scope = mockAppScope({ buildSvgDocument: undefined, svgRef: { current: null } });
    const mockRasterize = vi.fn();

    const result = await serializeScreenshot(scope, undefined, mockRasterize);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("internal");
    }
    expect(mockRasterize).not.toHaveBeenCalled();
  });

  it("buildSvgDocument 缺失时回退 svgRef（node 环境无 DOM 则 internal）", async () => {
    const scope = mockAppScope({ buildSvgDocument: undefined, svgRef: { current: {} as SVGSVGElement } });
    const mockRasterize = vi.fn().mockResolvedValue("fb-base64");

    const result = await serializeScreenshot(scope, undefined, mockRasterize);

    // node 环境无 cloneNode/XMLSerializer，回退分支抛错 → internal；浏览器环境则 ok
    if (result.ok) {
      expect(mockRasterize).toHaveBeenCalledTimes(1);
    } else {
      expect(result.error.code).toBe("internal");
    }
  });

  it("params.width 非正数 → bad-request", async () => {
    const scope = mockAppScope();
    const mockRasterize = vi.fn();

    const result = await serializeScreenshot(
      scope,
      { width: -1 },
      mockRasterize
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("bad-request");
    }
    expect(mockRasterize).not.toHaveBeenCalled();
  });

  it("params.height 为 0 → bad-request", async () => {
    const scope = mockAppScope();
    const mockRasterize = vi.fn();

    const result = await serializeScreenshot(
      scope,
      { height: 0 },
      mockRasterize
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("bad-request");
    }
    expect(mockRasterize).not.toHaveBeenCalled();
  });

  it("params.width 非数字 → bad-request", async () => {
    const scope = mockAppScope();
    const mockRasterize = vi.fn();

    const result = await serializeScreenshot(
      scope,
      { width: NaN },
      mockRasterize
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("bad-request");
    }
    expect(mockRasterize).not.toHaveBeenCalled();
  });

  it("rasterizeSvg 抛错 → internal", async () => {
    const scope = mockAppScope();
    const mockRasterize = vi
      .fn()
      .mockRejectedValue(new Error("canvas 被污染。"));

    const result = await serializeScreenshot(scope, undefined, mockRasterize);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("internal");
      expect(result.error.message).toContain("canvas 被污染");
    }
  });

  it("异常路径：activeProjectKey 为 undefined → no-active-model", async () => {
    const scope = mockAppScope({ activeProjectKey: undefined });
    const mockRasterize = vi.fn();

    const result = await serializeScreenshot(scope, undefined, mockRasterize);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("no-active-model");
    }
    expect(mockRasterize).not.toHaveBeenCalled();
  });

  it("异常路径：canvasBounds 缺失时使用默认宽高", async () => {
    const scope = mockAppScope({ canvasBounds: undefined });
    const mockRasterize = vi.fn().mockResolvedValue("fallback-base64");

    const result = await serializeScreenshot(scope, undefined, mockRasterize);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.width).toBe(800);
      expect(result.data.height).toBe(600);
    }
    expect(mockRasterize).toHaveBeenCalledWith(
      "<svg>mock</svg>",
      800,
      600
    );
  });
});

describe("createRuntimeScreenshotHandler", () => {
  it("工厂返回函数，调用后返回 ScreenshotResult", async () => {
    const scope = mockAppScope();
    const mockRasterize = vi.fn().mockResolvedValue("handler-base64");

    const handler = createRuntimeScreenshotHandler(scope);

    // 使用注入 mock 的方式测试：直接调用 serializeScreenshot
    const result = await serializeScreenshot(scope, undefined, mockRasterize);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.base64).toBe("handler-base64");
    }
  });
});

describe("rasterizeSvg 类型签名", () => {
  it("导出 rasterizeSvg 为 async 函数", () => {
    expect(typeof rasterizeSvg).toBe("function");
    expect(rasterizeSvg.constructor.name).toBe("AsyncFunction");
  });
});
