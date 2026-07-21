// e2e 测试 harness：起 image-server + Vite dev server + Playwright 浏览器。
// 用非常规端口（5184/5183）避免与开发态 pnpm dev（5174/5173）冲突。
// IMAGE_SERVER_PORT 贯通：image-server 监听 5184，Vite 代理 /webgrp//ws 到 5184，
// 前端 dev 模式 WS 直连 IMAGE_SERVER_PORT=5184（runtimeWsClient.ts DEV 分支）。
import { spawn } from "node:child_process";
import { chromium } from "@playwright/test";
import { readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

const E2E_IMAGE_PORT = "5184";
const E2E_VITE_PORT = "5183";
const E2E_HOST = "127.0.0.1";

// 探测本地已装 chromium headless shell 可执行文件路径。
// Playwright 严格匹配浏览器版本号，本地可能装的版本号与 Playwright 期望不一致，
// 故直接用已装二进制绕过版本匹配，避免重复下载。
function resolveBrowserExecutable() {
  if (process.env.E2E_BROWSER_EXECUTABLE) {
    return process.env.E2E_BROWSER_EXECUTABLE;
  }
  const candidates = [
    join(homedir(), "AppData", "Local", "ms-playwright"),
    process.env.PLAYWRIGHT_BROWSERS_PATH || ""
  ].filter(Boolean);
  for (const root of candidates) {
    if (!existsSync(root)) {
      continue;
    }
    // 选版本号最大的 chromium_headless_shell-* 目录
    const dirs = readdirSync(root)
      .filter((d) => /^chromium_headless_shell-\d+$/u.test(d))
      .sort((a, b) => Number(b.split("-")[1]) - Number(a.split("-")[1]));
    for (const dir of dirs) {
      const exe = join(root, dir, "chrome-headless-shell-win64", "chrome-headless-shell.exe");
      if (existsSync(exe)) {
        return exe;
      }
    }
  }
  return undefined; // 回退到 Playwright 默认解析
}

// 等待 TCP 端口可连
async function waitForPort(host, port, timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const { default: net } = await import("node:net");
      await new Promise((resolve, reject) => {
        const sock = net.connect({ host, port }, () => {
          sock.end();
          resolve(undefined);
        });
        sock.on("error", reject);
      });
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 300));
    }
  }
  throw new Error(`端口 ${port} 未在 ${timeoutMs}ms 内就绪。`);
}

// 起一个子进程，返回 { process, kill }
function spawnServer(command, args, env, label) {
  const child = spawn(command, args, {
    env: { ...process.env, ...env },
    stdio: ["ignore", "pipe", "pipe"],
    shell: process.platform === "win32"
  });
  const log = (chunk) => {
    const text = chunk.toString().trim();
    if (text) {
      // e2e 调试用，默认静默；设 E2E_VERBOSE=1 可见
      if (process.env.E2E_VERBOSE) {
        console.log(`[${label}] ${text}`);
      }
    }
  };
  child.stdout?.on("data", log);
  child.stderr?.on("data", log);
  return {
    process: child,
    kill: () =>
      new Promise((resolve) => {
        if (child.killed || child.exitCode !== null) {
          resolve();
          return;
        }
        child.once("exit", () => resolve());
        // Windows 下 taskkill /T 递归终止子进程树
        if (process.platform === "win32") {
          spawn("taskkill", ["/pid", String(child.pid), "/f", "/t"], { shell: true });
        } else {
          child.kill("SIGTERM");
        }
      })
  };
}

// 起完整 e2e 环境，返回 { browser, page, baseUrl, imageBaseUrl, teardown }
export async function startE2EEnvironment({ dataDir }) {
  // 1. image-server（数据目录隔离）
  // 注意：前端 dev 模式 WS 直连 VITE_IMAGE_SERVER_PORT（runtimeWsClient.ts DEV 分支），
  // 故必须同时设 VITE_IMAGE_SERVER_PORT，前端 WS 才能连到 e2e 的 image-server。
  const imageEnv = {
    IMAGE_SERVER_PORT: E2E_IMAGE_PORT,
    VITE_IMAGE_SERVER_PORT: E2E_IMAGE_PORT,
    IMAGE_SERVER_HOST: E2E_HOST,
    GRAPH_MODEL_DATA_DIR: dataDir
  };
  const imageServer = spawnServer("node", ["server/image-server.mjs"], imageEnv, "image-server");
  await waitForPort(E2E_HOST, Number(E2E_IMAGE_PORT));

  // 2. Vite dev server（IMAGE_SERVER_PORT 贯通代理）
  const viteCmd = process.platform === "win32" ? "npx.cmd" : "npx";
  const viteServer = spawnServer(
    viteCmd,
    ["vite", "--port", E2E_VITE_PORT, "--strictPort", "--host", E2E_HOST],
    imageEnv,
    "vite"
  );
  await waitForPort(E2E_HOST, Number(E2E_VITE_PORT));

  // 3. Playwright 浏览器
  // 用本地已装 chromium（避免 Playwright 严格版本匹配导致重复下载）。
  // E2E_BROWSER_EXECUTABLE 可覆盖；缺省探测 ms-playwright 下最新 headless shell。
  const browser = await chromium.launch({
    headless: true,
    executablePath: resolveBrowserExecutable()
  });
  const context = await browser.newContext();
  const page = await context.newPage();

  const baseUrl = `http://${E2E_HOST}:${E2E_VITE_PORT}`;
  const imageBaseUrl = `http://${E2E_HOST}:${E2E_IMAGE_PORT}`;

  const teardown = async () => {
    try {
      await context.close();
    } catch {}
    try {
      await browser.close();
    } catch {}
    await viteServer.kill();
    await imageServer.kill();
  };

  return { browser, page, baseUrl, imageBaseUrl, teardown };
}

// 等待前端 WS 客户端在线：轮询 GET /webgrp/v1/runtime/clients 直到非空
export async function waitForOnlineClient(imageBaseUrl, timeoutMs = 60000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${imageBaseUrl}/webgrp/v1/runtime/clients`);
      const json = await res.json();
      if (json?.ok && json.data?.clients?.length > 0) {
        return json.data.clients[0].clientId;
      }
    } catch {
      // server 未就绪，重试
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`前端 WS 客户端未在 ${timeoutMs}ms 内上线。`);
}

// 导航前端页面并等待 WS 在线
export async function loadFrontendAndWaitOnline(page, baseUrl, imageBaseUrl) {
  await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
  return waitForOnlineClient(imageBaseUrl);
}
