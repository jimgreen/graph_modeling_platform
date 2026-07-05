import { describe, expect, test } from "vitest";

import {
  imagePickerAssetIsBuiltinIcon,
  imagePickerAssetsForLibraryTab,
  imagePickerUsesLibraryTabs,
  type ImagePickerLibraryTab
} from "./appExtracted/appView";

const ids = (assets: Array<{ id: string }>) => assets.map((asset) => asset.id);

describe("image picker library helpers", () => {
  test("separates backend images from builtin icon assets", () => {
    const assets = [
      { id: "image-1", name: "地图背景", folderId: "root", mimeType: "image/png" },
      { id: "svg-image-1", name: "拓扑背景", folderId: "root", filename: "map.svg", mimeType: "image/svg+xml" },
      { id: "builtin-shared-icon-001-line", name: "预设 / 直线", folderId: "builtin-shared-icons", createdAt: "builtin", mimeType: "image/svg+xml" }
    ];

    expect(ids(imagePickerAssetsForLibraryTab(assets, "image"))).toEqual(["image-1", "svg-image-1"]);
    expect(ids(imagePickerAssetsForLibraryTab(assets, "icon"))).toEqual(["builtin-shared-icon-001-line"]);
    expect(imagePickerAssetIsBuiltinIcon(assets[2])).toBe(true);
  });

  test("enables image/icon tabs only for ordinary image targets", () => {
    expect(imagePickerUsesLibraryTabs({ kind: "canvas" })).toBe(true);
    expect(imagePickerUsesLibraryTabs({ kind: "nodeForeground", nodeId: "node-1" })).toBe(true);
    expect(imagePickerUsesLibraryTabs({ kind: "stateIconFrameBackground" })).toBe(true);
    expect(imagePickerUsesLibraryTabs({ kind: "canvasIcon" })).toBe(false);
    expect(imagePickerUsesLibraryTabs({ kind: "stateIconDrawing" })).toBe(false);
    expect(imagePickerUsesLibraryTabs(null)).toBe(false);
  });

  test("keeps the tab type explicit", () => {
    const tab: ImagePickerLibraryTab = "image";
    expect(tab).toBe("image");
  });
});
