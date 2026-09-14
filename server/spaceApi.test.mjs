// /webgrp/spaces 空间管理端点。
// 这四个端点必须在派发层的空间解析之前短路（见 server.mjs 的 isSpaceAgnostic）：
// 解析覆盖所有路径且发生在路由匹配之前，POST /webgrp/spaces?space=新空间 这类
// 「请求里带着正要创建的名字」的调用会先被判 unknown 400，永远到不了 handler；
// 删除空间后的管理调用也会被静默回退成 default 的身份。
import { expect, test, beforeAll, afterAll } from "vitest";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { request as httpRequest } from "node:http";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import AdmZip from "adm-zip";
import { installDomShim } from "./domShim.mjs";
import { isAcceptableSpaceName, normalizeSpaceName } from "./spaceId.mjs";

installDomShim();

let dataDir; let server; let baseUrl; let store; let writeTextIfChanged;
beforeAll(async () => {
  dataDir = mkdtempSync(join(tmpdir(), "space-api-"));
  process.env.GRAPH_MODEL_DATA_DIR = dataDir;
  const { createImageServer, writeTextIfChanged: writeText } = await import("./server.mjs");
  const { createSpaceStore } = await import("./spaceStore.mjs");
  writeTextIfChanged = writeText;
  // 注入自建 store：下面两条「删除失败」用例要临时替换 store.remove，制造
  // 「fs 报错但空间还在」与「空间已被抢先删掉却仍报错」两种时序
  store = createSpaceStore(dataDir);
  await store.ensureInitialized();
  server = await createImageServer({ port: 0, host: "127.0.0.1", spaceStore: store });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});
afterAll(async () => {
  if (server) await new Promise((r) => server.close(r));
  delete process.env.GRAPH_MODEL_DATA_DIR;
  rmSync(dataDir, { recursive: true, force: true });
});

const json = (body, init = {}) => ({
  method: init.method ?? "GET",
  headers: { "content-type": "application/json", ...(init.headers ?? {}) },
  ...(body ? { body: JSON.stringify(body) } : {})
});

const spaceIds = async () =>
  (await fetch(`${baseUrl}/webgrp/spaces`).then((r) => r.json())).spaces.map((s) => s.id);

const lineBody = {
  energyType: "ac",
  name: "在飞线路",
  node: { name: "在飞线路" },
  reference: { schemePath: ["方案A"], projectName: "模型1", nodeId: "line-a", boundaryEndpoint: "source" }
};

// 写类请求的「只发头、不发体」停靠：服务端跑完派发层同步段（空间解析已按删除前的绝对路径
// 定下 paths）后停在 await readJsonBody 上，此刻它还没碰过任何写盘入口 —— 这正是要钉的窗口。
// 必须走写类路径（PUT/POST）：GET 在同步段就走完，本来就没这个洞。
const parkWriteRequest = (sub, method, space, payload) => {
  let req;
  const arrived = new Promise((resolve) => server.once("request", resolve));
  const status = new Promise((resolve, reject) => {
    req = httpRequest(
      `${baseUrl}/webgrp${sub}?space=${encodeURIComponent(space)}`,
      {
        method,
        headers: { "content-type": "application/json", "content-length": Buffer.byteLength(payload) }
      },
      (res) => {
        res.resume();
        res.on("end", () => resolve(res.statusCode));
      }
    );
    req.on("error", reject);
    req.flushHeaders();
  });
  return { arrived, status, release: () => req.end(payload) };
};

test("GET 返回 spaces 与 current", async () => {
  const res = await fetch(`${baseUrl}/webgrp/spaces`);
  expect(res.status).toBe(200);
  const body = await res.json();
  expect(body.current).toBe("default");
  expect(body.spaces[0]).toMatchObject({ id: "default", pinned: true });
});

test("POST 建空间并建出目录骨架", async () => {
  const res = await fetch(`${baseUrl}/webgrp/spaces`, json({ name: "张三" }, { method: "POST" }));
  expect(res.status).toBe(200);
  const space = await res.json();
  expect(space.id).toBe("张三");
  expect(existsSync(join(dataDir, "workspaces", "张三"))).toBe(true);
});

test("POST 空名返回 400 SPACE_NAME_INVALID", async () => {
  const before = await spaceIds();
  const res = await fetch(`${baseUrl}/webgrp/spaces`, json({ name: "   " }, { method: "POST" }));
  expect(res.status).toBe(400);
  const body = await res.json();
  expect(body.error.code).toBe("SPACE_NAME_INVALID");
  // 钉住「是本端点自己的拒绝」：走 store 的兜底会给出 id "space"，其错误码/文案都不是这一对
  expect(body.error.message).toBe("空间名不能为空。");
  // 拒绝必须无副作用：否则「先建后报错」也会让上面两条断言成立
  expect(await spaceIds()).toEqual(before);
});

test("PUT 改名只改 name", async () => {
  await fetch(`${baseUrl}/webgrp/spaces`, json({ name: "李四" }, { method: "POST" }));
  const res = await fetch(`${baseUrl}/webgrp/spaces`, json({ id: "李四", name: "李四丰" }, { method: "PUT" }));
  expect(res.status).toBe(200);
  const body = await fetch(`${baseUrl}/webgrp/spaces`).then((r) => r.json());
  expect(body.spaces.find((s) => s.id === "李四").name).toBe("李四丰");
  // 只改 name、绝不搬目录：搬迁用户数据失败一次就是数据事故
  expect(existsSync(join(dataDir, "workspaces", "李四"))).toBe(true);
});

test("POST 归一化名字：全角「ＡＢＣ」存成「ABC」", async () => {
  const res = await fetch(`${baseUrl}/webgrp/spaces`, json({ name: "ＡＢＣ" }, { method: "POST" }));
  expect(res.status).toBe(200);
  const space = await res.json();
  // 存**归一后**的名字 —— 否则它正是「能被建成、却往返一次就被改名」的那类名字
  expect(space.name).toBe("ABC");
  expect(space.id).toBe("ABC");
});

test("超长空间名（41 码点）POST 与改名都 400：拒绝而不是静默截断", async () => {
  const tooLong = "名".repeat(41);
  const created = await fetch(`${baseUrl}/webgrp/spaces`, json({ name: tooLong }, { method: "POST" }));
  expect(created.status).toBe(400);
  expect((await created.json()).error.code).toBe("SPACE_NAME_INVALID");
  // 拒绝 ≠ 截断：注册表里不得出现被悄悄截出来的 40 字名
  expect(await spaceIds()).not.toContain("名".repeat(40));

  await fetch(`${baseUrl}/webgrp/spaces`, json({ name: "限长目标" }, { method: "POST" }));
  const renamed = await fetch(`${baseUrl}/webgrp/spaces`, json({ id: "限长目标", name: tooLong }, { method: "PUT" }));
  expect(renamed.status).toBe(400);
  expect((await renamed.json()).error.code).toBe("SPACE_RENAME_FAILED");
  // 拒绝无副作用：既没改也没截
  const listed = await fetch(`${baseUrl}/webgrp/spaces`).then((r) => r.json());
  expect(listed.spaces.find((s) => s.id === "限长目标").name).toBe("限长目标");
});

test("全符号空间名经改名 → 400（POST 早就拒，rename 此前漏了这条）", async () => {
  await fetch(`${baseUrl}/webgrp/spaces`, json({ name: "符号目标" }, { method: "POST" }));
  const res = await fetch(`${baseUrl}/webgrp/spaces`, json({ id: "符号目标", name: "////" }, { method: "PUT" }));
  expect(res.status).toBe(400);
  expect((await res.json()).error.code).toBe("SPACE_RENAME_FAILED");
  const listed = await fetch(`${baseUrl}/webgrp/spaces`).then((r) => r.json());
  expect(listed.spaces.find((s) => s.id === "符号目标").name).toBe("符号目标");
});

test("POST 重名：409 SPACE_NAME_DUPLICATE（不再静默加后缀建第二个同名空间）", async () => {
  const first = await fetch(`${baseUrl}/webgrp/spaces`, json({ name: "重名甲" }, { method: "POST" })).then((r) => r.json());
  const before = await spaceIds();

  const res = await fetch(`${baseUrl}/webgrp/spaces`, json({ name: "重名甲" }, { method: "POST" }));

  expect(res.status).toBe(409);
  const body = await res.json();
  expect(body.error.code).toBe("SPACE_NAME_DUPLICATE");
  // 前端要靠这两个字段说清「撞的是哪一个」，故对冲突者 id 直接断言
  expect(body.name).toBe("重名甲");
  expect(body.conflictId).toBe(first.id);
  expect(await spaceIds()).toEqual(before);
});

test("PUT 改名撞上别的空间：409；原样改回自己的名字仍 200（不是撞车）", async () => {
  await fetch(`${baseUrl}/webgrp/spaces`, json({ name: "重名乙" }, { method: "POST" }));
  await fetch(`${baseUrl}/webgrp/spaces`, json({ name: "重名丙" }, { method: "POST" }));

  const clash = await fetch(`${baseUrl}/webgrp/spaces`, json({ id: "重名丙", name: "重名乙" }, { method: "PUT" }));
  expect(clash.status).toBe(409);
  const clashBody = await clash.json();
  expect(clashBody.error.code).toBe("SPACE_NAME_DUPLICATE");
  expect(clashBody.conflictId).toBe("重名乙");

  // 原样改回自己的名字是合法 no-op：判重必须排除自己，否则改名框一打开就 409
  const noop = await fetch(`${baseUrl}/webgrp/spaces`, json({ id: "重名丙", name: "重名丙" }, { method: "PUT" }));
  expect(noop.status).toBe(200);
  const listed = await fetch(`${baseUrl}/webgrp/spaces`).then((r) => r.json());
  expect(listed.spaces.find((s) => s.id === "重名丙").name).toBe("重名丙");
});

test("DELETE pinned 空间返回 400 SPACE_PINNED", async () => {
  const res = await fetch(`${baseUrl}/webgrp/spaces`, json({ id: "default" }, { method: "DELETE" }));
  expect(res.status).toBe(400);
  const body = await res.json();
  expect(body.error.code).toBe("SPACE_PINNED");
  // 文案必须是端点自己那条：只靠 code 分不出「端点先拦」与「store 拒绝后落到同一个映射」
  expect(body.error.message).toBe("default 空间不可删除。");
});

test("DELETE 普通空间移入 trash-spaces", async () => {
  await fetch(`${baseUrl}/webgrp/spaces`, json({ name: "待删" }, { method: "POST" }));
  const res = await fetch(`${baseUrl}/webgrp/spaces`, json({ id: "待删" }, { method: "DELETE" }));
  expect(res.status).toBe(200);
  expect(existsSync(join(dataDir, "workspaces", "待删"))).toBe(false);
  expect(existsSync(join(dataDir, "trash-spaces"))).toBe(true);
  // 只断言回收站目录存在，分不出「归档了」与「删没了」——载荷本身必须能在回收站里找到
  const archived = readdirSync(join(dataDir, "trash-spaces"), { recursive: true }).map(String);
  expect(archived.some((entry) => entry.split(/[\\/]/).includes("待删"))).toBe(true);
  // 登记表也要同步摘掉，否则后续请求会解析到一个已不存在的空间
  expect(await spaceIds()).not.toContain("待删");
});

test("current 随 cookie 变化，与请求实际生效空间一致", async () => {
  // 头值只能是 ByteString：中文空间名必须 percent-encode，服务端 parseSpaceCookie 会解码
  const res = await fetch(`${baseUrl}/webgrp/spaces`, {
    headers: { cookie: `gmp_space=${encodeURIComponent("张三")}` }
  });
  expect((await res.json()).current).toBe("张三");
});

test("GET 刷新当前空间的 lastAccessAt（活跃度只在这里刷）", async () => {
  const res = await fetch(`${baseUrl}/webgrp/spaces`, {
    headers: { cookie: `gmp_space=${encodeURIComponent("张三")}` }
  });
  const { spaces } = await res.json();
  // 张三由本文件的 POST 建出，此前从未被访问过，故这条只可能由本次 GET 写出来
  expect(typeof spaces.find((s) => s.id === "张三").lastAccessAt).toBe("string");
});

test("删除期间在飞的写请求不会把已删空间的目录建回来（body 读取窗口）", async () => {
  const space = "删除中";
  await fetch(`${baseUrl}/webgrp/spaces`, json({ name: space }, { method: "POST" }));
  const spaceRoot = join(dataDir, "workspaces", space);
  expect(existsSync(spaceRoot)).toBe(true);

  const parked = parkWriteRequest("/global-lines/attach", "POST", space, JSON.stringify(lineBody));
  // 该请求已完成同步段（空间解析过、paths 已按旧根定下），且仍卡在等 body
  await parked.arrived;

  const del = await fetch(`${baseUrl}/webgrp/spaces`, json({ id: space }, { method: "DELETE" }));
  expect(del.status).toBe(200);
  expect(existsSync(spaceRoot)).toBe(false);

  parked.release();
  // 被退休登记挡下（409），而不是照旧写入
  expect(await parked.status).toBe(409);
  // 关键断言：它没有按旧绝对路径把 workspaces/删除中/ 重新建出来
  expect(existsSync(spaceRoot)).toBe(false);
});

test("删除期间在飞的方案保存请求不会让已删空间的目录复活（写盘入口的结构性守卫）", async () => {
  // 上一类窗口不止全局线路有：PUT /webgrp/schemes 的体上限 64MB、调用频率更高，
  // 它的写盘入口是 ensureSchemeStore（mkdir paths.schemeFiles），必须被同一道守卫拦住。
  // 只护住 registryFor 是堵不住的 —— 评审实测过。
  const space = "写方案中";
  await fetch(`${baseUrl}/webgrp/spaces`, json({ name: space }, { method: "POST" }));
  const spaceRoot = join(dataDir, "workspaces", space);
  expect(existsSync(spaceRoot)).toBe(true);

  const parked = parkWriteRequest("/schemes", "PUT", space, JSON.stringify([]));
  await parked.arrived;

  const del = await fetch(`${baseUrl}/webgrp/spaces`, json({ id: space }, { method: "DELETE" }));
  expect(del.status).toBe(200);
  expect(existsSync(spaceRoot)).toBe(false);

  parked.release();
  expect(await parked.status).toBe(409);
  expect(existsSync(spaceRoot)).toBe(false);
});

test("删除期间在飞的配置保存请求不会让已删空间的目录复活（settings 一族绕开了那三个入口）", async () => {
  // 评审点名的三个入口并不覆盖 settings 一族：PUT /webgrp/color-config 走的是
  // writeJsonStoreFile（自己 mkdir），不经过 ensureStore / ensureJsonStoreFile / ensureSchemeStore。
  // 故守卫加了那一处，这条钉住它。
  const space = "写配置中";
  await fetch(`${baseUrl}/webgrp/spaces`, json({ name: space }, { method: "POST" }));
  const spaceRoot = join(dataDir, "workspaces", space);

  const parked = parkWriteRequest("/color-config", "PUT", space, JSON.stringify({ colorDisplayMode: "voltage" }));
  await parked.arrived;

  const del = await fetch(`${baseUrl}/webgrp/spaces`, json({ id: space }, { method: "DELETE" }));
  expect(del.status).toBe(200);
  expect(existsSync(spaceRoot)).toBe(false);

  parked.release();
  expect(await parked.status).toBe(409);
  expect(existsSync(join(spaceRoot, "settings"))).toBe(false);
  expect(existsSync(spaceRoot)).toBe(false);
});

test("删除期间在飞的方案记录创建请求：409 且目录不复活", async () => {
  // 复审实测：这条路径修复前是 200 + 目录复活 —— 它的写盘入口只有 mkdir(schemeDir)，
  // 后面没有任何 registryFor 兜底，故守卫必须落在 mkdir 原语上，不能靠「入口」枚举。
  const space = "方案记录";
  await fetch(`${baseUrl}/webgrp/spaces`, json({ name: space }, { method: "POST" }));
  const spaceRoot = join(dataDir, "workspaces", space);

  const parked = parkWriteRequest("/schemes/scheme", "PUT", space, JSON.stringify({ schemePath: ["方案A"] }));
  await parked.arrived;

  const del = await fetch(`${baseUrl}/webgrp/spaces`, json({ id: space }, { method: "DELETE" }));
  expect(del.status).toBe(200);
  expect(existsSync(spaceRoot)).toBe(false);

  parked.release();
  expect(await parked.status).toBe(409);
  expect(existsSync(spaceRoot)).toBe(false);
});

test("删除期间在飞的模型保存请求：409 且目录不复活（不是被后来的 registryFor 兜住）", async () => {
  // 复审实测：这条修复前是「409 但目录已复活」—— 409 来自 writeSchemeFiles 末尾的
  // registryFor，而 mkdir(schemeDir) 早就把目录建回来了。故「目录不复活」才是判据：
  // 只断言状态码分不出「真被原语拦住」与「先复活后补发 409」。
  const space = "模型保存";
  await fetch(`${baseUrl}/webgrp/spaces`, json({ name: space }, { method: "POST" }));
  const spaceRoot = join(dataDir, "workspaces", space);

  const parked = parkWriteRequest(
    "/schemes/project",
    "PUT",
    space,
    JSON.stringify({ schemePath: ["方案A"], record: { name: "模型1", project: { name: "模型1", nodes: [], edges: [] } } })
  );
  await parked.arrived;

  const del = await fetch(`${baseUrl}/webgrp/spaces`, json({ id: space }, { method: "DELETE" }));
  expect(del.status).toBe(200);
  expect(existsSync(spaceRoot)).toBe(false);

  parked.release();
  expect(await parked.status).toBe(409);
  expect(existsSync(spaceRoot)).toBe(false);
});

test("删除失败但空间仍在（fs 报错）时，该空间必须恢复可写", async () => {
  // Windows 上目录内有占用句柄时 rename 会 EPERM/EBUSY，删除失败不是纯理论。
  // 此刻空间仍在注册表里，登记必须撤下，否则这个活着的空间被永久拒写。
  const space = "顽固";
  await fetch(`${baseUrl}/webgrp/spaces`, json({ name: space }, { method: "POST" }));
  const realRemove = store.remove.bind(store);
  store.remove = async () => {
    throw new Error("模拟 rename 失败（EPERM）");
  };
  try {
    const res = await fetch(`${baseUrl}/webgrp/spaces`, json({ id: space }, { method: "DELETE" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("SPACE_DELETE_FAILED");
  } finally {
    store.remove = realRemove;
  }
  expect(existsSync(join(dataDir, "workspaces", space))).toBe(true);

  const res = await fetch(
    `${baseUrl}/webgrp/global-lines/attach?space=${encodeURIComponent(space)}`,
    json(lineBody, { method: "POST" })
  );
  expect(res.status).toBe(201);
});

test("删除已被抢先删掉的空间：失败分支不得撤下登记", async () => {
  // 并发两个 DELETE 时，后到者的 remove 会看到「未知空间」而抛错，但空间确实已经没了。
  // 若失败分支按「有没有抛错」无条件撤下，那条卡在读体、拿着旧根的在飞请求立刻
  // 能把已删空间写回来 —— 故撤下条件必须是「空间是否还在」。
  const space = "抢先";
  await fetch(`${baseUrl}/webgrp/spaces`, json({ name: space }, { method: "POST" }));
  const spaceRoot = join(dataDir, "workspaces", space);

  const parked = parkWriteRequest("/global-lines/attach", "POST", space, JSON.stringify(lineBody));
  await parked.arrived;

  const realRemove = store.remove.bind(store);
  store.remove = async (id) => {
    await realRemove(id);            // 空间真的被删掉（模拟被抢先）
    throw new Error(`未知空间：${id}`);
  };
  try {
    const res = await fetch(`${baseUrl}/webgrp/spaces`, json({ id: space }, { method: "DELETE" }));
    expect(res.status).toBe(400);
  } finally {
    store.remove = realRemove;
  }
  expect(existsSync(spaceRoot)).toBe(false);

  parked.release();
  expect(await parked.status).toBe(409);
  expect(existsSync(spaceRoot)).toBe(false);
});

test("同名空间重建后恢复正常写入（退休登记要随重建撤下）", async () => {
  // 上一条把「删除中」的根登记为已退休。同名空间会复用同一个 id（即同一个根），
  // 若重建时不撤下登记，这个新空间一出生就被拒写 —— 这条钉住那条撤下。
  const again = await fetch(`${baseUrl}/webgrp/spaces`, json({ name: "删除中" }, { method: "POST" }));
  expect(again.status).toBe(200);
  expect((await again.json()).id).toBe("删除中");

  const res = await fetch(`${baseUrl}/webgrp/global-lines/attach?space=${encodeURIComponent("删除中")}`, json({
    energyType: "ac",
    name: "重建后线路",
    node: { name: "重建后线路" },
    reference: { schemePath: ["方案A"], projectName: "模型1", nodeId: "line-a", boundaryEndpoint: "source" }
  }, { method: "POST" }));
  expect(res.status).toBe(201);
  expect(existsSync(join(dataDir, "workspaces", "删除中", "schemes", "global-lines.json"))).toBe(true);
});

test("管理端点不参与空间解析：可携带尚不存在 / 已删除的空间名", async () => {
  // 不短路时，空间解析会在路由匹配前把这两条请求拦成 400 SPACE_UNKNOWN：
  // 第一条带的名字正是它要创建的（此刻还不存在），第二条带的名字刚被删掉。
  const created = await fetch(
    `${baseUrl}/webgrp/spaces?space=${encodeURIComponent("新空间")}`,
    json({ name: "新空间" }, { method: "POST" })
  );
  expect(created.status).toBe(200);
  expect((await created.json()).id).toBe("新空间");

  const deleted = await fetch(`${baseUrl}/webgrp/spaces`, json({ id: "新空间" }, { method: "DELETE" }));
  expect(deleted.status).toBe(200);

  const after = await fetch(`${baseUrl}/webgrp/spaces?space=${encodeURIComponent("新空间")}`);
  expect(after.status).toBe(200);
  // current 仍走解析：显式给的未知空间名不拦管理端点，只回落首个空间
  expect((await after.json()).current).toBe("default");
});

test("退休空间内的文本写盘被拒（writeTextIfChanged 是 mkdir 之外的第二条建目录路径）", async () => {
  // atomicWriteFile 内部自己 mkdir(dirname)，这条建目录路径既不经 mkdirInSpace、也 grep 不到，
  // 故 writeTextIfChanged 开头必须有独立判定。它无法从 HTTP 侧构造出「未经 mkdirInSpace」的调用
  // （现有 4 个调用点前都紧邻一个被守的 mkdir），所以直接调它来钉这条守卫。
  const space = "退役写盘";
  await fetch(`${baseUrl}/webgrp/spaces`, json({ name: space }, { method: "POST" }));
  const spaceRoot = join(dataDir, "workspaces", space);
  await fetch(`${baseUrl}/webgrp/spaces`, json({ id: space }, { method: "DELETE" }));
  expect(existsSync(spaceRoot)).toBe(false);

  await expect(writeTextIfChanged(join(spaceRoot, "schemes", "probe.json"), "{}"))
    .rejects.toThrow("已拒绝写入");
  // 关键断言：没有守卫时 atomicWriteFile 的内部 mkdir 会把整棵目录树建回来
  expect(existsSync(spaceRoot)).toBe(false);
});

// 空间 ZIP 导入导出。种子直接写盘的写法见本文件既有用例（空间根 = workspaces/<id>）。
const spaceRootOf = (id) => (id === "default" ? dataDir : join(dataDir, "workspaces", id));
function seedSpaceFile(id, relativePath, content) {
  const full = join(spaceRootOf(id), relativePath);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, content);
}
function zipEntryNames(buffer) {
  return new AdmZip(buffer).getEntries().map((entry) => entry.entryName).sort();
}

test("导出：返回 zip，含该空间的方案与图片，且不含 trash", async () => {
  const created = await (await fetch(`${baseUrl}/webgrp/spaces`, json({ name: "导出源" }, { method: "POST" }))).json();
  seedSpaceFile(created.id, "schemes/files/a.json", '{"a":1}');
  seedSpaceFile(created.id, "images/x.png", "PNGDATA");
  seedSpaceFile(created.id, "schemes/trash/t/old.json", "{}");

  const response = await fetch(`${baseUrl}/webgrp/spaces/export?space=${encodeURIComponent(created.id)}`);
  expect(response.status).toBe(200);
  expect(response.headers.get("content-type")).toContain("application/zip");

  const names = zipEntryNames(Buffer.from(await response.arrayBuffer()));
  expect(names).toContain("导出源/schemes/files/a.json");
  expect(names).toContain("导出源/images/x.png");
  expect(names.some((name) => name.includes("/trash/"))).toBe(false);
});

test("导出 default 空间不含 spaces.json 与其它空间", async () => {
  await fetch(`${baseUrl}/webgrp/spaces`, json({ name: "别的空间" }, { method: "POST" }));
  seedSpaceFile("default", "schemes/files/a.json", "{}");

  const response = await fetch(`${baseUrl}/webgrp/spaces/export`);
  const names = zipEntryNames(Buffer.from(await response.arrayBuffer()));

  // 顶层目录名取**空间名**（规格 §3），不是空间 id：default 空间的 name 是「默认空间」
  // （spaceStore.load 注册 default 时写死），故这里断言的是名字。
  expect(names).toContain("默认空间/schemes/files/a.json");
  expect(names.some((name) => name.includes("spaces.json"))).toBe(false);
  expect(names.some((name) => name.includes("workspaces/"))).toBe(false);
});

test("空间名含路径分隔符：顶层目录名被净化，但 meta 里存原名（导入后名字无损）", async () => {
  // POST /spaces 与 PUT /spaces 都不禁分隔符（只 trim + 拒绝全符号名），故 "带/斜杠" 是合法空间名。
  // 建包器不做净化 → 净化版（只给包内目录名与文件名）必须由导出端点算出来，
  // 否则 ZIP 顶层目录名会被拆成两段，导入端的「单一顶层目录」判定与文件名都被污染。
  const created = await (await fetch(`${baseUrl}/webgrp/spaces`, json({ name: "带/斜杠" }, { method: "POST" }))).json();
  seedSpaceFile(created.id, "schemes/files/a.json", "{}");

  const response = await fetch(`${baseUrl}/webgrp/spaces/export?space=${encodeURIComponent(created.id)}`);
  expect(response.status).toBe(200);
  const buffer = Buffer.from(await response.arrayBuffer());
  const names = zipEntryNames(buffer);

  // 顶层目录名取净化后的**空间名**（"/" → "_"，见 sanitizeSegment），不是 id（"带-斜杠"）
  expect(names).toContain("带_斜杠/schemes/files/a.json");
  expect(new Set(names.map((name) => name.split("/")[0]))).toEqual(new Set(["带_斜杠"]));
  // 净化名只用于目录与文件名；meta 里必须是**原名**，否则名字不可能无损往返
  const meta = JSON.parse(new AdmZip(buffer).getEntry("带_斜杠/space.json").getData().toString("utf8"));
  expect(meta.name).toBe("带/斜杠");

  // 端到端往返：包内名与刚导出的那个空间撞车 → 409，且冲突信息里的名字是**原名**（带 / 而非带_）。
  // 「名字无损往返」这条判据在这里就能验完：后端若把名字净化过，这里拿到的会是「带_斜杠」。
  const before = await spaceIds();
  const conflict = await fetch(`${baseUrl}/webgrp/spaces/import`, {
    method: "POST",
    headers: { "content-type": "application/zip" },
    body: buffer
  });
  expect(conflict.status).toBe(409);
  const conflictBody = await conflict.json();
  expect(conflictBody.error.code).toBe("SPACE_NAME_DUPLICATE");
  expect(conflictBody.name).toBe("带/斜杠");
  expect(conflictBody.conflictId).toBe(created.id);
  // 撞车必须无副作用：拒在建之前，注册表一个不多
  expect(await spaceIds()).toEqual(before);

  // 换成用户给的新名再导：内容随包落盘，显示名 = 新名（不是包内名）
  const renamed = await fetch(`${baseUrl}/webgrp/spaces/import?mode=rename&name=${encodeURIComponent("带回斜杠")}`, {
    method: "POST",
    headers: { "content-type": "application/zip" },
    body: buffer
  }).then((r) => r.json());
  expect(renamed.space.name).toBe("带回斜杠");
  expect(readFileSync(join(spaceRootOf(renamed.space.id), "schemes", "files", "a.json"), "utf8")).toBe("{}");
});

test("导入：新建空间、落盘树与包内一致（含非 .json 条目）", async () => {
  const zip = new AdmZip();
  zip.addFile("我的空间/space.json", Buffer.from(JSON.stringify({ formatVersion: 1, name: "我的空间" })));
  zip.addFile("我的空间/schemes/files/a.json", Buffer.from('{"a":1}'));
  zip.addFile("我的空间/images/x.png", Buffer.from("PNGDATA"));
  // .svg/.e 后缀的见证条目：方案解包器按后缀跳过它们，空间解包器不跳（规格 §4.4：原样铺开）
  zip.addFile("我的空间/icons/old.svg", Buffer.from("<svg/>"));

  const response = await fetch(`${baseUrl}/webgrp/spaces/import`, {
    method: "POST",
    headers: { "content-type": "application/zip" },
    body: zip.toBuffer()
  });
  const payload = await response.json();

  expect(response.status).toBe(200);
  expect(payload.ok).toBe(true);
  expect(payload.space.name).toBe("我的空间");
  // 非 .json 条目必须落盘 —— 这两条一起钉住「没有整段复用方案解包器」：
  // 图片走「不是 .json」这一路，.svg 走「不被后缀过滤」这一路（后者才是两版解包器的真正分水岭）
  expect(readFileSync(join(spaceRootOf(payload.space.id), "images", "x.png"), "utf8")).toBe("PNGDATA");
  expect(readFileSync(join(spaceRootOf(payload.space.id), "icons", "old.svg"), "utf8")).toBe("<svg/>");
  expect(readFileSync(join(spaceRootOf(payload.space.id), "schemes", "files", "a.json"), "utf8")).toBe('{"a":1}');
  // 元信息不落盘
  expect(existsSync(join(spaceRootOf(payload.space.id), "space.json"))).toBe(false);
  // space.json 里的名字被采用
  expect((await spaceIds())).toContain(payload.space.id);
});

// 空间名唯一：同名包再导一次**不再**静默加后缀建第二个，而是 409 交前端询问
//（覆盖 / 重命名由用户定，见后面两条 mode 用例）。这条钉的是「缺省导入不建」。
test("同名包导入两次：第二次 409 SPACE_NAME_DUPLICATE，且不偷偷建出第二个同名空间", async () => {
  const makeZip = () => {
    const zip = new AdmZip();
    zip.addFile("同名空间/space.json", Buffer.from(JSON.stringify({ formatVersion: 1, name: "同名空间" })));
    zip.addFile("同名空间/schemes/files/a.json", Buffer.from("{}"));
    return zip.toBuffer();
  };
  const post = () => fetch(`${baseUrl}/webgrp/spaces/import`, {
    method: "POST",
    headers: { "content-type": "application/zip" },
    body: makeZip()
  });

  const firstResponse = await post();
  const first = await firstResponse.json();
  expect(firstResponse.status).toBe(200);

  const after = await spaceIds();
  const secondResponse = await post();
  const second = await secondResponse.json();

  expect(secondResponse.status).toBe(409);
  expect(second.error.code).toBe("SPACE_NAME_DUPLICATE");
  // 冲突信息要够前端弹询问框：撞的是哪个名字、哪个 id
  expect(second.name).toBe("同名空间");
  expect(second.conflictId).toBe(first.space.id);
  // 旧的「加后缀建第二个」若回来，这条必红
  expect(after).toEqual(await spaceIds());
});

// 覆盖是**不可逆**动作（旧空间进 trash-spaces/，界面上找不回），故钉三样：
// id 被复用（不是并存两个）、旧内容消失、旧目录确实被归档而不是被真删。
test("导入 mode=overwrite：同名空间被替换，旧目录进 trash-spaces", async () => {
  const target = await fetch(`${baseUrl}/webgrp/spaces`, json({ name: "覆盖空间" }, { method: "POST" })).then((r) => r.json());
  seedSpaceFile(target.id, "schemes/files/old.json", '{"old":1}');
  const before = await spaceIds();

  const zip = new AdmZip();
  zip.addFile("覆盖空间/space.json", Buffer.from(JSON.stringify({ formatVersion: 1, name: "覆盖空间" })));
  zip.addFile("覆盖空间/schemes/files/new.json", Buffer.from('{"new":1}'));

  const response = await fetch(`${baseUrl}/webgrp/spaces/import?mode=overwrite`, {
    method: "POST",
    headers: { "content-type": "application/zip" },
    body: zip.toBuffer()
  });
  const payload = await response.json();

  expect(response.status).toBe(200);
  expect(payload.space.name).toBe("覆盖空间");
  // 先删后建 ⇒ 同名 slug 复用同一个 id：是「替换」而不是「并存」
  expect(payload.space.id).toBe(target.id);
  expect((await spaceIds()).slice().sort()).toEqual(before.slice().sort());
  expect(readFileSync(join(spaceRootOf(payload.space.id), "schemes", "files", "new.json"), "utf8")).toBe('{"new":1}');
  expect(existsSync(join(spaceRootOf(payload.space.id), "schemes", "files", "old.json"))).toBe(false);
  // 旧空间被归档而非真删（判据是**旧内容**躺在某个 trash 时间戳下，不是「trash 目录存在」——
  // 前面若干删除用例已经让这个目录存在了，那样等于没断言）
  const archived = readdirSync(join(dataDir, "trash-spaces"))
    .some((stamp) => existsSync(join(dataDir, "trash-spaces", stamp, "覆盖空间", "schemes", "files", "old.json")));
  expect(archived).toBe(true);
});

test("导入 mode=rename 撞上已有空间名：还是 409，不静默加后缀（前端可再问一次）", async () => {
  await fetch(`${baseUrl}/webgrp/spaces`, json({ name: "改名占用" }, { method: "POST" }));
  await fetch(`${baseUrl}/webgrp/spaces/import?mode=rename&name=${encodeURIComponent("改名占用")}`, {
    method: "POST",
    headers: { "content-type": "application/zip" },
    body: (() => {
      const zip = new AdmZip();
      zip.addFile("改名源/space.json", Buffer.from(JSON.stringify({ formatVersion: 1, name: "改名源" })));
      zip.addFile("改名源/schemes/files/a.json", Buffer.from("{}"));
      return zip.toBuffer();
    })()
  }).then(async (r) => {
    expect(r.status).toBe(409);
    expect((await r.json()).error.code).toBe("SPACE_NAME_DUPLICATE");
  });
  // 409 之后没建出任何东西
  expect(await spaceIds()).not.toContain("改名源");
});

test("导入 mode=rename 但名字不合格：400，不静默回退成包内名", async () => {
  const before = await spaceIds();
  const zip = new AdmZip();
  zip.addFile("包内名/space.json", Buffer.from(JSON.stringify({ formatVersion: 1, name: "包内名" })));
  zip.addFile("包内名/schemes/files/a.json", Buffer.from("{}"));

  const response = await fetch(`${baseUrl}/webgrp/spaces/import?mode=rename&name=${encodeURIComponent("////")}`, {
    method: "POST",
    headers: { "content-type": "application/zip" },
    body: zip.toBuffer()
  });

  // 明确要求了改名却给不出合格名字：回退成包内名等于把用户的意图悄悄换掉
  expect(response.status).toBe(400);
  expect((await response.json()).error.code).toBe("SPACE_NAME_INVALID");
  expect(await spaceIds()).toEqual(before);
});

test("导入 mode 取值非法：400 SPACE_IMPORT_MODE_INVALID", async () => {
  const before = await spaceIds();
  const zip = new AdmZip();
  zip.addFile("随便/space.json", Buffer.from(JSON.stringify({ formatVersion: 1, name: "随便" })));

  const response = await fetch(`${baseUrl}/webgrp/spaces/import?mode=replace`, {
    method: "POST",
    headers: { "content-type": "application/zip" },
    body: zip.toBuffer()
  });

  expect(response.status).toBe(400);
  expect((await response.json()).error.code).toBe("SPACE_IMPORT_MODE_INVALID");
  expect(await spaceIds()).toEqual(before);
});

test("zip-slip：含 ../ 的包被拒且不落盘", async () => {
  const zip = new AdmZip();
  zip.addFile("坏包/schemes/files/a.json", Buffer.from("{}"));
  // AdmZip 的 addFile 会 canonical() 归一化条目名（"坏包/../evil.txt" 在入库时就被压成 "evil.txt"），
  // 故必须先按安全名加进去、再改回带 .. 的名字，否则构造出来的根本不是一个恶意包。
  zip.addFile("坏包/evil.txt", Buffer.from("evil")).entryName = "坏包/../evil.txt";

  const response = await fetch(`${baseUrl}/webgrp/spaces/import`, {
    method: "POST",
    headers: { "content-type": "application/zip" },
    body: zip.toBuffer()
  });

  expect(response.status).toBe(400);
  // 该载荷的逃逸落点是**空间根的上一级**（workspaces/evil.txt）；再往上是数据根外层，一并钉住。
  // 只断言 dataDir/evil.txt 是不够的 —— 它离真正的落点还差一层，守卫失效时会放过
  expect(existsSync(join(dataDir, "workspaces", "evil.txt"))).toBe(false);
  expect(existsSync(join(dataDir, "evil.txt"))).toBe(false);
  expect(existsSync(join(dataDir, "..", "evil.txt"))).toBe(false);
});

test("zip-slip（目录条目）：目录里的 ../ 一路走到解包器才被拒，且回滚不残留", async () => {
  // 上一条的 **文件** 条目在空间定名阶段就被挡（zipRootNameFor 只看非目录条目）；
  // **目录**条目不参与那次校验，故只有它能真正打到解包器的 zipEntryParts / isPathInside ——
  // 那条守卫本来没有用例能走到，重写安全边界后必须补上这条。
  const before = await spaceIds();
  const zip = new AdmZip();
  zip.addFile("越界目录/schemes/files/a.json", Buffer.from("{}"));
  // 末尾的 / 让它仍是目录条目（isDirectory=true）；同前：AdmZip 会 canonical() 掉 ..，
  // 故按安全名加进去再改回带 .. 的名字。
  zip.addFile("越界目录/evil/", Buffer.from("")).entryName = "越界目录/../evil/";

  const response = await fetch(`${baseUrl}/webgrp/spaces/import`, {
    method: "POST",
    headers: { "content-type": "application/zip" },
    body: zip.toBuffer()
  });

  expect(response.status).toBe(400);
  // 一个字节都没落到目标根之外（workspaces/evil 是这条载荷最近的逃逸落点，再往上是数据根外层）
  expect(existsSync(join(dataDir, "workspaces", "evil"))).toBe(false);
  expect(existsSync(join(dataDir, "evil"))).toBe(false);
  expect(existsSync(join(dataDir, "..", "evil"))).toBe(false);
  // 目录条目也走回滚：空间不残留
  expect(await spaceIds()).toEqual(before);
  expect(existsSync(join(dataDir, "workspaces", "越界目录"))).toBe(false);
});

test("导入中途失败：不留半成品空间，已建的那个被撤掉", async () => {
  const before = await spaceIds();
  const zip = new AdmZip();
  // 一条文件条目与它自己的子路径冲突：先落成 boom 文件，再为 boom/nested.json 建目录 → EEXIST。
  // 这一步必须发生在**解包中途**（空间已 create、前面的条目已落盘），才钉得住回滚。
  zip.addFile("半途失败/boom", Buffer.from("x"));
  zip.addFile("半途失败/boom/nested.json", Buffer.from("{}"));

  const response = await fetch(`${baseUrl}/webgrp/spaces/import`, {
    method: "POST",
    headers: { "content-type": "application/zip" },
    body: zip.toBuffer()
  });

  expect(response.status).toBe(400);
  expect(await spaceIds()).toEqual(before);
  // 「登记表里没有」也可能是「根本没建过」——故再钉「确实建过又被撤掉」：去回收站里查到它的目录
  // （只断言 trash-spaces 目录存在是恒真的：本文件更早的删除用例早就把它建出来了）
  expect(existsSync(join(dataDir, "workspaces", "半途失败"))).toBe(false);
  const archived = readdirSync(join(dataDir, "trash-spaces"), { recursive: true }).map(String);
  expect(archived.some((entry) => entry.split(/[\\/]/).includes("半途失败"))).toBe(true);
});

test("失败回滚要恢复退休登记：复用一个刚被删掉的 id 时，回滚后旧根仍被拒写", async () => {
  // 该 id 的根在本次导入前就处于「已退休」态（删除时登记的）。导入成功后撤下登记是必要的，
  // 但**回滚删掉空间后必须加回去** —— store.remove 只改名目录 + 摘注册表，够不着模块级的
  // retiredSpaceRoots，留下「未登记、未注册」的根，卡在读体、拿着旧根的在飞写请求就能重建骨架。
  const space = "回收复用";
  await fetch(`${baseUrl}/webgrp/spaces`, json({ name: space }, { method: "POST" }));
  const spaceRoot = join(dataDir, "workspaces", space);
  const removed = await fetch(`${baseUrl}/webgrp/spaces`, json({ id: space }, { method: "DELETE" }));
  expect(removed.status).toBe(200);
  expect(existsSync(spaceRoot)).toBe(false);   // 删除成功 → 该根已登记为退休

  // 同名导入会复用同一个 id（即同一个根），并在解包中途失败 → 走回滚
  const zip = new AdmZip();
  zip.addFile(`${space}/boom`, Buffer.from("x"));
  zip.addFile(`${space}/boom/nested.json`, Buffer.from("{}"));
  const response = await fetch(`${baseUrl}/webgrp/spaces/import`, {
    method: "POST",
    headers: { "content-type": "application/zip" },
    body: zip.toBuffer()
  });
  expect(response.status).toBe(400);
  expect(await spaceIds()).not.toContain(space);

  // 判据 = 退休登记被加回来了。这条守卫无法从 HTTP 侧构造出「未经 mkdirInSpace」的调用，
  // 故直接调 writeTextIfChanged（同「退休空间内的文本写盘被拒」那条）。
  await expect(writeTextIfChanged(join(spaceRoot, "schemes", "probe.json"), "{}"))
    .rejects.toThrow("已拒绝写入");
  // 关键断言：没有守卫时 atomicWriteFile 的内部 mkdir 会把整棵目录树建回来
  expect(existsSync(spaceRoot)).toBe(false);
});

// 「删除空间 → 导入它的备份」这条流的**正向**用例：成功路径那句
// `retiredSpaceRoots.delete(spaceRoot)`（server.mjs）是它唯一的使能者 ——
// 删除时该根被登记退休且成功后不撤下；导入复用同一 id ⇒ 同一根；不撤登记则解包首个
// mkdirInSpace 被 assertNotRetiredRoot 拒成 400。上一条用例故意让导入失败，钉的是**补回**那一半，
// 故没有这条正向用例时，删掉那句 delete 不会有任何断言变红（删空间后导回备份直接 400 而 CI 不吭声）。
test("删除空间后导入它的备份：复用同一 id，退休登记被撤下，导入成功且文件落盘", async () => {
  // 名字必须与上一条不同：那个根（"回收复用"）会被它**永久**留在 retiredSpaceRoots 里（那正是它的判据），
  // 复用同名会让本用例受污染。
  const space = "回收复用B";
  await fetch(`${baseUrl}/webgrp/spaces`, json({ name: space }, { method: "POST" }));
  const spaceRoot = join(dataDir, "workspaces", space);
  const removed = await fetch(`${baseUrl}/webgrp/spaces`, json({ id: space }, { method: "DELETE" }));
  expect(removed.status).toBe(200);
  expect(existsSync(spaceRoot)).toBe(false);   // 删除成功 → 该根已登记为退休

  const zip = new AdmZip();
  zip.addFile(`${space}/space.json`, Buffer.from(JSON.stringify({ formatVersion: 1, name: space })));
  zip.addFile(`${space}/schemes/files/a.json`, Buffer.from('{"a":1}'));

  const response = await fetch(`${baseUrl}/webgrp/spaces/import`, {
    method: "POST",
    headers: { "content-type": "application/zip" },
    body: zip.toBuffer()
  });
  const payload = await response.json();

  expect(response.status).toBe(200);
  expect(payload.space.id).toBe(space);
  expect((await spaceIds())).toContain(space);
  // 不止「建出来了」：内容确实落盘（否则「被退休守护拒掉」也会以别的形式失败）
  expect(readFileSync(join(spaceRoot, "schemes", "files", "a.json"), "utf8")).toBe('{"a":1}');
});

// meta 名来自**不可信压缩包**，且绕过了 POST /spaces 的接受规则 —— 导入端必须自己过同一条。
test("导入名全符号：落成包内顶层目录名（回退），且空间确实建出来了", async () => {
  const before = await spaceIds();
  const zip = new AdmZip();
  zip.addFile("回退空间/space.json", Buffer.from(JSON.stringify({ formatVersion: 1, name: "////" })));
  zip.addFile("回退空间/schemes/files/a.json", Buffer.from("{}"));

  const payload = await fetch(`${baseUrl}/webgrp/spaces/import`, {
    method: "POST",
    headers: { "content-type": "application/zip" },
    body: zip.toBuffer()
  }).then((r) => r.json());

  // POST /spaces 对全符号名是 400；导入没有「整包拒收」的选项，故回退到已净化的顶层目录名
  expect(payload.space.name).toBe("回退空间");
  // 「回退」不等于「没建」—— 空间必须真在注册表里（回退名与 id 都被用上）
  expect(await spaceIds()).toEqual(expect.arrayContaining([...before, "回退空间"]));
  expect(payload.space.id).toBe("回退空间");
});

test("导入名超长：回退到包内顶层目录名，既不静默截断、也不把整串名字撑进 spaces.json", async () => {
  const long = "长".repeat(200);
  const zip = new AdmZip();
  zip.addFile("长名空间/space.json", Buffer.from(JSON.stringify({ formatVersion: 1, name: long })));
  zip.addFile("长名空间/schemes/files/a.json", Buffer.from("{}"));

  const payload = await fetch(`${baseUrl}/webgrp/spaces/import`, {
    method: "POST",
    headers: { "content-type": "application/zip" },
    body: zip.toBuffer()
  }).then((r) => r.json());

  // 不合格（超长）→ 回退到已净化的顶层目录名；**不截断**（截断就是把用户的名字悄悄改掉）
  expect(payload.space.name).toBe("长名空间");
  // 回退名确实进了注册表（不是只在回执里被换）
  const listed = await fetch(`${baseUrl}/webgrp/spaces`).then((r) => r.json());
  expect(listed.spaces.find((item) => item.id === payload.space.id).name).toBe("长名空间");
});

test("导入无 meta 且顶层目录名超长（60 码点）：回退名也过同一道门，落成常量而非超长名", async () => {
  // zipRootName 的净化上限是 80 码元（sanitizeSegment），比空间名上限（40）宽 —— 故「顶层目录名
  // 41~80 码元 + 不写 space.json」是绕过 meta 那一关的可行构造：回退分支若不过规则，
  // 这里就会落出一个走 POST /spaces 必 400 的名字。
  const longDir = "名".repeat(60);
  const zip = new AdmZip();
  zip.addFile(`${longDir}/schemes/files/a.json`, Buffer.from("{}"));

  const response = await fetch(`${baseUrl}/webgrp/spaces/import`, {
    method: "POST",
    headers: { "content-type": "application/zip" },
    body: zip.toBuffer()
  });
  const payload = await response.json();

  // 名字不合格不该整包拒收：导入照常成功，只是名字落到下一个候选
  expect(response.status).toBe(200);
  expect(readFileSync(join(spaceRootOf(payload.space.id), "schemes", "files", "a.json"), "utf8")).toBe("{}");
  expect(payload.space.name).toBe("导入空间");
  // 判据用**规则本身**而不是「长度 ≤ 40」这个数：回退名与 meta 名走的是同一道门
  const listed = await fetch(`${baseUrl}/webgrp/spaces`).then((r) => r.json());
  const created = listed.spaces.find((item) => item.id === payload.space.id);
  expect(isAcceptableSpaceName(normalizeSpaceName(created.name))).toBe(true);
});

test("非 zip 体 → 400，且不新建空间", async () => {
  const before = await spaceIds();

  const response = await fetch(`${baseUrl}/webgrp/spaces/import`, {
    method: "POST",
    headers: { "content-type": "application/zip" },
    body: Buffer.from("not a zip at all")
  });

  expect(response.status).toBe(400);
  expect(await spaceIds()).toEqual(before);
});