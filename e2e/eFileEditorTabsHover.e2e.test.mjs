// E 文件窗口「表名 tab」划过时的视觉守卫：自定义 CSS 必须压过 antd v6 Button 的 hover 接管。
// 背景（实机反馈「tab 划过时边框依次闪烁」）：antd v6 的按钮 hover/active 规则带
// :not(:disabled):not(.ant-btn-disabled)（特异性 0,4,0），高于 styles.css 里
// .e-file-editor-tabs button:hover 的 (0,2,1) —— 划过时 1px 实线边框 + 蓝字白底整体闪现。
// 选中态为浅蓝描边胶囊（#eff6ff 底 + 1px #2563eb 边 + 蓝字），划过/按下时也必须保持。
// 该 bug 只在真实 CSS 级联下成立（antd cssinjs 运行时注入 vs 静态 styles.css），
// node/vitest 测不出来，故放 e2e。
//
// 打开真实 E 文件窗口需要模型数据 + 多步 UI；此处注入与窗口同构的节点
// （.e-file-editor-tabs 容器 + antd 默认按钮类，类名抄自页面上真实按钮以带上 cssinjs hash），
// 直接对 bug 所在层（CSS 级联）断言。
import { describe, expect, test, beforeEach, afterEach } from "vitest";
import { tmpdir } from "node:os";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { startE2EEnvironment, loadFrontendAndWaitOnline } from "./controlHarness.mjs";

let env;
let dataDir;

beforeEach(async () => {
  dataDir = mkdtempSync(join(tmpdir(), "gmp-efile-tabs-hover-e2e-"));
  env = await startE2EEnvironment({ dataDir });
}, 120000);

afterEach(async () => {
  if (env) {
    await env.teardown();
    env = undefined;
  }
  try { rmSync(dataDir, { recursive: true, force: true }); } catch {}
});

describe("E文件窗口表名 tab hover 视觉", () => {
  test("划过 tab 不出现 antd 实线边框，hover 配色与选中胶囊保持自定义值", async () => {
    const { page, baseUrl, imageBaseUrl } = env;
    await loadFrontendAndWaitOnline(page, baseUrl, imageBaseUrl);

    await page.evaluate(() => {
      const sameVariant = document.querySelector("button.ant-btn-color-default.ant-btn-variant-outlined");
      const anyBtn = document.querySelector("button.ant-btn");
      const hashClasses = anyBtn ? Array.from(anyBtn.classList).filter((c) => c.startsWith("css-")) : [];
      const sizeClass = anyBtn ? Array.from(anyBtn.classList).filter((c) => c.endsWith("-sm")) : [];
      // sample 若自带 active（选中的「查看」按钮）要剔掉，否则两个注入按钮都被 .active 染色
      const base = (sameVariant
        ? sameVariant.className
        : ["ant-btn", "ant-btn-color-default", "ant-btn-variant-outlined", ...hashClasses, ...sizeClass].join(" ")
      )
        .split(/\s+/)
        .filter((c) => c !== "active")
        .join(" ");
      const wrap = document.createElement("div");
      wrap.className = "e-file-editor-tabs";
      wrap.style.cssText = "position:fixed;top:0;left:0;z-index:99999;background:#f9fafb;";
      const plain = document.createElement("button");
      plain.type = "button";
      plain.className = base;
      plain.id = "probe-plain";
      plain.textContent = "ACNode";
      const active = document.createElement("button");
      active.type = "button";
      active.className = `${base} active`;
      active.id = "probe-active";
      active.textContent = "ACBranch";
      wrap.append(plain, active);
      document.body.appendChild(wrap);
    });

    // 等 transition(all 0.15s)走完再读稳定终态，避免读到插值中间值
    const readStyle = async (sel) => {
      await page.waitForTimeout(300);
      return page.$eval(sel, (el) => {
        const cs = getComputedStyle(el);
        return {
          borderTopStyle: cs.borderTopStyle,
          borderTopWidth: cs.borderTopWidth,
          borderTopColor: cs.borderTopColor,
          borderLeftStyle: cs.borderLeftStyle,
          borderBottomWidth: cs.borderBottomWidth,
          borderBottomColor: cs.borderBottomColor,
          boxShadow: cs.boxShadow,
          color: cs.color,
          backgroundColor: cs.backgroundColor
        };
      });
    };

    await page.hover("#probe-plain");
    const plain = await readStyle("#probe-plain");
    // 核心：划过不得出现可见边框 —— 基础/hover 边为 1px 透明占位（修复前 antd 接管成 1px 实线 #4096ff）
    expect(plain.borderTopStyle).toBe("solid");
    expect(plain.borderTopWidth).toBe("1px");
    expect(plain.borderTopColor).toBe("rgba(0, 0, 0, 0)");
    // hover 配色保持自定义（修复前被 antd 接管：#4096ff 文字 + 白底）
    expect(plain.color).toBe("rgb(55, 65, 81)");
    expect(plain.backgroundColor).toBe("rgb(243, 244, 246)");
    expect(plain.boxShadow).toBe("none");

    await page.hover("#probe-active");
    const active = await readStyle("#probe-active");
    // 选中胶囊在划过时保持：1px #2563eb 描边 + #eff6ff 淡蓝底 + 蓝字（修复前被 antd 改成 1px #4096ff 边 + 白底）
    expect(active.borderTopStyle).toBe("solid");
    expect(active.borderTopWidth).toBe("1px");
    expect(active.borderTopColor).toBe("rgb(37, 99, 235)");
    expect(active.borderBottomColor).toBe("rgb(37, 99, 235)");
    expect(active.backgroundColor).toBe("rgb(239, 246, 255)");
    expect(active.color).toBe("rgb(37, 99, 235)");
  });
});
