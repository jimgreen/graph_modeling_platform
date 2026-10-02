// 节点图片预览：状态图优先于普通图；母线与无图节点直接跳过；
// React 版本与字符串版本（SVG 导出用）必须在「画不画」这件事上给出同样判断。
import { describe, expect, test, vi } from "vitest";

import {
  createBuildNodePreviewImageMarkup,
  createNodeImage,
  createRenderNodePreviewImageContent
} from "./appExtracted/appGraphMeasurementFactories";

const node = (over: Record<string, any> = {}) => ({
  id: "n1",
  kind: "ac-load",
  size: { width: 40, height: 30 },
  terminals: [],
  params: {},
  ...over
});

function createScope(over: Record<string, any> = {}) {
  const scope: Record<string, any> = {
    imageAssets: [],
    resolveNodeStateVisual: vi.fn(() => null),
    resolveStateVisualImageHref: vi.fn(() => ""),
    resolveNodeImage: vi.fn(() => ""),
    nodeForegroundImage: vi.fn(() => ""),
    isBusNode: vi.fn(() => false),
    isStaticNode: vi.fn(() => false),
    nodeImageContentTransform: vi.fn(() => "translate(0,0)"),
    svgImageContentMarkup: vi.fn((href: string, opts: any) => `<image href="${href}" data-fit="${opts.imageFit ?? ""}"/>`),
    escapeXml: (s: string) => String(s).replace(/&/g, "&amp;"),
    formatSvgNumber: (n: number) => String(Math.round(n * 100) / 100),
    ...over
  };
  scope.nodeImage = createNodeImage(scope);
  scope.buildNodePreviewImageMarkup = createBuildNodePreviewImageMarkup(scope);
  return scope;
}

describe("createNodeImage", () => {
  test("状态图存在时优先返回状态图", () => {
    const scope = createScope({
      resolveStateVisualImageHref: vi.fn(() => "state.png"),
      resolveNodeImage: vi.fn(() => "normal.png")
    });

    expect(scope.nodeImage(node())).toBe("state.png");
  });

  test("没有状态图时退回节点自身图", () => {
    const scope = createScope({ resolveNodeImage: vi.fn(() => "normal.png") });

    expect(scope.nodeImage(node())).toBe("normal.png");
  });

  test("两者都没有时返回空串而不是 undefined", () => {
    expect(createScope().nodeImage(node())).toBe("");
  });

  test("状态图解析收到节点与图库资产", () => {
    const resolveNodeStateVisual = vi.fn(() => ({ imageFit: "cover" }));
    const resolveStateVisualImageHref = vi.fn(() => "");
    const scope = createScope({ resolveNodeStateVisual, resolveStateVisualImageHref, imageAssets: [{ id: "a" }] });
    const n = node();

    scope.nodeImage(n);

    expect(resolveNodeStateVisual).toHaveBeenCalledWith(n);
    expect(resolveStateVisualImageHref).toHaveBeenCalledWith({ imageFit: "cover" }, [{ id: "a" }]);
  });
});

describe("createRenderNodePreviewImageContent", () => {
  test("母线节点返回 null", () => {
    const scope = createScope({ isBusNode: () => true, resolveNodeImage: () => "a.png" });

    expect(scope.buildNodePreviewImageMarkup(node(), "clip1")).toBe("");
  });

  test("没有任何图时返回 null", () => {
    expect(createScope().buildNodePreviewImageMarkup(node(), "clip1")).toBe("");
  });

  test("有图时输出 clipPath + 内容组，并带上 class 与 transform", () => {
    const scope = createScope({ resolveNodeImage: () => "a.png" });

    const markup = scope.buildNodePreviewImageMarkup(node(), "clip1", { className: "自定义" });

    expect(markup).toContain('<clipPath id="clip1">');
    expect(markup).toContain('class="自定义"');
    expect(markup).toContain('transform="translate(0,0)"');
  });

  test("clip:false 时不输出 clipPath，也不给图片挂 clip", () => {
    const scope = createScope({ resolveNodeImage: () => "a.png" });

    const markup = scope.buildNodePreviewImageMarkup(node(), "clip1", { clip: false });

    expect(markup).not.toContain("clipPath");
    expect(markup).not.toContain("url(#clip1)");
  });

  test("静态图元不画遮罩矩形，非静态图元画", () => {
    const staticScope = createScope({ resolveNodeImage: () => "a.png", isStaticNode: () => true });
    const plainScope = createScope({ resolveNodeImage: () => "a.png" });

    expect(staticScope.buildNodePreviewImageMarkup(node(), "c")).not.toContain("node-image-cover");
    expect(plainScope.buildNodePreviewImageMarkup(node(), "c")).toContain("node-image-cover");
  });

  test("有端子时遮罩加 terminal-reserved-area 类", () => {
    const scope = createScope({ resolveNodeImage: () => "a.png" });

    expect(scope.buildNodePreviewImageMarkup(node({ terminals: [{ id: "t1" }] }), "c")).toContain("terminal-reserved-area");
  });

  test("状态图存在时用状态图的 imageFit", () => {
    const scope = createScope({
      resolveNodeImage: () => "a.png",
      resolveNodeStateVisual: () => ({ imageFit: "状态适配" }),
      resolveStateVisualImageHref: () => "s.png"
    });

    expect(scope.buildNodePreviewImageMarkup(node(), "c")).toContain('data-fit="状态适配"');
  });

  test("没有状态图时用节点参数上的 backgroundImageFit", () => {
    const scope = createScope({ resolveNodeImage: () => "a.png" });

    expect(scope.buildNodePreviewImageMarkup(node({ params: { backgroundImageFit: "参数适配" } }), "c")).toContain('data-fit="参数适配"');
  });

  test("背景图与前景图分别用各自的 fit", () => {
    const scope = createScope({
      resolveNodeImage: () => "bg.png",
      nodeForegroundImage: () => "fg.png"
    });
    const n = node({ params: { backgroundImageFit: "bgfit", foregroundImageFit: "fgfit" } });

    const markup = scope.buildNodePreviewImageMarkup(n, "c");

    expect(markup).toContain('href="bg.png" data-fit="bgfit"');
    expect(markup).toContain('href="fg.png" data-fit="fgfit"');
  });

  test("只有前景图时也输出内容组", () => {
    const scope = createScope({ nodeForegroundImage: () => "fg.png" });
    const markup = scope.buildNodePreviewImageMarkup(node(), "c");

    expect(markup).toContain('href="fg.png"');
    expect(markup).not.toContain("node-background-image");
  });

  test("clipPath 的矩形以节点中心为原点、按节点尺寸展开", () => {
    const scope = createScope({ resolveNodeImage: () => "a.png" });

    expect(scope.buildNodePreviewImageMarkup(node({ size: { width: 40, height: 30 } }), "c")).toContain(
      '<rect x="-20" y="-15" width="40" height="30" rx="8"/>'
    );
  });
});

describe("createRenderNodePreviewImageContent（React 版）", () => {
  test("母线节点返回 null", () => {
    const scope = createScope({ isBusNode: () => true, resolveNodeImage: () => "a.png" });

    expect(createRenderNodePreviewImageContent(scope)(node(), "clip1")).toBeNull();
  });

  test("无图节点返回 null", () => {
    expect(createRenderNodePreviewImageContent(createScope())(node(), "clip1")).toBeNull();
  });

  test("有图时返回 React 元素树（片段），非字符串", () => {
    const scope = createScope({ resolveNodeImage: () => "a.png" });
    const out = createRenderNodePreviewImageContent(scope)(node(), "clip1");

    expect(typeof out).toBe("object");
    expect(out).not.toBeNull();
  });

  test("显式传入的 imageHref 覆盖节点自取图", () => {
    const resolveNodeImage = vi.fn(() => "node.png");
    const scope = createScope({ resolveNodeImage });

    createRenderNodePreviewImageContent(scope)(node(), "c", { imageHref: "显式.png" });

    expect(resolveNodeImage).not.toHaveBeenCalled();
  });
});
