// 空间注册表：default 空间直接用数据根（不搬迁既有 data/），其余在 workspaces/ 下。
import { expect, test, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, existsSync, writeFileSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createSpaceStore, assertInSpace, resolveSpaceFromRequest, parseSpaceCookie, SPACE_COOKIE_NAME, SPACE_NAME_DUPLICATE } from "./spaceStore.mjs";

let dataRoot;
beforeEach(() => { dataRoot = mkdtempSync(join(tmpdir(), "space-store-")); });
afterEach(() => { rmSync(dataRoot, { recursive: true, force: true }); });

const spacesFile = () => join(dataRoot, "spaces.json");

// 时间戳目录名不可预测，递归查找以证明载荷仍在（而非只看 trash 目录存在）。
const hasFileNamed = (root, name) =>
  readdirSync(root, { recursive: true }).some((entry) => String(entry).split(/[\\/]/).pop() === name);

test("初始化写入 default 且 pinned，default 根即数据根", async () => {
  const store = createSpaceStore(dataRoot);
  await store.ensureInitialized();
  const spaces = await store.list();
  expect(spaces).toHaveLength(1);
  expect(spaces[0]).toMatchObject({ id: "default", pinned: true });
  expect(store.resolvePaths("default").root).toBe(dataRoot);
  expect(store.resolvePaths("default").schemeFiles).toBe(join(dataRoot, "schemes", "files"));
});

test("非 default 空间落在 workspaces/ 下且各路径齐备", async () => {
  const store = createSpaceStore(dataRoot);
  await store.ensureInitialized();
  const space = await store.create("张三");
  expect(space.id).toBe("张三");
  const paths = store.resolvePaths("张三");
  expect(paths.root).toBe(join(dataRoot, "workspaces", "张三"));
  expect(paths.deviceLibrary).toBe(join(paths.root, "device-library", "library.json"));
  expect(paths.colorConfig).toBe(join(paths.root, "settings", "color-config.json"));
});

test("初始化是幂等的，重复调用不丢已有空间", async () => {
  const store = createSpaceStore(dataRoot);
  await store.ensureInitialized();
  await store.create("张三");
  await store.ensureInitialized();
  expect((await store.list()).map((s) => s.id)).toEqual(["default", "张三"]);
});

// 注意这测的是**缺省** `onDuplicate:"allow"` —— 只有非 HTTP 调用方（脚本、测试）走这条；
// HTTP 三个入口（新建/改名/导入）都传 "reject"，重名在那里是 409。
test("重名建空间自动去重 id（onDuplicate 缺省 allow）", async () => {
  const store = createSpaceStore(dataRoot);
  await store.ensureInitialized();
  await store.create("李四");
  expect((await store.create("李四")).id).toBe("李四-2");
});

test("onDuplicate:reject 时重名建空间抛 SPACE_NAME_DUPLICATE，且带上冲突者 id", async () => {
  const store = createSpaceStore(dataRoot);
  await store.ensureInitialized();
  const first = await store.create("王五");

  const error = await store.create("王五", { onDuplicate: "reject" }).then(() => null, (e) => e);

  expect(error?.code).toBe(SPACE_NAME_DUPLICATE);
  // 冲突者 id 是 HTTP 层 409 正文的原料（前端要靠它说清撞的是哪一个）
  expect(error?.spaceId).toBe(first.id);
  expect(error?.spaceName).toBe("王五");
  // 拒绝必须无副作用：只留最原始那一个
  expect((await store.list()).filter((s) => s.name === "王五")).toHaveLength(1);
});

// 归属（owner）：只给前端把列表收窄到「自己的空间」用，不是权限；缺省 = 无主空间。
test("create 带 owner 落进注册表（trim），不带就不留该字段", async () => {
  const store = createSpaceStore(dataRoot);
  await store.ensureInitialized();
  const owned = await store.create("张三", { owner: " 张三 " });
  const plain = await store.create("公共");

  expect(owned.owner).toBe("张三");
  expect(plain).not.toHaveProperty("owner");
  const listed = await store.list();
  expect(listed.find((s) => s.id === owned.id)?.owner).toBe("张三");
  expect(listed.find((s) => s.id === plain.id)).not.toHaveProperty("owner");
});

test("归属会落盘：换一个 store 实例（= 重启）后仍在", async () => {
  const store = createSpaceStore(dataRoot);
  await store.ensureInitialized();
  const owned = await store.create("张三", { owner: "张三" });

  const reloaded = createSpaceStore(dataRoot);
  await reloaded.ensureInitialized();

  expect((await reloaded.list()).find((s) => s.id === owned.id)?.owner).toBe("张三");
});

test("老数据没有 owner 字段照样读得进来（= 无主空间，不是坏数据）", async () => {
  mkdirSync(join(dataRoot, "workspaces", "老空间"), { recursive: true });
  writeFileSync(
    spacesFile(),
    JSON.stringify({ schemaVersion: 1, spaces: [{ id: "老空间", name: "老空间", createdAt: "2026-01-01T00:00:00.000Z" }] })
  );

  const store = createSpaceStore(dataRoot);
  await store.ensureInitialized();

  const legacy = (await store.list()).find((s) => s.id === "老空间");
  expect(legacy).toBeTruthy();
  expect(legacy).not.toHaveProperty("owner");
});

test("改名撞上别人抛 SPACE_NAME_DUPLICATE；原样改回自己的名字是合法 no-op", async () => {
  const store = createSpaceStore(dataRoot);
  await store.ensureInitialized();
  await store.create("赵六");
  const other = await store.create("孙七");

  const error = await store.rename(other.id, "赵六").then(() => null, (e) => e);
  expect(error?.code).toBe(SPACE_NAME_DUPLICATE);
  expect(error?.spaceId).toBe("赵六");
  // 拒绝无副作用
  expect((await store.list()).find((s) => s.id === other.id).name).toBe("孙七");

  // 判重排除自己：否则打开改名框、原样确定也会被拒
  await store.rename(other.id, "孙七");
  expect((await store.list()).find((s) => s.id === other.id).name).toBe("孙七");
});

test("改名只改 name，不动目录", async () => {
  const store = createSpaceStore(dataRoot);
  await store.ensureInitialized();
  await store.create("张三");
  await store.rename("张三", "张三丰");
  const space = (await store.list()).find((s) => s.id === "张三");
  expect(space.name).toBe("张三丰");
  expect(existsSync(join(dataRoot, "workspaces", "张三"))).toBe(true);
});

test("扫描 workspaces/ 补登记，非法目录名跳过", async () => {
  mkdirSync(join(dataRoot, "workspaces", "手工空间"), { recursive: true });
  // 注意：只能用「Windows 上建得出但 id 非法」的名字。
  // 不能建 workspaces/bad/name 来测「跳过」—— readdir 看到的是 bad 这个目录，
  // 而 "bad" 本身是合法 id，会被正常登记，断言必红。
  mkdirSync(join(dataRoot, "workspaces", "a b"), { recursive: true });          // 含空格 → 非法
  mkdirSync(join(dataRoot, "workspaces", "字".repeat(41)), { recursive: true }); // 超 40 字符 → 非法
  // 保留名目录只能用扩展长度前缀建出（普通 mkdir 会被 Win32 当设备名拦掉）。
  // 这条专证 scanWorkspaces 里 `|| isReservedSpaceId(id)` 那一半："nul" 能过 isValidSpaceId。
  mkdirSync("\\\\?\\" + join(dataRoot, "workspaces", "nul"), { recursive: true });
  const store = createSpaceStore(dataRoot);
  await store.ensureInitialized();
  const ids = (await store.list()).map((s) => s.id);
  expect(ids).toContain("default");
  expect(ids).toContain("手工空间");
  expect(ids).not.toContain("a b");
  expect(ids).not.toContain("字".repeat(41));
  expect(ids).not.toContain("nul");
});

test("注册表里的保留名空间被过滤", async () => {
  // 直接证 load() 的过滤分支：nul 合法通过 isValidSpaceId，只靠前者会被登记成空间
  writeFileSync(
    spacesFile(),
    JSON.stringify({ schemaVersion: 1, spaces: [{ id: "nul", name: "nul" }, { id: "default", name: "默认空间" }] }),
    "utf-8"
  );
  const store = createSpaceStore(dataRoot);
  await store.ensureInitialized();
  expect((await store.list()).map((s) => s.id)).toEqual(["default"]);
});

test("注册表损坏时重建", async () => {
  writeFileSync(spacesFile(), "{ 不是 JSON", "utf-8");
  const store = createSpaceStore(dataRoot);
  await store.ensureInitialized();
  expect((await store.list()).map((s) => s.id)).toEqual(["default"]);
});

test("pinned 与最后一个空间不可删", async () => {
  const store = createSpaceStore(dataRoot);
  await store.ensureInitialized();
  await expect(store.remove("default")).rejects.toThrow(/pinned|最后一个/);
});

test("删除空间把目录移入 trash-spaces 而非真删", async () => {
  const store = createSpaceStore(dataRoot);
  await store.ensureInitialized();
  await store.create("张三");
  const paths = store.resolvePaths("张三");
  mkdirSync(paths.schemes, { recursive: true });
  writeFileSync(join(paths.schemes, "sentinel.json"), '{"keep":true}', "utf-8");
  await store.remove("张三");
  expect(existsSync(join(dataRoot, "workspaces", "张三"))).toBe(false);
  const trashRoot = join(dataRoot, "trash-spaces");
  expect(existsSync(trashRoot)).toBe(true);
  // 断言载荷被搬走而非被删：只查目录存在的话，rm + mkdir 空目录也能骗过
  expect(hasFileNamed(trashRoot, "sentinel.json")).toBe(true);
  expect(readFileSync(join(trashRoot, readdirSync(trashRoot)[0], "张三", "schemes", "sentinel.json"), "utf-8"))
    .toBe('{"keep":true}');
  expect((await store.list()).map((s) => s.id)).toEqual(["default"]);
});

test("并发写注册表不丢条目", async () => {
  const store = createSpaceStore(dataRoot);
  await store.ensureInitialized();
  await Promise.all(["a", "b", "c", "d", "e"].map((n) => store.create(n)));
  const ids = (await store.list()).map((s) => s.id).sort();
  expect(ids).toEqual(["a", "b", "c", "d", "default", "e"]);
  expect(JSON.parse(readFileSync(spacesFile(), "utf-8")).spaces).toHaveLength(6);
});

test("首次空间是数组第一项，新建追加末尾", async () => {
  const store = createSpaceStore(dataRoot);
  await store.ensureInitialized();
  await store.create("张三");
  expect(store.firstId()).toBe("default");
});

test("越界断言特判 default（default 根不在 workspaces 之下）", () => {
  expect(() => assertInSpace("default", dataRoot, dataRoot)).not.toThrow();
  expect(() => assertInSpace("default", join(dataRoot, "workspaces", "x"), dataRoot)).toThrow(/default/);
  expect(() => assertInSpace("张三", join(dataRoot, "workspaces", "张三"), dataRoot)).not.toThrow();
  expect(() => assertInSpace("张三", join(dataRoot, "elsewhere"), dataRoot)).toThrow(/越界/);
});

test("resolvePaths 对未知空间抛错", async () => {
  const store = createSpaceStore(dataRoot);
  await store.ensureInitialized();
  expect(() => store.resolvePaths("不存在")).toThrow(/未知空间/);
});

// ---------------------------------------------------------------------------
// 以下直接覆盖三个同步只读方法里的 **state === null** 分支（模块刚加载、
// 任何 load/ensureInitialized 之前）。这条路径此前只在 server/spaceApi.test.mjs
// 里被间接碰到，而那批用例的输入往往来自已初始化过的 store —— 未初始化分支
// 一旦被改坏，判据（has 恒 false / firstId 恒 default / resolvePaths 只放行
// default）没有任何既有断言会红。
// 注意：造这条状态**只能** new 出一个 store 且不碰任何异步入口
// （ensureInitialized / list / create / rename / remove / touchLastAccess
// 都会走 load() 把 state 填上）。
// ---------------------------------------------------------------------------

test("未初始化时 resolvePaths 只放行 default，非 default 恒抛未知空间", () => {
  const store = createSpaceStore(dataRoot);
  // 放行：default 的根就是数据根（不是 workspaces/ 之下）
  expect(store.resolvePaths("default").root).toBe(dataRoot);
  expect(store.resolvePaths("default").schemeFiles).toBe(join(dataRoot, "schemes", "files"));
  // 拒绝：具体到错误文案，不只是「抛错」
  expect(() => store.resolvePaths("张三")).toThrow("未知空间：张三");
  expect(() => store.resolvePaths("")).toThrow(/未知空间/);
  // resolvePaths 是纯字符串拼接：未初始化分支不得有任何落盘副作用
  expect(existsSync(spacesFile())).toBe(false);
});

test("未初始化时 has 恒 false、firstId 恒为 default", () => {
  const store = createSpaceStore(dataRoot);
  // 注意 has(default) 在这里是 **false**：state 为 null 时没有可比对的条目集合，
  // 跟 resolvePaths(default) 放行并不矛盾（后者特判了 DEFAULT_SPACE_ID）。
  expect(store.has("default")).toBe(false);
  expect(store.has("张三")).toBe(false);
  expect(store.has(undefined)).toBe(false);
  expect(store.firstId()).toBe("default");
});

test("初始化后同一批调用翻面：has(default) 变 true，其余仍按注册表判定", async () => {
  // 防误伤的回归锚点：与上面两条未初始化用例构成同一组断言的正反面
  const store = createSpaceStore(dataRoot);
  await store.ensureInitialized();
  expect(store.has("default")).toBe(true);
  expect(store.has("张三")).toBe(false);
  expect(store.firstId()).toBe("default");
  expect(store.resolvePaths("default").root).toBe(dataRoot);
});

test("touchLastAccess 对未知 id 是 no-op：不抛错、不新建条目、不重写注册表", async () => {
  const store = createSpaceStore(dataRoot);
  await store.ensureInitialized();
  await store.create("张三");
  await store.touchLastAccess("张三"); // 先给一条已知空间留 lastAccessAt 当对照组

  const idsBefore = (await store.list()).map((s) => s.id);
  const jsonBefore = readFileSync(spacesFile(), "utf-8");
  const mtimeBefore = statSync(spacesFile()).mtimeMs;

  await expect(store.touchLastAccess("不存在")).resolves.toBeUndefined();

  // ① 条目集合不变：未知 id 不会被塞进注册表
  expect((await store.list()).map((s) => s.id)).toEqual(idsBefore);
  // ② 落盘内容逐字节不变
  expect(readFileSync(spacesFile(), "utf-8")).toBe(jsonBefore);
  // ③ mtime 不变 —— 补 ② 的盲区：若 no-op 分支被改成照样 writeState，
  //    内容可能完全相同（写回去的还是原数组），只有 mtime 会露馅
  expect(statSync(spacesFile()).mtimeMs).toBe(mtimeBefore);
  // ④ 对照组未被这次 no-op 波及
  expect((await store.list()).find((s) => s.id === "张三").lastAccessAt).toEqual(expect.any(String));
});

test("touchLastAccess 对已知 id 落 lastAccessAt，且只动那一条", async () => {
  const store = createSpaceStore(dataRoot);
  await store.ensureInitialized();
  await store.create("张三");
  expect((await store.list()).find((s) => s.id === "default")).not.toHaveProperty("lastAccessAt");

  await expect(store.touchLastAccess("default")).resolves.toBeUndefined();

  const spaces = await store.list();
  expect(spaces.find((s) => s.id === "default").lastAccessAt).toEqual(expect.any(String));
  // 只动被点名的那条：张三 不该被顺带打上时间戳
  expect(spaces.find((s) => s.id === "张三")).not.toHaveProperty("lastAccessAt");
  expect(spaces.map((s) => s.id)).toEqual(["default", "张三"]);
  // 真的落盘了（不是只改了内存态）
  expect(JSON.parse(readFileSync(spacesFile(), "utf-8")).spaces.find((s) => s.id === "default"))
    .toHaveProperty("lastAccessAt");
});

const fakeRequest = (headers = {}) => ({ headers });

test("解析优先级：头 > query > cookie > 回退", async () => {
  const store = createSpaceStore(dataRoot);
  await store.ensureInitialized();
  await store.create("张三");
  await store.create("李四");
  const url = new URL("http://x/webgrp/schemes");
  const all = fakeRequest({ "x-space": "张三", cookie: `${SPACE_COOKIE_NAME}=李四` });
  url.searchParams.set("space", "李四");
  expect(resolveSpaceFromRequest(all, url, store)).toMatchObject({ id: "张三", source: "header" });
  const noHeader = fakeRequest({ cookie: `${SPACE_COOKIE_NAME}=李四` });
  expect(resolveSpaceFromRequest(noHeader, url, store)).toMatchObject({ id: "李四", source: "query" });
});

test("仅 cookie 时用 cookie", async () => {
  const store = createSpaceStore(dataRoot);
  await store.ensureInitialized();
  await store.create("张三");
  const url = new URL("http://x/webgrp/schemes");
  const result = resolveSpaceFromRequest(fakeRequest({ cookie: `${SPACE_COOKIE_NAME}=张三` }), url, store);
  expect(result).toMatchObject({ id: "张三", source: "cookie", explicit: false });
});

test("cookie 未知（已删空间）静默回退首个，不报错", async () => {
  const store = createSpaceStore(dataRoot);
  await store.ensureInitialized();
  const url = new URL("http://x/webgrp/schemes");
  const result = resolveSpaceFromRequest(fakeRequest({ cookie: `${SPACE_COOKIE_NAME}=没了` }), url, store);
  expect(result).toMatchObject({ id: "default", source: "fallback", explicit: false, unknown: false });
});

test("显式来源未知（头或 query）标记 unknown 交由调用方 400", async () => {
  const store = createSpaceStore(dataRoot);
  await store.ensureInitialized();
  const url = new URL("http://x/webgrp/schemes");
  url.searchParams.set("space", "没了");
  expect(resolveSpaceFromRequest(fakeRequest(), url, store)).toMatchObject({
    id: "default", source: "query", explicit: true, unknown: true
  });
  expect(resolveSpaceFromRequest(fakeRequest({ "x-space": "没了" }), new URL("http://x/"), store))
    .toMatchObject({ id: "default", source: "header", explicit: true, unknown: true });
});

test("完全无来源回退首个", async () => {
  const store = createSpaceStore(dataRoot);
  await store.ensureInitialized();
  expect(resolveSpaceFromRequest(fakeRequest(), new URL("http://x/"), store))
    .toMatchObject({ id: "default", source: "fallback", explicit: false });
});

test("cookie 解析：多 cookie、编码值、空值", () => {
  expect(parseSpaceCookie(`a=1; ${SPACE_COOKIE_NAME}=张三; b=2`)).toBe("张三");
  expect(parseSpaceCookie(`${SPACE_COOKIE_NAME}=${encodeURIComponent("张 三")}`)).toBe("张 三");
  expect(parseSpaceCookie("")).toBe("");
  expect(parseSpaceCookie("other=1")).toBe("");
});

// ---------------------------------------------------------------------------
// normalizeSpace / scanWorkspaces / load 的降级路径
//
// 这批用例的数据根一律指到**仓库内 tmp/**（下面 laneRoot），不碰系统 tmpdir，
// 更不碰仓库真实的 data/ —— 本文件前半段那些用例写的是自己 mkdtemp 出来的
// 临时根，与本批无关。
//
// 为什么不直接复用文件顶部的 dataRoot：那套 beforeEach 只建目录、不预置
// spaces.json，而本批要断的正是「注册表**已经存在但内容残缺/畸形**」这一整族
// 入口 —— 畸形输入必须落盘才能被 load() 读到。
// ---------------------------------------------------------------------------

const LANE_TMP = fileURLToPath(new URL("../tmp/ai-spaceStore-data/", import.meta.url));
const laneRoots = [];

const laneRoot = (label) => {
  const dir = join(LANE_TMP, `${label}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`);
  mkdirSync(dir, { recursive: true });
  laneRoots.push(dir);
  return dir;
};

afterEach(() => {
  while (laneRoots.length > 0) rmSync(laneRoots.pop(), { recursive: true, force: true });
});

// console.warn 是本批多条用例的被测对象（告警文案就是契约的一部分：它告诉运维
// 「磁盘上有、注册表里没有」的空间这次全看不见）。截下来断言，同时静音。
// 必须在 finally 里还原 —— 漏还原会把它留给后面的既有用例。
const captureWarn = () => {
  const original = console.warn;
  const lines = [];
  console.warn = (...args) => { lines.push(args.map((a) => String(a)).join(" ")); };
  return {
    lines,
    restore: () => { console.warn = original; },
  };
};

// 直接调 createSpaceStore(dataRoot) 传的是参数，模块加载期没有缓存任何路径
// （路径是每次调用时 resolve(dataRoot) 现算的），所以不需要 query 后缀强制新实例。

test("注册表条目缺字段时：缺 name 回落成 id，缺 id（含整条为 null）被丢弃且不抛错", async () => {
  const root = laneRoot("missing-fields");
  writeFileSync(
    join(root, "spaces.json"),
    JSON.stringify({
      schemaVersion: 1,
      spaces: [
        { id: "无名空间" },          // 缺 name → normalizeSpace 的 name 回落成 id
        { name: "只有名字没有 id" }, // 缺 id   → id 回落成空串，随后被 isValidSpaceId 滤掉
        null                          // 整条是 null：normalizeSpace 必须不抛
      ]
    }),
    "utf-8"
  );

  const store = createSpaceStore(root);
  await store.ensureInitialized();

  const spaces = await store.list();
  // 缺 id 的条目（含 null 那条）整条消失，且不会被顶替成某个凭空生成的空间
  expect(spaces.map((s) => s.id)).toEqual(["default", "无名空间"]);
  // name 回落成 id 本身：这条断言断的正是 `String(raw?.name ?? id)` 的右半边。
  // 若变异把它改成 `?? "未命名"`，这里会红；若把 `?? id` 整个删掉（name 变 undefined）
  // 也会红 —— 两种坏法都逃不掉。
  expect(spaces.find((s) => s.id === "无名空间").name).toBe("无名空间");
  expect(spaces.find((s) => s.id === "无名空间").pinned).toBe(false);
});

test("注册表里的 lastAccessAt 读回时保留并统一成字符串（数字入、字符串出）", async () => {
  const root = laneRoot("last-access");
  writeFileSync(
    join(root, "spaces.json"),
    JSON.stringify({
      schemaVersion: 1,
      spaces: [
        // 故意写**数字**：ISO 串进出都是同一个字符串，删掉 String() 也照样绿；
        // 只有非字符串入参才能把 `String(raw.lastAccessAt)` 这一层断出来。
        { id: "default", name: "默认空间", lastAccessAt: 1700000000 },
        { id: "没访问过", name: "没访问过" }
      ]
    }),
    "utf-8"
  );

  const store = createSpaceStore(root);
  await store.ensureInitialized();

  const spaces = await store.list();
  expect(spaces.find((s) => s.id === "default").lastAccessAt).toBe("1700000000");
  // 对照组：没有这个字段的条目不得凭空长出 lastAccessAt（`: {}` 那半边）
  expect(spaces.find((s) => s.id === "没访问过")).not.toHaveProperty("lastAccessAt");
  // 落盘后仍然是字符串（归一化发生在写回之前）
  expect(
    JSON.parse(readFileSync(join(root, "spaces.json"), "utf-8")).spaces
      .find((s) => s.id === "default").lastAccessAt
  ).toBe("1700000000");
});

test("workspaces/ 读不动（不是目录）时告警，并只返回注册表里已登记的空间", async () => {
  const root = laneRoot("workspaces-not-dir");
  // workspaces 是个**文件** → readdir 抛 ENOTDIR（非 ENOENT），正是「目录读不动」
  // 那条分支。ENOENT（目录压根不存在）是首启正常路径，不该告警。
  writeFileSync(join(root, "workspaces"), "这不是目录", "utf-8");

  const warn = captureWarn();
  let spaces;
  try {
    const store = createSpaceStore(root);
    await store.ensureInitialized();
    spaces = await store.list();
  } finally {
    warn.restore();
  }

  expect(spaces.map((s) => s.id)).toEqual(["default"]);
  const line = warn.lines.find((l) => l.includes("扫描工作区目录失败"));
  expect(line).toBeTruthy();
  // 告警必须带上错误码，否则运维看不出是权限问题还是磁盘坏了
  expect(line).toContain("ENOTDIR");
  // 降级只丢扫描结果，不动注册表内已登记的条目
  expect(line).toContain("本次只返回注册表内已登记的空间");
});

test("注册表损坏时先备份原文件再按空注册表重建，告警三段文案齐全", async () => {
  const root = laneRoot("corrupt-backup");
  const raw = "{ 不是 JSON";
  writeFileSync(join(root, "spaces.json"), raw, "utf-8");

  const warn = captureWarn();
  let spaces;
  try {
    const store = createSpaceStore(root);
    await store.ensureInitialized();
    spaces = await store.list();
  } finally {
    warn.restore();
  }

  expect(spaces.map((s) => s.id)).toEqual(["default"]);

  const line = warn.lines.find((l) => l.includes("已按空注册表重建"));
  expect(line).toBeTruthy();
  expect(line).toContain("[空间] 读取");
  // JSON.parse 的 SyntaxError 没有 code，靠 `error?.code ?? error?.name` 的第二档
  expect(line).toContain("SyntaxError");
  // 备份成功那一半：文案必须说清备份落在哪，且路径是真的（不只是文案自洽）
  expect(line).toMatch(/已备份为 .*spaces\.json\.\d+\.bak，/);
  expect(line).toMatch(/已按空注册表重建：\S/);
  const bak = readdirSync(root).find((n) => /^spaces\.json\.\d+\.bak$/.test(n));
  expect(bak).toBeTruthy();
  // 备份的是**原始坏内容** —— 人工照抄回去才有意义
  expect(readFileSync(join(root, bak), "utf-8")).toBe(raw);
});

test("注册表损坏且备份本身写不出时，如实告警「未能备份」而不是谎称已备份", async () => {
  const root = laneRoot("backup-fails");
  writeFileSync(join(root, "spaces.json"), "{ 坏文件", "utf-8");
  // 备份文件名是 `<spaces.json>.<Date.now()>.bak`，时间戳不可预测，没法预置同名障碍。
  // 这里把 Date.now 钉成 0，再在那个确切路径上放一个**目录**：writeFile 到已存在的
  // 目录上必然失败（EISDIR），backupUnreadableSpacesFile 于是走 catch 返回 null。
  // Date.now 只影响这一处文件名，new Date() 不经过它，故不影响其他时间戳。
  mkdirSync(join(root, "spaces.json.0.bak"), { recursive: true });
  const now = vi.spyOn(Date, "now").mockReturnValue(0);

  const warn = captureWarn();
  let spaces;
  try {
    const store = createSpaceStore(root);
    await store.ensureInitialized();
    spaces = await store.list();
  } finally {
    warn.restore();
    now.mockRestore();
  }

  // 备份写失败不能连累降级重建：读失败当空表是既有契约
  expect(spaces.map((s) => s.id)).toEqual(["default"]);
  const line = warn.lines.find((l) => l.includes("已按空注册表重建"));
  expect(line).toBeTruthy();
  // 这一条断的是 backupUnreadableSpacesFile 的 catch 分支（返回 null）经由告警
  // 文案三选一暴露出来的那半边。若 catch 改成返回一个非空值，告警就会谎称
  // 「已备份为 …」，这里立刻红。
  expect(line).toContain("未能备份（文件本身读不到）");
  expect(line).not.toContain("已备份为");
  // 备份确实没落地（那个 .bak 仍是空目录）
  expect(readdirSync(join(root, "spaces.json.0.bak"))).toEqual([]);
});

test("读盘抛出连 name/message 都没有的值时，告警降级文案不出现 undefined", async () => {
  // `error?.code ?? error?.name ?? "unknown"` 与 `error?.message ?? error` 的最后
  // 两档只有抛出**非 Error 值**时才可达 —— 真实 fs 错误永远带 code 或 name，
  // 所以这两档只能靠替换 node:fs/promises 才走得到（真实路径下它们是纯兜底）。
  vi.doMock("node:fs/promises", async (importOriginal) => {
    const actual = await importOriginal();
    return {
      ...actual,
      readFile: async () => { throw {}; },
      readdir: async () => { throw {}; }
    };
  });
  const root = laneRoot("throw-nonerror");
  // 只为证明 load() 走的是「读注册表失败」这条分支；内容本身不会被读到
  writeFileSync(join(root, "spaces.json"), "{ 坏", "utf-8");

  const warn = captureWarn();
  let spaces;
  try {
    // query 后缀强制一个全新模块实例，让它拿到上面替换过的 fs
    const { createSpaceStore: createThrowingStore } = await import("./spaceStore.mjs?throw-nonerror");
    const store = createThrowingStore(root);
    await store.ensureInitialized();
    spaces = await store.list();
  } finally {
    warn.restore();
    vi.doUnmock("node:fs/promises");
  }

  // 降级重建照旧（读失败当空表是既有契约）
  expect(spaces.map((s) => s.id)).toEqual(["default"]);

  const loadLine = warn.lines.find((l) => l.includes("已按空注册表重建"));
  expect(loadLine).toBeTruthy();
  expect(loadLine).toContain("失败（unknown）");
  // `error?.message ?? error`：裸对象没有 message，于是回退到值本身
  expect(loadLine).toContain("已按空注册表重建：[object Object]");
  expect(loadLine).not.toContain("undefined");

  const scanLine = warn.lines.find((l) => l.includes("扫描工作区目录失败"));
  expect(scanLine).toBeTruthy();
  expect(scanLine).toContain("（unknown）");
  expect(scanLine).not.toContain("undefined");
});

test("workspaces/ 下的普通文件不会被登记成空间（只有目录才算）", async () => {
  const root = laneRoot("stray-file");
  mkdirSync(join(root, "workspaces", "真空间"), { recursive: true });
  // 名字本身是**合法 id**（无扩展名），只差「不是目录」这一条 —— 既有那条
  // 「非法目录名跳过」用的是 "a b" 这类会被 isValidSpaceId 拦掉的名字，
  // 根本走不到 isDirectory 判定。
  writeFileSync(join(root, "workspaces", "notadir"), "我是文件", "utf-8");

  const store = createSpaceStore(root);
  await store.ensureInitialized();

  const ids = (await store.list()).map((s) => s.id);
  expect(ids).toHaveLength(2);
  expect(ids).toContain("default");
  expect(ids).toContain("真空间");
  expect(ids).not.toContain("notadir");
});

test("create 的名字归一后为空时，显示名回落成生成的 id", async () => {
  const root = laneRoot("empty-name");
  const store = createSpaceStore(root);
  await store.ensureInitialized();

  // 全空白 → normalizeSpaceName 归一成空串 → 断的正是 `name: trimmed || id` 的右半边。
  // 注意这里走的是**非 HTTP 调用方**语义：HTTP 入口会先拒空名，store 不管。
  const space = await store.create("   ");
  expect(space.id).toBe("space");   // spaceIdFromName("") 的兜底名
  expect(space.name).toBe("space"); // ← 若去掉 `|| id`，这里会变成 ""
  expect((await store.list()).find((s) => s.id === "space").name).toBe("space");
  // 对照组：名字里含非法 id 字符 → 归一化后 id 与 name 不同，证明 name 取的是
  // 归一化后的**原名**（`trimmed`），而不是 id（`id || trimmed` 那种换序会红）。
  const named = await store.create("工程 1");
  expect(named.name).toBe("工程 1");
  expect(named.id).toBe("工程-1");
});

