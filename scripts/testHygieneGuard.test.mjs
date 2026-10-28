// 测试卫生守卫：`.only` / `.skip` 与「零用例的测试文件」。
//
// 为什么要盯：
//   · `test.only` / `describe.only` 会让同文件里其余用例**静默不跑**，全量测试照样「全绿」；
//   · `test.skip` 把一条回归守卫变成装饰品 —— 它还在文件里，但再也不转红；
//   · 一个没有 `test(` 的测试文件更隐蔽：`.mjs` 里写错语法时 vitest 报的是
//     `Tests: no tests`，看起来像「没跑到用例」，很容易被当成通过（根 AGENTS.md「分域规则 · server」 专门警告过）。
// 这三条都是「不做假完成」这条铁律的自动化版本（见根 AGENTS.md 的「工作规则」）。
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
 * 零断言文件的豁免名单。**现为空** —— 历史上唯一的 6 条已于 2026-10 清理。
 *
 * 那 6 条是什么：`src/encoding/` 下 6 个 `*.temp.test.ts`（energy-debug、energy-full-debug、
 * fb18-probe、infer-debug、param-struct、text-debug），一次性排查留下的本地探针。三重理由让它们
 * 本来就不该由一条**受版本控制**的守卫去记着：
 *   1. 全部 untracked，且被 `.gitignore:46` 的 `*.temp.test.ts` 忽略 —— 干净检出 / CI 上根本不存在；
 *   2. 没有任何一处生产代码或测试引用它们（grep 全库零命中），删掉不影响编译与运行；
 *   3. 正文主体只有 console.log（其中 fb18-probe 后来补过断言，但整组 `skipIf(!HAS_SAMPLES)`，
 *      而样本在同样被 gitignore 的 `data/` 下 —— 依旧只在单机上可能执行）。它们守的 fb18 契约
 *      （成员表 device_id 必须过 finalizeEDevicePreviewRecords 定稿）另有受版本控制的守卫：
 *      `src/encoding/e-file-editor-reference.test.ts` 的「编辑器 records 与导出文件逐值同源（容器模型）」。
 *
 * ★ 因此「名单不得为空」不能再写成 `size > 0` —— 那只会在**下一次**有人加豁免时逼出一个假失败，
 * 而在名单为空的今天则完全失语（`toBeGreaterThan(0)` 对空集语义正确，但对「应该清空」的场合是错的）。
 * 改用下面那条**有原则**的判据：名单为空不是「无所谓」，而是「真的一个都不该有」——
 * 反过来全量扫一遍，断言零断言集合为空。见 describe 里的「豁免名单为空时必须真的没有零断言文件」。
 * 非空时（将来若确有正当豁免）仍要求理由表非空，逐项对齐与四个桶照旧跑。
 */
const ZERO_ASSERTION_EXEMPT = new Set();

/**
 * 每条豁免都必须写明理由。**刻意与上面的名单分开写、不互为推导**：只从名单删掉一项而不动这里，
 * 「双向对齐」那条断言立刻转红 —— 这正是原来缺的那道「删名单项也能被发现」。
 * 反过来多塞一项而忘了写理由，同样转红。当前随名单一并清空。
 */
const ZERO_ASSERTION_EXEMPT_REASON = new Map();

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
  // 空名单 = **没有豁免要查**，不是「查不到 git 事实」。返回恒定 unknown 的判据，
  // 好让下面两条审计照常**运行**（四个桶必为空，断言空洞成立），
  // 而不是被 skipIf 标成「跳过」—— 后者会被读成「环境问题没跑到」，反而更难解释。
  if (nulInput === "") return () => "unknown";
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

  test("★ 豁免名单为空时必须真的没有零断言测试文件（不是「空名单无所谓」）", () => {
    if (ZERO_ASSERTION_EXEMPT.size > 0) {
      // 非空：仍要求理由表非空（下面的「逐项对齐」负责两处清单一致）
      expect(ZERO_ASSERTION_EXEMPT_REASON.size).toBeGreaterThan(0);
      return;
    }
    // ★ 空：判据反过来 —— 不是「允许为空」，而是「一个零断言文件都不该存在」。
    // 这让清空名单不再是个能让守卫失语的盲区：名单一空，正文里任何新写的零断言文件立刻转红。
    expect(ZERO_ASSERTION_EXEMPT_REASON, "空名单时理由表也必须空").toEqual(new Map());
    const zeroAssertion = scanned.filter((file) => !hasExpectation(codeOf(file)));
    expect(
      zeroAssertion,
      `豁免名单已空，仓库里不该再有零断言测试文件：${zeroAssertion.join(", ")}`
    ).toEqual([]);
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
