import { frontendPath } from "./config";

export const ICON_LIBRARY_CATALOG_URL = frontendPath("/icon-library/catalog.json");
export const ICON_LIBRARY_PAGE_SIZE = 120;

const CATALOG_CACHE_KEY = "graph-modeling-platform:icon-library:catalog:v2";
const MANIFEST_CACHE_KEY_PREFIX = "graph-modeling-platform:icon-library:manifest:v2:";

export type IconLibraryCatalogCategory = {
  id: string;
  label: string;
  description?: string;
  count?: number;
};

export type IconLibraryCatalogLibrary = {
  id: string;
  label: string;
  root: string;
  totalIcons?: number;
  categories: IconLibraryCatalogCategory[];
};

export type IconLibraryCatalog = {
  name: string;
  label?: string;
  totalIcons?: number;
  libraries: IconLibraryCatalogLibrary[];
};

export type IconLibraryManifestIcon = {
  id: string;
  name: string;
  file: string;
  color?: string;
  tags?: string[];
  sourceId?: string;
  sourceLabel?: string;
  source?: string;
  sourceName?: string;
  sourcePackage?: string;
  originalLibraryId?: string;
  originalLibraryLabel?: string;
  originalFile?: string;
  license?: string;
};

export type IconLibraryManifestCategory = {
  id: string;
  label: string;
  description?: string;
  icons: IconLibraryManifestIcon[];
};

export type IconLibraryManifest = {
  name: string;
  label?: string;
  root: string;
  categories: IconLibraryManifestCategory[];
};

export type IconLibraryBrowserIcon = {
  id: string;
  iconId: string;
  libraryId: string;
  libraryLabel: string;
  categoryId: string;
  categoryLabel: string;
  categoryKey: string;
  name: string;
  file: string;
  url: string;
  color?: string;
  tags: string[];
  license?: string;
  searchText: string;
};

export type IconLibraryFilter = {
  libraryId: string;
  categoryKey: string;
  query: string;
};

export type IconLibraryVisibleResult = {
  filtered: IconLibraryBrowserIcon[];
  visible: IconLibraryBrowserIcon[];
  total: number;
  hasMore: boolean;
};

export type IconLibraryPickerState = {
  status: "idle" | "loading" | "ready" | "error";
  error: string;
  catalog: IconLibraryCatalog | null;
  entries: IconLibraryBrowserIcon[];
  selectedLibraryId: string;
  selectedCategoryKey: string;
  searchQuery: string;
  visibleCount: number;
  loadedLibraryIds: string[];
  loadingLibraryIds: string[];
};

export const createInitialIconLibraryPickerState = (): IconLibraryPickerState => ({
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

const catalogMemory: { value?: IconLibraryCatalog; promise?: Promise<IconLibraryCatalog> } = {};
const manifestMemory = new Map<string, { value?: IconLibraryManifest; promise?: Promise<IconLibraryManifest> }>();

const browserCacheStorages = () => {
  if (typeof window === "undefined") {
    return [] as Storage[];
  }
  const storages: Storage[] = [];
  try {
    if (window.localStorage) {
      storages.push(window.localStorage);
    }
  } catch {
    // Ignore restricted localStorage; sessionStorage below remains a best-effort fallback.
  }
  try {
    if (window.sessionStorage && window.sessionStorage !== storages[0]) {
      storages.push(window.sessionStorage);
    }
  } catch {
    // Cache is optional; no storage support should not affect icon selection.
  }
  return storages;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === "object");

function isIconLibraryCatalogCacheUsable(value: unknown): value is IconLibraryCatalog {
  if (!isRecord(value) || !Array.isArray(value.libraries)) {
    return false;
  }
  return value.libraries.every((library) => isRecord(library) && typeof library.id === "string" && Array.isArray(library.categories));
}

function isIconLibraryManifestCacheUsable(value: unknown): value is IconLibraryManifest {
  if (!isRecord(value) || !Array.isArray(value.categories)) {
    return false;
  }
  return value.categories.every((category) => isRecord(category) && Array.isArray(category.icons));
}

function readCacheJson<T>(key: string, isUsable: (value: unknown) => value is T = (_value): _value is T => true): T | null {
  for (const storage of browserCacheStorages()) {
    try {
      const raw = storage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw) as unknown;
        if (isUsable(parsed)) {
          return parsed;
        }
        storage.removeItem(key);
      }
    } catch {
      // Try the next storage backend when one cache entry is corrupt or unavailable.
    }
  }
  return null;
}

function writeCacheJson(key: string, value: unknown) {
  const payload = JSON.stringify(value);
  for (const storage of browserCacheStorages()) {
    try {
      storage.setItem(key, payload);
    } catch {
      // Cache is opportunistic; quota or privacy failures must not block icon selection.
    }
  }
}

const normalizeRoot = (root: string, libraryId: string) => {
  const fallback = frontendPath(`/icon-library/${libraryId}`);
  if (!root) return fallback;
  const normalized = root.replace(/\/+$/u, "");
  return normalized.startsWith("/") ? frontendPath(normalized) : fallback;
};

const encodeIconFilePath = (file: string) =>
  String(file ?? "")
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");

export function iconLibraryCategoryKey(libraryId: string, categoryId: string) {
  return `${libraryId}::${categoryId}`;
}

export function iconLibraryIconUrl(root: string, file: string) {
  return `${String(root ?? "").replace(/\/+$/u, "")}/${encodeIconFilePath(file)}`;
}

export function iconLibraryManifestUrl(library: Pick<IconLibraryCatalogLibrary, "id" | "root">) {
  return `${normalizeRoot(library.root, library.id)}/manifest.json`;
}

export function flattenIconLibraryManifest(
  manifest: IconLibraryManifest,
  libraryMeta?: Pick<IconLibraryCatalogLibrary, "id" | "label" | "root">
): IconLibraryBrowserIcon[] {
  const libraryId = libraryMeta?.id || manifest.name;
  const libraryLabel = libraryMeta?.label || manifest.label || libraryId;
  const root = normalizeRoot(libraryMeta?.root || manifest.root, libraryId);
  return (manifest.categories ?? []).flatMap((category) => {
    const categoryKey = iconLibraryCategoryKey(libraryId, category.id);
    return (category.icons ?? []).map((icon) => {
      const tags = Array.isArray(icon.tags) ? icon.tags.map((tag) => String(tag)) : [];
      const searchText = [
        icon.id,
        icon.name,
        icon.file,
        libraryId,
        libraryLabel,
        category.id,
        category.label,
        icon.sourceId,
        icon.sourceLabel,
        icon.source,
        icon.sourceName,
        icon.sourcePackage,
        icon.originalLibraryId,
        icon.originalLibraryLabel,
        icon.originalFile,
        icon.license,
        ...tags
      ]
        .map((value) => String(value ?? "").toLowerCase())
        .join(" ");
      return {
        id: `${libraryId}:${category.id}:${icon.id}:${icon.file}`,
        iconId: icon.id,
        libraryId,
        libraryLabel,
        categoryId: category.id,
        categoryLabel: category.label,
        categoryKey,
        name: icon.name || icon.id,
        file: icon.file,
        url: iconLibraryIconUrl(root, icon.file),
        color: icon.color,
        tags,
        license: icon.license,
        searchText
      };
    });
  });
}

export function iconLibraryCategoriesForSelection(catalog: IconLibraryCatalog | null, selectedLibraryId: string) {
  const libraries = catalog?.libraries ?? [];
  return libraries
    .filter((library) => !selectedLibraryId || library.id === selectedLibraryId)
    .flatMap((library) =>
      (library.categories ?? []).map((category) => ({
        ...category,
        key: iconLibraryCategoryKey(library.id, category.id),
        libraryId: library.id,
        libraryLabel: library.label,
        label: selectedLibraryId ? category.label : `${library.label} / ${category.label}`
      }))
    );
}

export function filterIconLibraryIcons(icons: IconLibraryBrowserIcon[], filter: IconLibraryFilter) {
  const queryTokens = String(filter.query ?? "")
    .trim()
    .toLowerCase()
    .split(/\s+/u)
    .filter(Boolean);
  return icons.filter((icon) => {
    if (filter.libraryId && icon.libraryId !== filter.libraryId) {
      return false;
    }
    if (filter.categoryKey && icon.categoryKey !== filter.categoryKey) {
      return false;
    }
    return queryTokens.every((token) => icon.searchText.includes(token));
  });
}

export function visibleIconLibraryIcons(
  icons: IconLibraryBrowserIcon[],
  filter: IconLibraryFilter,
  visibleCount = ICON_LIBRARY_PAGE_SIZE
): IconLibraryVisibleResult {
  const filtered = filterIconLibraryIcons(icons, filter);
  const normalizedVisibleCount = Math.max(1, Math.floor(Number(visibleCount) || ICON_LIBRARY_PAGE_SIZE));
  const visible = filtered.slice(0, normalizedVisibleCount);
  return {
    filtered,
    visible,
    total: filtered.length,
    hasMore: filtered.length > visible.length
  };
}

async function fetchJson<T>(url: string, errorMessage: string, fetcher: typeof fetch = fetch): Promise<T> {
  const response = await fetcher(url);
  const contentType = response.headers.get("content-type") || "未知";
  const detail = `（地址：${url}，状态：${response.status}，类型：${contentType}）`;
  const payload = await response.text();
  if (!response.ok) {
    throw new Error(`${errorMessage}${detail}`);
  }
  if (payload.trimStart().startsWith("<")) {
    throw new Error(`${errorMessage}接口返回了 HTML 页面，请确认后端服务和 /icon-library 代理已启动。${detail}`);
  }
  try {
    return JSON.parse(payload) as T;
  } catch {
    throw new Error(`${errorMessage}接口返回的内容不是有效 JSON。${detail}`);
  }
}

export async function fetchIconLibraryCatalog(fetcher: typeof fetch = fetch): Promise<IconLibraryCatalog> {
  if (catalogMemory.value) {
    return catalogMemory.value;
  }
  const cached = readCacheJson<IconLibraryCatalog>(CATALOG_CACHE_KEY, isIconLibraryCatalogCacheUsable);
  if (cached?.libraries?.length) {
    catalogMemory.value = cached;
    return cached;
  }
  if (!catalogMemory.promise) {
    catalogMemory.promise = fetchJson<IconLibraryCatalog>(ICON_LIBRARY_CATALOG_URL, "读取分类图标库失败。", fetcher)
      .then((catalog) => {
        catalogMemory.value = catalog;
        writeCacheJson(CATALOG_CACHE_KEY, catalog);
        return catalog;
      })
      .finally(() => {
        catalogMemory.promise = undefined;
      });
  }
  return catalogMemory.promise;
}

export async function fetchIconLibraryManifest(
  library: IconLibraryCatalogLibrary,
  fetcher: typeof fetch = fetch
): Promise<IconLibraryManifest> {
  const libraryId = library.id;
  const memory = manifestMemory.get(libraryId);
  if (memory?.value) {
    return memory.value;
  }
  const cacheKey = `${MANIFEST_CACHE_KEY_PREFIX}${libraryId}`;
  const cached = readCacheJson<IconLibraryManifest>(cacheKey, isIconLibraryManifestCacheUsable);
  if (cached?.categories?.length) {
    manifestMemory.set(libraryId, { value: cached });
    return cached;
  }
  if (memory?.promise) {
    return memory.promise;
  }
  const promise = fetchJson<IconLibraryManifest>(iconLibraryManifestUrl(library), `读取“${library.label || library.id}”图标清单失败。`, fetcher)
    .then((manifest) => {
      manifestMemory.set(libraryId, { value: manifest });
      writeCacheJson(cacheKey, manifest);
      return manifest;
    })
    .finally(() => {
      const current = manifestMemory.get(libraryId);
      if (current?.promise === promise) {
        manifestMemory.set(libraryId, { value: current.value });
      }
    });
  manifestMemory.set(libraryId, { promise });
  return promise;
}
