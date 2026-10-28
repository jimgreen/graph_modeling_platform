// src/runtimeToken.ts 的单测。
//
// 这一层负责「token ↔ 地址栏」，是 MCP 能指定目标页面的前提：
//   · token 必须能从 URL 读出来，且非法值当作「没有」（不能带着脏值去注册）；
//   · 写回时必须保留 path 与 hash —— hash 里装着空间/模型标识，丢了就等于换了工作空间；
//   · 已一致时不改写（避免每次挂载都往历史里塞一条无变化的记录）。
//
// 纯函数、不碰 window/document，故 node 环境直接喂 URL 字符串。
import { describe, expect, test } from "vitest";
import { createPageToken, isValidToken, readTokenFromUrl, TOKEN_QUERY_KEY, withTokenInUrl } from "./runtimeToken";

describe("readTokenFromUrl", () => {
  test("读得出 ?token=", () => {
    expect(readTokenFromUrl("http://127.0.0.1:5173/?token=page-abc123")).toBe("page-abc123");
  });

  test("和其它 query 参数共存", () => {
    expect(readTokenFromUrl("http://127.0.0.1:5173/?a=1&token=page-abc123&b=2")).toBe("page-abc123");
  });

  test("保留 hash 里的空间/模型标识时也能读到", () => {
    expect(readTokenFromUrl("http://127.0.0.1:5173/?token=page-abc123#space=default&model=13")).toBe("page-abc123");
  });

  test("没有 token → 空串", () => {
    expect(readTokenFromUrl("http://127.0.0.1:5173/")).toBe("");
    expect(readTokenFromUrl("http://127.0.0.1:5173/#space=default")).toBe("");
  });

  test("非法 token 当没有（不让脏值进注册链路）", () => {
    expect(readTokenFromUrl("http://127.0.0.1:5173/?token=")).toBe("");
    expect(readTokenFromUrl("http://127.0.0.1:5173/?token=a%20b")).toBe("");
    expect(readTokenFromUrl(`http://127.0.0.1:5173/?token=${"x".repeat(129)}`)).toBe("");
  });

  test("空串 / 非法 URL 不炸", () => {
    expect(readTokenFromUrl("")).toBe("");
    expect(readTokenFromUrl("not a url")).toBe("");
  });
});

describe("withTokenInUrl", () => {
  test("写入 token 且保留其它 query 与 hash", () => {
    const next = withTokenInUrl("http://127.0.0.1:5173/?a=1#space=default&model=13", "page-abc");
    expect(next).toContain("token=page-abc");
    expect(next).toContain("a=1");
    expect(next).toContain("#space=default&model=13");
  });

  test("已一致 → 原样返回（调用方据此跳过 replaceState）", () => {
    const href = "http://127.0.0.1:5173/?token=page-abc";
    expect(withTokenInUrl(href, "page-abc")).toBe(href);
  });

  test("已有别的 token 时覆盖", () => {
    const next = withTokenInUrl("http://127.0.0.1:5173/?token=page-old", "page-new");
    expect(next).toContain("token=page-new");
    expect(next).not.toContain("page-old");
  });

  test("非法 token 不写（宁可没 token，也不写脏值）", () => {
    const href = "http://127.0.0.1:5173/";
    expect(withTokenInUrl(href, "has space")).toBe(href);
    expect(withTokenInUrl(href, "")).toBe(href);
  });

  test("query 键名与 MCP 文档一致", () => {
    expect(TOKEN_QUERY_KEY).toBe("token");
  });
});

describe("isValidToken", () => {
  test("接受 unreserved 字符集", () => {
    for (const value of ["page-abc", "a.b_c~d-e9", "x"]) {
      expect(isValidToken(value), value).toBe(true);
    }
  });

  test("拒绝空格 / 引号 / 分隔符 / 超长 / 非字符串", () => {
    for (const value of ["a b", "a&b", "a#b", "a?b", "x".repeat(129), "", null, undefined, 1]) {
      expect(isValidToken(value), String(value)).toBe(false);
    }
  });
});

describe("createPageToken", () => {
  test("形如 page-<12 位十六进制>", () => {
    const token = createPageToken(() => "123e4567-e89b-42d3-a456-426614174000");
    expect(token).toBe("page-123e4567e89b");
    expect(isValidToken(token)).toBe(true);
  });

  test("两次生成不同（避免同浏览器多标签页撞 id）", () => {
    const a = createPageToken(() => "aaaaaaaa-1111-4111-8111-111111111111");
    const b = createPageToken(() => "bbbbbbbb-2222-4222-8222-222222222222");
    expect(a).not.toBe(b);
  });

  test("crypto 兜底给出非十六进制字符时会被过滤，结果仍合法", () => {
    const token = createPageToken(() => "zzzz----!!!!");
    expect(isValidToken(token)).toBe(true);
    expect(token.startsWith("page-")).toBe(true);
  });
});
