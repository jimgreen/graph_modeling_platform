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

const serverDir = fileURLToPath(new URL(".", import.meta.url));

describe("CORS 响应头单源", () => {
  test("除 cors.mjs 外，任何 server 模块都不得硬编码 access-control-* 头", () => {
    const offenders = [];
    for (const name of readdirSync(serverDir)) {
      if (!name.endsWith(".mjs") || name === "cors.mjs") continue;
      const src = readFileSync(path.join(serverDir, name), "utf8");
      // 只查对象字面量里的键写法（"access-control-allow-origin":），不查注释
      src.split("\n").forEach((line, i) => {
        if (/^\s*["']access-control-/.test(line)) {
          offenders.push(`${name}:${i + 1}  ${line.trim()}`);
        }
      });
    }
    expect(
      offenders,
      `这些行硬编码了 access-control-* 头，请改为从 ./cors.mjs 导入\n${offenders.join("\n")}`
    ).toEqual([]);
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
