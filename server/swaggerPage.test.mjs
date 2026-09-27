// /swigger 自包含页面的静态守卫。
//
// 为什么值得守：swaggerPage.mjs 把接口元数据与一大段 JS/CSS 直接内联进 HTML，
// 历史上踩过「模板字面量里的换行没转义成 \\n → 整页 SyntaxError → 页面全白」的坑
// （见 server/CLAUDE.md 的注意事项）。而 swigger.examples.test.mjs 打的是**后端端点**，
// 完全不碰这个 HTML —— 也就是说上面那个回归至今没有任何测试能发现。
//
// 这里只做静态校验（不启服务、不需要 DOM），覆盖三件事：
//   1. 内联 <script> 能被真实 JS 引擎解析（SyntaxError 即页面全白）；
//   2. 页面确实是完整 HTML 文档，且带 highlight.js（文档承诺的自包含交互依赖）；
//   3. 端点数与示例总数符合文档记载的 71 端点 / 96 示例。
import { expect, test } from "vitest";
import vm from "node:vm";
import { renderSwaggerHtml, SWIGGER_ENDPOINTS } from "./swaggerPage.mjs";

test("内联脚本能被 JS 引擎解析（防模板字面量换行导致的 SyntaxError）", () => {
  const html = renderSwaggerHtml();
  const blocks = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)];
  expect(blocks.length).toBeGreaterThan(0);
  for (const [index, match] of blocks.entries()) {
    expect(
      () => new vm.Script(match[1], { filename: `swigger-inline-${index}.js` }),
      `内联 script #${index} 语法错误`
    ).not.toThrow();
  }
});

test("页面是完整 HTML 文档且自带 highlight.js", () => {
  const html = renderSwaggerHtml();
  expect(html).toMatch(/^<!DOCTYPE html>/i);
  expect(html).toContain("</html>");
  // /swigger 的交互（JSON 树折叠/复制）依赖 highlight.js 高亮
  expect(html).toContain("highlight");
});

// 端点/示例数会随功能增长；这里钉住的是「文档与实际同步」这一事实，具体数字见
// swaggerPage.mjs 的 ENDPOINTS。真正的漂移防护在 routeCoverage.test.mjs
// （已注册路由 vs 已文档化端点），本条只防手滑漏改。
test("端点数与示例总数符合文档记载（81 端点 / 106 示例）", () => {
  expect(SWIGGER_ENDPOINTS).toHaveLength(81);
  const exampleTotal = SWIGGER_ENDPOINTS.reduce(
    (sum, endpoint) => sum + (endpoint.examples?.length ?? 0),
    0
  );
  expect(exampleTotal).toBe(106);
  // 每个端点都必须有示例：swigger.examples.test.mjs 靠它逐条真实调用
  for (const endpoint of SWIGGER_ENDPOINTS) {
    expect(endpoint.examples?.length ?? 0, `${endpoint.method} ${endpoint.path} 没有示例`).toBeGreaterThan(0);
  }
});
