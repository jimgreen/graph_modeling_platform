// 前后端路径契约守卫：前端 `apiPath("/x")` 引用的路径必须真实存在于后端路由表。
//
// 为什么值得守：前缀（`apiPrefix`，默认 /webgrp，可被 GRAPH_MODEL_API_PREFIX 改写）
// 在前端是 `apiPath()` 拼的、在后端是 `routeKey()` 拼的，两边各写一遍前缀逻辑。
// 任何一侧改了路径而另一侧没跟上，前端只会得到 404 —— 且因为大量请求失败发生在
// 运行时交互里，静态类型完全看不见（apiPath 的参数是普通 string）。
//
// 已知豁免：/ws 是 WebSocket 端点，走 server.on("upgrade") 挂载（见 server.mjs 的
// attachRuntimeWebSocket），本来就不在 HTTP 路由表里。
import { describe, expect, test } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));

/** 不在 HTTP 路由表里的端点（WebSocket 由 upgrade 事件处理）。 */
const OUTSIDE_ROUTE_TABLE = new Set(["/ws"]);

function collectRegisteredPaths() {
  const serverSrc = readFileSync(path.join(repoRoot, "server", "server.mjs"), "utf8");
  const registered = new Set();
  // routeKey("GET", "/images")
  for (const m of serverSrc.matchAll(/routeKey\(\s*"(?:GET|POST|PUT|DELETE)"\s*,\s*"([^"]+)"/g)) {
    registered.add(m[1]);
  }
  // dynamicRouteHandlers 的 dynAssetPattern("/images")（参数段不比对）
  for (const m of serverSrc.matchAll(/dynAssetPattern\(\s*"([^"]+)"/g)) registered.add(m[1]);
  // apiV1*.mjs 的 { method, pattern: apiPattern("/v1/schemes", ...) }
  for (const name of readdirSync(path.join(repoRoot, "server"))) {
    if (!/^apiV1.*\.mjs$/.test(name) || name.endsWith(".test.mjs")) continue;
    const src = readFileSync(path.join(repoRoot, "server", name), "utf8");
    for (const m of src.matchAll(/method:\s*"(?:GET|POST|PUT|DELETE)"\s*,\s*pattern:\s*apiPattern\(\s*"([^"]+)"/g)) {
      registered.add(m[1]);
    }
  }
  return registered;
}

function collectFrontendApiPaths() {
  const used = new Map();
  const walk = (dir) => {
    for (const entry of readdirSync(dir)) {
      const full = path.join(dir, entry);
      if (statSync(full).isDirectory()) walk(full);
      else if (/\.tsx?$/.test(entry) && !/\.test\./.test(entry)) {
        const src = readFileSync(full, "utf8");
        for (const m of src.matchAll(/apiPath\(\s*[`"']([^"'`]+)[`"']/g)) {
          used.set(m[1], path.relative(repoRoot, full).split(path.sep).join("/"));
        }
      }
    }
  };
  walk(path.join(repoRoot, "src"));
  return used;
}

const registered = collectRegisteredPaths();
const used = collectFrontendApiPaths();

/**
 * 把路径归一为「静态段序列」，末尾的动态参数段丢弃。
 *
 * 前端 `apiPath("/images/${assetId}")` 对应后端 `dynAssetPattern("/images")` ——
 * 后者注册的**只是前缀**（参数段由 `([^/]+)` 在运行时匹配），所以字面量差一段。
 * 故比对口径是：去掉所有动态段后，两边的静态段序列必须完全相等。
 * 动态段判定：`${...}` 插值、`{param}` 占位、或本身就是注册表里被省略的尾段。
 */
function staticSegments(pathValue) {
  // 先剥查询串：apiPath("/v1/schemes/model/svg?${schemePathQueryParam(...)}") 的
  // `?...` 部分不是路径段（后端注册表里也没有），留着会永远匹配不上。
  const withoutQuery = pathValue.split("?")[0];
  return withoutQuery
    .split("/")
    .filter((seg) => seg && !seg.includes("${") && !seg.startsWith("{"));
}
const registeredShapes = new Set([...registered].map(staticSegments).map((s) => s.join("/")));

describe("前后端路径契约", () => {
  test("扫描面本身有效：前后端两侧都扫到了足量路径（防零命中假绿）", () => {
    // 下面那条用例是「前端引用的路径 ⊆ 后端注册表」。若任一侧的采集正则因重构失效
    // （例如后端改了 apiPattern 的书写形式），`missing` 会恒为空，守卫变成永真、
    // 完全不检查东西。故单独钉住扫描面。实测当前值：registered=62、used=38；
    // 下限取 ~80%，既能抓住大规模失效，又不会因端点正常增删而误报。
    expect(
      registered.size,
      "后端路由表采集为零 —— apiPattern / dynAssetPattern / routeKey 的扫描正则已失效"
    ).toBeGreaterThanOrEqual(50);
    expect(
      used.size,
      "前端 apiPath() 采集为零 —— apiPath 调用点扫描正则已失效"
    ).toBeGreaterThanOrEqual(30);
  });

  test("前端 apiPath() 引用的路径都存在于后端路由表", () => {
    const missing = [...used.keys()]
      .filter((p) => !registered.has(p))
      .filter((p) => !registeredShapes.has(staticSegments(p).join("/")))
      .filter((p) => !OUTSIDE_ROUTE_TABLE.has(p))
      .sort();
    expect(
      missing,
      `前端引用了后端未注册的路径：\n${missing.map((p) => `  ${p}  <- ${used.get(p)}`).join("\n")}\n` +
        `改前端路径时须同步后端 routeKey/apiPattern，反之亦然。`
    ).toEqual([]);
  });

  test("豁免清单里的路径确实不是 HTTP 路由（防止豁免过期）", () => {
    for (const p of OUTSIDE_ROUTE_TABLE) {
      expect(registered.has(p), `${p} 已在路由表里，请从 OUTSIDE_ROUTE_TABLE 移除`).toBe(false);
    }
  });
});
