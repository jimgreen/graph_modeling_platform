// GET /webgrp/images/{id} 的缓存头：URL 不含空间维度（前端拼 apiPath('/images/' + id)），
// 内容却按空间取 —— 故响应必须 private（挡共享/代理缓存）+ vary: Cookie（浏览器缓存按 cookie 分键）。
// 若退回 `public, ... immutable`，一个缓存过 alpha 空间 img-shared 的客户端在切到 beta 后
// 会继续回放 alpha 的字节。复现前提是真实存在的：图标库导入按原 id 落盘
// （server.mjs normalizeImportedImageLibraryAssets），「A 空间导出图片库 → 导入 B 空间」即同 id 两内容。
import { expect, test, beforeAll, afterAll } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { installDomShim } from "./domShim.mjs";

installDomShim();

// 同一 id 在两个空间落不同字节的前缀，便于直接比对响应体
const SHARED_ID = "img-shared";
const ALPHA_BODY = "alpha-bytes";
const BETA_BODY = "beta-bytes-longer";

const dataUrl = (text) => `data:image/png;base64,${Buffer.from(text, "utf-8").toString("base64")}`;

let dataDir; let server; let baseUrl;
beforeAll(async () => {
  dataDir = mkdtempSync(join(tmpdir(), "image-cache-"));
  process.env.GRAPH_MODEL_DATA_DIR = dataDir;
  const { createImageServer } = await import("./server.mjs");
  const { createSpaceStore } = await import("./spaceStore.mjs");
  const store = createSpaceStore(dataDir);
  await store.ensureInitialized();
  await store.create("alpha");
  await store.create("beta");
  // 必须注入自建 store：否则服务端另建一个实例，两个写者各自持有陈旧注册表快照
  server = await createImageServer({ port: 0, host: "127.0.0.1", spaceStore: store });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
  for (const [space, text] of [["alpha", ALPHA_BODY], ["beta", BETA_BODY]]) {
    const res = await fetch(`${baseUrl}/webgrp/icon-library/import?space=${space}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        folders: [],
        assets: [{ id: SHARED_ID, name: "共享.png", folderId: "root", dataUrl: dataUrl(text) }]
      })
    });
    expect(res.status).toBe(200);
  }
});
afterAll(async () => {
  if (server) await new Promise((r) => server.close(r));
  delete process.env.GRAPH_MODEL_DATA_DIR;
  rmSync(dataDir, { recursive: true, force: true });
});

test("图片下载响应不得进入共享缓存，且按 Cookie 分键", async () => {
  const res = await fetch(`${baseUrl}/webgrp/images/${SHARED_ID}?space=alpha`);
  expect(res.status).toBe(200);
  const cacheControl = res.headers.get("cache-control") ?? "";
  // 红化变异：把 handleDownload 改回 "public, max-age=31536000, immutable" → 本断言失败
  expect(cacheControl).not.toContain("public");
  expect(cacheControl).toContain("private");
  // 红化变异：删掉 vary: "Cookie" → 本断言失败（get 返回 null）
  expect(res.headers.get("vary")).toContain("Cookie");
});

test("同一 URL 在两个空间回不同字节（缓存头所防的正是这种复用）", async () => {
  const [alpha, beta] = await Promise.all([
    fetch(`${baseUrl}/webgrp/images/${SHARED_ID}?space=alpha`).then((r) => r.text()),
    fetch(`${baseUrl}/webgrp/images/${SHARED_ID}?space=beta`).then((r) => r.text())
  ]);
  expect(alpha).toBe(ALPHA_BODY);
  expect(beta).toBe(BETA_BODY);
});
