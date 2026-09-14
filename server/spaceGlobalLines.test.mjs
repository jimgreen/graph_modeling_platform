// 全局线路注册表按空间隔离 + 删除空间前的排空时序。
// 注意：HTTP 头值只能是 ByteString，`x-space: 张三` 会被 fetch 直接拒（详见 spaceDispatch.test.mjs），
// 故非 ASCII 空间名一律走 percent-encoded 头或 ?space= query。
import { expect, test, beforeAll, afterAll } from "vitest";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { installDomShim } from "./domShim.mjs";

installDomShim();

const ZHANG_SAN = "张三";
const LI_SI = "李四";
const ZHANG_SAN_QUERY = `?space=${encodeURIComponent(ZHANG_SAN)}`;
const LI_SI_QUERY = `?space=${encodeURIComponent(LI_SI)}`;
const SPACE_HEADERS = { "x-space": encodeURIComponent(ZHANG_SAN) };

let dataDir; let server; let baseUrl; let store;
beforeAll(async () => {
  dataDir = mkdtempSync(join(tmpdir(), "space-global-lines-"));
  process.env.GRAPH_MODEL_DATA_DIR = dataDir;
  const { createImageServer } = await import("./server.mjs");
  const { createSpaceStore } = await import("./spaceStore.mjs");
  store = createSpaceStore(dataDir);
  await store.ensureInitialized();
  await store.create(ZHANG_SAN);
  // 李四：全文件不提前访问过，供「在飞写操作」那条用例使用
  // （注册表首访才写 global-lines.json，写操作因此在请求处理器同步段内入队）
  await store.create(LI_SI);
  // 注入自建 store，避免同进程第二个注册表实例（见 spaceDispatch.test.mjs 的同类说明）
  server = await createImageServer({ port: 0, host: "127.0.0.1", spaceStore: store });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});
afterAll(async () => {
  if (server) await new Promise((r) => server.close(r));
  delete process.env.GRAPH_MODEL_DATA_DIR;
  rmSync(dataDir, { recursive: true, force: true });
});

test("GET /global-lines 按空间返回各自注册表", async () => {
  const def = await fetch(`${baseUrl}/webgrp/global-lines`).then((r) => r.json());
  const zhang = await fetch(`${baseUrl}/webgrp/global-lines${ZHANG_SAN_QUERY}`).then((r) => r.json());
  expect(def).toHaveProperty("records");
  expect(zhang).toHaveProperty("records");

  // 空对空分不出「两套注册表」与「共用一套」：先往张三挂一条记录。
  const attached = await fetch(`${baseUrl}/webgrp/global-lines/attach${ZHANG_SAN_QUERY}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      energyType: "ac",
      name: "跨空间探测线路",
      node: { name: "跨空间探测线路" },
      reference: {
        schemePath: ["方案A"],
        projectName: "模型1",
        nodeId: "line-a",
        boundaryEndpoint: "source"
      }
    })
  });
  expect(attached.status).toBe(201);

  const zhangAfter = await fetch(`${baseUrl}/webgrp/global-lines${ZHANG_SAN_QUERY}`).then((r) => r.json());
  const defAfter = await fetch(`${baseUrl}/webgrp/global-lines`).then((r) => r.json());
  // 张三看得见自己那条；默认空间一条都看不见 —— 共用单例时后者会同步看见
  expect(zhangAfter.records.map((record) => record.name)).toEqual(["跨空间探测线路"]);
  expect(defAfter.records).toHaveLength(0);

  // 落盘位置也要分开：各自空间根下各有一份注册表文件
  expect(existsSync(join(dataDir, "workspaces", ZHANG_SAN, "schemes", "global-lines.json"))).toBe(true);
  expect(existsSync(join(dataDir, "schemes", "global-lines.json"))).toBe(true);
});

test("flush 返回时队列里的写已落盘（排空语义本身）", async () => {
  const { createGlobalLineRegistry } = await import("./globalLineRegistry.mjs");
  const root = join(dataDir, "flush-probe");
  const statePath = join(root, "schemes", "global-lines.json");
  const registry = createGlobalLineRegistry({
    dataRoot: root,
    schemeFilesRoot: join(root, "schemes", "files")
  });
  const pending = registry.list();          // 同步入队一次 writeState(global-lines.json)
  expect(existsSync(statePath)).toBe(false); // 前置：文件此刻还没写出来

  await registry.flush();
  // 不 await pending：flush 的语义就是「返回时队列已空」。
  // 若 flush 只是立刻 resolve，此处文件尚不存在（list 任务还卡在 fileExists 的 fs IO 上）。
  expect(existsSync(statePath)).toBe(true);
  await pending;
});

test("删除空间时排空在飞写队列，目录不复活", async () => {
  const { evictRegistry } = await import("./server.mjs");
  const spaceRoot = join(dataDir, "workspaces", LI_SI);
  const statePath = join(spaceRoot, "schemes", "global-lines.json");
  // 前置：空间目录已被 create 建出，但注册表状态文件尚未生成
  expect(existsSync(spaceRoot)).toBe(true);
  expect(existsSync(statePath)).toBe(false);

  // 发一次请求但不等响应：只为把一个写操作塞进该空间的注册表队列。
  // 'request' 事件在服务端主 handler 的同步段跑完之后才触发（主 handler 的首个 await
  // 是派发路由调用，而 registryFor(paths).list() 的入队发生在那之前），故此刻写已入队。
  const arrived = new Promise((resolve) => server.once("request", resolve));
  const pending = fetch(`${baseUrl}/webgrp/global-lines${LI_SI_QUERY}`);
  await arrived;

  await evictRegistry(spaceRoot);
  // 排空的直接证据：flush 返回时上面那个在飞写必须已经落盘
  expect(existsSync(statePath)).toBe(true);

  await store.remove(LI_SI);
  await pending.catch(() => undefined);
  // 目录确实被建过（上面的断言），故此条不是「从未创建所以为真」；
  // 未排空时队列里的原子写会按旧绝对路径把 workspaces/李四/schemes/ 重新建出来。
  expect(existsSync(spaceRoot)).toBe(false);
});
