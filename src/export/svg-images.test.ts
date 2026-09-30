// SVG 导出「被引用后端图片」的收集口径。
//
// 这个模块此前零测试，而它是导出链路上决定**哪些图片会被内联进产物**的唯一入口：
// 前端 .tsx 工厂与 server/svgExport.mjs（Node 原生直载）共用这一份单源。
// 漏收一张图 = 导出的 SVG 断图；多收一张 = 产物白白变大。两个方向都不报错。
import { describe, expect, test } from "vitest";
import type { ModelNode } from "../model.ts";
import { API_PREFIX } from "../config.ts";
import { collectSvgExportReferencedImageHrefById } from "./svg-images.ts";

const node = (params: Record<string, string>, kind = "ac-load"): ModelNode =>
  ({ id: "n1", kind, name: "n1", params, terminals: [] }) as unknown as ModelNode;

const href = (id: string) => `${API_PREFIX}/images/${encodeURIComponent(id)}`;

describe("collectSvgExportReferencedImageHrefById / assetId", () => {
  test("assetId 统一拼成带前缀的 /images 路径，且做 URL 编码", () => {
    const map = collectSvgExportReferencedImageHrefById({
      nodes: [node({ backgroundImageAssetId: "a b.png", foregroundImageAssetId: "c.png" })]
    });
    expect(map.get("a b.png")).toBe(`${API_PREFIX}/images/a%20b.png`);
    expect(map.get("c.png")).toBe(`${API_PREFIX}/images/c.png`);
  });

  test("空/空白 assetId 不进 map", () => {
    const map = collectSvgExportReferencedImageHrefById({
      nodes: [node({ backgroundImageAssetId: "", foregroundImageAssetId: "   " })]
    });
    expect(map.size).toBe(0);
  });

  test("undefined params 字段安全", () => {
    expect(collectSvgExportReferencedImageHrefById({ nodes: [node({})] }).size).toBe(0);
    expect(collectSvgExportReferencedImageHrefById({}).size).toBe(0);
  });
});

describe("collectSvgExportReferencedImageHrefById / href", () => {
  test("后端图片 href 原样保留（内联时要按原路径回查）", () => {
    const map = collectSvgExportReferencedImageHrefById({
      nodes: [node({ backgroundImage: href("bg1"), foregroundImage: href("fg1") })]
    });
    expect(map.get("bg1")).toBe(href("bg1"));
    expect(map.get("fg1")).toBe(href("fg1"));
  });

  test("非后端来源（data URL / 外链）不进 map", () => {
    const map = collectSvgExportReferencedImageHrefById({
      nodes: [node({ backgroundImage: "data:image/png;base64,AAAA", foregroundImage: "https://cdn.example.com/a.png" })]
    });
    expect(map.size).toBe(0);
  });

  test("URL 编码的 id 被解码后作为 key", () => {
    const map = collectSvgExportReferencedImageHrefById({ nodes: [node({ backgroundImage: href("a b.png") })] });
    expect([...map.keys()]).toEqual(["a b.png"]);
    expect(map.get("a b.png")).toBe(href("a b.png"));
  });
});

describe("collectSvgExportReferencedImageHrefById / 嵌套 SVG 引用", () => {
  // 内联 SVG 里还能再引用后端图片；不递归收集，导出会留下断链。
  test("内联 SVG 里的嵌套 href 一并收集", () => {
    const inner = `<svg xmlns="http://www.w3.org/2000/svg"><image href="${href("nested")}"/></svg>`;
    const map = collectSvgExportReferencedImageHrefById({
      nodes: [node({ backgroundImage: `data:image/svg+xml;base64,${Buffer.from(inner).toString("base64")}` })]
    });
    expect(map.get("nested")).toBe(href("nested"));
  });

  test("未编码的 data:image/svg+xml 同样能递归", () => {
    const inner = `<svg><image xlink:href="${href("nested2")}"/></svg>`;
    const map = collectSvgExportReferencedImageHrefById({
      nodes: [node({ backgroundImage: `data:image/svg+xml,${encodeURIComponent(inner)}` })]
    });
    expect(map.get("nested2")).toBe(href("nested2"));
  });

  test("裸 <svg> 文本（非 data URL）也解析", () => {
    const inner = `<svg><image href="${href("nested3")}"/></svg>`;
    const map = collectSvgExportReferencedImageHrefById({ nodes: [node({ backgroundImage: inner })] });
    expect(map.get("nested3")).toBe(href("nested3"));
  });
});

describe("collectSvgExportReferencedImageHrefById / 去重", () => {
  test("同一 id 多次出现只保留第一次出现的 href", () => {
    const map = collectSvgExportReferencedImageHrefById({
      nodes: [
        node({ backgroundImage: href("dup") }),
        node({ foregroundImage: `${href("dup")}?v=2` })
      ]
    });
    expect([...map.keys()]).toEqual(["dup"]);
    expect(map.get("dup")).toBe(href("dup"));
  });

  test("assetId 先入，后续同 id 的 href 不覆盖它", () => {
    const map = collectSvgExportReferencedImageHrefById({
      canvasBackgroundImageAssetId: "same",
      canvasBackgroundImage: href("same")
    });
    expect(map.get("same")).toBe(`${API_PREFIX}/images/same`);
  });
});

describe("collectSvgExportReferencedImageHrefById / 画布与背景页", () => {
  test("画布背景三个来源都收", () => {
    const map = collectSvgExportReferencedImageHrefById({
      canvasBackgroundImageAssetId: "cbAsset",
      canvasBackgroundImage: href("cb"),
      canvasBackgroundImageUrl: href("cbUrl")
    });
    expect([...map.keys()].sort()).toEqual(["cb", "cbAsset", "cbUrl"]);
  });

  test("背景页节点优先于 project 节点（两者都给时只取前者）", () => {
    const map = collectSvgExportReferencedImageHrefById({
      backgroundPage: {
        backgroundImageUrl: href("bpUrl"),
        nodes: [node({ backgroundImageAssetId: "fromNodes" })],
        project: { canvasBackgroundImage: href("projBg"), nodes: [node({ backgroundImageAssetId: "fromProject" })] }
      }
    });
    expect(map.has("fromNodes")).toBe(true);
    expect(map.has("fromProject")).toBe(false);
    expect(map.get("bpUrl")).toBe(href("bpUrl"));
    expect(map.get("projBg")).toBe(href("projBg"));
  });

  test("背景页无 nodes 时回退到 project.nodes", () => {
    const map = collectSvgExportReferencedImageHrefById({
      backgroundPage: { nodes: undefined, project: { nodes: [node({ backgroundImageAssetId: "fromProject" })] } }
    });
    expect(map.get("fromProject")).toBe(`${API_PREFIX}/images/fromProject`);
  });
});

describe("collectSvgExportReferencedImageHrefById / 状态图标", () => {
  test("命中模板且解析出状态图标时收进 map", () => {
    const map = collectSvgExportReferencedImageHrefById({
      nodes: [node({ state: "closed" }, "ac-breaker")],
      libraryTemplateByKind: new Map([["ac-breaker", { kind: "ac-breaker", label: "断路器" } as never]]),
      resolveDeviceStateVisual: () => ({ kind: "closed" }) as never,
      resolveStateVisualImageHref: () => href("stateIcon")
    });
    expect(map.get("stateIcon")).toBe(href("stateIcon"));
  });

  test("无对应模板时不解状态（避免把无关图标全收进来）", () => {
    let called = 0;
    collectSvgExportReferencedImageHrefById({
      nodes: [node({}, "unknown-kind")],
      resolveDeviceStateVisual: () => {
        called += 1;
        return null;
      },
      resolveStateVisualImageHref: () => href("never")
    });
    expect(called).toBe(0);
  });

  test("状态图标为空时静默跳过", () => {
    const map = collectSvgExportReferencedImageHrefById({
      nodes: [node({}, "ac-breaker")],
      libraryTemplateByKind: new Map([["ac-breaker", { kind: "ac-breaker", label: "断路器" } as never]]),
      resolveDeviceStateVisual: () => null,
      resolveStateVisualImageHref: () => ""
    });
    expect(map.size).toBe(0);
  });
});
