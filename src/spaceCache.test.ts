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
  reconcileSpaceCacheOwnership,
  rememberCacheOwnerSpace
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
// IndexedDB store 的声明点。两种形态都要认：
//   1) 直接建库：`createObjectStore("templates", …)`
//   2) 单源声明 + 循环建库：`STORE_SPECS = { templates: {…}, … }`（deviceLibraryDB 的现形态）
//      —— 这里的 key 就是 store 名，与 (1) 等价，不该因为写法变了就漏扫。
const IDB_STORE_DECL = /createObjectStore\(\s*"([^"]+)"/g;
// 单源 store 声明：对象字面量的一级键。限定「紧跟 keyPath」以免误抓普通对象。
const STORE_SPEC_KEY = /^\s{2}([A-Za-z_$][\w$]*):\s*\{\s*\n\s*keyPath:/gm;
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
  return [
    ...Array.from(source.matchAll(IDB_STORE_DECL), (matched) => matched[1]),
    ...Array.from(source.matchAll(STORE_SPEC_KEY), (matched) => matched[1])
  ];
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

  test("单源 store 声明这条证据路径本身有效（防它被悄悄淘汰而无人察觉）", () => {
    // 上一条用例的 `stores` 是两条证据路径的并集：字面量 createObjectStore("x")
    // 与 STORE_SPECS 对象键。若将来 deviceLibraryDB 又换一种写法、并集仍凑够 5 个，
    // 上面那条会继续绿 —— 但真正在扫的东西可能已经不是它了。故单独钉住：
    // 当前生产代码里 `createObjectStore("字面量")` 已不存在（建库统一走 STORE_SPECS 循环），
    // STORE_SPEC_KEY 才是有效的那条。哪条退化，这里就红。
    const sources = sourceFiles.map((file) => readFileSync(file, "utf8"));
    const literalHits = sources.flatMap((s) => [...s.matchAll(IDB_STORE_DECL)]).length;
    const specKeyHits = sources.flatMap((s) => [...s.matchAll(STORE_SPEC_KEY)]).length;

    // 至少有一条路径必须在扫到东西（否则整个 store 覆盖守卫是假绿）
    expect(literalHits + specKeyHits).toBeGreaterThanOrEqual(5);
    // 记录当前形态：字面量路径在生产代码里已归零，全靠单源声明那条
    // （若将来恢复字面量建库，这条要改成两条都 > 0）
    expect(specKeyHits).toBeGreaterThanOrEqual(5);
    expect(literalHits).toBe(0);
  });
});


// ============ 断言 4：storage 异常分支 / 空归属 id / 损坏值 ============
//
// 这一批**只加测试、不改生产逻辑**。每条断言的走向都先在 `src/spaceCache.ts` 里核对过：
//   · `readCacheOwnerSpace`：`try { getItem(...) ?? "" } catch { return "" }`
//     → getItem 抛时**退化为空串**、不向上抛。
//   · `rememberCacheOwnerSpace`：`try { setItem(...) } catch {}`
//     → setItem 抛时**完全吞掉**、不向上抛、也写不进去。
//   · 「清缓存抛错向上抛」是**第三条**路径（IndexedDB，走 clearSpaceScopedBrowserCaches 里的
//     await），已由上面「清缓存失败 → 向上抛且不写记账」覆盖 —— 故这里刻意不重复它。

function securityError(): Error {
  const error = new Error("The operation is insecure.");
  error.name = "SecurityError";
  return error;
}

interface StorageOverrides {
  getItem?: boolean;
  setItem?: boolean;
}

/**
 * 在既有的内存 Map 桩之上叠一层「某些成员抛 SecurityError」的替身，并给出调用计数。
 * 计数用于区分「短路返回」与「真去清了」—— 只看缓存有没有被清，这两条路径可能同解。
 * `seed` 直接写进底层 Map，故不受 override 影响（否则要播种一个 setItem 会抛的桩就得先绕开它）。
 */
function createOverriddenStorageStub(
  overrides: StorageOverrides,
  seed: Record<string, string> = {}
): {
  storage: Storage;
  /** 底层 Map 桩：断言要「缓存里还剩什么」时读它，别走会抛的 storage，否则断言自己先炸了。 */
  base: Storage;
  calls: { getItem: number; setItem: number; removeItem: number };
} {
  const base = createStorageStub();
  for (const [key, value] of Object.entries(seed)) {
    base.setItem(key, value);
  }
  const calls = { getItem: 0, setItem: 0, removeItem: 0 };
  const storage: Storage = {
    get length() {
      return base.length;
    },
    key: (index: number) => base.key(index),
    getItem: (key: string) => {
      calls.getItem += 1;
      if (overrides.getItem) throw securityError();
      return base.getItem(key);
    },
    setItem: (key: string, value: string) => {
      calls.setItem += 1;
      if (overrides.setItem) throw securityError();
      base.setItem(key, value);
    },
    removeItem: (key: string) => {
      calls.removeItem += 1;
      base.removeItem(key);
    },
    clear: () => base.clear()
  };
  return { storage, base, calls };
}

describe("storage 异常与边界输入", () => {
  test("getItem 抛 SecurityError → 读归属退化为空串，不向上抛", () => {
    // 前提：底层**本来是有记账的**。若不播种，这条断言在「读本就失败」的桩上也照样成立，
    // 就成了恒绿 —— 播种之后「能读出 default」与「读成空串」才构成对照。
    const probe = createOverriddenStorageStub(
      { getItem: true },
      { [SPACE_CACHE_OWNER_STORAGE_KEY]: "default" }
    );
    (globalThis as any).localStorage = probe.storage;

    expect(readCacheOwnerSpace()).toBe("");
    expect(probe.calls.getItem).toBe(1);

    // 「退回空串」与「抛出去」是两件事，必须钉住是前者：抛出去会被 runStartupGate 的 catch
    // 判成「本地缓存未清理干净」，**归属对齐整段被跳过**（`appStartup.ts:23-27`）。
    // 空串则让闸门走「只记不清」，仍会记上新空间。
  });

  test("setItem 抛 SecurityError → 记账静默丢弃，不向上抛、也写不进去", () => {
    const probe = createOverriddenStorageStub({ setItem: true });
    (globalThis as any).localStorage = probe.storage;

    expect(() => rememberCacheOwnerSpace("张三")).not.toThrow();
    expect(probe.calls.setItem).toBe(1);
    // 写不进去 = 下次启动仍读到「无归属」。这是**有意**的降级（源码注释：不阻断主流程），
    // 代价是该浏览器上每次启动都要重走闸门。钉住它是为了别有人顺手把它改成向上抛 ——
    // 那会让 runStartupGate 弹出「缓存未清理干净」，而 localStorage 其实一条都没在清。
    expect(readCacheOwnerSpace()).toBe("");
  });

  test("读写都抛 → 两个都不抛：闸门既不报错也不清缓存", async () => {
    const dirty = SPACE_SCOPED_LOCAL_STORAGE_KEYS[0];
    const probe = createOverriddenStorageStub(
      { getItem: true, setItem: true },
      { [SPACE_CACHE_OWNER_STORAGE_KEY]: "default", [dirty]: "dirty" }
    );
    (globalThis as any).localStorage = probe.storage;

    // 「读抛还是写抛」的答案：**两个都不抛**。别拿上面那条 IndexedDB 失败向上抛的用例当对照，
    // 那是第三条路径（clearSpaceScopedBrowserCaches 里的 await）。
    await expect(reconcileSpaceCacheOwnership("张三")).resolves.toBeUndefined();

    // 读抛 → 归属读成空串 → 命中「无记账 → 只记不清」，故一次 removeItem 都不该发生。
    // 只断言「缓存还在」是不够的：即使真调了 clear，被抛异常的 clearKeys 也会逐项吞掉、
    // 于是「还在」照样成立。计数才是能区分两条路径的那个观察点。
    // 内容要从底层桩读：走 storage.getItem 会自己再抛一次，那抛的是断言而不是被测代码。
    expect(probe.calls.removeItem).toBe(0);
    expect(probe.base.getItem(dirty)).toBe("dirty");
    // 计数先落袋再读，免得后续断言自己的读把数字推高
    const { getItem: getItemCalls, setItem: setItemCalls } = probe.calls;
    expect([getItemCalls, setItemCalls]).toEqual([1, 1]);
  });

  test("空 resolvedSpaceId 连调三次（有旧记账）→ 第一次清完并把记账写成空串，后两次全部短路", async () => {
    const dirty = SPACE_SCOPED_LOCAL_STORAGE_KEYS[0];
    const probe = createOverriddenStorageStub(
      {},
      { [SPACE_CACHE_OWNER_STORAGE_KEY]: "default", [dirty]: "dirty" }
    );
    (globalThis as any).localStorage = probe.storage;
    const db = await initDeviceLibraryDB();
    await db.put("templates", { kind: "seed-kind", custom: true });

    await reconcileSpaceCacheOwnership("");

    expect(localStorage.getItem(dirty)).toBeNull();
    expect(await (await initDeviceLibraryDB()).getAll("templates")).toEqual([]);
    // 记账被写成空串 —— 而它与「无记账」不可区分，见下一个缺陷用例
    expect(readCacheOwnerSpace()).toBe("");
    expect(probe.calls.removeItem).toBeGreaterThan(0);

    // 第 2、3 次：owner 已是空串，与空串参数相等 → 第一行就早退。
    // 重新弄脏缓存后再调，才看得出「早退」而不是「清了但清了别的」。
    localStorage.setItem(dirty, "dirty-after");
    probe.calls.removeItem = 0;
    probe.calls.setItem = 0;
    probe.calls.getItem = 0;
    await reconcileSpaceCacheOwnership("");
    await reconcileSpaceCacheOwnership("");
    expect(probe.calls.removeItem).toBe(0);
    expect(probe.calls.setItem).toBe(0);
    expect(probe.base.getItem(dirty)).toBe("dirty-after");
    // 每次调用都重新读一次归属（没有记忆化），所以短路是「读到了相等」而不是「上次做过了」
    expect(probe.calls.getItem).toBe(2);
  });

  test("空 resolvedSpaceId 连调三次（无旧记账）→ 每次都在第一行早退，记账永远写不进去", async () => {
    const dirty = SPACE_SCOPED_LOCAL_STORAGE_KEYS[0];
    const probe = createOverriddenStorageStub({}, { [dirty]: "dirty" });
    (globalThis as any).localStorage = probe.storage;

    await reconcileSpaceCacheOwnership("");
    await reconcileSpaceCacheOwnership("");
    await reconcileSpaceCacheOwnership("");

    expect(probe.calls.removeItem).toBe(0);
    expect(probe.calls.setItem).toBe(0);
    expect(localStorage.getItem(dirty)).toBe("dirty");
    expect(readCacheOwnerSpace()).toBe("");
  });

  test("【缺陷】空串记账与无记账不可区分 → 下次切到真实空间时被当成首次打开，缓存不清", async () => {
    // 这不是假设出来的状态：正是上一个「有旧记账」用例连调后留下的那一条 ——
    // `rememberCacheOwnerSpace("")` 写下的空串。`getItem` 返回空串、`?? ""` 不改变它，
    // 于是空串与「从未记过账」完全同形。
    const dirty = SPACE_SCOPED_LOCAL_STORAGE_KEYS[0];
    const probe = createOverriddenStorageStub(
      {},
      { [SPACE_CACHE_OWNER_STORAGE_KEY]: "", [dirty]: "dirty-from-previous-space" }
    );
    (globalThis as any).localStorage = probe.storage;

    await reconcileSpaceCacheOwnership("张三");

    // 方向是**漏清**：上一空间的缓存原封不动地被算到新空间头上，
    // 即 S2（后端读空 → 回写本地缓存把旧空间内容推给新空间）在这条路径上不设防。
    // 记账还已被盖成新空间 —— 错误前提被固化，下一次启动连补救的机会都没有。
    expect(localStorage.getItem(dirty)).toBe("dirty-from-previous-space");
    expect(readCacheOwnerSpace()).toBe("张三");
  });

  test("合法 id 的正常路径回归：先清后记，且同 id 再调一次不再清", async () => {
    const localKey = SPACE_SCOPED_LOCAL_STORAGE_KEYS[0];
    const sessionKey = SPACE_SCOPED_SESSION_STORAGE_KEYS[0];
    const probe = createOverriddenStorageStub(
      {},
      { [SPACE_CACHE_OWNER_STORAGE_KEY]: "default", [localKey]: "dirty" }
    );
    (globalThis as any).localStorage = probe.storage;
    sessionStorage.setItem(sessionKey, "dirty");
    const db = await initDeviceLibraryDB();
    await db.put("templates", { kind: "seed-kind", custom: true });

    await reconcileSpaceCacheOwnership("张三");

    expect(localStorage.getItem(localKey)).toBeNull();
    expect(sessionStorage.getItem(sessionKey)).toBeNull();
    expect(await (await initDeviceLibraryDB()).getAll("templates")).toEqual([]);
    // 记账改写为新空间，且整轮只写了一次
    expect(readCacheOwnerSpace()).toBe("张三");
    expect(probe.calls.setItem).toBe(1);

    // 同 id 再来一次 → 早退：不重取、也不再清。
    // 这条是上一条的**反面**：两次调用的结果必须不同，否则就是闸门每次启动都白清一遍。
    localStorage.setItem(localKey, "dirty-again");
    sessionStorage.setItem(sessionKey, "dirty-again");
    probe.calls.removeItem = 0;
    probe.calls.setItem = 0;
    await reconcileSpaceCacheOwnership("张三");
    expect(probe.calls.removeItem).toBe(0);
    expect(probe.calls.setItem).toBe(0);
    expect(localStorage.getItem(localKey)).toBe("dirty-again");
    expect(sessionStorage.getItem(sessionKey)).toBe("dirty-again");
  });

  test("记账存的是非法 JSON → 原样读回（不做任何解析），并被当成真实的不同归属而清缓存", async () => {
    const raw = '{"spaceId":"张三"}';
    const dirty = SPACE_SCOPED_LOCAL_STORAGE_KEYS[0];
    const probe = createOverriddenStorageStub(
      {},
      { [SPACE_CACHE_OWNER_STORAGE_KEY]: raw, [dirty]: "dirty" }
    );
    (globalThis as any).localStorage = probe.storage;

    // 关键：这里**没有** JSON.parse 这回事。原样返回字符串，不是解析出的对象、也不是空串。
    // 若哪天给记账引入 JSON 解析，这一条会红 —— 那正是缺陷：一个抛 SyntaxError 的读函数
    // 会把 runStartupGate 的闸门整段跳过，而它同时又清不掉任何东西。
    expect(readCacheOwnerSpace()).toBe(raw);

    await reconcileSpaceCacheOwnership("张三");

    // 方向上是安全的：非空串 → 判成「归属不同且非空」→ 清缓存（宁可多清，不可不清）
    expect(localStorage.getItem(dirty)).toBeNull();
    expect(readCacheOwnerSpace()).toBe("张三");
  });

  test("记账存的是空白串 → 不被 trim，与真正的空串分属两条不同分支", async () => {
    const dirty = SPACE_SCOPED_LOCAL_STORAGE_KEYS[0];
    const probe = createOverriddenStorageStub(
      {},
      { [SPACE_CACHE_OWNER_STORAGE_KEY]: "   ", [dirty]: "dirty" }
    );
    (globalThis as any).localStorage = probe.storage;

    expect(readCacheOwnerSpace()).toBe("   ");

    await reconcileSpaceCacheOwnership("张三");

    // 空白串是**另一个输入维度**：它非空，故必须走清理分支。
    // 若哪天给读函数加了 trim，这条会红 —— 那同样是缺陷（trim 后与无记账同形，见缺陷用例）。
    expect(localStorage.getItem(dirty)).toBeNull();
  });

  test("记账被写成非字符串 → 由存储层强转成字符串后读回，并按真实归属清缓存", async () => {
    const dirty = SPACE_SCOPED_LOCAL_STORAGE_KEYS[0];
    // Storage 契约上 getItem 只可能给出 string | null，故「非字符串」只可能以字符串形式存在。
    // 既有的内存桩与真 localStorage 一样做 String(value)，这里走的正是这条强转。
    for (const raw of [123, undefined, { a: 1 }, null]) {
      const probe = createOverriddenStorageStub({});
      probe.storage.setItem(SPACE_CACHE_OWNER_STORAGE_KEY, raw as unknown as string);
      probe.storage.setItem(dirty, "dirty");
      (globalThis as any).localStorage = probe.storage;

      expect(readCacheOwnerSpace()).toBe(String(raw));

      await reconcileSpaceCacheOwnership("张三");
      expect(localStorage.getItem(dirty)).toBeNull();
    }
  });

  test("localStorage 整个不存在 → 读退化为空串、写静默丢弃，都不抛", () => {
    (globalThis as any).localStorage = undefined;
    // 钉住前提：生产代码走的是 `typeof localStorage === "undefined"` 早退分支，
    // 不是靠 try/catch 兜住一次 ReferenceError。
    expect(typeof localStorage).toBe("undefined");

    expect(readCacheOwnerSpace()).toBe("");
    expect(() => rememberCacheOwnerSpace("张三")).not.toThrow();
  });
});