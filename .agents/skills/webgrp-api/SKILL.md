---
name: webgrp-api
description: Use when writing, adding, reviewing, or validating frontend HTTP API clients or backend routes in graph_modeling_platform, especially space, scheme, model, image, configuration, global-line, or /webgrp API work; also use when asked which APIs are implemented, missing, partial, or nonconforming.
compatibility: Requires the repository-local docs/FRONTEND-INTERNAL-API-CONTRACT.md and standard rg/PowerShell tooling.
---

# webgrp-api

## Purpose

Use the project API contract as the source of observable behavior. Keep frontend callers, backend routes, request encoding, response shapes, error semantics, space context, caching, and binary content types aligned so an independent implementation can replace the current server without changing the page. `check` is runtime-first: send real requests before reading source code.

## Invocation

Treat these as explicit subcommands:

```text
/webgrp-api create <API or feature request>
/webgrp-api check [scope or path] [--base-url <url>] [--space <id>]
```

Natural-language requests such as “编写前端 API”“新增接口”“校验接口”“检查哪些 API 已实现”“对照接口规范生成报告” trigger the same skill. If no scope is supplied to `check`, inspect the whole repository surface relevant to the contract.

Runtime options are passed to `scripts/check-api.mjs`:

```text
--base-url <url>       backend URL, default http://127.0.0.1:5174
--space <id>           gmp_space value, default default
--frontend-base <path> static frontend base, default /app
--timeout-ms <ms>      request timeout
--report <path>        write the runtime JSON report
```

## Contract source

Read this file before doing API work:

```text
docs/FRONTEND-INTERNAL-API-CONTRACT.md
```

Use the contract for URL, method, query encoding, headers, body schema, response schema, status codes, error shapes, space selection, caching, size limits, and binary response behavior. Use the current source to verify whether the contract is implemented; never treat the contract alone as proof that an endpoint exists.

Use the repository guidance in `AGENTS.md` for scope, search, testing, data, and change rules. Keep the existing `src/config.ts` `apiPath()` boundary and current internal-vs-v1 response distinction unless the user explicitly changes the contract.

## Core rules

1. **Separate the three facts.** A contract entry can be implemented by a backend route, called by a frontend helper, and still be nonconforming. Report route existence, frontend usage, runtime result, and contract compliance independently.
2. **Use observable evidence.** A string in a comment or an unused helper is not an implemented API. Confirm route registration, reachable frontend call sites, request construction, and response handling.
3. **Preserve internal API semantics.** Internal `/webgrp/*` endpoints generally return bare JSON; do not wrap them in the `/v1` `{ok:true,data}` envelope unless the contract says so.
4. **Treat space selection as part of the API.** Check `gmp_space`, `X-Space`, `?space=`, URL encoding, and fallback behavior. A correct path with the wrong space is a contract failure.
5. **Treat encoding as part of the API.** `schemePath` is JSON serialized and URL encoded once. Folder IDs, image IDs, and other path segments are URL encoded.
6. **Runtime before source.** Run the probe script first. Only failed, skipped, timed-out, or structurally invalid requests trigger static source audit and root-cause analysis.
7. **Keep probes safe.** Read endpoints use real data. Write endpoints use invalid or missing payloads that should be rejected before mutation; never create, rename, delete, upload, import, or overwrite data unless the user explicitly authorizes a mutation probe.

## `create` subcommand

Use `create` when adding a frontend API caller, adding a backend route used by the frontend, or completing an existing contract entry.

### Steps

1. Read the contract section for the requested API.
2. Locate the nearest existing wrapper and route pattern with `rg`; reuse `apiPath`, `fetchBackendJson`, `backendJsonRequest`, and existing error handling where applicable.
3. Decide the ownership boundary:
   - frontend-only caller: add or update the typed/helper function and its UI call site;
   - backend route: add handler, register the route, and update the frontend caller;
   - shared contract change: update the contract document and all affected callers together.
4. Implement the smallest change that preserves the documented URL, method, query/body shape, response shape, status codes, and space behavior.
5. Check direct callers and route registration with `rg`. Inspect the response parser, not only the request line.
6. Run only the verification appropriate to the requested scope and repository rules. Do not report an API as complete until the implementation evidence and verification evidence are both stated.

### `create` completion report

Use this structure in the response:

```markdown
## API 创建结果

| API | 前端调用点 | 后端路由 | 状态 |
|---|---|---|---|
| `GET /webgrp/...` | `src/...:line` | `server/...:line` | 已实现 / 部分实现 |

### 请求契约
- URL:
- Request:

### 响应契约
- Response:
- 错误:

### 验证
- 源码证据:
- 已运行命令:
- 未验证项:
```

## `check` subcommand

Use `check` as a runtime-first contract audit. It remains read-only with respect to project data: the bundled script uses safe invalid write probes and does not perform successful mutations. Do not repair findings unless the user explicitly asks.

### Phase 1: real request probe

Run:

```powershell
node .agents/skills/webgrp-api/scripts/check-api.mjs `
  --base-url http://127.0.0.1:5174 `
  --space default `
  --report tmp/webgrp-api-runtime.json
```

The script checks real status codes, response structure, content types, dynamic scheme/model/image fixtures, space cookie context, and safe error responses for write routes. It reports `passed`, `failed`, and `skipped` results plus `staticAuditRequired`.

If the service is unavailable, do not turn connection failure into an implementation finding. Mark runtime verification unavailable and continue to the static phase for the affected entries.

### Phase 2: targeted static audit

Only for runtime failures, skips, timeouts, invalid response shapes, or unverified dynamic fixtures:

1. Read the relevant contract section.
2. Locate the frontend caller and backend route.
3. Compare request construction, response parsing, errors, space context, caching, and content types.
4. Trace the failing path to a likely root cause.
5. Do not spend static-audit steps on runtime-passing endpoints unless a cross-cutting contract issue affects them.

### Inventory after runtime probing

Build an API inventory from both sides:

- **Contract:** headings, URL examples, methods, request/response sections in `docs/FRONTEND-INTERNAL-API-CONTRACT.md`;
- **Frontend:** `fetch(`, `new WebSocket(`, `apiPath(`, `fetchBackend*`, `saveBackend*`, `deleteBackend*`, `uploadBackend*`, and helper call sites under `src/` and any requested example frontend;
- **Backend:** `server.mjs` exact route registrations, `apiV1*.mjs` route tables when in scope, dynamic asset routes, and handler functions;
- **Runtime evidence:** JSON output from `scripts/check-api.mjs`, including status, content type, response shape, latency, and failure reason.
- **Tests and additional evidence:** focused tests, browser traces, or user-provided request samples when available.

Prefer one combined `rg` pass for only the endpoints that failed or were skipped at runtime, then read the files needed to confirm request and response behavior. Do not count comments, tests-only mocks, dead helpers, static assets, or unrelated v1 endpoints as frontend API implementations without labeling them separately.

### Classification

Classify every contract entry in the selected scope:

| Status | Meaning |
|---|---|
| **已实现且符合** | Backend route exists, frontend caller reaches it, and observable behavior matches the contract |
| **已实现但不符合** | Route and/or caller exist, but URL, method, query/body, headers, response, errors, space, cache, or content type differs |
| **部分实现** | Only one side exists, one method/variant is missing, or the path is reachable but the response parser/handler is incomplete |
| **未实现** | No reachable route or frontend implementation was found |
| **未在当前范围验证** | Evidence is insufficient; do not downgrade to missing without a source or runtime check |

Runtime result mapping:

- runtime `passed` plus matching contract evidence: **已实现且符合**;
- runtime `failed`, `timeout`, or invalid response shape: perform static audit before assigning a root cause;
- runtime `skipped` because no fixture exists: **未在当前范围验证**, then inspect route and caller statically;
- service unavailable: report runtime verification unavailable separately; do not call the endpoint missing without source evidence.

### Compliance dimensions

For each implemented or partial entry, check:

- URL prefix and path parameter encoding;
- HTTP method and query parameter names;
- `schemePath` JSON-plus-single-URL-encoding rule;
- JSON `Content-Type` and raw ZIP/image request bodies;
- `gmp_space`, `X-Space`, `?space=`, and fallback behavior;
- success status and exact response top-level shape;
- error status and `{error:string}` / `{error:{code,message}}` compatibility;
- ETag, `Cache-Control`, `304`, and optional gzip behavior for cacheable GETs;
- binary `Content-Type`, `Content-Disposition`, and no-store behavior;
- request-size limits and normalization/migration fields;
- frontend response parsing and user-visible error handling.

### `check` report format

Always produce a Chinese report with findings first:

```markdown
# webgrp-api 检查报告

## 范围
- Contract:
- Source scope:
- Runtime/test evidence:

## 汇总
- 已实现且符合: N
- 已实现但不符合: N
- 部分实现: N
- 未实现: N
- 未在当前范围验证: N

## API 矩阵

| API | Contract | Frontend caller | Backend route | Compliance | Evidence |
|---|---|---|---|---|---|
| `GET /webgrp/...` | 有/无 | 有/无 | 有/无 | 符合/不符合/部分/未验证 | `file:line` |

## Findings

### [P0/P1/P2/P3] `METHOD /webgrp/...`
- 问题:
- 规范要求:
- 当前实现:
- 影响:
- 证据:
- 修复建议:

## 未实现接口
列出契约中存在但当前范围未找到实现的接口，并说明是缺前端调用、缺后端路由，还是两者都缺。

## 验证边界
明确哪些结论来自源码，哪些来自测试、浏览器或运行时；没有运行的验证不要写成通过。
```

Order findings by impact: contract-breaking response/request behavior first, missing route or frontend caller second, then cache/error/documentation gaps. Include exact file and line evidence whenever available.

## Common mistakes

- Counting `apiPath()` string construction as a complete feature without finding a caller.
- Calling a bare internal response a v1 envelope, or accepting only one of the two internal error shapes.
- Treating `schemePath` as a raw slash-separated string instead of encoded JSON.
- Checking only `GET` while missing the matching `PUT`, `DELETE`, upload, import, or ZIP path.
- Treating a summary model with `__summaryOnly` as a complete model.
- Reporting an endpoint as space-safe while omitting Cookie/header/query context.
- Treating a static `/icon-library/*` resource as a `/webgrp` API route.
- Calling an API “implemented” because a route exists even though the frontend never invokes it.
- Reading the whole source tree before running the runtime probe; static analysis is the second phase for failed or unverified requests.
- Sending valid write payloads during a default check and mutating a real space, model, image, or configuration.
- Silently fixing code during `check`; keep the audit read-only unless repair was requested.

## Example

User: `检查当前前端的空间、方案和图片 API。`

Expected behavior: read the contract, inventory `src/spaceClient.ts`, persistence/image wrappers, and corresponding `server.mjs` routes; classify every method/variant; report missing or nonconforming request/response/error/space behavior with file-line evidence; do not claim runtime verification unless it ran.
