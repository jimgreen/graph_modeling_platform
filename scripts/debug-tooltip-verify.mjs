import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { startE2EEnvironment } from "../e2e/controlHarness.mjs";

const dataDir = mkdtempSync(join(tmpdir(), "gmp-tooltip-"));
const env = await startE2EEnvironment({ dataDir });
try {
  const { page, baseUrl } = env;
  await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForTimeout(30000);
  await page.screenshot({ path: "output/tooltip-page-1.png" });
  const bodyText = (await page.locator("body").textContent() || "").slice(0, 300);
  console.log("BODY:", JSON.stringify(bodyText));
  const anyBtn = page.locator("button:has-text('加载预定义模板')");
  console.log("templateBtn count:", await anyBtn.count());
  if (await anyBtn.count() > 0) {
    await anyBtn.first().click();
    await page.waitForTimeout(1000);
    const emsBtn = page.locator("button:has-text('主网实时库')");
    console.log("emsBtn count:", await emsBtn.count());
    if (await emsBtn.count() > 0) {
      await emsBtn.first().click();
    }
  }
  await page.waitForTimeout(8000);
  await page.screenshot({ path: "output/tooltip-page-2.png" });
  const efileBtn = page.locator("button:has-text('查看/编辑E文件')");
  console.log("efileBtn count:", await efileBtn.count());
  if (await efileBtn.count() > 0) {
    await efileBtn.first().click();
    await page.waitForTimeout(5000);
    await page.screenshot({ path: "output/tooltip-page-3.png" });
    const thCount = await page.locator(".e-file-editor-th").count();
    console.log("e-file-editor-th count:", thCount);
    for (let i = 0; i < Math.min(thCount, 5); i++) {
      const t = page.locator(".e-file-editor-th").nth(i);
      await t.hover();
      await page.waitForTimeout(400);
      const tp = page.locator(".e-file-editor-tooltip");
      const label = (await t.textContent()).trim();
      if (await tp.count() > 0) {
        console.log("TH[" + i + "] label=" + JSON.stringify(label) + " tooltip=" + JSON.stringify((await tp.first().textContent()).trim()));
      } else {
        console.log("TH[" + i + "] label=" + JSON.stringify(label) + " tooltip=MISSING");
      }
    }
  } else {
    console.log("未找到 查看/编辑E文件 按钮");
  }
} finally {
  await env.teardown();
  rmSync(dataDir, { recursive: true, force: true });
}
