// 路径前缀单源。此前只有别的模块顺带断言过 API_PREFIX 的值，
// `frontendPath` 的拼接规则一条都没被测过。
//
// 两处前缀的语义完全不同，写混了就是线上找不到资源：
//   · API_PREFIX 只给 /api（后端）请求用；
//   · FRONTEND_BASE 给**非 API** 请求（静态资源、路由）用，且部署在子路径下
//     才会 ≠ "/"。
// 所以「给 API 请求加 base」或「给静态资源漏加 base」都属真 bug，而它们都不报错。
import { afterEach, describe, expect, test, vi } from "vitest";

/** 两个前缀都由 vite define 注入的全局常量决定，测试里只能在 import 前打桩。 */
async function loadConfig(env: { apiPrefix?: string; frontendBase?: string } = {}) {
  vi.resetModules();
  if (env.apiPrefix !== undefined) vi.stubGlobal("__API_PREFIX__", env.apiPrefix);
  if (env.frontendBase !== undefined) vi.stubGlobal("__FRONTEND_BASE__", env.frontendBase);
  return import("./config");
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("默认值（构建未注入时）", () => {
  test("API 前缀回退 /webgrp，base 回退 /", async () => {
    const { API_PREFIX, FRONTEND_BASE } = await loadConfig();
    expect(API_PREFIX).toBe("/webgrp");
    expect(FRONTEND_BASE).toBe("/");
  });

  test("注入了 undefined 也走回退，不产出 undefined 字符串", async () => {
    // vite define 在某些配置下会把常量替换成 undefined；`??` 那一步要接住
    const { API_PREFIX, FRONTEND_BASE } = await loadConfig({ apiPrefix: undefined, frontendBase: undefined });
    expect(API_PREFIX).toBe("/webgrp");
    expect(FRONTEND_BASE).toBe("/");
  });
});

describe("apiPath", () => {
  test("拼 API 前缀", async () => {
    const { apiPath } = await loadConfig({ apiPrefix: "/webgrp" });
    expect(apiPath("/images")).toBe("/webgrp/images");
  });

  test("注入自定义前缀时跟随", async () => {
    const { apiPath, API_PREFIX } = await loadConfig({ apiPrefix: "/api" });
    expect(API_PREFIX).toBe("/api");
    expect(apiPath("/images")).toBe("/api/images");
  });
});

describe("frontendPath", () => {
  test("base 为 / 时原样返回（最常见的本地开发形态）", async () => {
    const { frontendPath } = await loadConfig({ frontendBase: "/" });
    expect(frontendPath("/icon-library/x")).toBe("/icon-library/x");
  });

  test("base 带尾斜杠时只留一个斜杠", async () => {
    const { frontendPath } = await loadConfig({ frontendBase: "/app/" });
    expect(frontendPath("/icon-library/x")).toBe("/app/icon-library/x");
  });

  test("base 不带尾斜杠时直接相接", async () => {
    const { frontendPath } = await loadConfig({ frontendBase: "/app" });
    expect(frontendPath("/icon-library/x")).toBe("/app/icon-library/x");
  });

  test("base 多个尾斜杠只被去掉一处不剩", async () => {
    const { frontendPath } = await loadConfig({ frontendBase: "/app///" });
    expect(frontendPath("/x")).toBe("/app/x");
  });

  test("base 为空串时退化成只给子路径", async () => {
    const { frontendPath } = await loadConfig({ frontendBase: "" });
    expect(frontendPath("/x")).toBe("/x");
  });

  test("嵌套 base 也只去掉尾部斜杠，前缀内部的斜杠保留", async () => {
    const { frontendPath } = await loadConfig({ frontendBase: "/a/b/" });
    expect(frontendPath("/x")).toBe("/a/b/x");
  });

  test("子路径不带前导斜杠就直接相接（不做补斜杠）", async () => {
    // 记下来是为了让日后想「顺手补个 /」的人知道这是既有行为：
    // 现有调用点全部自己带前导斜杠，所以两种写法都能跑，但混用会粘在一起。
    // base="/" 去掉尾斜杠后是空串，于是 "x" 变成 "x"（连前导斜杠都没有）。
    const { frontendPath } = await loadConfig({ frontendBase: "/app/" });
    expect(frontendPath("x")).toBe("/appx");
    const rooted = await loadConfig({ frontendBase: "/" });
    expect(rooted.frontendPath("x")).toBe("x");
  });
});
