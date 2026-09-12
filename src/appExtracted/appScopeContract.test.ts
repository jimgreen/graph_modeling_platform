import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import { createMeasurementFieldParameterDefinition } from "../measurementDefinitionTypes";

// createMeasurementFieldParameterDefinition 在全仓库没有任何 __appScope 装配点（grep 证实），
// 工厂里只能走静态 import。历史上 appDeviceDefinitionDialogs.tsx 从 scope 解构该名字（恒 undefined）
// 导致运行时 TypeError，而审计脚本原理上拦不住「名字有绑定、但来源对象没有该键」——
// 本测试补这张网：该名字的每次出现必须是 import 说明符或调用，不得是 scope 解构/裸引用。
const SYMBOL = "createMeasurementFieldParameterDefinition";
const SRC_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// import 说明符可能跨多行（如 src/model.ts:4），用整段 import 语句范围判定
const IMPORT_STATEMENT = /import\s*(?:type\s*)?\{[\s\S]*?\}\s*from\s*["'][^"']+["'];?/g;

function listSourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return listSourceFiles(full);
    if (!/\.tsx?$/.test(entry.name) || /\.test\./.test(entry.name)) return [];
    return [full];
  });
}

function suspiciousReferences(text: string): string[] {
  const importRanges: Array<[number, number]> = [];
  for (const match of text.matchAll(IMPORT_STATEMENT)) {
    importRanges.push([match.index, match.index + match[0].length]);
  }
  const found: string[] = [];
  let index = text.indexOf(SYMBOL);
  while (index !== -1) {
    const inImport = importRanges.some(([start, end]) => index >= start && index < end);
    const isCall = text.slice(index + SYMBOL.length).startsWith("(");
    if (!inImport && !isCall) {
      const lineStart = text.lastIndexOf("\n", index - 1) + 1;
      const lineEnd = text.indexOf("\n", index);
      const line = text.slice(lineStart, lineEnd === -1 ? text.length : lineEnd);
      found.push(`${text.slice(0, index).split("\n").length}: ${line.trim()}`);
    }
    index = text.indexOf(SYMBOL, index + SYMBOL.length);
  }
  return found;
}

describe("工厂 scope 契约", () => {
  test("createMeasurementFieldParameterDefinition 只能静态 import 或调用，不得从 scope 解构", () => {
    const offenders = listSourceFiles(SRC_ROOT).flatMap((file) => {
      const text = readFileSync(file, "utf-8");
      if (!text.includes(SYMBOL)) return [];
      return suspiciousReferences(text).map(
        (entry) => `${path.relative(SRC_ROOT, file).split(path.sep).join("/")}:${entry}`
      );
    });
    expect(offenders).toEqual([]);
  });

  test("模块确实导出该函数（import 失败或改成非函数即红）", () => {
    expect(typeof createMeasurementFieldParameterDefinition).toBe("function");
  });
});
