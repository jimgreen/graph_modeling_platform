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

// ── toDataURL 返回值的 slice 路径 ────────────────────────────
//
// 真实契约（读自 runtimeScreenshot.ts 的 72-85 行，勿凭印象断言）：
//   rasterizeSvgString(svg, w, h) → Promise<string>，返回**裸 base64 字符串**；
//   绝不是 Buffer，也不是 {ok:true,...} 信封（那套信封是 serializeScreenshot 的返回值）。
//   本层在 slice 前缀时只做两件事，且顺序固定：
//     ① 拒掉非 data:image/png;base64, 开头的返回（超大画布时浏览器回 data:,）；
//     ② 拒掉剥完前缀后为空的负载（否则下游拿到一张「成功的空图」）。
//   本层**不解码、不校验 base64 字符集**，所以「解码正确」在本层的准确含义是：
//   剥完前缀剩下的那段仍能无损还原成原始 PNG 字节。
//
// 既有 3 组测试只覆盖「前缀完全正确」这一条路径，下面补齐其余分支。
const PNG_DATA_URL_PREFIX = "data:image/png;base64,";
const NO_PNG_PREFIX_MESSAGE =
  "canvas 尺寸超出浏览器上限，toDataURL 未返回 PNG data URL，截图内容为空。";
const EMPTY_PAYLOAD_MESSAGE = "canvas.toDataURL 返回的 PNG data URL 内容为空，截图失败。";

// 真实 PNG 魔数 + 几个非文本字节：不用 "QUJD"（= "ABC"）这种一眼可猜的载荷，
// 否则「往返解码」断言会退化成「字符串没变」的弱断言；含 0x00/0xff 也能保证
// 若有人把 base64 当作文本 trim/replace，这两条断言都会红。
const FAKE_PNG_BYTES = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0xff, 0xfe, 0x01, 0x02,
]);

describe("rasterizeSvgString：data URL 前缀校验与空负载", () => {
  test("正常 PNG data URL → 返回裸 base64 字符串，解码后逐字节还原原始 PNG", async () => {
    const { canvas } = setup(1);
    const payload = FAKE_PNG_BYTES.toString("base64");
    canvas.toDataURL.mockReturnValue(`${PNG_DATA_URL_PREFIX}${payload}`);

    const base64 = await rasterizeSvgString("<svg/>", 10, 10);

    // 返回值是 string（不是 Buffer、不是信封对象）
    expect(typeof base64).toBe("string");
    // ① 透传：前缀被完整剥掉，负载一个字符都没动
    expect(base64).toBe(payload);
    expect(base64.startsWith("data:")).toBe(false);
    // ② 解码往返：剥剩下的确实是原始 PNG 字节的无损 base64
    expect(Buffer.from(base64, "base64").equals(FAKE_PNG_BYTES)).toBe(true);
  });

  test("★ 前缀不匹配（jpeg / data:xxx / data:, / 裸串 / 空串 / 大写 / 带参数）→ 抛错并释放 objectURL", async () => {
    // 每条都要能打到「前缀判定」这一步，而不是先被别的守卫拦掉
    const cases: Array<[string, string]> = [
      ["data:image/jpeg;base64,QUJD", "换成 jpeg"],
      ["data:xxx", "无 media type"],
      ["data:,", "画布超上限时浏览器的经典回退"],
      ["QUJD", "裸 base64（无 data URL 包装）"],
      ["", "空串"],
      ["DATA:image/png;base64,QUJD", "前缀大写"],
      ["data:image/png;base64;charset=utf-8,QUJD", "前缀后多带一段参数"],
      ["data:image/png,QUJD", "缺 base64 段"],
      // 这条同时区分 startsWith 与 includes：前缀在串里但不在开头，必须拒
      ["junk data:image/png;base64,QUJD", "前缀不在开头"],
    ];

    for (const [dataUrl, why] of cases) {
      const { canvas, revokeObjectURL } = setup(1);
      canvas.toDataURL.mockReturnValue(dataUrl);

      await expect(rasterizeSvgString("<svg/>", 10, 10), `${why}: ${dataUrl}`).rejects.toThrow(
        NO_PNG_PREFIX_MESSAGE
      );
      // 抛错路径同样要释放 objectURL（finally）
      expect(revokeObjectURL, `${why}: ${dataUrl}`).toHaveBeenCalledTimes(1);
    }
  });

  test("★ 前缀正确但 base64 为空串 → 抛「内容为空」，而非当成成功的空图", async () => {
    const { canvas, revokeObjectURL } = setup(1);
    // 前缀在、后面什么都没有：浏览器画布超限或上下文异常时的形态
    canvas.toDataURL.mockReturnValue(PNG_DATA_URL_PREFIX);

    await expect(rasterizeSvgString("<svg/>", 10, 10)).rejects.toThrow(EMPTY_PAYLOAD_MESSAGE);
    // 钉死「不回退成空串成功」——否则下游会存下一张 base64 为空的成功截图
    expect(revokeObjectURL).toHaveBeenCalledTimes(1);
  });

  test("非法 base64 字符 → 原样透传（本层不校验字符集，记录现状的缺口）", async () => {
    const { canvas } = setup(1);
    const junk = "!!!not-base64!!!";
    canvas.toDataURL.mockReturnValue(`${PNG_DATA_URL_PREFIX}${junk}`);

    // 现状如实钉住：只判「非空」，不判 base64 字符集 —— 垃圾串被当成合法截图返回。
    // ⚠ 缺口：下游 Buffer.from(x, "base64") 会静默丢弃非法字符（本例解出 7 字节垃圾），
    //   即「成功」地产生一张损坏的图，且本层无从发现。
    await expect(rasterizeSvgString("<svg/>", 10, 10)).resolves.toBe(junk);
  });

  test("payload 含换行与空白（base64 按 76 字符折行的常见形态）→ 原样透传，不 strip 不重排", async () => {
    const { canvas } = setup(1);
    const long = Buffer.from(Array.from({ length: 120 }, (_, i) => (i * 37) % 256)).toString(
      "base64"
    );
    const wrapped = ` \r\n${long.slice(0, 64)}\n  ${long.slice(64)}\t`;
    canvas.toDataURL.mockReturnValue(`${PNG_DATA_URL_PREFIX}${wrapped}`);

    const base64 = await rasterizeSvgString("<svg/>", 10, 10);

    // 折行/空白属于载荷的一部分，本层原样交给下游
    expect(base64).toBe(wrapped);
    // 而下游（含 Node 的解码器）能容忍它：往返字节数不变，说明这不是坏载荷
    expect(Buffer.from(base64, "base64")).toHaveLength(120);
  });

  test("payload 只有空白 → 仍算成功：空判用的是 !base64，没有 trim", async () => {
    const { canvas } = setup(1);
    // 与「空串 → 抛错」相邻的另一侧：判空只看字符串是否为 falsy，空白不算空
    canvas.toDataURL.mockReturnValue(`${PNG_DATA_URL_PREFIX}   \n`);

    await expect(rasterizeSvgString("<svg/>", 10, 10)).resolves.toBe("   \n");
  });
});