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
//
// ── 本用例曾经恒真的三处，及其闭合手段 ────────────────────────────────
// ① 原用例一上来就 hover、只读 hover 终态，于是**静态态（未划过）从未被测量**，
//    整块基础规则 `.e-file-editor-tabs button` 无守卫：把它的透明占位边删掉、
//    把基础底色改成白底、把基础字色改成蓝字，hover 终态一模一样，用例照样全绿
//    （实测变异 M1/M8/M9 三条全绿）。而本文件上方注释声称的契约是
//    「**基础**/hover 边为 1px 透明占位」——「基础」二字原先没有任何对应断言。
//    闭合：hover 之前先读静态态，把基础规则的四边/底色/字色/阴影全部断言。
// ② 只断言了上边（plain）与上下两边（active），左右两边从未断言；
//    CSS 里是 border 简写、「四边一致」是明写的契约。闭合：四条边的
//    style+width+color 逐边断言。
// ③ active 探针的静态态与 hover 态在 color/background/border 上**同值**，
//    所以即便 page.hover("#probe-active") 根本没生效（原用例不 hover 它也全绿），
//    那四条断言也照样成立 —— 即「划过选中胶囊」这件事从未被证明发生过。
//    闭合：`.active` 不设 box-shadow，压制规则的 box-shadow:none 会在划过时生效，
//    故用「静态态 box-shadow 非 none + hover 态为 none」这对差异把 hover 坐实。
// ④ 前提守卫（负对照 #probe-bare）：同样的 antd 类但祖先**不是** .e-file-editor-tabs，
//    必须显示 antd 真实接管（1px #4096ff 实线边 + 白底 + 蓝字）。
//    fixture 里类名采样失败时会落到硬编码 fallback 列表、丢掉 cssinjs hash，
//    此时 antd 规则根本匹配不上、probe 按钮全裸，而**其余断言仍然全绿**
//    —— 用例会退化成「只验自定义 CSS 自己压不压得过自己」。本对照让那种退化转红。
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

// 四边占位边的契约值：未选中 = 1px 透明（选中态描边的占位）；选中 = 1px #2563eb 蓝边
const TRANSPARENT_BORDER = "rgba(0, 0, 0, 0)";
const SELECTED_BORDER = "rgb(37, 99, 235)";
// antd v6 接管后的签名色（= 本 bug 的现场特征，负对照要认它）
const ANTD_TAKEOVER_BORDER = "rgb(64, 150, 255)";

describe("E文件窗口表名 tab hover 视觉", () => {
  test("划过 tab 不出现 antd 实线边框，hover 配色与选中胶囊保持自定义值", async () => {
    const { page, baseUrl, imageBaseUrl } = env;
    await loadFrontendAndWaitOnline(page, baseUrl, imageBaseUrl);
    // harness 只等到 domcontentloaded 就返回；Vite 首屏可能随后触发一次 full reload，
    // 紧接着的 page.evaluate 会撞上 "Execution context was destroyed"（实测偶发）。
    // 这里补等 load 事件把窗口关掉；下面的 waitForFunction 本身也能跨导航重试。
    await page.waitForLoadState("load");

    // 类名必须抄自带 cssinjs hash 的真实 antd 按钮，且必须**等它真的渲染出来**。
    // WS 客户端上线早于 React 渲染出 Modal 里的按钮，直接 querySelector 会随机落空；
    // 原代码落空后会静默退化成 3 类硬编码 fallback（丢掉 hash）—— 那时 antd 的运行时
    // 规则根本匹配不上、probe 按钮全裸，用例退化成「自定义 CSS 压不压得过自己」。
    // 故：轮询等按钮出现（落空即超时失败，不静默退化），并断言 hash 确实抄到了。
    const sampled = await page
      .waitForFunction(
        () => {
          const btn =
            document.querySelector("button.ant-btn-color-default.ant-btn-variant-outlined") ||
            document.querySelector("button.ant-btn");
          // sample 若自带 active（选中的「查看」按钮）要剔掉，否则两个注入按钮都被 .active 染色
          return btn ? Array.from(btn.classList).filter((c) => c !== "active").join(" ") : null;
        },
        null,
        { timeout: 30000 }
      )
      .then((handle) => handle.jsonValue());
    expect(sampled.split(/\s+/).filter((c) => c.startsWith("css-")).length).toBeGreaterThan(0);

    await page.evaluate((base) => {
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
      // 负对照：同样的 antd 类，但祖先不是 .e-file-editor-tabs —— 压制规则不该命中它
      const bare = document.createElement("div");
      bare.className = "probe-bare-wrap";
      bare.style.cssText = "position:fixed;top:60px;left:0;z-index:99999;";
      const bareBtn = document.createElement("button");
      bareBtn.type = "button";
      bareBtn.className = base;
      bareBtn.id = "probe-bare";
      bareBtn.textContent = "BareNode";
      bare.append(bareBtn);
      document.body.append(wrap, bare);
    }, sampled);

    // 等 transition(all 0.15s)走完再读稳定终态，避免读到插值中间值
    const readStyle = async (sel) => {
      await page.waitForTimeout(300);
      return page.$eval(sel, (el) => {
        const cs = getComputedStyle(el);
        return {
          borderTopStyle: cs.borderTopStyle,
          borderTopWidth: cs.borderTopWidth,
          borderTopColor: cs.borderTopColor,
          borderRightStyle: cs.borderRightStyle,
          borderRightWidth: cs.borderRightWidth,
          borderRightColor: cs.borderRightColor,
          borderBottomStyle: cs.borderBottomStyle,
          borderBottomWidth: cs.borderBottomWidth,
          borderBottomColor: cs.borderBottomColor,
          borderLeftStyle: cs.borderLeftStyle,
          borderLeftWidth: cs.borderLeftWidth,
          borderLeftColor: cs.borderLeftColor,
          boxShadow: cs.boxShadow,
          borderRadius: cs.borderRadius,
          color: cs.color,
          backgroundColor: cs.backgroundColor
        };
      });
    };

    // 逐边断言 style+width+color：CSS 里是 border 简写，「四边一致」是明写的契约；
    // 只测上边会让「只描下边」这类退化靠「上边恰好也被改了」才碰巧转红，语义并不对应。
    const expectBorders = (label, box, expectedColor) => {
      for (const side of ["Top", "Right", "Bottom", "Left"]) {
        const name = `border-${side.toLowerCase()}`;
        expect(box[`border${side}Style`]).toBe("solid", `${label} ${name} 线型`);
        expect(box[`border${side}Width`]).toBe("1px", `${label} ${name} 宽度`);
        expect(box[`border${side}Color`]).toBe(expectedColor, `${label} ${name} 颜色`);
      }
    };

    // ── ① 静态态（未划过）────────────────────────────────────────────
    // 把指针挪到两个 probe 之外（落在 tabs 容器的 padding 里，不碰任何按钮），
    // 否则读到的是上一次 hover 的残留状态。
    await page.mouse.move(2, 2);
    const restPlain = await readStyle("#probe-plain");
    const restActive = await readStyle("#probe-active");

    // 基础规则 `.e-file-editor-tabs button`：四边 1px 透明占位边（选中态描边的占位，
    // 保证选中/未选中尺寸一致不跳动）+ 透明底 + 灰字 + 胶囊形。原用例完全没有这些断言。
    expectBorders("静态未选中 tab", restPlain, TRANSPARENT_BORDER);
    expect(restPlain.backgroundColor).toBe("rgba(0, 0, 0, 0)");
    expect(restPlain.color).toBe("rgb(107, 114, 128)");
    expect(restPlain.borderRadius).toBe("999px");
    // antd 的 box-shadow 在静态态是活的 —— 它正是下面 hover 态要压掉的东西，
    // 不在这里坐实它，「hover 态 box-shadow=none」就可能是因为它压根没生效。
    expect(restPlain.boxShadow).not.toBe("none");

    // 静态态选中胶囊：淡蓝底 + 蓝字 + 四边 1px 蓝边。
    expectBorders("静态选中 tab", restActive, SELECTED_BORDER);
    expect(restActive.backgroundColor).toBe("rgb(239, 246, 255)");
    expect(restActive.color).toBe("rgb(37, 99, 235)");
    expect(restActive.borderRadius).toBe("999px");
    // .active 规则不设 box-shadow，故此处仍是 antd 的阴影；与下面的 hover 态构成差异对。
    expect(restActive.boxShadow).not.toBe("none");

    // ── ② 划过未选中 tab ─────────────────────────────────────────────
    await page.hover("#probe-plain");
    const plain = await readStyle("#probe-plain");
    // 核心：划过不得出现可见边框 —— hover 边为 1px 透明占位（修复前 antd 接管成 1px 实线 #4096ff）
    expectBorders("划过未选中 tab", plain, TRANSPARENT_BORDER);
    // hover 配色保持自定义（修复前被 antd 接管：#4096ff 文字 + 白底）
    expect(plain.color).toBe("rgb(55, 65, 81)");
    expect(plain.backgroundColor).toBe("rgb(243, 244, 246)");
    // 与静态态的 not.toBe("none") 构成差异对：证明压制规则真的在 hover 态生效了
    expect(plain.boxShadow).toBe("none");

    // ── ③ 负对照：脱离 .e-file-editor-tabs 的同款按钮必须仍被 antd 接管 ──
    await page.hover("#probe-bare");
    const bare = await readStyle("#probe-bare");
    expectBorders("负对照(脱离 tabs 容器)", bare, ANTD_TAKEOVER_BORDER);
    expect(bare.color).toBe(ANTD_TAKEOVER_BORDER);
    expect(bare.backgroundColor).toBe("rgb(255, 255, 255)");
    // 负对照的阴影不在压制规则作用域内，故仍留着 —— 与上面 plain 的 none 正成对照，
    // 说明那个 none 是压制规则干掉的，不是 antd 本来就没有。
    expect(bare.boxShadow).not.toBe("none");

    // ── ④ 划过选中 tab：胶囊保持 ──────────────────────────────────────
    await page.hover("#probe-active");
    const active = await readStyle("#probe-active");
    // 选中胶囊在划过时保持：四边 1px #2563eb 描边 + #eff6ff 淡蓝底 + 蓝字
    //（修复前被 antd 改成 1px #4096ff 边 + 白底）
    expectBorders("划过选中 tab", active, SELECTED_BORDER);
    expect(active.backgroundColor).toBe("rgb(239, 246, 255)");
    expect(active.color).toBe("rgb(37, 99, 235)");
    // 承重的一条：active 的 color/background/border 在静态与 hover 下同值，
    // 单靠上面四条无法证明 hover 真的落在了这个按钮上；box-shadow 的差异对才能坐实。
    expect(active.boxShadow).toBe("none");
  });
});