# 多用户工作空间 · 后端空间隔离 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让后端按空间标识读写隔离的数据目录，使同一部署下多个空间（方案树、模型、自定义图元、图片库、配色、量测配置、全局线路）互不可见；default 空间沿用现有 `data/` 数据根，行为一字不变。

**Architecture:** 新增两个纯逻辑模块 `spaceId.mjs`（id 生成校验）与 `spaceStore.mjs`（注册表 + 路径工厂 + 请求解析）。把 `server.mjs` 里模块顶层的 11 个路径常量替换为按空间计算的 `SpacePaths` 对象，通过 `options.paths ?? defaultPaths` 显式透传到各 helper（不用 AsyncLocalStorage）。HTTP 派发处解析空间标识并注入 `ctx.paths`。这是两阶段计划的**第一阶段（后端）**；前端切换器见 `2026-09-13-multi-workspace-frontend.md`（第二阶段，依赖本阶段的 `GET /webgrp/spaces`）。

**Tech Stack:** Node.js 24（ESM `.mjs`）、Node 内置 `node:fs/promises`、`node:path`、Vitest 3、`ws` 8。

## Global Constraints

- Node 下限 **24**（`package.json` `engines`）；后端统一 `.mjs`（ESM）。
- 后端若 `import` `src/**` 下的 TS 模块，**相对 import 必须带 `.ts` 扩展名，且不得 import `.tsx`**（`allowImportingTsExtensions`）。
- 测试与源文件**同目录**，命名 `*.test.mjs`。
- 测试数据隔离：`GRAPH_MODEL_DATA_DIR` 环境变量指向 tmpdir。注意 `server.mjs` 在**模块加载时**求值一次该变量，故测试须先设 env 再 `await import("./server.mjs")`。
- **仓库 `data/` 必须保持扁平布局**（`data/schemes`、`data/device-library`、`data/images`、`data/settings` 就地不动）。9 个后端测试的 27 处 `join(dataDir, …)` 与 3 个前端/后端测试直读仓库 `data/`，都依赖这一点。
- 写盘统一走已有的 `writeTextIfChanged` → `atomicWriteFile`（tmp + rename）。
- 需要串行化的读-改-写，用 Promise 队列（照抄 `server.mjs:339-344` 的 `withImageStoreLock` 或 `globalLineRegistry.mjs:653` 的 `locked()` 模式），不引入新依赖。
- 代码注释用**中文**，UTF-8。
- 新增/改动 `server/*.mjs` 对 `src/**/*.ts` 的 import 后必须跑 `pnpm audit:names`。
- v1 端点响应一律信封：`{ok:true,data}` / `{ok:false,error:{code,message}}`；错误码→HTTP：`bad-request`→400、`not-found`→404、`no-online-client`→503、`internal`→500。
- **不改前端任何文件**（本阶段）；`src/**` 只读。
- 空间标识解析优先级固定为：`X-Space` 头 > `?space=` query > `Cookie: gmp_space` > 回退 `spaces[0]`。
- 迭代中保持既有测试全绿：`pnpm vitest run server/`。

---

## File Structure

| 文件 | 职责 | 动作 |
|------|------|------|
| `server/spaceId.mjs` | 空间 id 的生成与校验（纯函数，无 IO） | 新建 |
| `server/spaceId.test.mjs` | 上述测试 | 新建 |
| `server/spaceStore.mjs` | 注册表 CRUD、`SpacePaths` 工厂、请求解析、越界断言 | 新建 |
| `server/spaceStore.test.mjs` | 上述测试 | 新建 |
| `server/server.mjs` | 路径常量 → `paths` 透传；派发点注入；4 个管理端点；CORS | 修改（主要工作量） |
| `server/svgExport.mjs` | `renderSavedModelSvg` 加 `paths` 入参；6 个 helper 调用点 | 修改 |
| `server/eFileExport.mjs` | `buildEFileForSavedModel` 加 `paths` 入参 | 修改 |
| `server/cimExport.mjs` | `readMeasurementConfig` 调用点 | 修改 |
| `server/sendModel.mjs` | 透传 `paths` | 修改 |
| `server/apiV1Schemes.mjs` | 删自建 `getSchemeDataDir()`，改 `ctx.paths` | 修改 |
| `server/apiV1Library.mjs` | 5 处 helper 调用点加 `paths` | 修改 |
| `server/runtimeRegistry.mjs` | 客户端条目加 `workspaceId`；`pickDefaultClient` 支持按空间筛选 | 修改 |
| `server/runtimeWs.mjs` | connection 回调接住 `request`，取空间标识 | 修改 |
| `server/swaggerPage.mjs` | `SWIGGER_ENDPOINTS` 加 `scope` 字段与 4 个新端点；页首空间下拉 | 修改 |
| `server/spaceScope.test.mjs` | 端到端集成测试（起真实 server，端口 0） | 新建 |
| `server/schemeArchiveRealtime.test.mjs` | 改写「自定义 filesRoot 报错」那条测试 | 修改 |
| `server/runtimeRegistry.test.mjs` | 补空间筛选测试 | 修改 |
| `server/swigger.examples.test.mjs` | 补 4 个新端点的期望分支 | 修改 |

---

### Task 1: `server/spaceId.mjs` — 空间 id 生成与校验

**Files:**
- Create: `server/spaceId.mjs`
- Test: `server/spaceId.test.mjs`

**Interfaces:**
- Consumes: 无（纯函数，零依赖）
- Produces:
  - `spaceIdFromName(name: string, taken?: string[]): string`
  - `isValidSpaceId(id: unknown): boolean`
  - `isReservedSpaceId(id: unknown): boolean`

- [ ] **Step 1: 写失败测试**

Create `server/spaceId.test.mjs`:

```js
// 空间 id 生成与校验：允许中文（目录可读性），排除路径分隔符与 Windows 保留名。
import { expect, test } from "vitest";
import { spaceIdFromName, isValidSpaceId, isReservedSpaceId } from "./spaceId.mjs";

test("中文名直接用作 id", () => {
  expect(spaceIdFromName("张三")).toBe("张三");
});

test("空格与路径分隔符折叠为连字符", () => {
  expect(spaceIdFromName("张 三")).toBe("张-三");
  expect(spaceIdFromName("李四/测试")).toBe("李四-测试");
  expect(spaceIdFromName("a\\b")).toBe("a-b");
});

test("连续合法分隔符折叠，首尾连字符剥除", () => {
  expect(spaceIdFromName("--a---b--")).toBe("a-b");
});

test("冲突时追加 -2 -3", () => {
  expect(spaceIdFromName("李四", ["李四"])).toBe("李四-2");
  expect(spaceIdFromName("李四", ["李四", "李四-2"])).toBe("李四-3");
});

test("冲突判定不区分大小写（NTFS 语义）", () => {
  expect(spaceIdFromName("Abc", ["abc"])).toBe("Abc-2");
});

test("Windows 保留名加下划线前缀", () => {
  expect(spaceIdFromName("con")).toBe("_con");
  expect(spaceIdFromName("COM1")).toBe("_COM1");
  expect(isReservedSpaceId("con")).toBe(true);
});

test("全符号名兜底为 space", () => {
  expect(spaceIdFromName("🎉")).toBe("space");
  expect(spaceIdFromName("   ")).toBe("space");
});

test("截断至 40 字符，且冲突后缀不撑破上限", () => {
  const long = "字".repeat(50);
  expect(spaceIdFromName(long)).toBe("字".repeat(40));
  expect([...spaceIdFromName(long, ["字".repeat(40)])].length).toBe(40);
});

test("非法 id 被拒绝", () => {
  for (const bad of ["", "-a", "a/b", "a\\b", "a.b", "a b", "字".repeat(41), 123, null]) {
    expect(isValidSpaceId(bad)).toBe(false);
  }
  for (const ok of ["default", "张三", "_con", "a", "a-b_c", "字".repeat(40)]) {
    expect(isValidSpaceId(ok)).toBe(true);
  }
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm vitest run server/spaceId.test.mjs`
Expected: FAIL —— `Failed to resolve import "./spaceId.mjs"`

- [ ] **Step 3: 写实现**

Create `server/spaceId.mjs`:

```js
// 空间 id 生成与校验。允许中文/Unicode 字母：方案树目录本就是中文，
// 目录可读性对运维有实值；排除路径分隔符与 Windows 保留名防穿越与歧义。

const RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;
const ID_OK = /^[\p{L}\p{N}_][\p{L}\p{N}_-]{0,39}$/u;
const MAX_LEN = 40;

export const isValidSpaceId = (id) => typeof id === "string" && ID_OK.test(id);

export const isReservedSpaceId = (id) => RESERVED.test(String(id ?? ""));

// 名称 → 唯一 id。taken 为已有 id 列表。
export function spaceIdFromName(name, taken = []) {
  const text = String(name ?? "").normalize("NFKC").trim();
  let base = text
    .replace(/[^\p{L}\p{N}_-]+/gu, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");
  base = [...base].slice(0, MAX_LEN).join("");
  if (!base) base = "space";
  if (RESERVED.test(base)) base = `_${base}`;

  const used = new Set(taken.map((id) => String(id).toLowerCase()));
  if (!used.has(base.toLowerCase())) return base;
  for (let n = 2; ; n += 1) {
    const suffix = `-${n}`;
    const candidate = [...base].slice(0, MAX_LEN - suffix.length).join("") + suffix;
    if (!used.has(candidate.toLowerCase())) return candidate;
  }
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm vitest run server/spaceId.test.mjs`
Expected: PASS，9 个用例全绿

- [ ] **Step 5: 提交**

```bash
git add server/spaceId.mjs server/spaceId.test.mjs
git commit -m "feat(server): 空间 id 生成与校验（允许中文，排除保留名与路径分隔符）"
```

---

### Task 2: `server/spaceStore.mjs` — 注册表与路径工厂

**Files:**
- Create: `server/spaceStore.mjs`
- Test: `server/spaceStore.test.mjs`

**Interfaces:**
- Consumes: `spaceIdFromName` / `isValidSpaceId` / `isReservedSpaceId`（Task 1）
- Produces:
  - `createSpaceStore(dataRoot: string): SpaceStore`
  - `SpaceStore` 方法：`ensureInitialized(): Promise<void>`、`list(): Promise<Space[]>`、`create(name: string): Promise<Space>`、`rename(id: string, name: string): Promise<void>`、`remove(id: string): Promise<void>`、`resolvePaths(id: string): SpacePaths`、`has(id: string): boolean`、`firstId(): string`、`touchLastAccess(id: string): Promise<void>`
  - `Space = { id: string, name: string, pinned: boolean, createdAt: string, lastAccessAt?: string }`
  - `SpacePaths = { root, images, icons, schemes, schemeFiles, schemeTrash, settings, colorConfig, measurementConfig, deviceLibraryDir, deviceLibrary, manifest, imageFolders }`（均为绝对路径字符串）
  - `assertInSpace(id: string, root: string, dataRoot: string): void`

- [ ] **Step 1: 写失败测试**

Create `server/spaceStore.test.mjs`:

```js
// 空间注册表：default 空间直接用数据根（不搬迁既有 data/），其余在 workspaces/ 下。
import { expect, test, beforeEach, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, existsSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createSpaceStore, assertInSpace } from "./spaceStore.mjs";

let dataRoot;
beforeEach(() => { dataRoot = mkdtempSync(join(tmpdir(), "space-store-")); });
afterEach(() => { rmSync(dataRoot, { recursive: true, force: true }); });

const spacesFile = () => join(dataRoot, "spaces.json");

test("初始化写入 default 且 pinned，default 根即数据根", async () => {
  const store = createSpaceStore(dataRoot);
  await store.ensureInitialized();
  const spaces = await store.list();
  expect(spaces).toHaveLength(1);
  expect(spaces[0]).toMatchObject({ id: "default", pinned: true });
  expect(store.resolvePaths("default").root).toBe(dataRoot);
  expect(store.resolvePaths("default").schemeFiles).toBe(join(dataRoot, "schemes", "files"));
});

test("非 default 空间落在 workspaces/ 下且各路径齐备", async () => {
  const store = createSpaceStore(dataRoot);
  await store.ensureInitialized();
  const space = await store.create("张三");
  expect(space.id).toBe("张三");
  const paths = store.resolvePaths("张三");
  expect(paths.root).toBe(join(dataRoot, "workspaces", "张三"));
  expect(paths.deviceLibrary).toBe(join(paths.root, "device-library", "library.json"));
  expect(paths.colorConfig).toBe(join(paths.root, "settings", "color-config.json"));
});

test("初始化是幂等的，重复调用不丢已有空间", async () => {
  const store = createSpaceStore(dataRoot);
  await store.ensureInitialized();
  await store.create("张三");
  await store.ensureInitialized();
  expect((await store.list()).map((s) => s.id)).toEqual(["default", "张三"]);
});

test("重名建空间自动去重 id", async () => {
  const store = createSpaceStore(dataRoot);
  await store.ensureInitialized();
  await store.create("李四");
  expect((await store.create("李四")).id).toBe("李四-2");
});

test("改名只改 name，不动目录", async () => {
  const store = createSpaceStore(dataRoot);
  await store.ensureInitialized();
  await store.create("张三");
  await store.rename("张三", "张三丰");
  const space = (await store.list()).find((s) => s.id === "张三");
  expect(space.name).toBe("张三丰");
  expect(existsSync(join(dataRoot, "workspaces", "张三"))).toBe(true);
});

test("扫描 workspaces/ 补登记，非法目录名跳过", async () => {
  mkdirSync(join(dataRoot, "workspaces", "手工空间"), { recursive: true });
  // 注意：只能用「Windows 上建得出但 id 非法」的名字。
  // 不能建 workspaces/bad/name 来测「跳过」—— readdir 看到的是 bad 这个目录，
  // 而 "bad" 本身是合法 id，会被正常登记，断言必红。
  mkdirSync(join(dataRoot, "workspaces", "a b"), { recursive: true });          // 含空格 → 非法
  mkdirSync(join(dataRoot, "workspaces", "字".repeat(41)), { recursive: true }); // 超 40 字符 → 非法
  const store = createSpaceStore(dataRoot);
  await store.ensureInitialized();
  const ids = (await store.list()).map((s) => s.id);
  expect(ids).toContain("default");
  expect(ids).toContain("手工空间");
  expect(ids).not.toContain("a b");
  expect(ids).not.toContain("字".repeat(41));
});

test("注册表损坏时重建", async () => {
  writeFileSync(spacesFile(), "{ 不是 JSON", "utf-8");
  const store = createSpaceStore(dataRoot);
  await store.ensureInitialized();
  expect((await store.list()).map((s) => s.id)).toEqual(["default"]);
});

test("pinned 与最后一个空间不可删", async () => {
  const store = createSpaceStore(dataRoot);
  await store.ensureInitialized();
  await expect(store.remove("default")).rejects.toThrow(/pinned|最后一个/);
});

test("删除空间把目录移入 trash-spaces 而非真删", async () => {
  const store = createSpaceStore(dataRoot);
  await store.ensureInitialized();
  await store.create("张三");
  mkdirSync(store.resolvePaths("张三").schemes, { recursive: true });
  await store.remove("张三");
  expect(existsSync(join(dataRoot, "workspaces", "张三"))).toBe(false);
  expect(existsSync(join(dataRoot, "trash-spaces"))).toBe(true);
  expect((await store.list()).map((s) => s.id)).toEqual(["default"]);
});

test("并发写注册表不丢条目", async () => {
  const store = createSpaceStore(dataRoot);
  await store.ensureInitialized();
  await Promise.all(["a", "b", "c", "d", "e"].map((n) => store.create(n)));
  const ids = (await store.list()).map((s) => s.id).sort();
  expect(ids).toEqual(["a", "b", "c", "d", "default", "e"]);
  expect(JSON.parse(readFileSync(spacesFile(), "utf-8")).spaces).toHaveLength(6);
});

test("首次空间是数组第一项，新建追加末尾", async () => {
  const store = createSpaceStore(dataRoot);
  await store.ensureInitialized();
  await store.create("张三");
  expect(store.firstId()).toBe("default");
});

test("越界断言特判 default（default 根不在 workspaces 之下）", () => {
  expect(() => assertInSpace("default", dataRoot, dataRoot)).not.toThrow();
  expect(() => assertInSpace("default", join(dataRoot, "workspaces", "x"), dataRoot)).toThrow(/default/);
  expect(() => assertInSpace("张三", join(dataRoot, "workspaces", "张三"), dataRoot)).not.toThrow();
  expect(() => assertInSpace("张三", join(dataRoot, "elsewhere"), dataRoot)).toThrow(/越界/);
});

test("resolvePaths 对未知空间抛错", async () => {
  const store = createSpaceStore(dataRoot);
  await store.ensureInitialized();
  expect(() => store.resolvePaths("不存在")).toThrow(/未知空间/);
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm vitest run server/spaceStore.test.mjs`
Expected: FAIL —— `Failed to resolve import "./spaceStore.mjs"`

- [ ] **Step 3: 写实现**

Create `server/spaceStore.mjs`:

```js
// 空间注册表 + 路径工厂 + 越界断言。
// default 空间直接复用数据根：既有 data/ 原地不动（9 个后端测试与 3 处测试
// 直读仓库 data/ 的扁平布局，搬迁会让它们静默失效）。
import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, rename, writeFile } from "node:fs/promises";
import { join, resolve, sep } from "node:path";
import { spaceIdFromName, isValidSpaceId, isReservedSpaceId } from "./spaceId.mjs";

const SCHEMA_VERSION = 1;
const DEFAULT_SPACE_ID = "default";
const SPACES_DIR_NAME = "workspaces";
const TRASH_DIR_NAME = "trash-spaces";

// 越界双保险：必须特判 default —— 它的根是 dataRoot，不在 workspacesRoot 之下。
export function assertInSpace(id, root, dataRoot) {
  const resolved = resolve(root);
  if (id === DEFAULT_SPACE_ID) {
    if (resolved !== resolve(dataRoot)) {
      throw new Error("default 空间的根必须等于数据根。");
    }
    return;
  }
  const base = resolve(dataRoot, SPACES_DIR_NAME);
  if (resolved !== base && !resolved.startsWith(base + sep)) {
    throw new Error(`空间「${id}」路径越界：${resolved}`);
  }
}

// 某一空间的全部路径（纯字符串拼接，无 IO）
export function spacePathsFor(dataRoot, id) {
  const root = id === DEFAULT_SPACE_ID
    ? resolve(dataRoot)
    : join(resolve(dataRoot), SPACES_DIR_NAME, id);
  const images = join(root, "images");
  const settings = join(root, "settings");
  const deviceLibraryDir = join(root, "device-library");
  const schemes = join(root, "schemes");
  return {
    root,
    images,
    icons: join(root, "icons"),
    schemes,
    schemeFiles: join(schemes, "files"),
    schemeTrash: join(schemes, "trash"),
    settings,
    colorConfig: join(settings, "color-config.json"),
    measurementConfig: join(settings, "measurement-config.json"),
    deviceLibraryDir,
    deviceLibrary: join(deviceLibraryDir, "library.json"),
    manifest: join(images, "manifest.json"),
    imageFolders: join(images, "folders.json")
  };
}

export function createSpaceStore(dataRoot) {
  const resolvedRoot = resolve(dataRoot);
  const spacesFile = join(resolvedRoot, "spaces.json");
  const workspacesRoot = join(resolvedRoot, SPACES_DIR_NAME);

  let state = null;              // { schemaVersion, spaces: Space[] }
  let modelLock = Promise.resolve();   // 注册表读-改-写串行化

  const locked = (task) => {
    const run = modelLock.then(task, task);
    modelLock = run.then(() => undefined, () => undefined);
    return run;
  };

  async function writeState(next) {
    await mkdir(resolvedRoot, { recursive: true });
    const tmp = `${spacesFile}.${process.pid}.tmp`;
    await writeFile(tmp, JSON.stringify(next, null, 2), "utf-8");
    await rename(tmp, spacesFile);
    state = next;
  }

  function normalizeSpace(raw) {
    const id = String(raw?.id ?? "");
    return {
      id,
      name: String(raw?.name ?? id),
      pinned: id === DEFAULT_SPACE_ID,
      createdAt: raw?.createdAt ?? new Date().toISOString(),
      ...(raw?.lastAccessAt ? { lastAccessAt: String(raw.lastAccessAt) } : {})
    };
  }

  // 扫描 workspaces/ 补登记手工放入的目录；非法名跳过并告警。
  async function scanWorkspaces(known) {
    let entries = [];
    try {
      entries = await readdir(workspacesRoot, { withFileTypes: true });
    } catch {
      return known;
    }
    const result = [...known];
    const taken = new Set(result.map((s) => s.id.toLowerCase()));
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const id = entry.name;
      if (taken.has(id.toLowerCase())) continue;
      // 与生成路径同一套校验：否则手工放入的 con / 超长名 / 非法字符目录会变成合法空间
      if (!isValidSpaceId(id) || isReservedSpaceId(id)) {
        console.warn(`[空间] 跳过非法空间目录：${id}`);
        continue;
      }
      taken.add(id.toLowerCase());
      result.push(normalizeSpace({ id, name: id }));
    }
    return result;
  }

  async function load() {
    if (state) return state;
    let parsed = null;
    try {
      parsed = JSON.parse(await readFile(spacesFile, "utf-8"));
    } catch {
      parsed = null;
    }
    const rawSpaces = Array.isArray(parsed?.spaces) ? parsed.spaces : [];
    const normalized = rawSpaces
      .map(normalizeSpace)
      .filter((space) => isValidSpaceId(space.id) && !isReservedSpaceId(space.id));
    if (!normalized.some((space) => space.id === DEFAULT_SPACE_ID)) {
      normalized.unshift(normalizeSpace({ id: DEFAULT_SPACE_ID, name: "默认空间" }));
    }
    state = { schemaVersion: SCHEMA_VERSION, spaces: await scanWorkspaces(normalized) };
    return state;
  }

  async function ensureSkeleton(id) {
    const paths = spacePathsFor(resolvedRoot, id);
    // default 空间目录已存在，不新建（避免在数据根下多出空目录）
    if (id !== DEFAULT_SPACE_ID) {
      await mkdir(paths.root, { recursive: true });
    }
    return paths;
  }

  return {
    async ensureInitialized() {
      const current = await load();
      await writeState(current);
    },

    async list() {
      return (await load()).spaces.map((space) => ({ ...space }));
    },

    firstId() {
      const spaces = state?.spaces ?? [];
      return spaces[0]?.id ?? DEFAULT_SPACE_ID;
    },

    has(id) {
      return (state?.spaces ?? []).some((space) => space.id === id);
    },

    resolvePaths(id) {
      const exists = state ? state.spaces.some((s) => s.id === id) : id === DEFAULT_SPACE_ID;
      if (!exists) {
        throw new Error(`未知空间：${id}`);
      }
      const paths = spacePathsFor(resolvedRoot, id);
      assertInSpace(id, paths.root, resolvedRoot);
      return paths;
    },

    async create(name) {
      return locked(async () => {
        const current = await load();
        const id = spaceIdFromName(name, current.spaces.map((s) => s.id));
        const space = normalizeSpace({ id, name: String(name ?? "").trim() || id });
        const next = { ...current, spaces: [...current.spaces, space] };
        await ensureSkeleton(id);
        await writeState(next);
        return { ...space };
      });
    },

    async rename(id, name) {
      return locked(async () => {
        const current = await load();
        const index = current.spaces.findIndex((space) => space.id === id);
        if (index < 0) throw new Error(`未知空间：${id}`);
        const trimmed = String(name ?? "").trim();
        if (!trimmed) throw new Error("空间名不能为空。");
        const spaces = current.spaces.slice();
        // 只改 name，绝不 rename 目录：搬迁用户数据失败一次就是数据事故
        spaces[index] = { ...spaces[index], name: trimmed };
        await writeState({ ...current, spaces });
      });
    },

    async remove(id) {
      return locked(async () => {
        const current = await load();
        if (id === DEFAULT_SPACE_ID) {
          throw new Error("default 空间为 pinned，且是最后一个空间，不可删除。");
        }
        const index = current.spaces.findIndex((space) => space.id === id);
        if (index < 0) throw new Error(`未知空间：${id}`);
        const paths = spacePathsFor(resolvedRoot, id);
        assertInSpace(id, paths.root, resolvedRoot);
        if (existsSync(paths.root)) {
          const stamp = new Date().toISOString().replace(/[:.]/g, "-");
          const trash = join(resolvedRoot, TRASH_DIR_NAME, stamp, id);
          await mkdir(join(resolvedRoot, TRASH_DIR_NAME, stamp), { recursive: true });
          await rename(paths.root, trash);
        }
        const spaces = current.spaces.filter((space) => space.id !== id);
        await writeState({ ...current, spaces });
      });
    },

    async touchLastAccess(id) {
      return locked(async () => {
        const current = await load();
        const index = current.spaces.findIndex((space) => space.id === id);
        if (index < 0) return;
        const spaces = current.spaces.slice();
        spaces[index] = { ...spaces[index], lastAccessAt: new Date().toISOString() };
        await writeState({ ...current, spaces });
      });
    }
  };
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm vitest run server/spaceStore.test.mjs`
Expected: PASS，13 个用例全绿

- [ ] **Step 5: 提交**

```bash
git add server/spaceStore.mjs server/spaceStore.test.mjs
git commit -m "feat(server): 空间注册表与路径工厂，default 空间复用数据根"
```

---

### Task 3: 请求空间解析链

**Files:**
- Modify: `server/spaceStore.mjs`（追加导出）
- Test: `server/spaceStore.test.mjs`（追加）

**Interfaces:**
- Consumes: `SpaceStore`（Task 2）
- Produces:
  - `resolveSpaceFromRequest(request, url, store): { id: string, source: "header"|"query"|"cookie"|"fallback", explicit: boolean }` —— **不抛错**，显式来源未知时返回 `{ id: store.firstId(), explicit: true, unknown: true }` 由调用方决定 HTTP 码
  - `parseSpaceCookie(cookieHeader: string): string`
  - `SPACE_COOKIE_NAME = "gmp_space"`、`SPACE_FALLBACK_HEADER = "X-Space-Fallback"`

- [ ] **Step 1: 写失败测试**

Append to `server/spaceStore.test.mjs`:

```js
import { resolveSpaceFromRequest, parseSpaceCookie, SPACE_COOKIE_NAME } from "./spaceStore.mjs";

const fakeRequest = (headers = {}) => ({ headers });

test("解析优先级：头 > query > cookie > 回退", async () => {
  const store = createSpaceStore(dataRoot);
  await store.ensureInitialized();
  await store.create("张三");
  await store.create("李四");
  const url = new URL("http://x/webgrp/schemes");
  const all = fakeRequest({ "x-space": "张三", cookie: `${SPACE_COOKIE_NAME}=李四` });
  url.searchParams.set("space", "李四");
  expect(resolveSpaceFromRequest(all, url, store)).toMatchObject({ id: "张三", source: "header" });
  const noHeader = fakeRequest({ cookie: `${SPACE_COOKIE_NAME}=李四` });
  expect(resolveSpaceFromRequest(noHeader, url, store)).toMatchObject({ id: "李四", source: "query" });
});

test("仅 cookie 时用 cookie", async () => {
  const store = createSpaceStore(dataRoot);
  await store.ensureInitialized();
  await store.create("张三");
  const url = new URL("http://x/webgrp/schemes");
  const result = resolveSpaceFromRequest(fakeRequest({ cookie: `${SPACE_COOKIE_NAME}=张三` }), url, store);
  expect(result).toMatchObject({ id: "张三", source: "cookie", explicit: false });
});

test("cookie 未知（已删空间）静默回退首个，不报错", async () => {
  const store = createSpaceStore(dataRoot);
  await store.ensureInitialized();
  const url = new URL("http://x/webgrp/schemes");
  const result = resolveSpaceFromRequest(fakeRequest({ cookie: `${SPACE_COOKIE_NAME}=没了` }), url, store);
  expect(result).toMatchObject({ id: "default", source: "fallback", explicit: false, unknown: false });
});

test("显式来源未知（头或 query）标记 unknown 交由调用方 400", async () => {
  const store = createSpaceStore(dataRoot);
  await store.ensureInitialized();
  const url = new URL("http://x/webgrp/schemes");
  url.searchParams.set("space", "没了");
  expect(resolveSpaceFromRequest(fakeRequest(), url, store)).toMatchObject({
    id: "default", source: "query", explicit: true, unknown: true
  });
  expect(resolveSpaceFromRequest(fakeRequest({ "x-space": "没了" }), new URL("http://x/"), store))
    .toMatchObject({ id: "default", source: "header", explicit: true, unknown: true });
});

test("完全无来源回退首个", async () => {
  const store = createSpaceStore(dataRoot);
  await store.ensureInitialized();
  expect(resolveSpaceFromRequest(fakeRequest(), new URL("http://x/"), store))
    .toMatchObject({ id: "default", source: "fallback", explicit: false });
});

test("cookie 解析：多 cookie、编码值、空值", () => {
  expect(parseSpaceCookie(`a=1; ${SPACE_COOKIE_NAME}=张三; b=2`)).toBe("张三");
  expect(parseSpaceCookie(`${SPACE_COOKIE_NAME}=${encodeURIComponent("张 三")}`)).toBe("张 三");
  expect(parseSpaceCookie("")).toBe("");
  expect(parseSpaceCookie("other=1")).toBe("");
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm vitest run server/spaceStore.test.mjs`
Expected: FAIL —— `resolveSpaceFromRequest is not a function`（或 import 报错）

- [ ] **Step 3: 写实现**

Append to `server/spaceStore.mjs`:

```js
export const SPACE_COOKIE_NAME = "gmp_space";
export const SPACE_FALLBACK_HEADER = "X-Space-Fallback";

export function parseSpaceCookie(cookieHeader) {
  for (const part of String(cookieHeader ?? "").split(";")) {
    const index = part.indexOf("=");
    if (index < 0) continue;
    if (part.slice(0, index).trim() !== SPACE_COOKIE_NAME) continue;
    const raw = part.slice(index + 1).trim();
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  }
  return "";
}

// 解析优先级：X-Space 头 > ?space= > Cookie > 回退 spaces[0]。
// 显式来源（头/query）未知时置 unknown，由调用方返回 400 —— 脚本显式写错空间
// 却静默落到别处会污染错的空间，是最难查的一类 bug。
// 隐式来源（cookie）未知时静默回退：旧书签、清过 cookie 的浏览器不该白屏。
export function resolveSpaceFromRequest(request, url, store) {
  const header = String(request?.headers?.["x-space"] ?? "").trim();
  const query = String(url?.searchParams?.get("space") ?? "").trim();
  const cookie = parseSpaceCookie(request?.headers?.cookie);

  for (const [value, source] of [[header, "header"], [query, "query"]]) {
    if (!value) continue;
    if (store.has(value)) return { id: value, source, explicit: true, unknown: false };
    // unknownValue 供调用方在 400 响应里说清是哪个 id 被拒
    return { id: store.firstId(), source, explicit: true, unknown: true, unknownValue: value };
  }
  if (cookie && store.has(cookie)) {
    return { id: cookie, source: "cookie", explicit: false, unknown: false };
  }
  return { id: store.firstId(), source: "fallback", explicit: false, unknown: false };
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm vitest run server/spaceStore.test.mjs`
Expected: PASS，19 个用例全绿

- [ ] **Step 5: 提交**

```bash
git add server/spaceStore.mjs server/spaceStore.test.mjs
git commit -m "feat(server): 空间标识解析链（头 > query > cookie > 回退）"
```

---

### Task 4: `paths` 基础设施 + schemes 域 11 个函数接参

**Files:**
- Modify: `server/server.mjs:28-44`（常量块）、`:466`、`:491`、`:3015`、`:3118`、`:3158`、`:3208`、`:3228`、`:3373`、`:3389`、`:3439`、`:3499`
- Test: `server/schemePathsScope.test.mjs`（新建）

**Interfaces:**
- Consumes: `spacePathsFor`（Task 2）
- Produces:
  - `defaultPaths: SpacePaths`（`server.mjs` 模块级导出）—— 等价于 `spacePathsFor(dataRoot, "default")`
  - 上述 11 个函数新增/改用的统一入参形态：`options.paths ?? defaultPaths`
  - **参数命名约定**：新代码只写 `options.paths`；既有的 `options.filesRoot` / `options.trashRoot` 保留为兼容别名（既有测试在用），但不得新增调用点

- [ ] **Step 1: 写失败测试**

Create `server/schemePathsScope.test.mjs`:

```js
// 方案域函数接受 options.paths，可指向任意数据根（空间）。
import { expect, test, beforeEach, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { installDomShim } from "./domShim.mjs";

installDomShim();

let dataDir;
beforeEach(() => { dataDir = mkdtempSync(join(tmpdir(), "scheme-paths-")); });
afterEach(() => { rmSync(dataDir, { recursive: true, force: true }); });

test("readSchemes 按 paths 读指定根的模型", async () => {
  process.env.GRAPH_MODEL_DATA_DIR = dataDir;
  const { readSchemes, defaultPaths } = await import("./server.mjs");
  const spaceDir = join(dataDir, "workspaces", "张三");
  const filesDir = join(spaceDir, "schemes", "files", "测试方案");
  mkdirSync(filesDir, { recursive: true });
  writeFileSync(join(filesDir, "模型A.json"), JSON.stringify({
    version: 1, name: "模型A", canvasWidth: 800, canvasHeight: 400,
    layers: [{ id: "default", name: "默认图层", visible: true }],
    activeLayerId: "default", nodes: [], edges: []
  }), "utf-8");

  const paths = { ...defaultPaths, root: spaceDir, schemes: join(spaceDir, "schemes"), schemeFiles: join(spaceDir, "schemes", "files") };
  const spaceSchemes = await readSchemes({ paths, includeProjects: true });
  const flatSchemes = await readSchemes({ includeProjects: true });
  expect(JSON.stringify(spaceSchemes)).toContain("模型A");
  expect(JSON.stringify(flatSchemes)).not.toContain("模型A");
  delete process.env.GRAPH_MODEL_DATA_DIR;
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm vitest run server/schemePathsScope.test.mjs`
Expected: FAIL —— `readSchemes` 忽略 `options.paths`，`flatSchemes` 也含「模型A」

- [ ] **Step 3: 写实现**

在 `server/server.mjs:28` 之后插入 `defaultPaths`（**不要删旧的 11 个常量**，本任务先并存，Task 8 末再统一清理）：

把 `spacePathsFor` 的 import 加进 `server.mjs` **顶部的既有 import 块**（与 `createGlobalLineRegistry`、`isModelJsonFile` 等并列），不要写在文件中部；`export const defaultPaths` 则紧跟 `:28` 的 `dataRoot` 声明之后。无循环依赖：`spaceStore.mjs` 只 import `spaceId.mjs` 与 `node:*`，不 import `server.mjs`。

```js
// 顶部 import 块追加
import { spacePathsFor } from "./spaceStore.mjs";

// 数据根声明之后
// 默认（default 空间）路径集合。11 个模块级路径常量保留为兼容别名，新代码一律走 paths。
// 必须 export：spacePathsScope / spaceConfigPaths / spaceImagePaths / spaceExportPaths
// 四个测试文件都从本模块解构它来拼各空间 paths。
export const defaultPaths = spacePathsFor(dataRoot, "default");
```

然后对下列 11 个函数逐个施加同一变换（**逐个函数独立完成，勿批量替换**）：

1. `readSchemesFromFiles(options)`（`:466`）
2. `readSchemes(options)`（`:491`）
3. `archiveStaleSchemeFiles(filesRoot, …, options)`（`:3015`）
4. `createSchemeArchiveBuffer(options)`（`:3118`）
5. `importSchemeArchiveBuffer(options)`（`:3158`）
6. `saveSchemeRecordDirectory(options)`（`:3208`）
7. `deleteSchemeRecordDirectory(options)`（`:3228`）
8. `readSchemeProjectRecord(options)`（`:3373`）
9. `findSchemeProjectRecordByIndex(options)`（`:3389`）
10. `saveSchemeProjectRecord(options)`（`:3439`）
11. `deleteSchemeProjectRecord(options)`（`:3499`）

变换公式（以 `readSchemesFromFiles` 为例）：

```js
// 改前
async function readSchemesFromFiles(options = {}) {
  const filesRoot = options.filesRoot ?? join(schemeDataDir, "files");
  …
}

// 改后
async function readSchemesFromFiles(options = {}) {
  const paths = options.paths ?? defaultPaths;
  const filesRoot = options.filesRoot ?? paths.schemeFiles;
  …
}
```

`archiveStaleSchemeFiles` 与 4 个 `*SchemeProjectRecord` / `*SchemeRecordDirectory` 额外用到 `schemeTrashDir` 的，同样改为 `options.trashRoot ?? paths.schemeTrash`。

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm vitest run server/schemePathsScope.test.mjs server/`
Expected: PASS，且 `server/` 全量仍绿（既有的 9 个扁平布局测试必须一字未改地通过）

- [ ] **Step 5: 提交**

```bash
git add server/server.mjs server/schemePathsScope.test.mjs
git commit -m "refactor(server): 方案域 11 个函数接 options.paths，引入 defaultPaths"
```

---

### Task 5: 拆 ZIP 导出的 filesRoot 守卫 + `paths` 纵穿渲染链

**Files:**
- Modify: `server/server.mjs:3125-3129`（拆守卫）、`server/svgExport.mjs`、`server/eFileExport.mjs`
- Test: `server/schemeArchiveRealtime.test.mjs:175-180`（改写）

**Interfaces:**
- Consumes: `paths`（Task 4）
- Produces:
  - `renderSavedModelSvg(options)`（`svgExport.mjs`）新增 `options.paths` 支持
  - `buildEFileForSavedModel(options)`（`eFileExport.mjs`）新增 `options.paths` 支持

**背景**：`createSchemeArchiveBuffer` 现有硬守卫（`server.mjs:3125-3129`）在 `filesRoot !== 默认根` 时直接 throw，注释说明「渲染适配层只读模块级数据根，放行会产出 json 来自根 A、e/svg 来自根 B 的混合 ZIP」。该守卫使**非 default 空间的方案 ZIP 导出全部 500**，必须拆除 —— 但拆之前必须先把 `paths` 打通，否则正是注释警告的那种混合。

**遍历「执行时修正」记录（实现阶段发现本任务文本的三处缺陷，均已处理）：**

1. **空间内模型名改为 `空间厂站`（不能沿用 `厂站`）。** 本 brief 的第二断言 `existsSync(默认根/测试方案/厂站.json) === false` 有两重问题：`beforeAll:72-74` 已在默认根该路径种下同名文件 → 断言恒失败；**更要紧的是沿用同名会让「混根」状态静默成功** —— 恰好架空了这条断言存在的目的。改名后混根才会以断言失败暴露。
2. **条目名断言不能用 `endsWith("厂站.json")`。** 它对 `空间厂站.json` **后缀巧合为真**，是假阳性断言；已改为全列比对。
3. **新增对「仅传 `filesRoot`、不传 `paths`」的显式拒绝。** 守卫拆除后，这条遗留入口无法让渲染链跟随自定义根 → 必然产出混根 ZIP。今天仓内无活的此类调用点（`apiV1Schemes.mjs:123` 传的 `getFilesRoot()` 在 Task 8 之前恒等于默认根），属潜伏风险；但把「静默产生错误产物」换成「显式报错」只需 1–2 行，值得。许可写法：

```js
// 遗留入口（只传 filesRoot、不传 paths）无法让渲染链跟随自定义根，
// 仍按旧行为显式拒绝；paths 入口由调用方保证同根。
if (!options.paths && options.filesRoot && resolve(options.filesRoot) !== resolve(defaultPaths.schemeFiles)) {
  throw new Error("仅传自定义 filesRoot 时不支持实时生成派生格式（渲染适配层无法跟随该根）；请改传 paths。");
}
```

该分支**不得**在传了 `paths` 时触发，否则就把本任务的目的又取消了。

4. **删除 `server/schemePathsScope.test.mjs` 里「默认根守卫不随 options.paths 漂移」用例**（Task 4 修复轮加入）。该用例的断言主体是本任务要拆除的守卫，故结构上失效；改写成「ZIP 成功生成」会与下面的替换用例**逐字重复同一断言**，比删除更糟。在原位置留注释说明历史。

- [ ] **Step 1: 改写既有测试为「两种根都能用」**

把 `server/schemeArchiveRealtime.test.mjs:175-180` 的

```js
test("自定义 filesRoot 显式报错，不静默混用两个数据根", async () => {
  await expect(createSchemeArchiveBuffer({
    filesRoot: join(dataDir, "schemes", "files-自定义"), schemePath: ["测试方案"]
  })).rejects.toThrow(/自定义 filesRoot/);
});
```

整段替换为（**注意：这一步先让测试失败是对的** —— 守卫还在）：

```js
test("自定义 paths 下的方案 ZIP 成功生成，json 与派生格式同源", async () => {
  const { spacePathsFor } = await import("./spaceStore.mjs");
  const paths = spacePathsFor(dataDir, "张三");
  const spaceFiles = join(paths.schemeFiles, "测试方案");
  mkdirSync(spaceFiles, { recursive: true });
  writeFileSync(join(spaceFiles, "厂站.json"), JSON.stringify({
    version: 1, name: "厂站", canvasWidth: 800, canvasHeight: 400,
    layers: [{ id: "default", name: "默认图层", visible: true }],
    activeLayerId: "default", nodes: [], edges: []
  }), "utf-8");

  const { buffer } = await createSchemeArchiveBuffer({ paths, schemePath: ["测试方案"] });
  const zip = new AdmZip(buffer);
  const names = zip.getEntries().map((e) => e.entryName).sort();
  // json 与 e/svg 必须来自同一个根
  expect(names.some((n) => n.endsWith("厂站.json"))).toBe(true);
  expect(names.some((n) => n.endsWith("厂站.e"))).toBe(true);
  // 默认根下不应存在该模型，若出现说明派生格式读错了根
  expect(existsSync(join(dataDir, "schemes", "files", "测试方案", "厂站.json"))).toBe(false);
});
```

若该文件顶部未 import `AdmZip` / `mkdirSync` / `writeFileSync` / `existsSync`，一并补上（`import AdmZip from "adm-zip";` 与 `node:fs`）。

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm vitest run server/schemeArchiveRealtime.test.mjs`
Expected: FAIL —— `自定义 filesRoot 下暂不支持实时生成派生格式`

- [ ] **Step 3: 打通渲染链的 paths**

在 `server/svgExport.mjs` 与 `server/eFileExport.mjs` 中，让 `renderSavedModelSvg` / `buildEFileForSavedModel` 接受 `options.paths`，并把它透传给这 5 个 helper 调用：

> **执行顺序硬约束：本任务必须在 Task 6 与 Task 7 完成之后执行。**
> 它依赖 `readColorConfig` / `readDeviceLibraryConfig` / `readMeasurementConfig` / `readReferencedImageExportPathById` 四个函数已接受 `options.paths`（Task 6/7 的产物）。在它们改完之前拆守卫，会真的产出「json 来自根 A、e/svg 来自根 B」的混合 ZIP —— 正是被拆掉的那条守卫要防的事。执行顺序：**Task 6 → Task 7 → Task 5**。

- `readSchemeProjectRecord({ paths })`
- `findSchemeProjectRecordByIndex({ paths })`
- `readColorConfig({ paths })`
- `readDeviceLibraryConfig({ paths })`
- `readMeasurementConfig({ paths })`
- `readReferencedImageExportPathById(ids, { paths })`

变换形态：

```js
// svgExport.mjs 改前
const project = await readSchemeProjectRecord({ schemePath, name });
// 改后
const project = await readSchemeProjectRecord({ schemePath, name, paths: options?.paths });
```

- [ ] **Step 4: 拆除守卫**

删除 `server/server.mjs:3125-3129` 整段（两行注释 + `if` 块）：

```js
  // 渲染适配层（renderSavedModelSvg / buildEFileForSavedModel）无 filesRoot 入参，一律读模块级数据根。
  // 若放行自定义根，会产出「json 来自根 A、e/svg 来自根 B」的混合 ZIP —— 显式拒绝，不静默混用。
  if (resolve(filesRoot) !== resolve(defaultFilesRoot)) {
    throw new Error("自定义 filesRoot 下暂不支持实时生成派生格式（渲染适配层只读默认数据根）。");
  }
```

并把 `defaultFilesRoot` 的用途改为默认值来源：`const filesRoot = options.filesRoot ?? options.paths?.schemeFiles ?? defaultPaths.schemeFiles;`。随后把 `paths` 传给 `buildSchemeArchiveBuffer` 的 `renderArtifacts` 注入点（`server/schemeArchive.mjs` 的调用处），确保 e/svg 渲染用的是同一个根。

- [ ] **Step 5: 跑测试确认通过**

Run: `pnpm vitest run server/schemeArchiveRealtime.test.mjs server/svgExport.test.mjs server/eFileExport.test.mjs`
Expected: PASS 全绿

- [ ] **Step 6: 提交**

```bash
git add server/server.mjs server/svgExport.mjs server/eFileExport.mjs server/schemeArchiveRealtime.test.mjs
git commit -m "fix(server): 拆除方案 ZIP 的 filesRoot 守卫，paths 纵穿渲染链

非 default 空间的方案 ZIP 原先直接 500。守卫是为防「json 来自根 A、
e/svg 来自根 B」的混合 ZIP，故拆前先让 paths 打通 renderSavedModelSvg
与 buildEFileForSavedModel。原断言该 throw 的测试改写为断言两种根各自
可用且 json 与派生格式同源。"
```

---

### Task 6: settings 与 device-library 四域建逃生舱

**Files:**
- Modify: `server/server.mjs:524`、`:542`、`:867`、`~:880`、`:1503`、`:1527`
- Test: `server/spaceConfigPaths.test.mjs`（新建）

**Interfaces:**
- Consumes: `paths`（Task 4）
- Produces: 4 个原本**无参数**的跨模块导出函数改为接受 `options`：
  - `readColorConfig(options?): Promise<{exists, colorDisplayMode, colorPalette}>`
  - `writeColorConfig(config, options?)`（内部函数，但须同步）
  - `readMeasurementConfig(options?): Promise<{exists, groupDefaults, measurementTypes, deviceProfiles}>`
  - `writeMeasurementConfig(config, options?)`
  - `readDeviceLibraryConfig(options?): Promise<{exists, …}>`
  - `writeDeviceLibraryConfig(config, options?)`

**注意**：`ensureJsonStoreFile` / `readJsonStoreFile` / `readOptionalJsonStoreFile` / `writeJsonStoreFile` **无需改动** —— 它们已经接收 `dirPath` / `filePath` 作为参数（`server.mjs:263-293`）。要改的只是**硬编码常量的调用点**。

- [ ] **Step 1: 写失败测试**

Create `server/spaceConfigPaths.test.mjs`:

```js
// settings / device-library 域读指定空间根。
import { expect, test, beforeAll, afterAll } from "vitest";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { installDomShim } from "./domShim.mjs";
import { spacePathsFor } from "./spaceStore.mjs";

installDomShim();

let dataDir;
// 用 beforeAll 而非 beforeEach：server.mjs 在每个测试文件内只加载一次，
// 其 dataRoot 在首次 import 时求值并缓存。若每个用例换 dataDir，
// 第二个用例起 defaultPaths 会指向被 afterEach 删掉的旧目录 —— 测试会
// 「碰巧通过」而非「因为对而通过」。
beforeAll(() => { dataDir = mkdtempSync(join(tmpdir(), "space-config-")); });
afterAll(() => { rmSync(dataDir, { recursive: true, force: true }); });

test("readColorConfig 按 paths 读指定根", async () => {
  process.env.GRAPH_MODEL_DATA_DIR = dataDir;
  const { readColorConfig } = await import("./server.mjs");
  // 用生产同款构造器拿全 13 个字段。手写 {...defaultPaths, 需要的几个} 只覆盖当前
  // 用例用到的字段，其余会静默指向 default 空间根 —— 后续任务照抄模板就会写错空间。
  const paths = spacePathsFor(dataDir, "张三");
  mkdirSync(paths.settings, { recursive: true });
  writeFileSync(paths.colorConfig,
    JSON.stringify({ colorDisplayMode: "voltage", colorPalette: { voltage: { a: "#111111" } } }), "utf-8");

  expect((await readColorConfig({ paths })).colorDisplayMode).toBe("voltage");
  expect((await readColorConfig()).exists).toBe(false);   // 默认根下没有
  delete process.env.GRAPH_MODEL_DATA_DIR;
});

test("readDeviceLibraryConfig 按 paths 读指定根", async () => {
  process.env.GRAPH_MODEL_DATA_DIR = dataDir;
  const { readDeviceLibraryConfig } = await import("./server.mjs");
  const paths = spacePathsFor(dataDir, "张三");
  mkdirSync(paths.deviceLibraryDir, { recursive: true });
  writeFileSync(paths.deviceLibrary,
    JSON.stringify({ schemaVersion: 1, customDeviceTemplates: [{ kind: "VPP母线" }] }), "utf-8");

  const spaceLib = await readDeviceLibraryConfig({ paths });
  expect(spaceLib.exists).toBe(true);
  expect(JSON.stringify(spaceLib)).toContain("VPP母线");
  expect((await readDeviceLibraryConfig()).exists).toBe(false);
  delete process.env.GRAPH_MODEL_DATA_DIR;
});

test("readMeasurementConfig 接受 paths 且不抛错", async () => {
  process.env.GRAPH_MODEL_DATA_DIR = dataDir;
  const { readMeasurementConfig } = await import("./server.mjs");
  const paths = spacePathsFor(dataDir, "张三");
  const config = await readMeasurementConfig({ paths });
  expect(config).toHaveProperty("groupDefaults");
  delete process.env.GRAPH_MODEL_DATA_DIR;
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm vitest run server/spaceConfigPaths.test.mjs`
Expected: FAIL —— 空间根有数据但 `readColorConfig({paths})` 返回 `exists:false`（参数被忽略）

- [ ] **Step 3: 写实现**

逐个函数施加变换：

```js
// 改前（server.mjs:524）
export async function readColorConfig() {
  const parsed = await readOptionalJsonStoreFile(settingsDataDir, colorConfigPath);
  …
}

// 改后
export async function readColorConfig(options = {}) {
  const paths = options.paths ?? defaultPaths;
  const parsed = await readOptionalJsonStoreFile(paths.settings, paths.colorConfig);
  …
}
```

同样的变换施加到 `writeColorConfig`（`:542`，用 `paths.settings` / `paths.colorConfig`）、`readMeasurementConfig`（`:867`）、`writeMeasurementConfig`（`:888` 附近）、`readDeviceLibraryConfig`（`:1503`，含 `:1514` 的 `writeJsonStoreFile` 回写要同样换成 `paths`）、`writeDeviceLibraryConfig`（`:1527`）。

**关键**：`readDeviceLibraryConfig` 内部会**回写**（`:1514`），读写两处必须用同一套 `paths`，否则会把某空间的规范化结果写进另一个空间。

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm vitest run server/spaceConfigPaths.test.mjs server/`
Expected: PASS 全绿

- [ ] **Step 5: 提交**

```bash
git add server/server.mjs server/spaceConfigPaths.test.mjs
git commit -m "refactor(server): settings 与 device-library 域接 options.paths

这四个域原先零逃生舱，其中 readColorConfig / readMeasurementConfig /
readDeviceLibraryConfig 是无参数签名的跨模块导出函数，被 svgExport、
apiV1Library、eFileExport、cimExport 消费。readDeviceLibraryConfig 的
回写路径同样改走 paths，避免读写错根。"
```

---

### Task 7: images 与 icons 域接 `paths`

**Files:**
- Modify: `server/server.mjs:295`、`:301`、`:307`、`:319`、`:331`、`:3576`、`:3580`、`:2907`、`:2917`、`:2938`
- Test: `server/spaceImagePaths.test.mjs`（新建）

**Interfaces:**
- Consumes: `paths`（Task 4）
- Produces（均新增末位 `options` 入参）：
  - `ensureStore(options?)` —— **需加 `export`**（原因见下）
  - `readManifest(options?)` —— **需加 `export`**
  - `writeManifest(items, options?)`
  - `readImageFolders(options?)` / `writeImageFolders(folders, options?)`
  - `getAssetDir(dir, options?)` / `writeImageAssetFile(item, options?)`
  - `imageFileToDataUrl(filename, options?)` / `imageExportPathByIdFromManifest(id, options?)`
  - `readReferencedImageExportPathById(ids, options?)`（已导出，被 `svgExport.mjs:6` 消费）

**关于那两个 `export`**：`ensureStore` 与 `readManifest` 原本是模块内部函数，而本任务的测试要直接驱动它们。不给 `export` 的话测试拿到 `undefined`，RED 会以 `is not a function` 失败（而非 brief Step 2 预期的「返回空数组」）—— 也就是 brief 自身的测试代码与改动清单互相矛盾。已裁定：**加这两个 `export` 是可接受的，且优于「改用已导出的 `readReferencedImageExportPathById` 重写测试」**，因为后者会丢掉 `ensureStore` 在空间根下建三件套（`manifest`/`imageFolders`/`icons`）的全部覆盖，并把测试耦合到与存储骨架无关的导出渲染路径。只加这两个，不要图省事批量导出其余内部函数。

**`paths` 的透传链不止 brief 点名的 `resolveFolderId`。** 整条链都要接：`readReferencedImageExportPathById(ids, options)` → `imageExportPathByIdFromManifest(id, options)` → `imageFileToDataUrl(filename, options)`。漏传其中任一段，Task 9 接线后就会 **manifest 读空间根、图片字节读默认根** —— 症状是「图片有时显示有时不显示」而非干脆报错。这与缓存键问题同属一类失效：同一逻辑读操作的两端指向不同根。

- [ ] **Step 1: 写失败测试**

Create `server/spaceImagePaths.test.mjs`:

```js
// images / icons 域按空间隔离：manifest 与图片文件都落在空间根下。
import { expect, test, beforeAll, afterAll } from "vitest";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { installDomShim } from "./domShim.mjs";
import { spacePathsFor } from "./spaceStore.mjs";

installDomShim();

let dataDir;
// beforeAll：同 spaceConfigPaths.test.mjs —— server.mjs 每文件只加载一次，
// 其 dataRoot 首 import 时缓存，逐用例换目录会让后续用例指向已删目录。
beforeAll(() => { dataDir = mkdtempSync(join(tmpdir(), "space-image-")); });
afterAll(() => { rmSync(dataDir, { recursive: true, force: true }); });

test("readManifest 按 paths 读指定根，不污染默认根", async () => {
  process.env.GRAPH_MODEL_DATA_DIR = dataDir;
  const { readManifest } = await import("./server.mjs");
  const paths = spacePathsFor(dataDir, "张三");
  mkdirSync(paths.images, { recursive: true });
  writeFileSync(paths.manifest,
    JSON.stringify([{ id: "abc", name: "图.png", folderId: "root" }]), "utf-8");

  expect(await readManifest({ paths })).toHaveLength(1);
  expect(await readManifest()).toHaveLength(0);
  delete process.env.GRAPH_MODEL_DATA_DIR;
});

test("ensureStore 在空间根下建骨架并建 icons 目录", async () => {
  process.env.GRAPH_MODEL_DATA_DIR = dataDir;
  const { ensureStore } = await import("./server.mjs");
  const paths = spacePathsFor(dataDir, "张三");
  await ensureStore({ paths });
  expect(existsSync(paths.manifest)).toBe(true);
  expect(existsSync(paths.imageFolders)).toBe(true);
  expect(existsSync(paths.icons)).toBe(true);
  delete process.env.GRAPH_MODEL_DATA_DIR;
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm vitest run server/spaceImagePaths.test.mjs`
Expected: FAIL —— `readManifest({paths})` 返回空数组（参数被忽略），且未在空间根建文件

- [ ] **Step 3: 写实现**

变换公式（`ensureStore` 为例）：

```js
// 改前（server.mjs:295）
async function ensureStore() {
  await ensureJsonStoreFile(imageDataDir, manifestPath, []);
  await ensureJsonStoreFile(imageDataDir, imageFoldersPath, [rootImageFolder()]);
  await mkdir(iconDataDir, { recursive: true });
}

// 改后
async function ensureStore(options = {}) {
  const paths = options.paths ?? defaultPaths;
  await ensureJsonStoreFile(paths.images, paths.manifest, []);
  await ensureJsonStoreFile(paths.images, paths.imageFolders, [rootImageFolder()]);
  await mkdir(paths.icons, { recursive: true });
}
```

同样的变换施加到 `readManifest`（`:301`）、`writeManifest`（`:307`）、`readImageFolders`（`:319`）、`writeImageFolders`（`:331`）、`resolveFolderId`（`:346`，它调 `readImageFolders`）、`imageFileToDataUrl`（`:2907`）、`imageExportPathByIdFromManifest`（`:2917`）、`readReferencedImageExportPathById`（`:2938`）、`getAssetDir`（`:3576`）、`writeImageAssetFile`（`:3580`）。

`getAssetDir` 的现状是二选一（`server.mjs:3577`）：

```js
// 改前
return item.dir === "icons" ? iconDataDir : imageDataDir;
// 改后
return item.dir === "icons" ? paths.icons : paths.images;
```

**`withImageStoreLock`（`:339-344`）保持单例锁不动** —— 它是进程级的图片 store 串行化，跨空间共用一个队列是保守但正确的选择（`ponytail:` 全局锁，若日后空间多到相互拖慢，再改为 `Map<spaceRoot, Promise>` 分空间锁）。

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm vitest run server/spaceImagePaths.test.mjs server/`
Expected: PASS 全绿

- [ ] **Step 5: 提交**

```bash
git add server/server.mjs server/spaceImagePaths.test.mjs
git commit -m "refactor(server): images 与 icons 域接 options.paths

图片 manifest、文件夹、导入的图标资产全部按空间落盘。
withImageStoreLock 保持进程级单例（跨空间共用队列，保守但正确）。"
```

---

### Task 8: 导出适配层与 v1 模块透传 `paths`，清理旧常量

**Files:**
- Modify: `server/svgExport.mjs`、`server/eFileExport.mjs`、`server/cimExport.mjs`、`server/sendModel.mjs`、`server/apiV1Library.mjs`、`server/apiV1Schemes.mjs:20-40`
- Test: `server/spaceExportPaths.test.mjs`（新建）

**Interfaces:**
- Consumes: 全部 helper 的 `options.paths`（Task 4/6/7）
- Produces: 每个导出 handler 接受 `ctx.paths` 并透传；`apiV1Schemes.mjs` 删除自建 `getSchemeDataDir()` / `getFilesRoot()`，改用 `ctx.paths`

- [ ] **Step 1: 写失败测试**

Create `server/spaceExportPaths.test.mjs`:

```js
// 导出适配层按空间读模型与库配置。
import { expect, test, beforeAll, afterAll } from "vitest";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { installDomShim } from "./domShim.mjs";
import { spacePathsFor } from "./spaceStore.mjs";

installDomShim();

let dataDir;
// beforeAll：server.mjs 每文件只加载一次，dataRoot 首 import 时缓存；
// 逐用例换目录会让后续用例的 defaultPaths 指向已删目录。
beforeAll(() => { dataDir = mkdtempSync(join(tmpdir(), "space-export-")); });
afterAll(() => { rmSync(dataDir, { recursive: true, force: true }); });

test("svgExport 的 renderSavedModelSvg 按 paths 解析空间模型", async () => {
  process.env.GRAPH_MODEL_DATA_DIR = dataDir;
  const { renderSavedModelSvg } = await import("./svgExport.mjs");
  const paths = spacePathsFor(dataDir, "张三");
  const filesDir = join(paths.schemeFiles, "测试方案");
  mkdirSync(filesDir, { recursive: true });
  writeFileSync(join(filesDir, "厂站.json"), JSON.stringify({
    version: 1, name: "厂站", canvasWidth: 800, canvasHeight: 400,
    layers: [{ id: "default", name: "默认图层", visible: true }],
    activeLayerId: "default", nodes: [], edges: []
  }), "utf-8");

  const svg = await renderSavedModelSvg({ schemePath: ["测试方案"], name: "厂站", paths });
  expect(svg).toContain("<svg");

  await expect(renderSavedModelSvg({ schemePath: ["测试方案"], name: "厂站" }))
    .rejects.toThrow();   // 默认根下没这个模型
  delete process.env.GRAPH_MODEL_DATA_DIR;
});

test("apiV1Schemes 不再自建数据根推导", async () => {
  const source = await import("node:fs/promises").then((fs) =>
    fs.readFile(join(import.meta.dirname, "apiV1Schemes.mjs"), "utf-8"));
  expect(source).not.toContain("getSchemeDataDir");
  expect(source).not.toContain("GRAPH_MODEL_DATA_DIR");
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm vitest run server/spaceExportPaths.test.mjs`
Expected: FAIL —— 第一条 `renderSavedModelSvg` 抛错（默认根下无模型）；第二条断言 `apiV1Schemes.mjs` 仍含 `getSchemeDataDir`

- [ ] **Step 3: 写实现**

对下列调用点加 `paths` 透传（共约 15 处）：

| 文件 | 行 | 调用 |
|------|-----|------|
| `server/svgExport.mjs` | `:6` 起各使用点 | `readColorConfig({ paths })`、`readDeviceLibraryConfig({ paths })`、`readMeasurementConfig({ paths })`、`readReferencedImageExportPathById(ids, { paths })`、`readSchemeProjectRecord({ …, paths })`、`findSchemeProjectRecordByIndex({ …, paths })` |
| `server/eFileExport.mjs` | `:7` 起 | `readDeviceLibraryConfig({ paths })`、`readSchemeProjectRecord({ …, paths })` |
| `server/cimExport.mjs` | `:6` 起 | `readMeasurementConfig({ paths })` |
| `server/apiV1Library.mjs` | `:5` 起 5 处 | `readDeviceLibraryConfig({ paths })`、`readMeasurementConfig({ paths })` |
| `server/sendModel.mjs` | 全链 | 把 `paths` 透传给 `eFileExport` / `svgExport` 的调用 |

`server/apiV1Schemes.mjs` 删除 `:20-37` 的 `getSchemeDataDir()` / `getFilesRoot()` 及其缓存变量，改为在每个 handler 内用 `ctx.paths`（Task 9 会把 `ctx.paths` 注入所有 handler；本任务先按 `({ paths }, { … })` 的形参形态改签名，若 handler 形参尚未有 `paths`，一并补上）。

> **与 Task 5 新守卫的交互 —— 必读，否则一改就 500。**
>
> Task 5 拆掉了旧守卫，换成一条新守卫（`server.mjs:3148`）：
>
> ```js
> if (resolve(filesRoot) !== resolve(paths.schemeFiles ?? defaultPaths.schemeFiles)) {
>   throw new Error("filesRoot 与解析出的 paths 指向不同根，不支持实时生成派生格式（渲染适配层只跟随 paths）；请只传 paths。");
> }
> ```
>
> 其中 `filesRoot = options.filesRoot ?? paths.schemeFiles`。这意味着：
>
> - 现状（`apiV1Schemes.mjs:123` 传 `filesRoot: getFilesRoot()`）之所以不抛，**只因为** `getFilesRoot()` 在 Task 8 之前恒等于默认根。
> - 本任务让 `apiV1Schemes` 具备空间意识后，若仍沿用「传 `filesRoot`」的形态、值为空间根，新守卫会**立刻抛错 → 500**。
> - 故本任务必须把该调用点改为**传 `paths`、不传 `filesRoot`**：`createSchemeArchiveBuffer({ paths, schemePath: parts })`。这是新守卫预设的唯一正确入口。
>
> 换句话说：`filesRoot` 兼容别名在本任务之后**不应再有任何生产调用点**（Task 5 的守卫会拒绝自定义值）。改完用下面这行自检：
>
> ```bash
> grep -rn "filesRoot:" server/*.mjs
> ```
>
> **自检命令已修正 —— 原写法有假阴性。** 作者最初写的是 `grep -rn "filesRoot:" server/*.mjs`，它**看不见简写形态** `createSchemeArchiveBuffer({ filesRoot, schemePath })`（属性简写无冒号）。T8 评审据 `server.mjs:4254/:4257` 实测指出这一点：该处生产的 `filesRoot` 调用点从未进入过那条 grep 的视野，于是「生产命中应为 0」被当成「已清零」。
>
> 正确写法（**不带冒号**）：
>
> ```bash
> grep -rn "filesRoot" server/*.mjs
> ```
>
> 预期（已核实当前基线）：
> - **生产命中仅 `server/server.mjs:4254`、`:4257`**（旧 `/api/schemes/export` 路由内的简写调用），其 `filesRoot` 恒等于 `defaultPaths.schemeFiles`，故 Task 5 守卫放行、无回归。**这两处由 Task 9 改走 `paths`** —— 本任务不改，只如实登记。
> - `server/schemeArchiveRealtime.test.mjs` 的 **3 处命中是正当保留**（`:207`、`:218`、`:230`）—— Task 5 为钉住所加守卫而写的用例，故意传 `filesRoot` 验证「相等放行 / 不等拒绝」两路。
> - `server.mjs:3148` 守卫表达式内对 `filesRoot`/`options.filesRoot` 的引用是正当的（它就是守卫本身）。
>
> **教训（写给后续任务）：用 grep 复核「某形态是否清零」时，必须考虑属性简写 —— 带冒号的模式会漏掉 `{ filesRoot, ... }`。**

- [ ] **Step 4: 删除已无引用的旧常量**

在 `server/server.mjs` 中逐个删除已无引用的模块级常量。用以下命令确认无残留后再删：

```bash
pnpm vitest run server/ && node -e "
const fs=require('fs');const s=fs.readFileSync('server/server.mjs','utf8');
for (const n of ['imageDataDir','iconDataDir','manifestPath','imageFoldersPath','schemeDataDir','schemeTrashDir','settingsDataDir','colorConfigPath','measurementConfigPath','deviceLibraryDataDir','deviceLibraryPath']) {
  const c=(s.match(new RegExp('\\\\b'+n+'\\\\b','g'))||[]).length;
  console.log(n, c);
}"
```

预期：除 `schemeDataDir`（仍被 `dataRoot` 派生的少量位置引用，如 `globalLineRegistry` 的单例构造，Task 10 处理）外，其余计数应为 0。**未被清零的常量先保留**，在 Task 10 后再次确认并清理。

- [ ] **Step 5: 跑测试确认通过**

Run: `pnpm vitest run server/ && pnpm audit:names`
Expected: PASS 全绿；`audit:names` 无新增未定义名

- [ ] **Step 6: 提交**

```bash
git add server/svgExport.mjs server/eFileExport.mjs server/cimExport.mjs server/sendModel.mjs server/apiV1Library.mjs server/apiV1Schemes.mjs server/server.mjs server/spaceExportPaths.test.mjs
git commit -m "refactor(server): 导出适配层与 v1 模块透传 paths

apiV1Library.mjs 此前不在改动清单里（5 处调用点）；apiV1Schemes.mjs
删除自建的数据根推导 getSchemeDataDir()——全仓唯一一处重复。"
```

---

### Task 9: 派发点注入 `paths`，handler 补解构，`/exports/native/*` 空间解析前短路

**Files:**
- Modify: `server/server.mjs:4414-4632`（`createImageServer` 内部）
- Test: `server/spaceDispatch.test.mjs`（新建）

**Interfaces:**
- Consumes: `createSpaceStore` / `resolveSpaceFromRequest` / `SPACE_COOKIE_NAME` / `SPACE_FALLBACK_HEADER`（Task 1-3）
- Produces:
  - `createImageServer({ port, host, staticRoot, spaceStore? })` 新增可选 `spaceStore` 注入（测试用）
  - 所有 route handler 的 ctx 新增 `paths: SpacePaths` 与 `spaceId: string`

- [ ] **Step 1: 写失败测试**

Create `server/spaceDispatch.test.mjs`:

```js
// 派发层注入 paths：三个派发点都要覆盖。
import { expect, test, beforeAll, afterAll } from "vitest";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { installDomShim } from "./domShim.mjs";

installDomShim();

let dataDir; let server; let baseUrl;
beforeAll(async () => {
  dataDir = mkdtempSync(join(tmpdir(), "space-dispatch-"));
  process.env.GRAPH_MODEL_DATA_DIR = dataDir;
  const { createImageServer } = await import("./server.mjs");
  const { createSpaceStore } = await import("./spaceStore.mjs");
  // 先建出「张三」：显式来源指向不存在的空间会 400，本文件要测的是「落到对的空间」
  const store = createSpaceStore(dataDir);
  await store.ensureInitialized();
  await store.create("张三");
  // 必须把自己建的 store 注入：否则服务端会另建第二个实例，同进程两个写者
  // 各持整份注册表快照，后写者会用陈旧快照回滚对方的条目。
  server = await createImageServer({ port: 0, host: "127.0.0.1", spaceStore: store });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});
afterAll(async () => {
  if (server) await new Promise((r) => server.close(r));
  delete process.env.GRAPH_MODEL_DATA_DIR;
  rmSync(dataDir, { recursive: true, force: true });
});

test("exact 路由（GET /webgrp/images）按 X-Space 落对空间", async () => {
  const res = await fetch(`${baseUrl}/webgrp/images`, { headers: { "x-space": "张三" } });
  expect(res.status).toBe(200);
  // 空间根下被建出 images 骨架
  await new Promise((r) => setTimeout(r, 50));
  const { existsSync } = await import("node:fs");
  expect(existsSync(join(dataDir, "workspaces", "张三", "images", "manifest.json"))).toBe(true);
});

test("动态路由 /webgrp/image-folders/{id} 按 X-Space 落对空间", async () => {
  const res = await fetch(`${baseUrl}/webgrp/image-folders`, { headers: { "x-space": "张三" } });
  expect(res.status).toBe(200);
});

test("v1 路由按 Cookie 落对空间并回 X-Space-Fallback 头", async () => {
  const res = await fetch(`${baseUrl}/webgrp/v1/schemes`, { headers: { cookie: "gmp_space=张三" } });
  expect(res.status).toBe(200);
  expect(res.headers.get("x-space-fallback")).toBeNull();   // 命中真实空间，不回退

  const fallback = await fetch(`${baseUrl}/webgrp/v1/schemes`, { headers: { cookie: "gmp_space=没了" } });
  expect(fallback.status).toBe(200);
  expect(fallback.headers.get("x-space-fallback")).toBe("1");
});

test("显式未知空间返回 400 SPACE_UNKNOWN", async () => {
  const res = await fetch(`${baseUrl}/webgrp/v1/schemes`, { headers: { "x-space": "没了" } });
  expect(res.status).toBe(400);
  const body = await res.json();
  expect(body.error.code).toBe("SPACE_UNKNOWN");
  // 顺带钉住解析器返回的 unknownValue —— 它没有单元测试覆盖
  // （toMatchObject 不校验额外字段），却是 400 消息里唯一能说出被拒 id 的来源。
  expect(body.error.message).toContain("没了");
});

test("配置读写按空间分开，且不串缓存", async () => {
  // 这一条同时钉三件事：
  // 1) 写路由的 handler 真的收到了 paths（否则 PUT 无参调用写函数，落默认空间）
  // 2) sendCachedJsonFile 的 filePath 实参是与 produce 同一空间的路径
  //    （该函数以 filePath 本身作缓存键，传常量会让两空间互相回放载荷）
  // 3) 读路径按空间解析
  const put = await fetch(`${baseUrl}/webgrp/color-config`, {
    method: "PUT",
    headers: { "content-type": "application/json", "x-space": "张三" },
    body: JSON.stringify({ colorDisplayMode: "voltage", colorPalette: { voltage: { x: "#010203" } } })
  });
  expect(put.status).toBe(200);

  const zhang = await fetch(`${baseUrl}/webgrp/color-config`, { headers: { "x-space": "张三" } })
    .then((r) => r.json());
  const def = await fetch(`${baseUrl}/webgrp/color-config`).then((r) => r.json());
  expect(zhang.colorDisplayMode).toBe("voltage");
  expect(def.colorDisplayMode).toBe("energy");
});

test("/exports/native/* 不受空间校验影响（本机端点）", async () => {
  // 带一个不存在的空间名仍应进入 handler，而非被空间解析拦成 400 SPACE_UNKNOWN。
  // 本机来源校验（isAllowedNativeExportOrigin）会先决定结果，这正是我们要的证明。
  const res = await fetch(`${baseUrl}/webgrp/exports/native/select-file`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-space": "没了" },
    body: JSON.stringify({})
  });
  const body = await res.json().catch(() => ({}));
  // 关键断言：不是空间解析的 400 SPACE_UNKNOWN
  expect(body?.error?.code).not.toBe("SPACE_UNKNOWN");
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm vitest run server/spaceDispatch.test.mjs`
Expected: FAIL —— 空间根下不会出现 `images/manifest.json`；无 `X-Space-Fallback` 头

- [ ] **Step 3: 写实现**

在 `createImageServer` 内，`const nativeExportSaveService = createNativeExportSaveService();` 之后加：

```js
const { createSpaceStore, resolveSpaceFromRequest, SPACE_COOKIE_NAME, SPACE_FALLBACK_HEADER } = await import("./spaceStore.mjs");
const spaceStore = injectedSpaceStore ?? createSpaceStore(dataRoot);
await spaceStore.ensureInitialized();
```

签名改为 `createImageServer({ port = 5174, host = "127.0.0.1", staticRoot, spaceStore: injectedSpaceStore } = {})`。

在**三个派发点**（`:4586` exact、`:4595` 动态、`:4611` v1）之前统一算一次：

```js
// 空间解析：/exports/native/* 是本机端点，与空间数据无关，必须在解析前短路，
// 否则一个已删除的空间名会连带打挂一次「另存为」。
const isHostBound = url.pathname === apiPath("/exports/native/select-file")
  || url.pathname === apiPath("/exports/native/write-text");
let spaceCtx = {};
if (!isHostBound) {
  const resolution = resolveSpaceFromRequest(request, url, spaceStore);
  if (resolution.unknown) {
    sendError(response, 400, `未知空间：${resolution.unknownValue ?? ""}`, "SPACE_UNKNOWN");
    return;
  }
  spaceCtx = { paths: spaceStore.resolvePaths(resolution.id), spaceId: resolution.id };
  if (resolution.source === "fallback") {
    response.setHeader(SPACE_FALLBACK_HEADER, "1");
    response.setHeader("set-cookie",
      `${SPACE_COOKIE_NAME}=${encodeURIComponent(resolution.id)}; Path=/; Max-Age=31536000; SameSite=Lax`);
  }
}
```

**本步还要扩展 `sendError`**（`server.mjs:1538`）—— 它是本任务 400 响应的唯一出口，而现在只产出字符串形态：

```js
// 改前
function sendError(response, status, message) {
  sendJson(response, status, { error: message });
}

// 改后 —— 带 code 时用 v1 同构的错误对象，否则保持既有字符串形态（不破坏任何现有调用方）
function sendError(response, status, message, code) {
  sendJson(response, status, code ? { error: { code, message } } : { error: message });
}
```

`sendV1Error` 保持原样，两者并存：v1 域走 `sendV1Error`，`/webgrp/*` 内部域走 `sendError`。本任务只调用 `sendError`。

**为何不在此处复用 `sendV1Error`**：派发层的空间校验发生在「还不知道这条请求将落到 exact / 动态 / v1 哪个分支」之前，用 v1 专用出口会把信封强加给非 v1 端点。`sendError` 带可选 code 后两种形态都表达得了。

随后三个派发点改为：

```js
await exactRouteHandler({ request, response, url, ...spaceCtx });          // :4586
await route.handle({ match, request, response, url, ...spaceCtx });        // :4595
await route.handle({ request, response, url, match, ...spaceCtx });        // :4611
```

**7 个未解构 `request` 的 handler 需补解构**：`:4418` `GET /swigger`、`:4470` `GET /schemes/export`、`:4479` `GET /schemes/project`、`:4494` `GET /global-lines`、`:4543`、`:4550`、`:4557`。改为 `({ request, response, url, paths })` 形态并把 `paths` 传给被调的 helper。

### 注入 `paths` 到 ctx 不够 —— 每个路由体与 handler 还要把路径实参换成 `paths.*`

这是本任务最容易漏、后果最重的一步：`ctx.paths` 只把路径**送到了手上**，不改变任何函数**实际读写哪个目录**。以下三类必须逐个改到：

**（a）`sendCachedJsonFile` 的 `filePath` 实参。** `server.mjs:1603` 的 `sendCachedJsonFile(request, response, filePath, produce)` **用 `filePath` 本身作缓存键**（`:1610` `preparedJsonFileCache.get(filePath)`、`:1616` `.set(filePath, …)`）。

**唯一许可的写法**（照抄，不要自行发明包裹形式）：

```js
await sendCachedJsonFile(request, response, paths.colorConfig, () => readColorConfig({ paths }));
```

三条理由，缺一条都会写出错的修法：

1. **键必须自带空间身份。** 只给 `produce` 包一层空间闭包、`filePath` 仍传模块常量，是最可能犯的错法：`:1610` 的键与 `:1606` 的版本源都是那个常量，各空间共用同一条缓存条目 —— 跨空间数据泄漏。
2. **不能靠版本兜底区分空间。** `:1606-1609` 在文件缺失时 `catch { version = 0 }`，即**版本源对不存在的文件恒为 0、毫无区分力**。所以「换了版本源」不等于「分开了空间」，只有键变才成立。
3. **三处调用点必须一起改**：`:4513` `colorConfigPath`、`:4519` `measurementConfigPath`、`:4525` `deviceLibraryPath`。只改一两处会留下「部分空间化」的缓存 —— 比完全不改更难查。

**（b）写路由的 handler。** `handleSave*`（`:4308-4324` 一带）目前**无参**调用 `writeColorConfig` / `writeMeasurementConfig` / `writeDeviceLibraryConfig`，即写操作仍落默认空间。这些 handler 要接 `paths` 并透传，否则「每空间独立配色/量测配置」只是读了空间、写了默认 —— 读写分家比完全不隔离更难查。逐个核对 `PUT /color-config`、`PUT /measurement-config`、`PUT /device-library` 三条。

**（c）图片与图片文件夹路由。** `POST /images`、`GET|POST /image-folders`、`PUT|DELETE /image-folders/{id}`、`DELETE /images/{id}`、`POST /icon-library/import`、`POST /image-library/import`、`GET /images/{id}` —— 它们经 `ensureStore` / `readManifest` / `writeManifest` / `readImageFolders` / `writeImageFolders` / `getAssetDir` 读写，Task 7 已让这些 helper 接 `options.paths`，本任务负责把 `paths` 从 ctx 传到这些调用点。

**（d）方案 ZIP 的旧 `/api` 路由。** `server.mjs:4254`/`:4257` 的 `/api/schemes/export` 路由仍以**属性简写**形态调用 `createSchemeArchiveBuffer({ filesRoot, schemePath })`，其中 `filesRoot = join(schemeDataDir, "files")` 恒等于 `defaultPaths.schemeFiles`。Task 5 的新守卫因此放行、当前无回归 —— 但它是本任务之后**唯一残留的生产 `filesRoot` 调用点**（Task 8 评审实测指出；原自检 grep 带冒号，看不见属性简写，故此前被漏判）。改为传 `paths`：

```js
await createSchemeArchiveBuffer({ paths, schemePath });
```

改完后 `grep -rn "filesRoot" server/*.mjs` 的生产命中应为 **0**（余下命中只应在 `server.mjs:3148` 的守卫表达式与 Task 5 的 3 处测试用例里）。

自检命令（改完后跑，用于找漏网的裸常量）：

```bash
grep -n "imageDataDir\|iconDataDir\|manifestPath\|imageFoldersPath\|schemeDataDir\|schemeTrashDir\|settingsDataDir\|colorConfigPath\|measurementConfigPath\|deviceLibraryDataDir\|deviceLibraryPath" server/server.mjs
```

**预期：引用点为 0，声明行保留。** 措辞须精确 —— 这条 grep 匹配的是**常量名**，而约束要求**保留 11 个常量声明**，所以「命中数 0」**不可达**：声明行本身就是命中。T9 的实测基线为 **12 命中 = 11 行声明 + `:48` 的 `globalLineRegistry` 单例（归 Task 10）**。判据是「**除声明与已知归属外，无其它引用点**」，不是「命中 0」。残留的每一处引用点都是一个「仍读写默认空间」的漏网点；这些常量在 Task 4/5/6/7/8 已全部失去引用，本任务结束后 Task 16 才能安全删除它们。

**（e）无参调用已 paths-aware 的 helper —— 常量 grep 抓不到的那一类。**

上面那条 grep 只能抓**裸常量名**。**无参调用**（`readSchemes()`、`readManifest()`、`ensureStore()`）**不含任何常量**，故对它们完全盲。Task 8 的评审在交接时点名了两处靠这个盲区活下来的漏网：

- `server/server.mjs:4305` —— `readSchemes()` 未传 `paths`
- `server/server.mjs:4497` —— 同样 `readSchemes()` 未传 `paths`

两者在空间工作区下**读到默认空间**。同类候选还有 `readSchemeProjectRecord` / `findSchemeProjectRecordByIndex` / `readManifest` / `ensureStore` / `readImageFolders` / `readColorConfig` / `readMeasurementConfig` / `readDeviceLibraryConfig`。

追加自检：

```bash
grep -n "readSchemes()\|readManifest()\|ensureStore()\|readImageFolders()\|readColorConfig()\|readMeasurementConfig()\|readDeviceLibraryConfig()\|readSchemeProjectRecord(\|findSchemeProjectRecordByIndex(\|writeManifest(\|writeImageFolders(" server/server.mjs
```

**⚠ 本机 Bash 被 rtk 包装成 ripgrep，上面这种未转义的 `()` 会直接报 `regex parse error: unclosed group`。实际执行请用转义版（或改用 Grep 工具）：**

```bash
grep -n "readSchemes\(\)\|readManifest\(\)\|ensureStore\(\)\|readImageFolders\(\)\|readColorConfig\(\)\|readMeasurementConfig\(\)\|readDeviceLibraryConfig\(\)\|readSchemeProjectRecord(\|findSchemeProjectRecordByIndex(\|writeManifest(\|writeImageFolders(" server/server.mjs
```

**必须扫全文件，不要只扫「路由段」** —— 路由 **handler 定义在文件前部**（`:3663–:4313`），路由表在 `:4460` 之后；按「文件后半段」过滤会漏掉其中 14 处。T9 的实测：修改前基线 **17 处**，全部已传 `paths` 后 **0 命中**。

**（f）第三种漏网形态：传了部分实参、但漏了 `options`。** 上面两条自检都抓不到它 —— 常量 grep 抓**裸常量名**（这类调用传的是 `filesRoot` 之类的形参），无参调用 grep 抓**零实参调用**（这类传了 3 个实参）。T9 的评审实测出这一处：

```js
// server.mjs:3571（T9 已修）
await archiveStaleSchemeFiles(filesRoot, expectedFiles, expectedDirs);   // 漏传 options
```

`writeSchemeFiles` 的 `filesRoot` 已按 `paths` 取对，但这行没把 options 传下去，于是 `archiveStaleSchemeFiles` 内部 `paths` 回落到 `defaultPaths` → **空间 A 的废弃文件被丢进默认空间的回收站** —— 跨空间写入。

复核方式：对本任务涉及的每个「已接 `options.paths`」的函数，逐个检查**它内部的调用**是否把 options 透传。

```bash
grep -n "archiveStaleSchemeFiles\|writeSchemeFiles\|readSchemesFromFiles\|saveSchemeProjectRecord\|deleteSchemeProjectRecord" server/server.mjs
```

逐个看调用点是否带 `{ paths }`，报告中给出实跑输出与逐点判断。

**预期：整体应为 0 命中。** 实测基线（修改前）为 **17 处**，分布 `:3663、:3672、:3679、:3984、:3985、:4006、:4008、:4023、:4045、:4066、:4072、:4079、:4095、:4305、:4459、:4480、:4481`。

**注意行号分布，别按「路由段」这个说法去找**：路由 **handler 定义在文件前部**（`:3663–:4305`，图片/文件夹/方案系列），**路由表在 `:4414` 之后**（`:4459/:4480/:4481`）。所以「只看 `:4400` 之后」会漏掉绝大多数。这 17 处里，`:4305` 的 `readSchemes()` 属方案域、其余绝大多数属图片/文件夹域（本任务 (c) 段），全部要改成传 `paths`。

改完后若有残留，逐个判断是「路由体里的漏网」（要改）还是「非路由位置的正当调用」（如模块内部默认值路径、测试辅助）—— 后者在报告里说明即可。

**这条教训对后续任务同样成立：用 grep 复核「某 helper 是否已空间化」时，必须同时查「裸常量名」与「无参调用」两种形态 —— 只查前者会漏掉后者；且不要用「文件后半段」当作路由段的行号假设。**

**`SPACE_UNKNOWN` 的 400 响应体**：`/webgrp/*` 内部端点用现有 `sendError(response, 400, msg)` 形态即可，不必用 v1 信封 —— 本任务只需保证 HTTP 400。若该路径落在 v1 分支内，用 `sendV1Error`。实现时按所处分支选择，测试只断言状态码 400。

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm vitest run server/spaceDispatch.test.mjs server/`
Expected: PASS 全绿（既有测试也必须全绿 —— 它们不带任何空间标识，走回退路径落到 default）

- [ ] **Step 5: 提交**

```bash
git add server/server.mjs server/spaceDispatch.test.mjs
git commit -m "feat(server): 三处派发点注入空间 paths，native 端点解析前短路

server.mjs 有三个派发点（exact :4586 / 动态 :4595 / v1 :4611），签名
各不相同，原先只在「一处」注入会漏掉两个。7 个 handler 未解构 request
需补。无来源请求回退首个空间并回 X-Space-Fallback 与 Set-Cookie。"
```

---

### Task 10: 全局线路注册表按空间缓存 + 删除时序

**Files:**
- Modify: `server/server.mjs:41-44`、`:4494-4511`
- Test: `server/spaceGlobalLines.test.mjs`（新建）

**Interfaces:**
- Consumes: `ctx.paths`（Task 9）、`SpaceStore`（Task 2）
- Produces:
  - `registryFor(paths): GlobalLineRegistry` —— 按 `paths.root` 惰性建并缓存
  - `evictRegistry(spaceRoot): Promise<void>` —— 排空队列后驱逐

**背景**：`createGlobalLineRegistry` 闭包持有 `queue` + `initialized`，构造时 `resolve` 绑死路径（`globalLineRegistry.mjs:653-665`），不能每请求新建。且删除空间时若不先排空在飞写操作，注册表会按旧绝对路径写回，把已删空间在 `workspaces/<id>/schemes/` 下重新建出骨架。

- [ ] **Step 1: 写失败测试**

Create `server/spaceGlobalLines.test.mjs`:

```js
// 全局线路按空间隔离。
import { expect, test, beforeAll, afterAll } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { installDomShim } from "./domShim.mjs";

installDomShim();

let dataDir; let server; let baseUrl; let store;
beforeAll(async () => {
  dataDir = mkdtempSync(join(tmpdir(), "space-global-lines-"));
  process.env.GRAPH_MODEL_DATA_DIR = dataDir;
  const { createImageServer } = await import("./server.mjs");
  const { createSpaceStore } = await import("./spaceStore.mjs");
  store = createSpaceStore(dataDir);
  await store.ensureInitialized();
  await store.create("张三");
  // 注入自建 store，避免同进程第二个注册表实例（见 spaceDispatch.test.mjs 的同类说明）
  server = await createImageServer({ port: 0, host: "127.0.0.1", spaceStore: store });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});
afterAll(async () => {
  if (server) await new Promise((r) => server.close(r));
  delete process.env.GRAPH_MODEL_DATA_DIR;
  rmSync(dataDir, { recursive: true, force: true });
});

test("GET /global-lines 按空间返回各自注册表", async () => {
  const def = await fetch(`${baseUrl}/webgrp/global-lines`).then((r) => r.json());
  const zhang = await fetch(`${baseUrl}/webgrp/global-lines`, { headers: { "x-space": "张三" } })
    .then((r) => r.json());
  expect(def).toHaveProperty("records");
  expect(zhang).toHaveProperty("records");
  expect(zhang.records).toHaveLength(0);
});

test("删除空间时排空注册表队列，目录不复活", async () => {
  await fetch(`${baseUrl}/webgrp/global-lines`, { headers: { "x-space": "张三" } });
  const { evictRegistry } = await import("./server.mjs");
  await evictRegistry(join(dataDir, "workspaces", "张三"));
  await store.remove("张三");
  const { existsSync } = await import("node:fs");
  await new Promise((r) => setTimeout(r, 100));
  expect(existsSync(join(dataDir, "workspaces", "张三"))).toBe(false);
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm vitest run server/spaceGlobalLines.test.mjs`
Expected: FAIL —— `张三` 与 default 返回同一个注册表（隔离未生效）；`evictRegistry` 未导出

- [ ] **Step 3: 写实现**

`server/server.mjs` 中把模块级单例（`:41-44`）

```js
const globalLineRegistry = createGlobalLineRegistry({
  dataRoot,
  schemeFilesRoot: join(schemeDataDir, "files")
});
```

替换为按空间缓存：

```js
// 全局线路注册表按空间缓存：registry 闭包持有 queue + initialized 并绑死路径，
// 不能每请求新建；也不能跨空间共用一个实例。
const registries = new Map();   // paths.root → registry
function registryFor(paths) {
  let registry = registries.get(paths.root);
  if (!registry) {
    registry = createGlobalLineRegistry({
      dataRoot: paths.root,
      schemeFilesRoot: paths.schemeFiles
    });
    registries.set(paths.root, registry);
  }
  return registry;
}

// 删除空间前必须：排空在飞写队列 → 驱逐缓存 → 才允许删目录。
// 否则在飞操作会按旧绝对路径写回，把已删空间重新建出骨架。
export async function evictRegistry(spaceRoot) {
  const registry = registries.get(spaceRoot);
  if (!registry) return;
  await registry.flush();          // 排空在飞写操作，见下方「必须新增 flush 方法」
  registries.delete(spaceRoot);
}
```

**必须新增 `flush` 方法 —— 已核实是确定项，不是「若」。** `createGlobalLineRegistry` 当前的完整暴露面为：`list`、`hydrateProject`、`attach`、`detach`、`update`、`deleteEmpty`、`syncProject`、`detachProject`、`rebuildFromStorage` —— **没有任何排空写队列的出口**，而 T11 的 `evictRegistry`（删除空间时须先排空在飞写操作，否则旧绝对路径的 `atomicWriteFile` 会把已删空间重建出骨架）恰恰需要它。

修法：在 `globalLineRegistry.mjs` 的返回对象里加一个方法（该文件唯一允许改动的地方）：

```js
// 排空在飞写操作：删除空间前必须先调用，否则队列里的写会按旧绝对路径
// 把已删除的空间目录重建出来。
flush: () => locked(() => undefined),
```

`locked` 已在 `createGlobalLineRegistry` 的闭包内（`globalLineRegistry.mjs:657-662`），故这是一行。

6 条 `/global-lines/*` 路由（`:4494`、`:4497`、`:4500`、`:4503`、`:4506`、`:4509`）改为 `registryFor(paths)`。因 `globalLineRegistry.mjs:653` 的 `createGlobalLineRegistry` 现在被多次调用，确认其模块级只有常量（`:7-19`，已核实），无跨空间共享状态。

**改路由不够 —— 6 个 handler 也要接 `paths`。** 它们当前都直接引用模块级单例 `globalLineRegistry`：

| handler | 行 | 当前签名 |
|---------|-----|---------|
| `handleListGlobalLines` | `:4090` | `(response)` → 改为 `(response, paths)` |
| `handleAttachGlobalLine` | `:4097` | `(request, response)` → `(request, response, paths)` |
| `handleDetachGlobalLine` | `:4101` 附近 | 同上 |
| `handleUpdateGlobalLineRecord` | — | 同上 |
| `handleDeleteGlobalLineRecord` | — | 同上 |
| `handleSyncGlobalLineProject` | — | 同上 |

每个 handler 内的 `globalLineRegistry.<method>(…)` 改为 `registryFor(paths).<method>(…)`。用以下命令在改完后确认模块级单例已无引用：

```bash
grep -n "globalLineRegistry\." server/server.mjs
```

预期：除 `registryFor` 内部一行外无命中。

**还有第三处调用点，不在 6 条路由也不在 6 个 handler 里 —— 只改路由与 handler 会漏掉它。** T9 的评审与实现者在读 `writeSchemeFiles` 时发现（`server.mjs:3571-3572`）：

```js
// server.mjs:3571（T9 已修：补传 { paths } 给 archiveStaleSchemeFiles）
await archiveStaleSchemeFiles(filesRoot, expectedFiles, expectedDirs);
// server.mjs:3572（本任务要改）
await globalLineRegistry.rebuildFromStorage();
```

`:3572` 调模块级单例的后果：**保存空间 A 的方案时会去重建默认空间的全局线路注册表，且完全没重建 A 的**。T9 已按裁决只加了一行 `TODO(Task 10)` 注释、未改代码（因为 `registryFor(paths)` 是本任务的产物，T9 硬改会造出与它撞车的临时第二套机制）。

改为：

```js
await registryFor(paths).rebuildFromStorage();
```

`writeSchemeFiles` 已经拿到 `paths`（`server.mjs:3545`），故只需换这一行。上面那条 `grep` 会同时命中它 —— **预期命中里「除 `registryFor` 内部一行外」这个判据，正是靠这一处来验的**：改完后 `:3572` 不应再以 `globalLineRegistry.` 形态出现。

#### 单例调用点共 **10 处**，其中 4 处在内部函数里 —— T9 的复审实测点名

上述 `grep -n "globalLineRegistry\." server/server.mjs` 的 T9 结束时基线：

| 行 | 方法 | 位置形态 |
|----|------|---------|
| `:393` | `hydrateProject` | **内部函数内**（不在路由、也不在 handler） |
| `:3499` | `syncProject` | **内部函数内** |
| `:3540` | `detachProject` | **内部函数内** |
| `:3576` | `rebuildFromStorage` | **内部函数内**（即本任务 Step 3 详述的那处） |
| `:4132` | `list` | handler 内（`handleListGlobalLines`） |
| `:4140` | `attach` | handler 内 |
| `:4148` | `detach` | handler 内 |
| `:4156` | `update` | handler 内 |
| `:4164` | `deleteEmpty` | handler 内 |
| `:4172` | `syncProject` | handler 内 |

**前 4 处是「只改路由层与 handler 就会漏掉」的那一类** —— T9 的复审专门提醒：「仅记录以免 T10 只改路由层时再次漏掉『handler 内部函数里的调用点』这一形态」。它们与第三类漏网形态同族：调用点藏在被 handler 间接调用的函数里，改路由表与 handler 签名都碰不到。

改完后必须 `grep` 复查：**10 处应全部变为 `registryFor(paths).<method>(…)`**，且 `server.mjs:46-49` 的模块级单例声明随之删除。

> **发布门禁（T9 评审提出）：本任务落地前不得发布。**
>
> T9 结束时仍存在两个「空间 A 的请求读写空间 B 数据」的面，都由本任务收口：
>
> 1. `server.mjs:3572` —— 模块级单例，保存空间 A 的方案时重建**默认空间**的注册表（一次对默认空间数据的实际写入），且完全不重建 A 的；
> 2. 6 条 `/webgrp/global-lines/*` 路由 —— handler 未接 `paths`（路由表中仍是 `async ({ response })` / `async ({ request, response })`），带 `?space=张三` 的 `attach/detach/record/sync-project/list` 会**读并写**默认空间的注册表与默认空间的方案文件；**这条是 API 可见的，内容会返回给请求者**。
>
> 模块级单例的构造处是 `server.mjs:46-49`（以 `schemeFilesRoot: join(schemeDataDir, "files")` 构造），改成按空间缓存后应一并清掉。`globalLineRegistry.mjs:1012-1020` 的 `readState(registryPath) + writeState(registryPath, state)` 就是那两个实际读写点。

**响应形状已核实**：`handleListGlobalLines`（`:4091-4094`）返回 `{ok:true, records: await …list()}`，故 T10 测试里的 `toHaveProperty("records")` 与 `records` 长度断言正确。

同时把 `server.mjs:34` 的 `schemeTrashDir` 等已无引用的常量清掉（Task 8 Step 4 留下的）。

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm vitest run server/spaceGlobalLines.test.mjs server/globalLineApi.test.mjs server/`
Expected: PASS 全绿

- [ ] **Step 5: 提交**

```bash
git add server/server.mjs server/globalLineRegistry.mjs server/spaceGlobalLines.test.mjs
git commit -m "feat(server): 全局线路注册表按空间缓存，删除空间前排空队列"
```

---

### Task 11: `/webgrp/spaces` 空间管理 4 端点

**Files:**
- Modify: `server/server.mjs`（在 exact 路由 Map 中新增 4 条）
- Test: `server/spaceApi.test.mjs`（新建）

**Interfaces:**
- Consumes: `SpaceStore`（Task 2）、`evictRegistry`（Task 10）、`ctx.spaceId` / `ctx.paths`（Task 9）
- Produces:
  - `GET /webgrp/spaces` → `{ spaces: Space[], current: string }`
  - `POST /webgrp/spaces` body `{ name }` → `Space`；空名/全符号 → 400 `SPACE_NAME_INVALID`
  - `PUT /webgrp/spaces` body `{ id, name }` → `{ ok: true }`
  - `DELETE /webgrp/spaces` body `{ id }` → `{ ok: true }`；pinned → 400 `SPACE_PINNED`

**不进 `/v1/*` 信封域** —— 这是本系统自身的管理面，不是对第三方开放的能力。

> **⚠ 必须先加进派发层的短路名单，否则这四个端点会被空间解析先拦掉。**
>
> Task 9 建立的空间解析覆盖**所有**路径，且发生在路由匹配**之前**。T9 的评审指出这对管理端点是致命的：
>
> - `POST /webgrp/spaces?space=新空间` —— 请求带了一个**尚不存在**的空间名（它正是要创建的），解析处判 `unknown` → **400，永远到不了 handler**；
> - 删除空间后的管理请求 —— 解析处对未知 id 走**静默回退 default**，于是「列出空间」这类操作会以 default 的身份执行，语义错乱。
>
> 修法：把 `/webgrp/spaces` 加进 Task 9 已有的短路名单（`server.mjs:4630-4631` 的 `isHostBound` 判定），与 `/exports/native/*` 同类 —— 它们都是**与空间数据无关的元操作**。命名可改得更贴切：
>
> ```js
> // 与空间数据无关的元端点：不经空间解析
> const isSpaceAgnostic = url.pathname === apiPath("/exports/native/select-file")
>   || url.pathname === apiPath("/exports/native/write-text")
>   || url.pathname === apiPath("/spaces");
> ```
>
> **注意**：`GET /webgrp/spaces` 的 `current` 字段**仍然需要**解析结果 —— 该 handler 自己调 `resolveSpaceFromRequest` 拿它（不经派发层的注入），T9 的实现已经这么做了。故此处只影响「是否在派发层拦截」，不影响 `current` 的语义。

**响应信封形态（T9 评审 Minor 2）**：空间解析失败时派发层走 `sendError(response, 400, msg, "SPACE_UNKNOWN")`，产出 `{error:{code,message}}` —— **没有 `ok:false` 字段**，与 v1 域的 `{ok:false,error:{...}}` 不同形。这是有意的（解析发生在「还不知道请求将落到 exact / 动态 / v1 哪个分支」之前），但**按 `body.ok === false` 判错的 v1 客户端会看空**。Task 14 的 `/swigger` 页首说明应补一句这一差异；本任务的 4 个管理端点自身按 `/webgrp/*` 内部域形态返回，不进 v1 信封。

**另一条结构性后果（T9 评审 Minor 4，记录备查）**：`isHostBound` 用的是 `url.pathname === apiPath(...)` **精确相等**，故路径变体（如尾斜杠）既命不中短路、也命不中路由，会在空间解析处先被 400 而非 404。当前无客户端这么发。

- [ ] **Step 1: 写失败测试**

Create `server/spaceApi.test.mjs`:

```js
// /webgrp/spaces 空间管理端点。
import { expect, test, beforeAll, afterAll } from "vitest";
import { mkdtempSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { installDomShim } from "./domShim.mjs";

installDomShim();

let dataDir; let server; let baseUrl;
beforeAll(async () => {
  dataDir = mkdtempSync(join(tmpdir(), "space-api-"));
  process.env.GRAPH_MODEL_DATA_DIR = dataDir;
  const { createImageServer } = await import("./server.mjs");
  server = await createImageServer({ port: 0, host: "127.0.0.1" });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});
afterAll(async () => {
  if (server) await new Promise((r) => server.close(r));
  delete process.env.GRAPH_MODEL_DATA_DIR;
  rmSync(dataDir, { recursive: true, force: true });
});

const json = (body, init = {}) => ({
  method: init.method ?? "GET",
  headers: { "content-type": "application/json", ...(init.headers ?? {}) },
  ...(body ? { body: JSON.stringify(body) } : {})
});

test("GET 返回 spaces 与 current", async () => {
  const res = await fetch(`${baseUrl}/webgrp/spaces`);
  expect(res.status).toBe(200);
  const body = await res.json();
  expect(body.current).toBe("default");
  expect(body.spaces[0]).toMatchObject({ id: "default", pinned: true });
});

test("POST 建空间并建出目录骨架", async () => {
  const res = await fetch(`${baseUrl}/webgrp/spaces`, json({ name: "张三" }, { method: "POST" }));
  expect(res.status).toBe(200);
  const space = await res.json();
  expect(space.id).toBe("张三");
  expect(existsSync(join(dataDir, "workspaces", "张三"))).toBe(true);
});

test("POST 空名返回 400 SPACE_NAME_INVALID", async () => {
  const res = await fetch(`${baseUrl}/webgrp/spaces`, json({ name: "   " }, { method: "POST" }));
  expect(res.status).toBe(400);
  expect((await res.json()).error.code).toBe("SPACE_NAME_INVALID");
});

test("PUT 改名只改 name", async () => {
  await fetch(`${baseUrl}/webgrp/spaces`, json({ name: "李四" }, { method: "POST" }));
  const res = await fetch(`${baseUrl}/webgrp/spaces`, json({ id: "李四", name: "李四丰" }, { method: "PUT" }));
  expect(res.status).toBe(200);
  const body = await fetch(`${baseUrl}/webgrp/spaces`).then((r) => r.json());
  expect(body.spaces.find((s) => s.id === "李四").name).toBe("李四丰");
});

test("DELETE pinned 空间返回 400 SPACE_PINNED", async () => {
  const res = await fetch(`${baseUrl}/webgrp/spaces`, json({ id: "default" }, { method: "DELETE" }));
  expect(res.status).toBe(400);
  expect((await res.json()).error.code).toBe("SPACE_PINNED");
});

test("DELETE 普通空间移入 trash-spaces", async () => {
  await fetch(`${baseUrl}/webgrp/spaces`, json({ name: "待删" }, { method: "POST" }));
  const res = await fetch(`${baseUrl}/webgrp/spaces`, json({ id: "待删" }, { method: "DELETE" }));
  expect(res.status).toBe(200);
  expect(existsSync(join(dataDir, "workspaces", "待删"))).toBe(false);
  expect(existsSync(join(dataDir, "trash-spaces"))).toBe(true);
});

test("current 随 cookie 变化，与请求实际生效空间一致", async () => {
  const res = await fetch(`${baseUrl}/webgrp/spaces`, { headers: { cookie: "gmp_space=张三" } });
  expect((await res.json()).current).toBe("张三");
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm vitest run server/spaceApi.test.mjs`
Expected: FAIL —— `GET /webgrp/spaces` 返回 404（接口不存在）

- [ ] **Step 3: 写实现**

在 `createImageServer` 内的 `exactRouteHandlers` Map 中新增 4 条（紧跟 `"GET /swigger"` 之后）：

```js
[routeKey("GET", "/spaces"), async ({ request, response, url, spaceId }) => {
  const spaces = await spaceStore.list();
  await spaceStore.touchLastAccess(spaceId);
  // current 用同一个解析函数算出，保证与请求实际生效空间一致
  const current = resolveSpaceFromRequest(request, url, spaceStore).id;
  sendJson(response, 200, { spaces, current });
}],
[routeKey("POST", "/spaces"), async ({ request, response }) => {
  const body = await readJsonBody(request);
  const name = String(body?.name ?? "").trim();
  // 空名与全符号名一律拒绝。注意 spaceIdFromName 对全符号名有 "space" 兜底，
  // 那是给非 HTTP 调用方的防御，不改变本端点的拒绝语义。
  if (!name || !name.replace(/[^\p{L}\p{N}_-]+/gu, "")) {
    sendError(response, 400, "空间名不能为空。", "SPACE_NAME_INVALID");
    return;
  }
  sendJson(response, 200, await spaceStore.create(name));
}],
[routeKey("PUT", "/spaces"), async ({ request, response }) => {
  const body = await readJsonBody(request);
  try {
    await spaceStore.rename(String(body?.id ?? ""), body?.name);
    sendJson(response, 200, { ok: true });
  } catch (error) {
    sendError(response, 400, error.message, "SPACE_RENAME_FAILED");
  }
}],
[routeKey("DELETE", "/spaces"), async ({ request, response }) => {
  const body = await readJsonBody(request);
  const id = String(body?.id ?? "");
  if (id === "default") {
    sendError(response, 400, "default 空间不可删除。", "SPACE_PINNED");
    return;
  }
  try {
    // 先排空全局线路注册表队列并驱逐缓存，再删目录；
    // 顺序反了会让在飞写操作按旧绝对路径把目录复活。
    await evictRegistry(spaceStore.resolvePaths(id).root);
    await spaceStore.remove(id);
    sendJson(response, 200, { ok: true });
  } catch (error) {
    const code = /pinned|最后一个/.test(error.message) ? "SPACE_PINNED" : "SPACE_DELETE_FAILED";
    sendError(response, 400, error.message, code);
  }
}],
```

`readJsonBody(request, maxBytes, message)` 已存在（如 `:4098` 的用法：`await readJsonBody(request, maxMeasurementConfigBodyBytes, "全局线路数据过大，最大支持 1MB。")`）—— 直接复用，签名按该形态。400 响应走 **Task 9 已扩展过的** `sendError(response, status, message, code)`（带 code 时产出 `{error:{code,message}}`），本任务无需再改它。

> **`evictRegistry` 之后还有一个窗口，本任务必须堵 —— T10 实现者交接 + T10 评审实测。**
>
> `registryFor(paths)` 是**惰性**的：缓存条目被删掉后，下一次调用会重新构造，并（在首次 `ensureInitialized` / `rebuildFromStorage` 时）**按旧路径写回**，于是已删空间的骨架复活。
>
> **T10 评审把机制说得更准，而且它推翻了一条设计假设**：窗口不在「`evictRegistry` 之后到达的新请求」，而在**已经在场、卡在 body 读取**的请求。五个写类 handler（`server.mjs:4155` `handleAttachGlobalLine`、`:4166`、`:4174`、`:4182`、`:4190`）**全部先 `await readJsonBody` 再 `registryFor(paths)`**，于是：
>
> 1. 请求在同步段完成空间解析（`:4656`）；
> 2. 随即 `await readJsonBody` 挂起 —— **此时它还没调用过 `registryFor`**；
> 3. 删除流程跑 `evictRegistry` → `registries.get` 未命中 → **直接早退**；
> 4. 那个请求恢复后首次构造 registry → 按已删空间的旧绝对路径 `atomicWriteFile` → 骨架复活。
>
> GET / list 类无此窗口（它们在同步段就入队，T10 的测试 3 正是靠这一点钉住排空语义）；**写类端点全有**。
>
> 故 `flush` + 驱逐**不足以保证不留骨架** —— 「T11 只需在返回后调 `store.remove(id)`」不成立。
>
> **修法：tombstone 必须在删除流程开始时设置，而不是 `evictRegistry` 之后。** 在 `spaceStore` 加「删除中」标记（内存 `Set<spaceId>`），`registryFor` 对该标记短路拒绝构造；`spaceStore.remove(id)` 完成后清除（id 已从注册表消失，后续请求只会得到 400 或回退，不会再来构造）。**时机是要害**：因为要防的请求在删除开始前就已入场，晚设就漏。
>
> **测试必须走写类路径**：用一条 PUT/POST（其 body 读取在驱逐之后完成）来钉这个窗口 —— 只测 GET 是钉不住的，因为 GET 在同步段就入队，那条路径本来就没这个洞。
>
> 测试要求：断言「删除空间后，一条在删除期间发起的写请求不会让 `workspaces/<id>/` 重新出现」。缺少它，这个窗口就是无哨兵的。

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm vitest run server/spaceApi.test.mjs server/`
Expected: PASS 全绿

- [ ] **Step 5: 提交**

```bash
git add server/server.mjs server/spaceApi.test.mjs
git commit -m "feat(server): /webgrp/spaces 空间管理 4 端点

不进 v1 信封域——这是本系统自身的管理面。删除空间先排空全局线路
注册表队列再删目录，否则在飞写操作会把目录复活。"
```

---

### Task 12: `runtimeRegistry` 空间归属与 `?space=` 目标筛选

**Files:**
- Modify: `server/runtimeRegistry.mjs:130-177`、`server/runtimeWs.mjs:41-48`、`server/apiV1Runtime.mjs`（筛选调用点）
- Test: `server/runtimeRegistry.test.mjs`（追加）

**Interfaces:**
- Consumes: `resolveSpaceFromRequest`（Task 3）
- Produces:
  - 客户端条目新增 `workspaceId: string`
  - `pickDefaultClient(workspaceId?)` —— 传则只在该空间的活跃客户端中取
  - `resolveClient(clientId, workspaceId?)` —— 传则校验客户端所属空间
  - `listClients()` 返回条目新增 `workspaceId`

**背景**：`pickDefaultClient()`（`runtimeRegistry.mjs:142-150`）按 `lastActiveAt` 倒序取第一个，多空间上线后张三李四各开一个前端时会打错人。且 `runtimeWs.mjs:46` 的 `wss.emit("connection", ws, request)` 虽传了 `request`，`:48` 的监听器签名 `(ws) => {}` 没接住，读不到 cookie。

- [ ] **Step 1: 写失败测试**

Append to `server/runtimeRegistry.test.mjs`:

```js
test("pickDefaultClient 按空间筛选", async () => {
  const registry = createRuntimeRegistry();
  registry.register({ clientId: "a", workspaceId: "张三" });
  registry.register({ clientId: "b", workspaceId: "李四" });
  expect(registry.pickDefaultClient("张三").clientId).toBe("a");
  expect(registry.pickDefaultClient("李四").clientId).toBe("b");
  expect(() => registry.pickDefaultClient("王五")).toThrow(/no-online-client/);
});

test("resolveClient 校验客户端所属空间", () => {
  const registry = createRuntimeRegistry();
  registry.register({ clientId: "a", workspaceId: "张三" });
  expect(registry.resolveClient("a", "张三").clientId).toBe("a");
  expect(() => registry.resolveClient("a", "李四")).toThrow(/no-online-client/);
});

test("listClients 返回 workspaceId", () => {
  const registry = createRuntimeRegistry();
  registry.register({ clientId: "a", workspaceId: "张三" });
  expect(registry.listClients()[0].workspaceId).toBe("张三");
});
```

（若该测试文件的既有 setup 用别的方式构造 registry，照其现有写法调整，勿改既有用例。）

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm vitest run server/runtimeRegistry.test.mjs`
Expected: FAIL —— `pickDefaultClient` 不接受参数；条目无 `workspaceId`

- [ ] **Step 3: 写实现**

`server/runtimeRegistry.mjs`：

1. `register(entry)` 存入 `workspaceId: String(entry.workspaceId ?? "")`
2. `pickDefaultClient(workspaceId)`：

```js
function pickDefaultClient(workspaceId) {
  const active = Array.from(clients.values())
    .filter((entry) => entry.lastActiveAt >= cutoff())
    .filter((entry) => !workspaceId || entry.workspaceId === workspaceId);
  active.sort((a, b) => b.lastActiveAt - a.lastActiveAt);
  const picked = active[0];
  if (!picked) throw new NoOnlineClientError();
  return picked;
}
```

3. `resolveClient(clientId, workspaceId)`：未知 id 或空间不匹配均抛 `NoOnlineClientError`
4. `listClients()` 返回 `{ clientId, workspaceId, lastActiveAt, … }`

`server/runtimeWs.mjs:48` 改签名接住 `request`：

```js
wss.on("connection", (ws, request) => {
  const url = new URL(request.url, `http://${request.headers.host ?? "127.0.0.1"}`);
  // 空间 id 无法在此处用 store 校验（store 在 server.mjs 内），只存原值
  const workspaceId = parseSpaceCookie(request.headers.cookie);
  …
});
```

`apiV1Runtime.mjs` 的 10 个 handler：`clientId` 未显式给出时，用 `resolveSpaceFromRequest` 得到的空间 id 调 `pickDefaultClient(spaceId)`，而不是无参调用。

**`apiV1Control.mjs` 的 11 个 handler 同样要接 —— 这是原计划的缺口，实施时发现。** 设计 §8.4 说的「21 个会话类端点」= **10 runtime + 11 control**，而原范围只写了前者。`apiV1Control.mjs` 此前**没有任何空间概念**（文件头注释原文：「query 可带 clientId（不指定取默认活跃客户端）」）—— 正是本任务要修的错靶，且它属**写**域（`device/add`、`save`、`template/saveFromSelection` 等）。语义与 runtime 完全一致：带 `?space=` → 在该空间的在线客户端中选；带 `clientId` → 仍以 `clientId` 为准；两者都没带 → 按**调用方自身解析出的空间**筛。

**注册时的空间归位（实施时发现的关键一环）**：若某前端连接时没有 cookie（Node WS 客户端就是如此），把它记成 `workspaceId = ""` 会让它**既不匹配任何具体空间、也不匹配 `default`** —— 于是无空间调用方按 §3 解析成 `default` 后选不中它，5 条既有集成用例因此变红。**修法是在注册时归位**：解析不到已知空间时取 `spaceStore.firstId()`（即 `default`），与派发层的回退语义一致。这样筛选保持**严格**（`candidates = matched`，不设兜底级），那 5 条用例自然恢复，且「请求空间 A 不会选中 default 的客户端」成立。

**不要**用「兜底级」绕过（无匹配时回退到任意活跃客户端）—— 那保留了本任务要消灭的错靶。

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm vitest run server/runtimeRegistry.test.mjs server/apiV1Runtime.test.mjs server/`
Expected: PASS 全绿

- [ ] **Step 5: 提交**

```bash
git add server/runtimeRegistry.mjs server/runtimeWs.mjs server/apiV1Runtime.mjs server/runtimeRegistry.test.mjs
git commit -m "feat(server): 运行时客户端带 workspaceId，?space= 筛选目标前端

原 pickDefaultClient 取活跃者，多空间下会打错人。筛选逻辑落在
runtimeRegistry 而非 WS 层；runtimeWs 的 connection 回调原先没接住
request，读不到 cookie。"
```

---

### Task 13: CORS 允许 `X-Space`

**Files:**
- Modify: `server/server.mjs:53-57`
- Test: `server/spaceCors.test.mjs`（新建）

**Interfaces:**
- Consumes: 无
- Produces: `access-control-allow-headers` 含 `x-space`

- [ ] **Step 1: 写失败测试**

Create `server/spaceCors.test.mjs`:

```js
// 跨源预检必须允许 X-Space，否则浏览器第三方调用被预检拦死。
import { expect, test, beforeAll, afterAll } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { installDomShim } from "./domShim.mjs";

installDomShim();

let dataDir; let server; let baseUrl;
beforeAll(async () => {
  dataDir = mkdtempSync(join(tmpdir(), "space-cors-"));
  process.env.GRAPH_MODEL_DATA_DIR = dataDir;
  const { createImageServer } = await import("./server.mjs");
  server = await createImageServer({ port: 0, host: "127.0.0.1" });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});
afterAll(async () => {
  if (server) await new Promise((r) => server.close(r));
  delete process.env.GRAPH_MODEL_DATA_DIR;
  rmSync(dataDir, { recursive: true, force: true });
});

test("OPTIONS 预检允许 x-space", async () => {
  const res = await fetch(`${baseUrl}/webgrp/schemes`, {
    method: "OPTIONS",
    headers: { origin: "http://example.com", "access-control-request-headers": "x-space" }
  });
  expect(res.status).toBe(204);
  expect(res.headers.get("access-control-allow-headers")?.toLowerCase()).toContain("x-space");
  expect(res.headers.get("access-control-allow-headers")?.toLowerCase()).toContain("content-type");
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm vitest run server/spaceCors.test.mjs`
Expected: FAIL —— `access-control-allow-headers` 只有 `content-type`

- [ ] **Step 3: 写实现**

`server/server.mjs:53-57`：

```js
const accessControlHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,PUT,DELETE,OPTIONS",
  // x-space：空间标识头。缺它则浏览器的跨源预检失败。
  // 注意 allow-origin:* 与携带 Cookie 的跨源请求互斥（浏览器拒绝），
  // 故 Cookie 仅限同源；跨源第三方只能走 ?space= 或 X-Space。
  "access-control-allow-headers": "content-type,x-space"
};
```

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm vitest run server/spaceCors.test.mjs server/`
Expected: PASS 全绿

- [ ] **Step 5: 提交**

```bash
git add server/server.mjs server/spaceCors.test.mjs
git commit -m "fix(server): CORS 允许头补 x-space，否则跨源预检拦死空间标识"
```

---

### Task 14: swigger 加 `scope` 字段、空间说明与 4 个新端点

**Files:**
- Modify: `server/swaggerPage.mjs:18-244`（`SWIGGER_ENDPOINTS`）、`:390-` 内联脚本（空间下拉）
- Test: `server/swigger.examples.test.mjs`

**Interfaces:**
- Consumes: `GET /webgrp/spaces`（Task 11）、`SPACE_COOKIE_NAME`（Task 3）
- Produces:
  - 每个端点元数据新增 `scope: "space" | "session" | "global" | "host"`
  - `SWIGGER_ENDPOINTS` 新增 4 个 `/webgrp/spaces`，`scope: "global"`
  - 页面顶部加空间下拉与说明

- [ ] **Step 1: 补 `scope` 字段**

按 §8.1 的分类给全部 62 个已有端点逐个加 `scope`（在 `group` 同行后插入）：

| scope | 端点（按 `path` 匹配） |
|-------|----------------------|
| `space` | `/webgrp/images`、`/webgrp/images/{id}`、`/webgrp/image-folders`、`/webgrp/image-folders/{folderId}`（后接 `POST /webgrp/images` 的 `images`）、`/webgrp/schemes` 全部 9 条、`/webgrp/color-config` 2 条、`/webgrp/measurement-config` 2 条、`/webgrp/device-library` 2 条、v1 方案域除 receive 的 10 条、v1 图元库域 6 条 |
| `session` | `/webgrp/v1/runtime/*` 10 条、`/webgrp/v1/control/*` 11 条 |
| `global` | `/webgrp/v1/receive` 3 条 |
| `host` | `/webgrp/exports/native/select-file`、`/webgrp/exports/native/write-text` |

**`host` 类不加入 `SWIGGER_ENDPOINTS`。** `swigger.examples.test.mjs` 会遍历 `SWIGGER_ENDPOINTS` 逐个真实发起请求 —— 这两条一旦进入列表，测试就会调起 Windows「另存为」GUI 对话框并挂住。改为只写进页首说明（Task 14 Step 4 的说明文案里已含「本机端点 `/webgrp/exports/*` 与空间无关」这句），并在 `SWIGGER_ENDPOINTS` 旁的注释里记下原因：

```js
// /webgrp/exports/native/*（本机端点）刻意不收进本列表：
// swigger.examples.test.mjs 会逐个真实调用，那两条会弹 Windows 另存为对话框。
```

**还差 3 条未文档化的空间端点**：`DELETE /webgrp/images/{id}`（`server.mjs:4554-4559`）、`POST /webgrp/icon-library/import`（`:4437-4439`）、`POST /webgrp/image-library/import`（`:4440-4442`）。三者已天然经 `ctx.paths` 落对空间（Task 7/9 覆盖），本步只需把它们补入 `SWIGGER_ENDPOINTS` 并标 `scope: "space"`，附最小示例。

**`model/send` 加脚注**：给已有的 `POST /webgrp/v1/schemes/model/send` 那条端点（`swaggerPage.mjs:130` 附近）的 `desc` 追加：

> ⚠ 空间读 + **对外副作用**：读侧按空间解析，但出站目标是调用方给定的 `url`，不受空间约束。它虽归 `scope: "space"`，却是全仓唯一能把空间内数据主动推送到任意外部 URL 的端点 —— **无来源时按既定策略回退 `default`**，一次忘带空间标识的调用会把默认空间的模型发出去，且不可撤回。

- [ ] **Step 2: 新增 4 个 `/webgrp/spaces` 端点**

```js
{ scope: "global", group: "空间管理", method: "GET", path: "/webgrp/spaces", desc: "空间列表与当前生效空间", response: "{spaces:[{id,name,pinned,createdAt,lastAccessAt}],current}", examples: [
  { label: "全部空间", params: {} }
]},
{ scope: "global", group: "空间管理", method: "POST", path: "/webgrp/spaces", desc: "新建空间（重名自动去重 id）", body: { name: "张三" }, response: "{id,name,pinned,createdAt}", examples: [
  { label: "新建「示例空间」", params: { __body__: { name: "示例空间" } } }
]},
{ scope: "global", group: "空间管理", method: "PUT", path: "/webgrp/spaces", desc: "空间改名（不动目录）", body: { id: "示例空间", name: "新名" }, response: "{ok:true}", examples: [
  { label: "改名（需先建过该空间）", params: { __body__: { id: "示例空间", name: "新名" } } }
]},
{ scope: "global", group: "空间管理", method: "DELETE", path: "/webgrp/spaces", desc: "删除空间（目录移入 trash-spaces；default 不可删）", body: { id: "示例空间" }, response: "{ok:true}", examples: [
  { label: "删除（default 会 400）", params: { __body__: { id: "default" } } }
]}
```

**示例参数必须不污染其他用例的前置状态** —— `PUT`/`DELETE` 的示例都指向 `示例空间`（各自用例内先 POST 建出），`DELETE` 的示例刻意指向 `default` 以稳定拿 400。

- [ ] **Step 3: 补 `swigger.examples.test.mjs` 的期望分支**

`expectFor(ep, ex)`（`:252`）是逐端点硬编码的期望状态码表。为 4 个新端点补：

```js
if (ep.path === "/webgrp/spaces" && ep.method === "GET") return { status: 200 };
if (ep.path === "/webgrp/spaces" && ep.method === "POST") return { status: 200 };
if (ep.path === "/webgrp/spaces" && ep.method === "PUT") return { status: 400 };      // 示例空间尚不存在
if (ep.path === "/webgrp/spaces" && ep.method === "DELETE") return { status: 400 };   // 示例指向 default，pinned
```

若 `PUT` 需要在用例内先建空间，按该文件既有的 `expectFor` 用法调整（保持「不依赖前一个用例的副作用」）。

- [ ] **Step 4: 页面加空间下拉**

在 `server/swaggerPage.mjs` 的内联脚本里（`buildUrl` 附近）加：

```js
function currentSpaceId() {
  const m = document.cookie.match(/(?:^|;\s*)gmp_space=([^;]*)/);
  return m ? decodeURIComponent(m[1]) : "";
}
function switchSpace(id) {
  document.cookie = "gmp_space=" + encodeURIComponent(id) + "; Path=/; Max-Age=31536000; SameSite=Lax";
  location.reload();
}
```

并在页首渲染一个 `<select id="space-switcher">`，`onchange` 调 `switchSpace`，选项来自 `fetch("/webgrp/spaces")`。**`send()` 一行不改** —— Try-it 是同源 `fetch`，Cookie 自动携带。

页首另加一行说明（写入 `renderSwaggerHtml` 的顶部 HTML）：

> 所有端点默认作用于「当前空间」（由 Cookie 决定）。脚本调用可用 `X-Space: <id>` 头或 `?space=<id>` 覆盖；跨源浏览器调用只能用 `?space=`（`allow-origin: *` 与携带 Cookie 的跨源请求互斥）。本机端点 `/webgrp/exports/*` 与空间无关。

**页首说明还须包含以下四条（T8/T9/T11/T12 各暴露一条，都是第三方直接可感的）：**

1. **非 ASCII 空间名的编码约定**（T9 暴露）：`X-Space` 头与 Cookie **都需调用方自行 `encodeURIComponent`**（头值受限为 ByteString，服务端会对头与 Cookie 各解码一次）；`?space=` 由 URL 层解码，**不要再手工编码两次**。`curl -H "X-Space: 张三"` **不可行**，必须编码。
2. **`?clientId=` 现在同时校验空间**（T12 变更）：跨空间指名一个 `clientId` 须带 `?space=<该空间>`，否则返回 **503 no-online-client**（不是 404 —— 复用既有错误码）。同时说明：不带 `clientId` 时，目标客户端按**调用方自身解析出的空间**筛，不再取「任意最近活跃」。
3. **`/v1/runtime/clients` 响应条目新增 `workspaceId`**（T12）—— 该端点的示例响应须同步，否则文档与实际不符。
4. **空间解析失败的 400 形态差异**（T9）：派发层的空间校验产出 `{error:{code,message}}`，**没有 `ok:false` 字段** —— 与 v1 域其它错误的 `{ok:false,error:{…}}` 不同形（因为校验发生在「还不知道请求将落到哪个分支」之前）。按 `body.ok === false` 判错的客户端会看空，须在此说明。

若 Step 3 也把 3 条未文档化的空间端点（`DELETE /webgrp/images/{id}`、两个 `*/import`）补进了列表，同样各补一条 `expectFor` 分支。**这 3 条属可选润色** —— 它们已天然按空间隔离（Task 7/9 覆盖），入列表只是补文档；若 `expectFor` 的现有结构难以容纳，可只保留分类而不入列表。但入了就必须补分支，否则该测试会红。

- [ ] **Step 5: 跑测试确认通过**

Run: `pnpm vitest run server/swigger.examples.test.mjs server/`
Expected: PASS 全绿。端点数为 **62 原有 + 4 个 `/webgrp/spaces`**（含可选 3 条则为 69），每条示例的状态码均与 `expectFor` 一致。

- [ ] **Step 6: 提交**

```bash
git add server/swaggerPage.mjs server/swigger.examples.test.mjs
git commit -m "docs(swigger): 端点加 scope 字段、空间下拉与 /webgrp/spaces 文档"
```

---

### Task 15: 端到端隔离集成测试

**Files:**
- Test: `server/spaceScope.test.mjs`（新建）

**Interfaces:**
- Consumes: 全部前述任务
- Produces: 无（纯测试）

- [ ] **Step 1: 写测试**

Create `server/spaceScope.test.mjs`:

```js
// 端到端空间隔离：起真实 server，两个空间的数据互不可见。
import { expect, test, beforeAll, afterAll } from "vitest";
import { mkdtempSync, rmSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { installDomShim } from "./domShim.mjs";

installDomShim();

let dataDir; let server; let baseUrl;
beforeAll(async () => {
  dataDir = mkdtempSync(join(tmpdir(), "space-scope-"));
  process.env.GRAPH_MODEL_DATA_DIR = dataDir;
  const { createImageServer } = await import("./server.mjs");
  server = await createImageServer({ port: 0, host: "127.0.0.1" });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
  await fetch(`${baseUrl}/webgrp/spaces`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "张三" })
  });
});
afterAll(async () => {
  if (server) await new Promise((r) => server.close(r));
  delete process.env.GRAPH_MODEL_DATA_DIR;
  rmSync(dataDir, { recursive: true, force: true });
});

const asZhang = (init = {}) => ({ ...init, headers: { ...(init.headers ?? {}), "x-space": "张三" } });

const project = {
  version: 1, name: "测试模型", canvasWidth: 800, canvasHeight: 400,
  layers: [{ id: "default", name: "默认图层", visible: true }],
  activeLayerId: "default", nodes: [], edges: []
};

**遍历「执行时修正」记录（本任务文本有三处硬错误，实施时全部修正）：**

1. **`"x-space": "张三"` 与 Cookie 裸中文会让 `fetch` 抛 `TypeError`** —— HTTP 头值必须是 ByteString。本文件内**所有**空间标识（头、Cookie）都要 `encodeURIComponent`；`?space=` 由 URL 层解码、**不要双重编码**。（讽刺的是我在派发指令里警告过这一点，而 brief 的代码仍是裸中文形式 —— 以派发指令为准。）
2. **`POST /webgrp/images` 实际返回 `201`**，brief 写的 `200`。
3. **ZIP 用例原本依赖前序用例写入的数据**（`.only` / 过滤跑法下必红）—— 已改为自带的双空间对照样本，自写自读。

另：`空间厂站` 这类同名/改名技巧见 Task 5 的同类记录；本文件不使用 `sleep`，「文件已落盘」这一前提靠实现不变量（回包即已落盘），而非等待。

test("方案只落在写入者所在空间", async () => {  const save = await fetch(`${baseUrl}/webgrp/schemes/project`, asZhang({
    method: "PUT", headers: { "content-type": "application/json" },
    body: JSON.stringify({ schemePath: ["默认方案"], name: "测试模型", project })
  }));
  expect(save.status).toBe(200);

  const zhangTree = await fetch(`${baseUrl}/webgrp/schemes`, asZhang()).then((r) => r.json());
  const defTree = await fetch(`${baseUrl}/webgrp/schemes`).then((r) => r.json());
  expect(JSON.stringify(zhangTree)).toContain("测试模型");
  expect(JSON.stringify(defTree)).not.toContain("测试模型");

  expect(existsSync(join(dataDir, "workspaces", "张三", "schemes", "files", "默认方案", "测试模型.json"))).toBe(true);
});

test("图元库按空间隔离", async () => {
  const put = await fetch(`${baseUrl}/webgrp/device-library`, asZhang({
    method: "PUT", headers: { "content-type": "application/json" },
    body: JSON.stringify({ customDeviceTemplates: [{ kind: "张三专用" }] })
  }));
  expect(put.status).toBe(200);

  const zhangLib = await fetch(`${baseUrl}/webgrp/device-library`, asZhang()).then((r) => r.json());
  const defLib = await fetch(`${baseUrl}/webgrp/device-library`).then((r) => r.json());
  expect(JSON.stringify(zhangLib)).toContain("张三专用");
  expect(JSON.stringify(defLib)).not.toContain("张三专用");
});

test("配色与量测配置按空间隔离", async () => {
  await fetch(`${baseUrl}/webgrp/color-config`, asZhang({
    method: "PUT", headers: { "content-type": "application/json" },
    body: JSON.stringify({ colorDisplayMode: "voltage", colorPalette: { voltage: { x: "#010203" } } })
  }));
  const zhangColor = await fetch(`${baseUrl}/webgrp/color-config`, asZhang()).then((r) => r.json());
  const defColor = await fetch(`${baseUrl}/webgrp/color-config`).then((r) => r.json());
  expect(zhangColor.colorDisplayMode).toBe("voltage");
  expect(defColor.colorDisplayMode).toBe("energy");
});

test("图片按空间隔离", async () => {
  const png = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
  const res = await fetch(`${baseUrl}/webgrp/images`, asZhang({
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ dataUrl: png, name: "张三图.png" })
  }));
  expect(res.status).toBe(200);
  const images = await fetch(`${baseUrl}/webgrp/images`, asZhang()).then((r) => r.json());
  const defImages = await fetch(`${baseUrl}/webgrp/images`).then((r) => r.json());
  expect(images).toHaveLength(1);
  expect(defImages).toHaveLength(0);
});

test("显式未知空间 400，隐式未知回退并带 X-Space-Fallback", async () => {
  const explicit = await fetch(`${baseUrl}/webgrp/schemes`, { headers: { "x-space": "没了" } });
  expect(explicit.status).toBe(400);

  const implicit = await fetch(`${baseUrl}/webgrp/schemes`, { headers: { cookie: "gmp_space=没了" } });
  expect(implicit.status).toBe(200);
  expect(implicit.headers.get("x-space-fallback")).toBe("1");
});

test("无任何来源的写请求回退 default（已接受的行为）", async () => {
  const res = await fetch(`${baseUrl}/webgrp/schemes/project`, {
    method: "PUT", headers: { "content-type": "application/json" },
    body: JSON.stringify({ schemePath: ["默认方案"], name: "匿名写入", project: { ...project, name: "匿名写入" } })
  });
  expect(res.status).toBe(200);
  expect(existsSync(join(dataDir, "schemes", "files", "默认方案", "匿名写入.json"))).toBe(true);
});

test("非 default 空间的方案 ZIP 导出成功且 json 与派生格式同源", async () => {
  // 依赖本文件前一个用例写入的「测试模型」。vitest 在单文件内按声明顺序执行。
  const res = await fetch(`${baseUrl}/webgrp/v1/schemes/export?schemePath=${encodeURIComponent(
    JSON.stringify(["默认方案"]))}`, asZhang());
  expect(res.status).toBe(200);
  expect(res.headers.get("content-type")).toContain("zip");
});

test("全局线路冒烟：两空间各自可用，不出错也不互串", async () => {
  // 真实隔离断言在 spaceGlobalLines.test.mjs（断言注册表实例按空间分开）。
  // 这里只做冒烟：证明该端点在新解析链下两空间都能正常响应。
  const zhang = await fetch(`${baseUrl}/webgrp/global-lines`, asZhang()).then((r) => r.json());
  const def = await fetch(`${baseUrl}/webgrp/global-lines`).then((r) => r.json());
  expect(Array.isArray(zhang.records)).toBe(true);
  expect(Array.isArray(def.records)).toBe(true);
});

test("data/ 保持扁平：default 空间数据就在数据根下", async () => {
  expect(existsSync(join(dataDir, "schemes"))).toBe(true);
  expect(existsSync(join(dataDir, "workspaces", "default"))).toBe(false);
});
```

- [ ] **Step 2: 跑测试**

Run: `pnpm vitest run server/spaceScope.test.mjs`
Expected: PASS，10 个用例全绿。若失败，按失败断言回查对应 Task 的缺失。

- [ ] **Step 3: 提交**

```bash
git add server/spaceScope.test.mjs
git commit -m "test(server): 端到端空间隔离集成测试（方案/图元库/配色/图片/线路/ZIP）"
```

---

### Task 16: 收尾回归与常量清理

**Files:**
- Modify: `server/server.mjs`（清理已无引用的旧常量）
- Modify: `server/CLAUDE.md`、`docs/` 相关文档（若有）

- [ ] **Step 1: 确认旧常量无残留**

Run:

```bash
node -e "
const fs=require('fs');const s=fs.readFileSync('server/server.mjs','utf8');
for (const n of ['imageDataDir','iconDataDir','manifestPath','imageFoldersPath','schemeDataDir','schemeTrashDir','settingsDataDir','colorConfigPath','measurementConfigPath','deviceLibraryDataDir','deviceLibraryPath']) {
  const c=(s.match(new RegExp('\\\\b'+n+'\\\\b','g'))||[]).length;
  console.log(n, c);
}"
```

Expected: 11 行全为 0。若某常量仍有引用，说明有遗漏的调用点未被接上 `paths` —— **回到对应 Task 修掉，不要保留常量**。

- [ ] **Step 2: 删除已无引用的常量声明**

删掉 `server/server.mjs:29-40` 中计数为 0 的行（保留 `modelTypes`、`max*Bytes`、`accessControlHeaders` 等无关常量）。

- [ ] **Step 3: 全量回归**

Run: `pnpm vitest run`
Expected: PASS。既有 9 个后端测试（27 处 `join(dataDir, …)`）**一字未改**地通过 —— 这是 default 空间映射没破的哨兵。

- [ ] **Step 4: 类型与未定义名检查**

Run: `pnpm tsc --noEmit && pnpm audit:names`
Expected: 均无错误。`audit:names` 尤其重要 —— 本次改动大量涉及 helper 签名变更，`@ts-nocheck` 掩盖下的漏传会在此暴露。

- [ ] **Step 4b: 给两个 wrap 加 fail-open 守卫（T12 评审提出，落点已验证）**

T12 的 `resolveClient(clientId, workspaceId)` 里 `wanted = String(workspaceId ?? "")`：**`spaceId` 缺失时 `wanted === ""`，`if (wanted && …)` 整段短路** —— clientId 路径不校验空间、默认选取退回「任意活跃者」，**既不抛错也不告警**。这是**失败朝开**（fail-open）：将来谁新增一个不带空间解析的入口，隔离会静默失效。

> **理由须按 T14 之后的实际状态陈述（我原先写的依据已被推翻）。** 原文写的是「今日生产无洞（`isSpaceAgnostic` 只含三条**非 v1** 路径，故 v1 路由恒带 spaceId）」—— T14 的复审指出这**不再成立**：`/webgrp/v1/receive` 是 **v1 路径且已进短路名单**（T14 把 receive 加进 `isSpaceAgnostic`）。今日仍无洞，但原因变了：receive **不调** `ctx.fetchFromClient` / `ctx.sendCommandToClient`，故它绕过空间解析也走不到这两个 `wrap`。
>
> 因而这条守卫的**真实依据**是：`apiV1Runtime` / `apiV1Control` 的 `wrap` 只经派发层的 `route.handle({ …, ...spaceCtx })` 到达（全仓仅 `server.mjs:4790`、`:4806` 两处调用且都展开 `spaceCtx`），**故 `wrap` 处 `spaceId` 缺失必然意味着有人绕过了派发层** —— 这正是守卫要抓的接线 bug。不要再引用「v1 路由恒带 spaceId」这个已失效的论据。

**守卫必须放在两个 wrap 上，不要下沉到 registry：**

```js
// apiV1Runtime.mjs:~243 与 apiV1Control.mjs:~331 的 wrap 内
if (!spaceId) {
  // 接线 bug：派发层对 v1 路由恒注入 spaceId，缺失即说明有人绕过了它。
  throw new Error("缺少 spaceId：v1 会话类 handler 必须由派发层注入空间。");
}
```

**为何不放 registry**（评审已验证）：既有哨兵 `server/runtimeWs.test.mjs:138` 就是 `runtime.fetchFromClient(undefined, "runtime.snapshot")` 这样不带空间调的 —— 在 registry 里改严会直接打破哨兵，与「既有测试只读」的约束冲突。

**为何放 wrap 安全**（评审已验证）：`route.handle(...)` 全仓仅在 `server.mjs:4790`、`:4806` 两处被调用，且都展开 `...spaceCtx`；**没有任何测试直接调 `route.handle` 或 handler** —— 故这条守卫不会红掉任何既有测试。

- [ ] **Step 5: 更新 `server/CLAUDE.md`**
在 `server/CLAUDE.md` 的 Key Files 表补两行：

```markdown
| `spaceId.mjs` | 空间 id 生成与校验（允许中文，排除 Windows 保留名与路径分隔符） |
| `spaceStore.mjs` | 空间注册表 + `SpacePaths` 工厂 + 请求空间解析链；default 空间直接复用数据根 |
| `cors.mjs` | 跨源头**唯一一份**（`access-control-*`）；`server.mjs` 与 `v1Response.mjs` 均从此导入 —— **勿在别处再定义一份**（T13 单源化） |
```

**同一文件里还有两处陈旧数字（T14 评审顺手核到，非本次引入，一并改）：**

- `server/CLAUDE.md:52` 的「9 端点」→ 实际 **11 条** control 端点；
- 同文件的「54 示例」→ 现 **94 示例 / 69 端点**（T14 后）。

另补一句到 Common Patterns：「`/swigger` 的端点元数据集中在 `swaggerPage.mjs` 的 `SWIGGER_ENDPOINTS`；`swigger.examples.test.mjs` 会**逐个真实调用**每条示例，故新增示例必须自带稳定期望、且**不得**收录会触发本机副作用的端点（`/webgrp/exports/native/*` 因会弹 Windows 另存为对话框而刻意排除）。」

在「Common Patterns」补：

```markdown
- 空间隔离：`GRAPH_MODEL_DATA_DIR` 下 `data/` 是 default 空间的根，其余空间在 `data/workspaces/<id>/`。路径经 `options.paths ?? defaultPaths` 显式透传，不用 AsyncLocalStorage。空间标识解析：`X-Space` 头 > `?space=` > `Cookie: gmp_space` > 回退 `spaces[0]`。
- 端到端隔离测试见 `spaceScope.test.mjs`；派发注入见 `spaceDispatch.test.mjs`。
```

- [ ] **Step 6: 提交**

```bash
git add server/server.mjs server/CLAUDE.md
git commit -m "refactor(server): 清理已迁移的路径常量，同步 CLAUDE.md

11 个模块级路径常量全部改由 options.paths 提供。既有 9 个后端测试
（27 处 join(dataDir, …)）一字未改地通过，验证 default 空间映射无损。"
```

---

## 附：本阶段不做的（属第二阶段）

| 项 | 归属 |
|----|------|
| `src/spaceClient.ts`、顶栏空间选择器 | 第二阶段 |
| 切换时序、复用未保存对话框（`kind: "switch-space"`） | 第二阶段 |
| §6 浏览器侧持久化清理（localStorage / IndexedDB / sessionStorage） | 第二阶段 |
| 切换前跳过 `beforeunload`（`skipBeforeUnloadRef`） | 第二阶段 |
| 前端 e2e 验收 | 第二阶段 |

本阶段交付后，多空间已经**可经 API 使用**（curl / swigger Try-it 带 `?space=` 或 `X-Space`），default 空间行为一字不变。
