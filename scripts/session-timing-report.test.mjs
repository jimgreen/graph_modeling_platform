import { describe, expect, it } from "vitest";
import { mkdirSync, mkdtempSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { zstdCompressSync } from "node:zlib";
import {
  decompressSessionLog,
  findLatestSessionLog,
  parseSessionLog,
  summarizeSession,
} from "./session-timing-report.mjs";

/** 造一条最小会话：turn1 两个 step（第二个含 2 次并行调用），turn2 一个 step，中间隔约 10 分钟。 */
function makeEvents() {
  return [
    { type: "session", version: 4, id: "session-test", createdAt: 1000, cwd: "/repo" },
    { type: "turn/start", time: 1000, data: { turn: 1 } },
    { type: "step/start", time: 2000, data: { turn: 1, step: 1 } },
    { type: "tool/call", time: 5000, data: { turn: 1, step: 1, name: "grep" } },
    { type: "tool/result", time: 7000, data: { turn: 1, step: 1 } },
    { type: "step/end", time: 8000, data: { turn: 1, step: 1 } },
    { type: "step/start", time: 11000, data: { turn: 1, step: 2 } },
    { type: "tool/call", time: 12000, data: { turn: 1, step: 2, name: "read" } },
    { type: "tool/call", time: 12000, data: { turn: 1, step: 2, name: "grep" } },
    { type: "step/end", time: 14000, data: { turn: 1, step: 2 } },
    { type: "turn/end", time: 15000, data: { turn: 1 } },
    { type: "turn/start", time: 601000, data: { turn: 2 } },
    { type: "step/start", time: 602000, data: { turn: 2, step: 1 } },
    { type: "tool/call", time: 604000, data: { turn: 2, step: 1, name: "ops_bash" } },
    { type: "step/end", time: 605000, data: { turn: 2, step: 1 } },
    { type: "turn/end", time: 606000, data: { turn: 2 } },
  ];
}

describe("session-timing-report", () => {
  it("保留没有 time 字段的 session 头", () => {
    const summary = summarizeSession(makeEvents());
    expect(summary.sessionId).toBe("session-test");
    expect(summary.createdAt).toBe(1000);
  });

  it("按 step 边界切出模型段 / 工具段 / 编排段", () => {
    const summary = summarizeSession(makeEvents());
    const [turn1] = summary.turns;
    // step1: 模型 2000→5000 = 3s，工具 5000→8000 = 3s
    // step2: 模型 11000→12000 = 1s，工具 12000→14000 = 2s
    expect(turn1.model).toBe(4000);
    expect(turn1.tool).toBe(5000);
    // 编排只算同一 turn 内 step 之间的空隙：8000→11000 = 3s
    expect(turn1.overhead).toBe(3000);
  });

  it("跨 turn 的间隔记为用户离场，不计入 agent 耗时", () => {
    const summary = summarizeSession(makeEvents());
    // turn1 末 step 结束 14000 → turn2 首 step 开始 602000
    expect(summary.totals.away).toBe(602000 - 14000);
    expect(summary.totals.agent).toBe(
      summary.totals.model + summary.totals.tool + summary.totals.overhead,
    );
    expect(summary.totals.agent).toBeLessThan(summary.totals.away);
  });

  it("统计并行率：只有 turn1/step2 一次发了两个工具", () => {
    const summary = summarizeSession(makeEvents());
    expect(summary.totals.steps).toBe(3);
    expect(summary.totals.parallelSteps).toBe(1);
    expect(summary.turns[0].calls).toBe(3);
  });

  it("perTool 按首个工具名归集工具执行耗时", () => {
    const summary = summarizeSession(makeEvents());
    expect(summary.perTool.find((entry) => entry.label === "grep").total).toBe(3000);
    expect(summary.perTool.find((entry) => entry.label === "ops_bash").total).toBe(1000);
  });

  it("最慢 step 按 step 总时长（不是工具时长）排序", () => {
    const summary = summarizeSession(makeEvents());
    // turn1/step1 = 6000ms、turn2/step1 = 3000ms、turn1/step2 = 3000ms
    expect(summary.slowest[0]).toMatchObject({ turn: 1, step: 1, duration: 6000 });
  });

  it("多帧拼接的 zstd 必须逐帧解，整文件一次解只得到第一帧", () => {
    const header = Buffer.from(`${JSON.stringify({ type: "session", id: "s1" })}\n`, "utf8");
    const body = Buffer.from(`${JSON.stringify({ type: "turn/start", time: 1 })}\n`, "utf8");
    const stitched = Buffer.concat([zstdCompressSync(header), zstdCompressSync(body)]);
    const events = parseSessionLog(decompressSessionLog(stitched).toString("utf8"));
    expect(events).toHaveLength(2);
    expect(events[1].type).toBe("turn/start");
  });

  it("明文 jsonl 原样返回，坏行被跳过", () => {
    const plain = Buffer.from('{"type":"session"}\n不是 JSON\n{"type":"turn/start"}\n', "utf8");
    const events = parseSessionLog(decompressSessionLog(plain).toString("utf8"));
    expect(events).toHaveLength(2);
  });

  it("findLatestSessionLog 取 mtime 最新的会话，目录不存在返回 null", () => {
    const root = mkdtempSync(join(tmpdir(), "session-timing-"));
    const older = join(root, "session-old");
    const newer = join(root, "session-new");
    for (const dir of [older, newer]) {
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, "session.v4.jsonl"), "");
    }
    utimesSync(join(older, "session.v4.jsonl"), new Date(1000), new Date(1000));
    utimesSync(join(newer, "session.v4.jsonl"), new Date(2000), new Date(2000));
    expect(findLatestSessionLog(root)).toBe(join(newer, "session.v4.jsonl"));
    expect(findLatestSessionLog(join(root, "not-exist"))).toBeNull();
  });
});
