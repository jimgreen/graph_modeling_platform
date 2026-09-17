// 空间注册表：default 空间直接用数据根（不搬迁既有 data/），其余在 workspaces/ 下。
import { expect, test, beforeEach, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, existsSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
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
