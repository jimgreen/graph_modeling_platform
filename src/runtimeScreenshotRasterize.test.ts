// 截图核心：SVG 字符串 → PNG base64（rasterizeSvgString）。
//
// 这是「浏览器里跑、Node 里测」的唯一一段：需要 Image / document / window 三样
// 全靠桩。它有三条容易写错又不会被编译器发现的规则 ——
//   ① backing store 按 dpr 放大（canvas.width/height），但 drawImage 用**逻辑**尺寸；
//      写反了就得到一张被放大 dpr² 倍、或只有 1/dpr 大小的图。
//   ② 返回值必须剥掉 data URL 前缀（下游存的是裸 base64）。
//   ③ objectURL 必须在失败路径也释放（finally），否则每次截图泄漏一个 blob。
// 现有测试只覆盖了 serializeScreenshot 与 handler，核心函数本身零直接断言。
import { afterEach, describe, expect, test, vi } from "vitest";
import { rasterizeSvgString } from "./runtimeScreenshot";

class FakeImage {
  static instances: FakeImage[] = [];
  crossOrigin = "";
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  private assignedSrc = "";

  constructor() {
    FakeImage.instances.push(this);
  }

  set src(value: string) {
    this.assignedSrc = value;
    // 浏览器里 src 赋值后异步触发 onload/onerror
    queueMicrotask(() => {
      if (FakeImage.failNextLoad) {
        this.onerror?.();
      } else {
        this.onload?.();
      }
    });
  }

  get src() {
    return this.assignedSrc;
  }

  static failNextLoad = false;
}

const setup = (devicePixelRatio: number | undefined, context: unknown = {}) => {
  const ctx = { scale: vi.fn(), drawImage: vi.fn(), ...(context as object) };
  const canvas = {
    width: 0,
    height: 0,
    getContext: vi.fn(() => ctx),
    toDataURL: vi.fn(() => "data:image/png;base64,QUJD")
  };
  const createObjectURL = vi.fn(() => "blob:fake-1");
  const revokeObjectURL = vi.fn();
  vi.stubGlobal("Image", FakeImage);
  vi.stubGlobal("window", { devicePixelRatio });
  vi.stubGlobal("document", { createElement: vi.fn(() => canvas) });
  vi.stubGlobal("URL", { createObjectURL, revokeObjectURL });
  FakeImage.instances = [];
  FakeImage.failNextLoad = false;
  return { canvas, ctx, createObjectURL, revokeObjectURL };
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("rasterizeSvgString：dpr 与尺寸", () => {
  test("backing store 按 dpr 放大，drawImage 仍用逻辑尺寸", async () => {
    const { canvas, ctx } = setup(2);
    await rasterizeSvgString("<svg/>", 800, 600);

    expect(canvas.width).toBe(1600);
    expect(canvas.height).toBe(1200);
    expect(ctx.scale).toHaveBeenCalledWith(2, 2);
    // ★ 关键：绘制尺寸不乘 dpr，否则内容被放大 dpr 倍
    expect(ctx.drawImage.mock.calls[0].slice(1)).toEqual([0, 0, 800, 600]);
  });

  test("dpr 缺省或为 0 → 按 1 处理", async () => {
    for (const dpr of [undefined, 0]) {
      const { canvas, ctx } = setup(dpr as number | undefined);
      await rasterizeSvgString("<svg/>", 100, 50);
      expect(canvas.width).toBe(100);
      expect(ctx.scale).toHaveBeenCalledWith(1, 1);
    }
  });

  test("★ dpr 非整数时 backing store 取整（1.5 × 333 = 499.5 → 500）", async () => {
    const { canvas } = setup(1.5);
    await rasterizeSvgString("<svg/>", 333, 333);
    expect(canvas.width).toBe(500);
    expect(canvas.height).toBe(500);
  });

  test("PNG 不填底色，输出即 toDataURL 的内容", async () => {
    const { canvas } = setup(1);
    await rasterizeSvgString("<svg/>", 10, 10);
    expect(canvas.toDataURL).toHaveBeenCalledWith("image/png");
  });
});

describe("rasterizeSvgString：返回值与资源释放", () => {
  test("★ 剥掉 data:image/png;base64, 前缀，只留裸 base64", async () => {
    setup(1);
    await expect(rasterizeSvgString("<svg/>", 10, 10)).resolves.toBe("QUJD");
  });

  test("objectURL 用完即释放", async () => {
    const { createObjectURL, revokeObjectURL } = setup(1);
    await rasterizeSvgString("<svg/>", 10, 10);
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:fake-1");
  });

  test("Image 的 src 就是刚建的 objectURL，且跨域设为 anonymous", async () => {
    setup(1);
    await rasterizeSvgString("<svg/>", 10, 10);
    expect(FakeImage.instances[0].src).toBe("blob:fake-1");
    expect(FakeImage.instances[0].crossOrigin).toBe("anonymous");
  });
});

describe("rasterizeSvgString：失败路径", () => {
  test("图片加载失败 → 抛错，且 objectURL 仍然释放", async () => {
    const { revokeObjectURL } = setup(1);
    FakeImage.failNextLoad = true;
    await expect(rasterizeSvgString("<svg/>", 10, 10)).rejects.toThrow("SVG 图像加载失败。");
    expect(revokeObjectURL).toHaveBeenCalledTimes(1);
  });

  test("拿不到 2d 上下文 → 抛错，且 objectURL 仍然释放", async () => {
    const { revokeObjectURL } = setup(1, undefined);
    // getContext 返回 null 的场景单独构造
    const canvas = { width: 0, height: 0, getContext: vi.fn(() => null), toDataURL: vi.fn() };
    vi.stubGlobal("document", { createElement: vi.fn(() => canvas) });
    await expect(rasterizeSvgString("<svg/>", 10, 10)).rejects.toThrow("无法获取 canvas 2d 上下文。");
    expect(revokeObjectURL).toHaveBeenCalledTimes(1);
  });
});