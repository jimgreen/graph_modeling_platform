import { describe, expect, test, beforeEach, afterEach } from "vitest";
import { createImageServer } from "./server.mjs";
import { apiPath } from "./config.mjs";

// HTTP 冒烟集成测试：起真实 server，打 /webgrp/v1/library/* 真实请求。
//
// 为什么需要它（API 单测 apiV1Library.test.mjs 已覆盖 18 条 handler 级行为，
// 这里只守「handler 单测测不到」的**接线层**，共 2 条）：
//   ① 路由真的被挂载且 pattern 与 path 对得上 —— handler 单测直接调函数，
//      v1LibraryRoutes 表里的 apiPattern 写错（如漏了 apiPath 前缀）单测照样全绿；
//   ② 信封格式经真实序列化后形态正确 —— mock 断言的是对象，真实响应走 JSON.stringify。
// 端点级语义（分类树内容、E 段推导、空库兜底…）一律不在这里重复，见 apiV1Library.test.mjs。

let server;
let baseUrl;

beforeEach(async () => {
  server = await createImageServer({ port: 0, host: "127.0.0.1" });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

afterEach(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
});

async function fetchV1(pathname) {
  const res = await fetch(`${baseUrl}${pathname}`);
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    // 非 JSON：接线错误时的 HTML 错误页会走到这里
  }
  return { status: res.status, text, json };
}

describe("v1 library HTTP 接线冒烟", () => {
  test("聚合端点真实可达且信封是 {ok:true,data}", async () => {
    const { status, json } = await fetchV1(apiPath("/v1/library"));

    // 两个判据都要咬人：pattern 写错 → 404 / HTML；信封改形 → ok 字段丢失
    expect(status).toBe(200);
    expect(json).not.toBeNull();
    expect(json.ok).toBe(true);
    expect(typeof json.data).toBe("object");
  });

  test("未知 v1/library/* 路径不落入聚合兜底", async () => {
    const { status } = await fetchV1(apiPath("/v1/library") + "/no-such-endpoint");

    expect(status).toBe(404);
  });
});
