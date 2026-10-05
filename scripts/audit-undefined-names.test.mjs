import { describe, expect, test } from "vitest";
import { mkdtemp, mkdir, writeFile, rm, copyFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { findUndefinedNames, repoRoot } from "./audit-undefined-names.mjs";

// 本文件新增用例的夹具目录一律放在**仓库内** tmp/（工作区外的系统 temp 会触发
// external_directory 权限请求，本机应答接口不可用会把 lane 永久卡死）。
// 目录名/文件名一律不带 `.test.`，否则会被全量 vitest 套件当测试文件收集。
const REPO_TMP = path.join(repoRoot, "tmp");

async function makeRepoFixtureDir(prefix) {
  await mkdir(REPO_TMP, { recursive: true });
  return mkdtemp(path.join(REPO_TMP, prefix));
}

const SOURCE = `// @ts-nocheck
export function factory(__appScope: Record<string, any>) {
  const { declaredA } = __appScope;
  return () => declaredA + missingName;
}
`;

describe("audit-undefined-names", () => {
  // 两条用例都要 ts.createProgram 起一次完整语义检查（编译器冷启动 + lib.d.ts 加载），
  // 单条空载 ~0.5s；全量并发时 CPU 被抢，5s 默认值偶发不够。显式给足预算，
  // 免得把「机器慢」误报成「审计逻辑坏了」。
  test("报出 @ts-nocheck 文件里的未定义名", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "audit-names-"));
    try {
      const file = path.join(dir, "sample.ts");
      await writeFile(file, SOURCE, "utf-8");
      const hits = findUndefinedNames([file]);
      expect(hits.map((h) => h.name)).toEqual(["missingName"]);
      expect(hits[0].file).toBe(file);
      expect(hits[0].line).toBe(4);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }, 30_000);

  test("合法绑定不误报（解构名、import、局部声明、全局、类型位置）", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "audit-names-"));
    try {
      const file = path.join(dir, "clean.ts");
      await writeFile(file, `// @ts-nocheck
import { imported } from "./nowhere.ts";
type T = { k: number };
export function factory(__appScope: Record<string, any>) {
  const { declaredA } = __appScope;
  const localB = 1;
  function inner(c: number) { return c; }
  const obj: T = { k: inner(localB) + declaredA };
  return [imported, obj, window.document.title];
}
`, "utf-8");
      expect(findUndefinedNames([file])).toEqual([]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }, 30_000);

  // ── 以下用例全部用「仓库内 tmp/ 下的最小夹具」驱动 findUndefinedNames，
  //    **不跑整仓扫描**：整仓会读 565 个文件、慢，且会读到工作区里别人的在途改动。

  // 覆盖 197 行 `if (!filePaths || filePaths.length === 0) return [];` 的两个入口：
  // 空数组 与 省略参数（undefined）。
  // 断言值不是「无命中」而是函数短路返回：变异把该行删掉后 undefined 会直接抛
  // TypeError、空数组会走进 ts.createProgram 的完整流程。
  test("空文件列表与缺省参数都直接短路成空数组（不起 program）", () => {
    expect(findUndefinedNames([])).toEqual([]);
    expect(findUndefinedNames()).toEqual([]);
  });

  // 覆盖 164 行 readFile 的「text 不是字符串」分支 与 168 行 getSourceFile 的
  // `return undefined`：夹具路径故意指向不存在的文件，host.readFile 拿到 undefined。
  // 断言「不抛且返回空数组」—— 若 164 改成无条件 stripSuppressions(text)，
  // 这里会在 undefined.replace 上抛 TypeError。
  test("待审计文件不存在时不抛异常并返回空数组", async () => {
    const dir = await makeRepoFixtureDir("ai-names-missing-");
    try {
      const missing = path.join(dir, "definitely-absent.ts");
      expect(findUndefinedNames([missing])).toEqual([]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }, 30_000);

  // 覆盖 213 行 node_modules 过滤。对照组是**同目录、同内容**的普通文件：
  //   有对照才说明 [] 是过滤器造成的，而不是「这份源码本来就没命中」。
  test("node_modules 下的未定义名命中被忽略，同内容的普通文件照报", async () => {
    const dir = await makeRepoFixtureDir("ai-names-modules-");
    try {
      const pkgDir = path.join(dir, "node_modules", "pkg");
      await mkdir(pkgDir, { recursive: true });
      const source = "// @ts-nocheck\nexport const value = missingInModules;\n";
      const inModules = path.join(pkgDir, "dep.ts");
      await writeFile(inModules, source, "utf-8");
      const plain = path.join(dir, "plain.ts");
      await copyFile(inModules, plain);

      expect(findUndefinedNames([inModules])).toEqual([]);
      const plainHits = findUndefinedNames([plain]);
      expect(plainHits.map((h) => h.name)).toEqual(["missingInModules"]);
      expect(plainHits[0].file).toBe(plain);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }, 60_000);

  // 覆盖 133 行 `ts.isStatement(current) || ts.isExpression(current) || ts.isSourceFile(current)`
  // 里的 **isStatement 与 isExpression 两条子分支**：
  //   missingInExpr     的父节点是 BinaryExpression（isExpression）
  //   missingAsStatement 的父节点是 ExpressionStatement（isStatement，且不是 Expression）
  // 两者都断成 kind "value"：若把这一行的 `return false` 改成 `return true`，
  // 两条断言同时转红，说明这行确实承重。
  test("表达式内与裸语句里的未定义名都判为值位置（isExpression / isStatement 两条子分支）", async () => {
    const dir = await makeRepoFixtureDir("ai-names-valuepos-");
    try {
      const file = path.join(dir, "valuepos.ts");
      await writeFile(file, `// @ts-nocheck
export function read() {
  return missingInExpr + 1;
}
missingAsStatement;
`, "utf-8");
      const hits = findUndefinedNames([file], { includeTypePositions: true });
      expect(hits.map((h) => [h.name, h.kind])).toEqual([
        ["missingInExpr", "value"],
        ["missingAsStatement", "value"]
      ]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }, 30_000);

  // 覆盖 246 行 type 位置的默认过滤：同一个文件里，类型位置的命中在默认模式下被丢弃，
  // 值位置的仍在；includeTypePositions 打开后类型位置那条补回来（kind 区分）。
  // 值位置那条用的是值而非 0 / 1 这类「硬编码变异不会猜到」的名字，
  // 避免断言恰好等于变异可能写死的字面量。
  test("类型位置命中默认丢弃，includeTypePositions 打开后按 kind 补回", async () => {
    const dir = await makeRepoFixtureDir("ai-names-typepos-");
    try {
      const file = path.join(dir, "typepos.ts");
      await writeFile(file, `// @ts-nocheck
export const typed: MissingTypeName = 1;
export function read() {
  return missingAtRuntime;
}
`, "utf-8");

      expect(findUndefinedNames([file]).map((h) => [h.name, h.kind])).toEqual([
        ["missingAtRuntime", "value"]
      ]);
      expect(findUndefinedNames([file], { includeTypePositions: true }).map((h) => [h.name, h.kind])).toEqual([
        ["MissingTypeName", "type"],
        ["missingAtRuntime", "value"]
      ]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }, 60_000);

  // 覆盖崩溃类分支（2339/2551）并顺带执行 185 行 toRepoRelative 的
  // 「文件在 repoRoot 之下」分支。两种模式互斥也在这里断掉：
  // 默认模式对属性不存在类命中**不**报告，crashOnly 模式才对未定义名不报告。
  //
  // 已知缺陷（不要在本用例里替它背书）：128 行 isExpressionWithTypeArguments 分支
  // 在 TypeScript 5.9.3 下**不可达** —— isTypeNodeKind(234 /* ExpressionWithTypeArguments */)
  // 为 true，于是 120 行的 ts.isTypeNode(current) 先命中并 return true，
  // 128 行永远轮不到。后果是 `class D extends MissingBase {}` 里的 MissingBase
  // 被判成 kind "type" 而在默认模式下被丢弃，尽管它运行时就是 ReferenceError。
  // 下面的夹具因此**刻意避开** extends/implements，以免把该缺陷固化成契约。
  test("crashOnly 只报属性不存在，默认模式不报（两种模式互斥）", async () => {
    const dir = await makeRepoFixtureDir("ai-names-crash-");
    try {
      const file = path.join(dir, "crash.ts");
      await writeFile(file, `// @ts-nocheck
type Union = { alpha: number } | { beta: number };
export function read(u: Union) {
  return u.beta;
}
`, "utf-8");

      expect(findUndefinedNames([file])).toEqual([]);
      const crashHits = findUndefinedNames([file], { crashOnly: true });
      expect(crashHits.map((h) => [h.name, h.kind])).toEqual([["beta", "value"]]);
      expect(crashHits[0].file).toBe(file);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }, 60_000);

  // 补齐 185 行 toRepoRelative 的**另一侧**：文件不在 repoRoot 之下 → 原样返回绝对路径。
  // 上面那条用例的夹具建在仓库内 tmp/，只走了 `absolute.slice(root.length + 1)`；
  // 185 行的三元表达式若被写成只认仓库内路径（例如把 startsWith 判断去掉，
  // 恒走 slice），仓库外的绝对路径会被砍掉头一段 `D:/work/graph_modeling_platform/`，
  // 白名单匹配随之失效 —— 所以这里必须有一份仓库外的夹具。
  // 两份夹具**放在同一次调用里**（一次 ts.createProgram），仓库内那份即是对照组：
  // 只有两者都被保留，才能说明相对/绝对两条归一路径都通向「照报」这个结果。
  // 仓库外夹具只能用系统临时目录（toRepoRelative 的语义要求它不在 repoRoot 之下）；
  // 与本文件既有的两条用例沿用同一写法。
  //
  // 变异记录（勿重复调查）：把 185 行改成 `return absolute.slice(root.length + 1);`
  // （恒走 slice，删掉 startsWith 判断）后本用例**仍然全绿**。原因是 toRepoRelative 的
  // 返回值只流向 228 行 `KNOWN_SAFE_PROPERTY_HITS.has(...)`，而白名单的 26 个键全是
  // "src/..." 形式的**真实仓库文件**；tmp/ 与系统临时目录下的夹具归一后永远匹配不上，
  // 于是「绝对路径」与「被砍掉头一段的绝对路径」产生同一个结论 —— 这条变异在本输入集上
  // 不可观测，不是等价变异。要让它变红只能审计一个白名单里的真实仓库文件，那会把工作区
  // 在途改动绑进本用例，故有意不做。此处仅求行覆盖，不求该分支的行为断言。
  test("crashOnly 对仓库外的文件也照报（toRepoRelative 走绝对路径分支）", async () => {
    const inside = await makeRepoFixtureDir("ai-names-rel-");
    const outside = await mkdtemp(path.join(tmpdir(), "audit-names-abs-"));
    try {
      const insideFile = path.join(inside, "rel_hit.ts");
      await writeFile(insideFile, `// @ts-nocheck
type InsideUnion = { alpha: number } | { beta: number };
export function readInside(u: InsideUnion) {
  return u.beta;
}
`, "utf-8");
      const outsideFile = path.join(outside, "abs_hit.ts");
      await writeFile(outsideFile, `// @ts-nocheck
type OutsideUnion = { gamma: number } | { delta: number };
export function readOutside(u: OutsideUnion) {
  return u.delta;
}
`, "utf-8");
      // 前置条件：外部夹具确实在 repoRoot 之外，否则本用例会退化成上一条的重复。
      expect(path.resolve(outsideFile).replace(/\\/g, "/").startsWith(path.resolve(repoRoot).replace(/\\/g, "/") + "/")).toBe(false);

      const hits = findUndefinedNames([insideFile, outsideFile], { crashOnly: true });
      expect(hits.map((h) => [h.name, h.kind]).sort()).toEqual([
        ["beta", "value"],
        ["delta", "value"]
      ]);
      // KNOWN_SAFE_PROPERTY_HITS 里全是 "src/..." 形式的键，临时夹具归一后匹配不上，
      // 所以两份都保留；file 字段回填的仍是调用方传入的原始路径。
      expect(hits.map((h) => h.file).sort()).toEqual([insideFile, outsideFile].sort());
    } finally {
      await rm(inside, { recursive: true, force: true });
      await rm(outside, { recursive: true, force: true });
    }
  }, 60_000);

  // 覆盖 217 行「只保留被点名审计的文件的命中」过滤：root 引用的传递依赖里的未定义名
  // 不能跟着 root 一起报出来（否则 --files a.ts 形同虚设）。
  // 对照组在第二条调用里：把依赖也点名进去，它才该出现 —— 否则「没报」分不清是过滤器
  // 干的还是源码本来干净。
  test("只审计 root 时不连带报出其传递依赖的未定义名，点名依赖后才报", async () => {
    const dir = await makeRepoFixtureDir("ai-names-transitive-");
    try {
      const depFile = path.join(dir, "dep_module.ts");
      await writeFile(depFile, `// @ts-nocheck
export const depValue = missingInDependency;
`, "utf-8");
      const rootFile = path.join(dir, "root_module.ts");
      await writeFile(rootFile, `// @ts-nocheck
import { depValue } from "./dep_module.ts";
export const rootValue = missingInRoot + depValue;
`, "utf-8");

      expect(findUndefinedNames([rootFile]).map((h) => h.name)).toEqual(["missingInRoot"]);
      expect(findUndefinedNames([rootFile, depFile]).map((h) => h.name).sort()).toEqual([
        "missingInDependency",
        "missingInRoot"
      ]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }, 60_000);
});
