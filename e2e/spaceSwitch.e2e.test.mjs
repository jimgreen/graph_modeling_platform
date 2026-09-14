import { describe, expect, test, beforeEach, afterEach } from "vitest";
import { tmpdir } from "node:os";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { startE2EEnvironment, loadFrontendAndWaitOnline } from "./controlHarness.mjs";
import { apiPath } from "../server/config.mjs";

// e2e 验收：切空间后新空间不被**旧空间留在浏览器里的缓存**污染（设计 §6 / §12#12，关闭 S2）。
//
// 污染是怎么发生的（三条回写路径）：后端某一空间为空（`exists:false`）时，前端会把
// **浏览器本地缓存**当成该空间的初始内容写回后端 —— 配色 `appToolbarHookFactories.tsx:2780`、
// 图元库 `:2823`、量测 `:2863`。故只要进入新空间时浏览器缓存里还留着旧空间的东西，
// 它就会被打包成新空间的 `color-config.json` / `device-library/library.json` /
// `measurement-config.json` 落盘，且用户侧无法自愈。
//
// 与计划原文的两处偏离（以「断言必须能红」为准，该标准高过文档措辞）：
//
//  1) **文件名**：计划写 `e2e/spaceSwitch.spec.ts`。本仓 e2e 由 vitest 驱动
//     （`vite.e2e.config.ts` 的 include 只收 `e2e/**\/*.test.mjs`），故按既有约定命名
//     `spaceSwitch.e2e.test.mjs`（与 `apiV1Control.e2e.test.mjs` 同形）。
//
//  2) **手工路径的构造**：计划原文写「手工设 cookie=A + `?space=B` 进入」。该构造在本仓
//     **造不出分歧**：前端自身不发送 `?space=`/`X-Space`（`src/spaceClient.ts:2`），页面 URL 上
//     的 query 不会跟到它自己的 XHR 上（`GET /webgrp/spaces` 的 `current` 由
//     `resolveSpaceFromRequest(request, url, …)` 从**该 XHR 的** cookie 算出，见 `server.mjs:4534`）。
//     故 frontend 读写的仍是 A，B 的落盘文件根本不会被触及 —— 断言恒真、变异打不红它。
//     改按 S2 的真实机制构造：**直接把 cookie 设成 B**，浏览器缓存里留着 A 的内容。
//
//  计划第 5 条（「选择器显示后端 `current` 而非 cookie 值」）**能证，故已实现**（最后一个用例）。
//  我一度判过「本架构下不可证」，那是**错的**，两处依据都不成立：
//   · `/webgrp/spaces` 在派发层的 `isSpaceAgnostic` 白名单里（`server.mjs:4754-4757`），
//     **该响应不写 `set-cookie`** —— 把 cookie 设成后端不认识的 id 后，首个 `/spaces`
//     响应就是「cookie ≠ current」，可以在同一页面里同时钉住前提与结论。
//   · 先前实测看到 cookie 被纠回 `default`，是**别的**非 agnostic 请求干的（它们在
//     `resolution.source === "fallback"` 时同响应 `set-cookie`，`server.mjs:4766-4770`），
//     不是「分歧观察不到」。用 `page.route` 剥掉那些响应的 `set-cookie` 即可把分歧定住。
//  再记一条我写错的出处：该断言**不曾**被组件级用例覆盖 —— 李四/张三 的 mock 在
//  `src/spaceClient.test.ts:92-106`，那是**模块级** `fetchSpaces` 测试、不渲染组件；
//  `src/appView.test.tsx:1180-1192` 是**源码文本**断言，它自己写着「只证明源码里没出现
//  `readSpaceCookie`，不证明渲染时用了 current 的返回值」。两处都不足以顶替这条 e2e。

const A_MARK = {
  colorMode: "voltage",
  measurementBg: "#fef3c7",
  label: "E2E-A标记"
};

let env;
let dataDir;

beforeEach(async () => {
  dataDir = mkdtempSync(join(tmpdir(), "gmp-space-switch-e2e-"));
  env = await startE2EEnvironment({ dataDir });
}, 120000);

afterEach(async () => {
  if (env) {
    await env.teardown();
  }
  if (dataDir) {
    rmSync(dataDir, { recursive: true, force: true });
  }
}, 60000);

// 空间的落盘文件位置：default 的根就是数据根，其余在 workspaces/<id>/。
// **有意不复用 `server/spaceStore.mjs:31` 的 `spacePathsFor()`**：它是被测方的路径工厂，
// 拿它来算断言位置，会让「布局算错」这类 bug 自洽地恒绿（断言与被测方一起错）。
function spaceFiles(dir, id) {
  const root = id === "default" ? dir : join(dir, "workspaces", id);
  return {
    color: join(root, "settings", "color-config.json"),
    measurement: join(root, "settings", "measurement-config.json"),
    library: join(root, "device-library", "library.json")
  };
}

async function putJson(base, path, body) {
  const res = await fetch(`${base}${apiPath(path)}`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    throw new Error(`写入 ${path} 失败：HTTP ${res.status}`);
  }
  return res.json();
}

async function fetchSpaces(base) {
  return fetch(`${base}${apiPath("/spaces")}`).then((r) => r.json());
}

// 经 v1 控制通道下发一条写命令（真前端 __appScope 执行），用于造出「有未保存修改」的状态
async function postControl(base, path, body, clientId) {
  const res = await fetch(`${base}${apiPath(path)}?clientId=${clientId}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  const json = await res.json();
  if (!json?.ok) {
    throw new Error(`${path} 失败：HTTP ${res.status} ${JSON.stringify(json)}`);
  }
  return json.data;
}

async function createSpace(base, name) {
  const res = await fetch(`${base}${apiPath("/spaces")}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name })
  });
  const json = await res.json();
  if (!res.ok || !json?.id) {
    throw new Error(`建空间「${name}」失败：HTTP ${res.status} ${JSON.stringify(json)}`);
  }
  return json.id;
}

/**
 * 给 default 空间播下**可辨认的**内容。
 *
 * 走后端 PUT 而非点 UI：这三条正是前端自身保存时会发的同形状请求，且断言要的是
 * 「新空间有没有拿到旧空间的内容」，不是「旧空间的内容怎么来的」。
 * 播种必须发生在浏览器加载之前 —— 前端加载时后端非空，才会把它读进浏览器缓存。
 */
async function seedSpaceA(base) {
  await putJson(base, "/color-config", {
    colorDisplayMode: A_MARK.colorMode,
    colorPalette: { energy: {}, voltage: {} }
  });
  await putJson(base, "/measurement-config", {
    measurementTypes: [],
    deviceProfiles: [],
    groupDefaults: {
      backgroundColor: A_MARK.measurementBg,
      borderColor: "#d97706",
      borderWidth: 3,
      borderStyle: "dashed"
    }
  });
  await putJson(base, "/device-library", {
    eDeviceDefinitionLabels: { "ac-line": A_MARK.label }
  });
}

// 顶栏选择器的选中值在 antd 6 渲染为 `.ant-select-content`（v5 的 `.ant-select-selection-item`
// 已不存在）。等待与断言都走这一处，免得类名再变一次时要改三遍、漏一处就是假绿。
async function waitForSwitcherText(page, text) {
  await page.waitForFunction(
    (expected) => {
      const item = document.querySelector(".topbar-space-switcher .ant-select-content");
      return (item?.textContent || "").includes(expected);
    },
    text,
    { timeout: 60000 }
  );
}

// 经真实 UI 建空间并切换：`Modal.onOk → submitCreate → createSpaceThenSwitch` 这条链在
// node 测试里没有任何断言，真浏览器点击是唯一能覆盖它的地方（故两条用例都走这里，不直调 helper）。
async function createSpaceViaUi(page, name) {
  await page.click(".topbar-space-switcher .ant-select");
  await page.click('.ant-select-item-option[title="＋ 新建空间…"]');
  await page.fill('input[aria-label="空间名称"]', name);
  await page.click(".ant-modal-footer .ant-btn-primary");
}

// A 的内容进入浏览器缓存的判据：前端把后端读来的值落到 localStorage（配色/标签两处各自
// 证明一条回写路径的数据源已就位）。不等到它就切，测的就不是「缓存里有旧空间的东西」。
async function waitForSpaceACachedInBrowser(page) {
  await page.waitForFunction(
    ({ label, mode }) => {
      const labels = window.localStorage.getItem("power-system-e-device-definition-labels") || "";
      const current = window.localStorage.getItem("power-system-color-display-mode") || "";
      return labels.includes(label) && current === mode;
    },
    { label: A_MARK.label, mode: A_MARK.colorMode },
    { timeout: 60000 }
  );
}

async function waitForFile(file, timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (existsSync(file)) {
      return readFileSync(file, "utf8");
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return null;
}

/**
 * 断言 B 的三个落盘文件**都不含 A 的内容**。
 *
 * 三个文件都必须先「等到存在」再断言 —— 只写「若存在则不含」会让「回写压根没发生」
 * 也算通过，那正是这条验收最容易骗过自己的地方（绿得没有判别力）。
 */
async function expectSpaceBUnpolluted(dir, id) {
  const files = spaceFiles(dir, id);

  const color = await waitForFile(files.color);
  expect(color, `${id} 的 color-config.json 未生成 —— 回写路径没跑，断言会失去判别力`).not.toBeNull();
  expect(JSON.parse(color).colorDisplayMode).not.toBe(A_MARK.colorMode);

  const measurement = await waitForFile(files.measurement);
  expect(measurement, `${id} 的 measurement-config.json 未生成`).not.toBeNull();
  expect(measurement).not.toContain(A_MARK.measurementBg);

  const library = await waitForFile(files.library);
  expect(library, `${id} 的 device-library/library.json 未生成`).not.toBeNull();
  expect(library).not.toContain(A_MARK.label);
}

describe("切空间 e2e：新空间不被旧空间的浏览器缓存污染", () => {
  test("经顶栏 UI 建空间并切换：B 的落盘文件不含 A 的内容", async () => {
    const { page, baseUrl, imageBaseUrl } = env;
    await seedSpaceA(imageBaseUrl);
    await loadFrontendAndWaitOnline(page, baseUrl, imageBaseUrl);
    await waitForSpaceACachedInBrowser(page);

    await createSpaceViaUi(page, "乙空间");

    // 切换的收尾是 location.reload()：等新页面上的选择器已经显示新空间
    await waitForSwitcherText(page, "乙空间");

    const spaces = await fetchSpaces(imageBaseUrl);
    const spaceB = spaces.spaces.find((space) => space.name === "乙空间");
    expect(spaceB, "顶栏建出来的空间未登记到后端").toBeTruthy();

    await expectSpaceBUnpolluted(dataDir, spaceB.id);
  }, 180000);

  test("手工改 cookie 后打开（不经切换器）：启动闸门清掉旧空间缓存，B 仍不被污染", async () => {
    const { page, baseUrl, imageBaseUrl } = env;
    await seedSpaceA(imageBaseUrl);
    await loadFrontendAndWaitOnline(page, baseUrl, imageBaseUrl);
    await waitForSpaceACachedInBrowser(page);

    // 不经 UI 建 B，也不经切换器进入 B —— 这正是不执行 switchToSpace 的那条路径。
    const spaceBId = await createSpace(imageBaseUrl, "丙空间");

    // 手工把 cookie 改成 B（模拟 devtools / 任意脚本：gmp_space 是无签名普通 Cookie，
    // 这正是该功能的公开契约，也是评审论证「隐藏下拉不够」时依据的那条路径）
    await page.context().addCookies([
      { name: "gmp_space", value: encodeURIComponent(spaceBId), url: baseUrl }
    ]);
    await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
    await loadFrontendAndWaitOnline(page, baseUrl, imageBaseUrl);

    await expectSpaceBUnpolluted(dataDir, spaceBId);
  }, 180000);

  test("选择器显示后端的 current（及它的 name），而不是 cookie 里的值", async () => {
    const { page, baseUrl, imageBaseUrl } = env;

    // B 建出来是「戊空间」（id === name），随后**改名**成「总站」—— 这样一条用例能同时钉两件事：
    //  · 显示「总站」而非「戊空间」⇒ 文案取自后端的 **name**，不是 id（变异：label 用 value → 红）；
    //  · 显示的不是 default ⇒ 取的是后端的 **current**，不是 cookie 的值（变异：currentSpaceId
    //    改用 readSpaceCookie() → 显示「默认空间」→ 红）。
    const spaceBId = await createSpace(imageBaseUrl, "戊空间");
    await putJson(imageBaseUrl, "/spaces", { id: spaceBId, name: "总站" });

    // **造出 cookie ≠ current**：只给前端自己那次 `/webgrp/spaces` 请求的 URL 加上 `?space=<B>`。
    // 计划原文想在**页面 URL** 上加 query —— 那不管用（页面 URL 上的 query 不会跟到它自己的
    // XHR 上，见文件头第 2 条）。加在 XHR 上就管用，而且无需任何响应手术：
    // query 在解析链里排在 cookie 之前（`server/spaceStore.mjs:270-275`），且 B 是**已存在**的
    // 空间 ⇒ 走 `source:"query"` 而非 fallback ⇒ **不触发 set-cookie 纠回**
    //（纠回只发生在 fallback，`server.mjs:4766-4770`）。
    // 试过 `route.fetch()` + 剥 `set-cookie`：**不行** —— `route.fetch()` 走浏览器网络栈，
    // 真实响应里的 Set-Cookie 在浏览器侧已经被收下，改我们手里的副本删不掉它。
    await page.route(
      (url) => url.pathname === "/webgrp/spaces",
      (route) => {
        const target = new URL(route.request().url());
        target.searchParams.set("space", spaceBId);
        return route.continue({ url: target.toString() });
      }
    );
    await page.context().addCookies([
      { name: "gmp_space", value: encodeURIComponent("default"), url: baseUrl }
    ]);

    await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
    await loadFrontendAndWaitOnline(page, baseUrl, imageBaseUrl);

    // 先钉住**前提**：cookie 仍是 default（没被纠回）。否则日后 cookie 语义一变，下面的断言会
    // 静默失效（有断言、但它依赖的分歧已经不存在了）。
    const cookie = await page.evaluate(() => document.cookie);
    expect(decodeURIComponent(cookie)).toContain("gmp_space=default");

    // 后端对带 query 的请求算出的 current 就是 B（query 优先于 cookie）
    const withQuery = await fetch(
      `${imageBaseUrl}${apiPath("/spaces")}?space=${encodeURIComponent(spaceBId)}`
    ).then((r) => r.json());
    expect(withQuery.current).toBe(spaceBId);

    await waitForSwitcherText(page, "总站");
    const itemText = await page.textContent(".topbar-space-switcher .ant-select-content");
    expect(itemText).not.toContain("戊空间");
    expect(itemText).not.toContain("默认空间");
  }, 180000);

  // 这条钉的是「清完之后不得再被写回去」：`switchToSpace` 清掉 sessionStorage 的刷新恢复草稿后
  // 就 `location.reload()`，而**卸载事件正是在 reload 期间触发** —— 若 `persistRefreshRecoveryNow`
  // 不理会跳过标志，它会就地把此刻内存中的**旧空间**模型写回 `power-system-refresh-recovery`，
  // 新空间启动再把它读成「刷新恢复草稿」，用户在新空间一保存就把旧空间模型落进新空间（S2 复活）。
  // 这是评审在两轮里各自独立报出的 Critical，也是「清缓存」与「写回」之间真正的时序缝。
  test("切空间选「不保存」：旧空间模型不得作为刷新恢复草稿进入新空间", async () => {
    const { page, baseUrl, imageBaseUrl } = env;
    await seedSpaceA(imageBaseUrl);
    const clientId = await loadFrontendAndWaitOnline(page, baseUrl, imageBaseUrl);
    await waitForSpaceACachedInBrowser(page);

    // 先造出「未保存修改」，切换才会走确认框（也就不保存路径才可达）
    await postControl(imageBaseUrl, "/v1/control/scheme/create", { name: "未保存方案" }, clientId);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    await postControl(imageBaseUrl, "/v1/control/model/create", { name: "未保存模型", modelType: "馈线" }, clientId);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    await postControl(imageBaseUrl, "/v1/control/device/add", { kind: "static-text", x: 100, y: 100 }, clientId);

    // 新页面**脚本开跑之前**抓一眼 sessionStorage：新空间 boot 后会自己把它清掉，
    // 事后几秒再读必然是 null —— 那样这条断言就分不出「没写」与「写了又被清」，
    // 也正好会放过这个缺陷（实测：去掉守卫后「事后读」仍是 null，「新页面起点读」才有值）。
    // 无条件哨兵：否则 `?? null` 会把「init script 没跑 / 读取抛错」也映射成 null，
    // 两种失败都表现为「绿」。下面一并断言哨兵已置，让探头自证跑过。
    await page.addInitScript(() => {
      window.__spaceSwitchProbeRan = true;
      window.__spaceSwitchRecoveryAtStart = sessionStorage.getItem("power-system-refresh-recovery");
    });

    await createSpaceViaUi(page, "己空间");

    await page.waitForSelector(".unsaved-change-dialog", { timeout: 30000 });
    await page.click('.unsaved-change-actions button:has-text("不保存继续切换/关闭")');

    await waitForSwitcherText(page, "己空间");

    const probe = await page.evaluate(() => ({
      ran: window.__spaceSwitchProbeRan === true,
      recovery: window.__spaceSwitchRecoveryAtStart ?? null
    }));
    expect(probe.ran, "探头未在新页面脚本之前跑过 —— 下面的 null 不作数").toBe(true);
    expect(probe.recovery, "旧空间模型被写回刷新恢复草稿，新空间会把它读成当前模型").toBeNull();

    const spaces = await fetchSpaces(imageBaseUrl);
    const spaceB = spaces.spaces.find((space) => space.name === "己空间");
    expect(spaceB, "顶栏建出来的空间未登记到后端").toBeTruthy();
    await expectSpaceBUnpolluted(dataDir, spaceB.id);
  }, 180000);
});
