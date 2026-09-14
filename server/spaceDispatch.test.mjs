// 派发层注入 paths：三个派发点都要覆盖。
// 注意：HTTP 头值只能是 ByteString，fetch 对 `x-space: 张三` 直接抛
// TypeError（Cannot convert argument to a ByteString）。故非 ASCII 空间名在各通道都要编码：
// X-Space 头与 Cookie 由服务端 decode（resolveSpaceFromRequest / parseSpaceCookie），
// ?space= 由 URLSearchParams 解码。三条通道各有用例；另用 ASCII 空间「zhangsan」
// 覆盖「裸值解码后恒等」这一侧。
import { expect, test, beforeAll, afterAll } from "vitest";
import { mkdtempSync, rmSync, existsSync, mkdirSync, writeFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { installDomShim } from "./domShim.mjs";

installDomShim();

const PNG_1X1 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
const ZHANG_SAN_ENCODED = encodeURIComponent("张三");
const ZHANG_SAN_QUERY = `?space=${ZHANG_SAN_ENCODED}`;
const ZHANG_SAN_COOKIE = `gmp_space=${ZHANG_SAN_ENCODED}`;
const MISSING_COOKIE = `gmp_space=${encodeURIComponent("没了")}`;

let dataDir; let server; let baseUrl;
beforeAll(async () => {
  dataDir = mkdtempSync(join(tmpdir(), "space-dispatch-"));
  process.env.GRAPH_MODEL_DATA_DIR = dataDir;
  const { createImageServer } = await import("./server.mjs");
  const { createSpaceStore } = await import("./spaceStore.mjs");
  // 先建出「张三」：显式来源指向不存在的空间会 400，本文件要测的是「落到对的空间」
  const store = createSpaceStore(dataDir);
  await store.ensureInitialized();
  await store.create("张三");
  // zhangsan：ASCII id，供无法承载中文的头通道（X-Space）使用
  await store.create("zhangsan");
  // sentinel：专供「归档落到哪个回收站」那条破坏性用例，避免与其它用例互相干扰
  await store.create("sentinel");
  // 给「张三」预置一个方案/模型：v1 派发点的空间隔离只有「两空间内容不同」才可观测，
  // 空目录下 v1 两种解析都返回空列表，注入与否同形（该分支会被静默漏测）。
  const zhangSchemeDir = join(dataDir, "workspaces", "张三", "schemes", "files", "方案A");
  mkdirSync(zhangSchemeDir, { recursive: true });
  writeFileSync(join(zhangSchemeDir, "模型1.json"), JSON.stringify({ name: "模型1", idx: 1, nodes: [], edges: [] }), "utf-8");
  // 必须把自己建的 store 注入：否则服务端会另建第二个实例，同进程两个写者
  // 各持整份注册表快照，后写者会用陈旧快照回滚对方的条目。
  server = await createImageServer({ port: 0, host: "127.0.0.1", spaceStore: store });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});
afterAll(async () => {
  if (server) await new Promise((r) => server.close(r));
  delete process.env.GRAPH_MODEL_DATA_DIR;
  rmSync(dataDir, { recursive: true, force: true });
});

test("exact 路由（GET /webgrp/images）按 X-Space 落对空间", async () => {
  const res = await fetch(`${baseUrl}/webgrp/images`, { headers: { "x-space": "zhangsan" } });
  expect(res.status).toBe(200);
  // 空间根下被建出 images 骨架（handler 在回包前已 await 落盘，无需等）
  expect(existsSync(join(dataDir, "workspaces", "zhangsan", "images", "manifest.json"))).toBe(true);
});

test("exact 路由（GET /webgrp/image-folders）按 ?space= 落对空间（中文空间名）", async () => {
  const res = await fetch(`${baseUrl}/webgrp/image-folders${ZHANG_SAN_QUERY}`);
  expect(res.status).toBe(200);
  expect(existsSync(join(dataDir, "workspaces", "张三", "images", "folders.json"))).toBe(true);
});

test("动态路由 /webgrp/images/{id} 读的是空间清单", async () => {
  const up = await fetch(`${baseUrl}/webgrp/images${ZHANG_SAN_QUERY}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ dataUrl: PNG_1X1, name: "空间内图片.png" })
  });
  expect(up.status).toBe(201);
  const { id } = await up.json();
  // 同一 id 在「张三」可下载、在默认空间 404 —— 证明动态派发点的 handler 收到了空间 paths
  const mine = await fetch(`${baseUrl}/webgrp/images/${id}${ZHANG_SAN_QUERY}`);
  expect(mine.status).toBe(200);
  const other = await fetch(`${baseUrl}/webgrp/images/${id}`);
  expect(other.status).toBe(404);
});

test("v1 路由按 Cookie 落对空间并回 X-Space-Fallback 头", async () => {
  const res = await fetch(`${baseUrl}/webgrp/v1/schemes`, { headers: { cookie: ZHANG_SAN_COOKIE } });
  expect(res.status).toBe(200);
  expect(res.headers.get("x-space-fallback")).toBeNull();   // 命中真实空间，不回退
  // v1 派发点确实注入了空间 paths：张三看到自己预置的方案，默认空间看不到
  const mine = await res.json();
  expect(mine.data.schemes.map((scheme) => scheme.name)).toEqual(["方案A"]);
  expect(mine.data.schemes[0].projects.map((p) => p.name)).toEqual(["模型1"]);
  const other = await fetch(`${baseUrl}/webgrp/v1/schemes`).then((r) => r.json());
  expect(other.data.schemes).toEqual([]);

  const fallback = await fetch(`${baseUrl}/webgrp/v1/schemes`, { headers: { cookie: MISSING_COOKIE } });
  expect(fallback.status).toBe(200);
  expect(fallback.headers.get("x-space-fallback")).toBe("1");
});

test("X-Space 头 percent-encoded 中文空间名能命中（与 cookie/query 对称）", async () => {
  // 头值只能是 ByteString，中文 id 必须 percent-encode；服务端须与 cookie 分支对称地解码，
  // 否则解码前的字面量查不到注册表 → 未知空间 → 400（这条用例正是钉住那次解码）。
  const res = await fetch(`${baseUrl}/webgrp/v1/schemes`, { headers: { "x-space": ZHANG_SAN_ENCODED } });
  expect(res.status).toBe(200);
  expect(res.headers.get("x-space-fallback")).toBeNull();   // 命中真实空间，不回退
  const body = await res.json();
  expect(body.data.schemes.map((scheme) => scheme.name)).toEqual(["方案A"]);

  // 未知值也须先解码再报错：400 消息里应是被拒的 id 本身，而不是一串百分号编码
  const unknown = await fetch(`${baseUrl}/webgrp/v1/schemes`, {
    headers: { "x-space": encodeURIComponent("没了") }
  });
  expect(unknown.status).toBe(400);
  expect((await unknown.json()).error.message).toContain("没了");

  // 非法百分号序列（裸 %）不得把 400 变成 500：decodeURIComponent 会抛，须回退原值
  const malformed = await fetch(`${baseUrl}/webgrp/v1/schemes`, { headers: { "x-space": "100%" } });
  expect(malformed.status).toBe(400);
  expect((await malformed.json()).error.message).toContain("100%");
});

test("显式未知空间返回 400 SPACE_UNKNOWN", async () => {
  // 头（ASCII）与 query（percent-encoded 中文）两条显式来源都要求 400，且消息里带被拒 id
  const byHeader = await fetch(`${baseUrl}/webgrp/v1/schemes`, { headers: { "x-space": "nope" } });
  expect(byHeader.status).toBe(400);
  const headerBody = await byHeader.json();
  expect(headerBody.error.code).toBe("SPACE_UNKNOWN");
  // 顺带钉住解析器返回的 unknownValue —— 它没有单元测试覆盖
  // （toMatchObject 不校验额外字段），却是 400 消息里唯一能说出被拒 id 的来源。
  expect(headerBody.error.message).toContain("nope");

  const byQuery = await fetch(`${baseUrl}/webgrp/v1/schemes?space=${encodeURIComponent("没了")}`);
  expect(byQuery.status).toBe(400);
  expect((await byQuery.json()).error.message).toContain("没了");
});

test("配置读写按空间分开，且不串缓存", async () => {
  // 这一条同时钉三件事：
  // 1) 写路由的 handler 真的收到了 paths（否则 PUT 无参调用写函数，落默认空间）
  // 2) sendCachedJsonFile 的 filePath 实参是与 produce 同一空间的路径
  //    （该函数以 filePath 本身作缓存键，传常量会让两空间互相回放载荷）
  // 3) 读路径按空间解析
  const put = await fetch(`${baseUrl}/webgrp/color-config${ZHANG_SAN_QUERY}`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ colorDisplayMode: "voltage", colorPalette: { voltage: { x: "#010203" } } })
  });
  expect(put.status).toBe(200);

  const zhang = await fetch(`${baseUrl}/webgrp/color-config${ZHANG_SAN_QUERY}`).then((r) => r.json());
  const def = await fetch(`${baseUrl}/webgrp/color-config`).then((r) => r.json());
  expect(zhang.colorDisplayMode).toBe("voltage");
  expect(def.colorDisplayMode).toBe("energy");
});

test("三条配置写路由都落空间，不落默认空间", async () => {
  // 上一条测了 color-config 的读写；这条钉住另外两条写路由（以及默认空间未被写入）。
  // 用落盘位置判定，payload 取最小合法值即可 —— 形状无关，只问「写到了哪个根」。
  const targets = [
    ["/measurement-config", "measurement-config.json"],
    ["/device-library", "library.json"]
  ];
  for (const [sub, fileName] of targets) {
    const res = await fetch(`${baseUrl}/webgrp${sub}${ZHANG_SAN_QUERY}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({})
    });
    expect(res.status).toBe(200);
    const defaultRoot = sub === "/device-library"
      ? join(dataDir, "device-library")
      : join(dataDir, "settings");
    expect(existsSync(join(dataDir, "workspaces", "张三", sub === "/device-library" ? "device-library" : "settings", fileName))).toBe(true);
    expect(existsSync(join(defaultRoot, fileName))).toBe(false);
  }
});

test("PUT /schemes 的废弃文件归档到本空间回收站，不落默认空间", async () => {
  // 钉住 writeSchemeFiles 的 options 透传：archiveStaleSchemeFiles 内部用 options.paths
  // 推导 trashRoot，漏传会把本空间的废弃文件丢进**默认空间**的回收站（跨空间写入）。
  const filesRoot = join(dataDir, "workspaces", "sentinel", "schemes", "files");
  const staleDir = join(filesRoot, "旧方案");
  mkdirSync(staleDir, { recursive: true });
  writeFileSync(join(staleDir, "废弃模型.json"), JSON.stringify({ name: "废弃模型", idx: 9, nodes: [], edges: [] }), "utf-8");

  // 提交一份不含该文件的方案清单 → 它成为「不在预期清单里」的废弃文件
  const res = await fetch(`${baseUrl}/webgrp/schemes?space=sentinel`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify([])
  });
  expect(res.status).toBe(200);

  // 原位置已被移走
  expect(existsSync(join(staleDir, "废弃模型.json"))).toBe(false);

  // 本空间回收站里找得到它（<trashRoot>/<时间戳>/<相对路径>）
  const spaceTrash = join(dataDir, "workspaces", "sentinel", "schemes", "trash");
  expect(existsSync(spaceTrash)).toBe(true);
  expect(readdirSync(spaceTrash, { recursive: true }).some((p) => String(p).endsWith("废弃模型.json"))).toBe(true);

  // 默认空间回收站里没有它 —— 缺这一半就分不清「归档对了」与「归档到别处」
  const defaultTrash = join(dataDir, "schemes", "trash");
  const defaultEntries = existsSync(defaultTrash) ? readdirSync(defaultTrash, { recursive: true }) : [];
  expect(defaultEntries.some((p) => String(p).endsWith("废弃模型.json"))).toBe(false);
});

test("/exports/native/* 不受空间校验影响（本机端点）", async () => {
  // 带一个不存在的空间名仍应进入 handler，而非被空间解析拦成 400 SPACE_UNKNOWN。
  // 本机来源校验（isAllowedNativeExportOrigin）会先决定结果，这正是我们要的证明。
  // 必须显式给非本机 Origin：该端点无 Origin 时被判定为「本机」，会真去调起系统另存为对话框。
  const res = await fetch(`${baseUrl}/webgrp/exports/native/select-file`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-space": "nope", origin: "http://evil.example" },
    body: JSON.stringify({})
  });
  const body = await res.json().catch(() => ({}));
  // 关键断言：不是空间解析的 400 SPACE_UNKNOWN
  expect(body?.error?.code).not.toBe("SPACE_UNKNOWN");
  // 且确实进了 handler（本机来源校验的 403），而不是路由没命中
  expect(res.status).toBe(403);
});
