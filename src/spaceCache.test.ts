import { describe, expect, test, beforeEach, afterEach } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { IDBFactory } from "fake-indexeddb";
import "fake-indexeddb/auto";
import { initDeviceLibraryDB } from "./lib/deviceLibraryDB";
import {
  KEPT_IDB_STORES,
  KEPT_LOCAL_STORAGE_KEYS,
  SPACE_CACHE_OWNER_STORAGE_KEY,
  SPACE_SCOPED_IDB_DATABASES,
  SPACE_SCOPED_IDB_STORES,
  SPACE_SCOPED_LOCAL_STORAGE_KEYS,
  SPACE_SCOPED_SESSION_STORAGE_KEYS,
  SPACE_SCOPED_STORAGE_KEY_PREFIXES,
  clearSpaceScopedBrowserCaches,
  readCacheOwnerSpace,
  reconcileSpaceCacheOwnership
} from "./spaceCache";

// 测试环境是 node（无 jsdom）：手动注入 localStorage / sessionStorage / indexedDB 桩。
// fake-indexeddb 提供 IDB 实现；localStorage / sessionStorage 用内存 Map 桩。

// ============ 桩 ============

function createStorageStub(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    key: (index: number) => Array.from(map.keys())[index] ?? null,
    getItem: (key: string) => (map.has(key) ? (map.get(key) as string) : null),
    setItem: (key: string, value: string) => {
      map.set(key, String(value));
    },
    removeItem: (key: string) => {
      map.delete(key);
    },
    clear: () => {
      map.clear();
    }
  };
}

let originalLocalStorage: unknown;
let originalSessionStorage: unknown;
let originalIndexedDB: unknown;

beforeEach(() => {
  originalLocalStorage = (globalThis as any).localStorage;
  originalSessionStorage = (globalThis as any).sessionStorage;
  originalIndexedDB = (globalThis as any).indexedDB;
  (globalThis as any).localStorage = createStorageStub();
  (globalThis as any).sessionStorage = createStorageStub();
  // 每个用例一套全新 IDB，避免跨用例串数据
  (globalThis as any).indexedDB = new IDBFactory();
});

afterEach(() => {
  (globalThis as any).localStorage = originalLocalStorage;
  (globalThis as any).sessionStorage = originalSessionStorage;
  (globalThis as any).indexedDB = originalIndexedDB;
});

// ============ 源码扫描（守卫用） ============

// 与 spaceCache.ts 清单同源的命名约定：`*_STORAGE_KEY` / `*StorageKey` 常量声明。
const STORAGE_KEY_DECL = /^\s*(?:export\s+)?const\s+([A-Za-z_$][\w$]*(?:_STORAGE_KEY|StorageKey))\s*=\s*"([^"]*)"\s*;?\s*$/;
// storage 调用里的裸字符串字面量实参。**必须锚在实参位置**，否则会把无关的
// `"…"` 字面量（如 `openDB("other", …)` 之外的对象键）误判成 storage key。
const STORAGE_LITERAL_CALL = /\b(?:window\s*\.\s*)?(?:localStorage|sessionStorage)\s*\.\s*(?:getItem|setItem|removeItem)\s*\(\s*"([^"]*)"/g;
// IndexedDB 库名声明点。`openDB<Schema>(NAME, …)` 带泛型，故泛型段必须可选匹配。
const OPEN_DB_CALL = /\b(?:openDB|indexedDB\s*\.\s*open)\s*(?:<[^>]*>)?\s*\(\s*([A-Za-z_$][\w$]*|"[^"]*")/g;
// storage 调用的**首个实参原文**（截到逗号或右括号为止）。
// 第三层只看其中的模板字符串 / `+` 拼接形态；字面量与常量由前两层负责。
const STORAGE_FIRST_ARG = /\b(?:window\s*\.\s*)?(?:localStorage|sessionStorage)\s*\.\s*(?:getItem|setItem|removeItem)\s*\(\s*([^,)]*)/g;
// IndexedDB store 的声明点
const IDB_STORE_DECL = /createObjectStore\(\s*"([^"]+)"/g;
// 同文件内的字符串常量表，用于把 `openDB(DB_NAME, …)` 的标识符还原成库名字面量
const STRING_CONST_DECL = /^\s*(?:export\s+)?const\s+([A-Za-z_$][\w$]*)\s*=\s*"([^"]*)"\s*;?\s*$/;

function stringConstsOf(source: string): Map<string, string> {
  return new Map(
    source.split(/\r?\n/u).flatMap((line) => {
      const matched = STRING_CONST_DECL.exec(line);
      return matched ? [[matched[1], matched[2]] as const] : [];
    })
  );
}

/** 从一段源码里抽出 `存储常量名 → 其字面量值`。纯函数，便于单独验证扫描器本身。 */
export function scanStorageKeyDeclarations(source: string): { name: string; value: string }[] {
  const found: { name: string; value: string }[] = [];
  for (const line of source.split(/\r?\n/u)) {
    const matched = STORAGE_KEY_DECL.exec(line);
    if (matched) {
      found.push({ name: matched[1], value: matched[2] });
    }
  }
  return found;
}

/**
 * 从一个拼装表达式的原文里取**静态前缀**。
 * 模板字符串取第一个 `${` 之前的部分；若开头就是 `${IDENT}`，用同文件常量表还原
 * （还原不出来返回 `<unresolved:…>`，宁可让守卫红也别静默漏掉）。
 */
function staticPrefixOf(expr: string, stringConsts: Map<string, string>): string {
  if (expr.startsWith("`")) {
    const body = expr.slice(1, expr.lastIndexOf("`"));
    const head = body.split("${")[0];
    if (head) {
      return head;
    }
    const ident = /^\$\{([A-Za-z_$][\w$]*)\}/u.exec(body)?.[1];
    return ident ? (stringConsts.get(ident) ?? `<unresolved:${ident}>`) : "<unresolved:模板串>";
  }
  if (expr.startsWith('"')) {
    // "lit" + x → 取那一段字面量
    const end = expr.indexOf('"', 1);
    return end < 0 ? "<unresolved:对引号>" : expr.slice(1, end);
  }
  // 纯标识符拼接（a + b）：无静态前缀可言，显眼占位让守卫红
  return `<unresolved:${expr}>`;
}

/** 从一段源码里抽出 storage 调用实参为**拼装表达式**时的静态前缀。 */
export function scanComposedStorageKeyPrefixes(source: string): string[] {
  const stringConsts = stringConstsOf(source);
  return Array.from(source.matchAll(STORAGE_FIRST_ARG), (matched) => matched[1])
    .filter((arg) => arg.includes("`") || arg.includes("+"))
    .map((arg) => staticPrefixOf(arg.trim(), stringConsts));
}

/** 从一段源码里抽出 storage 调用的裸字面量 key（无命名常量的那一类）。 */
export function scanLiteralStorageKeys(source: string): string[] {
  return Array.from(source.matchAll(STORAGE_LITERAL_CALL), (matched) => matched[1]);
}

/**
 * 从一段源码里抽出 IndexedDB 库名。
 * 实参是标识符时，用同文件内的字符串常量表还原；还原不出来就返回一个显眼的
 * `<unresolved:NAME>` 占位（宁可让守卫红，也别静默漏掉一个库）。
 */
export function scanIdbDatabaseNames(source: string): string[] {
  const stringConsts = stringConstsOf(source);
  return Array.from(source.matchAll(OPEN_DB_CALL), (matched) => {
    const arg = matched[1];
    if (arg.startsWith('"')) return arg.slice(1, -1);
    return stringConsts.get(arg) ?? `<unresolved:${arg}>`;
  });
}

/** 从一段源码里抽出 IndexedDB store 名。 */
function scanIdbStoreNames(source: string): string[] {
  return Array.from(source.matchAll(IDB_STORE_DECL), (matched) => matched[1]);
}

function listSourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...listSourceFiles(full));
      continue;
    }
    // 守卫只看产品代码：测试文件里的字面量不是「缓存声明」
    if (!/\.tsx?$/u.test(entry.name) || /\.test\.tsx?$/u.test(entry.name)) continue;
    out.push(full);
  }
  return out;
}

const repoRoot = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const sourceFiles = listSourceFiles(path.join(repoRoot, "src"));

// ============ 断言 1：三组都被清 ============

describe("清理覆盖四组浏览器缓存", () => {
  test("localStorage 组被清空", async () => {
    for (const key of SPACE_SCOPED_LOCAL_STORAGE_KEYS) {
      localStorage.setItem(key, "dirty");
    }
    await clearSpaceScopedBrowserCaches();
    expect(SPACE_SCOPED_LOCAL_STORAGE_KEYS.map((key) => localStorage.getItem(key))).toEqual(
      SPACE_SCOPED_LOCAL_STORAGE_KEYS.map(() => null)
    );
  });

  test("sessionStorage 组被清空", async () => {
    for (const key of SPACE_SCOPED_SESSION_STORAGE_KEYS) {
      sessionStorage.setItem(key, "dirty");
    }
    await clearSpaceScopedBrowserCaches();
    expect(SPACE_SCOPED_SESSION_STORAGE_KEYS.map((key) => sessionStorage.getItem(key))).toEqual(
      SPACE_SCOPED_SESSION_STORAGE_KEYS.map(() => null)
    );
  });

  test("IndexedDB 组被清空", async () => {
    const db = await initDeviceLibraryDB();
    await db.put("templates", { kind: "seed-kind", custom: true });
    await db.put("graphTemplates", { id: "seed-graph", typeName: "常用模板" });
    await db.put("overrides", { kind: "seed-kind" });
    await db.put("templateImages", { id: "seed-kind_backgroundImage", templateKind: "seed-kind" });
    // 迁移簿记必须留着：清掉会触发重迁移并对图元库做整表覆盖写
    await db.put("migration", { key: "deviceLibrary", completed: true, schemaVersion: 999 });

    await clearSpaceScopedBrowserCaches();

    const after = await initDeviceLibraryDB();
    for (const store of SPACE_SCOPED_IDB_STORES) {
      expect([store, await after.getAll(store)]).toEqual([store, []]);
    }
    expect(await after.get("migration", "deviceLibrary")).toMatchObject({ completed: true });
  });

  test("拼装前缀组被整族清空（localStorage 与 sessionStorage 都要按前缀清）", async () => {
    const manifestPrefix = "graph-modeling-platform:icon-library:manifest:v2:";
    expect(SPACE_SCOPED_STORAGE_KEY_PREFIXES).toContain(manifestPrefix);
    // 运行期拼装出来的具体 key 静态不可枚举，这里模拟两个「不同库 id」的实例
    const composed = [`${manifestPrefix}open-source-svg`, `${manifestPrefix}office-fluent-compatible`];
    // 每个已登记前缀下都放一个带后缀的实例：整族清要能被证明，不只证明清单里有字符串
    const perPrefix = SPACE_SCOPED_STORAGE_KEY_PREFIXES.map((prefix) => `${prefix}suffix-probe`);
    // 两个「不该被清」的对照，各钉一个实现错误：
    //  · nearMiss：前缀被截掉尾冒号 —— 钉「前缀必须完整」（截断实现的漏清）
    //  · middleEmbedded：前缀出现在 key **中间** —— 钉「必须从头匹配」。
    //    注意 nearMiss **不能**区分 `startsWith` 与 `includes`（两者对截断串都返回 false），
    //    真正能区分的是 middleEmbedded：`includes` 实现会把中间的命中误清 → 红。
    const nearMiss = manifestPrefix.slice(0, -1);
    const middleEmbedded = `x${manifestPrefix}open-source-svg`;

    for (const key of [...composed, ...perPrefix]) {
      localStorage.setItem(key, "dirty");
      sessionStorage.setItem(key, "dirty");
    }
    for (const key of [nearMiss, middleEmbedded]) {
      localStorage.setItem(key, "keep-me");
      sessionStorage.setItem(key, "keep-me");
    }

    await clearSpaceScopedBrowserCaches();

    expect(composed.map((key) => localStorage.getItem(key))).toEqual([null, null]);
    expect(composed.map((key) => sessionStorage.getItem(key))).toEqual([null, null]);
    expect(perPrefix.map((key) => localStorage.getItem(key))).toEqual(perPrefix.map(() => null));
    expect(perPrefix.map((key) => sessionStorage.getItem(key))).toEqual(perPrefix.map(() => null));
    expect(localStorage.getItem(nearMiss)).toBe("keep-me");
    expect(sessionStorage.getItem(nearMiss)).toBe("keep-me");
    expect(localStorage.getItem(middleEmbedded)).toBe("keep-me");
    expect(sessionStorage.getItem(middleEmbedded)).toBe("keep-me");
  });
});

// ============ 断言 2：不该清的确实没被清 ============
describe("本机偏好与浏览器身份不被清", () => {
  test("白名单 key 在清理后仍在", async () => {
    for (const { key } of KEPT_LOCAL_STORAGE_KEYS) {
      localStorage.setItem(key, "keep-me");
    }
    // 混入一条该清的，证明清理确实发生了（否则「都还在」可能只是函数没跑）
    localStorage.setItem(SPACE_SCOPED_LOCAL_STORAGE_KEYS[0], "dirty");

    await clearSpaceScopedBrowserCaches();

    expect(localStorage.getItem("runtimeWsClientId")).toBe("keep-me");
    expect(localStorage.getItem("power-system-left-panel-width")).toBe("keep-me");
    expect(localStorage.getItem("graph-modeling-platform:interaction-mode")).toBe("keep-me");
    expect(KEPT_LOCAL_STORAGE_KEYS.map(({ key }) => localStorage.getItem(key))).toEqual(
      KEPT_LOCAL_STORAGE_KEYS.map(() => "keep-me")
    );
    expect(localStorage.getItem(SPACE_SCOPED_LOCAL_STORAGE_KEYS[0])).toBeNull();
  });

  test("白名单每条都写了理由", () => {
    expect(KEPT_LOCAL_STORAGE_KEYS.filter(({ reason }) => reason.trim().length === 0)).toEqual([]);
    expect(KEPT_IDB_STORES.filter(({ reason }) => reason.trim().length === 0)).toEqual([]);
  });
});

// ============ 断言 2.5：启动闸门（手工改 cookie 路径的 S2 收口） ============

// 为什么需要这道闸门：`switchToSpace` 的清理只在**经顶栏切换**时发生，而 `gmp_space`
// 是无签名普通 Cookie —— 手工改成另一个空间再打开应用，`switchToSpace` 从不执行。
// 闸门（`appStartup.ts`，由 `main.tsx` 与 `qiankunLifecycle.mount()` 在渲染前调用）
// 必须在**渲染之前**跑：App 的配色/量测/图元库
// 状态是渲染期同步从 localStorage 播种的，effect 跑在播种之后，那时清缓存已是事后动作。
describe("启动闸门：把浏览器缓存与即将加载的空间对齐", () => {
  test("归属一致 → 什么都不清（否则每次启动都要重取一遍）", async () => {
    localStorage.setItem(SPACE_CACHE_OWNER_STORAGE_KEY, "default");
    localStorage.setItem(SPACE_SCOPED_LOCAL_STORAGE_KEYS[0], "dirty");

    await reconcileSpaceCacheOwnership("default");

    expect(localStorage.getItem(SPACE_SCOPED_LOCAL_STORAGE_KEYS[0])).toBe("dirty");
    expect(readCacheOwnerSpace()).toBe("default");
  });

  test("归属不一致 → 清掉旧空间的缓存并把归属改写为新空间", async () => {
    localStorage.setItem(SPACE_CACHE_OWNER_STORAGE_KEY, "default");
    localStorage.setItem(SPACE_SCOPED_LOCAL_STORAGE_KEYS[0], "dirty");
    sessionStorage.setItem(SPACE_SCOPED_SESSION_STORAGE_KEYS[0], "dirty");
    const db = await initDeviceLibraryDB();
    await db.put("templates", { kind: "seed-kind", custom: true });

    await reconcileSpaceCacheOwnership("张三");

    expect(localStorage.getItem(SPACE_SCOPED_LOCAL_STORAGE_KEYS[0])).toBeNull();
    expect(sessionStorage.getItem(SPACE_SCOPED_SESSION_STORAGE_KEYS[0])).toBeNull();
    expect(await (await initDeviceLibraryDB()).getAll("templates")).toEqual([]);
    // 记账本身不能被清掉 —— 它既是判据，也要跟着改写成新空间
    expect(readCacheOwnerSpace()).toBe("张三");
  });

  test("无记账（首次在本浏览器打开）→ 只记不清", async () => {
    const dirty = SPACE_SCOPED_LOCAL_STORAGE_KEYS[0];
    localStorage.setItem(dirty, "dirty");

    await reconcileSpaceCacheOwnership("default");

    // 误清的代价不止一次重取：先清 localStorage 再开 IDB，若迁移簿记尚未落盘，
    // 重迁移会读到已清空的 legacy key 并以 saveDeviceTemplates([]) 整表覆盖图元库。
    expect(localStorage.getItem(dirty)).toBe("dirty");
    expect(readCacheOwnerSpace()).toBe("default");
  });

  test("清缓存失败 → 向上抛且不写记账（写下去等于把「已对齐」这个错误前提固化）", async () => {
    localStorage.setItem(SPACE_CACHE_OWNER_STORAGE_KEY, "default");
    const originalIndexedDB = (globalThis as any).indexedDB;
    (globalThis as any).indexedDB = undefined;
    try {
      await expect(reconcileSpaceCacheOwnership("张三")).rejects.toBeTruthy();
    } finally {
      (globalThis as any).indexedDB = originalIndexedDB;
    }

    expect(readCacheOwnerSpace()).toBe("default");
  });

  // **源码级断言**（不是行为断言）：闸门必须早于第一次渲染，而 App 的模型/配色/量测状态是
  // 渲染期同步从 localStorage 播种的 —— node 环境里没有 React 渲染，行为验不了。
  // 它证明两件事：闸门本体确实在做缓存归属对齐（`appStartup.ts`），
  // 且 `main.tsx` **await** 它之后才 `createRoot`。
  // 变异：把 `await runStartupGate()` 挪到 createRoot 之后、或去掉 await（等价于放进 useEffect）→ 红。
  // （该时序另有一条真浏览器的承重证据：e2e 里把闸门挪到渲染之后，
  //   `e2e/spaceSwitch.e2e.test.mjs` 的「手工改 cookie」用例实测变红。）
  test("启动闸门排在 createRoot 之前（源码级）", () => {
    const gateSource = readFileSync(new URL("./appStartup.ts", import.meta.url), "utf8");
    const mainSource = readFileSync(new URL("./main.tsx", import.meta.url), "utf8");

    // 闸门本体（含缓存归属对齐）在 appStartup.ts，独立运行与 qiankun 两条路径共用
    expect(gateSource.indexOf("reconcileSpaceCacheOwnership(")).toBeGreaterThanOrEqual(0);

    const gateCallIndex = mainSource.indexOf("runStartupGate(");
    const createRootIndex = mainSource.indexOf("createRoot(");
    expect([gateCallIndex >= 0, createRootIndex >= 0]).toEqual([true, true]);
    // 必须 await：不 await 就是「发起即渲染」，与挪到渲染之后等价
    expect(/await\s+runStartupGate\(/.test(mainSource)).toBe(true);
    expect(gateCallIndex).toBeLessThan(createRootIndex);
  });
});

// ============ 断言 3：清单全覆盖守卫 ============

// 守卫的**保证范围与已知边界**（含守卫抓不到的两类 key 及其当前成员）写在
// `src/spaceCache.ts` 的模块头注释里 —— 改扫描面时两处要一起看，别让守卫
// 声称的范围大于它实际扫到的范围。
describe("空间缓存清单全覆盖守卫", () => {
  test("扫描器能识别两种 key 形态（守卫自身灵敏度）", () => {
    expect(scanStorageKeyDeclarations('export const FOO_STORAGE_KEY = "foo-bar";')).toEqual([
      { name: "FOO_STORAGE_KEY", value: "foo-bar" }
    ]);
    expect(scanStorageKeyDeclarations('const BarStorageKey = "bar";')).toEqual([
      { name: "BarStorageKey", value: "bar" }
    ]);
    expect(scanStorageKeyDeclarations("const NO_KEY = computeKey();")).toEqual([]);
    // 裸字面量形态：写它比声明常量省事，故必须单独钉住
    expect(scanLiteralStorageKeys('localStorage.setItem("bare-key", "1");')).toEqual(["bare-key"]);
    expect(scanLiteralStorageKeys('window.sessionStorage.removeItem("bare-2");')).toEqual(["bare-2"]);
    expect(scanLiteralStorageKeys("localStorage.setItem(someKey, value);")).toEqual([]);
    // 非 storage 调用的字面量不得被误判
    expect(scanLiteralStorageKeys('openDB("not-a-storage-key", 1);')).toEqual([]);
    // 第三层：调用实参是拼装表达式时的静态前缀
    expect(scanComposedStorageKeyPrefixes("sessionStorage.setItem(`probe-${id}`, v);")).toEqual([
      "probe-"
    ]);
    expect(scanComposedStorageKeyPrefixes('localStorage.setItem("probe-" + id, v);')).toEqual([
      "probe-"
    ]);
    expect(
      scanComposedStorageKeyPrefixes('const P = "via-const:";\nlocalStorage.setItem(`${P}${id}`, v);')
    ).toEqual(["via-const:"]);
    // 开头就是未登记标识符 → 显眼占位，不许静默通过
    expect(scanComposedStorageKeyPrefixes("localStorage.setItem(`${UNKNOWN}${id}`, v);")).toEqual([
      "<unresolved:UNKNOWN>"
    ]);
    // 字面量 / 纯常量实参不归第三层管（由前两层负责），不得重复计入
    expect(scanComposedStorageKeyPrefixes('localStorage.setItem("plain", "1");')).toEqual([]);
    expect(scanComposedStorageKeyPrefixes("localStorage.setItem(SOME_CONST, v);")).toEqual([]);
    // IndexedDB 库名：字面量与同文件常量两种写法都要还原
    expect(scanIdbDatabaseNames('openDB<Schema>("literal-db", 1, {});')).toEqual(["literal-db"]);
    expect(scanIdbDatabaseNames('const DB_NAME = "via-const";\nopenDB<Schema>(DB_NAME, 2, {});')).toEqual([
      "via-const"
    ]);
    expect(scanIdbDatabaseNames("indexedDB.open(UNKNOWN_NAME, 1);")).toEqual([
      "<unresolved:UNKNOWN_NAME>"
    ]);
  });

  // 扫描面 = 常量声明 + 裸字面量实参 + 拼装前缀。三层合并为同一条断言：
  // 「写裸字面量」「在实参位拼装」都是比「声明常量」更省事的路，漏登记最可能从那儿发生。
  test("仓库内每个 storage key（常量 / 裸字面量实参 / 拼装前缀）都在清理清单或不清白名单内", () => {
    const declared = sourceFiles.flatMap((file) =>
      scanStorageKeyDeclarations(readFileSync(file, "utf8")).map(({ name, value }) => ({ file, name, value }))
    );
    const literals = sourceFiles.flatMap((file) =>
      scanLiteralStorageKeys(readFileSync(file, "utf8")).map((value) => ({ file, name: "(裸字面量)", value }))
    );
    // 第三层目前**零命中**（仓库现状没有在实参位拼装的 key）—— 它的证据在变异实测里，
    // 不在这一行的计数上。不要据此以为「已经覆盖了一切」。
    const composed = sourceFiles.flatMap((file) =>
      scanComposedStorageKeyPrefixes(readFileSync(file, "utf8")).map((value) => ({ file, name: "(拼装前缀)", value }))
    );
    // 扫描面本身要有效：正则写坏会导致「零命中 → 断言通过」的假绿
    expect(declared.length).toBeGreaterThanOrEqual(30);
    expect(literals.length).toBeGreaterThanOrEqual(4);

    const classified = new Set([
      ...SPACE_SCOPED_LOCAL_STORAGE_KEYS,
      ...SPACE_SCOPED_SESSION_STORAGE_KEYS,
      ...SPACE_SCOPED_STORAGE_KEY_PREFIXES,
      ...KEPT_LOCAL_STORAGE_KEYS.map(({ key }) => key)
    ]);
    const unclassified = [...declared, ...literals, ...composed].filter(
      ({ value }) => !classified.has(value)
    );

    expect(unclassified).toEqual([]);
  });

  test("仓库内每个 IndexedDB 库与 store 都在清理清单或不清白名单内", () => {
    const databases = Array.from(
      new Set(sourceFiles.flatMap((file) => scanIdbDatabaseNames(readFileSync(file, "utf8"))))
    );
    const stores = Array.from(
      new Set(sourceFiles.flatMap((file) => scanIdbStoreNames(readFileSync(file, "utf8"))))
    );
    expect(databases).toEqual(["device-library"]);
    expect(stores.length).toBeGreaterThanOrEqual(5);

    const clearedStores = new Set(SPACE_SCOPED_IDB_STORES);
    const keptStores = new Set(KEPT_IDB_STORES.map(({ store }) => store));
    const unclassified = stores.filter((store) => !clearedStores.has(store) && !keptStores.has(store));

    expect(unclassified).toEqual([]);
    // 库级：全仓只应存在这一个库；新增第二个库必须红
    expect(databases.filter((name) => !SPACE_SCOPED_IDB_DATABASES.includes(name))).toEqual([]);
  });
});
