import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import { DEVICE_LIBRARY_BY_KIND } from "./model";
import { DeviceGlyph } from "./DeviceGlyph";
import { buildDeviceLibraryPreview, reorderDeviceLibraryKeys } from "./DeviceLibraryDisplayDialog";

describe("DeviceLibraryDisplayDialog 图元预览", () => {
  test("容器图元缩略预览不应被固定视口裁空", () => {
    const template = DEVICE_LIBRARY_BY_KIND.get("ac-switch-box");
    expect(template).toBeTruthy();
    const preview = buildDeviceLibraryPreview(template!);
    const html = renderToStaticMarkup(createElement("svg", { viewBox: "-60 -45 120 90" }, createElement("g", { transform: `scale(${preview.scale})` }, createElement(DeviceGlyph, {
      node: preview.node,
      miniature: preview.miniature,
      mode: "geometry"
    }))));

    expect(html).toContain("ac-container-stroke-hit");
    expect(html).toContain('transform="scale(2)"');
    expect(html).toContain('width="58"');
    expect(html).toContain('height="38"');
  });

  test("具体图元支持同一类内拖动排序", () => {
    expect(reorderDeviceLibraryKeys(["a", "b", "c"], "c", "a", true)).toEqual(["c", "a", "b"]);
    expect(reorderDeviceLibraryKeys(["a", "b", "c"], "a", "c", false)).toEqual(["b", "c", "a"]);
  });
});
