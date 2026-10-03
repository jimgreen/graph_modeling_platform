// scripts/list-used-lucide-icons.mjs 直测 —— 此前零直测。
//
// ## 为什么值得测
//
// 这个脚本的唯一产出是一段**给别的工具消费的逗号分隔清单**
//（`---USED-LIST-START---` / `---USED-LIST-END---` 之间），下游靠它裁剪
// lucide-react 的导出面。清单一旦多逗号、带空白、漏掉某项或混入非图标标识符，
// 下游会静默丢图标或引入不存在的名字 —— 不会有任何报错。
//
// 所以测的是**输出契约**，不是「用了哪些图标」（那个随 src 演进而变，写死会天天假红）。
import { describe, expect, test } from "vitest";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const SCRIPT = fileURLToPath(new URL("./list-used-lucide-icons.mjs", import.meta.url));

/** 跑脚本并解析输出。cwd 必须是仓库根 —— 脚本以相对路径 "src" 扫描。 */
function run() {
  const result = spawnSync(process.execPath, [SCRIPT], {
    cwd: fileURLToPath(new URL("..", import.meta.url)),
    encoding: "utf-8",
    maxBuffer: 8 * 1024 * 1024
  });
  expect(result.status, result.stderr).toBe(0);
  const stdout = result.stdout;
  const start = stdout.indexOf("---USED-LIST-START---");
  const end = stdout.indexOf("---USED-LIST-END---");
  expect(start, "缺少 USED-LIST-START 标记").toBeGreaterThan(-1);
  expect(end, "缺少 USED-LIST-END 标记").toBeGreaterThan(start);
  const usedLine = stdout.slice(start + "---USED-LIST-START---".length, end).trim();
  const names = usedLine ? usedLine.split(",") : [];
  const total = Number(stdout.match(/lucide PascalCase exports: (\d+)/)?.[1]);
  const used = Number(stdout.match(/used in src: (\d+)/)?.[1]);
  return { stdout, names, total, used };
}

describe("list-used-lucide-icons —— 输出契约", () => {
  test("三个统计行齐全：lucide 总数、used 数、两个标记", () => {
    const { stdout, total, used } = run();
    expect(stdout).toContain("lucide PascalCase exports:");
    expect(stdout).toContain("used in src:");
    expect(total).toBeGreaterThan(0);
    expect(used).toBeGreaterThan(0);
    // 总数应远大于用到的数量（用到的只是子集）
    expect(used).toBeLessThan(total);
  });

  test("★ 清单长度与「used in src」的数字一致（下游按标记切分，两者必须对得上）", () => {
    const { names, used } = run();
    expect(names.length).toBe(used);
  });

  test("★ 每项都是 PascalCase 标识符：无空格、无空项、无逗号残留", () => {
    const { names } = run();
    expect(names.length).toBeGreaterThan(0);
    for (const name of names) {
      expect(name).toMatch(/^[A-Z][A-Za-z0-9]*$/u);
    }
  });

  test("★ 清单按 JS 默认码元序排好（下游按序 diff，改动才好读）", () => {
    const { names } = run();
    expect(names).toEqual([...names].sort());
  });

  test("无重复项（同一图标只出现一次）", () => {
    const { names } = run();
    expect(new Set(names).size).toBe(names.length);
  });

  test("两次运行输出一致（纯读文件，无时间/顺序抖动）", () => {
    expect(run().stdout).toBe(run().stdout);
  });

  test("清单里的名字都能在 lucide-react 的 PascalCase 导出里找到（不是靠猜）", async () => {
    const { names } = run();
    const lucide = await import("lucide-react");
    const exports = new Set(Object.keys(lucide).filter((name) => /^[A-Z][A-Za-z0-9]*$/u.test(name)));
    for (const name of names) {
      expect(exports.has(name), `${name} 不在 lucide-react 导出里`).toBe(true);
    }
  });
});

async function runFixture(files) {
  const [{ mkdtempSync, mkdirSync, writeFileSync, rmSync }, { tmpdir }, { join, dirname }] =
    await Promise.all([import("node:fs"), import("node:os"), import("node:path")]);
  const root = mkdtempSync(join(tmpdir(), "list-used-lucide-icons-"));
  try {
    mkdirSync(join(root, "src"), { recursive: true });
    for (const [relative, contents] of Object.entries(files)) {
      const target = join(root, "src", relative);
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, contents);
    }
    const result = spawnSync(process.execPath, [SCRIPT], {
      cwd: root,
      encoding: "utf-8",
      maxBuffer: 8 * 1024 * 1024
    });
    expect(result.status, result.stderr).toBe(0);
    const stdout = result.stdout;
    const start = stdout.indexOf("---USED-LIST-START---");
    const end = stdout.indexOf("---USED-LIST-END---");
    expect(start, "缺少 USED-LIST-START 标记").toBeGreaterThan(-1);
    expect(end, "缺少 USED-LIST-END 标记").toBeGreaterThan(start);
    const usedLine = stdout.slice(start + "---USED-LIST-START---".length, end).trim();
    const names = usedLine ? usedLine.split(",") : [];
    const used = Number(stdout.match(/used in src: (\d+)/)?.[1]);
    return { stdout, names, used };
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

describe("list-used-lucide-icons —— 空输入与扫描边界（tmpdir）", () => {
  test("空 src 输出空清单且正常退出", async () => {
    const { stdout, names, used } = await runFixture({});
    expect(stdout).toContain("---USED-LIST-START---\n\n---USED-LIST-END---");
    expect(names).toEqual([]);
    expect(used).toBe(0);
  });

  test("源码存在但完全没有图标标识符时输出空清单", async () => {
    const { names, used } = await runFixture({
      "plain.ts": "const value = 42;\nconst anotherValue = value + 1;"
    });
    expect(names).toEqual([]);
    expect(used).toBe(0);
  });

  test("同一图标在同文件及多个文件重复引用时按全局标识符去重", async () => {
    const { names, used } = await runFixture({
      "one.ts": "import { Activity } from 'lucide-react';\nconst first = Activity;\nconst second = Activity;",
      "nested/two.ts": "const third = Activity;"
    });
    expect(names).toEqual(["Activity"]);
    expect(used).toBe(1);
  });

  test("从 lucide-react 之外的路径引入同名符号仍会按 token 误判为已使用", async () => {
    const { names, used } = await runFixture({
      "wrong-source.ts": "import { Activity } from 'other-icons';\nconst value = Activity;"
    });
    expect(names).toEqual(["Activity"]);
    expect(used).toBe(1);
  });

  test("仅扫描 .ts/.tsx，.js/.jsx/.md 中的同名标识符会被忽略", async () => {
    const { names, used } = await runFixture({
      "ignored.js": "const Activity = 1;",
      "ignored.jsx": "const Circle = 1;",
      "ignored.md": "Icon"
    });
    expect(names).toEqual([]);
    expect(used).toBe(0);
  });

  test("不会跳过 src 下的 node_modules 和 dist 目录", async () => {
    const { names, used } = await runFixture({
      "node_modules/vendor.ts": "const Activity = 1;",
      "dist/generated.ts": "const Circle = 1;"
    });
    expect(names).toEqual(["Activity", "Circle"]);
    expect(used).toBe(2);
  });

  test("非 lucide 图标的相近标识符 Icon 也会按 token 被计入", async () => {
    const { names, used } = await runFixture({
      "local-icon.ts": "const Icon = 'not a lucide icon';\nconst value = Icon;"
    });
    expect(names).toEqual(["Icon"]);
    expect(used).toBe(1);
  });
});
