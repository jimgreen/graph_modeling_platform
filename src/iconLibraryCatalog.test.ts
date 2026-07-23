import { describe, expect, test } from "vitest";

import {
  filterIconLibraryIcons,
  fetchIconLibraryCatalog,
  fetchIconLibraryManifest,
  flattenIconLibraryManifest,
  iconLibraryCategoriesForSelection,
  iconLibraryCategoryKey,
  iconLibraryIconUrl,
  visibleIconLibraryIcons,
  type IconLibraryCatalog,
  type IconLibraryManifest
} from "./iconLibraryCatalog";

const catalog: IconLibraryCatalog = {
  name: "icon-library",
  label: "SVG 图标资源总库",
  totalIcons: 3,
  libraries: [
    {
      id: "docer-free-compatible",
      label: "稻壳兼容",
      root: "/icon-library/docer-free-compatible",
      totalIcons: 2,
      categories: [
        { id: "electric-power", label: "电力设备", count: 2 },
        { id: "storage", label: "储能", count: 0 }
      ]
    },
    {
      id: "open-source-svg",
      label: "开源 SVG",
      root: "/icon-library/open-source-svg",
      totalIcons: 1,
      categories: [{ id: "weather", label: "气象", count: 1 }]
    }
  ]
};

const manifest: IconLibraryManifest = {
  name: "docer-free-compatible",
  label: "稻壳兼容",
  root: "/icon-library/docer-free-compatible",
  categories: [
    {
      id: "electric-power",
      label: "电力设备",
      icons: [
        { id: "ac-source", name: "交流电源", file: "electric-power/ac-source.svg", tags: ["AC", "source"] },
        { id: "busbar", name: "母线", file: "electric-power/busbar.svg", tags: ["bus"] }
      ]
    }
  ]
};

const htmlResponseFetcher = async () =>
  new Response("<!doctype html><html><body>dev server fallback</body></html>", {
    status: 200,
    headers: { "content-type": "text/html; charset=utf-8" }
  });

const errorMessageFrom = async (action: () => Promise<unknown>) => {
  try {
    await action();
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
  throw new Error("Expected action to throw.");
};

describe("icon library catalog utilities", () => {
  test("builds stable category keys and root-relative icon urls", () => {
    expect(iconLibraryCategoryKey("docer-free-compatible", "electric-power")).toBe("docer-free-compatible::electric-power");
    expect(iconLibraryIconUrl("/webgrp/icon-library/docer-free-compatible/", "electric-power/ac source.svg")).toBe(
      "/webgrp/icon-library/docer-free-compatible/electric-power/ac%20source.svg"
    );
  });

  test("flattens manifests into searchable browser icons", () => {
    const icons = flattenIconLibraryManifest(manifest, catalog.libraries[0]);

    expect(icons).toHaveLength(2);
    expect(icons[0]).toMatchObject({
      id: "docer-free-compatible:electric-power:ac-source:electric-power/ac-source.svg",
      libraryId: "docer-free-compatible",
      categoryKey: "docer-free-compatible::electric-power",
      categoryLabel: "电力设备",
      url: "/webgrp/icon-library/docer-free-compatible/electric-power/ac-source.svg"
    });
    expect(icons[0].searchText).toContain("交流电源");
    expect(icons[0].searchText).toContain("source");
  });

  test("includes merged source metadata in icon search text", () => {
    const icons = flattenIconLibraryManifest(
      {
        name: "open-source-svg",
        label: "开源 SVG",
        root: "/icon-library/open-source-svg",
        categories: [
          {
            id: "commands",
            label: "常用命令",
            icons: [
              {
                id: "office-add",
                name: "Add",
                file: "merged/office-fluent-compatible/commands/add.svg",
                sourceId: "office-fluent-compatible",
                sourceLabel: "Office Fluent 兼容图标库",
                originalLibraryId: "office-fluent-compatible",
                originalLibraryLabel: "Office Fluent 兼容图标库"
              } as any
            ]
          }
        ]
      },
      {
        id: "open-source-svg",
        label: "开源 SVG",
        root: "/icon-library/open-source-svg"
      }
    );

    expect(icons[0].searchText).toContain("office-fluent-compatible");
    expect(icons[0].searchText).toContain("office fluent 兼容图标库");
  });

  test("lists categories for all libraries or one selected library", () => {
    expect(iconLibraryCategoriesForSelection(catalog, "docer-free-compatible").map((category) => category.label)).toEqual([
      "电力设备",
      "储能"
    ]);
    expect(iconLibraryCategoriesForSelection(catalog, "").map((category) => category.label)).toEqual([
      "稻壳兼容 / 电力设备",
      "稻壳兼容 / 储能",
      "开源 SVG / 气象"
    ]);
  });

  test("filters by library, category and multi-token search then paginates", () => {
    const icons = [
      ...flattenIconLibraryManifest(manifest, catalog.libraries[0]),
      {
        ...flattenIconLibraryManifest(
          {
            name: "open-source-svg",
            label: "开源 SVG",
            root: "/icon-library/open-source-svg",
            categories: [{ id: "weather", label: "气象", icons: [{ id: "cloud", name: "云", file: "weather/cloud.svg", tags: ["weather"] }] }]
          },
          catalog.libraries[1]
        )[0]
      }
    ];

    expect(filterIconLibraryIcons(icons, { libraryId: "docer-free-compatible", categoryKey: "", query: "电源 ac" }).map((icon) => icon.id)).toEqual([
      "docer-free-compatible:electric-power:ac-source:electric-power/ac-source.svg"
    ]);
    expect(filterIconLibraryIcons(icons, { libraryId: "", categoryKey: "open-source-svg::weather", query: "" }).map((icon) => icon.id)).toEqual([
      "open-source-svg:weather:cloud:weather/cloud.svg"
    ]);

    const result = visibleIconLibraryIcons(icons, { libraryId: "", categoryKey: "", query: "" }, 2);
    expect(result.total).toBe(3);
    expect(result.visible).toHaveLength(2);
    expect(result.hasMore).toBe(true);
  });

  test("reports a clear error when the catalog endpoint returns HTML instead of JSON", async () => {
    const message = await errorMessageFrom(() => fetchIconLibraryCatalog(htmlResponseFetcher as typeof fetch));

    expect(message).toContain("读取分类图标库失败。");
    expect(message).toContain("返回了 HTML 页面");
    expect(message).toContain("/webgrp/icon-library/catalog.json");
    expect(message).not.toContain("Unexpected token");
  });

  test("reports a clear error when a manifest endpoint returns HTML instead of JSON", async () => {
    const message = await errorMessageFrom(() => fetchIconLibraryManifest(catalog.libraries[0], htmlResponseFetcher as typeof fetch));

    expect(message).toContain("读取“稻壳兼容”图标清单失败。");
    expect(message).toContain("返回了 HTML 页面");
    expect(message).toContain("/webgrp/icon-library/docer-free-compatible/manifest.json");
    expect(message).not.toContain("Unexpected token");
  });
});
