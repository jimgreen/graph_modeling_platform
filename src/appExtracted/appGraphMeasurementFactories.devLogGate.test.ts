import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

// 量测拖动计时日志的 DEV 闸门守卫。
//
// 为什么是「源码结构守卫」而不是行为测试：vitest 下 `import.meta.env.DEV === true`，
// 两条日志都会照常输出，观察 console.log 无法区分闸门在不在（恒绿的假测试）。
// 契约本身就是「这些 console.log 被 DEV 闸门包住」，所以直接扫源码文本。
const SRC_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// 必须带上收尾的 `]`：否则 "[量测拖动计时以外的日志]" 这类前缀相同的字符串会被误判
const TIMING_LOG = /console\.log\(\s*["'`]\[量测拖动计时\]/;
const POSITIVE_DEV_GUARD = /if\s*\(\s*import\.meta\.env\.DEV\s*\)/;
const NEGATIVE_DEV_GUARD = /if\s*\(\s*!\s*import\.meta\.env\.DEV\s*\)/;

/**
 * 找出没有被 DEV 闸门包住的计时日志，返回 1 起的行号。
 *
 * 按行谓词过滤：只处理命中 TIMING_LOG 的行，而不是「跳过整个文件」——
 * 同文件内任意位置的注入都要能被发现（曾经踩过：文件谓词过滤恰好把注入点排除掉了）。
 */
export function ungatedTimingLogLines(source: string | string[]): number[] {
  const lines = Array.isArray(source) ? source : source.split(/\r?\n/);
  const offenders: number[] = [];
  // guards[d] === true 表示「嵌套深度 d 上打开的那个块是正向 DEV 闸门块」
  const guards: boolean[] = [];
  // `if (import.meta.env.DEV)` 后花括号换行时，闸门要顺延到下一行
  let pendingGuard = false;
  let depth = 0;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const positive = POSITIVE_DEV_GUARD.test(line);
    // `if (!import.meta.env.DEV) return;` 属于「负向早退」，不算包住日志的闸门
    const negative = NEGATIVE_DEV_GUARD.test(line);
    const isTimingLog = TIMING_LOG.test(line);
    // 同一条指令里的单行 `if (DEV) log(...)` 算已加闸门；块级闸门由 guards 栈判定
    const sameLineGuard = positive && !negative;
    if (isTimingLog && !sameLineGuard && !guards.slice(0, depth).some(Boolean)) {
      offenders.push(i + 1);
    }
    let pending: boolean = pendingGuard || (positive && !negative);
    pendingGuard = false;

    // 逐字符扫描，跳过字符串/模板串里的花括号
    let quote: string | null = null;
    for (let c = 0; c < line.length; c += 1) {
      const ch = line[c];
      if (quote) {
        if (ch === "\\") c += 1;
        else if (ch === quote) quote = null;
        continue;
      }
      if (ch === '"' || ch === "'" || ch === "`") {
        quote = ch;
        continue;
      }
      if (ch === "{") {
        depth += 1;
        guards.push(pending);
        // 只有闸门之后遇到的第一个花括号算闸门块（后续花括号属于对象字面量）
        pending = false;
      } else if (ch === "}") {
        guards.pop();
        depth = Math.max(0, depth - 1);
      }
    }
    pendingGuard = pending;
  }
  return offenders;
}

function listSourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return listSourceFiles(full);
    // 排除 *.test.*：守卫自己的文件会合法地包含这些形态（自测用的合成输入）
    if (!/\.tsx?$/.test(entry.name) || /\.test\./.test(entry.name)) return [];
    return [full];
  });
}

describe("量测拖动计时日志的 DEV 闸门", () => {
  test("src 下所有量测拖动计时日志都被 import.meta.env.DEV 闸门包住", () => {
    const offenders: string[] = [];
    for (const file of listSourceFiles(SRC_ROOT)) {
      const lines = ungatedTimingLogLines(readFileSync(file, "utf-8"));
      for (const line of lines) offenders.push(`${path.relative(SRC_ROOT, file)}:${line}`);
    }
    expect(offenders).toEqual([]);
  });

  test("拖动热路径上的两条计时日志确实存在于本文件", () => {
    const source = readFileSync(path.join(SRC_ROOT, "appExtracted", "appGraphMeasurementFactories.tsx"), "utf-8");
    expect(ungatedTimingLogLines(source)).toEqual([]);
    // 防止守卫因为「日志被整体删掉」而空跑：要求两条都还在
    const hits = source.split(/\r?\n/).filter((line) => TIMING_LOG.test(line));
    expect(hits.length).toBeGreaterThanOrEqual(2);
  });

  test("守卫的检测逻辑自测：违规形态能识别，合法形态不误报", () => {
    // ① 裸日志 —— 这正是本任务修掉前的形态
    expect(ungatedTimingLogLines(['console.log("[量测拖动计时] begin", 1);'])).toEqual([1]);
    // ② 深层缩进但仍无闸门（证明只看缩进不管用）
    expect(ungatedTimingLogLines(["      ", '        console.log("[量测拖动计时] undo");'])).toEqual([2]);
    // ③ 只在别处有闸门、这行不在闸门块内 —— 必须仍然算违规
    expect(
      ungatedTimingLogLines([
        "if (import.meta.env.DEV) {",
        '  console.log("[量测拖动计时] a");',
        "}",
        'console.log("[量测拖动计时] b");',
      ])
    ).toEqual([4]);
    // ④ 合法的 if 块
    expect(
      ungatedTimingLogLines([
        "if (import.meta.env.DEV) {",
        '  console.log("[量测拖动计时] a");',
        "}",
      ])
    ).toEqual([]);
    // ⑤ 合法的单行正向 if
    // 负向早退必须分两行写（`if (!DEV) return;` 与日志同行不算闸门，这里不作合法形态断言）
    expect(ungatedTimingLogLines(['if (import.meta.env.DEV) console.log("[量测拖动计时] d");'])).toEqual([]);
    // ⑥ 闸门花括号换行 —— 闸门必须顺延
    expect(
      ungatedTimingLogLines(["if (import.meta.env.DEV)", "{", '  console.log("[量测拖动计时] e");', "}"])
    ).toEqual([]);
    // ⑦ 字符串里的花括号不得影响深度计数
    expect(
      ungatedTimingLogLines(['if (import.meta.env.DEV) {', '  console.log("[量测拖动计时] f", { x: 1 });', "}", 'console.log("[量测拖动计时] g");'])
    ).toEqual([4]);
    // ⑧ 负向早退包住后续代码不算闸门 —— 该行仍算违规
    expect(
      ungatedTimingLogLines([
        "if (!import.meta.env.DEV) {",
        "  return;",
        "}",
        'console.log("[量测拖动计时] h");',
      ])
    ).toEqual([4]);
    // ⑨ 非计时日志完全不在检测范围内（守卫不是全仓库 console.log 禁令）
    expect(ungatedTimingLogLines(['console.log("[量测拖动计时以外的日志] x");'])).toEqual([]);
  });
});