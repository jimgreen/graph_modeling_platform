import { afterEach, describe, expect, test, vi } from "vitest";

import { frontendPath } from "./config";
import {
  createInitialIconLibraryPickerState,
  filterIconLibraryIcons,
  fetchIconLibraryCatalog,
  fetchIconLibraryManifest,
  flattenIconLibraryManifest,
  iconLibraryCategoriesForSelection,
  iconLibraryCategoryKey,
  iconLibraryIconUrl,
  iconLibraryManifestUrl,
  visibleIconLibraryIcons,
  ICON_LIBRARY_PAGE_SIZE,
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
    expect(iconLibraryIconUrl("/icon-library/docer-free-compatible/", "electric-power/ac source.svg")).toBe(
      "/icon-library/docer-free-compatible/electric-power/ac%20source.svg"
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
      url: "/icon-library/docer-free-compatible/electric-power/ac-source.svg"
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
    expect(message).toContain("/icon-library/catalog.json");
    expect(message).not.toContain("Unexpected token");
  });

  test("reports a clear error when a manifest endpoint returns HTML instead of JSON", async () => {
    const message = await errorMessageFrom(() => fetchIconLibraryManifest(catalog.libraries[0], htmlResponseFetcher as typeof fetch));

    expect(message).toContain("读取“稻壳兼容”图标清单失败。");
    expect(message).toContain("返回了 HTML 页面");
    expect(message).toContain("/icon-library/docer-free-compatible/manifest.json");
    expect(message).not.toContain("Unexpected token");
  });
});

// ---------------------------------------------------------------------------
// normalizeRoot / iconLibraryManifestUrl：manifest 地址怎么从 catalog 推出来
// ---------------------------------------------------------------------------

describe("icon library manifest 地址推导", () => {
  test("root 为空时按库 id 兜底", () => {
    expect(iconLibraryManifestUrl({ id: "open-source-svg", root: "" }))
      .toBe(`${frontendPath("/icon-library/open-source-svg")}/manifest.json`);
  });

  test("root 不是绝对路径时同样按库 id 兜底（不把相对路径直接拼进 URL）", () => {
    // catalog.json 里写 "icon-library/xxx" 这类相对 root 时，直接拼会得到
    // "icon-library/xxx/manifest.json"，浏览器按当前路由解析，多半 404
    expect(iconLibraryManifestUrl({ id: "open-source-svg", root: "icon-library/open-source-svg" }))
      .toBe(`${frontendPath("/icon-library/open-source-svg")}/manifest.json`);
  });

  test("root 末尾多个斜杠只留一个分隔符", () => {
    expect(iconLibraryManifestUrl({ id: "open-source-svg", root: "/icon-library/open-source-svg///" }))
      .toBe(`${frontendPath("/icon-library/open-source-svg")}/manifest.json`);
  });
});

// ---------------------------------------------------------------------------
// visibleIconLibraryIcons：visibleCount 的归一
// ---------------------------------------------------------------------------

describe("visibleIconLibraryIcons 的分页归一", () => {
  const icons = flattenIconLibraryManifest(manifest, catalog.libraries[0]);
  const filter = { libraryId: "", categoryKey: "", query: "" };

  test("省略 visibleCount 时用页大小常量", () => {
    expect(visibleIconLibraryIcons(icons, filter).visible).toHaveLength(Math.min(icons.length, ICON_LIBRARY_PAGE_SIZE));
  });

  test("小数向下取整", () => {
    expect(visibleIconLibraryIcons(icons, filter, 1.9).visible).toHaveLength(1);
  });

  // 变异验证补记：`Math.floor` 去掉后仍然全绿 —— `Array.prototype.slice` 自身就会把
  // 1.9 截成 1。属等价变异，别把它当成「取整有覆盖」的证据。

  test("0 视为「没传」，回落到页大小（`Number(x) || 默认值` 的既有口径）", () => {
    expect(visibleIconLibraryIcons(icons, filter, 0).visible).toHaveLength(Math.min(icons.length, ICON_LIBRARY_PAGE_SIZE));
  });

  test("NaN 同样回落到页大小", () => {
    expect(visibleIconLibraryIcons(icons, filter, Number.NaN).visible)
      .toHaveLength(Math.min(icons.length, ICON_LIBRARY_PAGE_SIZE));
  });

  test("负数被抬到 1（不返回空列表，否则界面会卡在「没有更多」且无法翻回）", () => {
    expect(visibleIconLibraryIcons(icons, filter, -5).visible).toHaveLength(1);
  });

  test("恰好取完时 hasMore 为 false", () => {
    const result = visibleIconLibraryIcons(icons, filter, icons.length);
    expect(result.total).toBe(2);
    expect(result.hasMore).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 搜索与分类清单的边界
// ---------------------------------------------------------------------------

describe("图标检索边界", () => {
  const icons = flattenIconLibraryManifest(manifest, catalog.libraries[0]);

  test("查询大小写不敏感（searchText 建库时已小写化）", () => {
    expect(filterIconLibraryIcons(icons, { libraryId: "", categoryKey: "", query: "AC" }).map((icon) => icon.iconId))
      .toEqual(["ac-source"]);
  });

  test("纯空白的查询等价于不筛选（不产生空 token 把结果全滤掉）", () => {
    expect(filterIconLibraryIcons(icons, { libraryId: "", categoryKey: "", query: "   " })).toHaveLength(2);
  });

  // 变异验证补记：`.filter(Boolean)` 删掉后仍然全绿 —— `"".includes("")` 恒为 true，
  // 留下的那个空 token 不筛掉任何东西。属等价变异，不是这条测试没守住。

  test("多 token 是「与」关系，任一不命中就整条出局", () => {
    // 「交流」只出现在 ac-source 上、「母线」只出现在 busbar 上，同一条命不中两个
    expect(filterIconLibraryIcons(icons, { libraryId: "", categoryKey: "", query: "交流 母线" })).toHaveLength(0);
    // 两个 token 都来自同一条（id + 分类 id）时才留下
    expect(filterIconLibraryIcons(icons, { libraryId: "", categoryKey: "", query: "ac electric" }).map((icon) => icon.iconId))
      .toEqual(["ac-source"]);
  });

  test("分类清单在未选库时把库名拼进 label，选中后只留分类名", () => {
    const all = iconLibraryCategoriesForSelection(catalog, "");
    const one = iconLibraryCategoriesForSelection(catalog, "open-source-svg");
    expect(all.map((category) => category.key)).toEqual([
      "docer-free-compatible::electric-power",
      "docer-free-compatible::storage",
      "open-source-svg::weather"
    ]);
    expect(one.map((category) => category.label)).toEqual(["气象"]);
  });

  test("catalog 为 null 时返回空数组，不抛", () => {
    expect(iconLibraryCategoriesForSelection(null, "")).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// flattenIconLibraryManifest 的缺省兜底
// ---------------------------------------------------------------------------

describe("flattenIconLibraryManifest 的缺省兜底", () => {
  test("不传 libraryMeta 时库 id 取自 manifest.name，库名再退到 id", () => {
    const icons = flattenIconLibraryManifest({ name: "solo-lib", root: "/icon-library/solo-lib", categories: [] });
    expect(icons).toEqual([]);

    const withIcons = flattenIconLibraryManifest({
      name: "solo-lib",
      root: "/icon-library/solo-lib",
      categories: [{ id: "cat", label: "分类", icons: [{ id: "only-icon", name: "", file: "cat/only.svg" }] }]
    });
    expect(withIcons[0].libraryId).toBe("solo-lib");
    expect(withIcons[0].libraryLabel).toBe("solo-lib");
  });

  test("manifest.label 优先于库 id 作为展示名", () => {
    const icons = flattenIconLibraryManifest({
      name: "solo-lib",
      label: "单库",
      root: "/icon-library/solo-lib",
      categories: [{ id: "cat", label: "分类", icons: [{ id: "only-icon", name: "", file: "cat/only.svg" }] }]
    });
    expect(icons[0].libraryLabel).toBe("单库");
  });

  test("图标 name 为空串时退回 icon.id；tags 不是数组时退回空数组", () => {
    const icons = flattenIconLibraryManifest({
      name: "solo-lib",
      root: "/icon-library/solo-lib",
      categories: [
        {
          id: "cat",
          label: "分类",
          icons: [{ id: "fallback-name", name: "", file: "cat/fallback.svg", tags: "不是数组" as never }]
        }
      ]
    });
    expect(icons[0].name).toBe("fallback-name");
    expect(icons[0].tags).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// 选择器初始状态
// ---------------------------------------------------------------------------

describe("createInitialIconLibraryPickerState", () => {
  test("初始可见条数 = 页大小常量，其余字段全空", () => {
    const state = createInitialIconLibraryPickerState();
    expect(state).toEqual({
      status: "idle",
      error: "",
      catalog: null,
      entries: [],
      selectedLibraryId: "",
      selectedCategoryKey: "",
      searchQuery: "",
      visibleCount: ICON_LIBRARY_PAGE_SIZE,
      loadedLibraryIds: [],
      loadingLibraryIds: []
    });
  });

  test("每次调用返回新对象（数组不是共享引用，上一次的改动不会漏到下一次）", () => {
    const first = createInitialIconLibraryPickerState();
    first.entries.push({} as never);
    first.loadedLibraryIds.push("x");
    const second = createInitialIconLibraryPickerState();
    expect(second.entries).toHaveLength(0);
    expect(second.loadedLibraryIds).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 缓存层：localStorage → 内存 → 网络
// ---------------------------------------------------------------------------

// 缓存键是模块内的 const，没导出。这里写死字面量是故意的：改键等于让所有已部署的
// 客户端缓存一次性作废，属于需要被看见的变更，不该悄悄改掉而无人察觉。
const CATALOG_CACHE_KEY = "graph-modeling-platform:icon-library:catalog:v2";
const MANIFEST_CACHE_KEY = "graph-modeling-platform:icon-library:manifest:v2:docer-free-compatible";

const installFakeStorageWindow = () => {
  const store = new Map<string, string>();
  const storage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => { store.set(key, value); },
    removeItem: (key: string) => { store.delete(key); }
  };
  (globalThis as { window?: unknown }).window = { localStorage: storage, sessionStorage: storage };
  return store;
};

const jsonFetcher = (payload: unknown, onCall?: () => void) => async () => {
  onCall?.();
  return new Response(JSON.stringify(payload), { status: 200, headers: { "content-type": "application/json" } });
};

describe("图标库缓存层", () => {
  afterEach(() => {
    delete (globalThis as { window?: unknown }).window;
    vi.resetModules();
  });

  test("localStorage 命中时不再发请求", async () => {
    const store = installFakeStorageWindow();
    store.set(CATALOG_CACHE_KEY, JSON.stringify(catalog));
    const mod = await import("./iconLibraryCatalog");
    let calls = 0;
    const result = await mod.fetchIconLibraryCatalog(jsonFetcher({ name: "empty", libraries: [] }, () => { calls += 1; }) as typeof fetch);
    expect(calls).toBe(0);
    expect(result).toEqual(catalog);
  });

  test("缓存结构不合法时丢弃该条并回源，成功后用新内容覆盖缓存", async () => {
    const store = installFakeStorageWindow();
    store.set(CATALOG_CACHE_KEY, JSON.stringify({ name: "icon-library" }));
    const mod = await import("./iconLibraryCatalog");
    let calls = 0;
    const result = await mod.fetchIconLibraryCatalog(jsonFetcher(catalog, () => { calls += 1; }) as typeof fetch);
    expect(calls).toBe(1);
    expect(result).toEqual(catalog);
    expect(JSON.parse(store.get(CATALOG_CACHE_KEY)!)).toEqual(catalog);
  });

  test("缓存里 libraries 为空数组算未命中（空目录不该被永久缓存成空）", async () => {
    const store = installFakeStorageWindow();
    store.set(CATALOG_CACHE_KEY, JSON.stringify({ name: "icon-library", libraries: [] }));
    const mod = await import("./iconLibraryCatalog");
    let calls = 0;
    await mod.fetchIconLibraryCatalog(jsonFetcher(catalog, () => { calls += 1; }) as typeof fetch);
    expect(calls).toBe(1);
  });

  test("缓存里某个库缺 id 或缺 categories 时整条丢弃，不做部分信任", async () => {
    // 只查 libraries 是不是数组是不够的：一条畸形记录会让上层拿到 undefined 的
    // categories 再去 .map，直接在渲染时炸。宁可整份缓存作废回源。
    const store = installFakeStorageWindow();
    store.set(CATALOG_CACHE_KEY, JSON.stringify({
      name: "icon-library",
      libraries: [{ id: "ok-lib", label: "好库", root: "/icon-library/ok-lib", categories: [] }, { label: "缺 id" }]
    }));
    const mod = await import("./iconLibraryCatalog");
    let calls = 0;
    const result = await mod.fetchIconLibraryCatalog(jsonFetcher(catalog, () => { calls += 1; }) as typeof fetch);
    expect(calls).toBe(1);
    expect(result).toEqual(catalog);
  });

  test("并发拉取只发一次请求，两次调用拿到同一份结果", async () => {
    installFakeStorageWindow();
    const mod = await import("./iconLibraryCatalog");
    let calls = 0;
    const fetcher = jsonFetcher(catalog, () => { calls += 1; }) as typeof fetch;
    const [left, right] = await Promise.all([
      mod.fetchIconLibraryCatalog(fetcher),
      mod.fetchIconLibraryCatalog(fetcher)
    ]);
    expect(calls).toBe(1);
    expect(left).toBe(right);
  });

  test("manifest 缓存按库 id 分键，不会串到别的库", async () => {
    const store = installFakeStorageWindow();
    store.set(MANIFEST_CACHE_KEY, JSON.stringify(manifest));
    const mod = await import("./iconLibraryCatalog");
    let calls = 0;
    const fetcher = jsonFetcher({ name: "other", root: "/icon-library/other", categories: [] }, () => { calls += 1; }) as typeof fetch;

    expect(await mod.fetchIconLibraryManifest(catalog.libraries[0], fetcher)).toEqual(manifest);
    expect(calls).toBe(0);

    const other = await mod.fetchIconLibraryManifest(catalog.libraries[1], fetcher);
    expect(calls).toBe(1);
    expect(other.name).toBe("other");
  });

  test("非 2xx 的错误信息带上状态码与 content-type，且不误报成解析问题", async () => {
    installFakeStorageWindow();
    const mod = await import("./iconLibraryCatalog");
    const failing = async () => new Response("boom", { status: 503, headers: { "content-type": "text/plain" } });
    const message = await errorMessageFrom(() => mod.fetchIconLibraryCatalog(failing as typeof fetch));
    expect(message).toContain("读取分类图标库失败。");
    expect(message).toContain("状态：503");
    expect(message).toContain("类型：text/plain");
    // 503 的正文是纯文本，如果只断言「有报错」，把 ok 判断删掉后正文会被当成
    // 坏 JSON 报出来 —— 排查方向完全错。这里钉住「不误报」这一半。
    expect(message).not.toContain("不是有效 JSON");
    expect(message).not.toContain("返回了 HTML 页面");
  });

  test("既不是 HTML 也不是 JSON 时的报错不暴露原始解析异常", async () => {
    installFakeStorageWindow();
    const mod = await import("./iconLibraryCatalog");
    const garbage = async () => new Response("not json at all", { status: 200, headers: { "content-type": "text/plain" } });
    const message = await errorMessageFrom(() => mod.fetchIconLibraryCatalog(garbage as typeof fetch));
    expect(message).toContain("不是有效 JSON");
    expect(message).not.toContain("Unexpected token");
  });
});

// ---------------------------------------------------------------------------
// readCacheJson / browserCacheStorages：多 storage 遍历与逐个降级
// ---------------------------------------------------------------------------
//
// 上面 installFakeStorageWindow 把 localStorage 与 sessionStorage 指向**同一个**
// 对象，于是 browserCacheStorages 里的 `sessionStorage !== storages[0]` 判否，
// 实际只登记了一个 storage —— 整个 for 循环的「换一个后端再试」从未被执行过。
// 下面用两个**互不相同**的假 storage 把这条路径真正跑起来。
//
// 注意这里断言的是可观测行为（拿到哪个 storage 的内容、回源与否），不是内部调用
// 次数本身 —— 之所以还额外钉住 getItem 的调用，是因为「首个 storage 抛错」与
// 「两个 storage 都没这条键」在返回值上都是回源，只有 getItem 各自是 throw 还是
// return null 才能把这两条路径区分开（下面两条用例成对出现，别单独删一条）。

const makeFailingStorage = () => {
  const store = new Map<string, string>();
  return {
    store,
    getItem: vi.fn(() => {
      throw new Error("storage blocked");
    }),
    setItem: vi.fn(() => {
      throw new Error("storage blocked");
    }),
    removeItem: vi.fn(() => {
      throw new Error("storage blocked");
    })
  };
};

const makeStorage = (entries: Record<string, string> = {}) => {
  const store = new Map<string, string>(Object.entries(entries));
  return {
    store,
    getItem: vi.fn((key: string) => store.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store.set(key, value);
    }),
    removeItem: vi.fn((key: string) => {
      store.delete(key);
    })
  };
};

const installStorages = (local: unknown, session: unknown) => {
  (globalThis as { window?: unknown }).window = { localStorage: local, sessionStorage: session };
};

describe("readCacheJson 的多 storage 遍历与降级", () => {
  const networkManifest: IconLibraryManifest = {
    name: "docer-free-compatible",
    label: "稻壳兼容",
    root: "/icon-library/docer-free-compatible",
    categories: [{ id: "weather", label: "气象", icons: [{ id: "sun", name: "晴", file: "weather/sun.svg" }] }]
  };

  afterEach(() => {
    delete (globalThis as { window?: unknown }).window;
    vi.restoreAllMocks();
    vi.resetModules();
  });

  test("首个 storage 的 getItem 抛错时继续试下一个 storage，而不是直接判定缓存未命中", async () => {
    const broken = makeFailingStorage();
    const backup = makeStorage({ [MANIFEST_CACHE_KEY]: JSON.stringify(manifest) });
    installStorages(broken, backup);
    const mod = await import("./iconLibraryCatalog");
    const fetcher = vi.fn(jsonFetcher({ name: "network", root: "/icon-library/network", categories: [] }));

    const result = await mod.fetchIconLibraryManifest(catalog.libraries[0], fetcher as unknown as typeof fetch);

    expect(result).toEqual(manifest);
    expect(broken.getItem).toHaveBeenCalledWith(MANIFEST_CACHE_KEY);
    expect(backup.getItem).toHaveBeenCalledWith(MANIFEST_CACHE_KEY);
    expect(fetcher).not.toHaveBeenCalled();
  });

  test("所有 storage 的 getItem 都抛错时按未命中处理并回源，storage 异常不外泄", async () => {
    const brokenLocal = makeFailingStorage();
    const brokenSession = makeFailingStorage();
    installStorages(brokenLocal, brokenSession);
    const mod = await import("./iconLibraryCatalog");
    const fetcher = vi.fn(jsonFetcher(networkManifest));

    const result = await mod.fetchIconLibraryManifest(catalog.libraries[0], fetcher as unknown as typeof fetch);

    expect(result).toEqual(networkManifest);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(brokenLocal.getItem).toHaveBeenCalledTimes(1);
    expect(brokenSession.getItem).toHaveBeenCalledTimes(1);
    // 回源成功后要写缓存；写不进去同样不许抛（配额/隐私模式下的常见形态）
    expect(brokenLocal.setItem).toHaveBeenCalledTimes(1);
    expect(brokenSession.setItem).toHaveBeenCalledTimes(1);
  });

  test("所有 storage 都没有该键时也按未命中处理，但 getItem 是正常返回 null 而非抛错", async () => {
    const local = makeStorage();
    const session = makeStorage();
    installStorages(local, session);
    const mod = await import("./iconLibraryCatalog");
    const fetcher = vi.fn(jsonFetcher(networkManifest));

    const result = await mod.fetchIconLibraryManifest(catalog.libraries[0], fetcher as unknown as typeof fetch);

    expect(result).toEqual(networkManifest);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(local.getItem).toHaveReturnedWith(null);
    expect(session.getItem).toHaveReturnedWith(null);
  });

  test("首个 storage 里是坏 JSON 时同样回退到下一个 storage，且不触发 removeItem 清理", async () => {
    const broken = makeStorage({ [MANIFEST_CACHE_KEY]: "{这不是 JSON" });
    const backup = makeStorage({ [MANIFEST_CACHE_KEY]: JSON.stringify(manifest) });
    installStorages(broken, backup);
    const mod = await import("./iconLibraryCatalog");
    const fetcher = vi.fn(jsonFetcher({ name: "network", root: "/icon-library/network", categories: [] }));

    const result = await mod.fetchIconLibraryManifest(catalog.libraries[0], fetcher as unknown as typeof fetch);

    expect(result).toEqual(manifest);
    expect(fetcher).not.toHaveBeenCalled();
    // removeItem 只在「JSON 解析成功但结构不可用」时调用；解析失败走的是 catch，
    // 不清理。这条把两个分支钉开，别混成一条。
    expect(broken.removeItem).not.toHaveBeenCalled();
  });

  test("没有 window 时 storage 层完全空转，直接回源", async () => {
    delete (globalThis as { window?: unknown }).window;
    const mod = await import("./iconLibraryCatalog");
    const fetcher = vi.fn(jsonFetcher(catalog));

    const result = await mod.fetchIconLibraryCatalog(fetcher as unknown as typeof fetch);

    expect(result).toEqual(catalog);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// encodeIconFilePath：文件名的逐段编码
// ---------------------------------------------------------------------------
//
// encodeIconFilePath 没有导出，只能经 iconLibraryIconUrl 观察；后者只是把它拼在
// 归一化过的 root 后面，所以下面对编码的断言同时也是对拼接的断言。

describe("图标文件名的逐段编码", () => {
  test("文件名里的 # 与 ? 被编码，不会变成 URL 的 fragment 与 query", () => {
    expect(iconLibraryIconUrl("/icon-library/lib", "cat/a#b.svg")).toBe("/icon-library/lib/cat/a%23b.svg");
    expect(iconLibraryIconUrl("/icon-library/lib", "cat/a?b.svg")).toBe("/icon-library/lib/cat/a%3Fb.svg");
  });

  test("文件名里的 % 被再次编码成 %25，不把已有转义序列当原文透传", () => {
    expect(iconLibraryIconUrl("/icon-library/lib", "cat/100%.svg")).toBe("/icon-library/lib/cat/100%25.svg");
    // 若改成「先 decode 再 encode」这条会变成 a%2520b... 不含 %20，形态完全不同
    expect(iconLibraryIconUrl("/icon-library/lib", "cat/a b%20c.svg")).toBe("/icon-library/lib/cat/a%20b%2520c.svg");
  });

  test("中文与空格按 UTF-8 百分号编码，逐段解码后能还原原文件名", () => {
    const file = "气象/晴 天 #1.svg";
    const url = iconLibraryIconUrl("/icon-library/lib", file);
    const encoded = url.slice("/icon-library/lib/".length);

    expect(encoded).toBe("%E6%B0%94%E8%B1%A1/%E6%99%B4%20%E5%A4%A9%20%231.svg");
    expect(encoded.split("/").map(decodeURIComponent).join("/")).toBe(file);
  });

  test("路径段里的点段原样保留：编码层既不归一化也不做穿越防护", () => {
    // 记录现状而非认可。encodeURIComponent 不解析也不折叠 `.`/`..`，所以来自
    // catalog.json 的 file 字段可以把拼接结果指到图标库根目录之外 —— 本仓的
    // catalog.json 是后端产出的静态文件，所以现在不算漏洞；但这条测试的用途是
    // 把「这一层没有任何防护」钉在案上，将来若允许外部来源的 catalog，
    // 应当在这里加上折叠或拒绝，而不是靠调用方自觉。
    expect(iconLibraryIconUrl("/icon-library/lib", "../../etc/passwd")).toBe("/icon-library/lib/../../etc/passwd");
    // 已经转义过的 ../ 会被再转义一层，反而逃不出当前段
    expect(iconLibraryIconUrl("/icon-library/lib", "cat/..%2F..%2Fsecret.svg"))
      .toBe("/icon-library/lib/cat/..%252F..%252Fsecret.svg");
  });
});

// ---------------------------------------------------------------------------
// fetchIconLibraryManifest 的内存复用：并发去重 / 失败不缓存 / 成功缓存
// ---------------------------------------------------------------------------

describe("fetchIconLibraryManifest 的内存复用", () => {
  const networkManifest: IconLibraryManifest = {
    name: "docer-free-compatible",
    label: "稻壳兼容",
    root: "/icon-library/docer-free-compatible",
    categories: [{ id: "weather", label: "气象", icons: [{ id: "sun", name: "晴", file: "weather/sun.svg" }] }]
  };

  afterEach(() => {
    delete (globalThis as { window?: unknown }).window;
    // 这里用了 vi.spyOn(globalThis, "fetch")，必须还原，否则同 worker 里
    // 后续文件会拿到这个替身。
    vi.restoreAllMocks();
    vi.resetModules();
  });

  test("同一库并发两次只发一次请求，两次拿到同一份结果；且走的是默认 fetcher", async () => {
    installStorages(makeStorage(), makeStorage());
    const mod = await import("./iconLibraryCatalog");
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async () =>
      new Response(JSON.stringify(networkManifest), { status: 200, headers: { "content-type": "application/json" } })
    );

    const [left, right] = await Promise.all([
      mod.fetchIconLibraryManifest(catalog.libraries[0]),
      mod.fetchIconLibraryManifest(catalog.libraries[0])
    ]);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(left).toEqual(networkManifest);
    expect(left).toBe(right);
    expect(String(fetchSpy.mock.calls[0][0])).toContain("/manifest.json");
  });

  test("首次 fetch 失败后不缓存失败结果：第二次调用会重新发请求", async () => {
    installStorages(makeStorage(), makeStorage());
    const mod = await import("./iconLibraryCatalog");
    const failing: typeof fetch = async () =>
      new Response("boom", { status: 500, headers: { "content-type": "text/plain" } });
    const succeeding = vi.fn(jsonFetcher(networkManifest));

    const firstMessage = await errorMessageFrom(() => mod.fetchIconLibraryManifest(catalog.libraries[0], failing));
    expect(firstMessage).toContain("读取“稻壳兼容”图标清单失败。");

    const result = await mod.fetchIconLibraryManifest(catalog.libraries[0], succeeding as unknown as typeof fetch);

    expect(succeeding).toHaveBeenCalledTimes(1);
    expect(result).toEqual(networkManifest);
  });

  test("成功后第二次调用不再发请求，且返回同一个对象引用", async () => {
    installStorages(makeStorage(), makeStorage());
    const mod = await import("./iconLibraryCatalog");
    const fetcher = vi.fn(jsonFetcher(networkManifest));

    const first = await mod.fetchIconLibraryManifest(catalog.libraries[0], fetcher as unknown as typeof fetch);
    const second = await mod.fetchIconLibraryManifest(catalog.libraries[0], fetcher as unknown as typeof fetch);

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(second).toBe(first);
  });
});
