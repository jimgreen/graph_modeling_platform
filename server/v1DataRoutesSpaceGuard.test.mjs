// v1 数据域（schemes / library）路由的 paths 接线守卫。
// 会话域（runtime/control）已有「缺 spaceId 即抛」，数据域此前没有：routes 直接把 paths 解构给
// handler，缺失时各层 `options.paths ?? defaultPaths` 回落 —— 静默读写**默认空间**的数据。
// 派发层对这两个域恒注入 paths，故缺失只可能是接线 bug；这里逐条钉住整张路由表。
import { expect, test } from "vitest";
import { v1SchemeRoutes } from "./apiV1Schemes.mjs";
import { v1LibraryRoutes } from "./apiV1Library.mjs";
import { withSpacePaths } from "./spaceStore.mjs";

const tables = [
  ["方案域", v1SchemeRoutes],
  ["图元库域", v1LibraryRoutes]
];

test.each(tables)("%s 整张路由表缺 paths 都抛接线错误，不落默认空间", (_name, routes) => {
  expect(routes.length).toBeGreaterThan(0);
  for (const route of routes) {
    // 红化变异：把 handle 换回裸 handler（去 withSpacePaths 包装）→ 不再抛，本断言失败。
    // handler 未被触达（守卫在调用前抛），故不会真的读盘。
    expect(() => route.handle({ request: {}, response: {}, url: new URL("http://127.0.0.1/") }))
      .toThrow(/缺少 paths/u);
  }
});

test("withSpacePaths 只拦缺失，给了 paths 就原样透传整个 route", () => {
  const seen = [];
  const wrapped = withSpacePaths((route) => {
    seen.push(route);
    return "handled";
  });
  const route = { paths: { images: "images" }, url: new URL("http://127.0.0.1/"), match: null };
  expect(wrapped(route)).toBe("handled");
  expect(seen).toEqual([route]);
  // 空对象 route（派发层未注入时就是这个形状）也必须拦
  expect(() => wrapped({})).toThrow(/缺少 paths/u);
});
