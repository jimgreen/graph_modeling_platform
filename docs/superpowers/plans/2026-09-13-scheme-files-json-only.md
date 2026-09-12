# 方案模型文件只保留 JSON、派生格式实时生成 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 `data/schemes/files/**` 只保留模型 `.json`，`.e` / `.svg` / CIM 全部按需实时生成，并移除 `server.mjs` 里与 `src/export` 并存的第二套渲染器。

**Architecture:** 单模型导出端点（`/v1/schemes/model/{json,svg,e-file,cim-xml}`）已实时生成，不改；方案 ZIP 端点从「打包磁盘目录」改为「遍历模型 json → 调同一套适配层生成 → 打包」；保存与写盘路径不再落派生文件，改为把同名旧文件归档进 trash；背景页缺口通过新增 `backgroundProjectIdx` 引用键，由服务端读被引用模型 + 复用 `src` 侧纯函数重建。

**Tech Stack:** Node 24（ESM `.mjs` + 原生 TS 直载）、React 19 + TypeScript、Vitest、AdmZip、iconv-lite。

**Spec:** `docs/superpowers/specs/2026-09-13-scheme-files-json-only-design.md`

## Global Constraints

- Node 下限 **24**（`package.json` `engines`）；后端统一 `.mjs`（ESM），前端 `.ts` / `.tsx`。
- `server/*.mjs` 直载 `src` 下 TS 模块时，相对 import **必须带 `.ts` 扩展名**，且不得 import `.tsx`；被直载模块不得含 JSX / React 组件。
- 测试与源文件同目录，命名 `*.test.ts` / `*.test.mjs`；单文件运行 `pnpm vitest run <path>`。
- 测试隔离用 `GRAPH_MODEL_DATA_DIR` 指向 tmpdir，且必须在动态 `import("./server.mjs")` **之前**设置；测试结束 `delete process.env.GRAPH_MODEL_DATA_DIR`。
- 不新增任何 npm 依赖。
- 编码约定：`.e` 一律 GBK（`iconv.encode(text, "gbk")`），`.svg` 与 `.json` 一律 UTF-8。
- 注释用中文；用户可见文案用中文。
- 回归门槛（每个任务结束跑自己那份，最后一个任务跑全量）：`pnpm vitest run`、`pnpm tsc --noEmit`、`pnpm audit:names`。
- 提交信息：`<type>(<scope>): <中文描述>`，type 取 `feat` / `fix` / `refactor` / `docs` / `test`。
- 本机数据目录为 `data/`（`.gitignore` 已排除），测试**不得**读写真实 `data/`。
- 行号以 spec 写作日为准，实现时若漂移以符号名定位。

---

### Task 1: 方案 ZIP 改为实时生成

把 ZIP 构建从「`zip.addLocalFolder(schemeDir)` 原样打包」改为「枚举模型 `.json` → 调适配层生成 `.e` / `.svg` → 打包」，并让两端点把生成失败映射为 500。

**Files:**
- Create: `server/schemeArchive.mjs`
- Create: `server/schemeArchiveRealtime.test.mjs`
- Modify: `server/server.mjs`（`createSchemeArchiveBuffer` 5256-5275 改为委托；`handleExportSchemeArchive` 6382 起的错误映射）
- Modify: `server/apiV1Schemes.mjs:112-135`（`handleV1SchemeExport` 错误映射）

**Interfaces:**
- Consumes（本任务只用，不修改）：
  - `renderSavedModelSvg({ parts, name, colorMode })` → `{ svg }` 或 `{ error: { code, message } }`（`server/svgExport.mjs`）
  - `buildEFileForSavedModel({ parts, name, templateName, templateText })` → `{ file: { text, filename, warnings } }` 或 `{ error: { code, message } }`（`server/eFileExport.mjs`）
  - `schemeDirectoryFromPath(filesRoot, schemePath)`（`server/server.mjs:5173`，私有）
  - `safeFilePart(value, fallback)`（`server/server.mjs` 内已有）
- Produces:
  - `listModelJsonFiles(rootDir)` → `Promise<Array<{ filePath: string, relativePath: string, dirParts: string[], modelName: string }>>`
  - `buildSchemeArchiveBuffer({ schemeDir, schemeName, renderArtifacts })` → `Promise<{ buffer: Buffer, filename: string, schemeName: string }>`；`renderArtifacts({ dirParts, modelName })` → `Promise<{ eFileBytes: Buffer, svg: string }>`，失败时抛错

- [ ] **Step 1: 写失败测试**

创建 `server/schemeArchiveRealtime.test.mjs`：

```js
// 方案 ZIP 实时生成集成测试：GRAPH_MODEL_DATA_DIR 指向 tmpdir 种子数据 → 起真实 server（端口 0）
// → 断言 ZIP 内 json/e/svg 三件套齐全，且 e/svg 与对应单模型端点输出逐字节一致。
import { describe, expect, test, beforeAll, afterAll } from "vitest";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import AdmZip from "adm-zip";
import { installDomShim } from "./domShim.mjs";
import { apiPath } from "./config.mjs";
import { encodeSchemePath } from "./schemePath.mjs";

installDomShim();

const busNode = {
  id: "bus1",
  kind: "ac-bus",
  name: "母线1",
  position: { x: 100, y: 100 },
  size: { width: 120, height: 16 },
  rotation: 0,
  scale: 1,
  layerId: "default",
  terminals: [
    { id: "t1", anchor: { x: 0.5, y: 0 }, type: "ac", nodeNumber: "1" },
    { id: "t2", anchor: { x: 0.5, y: 1 }, type: "ac", nodeNumber: "2" }
  ],
  params: { name: "母线1", vbase: "10" }
};

let dataDir;
let server;
let baseUrl;

beforeAll(async () => {
  dataDir = mkdtempSync(join(tmpdir(), "scheme-archive-"));
  const dir = join(dataDir, "schemes", "files", "测试方案");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "厂站.json"), JSON.stringify({
    version: 1,
    name: "厂站",
    idx: 1,
    modelType: "厂站",
    canvasWidth: 800,
    canvasHeight: 400,
    canvasBackgroundColor: "#ffffff",
    layers: [{ id: "default", name: "默认图层", visible: true }],
    activeLayerId: "default",
    nodes: [busNode],
    edges: []
  }), "utf-8");
  // 坏 JSON：readSchemeProjectRecord 返回 null → 生成阶段报错，用于验证 500 而非静默跳过
  writeFileSync(join(dir, "坏模型.json"), "{", "utf-8");
  process.env.GRAPH_MODEL_DATA_DIR = dataDir;
  const { createImageServer } = await import("./server.mjs");
  server = await createImageServer({ port: 0, host: "127.0.0.1" });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

afterAll(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  delete process.env.GRAPH_MODEL_DATA_DIR;
  rmSync(dataDir, { recursive: true, force: true });
});

const schemePathParam = () => encodeSchemePath(["测试方案"]);

test("ZIP 内含 json + e + svg 三件套", async () => {
  const response = await fetch(`${baseUrl}${apiPath("/v1/schemes/export")}?schemePath=${schemePathParam()}`);
  expect(response.status).toBe(200);
  const zip = new AdmZip(Buffer.from(await response.arrayBuffer()));
  const names = zip.getEntries().map((entry) => entry.entryName).sort();
  expect(names).toEqual([
    "测试方案/厂站.e",
    "测试方案/厂站.json",
    "测试方案/厂站.svg"
  ]);
});

test("ZIP 内 e/svg 与单模型端点输出逐字节一致，json 与磁盘原文一致", async () => {
  const response = await fetch(`${baseUrl}${apiPath("/v1/schemes/export")}?schemePath=${schemePathParam()}`);
  const zip = new AdmZip(Buffer.from(await response.arrayBuffer()));
  const read = (entryName) => zip.getEntry(entryName).getData();

  const eUrl = `${baseUrl}${apiPath("/v1/schemes/model/e-file")}?schemePath=${schemePathParam()}&name=${encodeURIComponent("厂站")}&encoding=gbk`;
  const svgUrl = `${baseUrl}${apiPath("/v1/schemes/model/svg")}?schemePath=${schemePathParam()}&name=${encodeURIComponent("厂站")}&colorMode=voltage&encoding=utf-8`;

  expect(read("测试方案/厂站.e").equals(Buffer.from(await (await fetch(eUrl)).arrayBuffer()))).toBe(true);
  expect(read("测试方案/厂站.svg").equals(Buffer.from(await (await fetch(svgUrl)).arrayBuffer()))).toBe(true);
});

test("损坏模型导致整体失败并返回 500，错误信息含模型名", async () => {
  const response = await fetch(`${baseUrl}${apiPath("/v1/schemes/export")}?schemePath=${schemePathParam()}`);
  expect(response.status).toBe(500);
  const payload = await response.json();
  expect(payload.ok).toBe(false);
  expect(payload.error.message).toContain("坏模型");
});
```

注意：第三个用例的种子会让第一个用例也失败（同一方案里有坏模型）。为让两者并存，把坏模型放到**另一个方案**下：

```js
  // 在 beforeAll 里追加：坏模型单独放一个方案，避免污染正路径断言
  const badDir = join(dataDir, "schemes", "files", "坏方案");
  mkdirSync(badDir, { recursive: true });
  writeFileSync(join(badDir, "坏模型.json"), "{", "utf-8");
```

并把第三个用例改为 `encodeSchemePath(["坏方案"])`；第一个用例的 `toEqual` 断言保持不变（`测试方案` 下只有 `厂站`）。

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm vitest run server/schemeArchiveRealtime.test.mjs`
Expected: FAIL —— 第一个用例断言 `["测试方案/厂站.e","测试方案/厂站.json","测试方案/厂站.svg"]` 收到 `["测试方案/厂站.json"]`（当前是 `addLocalFolder` 原样打包）。

- [ ] **Step 3: 新建 `server/schemeArchive.mjs`**

```js
// 方案 ZIP 构建：枚举模型 .json → 调注入的生成器产出 .e/.svg → 打包。
// 派生格式不落盘，故打包时逐模型实时生成（口径与 /v1/schemes/model/{svg,e-file} 端点一致）。
// 本模块只做「目录 → ZIP 字节」，不 import 任何渲染适配层，保持可单测。
import { readFile, readdir, stat } from "node:fs/promises";
import { join, relative } from "node:path";
import AdmZip from "adm-zip";

/** 是模型文件判据，与 maxStoredProjectIndex / scanProjectByIndex 的扫描口径一致 */
function isModelJsonFile(fileName) {
  return /\.json$/iu.test(fileName) && fileName.toLocaleLowerCase() !== "scheme.json";
}

/** 递归列出方案目录下的模型 json（含子方案目录） */
export async function listModelJsonFiles(rootDir) {
  const found = [];
  const visit = async (dir, dirParts) => {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        await visit(full, [...dirParts, entry.name]);
        continue;
      }
      if (!entry.isFile() || !isModelJsonFile(entry.name)) {
        continue;
      }
      found.push({
        filePath: full,
        relativePath: relative(rootDir, full),
        dirParts,
        modelName: entry.name.replace(/\.json$/iu, "")
      });
    }
  };
  await visit(rootDir, []);
  return found;
}

/**
 * 构建方案 ZIP：json 用磁盘原文，e/svg 由 renderArtifacts 实时生成。
 * 任一模型生成失败即抛出，不产出残缺压缩包。
 */
export async function buildSchemeArchiveBuffer({ schemeDir, schemeName, renderArtifacts }) {
  const schemeStat = await stat(schemeDir).catch(() => null);
  if (!schemeStat || !schemeStat.isDirectory()) {
    throw new Error("方案目录不存在。");
  }
  const models = await listModelJsonFiles(schemeDir);
  const zip = new AdmZip();
  for (const model of models) {
    const { eFileBytes, svg } = await renderArtifacts({
      dirParts: model.dirParts,
      modelName: model.modelName
    });
    const base = `${schemeName}/${model.relativePath.replace(/\.json$/iu, "")}`;
    zip.addFile(`${base}.json`, await readFile(model.filePath));
    zip.addFile(`${base}.e`, eFileBytes);
    zip.addFile(`${base}.svg`, Buffer.from(svg, "utf-8"));
  }
  return {
    buffer: zip.toBuffer(),
    filename: `${schemeName}.zip`,
    schemeName
  };
}
```

- [ ] **Step 4: 在 `server/server.mjs` 让 `createSchemeArchiveBuffer` 委托新模块**

把 `createSchemeArchiveBuffer`（原 5256-5275）整体替换为：

```js
// 方案 ZIP：json 落盘原文 + e/svg 实时生成（不再读磁盘派生文件）。
// 适配层用函数内动态 import：svgExport/eFileExport 均 import 本模块，静态 import 会成环。
export async function createSchemeArchiveBuffer(options) {
  const filesRoot = options.filesRoot ?? join(schemeDataDir, "files");
  const schemePath = Array.isArray(options.schemePath) ? options.schemePath : [];
  if (schemePath.length === 0) {
    throw new Error("缺少方案路径。");
  }
  const schemeName = safeFilePart(schemePath[schemePath.length - 1], "方案");
  const schemeDir = schemeDirectoryFromPath(filesRoot, schemePath);
  const { buildSchemeArchiveBuffer } = await import("./schemeArchive.mjs");
  return buildSchemeArchiveBuffer({
    schemeDir,
    schemeName,
    renderArtifacts: async ({ dirParts, modelName }) => {
      const { renderSavedModelSvg } = await import("./svgExport.mjs");
      const { buildEFileForSavedModel } = await import("./eFileExport.mjs");
      const parts = [...schemePath, ...dirParts];
      const svgResult = await renderSavedModelSvg({ parts, name: modelName });
      if (svgResult.error) {
        throw new Error(`模型“${modelName}”SVG 生成失败：${svgResult.error.message}`);
      }
      const eResult = await buildEFileForSavedModel({ parts, name: modelName });
      if (eResult.error) {
        throw new Error(`模型“${modelName}”E 文件生成失败：${eResult.error.message}`);
      }
      return {
        svg: svgResult.svg,
        eFileBytes: iconv.encode(String(eResult.file?.text ?? ""), "gbk")
      };
    }
  });
}
```

确认 `iconv` 在 `server.mjs` 顶部已 import（`import iconv from "iconv-lite"`，`writeTextIfChanged` 在用）；若未 import 则补上。

- [ ] **Step 5: 两端点把生成失败映射为 500**

`server/apiV1Schemes.mjs` 的 `handleV1SchemeExport` catch 块改为：

```js
  } catch (error) {
    const message = error instanceof Error ? error.message : "导出方案失败。";
    if (message.includes("缺少方案路径")) {
      sendV1Error(response, "bad-request", message);
      return;
    }
    if (message.includes("方案目录不存在")) {
      sendV1Error(response, "not-found", message);
      return;
    }
    // 生成失败（如某模型 json 损坏）：明确 500 + 原因，不静默跳过、不产出残缺 ZIP
    sendV1Error(response, "internal", message);
  }
```

`server/server.mjs` 的 `handleExportSchemeArchive` catch 块改为：

```js
  } catch (error) {
    const message = error instanceof Error ? error.message : "导出方案压缩包失败。";
    if (message.includes("缺少方案路径")) {
      sendError(response, 400, message);
      return;
    }
    if (message.includes("方案目录不存在")) {
      sendError(response, 404, message);
      return;
    }
    sendError(response, 500, message);
  }
```

注意：原内部实现是「任意非路径错误一律 404 固定文案」，改后 ENOENT 由 `schemeArchive.mjs` 统一翻译成 `"方案目录不存在。"`，`server/apiInternal.test.mjs:302` 的既有 404 断言仍成立。

- [ ] **Step 6: 跑测试确认通过**

Run: `pnpm vitest run server/schemeArchiveRealtime.test.mjs`
Expected: PASS（3 个用例）

- [ ] **Step 7: 跑相邻回归**

Run: `pnpm vitest run server/svgExport.test.mjs server/apiV1Schemes.handlers.test.mjs server/apiV1Schemes.test.mjs server/apiInternal.test.mjs server/swigger.examples.test.mjs`
Expected: 全绿。若 `swigger.examples.test.mjs` 因导出示例耗时变长仍应通过。

- [ ] **Step 8: 提交**

```bash
git add server/schemeArchive.mjs server/schemeArchiveRealtime.test.mjs server/server.mjs server/apiV1Schemes.mjs
git commit -m "feat(server): 方案 ZIP 打包时实时生成 E/SVG，不再打包磁盘派生文件"
```

---

### Task 2: 背景页由服务端按引用键重建

新增 `backgroundProjectIdx` 引用键，让服务端 SVG 端点也能输出背景页图层，与界面导出口径一致。

**Files:**
- Modify: `src/model.ts:612`（`ProjectFile` 增字段）
- Modify: `src/appExtracted/appSelectionDragFactories.tsx:130`（`createCurrentProject` 输出字段）
- Modify: `server/svgExport.mjs`（`renderSavedModelSvg` 组装 `backgroundPage`）
- Modify: `server/svgExport.test.mjs`（新增背景页用例）
- Create: `src/appExtracted/appSelectionDragFactories.test.ts`

**Interfaces:**
- Consumes:
  - `findSchemeProjectRecordByIndex({ index, filesRoot? })` → `Promise<record | null>`（`server/server.mjs:5508`）
  - `normalizeProjectLayers(project)`、`filterProjectByVisibleLayers(nodes, edges, layers)`（`src/model-routing.ts:6871`、`6945`，已实测可被 Node 直载）
  - `backgroundPageCanvasTransform(sourceBounds, targetBounds)`（`src/export/svg.ts:158`）
  - `DEFAULT_CANVAS_WIDTH` / `DEFAULT_CANVAS_HEIGHT`（`src/export/svg.ts`，`svgExport.mjs` 已 import）
- Produces: `ProjectFile.backgroundProjectIdx?: number`（单位：模型全局 `idx`）

- [ ] **Step 1: 写失败测试（前端字段）**

创建 `src/appExtracted/appSelectionDragFactories.test.ts`：

```ts
// createCurrentProject 输出 backgroundProjectIdx：服务端靠它定位背景模型（前端 id 服务端无法解析）
import { describe, expect, test } from "vitest";
import { createCurrentProject } from "./appSelectionDragFactories";

function makeScope(overrides: Record<string, unknown> = {}) {
  return {
    activeLayerId: "default",
    allowAutoExpandCanvas: true,
    backgroundLayerIds: ["default"],
    backgroundProjectId: "project-bg",
    canvasBackgroundColor: "#ffffff",
    canvasBackgroundImage: "",
    canvasBackgroundImageAssetId: "",
    canvasBackgroundImageFit: "cover",
    canvasWidth: 800,
    canvasHeight: 400,
    currentUnit: "A",
    deviceIndexCounters: {},
    edgeWithCurrentRouteGeometryForSave: (edge: unknown) => edge,
    edges: [],
    groups: [],
    layers: [{ id: "default", name: "默认图层", visible: true }],
    lockProjectEdgeTerminals: (project: unknown) => project,
    nodes: [],
    normalizeModelGroups: (groups: unknown) => groups,
    normalizeProjectLayers: (project: unknown) => project,
    normalizeProjectMeasurements: (measurements: unknown) => measurements,
    powerBaseValue: 100,
    powerUnit: "MW",
    projectMeasurements: { version: 1, groups: [] },
    projectName: "宿主模型",
    projectIdx: 7,
    voltageUnit: "kV",
    ...overrides
  };
}

describe("createCurrentProject 背景页引用键", () => {
  test("背景记录有 idx 时输出 backgroundProjectIdx", () => {
    const project = createCurrentProject(makeScope({ backgroundProjectRecord: { idx: 3 } }))();
    expect(project.backgroundProjectIdx).toBe(3);
  });

  test("无背景记录或 idx 非法时不输出", () => {
    expect(createCurrentProject(makeScope({ backgroundProjectRecord: undefined }))().backgroundProjectIdx).toBeUndefined();
    expect(createCurrentProject(makeScope({ backgroundProjectRecord: { idx: 0 } }))().backgroundProjectIdx).toBeUndefined();
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm vitest run src/appExtracted/appSelectionDragFactories.test.ts`
Expected: FAIL —— 第一个用例 `expected undefined to be 3`。

- [ ] **Step 3: 加类型字段**

`src/model.ts:612` 的 `backgroundProjectId?: string;` 之后加一行：

```ts
  // 背景页引用键：模型全局 idx（服务端据 it 定位被引用模型重建背景页；前端 id 服务端无法解析）
  backgroundProjectIdx?: number;
```

- [ ] **Step 4: 让 `createCurrentProject` 输出该字段**

`src/appExtracted/appSelectionDragFactories.tsx:132` 的解构里按字母序插入 `backgroundProjectRecord`（在 `backgroundProjectId` 之前），并在对象字面量中 `backgroundProjectId,` 之后加：

```ts
      ...(Number(backgroundProjectRecord?.idx) > 0 ? { backgroundProjectIdx: Number(backgroundProjectRecord.idx) } : {}),
```

- [ ] **Step 5: 跑测试确认通过**

Run: `pnpm vitest run src/appExtracted/appSelectionDragFactories.test.ts`
Expected: PASS（2 个用例）

- [ ] **Step 6: 写失败测试（服务端背景页）**

在 `server/svgExport.test.mjs` 的 `beforeAll` 里追加种子（放在现有写入之后、`createImageServer` 之前）：

```js
  // 背景页用例：背景模型 idx=91（含一个母排与两个图层），宿主模型引用它并只显示 default 层
  writeFileSync(join(dir, "背景模型.json"), JSON.stringify({
    version: 1,
    name: "背景模型",
    idx: 91,
    canvasWidth: 600,
    canvasHeight: 300,
    canvasBackgroundColor: "#eeeeee",
    layers: [
      { id: "default", name: "默认图层", visible: true },
      { id: "hid", name: "隐藏图层", visible: true }
    ],
    activeLayerId: "default",
    nodes: [
      { ...busNode, layerId: "default" },
      { ...busNode, id: "bus-hidden", layerId: "hid" }
    ],
    edges: []
  }), "utf-8");
  writeFileSync(join(dir, "宿主模型.json"), JSON.stringify({
    version: 1,
    name: "宿主模型",
    idx: 92,
    canvasWidth: 800,
    canvasHeight: 400,
    canvasBackgroundColor: "#ffffff",
    backgroundProjectIdx: 91,
    backgroundLayerIds: ["default"],
    nodes: [breakerNode],
    edges: []
  }), "utf-8");
  writeFileSync(join(dir, "悬空背景模型.json"), JSON.stringify({
    version: 1,
    name: "悬空背景模型",
    idx: 93,
    canvasWidth: 800,
    canvasHeight: 400,
    backgroundProjectIdx: 999,
    backgroundLayerIds: ["default"],
    nodes: [breakerNode],
    edges: []
  }), "utf-8");
```

并追加用例：

```js
test("设了 backgroundProjectIdx 时输出背景页图层，且按 backgroundLayerIds 过滤图层", async () => {
  const text = await fetchSvg("宿主模型");
  expect(text).toContain('class="export-background-page-layer"');
  expect(text).toContain("export_bg_");
  // 隐藏图层内的 bus-hidden 不应出现（图层过滤生效）
  expect(text).not.toContain("bus-hidden");
});

test("无 backgroundProjectIdx 时不输出背景页图层", async () => {
  const text = await fetchSvg("开关模型");
  expect(text).not.toContain("export-background-page-layer");
});

test("backgroundProjectIdx 指向已删除模型时静默跳过且返回 200", async () => {
  const response = await fetch(`${baseUrl}${svgPath}?schemePath=${schemePath}&name=${encodeURIComponent("悬空背景模型")}`);
  expect(response.status).toBe(200);
  expect(await response.text()).not.toContain("export-background-page-layer");
});
```

`fetchSvg` 若文件里已有等价 helper 就复用；没有则加：

```js
async function fetchSvg(name) {
  const response = await fetch(`${baseUrl}${svgPath}?schemePath=${schemePath}&name=${encodeURIComponent(name)}`);
  expect(response.status).toBe(200);
  return response.text();
}
```

- [ ] **Step 7: 跑测试确认失败**

Run: `pnpm vitest run server/svgExport.test.mjs`
Expected: FAIL —— 新用例 `expected ... to contain 'class="export-background-page-layer"'`。

- [ ] **Step 8: 在 `server/svgExport.mjs` 实现重建**

在 `renderSavedModelSvg` 上方加辅助函数，并在函数内接线：

```js
// 背景页重建：宿主模型只落盘引用键（backgroundProjectIdx + backgroundLayerIds），
// 服务端读被引用模型 + 复用 src 侧纯函数复现前端 backgroundPageRender 载荷。
// 不用前端 id（backgroundProjectId）：磁盘 json 不含 id，服务端无 id→文件映射。
async function buildBackgroundPageOption({ project, deviceTemplates, imageExportPathById }) {
  const backgroundIdx = Number(project?.backgroundProjectIdx);
  if (!Number.isSafeInteger(backgroundIdx) || backgroundIdx <= 0) {
    return { backgroundPage: undefined, referencedHrefById: new Map() };
  }
  // 自引用与前端 createAppHookCallback141 同口径：跳过
  if (Number(project?.idx) === backgroundIdx) {
    return { backgroundPage: undefined, referencedHrefById: new Map() };
  }
  const record = await findSchemeProjectRecordByIndex({ index: backgroundIdx });
  if (!record) {
    // 被引用模型已删除：不打断导出
    return { backgroundPage: undefined, referencedHrefById: new Map() };
  }
  const backgroundProject = normalizeProjectLayers(record.project ?? {});
  const visibleLayerIds = new Set(
    Array.isArray(project.backgroundLayerIds) ? project.backgroundLayerIds.map(String) : []
  );
  const layers = (backgroundProject.layers ?? []).map((layer) => ({
    ...layer,
    visible: visibleLayerIds.has(String(layer.id))
  }));
  const { nodes, edges } = filterProjectByVisibleLayers(
    backgroundProject.nodes ?? [],
    backgroundProject.edges ?? [],
    layers
  );
  const backgroundBounds = {
    width: Number(backgroundProject.canvasWidth ?? DEFAULT_CANVAS_WIDTH),
    height: Number(backgroundProject.canvasHeight ?? DEFAULT_CANVAS_HEIGHT)
  };
  const referencedHrefById = collectSvgExportReferencedImageHrefById({
    nodes,
    canvasBackgroundImage: backgroundProject.canvasBackgroundImage,
    canvasBackgroundImageAssetId: backgroundProject.canvasBackgroundImageAssetId,
    canvasBackgroundImageUrl: backgroundProject.canvasBackgroundImageUrl,
    libraryTemplateByKind: new Map(deviceTemplates.map((template) => [template.kind, template]))
  });
  return {
    referencedHrefById,
    backgroundPage: {
      project: backgroundProject,
      nodes,
      edges,
      backgroundBounds,
      transform: backgroundPageCanvasTransform(backgroundBounds, {
        width: Number(project.canvasWidth ?? DEFAULT_CANVAS_WIDTH),
        height: Number(project.canvasHeight ?? DEFAULT_CANVAS_HEIGHT)
      }),
      backgroundColor: backgroundProject.canvasBackgroundColor ?? undefined,
      backgroundImageUrl: backgroundProject.canvasBackgroundImage ?? ""
    }
  };
}
```

接线改动（`renderSavedModelSvg` 内）：

1. 顶部 import 扩充：
   - 从 `./server.mjs` 追加 import `findSchemeProjectRecordByIndex`
   - 从 `../src/export/svg.ts` 的解构追加 `backgroundPageCanvasTransform`
   - 新增 `const { normalizeProjectLayers, filterProjectByVisibleLayers } = await import("../src/model-routing.ts");`
2. 先算背景页，再算图片引用集合（背景页图片要并入）：

```js
  const { backgroundPage, referencedHrefById: backgroundReferencedHrefById } = await buildBackgroundPageOption({
    project,
    deviceTemplates,
    imageExportPathById
  });
```

3. 原本算宿主 `referencedHrefById` 的地方，改为合并两份：

```js
  const referencedHrefById = new Map([
    ...collectSvgExportReferencedImageHrefById({ /* 原有入参不变 */ }),
    ...backgroundReferencedHrefById
  ]);
```

4. `buildSvgDocument` 的选项对象里加：

```js
      backgroundPage,
```

- [ ] **Step 9: 跑 `nativeLoad` 守卫（无需改它，但必须跑）**

`server/nativeLoad.test.mjs` 的守卫在子进程里 `await import("./server/svgExport.mjs")`（该文件 13-17 行的 `CHILD_SCRIPT`）。本任务把 `src/model-routing.ts` 加进 `svgExport.mjs` 的**顶层** `await import`，故该守卫会自动覆盖新依赖链——**不需要修改测试文件**。

Run: `pnpm vitest run server/nativeLoad.test.mjs`
Expected: PASS。若报 `ERR_UNKNOWN_FILE_EXTENSION` / `Unknown file extension`，说明 `model-routing.ts` 的依赖链里混入了 `.tsx`，此时不能删旧路径，须回到 spec 第 11 节改用「服务端自渲染或另建纯模块」方案。

- [ ] **Step 10: 跑测试确认通过**

Run: `pnpm vitest run server/svgExport.test.mjs`
Expected: PASS（含 3 个新用例）

- [ ] **Step 11: 回归（背景页改动可能影响 ZIP 与 CIM）**

Run: `pnpm vitest run server/ src/appExtracted/`
Expected: 全绿

- [ ] **Step 12: 提交**

```bash
git add src/model.ts src/appExtracted/appSelectionDragFactories.tsx src/appExtracted/appSelectionDragFactories.test.ts server/svgExport.mjs server/svgExport.test.mjs
git commit -m "feat(svg): 背景页改由服务端按 backgroundProjectIdx 重建，端点与界面导出口径一致"
```

---

### Task 3: 删除前端产物上传通道

**Files:**
- Modify: `src/appExtracted/appProjectCanvasFactories.tsx:4881-5030`（删 `computeSaveArtifacts` 与两处 `artifacts` 实参）
- Modify: `src/appExtracted/appPersistenceLibraryExport.tsx:376-385`（删 `saveBackendProjectArtifacts`）
- Modify: `src/appExtracted/appDeviceDefinitionFactories.tsx:3724-3783`（删导出 ZIP 前的逐模型刷新循环）
- Modify: `src/appExtracted/appExportBackend.test.ts`、`src/appExtracted/appProjectCanvasFactories.test.ts`
- Modify: `src/App.tsx`（若 `__appScope` 里仍注册 `saveBackendProjectArtifacts` / `buildEFileExport` 等仅服务于该通道的键，一并清理）

**Interfaces:**
- Consumes: `saveBackendProjectRecord(schemePath, record, previousName?)`（不再传第 4 个参数）
- Produces: 无新导出；本次是纯删除

- [ ] **Step 1: 改测试为「只发 json」**

1. `src/appExtracted/appExportBackend.test.ts`：所有断言「保存/导出时请求过 `/schemes/project/artifacts`」或「保存体含 svg/eFile」的用例，改为断言保存体**不含**这两个键：

```ts
test("保存模型只发 json，不带 svg/eFile", async () => {
  // ...（沿用该文件已有的 fetch mock 与调用方式）
  const body = JSON.parse(String(fetchMock.mock.calls.at(-1)?.[1]?.body ?? "{}"));
  expect(body).not.toHaveProperty("svg");
  expect(body).not.toHaveProperty("eFile");
});
```

同时删掉断言 `/schemes/project/artifacts` 被调用的用例（该端点连同调用一起删除）。

2. `src/appExtracted/appProjectCanvasFactories.test.ts`：先 `grep -n "svg\|eFile\|artifacts" src/appExtracted/appProjectCanvasFactories.test.ts` 找出为 `computeSaveArtifacts` 服务的断言，逐条删除或改为「`saveBackendProjectRecord` 第 4 个实参为 `undefined`」：

```ts
expect(saveBackendProjectRecord).toHaveBeenCalledWith(["测试方案"], expect.anything(), "");
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm vitest run src/appExtracted/appExportBackend.test.ts`
Expected: FAIL —— 保存体仍含 `svg` / `eFile`（`computeSaveArtifacts` 仍在）。

- [ ] **Step 3: 删 `computeSaveArtifacts` 与两处实参**

`src/appExtracted/appProjectCanvasFactories.tsx`：

1. 删除 `const computeSaveArtifacts = async (project, schemePath) => {...}` 整块（含其上方注释）
2. 两处调用改回三实参：

```ts
        savedRecord = await saveBackendProjectRecord(ownerSchemePath, record, existing.name);
```

```ts
      savedRecord = await saveBackendProjectRecord(targetSchemePath, record, recoveredRecord?.name);
```

3. 清理解构里只服务于该函数的键。逐个执行下列命令，命中数为 1（只在本函数内）的才可删：

```bash
for key in backgroundPageRender buildEFileExport buildSvgDocument colorPalette eDeviceDefinitionClassExportEnabled eDeviceDefinitionFieldOrder eDeviceDefinitionLabels eDeviceDefinitionTableIds eDeviceDefinitionTemplateFields loadSvgImageExportPathById PARAM_LABELS resolveTemplateComponentLibrary; do printf "%s: " "$key"; grep -c "\b$key\b" src/appExtracted/appProjectCanvasFactories.tsx; done
```

预期：上列键在删除函数后命中数降为 0 的（`buildSvgDocument`、`buildEFileExport`、`PARAM_LABELS`、`eDeviceDefinition*`、`resolveTemplateComponentLibrary`、`loadSvgImageExportPathById`、`colorPalette`、`backgroundPageRender`）→ 从 `__appScope` 解构中删除；删完再跑一次同样的命令，确认这些键在本文件命中数为 0。

注意 `backgroundPageRender` 在 `src/appExtracted/appDeviceDefinitionFactories.tsx`（另一个文件）里还被导出方案 ZIP 那处使用，那个调用点在 Step 4 才删，不要在 Step 3 越界处理。

- [ ] **Step 4: 删 `saveBackendProjectArtifacts` 与其调用方**

1. `src/appExtracted/appPersistenceLibraryExport.tsx`：删除 `saveBackendProjectArtifacts` 整个函数
2. `src/appExtracted/appDeviceDefinitionFactories.tsx`：删除 `createExportSchemeRecord` 里「导出前刷新方案 SVG/E」的整个 `try {...} catch {...}` 块（原 3748-3788 一带），保留其后的 `downloadBackendSchemeArchive` 调用与成功提示
3. 同文件解构里只服务于该块的键，用与 Step 3 相同的逐键 `grep -c` 法确认后删除：

```bash
for key in buildEFileExport buildSvgDocument saveBackendProjectArtifacts backgroundPageRender fetchBackendProjectRecord savedProjectRecordIsSummary schemePathForScheme schemePathForRecord; do printf "%s: " "$key"; grep -c "\b$key\b" src/appExtracted/appDeviceDefinitionFactories.tsx; done
```

`buildEFileExport` / `buildSvgDocument` / `saveBackendProjectArtifacts` 预期命中数为 1 → 删；其余按命中数决定。

4. `src/App.tsx` 若注册了 `saveBackendProjectArtifacts`（`grep -n "saveBackendProjectArtifacts" src/App.tsx`），一并删除该 `Object.assign` 项

- [ ] **Step 5: 跑测试确认通过**

Run: `pnpm vitest run src/appExtracted/appExportBackend.test.ts src/appExtracted/appProjectCanvasFactories.test.ts src/svgExport.test.tsx`
Expected: PASS

- [ ] **Step 6: 类型检查**

Run: `pnpm tsc --noEmit`
Expected: 无错误（删解构键后若有「未定义名」会在此暴露）

- [ ] **Step 7: 提交**

```bash
git add src/appExtracted/appProjectCanvasFactories.tsx src/appExtracted/appPersistenceLibraryExport.tsx src/appExtracted/appDeviceDefinitionFactories.tsx src/App.tsx src/appExtracted/appExportBackend.test.ts src/appExtracted/appProjectCanvasFactories.test.ts
git commit -m "refactor(frontend): 删除保存时上传 SVG/E 产物的通道"
```

---

### Task 4: 删除服务端旧渲染器与旧入参，保存时归档同名派生文件

**Files:**
- Modify: `server/server.mjs`（删两个旧函数、旧入参、artifacts 路由；`saveSchemeProjectRecord` 改为归档同名 `.e`/`.svg`；`writeSchemeFiles` 的 `expectedFiles` 只登记 json）
- Modify: `server/server.test.mjs`（删 11 个 `buildSvgFile` 用例）
- Create: `server/schemeFilesJsonOnly.test.mjs`

**Interfaces:**
- Consumes: `projectFilePathsForName(schemeDir, name)`（`server/server.mjs:5358`，返回 `{ jsonPath, ePath, svgPath }`）、`archiveSchemeStoreEntry(filePath, filesRoot, trashRoot, archiveId)`、`schemeArchiveId()`
- Produces: `saveSchemeProjectRecord({ filesRoot?, trashRoot?, schemePath, record, previousName? })` —— 不再接受 `svg` / `eFile` / `measurementConfig` / `imagePathById` 四个入参（后两个原本只服务 `.e` / `.svg` 生成）

- [ ] **Step 1: 写失败测试**

创建 `server/schemeFilesJsonOnly.test.mjs`：

```js
// files 不变量：保存后目录内只留 .json；同名旧 .e/.svg 被归档进 trash；
// 旧客户端仍带 svg/eFile 入参时被忽略且正常 200。
import { describe, expect, test, beforeAll, afterAll } from "vitest";
import { mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { installDomShim } from "./domShim.mjs";
import { apiPath } from "./config.mjs";
import { encodeSchemePath } from "./schemePath.mjs";

installDomShim();

let dataDir;
let server;
let baseUrl;

const schemeDir = () => join(dataDir, "schemes", "files", "测试方案");

beforeAll(async () => {
  dataDir = mkdtempSync(join(tmpdir(), "json-only-"));
  mkdirSync(schemeDir(), { recursive: true });
  process.env.GRAPH_MODEL_DATA_DIR = dataDir;
  const { createImageServer } = await import("./server.mjs");
  server = await createImageServer({ port: 0, host: "127.0.0.1" });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

afterAll(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  delete process.env.GRAPH_MODEL_DATA_DIR;
  rmSync(dataDir, { recursive: true, force: true });
});

const project = {
  version: 1,
  name: "厂站",
  canvasWidth: 800,
  canvasHeight: 400,
  layers: [{ id: "default", name: "默认图层", visible: true }],
  activeLayerId: "default",
  nodes: [],
  edges: []
};

async function saveModel(body) {
  return fetch(`${baseUrl}${apiPath("/schemes/project")}`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ schemePath: ["测试方案"], name: "厂站", project: { ...project }, ...body })
  });
}

test("保存后目录内只留 .json", async () => {
  const response = await saveModel({});
  expect(response.status).toBe(200);
  const names = readdirSync(schemeDir()).sort();
  expect(names).toEqual(["厂站.json"]);
});

test("保存时同名旧 .e/.svg 被归档进 trash", async () => {
  // 预置派生物（模拟改造前的存量）
  writeFileSync(join(schemeDir(), "厂站.e"), "stale", "utf-8");
  writeFileSync(join(schemeDir(), "厂站.svg"), "<svg/>", "utf-8");
  const response = await saveModel({});
  expect(response.status).toBe(200);
  expect(readdirSync(schemeDir()).sort()).toEqual(["厂站.json"]);

  const trash = join(dataDir, "schemes", "trash");
  const archiveIds = readdirSync(trash);
  expect(archiveIds.length).toBeGreaterThan(0);
  const archived = archiveIds.flatMap((id) => readdirSync(join(trash, id)).map((name) => `${id}/${name}`));
  expect(archived.some((name) => name.endsWith("/厂站.e"))).toBe(true);
  expect(archived.some((name) => name.endsWith("/厂站.svg"))).toBe(true);
});

test("旧客户端带 svg/eFile 入参时被忽略且返回 200", async () => {
  const response = await saveModel({ svg: "<svg/>", eFile: "x" });
  expect(response.status).toBe(200);
  expect(readdirSync(schemeDir()).sort()).toEqual(["厂站.json"]);
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm vitest run server/schemeFilesJsonOnly.test.mjs`
Expected: FAIL —— 第一个用例收到 `["厂站.e","厂站.json","厂站.svg"]`。

- [ ] **Step 3: `saveSchemeProjectRecord` 改为只写 json + 归档同名派生物**

`server/server.mjs` 内：

1. 删除入参 `svg: options.svg ?? ...` / `eFile` 相关两行，删除 `buildSvgFile` / `buildDeviceParameterFile` 调用
2. 在已有 `previousName` 归档块之后、写盘之前，加入同名派生物归档：

```js
  // files 不变量：只留 .json。改造前落盘的 .e/.svg 在本次保存时归档（可回滚，不硬删）
  const { ePath, svgPath } = projectFilePathsForName(schemeDir, name);
  const staleArchiveId = schemeArchiveId();
  await Promise.all(
    [ePath, svgPath].map((filePath) => archiveSchemeStoreEntry(filePath, filesRoot, trashRoot, staleArchiveId))
  );
```

`archiveSchemeStoreEntry`（`server/server.mjs:5133`）内部已对 `ENOENT` 直接 return（5145-5147），文件不存在时静默跳过，无需额外 try/catch。

3. 删除该函数的 `measurementConfig` / `imagePathById` 解构与使用：

```js
  const measurementConfig = options.measurementConfig ?? { measurementTypes: [], deviceProfiles: [] };
  const imagePathById = options.imagePathById ?? (await imageExportPathByIdFromManifest(await readManifest()));
```

4. 写盘列表只留 json：

```js
  await writeTextIfChanged(jsonPath, stringifyJson({ ...storageProject, name }));
```

- [ ] **Step 4: `writeSchemeFiles` 只登记 json**

`writeSchemeFiles` 内：

1. 删除 `expectedFiles.add(ePath)` / `expectedFiles.add(svgPath)` 与 `if (!svgExists) {...}` / `if (!eExists) {...}` 两块
2. 删除随之不再使用的 `measurementConfig` / `imagePathById` 计算（若 `options.imagePathById` 无其它消费者）
3. 保留 `removeStaleSchemeFiles(filesRoot, expectedFiles, expectedDirs)` 调用——它会把不在清单内的 `.e` / `.svg` 归档

- [ ] **Step 5: 删旧入参处理与 artifacts 端点**

1. `handleSaveSchemeProject` 里删除这四行实参（入参不再透传，多余的 body 键自然被忽略，旧客户端仍 200）：

```js
    measurementConfig: await readMeasurementConfig(),
    imagePathById: imageExportPathByIdFromManifest(await readManifest()),
    svg: typeof payload.svg === "string" ? payload.svg : undefined,
    eFile: typeof payload.eFile === "string" ? payload.eFile : undefined
```

2. 删除 `handleSaveSchemeProjectArtifacts` 函数本体
3. 删除路由注册 `[routeKey("PUT", "/schemes/project/artifacts"), async ({ request, response }) => {...}]`（`server/server.mjs:6639`）

- [ ] **Step 6: 删两个旧渲染器**

1. 删除 `export function buildSvgFile(...)` 整块（原 4901-5103）
2. 删除 `function buildDeviceParameterFile(...)` 整块（原 4175-4225）
3. 保留 `export const eSectionColumns`（116，另有 7 处解析/校验用途）

- [ ] **Step 7: 删旧渲染器测试**

Run: `grep -n "buildSvgFile" server/server.test.mjs`
删除 import 中的 `buildSvgFile` 与所有调用它的 `test(...)` 块（11 个）。保留 `eSectionColumns` 的 import 与其 38 处用例。

- [ ] **Step 8: 跑测试确认通过**

Run: `pnpm vitest run server/schemeFilesJsonOnly.test.mjs server/server.test.mjs server/apiInternal.test.mjs`
Expected: PASS

- [ ] **Step 9: 全量回归 + 类型 + 名字审计**

Run: `pnpm vitest run && pnpm tsc --noEmit && pnpm audit:names`
Expected: 全绿，无新增错误（`audit:names` 专门查 `@ts-nocheck` 下的未定义名，删解构键后必跑）

- [ ] **Step 10: 提交**

```bash
git add server/server.mjs server/server.test.mjs server/schemeFilesJsonOnly.test.mjs
git commit -m "refactor(server): 删除旧 SVG/E 渲染器与 artifacts 端点，保存只落 json 并归档同名派生物"
```

---

### Task 5: 存量清理脚本与文档同步

**Files:**
- Create: `scripts/purge-derived-scheme-files.mjs`
- Modify: `package.json`（新增 `purge:derived` 脚本）
- Modify: `CLAUDE.md`、`server/CLAUDE.md`
- Modify: `docs/DESIGN_THIRD_PARTY_API.md`、`docs/WORKFLOW_THIRD_PARTY_API.md`、`docs/REQUIREMENTS_THIRD_PARTY_API.md`、`docs/superpowers/specs/2026-09-11-backend-export-e-svg-cim-design.md`

**Interfaces:**
- Produces: `node scripts/purge-derived-scheme-files.mjs [--apply] [<filesRoot>]` —— 默认 dry-run

- [ ] **Step 1: 写脚本**

创建 `scripts/purge-derived-scheme-files.mjs`：

```js
// 一次性迁移脚本：把 data/schemes/files 下的非 .json 文件归档进
// data/schemes/trash/<timestamp>/<原相对路径>。默认 dry-run，--apply 才实际移动。
import { mkdir, readdir, rename } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const rootArg = args.find((item) => !item.startsWith("--"));
const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const filesRoot = resolve(rootArg ?? join(repoRoot, "data", "schemes", "files"));
const trashRoot = resolve(join(dirname(filesRoot), "trash"));
const archiveId = new Date().toISOString().replace(/[:.]/gu, "-");

async function collect(dir) {
  const found = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return found;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      found.push(...(await collect(full)));
      continue;
    }
    if (entry.isFile() && !/\.json$/iu.test(entry.name)) {
      found.push(full);
    }
  }
  return found;
}

const targets = await collect(filesRoot);
if (targets.length === 0) {
  console.log(`无待归档文件：${filesRoot}`);
  process.exit(0);
}

for (const filePath of targets) {
  const target = join(trashRoot, archiveId, relative(filesRoot, filePath));
  console.log(`${apply ? "归档" : "将归档"} ${relative(filesRoot, filePath)} → ${relative(join(trashRoot, ".."), target)}`);
  if (apply) {
    await mkdir(dirname(target), { recursive: true });
    await rename(filePath, target);
  }
}
console.log(`${apply ? "已归档" : "待归档"} ${targets.length} 个文件${apply ? "" : "（加 --apply 执行）"}`);
```

- [ ] **Step 2: 加 npm 脚本**

`package.json` 的 `scripts` 中，在 `"audit:icons"` 之前加：

```json
    "purge:derived": "node scripts/purge-derived-scheme-files.mjs",
```

- [ ] **Step 3: 在临时目录验证脚本行为**

```bash
mkdir -p /tmp/purge-probe/files/A && touch /tmp/purge-probe/files/A/m.json /tmp/purge-probe/files/A/m.e /tmp/purge-probe/files/A/m.svg
node scripts/purge-derived-scheme-files.mjs /tmp/purge-probe/files
ls /tmp/purge-probe/files/A
```
Expected: 先打印「将归档 A/m.e」「将归档 A/m.svg」与「待归档 2 个文件」，`ls` 仍显示三个文件（dry-run 未动）。

再执行 `node scripts/purge-derived-scheme-files.mjs /tmp/purge-probe/files --apply`，`ls` 只剩 `m.json`，`ls /tmp/purge-probe/trash/*/A` 显示 `m.e m.svg`。

- [ ] **Step 4: 更新文档**

| 文件 | 改动 |
|---|---|
| `docs/DESIGN_THIRD_PARTY_API.md:200`、`337-339` | 「`buildSvgFile` 保留为兜底」「`buildDeviceParameterFile` 保留不动（M3-A）」两条决策作废，改写为：已删除；落盘 `.e` / `.svg` 一并移除，`files` 只含 `.json` |
| `docs/WORKFLOW_THIRD_PARTY_API.md:10,45` | 同上口径 |
| `docs/REQUIREMENTS_THIRD_PARTY_API.md:32` | 待删项去掉这两个函数，注明 `eSectionColumns` 保留 |
| `docs/superpowers/specs/2026-09-11-backend-export-e-svg-cim-design.md:218` | 兜底策略段改为「已移除」 |
| `CLAUDE.md`（`data/` 行） | 补：`schemes/files/**` 只含 `.json`，`.e` / `.svg` / CIM 全部按需实时生成 |
| `server/CLAUDE.md` | `svgExport.mjs` / `eFileExport.mjs` 条目补「方案 ZIP 复用同一装配」；`schemeArchive.mjs` 新条目；约定补「files 只落 json」 |

- [ ] **Step 5: 跑全量门槛**

Run: `pnpm vitest run && pnpm tsc --noEmit && pnpm audit:names`
Expected: 全绿

- [ ] **Step 6: 提交**

```bash
git add scripts/purge-derived-scheme-files.mjs package.json CLAUDE.md server/CLAUDE.md docs/
git commit -m "docs: 同步「files 只落 json」决策，新增存量派生文件归档脚本"
```

---

## 执行后的人工验收

按 spec 第 13 节逐条过，其中三条必须用真实数据：

1. `pnpm dev` 起服务 → 打开界面，方案树 4 个顶层方案（DOT / 主配微联合 / 四川 / 标准案例）完整
2. 对 `主配微联合/地区1/主网/厂站1` 依次导出 E / SVG / CIM，与改造前三个文件的字节对比（该类模型是现役渲染器产出，未设背景页，应逐字节一致）
3. `pnpm purge:derived --apply` 后 `find data/schemes/files -name '*.e' -o -name '*.svg'` 为空，且 `data/schemes/trash/<timestamp>/` 下能找到归档
4. 跨机迁移演练：按 spec 第 10.2 节清单拷到另一台机器（`schemes/files/**/*.json`、`schemes/model-index.json`、`schemes/global-lines.json`、`device-library/library.json`、`settings/{color-config,measurement-config}.json`、`images/`），起服务后方案树 4 个顶层方案完整、模型可打开、导出三格式正常
