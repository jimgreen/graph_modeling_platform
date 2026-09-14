# 工作空间导入 / 导出（压缩包）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 顶栏空间选择下拉框右侧加「导出 / 导入」两个按钮，把**当前工作空间**整体导出成 ZIP、并把这样一个 ZIP 导入成**一个新空间**。

**Architecture:** 照方案域的 ZIP 链路长：新模块 `server/spaceArchive.mjs` 只做「空间 → ZIP 字节」；`server.mjs` 加两个端点（导出走正常空间解析链，导入恒新建空间）；空间版解包器复用既有的 `zipEntryParts` / `isPathInside` / `mkdirInSpace` 三道守卫，但**去掉**方案域「只落 `.json`」的后缀过滤。前端只在顶栏加两个按钮，导出复用 `saveLazyBlobFile`、导入成功后复用既有的 `requestSwitchSpace` 切过去。

**Tech Stack:** Node 24 ESM（`.mjs`）、`adm-zip`（已在依赖里）、React 19 + antd 6、Vitest 3。

**Spec:** `docs/superpowers/specs/2026-09-14-space-import-export-design.md`（本计划由它派生；执行前先读它，尤其 §2 的「不能整段复用解包器」与 §4.1 的 default 空间越界警告）

## Global Constraints

- **一切建目录调用必须经退役守护**：`mkdirInSpace`（`server/server.mjs:74`）或 `writeTextIfChanged`。**不得出现裸 `mkdir`** —— 别名比 grep 更强：模块内只 import 了别名，新写裸 `mkdir` 会直接 `ReferenceError`。
- **不得新增模块级路径常量**：一切路径经 `spaceStore.resolvePaths(id)` 或 `options.paths` 显式透传。
- **打包范围只能遍历 `spacePathsFor` 枚举的子目录**（`schemes` / `settings` / `device-library` / `images` / `icons`），**绝不能按 `paths.root` 递归** —— default 空间的 root 就是数据根（`server/spaceStore.mjs:16-28` 的 `assertInSpace` 特判），按根递归会把 `spaces.json` 与其它所有空间一起打进包。
- **ZIP 只做原样字节**，本功能**不生成** `.e` / `.svg` 派生格式（与方案 ZIP 的关键差别）。
- 后端测试用 `GRAPH_MODEL_DATA_DIR` 指向 tmpdir（`server/spaceApi.test.mjs:16-28` 是现成 harness）。
- 测试与源文件同目录：`*.test.ts` / `*.test.mjs`。
- 每个任务结束都要：单文件测试绿 → `pnpm vitest run` 全量绿 → `pnpm tsc --noEmit` 无错 → 提交。

---

## File Structure

| 文件 | 职责 | 动作 |
|------|------|------|
| `server/spaceArchive.mjs` | 空间 → ZIP 字节；从 ZIP 读元信息。纯目录/ZIP 操作，不 import 渲染适配层 | 新建 |
| `server/spaceArchive.test.mjs` | 上述单元测试（含 default 空间越界这条最重的） | 新建 |
| `server/server.mjs` | 两个路由 + `handleExportSpaceArchive` / `handleImportSpaceArchive` + `extractSpaceZipToDirectory` / `zipRootNameFor` | 修改 |
| `server/spaceApi.test.mjs` | 端到端（真实 HTTP + tmpdir）：导出内容、导入落地、同名后缀、zip-slip、失败回滚 | 修改（追加） |
| `server/swaggerPage.mjs` | 两个新端点的文档条目 + 示例 | 修改（追加） |
| `server/swigger.examples.test.mjs` | 两个新端点的示例期望 | 修改（追加） |
| `src/spaceClient.ts` | `exportSpaceArchive()` / `importSpaceArchive(file)` 两个 API 封装 | 修改 |
| `src/spaceClient.test.ts` | 上述测试 | 修改（追加） |
| `src/appExtracted/appTopbar.tsx` | 两个按钮 + 隐藏 file input + 两个可测的导出函数 | 修改 |
| `src/appView.test.tsx` | 两个导出函数的直测（含「导入后确实切了空间」） | 修改（追加） |
| `CLAUDE.md`（根） | 功能清单加两条口径 | 修改 |

**关于 `appView.tsx` 的 topbar `inputs` 数组**：本任务**不需要**改它 —— 两个按钮只读 `scope.spaces` / `scope.currentSpaceId`（已在数组里，`appView.tsx:2506-2507`）与稳定引用，不引入新的每帧变化值。但若实现过程中确实加了新状态，**必须**同步加进 `appView.tsx:2484` 的 `inputs`，否则 `MemoizedViewSection` 会跳过 topbar 重渲染、按钮静默失效。

---

### Task 1: `server/spaceArchive.mjs` —— 空间打包与元信息读取

**Files:**
- Create: `server/spaceArchive.mjs`
- Test: `server/spaceArchive.test.mjs`

**Interfaces:**
- Consumes: `spacePathsFor()` 的产物（`server/spaceStore.mjs:31-54`，字段 `root` / `schemes` / `settings` / `deviceLibraryDir` / `images` / `icons`）；`adm-zip`
- Produces:
  - `export const SPACE_ARCHIVE_FORMAT_VERSION = 1`
  - `export const SPACE_ARCHIVE_META_FILENAME = "space.json"`
  - `export async function listSpaceFiles(paths): Promise<{ filePath: string; relativePath: string }[]>`
  - `export async function buildSpaceArchiveBuffer({ paths, spaceName, exportedAt }): Promise<{ buffer: Buffer; filename: string; spaceName: string }>`
  - `export function readSpaceArchiveName(zip, fallbackName: string): string`

- [ ] **Step 1: 写失败测试**

创建 `server/spaceArchive.test.mjs`：

```js
// 空间 ZIP 打包：范围、元信息、以及最危险的一条 —— default 空间不得越界。
import { expect, test, beforeEach, afterEach } from "vitest";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import AdmZip from "adm-zip";
import { spacePathsFor } from "./spaceStore.mjs";
import {
  buildSpaceArchiveBuffer,
  listSpaceFiles,
  readSpaceArchiveName,
  SPACE_ARCHIVE_META_FILENAME
} from "./spaceArchive.mjs";

let dataDir;
beforeEach(() => {
  dataDir = mkdtempSync(join(tmpdir(), "space-archive-"));
});
afterEach(() => {
  rmSync(dataDir, { recursive: true, force: true });
});

function writeFileAt(root, relativePath, content) {
  const full = join(root, relativePath);
  mkdirSync(join(full, ".."), { recursive: true });
  writeFileSync(full, content);
}

function entryNames(buffer) {
  return new AdmZip(buffer).getEntries().map((entry) => entry.entryName).sort();
}

test("打包该空间的子目录，包内路径以空间名打头且字节一致", async () => {
  const paths = spacePathsFor(dataDir, "甲空间");
  writeFileAt(paths.root, "schemes/files/a.json", '{"a":1}');
  writeFileAt(paths.root, "images/x.png", "PNGDATA");
  writeFileAt(paths.root, "icons/i.svg", "<svg/>");

  const { buffer, filename } = await buildSpaceArchiveBuffer({ paths, spaceName: "甲空间" });

  expect(filename).toBe("甲空间.zip");
  const zip = new AdmZip(buffer);
  expect(zip.getEntry("甲空间/schemes/files/a.json").getData().toString("utf8")).toBe('{"a":1}');
  expect(zip.getEntry("甲空间/images/x.png").getData().toString("utf8")).toBe("PNGDATA");
  expect(zip.getEntry("甲空间/icons/i.svg").getData().toString("utf8")).toBe("<svg/>");
});

test("打包不含 schemes/trash 下的内容", async () => {
  const paths = spacePathsFor(dataDir, "甲空间");
  writeFileAt(paths.root, "schemes/files/keep.json", "{}");
  writeFileAt(paths.root, "schemes/trash/2026-01-01/old.json", "{}");

  const { buffer } = await buildSpaceArchiveBuffer({ paths, spaceName: "甲空间" });

  expect(entryNames(buffer)).toContain("甲空间/schemes/files/keep.json");
  expect(entryNames(buffer).some((name) => name.includes("/trash/"))).toBe(false);
});

// 这条是本设计里最容易写错、后果最重的一处：default 空间的 root **就是数据根**，
// 同目录下还有 spaces.json 与其它空间（workspaces/<其它 id>/）。
// 一旦改成按 paths.root 递归，导出 default 就等于打包整台机器的全部空间。
test("default 空间只打包自己的子目录，不越界到 spaces.json 或别的空间", async () => {
  const paths = spacePathsFor(dataDir, "default");
  expect(paths.root).toBe(dataDir);           // 前提：default 的根就是数据根
  writeFileAt(paths.root, "schemes/files/a.json", "{}");
  writeFileAt(dataDir, "spaces.json", '{"spaces":[]}');
  writeFileAt(dataDir, "workspaces/乙空间/schemes/files/b.json", "{}");

  const { buffer } = await buildSpaceArchiveBuffer({ paths, spaceName: "default" });

  const names = entryNames(buffer);
  expect(names).toContain("default/schemes/files/a.json");
  expect(names).not.toContain("default/spaces.json");
  expect(names.some((name) => name.includes("workspaces/"))).toBe(false);
  // 也不含数据根下的其它散落目录
  expect(names.every((name) => name.startsWith("default/"))).toBe(true);
});

test("子目录不存在时正常出包（新空间可能还没有 icons/）", async () => {
  const paths = spacePathsFor(dataDir, "甲空间");
  mkdirSync(paths.root, { recursive: true });

  const { buffer } = await buildSpaceArchiveBuffer({ paths, spaceName: "甲空间" });

  expect(entryNames(buffer)).toEqual([`甲空间/${SPACE_ARCHIVE_META_FILENAME}`]);
});

test("包内元信息可被读回；缺元信息时回退到给定名", async () => {
  const paths = spacePathsFor(dataDir, "甲空间");
  mkdirSync(paths.root, { recursive: true });
  const { buffer } = await buildSpaceArchiveBuffer({ paths, spaceName: "甲空间" });

  expect(readSpaceArchiveName(new AdmZip(buffer), "兜底名")).toBe("甲空间");
  expect(readSpaceArchiveName(new AdmZip(), "兜底名")).toBe("兜底名");

  const broken = new AdmZip();
  broken.addFile(`甲空间/${SPACE_ARCHIVE_META_FILENAME}`, Buffer.from("{ 不是 json"));
  expect(readSpaceArchiveName(broken, "兜底名")).toBe("兜底名");
});

test("listSpaceFiles 返回的是相对路径（不含空间名前缀，且一律用 / 分隔）", async () => {
  const paths = spacePathsFor(dataDir, "甲空间");
  writeFileAt(paths.root, "settings/color-config.json", "{}");

  const files = await listSpaceFiles(paths);

  expect(files).toHaveLength(1);
  expect(files[0].relativePath).toBe("settings/color-config.json");
});
```

> 包内路径一律用 `/` 拼（ZIP 规范如此）。若你的实现返回了 `\`，**改实现而不是改测试**。

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm vitest run server/spaceArchive.test.mjs`
Expected: FAIL —— `Failed to resolve import "./spaceArchive.mjs"`

- [ ] **Step 3: 实现**

创建 `server/spaceArchive.mjs`：

```js
// 空间 ZIP 构建：把某一空间的文件**原样**打包（备份 / 搬迁语义）。
// 与方案 ZIP 的关键差别：这里**不生成** .e/.svg 派生格式 —— 要的是往返一致，不是交付件。
// 本模块只做「空间目录 → ZIP 字节」，不 import 渲染适配层，保持可单测。
import { readFile, readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import AdmZip from "adm-zip";

export const SPACE_ARCHIVE_FORMAT_VERSION = 1;
export const SPACE_ARCHIVE_META_FILENAME = "space.json";

// 打包范围**只认这几个子目录名**，绝不按空间根递归：
// default 空间的根就是数据根（spaceStore.mjs 的 assertInSpace 特判），
// 按根递归会把 spaces.json 与其它所有空间（workspaces/**）一起打进包。
const ARCHIVED_SUBDIR_NAMES = ["schemes", "settings", "device-library", "images", "icons"];
// 回收站里是用户已删的东西，不进备份
const TRASH_RELATIVE_PATH = "schemes/trash";

/**
 * 列出该空间要打包的文件。
 * 目录读失败**即上抛**（照 listModelJsonFiles 的既定口径）：静默跳过会让该子树凭空消失，
 * 而 ZIP 仍成功返回，产出残缺包。子目录**不存在**则跳过（新空间可能没有 icons/）。
 */
export async function listSpaceFiles(paths) {
  const found = [];
  const visit = async (dir, dirParts) => {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const relativeParts = [...dirParts, entry.name];
      if (relativeParts.join("/") === TRASH_RELATIVE_PATH) {
        continue;
      }
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        await visit(full, relativeParts);
        continue;
      }
      if (entry.isFile()) {
        found.push({ filePath: full, relativePath: relativeParts.join("/") });
      }
    }
  };
  for (const name of ARCHIVED_SUBDIR_NAMES) {
    const dir = join(paths.root, name);
    const info = await stat(dir).catch(() => null);
    if (info?.isDirectory()) {
      await visit(dir, [name]);
    }
  }
  return found;
}

/** 构建空间 ZIP：包内顶层目录名 = 空间名，元信息写在顶层目录内的 space.json。 */
export async function buildSpaceArchiveBuffer({ paths, spaceName, exportedAt = new Date().toISOString() }) {
  const files = await listSpaceFiles(paths);
  const zip = new AdmZip();
  const meta = {
    formatVersion: SPACE_ARCHIVE_FORMAT_VERSION,
    name: spaceName,
    exportedAt
  };
  zip.addFile(
    `${spaceName}/${SPACE_ARCHIVE_META_FILENAME}`,
    Buffer.from(JSON.stringify(meta, null, 2), "utf-8")
  );
  for (const file of files) {
    zip.addFile(`${spaceName}/${file.relativePath}`, await readFile(file.filePath));
  }
  return { buffer: zip.toBuffer(), filename: `${spaceName}.zip`, spaceName };
}

/**
 * 从包里读空间名。只认「顶层目录下的 space.json」（恰好两段），
 * 免得把某个嵌套子目录里同名的文件误当元信息。读不出 / 解析失败 → 回退 fallbackName。
 */
export function readSpaceArchiveName(zip, fallbackName) {
  const entry = zip.getEntries().find((item) => {
    if (item.isDirectory) {
      return false;
    }
    const parts = String(item.entryName ?? "").replace(/\\/gu, "/").split("/").filter(Boolean);
    return parts.length === 2 && parts[1] === SPACE_ARCHIVE_META_FILENAME;
  });
  if (!entry) {
    return fallbackName;
  }
  try {
    const parsed = JSON.parse(entry.getData().toString("utf-8"));
    const name = typeof parsed?.name === "string" ? parsed.name.trim() : "";
    return name || fallbackName;
  } catch {
    return fallbackName;
  }
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm vitest run server/spaceArchive.test.mjs`
Expected: PASS（6 条）

- [ ] **Step 5: 变异验证「default 不越界」这条真能红**

把 `listSpaceFiles` 的循环体临时改成从 `paths.root` 递归（即把 `ARCHIVED_SUBDIR_NAMES` 循环换成 `await visit(paths.root, [])`），重跑：
Run: `pnpm vitest run server/spaceArchive.test.mjs`
Expected: **FAIL** —— 断言 `expect(names).not.toContain("default/spaces.json")` 或 `includes("workspaces/")` 变红。**把该输出贴进报告**，然后**还原实现**并用 `git hash-object server/spaceArchive.mjs` 与 `git rev-parse HEAD:server/spaceArchive.mjs` 比对确认还原（不要用 `cmp`，本仓的 rtk 钩子会污染 stdout）。

- [ ] **Step 6: 提交**

```bash
git add server/spaceArchive.mjs server/spaceArchive.test.mjs
git commit -m "feat(space): 空间 ZIP 打包器——只遍历子目录，default 不越界到数据根"
```

---

### Task 2: 两个端点 + 空间版解包器

**Files:**
- Modify: `server/server.mjs`（路由表在 `:4633` 的 `/schemes/export` 附近；handler 放 `handleExportSchemeArchive`（`:4322`）旁；解包器放 `extractSchemeZipToDirectory`（`:3161`）旁）
- Modify: `server/spaceApi.test.mjs`（追加）
- Modify: `server/swaggerPage.mjs`（追加两条端点）
- Modify: `server/swigger.examples.test.mjs`（追加两条期望）

**Interfaces:**
- Consumes: Task 1 的 `buildSpaceArchiveBuffer` / `readSpaceArchiveName` / `SPACE_ARCHIVE_META_FILENAME`
- Consumes（既有，同文件）：`readRawBody`、`assertZipUncompressedSizeWithinLimit`（`:3113`）、`zipEntryParts`（`:3136`）、`isPathInside`、`mkdirInSpace`（`:74`）、`safeFilePart`、`spaceStore.create` / `resolvePaths` / `remove` / `list`、`retiredSpaceRoots`（`:46`）
- Produces:
  - `GET /webgrp/spaces/export` → 200 `application/zip`
  - `POST /webgrp/spaces/import` → 200 `{ ok, space: { id, name }, spaces, savedAt }`；失败 400

- [ ] **Step 1: 写失败测试**

在 `server/spaceApi.test.mjs` 末尾追加（该文件已有 `dataDir` / `baseUrl` / `store` / `json()` / `spaceIds()`）：

```js
// 空间 ZIP 导入导出。种子直接写盘的写法见本文件既有用例（空间根 = workspaces/<id>）。
const spaceRootOf = (id) => (id === "default" ? dataDir : join(dataDir, "workspaces", id));
function seedSpaceFile(id, relativePath, content) {
  const full = join(spaceRootOf(id), relativePath);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, content);
}
function zipEntryNames(buffer) {
  return new AdmZip(buffer).getEntries().map((entry) => entry.entryName).sort();
}

test("导出：返回 zip，含该空间的方案与图片，且不含 trash", async () => {
  const created = await (await fetch(`${baseUrl}/webgrp/spaces`, json({ name: "导出源" }, { method: "POST" }))).json();
  seedSpaceFile(created.id, "schemes/files/a.json", '{"a":1}');
  seedSpaceFile(created.id, "images/x.png", "PNGDATA");
  seedSpaceFile(created.id, "schemes/trash/t/old.json", "{}");

  const response = await fetch(`${baseUrl}/webgrp/spaces/export?space=${encodeURIComponent(created.id)}`);
  expect(response.status).toBe(200);
  expect(response.headers.get("content-type")).toContain("application/zip");

  const names = zipEntryNames(Buffer.from(await response.arrayBuffer()));
  expect(names).toContain("导出源/schemes/files/a.json");
  expect(names).toContain("导出源/images/x.png");
  expect(names.some((name) => name.includes("/trash/"))).toBe(false);
});

test("导出 default 空间不含 spaces.json 与其它空间", async () => {
  await fetch(`${baseUrl}/webgrp/spaces`, json({ name: "别的空间" }, { method: "POST" }));
  seedSpaceFile("default", "schemes/files/a.json", "{}");

  const response = await fetch(`${baseUrl}/webgrp/spaces/export`);
  const names = zipEntryNames(Buffer.from(await response.arrayBuffer()));

  expect(names).toContain("default/schemes/files/a.json");
  expect(names.some((name) => name.includes("spaces.json"))).toBe(false);
  expect(names.some((name) => name.includes("workspaces/"))).toBe(false);
});

test("导入：新建空间、落盘树与包内一致（含非 .json 条目）", async () => {
  const zip = new AdmZip();
  zip.addFile("我的空间/space.json", Buffer.from(JSON.stringify({ formatVersion: 1, name: "我的空间" })));
  zip.addFile("我的空间/schemes/files/a.json", Buffer.from('{"a":1}'));
  zip.addFile("我的空间/images/x.png", Buffer.from("PNGDATA"));

  const response = await fetch(`${baseUrl}/webgrp/spaces/import`, {
    method: "POST",
    headers: { "content-type": "application/zip" },
    body: zip.toBuffer()
  });
  const payload = await response.json();

  expect(response.status).toBe(200);
  expect(payload.ok).toBe(true);
  expect(payload.space.name).toBe("我的空间");
  // 图片这类非 .json 条目必须落盘 —— 这条专门钉住「没有整段复用方案解包器」
  expect(readFileSync(join(spaceRootOf(payload.space.id), "images", "x.png"), "utf8")).toBe("PNGDATA");
  expect(readFileSync(join(spaceRootOf(payload.space.id), "schemes", "files", "a.json"), "utf8")).toBe('{"a":1}');
  // 元信息不落盘
  expect(existsSync(join(spaceRootOf(payload.space.id), "space.json"))).toBe(false);
  // space.json 里的名字被采用
  expect((await spaceIds())).toContain(payload.space.id);
});

test("同名包导入两次得到两个空间（第二次 id 带后缀）", async () => {
  const makeZip = () => {
    const zip = new AdmZip();
    zip.addFile("同名空间/space.json", Buffer.from(JSON.stringify({ formatVersion: 1, name: "同名空间" })));
    zip.addFile("同名空间/schemes/files/a.json", Buffer.from("{}"));
    return zip.toBuffer();
  };
  const post = () => fetch(`${baseUrl}/webgrp/spaces/import`, {
    method: "POST",
    headers: { "content-type": "application/zip" },
    body: makeZip()
  }).then((r) => r.json());

  const first = await post();
  const second = await post();

  expect(second.space.id).not.toBe(first.space.id);
  expect(second.space.name).toBe("同名空间");
  expect((await spaceIds())).toEqual(expect.arrayContaining([first.space.id, second.space.id]));
});

test("zip-slip：含 ../ 的包被拒且不落盘", async () => {
  const zip = new AdmZip();
  zip.addFile("坏包/schemes/files/a.json", Buffer.from("{}"));
  zip.addFile("坏包/../evil.txt", Buffer.from("evil"));

  const response = await fetch(`${baseUrl}/webgrp/spaces/import`, {
    method: "POST",
    headers: { "content-type": "application/zip" },
    body: zip.toBuffer()
  });

  expect(response.status).toBe(400);
  expect(existsSync(join(dataDir, "..", "evil.txt"))).toBe(false);
  expect(existsSync(join(dataDir, "evil.txt"))).toBe(false);
});

test("非 zip 体 → 400，且不新建空间", async () => {
  const before = await spaceIds();

  const response = await fetch(`${baseUrl}/webgrp/spaces/import`, {
    method: "POST",
    headers: { "content-type": "application/zip" },
    body: Buffer.from("not a zip at all")
  });

  expect(response.status).toBe(400);
  expect(await spaceIds()).toEqual(before);
});
```

同时在文件顶部补 import：

```js
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import AdmZip from "adm-zip";
```

（该文件已有 `join` / `existsSync` / `mkdirSync`？以实际为准，**合并而不是重复 import** —— 重复 import 会让 `tsc` 报 TS2300。）

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm vitest run server/spaceApi.test.mjs`
Expected: FAIL —— 导出/导入端点 404 或 `AdmZip` 未解析

- [ ] **Step 3: 实现**

**3a.** `server/server.mjs` 顶部 import 区加：

```js
import { buildSpaceArchiveBuffer, readSpaceArchiveName, SPACE_ARCHIVE_META_FILENAME } from "./spaceArchive.mjs";
```

**3b.** 在 `const maxSchemeZipBodyBytes = ...`（`:106`）旁加常量：

```js
const maxSpaceZipBodyBytes = 256 * 1024 * 1024;
```

**3c.** 在 `extractSchemeZipToDirectory`（`:3161`）旁加两个函数：

```js
// 空间 ZIP 的顶层目录名：与方案同款「单一顶层目录」判定，判不出来就回退给定名。
function zipRootNameFor(entries, fallbackName, label = "空间") {
  const fileParts = entries
    .filter((entry) => !entry.isDirectory)
    .map((entry) => zipEntryParts(entry.entryName))
    .filter((parts) => parts.length > 0);
  if (fileParts.length === 0) {
    throw new Error(`zip 文件中没有可导入的${label}文件。`);
  }
  const firstRoot = fileParts[0][0];
  const hasSingleRoot = firstRoot && fileParts.every((parts) => parts.length > 1 && parts[0] === firstRoot);
  return safeFilePart(hasSingleRoot ? firstRoot : fallbackName, `导入${label}`);
}

/**
 * 把空间 ZIP 解到目标根。
 * **不要**复用 extractSchemeZipToDirectory：那条路带方案域「files 只落 .json」的不变量，
 * 会跳过 .e/.svg；空间里有图片与空间级图标，跳过就是丢数据。
 * 路径守卫与它同源（zipEntryParts + isPathInside + mkdirInSpace）。
 */
async function extractSpaceZipToDirectory(zip, targetDir, rootName) {
  await mkdirInSpace(targetDir);
  for (const entry of zip.getEntries()) {
    const parts = zipEntryParts(entry.entryName);
    const relativeParts = safeFilePart(parts[0], parts[0]) === rootName ? parts.slice(1) : parts;
    if (relativeParts.length === 0) {
      continue;
    }
    // 元信息是给导入端读的，不落进空间根（否则往返就不再逐字节一致）
    if (relativeParts.length === 1 && relativeParts[0] === SPACE_ARCHIVE_META_FILENAME) {
      continue;
    }
    const targetPath = relativeParts.reduce((current, part) => join(current, safeFilePart(part, part)), targetDir);
    if (!isPathInside(targetDir, targetPath)) {
      throw new Error("zip 文件包含越界路径。");
    }
    if (entry.isDirectory) {
      await mkdirInSpace(targetPath);
      continue;
    }
    await mkdirInSpace(dirname(targetPath));
    await writeFile(targetPath, entry.getData());
  }
}
```

> **实现后已改**（Task 2 修复轮 1；见 `.superpowers/sdd/2026-09-14-space-import-export/task-2-report.md` 的 F2）：
> 上面这两段与方案侧的 `extractSchemeZipToDirectory` / 顶层名判定**逐字重复**，而重复的正是
> `zipEntryParts` + `isPathInside` 那道安全边界 —— 故合并成单一骨架：
> `zipRootNameFor(entries, fallbackName, label)`（`label` 只决定文案与兜底名）与
> `extractZipEntries(zip, targetDir, rootName, skipEntry)`（跳过规则由调用方注入）。
> 本计划正文按**当时写法**保留，实际函数名以 `server.mjs` 为准。

**3d.** 在 `handleExportSchemeArchive`（`:4322`）旁加两个 handler：

```js
async function handleExportSpaceArchive(response, paths, spaceName) {
  try {
    const { buffer, filename } = await buildSpaceArchiveBuffer({ paths, spaceName });
    response.writeHead(200, {
      "content-type": "application/zip",
      "content-length": String(buffer.length),
      "content-disposition": `attachment; filename="${encodeURIComponent(filename)}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "cache-control": "no-store",
      ...accessControlHeaders
    });
    response.end(buffer);
  } catch (error) {
    sendError(response, 500, error instanceof Error ? error.message : "导出空间压缩包失败。");
  }
}

// 导入一律**新建空间**（用户裁定），故没有冲突分支、不需要 mode 参数：
// 重名由 spaceStore.create → spaceIdFromName(name, existingIds) 自动加后缀解决。
async function handleImportSpaceArchive(request, response) {
  const buffer = await readRawBody(request, maxSpaceZipBodyBytes, "空间压缩包过大，最大支持 256MB。");
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    sendError(response, 400, "缺少空间压缩包。");
    return;
  }
  let zip;
  try {
    zip = new AdmZip(buffer);
  } catch {
    sendError(response, 400, "zip 文件格式不正确。");
    return;
  }
  let space = null;
  try {
    assertZipUncompressedSizeWithinLimit(zip, "空间压缩包");
    const entries = zip.getEntries();
    const zipRootName = zipRootNameFor(entries, "导入空间", "空间");
    const name = safeFilePart(readSpaceArchiveName(zip, zipRootName), "导入空间");
    space = await spaceStore.create(name);
    // 同名空间会复用刚被删掉的 id（即同一个根）：撤下退休登记，否则它一建出来就被拒写
    retiredSpaceRoots.delete(spaceStore.resolvePaths(space.id).root);
    await extractSpaceZipToDirectory(zip, spaceStore.resolvePaths(space.id).root, zipRootName);
  } catch (error) {
    // 失败不留半成品空间：撤掉刚建的那个（目录会进 trash-spaces/，可手工清）
    if (space) {
      await spaceStore.remove(space.id).catch(() => {});
    }
    sendError(response, 400, error instanceof Error ? error.message : "导入空间压缩包失败。");
    return;
  }
  const spaces = await spaceStore.list();
  sendJson(response, 200, { ok: true, space, spaces, savedAt: new Date().toISOString() });
}
```

**3e.** 路由表加两条（紧邻 `routeKey("DELETE", "/spaces")`）：

```js
    [routeKey("GET", "/spaces/export"), async ({ response, paths, spaceId }) => {
      // 端点名要的是**空间名**，而 spaceCtx 只注入了 paths 与 spaceId —— 名字要查注册表，
      // 不要用 paths.root 反推（default 的 root 是数据根，反推会得到数据目录名）
      const space = (await spaceStore.list()).find((item) => item.id === spaceId);
      await handleExportSpaceArchive(response, paths, space?.name ?? spaceId);
    }],
    [routeKey("POST", "/spaces/import"), async ({ request, response }) => {
      await handleImportSpaceArchive(request, response);
    }],
```

> 这两条**不加**进 `isSpaceAgnostic`（`server.mjs:4754-4757` 的精确匹配白名单）：导出必须知道当前空间；导入虽然只建空间，照常解析一次无害，而动白名单会改既有语义（有测试守着）。

**3f.** swagger 登记：在 `server/swaggerPage.mjs` 的 `SWIGGER_ENDPOINTS` 里、`/webgrp/spaces` 那组旁边加两条，并在 `server/swigger.examples.test.mjs` 加对应期望：

```js
  { scope: "space", group: "空间管理", method: "GET", path: "/webgrp/spaces/export", desc: "导出当前空间为 ZIP（原样打包，不含 schemes/trash）", response: "<application/zip 二进制>", examples: [
    { label: "导出当前空间", check: (r) => expect(r.headers.get("content-type")).toContain("application/zip") }
  ] },
```

`/webgrp/spaces/import` 的示例需要上传 zip（`__body__: "<binary zip>"`），照 `/webgrp/schemes/import` 的既有写法给一条；若 `swigger.examples.test.mjs` 的自动化对「真实调用会新建空间」有副作用顾虑，**就把它排除在示例自动验证之外并在报告里写明理由**（既有先例：`/webgrp/exports/native/*` 因会弹 Windows 另存为对话框而刻意排除）。

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm vitest run server/spaceApi.test.mjs server/swigger.examples.test.mjs`
Expected: PASS

- [ ] **Step 5: 变异验证两条**

1. 把 `extractSpaceZipToDirectory` 换成调用 `extractSchemeZipToDirectory`（即整段复用方案解包器），重跑 `server/spaceApi.test.mjs` → 「导入：落盘树与包内一致」应**红**（`images/x.png` 未落盘）。贴输出后还原。
2. 把 `handleImportSpaceArchive` 里的 `spaceStore.remove(space.id)` 回滚删掉，并在解包里手工抛一次错（例如临时对 `relativeParts[0] === "boom"` 抛错），构造一个含 `boom/` 的包 → 断言「空间列表里多了个空空间」应**红**。贴输出后还原。
3. 两条都还原后用 `git hash-object server/server.mjs` 与 `git rev-parse HEAD:server/server.mjs` 比对。

- [ ] **Step 6: 提交**

```bash
git add server/server.mjs server/spaceApi.test.mjs server/swaggerPage.mjs server/swigger.examples.test.mjs
git commit -m "feat(space): /webgrp/spaces/{export,import} 端点——导入恒新建空间，失败回滚"
```

---

### Task 3: 前端 API 封装

**Files:**
- Modify: `src/spaceClient.ts`
- Modify: `src/spaceClient.test.ts`

**Interfaces:**
- Consumes: `apiPath`（`src/config.ts`）、`fetchBackendJson` / `backendErrorMessage`（`src/appExtracted/appCoreCanvasUtilities.tsx:3706` / `:3696`）
- Produces:
  - `export async function exportSpaceArchive(): Promise<Blob>` —— 成功返回 zip blob；非 2xx 抛后端消息
  - `export async function importSpaceArchive(file: File): Promise<{ space: Space; spaces: Space[] }>`

- [ ] **Step 1: 写失败测试**

在 `src/spaceClient.test.ts` 追加（该文件已有 `mockFetchJson` 之类的 helper，按实际复用）：

```ts
describe("exportSpaceArchive / importSpaceArchive", () => {
  test("导出：GET /webgrp/spaces/export，返回 blob；非 2xx 抛后端消息", async () => {
    const blob = new Blob(["zipbytes"], { type: "application/zip" });
    (globalThis as any).fetch = vi.fn(async () => ({ ok: true, blob: async () => blob }));

    await expect(exportSpaceArchive()).resolves.toBe(blob);
    expect((globalThis as any).fetch.mock.calls[0][0]).toBe("/webgrp/spaces/export");

    (globalThis as any).fetch = vi.fn(async () => ({
      ok: false,
      json: async () => ({ error: "导出空间压缩包失败。" })
    }));
    await expect(exportSpaceArchive()).rejects.toThrow("导出空间压缩包失败。");
  });

  test("导入：POST 二进制 body，回执读 payload.space（**非** v1 信封）", async () => {
    // 后端 handleImportSpaceArchive 用的是 sendJson（裸回执，不是 v1 的 {ok,data} 信封），
    // 故这里读 payload.space；两侧形状必须一致，改后端回执就要同步改这里
    const payload = { ok: true, space: { id: "新空间", name: "新空间", createdAt: "2026-01-01T00:00:00.000Z" }, spaces: [] };
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => payload }));
    (globalThis as any).fetch = fetchMock;
    const file = new File([new Uint8Array([1, 2, 3])], "甲.zip", { type: "application/zip" });

    const result = await importSpaceArchive(file);

    expect(result.space.id).toBe("新空间");
    const [, init] = fetchMock.mock.calls[0];
    expect(init.method).toBe("POST");
    expect(init.body).toBe(file);
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm vitest run src/spaceClient.test.ts`
Expected: FAIL —— `exportSpaceArchive is not a function`

- [ ] **Step 3: 实现**

在 `src/spaceClient.ts` 末尾追加：

```ts
// 导出当前空间为 ZIP。**不**走 fetchBackendJson —— 那个封装会 response.json()，二进制要用 blob()。
export async function exportSpaceArchive(): Promise<Blob> {
  const response = await fetch(apiPath("/spaces/export"));
  if (!response.ok) {
    throw new Error(await backendErrorMessage(response, "导出空间压缩包失败。"));
  }
  return response.blob();
}

// 导入空间 ZIP：后端恒新建空间（重名自动加后缀），回执里带回新空间
export async function importSpaceArchive(file: File): Promise<{ space: Space; spaces: Space[] }> {
  const response = await fetch(apiPath("/spaces/import"), {
    method: "POST",
    headers: { "content-type": file.type || "application/zip" },
    body: file
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof payload?.error === "string" ? payload.error : "导入空间压缩包失败。";
    throw new Error(message);
  }
  return { space: payload.space as Space, spaces: (payload.spaces ?? []) as Space[] };
}
```

并把 `backendErrorMessage` 加进 `src/spaceClient.ts` 顶部对 `appCoreCanvasUtilities` 的 import。

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm vitest run src/spaceClient.test.ts`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add src/spaceClient.ts src/spaceClient.test.ts
git commit -m "feat(space): 前端空间 ZIP 导入导出封装"
```

---

### Task 4: 顶栏两个按钮

**Files:**
- Modify: `src/appExtracted/appTopbar.tsx`（`SpaceSwitcher`，`:117-179`；`Select` 在 `:150-158`）
- Modify: `src/appView.test.tsx`（追加；该文件已有 `loadTopbar()` helper，见 `:1174`）

**Interfaces:**
- Consumes: Task 3 的 `exportSpaceArchive` / `importSpaceArchive`；`saveLazyBlobFile`（`src/fileIO.ts:360`，`LOAD` 失败时自动回退 `downloadBlob`）
- Produces: `export async function exportCurrentSpace(scope): Promise<boolean>`、`export async function importSpaceArchiveFromFile(file, scope): Promise<void>` —— **导出这两个函数是为了可直测**（与 T2 的 `createSpaceThenSwitch` 同一手法）

- [ ] **Step 1: 写失败测试**

在 `src/appView.test.tsx` 追加（**先用 `vi.mock` 桩掉 `spaceClient`**，与本仓 `spaceSwitch.test.ts` 桩 `spaceCache` 同一手法 —— 不要把依赖从 scope 注进去，那会测试出一条产品代码里不存在的路径）：

```tsx
const importSpaceArchiveMock = vi.hoisted(() => vi.fn());
vi.mock("./spaceClient", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./spaceClient")>()),
  importSpaceArchive: importSpaceArchiveMock
}));

describe("空间导入导出按钮", () => {
  beforeEach(() => {
    importSpaceArchiveMock.mockReset();
  });

  test("导入成功后切到新空间", async () => {
    const { importSpaceArchiveFromFile } = await loadTopbar();
    importSpaceArchiveMock.mockResolvedValue({
      space: { id: "新空间", name: "新空间", createdAt: "2026-01-01T00:00:00.000Z" },
      spaces: []
    });
    const requested: string[] = [];

    await importSpaceArchiveFromFile(new File([new Uint8Array([1])], "甲.zip"), {
      requestSwitchSpace: (id: string) => requested.push(id),
      refreshSpaces: vi.fn(async () => {})
    });

    expect(importSpaceArchiveMock).toHaveBeenCalledTimes(1);
    // 与「新建空间」按钮同一收尾：导入完必须切过去
    expect(requested).toEqual(["新空间"]);
  });

  test("导入失败时提示且不切换", async () => {
    const { importSpaceArchiveFromFile } = await loadTopbar();
    importSpaceArchiveMock.mockRejectedValue(new Error("zip 文件格式不正确。"));
    const requested: string[] = [];
    const messages: string[] = [];
    (globalThis as any).showGlobalMessage = (text: string) => messages.push(text);

    await importSpaceArchiveFromFile(new File([new Uint8Array([1])], "坏.zip"), {
      requestSwitchSpace: (id: string) => requested.push(id)
    });

    expect(requested).toEqual([]);
    expect(messages.join("\n")).toContain("zip 文件格式不正确。");
    delete (globalThis as any).showGlobalMessage;
  });
});
```

> `loadTopbar()` 当前只返回纯函数与常量；**需要在 appTopbar.tsx 里把这两个新函数也加进它的返回对象**（照它已有的 `buildSpaceSwitcherOptions` / `createSpaceThenSwitch` 写法）。

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm vitest run src/appView.test.tsx`
Expected: FAIL —— `importSpaceArchiveFromFile is not a function`

- [ ] **Step 3: 实现**

**3a.** `src/appExtracted/appTopbar.tsx` import 区加：

```ts
import { createSpace, exportSpaceArchive, importSpaceArchive, type Space } from "../spaceClient";
import { saveLazyBlobFile } from "../fileIO";
import { Download, Upload } from "lucide-react";
```

（`createSpace` 与 `Space` 已经在 import 里，合并而不是重复。）

**3b.** 在 `createSpaceThenSwitch` 旁加两个可测函数：

```ts
const SPACE_ARCHIVE_PICKER_ID = "space-archive";

// 导出当前空间：文件名取当前空间名，走与方案导出同一个 saveLazyBlobFile
// （支持 File System Access API 时弹原生另存为，不支持则回退浏览器下载）
export async function exportCurrentSpace(scope: Record<string, any>): Promise<boolean> {
  const current = (scope?.spaces as Space[] | undefined)?.find((item) => item.id === scope?.currentSpaceId);
  const filename = `${current?.name || scope?.currentSpaceId || "空间"}.zip`;
  try {
    return await saveLazyBlobFile({
      filename,
      mime: "application/zip",
      description: "空间压缩包",
      extensions: [".zip"],
      pickerId: SPACE_ARCHIVE_PICKER_ID,
      loadBlob: exportSpaceArchive
    });
  } catch (error) {
    showSpaceActionMessage(`导出空间失败：${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

// 导入空间 ZIP：后端恒新建空间，成功后照「新建空间」按钮的收尾切过去
export async function importSpaceArchiveFromFile(file: File, scope: Record<string, any>): Promise<void> {
  try {
    const { space } = await importSpaceArchive(file);
    await scope?.refreshSpaces?.();
    scope?.requestSwitchSpace?.(space.id);
  } catch (error) {
    showSpaceActionMessage(`导入空间失败：${error instanceof Error ? error.message : String(error)}`);
  }
}

function showSpaceActionMessage(text: string): void {
  const notify = (globalThis as any).showGlobalMessage;
  if (typeof notify === "function") {
    notify(text);
  }
}
```

**3c.** `SpaceSwitcher` 的返回块里、`<Select …/>` 之后并列两个按钮与隐藏 input（`:150-176` 之间）：

```tsx
      <button
        type="button"
        className="topbar-secondary-button"
        title="把当前空间导出为压缩包"
        aria-label="导出空间"
        disabled={isBrowseMode}
        onClick={() => void exportCurrentSpace(scope)}
      >
        <Download size={14} />
      </button>
      <button
        type="button"
        className="topbar-secondary-button"
        title="从压缩包导入为一个新空间"
        aria-label="导入空间"
        disabled={isBrowseMode}
        onClick={() => spaceArchiveInputRef.current?.click()}
      >
        <Upload size={14} />
      </button>
      <input
        ref={spaceArchiveInputRef}
        type="file"
        accept=".zip,application/zip"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) {
            void importSpaceArchiveFromFile(file, scope);
          }
        }}
      />
```

`SpaceSwitcher` 里补一句 `const spaceArchiveInputRef = useRef<HTMLInputElement>(null);`。
**按钮样式**：用本仓顶栏既有的类名（先看 `appTopbar.tsx:280` 附近 `topbar-primary-button` 的用法；若没有合适的次要按钮类，就用 `.topbar-primary-button` 保持一致，不要新造样式）。

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm vitest run src/appView.test.tsx`
Expected: PASS

- [ ] **Step 5: 变异验证「导入后必须切过去」**

把 `importSpaceArchiveFromFile` 里的 `scope?.requestSwitchSpace?.(space.id);` 删掉，重跑：
Run: `pnpm vitest run src/appView.test.tsx`
Expected: **FAIL** —— `expected [] to deeply equal [ '新空间' ]`。贴输出后还原，并用 `git hash-object` 比对。

- [ ] **Step 6: 提交**

```bash
git add src/appExtracted/appTopbar.tsx src/appView.test.tsx
git commit -m "feat(space): 顶栏空间下拉右侧加导出/导入按钮"
```

---

### Task 5: 口径同步与全量验收

**Files:**
- Modify: `CLAUDE.md`（根，功能清单的「空间隔离（多工作空间，后端）」一节）
- Modify: `docs/CLAUDE.md`（若新增了接口文档口径）

**Interfaces:** 无新接口；本任务只做文档与最终回归。

- [ ] **Step 1: 更新根 `CLAUDE.md` 的功能清单**

在「空间隔离（多工作空间，后端）」一节末尾补两句（照该节既有句式）：

```markdown
- 空间导入/导出：顶栏空间下拉右侧两按钮；`GET /webgrp/spaces/export` 把当前空间原样打包成 ZIP（只遍历 `spacePathsFor` 枚举的子目录，default 空间的根是数据根、**不得**按根递归），`POST /webgrp/spaces/import` 恒新建空间（重名自动加后缀），失败回滚不落半成品
```

- [ ] **Step 2: 全量回归**

```bash
pnpm vitest run
pnpm tsc --noEmit
pnpm test:e2e
```
Expected: 单测全绿（≥2783）、tsc 无错、e2e 15 passed

- [ ] **Step 3: 手工验收（按 spec §9 逐条，结果贴进报告）**

1. `pnpm dev` → 顶栏空间下拉右侧出现两按钮。
2. 在空间 A 导出 → 原生另存为/下载得到 `<A 名>.zip`；解包可见方案/配置/图元库/图片，无 `trash`。
3. **在 default 空间导出 → 包内不得出现 `spaces.json` 或 `workspaces/`。**
4. 清 Cookie 另开会话导入该包 → 新空间出现、名为包内名；切过去后方案树/图元库/配色/图片与 A 一致。
5. 同一包连续导入两次 → 两个空间并存。
6. 手工把包内某个条目改成 `../evil.txt` 再导入 → 明确 400，且数据根外无新文件。
7. 导入一个损坏的 zip → 提示失败且空间列表不变。

- [ ] **Step 4: 提交**

```bash
git add CLAUDE.md docs/CLAUDE.md
git commit -m "docs: 登记空间导入导出的端点口径"
```

---

## 自检记录（写计划时已核）

- **spec 覆盖**：§4.1 导出 → Task 2；§4.2 导入 → Task 2；§4.3 模块 → Task 1；§4.4 不变量 → Task 1 Step 5 变异 + Task 2 Step 5 变异；§5 前端 → Task 3/4；§7 测试计划 → 各任务的 Step 1；§9 验收 → Task 5 Step 3。⚠️ spec §5 原写「把 `exportSpaceZip`/`importSpaceZip` 加进 `__appScope`」，本计划**改为顶栏内两个可测函数 + 直调 `spaceClient`** —— 更少的装配面（`__appScope` 里不必新增两个成员），且按钮只在这一处用。这是有意的化简，不是漏做。
- **未决**：swigger 是否给 `/spaces/import` 配可自动验证的示例（取决于副作用顾虑，Task 2 Step 3f 给了两条路）。
- **命名一致性**：`exportSpaceArchive` / `importSpaceArchive`（`spaceClient.ts`）在三处出现，措辞一致；`exportCurrentSpace` / `importSpaceArchiveFromFile`（`appTopbar.tsx`）在两处出现，措辞一致；`SPACE_ARCHIVE_META_FILENAME` / `SPACE_ARCHIVE_FORMAT_VERSION` 在 Task 1/2 一致。

---

## 执行期修正（Task 2，控制者裁定）

Task 2 实现时发现本计划 Task 2 一节有 4 处不成立，**均已核实并在实现中修正**。以下为该节的**当前生效口径**（本文档上方 Task 2 的代码与测试片段在这 4 点上作废）：

1. **`spaceStore` 是 `createImageServer` 的闭包局部量**，模块顶层定义的 handler 引用它会 `ReferenceError`。生效口径：handler 走**显式透传**（把 store / retired 守卫等作为参数或 `ctx` 传入），不得引用模块级不可见的名字。
2. **default 空间的 `name` 是「默认空间」**（`spaceStore.mjs:128`），而规格 §3 规定 ZIP 顶层目录名取**空间名**。生效口径：断言里 default 的顶层目录是「默认空间」而不是 `default`。
3. **AdmZip 的 `addFile` 会 canonical 掉 `..`** —— 用 `addFile("坏包/../evil.txt")` 构造的不是越界包，是干净包（实测返回 200）。生效口径：zip-slip 用例必须**改 `entryName`** 构造真载荷，否则该用例绿得没有判别力。
4. **方案解包器只跳 `.e`/`.svg`**（`server.mjs:3172` 的 `/\.(e|svg)$/iu`），`.png` 不会被丢。生效口径：「不得整段复用方案解包器」这条的见证文件必须是 **`.svg`**（空间级图标正是 svg），不是 `.png`。

另记一条**项目级缺口**（不属本计划范围，交最终评审三角）：`npx tsc --noEmit` 的 tsconfig `include` 只有 `src`、`allowJs: false`，**不覆盖 `server/**`** —— 上面第 1 条那类「闭包外引用不存在名字」的缺陷在 `server/` 里只能靠运行时测试兜住。
