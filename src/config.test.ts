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
async function loadConfig(env: { apiPrefix?: string | null; frontendBase?: string | null } = {}) {
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

// ── `??` 与 `||` 的分界：注入**空串**（falsy 但非 nullish）时，两条表达式给出不同结果。
//   `(t ? X : undefined) ?? DEFAULT`  →  "" ?? DEFAULT  →  ""
//   `(t ? X : undefined) || DEFAULT`  →  "" || DEFAULT  →  DEFAULT
// 空串正是 vite define 可能产出的形态（`define: { __API_PREFIX__: '' }`），
// 而把它悄悄换成 "/webgrp" 属于线上找不到后端 / 静态资源 404，且不报错。
// 既有用例只注入过 "/webgrp" / "/api" / undefined 三个值（都是「非空串或 nullish」），
// 所以这条分界此前没有任何断言在盯。
//
// 变异实测：`?? "/webgrp"` → `|| "/webgrp"`（L5）与 `?? "/"` → `|| "/"`（L11）此前都是
// GREEN，加上下面两条用例后转红：
//   · `AssertionError: expected '/webgrp' to be ''`（L5，config.test.ts:105）
//   · `AssertionError: expected '/' to be ''`（L11，config.test.ts:114）
describe("前缀回退用 ?? 而不是 ||：空串注入不被改写", () => {
  test("API 前缀注入空串时保持空串（改成 || 会被写回 /webgrp）", async () => {
    const { API_PREFIX, apiPath } = await loadConfig({ apiPrefix: "" });
    // 两个断言都在看的正是变异真正改的那个值（导出常量本身，不是拼接结果）。
    expect(API_PREFIX).toBe("");
    expect(apiPath("/images")).toBe("/images");
  });

  test("base 注入空串时 FRONTEND_BASE 本身是空串（不是 /）", async () => {
    // 既有那条「base 为空串时退化成只给子路径」只断言了 frontendPath("/x") === "/x"，
    // 而 `"" || "/"` 同样产出 "/x"、再剥掉尾斜杠也还是 "" —— 两侧逐字节相同，
    // 所以它对 `??`/`||` 这条分界**零鉴别力**。必须直接断常量本身。
    const { FRONTEND_BASE, frontendPath } = await loadConfig({ frontendBase: "" });
    expect(FRONTEND_BASE).toBe("");
    expect(frontendPath("/x")).toBe("/x");
  });

  test("API 前缀注入 0 时保持 0 语义（?? 只吃 nullish，不吃 falsy）", async () => {
    // 0 与兜底值 "/webgrp" 逐字符不同，故是有效判别输入（§6.18b）。
    // 真值是 0 本身，所以下游拼出来是 "0/images"；写成 || 就会变成 "/webgrp/images"。
    const { API_PREFIX, apiPath } = await loadConfig({ apiPrefix: 0 as unknown as string });
    expect(API_PREFIX).toBe(0);
    expect(apiPath("/images")).toBe("0/images");
  });
});

describe("前缀常量被注入为 null 时仍然回退到默认值", () => {
  test("null 是 nullish，?? 接住它，不产出字符串 \"null\"", async () => {
    const { API_PREFIX, FRONTEND_BASE, apiPath, frontendPath } = await loadConfig({
      apiPrefix: null,
      frontendBase: null
    });
    expect(API_PREFIX).toBe("/webgrp");
    expect(FRONTEND_BASE).toBe("/");
    expect(apiPath("/images")).toBe("/webgrp/images");
    expect(frontendPath("/x")).toBe("/x");
  });
});
