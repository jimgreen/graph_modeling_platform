// 并行隔离守卫。
//
// 事实：`server.mjs` 在**模块加载期**求值一次 dataRoot，且 `registries` 是模块级 Map。
// 因此若 vitest 对 server 测试关掉隔离，同进程内的多个测试文件会共用第一个文件的
// dataRoot 与 registries —— 22 个 server 测试文件会一起坏，且症状是「某个测试莫名其妙
// 读到了别的文件的数据」，极难定位。实测把这一侧关掉隔离：立刻红 45 条
// （apiV1Library / atomicWriteTmpCleanup 等，failRenames / failWriteFor / failRegistryWrites
// 这类故障注入标志在文件间串了）。
// docs/superpowers/plans/2026-09-13-multi-workspace-backend-ledger.md 已把它记为 latent 隐患。
//
// 本守卫**按配置对象的结构断言**，不做文本正则扫描。两次教训：
// ① 早先对 vite.config.ts 的 test 块做字面量扫描，于是注释里只要出现那个字面量就转红
//    （改配置的人踩过两次，其中一次是为了*说明*自己没写它）；
// ② 反过来，配置形状一变（test 块拆成 projects）扫描就失效，守卫会**静默放行** ——
//    扫描式守卫恰恰在「配置形状变了」这件事上最不可靠。
import { describe, expect, test } from "vitest";
import viteConfig from "../vite.config.ts";

const testBlock = viteConfig.test ?? {};

describe("vitest 文件隔离配置", () => {
  // 这是本守卫存在的原因。isolate 必须是 true（默认），server 侧不能共享模块注册表。
  test("isolate 必须保持默认开启：server.mjs 的模块级 dataRoot/registries 依赖文件级隔离", () => {
    expect(testBlock.isolate, "整个套件必须保持文件级隔离").not.toBe(false);
  });

  // 下面这条是本轮踩得最贵的一个坑，值得单独钉住：
  //
  //   **vitest 3.2.7 无法做 per-project 的隔离设置。** 为此实测过四种写法，全部静默无效：
  //   ① inline project 对象里写 isolate:false → 不生效。`--project unit-fast` 单跑 414 files
  //      要 53~55s（collect 累计 1124s），而加 CLI --no-isolate 只要 15.5s（collect 307s）。
  //   ② `extends: true` → 那是 **vitest 5** 才有的特性（出自 vitest-5 博客），3.x 静默无效，
  //      根配置的 pool / setupFiles 因此不会下沉到 project。
  //   ③ projects 引用**独立配置文件**（该文件里 isolate 落在根级）→ **仍然不生效**，
  //      全量 collect 累计 1178s，与全隔离无差别。
  //   ④ CLI --no-isolate → 生效（唯一有效的形式，但它是全局的，会连带关掉 server 侧）。
  //
  // 而这四种写法**全程 414/414、533/533 全绿，exit 0，看不出任何异常** ——
  // 配置文本写着「src/ 不隔离」，实际跑的是全隔离。所以这条断言的作用是：
  // 一旦有人再加 projects，必须先证明 per-project isolate 真的生效，而不是看它跑绿。
  test("不要引入 test.projects：per-project 的 isolate 在本仓 vitest 版本下静默失效", () => {
    expect(
      testBlock.projects,
      "加 projects 前请先读本文件顶部的四种写法实测记录；per-project isolate 不生效，" +
        "而配置看上去却写着「关了」，且全程全绿 —— 这种静默无效比不做更糟。"
    ).toBeUndefined();
  });

  test("不得开启 singleThread（会让所有测试文件共用一个模块注册表）", () => {
    expect(JSON.stringify(viteConfig)).not.toMatch(/\bsingleThread\s*:\s*true\b/);
  });

  test("单文件串行开关只应出现在 e2e 配置（那里是必需的，见 vite.e2e.config.ts 注释）", () => {
    expect(JSON.stringify(testBlock)).not.toMatch(/fileParallelism\s*:\s*false/);
  });

  // include 只写目录不会报错，只会把该目录下每个文件都当测试文件收集：vitest 的 include 是
  // **字面替换**默认的 `**/*.{test,spec}.?(c|m)[jt]s?(x)`，不是「在这个目录下按默认规则找测试」。
  // 实测写成 ["src/**"] 会收集到 586 个（真实测试只有 414 个），其中 172 个是
  // .woff2 / .css / .md / .json / .jsonl / .dot，报「No test suite found」或让 vite 去转换
  // 二进制与 Markdown，全量跑从 60.74s 直接劣化到超时。
  test("include 不能塌缩成裸目录通配（那会把字体/文档当测试文件收集）", () => {
    const inc = testBlock.include ?? [];
    const bare = inc.filter((g) => /\/\\*\\*$/.test(g));
    expect(bare, `include 只写目录：${bare.join(", ")}`).toEqual([]);
  });

  test("pool 必须是 threads：forks 下每文件起一次子进程，实测 212.91s（threads 60.74s）", () => {
    expect(testBlock.pool).toBe("threads");
  });

  test("e2e 必须被默认套件排除（它起真实 Vite + 浏览器，依赖环境）", () => {
    expect(testBlock.exclude ?? []).toContain("e2e/**");
  });
});