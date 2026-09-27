// 并行隔离守卫。
//
// 事实：`server.mjs` 在**模块加载期**求值一次 dataRoot，且 `registries` 是模块级 Map。
// 因此若 vitest 开 `isolate: false` 或 `singleThread`，同进程内的多个测试文件会共用
// 第一个文件的 dataRoot 与 registries —— 22 个 server 测试文件会一起坏，且症状是
// 「某个测试莫名其妙读到了别的文件的数据」，极难定位。
//
// 这不是理论风险：docs/superpowers/plans/2026-09-13-multi-workspace-backend-ledger.md
// 已把它记为 latent 隐患并「建议另开一条守卫任务」，此后一直没做。
//
// 守卫只断言配置**当前**是安全的，不改任何运行行为。
import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const viteConfigPath = path.join(repoRoot, "vite.config.ts");

describe("vitest 文件隔离配置", () => {
  test("server.mjs 的模块级 dataRoot/registries 依赖文件级隔离，故不得关闭 isolate", () => {
    const source = readFileSync(viteConfigPath, "utf8");
    // 只看 test 块内的配置（源码里 build/server 块可能合法出现同名词）
    const testBlock = source.slice(source.indexOf("test: {"));
    expect(testBlock.length).toBeGreaterThan(0);
    expect(testBlock, "vite.config.ts 的 test 块应显式保持 isolate 默认（true）")
      .not.toMatch(/\bisolate\s*:\s*false\b/);
  });

  test("不得开启 singleThread（会让所有测试文件共用一个模块注册表）", () => {
    const source = readFileSync(viteConfigPath, "utf8");
    expect(source).not.toMatch(/\bsingleThread\s*:\s*true\b/);
    expect(source).not.toMatch(/\bpool\s*:\s*["']threads["']\s*,\s*singleThread/);
  });

  test("单文件串行开关只应出现在 e2e 配置（那里是必需的，见 vite.e2e.config.ts 注释）", () => {
    const unit = readFileSync(viteConfigPath, "utf8");
    // fileParallelism: false 会拖慢单元测试；e2e 因端口写死才需要
    expect(unit.slice(unit.indexOf("test: {"))).not.toMatch(/fileParallelism\s*:\s*false/);
  });
});
