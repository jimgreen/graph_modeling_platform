// 存储读取失败时的告警（不改变降级行为，只把静默变成可观测）。
//
// server 侧有一类反复出现的形状：catch 块把「IO 失败 / 文件损坏」和「内容为空」
// 折叠成同一个返回值，而下游有一个写操作会把这个返回值当真值写回。行为本身是
// 既有契约（改动会变 API 语义），本轮只补上告警：
//
//   readJsonStoreFile / readOptionalJsonStoreFile   manifest、folders、各类配置
//   readSchemeProjectFile                           模型读取（含注册表 hydrate 的写）
//   readSchemeDirectory                             方案目录枚举
//   spaceStore.load                                 spaces.json 注册表
//   globalLineRegistry.readState                    global-lines.json 注册表
//
// 每处都只在**非 ENOENT** 时告警：ENOENT 是「还没有这个文件」的正常首启路径，
// 否则每次首启都刷一串噪音，真正出事时反而看不见。
import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readColorConfig, readManifest } from "./server.mjs";
import { createSpaceStore } from "./spaceStore.mjs";
import { createGlobalLineRegistry } from "./globalLineRegistry.mjs";

let dataRoot;
let warn;

beforeEach(() => {
  dataRoot = mkdtempSync(join(tmpdir(), "store-warn-"));
  warn = vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  warn.mockRestore();
  rmSync(dataRoot, { recursive: true, force: true });
});

const paths = () => ({
  images: join(dataRoot, "images"),
  manifest: join(dataRoot, "images", "manifest.json")
});

const warningsMatching = (fragment) => warn.mock.calls.filter((call) => String(call[0]).includes(fragment));

describe("readManifest：注册表读失败要留痕", () => {
  test("★ manifest 内容损坏 → 仍返回空数组（既有降级不变），但告警点名文件", async () => {
    mkdirSync(join(dataRoot, "images"), { recursive: true });
    writeFileSync(join(dataRoot, "images", "manifest.json"), "{ 不是 JSON", "utf-8");
    await expect(readManifest({ paths: paths() })).resolves.toEqual([]);
    expect(warningsMatching("manifest.json")).toHaveLength(1);
    expect(String(warn.mock.calls.at(-1)[0])).toContain("按空值处理");
  });

  test("文件不存在（首启）→ 不告警", async () => {
    await readManifest({ paths: paths() });
    expect(warningsMatching("manifest.json")).toHaveLength(0);
  });

  test("告警里带错误码，能区分权限问题与语法错误", async () => {
    mkdirSync(join(dataRoot, "images"), { recursive: true });
    writeFileSync(join(dataRoot, "images", "manifest.json"), "{ 不是 JSON", "utf-8");
    await readManifest({ paths: paths() });
    const message = String(warn.mock.calls.at(-1)[0]);
    expect(message).toContain(join(dataRoot, "images", "manifest.json"));
    expect(message).toMatch(/\(.*\)/);
  });
});

describe("readColorConfig：可选配置首启不存在不该告警", () => {
  // 这一条同时判别 ENOENT 抑制：readManifest 的「文件不存在」走不到 catch
  // （ensureJsonStoreFile 会先把文件建出来），只有可选配置读（readOptionalJsonStoreFile）
  // 才会真的以 ENOENT 落进 catch。
  test("★ 配置文件不存在 → 走 catch 的 ENOENT 分支，但一个字都不打", async () => {
    const result = await readColorConfig({ paths: { ...paths(), settings: join(dataRoot, "settings"), colorConfig: join(dataRoot, "settings", "color-config.json") } });
    expect(result.exists).toBe(false);
    expect(warn).not.toHaveBeenCalled();
  });

  test("配置存在但损坏 → 告警", async () => {
    const settings = join(dataRoot, "settings");
    mkdirSync(settings, { recursive: true });
    writeFileSync(join(settings, "color-config.json"), "{ 坏了", "utf-8");
    const result = await readColorConfig({ paths: { ...paths(), settings, colorConfig: join(settings, "color-config.json") } });
    expect(result.exists).toBe(false);
    expect(warningsMatching("color-config.json")).toHaveLength(1);
  });
});

describe("spaceStore：spaces.json 读失败要留痕", () => {
  test("★ 注册表损坏 → 仍按既有契约重建为 default，但告警点名「按空注册表重建」", async () => {
    writeFileSync(join(dataRoot, "spaces.json"), "{ 坏了", "utf-8");
    const store = createSpaceStore(dataRoot);
    await store.ensureInitialized();
    expect((await store.list()).map((s) => s.id)).toEqual(["default"]);
    expect(warningsMatching("spaces.json")).toHaveLength(1);
    expect(String(warn.mock.calls.at(-1)[0])).toContain("按空注册表重建");
  });

  test("首次启动没有 spaces.json → 不告警", async () => {
    const store = createSpaceStore(dataRoot);
    await store.ensureInitialized();
    expect(warningsMatching("spaces.json")).toHaveLength(0);
  });
});

describe("globalLineRegistry：global-lines.json 读失败要留痕", () => {
  test("★ 注册表损坏 → 仍按既有契约返回空列表，但告警点名", async () => {
    mkdirSync(join(dataRoot, "schemes"), { recursive: true });
    writeFileSync(join(dataRoot, "schemes", "global-lines.json"), "{ 坏了", "utf-8");
    const registry = createGlobalLineRegistry({ dataRoot });
    await expect(registry.list()).resolves.toEqual([]);
    expect(warningsMatching("global-lines.json")).toHaveLength(1);
    expect(String(warn.mock.calls.at(-1)[0])).toContain("按空注册表处理");
  });

  test("首次启动没有 global-lines.json → 不告警", async () => {
    const registry = createGlobalLineRegistry({ dataRoot });
    await registry.list();
    expect(warningsMatching("global-lines.json")).toHaveLength(0);
  });
});