import { describe, expect, it } from "vitest";
import {
  BUILTIN_SHARED_ICON_ASSETS,
  BUILTIN_SHARED_ICON_FOLDER_ID,
  builtinSharedIconAssetMap,
  isBuiltinSharedIconAssetId,
  mergeBuiltinSharedIconAssets
} from "./sharedIconLibrary";

describe("shared icon library", () => {
  it("provides a substantial built-in SVG icon set for shared pickers", () => {
    expect(BUILTIN_SHARED_ICON_ASSETS.length).toBeGreaterThanOrEqual(140);
    expect(new Set(BUILTIN_SHARED_ICON_ASSETS.map((asset) => asset.id)).size).toBe(BUILTIN_SHARED_ICON_ASSETS.length);
    expect(BUILTIN_SHARED_ICON_ASSETS.every((asset) => asset.folderId === BUILTIN_SHARED_ICON_FOLDER_ID)).toBe(true);
    expect(BUILTIN_SHARED_ICON_ASSETS.every((asset) => asset.mimeType === "image/svg+xml")).toBe(true);
    expect(BUILTIN_SHARED_ICON_ASSETS.every((asset) => asset.url.startsWith("data:image/svg+xml"))).toBe(true);
  });

  it("covers the office-style and common icon categories", () => {
    const names = BUILTIN_SHARED_ICON_ASSETS.map((asset) => asset.name);
    for (const category of [
      "预设/线条",
      "预设/矩形",
      "预设/基本形状",
      "预设/箭头总汇",
      "预设/公式形状",
      "预设/流程图",
      "预设/星与旗帜",
      "预设/标注",
      "预设/动作按钮",
      "基本形状",
      "公式符号",
      "教育教学",
      "标志标识",
      "人像手势",
      "休闲娱乐",
      "动植物",
      "生活用品",
      "天文地理"
    ]) {
      expect(names.some((name) => name.startsWith(`${category} /`))).toBe(true);
    }
  });

  it("uses decodable SVG payloads", () => {
    const sampleAssets = BUILTIN_SHARED_ICON_ASSETS.slice(0, 10);
    for (const asset of sampleAssets) {
      const payload = asset.url.slice(asset.url.indexOf(",") + 1);
      const svgSource = decodeURIComponent(payload);
      expect(svgSource).toContain("<svg");
      expect(svgSource).toContain("</svg>");
      expect(svgSource).toContain("<title>");
    }
  });

  it("merges built-ins ahead of runtime image assets without duplicating ids", () => {
    const duplicatedBuiltin = BUILTIN_SHARED_ICON_ASSETS[0];
    const backendAsset = {
      id: "backend-user-icon",
      name: "后台图片",
      folderId: "root",
      url: "data:image/svg+xml,%3Csvg%2F%3E"
    };
    const merged = mergeBuiltinSharedIconAssets([backendAsset, duplicatedBuiltin]);
    expect(merged[0].id).toBe(duplicatedBuiltin.id);
    expect(merged.some((asset) => asset.id === backendAsset.id)).toBe(true);
    expect(merged.filter((asset) => asset.id === duplicatedBuiltin.id)).toHaveLength(1);
    expect(isBuiltinSharedIconAssetId(duplicatedBuiltin.id)).toBe(true);
    expect(builtinSharedIconAssetMap()[duplicatedBuiltin.id]).toBe(duplicatedBuiltin.url);
  });
});
