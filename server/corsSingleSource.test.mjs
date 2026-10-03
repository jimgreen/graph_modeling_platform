// CORS 单源守卫。
//
// server/CLAUDE.md 写着「跨源头**唯一一份**（`access-control-*`）：`server.mjs` 与
// `v1Response.mjs` 均从此导入 —— **勿在别处再定义一份**（T13 单源化）」。
//
// 实际曾有 10 处硬编码散在 6 个文件（apiV1Runtime 4、apiV1Schemes 2、server.mjs 2、
// cimExport 1、eFileExport 1），其中 server.mjs 本身就 import 了 cors.mjs 却仍在
// 自己的响应头里写死 allow-origin —— 正是「同一概念两处硬编码」的典型分叉。
// 现已全部改为从 cors.mjs 取（accessControlHeaders / accessControlOriginOnly）。
//
// 本守卫确保它不再分叉回去。
import { describe, expect, test } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { accessControlHeaders, accessControlOriginOnly } from "./cors.mjs";

const repoRoot = fileURLToPath(new URL("../", import.meta.url));
const sourceRoots = ["server", "src"];
const sourceExtensions = new Set([".mjs", ".ts", ".tsx"]);

function isExcludedDirectory(name) {
  return (
    name === "node_modules" ||
    name === "dist" ||
    name === "public" ||
    name.startsWith("coverage") ||
    name.startsWith(".coverage")
  );
}

function sourceFilesUnder(directory) {
  const files = [];
  const pending = [directory];
  while (pending.length > 0) {
    const current = pending.pop();
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const filePath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (!isExcludedDirectory(entry.name)) pending.push(filePath);
        continue;
      }
      if (
        sourceExtensions.has(path.extname(entry.name)) &&
        !/\.(?:test|spec)\.[^.]+$/i.test(entry.name)
      ) {
        files.push(filePath);
      }
    }
  }
  return files;
}

describe("CORS 响应头单源", () => {
  test("除 cors.mjs 外，任何 server/src 生产模块都不得硬编码 access-control-* 头", () => {
    const offenders = [];
    for (const root of sourceRoots) {
      for (const filePath of sourceFilesUnder(path.join(repoRoot, root))) {
        if (path.resolve(filePath) === path.resolve(repoRoot, "server", "cors.mjs")) continue;
        const src = readFileSync(filePath, "utf8");
        // 只查对象字面量里的键写法（"access-control-allow-origin":），不查注释。
        src.split("\n").forEach((line, i) => {
          if (/^\s*["']access-control-/.test(line)) {
            const relativePath = path.relative(repoRoot, filePath).split(path.sep).join("/");
            offenders.push(`${relativePath}:${i + 1}  ${line.trim()}`);
          }
        });
      }
    }
    expect(
      offenders,
      `这些行硬编码了 access-control-* 头，请改为从 ./cors.mjs 导入\n${offenders.join("\n")}`
    ).toEqual([]);
  });

  test("accessControlHeaders 的三个键值完整，origin-only 只含 origin", () => {
    expect(accessControlHeaders).toEqual({
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET,POST,PUT,DELETE,OPTIONS",
      "access-control-allow-headers": "content-type,x-space"
    });
    expect(Object.keys(accessControlOriginOnly)).toEqual(["access-control-allow-origin"]);
  });

  test("accessControlOriginOnly 与全量头的 origin 取值一致（不会分叉成两个值）", () => {
    expect(accessControlOriginOnly["access-control-allow-origin"]).toBe(
      accessControlHeaders["access-control-allow-origin"]
    );
  });

  test("origin-only 变体确实只含 origin 一项（下载类端点不需要 methods/headers）", () => {
    expect(Object.keys(accessControlOriginOnly)).toEqual(["access-control-allow-origin"]);
  });
});
