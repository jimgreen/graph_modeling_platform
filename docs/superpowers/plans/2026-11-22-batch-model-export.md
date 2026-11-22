# 批量多范围模型导出 API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新增 `GET /webgrp/v1/models/export`，按空间、方案或模型范围返回 JSON/SVG/CIM/E 产物，支持编码、E 模板、按模型类型合并 E 以及关联模型扩展。

**Architecture:** 将范围解析与关联闭包放在独立的选择模块，将格式生成和 Base64 编码放在批量产物模块，HTTP handler 只负责 v1 参数校验、空间路径注入和响应信封。所有具体格式继续调用现有 `spaceArtifactExport`、`eFileExport`、`svgExport`、`cimExport` 和 `buildMultiModelEFileExport`，不复制格式生成逻辑。

**Tech Stack:** Node.js ESM `.mjs`、现有 v1 envelope/CORS/spaceStore、`iconv-lite`、Node 原生 TS 直载、Vitest。

**Spec:** `docs/superpowers/specs/2026-11-22-batch-model-export-design.md`

## Global Constraints

- Endpoint 固定为 `GET /webgrp/v1/models/export`。
- `scope` 为 `space|scheme|model`，默认 `space`；方案范围默认包含子方案。
- `formats` 支持 `json,svg,cim,e`，默认全部；外部 `cim` 映射现有 `cim-xml` 生成器。
- JSON envelope 始终 UTF-8；产物字节使用请求 `encoding`，默认 `utf-8`，并以 `contentBase64` 返回。
- `mergeE=true` 按 `modelType` 分组生成独立合并 E；合并 E 不重复出现在逐模型 artifacts 中。
- `includeAssociatedModels=true` 只在 scheme/model 范围扩展，沿用 `model_id` 和全局线路 source/target 关系，闭包限制在当前空间。
- E 模板只影响 E 输入；不匹配模板的模型保留在 models 中，E artifact 缺失并生成 warning。
- 任一读盘或产物生成失败，整个请求返回错误，不返回部分结果。
- 现有单模型导出、方案 ZIP、空间派生 ZIP、空间备份和 MCP 既有工具保持兼容。
- 不支持批量自定义模板文本 POST；自定义模板继续使用现有单模型 POST 接口。

---

### Task 1: 批量查询参数解析

**Files:**
- Create: `server/batchModelSelection.mjs`
- Test: `server/batchModelSelection.test.mjs`

**Interfaces:**
- Produces `parseBatchModelExportQuery(url)` returning:

```js
{
  scope: "space" | "scheme" | "model",
  schemePath?: string[],
  schemeId?: number,
  modelId?: number,
  name?: string,
  includeDescendants: boolean,
  formats: string[],
  encoding: "utf-8" | "gbk",
  templateName: string,
  mergeE: boolean,
  includeAssociatedModels: boolean,
  colorMode: "energy" | "voltage",
  strict: boolean
}
```
- Invalid input returns `{ error: { code: "bad-request", message } }`; the parser does not write HTTP responses.

- [ ] **Step 1: Write failing parser tests**

Cover these concrete cases in `server/batchModelSelection.test.mjs`:

Start the test file with this URL helper so every parser case exercises the same production query shape:

```js
const url = (search) => new URL(`http://127.0.0.1/webgrp/v1/models/export${search ? `?${search}` : ""}`);
```

```js
test("defaults to space and all formats", () => {
  expect(parseBatchModelExportQuery(url(""))).toEqual({
    scope: "space",
    includeDescendants: true,
    formats: ["json", "svg", "cim", "e"],
    encoding: "utf-8",
    templateName: "",
    mergeE: false,
    includeAssociatedModels: false,
    colorMode: "energy",
    strict: false
  });
});

test("deduplicates formats and parses booleans", () => {
  const result = parseBatchModelExportQuery(url(
    "scope=scheme&schemeId=3&formats=e,svg,cim,e&includeDescendants=0&mergeE=1&strict=true"
  ));
  expect(result.formats).toEqual(["svg", "cim", "e"]);
  expect(result.includeDescendants).toBe(false);
  expect(result.mergeE).toBe(true);
  expect(result.strict).toBe(true);
});

test("rejects selector combinations and format-specific parameters", () => {
  expect(parseBatchModelExportQuery(url("scope=space&schemeId=3")).error.code).toBe("bad-request");
  expect(parseBatchModelExportQuery(url("scope=model&modelId=12&name=x&schemeId=3")).error.code).toBe("bad-request");
  expect(parseBatchModelExportQuery(url("formats=json&template=配网实时库")).error.code).toBe("bad-request");
  expect(parseBatchModelExportQuery(url("formats=svg&mergeE=true")).error.code).toBe("bad-request");
});
```

- [ ] **Step 2: Run the parser tests and verify the expected failures**

Run: `pnpm vitest run server/batchModelSelection.test.mjs`

Expected: FAIL because `batchModelSelection.mjs` and `parseBatchModelExportQuery` do not exist.

- [ ] **Step 3: Implement strict query parsing**

Implement `url(search)` test helper locally and use `URLSearchParams`. Normalize comma-separated `formats` by trimming, removing empty values, preserving the fixed order `json,svg,cim,e`, and rejecting unknown values. Parse booleans only from `true|false|1|0`. Parse `schemeId` and `modelId` as positive safe integers. Enforce the scope-specific allowlists from the spec.

- [ ] **Step 4: Run parser tests and refactor only after green**

Run: `pnpm vitest run server/batchModelSelection.test.mjs`

Expected: all parser tests pass.

- [ ] **Step 5: Commit the parser task**

```bash
git add server/batchModelSelection.mjs server/batchModelSelection.test.mjs
git commit -m "feat(api): parse batch model export scope"
```

### Task 2: Model enumeration and association closure

**Files:**
- Modify: `server/batchModelSelection.mjs`
- Test: `server/batchModelSelection.test.mjs`
- Reuse: `server/spaceArtifactExport.mjs`, `server/schemeArchive.mjs`, `server/server.mjs`, `src/model.ts`, `src/model-routing.ts`, `server/globalLineRegistry.mjs`

**Interfaces:**
- Produces `collectBatchModels({ paths, query })` returning `{ selectedModels, allModels, selectedBy }`.
- Produces `expandAssociatedModels({ selectedModels, allModels, globalLineRecords, includeAssociatedModels })` returning `{ models, warnings, expandedModelKeys }`; stable keys use `idx:<modelType>:<idx>` when idx is available and `path:<schemePath>/<name>` otherwise.
- A model entry has `{ id, name, schemePath, project, relativePath, schemeId?, modelType }`; `id` is numeric idx when present and otherwise a stable relative-path key.

- [ ] **Step 1: Add failing selection tests**

Use temporary `schemeFiles` fixtures with nested schemes and models. Cover:

Build these fixture values in the test file before the cases:

```js
const stationModel = {
  id: 12,
  name: "厂站一",
  schemePath: ["默认方案"],
  modelType: "厂站",
  project: { idx: 12, modelType: "厂站", nodes: [{ id: "source", kind: "ac-feeder-source", params: { model_id: "15" } }], edges: [] }
};
const feederModel = {
  id: 15,
  name: "馈线一",
  schemePath: ["默认方案", "子方案"],
  modelType: "馈线",
  project: { idx: 15, modelType: "馈线", nodes: [], edges: [] }
};
const stationModelWithMissingTarget = {
  ...stationModel,
  project: { ...stationModel.project, nodes: [{ id: "source", kind: "ac-feeder-source", params: { model_id: "999999" } }] }
};
const lineRecord = {
  id: "line-1",
  endpointSlots: {
    source: { projectIdx: 12, projectName: "厂站一" },
    target: { projectIdx: 15, projectName: "馈线一" }
  }
};
```

```js
test("space scope returns all saved models in deterministic path order", async () => {
  const result = await collectBatchModels({ paths, query: { scope: "space", includeDescendants: true } });
  expect(result.selectedModels.map((model) => `${model.schemePath.join("/")}/${model.name}`)).toEqual([
    "默认方案/厂站一",
    "默认方案/子方案/馈线一"
  ]);
});

test("scheme scope includes descendants by default and excludes them when false", async () => {
  const withChildren = await collectBatchModels({ paths, query: { scope: "scheme", schemePath: ["默认方案"], includeDescendants: true } });
  const directOnly = await collectBatchModels({ paths, query: { scope: "scheme", schemePath: ["默认方案"], includeDescendants: false } });
  expect(withChildren.selectedModels).toHaveLength(2);
  expect(directOnly.selectedModels).toHaveLength(1);
});

test("model scope resolves numeric idx and schemePath plus name", async () => {
  const byIdx = await collectBatchModels({ paths, query: { scope: "model", modelId: 12 } });
  const byPath = await collectBatchModels({ paths, query: { scope: "model", schemePath: ["默认方案"], name: "厂站一" } });
  expect(byIdx.selectedModels[0].id).toBe(12);
  expect(byPath.selectedModels[0].name).toBe("厂站一");
});

test("association closure follows model_id references in both directions", () => {
  const result = expandAssociatedModels({ selectedModels: [stationModel], allModels: [stationModel, feederModel], globalLineRecords: [], includeAssociatedModels: true });
  expect(result.models.map((model) => model.id)).toEqual([12, 15]);
  expect(result.expandedModelKeys).toContain("idx:馈线:15");
});

test("association closure follows global-line source/target references and stops cycles", () => {
  const result = expandAssociatedModels({ selectedModels: [stationModel], allModels: [stationModel, feederModel], globalLineRecords: [lineRecord], includeAssociatedModels: true });
  expect(result.models).toHaveLength(2);
  expect(result.warnings).toEqual([]);
});

test("missing association target creates a warning without adding a fake model", () => {
  const result = expandAssociatedModels({ selectedModels: [stationModelWithMissingTarget], allModels: [stationModelWithMissingTarget], globalLineRecords: [], includeAssociatedModels: true });
  expect(result.models).toHaveLength(1);
  expect(result.warnings[0]).toMatchObject({ code: "associated-model-not-found" });
});
```

The fixtures must include a station source node with `params.model_id`, a reverse reference from the target model, and a global-line record whose two endpoint references point to models in the same temporary space.

- [ ] **Step 2: Run selection tests to verify red**

Run: `pnpm vitest run server/batchModelSelection.test.mjs`

Expected: the new collection and closure tests fail while the parser tests remain green.

- [ ] **Step 3: Implement reusable model indexing**

Extract or reuse the model enumeration from `listSpaceArtifactModels` without changing that function’s existing callers. Build an index by `(modelType, numeric idx)` and a canonical `schemePath/name` key. Resolve scheme IDs with `resolveSchemePathForSelector` and read records with `readSchemeProjectRecord`, always passing the provided `paths`.

- [ ] **Step 4: Implement association closure**

Build forward links from model association nodes and global-line records, plus reverse indexes so a selected child can include models that reference it. Use a queue and a visited stable-key set. Add structured warnings with `code`, `sourceModelId`, `sourceModelName`, `targetModelId`, and `message` for unresolved or type-mismatched targets. Sort the final list by normalized scheme path, model name, and numeric idx.

- [ ] **Step 5: Run the full selection test file**

Run: `pnpm vitest run server/batchModelSelection.test.mjs`

Expected: parser, scope, ordering, association, cycle, and warning tests all pass.

- [ ] **Step 6: Commit the selection task**

```bash
git add server/batchModelSelection.mjs server/batchModelSelection.test.mjs
git commit -m "feat(api): collect batch model scope and associations"
```

### Task 3: Artifact generation and Base64 response objects

**Files:**
- Create: `server/batchModelArtifacts.mjs`
- Test: `server/batchModelArtifacts.test.mjs`
- Modify: `server/eFileExport.mjs`, `server/cimExport.mjs`, `server/xmlEncoding.mjs`

**Interfaces:**
- Produces `buildBatchModelArtifacts({ models, formats, encoding, templateName, colorMode, strict, mergeE, paths, globalLineRecords })` returning `{ modelArtifacts, mergedE, warnings }`.
- Artifact shape:

```js
{
  format: "json" | "svg" | "cim" | "e",
  encoding: "utf-8" | "gbk",
  mimeType: string,
  filename: string,
  contentBase64: string
}
```

- [ ] **Step 1: Write failing artifact tests**

Cover JSON/SVG/CIM/E byte encoding, filename/MIME metadata, E template filtering, per-model E, and grouped merged E:

The test file must import `iconv-lite` and define `stationModel`, `feederModel`, `unreadableModel`, `paths`, and `globalLineRecords` using the same temporary model fixture shape from Task 2. `unreadableModel` must point to a model name whose `readSchemeProjectRecord` mock rejects with an `EACCES` error.

```js
test("JSON artifact decodes to the saved project with requested encoding", async () => {
  const result = await buildBatchModelArtifacts({ models: [stationModel], formats: ["json"], encoding: "gbk", paths });
  const text = iconv.decode(Buffer.from(result.modelArtifacts[0][0].contentBase64, "base64"), "gbk");
  expect(JSON.parse(text).name).toBe("厂站一");
});

test("SVG and CIM artifacts include the matching XML declaration and bytes", async () => {
  const result = await buildBatchModelArtifacts({ models: [stationModel], formats: ["svg", "cim"], encoding: "gbk", colorMode: "voltage", strict: false, paths });
  for (const artifact of result.modelArtifacts[0]) {
    const text = iconv.decode(Buffer.from(artifact.contentBase64, "base64"), "gbk");
    expect(text).toContain('encoding="GBK"');
    expect(artifact.encoding).toBe("gbk");
  }
});

test("per-model E reuses buildEFilesForSavedModels", async () => {
  const result = await buildBatchModelArtifacts({ models: [stationModel], formats: ["e"], encoding: "utf-8", mergeE: false, paths, globalLineRecords: [] });
  expect(result.modelArtifacts[0][0]).toMatchObject({ format: "e", mimeType: "text/plain", encoding: "utf-8" });
});

test("mergeE groups inputs by modelType and returns one merged artifact per group", async () => {
  const result = await buildBatchModelArtifacts({ models: [stationModel, feederModel], formats: ["e"], encoding: "utf-8", mergeE: true, paths, globalLineRecords: [] });
  expect(result.mergedE.map((artifact) => artifact.modelType)).toEqual(["厂站", "馈线"]);
});

test("template-incompatible models remain in models but receive an E warning", async () => {
  const result = await buildBatchModelArtifacts({ models: [stationModel, feederModel], formats: ["json", "e"], encoding: "utf-8", templateName: "国网E格式", mergeE: false, paths, globalLineRecords: [] });
  expect(result.modelArtifacts).toHaveLength(2);
  expect(result.warnings.some((warning) => warning.code === "e-template-model-type-skipped")).toBe(true);
});

test("a generator failure rejects the entire batch", async () => {
  await expect(buildBatchModelArtifacts({ models: [unreadableModel], formats: ["svg"], encoding: "utf-8", paths })).rejects.toThrow();
});
```

- [ ] **Step 2: Run artifact tests to verify red**

Run: `pnpm vitest run server/batchModelArtifacts.test.mjs`

Expected: FAIL because the artifact builder does not exist.

- [ ] **Step 3: Implement encoding and format adapters**

Use `JSON.stringify(project)` for JSON, `renderSavedModelSvg` for SVG, `buildCimForSavedModel` for CIM, and `buildEFilesForSavedModels` for E. Encode text with `encodeTextBytes`; call `withXmlEncodingDeclaration` before encoding SVG/CIM. Use existing filename sanitization or extract one shared helper from `eFileExport.mjs` rather than creating a second incompatible rule.

- [ ] **Step 4: Implement E filtering and grouping**

Filter only E inputs with `eFileTemplateAllowsModelType`. For `mergeE=false`, map each eligible model to its generated file. For `mergeE=true`, group eligible models by `modelType`, call `buildEFilesForSavedModels` once per group, and put the merged text in `mergedE`. Pass the same `globalLineRecords` and `paths` into every call. Add a warning for each model excluded by the template.

- [ ] **Step 5: Run artifact tests and the existing export tests**

Run: `pnpm vitest run server/batchModelArtifacts.test.mjs server/eFileExport.test.mjs server/svgExport.test.mjs server/cimExport.test.mjs server/exportRobustness.test.mjs`

Expected: all new and existing export tests pass.

- [ ] **Step 6: Commit the artifact task**

```bash
git add server/batchModelArtifacts.mjs server/batchModelArtifacts.test.mjs server/eFileExport.mjs server/cimExport.mjs server/xmlEncoding.mjs
git commit -m "feat(api): build encoded batch model artifacts"
```

### Task 4: HTTP route and end-to-end contract

**Files:**
- Create: `server/apiV1BatchModelExport.mjs`
- Test: `server/apiV1BatchModelExport.test.mjs`
- Modify: `server/server.mjs`, `server/routeCoverage.test.mjs`

**Interfaces:**
- Route: `GET /webgrp/v1/models/export`, wrapped with `withSpacePaths`.
- Handler calls `parseBatchModelExportQuery`, `collectBatchModels`, `expandAssociatedModels`, and `buildBatchModelArtifacts`, then writes `{ok:true,data}` with `sendV1JsonNoStore`.

- [ ] **Step 1: Write failing HTTP tests**

Create temporary scheme fixtures and assert:

The HTTP test setup starts `createImageServer({ port: 0, host: "127.0.0.1" })`, creates the default space through `POST /webgrp/spaces/initialize`, writes the station and feeder JSON fixtures from Task 2 under the temporary `schemeFiles`, and closes the server in `afterAll`. Use `apiPath()` to construct every URL.

```js
test("scope=space returns all requested formats as Base64 artifacts", async () => {
  const response = await fetch(`${baseUrl}${apiPath("/v1/models/export?scope=space&formats=json,svg")}`);
  const json = await response.json();
  expect(response.status).toBe(200);
  expect(json.data.models[0].artifacts.map((artifact) => artifact.format)).toEqual(["json", "svg"]);
  expect(json.data.models[0].artifacts.every((artifact) => typeof artifact.contentBase64 === "string")).toBe(true);
});

test("scope=scheme includes descendants and returns selectedBy metadata", async () => {
  const response = await fetch(`${baseUrl}${apiPath("/v1/models/export?scope=scheme&schemePath=%5B%22%E9%BB%98%E8%AE%A4%E6%96%B9%E6%A1%88%22%5D&formats=json")}`);
  const json = await response.json();
  expect(response.status).toBe(200);
  expect(json.data.selectedBy.schemePath).toEqual(["默认方案"]);
  expect(json.data.includeDescendants).toBe(true);
});

test("scope=model resolves modelId and rejects conflicting selectors", async () => {
  const ok = await fetch(`${baseUrl}${apiPath("/v1/models/export?scope=model&modelId=12&formats=json")}`);
  const bad = await fetch(`${baseUrl}${apiPath("/v1/models/export?scope=model&modelId=12&name=x&schemeId=3&formats=json")}`);
  expect(ok.status).toBe(200);
  expect(bad.status).toBe(400);
});

test("mergeE returns separate merged artifacts for station and feeder groups", async () => {
  const response = await fetch(`${baseUrl}${apiPath("/v1/models/export?scope=space&formats=e&mergeE=true")}`);
  const json = await response.json();
  expect(response.status).toBe(200);
  expect(json.data.mergedE.every((artifact) => artifact.format === "e")).toBe(true);
  expect(new Set(json.data.mergedE.map((artifact) => artifact.modelType)).size).toBe(json.data.mergedE.length);
});

test("includeAssociatedModels expands model_id and global-line references", async () => {
  const response = await fetch(`${baseUrl}${apiPath("/v1/models/export?scope=model&modelId=12&formats=json&includeAssociatedModels=true")}`);
  const json = await response.json();
  expect(response.status).toBe(200);
  expect(json.data.expandedModelCount).toBeGreaterThanOrEqual(0);
});

test("invalid combinations return 400 and missing targets return 404", async () => {
  const invalid = await fetch(`${baseUrl}${apiPath("/v1/models/export?scope=space&schemeId=1&formats=json")}`);
  const missing = await fetch(`${baseUrl}${apiPath("/v1/models/export?scope=model&modelId=999999&formats=json")}`);
  expect(invalid.status).toBe(400);
  expect(missing.status).toBe(404);
});
```

- [ ] **Step 2: Run the new HTTP test and verify red**

Run: `pnpm vitest run server/apiV1BatchModelExport.test.mjs`

Expected: FAIL because the route is not registered.

- [ ] **Step 3: Register the route**

Import `v1BatchModelExportRoutes` in the `/v1/` dispatch section of `server/server.mjs` and include it beside the existing model/runtime export routes. Do not change old route registrations.

- [ ] **Step 4: Implement the handler envelope and error mapping**

Map parser errors to `400`, missing scope targets to `404`, and generator/read failures to `500`. Ensure no response is written until all artifacts and merged E results are complete.

- [ ] **Step 5: Run HTTP and route coverage tests**

Run: `pnpm vitest run server/apiV1BatchModelExport.test.mjs server/routeCoverage.test.mjs`

Expected: all tests pass and the new route is documented as registered by the route coverage guard.

- [ ] **Step 6: Commit the HTTP task**

```bash
git add server/apiV1BatchModelExport.mjs server/apiV1BatchModelExport.test.mjs server/server.mjs server/routeCoverage.test.mjs
git commit -m "feat(api): add batch model export endpoint"
```

### Task 5: Swagger, documentation, and compatibility verification

**Files:**
- Modify: `server/swaggerPage.mjs`, `server/swaggerPage.test.mjs`, `server/swigger.examples.test.mjs`
- Modify: `README.md`, `docs/MODEL_EXPORT_API.md`, `docs/ARCHITECTURE.md`, `docs/MCP-SWIGGER-GUIDE.md`

- [ ] **Step 1: Add Swagger metadata and examples**

Document one example for each scope, one example for `formats=json,svg,cim,e`, one GBK example, one template example, one `mergeE=true` example, and one associated-model example. Keep the example payloads read-only and based on the existing temporary fixture strategy.

- [ ] **Step 2: Update Swagger tests**

Assert the new endpoint has the `scope`, `formats`, `encoding`, `template`, `mergeE`, `includeAssociatedModels`, `colorMode`, and `strict` query fields, and update endpoint/example counts.

- [ ] **Step 3: Update `/swigger` expectations and docs**

Make `swigger.examples.test.mjs` decode and validate the JSON envelope, Base64 fields, `models`, `mergedE`, and warning arrays. Document the Base64 decoding contract and selector examples in the API and MCP guides. Do not add a new MCP tool in this task; existing MCP tools remain unchanged.

- [ ] **Step 4: Verify deleted or unchanged routes**

Assert old endpoints continue to work, and the new endpoint does not alter `/v1/schemes/model/export`, `/v1/spaces/export-artifacts`, `/v1/schemes/export`, or `/webgrp/spaces/export` response contracts.

- [ ] **Step 5: Run documentation and compatibility tests**

Run: `pnpm vitest run server/swaggerPage.test.mjs server/swigger.examples.test.mjs server/routeCoverage.test.mjs server/apiV1Schemes.test.mjs server/apiV1Runtime.test.mjs server/mcp/mcpTools.test.mjs`

Expected: all tests pass.

- [ ] **Step 6: Commit docs and compatibility task**

```bash
git add server/swaggerPage.mjs server/swaggerPage.test.mjs server/swigger.examples.test.mjs README.md docs/MODEL_EXPORT_API.md docs/ARCHITECTURE.md docs/MCP-SWIGGER-GUIDE.md
git commit -m "docs(api): document batch model export"
```

### Task 6: Final verification

**Files:**
- No additional production files unless a verification failure identifies a concrete defect.

- [ ] **Step 1: Run changed-file syntax and whitespace checks**

Run each command separately:

```bash
node --check server/apiV1BatchModelExport.mjs
node --check server/batchModelSelection.mjs
node --check server/batchModelArtifacts.mjs
git diff --check
```

Expected: all commands exit successfully.

- [ ] **Step 2: Run the focused batch/export suite**

Run: `pnpm vitest run server/batchModelSelection.test.mjs server/batchModelArtifacts.test.mjs server/apiV1BatchModelExport.test.mjs server/apiV1Library.http.test.mjs server/apiV1Schemes.test.mjs server/apiV1Runtime.test.mjs server/eFileExport.test.mjs server/svgExport.test.mjs server/cimExport.test.mjs server/exportRobustness.test.mjs server/routeCoverage.test.mjs server/swaggerPage.test.mjs server/swigger.examples.test.mjs`

Expected: all tests pass.

- [ ] **Step 3: Run TypeScript checking**

Run: `pnpm tsc --noEmit`

Expected: no new errors attributable to the batch export changes.

- [ ] **Step 4: Run the full Vitest suite once**

Run: `pnpm vitest run`

Expected: the repository suite passes; any pre-existing unrelated failure is recorded with its file and error.

- [ ] **Step 5: Record final verification**

Record the focused and full-suite results in the task report. Do not stage unrelated workspace changes during this step.
