// 测试卫生守卫：`.only` / `.skip` 与「零用例的测试文件」。
//
// 为什么要盯：
//   · `test.only` / `describe.only` 会让同文件里其余用例**静默不跑**，全量测试照样「全绿」；
//   · `test.skip` 把一条回归守卫变成装饰品 —— 它还在文件里，但再也不转红；
//   · 一个没有 `test(` 的测试文件更隐蔽：`.mjs` 里写错语法时 vitest 报的是
//     `Tests: no tests`，看起来像「没跑到用例」，很容易被当成通过（server/CLAUDE.md 专门警告过）。
// 这三条都属于 CLAUDE.md 里「无假完成」那条铁律的自动化版本。
//
// 已正向验证：临时放一个带 test.only + test.skip 的探针文件进 src/，本守卫两条断言立刻转红并
// 点名该文件，删掉探针后恢复绿。本文件自身豁免（判定正则里就写着那些字面量）。
//
// **不拦 `describe.skipIf` / `it.skipIf`**：那是本仓库的既有约定（见
// src/encoding/dms-rtdb-export-rules.test.ts 的注释）—— 按「样本文件在不在」条件跳过，
// 与「把守卫改成装饰品」是两回事。
import { describe, expect, test } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const SCAN_DIRS = ["src", "server", "scripts", "e2e"];
const TEST_FILE = /\.test\.(ts|tsx|mjs)$/;

const stripComments = (source) =>
  source
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|\s)\/\/.*$/gm, "$1");

function testFiles(dir) {
  const full = path.join(repoRoot, dir);
  let entries;
  try {
    entries = readdirSync(full, { withFileTypes: true });
  } catch {
    return [];
  }
  return entries.flatMap((entry) => {
    const child = path.join(dir, entry.name);
    if (entry.isDirectory()) return testFiles(child);
    // 统一成 POSIX 分隔符： SELF 之类的字面量在 Windows 上也要能对得上
    return TEST_FILE.test(entry.name) ? [child.split(path.sep).join("/")] : [];
  });
}

/** 本文件自身要豁免：它的判定正则里就写着那些字面量，否则会自己告自己。 */
const SELF = "scripts/testHygieneGuard.test.mjs";

/**
 * 零断言文件的**既有**豁免名单：这些是一次性排查留下的探针（正文只有 console.log，
 * 没有 expect），它们不是守卫，删不删由人决定，但规则不该让它们把全量测试拉红。
 * 新写零断言文件一律被拦。
 *
 * ★ 2026-10 修过一处假绿。这 6 条**全部 untracked**，且被 `.gitignore:46` 的 `*.temp.test.ts`
 * 忽略 —— 干净检出上根本不存在。原来的「名单不得腐烂」只看「文件还在不在工作区」，两头都错：
 *   · 本机文件没删  → 名单对它们空洞地成立，零断言豁免其实什么也没豁免；
 *   · 文件被删掉（干净检出即如此）→ 反而转红，逼着人改一个**受版本控制**的文件，
 *     去记录「我的本地临时文件被清理了」这件与仓库无关的事。
 * 也就是说那条检查的判据方向对 gitignore 文件是反的。现在改由四个互相独立的桶钉住，
 * 详见下面 auditExemptionList。
 */
const ZERO_ASSERTION_EXEMPT = new Set([
  "src/encoding/energy-debug.temp.test.ts",
  "src/encoding/energy-full-debug.temp.test.ts",
  "src/encoding/fb18-probe.temp.test.ts",
  "src/encoding/infer-debug.temp.test.ts",
  "src/encoding/param-struct.temp.test.ts",
  "src/encoding/text-debug.temp.test.ts"
]);

/**
 * 每条豁免都必须写明理由。**刻意与上面的名单分开写、不互为推导**：只从名单删掉一项而不动这里，
 * 「双向对齐」那条断言立刻转红 —— 这正是原来缺的那道「删名单项也能被发现」。
 * 反过来多塞一项而忘了写理由，同样转红。
 */
const ZERO_ASSERTION_EXEMPT_REASON = new Map([
  ["src/encoding/energy-debug.temp.test.ts", "energy 编码一次性排查留下的探针"],
  ["src/encoding/energy-full-debug.temp.test.ts", "energy 全量比对一次性排查留下的探针"],
  ["src/encoding/fb18-probe.temp.test.ts", "fb18 报文一次性排查留下的探针"],
  ["src/encoding/infer-debug.temp.test.ts", "infer 路径一次性排查留下的探针"],
  ["src/encoding/param-struct.temp.test.ts", "param 结构一次性排查留下的探针"],
  ["src/encoding/text-debug.temp.test.ts", "text 编码一次性排查留下的探针"]
]);

/**
 * 跑一条 git 命令并取 stdout 文本；判定不了时返回 null。
 * `accept` 列出「也算成功」的退出码 —— `git check-ignore` 用退出码 1 表示「一条都没被忽略」。
 * null 会一路冒泡成 unknown：守卫宁可少查，也不假装查过。
 */
function gitLines(args, { input, accept = [0] } = {}) {
  try {
    return execFileSync("git", args, { cwd: repoRoot, encoding: "utf8", input });
  } catch (error) {
    return accept.includes(error?.status) ? String(error?.stdout ?? "") : null;
  }
}

/**
 * 名单里每条路径的版本控制可达性 —— git 是权威判据，不自己重写 .gitignore 匹配
 * （那等于把 gitignore 语义重新实现一遍，它自己会先烂掉）。
 *   "tracked"     受版本控制 → 干净检出上必然存在，工作区里缺了就是被真删了
 *   "ignored"     未入库但被 .gitignore 明确忽略 → 本地探针，干净检出上没有是**正常**的
 *   "unreachable" 既没入库也没被忽略 → 只有这台机器有，别人永远看不到，豁免空洞成立
 *   "unknown"     git 不可用 / 命令失败 → 一律按「查不到」处理，不下结论
 * 返回 null 表示 git 事实完全不可得（调用方据此跳过依赖 git 的断言，而不是让它们空洞通过）。
 */
function exemptReachability(paths) {
  const nulInput = paths.map((file) => `${file}\0`).join("");
  if (nulInput === "") return null;
  // 注意 check-ignore -z --stdin 的**输入**也必须是 NUL 分隔（git 2.47 实测：换行输入会静默返回空）
  const listed = gitLines(["ls-files", "-z", "--", ...paths]);
  const ignoredOut = gitLines(["check-ignore", "-z", "--stdin"], { input: nulInput, accept: [0, 1] });
  if (listed === null || ignoredOut === null) return null;
  const tracked = new Set(listed.split("\0").filter(Boolean));
  const ignored = new Set(ignoredOut.split("\0").filter(Boolean));
  return (file) => (tracked.has(file) ? "tracked" : ignored.has(file) ? "ignored" : "unreachable");
}

/**
 * 豁免名单的四个桶。**刻意做成纯函数**：下面那条自测要用合成数据证明每个桶都能红 ——
 * 否则「四桶全空」只是当前源码的巧合，看不出检测逻辑到底会不会报警。
 *   unreconciled 名单里有、却没写理由 —— 偷偷塞进来的豁免
 *   orphaned     理由表里有、名单里没有 —— ★ 从名单里删掉一项就会命中这里，且与工作区无关
 *   silent       unreachable：既没入库也没被忽略，干净检出上永远不存在，豁免空洞成立
 *   stale        tracked 却在工作区里找不到 —— 名单指向的已入库文件被真删了
 */
function auditExemptionList({ exempt, reasons, present, reach }) {
  const listed = [...exempt];
  return {
    unreconciled: listed.filter((file) => !reasons.has(file)),
    orphaned: [...reasons.keys()].filter((file) => !exempt.has(file)),
    silent: listed.filter((file) => reach(file) === "unreachable"),
    stale: listed.filter((file) => reach(file) === "tracked" && !present.has(file))
  };
}

const files = SCAN_DIRS.flatMap(testFiles);
const scanned = files.filter((file) => file !== SELF);
const codeOf = (file) => stripComments(readFileSync(path.join(repoRoot, file), "utf8"));

/** 有 test/it 却没有任何断言的测试文件：跑了也验证不了任何东西，只制造「已验证」的错觉。 */
const hasExpectation = (code) => {
  // 注释里提到 expect 不算（否则写个注释就能绕过规则）
  const stripped = stripComments(code);
  return /\bexpect(?:\.|\()/.test(stripped) || /\bassert(?:ions)?\b/.test(stripped);
};

describe("测试卫生守卫", () => {
  const present = new Set(files);
  // git 事实不可得（无 git / 命令失败）时为 null；依赖它的两条断言据此跳过，而不是空洞通过
  const reach = exemptReachability([...ZERO_ASSERTION_EXEMPT]);
  const reachOf = reach ?? (() => "unknown");
  const gitFactsKnown = reach !== null;
  const audit = auditExemptionList({
    exempt: ZERO_ASSERTION_EXEMPT,
    reasons: ZERO_ASSERTION_EXEMPT_REASON,
    present,
    reach: reachOf
  });

  test("扫到了测试文件（守卫本身没跑空）", () => {
    expect(files.length).toBeGreaterThan(50);
  });

  test("★ 没有 test.only / it.only / describe.only（它们会静默停掉同文件其余用例）", () => {
    const hits = scanned.filter((file) => /\b(?:test|it|describe)\.only\b/.test(codeOf(file)));
    expect(hits, `这些文件里有 .only：${hits.join(", ")}`).toEqual([]);
  });

  test("★ 没有裸的 test.skip / it.skip / describe.skip（skipIf 是仓库既有约定，不拦）", () => {
    const hits = scanned.filter((file) => /\b(?:test|it|describe)\.skip\(/.test(codeOf(file)));
    expect(hits, `这些文件里有 .skip：${hits.join(", ")}`).toEqual([]);
  });

  test("★ 每个测试文件至少有一个用例（防「no tests 被当成通过」）", () => {
    const empty = scanned.filter((file) => !/^\s*(?:test|it)(?:\.\w+)*\(/m.test(codeOf(file)));
    expect(empty, `这些测试文件里没有 test(/it(：${empty.join(", ")}`).toEqual([]);
  });

  test("★ 没有零断言的测试文件（有 test 却没有任何 expect/assert）", () => {
    const zeroAssertion = scanned.filter((file) => !hasExpectation(codeOf(file)));
    const unexpected = zeroAssertion.filter((file) => !ZERO_ASSERTION_EXEMPT.has(file));
    expect(unexpected, `这些测试文件只有用例没有断言：${unexpected.join(", ")}`).toEqual([]);
  });

  test("★ 豁免名单与理由表逐项对齐（从名单删掉任一项都会转红，与文件在不在工作区无关）", () => {
    expect(audit.unreconciled, `这些豁免没写理由，请补上再留在名单里：${audit.unreconciled.join(", ")}`).toEqual([]);
    expect(audit.orphaned, `理由表里有、名单里没有，请同步移除或恢复：${audit.orphaned.join(", ")}`).toEqual([]);
  });

  test("★ 豁免名单不得为空（整体清空属刻意改动，须与理由表同时进行并在 PR 里说明）", () => {
    expect(ZERO_ASSERTION_EXEMPT.size).toBeGreaterThan(0);
    expect(ZERO_ASSERTION_EXEMPT_REASON.size).toBeGreaterThan(0);
  });

  // 下面两条依赖 git 事实；git 不可得时用 skipIf 明说，而不是让它们恒绿
  test.skipIf(!gitFactsKnown)("★ 豁免名单不得有静默项（既没入库、也没被 .gitignore 忽略的路径）", () => {
    expect(audit.silent, `这些豁免只有本机有且未被忽略，别人永远看不到：${audit.silent.join(", ")}`).toEqual([]);
  });

  test.skipIf(!gitFactsKnown)("★ 受版本控制的豁免必须真实存在（本地 gitignore 探针不在此列）", () => {
    expect(audit.stale, `这些豁免已入库却不在工作区，请从名单移除：${audit.stale.join(", ")}`).toEqual([]);
  });

  test("豁免名单审计本身可证伪（合成数据证明四个桶都能红）", () => {
    const reasons = new Map([
      ["src/x.test.ts", "理由甲"],
      ["src/y.test.ts", "理由乙"]
    ]);
    const exempt = new Set(["src/x.test.ts", "src/y.test.ts"]);
    const bothPresent = new Set(["src/x.test.ts", "src/y.test.ts"]);
    const allTracked = () => "tracked";

    // 合法形态：四桶全空
    expect(auditExemptionList({ exempt, reasons, present: bothPresent, reach: allTracked })).toEqual({
      unreconciled: [],
      orphaned: [],
      silent: [],
      stale: []
    });

    // ★ 本次要堵的洞：从名单删一项 → orphaned 命中。注意这里 reach 说是 tracked、
    // present 也全在，也就是「文件都还在」，纯粹靠两处清单对不上就能报警。
    expect(
      auditExemptionList({ exempt: new Set(["src/x.test.ts"]), reasons, present: bothPresent, reach: allTracked })
        .orphaned
    ).toEqual(["src/y.test.ts"]);

    // 反向：名单多一项没写理由 → unreconciled 命中
    expect(
      auditExemptionList({
        exempt: new Set([...exempt, "src/z.test.ts"]),
        reasons,
        present: bothPresent,
        reach: allTracked
      }).unreconciled
    ).toEqual(["src/z.test.ts"]);

    // 既没入库也没被忽略 → silent 命中（干净检出上必然不存在，豁免空洞成立）
    expect(auditExemptionList({ exempt, reasons, present: bothPresent, reach: () => "unreachable" }).silent).toEqual([
      "src/x.test.ts",
      "src/y.test.ts"
    ]);

    // 入库了却被删 → stale 命中
    expect(
      auditExemptionList({ exempt, reasons, present: new Set(["src/x.test.ts"]), reach: allTracked }).stale
    ).toEqual(["src/y.test.ts"]);

    // git 不可得（reach 一律 unknown）时 silent / stale 必须为空：宁可少查，不假装查过
    const blind = auditExemptionList({ exempt, reasons, present: new Set(), reach: () => "unknown" });
    expect(blind.silent).toEqual([]);
    expect(blind.stale).toEqual([]);
  });

  test("hasExpectation 判定本身可证伪（对零断言代码判假、对有断言代码判真）", () => {
    expect(hasExpectation('test("x", () => { console.log(1); });')).toBe(false);
    expect(hasExpectation('test("x", () => { expect(1).toBe(1); });')).toBe(true);
    // 注释里的 expect 不算数（否则写个注释就能绕过规则）
    expect(hasExpectation('// 期望这里有 expect(...)\ntest("x", () => {});')).toBe(false);
    expect(hasExpectation('import assert from "node:assert";')).toBe(true);
  });
});
