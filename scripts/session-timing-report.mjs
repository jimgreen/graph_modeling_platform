#!/usr/bin/env node
// 会话耗时报告：把 DSH 会话日志按 step 边界拆成「模型段 / 工具段 / 编排段」，出一条命令的结论。
//
// 为什么需要它：排查「这次任务为什么跑了 3 小时」时，手写探针要 10 个 step；
// 本脚本一次给出 turn 级时长、三段归因、并行率、最慢 step、bash 用途分布。
//
// 用法：
//   node scripts/session-timing-report.mjs                 # 取当前目录对应会话库里最新的一个
//   node scripts/session-timing-report.mjs <session-id>     # 指定会话
//   node scripts/session-timing-report.mjs --file <log>     # 直接给 .jsonl.zstd 或 .jsonl 路径
//   node scripts/session-timing-report.mjs --json           # 输出 JSON 而非表格

import { readFileSync, readdirSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { basename, join } from "node:path";
import { zstdDecompressSync } from "node:zlib";

const ZSTD_MAGIC = Buffer.from([0x28, 0xb5, 0x2f, 0xfd]);

/** DSH 会话日志是**多帧拼接**的 zstd；整文件一次解压只得到第一帧。必须逐帧解再拼。 */
export function decompressSessionLog(buffer) {
  if (!buffer.includes(ZSTD_MAGIC)) return buffer; // 已是明文 jsonl
  const offsets = [];
  for (let i = 0; i + 4 <= buffer.length; i += 1) {
    if (
      buffer[i] === 0x28 &&
      buffer[i + 1] === 0xb5 &&
      buffer[i + 2] === 0x2f &&
      buffer[i + 3] === 0xfd
    ) {
      offsets.push(i);
    }
  }
  const chunks = [];
  for (let k = 0; k < offsets.length; k += 1) {
    const start = offsets[k];
    const end = k + 1 < offsets.length ? offsets[k + 1] : buffer.length;
    try {
      chunks.push(zstdDecompressSync(buffer.subarray(start, end)));
    } catch {
      // magic 出现在压缩数据内部时会产生假帧起点，跳过即可。
    }
  }
  if (chunks.length === 0) throw new Error("没能从会话日志里解出任何 zstd 帧");
  return Buffer.concat(chunks);
}

export function parseSessionLog(text) {
  const events = [];
  for (const line of text.split("\n")) {
    if (!line) continue;
    try {
      events.push(JSON.parse(line));
    } catch {
      // 尾部截断的半行忽略。
    }
  }
  return events;
}

const keyOf = (turn, step) => `${turn}:${step}`;

/**
 * 按 step/start → 首个 tool/call → step/end 切成三段：
 *   model    = start → 首个 tool/call（模型推理 + 决定调什么）
 *   tool     = 首个 tool/call → end（工具真实执行）
 *   overhead = end → 下个 step/start（同一 turn 内的编排 / 上下文整理）
 * turn 之间的间隔单独记为 away（通常是用户离开），不算 agent 耗时。
 */
export function summarizeSession(events) {
  // 首行 session 头没有 time 字段，先单独取出来，再对带 time 的事件排序。
  const session = events.find((event) => event && event.type === "session") ?? null;
  const ordered = events
    .filter((event) => event && typeof event.time === "number")
    .sort((a, b) => a.time - b.time);
  const turns = new Map();
  const steps = [];
  const open = new Map();

  const turnBucket = (turn) => {
    if (!turns.has(turn)) {
      turns.set(turn, {
        turn,
        start: null,
        end: null,
        model: 0,
        tool: 0,
        overhead: 0,
        steps: 0,
        calls: 0,
        parallelSteps: 0,
      });
    }
    return turns.get(turn);
  };

  for (const event of ordered) {
    const data = event.data || {};
    if (event.type === "turn/start") {
      const bucket = turnBucket(data.turn);
      bucket.start = event.time;
    } else if (event.type === "turn/end") {
      const bucket = turnBucket(data.turn);
      bucket.end = event.time;
    } else if (event.type === "step/start") {
      open.set(keyOf(data.turn, data.step), {
        turn: data.turn,
        step: data.step,
        start: event.time,
        end: null,
        firstCallAt: null,
        names: [],
        firstArg: "",
      });
    } else if (event.type === "tool/call") {
      const current = open.get(keyOf(data.turn, data.step));
      if (!current) continue;
      if (current.firstCallAt === null) {
        current.firstCallAt = event.time;
        current.firstArg = String(data.arguments ?? "");
      }
      current.names.push(data.name);
    } else if (event.type === "step/end") {
      const current = open.get(keyOf(data.turn, data.step));
      if (!current) continue;
      current.end = event.time;
      open.delete(keyOf(data.turn, data.step));
      steps.push(current);
      const bucket = turnBucket(current.turn);
      bucket.steps += 1;
      bucket.calls += current.names.length;
      if (current.names.length > 1) bucket.parallelSteps += 1;
      bucket.model += (current.firstCallAt ?? current.end) - current.start;
      if (current.firstCallAt !== null) bucket.tool += current.end - current.firstCallAt;
    }
  }

  // 编排段：step/end → 下一个 step/start；跨 turn 的记到 away。
  let away = 0;
  for (let i = 0; i < steps.length; i += 1) {
    const current = steps[i];
    const next = steps[i + 1];
    if (!next) continue;
    const gap = next.start - current.end;
    if (gap < 0) continue;
    if (next.turn !== current.turn) {
      away += gap;
    } else {
      turnBucket(current.turn).overhead += gap;
    }
  }

  const perTool = new Map();
  for (const step of steps) {
    const label =
      step.names.length === 0
        ? "(no tool)"
        : step.names.length === 1
          ? step.names[0]
          : `${step.names[0]} ×${step.names.length}`;
    const duration = step.firstCallAt === null ? 0 : step.end - step.firstCallAt;
    const entry = perTool.get(label) ?? { label, count: 0, total: 0, max: 0 };
    entry.count += 1;
    entry.total += duration;
    entry.max = Math.max(entry.max, duration);
    perTool.set(label, entry);
  }

  const turnList = [...turns.values()].sort((a, b) => a.turn - b.turn);
  const totals = turnList.reduce(
    (acc, turn) => {
      acc.model += turn.model;
      acc.tool += turn.tool;
      acc.overhead += turn.overhead;
      acc.steps += turn.steps;
      acc.calls += turn.calls;
      acc.parallelSteps += turn.parallelSteps;
      return acc;
    },
    { model: 0, tool: 0, overhead: 0, steps: 0, calls: 0, parallelSteps: 0 },
  );
  totals.agent = totals.model + totals.tool + totals.overhead;
  totals.away = away;

  const slowest = steps
    .map((step) => ({
      turn: step.turn,
      step: step.step,
      duration: step.start === undefined ? 0 : step.end - step.start,
      tool: step.names[0] ?? "(no tool)",
      arg: step.firstArg.slice(0, 120),
    }))
    .sort((a, b) => b.duration - a.duration)
    .slice(0, 10);

  return {
    sessionId: session?.id ?? null,
    createdAt: session?.createdAt ? Number(session.createdAt) : (turnList[0]?.start ?? null),
    turns: turnList,
    totals,
    perTool: [...perTool.values()].sort((a, b) => b.total - a.total),
    slowest,
  };
}

const pad = (value) => String(value).padStart(2, "0");
const fmtTime = (ms) => {
  const date = new Date(ms);
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};
const minutes = (ms) => `${(ms / 60000).toFixed(1)}min`;

function formatReport(summary) {
  const { totals } = summary;
  const lines = [];
  lines.push(`会话 ${summary.sessionId ?? "(unknown)"}  起于 ${summary.createdAt ? fmtTime(summary.createdAt) : "?"}`);
  lines.push(
    `合计 ${minutes(totals.agent)}（${(totals.agent / 3600000).toFixed(2)}h） / ${totals.steps} steps ` +
      `/ 平均 ${(totals.agent / Math.max(1, totals.steps) / 1000).toFixed(1)}s per step` +
      ` + 用户离场 ${minutes(totals.away)}`,
  );
  lines.push(
    `模型 ${minutes(totals.model)} (${((100 * totals.model) / Math.max(1, totals.agent)).toFixed(0)}%)` +
      ` | 工具 ${minutes(totals.tool)} (${((100 * totals.tool) / Math.max(1, totals.agent)).toFixed(0)}%)` +
      ` | 编排 ${minutes(totals.overhead)} (${((100 * totals.overhead) / Math.max(1, totals.agent)).toFixed(0)}%)`,
  );
  lines.push(
    `并行率 ${totals.parallelSteps}/${totals.steps} = ` +
      `${((100 * totals.parallelSteps) / Math.max(1, totals.steps)).toFixed(1)}%（越低越浪费：串行 step 各自要付一次固定成本）`,
  );
  lines.push("");
  lines.push("turn  起始       时长       steps  calls  模型     工具     编排");
  for (const turn of summary.turns) {
    const duration = turn.end ? turn.end - turn.start : null;
    lines.push(
      `${String(turn.turn).padEnd(5)} ${turn.start ? fmtTime(turn.start) : "?"}  ` +
        `${(duration === null ? "(进行中)" : minutes(duration)).padEnd(10)} ` +
        `${String(turn.steps).padEnd(6)} ${String(turn.calls).padEnd(6)} ` +
        `${minutes(turn.model).padEnd(9)} ${minutes(turn.tool).padEnd(9)} ${minutes(turn.overhead)}`,
    );
  }
  lines.push("");
  lines.push("工具执行耗时（按累计）");
  for (const entry of summary.perTool.slice(0, 12)) {
    lines.push(
      `  ${entry.label.padEnd(34)} n=${String(entry.count).padEnd(4)} 累计=${minutes(entry.total).padEnd(9)} ` +
        `最长=${(entry.max / 1000).toFixed(1)}s`,
    );
  }
  lines.push("");
  lines.push("最慢的 10 个 step");
  for (const item of summary.slowest) {
    lines.push(
      `  ${(item.duration / 1000).toFixed(0)}s  turn${item.turn}/step${item.step}  ${item.tool}  ${item.arg}`,
    );
  }
  return lines.join("\n");
}

/** 当前工作目录对应的 DSH 会话库（`--D-work-xxx--` 这种 slug）。 */
export function defaultSessionsDir(cwd = process.cwd()) {
  const slug = `--${cwd.replace(/[:\\/]+/gu, "-").replace(/^-+|-+$/gu, "")}--`;
  return join(homedir(), ".dsh", "sessions", slug);
}

export function findLatestSessionLog(dir) {
  let entries = [];
  try {
    entries = readdirSync(dir);
  } catch {
    return null;
  }
  const candidates = [];
  for (const name of entries) {
    for (const file of ["session.v4.jsonl.zstd", "session.v4.jsonl"]) {
      const path = join(dir, name, file);
      try {
        candidates.push({ path, mtime: statSync(path).mtimeMs });
      } catch {
        // 不是会话目录。
      }
    }
  }
  candidates.sort((a, b) => b.mtime - a.mtime);
  return candidates[0]?.path ?? null;
}

function main(argv) {
  const args = argv.slice(2);
  const asJson = args.includes("--json");
  const positional = args.filter((item) => !item.startsWith("--"));
  let logPath = null;
  const fileIndex = args.indexOf("--file");
  if (fileIndex >= 0) {
    logPath = args[fileIndex + 1];
  } else if (positional.length > 0) {
    const dir = defaultSessionsDir();
    logPath = join(dir, positional[0], "session.v4.jsonl.zstd");
  } else {
    logPath = findLatestSessionLog(defaultSessionsDir());
  }
  if (!logPath) {
    console.error("找不到会话日志；用 --file <path> 指定一个。");
    process.exitCode = 1;
    return;
  }
  const summary = summarizeSession(parseSessionLog(decompressSessionLog(readFileSync(logPath)).toString("utf8")));
  if (asJson) {
    console.log(JSON.stringify({ logPath, ...summary }, null, 2));
    return;
  }
  console.log(`日志 ${basename(logPath)}`);
  console.log(formatReport(summary));
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1].replace(/\\/gu, "/")}`).href) {
  main(process.argv);
}
