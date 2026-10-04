import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { startE2EEnvironment } from "../e2e/controlHarness.mjs";

// stdout 契约：**保持为空**。本脚本没有机器可读产物——它的产物是
// output/tooltip-page-{1,2,3}.png 三个截图文件；控制台上的每一条都是
// 供人阅读的探测发现（页面文本、按钮命中数、每个表头的 tooltip 文本）。
// 因此这 8 处一律走 console.error / stderr（与 scripts/audit-icon-library-quality.mjs
// 「面向人的诊断一律走 console.error」同一约定），并统一加 [tooltip-verify] 前缀，
// 便于 `node scripts/debug-tooltip-verify.mjs 2>&1 | tee probe.log` 时区分来源。
//
// 已核查：全仓（.md / .json / .mjs / CI 配置）无任何消费方解析本脚本的 stdout——
// 仅 .claude/auto-improve-todo.md 与 .sisyphus/reports/ 提及本文件名，均为任务追踪
// 与评审报告，不读取其输出。故前缀可自由添加。若日后要把 stdout 改作解析契约，
// 必须同时补上对应消费方与解析测试（参见 scripts/list-used-lucide-icons.mjs 的注释）。

const dataDir = mkdtempSync(join(tmpdir(), "gmp-tooltip-"));
const env = await startE2EEnvironment({ dataDir });
try {
  const { page, baseUrl } = env;
  await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForTimeout(30000);
  await page.screenshot({ path: "output/tooltip-page-1.png" });
  const bodyText = (await page.locator("body").textContent() || "").slice(0, 300);
  console.error("[tooltip-verify] BODY:", JSON.stringify(bodyText));
  const anyBtn = page.locator("button:has-text('加载预定义模板')");
  console.error("[tooltip-verify] templateBtn count:", await anyBtn.count());
  if (await anyBtn.count() > 0) {
    await anyBtn.first().click();
    await page.waitForTimeout(1000);
    const emsBtn = page.locator("button:has-text('主网实时库')");
    console.error("[tooltip-verify] emsBtn count:", await emsBtn.count());
    if (await emsBtn.count() > 0) {
      await emsBtn.first().click();
    }
  }
  await page.waitForTimeout(8000);
  await page.screenshot({ path: "output/tooltip-page-2.png" });
  const efileBtn = page.locator("button:has-text('查看/编辑E文件')");
  console.error("[tooltip-verify] efileBtn count:", await efileBtn.count());
  if (await efileBtn.count() > 0) {
    await efileBtn.first().click();
    await page.waitForTimeout(5000);
    await page.screenshot({ path: "output/tooltip-page-3.png" });
    const thCount = await page.locator(".e-file-editor-th").count();
    console.error("[tooltip-verify] e-file-editor-th count:", thCount);
    for (let i = 0; i < Math.min(thCount, 5); i++) {
      const t = page.locator(".e-file-editor-th").nth(i);
      await t.hover();
      await page.waitForTimeout(400);
      const tp = page.locator(".e-file-editor-tooltip");
      const label = (await t.textContent()).trim();
      if (await tp.count() > 0) {
        console.error("[tooltip-verify] TH[" + i + "] label=" + JSON.stringify(label) + " tooltip=" + JSON.stringify((await tp.first().textContent()).trim()));
      } else {
        console.error("[tooltip-verify] TH[" + i + "] label=" + JSON.stringify(label) + " tooltip=MISSING");
      }
    }
  } else {
    console.error("[tooltip-verify] 未找到 查看/编辑E文件 按钮");
  }
} finally {
  await env.teardown();
  rmSync(dataDir, { recursive: true, force: true });
}
