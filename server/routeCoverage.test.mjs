// 端点文档覆盖守卫：server 实际注册的路由 vs /swigger 文档化的端点。
//
// 为什么值得守：路由分散在三张表里（server.mjs 的 routeKey、apiV1*.mjs 的
// {method, pattern: apiPattern(...)}、server.mjs 的 dynamicRouteHandlers 的
// dynAssetPattern(...))。新增端点时若忘了同步 swaggerPage.mjs，页面就少一条，
// 而 swigger.examples.test.mjs 只遍历**已文档化**的端点 —— 漏掉的那条永远不会被
// 测到，也就永远不会有人发现。本守卫让这种漂移变成一条失败。
//
// 已知且刻意不文档化的：/webgrp/exports/native/* —— 会弹 Windows「另存为」对话框
// 或真的拉起本机默认程序，swigger.examples.test.mjs 逐条真实调用时会挂住/污染测试。
// 见 swaggerPage.mjs 顶部注释。
import { describe, expect, test } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SWIGGER_ENDPOINTS } from "./swaggerPage.mjs";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const PREFIX = "/webgrp";

/** 会弹本机对话框 / 有外部副作用，刻意不进 swagger 的端点。 */
const INTENTIONALLY_UNDOCUMENTED = new Set([
  "POST /webgrp/exports/native/select-file",
  "POST /webgrp/exports/native/write-text",
  "POST /webgrp/exports/native/open-file"
]);

function collectRegisteredRoutes() {
  const registered = new Set();
  const serverSrc = readFileSync(path.join(repoRoot, "server", "server.mjs"), "utf8");

  // ① routeKey("GET", "/images")
  for (const m of serverSrc.matchAll(/routeKey\(\s*"(GET|POST|PUT|DELETE)"\s*,\s*"([^"]+)"/g)) {
    registered.add(`${m[1]} ${PREFIX}${m[2]}`);
  }
  // ② dynamicRouteHandlers: dynAssetPattern("/images") —— 参数段固定 ([^/]+)
  for (const m of serverSrc.matchAll(
    /method:\s*"(GET|POST|PUT|DELETE)"\s*,\s*pattern:\s*dynAssetPattern\(\s*"([^"]+)"\s*\)/g
  )) {
    registered.add(`${m[1]} ${PREFIX}${m[2]}/{id}`);
  }
  // ③ apiV1*.mjs: { method: "GET", pattern: apiPattern("/v1/schemes", ...) }
  for (const name of readdirSync(path.join(repoRoot, "server"))) {
    if (!/^apiV1.*\.mjs$/.test(name) || name.endsWith(".test.mjs")) continue;
    const src = readFileSync(path.join(repoRoot, "server", name), "utf8");
    for (const m of src.matchAll(
      /method:\s*"(GET|POST|PUT|DELETE)"\s*,\s*pattern:\s*apiPattern\(\s*"([^"]+)"/g
    )) {
      registered.add(`${m[1]} ${PREFIX}${m[2]}`);
    }
  }
  return registered;
}

/** swagger 路径里的 {param} 段按通配比对。 */
function segmentMatches(docPath, registeredPath) {
  const d = docPath.split("/");
  const r = registeredPath.split("/");
  return d.length === r.length && d.every((seg, i) => seg.startsWith("{") || seg === r[i]);
}

const registered = collectRegisteredRoutes();
const documented = new Set(SWIGGER_ENDPOINTS.map((e) => `${e.method} ${e.path}`));

describe("端点文档覆盖", () => {
  test("已注册的端点都已进 /swigger（或在刻意排除清单里）", () => {
    const missing = [...registered]
      .filter((route) => !documented.has(route) && ![...documented].some((d) => segmentMatches(d, route)))
      .filter((route) => !INTENTIONALLY_UNDOCUMENTED.has(route))
      // dynamicRouteHandlers 的参数名固定记作 {id}，swagger 可能用 {folderId} 等其它名，
      // 上面 segmentMatches 已按段通配处理，这里无需再豁免。
      .sort();
    expect(
      missing,
      `这些端点已注册但 /swigger 里没有：\n${missing.join("\n")}\n` +
        `新增端点请同步 swaggerPage.mjs 的 ENDPOINTS（含示例），` +
        `否则 swigger.examples.test.mjs 覆盖不到它。`
    ).toEqual([]);
  });

  test("swagger 里没有「已不存在的幽灵端点」", () => {
    const phantom = [...documented]
      .filter((doc) => !registered.has(doc) && ![...registered].some((r) => segmentMatches(doc, r)))
      .sort();
    expect(phantom, `swagger 文档化了未注册的端点：\n${phantom.join("\n")}`).toEqual([]);
  });

  test("刻意排除清单里的端点确实存在（防止清单过期变成免死金牌）", () => {
    for (const route of INTENTIONALLY_UNDOCUMENTED) {
      expect(
        [...registered].some((r) => segmentMatches(route, r) || r === route),
        `${route} 已不在路由表里，请从 INTENTIONALLY_UNDOCUMENTED 移除`
      ).toBe(true);
    }
  });
});
