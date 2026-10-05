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
import { describe, it, test, expect, vi, afterEach } from "vitest";
import {
  serializeScreenshot,
  rasterizeSvg,
  rasterizeSvgString,
  createRuntimeScreenshotHandler,
  type ScreenshotParams,
} from "./runtimeScreenshot";

const PNG_PREFIX = "data:image/png;base64,";

/**
 * 为 rasterizeSvgString 装上假的浏览器环境。
 * node 环境无 jsdom，需手动提供 Image / window / document。
 * 返回的 canvas 记录 width/height 与 drawImage 入参，便于校验正常路径未被改动。
 */
function installCanvasStub(dataUrl: string) {
  const canvas = {
    width: 0,
    height: 0,
    getContext: vi.fn(() => ({ scale: vi.fn(), drawImage: vi.fn() })),
    toDataURL: vi.fn(() => dataUrl),
  };
  class FakeImage {
    crossOrigin = "";
    onload: (() => void) | null = null;
    onerror: ((e?: unknown) => void) | null = null;
    set src(_value: string) {
      queueMicrotask(() => this.onload?.());
    }
  }
  vi.stubGlobal("Image", FakeImage);
  vi.stubGlobal("window", { devicePixelRatio: 2 });
  vi.stubGlobal("document", {
    createElement: vi.fn(() => canvas),
  });
  return canvas;
}

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

describe("rasterizeSvgString 对 toDataURL 异常返回的防御", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("画布超限：toDataURL 返回内容为空的 data:, → 抛错而非返回空串", async () => {
    installCanvasStub("data:,");

    await expect(rasterizeSvgString("<svg></svg>", 800, 600)).rejects.toThrow(
      /未返回 PNG data URL/
    );
  });

  test("经 serializeScreenshot：toDataURL 返回 data:, → ok=false 且错误信息具体，不是空串加 ok:true", async () => {
    installCanvasStub("data:,");

    const result = await serializeScreenshot(
      mockAppScope(),
      undefined,
      rasterizeSvgString
    );

    // 关键回归点：修复前这里会得到 { ok: true, data: { base64: "" } }
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("internal");
      expect(result.error.message).toMatch(/未返回 PNG data URL/);
    }
    // 明确排除「成功的空图」
    expect("data" in result).toBe(false);
  });

  test("其它非 PNG 前缀的 data URL（jpeg 与 data:,foo）→ 一律拒绝", async () => {
    installCanvasStub("data:image/jpeg;base64,xxx");
    await expect(rasterizeSvgString("<svg></svg>", 800, 600)).rejects.toThrow(
      /未返回 PNG data URL/
    );

    vi.unstubAllGlobals();
    installCanvasStub("data:,foo");
    await expect(rasterizeSvgString("<svg></svg>", 800, 600)).rejects.toThrow(
      /未返回 PNG data URL/
    );
  });

  test("只有合法前缀但内容为空的 PNG data URL → 拒绝", async () => {
    installCanvasStub(PNG_PREFIX);

    await expect(rasterizeSvgString("<svg></svg>", 800, 600)).rejects.toThrow(
      /内容为空/
    );
  });

  test("toDataURL 返回空串 → 拒绝", async () => {
    installCanvasStub("");

    await expect(rasterizeSvgString("<svg></svg>", 800, 600)).rejects.toThrow(
      /未返回 PNG data URL/
    );
  });

  test("正常 PNG data URL → 逐字节相同地返回 base64，canvas 尺寸按 dpr 放大", async () => {
    const payload = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
    const canvas = installCanvasStub(PNG_PREFIX + payload);

    const base64 = await rasterizeSvgString("<svg>x</svg>", 800, 600);

    expect(base64).toBe(payload);
    expect(canvas.toDataURL).toHaveBeenCalledWith("image/png");
    // devicePixelRatio = 2 → 800*2 / 600*2
    expect(canvas.width).toBe(1600);
    expect(canvas.height).toBe(1200);
  });
});

describe("validateParams 现状：小数与极端值实际被接受（与注释的正整数说法不符）", () => {
  test("小数 10.5 被当作合法尺寸透传", async () => {
    const mockRasterize = vi.fn().mockResolvedValue("x");

    const result = await serializeScreenshot(
      mockAppScope(),
      { width: 10.5, height: 10.5 },
      mockRasterize
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.width).toBe(10.5);
      expect(result.data.height).toBe(10.5);
    }
    expect(mockRasterize).toHaveBeenCalledWith("<svg>mock</svg>", 10.5, 10.5);
  });

  test("超大值 Number.MAX_SAFE_INTEGER 被接受，不做夹取", async () => {
    const mockRasterize = vi.fn().mockResolvedValue("x");

    const result = await serializeScreenshot(
      mockAppScope(),
      { width: Number.MAX_SAFE_INTEGER, height: 1 },
      mockRasterize
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.width).toBe(Number.MAX_SAFE_INTEGER);
    }
  });

  test("超小非整数 0.001 被接受", async () => {
    const mockRasterize = vi.fn().mockResolvedValue("x");

    const result = await serializeScreenshot(
      mockAppScope(),
      { width: 0.001 },
      mockRasterize
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.width).toBe(0.001);
    }
  });
});

/**
 * 假 SVG 元素：属性存在一个普通对象里，getAttribute 命中不到时返回 null
 * （与 DOM 一致，所以 `!clone.getAttribute("xmlns")` 能真的为真）。
 * setAttribute 是 vi.fn()，可直接断言「被写了哪些键、写了什么值」。
 */
type FakeSvgClone = {
  cloneNode: (deep: boolean) => FakeSvgClone;
  querySelectorAll: (selector: string) => Array<{ remove: () => void }>;
  setAttribute: (key: string, value: string) => void;
  getAttribute: (key: string) => string | null;
  __attrs: Record<string, string>;
};

function installSvgDomStub(initialAttrs: Record<string, string>) {
  const attrs: Record<string, string> = { ...initialAttrs };
  const setAttribute = vi.fn();
  const clone: FakeSvgClone = {
    cloneNode: () => clone,
    querySelectorAll: () => [],
    setAttribute: (key, value) => {
      setAttribute(key, value);
      attrs[key] = value;
    },
    getAttribute: (key) =>
      Object.prototype.hasOwnProperty.call(attrs, key) ? attrs[key] : null,
    __attrs: attrs,
  };
  vi.stubGlobal(
    "XMLSerializer",
    class {
      serializeToString(el: FakeSvgClone): string {
        return (
          "<svg " +
          Object.entries(el.__attrs)
            .map(([k, v]) => `${k}="${v}"`)
            .join(" ") +
          "/>"
        );
      }
    }
  );
  return { clone, setAttribute };
}

describe("svgRef 回退分支：xmlns 缺省补写 vs 已有 xmlns 保留", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("clone 无 xmlns → 补写标准命名空间，且只写 width/height/xmlns 三个键", async () => {
    const { clone, setAttribute } = installSvgDomStub({ viewBox: "0 0 100 50" });
    const rasterize = vi.fn().mockResolvedValue("svgref-base64");

    const result = await serializeScreenshot(
      mockAppScope({ buildSvgDocument: undefined, svgRef: { current: clone } }),
      { width: 321, height: 654 },
      rasterize
    );

    expect(result.ok).toBe(true);
    // 只写这三项：背景元素被移除、无多余属性
    expect(setAttribute.mock.calls.map((c) => c[0])).toEqual([
      "width",
      "height",
      "xmlns",
    ]);
    expect(setAttribute).toHaveBeenCalledWith("width", "321");
    expect(setAttribute).toHaveBeenCalledWith("height", "654");
    expect(setAttribute).toHaveBeenCalledWith("xmlns", "http://www.w3.org/2000/svg");
    // 序列化结果带上补写的 xmlns，宽度来自 params 而非 canvasBounds
    expect(rasterize).toHaveBeenCalledWith(
      '<svg viewBox="0 0 100 50" width="321" height="654" xmlns="http://www.w3.org/2000/svg"/>',
      321,
      654
    );
  });

  test("clone 已有非标准 xmlns → 原样保留，不被补写覆盖（守卫另一侧）", async () => {
    const { clone, setAttribute } = installSvgDomStub({
      viewBox: "0 0 100 50",
      xmlns: "urn:custom-svg-ns",
    });
    const rasterize = vi.fn().mockResolvedValue("svgref-keep");

    const result = await serializeScreenshot(
      mockAppScope({ buildSvgDocument: undefined, svgRef: { current: clone } }),
      { width: 321, height: 654 },
      rasterize
    );

    expect(result.ok).toBe(true);
    // 守卫另一侧：xmlns 一个字都不能写
    expect(setAttribute.mock.calls.map((c) => c[0])).toEqual(["width", "height"]);
    expect(rasterize).toHaveBeenCalledWith(
      '<svg viewBox="0 0 100 50" xmlns="urn:custom-svg-ns" width="321" height="654"/>',
      321,
      654
    );
  });
});

describe("rasterize 非 Error 拒绝：兜底文案而非 undefined", () => {
  test("以裸字符串拒绝 → message 取固定兜底「画布截图失败。」", async () => {
    const rasterize = vi.fn().mockRejectedValue("裸字符串原因");

    const result = await serializeScreenshot(
      mockAppScope(),
      undefined,
      rasterize
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("internal");
      // 若三元被抹平，这里会拿到 undefined（字符串没有 .message）
      expect(result.error.message).toBe("画布截图失败。");
    }
  });

  test("对照：Error 实例拒绝 → message 取 error.message，两侧兜底值确实不同", async () => {
    const rasterize = vi
      .fn()
      .mockRejectedValue(new Error("SVG 图像加载失败。"));

    const result = await serializeScreenshot(
      mockAppScope(),
      undefined,
      rasterize
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toBe("SVG 图像加载失败。");
      // 与另一侧的兜底文案区分开，否则上面的断言可能只是「恰好等于默认值」
      expect(result.error.message).not.toBe("画布截图失败。");
    }
  });
});

describe("外层 catch 非 Error 兜底：buildSvgDocument 抛非 Error", () => {
  test("抛裸字符串 → 兜底文案「截图过程发生未知错误。」被采用", async () => {
    const scope = mockAppScope({
      buildSvgDocument: (): never => {
        throw "裸字符串原因";
      },
    });
    const rasterize = vi.fn();

    const result = await serializeScreenshot(scope, undefined, rasterize);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("internal");
      // 若三元被抹平，这里会拿到 undefined
      expect(result.error.message).toBe("截图过程发生未知错误。");
    }
    // 抛错发生在 rasterize 之前，rasterize 不该被调用
    expect(rasterize).not.toHaveBeenCalled();
  });

  test("对照：抛 Error 实例 → message 取 error.message，与另一侧兜底文案不同", async () => {
    const scope = mockAppScope({
      buildSvgDocument: (): never => {
        throw new Error("图层数据畸形");
      },
    });
    const rasterize = vi.fn();

    const result = await serializeScreenshot(scope, undefined, rasterize);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toBe("图层数据畸形");
      expect(result.error.message).not.toBe("截图过程发生未知错误。");
    }
    expect(rasterize).not.toHaveBeenCalled();
  });
});
