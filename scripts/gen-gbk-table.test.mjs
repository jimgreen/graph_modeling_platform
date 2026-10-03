import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const sourceScript = fileURLToPath(new URL("./gen-gbk-table.mjs", import.meta.url));
const realOutput = path.join(repoRoot, "src", "encoding", "gbkTable.ts");
const realOutputBefore = readFileSync(realOutput);

let caseDir;
let scriptPath;
let outputPath;

beforeEach(() => {
  caseDir = mkdtempSync(path.join(tmpdir(), "gen-gbk-table-"));
  mkdirSync(path.join(caseDir, "scripts"), { recursive: true });
  mkdirSync(path.join(caseDir, "src", "encoding"), { recursive: true });
  scriptPath = path.join(caseDir, "scripts", "gen-gbk-table.mjs");
  outputPath = path.join(caseDir, "src", "encoding", "gbkTable.ts");
  copyFileSync(sourceScript, scriptPath);
});

afterEach(() => {
  try {
    expect(readFileSync(realOutput)).toEqual(realOutputBefore);
  } finally {
    rmSync(caseDir, { recursive: true, force: true });
  }
});

function runGenerator() {
  const result = spawnSync(process.execPath, [scriptPath], {
    cwd: repoRoot,
    env: { ...process.env, NODE_PATH: path.join(repoRoot, "node_modules") },
    encoding: "utf-8",
    maxBuffer: 1024 * 1024,
  });
  return {
    status: result.status,
    stdout: result.stdout || "",
    stderr: result.stderr || "",
  };
}

function parseOutput() {
  const source = readFileSync(outputPath, "utf-8");
  const unicodeMatch = source.match(/^export const GBK_UNICODE_B64 = "([A-Za-z0-9+/]+=*)";$/mu);
  const codeMatch = source.match(/^export const GBK_CODE_B64 = "([A-Za-z0-9+/]+=*)";$/mu);
  expect(unicodeMatch, "缺少 GBK_UNICODE_B64 导出").not.toBeNull();
  expect(codeMatch, "缺少 GBK_CODE_B64 导出").not.toBeNull();
  return {
    source,
    unicode: decodeTable(unicodeMatch[1]),
    codes: decodeTable(codeMatch[1]),
  };
}

function decodeTable(value) {
  const bytes = Buffer.from(value, "base64");
  expect(bytes.byteLength % 2).toBe(0);
  return new Uint16Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 2);
}

describe("gen-gbk-table CLI —— 输出契约", () => {
  test("生成两个可解码的 Uint16Array base64 常量，并保持 TS 源码结构", () => {
    const result = runGenerator();

    expect(result.status, result.stderr).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.stdout).toContain("生成完成:");
    expect(existsSync(outputPath)).toBe(true);

    const { source, unicode, codes } = parseOutput();
    expect(source).toMatch(/^\/\/ 自动生成：GBK 编码表/mu);
    expect(source.endsWith("\n")).toBe(true);
    expect(unicode.length).toBeGreaterThan(20_000);
    expect(codes.length).toBe(unicode.length);
  });

  test("抽样映射正确，且不收录 GBK 单字节字符", () => {
    runGenerator();
    const { unicode, codes } = parseOutput();
    const index = Array.from(unicode).indexOf(0x4e2d);

    expect(index).toBeGreaterThanOrEqual(0);
    expect(codes[index]).toBe(0xd6d0);
    expect(Array.from(unicode)).not.toContain(0x0041);
    expect(Array.from(unicode)).not.toContain(0x20ac);
    expect(Array.from(codes).every((code) => code >= 0x100)).toBe(true);
  });

  test("只包含 0x80-0xFFFF 范围内的 BMP 码点", () => {
    runGenerator();
    const { unicode } = parseOutput();

    expect(Array.from(unicode).every((codePoint) => codePoint >= 0x80 && codePoint <= 0xffff)).toBe(true);
  });

  test("连续运行两次产物字节完全一致", () => {
    const first = runGenerator();
    expect(first.status, first.stderr).toBe(0);
    const firstOutput = readFileSync(outputPath);

    const second = runGenerator();
    expect(second.status, second.stderr).toBe(0);
    expect(readFileSync(outputPath)).toEqual(firstOutput);
  });
});
