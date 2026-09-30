/**
 * 空间隔离守卫：**不得新增模块级路径常量**。
 *
 * 约定写在 server/server.mjs:36 的注释里（"模块级路径常量已全部删除 —— 不要再新增"），
 * 注释会随重构烂掉，这里把它变成会红的测试。理由是空间隔离本身：
 * 每请求解析出的 paths 决定读写落在哪个空间（`options.paths ?? defaultPaths`），
 * 一旦有人在模块顶层算出一个绝对路径并直接用它，跨空间读写就绕过了隔离 ——
 * 而症状只是「A 空间的方案出现在 B 空间」，不抛错。
 *
 * 唯一的例外是 server.mjs 里那三样东西（数据根的定位本身）+ `defaultPaths`
 * （各空间测试文件要从这里解构出各自的 paths），列在 ALLOWED 里。
 * 新增例外要连同理由一起写进 ALLOWED。
 *
 * 已做正向验证：往 server/spaceStore.mjs 末尾塞一行模块级 path.join 常量，本守卫立刻转红并
 * 报出 `spaceStore.mjs:<常量名>（第 N 行）` —— 它确实盯得住，不是空跑。
 */
import { describe, expect, test } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const serverDir = dirname(fileURLToPath(import.meta.url));

/** 允许存在的模块级路径常量：`文件:常量名` → 允许的理由。 */
const ALLOWED = new Map([
  ["server.mjs:__dirname", "定位仓库根要用它"],
  ["server.mjs:repoRoot", "数据根的定位基准"],
  ["server.mjs:dataRoot", "默认（default 空间）数据根"],
  ["server.mjs:defaultPaths", "各空间测试文件从这里解构出各自的 paths"]
]);

/** 出现这些就认为这个常量算得出一条路径（Promise.resolve 不算）。 */
const PATH_TOKENS = ["path.join(", "resolve(", "spacePathsFor(", "spacePaths(", "dataRoot", "__dirname", "GRAPH_MODEL_DATA_DIR"];

const moduleFiles = () =>
  readdirSync(serverDir).filter((name) => name.endsWith(".mjs") && !name.includes(".test."));

/** 找出该文件里所有「算得出一条路径」的模块级 const / let。 */
function findModuleLevelPathConstants(source) {
  const found = [];
  source.split(/\r?\n/).forEach((line, index) => {
    const declaration = /^(?:export\s+)?(?:const|let)\s+([A-Za-z0-9_$]+)\s*=\s*(.+)$/.exec(line);
    if (!declaration) return;
    const [, name, rawInitializer] = declaration;
    if (line.trimStart().startsWith("//")) return;
    // 跨行初始化（括号还没配平）交给逐行扫描会误判成模块级路径，跳过
    const initializer = rawInitializer.replace(/Promise\.resolve\(/g, "promiseResolve(");
    const opens = (initializer.match(/\(/g) ?? []).length;
    const closes = (initializer.match(/\)/g) ?? []).length;
    if (opens !== closes) return;
    if (PATH_TOKENS.some((token) => initializer.includes(token))) {
      found.push({ name, line: index + 1, text: line.trim() });
    }
  });
  return found;
}

describe("空间隔离：不得新增模块级路径常量", () => {
  test("★ server 下除白名单外没有模块级路径常量", () => {
    const violations = [];
    for (const name of moduleFiles()) {
      const source = readFileSync(join(serverDir, name), "utf8");
      for (const constant of findModuleLevelPathConstants(source)) {
        const key = `${name}:${constant.name}`;
        if (ALLOWED.has(key)) continue;
        violations.push(`${key}（第 ${constant.line} 行）: ${constant.text}`);
      }
    }
    expect(violations, `模块级路径常量会让空间隔离被绕过：\n${violations.join("\n")}`).toEqual([]);
  });

  test("★ 白名单里的四样都还在（删了就说明约定变了，得同步改这里）", () => {
    const serverSource = readFileSync(join(serverDir, "server.mjs"), "utf8");
    for (const key of ALLOWED.keys()) {
      const name = key.split(":")[1];
      expect(new RegExp(`^(?:export\\s+)?(?:const|let)\\s+${name}\\b`, "mu").test(serverSource), key).toBe(true);
    }
  });

  test("扫描器本身认得出多行初始化（不会把跨行常量误报成模块级路径）", () => {
    const source = [
      "const good = path.join(root, \"a\");",
      "const alsoGood = someHelper(",
      "  root,",
      "  \"b\"",
      ");",
      "let lazy = Promise.resolve(0);",
      "// const commented = path.join(root, \"c\");"
    ].join("\n");
    expect(findModuleLevelPathConstants(source).map((item) => item.name)).toEqual(["good"]);
  });
});
